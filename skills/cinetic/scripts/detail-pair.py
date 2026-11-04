#!/usr/bin/env python3
"""detail-pair.py: the detail pass, frame against frame.

A rough look passes a frame whose photos sit on a straight row where the reference fans them along a curve, whose
ground is flat where the reference's colour gathers along one edge, whose card stands upright where the reference
leans it back, whose edge has no rim where the reference's is lit. This script puts matching frames of the film and
of the frames chosen as the bar (a clip the user named, a template's own render, the brand's frames, the last round)
side by side, whole and at 2x zoom on the regions that matter, and measures the details a rough look misses. It lists
differences to look at; the detail critic (assets/critics/detail.md) reads the sheet and lists every difference it
sees, measured or not, and each one is fixed or answered before a film is called done (references/review-loop.md).

Usage (from the film project root):
  python3 scripts/detail-pair.py --film out/preview.mp4 --ref <clip.mp4 | frames dir | image> --pairs 120:88,240:201
          [--crops "x,y,w,h;x,y,w,h"] [--auto 3] [--zoom 2] [--out out/qa/detail] [--json out/qa/detail.json]
  --film, --ref  a video (frames by number), a folder of images (frames by their index in name order) or one image
  --pairs F:R,..  film frame : reference frame; `F` alone pairs F with F + --ref-offset (default 0)
  --crops        regions in film px, the same place in both frames (the reference is scaled to the film's size
                 first): the type, a card's edge, the ground's far side, a cursor, a photo
  --auto N       also the N cells of a 4 x 3 grid where the two frames differ most (default 3; 0: none)
  --zoom         the crops' magnification on the sheet (default 2)

Measures, per pair, on the whole frame and on each region (each a finding when it passes its threshold):
  sharpness  Laplacian variance, film over reference: under 0.6 ours is softer here; over 1.67 ours is crisper and
             the reference blurs here (depth of field on cards away from the focus, a smear along a path)
  smear      the direction of the blur, the ratio of gradient energy across x and across y: one frame's ratio is
             over 1.6 times the other's and that frame is the softer one there (a smear softens along its travel)
  tilt       the dominant angle of long straight edges (Hough), film minus reference, over 4 degrees: a card that
             leans in one and stands upright in the other, a tilted ground's edge
  ground     the outer band of the frame (the ground behind everything): one has a lightness span over 0.06 (a
             gradient, a wash, a halo) and the other under half of that, or their hues differ by over 25 degrees
  glow       the soft bright ring round the brightest areas (a halo, a rim glow, a lit edge): one has it, the other not
  edges      edge density (Canny share), film over reference, outside 0.6-1.67: one frame is busier or cleaner
  colour     OKLab distance of the mean colours over 0.06, or of the 8 x 6 colour grids over 0.10
The sheet puts the film on the left and the reference on the right: the whole frames on top, each region below at
`zoom`, labelled with its pair and region. The JSON holds every measure and every finding.
Exit codes: 0 written (findings are things to look at, not failures), 2 bad input or a missing tool (ffmpeg,
numpy, opencv-python). --self-test runs the measures on synthetic frames.
"""
import argparse
import glob
import json
import math
import os
import sys

if __name__ == '__main__' and any(a in ('-h', '--help') for a in sys.argv[1:]):
    print(__doc__.strip())
    sys.exit(0)
try:
    import cv2
    import numpy as np
except ImportError as e:  # pragma: no cover
    print(f'detail-pair: needs numpy and opencv-python ({e}); see scripts/requirements.txt', file=sys.stderr)
    sys.exit(2)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TH = {'soft': 0.6, 'crisp': 1.67, 'smear': 1.6, 'tilt': 4.0, 'span': 0.06, 'hue': 25.0, 'glow': 0.004, 'edge_lo': 0.6,
      'edge_hi': 1.67, 'mean': 0.06, 'grid': 0.10}
IMG_EXT = ('.png', '.jpg', '.jpeg', '.webp', '.bmp')


