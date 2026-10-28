#!/usr/bin/env python3
"""Trace a raster logo (PNG, WebP, JPEG) into an SVG of flat parts, so brand.py builds the lockup part by part.

A kit that holds only a PNG of the logo gets it placed whole (one part). Traced to an SVG whose parts carry ids,
the same logo goes through brand.py like a supplied SVG: LogoMark, AssembledMark and Lockup move it piece by piece.
Trace only a flat logo (solid colours, no gradient, photo or texture), and only when the brand has no vector file:
ask for the SVG first.

Usage:
  python3 scripts/trace-logo.py brand-kit/logo.png --out brand-kit/logo-mark.svg --sheet out/qa/trace.png
          [--colours N] [--tolerance 0.6] [--min-iou 0.97] [--bg '#FFFFFF'] [--json out/qa/trace.json]
Then: python3 scripts/brand.py brand-kit/logo-mark.svg ... (or leave the SVG in the kit folder: an SVG logo wins
over a raster one).

How it traces:
  ground   alpha under 50 % where the image has alpha; else the colour of the four corners (or --bg)
  colours  the logo's pixels grouped into flat colours (colours within OKLab 0.08 merge; at most --colours,
           default up to 6, the largest kept); an antialiased edge counts toward the colour it fades from
  parts    every connected shape of one colour is one part, with its holes: its outline is traced at 4x on the
           soft coverage (so a curve comes out smooth, not stair-stepped), kept to within --tolerance source px
           (Douglas-Peucker), and written as cubic curves through the kept points (Catmull-Rom), sharp corners
           (a turn of 50 degrees or more) kept sharp and runs between two corners straight; an outline within
           2 % of a circle is written as two arcs. Shapes under --min-area (share of the logo's box, default
           0.0004) are dropped. Parts are named part-1, part-2 ... in reading order (rows top to bottom, left to
           right in a row), one <path id fill fill-rule="evenodd"> each, so brand.py splits them by leaf.
  check    the SVG's curves are drawn back at 4x and compared with the traced coverage, per colour: the
           intersection over union (IoU) overall and per part is printed, and under --min-iou (0.97) the trace
           fails. --sheet writes the source over the trace at 16 px and 64 px high (the sizes a mark must
           survive: favicon, app icon) and at up to 256 px.

Exit 0 written and the IoU holds, 1 written but under --min-iou (look at the sheet, raise --colours or lower
--tolerance), 2 bad input. Needs numpy and opencv-python.
"""
import argparse
import json
import math
import os
import sys

sys.dont_write_bytecode = True

try:
    import cv2
    import numpy as np
except ImportError as e:  # pragma: no cover
    print(f'trace-logo: needs numpy and opencv-python ({e}); pip install -r scripts/requirements.txt', file=sys.stderr)
    sys.exit(2)

UP = 4  # the trace runs at 4x the source


def die(msg, code=2):
    print(f'trace-logo: {msg}', file=sys.stderr)
    sys.exit(code)


def oklab(rgb):
    """OKLab of an (..., 3) uint8 sRGB array."""
    c = rgb.astype(np.float32) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]], np.float32)
    return np.cbrt(lin @ m1.T) @ m2.T


def hex_of(rgb):
    return '#' + ''.join(f'{int(round(v)):02X}' for v in rgb)


def parse_hex(s):
    s = s.strip().lstrip('#')
    if len(s) == 3:
        s = ''.join(ch * 2 for ch in s)
    if len(s) != 6:
        die(f'bad colour {s!r}: expected #RRGGBB')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def load(path, bg_hex):
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img is None:
        die(f'cannot read {path} (PNG, WebP or JPEG)')
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.dtype != np.uint8:
        img = (img / 257).astype(np.uint8) if img.dtype == np.uint16 else img.astype(np.uint8)
    alpha = img[:, :, 3].astype(np.float32) / 255.0 if img.shape[2] == 4 else None
    rgb = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2RGB).astype(np.float32)
    if alpha is not None and alpha.min() > 0.99:
        alpha = None  # an alpha channel that is opaque everywhere: the ground is a colour
    if alpha is None:
        corners = np.array([rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]])
        bg = parse_hex(bg_hex) if bg_hex else np.median(corners, axis=0)
    else:
        bg = None
    return rgb, alpha, bg


