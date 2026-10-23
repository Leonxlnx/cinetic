#!/usr/bin/env python3
"""Deal a film direction from the deck, so every film gets its own visual idea.

Left alone, an agent makes the same film every time: calm fragments on a plain ground, a push-in, an
end card. deck.py deals three complete art directions from assets/directions/directions.json that fit
the brief (format, pace, the assets that exist), each with its own space (flat, layered, perspective
planes or a lit relief), light, camera language, cut grammar, type behaviour, story shape, lockup and
one signature shot. The agent chooses the one that can carry something only this product has (the idea
sentence and the competitor test), then deals the full sheet for it. The sheet is the art direction for
the film: the treatment, the technique draw (pick.py) and the build follow it.

Where it sits: after the brief (Step 0) and the inventory, before the treatment and pick.py (Step 1).

Usage:
  python3 scripts/deck.py --brief "<one line>" --format launch --pace calm [--have ui,footage] --options 3
  python3 scripts/deck.py --brief "<one line>" --format launch --pace calm --direction <id>  # the sheet
  python3 scripts/deck.py --redraw palette --reason "the brand's own green fights the dealt blue"
  python3 scripts/deck.py --show                 # reprint the saved sheet (out/DIRECTION.md)
  python3 scripts/deck.py --show <id>            # one direction in full, with every variant
  python3 scripts/deck.py --list [--format vertical --pace crisp --have ui]
  python3 scripts/deck.py --validate [--strict]  # schema, library ids, primitives, distinctness, bans

  --have      what really exists (comma-separated): ui (the product has an interface to show, built in
              code from the real product), footage (real video supplied), audio (a real recorded clip the
              product makes or handles: a voice, a call, a sound), number (one honest number the product
              owns and can back), name (the product's name is a real word whose meaning the film can use).
              Leave it out when there is none. Directions built on an asset only fit when it exists.
  --keep      palette,type when the brand already fixes them: the sheet deals the rest, and you map the
              brand's values onto the dealt roles.
  --seconds   the film's length: filters directions by their length range and times the beat skeleton.
  --seed      reproduce a deal. Without it the seed comes from the brief, format, pace and assets, so
              the same brief always deals the same three: rerunning is not a way to fish for another deal.
  --allow-planned  deal or sheet a direction whose signature still waits for a planned primitive (you
              build that primitive inside the film).

The deal is weighted toward directions whose keywords appear in the brief and that use an asset the film
really has, away from the directions of your last films (a small history in ~/.cinetic/deck-history.json,
or CINETIC_DECK_HISTORY; --no-history turns it off). The three options always differ in camera motion,
signature, story shape and lockup, span three kinds of space and two kinds of light, deal palettes of at
least two ground tones, and include at least one rich, high-intensity direction when one fits.

Redraw one slot (palette | type | signature | direction) only for a reason you can state: it contradicts
the brand, needs an asset that does not exist, or cannot carry the idea. Never to get something more
familiar. --reason is required, each slot redraws at most twice, and every redraw is recorded in
out/direction.json and out/DIRECTION.md.

Exit 0 on success, 1 when nothing fits or a redraw is refused, 2 on bad input or an invalid deck.
Python standard library only; deterministic; no network.
"""
import argparse
import hashlib
import itertools
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..'))


def _first(paths):
    return next((p for p in paths if os.path.isfile(p)), paths[0])


# The skill keeps its data in assets/; a film project made by new-film.sh keeps copies next to its scripts.
DEFAULT_DECK = _first([os.path.join(SKILL, 'assets', 'directions', 'directions.json'),
                       os.path.join(HERE, 'directions', 'directions.json')])
DEFAULT_LIBRARY = _first([os.path.join(SKILL, 'assets', 'library', 'techniques.json'),
                          os.path.join(HERE, 'library', 'techniques.json')])
STARTER_SRC = [os.path.join(SKILL, 'assets', 'remotion-starter', 'src'), os.path.join(SKILL, 'src')]
SHORTLIST = [os.path.join(SKILL, 'assets', 'music', 'shortlist.json'), os.path.join(HERE, 'music', 'shortlist.json')]
PICK = os.path.join(HERE, 'pick.py')

FORMATS = ['launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical']
PACES = ['calm', 'crisp']
HAVE = ['ui', 'footage', 'audio', 'number', 'name']
HAVE_TEXT = {'ui': 'product UI', 'footage': 'footage', 'audio': 'a real recorded clip',
             'number': 'one honest number', 'name': 'a name that means something'}
KEEP = ['palette', 'type']
SLOTS = ['palette', 'type', 'signature', 'direction']
MAX_REDRAWS = 2
DEFAULT_SECONDS = {'launch': 20, 'feature': 15, 'loop': 10, 'sting': 6, 'walkthrough': 30, 'vertical': 15}

SPACES = {'flat': 'flat', 'layered': 'layered 2.5D', 'perspective': 'perspective planes', 'relief': 'lit relief'}
MOTIONS = ['locked', 'drift', 'travel', 'dolly', 'orbit', 'follow', 'focus', 'snap', 'split', 'crane', 'time']
CUT_KINDS = ['carried', 'one-take', 'on-sound', 'stepped']
SEAM_KINDS = ['velocity', 'morph', 'hard', 'mask', 'whip', 'defocus', 'light', 'snapZoom', 'breath', 'zoomThrough',
              'stepped', 'colour', 'dissolveUi', 'fadeEnd', 'wipe']
TYPE_ROLES = ['ui', 'caption', 'line', 'display', 'hero', 'giant']
LINE_MODES = ['build', 'replace']
RECENTRE = ['jump', 'glide', 'slot', 'none']
CADENCE = ['even', 'reading', 'accelerate']
ACCENTS = ['red', 'green', 'teal', 'blue', 'yellow']
TONES = ['light', 'mid', 'dark', 'field']
LIGHT_KINDS = {
    'raking-key': 'a low key light whose shadows come from real heights',
    'face-shade': 'faces shaded by their angle to one fixed key',
    'sun-arc': 'a sun that crosses a whole day',
    'pool': 'a soft one-hue pool that travels',
    'exposure': 'a frame-wide exposure event',
    'practical': 'light from an object in the scene',
    'sheen': 'a material highlight that slides with the camera',
}
STORY_SHAPES = ['problem-turn', 'journey', 'one-to-many', 'many-to-one', 'detail-to-whole', 'whole-to-detail',
                'assembly', 'chain', 'day-arc', 'call-response', 'twist', 'accelerando', 'result-first', 'nested',
                'loop', 'reveal']
LOCKUP_KINDS = {
    'device-mark': 'the story\'s device becomes the mark',
    'world-object': 'the mark is an object in the world, lit like the rest',
    'pull-back': 'the camera pulls back until the world holds the mark',
    'light-finds': 'the light lands on the mark',
    'hard-stop': 'the motion stops dead and the mark is there',
    'held-frame': 'the last action freezes and the name sets over it',
    'typed': 'the world\'s own mechanism writes the name',
    'subtract': 'everything else leaves; the mark remains',
    'shadow': 'the mark is a shadow or a projection',
    'resolve': 'the mark resolves out of soft tone or coarse cells',
}
NEEDS = ['needs', 'optional', 'none']
MUSIC_MODES = ['track', 'effects', 'either']
ENDINGS = ['button', 'stop', 'ring']
COSTS = ['light', 'medium']
STATUSES = ['built', 'planned']
MAX_ELEMENTS = 1500  # animated DOM or SVG nodes in the signature shot: kept for a laptop GPU at 1080p60

REQUIRED = ['id', 'name', 'intensity', 'idea', 'story', 'world', 'palettes', 'type_options', 'camera', 'cuts', 'type',
            'transitions', 'signature', 'signature_alt', 'lockup', 'idea_sentences', 'fit', 'music', 'primitives',
            'techniques', 'avoid_techniques', 'keywords', 'skeleton', 'avoid']
REQ_SUB = {
    'story': ['shape', 'line'],
    'world': ['space', 'set', 'planes', 'light_kind', 'light', 'light_build', 'texture'],
    'camera': ['class', 'motion', 'animator', 'in_shot', 'between'],
    'cuts': ['kind', 'grammar', 'carried_min', 'seams', 'on_sound'],
    'type': ['modes', 'recentre', 'cadence', 'roles', 'scale_contrast', 'behaviour'],
    'signature': ['name', 'family', 'shot', 'build', 'cost', 'elements', 'primitives', 'techniques'],
    'signature_alt': ['name', 'shot', 'build', 'primitives', 'techniques'],
    'lockup': ['kind', 'shot', 'build', 'primitives'],
    'fit': ['formats', 'paces', 'ui', 'footage', 'seconds'],
    'music': ['mode', 'bpm', 'feel', 'ending'],
}
# A quantity a builder can act on: frames, seconds, pixels, percent, degrees, or a scale factor.
QUANTITY = re.compile(r'\d+(?:\.\d+)?\s?(?:f|s|px|%|degrees?)(?![a-z])|\bx\s?\d+(?:\.\d+)?|\b\d+(?:\.\d+)?x\b')
# A concrete build: a named mechanism in Chromium terms.
MECHANISM = re.compile(r'transform|translate|rotate|scale|clip-path|\bsvg\b|opacity|preserve-3d|\bdivs?\b|\bpaths?\b|'
                       r'polygon|filter|matrix|state function|closed form|stepFrame|\blayers?\b|\bplates?\b|'
                       r'overlay|method', re.IGNORECASE)

