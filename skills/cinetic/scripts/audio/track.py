#!/usr/bin/env python3
"""
track.py: the film's licensed music track, from its licence record to the film-time grid.

A music-led film plays one licensed, human-made, instrumental track, edited only at bar lines. The
track is chosen and analysed before the timeline is written; the picture is cut to it, and the track
is never re-timed to the picture. The track file stays out of git (audio/music/ is git-ignored); its
licence record, its analysis and the edit are committed (JSON, no audio).

Usage (from the project root):
  python3 scripts/audio/track.py add FILE --title T --artist A --source S --page URL --licence "..."
          --seen-quote "..." --seen-url URL [--seen-date YYYY-MM-DD] [--credit "..."] [--file-url URL]
          [--content-id "not registered"] [--ai-generated no] [--vocals no] [--modifications "..."] [--force]
      -> audio/music/<name>.licence.json (hash, licence class, the licence as read on the item's own page)
  python3 scripts/audio/track.py analyze FILE [--profile calm|crisp|punchy] [--bpm N] [--phase N] [--json OUT] [--force]
      -> audio/music/<name>.track.json (tempo, grid, bars, phrases, sections, entries, breaks, stops, accents,
         ending, key, loudness); an analysis already there of the same file (sha256) is kept without loading
         librosa when every option given matches it (one not given keeps the analysis's own: a phase set by hand
         stays set); another --phase re-grids from the measurements the first analysis cached in out/cache/music/
         (no second analysis); --force analyses again
  python3 scripts/audio/track.py edit [TRACK.json] --bars N --reveal-bar K [--end auto|own|button|ring|hit|fade]
          [--start-bar S] [--entry B] [--arc "-14,-12,..."] [--film-t0 0.25] [--fade 2.5] [--out audio/music/edit.json]
          [--map "1:2x10,11:59x2"]
      -> audio/music/edit.json (source bars -> film bars, joins, the film-time grid, ending); --map gives the
         film's bars by hand (film bar:source bar x bars, in order) instead of the planner's choice
  python3 scripts/audio/track.py fit [TRACK.json] [--end auto|own|hit|fade] [--entry B] [--film-t0 0.25] [--out audio/music/edit.json]
      -> the edit fitted to the film's beat plan, then the grid: the timeline (src/timeline.ts) is read at the
         track's tempo (a provisional src/music.ts), so its BARS, its reveal (the lockup's bar) and its cuts come
         from the script, never from a guess; the edit plays exactly those bars, lands the track's biggest entry on
         the lockup's bar, ends on a hit (its own button or ring, else one ringing kit hit; a fade under the end card
         only when --end fade asks), and keeps the level steady inside a shot (a step over 4 dB costs, except on a
         bar that carries a cut); then src/music.ts as track.py grid writes it, and the film's bars checked equal
  python3 scripts/audio/track.py grid [--edit audio/music/edit.json] [--fps N] [--out src/music.ts | music.js]
      -> src/music.ts (Remotion) or music.js (HyperFrames): the film-time grid the timeline imports; an
         audio/score.json there is pointed at the edit (music.track, .edit, .licence; the key; no bpm)
  python3 scripts/audio/track.py check [--edit audio/music/edit.json] [--json out/qa/track_check.json]
      -> the joins measured on the edited bed, the licence record, audio/score.json playing this edit's track,
         and nothing made from the track in git
  python3 scripts/audio/track.py music [--edit audio/music/edit.json]          (npm run music)
      -> analyze, edit and grid again with the settings the analysis and edit.json already hold

Analysis (numpy, scipy, librosa, ffmpeg; no models, no network):
  decode     ffmpeg to 48 kHz float stereo (a mono source duplicated at unity), cached in out/cache/music/
  tempo      librosa beats for a first period (prior: calm 100, crisp 120, punchy 128 BPM, or --bpm), then
             the period and phase whose fold of a fine spectral flux (23 ms window at 2.9 ms) over the whole
             track collects the most onset energy; every beat is then measured on its own attack: the drift
             (RMS and max; over 12 ms RMS the track wanders: cut to its accents, not its grid)
  phase      the grid moved onto the measured attacks (the flux trails an attack by a few ms)
  downbeat   each of the 4 beat phases scored by low-band onsets, harmonic change, the level change across
             the beat and the timbre change across it; confidence = the gap to the runner-up (under 0.5
             both grids are printed, edit refuses: rerun with --phase N, which confirms the current phase in
             place or re-grids from the cached measurements; unless the biggest low-band entrance, a kick or bass coming in 12 dB or more, lands on
             the chosen downbeat: then the grid stands with a warning); 8-bar windows where another phase
             wins are listed
  bars       every bar's downbeat on its own attack (a played track breathes); loudness (K-weighted), low
             band, onset density, centroid, chroma and timbre; novelty against the bar before
  phrases    the 4- or 8-bar lattice (and offset) that collects the most novelty
  sections   intro / body / break / peak / outro from phrase starts and three loudness levels
  entries    a bar >= 4 dB over the louder of the two before it with the low band >= 6 dB up, or >= 2.5 dB
             with the low band >= 12 dB up (a kick entering under an intro); a drop when a break or a stop comes
             first; breaks: a bar >= 5 dB down; stops: 0.15-1.0 s where the 50 ms level falls >= 12 dB under the
             local median and under the same span a bar away (the track's own stop-downs, not a groove's gaps)
  accents    attacks whose loudest 50 ms rise >= 6 dB over the median 50 ms level of the second before, with
             their band (low = kick or sub, mid = snare, clap or stab, high = hats) and bar:beat position
  ending     button (a final hit, then a decay with no new onset), ring (a long decay on a chord), fade (the
             level falls over 4+ bars, already falling before the bar of a last hit: the edit fades it out under
             the end card instead; a hit on level bars whose ring dies into a quiet last bar is a ring) or loop (no
             ending); with the final hit's bar (final_bar) and its ring-out (ring_out_s: to 40 dB under its peak)
  key      Krumhansl on the mean chroma, and per section (splices join parts in one key only)

The edit is a dynamic programme over the film's bars: an energy arc (intro -14, body -6, break -10, peak 0,
resolve; dB re the track's loud bars), a jump cost (how unlike the bar that would naturally follow the target
sounds), a phrase penalty, no key change across a jump, at least 2 bars per segment and at most one splice
per 8 film bars. Anchors: the reveal's film bar holds the chosen entry (default: the biggest drop entry); the
ending never cuts the music to silence:
  own      (`auto`'s first choice) the track's own ending: its final bars close the body, so its final hit lands on
           the bar line after the body (`button`, end.f on it) or its last chord rings (`ring`), and the tail holds
           its natural ring-out for 1.5-2.5 s (end.hold)
  fade     the bed plays on past the body and fades out over --fade 2-3 s under the end card (a track that ends on a
           fade, or loops: `auto`'s choice for it)
  hit      the bed's downbeat on the bar line after the body is the last thing it plays, released over 0.5 s under
           ONE kit element (drop or hit) that rings 1.5 s or more through the hall (score.py); `stop`, the old name,
           now means this: the 0.2-0.7 s gap of silence before the element is gone
end.hold (frames) is how long the picture holds after the bar line after the body so the ending completes: the
templates' tail is at least that.
The opening: bar 1's downbeat at --film-t0; the bars before it play from frame 0, faded in from silence over 80 ms
(so the film does not cut into a note: av-audit head), or --film-t0 0 opens on bar 1's attack.
Joins: the incoming segment starts 8 ms before its downbeat's attack with an 8 ms fade-in, so the downbeat's
transient comes whole from the incoming bar; the outgoing segment runs on 60 ms with a tail fade (150 ms
when it sustains). `check` measures each join on the edited bed: no click, the attack within +-2 ms of the
film downbeat, a loudness step under 3 LU unless it is an entry (or a step down into the break before the
reveal, or into the last bars of a button or ring ending), no chopped note, no start inside a note.

Exit codes: 0 done; 1 invalid input, a refused licence, a failed check; 2 tempo or downbeat unresolved
(low confidence: rerun analyze with --phase N, or choose another track).
"""
import argparse
import datetime
import json
import math
import os
import re
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import credits as CR  # noqa: E402
import mixkeys as MK  # noqa: E402

SR = 48000
AR = 22050                    # analysis rate (librosa features)
PRIOR = {'calm': 100.0, 'crisp': 120.0, 'punchy': 128.0}
ANALYSIS_VERSION = 1          # raise it when the analysis changes, so older .track.json files are made again
BPB = 4                       # beats per bar
DRIFT_WARN_MS = 12.0          # a robust-fit residual RMS above this: the track wanders (played live)
CONF_MIN = 0.5                # downbeat confidence under this: edit refuses until the phase is set
ENTRY_DB, ENTRY_LOW_DB, BREAK_DB = 4.0, 6.0, -5.0
ENTRY_VOTE_DB, VOTE_WEIGHT, VOTE_MIN_DB = 3.0, 1.0, 6.0
ENTRY_LOW_VOTE_DB = 6.0       # a low-band rise over this (kick or bass coming in) votes for its beat's phase           # downbeat: rises of a part over this vote for their beat's phase
ENTRY_KICK_DB, ENTRY_KICK_LOW_DB = 2.5, 12.0   # a kick entering under an intro: a smaller step, a big low-band rise
ENTRY_CONFIRM_DB, ENTRY_CONFIRM_GAP_DB = 12.0, 2.0  # a low-band entrance this big, this clear of other phases, confirms a low-confidence grid
STOP_DB, STOP_MIN_S, STOP_MAX_S = 12.0, 0.15, 1.0
ACCENT_DB = 6.0
MIDSHOT_DB, MIDSHOT_W = 4.0, 2.0   # fit: a level step over 4 dB inside a shot costs 2 a dB (a section entering mid-shot)
# a muffled bar (a filtered intro or break: its spectral centroid under 700 Hz and under 0.4 of the track's 75th
# percentile bar) costs this much a film bar after the first: a short film played on a filter sweep is a murk every click
# sinks into (score.py fails a bed whose 2-8 kHz band sits under -35 dB of the whole)
MUFFLE_HZ, MUFFLE_RATIO, MUFFLE_W = 700.0, 0.4, 2.0
FADE_INTO_HIT_DB = 2.0        # ending: a fade with a hit in its last bars has fallen this much over the 2 bars before it
PRE_MS, TAIL_MS, TAIL_SUSTAIN_MS = 8.0, 60.0, 150.0
OPEN_FADE_S = 0.08            # an opening inside the track (bars before film bar 1) fades in from silence this long: the
                              # film's first 5 ms stay under -40 dBFS (av-audit head) and the pickup still sounds
JOIN_ATTACK_MS = 2.0          # check: the incoming attack within this of the film downbeat
STOP_FADE_S, STOP_GUARD_S = 0.025, 0.003   # (unused since the stop ending became a hit: kept for old imports)
END_MODES = ('auto', 'own', 'button', 'ring', 'hit', 'fade', 'stop')
HIT_LET_S, HIT_RELEASE_S = 0.06, 0.5    # hit ending: the bed's downbeat attack sounds whole, then a cos^2 release under the hit
HIT_RING_S = 1.8                        # hit ending: the ring the tail holds (the element through the hall: score.py)
RING_MIN_S, RING_MAX_S = 1.5, 2.5       # own ending: the tail holds the final hit's natural ring-out for this long
FADE_MIN_S, FADE_MAX_S = 2.0, 3.0       # fade ending: the fade under the end card
LEVEL_FLOOR = -90.0           # LUFS / dB: digital silence reads as this, so depths and novelty stay finite
AUDIO_EXT = ('.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.aif', '.aiff', '.opus')
KK_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KK_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']


class TrackError(Exception):
    def __init__(self, msg, code=1):
        super().__init__(msg)
        self.code = code


def finite(o):
    """o with every NaN or infinity as None: JSON has no NaN (a track with too few clear attacks has no drift)."""
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, dict):
        return {k: finite(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [finite(v) for v in o]
    return o


def write_json(path, obj):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(finite(obj), indent=1, ensure_ascii=False, allow_nan=False) + '\n')


def read_json(path, what):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise TrackError(f'{what} not found: {path}') from None
    except json.JSONDecodeError as e:
        raise TrackError(f'{what} {path} is not valid JSON ({e})') from None


def r3(x):
    return round(float(x), 3)


def stem_of(path):
    return re.sub(r'[^a-z0-9]+', '_', os.path.splitext(os.path.basename(path))[0].lower()).strip('_') or 'track'


# ------------------------------------------------------------------------------------------
# decoding
# ------------------------------------------------------------------------------------------
def probe_channels(path):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels',
                              '-of', 'csv=p=0', path], capture_output=True, text=True, timeout=60).stdout.strip()
        return int(out.split(',')[0]) if out else 2
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return 2


def decode(path, cache_dir=None, sha=None):
    """(x float32 (n, 2) at 48 kHz, sha256). ffmpeg decodes (never libsndfile on MP3); a mono source is
    duplicated at unity. Cached as a float WAV in cache_dir (out/cache/music/, git-ignored) by hash."""
    if not os.path.isfile(path):
        raise TrackError(f'track not found: {path}')
    sha = sha or CR.sha256_file(path)
    cp = os.path.join(cache_dir, sha[:12] + '.wav') if cache_dir else None
    if cp and os.path.isfile(cp):
        import soundfile as sf
        x, sr = sf.read(cp, dtype='float32', always_2d=True)
        if sr == SR and x.shape[1] == 2:
            return x, sha
    ch = 1 if probe_channels(path) == 1 else 2
    p = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-map', '0:a:0', '-f', 'f32le', '-acodec',
                        'pcm_f32le', '-ac', str(ch), '-ar', str(SR), '-'], capture_output=True)
    if p.returncode != 0 or not p.stdout:
        raise TrackError(f'cannot decode {path}: {p.stderr.decode(errors="replace").strip()[:300] or "no audio"}')
    x = np.frombuffer(p.stdout, np.float32).reshape(-1, ch)
    x = np.repeat(x, 2, axis=1) if ch == 1 else x.copy()
    if cp:
        import soundfile as sf
        os.makedirs(cache_dir, exist_ok=True)
        sf.write(cp, x, SR, subtype='FLOAT')
    return x, sha


# ------------------------------------------------------------------------------------------
# attacks and the beat grid
# ------------------------------------------------------------------------------------------
def energy_ms(m48):
    """1 ms block energy of a mono 48 kHz signal (high-passed at 30 Hz so rumble does not hide attacks)."""
    from scipy import signal
    y = signal.sosfilt(signal.butter(2, 30, 'high', fs=SR, output='sos'), m48)
    n = len(y) // 48
    return (y[:n * 48].reshape(n, 48) ** 2).mean(1)


def rise_db(e, i):
    """dB rise at 1 ms block i: the next 4 ms over the 10 ms that end 2 ms before (vectorised over i)."""
    cs = np.concatenate([[0.0], np.cumsum(e)])
    i = np.asarray(i)
    n = len(e)
    pre = (cs[np.clip(i - 2, 0, n)] - cs[np.clip(i - 12, 0, n)]) / 10.0
    post = (cs[np.clip(i + 4, 0, n)] - cs[np.clip(i, 0, n)]) / 4.0
    floor = 1e-10 + 1e-4 * float(np.percentile(e, 95) if len(e) else 0)
    return 10 * np.log10((post + floor) / (pre + floor))


def attack_near(e, t, w=0.025):
    """(time s, rise dB) of the sharpest 1 ms rise within +-w of t."""
    c = int(round(t * 1000))
    idx = np.arange(max(12, c - int(w * 1000)), min(len(e) - 4, c + int(w * 1000) + 1))
    if len(idx) == 0:
        return float(t), 0.0
    r = rise_db(e, idx)
    k = int(np.argmax(r))
    return idx[k] / 1000.0, float(r[k])


