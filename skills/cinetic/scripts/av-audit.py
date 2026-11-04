#!/usr/bin/env python3
"""Audio QA against the cue list: does every sound land on its picture event, and is the mix clean?

Usage:
  python3 scripts/av-audit.py out/film.mp4 --cues out/cues.json --stems out/stems --json out/qa/av.json
  python3 scripts/av-audit.py out/film.mp4 --cues out/cues.json --json out/qa/av.json      # full mix only
  python3 scripts/av-audit.py out/film.mp4 --cues out/cues.json --audio public/audio/soundtrack.wav
  python3 scripts/av-audit.py --audio public/audio/soundtrack.wav --cues out/cues.json   # no picture checks

Audio is the video's own track (decoded, so AAC effects count) unless --audio names a WAV.
Cues: the {events:[{f,kind,weight,pan,apexFrac?}]} schema, or an older per-key export (see
forensics.load_cues). Events closer than --cluster frames are one expected onset.

Checks (defaults are proven starting points, not dogma):
  intended   the times a sound is meant to start: out/qa/cues_sounded.json (plan.py / score.py: only the events
             that received a sound, each at its cue plus the role's offset, at the take's align point) when
             it sits in the cues' qa/ folder and is newer than the cues (--sounded names another); else
             the cue frames, minus the keys and skipped events score.py's report lists
  sync       each onset event has an audio onset within +-2 f (librosa backtracked onsets at hop
             128, delta 0.03, or a > 1 kHz 1 ms-envelope rise >= 4x); hit rate >= 90%     fail
             With --stems the sfx stem is searched (strict) and stray sfx onsets are listed.
             Key events that score.py does not sound (thinned to ~12/s, the letters of a word
             typed in the "word" style, or "typing": "off") are replayed from the score JSON
             and not expected, nor are the events score.py's report (--score-report, default
             out/qa/score.json beside the cues) lists as skipped when it is newer than the cues
             (a role the sound kit leaves off, such as riser; matched on frame and kind, so the
             hit a skipped riser leads into is still expected); a key's bottom-out or keyup
             within 0.2 s after it is not a stray onset, nor is an onset inside a whoosh's or
             suck's own span (its apexFrac of dur before the apex, at least 0.5 s after it) or
             a riser's or swell's build.
             Without it the full mix is searched, where music hides quiet and soft-attack
             effects, so a low hit rate there is only a warning: gate with --stems.
  apex       whoosh/suck events (or any with apexFrac): the 30 ms envelope maximum of the sfx
             stem sits within +-3 f of the frame (--stems only; reported otherwise). Risers
             and swells, which build into their frame, are measured and listed only.        warn
  visual     for each isolated event (no other event within 6 f): when the picture's peak
             change (480x270 MAD) within +-6 f is clear (>= 2x the local median) it sits at
             -2..+3 f from the sound, or the picture changes on the sound too (>= 35% of it) warn
             the 3 strongest picture changes of the film (--big, by prominence: the hero reveal,
             a section change, a camera-scale move, not the ordinary cuts inside a section) when
             one has no audio onset at all, music or effect, within +-3 f (--peak-tol) and no
             contact cue (land, hit, snap, drop) in the next 10 f: a suggestion to land the
             music's own event (drop, stop, re-entry) there. Most cuts carry no sound: the music
             carries them                                                                       warn
             the reverse: a loud sound (sfx envelope peak within 6 dB of the loudest) whose
             picture barely changes from -3 to +6 f (MAD < max(0.3, 2x the median over
             +-30 f)): a big hit on a still frame reads as unmotivated                         warn
             a landing sound (land, pop, tock, bell, snap, hit, drop) whose picture moved
             clearly in the 60 f before it but has stopped (d < max(0.12, 0.05x that peak))
             from -8 to +3 f: it lands on nothing; cue it on the readable frame            warn
  loudness   ffmpeg ebur128: integrated at the film's target +-1 LUFS, true peak <= -1.0 dBTP  fail
             (target: --lufs, else master.lufs in the score JSON (--score, default
             audio/score.json), else score.py's default for it: -14 with music, -18 for an
             effects-only film; without a score JSON -14 and -16 both pass)
             loudness range 3-8 LU (3-14 for an effects-only film, whose accents stand alone);
             loudest momentary window on the payoff cue if one exists                         warn
             (audio shorter than cues.json's total is an excerpt: loudness and the tail are
             reported, not gated)
  clipping   samples at or above full scale                                                 fail
  duration   audio and picture lengths differ by > 1.5 f                                     warn
  clicks     a > 14 kHz sample > 9x the RMS of its 20 ms and > 6x its 4 ms neighbourhood
             whose > 14 kHz energy sits >= 80% inside 1 ms (a cut, not a designed attack);
             one within +-1 f of an onset event is that sound's own attack (a tap or knock
             from the kit starts that fast; kit.py check audits the takes for clicks)      warn
  tail       last 50 ms RMS <= -45 dBFS and last 10 ms peak <= -60 dBFS                      fail
             and the last half second quieter than the one before it                         warn
  ending     the music ends on a decay, never a cut (audio/dsp.py ending_shape, as score.py and track.py
             check judge it): the last moment within 12 dB of the playing level that falls 20 dB inside
             150 ms with under 0.3 s of decay after it, nothing coming back, fails (a bed stopped dead, a
             60 ms fade over full-level music, the film ending mid-bar); the track's own final hit ringing
             out, a hit that rings 1.5 s or more or a 2-3 s fade under the end card pass         fail
             more than 1 s of silence after the last sound (the picture holds on nothing)     warn
  head       first 5 ms peak <= -40 dBFS: above it the film clicks on sample 0 or cuts in
             mid-sound (skipped on an excerpt, and on a track edit that puts bar 1 on frame 0) warn
  masking    (--stems) each sfx over the music in its best band (60 ms) by its role's margin: 3 dB for roles
             that sit 4 dB or less over the bed (ticks, taps, text, snap), 6 dB for the rest; < 0 dB warns
             (typing and crisp ticks sit just over the music by design: score.py's report judges them);
             score.py's over-bed and stop-down figures are copied into the report
  music_sync (a film with a track: cues.json "music", the film-time grid) every structural cue and act
             boundary within +-1 f of a downbeat attack, an entry, a stop's end or the ending (the reveal,
             the payoff and the lockup fail when off); a hard cut 2-4 f off a strong accent (>= 6 dB) is a
             near miss                                                                         warn/fail
  level      (a film with a track) the music's level never steps mid-shot: a rise of 8 dB or a fall of 10 dB (the second
             after against the second before, on the music stem with --stems, else the mix) that lands on no picture
             event (an act change, a declared seam, a cut cue, the reveal or lockup, within 0.15 s of where the louder
             or quieter part begins) fails; 5-8 dB warns.
             A section of the track entering mid-shot reads as a mistake: fit the edit to the shots (track.py fit),
             so its level changes ride the cuts. The opening second, the stops the grid declares and the ending after
             the body's last bar line are left out                                             fail/warn
  draft      a soundtrack score.py rendered with --draft (placeholder voices) is never delivered     fail

Writes JSON (--json) and a short summary. Exit: 0 no failing check, 1 a failing check, 2 usage or
input error. Needs ffmpeg/ffprobe, numpy, scipy, soundfile and librosa (opencv is optional: the
picture is decoded by ffmpeg).
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy import signal

sys.dont_write_bytecode = True  # no __pycache__ in the project's scripts/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from forensics import SW, SH, decode, load_cues, probe  # noqa: E402
except ModuleNotFoundError as _e:  # forensics imports opencv for its own picture metrics; nothing used here needs it
    if _e.name != 'cv2':
        raise
    import types

    class _NoCV(types.ModuleType):
        def __getattr__(self, name):
            if name.startswith('__'):  # module introspection (other imports walk sys.modules)
                raise AttributeError(name)
            raise RuntimeError(f'opencv (cv2.{name}) is not installed: pip install opencv-python-headless')

    sys.modules['cv2'] = _NoCV('cv2')
    from forensics import SW, SH, decode, load_cues, probe  # noqa: E402


def die(msg):
    print(f'av-audit: {msg}', file=sys.stderr)
    sys.exit(2)


# ------------------------------------------------------------------------------------------
# audio input
# ------------------------------------------------------------------------------------------
def audio_from_video(path):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
                              'stream=sample_rate,channels', '-of', 'json', path],
                             capture_output=True, text=True, check=True).stdout
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        die(f'cannot probe {path}: {e}')
    st = json.loads(out).get('streams') or []
    if not st:
        die(f'{path} has no audio stream: mux the soundtrack first or pass --audio <wav>')
    sr = int(st[0]['sample_rate'])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-map', '0:a:0', '-f', 'f32le',
                          '-ac', '2', '-ar', str(sr), '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    if not len(x):
        die(f'decoded no audio from {path}')
    return x, sr


def read_wav(path):
    try:
        x, sr = sf.read(path, always_2d=True)
    except (RuntimeError, OSError) as e:
        die(f'cannot read {path}: {e}')
    return x.astype(np.float64), sr


def find_stems(d):
    if not os.path.isdir(d):
        die(f'--stems {d} is not a directory')
    files = sorted(glob.glob(os.path.join(d, '*.wav')))
    sfx = [p for p in files if re.match(r'(sfx|fx|effects|room)', os.path.basename(p).lower())]
    bus = [p for p in files if os.path.basename(p).lower() in ('bed.wav', 'music.wav')]  # the track as played
    music = bus or [p for p in files if p not in sfx]
    return sfx, music


def sum_wavs(paths, n, sr):
    acc = np.zeros(n)
    for p in paths:
        x, s = read_wav(p)
        if s != sr:
            die(f'stem {p} is {s} Hz, the mix is {sr} Hz')
        m = x.mean(axis=1)[:n]
        acc[:len(m)] += m
    return acc


# ------------------------------------------------------------------------------------------
# detectors
# ------------------------------------------------------------------------------------------
def peak_pick(x, pre_max, post_max, pre_avg, post_avg, delta, wait):
    """librosa 0.11's util.peak_pick, in numpy. librosa's own version is a cached numba JIT, and a
    stale numba cache (or a numba/numpy mismatch) segfaults the whole process, which no try/except
    can catch. Same rule: a peak is the max of x[n-pre_max : n+post_max], at least delta above the
    mean of x[n-pre_avg : n+post_avg], and more than `wait` frames after the previous peak."""
    pre_max, post_max, pre_avg, post_avg, wait = (int(np.ceil(v)) for v in (pre_max, post_max, pre_avg, post_avg, wait))
    n = len(x)
    peaks = []
    if n == 0:
        return np.array(peaks, dtype=int)
    i = 1
    if x[0] >= x[:min(post_max, n)].max() and x[0] >= x[:min(post_avg, n)].mean() + delta:
        peaks.append(0)
        i = wait + 1
    while i < n:
        if x[i] == x[max(0, i - pre_max):min(i + post_max, n)].max() and \
                x[i] >= x[max(0, i - pre_avg):min(i + post_avg, n)].mean() + delta:
            peaks.append(i)
            i += wait + 1
        else:
            i += 1
    return np.array(peaks, dtype=int)


def librosa_onsets(y, sr, delta, hop=128):
    """librosa.onset.onset_detect(backtrack=True, wait=4, units='time') with its default peak-picking
    windows, but peak picking and backtracking run in numpy (see peak_pick)."""
    import librosa
    env = librosa.onset.onset_strength(y=y.astype(np.float32), sr=sr, hop_length=hop).astype(np.float64)
    env = env - env.min()
    env /= env.max() + np.finfo(env.dtype).tiny
    if not env.any() or not np.all(np.isfinite(env)):
        return np.array([], dtype=np.float64)
    on = peak_pick(env, pre_max=0.03 * sr // hop, post_max=0.00 * sr // hop + 1, pre_avg=0.10 * sr // hop,
                   post_avg=0.10 * sr // hop + 1, delta=delta, wait=4)
    # backtrack each onset to the nearest preceding energy minimum (librosa.onset.onset_backtrack)
    minima = np.flatnonzero((env[1:-1] <= env[:-2]) & (env[1:-1] < env[2:])) + 1
    minima = np.unique(np.concatenate([[0], minima]))
    on = minima[np.clip(np.searchsorted(minima, on, side='right') - 1, 0, None)]
    return on.astype(np.float64) * hop / sr


def hf_rise(y, sr):
    """1 ms RMS envelope of the > 1 kHz band and a rise ratio: mean of the next 5 ms over the
    23 ms that end 2 ms before. Returns (ratio per block, block length in seconds)."""
    hp = signal.sosfilt(signal.butter(2, 1000, 'high', fs=sr, output='sos'), y)
    blk = max(1, sr // 1000)
    n = len(hp) // blk
    env = np.sqrt((hp[:n * blk].reshape(n, blk) ** 2).mean(1))
    cs = np.concatenate([[0], np.cumsum(env)])
    i = np.arange(n)
    pre_a, pre_b = np.clip(i - 25, 0, n), np.clip(i - 2, 0, n)
    post_b = np.clip(i + 5, 0, n)
    pre = (cs[pre_b] - cs[pre_a]) / np.maximum(1, pre_b - pre_a)
    post = (cs[post_b] - cs[i]) / np.maximum(1, post_b - i)
    return post / (pre + 1e-6 + 0.02 * env.max()), blk / sr


def band_env(y, sr, lo, hi, win_ms=30, hop_ms=5):
    """RMS envelope of a band over win_ms windows, one value every hop_ms (centred)."""
    b = signal.sosfilt(signal.butter(4, [lo, min(hi, sr / 2 - 100)], 'band', fs=sr, output='sos'), y)
    blk = max(1, int(sr * hop_ms / 1000))
    n = len(b) // blk
    e = (b[:n * blk].reshape(n, blk) ** 2).mean(1)
    k = max(1, int(round(win_ms / hop_ms)))
    return np.sqrt(np.convolve(e, np.ones(k) / k, mode='same')), hop_ms


def score_paths(args):
    """Where the score JSON may be: --score, else audio/score.json here or next to the cues' folder."""
    if args.score and not os.path.isfile(args.score):
        die(f'--score {args.score} not found')
    here = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(args.cues))), 'audio', 'score.json')
    return [p for p in ([args.score] if args.score else ['audio/score.json', here]) if os.path.isfile(p)]