def die(msg, code=2):
    print(f'detail-pair: {msg}', file=sys.stderr)
    sys.exit(code)


# ---------------------------------------------------------------------------------------------- frames
def is_video(path):
    return os.path.isfile(path) and not path.lower().endswith(IMG_EXT)


def frame_of(path, n):
    """RGB uint8 frame n of a video, the n-th image of a folder (name order), or the image itself."""
    if os.path.isdir(path):
        files = sorted(f for f in glob.glob(os.path.join(path, '*')) if f.lower().endswith(IMG_EXT))
        if not files:
            die(f'no images in {path}')
        if not 0 <= n < len(files):
            die(f'{path} holds {len(files)} images; there is no image {n}')
        return read_image(files[n])
    if not os.path.exists(path):
        die(f'no such file: {path}')
    if not is_video(path):
        return read_image(path)
    from forensics import decode, probe  # noqa: E402
    info = probe(path)
    if not 0 <= n < info['frames']:
        die(f'{path} has {info["frames"]} frames; there is no frame {n}')
    for _, a in decode(path, info, start=n, count=1):
        return a
    die(f'could not decode frame {n} of {path}')


def read_image(path):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None:
        die(f'cannot read {path}')
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


# ---------------------------------------------------------------------------------------------- colour
def oklab(rgb):
    """sRGB uint8 (..., 3) -> OKLab float (..., 3)."""
    c = rgb.astype(np.float32) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]
    m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]
    s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s], axis=-1)


# ---------------------------------------------------------------------------------------------- measures
def sharpness(gray):
    return float(cv2.Laplacian(gray, cv2.CV_32F).var())


def smear(gray):
    """Gradient energy across x over across y (and its inverse): 1 is isotropic, > 1.6 a directional blur."""
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    ex, ey = float((gx * gx).mean()) + 1e-6, float((gy * gy).mean()) + 1e-6
    return max(ex, ey) / min(ex, ey), ('x' if ex < ey else 'y')  # the axis the blur runs along has less energy across it


def tilt(gray):
    """The length-weighted median angle of long straight edges from the nearest axis (degrees), or None."""
    h, w = gray.shape
    edges = cv2.Canny(gray, 40, 120)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 360, threshold=60, minLineLength=int(0.12 * min(w, h)), maxLineGap=8)
    if lines is None:
        return None
    angs, wts = [], []
    for x1, y1, x2, y2 in lines.reshape(-1, 4):
        a = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 90.0
        a = a - 90.0 if a > 45 else a
        angs.append(a)
        wts.append(math.hypot(x2 - x1, y2 - y1))
    order = np.argsort(angs)
    cum = np.cumsum(np.array(wts)[order])
    return float(np.array(angs)[order][int(np.searchsorted(cum, cum[-1] / 2))])


def ground(lab):
    """The outer band's lightness span (heavily smoothed: content does not count) and its mean hue and chroma."""
    small = cv2.resize(lab, (16, 9), interpolation=cv2.INTER_AREA)
    band = np.concatenate([small[0], small[-1], small[1:-1, 0], small[1:-1, -1]])
    L = band[:, 0]
    a, b = float(band[:, 1].mean()), float(band[:, 2].mean())
    return float(L.max() - L.min()), (math.degrees(math.atan2(b, a)) % 360.0), math.hypot(a, b)


def glow(lab):
    """The share of the frame in a soft bright ring round its near-white areas, lighter than the ground: a halo, a rim
    glow, a bloom (on a light page a near-white area has no ring lighter than the page, so it reads as none)."""
    L = lab[..., 0]
    hot = (L >= 0.97).astype(np.uint8)
    if hot.sum() < 20:
        return 0.0
    k = max(3, int(0.03 * max(L.shape)) | 1)
    ring = cv2.dilate(hot, np.ones((k, k), np.uint8)) - hot
    soft = (ring > 0) & (L < 0.97) & (L > float(np.median(L)) + 0.08)
    return float(soft.mean())