def flux(y, n_fft=512, hop=64, block=4096):
    """log-compressed spectral flux, 23 ms window at 2.9 ms (22.05 kHz); (flux, frame centre times)."""
    win = np.hanning(n_fft).astype(np.float32)
    nfr = max(0, (len(y) - n_fft) // hop + 1)
    out, prev = np.zeros(nfr, np.float32), None
    for f0 in range(0, nfr, block):
        f = np.arange(f0, min(nfr, f0 + block))
        L = np.log1p(100 * np.abs(np.fft.rfft(y[f[:, None] * hop + np.arange(n_fft)] * win, axis=1)))
        d = np.diff(L, axis=0, prepend=L[:1] if prev is None else prev[None])
        out[f] = np.maximum(0, d).sum(axis=1)
        prev = L[-1]
    return out, (np.arange(nfr) * hop + n_fft / 2) / AR


def _fold(fs, tt, T, step=0.001, t_from=None, t_to=None):
    """the flux folded at period T: (mean flux at the best phase, that phase s from tt[0], contrast =
    best / median over the phases). fs: a flux series sampled at tt (evenly spaced)."""
    hop = float(tt[1] - tt[0])
    a = tt[0] if t_from is None else max(tt[0], t_from)
    b = tt[-1] if t_to is None else min(tt[-1], t_to)
    K = int((b - a - T) / T)
    if K < 4:
        return 0.0, 0.0, 1.0
    offs = np.arange(0.0, T, step)
    idx = np.clip(np.round((a - tt[0] + offs[:, None] + (np.arange(K) * T)[None, :]) / hop).astype(int), 0, len(fs) - 1)
    m = fs[idx].mean(axis=1)
    k = int(np.argmax(m))
    return float(m[k]), float(a - tt[0] + offs[k]), float(m[k] / (np.median(m) + 1e-9))


def comb_fit(fl, tt, T0, fixed=False, span=0.015):
    """The beat period and phase of a steady track: the period whose fold of the fine flux (smoothed by
    a 7 ms maximum, so a little timing play still counts) collects the most onset energy at one phase,
    searched within +-span of T0 (coarse 0.02 %, then fine 0.0005 % steps); fixed keeps T0 (a stated
    tempo). Returns (T, t0 = the first beat on the grid, contrast of the pulse)."""
    from scipy.ndimage import maximum_filter1d
    hop = float(tt[1] - tt[0])
    fs = maximum_filter1d(np.asarray(fl, np.float64), size=2 * max(1, int(round(0.0035 / hop))) + 1)
    if fixed:
        T = T0
    else:
        best = None
        for rel in np.arange(-span, span + 1e-12, 0.0002):
            v = _fold(fs, tt, T0 * (1 + rel), 0.002)[0]
            if best is None or v > best[0]:
                best = (v, T0 * (1 + rel))
        Tc = best[1]
        for rel in np.arange(-0.0003, 0.0003 + 1e-12, 0.000005):
            v = _fold(fs, tt, Tc * (1 + rel), 0.002)[0]
            if v > best[0]:
                best = (v, Tc * (1 + rel))
        T = best[1]
    _, ph, contrast = _fold(fs, tt, T, 0.0005)
    t0 = tt[0] + ph
    t0 -= np.floor((t0 - 1e-9) / T) * T if t0 >= T else 0.0
    return float(T), float(t0), float(contrast)


def low_onsets(m48):
    """low-band (<150 Hz) onset strength per 1 ms block: the positive step of the log energy."""
    from scipy import signal
    y = signal.sosfilt(signal.butter(2, 150, 'low', fs=SR, output='sos'), m48)
    n = len(y) // 48
    e = 10 * np.log10((y[:n * 48].reshape(n, 48) ** 2).mean(1) + 1e-10)
    d = np.maximum(0.0, e[4:] - e[:-4])           # the rise over 4 ms
    return np.concatenate([np.zeros(4), d])


def fold_at(on_ms, t0, T, dur, w=0.008):
    """mean of the largest onset value within +-w of every grid beat t0 + k T (on_ms: 1 ms blocks)."""
    from scipy.ndimage import maximum_filter1d
    mx = maximum_filter1d(on_ms, size=2 * int(w * 1000) + 1)
    k = np.arange(int((dur - t0) / T))
    idx = np.clip(np.round((t0 + k * T) * 1000).astype(int), 0, len(mx) - 1)
    return float(mx[idx].mean()) if len(idx) else 0.0


def clarity_at(fl, tt, T):
    return _fold(np.asarray(fl, np.float64), tt, T, 0.002)[2]


def key_estimate(chroma_mean):
    best = []
    for mode, prof in (('major', KK_MAJ), ('minor', KK_MIN)):
        for k in range(12):
            r = np.corrcoef(chroma_mean, np.roll(prof, k))[0, 1]
            best.append((float(r), f'{KEYS[k]} {mode}'))
    best.sort(reverse=True)
    return best[0]


def kmeans1(v, k=3, it=30):
    v = np.asarray(v, float)
    c = np.percentile(v, np.linspace(15, 85, k))
    for _ in range(it):
        lab = np.argmin(np.abs(v[:, None] - c[None]), axis=1)
        for j in range(k):
            if np.any(lab == j):
                c[j] = v[lab == j].mean()
    order = np.argsort(c)
    rank = np.empty(k, int)
    rank[order] = np.arange(k)
    return rank[np.argmin(np.abs(v[:, None] - c[None]), axis=1)], np.sort(c)


# ------------------------------------------------------------------------------------------
# analyze
# ------------------------------------------------------------------------------------------
MEASURED = ('grid', 'zs', 'chroma', 'mf', 'cen', 'pl', 'oenv')   # the arrays of a cached measurement


def measure_path(cache_dir, sha, profile, bpm):
    """The cached measurement of a track: by its hash, the tempo settings and the analysis code (this file,
    master.py, mixkeys.py), so a measurement made by other code is never read back."""
    if not cache_dir:
        return None
    import hashlib
    h = hashlib.sha256()
    for f in ('track.py', 'master.py', 'mixkeys.py'):
        with open(os.path.join(HERE, f), 'rb') as fh:
            h.update(fh.read())
    tempo = f'bpm{float(bpm):g}' if bpm else f'p{PRIOR.get(profile, 120.0):g}'
    return os.path.join(cache_dir, f'{sha[:12]}-{tempo}-v{ANALYSIS_VERSION}-{h.hexdigest()[:8]}.measure.npz')


def load_measure(cp):
    if not cp or not os.path.isfile(cp):
        return None
    try:
        with np.load(cp, allow_pickle=False) as z:
            m = json.loads(str(z['meta']))
            m.update({k: z[k] for k in MEASURED})
        return m
    except (OSError, ValueError, KeyError):
        return None


def save_measure(cp, m):
    if not cp:
        return
    try:
        os.makedirs(os.path.dirname(cp), exist_ok=True)
        tmp = cp[:-len('.npz')] + '.tmp.npz'
        np.savez_compressed(tmp, meta=np.array(json.dumps({k: v for k, v in m.items() if k not in MEASURED})),
                            **{k: m[k] for k in MEASURED})
        os.replace(tmp, cp)
    except OSError:
        pass


def _measure(path, x, m48, e1, kp, bt, bl, audible, dur, profile, bpm, say):
    """Everything the downbeat phase does not change: the tempo, the four phases' scores, the frame features
    the bars are measured from, the accents and the loudness (librosa runs here only)."""
    import librosa
    import master as M
    y = librosa.resample(m48.astype(np.float32), orig_sr=SR, target_sr=AR)
    fl, ftt = flux(y)

    # ---- tempo: librosa beats for the first period, then a comb fold of the fine flux over the whole
    # track for the exact period and phase, then every beat measured on its own attack (the drift)
    hop = 256
    oenv = librosa.onset.onset_strength(y=y, sr=AR, hop_length=hop)
    prior = float(bpm) if bpm else PRIOR.get(profile, 120.0)
    _, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=AR, hop_length=hop, start_bpm=prior, tightness=400,
                                       units='time')
    beats = np.asarray(beats, float)
    if len(beats) < 16:
        raise TrackError(f'only {len(beats)} beats tracked in {path}: not a steady-tempo track', 2)
    T0 = 60.0 / float(bpm) if bpm else float(np.median(np.diff(beats)))
    T, t0c, clarity = comb_fit(fl, ftt, T0, fixed=bool(bpm))
    # the beat, not the "and": hats on the off-beats can outweigh the kick in a broadband flux, so of the
    # two half-beat phases the one with more low-band (kick, bass) onset energy is the beat
    lo_on = low_onsets(m48)
    on_beat = fold_at(lo_on, t0c, T, dur)
    off_beat = fold_at(lo_on, t0c + T / 2, T, dur)
    half_beat_flip = bool(off_beat > 1.5 * on_beat and off_beat > 0)
    if half_beat_flip:
        t0c = t0c + T / 2 if t0c + T / 2 < T + 0.02 else t0c - T / 2
    gb = t0c + np.arange(int((dur - t0c) / T) + 1) * T
    att = np.array([attack_near(e1, b_, 0.035) for b_ in gb])
    clear = att[:, 1] >= 6.0
    res = att[:, 0] - gb
    if clear.sum() >= 8:
        lag = float(np.median(res[clear]))   # the flux peak trails the attack by a few ms: sit on the attacks
        rr = res[clear] - lag
        drift_rms, drift_max = float(np.sqrt(np.mean(rr ** 2)) * 1000), float(np.max(np.abs(rr)) * 1000)
        inl_frac = float(np.mean(np.abs(rr) < 0.035))
    else:
        lag, drift_rms, drift_max, inl_frac = 0.0, float('nan'), float('nan'), 0.0
    shift = lag
    t0 = t0c + lag
    c_half, c_dbl = clarity_at(fl, ftt, 2 * T), clarity_at(fl, ftt, T / 2)
    alt = (60.0 / (2 * T), c_half) if c_half >= c_dbl else (120.0 / T, c_dbl)
    bpm_m = 60.0 / T
    say(f'tempo {bpm_m:.3f} BPM, drift {drift_rms:.1f} ms RMS')

    # ---- downbeat phase: low-band onsets + harmonic change at each beat of the grid
    first = t0 - np.floor(t0 / T) * T
    grid = np.arange(first, dur - 1e-6, T)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    P = S ** 2
    freqs = librosa.fft_frequencies(sr=AR, n_fft=2048)
    low = P[freqs < 150].sum(axis=0)
    low_on = np.maximum(0, np.diff(low, prepend=low[0]))
    chroma = librosa.feature.chroma_stft(S=P, sr=AR, hop_length=512)
    mf = librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=P, sr=AR)), n_mfcc=13)
    cen = librosa.feature.spectral_centroid(S=S, sr=AR)[0]
    nfrm = S.shape[1]
    fr = lambda t: int(min(max(0, t * AR / 512), nfrm - 1))  # noqa: E731
    beat_low = np.array([low_on[max(0, fr(t) - 1): fr(t) + 3].max() for t in grid])
    chg = []
    for t in grid:
        a0, a1, b1 = fr(max(0, t - T)), fr(t), fr(min(dur, t + T))
        pa = chroma[:, a0:a1].mean(axis=1) if a1 > a0 else chroma[:, a1]
        pb = chroma[:, a1:b1].mean(axis=1) if b1 > a1 else chroma[:, a1]
        chg.append(1 - float(np.dot(pa, pb) / (np.linalg.norm(pa) * np.linalg.norm(pb) + 1e-9)))
    chg = np.array(chg)
    # bar lines carry the changes: the level over two beats after a beat against the two before (an entry,
    # a break), and the timbre over the beat after against the beat before (a new part)
    ckp = np.concatenate([[0.0], np.cumsum(kp)])
    lv2 = lambda a_, b_: 10 * np.log10((ckp[int(min(len(kp), max(0, b_ * SR)))] - ckp[int(min(len(kp), max(0, a_ * SR)))])  # noqa: E731
                                       / max(1.0, (b_ - a_) * SR) + 1e-12)
    lvl_chg = np.array([abs(lv2(t, t + 2 * T) - lv2(t - 2 * T, t)) for t in grid])
    tim = []
    for t in grid:
        a0, a1, b1 = fr(max(0, t - T)), fr(t), fr(min(dur, t + T))
        ma = mf[1:, a0:a1].mean(axis=1) if a1 > a0 else mf[1:, a1]
        mb = mf[1:, a1:b1].mean(axis=1) if b1 > a1 else mf[1:, a1]
        tim.append(1 - float(np.dot(ma, mb) / (np.linalg.norm(ma) * np.linalg.norm(mb) + 1e-9)))
    tim = np.array(tim)
    z = lambda v: np.clip((v - v.mean()) / (v.std() + 1e-9), -4, 4)  # noqa: E731
    zl, zc = z(beat_low), z(chg)
    zs = (zl + zc + z(lvl_chg) + z(tim)) * np.sqrt(0.5)   # four features on the scale of two (CONF_MIN)
    # entries vote: a part that comes in (the level over the next two beats >= 3 dB over the two before)
    # comes in on a downbeat; each phase scores its share of the rises
    g_ = 0.03  # both windows end / start 30 ms early: a grid beat a few ms after its attack leaks it into "before"
    before = np.array([lv2(t - 2 * T - g_, t - g_) for t in grid])
    rise = np.array([lv2(t - g_, t + 2 * T - g_) for t in grid]) - before - ENTRY_VOTE_DB
    # the music's first entrance out of silence does not vote (a track may open on a pickup)
    t_in = float(bt[audible[0]]) if len(audible) else 0.0
    settled = (grid - 2 * T - g_ >= t_in) & (before > np.median(before) - 30.0)  # two beats of music before it
    rise = np.where((rise > 0) & settled, rise, 0.0)
    # a kick or bass coming in (the low band over two beats >= 6 dB over the two before) votes too, at half
    # weight per dB: in four-on-the-floor music it is the clearest bar line there is
    from scipy import signal as _sg
    lo48 = _sg.sosfilt(_sg.butter(2, 150, 'low', fs=SR, output='sos'), m48) ** 2
    clo = np.concatenate([[0.0], np.cumsum(lo48)])
    lvl_lo = lambda a_, b_: 10 * np.log10((clo[int(min(len(lo48), max(0, b_ * SR)))] - clo[int(min(len(lo48), max(0, a_ * SR)))])  # noqa: E731
                                          / max(1.0, (b_ - a_) * SR) + 1e-12)
    lo_before = np.array([lvl_lo(t - 2 * T - g_, t - g_) for t in grid])
    lo_rise = np.array([lvl_lo(t - g_, t + 2 * T - g_) for t in grid]) - lo_before - ENTRY_LOW_VOTE_DB
    rise = rise + 0.5 * np.where((lo_rise > 0) & settled, lo_rise, 0.0)
    votes = [float(rise[p::BPB].sum()) for p in range(BPB)]
    big = np.argsort(rise)[::-1][:5]
    big_rises = [dict(t=r3(grid[i]), vote=round(float(rise[i]), 2), downbeat_in_phase=int(i % BPB)) for i in big if rise[i] > 0]
    vote_share = [v / max(sum(votes), VOTE_MIN_DB) for v in votes]  # a few small rises carry little weight
    ph_score = [float(np.mean(zs[p::BPB])) + VOTE_WEIGHT * vote_share[p] for p in range(BPB)]
    order = np.argsort(ph_score)[::-1]
    auto_phase = int(order[0])
    conf = float(ph_score[order[0]] - ph_score[order[1]])
    # the biggest low-band entrance (a kick or bass coming in ENTRY_CONFIRM_DB or more, clear of the best rise
    # in every other phase by ENTRY_CONFIRM_GAP_DB) lands on a downbeat: a hi-hat or a pad never decides it.
    # One beat after against the two before, so the beat before the entrance (whose two-beat window already
    # holds it) does not rise with it
    lo_step = np.where(settled, np.array([lvl_lo(t - g_, t + T - g_) for t in grid]) - lo_before, 0.0)
    low_entry = None
    if len(lo_step):
        il = int(np.argmax(lo_step))
        other = max([float(lo_step[q::BPB].max()) for q in range(BPB) if q != il % BPB and len(lo_step[q::BPB])] or [0.0])
        if lo_step[il] >= ENTRY_CONFIRM_DB and lo_step[il] - other >= ENTRY_CONFIRM_GAP_DB:
            low_entry = dict(t=r3(grid[il]), low_db=round(float(lo_step[il]), 1), downbeat_in_phase=int(il % BPB))

    # ---- accents: attacks >= 6 dB over the local bed, with their band (the bar:beat position is the grid's)
    on = librosa.onset.onset_detect(onset_envelope=oenv, sr=AR, hop_length=hop, units='time', backtrack=False)
    from scipy import signal
    bands = {'low': signal.butter(2, 150, 'low', fs=SR, output='sos'),
             'mid': signal.butter(2, [150, 4000], 'band', fs=SR, output='sos'),
             'high': signal.butter(2, 4000, 'high', fs=SR, output='sos')}
    accents = []
    cs = np.concatenate([[0.0], np.cumsum(kp)])
    for t in on:
        ta, rdb = attack_near(e1, float(t), 0.03)
        i0 = int(ta * SR)
        if i0 - SR // 20 < 0 or i0 + int(0.13 * SR) > len(kp):
            continue
        w = MK.L_WIN
        win = (cs[i0 + w:i0 + int(0.08 * SR) + w] - cs[i0:i0 + int(0.08 * SR)]) / w
        top = -0.691 + 10 * np.log10(win.max() + 1e-24)
        pre = kp[max(0, i0 - SR):i0]
        k = len(pre) // w
        if k < 4:
            continue
        bed = -0.691 + 10 * np.log10(np.median(pre[:k * w].reshape(k, w).mean(1)) + 1e-24)
        db = top - bed
        if db < ACCENT_DB:
            continue
        seg = m48[max(0, i0 - int(0.12 * SR)):i0 + int(0.06 * SR)]
        ri = int(0.12 * SR) if i0 >= int(0.12 * SR) else i0
        best_b, best_r = 'mid', -1e9
        for name, sos in bands.items():
            z = signal.sosfilt(sos, seg) ** 2
            rr = 10 * np.log10((z[ri:ri + int(0.05 * SR)].mean() + 1e-14) / (z[:max(1, ri - int(0.02 * SR))].mean() + 1e-14))
            if rr > best_r:
                best_b, best_r = name, rr
        accents.append(dict(t=round(float(ta), 4), db=round(float(db), 1), band=best_b))
    accents.sort(key=lambda a: a['t'])
    ded = []
    for a in accents:
        if ded and a['t'] - ded[-1]['t'] < 0.06:
            if a['db'] > ded[-1]['db']:
                ded[-1] = a
            continue
        ded.append(a)
    return dict(T=float(T), first=float(first), shift=float(shift), bpm_m=float(bpm_m), prior=prior,
                drift_rms=drift_rms, drift_max=drift_max, inl_frac=inl_frac, alt=[float(alt[0]), float(alt[1])],
                clarity=float(clarity), half_beat_flip=half_beat_flip, ph_score=ph_score,
                order=[int(o_) for o_ in order], auto_phase=auto_phase, conf=conf, vote_share=vote_share,
                big_rises=big_rises, low_entry=low_entry, accents=ded, hop=hop,
                lufs=float(M.integrated(x.astype(np.float64))), true_peak=float(M.true_peak_db(x)), lra=float(M.lra(x)),
                grid=grid, zs=zs, chroma=chroma, mf=mf, cen=cen, pl=low, oenv=oenv)


