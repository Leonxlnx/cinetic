#!/usr/bin/env python3
"""
score.py: renders a film's soundtrack from the picture's events (out/cues.json, exported from the
picture code by scripts/export-cues.ts), the film's earshot sound kit (audio/kit.json, rendered by
scripts/audio/kit.py) and audio/score.json, mixed and mastered by master.py.

A film sounds one of two ways, nothing else:
  music-led     one licensed, human-made, instrumental track, edited at bar lines (track.py), plus the
                earshot `launch` kit levelled over it ("music": {"track", "edit", "licence", "gain_db"})
  effects-only  no music: an earshot kit (calm, crisp or minimal) at its roles' level_db ("music": "none",
                the default)
cinetic makes no music: "music": "synth" exits 1 (choose a licensed track, references/music.md, or "none").

Music-led (renders exactly the plan of scripts/audio/plan.py, run in-process):
  bed        the edit's segments and joins (track.py build_bed), staged to -18 LUFS integrated, plus
             music.gain_db; no saturation and no glue on an already mastered track, and no EQ unless it is
             dull: a bed whose 8-16 kHz band sits more than 28 dB under its whole (a pad that masks every
             click) gets a parallel air shelf (half the deficit, at most +4.5 dB above 7 kHz) and +1.5 dB of
             presence (2-5 kHz), so the hits cut through; a track whose own 2-8 kHz band sits under -35 dB is
             muffled and fails the gate (pick another), and a mix under -22 dB there or -32 dB at 8-16 kHz warns
  fx lift    when the effects sit under 3 dB over the bed on the median (their hits lost in the music), the
             effects bus rises until the median reads 4.5 dB over it (at most +6 dB), said in the report
  effects    each placed event's take at the plan's gain (bed_db over the bed as played), dry; roles with a
             width keep their stereo, whooshes, risers and swells travel along the cue's pan, every other
             effect is mono within +-0.15 of the centre; a 30 Hz high-pass; tuned takes fade out by 1.5 s
  automation the stop-downs (before a hit, a drop or a swell, back on the hit), score.json silences and the
             end fade; nothing ducks under an effect
  stems      out/stems/bed.wav (as played) and sfx.wav, which sum to the pre-master mix
Effects-only: each cue plays the take of its role (kit.role_for), placed so the take's measured onset
(peak for whooshes) lands on the frame, levelled by the role's level_db, the cue's weight and KIT_GAIN,
trimmed toward the role's median loudness; a whoosh's lead-in starts no earlier than its move; tonal roles
play the take nearest the note the chord logic asks for; keys, clicks and crisp ticks dry, the rest
through the short rooms; master at -18 LUFS (glue on).

Both: the typing plan ("typing": auto, soft, mechanical, pitched, muted, word, off; one per film: per key
up to 25 chars/s, once per word above, never two keys within 60 ms, about 12 keys/s at most, word
accents, sigma 2.5 dB, no jump over 5 dB between neighbours), the progress climb ("progress", on a tuned
role's takes), score.json silences (everything mutes), the payoff and the stack guard (one element at the
payoff and the lockup; 2+ heavy sounds or 3+ kinds within +-3 f anywhere). Tuned effects never become a
melody: at most 2 pitched effects in any 4 s (the extra ones are thinned and listed), no tonal effect
rings past 1.5 s. Every effect is an earshot kit take: a cue whose role the kit does not name, or an
explicit note no take sounds, fails the gate; --draft plays placeholder voices for them instead and marks
the report "draft": true (never delivered: deliver.sh, credits.py and av-audit.py refuse it).

Usage (from the project root):
  python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json \
      --out public/audio/soundtrack.wav [--stems out/stems] [--json out/qa/score.json]
      [--plan out/qa/sfx_plan.json] [--lufs -14] [--ceiling 0.77] [--draft] [--bed-only] [--quiet]

--bed-only (a film with a track whose effects are not made yet): the edited track alone, exactly as the film
plays it (track.py build_bed: bar 1 at the edit's film_t0, the joins, the ending, the stop-downs score.json adds),
staged and mastered like the full mix; no kit is read and no effect plays (the report says "bed_only": true).
It needs no out/cues.json: without one, the film's length, tempo and reveal come from the edit (edit.json's ending and
hold) and its fps from src/music.ts.
Never cut the track by hand for the picture: a hand cut that drops film_t0 or carries an encoder's priming pad
puts every downbeat early or late against the cuts the timeline made on it (check-sync.py measures the music
against the edit and fails it).

Targets (master.lufs overrides): -14 LUFS with music (-16 for a film of 8 s or less), -18 effects-only;
true peak <= -1.5 dBTP; last 480 samples zero. The report holds loudness, true peak, LRA, PLR, the loudest
moment against the payoff, limiter hot spots, masked effects, tuned sounds, skipped events and, with a
track: music (record, segments, joins, ending), over_bed (each effect's loudest 50 ms over the bed it was
levelled against, per role: with the bed, the bed's own accent there, and the take alone, which the warnings
judge), stop_downs (measured on the bed), no_duck, density, one_gesture, the lockup element after a stop. Schema and recipes: references/sound.md; the track: references/music.md.

Exit codes: 0 rendered and the gate passed (a --draft render passes nothing: its report says "pass": false);
1 invalid input, a failed gate, "music": "synth", an effect with no kit take, or "engine": "earshot" with no
playable kit.
"""
import argparse
import json
import math
import os
import re
import sys
import types

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp as D  # noqa: E402
import kit as K  # noqa: E402
import master as M  # noqa: E402

SR = D.SR

MODES = {
    'major': [0, 2, 4, 5, 7, 9, 11], 'ionian': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10],
    'aeolian': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10], 'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11], 'phrygian': [0, 1, 3, 5, 7, 8, 10],
}
QUALITIES = {
    '': [0, 4, 7], 'maj': [0, 4, 7], 'M': [0, 4, 7], 'm': [0, 3, 7], 'min': [0, 3, 7], '-': [0, 3, 7],
    '5': [0, 7], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '69': [0, 4, 7, 9, 14], '6add9': [0, 4, 7, 9, 14],
    '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'M7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'mmaj7': [0, 3, 7, 11],
    '9': [0, 4, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14], 'M9': [0, 4, 7, 11, 14], 'm9': [0, 3, 7, 10, 14],
    'm11': [0, 3, 7, 10, 14, 17], 'maj7#11': [0, 4, 7, 11, 18], 'add9': [0, 4, 7, 14], 'add2': [0, 2, 4, 7],
    'madd9': [0, 3, 7, 14], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'sus': [0, 5, 7], '7sus4': [0, 5, 7, 10],
    '9sus4': [0, 5, 7, 10, 14], '6sus4': [0, 5, 7, 9], 'dim': [0, 3, 6], 'dim7': [0, 3, 6, 9],
    'm7b5': [0, 3, 6, 10], 'aug': [0, 4, 8], '+': [0, 4, 8],
}
# Placeholder levels (--draft voices only), pre-master; a kit take at level_db 0 sits about here.
BASE = dict(tick=0.25, tock=0.34, hit=0.5, land=0.26, land_light=0.15, pop=0.12, whoosh=0.24, riser=0.18,
            drop=0.7, key=0.2, click=0.9, crisp=0.4, snap=0.45, swell=0.16, bell=0.08, suck=0.5, text=0.1)
# Effects-only kit takes (peak -1 dBFS) play at KIT_GAIN x 10^(level_db/20) x weight.
KIT_GAIN = 0.83
ENGINES = ('auto', 'earshot', 'synth')
LUFS_MUSIC, LUFS_STING, LUFS_SFX_ONLY = -14.0, -16.0, -18.0  # master.lufs defaults: with music / a <= 8 s sting with music / none
STING_S = 8.0
STAGE_LUFS = -18.0   # the edited bed is gain-staged to this before the mix
SYNTH_MSG = ('cinetic makes no music: "music": "synth" is gone. Choose a licensed, human-made, instrumental track '
             '(references/music.md; record it with scripts/audio/track.py add) and write "music": {"track": '
             '"audio/music/<file>", "edit": "audio/music/edit.json", "licence": "audio/music/<name>.licence.json"}, '
             'or "music": "none" for an effects-only film')
TEXT_RUN_GAP = 3.0  # s: text sounds closer than this are one chain and step through the chord's tones
STACK_F = 3.0  # frames: two designed sounds this close read as one stacked gesture
HEAVY_ROLES = ('hit', 'drop', 'snap', 'land')
LEAD_IN = ('whoosh', 'riser', 'swell', 'suck')
TONAL_MAX_S = 1.5   # no tonal effect rings longer than this: a tuned take fades out by then
TONAL_FADE_S = 0.15
TUNED_PER_4S = 2    # at most this many pitched effects in any 4 s window (so never 3 within 2 s)
# Typing (score.json "typing"). "auto" picks per run: "word" above AUTO_WORD_RATE chars/s, else "soft".
TYPING = ('auto', 'soft', 'mechanical', 'pitched', 'muted', 'word', 'off')
PER_KEY = ('soft', 'mechanical', 'pitched')  # a sound per key, in the foreground
TYPING_GAIN = dict(soft=1.0, mechanical=1.0, pitched=0.5, muted=0.8, word=5.0)
AUTO_WORD_RATE = 25.0  # chars/s: typing above 25-30 chars/s is sounded per word, or not at all
KEY_KIND_GAIN = {'letter': 1.0, 'back': 0.9, 'space': 1.26, 'return': 1.33}  # heard level: space +2 dB, return +2.5 dB
KEY_RMS_REF = dict(soft=0.31, mechanical=0.344, muted=0.388, pitched=0.624)  # a letter's 6 ms RMS / peak, per style
KEY_CENTROID_MAX = 3000.0  # Hz: a kit key run brighter than key-click centroids (0.8-3 kHz) warns
KEY_FAST = 12.0  # keys/s: typing faster than this is thinned
KEY_MIN_GAP = 1 / KEY_FAST  # s: in a fast run a letter sounds only this long after the previous sounded key
KEY_FLAM_GAP = 0.06  # s: never two keys closer (a flam); word starts, spaces and returns need only this
WORD_MIN_GAP = 0.08  # s: word blips closer than this merge into one
KEY_LEVEL_SD = 2.5  # dB, random per press (heard: about 2.5 dB SD over a run, with the word dynamics)
KEY_MAX_STEP = 5.0  # dB between neighbouring sounded keys as planned (heard: under 6 dB with the timbre's spread)
LEVEL_CLAMP_DB = 12.0
QWERTY = ('qwertyuiop', 'asdfghjkl', 'zxcvbnm')
UI_KINDS = ('tick', 'tock')  # the clock: a small room, never the hall
WIDE_KINDS = ('whoosh', 'riser', 'swell', 'suck')  # only these take width; every other effect sits near the centre
SFX_PAN = 0.15  # |pan| of every other effect; the cue's pan (+-0.8 at the screen edges) is scaled into it
# the over-bed gate: an effect's loudest 50 ms over the bed it was levelled against (reported with the bed and
# alone; the take alone against over_bed(bed_db) is judged, within this many dB)
OVER_BED_TOL = 2.0
STOP_MIN_DIP_DB, STOP_RETURN_DB = 6.0, 3.0
LOCKUP_PEAK = (-9.0, -6.0)  # dBFS: the one element after an old edit's stop ending
HIT_RING_SEND = 0.55        # a hit ending's element: its hall send (2.8 s), so it rings 1.5 s or more under the end card
LOCKUP_UNDER_PAYOFF = 2.0   # LU
REVEAL_BAND = (0.75, 0.90)  # share of the runtime: the biggest reveal, the payoff (SKILL.md energy, formats.md §2)


class ScoreError(Exception):
    pass


def read_json(path, what):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise ScoreError(f'{what} not found: {path}') from None
    except json.JSONDecodeError as e:
        raise ScoreError(f'{what} {path} is not valid JSON ({e})') from None


def film_fps(root):
    """The film's fps from src/music.ts (track.py grid writes it) or src/timeline.ts (FPS), else 30."""
    for rel, pat in (('src/music.ts', r'\bfps:\s*(\d+(?:\.\d+)?)'), ('src/timeline.ts', r'\bFPS\s*=\s*(\d+(?:\.\d+)?)'),
                     ('music.js', r'\bfps:\s*(\d+(?:\.\d+)?)')):
        try:
            with open(os.path.join(root, rel), encoding='utf-8') as fh:
                m = re.search(pat, fh.read())
            if m:
                return float(m.group(1))
        except OSError:
            pass
    return 30.0


