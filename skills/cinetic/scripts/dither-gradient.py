#!/usr/bin/env python3
"""Bake soft backdrops (pools of light, vignettes, tabletop falloffs, floors) as dithered PNGs from a JSON spec.

Chromium renders CSS gradients in 8 bits. A ramp that spans only a few code values (a pool of light
on ink going 11 -> 29, a light table going 231 -> 247) shows as contour rings, and nothing downstream
(motion blur, encoder, grain added later) can remove bands that were quantized in the browser.
This script evaluates the same gradient in float, adds a +-1 LSB triangular (TPDF) dither and
quantizes once. Load the PNG with <Img src={staticFile('fx/NAME.png')}> (Remotion) or <img> in
HyperFrames, full-frame, instead of the CSS gradient.

Usage:
  python3 scripts/dither-gradient.py --spec backdrops.json --out public/fx [--preview out/qa/bands] [--check]
  python3 scripts/dither-gradient.py --example > backdrops.json    # print a starter spec

Spec (positions are fractions; colours are #RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba() or 'transparent'):
  {"size": [1920, 1080], "seed": 11,
   "backdrops": [
     {"name": "pool-ink", "type": "radial", "at": [0.5, 0.45], "radius": [0.7, 0.6],
      "stops": [["rgba(255,255,255,0.075)", 0], ["transparent", 0.7]]},
     {"name": "table", "base": "#E7E8EC", "type": "radial", "at": [0.5, 0.4], "radius": [0.65, 0.6],
      "stops": [["#F7F8FA", 0], ["#F7F8FA00", 0.75]]},
     {"name": "floor", "type": "linear", "angle": 180, "space": "oklab",
      "stops": [["#0B0C0E", 0], ["#16181C", 1]]},
     {"name": "stage", "base": "#0B0C0E", "layers": [ {...gradient...}, {...gradient...} ]}]}

  type radial: CSS 'radial-gradient(ellipse RX RY at CX CY, ...)' with RX/RY as fractions of width/
               height (or "radius": R px for a circle); stop positions along the ray (1 = ellipse edge).
  type linear: CSS 'linear-gradient(ANGLEdeg, ...)' (180 = top to bottom), stop positions along the
               CSS gradient line.
  space:       srgb (CSS default, premultiplied), linear (linear light) or oklab (smoothest ramps).
  base:        opaque colour under the layers -> RGB PNG; without base -> RGBA PNG (alpha dithered).

Light-field and key-light plates ("kind"; one colour each, so every plate is one hue by construction):
  {"name": "pool", "kind": "pool", "size": 800, "color": "#86B6F6", "peak": 0.45, "soft": 0.6}
        a square RGBA sprite: alpha = peak at the centre falling smoothly to 0 at the edge (soft = share
        of the radius that is falloff). fx/LightField.tsx moves it on a loop.
  {"name": "floor", "kind": "floor", "height": 270, "color": "#86B6F6", "peak": 0.7, "curve": 1.6,
   "sides": 0.18}
        a full-width RGBA strip: alpha = peak x (y / height)^curve rising toward the bottom edge
        ("profile": "smooth" uses smoothstep(y / height)^curve), optional falloff over `sides` of the
        width at both ends. Make it taller than the frame shows and LightField can lift it.
  {"name": "band", "kind": "loop", "width": 1920, "height": 400, "space": "oklab", "cycles": 1,
   "stops": [["#DCE8F8", 0], ["#B4CBEE", 1]], "fade": [0.25, 0.25]}
        a horizontally seamless tile (its colour follows 0.5 - 0.5 cos(2 pi cycles x / width) through
        the stops, so x = 0 and x = width meet exactly); `fade` softens the top and bottom edges (alpha).
  {"name": "shade", "kind": "shadow", "ground": "#8A8F96", "dL": 0.16, "lift": {"at": [0.3, 0.2],
   "radius": 0.9, "dL": 0.04}}
        an opaque full-frame plate in the ground's own hue, lightness lowered by dL (OKLCH, chroma kept):
        the tone fx/KeyLight.tsx shows through its shadow path. `lift` lightens it away from a point
        (shadows fill with sky light far from the key) without banding.
  {"name": "contact", "kind": "contact", "w": 600, "h": 360, "r": 40, "blur": 14, "color": "#0D0E10",
   "alpha": 0.32, "pad": 48}
        an RGBA sprite of a soft rounded rect (a contact or lifted-card shadow) with `pad` px of room for
        its blur; scale it by transform under the element.

Options: --dither LSB (1.0; 0 = off to see the bands), --size WxH (override), --preview DIR (writes
a x12 contrast-stretched copy per backdrop so bands would be obvious), --check (light-field rules:
one hue within 7 degrees and outside the banned hues, chroma <= 0.13, a visible lightness swing of
0.05-0.20 over the `over` ground a plate sits on, and no band: runs of one 8-bit value along a ramp
at p99.5 <= 24 px, longest <= 64 px; a plate with "brand": true is exempt from the hue and chroma rules), --quiet.
Prints a JSON report (files, code-value span per backdrop, banding risk as a CSS gradient, checks).
Exit 0 on success, 1 on a spec error, 3 when --check finds a problem.
"""
import argparse
import json
import math
import os
import re
import sys

