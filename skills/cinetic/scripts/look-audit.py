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
                  accent family; imagery is excluded with --imagery. A support hue declared in the tokens
                  (C.second, or --second) that is not a second accent (see second-hue) does not count as a group
  banned-hue      fail: saturated colour in a banned region (orange/amber, beige/cream, purple/violet,
                  neon) on >= 0.5 % of the frame for >= 3 samples, unless it is a brand-supplied colour
                  (tokens lines marked cinetic:brand-supplied, or --brand). Brand colours are checked
                  only for contrast (here: none) and the one-accent rule: hue-count counts the hues of
                  every brand-supplied colour together as one family (a mark of three hues is one brand)
  accent-share    the accent's hue family (within 20 degrees) covers more than 25 % of the frame outside a
                  declared colour event and outside one designed flood (a run <= 2 s)
  second-hue      a second hue (>= 1 % of the frame, 40 degrees or more from the accent) shows in more than
                  80 % of the samples and covers more than 15 % of the frame while it shows: a second accent.
                  The house palette is the accent plus a support hue in 10-30 % of the samples at up to 8 % of
                  the frame (under 9 % of the samples is a picture-target miss: timid colour)
  tinted-ink      pure #000 ink or ground on more than 10 % of samples; a pure #FFF ground without
                  LOOK.whiteWorld (brand-supplied black or white excepted)
  negative-space  in reading windows the non-ground share has a median over 30 %, or a dense run
                  (> 30 %) lasts more than 6 s
  living-ground   the camera stands still for more than 0.8 s while the ground does not change either
                  (outside the end lock)
  clean-finish    grain on flat ground over 0.6 L* (full-resolution samples) or a vignette over 2 %
                  unless LOOK.texture is not 'clean'
  type-size       (--layout) cap height off its role's band (caption 2.3-4 %, statement 5-14 %, hero
                  14-26 %, giant 26-90 % of the frame height: line 120 px is 8 %, display 200 13 %), more than 2 non-UI sizes at once, a
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

The picture floor (fail; beside the motion floor, which is blind to content: lib/look.ts PICTURE). Body
frames for flat, edges and bleed; every frame for colour and bars. Type reads large and frontal on clean,
flat grounds; texture is an accent, not the ground of every shot:
  picture-flat     flat ground (16 px blocks at 480 wide with std < 1.5 levels): mean >= 0.25 and >= 5 % of
                   frames over 60 % flat (a clean field somewhere: not everything on texture), mean <= 0.90
                   (an empty film)
  picture-edges    busy-ness: Canny edge pixels <= 12 % of the frame on average (texture and footage
                   everywhere), and >= 0.6 % (an empty film)
  picture-saturated colour mass: pixels at OKLCH C >= 0.06 >= 2.2 % of the frame on average
  picture-wash     the ceiling: saturated pixels over 60 % of the frame on average, or more than 65 % of the
                   frames over half saturated (frames inside a declared colour event are left out): one hue
                   over the whole picture hides the accent it was meant to show
  picture-bleed    the subject (the largest region of structure) touches two frame edges and spans >= 60 %
                   of the frame one way in at least a quarter of the acts (no cues: 8 s parts)
  skeleton-bars    more than 3 glyphless bars in focus (solid, uniform, grey, text-line high, 3-60x as long,
                   sharp-edged) on 2 or more samples: placeholder lines, not content
  picture-target   (warn) the floor is cleared but the house target is not:
                   flat 0.43-0.85 and >= 18 % of frames over 60 % flat (every type beat on a clean field, or on
                   a plate dimmed and defocused behind it), edges <= 5.9 %, saturated >= 6 %, bleed in every
                   act, and a crisp plane with a
                   defocused one (cell edge sharpness, size-independent) in >= 35 % of frames; colour: neutral
                   pixels (OKLCH C < 0.03) >= 40 %, saturated 4.5-32 %, <= 25 % of frames over half saturated,
                   the accent's hue family 6-15 % of the frame, a support hue in >= 9 % of the samples
                   (lib/look.ts COLOUR)
Framing and type (warn):
  framing-centred  the subject sits dead centre (within 8 %) and inside the frame in over half the samples
  framing-hold     one framing held over 0.8 s with no depth plane moving (camera, second plane and layers still)
  small-text       (--layout) a string under 36 px at 1080p held over 6 f@60 (UI strings included)
--picture-only runs the picture floor alone (no motion probe; --every N reads every Nth frame, the colour and
framing samples stay at two a second). Colour events: cues `declared.colour` [{from, to}] (also inside
`declared.fx`), or --colour-event FROM,TO (frames; repeatable).

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
# the picture: what a frame holds (lib/look.ts PICTURE)
# ------------------------------------------------------------------------------------------
PIC = dict(
    # two levels: the floor (fail) and the house target (a picture-target warning): type on clean ground, texture as an accent
    flat_min=0.25, flat_max=0.90,  # mean share of flat 16 px blocks (at 480 wide): some clean ground, not an empty film
    flat_over=0.60, flat_frames=0.05,  # and at least 5 % of frames over 60 % flat (a clean field somewhere)
    edges_min=0.006, edges_max=0.12,  # mean edge-pixel share (Canny 60/140 at 480 wide): not empty, not busy everywhere
    saturated_min=0.022,  # mean share of saturated pixels (OKLCH C >= 0.06)
    sat_c=0.06,
    bleed_share=0.25,  # acts in which the subject bleeds off two edges at scale (a quarter; the target: every act)
    bleed_extent=0.60,  # a subject touching two frame edges, visible over >= 60 % of the frame's width or height
    skeleton_max=3,  # glyphless bars in focus in one frame
    skeleton_samples=2,  # samples over the limit before it fails
    crisp=0.6, soft=0.4, soft_floor=0.05, plane_ratio=1.5,  # cell edge sharpness (p99 gradient / contrast range): a crisp plane, a defocused form, their ratio
    target=dict(flat_min=0.43, flat_max=0.85, flat_share=0.18, edges_max=0.059, falloff_share=0.35, saturated_min=0.045, bleed_share=1.0,
                saturated_max=0.32, wash_share=0.25, neutral_min=0.40, accent=(0.06, 0.15), second_frames=0.09),
    # colour (lib/look.ts NEUTRAL, COLOUR): the wash ceiling fails, the neutral share and the accent band are targets
    neutral_c=0.03,  # a pixel under this chroma is neutral
    saturated_max=0.60,  # mean share of saturated pixels outside colour events
    wash_over=0.5, wash_share=0.65,  # no more than 65 % of the frames over half saturated
    hue_bin=10,  # degrees per bin of the saturated-hue histogram a sample keeps
    accent_deg=20,  # the accent's hue family
    accent_frame_max=0.25, flood_s=2.0,  # no frame over 25 % accent outside a colour event, one flood up to 2 s excepted
    second_deg=40, second_present=0.01, second_frames=(0.10, 0.30), second_share=0.08,  # a support hue beside the accent (the house palette)
    second_warn_frames=0.8, second_warn_share=0.15,  # a second accent: longer and larger than this warns
    centred=0.08,  # a subject whose centre sits within 8 % of the frame's centre (both ways) and touches no edge
    centred_share=0.5,  # warn when more than half of the framed samples are centred
    hold_s=0.8,  # a framing held this long with no depth plane moving
    text_min=36, text_hold60=6,  # px at 1080p, frames at 60 fps
)
PSEUDO_ACT_S = 8.0  # without cues, the bleed check judges 8 s segments as acts


def flat_share(gray):
    """Share of 16 px blocks (at the analysis size) with almost no variation (std < 1.5 levels)."""
    h, w = gray.shape
    hb, wb = h // 16, w // 16
    if hb < 1 or wb < 1:
        return 0.0
    b = gray[:hb * 16, :wb * 16].astype(np.float32).reshape(hb, 16, wb, 16).swapaxes(1, 2).reshape(hb, wb, 256)
    return float((b.std(axis=2) < 1.5).mean())


def focus_falloff(gray):
    """Depth of field in one frame: a sharp plane and a soft plane. A 4 x 4 grid; each cell's edge
    sharpness = the 99th percentile of its gradient over its contrast range (p98 - p2), which does not
    depend on the size of what is drawn (a crisp edge reads about 1.0 whatever the type size, a defocus
    of 2 px at 480 wide about 0.4-0.6, 6 px about 0.16-0.22, a smooth light ramp about 0.02). The frame
    has falloff when one cell is crisp (>= 0.6, range >= 24 levels) and another holds a defocused form
    (0.05-0.4, range >= 16): a smooth gradient or a plain plate is neither.
    Returns (falloff, raw): raw is a plain energy-ratio test (max/min Laplacian energy over contrast > 6),
    kept for comparison."""
    g = gray.astype(np.float32)
    h, w = g.shape
    ch, cw = h // 4, w // 4
    g = g[:ch * 4, :cw * 4]
    mag = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)) / 4.0
    lap = cv2.Laplacian(g, cv2.CV_32F)
    cells = lambda a: a.reshape(4, ch, 4, cw).swapaxes(1, 2).reshape(16, ch * cw)  # noqa: E731
    G, M, Lp = cells(g), cells(mag), cells(lap)
    lo_, hi_ = np.percentile(G, (2, 98), axis=1)
    rng = hi_ - lo_
    s = np.percentile(M, 99, axis=1) / np.maximum(rng, 1e-6)
    hi_s = s[rng >= 24]
    lo_s = s[(rng >= 16) & (s >= PIC['soft_floor'])]
    top = float(hi_s.max()) if hi_s.size else 0.0  # the crispest cell
    low = float(lo_s.min()) if lo_s.size else 9.0  # the softest cell that still holds a form
    sd = G.std(axis=1)
    keep = sd > 6
    ratios = (Lp.var(axis=1) / (G.var(axis=1) + 1e-6))[keep]
    raw = len(ratios) >= 3 and float(ratios.max() / (ratios.min() + 1e-9)) > 6
    return falloff_of(top, low), bool(raw), top, low