def analyze(path, profile='crisp', bpm=None, phase=None, cache_dir=None, log=None, fresh=False, info=None):
    """The track's analysis (the .track.json). The measurements the phase does not change are cached in
    cache_dir (MEASURED, by the file's hash and the tempo settings), so another --phase re-grids without a
    second analysis; fresh measures again. info (a dict) gets cached=True when the cache was used."""
    sys.path.insert(0, HERE)
    say = log or (lambda s: None)
    x, sha = decode(path, cache_dir)
    dur = len(x) / SR
    if dur < 8:
        raise TrackError(f'{path} is {dur:.1f} s: too short for a film bed')
    m48 = x.mean(axis=1).astype(np.float64)
    say(f'decoded {dur:.1f} s')
    e1 = energy_ms(m48)
    kp = MK.kpower(x.astype(np.float64))
    # the music's own span: 50 ms K-weighted blocks over LEVEL_FLOOR (bars after the last audible block, the
    # file's trailing silence, are not bars of the track; rises before the first do not vote for a downbeat)
    bt, bl = MK.block_levels(x.astype(np.float64))
    bl = np.maximum(bl, LEVEL_FLOOR)
    audible = np.flatnonzero(bl > -70)
    t_last = (bt[audible[-1]] + MK.L_WIN / SR) if len(audible) else dur
    cp = measure_path(cache_dir, sha, profile, bpm)
    m = None if fresh else load_measure(cp)
    if info is not None:
        info['cached'] = m is not None
    if m is None:
        m = _measure(path, x, m48, e1, kp, bt, bl, audible, dur, profile, bpm, say)
        save_measure(cp, m)
    else:
        say(f'tempo {m["bpm_m"]:.3f} BPM, drift {m["drift_rms"]:.1f} ms RMS (measured before: {os.path.basename(cp)})')
    T, first, shift, bpm_m, prior = m['T'], m['first'], m['shift'], m['bpm_m'], m['prior']
    drift_rms, drift_max, inl_frac, alt, clarity = m['drift_rms'], m['drift_max'], m['inl_frac'], m['alt'], m['clarity']
    half_beat_flip, ph_score, order, auto_phase, conf = (m['half_beat_flip'], m['ph_score'], m['order'], m['auto_phase'],
                                                         m['conf'])
    vote_share, big_rises, low_entry, accents, hop = m['vote_share'], m['big_rises'], m['low_entry'], m['accents'], m['hop']
    grid, zs, chroma, mf, cen, pl, oenv = (m[k] for k in MEASURED)
    nfrm = chroma.shape[1]
    fr = lambda t: int(min(max(0, t * AR / 512), nfrm - 1))  # noqa: E731
    use_phase = auto_phase if phase is None else int(phase) % BPB
    alt_phase = int(order[1]) if use_phase == auto_phase else auto_phase
    entry_confirms = bool(conf < CONF_MIN and low_entry and low_entry['downbeat_in_phase'] == use_phase)
    local = []
    W = 8 * BPB
    for s0 in range(0, len(grid) - W + 1, 4 * BPB):
        seg = zs[s0:s0 + W]
        sc = [float(np.mean(seg[(p - s0) % BPB::BPB])) for p in range(BPB)]
        o = np.argsort(sc)[::-1]
        if o[0] != use_phase and sc[o[0]] - sc[o[1]] >= CONF_MIN:
            a_, b_ = r3(grid[s0]), r3(grid[min(len(grid) - 1, s0 + W)])
            if local and local[-1]['phase'] == int(o[0]) and a_ <= local[-1]['to']:
                local[-1]['to'] = b_
            else:
                local.append(dict(**{'from': a_}, to=b_, phase=int(o[0]), gap=round(sc[o[0]] - sc[o[1]], 2)))

    # ---- bars: each downbeat on its own attack (accepted within 15 ms when the rise is clear)
    bar_len = BPB * T
    gd = grid[use_phase::BPB]
    pickup = None
    if use_phase > 0 and len(grid) > 0:
        pickup = r3(gd[0] - bar_len)
    downs = []
    for t in gd:
        ta, rdb = attack_near(e1, t, 0.015)
        downs.append(ta if rdb >= 8.0 else float(t))
    downs = np.array(downs)
    nb = int(np.sum((downs + bar_len <= dur + 1e-3) & (downs < t_last - 0.05)))
    if nb < 4:
        raise TrackError('the track is shorter than four bars', 2)
    ends = np.array([downs[i + 1] if i + 1 < len(downs) else downs[i] + bar_len for i in range(nb)])
    bars = []
    feats, lufs, lowdb = [], [], []
    for i in range(nb):
        a, b = downs[i], ends[i]
        s0, s1 = int(a * SR), int(b * SR)
        f0, f1 = fr(a), max(fr(a) + 1, fr(b))
        lv = max(LEVEL_FLOOR, -0.691 + 10 * np.log10(np.mean(kp[s0:s1]) + 1e-24))
        lo = max(LEVEL_FLOOR, 10 * np.log10(np.mean(pl[f0:f1]) + 1e-20))
        o0, o1 = int(a * AR / hop), max(int(a * AR / hop) + 1, int(b * AR / hop))
        dens = float((oenv[o0:o1] > np.median(oenv) * 1.5).mean())
        c = chroma[:, f0:f1].mean(axis=1)
        c = c / (np.linalg.norm(c) + 1e-9)
        m_ = mf[1:, f0:f1].mean(axis=1)
        m_ = m_ / (np.linalg.norm(m_) + 1e-9)
        feats.append(np.concatenate([c, m_]))
        lufs.append(lv)
        lowdb.append(lo)
        bars.append(dict(n=i + 1, t=r3(a), lufs=round(lv, 2), low_db=round(float(lo), 2), density=round(dens, 3),
                         centroid=int(np.mean(cen[f0:f1]))))
    feats, lufs, lowdb = np.array(feats), np.array(lufs), np.array(lowdb)
    nov = np.r_[0, np.linalg.norm(np.diff(feats, axis=0), axis=1)] + np.r_[0, np.abs(np.diff(lufs))] / 6
    for i, b in enumerate(bars):
        b['novelty'] = round(float(nov[i]), 3)
        b['feat'] = [round(float(v), 3) for v in feats[i]]

    # ---- phrases: the lattice that collects the most novelty
    best = None
    for L in (8, 4):
        for o in range(L):
            idx = [i for i in range(nb) if i >= 1 and (i - o) % L == 0]
            if len(idx) < 2:
                continue
            sc = float(np.mean(nov[idx])) * (1.05 if L == 8 else 1.0)
            if best is None or sc > best[0]:
                best = (sc, L, o)
    plen, poff = (best[1], best[2]) if best else (4, 0)
    pstarts = [i + 1 for i in range(nb) if (i - poff) % plen == 0]

    # ---- entries and breaks (bars), then sections
    entries, breaks = [], []
    for i in range(2, nb):
        j = int(np.argmax(lufs[i - 2:i])) + i - 2
        up, low_up = lufs[i] - lufs[j], lowdb[i] - max(lowdb[i - 2:i])
        if (up >= ENTRY_DB and low_up >= ENTRY_LOW_DB) or (up >= ENTRY_KICK_DB and low_up >= ENTRY_KICK_LOW_DB):
            entries.append(dict(bar=i + 1, t=r3(downs[i]), jump_db=round(float(lufs[i] - lufs[j]), 2), drop=False))
    for i in range(1, nb):
        if lufs[i] - lufs[i - 1] <= BREAK_DB:
            breaks.append(dict(bar=i + 1, t=r3(downs[i]), drop_db=round(float(lufs[i] - lufs[i - 1]), 2)))
    # sections: cut at phrase starts, entries and breaks; a phrase start stays a cut when the level moves
    # >= 2 dB across it (or it is among the most novel bars); entries and breaks always cut
    # three loudness levels over the body of the track (a fade-out's near-silent bars would otherwise
    # take a level of their own and make every played section the loud one)
    levels, centres = kmeans1(np.maximum(lufs, np.percentile(lufs, 90) - 20.0), 3)
    hard = {e['bar'] for e in entries} | {b_['bar'] for b_ in breaks}
    cand = sorted({1} | {s_ for s_ in pstarts if 1 < s_ <= nb} | {h for h in hard if 1 < h <= nb})
    keep = [1]
    for k, s_ in enumerate(cand[1:], 1):
        i = s_ - 1
        nxt = cand[k + 1] - 1 if k + 1 < len(cand) else nb
        before = lufs[max(keep[-1] - 1, i - plen):i].mean()
        after = lufs[i:max(i + 1, min(nxt, i + plen))].mean()
        if s_ in hard or abs(after - before) >= 2.0 or nov[i] >= np.percentile(nov, 75):
            keep.append(s_)
    sections = []
    for k, s_ in enumerate(keep):
        e_ = (keep[k + 1] - 1) if k + 1 < len(keep) else nb
        lv = float(np.mean(lufs[s_ - 1:e_]))
        lvl = int(np.argmin(np.abs(centres - lv)))
        sections.append(dict(**{'from': s_}, to=e_, lufs=round(lv, 2), level=lvl))

    stops = []
    if len(audible):
        a0, a1 = audible[0], audible[-1]
        from scipy.ndimage import median_filter
        med = median_filter(bl, size=81, mode='nearest')
        low_ = (bl < med - STOP_DB) & (np.arange(len(bl)) > a0) & (np.arange(len(bl)) < a1)
        sh = int(round(bar_len * SR / MK.L_WIN))  # one bar in blocks
        i = 0
        while i < len(low_):
            if low_[i]:
                j = i
                while j + 1 < len(low_) and low_[j + 1]:
                    j += 1
                ln = (j - i + 1) * MK.L_WIN / SR
                # a stop departs from the bar's own pattern: the same span one bar before (and after, when
                # the track goes on) sounds STOP_DB louder; a trough between two kicks is the groove, not a stop
                lv_ = float(np.median(bl[i:j + 1]))
                nbr = [float(np.median(bl[i + d:j + 1 + d])) for d in (-sh, sh) if 0 <= i + d and j + 1 + d <= len(bl)
                       and (d < 0 or j + 1 + d <= a1)]
                departs = bool(nbr) and all(v - lv_ >= STOP_DB for v in nbr)
                if STOP_MIN_S <= ln <= STOP_MAX_S and departs:
                    stops.append(dict(t=r3(bt[i]), len_s=r3(ln), depth_db=round(float(np.median(med[i:j + 1] - bl[i:j + 1])), 1)))
                i = j + 1
            else:
                i += 1
    for e in entries:
        e['drop'] = any(0 < e['bar'] - b['bar'] <= 2 for b in breaks) or any(
            0 <= e['t'] - (s['t'] + s['len_s']) <= bar_len for s in stops)

    # ---- accents (measured): their bar:beat position on this grid
    for a in accents:
        bi = int(np.searchsorted(downs[:nb], a['t'] + 1e-4) - 1)
        a['beat_pos'] = f'{bi + 1}:{round((a["t"] - downs[bi]) / T * 4) / 4:g}' if 0 <= bi < nb else None

    # ---- ending
    last8 = max(0, nb - 8)
    tail_acc = [a for a in accents if a['t'] >= downs[last8]]
    last_hit = tail_acc[-1]['t'] if tail_acc else (accents[-1]['t'] if accents else float(downs[nb - 1]))
    ih = int(last_hit * SR)
    after = kp[ih:]
    ring_out = None
    if len(after) > MK.L_WIN:
        k = len(after) // MK.L_WIN
        lv = -0.691 + 10 * np.log10(after[:k * MK.L_WIN].reshape(k, MK.L_WIN).mean(1) + 1e-24)
        pk = lv[:max(1, int(0.3 * SR / MK.L_WIN))].max()
        below = np.flatnonzero(lv < pk - 40)
        ring_out = r3((below[0] if len(below) else k) * MK.L_WIN / SR)
    tail_lufs = lufs[last8:]
    falling = len(tail_lufs) >= 4 and np.all(np.diff(tail_lufs[-5:]) <= 0.5) and tail_lufs[-1] - tail_lufs[-5 if len(tail_lufs) >= 5 else 0] <= -9
    if falling and tail_acc:
        # a hit inside the last bars: what follows it is its ring (and a near-silent bar its tail), so a fade must
        # already be under way before the hit's bar: the bar before it sits FADE_INTO_HIT_DB under the bar two
        # before that (same place in a 2-bar pattern). Level bars + a hit + a ring + one quiet bar are a ring.
        hb = int(np.searchsorted(downs[:nb], last_hit + 1e-4) - 1)
        if hb >= 3:
            falling = bool(lufs[hb - 1] <= lufs[hb - 3] - FADE_INTO_HIT_DB)
    body_med = float(np.median(lufs))
    remain = dur - last_hit
    if falling and remain < 6:
        kind = 'fade'
    elif remain <= 8 and ring_out is not None and ring_out <= remain + 0.05 and ring_out < 1.6:
        kind = 'button'
    elif remain <= 15 and ring_out is not None and ring_out >= 1.6:
        kind = 'ring'
    elif lufs[nb - 1] > body_med - 3 and dur - (downs[nb - 1] + bar_len) < 0.5:
        kind = 'loop'
    else:
        kind = 'fade' if falling else ('ring' if (ring_out or 0) >= 1.6 else 'button')

    # ---- key, loudness
    ck = chroma.mean(axis=1)
    rk, key = key_estimate(ck)
    per = []
    for s in sections:
        f0, f1 = fr(downs[s['from'] - 1]), fr(ends[s['to'] - 1])
        if s['to'] - s['from'] + 1 >= 4 and f1 > f0:
            per.append(key_estimate(chroma[:, f0:f1].mean(axis=1))[1])
        else:
            per.append(key)
        s['key'] = per[-1]
    first_entry = entries[0]['bar'] if entries else None
    for s_, nm in zip(sections, label_sections(sections, first_entry, nb)):
        s_['label'] = nm
    notes = []
    if drift_rms > DRIFT_WARN_MS:
        notes.append(f'the track wanders ({drift_rms:.1f} ms RMS off a straight grid): cut to its accents, not its bars')
    if entry_confirms and phase is None:
        notes.append(f'downbeat confidence {conf:.2f} is low, but the biggest low-band entrance ({low_entry["t"]} s, '
                     f'+{low_entry["low_db"]:g} dB) lands on a downbeat of this grid (phase {use_phase}): the grid stands. '
                     f'Set --phase {alt_phase} only if the bar table (the first note, chord changes) says the bars start at '
                     f'{grid[alt_phase]:.3f} s instead')
    elif conf < CONF_MIN and phase is None:
        hint = ''
        if low_entry:
            hint = (f'; the biggest low-band entrance ({low_entry["t"]} s, +{low_entry["low_db"]:g} dB) lands on a downbeat '
                    f'with --phase {low_entry["downbeat_in_phase"]}')
        elif big_rises:
            r0 = big_rises[0]
            hint = (f'; the biggest entrance ({r0["t"]} s) lands on a downbeat with --phase {r0["downbeat_in_phase"]}')
        notes.append(f'downbeat confidence {conf:.2f} is LOW: bars start at {grid[use_phase]:.3f} s (phase {use_phase}) or at '
                     f'{grid[alt_phase]:.3f} + {bar_len:.4f}*n s (--phase {alt_phase}){hint}; decide from the bar table '
                     '(the first note, section entrances, chord changes) and rerun analyze with --phase N (either phase '
                     'is set from the measurements of this analysis, without a second one)')
    if kind == 'fade':
        notes.append('the track ends on a fade: it has no ending of its own; the edit fades it out under the end card '
                     '(track.py edit --end fade, or --end hit)')
    elif kind == 'loop':
        notes.append('the track has no ending (it loops): the edit fades it out under the end card (--end fade) or ends on a hit')
    fade_in = bool(nb > 3 and lufs[1] - lufs[0] > 6 and lufs[2] - lufs[1] > 3)
    if fade_in:
        notes.append('the track fades in over more than a bar: start the edit later (--start-bar)')
    res_ = dict(track=1, file=os.path.basename(path), sha256=sha, seconds=r3(dur),
                lufs=round(m['lufs'], 2), true_peak_dbtp=round(m['true_peak'], 2), lra=round(m['lra'], 2),
                tempo=dict(bpm=round(bpm_m, 3), beat_s=round(T, 5), drift_rms_ms=round(drift_rms, 2),
                           drift_max_ms=round(drift_max, 2), alt_bpm=round(alt[0], 3), alt_clarity=round(alt[1], 2),
                           clarity=round(clarity, 2), inliers=round(inl_frac, 3), prior=prior,
                           stated=float(bpm) if bpm else None),
                grid=dict(t0=r3(downs[0]), beat_t0=r3(first), phase=use_phase, auto_phase=auto_phase,
                          downbeat_confidence=round(conf, 3), phase_scores=[round(s, 3) for s in ph_score],
                          phase_set=phase is not None, alt=dict(phase=alt_phase, t0=r3(grid[alt_phase])),
                          transient_shift_ms=round(shift * 1000, 1), half_beat_flip=half_beat_flip,
                          entry_votes=[round(v, 3) for v in vote_share], big_rises=big_rises,
                          low_entry=low_entry, entry_confirms=entry_confirms,
                          local_disagreements=local, pickup_t=pickup,
                          beats_per_bar=BPB),
                bars=bars, phrases=dict(len=plen, offset=poff, starts=pstarts),
                sections=sections, entries=entries, breaks=breaks, stops=stops, accents=accents,
                ending=dict(kind=kind, last_hit_t=r3(last_hit), ring_out_s=ring_out,
                            final_bar=int(np.searchsorted(downs[:nb], last_hit + 0.05)),
                            tail_s=r3(dur - last_hit)),
                key=dict(name=key, r=round(rk, 3), per_section=per),
                intro_bars=(first_entry - 1) if first_entry else None, fade_in=fade_in,
                levels=dict(centres=[round(float(c), 2) for c in centres]), notes=notes,
                analysis=dict(profile=profile, rate=AR, decoder='ffmpeg', version=ANALYSIS_VERSION))
    return res_


