#!/usr/bin/env python3
"""
kit.py: the film's sound kit, made by earshot (a separate, optional tool: docs/setup.md). The effects
of a cinetic film come from audio/kit.json, one earshot bank sound per role: the cue kinds and their
variants (hit, whoosh.short, key, key.space, text, ...). `render` has earshot render every take into
audio/kit/ with its measured onset, peak and end (audio/kit/kit.lock.json), cached; score.py places
those takes on the cue frames. The rendered takes stay with the project, so the film rebuilds where
earshot is not installed; with neither, score.py falls back to its synth voices and says so loudly.

Usage (from the project root):
  python3 scripts/audio/kit.py init [--preset calm|crisp|minimal] [--force]
                                   # write audio/kit.json from an earshot preset, tuned to the film's key
  python3 scripts/audio/kit.py tune                 # retune the tonal roles to score.json's key
  python3 scripts/audio/kit.py render [--force]     # audio/kit/*.wav + kit.lock.json (cached)
  python3 scripts/audio/kit.py vendor [--from DIR]  # check (or first copy in) the takes score.py plays
  python3 scripts/audio/kit.py check [--json PATH]  # the rendered kit against kit.json and the film's cues,
                                                    # plus earshot's model-free audit of every take
  python3 scripts/audio/kit.py audition [-o out/qa/kit_audition.wav]   # every take, role by role
  python3 scripts/audio/kit.py listen [--json out/qa/kit_listen.json]  # earshot's ears on each role
  python3 scripts/audio/kit.py where                # which earshot is used, and why
Options for every command: --kit audio/kit.json, --takes DIR (default: the kit path without .json,
audio/kit), --score audio/score.json, --cues out/cues.json, --python PY (the earshot interpreter).

Finding earshot, first that works: --python, score.json "sfx.python", $EARSHOT_PYTHON, this
interpreter (import earshot), `earshot` on PATH. It must have sound kits (earshot 0.3 or later).
EARSHOT_PYTHON=none turns earshot off (score.py then plays the rendered takes as they are).
earshot in its own virtualenv: EARSHOT_PYTHON=/path/to/venv/bin/python. earshot from a source
checkout run by another venv: also PYTHONPATH=/path/to/checkout (it is passed through).

Roles: tick, tick.crisp, tock, hit, land, land.light, pop, whoosh.short, whoosh.long, suck, riser,
drop, key, key.space, key.return, click, click.confirm, snap, swell, bell, text. A role set to null is
off (score.py skips its cues and says so); a role the kit does not name falls back to the synth voice.
The presets keep riser, swell and suck off and give the lockup one clean element.

Tuning (init, tune): roles with `pitches` or `edits.pitch` move to the film's key in their own
register: bell to the key's pentatonic, text to the pentatonic too (the tonic triad when it has 3
notes or fewer; score.py steps a chain through the chord's tones among them), a single pitch to the
nearest tonic;
with earshot found, a tonal hit, drop, bell, text or confirm click with no pitch (struck bells,
plucks, dings, sub drops, impacts) gets the tonic nearest its native note, inside its range.

Exit codes: 0 done (render also when earshot is missing: it says what score.py will play instead, and a
build never fails only because earshot is missing); 1 a failed check or render, or invalid input; 2 earshot
not found (init, audition and where; tune, vendor, check and listen work without it).
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
PRESETS = ('calm', 'crisp', 'minimal')
INSTALL_HINT = ('install earshot 0.3+ in its own virtualenv (https://github.com/Leonxlnx/earshot, README "Install") and '
                'point EARSHOT_PYTHON at that interpreter (cinetic docs/setup.md, "Sound from earshot")')
# a role the kit does not name borrows the nearest one of its family; with none, score.py's synth voice plays
FAMILY = {'tick.crisp': ['tick'], 'land.light': ['land'], 'whoosh.short': ['whoosh.long', 'whoosh'],
          'whoosh.long': ['whoosh.short', 'whoosh'], 'click.confirm': ['click'], 'key.space': ['key'],
          'key.return': ['key.space', 'key'], 'key.back': ['key'], 'key.word': ['key']}
WHOOSH_SHORT_S = 0.5  # s: a move shorter than this takes whoosh.short, a longer one whoosh.long
TUNE_ROLES = ('hit', 'drop', 'bell', 'text', 'click.confirm')  # roles init/tune may give a pitch they lack
TONAL = ('pluck', 'notify', 'pro_notify', 'sub_drop', 'pro_sub_drop', 'impact', 'pro_impact')  # bank categories
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


class Kit:
    """A rendered kit (kit.lock.json + takes) as score.py plays it. roles[role] is None (off) or
    {sound, align, level_db, lufs_spread, takes: [{file, pitch, midi, onset_s, peak_s, end_s, checks,
    trim_db, trim, ...}]}.

    Takes are peak-normalised (-1 dBFS), so their loudness follows their crest: the takes of one role
    can be 3-4 LU apart. Each take carries a trim toward the role's median loudness (from the lock's
    lufs_m_max, at most LEVEL_TRIM_DB either way), so a role plays at one level whichever take a cue
    gets; lufs_spread is the role's spread before the trim. A lock without lufs_m_max trims nothing."""

    def __init__(self, lock, takes, source):
        self.lock, self.dir, self.source = lock, takes, source
        self.roles = {}
        for role, r in (lock.get('roles') or {}).items():
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
        self._audio = {}
        self._last = {}

    def lookup(self, role):
        """(status, name, spec): ('ok', role or the family member used, spec), ('off', name, None) when the
        kit sets it null, ('missing', None, None) when neither it nor its family is in the kit."""
        for name in [role] + FAMILY.get(role, []):
            if name in self.roles:
                return ('ok', name, self.roles[name]) if self.roles[name] else ('off', name, None)
        return 'missing', None, None

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

    def pick(self, name, key, target=None, explicit=False, index=None):
        """One take of role `name`, or None when an explicit note has no take (see covers()). Pitched
        roles first choose the pitch: an explicit target (a progress rung, a motif note, a text step) takes
        the take on that note; a derived one the nearest pitch class (the kit keeps its register). Among
        the takes left, `index` (a key's identity) or a stable hash of `key` (the event's id and frame)
        picks one, never the same file twice in a row for a role that has more."""
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
        if len(tks) > 1 and self._last.get(name) == tks[k]['file']:
            k = (k + 1) % len(tks)
        self._last[name] = tks[k]['file']
        return tks[k]

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
        kit = Kit(st['lock'], takes, st['status'])
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
        return SC.S.pitch_class(parts[0]), SC.MODES[mode], text
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
            new = []
            while len(new) < len(old):
                if m % 12 in pcs:
                    new.append(note(m))
                m += 1
            if new != list(spec['pitches']):
                changes.append((role, list(spec['pitches']), new))
                spec['pitches'] = new
        elif ed.get('pitch') is not None:
            new = note(nearest_pc(tonic, to_midi(ed['pitch'])))
            if new != ed['pitch']:
                changes.append((role, ed['pitch'], new))
                ed['pitch'] = new
        elif knobs and role in TUNE_ROLES and spec.get('sound', '').split('/')[0] in TONAL:
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