def silent_keys(args):
    """Frames of key events score.py leaves silent (thinned by time, or "typing": "off"), replayed
    with its own plan_typing() on the same score JSON. None when that cannot be done."""
    try:
        raw = json.load(open(args.cues))
        if not any(isinstance(e, dict) and e.get('kind') == 'key' for e in raw.get('events', [])):
            return set()
        paths = score_paths(args)
        if not paths:
            return None
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio'))
        import score as SC  # noqa: E402
        events = sorted(raw['events'], key=lambda e: e['f'])
        _, thinned, _ = SC.plan_typing(SC.Song(json.load(open(paths[0])), raw), events)
        return {round(float(events[i]['f']), 3) for i in thinned}
    except Exception:  # noqa: BLE001  (an older score.py, or a score that does not load: expect every key)
        return None


def score_json(args):
    """The first readable score JSON (score_paths), or None."""
    for p in score_paths(args):
        try:
            return json.load(open(p))
        except (OSError, ValueError):
            continue
    return None


def effects_only(sc):
    """True when score.py renders this score JSON without music: "music": "none" (the default) and no
    older "bed"."""
    music = sc.get('music') or 'none'
    return music == 'none' and not sc.get('bed')


def sounded_default(args):
    return os.path.join(os.path.dirname(os.path.abspath(args.cues)), 'qa', 'cues_sounded.json')


def same_events(sounded, cues):
    """True when cues_sounded.json was planned from these events: its sounded rows (at their cue frame) and its
    silent rows are exactly the cues' (frame, kind) pairs, so a re-export that changed no event keeps it current."""
    try:
        have = {(round(float(e.get('cue_f', e['f'])), 3), e['kind']) for e in sounded.get('events', [])}
        have |= {(round(float(x['f']), 3), x['kind']) for x in sounded.get('silent', []) if 'f' in x and 'kind' in x}
        want = {(round(float(e['f']), 3), e['kind']) for e in cues.get('events', []) if isinstance(e, dict)}
        return bool(want) and have == want and sounded.get('fps') == cues.get('fps')
    except (KeyError, TypeError, ValueError):
        return False


def sounded_path(args):
    """out/qa/cues_sounded.json (the intended sound times) when it is current for these cues (newer than
    cues.json, or planned from the same events), else None"""
    p = args.sounded or sounded_default(args)
    try:
        if os.path.isfile(p) and (args.sounded or os.path.getmtime(p) >= os.path.getmtime(args.cues)
                                  or same_events(json.load(open(p, encoding='utf-8')), json.load(open(args.cues, encoding='utf-8')))):
            return p
    except (OSError, ValueError):
        pass
    return None