def label_sections(sections, first_entry, nb):
    out = []
    n = len(sections)
    for k, s in enumerate(sections):
        lvl = s['level']
        if k == 0 and (first_entry is None or s['to'] < first_entry) and lvl < 2:
            out.append('intro')
        elif k == n - 1 and n > 1 and lvl < 2 and s['lufs'] < sections[k - 1]['lufs']:
            out.append('outro')
        elif lvl == 2:
            out.append('peak')
        elif lvl == 0:
            out.append('break')
        else:
            out.append('body')
    return out


def print_analysis(a, out=print):
    t = a['tempo']
    g = a['grid']
    out(f"{a['file']}: {a['seconds']} s, {t['bpm']} BPM (beat {t['beat_s']} s; drift {t['drift_rms_ms']} ms RMS, max "
        f"{t['drift_max_ms']}; alt {t['alt_bpm']}), downbeats from {g['t0']} s (phase {g['phase']}, confidence "
        f"{g['downbeat_confidence']}{', set by --phase' if g['phase_set'] else ''}), {len(a['bars'])} bars, phrases of "
        f"{a['phrases']['len']}, key {a['key']['name']} (r {a['key']['r']}), {a['lufs']} LUFS, TP {a['true_peak_dbtp']} dBTP, "
        f"LRA {a['lra']} LU, ending {a['ending']['kind']}")
    out('  sections: ' + ', '.join(f"{s['label']} {s['from']}-{s['to']} ({s['lufs']:.1f})" for s in a['sections']))
    steps = np.diff([b['lufs'] for b in a['bars']]) if len(a['bars']) > 1 else np.zeros(0)
    soft = (f"none (the largest step: bar {int(np.argmax(steps)) + 2}, {float(steps.max()):+.1f} dB, which edit takes for the reveal)"
            if len(steps) else 'none')
    out('  entries: ' + (', '.join(f"bar {e['bar']} at {e['t']} s (+{e['jump_db']} dB{', drop' if e['drop'] else ''})"
                                   for e in a['entries']) or soft))
    out('  breaks: ' + (', '.join(f"bar {b['bar']} ({b['drop_db']} dB)" for b in a['breaks']) or 'none'))
    out('  stops: ' + (', '.join(f"{s['t']} s ({s['len_s']} s, -{s['depth_db']} dB)" for s in a['stops']) or 'none'))
    out(f"  accents: {len(a['accents'])} (>= {ACCENT_DB:g} dB over the bed)")
    out('  bar  t       LUFS   low   nov')
    for b in a['bars']:
        out(f"  {b['n']:3d} {b['t']:7.2f} {b['lufs']:6.1f} {b['low_db']:6.1f} {b['novelty']:5.2f}"
            + (' <entry' if any(e['bar'] == b['n'] for e in a['entries']) else '')
            + (' <phrase' if b['n'] in a['phrases']['starts'] else ''))
    for n in a['notes']:
        out(f'  note: {n}')


# ------------------------------------------------------------------------------------------
# edit: source bars -> film bars
# ------------------------------------------------------------------------------------------
def default_arc(n, reveal, end='button'):
    """target dB per film bar (re the track's loud bars): intro -14 rising to the body (-6), a dip (-10)
    before the reveal, the peak (0) from the reveal, then a resolve toward -8 / -14. With a hit or fade ending the
    hit or the fade itself resolves, so the body holds (-4) to the last bar instead of reaching for quieter bars."""
    arc = []
    peak_until = reveal + max(2, int(round((n - reveal + 1) * 0.6)))
    for k in range(1, n + 1):
        if k < reveal:
            x = (k - 1) / max(1, reveal - 2)
            v = -14 + 8 * min(1.0, x / 0.5)
            if k == reveal - 1 and reveal > 2:
                v = -10.0
        elif k < peak_until:
            v = 0.0
        elif end in ('hit', 'fade', 'stop'):
            v = -4.0
        else:
            v = -8.0 - 6.0 * (k - peak_until) / max(1, n - peak_until)
        arc.append(round(v, 1))
    return arc


def bar_times(a):
    """(downbeats s of every source bar + the bar line after the last, bar length s)."""
    T = a['tempo']['beat_s']
    d = [b['t'] for b in a['bars']]
    return d + [d[-1] + BPB * T], BPB * T


def end_bar(a, end):
    """The 0-based source bar a button or ring ending's body ends on (the bar before the final hit), else None."""
    if end not in ('button', 'ring'):
        return None
    nb = len(a['bars'])
    ending = a['ending']
    hit = ending['last_hit_t']
    d = [b['t'] for b in a['bars']]
    hb = int(np.searchsorted(d, hit + 0.05) - 1)  # the bar whose downbeat carries (or precedes) the final hit
    if abs(hit - d[min(max(hb, 0), nb - 1)]) < 0.1:
        hb -= 1                                  # a button on a downbeat: the body ends on the bar before it
    if ending['kind'] in ('fade', 'loop'):
        raise TrackError(f"the track ends on a {ending['kind']}, not an ending of its own: use --end fade (the bed fades "
                         'out over 2-3 s under the end card) or --end hit (one kit hit that rings)')
    return int(np.clip(hb, 0, nb - 1))


def resolve_end(a, end):
    """(mode, note): the ending mode an edit uses. auto: the track's own ending when it has one (button or ring),
    else a fade under the end card; own: the track's own ending or a refusal; stop: the old name of hit."""
    kind = (a.get('ending') or {}).get('kind')
    if end in (None, 'auto'):
        if kind in ('button', 'ring'):
            return kind, f"the track's own ending ({kind}): its final hit closes the film and rings out"
        return 'fade', f"the track ends on a {kind or 'unknown ending'}: the bed fades out under the end card"
    if end == 'own':
        if kind not in ('button', 'ring'):
            raise TrackError(f"--end own: the track ends on a {kind}, not an ending of its own: use --end fade or --end hit")
        return kind, None
    if end == 'stop':
        return 'hit', ('--end stop is now --end hit: the bed is released under one kit element that rings, '
                       'never stopped dead into a gap of silence')
    return end, None


def map_edit(a, spec, bars, reveal, end):
    """--map "1:2x10,11:59x2" (film bar:source bar x bars, in film order, no gaps) -> (path, info) as plan_edit
    returns them, for an edit chosen by hand."""
    nb = len(a['bars'])
    if not 1 <= reveal <= bars:
        raise TrackError(f'--reveal-bar {reveal} is outside the film bars 1..{bars}')
    path = []
    for part in spec.split(','):
        m = re.fullmatch(r'\s*(\d+)\s*:\s*(\d+)\s*x\s*(\d+)\s*', part)
        if not m:
            raise TrackError(f'--map: cannot read {part.strip()!r}: give film bar:source bar x bars, e.g. 1:2x10,11:59x2')
        fb, sb, n = (int(v) for v in m.groups())
        if fb != len(path) + 1:
            raise TrackError(f'--map: film bar {fb} does not follow film bar {len(path)}: list the segments in film order, no gaps')
        if n < 1 or sb < 1 or sb + n - 1 > nb:
            raise TrackError(f'--map: source bars {sb}-{sb + n - 1} are outside the track\'s bars 1..{nb}')
        path += list(range(sb - 1, sb - 1 + n))
    if len(path) != bars:
        raise TrackError(f'--map gives {len(path)} film bars and --bars is {bars}')
    eb = end_bar(a, end)
    if eb is not None and path[-1] != eb:
        raise TrackError(f'--map: a {end} ending plays the final hit after source bar {eb + 1}: end the map on that bar')
    return path, dict(entry_bar=path[reveal - 1] + 1, end_bar=(eb + 1) if eb is not None else None, total=0.0,
                      arc=None, splices=sum(1 for p, q in zip(path[:-1], path[1:]) if q != p + 1))