def edge_density(gray):
    return float((cv2.Canny(gray, 60, 160) > 0).mean())


def measure(rgb):
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    lab = oklab(rgb)
    sm, axis = smear(gray)
    span, hue, chroma = ground(lab)
    return {'sharpness': sharpness(gray), 'smear': sm, 'smear_axis': axis, 'tilt': tilt(gray), 'ground_span': span,
            'ground_hue': hue, 'ground_chroma': chroma, 'glow': glow(lab), 'edges': edge_density(gray),
            'mean': [float(v) for v in lab.reshape(-1, 3).mean(0)], 'grid': cv2.resize(lab, (8, 6), interpolation=cv2.INTER_AREA)}


def compare(A, B, region, pair, whole):
    """Findings for one region: A is the film's measures, B the reference's."""
    out = []

    def add(kind, msg, fa, fb):
        out.append({'pair': pair, 'region': region, 'kind': kind, 'film': fa, 'ref': fb, 'message': msg})

    r = (A['sharpness'] + 1e-3) / (B['sharpness'] + 1e-3)
    if r < TH['soft']:
        add('sharpness', f'ours is softer ({r:.2f}x the reference): a defocus, a smear or a low-resolution picture where the reference is crisp', round(A['sharpness'], 1), round(B['sharpness'], 1))
    elif r > TH['crisp']:
        add('sharpness', f'ours is crisper ({r:.2f}x): the reference blurs here (depth of field off the focus, a smear along the travel)', round(A['sharpness'], 1), round(B['sharpness'], 1))
    ref_more = B['smear'] > A['smear']
    softer = (B['sharpness'] < 0.8 * A['sharpness']) if ref_more else (A['sharpness'] < 0.8 * B['sharpness'])  # a smear softens
    if softer and max(A['smear'], B['smear']) / min(A['smear'], B['smear']) > TH['smear']:
        who = 'the reference smears along ' + B['smear_axis'] if ref_more else 'ours smears along ' + A['smear_axis']
        add('smear', f'{who}, far more than the other: blur along the path of a fast layer', round(A['smear'], 2), round(B['smear'], 2))
    if A['tilt'] is not None and B['tilt'] is not None and abs(A['tilt'] - B['tilt']) > TH['tilt']:
        add('tilt', f'the long edges lean {A["tilt"] - B["tilt"]:+.1f} degrees against the reference (ours {A["tilt"]:+.1f}, reference {B["tilt"]:+.1f}): a card leaning back, a tilted plane, a tilted ground', round(A['tilt'], 1), round(B['tilt'], 1))
    if whole:
        sa, sb = A['ground_span'], B['ground_span']
        if (sb > TH['span'] and sa < sb / 2) or (sa > TH['span'] and sb < sa / 2):
            add('ground', ('the reference ground is a gradient (lightness span %.2f) and ours is flat (%.2f): a wash, a tilted tint, a halo behind the subject' % (sb, sa)) if sb > sa else ('ours has a gradient ground (%.2f) where the reference is flat (%.2f)' % (sa, sb)), round(sa, 3), round(sb, 3))
        if min(A['ground_chroma'], B['ground_chroma']) > 0.02:
            dh = abs((A['ground_hue'] - B['ground_hue'] + 180) % 360 - 180)
            if dh > TH['hue']:
                add('ground', f'the ground leans to another hue ({dh:.0f} degrees apart)', round(A['ground_hue']), round(B['ground_hue']))
        if (B['glow'] > TH['glow']) != (A['glow'] > TH['glow']):
            add('glow', 'the reference has a soft bright ring round its brightest areas (a halo, a rim glow) and ours does not' if B['glow'] > A['glow'] else 'ours glows round its brightest areas where the reference does not', round(A['glow'], 4), round(B['glow'], 4))
    er = (A['edges'] + 1e-4) / (B['edges'] + 1e-4)
    if er < TH['edge_lo'] or er > TH['edge_hi']:
        add('edges', f'edge density {er:.2f}x the reference: ' + ('ours is emptier (missing UI, words, texture or detail)' if er < 1 else 'ours is busier'), round(A['edges'], 4), round(B['edges'], 4))
    dm = float(np.linalg.norm(np.array(A['mean']) - np.array(B['mean'])))
    dg = float(np.linalg.norm(A['grid'] - B['grid'], axis=-1).mean())
    if dm > TH['mean'] or dg > TH['grid']:
        add('colour', f'the colour differs (mean {dm:.3f}, layout {dg:.3f} in OKLab): the grade, the ground, the accent\'s share or a missing picture', round(dm, 3), round(dg, 3))
    return out


