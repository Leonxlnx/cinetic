#!/usr/bin/env python3
"""Deal a film direction from the deck, so every film gets its own visual idea.

Left alone, an agent makes the same film every time: keyword fragments on a plain ground, a push-in, an
end card. deck.py deals three complete art directions from the decks in assets/directions/ that fit
the brief (format, pace, the assets that exist), each with its own space (flat, layered, perspective
planes or a lit relief), light, camera language, cut grammar, type behaviour, story shape, lockup and
one signature shot. directions.json is the main deck; every other deck file there adds its directions,
primitives and methods to the deal: imagery.json holds the imagery-led directions, where real
photographs and footage are the world. Those are opt-in: they fit only with --have photos or footage
(pictures worth building on, or the product's own), because sloppy stock is worse than none. The deal
favours type-led directions (the line itself is the shot: built word by word, a rolling slot word, the
name at giant scale) x4 and graphic ones (code-made on clean grounds) x1.5, since text animation is the
main event of a cinetic film and graphic effects surround it. The agent chooses the one that can carry
something only this product has (the idea sentence and the competitor test), then deals the full sheet
for it. The sheet is the art direction for the film: the script, the treatment, the technique draw
(pick.py) and the build follow it.

Where it sits: after the brief (Step 0) and the inventory, before the script, the treatment and pick.py
(Step 1).

Usage:
  python3 scripts/deck.py --brief "<one line>" --format launch [--have ui,input]   # one direction dealt: the sheet
  python3 scripts/deck.py --brief "<one line>" --format launch --pace calm [--have ui,input] --options 3
  python3 scripts/deck.py --brief "<one line>" --format launch --have ui,photos --options 3  # pictures worth showing
  python3 scripts/deck.py --brief "<one line>" --format launch --pace calm --direction <id>  # the sheet
  python3 scripts/deck.py --brief "<one line>" --format update --changes 3 --options 3       # a short update film
  python3 scripts/deck.py ... --direction <id> --brand brand/brand.json  # roles mapped onto the brand's colours
  python3 scripts/deck.py --redraw palette --reason "the brand's own green fights the dealt blue"
  python3 scripts/deck.py --show                 # reprint the saved sheet (out/DIRECTION.md)
  python3 scripts/deck.py --show <id>            # one direction in full, with every variant
  python3 scripts/deck.py --list [--format vertical --pace crisp --have ui]
  python3 scripts/deck.py --validate [--strict]  # schema, library ids, primitives, distinctness, bans
  python3 scripts/deck.py ... --no-imagery       # leave out the imagery-led directions
  python3 scripts/deck.py --creative --brief "<one line>" [--have logos,number]  # only the creative elements

Every sheet also deals the film's creative elements (two or three finished devices from the starter's fx/creative,
each a whole beat with the product inside it), at random: seeded by the film's name, the direction and the film
history, never the set of a recent film, at most one shared with the last, weighted toward the devices that tell the
direction's story shape and the brief's own words (a tap, the old way, many of something). They go into src/dealt.ts
(creative, reserve) and the sheet's last section; --have logos (the products it works with) and number (a real
figure) open the devices that need them, and photos opens the photo devices only with five pictures or more
(--photos N, else the images counted in the project's public/).

In a template project (its src/deal.ts reads the deck's deal: launch-simple), deck.py never picks for you: run without
--direction, it deals THREE directions, each with what the template would play (its world, its hero shots, the type
pairing, the creative elements, the end card), into out/OPTIONS.md; hold them against the product and pick the one
that fits it, with the reason in one line:
  python3 scripts/deck.py --brief "<one line>" --format launch --have ui --direction <id> --why "<why it fits the product>"
The reason heads out/DIRECTION.md; the sheet deals the film's type pairing (scripts/faces.json pairs, at random, never
the last two films' pairing) and sets it with scripts/type-deal.ts --pair, and writes src/dealt.ts. A template whose
`ground` slot holds worlds (fx/world: launch-simple) takes the world that keeps the direction's ground family's tone and
light (a photograph first for an imagery-led direction; a plate world needs its picture: assets.mjs plate), and a
template with hero shots (src/deal.ts HERO_META) gets three or more of them: a seeded, recency-weighted shuffle weighted
by the brief's words, the world's tone (a dark-glass shot on a night world), the direction and what the film has (a ring
of pictures with eight pictures or --have photos, the 3D mark with the brand's own SVG), at least one picture shot, one
of a family, never the last film's set; they go into src/dealt.ts (hero, heroReserve) and the sheet's last sections.

  --have      what really exists (comma-separated): ui (the product has an interface to show, built in
              code from the real product), input (it is used by typing or pointing: a text field, a prompt,
              a command line, a pointer; pick.py deals typing and cursor devices only then), photos
              (high-quality pictures that carry the idea: the product's own photography or screens, or pictures
              the user supplies; it opens the imagery-led directions), footage (real video supplied;
              it opens them too), audio (a real recorded clip the product makes or handles: a voice, a call, a
              sound), number (one honest number the product owns and can back), name (the product's name is
              a real word whose meaning the film can use). Leave it out when there is none. Directions built
              on an asset only fit when it exists, and the deal leans hard toward directions that use what
              exists and toward the subjects the brief names (each brief word a direction knows triples
              its chance, up to three).
  --format    launch (15-45 s, the main case), update (8-20 s: "vX is out" with 2-4 changes), feature,
              loop, sting, walkthrough or vertical. An update film is a hook on the version or the mark,
              2-4 changes each shown as a product moment (never a list), one payoff and the end card with
              the version, one short sentence a change; its beats come from the direction's own update skeleton,
              and the version counts as the one number the film owns (--have number).
  --changes   how many changes an update film shows (2-4, default 3): one beat each.
  --brand     brand/brand.json from scripts/brand.py: the dealt palette's ground / ink / accent roles and
              proportions are mapped onto the brand's own colours (a brand colour where one sits near
              the recipe's lightness, else the recipe on the brand's own grey, never at the accent's hue),
              checked for contrast; the brand's typeface takes the dealt weights and case.
  --keep      palette,type when the brand already fixes them: the sheet deals the rest, and you map the
              brand's values onto the dealt roles.
  --seconds   the film's length: filters directions by their length range and times the beat skeleton.
  --seed      reproduce a deal. Without it the seed comes from the brief, format, pace and assets, so
              the same brief always deals the same three: rerunning is not a way to fish for another deal.
  --allow-planned  deal or sheet a direction whose signature still waits for a planned primitive (you
              build that primitive inside the film).
  --no-imagery  deal no imagery-led direction even with --have photos or footage. With photos or footage
              and without it, a deal holds at least one imagery-led direction when one fits, and its sheet
              carries the picture brief (what to list from the subject, the queries, how many pictures, the
              one grade, what to refuse) for scripts/assets.mjs.
  --deck      a deck file (only that file), or a folder whose *.json decks are merged (default: the
              skill's assets/directions/, or scripts/directions/ in a film project).

Without --options or --direction, one direction is dealt from the brief and the history (the first of the
three options that repeats no signature and no lockup of the last three films you made) and its sheet written:
the three-option deal is there when you want to choose. A direction that repeats the signature family or the
lockup kind of one of the last three films you made (the film history film-diff.mjs --record writes,
~/.cinetic/film-history.json or CINETIC_FILM_HISTORY) is refused unless --repeat signature,end says the brief
asks for it; the ground family is never one of theirs while another fits.

The deal is weighted toward directions whose keywords appear in the brief and that use an asset the film
really has, away from the directions of your last films (a small history in ~/.cinetic/deck-history.json,
or CINETIC_DECK_HISTORY; --no-history turns it off; --recent ids names them instead, and every printed
command carries the --recent it was dealt with, so it reproduces the deal). The three options always differ in camera motion,
signature, story shape and lockup, span three kinds of space and two kinds of light, deal palettes of at
least two ground tones, and include at least one rich, high-intensity direction and, when --have opens
them, one imagery-led direction beside one built world.

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
import math
import os
import random
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..'))


def _first(paths):
    return next((p for p in paths if os.path.isfile(p)), paths[0])


# The skill keeps its data in assets/; a film project made by new-film.sh keeps copies next to its scripts.
DEFAULT_DECK = _first([os.path.join(SKILL, 'assets', 'directions', 'directions.json'),
                       os.path.join(HERE, 'directions', 'directions.json')])
MAIN_DECK = 'directions.json'  # the deck that also holds the recipes, the defaults and the floor
DEFAULT_LIBRARY = _first([os.path.join(SKILL, 'assets', 'library', 'techniques.json'),
                          os.path.join(HERE, 'library', 'techniques.json')])
STARTER_SRC = [os.path.join(SKILL, 'assets', 'remotion-starter', 'src'), os.path.join(SKILL, 'src')]
PICK = os.path.join(HERE, 'pick.py')

FORMATS = ['launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical', 'update']
PACES = ['calm', 'crisp']
HAVE = ['ui', 'input', 'photos', 'footage', 'audio', 'number', 'name', 'logos']
HAVE_TEXT = {'ui': 'product UI', 'input': 'a field, prompt or pointer the product is used with',
             'photos': 'pictures worth building on', 'footage': 'footage', 'audio': 'a real recorded clip',
             'number': 'one honest number', 'name': 'a name that means something',
             'logos': 'the products it works with (their official marks)'}
KEEP = ['palette', 'type']
SLOTS = ['palette', 'type', 'signature', 'direction']
MAX_REDRAWS = 2
SCRIPT_LINE, SCRIPT_WORDS = (2, 7), 50  # the script's numbers (grid-check.ts SCRIPT): words a line, words a film
DEFAULT_SECONDS = {'launch': 20, 'feature': 15, 'loop': 10, 'sting': 6, 'walkthrough': 30, 'vertical': 15, 'update': 14}
UPDATE_SECONDS = (8, 20)  # an update film ("vX is out"): a hook, 2-4 changes, a payoff, the end card
CHANGES = (2, 4)  # the changes an update film shows, each as one product moment
DEFAULT_CHANGES = 3
UPDATE_PARTS = ['hook', 'change', 'payoff', 'end']

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
IMAGERY_KINDS = ['photo', 'video', 'texture', 'art', 'archive']
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
    out = {e['id']: e for e in entries if isinstance(e, dict) and 'id' in e}
    for e in list(out.values()):  # an id an entry was merged from still names it
        for a in e.get('aliases', []) if isinstance(e.get('aliases'), list) else []:
            out.setdefault(a, e)
    return out


def deck_files(path):
    """The deck files --deck names: a folder (or the default deck) gives every *.json in it, the main deck
    first; any other file gives itself alone."""
    if os.path.isdir(path):
        folder = path
    elif os.path.abspath(path) == os.path.abspath(DEFAULT_DECK):
        folder = os.path.dirname(path)
    else:
        return [path]
    files = sorted(os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.json'))
    main = [f for f in files if os.path.basename(f) == MAIN_DECK]
    return main + [f for f in files if f not in main]


def _stem(path):
    return os.path.splitext(os.path.basename(path))[0]


def load_deck(path):
    """Every deck file merged into one deck: (data, problems). The main deck brings the recipes, the defaults
    and the floor; each other deck adds its directions, primitives and methods. data['decks'] maps each deck
    file to the ids of its directions; a catalogue entry two decks define differently is a problem."""
    files = deck_files(path)
    if not files:
        fail(f'no deck in {path}')
    first = read_json(files[0], 'the deck')
    if len(files) == 1 or not isinstance(first, dict):
        return first, []
    data = dict(first)
    for key in ('primitives', 'methods', 'recipes', 'defaults'):
        data[key] = dict(first.get(key) or {})
    data['directions'] = list(first.get('directions') or [])
    decks = {_stem(files[0]): [d.get('id') for d in data['directions'] if isinstance(d, dict)]}
    problems = []
    for f in files[1:]:
        x = read_json(f, 'the deck')
        name = _stem(f)
        if not isinstance(x, dict) or not isinstance(x.get('directions'), list):
            problems.append(f'{name}: a deck file needs a "directions" list')
            continue
        decks[name] = [d.get('id') for d in x['directions'] if isinstance(d, dict)]
        data['directions'] += x['directions']
        for key in ('primitives', 'methods', 'recipes', 'defaults'):
            for k, v in (x.get(key) or {}).items():
                old = data[key].get(k)
                same = old == v or (key == 'primitives' and isinstance(old, dict) and isinstance(v, dict)
                                    and old.get('file') == v.get('file') and old.get('status') == v.get('status'))
                if old is not None and not same:
                    problems.append(f'{name}: {key}.{k} differs from the one another deck defines')
                elif old is None:
                    data[key][k] = v
    data['decks'] = decks
    return data, problems


def is_imagery(d):
    """A direction whose world is real photographs and footage (fit.imagery: "sourced")."""
    return bool((d.get('fit') or {}).get('imagery'))


# The film's text animation is the main event: the deal leans toward directions where the line is the shot, and
# toward graphic worlds made in code on clean grounds. Imagery-led directions are opt-in (--have photos or footage).
TYPE_LED_SIGNATURES = {'word-build', 'slot-roll', 'counter-window'}  # the line built word by word, the slot word, the giant name
TYPE_LED_X = 4.0
GRAPHIC_X = 1.5
IMAGERY_HAVE = {'photos', 'footage'}


def is_type_led(d):
    """A direction whose signature is the type itself."""
    return (d.get('signature') or {}).get('family') in TYPE_LED_SIGNATURES


def is_graphic(d):
    """A direction made of code-built graphics on a clean ground (not a lit material world, not found pictures)."""
    w = d.get('world') or {}
    return (not is_imagery(d) and w.get('space') in ('flat', 'layered', 'perspective')
            and str(w.get('texture', '')).startswith('clean'))


def starter_src():
    return next((p for p in STARTER_SRC if os.path.isfile(os.path.join(p, 'lib', 'anim.ts'))), None)


_EXPORTS = {}


def _exports(src, rel, name):
    path = os.path.join(src, *rel.split('/'))
    if path not in _EXPORTS:  # one read and one scan per file, however many primitives it holds
        text = open(path, encoding='utf-8').read() if os.path.isfile(path) else ''
        _EXPORTS[path] = set(re.findall(r'export\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)', text))
    return name in _EXPORTS[path]


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


_ANY = {}


def _any(key, pats):
    """One alternation of a pattern list, so a clean string costs one search instead of one per pattern."""
    if key not in _ANY:
        _ANY[key] = re.compile('|'.join(f'(?:{p})' for p in pats), re.IGNORECASE)
    return _ANY[key]


def wording_hits(obj):
    hits = []
    for path, s in _strings(obj):
        if not _any('wording', WORDING).search(s):
            continue
        for pat in WORDING:
            m = re.search(pat, s, re.IGNORECASE)
            if m:
                hits.append(f'{path}: "{m.group(0)}" reads as a claim about other work; say it as house craft')
    return hits


def ban_hits(obj, prefix='', skip=()):
    out = []
    for path, s in _strings(obj, skip=skip):
        if not _any('bans', [p for p, _ in BAN_WORDS]).search(s):
            continue
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
    gfs = data.get('ground_families')
    if gfs is not None:
        fl = (gfs or {}).get('families') if isinstance(gfs, dict) else None
        if not isinstance(fl, list) or len(fl) < 7:
            errors.append('ground_families: a "families" list of at least 7 (one field and its light for a whole film)')
        else:
            seen = set()
            for f in fl:
                if not (isinstance(f, dict) and all(isinstance(f.get(k), str) and f.get(k) for k in ('id', 'name', 'what', 'type', 'field', 'event'))
                        and isinstance(f.get('tones'), list) and f['tones'] and set(f['tones']) <= set(TONES) and f.get('recipe') in recipes):
                    errors.append(f'ground_families: {f.get("id") if isinstance(f, dict) else f!r} needs id, name, what, type, field, event, tones ({"/".join(TONES)}) and a recipe of the catalogue')
                elif f['id'] in seen:
                    errors.append(f'ground_families: {f["id"]} twice')
                seen.add(f.get('id') if isinstance(f, dict) else None)
            errors += ban_hits({'ground_families': fl})
    for name, r in recipes.items():
        if not (isinstance(r, dict) and r.get('status') in STATUSES and r.get('tone') in TONES and r.get('notes')
                and all(_lc(r.get(k)) for k in ('ground', 'ink', 'accent'))):
            errors.append(f'recipes.{name}: needs a status, a tone ({"/".join(TONES)}), notes and ground/ink/accent as [L, C]')
    methods = data.get('methods')
    if not isinstance(methods, dict) or not methods or not all(isinstance(v, str) and len(v) > 40 for v in methods.values()):
        errors.append('the deck needs a "methods" catalogue of build recipes (name -> text)')
        methods = methods if isinstance(methods, dict) else {}
    errors += ban_hits({'recipes': recipes, 'methods': methods})
    defaults = data.get('defaults', {})
    if not isinstance(defaults, dict) or not all(isinstance(v, str) and len(v) > 40 for v in defaults.values()):
        errors.append('defaults: an object of house defaults (name -> text)')
        defaults = {}
    errors += ban_hits({'defaults': defaults})
    decks = data.get('decks')
    if isinstance(decks, dict) and decks:
        for i, (name, ids) in enumerate(decks.items()):
            if i == 0 and not 18 <= len(ids) <= 28:
                errors.append(f'the {name} deck holds {len(ids)} directions; the main deck holds 18-28')
            elif i > 0 and len(ids) < 3:
                errors.append(f'the {name} deck holds {len(ids)} directions; a deck that adds directions holds at least 3')
    elif not 18 <= len(dirs) <= 28:
        errors.append(f'the deck holds {len(dirs)} directions; it must hold 18-28')
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
                          and 1 <= c['words'][0] <= c['words'][1] <= SCRIPT_LINE[1]):
                    e(f'skeleton {b["beat"]}: a copy slot is {{"words": [min, max], "what": ...}} with 1-{SCRIPT_LINE[1]} words '
                      f'(a name, or a script line of {SCRIPT_LINE[0]}-{SCRIPT_LINE[1]})')
                else:
                    words += c['words'][1]
            if abs(total - 1.0) > 0.02:
                e(f'skeleton: beat shares add up to {total:.2f}, not 1.0')
            if sigs != 1:
                e(f'skeleton: exactly one beat carries the signature shot ({sigs} do)')
            if free < 1:
                e('skeleton: at least one beat without copy (the picture gets its own stretch)')
            if words > SCRIPT_WORDS:
                e(f'skeleton: copy slots allow {words} words; the most a script carries is {SCRIPT_WORDS}')
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
        # the update skeleton: present exactly when the direction makes update films
        if ('update' in fit['formats']) != isinstance(d.get('update'), dict):
            e('a direction that lists update in fit.formats carries an "update" skeleton, and only then')
        elif isinstance(d.get('update'), dict):
            for msg in update_problems(d):
                e(msg)
        if re.search(r'\bradial\b|\btagline\b', f'{lk["shot"]} {lk["build"]}', re.IGNORECASE):
            e('lockup: centred and built from the film\'s last element through its own device; never a lockup faded in from nowhere over a radial plate')
        fg = w.get('foreground')
        if fg is not None and not (isinstance(fg, str) and (not fg.lower().startswith('off') or len(fg.split()) >= 5)):
            e('world.foreground is a sentence, or "off: <the reason>" (a layered space has a pre-softened near plane by default)')
        # the picture brief of an imagery-led direction
        if fit.get('imagery') is not None or 'assets' in d:
            if fit.get('imagery') != 'sourced':
                e('fit.imagery is "sourced" for a direction whose world is real imagery found with scripts/assets.mjs')
            a_ = d.get('assets')
            if not isinstance(a_, dict):
                e('an imagery-led direction needs an assets block: kind, count, inventory, queries, sources, grade, choose, avoid')
            else:
                c_ = a_.get('count')
                if not _is_list_of(a_.get('kind'), IMAGERY_KINDS):
                    e(f'assets.kind lists what to find, from {IMAGERY_KINDS}')
                if not (isinstance(c_, list) and len(c_) == 2 and all(isinstance(x, int) and not isinstance(x, bool) for x in c_)
                        and 1 <= c_[0] <= c_[1] <= 20):
                    e('assets.count is [least, most] pictures, 1-20')
                if not (isinstance(a_.get('inventory'), str) and len(a_['inventory']) > 40):
                    e('assets.inventory says what to list from the subject before searching')
                if not (_is_list_of(a_.get('queries')) and len(a_['queries']) >= 3):
                    e('assets.queries holds at least 3 query patterns built from the inventory')
                if not _is_list_of(a_.get('sources')):
                    e('assets.sources names where to search (scripts/assets.mjs sources)')
                if not (isinstance(a_.get('grade'), dict) and a_['grade'].get('look')):
                    e('assets.grade gives one look for every picture')
                if not (isinstance(a_.get('choose'), str) and a_['choose']):
                    e('assets.choose says how to choose among the results')
                if not (_is_list_of(a_.get('avoid')) and len(a_['avoid']) >= 3):
                    e('assets.avoid names at least 3 stock pictures to refuse')
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
        grow = max(1.0, len(dirs) / 24)  # the share caps hold per 24 directions: a merged deck may hold more
        for what, key, cap, least in (('story shape', lambda d: d['story']['shape'], math.ceil(3 * grow), 10),
                                      ('lockup kind', lambda d: d['lockup']['kind'], math.ceil(5 * grow), 6),
                                      ('light kind', lambda d: d['world']['light_kind'], math.ceil(6 * grow), 5)):
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
            if len(ids) > math.ceil(6 * grow):
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


def update_beats(d, n=DEFAULT_CHANGES):
    """The update skeleton expanded for n changes, shares normalised to 1: hook, change 1..n, payoff, end."""
    u = d['update']
    parts = [('hook', u['hook'])] + [(f'change {i + 1}', u['change']) for i in range(n)] + [('payoff', u['payoff']), ('end', u['end'])]
    total = sum(float(p.get('share', 0)) for _, p in parts) or 1.0
    out = []
    for name, p in parts:
        ch = name.startswith('change')
        pic = str(p.get('picture', ''))
        if ch:
            pic = f'Change {name.split()[1]} of {n}. {pic}'
        out.append({'beat': name, 'share': float(p.get('share', 0)) / total, 'picture': pic, 'copy': p.get('copy'),
                    'signature': p.get('signature') is True, 'change': ch, 'handoff': p.get('handoff') if ch else None})
    return out


def update_problems(d):
    """Why a direction's update skeleton cannot make an 8-20 s update film (empty when it can)."""
    u, out = d['update'], []
    sec = u.get('seconds')
    if not (isinstance(sec, list) and len(sec) == 2 and all(isinstance(x, (int, float)) for x in sec)
            and UPDATE_SECONDS[0] <= sec[0] < sec[1] <= UPDATE_SECONDS[1]):
        out.append(f'update.seconds must be [min, max] within {UPDATE_SECONDS[0]}-{UPDATE_SECONDS[1]}')
    if not _is_list_of(u.get('needs_also', []), ['audio', 'number', 'name'], nonempty=False):
        out.append('update.needs_also may list audio, number, name')
    for part in UPDATE_PARTS:
        p = u.get(part)
        if not isinstance(p, dict) or not isinstance(p.get('share'), (int, float)) or not 0.05 <= p['share'] <= 0.4 \
                or len(str(p.get('picture', ''))) < 30:
            out.append(f'update.{part}: needs a share (0.05-0.4) and a concrete picture')
            continue
        c = p.get('copy')
        if c is not None and not (isinstance(c, dict) and isinstance(c.get('words'), list) and len(c['words']) == 2 and c.get('what')
                                  and all(isinstance(x, int) for x in c['words']) and 1 <= c['words'][0] <= c['words'][1] <= 3):
            out.append(f'update.{part}: a copy slot is {{"words": [min, max], "what": ...}} with 1-3 words (an update fragment)')
    if out:
        return out
    if u['change'].get('signature') is True:
        out.append('update.change: the signature lands once, so it is never on the repeated change beat')
    if sum(1 for p in ('hook', 'payoff', 'end') if u[p].get('signature') is True) != 1:
        out.append('update: exactly one of hook, payoff and end carries the signature shot')
    if not isinstance(u['change'].get('handoff'), str) or len(u['change']['handoff']) < 20:
        out.append('update.change: say how one change hands over to the next (handoff)')
    if all(u[p].get('copy') is not None for p in ('hook', 'payoff', 'end')):
        out.append('update: at least one of hook, payoff and end is picture only')
    hook = u['hook']['picture'].lower()
    if 'frame 0' not in hook or not re.search(r'\b(version|mark)\b', hook):
        out.append('update.hook: says what moves on frame 0, on the version or the mark')
    if 'version' not in u['end']['picture'].lower():
        out.append('update.end: the end card carries the version')
    if update_beats(d, CHANGES[0])[0]['share'] > 0.2 + 1e-9:
        out.append('update: with 2 changes the hook takes more than 20 % of the film')
    if any(b['share'] < 0.1 - 1e-9 for b in update_beats(d, CHANGES[1]) if b['change']):
        out.append('update: with 4 changes a change gets under 10 % of the film; give the change beat more weight')
    main_n = re.sub(r'^the\s+', '', str(d['signature']['name']).lower())
    alt_n = re.sub(r'^the\s+', '', str(d['signature_alt']['name']).lower())
    for part in UPDATE_PARTS:
        pic = u[part]['picture'].lower()
        if alt_n and re.search(r'\b' + re.escape(alt_n) + r'\b', pic):
            out.append(f'update.{part}: uses the alternative signature')
        if main_n and part != 'end' and u[part].get('signature') is not True and re.search(r'\b' + re.escape(main_n) + r'\b', pic):
            out.append(f'update.{part}: repeats the signature shot outside its beat')
    return out