def plan_edit(a, bars, reveal, end, start=None, entry=None, arc=None, max_splices=None, cuts=None):
    """The DP over film bars. Returns (path of 0-based source bars per film bar, info). cuts: the 1-based film bars
    whose downbeat carries a cut (track.py fit reads them from the timeline); on every other bar a level step over
    MIDSHOT_DB costs MIDSHOT_W a dB, so the track's sections change on the cuts, never mid-shot."""
    nb = len(a['bars'])
    if bars < 2:
        raise TrackError('--bars must be at least 2')
    if not 1 <= reveal <= bars:
        raise TrackError(f'--reveal-bar {reveal} is outside the film bars 1..{bars}')
    feats = np.array([b['feat'] for b in a['bars']])
    lufs = np.array([b['lufs'] for b in a['bars']])
    rel = lufs - np.percentile(lufs, 90)
    cen = np.array([float(b.get('centroid') or 0.0) for b in a['bars']])
    muff = np.zeros(nb)
    if (cen > 0).all():
        muff = np.where(cen < min(MUFFLE_HZ, MUFFLE_RATIO * float(np.percentile(cen, 75))), MUFFLE_W, 0.0)
    pst = set(a['phrases']['starts'])
    sec_key = np.empty(nb, object)
    for s in a['sections']:
        for i in range(s['from'] - 1, s['to']):
            sec_key[i] = s.get('key', a['key']['name'])
    ents = a['entries']
    if entry is not None:
        E = int(entry) - 1
        if not 0 <= E < nb:
            raise TrackError(f'--entry {entry} is outside the source bars 1..{nb}')
    elif ents:
        drops = [e for e in ents if e['drop']] or ents
        E = max(drops, key=lambda e: e['jump_db'])['bar'] - 1
    else:
        E = int(np.argmax(np.r_[0, np.diff(lufs)])) if nb > 1 else 0
    # no entry at the thresholds: the reveal takes the largest loudness step, a soft entrance the edit names
    soft = None if entry is not None or ents or nb < 2 else dict(bar=E + 1, step_db=round(float(lufs[E] - lufs[E - 1]) if E else 0.0, 1))
    S0 = int(start) - 1 if start else None
    if S0 is not None and not 0 <= S0 < nb:
        raise TrackError(f'--start-bar {start} is outside the source bars 1..{nb}')
    endbar = end_bar(a, end)
    arc = np.array(arc if arc is not None else default_arc(bars, reveal, end), float)
    if len(arc) != bars:
        raise TrackError(f'--arc has {len(arc)} values for {bars} film bars')
    smax = max_splices if max_splices is not None else max(1, bars // 8)
    D = np.linalg.norm(feats[:, None] - feats[None], axis=2) + np.abs(lufs[:, None] - lufs[None]) / 6
    nxt = np.minimum(np.arange(nb) + 1, nb - 1)
    J = 3.0 + 2.5 * D[nxt]                       # J[i, j]: jump from source bar i to j
    J += np.where(np.array([(j + 1) in pst for j in range(nb)]), 0.0, 1.0)[None, :]
    # a join that steps the loudness by 3 LU or more reads as a cut in the music, unless it lands on the entry
    step = np.abs(lufs[None, :] - lufs[:, None])  # step[i, j]: from the bar played last (i) to the bar jumped to (j)
    J += 1.5 * np.maximum(0.0, step - 3.0) * np.where(np.arange(nb) == E, 0.0, 1.0)[None, :]
    for i in range(nb):
        for j in range(nb):
            if sec_key[nxt[i]] != sec_key[j]:
                J[i, j] = np.inf                     # no key change across a jump
    J[np.arange(nb), np.arange(nb)] += 1.5           # repeating a bar (a loop) costs a little more
    J[np.arange(nb - 1), np.arange(1, nb)] = np.inf  # the natural continuation is not a jump
    INF = 1e18
    # cost[s, r, j]: s splices used, r = 0 (run of 1 bar) or 1 (run of 2+), source bar j
    cost = np.full((smax + 1, 2, nb), INF)
    back = []
    c0 = np.abs(rel - arc[0]) / 3.0
    if S0 is not None:
        cost[0, 0, S0] = c0[S0]
    else:
        nat = E - (reveal - 1)
        pref = np.abs(np.arange(nb) - max(0, nat)) * 0.05
        cost[0, 0] = c0 + pref
    if reveal == 1:
        keep = cost[0, 0, E]
        cost[0, 0] = INF
        cost[0, 0, E] = keep
    lstep = np.r_[0.0, np.abs(np.diff(lufs))]    # lstep[j]: the level step of playing on from bar j - 1 into bar j
    for k in range(1, bars):
        new = np.full_like(cost, INF)
        bk = np.zeros(cost.shape + (3,), int)   # (s_prev, r_prev, j_prev)
        mid = cuts is not None and (k + 1) not in cuts  # film bar k + 1 starts inside a shot
        for s in range(smax + 1):
            for r in (0, 1):
                prev = cost[s, r]
                # continue: j -> j + 1
                cand = np.full(nb, INF)
                cand[1:] = prev[:-1] + (MIDSHOT_W * np.maximum(0.0, lstep[1:] - MIDSHOT_DB) if mid else 0.0)
                rr = 1
                better = cand < new[s, rr]
                new[s, rr] = np.where(better, cand, new[s, rr])
                bk[s, rr][better] = np.stack([np.full(better.sum(), s), np.full(better.sum(), r),
                                              np.flatnonzero(better) - 1], axis=1)
            if s + 1 <= smax:
                prev = cost[s, 1]                   # only from a run of 2+
                tot = prev[:, None] + J              # (from i, to j)
                if not ((k % a['phrases']['len']) == 0):
                    tot = tot + 1.0                  # a jump off a film phrase start costs more
                if mid:
                    tot = tot + MIDSHOT_W * np.maximum(0.0, step - MIDSHOT_DB)
                ib = np.argmin(tot, axis=0)
                cand = tot[ib, np.arange(nb)]
                better = cand < new[s + 1, 0]
                new[s + 1, 0] = np.where(better, cand, new[s + 1, 0])
                bk[s + 1, 0][better] = np.stack([np.full(better.sum(), s), np.full(better.sum(), 1),
                                                 ib[better]], axis=1)
        new += (np.abs(rel - arc[k]) / 3.0 + muff)[None, None, :]
        if k == reveal - 1:
            mask = np.ones(nb, bool)
            mask[E] = False
            new[:, :, mask] = INF
        if k == bars - 1 and endbar is not None:
            mask = np.ones(nb, bool)
            mask[endbar] = False
            new[:, :, mask] = INF
        cost = new
        back.append(bk)
    fin = cost[:, 1, :] if bars > 1 else cost[:, 0, :]
    r = 1 if bars > 1 else 0
    if endbar is not None and bars > 2:
        # the track's own ending may be reached through ONE turnaround bar (the bar before its final hit) after the
        # reveal's bars: a late reveal still ends on the track's own final hit, never on a cut
        fin0 = cost[:, 0, :] + 0.5
        if fin0.min() < fin.min():
            fin, r = fin0, 0
    if not np.isfinite(fin).any() or fin.min() >= INF / 2:
        raise TrackError('no edit fits these anchors (the reveal entry, the ending, the start bar, at most '
                         f'{smax} splice(s), 2+ bars per segment, one key per join): change --bars, --reveal-bar, '
                         '--entry or --start-bar, or end on a fade (--end fade)')
    s, j = np.unravel_index(int(np.argmin(fin)), fin.shape)
    path = [int(j)]
    for k in range(bars - 1, 0, -1):
        s_p, r_p, j_p = back[k - 1][s, r, j]
        path.append(int(j_p))
        s, r, j = s_p, r_p, j_p
    path = path[::-1]
    info = dict(entry_bar=E + 1, end_bar=(endbar + 1) if endbar is not None else None, total=float(fin.min()),
                arc=[float(v) for v in arc], splices=sum(1 for p, q in zip(path[:-1], path[1:]) if q != p + 1), soft_entry=soft,
                muffled=[k + 1 for k, j in enumerate(path) if muff[j] > 0])
    return path, info


def segments_of(path):
    segs = []
    for k, j in enumerate(path):
        if segs and j == segs[-1]['src_bar'] - 1 + segs[-1]['bars']:
            segs[-1]['bars'] += 1
        else:
            segs.append(dict(film_bar=k + 1, src_bar=j + 1, bars=1))
    return segs


def sustains(m48, t, before=0.05):
    """True when a sound still sustains at t: the 50 ms before t within 6 dB of the 50 ms around it."""
    i = int(t * SR)
    w = int(before * SR)
    if i - w < 0 or i + w > len(m48):
        return False
    a = np.sqrt(np.mean(m48[i - w:i] ** 2)) + 1e-9
    b = np.sqrt(np.mean(m48[max(0, i - 3 * w):i - 2 * w] ** 2)) + 1e-9
    return 20 * np.log10(a / b) > -6 and 20 * np.log10(a) > -45


def film_map(a, segs, film_t0, bars, end, gap=None, m48=None, fade=2.5):
    """Film-time layout of an edit: per segment its film start and source span; the film downbeats of bars
    1..bars+1; joins; the ending. Every number in seconds."""
    d, bar_len = bar_times(a)
    out, joins, t = [], [], film_t0
    film_down = []
    for k, s in enumerate(segs):
        src_a = d[s['src_bar'] - 1]
        src_b = d[s['src_bar'] - 1 + s['bars']] if s['src_bar'] - 1 + s['bars'] < len(d) else src_a + s['bars'] * bar_len
        for b in range(s['bars']):
            film_down.append(t + (d[s['src_bar'] - 1 + b] - src_a))
        seg = dict(s, film_s=r3(t), src_from=r3(src_a), src_to=r3(src_b))
        if k > 0:
            tail = TAIL_SUSTAIN_MS if (m48 is not None and sustains(m48, out[-1]['src_to'])) else TAIL_MS
            seg['join'] = dict(pre_ms=PRE_MS, tail_ms=tail)
            joins.append(dict(film_s=r3(t), film_bar=s['film_bar'], src_in=r3(src_a), src_out=out[-1]['src_to'],
                              tail_ms=tail))
        out.append(seg)
        t += src_b - src_a
    film_down.append(t)  # the bar line after the body
    ending = dict(mode=end)
    last = out[-1]
    if end in ('hit', 'stop'):
        ending.update(mode='hit', bed_stops_film_s=r3(t), hit_film_s=r3(t), end_s=r3(t), release_s=HIT_RELEASE_S,
                      ring_s=HIT_RING_S, hold_s=HIT_RING_S)
    elif end == 'fade':
        room = a['seconds'] - last['src_to']
        if room < fade - 0.05:
            raise TrackError(f"--end fade: the track ends {room:.2f} s after the body's last bar, too soon to fade over "
                             f"{fade:g} s: end the body earlier in the track (--start-bar, --map) or use --end hit")
        ending.update(fade_from_film_s=r3(t), fade_s=r3(fade), end_s=r3(t), hold_s=r3(fade))
    else:
        hit = a['ending']['last_hit_t']
        f_hit = last['film_s'] + (hit - last['src_from'])
        ring = a['ending'].get('ring_out_s') or 0.0
        ending.update(last_hit_film_s=r3(f_hit), end_s=r3(f_hit), ring_out_s=a['ending']['ring_out_s'],
                      src_end_s=a['seconds'], hold_s=r3(max(0.0, f_hit - t) + float(np.clip(ring, RING_MIN_S, RING_MAX_S))))
    return out, joins, [r3(x) for x in film_down], ending


def to_film(a, segs, src_t, slack=0.0):
    """film time of a source time inside the edit (None when it is not played), slack s outside a segment."""
    for s in segs:
        if s['src_from'] - slack <= src_t < s['src_to'] + slack:
            return s['film_s'] + (src_t - s['src_from'])
    return None


def film_grid(a, segs, ending, film_down):
    """the analysed events mapped into film time (s): accents, entries, breaks, stops, phrases, sections."""
    if ending['mode'] in ('button', 'ring'):  # the last segment plays on into the tail: its button or ring is in the film
        segs = segs[:-1] + [dict(segs[-1], src_to=a['seconds'])]
    elif ending['mode'] == 'fade':  # it plays on under the fade
        segs = segs[:-1] + [dict(segs[-1], src_to=segs[-1]['src_to'] + ending['fade_s'])]
    acc = []
    for x in a['accents']:
        f = to_film(a, segs, x['t'])
        if f is not None:
            acc.append(dict(t=round(f, 4), db=x['db'], band=x['band']))
    ent = sorted({r3(f) for e in a['entries'] for f in [to_film(a, segs, e['t'], 0.002)] if f is not None})
    # the reveal entry, and every join that lands on an entry, are entries of the film
    brk = []
    for b in a['breaks']:
        f = to_film(a, segs, b['t'], 0.002)
        if f is not None:
            brk.append(dict(**{'from': r3(f)}, to=r3(f + BPB * a['tempo']['beat_s'])))
    stp = []
    for s in a['stops']:
        f = to_film(a, segs, s['t'])
        if f is not None:
            stp.append(dict(**{'from': r3(f)}, to=r3(f + s['len_s']), depth_db=s['depth_db']))
    if ending['mode'] == 'stop':
        stp.append(dict(**{'from': ending['bed_stops_film_s']}, to=ending['end_s'], depth_db=None, ending=True))
    phr = []
    pst = set(a['phrases']['starts'])
    for s in segs:
        for b in range(s['bars']):
            if s['src_bar'] + b in pst:
                phr.append(film_down[s['film_bar'] - 1 + b])
    sec = []
    for s in segs:
        for x in a['sections']:
            lo, hi = max(x['from'], s['src_bar']), min(x['to'], s['src_bar'] + s['bars'] - 1)
            if lo <= hi:
                fa = film_down[s['film_bar'] - 1 + (lo - s['src_bar'])]
                fb = film_down[min(len(film_down) - 1, s['film_bar'] + (hi - s['src_bar']))]
                if sec and sec[-1]['label'] == x['label'] and abs(sec[-1]['to'] - fa) < 1e-6:
                    sec[-1]['to'] = r3(fb)
                else:
                    sec.append(dict(**{'from': r3(fa)}, to=r3(fb), label=x['label']))
    return dict(accents=acc, entries=ent, breaks=brk, stops=stp, phrases=[r3(p) for p in phr], sections=sec)


def cmd_edit(a_):
    tj = a_.track or find_one('audio/music', '.track.json')
    a = read_json(tj, 'track analysis')
    g = a['grid']
    if g['downbeat_confidence'] < CONF_MIN and not g.get('phase_set') and g.get('entry_confirms'):
        le = g.get('low_entry') or {}
        print(f"track.py: warning: downbeat confidence {g['downbeat_confidence']} is under {CONF_MIN}; the biggest low-band "
              f"entrance ({le.get('t')} s) lands on a downbeat of this grid (phase {g['phase']}), so the edit uses it "
              f"(`track.py analyze {a['file']} --phase {g['alt']['phase']}` if the bars start at {g['alt']['t0']} s)",
              file=sys.stderr)
    elif g['downbeat_confidence'] < CONF_MIN and not g.get('phase_set'):
        print(f"track.py: downbeat confidence {g['downbeat_confidence']} is under {CONF_MIN}: the bars may start at "
              f"{g['t0']} s (phase {g['phase']}) or at {g['alt']['t0']} s (phase {g['alt']['phase']}). Decide from the "
              "music (the first note, section entrances, chord changes in the bar table) and rerun "
              f"`track.py analyze {a['file']} --phase N` (either phase is set without a second analysis: "
              f"--phase {g['phase']} confirms this grid); edit refuses until the phase is set", file=sys.stderr)
        return 2
    arc = [float(v) for v in a_.arc.split(',')] if a_.arc else None
    asked = a_.end or 'auto'
    a_.end, end_note = resolve_end(a, asked)
    if end_note:
        print(f'track.py: ending: {end_note}', file=sys.stderr)
    if a_.end == 'fade' and not FADE_MIN_S <= a_.fade <= FADE_MAX_S:
        raise TrackError(f'--fade is the fade under the end card: {FADE_MIN_S:g}-{FADE_MAX_S:g} s')
    if not 0.0 <= a_.film_t0 <= 0.45:
        raise TrackError('--film-t0 (the film time of bar 1\'s downbeat) is 0-0.45 s: the first sound arrives early')
    if a_.map:
        path, info = map_edit(a, a_.map, a_.bars, a_.reveal_bar, a_.end)
    else:
        path, info = plan_edit(a, a_.bars, a_.reveal_bar, a_.end, a_.start_bar, a_.entry, arc, cuts=getattr(a_, 'cuts', None))
    segs = segments_of(path)
    lufs = [b['lufs'] for b in a['bars']]
    cut_bars = getattr(a_, 'cuts', None)
    midshot = [dict(film_bar=k + 1, step_db=round(lufs[path[k]] - lufs[path[k - 1]], 1)) for k in range(1, len(path))
               if cut_bars is not None and (k + 1) not in cut_bars and abs(lufs[path[k]] - lufs[path[k - 1]]) >= 6.0]
    base = os.path.dirname(os.path.abspath(tj))
    trk = os.path.join(base, a['file'])
    m48 = None
    if os.path.isfile(trk):
        x, _ = decode(trk, a_.cache, a.get('sha256'))
        m48 = x.mean(axis=1).astype(np.float64)
    segs, joins, film_down, ending = film_map(a, segs, a_.film_t0, a_.bars, a_.end, None, m48, a_.fade)
    fg = film_grid(a, segs, ending, film_down)
    dips = [dict(film_s=s['from'], depth_db=s['depth_db']) for s in fg['stops'] if s.get('depth_db')] + \
           [dict(film_s=b['from'], depth_db=None, kind='break') for b in fg['breaks']]
    rec = os.path.join(os.path.relpath(base), stem_of(a['file']) + '.licence.json').replace(os.sep, '/')
    doc = {'edit': 1, 'track': os.path.join(os.path.relpath(base), a['file']).replace(os.sep, '/'),
           'analysis': os.path.relpath(tj).replace(os.sep, '/'), 'licence': rec, 'sha256': a.get('sha256'),
           'bpm': a['tempo']['bpm'], 'beat_s': a['tempo']['beat_s'], 'beats_per_bar': BPB,
           'film_t0': r3(a_.film_t0), 'film_bars': a_.bars, 'phrase_len': a['phrases']['len'],
           'args': dict(bars=a_.bars, reveal_bar=a_.reveal_bar, end='hit' if asked == 'stop' else asked,
                        start_bar=a_.start_bar, entry=a_.entry, film_t0=a_.film_t0, fade=a_.fade, arc=a_.arc, map=a_.map),
           'reveal': dict(film_bar=a_.reveal_bar, src_bar=info['entry_bar'], film_s=film_down[a_.reveal_bar - 1]),
           'segments': segs, 'joins': joins, 'ending': ending, 'track_dips': dips,
           'film': dict(downbeats=film_down, **fg), 'key': a['key']['name'], 'key_r': a['key']['r'],
           'cost': dict(total=round(info['total'], 2), splices=info['splices']), 'muffled_bars': info.get('muffled', [])}
    if getattr(a_, 'fit', None):
        doc['args']['fit'] = True
        doc['fit'] = dict(a_.fit, midshot_steps=midshot)
    if fg['entries'] and all(abs(e - doc['reveal']['film_s']) > 0.01 for e in fg['entries']):
        doc['film']['entries'] = sorted(set(fg['entries'] + [doc['reveal']['film_s']]))
    elif not fg['entries']:
        doc['film']['entries'] = [doc['reveal']['film_s']]
    write_json(a_.out, doc)
    print(f"edit: {a_.bars} film bars from {len(segs)} segment(s) ({info['splices']} splice(s)); the reveal (film bar "
          f"{a_.reveal_bar}, {doc['reveal']['film_s']:.3f} s) holds source bar {info['entry_bar']}; ending {a_.end} at "
          f"{ending['end_s']:.3f} s, the picture holds {ending['hold_s']:.2f} s after the body's last bar line; wrote {a_.out}")
    print('  map (film bar -> source bar): ' + ' '.join(f'{k + 1}:{j + 1}' for k, j in enumerate(path)))
    if info.get('soft_entry'):
        se = info['soft_entry']
        print(f"  warning: the analysis found no entry (+{ENTRY_DB:g} dB with +{ENTRY_LOW_DB:g} dB in the lows): the reveal holds source bar "
              f"{se['bar']}, the track's largest step ({se['step_db']:+.1f} dB). Listen to it there; choose another with --entry N, or "
              'give the reveal a stop before it (score.json stopdowns.add [{"at": "@reveal", "depth": "stop"}])')
    for s in segs:
        print(f"  film bar {s['film_bar']:>2} at {s['film_s']:7.3f} s <- source bars {s['src_bar']}-{s['src_bar'] + s['bars'] - 1} "
              f"({s['src_from']:.3f}-{s['src_to']:.3f} s)" + (f", join tail {s['join']['tail_ms']:g} ms" if 'join' in s else ''))
    for m_ in midshot:
        print(f"  warning: film bar {m_['film_bar']} starts inside a shot and the track's level steps {m_['step_db']:+.1f} dB there: "
              'a section entering mid-shot reads as a mistake (av-audit level); cut the picture on it, or re-fit', file=sys.stderr)
    if not getattr(a_, 'fit', None):
        print('  next: python3 scripts/audio/track.py grid   (writes the film-time grid the timeline imports)')
    return 0


# ------------------------------------------------------------------------------------------
# the edited bed (score.py and plan.py build it here)
# ------------------------------------------------------------------------------------------
def build_bed(edit, base_dir='.', n=None, cache_dir=None):
    """The edited track as it plays in the film: (stereo float64 (n, 2) at 48 kHz, info). Segments are cut at
    their downbeats' attacks; an incoming segment starts PRE_MS before its attack with a raised-cosine fade-in
    that ends on it, the outgoing one runs TAIL_MS (150 ms when it sustains) past the join with a cos^2 tail.
    The first segment opens on the bars before film bar 1 (a pickup) when the track has them, faded in from
    silence over OPEN_FADE_S (80 ms, or up to bar 1's attack when that comes sooner). The ending never cuts:
    a hit ending (or an old edit's stop) lets the bar line's attack sound HIT_LET_S, then releases the bed over
    HIT_RELEASE_S (cos^2) under the hit; a fade ending plays on past the body and fades over its fade_s ((1 - u)^3);
    a button or ring ending plays to the track's own end."""
    trk = locate(edit['track'], base_dir)
    x, sha = decode(trk, cache_dir)
    if edit.get('sha256') and sha != edit['sha256']:
        raise TrackError(f'{trk} is not the file the edit was made from (sha256 differs): analyse and edit it again')
    x = x.astype(np.float64)
    segs = edit['segments']
    end = edit['ending']
    if n is None:
        n = int(round((end.get('end_s', 0) + 4.0) * SR))
    out = np.zeros((n, 2))
    info = dict(segments=[], joins=[])
    for k, s in enumerate(segs):
        f0, sa, sb = s['film_s'], s['src_from'], s['src_to']
        pre = (s.get('join') or {}).get('pre_ms', PRE_MS) / 1000.0 if k > 0 else min(edit['film_t0'], sa)
        a_src = sa - pre
        last = k == len(segs) - 1
        if not last:
            tail = segs[k + 1].get('join', {}).get('tail_ms', TAIL_MS) / 1000.0
            b_src = sb + tail
        elif end['mode'] in ('hit', 'stop'):
            tail = 0.0
            b_src = sb + HIT_LET_S + float(end.get('release_s', HIT_RELEASE_S))
        elif end['mode'] == 'fade':
            tail = 0.0
            b_src = sb + float(end['fade_s'])
        else:
            tail = 0.0
            b_src = len(x) / SR
        i0, i1 = int(round(a_src * SR)), min(len(x), int(round(b_src * SR)))
        seg = x[max(0, i0):i1].copy()
        if i0 < 0:
            seg = np.concatenate([np.zeros((-i0, 2)), seg])
        m = int(round(pre * SR)) if k > 0 else (int(round(min(OPEN_FADE_S, pre) * SR)) if a_src > 0 else 0)
        if m > 1:  # a join's fade-in ends on the incoming attack; an opening mid-track fades in over OPEN_FADE_S
            seg[:m] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(m) / m))[:, None]
        if not last and tail > 0:
            m = int(round(tail * SR))
            if m > 1 and m < len(seg):
                seg[-m:] *= (np.cos(np.linspace(0, np.pi / 2, m)) ** 2)[:, None]
        if last and end['mode'] in ('hit', 'stop', 'fade'):
            # the release (hit) or the fade starts where the body ends (+ the bar line's attack for a hit) and
            # reaches zero where this segment's copy ends: a decay, never a cut. The fade is (1 - u)^3, near even
            # in dB (-9 dB half way, -30 dB at 0.7), so its last bars do not fall off a cliff; the release under a
            # hit is cos^2 (the hit's ring carries the end)
            m = int(round((float(end.get('release_s', HIT_RELEASE_S)) if end['mode'] != 'fade' else float(end['fade_s'])) * SR))
            m = min(m, len(seg))
            if m > 1:
                u = np.linspace(0, 1, m)
                seg[-m:] *= (((1 - u) ** 3) if end['mode'] == 'fade' else np.cos(u * np.pi / 2) ** 2)[:, None]
        at = int(round((f0 - pre) * SR))
        j0 = max(0, at)
        seg = seg[j0 - at:]
        j1 = min(n, j0 + len(seg))
        if j1 > j0:
            out[j0:j1] += seg[:j1 - j0]
        info['segments'].append(dict(film_s=f0, src_from=sa, src_to=sb, start_s=r3(f0 - pre)))
        if k > 0:
            info['joins'].append(dict(film_s=f0, pre_ms=pre * 1000, tail_ms=segs[k].get('join', {}).get('tail_ms', TAIL_MS)))
    return out, info


