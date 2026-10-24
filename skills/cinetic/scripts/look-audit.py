#!/usr/bin/env python3
"""look-audit.py: the rendered look, and the measured floor against a flat film.

Usage:
  python3 scripts/look-audit.py out/film.mp4 --cues out/cues.json --json out/qa/look.json
  python3 scripts/look-audit.py out/film.mp4 --cues out/cues.json --layout out/qa/layout-Film.json --tokens src/brand/tokens.ts
  python3 scripts/look-audit.py out/clip.mp4 --trajectory --roi 600,400,720,200 --accent '#08965A' [--target t.json]
  python3 scripts/look-audit.py --self-test

It measures the frames, not the source: colour clusters, the ground and the ink, how much moves and
how, where the cuts fall and what they carry. Speeds are px/s at a 1080-high frame (analysis at
--width, default 480; 960 for finer reads), scale rates %/s. Frames are absolute (frame = t * fps).

Look checks (warn unless marked fail):
  hue-count       saturated pixels (OKLab C >= 0.06, >= 0.2 % of the frame on >= 3 samples) grouped by
                  hue across the film: 2 groups more than 30 degrees apart warn, 3 or more fail. One
                  accent family; imagery is excluded with --imagery
  banned-hue      fail: saturated colour in a banned region (orange/amber, beige/cream, purple/violet,
                  neon) on >= 0.5 % of the frame for >= 3 samples, unless it is a brand-supplied colour
                  (tokens lines marked cinetic:brand-supplied, or --brand). Brand colours are checked
                  only for contrast (here: none) and the one-accent rule (hue-count still counts them)
  accent-share    the accent covers more than 8 % of the frame outside one flood (a run <= 2 s)
  tinted-ink      pure #000 ink or ground on more than 10 % of samples; a pure #FFF ground without
                  LOOK.whiteWorld (brand-supplied black or white excepted)
  negative-space  in reading windows the non-ground share has a median over 30 %, or a dense run
                  (> 30 %) lasts more than 6 s
  living-ground   the camera stands still for more than 0.8 s while the ground does not change either
                  (outside the end lock)
  clean-finish    grain on flat ground over 0.6 L* (full-resolution samples) or a vignette over 2 %
                  unless LOOK.texture is not 'clean'
  type-size       (--layout) cap height off its role's band (caption 2.3-4 %, statement 5-9 %, hero
                  11-23 %, giant 40-90 % of the frame height), more than 2 non-UI sizes at once, a
                  statement wider than 61 % of the frame (a payoff 84 %)
  luminance-flip  the stage flips light/dark by a hard cut with nothing moving across it, or flips
                  twice inside one bar
  blur-policy     LOOK.blur 'crisp': fast-moving structure (> 600 px/s) keeps under 80 % of its still
                  sharpness on more than 30 % of fast frames outside CAMERA_BLUR ranges
  word-first-frame, fade-detect, arrival-front-load  (--layout + cues copy) a word reaches 30 % of its
                  contrast within 2 f@60 of showing and 90 % within 18 f@60; a contrast ramp longer
                  than 12 f@60 with the text barely moving is a fade (in, or out on a statement); an
                  arrival puts >= 20 % of its change in the first 10 % of its time
  image-develop   imagery that arrives at full colour in one frame, more often than it develops from a
                  tint (12-52 f@60): a review hint, warn only

The floor against a flat film (fail; the ship gate). Body = outside the end lock (cues `declared.end`;
without one, all but the last 2 s):
  floor-moving    the camera or the ground moves on >= 90 % of body frames (camera fit >= 6 px/s or
                  >= 1 %/s, the flat ground changing as light moves over it, or a layer carrying at least
                  a quarter of the frame's structure moving >= 6 px/s)
  floor-depth     >= 2 depth planes moving at different rates (a plane the camera move does not
                  explain, moving >= 6 px/s, while the camera moves) in >= 50 % of shots
  floor-carried   carried seams >= 40 % of all seams, to the nearest seam (declared kinds velocity,
                  morph, breath, zoomThrough, whip, snapZoom, mask, wipe, defocus; an undeclared cut
                  counts when motion keeps its direction across it, >= 30 px/s on both sides, or the
                  scale keeps moving, >= 1 %/s on both sides)
  floor-device    something designed happens at least every 3 s (a seam, a declared step, flash or
                  camera-blur range, a move peaking over 600 px/s, a light event, a zoom over 8 %/s,
                  three or more regions launching in the same frame)
  floor-light     one light event per act (the ground brightening or dimming, light moving over the
                  ground, a declared light seam)
  floor-scale     the scale of the content contrasts (x1.5 in element height, or x2 in coverage)
                  between consecutive shots on >= 30 % of cuts
  A one-take film (LOOK.oneTake, or no cut) is judged on 2 s segments and has no seam or cut items.

Trajectory (--trajectory, the one-hue gate): the colour of a region over time keeps the accent's hue
(within --hue-tol degrees wherever C >= 0.03) and, with --target (JSON {"L": [...], "C": [...]} per
frame, or {"bounds": {"L": [lo, hi], "C": [lo, hi]}}), follows its lightness and chroma within --tol.

Measures (for scripts/grammar-score.mjs): shots, cuts, starts per second (a region of 64 px tiles that
begins to move faster than 30 px/s after resting 0.25 s; starts within 0.35 s of each other count
once), concurrency (moving regions at once), idle share, living holds, seams, cut sync against the
audio's own onsets (a cut within 1 f of an onset, the picture leading by up to 3 f; and within
100 ms), colour bands. A film with no or one hard cut is a one-take film.

Writes JSON (--json) and a summary. Exit 0 no fail, 1 a fail, 2 usage or decode error.
Needs ffmpeg/ffprobe, numpy and opencv-python (forensics.py next to it supplies the motion probe).
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys

sys.dont_write_bytecode = True  # no __pycache__ in the project's scripts/

CARRIED = ('velocity', 'morph', 'breath', 'zoomThrough', 'whip', 'snapZoom', 'mask', 'wipe', 'defocus')
LIGHT_KINDS = ('light',)
ONSET_TILES = 2  # tiles a region needs before its start counts
START_MERGE = 0.35  # s: region starts closer than this are one start (a house film runs about 2.3 starts a second)
MOVING_LAYER = 0.25  # a layer moving with this share of the frame's structure counts as moving ground
CARRY_PXS = 30.0  # px/s on both sides of an undeclared cut, same direction (cos >= 0.7): speed carried across
CARRY_ZOOM = 1.0  # %/s of zoom on both sides (the living-creep bound): scale carried across
DEVICE_PXS = 600.0  # a move peaking faster than this (px/s at 1080p) is a designed beat
DEVICE_ZOOM = 8.0  # %/s: a snap of scale
DEVICE_BURST = 3  # regions starting in the same frame: a coordinated launch
M1 = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]]
M2 = [[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]]


def die(msg):
    print(f'look-audit: {msg}', file=sys.stderr)
    sys.exit(2)


# ------------------------------------------------------------------------------------------
# colour
# ------------------------------------------------------------------------------------------
def oklab(rgb8):
    """OKLab L, a, b planes of an RGB uint8 image (or an (n, 3) array)."""
    x = rgb8.astype(np.float32) / 255.0
    lin = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
    lms = np.cbrt(lin @ np.array(M1, np.float32).T)
    lab = lms @ np.array(M2, np.float32).T
    return lab[..., 0], lab[..., 1], lab[..., 2]


def hex_rgb(h):
    h = h.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def lch_of_hex(h):
    L, a, b = oklab(np.array([hex_rgb(h)], np.uint8))
    return float(L[0]), float(math.hypot(a[0], b[0])), float(math.degrees(math.atan2(b[0], a[0])) % 360)


def banned_mask(L, C, H):
    """The banned OKLCH regions (the same numbers as lint-film.mjs and palette.py)."""
    yellow = (H >= 96) & (H < 118)
    neon = np.where(yellow, (L >= 0.91) & (C >= 0.15), ((L >= 0.85) & (C >= 0.15)) | ((L >= 0.80) & (C >= 0.18))) | (C >= 0.27)
    beige = (H >= 31) & (H < 118) & (L >= 0.70) & (C >= 0.007) & (C < 0.10)
    orange = (H >= 31) & (H < 96) & (C >= 0.05)
    purple = (H >= 270) & (H < 340) & (C >= 0.02)
    return neon | beige | orange | purple


def hue_groups(L, C, H, min_c=0.06, min_frac=0.002, merge=30.0):
    """Saturated pixels grouped by hue: [{h, share, L, C}] (circular runs of a 5-degree histogram,
    merged when their centres sit within `merge` degrees)."""
    sat = C >= min_c
    n = sat.size
    if sat.sum() < min_frac * n:
        return []
    h = H[sat]
    hist = np.bincount((h // 5).astype(int) % 72, minlength=72).astype(np.float64)
    sm = (np.roll(hist, 1) + 2 * hist + np.roll(hist, -1)) / 4
    on = sm > max(1.0, 0.0002 * n)
    if on.all():
        on[int(np.argmin(sm))] = False
    start = int(np.argmin(on)) if not on.all() else 0
    groups, cur = [], []
    for k in range(72):
        i = (start + k) % 72
        if on[i]:
            cur.append(i)
        elif cur:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    out = []
    for g in groups:
        mass = hist[g].sum()
        if mass < min_frac * n:
            continue
        ang = np.radians(np.array(g) * 5 + 2.5)
        hc = math.degrees(math.atan2((hist[g] * np.sin(ang)).sum(), (hist[g] * np.cos(ang)).sum())) % 360
        out.append(dict(h=round(hc, 1), share=round(float(mass / n), 4)))
    merged = []
    for g in sorted(out, key=lambda x: -x['share']):
        near = next((m for m in merged if min(abs(m['h'] - g['h']), 360 - abs(m['h'] - g['h'])) <= merge), None)
        if near:
            near['share'] = round(near['share'] + g['share'], 4)
        else:
            merged.append(dict(g))
    return merged


def ground_of(rgb8):
    """The stage colour: the most common 16-level colour bin, averaged."""
    q = (rgb8 >> 4).astype(np.int32)
    key = (q[..., 0] << 8) | (q[..., 1] << 4) | q[..., 2]
    best = int(np.bincount(key.ravel()).argmax())
    sel = key == best
    return rgb8[sel].reshape(-1, 3).mean(0), float(sel.mean())


# ------------------------------------------------------------------------------------------
# inputs
# ------------------------------------------------------------------------------------------
def brand_colours(tokens_path, extra):
    """Accent and brand-supplied colours from a tokens file (lines or a leading comment marked
    cinetic:brand-supplied) plus --brand hex values."""
    accent, brand = None, [x.strip() for x in (extra or '').split(',') if x.strip()]
    if tokens_path and os.path.exists(tokens_path):
        src = open(tokens_path, encoding='utf-8').read()
        head = src[:max(0, len(src) - len(src.lstrip()))] + src.split('\n\n')[0]
        whole = 'cinetic:brand-supplied' in head
        lines = src.split('\n')
        for i, line in enumerate(lines):
            for m in re.finditer(r"['\"]?([\w-]+)['\"]?\s*:\s*['\"](#[0-9a-fA-F]{6})['\"]", line):
                if m.group(1) == 'accent':
                    accent = m.group(2)
                if whole or 'cinetic:brand-supplied' in line or (i and 'cinetic:brand-supplied' in lines[i - 1]):
                    brand.append(m.group(2))
    return accent, brand


def load_layout(path):
    if not path:
        return None
    try:
        return json.load(open(path))
    except (OSError, ValueError) as e:
        die(f'cannot read --layout {path}: {e}')


def audio_onsets(path, fps):
    """Onset times (s) of the video's own audio: spectral flux peaks on a 22.05 kHz mono decode."""
    try:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    x = np.frombuffer(raw, np.float32)
    if len(x) < 22050 // 2 or float(np.abs(x).max()) < 1e-4:
        return None
    hop, n = 256, 1024
    frames = 1 + (len(x) - n) // hop
    if frames < 8:
        return None
    win = np.hanning(n).astype(np.float32)
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(spec * 10), axis=0)).sum(1)
    flux = np.concatenate([[0], flux])
    t = (np.arange(frames) * hop + n / 2) / 22050  # the window's centre: an attack is detected as it enters
    k = 8
    med = np.array([np.median(flux[max(0, i - k):i + k + 1]) for i in range(frames)])
    thr = med + 1.5 * np.std(flux)
    peaks = [i for i in range(1, frames - 1) if flux[i] > thr[i] and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]]
    out, last = [], -1.0
    for i in peaks:
        if t[i] - last >= 0.05:
            out.append(round(float(t[i]), 4))
            last = t[i]
    return out