# ------------------------------------------------------------------------------------------------- dealing
def needs_of(d, fmt=None):
    f = d['fit']
    also = d['update'].get('needs_also', f.get('needs_also', [])) if fmt == 'update' and isinstance(d.get('update'), dict) \
        else f.get('needs_also', [])
    return [k for k in ('ui', 'footage') if f[k] == 'needs'] + list(also)


def keyword_hits(d, brief):
    b = (brief or '').lower()
    return sum(1 for k in d['keywords'] if re.search(r'\b' + re.escape(k.lower()) + r'(s|es|ing|ed|er|ers)?\b', b))


def fits(d, fmt, pace, have, seconds, brief='', ready=None, imagery=True):
    """(True, '') when the direction can make this film, else (False, reason). ready=None skips the planned check;
    imagery=False leaves out the imagery-led directions."""
    f = d['fit']
    if not imagery and is_imagery(d):
        return False, 'imagery-led (--no-imagery)'
    if is_imagery(d) and not IMAGERY_HAVE & set(have or ()):
        return False, 'imagery-led: only with --have photos or footage'
    if fmt and fmt not in f['formats']:
        return False, f'format {fmt}'
    if pace and pace not in f['paces']:
        return False, f'pace {pace}'
    if fmt == 'update':  # the version is the one honest number an update film owns
        have = set(have) | {'number'}
    for k in needs_of(d, fmt):
        if k not in have:
            return False, f'needs {HAVE_TEXT[k]}'
    lo, hi = d['update']['seconds'] if fmt == 'update' and isinstance(d.get('update'), dict) else f['seconds']
    if seconds and not lo <= seconds <= hi:
        return False, f'{seconds:g} s is outside {lo}-{hi} s'
    if f.get('keywords_required') and not keyword_hits(d, brief):
        return False, 'the brief names none of its subjects'
    if ready is not None:
        miss = [p for p in d.get('requires', []) if p not in ready]
        if miss:
            return False, 'waits for planned ' + ', '.join(miss)
    return True, ''


KEYWORD_X = 3.0  # each subject of the brief a direction knows multiplies its weight (up to three)


def uses_of(d):
    """The assets a direction can put on screen when they exist (ui, footage, audio, number, name)."""
    f = d['fit']
    return {k for k in ('ui', 'footage') if f[k] != 'none'} | set(f.get('needs_also', []))


def weight(d, inp, recent):
    w = KEYWORD_X ** min(3, keyword_hits(d, inp['brief']))
    if is_type_led(d):  # text animation is the main event
        w *= TYPE_LED_X
    elif is_graphic(d):
        w *= GRAPHIC_X
    if inp['pace'] == 'crisp' and d['intensity'] <= 2:
        w *= 0.35
    if needs_of(d, inp.get('format')):  # it only fits because the film has the asset: use it
        w *= 2.0
    elif set(inp.get('have') or []) & uses_of(d) - {'ui'}:  # footage, audio, a number or a name it can use
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
        if any(tone(d) in ('mid', 'field') for d in pool) and not any(tone(p) in ('mid', 'field') for p in picks):
            out.append('no mid or colour ground')
    if any(d['intensity'] >= 4 for d in pool) and not any(p['intensity'] >= 4 for p in picks):
        out.append('no rich direction')
    if k >= 2 and any(is_imagery(d) for d in pool) and not any(is_imagery(p) for p in picks):
        out.append('no imagery-led direction')
    if k >= 2 and any(not is_imagery(d) for d in pool) and all(is_imagery(p) for p in picks):
        out.append('no built world beside the imagery')
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
    pool = [d for d in dirs if fits(d, inp['format'], inp['pace'], inp['have'], inp['seconds'], inp['brief'], gate,
                                    inp.get('imagery', True))[0] and d['id'] not in avoid]
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


def deal_family(data, palette, seed, d_id, recent=()):
    """The film's ground family (directions.json ground_families): weighted toward the dealt palette's tone (x3),
    never one of the last films' families while another fits. None for a deck without the catalogue."""
    fams = [f for f in ((data.get('ground_families') or {}).get('families') or []) if isinstance(f, dict) and f.get('id')]
    if not fams:
        return None
    tone = tone_of(palette, data.get('recipes', {})) if palette else None
    pool = [f for f in fams if f['id'] not in recent] or fams
    wts = [3.0 if tone and tone in (f.get('tones') or []) else 1.0 for f in pool]
    rng = slot_rng(seed, d_id, 'ground')
    x = rng.random() * sum(wts)
    for f, w in zip(pool, wts):
        x -= w
        if x <= 0:
            return f
    return pool[-1]


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


def film_history(enabled):
    """The last three films you made (film-diff.mjs --record writes ~/.cinetic/film-history.json, or
    CINETIC_FILM_HISTORY): what each was dealt and declared, newest first."""
    if not enabled:
        return []
    path = os.environ.get('CINETIC_FILM_HISTORY') or os.path.join(os.path.expanduser('~'), '.cinetic', 'film-history.json')
    try:
        with open(path, encoding='utf-8') as fh:
            h = json.load(fh)
    except (OSError, ValueError):
        return []
    return [x for x in h if isinstance(x, dict) and isinstance(x.get('devices'), dict)][:3] if isinstance(h, list) else []


def recent_grounds(history_on):
    """Ground families of the last three films (the film history first, then the deal history)."""
    seen = []
    for g in [f['devices'].get('ground') for f in film_history(history_on)] + [h.get('ground') for h in read_history(history_on)]:
        if g and g not in seen:
            seen.append(g)
    return seen[:3]


def repeats(d, history_on, allowed):
    """What this direction would repeat from the last three films you made: its signature family and its lockup kind
    (an end-card build), unless --repeat names the slot."""
    out = []
    for f in film_history(history_on):
        deck = f['devices'].get('deck') or {}
        name = f.get('name') or 'a recent film'
        if 'signature' not in allowed and deck.get('signature') and deck['signature'] == d['signature']['family']:
            out.append(f"its signature ({d['signature']['family']}) was {name}'s")
        if 'end' not in allowed and deck.get('lockup') and deck['lockup'] == d['lockup']['kind']:
            out.append(f"its lockup ({d['lockup']['kind']}) was {name}'s")
    return out