# The house bans, as words that may not appear in what a direction asks for (its avoid lists may name them).
BAN_WORDS = [
    (r'\borange\b', 'orange'), (r'\bamber\b', 'amber'), (r'\bbeige\b', 'beige'), (r'\bcream\b', 'cream'),
    (r'\btan\b', 'tan'), (r'\bsandy?\b', 'sand'), (r'\bgold(en)?\b', 'gold'), (r'\bpurple\b', 'purple'),
    (r'\bviolet\b', 'violet'), (r'\bindigo\b', 'indigo'), (r'\blavender\b', 'lavender'), (r'\blilac\b', 'lilac'),
    (r'\bmagenta\b', 'magenta'), (r'\bmauve\b', 'mauve'), (r'\bneon\b', 'neon'),
    (r'\bglass(y|morphism)?\b', 'glass'), (r'(?<!sans-)\bserifs?\b', 'serif'), (r'\bitalic', 'italic'),
    (r'\boblique', 'oblique'), (r'\bglow', 'glow'), (r'\bhalos?\b', 'halo'), (r'\bbloom', 'bloom'),
    (r'\blens flares?\b', 'lens flare'), (r'\bsparkl', 'sparkle'), (r'\bconfetti\b', 'confetti'),
    (r'\bparticles?\b', 'particles'), (r'\bcode rain\b', 'code rain'), (r'\bglitch', 'glitch'),
    (r'\blight leaks?\b', 'light leak'), (r'\bfilm burn\b', 'film burn'), (r'\bemoji', 'emoji'),
    (r'\brainbow', 'rainbow'), (r'\bmulti-hue\b', 'multi-hue'), (r'\bgradients?\b', 'gradient'),
    (r'\bwarm\b', 'warm'), (r'\btungsten\b', 'tungsten'), (r'\bbokeh\b', 'bokeh'), (r'\bcondensed\b', 'condensed'),
    (r'\bbackdrop-filter\b', 'backdrop-filter'),
]
# House wording: the deck presents its numbers as house craft, never as a finding about other work.
# Written with character classes so that a provenance scan of this file does not match the patterns themselves.
WORDING = [
    r'\bT[0-9]{2}\b', r'reference[ ](films?|clips?|videos?|sets?)\b', r'\b(the|a|our|this)[ ]study\b',
    r'\bstud(ied)\b', r'\bwe[ ](analy[sz]ed|measured|stud(ied))\b', r'\blearned[ ]from\b',
    r'\bmeasured[ ]((professional|launch|motion)[ ])?(films|clips|videos)\b', r'\bframe[ ]by[ ]frame\b',
    r'\b(real|shipped|award|studio|best|professional|top)[ ]((launch|motion)[ ])?(films|videos|work)\b',
    r'\bstudios?[ ]do\b', r'\bcorp(us)\b', r'\bper[-]film\b', r'\bacross[ ]films\b', r'\btop[-]tier\b',
    r'\bmedian\b', r'\bp10\b', r'\bp90\b', r'\biqr\b', r'\bresearch', r'\bsample[ ]of\b',
]


def fail(msg, code=2):
    print(f'deck.py: {msg}', file=sys.stderr)
    sys.exit(code)


def read_json(path, what):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, ValueError) as e:
        fail(f'cannot read {what} {path}: {e}')


def load_library(path):
    if not os.path.isfile(path):
        return None
    data = read_json(path, 'the technique library')
    entries = data['techniques'] if isinstance(data, dict) else data
    return {e['id']: e for e in entries if isinstance(e, dict) and 'id' in e}


def starter_src():
    return next((p for p in STARTER_SRC if os.path.isfile(os.path.join(p, 'lib', 'anim.ts'))), None)


def _exports(src, rel, name):
    path = os.path.join(src, *rel.split('/'))
    if not os.path.isfile(path):
        return False
    text = open(path, encoding='utf-8').read()
    return re.search(r'export\s+(const|function|class)\s+' + re.escape(name) + r'\b', text) is not None


def ready_names(cat, src=None):
    """Primitive names a direction may rely on now: built in the catalogue, or already exported by the starter."""
    out = set()
    for name, p in (cat or {}).items():
        if not isinstance(p, dict):
            continue
        if p.get('status') == 'built' or (src and isinstance(p.get('file'), str) and _exports(src, p['file'], name)):
            out.add(name)
    return out


# ---------------------------------------------------------------------------------------------- validation
def _strings(obj, skip=()):
    """Every string in obj with its dotted path, leaving out the keys in skip."""
    if isinstance(obj, str):
        yield '', obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k in skip:
                continue
            for p, s in _strings(v, skip):
                yield (f'{k}.{p}' if p else k), s
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            for p, s in _strings(v, skip):
                yield (f'{i}.{p}' if p else str(i)), s


def _words(text):
    return {w for w in re.findall(r'[a-z]+', text.lower()) if len(w) >= 4}


def wording_hits(obj):
    hits = []
    for path, s in _strings(obj):
        for pat in WORDING:
            m = re.search(pat, s, re.IGNORECASE)
            if m:
                hits.append(f'{path}: "{m.group(0)}" reads as a claim about other work; say it as house craft')
    return hits


def ban_hits(obj, prefix='', skip=()):
    out = []
    for path, s in _strings(obj, skip=skip):
        for pat, word in BAN_WORDS:
            if re.search(pat, s, re.IGNORECASE):
                out.append(f'{prefix}{path}: "{word}" is a house ban (name it only in the avoid list)')
    return out


def _is_list_of(v, allowed=None, kind=str, nonempty=True):
    return (isinstance(v, list) and (v or not nonempty) and all(isinstance(x, kind) for x in v)
            and (allowed is None or all(x in allowed for x in v)))


def _lc(v):
    return isinstance(v, list) and len(v) == 2 and all(isinstance(x, (int, float)) for x in v) and 0 <= v[0] <= 1 and 0 <= v[1] <= 0.4


def tone_of(palette, recipes):
    return (recipes.get(palette.get('recipe')) or {}).get('tone')


def sig_start(d):
    t = 0.0
    for b in d['skeleton']:
        if b.get('signature'):
            return t
        t += b.get('share', 0)
    return t