def locate(path, base_dir):
    for p in (path, os.path.join(base_dir, path), os.path.join(os.path.dirname(base_dir), path)):
        if os.path.exists(p):
            return p
    return path


# ------------------------------------------------------------------------------------------
# grid: the film-time music grid for the timeline
# ------------------------------------------------------------------------------------------
TS_HEAD = """// The film-time music grid, generated by scripts/audio/track.py grid from audio/music/edit.json: do
// not edit it by hand (edit the music with track.py edit, then run track.py grid again). Every number is
// a film frame (fractional) at the film's fps, so the edit stays invisible to the picture code.
//
// A generated file keeps these exports and names:
//   MUSIC        { bpm, beatS, fps, t0, bars, phraseLen, downbeats, accents, phrases, sections,
//                  entries, breaks, stops, end } (the Music type below)
//   bar()        film frame of a music grid position, fractional; b() in timeline.ts rounds it
//   accentNear() the analysed track accent within `tol` frames of f, or null
// Keep this file free of React and CSS imports: Node scripts load it through timeline.ts.
"""


def frames(v, fps):
    return round(float(v) * fps, 2)


def music_obj(edit, fps):
    f = edit['film']
    beat_s = edit['beat_s']
    m = dict(bpm=edit['bpm'], beatS=beat_s, fps=fps, t0=frames(f['downbeats'][0], fps), bars=edit['film_bars'],
             phraseLen=edit.get('phrase_len', 8),
             downbeats=[frames(v, fps) for v in f['downbeats']],
             accents=[dict(f=frames(x['t'], fps), db=x['db'], band=x['band']) for x in f['accents']],
             phrases=[frames(v, fps) for v in f['phrases']],
             sections=[dict(**{'from': frames(s['from'], fps)}, to=frames(s['to'], fps), label=s['label'])
                       for s in f['sections']],
             entries=[frames(v, fps) for v in f['entries']],
             breaks=[dict(**{'from': frames(s['from'], fps)}, to=frames(s['to'], fps)) for s in f['breaks']],
             stops=[dict(**{'from': frames(s['from'], fps)}, to=frames(s['to'], fps)) for s in f['stops']],
             end=dict(mode='hit' if edit['ending']['mode'] == 'stop' else edit['ending']['mode'],
                      f=frames(edit['ending']['end_s'], fps), hold=frames(edit['ending'].get('hold_s', 1.0), fps)))
    return m


def js_value(v, ind=0):
    """a compact JS literal (keys unquoted)."""
    pad = '  ' * ind
    if isinstance(v, dict):
        items = [f"{k if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', k) else json.dumps(k)}: {js_value(x, ind + 1)}"
                 for k, x in v.items()]
        one = '{ ' + ', '.join(items) + ' }'
        if len(one) < 110 and '\n' not in one:
            return one
        return '{\n' + ',\n'.join(pad + '  ' + it for it in items) + ',\n' + pad + '}'
    if isinstance(v, list):
        parts = [js_value(x, ind + 1) for x in v]
        one = '[' + ', '.join(parts) + ']'
        if len(one) < 110:
            return one
        lines, cur = [], ''
        for p_ in parts:
            if len(cur) + len(p_) + 2 > 104 and cur:
                lines.append(cur.rstrip())
                cur = ''
            cur += p_ + ', '
        if cur:
            lines.append(cur.rstrip())
        return '[\n' + '\n'.join(pad + '  ' + ln for ln in lines) + '\n' + pad + ']'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if v is None:
        return 'null'
    if isinstance(v, float) and v.is_integer() and abs(v) < 1e15:
        return str(int(v)) if not isinstance(v, bool) else str(v)
    return json.dumps(v)


STUB_TS_FUNCS = '''
/**
 * Film frame (fractional) of a music grid position: bar is 1-based, beat 0-3, sixteenth 0-3. With
 * MUSIC set it follows the music: inside the measured bars it runs from one downbeat attack to the
 * next (a played track breathes; downbeats[0] is t0), past them it continues at the track's tempo.
 * With MUSIC null it is the plain grid of `grid` (default 60 fps at 100 BPM). timeline.ts calls it
 * only when MUSIC is set, and b() rounds it, so every act start, Sequence and CUE stays a whole frame
 * within 0.5 f of the music.
 */
export const bar = (n: number, beat = 0, sixteenth = 0, grid: { fps: number; bpm: number } = { fps: 60, bpm: 100 }): number => {
  const m = MUSIC as Music | null;
  const pos = (n - 1) * 4 + beat + sixteenth / 4; // beats after bar 1's downbeat
  if (!m) return pos * (60 / grid.bpm) * grid.fps;
  const beatF = m.beatS * m.fps;
  const d = m.downbeats;
  const i = Math.floor(pos / 4); // 0-based bar of this position
  if (i >= 0 && i + 1 < d.length) return d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i]);
  if (d.length && i >= d.length - 1) return d[d.length - 1] + (pos - 4 * (d.length - 1)) * beatF;
  return (d.length ? d[0] : m.t0) + pos * beatF; // before bar 1 (a pickup), or no measured downbeats
};

/** The analysed track accent within `tol` frames of f (the nearest), or null; always null in the stub. */
export const accentNear = (f: number, tol = 1): MusicAccent | null => {
  const m = MUSIC as Music | null;
  if (!m) return null;
  let best: MusicAccent | null = null;
  for (const a of m.accents) if (Math.abs(a.f - f) <= tol && (!best || Math.abs(a.f - f) < Math.abs(best.f - f))) best = a;
  return best;
};
'''

TYPES_TS = '''
/** One analysed accent of the edited track: its film frame, its strength over the local bed and its band. */
export type MusicAccent = { f: number; db: number; band?: 'low' | 'mid' | 'high' };
/** A span of film frames in the track (a stop, a break, a section). */
export type MusicSpan = { from: number; to: number; label?: string };

export type Music = {
  bpm: number; // the edited track's tempo
  beatS: number; // one beat in seconds (60 / bpm)
  fps: number; // the film fps every frame below is in; must equal timeline.ts FPS
  t0: number; // film frame of bar 1's downbeat (the music may start before or after frame 0)
  bars: number; // bars in the body (TOTAL - TAIL), counted from t0
  phraseLen?: number; // bars per phrase
  downbeats: readonly number[]; // film frame of every bar's measured downbeat attack, bar 1 first
  accents: readonly MusicAccent[]; // the attacks cuts and hits aim at (the 16th grid is only the fallback)
  phrases?: readonly number[]; // film frames where phrases start
  sections?: readonly MusicSpan[]; // intro, build, drop... as the edit labels them
  entries: readonly number[]; // where the track enters or re-enters after a break or a stop
  breaks?: readonly MusicSpan[];
  stops: readonly MusicSpan[]; // the arrangement's own stops (preferred over gain stop-downs)
  // how and where the music ends: f is the final hit (button, ring), the hit on the bar line after the body (hit)
  // or that bar line where the fade starts (fade); hold is how many frames the picture holds after the bar line
  // after the body so the ending completes (its ring 1.5-3 s, the hit's ring, the fade): the tail is at least that
  end: { mode: 'button' | 'ring' | 'hit' | 'fade' | 'stop'; f: number; hold?: number }; // 'stop', no hold: a grid written before the endings
};
'''


def ts_file(m):
    return TS_HEAD + TYPES_TS + f'\nexport const MUSIC: Music | null = {js_value(m)};\n' + STUB_TS_FUNCS


def js_file(m):
    return ("/*\n * music.js: the film-time music grid, generated by scripts/audio/track.py grid from\n"
            " * audio/music/edit.json: do not edit it by hand. Every number is a film frame (fractional) at the film's\n"
            " * fps. Load it before timeline.js (<script src=\"music.js\">); it sets window.MUSIC_GRID and module.exports.\n"
            " */\n(function (root) {\n  'use strict';\n\n"
            f"  const MUSIC = {js_value(m, 1)};\n" + '''
  function bar(n, beat = 0, sixteenth = 0, grid = { fps: 60, bpm: 120 }) {
    const pos = (n - 1) * 4 + beat + sixteenth / 4; // beats after bar 1's downbeat
    if (!MUSIC) return pos * (60 / grid.bpm) * grid.fps;
    const beatF = MUSIC.beatS * MUSIC.fps;
    const d = MUSIC.downbeats || [];
    const i = Math.floor(pos / 4); // 0-based bar of this position
    if (i >= 0 && i + 1 < d.length) return d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i]);
    if (d.length && i >= d.length - 1) return d[d.length - 1] + (pos - 4 * (d.length - 1)) * beatF;
    return (d.length ? d[0] : MUSIC.t0) + pos * beatF; // before bar 1 (a pickup), or no measured downbeats
  }

  function accentNear(f, tol = 1) {
    if (!MUSIC) return null;
    let best = null;
    for (const a of MUSIC.accents) if (Math.abs(a.f - f) <= tol && (!best || Math.abs(a.f - f) < Math.abs(best.f - f))) best = a;
    return best;
  }

  const API = { MUSIC, bar, accentNear };
  root.MUSIC_GRID = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
''')