def auto_regions(fa, fb, n, cols=4, rows=3):
    """The n grid cells where the two frames differ most (structure and colour)."""
    h, w = fa.shape[:2]
    ga = cv2.GaussianBlur(cv2.cvtColor(fa, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 2)
    gb = cv2.GaussianBlur(cv2.cvtColor(fb, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 2)
    ea = cv2.Canny(fa, 60, 160).astype(np.float32)
    eb = cv2.Canny(fb, 60, 160).astype(np.float32)
    cells = []
    for j in range(rows):
        for i in range(cols):
            x0, x1 = i * w // cols, (i + 1) * w // cols
            y0, y1 = j * h // rows, (j + 1) * h // rows
            d = float(np.abs(ga[y0:y1, x0:x1] - gb[y0:y1, x0:x1]).mean()) / 255 + float(np.abs(ea[y0:y1, x0:x1] - eb[y0:y1, x0:x1]).mean()) / 255
            cells.append((d, (x0, y0, x1 - x0, y1 - y0)))
    cells.sort(key=lambda c: -c[0])
    return [c[1] for c in cells[:max(0, n)]]


def parse_crops(text):
    out = []
    for part in (text or '').split(';'):
        if not part.strip():
            continue
        v = [int(float(x)) for x in part.split(',')]
        if len(v) != 4 or v[2] <= 0 or v[3] <= 0:
            die(f'a crop is x,y,w,h in film px: "{part}"')
        out.append(tuple(v))
    return out


def parse_pairs(text, offset):
    pairs = []
    for part in (text or '').split(','):
        part = part.strip()
        if not part:
            continue
        if ':' in part:
            a, b = part.split(':', 1)
            pairs.append((int(a), int(b)))
        else:
            pairs.append((int(part), int(part) + offset))
    if not pairs:
        die('give --pairs F:R,... (film frame : reference frame)')
    return pairs


# ---------------------------------------------------------------------------------------------- the sheet
def panel(img, width):
    h, w = img.shape[:2]
    return cv2.resize(img, (width, max(1, round(h * width / w))), interpolation=cv2.INTER_AREA if width < w else cv2.INTER_CUBIC)


def sheet_for(fa, fb, regions, zoom, pair, width=960):
    from forensics import label, tile  # noqa: E402
    rows = [[label(cv2.cvtColor(panel(fa, width), cv2.COLOR_RGB2BGR), f'film f{pair[0]}'),
             label(cv2.cvtColor(panel(fb, width), cv2.COLOR_RGB2BGR), f'reference f{pair[1]}')]]
    for k, (x, y, w, h) in enumerate(regions):
        cw = min(width, max(64, int(w * zoom)))
        ca = cv2.cvtColor(panel(fa[y:y + h, x:x + w], cw), cv2.COLOR_RGB2BGR)
        cb = cv2.cvtColor(panel(fb[y:y + h, x:x + w], cw), cv2.COLOR_RGB2BGR)
        pad = lambda im: cv2.copyMakeBorder(im, 0, 0, 0, width - im.shape[1], cv2.BORDER_CONSTANT, value=(90, 90, 90))
        rows.append([label(pad(ca), f'region {k + 1}', f'{x},{y},{w},{h} x{zoom:g}'), label(pad(cb), f'region {k + 1}')])
    blocks = []
    for r in rows:
        hh = max(im.shape[0] for im in r)
        r = [cv2.copyMakeBorder(im, 0, hh - im.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(90, 90, 90)) for im in r]
        blocks.append(tile(r, 2))
    return np.vstack(blocks)


def run_pair(fa, fb, pair, crops, auto, zoom):
    if fb.shape[:2] != fa.shape[:2]:
        fb = cv2.resize(fb, (fa.shape[1], fa.shape[0]), interpolation=cv2.INTER_AREA)
    h, w = fa.shape[:2]
    regions = [(max(0, x), max(0, y), min(cw, w - max(0, x)), min(ch, h - max(0, y))) for x, y, cw, ch in crops]
    regions += [r for r in auto_regions(fa, fb, auto) if r not in regions]
    MA, MB = measure(fa), measure(fb)
    findings = compare(MA, MB, 'frame', list(pair), True)
    stats = [{'region': 'frame', 'film': strip(MA), 'ref': strip(MB)}]
    for k, (x, y, cw, ch) in enumerate(regions):
        a, b = measure(fa[y:y + ch, x:x + cw]), measure(fb[y:y + ch, x:x + cw])
        findings += compare(a, b, f'region {k + 1} ({x},{y},{cw},{ch})', list(pair), False)
        stats.append({'region': f'region {k + 1}', 'box': [x, y, cw, ch], 'film': strip(a), 'ref': strip(b)})
    return findings, stats, regions, fb


def strip(m):
    return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items() if k != 'grid'}


# ---------------------------------------------------------------------------------------------- self-test
def self_test():
    failed = 0

    def check(ok, name, detail=''):
        nonlocal failed
        failed += 0 if ok else 1
        print(f'{"pass" if ok else "FAIL"}  {name}' + (f'  ({detail})' if detail and not ok else ''))

    def page(gradient=False, lean=0.0, blur=0.0, smear_x=0, halo=False, dark=False):
        w, h = 640, 360
        img = np.full((h, w, 3), 30 if dark else 236, np.uint8)
        if gradient:
            t = np.linspace(0, 1, w)[None, :, None] ** 1.6
            img = (236 * (1 - t) + np.array([120, 140, 230]) * t).astype(np.uint8).repeat(h, 0)
        cv2.rectangle(img, (200, 90), (440, 270), (40, 44, 52) if not dark else (200, 204, 210), -1)
        lengths = [150, 90, 170, 120, 60, 140]
        for k in range(6):  # words: short strokes on the card
            y = int(130 + 22 * k)
            cv2.line(img, (230, y), (230 + lengths[k], y), (230, 232, 236) if not dark else (40, 44, 52), 5)
        if lean:  # the card leans: the whole picture turns about its centre, edges filled with the ground
            M = cv2.getRotationMatrix2D((320, 180), lean, 1.0)
            img = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REPLICATE)
        if halo:
            cv2.circle(img, (520, 70), 26, (255, 255, 255), -1)
            soft = np.zeros_like(img)
            cv2.circle(soft, (520, 70), 52, (210, 214, 222), -1)
            soft = cv2.GaussianBlur(soft, (0, 0), 12)
            img = np.maximum(img, soft)
            cv2.circle(img, (520, 70), 26, (255, 255, 255), -1)
        if blur:
            img = cv2.GaussianBlur(img, (0, 0), blur)
        if smear_x:
            img = cv2.blur(img, (smear_x, 1))
        return img

    base = page()
    f, _, _, _ = run_pair(base, base.copy(), (0, 0), [], 0, 2)
    check(not f, 'the same frame: no difference', str([x['kind'] for x in f]))
    f, _, _, _ = run_pair(page(blur=3), base, (0, 0), [], 0, 2)
    check(any(x['kind'] == 'sharpness' and 'softer' in x['message'] for x in f), 'a softer frame: sharpness, ours softer')
    f, _, _, _ = run_pair(base, page(smear_x=25), (0, 0), [], 0, 2)
    check(any(x['kind'] == 'smear' for x in f), 'a reference smeared along x: smear')
    f, _, _, _ = run_pair(base, page(lean=9), (0, 0), [], 0, 2)
    check(any(x['kind'] == 'tilt' for x in f), 'a card leaning 9 degrees in the reference: tilt', str([(x['kind'], x['film'], x['ref']) for x in f]))
    f, _, _, _ = run_pair(base, page(gradient=True), (0, 0), [], 0, 2)
    check(any(x['kind'] == 'ground' and 'gradient' in x['message'] for x in f), 'a gradient ground in the reference, flat in ours: ground')
    f, _, _, _ = run_pair(page(dark=True), page(dark=True, halo=True), (0, 0), [], 0, 2)
    check(any(x['kind'] == 'glow' for x in f), 'a halo on a dark ground in the reference: glow', str([(x['kind'], x['film'], x['ref']) for x in f]))
    regs = auto_regions(base, page(gradient=True), 2)
    check(len(regs) == 2 and all(r[0] >= 320 for r in regs), 'auto regions: the cells where the frames differ most (the gradient side)', str(regs))
    sh = sheet_for(base, page(gradient=True), regs, 2, (0, 0), width=480)
    check(sh.shape[1] > 900 and sh.shape[0] > 3 * 200, 'the sheet: whole frames on top, each region below at 2x', str(sh.shape))
    print('detail-pair self-test: ' + ('all pass' if not failed else f'{failed} failed'))
    return 1 if failed else 0