def score_report(args):
    p = args.score_report or os.path.join(os.path.dirname(os.path.abspath(args.cues)), 'qa', 'score.json')
    try:
        if os.path.isfile(p) and os.path.getmtime(p) >= os.path.getmtime(args.cues):
            return json.load(open(p))
    except (OSError, ValueError):
        pass
    return None


def role_margins(args, default):
    """{role: masking margin dB} from the effects plan (out/qa/sfx_plan.json): 3 dB for roles 4 dB or less over
    the bed, the default for the rest"""
    p = os.path.join(os.path.dirname(os.path.abspath(args.cues)), 'qa', 'sfx_plan.json')
    try:
        plan = json.load(open(p))
    except (OSError, ValueError):
        return {}
    return {e['role']: (3.0 if e.get('bed_db') is not None and e['bed_db'] <= 4 else default) for e in plan.get('events', [])}


def music_sync(raw, fps):
    """Structural cuts against the film's music grid (cues.json "music"): rows and near misses, or None."""
    m = raw.get('music')
    if not m or not m.get('downbeats'):
        return None
    onsets = [('downbeat', float(x)) for x in m['downbeats']] + [('entry', float(x)) for x in m.get('entries') or []]
    onsets += [('stop end', float(s['to'])) for s in m.get('stops') or [] if 'to' in s]
    if m.get('end') and m['end'].get('f') is not None:
        onsets.append(('ending', float(m['end']['f'])))
    strong = [float(a['f']) for a in m.get('accents') or [] if float(a.get('db', 0)) >= 6.0]
    exact = {'reveal', 'payoff', 'lockup'}
    rows = []
    cue_at = {int(round(float(v))): k for k, v in (raw.get('cue') or {}).items()}
    want = []
    for e in raw.get('events', []):
        if e.get('structural'):
            ex = str(e.get('id', '')).split(':')[-1] in exact or cue_at.get(int(round(float(e['f'])))) in exact
            want.append((e.get('id') or e.get('kind'), float(e['f']), ex))
    for name, a in (raw.get('acts') or {}).items():
        if isinstance(a, dict) and float(a.get('from', 0)) > 0:
            want.append((f'act {name}', float(a['from']), False))
    for name, f in (raw.get('cue') or {}).items():
        if name in exact and not any(abs(w[1] - float(f)) < 0.5 for w in want):
            want.append((f'cue {name}', float(f), True))
    for name, f, ex in want:
        kind, at = min(onsets, key=lambda o: abs(o[1] - f))
        d = round(f - at, 2)
        rows.append(dict(what=name, f=round(f, 2), nearest=kind, nearest_f=round(at, 2), off_f=d, ok=abs(d) <= 1.0, exact=ex))
    near = []
    for e in raw.get('events', []):
        if e.get('kind') == 'cut':
            for a in strong:
                if 2.0 <= abs(float(e['f']) - a) <= 4.0:
                    near.append(dict(f=float(e['f']), accent_f=a, off_f=round(float(e['f']) - a, 2)))
                    break
    return dict(rows=rows, near_misses=near, grid_bpm=m.get('bpm'))


LEVEL_FAIL_DB, LEVEL_FALL_FAIL_DB, LEVEL_WARN_DB, LEVEL_TOL_S = 8.0, 10.0, 5.0, 0.15


def level_severity(step_db):
    """a mid-shot level step: a rise of 8 dB or a fall of 10 dB fails (a section jumping in, a hole), 5 dB or more warns"""
    if step_db >= LEVEL_FAIL_DB or step_db <= -LEVEL_FALL_FAIL_DB:
        return 'fail'
    return 'warn' if abs(step_db) >= LEVEL_WARN_DB else None


def picture_events(raw):
    """film frames where the picture changes on purpose: act changes, declared seams, cut cues, the reveal/lockup"""
    ev = [float(a['from']) for a in (raw.get('acts') or {}).values() if isinstance(a, dict) and float(a.get('from', 0)) > 0]
    ev += [float(x['at']) for x in ((raw.get('declared') or {}).get('seams') or []) if isinstance(x, dict) and x.get('at') is not None]
    sal = raw.get('salience') or {}
    cue = raw.get('cue') or {}
    ev += [float(cue[k]) for k, v in sal.items() if v == 'cut' and k in cue]
    ev += [float(cue[k]) for k in ('reveal', 'payoff', 'lockup', 'end') if k in cue]
    d = raw.get('declared') or {}
    if d.get('reveal') is not None:
        try:
            ev.append(float(d['reveal']))
        except (TypeError, ValueError):
            pass
    return sorted(set(ev))


def level_steps(sig, sr, raw, fps):
    """the music's level steps (dB, the second after against the second before) that land on no picture event:
    [{t, f, step_db, nearest_event_f}], strongest first; None for a film without a track grid"""
    m = raw.get('music') or {}
    if not m.get('downbeats') or sig is None or not len(sig):
        return None
    hop = int(0.02 * sr)
    w = int(0.05 * sr)
    n = (len(sig) - w) // hop
    if n < 10:
        return []
    e = np.array([np.mean(sig[i * hop:i * hop + w] ** 2) for i in range(n)]) + 1e-12
    k1, k0 = int(1.0 / 0.02), int(0.1 / 0.02)
    c = np.concatenate([[0.0], np.cumsum(e)])
    step = np.full(n, 0.0)
    for i in range(k1, n - k1):
        before = (c[i - k0] - c[i - k1]) / (k1 - k0)
        after = (c[i + k1] - c[i + k0]) / (k1 - k0)
        step[i] = 10 * np.log10(after / before)
    t = (np.arange(n) * hop + w / 2) / sr
    body_end = float(m['downbeats'][-1]) / fps
    stops = [(float(x['from']) / fps - 0.3, float(x['to']) / fps + 0.3) for x in m.get('stops') or [] if 'from' in x and 'to' in x]
    ev = np.array(picture_events(raw)) / fps
    out = []
    a = np.abs(step)
    peaks, _ = signal.find_peaks(a, height=LEVEL_WARN_DB, distance=int(1.0 / 0.02))  # a section changes at most once a second
    h2, w2, k2 = int(0.005 * sr), int(0.02 * sr), 20  # where it begins: 20 ms windows every 5 ms, 100 ms either side
    for p0 in peaks:
        c0 = int(t[p0] * sr)
        i0, i1 = max(0, c0 - int(0.7 * sr)), min(len(sig) - w2, c0 + int(0.7 * sr))
        e2 = np.array([np.mean(sig[i:i + w2] ** 2) for i in range(i0, i1, h2)]) + 1e-12
        tp = float(t[p0])
        if len(e2) > 2 * k2 + 1:
            fine = np.array([10 * np.log10(e2[i:i + k2].mean() / e2[i - k2:i].mean()) for i in range(k2, len(e2) - k2)])
            j = int(np.argmax(fine) if step[p0] > 0 else np.argmin(fine)) + k2
            tp = (i0 + j * h2) / sr
        if tp < 1.0 or tp > body_end - 0.05 or any(a_ <= tp <= b_ for a_, b_ in stops):
            continue
        near = float(ev[np.argmin(np.abs(ev - tp))]) if len(ev) else None
        if near is not None and abs(near - tp) <= LEVEL_TOL_S:
            continue
        out.append(dict(t=round(tp, 2), f=int(round(tp * fps)), step_db=round(float(step[p0]), 1),
                        nearest_event_f=int(round(near * fps)) if near is not None else None))
    return sorted(out, key=lambda r: -abs(r['step_db']))


def film_lufs(args):
    """The film's loudness target and where it came from: --lufs, else master.lufs in the score
    JSON (score.py's default when the field is absent: -14 with music, -18 effects only), else
    (None, None)."""
    if args.lufs is not None:
        return args.lufs, '--lufs'
    for p in score_paths(args):
        if os.path.isfile(p):
            try:
                sc = json.load(open(p))
                mas = sc.get('master') or {}
                if 'lufs' in mas:
                    return float(mas['lufs']), p
                return (-18.0, f'{p} (effects only: score.py default)') if effects_only(sc) else (-14.0, p)
            except (OSError, ValueError, TypeError, AttributeError):
                continue
    return None, None