# numpy and PIL load in main(), after the argument parser, so --help and --example run without them.
np = None
Image = None

EXAMPLE = {
    'size': [1920, 1080], 'seed': 11,
    'backdrops': [
        {'name': 'pool-ink', 'type': 'radial', 'at': [0.5, 0.45], 'radius': [0.7, 0.6],
         'stops': [['rgba(255,255,255,0.075)', 0], ['transparent', 0.7]]},
        {'name': 'table', 'base': '#E7E8EC', 'type': 'radial', 'at': [0.5, 0.4], 'radius': [0.65, 0.6],
         'stops': [['#F7F8FA', 0], ['#F7F8FA00', 0.75]]},
        {'name': 'floor', 'type': 'linear', 'angle': 180, 'space': 'oklab', 'stops': [['#0B0C0E', 0], ['#16181C', 1]]},
        {'name': 'pool', 'kind': 'pool', 'size': 800, 'color': '#86B6F6', 'peak': 0.45, 'soft': 0.6, 'over': '#F2F6FC'},
        {'name': 'floor-glow', 'kind': 'floor', 'height': 270, 'color': '#86B6F6', 'peak': 0.7, 'curve': 1.6, 'over': '#F2F6FC'},
        {'name': 'shade', 'kind': 'shadow', 'ground': '#8A8F96', 'dL': 0.16, 'lift': {'at': [0.3, 0.2], 'radius': 0.9, 'dL': 0.04}},
    ],
}


def fail(msg):
    sys.stderr.write(f'dither-gradient.py: {msg}\n')
    sys.exit(1)


def parse_color(c):
    """-> (r, g, b, a) floats, rgb in 0..1 gamma-encoded sRGB."""
    s = str(c).strip().lower()
    if s == 'transparent':
        return (0.0, 0.0, 0.0, 0.0)
    m = re.fullmatch(r'#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})', s)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = ''.join(ch * 2 for ch in h)
        v = [int(h[i:i + 2], 16) / 255 for i in range(0, len(h), 2)]
        return tuple(v[:3]) + ((v[3],) if len(v) == 4 else (1.0,))
    m = re.fullmatch(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)', s)
    if m:
        al = m.group(4)
        alpha = 1.0 if al is None else (float(al[:-1]) / 100 if al.endswith('%') else float(al))
        return (float(m.group(1)) / 255, float(m.group(2)) / 255, float(m.group(3)) / 255, alpha)
    fail(f'unknown colour {c!r}')


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def from_linear(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


M1 = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
      [0.0883024619, 0.2817188376, 0.6299787005]]