# ---------------------------------------------------------------------------------------------- the sheet
def skeleton_times(d, seconds, fps=60, fmt=None, changes=DEFAULT_CHANGES):
    beats = update_beats(d, changes) if fmt == 'update' and isinstance(d.get('update'), dict) else d['skeleton']
    out, t = [], 0.0
    for b in beats:
        a, t = t, t + b['share'] * seconds
        row = {'beat': b['beat'], 'from_s': round(a, 2), 'to_s': round(t, 2),
               'from_f': int(round(a * fps)), 'to_f': int(round(t * fps)),
               'picture': b['picture'], 'copy': b.get('copy'), 'signature': bool(b.get('signature'))}
        if b.get('change'):
            row['change'], row['handoff'] = True, b.get('handoff')
        out.append(row)
    if out:
        out[-1]['to_s'], out[-1]['to_f'] = round(seconds, 2), int(round(seconds * fps))
    return out


def music_find(d, seconds):
    """Where this film's track comes from: music.mjs, which holds back every track an earlier film used. The deck never
    lists tracks itself (the shortlist's are the example films' tracks, and a list here would let a film reuse one)."""
    lo, hi = d['music']['bpm']
    q = f'--mood "<the brief\'s mood words>" --bpm {lo}-{hi} --length {seconds:g}'
    return {'search': f'node scripts/music.mjs search {q}', 'pick': f'node scripts/music.mjs pick {q}',
            'about': "this film's own track: search the catalogs, or pick from a music library when you keep one; then "
                     "sheet --measure and get '#n' --to audio/music. Both hold back every track an earlier film used: "
                     "never take a track from an earlier film or the shortlist by hand (references/music.md)."}


