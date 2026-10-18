#!/usr/bin/env python3
"""Regression tests for score.py's effect voices: the synth engine, the earshot kit and the fallbacks.

Builds its own cue lists, kits and takes in a temporary folder and checks:
  - synth: "sfx": {"engine": "synth"}, the default "auto" without a kit, and a score that predates the
    "sfx" and "music" fields render bit for bit the same WAV (with --baseline OLD/score.py, also the
    same as that older score.py)
  - kit: a take's transient (after 30 ms of silence in its file) lands on its cue frame, a whoosh's loudest
    point on its apex frame, a key's transient on its typing-plan time, all within half a frame; two
    clicks play two different takes; a text chain steps through the chord's tones on the pitched takes;
    a role set to null skips its cue; a role the kit does not name keeps its synth voice
  - fallbacks (EARSHOT_PYTHON=none): rendered takes play without earshot (vendored), a changed kit.json
    plays the old takes with a warning, no takes at all falls back to the synth voices with a loud
    warning, and "engine": "earshot" then fails (exit 1)
  - the stack guard reports a stacked lockup (a whoosh into a drop + snap + motif) and stays quiet on
    one clean hit after a stop-down
  - "music": "none": no chords needed, the target defaults to -18 LUFS, the hook check is off
  - kit.py: note names, the role mapping, tuning a kit to the film's key
  - with EARSHOT_PYTHON pointing at an earshot 0.3+ interpreter: a real two-role kit renders with kit.py
    and its takes land on their frames (skipped otherwise)

  - word-style typing on a kit (30 chars/s, "word" and "auto") renders one key take per word
  - a score.json drop at the lockup is the stop-down, not a stacked layer
  - the progress motif under a kit climbs a tuned role's take notes and resolves on one; an untuned role
    warns; an explicit note with no take plays the synth voice with a warning (Kit.pick returns None)
  - a text chain over two chords steps through each chord's tones among the kit's text takes
  - a bright kit key: the typing warning names the take, not a style
  - a kit light landing plays at level_db x weight; takes are trimmed toward their role's median loudness
  - kit.py: an invalid key is a KitError, five text notes tune to the pentatonic, a symlinked earshot on
    PATH runs with its own interpreter (POSIX)
  - av-audit.py (needs librosa): a skipped riser does not hide the hit on its frame; a sharp attack on a
    cue frame is not a click; onsets inside a whoosh's span are not strays

Usage: python3 skills/cinetic/scripts/test/score.test.py [--baseline OLD/score.py] [--only test,test]
(needs numpy, scipy, soundfile and pyloudnorm). Exit 0 when every check passes, 1 otherwise.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, '..', 'audio')
SCORE = os.path.join(AUDIO, 'score.py')
KITPY = os.path.join(AUDIO, 'kit.py')
sys.path.insert(0, AUDIO)
import kit as K  # noqa: E402

FPS, SR = 60, 48000
FAILS = []


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


def run(d, name, cues, score, env=None, script=SCORE):
    """Render cues + score in d; returns (CompletedProcess, report dict or None)."""
    c, s = os.path.join(d, f'{name}.cues.json'), os.path.join(d, f'{name}.score.json')
    json.dump(cues, open(c, 'w'))
    json.dump(score, open(s, 'w'))
    rep = os.path.join(d, f'{name}.report.json')
    if os.path.exists(rep):
        os.remove(rep)
    args = [sys.executable, script, '--cues', c, '--score', s, '--out', os.path.join(d, f'{name}.wav'),
            '--stems', os.path.join(d, f'{name}.stems'), '--json', rep, '--quiet']
    p = subprocess.run(args, capture_output=True, text=True, env=dict(os.environ, **(env or {})))
    return p, (json.load(open(rep)) if os.path.exists(rep) else None)


def cues_with(events, total=300, cue=None):
    return dict(fps=FPS, bpm=120, total=total, acts={'all': {'from': 0, 'dur': total}}, cue=cue or {'mid': total // 2},
                events=events)


SYNTH_SCORE = {'key': 'G major', 'bpm': 120, 'chords': ['Gadd9', 'Cmaj9', '-'],
               'sections': [{'bars': [1, 1], 'style': 'intro'}, {'bars': [2, 3], 'style': 'resolve'}],
               'payoff': 120, 'master': {'lufs': -14, 'ceiling': 0.77, 'fade': 0.6}}


# ------------------------------------------------------------------------------------------
# a synthetic kit: takes with known sync points, written the way earshot writes them
# ------------------------------------------------------------------------------------------
def tone(hz, dur=0.6, tau=0.15):
    u = np.arange(int(dur * SR)) / SR
    return 0.5 * np.sin(2 * np.pi * hz * u) * np.exp(-u / tau) * np.minimum(1, u / 0.002)


def transient(seed, lead=0.03, dur=0.05):
    """lead s of silence, then a 2 ms-decay noise transient: its onset is exactly `lead`."""
    r = np.random.default_rng(seed)
    u = np.arange(int(dur * SR)) / SR
    return np.concatenate([np.zeros(int(lead * SR)), r.standard_normal(len(u)) * np.exp(-u / 0.004) * 0.6])


def whoosh_take(peak=0.3, dur=0.8, seed=9):
    r = np.random.default_rng(seed)
    u = np.arange(int(dur * SR)) / SR
    env = np.exp(-((u - peak) / 0.07) ** 2)
    return np.stack([r.standard_normal(len(u)) * env * 0.4] * 2, axis=1)


def on(lead=0.03):
    """The sync points of a transient() take."""
    return dict(onset_s=lead, peak_s=lead + 0.002, end_s=lead + 0.03)


def tone_role(notes, level_db=-6.0):
    """files for add_role: one tone() take per note, onset at 0."""
    return [(f'{n}.wav', tone(440.0 * 2 ** ((K.to_midi(n) - 69) / 12)), dict(onset_s=0.0, peak_s=0.003, end_s=0.5), n)
            for n in notes]


def add_role(kit_path, role, sound, files, align='onset', level_db=-6.0, pitches=None, lufs=None):
    """Add (or replace) a role in a kit made by make_kit: its takes (files = [(name, samples, sync,
    pitch)]), the lock rows (lufs: one lufs_m_max per take) and the source digest, so it stays current."""
    d = os.path.dirname(kit_path)
    takes = os.path.join(d, 'kit')
    kit, lock = K.read_json(kit_path, 'kit'), K.read_json(os.path.join(takes, K.LOCK), 'lock')
    kit['roles'][role] = {'sound': sound, 'takes': len(files) // (len(pitches) if pitches else 1), 'align': align,
                          'level_db': level_db, **({'pitches': pitches} if pitches else {})}
    lock['roles'][role] = {'sound': sound, 'align': align, 'level_db': level_db, 'max_s': None, 'takes': []}
    for k, (name, x, sync, p) in enumerate(files):
        name = f"{role.replace('.', '-')}_{name}" if not name.startswith(role.replace('.', '-')) else name
        sf.write(os.path.join(takes, name), x.astype(np.float32), SR, subtype='PCM_24')
        lock['roles'][role]['takes'].append(dict(file=name, seed=1, pitch=p, dur_s=len(x) / SR, peak_db=-1.0,
                                                 sha1=K.sha1_file(os.path.join(takes, name)), checks=[], **sync,
                                                 **({'lufs_m_max': lufs[k]} if lufs else {})))
    K.write_json(kit_path, kit)
    K.write_json(os.path.join(takes, K.LOCK), lock)
    K.write_json(os.path.join(takes, K.SOURCE), dict(kit='audio/kit.json', sha1=K.digest(kit)))


def make_kit(d, roles_extra=None):
    """audio/kit.json + audio/kit/ (takes, kit.lock.json, kit.source.json) in d; returns the kit path."""
    takes = os.path.join(d, 'audio', 'kit')
    os.makedirs(takes, exist_ok=True)
    lock = {'kit': 1, 'earshot': 'test', 'bank': 'test', 'sr': SR, 'name': 'test', 'roles': {}}
    kit = {'kit': 1, 'name': 'test', 'sr': SR, 'roles': {}}

    def add(role, sound, files, align='onset', level_db=-6.0, pitches=None):
        kit['roles'][role] = {'sound': sound, 'takes': len(files) // (len(pitches) if pitches else 1), 'align': align,
                              'level_db': level_db, **({'pitches': pitches} if pitches else {})}
        lock['roles'][role] = {'sound': sound, 'align': align, 'level_db': level_db, 'max_s': None, 'takes': []}
        for name, x, sync, p in files:
            sf.write(os.path.join(takes, name), x.astype(np.float32), SR, subtype='PCM_24')
            lock['roles'][role]['takes'].append(dict(file=name, seed=1, pitch=p, dur_s=len(x) / SR, peak_db=-1.0,
                                                     sha1=K.sha1_file(os.path.join(takes, name)), checks=[], **sync))
    add('click', 'tap/finger', [('click_1.wav', transient(1), on(), None), ('click_2.wav', transient(2), on(), None)])
    add('hit', 'notify/m0', [('hit_1.wav', transient(3), on(), None)], level_db=-3.0)
    add('key', 'typing_key/thock', [(f'key_{k}.wav', transient(10 + k, 0.008), on(0.008), None) for k in range(1, 4)])
    add('whoosh.long', 'whoosh_big/swell', [('whoosh-long_1.wav', whoosh_take(), dict(onset_s=0.1, peak_s=0.3, end_s=0.6),
                                             None)], align='peak')
    add('text', 'pluck/kalimba_soft', [(f'text_{n}.wav', tone(K_HZ[n]), dict(onset_s=0.0, peak_s=0.003, end_s=0.5), n)
                                       for n in ('G4', 'B4', 'D5')], level_db=-12.0, pitches=['G4', 'B4', 'D5'])
    kit['roles'].update({'drop': None, 'riser': None, 'swell': None, 'suck': None})
    lock['roles'].update({'drop': None, 'riser': None, 'swell': None, 'suck': None})
    for r, spec in (roles_extra or {}).items():
        kit['roles'][r] = spec
    path = os.path.join(d, 'audio', 'kit.json')
    K.write_json(path, kit)
    K.write_json(os.path.join(takes, K.LOCK), lock)
    K.write_json(os.path.join(takes, K.SOURCE), dict(kit='audio/kit.json', sha1=K.digest(kit)))
    return path


K_HZ = {n: 440.0 * 2 ** ((K.to_midi(n) - 69) / 12) for n in ('G4', 'B4', 'D5')}
NO_EARSHOT = {'EARSHOT_PYTHON': 'none'}


def onset_near(x, t, before=0.1, after=0.1):
    """The first sample at half the local peak within [t - before, t + after] (seconds)."""
    m = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    a, b = int((t - before) * SR), int((t + after) * SR)
    seg = m[a:b]
    return (a + int(np.argmax(seg >= 0.5 * seg.max()))) / SR


def peak_near(x, t, span=0.4):
    a, b = int((t - span) * SR), int((t + span) * SR)
    w = int(0.03 * SR)
    env = np.convolve((x[a:b] ** 2).mean(axis=1), np.ones(w) / w, 'same')
    return (a + int(np.argmax(env))) / SR


# ------------------------------------------------------------------------------------------
# the checks
# ------------------------------------------------------------------------------------------
def synth_engine(d, baseline):
    ev = [dict(f=30, kind='tick', id='a:tick'), dict(f=60, kind='pop', id='a:pop'), dict(f=90, kind='whoosh', dur=30,
          apexFrac=0.5, id='a:whoosh'), dict(f=120, kind='hit', id='a:hit'), dict(f=150, kind='land', variant='light',
          weight=0.5, id='a:land'), dict(f=180, kind='click', id='a:click')]
    cues = cues_with(ev)
    p1, r1 = run(d, 'legacy', cues, SYNTH_SCORE, NO_EARSHOT)
    p2, r2 = run(d, 'synth', cues, dict(SYNTH_SCORE, sfx={'engine': 'synth'}), NO_EARSHOT)
    p3, r3 = run(d, 'auto', cues, dict(SYNTH_SCORE, sfx={'engine': 'auto', 'kit': os.path.join(d, 'nokit.json')}),
                 NO_EARSHOT)
    ok = r1 and r2 and r3
    check(bool(ok), 'the synth paths render' + ('' if ok else f': {(p1.stderr or p2.stderr or p3.stderr).strip()[-300:]}'))
    if not ok:
        return
    w = [open(os.path.join(d, f'{n}.wav'), 'rb').read() for n in ('legacy', 'synth', 'auto')]
    check(w[0] == w[1] == w[2], 'engine synth, auto without a kit and a score without "sfx" render the same WAV bit for bit')
    check(r2['sfx']['source'].startswith('synth') and r3['sfx']['source'] == 'synth (fallback)',
          f"the report names the voices ({r2['sfx']['source']}; {r3['sfx']['source']})")
    check(any('blind synthesis fallback' in x for x in r3['warnings']), 'auto without a kit warns about the synth fallback')
    if baseline:
        p0, r0 = run(d, 'baseline', cues, SYNTH_SCORE, NO_EARSHOT, script=baseline)
        same = r0 is not None and open(os.path.join(d, 'baseline.wav'), 'rb').read() == w[1]
        check(same, f'engine synth matches {baseline} bit for bit' + ('' if r0 else f': {p0.stderr.strip()[-300:]}'))


def kit_engine(d):
    make_kit(d)
    ev = [dict(f=30, kind='click', id='a:click-1'), dict(f=60, kind='click', id='a:click-2'),
          dict(f=90, kind='text', id='a:fragment-1'), dict(f=126, kind='text', id='a:fragment-2'),
          dict(f=162, kind='text', id='a:fragment-3'), dict(f=200, kind='whoosh', dur=48, apexFrac=0.5, id='a:move'),
          dict(f=240, kind='hit', id='a:lockup'), dict(f=250, kind='drop', id='a:drop'),
          dict(f=270, kind='tock', id='a:tock')]
    ev += [dict(f=12 + 4 * k, kind='key', variant='word' if k == 0 else None, id=f'a:key{k}') for k in range(3)]
    ev = [{k: v for k, v in e.items() if v is not None} for e in ev]
    score = {'key': 'G major', 'bpm': 120, 'music': 'none', 'sfx': {'engine': 'auto', 'kit': 'audio/kit.json'},
             'master': {'fade': 0.4}}
    p, r = run(d, 'kit', cues_with(ev), score, NO_EARSHOT)  # "audio/kit.json" resolves next to the score
    check(r is not None, 'renders with a kit' + ('' if r else f': {p.stderr.strip()[-400:]}'))
    if not r:
        return
    sx = r['sfx']
    check(sx['source'] == 'earshot kit', f"the kit plays as rendered ({sx['source']})")
    x, _ = sf.read(os.path.join(d, 'kit.stems', 'sfx.wav'))
    for f, what in ((30, 'click'), (60, 'second click'), (240, 'hit')):
        off = (onset_near(x, f / FPS, 0.05, 0.05) - f / FPS) * FPS
        check(abs(off) < 0.5, f'{what} transient on its frame ({off:+.2f} f)')
    pk = (peak_near(x, 200 / FPS) - 200 / FPS) * FPS
    check(abs(pk) < 0.5, f'whoosh peak on its apex frame ({pk:+.2f} f)')
    check(sx['roles'].get('click', {}).get('takes') == ['click_1.wav', 'click_2.wav'], 'two clicks play two different takes')
    notes = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'text']
    check(notes == ['G4', 'B4', 'D5'], f'a text chain steps through the chord tones on the pitched takes ({notes})')
    check(sx['off'] == {'drop': 1} and any(s.get('role') == 'drop' for s in r['events']['skipped']),
          'a role set to null skips its cue')
    check(sx['synth'] == {'tock': 1}, f"a role the kit does not name keeps its synth voice ({sx['synth']})")
    keys = sx['roles'].get('key', {})
    check(keys.get('cues') == 3, f"every planned key plays a key take ({keys.get('cues')})")
    offs = [(onset_near(x, f / FPS, 0.03, 0.03) - f / FPS) * FPS for f in (12, 16, 20)]
    check(all(abs(o) < 0.5 for o in offs), f"key transients on their frames, within the typing plan's jitter "
          f"({', '.join(f'{o:+.2f}' for o in offs)} f)")
    check(r['target_lufs']['lufs'] == -18 and abs(r['lufs'] + 18) <= 0.5, f"an effects-only film defaults to -18 LUFS ({r['lufs']})")
    check('hook' not in r, 'the hook check is off without music')
    check(r['stacks'] == [], f"one clean hit is not a stack ({r['stacks']})")


def fallbacks(d):
    kit = make_kit(d)
    ev = [dict(f=60, kind='click', id='a:click'), dict(f=150, kind='hit', id='a:hit')]
    score = {'key': 'C major', 'music': 'none', 'sfx': {'kit': kit}}
    src = os.path.join(d, 'audio', 'kit', K.SOURCE)
    keep = open(src).read()
    os.remove(src)
    p, r = run(d, 'vend', cues_with(ev), score, NO_EARSHOT)
    check(r is not None and r['sfx']['source'] == 'vendored kit (unchecked)',
          f"takes rendered outside kit.py play without earshot ({r and r['sfx']['source']})")
    open(src, 'w').write(keep)
    k = K.read_json(kit, 'kit')
    k['roles']['hit']['level_db'] = -1.0
    K.write_json(kit, k)
    p, r = run(d, 'stale', cues_with(ev), score, NO_EARSHOT)
    check(r is not None and r['sfx']['source'] == 'vendored kit (stale)'
          and any('playing the takes as they are' in x for x in r['warnings']),
          'a changed kit.json without earshot plays the rendered takes with a warning')
    os.rename(os.path.join(d, 'audio', 'kit'), os.path.join(d, 'audio', 'kit-gone'))
    p, r = run(d, 'none', cues_with(ev), score, NO_EARSHOT)
    check(r is not None and r['sfx']['source'] == 'synth (fallback)'
          and any('blind synthesis fallback' in x for x in r['warnings']), 'no takes and no earshot: synth voices, loud warning')
    p, r = run(d, 'strict', cues_with(ev), dict(score, sfx={'kit': kit, 'engine': 'earshot'}), NO_EARSHOT)
    check(p.returncode == 1 and 'no kit can be played' in p.stderr, '"engine": "earshot" without a playable kit fails')


def stack_guard(d):
    ev = [dict(f=214, kind='whoosh', dur=24, apexFrac=0.5, id='m:slide'), dict(f=228, kind='drop', id='m:lockup'),
          dict(f=228, kind='snap', id='m:name-locks')]
    score = dict(SYNTH_SCORE, payoff='@lockup', motifs=[{'at': '@lockup'}], sfx={'engine': 'synth'})
    p, r = run(d, 'stacked', cues_with(ev, cue={'lockup': 228}), score)
    st = (r or {}).get('stacks') or []
    check(len(st) == 1 and st[0]['at'] == 'lockup' and len(st[0]['layers']) == 3 and st[0]['lead_ins'] == ['whoosh m:slide'],
          f"the stack guard reports the stacked lockup ({st})")
    check(any(x.startswith('stacked lockup') for x in (r or {}).get('warnings', [])), 'and warns about it')
    ev = [dict(f=160, kind='land', id='m:piece'), dict(f=228, kind='hit', id='m:lockup')]
    p, r = run(d, 'clean', cues_with(ev, cue={'lockup': 228}), dict(SYNTH_SCORE, payoff='@lockup', sfx={'engine': 'synth'}))
    check(r is not None and r['stacks'] == [], 'one clean hit after a stop-down is not a stack')


def music_none(d):
    ev = [dict(f=30, kind='text', id='a:t1'), dict(f=90, kind='text', id='a:t2')]
    p, r = run(d, 'nomusic', cues_with(ev), {'key': 'D minor', 'music': 'none', 'sfx': {'engine': 'synth'}})
    check(r is not None and r['target_lufs']['music'] == 'none', 'music "none" renders without chords'
          + ('' if r else f': {p.stderr.strip()[-200:]}'))
    if r:
        notes = [t['note'] for t in r['events']['tuned']]
        check(notes == ['D5', 'F5'], f'synth text sounds step through the key\'s triad without chords ({notes})')
        bed = os.path.join(d, 'nomusic.stems', 'pad.wav')
        check(os.path.exists(bed) and float(np.abs(sf.read(bed)[0]).max()) == 0.0, 'and no synth band plays')
    p, r = run(d, 'needchords', cues_with(ev), {'key': 'C major', 'music': 'synth'})
    check(p.returncode == 1 and 'needs "chords"' in p.stderr, 'the synth band still needs chords')


def kit_helpers():
    check(K.note(K.to_midi('C#5')) == 'C#5' and abs(K.to_midi(440) - 69) < 1e-9 and K.to_midi('Cs5') == 73,
          'kit.py reads note names and Hz')
    check([K.role_for('tick', 'crisp'), K.role_for('land', None, 0.5), K.role_for('whoosh', None, 1, 0.3),
           K.role_for('whoosh', None, 1, 0.9), K.role_for('key', 'space')] ==
          ['tick.crisp', 'land.light', 'whoosh.short', 'whoosh.long', 'key.space'], 'the cue -> role mapping')
    kit = {'roles': {'bell': {'sound': 'pluck/kalimba', 'pitches': ['C5', 'D5', 'E5', 'G5', 'A5']},
                     'text': {'sound': 'pluck/kalimba_soft', 'pitches': ['C5', 'E5', 'G5']},
                     'click.confirm': {'sound': 'pluck/kalimba_soft', 'edits': {'pitch': 'C6'}},
                     'hit': {'sound': 'notify/m0'}, 'tick': {'sound': 'tap/glass'}}}
    knobs = {'notify/m0': {'pitch': {'native_hz': 523.25, 'range_hz': [220.0, 3200.0]}}}
    K.tune(kit, (7, [0, 2, 4, 5, 7, 9, 11], 'G major'), knobs)
    r = kit['roles']
    check(r['bell']['pitches'] == ['G4', 'A4', 'B4', 'D5', 'E5'] and r['text']['pitches'] == ['G4', 'B4', 'D5']
          and r['click.confirm']['edits']['pitch'] == 'G5' and r['hit']['edits']['pitch'] == 'G4' and 'edits' not in r['tick'],
          f"tuning to G major: bell pentatonic, text triad, nearest tonics ({r})")


def typing_events(n_words=7, letters=4, f0=30, step=2):
    """A typed line: words of `letters` letters split by spaces, one key every `step` frames
    (step 2 at 60 fps = 30 chars/s), word starts marked 'word'."""
    ev, f = [], f0
    for w in range(n_words):
        for k in range(letters):
            ev.append(dict(f=f, kind='key', id=f'a:key{len(ev)}', **({'variant': 'word'} if k == 0 else {})))
            f += step
        if w < n_words - 1:
            ev.append(dict(f=f, kind='key', variant='space', id=f'a:key{len(ev)}'))
            f += step
    return ev


def typing_word_kit(d):
    """P0: word-style typing (score.json "word", or "auto" above 25 chars/s) with a kit key role crashed
    with KeyError 'word'; it must render and play one key take per word."""
    make_kit(d)
    ev = typing_events()  # 34 keys at 30 chars/s
    for style in ('word', 'auto'):
        p, r = run(d, f'type-{style}', cues_with(ev), {'key': 'G major', 'music': 'none', 'typing': style,
                                                       'master': {'lufs': -26},  # a lone 1 s burst of test clicks
                                                       'sfx': {'kit': 'audio/kit.json'}}, NO_EARSHOT)
        check(r is not None and p.returncode == 0, f'typing "{style}" at 30 chars/s renders with a kit'
              + ('' if r else f': {p.stderr.strip()[-300:]}'))
        if not r:
            continue
        keys = r['sfx']['roles'].get('key', {})
        check(keys.get('cues') == 7 and len(keys.get('takes', [])) >= 2,
              f'typing "{style}": one key take per word, varied ({keys})')
        check(r['typing']['styles'] == ['word'], f"typing \"{style}\" sounds the 30 chars/s run per word ({r['typing']['styles']})")


def stack_drop(d):
    """P1: a score.json drop's suck only ducks the music bus (the stop-down); one hit plus a drop at the
    lockup is not a stack, with music none or synth."""
    ev = [dict(f=160, kind='land', id='m:piece'), dict(f=228, kind='hit', id='m:lockup')]
    drop = [{'at': '@lockup', 'silence': '1/16', 'suck': 0.2}]
    for music in ('none', 'synth'):
        score = dict(SYNTH_SCORE, music=music, payoff='@lockup', drops=drop, sfx={'engine': 'synth'})
        p, r = run(d, f'drop-{music}', cues_with(ev, cue={'lockup': 228}), score)
        check(r is not None and r['stacks'] == [] and not any('suck' in w for w in r['warnings']),
              f'one hit with a drop at the lockup is not a stack (music {music}: {(r or {}).get("stacks")})')


PENTA_G = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6']


def progress_kit(d):
    """P1: under a kit, the progress motif climbs the notes a tuned role has takes for (and resolves on one),
    an untuned role warns that its rungs cannot climb, and an explicit note the kit has no take on plays
    the synth voice with a warning instead of a neighbouring (wrong) take."""
    kit = make_kit(d)
    add_role(kit, 'bell', 'pluck/kalimba', tone_role(PENTA_G), level_db=-5.0, pitches=PENTA_G)
    add_role(kit, 'pop', 'fit/pop/mouth_plop', [('1.wav', transient(40), on(), None), ('2.wav', transient(41), on(), None)])
    k = K.Kit(K.read_json(os.path.join(d, 'audio', 'kit', K.LOCK), 'lock'), os.path.join(d, 'audio', 'kit'), 'current')
    check(k.pick('bell', 'x', K.to_midi('C6'), explicit=True) is None and k.pick('bell', 'x', K.to_midi('D6'), explicit=True)
          and not k.covers('bell', K.to_midi('F#5')) and k.covers('pop', 60.0),
          'Kit.pick: an explicit note with no take within a quarter tone gets None (covers() says so)')
    base = {'key': 'G major', 'bpm': 120, 'music': 'none', 'sfx': {'kit': 'audio/kit.json'}}
    pops = [dict(f=30 + 24 * j, kind='pop', id=f'p:day{j + 1}') for j in range(5)]
    p, r = run(d, 'prog-pop', cues_with(pops + [dict(f=250, kind='hit', id='p:streak')], cue={'streak': 250}),
               dict(base, progress={'match': 'day', 'kind': 'pop', 'resolve': '@streak'}), NO_EARSHOT)
    check(r is not None and any('is untuned' in w and 'pop' in w for w in r['warnings']),
          'progress on an untuned kit role warns that its rungs cannot climb'
          + ('' if r else f': {p.stderr.strip()[-300:]}'))
    bells = [dict(f=30 + 30 * j, kind='bell', id=f'p:day{j + 1}') for j in range(5)]
    p, r = run(d, 'prog-bell', cues_with(bells + [dict(f=250, kind='hit', id='p:streak')], cue={'streak': 250}),
               dict(base, progress={'match': 'day', 'kind': 'bell', 'resolve': '@streak'}), NO_EARSHOT)
    if not r:
        check(False, f'progress on the kit bell renders: {p.stderr.strip()[-300:]}')
        return
    rungs = [K.to_midi(x['note']) for x in r['progress']['rungs']]
    tuned = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'bell']  # what played
    played = [K.to_midi(n) for n in tuned]
    check(rungs == played and played == sorted(set(played)) and len(played) == 5 and all(n in PENTA_G for n in tuned),
          f"progress on the kit bell climbs its take notes, a new note each rung ({tuned})")
    check(r['progress']['resolve']['note'] == 'G5' and r['sfx']['roles']['bell']['cues'] == 5 and 'bell' not in r['sfx']['synth']
          and not any('has no take' in w for w in r['warnings']),
          f"and resolves on a tonic it has a take for ({r['progress'].get('resolve')}, synth {r['sfx']['synth']})")
    ev = [dict(f=60, kind='bell', pitch='C#7', id='p:set'), dict(f=150, kind='bell', id='p:free')]
    p, r = run(d, 'bell-far', cues_with(ev), base, NO_EARSHOT)
    check(r is not None and r['sfx']['synth'].get('bell') == 1 and r['sfx']['roles']['bell']['cues'] == 1
          and any('has no take on' in w for w in r['warnings']),
          f"a hand-set note the kit has no take on plays the synth voice with a warning ({r and r['sfx']['synth']})")


def text_chord_kit(d):
    """P2: with the kit, a chain's text fragments step through each chord's tones among the text takes
    (Em9 then Cmaj9 over a G pentatonic): two fragments, two different notes, each a tone of its chord."""
    kit = make_kit(d)
    notes5 = ['G4', 'A4', 'B4', 'D5', 'E5']
    add_role(kit, 'text', 'pluck/kalimba_soft', tone_role(notes5), level_db=-12.0, pitches=notes5)
    ev = [dict(f=60, kind='text', id='a:fragment1'), dict(f=180, kind='text', id='a:fragment2')]
    score = {'key': 'G major', 'bpm': 120, 'music': 'none', 'chords': ['Em9', 'Cmaj9', '-'], 'sfx': {'kit': 'audio/kit.json'}}
    p, r = run(d, 'textchord', cues_with(ev), score, NO_EARSHOT)
    if not r:
        check(False, f'text chain over two chords renders: {p.stderr.strip()[-300:]}')
        return
    notes = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'text']
    pcs = [{4, 7, 11, 2, 6}, {0, 4, 7, 11, 2}]  # Em9, Cmaj9
    check(len(notes) == 2 and notes[0] != notes[1] and all(int(K.to_midi(n)) % 12 in pc for n, pc in zip(notes, pcs))
          and len(r['sfx']['roles']['text']['takes']) == 2,
          f'a text chain over Em9 then Cmaj9 steps through each chord\'s tones on two takes ({notes})')


def band_take(seed, bands):
    """A key take of band-passed noise: bands = [(lo, hi, amplitude)]."""
    from scipy import signal
    r = np.random.default_rng(seed)
    u = np.arange(int(0.05 * SR)) / SR
    x = sum(a * signal.sosfilt(signal.butter(4, [lo, hi], 'band', fs=SR, output='sos'), r.standard_normal(len(u)))
            for lo, hi, a in bands) * np.exp(-u / 0.006)
    return np.concatenate([np.zeros(int(0.008 * SR)), 0.8 * x / np.abs(x).max()])


def typing_bright_kit(d):
    """P2: with a kit the key take sets the timbre: a bright run (centroid over the measured 0.8-3 kHz of
    key clicks) warns and names the take, never a typing style that cannot change it; a dark thock whose
    2-5 kHz share passes the synth voice's 25% (as every recorded key in earshot's bank does) does not warn."""
    kit = make_kit(d)
    ev = typing_events(n_words=3, letters=4, f0=130, step=6)  # 10 chars/s, inside the synth band's resolve bars
    score = {k: v for k, v in SYNTH_SCORE.items() if k != 'payoff'}
    score.update(typing='soft', sfx={'kit': 'audio/kit.json'})
    for name, bands, bright in (('bright', [(2200, 4800, 1.0)], True), ('thock', [(400, 1000, 1.0), (2200, 3800, 0.6)], False)):
        add_role(kit, 'key', f'typing_key/{name}', [(f'{k}.wav', band_take(70 + k, bands), on(0.008), None) for k in range(3)],
                 level_db=-10.0)
        p, r = run(d, name, cues_with(ev), score, NO_EARSHOT)
        w = [x for x in (r or {}).get('warnings', []) if 'is bright' in x]
        run_ = ((r or {}).get('typing') or {}).get('runs') or [{}]
        if bright:
            check(len(w) == 1 and 'key: typing_key/bright' in w[0] and 'use "soft"' not in w[0],
                  f'a bright kit key names the take in its warning ({w or run_ or p.stderr.strip()[-200:]})')
        else:
            check(r is not None and not w and run_[0].get('share_2k_5k_A_pct', 0) > 25 and run_[0].get('centroid_hz', 9e9) < 3000,
                  f"a dark kit thock is not called bright by the synth voice's 2-5 kHz share ({w or run_[0]})")


def land_light_and_levels(d):
    """P3: a kit land.light plays at level_db x weight like every other role (it doubled at weight 1);
    each take is trimmed toward its role's median loudness, so identical audio measured 3 LU apart in the
    lock plays 3 dB apart (and real takes measured apart play level)."""
    import score as SC
    kit = make_kit(d)
    add_role(kit, 'land.light', 'tap/soft', [('1.wav', transient(50), on(), None)], level_db=-8.0)
    same = transient(3)
    add_role(kit, 'hit', 'notify/m0', [('1.wav', same, on(), None), ('2.wav', same, on(), None)], level_db=-3.0,
             lufs=[-20.0, -23.0])
    takes = os.path.join(d, 'audio', 'kit')
    k = K.Kit(K.read_json(os.path.join(takes, K.LOCK), 'lock'), takes, 'current')
    check([t['trim_db'] for t in k.roles['hit']['takes']] == [-1.5, 1.5] and k.roles['hit']['lufs_spread'] == 3.0,
          f"takes are trimmed toward the role's median loudness ({[t['trim_db'] for t in k.roles['hit']['takes']]})")
    cues = cues_with([dict(f=60, kind='land', variant='light', weight=0.9, id='a:dot'), dict(f=120, kind='hit', id='a:h1'),
                      dict(f=240, kind='hit', id='a:h2')])
    song = SC.Song({'key': 'C major', 'music': 'none'}, cues)
    _, placed, _, _ = SC.build_sfx(song, int(6 * SR), cues['events'], {}, {}, k)
    land = next(p for p in placed if p['kind'] == 'land')
    want = SC.KIT_GAIN * 10 ** (-8.0 / 20) * 0.9
    check(abs(land['g'] - want) < 1e-9, f'a kit light landing plays at level_db x weight ({land["g"]:.4f} vs {want:.4f})')
    hits = [p for p in placed if p['kind'] == 'hit']
    lv = [20 * np.log10(np.abs(p['x']).max() * p['g']) for p in hits]
    check(len(hits) == 2 and {p['sample'] for p in hits} == {'hit_1.wav', 'hit_2.wav'} and abs(abs(lv[0] - lv[1]) - 3.0) < 0.01,
          f'identical takes measured 3 LU apart play 3 dB apart ({lv[0]:.2f}, {lv[1]:.2f} dB)')


def kit_tools(d):
    """P3s in kit.py: an invalid key is a KitError (not a traceback); text with 5 notes tunes to the key's
    pentatonic; an earshot on PATH through a symlink (pipx, Homebrew) is used with its own interpreter."""
    sp = os.path.join(d, 'score.json')
    json.dump({'key': 'H major'}, open(sp, 'w'))
    try:
        K.key_of(sp)
        ok = False
    except K.KitError as e:
        ok = 'H major' in str(e)
    check(ok, 'an invalid score.json key is a KitError')
    kit = {'roles': {'text': {'sound': 'pluck/kalimba_soft', 'pitches': ['C5', 'D5', 'E5', 'G5', 'A5']}}}
    K.tune(kit, (7, [0, 2, 4, 5, 7, 9, 11], 'G major'))
    check(kit['roles']['text']['pitches'] == ['G4', 'A4', 'B4', 'D5', 'E5'],
          f"five text notes tune to the key's pentatonic ({kit['roles']['text']['pitches']})")
    if os.name == 'nt':
        print('skip the symlinked-earshot check (POSIX only)')
        return
    venv, bindir = os.path.join(d, 'venv', 'bin'), os.path.join(d, 'bin')
    os.makedirs(venv)
    os.makedirs(bindir)
    for name, body in (('python', 'if [ "$1" = "-c" ]; then echo 0.3.0; fi'), ('earshot', 'exit 0')):
        with open(os.path.join(venv, name), 'w') as fh:
            fh.write('#!/bin/sh\n' + body + '\n')
        os.chmod(os.path.join(venv, name), 0o755)
    os.symlink(os.path.join(venv, 'earshot'), os.path.join(bindir, 'earshot'))
    keep = dict(os.environ)
    try:
        os.environ['PATH'] = bindir + os.pathsep + keep.get('PATH', '')
        os.environ['EARSHOT_PYTHON'] = ''
        exe = sys.executable
        sys.executable = ''  # no "this interpreter" candidate
        es = K.find_earshot()[0]
    finally:
        sys.executable = exe
        os.environ.clear()
        os.environ.update(keep)
    check(es is not None and es.python == os.path.join(venv, 'python'),
          f'an earshot symlinked onto PATH runs with the interpreter beside its target ({es and es.python})')


# ------------------------------------------------------------------------------------------
# av-audit.py against score.py's report and the kit's own sounds
# ------------------------------------------------------------------------------------------
AVAUDIT = os.path.join(HERE, '..', 'av-audit.py')


def av_run(d, name, events, sig, report=None, music=None):
    """av-audit --audio/--stems on a synthetic soundtrack (sig, mono) for `events`; returns (exit, report)."""
    out = os.path.join(d, name)
    os.makedirs(os.path.join(out, 'stems'), exist_ok=True)
    cues = os.path.join(out, 'cues.json')
    json.dump(cues_with(events), open(cues, 'w'))
    st = np.stack([sig, sig], axis=1).astype(np.float32)
    sf.write(os.path.join(out, 'mix.wav'), st, SR, subtype='FLOAT')
    sf.write(os.path.join(out, 'stems', 'sfx.wav'), st, SR, subtype='FLOAT')
    sf.write(os.path.join(out, 'stems', 'pad.wav'), np.zeros_like(st) if music is None else music, SR, subtype='FLOAT')
    rp = os.path.join(out, 'score_report.json')
    json.dump(report or {'events': {'skipped': []}}, open(rp, 'w'))
    os.utime(rp, (os.path.getmtime(cues) + 5, os.path.getmtime(cues) + 5))  # newer than the cues
    js = os.path.join(out, 'av.json')
    p = subprocess.run([sys.executable, AVAUDIT, '--audio', os.path.join(out, 'mix.wav'), '--stems', os.path.join(out, 'stems'),
                        '--cues', cues, '--score-report', rp, '--json', js, '--no-loudness'],
                       capture_output=True, text=True)
    return p, (json.load(open(js)) if os.path.exists(js) else None)


def place(sig, x, f):
    i = int(round(f / FPS * SR))
    sig[i:i + len(x)] += x[:len(sig) - i]


def av_audit(d):
    try:
        import librosa  # noqa: F401
    except ImportError:
        print('skip av-audit checks (librosa is not installed)')
        return
    n = int(300 / FPS * SR)
    hit = transient(5, 0.0, 0.08)
    # 1. a skipped riser shares its frame with the hit it leads into; a soundtrack without that hit must fail
    sig = np.zeros(n)
    place(sig, hit, 60)
    ev = [dict(f=60, kind='click', id='a:c'), dict(f=200, kind='riser', dur=60, id='a:r'), dict(f=200, kind='hit', id='a:h')]
    p, r = av_run(d, 'nohit', ev, sig, {'events': {'skipped': [{'f': 200, 'kind': 'riser', 'role': 'riser'}]}})
    check(p.returncode == 1 and r is not None and any(m['f'] == 200 for m in r['sync']['misses']),
          'av-audit still expects a hit whose frame a skipped riser shares (missing hit fails)'
          + ('' if r else f': {p.stderr.strip()[-300:]}'))
    # 2. a sharp attack on a cue frame is the take's designed transient; the same click off any cue is a click
    sig = np.zeros(n)
    for f in (60, 150):
        sig[int(round(f / FPS * SR))] = 0.5
    p, r = av_run(d, 'clicks', [dict(f=60, kind='tock', id='a:t')], sig)
    cl = (r or {}).get('clicks', [])
    check(r is not None and [c['kind'] for c in cl] == ['attack', 'click'] and cl[0].get('on_cue'),
          f"av-audit counts a sharp attack on a cue frame as the sound's own attack, not a click ({cl})")
    # 3. onsets inside a whoosh's own body are not strays
    sig = np.zeros(n)
    u = np.arange(int(1.0 * SR)) / SR
    swell = np.random.default_rng(8).standard_normal(len(u)) * np.exp(-((u - 0.5) / 0.15) ** 2) * 0.3
    place(sig, swell, 200 - 30)
    for f in (180, 190):
        place(sig, transient(f, 0.0, 0.03) * 0.8, f)
    ev = [dict(f=200, kind='whoosh', dur=60, apexFrac=0.5, id='a:w')]
    p, r = av_run(d, 'whoosh', ev, sig)
    check(r is not None and r['sync'].get('stray_sfx_onsets_f') == [] and r['sync'].get('onsets_inside_long_effects', 0) >= 1,
          f"av-audit does not call onsets inside a whoosh's span strays ({r and r['sync'].get('stray_sfx_onsets_f')})")


def real_earshot(d):
    py = os.environ.get('EARSHOT_PYTHON')
    es = K.find_earshot()[0] if py and py.lower() not in ('none', 'off') else None
    if not es:
        print('skip real earshot render (set EARSHOT_PYTHON to an earshot 0.3+ interpreter)')
        return
    os.makedirs(os.path.join(d, 'audio'), exist_ok=True)
    kit = {'kit': 1, 'name': 'tiny', 'sr': SR, 'roles': {
        'tick': {'sound': 'tap/glass', 'takes': 2, 'align': 'onset', 'level_db': -8.0},
        'whoosh.long': {'sound': 'whoosh_big/swell', 'takes': 1, 'align': 'peak', 'level_db': -7.0}, 'riser': None}}
    path = os.path.join(d, 'audio', 'kit.json')
    K.write_json(path, kit)
    p = subprocess.run([sys.executable, KITPY, 'render', '--kit', path, '--score', os.path.join(d, 'none.json')],
                       capture_output=True, text=True)
    check(p.returncode == 0 and K.kit_state(path, os.path.join(d, 'audio', 'kit'))['status'] == 'current',
          f'kit.py render writes current takes with earshot ({(p.stdout + p.stderr).strip()[-200:]})')
    ev = [dict(f=60, kind='tick', id='a:t1'), dict(f=150, kind='whoosh', dur=60, apexFrac=0.5, id='a:w'),
          dict(f=240, kind='tick', id='a:t2')]
    p, r = run(d, 'real', cues_with(ev), {'key': 'C major', 'music': 'none', 'sfx': {'kit': path}})
    if not r:
        check(False, f'renders with the real kit: {p.stderr.strip()[-300:]}')
        return
    x, _ = sf.read(os.path.join(d, 'real.stems', 'sfx.wav'))
    lock = K.read_json(os.path.join(d, 'audio', 'kit', K.LOCK), 'lock')
    for f in (60, 240):
        off = (onset_near(x, f / FPS, 0.05, 0.05) - f / FPS) * FPS
        check(abs(off) <= 1.0, f'a real tap/glass take lands on frame {f} ({off:+.2f} f)')
    check(r['sfx']['source'] == 'earshot kit' and lock['bank'], f"report names the kit and bank ({r['sfx']['source']}, {lock['bank']})")


def main():
    baseline = sys.argv[sys.argv.index('--baseline') + 1] if '--baseline' in sys.argv else None
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    kit_helpers()
    tests = [('synth_engine', lambda d: synth_engine(d, baseline))] + [(fn.__name__, fn) for fn in (
        kit_engine, fallbacks, stack_guard, music_none, typing_word_kit, stack_drop, progress_kit, text_chord_kit,
        typing_bright_kit, land_light_and_levels, kit_tools, av_audit, real_earshot)]
    for name, fn in tests:
        if only and name not in only:
            continue
        with tempfile.TemporaryDirectory() as d:
            fn(d)
    print(f"score.test.py: {'all checks pass' if not FAILS else f'{len(FAILS)} failed'}")
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