def bed_cues(score, score_path):
    """--bed-only with no out/cues.json: the film's length, tempo and reveal from the edit (audio/music/edit.json),
    so the edited bed renders before the timeline exports anything."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(score_path)))
    music = score.get('music') if isinstance(score.get('music'), dict) else {}
    if not music.get('edit'):
        raise ScoreError('--bed-only with no cues needs the edit (audio/score.json music.edit; track.py fit writes it)')
    edit = read_json(locate(music['edit'], os.path.dirname(os.path.abspath(score_path))), 'edit')
    fps = film_fps(root)
    end = edit.get('ending') or {}
    beat = float(edit.get('beat_s') or 60.0 / float(edit['bpm']))
    last = float(end.get('end_s') or edit.get('film_t0', 0) + int(edit.get('film_bars', 8)) * 4 * beat)
    tail = float(end.get('hold_s') or end.get('ring_s') or 2.0)
    total = int(math.ceil((last + tail) * fps))
    cue = {}
    if (edit.get('reveal') or {}).get('film_s') is not None:
        cue['reveal'] = int(round(float(edit['reveal']['film_s']) * fps))
    if end.get('hit_film_s') is not None or end.get('end_s') is not None:
        cue['lockup'] = cue['end'] = int(round(float(end.get('hit_film_s') or end['end_s']) * fps))
    return dict(fps=fps, bpm=float(edit['bpm']), total=total, acts={}, cue=cue, copy=[], events=[], from_edit=True)


# ------------------------------------------------------------------------------------------
# harmony (the key and an optional chord chart steer the tuned roles: text, bell, confirm)
# ------------------------------------------------------------------------------------------
class Chord:
    _re = re.compile(r'^([A-G][#b]?)(.*?)(?:/([A-G][#b]?))?$')

    def __init__(self, sym):
        m = self._re.match(sym.strip())
        if not m or m.group(2) not in QUALITIES:
            raise ScoreError(f'unknown chord "{sym}"; qualities: {", ".join(q or "(major)" for q in QUALITIES)}')
        self.name = sym
        self.root = D.pitch_class(m.group(1))
        self.iv = QUALITIES[m.group(2)]
        self.pcs = [(self.root + i) % 12 for i in self.iv]
        self.bass = D.pitch_class(m.group(3)) if m.group(3) else self.root

    def tones(self):
        """Voiced tones for pads: drop the fifth from 5+ note chords, double the root of triads."""
        iv = list(self.iv)
        if len(iv) >= 5 and 7 in iv:
            iv.remove(7)
        if len(iv) == 3:
            iv = iv + [12]
        if len(iv) == 2:
            iv = [0, 7, 12, 19]
        return [(self.root + i) % 12 for i in iv]

def stack(pcs, low, count):
    """`count` ascending notes from `low` cycling through pcs (arp tones)."""
    out, m = [], int(math.ceil(low))
    while len(out) < count:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out

# ------------------------------------------------------------------------------------------
# the song: timing, key, music, effects, master
# ------------------------------------------------------------------------------------------
class Song:
    def __init__(self, score, cues):
        self.cues = cues
        self.fps, self.total, self.bpm = float(cues['fps']), int(cues['total']), float(cues['bpm'])
        if 'bpm' in score and abs(float(score['bpm']) - self.bpm) > 1e-6:
            raise ScoreError(f'score.json bpm {score["bpm"]} differs from the timeline ({self.bpm}); fix one')
        self.grid = cues.get('music') or None  # the film-time music grid (src/music.ts) when the film has a track
        self.beat = 60.0 / self.bpm
        self.barlen = 4 * self.beat
        self.dur = self.total / self.fps
        self.nbars = int(math.ceil(self.dur / self.barlen - 1e-9))
        self.warnings = []
        key = str(score.get('key', 'C major')).split()
        self.tonic = D.pitch_class(key[0])
        self.mode = key[1].lower() if len(key) > 1 else 'major'
        if self.mode not in MODES:
            raise ScoreError(f'unknown mode "{self.mode}"; use one of {", ".join(MODES)}')
        self.scale = [(self.tonic + i) % 12 for i in MODES[self.mode]]
        minorish = MODES[self.mode][2] == 3
        self.penta = [(self.tonic + i) % 12 for i in ([0, 3, 5, 7, 10] if minorish else [0, 2, 4, 7, 9])]
        self.triad = [(self.tonic + i) % 12 for i in ([0, 3, 7] if minorish else [0, 4, 7])]
        # music: "none" (effects only) or a licensed track {track, edit, licence, gain_db}
        music, bed = score.get('music'), score.get('bed')
        self.music_cfg = None
        if music is None:
            music = 'none'
            if score.get('chords') and score.get('sections'):
                self.warnings.append('this score.json once played a generated band ("chords" + "sections" without "music"); '
                                     'it renders effects-only now: ' + SYNTH_MSG.split(': ', 1)[1])
        if music == 'synth':
            raise ScoreError(SYNTH_MSG)
        if isinstance(music, str) and music != 'none':
            if bed:
                raise ScoreError('give the music track once: "music": {"track": ...} (not "bed" as well)')
            self.warnings.append(f'"music": "{music}" is the older form: write "music": {{"track": "{music}", "edit": '
                                 '"audio/music/edit.json", "licence": "audio/music/<name>.licence.json"}; without an edit the '
                                 'whole file plays from frame 0')
            self.music_cfg = dict(track=music, edit=None, licence=None, gain_db=0.0, at=0.0)
        elif isinstance(music, dict):
            if not (music.get('track') or music.get('edit')):
                raise ScoreError('music needs "track" (the licensed file in audio/music/) and "edit" (audio/music/edit.json)')
            self.music_cfg = dict(track=music.get('track'), edit=music.get('edit'), licence=music.get('licence'),
                                  gain_db=float(music.get('gain_db', 0.0)), at=0.0)
        elif music != 'none':
            raise ScoreError('music is "none" or {"track": ..., "edit": ..., "licence": ...}')
        if bed and not self.music_cfg:
            b_ = {'file': bed} if isinstance(bed, str) else bed
            self.warnings.append('"bed" is the older form: write "music": {"track", "edit", "licence"}')
            self.music_cfg = dict(track=b_['file'], edit=None, licence=None, gain_db=float(b_.get('gain_db', 0)), at=b_.get('at', 0))
        self.music = 'track' if self.music_cfg else 'none'
        self.has_music = self.music_cfg is not None
        self.bed_lufs = STAGE_LUFS if self.has_music else None
        self._chords(score.get('chords', []))
        for old in ('sections', 'motifs'):
            if score.get(old):
                self.warnings.append(f'score.json "{old}" is ignored: cinetic makes no music (a licensed track or none)')
        sig = score.get('signature', {}) or {}
        if sig.get('motif') or sig.get('rhythm'):
            self.warnings.append('signature.motif is ignored: a motif of tuned notes is music; the bell plays one note')
        self.sig_tick = D.midi(sig['tick']) if 'tick' in sig else D.nearest([self.tonic], 86)  # octave 6: 0.8-1.6 kHz
        self.sig_tock = D.midi(sig['tock']) if 'tock' in sig else D.nearest([(self.tonic + 7) % 12], self.sig_tick - 5)
        self.motifs = []  # the progress resolve (two notes an octave apart: one gesture)
        # silences: (t0, t1, depth, scope 'all'): everything mutes, effects included
        self.silences = []
        sd = score.get('stopdowns') or {}
        if not isinstance(sd, dict):
            raise ScoreError('stopdowns is an object: {"auto": "kit", "add": [], "skip": [], "quiet_db": -7}')
        self.stopdowns = dict(auto=sd.get('auto', 'kit') not in (False, 'off', 'none'), add=list(sd.get('add') or []),
                              skip=list(sd.get('skip') or []), stop_len=float(sd.get('stop_len', 0.4)))
        self.quiet_db = float(sd['quiet_db']) if sd.get('quiet_db') is not None else None
        for d in score.get('drops', []):
            sil = d.get('silence', 0)
            self.warnings.append('score.json "drops" is the older form: a drop\'s silence is a stop-down now '
                                 '(stopdowns.add with "depth": "stop"); the suck is gone (nothing ducks)')
            if sil:
                self.stopdowns['add'].append(dict(at=d['at'], depth='stop', weight=float(d.get('weight', 1.5))))
        for s_ in score.get('silences', []):
            self.silences.append((self.T(s_['from']), self.T(s_['to']), float(s_.get('depth', 0.97)), 'all'))
        self.ending = score.get('ending') or {}
        self.payoff = self.T(score['payoff']) if 'payoff' in score else None
        pr = score.get('progress')
        self.progress = None
        if pr:  # a progress climb: matching events step up the key one note each; the resolve lands on the tonic
            if not pr.get('match'):
                raise ScoreError('progress needs "match": a piece of the event ids that climb (e.g. "day")')
            self.progress = dict(match=str(pr['match']), kind=pr.get('kind'), start=pr.get('start'),
                                 tonic=D.midi(pr['tonic']) if 'tonic' in pr else D.nearest([self.tonic], 76),
                                 resolve=self.T(pr['resolve']) if 'resolve' in pr else None,
                                 gain=float(pr.get('gain', 1.0)))
        self.typing = str(score.get('typing', 'auto')).lower()
        if self.typing not in TYPING:
            raise ScoreError(f'unknown typing "{self.typing}"; use one of {", ".join(TYPING)}')
        self.keyup = bool(score.get('keyup', False))
        mix = score.get('mix', {}) or {}
        for k_ in ('sidechain', 'duck_db'):
            if k_ in mix:
                self.warnings.append(f'mix.{k_} is ignored: the music never ducks under the effects (a stop-down before a '
                                     'hit, a drop or a swell is the one move: stopdowns)')
        if float(mix.get('typing_duck_db', 0) or 0) != 0:
            self.warnings.append('mix.typing_duck_db is ignored: music never ducks under effects: keys ride 6.5 dB over '
                                 'the bed (for foreground typing the edit puts a sparse bar under the run)')
        self.mix = dict(music=float(mix.get('music', 1.0)), sfx=float(mix.get('sfx', 1.0)), reverb=float(mix.get('reverb', 1.0)))
        # sfx: where the effects' voices come from (kit.py renders the kit)
        sfx = score.get('sfx') or {}
        if not isinstance(sfx, dict):
            raise ScoreError('sfx is an object: {"engine": "auto", "kit": "audio/kit.json", "python": null}')
        extra = sorted(set(sfx) - {'engine', 'kit', 'takes', 'python', 'restraint'})
        if extra:
            self.warnings.append(f'sfx: unknown key(s) {", ".join(extra)} ignored (engine, kit, takes, python, restraint)')
        self.restraint = sfx.get('restraint')  # plan.py: effects in any 10 s before whole actions go quiet ("off": none)
        self.engine = str(sfx.get('engine', 'auto')).lower()
        if self.engine not in ENGINES:
            raise ScoreError(f'sfx.engine "{self.engine}": use one of {", ".join(ENGINES)}')
        self.kit_path = str(sfx.get('kit') or 'audio/kit.json')
        self.kit_takes = sfx.get('takes')
        self.earshot_python = sfx.get('python')
        mas = score.get('master', {}) or {}
        sting = self.has_music and self.dur <= STING_S
        self.lufs_from = 'master.lufs' if 'lufs' in mas else (
            ('default for a sting with music' if sting else 'default with music') if self.has_music
            else 'default for an effects-only film')
        self.lufs = float(mas.get('lufs', (LUFS_STING if sting else LUFS_MUSIC) if self.has_music else LUFS_SFX_ONLY))
        self.ceiling = float(mas.get('ceiling', 0.77))
        self.fade = float(mas.get('fade', min(1.3, max(0.4, self.dur * 0.12))))

    # time --------------------------------------------------------------------------------
    def bar_t(self, bar, beat=0.0, sub=0.0):
        """seconds of a bar:beat:sub position: on the film's music grid (its measured downbeats) when the
        film has a track, else on the timeline's BPM grid"""
        g = self.grid
        pos = (bar - 1) * 4 + beat + sub / 4
        if g and g.get('downbeats'):
            d, beat_f = g['downbeats'], float(g['beatS']) * float(g['fps'])
            i = int(math.floor(pos / 4))
            if 0 <= i < len(d) - 1:
                f = d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i])
            elif i >= len(d) - 1:
                f = d[-1] + (pos - 4 * (len(d) - 1)) * beat_f
            else:
                f = d[0] + pos * beat_f
            return f / float(g['fps'])
        return pos * self.beat

    def T(self, x):
        """frame number | "@cue" | "@cue+6" | "bar:beat:sub" string -> seconds"""
        if isinstance(x, (int, float)):
            return float(x) / self.fps
        s = str(x).strip()
        m = re.match(r'^@([A-Za-z_]\w*)\s*([+-]\s*\d+(\.\d+)?)?$', s)
        if m:
            at = self.cues['cue'].get(m.group(1))
            rv = (self.cues.get('declared') or {}).get('reveal')
            if at is None and m.group(1) == 'reveal' and isinstance(rv, (int, float)):
                at = rv  # no cue named reveal: the timeline's REVEAL (export-cues declared.reveal)
            if at is None:
                raise ScoreError(f'score.json refers to cue "{m.group(1)}", not in cues.json '
                                 f'({", ".join(sorted(self.cues["cue"]))})'
                                 + ('; "@reveal" also reads the timeline\'s REVEAL, which it does not declare' if m.group(1) == 'reveal' else ''))
            return (at + float((m.group(2) or '0').replace(' ', ''))) / self.fps
        m = re.match(r'^(\d+)(?::(\d+(?:\.\d+)?))?(?::(\d+(?:\.\d+)?))?$', s)
        if m:
            return self.bar_t(int(m.group(1)), float(m.group(2) or 0), float(m.group(3) or 0))
        raise ScoreError(f'cannot read time {x!r}: use a frame number, "@cue", "@cue+6" or "bar:beat:sub"')

    # chords --------------------------------------------------------------------------------
    def _chords(self, chords):
        """An optional chord chart (one chord per bar): it steers which tones a text chain steps through.
        Without one, tuned effects take the key's scale."""
        if not chords:
            self.segs = []
            return
        if len(chords) > self.nbars:
            self.warnings.append(f'{len(chords)} chords for {self.nbars} bars: extra chords ignored')
        segs = []
        for b in range(1, self.nbars + 1):
            entry = chords[min(b, len(chords)) - 1] if b <= len(chords) else '-'
            parts = str(entry).split()
            for k, sym in enumerate(parts):
                t0 = self.bar_t(b) + k * self.barlen / len(parts)
                if sym == '-':
                    continue
                ch = None if sym.upper() in ('N.C.', 'NC') else Chord(sym)
                if segs and (segs[-1][2].name if segs[-1][2] else None) == (ch.name if ch else None):
                    continue  # the same chord again just continues
                segs.append([t0, None, ch])
        for i, s_ in enumerate(segs):
            s_[1] = segs[i + 1][0] if i + 1 < len(segs) else self.bar_t(self.nbars + 1) + 4
        self.segs = [tuple(s_) for s_ in segs]

    def chord_at(self, t):
        for a, b, ch in self.segs:
            if a <= t + 1e-6 < b:
                return ch
        return self.segs[-1][2] if self.segs else None

    def sub_root(self, t):
        """the chord's root between E1 and Eb2 (41-78 Hz): hits, drops and landings aim at it"""
        ch = self.chord_at(t)
        pc = ch.root if ch else self.tonic
        return D.mtof(28 + (pc - 28) % 12)


PITCHED = ('pop', 'tick', 'tock', 'click', 'bell', 'land')  # kinds whose placeholder voice takes a `pitch`


def progress_ladder(song, kit, hits):
    """With a kit: (role name, notes) when every rung event plays one kit role that has takes on 2+ notes
    of the key (the rungs then climb those notes), else (None, None). Warns about rung roles that cannot
    climb: an untuned role (its rungs all sound alike) or one the kit leaves off."""
    roles = {}
    for e in hits:
        roles.setdefault(K.role_for(e['kind'], e.get('variant'), float(e.get('weight', 1.0)),
                                    float(e['dur']) / song.fps if 'dur' in e else None), []).append(e)
    found = []
    for role, es in roles.items():
        st, name, spec = kit.lookup(role)
        if st == 'off':
            song.warnings.append(f'progress: the kit leaves {name} off, so its {len(es)} rung(s) are skipped: give the role a '
                                 'sound in audio/kit.json, or use "kind": "bell" for the steps')
        elif st == 'ok' and not kit.notes(name):
            song.warnings.append(f'progress: kit role {name} ({spec["sound"]}) is untuned, so its {len(es)} rung(s) sound '
                                 'alike and do not climb: use "kind": "bell" (the kit\'s tuned voice) for the steps, or give '
                                 'the role "pitches" in audio/kit.json')
        elif st == 'ok':
            found.append(name)
    if len(found) == 1 and len(roles) == 1:
        ns = kit.notes(found[0])
        inkey = [m for m in ns if int(round(m)) % 12 in song.scale]
        if len(inkey) >= 2:
            return found[0], inkey
    return None, None

def apply_progress(song, events, kit=None):
    """The progress motif (score.json "progress"): every event whose id contains `match` (and
    whose kind is `kind`, if given) gets the next note of the key's scale, in frame order, so
    progress is heard as a climb. By default the last rung is the step below the tonic, and
    `resolve` places the tonic above it (with its octave below, on the bells) on the payoff.
    With a kit whose role for the rungs has takes on several notes (the calm bell: two octaves of
    the key's pentatonic), the rungs climb those notes instead, ending under the highest tonic they
    can reach, and `start` counts those notes from the lowest; an untuned role warns, since its rungs
    cannot climb. Returns the report entry."""
    pr = song.progress
    hits = [e for e in events if pr['match'] in str(e.get('id', '')) and (not pr['kind'] or e['kind'] == pr['kind'])]
    if not hits:
        song.warnings.append(f'progress: no event id contains "{pr["match"]}": nothing climbs')
        return dict(match=pr['match'], events=0)
    steps = MODES[song.mode]
    n = len(hits)
    start = int(pr['start']) if pr['start'] is not None else max(1, 8 - n)  # end one step under the octave

    def degree(d):  # 1-based scale degree, any height, above the progress tonic
        k = d - 1
        return pr['tonic'] + 12 * (k // 7) + steps[k % 7]

    lad_role, lad = progress_ladder(song, kit, hits) if kit is not None else (None, None)
    if lad:
        if pr['start'] is not None:
            k0 = max(0, min(len(lad) - 1, int(pr['start']) - 1))
            notes = [lad[min(len(lad) - 1, k0 + k)] for k in range(n)]
        else:
            fit = [T for T, m in enumerate(lad) if T >= n and int(round(m)) % 12 == song.tonic]
            notes = lad[max(fit) - n:max(fit)] if fit else [lad[min(k, len(lad) - 1)] for k in range(n)]
        if n > len(lad):
            song.warnings.append(f'progress: {n} rungs but kit role {lad_role} has takes on only {len(lad)} notes of the key, so '
                                 'the climb holds on its top note: add notes to its pitches in audio/kit.json (npm run kit)')
    rungs = []
    for k, e in enumerate(hits):
        m = notes[k] if lad else degree(start + k)
        e['pitch'] = m
        rungs.append(dict(f=e['f'], id=e.get('id', ''), kind=e['kind'], note=note_name(m)))
        if kit is not None and kit.lookup(K.role_for(e['kind'], e.get('variant'), float(e.get('weight', 1.0)),
                                                     float(e['dur']) / song.fps if 'dur' in e else None))[0] != 'missing':
            continue  # the kit plays it: progress_ladder judged the role
        if e['kind'] not in PITCHED or (e['kind'] == 'land' and float(e.get('weight', 1)) >= 0.6 and e.get('variant') != 'light'):
            song.warnings.append(f'progress: {e["kind"]} {e.get("id", "")} ignores its pitch (use pop, bell, tick, click '
                                 'or a light land for the rungs)')
    rep = dict(match=pr['match'], events=n, rungs=rungs)
    if lad:
        rep['kit'] = dict(role=lad_role, notes=[note_name(m) for m in lad])
    if pr['resolve'] is not None:
        top = notes[-1] if lad else degree(start + n - 1)
        res = top + 1 + (song.tonic - (top + 1)) % 12  # the first tonic above the last rung
        if pr['resolve'] <= hits[-1]['f'] / song.fps:
            song.warnings.append('progress: the resolve comes before the last rung; it must land after the climb')
        song.motifs.append(dict(t=pr['resolve'], gain=pr['gain'] * 1.3, notes=[res, res - 12], rhythm=[0.0, 0.0]))
        rep['resolve'] = dict(t=round(pr['resolve'], 3), note=note_name(res))
    return rep


# ------------------------------------------------------------------------------------------
# sound effects from events
# ------------------------------------------------------------------------------------------
def balance(x, pan):
    if not pan:
        return x
    a = (float(np.clip(pan, -1, 1)) + 1) * np.pi / 4
    return x * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)

