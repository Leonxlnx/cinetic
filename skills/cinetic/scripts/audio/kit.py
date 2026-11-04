#!/usr/bin/env python3
"""
kit.py: the film's sound kit, made by earshot (a separate, optional tool: docs/setup.md). The effects
of a cinetic film come from audio/kit.json, one earshot bank sound per role: the cue kinds and their
variants (hit, whoosh.short, key, key.space, text, ...). `render` has earshot render every take into
audio/kit/ with its measured onset, peak and end (audio/kit/kit.lock.json), cached; plan.py and score.py
place those takes on the cue frames. The rendered takes stay with the project, so the film rebuilds
where earshot is not installed; with neither, the soundtrack fails its gate (score.py --draft plays
placeholder voices for a timing check, never delivered).

Presets: launch (a film cut to a licensed track, every new film, the default; earshot 0.4+), and for old
effects-only projects calm (text-led), crisp (energetic) and minimal (designed, sub-led): every launch role names
its level over the music bed (bed_db), where it sits against the cut (offset_ms), how close a run may go
(min_gap_ms) and, for ticks and bells, its stereo width; the kit-level "mix" block holds the stop-down
ranges. The lock passes all of it through (bed_db, offset_ms, min_gap_ms, width, the takes' l50_lufs and
corr, mix). `init` rewrites the preset's notes into house wording.

Usage (from the project root):
  python3 scripts/audio/kit.py init [--preset launch|calm|crisp|minimal] [--force]
                                   # write audio/kit.json from an earshot preset, tuned to the film's key
  python3 scripts/audio/kit.py cast [--film NAME] [--avoid SOUND,SOUND] [--library PATH | --no-library] [--dry-run]
                                   # give each action of the film (out/cues.json) its own sound (bank or library)
  python3 scripts/audio/kit.py real FILE --action ACTION [--licence RECORD]
                                   # a free real effect (music.mjs get --kind sfx) as the takes of an action
  python3 scripts/audio/kit.py real FILE --role ROLE[,ROLE] [--licence RECORD]
                                   # the same for kit roles (sfx.mjs place: the catalogue's effect per role)
  python3 scripts/audio/kit.py trim                 # trim the lead-in of recorded takes placed before cast/real did
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
interpreter (import earshot), the interpreter an earlier run found (~/.cinetic/tools.json, or $CINETIC_HOME),
the usual places (~/earshot/.venv; on Windows X:\\earshot\\.venv at a drive's root), `earshot` on PATH. It
must have sound kits (earshot 0.3 or later; the launch preset and the mix keys need 0.4); an interpreter whose
earshot is older runs a 0.4+ source checkout found beside its own (a clone or worktree named earshot*), with
PYTHONPATH set for the run. What worked is remembered in tools.json, so later films need no setting.
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
sounds avoided (~/.cinetic/sound-history.json; the four films before it weigh too), and sounds whose takes earshot
renders truncated or clipped skipped (the known ones, the history's, this film's last render). The action that plays a kind most often re-voices that
kind's role (its bed_db, offset_ms and min_gap_ms stay); another action on the same kind gets a role of its
own, "<role>.<action>" (land.card_land). kit.json keeps a "cast" block (the roles' own specs, to cast again);
the history records the film's sounds. Then tune and render. --avoid names sounds this film's listening or plan
judged poorly (masked under the track, flagged by kit.py listen): the cast takes the next member, and remembers.
With a sound library (library.py; --library, $CINETIC_SFX_LIBRARY or ~/.cinetic/sfx-library.json) its real
recordings join each action's candidates, and with a track every candidate is matched to it (actions.py
music_cost: tempo, masking per octave band where the action's events land (track_bands reads the edit), the key;
the bank's sounds measured once per earshot version into ~/.cinetic/bank-feats.json). A sound plays one action, a
busy action on a library sound takes a second one, and the set never repeats an earlier film's. A library pick is
copied into audio/sfx/ with its licence record and placed as the takes of its action's roles (audio/kit/real.lock.json,
"cast": true; tonal ones tuned to the key, on a role with notes a take on each note); its role in kit.json renders
a bank sound as the fallback.

Real effects (real): where the bank sounds an action weakly, a free effect whose licence needs no credit
(Mixkit's free sound effects, downloaded with `music.mjs get --kind sfx`, its licence record beside it) plays
that action instead: measured (onset, peak, end, loudness), peak-normalised, cut to 2.5 s, written as a take
(audio/kit/real-<role>_1.wav, audio/kit/real.lock.json), with the role's own mix keys. kit.py listen judges it
with earshot's ears like any role; credits.py lists its record.

Lead-ins: a recording can carry room tone or a quiet press 40-60 ms before its transient. plan.py puts a take's onset
(its transient: the first sample at 10 % of the peak) on the cue frame, so that lead-in would play before the picture.
For a role aligned on its onset, cast and real cut every recorded take to 5 ms before its transient (a fade-in over
those 5 ms) when it is heard more than 12 ms before it; trim does the same to takes placed before (then npm run audio);
check lists any left. Swells and whooshes (aligned on their peak) keep their build.

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
not found (init, cast, audition and where; tune, vendor, check, real, trim and listen work without it).
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
                'point EARSHOT_PYTHON at that interpreter (cinetic docs/setup.md, "Sound from earshot"); an interpreter that runs '
                'earshot from a source checkout it was not installed from also needs PYTHONPATH=<that checkout>')
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
LEAD_MS = 5.0           # ms: a recorded take of an onset role starts this long before its transient, faded in over it
LEAD_MAX_MS = 12.0      # ms: a recorded take heard earlier than this before its transient carries a lead-in (trimmed)
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
PROBE = ('import os, earshot, earshot.forge.kit; print(os.path.dirname(os.path.dirname(os.path.abspath(earshot.__file__)))); '
         'print(earshot.__version__)')
PROBED = {}  # interpreter -> the folder its earshot package is imported from (a source checkout on PYTHONPATH, or site-packages)


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
    lines = p.stdout.strip().splitlines()
    if len(lines) >= 2:
        PROBED[py] = lines[-2]
    return lines[-1], None


def cinetic_home():
    return os.environ.get('CINETIC_HOME') or os.path.join(os.path.expanduser('~'), '.cinetic')


TOOLS = 'tools.json'  # in cinetic_home(): the interpreters a run found, so the next film finds them with no setting


def read_tools():
    try:
        with open(os.path.join(cinetic_home(), TOOLS), encoding='utf-8') as fh:
            d = json.load(fh)
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def remember_tool(key, value):
    """Record a working interpreter in cinetic_home()/tools.json (best effort: a read-only home is fine)."""
    d = read_tools()
    if d.get(key) == value:
        return
    d[key] = value
    try:
        os.makedirs(cinetic_home(), exist_ok=True)
        write_json(os.path.join(cinetic_home(), TOOLS), d)
    except OSError:
        pass


def _venv_python(root):
    return os.path.join(root, '.venv', 'Scripts', 'python.exe') if os.name == 'nt' else os.path.join(root, '.venv', 'bin', 'python')


def usual_earshot_pythons():
    """The virtualenv of an earshot clone where docs/setup.md puts it (~/earshot/.venv), and on Windows an
    earshot folder at the root of a drive (X:\\earshot\\.venv)."""
    roots = [os.path.join(os.path.expanduser('~'), 'earshot')]
    if os.name == 'nt':
        roots += [f'{d}:\\earshot' for d in 'CDEFGHIJKLMNOPQRSTUVWXYZ' if os.path.isdir(f'{d}:\\earshot')]
    return [p for p in dict.fromkeys(_venv_python(r) for r in roots) if os.path.isfile(p)]


def _checkout_version(d):
    try:
        with open(os.path.join(d, 'earshot', '__init__.py'), encoding='utf-8') as fh:
            m = re.search(r"__version__\s*=\s*['\"]([\d.]+)", fh.read())
    except OSError:
        return None
    if not m or not os.path.isfile(os.path.join(d, 'earshot', 'forge', 'kit.py')):
        return None
    return tuple(int(x) for x in m.group(1).split('.')[:3])


def newer_checkouts(py):
    """Source checkouts of earshot with sound kits (0.4+) beside the one this interpreter imports (a clone or git
    worktree next to it: <parent>/earshot*, <parent>/earshot*/*), newest first: [(version, dir, the interpreter's own
    checkout)]."""
    try:
        p = subprocess.run([py, '-c', 'import earshot, os; print(os.path.dirname(os.path.dirname(os.path.abspath(earshot.__file__))))'],
                           capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired):
        return []
    repo = (p.stdout.strip().splitlines() or [''])[-1]
    if p.returncode != 0 or not os.path.isdir(repo):
        return []
    parent = os.path.dirname(os.path.abspath(repo))
    dirs = []
    for n in sorted(os.listdir(parent)):
        d = os.path.join(parent, n)
        if not n.lower().startswith('earshot') or not os.path.isdir(d):
            continue
        dirs.append(d)
        try:
            dirs += [os.path.join(d, m) for m in sorted(os.listdir(d)) if os.path.isdir(os.path.join(d, m))]
        except OSError:
            pass
    out = [(v, d, repo) for d in dirs if os.path.abspath(d) != os.path.abspath(repo) for v in [_checkout_version(d)]
           if v and v >= LAUNCH_MIN]
    return sorted(out, reverse=True)


def _models_home(d, repo):
    """earshot's model cache for a checkout d run beside the installed one: unset EARSHOT_HOME reads <d>/.cache, which a
    fresh worktree lacks or holds in part; the installed checkout's own cache (<repo>/.cache, where its models were
    downloaded) serves when it holds more."""
    def blobs(root):  # bytes of downloaded model files in an earshot cache
        n = 0
        for dp, _, fs in os.walk(os.path.join(root, 'hf')):
            for f in fs:
                try:
                    n += os.path.getsize(os.path.join(dp, f)) if not os.path.islink(os.path.join(dp, f)) else 0
                except OSError:
                    pass
        return n
    if os.environ.get('EARSHOT_HOME'):
        return None
    home = os.path.join(repo, '.cache')
    return home if blobs(home) > blobs(os.path.join(d, '.cache')) else None


def _with_pythonpath(d):
    """Run earshot from the source checkout d: PYTHONPATH (this process and every command it starts)."""
    cur = os.environ.get('PYTHONPATH', '')
    if d not in cur.split(os.pathsep):
        os.environ['PYTHONPATH'] = d + (os.pathsep + cur if cur else '')


def find_earshot(python=None, score_python=None):
    """The first earshot that has sound kits: --python, score.json sfx.python, $EARSHOT_PYTHON, this
    interpreter, the interpreter an earlier run found (cinetic_home()/tools.json), the usual places
    (~/earshot/.venv; on Windows X:\\earshot\\.venv), `earshot` on PATH. An interpreter whose earshot is
    older than 0.4 runs a 0.4+ source checkout found beside its own (PYTHONPATH is set for this run). What
    works is remembered in tools.json, so the next film needs no setting. Returns (Earshot or None, [what was
    tried and why it failed])."""
    tried = []
    env = os.environ.get('EARSHOT_PYTHON')
    off = bool(env) and env.strip().lower() in ('none', 'off')
    mem = read_tools().get('earshot') or {}
    cands = [('--python', python)] + ([] if off else [('score.json sfx.python', score_python), ('EARSHOT_PYTHON', env),
                                                      ('this interpreter', sys.executable)])
    if not off:
        cands += [('found before (tools.json)', mem.get('python'))] + [('the usual place', p) for p in usual_earshot_pythons()]
    if off:
        tried.append('EARSHOT_PYTHON=none: earshot is not used')
    seen = set()
    for how, py in cands:
        if not py:
            continue
        exe = shutil.which(py) or py
        if how != 'this interpreter' and not os.path.exists(exe):
            tried.append(f'{how}: {py} does not exist')
            continue
        key = os.path.normcase(os.path.abspath(exe))
        if key in seen:
            continue
        seen.add(key)
        if how == 'found before (tools.json)' and mem.get('pythonpath') and os.path.isdir(mem['pythonpath']):
            _with_pythonpath(mem['pythonpath'])
            if mem.get('home') and not os.environ.get('EARSHOT_HOME') and os.path.isdir(mem['home']):
                os.environ['EARSHOT_HOME'] = mem['home']
        ver, why = _probe_python(exe)
        if ver:
            src = PROBED.get(exe)
            on_path = [q for q in os.environ.get('PYTHONPATH', '').split(os.pathsep) if q]
            remember_tool('earshot', dict(python=exe, pythonpath=src if src and any(
                os.path.normcase(os.path.abspath(q)) == os.path.normcase(os.path.abspath(src)) for q in on_path) else None,
                home=os.environ.get('EARSHOT_HOME') or None))
            return Earshot(how, [exe, '-m', 'earshot'], exe, ver), tried
        for v, d, repo in newer_checkouts(exe):
            saved = os.environ.get('PYTHONPATH')
            _with_pythonpath(d)
            ver, why2 = _probe_python(exe)
            if ver:
                home = _models_home(d, repo)
                if home:
                    os.environ['EARSHOT_HOME'] = home
                remember_tool('earshot', dict(python=exe, pythonpath=d, home=home or os.environ.get('EARSHOT_HOME') or None))
                return Earshot(f'{how} with the earshot {".".join(map(str, v))} checkout {d}', [exe, '-m', 'earshot'], exe, ver), tried
            if saved is None:
                os.environ.pop('PYTHONPATH', None)
            else:
                os.environ['PYTHONPATH'] = saved
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
        tried.append(f'PATH: {exe} has no `earshot kit` (earshot {".".join(map(str, LAUNCH_MIN))}+ needed)')
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


def tune_file(a, knobs=None, placing=False):
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
    if ch and not placing and (kit.get('cast') or {}).get('library'):
        print("kit: the sound library's takes keep the notes they were placed on: cast again (kit.py cast) to move them")
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
    for role, fn, ms in lead_report(a.takes):
        rep['problems'].append(f'{role}: the recorded take {fn} is heard {ms:g} ms before its transient (a lead-in that plays '
                               'before the picture): kit.py trim cuts it, then npm run audio')
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


def music_of(kit_path, score_path):
    """the film's track as the cast matches sounds to it: {bpm, centroid (Hz, the median over the track's bars from
    track.py analyze), key (tonic pc, mode intervals, text)}; {} for a film without a track"""
    out = {}
    try:
        k = key_of(score_path)
    except KitError:
        k = None
    sc = read_json(score_path, 'score') if score_path and os.path.isfile(score_path) else {}
    m = sc.get('music') if isinstance(sc.get('music'), dict) else {}
    if not m:
        return out
    if k:
        out['key'] = k
    root = project_of(kit_path)
    here = lambda p: p if os.path.isabs(p) else os.path.join(root, p)  # noqa: E731
    ep = here(m.get('edit') or 'audio/music/edit.json')
    if os.path.isfile(ep):
        ed = read_json(ep, 'edit')
        if ed.get('bpm'):
            out['bpm'] = float(ed['bpm'])
        ap = here(ed['analysis']) if ed.get('analysis') else None
        if ap and os.path.isfile(ap):
            bars = read_json(ap, 'analysis').get('bars') or []
            cs = sorted(float(b['centroid']) for b in bars if b.get('centroid'))
            if cs:
                out['centroid'] = cs[len(cs) // 2]
        tb = track_bands(here(ed.get('track') or m.get('track') or ''), ed.get('segments') or [],
                         os.path.join(root, 'out', 'cache', 'music'))
        if tb:
            out['bands'], out['film_bands'] = tb
    return out


def track_bands(path, segments, cache_dir):
    """(bands, film) of the track as the edit plays it, or None when it cannot be decoded here (no ffmpeg, numpy):
    bands, its power per octave band (library.OCTAVES) at its louder moments (the 80th percentile of 170 ms frames)
    against its mean power; film, [[film s, its power, the 8 band powers], ...] on the same scale every 85 ms of the
    film (its segments' src_from..src_to placed at their film_s), so the cast reads the music where each action's
    events land"""
    try:
        import numpy as np
        sys.path.insert(0, HERE)
        import library as LB
        import track as TR
        x, _ = TR.decode(path, cache_dir)
    except Exception:  # noqa: BLE001 (the cast then weighs the centroid alone)
        return None
    m = x.mean(axis=1)
    segs = [g for g in segments if g.get('src_from') is not None and g.get('src_to') is not None]
    segs = segs or [dict(film_s=0.0, src_from=0.0, src_to=len(m) / 48000)]
    n, hop = 8192, 4096
    w = np.hanning(n)
    fr = np.fft.rfftfreq(n, 1 / 48000)
    sel = [(fr >= c / math.sqrt(2)) & (fr < c * math.sqrt(2)) for c in LB.OCTAVES]
    rows, film = [], []
    for g in segs:
        y = m[int(float(g['src_from']) * 48000):int(float(g['src_to']) * 48000)]
        for i in range(0, len(y) - n + 1, hop):
            P = np.abs(np.fft.rfft(y[i:i + n] * w)) ** 2
            rows.append([P.sum()] + [P[q].sum() for q in sel])
            film.append(float(g.get('film_s') or 0.0) + (i + n / 2) / 48000)
    if not rows:
        return None
    rows = np.array(rows) + 1e-30
    mean = rows[:, 0].mean()
    bands = [round(float(v), 4) for v in np.percentile(rows[:, 1:], 80, axis=0) / mean]
    return bands, [[round(t, 3)] + [round(float(v), 5) for v in r / mean] for t, r in zip(film, rows)]


BANK_FEATS = 'bank-feats.json'
FEATS_VERSION = 2       # library.py measure's fields (2: octave bands, heard, fill): a new version measures again


def bank_feats(es, ids):
    """{bank id: measured features} for the cast's match to the track: each sound rendered once by earshot at its
    own defaults and measured like a library sound (library.py measure), kept per earshot version in
    $CINETIC_HOME/bank-feats.json; {} when earshot has no interpreter here"""
    import actions as AC
    p = os.path.join(AC.home_dir(), BANK_FEATS)
    try:
        with open(p, encoding='utf-8') as fh:
            cache = json.load(fh)
    except (OSError, ValueError):
        cache = {}
    ver = f"{es.version or 'unknown'}|{FEATS_VERSION}"
    have = dict(cache.get(ver) or {})
    miss = [i for i in dict.fromkeys(ids) if i not in have]
    if miss and es.python:
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'feats.json')
            print(f'kit cast: measuring {len(miss)} bank sound(s) once for the match to the track (kept in {p})')
            subprocess.run([es.python, os.path.join(HERE, 'library.py'), '_bankfeats', '--out', out, '--ids',
                            ','.join(miss)], capture_output=True, text=True, timeout=900)
            if os.path.isfile(out):
                with open(out, encoding='utf-8') as fh:
                    have.update(json.load(fh))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        write_json(p, {ver: have})
    return {i: have[i] for i in ids if i in have}


def real_takes(clips, takes, name, variants=3, align='onset'):
    """takes (files written into the takes folder, measured) of a role from [(audio, tonal[, pitch])]: per clip the
    cut as it is and small variants (speed by 3 % for a toneless sound; for a tonal one the same pitch, a softer top
    or a shorter tail), interleaved clip by clip; a clip with a pitch (a note name) is one take on that note. A role
    aligned on its onset gets each take with its lead-in trimmed (trim_lead): its transient lands on the cue frame
    and nothing of the recording plays more than LEAD_MS before it"""
    import numpy as np
    import soundfile as sf
    from scipy import signal
    per, notes = [], []
    for c in clips:
        x, tonal = c[0], c[1]
        note = c[2] if len(c) > 2 else None
        notes.append(note)
        vs = []
        for k in range(1 if note else variants):
            if k == 0:
                y = x
            elif not tonal:
                y = signal.resample_poly(x, 100, (97, 103)[(k - 1) % 2], axis=0)
            elif k == 1:
                y = signal.sosfilt(signal.butter(2, 7000, 'low', fs=48000, output='sos'), x, axis=0)
            else:
                y = x.copy()
                n = len(y)
                f = max(1, int(0.3 * n))
                ramp = np.linspace(1, 0, f) ** 2
                y[n - f:] *= ramp if y.ndim == 1 else ramp[:, None]
            if align == 'onset':
                y = trim_lead(y)[0]
            vs.append(y / max(1e-9, float(np.abs(y).max())) * 10 ** (-1 / 20))
        per.append(vs)
    out = []
    order = [(v, notes[j]) for k in range(variants) for j, vs in enumerate(per) for v in vs[k:k + 1]]
    for k, (y, note) in enumerate(order, 1):
        fn = f"real-{name.replace('.', '-')}_{k}.wav"
        path = os.path.join(takes, fn)
        sf.write(path, y.astype(np.float32), 48000, subtype='PCM_24')
        h = sha1_file(path)
        out.append(dict(file=fn, seed=None, pitch=note, **measure_take(y), sha1=h, key=f'real:{h}', checks=[]))
    return out


PITCH_REACH = 6  # semitones a tonal library sound is moved to a note of its role (the nearest octave of the note)


def pitched_clips(raw, pitches):
    """[(audio, tonal, note name, index in raw)] of the tonal library sounds raw = [(audio untuned, midi or None, tonal)] on the
    notes of a pitched role (its "pitches"): each note's pitch class in the octave around the recording's own
    note, so a take moves at most PITCH_REACH semitones; a second sound more than PITCH_REACH from the first is
    left out (a text chain stays in one register); toneless sounds as they are; [] when none is tonal"""
    from scipy import signal
    sys.path.insert(0, HERE)
    import library as LB
    want = [w for w in (to_midi(p) for p in pitches or []) if w is not None]
    if not want or not any(t and m is not None for _, m, t in raw):
        return []
    out, first = [], None
    for i, (x, m, tonal) in enumerate(raw):
        if not tonal or m is None:
            out.append((x, False, None, i))
            continue
        m = float(m)
        if first is None:
            first = m
        elif abs(m - first) > PITCH_REACH:
            continue
        for t in sorted({int(round(w)) + 12 * int(round((m - round(w)) / 12)) for w in want}):
            st = t - m
            y = signal.resample_poly(x, 1000, int(round(1000 * 2 ** (st / 12))), axis=0) if abs(st) > 1e-3 else x
            out.append((y, True, LB.note_name(t), i))
    return out


def place_library(kit_path, takes, kit, lib, music=None, log=print):
    """the cast's library picks played: each sound (and a partner) copied into the film's audio/sfx/ with its licence
    record, tuned to the key when the cast says so, made the takes of every role of its action (real.lock.json,
    marked "cast"); the takes an earlier cast placed go first. Returns the roles placed."""
    import actions as AC
    from scipy import signal
    sys.path.insert(0, HERE)
    import library as LB
    root = project_of(kit_path)
    rel = lambda q: os.path.relpath(os.path.abspath(q), root).replace(os.sep, '/')  # noqa: E731
    sfx = os.path.join(root, 'audio', 'sfx')
    had = os.path.isfile(os.path.join(takes, REAL_LOCK))
    if not had and not (kit.get('cast') or {}).get('library'):
        return []
    os.makedirs(takes, exist_ok=True)
    real = read_real(takes) or {'real': 1, 'roles': {}}
    roles = real.setdefault('roles', {})
    for n in [n for n, r in roles.items() if (r or {}).get('cast')]:
        for tk in roles[n].get('takes') or []:
            q = os.path.join(takes, tk['file'])
            if os.path.isfile(q):
                os.remove(q)
        roles.pop(n)
    by_id = {LB.lib_id(s): s for s in (lib or {}).get('sounds') or []}
    placed = []
    for act, c in ((kit.get('cast') or {}).get('library') or {}).items():
        clips, files, recs, raw = [], [], [], []
        sids = [c['sound']] + ([c['partner']] if c.get('partner') else [])
        for sid in sids:
            s = by_id.get(sid)
            if not s:
                raise KitError(f"{sid} is not in the sound library {(lib or {}).get('_path')}: cast again")
            os.makedirs(sfx, exist_ok=True)
            dst, rd = os.path.join(sfx, s['id'] + '.wav'), os.path.join(sfx, s['id'] + '.licence.json')
            shutil.copyfile(s['_file'], dst)
            shutil.copyfile(s['_licence'], rd)
            x = read_take(dst)
            tonal = s.get('midi') is not None and float(s.get('tonal') or 0) >= 0.5
            raw.append((x, s.get('midi'), tonal))
            st = float(c.get('retune') or 0) if sid == c['sound'] else (
                AC.retune(float(s['midi']), music['key'], act) if tonal and (music or {}).get('key') else 0.0)
            if abs(st) > AC.RETUNE_MAX:
                st = 0.0
            if st:
                x = signal.resample_poly(x, 1000, int(round(1000 * 2 ** (st / 12))), axis=0)
            clips.append((x, tonal))
            files.append(rel(dst))
            recs.append(rel(rd))
        for name in c.get('roles') or []:
            spec = (kit.get('roles') or {}).get(name) or {}
            notes = pitched_clips(raw, spec.get('pitches'))  # a pitched role (text, bell): a take on each of its notes
            used = sorted({n[3] for n in notes}) if notes else list(range(len(clips)))
            tks = real_takes([n[:3] for n in notes] or clips, takes, name, variants=3 if len(clips) == 1 else 2,
                             align=spec.get('align', 'onset'))
            roles[name] = dict(sound='+'.join(sids[i] for i in used),
                               align=spec.get('align', 'onset'), level_db=float(spec.get('level_db') or 0.0),
                               max_s=None, **{k: float(spec[k]) for k in MIX_KEYS if spec.get(k) is not None},
                               takes=tks, action=act, file=files[used[0]], licence=recs[used[0]],
                               also=[recs[i] for i in used[1:]], cast=True)
            placed.append(name)
            log(f"kit cast: {name} ({act}) plays {', '.join(files[i] for i in used)}: {len(tks)} takes"
                + (f" on its notes {', '.join(sorted({t['pitch'] for t in tks if t.get('pitch')}))}" if notes else
                   f", tuned {c['retune']:+.2f} semitone(s) to the key" if c.get('retune') else ''))
    write_json(os.path.join(takes, REAL_LOCK), real)
    return placed


# sounds earshot 0.4 renders with a take-breaking audit flag whatever the knobs (kit.py check fails right after a cast
# that picks one); the history adds every sound a film's render flagged since
KNOWN_FLAGGED = {'hover_tick/detent': ['truncated']}


def take_breaking(codes):
    """the audit codes that break a take (cut off, clipped), not a matter of taste"""
    return sorted(c for c in codes if 'truncat' in c or 'clip' in c)


def cmd_cast(a, score_python):
    """each action of the film its own sound, from earshot's bank and the sound library (actions.py), written into
    kit.json, the library's picks placed as takes, the history updated, then tuned; --dry-run prints the cast only"""
    import actions as AC
    sys.path.insert(0, HERE)
    import library as LB
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
    lib = None
    if not a.no_library:
        lp, how = LB.resolve(a.library)
        if lp and os.path.isfile(lp):
            try:
                lib = LB.load(lp)
            except LB.LibraryError as e:
                print(f'kit.py: {e}', file=sys.stderr)
                return 1
            print(f"kit cast: the sound library {lp} ({len(lib['sounds'])} sounds) beside the bank")
        elif a.library:
            print(f'kit.py: no sound library at {lp}', file=sys.stderr)
            return 1
    avoid = [x.strip() for x in (a.avoid or '').split(',') if x.strip()]
    lib_ids = {LB.lib_id(s) for s in (lib or {}).get('sounds') or []}
    unknown = [x for x in avoid if x not in knobs and x not in lib_ids]
    if unknown:
        hint = [f'lib:{x}' for x in unknown if f'lib:{x}' in lib_ids]
        print(f"kit.py: --avoid: not bank or library sounds: {', '.join(unknown)}"
              + (f" (a library sound is named with its prefix: {', '.join(hint)})" if hint else ' (library sounds take the lib: prefix, as cast prints them)'),
              file=sys.stderr)
        return 1
    # sounds whose takes earshot flags as cut off or clipped: the known ones, the history's, and this film's last render
    flags = dict(KNOWN_FLAGGED)
    flags.update(AC.flagged_of(hist))
    learned = {}
    st0 = kit_state(a.kit, a.takes)
    if st0.get('lock'):
        for _role, sound, codes in Kit(st0['lock'], a.takes, st0['status'], cast=kit.get('cast')).warnings():
            bad = take_breaking(codes)
            if bad and sound:
                flags[sound] = bad
                learned[sound] = bad
    if flags:
        print('kit cast: skipping sounds earshot renders flagged: ' + ', '.join(f"{s} ({', '.join(c)})" for s, c in sorted(flags.items())))
    music = music_of(a.kit, a.score)
    if music:
        print(f"kit cast: matched to the track: {music.get('bpm') or '?'} BPM, centroid {music.get('centroid') or '?'} Hz, "
              f"{(music.get('key') or (0, 0, '?'))[2]}")
    ids = sorted({s for x in AC.ACTIONS.values() for s in x['sounds'] if s in knobs})
    feats = bank_feats(es, ids) if music else {}
    new, rep = AC.cast(doc.get('events', []), kit, float(doc.get('fps', 60)), doc.get('cue') or {}, hist, film, knobs,
                       role_for, avoid, library=lib, music=music, feats=feats, flagged=flags)
    print(f"kit cast: {len(rep['actions'])} action(s) for {film}"
          + (f" (the previous film: {rep['previous']})" if rep['previous'] else ' (no previous film in the history)'))
    for act, r in sorted(rep['actions'].items(), key=lambda x: -x[1]['events']):
        print(f"  {act:10s} {r['events']:3d} event(s)  {r['sound']:28s} roles {', '.join(r['roles'])}"
              + (f" + {r['partner']}" if r.get('partner') else '')
              + (f"  (avoided {', '.join(r['avoided'])})" if r['avoided'] else '')
              + (f"  ({r['why']})" if r.get('why') else ''))
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
    tune_file(a, knobs, placing=True)  # the roles' notes first: a tonal library sound takes them
    try:
        place_library(a.kit, a.takes, read_json(a.kit, 'kit'), lib, music)
    except KitError as e:
        print(f'kit.py: {e}', file=sys.stderr)
        return 1
    AC.write_history(AC.with_flags(AC.record(hist, film, rep), learned))
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


def lead_in(x, sr=48000):
    """(heard, onset) in samples of a take: where a listener first hears it (the mono sum's 1 ms RMS envelope, 48-sample
    windows every 12 samples, first within 20 dB of its loudest: check-sync's rule) and its transient (measure_take's
    onset: the first sample at 10 % of the peak of |the larger of the two samples|). A recording's lead-in (room tone, a
    quiet press before the click) is heard before the transient that plan.py places on the cue."""
    import numpy as np
    mono = x.mean(axis=1) if x.ndim == 2 else x
    loud = np.abs(x.max(axis=1) if x.ndim == 2 else x)
    pk = float(loud.max()) if len(loud) else 0.0
    if pk <= 0 or len(mono) < 2:
        return 0, 0
    onset = int(np.argmax(loud >= 0.1 * pk))
    win, hop = max(1, sr // 1000), max(1, sr // 4000)
    c = np.concatenate([[0.0], np.cumsum(mono * mono)])
    st = np.arange(0, max(1, len(mono) - win + 1), hop)
    env = np.sqrt(np.maximum((c[np.minimum(st + win, len(mono))] - c[st]) / win, 0.0))
    heard = int(st[int(np.argmax(env >= env.max() * 0.1))]) if env.max() > 0 else onset
    return min(heard, onset), onset


def trim_lead(x, sr=48000, lead_ms=LEAD_MS, max_ms=LEAD_MAX_MS):
    """(take, cut s): a recorded take heard more than max_ms before its transient, cut to lead_ms before it with a
    raised-cosine fade-in over those lead_ms, so what plays before the cue frame is the transient's own attack, never
    the recording's lead-in; (x, 0.0) unchanged otherwise (a sharp take, an already trimmed one)"""
    import numpy as np
    heard, onset = lead_in(x, sr)
    lead = int(round(lead_ms * sr / 1000))
    if onset - heard <= max_ms * sr / 1000 or onset <= lead:
        return x, 0.0
    s = onset - lead
    y = np.array(x[s:], dtype=np.float64, copy=True)
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0.0, np.pi, lead, endpoint=False))
    y[:lead] *= ramp if y.ndim == 1 else ramp[:, None]
    return y, s / sr


def lead_report(takes):
    """[(role, file, heard ms before the transient)] of the recorded takes of onset roles (real.lock.json) whose
    lead-in plays before the cue frame (more than LEAD_MAX_MS before the transient)"""
    out = []
    for role, r in sorted((read_real(takes).get('roles') or {}).items()):
        if not r or r.get('align', 'onset') != 'onset':
            continue
        for tk in r.get('takes') or []:
            p = os.path.join(takes, tk['file'])
            if not os.path.isfile(p):
                continue
            heard, onset = lead_in(read_take(p))
            ms = (onset - heard) / 48.0
            if ms > LEAD_MAX_MS:
                out.append((role, tk['file'], round(ms, 1)))
    return out


def cmd_trim(a):
    """the recorded takes already placed (real.lock.json: the cast's library picks, kit.py real) trimmed as cast and real
    now place them: an onset role's take heard more than LEAD_MAX_MS before its transient starts LEAD_MS before it;
    the lock is measured again (onset, peak, loudness, sha1), so plan.py and check-sync read the trimmed takes"""
    import numpy as np
    import soundfile as sf
    takes = takes_dir_for(a.kit, a.takes)
    real = read_real(takes)
    if not real.get('roles'):
        print(f'kit trim: no recorded takes in {takes} ({REAL_LOCK}): nothing to trim')
        return 0
    n, cut = 0, 0
    for role, r in sorted(real['roles'].items()):
        if not r or r.get('align', 'onset') != 'onset':
            continue
        for tk in r.get('takes') or []:
            p = os.path.join(takes, tk['file'])
            if not os.path.isfile(p):
                print(f"kit.py: trim: {tk['file']} is missing from {takes} (cast again: kit.py cast)", file=sys.stderr)
                return 1
            n += 1
            y, s = trim_lead(read_take(p))
            if not s:
                continue
            sf.write(p, np.asarray(y, dtype=np.float32), 48000, subtype='PCM_24')
            h = sha1_file(p)
            tk.update(measure_take(y), sha1=h, key=f'real:{h}')
            cut += 1
            print(f"kit trim: {role}: {tk['file']} started {s * 1000:.0f} ms of lead-in before its transient: cut to "
                  f"{LEAD_MS:g} ms before it (onset now {tk['onset_s'] * 1000:.1f} ms)")
    if cut:
        write_json(os.path.join(takes, REAL_LOCK), real)
    print(f'kit trim: {cut} of {n} recorded take(s) of onset roles trimmed in {takes}'
          + ('; next: npm run audio (plan and mix again), then mux' if cut else ''))
    return 0


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
    if not a.role and act not in AC.ACTIONS:
        print(f"kit.py: --action is one of {', '.join(AC.ACTIONS)} (or --role ROLE[,ROLE])", file=sys.stderr)
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
    if a.role:  # the roles named (sfx.mjs place: a catalogue effect per role), each kit role that is not off
        names = [n.strip() for n in a.role.split(',') if n.strip()]
        bad = [n for n in names if not (kit.get('roles') or {}).get(n)]
        if bad:
            print(f"kit.py: real --role: {', '.join(bad)} not a role of the kit that is on", file=sys.stderr)
            return 1
        act = act or ((cast.get('roles') or {}).get(names[0]) or {}).get('action') or names[0]
    else:
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
        xr = trim_lead(x)[0] if spec.get('align', 'onset') == 'onset' else x  # an onset role: its transient on the cue
        tks = []
        for k, rate in enumerate((1.0, 0.97, 1.03), 1):  # three takes: the file and two small speed variants
            y = xr if rate == 1.0 else signal.resample_poly(xr, 100, int(round(100 * rate)), axis=0)
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
    ap = argparse.ArgumentParser(description="The film's earshot sound kit: init, cast, real, trim, tune, render, vendor, "
                                             'check, audition, listen, where.')
    ap.add_argument('cmd', choices=('init', 'cast', 'real', 'trim', 'tune', 'render', 'vendor', 'check', 'audition',
                                    'listen', 'where'))
    ap.add_argument('file', nargs='?', help='real: the effect file (its licence record beside it)')
    ap.add_argument('--kit', default='audio/kit.json')
    ap.add_argument('--takes', help='folder of the rendered takes (default: the kit path without .json)')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--cues', default='out/cues.json')
    ap.add_argument('--python', help='the interpreter that has earshot (overrides sfx.python and EARSHOT_PYTHON)')
    ap.add_argument('--preset', default='launch', choices=PRESETS, help='init: launch (a film cut to a licensed track, '
                    'the default; earshot 0.4+), or calm, crisp, minimal (old effects-only projects)')
    ap.add_argument('--force', action='store_true', help='init: replace audio/kit.json; render: render every take again')
    ap.add_argument('--from', dest='source', metavar='DIR', help='vendor: copy a rendered kit (takes + lock) from here')
    ap.add_argument('-o', '--output', default='out/qa/kit_audition.wav', help='audition: the WAV to write')
    ap.add_argument('--over-bed', action='store_true', help="audition: every take over 2 s of the film's own track at its "
                    'bed_db (needs audio/music/edit.json)')
    ap.add_argument('--json', metavar='PATH', help='check / listen: write the report here')
    ap.add_argument('--film', help='cast: the film\'s name in the sound history (default: the project folder)')
    ap.add_argument('--dry-run', action='store_true', help='cast: print the cast, change nothing')
    ap.add_argument('--avoid', help='cast: bank or library sounds to avoid for this film (comma-separated; remembered)')
    ap.add_argument('--library', help='cast: the sound library (library.json; default: $CINETIC_SFX_LIBRARY, then '
                    '~/.cinetic/sfx-library.json)')
    ap.add_argument('--no-library', action='store_true', help='cast: the bank alone')
    ap.add_argument('--action', help='real: the action the effect plays (actions.py)')
    ap.add_argument('--role', help='real: the kit roles it plays instead of the roles of an action (comma-separated; sfx.mjs place)')
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
        if a.cmd == 'trim':
            return cmd_trim(a)
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
