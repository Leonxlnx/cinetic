#!/usr/bin/env python3
"""Sync and true-peak gate for a muxed film: is the delivered audio where the source WAV says it is, and does
every sound land on its frame?

Two gates on the decoded audio of the rendered file (after AAC, exactly what a viewer hears):

1. Lag against the source WAV. Cross-correlates the decoded audio with the source soundtrack at a few points
   and fails if any lag exceeds the tolerance (48 samples = 1 ms at 48 kHz). Remotion's own AAC mux leaves
   ~2048 samples of encoder priming in the stream, so an unchecked mux is typically 2-3 frames late; this
   catches that and any wrong-file or trimmed mux. It also measures the true peak of the decoded audio (4x
   oversampled): AAC encoding raises peaks by ~0.5-1 dB, so a WAV that passed before encode can clip after.
   Sample points: by default 12%, 45% and 85% of the overlap; a point whose reference window is silent moves
   to the nearest window with signal. Both signals are high-passed (500 Hz) and the correlation is normalised
   by the local energy of each candidate window, so a sustained bass note cannot pull the lag a cycle away.

2. Frames: every sound against its cue's frame (on whenever out/cues.json exists; --cues names another,
   --no-frames skips it). The lag gate only proves the mux matches the WAV; a WAV cut by hand can be early
   or late everywhere and still pass it. This gate measures the delivered audio against the picture's frames:
   effects  every placed effect of the plan (out/qa/sfx_plan.json, beside the cues): the take as score.py
            plays it is found in the decoded audio by normalised cross-correlation, with the edited bed (below)
            taken out first (its gain fitted per 20 ms block), so a quiet key or tick the music covers is still
            found. Its sync point is the take file's own point that plan.py placed on the cue, measured on the
            file under the rule its lock was written with (earshot's: the mono sum's 1 ms envelope within -30 dB,
            the loudest 5 ms; kit.py measure_take's for real and library takes: the first sample at 10 % of the
            peak), so a take changed after it was locked shows as its own offset (and warns). That point must
            sit within +-1 frame of the cue's frame; a role's planned offset (offset_ms: taps lead, pop-in thumps
            and whoosh peaks land after) widens the window on its side only (--strict: no widening). A take
            heard (-20 dB) more than 45 ms before its picture, a recording's pre-roll ahead of the onset the plan
            aligned, warns. A ringing take (a kalimba's tine, a bell: its waveform matches itself all along the ring) is
            placed by its attack, never by the best waveform match a few hundred ms into its own ring; so is a short
            take whose weak best match (under 0.7) lands off the plan on no attack (a detent's second click, an air
            tick the encoder smears) while a clear transient where the take has its attack plays nearer the plan. An effect the music still covers so that it cannot be found is listed; when most of
            them cannot be found, the audio is not this film's mix (fail).
   music    with a track (audio/music/edit.json): the edited bed is rebuilt from the edit (track.py
            build_bed: bar 1 at the edit's film_t0) and found in the decoded audio at every act change,
            structural cue and declared seam; the music must sit within +-1 frame of where the edit puts it,
            so the track's own hits land on the cuts the timeline cut to them. A hand cut that drops film_t0,
            a pad of encoder priming or a shifted mux fails here.
   onsets   the share of cuts (act changes, declared seams, cues marked as cuts) and of key state changes (the cues
            marked as hits: a click, a result) that carry an onset in the delivered audio within +-1 frame (a rise of
            4 dB or more: the track's hit or an effect's attack); under 75 % warns, with the frames that have none.
   picture  (--picture: it decodes the video around every act change) the picture's own cut, the largest frame
            difference within +-6 frames, against the cue frame; a clear cut more than 1 frame off warns (a
            30 fps delivery that keeps every second frame of a 60 fps timeline shows a cut on an odd 60 fps
            frame one 60 fps frame, half a delivered frame, late).
   One frame is the delivered video's frame (its frame rate, else the cues' fps).

Usage:
  python3 scripts/check-sync.py out/film.mp4 [public/audio/soundtrack.wav]
  python3 scripts/check-sync.py out/act3.mp4 public/audio/soundtrack.wav --ref-offset 14.0
  python3 scripts/check-sync.py out/film.mp4 --points 4,14,28 --tol 48 --tp-max -1 --json out/qa/sync.json
  python3 scripts/check-sync.py out/film.mp4 --cues out/cues.json --plan out/qa/sfx_plan.json --edit audio/music/edit.json

Options: --tol samples (48), --points auto|comma-separated seconds, --window s (2.0), --search s
(0.1), --ref-offset s (video t=0 corresponds to this time in the WAV and in the film, for excerpt renders),
--tp-max dBTP (-1.0), --min-corr (0.5, below this the audio does not match the source),
--highpass Hz (500; 0 = broadband), --lufs/--lufs-tol (optional loudness gate), --json FILE, --quiet.
Frames: --cues FILE (default out/cues.json when it exists), --plan FILE (default <cues dir>/qa/sfx_plan.json),
--edit FILE (default audio/score.json's music.edit, else audio/music/edit.json), --takes DIR (default the
kit's takes folder, audio/kit), --frame-tol frames (1.0), --strict (no offset widening), --no-frames,
--picture. Without the source WAV (the default path missing) the lag gate is skipped and only the
frames gate runs.
Prints JSON on stdout, a readable summary on stderr. Exit 0 = pass, 1 = fail.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import types

import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('source', nargs='?', default=None, help='the source WAV (default public/audio/soundtrack.wav)')
    ap.add_argument('--tol', type=int, default=48, help='max |lag| in samples (default 48 = 1 ms at 48 kHz)')
    ap.add_argument('--points', default='auto', help="'auto' (12/45/85%%) or seconds, e.g. 4,14,28")
    ap.add_argument('--window', type=float, default=2.0, help='correlation window, seconds')
    ap.add_argument('--search', type=float, default=0.1, help='max lag searched, seconds')
    ap.add_argument('--ref-offset', type=float, default=0.0, help='WAV (and film) time that corresponds to video t=0')
    ap.add_argument('--tp-max', type=float, default=-1.0, help='true-peak ceiling after decode, dBTP')
    ap.add_argument('--min-corr', type=float, default=0.5, help='min normalised correlation at the best lag')
    ap.add_argument('--highpass', type=float, default=500.0,
                    help='high-pass both signals at this frequency (Hz) before correlating; 0 = broadband (default 500)')
    ap.add_argument('--lufs', type=float, help='optional integrated-loudness gate target')
    ap.add_argument('--lufs-tol', type=float, default=1.0)
    ap.add_argument('--cues', help='cues.json for the frames gate (default out/cues.json when it exists)')
    ap.add_argument('--plan', help='the effects plan (default <cues dir>/qa/sfx_plan.json)')
    ap.add_argument('--edit', help="the music edit (default audio/score.json's music.edit, else audio/music/edit.json)")
    ap.add_argument('--takes', help='the kit takes folder (default from audio/score.json sfx.kit, else audio/kit)')
    ap.add_argument('--frame-tol', type=float, default=1.0, help='frames gate tolerance in video frames (default 1)')
    ap.add_argument('--strict', action='store_true', help="frames gate: a role's planned offset does not widen the window")
    ap.add_argument('--no-frames', action='store_true', help='skip the frames gate')
    ap.add_argument('--picture', action='store_true', help='frames gate: also measure the picture cut at every act change')
    ap.add_argument('--json', help='also write the report here')
    ap.add_argument('--quiet', action='store_true')
    return ap.parse_args()


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-12) if len(x) else -240.0


def ncc(dw, rw):
    """Normalised cross-correlation of rw slid across dw ('valid' lags): each lag is divided by the
    energy of the dw segment it covers, so a loud stretch (or a long bass cycle) cannot win on level."""
    n = len(rw)
    c = signal.correlate(dw, rw, mode='valid', method='fft')
    e = np.concatenate([[0.0], np.cumsum(np.square(dw, dtype=np.float64))])
    seg = np.sqrt(np.maximum(e[n:] - e[:-n], 0.0))
    return c / (seg * np.linalg.norm(rw) + 1e-12)


def decode_audio(path, sr, ch=2):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-map', '0:a:0', '-f', 'f32le', '-ac', str(ch),
                        '-ar', str(sr), '-'], capture_output=True)
    if r.returncode or not r.stdout:
        return None, r.stderr.decode(errors='replace').strip()[:300]
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, ch), ''


def video_fps(path):
    """(fps, has video) of a file's first video stream; (None, False) for an audio file."""
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,codec_name',
                        '-of', 'json', path], capture_output=True, text=True)
    try:
        st = json.loads(r.stdout or '{}').get('streams') or []
    except json.JSONDecodeError:
        st = []
    if not st or st[0].get('codec_name') in ('png', 'mjpeg'):  # no video, or a cover picture
        return None, False
    num, _, den = (st[0].get('r_frame_rate') or '0/1').partition('/')
    try:
        fps = float(num) / float(den or 1)
    except (ValueError, ZeroDivisionError):
        fps = 0.0
    return (fps if fps > 0 else None), fps > 0