# ------------------------------------------------------------------------------------------
# the measurement pass
# ------------------------------------------------------------------------------------------
def measure(args, info, F, accent, brand, layout, cues):
    fps = info['fps']
    W = min(args.width, info['w']) // 2 * 2
    H = int(round(info['h'] * W / info['w'])) // 2 * 2
    probe_m = F.MotionProbe(fps, W, H, tiles=True)
    cstep = max(1, int(round(fps / 2)))
    acc_lab = None
    if accent:
        L0, a0, b0 = oklab(np.array([hex_rgb(accent)], np.uint8))
        acc_lab = np.array([L0[0], a0[0], b0[0]], np.float32)
    brand_lab = [np.array([v[0] for v in oklab(np.array([hex_rgb(b)], np.uint8))], np.float32) for b in brand]
    imagery = []
    for spec in args.imagery or []:
        x, y, w, h = [float(v) for v in spec.split(',')]
        k = W / info['w']
        imagery.append((int(x * k), int(y * k), int(w * k), int(h * k)))
    # text regions (layout boxes at each COPY entry's resolved frame), for the word checks
    rois = {}
    if layout and cues:
        boxes = {}
        for fr in layout.get('boxes', []):
            for b in fr.get('boxes', []):
                boxes.setdefault(b['id'], []).append((fr['frame'], b))
        for c in cues.get('copy', []):
            cid = c.get('id')
            cand = boxes.get(cid) or boxes.get(str(cid).split('.')[0])
            if not cand:
                continue
            fr, b = min(cand, key=lambda x: abs(x[0] - c['resolved']))
            text = (c.get('text') or '').strip()
            first = text.split()[0] if text else ''
            share = max(0.15, len(first) / max(1, len(text))) if ' ' in text else 1.0
            sx = W / (layout.get('width') or args.comp_width or info['w'])
            rois[cid] = dict(box=(int(b['x'] * sx), int(b['y'] * sx), max(2, int(b['w'] * sx * share)), max(2, int(b['h'] * sx))),
                             at=c['in'], resolved=c['resolved'], out=c.get('out'), role_px=b.get('px'), words=len(text.split()))
    want_roi = {}
    k_ = fps / (cues.get('fps') or fps) if cues else 1.0
    for cid, r in rois.items():
        a = int(r['at'] * k_) - 3
        z = int(r['resolved'] * k_) + int(0.4 * fps)
        for f in range(a, z):
            want_roi.setdefault(f, []).append(cid)
        if r['out'] is not None:
            for f in range(int(r['out'] * k_) - 3, int(r['out'] * k_) + int(0.8 * fps)):
                want_roi.setdefault(f, []).append(cid)

    S = dict(luma=[], ground_L=[], sharp=[], roi={cid: {} for cid in rois}, samples=[], tiles_prev=[])
    for f, rgb in F.decode(args.video, info, 0, None, size=(W, H)):
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        probe_m.feed(f, gray)
        S['luma'].append(float(gray.mean()))
        thumb = cv2.resize(rgb, (64, max(2, int(64 * H / W))), interpolation=cv2.INTER_AREA)
        g, _ = ground_of(thumb)
        S['ground_L'].append(float(oklab(np.array([g], np.uint8))[0][0]))
        lap = cv2.Laplacian(gray.astype(np.float32), cv2.CV_32F)
        tex = F.textured(gray)
        S['sharp'].append(float(lap[tex].var()) if tex.sum() > 200 else None)
        for cid in want_roi.get(f, []):
            x, y, w, h = rois[cid]['box']
            patch = gray[max(0, y):y + h, max(0, x):x + w]
            if patch.size:
                ys = np.nonzero(cv2.Canny(patch, 40, 120))[0]
                S['roi'][cid][f] = (float(patch.std()), float(ys.mean()) if len(ys) else None)
        if f % cstep == 0:
            L, A, B = oklab(rgb)
            C = np.hypot(A, B)
            Hh = (np.degrees(np.arctan2(B, A)) + 360) % 360
            keep = np.ones(L.shape, bool)
            for (x, y, w, h) in imagery:
                keep[max(0, y):y + h, max(0, x):x + w] = False
            if brand_lab:
                for bl in brand_lab:
                    keep &= np.sqrt((L - bl[0]) ** 2 + (A - bl[1]) ** 2 + (B - bl[2]) ** 2) > 0.06
            groups = hue_groups(L[keep] if not keep.all() else L, C[keep] if not keep.all() else C, Hh[keep] if not keep.all() else Hh)
            ban = banned_mask(L, C, Hh) & keep & (C >= 0.03)
            gcol, gshare = ground_of(rgb)
            gL, ga, gb = oklab(np.array([gcol], np.uint8))
            nong = np.abs(rgb.astype(np.int16) - gcol.astype(np.int16)[None, None, :]).max(axis=2) > 16
            dark = (L < 0.3) & nong
            pure_black = bool(dark.mean() > 0.002 and (rgb.max(axis=2)[dark] <= 3).mean() > 0.3)
            acc_share = None
            if acc_lab is not None:
                acc_share = float((np.sqrt((L - acc_lab[0]) ** 2 + (A - acc_lab[1]) ** 2 + (B - acc_lab[2]) ** 2) < 0.08).mean())
            # element scale: the median height of the non-ground blobs
            n_lab, _, st, _ = cv2.connectedComponentsWithStats(nong.astype(np.uint8), connectivity=8)
            hs = [st[i, cv2.CC_STAT_HEIGHT] for i in range(1, n_lab) if st[i, cv2.CC_STAT_AREA] >= 6]
            S['samples'].append(dict(
                f=f, groups=groups, banned=round(float(ban.mean()), 4), ground=[int(v) for v in gcol], ground_share=round(gshare, 3),
                ground_L=round(float(gL[0]), 4), ground_C=round(float(math.hypot(ga[0], gb[0])), 4), nonground=round(float(nong.mean()), 4),
                pure_black=pure_black, ink_L=round(float(np.percentile(L[nong], 2)), 4) if nong.sum() > 50 else None,
                accent=None if acc_share is None else round(acc_share, 4),
                scale=round(float(np.median(hs)) * 1080.0 / H, 1) if hs else None,
                imagery=round(float(((C > 0.08) & nong).mean()), 4)))
    return probe_m, S, (W, H)


