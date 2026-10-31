#!/usr/bin/env python3
"""Build a film palette from one accent, check its contrast, or measure accent coverage on a still.

Neutrals come out tinted toward the accent's hue (or cool on request), for a light or a dark
stage, each with its OKLCH, hex and contrast against the stage, ready to paste into
src/brand/tokens.ts. The checks are the ones in references/brand-and-color.md:
  - the hard bans (SKILL.md, brand-and-color.md §8): an accent or paper that is orange/amber,
    beige/cream, purple/violet/indigo or neon is refused (exit 1, no palette) unless the user's
    brand supplied it (--brand-supplied; record it in BRIEF.md). The regions, in OKLCH:
      orange/amber  31 <= h < 96 and C >= 0.05 (orange, amber, gold, brass, brown, coral)
      beige/cream   31 <= h < 118, L >= 0.70 and 0.007 <= C < 0.10 (beige, cream, tan, sand)
      purple        270 <= h < 340 and C >= 0.02 (purple, violet, indigo, lavender, magenta)
      neon          C >= 0.27; or L >= 0.85 and C >= 0.15; or L >= 0.80 and C >= 0.18
                    (yellows, 96 <= h < 118: only L >= 0.91 with C >= 0.15)
  - statements (ink on the stage) >= 7:1; secondary text (mute) >= 4.5:1; graphics (accent) >= 3:1
  - accent chroma >= 0.08 (below that it reads as a grey, not a signal); the house chroma band
    (0.11-0.25 on a light stage, 0.07-0.16 on a dark one) is a note, not a fail
  - the accent's lightness band for the stage: 0.43-0.67 on a light stage, 0.63-0.85 on a dark
    one (a yellow, which only works on a dark stage: 0.84-0.90); a recipe sets its own
  - a given paper on a light stage: L 0.93-0.99, C <= 0.015 toward the accent (C <= 0.004 when the
    accent is red or yellow, or the white turns beige)
A colour the user's brand supplied (--brand-supplied) skips the bans and the bands: it is checked only
for contrast and the one-accent rule.

Recipes (--recipe NAME; --list-recipes prints them): the house colour systems as OKLCH lightness and
chroma at the accent's hue, written out as the same seven tokens:
  tintedPaper     light stage: ground L .955 C .008 toward the hue, ink L .22, accent L .43-.67
  inkStage        dark stage: ground L .15, raised L .20, type L .955, accent L .63-.85
  paperEditorial  neutral paper L .945 and ink L .24, one accent used on newness only
  whiteWorld      pure white ground (this system only), ink L .13, accent L .43-.67
  stoneMid        a mid stone ground L .75 (C <= .006 with a red or yellow accent), ink L .14, accent L .38-.46
  slateMid        a mid slate ground L .35 C .008 (a neutral grey), type L .975, accent L .74-.84 (a yellow .86-.90)
  deepField       a colour event, not a stage: the accent's own hue at depth, ground L .38 C .10 (blue,
                  teal or green only), type L .97, accent the same hue at L .78-.86; for a moment, under
                  neutral UI (the film's grounds stay neutral)
Grounds are neutral (lib/look.ts NEUTRAL): every recipe but deepField keeps its grounds and surfaces at
C <= .025 (house .004-.012), so the accent is the colour in the frame.

Ground families (--family NAME; --list-families prints them): the one field and its light a whole film stands on
(references/brand-and-color.md §9b, fx/Grounds FamilyGround). --family builds the palette from the family's base recipe,
prints a `// family: NAME` line and the family's field tokens (field, fieldFar) at the field hue (the accent's own
for a blue, teal or green, else a cool 230; --stage-hue H sets it, and every hue the family names, for every family),
with the type's contrast on the field:
  nearWhite      tintedPaper                   a paper sweep lit from the top left under pictures and UI
  lightStudio    tintedPaper at L .945         a light grey studio sweep: a top key over a floor falling to L .80, ink type
  softSky        a pale sky L .965 C .018      a lit sky, deeper at the top (L .885 C .05), a pale horizon low, ink type
  gradientField  a pale tinted field           a pale mesh: two lobes of the field hue from opposite corners, ink type
  whiteBand      whiteWorld + the accent band  white with one lit band of the brand colour; the band floods once
  blackField     inkStage at L .11             studio black under one soft key from above left, white type
  studio         slateMid at L .33             a mid slate cyclorama: a broad top key over a slate floor, white type
  deepPool       a deep field L .25 C .055     the accent's hue at depth with a glow rising from the bottom edge; white type
  duskMesh       inkStage at L .17 C .026      a deep tinted night: two lobes of the field hue from opposite corners; white type
  floorGlow      inkStage at L .10             near-black with one glow of the field hue rising from the floor; white type
  lightDark      tintedPaper, then a dark stage  the problem on light, the product on dark: one declared turn
Every family is a still, lit field (fx/Grounds litFieldPixels: lights entering from an edge, gaussian falloff, dithered),
never a two-stop linear and never drifting.
--check-tokens honours a `// family: NAME` line: the family's own ground chroma (deepPool .07, duskMesh .04, softSky
.04, gradientField .06) replaces the neutral cap for the grounds it tints; the bans stay.

Token check (--check-tokens src/brand/tokens.ts, or an HTML file whose :root holds the palette): the
bans and bands on every colour that is not brand-supplied (a line or the leading comment marked
cinetic:brand-supplied), and on every colour the contrast (statements >= 7:1, mute >= 4.5:1, accent >=
3:1 on the stage) and the one-accent rule (saturated colours, C >= 0.06, within 30 degrees of hue;
a token commented `imagery` or `ui-state` is left out). Grounds stay neutral: paper, mist, line, slate,
slateRaised, ink, ink2 (and ground, bg, stage, surface) at C <= .025 unless brand-supplied. The stage the
accent is judged on: paper (a light film), or the one a `// stage: dark` (the ink token) or `// stage: slate`
(the slate token, with accentLift as the accent) comment names.

Ramp (--ramp 'c1,c2,...' with --accent): the stops of a light field or a colour sweep keep one hue:
every stop with C > 0.03 within 7 degrees of the accent's hue (the public default of a one-hue field),
C <= 0.13 on a light field, and a lightness swing of 0.05-0.20 across it (both notes).

Usage:
  python3 scripts/palette.py --accent '#C92F33'                           # light stage, tinted to the accent
  python3 scripts/palette.py --accent 'oklch(0.86 0.165 100)' --stage dark  # dark stage, a yellow
  python3 scripts/palette.py --accent '#1F86CD' --temp cool --json out/qa/palette.json
  python3 scripts/palette.py --accent '#1F86CD' --paper '#F6F7F9'         # check your own paper
  python3 scripts/palette.py --accent '#F26B1D' --brand-supplied          # the user's orange: allowed
  python3 scripts/palette.py --cover out/stills/poster.png --accent '#C92F33'   # accent share of pixels
  python3 scripts/palette.py --accent '#1F86CD' --recipe inkStage                 # a house colour system
  python3 scripts/palette.py --check-tokens src/brand/tokens.ts                   # the film's own tokens
  python3 scripts/palette.py --accent '#1F86CD' --ramp '#EEF3F9,#D3E2F2,#A9C7E8' # a one-hue light field

--temp: neutral (default) tints the greys with the accent's hue at a chroma too low to read as
a colour (C .004-.012, the house); grey leaves them untinted (C 0: a true charcoal, a true white); cool
uses hue 250. warm (hue 75) makes a beige paper, so it needs --brand-supplied.
--stage-hue H [--stage-chroma C]: give the stage and the dark neutrals a hue from the brand's world
(pine-black 160, a green-black 145, a deep teal 200, an ink-navy with body 235) at chroma C
(default 0.014 on a dark stage, 0.008 on a light one); type and light panels stay near-neutral.
A stage hue in the purple range (270-340) is refused, and one in the warm range (31-118) is
warned about (it slides into brown or beige).
A dark stage in the cool blue-grey band (h 235-270, C < 0.02) gets a note: it is the stock
dev-tool dark theme and reads as "a screenshot of a tool" before anything moves.
Exit 0 when every check passes, 1 when one fails or a colour is refused, 2 on bad input.
"""
import argparse
import json
import math
import re
import sys


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def oklch_to_lin(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
            -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
            -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)