def validate(data, library=None, src=None, strict=False):
    """Returns (errors, notes). Errors make the deck invalid; notes are information."""
    errors, notes = [], []
    if not isinstance(data, dict) or not isinstance(data.get('directions'), list):
        return ['the deck must be an object with a "directions" list'], notes
    dirs = data['directions']
    cat = data.get('primitives')
    if not isinstance(cat, dict) or not cat:
        errors.append('the deck has no "primitives" catalogue')
        cat = {}
    for name, p in cat.items():
        if not isinstance(p, dict) or p.get('status') not in STATUSES or not isinstance(p.get('file'), str):
            errors.append(f'primitives.{name}: needs a file and a status ({"/".join(STATUSES)})')
    recipes = data.get('recipes')
    if not isinstance(recipes, dict) or not recipes:
        errors.append('the deck has no "recipes" catalogue')
        recipes = {}
    for name, r in recipes.items():
        if not (isinstance(r, dict) and r.get('status') in STATUSES and r.get('tone') in TONES and r.get('notes')
                and all(_lc(r.get(k)) for k in ('ground', 'ink', 'accent'))):
            errors.append(f'recipes.{name}: needs a status, a tone ({"/".join(TONES)}), notes and ground/ink/accent as [L, C]')
    methods = data.get('methods')
    if not isinstance(methods, dict) or not methods or not all(isinstance(v, str) and len(v) > 40 for v in methods.values()):
        errors.append('the deck needs a "methods" catalogue of build recipes (name -> text)')
        methods = methods if isinstance(methods, dict) else {}
    errors += ban_hits({'recipes': recipes, 'methods': methods})
    if not 18 <= len(dirs) <= 24:
        errors.append(f'the deck holds {len(dirs)} directions; it must hold 18-24')
    planned_caps = [n for n, p in cat.items() if isinstance(p, dict) and p.get('status') == 'planned' and re.search(r'[A-Z]', n)]

    seen, fam, cls, keys = {}, {}, {}, {}
    for i, d in enumerate(dirs):
        if not isinstance(d, dict):
            errors.append(f'#{i}: not an object')
            continue
        did = d.get('id', f'#{i}')
        e = lambda msg: errors.append(f'{did}: {msg}')  # noqa: E731
        missing = [k for k in REQUIRED if k not in d or d[k] in ('', None, [], {})]
        for k in missing:
            e(f'missing {k}')
        for k, subs in REQ_SUB.items():
            if isinstance(d.get(k), dict):
                for s in subs:
                    if d[k].get(s) in ('', None, []):
                        e(f'missing {k}.{s}')
        if missing or any(not isinstance(d.get(k), dict) for k in REQ_SUB):
            continue
        if not re.fullmatch(r'[a-z][a-z0-9]*(-[a-z0-9]+)*', str(did)):
            e('id must be kebab-case')
        if did in seen:
            e('duplicate id')
        seen[did] = d
        if not isinstance(d['intensity'], int) or isinstance(d['intensity'], bool) or not 1 <= d['intensity'] <= 5:
            e('intensity must be an integer 1-5')
        w, cam, cuts, ty, sig, fit, mus, lk, st = (d['world'], d['camera'], d['cuts'], d['type'], d['signature'], d['fit'],
                                                   d['music'], d['lockup'], d['story'])
        if w['space'] not in SPACES:
            e(f'world.space must be one of {list(SPACES)}')
        if w['light_kind'] not in LIGHT_KINDS:
            e(f'world.light_kind must be one of {list(LIGHT_KINDS)} (every act carries one light event)')
        if not re.match(r'\s*([2-9]|[1-9][0-9])', str(w['planes'])):
            e('world.planes must start with the number of depth planes, at least 2')
        wm = w.get('method', [])
        if not _is_list_of(wm, list(methods), nonempty=False):
            e(f'world.method must list build methods from the catalogue ({", ".join(methods)})')
        if not MECHANISM.search(str(w['light_build'])):
            e('world.light_build must say how the light is built (plates, overlays, opacity, a method)')
        for n in planned_caps:
            if re.search(r'\b' + re.escape(n) + r'\b', str(w['light_build'])):
                e(f'world.light_build leans on {n}, which is planned: a light event is built from parts that exist')
        # story
        if st['shape'] not in STORY_SHAPES:
            e(f'story.shape must be one of {STORY_SHAPES}')
        # palettes
        if not isinstance(d['palettes'], list) or len(d['palettes']) < 2:
            e('palettes: at least two recipes, so a redraw has somewhere to go')
        pids = set()
        for p in d['palettes'] if isinstance(d['palettes'], list) else []:
            if not isinstance(p, dict):
                e('palettes: every entry is an object')
                continue
            if p.get('id') in pids or not p.get('id'):
                e(f'palettes: missing or duplicate id {p.get("id")!r}')
            pids.add(p.get('id'))
            if p.get('recipe') not in recipes:
                e(f'palette {p.get("id")}: recipe must be one of the catalogue\'s {list(recipes)}')
            if not _is_list_of(p.get('accent'), ACCENTS):
                e(f'palette {p.get("id")}: accent families must come from {ACCENTS}')
            elif p.get('recipe') == 'deepField' and set(p['accent']) - {'blue', 'teal', 'green'}:
                e(f'palette {p.get("id")}: a deepField world is a blue, teal or green hue at depth')
            pr = p.get('proportions') or {}
            if set(pr) != {'ground', 'ink', 'accent'} or sum(pr.values()) != 100:
                e(f'palette {p.get("id")}: proportions ground/ink/accent must add up to 100')
            elif not (pr['accent'] <= 10 and pr['ground'] >= 45 and pr['ink'] >= 8):
                e(f'palette {p.get("id")}: accent at most 10 %, ground at least 45 %, ink at least 8 %')
            if not p.get('notes'):
                e(f'palette {p.get("id")}: say how the roles are used (notes)')
        # type
        if not isinstance(d['type_options'], list) or len(d['type_options']) < 2:
            e('type_options: at least two settings')
        for t in d['type_options'] if isinstance(d['type_options'], list) else []:
            wts = t.get('weights') if isinstance(t, dict) else None
            if not isinstance(t, dict) or not t.get('id') or not t.get('sans') or not t.get('case') or not (
                    isinstance(wts, list) and len(wts) == 2 and all(isinstance(x, int) and 300 <= x <= 800 for x in wts)):
                e(f'type option {t.get("id") if isinstance(t, dict) else t!r}: needs id, sans, weights [2 x 300-800], case')
        if not _is_list_of(ty['modes'], LINE_MODES):
            e(f'type.modes must come from {LINE_MODES}')
        if ty['recentre'] not in RECENTRE:
            e(f'type.recentre must be one of {RECENTRE}')
        if ty['cadence'] not in CADENCE:
            e(f'type.cadence must be one of {CADENCE}')
        if not _is_list_of(ty['roles'], TYPE_ROLES):
            e(f'type.roles must come from {TYPE_ROLES}')
        # camera and cuts
        if cam['motion'] not in MOTIONS:
            e(f'camera.motion must be one of {MOTIONS}')
        if cuts['kind'] not in CUT_KINDS:
            e(f'cuts.kind must be one of {CUT_KINDS}')
        if not _is_list_of(cuts['seams'], SEAM_KINDS):
            e(f'cuts.seams must come from the seam kinds {SEAM_KINDS}')
        cm = cuts['carried_min']
        if not isinstance(cm, (int, float)) or isinstance(cm, bool) or not 0.4 <= cm <= 1:
            e('cuts.carried_min must be 0.4-1 (the floor: at least 40 % of seams carried)')
        elif cuts['kind'] == 'one-take' and cm < 0.9:
            e('cuts.kind one-take needs carried_min of at least 0.9')
        # signature: concrete, buildable, and honest about what it waits for
        if sig['cost'] not in COSTS:
            e(f'signature.cost must be one of {COSTS} (nothing heavy on a laptop GPU)')
        if not re.fullmatch(r'[a-z]+(-[a-z]+)*', str(sig['family'])):
            e('signature.family must be a kebab-case word')
        el = sig['elements']
        if not isinstance(el, int) or isinstance(el, bool) or not 1 <= el <= MAX_ELEMENTS:
            e(f'signature.elements must be the number of animated nodes, 1-{MAX_ELEMENTS}')
        elif el > 300 and sig['cost'] != 'medium':
            e('signature.cost: more than 300 animated nodes is a medium shot')
        q = QUANTITY.findall(str(sig['shot']))
        if len(q) < 3:
            e(f'signature.shot names {len(q)} quantities; a concrete shot gives at least 3 (frames, seconds, px, %, degrees, x-factors)')
        if not MECHANISM.search(str(sig['build'])):
            e('signature.build must name its mechanism (transforms, clip-paths, SVG paths, plates, state functions)')
        req = d.get('requires', [])
        if not _is_list_of(req, list(cat), nonempty=False):
            e('requires must list primitive names from the catalogue')
            req = []
        for n in sig['primitives']:
            if cat.get(n, {}).get('status') == 'planned' and n not in req:
                e(f'signature leans on planned {n}: list it in requires (the direction is not dealt until it lands)')
        for n in planned_caps:
            if n not in req and re.search(r'\b' + re.escape(n) + r'\b', str(sig['build'])):
                e(f'signature.build names planned {n} without listing it in requires')
        # lockup: never waits for a planned primitive
        if lk['kind'] not in LOCKUP_KINDS:
            e(f'lockup.kind must be one of {list(LOCKUP_KINDS)}')
        if not MECHANISM.search(str(lk['build'])) and 'Words' not in str(lk['build']):
            e('lockup.build must say how it is built')
        for n in lk['primitives']:
            if n not in cat:
                e(f'lockup primitive {n!r} is not in the primitives catalogue')
            elif cat[n].get('status') != 'built':
                e(f'lockup leans on planned {n}: a lockup is built from primitives that exist')
        for n in planned_caps:
            if re.search(r'\b' + re.escape(n) + r'\b', str(lk['build'])):
                e(f'lockup.build names planned {n}: a lockup is built from primitives that exist')
        # fit and music
        if not _is_list_of(fit['formats'], FORMATS):
            e(f'fit.formats must come from {FORMATS}')
        if not _is_list_of(fit['paces'], PACES):
            e(f'fit.paces must come from {PACES}')
        if fit['ui'] not in NEEDS or fit['footage'] not in NEEDS:
            e(f'fit.ui and fit.footage must be one of {NEEDS}')
        if not _is_list_of(fit.get('needs_also', []), ['audio', 'number', 'name'], nonempty=False):
            e('fit.needs_also may list audio, number, name')
        if not isinstance(fit.get('keywords_required', False), bool):
            e('fit.keywords_required is true or false')
        sec = fit['seconds']
        if not (isinstance(sec, list) and len(sec) == 2 and all(isinstance(x, (int, float)) for x in sec) and 3 <= sec[0] < sec[1] <= 90):
            e('fit.seconds must be [min, max] within 3-90')
        if mus['mode'] not in MUSIC_MODES or mus['ending'] not in ENDINGS:
            e(f'music.mode must be one of {MUSIC_MODES} and music.ending one of {ENDINGS}')
        bpm = mus['bpm']
        if not (isinstance(bpm, list) and len(bpm) == 2 and all(isinstance(x, (int, float)) for x in bpm) and 60 <= bpm[0] < bpm[1] <= 180):
            e('music.bpm must be [low, high] within 60-180')
        # idea sentences
        if not _is_list_of(d['idea_sentences']) or len(d['idea_sentences']) < 2:
            e('idea_sentences: at least two templates')
        for s in d['idea_sentences'] if isinstance(d['idea_sentences'], list) else []:
            if not (isinstance(s, str) and s.startswith('In this film, [') and ']' in s and 'become' in s):
                e(f'idea sentence must read "In this film, [...] becomes ...": {s!r}')
        # skeleton
        sk = d['skeleton']
        if not isinstance(sk, list) or not 4 <= len(sk) <= 6:
            e('skeleton: 4-6 beats')
        else:
            total, words, sigs, free = 0.0, 0, 0, 0
            for b in sk:
                if not isinstance(b, dict) or not b.get('beat') or not b.get('picture') or not isinstance(b.get('share'), (int, float)):
                    e('skeleton: every beat needs beat, share and picture')
                    continue
                total += b['share']
                sigs += 1 if b.get('signature') is True else 0
                c = b.get('copy')
                if c is None:
                    free += 1
                elif not (isinstance(c, dict) and isinstance(c.get('words'), list) and len(c['words']) == 2 and c.get('what')
                          and 1 <= c['words'][0] <= c['words'][1] <= 4):
                    e(f'skeleton {b["beat"]}: a copy slot is {{"words": [min, max], "what": ...}} with 1-4 words (calm fragments)')
                else:
                    words += c['words'][1]
            if abs(total - 1.0) > 0.02:
                e(f'skeleton: beat shares add up to {total:.2f}, not 1.0')
            if sigs != 1:
                e(f'skeleton: exactly one beat carries the signature shot ({sigs} do)')
            if free < 1:
                e('skeleton: at least one beat without copy (the picture gets its own stretch)')
            if words > 30:
                e(f'skeleton: copy slots allow {words} words; the most a film carries is 30')
            if sk[0].get('share', 1) > 0.2 or 'frame 0' not in str(sk[0].get('picture', '')).lower():
                e('skeleton: the first beat is at most 20 % and says what moves on frame 0')
            main_n = re.sub(r'^the\s+', '', str(sig['name']).lower())
            alt_n = re.sub(r'^the\s+', '', str(d['signature_alt']['name']).lower())
            for j, b in enumerate(sk):
                pic = str(b.get('picture', '')).lower() if isinstance(b, dict) else ''
                if alt_n and re.search(r'\b' + re.escape(alt_n) + r'\b', pic):
                    e(f'skeleton {b["beat"]}: uses the alternative signature; it replaces the signature on a redraw, it is never a second one')
                if (main_n and re.search(r'\b' + re.escape(main_n) + r'\b', pic) and b.get('signature') is not True
                        and j != len(sk) - 1):  # the lockup may echo it
                    e(f'skeleton {b["beat"]}: repeats the signature shot outside its beat (echo it smaller, never repeat it)')
        # primitives and techniques
        named = (list(d['primitives']) + list(d['transitions']) + list(sig['primitives']) + list(d['signature_alt']['primitives'])
                 + list(lk['primitives']))
        for n in named:
            if n not in cat:
                e(f'primitive {n!r} is not in the primitives catalogue')
        techs = (list(d['techniques']) + list(sig['techniques']) + list(d['signature_alt']['techniques']) + list(d['avoid_techniques'])
                 + list(lk.get('techniques', [])))
        if library is not None:
            for t in techs:
                if t not in library:
                    e(f'technique {t!r} is not in the library')
                elif library[t].get('ban_safe') is False:
                    e(f'technique {t!r} relies on a banned look; lean on ban-safe entries')
            for t in d['techniques']:
                lf = library.get(t, {}).get('formats', ['any'])
                if t in library and 'any' not in lf and not set(lf) & set(fit['formats']):
                    notes.append(f'{did}: technique {t} fits none of the direction\'s formats')
        for t in list(sig['techniques']) + list(lk.get('techniques', [])):
            if t not in d['techniques']:
                e(f'signature and lockup technique {t!r} must also be in techniques')
        clash = set(d['techniques']) & set(d['avoid_techniques'])
        if clash:
            e(f'techniques and avoid_techniques share {sorted(clash)}')
        # bans in what the direction asks for
        errors += ban_hits(d, prefix=f'{did}: ', skip=('avoid', 'avoid_techniques', 'techniques'))
        # distinctness keys
        fam.setdefault(sig['family'], []).append(did)
        cls.setdefault(cam['class'], []).append(did)
        keys.setdefault((w['space'], cam['motion'], cuts['kind']), []).append(did)

    for what, table in (('signature family', fam), ('camera class', cls), ('space + camera motion + cut kind', keys)):
        for k, ids in table.items():
            if len(ids) > 1:
                errors.append(f'{" and ".join(ids)} share the {what} {k}: every direction needs its own')
    good = [d for d in dirs if isinstance(d, dict) and d.get('id') in seen and seen[d['id']] is d]
    for a in range(len(good)):
        for b in range(a + 1, len(good)):
            wa, wb = _words(good[a]['signature'].get('shot', '')), _words(good[b]['signature'].get('shot', ''))
            j = len(wa & wb) / max(1, len(wa | wb))
            if j > 0.5:
                errors.append(f'{good[a]["id"]} and {good[b]["id"]}: signature shots read alike (overlap {j:.2f})')
            ta = set(good[a]['signature']['techniques']) | set(good[a]['signature_alt']['techniques'])
            tb = set(good[b]['signature']['techniques']) | set(good[b]['signature_alt']['techniques'])
            if ta & tb:
                errors.append(f'{good[a]["id"]} and {good[b]["id"]}: their signature shots lean on the same library '
                              f'entries {sorted(ta & tb)}; each signature is its own move')
            sa, sb = [x['share'] for x in good[a]['skeleton']], [x['share'] for x in good[b]['skeleton']]
            if len(sa) == len(sb) and max(abs(x - y) for x, y in zip(sa, sb)) < 0.03:
                errors.append(f'{good[a]["id"]} and {good[b]["id"]}: beat skeletons are timed alike; give each its own shape')
    if not errors:
        ready = ready_names(cat, src)
        sp = {s: sum(1 for d in dirs if d['world']['space'] == s) for s in SPACES}
        for s, n in sp.items():
            if n < 3:
                errors.append(f'only {n} directions use the {s} space; the deck needs at least 3 of each')
        quiet = sum(1 for d in dirs if d['intensity'] <= 2)
        wild = sum(1 for d in dirs if d['intensity'] >= 4)
        if quiet < 3 or wild < 3:
            errors.append(f'the deck must span quiet to wild: {quiet} directions at intensity 1-2, {wild} at 4-5 (3 of each at least)')
        if wild < len(dirs) // 2:
            errors.append(f'only {wild} of {len(dirs)} directions are rich (intensity 4-5); at least half must be')
        for what, key, cap, least in (('story shape', lambda d: d['story']['shape'], 3, 10),
                                      ('lockup kind', lambda d: d['lockup']['kind'], 5, 6),
                                      ('light kind', lambda d: d['world']['light_kind'], 6, 5)):
            counts = {}
            for d in dirs:
                counts.setdefault(key(d), []).append(d['id'])
            for k, ids in counts.items():
                if len(ids) > cap:
                    errors.append(f'{len(ids)} directions share the {what} {k} ({", ".join(ids)}); at most {cap}')
            if len(counts) < least:
                errors.append(f'only {len(counts)} kinds of {what}; the deck needs at least {least}')
        bins = {}
        for d in dirs:
            bins.setdefault(round(sig_start(d) * 20) / 20, []).append(d['id'])
        for k, ids in bins.items():
            if len(ids) > 6:
                errors.append(f'{len(ids)} directions put the signature at {k:.2f} of the film; vary where it lands')
        pals = [p for d in dirs for p in d['palettes']]
        share = {t: sum(1 for p in pals if tone_of(p, recipes) == t) / max(1, len(pals)) for t in TONES}
        if share['light'] > 0.45:
            errors.append(f'{share["light"]:.0%} of palettes are light grounds; at most 45 % (the deck needs mid, dark and colour worlds)')
        if share['mid'] + share['field'] < 0.3:
            errors.append(f'only {share["mid"] + share["field"]:.0%} of palettes are mid-tone or colour worlds; at least 30 %')
        for t in TONES:
            n = sum(1 for d in dirs if any(tone_of(p, recipes) == t for p in d['palettes']))
            if n < 3:
                errors.append(f'only {n} directions offer a {t} ground; at least 3')
        for fmt in FORMATS:
            for pace in PACES:
                for have in ((), ('ui',)):
                    n = len([d for d in dirs if fits(d, fmt, pace, have, None, '', ready)[0]])
                    if n < 3:
                        errors.append(f'--format {fmt} --pace {pace} --have {",".join(have) or "(nothing)"} fits only {n} directions')
    errors += wording_hits(data)
    # the catalogues against the starter
    if src:
        for name, p in cat.items():
            found = _exports(src, p.get('file', ''), name)
            if p.get('status') == 'built' and not found:
                errors.append(f'primitives.{name}: marked built, but {p["file"]} does not export it')
            elif p.get('status') == 'planned' and found:
                notes.append(f'primitives.{name}: now exported by {p["file"]}; mark it built')
        look = os.path.join(src, 'lib', 'look.ts')
        text = open(look, encoding='utf-8').read() if os.path.isfile(look) else ''
        for name, r in recipes.items():
            present = re.search(r'\b' + re.escape(name) + r'\s*:', text) is not None
            if r.get('status') == 'built' and not present:
                (errors if strict else notes).append(f'recipes.{name}: marked built, but lib/look.ts has no colour recipe {name}')
            elif r.get('status') == 'planned' and present:
                notes.append(f'recipes.{name}: lib/look.ts now has it; mark it built')
    elif strict:
        errors.append('--strict: the starter source (assets/remotion-starter/src) was not found')
    if library is None:
        (errors if strict else notes).append('the technique library was not found; technique ids were not checked')
    return errors, notes


