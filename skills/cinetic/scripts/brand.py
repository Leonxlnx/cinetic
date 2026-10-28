#!/usr/bin/env python3
"""Take in a supplied brand kit and write it into a film project: colours, type, the logo, screenshots.

A film made for a real product wears that product's brand: its logo built part by part into the lockup,
its colours, its typeface, its real screens. brand.py reads a kit (a folder, or files) and writes:

  brand/brand.json        what was supplied and what was measured: colours with their roles and checks, the
                          logo and how it splits into parts, fonts, screenshots and product photos
  src/brand/tokens.ts     the colour block (C) and the type families (FONT, FACES) in the starter's roles; the
                          type scale, units and safe areas stay as they are. Supplied colours are marked
                          cinetic:brand-supplied: they skip the house colour bans and are checked only for
                          contrast and the one-accent rule (palette.py --check-tokens)
  src/brand/logo.ts       the supplied logo SVG, parsed into parts for the mark and wordmark primitives
                          (LogoMark, AssembledMark, Lockup): LOGO, LOGO_SVG, LOGO_PARTS (and WORDMARK when a
                          separate wordmark file is supplied)
  src/brand/identity.ts   the product's name (--name)
  src/brand/fonts.ts      imports the vendored faces (licensed font files go to src/brand/fonts/<family>/
                          with an @font-face sheet); a Google font name is recorded for add-font.mjs
  src/brand/assets.ts     staticFile paths of the screenshots and photos copied into public/brand/

What it recognises (by extension, then by folder, then by name; what it cannot place is listed as unused):
  logo         .svg (preferred; names with logo, mark, symbol, icon, wordmark, logotype, lockup) or a raster
               logo .png/.webp/.jpg with one of those words; a wordmark/logotype/lockup file is the wordmark,
               a mark/symbol/icon file the mark; one logo file is both
  colours      a .json, .css, .scss, .txt, .md or .gpl file holding #RRGGBB, #RGB or rgb() values (names such
               as primary, accent, brand, background, surface, text, ink give the roles), or --colours; with
               none, the colours are measured from the logo and the screenshots (source "measured")
  fonts        .ttf, .otf, .woff, .woff2 (the family and weight come from the font's own name table when it
               can be read, else the file name); upright faces only, an italic file is recorded and skipped;
               or --font "<Google font name>"
  screenshots  .png/.jpg/.webp in a folder named screenshots, screens, ui or app, or with screen, ui, app,
               dashboard in the name: rebuild them as live UI with the product kit (src/kit) at film size;
               the image itself only under a camera move
  photos       images in a folder or with a name of photo, product, hero, lifestyle (a photo folder wins over a
               name: photos/landmark.jpg is a photo, never a logo)
  colour files CSS and SCSS comments are skipped; a file with custom properties (--name: value) is read from
               those only; border, hairline, divider and stroke names give the line role
Roles: the accent is a colour named primary/accent/brand, else the most chromatic colour; the ground and ink
are the named background/text colours, else the lightest and darkest neutrals. The kit's own greys and
papers are the grounds: paper, mist, line, mute, slate and the raised surfaces each take a supplied neutral
at their lightness first; what the kit leaves out is derived at the recipe's lightness on the kit's neutral
(its greys' hue, chroma no higher than theirs and .025; a plain grey when it has none), never at the
accent's hue. The film keeps one accent: a second brand hue is recorded for product UI states and imagery.

Usage (from the film project root, or pass --project):
  python3 scripts/brand.py <kit folder or files...> [--name "Quill"] [--project .]
          [--colours colours.json] [--accent '#1F6FEB'] [--font "Inter"] [--dry-run]
  python3 scripts/brand.py <kit> --out brand.json [--name "Quill"]   # before a project exists: brand.json only
  python3 scripts/brand.py --check [--project .]   # re-check brand/brand.json against src/brand/tokens.ts
Then: python3 scripts/deck.py ... --brand brand/brand.json maps a direction's ground / ink / accent
proportions onto these colours. With a kit and no project yet: brand.py <kit> --out brand.json, then
deck.py --brand brand.json, then new-film.sh <dir> --brand <kit> (it runs brand.py inside the project).
A project is checked before anything is copied into it.

Exit 0 written (or --dry-run printed), 1 a check failed (contrast, more than one accent where the film needs
one, no logo when a logo was expected), 2 bad input. Python standard library; Pillow or OpenCV, when
present, also read JPEG and WebP (PNG is read without them).
"""
import argparse
import importlib.util
import json
import math
import os
import re
import shutil
import struct
import sys
import zlib

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
IMG = ('.png', '.jpg', '.jpeg', '.webp')
FONT_EXT = ('.ttf', '.otf', '.woff', '.woff2')
COLOUR_EXT = ('.json', '.css', '.scss', '.txt', '.md', '.gpl')
# a logo word as a word of the file name: logo-mark.svg and logomark.png are logos, landmark.jpg is not
LOGO_WORDS = re.compile(r'logo|wordmark|logotype|lockup|symbol|(?<![a-z])(?:mark|icon|glyph|brand)(?![a-z])', re.I)
PHOTO_DIRS = re.compile(r'^(photos?|photography|images?|pictures?|product|products|lifestyle|hero|imagery)$', re.I)
WORDMARK_WORDS = re.compile(r'wordmark|logotype|lockup|horizontal|full', re.I)
SCREEN_WORDS = re.compile(r'screen|^ui$|[-_ ]ui[-_ .]|^app|dashboard|interface', re.I)
SCREEN_DIRS = re.compile(r'^(screenshots?|screens|ui|app|product-ui|interface)$', re.I)
PHOTO_WORDS = re.compile(r'photo|product|hero|lifestyle|shot', re.I)
# the specific words first: a CSS variable named --brand-background is a ground, not the accent
ROLE_WORDS = [('accent', re.compile(r'primary|accent', re.I)),
              ('line', re.compile(r'border|hairline|divider|stroke|outline|separator|(?<![a-z])line(?![a-z])', re.I)),
              ('ground', re.compile(r'background|\bbg\b|surface|paper|canvas', re.I)),
              ('ink', re.compile(r'text|\bink\b|foreground|\bfg\b|body|heading', re.I)),
              ('accent', re.compile(r'brand|main|key', re.I))]
WEIGHTS = [('thin', 100), ('hairline', 100), ('extralight', 200), ('ultralight', 200), ('light', 300), ('regular', 400),
           ('book', 400), ('normal', 400), ('medium', 500), ('semibold', 600), ('demibold', 600), ('extrabold', 800),
           ('ultrabold', 800), ('bold', 700), ('black', 900), ('heavy', 900)]


def die(msg, code=2):
    print(f'brand.py: {msg}', file=sys.stderr)
    sys.exit(code)