def colours_of(rgb, alpha, bg, most):
    """The flat colours of the logo: [(rgb, share)], biggest first, and the solid-pixel mask they come from."""
    if alpha is not None:
        solid = alpha >= 0.9
    else:
        d = np.linalg.norm(rgb - bg, axis=2)
        solid = d >= max(24.0, 0.5 * float(np.percentile(d, 99.5)))
    core = cv2.erode(solid.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0  # leave out the antialiased edges
    px = rgb[core] if core.sum() >= 0.2 * solid.sum() else rgb[solid]
    if not len(px):
        die('no logo pixels found: the image is empty or one flat colour (pass --bg with the ground colour)')
    lab = oklab(px.astype(np.uint8))
    q = np.round(px / 8).astype(np.int32)  # bins of 8 levels, then merged greedily by OKLab distance
    keys, inv, counts = np.unique(q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2], return_inverse=True, return_counts=True)
    order = np.argsort(-counts)
    groups = []  # [lab centre, rgb sum, count]
    for k in order:
        sel = inv == k
        c_lab = lab[sel].mean(axis=0)
        for g in groups:
            if np.linalg.norm(g[0] - c_lab) <= 0.08:
                n = g[2] + counts[k]
                g[0] = (g[0] * g[2] + c_lab * counts[k]) / n
                g[1] = g[1] + px[sel].sum(axis=0)
                g[2] = n
                break
        else:
            groups.append([c_lab, px[sel].sum(axis=0), int(counts[k])])
    groups.sort(key=lambda g: -g[2])
    total = sum(g[2] for g in groups)
    groups = [g for g in groups if g[2] >= 0.002 * total][:most]
    return [(g[1] / g[2], g[2] / total) for g in groups], solid


def coverage(rgb, alpha, bg, cols):
    """Soft coverage (0..1) of each colour, from the source pixels: alpha, or the pixel's place between the ground
    and the colour; each pixel goes to its nearest colour."""
    cs = np.array([c for c, _ in cols], np.float32)
    if alpha is not None:
        lab = oklab(rgb.astype(np.uint8))
        clab = oklab(cs.astype(np.uint8))
        near = np.argmin(np.linalg.norm(lab[:, :, None, :] - clab[None, None, :, :], axis=3), axis=2)
        return [(alpha * (near == k)).astype(np.float32) for k in range(len(cs))]
    # an opaque image: each pixel sits on the line from the ground to one colour (an edge fades from the colour to
    # the ground); the colour whose line passes nearest owns it, at its place along that line
    ts, res = [], []
    for c in cs:
        v = c - bg
        t = np.clip(((rgb - bg) @ v) / max(float(v @ v), 1e-6), 0, 1)
        ts.append(t)
        res.append(np.linalg.norm(rgb - (bg + t[..., None] * v), axis=2))
    own = np.argmin(np.stack(res), axis=0)
    return [(ts[k] * (own == k)).astype(np.float32) for k in range(len(cs))]


def turn(a, b, c):
    """Turning angle at b (degrees) along a -> b -> c."""
    u, v = b - a, c - b
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    if nu < 1e-9 or nv < 1e-9:
        return 0.0
    return math.degrees(math.acos(max(-1.0, min(1.0, float(u @ v) / (nu * nv)))))


def circle_of(cnt):
    """(cx, cy, r) when a contour is a circle (its area within 2 % of its enclosing circle's), else None."""
    area = abs(cv2.contourArea(cnt))
    if area < 40:
        return None
    (cx, cy), r = cv2.minEnclosingCircle(cnt)
    if area >= 0.98 * math.pi * r * r:
        return cx, cy, math.sqrt(area / math.pi)  # the radius of the same area: the outline's own size
    return None