def plan_typing(song, events):
    """Humanize the film's key events for score.json "typing". Returns (plan, thinned, runs):
    plan[i] holds how event i sounds, thinned[i] why it does not, runs the bursts of typing (keys
    under 0.5 s apart) with their character rate and style, for the levelling and the report.

    - Style per run: "auto" (the default) sounds a run of more than 25 chars/s per word ("word")
      and a slower one per key ("soft"); any other style applies to every run.
    - "word": one pitched blip per word, on each word start (variant "word") and on the first key
      of a run, at least 80 ms apart; the other keys stay silent. The blips step through the tones
      of the chord under them (E4-F6, 330-1400 Hz), up and back down, word by word.
    - Per key, thinned by time, not by frames: no two keys sound within 60 ms (a flam), and where
      the typing runs faster than 12 keys/s (within +-0.25 s) a letter sounds only 1/12 s after
      the previous sounded key. A word start, space or return needs only the 60 ms, and displaces
      a plain letter there rather than being dropped. Realistic typing (up to ~12/s) keeps nearly
      every key.
    - Level follows the word: +2.5 dB on a word start, -0.3 dB per letter inside the word (down to
      -1.5), -1 dB on the letter before a space, sigma 2.5 dB at random (clipped at 6.25), and -3 dB
      ramped in from 1.5 s to 3 s into a run (the ear habituates; the first words sell the rest);
      about 2.5 dB SD in all, and never more than 5 dB between neighbouring keys as planned
      (under 6 dB as heard).
    - Density: gain x min(1, sqrt(10 / rate)) and decays x clip(10 / rate, 0.6, 1), where rate is
      the sounded keys per second within +-0.25 s, so a burst keeps one loudness and stays clean.
    - Timing: onsets jitter by sigma 3.5 ms, clipped at 8 ms and at 0.9 frame from the cue.
    - About half the letters bottom out 25-35 ms after the press at -12 to -15 dB; space and return
      always do. A separate key-up click only with "keyup": true in score.json (next key over 140
      ms away).
    - Each letter is one of 26 fixed keys (same key, same timbre), within +-0.05 of the centre by its
      keyboard column; space and return are one key each, centred. Per press: pitch sigma 1.2%.
    - "pitched": letters random-walk over the chord's pentatonic tones in G4-F5; space and return
      take the chord root near C4."""
    keys = [i for i, e in enumerate(events) if e['kind'] == 'key']
    plan, thinned, runs = {}, {}, []
    if not keys:
        return plan, thinned, runs
    T = {i: float(events[i]['f']) / song.fps for i in keys}
    V = {i: str(events[i].get('variant', '') or '') for i in keys}
    edge = ('space', 'return')

    def prio(i):
        return V[i] in ('word',) + edge

    pos, before_space, run_of, first, prev = {}, {}, {}, set(), None
    for n, i in enumerate(keys):  # bursts and each letter's place in its word, over every key event
        new_run = prev is None or T[i] - T[prev] > 0.5
        if new_run:
            runs.append(dict(t0=T[i], t1=T[i], keys=0, sounded=0, rate_max=0.0, idx=[]))
            first.add(i)
        run_of[i] = len(runs) - 1
        runs[-1]['t1'] = T[i]
        runs[-1]['keys'] += 1
        runs[-1]['idx'].append(i)
        pos[i] = 0 if (new_run or V[i] in ('word',) + edge or V[prev] in edge) else pos[prev] + 1
        nxt = keys[n + 1] if n + 1 < len(keys) else None
        before_space[i] = nxt is not None and V[nxt] in edge and V[i] not in edge
        prev = i
    for r in runs:
        span = r['t1'] - r['t0']
        r['chars_per_s'] = (r['keys'] - 1) / span if span > 1e-6 else 0.0
        r['style'] = song.typing if song.typing != 'auto' else ('word' if r['chars_per_s'] > AUTO_WORD_RATE else 'soft')
    if song.typing == 'off':
        return plan, {i: 'typing is "off" in score.json' for i in keys}, runs
    style = {i: runs[run_of[i]]['style'] for i in keys}
    lim = min(0.008, 0.9 / song.fps)

    # word: one blip per word, stepping through the chord tones
    contour = (0, 1, 2, 3, 4, 3, 2, 1)
    last_blip, wk = -1e9, 0
    for i in keys:
        if style[i] != 'word':
            continue
        if i in first:
            wk = 0
        why = None
        if not (V[i] == 'word' or i in first):
            why = 'typing "word": one blip per word, on its first key'
        elif T[i] - last_blip < WORD_MIN_GAP:
            why = f'{(T[i] - last_blip) * 1000:.0f} ms after the previous word blip (merged)'
        if why:
            thinned[i] = why
            continue
        last_blip = T[i]
        r = D.rng(7919 * i + int(float(events[i]['f']) * 10) + 37)
        ch = song.chord_at(T[i] + 1e-3)
        pcs = ch.pcs if ch is not None else song.penta
        tones = [m for m in range(64, 90) if m % 12 in pcs]  # E4-F6: 330-1400 Hz
        start = int(np.argmin([abs(m - 69) for m in tones]))  # from the chord tone nearest A4
        m = tones[min(len(tones) - 1, start + contour[wk % len(contour)])]
        wk += 1
        db = float(np.clip(r.normal(0, 1.0), -2.0, 2.0)) + (1.5 if i in first else 0.0)
        plan[i] = dict(t=max(0.0, T[i] + float(np.clip(r.normal(0, 0.0025), -lim, lim))), kind='word', style='word',
                       seed=0, strike=7919 * i, level=10 ** (db / 20), keyup=None, second=0.0, second_db=None, tau=1.0,
                       note=D.mtof(m), midi=m, pitch=1.0, pan=0.0, gain=TYPING_GAIN['word'], db=db)
        runs[run_of[i]]['sounded'] += 1

    # per key (soft, mechanical, pitched, muted): thin by time
    pk = [i for i in keys if style[i] != 'word']
    ta = np.array([T[i] for i in pk])
    kept = []
    for i in pk:
        if kept and run_of[kept[-1]] == run_of[i]:
            j = kept[-1]
            gap = T[i] - T[j]
            fast = np.sum(np.abs(ta - T[i]) <= 0.25) / 0.5 > KEY_FAST
            if gap < (KEY_MIN_GAP if fast and not prio(i) else KEY_FLAM_GAP):
                if prio(i) and not prio(j) and (len(kept) < 2 or T[i] - T[kept[-2]] >= KEY_FLAM_GAP):
                    thinned[j] = f'displaced by the {V[i] or "key"} {gap * 1000:.0f} ms later (thinned)'
                    kept[-1] = i
                else:
                    thinned[i] = f'{gap * 1000:.0f} ms after the previous sounded key (thinned)'
                continue
        kept.append(i)
    tk = np.array([T[i] for i in kept])
    letters = ''.join(QWERTY)
    walk, prev_db = 2, None
    for n, i in enumerate(kept):
        f = float(events[i]['f'])
        r = D.rng(7919 * i + int(f * 10) + 31)
        rate = float(np.sum(np.abs(tk - T[i]) <= 0.25)) / 0.5
        kind = V[i] if V[i] in ('space', 'return', 'back') else 'letter'
        db = float(np.clip(r.normal(0, KEY_LEVEL_SD), -2.5 * KEY_LEVEL_SD, 2.5 * KEY_LEVEL_SD))
        if kind in ('letter', 'back'):
            db += 2.5 if pos[i] == 0 else -min(1.5, 0.3 * pos[i]) - (1.0 if before_space[i] else 0.0)
        db -= 3.0 * float(np.clip((T[i] - runs[run_of[i]]['t0'] - 1.5) / 1.5, 0, 1))
        gain = min(1.0, math.sqrt(10.0 / rate)) * KEY_KIND_GAIN[kind] * TYPING_GAIN[style[i]]
        total = db + 20 * math.log10(gain)  # what is heard: the press level and the key's gain together
        if prev_db is not None and n > 0 and run_of[kept[n - 1]] == run_of[i]:
            total = float(np.clip(total, prev_db - KEY_MAX_STEP, prev_db + KEY_MAX_STEP))  # no jump over 5 dB as planned
            db = total - 20 * math.log10(gain)
        prev_db = total
        gap = tk[n + 1] - T[i] if n + 1 < len(kept) else 1e9
        need, dwell = (0.2, (0.12, 0.18)) if kind in edge else (0.14, (0.07, 0.12))
        u_up, u_sec, u_delay, u_db = r.random(), r.random(), r.random(), r.random()
        keyup = min(dwell[0] + (dwell[1] - dwell[0]) * u_up, gap - 0.03) if song.keyup and gap > need else None
        second = None if kind in edge else (0.025 + 0.010 * u_delay if u_sec < 0.5 else 0.0)  # about half the letters
        ident = int(D.rng(4242 + i).integers(26))
        row = next(k for k, rw in enumerate(QWERTY) if letters[ident] in rw)
        col = QWERTY[row].index(letters[ident]) + (0, 0.25, 0.75)[row]
        note, m = None, None
        if style[i] == 'pitched':
            ch = song.chord_at(T[i] + 1e-3)
            pcs = [q for q in song.penta if ch is None or q in ch.pcs]
            pcs = pcs if len(pcs) >= 3 else song.penta
            if kind in edge:
                m = D.nearest([ch.root if ch else song.tonic], 60)
            else:
                tones = [q for q in range(67, 78) if q % 12 in pcs]
                walk = int(np.clip(walk + int(r.integers(-2, 3) if pos[i] == 0 else r.integers(-1, 2)), 0, len(tones) - 1))
                m = tones[walk]
            note = D.mtof(m)
        plan[i] = dict(t=max(0.0, T[i] + float(np.clip(r.normal(0, 0.0035), -lim, lim))), kind=kind, style=style[i],
                       seed=0 if kind in edge else ident, strike=7919 * i + int(f * 10), level=10 ** (db / 20),
                       keyup=keyup, second=second, second_db=None if kind in edge else -12.0 - 3.0 * u_db,
                       tau=float(np.clip(10.0 / rate, 0.6, 1.0)), note=note, midi=m,
                       pitch=1 + float(np.clip(0.012 * r.standard_normal(), -0.025, 0.025)),
                       pan=0.0 if kind in edge else (col / 9.0 - 0.5) * 0.1, db=db, gain=gain)
        runs[run_of[i]]['sounded'] += 1
        runs[run_of[i]]['rate_max'] = max(runs[run_of[i]]['rate_max'], rate)
    return plan, thinned, runs

def kit_target(song, kind, e, t, pcs, pitch, text_note):
    """(note, explicit) a tonal kit role is aimed at: the note the synth voice would sound (the cue's own
    pitch is explicit: a progress rung or a set note keeps its octave), None for untuned kinds."""
    if pitch is not None:
        return pitch, True
    if kind == 'text':
        return text_note, False
    if kind == 'bell':
        return D.nearest(pcs, 80), False
    if kind == 'click' and e.get('variant') == 'confirm':
        return D.nearest([q for q in song.penta if q in pcs] or song.penta, 81), False
    if kind in ('hit', 'drop', 'snap', 'land'):
        return D.ftom(song.sub_root(t)), False
    if kind == 'tick':
        return (None if e.get('variant') == 'crisp' else song.sig_tick), False
    if kind == 'tock':
        return song.sig_tock, False
    return None, False

def kit_voice(kit, name, spec, e, i, f, t, target=None, explicit=False, index=None, mono=True):
    """One cue's take: (samples, start s, MIDI note of a pitched take or None, file). The take is chosen by
    Kit.pick, trimmed toward its role's median loudness (Kit: the takes are peak-normalised) and placed so
    its measured onset / peak / end (the role's align) lands on t."""
    tk = kit.pick(name, f"{e.get('id', i)}|{f:g}", target, explicit, index)
    x = kit.audio(tk)
    if mono and x.ndim == 2:
        x = x.mean(axis=1)
    return x * tk.get('trim', 1.0), t - tk[spec.get('align', 'onset') + '_s'], tk['midi'], tk['file']

def fade_head(x, cut):
    """x with its first `cut` samples dropped and a short raised-cosine fade-in where it now starts."""
    if cut <= 0:
        return x
    x = x[cut:].copy()
    k = min(len(x), max(1, D.ns(0.012)))
    w = 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
    x[:k] *= w[:, None] if x.ndim == 2 else w
    return x

def text_chain_note(song, ch, text_run):
    """the MIDI note a text chain's fragment steps to: root, third, fifth, third (the key's triad without
    chords), in the octave above the chord's root near C5"""
    tri = [(ch.root + i) % 12 for i in ch.iv if i in (0, 3, 4, 5, 7)][:3] if ch else song.triad
    lo = int(D.nearest([ch.root if ch else song.tonic], 72))
    tones = [q for q in range(lo, lo + 24) if q % 12 in tri]
    return tones[(0, 1, 2, 1)[text_run % 4] % len(tones)]


def text_kit_target(song, kit, name, ch, pcs, text_run):
    """(note, explicit) for a text cue on a tuned kit role: the chain steps through the chord's tones among the
    role's notes (root, third, fifth, third), so consecutive fragments play different takes"""
    tri = [(ch.root + i) % 12 for i in ch.iv if i in (0, 3, 4, 5, 7)][:3] if ch else song.triad
    ns = kit.notes(name)
    tones = [m_ for m_ in ns if int(round(m_)) % 12 in tri]
    if len(tones) < 2:  # fewer than two triad tones among the takes: any chord tone, else any take
        wide = [m_ for m_ in ns if int(round(m_)) % 12 in pcs]
        tones = wide if len(wide) >= 2 else ns
    return tones[(0, 1, 2, 1)[text_run % 4] % len(tones)], True


def tonal_trim(x):
    """a tuned sound ends by TONAL_MAX_S: cut there with a TONAL_FADE_S cos^2 fade (a copy; shorter ones as they are)"""
    n = int(TONAL_MAX_S * SR)
    if len(x) <= n:
        return x
    x = x[:n].copy()
    k = int(TONAL_FADE_S * SR)
    w = np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    x[-k:] *= w[:, None] if x.ndim == 2 else w
    return x


def tuned_thin(items, song, cues):
    """items: placements with 'midi' (pitched) -> the set of item indices over the tuned budget (at most
    TUNED_PER_4S pitched effects in any 4 s). Kept first: the payoff and the lockup, structural events,
    heavy roles, then by weight and time. A progress resolve (two notes an octave apart) counts once."""
    lock = cues.get('cue', {}).get('lockup')
    lock_t = lock / song.fps if lock is not None else None

    def special(t):
        return any(m is not None and abs(t - m) <= STACK_F / song.fps for m in (song.payoff, lock_t))
    cands = []
    for k, it in enumerate(items):
        if it.get('midi') is None or it.get('dyad_second'):
            continue
        cands.append(((0 if special(it['t']) or it.get('structural') else 1, 0 if it.get('heavy') else 1,
                       -it.get('w', 1.0), it['t']), it['t'], k))
    kept, drop = [], set()
    for _, t, k in sorted(cands):
        near = sorted([u for u in kept if abs(u - t) < 4.0] + [t])
        if any(sum(1 for u in near if a <= u < a + 4.0) > TUNED_PER_4S for a in near):
            drop.add(k)
        else:
            kept.append(t)
    return drop


def voices(draft):
    """the placeholder voices (dsp + draft), only for a --draft render"""
    if not draft:
        return None
    import draft as DR
    return types.SimpleNamespace(**{**vars(D), **{k: v for k, v in vars(DR).items() if not k.startswith('__')}})