# ------------------------------------------------------------------------------------------------- dealing
def needs_of(d):
    f = d['fit']
    return [k for k in ('ui', 'footage') if f[k] == 'needs'] + list(f.get('needs_also', []))


def keyword_hits(d, brief):
    b = (brief or '').lower()
    return sum(1 for k in d['keywords'] if re.search(r'\b' + re.escape(k.lower()) + r'(s|es|ing|ed|er|ers)?\b', b))


def fits(d, fmt, pace, have, seconds, brief='', ready=None):
    """(True, '') when the direction can make this film, else (False, reason). ready=None skips the planned check."""
    f = d['fit']
    if fmt and fmt not in f['formats']:
        return False, f'format {fmt}'
    if pace and pace not in f['paces']:
        return False, f'pace {pace}'
    for k in needs_of(d):
        if k not in have:
            return False, f'needs {HAVE_TEXT[k]}'
    if seconds and not f['seconds'][0] <= seconds <= f['seconds'][1]:
        return False, f'{seconds:g} s is outside {f["seconds"][0]}-{f["seconds"][1]} s'
    if f.get('keywords_required') and not keyword_hits(d, brief):
        return False, 'the brief names none of its subjects'
    if ready is not None:
        miss = [p for p in d.get('requires', []) if p not in ready]
        if miss:
            return False, 'waits for planned ' + ', '.join(miss)
    return True, ''


def weight(d, inp, recent):
    w = 1.0 + 0.9 * min(3, keyword_hits(d, inp['brief']))
    if inp['pace'] == 'crisp' and d['intensity'] <= 2:
        w *= 0.35
    if needs_of(d):  # it only fits because the film has the asset: use it
        w *= 1.5
    if d['id'] in recent:
        w *= 0.3
    return w