# ------------------------------------------------------------------------------------------------ the brand
def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gam(c):
    c = min(1.0, max(0.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hex_oklch(hx):
    """OKLCH (L, C, h in degrees) of a #RRGGBB colour."""
    hx = hx.strip().lstrip('#')
    r, g, b = (_lin(int(hx[i:i + 2], 16) / 255) for i in (0, 2, 4))
    l_ = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m_ = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s_ = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(a, bb), (math.degrees(math.atan2(bb, a)) + 360) % 360


def oklch_hex(L, C, h):
    """#RRGGBB of an OKLCH colour, chroma reduced until it sits inside sRGB."""
    rgb = (L, L, L)
    for k in range(41):
        c = C * (1 - k / 40)
        a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
        l3 = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
        m3 = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
        s3 = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
        rgb = (4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
               -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
               -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3)
        if all(-1e-4 <= x <= 1 + 1e-4 for x in rgb):
            break
    return '#' + ''.join(f'{round(_gam(x) * 255):02X}' for x in rgb)


def contrast(a, b):
    """WCAG contrast ratio of two #RRGGBB colours."""
    def lum(hx):
        hx = hx.lstrip('#')
        r, g, b_ = (_lin(int(hx[i:i + 2], 16) / 255) for i in (0, 2, 4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b_
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


HEX = re.compile(r'^#[0-9A-Fa-f]{6}$')


def read_brand(path):
    """The colours and type of a brand/brand.json written by scripts/brand.py: {name, accent, colours, family, file}."""
    data = read_json(path, 'the brand file')
    col = data.get('colours') if isinstance(data, dict) else None
    if not isinstance(col, dict):
        fail(f'--brand {path}: no "colours" block (write it with scripts/brand.py)')
    hexes = [c.get('hex') if isinstance(c, dict) else c for c in col.get('list', [])]
    hexes = [h.upper() for h in hexes if isinstance(h, str) and HEX.match(h)]
    acc = col.get('accent') or (max(hexes, key=lambda h: hex_oklch(h)[1]) if hexes else None)
    if not (isinstance(acc, str) and HEX.match(acc)):
        fail(f'--brand {path}: no accent colour (colours.accent or a colour in colours.list)')
    fonts = data.get('fonts') or {}
    return {'file': path, 'name': data.get('name') or '', 'accent': acc.upper(), 'colours': hexes or [acc.upper()],
            'source': col.get('source', 'supplied'), 'family': fonts.get('family') if isinstance(fonts, dict) else None}


def brand_neutral(brand):
    """(hue, chroma) the brand's own greys lean to: the chroma-weighted hue of its neutrals and their highest
    chroma (at most .025); a brand without tinted greys gets plain greys (C 0). Never the accent's hue by
    default: grounds derived at the accent hue turn a one-accent brand into a wash of its own colour."""
    acc = brand['accent']
    greys = [hex_oklch(c) for c in brand['colours'] if c != acc and hex_oklch(c)[1] <= 0.06]
    tinted = [g for g in greys if g[1] >= 0.004]
    if not tinted:
        return 0.0, 0.0
    x = sum(g[1] * math.cos(math.radians(g[2])) for g in tinted)
    y = sum(g[1] * math.sin(math.radians(g[2])) for g in tinted)
    return math.degrees(math.atan2(y, x)) % 360, min(0.025, max(g[1] for g in tinted))


def map_palette(p, recipes, brand):
    """One palette's roles on the brand. The brand's own greys and papers are the grounds: a brand neutral within
    .12 L of the recipe's ground, else the recipe's lightness on the brand's neutral (its greys' hue, chroma at
    most theirs and .025). A colour world takes a second brand colour (30+ degrees from the accent) near its
    lightness, else it falls back to a neutral ground at that lightness: never a field at the accent's own hue.
    Ink is the brand neutral with the most contrast if it holds 7:1, else the recipe's ink on the brand
    neutral; the accent is always the brand's."""
    r = recipes.get(p['recipe']) or {}
    acc = brand['accent']
    _, _, ah = hex_oklch(acc)
    hn, cn = brand_neutral(brand)
    cols = [c for c in brand['colours'] if c != acc]
    (gL, gC), (iL, iC) = r.get('ground', [0.95, 0.01]), r.get('ink', [0.2, 0.01])
    field = r.get('tone') == 'field'
    note = None

    def apart(c):
        return min(abs(hex_oklch(c)[2] - ah), 360 - abs(hex_oklch(c)[2] - ah)) >= 30
    greys = [(abs(hex_oklch(c)[0] - gL), c) for c in cols if abs(hex_oklch(c)[0] - gL) <= 0.12 and hex_oklch(c)[1] <= 0.06]
    if field:
        near = [(abs(hex_oklch(c)[0] - gL), c) for c in cols
                if abs(hex_oklch(c)[0] - gL) <= 0.15 and hex_oklch(c)[1] >= 0.05 and apart(c)]
        if near:
            ground, gsrc = min(near)[1], 'brand'
        else:
            ground, gsrc = oklch_hex(gL, cn, hn), 'recipe on the brand neutral'
            note = ('the brand has no second colour for this colour field: a neutral ground at its lightness '
                    "(a field at the accent's own hue would wash the film in the accent)")
    else:
        ground, gsrc = (min(greys)[1], 'brand') if greys else (oklch_hex(gL, min(gC, cn), hn), 'recipe on the brand neutral')
    inks = sorted(((contrast(c, ground), c) for c in cols if c != ground and hex_oklch(c)[1] <= 0.06), reverse=True)
    ink, isrc = (inks[0][1], 'brand') if inks and inks[0][0] >= 7 else (oklch_hex(iL, min(iC, cn), hn), 'recipe on the brand neutral')
    ci, ca = contrast(ink, ground), contrast(acc, ground)
    out = {'palette': p['id'], 'recipe': p['recipe'], 'tone': r.get('tone'), 'proportions': p['proportions'],
           'ground': {'hex': ground, 'source': gsrc}, 'ink': {'hex': ink, 'source': isrc, 'contrast': round(ci, 2)},
           'accent': {'hex': acc, 'source': 'brand', 'contrast': round(ca, 2)},
           'neutral': {'hue': round(hn, 1), 'chroma': round(cn, 3)}, 'ok': ci >= 7 and ca >= 3}
    if note:
        out['field_note'] = note
    return out


def brand_mapping(d, palette, recipes, brand):
    """The dealt palette mapped onto the brand, or the direction's first other palette that holds contrast with the
    brand's accent when the dealt one cannot (a redraw for a stated reason: the brand contradicts it)."""
    order = ([palette] if palette else []) + [p for p in d['palettes'] if not palette or p['id'] != palette['id']]
    tried = [map_palette(p, recipes, brand) for p in order]
    pick = next((m for m in tried if m['ok']), tried[0])
    out = dict(pick, file=brand['file'], name=brand['name'], source=brand['source'], family=brand['family'],
               dealt=palette['id'] if palette else None)
    lights = [c for c in brand['colours'] if c != brand['accent'] and hex_oklch(c)[0] >= 0.9 and hex_oklch(c)[1] <= 0.03]
    darks = [c for c in brand['colours'] if c != brand['accent'] and hex_oklch(c)[0] <= 0.3]
    if lights and not darks and pick.get('tone') in ('dark', 'mid', 'field'):
        out['tone_note'] = (f'the brand is a light brand (its paper {lights[0]}, no dark neutral) but this palette puts it on a '
                            f'{pick["tone"]} ground ({pick["ground"]["hex"]}): redraw the palette for a light one '
                            '(deck.py --redraw palette --reason "the brand is light"), or say in BRIEF.md why the film goes dark')
    if palette and pick['palette'] != palette['id']:
        out['note'] = (f'the dealt {palette["id"]} cannot hold the brand accent at 3:1 with 7:1 type '
                       f'({tried[0]["accent"]["contrast"]:.1f}:1, {tried[0]["ink"]["contrast"]:.1f}:1): {pick["palette"]} maps cleanly')
    elif not pick['ok']:
        out['note'] = ('no palette of this direction holds the brand accent at 3:1 on its ground: keep the accent for '
                       'large graphics only, or deal a direction with another ground tone')
    return out


def pick_energy(pace, d):
    if pace == 'crisp':
        return 'high' if d['intensity'] >= 4 else 'medium'
    return 'calm'


def make_sheet(d, inp, seed, options, keep, history_on, data, redraws=None, variant='main', palette=None, type_=None,
               waits=()):
    seconds = inp['seconds'] or DEFAULT_SECONDS.get(inp['format'] or 'launch', 20)
    changes = inp.get('changes') or DEFAULT_CHANGES
    if palette is None and 'palette' not in keep:
        palette = deal_slot(d, 'palette', seed)
    if type_ is None and 'type' not in keep:
        type_ = deal_slot(d, 'type', seed)
    recipes, methods = data.get('recipes', {}), data.get('methods', {})
    sig = d['signature'] if variant == 'main' else dict(d['signature_alt'], family=d['signature']['family'], cost=d['signature']['cost'],
                                                        elements=d['signature']['elements'])
    used = sorted({r['recipe'] for r in ([palette] if palette else d['palettes'])})
    family = deal_family(data, palette, seed, d['id'], recent_grounds(history_on))
    brand = brand_mapping(d, palette, recipes, read_brand(inp['brand'])) if inp.get('brand') else None
    fg = d['world'].get('foreground')
    foreground = None if d['world']['space'] != 'layered' or str(fg or '').lower().startswith('off') else (
        fg or (data.get('defaults') or {}).get('foreground'))
    return {
        'version': 2, 'tool': 'deck.py', 'seed': seed, 'input': inp,
        'options': [o for o in options], 'chosen_from_options': d['id'] in options,
        'direction': d, 'palette': palette, 'type': type_, 'face': face_for(type_, seed, d['id']) if type_ else None, 'keep': sorted(keep),
        'recipes': {r: recipes.get(r) for r in used},
        'methods': {m: methods.get(m, '') for m in d['world'].get('method', [])},
        'signature': sig, 'signature_variant': variant, 'waits_for': list(waits),
        'seconds': seconds, 'skeleton': skeleton_times(d, seconds, 60, inp['format'], changes),
        'changes': changes if inp['format'] == 'update' else None,
        'brand': brand, 'foreground': foreground, 'ground_family': family,
        'pick': {'format': inp['format'] or 'launch', 'energy': pick_energy(inp['pace'], d), 'seconds': seconds,
                 'lean': d['techniques'], 'signature_ids': sig['techniques'], 'avoid': d['avoid_techniques']},
        'music_find': music_find(d, seconds),
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
    if inp.get('format') == 'update' and inp.get('changes'):
        parts.append(f'--changes {inp["changes"]}')
    if inp.get('brand'):
        parts.append(f'--brand {inp["brand"]}')
    if inp.get('imagery') is False:
        parts.append('--no-imagery')
    if inp.get('recent'):
        parts.append(f'--recent {",".join(inp["recent"])}')
    parts.append(f'--seed {seed}')
    return ' '.join(parts + extra)


def _fit_line(d):
    f, m = d['fit'], d['music']
    need = [HAVE_TEXT[k] for k in needs_of(d)] + (["the product's own or supplied pictures, or footage (--have photos)"] if is_imagery(d) else [])
    subj = ' · only when the brief names its subject' if f.get('keywords_required') else ''
    upd = (f' (an update film {d["update"]["seconds"][0]}-{d["update"]["seconds"][1]} s)'
           if isinstance(d.get('update'), dict) else '')
    return (f'Fits {", ".join(f["formats"])}{upd} · {f["seconds"][0]}-{f["seconds"][1]} s · pace {"/".join(f["paces"])} · '
            f'{("needs " + " and ".join(need)) if need else "no assets needed"}{subj} · music {m["mode"]}, '
            f'{m["bpm"][0]}-{m["bpm"][1]} BPM, {m["ending"]} ending')


def _tag(d):
    return (('imagery-led · ' if is_imagery(d) else 'type-led · ' if is_type_led(d) else '') + f'intensity {d["intensity"]}/5 · {SPACES[d["world"]["space"]]} · light {d["world"]["light_kind"]} · '
            f'camera {d["camera"]["motion"]} · {d["cuts"]["kind"]} cuts · story {d["story"]["shape"]} · '
            f'lockup {d["lockup"]["kind"]}')


def _imagery_lines(d, bullet='- '):
    """The picture brief of an imagery-led direction, for scripts/assets.mjs."""
    a = d.get('assets')
    if not is_imagery(d) or not isinstance(a, dict):
        return []
    g = a.get('grade') or {}
    return [f'{bullet}**Imagery (real pictures are this world):** {", ".join(a["kind"])}, {a["count"][0]}-{a["count"][1]} '
            f'pictures, found under licences that need no credit and never credited on screen (the licence record stays in '
            f'the project). {a["inventory"]}',
            f'{bullet}**Queries** (built from that list, never from the category): ' + '; '.join(f'"{q}"' for q in a['queries'])
            + f'. Sources: {", ".join(a["sources"])}.' + (f' At least {a["min_width"]} px wide, {a.get("orientation", "any")}.'
                                                           if a.get('min_width') else ''),
            f'{bullet}**Choose:** {a["choose"]}',
            f'{bullet}**One grade for every picture:** `{g.get("look")}`' + (f' ({g["notes"]})' if g.get('notes') else '') + '.',
            f'{bullet}**Refuse:** {"; ".join(a["avoid"])}.',
            f'{bullet}**Route:** `node scripts/assets.mjs search` (each query) -> `sheet` (look at the results) -> `get` -> '
            '`grade` (one look for the set), then move them with the imagery primitives this direction names.']


def _lcs(v):
    return f'L {v[0]:.2f} C {v[1]:.3f}'


def _recipe_note(name, recipes):
    r = recipes.get(name) or {}
    if r.get('status') == 'planned':
        return (f' (not in lib/look.ts yet: ground {_lcs(r["ground"])}, ink {_lcs(r["ink"])}, accent {_lcs(r["accent"])} at '
                f'the accent hue; {r["notes"]}. Write the tokens by hand and check them with palette.py --paper)')
    return ' (lib/look.ts RECIPE)'


def template_preview(d, inp, seed, data, root, history_on, devices, floor):
    """What the template would play for direction `d`: ground family, type pairing, the template's deal, creative."""
    pal = deal_slot(d, 'palette', seed)
    fam = deal_family(data, pal, seed, d['id'], recent_grounds(history_on))
    sh = {'direction': d, 'ground_family': fam, 'name': project_name(root) or '', 'input': inp}
    deal, _ = template_deal(sh, devices, floor, recent_template(history_on), world_context(root, inp, history_on)) if devices else ({}, {})
    lib = creative_library(root)
    c = deal_creative(lib, project_name(root), inp.get('brief', ''), inp.get('have', ()), recent_creative(history_on), direction=d,
                      photos=photos_known(inp, root))
    pr = deal_pair(project_name(root) or inp.get('brief', ''), d['id'], recent_pairs(history_on))
    by = {x['id']: x for x in lib}
    plays_worlds = deal.get('ground') in WORLD_KINDS
    lines = [(f'**The template plays.** ' if plays_worlds else f'**The template plays.** ground `{(fam or {}).get("id", "?")}` ({(fam or {}).get("what", "")[:90]}); ')
             + ', '.join(f'{k} `{deal[k]}`' for k in ('voice', 'end', 'camera') if deal.get(k))
             + (f'; type `{pr["id"]}` ({pr.get("voice")} with {pr.get("text")})' if pr else '') + '.']
    if plays_bank(root):
        lines.append('**Scenes.** 8-12 house scenes dealt from the scene bank at random (src/bank.ts: seeded by this direction and the last '
                     'films, weighted toward each act' + "'" + 's verb and big scenes, never one twice, two of the last film' + "'" + 's at most; print the plan '
                     'to see them): 75 % of the picture scenes or more from the bank, one of the film' + "'" + 's own at most, a dealt slot redrawn '
                     'only with its reason (`why`); painted in one palette on one ground (src/palette.ts).')
    if c and template_plays_creative(root):
        lines.append('**Creative elements.** ' + '; '.join(f'`{i}` ({by.get(i, {}).get("about", "")[:80]})' for i in c['deal']) + '.')
    elif c:
        lines.append('**Creative elements.** not played (its own devices carry those beats: a spine template plays the device each act verb asks for, the update template its hero shots).')
    hlib = hero_library(root)
    world = deal.get('ground') if deal.get('ground') in WORLD_KINDS else None
    hc = deal_hero(hlib, project_name(root), inp.get('brief', ''), inp.get('have', ()), recent_hero(history_on), direction=d, world=world, root=root) if hlib else None
    if world:
        wc = world_context(root, inp, history_on)
        hue = world_hue(world, wc['accent'], wc['template'])
        lines.append(f'**World.** `{world}`' + (f' at hue {hue}' if hue is not None and world not in NEUTRAL_WORLDS else '') + (' (a photograph: assets.mjs plate fetches it)' if world in PLATE_WORLDS else '') + '.')
    if hc:
        hby = {h['id']: h for h in hlib}
        lines.append('**Hero shots.** ' + '; '.join(f'`{i}` ({hby.get(i, {}).get("about", "")[:80]})' for i in hc['deal']) + '.')
    return lines


def render_template_options(opts, inp, seed, data, root, history_on, devices, floor):
    """out/OPTIONS.md for a template project: three directions, each with what the template would play."""
    out = [f'<!-- {_cmd(inp, seed, [])} -->', f'# Pick the direction that fits the product ({len(opts)} dealt, seed {seed})', '',
           'Each one below is a whole film: its idea, its world, and what the template would play with it. Hold each against the '
           'product (what it does, what it touches, what its user sees): pick the one whose picture says what the product does '
           'without the words, never the first or the most familiar. Then deal it, with the reason in one line (it heads '
           'out/DIRECTION.md):', '',
           f'    {_cmd(inp, seed, ["--direction", "<id>", "--why", chr(34) + "<why it fits the product>" + chr(34)])}', '']
    for i, d in enumerate(opts, 1):
        out += [f'## {i}. `{d["id"]}`: {d["name"]}', f'*{_tag(d)}*', '', f'**Idea.** {d["idea"]}', f'**Story.** {d["story"]["line"]}',
                f'**World.** {d["world"]["set"].split(". ")[0].rstrip(".")}.', f'**Lockup.** {d["lockup"]["shot"]}']
        out += template_preview(d, inp, seed, data, root, history_on, devices, floor) + ['']
    return '\n'.join(out) + '\n'


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


FIELD_EVENT = ('A colour field is an event, not the film\'s ground: it holds the frame for one act at most (about 20 % of '
               'the film: the signature or the payoff); the other acts sit on the dark or mid stage of the same hue '
               '(inkStage or slateMid), so the film is never more than half saturated for long.')


def _palette_lines(p, recipes):
    pr = p['proportions']
    return [f'- **{p["id"]}** ({tone_of(p, recipes)} ground): recipe `{p["recipe"]}`{_recipe_note(p["recipe"], recipes)}, accent from '
            f'{" or ".join(p["accent"])}; ground {pr["ground"]} % · ink {pr["ink"]} % · accent {pr["accent"]} % of the frame. '
            f'{p["notes"][:1].upper() + p["notes"][1:]}.' + (f' {FIELD_EVENT}' if tone_of(p, recipes) == 'field' else '')]


# The face set (scripts/faces.json): a type option's words pick a look, and the deal picks the face inside it.
FACES_FILE = os.path.join(HERE, 'faces.json')
LOOK_ORDER = ['technical', 'friendly', 'geometric', 'tight', 'neutral']


def _face_set():
    try:
        with open(FACES_FILE, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def face_for(t, seed=None, did=''):
    """The face set's look for a type option (matched on its sans words, then its notes) and the face in it: the
    look's main face, or with a seed a dealt one (the main face twice as likely as each sans alternate)."""
    fs = _face_set()
    if not fs or not t:
        return None
    looks = {lk['id']: lk for lk in fs['looks']}

    def match(words):
        words = words.lower()
        return next((looks[i] for i in LOOK_ORDER if i in looks and any(k in words for k in looks[i].get('keywords', []))), None)
    look = match(t.get('sans', '')) or match(t.get('notes', '')) or next((lk for lk in fs['looks'] if lk.get('default')), fs['looks'][0])
    pool = [look['display']] + [a for a in look.get('alternates', []) if fs['faces'].get(a, {}).get('category') == 'sans']
    name = pool[0] if seed is None else slot_rng(seed, did, 'face', t.get('id', '')).choices(pool, weights=[2] + [1] * (len(pool) - 1))[0]
    f = fs['faces'][name]
    return {'look': look['id'], 'look_name': look['name'], 'face': name, 'family': f['family'], 'offset_em': f['offset_em'],
            'weight_offset': f['weight_offset'], 'mono': look.get('mono'), 'default': name == fs.get('default')}


def _face_line(fc):
    if not fc:
        return ''
    fam = fc['family'].replace(' Variable', '')
    adj = [x for x in ((f'weights {fc["weight_offset"]:+d}' if fc['weight_offset'] else ''),
                       (f'tracking {fc["offset_em"]:+g} em' if fc['offset_em'] else '')) if x]
    how = ('the starter\'s face: keep it (delete its `cinetic:placeholder` marker and write the look in TREATMENT.md)' if fc['default']
           else f'`node scripts/add-font.mjs {fc["face"]}`' + (f' ({", ".join(adj)} on the house numbers)' if adj else ''))
    return f'{fam}, the {fc["look"]} look ({fc["look_name"]}, `scripts/faces.json`): {how}'


def _type_lines(t, seed=None, did='', pair=None):
    fc = None if pair else face_for(t, seed, did)
    face = f' Face: {_face_line(fc)}.' if fc else (f' Faces: the `{pair}` pairing above (its weights and tracking take the place of these).' if pair else '')
    return [f'- **{t["id"]}**: {t["sans"]}, weights {t["weights"][0]}/{t["weights"][1]}, {t["case"]}; {t["notes"]}.{face}']


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
    if sh.get('why'):
        out += [f'**Picked** `{d["id"]}` from {", ".join(f"`{o}`" for o in sh["options"]) or "the deck"}: {sh["why"]}', '']
    if not sh['chosen_from_options']:
        out += [f'(Chosen outside the dealt options {", ".join(sh["options"]) or "(none dealt)"}: say why in the treatment.)', '']
    tp = sh.get('type_pair')
    if tp:
        out += [f'**Type.** the `{tp["id"]}` pairing (voice {tp["voice"]}, text {tp["text"]}; scripts/faces.json): '
                + ('set in src/brand/tokens.ts.' if tp['set'] else f'set it: `{tp["cmd"]}`.')
                + ' Lines take its weights and tracking, a key word its emphasis weight, the wordmark its wordmark style.', '']
    if sh.get('waits_for'):
        out += [f'(This direction\'s signature waits for planned {", ".join(sh["waits_for"])}: build them inside the film '
                'from the description below, or deal another direction.)', '']
    td = sh.get('template_deal')
    if td:
        out += [f"## 0. The template's deal ({td['file']}: the template plays exactly this)", '',
                'The template draws its devices from this sheet, never from a second deal of its own: '
                + ', '.join(f"**{k}** {v}" for k, v in td['deal'].items()) + '. Why: '
                + '; '.join(f"{k}: {td['why'][k]}" for k in td['deal']) + '. Re-deal with `deck.py --redraw`; '
                '`pin` in src/launch.ts fixes one slot by hand. What plays: `npx tsx -e "import { DEAL, DEAL_SOURCE } '
                "from './src/deal'; console.log(DEAL_SOURCE, DEAL)\"`.", '']
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
    if sh.get('foreground'):
        out.append(f'- **Foreground layer (on by default in a layered space):** {sh["foreground"].rstrip(".")}.')
    out += _imagery_lines(d)
    bm = sh.get('brand')
    if bm:
        pr = bm['proportions']
        out += [f'- **Palette (mapped onto the brand, `{bm["file"]}`):** recipe `{bm["recipe"]}` ({bm["tone"]} ground, '
                f'palette `{bm["palette"]}`) gives the roles and the proportions; ground `{bm["ground"]["hex"]}` '
                f'({bm["ground"]["source"]}), ink `{bm["ink"]["hex"]}` ({bm["ink"]["source"]}, {bm["ink"]["contrast"]:.1f}:1), '
                f'accent `{bm["accent"]["hex"]}` (the brand\'s, {bm["accent"]["contrast"]:.1f}:1 on the ground); ground '
                f'{pr["ground"]} % · ink {pr["ink"]} % · accent {pr["accent"]} % of the frame. The brand\'s colours go into '
                'src/brand/tokens.ts marked cinetic:brand-supplied (scripts/brand.py writes them), checked for contrast and '
                'the one-accent rule only (palette.py --check-tokens).' + (f' ({bm["note"]}.)' if bm.get('note') else '')
                + (f' ({bm["field_note"]}.)' if bm.get('field_note') else '')
                + " Grounds stay neutral (the brand's own greys and papers); the accent keeps to 8-15 % of the frame."]
        if bm.get('tone_note'):
            out.append(f'- **BRAND GROUND, READ THIS:** {bm["tone_note"]}.')
    if bm:
        pass  # the mapping above names the recipe, the palette and the proportions it took
    elif sh['palette']:
        out += ['- **Palette (dealt):**'] + ['  ' + x for x in _palette_lines(sh['palette'], recipes)]
    else:
        out += ['- **Palette:** the brand fixes it (`--keep palette`). Map its colours onto the roles below: '
                'ground, ink, one accent; keep the proportions of a recipe this direction uses:']
        out += ['  ' + x for p in d['palettes'] for x in _palette_lines(p, recipes)]
    if bm and bm.get('family') and sh['type']:
        t = sh['type']
        out.append(f'- **Type (the brand\'s face in the dealt setting):** {bm["family"]}, weights {t["weights"][0]}/{t["weights"][1]}, '
                   f'{t["case"]}; {t["notes"]}.')
    elif sh['type']:
        out += ['- **Type (dealt):**'] + ['  ' + x for x in _type_lines(sh['type'], sh.get('seed'), d['id'], (sh.get('type_pair') or {}).get('id'))]
    else:
        out += ['- **Type:** the brand fixes it (`--keep type`); set it in the roles of §4.']
    gf = sh.get('ground_family')
    if gf:
        out.append(f'- **Ground family (dealt): `{gf["id"]}`, {gf["name"]}.** {gf["what"]}; type {gf["type"]}; colour field: '
                   f'{gf["field"]}; the one colour event: {gf["event"]}. One family for the whole film, never cut '
                   f'(`fx/Grounds` `<FamilyGround family="{gf["id"]}">`, its inks from `familyInks()`; tokens: '
                   f'`python3 scripts/palette.py --accent <accent> --family {gf["id"]}`). With a colour field, at least one '
                   'line sits on it. Never the family of the last films (references/brand-and-color.md §9b).')
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
            '- **The words are a script:** plain words a stranger understands within 5 s, written before any build: '
            'line 1 (or 2) says what the product is by 3 s ("[Name] is a [plain category] for [who]." or "[Name] '
            'turns [input] into [output]."), then 3-5 lines that each say one concrete thing it does while the UI '
            'shows it, then the name and what to do; 2-7 words a line, one claim each, no metaphor, slogan or fancy '
            'word (`python3 scripts/copy-check.py TREATMENT.md`). One clean line on screen at a time, each with its '
            'own text animation (pick.py draws one per line; `TypeLine` from `fx/TypePresets.tsx` plays the presets), '
            'with this direction\'s camera and graphic effects around it. Never a pile of keywords.', '',
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
            'With a supplied logo (brand/brand.json, src/brand/logo.ts) the mark is the real logo drawn part by part '
            '(`LogoMark`, `AssembledMark`, `Lockup`), and it arrives through this lockup\'s device, centred and built from '
            'the film\'s last element (the ten end-card designs in references/devices/logo-and-end-card.md); never a '
            'lockup faded in from nowhere over a radial plate.', '']
    if sh.get('changes'):
        out += [f'## 8. Beat skeleton: an update film ({sh["changes"]} changes, {sh["seconds"]:g} s)', '',
                'The name and the version first ("[Name] [version]" by 3 s), then each change as a product moment (the '
                'product doing the new thing in this direction\'s device, never a list, a changelog row or a bullet), one '
                f'payoff, and the end card with the version. One plain sentence per change ({SCRIPT_LINE[0]}-{SCRIPT_LINE[1]} words) that says the result '
                'the picture just showed, one line at a time, at 72 px or more.', '']
    else:
        out += [f'## 8. Beat skeleton ({sh["seconds"]:g} s)', '']
    out += ['| # | beat | time | picture | line |', '|---|---|---|---|---|']
    words = 0
    first = True  # the first line says what the product is (an update film: the name and the version)
    for i, b in enumerate(sh['skeleton'], 1):
        c = b['copy']
        name = bool(c) and c['words'][1] <= 2 and bool(re.search(r'\b(name|version|wordmark)\b', c['what'], re.I))  # not a sentence
        what = c['what'] if c else ''
        if c and not name and first:
            what = ('the name and the version ("[Name] [version]"), by 3 s' if sh.get('changes')
                    else f'what it is, by 3 s ("[Name] is a [plain category] for [who]."), over {what}')
            first = False
        elif name and b is sh['skeleton'][-1]:
            what = f'{what}, and what to do (a URL, "Out now")'
        cs = (f'{what} (not a sentence)' if name else f'one sentence: {what}') if c else '(picture only)'
        words += 1 if c and not name else 0
        out.append(f'| {i}{" *" if b["signature"] else ""} | {b["beat"]} | {b["from_s"]:.1f}-{b["to_s"]:.1f} s '
                   f'(f{b["from_f"]}-f{b["to_f"]} @60) | {b["picture"]} | {cs} |')
    hand = next((b.get('handoff') for b in sh['skeleton'] if b.get('change')), None)
    if hand:
        out += ['', f'From one change to the next: {hand}.']
    out += ['', f'{words} beats carry a line here. Write the script first (5-8 plain sentences for a launch film: what it '
                'is, 3-5 things it does, the close; 4-6 for an update film; a beat may carry two lines one after the other), '
                'run copy-check.py on it, then give each beat its sentence. Retell '
                'every beat in the product\'s own objects; the beats are the shape, not the content.', '',
            '## 9. The picture never rests', '',
            f'- **Life inside a shot:** {cam["in_shot"]}',
            f'- **The floor against a flat film** (checked on renders): the camera or the ground moves on at least '
            f'{int(floor.get("moving_body_frames", .7) * 100)} % of body frames; at least two depth planes move at different '
            f'rates in at least {int(floor.get("depth_planes_shot_share", .5) * 100)} % of shots; at least '
            f'{int(floor.get("carried_seams_min", .4) * 100)} % of seams are carried; one of this direction\'s devices at work at '
            f'least every {floor.get("signature_device_every_s", 3)} s (the signature shot itself happens once); {floor.get("light_events_per_act", 1)} light event per act; a '
            f'clear scale change on at least {int(floor.get("scale_contrast_cut_share", .3) * 100)} % of cuts.', '',
            '## 10. Music', '',
            f'- A licensed track (every film has one): {mus["bpm"][0]}-{mus["bpm"][1]} BPM, {mus["feel"]}; a `{mus["ending"]}` ending.']
    out.append(f"- Find this film's own track: `node scripts/music.mjs search --mood \"<the brief's mood words>\" "
               f'--bpm {mus["bpm"][0]}-{mus["bpm"][1]} --length <film s>`, `sheet --measure`, `get #n --to audio/music` '
               "(`references/music.md`); the finder holds back the last film's track and the example films' tracks.")
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
            '2. Write the script (TREATMENT.md, Script) in plain words: what the product is by 3 s, 3-5 things it does, '
            'the name and what to do; 2-7 words a line, one clean line on screen at a time. `python3 scripts/copy-check.py '
            'TREATMENT.md` passes before any picture work.',
            f'3. Draw the techniques (the picture plan, and one text animation per line): `{pick_cmd} --lines <n>`.' + ('' if has_dir else
               ' Retell every pick in this direction\'s world and camera; a pick that fights the direction counts as '
               'fighting the concept (reroll it with `--category <cat> --exclude <id>`, at most twice).'),
            '4. Write the treatment on the skeleton above: the beats, each sentence with its text animation, the device '
            'path, the signature beat and the lockup.',
            '5. Redraw a slot only for a stated reason: `python3 scripts/deck.py --redraw palette|type|signature|direction '
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
            f'Light ({w["light_kind"]}): {w["light"]} Built: {w["light_build"]} Texture: {w["texture"]}.', '']
    img = _imagery_lines(d)
    if img:
        out += img + ['']
    out += ['**Palettes.**']
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
    if isinstance(d.get('update'), dict):
        u = d['update']
        out += ['', f'**Update skeleton ({u["seconds"][0]}-{u["seconds"][1]} s; the change beat repeats for each of 2-4 changes).**']
        for part in UPDATE_PARTS:
            b = u[part]
            cpy = f'{b["copy"]["words"][0]}-{b["copy"]["words"][1]} words: {b["copy"]["what"]}' if b.get('copy') else 'picture only'
            out.append(f'- {part}{" *" if b.get("signature") else ""}: {b["picture"]} [{cpy}]'
                       + (f' Hand over: {b["handoff"]}.' if b.get('handoff') else ''))
    out += ['', '**Avoid.**'] + [f'- {a}' for a in d['avoid']]
    return '\n'.join(out) + '\n'


def guard_out(outdir):
    """The sheet belongs to the film project: an out/ inside the skill's own folder (deck.py run from there with the
    default --out) is refused. A project's own copy of the scripts has no SKILL.md beside it and writes freely."""
    skill = os.path.dirname(HERE)
    if not os.path.isfile(os.path.join(skill, 'SKILL.md')):
        return
    o, k = os.path.normcase(os.path.realpath(outdir)), os.path.normcase(os.path.realpath(skill))
    if o == k or o.startswith(k.rstrip(os.sep) + os.sep):
        fail(f'--out {outdir} is inside the skill folder ({skill}): run deck.py from the film project (its out/), '
             'or pass --out <film>/out')


# ------------------------------------------------------------------------------------------- the creative elements
# Every film gets two or three creative elements (assets/remotion-starter/src/fx/creative: finished devices that each
# carry a whole beat, the product's scene inside them), dealt at random from the whole library: seeded by the film's
# name and the film history, recency-weighted (a device the last films played comes up late, so films walk the whole
# library), never the set of a recent film, at least one device no recent film played, at most one device shared with
# the last one, at least one that draws a line and one that draws a picture, never two of one family. The library is read from the project's own
# src/fx/creative/meta.ts (else the skill's starter), so the deck and the film never name different devices. A device
# that needs something the brief does not have (logos: the products it works with; number: a real figure; photos) is
# dealt only when --have says so or the brief says it (works with ..., a figure in it).
CREATIVE_N = 3
CREATIVE_NEED_HAVE = {'logos': 'logos', 'count': 'number', 'photos': 'photos'}
CREATIVE_WRITE = {'swap': 'alts (2-3 alternatives its key word rolls through)', 'logos': 'logos (the products it works with: scripts/logos.mjs get <name>)',
                  'count': "count (a real figure: { to: 3.2, suffix: 'x' })", 'before': 'before (2-4 steps of the old way)', 'photos': 'photos (public/ paths)'}
_META_LINE = re.compile(r"\{\s*id:\s*'([a-z0-9-]+)',\s*role:\s*'(line|picture)',\s*family:\s*'([a-z0-9-]+)',\s*needs:\s*\[([^\]]*)\],\s*prefer:\s*'([a-z]+)'(.*?)about:\s*'((?:[^'\\]|\\.)*)'\s*\}")


def creative_library(root=None):
    """[{id, role, family, needs, prefer, about}] from <root>/src/fx/creative/meta.ts, else the skill's starter copy."""
    paths = ([os.path.join(root, 'src', 'fx', 'creative', 'meta.ts')] if root else []) + \
        [os.path.join(p, 'fx', 'creative', 'meta.ts') for p in STARTER_SRC]
    for p in paths:
        if os.path.isfile(p):
            with open(p, encoding='utf-8') as fh:
                src = fh.read()
            out = []
            for m in _META_LINE.finditer(src):
                out.append({'id': m.group(1), 'role': m.group(2), 'family': m.group(3), 'needs': re.findall(r"'([a-z]+)'", m.group(4)),
                            'prefer': m.group(5), 'about': m.group(7).replace("\\'", "'")})
            if out:
                return out
    return []


def project_name(root):
    """The product's name as the project writes it (src/brand/identity.ts), else None (an unnamed scaffold's [..] too)."""
    p = os.path.join(root, 'src', 'brand', 'identity.ts')
    if not os.path.isfile(p):
        return None
    with open(p, encoding='utf-8') as fh:
        m = re.search(r"""name:\s*["'`]([^"'`]+)["'`]""", fh.read())
    name = m.group(1).strip() if m else None
    return None if not name or (name.startswith('[') and name.endswith(']')) else name


def recent_creative(history_on):
    """The creative sets of the last films, newest first: the film history (each film's deal), then the deal history."""
    sets = []
    for f in film_history(history_on):
        c = (f.get('deal') or {}).get('creative') or (f.get('devices') or {}).get('creative')
        if isinstance(c, list) and c:
            sets.append([x for x in c if isinstance(x, str)])
    for h in read_history(history_on):
        c = h.get('creative')
        if isinstance(c, list) and c:
            sets.append([x for x in c if isinstance(x, str)])
    seen, out = set(), []
    for s in sets:
        k = tuple(sorted(s))
        if k not in seen:
            seen.add(k)
            out.append(s)
    return out[:4]


PHOTOS_MIN = 5  # photo devices stream pictures: fewer than five read as a sparse row
_IMG = ('.jpg', '.jpeg', '.png', '.webp', '.avif')


def count_photos(root):
    """Images in the project's public/ that can be the film's photos (not its fonts, marks, audio or input clip)."""
    pub = os.path.join(root or '', 'public')
    n = 0
    if root and os.path.isdir(pub):
        for dp, dn, fn in os.walk(pub):
            dn[:] = [x for x in dn if x not in ('fonts', 'logos', 'audio', 'brand')]
            n += sum(1 for f in fn if f.lower().endswith(_IMG))
    return n


# The devices that tell a direction's story shape (each takes CREATIVE_FIT_X in the shuffle), the ones the brief's own
# words ask for (CREATIVE_WORDS), and what a type-led or an imagery-led direction leans on: the deal stays random, but a
# film about the old way leans toward split-compare, a film about many things toward zoom-wall.
CREATIVE_FIT = {
    'problem-turn': ('split-compare', 'bubble-swarm', 'colour-flood', 'word-swap'),
    'journey': ('cursor-follow', 'dot-button', 'shape-morph'),
    'one-to-many': ('zoom-wall', 'logo-orbit', 'pixel-assemble'),
    'many-to-one': ('bubble-swarm', 'logo-orbit', 'pixel-assemble', 'type-object'),
    'detail-to-whole': ('zoom-wall', 'cursor-follow', 'type-window'),
    'whole-to-detail': ('cursor-follow', 'type-window', 'split-around'),
    'assembly': ('pixel-assemble', 'shape-morph', 'letter-swing'),
    'chain': ('dot-button', 'cursor-follow', 'type-object'),
    'day-arc': ('zoom-wall', 'data-sculpture', 'photo-arc'),
    'call-response': ('split-around', 'word-swap', 'cursor-follow'),
    'twist': ('word-swap', 'object-turn', 'colour-flood'),
    'accelerando': ('bubble-swarm', 'zoom-wall', 'data-sculpture'),
    'result-first': ('colour-flood', 'object-turn', 'scale-contrast'),
    'nested': ('type-window', 'zoom-wall', 'split-around'),
    'loop': ('shape-morph', 'object-turn', 'letter-swing'),
    'reveal': ('type-window', 'object-turn', 'shape-morph', 'scale-contrast'),
}
CREATIVE_WORDS = [
    (r'\b(tap|taps|click|clicks|press|one button|a button)\b', ('cursor-follow', 'dot-button')),
    (r'\b(instead of|no more|old way|by hand|manual(ly)?|before and after|used to)\b', ('split-compare', 'bubble-swarm')),
    (r'\b(every|all your|hundreds|thousands|any number of)\b', ('zoom-wall', 'pixel-assemble')),
    (r'\b(messages|pings|questions|notifications|emails|threads)\b', ('bubble-swarm',)),
    (r'\b(faster|times|percent|%|hours saved)\b', ('data-sculpture',)),
]
CREATIVE_FIT_X = 2.5
CREATIVE_LINE_X = 1.6  # a type-led direction: line devices
CREATIVE_PHOTO_X = 2.0  # an imagery-led direction: photo devices (with the photos)


def creative_fit(dev, direction=None, brief=''):
    """How much a device suits the direction and the brief (1 = neutral; the deal multiplies its recency weight)."""
    w = 1.0
    if direction:
        if dev['id'] in CREATIVE_FIT.get((direction.get('story') or {}).get('shape', ''), ()):
            w *= CREATIVE_FIT_X
        if dev['role'] == 'line' and is_type_led(direction):
            w *= CREATIVE_LINE_X
        if 'photos' in dev['needs'] and is_imagery(direction):
            w *= CREATIVE_PHOTO_X
    b = (brief or '').lower()
    for pat, ids in CREATIVE_WORDS:
        if dev['id'] in ids and re.search(pat, b):
            w *= 1.8
            break
    return w


def creative_haves(have, brief, photos=None):
    """What the film can give a device beyond its script: --have, and what the brief says (works with ..., a figure);
    photos only with PHOTOS_MIN pictures or more when their count is known."""
    out = set(have or ())
    b = (brief or '').lower()
    if re.search(r'\b(works? with|integrat\w*|connects? (to|with)|plugs? into|syncs? with|for (slack|github|notion|figma|gmail|google))\b', b):
        out.add('logos')
    if re.search(r'\d', b):
        out.add('number')
    if re.search(r'\b(photos?|photographs?|pictures|camera roll|albums?|gallery|galleries)\b', b):
        out.add('photos')
    if photos is not None and photos < PHOTOS_MIN:
        out.discard('photos')
    return out


# How much a device the recent films played weighs in the shuffle, by how recent the film is (the last film first): a
# device the last films never played is drawn first far more often, so a run of films walks the whole library instead of
# circling the same few. Weights multiply over the films that played it.
CREATIVE_RECENT_WEIGHT = (0.12, 0.3, 0.55, 0.8)


def creative_weight(d, recent):
    """The device's weight in the shuffle: 1, times CREATIVE_RECENT_WEIGHT[i] for each recent film i that played it."""
    w = 1.0
    for i, s in enumerate(list(recent)[:len(CREATIVE_RECENT_WEIGHT)]):
        if d['id'] in s:
            w *= CREATIVE_RECENT_WEIGHT[i]
    return w


def deal_creative(lib, name, brief, have, recent=(), n=CREATIVE_N, direction=None, photos=None):
    """{deal, reserve, seed_key, haves} or None without a library. A seeded, recency-weighted shuffle of the devices the
    film can feed (a device the last films played is drawn late: CREATIVE_RECENT_WEIGHT), the first line device, the first
    picture device, then the next of another family; re-dealt until no recent set repeats, at least one device is fresh
    (played by none of the recent films) while one can be, and at most one device is shared with the last film (none
    while a draw can avoid it)."""
    if not lib:
        return None
    haves = creative_haves(have, brief, photos)
    ok = [d for d in lib if all(CREATIVE_NEED_HAVE.get(x) is None or CREATIVE_NEED_HAVE[x] in haves for x in d['needs'])]
    last = list(recent[0]) if recent else []
    played = {x for s in recent for x in s}
    fresh_left = any(d['id'] not in played for d in ok)
    key = '|'.join([(name or brief or '').strip().lower(), ';'.join(','.join(sorted(s)) for s in recent)] + ([direction['id']] if direction else []))
    fit = {d['id']: creative_fit(d, direction, brief) for d in ok}
    for salt in range(64):
        rng = random.Random(hashlib.sha256(f'{key}#creative#{salt}'.encode('utf-8')).hexdigest())
        # weighted shuffle (Efraimidis-Spirakis): each device's key u ** (1 / w), largest first
        order = sorted(ok, key=lambda d: rng.random() ** (1.0 / (creative_weight(d, recent) * fit[d['id']])), reverse=True)
        pick = []

        def take(cond):
            for d in order:
                if d not in pick and all(p['family'] != d['family'] for p in pick) and cond(d):
                    pick.append(d)
                    return

        take(lambda d: d['role'] == 'line')
        take(lambda d: d['role'] == 'picture')
        while len(pick) < n:
            had = len(pick)
            take(lambda d: True)
            if len(pick) == had:
                break
        ids = [d['id'] for d in pick]
        # the first half of the draws shares nothing with the last film; then one device at most; and while a fresh
        # device exists, at least one of the deal is fresh (the first 48 draws)
        if any(sorted(ids) == sorted(s) for s in recent) or len(set(ids) & set(last)) > (0 if salt < 32 else 1):
            continue
        if fresh_left and salt < 48 and all(x in played for x in ids):
            continue
        reserve = [d['id'] for d in order if d['id'] not in ids] + [d['id'] for d in lib if d not in ok]
        return {'deal': ids, 'reserve': reserve, 'seed_key': key, 'haves': sorted(haves),
                'fits': [i for i in ids if fit.get(i, 1.0) > 1.0]}
    return None


def template_plays_creative(root):
    """False when the project's template deals but never plays a creative element (its src/deal.ts imports nothing from
    fx/creative: the update template's creative beats are its hero shots), else True (launch-simple, the bare starter)."""
    p = os.path.join(root, 'src', 'deal.ts')
    if not os.path.isfile(p):
        return True
    with open(p, encoding='utf-8') as fh:
        return bool(re.search(r'''from\s+['"]\./fx/creative/''', fh.read()))


CREATIVE_NOT_PLAYED = ('\n## The creative elements: not played\n\nThis template plays no creative element (src/deal.ts imports none '
                       'from fx/creative): its own devices carry those beats (a spine template: the device each act verb asks for, drawn by its house scene; the update template: its hero shots). The deal goes to the film history only; build '
                       'nothing for it.\n')


def creative_lines(c, lib):
    """The DIRECTION.md section for the dealt creative elements."""
    if not c:
        return ''
    by = {d['id']: d for d in lib}
    out = ['', '## The creative elements (dealt; at least half the beats)', '',
           'Each takes a whole beat with the product inside it (references/catalogue.md §0; the template maps them onto the beats:',
           '`npx tsx -e "import { CREATIVE_PLAN } from \'./src/timeline\'; console.log(CREATIVE_PLAN)"`). Build them; swap one at most,',
           'with the reason (launch.ts `creative.swap`), and only for another creative element.', '']
    for i in c['deal']:
        d = by.get(i, {})
        need = [CREATIVE_WRITE[x] for x in d.get('needs', []) if x in CREATIVE_WRITE]
        out.append(f"- `{i}` ({d.get('role', '?')}): {d.get('about', '')}" + (f"; write {', '.join(need)} on its pair" if need else ''))
    return '\n'.join(out) + '\n'


# --------------------------------------------------------------------------------- the template's deal (one source)
# A template that deals its own devices (launch-simple's src/deal.ts: voice, ground, seamTA, seamAT, seamAA, end, camera) plays
# the deck's direction instead of a second deal from the product's name: deck.py maps the dealt direction onto the
# template's slots and writes src/dealt.ts, which deal.ts reads first (launch.ts `pin` still fixes a slot by hand).
# The vocabularies are read from the project's own deal.ts, so the deck and the template never name different devices.
SEAM_TA = {'morph': 'matchCut', 'mask': 'matchCut', 'hard': 'matchCut', 'stepped': 'matchCut', 'snapZoom': 'matchCut',
           'zoomThrough': 'matchCut', 'velocity': 'velocityCut', 'whip': 'velocityCut', 'wipe': 'velocityCut',
           'defocus': 'blurThrough', 'breath': 'blurThrough', 'light': 'blurThrough', 'dissolveUi': 'blurThrough',
           'colour': 'blurThrough'}
PUSH_SEAMS = ('zoomThrough', 'snapZoom')
# picture -> picture: one camera move carried across (velocity), a point held on the kept ground (morph), a blur
SEAM_AA = {'velocity': 'velocityCut', 'whip': 'velocityCut', 'wipe': 'velocityCut', 'morph': 'matchCut', 'mask': 'matchCut',
           'hard': 'matchCut', 'zoomThrough': 'matchCut', 'snapZoom': 'matchCut', 'defocus': 'blurThrough',
           'breath': 'blurThrough', 'light': 'blurThrough', 'dissolveUi': 'blurThrough'}
BADGE_LOCKUPS = ('world-object', 'pull-back', 'light-finds', 'resolve')  # the hero object turns as it becomes the mark
# The worlds (fx/world) a template's `ground` slot may hold instead of ground families: the place a film stands in, with
# its key light. Each dealt ground family maps to the worlds that keep its tone and its light (its first fits best); an
# imagery-led direction leans to the photographic plates. A plate world needs its picture fetched (PLATE_WORLDS).
WORLD_KINDS = ('nearWhite', 'paleSky', 'blackField', 'deepField', 'electric', 'clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro')
PLATE_WORLDS = ('clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro')
DARK_WORLDS = ('blackField', 'deepField', 'nightCity', 'electric', 'clouds', 'aerial', 'sea', 'macro')
NIGHT_WORLDS = ('blackField', 'deepField', 'nightCity')
# A world is its kind AND its hue (OKLCH degrees): a deep field at a green accent and one at a blue accent are two places,
# two films at one kind and one hue the same place. Hues closer than WORLD_SAME_HUE read as one; the near-neutral worlds
# show too little hue to tell two films apart. world_hue() mirrors the pictures: launch-simple lights its looks in the
# accent's own hue (src/world.tsx), the starter's fx/world reads it through a window per world (worlds.ts WORLD_HUE:
# lo, hi, the cool default outside it). The deal leaves out a world a recent film stood in at this film's hue, and
# records the world and its hue in the deal history (film-diff.mjs --record keeps them in the film history).
WORLD_SAME_HUE = 40
NEUTRAL_WORLDS = ('blackField', 'nearWhite', 'studio')
FX_WORLD_HUE = {'electric': (228, 266, 258), 'deep': (195, 266, 252), 'plate': (195, 266, 236), 'neutral': (140, 266, 245)}


def world_hue(kind, accent, template=None):
    """The hue (OKLCH degrees, rounded) world `kind` takes in a film whose accent is `accent`, else None."""
    if kind not in WORLD_KINDS or not (isinstance(accent, str) and HEX.match(accent)):
        return None
    _, c, h = hex_oklch(accent)
    if template == 'launch-simple':
        return round(h) % 360
    win = 'electric' if kind == 'electric' else 'deep' if kind in ('deepField', 'nightCity') else 'neutral' if kind in NEUTRAL_WORLDS else 'plate'
    lo, hi, dflt = FX_WORLD_HUE[win]
    return round(h) % 360 if c >= 0.04 and lo <= h < hi else dflt


def same_place(kind, hue, other, other_hue):
    """Two films stand in the same place: one world kind, and a hue under WORLD_SAME_HUE apart (or a neutral world, or
    a hue nobody recorded)."""
    if kind != other:
        return False
    if kind in NEUTRAL_WORLDS or not isinstance(hue, (int, float)) or not isinstance(other_hue, (int, float)):
        return True
    d = abs(hue - other_hue) % 360
    return min(d, 360 - d) < WORLD_SAME_HUE


def _dir_key(p):
    return os.path.normcase(os.path.normpath(os.path.abspath(p))) if p else None


def project_accent(root):
    """The accent of a project (src/brand/tokens.ts `accent: '#RRGGBB'`), else None."""
    p = os.path.join(root, 'src', 'brand', 'tokens.ts')
    try:
        with open(p, encoding='utf-8') as fh:
            m = re.search(r"""\baccent:\s*['"](#[0-9A-Fa-f]{6})['"]""", fh.read())
    except OSError:
        return None
    return m.group(1).upper() if m else None


def project_template(root):
    try:
        with open(os.path.join(root, 'film.json'), encoding='utf-8') as fh:
            t = json.load(fh).get('template')
        return t if isinstance(t, str) else None
    except (OSError, ValueError, AttributeError):
        return None


def recent_worlds(history_on, skip_dir=None):
    """[(world, hue)] of the last three films, newest first: the film history (devices.world and .hue, else its deal's
    ground), then the deal history (each template deal's world and hue: a film dealt but not yet recorded counts); a film
    counts once (by its folder), and this film's own earlier deals never."""
    rows = []
    for f in film_history(history_on):
        dv = f.get('devices') or {}
        rows.append((dv.get('world') or (f.get('deal') or {}).get('ground'), dv.get('hue'), f.get('dir')))
    rows += [(h.get('world'), h.get('hue'), h.get('dir')) for h in read_history(history_on) if h.get('world')]
    out, seen, own = [], set(), _dir_key(skip_dir)
    for w, hue, d in rows:
        k = _dir_key(d)
        if w not in WORLD_KINDS or (k and k == own) or (k and k in seen):
            continue
        if k:
            seen.add(k)
        out.append((w, hue if isinstance(hue, (int, float)) else None))
    return out[:3]


def world_context(root, inp, history_on):
    """What the world deal reads: the recent worlds, this film's accent and its template."""
    acc = None
    if (inp or {}).get('brand'):
        try:
            acc = read_brand(inp['brand'])['accent']
        except SystemExit:
            acc = None
    return {'recent': recent_worlds(history_on, root), 'accent': acc or project_accent(root), 'template': project_template(root)}


FAMILY_WORLDS = {
    'nearWhite': ('nearWhite', 'studio', 'paleSky', 'sky'), 'lightStudio': ('studio', 'nearWhite', 'paleSky'),
    'softSky': ('paleSky', 'sky', 'clouds'), 'gradientField': ('paleSky', 'sky', 'electric'),
    'whiteBand': ('electric', 'nearWhite', 'paleSky'), 'blackField': ('blackField', 'nightCity', 'deepField'),
    'studio': ('blackField', 'deepField', 'nightCity'), 'deepPool': ('deepField', 'electric', 'nightCity'),
    'duskMesh': ('clouds', 'aerial', 'sea'), 'floorGlow': ('deepField', 'blackField', 'nightCity'),
    'lightDark': ('clouds', 'blackField', 'sea'),
}
IMAGERY_WORLDS = ('clouds', 'aerial', 'sea', 'macro', 'sky', 'nightCity')
# What each photographic world is a picture of, in the words a brief uses: a plate is a place, and a film stands in a
# place that belongs to its subject (a night city under a ceramics class's launch is a stock photo about nothing in the
# film). A plate whose subject the brief never names ranks below the built worlds; one it names ranks first.
WORLD_SUBJECTS = {
    'nightCity': r'\b(city|cities|urban|night|nightlife|nights|street|streets|downtown|bars?|clubs?|restaurants?|taxis?|rides?|metro|subway|neon)\b',
    'clouds': r'\b(clouds?|sky|skies|flights?|fly|flying|airline|travel|trips?|weather|dreams?|calm|focus|sleep|meditat\w*)\b',
    'sky': r'\b(sky|skies|weather|outdoors?|sun|sunny|forecast|solar|light|air)\b',
    'aerial': r'\b(maps?|routes?|trails?|hikes?|hiking|hikers?|drives?|driving|land|farms?|logistics|outdoors?|places?|explore|exploring|trips?|travel|mountains?|cycling|runs?|running)\b',
    'sea': r'\b(seas?|ocean|sail\w*|boats?|surf\w*|beach\w*|swim\w*|water|islands?|coast\w*|ships?|shipping|ports?|marine)\b',
    'macro': r'\b(plants?|gardens?|gardening|nature|leaf|leaves|green|grow\w*|organic|eco|forests?|tea|coffee|herbs?|flowers?)\b',
    'studio': r'\b(studios?|makers?|craft\w*|ceramics?|pottery|potters?|products?|shops?|stores?|photos?|photography|designs?|designers?|fashion|furniture|objects?|brands?|handmade|artists?)\b',
}


def world_fit(w, brief):
    """1 when the brief names what plate world `w` is a picture of, 0 when it names nothing of it, None for a built world."""
    if w not in PLATE_WORLDS:
        return None
    return 1 if re.search(WORLD_SUBJECTS.get(w, r'(?!x)x'), brief or '', re.I) else 0


def world_prefs(sh, name=''):
    """(ranked worlds, why) for a direction: its ground family's worlds (an imagery-led direction's plates first), the top
    three in a seeded order (the film's name: two films of one direction stand in different places), then the rest; then
    the brief decides the photographs: a plate world whose subject the brief names comes first, one it does not name goes
    after every built world (a film stands in a place that belongs to it, or in a lit field, never in a stock photo of
    something else)."""
    d = sh['direction']
    fam = (sh.get('ground_family') or {}).get('id')
    brief = (sh.get('input') or {}).get('brief', '') or sh.get('brief', '')
    base = list(FAMILY_WORLDS.get(fam, ()))
    if is_imagery(d):
        base = [w for w in IMAGERY_WORLDS if w not in base][:2] + base
    top = list(dict.fromkeys(base))[:3]
    rng = random.Random(hashlib.sha256(f"world|{(name or '').strip().lower()}|{d['id']}".encode('utf-8')).hexdigest())
    rng.shuffle(top)
    ranked = top + [w for w in base if w not in top] + [w for w in WORLD_KINDS if w not in base]
    fit = [w for w in ranked if world_fit(w, brief) == 1]
    built = [w for w in ranked if world_fit(w, brief) is None]
    unfit = [w for w in ranked if world_fit(w, brief) == 0]
    ranked = fit + built + unfit
    why = f"the world for ground family {fam}" + (' (an imagery-led direction: a photograph first)' if is_imagery(d) else '') if fam else 'no ground family dealt'
    if fit:
        why += f"; the brief names {', '.join(fit[:2])}"
    return ranked, why
LAND_MOTIONS = ('crane', 'dolly', 'push')  # a camera that travels: each picture takes one push that lands


def _ts_lists(src, name):
    """{slot: [choices]} of a `const NAME = { slot: ['a', 'b'], ... }` (or `{ slot: 'a', ... }`) block in a TS file."""
    m = re.search(r'\b' + re.escape(name) + r'\b[^=]*=\s*\{(.*?)\}', src, re.S)
    if not m:
        return {}
    out = {}
    for k, v in re.findall(r"(\w+)\s*:\s*(\[[^\]]*\]|'[^']*'|\"[^\"]*\")", m.group(1)):
        vals = re.findall(r"['\"]([^'\"]+)['\"]", v)
        out[k] = vals if v.startswith('[') else (vals[0] if vals else None)
    return out


def template_slots(root):
    """(devices, floor) from the project's src/deal.ts when it reads the deck's deal (imports ./dealt), else (None, None)."""
    p = os.path.join(root, 'src', 'deal.ts')
    if not os.path.isfile(p):
        return None, None
    with open(p, encoding='utf-8') as fh:
        src = fh.read()
    if not re.search(r'''from\s+['"]\./dealt['"]''', src):  # a template that deals but does not read the deck's deal
        return None, None
    dev = {k: v for k, v in _ts_lists(src, 'DEVICES').items() if isinstance(v, list) and v}
    floor = {k: v for k, v in _ts_lists(src, 'FLOOR').items() if isinstance(v, str)}
    return (dev or None), floor


def recent_template(history_on):
    """{slot: [choices of the last three films]} from the film history (each film's deal and devices)."""
    out = {}
    for f in film_history(history_on):
        pick = dict(f.get('devices') or {}, **(f.get('deal') or {}))
        for k, v in pick.items():
            if isinstance(v, str) and v:
                out.setdefault(k, []).append(v)
    return out


def template_deal(sh, devices, floor, recent=None, place=None):
    """The direction mapped onto the template's slots: {slot: choice}, and {slot: why}. Each slot takes the first of the
    direction's own preferences that the last three films did not play (else the first), and at least half the slots
    differ from the template's floor (the scaffold's own look), the least telling slots giving way first. A world
    (`ground` holding worlds) is fresh unless a recent film stood in it at this film's hue (`place`: world_context)."""
    d = sh['direction']
    seams = list(d['cuts'].get('seams') or [])
    modes = d['type'].get('modes') or ['build']
    motion = str(d['camera'].get('motion') or 'drift')
    lk = d['lockup']['kind']
    fam = (sh.get('ground_family') or {}).get('id')
    ta = list(dict.fromkeys(SEAM_TA[x] for x in seams if x in SEAM_TA))
    push = any(x in seams for x in PUSH_SEAMS)
    if modes[0] == 'build':
        voice = (['build', 'ink', 'blur'], 'type mode build')
    elif 'defocus' in seams:
        voice = (['blur', 'ink', 'build'], f'type mode {modes[0]} with defocus seams')
    else:
        voice = (['ink', 'blur', 'build'], f'type mode {modes[0]}')
    worlds = 'clouds' in (devices.get('ground') or ())
    pref = {
        'voice': voice,
        'ground': world_prefs(sh, sh.get('name', '')) if worlds else ([fam] if fam else [], f'ground family {fam}' if fam else 'no ground family dealt'),
        'seamTA': (ta, 'seams ' + ', '.join(seams[:4])),
        'seamAT': ((['zoomThrough', 'recede'] if push else ['recede', 'zoomThrough']),
                   'a push seam: the camera goes through the picture' if push else 'no push seam: the picture falls back under the line'),
        'seamAA': (list(dict.fromkeys(SEAM_AA[x] for x in seams if x in SEAM_AA)), 'seams ' + ', '.join(seams[:4])),
        'end': ((['badge', 'element'] if lk in BADGE_LOCKUPS else ['element', 'badge']), f'lockup {lk}'),
        'camera': ((['land', 'still'] if motion in LAND_MOTIONS else ['still', 'land']), f'camera {motion}'),
    }
    recent = recent or {}
    deal, why, order, fresh_of = {}, {}, {}, {}
    wc = place or {}
    hue_of = lambda c: world_hue(c, wc.get('accent'), wc.get('template'))  # noqa: E731
    for slot, choices in devices.items():
        p, reason = pref.get(slot, ([], 'nothing in the direction'))
        ranked = [c for c in p if c in choices] + [c for c in choices if c not in p]
        order[slot] = ranked
        if slot == 'ground' and place is not None and any(c in WORLD_KINDS for c in ranked):
            # the world and its hue: a kind a recent film stood in is free again at a hue WORLD_SAME_HUE or more away
            fresh = [c for c in ranked if not any(same_place(c, hue_of(c), w, h) for w, h in wc.get('recent', []))]
            taken = "stood in a recent film's world at this hue"
        else:
            fresh = [c for c in ranked if c not in recent.get(slot, [])]
            taken = "was a recent film's"
        fresh_of[slot] = fresh
        deal[slot] = (fresh or ranked)[0]
        why[slot] = reason + ('' if deal[slot] == ranked[0] else f" (its first choice, {ranked[0]}, {taken})")
        if slot == 'ground' and place is not None and deal[slot] in WORLD_KINDS and hue_of(deal[slot]) is not None:
            why[slot] += f'; hue {hue_of(deal[slot])}'
    if floor:
        slots = [x for x in devices if x in floor]
        for slot in ('camera', 'seamAT', 'seamAA', 'end', 'voice', 'seamTA', 'ground'):
            if 2 * sum(deal[x] != floor[x] for x in slots) >= len(slots):
                break
            if slot in slots and deal[slot] == floor[slot]:
                alt = next((c for c in order[slot] if c != floor[slot] and c in fresh_of[slot]), None) or next((c for c in order[slot] if c != floor[slot]), None)
                if alt:
                    deal[slot] = alt
                    why[slot] += f" (moved off the template's own {floor[slot]}: half the slots differ from the scaffold)"
    return deal, why


def dealt_palette(brand):
    """The palette a scene-bank template paints with, from the sheet's brand mapping (deck.py --brand): the accent, and
    the ground by its tone (a light ground and its ink; a dark one as the near-black). None without a mapping: the
    template then takes the brand tokens, or a house accent dealt by the direction (src/palette.ts)."""
    if not brand or not (brand.get('accent') or {}).get('hex'):
        return None
    out = {'accent': brand['accent']['hex']}
    g = (brand.get('ground') or {}).get('hex')
    tone = brand.get('tone')
    if g and tone in ('dark', 'mid'):
        out['night'] = g
    elif g and tone != 'field':
        out['ground'] = g
        if (brand.get('ink') or {}).get('hex'):
            out['ink'] = brand['ink']['hex']
    return out


def plays_bank(root):
    """True for a template that assembles its film from the scene bank (src/bank.ts beside src/deal.ts: launch-simple)."""
    return bool(root) and os.path.isfile(os.path.join(root, 'src', 'bank.ts'))


def dealt_body(direction, deal, creative, hero=None, palette=None):
    """src/dealt.ts: the direction's deal, the film's creative elements, its hero shots and, for a template that paints
    its scenes from one palette (launch-simple src/palette.ts), the brand-mapped palette (deal.ts reads it first)."""
    obj = {'direction': direction, 'deal': deal}
    if creative:
        obj['creative'] = creative['deal']
        obj['reserve'] = creative['reserve']
    if hero:
        obj['hero'] = hero['deal']
        obj['heroReserve'] = hero['reserve']
    if palette:
        obj['palette'] = palette
    return ('// What the deck dealt for this film (scripts/deck.py writes this file with out/DIRECTION.md): src/deal.ts plays it\n'
            '// instead of a deal of its own, so the sheet and the template never disagree. Re-deal with deck.py (--redraw),\n'
            '// never by hand; launch.ts `pin` still fixes a slot, launch.ts `creative.swap` trades one creative element and\n'
            '// `heroes.swap` one hero shot (each with a reason). The direction also seeds a scene-bank deal (src/bank.ts).\n'
            + ("// lint-ok: the deck's palette mapped onto the brand (src/palette.ts paints the scenes from it; palette.py checked it)\n" if palette else '')
            + 'export const DEALT: { direction: string; deal: Record<string, string>; creative?: string[]; reserve?: string[]; hero?: string[]; heroReserve?: string[]; palette?: Record<string, string> } | null = '
            + json.dumps(obj, ensure_ascii=False) + ';\n')


# ---- the hero shots (a template that plays them: launch-simple src/deal.ts HERO_META) ---------------------------------
HERO_N = 3
_HERO_LINE = re.compile(r"\{\s*id:\s*'([a-z0-9-]+)',\s*role:\s*'(picture|over|line|end)',\s*family:\s*'([a-z0-9-]+)',\s*needs:\s*\[([^\]]*)\],\s*prefer:\s*'([a-z]+)',\s*min:\s*([\d.]+),(\s*dark:\s*true,)?\s*fits:\s*\[([^\]]*)\],\s*about:\s*'((?:[^'\\]|\\.)*)'\s*\}")
HERO_FIT_X = 2.2  # each of the brief's words a shot fits multiplies its weight (up to three)
HERO_DARK_X = 2.4  # a shot that reads best on a dark world, on a night world (and 0.4 on a light one)
HERO_TYPE_X = 1.5  # a type-led direction: the shots that set the line
HERO_PHOTO_X = 2.0  # an imagery-led direction: the ring of pictures
HERO_PICTURES_MIN = 8  # a ring of pictures needs eight or more


def hero_library(root=None):
    """[{id, role, family, needs, prefer, min, dark, fits, about}] from <root>/src/deal.ts HERO_META, else the skill's
    launch-simple copy; [] for a template without hero shots."""
    paths = ([os.path.join(root, 'src', 'deal.ts')] if root else []) + [os.path.join(SKILL, 'assets', 'templates', 'launch-simple', 'src', 'deal.ts')]
    for path in paths:
        if os.path.isfile(path):
            with open(path, encoding='utf-8') as fh:
                src = fh.read()
            if 'HERO_META' not in src:
                return []
            out = [{'id': m.group(1), 'role': m.group(2), 'family': m.group(3), 'needs': re.findall(r"'([a-z-]+)'", m.group(4)),
                    'prefer': m.group(5), 'min': float(m.group(6)), 'dark': bool(m.group(7)), 'fits': re.findall(r"'([a-z-]+)'", m.group(8)),
                    'about': m.group(9).replace("\\'", "'")} for m in _HERO_LINE.finditer(src)]
            if out:
                return out
    return []


def recent_hero(history_on):
    """The hero sets of the last films, newest first (the film history, then the deal history)."""
    sets = []
    for f in film_history(history_on):
        c = (f.get('deal') or {}).get('hero') or (f.get('devices') or {}).get('hero')
        if isinstance(c, list) and c:
            sets.append([x for x in c if isinstance(x, str)])
    for h in read_history(history_on):
        c = h.get('hero')
        if isinstance(c, list) and c:
            sets.append([x for x in c if isinstance(x, str)])
    seen, out = set(), []
    for x in sets:
        k = tuple(sorted(x))
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out[:4]


def brand_mark(root):
    """Whether the project has the brand's own mark (src/brand/logo.ts written by brand.py, not the template's stand-in)."""
    path = os.path.join(root or '', 'src', 'brand', 'logo.ts')
    if not root or not os.path.isfile(path):
        return False
    with open(path, encoding='utf-8') as fh:
        return not re.search(r'LOGO_STANDIN\s*=\s*true', fh.read())


def count_thumbs(root):
    """Pictures the film's content can ring (public/thumbs and the film's own photos)."""
    pub = os.path.join(root or '', 'public', 'thumbs')
    n = sum(1 for f in os.listdir(pub) if f.lower().endswith(_IMG)) if root and os.path.isdir(pub) else 0
    return max(n, count_photos(root) if root else 0)


def hero_fit(h, direction=None, brief='', world=None):
    """How much a hero shot suits the brief, the direction and the world (1 = neutral)."""
    w = 1.0
    b = (brief or '').lower()
    hits = sum(1 for x in h['fits'] if re.search(r'\b' + re.escape(x) + r'\w*', b))
    w *= HERO_FIT_X ** min(3, hits)
    if h['dark']:
        w *= HERO_DARK_X if world in NIGHT_WORLDS else (1.0 if world in DARK_WORLDS else 0.4)
    if direction:
        if h['role'] in ('over', 'line') and is_type_led(direction):
            w *= HERO_TYPE_X
        if 'pictures' in h['needs'] and is_imagery(direction):
            w *= HERO_PHOTO_X
    return w


def deal_hero(lib, name, brief, have, recent=(), n=HERO_N, direction=None, world=None, root=None):
    """{deal, reserve, fits, feeds} or None without a library: a seeded, recency-weighted shuffle of the hero shots the
    film can feed (a ring of pictures needs eight pictures or --have photos; the 3D mark needs the brand's own mark), each
    weighted by its fit; at least one picture shot, one of a family, one of each other role at most (the end card's
    shot comes on top of the three); never a recent film's set, one shot shared with the last film at most (two after
    half the draws)."""
    if not lib:
        return None
    haves = creative_haves(have, brief)
    feeds = {'button'}
    if 'photos' in haves or count_thumbs(root) >= HERO_PICTURES_MIN:
        feeds.add('pictures')
    if brand_mark(root):
        feeds.add('mark')
    ok = [h for h in lib if all(x in feeds for x in h['needs'])]
    last = list(recent[0]) if recent else []
    key = '|'.join([(name or brief or '').strip().lower(), ';'.join(','.join(sorted(x)) for x in recent)] + ([direction['id']] if direction else []) + [world or ''])
    fit = {h['id']: hero_fit(h, direction, brief, world) for h in ok}
    for salt in range(64):
        rng = random.Random(hashlib.sha256(f'{key}#hero#{salt}'.encode('utf-8')).hexdigest())
        order = sorted(ok, key=lambda h: rng.random() ** (1.0 / (creative_weight(h, recent) * fit[h['id']])), reverse=True)
        pick = []

        def take(cond):
            for h in order:
                if h not in pick and all(p['family'] != h['family'] for p in pick) and not (h['role'] != 'picture' and any(p['role'] == h['role'] for p in pick)) and cond(h):
                    pick.append(h)
                    return

        take(lambda h: h['role'] == 'picture')
        while len([p for p in pick if p['role'] != 'end']) < n:
            had = len(pick)
            take(lambda h: h['role'] != 'end')
            if len(pick) == had:
                break
        take(lambda h: h['role'] == 'end')  # the end card's shot when the film can feed it
        # the story's main act is never skipped: a request typed (an input shot) is followed by what the product makes of
        # it, so a deal with an input shot carries the page being made (page-fly) in place of its last other picture
        # (a typed prompt cut straight to a finished card left the product's own work unseen)
        page = next((h for h in ok if h['family'] == 'page'), None)
        if page and page not in pick and any(h['family'] == 'input' for h in pick):
            swap = [h for h in pick if h['role'] == 'picture' and h['family'] not in ('input',)]
            if swap:
                pick[pick.index(swap[-1])] = page
        ids = [h['id'] for h in pick]
        if any(sorted(ids) == sorted(x) for x in recent) or len(set(ids) & set(last)) > (1 if salt < 32 else 2):
            continue
        reserve = [h['id'] for h in order if h['id'] not in ids]
        return {'deal': ids, 'reserve': reserve, 'fits': [i for i in ids if fit.get(i, 1.0) > 1.0], 'feeds': sorted(feeds)}
    return None


def hero_lines(hc, lib, world=None):
    """The DIRECTION.md section for the dealt world and hero shots."""
    out = []
    if world:
        plate = world in PLATE_WORLDS
        out += ['', '## The world (dealt)', '',
                f"`{world}` (fx/world: references/lighting.md §8): one place for the whole film, its key light read by the glass, the rims, "
                'the type and the product; src/world.tsx draws it.' + (
                    f" It is a photograph: `node scripts/assets.mjs plate {world}`, look at the sheet, then `node scripts/assets.mjs plate {world} "
                    "--pick <n> --to public/plates --accent '<the accent>'` (until then a built world of the same tone stands in)." if plate else '')]
    if hc:
        by = {h['id']: h for h in lib}
        out += ['', '## The hero shots (dealt; they take their beats first)', '',
                'Each is a designed 3D or light shot of the product\'s own content (src/content.ts: `node scripts/content.mjs --brief BRIEF.md '
                '--fetch --force`, then read it); timeline.ts HERO_PLAN puts each on its beat: `npx tsx -e "import { HERO_PLAN, HERO_END } '
                "from './src/timeline'; console.log(HERO_PLAN, HERO_END)\"`. Swap one at most, with the reason (launch.ts `heroes.swap`).", '']
        for i in hc['deal']:
            h = by.get(i, {})
            out.append(f"- `{i}` ({h.get('role', '?')}): {h.get('about', '')}")
    return '\n'.join(out) + ('\n' if out else '')


def photos_known(inp, root):
    """The film's photo count: --photos, else the images in the project's public/ (None outside a project)."""
    if inp.get('photos') is not None:
        return inp['photos']
    return count_photos(root) if root and os.path.isdir(os.path.join(root, 'src')) else None


def deal_film_creative(sh, root):
    """The film's creative elements for the sheet: sh['creative'] = {deal, reserve, ...} (None without a library)."""
    inp = sh.get('input') or {}
    lib = creative_library(root)
    c = deal_creative(lib, project_name(root), inp.get('brief', ''), inp.get('have', ()), recent_creative(sh.get('history', True)),
                      direction=sh.get('direction'), photos=photos_known(inp, root))
    if c:
        sh['creative'] = c
    else:
        sh.pop('creative', None)
    return lib


def recent_pairs(history_on, n=2):
    """The type pairings of the last `n` films (the film history's devices.type, newest first)."""
    out = []
    for f in film_history(history_on):
        t = (f.get('devices') or {}).get('type')
        if isinstance(t, str) and t and t not in out:
            out.append(t)
    return out[:n]


def deal_pair(name, direction_id, recent=()):
    """The film's type pairing from scripts/faces.json `pairs`: at random (seeded by the name and the direction), the
    last films' pairings left out, the neutral `product` pairing a third as likely. None without the table."""
    fs = _face_set()
    pairs = [x for x in ((fs or {}).get('pairs') or []) if isinstance(x, dict) and x.get('id')]
    if not pairs:
        return None
    pool = [x for x in pairs if x['id'] not in recent] or pairs
    rng = random.Random(hashlib.sha256(f'type|{(name or "").strip().lower()}|{direction_id}'.encode('utf-8')).hexdigest())
    w = [1 / 3 if x['id'] == 'product' else 1.0 for x in pool]
    r = rng.random() * sum(w)
    for x, wt in zip(pool, w):
        r -= wt
        if r <= 0:
            return x
    return pool[-1]


def set_pair(root, pair_id):
    """Write the pairing into the project's tokens with scripts/type-deal.ts --pair (node + tsx); the command to run
    by hand when it cannot run here."""
    cmd = f'npx tsx scripts/type-deal.ts --pair {pair_id}'
    if not os.path.isfile(os.path.join(root, 'scripts', 'type-deal.ts')) or not os.path.isfile(os.path.join(root, 'src', 'brand', 'tokens.ts')):
        return False, cmd
    tsx = os.path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
    node = shutil.which('node')
    if not node or not os.path.isfile(tsx):
        return False, cmd
    try:
        r = subprocess.run([node, tsx, 'scripts/type-deal.ts', '--pair', pair_id, '--quiet'], cwd=root, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired):
        return False, cmd
    return r.returncode == 0, cmd


def write_template_deal(sh, outdir):
    """Map the sheet onto a template that deals (src/deal.ts beside out/) and write src/dealt.ts with the film's creative
    elements; sh['template_deal'], sh['creative']."""
    root = os.path.dirname(os.path.abspath(outdir))
    deal_film_creative(sh, root)
    devices, floor = template_slots(root)
    if not devices:
        sh.pop('template_deal', None)
        return
    sh['name'] = project_name(root) or ''
    wc = world_context(root, sh.get('input') or {}, sh.get('history', True))
    deal, why = template_deal(sh, devices, floor, recent_template(sh.get('history', True)), wc)
    sh.pop('name', None)
    # the hero shots (a template that plays them), weighted by the world just dealt
    hlib = hero_library(root)
    inp = sh.get('input') or {}
    world = deal.get('ground') if deal.get('ground') in WORLD_KINDS else None
    hc = deal_hero(hlib, project_name(root), inp.get('brief', ''), inp.get('have', ()), recent_hero(sh.get('history', True)), direction=sh.get('direction'), world=world, root=root) if hlib else None
    if hc:
        sh['hero'] = hc
    else:
        sh.pop('hero', None)
    sh['world'] = world
    # the world's hue, recorded with it (direction.json, the deal history): the next films stay out of this place
    sh['world_hue'] = world_hue(world, wc['accent'], wc['template']) if world else None
    sh['project_dir'] = root
    rel = 'src/dealt.ts'
    with open(os.path.join(root, 'src', 'dealt.ts'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(dealt_body(sh['direction']['id'], deal, sh.get('creative'), hc, dealt_palette(sh.get('brand')) if plays_bank(root) else None))
    sh['template_deal'] = {'file': rel, 'deal': deal, 'why': why}
    # the type pairing (scripts/faces.json pairs), set in the tokens with type-deal.ts (the template reads it from there)
    if 'type' not in (sh.get('keep') or []):
        pr = deal_pair(project_name(root) or (sh.get('input') or {}).get('brief', ''), sh['direction']['id'], recent_pairs(sh.get('history', True)))
        if pr:
            ok, cmd = set_pair(root, pr['id'])
            sh['type_pair'] = {'id': pr['id'], 'voice': pr.get('voice'), 'text': pr.get('text'), 'set': ok, 'cmd': cmd}


def deal_creative_only(outdir, brief, have, history_on):
    """--creative: deal only the film's creative elements into src/dealt.ts (a direction already dealt there is kept)."""
    root = os.path.dirname(os.path.abspath(outdir))
    lib = creative_library(root)
    c = deal_creative(lib, project_name(root), brief, have, recent_creative(history_on))
    if not c:
        fail('no creative library found (src/fx/creative/meta.ts in the project or the skill\'s starter)', 1)
    p = os.path.join(root, 'src', 'dealt.ts')
    direction, deal, hero = '', {}, None
    if os.path.isfile(p):
        with open(p, encoding='utf-8') as fh:
            m = re.search(r'=\s*(\{.*\})\s*;\s*$', fh.read(), re.S)
        if m:
            try:
                old = json.loads(m.group(1))
                direction, deal = old.get('direction', ''), old.get('deal', {})
                if old.get('hero'):
                    hero = {'deal': old['hero'], 'reserve': old.get('heroReserve', [])}
            except ValueError:
                pass
    if os.path.isdir(os.path.join(root, 'src')):
        with open(p, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(dealt_body(direction, deal, c, hero))
    write_history(history_on, {'direction': direction or '(creative only)', 'creative': c['deal']})
    print(f"deck: creative elements {', '.join(c['deal'])}" + (f' (written to {os.path.relpath(p)})' if os.path.isdir(os.path.join(root, 'src')) else ''))
    print(creative_lines(c, lib), end='')
    return 0


def write_sheet(sh, outdir, data, library):
    guard_out(outdir)
    os.makedirs(outdir, exist_ok=True)
    write_template_deal(sh, outdir)
    with open(os.path.join(outdir, 'direction.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(sh, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    root = os.path.dirname(os.path.abspath(outdir))
    creative = creative_lines(sh.get('creative'), creative_library(root)) if template_plays_creative(root) else (CREATIVE_NOT_PLAYED if sh.get('creative') else '')
    md = render_sheet(sh, data, library) + creative + hero_lines(sh.get('hero'), hero_library(root), sh.get('world'))
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
    ap.add_argument('--have', default='', help='what really exists: ui, input, photos, footage, audio, number, name (comma-separated)')
    ap.add_argument('--seconds', type=float, help='the film length in seconds')
    ap.add_argument('--seed', type=int, help='reproduce a deal (default: derived from the brief)')
    ap.add_argument('--options', type=int, metavar='N', help='deal N directions to choose from (2-5; 3 is the house number)')
    ap.add_argument('--direction', metavar='ID', help='deal the full sheet for this direction; writes out/direction.json and out/DIRECTION.md')
    ap.add_argument('--changes', type=int, help='--format update: how many changes the film shows (2-4, default 3)')
    ap.add_argument('--brand', help='brand/brand.json (scripts/brand.py): map the dealt roles onto the brand\'s colours and type')
    ap.add_argument('--keep', default='', help='palette,type: the brand fixes these; the sheet deals the rest')
    ap.add_argument('--avoid', default='', help='direction ids never to deal (comma-separated)')
    ap.add_argument('--recent', help='direction ids to deal less often, instead of the history (comma-separated; '
                    'the printed commands carry it, so a deal reproduces anywhere)')
    ap.add_argument('--redraw', choices=SLOTS, help='re-deal one slot of the saved sheet (needs --reason)')
    ap.add_argument('--reason', default='', help='why the slot must change (required with --redraw)')
    ap.add_argument('--show', nargs='?', const='', metavar='ID', help='a direction in full; without an id, reprint the saved sheet')
    ap.add_argument('--list', action='store_true', help='list the directions (filtered by --format, --pace, --have, --seconds)')
    ap.add_argument('--validate', action='store_true', help='check the deck and exit')
    ap.add_argument('--strict', action='store_true', help='with --validate: the library, the starter source and lib/look.ts must all be found')
    ap.add_argument('--allow-planned', action='store_true', help='also deal directions whose signature waits for a planned primitive')
    ap.add_argument('--out', default='out', help='where the sheet is written (default out/; never inside the skill folder)')
    ap.add_argument('--no-imagery', action='store_true', help='deal no imagery-led direction (the brief rules out found pictures)')
    ap.add_argument('--deck', default=DEFAULT_DECK, help='a deck file, or a folder whose decks are merged (default: every deck in assets/directions/)')
    ap.add_argument('--library', default=DEFAULT_LIBRARY, help='the technique library (default assets/library/techniques.json)')
    ap.add_argument('--no-history', action='store_true', help='neither read nor write the deal history')
    ap.add_argument('--repeat', default='', help='signature,end: repeats of the last three films the brief asks for (else refused)')
    ap.add_argument('--creative', action='store_true', help='deal only the creative elements into src/dealt.ts (keeps a direction already dealt there)')
    ap.add_argument('--why', default='', help='with --direction in a template project: one line on why this direction fits the product (required there)')
    ap.add_argument('--photos', type=int, help='how many pictures worth showing the film has (photo devices need 5 or more; default: the images in public/)')
    a = ap.parse_args()

    data, deck_problems = load_deck(a.deck)
    library = load_library(a.library)
    cat = data.get('primitives', {}) if isinstance(data, dict) else {}
    src = starter_src()

    if a.validate:
        errors, notes = validate(data, library, src, a.strict)
        errors = deck_problems + errors
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
        per = data.get('decks') or {}
        print(f'deck.py: {len(dirs)} directions valid'
              + (' (' + ', '.join(f'{k} {len(v)}' for k, v in per.items()) + ')' if len(per) > 1 else '')
              + f'; {sum(1 for d in dirs if is_imagery(d))} imagery-led; {len(dirs) - len(blocked)} dealable now'
              f'{" (" + ", ".join(blocked) + " wait for planned primitives)" if blocked else ""}; space {sp}; intensity {it}; '
              f'light {li}; {len({d["story"]["shape"] for d in dirs})} story shapes; {len({d["lockup"]["kind"] for d in dirs})} '
              f'lockup kinds; palette grounds {tn}; recipes {rs["built"]} built, {rs["planned"]} planned; primitives '
              f'{st["built"]} built, {st["planned"]} planned; {len(techs)} library techniques leaned on')
        return 0

    errors, _ = validate(data, library, None, False)
    errors = deck_problems + errors
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
    if a.creative:
        guard_out(a.out)
        return deal_creative_only(a.out, a.brief, have, not a.no_history)
    keep = parse_list(a.keep, KEEP, '--keep')
    avoid = [x.strip() for x in a.avoid.split(',') if x.strip()]
    for x in avoid:
        if x not in by_id:
            fail(f'--avoid: no direction {x!r}')

    if a.list:
        for d in dirs:
            ok, why = fits(d, a.format, a.pace, have, a.seconds, a.brief, ready, not a.no_imagery)
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
            if a.redraw == 'type':
                sh['face'] = face_for(new, seed, d['id'])
            if a.redraw == 'palette':
                sh['recipes'] = {new['recipe']: data['recipes'].get(new['recipe'])}
                if inp.get('brand'):
                    sh['brand'] = brand_mapping(d, new, data['recipes'], read_brand(inp['brand']))
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
            pool = [x for x in dirs if fits(x, inp['format'], inp['pace'], inp['have'], inp['seconds'], inp['brief'], gate,
                                            inp.get('imagery', True))[0] and x['id'] not in held]
            if not pool:
                fail('no other direction fits this brief; keep the one you have', 1)
            recent = [h['direction'] for h in read_history(sh['history'])][:4]
            wts = {x['id']: weight(x, inp, recent) for x in pool}
            new_d = weighted_choice(pool, wts, slot_rng(seed, 'direction', 'redraw', k))
            log = sh['redraws'] + [{'slot': 'direction', 'from': d['id'], 'to': new_d['id'], 'reason': a.reason}]
            waits = [p for p in new_d.get('requires', []) if p not in ready]
            sh = make_sheet(new_d, inp, seed, sh['options'], set(sh['keep']), sh['history'], data, log, waits=waits)
            write_history(sh['history'], {'direction': new_d['id'], 'format': inp['format'], **({'ground': sh['ground_family']['id']} if sh.get('ground_family') else {})})
        md = write_sheet(sh, a.out, data, library)
        print(md, end='')
        return 0

    if a.changes is not None and not CHANGES[0] <= a.changes <= CHANGES[1]:
        fail(f'--changes takes {CHANGES[0]}-{CHANGES[1]} (each change is one product moment of an update film)')
    if a.changes is not None and a.format != 'update':
        fail('--changes belongs to --format update')
    if a.brand and not os.path.isfile(a.brand):
        fail(f'--brand: {a.brand} not found (write it with scripts/brand.py)')
    inp = {'brief': a.brief, 'format': a.format, 'pace': a.pace or 'calm', 'have': have, 'seconds': a.seconds, 'avoid': avoid}
    if a.photos is not None:
        inp['photos'] = a.photos
    if a.no_imagery:
        inp['imagery'] = False
    if a.format == 'update':
        inp['changes'] = a.changes or DEFAULT_CHANGES
    if a.brand:
        read_brand(a.brand)
        inp['brand'] = a.brand.replace(os.sep, '/')
    derived = a.seed is None
    seed = derive_seed(inp) if derived else a.seed
    history_on = not a.no_history
    if a.recent is not None:
        recent = [x.strip() for x in a.recent.split(',') if x.strip()]
    else:
        recent = [h['direction'] for h in read_history(history_on)][:4]
    if recent:
        inp['recent'] = recent  # after the seed: the printed commands carry it
    if a.options is not None and not 2 <= a.options <= 5:
        fail('--options takes 2-5')
    opts, pool, weights = options_for(data, inp, seed, a.options or 3, recent, avoid, keep, ready, a.allow_planned)
    if not pool and not a.direction:
        fail('no direction fits these filters (try another --format, --pace or --seconds, or say what --have)', 1)

    if a.options is not None:
        print(render_options(opts, inp, seed, [r for r in recent if r in weights], len(pool), derived, data, keep), end='')
        return 0

    allowed = {x.strip() for x in a.repeat.split(',') if x.strip()}
    root = os.path.dirname(os.path.abspath(a.out))
    t_devices, t_floor = template_slots(root)
    if t_devices and not a.direction:
        # a template project: three directions, each with what the template would play; the agent picks (--why)
        if not opts:
            fail('no direction fits these filters (try another --format, --pace or --seconds, or say what --have)', 1)
        guard_out(a.out)
        os.makedirs(a.out, exist_ok=True)
        md = render_template_options(opts, inp, seed, data, root, history_on, t_devices, t_floor)
        with open(os.path.join(a.out, 'OPTIONS.md'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(md)
        print(md, end='')
        print(f'deck: three directions in {os.path.join(a.out, "OPTIONS.md")}: pick the one that fits the product, then deal it with '
              '--direction <id> --why "<one line>"', file=sys.stderr)
        return 0
    if t_devices and len(a.why.split()) < 4:
        fail('--direction in a template project needs --why "<one line: why this direction fits the product>" (a few words at least): '
             'the reason heads out/DIRECTION.md; run without --direction to see the three dealt options (out/OPTIONS.md)')
    if not a.direction:
        # one direction dealt from the brief and the history: the first option that repeats nothing of the last films
        if not opts:
            fail('no direction fits these filters (try another --format, --pace or --seconds, or say what --have)', 1)
        pick = next((o for o in opts if not repeats(by_id[o['id']], history_on, allowed)), opts[0])
        a.direction = pick['id']
        print(f"deck: dealt {pick['id']} from the brief and the last films (--options 3 deals three to choose from)", file=sys.stderr)
    if a.direction not in by_id:
        fail(f'no direction {a.direction!r} (run --list)', 1)
    d = by_id[a.direction]
    rep_ = repeats(d, history_on, allowed)
    if rep_:
        fail(f"{a.direction} repeats the last films: {'; '.join(rep_)}. Deal another (--options 3), or --repeat signature,end when the brief asks for it", 1)
    ok, why = fits(d, a.format, inp['pace'], have, a.seconds, a.brief, gate, not a.no_imagery)
    if not ok:
        hint = ' (or pass --allow-planned and build them inside the film)' if why.startswith('waits for') else ''
        fail(f'{a.direction} does not fit this brief ({why}){hint}; deal options that do with --options 3', 1)
    options = [o['id'] for o in opts]
    waits = [p for p in d.get('requires', []) if p not in ready]
    sh = make_sheet(d, inp, seed, options, set(keep), history_on, data, waits=waits)
    if a.why.strip():
        sh['why'] = ' '.join(a.why.split())
    md = write_sheet(sh, a.out, data, library)
    write_history(history_on, {'direction': d['id'], 'format': a.format, 'signature': d['signature']['family'], 'lockup': d['lockup']['kind'],
                               **({'ground': sh['ground_family']['id']} if sh.get('ground_family') else {}),
                               **({'world': sh['world'], 'hue': sh.get('world_hue'), 'dir': sh.get('project_dir')} if sh.get('world') else {}),
                               **({'creative': sh['creative']['deal']} if sh.get('creative') else {}),
                               **({'hero': sh['hero']['deal']} if sh.get('hero') else {}),
                               **({'type': sh['type_pair']['id']} if sh.get('type_pair') else {})})
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