def build_sfx(song, n, events, plan=None, thinned=None, kit=None, draft=False, cues=None):
    """Every event as a sound (the effects-only path, and --draft voices). Returns the buses (fx with its rooms,
    hall sends, ui for the clock's tick/tock with a small room, and keys, clicks and crisp ticks, all dry), the
    placed and skipped events, and the cues no kit take sounds (missing: a failed gate unless --draft). Effects
    other than whooshes, risers, swells and sucks sit within +-0.15 of the centre: the cue's pan is scaled into
    that range. A cue whose role the kit names plays its take (module doc); a role set to null skips the cue;
    a role the kit does not name, or an explicit note no take sounds, is missing (a placeholder voice under
    --draft). Pitched effects past the tuned budget are thinned; tuned takes end by 1.5 s."""
    fx, hall, ui, keys, clicks, crisp = (np.zeros((n, 2)) for _ in range(6))
    buses = dict(fx=fx, hall=hall, ui=ui, keys=keys, clicks=clicks, crisp=crisp)
    placed, skipped, missing, items = [], [], [], []
    V = voices(draft)
    fps, beat = song.fps, song.beat
    plan, thinned = plan or {}, thinned or {}
    last_heavy = None
    pop_run, last_pop, lights = 0, -1e9, {}
    text_run, last_text = 0, -1e9
    motif_warned = False
    # the UI click: one voice for the whole film at one level (the median click weight), a fixed
    # press-release gap, +-0.5 dB and a tiny timbre jitter per press
    cw = [float(e.get('weight', 1.0)) for e in events if e['kind'] == 'click']
    click_w = float(np.median(cw)) if cw else 1.0
    click_seed = 23 + 7 * song.tonic
    click_gap = 0.080 + 0.012 * D.rng(click_seed).random()

    def put(bus, x, start, g, pan, rec, midi=None, **kw):
        items.append(dict(bus=bus, x=x, start=start, g=g, pan=pan, rec=rec, midi=midi, t=rec['t'], **kw))

    for i, e in enumerate(events):
        kind, f = e['kind'], float(e['f'])
        t = f / fps
        w = float(e.get('weight', 1.0))
        pan = float(e.get('pan', 0.0))
        if kind not in WIDE_KINDS:
            pan = SFX_PAN * float(np.clip(pan / 0.8, -1, 1))
        seed = 7919 * i + int(f * 10)
        ch = song.chord_at(t + 1e-3)
        pcs = ch.pcs if ch else song.scale
        pitch = D.midi(e['pitch']) if 'pitch' in e else None
        dur = float(e['dur']) / fps if 'dur' in e else None
        g = BASE.get(kind, 0) * w
        start = t
        x = None
        m = None  # the MIDI note the sound is tuned to, for the report
        if kind not in BASE:
            skipped.append(dict(i=i, f=f, kind=kind, why='unknown kind'))
            continue
        if any(a <= t < b for a, b, _, sc in song.silences) and kind != 'suck':
            song.warnings.append(f'{kind} at f={f} falls inside a silence and is muted')
        text_note = None
        if kind == 'text':  # one chain's fragments step root, third, fifth, third (the key's triad without chords)
            text_run = text_run + 1 if t - last_text < TEXT_RUN_GAP else 0
            last_text = t
            text_note = text_chain_note(song, ch, text_run)
        motif = kind == 'bell' and e.get('variant') == 'motif'
        if motif and not motif_warned:
            motif_warned = True
            song.warnings.append('bell variant "motif": a motif of tuned notes is music; the bell plays one note')
        heavy = kind in ('hit', 'drop', 'snap') or (kind == 'land' and w >= 0.6 and e.get('variant') != 'light')
        why_missing = None
        if kit is not None and not (kind == 'key' and i not in plan):
            kp = plan.get(i) if kind == 'key' else None
            role = K.role_for(kind, kp['kind'] if kp else e.get('variant'), w, dur)
            st, name, spec = kit.lookup(role)
            if st == 'off':
                skipped.append(dict(i=i, f=f, kind=kind, role=role, why=f'{name} is off in the kit'))
                continue
            target, explicit = kit_target(song, kind, e, t, pcs, pitch, text_note) if st == 'ok' else (None, False)
            if st == 'ok' and kind == 'text' and pitch is None and kit.notes(name):
                target, explicit = text_kit_target(song, kit, name, ch, pcs, text_run)
            if st == 'ok' and explicit and not kit.covers(name, target):
                why_missing = (f'kit role {name} ({kit.roles[name]["sound"]}) has no take on {note_name(target)}: add it to the '
                               "role's pitches in audio/kit.json and render the kit (npm run kit), or drop the hand-set pitch")
                st = 'missing-note'
            if st == 'missing':
                why_missing = f'the kit has no {role} role (nor one of its family): give it one in audio/kit.json (npm run kit)'
            if st == 'ok' and name == 'land':
                if last_heavy is not None and abs(f - last_heavy) < 1:
                    skipped.append(dict(i=i, f=f, kind=kind, why='second heavy landing on one frame'))
                    continue
                last_heavy = f
            if st == 'ok':
                kg = KIT_GAIN * 10 ** (float(spec.get('level_db') or 0.0) / 20)
                crisp_ = role == 'tick.crisp'
                if kind == 'key':  # plan_typing's timing, word dynamics and density; one take per key identity
                    kk = kp['kind']  # letter, back, space, return, or word (typing "word": one take per word)
                    index = kp['strike'] if kk == 'word' else kp['seed'] if kk not in ('space', 'return') else None
                    x, start, m, src = kit_voice(kit, name, spec, e, i, f, kp['t'], index=index)
                    g = kg * w * kp['level'] * kp['gain'] / (TYPING_GAIN[kp['style']] * KEY_KIND_GAIN.get(kk, 1.0))
                    g *= 0.8 if kp['style'] == 'muted' else 1.0
                    pan, bus = float(np.clip(kp['pan'], -SFX_PAN, SFX_PAN)), 'keys'
                else:
                    wide = kind in WIDE_KINDS
                    keep = wide or spec.get('width') is not None  # a role with a width keeps the stereo it was rendered with
                    x, start, m, src = kit_voice(kit, name, spec, e, i, f, t, target, explicit, mono=not keep)
                    if keep and not wide and x.ndim == 2:
                        pan = 0.0
                    if kind in ('whoosh', 'suck'):  # the take's lead-in starts no earlier than its move (2 f of air)
                        d = float(np.clip(dur or (0.45 + 0.35 * w), 0.15, 3.0)) if kind == 'whoosh' else (dur or 0.35)
                        lead = float(e.get('apexFrac', 0.5 if kind == 'whoosh' else 0.85)) * d + 2 / fps
                        cut = int(round((t - lead - start) * SR))
                        if cut > 0:
                            x, start = fade_head(x, cut), start + cut / SR
                    g = kg * (click_w if kind == 'click' else w)  # level_db sets each role's level, land.light's too
                    if kind == 'click':  # one level per film, +-0.5 dB per press
                        r = D.rng(seed)
                        r.standard_normal()
                        g *= 10 ** (float(np.clip(r.normal(0, 0.25), -0.5, 0.5)) / 20)
                    if wide:
                        pan = float(np.clip(e.get('pan', 0.0), -1, 1)) * 0.6
                        if x.ndim == 2:
                            x, pan = balance(x, pan), 0.0
                    bus = 'crisp' if crisp_ else 'clicks' if kind == 'click' else 'ui' if kind in UI_KINDS else 'fx'
                if m is not None:
                    x = tonal_trim(x)
                put(bus, x, start, g, pan, dict(i=i, f=f, kind=kind, id=e.get('id', ''), t=t, start=start, x=x, g=g, pan=pan,
                                                midi=m, sample=src, role=name, **({'variant': 'crisp'} if crisp_ else {})),
                    m, w=w, heavy=heavy, structural=bool(e.get('structural')))
                continue
        elif kit is None and not (kind == 'key' and i not in plan):
            why_missing = 'no kit to play (npm run kit renders it; earshot 0.4+ in its own virtualenv)'
        if why_missing and not draft:
            missing.append(dict(i=i, f=f, kind=kind, id=e.get('id', ''), why=why_missing))
            skipped.append(dict(i=i, f=f, kind=kind, why='no kit take: ' + why_missing))
            continue
        if kind == 'key' and i not in plan:
            skipped.append(dict(i=i, f=f, kind=kind, why=thinned.get(i, 'thinned')))
            continue
        # ---- placeholder voices (--draft only)
        if kind == 'tick' and e.get('variant') == 'crisp':  # counters locking, list rows, build ticks
            x = V.crisp_tick(seed, 0.05, V.mtof(pitch) if pitch else None)
            m, g = pitch, BASE['crisp'] * w
            put('crisp', x, start, g, pan, dict(i=i, f=f, kind=kind, variant='crisp', id=e.get('id', ''), t=t, start=start,
                                                x=x, g=g, pan=pan, midi=m), m, w=w)
            continue
        if kind == 'tick':
            m = pitch or song.sig_tick
            x = V.tick(V.mtof(m), 0.08, 0.010, 0.8, seed)
        elif kind == 'tock':
            m = pitch or song.sig_tock
            x = V.tick(V.mtof(m), 0.08, 0.011, 0.8, seed, True) * 0.95 + V.tock(V.mtof(m) / 4, 0.08, 0.02, 0.05, seed) * 0.2
        elif kind == 'hit':
            r = song.sub_root(t)
            m = None
            x = V.sub_boom(r * 2, r, 0.1, 1.6, seed)
            x = V.layer_in(x, V.clap(seed=seed), 0.6)
            x = V.layer_in(x, V.filt(V.noise(0.5, seed + 1), V.bp(200, 3000)) * V.expdec(0.5, 0.1), 0.35)
            D.place(hall, V.filt(x, V.hp(250)), t, g * 0.4, pan)
        elif kind == 'land':
            if heavy:
                if last_heavy is not None and abs(f - last_heavy) < 1:
                    skipped.append(dict(i=i, f=f, kind=kind, why='second heavy landing on one frame'))
                    continue
                last_heavy = f
                r = song.sub_root(t)
                knock = V.tock(650 + 150 * V.rng(seed).random(), 0.2, 0.05, 1.0, seed)
                x = V.layer_in(V.sub_boom(r * 2, r, 0.08, 1.0, seed) * 0.55, knock)
            else:
                key = id(ch)
                k = lights.get(key, 0)
                lights[key] = k + 1
                ladder = stack(pcs, 84, 4)
                m = pitch or ladder[k % len(ladder)]
                x = V.tock(V.mtof(m), 0.12, 0.028, 0.35, seed)
                g = BASE['land_light'] * min(2.0, w / 0.5)  # a light landing's reference weight is 0.5
        elif kind == 'pop':
            pop_run = pop_run + 1 if t - last_pop < 1.0 else 0
            last_pop = t
            ladder = [q for q in range(81, 99) if q % 12 in song.penta]
            target = D.nearest([p for p in song.penta if p in pcs] or song.penta, 86)
            base = int(np.argmin([abs(q - target) for q in ladder]))
            m = pitch or ladder[min(len(ladder) - 1, base)]  # one note: a climbing run of pops is a melody
            x = V.blip(V.mtof(m), e.get('variant') != 'down')
        elif kind == 'whoosh':
            d = float(np.clip(dur or (0.45 + 0.35 * w), 0.15, 3.0))
            apex = float(e.get('apexFrac', 0.5))
            x = V.whoosh(d, 120, 500 + 250 * min(w, 1.6), 220, apex, pan, 0.025, seed)  # dull: centroid ~550 Hz
            start = t - apex * d
            pan = 0.0
        elif kind == 'suck':
            d = dur or 0.35
            apex = float(e.get('apexFrac', 0.85))
            x = V.whoosh(d, 2500, 900, 200, apex, 0.0, 0.04, seed)
            start = t - apex * d
        elif kind == 'riser':
            d = dur or song.barlen
            x = V.riser(d, 220, 7000, None, seed)  # noise only: no tuned saws
            start = t - d
        elif kind == 'drop':
            r = song.sub_root(t)
            x = V.stereo(V.sub_boom(r * 2, r, 0.12, 1.4, seed, tau=0.5))
            x = V.layer_in(x, V.whoosh(0.4, 3000, 400, 150, 0.1, 0.0, 0.05, seed + 3), 0.4)  # falling air
            D.place(hall, V.filt(x, V.hp(250)), t, g * 0.3, pan)
        elif kind == 'key':
            k = plan[i]  # plan_typing(): style, thinning, word dynamics, jitter, bottom-out, density
            if k['style'] == 'word':
                x = V.word_blip(k['note'], 0.048) * k['level']
            else:
                x = V.key_click(k['seed'], k['pitch'], None, k['style'], k['kind'], k['strike'], k['level'], k['keyup'],
                                k['note'], k['tau'], k['second'], k['second_db'])
                w6 = max(1, D.ns(0.006))
                x *= k['level'] * KEY_RMS_REF[k['style']] / (np.sqrt(np.convolve(x ** 2, np.ones(w6) / w6, 'same')).max() + 1e-12)
            g = BASE['key'] * w * k['gain']
            start = k['t']
            pan = float(np.clip(k['pan'], -SFX_PAN, SFX_PAN))
            m = k['midi']
        elif kind == 'click':  # press + release; variant "confirm" adds a soft tuned tone (meaningful actions only)
            tone = V.mtof(D.nearest([q for q in song.penta if q in pcs] or song.penta, 81)) if e.get('variant') == 'confirm' else None
            r = D.rng(seed)
            x = V.ui_click(V.mtof(pitch or D.nearest(song.penta, 95)), 0.14, click_seed, click_gap + 0.004 * r.standard_normal(),
                           tone, seed)
            m = D.nearest(song.penta, 81) if tone else None
            g = BASE['click'] * click_w * 10 ** (float(np.clip(r.normal(0, 0.25), -0.5, 0.5)) / 20)
            put('clicks', x, start, g, pan, dict(i=i, f=f, kind=kind, id=e.get('id', ''), t=t, start=start, x=x, g=g, pan=pan,
                                                 midi=m), m, w=w)
            continue
        elif kind == 'snap':
            x = V.snap(song.sub_root(t), 0.6, 1.0, seed)
        elif kind == 'swell':
            d = min(dur or beat, TONAL_MAX_S)
            notes = [pitch] if pitch else stack(pcs, 60, 1)
            m = notes[0]
            x = V.swell([V.mtof(q) for q in notes], d, seed)
            start = t - d
        elif kind == 'bell':
            m = pitch or D.nearest(pcs, 80)
            x = V.fm_bell(V.mtof(m), TONAL_MAX_S, 1.6, 3.5, 0.3)
        elif kind == 'text':  # a fragment resolving: a soft mallet on the chain's next chord tone
            m = pitch or text_note
            x = V.tick(V.mtof(m), 0.14, 0.03, 0.8, seed)
        if x is None:
            continue
        if m is not None:
            x = tonal_trim(x)
        if x.ndim == 2 and pan:
            x = balance(x, pan)
            pan = 0.0
        put('keys' if kind == 'key' else 'ui' if kind in UI_KINDS else 'fx', x, start, g, pan,
            dict(i=i, f=f, kind=kind, id=e.get('id', ''), t=t, start=start, x=x, g=g, pan=pan, midi=m, draft=True), m,
            w=w, heavy=heavy, structural=bool(e.get('structural')))
    # the progress resolve: the tonic and its octave below on the kit's bell role, at once (one gesture)
    for mo in song.motifs:
        st, name, spec = kit.lookup('bell') if kit is not None else ('missing', None, None)
        for k, mm in enumerate(mo['notes']):
            tk = kit.pick(name, f"motif|{mo['t']:.4f}|{k}", mm, explicit=True) if st == 'ok' else None
            if tk is None:
                why = (f'kit role bell has no take on {note_name(mm)} for the progress resolve' if st == 'ok'
                       else 'the kit has no bell role for the progress resolve')
                if not draft:
                    missing.append(dict(i=-1, f=round(mo['t'] * fps, 2), kind='bell', id='progress:resolve', why=why))
                    continue
                x, start_, src = tonal_trim(V.fm_bell(V.mtof(mm), TONAL_MAX_S, 1.4, 3.5, 0.4)), mo['t'], None
                g = BASE['bell'] * mo['gain'] * (1.0 - 0.12 * k)
            else:
                x = tonal_trim(kit.audio(tk) * tk.get('trim', 1.0))
                if x.ndim == 2:
                    x = x.mean(axis=1)
                start_, src = mo['t'] - tk[spec.get('align', 'onset') + '_s'], tk['file']
                g = KIT_GAIN * 10 ** (float(spec.get('level_db') or 0.0) / 20) * (1.0 - 0.12 * k) * mo['gain']
            pan_ = 0.12 * (k % 2 * 2 - 1)
            put('fx', x, start_, g, pan_, dict(i=-1, f=round(mo['t'] * fps, 2), kind='bell', variant='resolve', id='progress:resolve',
                                               t=mo['t'], start=start_, x=x, g=g, pan=pan_, midi=mm, sample=src,
                                               role=name if src else None), mm, w=mo['gain'], dyad_second=k > 0, structural=True)
    # the tuned budget, then everything into its bus in event order
    drop = tuned_thin(items, song, cues or {})
    for k, it in enumerate(items):
        if k in drop:
            r = it['rec']
            skipped.append(dict(i=r['i'], f=r['f'], kind=r['kind'], role=r.get('role'),
                                why=f'tuned budget: at most {TUNED_PER_4S} pitched effects in 4 s (a run of tuned hits is a melody)'))
            continue
        D.place(buses[it['bus']], it['x'], it['start'], it['g'], it['pan'])
        placed.append(it['rec'])
    if drop:
        song.warnings.append(f'{len(drop)} pitched effect(s) thinned by the tuned budget (at most {TUNED_PER_4S} in any 4 s): '
                             + ', '.join(f"{items[k]['rec']['kind']} f{items[k]['rec']['f']:g}" for k in sorted(drop)[:6]))
    return buses, placed, skipped, missing