def _palette():
    spec = importlib.util.spec_from_file_location('palette', os.path.join(HERE, 'palette.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P = _palette()


# ---------------------------------------------------------------------------------------------- colour
def norm_hex(s):
    s = s.strip()
    m = re.fullmatch(r'#?([0-9a-fA-F]{3})', s)
    if m:
        return '#' + ''.join(c * 2 for c in m.group(1)).upper()
    m = re.fullmatch(r'#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?', s)
    if m:
        return '#' + m.group(1).upper()
    m = re.fullmatch(r'rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+[\d.]+%?)?\s*\)', s)
    if m:
        return '#' + ''.join(f'{min(255, int(v)):02X}' for v in m.groups())
    return None


def lch(hx):
    return P.parse_colour(hx)


def rgb_hex(r, g, b):
    return f'#{int(r):02X}{int(g):02X}{int(b):02X}'


def derive(L, C, h):
    return P.oklch_hex(L, C, h)[0]


def kit_neutral(neutral):
    """(hue, chroma) the kit's own greys lean to: their chroma-weighted hue and their highest chroma (capped at
    .025); a kit without tinted greys gets plain greys (C 0), whatever the accent."""
    tinted = [c for c in neutral if c['C'] >= 0.004]
    if not tinted:
        return 0.0, 0.0
    x = sum(c['C'] * math.cos(math.radians(c['h'])) for c in tinted)
    y = sum(c['C'] * math.sin(math.radians(c['h'])) for c in tinted)
    return math.degrees(math.atan2(y, x)) % 360, min(0.025, max(c['C'] for c in tinted))


def colours_from_text(text, name=''):
    """[(hex, role or None, label)] from a colours file: JSON keys, CSS custom properties, GIMP palettes or plain text."""
    out = []
    try:
        data = json.loads(text)
    except ValueError:
        data = None
    if data is not None:
        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + [str(k)])
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, path + [str(i)])
            elif isinstance(o, str):
                hx = norm_hex(o)
                if hx:
                    out.append((hx, ' '.join(path)))
        walk(data, [])
    else:
        if name.endswith(('.css', '.scss', '.less')):
            # comments never hold the brand's colours (an old value, a note): drop them; with custom properties,
            # the declarations are the palette and the rules that use them are not
            text = re.sub(r'/\*[\s\S]*?\*/', '', text)
            text = re.sub(r'(?m)(^|[^:])//.*$', r'\1', text)
            decl = [ln for ln in text.splitlines() if re.match(r'\s*--[\w-]+\s*:', ln) and re.search(r'#[0-9a-fA-F]{3}|rgba?\(', ln)]
            if decl:
                text = '\n'.join(decl)
        for line in text.splitlines():
            if name.endswith('.gpl'):
                m = re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)\s*(.*)', line)
                if m:
                    out.append((rgb_hex(*m.groups()[:3]), m.group(4)))
                continue
            label = re.split(r'[:=]', line)[0] if re.search(r'[:=]', line) else line
            for m in re.finditer(r'#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)', line):
                hx = norm_hex(m.group(0))
                if hx:
                    out.append((hx, label.strip(' \t-*/;"\'`')))
    seen, res = set(), []
    for hx, label in out:
        if hx in seen:
            continue
        seen.add(hx)
        role = next((r for r, rx in ROLE_WORDS if rx.search(label or '')), None)
        res.append({'hex': hx, 'label': label or '', 'named_role': role})
    return res


def svg_colours(svg):
    """Fill, stroke and gradient stop colours of an SVG with a rough weight (how many elements use each)."""
    found = {}
    for m in re.finditer(r'(?:fill|stroke|stop-color|color)\s*[=:]\s*["\']?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))', svg):
        hx = norm_hex(m.group(1))
        if hx:
            found[hx] = found.get(hx, 0) + 1
    n_elems = len(re.findall(r'<(path|rect|circle|ellipse|polygon|polyline)\b', svg))
    if not found and n_elems:  # no fill attribute: SVG paints black by default
        found['#000000'] = n_elems
    return found


def read_png(path):
    """(w, h, rows of (r, g, b)) of an 8-bit PNG (grey, RGB, palette, with or without alpha); None if unreadable."""
    try:
        data = open(path, 'rb').read()
    except OSError:
        return None
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    pos, idat, plte, trns = 8, b'', None, None
    w = h = depth = ctype = inter = 0
    while pos < len(data):
        n, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if kind == b'IHDR':
            w, h, depth, ctype, _, _, inter = struct.unpack('>IIBBBBB', body)
        elif kind == b'PLTE':
            plte = body
        elif kind == b'tRNS':
            trns = body
        elif kind == b'IDAT':
            idat += body
        elif kind == b'IEND':
            break
        pos += 12 + n
    if depth != 8 or inter or ctype not in (0, 2, 3, 4, 6):
        return None
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(idat)
    stride = w * ch
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[i]
        line = bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - ch] if x >= ch else 0
            b = prev[x]
            c = prev[x - ch] if x >= ch else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = line
        px = []
        for x in range(w):
            v = line[x * ch:(x + 1) * ch]
            if ctype == 0:
                px.append((v[0], v[0], v[0], 255))
            elif ctype == 2:
                px.append((v[0], v[1], v[2], 255))
            elif ctype == 3:
                k = v[0]
                al = trns[k] if trns and k < len(trns) else 255
                px.append((plte[3 * k], plte[3 * k + 1], plte[3 * k + 2], al))
            elif ctype == 4:
                px.append((v[0], v[0], v[0], v[1]))
            else:
                px.append((v[0], v[1], v[2], v[3]))
        rows.append(px)
    return w, h, rows


def read_image(path, max_side=160):
    """Opaque pixels (r, g, b) of an image, sampled down to about max_side; None if it cannot be read here."""
    try:
        from PIL import Image  # noqa: F401
        im = Image.open(path).convert('RGBA')
        im.thumbnail((max_side, max_side))
        return [(r, g, b) for r, g, b, a in im.getdata() if a > 200], im.size
    except Exception:  # noqa: BLE001 (no Pillow, or a format it cannot read)
        pass
    try:
        import cv2
        im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if im is not None:
            k = max_side / max(im.shape[:2])
            if k < 1:
                im = cv2.resize(im, (max(1, int(im.shape[1] * k)), max(1, int(im.shape[0] * k))), interpolation=cv2.INTER_AREA)
            out = []
            for row in im.tolist():
                for p in row:
                    if isinstance(p, int):
                        out.append((p, p, p))
                    elif len(p) == 4:
                        if p[3] > 200:
                            out.append((p[2], p[1], p[0]))
                    else:
                        out.append((p[2], p[1], p[0]))
            return out, (im.shape[1], im.shape[0])
    except Exception:  # noqa: BLE001
        pass
    if path.lower().endswith('.png'):
        got = read_png(path)
        if got:
            w, h, rows = got
            step = max(1, int(math.ceil(max(w, h) / max_side)))
            return [p[:3] for y in range(0, h, step) for p in rows[y][::step] if p[3] > 200], (w, h)
    return None