def lin_to_oklch(r, g, b):
    l_ = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m_ = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s_ = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def in_gamut(lin):
    return all(-1e-4 <= v <= 1 + 1e-4 for v in lin)


def oklch_hex(L, C, h):
    """Hex for an OKLCH colour, reducing chroma until it fits sRGB. Returns (hex, C actually used)."""
    while C > 0 and not in_gamut(oklch_to_lin(L, C, h)):
        C = max(0.0, C - 0.002)
    rgb = [round(255 * lin_to_srgb(min(1.0, max(0.0, v)))) for v in oklch_to_lin(L, C, h)]
    return '#' + ''.join(f'{v:02X}' for v in rgb), C


def parse_colour(s):
    s = s.strip()
    m = re.fullmatch(r'#?([0-9a-fA-F]{6})', s)
    if m:
        x = m.group(1)
        return lin_to_oklch(*[srgb_to_lin(int(x[i:i + 2], 16) / 255) for i in (0, 2, 4)])
    m = re.fullmatch(r'oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)', s)
    if m:
        L = float(m.group(1)) / (100 if m.group(2) else 1)
        return L, float(m.group(3)), float(m.group(4))
    raise ValueError(f'cannot read colour {s!r} (want #RRGGBB or oklch(L C h))')


# The hard-ban regions (SKILL.md "Hard bans"; references/brand-and-color.md §8). lint-film.mjs
# carries the same numbers: change them in both places.
YELLOW = (96.0, 118.0)


def banned(L, C, h):
    """Which hard-ban region an OKLCH colour falls in, or None. Order matters: neon, then the
    light low-chroma warms (beige), then orange/amber, then purple."""
    if YELLOW[0] <= h < YELLOW[1]:  # yellow is light by nature: neon only at highlighter lightness
        neon = L >= 0.91 and C >= 0.15
    else:
        neon = (L >= 0.85 and C >= 0.15) or (L >= 0.80 and C >= 0.18)
    if neon or C >= 0.27:
        return 'neon (very bright and saturated)'
    if 31 <= h < 118 and L >= 0.70 and 0.007 <= C < 0.10:
        return 'beige/cream (warm, light, low chroma: beige, cream, tan, sand)'
    if 31 <= h < 96 and C >= 0.05:
        return 'orange/amber (orange, amber, gold, brass, brown, coral)'
    if 270 <= h < 340 and C >= 0.02:
        return 'purple/violet/indigo'
    return None


def luminance(c):
    """WCAG relative luminance of '#RRGGBB', 'RRGGBB', '#RGB' or an (r, g, b) tuple of 0-255 ints."""
    if isinstance(c, (tuple, list)):
        rgb = [v / 255 for v in c[:3]]
    else:
        h = str(c).strip().lstrip('#')
        if len(h) == 3:
            h = ''.join(ch * 2 for ch in h)
        if len(h) != 6:
            raise ValueError(f'not a hex colour: {c!r}')
        rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return sum(w * srgb_to_lin(v) for w, v in zip((0.2126, 0.7152, 0.0722), rgb))


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def cover(img, accent_hex, radius=0.08):
    import cv2
    import numpy as np
    im = cv2.imread(img)
    if im is None:
        raise ValueError(f'cannot read image {img}')
    rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    M1 = np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]])
    M2 = np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]])
    lab = np.cbrt(lin @ M1.T) @ M2.T
    ref = np.array([srgb_to_lin(int(accent_hex[i:i + 2], 16) / 255) for i in (1, 3, 5)], np.float32)
    ref_lab = np.cbrt(ref @ M1.T) @ M2.T
    return float((np.linalg.norm(lab - ref_lab, axis=-1) < radius).mean() * 100)