def band_snr(evt, bus):
    """How far an effect stands above the music in its own band: per octave band, event energy
    over music energy; the result is the best band among those holding >= 15% of the event's
    A-weighted energy (a landing is heard by its knock, not its sub). Returns (band_hz, snr_db)."""
    if len(evt) < 256:
        return None
    # flat with raised-cosine edges (1 ms in, 5 ms out): a Hann window over the take would weigh its attack, in its
    # first milliseconds, at nearly nothing (a pop read 10-15 dB under what plays) while the steady music keeps its level
    w = np.ones(len(evt))
    for k, head in ((min(len(evt) // 4, int(0.001 * SR)), True), (min(len(evt) // 4, int(0.005 * SR)), False)):
        if k > 1:
            r = 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
            if head:
                w[:k] = r
            else:
                w[-k:] = r[::-1]
    A = np.abs(np.fft.rfft(evt.mean(axis=1) * w)) ** 2
    B = np.abs(np.fft.rfft(bus.mean(axis=1) * w)) ** 2
    fr = np.fft.rfftfreq(len(evt), 1 / SR)
    bands = [(fr >= c / np.sqrt(2)) & (fr < c * np.sqrt(2)) for c in OCTAVES]
    heard = np.array([A[b].sum() * 10 ** (wd / 10) for b, wd in zip(bands, A_WEIGHT_DB)])
    tot = heard.sum() + 1e-20
    best = None
    for c, band, h in zip(OCTAVES, bands, heard):
        ea = A[band].sum()
        if h / tot < 0.15:
            continue
        snr = 10 * np.log10((ea + 1e-20) / (B[band].sum() + 1e-20))
        if best is None or snr > best[1]:
            best = (c, snr)
    return best

def _a_weight(fr):
    """A-weighting as a power gain per frequency (Hz)."""
    fr = np.maximum(fr, 1e-3)
    ra = (12194 ** 2 * fr ** 4) / ((fr ** 2 + 20.6 ** 2) * np.sqrt((fr ** 2 + 107.7 ** 2) * (fr ** 2 + 737.9 ** 2)) * (fr ** 2 + 12194 ** 2))
    return (ra * 1.2589) ** 2

def short_vs_music(sig, music, t, win=0.006, mwin=0.25):
    """An effect against the music by the house measure: the effect's 6 ms RMS at its
    loudest (within 2 ms before to 20 ms after t) minus the music's 250 ms RMS centred on t, in dB.
    sig and music are mono. Returns (dB, effect RMS) or (None, rms) when there is no music there."""
    i = int(round(t * SR))
    a, b = max(0, i - int(0.002 * SR)), min(len(sig), i + int(0.02 * SR))
    if b - a < 8:
        return None, 0.0
    k = max(1, int(win * SR))
    e = np.sqrt(np.maximum(np.convolve(sig[a:b] ** 2, np.ones(k) / k, mode='same'), 0))
    h = int(mwin * SR / 2)
    mu = float(np.sqrt(np.mean(music[max(0, i - h):i + h] ** 2))) if i < len(music) else 0.0
    peak = float(e.max())
    if mu < 1e-4 or peak <= 0:  # no music under it (or nothing sounded): nothing to level against
        return None, peak
    return 20 * np.log10(peak / mu), peak

def typing_levels(runs, plan, keys_sig, music_sig, kit_keys=None):
    """Each typing run of 4+ sounded keys (2+ word blips) against the music under it, both
    pre-master: the A-weighted level difference over the run, the
    keys' short-window level against the music (6 ms vs 250 ms RMS, median), the 2-5 and 5-10 kHz
    band differences, the typing's 2-5 kHz share of its own A-weighted energy, and the bed's share
    above 2 kHz. House targets: per key (soft, mechanical, pitched) the run sits -8
    to -2 dB A under the music with the keys about at the music's short-window RMS; word
    blips +2 to +9 dB over it; muted typing 8 dB A or more under the full bed. kit_keys: {event index:
    "role: sound"} for keys a kit take voiced: such a run is bright when its centroid passes the house
    key-click range (KEY_CENTROID_MAX), and the warning names the take, not a style. Returns (rows,
    warnings)."""
    rows, warns = [], []
    kit_keys = kit_keys or {}
    km, mm = keys_sig.mean(axis=1), music_sig.mean(axis=1)
    for r in runs:
        sounded = [plan[i]['t'] for i in r['idx'] if i in plan]
        if r['sounded'] < (2 if r['style'] == 'word' else 4) or not sounded:
            continue
        i0, i1 = int(r['t0'] * SR), min(len(mm), int((r['t1'] + 0.1) * SR))
        if i1 - i0 < 1024:
            continue
        k, mu = km[i0:i1], mm[i0:i1]
        K, Mu = np.abs(np.fft.rfft(k)) ** 2, np.abs(np.fft.rfft(mu)) ** 2
        fr = np.fft.rfftfreq(len(k), 1 / SR)
        aw = _a_weight(fr)
        db = lambda a, b: round(float(10 * np.log10((a + 1e-20) / (b + 1e-20))), 1)
        band = lambda X, lo, hi: X[(fr >= lo) & (fr < hi)].sum()
        sv = [v for v in (short_vs_music(km, mm, t)[0] for t in sounded) if v is not None]
        row = dict(t=[round(r['t0'], 2), round(r['t1'], 2)], style=r['style'], chars_per_s=round(r['chars_per_s'], 1),
                   keys=r['keys'], sounded=r['sounded'], rate_max=round(r['rate_max'], 1), duck_db=r.get('duck_db', 0.0),
                   level_db=r.get('level_db'), vs_music_A_db=db((K * aw).sum(), (Mu * aw).sum()),
                   key_vs_music_db=round(float(np.median(sv)), 1) if sv else None,
                   band_2k_5k_db=db(band(K, 2000, 5000), band(Mu, 2000, 5000)),
                   band_5k_10k_db=db(band(K, 5000, 10000), band(Mu, 5000, 10000)),
                   share_2k_5k_A_pct=round(float(100 * band(K * aw, 2000, 5000) / ((K * aw).sum() + 1e-20)), 1),
                   centroid_hz=round(float((fr * K).sum() / (K.sum() + 1e-20))),
                   bed_top_A_pct=round(float(100 * band(Mu * aw, 2000, 10000) / ((Mu * aw).sum() + 1e-20)), 1))
        rows.append(row)
        where = f'typing at {row["t"][0]}-{row["t"][1]}s ({r["style"]}, {row["chars_per_s"]:.0f} chars/s)'
        if r['style'] != 'word' and r['chars_per_s'] > AUTO_WORD_RATE:  # any per-key style, muted included
            warns.append(f'{where} sounds per key above {AUTO_WORD_RATE:.0f} chars/s; the house sounds typing that fast '
                         'once per word or not at all: "typing": "auto", "word" or "off"')
        quiet = np.sqrt(np.mean(mu ** 2)) < 1e-3
        if quiet:  # no music under it: only the timbre is judged
            row['note'] = 'no music under this run'
        elif r['style'] in PER_KEY:
            if row['vs_music_A_db'] > -1:
                warns.append(f'{where} sits {row["vs_music_A_db"]:+.0f} dB A against the music (want about -8 to -2): '
                             'lower the key weights')
            elif row['vs_music_A_db'] < -10:
                warns.append(f'{where} sits {-row["vs_music_A_db"]:.0f} dB A under the music (want about 2-8): the music is '
                             'too dense to level against; put a sparse bar under the run (track.py edit), or "muted"')
        elif r['style'] == 'muted' and row['vs_music_A_db'] > -8:
            warns.append(f'{where} sits only {-row["vs_music_A_db"]:.0f} dB A under the music (muted typing is background, '
                         '8 dB A or more under): lower the key weights')
        elif r['style'] == 'word' and row['key_vs_music_db'] is not None and not 0 <= row['key_vs_music_db'] <= 11:
            warns.append(f'{where}: the word blips sit {row["key_vs_music_db"]:+.0f} dB against the music (want +2 to +9)')
        ks = sorted({kit_keys[i] for i in r['idx'] if i in kit_keys})
        if ks:
            row['kit_sounds'] = ks
        if r['style'] == 'word':
            continue
        if ks:  # the kit's take sets the timbre; the typing style only shapes timing and level
            # judged by the house key-click centroid (0.8-3 kHz, median 1.8): recorded keys in earshot's bank
            # put 39-65% of their A-weighted energy in 2-5 kHz with centroids of 1-2.2 kHz, so the synth voice's
            # 25% share target would flag every one of them
            if row['centroid_hz'] > KEY_CENTROID_MAX:
                warns.append(f'{where} is bright: its keys\' centroid is {row["centroid_hz"] / 1000:.1f} kHz (key clicks '
                             f'sit at 0.8-{KEY_CENTROID_MAX / 1000:g} kHz, median 1.8; a key is a dark tock). The kit\'s key '
                             f'takes ({", ".join(ks)}) set the timbre, not the typing style: give the brighter role a darker '
                             'member in audio/kit.json (earshot sfx list shows each sound\'s centroid_hz), then npm run kit')
        elif row['share_2k_5k_A_pct'] > 25:
            warns.append(f'{where} is bright: {row["share_2k_5k_A_pct"]:.0f}% of its A-weighted energy in 2-5 kHz (want 25% '
                         'or less; a key is a dark tock): use "soft" or "muted"')
    return rows, warns

# ------------------------------------------------------------------------------------------
# mix: effects only (the earshot kit at level_db)
# ------------------------------------------------------------------------------------------
OCTAVES = [63, 125, 250, 500, 1000, 2000, 4000, 8000]
A_WEIGHT_DB = [-26.2, -16.1, -8.6, -3.2, 0.0, 1.2, 1.0, -1.1]


class BedOnlyKit:
    """--bed-only: a kit with no roles, so the plan places no effect and the edited bed plays alone"""
    lock, roles, cast, source = {}, {}, None, 'none'

    def lookup(self, role):
        return 'missing', role, None

    def notes(self, name):
        return []

    def covers(self, name, target):
        return False

    def pick(self, *args, **kw):
        return None

    def warnings(self, roles=None):
        return []


def render_effects(song, events, stems_dir=None, kit=None, draft=False, cues=None):
    """The effects-only soundtrack: every event through build_sfx, the short rooms, the end fade, the master
    at the film's target (glue on). Returns (master, info, report parts)."""
    n_out = int(round(song.dur * SR))
    n = n_out + 4 * SR
    plan, thinned, runs = plan_typing(song, events)
    B, placed, skipped, missing = build_sfx(song, n, events, plan, thinned, kit, draft, cues)
    fx, hall, ui, keys = B['fx'], B['hall'], B['ui'], B['keys']
    t = np.arange(n) / SR
    # the end fade: the effects (with their rooms) reach digital zero 30 ms before the end, so nothing is
    # still sounding when master.py's last 60 ms fade and zeroed samples arrive
    fade = np.clip((song.dur - 0.03 - t) / song.fade, 0, 1) ** 2
    hold = np.ones(n)
    for a, b, depth, scope in song.silences:
        w_ = (t > a - 0.04) & (t < b)
        hold[w_] = np.minimum(hold[w_], 1 - depth * np.clip((t[w_] - (a - 0.04)) / 0.04, 0, 1))
        r_ = (t >= b) & (t < b + 0.008)  # open again over 8 ms, so tails that resume at the silence's end don't click
        hold[r_] = np.minimum(hold[r_], 1 - depth * (0.5 + 0.5 * np.cos(np.pi * (t[r_] - b) / 0.008)))
    for r in runs:
        r['duck_db'] = 0.0
        r['level_db'] = None
    fx_low = D.filt(fx, D.lp(90, 2))
    fx_dry = D.filt(fx - fx_low * 0.45, D.hp(24, 2)) * 1.25 * song.mix['sfx']
    fxs = D.filt(fx, D.hp(250, 2))
    fx_wet = (D.reverb(fxs * 0.18, 'room') + D.reverb(fxs * 0.08 + hall, 'hall')) * song.mix['sfx']
    # keys, clicks and crisp ticks dry; the clock's tick and tock plus a small room (0.3 s) sent at
    # -22 dB and high-passed at 350 Hz
    dry = ui + keys + B['clicks'] + B['crisp']
    ui_dry = D.filt(dry, D.hp(24, 2)) * 1.25 * song.mix['sfx']
    ui_wet = D.reverb(D.filt(ui, D.hp(350, 2)) * 0.08, 'small') * song.mix['sfx']
    fx_dry = (fx_dry + ui_dry) * fade[:, None]
    fx_wet = (fx_wet + ui_wet) * fade[:, None]
    keys_dry = D.filt(keys, D.hp(24, 2)) * 1.25 * song.mix['sfx'] * fade[:, None]  # for the typing report
    fade_warnings(song, placed)
    mix = (fx_dry + fx_wet) * hold[:, None]
    mix = mix[:n_out]
    y, info = M.finish(mix, song.lufs, song.ceiling, fade=0)
    silent = np.zeros((n_out, 2))
    kit_keys = {p['i']: f"{p['role']}: {kit.roles[p['role']]['sound']}" for p in placed if p['kind'] == 'key' and p.get('sample')}
    trows, twarn = typing_levels(runs, plan, (keys_dry * hold[:, None])[:n_out], silent, kit_keys)
    song.warnings.extend(twarn)
    typing = dict(style=song.typing, styles=sorted({r['style'] for r in runs}), keys=sum(1 for e in events if e['kind'] == 'key'),
                  sounded=len(plan), thinned=len(thinned), duck_db=0.0, runs=trows)
    if stems_dir:
        import soundfile as sf
        os.makedirs(stems_dir, exist_ok=True)
        sf.write(os.path.join(stems_dir, 'sfx.wav'), ((fx_dry + fx_wet) * hold[:, None])[:n_out].astype(np.float32), SR)
        for stale in ('music.wav', 'bed.wav', 'drums.wav', 'bass.wav', 'pad.wav', 'arp.wav', 'bells.wav', 'reverb.wav'):
            if os.path.exists(os.path.join(stems_dir, stale)):
                os.remove(os.path.join(stems_dir, stale))  # older layouts would double-count in tools that sum the stems
    tuned = [dict(f=p['f'], kind=p['kind'], id=p.get('id', ''), note=note_name(p['midi']), in_key=fits(song, p))
             for p in placed if p.get('midi') is not None]
    sounded = []  # the intended sound times (cues_sounded.json): the cue frame, a key's planned time
    seen = set()
    for p in placed:
        if p['i'] < 0 or p['i'] in seen:
            continue
        seen.add(p['i'])
        e = dict(events[p['i']])
        e['cue_f'] = e['f']
        e['f'] = round((plan[p['i']]['t'] if p['kind'] == 'key' and p['i'] in plan else p['t']) * song.fps, 3)
        if p.get('role'):
            e['role'] = p['role']
        sounded.append(e)
    return y, info, dict(placed=placed, skipped=skipped, missing=missing, masked=[], tuned=tuned, typing=typing,
                         sfx_levels={}, sounded=sorted(sounded, key=lambda e: e['f']))


def fits(song, p):
    """in the key, or a tone of the chord sounding at that moment (a V7's leading tone)"""
    ch = song.chord_at(p['t'] + 1e-3)
    pc = int(round(p['midi'])) % 12
    return pc in song.scale or (ch is not None and pc in ch.pcs)


def fade_warnings(song, placed):
    seen = set()
    for p in placed:  # an effect that starts inside the fade is mostly lost: say so
        g_ = float(np.clip((song.dur - 0.03 - p['t']) / song.fade, 0, 1) ** 2)
        if g_ < 0.5 and (p['kind'], p['f']) not in seen:
            seen.add((p['kind'], p['f']))
            song.warnings.append(f"{p['kind']} {p.get('id', '')} at f={p['f']:g} starts inside the end fade "
                                 f"({20 * np.log10(g_ + 1e-9):.0f} dB): move it at least "
                                 f"{int(np.ceil((song.fade + 0.03) * song.fps))} f before the end or shorten master.fade")


# ------------------------------------------------------------------------------------------
# mix: a licensed track + the plan
# ------------------------------------------------------------------------------------------
def load_music(song, base_dir, n):
    """(the staged bed (n, 2) at 48 kHz, edit.json) for a film with a track, (None, None) without one. The edit's
    segments and joins come from track.py build_bed; the bed is staged to STAGE_LUFS, then music.gain_db."""
    if not song.has_music:
        return None, None
    import track as TR
    cfg = song.music_cfg
    edit = None
    root = os.path.dirname(base_dir) if os.path.basename(base_dir) == 'audio' else base_dir  # the project root
    cache = os.path.join(root, 'out', 'cache', 'music')
    if cfg.get('edit'):
        edit = settle_ending(song, read_json(locate(cfg['edit'], base_dir), 'edit'))
        try:
            bed, _ = TR.build_bed(edit, base_dir, n=n, cache_dir=cache)
        except TR.TrackError as e:
            raise ScoreError(str(e)) from None
    else:
        tp = locate(cfg['track'], base_dir)
        if not os.path.isfile(tp):
            raise ScoreError(f'music track not found: {cfg["track"]} (looked in the working directory and next to score.json)')
        try:
            x, _ = TR.decode(tp, cache)
        except TR.TrackError as e:
            raise ScoreError(str(e)) from None
        bed = np.zeros((n, 2))
        D.place(bed, x.astype(np.float64), song.T(cfg.get('at', 0)), 1.0, tail=0.05)
    bed = M.stage(bed, STAGE_LUFS) * 10 ** (float(cfg.get('gain_db') or 0.0) / 20)
    return bed, edit


def settle_ending(song, edit):
    """A hit ending whose bar line comes after the lockup with nothing on it (a template that holds the end card past
    the body's last bar): the lockup stays the film's last hit and the music subtracts under the end card: from the
    lockup the bed plays END_UNDER_DB under its level (plan.py: the lockup's stop-down goes through), and its last
    downbeat on the bar line rings out (ring_bed), never a bed at full level under the end card stopping on nothing.
    The edit on disk is unchanged; ending.under_from_s marks it, and it is reported."""
    end = dict((edit or {}).get('ending') or {})
    lock = (song.cues.get('cue') or {}).get('lockup')
    if end.get('mode') not in ('hit', 'stop') or lock is None or not edit.get('segments'):
        return edit
    lt, t = float(lock) / song.fps, float(end.get('bed_stops_film_s', end.get('hit_film_s', 0.0)))
    bar = 4.0 * float(edit.get('beat_s') or song.beat)
    if not (0.3 <= t - lt <= 2.0 * bar) or any(abs(float(e['f']) / song.fps - t) <= 3.0 / song.fps for e in song.cues.get('events', [])):
        return edit
    end['under_from_s'] = round(lt, 4)
    song.warnings.append(f"the hit ending's bar line ({t:.2f} s) comes {t - lt:.1f} s after the lockup ({lt:.2f} s) with nothing on "
                         "it: from the lockup the bed plays 6 dB under and its last downbeat rings out on the bar line (an "
                         "element on the bar line, or a body that ends on the lockup's bar, ends it cleaner)")
    return dict(edit, ending=end)


def ring_hit(song, edit, placed, sfx):
    """A hit ending (track.py edit --end hit): the element on the bar line where the bed is released rings through
    the hall (2.8 s), so the film ends on a decay of 1.5 s or more, never on the bed stopping. Without an
    element there, a warning names the frame."""
    end = (edit or {}).get('ending') or {}
    if end.get('mode') not in ('hit', 'stop'):
        return None
    t = float(end.get('hit_film_s', end.get('end_s', 0.0)))
    near = [p for p in placed if 'x' in p and abs(p['sync_s'] - t) <= max(0.1, 3 / song.fps)]
    if not near and end.get('under_from_s') is not None:
        return None  # settle_ending said it: the lockup before the bar line is the last hit, the bed rings out
    if not near:
        song.warnings.append(f'the hit ending has no element on its bar line ({t:.2f} s, f={t * song.fps:.0f}): cue one hit or drop '
                             'there (the lockup), or end on the track\'s own ending (track.py edit --end own) or a fade (--end fade)')
        return None
    p = max(near, key=lambda q: q['g'])
    x = p['x'].mean(axis=1) if p['x'].ndim == 2 else p['x']
    x = np.concatenate([x, np.zeros(int(3.0 * SR))])  # room for the hall's tail (reverb keeps the input's length)
    wet = D.filt(D.reverb(x * p['g'] * HIT_RING_SEND, 'hall'), D.hp(250, 2))
    D.place(sfx, wet, p['start'], 1.0, 0.0, tail=0.05)
    p['ring'] = dict(send=HIT_RING_SEND, room='hall')
    return p


BED_RING_SEND = 0.6  # a hit ending: the bed's last downbeat through the hall, so the music itself rings out under the hit


def ring_bed(edit, bed_played, source=None, until_s=None):
    """A hit ending: the bed's last downbeat (its attack and the 0.5 s release under the hit, as the track plays it before
    the lockup's breath: `source`) is sent through the hall (2.8 s) into the bed, so the music's own last chord rings out
    with the lockup instead of stopping under it."""
    source = bed_played if source is None else source
    end = (edit or {}).get('ending') or {}
    if end.get('mode') not in ('hit', 'stop'):
        return None
    t = float(end.get('bed_stops_film_s', end.get('hit_film_s', end.get('end_s', 0.0))))
    rel = float(end.get('release_s', 0.5))
    i0, i1 = max(0, int((t - 0.02) * SR)), min(len(bed_played), int((t + 0.06 + rel) * SR))
    if i1 - i0 < int(0.05 * SR):
        return None
    # the ring lasts to the end card's last frame: a hall of 2.8 s, longer (up to 6 s) when the picture holds longer
    rt = float(np.clip(1.1 * ((until_s or t + 2.8) - t), 2.8, 6.0))
    x = np.concatenate([source[i0:i1].mean(axis=1), np.zeros(int((rt * 1.2 + 0.4) * SR))])
    room = 'hall' if rt <= 2.81 else D.make_ir(rt, 0.025, 5500, 1.0, 3)
    wet = D.filt(D.reverb(x * BED_RING_SEND, room), D.hp(120, 2))
    D.place(bed_played, wet, i0 / SR, 1.0, 0.0, tail=0.3)
    return dict(t=round(t, 3), send=BED_RING_SEND, rt60_s=round(rt, 2))


SALIENT_JUMP_DB, SALIENT_REL_LU = 6.0, -8.0  # earshot's salient hit: a 100 ms block 6 dB over the 200 ms before, near the level
ACCENT_SHARE = 0.30      # the share of the picture's events that should land as hits the ear marks
CLICK_TRACK_SHARE = 0.85  # more than this, evenly spaced: a click track


def salient_hits(y):
    """The times the ear marks as hits (earshot's rule, model-free): a 100 ms K-weighted block (every 20 ms) that rises
    6 dB or more within 80 ms over the quietest block of the 200 ms before and lands within 8 LU of the integrated
    loudness; one hit per run of such blocks, at its biggest rise."""
    tb, L = M.blocks(y, 0.1, 0.02)
    if len(L) < 20:
        return []
    try:
        I = M.integrated(y)
    except ValueError:
        return []
    from numpy.lib.stride_tricks import sliding_window_view as sw
    a, b = 10, 4
    pre = sw(np.concatenate([np.full(a, L[0]), L]), a).min(axis=1)[:len(L)]
    post = sw(np.concatenate([L, np.full(b - 1, L[-1])]), b).max(axis=1)[:len(L)]
    rise = post - pre
    idx = np.flatnonzero((rise >= SALIENT_JUMP_DB) & (post >= I + SALIENT_REL_LU))
    out = []
    for run in (np.split(idx, np.flatnonzero(np.diff(idx) > 2) + 1) if len(idx) else []):
        k = run[int(np.argmax(rise[run]))]
        t = float(tb[k]) - 0.02
        if not out or t - out[-1] > 0.1:
            out.append(t)
    return out


def accent_read(y, events, song, plan=None):
    """How many of the picture's events land as hits the ear marks (a salient hit within 100 ms, as earshot reads a film
    against its picture), which ones, and whether it reads as a click track (nearly every event hit, evenly spaced)."""
    hits = np.array(salient_hits(y))
    evs = [e for e in events if e['f'] / song.fps < song.dur]
    on = [bool(len(hits)) and float(np.min(np.abs(hits - e['f'] / song.fps))) <= 0.1 for e in evs]
    moments = set()
    for s in (plan or {}).get('stopdowns', []):
        if s.get('status') in ('added', 'arrangement'):
            moments.add(round(float(s['t']), 2))
    share = sum(on) / len(evs) if evs else None
    ioi = np.diff(hits) if len(hits) > 2 else np.array([])
    cv = float(np.std(ioi) / np.mean(ioi)) if len(ioi) else None
    rep = dict(events=len(evs), salient=int(sum(on)), share=None if share is None else round(share, 3),
               moments=len(moments), hits=len(hits), hits_per_10s=round(10 * len(hits) / max(song.dur, 1e-6), 2),
               hit_spacing_cv=None if cv is None else round(cv, 2),
               missed=[dict(f=e['f'], kind=e['kind'], id=e.get('id', '')) for e, h in zip(evs, on) if not h
                       and (e.get('structural') or e['kind'] in ('hit', 'drop', 'land') or 'lockup' in str(e.get('id', '')))][:8])
    if share is not None and len(evs) >= 4 and share < ACCENT_SHARE:
        song.warnings.append(f"few events land as hits: {sum(on)} of {len(evs)} ({share:.0%}; want {ACCENT_SHARE:.0%}+): the moments "
                             "(a landing, a seam, the lockup) take a breath of the music before them; give the events that matter "
                             "an action (src/sync.ts) and a weight of 0.45+, or cut the picture on the track's accents")
    if share is not None and share > CLICK_TRACK_SHARE and cv is not None and cv < 0.25:
        song.warnings.append(f'{share:.0%} of the events land as evenly spaced hits (spacing CV {cv:.2f}): a click track; let the '
                             'music carry the lighter ones (lower their weight under 0.45)')
    return rep


def plan_voice(kit, p, song):
    """(samples, start s) of one planned take, as score.py places it: mono unless the role keeps its width or
    the kind travels; the whoosh lead-in faded so it starts no earlier than its move; a tuned take ends by 1.5 s"""
    tk = next(t for t in kit.roles[p['role']]['takes'] if t['file'] == p['take'])
    x = kit.audio(tk)
    keep = p['width'] is not None
    if x.ndim == 2 and not keep:
        x = x.mean(axis=1)
    start = float(p['start_s'])
    if p['kind'] in ('whoosh', 'suck'):
        w = 1.0
        d = float(np.clip(p.get('dur_s') or (0.45 + 0.35 * w), 0.15, 3.0)) if p['kind'] == 'whoosh' else (p.get('dur_s') or 0.35)
        lead = float(p.get('apex') or (0.5 if p['kind'] == 'whoosh' else 0.85)) * d + 2 / song.fps
        cut = int(round((float(p['cue_s']) - lead - start) * SR))
        if cut > 0:
            x, start = fade_head(x, cut), start + cut / SR
    if p.get('trim_s') or p.get('midi') is not None:
        x = tonal_trim(x)
    if x.ndim == 2 and p['width'] == 'travel' and p['pan']:
        x = balance(x, p['pan'])
    return x, start


AIR = dict(floor_db=-28.0, k=0.5, max_db=4.5, shelf_hz=7000.0, presence=(2000.0, 5000.0), presence_db=1.5,
           # the mix's balance: a soundtrack whose 2-8 kHz band sits under -22 dB of the whole, or its 8-16 kHz band under
           # -32, reads as a dull murk (a bright launch mix sits about -11 to -25 and -11 to -31); a track whose own 2-8 kHz
           # band sits under -35 dB is muffled (a low-passed pad: no EQ adds what the file does not hold)
           mix_presence=-22.0, mix_air=-32.0, muffled=-35.0)
FX_LIFT = dict(floor_db=3.0, target_db=4.5, max_db=6.0)


def band_balance(x):
    """The share of a signal's power in four bands against its whole (dB, over the film): low (30-250 Hz), mid
    (250-2k), presence (2-8k), air (8-16k); None when shorter than a second."""
    x = np.asarray(x, np.float64)
    x = x.mean(axis=1) if x.ndim == 2 else x
    seg = 1 << 15
    if len(x) < max(SR, seg):
        return None
    win = np.hanning(seg)
    tot = np.zeros(seg // 2 + 1)
    for i in range(len(x) // seg):
        tot += np.abs(np.fft.rfft(x[i * seg:(i + 1) * seg] * win)) ** 2
    fr = np.fft.rfftfreq(seg, 1.0 / SR)
    allp = float(tot[fr >= 30].sum())
    if allp <= 0:
        return None
    band = lambda lo, hi: round(10 * math.log10(float(tot[(fr >= lo) & (fr < hi)].sum()) / allp + 1e-24), 2)  # noqa: E731
    return dict(low=band(30, 250), mid=band(250, 2000), presence=band(2000, 8000), air=band(8000, 16000))


def open_bars_hint(edit, base_dir='.'):
    """Where the track opens up (its bars with a full spectrum: the centroid over 700 Hz and 0.4 of its 75th percentile
    bar), as an instruction for the edit: 'fit the edit on its open bars 17-32, 41-45 (track.py edit --start-bar 17 ...)'."""
    try:
        a = json.load(open(locate((edit or {}).get('analysis'), base_dir), encoding='utf-8'))
        cen = np.array([float(b.get('centroid') or 0.0) for b in a['bars']])
        lim = min(700.0, 0.4 * float(np.percentile(cen, 75)))
        runs, st = [], None
        for i, c in enumerate(list(cen) + [0.0]):
            if c >= lim and st is None:
                st = i
            if c < lim and st is not None:
                runs.append((st + 1, i))
                st = None
        runs = [r for r in runs if r[1] - r[0] >= 1]
        if not runs:
            return 'the whole track is muffled'
        ranges = ', '.join(f'{x}-{y}' for x, y in runs[:4])
        return f'fit the edit on the bars where the track opens up ({ranges}: track.py edit --start-bar {runs[0][0]} or --entry {runs[0][0]})'
    except (OSError, ValueError, KeyError, TypeError):
        return 'fit the edit on the bars where the track opens up (track.py edit --start-bar)'


def air_bed(bed):
    """A dull bed with air and presence back (a parallel high-pass blend: a smooth shelf, no ringing), or the bed as it
    is: (bed, info)."""
    b = band_balance(bed)
    info = dict(bed=b, shelf_db=0.0, presence_db=0.0)
    if b is None or b['air'] >= AIR['floor_db']:
        return bed, info
    g = min(AIR['max_db'], AIR['k'] * (AIR['floor_db'] - b['air']))
    y = bed + (10 ** (g / 20) - 1) * D.filt(bed, D.hp(AIR['shelf_hz'], 2))
    y = y + (10 ** (AIR['presence_db'] / 20) - 1) * D.filt(bed, D.bp(AIR['presence'][0], AIR['presence'][1], 2))
    info.update(shelf_db=round(g, 2), presence_db=AIR['presence_db'])
    return y, info


def fx_lift(bed_played, placed, n):
    """How far to raise the effects bus (dB, 0 when they already read): the median of the effects' loudest 50 ms with
    the bed over the bed alone, keys left out; under FX_LIFT floor_db the take level that reads target_db over a
    steady bed, at most max_db."""
    import mixkeys as MK
    mix_over, take_over = [], []
    for p in placed:
        if p.get('kind') == 'key' or 'x' not in p or 'g' not in p or 'start' not in p:
            continue
        lvs = effect_levels(bed_played, p, n)
        if lvs is None:
            continue
        try:
            lv = MK.bed_level(bed_played, p.get('sync_s', p.get('t', 0.0)))
        except MK.BedError:
            lv = None
        if lv is None:
            continue
        mix_over.append(lvs['mix'] - lv)
        take_over.append(lvs['take'] - lv)
    if len(mix_over) < 3:
        return 0.0, None
    med = float(np.median(mix_over))
    if med >= FX_LIFT['floor_db']:
        return 0.0, round(med, 2)
    want_take = 10 * math.log10(10 ** (FX_LIFT['target_db'] / 10) - 1)
    return round(float(np.clip(want_take - float(np.median(take_over)), 0.0, FX_LIFT['max_db'])), 2), round(med, 2)


def render_music(song, events, cues, kit, bed, edit, stems_dir=None, draft=False, plan_path=None, base_dir='.'):
    """The music-led soundtrack: the plan (plan.py, in-process) rendered over the staged bed as played."""
    import plan as PL
    n_out = int(round(song.dur * SR))
    n = len(bed)
    plan = PL.make(cues, song, kit, bed, edit, draft)
    if plan_path:
        PL.write_json(plan_path, plan)
        PL.write_json(os.path.join(os.path.dirname(os.path.abspath(plan_path)), 'cues_sounded.json'), PL.sounded_cues(cues, plan))
    active = [s for s in plan['stopdowns'] if s.get('status') in ('added', 'arrangement')]
    auto = PL.ride_envelope(song, n) * PL.stop_envelope(n, active) * PL.hold_envelope(song, n) * PL.end_fade(song, n)
    bed, air = air_bed(bed)  # a dull pad gets its air and presence back (the hits cut through it)
    bed_played = bed * auto[:, None] * song.mix['music']
    bed_ring = ring_bed(edit, bed_played, bed * (PL.ride_envelope(song, n) * PL.hold_envelope(song, n))[:, None] * song.mix['music'],
                        until_s=song.dur)
    sfx = np.zeros((n, 2))
    placed = []
    for p in plan['events']:
        x, start = plan_voice(kit, p, song)
        g = 10 ** (p['gain_db'] / 20)
        if x.ndim == 1:  # a mono take plays as dual mono at unity (the level model's own measure), balanced off centre
            x = np.stack([x, x], axis=1)
            if p['pan']:
                x = balance(x, p['pan'])
        D.place(sfx, x, start, g, 0.0)
        placed.append(dict(i=p['i'], f=p['f'], kind=p['kind'], id=p['id'], t=p['cue_s'], start=start, x=x, g=g, pan=p['pan'],
                           midi=p.get('midi'), sample=p['take'], role=p['role'], sync_s=p['sync_s'], plan=p))
    skipped = [dict(i=s['i'], f=s['f'], kind=s['kind'], role=s.get('role'), why=f"{s['status']}: {s.get('why')}")
               for s in plan['silent']]
    missing = [dict(m) for m in plan['missing']]
    if draft and missing:  # placeholder voices for the cues the kit cannot sound (never delivered)
        sub = [events[m['i']] for m in missing if m['i'] >= 0]
        tp, th, _ = plan_typing(song, sub)
        Bd, pd, _, _ = build_sfx(song, n, sub, tp, th, None, True, cues)
        sfx += sum(Bd[k] for k in ('fx', 'ui', 'keys', 'clicks', 'crisp')) * 1.25
        placed += pd
    ring_hit(song, edit, placed, sfx)
    sfx = D.filt(sfx, D.hp(30, 2)) * (PL.hold_envelope(song, n) * PL.end_fade(song, n))[:, None] * song.mix['sfx']
    fade_warnings(song, placed)
    lift, fx_med = fx_lift(bed_played, placed, n)
    if lift > 0:  # the effects under the music: the bus rises until their hits read over it
        kf = 10 ** (lift / 20)
        sfx = sfx * kf
        for p in placed:
            if 'g' in p:
                p['g'] *= kf
        song.warnings.append(f'the effects sat {fx_med:+.1f} dB over the bed on the median (under {FX_LIFT["floor_db"]:g}: the hits lost in the music); '
                             f'the effects bus rose {lift:+.1f} dB. Give the moments that matter a weight of 0.45+ in src/sync.ts and pick a bed '
                             'that leaves them room (a dull pad masks a click)')
    if air.get('shelf_db'):
        song.warnings.append(f"the bed is dull (its 8-16 kHz band {air['bed']['air']:g} dB under the whole, want above {AIR['floor_db']:g}): "
                             f"+{air['shelf_db']:g} dB of air above {AIR['shelf_hz'] / 1000:g} kHz and +{air['presence_db']:g} dB of presence on it; "
                             'a brighter track needs none')
    mix = (bed_played + sfx)[:n_out]
    air['mix'] = band_balance(mix)
    y, info = M.finish(mix, song.lufs, song.ceiling, fade=0, glue=False)
    if stems_dir:
        import soundfile as sf
        os.makedirs(stems_dir, exist_ok=True)
        sf.write(os.path.join(stems_dir, 'bed.wav'), bed_played[:n_out].astype(np.float32), SR)
        sf.write(os.path.join(stems_dir, 'sfx.wav'), sfx[:n_out].astype(np.float32), SR)
        for stale in ('music.wav', 'drums.wav', 'bass.wav', 'pad.wav', 'arp.wav', 'bells.wav', 'reverb.wav'):
            if os.path.exists(os.path.join(stems_dir, stale)):
                os.remove(os.path.join(stems_dir, stale))
    tuned = [dict(f=p['f'], kind=p['kind'], id=p.get('id', ''), note=note_name(p['midi']), in_key=fits(song, p))
             for p in placed if p.get('midi') is not None]
    gates = music_gates(song, plan, bed, bed_played, sfx, auto, edit, base_dir, placed)
    bb, mb = air.get('bed'), air.get('mix')
    if bb and bb['presence'] < AIR['muffled']:
        gates['fails'].append(f"the bed is muffled: its 2-8 kHz band sits {bb['presence']:g} dB under the whole (under {AIR['muffled']:g}: a low-passed "
                              'pad or a filtered intro that masks every click and reads as a murk; no EQ adds what the file does not hold): '
                              + open_bars_hint(edit, base_dir) + ', or pick a brighter track (music.mjs search or pick), then mix again')
    elif mb and (mb['presence'] < AIR['mix_presence'] or mb['air'] < AIR['mix_air']):
        gates['warnings'].append(f"the mix is dull: 2-8 kHz {mb['presence']:g} dB and 8-16 kHz {mb['air']:g} dB under the whole (want over "
                                 f"{AIR['mix_presence']:g} and {AIR['mix_air']:g}): a brighter track, or effects with attack and air (clicks, ticks, "
                                 'glass) on the moments that matter')
    masked, read = [], 0
    lock_f = (cues.get('cue') or {}).get('lockup')
    for p in placed:
        if p['kind'] in ('key', 'drop') or 'start' not in p:
            continue
        thr = 3.0 if (p.get('plan') or {}).get('bed_db') is not None and p['plan']['bed_db'] <= 4 else 6.0
        x = D.stereo(p['x']) * p['g']
        i0, i1 = max(0, int(p['start'] * SR)), min(n_out, int(p['start'] * SR) + len(x))
        if i1 - i0 < 256:
            continue
        read += 1
        r = band_snr(x[:i1 - i0], bed_played[i0:i1])
        if r is not None and r[1] < thr:
            # a hero sound: the payoff, the lockup or a structural event (an act change, the reveal, the ending)
            e = events[p['i']] if isinstance(p.get('i'), int) and 0 <= p['i'] < len(events) else {}
            hero = ('the payoff' if song.payoff is not None and abs(p['t'] - song.payoff) <= 3 / song.fps else
                    'the lockup' if lock_f is not None and abs(p['f'] - lock_f) <= 3 else
                    'a structural event' if e.get('structural') else None)
            masked.append(dict(f=p['f'], kind=p['kind'], id=p.get('id', ''), band_hz=r[0], snr_db=round(r[1], 1), margin_db=thr,
                               role=p.get('role'), hero=hero))
    return y, info, dict(placed=placed, skipped=skipped, missing=missing, masked=masked, masked_read=read, tuned=tuned,
                         typing=None, sfx_levels={}, plan=plan, gates=gates, bed_ring=bed_ring,
                         lift=dict(fx_db=lift, fx_median_db=fx_med, **air))


def effect_levels(bed_played, p, n):
    """An effect's own loudest 50 ms measured three ways (LUFS scale), or None when the effect is shorter than
    50 ms or outside the bed:
      mix   the bed plus this one effect (no other effect) over that window: what bed_db sets on a steady bed
            ("the mix's loudest 50 ms at the effect")
      bed   the bed alone over the same window: its own accent there (a kick under an on-beat cue reads several
            dB over the bed's median, and the mix with it)
      take  the take alone at its gain: what the kit's gain places (the bed's level + over_bed(bed_db))"""
    import mixkeys as MK
    x = D.stereo(p['x']) * p['g']
    s0 = int(round(p['start'] * SR))
    if s0 < 0:
        x, s0 = x[-s0:], 0
    if len(x) < MK.L_WIN or s0 >= n:
        return None
    kx = MK.kpower(x)
    c = np.concatenate([[0.0], np.cumsum(kx)])
    win = c[MK.L_WIN:] - c[:-MK.L_WIN]
    j = int(np.argmax(win))
    w0 = s0 + j
    if w0 + MK.L_WIN > n:
        return None
    a = max(0, w0 - int(0.2 * SR))  # 200 ms of lead so the K-weighting filters have settled
    bseg = bed_played[a:w0 + MK.L_WIN]
    seg = bseg.copy()
    lo = max(s0, a)
    seg[lo - a:] += x[lo - s0:lo - s0 + (len(seg) - (lo - a))]
    kp = MK.kpower(seg)
    kb = MK.kpower(bseg)
    return dict(mix=float(-0.691 + 10 * np.log10(kp[w0 - a:w0 - a + MK.L_WIN].mean() + 1e-24)),
                bed=float(-0.691 + 10 * np.log10(kb[w0 - a:w0 - a + MK.L_WIN].mean() + 1e-24)),
                take=float(-0.691 + 10 * np.log10(win[j] / MK.L_WIN + 1e-24)))


def effect_over_bed_window(bed_played, p, n):
    """LUFS of the bed plus this one effect (no other effect) over the effect's own loudest 50 ms: what bed_db
    sets ("the mix's loudest 50 ms at the effect"); None when the effect is shorter than 50 ms or outside"""
    lv = effect_levels(bed_played, p, n)
    return None if lv is None else lv['mix']


def take_want_db(bed_db, weight_db=0.0):
    """The take alone over the bed for a mix bed_db over a steady bed (mixkeys.over_bed), plus the cue's weight
    (plan.py's weight_db: a weighted cue is meant louder); None for bed_db <= 0"""
    import mixkeys as MK
    return MK.over_bed(bed_db) + float(weight_db or 0.0) if bed_db is not None and bed_db > 0 else None


def steady_db(take_db):
    """The mix over a steady bed that a take take_db over the bed makes (the inverse of over_bed)"""
    return float(10 * np.log10(1.0 + 10 ** (take_db / 10)))


def music_gates(song, plan, bed, bed_played, sfx, auto, edit, base_dir, placed):
    """Gates 8-10 and 13 on the stems: over_bed, stop_downs, no_duck, joins (and the report's music block)."""
    import mixkeys as MK
    import plan as PL
    out = dict(fails=[], warnings=[])
    n = len(bed)
    active = [s for s in plan['stopdowns'] if s.get('status') in ('added', 'arrangement')]
    # 8. over the bed, measured over the effect's loudest 50 ms against the bed level it was levelled against:
    # the mix (bed + this effect: measured_db, error_db, as bed_db reads on a steady bed), the bed alone in that
    # window (bed_accent_db: the track's own accent under the cue) and the take alone (take_db against
    # take_want_db = over_bed(bed_db) + the cue's weight_db). The warnings judge the take alone: on a beat the bed's
    # own kick lifts the mix reading by several dB while the take sits where the kit puts it, and turning it down
    # would be wrong. Typed keys vary press by press on purpose (the typing dynamics): judged by their role median.
    rows, by_role = [], {}
    for p in placed:
        pl = p.get('plan')
        if not pl or pl.get('bed_lufs') is None or pl.get('bed_db') is None:
            continue
        lvs = effect_levels(bed_played, p, n)
        if lvs is None:
            continue
        own = next((k for k, s in enumerate(active) if s['for'].endswith(f":{pl['id'] or pl['i']}") and abs(s['t'] - pl['sync_s']) < 1e-3), None)
        ref = bed_played if own is None else bed * (PL.ride_envelope(song, n) * PL.stop_envelope(n, active, own)
                                                     * PL.hold_envelope(song, n) * PL.end_fade(song, n))[:, None] * song.mix['music']
        try:
            lv = MK.bed_level(ref, pl['sync_s'])
        except MK.BedError:
            lv = None
        if lv is None:
            continue
        over = round(lvs['mix'] - lv, 2)
        take = round(lvs['take'] - lv, 2)
        wdb = float(pl.get('weight_db') or 0.0)
        want = take_want_db(pl['bed_db'], wdb)
        row = dict(id=pl['id'], role=pl['role'], t=pl['sync_s'], bed_db=pl['bed_db'], measured_db=over,
                   error_db=round(over - pl['bed_db'], 2), clamped=pl['clamped'], weight_db=round(wdb, 2), take_db=take,
                   take_want_db=None if want is None else round(want, 2),
                   take_error_db=None if want is None else round(take - want, 2),
                   steady_db=round(steady_db(take), 2), bed_accent_db=round(lvs['bed'] - lv, 2))
        row['judged_db'] = row['take_error_db'] if row['take_error_db'] is not None else row['error_db']
        rows.append(row)
        by_role.setdefault(pl['role'], []).append(row)
    roles = {}
    for r_, rr in sorted(by_role.items()):
        bdb = rr[0]['bed_db']
        q = np.percentile([x['measured_db'] for x in rr], [25, 50, 75])
        tq = float(np.median([x['take_db'] for x in rr]))
        wants = [x['take_want_db'] for x in rr if x['take_want_db'] is not None]
        want = float(np.median(wants)) if wants else None
        jm = float(np.median([x['judged_db'] for x in rr]))
        roles[r_] = dict(bed_db=bdb, n=len(rr), median=round(float(q[1]), 2), iqr=[round(float(q[0]), 2), round(float(q[2]), 2)],
                         take_median=round(tq, 2), take_want=None if want is None else round(want, 2),
                         steady_median=round(float(np.median([x['steady_db'] for x in rr])), 2),
                         bed_accent_median=round(float(np.median([x['bed_accent_db'] for x in rr])), 2))
        if abs(jm) > OVER_BED_TOL:
            nclamp = sum(1 for x in rr if x['clamped'])
            out['warnings'].append(f'{r_}: the takes sit {jm:+.1f} dB off their level over the bed (take alone {tq:.1f} dB over '
                                   f'it, want {want if want is None else round(want, 1)} for bed_db {bdb:g}, +-{OVER_BED_TOL:g})'
                                   + (f'; {nclamp} of {len(rr)} take(s) held at the -1 dBFS peak, so a higher bed_db cannot lift them'
                                      if nclamp else '')
                                   + "; with a track the role's bed_db in audio/kit.json sets it (level_db is the effects-only level)")
    off = [r for r in rows if abs(r['judged_db']) > OVER_BED_TOL and r['role'].split('.')[0] != 'key']
    for r in off[:6]:
        out['warnings'].append(f"{r['role']} {r['id']} at {r['t']:.2f} s: the take alone sits {r['take_db']:+.1f} dB over the bed "
                               f"(want {r['take_want_db']} for bed_db {r['bed_db']:g}"
                               + (f" and weight {r['weight_db']:+.1f} dB" if r['weight_db'] else '')
                               + f"; with the bed {r['measured_db']:+.1f} dB, its own "
                               f"accent there {r['bed_accent_db']:+.1f} dB)" + (' (clamped by the -1 dBFS ceiling)' if r['clamped'] else ''))
    med = float(np.median([r['measured_db'] for r in rows])) if rows else None
    smed = float(np.median([r['steady_db'] for r in rows])) if rows else None
    out['over_bed'] = dict(effects=rows, roles=roles, median=None if med is None else round(med, 2),
                           within_tol=sum(1 for r in rows if abs(r['error_db']) <= OVER_BED_TOL), count=len(rows),
                           steady_median=None if smed is None else round(smed, 2),
                           take_within_tol=sum(1 for r in rows if abs(r['judged_db']) <= OVER_BED_TOL),
                           judged='the take alone over the bed against over_bed(bed_db) + weight_db, +-%g dB (typed keys '
                                  'by their role median)' % OVER_BED_TOL)
    if smed is not None and not 3.0 <= smed <= 10.0:
        out['warnings'].append(f'the effects sit {smed:.1f} dB over the bed overall, as on a steady bed (house range 3-10)')
    # 9. stop-downs, measured on the bed stem
    sd_rows = []
    payoff = song.payoff
    for s in plan['stopdowns']:
        if s.get('status') not in ('added', 'arrangement'):
            sd_rows.append(dict(s))
            continue
        t = s['t']
        bt, lv = MK.block_levels(bed_played[max(0, int((t - 1.5) * SR)):min(n, int((t + 0.3) * SR))])
        tt = bt + max(0.0, t - 1.5)
        pre = lv[(tt >= t - 1.5) & (tt < t - 0.5)]
        win = lv[(tt >= max(t - 0.5, float(s.get('from', t - 0.5)))) & (tt < t)]  # the stop-down's own span (a moment's breath is shorter)
        aft = lv[(tt >= t) & (tt < t + 0.25)]
        dip = float(np.median(pre) - np.percentile(win, 25)) if len(pre) and len(win) else 0.0
        back = float(np.median(pre) - np.median(aft)) if len(pre) and len(aft) else 0.0
        ok = dip >= STOP_MIN_DIP_DB - 0.25
        returned = back <= STOP_RETURN_DB or bool(s.get('through'))
        row = dict(s, measured_dip_db=round(dip, 2), back_within_db=round(back, 2), ok=bool(ok), returned=bool(returned))
        sd_rows.append(row)
        at_payoff = payoff is not None and abs(t - payoff) <= 3 / song.fps
        if not ok:
            msg = (f"the stop-down before {s['for']} at {t:.2f} s measures {dip:.1f} dB (want >= {STOP_MIN_DIP_DB:g}): its depth is "
                   "6 + 4 x (weight - 0.5) dB within the kit's mix.stop_down depth_db, so raise the event's weight in src/sync.ts "
                   f"(or skip it, stopdowns.skip [\"{s.get('id', '')}\"], and add {{\"at\": {t:.2f}, \"weight\": 1.5}} to stopdowns.add); "
                   "stopdowns.quiet_db is the level of an effect with no bed under it, not a depth")
            (out['fails'] if at_payoff else out['warnings']).append(msg)
        if not returned:
            out['warnings'].append(f"the bed is {back:.1f} dB down 250 ms after {s['for']} at {t:.2f} s (want back within "
                                   f"{STOP_RETURN_DB:g}, unless the track breaks there)")
    out['stop_downs'] = sd_rows
    # 10. no ducking: the automation is 0 dB outside the stop-downs, silences and the end fade; and the bed's
    # gain never dips under a bright effect. The arc ride (plan.py: the opening and the body's dips, slewed by the bar,
    # whatever the effects do) is the arrangement's level, not a duck: it is read apart
    auto = auto / PL.ride_envelope(song, n)
    t = np.arange(n) / SR
    allowed = np.zeros(n, bool)
    for s in active:
        allowed |= (t >= s['from'] - 0.001) & ((t <= s['t'] + 0.001) | bool(s.get('through')))
    for a, b, _, _ in song.silences:
        allowed |= (t >= a - 0.05) & (t <= b + 0.01)
    allowed |= t >= song.dur - 0.03 - song.fade
    dev = np.abs(20 * np.log10(np.maximum(auto, 1e-9)))[~allowed]
    worst = float(dev.max()) if dev.size else 0.0
    bright = [p for p in placed if p['kind'] in ('tick', 'click', 'key', 'snap', 'pop', 'text', 'bell')]
    under = []
    for p in bright:
        i = int(p['sync_s'] * SR) if p.get('sync_s') is not None else int(p['t'] * SR)
        a = auto[max(0, i - SR):i]
        b = auto[i:min(n, i + int(0.1 * SR))]
        if len(a) and len(b):
            d = 20 * np.log10(max(float(np.mean(b)), 1e-9) / max(float(np.mean(a)), 1e-9))
            if d < -1.0 and not allowed[min(n - 1, i)]:
                under.append(dict(id=p.get('id'), t=round(p['t'], 3), dip_db=round(d, 2)))
    out['no_duck'] = dict(automation_max_db=round(worst, 3), under_bright=under, ok=worst <= 0.01 and not under)
    if not out['no_duck']['ok']:
        out['fails'].append(f'the bed is ducked: {worst:.2f} dB of automation outside the stop-downs, silences and the end'
                            + (f'; {len(under)} dip(s) under bright effects' if under else ''))
    # 13. joins
    if edit and edit.get('joins'):
        import track as TR
        src = None
        try:
            root = os.path.dirname(base_dir) if os.path.basename(base_dir) == 'audio' else base_dir
            x, _ = TR.decode(TR.locate(edit['track'], base_dir), os.path.join(root, 'out', 'cache', 'music'))
            src = x.mean(axis=1).astype(np.float64)
        except TR.TrackError:
            pass
        rows_j = TR.join_report(bed, edit, src)
        out['joins'] = rows_j
        for j in rows_j:
            out['fails'] += [f"join at {j['film_s']:.3f} s: {p_}" for p_ in j['problems']]
    else:
        out['joins'] = []
    return out


def locate(path, base_dir):
    """A path from score.json: as written (the project root), else next to score.json, else in its parent."""
    for p in (path, os.path.join(base_dir, path), os.path.join(os.path.dirname(base_dir), path)):
        if os.path.exists(p):
            return p
    return path

def sfx_report(song, kinfo, kit, ev, draft=False):
    """Where every effect came from: the kit's roles (sound, cues, takes used), the cues of roles the kit leaves off,
    the cues no take sounds (missing), the placeholder voices of a --draft render. Adds the kit's audit warnings for
    the roles the film plays (a rising pitch glide, stacked attacks)."""
    roles, drafted, off = {}, {}, {}
    for p in ev['placed']:
        if p.get('sample'):
            r = roles.setdefault(p['role'], dict(sound=kit.roles[p['role']]['sound'], cues=set(), takes=set()))
            r['cues'].add(p['i'])
            r['takes'].add(p['sample'])
        else:
            drafted.setdefault(p['kind'], set()).add(p['i'])
    for s_ in ev['skipped']:
        if s_.get('role') and 'off' in str(s_.get('why', '')):
            off[s_['role']] = off.get(s_['role'], 0) + 1
    if off:
        song.warnings.append('cues the kit leaves off (skipped): ' + ', '.join(f'{r} x{n}' for r, n in off.items())
                             + '. By design for riser, swell and suck in the calm kits (a reveal resolves on one element); '
                             'give the role a sound in audio/kit.json if the picture needs it')
    if kit is not None:
        for role, sound, codes in kit.warnings(set(roles)):
            if 'rising_glide' in codes:
                song.warnings.append(f'kit role {role} ({sound}) rises in pitch (earshot audit: rising_glide): a rising '
                                     'whip reads as cheap; pick another sound for it in audio/kit.json')
            if {'stacked', 'pre_swell'} & set(codes):
                song.warnings.append(f'kit role {role} ({sound}) stacks attacks or builds before its hit (earshot audit: '
                                     f'{", ".join(c for c in codes if c in ("stacked", "pre_swell"))}): use one clean hit')
            rest = [c for c in codes if c not in ('rising_glide', 'stacked', 'pre_swell')]
            if rest:
                song.warnings.append(f'kit role {role} ({sound}): earshot audit warnings {", ".join(rest)} '
                                     '(python3 scripts/audio/kit.py check)')
    src = kinfo['source']
    if draft and drafted:
        src = f'{src} + draft voices'
    return dict(engine=song.engine, source=src, kit=kinfo['kit'].replace(os.sep, '/'),
                takes=kinfo['takes'].replace(os.sep, '/'), name=kinfo.get('name'), bank=kinfo.get('bank'),
                earshot=kinfo.get('earshot_version'), notes=kinfo['notes'],
                kit_cues=len({i for r in roles.values() for i in r['cues']}),
                roles={k: dict(sound=v['sound'], cues=len(v['cues']), takes=sorted(v['takes']),
                               lufs_spread=kit.roles[k].get('lufs_spread', 0.0),
                               trim_db=sorted({t.get('trim_db', 0.0) for t in kit.roles[k]['takes'] if t['file'] in v['takes']}))
                       for k, v in sorted(roles.items())},
                off=off, missing=len(ev['missing']), draft_voices={k: len(v) for k, v in sorted(drafted.items())})


def stack_guard(song, placed, events, cues):
    """Stacked gestures, as warnings and report rows {t, f, at, layers, lead_ins}. At the payoff and the "lockup"
    cue: a second sound within +-STACK_F frames (the progress resolve counts), or a lead-in that runs into it (a
    whoosh, riser, swell or suck from up to 0.75 s before, still sounding 0.1 s before the moment). A reveal
    resolves on ONE clean element after a stop-down. Anywhere else: 2+ heavy sounds (hit, drop, snap, a heavy
    landing) or 3+ kinds starting within +-STACK_F frames. Typing is a texture: not counted."""
    win = STACK_F / song.fps
    evs, seen = [], set()
    for p in placed:
        if p['kind'] == 'key' or (p['i'], p.get('variant')) in seen:
            continue
        seen.add((p['i'], p.get('variant')))
        e = events[p['i']] if p['i'] >= 0 else dict(kind=p['kind'], weight=1.0)
        role = K.role_for(e['kind'], e.get('variant'), float(e.get('weight', 1.0)),
                          float(e['dur']) / song.fps if 'dur' in e else None)
        evs.append(dict(p, heavy=role in HEAVY_ROLES, label=f"{p['kind']} {p.get('id') or ''}".strip()))
    moments = []
    if song.payoff is not None:
        moments.append([song.payoff, 'payoff'])
    if 'lockup' in cues.get('cue', {}):
        t = cues['cue']['lockup'] / song.fps
        same = [m for m in moments if abs(m[0] - t) <= win]
        if same:
            same[0][1] = 'lockup'
        else:
            moments.append([t, 'lockup'])
    out = []
    for m_t, at in moments:
        layers = [e['label'] for e in evs if abs(e['t'] - m_t) <= win and e['kind'] not in LEAD_IN]
        leads = [e['label'] for e in evs if e['kind'] in LEAD_IN and m_t - 0.75 <= e['t'] <= m_t + win
                 and e['start'] + len(e['x']) / SR >= m_t - 0.1]
        if len(layers) + len(leads) >= 2:
            out.append(dict(t=round(m_t, 3), f=round(m_t * song.fps, 2), at=at, layers=layers, lead_ins=leads))
            song.warnings.append(f'stacked {at} at {m_t:.2f}s: {", ".join(layers + leads)}. A reveal resolves on ONE clean '
                                 'element after a stop-down (0.2-0.7 s of near-silence): keep one, cut the rest')
    done = set()
    for e in sorted(evs, key=lambda e: e['t']):
        if any(abs(e['t'] - m[0]) <= win for m in moments):
            continue
        near = [q for q in evs if abs(q['t'] - e['t']) <= win]
        key = tuple(sorted((q['i'], q.get('variant') or '') for q in near))
        if key in done:
            continue
        if sum(q['heavy'] for q in near) >= 2 or len({q['kind'] for q in near}) >= 3:
            done.add(key)
            out.append(dict(t=round(e['t'], 3), f=round(e['f'], 2), at='', layers=[q['label'] for q in near], lead_ins=[]))
            song.warnings.append(f'stacked effects at {e["t"]:.2f}s (f={e["f"]:g}): {", ".join(q["label"] for q in near)}: '
                                 'one sound per visible event')
    return out


def lockup_after_stop(song, plan, y, rep):
    """The one element after a stop ending: its peak in the master (-9 to -6 dBFS) and its momentary maximum at
    least 2 LU under the payoff's. Returns the report row (None without a stop ending)."""
    if not plan or (plan.get('bed') or {}).get('ending') != 'stop':
        return None
    stop = next((s for s in plan['stopdowns'] if s.get('status') == 'ending'), None)
    after = [p for p in plan['events'] if stop is not None and p['sync_s'] >= stop['t'] - 0.05] or \
            [p for p in plan['events'] if p['level'].startswith('no bed')][-1:]
    if not after:
        return None
    p = after[0]
    i0 = max(0, int(p['start_s'] * SR))
    i1 = min(len(y), i0 + int(1.0 * SR))
    if i1 <= i0:
        return None
    peak = float(20 * np.log10(np.abs(y[i0:i1]).max() + 1e-12))
    tm, mom = M.blocks(y, 0.4, 0.1)
    w_ = (tm >= p['sync_s'] - 0.2) & (tm <= p['sync_s'] + 0.8)
    mmax = float(mom[w_].max()) if w_.any() else None
    pay = (rep.get('payoff') or {}).get('momentary_max')
    if (rep.get('payoff') or {}).get('after_stop') or (song.payoff is not None and song.payoff >= p['sync_s'] - 3 / song.fps):
        pay = None  # the payoff is this element: compared with itself it would read 0 LU under
    row = dict(id=p['id'], role=p['role'], t=p['sync_s'], peak_dbfs=round(peak, 2), momentary_max=None if mmax is None else round(mmax, 2),
               under_payoff_lu=None if (mmax is None or pay is None) else round(pay - mmax, 2), quiet_db=plan['bed']['quiet_db'])
    want = sum(LOCKUP_PEAK) / 2
    if not LOCKUP_PEAK[0] <= peak <= LOCKUP_PEAK[1]:
        row['try_quiet_db'] = round(plan['bed']['quiet_db'] + (want - peak), 1)
        song.warnings.append(f"the lockup element after the stop peaks at {peak:.1f} dBFS (want {LOCKUP_PEAK[0]:g} to {LOCKUP_PEAK[1]:g}): "
                             f"try stopdowns.quiet_db {row['try_quiet_db']:g}")
    if row['under_payoff_lu'] is not None and row['under_payoff_lu'] < LOCKUP_UNDER_PAYOFF:
        song.warnings.append(f"the lockup element is only {row['under_payoff_lu']:.1f} LU under the payoff (want "
                             f"{LOCKUP_UNDER_PAYOFF:g}+): lower stopdowns.quiet_db")
    return row


def main(argv=None):
    ap = argparse.ArgumentParser(description='Render the soundtrack from score.json + cues.json (+ the licensed track and '
                                             'the effects plan), mixed and mastered.')
    ap.add_argument('--cues', default='out/cues.json')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--out', default='public/audio/soundtrack.wav')
    ap.add_argument('--stems', metavar='DIR', help='also write stems here; they sum to the pre-master mix')
    ap.add_argument('--json', metavar='PATH', help='write the report JSON here')
    ap.add_argument('--plan', metavar='PATH', help='with a track: also write the effects plan here (and cues_sounded.json '
                    'beside it); default out/qa/sfx_plan.json when --json is in out/qa')
    ap.add_argument('--lufs', type=float, help='target LUFS; overrides master.lufs from score.json (default -14 with '
                    'music, -16 for a sting of 8 s or less with music, -18 for an effects-only film)')
    ap.add_argument('--ceiling', type=float, help='override master.ceiling (linear)')
    ap.add_argument('--max-tp', type=float, default=-1.5, help='gate: max true peak dBTP (default -1.5)')
    ap.add_argument('--tol', type=float, default=0.5, help='gate: LUFS tolerance (default 0.5)')
    ap.add_argument('--draft', action='store_true', help='play placeholder voices for cues the kit cannot sound; the '
                    'report says "draft": true and the build is never delivered')
    ap.add_argument('--bed-only', action='store_true', help="a film with a track: render the edited track alone (as the "
                    "film plays it, bar 1 at the edit's film_t0), staged and mastered, with no effects; never a hand cut")
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args(argv)
    try:
        score = read_json(a.score, 'score')
        cues = read_json(a.cues, 'cues') if (os.path.isfile(a.cues) or not a.bed_only) else bed_cues(score, a.score)
        song = Song(score, cues)
        if a.lufs is not None:
            song.lufs, song.lufs_from = a.lufs, '--lufs'
        if a.ceiling is not None:
            song.ceiling = a.ceiling
        events = sorted(cues.get('events', []), key=lambda e: e['f'])
        base_dir = os.path.dirname(os.path.abspath(a.score))
        if a.bed_only:
            if not song.has_music:
                raise ScoreError('--bed-only renders the edited track alone: audio/score.json names no music track')
            if a.draft:
                raise ScoreError('--bed-only and --draft: choose one (the bed alone, or placeholder voices over it)')
            kit, kinfo = BedOnlyKit(), dict(engine='none', source='none: --bed-only (the edited track alone, no effects)',
                                            kit=song.kit_path, takes='', notes=[], warnings=[])
            events, cues = [], dict(cues, events=[])
            song.warnings.append('--bed-only: the edited track alone, no effects (the actions stay silent until the kit is '
                                 'rendered: npm run sound)')
        elif song.engine == 'synth' and not a.draft:
            raise ScoreError('sfx.engine "synth" plays placeholder voices: that is a --draft build only (never delivered). '
                             'Render the earshot kit (npm run kit) and use "engine": "auto"')
        if not a.bed_only:
            kit, kinfo = (None, dict(engine='synth', source='draft voices (sfx.engine synth)', kit=song.kit_path,
                                     takes=song.kit_takes or '', notes=[], warnings=[])) if song.engine == 'synth' else \
                K.resolve(song.engine, locate(song.kit_path, base_dir), locate(song.kit_takes, base_dir) if song.kit_takes else None,
                          song.earshot_python, log=None if a.quiet else (lambda s: print(s, file=sys.stderr)))
        song.warnings.extend(w for w in kinfo['warnings'] if 'blind synthesis fallback' not in w)
        if kit is None and not a.draft:
            raise ScoreError('no earshot kit can be played (' + '; '.join(kinfo['warnings']) .replace('blind synthesis fallback: ', '')
                             + '). Every effect comes from the kit: render it (npm run kit), or vendor its takes; '
                             '--draft plays placeholder voices for a timing check (never delivered)'
                             + ('; --bed-only renders the edited track alone (no effects). Never cut the track by hand: '
                                "bar 1 sits at the edit's film_t0" if song.has_music else ''))
        progress = apply_progress(song, events, kit) if song.progress else None
        bed, edit = load_music(song, base_dir, int(round(song.dur * SR)) + 4 * SR)
        if song.has_music:
            if kit is None:
                raise ScoreError('a film cut to a track needs the earshot kit for its effects (npm run kit), or --bed-only for '
                                 'the edited track alone; never a hand cut of the track')
            plan_path = a.plan or (os.path.join(os.path.dirname(os.path.abspath(a.json)), 'sfx_plan.json') if a.json else None)
            y, info, ev = render_music(song, events, cues, kit, bed, edit, a.stems, a.draft, plan_path, base_dir)
        else:
            y, info, ev = render_effects(song, events, a.stems, kit, a.draft, cues)
        import soundfile as sf
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        sf.write(a.out, y.astype(np.float32), SR, subtype='PCM_24')
    except (ScoreError, K.KitError, KeyError, ValueError, FileNotFoundError, json.JSONDecodeError) as e:
        print(f'score.py: {type(e).__name__}: {e}', file=sys.stderr)
        return 1

    rep = M.measure(y)
    lim = info['limiter_gr_db']
    rep['limiter_max_gr_db'] = max(0.0, round(float(lim.max()), 2))
    rep['target_lufs'] = dict(lufs=song.lufs, source=song.lufs_from, music=song.music)
    hot = []
    step = int(0.25 * SR)
    for i in range(0, len(lim), step):
        v = float(lim[i:i + step].max())
        if v > 1.5:
            hot.append(dict(t=round((i + int(np.argmax(lim[i:i + step]))) / SR, 3), gr_db=round(v, 2)))
    rep['limiter_hot'] = hot
    if hot:
        song.warnings.append('limiter over 1.5 dB at ' + ', '.join(f"{h['t']}s ({h['gr_db']} dB)" for h in hot[:6])
                             + ': lower the effect or the bed that peaks there' + (
                                 '' if song.has_music else f', or the target (master.lufs {song.lufs:g}): an '
                                 'effects-only film sits at -16 to -18 LUFS so its few accents keep their peaks'))
    rep['sfx'] = sfx_report(song, kinfo, kit, ev, a.draft)
    rep['stacks'] = stack_guard(song, ev['placed'], events, cues)
    tm, mom = M.blocks(y, 0.4, 0.1)
    end_ = ((edit or {}).get('ending') or {}) if song.has_music else {}
    stop_s = end_.get('bed_stops_film_s') if end_.get('mode') == 'stop' else None
    # the track's own final hit (a button or ring ending) is the film's last big moment, the way launch music ends
    # (a final moment about 2 LU over the integrated loudness): the arc's peak is read without its first second
    arc_max, arc_t = rep.get('momentary_max'), rep.get('momentary_max_t')
    hit_s = end_.get('last_hit_film_s') if end_.get('mode') in ('button', 'ring') else None
    if hit_s is not None and len(mom):
        fw = (tm >= hit_s - 0.15) & (tm <= hit_s + 1.2)
        if fw.any() and (~fw).any():
            rep['final_hit'] = dict(t=round(float(hit_s), 3), momentary_max=round(float(mom[fw].max()), 2))
            k = int(np.argmax(np.where(fw, -np.inf, mom)))
            arc_max, arc_t = round(float(mom[k]), 2), round(float(tm[k]), 3)
            rep['arc_max'], rep['arc_max_t'] = arc_max, arc_t
    if song.payoff is not None:
        win = (tm >= song.payoff - 0.2) & (tm <= song.payoff + 1.0)
        i0, i1 = int(song.payoff * SR), int((song.payoff + 1.0) * SR)
        rep['payoff'] = dict(t=round(song.payoff, 3), momentary_max=round(float(mom[win].max()), 2) if win.any() else None,
                             limiter_gr_db=round(float(lim[i0:i1].max()), 2) if i1 > i0 else None)
        # a payoff after the bed stops is the stop ending's one element, which sits under the payoff by design: it
        # is not measured as the loudest moment, nor compared with itself (lockup_after_stop)
        on_stop = stop_s is not None and song.payoff >= stop_s - 0.05
        rep['payoff']['after_stop'] = on_stop
        if on_stop:
            song.warnings.append(f'"payoff" ({song.payoff:.2f}s) is the stop ending\'s element (the bed stops at {stop_s:.2f}s), '
                                 'which sits 2 LU or more under the payoff: point "payoff" at the reveal before the stop, or '
                                 'end on "button" or "ring" when the reveal is the lockup')
        elif win.any() and mom[win].max() < arc_max - 0.5:
            song.warnings.append(f'the payoff ({song.payoff:.2f}s) is not the loudest moment: '
                                 f'{mom[win].max():.1f} vs {arc_max} LUFS-M at {arc_t}s'
                                 + (': a later section of the track is louder; edit the track so the entry on the reveal '
                                    'is the peak (track.py edit)' if song.has_music else ''))
        if rep['payoff']['limiter_gr_db'] and rep['payoff']['limiter_gr_db'] > 1.5:
            song.warnings.append(f'limiter takes {rep["payoff"]["limiter_gr_db"]} dB off the payoff (keep it under 1.5)')
        audible = mom[mom > -70]
        if win.any() and len(audible) and not on_stop:
            lift = float(mom[win].max() - np.median(audible))
            rep['payoff']['over_median_lu'] = round(lift, 2)
            if lift < 2.0:
                song.warnings.append(f'the payoff is only {lift:.1f} LU over the median momentary loudness (want 2-3+): '
                                     + ('cut to a break or a stop before the entry (track.py edit), or let a stop-down breathe '
                                        'before it' if song.has_music else 'leave true silence before it, give the hit more body'))
    audible = mom[mom > -70]
    head = mom[tm <= 0.45]
    if len(audible) and len(head) and song.has_music:
        med, opening = float(np.median(audible)), float(head.max())
        rep['hook'] = dict(opening_lufs_m=round(opening, 2), median_lufs_m=round(med, 2), below_median_db=round(med - opening, 2))
        if med - opening > 12:
            song.warnings.append(f'soft hook: the first 0.5 s sits {med - opening:.0f} dB under the median momentary loudness '
                                 f'({opening:.1f} vs {med:.1f} LUFS-M; an intro runs 5-12 LU under the body): start the edit '
                                 'on the track\'s intro with intent (track.py edit --film-t0 0-0.45)')
    if song.dur > 8 and arc_t is not None:
        frac = arc_t / song.dur
        rep['loudest_frac'] = round(frac, 2)
        if frac > REVEAL_BAND[1]:
            song.warnings.append(f'the loudest moment is at {frac * 100:.0f}% of the film ({arc_t}s): the ending '
                                 f'should subtract, not slam. Peak on the biggest reveal ({REVEAL_BAND[0]:.0%}-{REVEAL_BAND[1]:.0%} '
                                 'in) and point "payoff" there; end on a stop, the track\'s final hit or its ring')
    if rep.get('tail_50ms_db') is not None and rep['tail_50ms_db'] > -45:
        song.warnings.append(f'the ending is not silent: the last 50 ms measure {rep["tail_50ms_db"]} dB (want under -45)')
    # the ending as av-audit judges the film: a decay (the track's own ending, a hit that rings, a fade), never a cut
    shape = D.ending_shape(y)
    rep['ending'] = shape
    pr = D.ending_problem(shape)
    if pr and song.has_music:
        rep.setdefault('_fails_extra', []).append(pr + ': track.py edit --end own|fade|hit, and a tail that holds MUSIC.end.hold')
    if shape.get('dead_air_s') is not None and shape['dead_air_s'] > D.END_DEAD_AIR_S and song.has_music:
        song.warnings.append(f"{shape['dead_air_s']:.1f} s of silence after the music ends: the picture holds on nothing; end the film "
                             'where the ending\'s ring or fade does (the tail = MUSIC.end.hold)')
    if song.dur >= 20 and rep.get('lra') is not None and rep['lra'] < 5 and song.has_music:
        song.warnings.append(f'LRA {rep["lra"]} LU is flat for a {song.dur:.0f}s film (want 5-8): the arc comes from the edit '
                             '(an intro, a break, the entry on the reveal), not from automation')
    off = [x for x in ev['tuned'] if not x['in_key']]
    if off:
        song.warnings.append('out of key: ' + ', '.join(f"{x['kind']} {x['note']} at f={x['f']}" for x in off))
    by = {}
    for e in events:
        by[e['kind']] = by.get(e['kind'], 0) + 1
    fails = M.gate(rep, song.lufs, a.tol, a.max_tp) + rep.pop('_fails_extra', [])
    # 4. no generated music; 5. every effect from the earshot kit
    rep['music'] = dict(source='none')
    if song.has_music:
        plan = ev['plan']
        rec = song.music_cfg.get('licence')
        rep['music'] = dict(source=f'track:{rec}' if rec else 'track (no licence record named: score.json music.licence)',
                            record=rec, track=song.music_cfg.get('track'), edit=song.music_cfg.get('edit'),
                            staged_lufs=STAGE_LUFS, gain_db=song.music_cfg.get('gain_db'),
                            segments=(edit or {}).get('segments'), ending=(edit or {}).get('ending'),
                            joins=ev['gates']['joins'])
        g = ev['gates']
        rep['over_bed'] = g['over_bed']
        rep['stop_downs'] = g['stop_downs']
        rep['no_duck'] = g['no_duck']
        rep['density'] = plan['density_per_10s']
        rep['one_gesture'] = plan['one_gesture']
        rep['runs'] = plan['runs']
        rep['restraint'], rep['repeats'], rep['cast'] = plan.get('restraint'), plan.get('repeats'), plan.get('cast')
        song.warnings.extend(w for w in plan['warnings'] + g['warnings']
                             if not (a.bed_only and ('kit lock has no mix.stop_down' in w or 'not cast for this film' in w)))
        fails += g['fails']
        # masking: a hero sound the music covers in every band (under 0 dB in its best band) fails, whatever the
        # over-bed range says (audibility wins for these); short of that it is listed with its margin. A film with
        # more than 30 % of its effects masked warns
        for m in ev['masked']:
            if m.get('hero') and m['snr_db'] < 0:
                fails.append(f"{m['hero']}'s {m['kind']} {m['id']} at f={m['f']:g} is buried: {-m['snr_db']:.1f} dB under the music in its "
                             f"best band ({m['band_hz']} Hz), want +{m['margin_db']:g}: raise role {m.get('role')}'s bed_db (audibility "
                             "wins over the over-bed range here) or cast another sound (kit.py cast --avoid)")
        if ev.get('masked_read') and len(ev['masked']) > 0.3 * ev['masked_read']:
            song.warnings.append(f"{len(ev['masked'])} of {ev['masked_read']} effects are masked by the music (over 30 %): the kit's "
                                 'sounds sit where the track is busy; cast again against this track (kit.py cast --avoid)')
        if song.mix['music'] != 1.0 or song.mix['sfx'] != 1.0:
            song.warnings.append(f"mix.music {song.mix['music']:g} / mix.sfx {song.mix['sfx']:g} trim the buses after plan.py levelled every "
                                 "effect against the bed, so the over-bed and masking reads no longer describe the master: with a "
                                 "track set each role's bed_db in audio/kit.json (music.gain_db for headroom) and leave mix at 1")
        rep['lockup'] = lockup_after_stop(song, plan, y, rep)
        rep['bed_ring'] = ev.get('bed_ring')
        rep['lift'] = ev.get('lift')
        rep['ride'] = plan.get('ride')
        if events and not a.bed_only:
            rep['accents'] = accent_read(y, events, song, plan)
        if not rec:
            song.warnings.append('score.json music names no licence record: credits.py and deliver.sh refuse the film until it does')
    if ev['missing']:
        msg = (f"{len(ev['missing'])} cue(s) with no earshot kit take: "
               + '; '.join(f"{m['kind']} {m.get('id') or ''} f={m['f']:g} ({m['why']})" for m in ev['missing'][:4]))
        if a.draft:
            song.warnings.append(msg + ' (placeholder voices: a --draft build)')
        else:
            fails.append(msg)
    rep.update(out=a.out, bpm=song.bpm, key=f'{S_note(song.tonic)} {song.mode}', bars=song.nbars, draft=bool(a.draft),
               bed_only=bool(a.bed_only),
               events=dict(count=len(events), by_kind=by, skipped=ev['skipped'], masked=ev['masked'], tuned=ev['tuned']),
               chords=[dict(t=round(a_, 3), chord=c.name if c else 'N.C.') for a_, _, c in song.segs if a_ < song.dur],
               warnings=song.warnings, fails=fails)
    if progress:
        rep['progress'] = progress
    if ev.get('typing') and ev['typing']['keys']:
        rep['typing'] = ev['typing']
    rep['pass'] = not fails and not a.draft
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(rep, fh, indent=1)
        if not song.has_music:  # the effects-only film's intended sound times, for av-audit.py and listen.py
            cs = dict(cues, events=ev['sounded'], silent=[dict(s_, status='skipped') for s_ in ev['skipped']],
                      sounded=dict(score=1, intended='the cue frame; a key at its planned time'))
            with open(os.path.join(os.path.dirname(os.path.abspath(a.json)), 'cues_sounded.json'), 'w', encoding='utf-8',
                      newline='\n') as fh:
                json.dump(cs, fh, indent=1)
    if not a.quiet:
        tag = 'DRAFT' if a.draft else ('PASS' if not fails else 'FAIL')
        print(f"{tag}  {a.out}  {rep['seconds']}s  {rep['lufs']} LUFS (target {song.lufs:g}, "
              f"{song.lufs_from})  TP {rep['true_peak_db']} dBTP  LRA {rep['lra']} LU  loudest {rep['momentary_max']} "
              f"LUFS-M at {rep['momentary_max_t']}s  limiter {rep['limiter_max_gr_db']} dB  "
              f"events {len(events)} ({len(ev['skipped'])} skipped, {len(ev['masked'])} masked)")
        sx = rep['sfx']
        print(f"  sfx: {sx['source']}" + (f" {sx['name']}" if sx.get('name') else '')
              + (f" (earshot {sx['earshot']}, bank {sx['bank']})" if sx.get('bank') else '')
              + (f": {sx['kit_cues']} cues from {len(sx['roles'])} roles" if sx['roles'] else '')
              + (f"; off in the kit: {', '.join(f'{r} x{n}' for r, n in sx['off'].items())}" if sx['off'] else '')
              + (f"; draft voices: {', '.join(f'{k} x{n}' for k, n in sx['draft_voices'].items())}" if sx['draft_voices'] else ''))
        if song.has_music:
            ob, sdn = rep['over_bed'], rep['stop_downs']
            print(f"  music: {rep['music']['source']}; over the bed {ob['take_within_tol']}/{ob['count']} takes within "
                  f"+-{OVER_BED_TOL:g} dB of their level (as on a steady bed: median {ob['steady_median']} dB; with the bed's "
                  f"own accents {ob['within_tol']}/{ob['count']}, median {ob['median']}); stop-downs "
                  + (', '.join(f"{s['t']:.2f}s {s['status']}" + (f" {s['measured_dip_db']:.1f} dB" if 'measured_dip_db' in s else '')
                               for s in sdn) or 'none')
                  + f"; density {rep['density']['median']}/10 s; no duck {'ok' if rep['no_duck']['ok'] else 'FAIL'}")
        if rep.get('accents'):
            ac = rep['accents']
            print(f"  hits: {ac['salient']} of {ac['events']} events land as hits the ear marks ({100 * (ac['share'] or 0):.0f} %, want "
                  f"{100 * ACCENT_SHARE:.0f} %+), {ac['moments']} breaths before moments, {ac['hits_per_10s']} hits per 10 s")
        if rep.get('ride') and rep['ride'].get('points'):
            rd = rep['ride']
            print(f"  arc ride: opening {rd.get('opening_db', 0):+.1f} dB, body lifted up to {rd.get('lift_max_db', 0):.1f} dB "
                  f"(the body sat at {rd.get('body_lufs')} vs the opening's {rd.get('opening_lufs')} LUFS short-term)")
        for s_ in rep['stacks']:
            print(f"  stack: {s_['t']}s (f={s_['f']:g}{', ' + s_['at'] if s_['at'] else ''}): {', '.join(s_['layers'] + s_['lead_ins'])}")
        if progress and progress.get('events'):
            print(f"  progress: {progress['events']} rungs {progress['rungs'][0]['note']} -> {progress['rungs'][-1]['note']}"
                  + (f", resolves on {progress['resolve']['note']} at {progress['resolve']['t']}s" if 'resolve' in progress else ''))
        for w in song.warnings:
            print('  warning:', w)
        for m in ev['masked']:
            print(f"  masked: {m['kind']} {m['id']} at f={m['f']}: {m['snr_db']} dB over the music in its best band ({m['band_hz']} Hz), "
                  f"want {m['margin_db']:g}" + (f" ({m['hero']})" if m.get('hero') else ''))
        for f_ in fails:
            print('  FAIL:', f_)
    return 0 if not fails else 1


NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


def S_note(pc):
    return NAMES[pc]

def note_name(m):
    k = int(round(m))
    return NAMES[k % 12] + str(k // 12 - 1)


if __name__ == '__main__':
    sys.exit(main())