# ------------------------------------------------------------------------------------------
# lag against the source WAV
# ------------------------------------------------------------------------------------------
def lag_gate(a, report, say, ref, sr, dec):
    ref_m = ref.mean(axis=1) if ref.shape[1] > 1 else ref[:, 0]
    dec_m = dec.mean(axis=1)
    off = int(round(a.ref_offset * sr))
    ref_m = ref_m[off:]
    if a.highpass > 0:
        # Same zero-phase filter on both: removes the bass that makes lag estimates periodic, and
        # cannot shift one signal against the other.
        sos = signal.butter(4, a.highpass, btype='highpass', fs=sr, output='sos')
        hp_ref = signal.sosfiltfilt(sos, ref_m).astype(np.float32)
        hp_dec = signal.sosfiltfilt(sos, dec_m).astype(np.float32)
        # Fall back to broadband if the soundtrack has almost nothing above the cut-off.
        if rms_db(hp_ref) > rms_db(ref_m) - 40:
            ref_m, dec_m = hp_ref, hp_dec
            report['highpass_hz'] = a.highpass
        else:
            report['highpass_hz'] = 0
    else:
        report['highpass_hz'] = 0
    overlap = min(len(ref_m), len(dec_m)) / sr
    report.update(sample_rate=sr, decoded_seconds=round(len(dec_m) / sr, 4),
                  reference_seconds=round(len(ref_m) / sr, 4), ref_offset=a.ref_offset)

    search = int(a.search * sr)
    win = min(a.window, max(0.25, overlap / 5))
    n_win = int(win * sr)
    if overlap * sr < n_win + 2 * search:
        report['error'] = f'overlap too short to measure ({overlap:.2f}s)'
        say(report['error'])
        return False

    lo_t, hi_t = a.search, overlap - win - a.search  # window starts that leave room for the search
    if a.points == 'auto':
        wanted = [lo_t + f * (hi_t - lo_t) for f in (0.12, 0.45, 0.85)]
    else:
        wanted = [min(max(float(x), lo_t), hi_t) for x in a.points.split(',') if x.strip()]

    # windows with signal: reference RMS above -50 dBFS; move a silent point to the nearest loud one
    step = 0.25
    starts = np.arange(lo_t, hi_t + 1e-9, step)
    loud = [t for t in starts if rms_db(ref_m[int(t * sr):int(t * sr) + n_win]) > -50]
    points, worst, weak = [], 0, False
    if not loud:
        report['error'] = 'reference is silent everywhere in the overlap; nothing to correlate'
        say(report['error'])
        return False
    used = set()
    for t in wanted:
        tt = t
        if rms_db(ref_m[int(t * sr):int(t * sr) + n_win]) <= -50:
            tt = min(loud, key=lambda x: abs(x - t))
        if round(tt, 2) in used:
            continue
        used.add(round(tt, 2))
        s0 = int(tt * sr)
        rw = ref_m[s0:s0 + n_win]
        dw = dec_m[s0 - search:s0 + n_win + search]
        c = ncc(dw, rw)
        k = int(np.argmax(c))
        lag = k - search
        corr = float(c[k])
        worst = max(worst, abs(lag))
        weak |= corr < a.min_corr
        points.append({'t': round(float(tt), 3), 'lag_samples': lag, 'lag_ms': round(lag / sr * 1000, 3), 'corr': round(corr, 4)})
        say(f'  t={tt:6.2f}s  lag {lag:+d} samples ({lag / sr * 1000:+.2f} ms)  corr {corr:.3f}')
    report.update(points=points, worst_lag_samples=worst, tol_samples=a.tol)
    sync_ok = worst <= a.tol and not weak
    if weak:
        say(f'  weak correlation (< {a.min_corr}): the muxed audio does not match {a.source}')
    say(f'sync {"OK" if sync_ok else "FAIL"}: worst {worst} samples (tol {a.tol})')
    return sync_ok


# ------------------------------------------------------------------------------------------
# frames: every sound against its cue's frame
# ------------------------------------------------------------------------------------------
HP_HZ = 150.0          # the frames gate's high-pass: under it the bed's bass owns the correlation
FOUND_CORR = 0.45      # an effect located at this normalised correlation or more is measured and gated
FAR_CORR = 0.7         # a lock more than 2 frames off the plan must be this clear, else it may be a neighbour or the music
PLAN_CORR_FRAC = 0.75  # ... unless the plan's own position matches under this share of it: then the effect is not there
LOW_FRAC = 0.5         # a take with this much of its energy under 150 Hz (a thump) is matched with its lows (40 Hz high-pass)
BED_CORR = 0.5         # a bed window located at this correlation or more is gated
EFFECT_SEARCH_S = 0.35  # +- search around the planned start (~10 f at 30 fps)
REPEAT_FRAC = 0.85     # a lag with an attack nearer the plan that matches this share of the best one places a take whose
#                        waveform repeats (a detent's two clicks): the encoder can tip the best match one repeat away
TONAL_SELF = 0.8       # a template this alike to the take a few ms later (a ringing tine, a held chord) is tonal: the
#                        waveform matches all along its ring, so the attack places it, not the best waveform match
ONSET_DB = 4.0         # cut-onsets: a rise this big (the 15 ms after vs the 20 ms before) marks an onset in the audio
CUT_ONSET_SHARE = 0.75  # cut-onsets: under this share of cuts (and key state changes) with an onset within a frame warns
BED_SEARCH_S = 0.5