def full_res_finish(args, info, F, n=8):
    """Grain and vignette on a few frames at full resolution (capped at 1920 wide)."""
    W = min(1920, info['w']) // 2 * 2
    H = int(round(info['h'] * W / info['w'])) // 2 * 2
    picks = sorted(set(int(x) for x in np.linspace(0, max(0, info['frames'] - 1), n + 2)[1:-1]))
    grains, vigs = [], []
    for f0 in picks:
        got = list(F.decode(args.video, info, f0, 1, size=(W, H)))
        if not got:
            continue
        f, rgb = got[0]
        L = oklab(rgb)[0] * 100
        gcol, _ = ground_of(cv2.resize(rgb, (160, max(2, int(160 * H / W))), interpolation=cv2.INTER_AREA))
        ground = np.abs(rgb.astype(np.int16) - gcol.astype(np.int16)[None, None, :]).max(axis=2) <= 10
        hp = L - cv2.GaussianBlur(L, (0, 0), 2)
        flat = cv2.erode(ground.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        if flat.mean() > 0.05:
            grains.append(float(hp[flat].std()))
        hh, ww = L.shape
        cs = [L[:hh // 10, :ww // 10], L[:hh // 10, -ww // 10:], L[-hh // 10:, :ww // 10], L[-hh // 10:, -ww // 10:]]
        cm = [ground[:hh // 10, :ww // 10], ground[:hh // 10, -ww // 10:], ground[-hh // 10:, :ww // 10], ground[-hh // 10:, -ww // 10:]]
        centre, cmask = L[hh * 3 // 10:hh * 7 // 10, ww * 3 // 10:ww * 7 // 10], ground[hh * 3 // 10:hh * 7 // 10, ww * 3 // 10:ww * 7 // 10]
        if all(m.mean() > 0.3 for m in cm) and cmask.mean() > 0.3:
            corner = float(np.mean([c[m].mean() for c, m in zip(cs, cm)]))
            mid = float(centre[cmask].mean())
            if mid > 1:
                vigs.append(1 - corner / mid)
    return grains, vigs


# ------------------------------------------------------------------------------------------
# checks, floor and measures
# ------------------------------------------------------------------------------------------
def evaluate(args, info, F, probe_m, S, size, cues, extra, layout, accent, brand):
    fps = info['fps']
    n = len(S['luma'])
    flags = []

    def add(check, severity, frame, note, **kw):
        flags.append(dict(check=check, severity=severity, frame=frame, t=round((frame if isinstance(frame, int) else int(str(frame).split('-')[0])) / fps, 3),
                          note=note, **kw))

    k_ = fps / (cues.get('fps') or fps) if cues else 1.0
    vf = lambda x: int(round(x * k_))  # noqa: E731
    look = (extra or {}).get('look') or {}
    end = (extra or {}).get('end')
    end_rng = (vf(end['from']), vf(end['to'])) if end else (max(0, n - int(2 * fps)), n)
    body = [f for f in range(n) if not end_rng[0] <= f < end_rng[1]]
    bodyset = set(body)
    win, ws, kwin = probe_m.win, probe_m.wstride, probe_m.k
    pair = probe_m.pair

    # --- cuts and shots (measured; plus the declared seams and act boundaries when cues exist)
    raw = sorted(f for f, p in pair.items() if p.get('cut'))
    cuts = []
    for c in raw:
        if c < 0.25 * fps:
            continue  # a cut in the first quarter second is the opening frame, not an edit
        if cuts and c - cuts[-1] <= max(2, int(round(0.1 * fps))):
            continue  # a flash or a frame-pair of swaps: one event
        cuts.append(c)
    seams_decl = [(vf(s['at']), s) for s in (extra or {}).get('seams', [])]
    acts = {k: (vf(a), vf(b)) for k, (a, b) in (cues or {}).get('acts', {}).items()}
    design_cuts = sorted({a for a, _ in acts.values() if 0 < a < n} | {f for f, s in seams_decl if 0 < f < n})  # every seam hands over a shot
    all_cuts = sorted(set(cuts) | set(c for c in design_cuts if not any(abs(c - x) <= 1 for x in cuts)))
    one_take = bool(look.get('oneTake')) or len(all_cuts) <= 1  # no or one hard cut: the one-take form
    edges = [0] + all_cuts + [n]
    shots = [(edges[i], edges[i + 1]) for i in range(len(edges) - 1) if edges[i + 1] - edges[i] >= max(2, int(0.25 * fps))]
    seg = shots if not one_take else [(a, min(n, a + int(2 * fps))) for a in range(0, n, int(2 * fps))]

    cut_near = set()
    for c in all_cuts:
        cut_near |= set(range(c, c + kwin))  # windows ending here straddle the cut (one ending at c + k starts on it)

    def wat(f):
        g = F.window_at(win, f, ws)
        if g is None:
            return None
        end_f = next((x for x in range(f, f + 2 * ws + 1) if x in win), f)
        return None if end_f in cut_near else g

    def wat_before(f):
        """The latest window that ends at or before f (the shot before a cut, never straddling it)."""
        for g in range(f, max(-1, f - 2 * ws - 1), -1):
            if g in win and g not in cut_near:
                return win[g]
        return None

    # density: a start is a region of 64 px tiles (at 1080p) that begins to move faster than 30 px/s after
    # resting for 0.25 s (debounced over 3 frames, at least ONSET_TILES tiles); concurrency counts the
    # moving regions; an idle frame has none and no camera move
    from collections import deque as _dq
    hist = _dq(maxlen=3)
    rest = None
    onsets, conc, idle = 0, [], 0
    start_frames = []
    rest_n = max(2, int(round(0.25 * fps)))
    cut_set = set(all_cuts)
    for f in body:
        p = pair.get(f)
        if not p or 'tiles' not in p:
            continue
        t = p['tiles'] > 0
        if f in cut_set or f - 1 in cut_set:
            hist.clear()
            rest = None
            continue  # a cut is not an animation start
        hist.append(t)
        act = (np.sum(hist, axis=0) >= 2) if len(hist) == 3 else t
        if rest is None:
            rest = np.full(t.shape, rest_n, np.int32)
        new = act & (rest >= rest_n)
        rest = np.where(act, 0, rest + 1)
        n_act, _, st_act, _ = cv2.connectedComponentsWithStats(act.astype(np.uint8), connectivity=8)
        conc.append(sum(1 for i in range(1, n_act) if st_act[i, cv2.CC_STAT_AREA] >= ONSET_TILES))
        if not act.any() and p.get('speed', 0) < 30:
            idle += 1
        if new.any():
            n_new, _, st_new, _ = cv2.connectedComponentsWithStats(new.astype(np.uint8), connectivity=8)
            k_new = sum(1 for i in range(1, n_new) if st_new[i, cv2.CC_STAT_AREA] >= ONSET_TILES)
            onsets += k_new
            if k_new:
                start_frames.append((f, k_new))
    S['start_burst'] = start_frames

    # --- floor 1: camera or ground moving
    states = {f: wat(f) for f in body if f >= kwin}
    meas = [f for f, w in states.items() if w]
    # the frame moves when the camera or the ground does; a layer that carries a large share of the
    # structure (MOVING_LAYER) counts as ground
    live = [f for f in meas if states[f]['live'] or (states[f]['layer_pxs'] >= F.LIVE_PXS and states[f].get('moving_share', 0) >= MOVING_LAYER)]
    moving_share = len(live) / max(1, len(meas))
    # --- floor 2: depth planes per shot (segment)
    depth_rows = []
    for a, b in seg:
        ws_ = [wat(f) for f in range(max(a + kwin, a), b, max(1, ws)) if f in bodyset]
        ws_ = [w for w in ws_ if w]
        if len(ws_) < 2:
            continue
        two = [w for w in ws_ if (w['cam_pxs'] >= F.LIVE_PXS or w['cam_pct'] >= F.LIVE_PCT) and w.get('plane2_pxs', 0) >= F.LIVE_PXS]
        depth_rows.append(dict(shot=[a, b], share=round(len(two) / len(ws_), 3), depth=len(two) / len(ws_) >= 0.3))
    depth_share = sum(1 for r in depth_rows if r['depth']) / max(1, len(depth_rows))
    # --- floor 3: carried seams
    seam_rows = []
    for f, s in seams_decl:
        seam_rows.append(dict(frame=f, kind=s.get('kind'), declared=True, carried=s.get('kind') in CARRIED))
    for c in all_cuts:
        if any(abs(c - r['frame']) <= 1 for r in seam_rows):
            continue
        pb, pa = pair.get(c - 1, {}), pair.get(c + 1, {})
        vb, va = pb.get('vec', [0, 0]), pa.get('vec', [0, 0])
        sb, sa = math.hypot(*vb) * fps, math.hypot(*va) * fps
        cos = (vb[0] * va[0] + vb[1] * va[1]) / max(1e-6, math.hypot(*vb) * math.hypot(*va))
        wb, wa = wat_before(c - 1), wat(c + kwin)
        kb, ka = (wb or {}).get('cam_k', 0), (wa or {}).get('cam_k', 0)
        zoom = bool(wb and wa and abs(kb) >= CARRY_ZOOM and abs(ka) >= CARRY_ZOOM)  # scale carried (a breath may flip direction)
        carried = bool((sb >= CARRY_PXS and sa >= CARRY_PXS and cos >= 0.7) or zoom)
        seam_rows.append(dict(frame=c, kind='cut', declared=False, carried=carried, before_pxs=round(sb, 1), after_pxs=round(sa, 1), cos=round(cos, 2)))
    carried_n = sum(1 for r in seam_rows if r['carried'])
    carried_share = carried_n / max(1, len(seam_rows))
    carried_need = int(round(0.4 * len(seam_rows)))  # 40 % of the seams, to the nearest seam (1 of 3 is enough)
    # --- light events
    lum = np.array(S['ground_L'], np.float64)
    light_frames = set()
    w1 = max(2, int(fps))
    cutset = set(all_cuts)
    for f in range(w1, n):
        if any(c in cutset for c in range(f - w1 + 1, f + 1)):
            continue
        seg_l = lum[f - w1:f + 1]
        if seg_l.max() - seg_l.min() >= 0.02:
            light_frames.add(f)
    for f, w in win.items():
        if w.get('ground_cps', 0) >= F.GROUND_CPS and f not in cut_near:
            light_frames.add(f)
    for f, s in seams_decl:
        if s.get('kind') in LIGHT_KINDS:
            light_frames.add(f)
    acts_rng = list(acts.items()) if acts else [('film', (0, n))]
    light_rows = [dict(act=k, light=any(a <= f < b for f in light_frames)) for k, (a, b) in acts_rng]
    # --- floor 4: a designed device every 3 s
    ev = set(all_cuts) | {f for f, _ in seams_decl}
    for key in ('stepped', 'camera_blur'):
        ev |= {vf(r['from']) for r in (extra or {}).get(key, [])}
    ev |= {vf(x['f']) for x in (extra or {}).get('flashes', [])}
    sp = {f: p.get('speed', 0) for f, p in pair.items()}
    last_peak = -10 ** 9
    for f in sorted(sp):
        if sp[f] >= DEVICE_PXS and sp[f] >= sp.get(f - 1, 0) and sp[f] >= sp.get(f + 1, 0) and f - last_peak >= 0.4 * fps:
            ev.add(f)
            last_peak = f
    for f, w in win.items():
        if w.get('cam_pct', 0) >= DEVICE_ZOOM and f not in cut_near:
            ev.add(f)
    ev |= {f for f, k_new in S.get('start_burst', []) if k_new >= DEVICE_BURST}  # several things launched together
    lf = sorted(light_frames)
    ev |= {f for i, f in enumerate(lf) if i == 0 or f - lf[i - 1] > fps}
    evb = sorted(f for f in ev if f in bodyset)
    gaps = []
    if body:
        marks = [body[0]] + evb + [body[-1]]
        gaps = [(marks[i], marks[i + 1]) for i in range(len(marks) - 1) if marks[i + 1] - marks[i] > 3 * fps]
    # --- floor 6: scale contrast between shots
    samples = S['samples']

    def shot_scale(a, b):
        mid = [s for s in samples if a + (b - a) * 0.25 <= s['f'] <= a + (b - a) * 0.75 and s['scale']]
        mid = mid or [s for s in samples if a <= s['f'] < b and s['scale']]
        if not mid:
            return None
        return float(np.median([s['scale'] for s in mid])), float(np.median([s['nonground'] for s in mid]))

    scale_rows = []
    if not one_take:
        for i in range(len(shots) - 1):
            p, q = shot_scale(*shots[i]), shot_scale(*shots[i + 1])
            if not p or not q:
                continue
            rh = max(p[0], q[0]) / max(1e-6, min(p[0], q[0]))
            rc = max(p[1], q[1]) / max(1e-6, min(p[1], q[1])) if min(p[1], q[1]) >= 0.005 else 1.0
            scale_rows.append(dict(cut=shots[i + 1][0], height_ratio=round(rh, 2), cover_ratio=round(rc, 2), contrast=rh >= 1.5 or rc >= 2.0))
    scale_share = sum(1 for r in scale_rows if r['contrast']) / max(1, len(scale_rows))

    floor = dict(
        moving=dict(share=round(moving_share, 3), need=0.9, ok=moving_share >= 0.9),
        depth=dict(share=round(depth_share, 3), need=0.5, ok=depth_share >= 0.5, shots=depth_rows),
        carried=dict(share=round(carried_share, 3), need=0.4, ok=one_take or not seam_rows or carried_n >= carried_need, seams=seam_rows, na=one_take or not seam_rows),
        device=dict(max_gap_s=round(max([(b - a) / fps for a, b in gaps] or [0]), 2), need_s=3, ok=not gaps, gaps=[[a, b] for a, b in gaps]),
        light=dict(acts=light_rows, ok=all(r['light'] for r in light_rows)),
        scale=dict(share=round(scale_share, 3), need=0.3, ok=one_take or not scale_rows or scale_share >= 0.3, cuts=scale_rows, na=one_take or not scale_rows),
    )
    floor['pass'] = all(v['ok'] for v in floor.values() if isinstance(v, dict))
    if not args.no_floor:
        msgs = {
            'moving': f"the camera or the ground moves on {moving_share * 100:.0f} % of the body (floor 90 %): creep, drift or light the ground through every hold",
            'depth': f"{depth_share * 100:.0f} % of the shots show two planes moving at different rates (floor 50 %): parallax, a foreground pass, type over a moving ground",
            'carried': f"{carried_share * 100:.0f} % of the seams carry something across (floor 40 %): velocity, morph, breath, whip, mask",
            'device': f"{len(gaps)} stretch(es) over 3 s with nothing designed happening (longest {floor['device']['max_gap_s']} s): a device in every beat",
            'light': f"act(s) without a light event: {', '.join(r['act'] for r in light_rows if not r['light'])}; let the ground brighten into a reveal or light move over it",
            'scale': f"{scale_share * 100:.0f} % of the cuts change the scale of what is on screen (floor 30 %): alternate large and small",
        }
        for key, msg in msgs.items():
            if not floor[key]['ok']:
                add(f'floor-{key}', 'fail', 0, msg)

    # --- look checks
    groups_by_sample = [s['groups'] for s in samples]
    hues = []
    for gs in groups_by_sample:
        for g in gs:
            hues.append(g['h'])
    film_groups = []
    for hh in sorted(set(round(h / 5) * 5 for h in hues)):
        count = sum(1 for gs in groups_by_sample if any(min(abs(g['h'] - hh), 360 - abs(g['h'] - hh)) <= 15 for g in gs))
        if count >= 3:
            near = next((x for x in film_groups if min(abs(x['h'] - hh), 360 - abs(x['h'] - hh)) <= 30), None)
            if near:
                near['samples'] = max(near['samples'], count)
            else:
                film_groups.append(dict(h=hh, samples=count))
    if len(film_groups) >= 3:
        add('hue-count', 'fail', 0, f"{len(film_groups)} hue groups across the film ({', '.join(str(g['h']) for g in film_groups)} deg): one accent family; several hues live only inside imagery (--imagery)")
    elif len(film_groups) == 2:
        add('hue-count', 'warn', 0, f"2 hue groups more than 30 degrees apart ({film_groups[0]['h']} and {film_groups[1]['h']} deg): one accent family")
    banned = [s for s in samples if s['banned'] >= 0.005]
    if len(banned) >= 3:
        add('banned-hue', 'fail', banned[0]['f'], f"a banned colour region (orange/amber, beige/cream, purple/violet or neon) covers >= 0.5 % of {len(banned)} samples; a brand-supplied colour is declared in the tokens (cinetic:brand-supplied) or with --brand")
    accs = [s for s in samples if s['accent'] is not None]
    over = [s for s in accs if s['accent'] > 0.08]
    if over:
        runs, cur = [], [over[0]]
        for s in over[1:]:
            if s['f'] - cur[-1]['f'] <= int(round(fps / 2)) + 1:
                cur.append(s)
            else:
                runs.append(cur)
                cur = [s]
        runs.append(cur)
        long_runs = [r for r in runs if (r[-1]['f'] - r[0]['f']) / fps > 2]
        if len(runs) > 1 or long_runs:
            add('accent-share', 'warn', over[0]['f'], f'the accent covers more than 8 % of the frame in {len(runs)} stretch(es): keep it a signal, with one designed flood at most')
    pb = sum(1 for s in samples if s['pure_black']) / max(1, len(samples))
    black_brand = any(hex_rgb(b) == [0, 0, 0] for b in brand)
    white_brand = any(hex_rgb(b) == [255, 255, 255] for b in brand)
    if pb > 0.1 and not black_brand:
        add('tinted-ink', 'warn', 0, f'pure black ink on {pb * 100:.0f} % of the samples: ink is tinted (L 0.15-0.25 toward the accent hue)')
    pw = sum(1 for s in samples if min(s['ground']) >= 252 and s['ground_share'] > 0.3) / max(1, len(samples))
    if pw > 0.1 and not look.get('whiteWorld') and not white_brand:
        add('tinted-ink', 'warn', 0, f'a pure white ground on {pw * 100:.0f} % of the samples: a light stage is a tinted white (L 0.93-0.99, C <= 0.015 toward a cool accent); pure white is the white-world look')
    reading = []
    for c in (cues or {}).get('copy', []):
        for w in (c.get('read') or [[c.get('resolved', 0), c.get('out', 0)]]):
            reading.append((vf(w[0]), vf(w[1])))
    rs = [s for s in samples if any(a <= s['f'] < b for a, b in reading)]
    if rs:
        med = float(np.median([s['nonground'] for s in rs]))
        dense, cur = [], []
        for s in rs:
            if s['nonground'] > 0.3 and (not cur or s['f'] - cur[-1] <= fps):
                cur.append(s['f'])
            elif s['nonground'] > 0.3:
                dense.append(cur)
                cur = [s['f']]
        if cur:
            dense.append(cur)
        longd = [d for d in dense if (d[-1] - d[0]) / fps > 6]
        if med > 0.3 or longd:
            add('negative-space', 'warn', rs[0]['f'], f'type scenes fill {med * 100:.0f} % of the frame (median, house <= 30 %): type sits in 55-97 % empty space; dense bursts last <= 6 s')
    lg_runs, cur = [], []
    for f in body:
        w = states.get(f)
        still = w is not None and w['cam_pxs'] < F.LIVE_PXS and w['cam_pct'] < F.LIVE_PCT and w['ground_cps'] < F.GROUND_CPS
        if still:
            cur.append(f)
        else:
            if len(cur) > 0.8 * fps:
                lg_runs.append((cur[0], cur[-1]))
            cur = []
    if len(cur) > 0.8 * fps:
        lg_runs.append((cur[0], cur[-1]))
    if lg_runs:
        a, b = max(lg_runs, key=lambda r: r[1] - r[0])
        add('living-ground', 'warn', f'{a}-{b}', f'{len(lg_runs)} stretch(es) where the camera and the ground both stand still (longest {(b - a + 1) / fps:.1f} s): when type locks off, the ground keeps moving')
    if not args.no_finish:
        grains, vigs = full_res_finish(args, info, F)
        tex = look.get('texture', 'clean')
        if grains and float(np.median(grains)) > 0.6 and tex == 'clean':
            add('clean-finish', 'warn', 0, f'grain {float(np.median(grains)):.2f} L* on the flat ground (clean is <= 0.6): declare LOOK.texture for one material, else render clean')
        if vigs and float(np.median(vigs)) > 0.02:
            add('clean-finish', 'warn', 0, f'the corners sit {float(np.median(vigs)) * 100:.1f} % darker than the centre: no vignette (light comes from a declared light field)')
    else:
        grains, vigs = [], []
    # luminance flips: the stage turns light <-> dark
    flips = []
    gl = S['ground_L']
    for c in all_cuts:
        if 2 <= c < n - 2:
            a, b = gl[c - 2], gl[min(n - 1, c + 1)]
            if (a >= 0.6 and b <= 0.35) or (a <= 0.35 and b >= 0.6):
                wb, wa = wat_before(c - 1), wat(c + kwin)
                carried = bool((wb and wb['moving']) or (wa and wa['moving']))
                flips.append(dict(frame=c, carried=carried))
    for x in flips:
        if not x['carried']:
            add('luminance-flip', 'warn', x['frame'], 'the stage flips light/dark on a hard cut with nothing moving across it: carry the flip on a moving shape (a wipe, a mask, a morph)')
    bpm = (cues or {}).get('bpm') or ((cues or {}).get('music') or {}).get('bpm')
    if bpm and len(flips) >= 2:
        bar = 4 * 60 / float(bpm) * fps
        for i in range(len(flips) - 1):
            if flips[i + 1]['frame'] - flips[i]['frame'] < bar:
                add('luminance-flip', 'warn', flips[i]['frame'], 'the stage flips twice inside one bar: one flip per phrase reads as rhythm, two read as flicker')
                break
    # blur policy on a crisp film
    if look.get('blur', 'crisp') == 'crisp' and cues:
        cam_ranges = [(vf(r['from']), vf(r['to'])) for r in (extra or {}).get('camera_blur', [])]
        sharp = S['sharp']
        fast = [f for f, p in pair.items() if p.get('speed', 0) > 600 and f < n and sharp[f] and not any(a <= f < b for a, b in cam_ranges)]
        soft = []
        for f in fast:
            ref = [sharp[g] for g in range(max(0, f - int(fps / 2)), min(n, f + int(fps / 2))) if sharp[g] and pair.get(g, {}).get('speed', 1e9) < 60]
            if len(ref) >= 3 and sharp[f] < 0.8 * float(np.median(ref)):
                soft.append(f)
        if fast and len(soft) / len(fast) > 0.3:
            add('blur-policy', 'warn', soft[0], f'{len(soft)} of {len(fast)} fast frames lose over 20 % of their sharpness in a crisp film: flat graphics stay crisp at any speed (declare a CAMERA_BLUR range for a camera-real moment)')
    # type sizes from the layout audit
    type_rows = []
    if layout:
        bands = [('caption', 2.3, 4.0), ('statement', 5.0, 9.0), ('hero', 11.0, 23.0), ('giant', 40.0, 90.0)]
        for fr in layout.get('boxes', []):
            hgt = fr.get('height') or layout.get('height') or args.comp_height or 1080
            wid = fr.get('width') or layout.get('width') or args.comp_width or 1920
            non_ui = []
            for b in fr.get('boxes', []):
                if b.get('ui') or b.get('opacity', 1) < 0.5:
                    continue
                cap = 0.72 * b['px'] / hgt * 100
                role = next((r for r, lo, hi in bands if lo <= cap <= hi), None)
                if role is None and cap >= 2.0:
                    type_rows.append(dict(frame=fr['frame'], id=b['id'], cap=round(cap, 2), issue='between roles'))
                if role == 'statement' and b['w'] / wid > 0.61:
                    type_rows.append(dict(frame=fr['frame'], id=b['id'], cap=round(cap, 2), issue='statement wider than 61 % of the frame'))
                if role == 'hero' and b['w'] / wid > 0.84:
                    type_rows.append(dict(frame=fr['frame'], id=b['id'], cap=round(cap, 2), issue='payoff wider than 84 % of the frame'))
                non_ui.append(b['px'])
            sizes = []
            for px in sorted(non_ui):
                if not sizes or px > sizes[-1] * 1.08:
                    sizes.append(px)
            if len(sizes) > 2:
                type_rows.append(dict(frame=fr['frame'], id='+'.join(b['id'] for b in fr.get('boxes', [])), issue=f'{len(sizes)} non-UI sizes at once'))
        for r in type_rows[:20]:
            add('type-size', 'warn', r['frame'], f"{r['id']}: {r['issue']}" + (f" (cap {r['cap']} % of the frame height; caption 2.3-4, statement 5-9, hero 11-23, giant 40-90)" if 'cap' in r else ''))
    # word arrivals and fades (layout + copy)
    word_rows = []
    for cid, series in S['roi'].items():
        if not series:
            continue
        fs = sorted(series)
        vals = np.array([series[f][0] for f in fs])
        if vals.max() < 4:
            continue
        fin = float(np.median(vals[-max(2, int(0.2 * fps)):])) if len(vals) > 4 else float(vals.max())
        if fin < 4:
            continue
        rel = vals / fin
        vis = next((i for i, v in enumerate(rel) if v >= 0.05), None)
        if vis is None:
            continue
        f2 = vis + max(1, int(math.ceil(2 * fps / 60)))
        f18 = vis + max(1, int(round(18 * fps / 60)))
        first_ok = f2 < len(rel) and rel[min(f2, len(rel) - 1)] >= 0.3
        late_ok = f18 >= len(rel) or rel[min(f18, len(rel) - 1)] >= 0.9
        r90 = next((i for i, v in enumerate(rel) if v >= 0.9 and i >= vis), None)
        ramp60 = None if r90 is None else (r90 - vis) * 60 / fps
        ys = [series[fs[i]][1] for i in range(vis, (r90 or vis) + 1) if series[fs[i]][1] is not None]
        moved = (max(ys) - min(ys)) * 1080 / size[1] / max(1, len(ys)) * (60 / fps) if len(ys) >= 2 else 0.0
        front = None
        if r90 is not None and r90 > vis + 1:
            span = r90 - vis
            k10 = vis + max(1, int(round(0.1 * span)))
            front = float(rel[k10] - rel[vis]) / max(1e-6, float(rel[r90] - rel[vis]))
        row = dict(id=cid, first_ok=bool(first_ok), late_ok=bool(late_ok), ramp60=None if ramp60 is None else round(ramp60, 1), moved=round(moved, 2),
                   front=None if front is None else round(front, 3))
        word_rows.append(row)
        if not first_ok or not late_ok:
            add('word-first-frame', 'warn', fs[vis], f'"{cid}" arrives slowly: a word shows at >= 30 % of its contrast within 2 f@60 and >= 90 % by 18 f@60 (snapOut, a pop, or part-inked)')
        if ramp60 is not None and ramp60 > 12 and moved < 2:
            add('fade-detect', 'warn', fs[vis], f'"{cid}" fades in over {ramp60:.0f} f@60 without moving: words cut on in place or rise as one snapOut move')
        if front is not None and front < 0.2:
            add('arrival-front-load', 'warn', fs[vis], f'"{cid}" puts {front * 100:.0f} % of its arrival in the first 10 % of its time: arrivals are front-loaded (peak speed on the first frame)')
    # imagery developing from a tint (a hint)
    dev_rows = []
    im = [(s['f'], s['imagery']) for s in samples]
    for i in range(1, len(im) - 2):
        if im[i - 1][1] < 0.01 and im[i][1] >= 0.03:
            later = max(x[1] for x in im[i:i + 3])
            dev_rows.append(dict(frame=im[i][0], full=bool(im[i][1] >= 0.9 * later)))
    if len(dev_rows) >= 2 and sum(1 for r in dev_rows if r['full']) / len(dev_rows) > 0.5:
        add('image-develop', 'warn', dev_rows[0]['frame'], 'imagery mostly arrives at full colour: let it develop from a tint or a duotone over 12-52 f@60 (fx/Develop)')

    # --- measures for grammar-score
    lens = [(b - a) / fps for a, b in shots]
    q25, q75 = (float(np.percentile(lens, 25)), float(np.percentile(lens, 75))) if len(lens) >= 2 else (None, None)
    body_s = max(1e-6, len(body) / fps)
    # starts close together are one beat of animation: regions starting within START_MERGE s count once
    merged, last_s = 0, -1e9
    for f, _k in start_frames:
        if (f - last_s) / fps > START_MERGE:
            merged += 1
            last_s = f
    S['starts'] = start_frames
    holds = [f for f in meas if states[f]['layer_pxs'] < 90]
    living = [f for f in holds if states[f]['live'] or states[f]['layer_pxs'] >= F.LIVE_PXS or states[f].get('change', 0) >= F.CHANGE_LIVE]
    onset_t = audio_onsets(args.video, fps) if not args.no_audio else None
    sync = None
    if onset_t and all_cuts:
        ot = np.array(onset_t)
        # signed (cut - nearest onset) in frames: the picture may lead the sound by up to 3 f, trail by 1
        d = [float((c / fps - ot[int(np.argmin(np.abs(ot - c / fps)))]) * fps) if len(ot) else 99.0 for c in all_cuts]
        sync = dict(within_1f=round(sum(1 for x in d if -3 - 1e-6 <= x <= 1 + 1e-6) / len(d), 3),
                    within_100ms=round(sum(1 for x in d if abs(x) <= 0.1 * fps + 1e-6) / len(d), 3), onsets=len(onset_t))
    measures = dict(
        fps=fps, frames=n, seconds=round(n / fps, 3), body_frames=len(body),
        cuts=all_cuts, shots=[[a, b] for a, b in shots], shot_lengths=[round(x, 3) for x in lens],
        shot_median=round(float(np.median(lens)), 3) if lens else None,
        shot_spread=round(q75 / q25, 3) if q25 else None,
        shot_longest_over_shortest=round(max(lens) / max(1e-6, min(lens)), 2) if lens else None,
        shots_over_4s=round(sum(1 for x in lens if x > 4) / len(lens), 3) if lens else None,
        one_take=one_take,
        starts_per_s=round(merged / body_s, 3), region_starts_per_s=round(onsets / body_s, 3), concurrency=round(float(np.mean(conc)), 3) if conc else None,
        idle_share=round(idle / max(1, len(conc)), 3) if conc else None,
        living_holds=round(len(living) / max(1, len(holds)), 3) if holds else None,
        moving_share=round(moving_share, 3), carried_share=round(carried_share, 3) if seam_rows else None, seams=len(seam_rows),
        cut_sync=sync,
        hue_groups=len(film_groups), accent_p95=round(float(np.percentile([s['accent'] for s in accs], 95)), 4) if accs else None,
        ground_L=round(float(np.median([s['ground_L'] for s in samples])), 4) if samples else None,
        ground_C=round(float(np.median([s['ground_C'] for s in samples])), 4) if samples else None,
        ink_L=round(float(np.median([s['ink_L'] for s in samples if s['ink_L'] is not None])), 4) if any(s['ink_L'] is not None for s in samples) else None,
        grain=round(float(np.median(grains)), 3) if grains else None, vignette=round(float(np.median(vigs)), 4) if vigs else None,
        type_issues=len(type_rows), words=word_rows,
    )
    return flags, floor, measures


# ------------------------------------------------------------------------------------------
# trajectory: the one-hue gate
# ------------------------------------------------------------------------------------------
def trajectory(args, info, F):
    if not args.roi or not args.accent:
        die('--trajectory needs --roi x,y,w,h and --accent')
    x, y, w, h = [int(float(v)) for v in args.roi.split(',')]
    aL, aC, ah = lch_of_hex(args.accent)
    rows = []
    for f, rgb in F.decode(args.video, info, args.from_frame or 0, None if args.to_frame is None else args.to_frame - (args.from_frame or 0) + 1):
        patch = rgb[max(0, y):y + h, max(0, x):x + w].reshape(-1, 3)
        if not len(patch):
            die('--roi is outside the frame')
        L, A, B = oklab(patch)
        C = np.hypot(A, B)
        k = max(1, int(0.2 * len(C)))
        sel = np.argsort(-C)[:k]  # the most coloured fifth: the element, not its ground
        Lm, Am, Bm = float(L[sel].mean()), float(A[sel].mean()), float(B[sel].mean())
        rows.append(dict(f=f, L=round(Lm, 4), C=round(math.hypot(Am, Bm), 4), h=round(math.degrees(math.atan2(Bm, Am)) % 360, 2)))
    off = [r for r in rows if r['C'] >= 0.03 and min(abs(r['h'] - ah), 360 - abs(r['h'] - ah)) > args.hue_tol]
    res = dict(accent=dict(L=round(aL, 4), C=round(aC, 4), h=round(ah, 2)), frames=len(rows), hue_tol=args.hue_tol, off_hue=[r['f'] for r in off], series=rows)
    ok = not off
    if args.target:
        t = json.load(open(args.target))
        if 'bounds' in t:
            lo_L, hi_L = t['bounds'].get('L', [0, 1])
            lo_C, hi_C = t['bounds'].get('C', [0, 1])
            outside = [r['f'] for r in rows if not (lo_L <= r['L'] <= hi_L and lo_C <= r['C'] <= hi_C)]
            res['outside_bounds'] = outside
            ok = ok and not outside
        else:
            m = min(len(rows), len(t.get('L', [])), len(t.get('C', [])))
            if m:
                eL = float(np.mean([abs(rows[i]['L'] - t['L'][i]) for i in range(m)]))
                eC = float(np.mean([abs(rows[i]['C'] - t['C'][i]) for i in range(m)]))
                res['mae'] = dict(L=round(eL, 4), C=round(eC, 4), tol=args.tol)
                ok = ok and eL <= args.tol and eC <= args.tol
    res['pass'] = bool(ok)
    return res


# ------------------------------------------------------------------------------------------
# self-test: synthetic clips with known answers
# ------------------------------------------------------------------------------------------
def self_test(F):
    import shutil
    import tempfile
    tmp = tempfile.mkdtemp(prefix='cinetic-look-')
    fps, w, h = 30, 480, 270
    bad = 0

    def check(ok, what, detail=''):
        nonlocal bad
        bad += 0 if ok else 1
        print(f"{'pass' if ok else 'FAIL'}  look-audit self-test: {what}" + (f'  ({detail})' if detail else ''))

    def run(name, frames, cues=None, extra=()):
        clip = os.path.join(tmp, name + '.mp4')
        F.write_clip(clip, frames, fps)
        out = os.path.join(tmp, name + '.json')
        cmd = [sys.executable, os.path.abspath(__file__), clip, '--json', out, '--no-finish', '--no-audio', *extra]
        if cues:
            cp = os.path.join(tmp, name + '.cues.json')
            json.dump(cues, open(cp, 'w'))
            cmd += ['--cues', cp]
        r = subprocess.run(cmd, capture_output=True, text=True)
        try:
            return json.load(open(out))
        except (OSError, ValueError):
            print(r.stdout[-800:], r.stderr[-1500:])
            return {'flags': [], 'floor': {}, 'measures': {}}

    def has(rep, check_, sev=None):
        return [x for x in rep.get('flags', []) if x['check'] == check_ and (sev is None or x['severity'] == sev)]

    def cues_for(n, seams=(), acts=None):
        return dict(fps=fps, total=n, acts=acts or dict(a={'from': 0, 'dur': n}), cue={}, events=[], copy=[],
                    look=dict(blur='crisp', texture='clean', filmType='launch', oneTake=False, whiteWorld=False),
                    declared=dict(seams=list(seams), stepped=[], flashes=[], cameraBlur=[], end={'from': n - 30, 'to': n}))

    paper = np.full((h, w, 3), (236, 238, 241), np.uint8)

    def card(base, x, y, s, col, stripes=False):
        img = base.copy()
        if stripes:  # a card of vertical rules: structure the flow can follow, blobs as tall as the card
            for xx in range(int(x), int(x + s), 4):
                cv2.rectangle(img, (xx, int(y)), (xx + 1, int(y + s * 0.6)), col, -1)
        else:
            cv2.rectangle(img, (int(x), int(y)), (int(x + s), int(y + s * 0.6)), col, -1)
        return img

    def dots(seed):  # a paper ground with a faint random dot field (structure under 16 levels: still ground)
        rng = np.random.default_rng(seed)
        g = np.full((h + 120, w + 400, 3), (236, 238, 241), np.int16)
        for _ in range(2400):
            yy, xx = int(rng.integers(0, h + 117)), int(rng.integers(0, w + 397))
            g[yy:yy + 3, xx:xx + 3] -= 15
        return np.clip(g, 0, 255).astype(np.uint8)

    # a flat film: two locked-off cards and a hard cut
    n = 150
    flat = [card(paper, 140, 90, 120, (30, 32, 36))] * 75 + [card(paper, 200, 100, 80, (30, 32, 36))] * 75
    rep = run('flat', flat, cues_for(n, seams=[dict(at=75, kind='hard', id='cut')]))
    fl = rep.get('floor', {})
    check(not fl.get('pass', True) and not fl.get('moving', {}).get('ok', True), 'a locked-off film fails the floor (nothing moves)', f"moving {fl.get('moving', {}).get('share')}")
    check(bool(has(rep, 'floor-moving', 'fail')) and bool(has(rep, 'floor-light', 'fail')), 'the flat film fails floor-moving and floor-light')
    # a rich film: a creeping textured ground (light moving), a card moving apart from it, a carried cut, scale change
    A, B = dots(11), dots(12)
    rich = []  # three shots: a large card, a small one, a large one again (two carried seams)
    for i in range(50):
        g = F.warp(A, dx=-i * 1.2, k=1 + 0.002 * i)[:h, :w]
        g = np.clip(g.astype(np.int16) + int(12 * math.sin(i / 10)), 0, 255).astype(np.uint8)
        rich.append(card(g, 60 + i * 3.0, 80, 160, (25, 60, 110), stripes=True))
    for i in range(50):
        g = F.warp(B, dx=-(90 + i * 1.0), k=1 + 0.003 * i)[:h, :w]
        g = np.clip(g.astype(np.int16) + int(10 * math.cos(i / 9)), 0, 255).astype(np.uint8)
        rich.append(card(g, 280 - i * 1.5, 120, 60, (25, 60, 110), stripes=True))
    for i in range(50):
        g = F.warp(A, dx=-(140 + i * 1.1), k=1.1 + 0.002 * i)[:h, :w]
        g = np.clip(g.astype(np.int16) + int(12 * math.sin(i / 8 + 1)), 0, 255).astype(np.uint8)
        rich.append(card(g, 40 + i * 2.5, 70, 170, (25, 60, 110), stripes=True))
    rep = run('rich', rich, cues_for(n, seams=[dict(at=50, kind='velocity', carry='x', id='carry1'), dict(at=100, kind='velocity', carry='x', id='carry2')]))
    fl = rep.get('floor', {})
    check(fl.get('moving', {}).get('ok') is True, 'a creeping ground passes floor-moving', f"share {fl.get('moving', {}).get('share')}")
    check(fl.get('depth', {}).get('ok') is True, 'a card moving over a moving ground counts as two depth planes', f"share {fl.get('depth', {}).get('share')}")
    check(fl.get('carried', {}).get('ok') is True and fl.get('light', {}).get('ok') is True, 'a declared velocity seam and a brightening ground pass carried and light')
    sc = fl.get('scale', {})
    check(sc.get('ok') is True and len(sc.get('cuts', [])) == 2 and all(r['contrast'] for r in sc.get('cuts', [])), 'a large card cut to a small one (and back) is scale contrast', json.dumps(sc.get('cuts', [])[:2]))
    # an undeclared cut: the scale moving on both sides carries the move across; still into still does not
    TA, TB = F.texture(21, w, h), F.texture(22, w, h)
    breath = [F.warp(TA, k=1 + 0.04 * i / fps) for i in range(60)] + [F.warp(TB, k=1.05 + 0.04 * i / fps) for i in range(60)]
    rows = [r for r in run('breath', breath).get('floor', {}).get('carried', {}).get('seams', []) if not r['declared']]
    check(bool(rows) and rows[0]['carried'], 'an undeclared cut with the scale moving on both sides is carried', json.dumps(rows[:1]))
    rows = [r for r in run('stillcut', [TA] * 60 + [TB] * 60).get('floor', {}).get('carried', {}).get('seams', []) if not r['declared']]
    check(bool(rows) and not rows[0]['carried'], 'an undeclared cut from a still frame to a still frame is not carried', json.dumps(rows[:1]))
    # hue count: three saturated hues fail, one passes
    three = []
    for i in range(60):
        img = paper.copy()
        cv2.rectangle(img, (40 + i, 60), (140 + i, 200), (220, 40, 50), -1)   # red
        cv2.rectangle(img, (190, 60 + i // 2), (290, 200), (30, 160, 80), -1)  # green
        cv2.rectangle(img, (340, 60), (440, 200 - i // 3), (40, 90, 220), -1)  # blue
        three.append(img)
    rep = run('hues', three)
    check(bool(has(rep, 'hue-count', 'fail')), 'three accent hues fail hue-count')
    one = [card(paper, 60 + i * 2, 80, 140, (30, 120, 200)) for i in range(60)]
    rep = run('onehue', one)
    check(not has(rep, 'hue-count'), 'one accent hue passes hue-count')
    # banned hue: orange fails unless the brand supplied it
    orange = [card(paper, 60 + i * 2, 80, 160, (240, 130, 30)) for i in range(60)]
    rep = run('orange', orange)
    check(bool(has(rep, 'banned-hue', 'fail')), 'an orange accent fails banned-hue')
    rep = run('orange-brand', orange, extra=('--brand', '#F0821E'))
    check(not has(rep, 'banned-hue'), 'the same orange supplied by the brand passes')
    # pure black ink on pure white
    bw = [card(np.full((h, w, 3), 255, np.uint8), 60 + i, 100, 120, (0, 0, 0)) for i in range(60)]
    rep = run('bw', bw)
    check(len(has(rep, 'tinted-ink')) == 2, 'pure black ink and a pure white ground warn')
    # trajectory: a constant-hue ramp passes, a hue sweep fails
    ramp = []
    for i in range(30):
        t = i / 29
        L, C = 0.9 - 0.4 * t, 0.04 + 0.1 * t
        col = oklch_rgb(L, C, 150.0)
        img = paper.copy()
        img[100:170, 200:280] = col
        ramp.append(img)
    clip = os.path.join(tmp, 'ramp.mp4')
    F.write_clip(clip, ramp, fps)
    acc = '#%02X%02X%02X' % tuple(oklch_rgb(0.6, 0.15, 150.0))
    r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--trajectory', '--roi', '200,100,80,70', '--accent', acc, '--json', os.path.join(tmp, 'ramp.json')],
                       capture_output=True, text=True)
    check(r.returncode == 0, 'a one-hue lightness/chroma ramp keeps the accent hue', r.stdout.strip().split('\n')[-1][:100])
    sweep = []
    for i in range(30):
        img = paper.copy()
        img[100:170, 200:280] = oklch_rgb(0.6, 0.14, 150.0 + 3 * i)
        sweep.append(img)
    F.write_clip(clip, sweep, fps)
    r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--trajectory', '--roi', '200,100,80,70', '--accent', acc, '--json', os.path.join(tmp, 'sweep.json')],
                       capture_output=True, text=True)
    check(r.returncode == 1, 'a hue sweep leaves the accent hue and fails the one-hue gate')
    shutil.rmtree(tmp, ignore_errors=True)
    print('look-audit self-test: ' + ('all pass' if not bad else f'{bad} failed'))
    return 1 if bad else 0


def oklch_rgb(L, C, h):
    """sRGB 0-255 of an OKLCH colour (clipped to the gamut)."""
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    lin = (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
           -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)
    out = []
    for v in lin:
        v = min(1.0, max(0.0, v))
        out.append(int(round(255 * (12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055))))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument('video', nargs='?')
    ap.add_argument('--json', help='write the report here (e.g. out/qa/look.json)')
    ap.add_argument('--cues', help='out/cues.json: acts, copy, the look and the declarations')
    ap.add_argument('--layout', help='a layout-audit.sh JSON (text boxes): type sizes and word arrivals')
    ap.add_argument('--tokens', help='brand tokens (default src/brand/tokens.ts when present): the accent and brand-supplied colours')
    ap.add_argument('--accent', help='the accent colour (#RRGGBB), if not from the tokens')
    ap.add_argument('--brand', help='brand-supplied colours, comma separated #RRGGBB')
    ap.add_argument('--imagery', action='append', help='x,y,w,h of a region that holds imagery (excluded from the colour checks; repeatable)')
    ap.add_argument('--width', type=int, default=480, help='analysis width (960 for finer reads)')
    ap.add_argument('--comp-width', type=int, help='composition width of the layout boxes (default the video width)')
    ap.add_argument('--comp-height', type=int, help='composition height of the layout boxes (default 1080)')
    ap.add_argument('--no-floor', action='store_true', help='report the floor without failing on it')
    ap.add_argument('--no-finish', action='store_true', help='skip the full-resolution grain and vignette samples')
    ap.add_argument('--no-audio', action='store_true', help='skip the audio onsets (cut sync)')
    ap.add_argument('--trajectory', action='store_true', help='the one-hue gate on --roi instead of the film checks')
    ap.add_argument('--roi', help='x,y,w,h for --trajectory (video pixels)')
    ap.add_argument('--target', help='--trajectory target JSON: {"L": [...], "C": [...]} per frame or {"bounds": {"L": [lo, hi], "C": [lo, hi]}}')
    ap.add_argument('--tol', type=float, default=0.01, help='--trajectory MAE tolerance on L and C')
    ap.add_argument('--hue-tol', type=float, default=6.0, help='--trajectory hue tolerance in degrees')
    ap.add_argument('--from', dest='from_frame', type=int)
    ap.add_argument('--to', dest='to_frame', type=int)
    ap.add_argument('--series', help='also write the per-frame motion series here (camera, layers, ground, pair speed, cuts)')
    ap.add_argument('--self-test', action='store_true', help='run the checks on synthetic clips made in code, then exit')
    args = ap.parse_args()
    global cv2, np
    try:
        import cv2  # noqa: F401
        import numpy as np  # noqa: F401
    except ImportError as e:
        die(f'needs numpy and opencv-python ({e})')
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import forensics as F
    if args.self_test:
        sys.exit(self_test(F))
    if not args.video:
        ap.error('a video is required (or --self-test)')
    info = F.probe(args.video)
    if args.trajectory:
        res = trajectory(args, info, F)
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            json.dump(res, open(args.json, 'w'), indent=1)
        print(f"look-audit trajectory: {res['frames']} frames, {len(res['off_hue'])} off the accent hue (+-{args.hue_tol:g} deg)"
              + (f", MAE L {res['mae']['L']} C {res['mae']['C']}" if 'mae' in res else '') + f" -> {'pass' if res['pass'] else 'FAIL'}")
        sys.exit(0 if res['pass'] else 1)
    cues = F.load_cues(args.cues) if args.cues else None
    raw_cues = json.load(open(args.cues)) if args.cues else None
    extra = F.declared_of(cues) if cues else {}
    if raw_cues is not None:
        cues['copy'] = [x for x in (raw_cues.get('copy') or []) if isinstance(x, dict) and 'resolved' in x]
        cues['bpm'] = raw_cues.get('bpm')
        cues['music'] = raw_cues.get('music')
    tokens = args.tokens or ('src/brand/tokens.ts' if os.path.exists('src/brand/tokens.ts') else None)
    accent, brand = brand_colours(tokens, args.brand)
    accent = args.accent or accent
    layout = load_layout(args.layout)
    probe_m, S, size = measure(args, info, F, accent, brand, layout, cues)
    flags, floor, measures = evaluate(args, info, F, probe_m, S, size, cues, extra, layout, accent, brand)
    if args.series:
        win = {int(f): {k: v for k, v in w.items() if k in ('cam_pxs', 'cam_pct', 'cam_k', 'layer_pxs', 'plane2_pxs', 'ground_cps', 'live', 'moving', 'moving_share', 'change')} for f, w in probe_m.win.items()}
        pr = {int(f): dict(speed=p.get('speed'), vec=p.get('vec'), cut=p.get('cut')) for f, p in probe_m.pair.items()}
        os.makedirs(os.path.dirname(os.path.abspath(args.series)), exist_ok=True)
        json.dump(dict(fps=info['fps'], k=probe_m.k, window=win, pair=pr, ground_L=S['ground_L'], luma=S['luma'], starts=S.get('starts', [])), open(args.series, 'w'))
    fails = sum(1 for x in flags if x['severity'] == 'fail')
    res = dict(tool='look-audit', file=args.video, fps=info['fps'], size=[info['w'], info['h']], analysis=list(size), pass_=fails == 0,
               fails=fails, warnings=sum(1 for x in flags if x['severity'] == 'warn'), accent=accent, brand=brand,
               look=(extra or {}).get('look'), flags=flags, floor=floor, measures=measures)
    res['pass'] = res.pop('pass_')
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        json.dump(res, open(args.json, 'w'), indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
    print(f"look-audit: {args.video}  {measures['frames']} frames @ {info['fps']:g} fps  {'PASS' if res['pass'] else 'FAIL'}  "
          f"({fails} fail, {res['warnings']} warn); floor {'pass' if floor['pass'] else 'FAIL'}: moving {floor['moving']['share']}, "
          f"depth {floor['depth']['share']}, carried {floor['carried']['share']}, device gap {floor['device']['max_gap_s']} s, "
          f"light {sum(1 for r in floor['light']['acts'] if r['light'])}/{len(floor['light']['acts'])} acts, scale {floor['scale']['share']}")
    for x in flags[:30]:
        print(f"  {x['severity']:4s} {x['check']:16s} f{x['frame']}: {x['note']}")
    if args.json:
        print(f'  report: {args.json}')
    sys.exit(0 if res['pass'] else 1)


if __name__ == '__main__':
    main()