def falloff_of(top, low):
    """A sharp plane and a soft plane: the crispest cell at or above PIC crisp, the softest at or below PIC soft."""
    return bool(top >= PIC['crisp'] and low <= PIC['soft'] and top >= PIC['plane_ratio'] * low)


def subject_of(rgb, gray, nong, edges=None):
    """The frame's main subject: the largest region of structure (colour off the ground, or edges, closed
    over about 3 % of the width) that holds real edges. Returns its edge contacts, its visible extent,
    its centre and whether it bleeds (two edges, >= 60 % of the frame one way) or sits centred."""
    h, w = gray.shape
    e = edges if edges is not None else cv2.Canny(rgb, 60, 140) > 0
    k = max(3, int(round(0.03 * w)) | 1)
    mask = (nong | (cv2.dilate(e.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(mask, connectivity=8)
    best = None
    for i in range(1, n):
        area = int(st[i, cv2.CC_STAT_AREA])
        if area < 0.04 * h * w:
            continue
        x, y, bw, bh = (int(st[i, cv2.CC_STAT_LEFT]), int(st[i, cv2.CC_STAT_TOP]), int(st[i, cv2.CC_STAT_WIDTH]), int(st[i, cv2.CC_STAT_HEIGHT]))
        comp = lab[y:y + bh, x:x + bw] == i
        ed = float(e[y:y + bh, x:x + bw][comp].mean())
        if ed < 0.003:
            continue  # a smooth field (a gradient, a plate): not a subject
        if best is None or area > best['area']:
            touch = int(x <= 1) + int(y <= 1) + int(x + bw >= w - 1) + int(y + bh >= h - 1)
            best = dict(area=area, touch=touch, extent=max(bw / w, bh / h), cx=float(cen[i][0] / w), cy=float(cen[i][1] / h), box=[x, y, bw, bh])
    if best is None:
        return dict(found=False, bleed=False, centred=False)
    best['found'] = True
    best['share'] = round(best.pop('area') / (h * w), 4)
    best['bleed'] = bool(best['touch'] >= 2 and best['extent'] >= PIC['bleed_extent'])
    best['centred'] = bool(best['touch'] == 0 and abs(best['cx'] - 0.5) < PIC['centred'] and abs(best['cy'] - 0.5) < PIC['centred'])
    return best


def glyphless_bars(gray, C):
    """Placeholder bars in focus: solid, uniform, grey rounded bars the height of a text line (0.4-3.5 % of
    the frame height) and 3-60x as long, sharp at their edges. Real words break into letters, real charts
    and meters are coloured; a skeleton line is none of those."""
    h, w = gray.shape
    g = gray.astype(np.float32)
    bg = cv2.medianBlur(gray, 31).astype(np.float32)
    diff = g - bg
    fg = (np.abs(diff) > 10).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    gy = np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)) / 4.0
    out = []
    for i in range(1, n):
        x, y, bw, bh, area = (int(st[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT, cv2.CC_STAT_AREA))
        if bh < max(2, 0.004 * h) or bh > 0.035 * h or bw < 3 * bh or bw > 0.6 * w or area < 0.82 * bw * bh:
            continue
        comp = lab[y:y + bh, x:x + bw] == i
        vals = g[y:y + bh, x:x + bw][comp]
        if vals.std() > 5 or float(C[y:y + bh, x:x + bw][comp].mean()) > 0.05:
            continue
        contrast = float(np.abs(diff[y:y + bh, x:x + bw][comp]).mean())
        edge = float(gy[max(0, y - 1):min(h, y + bh + 1), x:x + bw].max())
        if contrast > 0 and edge >= 0.35 * contrast:
            out.append([x, y, bw, bh])
    return out


def pic_frame(P, f, rgb, gray):
    """The per-frame picture reads (every frame): flat share, edge share, focus falloff."""
    e = cv2.Canny(rgb, 60, 140) > 0
    fo, raw, top, low = focus_falloff(gray)
    P['f'].append(f)
    P['fall_top'].append(round(top, 3))
    P['fall_low'].append(round(low, 3))
    P['flat'].append(flat_share(gray))
    P['edges'].append(float(e.mean()))
    P['falloff'].append(fo)
    P['falloff_raw'].append(raw)
    return e


def hue_hist(C, H, keep=None):
    """Shares of the whole frame held by saturated pixels (outside imagery) per hue bin (PIC hue_bin degrees)."""
    sat = C >= PIC['sat_c']
    if keep is not None:
        sat = sat & keep
    nb = 360 // PIC['hue_bin']
    if not sat.any():
        return [0.0] * nb
    hist = np.bincount((H[sat] // PIC['hue_bin']).astype(int) % nb, minlength=nb) / float(sat.size)
    return [round(float(v), 4) for v in hist]


def hue_dist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def pic_sample(P, f, rgb, gray, C, nong, edges, H=None, keep=None):
    """The sampled picture reads (twice a second): colour mass (saturated, neutral, the saturated hues outside
    imagery), the subject's framing, placeholder bars."""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sub = subject_of(rgb, gray, nong, edges)
    bars = glyphless_bars(gray, C)
    if H is None:
        L_, A_, B_ = oklab(rgb)
        H = (np.degrees(np.arctan2(B_, A_)) + 360) % 360
    P['samples'].append(dict(f=f, sat=round(float((C >= PIC['sat_c']).mean()), 4),
                             sat_hsv=round(float(((hsv[..., 1] > 89) & (hsv[..., 2] > 64)).mean()), 4),
                             neu=round(float((C < PIC['neutral_c']).mean()), 4), hues=hue_hist(C, H, keep),
                             subject={k: (round(v, 3) if isinstance(v, float) else v) for k, v in sub.items()}, bars=len(bars), bar_boxes=bars[:12]))


def imagery_mask(shape, boxes):
    """True outside the declared imagery boxes (analysis pixels)."""
    keep = np.ones(shape, bool)
    for (x, y, w, h) in boxes:
        keep[max(0, y):y + h, max(0, x):x + w] = False
    return keep


def imagery_boxes(args, info, W):
    k = W / info['w']
    out = []
    for spec in getattr(args, 'imagery', None) or []:
        x, y, w, h = [float(v) for v in spec.split(',')]
        out.append((int(x * k), int(y * k), int(w * k), int(h * k)))
    return out


def colour_events(raw_cues, args, k_=1.0):
    """Declared colour events in film frames: cues `declared.colour` (and inside `declared.fx`), --colour-event."""
    out = []
    d = (raw_cues or {}).get('declared') or {}
    rows = list(d.get('colour') or [])
    for x in d.get('fx') or []:
        if isinstance(x, dict):
            rows += list(x.get('colour') or [])
    for r in rows:
        if isinstance(r, dict) and isinstance(r.get('from'), (int, float)) and isinstance(r.get('to'), (int, float)) and r['to'] > r['from']:
            out.append((int(round(r['from'] * k_)), int(round(r['to'] * k_))))
    for spec in getattr(args, 'colour_event', None) or []:
        a, b = [int(float(v)) for v in spec.split(',')]
        if b > a:
            out.append((a, b))
    return out


def new_pic():
    return dict(f=[], flat=[], edges=[], falloff=[], falloff_raw=[], fall_top=[], fall_low=[], samples=[])


def nonground(rgb):
    gcol, _ = ground_of(rgb)
    return gcol, np.abs(rgb.astype(np.int16) - gcol.astype(np.int16)[None, None, :]).max(axis=2) > 16


def measure_picture(args, info, F):
    """The picture reads alone (no motion probe): a fast pass for --picture-only."""
    fps = info['fps']
    W = min(args.width, info['w']) // 2 * 2
    H = int(round(info['h'] * W / info['w'])) // 2 * 2
    cstep = max(1, int(round(fps / 2)))
    P = new_pic()
    every = max(1, args.every)
    keep = None
    boxes = imagery_boxes(args, info, W)
    for f, rgb in F.decode(args.video, info, 0, None, size=(W, H)):
        frame, sample = f % every == 0, f % cstep == 0
        if not (frame or sample):
            continue
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        e = pic_frame(P, f, rgb, gray) if frame else cv2.Canny(rgb, 60, 140) > 0
        if sample:
            L, A, B = oklab(rgb)
            _, nong = nonground(rgb)
            if boxes and keep is None:
                keep = imagery_mask(L.shape, boxes)
            pic_sample(P, f, rgb, gray, np.hypot(A, B), nong, e, (np.degrees(np.arctan2(B, A)) + 360) % 360, keep)
    return P, (W, H)


def colour_reads(P, fps, events=None, accent_h=None, second_h=None):
    """The colour of the picture from the samples: neutral share, saturated mass and the wash ceiling (frames
    inside declared colour events left out), the accent's hue family (the given accent's hue, or the film's
    dominant saturated hue), the flood runs over the per-frame ceiling and the second hue."""
    smp = P['samples']
    events = events or []
    inside = lambda f: any(a <= f < b for a, b in events)  # noqa: E731
    out_ = [s for s in smp if not inside(s['f'])]
    nb = 360 // PIC['hue_bin']
    centre = lambda i: i * PIC['hue_bin'] + PIC['hue_bin'] / 2  # noqa: E731
    tot = np.zeros(nb)
    for s in smp:
        if s.get('hues'):
            tot += np.array(s['hues'])
    source = 'tokens'
    if accent_h is None:
        sm = tot + np.roll(tot, 1) + np.roll(tot, -1)
        accent_h = float(centre(int(np.argmax(sm)))) if sm.max() > 0 else None
        source = 'dominant'
    acc_bins = [i for i in range(nb) if accent_h is not None and hue_dist(centre(i), accent_h) <= PIC['accent_deg']]
    far = [i for i in range(nb) if accent_h is None or hue_dist(centre(i), accent_h) >= PIC['second_deg']]
    rows = []
    for s in smp:
        hs = s.get('hues') or [0.0] * nb
        acc = sum(hs[i] for i in acc_bins)
        sec, sec_h = 0.0, None
        for i in far:
            v = hs[i] + (hs[(i - 1) % nb] if (i - 1) % nb in far else 0) + (hs[(i + 1) % nb] if (i + 1) % nb in far else 0)
            if v > sec:
                sec, sec_h = v, centre(i)
        rows.append(dict(f=s['f'], acc=round(acc, 4), sec=round(sec, 4), sec_h=sec_h, event=inside(s['f'])))
    # flood runs: samples over the per-frame accent ceiling outside events; one run up to flood_s is the designed flood
    over = [r for r in rows if r['acc'] > PIC['accent_frame_max'] and not r['event']]
    runs, cur = [], []
    step = int(round(fps / 2)) + 1
    for r in over:
        if cur and r['f'] - cur[-1]['f'] > step:
            runs.append(cur)
            cur = []
        cur.append(r)
    if cur:
        runs.append(cur)
    run_rows = [dict(frames=[r[0]['f'], r[-1]['f']], s=round((r[-1]['f'] - r[0]['f']) / fps, 2)) for r in runs]
    flood_ok = not runs or (len(runs) == 1 and run_rows[0]['s'] <= PIC['flood_s'])
    present = [r for r in rows if r['sec'] >= PIC['second_present']]
    sec_frames = len(present) / max(1, len(rows))
    sec_when = float(np.mean([r['sec'] for r in present])) if present else 0.0
    sec_hues = [r['sec_h'] for r in present if r['sec_h'] is not None]
    sec_hue = None
    if sec_hues:
        a = np.radians(sec_hues)
        sec_hue = round(float(np.degrees(np.arctan2(np.sin(a).mean(), np.cos(a).mean())) % 360), 1)
    declared = second_h is not None and sec_hue is not None and hue_dist(sec_hue, second_h) <= 30
    second_accent = sec_frames > PIC['second_warn_frames'] and sec_when > PIC['second_warn_share']
    support = not second_accent  # a support hue: anything short of a second accent (target 10-30 % of the samples, <= 8 % of the frame)
    sat_out = float(np.mean([s['sat'] for s in out_])) if out_ else 0.0
    wash = float(np.mean([s['sat'] > PIC['wash_over'] for s in out_])) if out_ else 0.0
    neutral = float(np.mean([s.get('neu', 0.0) for s in smp])) if smp else 0.0
    acc_mean = float(np.mean([r['acc'] for r in rows])) if rows else 0.0
    return dict(neutral=round(neutral, 4), saturated=round(sat_out, 4), wash_share=round(wash, 3), events=[list(e) for e in events],
                accent=dict(h=None if accent_h is None else round(accent_h, 1), source=source, mean=round(acc_mean, 4),
                            p95=round(float(np.percentile([r['acc'] for r in rows], 95)), 4) if rows else 0.0, runs=run_rows, flood_ok=flood_ok),
                second=dict(h=sec_hue, frames=round(sec_frames, 3), share_when=round(sec_when, 4), support=support, second_accent=second_accent, declared=declared))


def picture_floor(P, fps, n, acts, end_rng=None, events=None, accent_h=None, second_h=None):
    """The picture floor from the reads: flat ground, edges, saturated, bleed, skeleton bars (fail), the
    house target on the same reads plus focus falloff (warn), and the framing read (centred subjects).
    Frames inside the end lock are left out of flat, edges, falloff and bleed (an end card may sit on a
    plain ground); colour mass and skeleton bars count every frame."""
    body = [i for i, f in enumerate(P['f']) if not (end_rng and end_rng[0] <= f < end_rng[1])] or list(range(len(P['f'])))
    flat = [P['flat'][i] for i in body]
    edges = [P['edges'][i] for i in body]
    fall = [falloff_of(P['fall_top'][i], P['fall_low'][i]) for i in body] if P.get('fall_top') else [P['falloff'][i] for i in body]
    smp = [s for s in P['samples'] if not (end_rng and end_rng[0] <= s['f'] < end_rng[1])] or P['samples']
    flat_mean = float(np.mean(flat)) if flat else 0.0
    flat_over = float(np.mean([x > PIC['flat_over'] for x in flat])) if flat else 0.0
    edges_mean = float(np.mean(edges)) if edges else 0.0
    fall_share = float(np.mean(fall)) if fall else 0.0
    sat_mean = float(np.mean([s['sat'] for s in P['samples']])) if P['samples'] else 0.0
    rows = acts if acts else [(f'part{i + 1}', (a, min(n, a + int(PSEUDO_ACT_S * fps)))) for i, a in enumerate(range(0, max(1, n), int(PSEUDO_ACT_S * fps)))]
    bleed_rows = []
    for name, (a, b) in rows:
        inside = [s for s in smp if a <= s['f'] < b]
        if not inside:
            continue
        hit = next((s['f'] for s in inside if s['subject'].get('bleed')), None)
        bleed_rows.append(dict(act=name, frames=[a, b], bleed_at=hit, ok=hit is not None))
    bleed_share = sum(1 for r in bleed_rows if r['ok']) / max(1, len(bleed_rows)) if bleed_rows else 1.0
    over = [s['f'] for s in P['samples'] if s['bars'] > PIC['skeleton_max']]
    framed = [s for s in smp if s['subject'].get('found')]
    centred = [s['f'] for s in framed if s['subject'].get('centred')]
    T = PIC['target']
    col = colour_reads(P, fps, events, accent_h, second_h)
    pf = dict(
        flat=dict(mean=round(flat_mean, 3), frames_over=round(flat_over, 3), need=dict(mean=[PIC['flat_min'], PIC['flat_max']], frames_over=PIC['flat_frames']),
                  target=dict(mean=[T['flat_min'], T['flat_max']], frames_over=T['flat_share']),
                  ok=PIC['flat_min'] <= flat_mean <= PIC['flat_max'] and flat_over >= PIC['flat_frames'],
                  target_ok=T['flat_min'] <= flat_mean <= T['flat_max'] and flat_over >= T['flat_share']),
        edges=dict(mean=round(edges_mean, 4), need=[PIC['edges_min'], PIC['edges_max']], target=T['edges_max'], ok=PIC['edges_min'] <= edges_mean <= PIC['edges_max'],
                   target_ok=PIC['edges_min'] <= edges_mean <= T['edges_max']),
        saturated=dict(mean=round(sat_mean, 4), hsv=round(float(np.mean([s['sat_hsv'] for s in P['samples']])) if P['samples'] else 0.0, 4), need=PIC['saturated_min'],
                       target=T['saturated_min'], ok=sat_mean >= PIC['saturated_min'], target_ok=sat_mean >= T['saturated_min']),
        bleed=dict(acts=bleed_rows, share=round(bleed_share, 3), need=PIC['bleed_share'], target=T['bleed_share'], ok=bleed_share >= PIC['bleed_share'] - 1e-9,
                   target_ok=bleed_share >= T['bleed_share'] - 1e-9),
        skeleton=dict(frames=over[:20], samples=len(over), max_bars=max([s['bars'] for s in P['samples']] or [0]), need=PIC['skeleton_max'], ok=len(over) < PIC['skeleton_samples'],
                      target_ok=len(over) < PIC['skeleton_samples']),
        # depth of field is a target only: the motion floor (floor-depth) already asks for two planes at different rates
        falloff=dict(share=round(fall_share, 3), raw=round(float(np.mean([P['falloff_raw'][i] for i in body])) if body else 0.0, 3), target=T['falloff_share'], ok=True,
                     target_ok=fall_share >= T['falloff_share']),
        # the colour wash: a ceiling on saturated mass (fail) beside the floor; neutral share and the accent band are targets
        wash=dict(saturated=col['saturated'], frames_over=col['wash_share'], need=[PIC['saturated_max'], PIC['wash_share']], target=[T['saturated_max'], T['wash_share']],
                  ok=col['saturated'] <= PIC['saturated_max'] and col['wash_share'] <= PIC['wash_share'],
                  target_ok=col['saturated'] <= T['saturated_max'] and col['wash_share'] <= T['wash_share']),
        neutral=dict(mean=col['neutral'], target=T['neutral_min'], ok=True, target_ok=col['neutral'] >= T['neutral_min']),
        accent=dict(mean=col['accent']['mean'], h=col['accent']['h'], source=col['accent']['source'], target=list(T['accent']), ok=True,
                    target_ok=T['accent'][0] <= col['accent']['mean'] <= T['accent'][1]),
        # a support hue beside the accent (target only): one accent on grey with nothing beside it reads as timid colour
        second=dict(frames=col['second']['frames'], h=col['second']['h'], target=T['second_frames'], ok=True, target_ok=col['second']['frames'] >= T['second_frames']),
    )
    pf['colour'] = col
    pf['ok'] = all(v['ok'] for v in pf.values() if isinstance(v, dict) and 'ok' in v)
    misses = [k for k, v in pf.items() if isinstance(v, dict) and 'target_ok' in v and not v['target_ok']]
    pf['target'] = dict(ok=not misses, misses=misses)
    framing = dict(samples=len(framed), centred=len(centred), centred_share=round(len(centred) / max(1, len(framed)), 3), centred_frames=centred[:20],
                   bleed_share=round(sum(1 for s in framed if s['subject'].get('bleed')) / max(1, len(framed)), 3))
    return pf, framing


def picture_line(video, pf, framing, ok):
    """One summary line of the picture floor (and the target's misses)."""
    tgt = 'met' if pf['target']['ok'] else 'missed: ' + ', '.join(pf['target']['misses'])
    return ((f'look-audit picture: {video}  ' if video else 'picture ') + f"{'pass' if ok else 'FAIL'}: flat {pf['flat']['mean']} "
            f"({pf['flat']['frames_over'] * 100:.0f} % of frames over 60 %), edges {pf['edges']['mean'] * 100:.1f} %, falloff {pf['falloff']['share']}, "
            f"saturated {pf['saturated']['mean'] * 100:.1f} % ({pf['wash']['frames_over'] * 100:.0f} % of frames over half), neutral {pf['neutral']['mean'] * 100:.0f} %, "
            f"accent {pf['accent']['mean'] * 100:.1f} %, bleed {pf['bleed']['share'] * 100:.0f} % of acts, glyphless bars max {pf['skeleton']['max_bars']}, "
            f"centred {framing['centred_share']}; target {tgt}")


def picture_flags(pf, framing, add, fps):
    T = PIC['target']
    missing = ', '.join(r['act'] for r in pf['bleed']['acts'] if not r['ok'])
    msgs = {
        'flat': (f"{pf['flat']['mean'] * 100:.0f} % of the frame is flat ground on average (cap {PIC['flat_max'] * 100:.0f} %): an empty film; give every beat a subject "
                 f"(the product, a word at film size, imagery)") if pf['flat']['mean'] > PIC['flat_max'] else
                (f"{pf['flat']['mean'] * 100:.0f} % of the frame is flat ground on average (floor {PIC['flat_min'] * 100:.0f} %), {pf['flat']['frames_over'] * 100:.0f} % of frames over 60 % flat "
                 f"(floor {PIC['flat_frames'] * 100:.0f} %): everything sits on texture. Set the type beats on a clean field, or dim and defocus the plate behind the type "
                 f"(the house band: 43-85 % flat ground, 18 % of frames or more over 60 % flat); texture is an accent, not the ground of every shot"),
        'edges': (f"edge pixels {pf['edges']['mean'] * 100:.1f} % of the frame (ceiling {PIC['edges_max'] * 100:.0f} %, house <= 5.9 %): busy everywhere. "
                  f"Flatten, dim or defocus the texture and footage behind the type and give the eye a clean field") if pf['edges']['mean'] > PIC['edges_max'] else
                 f"edge pixels {pf['edges']['mean'] * 100:.1f} % of the frame (floor {PIC['edges_min'] * 100:.1f} %): the frame is near empty (no words, numbers, UI or imagery at film size)",
        'saturated': f"saturated pixels {pf['saturated']['mean'] * 100:.1f} % of the frame (floor {PIC['saturated_min'] * 100:.1f} %): colour mass, not a 1 % accent dot (the accent on what matters, a support hue, real imagery in its own colour, a declared colour moment)",
        'bleed': f"the subject bleeds off two edges at scale in {pf['bleed']['share'] * 100:.0f} % of the acts (floor {PIC['bleed_share'] * 100:.0f} %; missing: {missing}): "
                 f"frame the hero at 1.2x the frame or more, off-centre, cropped by it",
        'skeleton': f"{pf['skeleton']['samples']} sample(s) show more than {PIC['skeleton_max']} glyphless bars in focus (max {pf['skeleton']['max_bars']}): placeholder lines are not content; "
                    f"show real strings, numbers and images (src/kit)",
        'wash': f"one colour washes the picture: saturated pixels {pf['wash']['saturated'] * 100:.0f} % of the frame (ceiling {PIC['saturated_max'] * 100:.0f} %), "
                f"{pf['wash']['frames_over'] * 100:.0f} % of frames over half saturated (ceiling {PIC['wash_share'] * 100:.0f} %): grounds and UI neutral (C <= .025), "
                f"the accent on what matters, imagery graded natural; declare a deliberate colour moment (cues declared.colour)",
    }
    for key, msg in msgs.items():
        if not pf[key]['ok']:
            at = pf['skeleton']['frames'][0] if key == 'skeleton' and pf['skeleton']['frames'] else 0
            add('skeleton-bars' if key == 'skeleton' else f'picture-{key}', 'fail', at, msg)
    if pf['ok'] and not pf['target']['ok']:
        why = {
            'flat': f"flat ground {pf['flat']['mean'] * 100:.0f} % with {pf['flat']['frames_over'] * 100:.0f} % of frames over 60 % flat (target {T['flat_min'] * 100:.0f}-{T['flat_max'] * 100:.0f} % "
                    f"and >= {T['flat_share'] * 100:.0f} % of frames: the type beats on a clean field)",
            'edges': f"edges {pf['edges']['mean'] * 100:.1f} % (target <= {T['edges_max'] * 100:.1f} %: dim or defocus the texture behind the type)",
            'saturated': f"saturated {pf['saturated']['mean'] * 100:.1f} % (target >= {T['saturated_min'] * 100:.1f} %: commit to colour)",
            'bleed': f"bleed in {pf['bleed']['share'] * 100:.0f} % of acts (target: every act)",
            'falloff': f"a sharp and a soft plane in {pf['falloff']['share'] * 100:.0f} % of frames (target >= {T['falloff_share'] * 100:.0f} %)",
            'skeleton': 'glyphless bars',
            'wash': f"saturated {pf['wash']['saturated'] * 100:.0f} % (target <= {T['saturated_max'] * 100:.0f} %), {pf['wash']['frames_over'] * 100:.0f} % of frames over half saturated (target <= {T['wash_share'] * 100:.0f} %)",
            'neutral': f"neutral pixels {pf['neutral']['mean'] * 100:.0f} % (target >= {T['neutral_min'] * 100:.0f} %: grounds and surfaces neutral)",
            'accent': f"the accent's hue family {pf['accent']['mean'] * 100:.1f} % of the frame (target {T['accent'][0] * 100:.0f}-{T['accent'][1] * 100:.0f} %, on what matters)",
            'second': f"a second hue in {pf['second']['frames'] * 100:.0f} % of the samples (target 10-30 %: a support hue beside the accent, declared as C.second, or the photographs' own second hue)",
        }
        add('picture-target', 'warn', 0, 'the picture clears the floor but not the house target: ' + '; '.join(why[k] for k in pf['target']['misses']))
    if framing['samples'] >= 4 and framing['centred_share'] > PIC['centred_share']:
        add('framing-centred', 'warn', framing['centred_frames'][0] if framing['centred_frames'] else 0,
            f"the subject sits dead centre and inside the frame in {framing['centred_share'] * 100:.0f} % of framed samples: put it off-centre at 1.1-1.6x the frame, bleeding off an edge")


def colour_flags(pf, add):
    """The look's colour warnings from the picture's colour reads: the accent over its per-frame ceiling, a second
    hue large and long enough to be a second accent."""
    col = pf.get('colour') or {}
    acc = col.get('accent') or {}
    if acc and not acc.get('flood_ok', True):
        r0 = acc['runs'][0]
        add('accent-share', 'warn', r0['frames'][0], f"the accent's hue family covers more than {PIC['accent_frame_max'] * 100:.0f} % of the frame in {len(acc['runs'])} stretch(es) "
            f"(longest {max(r['s'] for r in acc['runs'])} s) outside a declared colour event: keep it a signal, with one designed flood of {PIC['flood_s']:g} s at most")
    sec = col.get('second') or {}
    if sec.get('h') is not None and sec.get('second_accent'):
        add('second-hue', 'warn', 0, f"a second hue ({sec['h']} deg) shows in {sec['frames'] * 100:.0f} % of the samples at {sec['share_when'] * 100:.1f} % of the frame: a second accent. "
            f"The support hue sits beside the accent ({PIC['second_frames'][0] * 100:.0f}-{PIC['second_frames'][1] * 100:.0f} % of the samples, <= {PIC['second_share'] * 100:.0f} % of the frame); "
            f"imagery in its own colours is declared with --imagery")


# ------------------------------------------------------------------------------------------
# inputs
# ------------------------------------------------------------------------------------------
def second_colour(tokens_path):
    """The declared second hue of a tokens file (a `second` colour), or None."""
    if tokens_path and os.path.exists(tokens_path):
        m = re.search(r"['\"]?second['\"]?\s*:\s*['\"](#[0-9a-fA-F]{6})['\"]", open(tokens_path, encoding='utf-8').read())
        if m:
            return m.group(1)
    return None


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
    S['pic'] = new_pic()
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
        edges_px = pic_frame(S['pic'], f, rgb, gray)
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
            pic_sample(S['pic'], f, rgb, gray, C, nong, edges_px, Hh, imagery_mask(L.shape, imagery) if imagery else None)
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
    acc_h = lch_of_hex(accent)[2] if accent else None
    sec_hex = getattr(args, 'second', None) or second_colour(getattr(args, 'tokens_path', None))
    pf, framing = picture_floor(S['pic'], fps, n, list(acts.items()) if acts else None, end_rng, getattr(args, 'events', None), acc_h,
                                lch_of_hex(sec_hex)[2] if sec_hex else None)
    floor['picture'] = pf
    if args.no_picture:
        pf['reported_only'] = True
    floor['pass'] = all(v['ok'] for k, v in floor.items() if isinstance(v, dict) and not (k == 'picture' and args.no_picture))
    if not args.no_floor and not args.no_picture:
        picture_flags(pf, framing, add, fps)
    colour_flags(pf, add)
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
    sec_read = (pf.get('colour') or {}).get('second') or {}
    if len(film_groups) >= 2 and sec_read.get('declared') and sec_read.get('support'):
        # the declared support hue, short of a second accent, is not a second accent family
        film_groups = [g for g in film_groups if hue_dist(g['h'], sec_read['h']) > 30] or film_groups
    brand_h = [lch[2] for lch in (lch_of_hex(b) for b in brand) if lch[1] >= 0.06]
    own = [g for g in film_groups if any(hue_dist(g['h'], bh) <= 20 for bh in brand_h)]
    if len(own) >= 2:
        # the brand-supplied hues are one family: the brand chose them together
        keep = max(own, key=lambda g: g['samples'])
        film_groups = [g for g in film_groups if g is keep or g not in own]
    if len(film_groups) >= 3:
        add('hue-count', 'fail', 0, f"{len(film_groups)} hue groups across the film ({', '.join(str(g['h']) for g in film_groups)} deg): one accent family; several hues live only inside imagery (--imagery)")
    elif len(film_groups) == 2:
        add('hue-count', 'warn', 0, f"2 hue groups more than 30 degrees apart ({film_groups[0]['h']} and {film_groups[1]['h']} deg): one accent family, plus a support hue declared in the tokens (C.second, or --second)")
    banned = [s for s in samples if s['banned'] >= 0.005]
    if len(banned) >= 3:
        add('banned-hue', 'fail', banned[0]['f'], f"a banned colour region (orange/amber, beige/cream, purple/violet or neon) covers >= 0.5 % of {len(banned)} samples; a brand-supplied colour is declared in the tokens (cinetic:brand-supplied) or with --brand")
    accs = [s for s in samples if s['accent'] is not None]
    # accent-share (the hue family over the per-frame ceiling) is raised with the picture flags
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
    # framing-hold: one framing held with no depth plane moving (the camera still, no second plane, no layer)
    fh_runs, cur = [], []
    for f in body:
        w = states.get(f)
        held = w is not None and w['cam_pxs'] < F.LIVE_PXS and w['cam_pct'] < F.LIVE_PCT and w.get('plane2_pxs', 0) < F.LIVE_PXS and w['layer_pxs'] < F.LIVE_PXS
        if held:
            cur.append(f)
        else:
            if len(cur) > PIC['hold_s'] * fps:
                fh_runs.append((cur[0], cur[-1]))
            cur = []
    if len(cur) > PIC['hold_s'] * fps:
        fh_runs.append((cur[0], cur[-1]))
    if fh_runs:
        a, b = max(fh_runs, key=lambda r: r[1] - r[0])
        add('framing-hold', 'warn', f'{a}-{b}', f'{len(fh_runs)} framing(s) held over {PIC["hold_s"]:g} s with no depth plane moving (longest {(b - a + 1) / fps:.1f} s): keep a plane travelling (a creep, a foreground pass, parallax) through every hold')
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
    small_rows = []
    if layout:
        # small-text: a string under 36 px (at 1080p) held in focus over 6 f@60, UI strings included
        frames_l = sorted(fr['frame'] for fr in layout.get('boxes', []))
        step = float(np.median(np.diff(frames_l))) if len(frames_l) >= 2 else 1.0
        seen = {}
        for fr in layout.get('boxes', []):
            hgt = fr.get('height') or layout.get('height') or args.comp_height or 1080
            for b in fr.get('boxes', []):
                px = b['px'] * 1080.0 / hgt
                if b.get('opacity', 1) < 0.5 or b.get('blur', 0) > 1 or px >= PIC['text_min']:
                    continue
                seen.setdefault(b['id'], []).append((fr['frame'], round(px, 1)))
        for bid, rows_ in seen.items():
            fs_ = [r[0] for r in rows_]
            run, best = [fs_[0]], [fs_[0]]
            for a_, b_ in zip(fs_, fs_[1:]):
                run = run + [b_] if b_ - a_ <= step * 1.5 else [b_]
                best = run if len(run) > len(best) else best
            held60 = ((best[-1] - best[0]) + step) * 60.0 / fps if len(best) >= 2 else 0.0
            if held60 > PIC['text_hold60']:
                small_rows.append(dict(id=bid, px=min(r[1] for r in rows_), frame=best[0], held60=round(held60, 1)))
        for r in small_rows[:12]:
            add('small-text', 'warn', r['frame'], f"\"{r['id']}\" at {r['px']:g} px held {r['held60']:g} f@60: under {PIC['text_min']} px (at 1080p) a string held in focus over {PIC['text_hold60']} f is mush; set it at 36+ (UI rebuilt for film at x1.8-2)")
        # role bands as cap height in % of the frame height: line 120 px is 8 %, display 200 13 %, hero 240 16 %, giant 400+ 27 %+
        bands = [('caption', 2.3, 4.0), ('statement', 5.0, 14.0), ('hero', 14.0, 26.0), ('giant', 26.0, 90.0)]
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
            add('type-size', 'warn', r['frame'], f"{r['id']}: {r['issue']}" + (f" (cap {r['cap']} % of the frame height; caption 2.3-4, statement 5-14, hero 14-26, giant 26-90)" if 'cap' in r else ''))
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
        type_issues=len(type_rows), words=word_rows, small_text=len(small_rows),
        picture=dict(flat=pf['flat']['mean'], flat_frames_over=pf['flat']['frames_over'], edges=pf['edges']['mean'], falloff=pf['falloff']['share'],
                     saturated=pf['saturated']['mean'], bleed_acts=[r['ok'] for r in pf['bleed']['acts']], bleed_share=pf['bleed']['share'], skeleton_samples=pf['skeleton']['samples'],
                     saturated_out=pf['wash']['saturated'], wash_share=pf['wash']['frames_over'], neutral=pf['neutral']['mean'], accent=pf['accent']['mean'],
                     accent_flood_ok=pf['colour']['accent']['flood_ok'], second_frames=pf['colour']['second']['frames'], second_support=pf['colour']['second']['support'], second_accent=pf['colour']['second']['second_accent'],
                     target_misses=pf['target']['misses'], pass_=pf['ok']),
        framing=framing,
    )
    measures['picture']['pass'] = measures['picture'].pop('pass_')
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
def self_test(F, part='all'):
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

    if part in ('all', 'a'):
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
        rep = run('hues-brand', three, extra=('--brand', '#DC2832,#1EA050,#285ADC'))
        check(not has(rep, 'hue-count') and rep.get('measures', {}).get('hue_groups') == 1,
              'three brand-supplied hues are one family', str(rep.get('measures', {}).get('hue_groups')))
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
    self_test_more(F, tmp, run, has, cues_for, card, dots, paper, check, part)
    shutil.rmtree(tmp, ignore_errors=True)
    print('look-audit self-test: ' + ('all pass' if not bad else f'{bad} failed'))
    return 1 if bad else 0


def self_test_more(F, tmp, run, has, cues_for, card, dots, paper, check, part='all'):
    """A bad and a good clip for every look check and picture rule (each must fire on the bad one and stay
    quiet on the good one). Clips are small (480 x 270 at 30 fps, 2-5 s)."""
    fps, w, h = 30, 480, 270

    def run_pic(name, frames, extra=()):
        clip = os.path.join(tmp, name + '.mp4')
        F.write_clip(clip, frames, fps)
        out = os.path.join(tmp, name + '.json')
        r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--picture-only', '--json', out, *extra], capture_output=True, text=True)
        try:
            return json.load(open(out))
        except (OSError, ValueError):
            print(r.stdout[-800:], r.stderr[-1500:])
            return {'flags': [], 'picture': {}, 'framing': {}}

    def write_json(name, obj):
        p = os.path.join(tmp, name)
        json.dump(obj, open(p, 'w'))
        return p

    def text_rows(img, x, y, rows, scale=0.5, col=(30, 32, 36), gap=22, th=1):
        for k, s in enumerate(rows):
            cv2.putText(img, s, (int(x), int(y + k * gap)), cv2.FONT_HERSHEY_SIMPLEX, scale, col, th, cv2.LINE_AA)
        return img

    def photo(seed, ww, hh, sat=True):
        """A dense, colourful, sharp 'picture': fine texture over coarse forms, tinted toward a teal-blue."""
        fine = F.texture(seed, ww, hh, scale=1.5, mean=128, amp=40).astype(np.float32)
        coarse = F.texture(seed + 50, ww, hh, scale=10, mean=128, amp=80).astype(np.float32)
        g = np.clip(coarse + (fine - fine.mean()), 0, 255)
        if not sat:
            return g.astype(np.uint8)
        return np.clip(g * np.array([0.3, 0.72, 1.0], np.float32)[None, None, :] + np.array([10, 20, 30], np.float32), 0, 255).astype(np.uint8)

    if part in ('all', 'a'):
        # --- the picture floor: an empty film fails every reading; a picture busy everywhere fails flat ground and
        # edges; type beats on a clean field beside a plate (its far half defocused) pass and meet the target
        empty = [card(paper, 180 + i * 0.3, 110, 70, (30, 32, 36)) for i in range(60)]
        rep_f = run_pic('pempty', empty)
        pf = rep_f.get('picture', {})
        check(bool(has(rep_f, 'picture-flat', 'fail')) and not pf.get('flat', {}).get('ok', True), 'a small card on paper fails picture-flat (an empty film)', f"flat {pf.get('flat', {}).get('mean')}")
        check(bool(has(rep_f, 'picture-edges', 'fail')), 'a near-empty frame fails picture-edges', f"edges {pf.get('edges', {}).get('mean')}")
        check(bool(has(rep_f, 'picture-saturated', 'fail')), 'grey on paper fails picture-saturated', f"saturated {pf.get('saturated', {}).get('mean')}")
        check(bool(has(rep_f, 'picture-bleed', 'fail')), 'a subject inside the frame fails picture-bleed')
        check(pf.get('falloff', {}).get('target_ok') is False, 'one sharp plane misses the falloff target', f"falloff {pf.get('falloff', {}).get('share')}")
        PB = photo(7, w + 200, h + 60, sat=False)
        PB = np.repeat((PB if PB.ndim == 2 else PB.mean(axis=2)).astype(np.uint8)[..., None], 3, axis=2)
        busy = [text_rows(PB[30:30 + h, 10 + i:10 + i + w].copy(), 30, 240, ['Harbour 11,000 coasts'], 0.5, (250, 250, 250)) for i in range(60)]
        rep_b = run_pic('pbusy', busy)
        pb_ = rep_b.get('picture', {})
        check(bool(has(rep_b, 'picture-flat', 'fail')), 'a caption on texture everywhere fails picture-flat (no clean ground)',
              f"flat {pb_.get('flat', {}).get('mean')}, frames over 60 % {pb_.get('flat', {}).get('frames_over')}")
        check(bool(has(rep_b, 'picture-edges', 'fail')), 'the same busy picture fails picture-edges (busy everywhere)', f"edges {pb_.get('edges', {}).get('mean')}")
        P0 = photo(3, w + 200, h + 60, sat=False)
        P0 = np.repeat((P0 if P0.ndim == 2 else P0.mean(axis=2)).astype(np.uint8)[..., None], 3, axis=2)
        green = (24, 150, 92)
        rich = []
        for i in range(90):
            img = paper.copy()
            if i < 40:  # a type beat on a clean field: the line large and frontal, the accent on one bar
                text_rows(img, 40 + i * 0.4, 120, ['Ears for'], 1.9, (30, 32, 36), 70, 4)
                text_rows(img, 40 + i * 0.4, 190, ['coding agents.'], 1.9, (30, 32, 36), 70, 4)
                cv2.rectangle(img, (40, 212), (330, 244), green, -1)
            else:  # a plate bleeding off three edges, its far half defocused, beside the type
                k = i - 40
                plate = cv2.GaussianBlur(P0[30:30 + h, 10 + k:10 + k + 260].copy(), (0, 0), 1.5)
                plate[:, :130] = cv2.GaussianBlur(plate[:, :130], (0, 0), 5)
                img[:, :260] = plate
                text_rows(img, 290, 110, ['Local.', 'CPU only.'], 1.3, (30, 32, 36), 56, 3)
                cv2.rectangle(img, (290, int(192 - k * 0.2)), (470, int(252 - k * 0.2)), green, -1)
                if 20 <= k < 40:  # the support hue on a second element, in about a quarter of the film
                    cv2.rectangle(img, (290, 20), (380, 60), (40, 120, 205), -1)
            rich.append(img)
        rep_r = run_pic('pclean', rich, ('--accent', '#18965C', '--second', '#2878CD'))
        pr = rep_r.get('picture', {})
        check(not has(rep_r, 'picture-target') and pr.get('target', {}).get('ok') is True, 'type beats on a clean field beside a plate meet the house target (no picture-target warning)',
              json.dumps({'target': pr.get('target'), 'flat': pr.get('flat', {}).get('mean'), 'edges': pr.get('edges', {}).get('mean')}))
        for key in ('flat', 'edges', 'falloff', 'saturated', 'bleed'):
            check(pr.get(key, {}).get('ok') is True and not has(rep_r, f'picture-{key}'), f'type on a clean field with a soft plate, colour and a bleeding plate passes picture-{key}',
                  json.dumps({k: v for k, v in pr.get(key, {}).items() if k != 'acts'})[:120])
        # skeleton bars: grey placeholder lines fail; real strings in the same layout pass
        skel, real = [], []
        for i in range(45):
            a, b = paper.copy(), paper.copy()
            for c in range(3):
                x0 = 30 + c * 150 + i * 0.2
                for img in (a, b):
                    cv2.rectangle(img, (int(x0), 70), (int(x0 + 130), 200), (255, 255, 255), -1)
                    cv2.circle(img, (int(x0 + 22), 92), 12, (200, 204, 210), -1)
                for k, ww in enumerate((96, 70, 84)):
                    cv2.rectangle(a, (int(x0 + 12), 120 + k * 22), (int(x0 + 12 + ww), 128 + k * 22), (206, 210, 216), -1)
                text_rows(b, x0 + 10, 128, ['Mara K.', 'shot 14', '48 of 48'], 0.42, (60, 64, 70))
            skel.append(a)
            real.append(b)
        rep = run_pic('skel', skel)
        check(bool(has(rep, 'skeleton-bars', 'fail')), 'grey skeleton lines on cards fail skeleton-bars', f"max {rep.get('picture', {}).get('skeleton', {}).get('max_bars')}")
        rep = run_pic('real', real)
        check(not has(rep, 'skeleton-bars'), 'the same cards with real strings pass skeleton-bars', f"max {rep.get('picture', {}).get('skeleton', {}).get('max_bars')}")
        # falloff (a target): crisp product UI alone misses it; the same UI with its far half defocused meets it
        def ui_frame(i):
            img = np.full((h, w, 3), (20, 90, 110), np.uint8)
            cv2.rectangle(img, (int(250 + i * 0.4), 24), (w + 60, h + 40), (236, 238, 241), -1)
            text_rows(img, 24, 50, ['Tide 48 shots', 'print Friday', 'approved 44', 'Mara K.', 'shot 14', '48 of 48'], 0.7, (250, 250, 250), 34)
            text_rows(img, 270 + i * 0.4, 70, ['Cover approved.', 'Can 22 go tighter?', 'Dust spot fixed.', 'Print confirmed.', 'Booked Thursday.'], 0.55, (30, 32, 36), 36)
            return img
        sharp = [ui_frame(i) for i in range(45)]
        rep = run_pic('sharp', sharp)
        check('falloff' in rep.get('picture', {}).get('target', {}).get('misses', []), 'crisp UI alone misses the falloff target',
              f"share {rep.get('picture', {}).get('falloff', {}).get('share')}")
        deep = []
        for i in range(45):
            img = ui_frame(i)
            img[:, w // 2:] = cv2.GaussianBlur(img[:, w // 2:], (0, 0), 6)
            deep.append(img)
        rep = run_pic('deep', deep)
        check('falloff' not in rep.get('picture', {}).get('target', {}).get('misses', ['?']), 'the same UI with its far half defocused meets the falloff target', f"share {rep.get('picture', {}).get('falloff', {}).get('share')}")
        # framing-centred: a card dead centre warns; the same card off-centre does not
        cen = [card(paper, 180 + i * 0.1, 99, 120, (30, 32, 36)) for i in range(75)]
        rep = run_pic('centred', cen)
        check(bool(has(rep, 'framing-centred', 'warn')), 'a subject held dead centre warns framing-centred', f"share {rep.get('framing', {}).get('centred_share')}")
        off = [card(paper, 40 + i * 0.1, 40, 150, (30, 32, 36)) for i in range(75)]
        rep = run_pic('offcentre', off)
        check(not has(rep, 'framing-centred'), 'the same subject off-centre does not', f"share {rep.get('framing', {}).get('centred_share')}")
        # --- colour: one hue over the frame fails picture-wash; neutral grounds with the accent on one card pass and
        # meet the colour targets; the wash declared as a colour event passes; a support hue sits beside the accent, a second accent warns
        slate, teal, green, blue = (52, 56, 60), (18, 112, 124), (24, 150, 92), (40, 120, 205)

        def ui_on(ground, i, accent_box=True, extra=None):
            img = np.full((h, w, 3), ground, np.uint8)
            cv2.rectangle(img, (int(200 + i * 0.3), 30), (w + 40, h - 30), (236, 238, 241), -1)
            text_rows(img, 216 + i * 0.3, 70, ['Coast series 48', 'print Friday', 'approved 44'], 0.55, (30, 32, 36), 34)
            if accent_box:
                cv2.rectangle(img, (24, int(150 - i * 0.2)), (150, int(250 - i * 0.2)), green, -1)  # the state that changed: ~10 % of the frame
            if extra:
                extra(img)
            return img
        wash = [ui_on(teal, i, accent_box=False) for i in range(60)]
        neutral_ui = [ui_on(slate, i) for i in range(60)]
        rep = run_pic('wash', wash)
        check(bool(has(rep, 'picture-wash', 'fail')), 'a frame washed in one hue fails picture-wash', json.dumps({k: rep.get('picture', {}).get('wash', {}).get(k) for k in ('saturated', 'frames_over')}))
        rep = run_pic('neutral-ui', neutral_ui)
        pc = rep.get('picture', {})
        misses = pc.get('target', {}).get('misses', ['?'])
        check(not has(rep, 'picture-wash') and not {'wash', 'neutral', 'accent'} & set(misses), 'neutral grounds with the accent on one card pass picture-wash and meet the colour targets',
              json.dumps({'neutral': pc.get('neutral', {}).get('mean'), 'accent': pc.get('accent', {}).get('mean'), 'misses': misses}))
        check('second' in misses, 'one accent alone misses the support-hue target', json.dumps(pc.get('second')))
        rep = run_pic('wash-most', wash + wash[:30] + neutral_ui[:30])
        check(bool(has(rep, 'picture-wash', 'fail')), 'three seconds of wash in four fail picture-wash undeclared', f"frames over half {rep.get('picture', {}).get('wash', {}).get('frames_over')}")
        rep = run_pic('wash-event', wash + wash[:30] + neutral_ui[:30], ('--colour-event', '0,90'))
        check(not has(rep, 'picture-wash'), 'the same wash declared as a colour event passes', f"frames over half {rep.get('picture', {}).get('wash', {}).get('frames_over')}")
        chip = lambda img: cv2.rectangle(img, (24, 30), (110, 90), blue, -1)  # noqa: E731  a support hue: ~4 % of the frame
        support = [ui_on(slate, i, extra=chip if 30 <= i < 60 else None) for i in range(120)]
        rep = run_pic('second-support', support, ('--second', '#2878CD'))
        ps = rep.get('picture', {})
        check(not has(rep, 'second-hue') and not has(rep, 'hue-count') and 'second' not in ps.get('target', {}).get('misses', ['second']),
              'a declared support hue in a quarter of the film at 4 % of the frame passes (no second-hue or hue-count warning, the target met)', json.dumps(ps.get('colour', {}).get('second')))
        big = lambda img: cv2.rectangle(img, (24, 10), (244, 150), blue, -1)  # noqa: E731  ~24 % of the frame, all film long
        second = [ui_on(slate, i, extra=big) for i in range(120)]
        rep = run_pic('second-accent', second, ('--accent', '#18965C'))
        check(bool(has(rep, 'second-hue', 'warn')), 'a second hue on a quarter of the frame all film long warns second-hue', json.dumps(rep.get('picture', {}).get('colour', {}).get('second')))

    if part in ('all', 'b'):
        # --- framing-hold and floor-device: a still frame held for 5 s; the rich film moves through both
        still = [card(paper, 140, 90, 120, (30, 32, 36))] * 180
        rep = run('still5', still, cues_for(180))
        check(bool(has(rep, 'framing-hold', 'warn')), 'a framing held still for 5 s warns framing-hold')
        check(bool(has(rep, 'floor-device', 'fail')), 'five seconds with nothing designed fail floor-device', f"gap {rep.get('floor', {}).get('device', {}).get('max_gap_s')}")
        check(bool(has(rep, 'living-ground', 'warn')), 'a still camera over a still ground warns living-ground')
        A = dots(31)
        moving = []
        for i in range(180):
            g = F.warp(A, dx=-i * 1.5, k=1 + 0.002 * i)[:h, :w]
            g = np.clip(g.astype(np.int16) + int(12 * math.sin(i / 9)), 0, 255).astype(np.uint8)
            moving.append(card(g, 60 + i * 1.6, 80, 140, (25, 60, 110), stripes=True))
        rep = run('moving5', moving, cues_for(180, seams=[dict(at=60, kind='velocity', carry='x', id='c1'), dict(at=120, kind='velocity', carry='x', id='c2')]))
        check(not has(rep, 'framing-hold') and not has(rep, 'living-ground'), 'a creeping ground with a card moving apart passes framing-hold and living-ground')
        check(rep.get('floor', {}).get('device', {}).get('ok') is True, 'designed seams every 2 s pass floor-device')

        # --- accent-share: the accent over 25 % of the frame for 3 s warns; at 3 % it does not
        acc_hex = '#1E78C8'
        acc = tuple(hex_rgb(acc_hex))
        big = [cv2.rectangle(paper.copy(), (20 + i // 4, 30), (20 + i // 4 + 300, 30 + 150), acc, -1) for i in range(90)]
        rep = run('accent-big', big, extra=('--accent', acc_hex))
        check(bool(has(rep, 'accent-share', 'warn')), 'the accent flooding 35 % of the frame for 3 s warns accent-share')
        small = [cv2.rectangle(paper.copy(), (20 + i // 4, 30), (20 + i // 4 + 60, 30 + 60), acc, -1) for i in range(90)]
        rep = run('accent-small', small, extra=('--accent', acc_hex))
        check(not has(rep, 'accent-share'), 'the accent on 3 % of the frame does not')

        # --- negative-space: a type scene that fills half the frame warns; one in open space does not
        copy_cues = cues_for(90)
        copy_cues['copy'] = [dict(id='line', text='every note in place', **{'in': 0}, resolved=4, out=86, read=[[4, 86]])]
        dense = [cv2.rectangle(paper.copy(), (10 + (i % 3), 10), (470, 150), (40, 44, 50), -1) for i in range(90)]
        rep = run('dense', dense, copy_cues)
        check(bool(has(rep, 'negative-space', 'warn')), 'a type scene filling half the frame warns negative-space')
        airy = [text_rows(paper.copy(), 60 + i * 0.2, 130, ['every note in place'], 0.9) for i in range(90)]
        rep = run('airy', airy, copy_cues)
        check(not has(rep, 'negative-space'), 'a line in open space does not')

        # --- clean-finish: grain over 0.6 L* on the flat ground warns (finish samples on); a clean ground does not
        rng = np.random.default_rng(5)
        grainy = []
        for i in range(60):
            img = card(paper, 40 + i, 60, 120, (30, 32, 36)).astype(np.int16)
            img += rng.normal(0, 4.0, img.shape[:2]).astype(np.int16)[..., None]
            grainy.append(np.clip(img, 0, 255).astype(np.uint8))
        clip = os.path.join(tmp, 'grainy.mp4')
        F.write_clip(clip, grainy, fps, crf=4)
        out = os.path.join(tmp, 'grainy.json')
        subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--json', out, '--no-audio', '--no-floor'], capture_output=True, text=True)
        rep = json.load(open(out)) if os.path.exists(out) else {'flags': []}
        check(bool(has(rep, 'clean-finish', 'warn')), 'grain on the flat ground warns clean-finish')
        clean = [card(paper, 40 + i, 60, 120, (30, 32, 36)) for i in range(60)]
        clip = os.path.join(tmp, 'clean.mp4')
        F.write_clip(clip, clean, fps, crf=4)
        out = os.path.join(tmp, 'clean.json')
        subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--json', out, '--no-audio', '--no-floor'], capture_output=True, text=True)
        rep = json.load(open(out)) if os.path.exists(out) else {'flags': [{'check': 'clean-finish'}]}
        check(not has(rep, 'clean-finish'), 'a clean flat ground does not')

    if part in ('all', 'c'):
        # --- luminance-flip: light to dark on a still hard cut warns; the same flip with motion across it does not
        dark = np.full((h, w, 3), (24, 26, 30), np.uint8)
        flip_still = [card(paper, 140, 90, 120, (30, 32, 36))] * 45 + [card(dark, 200, 100, 80, (230, 232, 236))] * 45
        rep = run('flip-still', flip_still)
        check(bool(has(rep, 'luminance-flip', 'warn')), 'a light-to-dark hard cut with nothing moving warns luminance-flip')
        TL, TD = F.texture(41, w, h, mean=215, amp=25), F.texture(42, w, h, mean=40, amp=25)
        flip_moving = [F.warp(TL, dx=-3 * i) for i in range(45)] + [F.warp(TD, dx=-3 * (45 + i)) for i in range(45)]
        rep = run('flip-moving', flip_moving)
        check(not has(rep, 'luminance-flip'), 'the same flip carried by motion on both sides does not')

        # --- blur-policy (crisp film): fast frames that lose their sharpness warn; crisp fast frames do not
        TB = F.texture(51, w + 400, h, scale=1.2)
        xs = [0] * 30 + [12 * k for k in range(1, 16)] + [180] * 30

        def strip(blurred):
            out_ = []
            for i, x in enumerate(xs):
                img = TB[:, x:x + w].copy()
                if blurred and 30 <= i < 45:
                    img = cv2.blur(img, (17, 1))
                out_.append(img)
            return out_

        rep = run('blur-soft', strip(True), cues_for(len(xs)))
        check(bool(has(rep, 'blur-policy', 'warn')), 'a crisp film whose fast frames blur warns blur-policy')
        rep = run('blur-crisp', strip(False), cues_for(len(xs)))
        check(not has(rep, 'blur-policy'), 'the same move kept sharp does not')

        # --- word arrivals (layout + copy): a word fading in place over 30 f warns word-first-frame, fade-detect and
        # arrival-front-load; a word cut on at most of its contrast and rising into place does not
        def word_clip(kind):
            frames_ = []
            for i in range(60):
                img = paper.copy()
                if i >= 10:
                    if kind == 'fade':
                        a = min(1.0, (i - 10) / 30)
                        y = 150
                    else:
                        a = 0.65 + 0.35 * min(1.0, (i - 10) / 3)
                        y = 150 + int(round(10 * (1 - min(1.0, (i - 10) / 4)) ** 2))
                    col = tuple(int(round(236 - (236 - 30) * a)) for _ in range(3))
                    cv2.putText(img, 'Approved', (120, y), cv2.FONT_HERSHEY_SIMPLEX, 1.6, col, 3, cv2.LINE_AA)
                frames_.append(img)
            return frames_

        wc = cues_for(60)
        wc['copy'] = [dict(id='word', text='Approved', **{'in': 10}, resolved=16, out=58)]
        layout_w = write_json('layout-word.json', dict(width=w, height=h, boxes=[dict(frame=20, width=w, height=h, boxes=[dict(id='word', px=120, x=116, y=112, w=200, h=48, opacity=1)])]))
        rep = run('word-fade', word_clip('fade'), wc, extra=('--layout', layout_w, '--comp-width', str(w), '--comp-height', str(h)))
        check(bool(has(rep, 'word-first-frame', 'warn')), 'a word fading in over 30 f warns word-first-frame')
        check(bool(has(rep, 'fade-detect', 'warn')), 'a word fading in place warns fade-detect')
        check(bool(has(rep, 'arrival-front-load', 'warn')), 'a linear arrival warns arrival-front-load')
        rep = run('word-cut', word_clip('cut'), wc, extra=('--layout', layout_w, '--comp-width', str(w), '--comp-height', str(h)))
        check(not has(rep, 'word-first-frame') and not has(rep, 'fade-detect') and not has(rep, 'arrival-front-load'), 'a word cut on at most of its contrast and rising into place passes all three')

        # --- type-size and small-text from the layout audit (the same clip, two layouts)
        lay_bad = write_json('layout-bad.json', dict(width=1920, height=1080, boxes=[dict(frame=f_, width=1920, height=1080, boxes=[
            dict(id='between', px=68, x=200, y=200, w=600, h=80, opacity=1), dict(id='label', px=24, x=200, y=700, w=300, h=30, opacity=1, ui=True)]) for f_ in range(0, 60, 6)]))
        lay_good = write_json('layout-good.json', dict(width=1920, height=1080, boxes=[dict(frame=f_, width=1920, height=1080, boxes=[
            dict(id='line', px=120, x=200, y=200, w=900, h=130, opacity=1), dict(id='label', px=40, x=200, y=700, w=300, h=48, opacity=1, ui=True)]) for f_ in range(0, 60, 6)]))
        plain = [card(paper, 40 + i, 60, 120, (30, 32, 36)) for i in range(60)]
        rep = run('type-bad', plain, None, extra=('--layout', lay_bad))
        check(bool(has(rep, 'type-size', 'warn')), 'a cap height between the role bands warns type-size')
        check(bool(has(rep, 'small-text', 'warn')), 'a 24 px label held for a second warns small-text')
        rep = run('type-good', plain, None, extra=('--layout', lay_good))
        check(not has(rep, 'type-size') and not has(rep, 'small-text'), 'a 120 px line and a 40 px label pass type-size and small-text')

        # --- image-develop: imagery that arrives at full colour in one frame (twice) warns; developing from grey does not
        ramp = np.linspace(0.15, 1.0, 200, dtype=np.float32)[None, :, None]  # a picture: its colour varies across it
        grey_, blue_ = np.array([150, 150, 150], np.float32), np.array([30, 110, 210], np.float32)

        def imagery(develop):
            frames_ = []
            for i in range(150):
                img = paper.copy()
                for t0 in (30, 90):
                    if t0 <= i < t0 + 45:
                        k = min(1.0, (i - t0) / 44) if develop else 1.0
                        block = grey_[None, None, :] + (blue_ - grey_)[None, None, :] * (k * ramp)
                        img[60:200, 100:300] = np.clip(np.repeat(block, 140, axis=0), 0, 255).astype(np.uint8)
                frames_.append(img)
            return frames_

        rep = run('img-pop', imagery(False))
        check(bool(has(rep, 'image-develop', 'warn')), 'imagery arriving at full colour warns image-develop')
        rep = run('img-dev', imagery(True))
        check(not has(rep, 'image-develop'), 'imagery developing from grey over 1 s does not')
    return 0


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
    ap.add_argument('--colour-event', action='append', help='FROM,TO frames of a declared colour event (the wash and accent ceilings pause; repeatable)')
    ap.add_argument('--second', help='the declared second hue (#RRGGBB), if not from the tokens (C.second)')
    ap.add_argument('--width', type=int, default=480, help='analysis width (960 for finer reads)')
    ap.add_argument('--comp-width', type=int, help='composition width of the layout boxes (default the video width)')
    ap.add_argument('--comp-height', type=int, help='composition height of the layout boxes (default 1080)')
    ap.add_argument('--no-floor', action='store_true', help='report the floor without failing on it')
    ap.add_argument('--no-picture', action='store_true', help='report the picture floor without failing on it (the motion floor still counts)')
    ap.add_argument('--picture-only', action='store_true', help='only the picture floor (no motion probe): a fast pass')
    ap.add_argument('--every', type=int, default=1, help='--picture-only: read every Nth frame (the samples stay at two a second)')
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
    ap.add_argument('--self-test', nargs='?', const='all', choices=['all', 'a', 'b', 'c'],
                    help='run the checks on synthetic clips made in code, then exit (a: the floor, colour and picture cases; b and c: the look rules; default all)')
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
        sys.exit(self_test(F, args.self_test))
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
    tokens = args.tokens or ('src/brand/tokens.ts' if os.path.exists('src/brand/tokens.ts') else None)
    args.tokens_path = tokens
    k_c = info['fps'] / (cues.get('fps') or info['fps']) if cues else 1.0
    args.events = colour_events(raw_cues, args, k_c)
    if args.picture_only:
        P, size = measure_picture(args, info, F)
        fps = info['fps']
        n = info['frames'] or (P['f'][-1] + 1 if P['f'] else 0)
        k_ = fps / (cues.get('fps') or fps) if cues else 1.0
        acts = [(k, (int(round(a * k_)), int(round(b * k_)))) for k, (a, b) in (cues or {}).get('acts', {}).items()] or None
        end = (extra or {}).get('end')
        end_rng = (int(round(end['from'] * k_)), int(round(end['to'] * k_))) if end else None
        acc_hex = args.accent or (brand_colours(tokens, args.brand)[0] if tokens else None)
        sec_hex = args.second or second_colour(tokens)
        pf, framing = picture_floor(P, fps, n, acts, end_rng, args.events, lch_of_hex(acc_hex)[2] if acc_hex else None, lch_of_hex(sec_hex)[2] if sec_hex else None)
        flags = []

        def add(check, severity, frame, note):
            flags.append(dict(check=check, severity=severity, frame=frame, t=round(frame / fps, 3), note=note))

        picture_flags(pf, framing, add, fps)
        colour_flags(pf, add)
        fails = sum(1 for x in flags if x['severity'] == 'fail') if not args.no_floor else 0
        res = dict(tool='look-audit', mode='picture-only', file=args.video, fps=fps, size=[info['w'], info['h']], analysis=list(size), pass_=fails == 0, fails=fails,
                   warnings=sum(1 for x in flags if x['severity'] == 'warn'), flags=flags, picture=pf, framing=framing, samples=P['samples'], frames=dict(f=P['f'], top=P['fall_top'], low=P['fall_low']))
        res['pass'] = res.pop('pass_')
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            json.dump(res, open(args.json, 'w'), indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        print(picture_line(args.video, pf, framing, res['pass']))
        for x in flags:
            print(f"  {x['severity']:4s} {x['check']:16s} f{x['frame']}: {x['note']}")
        sys.exit(0 if res['pass'] else 1)
    if raw_cues is not None:
        cues['copy'] = [x for x in (raw_cues.get('copy') or []) if isinstance(x, dict) and 'resolved' in x]
        cues['bpm'] = raw_cues.get('bpm')
        cues['music'] = raw_cues.get('music')
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
    na = 'n/a (one take)'
    print(f"look-audit: {args.video}  {measures['frames']} frames @ {info['fps']:g} fps  {'PASS' if res['pass'] else 'FAIL'}  "
          f"({fails} fail, {res['warnings']} warn); floor {'pass' if floor['pass'] else 'FAIL'}: moving {floor['moving']['share']}, "
          f"depth {floor['depth']['share']}, carried {na if floor['carried'].get('na') and measures['one_take'] else floor['carried']['share']}, device gap {floor['device']['max_gap_s']} s, "
          f"light {sum(1 for r in floor['light']['acts'] if r['light'])}/{len(floor['light']['acts'])} acts, scale {na if floor['scale'].get('na') and measures['one_take'] else floor['scale']['share']}")
    print('  ' + picture_line(None, floor['picture'], measures['framing'], floor['picture']['ok'] or args.no_picture))
    for x in flags[:30]:
        print(f"  {x['severity']:4s} {x['check']:16s} f{x['frame']}: {x['note']}")
    if args.json:
        print(f'  report: {args.json}')
    sys.exit(0 if res['pass'] else 1)


if __name__ == '__main__':
    main()