def weighted_choice(cands, weights, rng):
    total = sum(weights[c['id']] for c in cands)
    x = rng.random() * total
    for c in cands:
        x -= weights[c['id']]
        if x < 0:
            return c
    return cands[-1]


def option_problems(picks, pool, n, tone=None):
    """Why a set of options is not a good deal (empty when it is). Asks only for what the pool can give."""
    out = []
    k = len(picks)
    if len({p['camera']['motion'] for p in picks}) < k:
        out.append('two options share a camera motion')
    if len({p['signature']['family'] for p in picks}) < k:
        out.append('two options share a signature')
    want = min(k, 3, len({d['world']['space'] for d in pool}))
    if len({p['world']['space'] for p in picks}) < want:
        out.append(f'fewer than {want} kinds of space')
    want = min(k, 2, len({d['world']['light_kind'] for d in pool}))
    if len({p['world']['light_kind'] for p in picks}) < want:
        out.append('one kind of light')
    if len({p['story']['shape'] for p in picks}) < min(k, len({d['story']['shape'] for d in pool})):
        out.append('two options share a story shape')
    if len({p['lockup']['kind'] for p in picks}) < min(k, len({d['lockup']['kind'] for d in pool})):
        out.append('two options share a lockup')
    if tone:
        want = min(k, 2, len({tone(d) for d in pool}))
        if len({tone(p) for p in picks}) < want:
            out.append('one ground tone')
    if any(d['intensity'] >= 4 for d in pool) and not any(p['intensity'] >= 4 for p in picks):
        out.append('no rich direction')
    if sum(1 for p in picks if p['intensity'] <= 2) > max(1, n // 3):
        out.append('too many quiet directions')
    return out


def deal_options(pool, n, rng, weights, tone=None):
    """n directions that differ in motion, signature, story and lockup, span spaces, light and ground tones, hold
    one rich direction and few quiet ones. A weighted draw without replacement, redrawn up to 400 times on the
    same rng until the set is a good deal; then every good set of the pool, chosen by the product of its weights;
    if the pool holds none, the draw that breaks the fewest asks."""
    n = min(n, len(pool))
    best, best_bad = [], None
    for _ in range(400):
        rest, picks = list(pool), []
        while len(picks) < n:
            d = weighted_choice(rest, weights, rng)
            picks.append(d)
            rest.remove(d)
        bad = option_problems(picks, pool, n, tone)
        if not bad:
            return picks
        if best_bad is None or len(bad) < len(best_bad):
            best, best_bad = picks, bad
    good, ws = [], []
    for combo in itertools.combinations(pool, n):
        if not option_problems(list(combo), pool, n, tone):
            w = 1.0
            for c in combo:
                w *= weights[c['id']]
            good.append(list(combo))
            ws.append(w)
    if good:
        x = rng.random() * sum(ws)
        for combo, w in zip(good, ws):
            x -= w
            if x < 0:
                break
        rng.shuffle(combo)
        return combo
    return best


def palette_tone(d, seed, recipes):
    p = deal_slot(d, 'palette', seed)
    return tone_of(p, recipes) if p else None


def options_for(data, inp, seed, n, recent=(), avoid=(), keep=(), ready=None, allow_planned=False):
    """The options deck.py prints for this input: (options, pool, weights)."""
    dirs = data['directions']
    if ready is None and not allow_planned:
        ready = ready_names(data.get('primitives', {}), starter_src())
    gate = None if allow_planned else ready
    pool = [d for d in dirs if fits(d, inp['format'], inp['pace'], inp['have'], inp['seconds'], inp['brief'], gate)[0]
            and d['id'] not in avoid]
    weights = {d['id']: weight(d, inp, list(recent)) for d in pool}
    recipes = data.get('recipes', {})
    tones = {d['id']: palette_tone(d, seed, recipes) for d in pool}
    tone = None if 'palette' in keep else (lambda d: tones[d['id']])
    return (deal_options(pool, n, slot_rng(seed, 'options'), weights, tone) if pool else []), pool, weights


def derive_seed(inp):
    key = '|'.join([' '.join((inp['brief'] or '').lower().split()), inp['format'] or '', inp['pace'] or '',
                    ','.join(sorted(inp['have'])), f'{inp["seconds"]:g}' if inp['seconds'] else ''])
    return int(hashlib.sha256(key.encode('utf-8')).hexdigest()[:8], 16)


def slot_rng(seed, *parts):
    return random.Random(':'.join([str(seed)] + [str(p) for p in parts]))


def deal_slot(d, slot, seed, exclude=(), k=0):
    if slot == 'palette':
        opts = [p for p in d['palettes'] if p['id'] not in exclude]
    elif slot == 'type':
        opts = [t for t in d['type_options'] if t['id'] not in exclude]
    else:
        raise ValueError(slot)
    if not opts:
        return None
    return slot_rng(seed, d['id'], slot, k).choice(opts)


# ------------------------------------------------------------------------------------------------- history
def history_path():
    return os.environ.get('CINETIC_DECK_HISTORY') or os.path.join(os.path.expanduser('~'), '.cinetic', 'deck-history.json')


def read_history(enabled):
    if not enabled:
        return []
    try:
        with open(history_path(), encoding='utf-8') as fh:
            h = json.load(fh)
        return [x for x in h if isinstance(x, dict) and 'direction' in x] if isinstance(h, list) else []
    except (OSError, ValueError):
        return []


def write_history(enabled, entry):
    if not enabled:
        return
    try:
        h = read_history(True)
        h.insert(0, entry)
        os.makedirs(os.path.dirname(history_path()) or '.', exist_ok=True)
        with open(history_path(), 'w', encoding='utf-8') as fh:
            json.dump(h[:12], fh, indent=1)
    except OSError:
        pass


# ---------------------------------------------------------------------------------------------- the sheet
def skeleton_times(d, seconds, fps=60):
    out, t = [], 0.0
    for b in d['skeleton']:
        a, t = t, t + b['share'] * seconds
        out.append({'beat': b['beat'], 'from_s': round(a, 2), 'to_s': round(t, 2),
                    'from_f': int(round(a * fps)), 'to_f': int(round(t * fps)),
                    'picture': b['picture'], 'copy': b.get('copy'), 'signature': bool(b.get('signature'))})
    if out:
        out[-1]['to_s'], out[-1]['to_f'] = round(seconds, 2), int(round(seconds * fps))
    return out


def shortlist_tracks(d):
    path = next((p for p in SHORTLIST if os.path.isfile(p)), None)
    if not path:
        return []
    try:
        data = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError):
        return []
    lo, hi = d['music']['bpm']
    out = []
    for t in data.get('tracks', []) if isinstance(data, dict) else []:
        b = t.get('bpm') or {}
        rng = b.get('range') or ([b['value'], b['value']] if isinstance(b.get('value'), (int, float)) else None)
        half = b.get('half_time')
        if rng and (rng[0] <= hi + 2 and rng[1] >= lo - 2 or (half and half[0] <= hi + 2 and half[1] >= lo - 2)):
            bpm = f'{rng[0]:g}' if rng[0] == rng[1] else f'{rng[0]:g}-{rng[1]:g}'
            out.append({'title': t.get('title', '?'), 'bpm': bpm, 'mood': t.get('mood', '')})
    return out[:5]


def pick_energy(pace, d):
    if pace == 'crisp':
        return 'high' if d['intensity'] >= 4 else 'medium'
    return 'calm'


def make_sheet(d, inp, seed, options, keep, history_on, data, redraws=None, variant='main', palette=None, type_=None,
               waits=()):
    seconds = inp['seconds'] or DEFAULT_SECONDS.get(inp['format'] or 'launch', 20)
    if palette is None and 'palette' not in keep:
        palette = deal_slot(d, 'palette', seed)
    if type_ is None and 'type' not in keep:
        type_ = deal_slot(d, 'type', seed)
    recipes, methods = data.get('recipes', {}), data.get('methods', {})
    sig = d['signature'] if variant == 'main' else dict(d['signature_alt'], family=d['signature']['family'], cost=d['signature']['cost'],
                                                        elements=d['signature']['elements'])
    used = sorted({r['recipe'] for r in ([palette] if palette else d['palettes'])})
    return {
        'version': 2, 'tool': 'deck.py', 'seed': seed, 'input': inp,
        'options': [o for o in options], 'chosen_from_options': d['id'] in options,
        'direction': d, 'palette': palette, 'type': type_, 'keep': sorted(keep),
        'recipes': {r: recipes.get(r) for r in used},
        'methods': {m: methods.get(m, '') for m in d['world'].get('method', [])},
        'signature': sig, 'signature_variant': variant, 'waits_for': list(waits),
        'seconds': seconds, 'skeleton': skeleton_times(d, seconds),
        'pick': {'format': inp['format'] or 'launch', 'energy': pick_energy(inp['pace'], d), 'seconds': seconds,
                 'lean': d['techniques'], 'signature_ids': sig['techniques'], 'avoid': d['avoid_techniques']},
        'music_tracks': shortlist_tracks(d),
        'idea_sentence': '', 'competitor_test': '',
        'redraws': redraws or [], 'history': history_on,
    }


def _cmd(inp, seed, extra):
    parts = ['python3 scripts/deck.py']
    if inp['brief']:
        parts.append(f'--brief "{inp["brief"]}"')
    for k in ('format', 'pace'):
        if inp[k]:
            parts.append(f'--{k} {inp[k]}')
    if inp['have']:
        parts.append(f'--have {",".join(inp["have"])}')
    if inp['seconds']:
        parts.append(f'--seconds {inp["seconds"]:g}')
    parts.append(f'--seed {seed}')
    return ' '.join(parts + extra)