def score_skipped(args):
    """(frame, kind) of the events score.py's report lists as skipped (a role the kit leaves off, a
    second heavy landing on one frame, a thinned key), when the report is newer than the cues; else
    None. Matched on the kind too: a riser's frame is the frame of the hit it leads into, and a kit
    that leaves the riser off still plays that hit."""
    p = args.score_report or os.path.join(os.path.dirname(os.path.abspath(args.cues)), 'qa', 'score.json')
    try:
        if not os.path.isfile(p) or os.path.getmtime(p) < os.path.getmtime(args.cues):
            return None
        rep = json.load(open(p))
        return {(round(float(s['f']), 3), str(s.get('kind'))) for s in (rep.get('events') or {}).get('skipped', [])}
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return None


def is_skipped(e, skipped):
    return (round(float(e['f']), 3), str(e['kind'])) in skipped


def effect_spans(path, fps):
    """[(f0, f1, kind, f)] frame spans the long effects of the cues file sound over, as score.py places
    them: a whoosh or suck around its apex (dur frames, apexFrac of it before f; score.py's default
    length when dur is missing), a riser or swell building into f. A take's tail can outlast its cue's
    dur, so a whoosh or suck span runs at least 0.5 s past its apex. Onsets inside a span belong to
    that sound's body, not to a missing event."""
    try:
        raw = json.load(open(path))
    except (OSError, ValueError):
        return []
    out = []
    for e in raw.get('events') or []:
        if not isinstance(e, dict) or not isinstance(e.get('f'), (int, float)):
            continue
        kind, f, w = str(e.get('kind', '')), float(e['f']), float(e.get('weight', 1.0) or 1.0)
        dur = float(e['dur']) if isinstance(e.get('dur'), (int, float)) else None
        if kind in ('whoosh', 'suck'):
            d = dur if dur is not None else (min(3.0, max(0.15, 0.45 + 0.35 * w)) if kind == 'whoosh' else 0.35) * fps
            a = float(e.get('apexFrac', 0.5 if kind == 'whoosh' else 0.85))
            out.append((f - a * d - 2, f + max((1 - a) * d, 0.5 * fps), kind, f))
        elif kind in ('riser', 'swell'):  # score.py's default: a bar for a riser, a beat for a swell
            beat = 60.0 / float(raw.get('bpm') or 120) * fps
            d = dur if dur is not None else (4 * beat if kind == 'riser' else beat)
            out.append((f - d, f + 1, kind, f))
    return out


def ebur128(path):
    r = subprocess.run(['ffmpeg', '-nostats', '-nostdin', '-i', path, '-map', '0:a:0', '-af', 'ebur128=peak=true',
                        '-f', 'null', '-'], capture_output=True, text=True)
    err = r.stderr
    summ = err[err.rfind('Summary:'):]

    def grab(pat):
        m = re.search(pat, summ)
        if not m or m.group(1) in ('-inf', 'inf', 'nan'):
            return None
        return float(m.group(1))

    I = grab(r'I:\s+(-?[\d.]+|-inf) LUFS')
    lra = grab(r'LRA:\s+(-?[\d.]+) LU')
    tp = grab(r'True peak:\s*\n\s*Peak:\s+(-?[\d.]+|-inf) dBFS')
    moms = [(float(t), float(m)) for t, m in re.findall(r't:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+)', err)]
    return I, lra, tp, moms


