#!/usr/bin/env python3
"""Make a film feel like a clip the user supplies, by borrowing its grammar and never its content.

"Make it feel like this" is a request about grammar: how long the shots run and how the cuts fall, how often
a cut lands on a sound, how much the camera moves and on which curves, how the shots hand over, how big the
type is and how much of the film carries it, how dense the motion is, the proportions of ground, ink and
accent, whether fast moves blur, and the music's tempo. like.py measures those on the clip and writes them
as the film's targets, with the rules that keep the film its own:

  out/like.json   the clip's grammar in grammar-score.mjs --target format (shot band and spread, the curve
                  role mix, front-loaded entrances, moves into cuts, density, seams, cut sync, the picture
                  target), plus a "like" block with what the score does not read (camera activity, transition
                  kinds, type scale and text share, what each picture shows, palette proportions and ground
                  tones, blur policy, tempo)
  out/LIKE.md     the rules, and the measured grammar in plain words
The outputs name the clip by its hash and length, never its path or file name: the clip stays private.

The rules: borrow grammar (pace, rhythm, curve families, density, camera habits, proportions), never content.
Never copy the clip's shots one by one, a layout frame for frame, any text, a logo, another company's colours
(like.json records ground tones and proportions, never the clip's hues), its footage or its music. The film keeps
its own idea sentence, its own direction from the deck and its own devices. `like.py guard` checks the finished film: contact sheets of the film and
the clip at the same density must not read as a recreation.

Usage (from the film project root):
  python3 scripts/like.py measure <clip> [--out out] [--width 480] [--no-music] [--quiet]
  python3 scripts/like.py guard --film out/film.mp4 [--clip <clip>]... [--scaffold <render>]... [--every 1.0]
          [--json out/qa/like-guard.json] [--sheet out/qa/like-guard.png] [--layout-sheet out/qa/like-layout.png]
          [--cache out/like-cache] [--no-layout]
  python3 scripts/like.py layout --film out/film.mp4 [--clip <clip>]... [--scaffold <render>]... [--json ...]
  node scripts/grammar-score.mjs --target out/like.json [--format launch] ...   # closeness to the clip's grammar

measure: look-audit.py measures the clip's motion (cuts, starts, camera, seams, cut sync, the picture floor);
like.py adds a light pass over every frame at 320 px (curve families of the main moves, transition kinds,
blur on fast moves) and samples at 2 a second (type scale and text share, palette proportions, and from the middle
of each picture what it shows: picture, ui, type or graphic); the music's tempo comes from scripts/audio/track.py
(librosa), or an onset estimate without it. Text is read without OCR: glyphs (letter-sized, open shapes made of
strokes) grouped into lines along a baseline, each line with a confidence; only confident lines count, so a night
street of lights, streaks and lit windows reads as no text. assets.mjs's vet and check use the same reader.

guard: the film against every reference it is given: the clips the user supplied (--clip, as many as there are)
and the template's own scaffold (--scaffold: a render of the template before anything was changed, e.g.
out/scaffold.mp4; a film made from a template is never its scaffold retold). A reference is a video or a folder of
stills (each still one sample). Two checks run:
  frames  frames at the same density from both (one a second by default). Each film frame is held against every
          reference frame: layout overlap is the correlation of their structure maps (edges and non-ground area on a
          48 x 27 grid), colour-layout distance the mean OKLab distance of their 8 x 6 colour grids. A pair reads as a
          recreation when its layout overlap is >= 0.80 with a colour-layout distance <= 0.10 (the same frame,
          regraded or moved a little), or when its layout overlap is >= 0.90 (the same layout in other colours: a shot
          retold with new words and colours). A frame is matched to a reference frame it recreates when there is one,
          else to the closest layout (colour only breaks a tie). The film fails when 15 % or more of its frames, or 3
          in a row, read as recreations.
  layout  the composition, whatever fills it: two frames a second, each reduced to where its text lines sit (the
          text reader below), where its objects sit (pictures, cards, pills: whatever stands off the ground, a gradient
          ground included) and how big each is, on a 32 x 18 grid. Layout overlap is the soft intersection over union
          of those maps (objects 0.65, text 0.35, at two blur radii, so a layout moved a little or re-filled
          still matches). Only a specific frame counts: three elements or more, objects on 3-60 % of the frame (a full
          bleed picture, a lone centred line or an empty ground is everyone's grammar). A film frame copies a layout
          when its overlap with some reference frame is >= 0.60; the film fails when it holds one reference's layout
          for a run (3 samples, 1.5 s, in a row) or copies on 25 % or more of its specific frames: the same
          composition re-skinned (a photo river with a small label, a sentence round a photo with a pill under it, a
          counter beside a list) in its own words, pictures and colours is still a copy.
--cache keeps each reference's samples (keyed by its hash and the settings), so a long reference is read once.

Exit codes: measure 0 written; guard and layout 0 its own film, 1 it reads as a recreation or copies a layout; 2 bad
input or a missing tool (ffmpeg, numpy, opencv-python). Heavy on long clips: one clip at a time.
"""
import argparse
import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
FORMAT_KEYS = ('launch', 'update', 'explainer', 'reel', 'social')
SCENE_JUMP = 0.06  # mean change of the 16 x 9 colour layout over 0.2 s (0-1) that counts as a new picture
GUARD = {'layout': 0.80, 'colour': 0.10, 'layout_only': 0.90, 'share': 0.15, 'run': 3}
LAYOUT = {'every': 0.5, 'width': 480, 'cells': (32, 18), 'overlap': 0.60, 'run': 3, 'share': 0.25, 'cover': (0.03, 0.60), 'elements': 3, 'text_conf': 0.35, 'blur': (1.0, 2.5), 'text_weight': 0.35}
STILLS = ('.png', '.jpg', '.jpeg', '.webp', '.bmp')
TEXT = {'conf': 0.5, 'stroke': 0.42, 'flat': 0.85}  # a text line counts from this confidence; a glyph's widest stroke / its height; a drawn ground's flat share


def die(msg, code=2):
    print(f'like.py: {msg}', file=sys.stderr)
    sys.exit(code)


def need():
    global np, cv2
    try:
        import numpy as np  # noqa: F401
        import cv2  # noqa: F401
    except ImportError as e:
        die(f'needs numpy and opencv-python ({e})')
    try:
        cv2.setNumThreads(2)
    except Exception:  # noqa: BLE001
        pass


def module(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, rel))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def q(xs, p):
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    k = (len(xs) - 1) * p
    return xs[int(math.floor(k))] + (xs[int(math.ceil(k))] - xs[int(math.floor(k))]) * (k - math.floor(k))


def r(x, n=3):
    return None if x is None else round(float(x), n)


# ----------------------------------------------------------------------------------------- colour helpers
M1 = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]]
M2 = [[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]]


def oklab(rgb8):
    x = rgb8.astype(np.float32) / 255.0
    lin = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
    lms = np.cbrt(lin @ np.array(M1, np.float32).T)
    return lms @ np.array(M2, np.float32).T


# ------------------------------------------------------------------------------------------------ measure
def look_audit(clip, width, tmp):
    """The clip's motion measures and per-frame series from look-audit.py (no floor or picture verdicts)."""
    js, series = os.path.join(tmp, 'look.json'), os.path.join(tmp, 'series.json')
    cmd = [sys.executable, os.path.join(HERE, 'look-audit.py'), clip, '--json', js, '--series', series, '--width', str(width),
           '--no-finish', '--no-floor', '--no-picture']
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if not os.path.isfile(js):
        die(f'look-audit.py could not measure {clip}:\n{(p.stderr or p.stdout)[-800:]}')
    return json.load(open(js, encoding='utf-8')), json.load(open(series, encoding='utf-8')) if os.path.isfile(series) else {}


