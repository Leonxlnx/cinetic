#!/usr/bin/env python3
"""Decide how many motion-blur samples each frame needs, from how fast things move on screen.

Optical flow on a sharp render gives, per frame, the speed of the fastest moving content. Each
output frame is later rendered as n sub-frames across the shutter (the FilmSub composition) so that
neighbouring samples land at most --step px apart: fast moves smear instead of stamping copies,
and still frames render once. The output (out/samples.json) is passed to FilmSub as --props.

Only motion the flow can vouch for counts, because every over-read costs render time for nothing
(a raw maximum read 2-3x too fast on flat shapes, flashes and repeating grids):
  dense  = the k-th fastest *consistent* moving pixel of Farneback flow: forward and backward flow
           agree there (|fwd + bwd| < 0.5 px + 10%), k = max(--dense-min-px, (1-pct)*consistent);
           the backward flow is computed only when the raw dense read could win
  sparse = the --track-pct percentile of *consistent* corner tracks (pyramidal LK, forward-backward
           error < 1 px, and at least --track-support neighbours moving the same way), not the maximum
  v      = max(dense, sparse) scaled to the source width. A one-frame spike (> --spike x both
           neighbours) stands only when dense and sparse agree within 30%; otherwise it takes the
           larger neighbour, because real motion is smooth at 60 fps
  speed[f] = max(v[f], v[f+1])  (the shutter straddles the frame, so it sees both neighbours' moves)
Then a +-N frame temporal max filter (no n flicker 4 -> 34 -> 4, which reads as strobing blur),
optional floors over known fast ranges and an optional analytic speed track exported from the
timeline (max of both wins).

Cuts. A pair of frames where most pixels change (--cut-frac) and the flow cannot explain the change
(a hard cut, a flash, a full-frame luminance flip) contributes no speed, is listed in `cuts` and
renders with one sample, so its frame never averages the two shots into a double exposure (at an act
boundary src/blur.ts also clamps the samples to the act). A whip pan also changes most pixels, but the flow explains it, so it keeps
its speed. Smaller unexplained changes are listed as suspect_cuts; with --cues, the ones away from
act boundaries are flagged. Below 60 fps the flow falls behind a longer step, so the share it may leave
unexplained rises (1 - (1 - bar) ** (60/fps): cuts 0.75, suspects 0.84 at 30 fps), and a cut also needs a
cut's size: a mean grey change over the suspect bar (--cut-mad x 60/fps), or nearly every pixel changed
(the same rise on --cut-frac: 75 % at 30 fps); a fast morph that is no cut at 60 fps is none at 30.

  n = 1                                           if speed < --still
  n = clamp(ceil(shutter/360 * speed / step), --min, --max)   otherwise
  --budget X  then caps the total at X times the frame count: the fastest frames are trimmed first
              (never below --min), and the capped frames are listed in the log and the JSON.
A frame whose samples would sit more than --step px apart (over the cap, or capped by --budget) gets
a shorter shutter in `shutters` (src/blur.ts reads it), so it draws one clean, shorter streak instead
of stepped copies; --no-short-shutter keeps the full shutter. Frames faster than --too-fast (80 px/f)
are listed as too_fast: blur cannot make them read, so the log asks for a redesign of the move.

--shutter must match SHUTTER in src/blur.ts (180 by default).

Policy (--policy, default auto). Blur is a declared policy (timeline.ts LOOK.blur): 'crisp' keeps flat
graphics sharp, so only frames inside CAMERA_BLUR ranges get samples (one sample everywhere else);
'camera' samples every fast frame (the policy of a timeline written before the declarations). auto
reads `look.blur` from --cues (out/cues.json), else camera. Either way a declared step, flash, hard
seam or act start renders from one sample (cues `declared`, with what the primitives declare), and
too_fast (the redesign list) only applies where the camera policy holds. Under crisp the
speed-ceiling check warns when the frame moves faster than 3000 px/s (at 1080p) for more than 14 f@60:
exponential moves spend only a few frames that fast (an element is above 1200 px/s for about 2-8 f@60;
the whole-frame measure reads wipes and morphs as speed too, hence the wider bound; cut frames and
frames the flow cannot explain are not moves). A fast plateau
(at least three frames, and four at 60 fps, within 15 % of each other above 1200 px/s) is reported as
`speed_plateau` for review, without a warning.

Pace. Every run also reports how fast the film moves (the `pace` block, from the per-pair flow
speed before the shutter and max filters): the median and 90th percentile speed of moving frames,
the share of frames over 12, 25 and 40 px/f, the longest run under 2 px/f (a still hold is fine: the camera is still
unless a shot declares a move, and a still frame renders from one sample), and how many moves pass 40 px/f. --pace calm warns when the 90th percentile passes 25 px/f or more than 6% of frames pass
40 px/f (crisp: 45 px/f, 15%): calm films keep ordinary moves under 25 px/f and save speed for one
or two moments. --copy out/cues.json (or a --cues file that has a copy block) adds the speed inside
each copy entry's reading windows (its `read`: the timeline's READ, so a chain's picture beat is
not a read; [resolved, out) in an older cues.json): the frame should be near still while text is
read, so a median over 3 px/f or a peak over 25 px/f (crisp 40) warns. The pace defaults to the
cues file's `pace`. Run it on a sharp render (a preview, or the speed pass of render.sh --blur):
the numbers are about the design, not the blur.
These judgments are about speed on screen, so they are read per 1/60 s whatever the frame rate: the pace
block, the reading windows and their limits are in px/f@60 (px per frame at 60 fps; a 30 fps film's
per-frame steps count half, px/s = px/f@60 x 60), so the same picture at 30 and at 60 fps gets the same
verdict where the picture moves. Near stillness it is the flow's own floor that reads (measured on a
ui-walkthrough render: 1-3 px a frame at 1080p, by content), and that floor does not shrink with the step:
a 30 fps film's near-still reads come out up to half its 60 fps twin's (a read median of 2.2 against 3.6
px/f@60 there, so a read that warns at 60 fps can pass at 30), and a 1-2 frame peak at 60 fps averages
into one longer step. So do the reads of the flow that assume 60 fps steps: a lower rate's longer step changes more grey
(--cut-mad, the suspect-cut bar, x 60/fps) and an eased move's speed changes more between its frames
(--spike, ** 60/fps), so an ordinary move at 30 fps is neither a suspect cut nor a spike. What a frame's own
blur needs stays per delivered frame (--still, --step, the samples, too_fast: a 180 deg shutter smears half
a frame's step, whatever the rate). A cues file at another rate than the
video (a 30 fps delivery of a 60 fps timeline) is read at the video's rate: its frames are scaled by
video fps / cues fps.

Blind spots (use --floor or --analytic there, and check those frames at 1:1 in the master): an
edge with no 2D structure (a flat band sweeping the full frame reads ~0), a small flat object
jumping more than ~150 px/f at the default analysis width (both trackers lose it), and the first
frame of an object entering from off-frame (the max filter usually covers it).

Usage:
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json --shutter 240 --step 3 --min 4 --max 32 --still 2
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json --floor 1210-1260:16 --analytic out/speed.json
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json --budget 6      # at most 6x the frame count
  python3 scripts/measure-speed.py excerpt.mp4 out/samples.json --offset 600   # excerpt starts at film frame 600
  python3 scripts/measure-speed.py out/preview.mp4 out/qa/speed.json --pace calm --copy out/cues.json

--analytic FILE: JSON {"speed": [px/f per film frame]} or {"ranges": [{"from": a, "to": b, "speed": v}]}
                 (px per frame at output resolution, absolute film frames).
--offset F:      the video starts at film frame F; groups/speed are padded with F still frames so
                 FilmSub indexes them correctly (render.sh --frames uses this).
Writes JSON {groups, speed, offset, frames, fps, width, height, shutter, step, min, max, still,
cuts, suspect_cuts, subframes, multiple, peak, budget, capped, too_fast, short_shutter, shutters?,
fastest_frames, pace (px/f@60), pace_warnings, copy_speed? (px/f@60, frames in the cues' own), ...}. Exit 0 on success (pace warnings included), 1 on
failure.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import time
from fractions import Fraction
from multiprocessing import Pool

import numpy as np

CEIL_PXS = 3000.0  # px/s at 1080p: the crisp speed ceiling (whole-frame flow)
CEIL_F60 = 14  # f@60 a frame may stay above it
PLATEAU_PXS = 1200.0  # px/s: runs above this are checked for flat plateaus (review only)


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    ap.add_argument('video', nargs='?', help='sharp (unblurred) render of the film or an excerpt, or an earlier samples JSON to re-decide groups from its speed track')
    ap.add_argument('out', nargs='?', help='samples JSON to write (e.g. out/samples.json)')
    ap.add_argument('--shutter', type=float, default=180, help='shutter angle in degrees; must match src/blur.ts')
    ap.add_argument('--policy', choices=['auto', 'crisp', 'camera'], default='auto', help="blur policy: auto reads look.blur from --cues (else camera)")
    ap.add_argument('--self-test', action='store_true', help='run the policy checks on a synthetic clip made in code, then exit')
    ap.add_argument('--step', type=float, default=3.0, help='max px between neighbouring samples at output size')
    ap.add_argument('--min', type=int, default=4, help='min samples on a moving frame')
    ap.add_argument('--max', type=int, default=32, help='max samples per frame (32 covers 144 px/f at a 3 px step)')
    ap.add_argument('--still', type=float, default=2.0, help='px/f below which a frame renders once')
    ap.add_argument('--width', type=int, default=960, help='analysis width (height keeps the aspect)')
    ap.add_argument('--mask-thr', type=int, default=6, help='grey-level change that counts as moving')
    ap.add_argument('--dense-pct', type=float, default=99.9, help='dense-flow robust-max percentile')
    ap.add_argument('--dense-min-px', type=int, default=30, help='min pixel count behind the dense robust max')
    ap.add_argument('--track-pct', type=float, default=90, help='percentile of the consistent corner tracks')
    ap.add_argument('--track-support', type=int, default=2, help='neighbouring tracks that must move the same way')
    ap.add_argument('--fb-tol', type=float, default=0.5, help='forward-backward flow error allowed (px at analysis size, + 10%%)')
    ap.add_argument('--spike', type=float, default=1.25, help='a pair this much faster than both neighbours at 60 fps (** 60/fps at another rate) needs both trackers to agree (0 = off)')
    ap.add_argument('--maxfilter', type=int, default=2, help='temporal max filter radius in frames (0 = off)')
    ap.add_argument('--cut-mad', type=float, default=12.0, help='mean grey change of a 60 fps pair above which it may be a cut (x 60/fps at another rate)')
    ap.add_argument('--cut-frac', type=float, default=0.5, help='share of changed pixels above which an unexplained change is a cut')
    ap.add_argument('--budget', type=float, default=0, help='cap total sub-frames at this multiple of the frame count (0 = off)')
    ap.add_argument('--too-fast', type=float, default=80, help='px/f above which a move is flagged for redesign')
    ap.add_argument('--min-shutter', type=float, default=45, help='shortest fallback shutter in degrees')
    ap.add_argument('--no-short-shutter', action='store_true', help='keep the full shutter on frames the samples cannot cover')
    ap.add_argument('--floor', action='append', default=[], help="a-b:n, min samples over frames a..b (repeatable, comma list ok)")
    ap.add_argument('--analytic', help='JSON speed track exported from the timeline (px/f)')
    ap.add_argument('--cues', help='out/cues.json: warn about hard cuts that are not act boundaries')
    ap.add_argument('--pace', choices=['calm', 'crisp'], help="speed limits for the pace report (default: the cues file's pace)")
    ap.add_argument('--copy', help="cues.json with a copy block: the speed inside each text's reading window")
    ap.add_argument('--offset', type=int, default=0, help='film frame index of the first frame of the video')
    ap.add_argument('--workers', type=int, default=max(1, min(4, (os.cpu_count() or 2) // 2)))
    ap.add_argument('--quiet', action='store_true')
    return ap.parse_args()


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,avg_frame_rate,r_frame_rate', '-of', 'json', path], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'measure-speed.py: cannot read {path}: {r.stderr.strip()}')
    s = json.loads(r.stdout)['streams'][0]
    fps = None
    for k in ('avg_frame_rate', 'r_frame_rate'):
        try:
            f = Fraction(s[k])
            if f > 0:
                fps = float(f)
                break
        except (ValueError, ZeroDivisionError):
            pass
    return s['width'], s['height'], fps


CFG = {}


def init_worker(cfg):
    import cv2
    cv2.setNumThreads(1)
    CFG.update(cfg)


def pair_speed(job):
    """Speed (px/f at analysis size) of the move a -> b, plus cut evidence.

    Returns (dense, sparse, mad, resid, frac): the consistent dense speed, the consistent track
    speed, the mean grey change, how much of it the flow leaves unexplained, and the changed share.
    """
    import cv2
    a, b = job
    diff = cv2.absdiff(a, b)
    moving = diff > CFG['mask_thr']
    count = int(moving.sum())
    mad = float(diff.mean())
    frac = count / moving.size
    if count < 20:
        return 0.0, 0.0, mad, 0.0, frac
    h, w = a.shape
    fwd = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 5, 21, 3, 7, 1.5, 0)
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    mx, my = gx + fwd[..., 0], gy + fwd[..., 1]
    mag = np.hypot(fwd[..., 0], fwd[..., 1])

    def kth(values):
        n = len(values)
        if n < CFG['dense_min_px']:
            return 0.0
        k = min(n, max(CFG['dense_min_px'], int(math.ceil(n * (1 - CFG['dense_pct'] / 100.0)))))
        return float(np.partition(values, n - k)[n - k])

    # how much of the change the flow explains: warp b back onto a (for cut detection)
    resid = 1.0
    if mad > CFG['cut_mad'] or frac > CFG['cut_frac']:
        warped = cv2.remap(b, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        resid = float(cv2.absdiff(a, warped).mean()) / max(mad, 1e-6)
    sparse = 0.0
    pts = cv2.goodFeaturesToTrack(a, 600, 0.01, 5, mask=cv2.dilate(moving.astype(np.uint8), None, iterations=4))
    if pts is not None and len(pts) >= 3:
        lk = dict(winSize=(21, 21), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
        nxt, st1, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None, **lk)
        back, st2, _ = cv2.calcOpticalFlowPyrLK(b, a, nxt, None, **lk)
        good = (st1[:, 0] == 1) & (st2[:, 0] == 1) & (np.linalg.norm((back - pts)[:, 0], axis=1) < 1.0)
        p0, vel = pts[good, 0], (nxt - pts)[good, 0]
        if len(p0) >= 3:
            # a track counts only when neighbours (within 64 px) move the same way: one object, not
            # a lone tracker that jumped to a look-alike corner
            sp = np.linalg.norm(vel, axis=1)
            near = np.linalg.norm(p0[:, None] - p0[None], axis=2) < 64
            same = np.linalg.norm(vel[:, None] - vel[None], axis=2) < np.maximum(1.0, 0.15 * sp[:, None])
            support = (near & same).sum(axis=1) - 1
            cons = sp[support >= CFG['track_support']]
            if len(cons) >= 3:
                sparse = float(np.percentile(cons, CFG['track_pct']))

    raw = kth(mag[moving])
    if raw <= max(sparse, 1.0):
        # the dense read cannot win (or the frame is still): skip the backward flow, half the cost
        return raw, sparse, mad, resid, frac
    # forward-backward check: where the flow is real, following it forward and then back returns
    # to the start. Flat interiors, occluded edges and aliased repeats fail it.
    bwd = cv2.calcOpticalFlowFarneback(b, a, None, 0.5, 5, 21, 3, 7, 1.5, 0)
    ex = fwd[..., 0] + cv2.remap(bwd[..., 0], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    ey = fwd[..., 1] + cv2.remap(bwd[..., 1], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    ok = moving & (np.hypot(ex, ey) < CFG['fb_tol'] + 0.1 * mag)
    dense = kth(mag[ok])
    return dense, sparse, mad, resid, frac


def frames(path, W, H):
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo',
                            '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    while True:
        b = dec.stdout.read(W * H)
        if len(b) < W * H:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W)
    dec.wait()


def parse_floors(specs):
    out = []
    for spec in specs:
        for part in spec.split(','):
            part = part.strip()
            if not part:
                continue
            try:
                rng, n = part.split(':')
                a, b = (rng.split('-') + [rng])[:2]
                out.append((int(a), int(b), int(n)))
            except ValueError:
                sys.exit(f'measure-speed.py: bad --floor {part!r} (want a-b:n, e.g. 1210-1260:16)')
    return out


def load_analytic(path, total):
    d = json.load(open(path))
    sp = np.zeros(total)
    if isinstance(d, dict) and 'speed' in d:
        arr = np.asarray(d['speed'], dtype=float)[:total]
        sp[:len(arr)] = arr
    ranges = d.get('ranges', []) if isinstance(d, dict) else d
    for r in ranges or []:
        a, b = int(r['from']), int(r['to'])
        sp[max(0, a):min(total, b + 1)] = np.maximum(sp[max(0, a):min(total, b + 1)], float(r['speed']))
    return sp


def ranges_of(idx, offset=0):
    """[[a, b], ...] runs of consecutive frame indices."""
    out, start = [], None
    for k, i in enumerate(idx):
        if start is None:
            start = i
        if k + 1 == len(idx) or idx[k + 1] != i + 1:
            out.append([start + offset, i + offset])
            start = None
    return out


def measure(a, log, t0):
    """Optical-flow speed per frame of a video: (speed, flow_speed, cuts, suspects, meta)."""
    src_w, src_h, fps = probe(a.video)
    W = min(a.width, src_w) // 2 * 2
    H = int(round(src_h * W / src_w)) // 2 * 2
    scale = src_w / W
    k60 = (fps or 60.0) / 60.0
    # the flow residual is measured wherever a suspect could be called (the bar is --cut-mad x 60/fps, lower above
    # 60 fps): a pair it skips reads resid 1.0, and at 120 fps every pair over 6 grey levels became a suspect cut
    cfg = dict(mask_thr=a.mask_thr, dense_pct=a.dense_pct, dense_min_px=a.dense_min_px, track_pct=a.track_pct,
               track_support=a.track_support, fb_tol=a.fb_tol, cut_mad=min(a.cut_mad, a.cut_mad / k60), cut_frac=a.cut_frac)
    res = []  # per pair (i-1 -> i)
    batch = []
    pool = Pool(a.workers, initializer=init_worker, initargs=(cfg,)) if a.workers > 1 else None
    if pool is None:
        init_worker(cfg)

    def flush():
        if batch:
            res.extend(pool.map(pair_speed, batch) if pool else map(pair_speed, batch))
            batch.clear()
            if len(res) % 240 < 64:
                log(f'  measured {len(res) + 1} frames ({time.time() - t0:.0f}s)')

    n_frames, prev = 0, None
    for f in frames(a.video, W, H):
        n_frames += 1
        if prev is not None:
            batch.append((prev, f))
            if len(batch) >= 64:
                flush()
        prev = f
    flush()
    if pool:
        pool.close()
        pool.join()
    if n_frames == 0:
        sys.exit(f'measure-speed.py: no frames decoded from {a.video}')

    dense = np.array([0.0] + [r[0] for r in res]) * scale
    sparse = np.array([0.0] + [r[1] for r in res]) * scale
    mad = np.array([0.0] + [r[2] for r in res])
    resid = np.array([0.0] + [r[3] for r in res])
    frac = np.array([0.0] + [r[4] for r in res])
    v = np.maximum(dense, sparse)

    # Cuts: most pixels change and the flow cannot explain it (hard cut, flash, full-frame flip).
    # No speed from them: a blur sample cannot help there, and a raw read of one reached 1,187 px/f.
    # Below 60 fps a frame carries a longer step of every move, and the flow falls behind a fast morph (a row growing
    # into a page): what a 60 fps step leaves unexplained compounds over the steps the frame spans, so the residual
    # bars rise to 1 - (1 - bar) ** (60/fps) (cuts 0.75, suspects 0.84 at 30 fps; every cut measured reads 0.9 or
    # more at either rate), and a cut also needs a cut's size there: the suspect bar's mean change or nearly every
    # pixel changed (30 fps, measured: a light morph changed 9-10 grey levels in 53-60 % of the pixels, at 60 fps
    # 13-32 %; every cut of the film 28 or more, or 93 % of the pixels). At 60 fps and above the rules are as they were.
    lo = min(k60, 1.0)
    rise = lambda bar: 1.0 - (1.0 - bar) ** (1.0 / lo)  # noqa: E731  (bar at 60 fps -> bar at this rate)
    frac_all = rise(a.cut_frac)  # 0.5 at 60 fps and above, 0.75 at 30 fps

    def big(i):
        return lo >= 1 or mad[i] > a.cut_mad / k60 or frac[i] > frac_all
    cuts = [i for i in range(1, n_frames) if frac[i] > a.cut_frac and resid[i] > rise(0.5) and big(i)]
    v[cuts] = 0.0
    # Smaller changes the flow cannot explain (floods, flashes on part of the frame) keep their
    # speed, but a hard cut inside an act would let sub-frames straddle it, so those are reported.
    # --cut-mad is a 60 fps frame's change: a frame at a lower rate carries a longer step of the same move
    # (a 30 fps frame twice a 60 fps one), so the bar rises with it and an ordinary move is not a suspect.
    suspects = [i for i in range(1, n_frames) if mad[i] > a.cut_mad / k60 and resid[i] > rise(0.6) and i not in cuts]
    # One-frame spikes: real motion is smooth at 60 fps, so a pair more than --spike x faster than
    # both neighbours stands only when both trackers see it (a peaky whip does; an object entering
    # from off-frame, whose edge the dense flow misreads, does not). Otherwise take the larger neighbour.
    # --spike is the ratio between 60 fps neighbours: an eased move changes speed by --spike ** (60 / fps)
    # between frames at a lower rate (1.56x at 30 fps), and that is no spike.
    if a.spike > 0 and n_frames > 2:
        nb = np.maximum(np.r_[0.0, v[:-1]], np.r_[v[1:], 0.0])
        agree = np.minimum(dense, sparse) >= 0.7 * np.maximum(dense, sparse)
        v = np.where((v > a.spike ** (1.0 / k60) * nb) & ~agree, nb, v)

    raw = v.copy()  # per-pair speed, before the shutter straddle and the max filter: the pace report reads it
    speed = np.array([max(v[i], v[i + 1] if i + 1 < n_frames else 0.0) for i in range(n_frames)])
    if a.maxfilter > 0:
        from scipy.ndimage import maximum_filter1d
        speed = maximum_filter1d(speed, size=2 * a.maxfilter + 1, mode='nearest')
    meta = dict(frames=n_frames, fps=fps, width=src_w, height=src_h, measured_s=round(time.time() - t0, 1), raw=raw)
    return speed, speed.copy(), cuts, suspects, meta


def reuse(a, log):
    """The speed track of an earlier samples JSON, to re-decide groups without measuring again."""
    try:
        d = json.load(open(a.video))
        sp = np.asarray(d['speed'], dtype=float)
    except (OSError, ValueError, KeyError) as e:
        sys.exit(f'measure-speed.py: cannot reuse {a.video}: {e}')
    off = int(d.get('offset', 0))
    if a.offset and a.offset != off:
        sys.exit(f'measure-speed.py: {a.video} starts at frame {off}; --offset {a.offset} does not match')
    a.offset = off
    speed = sp[off:]
    cuts = [c - off for c in d.get('cuts', [])]
    suspects = [c - off for c in d.get('suspect_cuts', [])]
    meta = {k: d.get(k) for k in ('frames', 'fps', 'width', 'height', 'sharp_s_per_frame')}
    meta['frames'] = len(speed)
    meta['raw'] = np.asarray(d['raw_speed'][off:], dtype=float) if d.get('raw_speed') else None
    meta['reused_from'] = a.video
    log(f'  reusing the speed track of {a.video} ({len(speed)} frames)')
    return speed, np.asarray(d.get('flow_speed_track', speed), dtype=float), cuts, suspects, meta


# Speed limits per pace (px/f@60 at output size: px per 1/60 s, whatever the film's frame rate): ordinary moves,
# the share of fast frames, and the frame while text is being read.
F60 = 60.0  # the rate the pace limits are stated at
PACE_LIMITS = {'calm': dict(p90=25.0, over40=0.06, read_median=3.0, read_peak=25.0),
               'crisp': dict(p90=45.0, over40=0.15, read_median=3.0, read_peak=40.0)}


def per60(raw, fps):
    """per-pair speeds (px/f at the film's rate) as px/f@60, the unit of the pace limits: a 30 fps film's steps count half"""
    return np.asarray(raw, dtype=float) * ((fps or F60) / F60)


def pace_report(raw, still, fps):
    """How fast the film moves (raw in px/f@60, per60): moving-frame percentiles, fast-frame shares (of the film's frames,
    so of its time), the longest near-still run (frames at the film's rate, and seconds)."""
    raw = np.asarray(raw, dtype=float)
    moving = raw[raw >= still]
    slow, run, longest, moves, inside = raw < 2.0, 0, 0, 0, False
    for k, sl in enumerate(slow):
        run = run + 1 if sl else 0
        longest = max(longest, run)
        fast = raw[k] > 40
        moves += int(fast and not inside)
        inside = fast
    n = max(1, len(raw))
    return dict(p50=round(float(np.percentile(moving, 50)), 1) if len(moving) else 0.0,
                p90=round(float(np.percentile(moving, 90)), 1) if len(moving) else 0.0,
                over12=round(float((raw > 12).sum()) / n, 3), over25=round(float((raw > 25).sum()) / n, 3),
                over40=round(float((raw > 40).sum()) / n, 3), longest_under2_f=int(longest),
                longest_under2_s=round(longest / fps, 2) if fps else None, moves_over40=int(moves))


def read_windows(c):
    """The frames in which a copy entry is read: its `read` windows (export-cues.ts writes the
    timeline's READ: an earlier fragment of a chain only for its own hold, so a chain's picture beat
    is not a read), or [resolved, out) from a cues.json written before them."""
    read = c.get('read')
    if isinstance(read, list) and all(isinstance(w, (list, tuple)) and len(w) == 2 for w in read):
        return [(int(a), int(b)) for a, b in read]
    return [(int(c['resolved']), int(c.get('out', c['resolved'])))]


def cues_scale(path, fps):
    """video frames per cues frame: video fps / the cues file's fps (1 without either)"""
    try:
        cf = float(json.load(open(path)).get('fps') or 0) if path else 0.0
    except (OSError, ValueError):
        cf = 0.0
    return (fps / cf) if fps and cf else 1.0


def copy_windows(path, raw, offset, limits, kc=1.0):
    """Speed (raw in px/f@60) inside each copy entry's reading windows (its `read` in a cues.json copy block, in the
    cues' frames; kc = video frames per cues frame). Rows keep the cues' frames."""
    try:
        doc = json.load(open(path))
    except (OSError, ValueError) as e:
        sys.exit(f'measure-speed.py: cannot read --copy {path}: {e}')
    rows, warns = [], []
    for c in doc.get('copy') or []:
        for a0, b0 in read_windows(c):
            a, b = max(int(round(a0 * kc)) - offset, 0), min(int(round(b0 * kc)) - offset, len(raw))
            if b - a < 2:
                continue
            seg = np.asarray(raw[a:b], dtype=float)
            row = dict(id=c.get('id'), text=c.get('text'), kind=c.get('kind', 'copy'), frames=[a0, b0],
                       median=round(float(np.median(seg)), 1), peak=round(float(seg.max()), 1),
                       peak_frame=int(round((a + int(np.argmax(seg)) + offset) / kc)))
            rows.append(row)
            if limits and row['kind'] != 'ui' and (row['median'] > limits['read_median'] or row['peak'] > limits['read_peak']):
                warns.append(f"while \"{row['text']}\" is read (f{row['frames'][0]}-{row['frames'][1]}) the frame moves "
                             f"{row['median']} px/f@60 (median), {row['peak']} at f{row['peak_frame']}: keep it under "
                             f"{limits['read_median']:g} px/f@60 with nothing over {limits['read_peak']:g} until the read is done")
    return rows, warns


def declarations(path, kc=1.0):
    """The film's look and declared ranges from a cues.json (timeline declarations plus each
    primitive's declares()), as film-frame sets at the video's rate (kc = video frames per cues frame):
    camera-blur frames and one-sample frames."""
    if not path:
        return None, set(), set()
    try:
        c = json.load(open(path))
    except (OSError, ValueError):
        return None, set(), set()
    look = c.get('look') if isinstance(c.get('look'), dict) else None
    d = c.get('declared') if isinstance(c.get('declared'), dict) else {}
    fx = [x for x in (d.get('fx') or []) if isinstance(x, dict)]

    def items(key):
        return [x for x in (d.get(key) or []) if isinstance(x, dict)] + [y for x in fx for y in (x.get(key) or []) if isinstance(y, dict)]

    v = lambda f: int(round(float(f) * kc))  # noqa: E731  (a cues frame at the video's rate)
    cam, one = set(), set()
    for r in items('cameraBlur'):
        cam |= set(range(v(r['from']), v(r['to'])))
    for r in items('stepped'):
        one |= set(range(v(r['from']), v(r['to'])))
    for x in items('flashes'):
        one |= set(range(v(x['f']), v(x['f']) + max(1, v(x.get('frames', 1)))))
    for sm in items('seams'):
        if sm.get('kind') == 'hard':
            one.add(v(sm['at']))
    if look is not None:  # a declared film: every act starts on one sample
        one |= {v(a['from']) for a in (c.get('acts') or {}).values() if isinstance(a, dict) and 'from' in a}
    return look, cam, one


def self_test():
    """A synthetic crisp film: groups stay 1 outside the camera range, the camera range gets samples,
    too_fast lists only camera frames and a sustained fast move trips the speed ceiling. The same pan at 60 and
    at 30 fps reads one pace and one verdict; a fast morph is no cut at either rate; a card move at 120 fps is no
    suspect cut."""
    import shutil
    import tempfile
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import forensics as F
    tmp = tempfile.mkdtemp(prefix='cinetic-speed-')
    fps, w, h = 30, 480, 270
    A = F.texture(5, w + 2400, h, scale=3, amp=60)
    frames, x = [], 0.0
    for i in range(90):  # 0-29 slow (a 3-frame burst at 20-22), 30-59 fast (a long fast plateau), 60-89 fast again (declared camera range)
        x += 35.0 if 20 <= i < 23 or i >= 30 else 1.0
        frames.append(np.ascontiguousarray(A[:, int(x):int(x) + w]))
    clip = os.path.join(tmp, 'c.mp4')
    F.write_clip(clip, frames, fps)
    cues = dict(fps=fps, total=90, acts=dict(a={'from': 0, 'dur': 90}), look=dict(blur='crisp'),
                declared=dict(seams=[], stepped=[{'from': 10, 'to': 14, 'id': 's'}], flashes=[], cameraBlur=[{'from': 60, 'to': 90, 'id': 'whip'}],
                              end={'from': 0, 'to': 0}))
    cp = os.path.join(tmp, 'cues.json')
    json.dump(cues, open(cp, 'w'))
    out = os.path.join(tmp, 's.json')
    r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, out, '--cues', cp, '--workers', '1', '--quiet'], capture_output=True, text=True)
    bad = 0

    def check(ok, what, detail=''):
        nonlocal bad
        bad += 0 if ok else 1
        print(f"{'pass' if ok else 'FAIL'}  measure-speed self-test: {what}" + (f'  ({detail})' if detail else ''))
    try:
        d = json.load(open(out))
    except (OSError, ValueError):
        print(r.stdout, r.stderr)
        d = {}
    g = d.get('groups', [])
    check(d.get('policy') == 'crisp', 'auto reads the crisp policy from the cues', str(d.get('policy')))
    check(bool(g) and all(v == 1 for v in g[:58]), 'a crisp film renders one sample outside its camera range', str(g[30:40]))
    check(bool(g) and max(g[62:88]) > 1, 'the declared camera range gets blur samples', str(g[62:70]))
    check(all(rr[0] >= 60 for rr in d.get('too_fast', [])), 'too_fast lists only camera-policy frames', str(d.get('too_fast')))
    ce = d.get('speed_ceiling') or []
    check(bool(ce) and all(c['frames'][0] >= 29 for c in ce), 'a long fast run on a crisp film trips the speed ceiling; a 3-frame burst does not', str(ce)[:80])
    check(bool(d.get('speed_plateau')), 'the flat fast stretch is listed as a plateau for review', str(d.get('speed_plateau'))[:80])
    # the same picture at 60 and at 30 fps (every second frame): a pan that eases in and out, held 1 s, twice; the pace,
    # the read window and the verdict match, and no ordinary step of the 30 fps cut reads as a suspect cut
    B = F.texture(9, w + 1600, h, scale=4, amp=60)
    xs, x60 = [], 0.0
    for i in range(240):
        ph = (i % 120) / 60.0  # 2 s cycles: a 1 s eased pan, then a 1 s hold
        x60 += 16.0 * math.sin(math.pi * ph) ** 2 if ph < 1 else 0.0
        xs.append(x60)
    clips = {}
    for r in (60, 30):  # each clip with cues at its own rate; the 30 fps cut also with the 60 fps cues (a decimated delivery)
        fr = [np.ascontiguousarray(B[:, int(xx):int(xx) + w]) for xx in xs[::60 // r]]
        cp_ = os.path.join(tmp, f'pan{r}.mp4')
        F.write_clip(cp_, fr, r)
        cues_r = dict(fps=r, total=len(fr), pace='calm', acts=dict(a={'from': 0, 'dur': len(fr)}),
                      copy=[dict(id='pan', text='A line', read=[[r // 4, 3 * r // 4]])])
        json.dump(cues_r, open(os.path.join(tmp, f'cues{r}.json'), 'w'))
        for c_ in ([60, 30] if r == 30 else [60]):
            o_ = os.path.join(tmp, f'pan{r}-{c_}.json')
            subprocess.run([sys.executable, os.path.abspath(__file__), cp_, o_, '--cues', os.path.join(tmp, f'cues{c_}.json'), '--workers', '1',
                            '--quiet'], capture_output=True, text=True)
            try:
                clips[r if c_ == r else 'dec'] = json.load(open(o_))
            except (OSError, ValueError):
                clips[r if c_ == r else 'dec'] = {}
    p6, p3 = (clips[r].get('pace') or {} for r in (60, 30))
    close = lambda u, v: bool(u) and bool(v) and abs(u - v) <= 0.15 * max(u, v)  # noqa: E731
    check(close(p6.get('p50'), p3.get('p50')) and close(p6.get('p90'), p3.get('p90')) and p3.get('unit') == 'px/f@60',
          'the same pan at 30 fps reads the pace of the 60 fps one (px/f@60)', f"p50 {p6.get('p50')} / {p3.get('p50')}, p90 {p6.get('p90')} / {p3.get('p90')}")
    check(bool(clips[60].get('pace_warnings')) == bool(clips[30].get('pace_warnings')), 'and gets the same calm verdict',
          f"{len(clips[60].get('pace_warnings') or [])} / {len(clips[30].get('pace_warnings') or [])} warnings")
    r6, r3, rd = ((clips[r].get('copy_speed') or [{}])[0] for r in (60, 30, 'dec'))
    check(r3.get('frames') == [7, 22] and close(r6.get('peak'), r3.get('peak')) and close(r6.get('median'), r3.get('median')),
          "a read window is read in the film's own frames and in px/f@60 at either rate", f"{r6} / {r3}")
    check(rd.get('frames') == [15, 45] and close(r6.get('peak'), rd.get('peak')),
          'a 30 fps cut read with the 60 fps cues finds the window at its own frames (cues frames x fps / cues fps)', f'{rd}')
    check(not clips[30].get('suspect_cuts') and not clips[60].get('suspect_cuts'), 'no step of the eased pan is a suspect cut at either rate',
          f"{clips[60].get('suspect_cuts')} / {clips[30].get('suspect_cuts')}")
    # a textured card growing fast from a row into most of the frame (eased over 0.25 s), at 60 and at 30 fps: the
    # flow follows it at 60 fps and falls behind the 30 fps steps; it is a move at both rates, never a cut
    C = F.texture(3, w, h, scale=3, amp=50)
    m60 = []
    for i in range(120):
        p = 0.5 - 0.5 * math.cos(math.pi * min(1.0, max(0.0, (i - 40) / 15.0)))
        cw, ch = int(w * (0.25 + 0.69 * p)), int(h * (0.08 + 0.84 * p))
        img = np.full((h, w, 3), 225, np.uint8)
        img[(h - ch) // 2:(h - ch) // 2 + ch, (w - cw) // 2:(w - cw) // 2 + cw] = C[:ch, :cw]
        m60.append(img)
    morph = {}
    for r in (60, 30):
        cp_ = os.path.join(tmp, f'morph{r}.mp4')
        F.write_clip(cp_, m60[::60 // r], r)
        json.dump(dict(fps=r, total=2 * r, pace='crisp', acts=dict(a={'from': 0, 'dur': 2 * r})), open(os.path.join(tmp, f'mc{r}.json'), 'w'))
        o_ = os.path.join(tmp, f'morph{r}.json')
        subprocess.run([sys.executable, os.path.abspath(__file__), cp_, o_, '--cues', os.path.join(tmp, f'mc{r}.json'), '--workers', '1', '--quiet'],
                       capture_output=True, text=True)
        try:
            morph[r] = json.load(open(o_))
        except (OSError, ValueError):
            morph[r] = {'cuts': ['?']}
    check(all(not morph[r].get('cuts') and not morph[r].get('suspect_cuts') for r in (60, 30)),
          'a fast morph is no cut and no suspect at 60 or at 30 fps (the residual and cut bars rise at the lower rate)',
          f"cuts {morph[60].get('cuts')} / {morph[30].get('cuts')}, suspects {morph[60].get('suspect_cuts')} / {morph[30].get('suspect_cuts')}")
    # 120 fps: the suspect bar falls to 6 grey levels, and the flow residual is measured down to it (a pair it skipped
    # read as unexplained, so an ordinary move was a run of suspect cuts)
    xs120, x1 = [], 0.0
    for i in range(120):
        x1 += 9.0 * math.sin(math.pi * min(1.0, i / 119.0)) ** 2
        xs120.append(x1)
    fr120 = []
    for xx in xs120:  # a textured card a third of the frame, its picture sliding under it, on a flat ground
        img = np.full((h, w, 3), 225, np.uint8)
        img[40:230, 40 + int(0.3 * xx):260 + int(0.3 * xx)] = B[40:230, int(xx):int(xx) + 220]
        fr120.append(img)
    c120 = os.path.join(tmp, 'pan120.mp4')
    F.write_clip(c120, fr120, 120)
    o120 = os.path.join(tmp, 'pan120.json')
    subprocess.run([sys.executable, os.path.abspath(__file__), c120, o120, '--workers', '1', '--quiet'], capture_output=True, text=True)
    try:
        d120 = json.load(open(o120))
    except (OSError, ValueError):
        d120 = {'suspect_cuts': ['?']}
    check(not d120.get('suspect_cuts') and not d120.get('cuts'), 'an eased card move at 120 fps is no suspect cut (25 before)',
          f"suspects {str(d120.get('suspect_cuts'))[:60]}")
    shutil.rmtree(tmp, ignore_errors=True)
    print('measure-speed self-test: ' + ('all pass' if not bad else f'{bad} failed'))
    return 1 if bad else 0


def main():
    a = parse_args()
    if a.self_test:
        sys.exit(self_test())
    if not a.video or not a.out:
        sys.exit('measure-speed.py: a video and an output JSON are required (or --self-test)')
    t0 = time.time()

    def log(msg):
        if not a.quiet:
            sys.stderr.write(msg + '\n')

    if a.video.endswith('.json'):
        speed, flow_speed, cuts, suspects, meta = reuse(a, log)
    else:
        speed, flow_speed, cuts, suspects, meta = measure(a, log, t0)
    n_frames = meta['frames']
    total = a.offset + n_frames
    if a.analytic:
        speed = np.maximum(speed, load_analytic(a.analytic, total)[a.offset:])

    sfrac = a.shutter / 360.0
    groups = [1 if s < a.still else int(min(a.max, max(a.min, math.ceil(sfrac * s / a.step)))) for s in speed]

    # --budget: cap the samples per frame so the total stays <= budget x frames. The fastest frames
    # lose samples first; still frames stay at 1.
    cap = a.max
    budget = None
    capped = []
    if a.budget > 0:
        budget = {'multiple': a.budget, 'cap': None, 'uncapped_subframes': int(sum(groups))}
        while cap > a.min and sum(min(g, cap) for g in groups) > a.budget * n_frames:
            cap -= 1
        if cap < a.max:
            capped = [i for i, g in enumerate(groups) if g > cap]
            groups = [min(g, cap) for g in groups]
            budget['cap'] = cap
        budget['met'] = sum(groups) <= a.budget * n_frames
    floors = parse_floors(a.floor)
    for fa, fb, n in floors:
        for i in range(max(fa - a.offset, 0), min(fb - a.offset, n_frames - 1) + 1):
            groups[i] = max(groups[i], min(n, a.max))

    # Frames faster than the samples can cover would show stepped copies ("ghosts") over a long
    # smear. Unless --no-short-shutter, they get a shorter shutter instead, so the samples stay
    # --step px apart: a shorter, clean streak. Either way the move is too fast; the log says so.
    shutters = [a.shutter] * n_frames
    short = []
    for i, (s, g) in enumerate(zip(speed, groups)):
        if g > 1 and sfrac * s / g > a.step * 1.02:
            short.append(i)
            if not a.no_short_shutter:
                shutters[i] = round(max(a.min_shutter, 360.0 * a.step * g / s), 1)
    # the declared policy: crisp renders one sample outside CAMERA_BLUR ranges; declared steps,
    # flashes, hard seams and act starts always render from one sample
    kc = cues_scale(a.cues, meta.get('fps'))  # video frames per cues frame (a 30 fps delivery of a 60 fps timeline: 0.5)
    look, cam_frames, one_frames = declarations(a.cues, kc)
    policy = a.policy if a.policy != 'auto' else ((look or {}).get('blur') or 'camera')
    camera_at = (lambda i: True) if policy == 'camera' else (lambda i: (i + a.offset) in cam_frames)
    for i in range(n_frames):
        if not camera_at(i) or (i + a.offset) in one_frames:
            groups[i] = 1
            shutters[i] = a.shutter
    short = [i for i in short if groups[i] > 1]
    too_fast = [i for i, s in enumerate(speed) if s > a.too_fast and camera_at(i)]

    # A hard cut renders sharp. Its frame's shutter would otherwise reach back into the outgoing
    # shot (the temporal max filter gives it its neighbours' speed) and average the two shots into
    # one double-exposed frame. At an act boundary src/blur.ts already clamps the samples; inside an
    # act only this keeps the cut clean.
    for c in cuts:
        if 0 <= c < n_frames:
            groups[c] = 1
            shutters[c] = a.shutter
    short = [i for i in short if i not in set(cuts)]

    groups = [1] * a.offset + groups
    sub = int(sum(groups[a.offset:]))
    out = {'groups': groups, 'speed': [0.0] * a.offset + [round(float(s), 1) for s in speed], 'offset': a.offset,
           'frames': n_frames, 'fps': meta.get('fps'), 'width': meta.get('width'), 'height': meta.get('height'),
           'shutter': a.shutter, 'step': a.step, 'min': a.min, 'max': a.max, 'still': a.still,
           'cuts': [c + a.offset for c in cuts], 'suspect_cuts': [c + a.offset for c in suspects],
           'floors': [list(f) for f in floors], 'analytic': bool(a.analytic), 'subframes': sub,
           'multiple': round(sub / n_frames, 2), 'peak': round(float(speed.max()), 1),
           'peak_frame': int(np.argmax(speed)) + a.offset, 'flow_peak': round(float(np.max(flow_speed)), 1),
           'budget': budget, 'capped': ranges_of(capped, a.offset),
           'too_fast': ranges_of(too_fast, a.offset), 'too_fast_px_f': a.too_fast,
           'short_shutter': ranges_of(short, a.offset) if not a.no_short_shutter else [],
           'fastest_frames': [int(i) + a.offset for i in np.argsort(-speed, kind='stable')[:6] if speed[i] >= 12],
           'policy': policy, 'camera_frames': ranges_of(sorted(f - a.offset for f in cam_frames if a.offset <= f < total), a.offset),
           'one_sample': ranges_of(sorted(f - a.offset for f in one_frames if a.offset <= f < total), a.offset)}
    if not a.no_short_shutter and short:
        out['shutters'] = [a.shutter] * a.offset + shutters  # read by src/blur.ts (per-frame shutter)
    for k in ('sharp_s_per_frame', 'reused_from', 'measured_s'):
        if meta.get(k) is not None:
            out[k] = meta[k]

    # Pace: how fast the film moves, and how still the frame is while text is read.
    raw = meta.get('raw')
    raw = np.asarray(speed if raw is None else raw, dtype=float)
    out['raw_speed'] = [0.0] * a.offset + [round(float(x), 1) for x in raw]
    copy_path = a.copy or (a.cues if a.cues and 'copy' in json.load(open(a.cues)) else None)
    pace = a.pace
    if not pace:
        for src in (copy_path, a.cues):
            if src and json.load(open(src)).get('pace') in PACE_LIMITS:
                pace = json.load(open(src))['pace']
                break
    limits = PACE_LIMITS.get(pace)
    fps_v = float(meta.get('fps') or F60)
    raw60 = per60(raw, fps_v)  # the pace and the reads are judged per 1/60 s: the same picture at 30 and 60 fps alike
    rep = pace_report(raw60, a.still, fps_v)
    warns = []
    if limits and rep['p90'] > limits['p90']:
        warns.append(f"90% of moving frames stay under {rep['p90']} px/f@60 ({rep['p90'] * F60:.0f} px/s); a {pace} film keeps "
                     f"ordinary moves under {limits['p90']:g} px/f@60 (longer moves, shorter distances, or the speed in one or two moments)")
    if limits and rep['over40'] > limits['over40']:
        warns.append(f"{100 * rep['over40']:.1f}% of frames move faster than 40 px/f@60 ({rep['moves_over40']} moves); "
                     f"a {pace} film keeps it under {100 * limits['over40']:g}%")
    out['pace'] = dict(rep, unit='px/f@60', fps=fps_v, profile=pace, source='flow' if meta.get('raw') is not None else 'speed track')
    if copy_path:
        rows, cw = copy_windows(copy_path, raw60, a.offset, limits, cues_scale(copy_path, fps_v))
        out['copy_speed'] = rows
        warns += cw
    # speed-ceiling (crisp frames): a whole-frame run above CEIL_PXS for more than CEIL_F60 f@60 warns;
    # plateaus above 1200 px/s are listed for review
    ceiling, plateaus = [], []
    if policy == 'crisp' or cam_frames:
        hgt = meta.get('height') or 1080
        fps_ = meta.get('fps') or 60
        pxs = raw * (1080.0 / hgt) * fps_
        unexplained = {c - a.offset for c in out.get('cuts', []) + out.get('suspect_cuts', [])}  # a cut is not a move
        fast = [i for i in range(len(pxs)) if pxs[i] > PLATEAU_PXS and not camera_at(i) and i not in unexplained]
        runs_, cur = [], []
        for i in fast:
            if cur and i == cur[-1] + 1:
                cur.append(i)
            else:
                if cur:
                    runs_.append(cur)
                cur = [i]
        if cur:
            runs_.append(cur)
        need = CEIL_F60 * fps_ / 60
        plateau_n = max(3, int(round(4 * fps_ / 60)))
        for r_ in runs_:
            seg_ = pxs[r_]
            plateau = len(r_) >= plateau_n and any(max(seg_[j:j + plateau_n]) <= 1.15 * min(seg_[j:j + plateau_n]) for j in range(0, len(r_) - plateau_n + 1))
            if plateau:
                plateaus.append(dict(frames=[r_[0] + a.offset, r_[-1] + a.offset], peak_pxs=round(float(seg_.max()))))
            # the longest stretch of this run above the ceiling speed
            best, cur_, start = (0, 0), 0, 0
            for j, v in enumerate(seg_):
                if v > CEIL_PXS:
                    start = j if cur_ == 0 else start
                    cur_ += 1
                    best = max(best, (cur_, start))
                else:
                    cur_ = 0
            if best[0] > need:
                f0_ = r_[best[1]] + a.offset
                ceiling.append(dict(frames=[f0_, f0_ + best[0] - 1], peak_pxs=round(float(seg_.max())), long=True, plateau=bool(plateau)))
        for c_ in ceiling[:6]:
            warns.append(f"frames {c_['frames'][0]}-{c_['frames'][1]} move faster than {CEIL_PXS:g} px/s for "
                         f"{(c_['frames'][1] - c_['frames'][0] + 1) * 60 / fps_:.0f} f@60 in a crisp film: an exponential move is that fast "
                         'for only a few frames (front-load it, or declare a CAMERA_BLUR range for a camera-real moment)')
    out['speed_ceiling'] = ceiling
    out['speed_plateau'] = plateaus
    out['pace_warnings'] = warns
    if a.cues and (out['suspect_cuts'] or out['cuts']):
        acts = json.load(open(a.cues)).get('acts', {})
        edges = [int(round(int(x['from']) * kc)) for x in acts.values()]
        out['cuts_inside_acts'] = sorted(c for c in out['suspect_cuts'] + out['cuts'] if all(abs(c - e) > 2 for e in edges))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w') as fh:
        json.dump(out, fh)

    g = np.array(groups[a.offset:])
    log(f'{n_frames} frames -> {sub} sub-frames ({sub / n_frames:.1f}x); still {int((g == 1).sum())}, '
        f'2-8: {int(((g > 1) & (g <= 8)).sum())}, 9-24: {int(((g > 8) & (g <= 24)).sum())}, 25+: {int((g > 24).sum())}; '
        f'peak {out["peak"]:.0f} px/f at frame {out["peak_frame"]}; {time.time() - t0:.0f}s')
    if out['cuts']:
        log(f'  cuts (most pixels changed, flow cannot explain it; no speed taken): frames {out["cuts"][:12]}'
            + (' ...' if len(out['cuts']) > 12 else ''))
    if out.get('cuts_inside_acts'):
        log(f'  check frames {out["cuts_inside_acts"][:12]}: large changes the flow cannot explain, away from act '
            'boundaries. Measured hard cuts render with one sample; any other that is a hard cut must become an ACT '
            'boundary, or its sub-frames blend the two shots (floods, flashes and zoom-throughs are fine).')
    if budget and capped:
        worst = float(max(speed[i] for i in capped))
        log(f'  budget {a.budget:g}x: capped {len(capped)} frames at {cap} samples ({budget["uncapped_subframes"]} -> {sub} '
            f'sub-frames); frames {out["capped"][:8]}' + (' ...' if len(out['capped']) > 8 else '')
            + f'; the fastest ({worst:.0f} px/f) keep a {360.0 * a.step * cap / worst:.0f} deg shutter')
    if budget and not budget['met']:
        log(f'  budget {a.budget:g}x cannot be met even at --min {a.min} samples per moving frame')
    if too_fast:
        log(f'  TOO FAST FOR CLEAN BLUR: frames {out["too_fast"][:8]}' + (' ...' if len(out['too_fast']) > 8 else '')
            + f' move faster than {a.too_fast:g} px/f (peak {out["peak"]:.0f} at frame {out["peak_frame"]}). '
            'Blur smears that into a streak with visible copies; redesign the move: cut on the beat, a match cut, '
            'a mask wipe, or a shorter distance (references/transitions.md).')
    if short:
        log(f'  frames {out["short_shutter"][:8] or ranges_of(short, a.offset)[:8]} need more than {cap} samples: '
            + ('they render with a shorter shutter so samples stay %gpx apart (a clean, shorter streak)' % a.step
               if not a.no_short_shutter else 'with --no-short-shutter they will show stepped copies'))
    pr = out['pace']
    log(f'  pace{" (" + pace + ")" if pace else ""}: moving p50 {pr["p50"]} / p90 {pr["p90"]} px/f@60; frames over 12/25/40 px/f@60 '
        f'{100 * pr["over12"]:.0f}/{100 * pr["over25"]:.0f}/{100 * pr["over40"]:.1f}%, {pr["moves_over40"]} moves over 40; '
        f'longest run under 2 px/f@60 {pr["longest_under2_f"]} f ({pr["longest_under2_s"]} s; a still hold is fine, the camera moves only '
        'with a purpose: forensics.py dead-stretch fails only 2.5 s where nothing changes)')
    for row in out.get('copy_speed', []):
        log(f'  read "{row["text"]}" f{row["frames"][0]}-{row["frames"][1]}: median {row["median"]}, peak {row["peak"]} px/f@60')
    for w in warns:
        log(f'  PACE: {w}')
    print(a.out)


if __name__ == '__main__':
    main()