def subpath(cnt, eps):
    """One closed outline as SVG path data (in 4x px) and its polygon for the check."""
    circ = circle_of(cnt)
    if circ:
        cx, cy, r = circ
        d = f'M{(cx - r) / UP:.2f} {cy / UP:.2f}a{r / UP:.2f} {r / UP:.2f} 0 1 0 {2 * r / UP:.2f} 0a{r / UP:.2f} {r / UP:.2f} 0 1 0 {-2 * r / UP:.2f} 0Z'
        t = np.linspace(0, 2 * math.pi, 96, endpoint=False)
        return d, np.stack([cx + r * np.cos(t), cy + r * np.sin(t)], 1)
    p = cv2.approxPolyDP(cnt, eps, True).reshape(-1, 2).astype(np.float64)
    # two kept points closer than 2 eps (a tip traced as a pair) become one, so no corner hides in a stub
    merged = []
    for q in p:
        if merged and np.linalg.norm(q - merged[-1]) < 2 * eps:
            merged[-1] = (merged[-1] + q) / 2
        else:
            merged.append(q)
    if len(merged) > 3 and np.linalg.norm(merged[0] - merged[-1]) < 2 * eps:
        merged[0] = (merged[0] + merged.pop()) / 2
    if len(merged) >= 3:
        p = np.array(merged)
    n = len(p)
    if n < 3:
        return None, None
    corner = [turn(p[i - 1], p[i], p[(i + 1) % n]) >= 50 for i in range(n)]
    d = [f'M{p[0][0] / UP:.2f} {p[0][1] / UP:.2f}']
    poly = []

    def handle(h, chord):  # a handle no longer than a third of its segment: no loop or spike on a short one
        lh = np.linalg.norm(h)
        return h * (chord / 3 / lh) if lh > chord / 3 else h

    for i in range(n):
        a, b = p[i], p[(i + 1) % n]
        if corner[i] and corner[(i + 1) % n]:
            d.append(f'L{b[0] / UP:.2f} {b[1] / UP:.2f}')
            poly.append(a)
            continue
        chord = float(np.linalg.norm(b - a))
        c1 = a if corner[i] else a + handle((b - p[i - 1]) / 6, chord)
        c2 = b if corner[(i + 1) % n] else b - handle((p[(i + 2) % n] - a) / 6, chord)
        d.append(f'C{c1[0] / UP:.2f} {c1[1] / UP:.2f} {c2[0] / UP:.2f} {c2[1] / UP:.2f} {b[0] / UP:.2f} {b[1] / UP:.2f}')
        for t in np.linspace(0, 1, 12, endpoint=False):
            poly.append((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t * t * c2 + t ** 3 * b)
    return ''.join(d) + 'Z', np.array(poly)


def trace(path, args):
    rgb, alpha, bg = load(path, args.bg)
    h, w = rgb.shape[:2]
    cols, solid = colours_of(rgb, alpha, bg, args.colours)
    covs = coverage(rgb, alpha, bg, cols)
    ys, xs = np.nonzero(solid)
    box_area = max(1, (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1))
    eps = args.tolerance * UP
    parts, masks_src, masks_svg = [], [], []
    for k, cov in enumerate(covs):
        big = cv2.resize(cov, (w * UP, h * UP), interpolation=cv2.INTER_LINEAR)
        m = (big >= 0.5).astype(np.uint8)
        masks_src.append(m)
        drawn = np.zeros_like(m)
        cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        if hier is None:
            masks_svg.append(drawn)
            continue
        hier = hier[0]
        for i, c in enumerate(cnts):
            if hier[i][3] != -1:
                continue  # a hole: written with its outline
            if abs(cv2.contourArea(c)) < args.min_area * box_area * UP * UP:
                continue
            rings = [c]
            j = hier[i][2]
            while j != -1:
                if abs(cv2.contourArea(cnts[j])) >= 4 * UP * UP:
                    rings.append(cnts[j])
                j = hier[j][0]
            ds, polys = [], []
            for r in rings:
                d_, poly = subpath(r, eps)
                if d_:
                    ds.append(d_)
                    polys.append(np.round(poly).astype(np.int32))
            if not ds:
                continue
            pm = np.zeros_like(m)
            cv2.fillPoly(pm, polys, 1)  # several rings in one call: the holes stay open (even-odd)
            drawn |= pm
            x, y, bw, bh = cv2.boundingRect(c)
            parts.append(dict(colour=hex_of(cols[k][0]), k=k, d=''.join(ds), box=[x / UP, y / UP, bw / UP, bh / UP],
                              src=(m & cv2.dilate(pm, np.ones((3, 3), np.uint8))), svg=pm))
        masks_svg.append(drawn)
    if not parts:
        die('nothing to trace: every shape is under --min-area')
    # reading order: rows (a part whose middle sits below the current row's bottom starts a new row), left to right
    parts.sort(key=lambda p: p['box'][1])
    rows, cur, bottom = [], [], -1e9
    for p in parts:
        if cur and p['box'][1] + p['box'][3] / 2 > bottom:
            rows.append(cur)
            cur, bottom = [], -1e9
        cur.append(p)
        bottom = max(bottom, p['box'][1] + p['box'][3])
    rows.append(cur)
    parts = [p for r in rows for p in sorted(r, key=lambda p: p['box'][0])]
    for i, p in enumerate(parts, 1):
        p['id'] = f'part-{i}'
        inter = float((p['src'] & p['svg']).sum())
        union = float((p['src'] | p['svg']).sum())
        p['iou'] = round(inter / union, 4) if union else 1.0
    inter = sum(float((a & b).sum()) for a, b in zip(masks_src, masks_svg))
    union = sum(float((a | b).sum()) for a, b in zip(masks_src, masks_svg))
    iou = round(inter / union, 4) if union else 1.0
    return dict(w=w, h=h, bg=None if bg is None else hex_of(bg), alpha=alpha is not None, colours=[(hex_of(c), round(s, 3)) for c, s in cols],
                parts=parts, iou=iou, masks_svg=masks_svg, rgb=rgb, alpha_img=alpha)


def write_svg(t, src, out):
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {t["w"]} {t["h"]}" width="{t["w"]}" height="{t["h"]}">',
             f'  <!-- traced from {os.path.basename(src)} by trace-logo.py: {len(t["parts"])} parts, IoU {t["iou"]:.3f} -->']
    for p in t['parts']:
        lines.append(f'  <path id="{p["id"]}" fill="{p["colour"]}" fill-rule="evenodd" d="{p["d"]}"/>')
    lines.append('</svg>')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')