def _fit_line(d):
    f, m = d['fit'], d['music']
    need = [HAVE_TEXT[k] for k in needs_of(d)]
    subj = ' · only when the brief names its subject' if f.get('keywords_required') else ''
    return (f'Fits {", ".join(f["formats"])} · {f["seconds"][0]}-{f["seconds"][1]} s · pace {"/".join(f["paces"])} · '
            f'{("needs " + " and ".join(need)) if need else "no assets needed"}{subj} · music {m["mode"]}, '
            f'{m["bpm"][0]}-{m["bpm"][1]} BPM, {m["ending"]} ending')


def _tag(d):
    return (f'intensity {d["intensity"]}/5 · {SPACES[d["world"]["space"]]} · light {d["world"]["light_kind"]} · '
            f'camera {d["camera"]["motion"]} · {d["cuts"]["kind"]} cuts · story {d["story"]["shape"]} · '
            f'lockup {d["lockup"]["kind"]}')


def _lcs(v):
    return f'L {v[0]:.2f} C {v[1]:.3f}'


def _recipe_note(name, recipes):
    r = recipes.get(name) or {}
    if r.get('status') == 'planned':
        return (f' (not in lib/look.ts yet: ground {_lcs(r["ground"])}, ink {_lcs(r["ink"])}, accent {_lcs(r["accent"])} at '
                f'the accent hue; {r["notes"]}. Write the tokens by hand and check them with palette.py --paper)')
    return ' (lib/look.ts RECIPE)'


def render_options(opts, inp, seed, recent, pool_size, derived, data, keep):
    recipes = data.get('recipes', {})
    out = [f'<!-- {_cmd(inp, seed, ["--options", str(len(opts))])} -->',
           f'# {len(opts)} directions for this brief (seed {seed}{", from the brief" if derived else ""})', '',
           'Hold each one against your inventory (what the name means, the non-obvious behaviour, the product\'s own '
           'objects): which can carry something only this product has? Choose that one, not the most familiar, and '
           'write one line on why. Then deal it in full with the same command plus `--direction <id>`:', '',
           f'    {_cmd(inp, seed, ["--direction", "<id>"])}', '']
    for i, d in enumerate(opts, 1):
        pal = None if 'palette' in keep else deal_slot(d, 'palette', seed)
        pline = (f'**Palette.** `{pal["id"]}` ({tone_of(pal, recipes)} ground, recipe `{pal["recipe"]}`): {pal["notes"]}.'
                 if pal else '**Palette.** the brand\'s (`--keep palette`).')
        out += [f'## {i}. `{d["id"]}`: {d["name"]}', f'*{_tag(d)}*', '', f'**Idea.** {d["idea"]}',
                f'**Story.** {d["story"]["line"]}',
                f'**Signature.** {d["signature"]["name"]}. {d["signature"]["shot"]}',
                f'**World.** {d["world"]["set"].split(". ")[0].rstrip(".")}. Light: {d["world"]["light"]}',
                pline, f'**Camera.** {d["camera"]["animator"]}', f'**Lockup.** {d["lockup"]["shot"]}',
                f'**Fit.** {_fit_line(d)}', f'**Idea sentence.** {d["idea_sentences"][0]}', '']
    if recent:
        out.append(f'(Directions of your recent films, dealt less often: {", ".join(recent)}.)')
    out.append(f'({pool_size} directions fit this brief; `deck.py --list` with the same filters shows them all.)')
    return '\n'.join(out) + '\n'


def _palette_lines(p, recipes):
    pr = p['proportions']
    return [f'- **{p["id"]}** ({tone_of(p, recipes)} ground): recipe `{p["recipe"]}`{_recipe_note(p["recipe"], recipes)}, accent from '
            f'{" or ".join(p["accent"])}; ground {pr["ground"]} % · ink {pr["ink"]} % · accent {pr["accent"]} % of the frame. '
            f'{p["notes"][:1].upper() + p["notes"][1:]}.']


def _type_lines(t):
    return [f'- **{t["id"]}**: {t["sans"]}, weights {t["weights"][0]}/{t["weights"][1]}, {t["case"]}; {t["notes"]}.']


def _prims(names, cat):
    out = []
    for n in names:
        p = cat.get(n, {})
        out.append(f'`{n}`' + (' (planned)' if p.get('status') == 'planned' else ''))
    return ', '.join(out)


def _techs(ids, library):
    if not library:
        return ', '.join(f'`{t}`' for t in ids)
    return ', '.join(f'`{t}` ({library[t]["name"]})' if t in library else f'`{t}`' for t in ids)


def render_sheet(sh, data, library):
    cat, floor = data.get('primitives', {}), data.get('floor', {})
    recipes = dict(data.get('recipes', {}), **{k: v for k, v in (sh.get('recipes') or {}).items() if v})
    methods = dict(data.get('methods', {}), **(sh.get('methods') or {}))
    d, inp, sig = sh['direction'], sh['input'], sh['signature']
    w, cam, cuts, ty, mus, lk, st = d['world'], d['camera'], d['cuts'], d['type'], d['music'], d['lockup'], d['story']
    out = [f'<!-- {_cmd(inp, sh["seed"], ["--direction", d["id"]])} -->',
           f'# Direction: {d["name"]} (`{d["id"]}`)', '',
           f'**The direction\'s idea.** {d["idea"]}', f'*{_tag(d)} · {_fit_line(d)}*', '']
    if not sh['chosen_from_options']:
        out += [f'(Chosen outside the dealt options {", ".join(sh["options"]) or "(none dealt)"}: say why in the treatment.)', '']
    if sh.get('waits_for'):
        out += [f'(This direction\'s signature waits for planned {", ".join(sh["waits_for"])}: build them inside the film '
                'from the description below, or deal another direction.)', '']
    out += ['## 1. The idea sentence (write it before anything else)', '',
            '> In this film, **[something only this product has]** becomes **[the device this direction calls for]**.', '',
            'Templates for this direction:']
    out += [f'- {s}' for s in d['idea_sentences']]
    out += ['', 'Fill the first blank from the inventory (what the name means, the non-obvious behaviour, the product\'s '
                'own objects), never from the category. **Competitor test:** put the nearest competitor in the sentence. '
                'If it still works, the idea belongs to the category; go back to the inventory. Write the sentence and '
                'the test into TREATMENT.md (and into `idea_sentence` / `competitor_test` in out/direction.json).', '',
            '## 2. The world', '',
            f'- **Space:** {SPACES[w["space"]]}. {w["set"]}', f'- **Depth planes:** {w["planes"]}.',
            f'- **Light ({w["light_kind"]}: {LIGHT_KINDS[w["light_kind"]]}):** {w["light"]}',
            f'- **How the light is built:** {w["light_build"]}', f'- **Texture:** {w["texture"]}.']
    if sh['palette']:
        out += ['- **Palette (dealt):**'] + ['  ' + x for x in _palette_lines(sh['palette'], recipes)]
    else:
        out += ['- **Palette:** the brand fixes it (`--keep palette`). Map its colours onto the roles below: '
                'ground, ink, one accent; keep the proportions of a recipe this direction uses:']
        out += ['  ' + x for p in d['palettes'] for x in _palette_lines(p, recipes)]
    if sh['type']:
        out += ['- **Type (dealt):**'] + ['  ' + x for x in _type_lines(sh['type'])]
    else:
        out += ['- **Type:** the brand fixes it (`--keep type`); set it in the roles of §4.']
    out += ['', '## 3. Camera and cuts', '',
            f'- **Main animator:** {cam["animator"]}', f'- **In a shot:** {cam["in_shot"]}',
            f'- **Between shots:** {cam["between"]}',
            f'- **Cut grammar ({cuts["kind"]}):** {cuts["grammar"]} At least {int(round(cuts["carried_min"] * 100))} % of '
            f'seams carried. Seam kinds to declare in `SEAMS`: {", ".join(cuts["seams"])}.',
            f'- **Sound at the cuts:** {cuts["on_sound"]}',
            f'- **Transition vocabulary:** {_prims(d["transitions"], cat)}.', '',
            '## 4. Type behaviour', '',
            f'- **Line system:** {" and ".join(ty["modes"])} chains; re-centre `{ty["recentre"]}`; cadence `{ty["cadence"]}`; '
            f'roles {", ".join(ty["roles"])}.', f'- **Scale contrast:** {ty["scale_contrast"]}',
            f'- **Behaviour:** {ty["behaviour"]}',
            '- Copy stays calm: fragments of 1-4 words, one at a time, picture between them ("here is the newest" -> '
            'the animation -> the rest).', '',
            f'## 5. The story shape: {st["shape"]}', '', st['line'], '',
            f'## 6. The signature shot: {sig["name"]}' + (' (the alternative)' if sh['signature_variant'] != 'main' else ''), '',
            sig['shot'], '', f'**How to build it in Chromium:** {sig["build"]}', '',
            f'Budget: about {sig.get("elements", "?")} animated nodes, a {sig.get("cost", "light")} shot. Leans on '
            f'{_prims(sig["primitives"], cat)} and {_techs(sig["techniques"], library)}.', '',
            'One signature shot per film: it happens once, on the beat marked * below. The film may echo it (smaller, at '
            'the open or inside the lockup), never repeat it. It is the moment a viewer asks how it was made, so it gets '
            'the most build time and the cleanest frames.', '',
            f'## 7. The lockup ({lk["kind"]}: {LOCKUP_KINDS[lk["kind"]]})', '', lk['shot'], '',
            f'**Build:** {lk["build"]} Leans on {_prims(lk["primitives"], cat)}'
            + (f' and {_techs(lk["techniques"], library)}' if lk.get('techniques') else '') + '.', '',
            f'## 8. Beat skeleton ({sh["seconds"]:g} s)', '', '| # | beat | time | picture | copy |', '|---|---|---|---|---|']
    words = 0
    for i, b in enumerate(sh['skeleton'], 1):
        c = b['copy']
        cs = f'{c["words"][0]}-{c["words"][1]} words: {c["what"]}' if c and c['words'][0] != c['words'][1] else (
            f'{c["words"][0]} word(s): {c["what"]}' if c else '(picture only)')
        words += c['words'][1] if c else 0
        out.append(f'| {i}{" *" if b["signature"] else ""} | {b["beat"]} | {b["from_s"]:.1f}-{b["to_s"]:.1f} s '
                   f'(f{b["from_f"]}-f{b["to_f"]} @60) | {b["picture"]} | {cs} |')
    out += ['', f'At most {words} words of copy in all. Retell every beat in the product\'s own objects; the beats are the '
                'shape, not the content.', '',
            '## 9. The picture never rests', '',
            f'- **Life inside a shot:** {cam["in_shot"]}',
            f'- **The floor against a flat film** (checked on renders): the camera or the ground moves on at least '
            f'{int(floor.get("moving_body_frames", .9) * 100)} % of body frames; at least two depth planes move at different '
            f'rates in at least {int(floor.get("depth_planes_shot_share", .5) * 100)} % of shots; at least '
            f'{int(floor.get("carried_seams_min", .4) * 100)} % of seams are carried; a signature device at least every '
            f'{floor.get("signature_device_every_s", 3)} s; {floor.get("light_events_per_act", 1)} light event per act; a '
            f'clear scale change on at least {int(floor.get("scale_contrast_cut_share", .3) * 100)} % of cuts.', '',
            '## 10. Music', '',
            f'- {mus["mode"]}: {mus["bpm"][0]}-{mus["bpm"][1]} BPM, {mus["feel"]}; a `{mus["ending"]}` ending.']
    if mus['mode'] == 'either':
        out.append('- A calm effects-only film suits this direction too (no track, the earshot kit, -18 LUFS).')
    if sh['music_tracks']:
        out.append('- On the shortlist in this tempo range: ' + '; '.join(f'{t["title"]} ({t["bpm"]} BPM: {t["mood"]})' for t in sh['music_tracks']) + '.')
    out += ['', '## 11. Library and primitives', '',
            f'- **Primitives:** {_prims(d["primitives"], cat)}. "planned" ones are not in the starter yet: build the move in '
            'the act from the house curves until they land.',
            f'- **Techniques this direction leans on:** {_techs(d["techniques"], library)}.',
            f'- **Techniques that fight it:** {_techs(d["avoid_techniques"], library)}.', '']
    if w.get('method'):
        out += ['## 12. Build methods this world uses', '']
        out += [f'- **{m}:** {methods.get(m, "")}' for m in w['method']]
        out.append('')
    out += ['## 13. Avoid', '']
    out += [f'- {a}' for a in d['avoid']]
    if sh['redraws']:
        out += ['', '## Redraws', '']
        out += [f'- {r["slot"]}: {r["from"]} -> {r["to"]} ({r["reason"]})' for r in sh['redraws']]
    p = sh['pick']
    has_dir = os.path.isfile(PICK) and '--direction' in open(PICK, encoding='utf-8').read()
    pick_cmd = (f'python3 scripts/pick.py --format {p["format"]} --energy {p["energy"]} --seconds {p["seconds"]:g} '
                + ('--direction out/direction.json ' if has_dir else '') + '--json out/qa/picks.json')
    out += ['', '## Next', '',
            '1. Write the idea sentence and the competitor test into TREATMENT.md, under the direction\'s name and seed.',
            f'2. Draw the techniques: `{pick_cmd}`.' + ('' if has_dir else
               ' Retell every pick in this direction\'s world and camera; a pick that fights the direction counts as '
               'fighting the concept (reroll it with `--category <cat> --exclude <id>`, at most twice).'),
            '3. Write the treatment on the skeleton above: the beats, the device path, the signature beat and the lockup.',
            '4. Redraw a slot only for a stated reason: `python3 scripts/deck.py --redraw palette|type|signature|direction '
            '--reason "..."`.']
    return '\n'.join(out) + '\n'


