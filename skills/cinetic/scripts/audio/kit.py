#!/usr/bin/env python3
"""
kit.py: the film's sound kit, made by earshot (a separate, optional tool: docs/setup.md). The effects
of a cinetic film come from audio/kit.json, one earshot bank sound per role: the cue kinds and their
variants (hit, whoosh.short, key, key.space, text, ...). `render` has earshot render every take into
audio/kit/ with its measured onset, peak and end (audio/kit/kit.lock.json), cached; plan.py and score.py
place those takes on the cue frames. The rendered takes stay with the project, so the film rebuilds
where earshot is not installed; with neither, the soundtrack fails its gate (score.py --draft plays
placeholder voices for a timing check, never delivered).

Presets: calm (text-led, effects-only, the default), crisp (energetic, effects-only), minimal (designed,
sub-led, effects-only) and launch (a film cut to a licensed track; earshot 0.4+): every launch role names
its level over the music bed (bed_db), where it sits against the cut (offset_ms), how close a run may go
(min_gap_ms) and, for ticks and bells, its stereo width; the kit-level "mix" block holds the stop-down
ranges. The lock passes all of it through (bed_db, offset_ms, min_gap_ms, width, the takes' l50_lufs and
corr, mix). `init` rewrites the preset's notes into house wording.

Usage (from the project root):
  python3 scripts/audio/kit.py init [--preset calm|crisp|minimal|launch] [--force]
                                   # write audio/kit.json from an earshot preset, tuned to the film's key
  python3 scripts/audio/kit.py cast [--film NAME] [--avoid SOUND,SOUND] [--dry-run]
                                   # give each action of the film (out/cues.json) its own bank sound
  python3 scripts/audio/kit.py real FILE --action ACTION [--licence RECORD]
                                   # a free real effect (music.mjs get --kind sfx) as the takes of an action
  python3 scripts/audio/kit.py tune                 # retune the tonal roles to score.json's key
  python3 scripts/audio/kit.py render [--force]     # audio/kit/*.wav + kit.lock.json (cached)
  python3 scripts/audio/kit.py vendor [--from DIR]  # check (or first copy in) the takes score.py plays
  python3 scripts/audio/kit.py check [--json PATH]  # the rendered kit against kit.json and the film's cues,
                                                    # plus earshot's model-free audit of every take
  python3 scripts/audio/kit.py audition [-o out/qa/kit_audition.wav] [--over-bed]
                                                    # every take, role by role (--over-bed: over 2 s of the
                                                    # film's own edited track, each at its bed_db; no earshot needed)
  python3 scripts/audio/kit.py listen [--json out/qa/kit_listen.json]  # earshot's ears on each role
  python3 scripts/audio/kit.py where                # which earshot is used, and why
Options for every command: --kit audio/kit.json, --takes DIR (default: the kit path without .json,
audio/kit), --score audio/score.json, --cues out/cues.json, --python PY (the earshot interpreter).

Finding earshot, first that works: --python, score.json "sfx.python", $EARSHOT_PYTHON, this
interpreter (import earshot), `earshot` on PATH. It must have sound kits (earshot 0.3 or later; the
launch preset and the mix keys need 0.4).
EARSHOT_PYTHON=none turns earshot off (score.py then plays the rendered takes as they are).
earshot in its own virtualenv: EARSHOT_PYTHON=/path/to/venv/bin/python. earshot from a source
checkout run by another venv: also PYTHONPATH=/path/to/checkout (it is passed through).

Roles: tick, tick.crisp, tock, hit, land, land.light, pop, whoosh.short, whoosh.long, suck, riser,
drop, key, key.space, key.return, click, click.confirm, snap, swell, bell, text. A role set to null is
off (score.py skips its cues and says so); a cue whose role the kit does not name fails the soundtrack's
gate. The effects-only presets keep riser, swell and suck off and give the lockup one clean element.

Cast (after npm run cues, before npm run kit): every event has an action (actions.py: a card landing, a
toggle, typing, a swipe, a logo lock, a transition through a shape ...; its "action" field, else the words of
its id, else its kind's default). Each action of the film gets one bank sound from its own list: the same
action always the same sound, different actions different sounds, and the previous film's signature
sounds avoided (~/.cinetic/sound-history.json). The action that plays a kind most often re-voices that
kind's role (its bed_db, offset_ms and min_gap_ms stay); another action on the same kind gets a role of its
own, "<role>.<action>" (land.card_land). kit.json keeps a "cast" block (the roles' own specs, to cast again);
the history records the film's sounds. Then tune and render. --avoid names sounds this film's listening or plan
judged poorly (masked under the track, flagged by kit.py listen): the cast takes the next member, and remembers.

Real effects (real): where the bank sounds an action weakly, a free effect whose licence needs no credit
(Mixkit's free sound effects, downloaded with `music.mjs get --kind sfx`, its licence record beside it) plays
that action instead: measured (onset, peak, end, loudness), peak-normalised, cut to 2.5 s, written as a take
(audio/kit/real-<role>_1.wav, audio/kit/real.lock.json), with the role's own mix keys. kit.py listen judges it
with earshot's ears like any role; credits.py lists its record.

Tuning (init, tune): roles with `pitches` or `edits.pitch` move to the film's key in their own
register: bell to the key's pentatonic, text to the pentatonic too (the tonic triad when it has 3
notes or fewer; score.py steps a chain through the chord's tones among them), a single pitch to the
nearest tonic;
with earshot found, a tonal hit, drop, bell, text or confirm click with no pitch (struck bells,
plucks, mallets, dings, sub drops, impacts; a cut_hit drop, not a cut_hit hit) gets the tonic nearest its
native note, inside its range. With a track, the key comes from score.json "key", which the track's
analysis fills (track.py analyze reports it).

check also warns when a film with a track has roles without bed_db (they fall back to level_db, which is
calibrated to full scale, not to the bed: give them the bed_db of the launch role of the same kind), and
when a launch kit plays an effects-only film.

Exit codes: 0 done (render also when earshot is missing: it says what score.py will play instead, and a
build never fails only because earshot is missing); 1 a failed check or render, or invalid input; 2 earshot
not found (init, cast, audition and where; tune, vendor, check, real and listen work without it).
"""
import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOCK = 'kit.lock.json'
SOURCE = 'kit.source.json'  # written by render: which kit.json (by digest) the takes in this folder belong to
PRESETS = ('calm', 'crisp', 'minimal', 'launch')
LAUNCH_MIN = (0, 4)  # the earshot version the launch preset and the mix keys need
INSTALL_HINT = ('install earshot 0.4+ in its own virtualenv (https://github.com/Leonxlnx/earshot, README "Install") and '
                'point EARSHOT_PYTHON at that interpreter (cinetic docs/setup.md, "Sound from earshot")')
# a role the kit does not name borrows the nearest one of its family; with none, score.py's synth voice plays
FAMILY = {'tick.crisp': ['tick'], 'land.light': ['land'], 'whoosh.short': ['whoosh.long', 'whoosh'],
          'whoosh.long': ['whoosh.short', 'whoosh'], 'click.confirm': ['click'], 'key.space': ['key'],
          'key.return': ['key.space', 'key'], 'key.back': ['key'], 'key.word': ['key']}
WHOOSH_SHORT_S = 0.5  # s: a move shorter than this takes whoosh.short, a longer one whoosh.long
TUNE_ROLES = ('hit', 'drop', 'bell', 'text', 'click.confirm')  # roles init/tune may give a pitch they lack
TONAL = ('pluck', 'notify', 'pro_notify', 'sub_drop', 'pro_sub_drop', 'impact', 'pro_impact', 'mallet',
         'cut_hit')  # bank categories with a pitch knob (a cut_hit is tuned on the drop, never on the hit)
