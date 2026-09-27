#!/usr/bin/env python3
"""Decide how many motion-blur samples each frame needs, from how fast things move on screen.

Optical flow on a sharp render gives, per frame, the speed of the fastest moving content. Each
output frame is later rendered as n sub-frames across the shutter (the FilmSub composition) so that
neighbouring samples land at most --step px apart: fast moves smear instead of stamping copies,
and still frames render once. The output (out/samples.json) is passed to FilmSub as --props.

Robust-max statistics, because percentiles under-read small fast objects (a dot, a caret, a word)
by ~2x and that is exactly where stamped copies show:
  dense  = the k-th fastest moving pixel of Farneback flow, k = max(--dense-min-px, (1-pct)*moving)
  sparse = the --track-rank-th fastest corner track (pyramidal LK, forward-backward error < 1 px)
  v      = max(dense, sparse) scaled to the source width
  speed[f] = max(v[f], v[f+1])  (the shutter straddles the frame, so it sees both neighbours' moves)
Then a +-N frame temporal max filter (no n flicker 4 -> 34 -> 4, which reads as strobing blur),
optional floors over known fast ranges and an optional analytic speed track exported from the
timeline (max of both wins). Changes the flow cannot explain (hard cuts, floods, flashes) keep
their speed and are listed as suspect_cuts; with --cues, ones away from act boundaries are flagged,
because sub-frames only stay on one side of a cut when the cut is an act boundary (src/blur.ts).

  n = 1                                           if speed < --still
  n = clamp(ceil(shutter/360 * speed / step), --min, --max)   otherwise

--shutter must match SHUTTER in src/blur.ts (240 by default).

Blind spots (use --floor or --analytic there, and check those frames at 1:1 in the master): an
edge with no 2D structure (a flat band sweeping the full frame reads ~0), and a small flat object
jumping more than ~150 px/f at the default analysis width (both trackers lose it). The robust max
over-reads flat regions near edges at times; that only costs render time.

Usage:
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json --shutter 240 --step 3 --min 4 --max 48 --still 2
  python3 scripts/measure-speed.py sharp.mp4 out/samples.json --floor 1210-1260:16 --analytic out/speed.json
  python3 scripts/measure-speed.py excerpt.mp4 out/samples.json --offset 600   # excerpt starts at film frame 600

--analytic FILE: JSON {"speed": [px/f per film frame]} or {"ranges": [{"from": a, "to": b, "speed": v}]}
                 (px per frame at output resolution, absolute film frames).
--offset F:      the video starts at film frame F; groups/speed are padded with F still frames so
                 FilmSub indexes them correctly (render.sh --frames uses this).
Writes JSON {groups, speed, offset, frames, fps, width, height, shutter, step, min, max, still,
suspect_cuts, subframes, peak, ...}. Exit 0 on success, 1 on failure.
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


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video', help='sharp (unblurred) render of the film or an excerpt')
    ap.add_argument('out', help='samples JSON to write (e.g. out/samples.json)')
    ap.add_argument('--shutter', type=float, default=240, help='shutter angle in degrees; must match src/blur.ts')
    ap.add_argument('--step', type=float, default=3.0, help='max px between neighbouring samples at output size')
    ap.add_argument('--min', type=int, default=4, help='min samples on a moving frame')
    ap.add_argument('--max', type=int, default=48, help='max samples per frame')
    ap.add_argument('--still', type=float, default=2.0, help='px/f below which a frame renders once')
    ap.add_argument('--width', type=int, default=960, help='analysis width (height keeps the aspect)')
    ap.add_argument('--mask-thr', type=int, default=6, help='grey-level change that counts as moving')
    ap.add_argument('--dense-pct', type=float, default=99.9, help='dense-flow robust-max percentile')
    ap.add_argument('--dense-min-px', type=int, default=30, help='min pixel count behind the dense robust max')
    ap.add_argument('--track-rank', type=int, default=2, help='use the n-th fastest corner track (2 rejects one outlier)')
    ap.add_argument('--maxfilter', type=int, default=2, help='temporal max filter radius in frames (0 = off)')
    ap.add_argument('--cut-mad', type=float, default=12.0, help='mean grey change above which a pair may be a hard cut')
    ap.add_argument('--floor', action='append', default=[], help="a-b:n, min samples over frames a..b (repeatable, comma list ok)")
    ap.add_argument('--analytic', help='JSON speed track exported from the timeline (px/f)')
    ap.add_argument('--cues', help='out/cues.json: warn about hard cuts that are not act boundaries')
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
    """Speed (px/f at analysis size) of the move a -> b, plus cut evidence."""
    import cv2
    a, b = job
    diff = cv2.absdiff(a, b)
    moving = diff > CFG['mask_thr']
    count = int(moving.sum())
    mad = float(diff.mean())
    if count < 20:
        return 0.0, 0.0, mad, 0.0
    flow = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 5, 21, 3, 7, 1.5, 0)
    mag = np.hypot(flow[..., 0], flow[..., 1])[moving]
    k = max(CFG['dense_min_px'], int(math.ceil(count * (1 - CFG['dense_pct'] / 100.0))))
    k = min(k, count)
    dense = float(np.partition(mag, count - k)[count - k])
    # how much of the change the flow explains: warp b back onto a (for cut detection)
    resid = 1.0
    if mad > CFG['cut_mad']:
        h, w = a.shape
        gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
        warped = cv2.remap(b, gx + flow[..., 0], gy + flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        resid = float(cv2.absdiff(a, warped).mean()) / max(mad, 1e-6)
    sparse = 0.0
    pts = cv2.goodFeaturesToTrack(a, 600, 0.01, 5, mask=cv2.dilate(moving.astype(np.uint8), None, iterations=4))
    if pts is not None and len(pts) >= 2:
        lk = dict(winSize=(21, 21), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
        fwd, st1, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None, **lk)
        back, st2, _ = cv2.calcOpticalFlowPyrLK(b, a, fwd, None, **lk)
        ok = (st1[:, 0] == 1) & (st2[:, 0] == 1) & (np.linalg.norm((back - pts)[:, 0], axis=1) < 1.0)
        mags = np.sort(np.linalg.norm((fwd - pts)[ok, 0], axis=1))[::-1]
        if len(mags) >= 2:
            sparse = float(mags[min(CFG['track_rank'], len(mags)) - 1])
    return dense, sparse, mad, resid


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


def main():
    a = parse_args()
    t0 = time.time()
    src_w, src_h, fps = probe(a.video)
    W = min(a.width, src_w) // 2 * 2
    H = int(round(src_h * W / src_w)) // 2 * 2
    scale = src_w / W
    cfg = dict(mask_thr=a.mask_thr, dense_pct=a.dense_pct, dense_min_px=a.dense_min_px, track_rank=a.track_rank,
               cut_mad=a.cut_mad)

    res = []  # per pair (i-1 -> i)
    prev = None
    batch = []

    def log(msg):
        if not a.quiet:
            sys.stderr.write(msg + '\n')

    pool = Pool(a.workers, initializer=init_worker, initargs=(cfg,)) if a.workers > 1 else None
    if pool is None:
        init_worker(cfg)

    def flush():
        if batch:
            res.extend(pool.map(pair_speed, batch) if pool else map(pair_speed, batch))
            batch.clear()
            if len(res) % 240 < 64:
                log(f'  measured {len(res) + 1} frames ({time.time() - t0:.0f}s)')

    n_frames = 0
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
    v = np.maximum(dense, sparse)

    # Big changes the flow cannot explain: hard cuts, floods, flashes. Their speed is kept (a flat
    # flood edge really is fast; over-sampling a true cut only costs render time), but a hard cut
    # inside an act would let sub-frames straddle it, so those are reported.
    suspects = [i for i in range(1, n_frames) if mad[i] > a.cut_mad and resid[i] > 0.6]

    speed = np.array([max(v[i], v[i + 1] if i + 1 < n_frames else 0.0) for i in range(n_frames)])
    if a.maxfilter > 0:
        from scipy.ndimage import maximum_filter1d
        speed = maximum_filter1d(speed, size=2 * a.maxfilter + 1, mode='nearest')

    total = a.offset + n_frames
    flow_speed = speed.copy()
    if a.analytic:
        an = load_analytic(a.analytic, total)[a.offset:]
        speed = np.maximum(speed, an)

    frac = a.shutter / 360.0
    groups = [1 if s < a.still else int(min(a.max, max(a.min, math.ceil(frac * s / a.step)))) for s in speed]
    floors = parse_floors(a.floor)
    for fa, fb, n in floors:
        for i in range(max(fa - a.offset, 0), min(fb - a.offset, n_frames - 1) + 1):
            groups[i] = max(groups[i], min(n, a.max))

    groups = [1] * a.offset + groups
    speed_all = [0.0] * a.offset + [round(float(s), 1) for s in speed]
    out = {'groups': groups, 'speed': speed_all, 'offset': a.offset, 'frames': n_frames, 'fps': fps,
           'width': src_w, 'height': src_h, 'shutter': a.shutter, 'step': a.step, 'min': a.min, 'max': a.max,
           'still': a.still, 'suspect_cuts': [c + a.offset for c in suspects], 'floors': [list(f) for f in floors],
           'analytic': bool(a.analytic), 'subframes': int(sum(groups[a.offset:])), 'peak': round(float(speed.max()), 1),
           'peak_frame': int(np.argmax(speed)) + a.offset, 'flow_peak': round(float(flow_speed.max()), 1)}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w') as fh:
        json.dump(out, fh)
    g = np.array(groups[a.offset:])
    log(f'{n_frames} frames -> {out["subframes"]} sub-frames ({out["subframes"] / n_frames:.1f}x); still {int((g == 1).sum())}, '
        f'2-8: {int(((g > 1) & (g <= 8)).sum())}, 9-24: {int(((g > 8) & (g <= 24)).sum())}, 25+: {int((g > 24).sum())}; '
        f'peak {out["peak"]:.0f} px/f at frame {out["peak_frame"]}; {time.time() - t0:.0f}s')
    if a.cues and out['suspect_cuts']:
        acts = json.load(open(a.cues)).get('acts', {})
        edges = [int(x['from']) for x in acts.values()]
        inside = [c for c in out['suspect_cuts'] if all(abs(c - e) > 2 for e in edges)]
        out['cuts_inside_acts'] = inside
        with open(a.out, 'w') as fh:
            json.dump(out, fh)
        if inside:
            log(f'  check frames {inside[:12]}: large changes the flow cannot explain, away from act boundaries. If any is a '
                f'hard cut, make it an ACT boundary so sub-frames never straddle it (floods and flashes are fine).')
    if out['peak'] > a.max * a.step / frac:
        log(f'  note: peak speed needs more than --max {a.max} samples for a {a.step}px step; the fastest frames '
            f'will smear with ~{out["peak"] * frac / a.max:.0f}px gaps (raise --max or slow the move)')
    print(a.out)


if __name__ == '__main__':
    main()