M2 = [[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
      [0.0259040371, 0.7827717662, -0.8086757660]]


def to_space(rgb, space):
    if space == 'srgb':
        return rgb
    lin = to_linear(rgb)
    if space == 'linear':
        return lin
    return np.cbrt(lin @ np.asarray(M1).T) @ np.asarray(M2).T  # oklab


def from_space(v, space):
    if space == 'srgb':
        return np.clip(v, 0, 1)
    if space == 'oklab':
        v = (v @ np.linalg.inv(np.asarray(M2)).T) ** 3 @ np.linalg.inv(np.asarray(M1)).T
    return from_linear(v)


def oklch(rgb):
    """gamma sRGB (..., 3) in 0..1 -> (L, C, h degrees)."""
    lab = to_space(np.asarray(rgb, dtype=np.float64), 'oklab')
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    return L, np.hypot(a, b), (np.degrees(np.arctan2(b, a)) + 360) % 360


def from_oklch(L, C, h):
    r = math.radians(h)
    return from_space(np.array([L, C * math.cos(r), C * math.sin(r)]), 'oklab')


def gradient_t(layer, W, H, x, y):
    kind = layer.get('type', 'radial')
    if kind == 'radial':
        cx, cy = layer.get('at', [0.5, 0.5])
        r = layer.get('radius', [0.5, 0.5])
        if isinstance(r, (int, float)):
            return np.hypot(x - cx * W, y - cy * H) / float(r)
        return np.hypot((x - cx * W) / (r[0] * W), (y - cy * H) / (r[1] * H))
    if kind == 'linear':
        th = np.radians(float(layer.get('angle', 180)))
        dx, dy = np.sin(th), -np.cos(th)
        length = abs(W * dx) + abs(H * dy)
        return ((x - W / 2) * dx + (y - H / 2) * dy) / length + 0.5
    fail(f"unknown gradient type {kind!r} (radial or linear)")


def render_layer(layer, W, H, x, y):
    """-> premultiplied (H, W, 3) colour in gamma sRGB and (H, W) alpha."""
    stops = layer.get('stops')
    if not stops or len(stops) < 2:
        fail(f"layer needs >= 2 stops: {layer}")
    space = layer.get('space', 'srgb')
    if space not in ('srgb', 'linear', 'oklab'):
        fail(f'unknown space {space!r}')
    cols = [parse_color(s[0]) for s in stops]
    pos = [float(s[1]) if len(s) > 1 else i / (len(stops) - 1) for i, s in enumerate(stops)]
    if any(b < a for a, b in zip(pos, pos[1:])):
        fail(f'stop positions must not decrease: {pos}')
    t = gradient_t(layer, W, H, x, y)
    return interp_stops(cols, pos, t, space)


def interp_stops(cols, pos, t, space):
    rgb = np.array([c[:3] for c in cols], dtype=np.float64)
    al = np.array([c[3] for c in cols], dtype=np.float64)
    # CSS: a fully transparent stop takes its neighbour's colour (premultiplied interpolation)
    for i in range(len(cols)):
        if al[i] == 0:
            nb = [j for j in (i - 1, i + 1) if 0 <= j < len(cols) and al[j] > 0]
            if nb:
                rgb[i] = rgb[nb[0]]
    comp = to_space(rgb, space) * al[:, None]  # premultiplied in the interpolation space
    tc = np.clip(t, pos[0], pos[-1])
    out = np.empty(t.shape + (3,))
    for ch in range(3):
        out[..., ch] = np.interp(tc, pos, comp[:, ch])
    a = np.interp(tc, pos, al)
    safe = np.where(a > 1e-9, a, 1.0)[..., None]
    straight = from_space(out / safe, space)
    return straight * a[..., None], a


def quantize(col, alpha, rng, dither, opaque, over=None):
    """premultiplied float colour + alpha -> PIL image, uint8 array, exact (straight) values for the report.
    over: the ground a translucent plate sits on. One alpha step then moves the composite by only
    |colour - ground| / 255 levels, so the alpha dither is scaled up until it dithers the composite by
    the requested LSB (a plain +-1 LSB alpha dither leaves the composite banded)."""
    H, W = alpha.shape
    amp = dither
    if over is not None and not opaque:
        safe0 = np.where(alpha > 1e-9, alpha, 1.0)[..., None]
        diff = np.abs(col / safe0 - np.array(over)[None, None, :]).max() * 255
        amp = dither * max(1.0, 255.0 / max(1.0, diff))
    tpdf = (rng.random((H, W)) + rng.random((H, W)) - 1.0) * amp
    if opaque or alpha.min() >= 1 - 1e-9:  # opaque result -> RGB PNG
        v = col * 255 + tpdf[..., None]
        img = np.clip(np.round(v), 0, 255).astype(np.uint8)
        return Image.fromarray(img, 'RGB'), img, col * 255
    safe = np.where(alpha > 1e-9, alpha, 1.0)[..., None]
    straight = col / safe * 255
    clear = alpha <= 1e-9
    if clear.any() and (~clear).any():  # fully clear pixels keep the ramp's colour: no dark fringe when scaled
        straight[clear] = straight[~clear].mean(axis=0)
    varies = (straight.max(axis=(0, 1)) - straight.min(axis=(0, 1))).max() >= 0.5
    tpdf2 = (rng.random((H, W)) + rng.random((H, W)) - 1.0) * dither if varies else np.zeros((H, W))
    if over is not None and varies:
        tpdf2 = tpdf2 / np.clip(alpha, 0.25, 1.0)  # keep the composite's colour ramp dithered where the plate is faint
    rgb = np.clip(np.round(straight + tpdf2[..., None]), 0, 255).astype(np.uint8)
    a8 = np.clip(np.round(alpha * 255 + tpdf), 0, 255).astype(np.uint8)
    img = np.dstack([rgb, a8])
    return Image.fromarray(img, 'RGBA'), img, np.dstack([straight, alpha * 255])


def build(bd, W, H, rng, dither):
    y, x = np.mgrid[0:H, 0:W].astype(np.float64) + 0.5
    layers = bd.get('layers') or [bd]
    base = bd.get('base')
    if base is not None:
        b = parse_color(base)
        col = np.broadcast_to(np.array(b[:3]), (H, W, 3)).copy()
        alpha = np.ones((H, W))
    else:
        col = np.zeros((H, W, 3))
        alpha = np.zeros((H, W))
    for layer in layers:
        c, a = render_layer(layer, W, H, x, y)
        col = c + col * (1 - a[..., None])  # source-over, premultiplied
        alpha = a + alpha * (1 - a)
    return quantize(col, alpha, rng, dither, base is not None)


# ------------------------------------------------------------------------------- light-field kinds

def smooth_fall(r, soft):
    """1 inside (1 - soft), smoothly to 0 at r = 1 (a quintic smootherstep: no visible edge)."""
    s = max(1e-6, float(soft))
    u = np.clip((1.0 - r) / s, 0, 1)
    return u * u * u * (u * (u * 6 - 15) + 10)


def one_colour(bd, key='color'):
    c = parse_color(bd.get(key, '#FFFFFF'))
    return np.array(c[:3])


def over_of(bd):
    o = bd.get('over')
    return np.array(parse_color(o)[:3]) if o else None


def make_pool(bd, rng, dither):
    n = int(bd.get('size', 800))
    y, x = np.mgrid[0:n, 0:n].astype(np.float64) + 0.5
    r = np.hypot(x - n / 2, y - n / 2) / (n / 2)
    alpha = float(bd.get('peak', 0.45)) * smooth_fall(r, bd.get('soft', 0.6))
    col = one_colour(bd)[None, None, :] * alpha[..., None]
    return quantize(col, alpha, rng, dither, False, over_of(bd))


def make_floor(bd, W, rng, dither):
    h = int(bd.get('height', 270))
    w = int(bd.get('width', W))
    y, x = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    u = y / h
    if bd.get('profile', 'power') == 'smooth':
        u = u * u * (3 - 2 * u)  # smoothstep: no kink where the glow starts
    alpha = float(bd.get('peak', 0.7)) * u ** float(bd.get('curve', 1.6))
    sides = float(bd.get('sides', 0))
    if sides > 0:
        edge = np.minimum(x, w - x) / (sides * w)
        alpha = alpha * smooth_fall(1 - np.clip(edge, 0, 1), 1.0)
    col = one_colour(bd)[None, None, :] * alpha[..., None]
    return quantize(col, alpha, rng, dither, False, over_of(bd))


def make_loop(bd, rng, dither):
    w = int(bd.get('width', 1920))
    h = int(bd.get('height', 400))
    y, x = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    cyc = max(1, int(round(bd.get('cycles', 1))))
    t = 0.5 - 0.5 * np.cos(2 * np.pi * cyc * (x - 0.5) / w)  # exactly periodic over the tile
    stops = bd.get('stops') or fail(f'{bd.get("name")}: a loop needs stops')
    cols = [parse_color(s[0]) for s in stops]
    pos = [float(s[1]) if len(s) > 1 else i / (len(stops) - 1) for i, s in enumerate(stops)]
    col, a = interp_stops(cols, pos, t, bd.get('space', 'oklab'))
    fade = bd.get('fade')
    if fade:
        ft, fb = float(fade[0]), float(fade[1])
        v = (y / h)
        f_top = smooth_fall(1 - np.clip(v / max(1e-6, ft), 0, 1), 1.0) if ft > 0 else 1.0
        f_bot = smooth_fall(1 - np.clip((1 - v) / max(1e-6, fb), 0, 1), 1.0) if fb > 0 else 1.0
        k = f_top * f_bot
        col = col * k[..., None]
        a = a * k
    return quantize(col, a, rng, dither, not fade and a.min() >= 1 - 1e-9, over_of(bd))


def make_shadow(bd, W, H, rng, dither):
    g = parse_color(bd.get('ground') or fail(f'{bd.get("name")}: a shadow plate needs "ground"'))
    L, Cc, h = oklch(np.array(g[:3]))
    L, Cc, h = float(L), float(Cc), float(h)
    dl = float(bd.get('dL', 0.16))
    y, x = np.mgrid[0:H, 0:W].astype(np.float64) + 0.5
    lift = bd.get('lift')
    Lmap = np.full((H, W), L - dl)
    if lift:
        cx, cy = lift.get('at', [0.5, 0.5])
        rad = float(lift.get('radius', 1.0)) * math.hypot(W, H) / 2
        d = np.clip(np.hypot(x - cx * W, y - cy * H) / rad, 0, 1)
        Lmap = Lmap + float(lift.get('dL', 0.04)) * d * d * (3 - 2 * d)
    Cs = min(0.13, Cc * 1.1)
    hr = math.radians(h)
    lab = np.dstack([Lmap, np.full((H, W), Cs * math.cos(hr)), np.full((H, W), Cs * math.sin(hr))])
    col = from_space(lab, 'oklab')
    return quantize(col, np.ones((H, W)), rng, dither, True)


def make_contact(bd, rng, dither):
    w, h = float(bd.get('w', 600)), float(bd.get('h', 360))
    r = min(float(bd.get('r', 40)), w / 2, h / 2)
    pad = int(bd.get('pad', 48))
    blur = max(0.5, float(bd.get('blur', 14)))
    Wp, Hp = int(round(w)) + 2 * pad, int(round(h)) + 2 * pad
    y, x = np.mgrid[0:Hp, 0:Wp].astype(np.float64) + 0.5
    # signed distance to the rounded rect, then a Gaussian edge (erf) of sigma = blur
    qx = np.abs(x - Wp / 2) - (w / 2 - r)
    qy = np.abs(y - Hp / 2) - (h / 2 - r)
    sd = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    erf = np.vectorize(math.erf)
    alpha = float(bd.get('alpha', 0.32)) * 0.5 * (1 - erf(sd / (blur * math.sqrt(2))))
    col = one_colour(bd)[None, None, :] * alpha[..., None]
    return quantize(col, alpha, rng, dither, False, over_of(bd))


# ---------------------------------------------------------------------------------------- checks

def equal_runs(arr):
    """Runs of equal values along sampled rows and columns that cross a ramp (flat lines are skipped;
    a run touching either end of a line, or sitting on a local peak or trough, is a plateau, not a band).
    -> (p99.5 run, longest run) in px. Dither breaks bands into short random runs; a real band shows as
    long runs repeated across the ramp, so the high percentile is the band measure and the longest run a
    backstop."""
    allr = []
    for a in (arr, arr.T):
        for row in a[:: max(1, a.shape[0] // 24)]:
            if row.max() - row.min() < 2:
                continue  # no ramp along this line
            change = np.flatnonzero(np.diff(row) != 0)
            edges = np.concatenate([[-1], change, [len(row) - 1]])
            runs = np.diff(edges)
            if len(runs) > 2:
                # a band is a step inside a monotone stretch (lower on one side, higher on the other); a run
                # at a local peak or trough is the ramp's own flat top, not a band
                starts = edges[:-1] + 1
                vals = row[starts]
                inner = np.arange(1, len(runs) - 1)
                step = np.sign(vals[inner] - vals[inner - 1]) == np.sign(vals[inner + 1] - vals[inner])
                allr.append(runs[inner][step])
    if not allr:
        return 0, 0
    r = np.concatenate(allr)
    return int(np.percentile(r, 99.5)), int(r.max())


def check_plate(bd, arr, mode):
    """One-hue, chroma, visible swing and banding for a baked plate (over its `over` ground if translucent)."""
    out = {}
    px = arr.astype(np.float64) / 255
    if mode == 'RGBA':
        over = bd.get('over')
        a = px[..., 3:]
        g = np.array(parse_color(over)[:3]) if over else None
        rgb = px[..., :3] * a + (g if g is not None else px[..., :3]) * (1 - a) if over else px[..., :3]
        mask = (a[..., 0] > 0.02) if not over else np.ones(a.shape[:2], bool)
    else:
        rgb, mask = px, np.ones(px.shape[:2], bool)
    sub = rgb[mask][:: max(1, mask.sum() // 200000)]
    L, Cc, h = oklch(sub)
    chroma = Cc > 0.02
    if chroma.any():
        hh = np.radians(h[chroma])
        mean = math.degrees(math.atan2(np.sin(hh).mean(), np.cos(hh).mean())) % 360
        spread = float(np.max(np.abs(((h[chroma] - mean + 180) % 360) - 180)))
    else:
        mean, spread = None, 0.0
    out['hue'] = None if mean is None else round(mean, 1)
    out['hue_spread'] = round(spread, 2)
    out['chroma_max'] = round(float(Cc.max()), 4) if len(Cc) else 0.0
    out['dL'] = round(float(L.max() - L.min()), 4) if len(L) else 0.0
    if mode == 'RGBA' and not bd.get('over'):
        chan = arr[..., 3].astype(np.int32)  # the ramp lives in the alpha
    else:
        # what the browser shows: each channel composited and rounded on its own; judge the channel with the widest ramp
        q = np.round(rgb * 255).astype(np.int32)
        chan = q[..., int(np.argmax(q.reshape(-1, 3).max(0) - q.reshape(-1, 3).min(0)))]
    out['band_run_px'], out['band_run_max_px'] = equal_runs(chan)
    problems = []
    brand = bool(bd.get('brand'))
    if not brand and spread > 7:
        problems.append(f'hue spread {spread:.1f} deg (one hue: <= 7)')
    if not brand and out['chroma_max'] > 0.13 + 1e-4:
        problems.append(f'chroma {out["chroma_max"]:.3f} (<= 0.13 at the accent hue)')
    if bd.get('over'):  # the swing a plate makes is judged over the ground it sits on
        if not 0.05 - 1e-4 <= out['dL'] <= 0.20 + 1e-4:
            problems.append(f'lightness swing {out["dL"]:.3f} (a visible light field: 0.05-0.20)')
    if out['band_run_px'] > 24 or out['band_run_max_px'] > 64:
        problems.append(f'runs of one 8-bit value along a ramp: p99.5 {out["band_run_px"]} px, longest {out["band_run_max_px"]} px (bands: p99.5 <= 24, longest <= 64)')
    if not brand and out['hue'] is not None and out['chroma_max'] >= 0.05 and (31 <= out['hue'] < 96 or 270 <= out['hue'] < 340):
        problems.append(f'hue {out["hue"]} deg is in a house-banned region (orange/amber 31-96, purple 270-340)')
    out['problems'] = problems
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--spec', help='backdrops JSON spec')
    ap.add_argument('--out', default='public/fx', help='output directory (default public/fx)')
    ap.add_argument('--size', help='WxH, overrides the spec size')
    ap.add_argument('--dither', type=float, default=1.0, help='TPDF amplitude in LSB (0 = off)')
    ap.add_argument('--preview', help='directory for x12 contrast-stretched previews')
    ap.add_argument('--check', action='store_true', help='light-field rules: one hue, chroma, visible swing, banding')
    ap.add_argument('--example', action='store_true', help='print an example spec and exit')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    global np, Image
    import numpy as np
    from PIL import Image
    if a.example:
        print(json.dumps(EXAMPLE, indent=1))
        return
    if not a.spec:
        ap.error('--spec is required (or --example)')
    try:
        spec = json.load(open(a.spec))
    except (OSError, ValueError) as e:
        fail(f'cannot read spec {a.spec}: {e}')
    W, H = spec.get('size', [1920, 1080])
    if a.size:
        W, H = (int(v) for v in a.size.lower().split('x'))
    rng = np.random.default_rng(int(spec.get('seed', 11)))
    os.makedirs(a.out, exist_ok=True)
    if a.preview:
        os.makedirs(a.preview, exist_ok=True)
    report = {'out': a.out, 'size': [W, H], 'backdrops': []}
    bad = 0
    for bd in spec.get('backdrops', []):
        name = bd.get('name')
        if not name or not re.fullmatch(r'[\w.-]+', name):
            fail(f'backdrop needs a file-safe "name": {bd}')
        kind = bd.get('kind')
        if kind is None:
            im, arr, exact = build(bd, W, H, rng, a.dither)
        elif kind == 'pool':
            im, arr, exact = make_pool(bd, rng, a.dither)
        elif kind == 'floor':
            im, arr, exact = make_floor(bd, W, rng, a.dither)
        elif kind == 'loop':
            im, arr, exact = make_loop(bd, rng, a.dither)
        elif kind == 'shadow':
            im, arr, exact = make_shadow(bd, W, H, rng, a.dither)
        elif kind == 'contact':
            im, arr, exact = make_contact(bd, rng, a.dither)
        else:
            fail(f'{name}: unknown kind {kind!r} (pool, floor, loop, shadow, contact)')
        path = os.path.join(a.out, f'{name}.png')
        im.save(path, compress_level=6)
        ch = exact.reshape(-1, exact.shape[-1])
        ch = ch[:, 3:] if im.mode == 'RGBA' else ch  # a translucent layer's ramp lives in its alpha
        span = float((ch.max(0) - ch.min(0)).max())
        entry = {'name': name, 'file': path, 'mode': im.mode, 'size': list(im.size), 'code_span': round(span, 1),
                 'css_banding_risk': bool(0 < span < 30),
                 'mean': [round(float(v), 2) for v in arr.reshape(-1, arr.shape[-1]).mean(0)]}
        if kind:
            entry['kind'] = kind
        if a.check:
            entry['check'] = check_plate(bd, arr, im.mode)
            bad += bool(entry['check']['problems'])
        if a.preview:
            if im.mode == 'RGBA':  # composite over mid grey so the alpha ramp is visible
                rgb = arr[..., :3].astype(np.float64) * (arr[..., 3:] / 255) + 128 * (1 - arr[..., 3:] / 255)
            else:
                rgb = arr.astype(np.float64)
            m = rgb.mean(axis=(0, 1))
            st = np.clip((rgb - m) * 12 + 128, 0, 255).astype(np.uint8)
            pp = os.path.join(a.preview, f'{name}.stretch.png')
            Image.fromarray(st).resize((max(1, im.size[0] // 2), max(1, im.size[1] // 2)), Image.BILINEAR).save(pp)
            entry['preview'] = pp
        report['backdrops'].append(entry)
        if not a.quiet:
            msg = f"  {path}: {im.mode}, span {span:.1f} code values"
            if entry['css_banding_risk']:
                msg += ' (would band as a CSS gradient: use this PNG)'
            if a.check and entry['check']['problems']:
                msg += ' | CHECK: ' + '; '.join(entry['check']['problems'])
            sys.stderr.write(msg + '\n')
    if not report['backdrops']:
        fail('spec has no backdrops')
    print(json.dumps(report, indent=1))
    if a.check and bad:
        sys.exit(3)


if __name__ == '__main__':
    main()