MIX_KEYS = ('bed_db', 'offset_ms', 'min_gap_ms', 'width')
REPEAT_S = 3.0          # s: a take (the same rendered sound) never plays twice within this, where its role has others
REAL_LOCK = 'real.lock.json'
REAL_MAX_S = 2.5        # s: a real effect is cut to this (a fade over its last 50 ms)
AUDITION_BED_S = 2.0
# earshot's text may say where its numbers came from; a film's kit.json and reports say it in house wording.
# Generic rules (no quoted phrases): a sentence that ties a number to measured clips or films, an instrument
# credited to a film, and noun phrases that count or qualify a set of films; then a note that a file is one of
# the profile's own entries, a count of the set as a subject, the set named outright (and its
# length span), range labels ("refs" and percentile names) and, last, a phrase repeated in brackets right
# after itself (two rules that produced the same house phrase).
HOUSE_WORDING = [
    (r'(?:^|(?<=[.;] ))[^.;]*?\b(?:medians?|measured)\b[^.;]*\b(?:clips|films|videos)\b[^.;]*',
     'The numbers are house numbers for music-led films'),
    (r"\bthe [a-z]+ film'?s (?:[a-z]+ )?(kalimba|marimba|bell|pluck)\b", r'a soft \1'),
    (r'\b(?:a )?profile of \d+ (?:professional |reference )*(?:launch )?(?:films|clips)\b(?: \(medians?\))?',
     'the launch profile'),
    (r'\bvs\.? \d+ (?:professional |reference )*(?:launch )?(?:films|clips)\b', 'vs the launch profile'),
    (r'\b(?:the |a )?(?:\d+ )?(?:bundled |professional |reference )+(?:launch )?(?:films|clips|videos)\b',
     'the launch profile'),
    (r"\bthis file is .{1,60}? of the profile\b[^:]*", "this file is one of the launch profile's own entries, so it "
                                                       'is scored without it'),
    (r'\b\d+ of \d+ (?:references?|films|clips|videos)\b', 'the launch profile tends to'),
    (r'\bthe references? (?:are|is) ([^;.()]*?) ?(?:films|clips|videos)\b', r'the house ranges hold for \1 films'),
    (r'\bthe references\b', 'the house ranges'),
    (r'\brefs? (?:p\d{1,2} ?- ?p\d{1,2} )?(?=[-+]?\d|n\.a\.)', 'house range '),
    (r'\bp\d{1,2} ?(?:-|\.\.) ?p\d{1,2}\b', 'house range'),
    (r'\brefs? median\b', 'house value'),
    (r"(\b\w[\w .'-]{2,60}?) \(\1\)", r'\1'),
]
NOTE_RE = re.compile(r'^([A-Ga-g])([#sb]?)(-?\d+)$')
PITCH_TOL = 0.5  # semitones: an explicit note plays a take only when the take is that note (a quarter tone either way)
LEVEL_TRIM_DB = 6.0  # dB: the per-take loudness trim toward its role's median never moves a take further
PCS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


class KitError(Exception):
    pass


# ------------------------------------------------------------------------------------------
# small helpers
# ------------------------------------------------------------------------------------------
def to_midi(p):
    """A pitch as written in a kit (note name such as "C5" / "C#5" / "Cs5", or Hz as a number or "440hz")
    -> fractional MIDI number; None for null."""
    if p is None:
        return None
    if isinstance(p, (int, float)):
        return 69 + 12 * math.log2(float(p) / 440.0)
    s = str(p).strip()
    m = NOTE_RE.match(s)
    if m:
        acc = {'#': 1, 's': 1, 'b': -1}.get(m.group(2), 0)
        return 12 * (int(m.group(3)) + 1) + PCS[m.group(1).upper()] + acc
    if s.lower().endswith('hz'):
        return 69 + 12 * math.log2(float(s[:-2]) / 440.0)
    return 69 + 12 * math.log2(float(s) / 440.0)


def house_wording(text):
    """earshot text (preset notes, critique lines) rewritten into house wording: where a number came from is
    never quoted"""
    if not isinstance(text, str):
        return text
    for pat, sub in HOUSE_WORDING:
        text = re.sub(pat, sub, text, flags=re.I)
    return text


def house_wording_deep(obj):
    """house_wording over every string in a JSON-like value (dicts, lists), returned as a copy"""
    if isinstance(obj, str):
        return house_wording(obj)
    if isinstance(obj, list):
        return [house_wording_deep(x) for x in obj]
    if isinstance(obj, dict):
        return {k: house_wording_deep(v) for k, v in obj.items()}
    return obj


def version_at_least(v, want):
    try:
        return tuple(int(x) for x in re.findall(r'\d+', str(v))[:2]) >= tuple(want)
    except ValueError:
        return False