def read_json(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def project_root(cues_path):
    """the project folder of a cues file (out/cues.json -> .)"""
    d = os.path.dirname(os.path.abspath(cues_path))
    return os.path.dirname(d) if os.path.basename(d) == 'out' else d


def _env(m, win, hop):
    """(RMS of win-sample windows every hop samples, window starts)"""
    c = np.concatenate([[0.0], np.cumsum(m * m)])
    st = np.arange(0, max(1, len(m) - win + 1), hop)
    return np.sqrt(np.maximum((c[np.minimum(st + win, len(m))] - c[st]) / win, 0.0)), st


def take_points(x):
    """a take file's sync points under both rules a kit lock is written with, in seconds:
    'mono'   earshot's lock (forge bank times()): the mono sum's 1 ms envelope first within -30 dB of its maximum
             (onset), the centre of the mono sum's loudest 5 ms (peak);
    'louder' kit.py measure_take (real and library takes), on |the larger of the two samples|: the first sample at 10 % of
             the peak sample (onset), the centre of the loudest 5 ms (peak).
    Each peak comes with the span of its plateau within 1.5 dB (a swell's bloom has no single loudest instant:
    any point of that span is its peak). 'pre' is where the mono sum's 1 ms envelope first reaches -20 dB of its
    maximum: the earliest a listener hears the take."""
    out = {}
    mono = x.mean(axis=1) if x.ndim == 2 else x
    loud = np.abs(x.max(axis=1) if x.ndim == 2 else x)  # measure_take: |the larger of the two samples|
    if not len(mono) or not np.any(loud):
        z = dict(onset=0.0, peak=(0.0, 0.0, 0.0))
        return dict(mono=z, louder=z, pre=0.0)
    w5, h1 = SR // 200, SR // 1000

    def peak(m, hop):
        e5, s5 = _env(m, w5, hop)
        ip = int(np.argmax(e5))
        ok = e5 >= e5[ip] * 10 ** (-1.5 / 20)
        a = ip
        while a > 0 and ok[a - 1]:
            a -= 1
        b = ip
        while b < len(ok) - 1 and ok[b + 1]:
            b += 1
        ctr = lambda i: (s5[i] + w5 / 2) / SR  # noqa: E731
        return ctr(ip), ctr(a), ctr(b)
    e1, s1 = _env(mono, SR // 1000, SR // 4000)
    out['mono'] = dict(onset=s1[int(np.argmax(e1 >= e1.max() * 10 ** (-30 / 20)))] / SR, peak=peak(mono, h1))  # 1 ms hops, as earshot
    out['louder'] = dict(onset=int(np.argmax(loud >= 0.1 * loud.max())) / SR, peak=peak(loud, 1))  # every sample, as measure_take
    out['pre'] = s1[int(np.argmax(e1 >= e1.max() * 0.1))] / SR
    return out


def read_locks(takes_dir):
    """{take file: its lock entry} from every *.lock.json of the takes folder (kit.lock.json, real.lock.json)"""
    locks = {}
    try:
        names = sorted(n for n in os.listdir(takes_dir) if n.endswith('.lock.json'))
    except OSError:
        return locks
    for n in names:
        try:
            j = read_json(os.path.join(takes_dir, n))
        except (OSError, json.JSONDecodeError):
            continue
        for r in ((j.get('roles') or {}) if isinstance(j, dict) else {}).values():
            for tk in ((r or {}).get('takes') or []) if isinstance(r, dict) else []:
                if isinstance(tk, dict) and tk.get('file'):
                    locks.setdefault(tk['file'], tk)
    return locks


def sync_point(x, align, lock=None):
    """(sync point, earliest, latest, rule, pre) in seconds of a take file: the point plan.py placed on the cue
    (MK.place puts the lock's onset_s or peak_s there), measured on the file itself under the rule its lock was
    written with (the rule whose point lies nearest the lock's; earshot's without a lock), so the gate measures the
    point the plan aligned, and a take changed after it was locked shows as its own offset"""
    pts = take_points(x)

    def at(rule):
        v = pts[rule][align] if align in ('onset', 'peak') else pts[rule]['onset']
        return v if isinstance(v, tuple) else (v, v, v)
    rule = 'mono'
    if lock is not None and lock.get(f'{align}_s') is not None:
        ls = float(lock[f'{align}_s'])
        rule = min(('mono', 'louder'), key=lambda r: abs(at(r)[0] - ls))
    sp, lo, hi = at(rule)
    return sp, lo, hi, rule, pts['pre']


def locate(hay, h0, tpl, expect, search, near=True):
    """(start s of tpl in hay, corr) searched within expect +- search; hay starts at time h0 (s). Among the
    candidates within 0.9 of the best correlation the one nearest the expected time wins (a run of the same take)."""
    s0 = int(round((expect - search - h0) * SR))
    s1 = int(round((expect + search - h0) * SR)) + len(tpl)
    lo = max(0, s0)
    seg = hay[lo:min(len(hay), s1)]
    if len(seg) < len(tpl) + 2 or np.linalg.norm(tpl) <= 0:
        return None, 0.0
    c = ncc(seg, tpl)
    best = float(c.max())
    if near:  # the best lag of each run of lags within 0.9 of the best (runs 4 ms apart are separate candidates)
        idx = np.nonzero(c >= 0.9 * best)[0]
        groups = np.split(idx, np.nonzero(np.diff(idx) > int(0.004 * SR))[0] + 1)
        cand = [int(g[np.argmax(c[g])]) for g in groups if len(g)]
        k = min(cand, key=lambda k: abs(h0 + (lo + k) / SR - expect))
    else:
        k = int(np.argmax(c))
    return h0 + (lo + k) / SR, float(c[k])


def attack_ratio(x, k):
    """the attack at sample k of x: RMS of the 15 ms after k over the RMS of the 20 ms ending 5 ms before it"""
    a, b = x[k:k + int(0.015 * SR)], x[max(0, k - int(0.025 * SR)):max(0, k - int(0.005 * SR))]
    if len(a) < 16 or len(b) < 16:
        return 0.0
    return float(np.sqrt(np.mean(a * a)) / (np.sqrt(np.mean(b * b)) + 1e-9))


def tonal(mb, i0, i1):
    """is the template mb[i0:i1] a ringing tone: does it match the take itself 5-400 ms later nearly as well as in place?"""
    tpl = mb[i0:i1]
    rest = mb[i0 + int(0.005 * SR):min(len(mb), i1 + int(0.4 * SR))]
    if len(tpl) < 64 or len(rest) < len(tpl) + 2:
        return False
    c = ncc(rest, tpl)
    e = np.concatenate([[0.0], np.cumsum(np.square(rest, dtype=np.float64))])
    loud = (e[len(tpl):] - e[:-len(tpl)]) >= 0.1 * float(np.dot(tpl, tpl))  # the ring itself, not a tail 10 dB down
    return bool(loud.any()) and float(c[loud].max()) >= TONAL_SELF


def locate_tonal(hay, h0, tpl, expect, search, att):
    """locate() for a ringing take: its waveform matches all along the ring (a kalimba's tine, a bell), so among the
    lags within 0.9 of the best correlation (each its own local peak) only those with an attack where the template has
    its own (att samples in) count, and the one nearest the expected time wins. None when no candidate has an attack
    (the caller keeps locate()'s answer)."""
    s0 = int(round((expect - search - h0) * SR))
    s1 = int(round((expect + search - h0) * SR)) + len(tpl)
    lo = max(0, s0)
    seg = hay[lo:min(len(hay), s1)]
    if len(seg) < len(tpl) + 2 or np.linalg.norm(tpl) <= 0:
        return None, 0.0
    c = ncc(seg, tpl)
    best = float(c.max())
    peaks, _ = signal.find_peaks(c, height=0.9 * best)
    own = attack_ratio(tpl, att)
    ar = {int(k): attack_ratio(seg, int(k) + att) for k in peaks}
    top = max(ar.values(), default=0.0)
    # an attack where the template has its own, and among them the clear ones (a lag a few ms after the attack still
    # sees a rise, a smaller one: its window before already holds the note)
    cand = [k for k, r in ar.items() if r >= max(1.5, 0.35 * own, 0.6 * top)]
    if not cand:
        return None, 0.0
    k = min(cand, key=lambda k: abs(h0 + (lo + k) / SR - expect))
    return h0 + (lo + k) / SR, float(c[k])


def locate_attack(hay, h0, tpl, expect, search, att, got):
    """For a weak match that lands on no attack: (time, corr) of the lag nearest `expect` whose correlation is at least
    REPEAT_FRAC x the best one's, or half of it with a clear transient (a 6x rise where the template has its attack)
    while the best lag (`got`) has none (under 1.5x); None when there is no such lag."""
    s0 = int(round((expect - search - h0) * SR))
    lo = max(0, s0)
    seg = hay[lo:min(len(hay), int(round((expect + search - h0) * SR)) + len(tpl))]
    if len(seg) < len(tpl) + 2 or np.linalg.norm(tpl) <= 0:
        return None, 0.0
    c = ncc(seg, tpl)
    best = float(c.max())
    kb = int(round((got - h0) * SR)) - lo
    best_att = attack_ratio(seg, kb + att) if 0 <= kb < len(seg) else 0.0
    peaks, _ = signal.find_peaks(c, height=0.5 * best)
    cand = []
    for k in peaks:
        r = attack_ratio(seg, int(k) + att)
        if c[k] >= REPEAT_FRAC * best and r >= 1.5 or (r >= 6.0 and best_att < 1.5):
            cand.append(int(k))
    if not cand:
        return None, 0.0
    k = min(cand, key=lambda k: abs(h0 + (lo + k) / SR - expect))
    return h0 + (lo + k) / SR, float(c[k])


def effect_rows(plan, root, takes_dir, dec_hp, dec_lo, fps_v, ref_offset, tol_s, strict, sos, sos_lo):
    """each placed effect: where its sync point plays in the delivered audio against its cue frame"""
    sys.path.insert(0, os.path.join(HERE, 'audio'))
    import kit as K
    import score as SC
    p_fps = float(plan['fps'])
    rows = []
    cache = {}

    class Shim:  # the kit as plan_voice reads it: the take files of the plan, read as score.py reads them
        def __init__(self):
            self.roles = {}

        def audio(self, tk):
            if tk['file'] not in cache:
                cache[tk['file']] = K.read_take(os.path.join(takes_dir, tk['file']))
            return cache[tk['file']]

    shim, song = Shim(), types.SimpleNamespace(fps=p_fps)
    locks = read_locks(takes_dir)
    dur_v = len(dec_hp) / SR
    starts = sorted(float(q['start_s']) for q in plan.get('events') or [])
    # every placed effect as score.py plays it (mono, at its gain, in both bands) at its planned start: each effect is
    # looked for with the others taken out, so a long whoosh's tail over a landing, or a swell over a key, cannot
    # hide where that effect really plays (a hidden one only warned 'ambiguous', so a 4-frame slip under it passed)
    played = []
    for q in plan.get('events') or []:
        if not os.path.isfile(os.path.join(takes_dir, q['take'])):
            continue
        try:
            shim.roles = {q['role']: {'takes': [{'file': q['take']}]}}
            xq, sq = SC.plan_voice(shim, q, song)
            mq = (xq.mean(axis=1) if xq.ndim == 2 else xq) * 10 ** (float(q.get('gain_db') or 0.0) / 20)
            played.append((q, int(round((sq - ref_offset) * SR)), signal.sosfiltfilt(sos, mq), signal.sosfiltfilt(sos_lo, mq)))
        except (ValueError, StopIteration, KeyError):  # a take too short to filter, or a role the shim cannot read
            continue
    for p in plan.get('events') or []:
        cue = float(p['f']) / p_fps - ref_offset
        want = float(p.get('sync_s', p['f'] / p_fps)) - ref_offset
        row = dict(f=p['f'], kind=p['kind'], role=p['role'], action=p.get('action'), id=p.get('id'), align=p.get('align', 'onset'),
                   offset_ms=p.get('offset_ms'), take=p['take'], cue_s=round(cue + ref_offset, 4))
        if cue < -0.05 or cue > dur_v + 0.05:
            row['status'] = 'outside'
            rows.append(row)
            continue
        if not os.path.isfile(os.path.join(takes_dir, p['take'])):
            row.update(status='missing', why=f"take {p['take']} not in {takes_dir}")
            rows.append(row)
            continue
        shim.roles = {p['role']: {'takes': [{'file': p['take']}]}}
        x, start = SC.plan_voice(shim, p, song)
        # the sync point is the take file's own (the point the plan placed on the cue), moved by what plan_voice cut
        # from its head; the take as it plays (folded, faded, balanced) is only the template that finds it in the mix
        cut = start - float(p['start_s'])
        lock = locks.get(p['take'])
        sp, sp_lo, sp_hi, rule, pre = sync_point(shim.audio({'file': p['take']}), row['align'], lock)
        if lock is not None and lock.get(f"{row['align']}_s") is not None:
            row['lock_vs_file_ms'] = round((float(lock[f"{row['align']}_s"]) - sp) * 1000, 1)
        row['rule'] = rule
        sp, sp_lo, sp_hi, pre = sp - cut, sp_lo - cut, sp_hi - cut, pre - cut
        m = x.mean(axis=1) if x.ndim == 2 else x
        a0, a1 = (sp - 0.15, sp + 0.10) if row['align'] == 'peak' else (sp - 0.03, sp + 0.20)
        i0, i1 = max(0, int(a0 * SR)), min(len(m), int(a1 * SR))
        seg = m[i0:i1]
        spec = np.abs(np.fft.rfft(seg)) ** 2 if len(seg) > 64 else np.ones(2)
        low = float(spec[:int(150 * len(seg) / SR) + 1].sum() / (spec.sum() + 1e-20)) if len(seg) > 64 else 0.0
        thump = low >= LOW_FRAC
        expect = start - ref_offset + i0 / SR
        # search no further than the nearest other effect (a run of keys or ticks would lend its neighbour), at
        # least 2 frames and at most EFFECT_SEARCH_S
        gap = min([abs(q - float(p['start_s'])) for q in starts if abs(q - float(p['start_s'])) > 1e-4] or [9.0])
        search = min(max(EFFECT_SEARCH_S, 4 * tol_s), max(2 * tol_s, gap - 0.01))
        # a thump is matched in its lows and over 150 Hz, and the clearer band wins (a landing's body sits in the
        # music's bass; its knock above it is what stands clear); every other take over 150 Hz
        best = None
        for band, bsos, hay, lows in ((('lows', sos_lo, dec_lo, True),) if thump else ()) + (('over 150 Hz', sos, dec_hp, False),):
            mb = signal.sosfiltfilt(bsos, m) if i1 - i0 > 64 else m
            tpl = mb[i0:i1] if i1 - i0 > 64 else seg
            w0 = max(0, int((expect - search - 0.25) * SR))
            w1 = min(len(hay), int((expect + search + 0.25) * SR) + len(tpl))
            local = hay[w0:w1]
            others = np.zeros(max(0, w1 - w0))
            for q, qi, qh, ql in played:
                if q is p:
                    continue
                qs = ql if lows else qh
                u0, u1 = max(w0, qi), min(w1, qi + len(qs))
                if u1 > u0:
                    others[u0 - w0:u1 - w0] += qs[u0 - qi:u1 - qi]
            den = float(np.dot(others, others))
            removed = False
            if den > 1e-12:  # the other effects in this stretch, at the gain the master gave them here
                g_o = float(np.dot(local, others)) / den
                if g_o > 0:
                    local, removed = local - g_o * others, True
            got, corr = locate(local, w0 / SR, tpl, expect, search)
            ring = tonal(mb, i0, i1)
            att = int(round((sp - i0 / SR) * SR))
            if ring:  # a ringing take matches all along its ring: the attack places it
                g2, c2 = locate_tonal(local, w0 / SR, tpl, expect, search, att)
                if g2 is not None:
                    got, corr = g2, c2
            elif got is not None and abs(got - expect) > 0.5 * tol_s and corr < FAR_CORR:
                # a short take whose waveform repeats itself (a detent's two clicks, a double tap) or whose air the
                # encoder smears: a weak best match can sit in its own tail, on no attack, while the take's transient
                # plays on the plan; a clear attack where the template has its own, nearer the plan, places it
                g2, c2 = locate_attack(local, w0 / SR, tpl, expect, search, att, got)
                if g2 is not None and abs(g2 - expect) < abs(got - expect):
                    got, corr, ring = g2, c2, 'repeat'
            k = int(round((expect - w0 / SR) * SR))  # the take where the plan put it
            at_plan = float(ncc(local[k:k + len(tpl)], tpl)[0]) if 0 <= k and k + len(tpl) <= len(local) and len(tpl) > 64 else 0.0
            if best is None or corr > best[1]:
                best = (got, corr, at_plan, band, removed, ring)
        got, corr, at_plan, band, removed, ring = best
        row.update(corr=round(corr, 3), corr_at_plan=round(at_plan, 3), search_ms=round(search * 1000, 1), band=band)
        if ring == 'repeat':
            row['repeat'] = True  # placed by its attack: its waveform repeats itself, a lag one repeat away matched as well
        elif ring:
            row['tonal'] = True  # placed by its attack: its waveform matches all along the ring
        if removed:
            row['others_removed'] = True
        if got is None or corr < (0.8 * FOUND_CORR if ring == 'repeat' else FOUND_CORR):  # a clear attack on the plan counts too
            row['status'] = 'not found'
            row['why'] = f'best correlation {corr:.2f} (< {FOUND_CORR}): the music covers it here, or it is not in this mix'
            rows.append(row)
            continue
        meas = got - i0 / SR + sp  # where the sync point plays, video time
        d, d_lo, d_hi = meas - cue, meas - cue + (sp_lo - sp), meas - cue + (sp_hi - sp)
        off = want - cue
        lo, hi = (-tol_s, tol_s) if strict else (min(0.0, off) - tol_s, max(0.0, off) + tol_s)
        ok = d_hi >= lo - 1e-4 and d_lo <= hi + 1e-4  # a peak's plateau only has to touch the window
        row.update(sound_s=round(meas + ref_offset, 4), vs_cue_ms=round(d * 1000, 1), vs_cue_f=round(d * fps_v, 2),
                   vs_plan_ms=round((meas - want) * 1000, 1), window_ms=[round(lo * 1000, 1), round(hi * 1000, 1)])
        if sp_hi - sp_lo > 0.002:
            row['plateau_ms'] = [round(d_lo * 1000, 1), round(d_hi * 1000, 1)]
        if row['align'] == 'onset' and sp - pre > 0.002:  # a pre-roll the listener hears before the onset the plan aligned
            row['heard_from_ms'] = round((d - (sp - pre)) * 1000, 1)
        # a far match that is not clear is only a doubt while the take still matches where the plan put it nearly as
        # well; when it does not, the effect is not there: OFF, however modest the correlation (a whoosh or a thump
        # under the music rarely correlates over 0.7, so a 4-frame slip of one used to pass as 'ambiguous')
        if not ok and abs(meas - want) > 2 * tol_s and corr < FAR_CORR and at_plan >= PLAN_CORR_FRAC * corr:
            row.update(status='ambiguous', why=f'the best match sits {(meas - want) * 1000:+.0f} ms off the plan at correlation '
                                               f'{corr:.2f} (< {FAR_CORR}), {at_plan:.2f} where the plan put it: a neighbour or the music, not a measure')
        else:
            row['status'] = 'OK' if ok else 'OFF'
        rows.append(row)
    return rows


def edited_bed(edit, root):
    """(the edited bed as the film plays it, mono, film time; its end in s): track.py build_bed, bar 1 at film_t0"""
    sys.path.insert(0, os.path.join(HERE, 'audio'))
    import track as TR
    cache = os.path.join(root, 'out', 'cache', 'music')
    end_s = float((edit.get('ending') or {}).get('end_s') or 0) + 4.0
    bed, _ = TR.build_bed(edit, os.path.join(root, 'audio'), n=int(end_s * SR), cache_dir=cache if os.path.isdir(cache) else None)
    return bed.mean(axis=1), end_s


def remove_bed(dec_m, bed_m, shift_s, sos):
    """the decoded audio less the edited bed where it plays (video sample i holds bed sample i + shift), in one band.
    The bed's gain is fitted per 20 ms block (staging, stop-downs, fades and the master move it); the effects are
    uncorrelated with the bed, so a block's fit only ever removes bed, never an effect. A quiet key or tick the
    music covers in the mix stands clear of it here."""
    n = len(dec_m)
    idx = np.arange(n) + int(round(shift_s * SR))
    b = np.zeros(n)
    ok = (idx >= 0) & (idx < len(bed_m))
    b[ok] = bed_m[idx[ok]]
    dh, bh = signal.sosfiltfilt(sos, dec_m), signal.sosfiltfilt(sos, b)
    blk = SR // 50
    nb = n // blk
    if nb < 3:
        return dh
    num = (dh[:nb * blk] * bh[:nb * blk]).reshape(nb, blk).sum(axis=1)
    den = np.square(bh[:nb * blk]).reshape(nb, blk).sum(axis=1)
    g = signal.medfilt(np.where(den > 1e-9, num / np.maximum(den, 1e-12), 0.0), 5)
    return dh - np.interp(np.arange(n), (np.arange(nb) + 0.5) * blk, g) * bh


def bed_rows(bed_m, end_s, edit, cues, dec_hp, fps_v, ref_offset, tol_s, sos):
    """the edited bed against the decoded audio at every act change, structural cue and declared seam"""
    c_fps = float(cues['fps'])
    bm = signal.sosfiltfilt(sos, bed_m)
    level = rms_db(bm[bm != 0]) if np.any(bm) else -240.0
    frames = {}
    for name, act in (cues.get('acts') or {}).items():
        if act.get('from', 0) > 0:
            frames.setdefault(int(round(act['from'])), f'act {name}')
    for e in cues.get('events') or []:
        if e.get('structural'):
            frames.setdefault(int(round(e['f'])), f"structural {e.get('id') or e['kind']}")
    dec = cues.get('declared') or {}
    for s in dec.get('seams') or []:
        frames.setdefault(int(round(s['at'])), f"seam {s.get('id') or s.get('kind')}")
    if dec.get('reveal') is not None:
        frames.setdefault(int(round(dec['reveal'])), 'reveal')
    downs = ((cues.get('music') or {}).get('downbeats') or [])
    t0 = float(edit.get('film_t0') or 0.0)
    rows = []
    dur_v = len(dec_hp) / SR
    for f, what in sorted(frames.items()):
        t = f / c_fps
        tv = t - ref_offset
        if t < t0 + 0.05 or t > end_s - 4.0 or tv < BED_SEARCH_S or tv > dur_v - BED_SEARCH_S - 0.5:
            continue
        i0, i1 = int((t - 0.3) * SR), int((t + 0.5) * SR)
        tpl = bm[i0:i1]
        row = dict(f=f, what=what, t=round(t, 4))
        db = min(downs, key=lambda d: abs(d - f)) if downs else None
        if db is not None and abs(db - f) <= 3:  # a cut on a downbeat: where that attack plays is the cut's hit
            row['downbeat_f'] = db
        if rms_db(tpl) < level - 30:
            row.update(status='quiet', why='the bed is silent or stopped here')
            rows.append(row)
            continue
        got, corr = locate(dec_hp, 0.0, tpl, tv - 0.3, BED_SEARCH_S, near=False)
        row['corr'] = round(corr, 3)
        if got is None or corr < BED_CORR:
            row.update(status='weak', why=f'best correlation {corr:.2f} (< {BED_CORR})')
            rows.append(row)
            continue
        lag = got - (tv - 0.3)
        row.update(status='OK' if abs(lag) <= tol_s + 1e-4 else 'OFF', lag_ms=round(lag * 1000, 1), lag_f=round(lag * fps_v, 2))
        if 'downbeat_f' in row:  # where the track's downbeat attack nearest the cue plays, against the cue frame
            row['downbeat_vs_cue_f'] = round(((row['downbeat_f'] / c_fps + lag) - t) * fps_v, 2)
        rows.append(row)
    return rows


def picture_rows(video, cues, fps_v, ref_offset):
    """the picture's own cut at every act change: the largest frame difference within +-6 frames of the cue"""
    c_fps = float(cues['fps'])
    seams = {int(round(s['at'])): s.get('kind') for s in ((cues.get('declared') or {}).get('seams') or [])}
    rows = []
    for name, act in sorted((cues.get('acts') or {}).items(), key=lambda kv: kv[1].get('from', 0)):
        f = act.get('from', 0)
        if f <= 0:
            continue
        tv = f / c_fps - ref_offset
        n = int(round(tv * fps_v))  # the video frame on which the cue's frame shows
        n0 = n - 7
        if n0 < 0:
            continue
        w, h = 96, 54
        # each decoded frame's own timestamp (showinfo, original timestamps kept) names its frame: a seek's first
        # frame is not trusted
        r = subprocess.run(['ffmpeg', '-v', 'info', '-nostdin', '-ss', f'{n0 / fps_v:.6f}', '-copyts', '-i', video, '-frames:v', '15',
                            '-vf', f'scale={w}:{h},showinfo', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
        fr = np.frombuffer(r.stdout, np.uint8)
        pts = [float(x) for x in re.findall(rb'Parsed_showinfo.*? n: *\d+ .*?pts_time:([-0-9.]+)', r.stderr)]
        nf = len(fr) // (w * h)
        if r.returncode or nf < 4 or len(pts) < nf:
            continue
        idx = [int(round(t * fps_v)) for t in pts[:nf]]
        fr = fr[:nf * w * h].reshape(-1, h, w).astype(np.float32)
        d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))  # d[k]: frame idx[k] -> idx[k + 1]
        k = int(np.argmax(d))
        rest = np.delete(d, k)
        clear = d[k] >= max(6.0, 5.0 * float(np.median(rest)) if len(rest) else 6.0)  # a cut, not a fast move
        cut = idx[k + 1]
        rows.append(dict(act=name, f=f, seam=seams.get(int(round(f))), cue_video_f=round(tv * fps_v, 2), cut_video_f=cut,
                         clear=bool(clear), diff=round(float(d[k]), 2), off_f=round(cut - tv * fps_v, 2)))
    return rows


def default_paths(a, root):
    """(plan, edit, takes) for the frames gate: the arguments, else the project's own files"""
    score = os.path.join(root, 'audio', 'score.json')
    sc = {}
    if os.path.isfile(score):
        try:
            sc = read_json(score)
        except (OSError, json.JSONDecodeError):
            sc = {}
    plan = a.plan or os.path.join(root, 'out', 'qa', 'sfx_plan.json')
    edit = a.edit
    if not edit:
        m = sc.get('music') if isinstance(sc.get('music'), dict) else {}
        cand = [os.path.join(root, m['edit'])] if m.get('edit') else []
        cand.append(os.path.join(root, 'audio', 'music', 'edit.json'))
        edit = next((c for c in cand if os.path.isfile(c)), None)
    takes = a.takes
    if not takes:
        kit = ((sc.get('sfx') or {}) if isinstance(sc.get('sfx'), dict) else {})
        takes = os.path.join(root, kit['takes']) if kit.get('takes') else \
            os.path.splitext(os.path.join(root, kit.get('kit') or 'audio/kit.json'))[0]
    return plan, edit, takes


def cut_frames(cues):
    """(cuts, key state changes) as cue frames: the act changes, the declared seams and the cues the timeline marks as
    cuts; the cues it marks as hits (the product's own moments: a click, a result landing). Within 2 frames: one."""
    sal = cues.get('salience') or {}
    cue = cues.get('cue') or {}
    cuts = [float(v['from']) for v in (cues.get('acts') or {}).values() if isinstance(v, dict) and float(v.get('from', 0)) > 0]
    cuts += [float(x['at']) for x in ((cues.get('declared') or {}).get('seams') or []) if isinstance(x, dict) and x.get('at') is not None]
    cuts += [float(cue[k]) for k, v in sal.items() if v == 'cut' and k in cue and float(cue[k]) > 0]
    keys = [float(cue[k]) for k, v in sal.items() if v == 'hit' and k in cue]

    def merge(xs):
        out = []
        for x in sorted(xs):
            if not out or x - out[-1] > 2:
                out.append(x)
        return out
    total = float(cues.get('total') or 0) or None
    cuts = [x for x in merge(cuts) if total is None or x < total - 1]
    return cuts, [x for x in merge(keys) if x not in cuts]


def onset_at(m, t, tol_s):
    """the biggest rise (dB) in the audio within +-tol_s of t (s): the 15 ms after each 1 ms step over the 20 ms ending
    5 ms before it"""
    a, b = int((t - tol_s) * SR), int((t + tol_s) * SR)
    best = -99.0
    for k in range(max(int(0.025 * SR), a), min(len(m) - int(0.015 * SR), b + 1), SR // 1000):
        r = attack_ratio(m, k)
        if r > 0:
            best = max(best, 20 * np.log10(r))
    return best


def cut_onsets(dec_m, cues, fps, ref_offset, tol_s, sos_lo):
    """the share of cuts (and of key state changes) with an onset in the delivered audio within a frame: the track's hit,
    an effect's attack, any of them. A cut the sound does not mark reads as a slideshow edit."""
    m = signal.sosfilt(sos_lo, dec_m)  # causal: a zero-phase filter rings ahead of a hit and would lend it to the frame before
    cuts, keys = cut_frames(cues)
    out = {}
    for name, frames in (('cuts', cuts), ('key', keys)):
        rows = [dict(f=f, rise_db=round(onset_at(m, f / float(cues['fps']) - ref_offset, tol_s), 1)) for f in frames
                if 0 <= f / float(cues['fps']) - ref_offset <= len(m) / SR]
        hit = [r for r in rows if r['rise_db'] >= ONSET_DB]
        out[name] = dict(n=len(rows), with_onset=len(hit), share=round(len(hit) / len(rows), 3) if rows else None,
                         missing=[r['f'] for r in rows if r['rise_db'] < ONSET_DB])
    return out


def frames_gate(a, report, say, dec, fps_v, has_video):
    cues_path = a.cues or 'out/cues.json'
    cues = read_json(cues_path)
    root = project_root(cues_path)
    plan_path, edit_path, takes = default_paths(a, root)
    fps = fps_v or float(cues['fps'])
    tol_s = a.frame_tol / fps
    sos = signal.butter(4, HP_HZ, btype='highpass', fs=SR, output='sos')
    sos_lo = signal.butter(4, 40.0, btype='highpass', fs=SR, output='sos')
    dec_m = dec.mean(axis=1).astype(np.float64)
    dec_hp = signal.sosfiltfilt(sos, dec_m)
    fr = dict(cues=cues_path, fps=round(fps, 3), cues_fps=cues['fps'], tol_frames=a.frame_tol, tol_ms=round(tol_s * 1000, 2),
              strict=bool(a.strict), fails=[], warnings=[])
    say(f'frames: one frame = {tol_s * 1000:.1f} ms ({fps:g} fps), tolerance +-{a.frame_tol:g} f'
        + (' (strict)' if a.strict else ", a role's planned offset widens its side"))

    # music (first: the bed it rebuilds is taken out of the audio before the effects are looked for)
    bed_m, bed_shift, music_say = None, None, []
    if edit_path and os.path.isfile(edit_path):
        try:
            edit = read_json(edit_path)
            bed_m, end_s = edited_bed(edit, root)
            rows = bed_rows(bed_m, end_s, edit, cues, dec_hp, fps, a.ref_offset, tol_s, sos)
        except Exception as e:  # noqa: BLE001 - a missing track file must not hide the other gates
            rows, bed_m = None, None
            fr['warnings'].append(f'music not measured: {type(e).__name__}: {e}')
            music_say.append(f'music: not measured ({type(e).__name__}: {e})')
        if rows is not None:
            fr['edit'] = edit_path
            fr['music'] = rows
            for r in rows:
                if r['status'] in ('OK', 'OFF'):
                    music_say.append(f"  f={r['f']:>5} {r['what'][:34]:<34} music {r['lag_f']:+6.2f} f ({r['lag_ms']:+7.1f} ms) from the edit"
                                     + (f"; its downbeat {r['downbeat_vs_cue_f']:+.2f} f from the cut" if 'downbeat_vs_cue_f' in r else '')
                                     + f"  corr {r['corr']:.2f}  {r['status']}")
            meas = [r for r in rows if r['status'] in ('OK', 'OFF')]
            off = [r for r in meas if r['status'] == 'OFF']
            if off:
                lags = sorted(r['lag_ms'] for r in off)
                fr['fails'].append(f"the music plays {lags[len(lags) // 2]:+.1f} ms ({lags[len(lags) // 2] / 1000 * fps:+.2f} f) from where "
                                   f"{edit_path} puts it at {len(off)} of {len(meas)} cuts (f " + ', '.join(str(r['f']) for r in off[:8])
                                   + "): render the bed with score.py (bar 1 at the edit's film_t0), never cut the track by hand")
            if rows and not meas:
                fr['warnings'].append('music: no cut could be measured (the bed is quiet or covered at every cut)')
            music_say.append(f"music: {len([r for r in meas if r['status'] == 'OK'])}/{len(meas)} cuts within +-{a.frame_tol:g} f of the edit")
            lags = sorted(r['lag_ms'] for r in meas)
            bed_shift = a.ref_offset - (lags[len(lags) // 2] / 1000 if lags else 0.0)  # video t holds bed film time t + shift
    else:
        music_say.append('music: no edit.json (an effects-only film); music not measured')

    # effects
    if os.path.isfile(plan_path):
        plan = read_json(plan_path)
        if os.path.getmtime(plan_path) + 1 < os.path.getmtime(cues_path):
            fr['warnings'].append(f'{plan_path} is older than {cues_path}: run the soundtrack again (npm run audio)')
        if bed_m is not None and bed_shift is not None:  # look for the effects with the music taken out
            hay_hp, hay_lo = remove_bed(dec_m, bed_m, bed_shift, sos), remove_bed(dec_m, bed_m, bed_shift, sos_lo)
            fr['bed_removed_db'] = round(rms_db(dec_hp) - rms_db(hay_hp), 1)
            say(f"effects: looked for with the edited bed taken out of the audio ({fr['bed_removed_db']:.1f} dB less over 150 Hz)")
        else:
            hay_hp, hay_lo = dec_hp, signal.sosfiltfilt(sos_lo, dec_m)
        rows = effect_rows(plan, root, takes, hay_hp, hay_lo, fps, a.ref_offset, tol_s, a.strict, sos, sos_lo)
        fr['plan'] = plan_path
        fr['effects'] = rows
        meas = [r for r in rows if r['status'] in ('OK', 'OFF')]
        lost = [r for r in rows if r['status'] in ('not found', 'missing', 'ambiguous')]
        for r in rows:
            tag = f"  f={r['f']:>7g} {r['kind']:<7} {r['role'][:22]:<22} {r['align']:<5}"
            if r['status'] in ('OK', 'OFF'):
                say(f"{tag} {r['vs_cue_f']:+6.2f} f vs its cue ({r['vs_cue_ms']:+7.1f} ms; planned offset {r['offset_ms'] or 0:+g} ms, "
                    f"{r['vs_plan_ms']:+.1f} ms off the plan)  corr {r['corr']:.2f}  {r['status']}")
            else:
                say(f"{tag} {r['status']}" + (f": {r['why']}" if r.get('why') else ''))
        off = [r for r in meas if r['status'] == 'OFF']
        for r in off:
            fr['fails'].append(f"{r['kind']} {r['id'] or ''} (role {r['role']}) at f={r['f']:g} plays {r['vs_cue_f']:+.2f} f "
                               f"({r['vs_cue_ms']:+.1f} ms) from its cue frame, outside {r['window_ms']} ms")
        for r in lost:
            fr['warnings'].append(f"{r['kind']} {r['id'] or ''} at f={r['f']:g}: {r['status']}" + (f" ({r['why']})" if r.get('why') else ''))
        stale = {}
        for r in rows:
            if abs(r.get('lock_vs_file_ms') or 0) > 2.0:
                stale.setdefault(r['take'], r['lock_vs_file_ms'])
        for tk, dms in stale.items():
            fr['warnings'].append(f"take {tk}: its lock puts the sync point {dms:+.1f} ms from where the file has it (the take "
                                  f"changed after it was locked: render the kit again, npm run kit, then npm run audio)")
        for r in meas:
            if r.get('heard_from_ms') is not None and r['heard_from_ms'] < -45.0:
                fr['warnings'].append(f"{r['kind']} {r['id'] or ''} at f={r['f']:g}: take {r['take']} is heard from {r['heard_from_ms']:+.0f} ms, "
                                      f"a pre-roll before the onset the plan aligned (a sound leads its picture by at most 45 ms: "
                                      f"cast another take, or trim its head)")
        if rows and len(lost) > max(2, len(rows) // 2):
            fr['fails'].append(f'{len(lost)} of {len(rows)} planned effects cannot be found in the delivered audio: it is not '
                               f'the mix of {plan_path} (render the soundtrack again, then mux it)')
        say(f"effects: {len([r for r in meas if r['status'] == 'OK'])}/{len(meas)} within the window"
            + (f", {len(lost)} not measured" if lost else '') if rows else 'effects: the plan places none')
    else:
        fr['plan'] = None
        say(f'effects: no plan at {plan_path} (a film with effects: npm run audio writes it); effects not measured')

    for line in music_say:
        say(line)

    # cuts and key state changes carry hits: the share with an onset in the audio within a frame
    co = cut_onsets(dec_m, cues, fps, a.ref_offset, tol_s, sos_lo)
    fr['cut_onsets'] = co
    for name, what in (('cuts', 'cuts (act changes, seams)'), ('key', "key state changes (the product's hit cues)")):
        c = co[name]
        if not c['n']:
            continue
        say(f"onsets: {c['with_onset']}/{c['n']} {what} carry an onset within +-{a.frame_tol:g} f ({100 * c['share']:.0f} %)")
        if c['share'] < CUT_ONSET_SHARE:
            fr['warnings'].append(f"only {100 * c['share']:.0f} % of the {what} carry an onset within a frame (house >= {100 * CUT_ONSET_SHARE:.0f} %; "
                                  f"none at f " + ', '.join(f'{x:g}' for x in c['missing'][:10]) + (' ...' if len(c['missing']) > 10 else '')
                                  + ("): cut on the track's own hits (fit the edit to the beat plan: track.py fit), or let an effect "
                                     "mark the seam (a whoosh's apex, a hit)" if name == 'cuts' else
                                     '): give each key state change its sound (sync.ts: the click, the result landing, a toggle)'))

    # picture
    if has_video and a.picture:
        rows = picture_rows(a.video, cues, fps, a.ref_offset)
        fr['picture'] = rows
        for r in rows:
            # a declared seam that is not a hard cut (a zoom through, a morph, a dive) changes most where it moves fastest
            if r['clear'] and r['seam'] in (None, 'hard') and abs(r['off_f']) > a.frame_tol + 1e-6:
                fr['warnings'].append(f"picture: the cut into {r['act']} shows on video frame {r['cut_video_f']}, {r['off_f']:+.2f} f "
                                      f"from its cue (f={r['f']} at {cues['fps']} fps)")
        clear = [r for r in rows if r['clear']]
        if clear:
            say('picture: cuts vs their cue frames ' + ', '.join(f"{r['act']} {r['off_f']:+.1f}" for r in clear) + ' (video frames)')
    fr['pass'] = not fr['fails']
    for w in fr['warnings']:
        say('  warning: ' + w)
    for f_ in fr['fails']:
        say('  FAIL: ' + f_)
    say(f"frames {'OK' if fr['pass'] else 'FAIL'}")
    report['frames'] = fr
    return fr['pass']


def main():
    a = parse_args()
    explicit_source = a.source is not None
    a.source = a.source or 'public/audio/soundtrack.wav'
    report = {'video': a.video, 'source': a.source, 'pass': False}

    def say(msg):
        if not a.quiet:
            sys.stderr.write(msg + '\n')

    def done(ok):
        report['pass'] = bool(ok)
        out = json.dumps(report, indent=1)
        print(out)
        if a.json:
            os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
            with open(a.json, 'w') as fh:
                fh.write(out + '\n')
        say('check-sync PASS' if ok else 'check-sync FAIL')
        sys.exit(0 if ok else 1)

    frames_on = not a.no_frames and (a.cues is not None or os.path.isfile('out/cues.json'))
    if a.cues is not None and not os.path.isfile(a.cues):
        report['error'] = f'missing file: {a.cues}'
        say(report['error'])
        done(False)
    if not os.path.exists(a.video):
        report['error'] = f'missing file: {a.video}'
        say(report['error'])
        done(False)
    lag_on = os.path.exists(a.source)
    if not lag_on and (explicit_source or not frames_on):
        report['error'] = f'missing file: {a.source}'
        say(report['error'])
        done(False)

    sr = sf.info(a.source).samplerate if lag_on else SR
    dec, err = decode_audio(a.video, sr)
    if dec is None:
        report['error'] = 'no decodable audio stream in the video: ' + err
        say(report['error'])
        done(False)

    if lag_on:
        ref, sr = sf.read(a.source, always_2d=True, dtype='float32')
        sync_ok = lag_gate(a, report, say, ref, sr, dec)
        if report.get('error'):
            done(False)
    else:
        sync_ok = True
        report['lag'] = f'skipped: no source WAV at {a.source}'
        say(f'lag: skipped (no source WAV at {a.source})')

    tp = float(20 * np.log10(np.max(np.abs(signal.resample_poly(dec, 4, 1, axis=0))) + 1e-12))
    tp_ok = tp <= a.tp_max
    report.update(true_peak_dbtp=round(tp, 2), tp_max=a.tp_max, true_peak_ok=tp_ok, sync_ok=sync_ok)
    say(f'true peak {tp:.2f} dBTP ' + ('OK' if tp_ok else f'FAIL (above {a.tp_max} dBTP: lower the limiter ceiling)'))

    lufs_ok = True
    try:
        import pyloudnorm as pyln
        lufs = float(pyln.Meter(sr).integrated_loudness(dec.astype(np.float64)))
        report['lufs'] = round(lufs, 2) if np.isfinite(lufs) else None
        if a.lufs is not None:
            lufs_ok = np.isfinite(lufs) and abs(lufs - a.lufs) <= a.lufs_tol
            say(f'loudness {lufs:.2f} LUFS ' + ('OK' if lufs_ok else f'FAIL (target {a.lufs} +-{a.lufs_tol})'))
        else:
            say(f'loudness {lufs:.2f} LUFS')
    except ImportError:
        report['lufs'] = None

    frames_ok = True
    if frames_on:
        fps_v, has_video = video_fps(a.video)
        if sr != SR:
            dec48, err = decode_audio(a.video, SR)
            dec = dec48 if dec48 is not None else dec
        frames_ok = frames_gate(a, report, say, dec, fps_v, has_video)
    else:
        report['frames'] = 'skipped' + (' (--no-frames)' if a.no_frames else ': no out/cues.json (--cues names one)')
    done(sync_ok and tp_ok and lufs_ok and frames_ok)


if __name__ == '__main__':
    main()