# The house colour systems: (L, C) at the accent hue ('n': neutral, C 0), per token, and the accent bands.
RECIPES = {
    'tintedPaper': dict(stage='light', tokens=dict(paper=(0.955, 0.008), mist=(0.985, 0.004), line=(0.885, 0.006), mute=(0.52, 0.010), ink2=(0.28, 0.010), ink=(0.22, 0.012)),
                        accent_L=(0.43, 0.67), accent_C=(0.11, 0.25)),
    'inkStage': dict(stage='dark', tokens=dict(ink=(0.15, 0.010), ink2=(0.20, 0.012), line=(0.30, 0.010), mute=(0.75, 0.010), mist=(0.90, 0.006), paper=(0.955, 0.006)),
                     accent_L=(0.63, 0.85), accent_C=(0.07, 0.16)),
    'paperEditorial': dict(stage='light', tokens=dict(paper=(0.945, 0.0), mist=(0.97, 0.0), line=(0.875, 0.0), mute=(0.50, 0.0), ink2=(0.30, 0.0), ink=(0.24, 0.0)),
                           accent_L=(0.43, 0.67), accent_C=(0.11, 0.25)),
    'whiteWorld': dict(stage='light', tokens=dict(paper=(1.0, 0.0), mist=(0.965, 0.004), line=(0.89, 0.006), mute=(0.50, 0.010), ink2=(0.22, 0.010), ink=(0.13, 0.010)),
                       accent_L=(0.43, 0.67), accent_C=(0.11, 0.25)),
    'stoneMid': dict(stage='light', tokens=dict(paper=(0.75, 0.012), mist=(0.80, 0.010), line=(0.66, 0.010), mute=(0.34, 0.010), ink2=(0.20, 0.010), ink=(0.14, 0.010)),
                     accent_L=(0.38, 0.46), accent_C=(0.08, 0.25)),
    # the starter's names: the mid slate is `slate` (ink stays the darkest type, marks and shadows in fx/), type is
    # paper, and the accent on the slate is accentLift (written with the same value as accent)
    'slateMid': dict(stage='dark', stage_key='slate', tokens=dict(slate=(0.35, 0.008), slateRaised=(0.40, 0.008), line=(0.48, 0.010), mute=(0.82, 0.008),
                                                                 mist=(0.92, 0.006), paper=(0.975, 0.006), ink2=(0.20, 0.010), ink=(0.15, 0.010)),
                     accent_L=(0.74, 0.84), accent_C=(0.07, 0.18), yellow_L=(0.86, 0.90)),
    'deepField': dict(stage='dark', tokens=dict(ink=(0.38, 0.10), ink2=(0.43, 0.10), line=(0.50, 0.08), mute=(0.85, 0.02), mist=(0.93, 0.01), paper=(0.97, 0.006)),
                      accent_L=(0.78, 0.86), accent_C=(0.05, 0.16), hues=(150, 265)),
}


# Ground families: the base recipe, the stage tokens they replace ((L, C, hue) with hue 'field' = the field hue, None =
# the palette's own hue, or a number), the field stops (field: the colour field a line may sit on; fieldFar: its far
# end), the ground chroma the family allows on the grounds it tints, and those tokens.
FAMILIES = {
    'nearWhite': dict(recipe='tintedPaper', about='a paper sweep lit from the top left under real pictures and UI'),
    'lightStudio': dict(recipe='tintedPaper', stage={'paper': (0.945, 0.006, None), 'mist': (0.96, 0.005, None)},
                        about='a light grey studio sweep: a top key over a falling floor, ink type'),
    'blackField': dict(recipe='inkStage', stage={'ink': (0.11, 0.004, None), 'ink2': (0.17, 0.006, None)},
                       about='studio black under one soft key from above left, white type'),
    'studio': dict(recipe='slateMid', stage={'slate': (0.33, 0.008, None), 'slateRaised': (0.42, 0.008, None)},
                   about='a mid slate cyclorama: a broad top key over a slate floor, white type'),
    'duskMesh': dict(recipe='inkStage', stage={'ink': (0.17, 0.026, 'field'), 'ink2': (0.24, 0.03, 'field')},
                     field={'field': (0.34, 0.09, 'field'), 'fieldFar': (0.12, 0.014, 'field')}, ground_c=0.04, tints=('ink', 'ink2'),
                     about='a deep tinted night: two lobes of the field hue from opposite corners, white type'),
    'floorGlow': dict(recipe='inkStage', stage={'ink': (0.10, 0.006, None), 'ink2': (0.17, 0.008, None)},
                      field={'field': (0.42, 0.10, 'field')},
                      about='near-black with one glow of the field hue rising from the floor, white type'),
    'whiteBand': dict(recipe='whiteWorld', field={'field': 'accent'}, about='white with one band of the brand colour; it floods the frame once'),
    'deepPool': dict(recipe='inkStage', stage={'ink': (0.25, 0.055, 'field'), 'ink2': (0.30, 0.055, 'field'), 'line': (0.38, 0.045, 'field')},
                     field={'field': (0.25, 0.055, 'field'), 'fieldFar': (0.20, 0.048, 'field')}, ground_c=0.07, tints=('ink', 'ink2', 'line'),
                     about='a deep field at the accent hue with a glow rising from the bottom edge'),
    'softSky': dict(recipe='tintedPaper', stage={'paper': (0.965, 0.018, 232.0), 'mist': (0.985, 0.008, 232.0)},
                    field={'field': (0.94, 0.026, 232.0), 'fieldFar': (0.915, 0.034, 232.0)}, ground_c=0.04, tints=('paper', 'mist'),
                    about='a lit pale sky, deeper at the top, a pale horizon low, ink type'),
    'lightDark': dict(recipe='tintedPaper', field={'darkStage': (0.17, 0.008, None)}, about='the problem on light, the product on dark: one declared turn'),
    'gradientField': dict(recipe='tintedPaper', stage={'paper': (0.965, 0.022, 'field')}, field={'field': (0.93, 0.036, 'field'), 'fieldFar': (0.90, 0.05, 'field')},
                          ground_c=0.06, tints=('paper',), about='a pale tinted mesh: two lobes of the field hue from opposite corners'),
}