def render_entry(d, data, library, ready=None):
    cat, recipes = data.get('primitives', {}), data.get('recipes', {})
    w = d['world']
    out = [f'# {d["name"]} (`{d["id"]}`)', f'*{_tag(d)}*', '', d['idea'], '', f'*{_fit_line(d)}*', '']
    if ready is not None and [p for p in d.get('requires', []) if p not in ready]:
        out += [f'(Not dealt yet: its signature waits for planned {", ".join(p for p in d["requires"] if p not in ready)}.)', '']
    out += [f'**Story ({d["story"]["shape"]}).** {d["story"]["line"]}', '',
            f'**World.** {SPACES[w["space"]]}. {w["set"]} Planes: {w["planes"]}. '
            f'Light ({w["light_kind"]}): {w["light"]} Built: {w["light_build"]} Texture: {w["texture"]}.', '', '**Palettes.**']
    out += [x for p in d['palettes'] for x in _palette_lines(p, recipes)]
    out += ['', '**Type.**'] + [x for t in d['type_options'] for x in _type_lines(t)]
    c, k, ty, lk = d['camera'], d['cuts'], d['type'], d['lockup']
    out += ['', f'**Camera.** {c["animator"]} In a shot: {c["in_shot"]} Between shots: {c["between"]}',
            f'**Cuts ({k["kind"]}, at least {int(round(k["carried_min"] * 100))} % carried; {", ".join(k["seams"])}).** {k["grammar"]} {k["on_sound"]}',
            f'**Type behaviour.** {" and ".join(ty["modes"])}, re-centre {ty["recentre"]}, cadence {ty["cadence"]}, roles '
            f'{", ".join(ty["roles"])}. {ty["scale_contrast"]} {ty["behaviour"]}',
            f'**Transitions.** {_prims(d["transitions"], cat)}', '',
            f'**Signature: {d["signature"]["name"]}.** {d["signature"]["shot"]}',
            f'Build ({d["signature"]["elements"]} animated nodes, {d["signature"]["cost"]}): {d["signature"]["build"]}',
            f'**Alternative: {d["signature_alt"]["name"]}.** {d["signature_alt"]["shot"]} Build: {d["signature_alt"]["build"]}',
            f'**Lockup ({lk["kind"]}).** {lk["shot"]} Build: {lk["build"]}', '',
            '**Idea sentences.**'] + [f'- {s}' for s in d['idea_sentences']]
    out += ['', f'**Music.** {d["music"]["mode"]}, {d["music"]["bpm"][0]}-{d["music"]["bpm"][1]} BPM, {d["music"]["feel"]}; {d["music"]["ending"]} ending.',
            f'**Primitives.** {_prims(d["primitives"], cat)}', f'**Techniques.** {_techs(d["techniques"], library)}',
            f'**Fights it.** {_techs(d["avoid_techniques"], library)}', '', '**Skeleton.**']
    for b in d['skeleton']:
        cpy = f'{b["copy"]["words"][0]}-{b["copy"]["words"][1]} words: {b["copy"]["what"]}' if b.get('copy') else 'picture only'
        out.append(f'- {b["beat"]} ({int(round(b["share"] * 100))} %){" *" if b.get("signature") else ""}: {b["picture"]} [{cpy}]')
    out += ['', '**Avoid.**'] + [f'- {a}' for a in d['avoid']]
    return '\n'.join(out) + '\n'