def note(m):
    """MIDI number -> note name with sharps, as earshot writes them ("F#4")."""
    k = int(round(m))
    return NAMES[k % 12] + str(k // 12 - 1)


def digest(kit):
    """The identity of a kit's content, independent of formatting and line endings."""
    return hashlib.sha1(json.dumps(kit, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def read_json(path, what):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise KitError(f'{what} not found: {path}') from None
    except json.JSONDecodeError as e:
        raise KitError(f'{what} {path} is not valid JSON ({e})') from None


def write_json(path, obj):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(obj, indent=1, ensure_ascii=False) + '\n')


def takes_dir_for(kit_path, takes=None):
    """The folder of a kit's takes: given, else the kit path without its extension (audio/kit.json -> audio/kit)."""
    return takes or os.path.splitext(kit_path)[0]


def sha1_file(path):
    with open(path, 'rb') as fh:
        return hashlib.sha1(fh.read()).hexdigest()


# ------------------------------------------------------------------------------------------
# finding earshot
# ------------------------------------------------------------------------------------------
PROBE = 'import earshot, earshot.forge.kit; print(earshot.__version__)'


class Earshot:
    """One way to run earshot: `cmd` is the argv prefix of its CLI, `python` the interpreter that has it
    (None for a bare `earshot` executable without a python beside it), `how` where it was found."""

    def __init__(self, how, cmd, python, version):
        self.how, self.cmd, self.python, self.version = how, cmd, python, version

    def __str__(self):
        return f"earshot {self.version or '(version unknown)'} via {self.how} ({' '.join(self.cmd)})"

    def run(self, args, timeout=None):
        """Run an earshot CLI command; returns the CompletedProcess (stdout/stderr as text)."""
        return subprocess.run(self.cmd + list(args), capture_output=True, text=True, encoding='utf-8',
                              errors='replace', timeout=timeout)

    def run_json(self, args, timeout=None):
        """Run a command with --json; returns (returncode, parsed result or None, stderr)."""
        p = self.run(list(args) + ['--json'], timeout)
        out = p.stdout.strip()
        try:
            res = json.loads(out[out.index('{'):]) if '{' in out else None
        except (ValueError, json.JSONDecodeError):
            res = None
        return p.returncode, res, p.stderr.strip()


def _probe_python(py):
    try:
        p = subprocess.run([py, '-c', PROBE], capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, f'{type(e).__name__}: {e}'
    if p.returncode != 0:
        last = (p.stderr.strip().splitlines() or ['no output'])[-1]
        return None, last
    return p.stdout.strip().splitlines()[-1], None


def find_earshot(python=None, score_python=None):
    """The first earshot that has sound kits: --python, score.json sfx.python, $EARSHOT_PYTHON, this
    interpreter, `earshot` on PATH. Returns (Earshot or None, [what was tried and why it failed])."""
    tried = []
    env = os.environ.get('EARSHOT_PYTHON')
    off = bool(env) and env.strip().lower() in ('none', 'off')
    cands = [('--python', python)] + ([] if off else [('score.json sfx.python', score_python), ('EARSHOT_PYTHON', env),
                                                      ('this interpreter', sys.executable)])
    if off:
        tried.append('EARSHOT_PYTHON=none: earshot is not used')
    for how, py in cands:
        if not py:
            continue
        exe = shutil.which(py) or py
        if how != 'this interpreter' and not os.path.exists(exe):
            tried.append(f'{how}: {py} does not exist')
            continue
        ver, why = _probe_python(exe)
        if ver:
            return Earshot(how, [exe, '-m', 'earshot'], exe, ver), tried
        tried.append(f'{how} ({py}): ' + ('no earshot with sound kits: ' + why if why else 'no earshot'))
    exe = None if off else shutil.which('earshot')
    if exe:
        # the interpreter beside the entry point; pipx and Homebrew put a symlink on PATH, so look
        # beside its target first, then beside the link itself
        dirs = list(dict.fromkeys([os.path.dirname(os.path.realpath(exe)), os.path.dirname(exe)]))
        sib = next((os.path.join(d, n) for d in dirs for n in ('python', 'python3', 'python.exe')
                    if os.path.isfile(os.path.join(d, n))), None)
        if sib:
            ver, why = _probe_python(sib)
            if ver:
                return Earshot('PATH', [sib, '-m', 'earshot'], sib, ver), tried
        try:
            ok = subprocess.run([exe, 'kit', '--help'], capture_output=True, text=True, timeout=180).returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            ok = False
        if ok:
            return Earshot('PATH', [exe], None, None), tried
        tried.append(f'PATH: {exe} has no `earshot kit` (earshot 0.3+ needed)')
    elif not off:
        tried.append('PATH: no `earshot` command')
    return None, tried


# ------------------------------------------------------------------------------------------
# the rendered kit: state, loading, picking takes (score.py uses these)
# ------------------------------------------------------------------------------------------
def kit_state(kit_path, takes):
    """How the takes folder stands against kit.json: {'status': current | stale | unchecked | incomplete |
    missing | no-kit, 'why', 'lock', 'kit', 'missing'}. stale = rendered from another kit.json; unchecked =
    rendered outside kit.py (no kit.source.json), the roles' sounds match but edits cannot be compared."""
    st = dict(status='no-kit', why='', lock=None, kit=None, missing=[])
    if not os.path.isfile(kit_path):
        st['why'] = f'no {kit_path}'
        return st
    st['kit'] = kit = read_json(kit_path, 'kit')
    lp = os.path.join(takes, LOCK)
    if not os.path.isfile(lp):
        st.update(status='missing', why=f'no rendered takes ({lp} missing)')
        return st
    st['lock'] = lock = read_json(lp, 'kit lock')
    for r in (lock.get('roles') or {}).values():
        for tk in (r or {}).get('takes') or []:
            if not os.path.isfile(os.path.join(takes, tk['file'])):
                st['missing'].append(tk['file'])
    if st['missing']:
        st.update(status='incomplete', why=f"{len(st['missing'])} take file(s) missing in {takes}")
        return st
    src = os.path.join(takes, SOURCE)
    if os.path.isfile(src):
        same = read_json(src, 'kit source').get('sha1') == digest(kit)
        st.update(status='current' if same else 'stale',
                  why='' if same else f'{kit_path} changed since the takes were rendered')
        return st
    want = {r: (s or {}).get('sound') for r, s in (kit.get('roles') or {}).items()}
    have = {r: (s or {}).get('sound') for r, s in (lock.get('roles') or {}).items()}
    st.update(status='unchecked' if want == have else 'stale',
              why='rendered outside kit.py: role sounds match, edits not compared' if want == have
              else f'the takes in {takes} were rendered from a different kit')
    return st


def read_take(path, sr=48000):
    """A take as float64 at 48 kHz, shape (n,) for mono or (n, 2)."""
    import numpy as np
    import soundfile as sf
    x, fs = sf.read(path, always_2d=True, dtype='float64')
    if fs != sr:
        from math import gcd
        from scipy import signal
        g = gcd(sr, fs)
        x = signal.resample_poly(x, sr // g, fs // g, axis=0)
    x = x[:, :2]
    return x[:, 0].copy() if x.shape[1] == 1 else np.ascontiguousarray(x)


def _loud(v):
    """A take's measured loudness (lufs_m_max) when it is a usable number, else None."""
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v > -70 else None


def _median(xs):
    xs = sorted(xs)
    k = len(xs) // 2
    return xs[k] if len(xs) % 2 else 0.5 * (xs[k - 1] + xs[k])


def take_id(tk):
    """a take's identity: its rendered sound (earshot's take key: sound, seed, pitch, edits), else its file"""
    return tk.get('key') or tk.get('sha1') or tk['file']


def read_real(takes):
    """the real effects of a takes folder (real.lock.json: {"real": 1, "roles": {role: lock role}}), or {}"""
    p = os.path.join(takes, REAL_LOCK)
    if not os.path.isfile(p):
        return {}
    try:
        with open(p, encoding='utf-8') as fh:
            doc = json.load(fh)
    except (OSError, ValueError):
        return {}
    return doc if isinstance(doc, dict) and doc.get('real') == 1 else {}


def event_role(e, fps=60.0, cue=None, roles=None, cast=None):
    """the role one cue event plays in a kit: its action's own role when the kit is cast and has it, else the
    generic role of its kind and variant (role_for)"""
    dur = float(e['dur']) / fps if 'dur' in e else None
    g = role_for(e.get('kind'), e.get('variant'), float(e.get('weight', 1.0)), dur)
    if cast and roles:
        import actions as AC
        a = AC.action_of(e, fps, cue)
        if a and f'{g}.{AC.slug(a)}' in roles:
            return f'{g}.{AC.slug(a)}'
    return g


class Kit:
    """A rendered kit (kit.lock.json + takes) as score.py plays it. roles[role] is None (off) or
    {sound, align, level_db, lufs_spread, takes: [{file, pitch, midi, onset_s, peak_s, end_s, checks,
    trim_db, trim, ...}]}.

    Takes are peak-normalised (-1 dBFS), so their loudness follows their crest: the takes of one role
    can be 3-4 LU apart. Each take carries a trim toward the role's median loudness (from the lock's
    lufs_m_max, at most LEVEL_TRIM_DB either way), so a role plays at one level whichever take a cue
    gets; lufs_spread is the role's spread before the trim. A lock without lufs_m_max trims nothing."""

    def __init__(self, lock, takes, source, cast=None):
        self.lock, self.dir, self.source = lock, takes, source
        self.cast = cast or {}
        self.roles = {}
        self.real = read_real(takes)
        croles = self.cast.get('roles') or {}
        real = {k: v for k, v in (self.real.get('roles') or {}).items()  # a real effect plays the action it was taken for
                if not croles or (croles.get(k) or {}).get('action') in (None, (v or {}).get('action'))}
        for role, r in dict(lock.get('roles') or {}, **real).items():
            if not r:
                self.roles[role] = None
                continue
            tks = []
            for tk in r.get('takes') or []:
                tk = dict(tk)
                tk['midi'] = to_midi(tk.get('pitch'))
                tks.append(tk)
            louds = [x for x in (_loud(t.get('lufs_m_max')) for t in tks) if x is not None]
            med = _median(louds) if louds else None
            for t in tks:
                lv = _loud(t.get('lufs_m_max'))
                d = 0.0 if med is None or lv is None else max(-LEVEL_TRIM_DB, min(LEVEL_TRIM_DB, med - lv))
                t['trim_db'], t['trim'] = round(d, 2), 10 ** (d / 20)
            spread = round(max(louds) - min(louds), 2) if len(louds) > 1 else 0.0
            self.roles[role] = dict(r, takes=tks, lufs_spread=spread) if tks else None
        self.mix = lock.get('mix') or {}  # the kit-level mix block (stop-down ranges, runs, density): earshot 0.4
        self._audio = {}
        self._last = {}
        self._used = {}  # take identity -> the last time it played (pick with t)

    def lookup(self, role):
        """(status, name, spec): ('ok', role or the family member used, spec), ('off', name, None) when the
        kit sets it null, ('missing', None, None) when neither it nor its family is in the kit."""
        for name in [role] + FAMILY.get(role, []):
            if name in self.roles:
                return ('ok', name, self.roles[name]) if self.roles[name] else ('off', name, None)
        return 'missing', None, None

    def cast_role(self, e, generic, fps=60.0, cue=None):
        """(role, action) of one cue event in a cast kit: the action's own role "<generic>.<action>" when the kit
        has it, else None (the generic role plays: it carries the kind's main action); (None, None) uncast."""
        if not self.cast:
            return None, None
        import actions as AC
        a = AC.action_of(e, fps, cue)
        if a is None:
            return None, None
        name = f'{generic}.{AC.slug(a)}'
        return (name if name in self.roles else None), a

    def audio(self, tk):
        if tk['file'] not in self._audio:
            self._audio[tk['file']] = read_take(os.path.join(self.dir, tk['file']))
        return self._audio[tk['file']]

    def notes(self, name):
        """The distinct notes (MIDI) of role `name`'s pitched takes, low to high ([] for an untuned role)."""
        r = self.roles.get(name)
        return sorted({round(t['midi'], 3) for t in (r or {}).get('takes', []) if t['midi'] is not None})

    def covers(self, name, target):
        """Whether role `name` can sound the explicit note `target`: an untuned role plays its takes as
        they are; a pitched one needs a take within PITCH_TOL of the note."""
        ns = self.notes(name)
        return target is None or not ns or min(abs(m - target) for m in ns) <= PITCH_TOL

    def pick(self, name, key, target=None, explicit=False, index=None, t=None):
        """One take of role `name`, or None when an explicit note has no take (see covers()). Pitched
        roles first choose the pitch: an explicit target (a progress rung, a motif note, a text step) takes
        the take on that note; a derived one the nearest pitch class (the kit keeps its register). Among
        the takes left, `index` (a key's identity) or a stable hash of `key` (the event's id and frame)
        picks one, never the same file twice in a row for a role that has more. With `t` (the cue's time,
        s, cues in time order) and no index: the take least recently played, never one heard within REPEAT_S
        while the role has another (a take is its rendered sound: two roles cast with one sound share it)."""
        import zlib
        tks = self.roles[name]['takes']
        pitched = [t for t in tks if t['midi'] is not None]
        if pitched and target is not None:
            if explicit:
                best = min(pitched, key=lambda t: (abs(t['midi'] - target), t['midi']))
                if abs(best['midi'] - target) > PITCH_TOL:
                    return None  # a neighbouring note would be a wrong note: the caller plays its synth voice
            else:
                pc = lambda t: min((t['midi'] - target) % 12, (target - t['midi']) % 12)  # noqa: E731
                best = min(pitched, key=lambda t: (round(pc(t), 6), abs(t['midi'] - target)))
            tks = [t for t in pitched if abs(t['midi'] - best['midi']) < 1e-6]
        k = (index if index is not None else zlib.crc32(str(key).encode())) % len(tks)
        if t is not None and index is None and len(tks) > 1:
            order = tks[k:] + tks[:k]
            fresh = [x for x in order if t - self._used.get(take_id(x), -1e9) >= REPEAT_S - 1e-9]
            choice = min(fresh or order, key=lambda x: (self._used.get(take_id(x), -1e9), order.index(x)))
            self._used[take_id(choice)] = t
            self._last[name] = choice['file']
            return choice
        if len(tks) > 1 and self._last.get(name) == tks[k]['file']:
            k = (k + 1) % len(tks)
        self._last[name] = tks[k]['file']
        if t is not None:
            self._used[take_id(tks[k])] = t
        return tks[k]

    def last_heard(self, tk):
        """when the take's sound last played (pick with t), or None"""
        return self._used.get(take_id(tk))

    def warnings(self, roles=None):
        """The audit warnings earshot stored per take (rising glide, stacked attacks, ...), for `roles`."""
        out = []
        for role, r in self.roles.items():
            if not r or (roles is not None and role not in roles):
                continue
            codes = sorted({c for t in r['takes'] for c in (t.get('checks') or [])})
            if codes:
                out.append((role, r['sound'], codes))
        return out


def resolve(engine, kit_path, takes=None, python=None, log=None):
    """The kit score.py plays, in the fallback order: earshot (render when the takes are stale or missing,
    cached) -> the rendered takes as they are (vendored) -> None (synth voices). Returns (Kit or None,
    info): info = {engine, source, kit, takes, notes, warnings, earshot}. Raises KitError only when engine
    is "earshot" and no kit can be played."""
    takes = takes_dir_for(kit_path, takes)
    info = dict(engine=engine, source='synth', kit=kit_path, takes=takes, notes=[], warnings=[], earshot=None)
    if engine == 'synth':
        info['source'] = 'synth (sfx.engine)'
        return None, info
    st = kit_state(kit_path, takes)
    rendered = False
    if st['status'] == 'no-kit':
        why = f'no kit file {kit_path} (python3 scripts/audio/kit.py init writes one)'
    elif st['status'] in ('current', 'unchecked'):
        why = None
    else:
        es, tried = find_earshot(None, python)
        if es:
            info['earshot'] = str(es)
            if log:
                log(f'kit: {st["why"]}; rendering with {es}')
            try:
                render_kit(es, kit_path, takes)
                rendered = True
                st = kit_state(kit_path, takes)
            except KitError as e:
                info['warnings'].append(f'kit render failed: {e}')
        elif st['status'] != 'missing':
            info['warnings'].append(f"{st['why']}; earshot is not available to render it again "
                                    f"({'; '.join(tried)}): playing the takes as they are")
        why = None if st['status'] in ('current', 'unchecked', 'stale') and st['lock'] else (
            st['why'] + ('' if es else '; earshot not found (' + '; '.join(tried) + ')'))
    if why is None and st['lock']:
        kit = Kit(st['lock'], takes, st['status'], cast=(st['kit'] or {}).get('cast'))
        info['source'] = 'earshot kit (rendered now)' if rendered else (
            'earshot kit' if st['status'] == 'current' else f"vendored kit ({st['status']})")
        info['bank'], info['earshot_version'], info['name'] = st['lock'].get('bank'), st['lock'].get('earshot'), \
            st['lock'].get('name')
        if st['status'] == 'unchecked':
            info['notes'].append(st['why'])
        return kit, info
    if engine == 'earshot':
        raise KitError(f'sfx.engine is "earshot" but no kit can be played: {why}. {INSTALL_HINT}')
    info['source'] = 'synth (fallback)'
    info['warnings'].append(f'blind synthesis fallback: {why}. The effects are synth voices nobody listened to; '
                            f'{INSTALL_HINT}, then run `python3 scripts/audio/kit.py render` (npm run kit)')
    return None, info


# ------------------------------------------------------------------------------------------
# commands
# ------------------------------------------------------------------------------------------
def render_kit(es, kit_path, takes, force=False):
    """earshot kit render, then record which kit.json the takes belong to. Returns earshot's result."""
    args = ['kit', 'render', kit_path, '--out', takes] + (['--force'] if force else [])
    code, res, err = es.run_json(args)
    if code != 0 or res is None:
        raise KitError(f'earshot kit render failed (exit {code}): {err.splitlines()[-1] if err else "no output"}')
    write_json(os.path.join(takes, SOURCE), dict(kit=kit_path.replace(os.sep, '/'), sha1=digest(read_json(kit_path, 'kit')),
                                                 earshot=res.get('earshot'), bank=res.get('bank')))
    return res


def key_of(score_path):
    """(tonic pitch class, mode intervals, key text) from score.json's "key", or None without a score."""
    if not score_path or not os.path.isfile(score_path):
        return None
    sys.path.insert(0, HERE)
    import score as SC  # the key grammar and modes score.py itself uses
    text = str(read_json(score_path, 'score').get('key', 'C major'))
    parts = text.split()
    mode = parts[1].lower() if len(parts) > 1 else 'major'
    if mode not in SC.MODES:
        raise KitError(f'score.json key "{text}": unknown mode')
    try:
        if not parts:
            raise ValueError('no tonic (write it as "G major")')
        return SC.D.pitch_class(parts[0]), SC.MODES[mode], text
    except (ValueError, KeyError) as e:
        raise KitError(f'score.json key "{text}": {e}') from None


def nearest_pc(pc, m):
    """The note of pitch class pc nearest MIDI m (ties go down)."""
    base = int(round(m))
    return min((base + d for d in range(-6, 7) if (base + d) % 12 == pc), key=lambda x: (abs(x - m), x))


def tune(kit, key, knobs=None):
    """Move the tonal roles of a kit dict to (tonic, mode) in place; returns [(role, before, after)].
    knobs: {sound id: bank knobs} from `earshot sfx list` (adds a pitch to tonal roles that have none)."""
    tonic, iv = key[0], key[1]
    minor = iv[2] == 3
    scale = [(tonic + i) % 12 for i in iv]
    penta = [(tonic + i) % 12 for i in ([0, 3, 5, 7, 10] if minor else [0, 2, 4, 7, 9])]
    triad = [(tonic + i) % 12 for i in ([0, 3, 7] if minor else [0, 4, 7])]
    changes = []

    def span(sound):
        """The sound's playable MIDI range from the bank's knobs, or None."""
        kp = ((knobs or {}).get(sound) or {}).get('pitch') or {}
        return tuple(to_midi(f) for f in kp['range_hz']) if kp.get('range_hz') else None

    def fit(ms, rng):
        """The notes moved by whole octaves into the sound's range, as far as they fit (earshot refuses a
        pitch outside it: D3 on mallet/pluck, whose f0 starts at 150 Hz)."""
        if rng:
            while min(ms) < rng[0] - 1e-6 and max(ms) + 12 <= rng[1] + 1e-6:
                ms = [m + 12 for m in ms]
            while max(ms) > rng[1] + 1e-6 and min(ms) - 12 >= rng[0] - 1e-6:
                ms = [m - 12 for m in ms]
        return ms
    for role, spec in (kit.get('roles') or {}).items():
        if not spec:
            continue
        ed = spec.get('edits') or {}
        if spec.get('pitches'):
            old = [to_midi(p) for p in spec['pitches']]
            # text steps through each chord's tones, so it wants the key's pentatonic (the tones most
            # chords of the key share); a kit with only 3 text notes keeps the tonic triad
            pcs = penta if role == 'bell' or (role == 'text' and len(old) > 3) else triad if role == 'text' else scale
            m = nearest_pc(tonic, min(old))
            ms = []
            while len(ms) < len(old):
                if m % 12 in pcs:
                    ms.append(m)
                m += 1
            new = [note(x) for x in fit(ms, span(spec.get('sound', '')))]
            if new != list(spec['pitches']):
                changes.append((role, list(spec['pitches']), new))
                spec['pitches'] = new
        elif ed.get('pitch') is not None:
            new = note(fit([nearest_pc(tonic, to_midi(ed['pitch']))], span(spec.get('sound', '')))[0])
            if new != ed['pitch']:
                changes.append((role, ed['pitch'], new))
                ed['pitch'] = new
        elif knobs and any(role == r or role.startswith(r + '.') for r in TUNE_ROLES) \
                and spec.get('sound', '').split('/')[0] in TONAL \
                and not (role == 'hit' and spec.get('sound', '').startswith('cut_hit/')):
            kp = (knobs.get(spec['sound']) or {}).get('pitch')
            if not kp:
                continue
            lo, hi = (to_midi(f) for f in kp['range_hz'])
            m = nearest_pc(tonic, to_midi(kp['native_hz']))
            for alt in (m, m + 12, m - 12):
                if lo <= alt <= hi:
                    spec['edits'] = dict(ed, pitch=note(alt))
                    changes.append((role, None, note(alt)))
                    break
    return changes


def bank_knobs(es):
    """{sound id: knobs} from `earshot sfx list --json`; {} when it cannot be read."""
    code, res, _ = es.run_json(['sfx', 'list'])
    rows = res.get('sounds') if isinstance(res, dict) else None
    if code != 0 or not rows:
        return {}
    return {r['id']: r.get('knobs') or {} for r in rows}


def role_for(kind, variant=None, weight=1.0, dur_s=None):
    """The kit role a cue plays (score.py and `check` share this mapping): variants pick their role, a
    landing under weight 0.6 is light, a whoosh shorter than WHOOSH_SHORT_S is short."""
    if kind == 'tick':
        return 'tick.crisp' if variant == 'crisp' else 'tick'
    if kind == 'land':
        return 'land' if weight >= 0.6 and variant != 'light' else 'land.light'
    if kind == 'whoosh':
        d = min(3.0, max(0.15, dur_s if dur_s is not None else 0.45 + 0.35 * weight))  # score.py's whoosh length
        return 'whoosh.short' if d < WHOOSH_SHORT_S else 'whoosh.long'
    if kind == 'click':
        return 'click.confirm' if variant == 'confirm' else 'click'
    if kind == 'key':
        return {'space': 'key.space', 'return': 'key.return'}.get(variant, 'key')
    return kind


def cue_kinds(cues_path, roles=None, cast=None):
    """{role: count} of the film's cues (out/cues.json), or None without the file (a cast kit: each event's
    action role where the kit has one)."""
    if not cues_path or not os.path.isfile(cues_path):
        return None
    doc = read_json(cues_path, 'cues')
    fps = float(doc.get('fps', 60))
    out = {}
    for e in doc.get('events', []):
        role = event_role(e, fps, doc.get('cue'), roles, cast)
        out[role] = out.get(role, 0) + 1
    return out


def cmd_where(a, score_python):
    es, tried = find_earshot(a.python, score_python)
    for t in tried:
        print(f'  not used: {t}')
    if es:
        print(f'kit: {es}' + ('' if version_at_least(es.version, LAUNCH_MIN) else
                              ' (the launch preset and the mix keys need earshot 0.4 or later)'))
        return 0
    print(f'kit: earshot not found. {INSTALL_HINT}')
    return 2


def need_earshot(a, score_python):
    es, tried = find_earshot(a.python, score_python)
    if not es:
        print('kit.py: earshot not found (' + '; '.join(tried) + f').\n  {INSTALL_HINT}', file=sys.stderr)
    return es


def cmd_init(a, score_python):
    es = need_earshot(a, score_python)
    if not es:
        return 2
    if a.preset == 'launch' and es.version and not version_at_least(es.version, LAUNCH_MIN):
        print(f'kit.py: the launch preset needs earshot 0.4 or later ({es}); {INSTALL_HINT}', file=sys.stderr)
        return 2
    if os.path.exists(a.kit) and not a.force:
        print(f'kit.py: {a.kit} exists (--force replaces it)', file=sys.stderr)
        return 1
    p = es.run(['kit', 'init', '--preset', a.preset, '-o', a.kit, '--force'])
    if p.returncode != 0:
        print(f'kit.py: earshot kit init failed: {house_wording(p.stderr.strip() or p.stdout.strip())}', file=sys.stderr)
        return 1
    print(house_wording(p.stdout.strip()))
    kit = read_json(a.kit, 'kit')
    clean = house_wording_deep(kit)
    if clean != kit:
        write_json(a.kit, clean)
        print('kit: notes in house wording')
    return tune_file(a, bank_knobs(es))


def tune_file(a, knobs=None):
    key = key_of(a.score)
    if key is None:
        print(f'kit: no {a.score}: tonal roles keep their notes (run `kit.py tune` once the key is set)')
        return 0
    kit = read_json(a.kit, 'kit')
    ch = tune(kit, key, knobs)
    if ch:
        write_json(a.kit, kit)
    print(f'kit: tuned to {key[2]}: ' + ('; '.join(f'{r} {b or "native"} -> {n}' for r, b, n in ch) if ch
                                          else 'every tonal role already in key'))
    return 0


def cmd_render(a, score_python):
    es, tried = find_earshot(a.python, score_python)
    if not es:  # never a failed build only because earshot is missing: say what score.py will play instead
        st = kit_state(a.kit, a.takes)
        plays = (f"the takes already in {a.takes} ({st['status']})" if st['lock'] and st['status'] != 'incomplete'
                 else 'its synth voices (blind synthesis fallback)')
        print(f"kit: earshot not found ({'; '.join(tried)}); score.py will play {plays}.")
        print(f'  {INSTALL_HINT}')
        return 0
    res = render_kit(es, a.kit, a.takes, a.force)
    print(res.get('summary', 'rendered'))
    return 0


def cmd_vendor(a):
    if a.source:
        src_lock = os.path.join(a.source, LOCK)
        lock = read_json(src_lock, 'kit lock')
        os.makedirs(a.takes, exist_ok=True)
        n = 0
        for r in (lock.get('roles') or {}).values():
            for tk in (r or {}).get('takes') or []:
                shutil.copy2(os.path.join(a.source, tk['file']), os.path.join(a.takes, tk['file']))
                n += 1
        for f in (LOCK, SOURCE):
            if os.path.isfile(os.path.join(a.source, f)):
                shutil.copy2(os.path.join(a.source, f), os.path.join(a.takes, f))
        print(f'kit: copied {n} takes from {a.source}')
    st = kit_state(a.kit, a.takes)
    if not st['lock']:
        print(f"kit: nothing vendored: {st['why']}", file=sys.stderr)
        return 1
    bad, size, n = [], 0, 0
    for r in (st['lock'].get('roles') or {}).values():
        for tk in (r or {}).get('takes') or []:
            p = os.path.join(a.takes, tk['file'])
            n += 1
            if not os.path.isfile(p):
                bad.append(f"{tk['file']} missing")
            elif tk.get('sha1') and sha1_file(p) != tk['sha1']:
                bad.append(f"{tk['file']} differs from the lock")
            else:
                size += os.path.getsize(p)
    if bad:
        print(f'kit: {len(bad)} problem(s) in {a.takes}: ' + '; '.join(bad[:8]), file=sys.stderr)
        return 1
    tail = {'current': 'current for ' + a.kit, 'unchecked': 'rendered outside kit.py (role sounds match ' + a.kit + ')',
            'stale': 'STALE: ' + st['why'] + ' (kit.py render with earshot brings it up to date)'}[st['status']]
    print(f'kit: {a.takes} holds {n} takes ({size / 1e6:.1f} MB), {tail}. Keep {a.takes}/ with the project: it is what '
          'score.py plays where earshot is not installed.')
    return 0 if st['status'] != 'stale' else 1


def cmd_check(a, score_python):
    """The kit against itself, the film and earshot's audit. Exit 1 on a problem."""
    rep = dict(kit=a.kit, takes=a.takes, problems=[], notes=[], roles={})
    st = kit_state(a.kit, a.takes)
    rep['status'] = st['status']
    if st['status'] == 'no-kit':
        rep['problems'].append(st['why'])
    elif st['status'] != 'current':
        (rep['notes'] if st['status'] == 'unchecked' else rep['problems']).append(st['why'])
    kit = st['kit'] or {}
    roles = kit.get('roles') or {}
    used = cue_kinds(a.cues, roles, kit.get('cast'))
    music = None
    if os.path.isfile(a.score):
        try:
            music = read_json(a.score, 'score').get('music')
        except KitError:
            music = None
    has_track = isinstance(music, dict) or (isinstance(music, str) and music not in ('none', 'synth'))
    if has_track:
        flat = sorted(r for r, sp in roles.items() if sp and sp.get('bed_db') is None and (used is None or r in used))
        if flat:
            rep['notes'].append(f"a film with a track: {', '.join(flat)} ha{'s' if len(flat) == 1 else 've'} no bed_db, so "
                                'levels fall back to level_db (calibrated to full scale, not to the bed): give each the bed_db of '
                                'the launch role of the same kind (kit.py init --preset launch shows them)')
    elif kit.get('name') == 'launch' or any((sp or {}).get('bed_db') is not None for sp in roles.values()):
        rep['notes'].append('the launch kit is for films cut to a track: with "music": "none" its roles play at level_db '
                            '(use calm, crisp or minimal for an effects-only film)')
    if used is not None:
        for role, n in sorted(used.items()):
            name = next((x for x in [role] + FAMILY.get(role, []) if x in roles), None)
            if name is None:
                rep['problems'].append(f'{n} {role} cue(s): the kit has no {role} role: give it one (every effect is a kit '
                                       'take; the soundtrack fails its gate otherwise)')
            elif roles[name] is None:
                rep['notes'].append(f'{n} {role} cue(s): {name} is off in the kit, so score.py skips them')
            rep['roles'][role] = dict(cues=n, role=name, sound=(roles.get(name) or {}).get('sound') if name else None)
    if st['lock']:
        for role, sound, codes in Kit(st['lock'], a.takes, st['status'], cast=kit.get('cast')).warnings():
            msg = f'{role} ({sound}): ' + ', '.join(codes)
            if 'rising_glide' in codes:
                msg += ' (a rising pitch glide reads as a cheap synth whip: pick another sound)'
            (rep['problems'] if used is None or role in (used or {}) else rep['notes']).append(msg)
    es, tried = find_earshot(a.python, score_python)
    if es and st['status'] != 'no-kit':
        code, res, err = es.run_json(['kit', 'check', a.kit] + (['--out', a.takes] if st['lock'] else []))
        res = house_wording_deep(res) if res else res
        if res:
            rep['earshot'] = dict(ok=res.get('ok'), summary=res.get('summary'), notes=res.get('notes'))
            if not res.get('ok'):
                rep['problems'].append('earshot kit check: ' + str(res.get('summary')))
            rep['notes'] += [f'earshot: {n}' for n in res.get('notes') or []]
        else:
            rep['problems'].append(f'earshot kit check failed: {err.splitlines()[-1] if err else code}')
    else:
        rep['notes'].append('earshot not found: the takes were not audited again (' + '; '.join(tried) + ')')
    rep['ok'] = not rep['problems']
    if a.json:
        write_json(a.json, rep)
    print(f"kit check: {'ok' if rep['ok'] else 'PROBLEMS'}  {a.kit} ({st['status']})"
          + (f"; the film's cues use {len(rep['roles'])} roles" if rep['roles'] else ''))
    if rep.get('earshot'):
        print(f"  earshot: {rep['earshot']['summary']}")
    for p in rep['problems']:
        print(f'  problem: {p}')
    for n in rep['notes']:
        print(f'  note: {n}')
    return 0 if rep['ok'] else 1


def cmd_audition_over_bed(a):
    """every take of each role over AUDITION_BED_S of the film's own edited track, at the gain the plan gives it
    (bed_db over that bed; level_db for a role without one), in out/qa/kit_audition.wav (git-ignored: it holds the
    track) with an index beside it. No earshot needed: the rendered takes and audio/music/edit.json."""
    import numpy as np
    import soundfile as sf
    sys.path.insert(0, HERE)
    import mixkeys as MK
    import score as SC
    st = kit_state(a.kit, a.takes)
    if not st['lock']:
        print(f"kit.py: no rendered takes ({st['why']}): npm run kit", file=sys.stderr)
        return 1
    try:
        score = read_json(a.score, 'score')
        cues = read_json(a.cues, 'cues') if os.path.isfile(a.cues) else dict(fps=60, bpm=120, total=600, cue={}, events=[])
        song = SC.Song(score, cues)
        if not song.has_music:
            print('kit.py: --over-bed needs a film with a track (score.json music); without one, audition plays the takes '
                  'against a nominal bed', file=sys.stderr)
            return 1
        bed, edit = SC.load_music(song, os.path.dirname(os.path.abspath(a.score)), int((max(song.dur, 4) + 4) * MK.SR))
    except (SC.ScoreError, KitError) as e:
        print(f'kit.py: {e}', file=sys.stderr)
        return 1
    down = ((edit or {}).get('film') or {}).get('downbeats') or [0.25]
    rv = ((edit or {}).get('reveal') or {}).get('film_s')
    t0 = float(rv if rv is not None else down[min(len(down) - 1, len(down) // 2)])
    seg = bed[int(t0 * MK.SR):int((t0 + AUDITION_BED_S) * MK.SR)]
    if len(seg) < int(AUDITION_BED_S * MK.SR) // 2:
        seg = bed[:int(AUDITION_BED_S * MK.SR)]
    kit = Kit(st['lock'], a.takes, st['status'], cast=(st['kit'] or {}).get('cast'))
    parts, index, t = [], [], 0.0
    gap = np.zeros((int(0.3 * MK.SR), 2))
    for role, r in kit.roles.items():
        if not r:
            continue
        for tk in r['takes']:
            y = seg.copy()
            lv = MK.bed_level(y, 1.0)
            g = MK.gain_db(tk, r, lv)
            x = kit.audio(tk)
            x = np.stack([x, x], 1) if x.ndim == 1 else x
            at = int(round((1.0 - tk.get(r.get('align', 'onset') + '_s', 0.0)) * MK.SR))
            m = min(len(x), len(y) - max(0, at))
            y[max(0, at):max(0, at) + m] += x[:m] * 10 ** (g / 20)
            index.append(f"{t + 1.0:8.3f}  {role:14s} {r['sound']:26s} {tk['file']}  gain {g:+.1f} dB"
                         + (f" (bed_db {r['bed_db']:g} over {lv:.1f} LUFS)" if r.get('bed_db') is not None and lv is not None else ' (level_db)'))
            parts += [y, gap]
            t += len(y) / MK.SR + 0.3
    if not parts:
        print('kit.py: the kit sounds no role', file=sys.stderr)
        return 1
    out = np.concatenate(parts)
    pk = float(np.abs(out).max())
    if pk > 10 ** (-1 / 20):
        out *= 10 ** (-1 / 20) / pk
    os.makedirs(os.path.dirname(os.path.abspath(a.output)) or '.', exist_ok=True)
    sf.write(a.output, out.astype(np.float32), MK.SR, subtype='PCM_24')
    with open(os.path.splitext(a.output)[0] + '.txt', 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(index) + '\n')
    print(f'kit: wrote {a.output}: {len(index)} takes over {AUDITION_BED_S:g} s of the film\'s bed from {t0:.2f} s (index in '
          f'{os.path.splitext(a.output)[0]}.txt); it holds the track: keep it out of git (out/ is ignored)')
    return 0


def cmd_audition(a, score_python):
    if getattr(a, 'over_bed', False):
        return cmd_audition_over_bed(a)
    es = need_earshot(a, score_python)
    if not es:
        return 2
    os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
    code, res, err = es.run_json(['kit', 'audition', a.kit, '-o', a.output, '--out', a.takes])
    if code != 0 or res is None:
        print(f'kit.py: earshot kit audition failed: {err.splitlines()[-1] if err else code}', file=sys.stderr)
        return 1
    print(house_wording(res.get('summary')))
    return 0


def bank_rows(es):
    """{sound id: row} from `earshot sfx list --json` (ids, kinds, knobs); {} when it cannot be read."""
    code, res, _ = es.run_json(['sfx', 'list'])
    rows = res.get('sounds') if isinstance(res, dict) else None
    return {r['id']: r for r in rows} if code == 0 and rows else {}


def project_of(kit_path):
    """the film a kit belongs to: the folder above audio/ (audio/kit.json -> the project root)"""
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(kit_path)), os.pardir)).replace(os.sep, '/')


def cmd_cast(a, score_python):
    """each action of the film its own bank sound (actions.py), written into kit.json, the history updated, then
    tuned; --dry-run prints the cast only"""
    import actions as AC
    if not os.path.isfile(a.cues):
        print(f'kit.py: no {a.cues}: export the cues first (npm run cues)', file=sys.stderr)
        return 1
    doc = read_json(a.cues, 'cues')
    kit = read_json(a.kit, 'kit')
    es = need_earshot(a, score_python)
    if not es:
        return 2
    rows = bank_rows(es)
    if not rows:
        print('kit.py: could not read the bank (earshot sfx list): nothing cast', file=sys.stderr)
        return 1
    knobs = {k: (v.get('knobs') or {}) for k, v in rows.items()}
    film = a.film or project_of(a.kit)
    hist = AC.read_history()
    avoid = [x.strip() for x in (a.avoid or '').split(',') if x.strip()]
    unknown = [x for x in avoid if x not in knobs]
    if unknown:
        print(f"kit.py: --avoid: not bank sounds: {', '.join(unknown)}", file=sys.stderr)
        return 1
    new, rep = AC.cast(doc.get('events', []), kit, float(doc.get('fps', 60)), doc.get('cue') or {}, hist, film, knobs,
                       role_for, avoid)
    print(f"kit cast: {len(rep['actions'])} action(s) for {film}"
          + (f" (the previous film: {rep['previous']})" if rep['previous'] else ' (no previous film in the history)'))
    for act, r in sorted(rep['actions'].items(), key=lambda x: -x[1]['events']):
        print(f"  {act:10s} {r['events']:3d} event(s)  {r['sound']:28s} roles {', '.join(r['roles'])}"
              + (f"  (avoided {', '.join(r['avoided'])})" if r['avoided'] else ''))
    for name, r in sorted(rep['roles'].items()):
        if r['was'] != r['sound']:
            print(f"  role {name}: {r['was']} -> {r['sound']}")
    print(f"  signature: {', '.join(rep['signature'])}")
    for act, words in sorted((rep.get('weak') or {}).items()):
        print(f'  note: the bank sounds {act} weakly (no member wins earshot\'s forced choice against cheap-synth '
              f'alternatives): a real effect: node scripts/music.mjs search --kind sfx --mood "{words}", then get \'#n\' '
              f'--kind sfx --to audio/sfx and python3 scripts/audio/kit.py real audio/sfx/<file> --action {act}')
    if a.dry_run:
        print('kit cast: --dry-run: audio/kit.json and the history unchanged')
        return 0
    write_json(a.kit, new)
    AC.write_history(AC.record(hist, film, rep))
    tune_file(a, knobs)
    print(f'kit cast: wrote {a.kit} and {AC.history_path()}; next: npm run kit (render), kit.py listen (judge), npm run plan')
    return 0


def measure_take(x, sr=48000):
    """onset, loudest 5 ms, end (the last 5 ms within 50 dB of it), length, peak and loudness of a take, the way
    earshot's lock records them"""
    import numpy as np
    sys.path.insert(0, HERE)
    import mixkeys as MK
    m = np.abs(x if x.ndim == 1 else x.max(axis=1))
    pk = float(m.max()) if len(m) else 0.0
    w = max(1, int(0.005 * sr))
    env = np.sqrt(np.convolve(m * m, np.ones(w) / w, mode='same'))
    top = float(env.max()) if len(env) else 0.0
    onset = int(np.argmax(m >= 0.1 * pk)) if pk > 0 else 0
    peak = int(np.argmax(env)) if top > 0 else 0
    loud = np.nonzero(env >= top * 10 ** (-50 / 20))[0] if top > 0 else np.array([0])
    return dict(onset_s=round(onset / sr, 4), peak_s=round(peak / sr, 4), end_s=round(int(loud[-1]) / sr, 4),
                dur_s=round(len(m) / sr, 4), peak_db=round(20 * math.log10(max(pk, 1e-9)), 2),
                lufs_m_max=round(MK.loud_lufs(x, sr, int(0.4 * sr)), 2), l50_lufs=round(MK.loud_lufs(x, sr), 2))


def cmd_real(a):
    """a free real effect (its licence record beside it) as three takes of the role that plays its action"""
    import numpy as np
    import soundfile as sf
    from scipy import signal
    import actions as AC
    sys.path.insert(0, HERE)
    import credits as CR
    if not a.file or not os.path.isfile(a.file):
        print(f'kit.py: real needs the effect file (music.mjs get --kind sfx downloads one): {a.file}', file=sys.stderr)
        return 1
    act = AC.ALIASES.get(a.action or '', a.action)
    if act not in AC.ACTIONS:
        print(f"kit.py: --action is one of {', '.join(AC.ACTIONS)}", file=sys.stderr)
        return 1
    rec_path = a.licence or os.path.splitext(a.file)[0] + '.licence.json'
    try:
        rec = CR.read_json(rec_path)
    except CR.CreditError as e:
        print(f'kit.py: {e} (music.mjs get --kind sfx writes the record beside the file)', file=sys.stderr)
        return 1
    probs, _ = CR.check_record(rec, rec_path, a.file)
    if rec.get('kind') != 'sfx':
        probs.append('not a sound-effect record ("kind": "sfx")')
    if rec.get('credit_required'):
        probs.append('its licence asks for a credit: a film plays only effects that need none')
    if probs:
        for x in probs:
            print(f'  problem: {x}', file=sys.stderr)
        print('kit.py: real: refused (the licence record)', file=sys.stderr)
        return 1
    kit = read_json(a.kit, 'kit')
    cast = kit.get('cast') or {}
    names = [n for n, r in (cast.get('roles') or {}).items() if r.get('action') == act]
    if not names:
        have = sorted({r.get('action') for r in (cast.get('roles') or {}).values()})
        print(f"kit.py: no role of the cast plays {act}: cast the kit first (kit.py cast)"
              + (f"; this film's actions: {', '.join(have)}" if have else ''), file=sys.stderr)
        return 1
    try:
        x = read_take(a.file)
    except Exception as e:  # noqa: BLE001 (soundfile reads WAV, FLAC and OGG; an MP3 may need converting)
        print(f'kit.py: cannot read {a.file} ({e}): convert it to WAV (ffmpeg -i in.mp3 out.wav)', file=sys.stderr)
        return 1
    m = np.abs(x if x.ndim == 1 else x.max(axis=1))
    pk = float(m.max()) if len(m) else 0.0
    if pk < 1e-5:
        print(f'kit.py: {a.file} is silent', file=sys.stderr)
        return 1
    start = max(0, int(np.argmax(m >= 0.01 * pk)) - int(0.005 * 48000))
    x = x[start:]
    n = int(REAL_MAX_S * 48000)
    if len(x) > n:
        x = x[:n].copy()
        f = int(0.05 * 48000)
        ramp = np.linspace(1, 0, f)
        x[-f:] *= ramp if x.ndim == 1 else ramp[:, None]
    takes = takes_dir_for(a.kit, a.takes)
    os.makedirs(takes, exist_ok=True)
    real = read_real(takes) or {'real': 1, 'roles': {}}
    real.setdefault('roles', {})
    rel = lambda q: os.path.relpath(os.path.abspath(q), project_of(a.kit)).replace(os.sep, '/')  # noqa: E731
    for name in names:
        spec = (kit.get('roles') or {}).get(name) or {}
        tks = []
        for k, rate in enumerate((1.0, 0.97, 1.03), 1):  # three takes: the file and two small speed variants
            y = x if rate == 1.0 else signal.resample_poly(x, 100, int(round(100 * rate)), axis=0)
            y = y / max(1e-9, float(np.abs(y).max())) * 10 ** (-1 / 20)
            fn = f"real-{name.replace('.', '-')}_{k}.wav"
            path = os.path.join(takes, fn)
            sf.write(path, y.astype(np.float32), 48000, subtype='PCM_24')
            h = sha1_file(path)
            tks.append(dict(file=fn, seed=None, pitch=None, **measure_take(y), sha1=h, key=f'real:{h}', checks=[]))
        real['roles'][name] = dict(sound=f"real:{rec.get('source', 'source')}:{os.path.basename(a.file)}",
                                   align=spec.get('align', 'onset'), level_db=float(spec.get('level_db') or 0.0),
                                   max_s=None, **{k: float(spec[k]) for k in MIX_KEYS if spec.get(k) is not None},
                                   takes=tks, action=act, file=rel(a.file), licence=rel(rec_path))
        print(f"kit real: {name} ({act}) plays {os.path.basename(a.file)}: 3 takes in {takes} "
              f"(onset {tks[0]['onset_s'] * 1000:.0f} ms, {tks[0]['dur_s']:.2f} s, l50 {tks[0]['l50_lufs']:.1f} LUFS)")
    write_json(os.path.join(takes, REAL_LOCK), real)
    print(f'kit real: wrote {os.path.join(takes, REAL_LOCK)}; judge it: python3 scripts/audio/kit.py listen; '
          'credits.py lists its licence record')
    return 0


def cmd_listen(a):
    """Delegates to listen.py --kit (one earshot process, models loaded once)."""
    args = [sys.executable, os.path.join(HERE, 'listen.py'), '--kit', a.kit, '--takes', a.takes, '--score', a.score]
    if a.json:
        args += ['--json', a.json]
    if a.python:
        args += ['--python', a.python]
    return subprocess.call(args)


def main(argv=None):
    ap = argparse.ArgumentParser(description="The film's earshot sound kit: init, cast, real, tune, render, vendor, "
                                             'check, audition, listen, where.')
    ap.add_argument('cmd', choices=('init', 'cast', 'real', 'tune', 'render', 'vendor', 'check', 'audition', 'listen',
                                    'where'))
    ap.add_argument('file', nargs='?', help='real: the effect file (its licence record beside it)')
    ap.add_argument('--kit', default='audio/kit.json')
    ap.add_argument('--takes', help='folder of the rendered takes (default: the kit path without .json)')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--cues', default='out/cues.json')
    ap.add_argument('--python', help='the interpreter that has earshot (overrides sfx.python and EARSHOT_PYTHON)')
    ap.add_argument('--preset', default='calm', choices=PRESETS, help='init: calm (text-led, default), crisp, minimal, '
                    'launch (a film cut to a licensed track; earshot 0.4+)')
    ap.add_argument('--force', action='store_true', help='init: replace audio/kit.json; render: render every take again')
    ap.add_argument('--from', dest='source', metavar='DIR', help='vendor: copy a rendered kit (takes + lock) from here')
    ap.add_argument('-o', '--output', default='out/qa/kit_audition.wav', help='audition: the WAV to write')
    ap.add_argument('--over-bed', action='store_true', help="audition: every take over 2 s of the film's own track at its "
                    'bed_db (needs audio/music/edit.json)')
    ap.add_argument('--json', metavar='PATH', help='check / listen: write the report here')
    ap.add_argument('--film', help='cast: the film\'s name in the sound history (default: the project folder)')
    ap.add_argument('--dry-run', action='store_true', help='cast: print the cast, change nothing')
    ap.add_argument('--avoid', help='cast: bank sounds to avoid for this film (comma-separated; remembered)')
    ap.add_argument('--action', help='real: the action the effect plays (actions.py)')
    ap.add_argument('--licence', help='real: its licence record (default: <file stem>.licence.json)')
    a = ap.parse_args(argv)
    a.takes = takes_dir_for(a.kit, a.takes)
    try:
        score_python = None
        if os.path.isfile(a.score):
            score_python = (read_json(a.score, 'score').get('sfx') or {}).get('python')
        if a.cmd == 'where':
            return cmd_where(a, score_python)
        if a.cmd == 'init':
            return cmd_init(a, score_python)
        if a.cmd == 'cast':
            return cmd_cast(a, score_python)
        if a.cmd == 'real':
            return cmd_real(a)
        if a.cmd == 'tune':
            es = None if a.python is None and score_python is None and not os.environ.get('EARSHOT_PYTHON') else \
                find_earshot(a.python, score_python)[0]
            return tune_file(a, bank_knobs(es) if es else None)
        if a.cmd == 'render':
            return cmd_render(a, score_python)
        if a.cmd == 'vendor':
            return cmd_vendor(a)
        if a.cmd == 'check':
            return cmd_check(a, score_python)
        if a.cmd == 'audition':
            return cmd_audition(a, score_python) if not a.over_bed else cmd_audition_over_bed(a)
        return cmd_listen(a)
    except KitError as e:
        print(f'kit.py: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