def field_hue(ah):
    """A family's field hue: the accent's own for a blue, teal or green, else a cool 230 (never a pink or cream field)."""
    return ah if 150 <= ah <= 265 else 230.0


GROUNDS = ('paper', 'mist', 'line', 'slate', 'slateRaised', 'ink', 'ink2', 'ground', 'bg', 'stage', 'surface')
NEUTRAL_C = 0.025  # lib/look.ts NEUTRAL.maxC
NEUTRAL_HOUSE = 0.012  # lib/look.ts NEUTRAL.houseC[1]


def check_tokens(path):
    """The film's own tokens: bans and bands on what the brand did not supply, contrast and the
    one-accent rule on everything. Returns the exit code."""
    try:
        src = open(path, encoding='utf-8').read()
    except OSError as e:
        print(f'palette.py: cannot read {path}: {e}', file=sys.stderr)
        return 2
    lines = src.split('\n')
    head = src.split('\n\n')[0]
    whole = 'cinetic:brand-supplied' in head
    toks = []
    for i, line in enumerate(lines):
        for m in re.finditer(r"""['"]?([\w-]+)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{6})\b""", line):
            brand = whole or 'cinetic:brand-supplied' in line or (i > 0 and 'cinetic:brand-supplied' in lines[i - 1])
            toks.append(dict(name=m.group(1).lstrip('-'), hex=m.group(2).upper(), brand=brand, skip=bool(re.search(r'\b(imagery|ui-state)\b', line)),
                             lch=parse_colour(m.group(2))))
    if not toks:
        print(f'palette.py: no #RRGGBB tokens in {path}', file=sys.stderr)
        return 2
    by = {t['name']: t for t in toks}
    fails, notes = [], []
    fam_m = re.search(r'//\s*family:\s*(\w+)', src)
    fam = FAMILIES.get(fam_m.group(1)) if fam_m else None
    if fam_m and not fam:
        fails.append(f"// family: {fam_m.group(1)} is not a ground family ({', '.join(FAMILIES)})")
    fam_c = (fam or {}).get('ground_c', NEUTRAL_C)
    tinted = set((fam or {}).get('tints', ()))
    if fam:
        notes.append(f"ground family {fam_m.group(1)}: {fam['about']}" + (f" (its grounds {', '.join(sorted(tinted))} may carry C <= {fam_c})" if tinted else ''))
    for t in toks:
        if t['name'] in tinted and not t['brand'] and not t['skip'] and t['lch'][1] <= fam_c + 1e-9:
            continue
        if t['name'] in GROUNDS and not t['brand'] and not t['skip'] and t['lch'][1] > NEUTRAL_C + 1e-9:
            fails.append(f"{t['name']} {t['hex']} is a ground at chroma {t['lch'][1]:.3f}: grounds and surfaces stay neutral (C <= {NEUTRAL_C}); "
                         'the accent is the colour, a field at its hue is a declared colour event')
        elif t['name'] in GROUNDS and not t['brand'] and not t['skip'] and t['lch'][1] > NEUTRAL_HOUSE + 1e-9:
            notes.append(f"note: {t['name']} {t['hex']} carries chroma {t['lch'][1]:.3f} (house grounds .004-{NEUTRAL_HOUSE}: above it a grey starts to read as a colour)")
    named = re.search(r'//\s*stage:\s*(dark|light|slate)\b', src)
    for t in toks:
        if t['hex'] == '#000000' and not t['brand']:
            fails.append(f"{t['name']} is pure #000: ink is tinted (L 0.15-0.25 toward the accent hue)")
        why = banned(*t['lch'])
        if why and not t['brand']:
            fails.append(f"{t['name']} {t['hex']} is {why} (a hard ban unless the brand supplied it: mark it cinetic:brand-supplied)")
    stage = by.get('paper') or by.get('ground') or by.get('bg') or by.get('stage')
    text = by.get('ink') or by.get('text')
    if stage and text and stage['lch'][0] < text['lch'][0]:
        stage, text = text, stage  # a dark stage: the paper token is the type
    if named and named.group(1) in ('dark', 'slate'):
        dark = by.get('slate') if named.group(1) == 'slate' else (by.get('ink') or by.get('ground'))
        if dark:
            stage, text = dark, by.get('paper') or by.get('text') or text
            if named.group(1) == 'slate' and 'accentLift' in by:
                by = dict(by, accent=by['accentLift'])
            notes.append(f"the stage named in the tokens: {stage['name']} ({named.group(1)})")
    if stage and text:
        r = contrast(text['hex'], stage['hex'])
        (notes if r >= 7 else fails).append(f"statements {text['name']} on {stage['name']} {r:.1f}:1 (>= 7)")
        if 'mute' in by:
            r = contrast(by['mute']['hex'], stage['hex'])
            (notes if r >= 4.5 else fails).append(f"secondary mute on {stage['name']} {r:.1f}:1 (>= 4.5)")
        if 'accent' in by:
            r = contrast(by['accent']['hex'], stage['hex'])
            (notes if r >= 3 else fails).append(f"accent graphics on {stage['name']} {r:.1f}:1 (>= 3)")
        L, C, h = stage['lch']
        if not stage['brand'] and L >= 0.5 and not (0.93 <= L <= 0.99 or L >= 0.999) and L > 0.85:
            notes.append(f"note: the light ground {stage['hex']} sits at L {L:.3f} (house band 0.93-0.99)")
        if not stage['brand'] and L >= 0.93 and C > (fam_c if stage['name'] in tinted else 0.015):
            fails.append(f"the ground {stage['hex']} carries chroma {C:.3f} (<= 0.015, toward a cool accent)")
        if text and not text['brand'] and text['lch'][0] < 0.5 and not 0.12 <= text['lch'][0] <= 0.25:
            notes.append(f"note: ink {text['hex']} at L {text['lch'][0]:.3f} (house band 0.15-0.25)")
    sat = [t for t in toks if t['lch'][1] >= 0.06 and not t['skip']]
    best = []
    for anchor in sat:
        members = [t for t in sat if (t['lch'][2] - anchor['lch'][2]) % 360 <= 30]
        if len(members) > len(best):
            best = members
    for t in sat:
        if t not in best:
            fails.append(f"{t['name']} {t['hex']} is a second accent hue (one accent family within 30 degrees{'; brand-supplied colours count too' if t['brand'] else ''})")
    for n_ in notes:
        print(f'  ok   {n_}', file=sys.stderr)
    for f_ in fails:
        print(f'  FAIL {f_}', file=sys.stderr)
    print(f"palette.py: {len(toks)} tokens in {path} ({sum(1 for t in toks if t['brand'])} brand-supplied): {'pass' if not fails else 'FAIL'}")
    return 1 if fails else 0