def write_sheet(sh, outdir, data, library):
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, 'direction.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(sh, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    md = render_sheet(sh, data, library)
    with open(os.path.join(outdir, 'DIRECTION.md'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(md)
    return md


# ---------------------------------------------------------------------------------------------------- main
def parse_list(value, allowed, flag):
    items = [x.strip().lower() for x in (value or '').split(',') if x.strip() and x.strip().lower() != 'none']
    bad = [x for x in items if x not in allowed]
    if bad:
        fail(f'{flag}: unknown {", ".join(bad)}; choose from {", ".join(allowed)}')
    return sorted(set(items))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    ap.add_argument('--brief', default='', help='the product and the film in one line')
    ap.add_argument('--format', choices=FORMATS, help='the film format (the same names as pick.py)')
    ap.add_argument('--pace', choices=PACES, help='calm (the default) or crisp')
    ap.add_argument('--have', default='', help='what really exists: ui, footage, audio, number, name (comma-separated)')
    ap.add_argument('--seconds', type=float, help='the film length in seconds')
    ap.add_argument('--seed', type=int, help='reproduce a deal (default: derived from the brief)')
    ap.add_argument('--options', type=int, metavar='N', help='deal N directions to choose from (2-5; 3 is the house number)')
    ap.add_argument('--direction', metavar='ID', help='deal the full sheet for this direction; writes out/direction.json and out/DIRECTION.md')
    ap.add_argument('--keep', default='', help='palette,type: the brand fixes these; the sheet deals the rest')
    ap.add_argument('--avoid', default='', help='direction ids never to deal (comma-separated)')
    ap.add_argument('--redraw', choices=SLOTS, help='re-deal one slot of the saved sheet (needs --reason)')
    ap.add_argument('--reason', default='', help='why the slot must change (required with --redraw)')
    ap.add_argument('--show', nargs='?', const='', metavar='ID', help='a direction in full; without an id, reprint the saved sheet')
    ap.add_argument('--list', action='store_true', help='list the directions (filtered by --format, --pace, --have, --seconds)')
    ap.add_argument('--validate', action='store_true', help='check the deck and exit')
    ap.add_argument('--strict', action='store_true', help='with --validate: the library, the starter source and lib/look.ts must all be found')
    ap.add_argument('--allow-planned', action='store_true', help='also deal directions whose signature waits for a planned primitive')
    ap.add_argument('--out', default='out', help='where the sheet is written (default out/)')
    ap.add_argument('--deck', default=DEFAULT_DECK, help='the directions json (default assets/directions/directions.json)')
    ap.add_argument('--library', default=DEFAULT_LIBRARY, help='the technique library (default assets/library/techniques.json)')
    ap.add_argument('--no-history', action='store_true', help='neither read nor write the deal history')
    a = ap.parse_args()

    data = read_json(a.deck, 'the deck')
    library = load_library(a.library)
    cat = data.get('primitives', {}) if isinstance(data, dict) else {}
    src = starter_src()

    if a.validate:
        errors, notes = validate(data, library, src, a.strict)
        for n in notes:
            print(f'note: {n}')
        if errors:
            fail('invalid deck:\n  ' + '\n  '.join(errors[:60]) + (f'\n  ... and {len(errors) - 60} more' if len(errors) > 60 else ''))
        dirs, recipes = data['directions'], data['recipes']
        ready = ready_names(cat, src)
        sp = ', '.join(f'{s} {sum(1 for d in dirs if d["world"]["space"] == s)}' for s in SPACES)
        it = ', '.join(f'{i}: {sum(1 for d in dirs if d["intensity"] == i)}' for i in range(1, 6))
        li = ', '.join(f'{k} {sum(1 for d in dirs if d["world"]["light_kind"] == k)}' for k in LIGHT_KINDS)
        pals = [p for d in dirs for p in d['palettes']]
        tn = ', '.join(f'{t} {sum(1 for p in pals if tone_of(p, recipes) == t) * 100 // max(1, len(pals))} %' for t in TONES)
        st = {s: sum(1 for p in cat.values() if p.get('status') == s) for s in STATUSES}
        rs = {s: sum(1 for r in recipes.values() if r.get('status') == s) for s in STATUSES}
        techs = {t for d in dirs for t in d['techniques']}
        blocked = [d['id'] for d in dirs if [p for p in d.get('requires', []) if p not in ready]]
        print(f'deck.py: {len(dirs)} directions valid, {len(dirs) - len(blocked)} dealable now'
              f'{" (" + ", ".join(blocked) + " wait for planned primitives)" if blocked else ""}; space {sp}; intensity {it}; '
              f'light {li}; {len({d["story"]["shape"] for d in dirs})} story shapes; {len({d["lockup"]["kind"] for d in dirs})} '
              f'lockup kinds; palette grounds {tn}; recipes {rs["built"]} built, {rs["planned"]} planned; primitives '
              f'{st["built"]} built, {st["planned"]} planned; {len(techs)} library techniques leaned on')
        return 0

    errors, _ = validate(data, library, None, False)
    if errors:
        fail('invalid deck (run --validate):\n  ' + '\n  '.join(errors[:20]))
    dirs = data['directions']
    by_id = {d['id']: d for d in dirs}
    ready = ready_names(cat, src)
    gate = None if a.allow_planned else ready

    if a.show is not None and a.show != '':
        if a.show not in by_id:
            fail(f'no direction {a.show!r} (run --list)', 1)
        print(render_entry(by_id[a.show], data, library, ready), end='')
        return 0
    saved_path = os.path.join(a.out, 'direction.json')
    if a.show == '':
        if not os.path.isfile(saved_path):
            fail(f'no saved sheet at {saved_path}: deal one with --direction <id>', 1)
        print(render_sheet(read_json(saved_path, 'the saved sheet'), data, library), end='')
        return 0

    have = parse_list(a.have, HAVE, '--have')
    keep = parse_list(a.keep, KEEP, '--keep')
    avoid = [x.strip() for x in a.avoid.split(',') if x.strip()]
    for x in avoid:
        if x not in by_id:
            fail(f'--avoid: no direction {x!r}')

    if a.list:
        for d in dirs:
            ok, why = fits(d, a.format, a.pace, have, a.seconds, a.brief, ready)
            print(f'{d["id"]:<16} {d["intensity"]}  {d["world"]["space"]:<12} {d["camera"]["motion"]:<7} {d["cuts"]["kind"]:<9} '
                  f'{d["world"]["light_kind"]:<11} {d["name"]:<20} {"" if ok else "(does not fit: " + why + ") "}{d["idea"]}')
        return 0

    if a.redraw:
        if not os.path.isfile(saved_path):
            fail(f'nothing to redraw: no saved sheet at {saved_path}', 1)
        if len(a.reason.split()) < 3:
            fail('--redraw needs --reason "<what in the brand, the assets or the idea it contradicts>" (a few words at least)')
        sh = read_json(saved_path, 'the saved sheet')
        d = by_id.get(sh['direction']['id'])
        if not d:
            fail(f'the saved direction {sh["direction"]["id"]!r} is no longer in the deck', 1)
        done = [r for r in sh['redraws'] if r['slot'] == a.redraw]
        if len(done) >= MAX_REDRAWS:
            fail(f'{a.redraw} has been redrawn {MAX_REDRAWS} times; keep it, or drop the element with a written reason', 1)
        inp, seed, k = sh['input'], sh['seed'], len(done) + 1
        if a.redraw in ('palette', 'type'):
            if a.redraw in sh['keep']:
                fail(f'the brand fixes the {a.redraw} (--keep): there is nothing to redraw', 1)
            cur = sh[a.redraw]['id']
            used = [cur] + [r['from'] for r in done]
            new = deal_slot(d, a.redraw, seed, exclude=used, k=k)
            if not new:
                fail(f'this direction has no other {a.redraw} to deal; keep {cur}', 1)
            sh[a.redraw] = new
            if a.redraw == 'palette':
                sh['recipes'] = {new['recipe']: data['recipes'].get(new['recipe'])}
            sh['redraws'].append({'slot': a.redraw, 'from': cur, 'to': new['id'], 'reason': a.reason})
        elif a.redraw == 'signature':
            cur = sh['signature_variant']
            nxt = 'alt' if cur == 'main' else 'main'
            new = make_sheet(d, inp, seed, sh['options'], set(sh['keep']), sh['history'], data, sh['redraws'], nxt,
                             sh['palette'], sh['type'], sh.get('waits_for', ()))
            new['idea_sentence'], new['competitor_test'] = sh.get('idea_sentence', ''), sh.get('competitor_test', '')
            sh = new
            sh['redraws'].append({'slot': 'signature', 'from': cur, 'to': nxt, 'reason': a.reason})
        else:  # direction
            held = [sh['direction']['id']] + [r['from'] for r in sh['redraws'] if r['slot'] == 'direction']
            pool = [x for x in dirs if fits(x, inp['format'], inp['pace'], inp['have'], inp['seconds'], inp['brief'], gate)[0]
                    and x['id'] not in held]
            if not pool:
                fail('no other direction fits this brief; keep the one you have', 1)
            recent = [h['direction'] for h in read_history(sh['history'])][:4]
            wts = {x['id']: weight(x, inp, recent) for x in pool}
            new_d = weighted_choice(pool, wts, slot_rng(seed, 'direction', 'redraw', k))
            log = sh['redraws'] + [{'slot': 'direction', 'from': d['id'], 'to': new_d['id'], 'reason': a.reason}]
            waits = [p for p in new_d.get('requires', []) if p not in ready]
            sh = make_sheet(new_d, inp, seed, sh['options'], set(sh['keep']), sh['history'], data, log, waits=waits)
            write_history(sh['history'], {'direction': new_d['id'], 'format': inp['format']})
        md = write_sheet(sh, a.out, data, library)
        print(md, end='')
        return 0

    inp = {'brief': a.brief, 'format': a.format, 'pace': a.pace or 'calm', 'have': have, 'seconds': a.seconds, 'avoid': avoid}
    derived = a.seed is None
    seed = derive_seed(inp) if derived else a.seed
    history_on = not a.no_history
    recent = [h['direction'] for h in read_history(history_on)][:4]
    if a.options is not None and not 2 <= a.options <= 5:
        fail('--options takes 2-5')
    opts, pool, weights = options_for(data, inp, seed, a.options or 3, recent, avoid, keep, ready, a.allow_planned)
    if not pool and not a.direction:
        fail('no direction fits these filters (try another --format, --pace or --seconds, or say what --have)', 1)

    if a.options is not None:
        print(render_options(opts, inp, seed, [r for r in recent if r in weights], len(pool), derived, data, keep), end='')
        return 0

    if not a.direction:
        fail('say what to do: --options 3 to deal directions, --direction <id> for the sheet, --list, --show or --validate')
    if a.direction not in by_id:
        fail(f'no direction {a.direction!r} (run --list)', 1)
    d = by_id[a.direction]
    ok, why = fits(d, a.format, inp['pace'], have, a.seconds, a.brief, gate)
    if not ok:
        hint = ' (or pass --allow-planned and build them inside the film)' if why.startswith('waits for') else ''
        fail(f'{a.direction} does not fit this brief ({why}){hint}; deal options that do with --options 3', 1)
    options = [o['id'] for o in opts]
    waits = [p for p in d.get('requires', []) if p not in ready]
    sh = make_sheet(d, inp, seed, options, set(keep), history_on, data, waits=waits)
    md = write_sheet(sh, a.out, data, library)
    write_history(history_on, {'direction': d['id'], 'format': a.format})
    print(md, end='')
    return 0


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):  # a Windows console is cp1252
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    try:
        sys.exit(main())
    except BrokenPipeError:
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        sys.exit(0)