def cue_kinds(cues_path):
    """{role: count} of the film's cues (out/cues.json), or None without the file."""
    if not cues_path or not os.path.isfile(cues_path):
        return None
    doc = read_json(cues_path, 'cues')
    fps = float(doc.get('fps', 60))
    out = {}
    for e in doc.get('events', []):
        dur = float(e['dur']) / fps if 'dur' in e else None
        role = role_for(e.get('kind'), e.get('variant'), float(e.get('weight', 1.0)), dur)
        out[role] = out.get(role, 0) + 1
    return out


def cmd_where(a, score_python):
    es, tried = find_earshot(a.python, score_python)
    for t in tried:
        print(f'  not used: {t}')
    if es:
        print(f'kit: {es}')
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
    if os.path.exists(a.kit) and not a.force:
        print(f'kit.py: {a.kit} exists (--force replaces it)', file=sys.stderr)
        return 1
    p = es.run(['kit', 'init', '--preset', a.preset, '-o', a.kit, '--force'])
    if p.returncode != 0:
        print(f'kit.py: earshot kit init failed: {p.stderr.strip() or p.stdout.strip()}', file=sys.stderr)
        return 1
    print(p.stdout.strip())
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
    used = cue_kinds(a.cues)
    if used is not None:
        for role, n in sorted(used.items()):
            name = next((x for x in [role] + FAMILY.get(role, []) if x in roles), None)
            if name is None:
                rep['notes'].append(f'{n} {role} cue(s): the kit has no {role} role, so score.py plays its synth voice')
            elif roles[name] is None:
                rep['notes'].append(f'{n} {role} cue(s): {name} is off in the kit, so score.py skips them')
            rep['roles'][role] = dict(cues=n, role=name, sound=(roles.get(name) or {}).get('sound') if name else None)
    if st['lock']:
        for role, sound, codes in Kit(st['lock'], a.takes, st['status']).warnings():
            msg = f'{role} ({sound}): ' + ', '.join(codes)
            if 'rising_glide' in codes:
                msg += ' (a rising pitch glide reads as a cheap synth whip: pick another sound)'
            (rep['problems'] if used is None or role in (used or {}) else rep['notes']).append(msg)
    es, tried = find_earshot(a.python, score_python)
    if es and st['status'] != 'no-kit':
        code, res, err = es.run_json(['kit', 'check', a.kit] + (['--out', a.takes] if st['lock'] else []))
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


def cmd_audition(a, score_python):
    es = need_earshot(a, score_python)
    if not es:
        return 2
    os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
    code, res, err = es.run_json(['kit', 'audition', a.kit, '-o', a.output, '--out', a.takes])
    if code != 0 or res is None:
        print(f'kit.py: earshot kit audition failed: {err.splitlines()[-1] if err else code}', file=sys.stderr)
        return 1
    print(res.get('summary'))
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
    ap = argparse.ArgumentParser(description="The film's earshot sound kit: init, tune, render, vendor, check, "
                                             'audition, listen, where.')
    ap.add_argument('cmd', choices=('init', 'tune', 'render', 'vendor', 'check', 'audition', 'listen', 'where'))
    ap.add_argument('--kit', default='audio/kit.json')
    ap.add_argument('--takes', help='folder of the rendered takes (default: the kit path without .json)')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--cues', default='out/cues.json')
    ap.add_argument('--python', help='the interpreter that has earshot (overrides sfx.python and EARSHOT_PYTHON)')
    ap.add_argument('--preset', default='calm', choices=PRESETS, help='init: calm (text-led, default), crisp, minimal')
    ap.add_argument('--force', action='store_true', help='init: replace audio/kit.json; render: render every take again')
    ap.add_argument('--from', dest='source', metavar='DIR', help='vendor: copy a rendered kit (takes + lock) from here')
    ap.add_argument('-o', '--output', default='out/qa/kit_audition.wav', help='audition: the WAV to write')
    ap.add_argument('--json', metavar='PATH', help='check / listen: write the report here')
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
            return cmd_audition(a, score_python)
        return cmd_listen(a)
    except KitError as e:
        print(f'kit.py: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