def check_ramp(stops, accent, brand=False):
    """A light field or sweep keeps one hue: chromatic stops within 7 degrees of the accent hue.
    Returns the exit code."""
    aL, aC, ah = parse_colour(accent)
    rows, fails = [], []
    for s_ in stops:
        L, C, h = parse_colour(s_)
        rows.append((s_, L, C, h))
        off = min(abs(h - ah), 360 - abs(h - ah))
        if C > 0.03 and off > 7 and not brand:
            fails.append(f'{s_} (OKLCH {L:.3f} {C:.3f} {h:.0f}) leaves the accent hue by {off:.0f} degrees (one hue: within 7)')
    swing = max(r[1] for r in rows) - min(r[1] for r in rows)
    peak = max(r[2] for r in rows)
    print(f"// ramp at h {ah:.0f}: " + ', '.join(f'{r[0]} (L {r[1]:.3f} C {r[2]:.3f} h {r[3]:.0f})' for r in rows))
    if not 0.05 <= swing <= 0.20:
        print(f'  note lightness swing {swing:.3f} (a living light field reads at 0.05-0.20)', file=sys.stderr)
    if peak > 0.13 and not brand:
        print(f'  note chroma {peak:.3f} over 0.13 (a light field stays under it; a sweep on type may go higher)', file=sys.stderr)
    for f_ in fails:
        print(f'  FAIL {f_}', file=sys.stderr)
    print(f"palette.py: ramp of {len(rows)} stops: {'pass' if not fails else 'FAIL'}")
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    ap.add_argument('--accent', help="the one accent: '#RRGGBB' or 'oklch(L C h)'")
    ap.add_argument('--recipe', choices=sorted(RECIPES), help='build the palette from a house colour system')
    ap.add_argument('--list-recipes', action='store_true', help='print the recipes and exit')
    ap.add_argument('--family', choices=sorted(FAMILIES), help="build the palette for a ground family (its recipe, its stage and its field tokens)")
    ap.add_argument('--list-families', action='store_true', help='print the ground families and exit')
    ap.add_argument('--check-tokens', metavar='FILE', help="check a film's tokens file (or an HTML :root palette) instead of building one")
    ap.add_argument('--ramp', help='comma-separated stops of a light field or sweep: one-hue check against --accent')
    ap.add_argument('--stage', choices=['light', 'dark'], help="the ground most shots sit on (default light, or the recipe's own)")
    ap.add_argument('--temp', choices=['neutral', 'grey', 'cool', 'warm'], default='neutral',
                    help="tint of the neutrals: neutral toward the accent's hue, grey none (a true charcoal), cool hue 250 "
                         '(warm makes a beige paper: needs --brand-supplied)')
    ap.add_argument('--stage-hue', type=float, help="the stage's own hue from the brand's world (OKLCH h, e.g. 160 for pine-black)")
    ap.add_argument('--stage-chroma', type=float, help='chroma for --stage-hue (default 0.014 dark, 0.008 light)')
    ap.add_argument('--paper', help="use this paper instead of the generated one (hex or oklch), and check it")
    ap.add_argument('--brand-supplied', action='store_true',
                    help="the user's brand supplied the accent or paper: skip the hard-ban refusal (record it in BRIEF.md)")
    ap.add_argument('--meaning', default='<one word>', help='what the accent means, for the token comment')
    ap.add_argument('--cover', metavar='IMG', help='only measure the share of pixels within OKLab 0.08 of the accent')
    ap.add_argument('--json', help='also write the palette and checks here')
    a = ap.parse_args()
    if a.list_recipes:
        for k, v in RECIPES.items():
            print(f"{k:15s} {v['stage']:5s} " + ' '.join(f'{t} L{lc[0]:.3f} C{lc[1]:.3f}' for t, lc in v['tokens'].items())
                  + f"  accent L {v['accent_L'][0]}-{v['accent_L'][1]}")
        return 0
    if a.list_families:
        for k, v in FAMILIES.items():
            print(f"{k:14s} {v['recipe']:12s} {v['about']}")
        return 0
    if a.check_tokens:
        return check_tokens(a.check_tokens)
    if a.family:
        fam = FAMILIES[a.family]
        if a.recipe and a.recipe != fam['recipe']:
            print(f"palette.py: --family {a.family} builds on {fam['recipe']}, not {a.recipe}", file=sys.stderr)
            return 2
        a.recipe = fam['recipe']
    if not a.accent:
        ap.error('--accent is required (or --check-tokens / --list-recipes)')
    if a.ramp:
        try:
            return check_ramp([x.strip() for x in a.ramp.split(',') if x.strip()], a.accent, a.brand_supplied)
        except ValueError as e:
            print(f'palette.py: {e}', file=sys.stderr)
            return 2
    recipe = RECIPES.get(a.recipe) if a.recipe else None
    if recipe and a.stage and a.stage != recipe['stage']:
        twins = ', '.join(k for k, v in RECIPES.items() if v['stage'] == a.stage and k != 'deepField')
        twin = {'stoneMid': ' (slateMid is its dark twin)', 'slateMid': ' (stoneMid is its light twin)'}.get(a.recipe, '')
        print(f"palette.py: --recipe {a.recipe} is a {recipe['stage']} stage, not {a.stage}: a {a.stage} recipe is one of "
              f"{twins}{twin}", file=sys.stderr)
        return 2
    a.stage = recipe['stage'] if recipe else (a.stage or 'light')
    try:
        aL, aC, ah = parse_colour(a.accent)
    except ValueError as e:
        print(f'palette.py: {e}', file=sys.stderr)
        return 2
    acc_hex, _ = oklch_hex(aL, aC, ah)
    paper_in = None
    if a.paper:
        try:
            paper_in = parse_colour(a.paper)
        except ValueError as e:
            print(f'palette.py: {e}', file=sys.stderr)
            return 2

    if not a.cover:
        # the hard bans: refuse before building anything, unless the brand supplied the colour
        refusals = []
        why = banned(aL, aC, ah)
        if why:
            refusals.append(f'accent {acc_hex} (OKLCH {aL:.2f} {aC:.3f} {ah:.0f}) is {why}')
        if a.temp == 'warm':
            refusals.append('--temp warm makes a beige paper')
        if paper_in:
            why = banned(*paper_in)
            if why:
                refusals.append(f'paper {a.paper} (OKLCH {paper_in[0]:.2f} {paper_in[1]:.3f} {paper_in[2]:.0f}) is {why}')
        if refusals and not a.brand_supplied:
            for r in refusals:
                print(f'palette.py: refused: {r}.', file=sys.stderr)
            print('  That is a hard ban when you invent the look (SKILL.md "Hard bans"; references/brand-and-color.md §8).\n'
                  '  Choose the accent from red, green, teal, blue or yellow, and keep the paper neutral or cool.\n'
                  "  If the user's brand supplied this colour, pass --brand-supplied and record it in BRIEF.md.", file=sys.stderr)
            return 1
        for r in refusals:
            print(f'palette.py: brand-supplied: {r}; record it in BRIEF.md so the critics accept it.', file=sys.stderr)
        # not a ban, but the fastest way to look like a template: framework-default blues
        if not a.brand_supplied and 252 <= ah <= 268 and aC >= 0.17 and 0.50 <= aL <= 0.66:
            print(f'palette.py: note: accent {acc_hex} sits in the framework-default blue family (#3B82F6/#2563EB). '
                  'It reads as "default" before anything moves. Derive the accent from the brand\'s world '
                  '(references/brand-and-color.md §9: shift the hue, lower the chroma, or pick another family).', file=sys.stderr)

    if a.cover:
        try:
            pct = cover(a.cover, acc_hex)
        except ValueError as e:
            print(f'palette.py: {e}', file=sys.stderr)
            return 2
        ok = pct <= 8
        print(f'accent {acc_hex} covers {pct:.2f}% of {a.cover} ({"ok" if ok else "over 8%: fine only on the one designed flood"})')
        return 0 if ok else 1

    hue = {'neutral': ah, 'grey': ah, 'cool': 250.0, 'warm': 75.0}[a.temp]
    tint = 2.2 if a.temp == 'warm' else 1.0  # warm papers carry a little more chroma
    stage_hue = None
    if a.stage_hue is not None:
        stage_hue = a.stage_hue % 360
        if 270 <= stage_hue < 340 and not a.brand_supplied:
            print(f'palette.py: refused: --stage-hue {stage_hue:.0f} is in the purple range (270-340), '
                  'a hard ban (SKILL.md, "Hard bans"). Pick a green, teal, blue or neutral stage.', file=sys.stderr)
            return 1
        if 31 <= stage_hue < 118:
            print(f'palette.py: note: --stage-hue {stage_hue:.0f} is warm; a tinted stage there reads as brown or '
                  'beige. Prefer --temp grey (a true charcoal or a neutral paper).', file=sys.stderr)
    stage_C = a.stage_chroma if a.stage_chroma is not None else (0.014 if a.stage == 'dark' else 0.008)
    # Toward a warm hue (a red or a yellow accent) the neutrals stay neutral: C <= 0.004, and <= 0.003
    # for light ones, so they never read as warm and 8-bit rounding can never push the paper or a
    # light grey into the beige region (C >= 0.007).
    warm_hue = 20 <= hue < 125 and a.temp != 'warm'
    if a.stage == 'light':
        spec = [('paper', 0.975, 0.004 * tint, 'the stage'), ('mist', 0.945, 0.005 * tint, 'canvas behind the product'),
                ('line', 0.885, 0.006, 'hairlines, >= 1.5 px on screen'), ('mute', 0.52, 0.012, 'secondary text'),
                ('ink2', 0.23, 0.008, 'raised dark surfaces'), ('ink', 0.17, 0.007, 'type and marks')]
        stage_key, text_key, band = 'paper', 'ink', (0.43, 0.67)
    else:
        spec = [('ink', 0.165, 0.008 * tint, 'the stage'), ('ink2', 0.215, 0.009 * tint, 'raised surfaces on the stage'),
                ('line', 0.31, 0.010, 'hairlines, >= 1.5 px on screen'), ('mute', 0.72, 0.012, 'secondary text'),
                ('mist', 0.90, 0.006, 'light panels, if any'), ('paper', 0.965, 0.004 * tint, 'type and marks')]
        stage_key, text_key, band = 'ink', 'paper', (0.84, 0.90) if YELLOW[0] <= ah < YELLOW[1] else (0.63, 0.85)
    c_band = (0.11, 0.25) if a.stage == 'light' else (0.07, 0.16)
    if recipe:
        # the recipe's lightness and chroma at the accent hue (neutral where its chroma is 0)
        jobs = {n: j for n, _, _, j in spec}
        if recipe.get('stage_key') == 'slate':
            jobs = dict(jobs, slate='the stage (a mid slate)', slateRaised='raised surfaces on the slate', ink='the darkest type, marks and shadows',
                        ink2='raised dark surfaces', paper='type and marks on the slate')
            stage_key = 'slate'
        spec = [(n, L, C, jobs.get(n, '')) for n, (L, C) in recipe['tokens'].items()]
        band = recipe.get('yellow_L', recipe['accent_L']) if YELLOW[0] <= ah < YELLOW[1] and 'yellow_L' in recipe else recipe['accent_L']
        c_band = recipe['accent_C']
        if a.recipe == 'stoneMid' and warm_hue:
            spec = [(n, L, min(C, 0.006), j) for n, L, C, j in spec]
        lo, hi = recipe.get('hues', (0, 360))
        if not lo <= ah <= hi and not a.brand_supplied:
            print(f'palette.py: refused: {a.recipe} takes a blue, teal or green accent (hue {lo}-{hi}); this one sits at {ah:.0f}.', file=sys.stderr)
            return 1
    tokens = {}
    for name, L, C, job in spec:
        h_use = hue
        if stage_hue is not None:
            # the stage and its surfaces carry the world's hue; type and light panels stay near-neutral
            carries = name in ((('slate', 'slateRaised', 'line') if stage_key == 'slate' else ('ink', 'ink2', 'line')) if a.stage == 'dark' else ('paper', 'mist', 'line'))
            h_use = stage_hue
            C = stage_C * (1.0 if name == stage_key else 0.8) if carries else min(C, 0.006)
        elif a.temp == 'grey' and not (recipe and a.recipe == 'deepField'):
            C = 0.0  # untinted: a true grey
        elif warm_hue and not (recipe and a.recipe == 'deepField'):
            C = min(C, 0.003 if L >= 0.7 else 0.004)
        hx, c_used = oklch_hex(L, C, h_use)
        tokens[name] = dict(hex=hx, oklch=[round(L, 3), round(c_used, 4), round(h_use, 1)], job=job)
    def fam_hue(h_):
        # a family's hue: --stage-hue sets every one it names (the field hue, the palette's own, a fixed sky hue)
        if stage_hue is not None:
            return stage_hue
        return field_hue(ah) if h_ == 'field' else (hue if h_ is None else h_)

    if a.family:
        for name, (L_, C_, h_) in (FAMILIES[a.family].get('stage') or {}).items():
            hh = fam_hue(h_)
            hx, c_used = oklch_hex(L_, C_, hh)
            tokens[name] = dict(hex=hx, oklch=[round(L_, 3), round(c_used, 4), round(hh, 1)], job=(tokens.get(name) or {}).get('job', '') + f' ({a.family})')
    if paper_in:
        hx, c_used = oklch_hex(*paper_in)
        tokens['paper'] = dict(hex=hx, oklch=[round(paper_in[0], 3), round(c_used, 4), round(paper_in[2], 1)], job=tokens['paper']['job'] + ' (given)')
    if a.stage == 'dark' and not a.brand_supplied:
        sL, sC, sh = tokens[stage_key]['oklch']
        if sL < 0.26 and 235 <= sh <= 270 and 0.004 <= sC < 0.02:  # a near-black blue-grey, not the mid slate
            print(f"palette.py: note: the stage {tokens[stage_key]['hex']} (OKLCH {sL} {sC} {sh:.0f}) is the stock dev-tool "
                  'dark theme (the GitHub / editor blue-grey). It reads as "a screenshot of a tool" before anything moves. '
                  'Take the stage from the brand\'s world instead: --temp grey for a true charcoal, or --stage-hue '
                  '(pine-black 160, deep teal 200, an ink-navy with body: 235 with --stage-chroma 0.03). '
                  'references/brand-and-color.md §9.', file=sys.stderr)
    tokens['accent'] = dict(hex=acc_hex, oklch=[round(aL, 3), round(aC, 4), round(ah, 1)], job=f'MEANING: "{a.meaning}"')
    if stage_key == 'slate':
        tokens['accentLift'] = dict(tokens['accent'], job='the accent on the slate (the same colour: the slate is the stage)')
    stage = tokens[stage_key]['hex']

    checks = []

    def check(name, ok, detail):
        checks.append(dict(check=name, pass_=bool(ok), detail=detail))

    r_text = contrast(tokens[text_key]['hex'], stage)
    r_mute = contrast(tokens['mute']['hex'], stage)
    r_acc = contrast(acc_hex, stage)
    check('statements', r_text >= 7, f'{text_key} on {stage_key} {r_text:.1f}:1 (>= 7)')
    check('secondary text', r_mute >= 4.5, f'mute on {stage_key} {r_mute:.1f}:1 (>= 4.5)')
    check('accent graphics', r_acc >= 3, f'accent on {stage_key} {r_acc:.1f}:1 (>= 3)')
    check('accent chroma', aC >= 0.08, f'C {aC:.3f} (>= 0.08, or it reads as a grey)')
    for k in tokens:
        h_ = parse_colour(tokens[k]['hex'])
        why = banned(*h_)
        if why and not a.brand_supplied:
            check(f'hard ban: {k}', False, f"{tokens[k]['hex']} reads as {why}")
    field_rows = []
    if a.family:
        for name, spec_ in (FAMILIES[a.family].get('field') or {}).items():
            if spec_ == 'accent':
                field_rows.append((name, acc_hex, aL, aC, ah))
                continue
            L_, C_, h_ = spec_
            h_ = fam_hue(h_)
            hx, C_ = oklch_hex(L_, C_, h_)
            field_rows.append((name, hx, L_, C_, h_))
            why = banned(*parse_colour(hx))
            if why and not a.brand_supplied:
                check(f'hard ban: {name}', False, f'{hx} reads as {why} ({name} at the stage hue {h_:.0f})')
    in_band = band[0] <= aL <= band[1] or a.brand_supplied
    fix = ''
    if not in_band:
        L2 = min(max(aL, band[0]), band[1])
        fix = f'; try {oklch_hex(L2, aC, ah)[0]} (L {L2:.2f})'
        if a.stage == 'dark' and aL < band[0] and (ah < 31 or ah >= 340):
            fix += '; lifted, a deep red turns salmon: keep a deep red on a light stage (tintedPaper, stoneMid)'
    check('accent lightness', in_band, f'L {aL:.2f} for a {a.stage} stage{f" ({a.recipe})" if recipe else ""} ({band[0]}-{band[1]}){fix}'
          + (' (brand-supplied: contrast only)' if a.brand_supplied else ''))
    if not a.brand_supplied and not c_band[0] <= aC <= c_band[1] and not YELLOW[0] <= ah < YELLOW[1]:
        print(f'palette.py: note: accent chroma {aC:.3f} sits outside the house band for this stage ({c_band[0]}-{c_band[1]})', file=sys.stderr)
    if paper_in and a.stage == 'light' and not a.brand_supplied:
        pL, pC, ph = paper_in
        cap = 0.004 if (20 <= ah < 125) else 0.015
        check('paper band', 0.93 <= pL <= 0.99 + 1e-9 or (a.recipe == 'whiteWorld' and pL >= 0.999), f'paper L {pL:.3f} (0.93-0.99; pure white is the white-world recipe)')
        check('paper chroma', pC <= cap + 1e-4, f'paper C {pC:.4f} (<= {cap} {"with a red or yellow accent" if cap < 0.01 else "toward a cool accent"})')

    for k, v in tokens.items():
        r = contrast(v['hex'], stage) if k != stage_key else None
        v['contrast_on_stage'] = round(r, 2) if r else None
    width = max(len(k) for k in tokens)
    sh_arg = f' --stage-hue {a.stage_hue:g}' if a.stage_hue is not None else ''
    print(f'// palette.py --accent {a.accent} --stage {a.stage} --temp {a.temp}{sh_arg}' + (f' --recipe {a.recipe}' if recipe else '')
          + (f' --family {a.family}' if a.family else ''))
    print('export const C = {')
    if stage_key == 'slate':
        print('  // stage: slate (the film stands on the slate: type is paper, the accent on it accentLift; --check-tokens reads this line)')
    order = ['ink', 'ink2', 'paper', 'mist', 'line', 'mute', 'accent']
    if stage_key == 'slate':
        order = ['slate', 'slateRaised', 'paper', 'mist', 'line', 'mute', 'ink', 'ink2', 'accent', 'accentLift']
    for k in order:
        v = tokens[k]
        L, C, h = v['oklch']
        r = f', {v["contrast_on_stage"]:.1f}:1 on {stage_key}' if v['contrast_on_stage'] else ''
        print(f"  {k}: '{v['hex']}',{' ' * (width - len(k))} // {v['job']} (OKLCH {L} {C} {h:.0f}{r})")
    print('};')
    if a.family:
        print(f'// family: {a.family} ({FAMILIES[a.family]["about"]}); fx/Grounds <FamilyGround family="{a.family}"> draws it'
              + (f'; stage hue {stage_hue:.0f}' if stage_hue is not None else ''))
        print('export const FIELD = {')
        for name, hx, L_, C_, h_ in field_rows:
            on = tokens['paper']['hex'] if L_ < 0.66 else tokens['ink']['hex']
            what = 'colour field' if name == 'field' else name
            print(f"  {name}: '{hx}', // the family's {what} (OKLCH {L_:.3f} {C_:.3f} {h_:.0f}); type on it {on}, {contrast(on, hx):.1f}:1")
        print('};')
    for c in checks:
        print(f"  {'ok  ' if c['pass_'] else 'FAIL'} {c['check']}: {c['detail']}", file=sys.stderr)
    if a.json:
        json.dump(dict(stage=a.stage, temp=a.temp, tokens=tokens, family=a.family, stage_hue=stage_hue,
                       field={n: dict(hex=hx, oklch=[round(L_, 3), round(C_, 4), round(h_, 1)]) for n, hx, L_, C_, h_ in field_rows},
                       checks=[dict(check=c['check'], ok=c['pass_'], detail=c['detail']) for c in checks]),
                  open(a.json, 'w'), indent=1)
    return 0 if all(c['pass_'] for c in checks) else 1


if __name__ == '__main__':
    sys.exit(main())