# ---------------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description='Matching frames of the film and the reference, side by side at 2x, with measured differences.', add_help=True)
    ap.add_argument('--film')
    ap.add_argument('--ref')
    ap.add_argument('--pairs')
    ap.add_argument('--ref-offset', type=int, default=0)
    ap.add_argument('--crops')
    ap.add_argument('--auto', type=int, default=3)
    ap.add_argument('--zoom', type=float, default=2.0)
    ap.add_argument('--out', default='out/qa/detail')
    ap.add_argument('--json')
    ap.add_argument('--self-test', action='store_true')
    if any(a in ('-h', '--help') for a in sys.argv[1:]):
        print(__doc__.strip())
        return 0
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.film or not a.ref:
        die('give --film and --ref (a video, a folder of images or one image each) and --pairs F:R,...')
    crops = parse_crops(a.crops)
    pairs = parse_pairs(a.pairs, a.ref_offset)
    os.makedirs(a.out, exist_ok=True)
    report = {'tool': 'detail-pair', 'film': a.film, 'ref': os.path.basename(a.ref), 'zoom': a.zoom, 'thresholds': TH, 'pairs': [], 'findings': []}
    for pair in pairs:
        fa, fb = frame_of(a.film, pair[0]), frame_of(a.ref, pair[1])
        findings, stats, regions, fb = run_pair(fa, fb, pair, crops, a.auto, a.zoom)
        path = os.path.join(a.out, f'pair-f{pair[0]}.png')
        cv2.imwrite(path, sheet_for(fa, fb, regions, a.zoom, pair))
        report['pairs'].append({'film': pair[0], 'ref': pair[1], 'sheet': path, 'regions': regions, 'stats': stats})
        report['findings'] += findings
        print(f'f{pair[0]} vs f{pair[1]}: {len(findings)} difference{"s" * (len(findings) != 1)} to look at -> {path}')
        for x in findings:
            print(f'  {x["region"]}: {x["kind"]}: {x["message"]}')
    jp = a.json or os.path.join(a.out, 'detail.json')
    with open(jp, 'w', encoding='utf-8') as fh:
        json.dump(report, fh, indent=1)
    print(f'detail-pair: {len(pairs)} pair{"s" * (len(pairs) != 1)}, {len(report["findings"])} measured differences ({jp}); now read every sheet at 2x and list every difference you see (assets/critics/detail.md)')
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main())