def frame_pass(clip, info, F):
    """One pass over every frame at 320 px wide: mean luma, Laplacian sharpness on textured areas, a 16 x 9
    colour grid for soft-transition detection."""
    w = 320
    h = max(2, int(round(info['h'] * w / info['w'])) // 2 * 2)
    luma, sharp, grids = [], [], []
    for _, rgb in F.decode(clip, info, 0, None, size=(w, h)):
        g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        luma.append(float(g.mean()))
        lap = cv2.Laplacian(g.astype(np.float32), cv2.CV_32F)
        tex = cv2.dilate((cv2.Canny(g, 40, 120) > 0).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        sharp.append(float(lap[tex].var()) if tex.sum() > 150 else None)
        grids.append(cv2.resize(rgb, (16, 9), interpolation=cv2.INTER_AREA).astype(np.float32))
    return luma, sharp, grids


def scenes(grids, cuts, fps):
    """Picture changes: the hard cuts plus every jump of the 16 x 9 colour layout over 0.2 s that stands out
    from the motion around it (a morph, a carried hand-over, a new layout inside one take). A film that carries
    most of its hand-overs changes its picture far more often than it cuts. Returns the change frames."""
    n = len(grids)
    k, win, gap = max(1, round(0.2 * fps)), max(2, round(fps)), max(2, round(0.4 * fps))
    d = np.zeros(n)
    for i in range(k, n):
        d[i] = float(np.abs(grids[i] - grids[i - k]).mean() / 255.0)
    peaks = []
    for i in range(k, n):
        local = float(np.median(d[max(0, i - win):min(n, i + win)]))
        if d[i] >= max(SCENE_JUMP, 2.5 * local) and d[i] >= d[max(0, i - gap // 2):min(n, i + gap // 2 + 1)].max():
            peaks.append(max(0, i - k // 2))
    out = []
    for f in sorted(set(int(c) for c in cuts) | set(peaks)):
        if out and f - out[-1] < gap:
            if f in cuts:  # a hard cut wins the slot
                out[-1] = f
            continue
        out.append(f)
    return out


def moves(series, cuts, fps):
    """The main moves: runs of the dominant motion over 2 px/f@60 (120 px/s) for at least 8 frames@60 inside a
    shot, each with where its speed peaks: front (peak in the first 35 %: arrive curves), symmetric (35-65 %:
    reposition), back (last 35 %: accelerating into a stop or a cut), or linear (near-constant speed)."""
    pair = {int(k): v for k, v in (series.get('pair') or {}).items()}
    if not pair:
        return []
    n = max(pair) + 1
    sp = [float((pair.get(f) or {}).get('speed') or 0) for f in range(n)]
    cut_set = set()
    for c in cuts:
        cut_set |= {c - 1, c, c + 1}
    out, f, minlen = [], 0, max(4, int(round(8 * fps / 60)))
    while f < n:
        if sp[f] < 120 or f in cut_set:
            f += 1
            continue
        a = f
        while f < n and sp[f] >= 120 and f not in cut_set:
            f += 1
        z = f
        if z - a >= minlen:
            seg = sp[a:z]
            m = sum(seg) / len(seg)
            cv = math.sqrt(sum((x - m) ** 2 for x in seg) / len(seg)) / max(1e-6, m)
            pk = max(range(len(seg)), key=lambda i: seg[i]) / max(1, len(seg) - 1)
            fam = 'linear' if cv < 0.15 else 'front' if pk <= 0.35 else 'back' if pk >= 0.65 else 'symmetric'
            near_cut_end = any(0 <= c - z <= int(round(2 * fps / 60)) + 1 for c in cuts)
            after_cut = any(0 <= a - c <= int(round(0.3 * fps)) for c in cuts) or a < int(0.3 * fps)
            out.append({'from': a, 'to': z, 'family': fam, 'peak': round(pk, 2), 'mean_pxs': round(m, 1), 'into_cut': near_cut_end, 'after_cut': after_cut})
    return out


def transitions(cuts, luma, grids, seams, fps):
    """What each cut is: a flash (a frame or two far off both sides' level), a dip (through near black or
    white), carried (motion keeps its direction across it), or hard; plus soft hand-overs that are no cut at
    all (the colour grid changes steadily for 0.15-0.6 s: a dissolve or a wipe)."""
    kinds = {'hard': 0, 'carried': 0, 'flash': 0, 'dip': 0, 'soft': 0}
    carried = {int(s['frame']) for s in seams if s.get('carried') and not s.get('declared')}
    n = len(luma)
    for c in cuts:
        if not 2 <= c < n - 3:
            continue
        before = sum(luma[max(0, c - 8):c - 2]) / max(1, len(luma[max(0, c - 8):c - 2]))
        after = sum(luma[c + 2:c + 8]) / max(1, len(luma[c + 2:c + 8]))
        near = luma[c - 2:c + 2]
        if any(abs(x - before) > 40 and abs(x - after) > 40 for x in near):
            kinds['flash'] += 1
        elif min(luma[max(0, c - 6):c + 1]) < 22 or max(luma[max(0, c - 6):c + 1]) > 232:
            kinds['dip'] += 1
        elif any(abs(c - x) <= 2 for x in carried):
            kinds['carried'] += 1
        else:
            kinds['hard'] += 1
    # soft hand-overs: most of the frame changing a little every frame for 0.15-0.6 s with no cut, ending in a
    # different picture (a dissolve or a wipe; a moving object changes only its own cells)
    spread = [0.0] + [float((np.abs(grids[i] - grids[i - 1]).max(axis=2) > 3).mean()) for i in range(1, n)]
    lo, hi = int(0.15 * fps), int(0.6 * fps)
    i, cutset = 1, set(cuts)
    while i < n:
        if spread[i] >= 0.5 and not any(abs(i - c) <= 2 for c in cutset):
            a = i
            while i < n and spread[i] >= 0.35 and not any(abs(i - c) <= 2 for c in cutset):
                i += 1
            end = min(n - 1, i)
            changed = float((np.abs(grids[end] - grids[a - 1]).max(axis=2) > 18).mean())
            if lo <= i - a <= hi and changed >= 0.6:
                kinds['soft'] += 1
        i += 1
    return kinds


def _glyphs(gray):
    """Glyph candidates: strokes brighter or darker than their surroundings (a top-hat / black-hat 6 % of the frame
    high, wider than a heavy stroke, cut at half the frame's strongest stroke contrast so anti-aliasing does not
    thicken them), each component kept when it is letter-sized (1.2-20 % of the frame high, at most 4x as wide, not cut
    by the frame edge), open
    (12-80 % of its box: a lit window, a lamp or a solid bar fills it) and made of strokes (its widest stroke under
    TEXT['stroke'] of its height: a light, a bokeh disc or a blob is solid)."""
    h, w = gray.shape
    k = max(5, int(0.06 * h)) | 1
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    out = []
    for pol, img in (('light', cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, se)), ('dark', cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, se))):
        thr = max(40.0, 0.5 * float(np.percentile(img, 99.7)))
        n, lab, st, _ = cv2.connectedComponentsWithStats((img >= thr).astype(np.uint8), connectivity=8)
        for i in range(1, n):
            x, y, cw, ch, area = (int(v) for v in st[i])
            if ch < max(6, 0.012 * h) or ch > 0.2 * h or cw > 4.0 * ch or cw < 0.06 * ch or x == 0 or y == 0 or x + cw == w or y + ch == h:
                continue  # not letter-sized, or cut by the frame edge
            fill = area / float(cw * ch)
            if not 0.12 <= fill <= 0.8:
                continue
            dt = cv2.distanceTransform(np.pad((lab[y:y + ch, x:x + cw] == i).astype(np.uint8), 1), cv2.DIST_L2, 3)
            sw = 2.0 * float(dt.max())
            if sw > max(TEXT['stroke'] * ch, 3.0):
                continue
            out.append(dict(x=x, y=y, w=cw, h=ch, fill=fill, sw=sw, pol=pol))
    return out


def text_lines(gray):
    """Text lines in a frame without OCR: glyph candidates (_glyphs) of one polarity grouped along a line (each next
    to the one before by under 1.3 of their height, heights within a factor 2.2, overlapping vertically), kept at 3
    glyphs or more. conf (0-1) grows with the glyph count and falls when the heights scatter, the baseline wanders,
    the stroke widths disagree, the glyphs stand far apart, the shapes repeat or they stand at even steps (a row of
    lamps, windows, rails or a grid of tiles is one shape at one pitch; letters differ in both). A line read in both polarities (the letters, and the ground in their
    counters) is kept once. Returns [{box: (x, y, w, h), glyphs, conf}], the surest first."""
    gl = _glyphs(gray)
    lines = []
    for pol in ('light', 'dark'):
        g = sorted((q for q in gl if q['pol'] == pol), key=lambda q: q['x'])
        parent = list(range(len(g)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        for i, a in enumerate(g):
            for j in range(i + 1, len(g)):
                b = g[j]
                hm = max(a['h'], b['h'])
                gap = b['x'] - (a['x'] + a['w'])
                if gap > 1.3 * hm:
                    break
                if gap < -0.3 * hm or min(a['h'], b['h']) / hm < 1 / 2.2:
                    continue
                if min(a['y'] + a['h'], b['y'] + b['h']) - max(a['y'], b['y']) >= 0.5 * min(a['h'], b['h']):
                    parent[find(j)] = find(i)
        groups = {}
        for i in range(len(g)):
            groups.setdefault(find(i), []).append(g[i])
        for m in groups.values():
            if len(m) < 3:
                continue
            hs, ws = np.array([q['h'] for q in m], float), np.array([q['w'] for q in m], float)
            bots = np.array([q['y'] + q['h'] for q in m], float)
            sws, fills = np.array([q['sw'] for q in m], float), np.array([q['fill'] for q in m], float)
            hmed = float(np.median(hs))
            xs = sorted(m, key=lambda q: q['x'])
            gaps = [max(0, b['x'] - (a['x'] + a['w'])) for a, b in zip(xs, xs[1:])]
            steps = np.diff([q['x'] + q['w'] / 2.0 for q in xs])
            conf = (min(1.0, (len(m) - 2) / 4.0) ** 0.5                                                  # glyphs
                    * float(np.clip(1 - max(0.0, hs.std() / hs.mean() - 0.18) / 0.35, 0, 1))              # heights
                    * float(np.clip(1 - (np.median(np.abs(bots - np.median(bots))) / hmed) / 0.25, 0, 1))  # baseline
                    * float(np.clip(1 - max(0.0, sws.std() / max(1e-6, sws.mean()) - 0.3) / 0.5, 0, 1))   # strokes
                    * float(np.clip((ws.std() / ws.mean() + 2 * fills.std()) / 0.25, 0, 1))              # shapes differ
                    * float(np.clip((steps.std() / max(1e-6, steps.mean()) - 0.03) / 0.07, 0, 1))         # letters are not a grid
                    * float(np.clip(1 - (np.median(gaps) / hmed - 0.5) / 0.5, 0, 1)))                    # spacing
            x0, y0 = min(q['x'] for q in m), min(q['y'] for q in m)
            x1, y1 = max(q['x'] + q['w'] for q in m), max(q['y'] + q['h'] for q in m)
            lines.append(dict(box=(int(x0), int(y0), int(x1 - x0), int(y1 - y0)), glyphs=len(m), conf=round(conf, 2)))
    out = []
    for d in sorted(lines, key=lambda d: (-d['conf'], -d['glyphs'])):
        x, y, w, h = d['box']
        if not any(max(0, min(x + w, o['box'][0] + o['box'][2]) - max(x, o['box'][0])) * max(0, min(y + h, o['box'][1] + o['box'][3]) - max(y, o['box'][1]))
                   >= 0.5 * min(w * h, o['box'][2] * o['box'][3]) for o in out):
            out.append(d)
    return out


def text_regions(gray, conf=None):
    """The text lines read with at least TEXT['conf'] confidence (text_lines), as (x, y, w, h)."""
    return [d['box'] for d in text_lines(gray) if d['conf'] >= (TEXT['conf'] if conf is None else conf)]


def flat_share(gray):
    """Share of the frame (clipped black and white left out) whose 3 x 3 neighbourhood spans 3 levels or less: a
    drawn ground is flat, footage and photographs keep grain and texture almost everywhere."""
    k = np.ones((3, 3), np.uint8)
    span = cv2.dilate(gray, k).astype(np.int16) - cv2.erode(gray, k).astype(np.int16)
    ok = (gray > 12) & (gray < 245)
    return float(((span <= 3) & ok).sum() / max(1, ok.sum()))


def moment_kind(gray, lines):
    """What a shot shows, from one frame of it (an estimate): picture (footage or a photograph: not flat), ui (three
    or more confident small text lines on a flat ground), type (a line or two of text on a flat ground) or graphic
    (a flat ground without text)."""
    if flat_share(gray) < TEXT['flat']:
        return 'picture'
    sure = [d for d in lines if d['conf'] >= TEXT['conf']]
    if len(sure) >= 3 and float(np.median([d['box'][3] for d in sure])) < 0.04 * gray.shape[0]:
        return 'ui'
    return 'type' if sure else 'graphic'


def samples(clip, info, F, every_s=0.5, width=480):
    """Frames at `every_s` seconds (2 a second by default) at `width` px: type and palette."""
    w = width
    h = max(2, int(round(info['h'] * w / info['w'])) // 2 * 2)
    step = max(1, int(round(every_s * info['fps'])))
    out = []
    for f, rgb in F.decode(clip, info, 0, None, size=(w, h)):
        if f % step == 0:
            out.append((f, rgb.copy()))
    return out


def palette_of(rgb):
    """Ground, ink and accent shares of a frame (k-means in OKLab): proportions and the ground's tone only."""
    small = cv2.resize(rgb, (96, max(2, int(96 * rgb.shape[0] / rgb.shape[1]))), interpolation=cv2.INTER_AREA)
    lab = oklab(small.reshape(-1, 3))
    K = 5
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.002)
    _, lbl, ctr = cv2.kmeans(lab.astype(np.float32), K, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    shares = np.bincount(lbl.ravel(), minlength=K) / float(len(lbl))
    C = np.hypot(ctr[:, 1], ctr[:, 2])
    g = int(np.argmax(shares))
    gL, gC = float(ctr[g, 0]), float(C[g])
    cand = [i for i in range(K) if i != g and shares[i] >= 0.03]
    ink = max(cand, key=lambda i: abs(ctr[i, 0] - gL)) if cand else None
    acc = [i for i in range(K) if i != g and C[i] >= 0.06 and shares[i] >= 0.005]
    a = max(acc, key=lambda i: C[i] * math.sqrt(shares[i])) if acc else None
    tone = 'field' if gC >= 0.06 else 'light' if gL >= 0.85 else 'mid' if gL >= 0.45 else 'dark'
    return {'ground': float(shares[g]), 'ink': float(shares[ink]) if ink is not None else 0.0,
            'accent': float(shares[a]) if a is not None and a != ink else 0.0, 'tone': tone, 'ground_L': gL}


def tempo_of(clip, cuts, fps, quiet=True):
    """The music's tempo (track.py's analysis when its libraries are here, else an onset estimate) and how the
    cuts sit on its beats and downbeats."""
    out = {'bpm': None, 'source': None, 'cuts_on_beat': None, 'cuts_on_downbeat': None}
    beats, downs = [], []
    try:
        tr = module('track_mod', os.path.join('audio', 'track.py'))
        with tempfile.TemporaryDirectory() as tmp:
            a = tr.analyze(clip, profile='crisp', cache_dir=tmp, log=(lambda *x, **k: None) if quiet else None)
        t = a['tempo']
        out['bpm'], out['source'] = r(t['bpm'], 2), 'track.py'
        b0, bs = float(a['grid']['beat_t0']), float(t['beat_s'])
        dur = float(a.get('seconds') or 0)
        beats = [b0 + k * bs for k in range(int((dur - b0) / bs) + 1)]
        d0 = float(a['grid']['t0'])
        downs = [d0 + 4 * k * bs for k in range(int((dur - d0) / (4 * bs)) + 1)]
    except (Exception, SystemExit) as e:  # noqa: BLE001 (no librosa, no audio, an unresolved tempo)
        out['note'] = f'tempo from onsets ({type(e).__name__})'
        la = module('look_audit_mod', 'look-audit.py')
        la.np = np
        on = la.audio_onsets(clip, fps) or []
        if len(on) >= 8:
            ioi = [b - a_ for a_, b in zip(on, on[1:]) if 0.25 <= b - a_ <= 1.5]
            if ioi:
                hist = {}
                for x in ioi:
                    bpm = 60.0 / x
                    while bpm < 80:
                        bpm *= 2
                    while bpm > 170:
                        bpm /= 2
                    key = round(bpm)
                    hist[key] = hist.get(key, 0) + 1
                out['bpm'], out['source'] = float(max(hist, key=hist.get)), 'onsets'
    if beats and cuts:
        bt = np.array(beats)
        dn = np.array(downs) if downs else bt
        on_b = sum(1 for c in cuts if np.min(np.abs(bt - c / fps)) * fps <= 1.5)
        on_d = sum(1 for c in cuts if np.min(np.abs(dn - c / fps)) * fps <= 1.5)
        out['cuts_on_beat'], out['cuts_on_downbeat'] = r(on_b / len(cuts)), r(on_d / len(cuts))
    return out


def clip_id(path, seconds=None):
    """The clip as the outputs name it: its hash (and length), never its path or file name (the clip stays private)."""
    import hashlib
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return f"sha256 {h.hexdigest()[:12]}" + (f', {seconds:g} s' if seconds else '')


def measure(args):
    need()
    F = module('forensics_mod', 'forensics.py')
    clip = os.path.abspath(args.clip)
    info = F.probe(clip)
    fps = info['fps']
    ident = clip_id(clip, r(info['frames'] / fps, 2))
    with tempfile.TemporaryDirectory() as tmp:
        look, series = look_audit(clip, args.width, tmp)
    os.makedirs(args.out, exist_ok=True)
    look['file'] = f'the clip ({ident})'
    with open(os.path.join(args.out, 'like-look.json'), 'w', encoding='utf-8') as fh:  # the clip's own look report
        json.dump(look, fh, indent=1)
    M = look['measures']
    cuts = [int(c) for c in M.get('cuts') or []]
    luma, sharp, grids = frame_pass(clip, info, F)
    mv = moves(series, cuts, fps)
    seams = (look.get('floor') or {}).get('carried', {}).get('seams', [])
    kinds = transitions(cuts, luma, grids, seams, fps)
    changes = scenes(grids, cuts, fps)
    samp = samples(clip, info, F)
    # type: the largest confident text line per sample, as a share of the frame height; and what each picture shows
    th, has, unsure, confs, read = [], 0, 0, [], {}
    for f, rgb in samp:
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        tl = text_lines(gray)
        sure = [d for d in tl if d['conf'] >= TEXT['conf']]
        read[f] = moment_kind(gray, tl)
        if sure:
            has += 1
            th.append(max(d['box'][3] for d in sure) / rgb.shape[0])
            confs += [d['conf'] for d in sure]
        elif tl:
            unsure += 1
    # one frame from the middle of each picture (between picture changes) says what it shows
    bounds = [0] + changes + [info['frames']]
    kinds_seq = []
    for a_, b_ in zip(bounds, bounds[1:]):
        if b_ > a_ and read:
            kinds_seq.append(read[min(read, key=lambda f: abs(f - (a_ + b_) / 2))])
    moment = {k: kinds_seq.count(k) for k in ('type', 'ui', 'picture', 'graphic')}
    pal = [palette_of(rgb) for _, rgb in samp]
    tones = {t: r(sum(1 for p in pal if p['tone'] == t) / max(1, len(pal))) for t in ('light', 'mid', 'dark', 'field')}
    # blur on fast moves: sharpness of fast frames against still ones in the same film
    pair = {int(k): v for k, v in (series.get('pair') or {}).items()}
    fast = [sharp[f] for f in range(len(sharp)) if sharp[f] and float((pair.get(f) or {}).get('speed') or 0) > 600]
    slow = [sharp[f] for f in range(len(sharp)) if sharp[f] and float((pair.get(f) or {}).get('speed') or 0) < 60]
    ratio = (q(fast, 0.5) / q(slow, 0.5)) if fast and slow and q(slow, 0.5) else None
    blur = None if ratio is None or len(fast) < max(6, int(0.1 * fps)) else ('camera' if ratio < 0.6 else 'crisp')
    # camera activity
    win = [v for v in (series.get('window') or {}).values() if isinstance(v, dict)]
    cam_live = [w for w in win if (w.get('cam_pxs') or 0) >= 6 or (w.get('cam_pct') or 0) >= 1]
    zoom = [w for w in win if (w.get('cam_pct') or 0) >= 1]
    tempo = tempo_of(clip, cuts, fps, quiet=args.quiet) if not args.no_music else {'bpm': None, 'source': 'skipped'}
    # the target: the clip's numbers as bands around them
    lens = M.get('shot_lengths') or []
    one_take = bool(M.get('one_take'))
    med = M.get('shot_median')
    fam = {k: sum(1 for m in mv if m['family'] == k) for k in ('front', 'symmetric', 'back', 'linear')}
    nm = max(1, len(mv))
    shares = {'arrive': fam['front'] / nm, 'reposition': fam['symmetric'] / nm, 'leave': fam['back'] / nm, 'linear': fam['linear'] / nm}
    ent = [m for m in mv if m['after_cut']]
    into = [m for m in mv if m['into_cut']]
    target = {'source': f'like.py: the grammar of the clip ({ident})'}
    if med and not one_take and len(lens) >= 3:
        band = [r(max(0.2, med * 0.85), 2), r(med * 1.15 if med * 0.3 >= 0.15 else med + 0.15, 2)]
        sp = M.get('shot_spread') or 2.0
        target['shot'] = {'band': {k: band for k in FORMAT_KEYS}, 'spread': [r(max(1.05, sp - 0.4), 2), r(sp + 0.4, 2)], 'r70': 1.75}
    if len(mv) >= 4:
        sh = {k: r(v, 3) for k, v in shares.items()}
        sh['spring'] = 0.0
        target['roleMix'] = {'shares': sh, 'tvdMax': 0.2}
    if len(ent) >= 2:
        target['frontLoaded'] = r(max(0.3, sum(1 for m in ent if m['family'] == 'front') / len(ent) - 0.1), 2)
    if into:
        target['intoCuts'] = r(max(0.3, sum(1 for m in into if m['family'] in ('back', 'linear')) / len(into) - 0.1), 2)
    if M.get('starts_per_s') is not None:
        s_ = M['starts_per_s']
        c_ = M.get('concurrency') or 1.5
        target['density'] = {'startsPerSec': [r(s_ * 0.8, 2), r(s_ * 1.2, 2)], 'concurrent': [r(c_ * 0.8, 2), r(c_ * 1.2, 2)],
                             'idleMax': r(max(0.05, (M.get('idle_share') or 0.1) * 1.3), 2)}
    total_t = sum(kinds.values())
    if total_t:
        mix = {'hard': kinds['hard'], 'velocity': kinds['carried'], 'light': kinds['flash'], 'colour': kinds['dip'], 'dissolveUi': kinds['soft']}
        target['seams'] = {'carriedMin': r(max(0.2, (kinds['carried'] + kinds['soft']) / total_t - 0.1), 2),
                           'mix': {k: r(v / total_t, 3) for k, v in mix.items() if v}, 'mixTvdMax': 0.35}
    cs = M.get('cut_sync')
    if cs and not one_take:
        target['cutSync'] = {'within1f': r(max(0.2, cs['within_1f'] - 0.1), 2), 'within100ms': r(max(0.3, cs['within_100ms'] - 0.1), 2)}
    pm = M.get('picture') or {}
    if pm:
        target['picture'] = {'target': {'flatMax': r(min(0.75, (pm.get('flat') or 0.55) * 1.1), 3), 'edgesMin': r(max(0.018, (pm.get('edges') or 0.03) * 0.9), 4),
                                        'saturatedMin': r(max(0.022, (pm.get('saturated') or 0.06) * 0.9), 4)}}
    target['like'] = {
        'clip': ident, 'seconds': r(info['frames'] / fps, 2), 'fps': r(fps, 3), 'size': [info['w'], info['h']],
        'shots': {'count': len(lens), 'median_s': r(med, 3), 'q25_s': r(q(lens, 0.25)), 'q75_s': r(q(lens, 0.75)), 'longest_s': r(max(lens) if lens else None),
                  'cuts_per_s': r(len(cuts) / max(0.1, info['frames'] / fps)), 'one_take': one_take},
        'changes': (lambda ls: {'count': len(changes), 'median_s': r(q(ls, 0.5)), 'per_s': r(len(changes) / max(0.1, info['frames'] / fps)),
                               'carried_share': r(1 - sum(1 for c in changes if c in set(cuts)) / max(1, len(changes)))})(
            [(b - a) / fps for a, b in zip([0] + changes, changes + [info['frames']])]),
        'cut_on_sound': cs, 'tempo': tempo,
        'camera': {'moving_share': r(len(cam_live) / max(1, len(win))), 'zoom_share': r(len(zoom) / max(1, len(win))),
                   'speed_pxs_median': r(q([w.get('cam_pxs') for w in cam_live], 0.5), 1)},
        'moves': {'count': len(mv), 'families': {k: r(v / nm) for k, v in fam.items()}, 'mean_pxs_median': r(q([m['mean_pxs'] for m in mv], 0.5), 1)},
        'transitions': kinds,
        'type': {'text_share': r(has / max(1, len(samp))), 'line_height_median': r(q(th, 0.5)), 'line_height_largest': r(q(th, 0.9)),
                 'confidence': r(q(confs, 0.5), 2), 'unsure_share': r(unsure / max(1, len(samp))),
                 'note': 'estimates from glyph lines read without OCR (confident lines only); heights are a share of the frame height'},
        'moments': {'kinds': moment, 'sequence': kinds_seq[:60],
                    'note': 'what each picture shows, read from one frame of it: picture (footage or a photograph), ui, type, graphic'},
        'density': {'starts_per_s': M.get('starts_per_s'), 'concurrency': M.get('concurrency'), 'idle_share': M.get('idle_share'), 'living_holds': M.get('living_holds')},
        'palette': {'ground': r(sum(p['ground'] for p in pal) / max(1, len(pal))), 'ink': r(sum(p['ink'] for p in pal) / max(1, len(pal))),
                    'accent': r(sum(p['accent'] for p in pal) / max(1, len(pal))), 'tones': tones, 'hues': 'not recorded: the film keeps its own colours'},
        'picture': {k: pm.get(k) for k in ('flat', 'edges', 'saturated', 'falloff', 'bleed_share')} if pm else None,
        'blur': {'policy': blur, 'fast_vs_still_sharpness': r(ratio), 'fast_frames': len(fast)},
    }
    os.makedirs(args.out, exist_ok=True)
    jp, mp = os.path.join(args.out, 'like.json'), os.path.join(args.out, 'LIKE.md')
    with open(jp, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(target, fh, indent=1)
        fh.write('\n')
    with open(mp, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(like_md(target, ident))
    if not args.quiet:
        L = target['like']
        print(f"like.py: {L['clip']}: {L['seconds']} s, {L['shots']['count']} shots (median {L['shots']['median_s']} s), "
              f"{L['changes']['count']} picture changes (median {L['changes']['median_s']} s), cuts on a sound {(cs or {}).get('within_1f')}, camera moving {L['camera']['moving_share']}, moves {L['moves']['families']}, "
              f"text {L['type']['text_share']}, blur {blur}, tempo {tempo.get('bpm')}")
        print(f'  wrote {jp} and {mp}')
    return 0


def pct(x):
    return '-' if x is None else f'{100 * x:.0f} %'


def like_md(t, clip):
    L = t['like']
    sh, cam, mv, ty, pal, bl, te = L['shots'], L['camera'], L['moves'], L['type'], L['palette'], L['blur'], L['tempo']
    fam = mv['families']
    tr = L['transitions']
    unsure = f' (lines too unsure to count in {pct(ty["unsure_share"])} of the film)' if ty.get('unsure_share') else ''
    lines = [
        '# Like this clip: the grammar to borrow', '',
        f'Measured from the clip ({clip}) by scripts/like.py. These are targets for pace, rhythm, motion and proportion; the film',
        'keeps its own idea sentence, its own direction from the deck, its own copy, colours and pictures.', '',
        '## The rules', '',
        '- Borrow grammar: shot lengths and cut rhythm, how often a cut lands on a sound, camera habits, the curve',
        '  families of the main moves, how shots hand over, type scale and how much of the film carries text, motion',
        '  density, the proportions of ground, ink and accent, the blur policy, the tempo.',
        '- Never content: no shot retold one by one, no layout copied frame for frame, no text, no logo, no other',
        '  company\'s colours (this file records ground tones and proportions, never the clip\'s hues), no footage, no',
        '  music from the clip.',
        '- The film keeps its own idea sentence and its own direction (python3 scripts/deck.py): the clip shapes the',
        '  timing and the habits inside it, not the concept.',
        '- Check the finished film: `python3 scripts/like.py guard --film out/film.mp4 --clip <clip>` must pass (the',
        '  contact sheets at the same density must not read as a recreation).',
        '- Score closeness to the clip instead of the house grammar: `node scripts/grammar-score.mjs --target out/like.json`.',
        '', '## The grammar', '',
        f'- **Length and shots:** {L["seconds"]} s, {sh["count"]} shots' + ('' if sh['one_take'] else
            f', median {sh["median_s"]} s (middle half {sh["q25_s"]}-{sh["q75_s"]} s, longest {sh["longest_s"]} s), {sh["cuts_per_s"]} cuts a second') + '.',
        (f'- **Picture changes:** {L["changes"]["count"]} (every {L["changes"]["median_s"]} s at the median, {L["changes"]["per_s"]} a second), '
         f'{pct(L["changes"]["carried_share"])} of them without a hard cut (a morph, a carried element, a move into the next layout): '
         'keep the rate with your own hand-overs.' if L.get('changes') else '- **Picture changes:** not measured.'),
        f'- **Cuts and sound:** {pct((L.get("cut_on_sound") or {}).get("within_1f"))} of cuts within a frame of a sound'
        + (f'; {pct(te.get("cuts_on_beat"))} on a beat, {pct(te.get("cuts_on_downbeat"))} on a downbeat' if te.get('cuts_on_beat') is not None else '') + '.',
        f'- **Tempo:** {te.get("bpm") or "not measured"} BPM' + (f' ({te.get("source")})' if te.get('bpm') else '') + '.',
        f'- **Camera:** moving in {pct(cam["moving_share"])} of the film, zooming in {pct(cam["zoom_share"])}; median camera speed {cam["speed_pxs_median"]} px/s at 1080p.',
        f'- **Main moves:** {mv["count"]} moves; front-loaded {pct(fam.get("front"))}, symmetric {pct(fam.get("symmetric"))}, '
        f'accelerating {pct(fam.get("back"))}, constant {pct(fam.get("linear"))}.',
        f'- **Hand-overs:** {tr["hard"]} hard cuts, {tr["carried"]} carried, {tr["flash"]} flashes, {tr["dip"]} dips, {tr["soft"]} soft (no cut).',
        (f'- **Type:** text in {pct(ty["text_share"])} of the film; the typical line {pct(ty["line_height_median"])} of the frame height, the largest {pct(ty["line_height_largest"])}.'
         if ty['text_share'] else f'- **Type:** no text read with confidence{unsure}: set the type from the direction, not from the clip.'),
        (f'- **What the pictures show:** ' + ', '.join(f'{k} {v}' for k, v in L['moments']['kinds'].items() if v) + ' (one frame of each picture; an estimate).'
         if L.get('moments') and any(L['moments']['kinds'].values()) else '- **What the pictures show:** not measured.'),
        f'- **Density:** {L["density"]["starts_per_s"]} starts a second, {L["density"]["concurrency"]} running at once, idle {pct(L["density"]["idle_share"])}.',
        f'- **Proportions:** ground {pct(pal["ground"])}, ink {pct(pal["ink"])}, accent {pct(pal["accent"])} of the frame; grounds '
        + ', '.join(f'{k} {pct(v)}' for k, v in pal['tones'].items() if v) + '.',
        f'- **Blur:** {bl["policy"] or "not enough fast moves to tell"}' + (f' (fast frames keep {pct(bl["fast_vs_still_sharpness"])} of the still sharpness)' if bl['fast_vs_still_sharpness'] is not None else '') + '.',
        '', '## How to use it', '',
        '1. Deal the direction as usual; read this grammar into it (shot lengths, the cut rhythm, the camera habits).',
        '2. Write the timeline to the shot band and the cut placement above; set LOOK.blur to the blur policy.',
        '3. Score each render against the clip: `node scripts/grammar-score.mjs --target out/like.json` (with look-audit.py\'s report).',
        '4. Before delivery: `python3 scripts/like.py guard --film out/film.mp4 --clip <clip>` (with `--scaffold out/scaffold.mp4` when the',
        '   film was made from a template): no frame retold, no composition re-skinned.', '']
    return '\n'.join(lines)


# -------------------------------------------------------------------------------------------------- guard
def layout_maps(rgb):
    """The structure map (edges and non-ground area, 48 x 27) and the colour grid (8 x 6 OKLab) of a frame."""
    small = cv2.resize(rgb, (192, 108), interpolation=cv2.INTER_AREA)
    g = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    e = (cv2.Canny(g, 50, 140) > 0).astype(np.float32)
    flat = small.reshape(-1, 3)
    vals, counts = np.unique((flat // 16), axis=0, return_counts=True)
    gcol = (vals[np.argmax(counts)] * 16 + 8).astype(np.int16)
    ng = (np.abs(small.astype(np.int16) - gcol[None, None, :]).max(axis=2) > 28).astype(np.float32)
    struct = cv2.resize(0.6 * e + 0.4 * ng, (48, 27), interpolation=cv2.INTER_AREA)
    col = oklab(cv2.resize(small, (8, 6), interpolation=cv2.INTER_AREA).reshape(-1, 3))
    return struct, col


def overlap(a, b):
    a, b = a.ravel() - a.mean(), b.ravel() - b.mean()
    den = float(np.sqrt((a * a).sum() * (b * b).sum()))
    return 0.0 if den < 1e-9 else max(0.0, float((a * b).sum()) / den)


def colour_distance(a, b):
    return float(np.sqrt(((a - b) ** 2).sum(axis=1)).mean())


def stills(path):
    """The stills of a reference folder, in name order."""
    return [os.path.join(path, f) for f in sorted(os.listdir(path)) if f.lower().endswith(STILLS)]


def read_still(path, w):
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h = max(2, int(round(rgb.shape[0] * w / rgb.shape[1])) // 2 * 2)
    return cv2.resize(rgb, (w, h), interpolation=cv2.INTER_AREA)


def source_id(path):
    """A reference as the outputs name it: a video's hash, or a folder's (its stills' names and sizes), never a path."""
    if not os.path.isdir(path):
        return clip_id(path)
    import hashlib
    h = hashlib.sha256()
    files = stills(path)
    for f in files:
        h.update(os.path.basename(f).encode('utf-8'))
        h.update(str(os.path.getsize(f)).encode())
    return f"sha256 {h.hexdigest()[:12]}, {len(files)} stills"


def sample_maps(path, F, every):
    out = []
    if os.path.isdir(path):
        for k, f in enumerate(stills(path)):
            rgb = read_still(f, 320)
            if rgb is not None:
                s_, c_ = layout_maps(rgb)
                out.append({'f': k, 't': round(k * every, 2), 'struct': s_, 'col': c_, 'thumb': cv2.resize(rgb, (160, 90), interpolation=cv2.INTER_AREA)})
        return out
    info = F.probe(path)
    w = 320
    h = max(2, int(round(info['h'] * w / info['w'])) // 2 * 2)
    step = max(1, int(round(every * info['fps'])))
    for f, rgb in F.decode(path, info, 0, None, size=(w, h)):
        if f % step == step // 2:
            s_, c_ = layout_maps(rgb)
            out.append({'f': f, 't': round(f / info['fps'], 2), 'struct': s_, 'col': c_, 'thumb': cv2.resize(rgb, (160, 90), interpolation=cv2.INTER_AREA)})
    return out


def guard_pairs(film, clip):
    rows = []
    for a in film:
        best = None
        for b in clip:
            ov = overlap(a['struct'], b['struct'])
            cd = colour_distance(a['col'], b['col'])
            rec = (ov >= GUARD['layout'] and cd <= GUARD['colour']) or ov >= GUARD['layout_only']
            # a pair that reads as a recreation first, then the closest layout, colour only as the tie-break: a frame
            # whose own shot is in the clip in other colours is matched to that shot, never to a closer grade elsewhere
            key = (rec, ov, -cd)
            if best is None or key > best[0]:
                best = (key, ov, cd, b)
        (rec, _, _), ov, cd, b = best
        rows.append({'film_t': a['t'], 'clip_t': b['t'], 'source': b.get('src', 'clip'), 'layout_overlap': round(ov, 3), 'colour_distance': round(cd, 3),
                     'recreation': bool(rec), '_a': a, '_b': b})
    return rows


def verdict(rows):
    n = len(rows)
    rec = sum(1 for x in rows if x['recreation'])
    run = best = 0
    for x in rows:
        run = run + 1 if x['recreation'] else 0
        best = max(best, run)
    fail = n > 0 and (rec / n >= GUARD['share'] or best >= GUARD['run'])
    return {'samples': n, 'recreations': rec, 'share': round(rec / max(1, n), 3), 'longest_run': best, 'pass': not fail,
            'layout_overlap_median': r(q([x['layout_overlap'] for x in rows], 0.5)), 'colour_distance_median': r(q([x['colour_distance'] for x in rows], 0.5))}


def sheet(rows, path, flag='recreation'):
    tiles = []
    for x in rows:
        a = x['_a']['thumb']
        b = x['_b']['thumb'] if x.get('_b') is not None else np.zeros_like(a)
        pair = np.concatenate([a, np.full((90, 6, 3), 255, np.uint8), b], axis=1)
        pair = cv2.copyMakeBorder(pair, 4, 4, 4, 4, cv2.BORDER_CONSTANT, value=(220, 40, 40) if x.get(flag) else (30, 30, 30))
        tiles.append(pair)
    if not tiles:
        return
    cols = 4
    while len(tiles) % cols:
        tiles.append(np.zeros_like(tiles[0]))
    grid = np.concatenate([np.concatenate(tiles[i:i + cols], axis=1) for i in range(0, len(tiles), cols)], axis=0)
    os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
    cv2.imwrite(path, cv2.cvtColor(grid, cv2.COLOR_RGB2BGR))


# ----------------------------------------------------------------------------------------- layout overlap
def _smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def layout_sig(rgb):
    """A frame's composition on a 32 x 18 grid: where its confident text lines sit, where its objects sit (anything
    that stands off the ground: the ground is the flat region that reaches the frame edge, kept with the pixels close
    to its smooth estimate, so a gradient ground stays ground) and which of those objects are pictures (textured).
    Returns the maps (text, object, picture), whether the frame is specific enough to be anyone's copy (three elements
    or more, objects on 3-60 % of the frame) and its object cover."""
    H, W = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    text = np.zeros((H, W), np.float32)
    for d in text_lines(gray):
        if d['conf'] >= LAYOUT['text_conf']:
            x, y, w, h = d['box']
            text[y:y + h, x:x + w] = 1
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[..., 0]
    mu = cv2.blur(L, (5, 5))
    sd = np.sqrt(np.maximum(cv2.blur(L * L, (5, 5)) - mu * mu, 0))
    cmu = cv2.blur(lab, (5, 5))
    csd = np.sqrt(np.maximum(cv2.blur(lab * lab, (5, 5)) - cmu * cmu, 0)).max(axis=2)
    flat = ((sd < 2.0) & (csd < 2.5)).astype(np.uint8)
    n, cc, st, _ = cv2.connectedComponentsWithStats(flat, connectivity=4)
    ground = np.zeros((H, W), bool)
    for i in range(1, n):
        x, y, w, h, a = (int(v) for v in st[i])
        if a >= 0.06 * H * W and (x == 0 or y == 0 or x + w == W or y + h == H):
            ground |= cc == i
    if ground.any():
        gm = cv2.GaussianBlur(np.where(ground[..., None], lab, 0), (0, 0), 25)
        wt = cv2.GaussianBlur(ground.astype(np.float32), (0, 0), 25)[..., None]
        est = gm / np.maximum(wt, 1e-3)
        ground |= (np.abs(lab - est).max(axis=2) < 7) & (wt[..., 0] > 0.15)
    tdil = cv2.dilate(text, np.ones((5, 5), np.uint8)) > 0
    obj = (~ground) & (~tdil)
    cw, ch = LAYOUT['cells']
    cell = lambda m: cv2.resize(m.astype(np.float32), (cw, ch), interpolation=cv2.INTER_AREA)
    o, t = cell(obj), cell(obj & (sd > 3.0))
    maps = np.stack([np.clip(cell(text), 0, 1), o, o * _smooth(t / np.maximum(o, 1e-6), 0.25, 0.55)]).astype(np.float32)
    elements = 0
    for c, least in ((0, 1), (1, 2)):
        k, _, cst, _ = cv2.connectedComponentsWithStats((maps[c] > 0.35).astype(np.uint8), connectivity=8)
        elements += sum(1 for i in range(1, k) if cst[i][4] >= least)
    cover = float(o.mean())
    lo, hi = LAYOUT['cover']
    return {'maps': maps, 'specific': bool(elements >= LAYOUT['elements'] and lo <= cover <= hi), 'cover': round(cover, 3), 'elements': elements}


def _blurred(maps):
    """The text and object maps at each blur radius, flattened: (radii, 2, cells)."""
    return np.stack([np.stack([cv2.GaussianBlur(maps[c], (0, 0), sg).ravel() for c in (0, 1)]) for sg in LAYOUT['blur']]).astype(np.float32)


def layout_overlaps(a, B):
    """Layout overlap of one frame's blurred maps `a` (radii, 2, cells) with many (N, radii, 2, cells): the soft IoU of
    the text maps and of the object maps, the text at LAYOUT['text_weight'] (a text reader without OCR misses a line
    now and then; the objects hold the composition), objects alone when neither frame holds text, averaged over the
    blur radii. Returns N values in 0..1."""
    mn = np.minimum(a[None], B).sum(axis=3)
    mx = np.maximum(a[None], B).sum(axis=3)
    iou = np.where(mx > 1e-6, mn / np.maximum(mx, 1e-6), 0.0)  # (N, radii, 2)
    has_text = mx[:, :, 0] >= 1.0
    tw = LAYOUT['text_weight']
    v = np.where(has_text, tw * iou[:, :, 0] + (1 - tw) * iou[:, :, 1], iou[:, :, 1])
    return v.mean(axis=1)


def layout_frames(path, F, every, width):
    """(t, rgb) samples of a video (every `every` s, by ffmpeg) or of a folder of stills (each one sample)."""
    if os.path.isdir(path):
        for k, f in enumerate(stills(path)):
            rgb = read_still(f, width)
            if rgb is not None:
                yield round(k * every, 2), rgb
        return
    info = F.probe(path)
    h = max(2, int(round(info['h'] * width / info['w'])) // 2 * 2)
    cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-map', '0:v:0', '-vf', f'fps={1.0 / every:.6f},scale={width}:{h}:flags=area',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    nb, k = width * h * 3, 0
    try:
        while True:
            buf = p.stdout.read(nb)
            if len(buf) < nb:
                break
            yield round(k * every, 2), np.frombuffer(buf, np.uint8).reshape(h, width, 3)
            k += 1
    finally:
        p.stdout.close()
        p.kill()
        p.wait()


def layout_samples(path, F, every, cache=None):
    """Every sample's layout (layout_sig) and a thumbnail; read from `cache` when this source was read before."""
    key = None
    if cache:
        import hashlib
        key = hashlib.sha256(json.dumps([source_id(path), every, LAYOUT['width'], LAYOUT['cells'], LAYOUT['text_conf'], 2]).encode()).hexdigest()[:16]
        cf = os.path.join(cache, f'layout-{key}.npz')
        if os.path.isfile(cf):
            z = np.load(cf)
            return [{'t': float(t), 'maps': m, 'specific': bool(sp), 'cover': float(cv), 'elements': int(el), 'thumb': th}
                    for t, m, sp, cv, el, th in zip(z['t'], z['maps'], z['specific'], z['cover'], z['elements'], z['thumb'])]
    out = []
    for t, rgb in layout_frames(path, F, every, LAYOUT['width']):
        sig = layout_sig(rgb)
        sig['t'] = t
        sig['thumb'] = cv2.resize(rgb, (160, 90), interpolation=cv2.INTER_AREA)
        out.append(sig)
    if cache and out:
        os.makedirs(cache, exist_ok=True)
        np.savez_compressed(os.path.join(cache, f'layout-{key}.npz'), t=np.array([x['t'] for x in out]), maps=np.stack([x['maps'] for x in out]),
                            specific=np.array([x['specific'] for x in out]), cover=np.array([x['cover'] for x in out]),
                            elements=np.array([x['elements'] for x in out]), thumb=np.stack([x['thumb'] for x in out]))
    return out


def layout_check(film_path, refs, F, cache=None):
    """The layout-overlap check: each specific film sample against every specific sample of every reference; the
    verdict reads runs of copies of one reference and the share of copies."""
    fs = layout_samples(film_path, F, LAYOUT['every'])
    rs = []
    for label, p in refs:
        for x in layout_samples(p, F, LAYOUT['every'], cache):
            x['src'] = label
            rs.append(x)
    ref_ok = [x for x in rs if x['specific']]
    B = np.stack([_blurred(x['maps']) for x in ref_ok]) if ref_ok else None
    rows = []
    for a in fs:
        row = {'film_t': a['t'], 'specific': a['specific'], 'elements': a['elements'], 'cover': a['cover'], 'layout_overlap': None, 'source': None, 'ref_t': None, 'copy': False, '_a': a, '_b': None}
        if a['specific'] and B is not None:
            v = layout_overlaps(_blurred(a['maps']), B)
            j = int(np.argmax(v))
            row.update(layout_overlap=round(float(v[j]), 3), source=ref_ok[j]['src'], ref_t=ref_ok[j]['t'], copy=bool(v[j] >= LAYOUT['overlap']), _b=ref_ok[j])
        rows.append(row)
    spec = [x for x in rows if x['specific']]
    copies = sum(1 for x in spec if x['copy'])
    run = best = 0
    best_src = None
    prev = None
    for x in rows:
        if x['copy'] and (prev is None or x['source'] == prev):
            run += 1
        elif x['copy']:
            run = 1
        else:
            run = 0
        prev = x['source'] if x['copy'] else None
        if run > best:
            best, best_src = run, x['source']
    share = copies / max(1, len(spec))
    fail = bool(spec) and (best >= LAYOUT['run'] or share >= LAYOUT['share'])
    return {'samples': len(rows), 'specific': len(spec), 'copies': copies, 'share': round(share, 3), 'longest_run': best, 'run_source': best_src,
            'overlap_median': r(q([x['layout_overlap'] for x in spec], 0.5)), 'overlap_max': r(max([x['layout_overlap'] or 0 for x in spec], default=None)),
            'pass': not fail, 'rows': rows}


def references(args):
    """The references a check runs against: the clips the user supplied and the template's scaffold, each labelled by
    its kind and hash."""
    refs = []
    for kind, paths in (('clip', args.clip or []), ('scaffold', args.scaffold or [])):
        for p in paths:
            if not (os.path.isfile(p) or os.path.isdir(p)):
                die(f'{p} not found')
            if os.path.isdir(p) and not stills(p):
                die(f'{p} holds no stills ({", ".join(STILLS)})')
            refs.append((f'{kind} {source_id(p)}', p))
    if not refs:
        die('give at least one reference: --clip <clip> (as many as the user supplied) and/or --scaffold <the template\'s scaffold render>')
    return refs


def print_layout(lv):
    print(f"like.py layout: {lv['samples']} samples ({lv['specific']} specific), {lv['copies']} copy a reference's layout ({pct(lv['share'])}, longest run "
          f"{lv['longest_run']}{' of ' + lv['run_source'] if lv['run_source'] else ''}); overlap median {lv['overlap_median']}, max {lv['overlap_max']} -> "
          f"{'PASS: its compositions are its own' if lv['pass'] else 'FAIL: it re-skins a reference composition'}")
    if not lv['pass']:
        for x in lv['rows']:
            if x['copy']:
                print(f"  film {x['film_t']} s ~ {x['source']} at {x['ref_t']} s: layout overlap {x['layout_overlap']}")


def layout_json(lv):
    return {k: v for k, v in lv.items() if k != 'rows'} | {
        'pairs': [{k: x[k] for k in ('film_t', 'specific', 'elements', 'cover', 'layout_overlap', 'source', 'ref_t', 'copy')} for x in lv['rows']]}


def guard(args):
    need()
    F = module('forensics_mod', 'forensics.py')
    if not os.path.isfile(args.film):
        die(f'{args.film} not found')
    refs = references(args)
    v = None
    if args.cmd == 'guard':
        film = sample_maps(args.film, F, args.every)
        clip = []
        for label, p in refs:
            for m in sample_maps(p, F, args.every):
                m['src'] = label
                clip.append(m)
        if not film or not clip:
            die('no frames could be read')
        rows = guard_pairs(film, clip)
        v = verdict(rows)
    lv = None if getattr(args, 'no_layout', False) else layout_check(args.film, refs, F, args.cache)
    ok = (v is None or v['pass']) and (lv is None or lv['pass'])
    res = {'tool': f'like.py {args.cmd}', 'film': args.film, 'references': [label for label, _ in refs], 'pass': ok}
    if v is not None:
        res['frames'] = {'every_s': args.every, 'thresholds': GUARD, **v,
                         'pairs': [{k: x[k] for k in ('film_t', 'clip_t', 'source', 'layout_overlap', 'colour_distance', 'recreation')} for x in rows]}
        res.update({k: res['frames'][k] for k in ('samples', 'recreations', 'share', 'longest_run', 'layout_overlap_median', 'colour_distance_median')})
        res['clip'] = refs[0][0]
    if lv is not None:
        res['layout'] = {'every_s': LAYOUT['every'], 'thresholds': {k: LAYOUT[k] for k in ('overlap', 'run', 'share', 'cover', 'elements')}, **layout_json(lv)}
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)) or '.', exist_ok=True)
        json.dump(res, open(args.json, 'w', encoding='utf-8'), indent=1)
    if v is not None and args.sheet:
        sheet(rows, args.sheet)
    if lv is not None and getattr(args, 'layout_sheet', None):
        sheet([x for x in lv['rows'] if x['specific']], args.layout_sheet, flag='copy')
    if v is not None:
        print(f"like.py guard: {v['samples']} frames against {len(refs)} reference(s), {v['recreations']} read as a recreation ({pct(v['share'])}, longest run "
              f"{v['longest_run']}); layout overlap median {v['layout_overlap_median']}, colour-layout distance median {v['colour_distance_median']} -> "
              f"{'PASS: the film is its own' if v['pass'] else 'FAIL: it reads as a recreation of a reference'}")
        if not v['pass']:
            for x in rows:
                if x['recreation']:
                    print(f"  film {x['film_t']} s ~ {x['source']} at {x['clip_t']} s: layout overlap {x['layout_overlap']}, colour-layout distance {x['colour_distance']}")
    if lv is not None:
        print_layout(lv)
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    sub = ap.add_subparsers(dest='cmd')
    m = sub.add_parser('measure', help='measure a clip into out/like.json and out/LIKE.md')
    m.add_argument('clip')
    m.add_argument('--out', default='out')
    m.add_argument('--width', type=int, default=480, help='analysis width for the motion pass (default 480)')
    m.add_argument('--no-music', action='store_true', help='skip the tempo')
    m.add_argument('--quiet', action='store_true')
    g = sub.add_parser('guard', help='the film must not read as a recreation of a reference, nor re-skin its compositions')
    lo = sub.add_parser('layout', help='the layout-overlap check alone: the film must not re-skin a reference composition')
    for x in (g, lo):
        x.add_argument('--film', required=True)
        x.add_argument('--clip', action='append', help='a clip the user supplied (a video or a folder of stills); repeat for each')
        x.add_argument('--scaffold', action='append', help="the template's scaffold, rendered before anything was changed (a video or a folder of stills)")
        x.add_argument('--json', help='write the pairs and the verdict here')
        x.add_argument('--layout-sheet', help='write a paired contact sheet of the layout check (film frame | its closest reference layout; red: a copy)')
        x.add_argument('--cache', help="keep each reference's layout samples here (read once)")
    g.add_argument('--every', type=float, default=1.0, help='seconds between compared frames, the same for both (default 1)')
    g.add_argument('--sheet', help='write a paired contact sheet here (film frame | its closest reference frame; red: a recreation)')
    g.add_argument('--no-layout', action='store_true', help='the frame check alone')
    a = ap.parse_args()
    if a.cmd == 'measure':
        if not os.path.isfile(a.clip):
            die(f'{a.clip} not found')
        return measure(a)
    if a.cmd in ('guard', 'layout'):
        return guard(a)
    ap.print_help()
    return 2


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