def film_fps(out_path):
    """the film's fps from src/timeline.ts (const FPS = N) or motion.js, next to the output."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(out_path))) if out_path.replace('\\', '/').endswith(
        'src/music.ts') else os.path.dirname(os.path.abspath(out_path))
    for p in (os.path.join(root, 'src', 'timeline.ts'), os.path.join(root, 'motion.js')):
        if os.path.isfile(p):
            m = re.search(r'^\s*(?:export\s+)?const\s+FPS\s*(?::[^=]+)?=\s*([0-9.]+)\s*;', open(p, encoding='utf-8').read(), re.M)
            if m:
                return float(m.group(1))
    return None


def cmd_grid(a_):
    edit = read_json(a_.edit, 'edit')
    out = a_.out or ('music.js' if os.path.isfile('motion.js') and not os.path.isdir('src') else 'src/music.ts')
    fps = a_.fps or film_fps(out)
    if not fps:
        raise TrackError(f'no fps: pass --fps (could not read FPS next to {out})')
    fps = int(fps) if float(fps).is_integer() else float(fps)
    m = music_obj(edit, fps)
    text = js_file(m) if out.endswith('.js') else ts_file(m)
    os.makedirs(os.path.dirname(os.path.abspath(out)) or '.', exist_ok=True)
    with open(out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)
    body_end = m['downbeats'][-1]
    print(f"grid: wrote {out}: {m['bpm']} BPM ({m['beatS'] * fps:.3f} f a beat at {fps} fps), bar 1 at f{m['t0']}, "
          f"{m['bars']} bars to f{body_end} (body = TOTAL - TAIL = {round(body_end)} f), {len(m['accents'])} accents, "
          f"{len(m['entries'])} entries, {len(m['stops'])} stops, ending {m['end']['mode']} at f{m['end']['f']}")
    print('  timeline: BPM = MUSIC?.bpm ?? <grid tempo>; b() rounds bar(); grid-check runs in music mode')
    sp = 'audio/score.json'
    if os.path.isfile(sp):
        sc = read_json(sp, 'score')
        mu = sc.get('music') if isinstance(sc.get('music'), dict) else {}
        sc['music'] = {**mu, 'track': edit['track'], 'edit': os.path.relpath(a_.edit).replace(os.sep, '/'), 'licence': edit.get('licence')}
        if edit.get('key'):
            sc['key'] = edit['key']
        sc.pop('bpm', None)  # the tempo comes from the grid
        with open(sp, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(json.dumps(sc, indent=2, ensure_ascii=False) + '\n')
        print(f"  {sp} plays {edit['track']} (key {sc.get('key')}, licence {edit.get('licence')})")
    return 0


# ------------------------------------------------------------------------------------------
# check: joins, licence, nothing made from the track in git
# ------------------------------------------------------------------------------------------
def join_report(bed, edit, src=None):
    """Each join measured on the edited bed: clicks, the incoming attack against the film downbeat, the
    loudness step, a chopped tail, a start inside a note. src: the decoded track (mono, 48 kHz): a click is
    then high-frequency energy at the join that neither source has at the same place (a hat or a snare on the
    incoming downbeat is the music, not a click); without it, a burst over its neighbours."""
    m = bed.mean(axis=1)
    e = energy_ms(m)
    from scipy import signal
    hp8 = signal.butter(4, 8000, 'high', fs=SR, output='sos')
    hfs = signal.sosfilt(hp8, m)
    hsrc = signal.sosfilt(hp8, np.asarray(src, np.float64)) if src is not None else None
    rows = []
    entries = edit['film'].get('entries', [])
    bar_s = BPB * float(edit['beat_s'])
    reveal_s = (edit.get('reveal') or {}).get('film_s')
    end_mode = (edit.get('ending') or {}).get('mode')
    last_s = edit['segments'][-1]['film_s'] if edit.get('segments') else None
    for j in edit.get('joins', []):
        t = j['film_s']
        ta, rdb = attack_near(e, t, 0.02)
        off_ms = (ta - t) * 1000
        i = int(t * SR)
        w2 = int(0.002 * SR)
        ks = list(range(max(0, i - int(0.03 * SR)), i + int(0.03 * SR), w2))
        hb = np.array([np.sqrt(np.mean(hfs[k:k + w2] ** 2) + 1e-14) for k in ks])
        if hsrc is not None and j.get('src_in') is not None and j.get('src_out') is not None:
            si, so = int(round(j['src_in'] * SR)), int(round(j['src_out'] * SR))
            rms = lambda y, a, b: float(np.sqrt(np.mean(y[max(0, a):max(0, b)] ** 2) + 1e-14)) if b > a else 1e-7  # noqa: E731
            g = rms(m, i + int(0.02 * SR), i + int(0.22 * SR)) / max(rms(np.asarray(src), si + int(0.02 * SR), si + int(0.22 * SR)), 1e-9)
            ref = np.array([max(rms(hsrc, si + (k - i), si + (k - i) + w2), rms(hsrc, so + (k - i), so + (k - i) + w2)) * g
                            for k in ks])
            click_db = float(np.max(20 * np.log10(hb / (ref + 1e-9))))
            click_lim = 6.0
        else:
            click_db = float(20 * np.log10(hb.max() / (np.median(hb) + 1e-12)))
            click_lim = 10.0
        L = lambda a, b: -0.691 + 10 * np.log10(np.mean(MK.kpower(bed[max(0, int(a * SR)):int(b * SR)])) + 1e-24)  # noqa: E731
        step = float(L(t, t + bar_s) - L(t - bar_s, t))  # whole bars on both sides: a bar's first beats are louder
        is_entry = any(abs(t - x) < 0.02 for x in entries)
        # what the join is for: an entry may step either way; a break into the reveal (the dip within 2 bars
        # before it) and the resolve into the last bars of a button or ring ending may step down
        kind = ('entry' if is_entry else
                'dip' if reveal_s is not None and t < reveal_s - 0.02 and reveal_s - t <= 2 * bar_s + 0.02 else
                'ending' if end_mode in ('button', 'ring', 'hit', 'fade') and last_s is not None and abs(t - last_s) < 0.02 else 'body')
        out_tail = j.get('tail_ms', TAIL_MS)
        # chop: the outgoing source still sounds near its last 50 ms level and over what enters, with a short tail
        x_out = 20 * np.log10(np.sqrt(np.mean(m[max(0, i - int(0.06 * SR)):i - int(0.01 * SR)] ** 2)) + 1e-9)
        x_in = 20 * np.log10(np.sqrt(np.mean(m[i + int(0.002 * SR):i + int(0.05 * SR)] ** 2)) + 1e-9)
        chop = bool(out_tail < 100 and x_out > x_in + 6 and rdb < 6)
        sustain_start = bool(rdb < 3.0)
        row = dict(film_s=t, attack_off_ms=round(off_ms, 2), attack_rise_db=round(rdb, 1), click_db=round(click_db, 1),
                   click_ref='the sources' if hsrc is not None else 'its neighbours',
                   loudness_step_lu=round(step, 2), entry=is_entry, kind=kind, chop=chop, sustain_start=sustain_start,
                   tail_ms=out_tail)
        prob = []
        if abs(off_ms) > JOIN_ATTACK_MS + 0.05:  # the attack is read in 1 ms blocks: -2.0 ms is inside +-2
            prob.append(f'the incoming attack is {off_ms:+.1f} ms from the film downbeat (want +-{JOIN_ATTACK_MS:g})')
        if click_db >= click_lim:
            prob.append(f'a click: a {click_db:.0f} dB high-frequency burst at the join (over '
                        + ('what the two sources have there)' if hsrc is not None else 'its neighbours)'))
        if abs(step) >= 3 and kind == 'body' or step >= 3 and kind in ('dip', 'ending'):
            prob.append(f'a {step:+.1f} LU loudness step (an entry may step, and a break before the reveal or the '
                        'resolve into a button or ring ending may step down; this join is none of them)')
        if chop:
            prob.append('a chopped note: the outgoing bar still sounds over what enters, with a short tail '
                        '(use a 150 ms tail or join on another bar)')
        if sustain_start:
            prob.append('no fresh attack on the join: the incoming segment starts inside a note')
        row['problems'] = prob
        rows.append(row)
    return rows


def ending_report(bed, edit):
    """The edited bed's ending as the film plays it (to the end of the hold, under score.py's 1.3 s end fade),
    measured as av-audit measures the film: a cut, a bed stopped dead or a track whose own last hit is dry is a
    problem. A hit ending's decay is the kit hit ringing over the bed's release: score.py and av-audit judge it."""
    import dsp as D
    end = edit.get('ending') or {}
    mode = 'hit' if end.get('mode') == 'stop' else end.get('mode')
    bar_line = ((edit.get('film') or {}).get('downbeats') or [end.get('end_s', 0.0)])[-1]
    hold = float(end.get('hold_s', 1.0))
    n_end = int(round((bar_line + max(hold, 1.0)) * SR))
    y = bed[:n_end].copy()
    if len(y) < n_end:
        y = np.concatenate([y, np.zeros((n_end - len(y), 2))])
    t = np.arange(len(y)) / SR
    y *= (np.clip((len(y) / SR - 0.03 - t) / 1.3, 0, 1) ** 2)[:, None]
    sh = D.ending_shape(y)
    probs = []
    # a hit ending's bed alone ends in its 0.5 s release: the decay is the kit hit ringing over it (score.py, av-audit)
    pr = D.ending_problem(sh) if mode != 'hit' else None
    if pr:
        probs.append(pr + (": this track's own final hit is dry; use --end fade or --end hit" if mode == 'button' else ''))
    if mode in ('button', 'ring') and (end.get('ring_out_s') or 0) < 0.3:
        probs.append(f"the track's final hit rings only {end.get('ring_out_s')} s: use --end fade (2-3 s under the end card) or --end hit")
    return dict(mode=mode, hold_s=round(hold, 3), problems=probs,
                **{k: sh.get(k) for k in ('last_loud_s', 'drop20_s', 'fall_s', 'tail_s', 'abrupt')})


def git_ok(root, edit):
    """(problems, notes): the track git-ignored, and nothing made from it tracked."""
    probs, notes = [], []
    try:
        top = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, cwd=root)
    except OSError:
        return probs, ['git not found: the ignore rules were not checked']
    if top.returncode != 0:
        return probs, ['not inside a git repository: the ignore rules were not checked']
    trk = edit['track']
    r = subprocess.run(['git', 'check-ignore', '-q', trk], capture_output=True, text=True, cwd=root)
    if r.returncode != 0:
        probs.append(f'{trk} is not git-ignored: add to .gitignore\n      audio/music/*\n      !audio/music/*.json\n'
                     '      !audio/music/README.md')
    pats = [f'*{e}' for e in AUDIO_EXT]
    ls = subprocess.run(['git', 'ls-files', '--'] + pats, capture_output=True, text=True, cwd=root)
    tracked = [f for f in ls.stdout.split('\n') if f.strip()]
    if tracked:
        probs.append('audio is tracked by git (the track, a stem, the soundtrack or the decode cache must never be '
                     'committed): ' + ', '.join(tracked[:6]))
    return probs, notes


def cmd_check(a_):
    rep = dict(problems=[], notes=[], joins=[])
    edit = read_json(a_.edit, 'edit')
    base = os.path.dirname(os.path.abspath(a_.edit))
    rp = locate(edit.get('licence') or '', os.getcwd())
    if not os.path.isfile(rp):
        rp = locate(os.path.basename(edit.get('licence') or ''), base)
    if os.path.isfile(rp):
        rec = CR.read_json(rp)
        probs, notes = CR.check_record(rec, rp, locate(edit['track'], os.getcwd()))
        rep['problems'] += [f'licence: {p}' for p in probs]
        rep['notes'] += [f'licence: {n}' for n in notes]
    else:
        rep['problems'].append(f'no licence record ({edit.get("licence")}): track.py add writes it')
    if os.path.isfile('audio/score.json'):
        mu = read_json('audio/score.json', 'score').get('music')
        plays = mu.get('track') if isinstance(mu, dict) else mu
        if not isinstance(mu, dict) or plays != edit['track'] or mu.get('licence') != edit.get('licence'):
            rep['problems'].append(f"audio/score.json plays {plays}, not this edit's {edit['track']} "
                                   f"(licence {edit.get('licence')}): track.py grid points it at the edit")
    gp, gn = git_ok(os.getcwd(), edit)
    rep['problems'] += gp
    rep['notes'] += gn
    trk = locate(edit['track'], os.getcwd())
    if os.path.isfile(trk):
        bed, _ = build_bed(edit, os.getcwd(), cache_dir=a_.cache)
        src, _ = decode(trk, a_.cache, edit.get('sha256'))
        rep['joins'] = join_report(bed, edit, src.mean(axis=1).astype(np.float64))
        for j in rep['joins']:
            rep['problems'] += [f"join at {j['film_s']:.3f} s: {p}" for p in j['problems']]
        rep['ending'] = ending_report(bed, edit)
        rep['problems'] += [f'ending: {p}' for p in rep['ending']['problems']]
    else:
        rep['problems'].append(f'the track {trk} is not here: the joins cannot be measured')
    rep['ok'] = not rep['problems']
    if a_.json:
        write_json(a_.json, rep)
    print(f"track check: {'ok' if rep['ok'] else 'PROBLEMS'}  {a_.edit}: {len(rep['joins'])} join(s) measured")
    if rep.get('ending'):
        en = rep['ending']
        print(f"  ending {en['mode']}: the bed's last loud moment {en.get('last_loud_s')} s, 20 dB down in {en.get('drop20_s')} s, "
              f"then {en.get('tail_s')} s of decay; the picture holds {en['hold_s']} s after the body")
    for j in rep['joins']:
        print(f"  join {j['film_s']:.3f} s: attack {j['attack_off_ms']:+.1f} ms (rise {j['attack_rise_db']} dB), click "
              f"{j['click_db']} dB, step {j['loudness_step_lu']:+.1f} LU{' (entry)' if j['entry'] else ''}")
    for p in rep['problems']:
        print(f'  problem: {p}')
    for n in rep['notes']:
        print(f'  note: {n}')
    return 0 if rep['ok'] else 1


# ------------------------------------------------------------------------------------------
# add: the licence record
# ------------------------------------------------------------------------------------------
def cmd_add(a_):
    if not os.path.isfile(a_.file):
        raise TrackError(f'track not found: {a_.file}')
    out = a_.out or os.path.join(os.path.dirname(a_.file) or '.', stem_of(a_.file) + '.licence.json')
    if os.path.exists(out) and not a_.force:
        raise TrackError(f'{out} exists (--force records the track again, after reading its page again)')
    c = CR.classify(a_.licence)
    yes = lambda v: None if v is None else str(v).lower() in ('yes', 'true', '1', 'y')  # noqa: E731
    rec = {'record': 1, 'file': os.path.basename(a_.file), 'sha256': CR.sha256_file(a_.file),
           'bytes': os.path.getsize(a_.file), 'title': a_.title, 'artist': a_.artist, 'source': a_.source,
           'page': a_.page, 'file_url': a_.file_url, 'licence': a_.licence, 'licence_id': c['id'],
           'licence_url': a_.licence_url or c['url'], 'credit_required': bool(c['attribution']),
           'credit': a_.credit or (None if c['attribution'] else f'Music: "{a_.title}" by {a_.artist} ({a_.source})'),
           'content_id': a_.content_id, 'ai_generated': yes(a_.ai_generated), 'vocals': yes(a_.vocals),
           'checked': a_.seen_date or datetime.date.today().isoformat(), 'certificate': a_.certificate,
           'licence_seen': ({'quote': a_.seen_quote, 'url': a_.seen_url,
                             'date': a_.seen_date or datetime.date.today().isoformat()}
                            if a_.seen_quote and a_.seen_url else None),
           'limits': a_.limits, 'modifications': a_.modifications or CR.DEFAULT_MODS}
    probs, notes = CR.check_record(rec, out, a_.file)
    write_json(out, rec)
    root_probs = []
    here = os.path.dirname(os.path.abspath(a_.file))
    try:
        inside = subprocess.run(['git', 'rev-parse', '--is-inside-work-tree'], capture_output=True, text=True,
                                cwd=here).returncode == 0
        ignored = inside and subprocess.run(['git', 'check-ignore', '-q', os.path.basename(a_.file)],
                                            capture_output=True, text=True, cwd=here).returncode == 0
    except OSError:
        inside, ignored = False, False
    if inside and not ignored:
        root_probs.append(f'{a_.file} is not git-ignored: add "audio/music/*", "!audio/music/*.json" and '
                          '"!audio/music/README.md" to .gitignore before anything else')
    for n in notes:
        print(f'  note: {n}')
    for p in probs + root_probs:
        print(f'  problem: {p}')
    print(f"add: wrote {out} ({c['name'] or a_.licence}: {c['status']})" + ('' if not (probs or root_probs) else '; REFUSED'))
    if not probs and not root_probs:
        print(f'  next: python3 scripts/audio/track.py analyze {a_.file}')
    return 0 if not (probs or root_probs) else 1


def find_one(folder, suffix):
    if os.path.isdir(folder):
        c = sorted(f for f in os.listdir(folder) if f.endswith(suffix))
        if len(c) == 1:
            return os.path.join(folder, c[0])
        if len(c) > 1:
            raise TrackError(f'{len(c)} *{suffix} files in {folder}: name the one to use')
    raise TrackError(f'no *{suffix} in {folder}: name the file')


def current_analysis(out, path, profile, bpm, phase):
    """The analysis in `out` when it was made from this exact file (sha256) and matches every option given (None:
    not given, so the analysis's own profile, stated tempo or phase set by hand stands), else None."""
    if not os.path.isfile(out) or not os.path.isfile(path):
        return None
    try:
        old = read_json(out, 'track analysis')
    except TrackError:
        return None
    an, g, tp = old.get('analysis') or {}, old.get('grid') or {}, old.get('tempo') or {}
    same = (an.get('version') == ANALYSIS_VERSION and an.get('rate') == AR
            and (profile is None or an.get('profile') == profile)
            and (bpm is None or tp.get('stated') == float(bpm))
            and (phase is None or (g.get('phase') == phase and (bool(g.get('phase_set')) or g.get('auto_phase') == phase))))
    return old if same and old.get('sha256') == CR.sha256_file(path) else None


def cmd_analyze(a_):
    out = a_.json or os.path.join(os.path.dirname(a_.file) or '.', stem_of(a_.file) + '.track.json')
    res = None if a_.force else current_analysis(out, a_.file, a_.profile, a_.bpm, a_.phase)
    if res is not None and a_.phase is not None and not res['grid'].get('phase_set'):
        # the grid already has this phase: setting it by hand gives the same analysis, so it is confirmed in place
        res['grid']['phase_set'] = True
        res['notes'] = [n for n in res.get('notes', []) if not n.startswith('downbeat confidence')]
        write_json(out, res)
        print_analysis(res, print if not a_.quiet else (lambda s: None))
        print(f'analyze: phase {a_.phase} confirmed in {out} (the grid it already had: no second analysis)')
    elif res is not None:
        print_analysis(res, print if not a_.quiet else (lambda s: None))
        print(f'analyze: {out} is current (the same file and settings): kept (--force analyses again)')
    else:
        info = {}
        res = analyze(a_.file, a_.profile or 'crisp', a_.bpm, a_.phase, a_.cache,
                      log=None if a_.quiet else (lambda s: print('  ' + s)), fresh=a_.force, info=info)
        write_json(out, res)
        print_analysis(res, print if not a_.quiet else (lambda s: None))
        print(f'analyze: wrote {out}' + (f' (phase {res["grid"]["phase"]}, re-gridded from the measurements cached in '
                                          f'{a_.cache}: no second analysis)' if info.get('cached') else ''))
    g = res['grid']
    if g['downbeat_confidence'] < CONF_MIN and not g['phase_set'] and g.get('entry_confirms'):
        print(f"  low downbeat confidence, confirmed by the biggest low-band entrance ({g['low_entry']['t']} s): grid A from "
              f"{g['t0']} s (phase {g['phase']}) stands; grid B from {g['alt']['t0']} s is --phase {g['alt']['phase']}")
    elif g['downbeat_confidence'] < CONF_MIN and not g['phase_set']:
        print(f"  LOW downbeat confidence: grid A from {g['t0']} s (phase {g['phase']}), grid B from "
              f"{g['alt']['t0']} s (phase {g['alt']['phase']}); rerun with --phase N (--phase {g['phase']} confirms grid A "
              f"in place, --phase {g['alt']['phase']} re-grids to B from the cached measurements)")
        return 2
    return 0


# ------------------------------------------------------------------------------------------
# fit: the edit fitted to the film's beat plan (the timeline read at the track's tempo)
# ------------------------------------------------------------------------------------------
PLAN_PROBE = r"""
const m: any = await import(%s);
const mu: any = m.MUSIC ?? null;
const cue = m.CUE ?? {};
const sal = m.SALIENCE ?? {};
const seams = (m.SEAMS ?? []).map((x: any) => x.at);
const acts = Object.values(m.ACT ?? {}).map((x: any) => x.from).filter((f: number) => f > 0);
const cuts = [...acts, ...seams, ...Object.keys(sal).filter((k) => sal[k] === 'cut' && k in cue).map((k) => cue[k])];
const bars = m.BARS ?? (m.TOTAL !== undefined && m.BAR ? Math.round((m.TOTAL - (m.TAIL ?? 0) - (mu?.t0 ?? 0)) / m.BAR) : null);
process.stdout.write('\n@@PLAN@@' + JSON.stringify({ bars, fps: m.FPS, bpm: m.BPM, beat: m.BEAT, reveal: m.REVEAL ?? cue.lockup ?? null,
  end: m.ACT?.end?.from ?? null, total: m.TOTAL, cuts, downbeats: mu?.downbeats ?? [] }) + '\n');
"""


def find_tsx(start):
    """tsx's CLI: the project's node_modules (up from start), else the skill's own starter (up from this script)"""
    for base, sub in ((start, ('node_modules',)), (HERE, ('node_modules',)), (HERE, ('assets', 'remotion-starter', 'node_modules'))):
        d = os.path.abspath(base)
        while True:
            p = os.path.join(d, *sub, 'tsx', 'dist', 'cli.mjs')
            if os.path.isfile(p):
                return p
            if os.path.dirname(d) == d:
                break
            d = os.path.dirname(d)
    return None


def read_plan(root, tsx):
    """the film's beat plan as the timeline computes it now (BARS, the reveal, the cut frames, the downbeats)"""
    import tempfile
    import pathlib
    tl = pathlib.Path(root, 'src', 'timeline.ts').resolve().as_uri()
    tmp = tempfile.mkdtemp(prefix='cinetic-fit-')
    probe = os.path.join(tmp, 'plan.mts')
    try:
        with open(probe, 'w', encoding='utf-8') as fh:
            fh.write(PLAN_PROBE % json.dumps(tl))
        r = subprocess.run(['node', tsx, probe], cwd=root, capture_output=True, text=True, encoding='utf-8', timeout=300)
    finally:
        for p in (probe,):
            if os.path.exists(p):
                os.remove(p)
        os.rmdir(tmp)
    k = (r.stdout or '').rfind('@@PLAN@@')
    if k < 0:
        raise TrackError('the timeline did not import (it must, before the music is fitted): '
                         + ' | '.join((r.stderr or r.stdout or '').strip().splitlines()[-4:]))
    return json.loads(r.stdout[k + 8:].strip().splitlines()[0])


def end_hold(a, end, fade=2.5):
    """the seconds the picture holds after the body for an ending mode (what MUSIC.end.hold will say)"""
    if end in ('button', 'ring'):
        return float(np.clip((a.get('ending') or {}).get('ring_out_s') or 0.0, RING_MIN_S, RING_MAX_S))
    return fade if end == 'fade' else HIT_RING_S


def provisional_grid(a, film_t0, fps, out, hold=1.0):
    """src/music.ts at the track's tempo: its bars from bar 1 straight, the ending's hold as the edit will have it (the
    timeline counts the film's bars on it, its tail included; fit writes the real grid after the edit)"""
    nb = len(a['bars'])
    segs = [dict(film_bar=1, src_bar=1, bars=nb)]
    segs, _, film_down, ending = film_map(a, segs, film_t0, nb, 'hit')
    fg = film_grid(a, segs, ending, film_down)
    edit = {'bpm': a['tempo']['bpm'], 'beat_s': a['tempo']['beat_s'], 'film_bars': nb, 'phrase_len': a['phrases']['len'],
            'film': dict(downbeats=film_down, **fg), 'ending': dict(ending, hold_s=hold)}
    with open(out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(ts_file(music_obj(edit, fps)))


def cmd_fit(a_):
    root = os.getcwd()
    if not os.path.isfile(os.path.join('src', 'timeline.ts')):
        raise TrackError('fit reads the film\'s beat plan from src/timeline.ts (a Remotion project): run it from the project '
                         'root, or use track.py edit --bars N --reveal-bar K')
    tsx = find_tsx(root)
    if not tsx:
        raise TrackError('tsx not found (npm install in the film project): fit imports the timeline to read its bars')
    tj = a_.track or find_one('audio/music', '.track.json')
    a = read_json(tj, 'track analysis')
    out_ts = os.path.join('src', 'music.ts')
    fps = film_fps(out_ts)
    if not fps:
        raise TrackError('no FPS in src/timeline.ts')
    fps = int(fps) if float(fps).is_integer() else float(fps)
    old = open(out_ts, encoding='utf-8').read() if os.path.isfile(out_ts) else None

    def restore():
        if old is not None:
            with open(out_ts, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(old)
    asked = a_.end or 'auto'
    kind = (a.get('ending') or {}).get('kind')
    end = asked if asked != 'auto' else (kind if kind in ('button', 'ring') else 'hit')
    if asked == 'stop':
        end = 'hit'
    for attempt in range(3):
        try:
            provisional_grid(a, a_.film_t0, fps, out_ts, end_hold(a, end, a_.fade))
            plan = read_plan(root, tsx)
        except Exception:
            restore()
            raise
        bars, down = plan.get('bars'), plan.get('downbeats') or []
        if not bars or bars < 2:
            restore()
            raise TrackError('the timeline exports no BARS (the film\'s bars in the body): use track.py edit --bars N --reveal-bar K')
        bars = int(round(bars))
        beat_f = (plan.get('beat') or a['tempo']['beat_s'] * fps)

        def bar_of(f):
            k = int(np.searchsorted(np.array(down, float), float(f) + 0.5, side='right'))
            return max(1, min(bars, k))
        reveal_f = plan.get('reveal')
        if plan.get('end') is not None and reveal_f is not None and bar_of(reveal_f) - bar_of(plan['end']) <= 1:
            reveal_bar = bar_of(plan['end'])  # the end act opens on a downbeat: the entry lands as the last picture becomes the mark
        else:
            reveal_bar = bar_of(reveal_f) if reveal_f is not None else max(1, int(round(bars * 0.8)))
        cuts = sorted({k + 1 for k in range(bars) if k < len(down) and any(abs(float(c) - down[k]) <= beat_f / 4 + 0.5 for c in plan['cuts'])})
        print(f"fit: the film's beat plan at the track's {a['tempo']['bpm']:g} BPM: {bars} bars in the body, the reveal on bar "
              f"{reveal_bar} (the lockup's), cuts on the downbeats of bars {', '.join(map(str, cuts)) or 'none'}")
        ns = argparse.Namespace(track=tj, bars=bars, reveal_bar=reveal_bar, end=end, start_bar=None, entry=a_.entry, arc=None,
                                film_t0=a_.film_t0, fade=a_.fade, map=None, out=a_.out, cache=a_.cache, gap=None, cuts=set(cuts),
                                fit=dict(bars=bars, reveal_bar=reveal_bar, cuts=cuts, end_asked=asked))
        try:
            code = cmd_edit(ns)
        except TrackError as e:
            if end in ('button', 'ring') and asked == 'auto':
                print(f"fit: the track's own {end} ending does not fit these bars ({e}); one ringing kit hit ends it instead", file=sys.stderr)
                end = 'hit'
                continue
            restore()
            raise
        if code:
            restore()
            return code
        end = ns.end
        cmd_grid(argparse.Namespace(edit=a_.out, fps=None, out=None))
        after = read_plan(root, tsx)
        if int(round(after.get('bars') or 0)) == bars:
            break
        print(f"fit: with the final grid the timeline counts {after.get('bars')} bars (its tail follows the ending): fitting again",
              file=sys.stderr)
    else:
        print('fit: the film\'s bars did not settle in 3 fits: check the timeline\'s tail (MUSIC.end.hold)', file=sys.stderr)
        return 1
    print(f"fit: film bars = music bars = {bars}; the track's entry on the lockup's bar {reveal_bar}; ending {end}"
          + (': the bed fades under the end card, as asked' if end == 'fade' else ': a hit on the end card, never a fade under it'))
    print('  next: npm run check (grid-check in music mode), then the sound (npm run cues, kit, audio)')
    return 0


def cmd_music(a_):
    """analyze -> edit -> grid again, with the settings audio/music/edit.json and its analysis hold"""
    if not os.path.isfile(a_.edit):
        raise TrackError(f'no {a_.edit} yet: run track.py analyze <track>, then track.py edit --bars N --reveal-bar K '
                         '[--end auto|own|fade|hit] (references/music.md); npm run music repeats them afterwards')
    e = read_json(a_.edit, 'edit')
    tj = e.get('analysis')
    an = read_json(tj, 'track analysis') if tj and os.path.isfile(tj) else {}
    trk = locate(e['track'], os.getcwd())
    av = ['analyze', trk, '--json', tj or os.path.join(os.path.dirname(trk), stem_of(trk) + '.track.json'), '--quiet']
    prof = (an.get('analysis') or {}).get('profile')
    if prof in PRIOR:
        av += ['--profile', prof]
    if (an.get('tempo') or {}).get('stated'):
        av += ['--bpm', str(an['tempo']['stated'])]
    if (an.get('grid') or {}).get('phase_set'):
        av += ['--phase', str(an['grid']['phase'])]
    code = main(av)
    if code:
        return code
    g = e.get('args') or {}
    if g.get('fit'):  # an edit fitted to the beat plan: fit again (the script may have changed the film's bars)
        fv = ['fit', av[3], '--end', (e.get('fit') or {}).get('end_asked') or 'auto', '--out', a_.edit]
        for k, flag in (('entry', '--entry'), ('film_t0', '--film-t0'), ('fade', '--fade')):
            if g.get(k) is not None:
                fv += [flag, str(g[k])]
        return main(fv)
    ev = ['edit', av[3], '--bars', str(g['bars']), '--reveal-bar', str(g['reveal_bar']), '--end', g.get('end') or 'auto', '--out', a_.edit]
    for k, flag in (('start_bar', '--start-bar'), ('entry', '--entry'), ('film_t0', '--film-t0'), ('fade', '--fade'), ('arc', '--arc'),
                    ('map', '--map')):
        if g.get(k) is not None:
            ev += [flag, str(g[k])]
    code = main(ev)
    if code:
        return code
    return main(['grid', '--edit', a_.edit])


def main(argv=None):
    ap = argparse.ArgumentParser(description="The film's licensed music track: add, analyze, edit, grid, check, music.")
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('add', help='write the licence record')
    p.add_argument('file')
    for k in ('title', 'artist', 'source', 'page', 'licence'):
        p.add_argument(f'--{k}', required=True)
    p.add_argument('--seen-quote', help='a short quote of the licence text as read on the item\'s own page now')
    p.add_argument('--seen-url', help='the page the quote was read on')
    p.add_argument('--seen-date', help='YYYY-MM-DD (default today)')
    p.add_argument('--credit')
    p.add_argument('--file-url')
    p.add_argument('--licence-url')
    p.add_argument('--content-id', default='unknown', help='"not registered", "registered" or "unknown"')
    p.add_argument('--certificate')
    p.add_argument('--ai-generated', help='no / yes as the page says (a track marked AI generated is refused)')
    p.add_argument('--vocals', help='no / yes (a track with a lead vocal is refused)')
    p.add_argument('--limits')
    p.add_argument('--modifications')
    p.add_argument('--out')
    p.add_argument('--force', action='store_true')
    p = sub.add_parser('analyze', help='tempo, grid, bars, structure')
    p.add_argument('file')
    p.add_argument('--profile', choices=tuple(PRIOR), help='the tempo prior (default crisp)')
    p.add_argument('--bpm', type=float, help='the stated tempo, when the composer gives one (the phase is still fitted)')
    p.add_argument('--phase', type=int, help='the downbeat phase 0-3 (after a low-confidence analysis)')
    p.add_argument('--json', help='output (default audio/music/<name>.track.json next to the file)')
    p.add_argument('--cache', default='out/cache/music', help='decode and measurement cache (git-ignored)')
    p.add_argument('--force', action='store_true', help='analyse again from the audio, even when the .track.json or the '
                   'cached measurements are current')
    p.add_argument('--quiet', action='store_true')
    p = sub.add_parser('edit', help='source bars -> film bars')
    p.add_argument('track', nargs='?', help='the .track.json (default: the one in audio/music/)')
    p.add_argument('--bars', type=int, required=True, help='film bars in the body (before the tail)')
    p.add_argument('--reveal-bar', type=int, required=True, help='the film bar of the biggest reveal (about 75-90%% in)')
    p.add_argument('--end', default='auto', choices=END_MODES,
                   help="how the music ends (never a cut): auto (default: the track's own ending when it has one, else "
                        "fade), own (its final hit rings out: button or ring), fade (2-3 s under the end card), hit (one "
                        "kit element that rings; stop is its old name)")
    p.add_argument('--start-bar', type=int)
    p.add_argument('--entry', type=int, help='the source entry bar to land on the reveal (default: the biggest drop)')
    p.add_argument('--arc', help='target dB per film bar, comma list (default: intro, body, dip, peak, resolve)')
    p.add_argument('--film-t0', type=float, default=0.25, help='film time of bar 1\'s downbeat, 0-0.45 s (default 0.25)')
    p.add_argument('--gap', type=float, default=None, help=argparse.SUPPRESS)  # the old stop ending's gap: no longer used
    p.add_argument('--fade', type=float, default=2.5, help=f'fade ending: its length under the end card ({FADE_MIN_S:g}-{FADE_MAX_S:g} s)')
    p.add_argument('--map', help='the film bars by hand: film bar:source bar x bars in film order, e.g. 1:2x10,11:59x2 '
                   '(the planner is skipped; joins, ending and grid are written as usual)')
    p.add_argument('--out', default='audio/music/edit.json')
    p.add_argument('--cache', default='out/cache/music')
    p = sub.add_parser('fit', help="the edit fitted to the film's beat plan, then the grid")
    p.add_argument('track', nargs='?', help='the .track.json (default: the one in audio/music/)')
    p.add_argument('--end', default='auto', choices=END_MODES,
                   help="auto (default): the track's own button or ring, else one ringing kit hit; never a fade unless asked")
    p.add_argument('--entry', type=int, help='the source entry bar to land on the lockup (default: the biggest drop)')
    p.add_argument('--film-t0', type=float, default=0.25, help="film time of bar 1's downbeat, 0-0.45 s (default 0.25)")
    p.add_argument('--fade', type=float, default=2.5, help=argparse.SUPPRESS)
    p.add_argument('--out', default='audio/music/edit.json')
    p.add_argument('--cache', default='out/cache/music')
    p = sub.add_parser('grid', help='write src/music.ts or music.js')
    p.add_argument('--edit', default='audio/music/edit.json')
    p.add_argument('--fps', type=float)
    p.add_argument('--out')
    p = sub.add_parser('music', help='analyze, edit and grid again with the saved settings')
    p.add_argument('--edit', default='audio/music/edit.json')
    p = sub.add_parser('check', help='joins, licence, git')
    p.add_argument('--edit', default='audio/music/edit.json')
    p.add_argument('--json')
    p.add_argument('--cache', default='out/cache/music')
    a = ap.parse_args(argv)
    try:
        return {'add': cmd_add, 'analyze': cmd_analyze, 'edit': cmd_edit, 'fit': cmd_fit, 'grid': cmd_grid, 'check': cmd_check,
                'music': cmd_music}[a.cmd](a)
    except (TrackError, CR.CreditError) as e:
        print(f'track.py: {e}', file=sys.stderr)
        return getattr(e, 'code', 1)


if __name__ == '__main__':
    sys.exit(main())