def write_sheet(t, out):
    """Source over trace at 16 px and 64 px high and at up to 256 px, on the logo's own ground (or white)."""
    h, w = t['h'], t['w']
    ground = np.array([255, 255, 255], np.float32) if t['bg'] is None else parse_hex(t['bg'])
    src = t['rgb'] if t['alpha_img'] is None else t['rgb'] * t['alpha_img'][..., None] + ground * (1 - t['alpha_img'][..., None])
    big = np.ones((h * UP, w * UP, 3), np.float32) * ground
    for p in t['parts']:
        big[p['svg'] > 0] = parse_hex(p['colour'])
    trace_img = cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA)
    tiles = []
    for th in (16, 64, min(256, h)):
        tw = max(1, round(w * th / h))
        a = cv2.resize(src, (tw, th), interpolation=cv2.INTER_AREA)
        b = cv2.resize(trace_img, (tw, th), interpolation=cv2.INTER_AREA)
        col = np.concatenate([a, np.full((8, tw, 3), 128, np.float32), b], 0)
        tiles.append(col)
    H = max(c.shape[0] for c in tiles)
    gap = np.full((H, 16, 3), 128, np.float32)
    row = []
    for c in tiles:
        pad = np.full((H - c.shape[0], c.shape[1], 3), 128, np.float32)
        row += [np.concatenate([c, pad], 0), gap]
    sheet = np.concatenate(row[:-1], 1)
    sheet = np.pad(sheet, ((16, 16), (16, 16), (0, 0)), constant_values=128)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cv2.imwrite(out, cv2.cvtColor(np.clip(sheet, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))


def main():
    ap = argparse.ArgumentParser(description='Trace a raster logo into an SVG of flat parts (see the module docstring).')
    ap.add_argument('logo', help='the raster logo: PNG (alpha or a flat ground), WebP or JPEG')
    ap.add_argument('--out', required=True, help='the SVG to write')
    ap.add_argument('--sheet', help='a PNG of the source over the trace at 16, 64 and up to 256 px high')
    ap.add_argument('--json', help='a report: colours, parts with their boxes and IoU, the overall IoU')
    ap.add_argument('--colours', type=int, default=6, help='at most this many flat colours (default 6)')
    ap.add_argument('--tolerance', type=float, default=0.6, help='how far the outline may stray, in source px (default 0.6)')
    ap.add_argument('--min-area', type=float, default=0.0004, help="drop shapes under this share of the logo's box (default 0.0004)")
    ap.add_argument('--min-iou', type=float, default=0.97, help='the trace fails under this IoU (default 0.97)')
    ap.add_argument('--bg', help='the ground colour of an opaque image (default: its corners)')
    args = ap.parse_args()
    if not os.path.isfile(args.logo):
        die(f'{args.logo}: no such file')
    if not 1 <= args.colours <= 12 or args.tolerance <= 0:
        die('--colours takes 1-12 and --tolerance a positive number')
    t = trace(args.logo, args)
    write_svg(t, args.logo, args.out)
    if args.sheet:
        write_sheet(t, args.sheet)
    ok = t['iou'] >= args.min_iou
    print(f'trace-logo: {args.out}: {len(t["parts"])} parts in {len(t["colours"])} colour(s) '
          f'({", ".join(c for c, _ in t["colours"])}), IoU {t["iou"]:.3f} ({"ok" if ok else f"under {args.min_iou}"})')
    for p in t['parts']:
        print(f'  {p["id"]:<8} {p["colour"]}  box {", ".join(f"{v:.0f}" for v in p["box"])}  IoU {p["iou"]:.3f}')
    if args.sheet:
        print(f'  sheet: {args.sheet} (source above, trace below; 16 px, 64 px, full)')
    if not ok:
        print('trace-logo: the trace strays from the source: look at the sheet, then lower --tolerance or set --colours', file=sys.stderr)
    if args.json:
        json.dump(dict(source=os.path.basename(args.logo), svg=args.out, size=[t['w'], t['h']], ground=t['bg'], colours=t['colours'],
                       iou=t['iou'], parts=[{k: p[k] for k in ('id', 'colour', 'box', 'iou')} for p in t['parts']]),
                  open(args.json, 'w', encoding='utf-8'), indent=1)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