def cluster(pixels, min_share=0.004):
    """Main colours of a pixel list: OKLab bins merged, [(hex, share)] by share."""
    if not pixels:
        return []
    bins = {}
    for r, g, b in pixels:
        key = (r // 12, g // 12, b // 12)
        e = bins.setdefault(key, [0, 0, 0, 0])
        e[0] += r
        e[1] += g
        e[2] += b
        e[3] += 1
    cols = sorted(([v[3], (v[0] / v[3], v[1] / v[3], v[2] / v[3])] for v in bins.values()), reverse=True)
    merged = []
    for n, (r, g, b) in cols:
        L, C, h = lch(rgb_hex(r, g, b))
        for m in merged:
            dL = L - m[2][0]
            da = C * math.cos(math.radians(h)) - m[2][1] * math.cos(math.radians(m[2][2]))
            db = C * math.sin(math.radians(h)) - m[2][1] * math.sin(math.radians(m[2][2]))
            if math.sqrt(dL * dL + da * da + db * db) < 0.05:
                m[0] += n
                break
        else:
            merged.append([n, rgb_hex(r, g, b), (L, C, h)])
    total = len(pixels)
    return [(hx, round(n / total, 4)) for n, hx, _ in sorted(merged, reverse=True) if n / total >= min_share]


def assign_roles(cols):
    """The accent (named, else the most chromatic), the ground and the ink (named, else the lightest and darkest
    neutral), and the second hues (chromatic colours more than 30 degrees from the accent)."""
    for c in cols:
        c['L'], c['C'], c['h'] = (round(v, 4) for v in lch(c['hex']))
    chrom = [c for c in cols if c['C'] >= 0.06]
    named = lambda role, pool: next((c for c in pool if c.get('named_role') == role), None)  # noqa: E731
    acc = named('accent', chrom) or (max(chrom, key=lambda c: (c['C'] * (0.5 + c.get('share', 0.2)), c['C'])) if chrom else None)
    neutral = [c for c in cols if c['C'] < 0.06 and c is not acc and c.get('named_role') != 'line']
    ground = named('ground', cols) or (max(neutral, key=lambda c: c['L']) if neutral else None)
    ink = named('ink', [c for c in cols if c is not ground]) or (min((c for c in neutral if c is not ground), key=lambda c: c['L'], default=None))
    for c in cols:
        c['role'] = 'accent' if c is acc else 'ground' if c is ground else 'ink' if c is ink else 'line' if c.get('named_role') == 'line' else 'extra'
    second = [c for c in chrom if acc and c is not acc and min(abs(c['h'] - acc['h']), 360 - abs(c['h'] - acc['h'])) > 30]
    for c in second:
        c['role'] = 'second-hue'
    return acc, ground, ink, second


def verdict(t, stage):
    """Contrast on the stage the brand plays (paper for a light brand, ink for a dark one) and on the slate:
    statements 7:1, the accent 3:1 on its stage or lifted on the slate. Returns (checks, fails, notes)."""
    on = t['paper'] if stage == 'light' else t['ink']
    checks = {'stage': stage, 'statements': round(P.contrast(t['ink'], t['paper']), 2),
              'accent_on_stage': round(P.contrast(t['accent'], on), 2), 'accent_on_paper': round(P.contrast(t['accent'], t['paper']), 2),
              'accent_lift_on_slate': round(P.contrast(t['accentLift'], t['slate']), 2), 'type_on_slate': round(P.contrast(t['paper'], t['slate']), 2)}
    fails, notes = [], []
    if checks['statements'] < 7:
        fails.append(f'type {t["ink"]} on {t["paper"]} holds {checks["statements"]:.1f}:1, under 7:1 for statements')
    if checks['accent_on_stage'] < 3 and checks['accent_lift_on_slate'] < 3:
        fails.append(f'the accent {t["accent"]} holds {checks["accent_on_stage"]:.1f}:1 on its {stage} stage and the lift '
                     f'{checks["accent_lift_on_slate"]:.1f}:1 on the slate: it signals on neither (graphics need 3:1)')
    elif checks['accent_on_paper'] < 3:
        where = "the brand's dark ground" if stage == 'dark' else 'the slate or a deep field'
        notes.append(f'the accent holds {checks["accent_on_paper"]:.1f}:1 on paper: play the film on {where}, '
                     'or keep it to large graphics and floods on a light stage')
    return checks, fails, notes


def read_tokens(path):
    """{role: hex} of the C block of a tokens.ts."""
    src = open(path, encoding='utf-8').read()
    m = re.search(r'export const C = \{([\s\S]*?)\n\};', src)
    return {k: v.upper() for k, v in re.findall(r"^\s+(\w+): '(#[0-9A-Fa-f]{6})'", m.group(1), re.M)} if m else {}


# ------------------------------------------------------------------------------------------------ fonts
def font_names(path):
    """(family, weight, italic) from a TTF/OTF name and OS/2 table; None when the file cannot be read that way."""
    try:
        data = open(path, 'rb').read()
    except OSError:
        return None
    if data[:4] not in (b'\x00\x01\x00\x00', b'OTTO', b'true'):
        return None
    try:
        n = struct.unpack('>H', data[4:6])[0]
        tables = {}
        for i in range(n):
            tag, _, off, ln = struct.unpack('>4sIII', data[12 + 16 * i:28 + 16 * i])
            tables[tag] = (off, ln)
        names = {}
        if b'name' in tables:
            off, _ = tables[b'name']
            _, count, so = struct.unpack('>HHH', data[off:off + 6])
            for i in range(count):
                pid, eid, lid, nid, ln, sof = struct.unpack('>HHHHHH', data[off + 6 + 12 * i:off + 18 + 12 * i])
                raw = data[off + so + sof:off + so + sof + ln]
                s = raw.decode('utf-16-be', 'ignore') if pid in (0, 3) else raw.decode('latin-1', 'ignore')
                if nid in (1, 2, 16, 17) and (nid not in names or pid == 3):
                    names[nid] = s
        weight, italic = 400, False
        if b'OS/2' in tables:
            off, _ = tables[b'OS/2']
            weight = struct.unpack('>H', data[off + 4:off + 6])[0]
            italic = bool(struct.unpack('>H', data[off + 62:off + 64])[0] & 1)
        family = names.get(16) or names.get(1)
        sub = (names.get(17) or names.get(2) or '').lower()
        italic = italic or 'italic' in sub or 'oblique' in sub
        return (family, weight, italic) if family else None
    except (struct.error, IndexError):
        return None


def font_from_filename(path):
    stem = re.sub(r'\.(woff2?|ttf|otf)$', '', os.path.basename(path), flags=re.I)
    low = stem.lower().replace('_', '-').replace(' ', '-')
    italic = 'italic' in low or 'oblique' in low
    weight = 400
    flat = low.replace('-', '')
    for word, w in WEIGHTS:
        if word in flat:
            weight = w
            break
    m = re.search(r'(?<!\d)([1-9]00)(?!\d)', low)
    if m:
        weight = int(m.group(1))
    fam = re.split(r'[-_ ]', stem)[0]
    fam = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', fam) or stem
    return fam, weight, italic


# ------------------------------------------------------------------------------------------------- logo
UNSAFE = [(re.compile(r'<script\b[\s\S]*?</script>', re.I), ''), (re.compile(r'<foreignObject\b[\s\S]*?</foreignObject>', re.I), ''),
          (re.compile(r'\son\w+\s*=\s*("[^"]*"|\'[^\']*\')', re.I), ''), (re.compile(r'<\?xml[^>]*>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->', re.I), '')]


def clean_svg(svg):
    for rx, rep in UNSAFE:
        svg = rx.sub(rep, svg)
    svg = re.sub(r'\s(xlink:)?href\s*=\s*("https?:[^"]*"|\'https?:[^\']*\')', '', svg)
    return re.sub(r'>\s+<', '><', svg.strip())


def svg_parts(svg):
    """How logoParts will split it: (split, part names, live text?) with leaves outside defs."""
    body = re.sub(r'<(defs|clipPath|mask|symbol|style|title|desc|metadata|linearGradient|radialGradient|pattern|filter)\b[\s\S]*?</\1>', '', svg)
    leaves = re.findall(r'<(path|rect|circle|ellipse|polygon|polyline|line)\b([^>]*)>', body)
    ids = [re.search(r'\bid\s*=\s*["\']([^"\']+)', a).group(1) for _, a in leaves if re.search(r'\bid\s*=', a)]
    groups = re.findall(r'<g\b([^>]*)>', body)
    gids = [re.search(r'\bid\s*=\s*["\']([^"\']+)', a).group(1) for a in groups if re.search(r'\bid\s*=', a)]
    if gids and len(gids) >= 2:
        split, names = 'ids', gids
    elif len(leaves) <= 24:
        split, names = 'leaves', [ids[i] if i < len(ids) else f'p{i}' for i in range(len(leaves))]
    else:
        split, names = 'top', gids or [f'g{i}' for i in range(max(1, len(groups)))]
    return split, names, len(leaves), bool(re.search(r'<text\b', body))


def ts_string(s):
    return '`' + s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${') + '`'


# --------------------------------------------------------------------------------------------- the kit
def classify(paths):
    kit = {'svg': [], 'raster_logo': [], 'colours': [], 'fonts': [], 'screens': [], 'photos': [], 'images': [], 'other': []}
    files = []
    for p in paths:
        if os.path.isdir(p):
            for root, dirs, fs in os.walk(p):
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('node_modules', '__MACOSX')]
                if root[len(p):].count(os.sep) > 2:
                    continue
                files += [os.path.join(root, f) for f in sorted(fs) if not f.startswith('.')]
        elif os.path.isfile(p):
            files.append(p)
        else:
            die(f'{p}: no such file or folder')
    for f in files:
        name, ext = os.path.basename(f), os.path.splitext(f)[1].lower()
        folder = os.path.basename(os.path.dirname(f))
        if ext == '.svg':
            kit['svg'].append(f)
        elif ext in FONT_EXT:
            kit['fonts'].append(f)
        elif ext in IMG:
            # the folder says what a picture is before its name does (photos/landmark.jpg is a photo)
            if re.search(r'^(logo|logos|brand|marks?|logotype|identity)$', folder, re.I):
                kit['raster_logo'].append(f)
            elif SCREEN_DIRS.search(folder):
                kit['screens'].append(f)
            elif PHOTO_DIRS.search(folder):
                kit['photos'].append(f)
            elif PHOTO_WORDS.search(name):
                kit['photos'].append(f)
            elif LOGO_WORDS.search(name):
                kit['raster_logo'].append(f)
            elif SCREEN_WORDS.search(name):
                kit['screens'].append(f)
            else:
                kit['images'].append(f)
        elif ext in COLOUR_EXT and (re.search(r'colou?r|palette|brand|tokens?|theme|swatch', name, re.I) or ext == '.gpl'):
            kit['colours'].append(f)
        else:
            kit['other'].append(f)
    return kit


def pick_logos(svgs, rasters):
    logo_svgs = [s for s in svgs if LOGO_WORDS.search(os.path.basename(s))] or svgs
    word = next((s for s in logo_svgs if WORDMARK_WORDS.search(os.path.basename(s))), None)
    mark = next((s for s in logo_svgs if s != word), None) or word
    raster = None if mark else (next((r for r in rasters if not WORDMARK_WORDS.search(os.path.basename(r))), None) or (rasters[0] if rasters else None))
    return mark, (word if word and word != mark else None), raster


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'brand'


def build(args):
    kit = classify(args.kit)
    notes, warns = [], []
    # colours
    supplied = []
    for f in ([args.colours] if args.colours else []) + kit['colours']:
        try:
            supplied += colours_from_text(open(f, encoding='utf-8', errors='replace').read(), f.lower())
        except OSError as e:
            die(f'cannot read {f}: {e}')
    if args.accent:
        hx = norm_hex(args.accent)
        if not hx:
            die(f'--accent {args.accent}: want #RRGGBB')
        supplied = [c for c in supplied if c['hex'] != hx]
        supplied.insert(0, {'hex': hx, 'label': '--accent', 'named_role': 'accent'})
    mark, word, raster = pick_logos(kit['svg'], kit['raster_logo'])
    unused = [os.path.basename(f) for f in kit['other'] if not re.search(r'^(readme|license|licence)', os.path.basename(f), re.I)]
    unused += [os.path.basename(f) for f in kit['raster_logo'] if f not in (raster,) and (mark or word)]
    unused += [os.path.basename(f) for f in kit['svg'] if f not in (mark, word)]
    if unused:
        notes.append(f'not used: {", ".join(unused[:12])}{" ..." if len(unused) > 12 else ""} (a colours file is read when its name says '
                     'colours, palette, tokens or theme, or with --colours; a logo when its name or folder says logo, mark or symbol)')
    measured = {}
    for s in [x for x in (mark, word) if x]:
        for hx, n in svg_colours(open(s, encoding='utf-8', errors='replace').read()).items():
            measured[hx] = measured.get(hx, 0) + n
    tot = sum(measured.values()) or 1
    measured_list = [{'hex': hx, 'label': 'logo', 'named_role': None, 'share': round(n / tot, 3), 'from': 'logo'} for hx, n in
                     sorted(measured.items(), key=lambda kv: -kv[1])]
    unread = []
    for img in ([raster] if raster else []) + kit['screens'][:6]:
        got = read_image(img)
        if not got:
            unread.append(os.path.basename(img))
            continue
        for hx, share in cluster(got[0])[:6]:
            if all(abs(lch(hx)[0] - lch(m['hex'])[0]) + abs(lch(hx)[1] - lch(m['hex'])[1]) > 0.04 for m in measured_list):
                measured_list.append({'hex': hx, 'label': os.path.basename(img), 'named_role': None, 'share': share, 'from': os.path.basename(img)})
    if unread:
        notes.append(f'not measured (install Pillow or OpenCV to read JPEG and WebP): {", ".join(unread)}')
    source = 'supplied' if supplied else 'measured'
    cols = supplied if supplied else measured_list
    if not cols:
        die('no colours: pass a colours file, --accent, or a logo (SVG or PNG) to measure them from', 2)
    acc, ground, ink, second = assign_roles(cols)
    if second:
        warns.append(f'the brand carries {len(second) + 1} accent hues ({acc["hex"]} and {", ".join(c["hex"] for c in second)}): the film '
                     f'keeps {acc["hex"]} as its one accent; the others appear only inside product UI states and imagery '
                     '(tokens commented ui-state)')
    if not acc:
        warns.append('the brand has no chromatic colour: deal the film\'s one accent from the deck and check it with palette.py')
    # tokens: the kit's own greys and papers are the grounds. Every ground role takes a supplied neutral at its
    # lightness first; what the kit leaves out is derived on the kit's neutral (the chroma-weighted hue of its
    # greys, chroma no higher than theirs and .025), never at the accent's hue: grounds derived at the accent hue
    # turn a one-accent brand into a wash of its own colour (a cobalt brand on cobalt grounds).
    h = acc['h'] if acc else 250.0
    neutral = [c for c in cols if c['C'] < 0.06 and c is not acc]
    lights = sorted([c for c in neutral if c['L'] >= 0.75], key=lambda c: (c is not ground and c is not ink, -c['L']))
    darks = sorted([c for c in neutral if c['L'] <= 0.3], key=lambda c: (c is not ink and c is not ground, c['L']))
    paper_c, ink_c = (lights[0] if lights else None), (darks[0] if darks else None)
    hn, cn = kit_neutral(neutral)
    stage = 'dark' if (ground is not None and ground['L'] < 0.5) else 'light'
    paper = paper_c['hex'] if paper_c else derive(0.955, min(0.008, cn), hn)
    inkx = ink_c['hex'] if ink_c else derive(0.22, min(0.012, cn), hn)
    pL, inkL = lch(paper)[0], lch(inkx)[0]
    accent = acc['hex'] if acc else derive(0.56, 0.16, h)
    aL, aC, ah = lch(accent)
    lift = accent if aL >= 0.74 else derive(0.8, min(aC, 0.12), ah)
    used = {id(c) for c in (paper_c, ink_c) if c is not None}

    def src(c):
        """What the kit supplied, for the cinetic:brand-supplied marker: the colour's name in the kit, or the logo."""
        if c is None:
            return False
        lab = str(c.get('label') or '').strip()
        return 'the logo fill' if c.get('from') == 'logo' or lab == 'logo' else f'the kit colour {lab}' if lab else 'a kit colour'

    def grey(lo, hi, aim, ok=None):
        """The kit neutral nearest `aim` inside [lo, hi] that no other role took (and passes ok), else None."""
        got = sorted((abs(c['L'] - aim), i, c) for i, c in enumerate(neutral)
                     if lo <= c['L'] <= hi and id(c) not in used and (ok is None or ok(c)))
        if not got:
            return None
        used.add(id(got[0][2]))
        return got[0][2]

    GC = 0.024  # a derived ground's chroma stays under palette.py's neutral line (.025) after the hex rounds

    def role(c, L, C):
        return (c['hex'], src(c)) if c is not None else (derive(L, min(C, cn, GC), hn), False)
    # a colour the kit names as its border or hairline is the line, before any other role can take it
    named_line = next((c for c in cols if c.get('named_role') == 'line' and c['C'] < 0.06 and id(c) not in used), None)
    if named_line is not None:
        used.add(id(named_line))
    # the slate: a kit grey near L .34, else the nearest dark or mid neutral the kit supplies, else derived from its
    # dark neutrals' own hue (a warm-grey kit must not turn the dark stage brown or mauve)
    slate_c = grey(0.28, 0.42, 0.34) or grey(0.16, 0.5, 0.34, lambda c: c['C'] <= 0.03)
    darks_all = [c for c in neutral if c['L'] <= 0.3]
    hd, cd = kit_neutral(darks_all) if darks_all else (hn, cn)
    mist_c = grey(max(0.8, pL - 0.1), pL - 0.01, pL - 0.03)
    line_c = named_line or grey(0.74, pL - 0.04, max(0.8, pL - 0.12))
    mute_c = grey(0.4, 0.62, 0.52, lambda c: P.contrast(c['hex'], paper) >= 4.5)
    ink2_c = grey(inkL + 0.02, 0.34, min(0.32, inkL + 0.05))
    raised_c = grey(0.38, 0.5, 0.4)
    T = {'ink2': role(ink2_c, min(0.32, inkL + 0.05), 0.012), 'mist': role(mist_c, max(0.86, pL - 0.03), 0.008),
         'line': role(line_c, max(0.8, pL - 0.12), 0.01), 'mute': role(mute_c, 0.52, 0.01),
         'slate': (slate_c['hex'], src(slate_c)) if slate_c is not None else (derive(0.34, min(GC, cd), hd), False),
         'slateRaised': role(raised_c, 0.4, 0.025)}
    # the accent on the slate: the brand's own when it clears 3:1 there, else lifted to L .80 and marked as derived
    # from the supplied accent (a lifted orange is still the brand's orange: lint and the bans treat it as supplied)
    if acc and P.contrast(accent, T['slate'][0]) >= 3:
        lift, lift_src = accent, src(acc)
    elif acc and lift == accent:
        lift_src = src(acc)
    else:
        lift_src = f'derived from {src(acc)} (lifted for the slate)' if acc else False
    tok = {
        'ink': (inkx, src(ink_c), 'type, marks, dark stages'),
        'ink2': (*T['ink2'], 'raised surfaces on ink'),
        'paper': (paper, src(paper_c), 'the light stage'),
        'mist': (*T['mist'], 'soft panels on paper'),
        'line': (*T['line'], 'hairlines, >= 1.5 px on screen'),
        'mute': (*T['mute'], 'secondary text, >= 4.5:1 on paper'),
        'white': ('#FFFFFF', False, 'pure white, only where a white world or a product surface needs it'),
        'accent': (accent, src(acc) if acc else False, 'the one accent'),
        'slate': (*T['slate'], 'the dark stage: a mid slate'),
        'slateRaised': (*T['slateRaised'], 'raised surfaces on the slate'),
        'accentLift': (lift, lift_src, 'the accent lifted to L .80 for the slate stage (the accent itself when it holds 3:1 there)'),
    }
    checks, fails, more = verdict({k: v[0] for k, v in tok.items()}, stage)
    notes += more
    # fonts
    faces, skipped = [], []
    for f in kit['fonts'] + [x for x in (args.font_file or [])]:
        fam, wt, it = font_names(f) or font_from_filename(f)
        (skipped if it else faces).append({'file': f, 'family': fam, 'weight': wt, 'italic': it})
    family = (faces[0]['family'] if faces else None) or args.font
    if faces and len({x['family'] for x in faces}) > 1:
        notes.append(f'{len({x["family"] for x in faces})} families supplied: the film sets every role in {family} (one sans per film)')
    if skipped:
        notes.append(f'italic faces recorded and not vendored: {", ".join(os.path.basename(x["file"]) for x in skipped)}')
    # logo
    logo = {'mark': None, 'wordmark': None, 'raster': None}
    if mark:
        svg = clean_svg(open(mark, encoding='utf-8', errors='replace').read())
        split, names, leaves, text = svg_parts(svg)
        vb = re.search(r'viewBox\s*=\s*["\']([^"\']+)', svg)
        logo['mark'] = {'file': os.path.basename(mark), 'split': split, 'parts': names, 'leaves': leaves, 'viewBox': vb.group(1) if vb else None}
        if text:
            warns.append(f'{os.path.basename(mark)} holds live text: outline it (scripts/outline-text.py) so the lockup does not depend on a font')
    if word:
        wsvg = clean_svg(open(word, encoding='utf-8', errors='replace').read())
        split, names, leaves, text = svg_parts(wsvg)
        logo['wordmark'] = {'file': os.path.basename(word), 'split': split, 'parts': names, 'leaves': leaves}
    if raster and not mark:
        logo['raster'] = {'file': os.path.basename(raster)}
        notes.append('the logo is a raster image: it is placed whole (one part); an SVG logo builds part by part. Ask for the '
                     f'vector file; a flat logo can be traced: trace-logo.py {os.path.basename(raster)} --out logo-mark.svg --sheet '
                     'out/qa/trace.png (IoU >= 0.97), then run brand.py with the SVG')
    if not (mark or raster):
        warns.append('no logo found (an SVG named logo, mark, symbol or icon): the lockup falls back to the film\'s own mark')
    name = args.name or (os.path.splitext(os.path.basename(mark or word or raster))[0].split('-')[0].split('_')[0].title() if (mark or word or raster) else '')
    brand = {
        'version': 1, 'tool': 'brand.py', 'name': name,
        'colours': {'source': source, 'accent': accent if acc else None, 'stage': stage,
                    'list': [{k: c[k] for k in ('hex', 'role', 'L', 'C', 'h', 'label') if k in c} for c in cols],
                    'second_hues': [c['hex'] for c in second], 'checks': checks,
                    'tokens': {k: {'hex': v[0], 'supplied': bool(v[1])} for k, v in tok.items()}},
        'fonts': {'family': family, 'google': args.font if args.font and not faces else None,
                  'faces': [{'file': os.path.basename(x['file']), 'weight': x['weight']} for x in faces],
                  'skipped': [os.path.basename(x['file']) for x in skipped]},
        'logo': logo,
        'screenshots': [{'file': os.path.basename(s), 'use': 'rebuild as live UI with src/kit at film size; the image only under a camera move'}
                        for s in kit['screens']],
        'photos': [{'file': os.path.basename(s)} for s in kit['photos'] + kit['images']],
        'notes': notes, 'warnings': warns, 'fails': fails,
    }
    return brand, tok, {'mark': mark, 'word': word, 'raster': raster, 'faces': faces, 'kit': kit}


# ------------------------------------------------------------------------------------------- writing
def write_text(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)


def tokens_block(tok):
    w = max(len(k) for k in tok)
    lines = ['export const C = {']
    for k, (hx, supplied, what) in tok.items():
        tag = (f'cinetic:brand-supplied {supplied if isinstance(supplied, str) else "a kit colour"}' if supplied
               else 'derived on the kit\'s greys (house recipe)' if k not in ('accentLift', 'white') else 'house recipe')
        lines.append(f"  {k}: '{hx}',{' ' * (w - len(k))} // {what}; {tag}")
    lines.append('};')
    return '\n'.join(lines)


def css_weight(target, ws):
    """The supplied weight a browser draws for `target` (CSS font matching): 400 tries 500 next and 500 tries 400,
    a lighter target looks lighter first, a heavier one heavier first."""
    ws = sorted(set(ws))
    if target in ws:
        return target
    if 400 <= target <= 500:
        up = [w for w in ws if target < w <= 500]
        down = [w for w in ws if w < target]
        return up[0] if up else down[-1] if down else [w for w in ws if w > 500][0]
    if target < 400:
        down = [w for w in ws if w < target]
        return down[-1] if down else [w for w in ws if w > target][0]
    up = [w for w in ws if w > target]
    return up[0] if up else [w for w in ws if w < target][-1]


def snap_type(src, ws):
    """TYPE's role weights moved onto the supplied faces (the weight the browser would draw anyway), so every role
    names a real face; returns (src, the weights the roles use)."""
    m = re.search(r'export const TYPE = \{[\s\S]*?\n\};', src)
    if not m or not ws:
        return src, set()
    used = set()

    def one(mm):
        w = css_weight(int(mm.group(1)), ws)
        used.add(w)
        return f'weight: {w}'
    return src[:m.start()] + re.sub(r'\bweight: (\d+)', one, m.group(0)) + src[m.end():], used


def rewrite_tokens(path, tok, family, faces):
    src = open(path, encoding='utf-8').read() if os.path.isfile(path) else None
    if src is None:
        die(f'{path} not found: run brand.py in a film project made by new-film.sh (or pass --project)')
    src = src.replace('\r\n', '\n')
    # the starter's placeholder paragraphs go: the palette (and, with a family, the type) are the brand's now
    src = re.sub(r'//\n// cinetic:placeholder - delete these four lines[^\n]*\n(//[^\n]*\n)*?(?=import)', '//\n// The brand\'s own palette and type, written by scripts/brand.py from brand/brand.json.\n', src)
    src = re.sub(r'\nexport const C = \{[\s\S]*?\n\};', '\n' + tokens_block(tok), src, count=1)
    if family:
        src = re.sub(r'// cinetic:placeholder - the family is[^\n]*\n(//[^\n]*\n)*', '', src)
        src = re.sub(r"(export const FONT = \{\s*\n\s*text: )'[^']*'", lambda m: m.group(1) + f"'\"{family}\", system-ui, sans-serif'", src, count=1)
        ws = sorted({x['weight'] for x in faces}) or [400, 600]
        # supplied faces: each TYPE role on a weight the kit has, and FACES loads every weight a role uses
        src, used = snap_type(src, ws) if faces else (src, set())
        pick = sorted(used | {css_weight(400, ws)}) if used else sorted({min(ws, key=lambda w: abs(w - t)) for t in (400, 500, 600)})
        face_list = ', '.join(f"'{w} 16px \"{family}\"'" for w in pick)
        mono = re.search(r"FACES = \[[^\]]*?('400 16px \"Geist Mono[^']*')", src)
        src = re.sub(r'export const FACES = \[[^\]]*\];', f'export const FACES = [{face_list}{", " + mono.group(1) if mono else ""}];', src, count=1)
    return src


def font_sheet(family, faces, dest):
    lines = [f'/* {family}: the brand\'s licensed faces, vendored by scripts/brand.py (upright only). */']
    for x in faces:
        fn = os.path.basename(x['file'])
        fmt = {'.woff2': 'woff2', '.woff': 'woff', '.ttf': 'truetype', '.otf': 'opentype'}[os.path.splitext(fn)[1].lower()]
        lines.append(f"@font-face {{ font-family: '{family}'; font-style: normal; font-weight: {x['weight']}; font-display: block; "
                     f"src: url('./{fn}') format('{fmt}'); }}")
    return '\n'.join(lines) + '\n'


def write_project(args, brand, tok, src_files):
    proj = os.path.abspath(args.project)
    out = []
    if not os.path.isfile(os.path.join(proj, 'src', 'brand', 'tokens.ts')):  # before anything is copied into it
        die(f'{os.path.join(proj, "src", "brand", "tokens.ts")} not found: run brand.py in a film project made by new-film.sh '
            '(or pass --project), or write brand.json alone with --out brand.json')
    bdir = os.path.join(proj, 'brand')
    os.makedirs(bdir, exist_ok=True)
    # originals, so the film keeps its kit
    for f in [x for x in (src_files['mark'], src_files['word'], src_files['raster']) if x]:
        os.makedirs(os.path.join(bdir, 'logo'), exist_ok=True)
        shutil.copy2(f, os.path.join(bdir, 'logo', os.path.basename(f)))
    pub = os.path.join(proj, 'public', 'brand')
    screens, photos = [], []
    for kind, files, lst in (('screens', src_files['kit']['screens'], screens), ('photos', src_files['kit']['photos'] + src_files['kit']['images'], photos)):
        for f in files:
            os.makedirs(os.path.join(pub, kind), exist_ok=True)
            shutil.copy2(f, os.path.join(pub, kind, os.path.basename(f)))
            lst.append(f'brand/{kind}/{os.path.basename(f)}')
    if src_files['raster']:
        os.makedirs(pub, exist_ok=True)
        shutil.copy2(src_files['raster'], os.path.join(pub, os.path.basename(src_files['raster'])))
    sb = os.path.join(proj, 'src', 'brand')
    # tokens
    tpath = os.path.join(sb, 'tokens.ts')
    write_text(tpath, rewrite_tokens(tpath, tok, brand['fonts']['family'] if src_files['faces'] else None, src_files['faces']))
    out.append('src/brand/tokens.ts')
    # fonts: vendored files and the import in fonts.ts
    fam = brand['fonts']['family']
    fpath = os.path.join(sb, 'fonts.ts')
    if src_files['faces'] and os.path.isfile(fpath):
        d = os.path.join(sb, 'fonts', slug(fam))
        os.makedirs(d, exist_ok=True)
        for x in src_files['faces']:
            shutil.copy2(x['file'], os.path.join(d, os.path.basename(x['file'])))
        write_text(os.path.join(d, 'index.css'), font_sheet(fam, src_files['faces'], d))
        ft = open(fpath, encoding='utf-8').read().replace('\r\n', '\n')
        ft = re.sub(r'// cinetic:placeholder - (?:Inter is the face set\'s default|Geist is the starter\'s stand-in)[^\n]*\n(//[^\n]*\n)*', f'// {fam}: the brand\'s licensed faces (scripts/brand.py).\n', ft)
        ft = re.sub(r"import '@fontsource-variable/(?:inter|geist)(?:/[^']*)?';\n", f"import './fonts/{slug(fam)}/index.css';\n", ft, count=1)
        if f"./fonts/{slug(fam)}/index.css" not in ft:
            ft = ft.replace("import React", f"import './fonts/{slug(fam)}/index.css';\nimport React", 1)
        write_text(fpath, ft)
        out += ['src/brand/fonts.ts', f'src/brand/fonts/{slug(fam)}/']
    # logo parts
    lg = brand['logo']
    mpath = os.path.join(sb, 'Mark.tsx')
    if (lg['mark'] or lg['raster']) and os.path.isfile(mpath):
        # the film's mark is the supplied logo now: the starter's stand-in notice goes, its sample mark stays a fallback
        mk = open(mpath, encoding='utf-8').read().replace('\r\n', '\n')
        mk2 = re.sub(r'// cinetic:placeholder - delete these three lines once the mark is the film\'s own[^\n]*\n(//[^\n]*\n){2}',
                     '// The film\'s mark is the supplied logo (src/brand/logo.ts, written by scripts/brand.py); the sample mark\n'
                     '// below is only the fallback LogoMark draws when no logo is passed.\n', mk, count=1)
        if mk2 != mk:
            write_text(mpath, mk2)
            out.append('src/brand/Mark.tsx')
    if lg['mark']:
        svg = clean_svg(open(src_files['mark'], encoding='utf-8', errors='replace').read())
        lines = ['// The supplied logo, parsed into parts for LogoMark, AssembledMark and Lockup (written by scripts/brand.py',
                 f'// from brand/logo/{lg["mark"]["file"]}): cinetic:brand-supplied. Re-run brand.py to change it, never edit the paths.',
                 "import { type Logo, logoParts } from './Mark';", '',
                 f'export const LOGO_SVG = {ts_string(svg)};',
                 f"export const LOGO = logoParts(LOGO_SVG, {{ split: '{lg['mark']['split']}' }});",
                 f'export const LOGO_PARTS = {json.dumps(lg["mark"]["parts"])};']
        if lg['wordmark']:
            wsvg = clean_svg(open(src_files['word'], encoding='utf-8', errors='replace').read())
            lines += [f'export const WORDMARK_SVG: string | null = {ts_string(wsvg)};',
                      f"export const WORDMARK: Logo | null = logoParts(WORDMARK_SVG, {{ split: '{lg['wordmark']['split']}' }});"]
        else:
            lines += ['export const WORDMARK_SVG: string | null = null;', 'export const WORDMARK: Logo | null = null;']
        lines += ['/** A raster logo is placed whole; none here: the logo is vector. */', 'export const LOGO_RASTER: string | null = null;']
        write_text(os.path.join(sb, 'logo.ts'), '\n'.join(lines) + '\n')
        out.append('src/brand/logo.ts')
    elif lg['raster']:
        lines = ['// The supplied logo is a raster image (written by scripts/brand.py): it is placed whole. cinetic:brand-supplied the kit\'s raster logo',
                 "import { type Logo, logoParts, SAMPLE_MARK_SVG } from './Mark';", '',
                 '/** No vector logo was supplied: LOGO stays the film\'s own mark, LOGO_RASTER is the supplied image (staticFile path). */',
                 'export const LOGO_SVG = SAMPLE_MARK_SVG;', "export const LOGO = logoParts(LOGO_SVG, { split: 'ids' });",
                 "export const LOGO_PARTS = ['A', 'B', 'D'];", 'export const WORDMARK_SVG: string | null = null;', 'export const WORDMARK: Logo | null = null;',
                 f"export const LOGO_RASTER: string | null = 'brand/{lg['raster']['file']}';"]
        write_text(os.path.join(sb, 'logo.ts'), '\n'.join(lines) + '\n')
        out.append('src/brand/logo.ts')
    if brand['name']:
        write_text(os.path.join(sb, 'identity.ts'),
                   "// The product's name and how it is set (written by scripts/brand.py). cinetic:brand-supplied the product's name\n"
                   f"export const IDENTITY = {{ name: {json.dumps(brand['name'])}, supplied: true }} as const;\n")
        out.append('src/brand/identity.ts')
    write_text(os.path.join(sb, 'assets.ts'),
               '// The brand\'s screenshots and photos in public/brand/ (staticFile paths), written by scripts/brand.py.\n'
               '// Screenshots are rebuilt as live UI with src/kit at film size; an image itself only moves under the camera.\n'
               f'export const SCREENS: string[] = {json.dumps(screens)};\nexport const PHOTOS: string[] = {json.dumps(photos)};\n')
    out.append('src/brand/assets.ts')
    write_text(os.path.join(bdir, 'brand.json'), json.dumps(brand, indent=1, ensure_ascii=False) + '\n')
    out.insert(0, 'brand/brand.json')
    return out


def summary(brand):
    c = brand['colours']
    lines = [f"brand.py: {brand['name'] or '(no name)'}: colours {c['source']} ({len(c['list'])}), accent {c['accent']}, "
             f"{c['checks'].get('stage', 'light')} stage, statements {c['checks']['statements']:.1f}:1, accent "
             f"{c['checks'].get('accent_on_stage', c['checks']['accent_on_paper']):.1f}:1 on it / "
             f"{c['checks']['accent_lift_on_slate']:.1f}:1 lifted on the slate; type {brand['fonts']['family'] or '(starter)'}; "
             f"logo {(brand['logo']['mark'] or {}).get('file') or (brand['logo']['raster'] or {}).get('file') or 'none'}"
             + (f" ({len(brand['logo']['mark']['parts'])} parts, split {brand['logo']['mark']['split']})" if brand['logo']['mark'] else '')
             + f"; {len(brand['screenshots'])} screenshots, {len(brand['photos'])} photos"]
    lines += [f'  note {n}' for n in brand['notes']] + [f'  warn {w}' for w in brand['warnings']] + [f'  FAIL {f}' for f in brand['fails']]
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    ap.add_argument('kit', nargs='*', help='the kit: a folder or files (logo, colours, fonts, screenshots, photos)')
    ap.add_argument('--project', default='.', help='the film project to write into (default: here)')
    ap.add_argument('--name', help="the product's name as it is written")
    ap.add_argument('--colours', help='a colours file (JSON, CSS, text or GIMP palette)')
    ap.add_argument('--accent', help='the brand accent (#RRGGBB) when the kit does not name one')
    ap.add_argument('--font', help='a Google font family name (recorded; new-film.sh vendors it with add-font.mjs)')
    ap.add_argument('--font-file', action='append', help='a licensed font file (repeatable), besides the ones in the kit')
    ap.add_argument('--dry-run', action='store_true', help='print brand.json and the colour block, write nothing')
    ap.add_argument('--check', action='store_true', help='re-check brand/brand.json and src/brand/tokens.ts (palette.py --check-tokens)')
    ap.add_argument('--out', help='write brand.json here and nothing else (no project needed: deal with deck.py --brand <file> first)')
    a = ap.parse_args()
    if a.check:
        bj = os.path.join(a.project, 'brand', 'brand.json')
        tk = os.path.join(a.project, 'src', 'brand', 'tokens.ts')
        if not os.path.isfile(bj):
            die(f'{bj} not found: run brand.py <kit> first')
        brand = json.load(open(bj, encoding='utf-8'))
        t = read_tokens(tk) if os.path.isfile(tk) else {}
        if not all(k in t for k in ('ink', 'paper', 'accent', 'accentLift', 'slate')):
            die(f'{tk}: no colour block with ink, paper, accent, accentLift and slate')
        checks, fails, notes = verdict(t, brand.get('colours', {}).get('stage', 'light'))
        brand['colours']['checks'], brand['fails'], brand['notes'] = checks, fails, notes
        print(summary(brand))
        P.check_tokens(tk)  # the token report (bans on what the brand did not supply, the one-accent rule)
        return 1 if fails else 0
    if not a.kit and not (a.colours or a.accent):
        ap.error('a kit folder or files (or at least --colours / --accent)')
    brand, tok, src_files = build(a)
    if a.dry_run:
        print(json.dumps(brand, indent=1, ensure_ascii=False))
        print(tokens_block(tok))
        print(summary(brand), file=sys.stderr)
        return 1 if brand['fails'] else 0
    if a.out:
        brand['file'] = a.out
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        write_text(a.out, json.dumps(brand, indent=1, ensure_ascii=False) + '\n')
        print(summary(brand))
        print(f'  wrote {a.out} (nothing else: no project yet)')
        print(f'  next: python3 scripts/deck.py ... --brand {a.out}, then bash scripts/new-film.sh <dir> --brand <kit> writes the tokens, logo and fonts')
        return 1 if brand['fails'] else 0
    written = write_project(a, brand, tok, src_files)
    print(summary(brand))
    print('  wrote ' + ', '.join(written))
    tk = os.path.join(a.project, 'src', 'brand', 'tokens.ts')
    P.check_tokens(tk)  # the token report; the verdict above is taken on the brand's own stage
    if brand['fonts']['google']:
        print(f"  next: node scripts/add-font.mjs {slug(brand['fonts']['google'])} --brand-supplied   (vendors {brand['fonts']['google']})")
    print('  next: python3 scripts/deck.py ... --brand brand/brand.json   (the direction\'s roles mapped onto these colours)')
    return 1 if brand['fails'] else 0


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