# ------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument('video', nargs='?', help='rendered film (its audio track is audited unless --audio)')
    ap.add_argument('--cues', required=True, help='out/cues.json')
    ap.add_argument('--audio', help='audit this WAV instead of the video track')
    ap.add_argument('--stems', help='stem folder (sfx*.wav plus music stems), for strict sync and masking')
    ap.add_argument('--json', help='write the report here (e.g. out/qa/av.json)')
    ap.add_argument('--fps', type=float, help='override fps (default: the video, else cues.json)')
    ap.add_argument('--tol', type=float, default=2.0, help='onset tolerance in frames')
    ap.add_argument('--cluster', type=float, default=2.0, help='events closer than this are one onset')
    ap.add_argument('--min-hit', type=float, default=0.9, help='required share of onset events with a sound')
    ap.add_argument('--onset-delta', type=float, default=0.03, help='librosa peak-pick delta (lower = more onsets)')
    ap.add_argument('--hf-ratio', type=float, default=4.0, help='> 1 kHz envelope rise that counts as an onset')
    ap.add_argument('--apex-tol', type=float, default=3.0, help='frames')
    ap.add_argument('--vis-window', type=int, default=6, help='frames either side to look for the visual peak')
    ap.add_argument('--peak-tol', type=int, default=3, help='frames within which one of the biggest picture changes '
                    'should have an audio onset')
    ap.add_argument('--big', type=int, default=3, help='how many of the strongest picture changes to check for a sound')
    ap.add_argument('--no-visual', action='store_true', help='skip the picture checks')
    ap.add_argument('--lufs', type=float, help="the film's loudness target (default: master.lufs in the score JSON, "
                    'else -14 and -16 both pass)')
    ap.add_argument('--score', help='score JSON that holds master.lufs (default: audio/score.json, here or next to '
                    "the cues file's folder)")
    ap.add_argument('--lufs-tol', type=float, default=1.0)
    ap.add_argument('--tp-max', type=float, default=-1.0, help='dBTP')
    ap.add_argument('--lra', help='acceptable loudness range, LU (default 3,8; 3,14 for an effects-only film)')
    ap.add_argument('--score-report', help="score.py's report JSON (default: qa/score.json in the cues' folder)")
    ap.add_argument('--sounded', help="the intended sound times (default: qa/cues_sounded.json in the cues' folder, when "
                    'newer than the cues)')
    ap.add_argument('--no-loudness', action='store_true', help='skip loudness (e.g. a muted loop)')
    ap.add_argument('--payoff', help='cue name whose moment should be the loudest (default: a cue named payoff)')
    ap.add_argument('--tail-rms', type=float, default=-45.0, help='dBFS over the last 50 ms')
    ap.add_argument('--tail-peak', type=float, default=-60.0, help='dBFS over the last 10 ms')
    ap.add_argument('--head-peak', type=float, default=-40.0, help='dBFS: max peak over the first 5 ms')
    ap.add_argument('--mask-db', type=float, default=6.0, help='sfx margin over music in its own band')
    args = ap.parse_args()
    if not args.video and not args.audio:
        die('give a video, --audio <wav>, or both')

    if not os.path.isfile(args.cues):
        die(f'no such cues file: {args.cues} (run npx tsx scripts/export-cues.ts)')
    raw_cues = json.load(open(args.cues, encoding='utf-8'))
    sp = sounded_path(args)
    cues = load_cues(sp) if sp else load_cues(args.cues)
    srep = score_report(args)
    vinfo = probe(args.video) if args.video else None
    fps = args.fps or (vinfo['fps'] if vinfo else None) or cues['fps']
    if not fps:
        die('no fps: pass --fps or put fps in cues.json')
    notes = []
    if not sp and os.path.isfile(sounded_default(args)):
        notes.append(f'{sounded_default(args)} is older than {args.cues} and its events differ: every cue is expected to '
                     'sound; run plan.py (or npm run audio) to plan the new cues')
    if vinfo and cues['fps'] and abs(cues['fps'] - vinfo['fps']) > 0.01:
        notes.append(f'cues.json says {cues["fps"]} fps but the video is {vinfo["fps"]:.3f}; using {fps:.3f}')

    if args.audio:
        x, sr = read_wav(args.audio)
        src = args.audio
    else:
        x, sr = audio_from_video(args.video)
        src = args.video
    mono = x.mean(axis=1)
    n = len(mono)
    dur = n / sr
    excerpt = bool(cues['total']) and dur < (cues['total'] - 2) / fps
    if excerpt:
        notes.append(f'audio is {dur:.2f} s but the film is {cues["total"] / fps:.2f} s: treated as an excerpt, so '
                     'loudness and the tail are reported, not gated')

    flags = []

    def add(check, severity, frame, note, **kw):
        it = dict(check=check, severity=severity, frame=frame, note=note)
        if frame is not None:
            it['t'] = round(float(str(frame).split('-')[0]) / fps, 3)
        it.update(kw)
        flags.append(it)

    # ---- which signal carries the effects
    sfx_sig, music_sig, strict = mono, None, False
    if args.stems:
        sfx_paths, music_paths = find_stems(args.stems)
        if sfx_paths:
            sfx_sig = sum_wavs(sfx_paths, n, sr)
            music_sig = sum_wavs(music_paths, n, sr) if music_paths else None
            strict = True
        else:
            notes.append(f'no sfx*.wav in {args.stems}; using the full mix')

    # ---- events -> expected onsets / apexes (keys score.py thins out are not expected to sound)
    if sp:
        quiet_keys, skipped = set(), set()
        notes.append(f'intended sound times from {sp} ({len(cues["events"])} sounded events; the silent ones are listed '
                     'there, not expected)')
    else:
        quiet_keys = silent_keys(args)
        if quiet_keys:
            notes.append(f'{len(quiet_keys)} key events are thinned by score.py (typing plan) and not expected to sound')
        elif quiet_keys is None:
            notes.append("could not replay score.py's typing plan: every key event is expected to sound")
        skipped = score_skipped(args) or set()
    if srep and srep.get('draft'):
        add('draft', 'fail', None, 'the soundtrack is a --draft build (placeholder voices): it is never delivered; render the '
            'kit (npm run kit) and the soundtrack again without --draft')
    off = [e for e in cues['events'] if e['kind'] != 'key' and is_skipped(e, skipped)]
    if off:
        notes.append(f'{len(off)} events are skipped by score.py (its report: a role the kit leaves off) and not expected '
                     'to sound: ' + ', '.join(sorted({e["kind"] for e in off})))
    ev_on = [e for e in cues['events'] if not e['apex'] and not e.get('ends')
             and not (e['kind'] == 'key' and quiet_keys and round(e['f'], 3) in quiet_keys)
             and not (e['kind'] != 'key' and is_skipped(e, skipped))]
    ev_ap = [e for e in cues['events'] if (e['apex'] or e.get('ends')) and not is_skipped(e, skipped)]
    spans = [(a, b) for a, b, kind, f in effect_spans(args.cues, fps) if (round(f, 3), kind) not in skipped]
    groups = []
    for e in ev_on:
        crisp = e['kind'] == 'tick' and e.get('variant') == 'crisp'
        if groups and e['f'] - groups[-1]['f'] <= args.cluster:
            g = groups[-1]
            g['kinds'].add(e['kind'])
            g['weight'] = max(g['weight'], e['weight'])
            g['n'] += 1
            g['crisp'] = g['crisp'] and crisp
        else:
            groups.append(dict(f=e['f'], kinds={e['kind']}, weight=e['weight'], n=1, crisp=crisp))
    groups = [g for g in groups if g['f'] / fps < dur - 0.01]
    if not groups and not ev_ap:
        die(f'no events in {args.cues}')

    # ---- sync: onsets
    on_t = librosa_onsets(sfx_sig, sr, args.onset_delta)
    ratio, bsec = hf_rise(sfx_sig, sr)
    tol_s = args.tol / fps
    rows = []
    for g in groups:
        tg = g['f'] / fps
        lib = on_t[(on_t >= tg - tol_s) & (on_t <= tg + tol_s)]
        lib_off = float((lib[np.argmin(np.abs(lib - tg))] - tg) * fps) if len(lib) else None
        a, b = int(max(0, (tg - tol_s) / bsec)), int(min(len(ratio) - 1, (tg + tol_s) / bsec))
        hf_off, hf_r = None, 0.0
        if b > a:
            k = a + int(np.argmax(ratio[a:b + 1]))
            hf_r = float(ratio[k])
            if hf_r >= args.hf_ratio:
                hf_off = float((k * bsec - tg) * fps)
        offs = [o for o in (lib_off, hf_off) if o is not None]
        off = min(offs, key=abs) if offs else None
        rows.append(dict(f=round(g['f'], 2), kinds=sorted(g['kinds']), n=g['n'], weight=g['weight'], hit=off is not None,
                         offset_f=None if off is None else round(off, 2),
                         librosa_f=None if lib_off is None else round(lib_off, 2),
                         hf_f=None if hf_off is None else round(hf_off, 2), hf_ratio=round(hf_r, 1)))
    hits = [r for r in rows if r['hit']]
    major = [r for r in rows if r['weight'] >= 0.8]
    hit_rate = len(hits) / len(rows) if rows else 1.0
    major_rate = sum(r['hit'] for r in major) / len(major) if major else 1.0
    offs = np.array([r['offset_f'] for r in hits]) if hits else np.array([0.0])
    sync = dict(strict=strict, groups=len(rows), events=len(ev_on), hit_rate=round(hit_rate, 3),
                major_hit_rate=round(major_rate, 3), median_offset_f=round(float(np.median(offs)), 2),
                p90_abs_offset_f=round(float(np.percentile(np.abs(offs), 90)), 2),
                misses=[r for r in rows if not r['hit']][:60], rows=rows)
    if rows and hit_rate < args.min_hit:
        msg = (f'{len(hits)}/{len(rows)} onset events ({hit_rate * 100:.0f}%) have a sound within +-{args.tol:g} f; '
               f'need {args.min_hit * 100:.0f}%')
        if strict:
            add('sync', 'fail', None, msg + ': re-export cues, re-render the audio, check the mux')
        else:
            add('sync', 'warn', None, msg + f' in the full mix ({major_rate * 100:.0f}% of the major ones), where '
                'music hides quiet and soft-attack effects: run with --stems for the strict audit that gates')
    for r in sync['misses'][:12]:
        add('sync', 'warn', int(round(r['f'])), f'no onset within +-{args.tol:g} f for {"/".join(r["kinds"][:3])} '
            '(sound missing, early, or late)')
    if abs(sync['median_offset_f']) > 1.0:
        add('sync', 'warn', None, f'median onset offset {sync["median_offset_f"]:+.2f} f: a systematic lag; '
            'check the AAC priming (render muted, mux with ffmpeg) and the cue export')

    # stray effects (strict mode): sfx onsets with no event near them
    stray = []
    if strict:
        ev_frames = np.array(sorted(e['f'] for e in cues['events'])) if cues['events'] else np.array([])
        key_frames = np.array([e['f'] for e in cues['events'] if e['kind'] == 'key'])
        inside = 0
        for t in on_t:
            f = t * fps
            if len(key_frames) and np.any((f - key_frames > 0) & (f - key_frames <= 0.2 * fps + args.tol)):
                continue  # a key's bottom-out (25-40 ms) or keyup (70-180 ms) after the press
            if not len(ev_frames) or np.min(np.abs(ev_frames - f)) > 3 * args.tol:
                if any(a <= f <= b for a, b in spans):
                    inside += 1  # texture inside a whoosh's (or riser's) own body: that sound, not a stray
                    continue
                stray.append(round(float(f), 1))
        sync['stray_sfx_onsets_f'] = stray[:60]
        sync['onsets_inside_long_effects'] = inside
        if stray:
            add('sync', 'warn', None, f'{len(stray)} effect onsets have no event within {3 * args.tol:g} f '
                f'(first at f{stray[0]}): a sound with no picture reason, or an event missing from cues.json')

    # ---- apex events (whooshes)
    apex_rows = []
    if ev_ap:
        # a whoosh is long and broad: a 30 ms envelope lets it outweigh short ticks laid over it
        env, ms = band_env(sfx_sig, sr, 60, 16000, win_ms=30, hop_ms=5)
        onset_f = np.array([e['f'] for e in ev_on]) if ev_on else np.array([1e9])
        for e in ev_ap:
            if e['f'] / fps >= dur:
                continue
            w = (args.apex_tol + 4) / fps
            t_hi = e['f'] / fps + w
            later = onset_f[(onset_f > e['f'] + 1) & (onset_f < e['f'] + args.apex_tol + 4)]
            if len(later):  # a hit that starts inside the window would outshout the swell
                t_hi = (later.min() - 0.5) / fps
            if e.get('ends'):  # a riser or swell builds into f; what lands on f is another sound
                t_hi = (e['f'] + 0.5) / fps
            a, b = int(max(0, (e['f'] / fps - w) * 1000 / ms)), int(min(len(env) - 1, t_hi * 1000 / ms))
            if b <= a:
                continue
            k = a + int(np.argmax(env[a:b + 1]))
            off = (k * ms / 1000) * fps - e['f']
            ok = abs(off) <= args.apex_tol or bool(e.get('ends'))  # a build's shape is the composer's call
            apex_rows.append(dict(f=round(e['f'], 2), kind=e['kind'], offset_f=round(off, 2), ok=ok,
                                  shape='ends' if e.get('ends') else 'apex'))
            if not ok and strict:  # in the full mix the music decides where the envelope peaks
                add('apex', 'warn', int(round(e['f'])), f'{e["kind"]}: the swell peaks {off:+.1f} f from its frame; '
                    'put its apex on the velocity peak (place_at_peak with the exported frame)')

    # ---- picture: visual peak alignment
    visual = None
    if args.video and not args.no_visual:
        d = [0.0]
        prev = None
        for _, im in decode(args.video, vinfo, 0, None, size=(SW, SH)):
            cur = im.astype(np.int16)
            if prev is not None:
                d.append(float(np.abs(cur - prev).mean()))
            prev = cur
        d = np.array(d)
        vrows, bad = [], []
        W6 = args.vis_window
        items = [(g['f'], 'onset', sorted(g['kinds'])) for g in groups] + [(e['f'], 'apex', [e['kind']]) for e in ev_ap]
        allf = np.array(sorted(e['f'] for e in cues['events']))
        for f, typ, kinds in items:
            fi = int(round(f))
            if np.sum(np.abs(allf - f) <= W6) > sum(1 for e in cues['events'] if abs(e['f'] - f) <= args.cluster):
                continue  # other events nearby: the picture peak cannot be attributed to this one
            if fi - W6 < 1 or fi + W6 >= len(d):
                continue
            seg = d[fi - W6:fi + W6 + 1]
            k = int(np.argmax(seg))
            med = float(np.median(d[max(1, fi - 15):fi + 16]))
            strength = float(seg[k] / (med + 0.05))
            off = k - W6
            clear = strength >= 2 and seg[k] >= 0.5
            lo, hi = (-2, 3) if typ == 'onset' else (-2, 2)
            at_event = float(d[max(1, fi - 1):fi + 4].max())  # the picture changes on the sound itself
            ok = (not clear) or lo <= off <= hi or at_event >= 0.35 * seg[k]
            row = dict(f=round(f, 2), type=typ, kinds=kinds[:3], peak_offset_f=off, strength=round(strength, 1),
                       clear=clear, ok=ok)
            vrows.append(row)
            if not ok:
                bad.append(row)
        for r in bad[:15]:
            add('visual', 'warn', int(round(r['f'])), f'{"/".join(r["kinds"])}: the picture peaks {r["peak_offset_f"]:+d} f '
                'from its sound; move the picture (start at cue-1, pulses peak +2 f), not the sound')
        # a landing sound after its motion has already finished. An E.out arrival covers 90% of its
        # travel in about 40% of its duration, so the eye reads it as landed long before the tween's
        # last frame; a sound on that last frame, or on a bar line the motion already reached, lands
        # on nothing and the arrival itself goes unsounded.
        late = []
        for e in cues['events']:
            if e['kind'] not in ('land', 'pop', 'tock', 'bell', 'snap', 'hit', 'drop'):
                continue
            fi = int(round(e['f']))
            if fi - 60 < 1 or fi + 4 >= len(d):
                continue
            before = d[fi - 60:fi - 8]
            peak = float(before.max())
            if peak < max(1.0, 3 * float(np.median(d[1:]))):
                continue  # no clear motion before it: a cut, a pulse or a held frame is judged above
            if float(d[fi - 8:fi + 4].max()) >= max(0.12, 0.05 * peak):
                continue  # still moving, or something changes on the sound itself
            moving = np.nonzero(d[fi - 60:fi] >= 0.25 * peak)[0]
            late.append(dict(f=round(float(e['f']), 1), kind=e['kind'], id=e.get('id', ''),
                             stopped_f=int(fi - (fi - 60 + int(moving[-1])))))
        for r in late[:8]:
            add('visual', 'warn', int(round(r['f'])), f'{r["kind"]} {r["id"]}: the picture stopped moving about '
                f'{r["stopped_f"]} f before this sound, so it lands on nothing and the arrival goes unsounded. '
                'Cue a landing where the eye reads it: the contact frame of a spring or E.contact, settleOf() '
                '(about the 97% frame) of an E.out, never the tween\'s last frame')
        # Not every picture change gets a sound: most cuts are carried by the music, and continuous
        # motion stays silent. Only the few biggest changes of the film (the hero reveal, a section
        # change, a camera-scale move) should meet an audio event, music or effect: an onset in the
        # full mix or the effects, or a whoosh's envelope peak, within +-peak_tol frames.
        pk, props = signal.find_peaks(d, prominence=max(1.0, 3 * float(np.median(d[1:]))), distance=12)
        env_v, ms_v = band_env(sfx_sig, sr, 60, 16000, win_ms=30, hop_ms=5)
        epk, _ = signal.find_peaks(env_v, prominence=0.1 * float(env_v.max() or 1.0))
        mix_on = on_t if not strict else librosa_onsets(mono, sr, args.onset_delta)
        heard = np.concatenate([on_t * fps, mix_on * fps, epk * ms_v / 1000 * fps, [1e9]])
        evf = np.array([e['f'] for e in cues['events']]) if cues['events'] else np.array([1e9])
        # a move that accelerates into a contact peaks just before it, and its sound belongs on the
        # contact frame (a land, hit, snap or drop cue up to 10 f later), so that peak is explained
        contacts = np.array([e['f'] for e in cues['events'] if e['kind'] in ('land', 'hit', 'snap', 'drop')] or [1e9])
        strong = max(1.5, 4 * float(np.median(d[1:])))
        biggest = sorted(((int(p), float(pr)) for p, pr in zip(pk, props['prominences']) if pr >= strong),
                         key=lambda r: -r[1])[:max(0, args.big)]
        lonely = [dict(frame=p, mad=round(float(d[p]), 2), prominence=round(pr, 2),
                       nearest_sound_f=round(float(heard[np.argmin(np.abs(heard - p))] - p), 1),
                       cue_event_nearby=bool(np.min(np.abs(evf - p)) <= W6))
                  for p, pr in biggest
                  if np.min(np.abs(heard - p)) > args.peak_tol and not np.any((contacts - p > 0) & (contacts - p <= 10))]
        for r in lonely:
            near = r['nearest_sound_f']
            add('visual', 'warn', r['frame'], f'one of the {args.big} biggest picture changes (MAD {r["mad"]}) has no audio '
                f'onset within +-{args.peak_tol} f' + (f' (nearest {near:+.0f} f)' if abs(near) < 60 else '')
                + ': if it is the hero reveal or a section change, consider landing the music\'s own event there '
                '(the drop, a stop, the re-entry; move the picture onto the bar). An ordinary cut needs no sound')
        # the reverse: a loud sound needs something visible that causes it. A hit on a frozen hold
        # reads as unmotivated; give it a pulse, a landing or a push accent, or make it quieter.
        still_hits = []
        if len(epk) and env_v.max() > 0:
            top = float(env_v.max())
            for q in epk:
                if env_v[q] < 0.5 * top:  # within 6 dB of the loudest effect
                    continue
                p = int(round(q * ms_v / 1000 * fps))
                if p - 3 < 1 or p + 7 > len(d):
                    continue
                win = float(d[p - 3:p + 7].max())
                base = float(np.median(d[max(1, p - 30):p + 31]))
                if win < max(0.3, 2 * base):
                    still_hits.append(dict(frame=p, level_db=round(20 * np.log10(env_v[q] / top), 1), picture_mad=round(win, 2)))
        for r in still_hits[:6]:
            add('visual', 'warn', r['frame'], f'a loud sound ({r["level_db"]:+.1f} dB from the loudest effect) lands on a '
                f'still picture (MAD {r["picture_mad"]} from -3 to +6 f): give it a visible cause (a pulse, a landing, '
                'a push accent) or make it quieter')
        clear_rows = [r for r in vrows if r['clear']]
        visual = dict(still_hits=still_hits[:12], late_sounds=late[:12], checked=len(vrows), clear_peaks=len(clear_rows),
                      aligned=sum(1 for r in clear_rows if r['ok']),
                      median_peak_offset_f=float(np.median([r['peak_offset_f'] for r in clear_rows])) if clear_rows else None,
                      misaligned=bad[:40], biggest_changes=[dict(frame=p, prominence=round(pr, 2)) for p, pr in biggest],
                      peaks_without_event=lonely)

    # ---- loudness
    loud = None
    if not args.no_loudness:
        I, lra, tp, moms = ebur128(src)
        target, target_from = film_lufs(args)
        targets = [target] if target is not None else [-14.0, -16.0]
        loud = dict(integrated_lufs=I, lra_lu=lra, true_peak_dbtp=tp, target=target,
                    target_from=target_from or 'none found: -14 and -16 both pass', accepted=targets)
        if moms:
            tm, mm = max(moms, key=lambda r: r[1])
            loud.update(momentary_max_lufs=mm, momentary_max_t=tm, momentary_max_frame=int(round(tm * fps)))
        gate = 'warn' if excerpt else 'fail'
        if I is None:
            add('loudness', gate, None, 'no integrated loudness (silent audio?)')
        elif min(abs(I - t) for t in targets) > args.lufs_tol:
            add('loudness', gate, None, f'integrated {I:.1f} LUFS, target {" or ".join(f"{t:g}" for t in targets)} '
                f'+-{args.lufs_tol:g} ({loud["target_from"]}): re-run the master loudness passes')
        if tp is not None and tp > args.tp_max:
            add('loudness', 'fail', None, f'true peak {tp:.1f} dBTP > {args.tp_max:g}'
                + (' after the AAC encode: lower the limiter ceiling' if not args.audio else ''))
        sc = score_json(args)
        lra_rng = args.lra or ('3,14' if sc is not None and effects_only(sc) else '3,8')
        lo_lra, hi_lra = (float(v) for v in lra_rng.split(','))
        if lra is not None and not lo_lra <= lra <= hi_lra:
            add('loudness', 'warn', None, f'loudness range {lra:.1f} LU outside {lo_lra:g}-{hi_lra:g}: '
                + ('too flat, no drops or builds' if lra < lo_lra else 'too wide for a short film'))
        pay = args.payoff or ('payoff' if 'payoff' in cues['cue'] else None)
        if pay:
            if pay not in cues['cue']:
                notes.append(f'--payoff {pay} is not a cue name')
            elif moms:
                tp_ = cues['cue'][pay] / fps
                near = [m for t, m in moms if tp_ <= t <= tp_ + 1.5]
                far = [m for t, m in moms if not tp_ <= t <= tp_ + 1.5]
                if near and far:
                    margin = max(near) - max(far)
                    loud['payoff_margin_db'] = round(margin, 1)
                    if margin < 0:
                        add('loudness', 'warn', cues['cue'][pay], f'the payoff is {-margin:.1f} dB quieter than the '
                            'loudest moment elsewhere: make the payoff the peak (less limiting there, less elsewhere)')

    # ---- clipping, clicks, tail
    clip = int((np.abs(x) >= 0.99999).sum())
    if clip:
        add('clipping', 'fail', None, f'{clip} samples at full scale')
    clicks = []
    if sr > 30000:
        sos = signal.butter(4, 14000, 'high', fs=sr, output='sos')
        for ch in range(x.shape[1]):
            hp = signal.sosfilt(sos, x[:, ch])
            e = np.abs(hp)
            e2 = hp ** 2
            loc = np.sqrt(signal.fftconvolve(e2, np.ones(int(sr * 0.02)) / int(sr * 0.02), mode='same').clip(0)) + 1e-5
            near = np.sqrt(signal.fftconvolve(e2, np.ones(int(sr * 0.004)) / int(sr * 0.004), mode='same').clip(0)) + 1e-5
            # a click is a near-single-sample event: it towers over the 20 ms around it AND over the 4 ms
            # around it; the attack of a designed tick or noise burst is spread over several ms
            idx = np.nonzero((e / loc > 9) & (e / near > 6) & (e > 0.01))[0]
            last = -10 ** 9
            h1, h10 = max(1, sr // 2000), max(1, sr // 200)  # +-0.5 ms and +-5 ms
            for i in idx:
                if i - last > sr * 0.01:
                    # a digital click puts nearly all its > 14 kHz energy inside 1 ms; the attack of a
                    # clap, snap or tick spreads it over several ms (measured: clicks >= 0.97, attacks <= 0.7)
                    conc = float(e2[max(0, i - h1):i + h1].sum() / (e2[max(0, i - h10):i + h10].sum() + 1e-15))
                    clicks.append(dict(t=round(i / sr, 4), frame=int(i / sr * fps), ch=ch, level=round(float(e[i]), 3),
                                       concentration=round(conc, 2), kind='click' if conc >= 0.8 else 'attack'))
                last = i
    clicks.sort(key=lambda c: (c['t'], c['ch']))
    clicks = [c for i, c in enumerate(clicks) if i == 0 or c['t'] - clicks[i - 1]['t'] > 0.001]  # one per moment
    # a sharp attack within +-1 f of a cue the effects voice is that sound's designed transient (a kit
    # take is audited for clicks by `kit.py check`; a tap or knock starts that fast), not a buffer edge
    on_f = np.array([e['f'] for e in ev_on]) if ev_on else np.array([])
    for c in clicks:
        if c['kind'] == 'click' and len(on_f) and float(np.min(np.abs(on_f - c['t'] * fps))) <= 1.0:
            c['kind'], c['on_cue'] = 'attack', True
    bad_clicks = [c for c in clicks if c['kind'] == 'click']  # a percussive attack is designed; a cut is not
    if bad_clicks:
        add('clicks', 'warn', bad_clicks[0]['frame'], f'{len(bad_clicks)} clicks (> 14 kHz energy packed into 1 ms, '
            f'first at {bad_clicks[0]["t"]:.3f} s): a buffer edge with no fade or a hard-cut envelope; end every '
            'sound with a 6 ms cos^2 tail and start it at zero')
    tail = dict(rms50_dbfs=round(20 * np.log10(np.sqrt((mono[-int(sr * 0.05):] ** 2).mean()) + 1e-12), 1),
                peak10_dbfs=round(20 * np.log10(np.abs(mono[-int(sr * 0.01):]).max() + 1e-12), 1))
    r1 = np.sqrt((mono[-sr:-sr // 2] ** 2).mean()) if n > sr else 0
    r2 = np.sqrt((mono[-sr // 2:] ** 2).mean()) if n > sr else 0
    tail['last_half_vs_previous_db'] = round(20 * np.log10((r2 + 1e-12) / (r1 + 1e-12)), 1)
    if excerpt:
        pass
    elif tail['rms50_dbfs'] > args.tail_rms or tail['peak10_dbfs'] > args.tail_peak:
        add('tail', 'fail', None, f'the end is not silent (last 50 ms {tail["rms50_dbfs"]} dBFS, last 10 ms peak '
            f'{tail["peak10_dbfs"]} dBFS): fade to digital zero and leave >= 60 f of tail')
    elif tail['last_half_vs_previous_db'] > 0 and r1 > 1e-4:
        add('tail', 'warn', None, 'the last half second is louder than the one before: the ending is cut, not decayed')
    # the ending: a decay, never a cut (the same measure as score.py's and track.py check's)
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio'))
        import dsp as _D  # noqa: E402
        ending = _D.ending_shape(mono, sr)
        ending_msg = _D.ending_problem(ending)
        dead_max = _D.END_DEAD_AIR_S
    except Exception as e:  # noqa: BLE001
        ending, ending_msg, dead_max = dict(note=f'not measured ({type(e).__name__}: {e})'), None, None
    if excerpt:
        pass
    elif ending_msg:
        add('ending', 'fail', int(round(float(ending['last_loud_s']) * fps)),
            ending_msg + ': track.py edit --end own|fade|hit (references/music.md), and a tail that holds MUSIC.end.hold')
    elif dead_max is not None and (ending.get('dead_air_s') or 0) > dead_max:
        add('ending', 'warn', None, f"{ending['dead_air_s']:.1f} s of silence after the last sound: the picture holds on nothing; "
            "end the film where the music's ring or fade ends (the tail = MUSIC.end.hold)")
    # the head: sample 0 starts from silence (master.py fades in over 3 ms); a sound already at level
    # in the first 5 ms is a click on the first frame, or a sound cut in mid-action
    h5 = np.abs(x[:max(1, int(sr * 0.005))])
    head = dict(peak5_dbfs=round(20 * np.log10(h5.max() + 1e-12), 1), sample0_dbfs=round(20 * np.log10(h5[0].max() + 1e-12), 1))
    # with a track whose edit puts bar 1's attack on frame 0 (track.py edit --film-t0 0) the film opens on a downbeat, by design
    seg0 = (((srep or {}).get('music') or {}).get('segments') or [None])[0]
    t0m = float(seg0['film_s']) if isinstance(seg0, dict) and isinstance(seg0.get('film_s'), (int, float)) else None
    head['track_film_t0'] = t0m
    if not excerpt and head['peak5_dbfs'] > args.head_peak and not (t0m is not None and t0m < 0.005):
        add('head', 'warn', 0, f'the audio starts at level: first 5 ms peak {head["peak5_dbfs"]} dBFS (> {args.head_peak:g}), '
            f'sample 0 at {head["sample0_dbfs"]} dBFS: '
            + ('a click on the first frame; re-master through scripts/audio/master.py, which fades in from zero over 3 ms'
               if head['sample0_dbfs'] > -45 else  # a faded head decodes from AAC at about -60
               f"the track's edit opens {t0m:.2f} s before bar 1, inside what plays there: start the film on bar 1's attack "
               '(track.py edit --film-t0 0) or on bars where the track begins quietly (--start-bar)' if t0m is not None else
               'a sound already in progress at frame 0 (a riser, pad or reverb begun before the film) cuts in '
               'mid-action; start from silence, or on the attack of a hit designed for frame 0'))
    if vinfo:
        vdur = vinfo['frames'] / vinfo['fps']
        if abs(vdur - dur) > 1.5 / fps:
            add('duration', 'warn', None, f'audio {dur:.3f} s vs picture {vdur:.3f} s: mux with -shortest '
                'and render the soundtrack to TOTAL frames')

    # ---- masking (stems)
    masking = None
    if strict and music_sig is not None:
        bands = [(60, 250), (250, 1000), (1000, 4000), (4000, 12000)]
        sb = [signal.sosfilt(signal.butter(4, b, 'band', fs=sr, output='sos'), sfx_sig) for b in bands]
        mb = [signal.sosfilt(signal.butter(4, b, 'band', fs=sr, output='sos'), music_sig) for b in bands]
        win = int(0.06 * sr)
        margins = role_margins(args, args.mask_db)
        by_f = {round(float(e['f']), 2): e.get('role') for e in (json.load(open(sp)).get('events', []) if sp else [])}
        mrows = []
        for g in groups:
            i = int(g['f'] / fps * sr)
            if i + win > n or g['kinds'] == {'key'} or g['crisp']:
                continue  # typing and crisp ticks sit just over the music by design: score.py's report judges them
            lv_s = [10 * np.log10((s[i:i + win] ** 2).mean() + 1e-12) for s in sb]
            lv_m = [10 * np.log10((m[i:i + win] ** 2).mean() + 1e-12) for m in mb]
            if max(lv_s) < -75:  # nothing in the sfx stem here (a picture-only cue, or a sound on another bus)
                continue
            j = int(np.argmax(np.array(lv_s) - np.array(lv_m)))
            role = by_f.get(round(g['f'], 2))
            mrows.append(dict(f=round(g['f'], 2), kinds=sorted(g['kinds'])[:3], role=role, band=f'{bands[j][0]}-{bands[j][1]}',
                              margin_db=round(lv_s[j] - lv_m[j], 1), target_db=margins.get(role, args.mask_db)))
        low = [r for r in mrows if r['margin_db'] < r['target_db']]
        masked = [r for r in mrows if r['margin_db'] < 0]
        masking = dict(checked=len(mrows), below_target=len(low), masked=len(masked),
                       worst=sorted(mrows, key=lambda r: r['margin_db'])[:15])
        if masked:
            add('masking', 'warn', int(round(masked[0]['f'])), f'{len(masked)} effects sit under the music in their '
                f'own band (worst {masking["worst"][0]["margin_db"]} dB at f{masking["worst"][0]["f"]}): move the effect off '
                'the busy band, raise its weight, or cut to a sparser bar under it (track.py edit); the music never ducks')

    # ---- the music's level never steps mid-shot (a film with a track)
    lv = level_steps(music_sig if music_sig is not None else mono, sr, raw_cues, fps)
    if lv:
        for r in lv[:6]:
            add('level', level_severity(r['step_db']), r['f'],
                f"the music {'rises' if r['step_db'] > 0 else 'falls'} {abs(r['step_db']):.1f} dB at {r['t']:.2f} s on no picture event "
                f"(the nearest cut or seam is f{r['nearest_event_f']}): a section entering mid-shot reads as a mistake; fit the "
                "edit to the shots (track.py fit) so its level changes ride the cuts, or cut the picture on it")

    # ---- music_sync (a film with a track) and score.py's music figures
    msync = music_sync(raw_cues, fps)
    if msync:
        for r in msync['rows']:
            if not r['ok']:
                add('music', 'fail' if r['exact'] else 'warn', int(round(r['f'])),
                    f"{r['what']} sits {r['off_f']:+.1f} f from the music's nearest {r['nearest']} (f{r['nearest_f']}): "
                    "structure lands on the music's events within 1 f")
        for nm in msync['near_misses'][:6]:
            add('music', 'warn', int(round(nm['f'])), f"a hard cut {nm['off_f']:+.1f} f off a strong accent (f{nm['accent_f']}): "
                'a near miss reads as a mistake; move it onto the accent or well clear of it')
    if srep:
        for k_ in ('over_bed', 'stop_downs', 'no_duck', 'density', 'music'):
            if srep.get(k_) is not None:
                msync = msync or {}
                msync[k_] = srep[k_] if k_ != 'over_bed' else {kk: v for kk, v in srep[k_].items() if kk != 'effects'}
    fails = sum(1 for f in flags if f['severity'] == 'fail')
    res = dict(file=args.video, audio_source=src, sr=sr, fps=round(fps, 3), duration_s=round(dur, 3), excerpt=excerpt,
               cues=args.cues, cue_schema=cues['schema'], pass_=fails == 0, fails=fails,
               warnings=len(flags) - fails, notes=notes, flags=flags, sync=sync,
               apex=dict(checked=len(apex_rows), off=[r for r in apex_rows if not r['ok']], rows=apex_rows),
               visual=visual, loudness=loud, clipping_samples=clip, clicks=clicks[:40], tail=tail, head=head, masking=masking,
               music_sync=msync, intended=sp, ending=ending, level=lv)
    res['pass'] = res.pop('pass_')
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w') as fh:
            json.dump(res, fh, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))

    print(f'av-audit: {src}  {"PASS" if res["pass"] else "FAIL"}  ({fails} fail, {res["warnings"]} warn)')
    print(f'  sync: {sum(r["hit"] for r in rows)}/{len(rows)} onsets within +-{args.tol:g} f '
          f'({"sfx stem" if strict else "full mix"}), median offset {sync["median_offset_f"]:+.2f} f, '
          f'p90 |offset| {sync["p90_abs_offset_f"]} f; apex {sum(r["ok"] for r in apex_rows)}/{len(apex_rows)}')
    if visual:
        print(f'  picture: {visual["aligned"]}/{visual["clear_peaks"]} clear visual peaks aligned; '
              f'{len(visual["peaks_without_event"])} of the {len(visual["biggest_changes"])} biggest picture changes '
              f'with no audio onset within +-{args.peak_tol} f')
    if loud:
        print(f'  loudness: I {loud["integrated_lufs"]} LUFS (target {" or ".join(f"{t:g}" for t in loud["accepted"])}), '
              f'LRA {loud["lra_lu"]} LU, TP {loud["true_peak_dbtp"]} dBTP, '
              f'max momentary {loud.get("momentary_max_lufs")} at {loud.get("momentary_max_t")} s')
    if ending.get('drop20_s') is not None:
        print(f"  ending: {'ABRUPT' if ending.get('abrupt') else 'decays'} (the last loud moment {ending.get('last_loud_s')} s falls 20 dB in "
              f"{ending.get('drop20_s')} s, then {ending.get('tail_s')} s of decay; {ending.get('dead_air_s')} s of silence after)")
    print(f'  head: first 5 ms peak {head["peak5_dbfs"]} dBFS; tail: last 50 ms {tail["rms50_dbfs"]} dBFS, '
          f'last 10 ms peak {tail["peak10_dbfs"]} dBFS; '
          f'clicks {len(bad_clicks)} (+{len(clicks) - len(bad_clicks)} attacks); clipped samples {clip}')
    for nt in notes:
        print(f'  note: {nt}')
    for f in flags[:25]:
        where = f' f{f["frame"]}' if f['frame'] is not None else ''
        print(f'  {f["severity"]:4s} {f["check"]:8s}{where}: {f["note"]}')
    if args.json:
        print(f'  report: {args.json}')
    sys.exit(0 if res['pass'] else 1)


if __name__ == '__main__':
    main()
