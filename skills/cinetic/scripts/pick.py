#!/usr/bin/env python3
"""Draw techniques from the library at random, so films don't converge on the same few moves.

An agent left to choose picks the first familiar option: the same fade-up, the same push-in, the
same end card. pick.py draws from assets/library/techniques.json instead, weighted toward what
fits the film (format, energy) and toward proven workhorses, and prints the build recipe for each
draw. The seed is printed, so a plan can be reproduced and written into TREATMENT.md.

Weights: role (workhorse 3, accent 2, signature 1) x proof (1 + weight / 4, capped at 3; the house
weight 0-9 of each entry) x energy fit. The energy defaults to calm, the house pace. Calm copy, rich
picture: in a calm draw the copy categories (typography in motion, pacing and structure) keep the
energy rule (calm 1.0, "any" 0.7, medium 0.25, high never: no slams, whips or glitch streaks on the
words), while every picture category draws calm and medium entries at 1.0 and high-energy ones at
0.5, so a calm film still gets a rich, moving picture. Pass --energy high for a brief that asks for
energy (same energy 1.0, "any" 0.7, other 0.25), or --energy any to draw without the energy weight.
Entries whose formats don't include the film's format (or "any") are never drawn. Entries that
rely on a house-banned look (ban_safe false) are drawn with their ban-safe variant as the recipe,
unless --brand-supplied names every look in the entry's "bans" list.

Variety: every entry belongs to a family (type arrivals, camera transitions, glass, glow and
spectral, loaders...). A film draws across many families: never more than two entries from one
family per film by default (--max-per-family; 0 turns the cap off). Entries your last three films
drew are down-weighted to a fifth, so successive films do not lean on the same devices: each plan
written with --json is recorded in ~/.cinetic/pick-history.json (CINETIC_PICK_HISTORY names another
file, "off" or --no-history turns it off), and the plan's header prints the --recent list it used,
so the same call reproduces it.

Usage:
  python3 scripts/pick.py --format launch --seconds 25               # a calm whole-film plan (7 picks)
  python3 scripts/pick.py --format launch --energy high --seconds 25  # an energetic one (10 picks)
  python3 scripts/pick.py --format loop --seed 41                     # reproducible plan (10 s: 4 picks)
  python3 scripts/pick.py --format update --seconds 14                # a short update film ("vX is out")
  python3 scripts/pick.py --category transition --n 3 --format launch # three transitions
  python3 scripts/pick.py --family "Glass, glow and spectral" --n 2   # two devices from one family
  python3 scripts/pick.py --category transition --keep out/qa/picks.json --exclude tr-band-wipe  # a reroll
  python3 scripts/pick.py --category logo_and_end_card --exclude le-hard-cut-lockup
  python3 scripts/pick.py --plan --avoid out/qa/picks-previous.json    # skip ids used before
  python3 scripts/pick.py --list [--category camera] [--family Cursor]  # ids and names
  python3 scripts/pick.py --show tr-mask-wipe-swap                    # one entry in full
  python3 scripts/pick.py --validate                                  # check the library file
  python3 scripts/pick.py --markdown > references/technique-library.md # the readable index
  python3 scripts/pick.py --markdown --family Camera                  # one family's file
  python3 scripts/pick.py --write-docs references                     # write the index and every family file
  python3 scripts/pick.py ... --json out/qa/picks.json                # also write the draw as JSON

An update film (--format update, 8-20 s: a hook on the version or the mark, 2-4 changes each shown as a
product moment, one payoff, the end card with the version) draws from the entries made for update films
and from launch, feature and sting entries (an update is a short launch), and fills its hook, a product
moment and its end card first.

A plan holds about one technique per 3.5 s of film when calm, per 2.5 s otherwise (--seconds),
filled in the format's order of need (a sting draws its end card and hook first, a walkthrough its
product demo), with one signature move, or two in a plan of 10 or more. A slot whose category has
nothing left at this energy (or only families the film already holds twice) passes to the next
category in that order.

Rules for the agent (SKILL.md, Step 1): draw before you design; build the picks the concept can
carry, each retold in the film's objects; reroll a pick that fights the concept (--exclude it,
same --category, --keep the plan so its families still count) at most twice, or drop it, and write
down why. Never add a technique the draw did not give you: draw one with --category or --family.
A draw is a starting point, not a quota.

Exit 0 on success, 1 when nothing fits the filters, 2 on bad input or an invalid library.
"""
import argparse
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# The skill keeps the library in assets/library/; a film project made by new-film.sh carries its own
# copy next to this script, in scripts/library/.
_LIBRARIES = [os.path.normpath(os.path.join(HERE, '..', 'assets', 'library', 'techniques.json')),
              os.path.join(HERE, 'library', 'techniques.json')]
DEFAULT_LIBRARY = next((p for p in _LIBRARIES if os.path.isfile(p)), _LIBRARIES[0])
# The starter's source, where a `primitive` must exist (the skill's starter, or a film project's src/).
_SOURCES = [os.path.normpath(os.path.join(HERE, '..', 'assets', 'remotion-starter', 'src')),
            os.path.normpath(os.path.join(HERE, '..', 'src'))]

CATEGORIES = ['opening_hook', 'transition', 'camera', 'typography_motion', 'ui_choreography',
              'data_and_numbers', 'product_demo', 'logo_and_end_card', 'color_and_light',
              'texture_and_finish', 'layout_and_composition', 'pacing_structure',
              'micro_interaction', 'depth_and_3d']
# Calm copy, rich picture: these categories set the words and the film's shape and keep the calm rule;
# every other category is picture.
COPY_CATEGORIES = {'typography_motion', 'pacing_structure'}
FORMATS = ['launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical', 'update']
# A format that also draws from other formats' entries: an update film is a short launch film.
FORMAT_ALSO = {'update': ('launch', 'feature', 'sting')}
ENERGIES = ['calm', 'medium', 'high']
ROLE_WEIGHT = {'workhorse': 3.0, 'accent': 2.0, 'signature': 1.0}
REQUIRED = ['id', 'name', 'category', 'summary', 'recipe', 'timing', 'use_when', 'avoid_when',
            'formats', 'energy', 'role', 'ban_safe']
MAX_PER_FAMILY = 2      # entries from one family in one film
RECENT_FILMS = 3        # how many earlier plans count as recent
RECENT_FACTOR = 0.2     # the weight left to an entry a recent film drew
HISTORY_KEEP = 12
PRIMITIVE = re.compile(r'^(fx|lib|kit|brand)/[\w-]+(\.[A-Za-z_$][\w$]*)?$')

# The order in which a plan fills its slots, by format: the first slots go to what that format
# cannot do without. A film gets about one technique per 3.5 s when calm and per 2.5 s otherwise
# (--seconds), so a 12 s vertical video draws 5 and a 30 s launch film 9 (calm) or 12: a short
# film carries a few moves done well, and a plan stuffed with one move per category reads as a
# showreel. A category may appear twice.
ORDER = {
    'launch': ['opening_hook', 'transition', 'typography_motion', 'product_demo', 'ui_choreography',
               'logo_and_end_card', 'camera', 'transition', 'data_and_numbers', 'micro_interaction',
               'color_and_light', 'pacing_structure', 'typography_motion', 'depth_and_3d',
               'layout_and_composition', 'texture_and_finish', 'transition', 'ui_choreography'],
    'feature': ['product_demo', 'ui_choreography', 'opening_hook', 'transition', 'micro_interaction',
                'typography_motion', 'logo_and_end_card', 'data_and_numbers', 'camera', 'color_and_light',
                'ui_choreography', 'layout_and_composition'],
    'loop': ['ui_choreography', 'product_demo', 'micro_interaction', 'typography_motion', 'transition',
             'camera', 'pacing_structure', 'color_and_light'],
    'sting': ['logo_and_end_card', 'opening_hook', 'typography_motion', 'micro_interaction', 'camera',
              'texture_and_finish'],
    'walkthrough': ['product_demo', 'ui_choreography', 'opening_hook', 'transition', 'micro_interaction',
                    'camera', 'typography_motion', 'logo_and_end_card', 'ui_choreography', 'product_demo',
                    'transition', 'pacing_structure', 'layout_and_composition', 'micro_interaction'],
    'vertical': ['opening_hook', 'product_demo', 'ui_choreography', 'typography_motion', 'transition',
                 'logo_and_end_card', 'micro_interaction', 'data_and_numbers', 'camera', 'color_and_light',
                 'transition', 'typography_motion'],
    # the hook on the version or the mark, a product moment per change, the end card with the version
    'update': ['opening_hook', 'product_demo', 'logo_and_end_card', 'ui_choreography', 'transition',
               'typography_motion', 'micro_interaction', 'product_demo', 'data_and_numbers', 'camera',
               'transition', 'color_and_light'],
}
DEFAULT_SECONDS = {'launch': 30, 'feature': 15, 'loop': 10, 'sting': 6, 'walkthrough': 45, 'vertical': 15, 'update': 14}
MIN_PICKS = {'launch': 6, 'feature': 5, 'loop': 4, 'sting': 4, 'walkthrough': 6, 'vertical': 5, 'update': 4}
SECONDS_PER_PICK = {'calm': 3.5}  # a calm film carries fewer, longer moves
DEFAULT_SECONDS_PER_PICK = 2.5


def plan_size(fmt, seconds, energy=None):
    """How many techniques a film of this format, length and energy draws."""
    n = int(round(seconds / SECONDS_PER_PICK.get(energy, DEFAULT_SECONDS_PER_PICK)))
    return max(MIN_PICKS[fmt], min(len(ORDER[fmt]), n))


def plan_slots(fmt, seconds, energy=None):
    """{category: count} for the first plan_size() slots of the format's order."""
    slots = {}
    for cat in ORDER[fmt][:plan_size(fmt, seconds, energy)]:
        slots[cat] = slots.get(cat, 0) + 1
    return slots


BANS = ['glass', 'glow', 'serif', 'italic', 'orange', 'beige', 'purple', 'gradient', 'filler-text',
        'emoji', 'sparkle', 'confetti', 'particles']


def fail(msg, code=2):
    print(f'pick.py: {msg}', file=sys.stderr)
    sys.exit(code)


def read_library(path):
    try:
        with open(path, encoding='utf-8') as fh:
            data = json.load(fh)
    except (OSError, ValueError) as e:
        fail(f'cannot read the library {path}: {e}')
    return data


def load(path):
    data = read_library(path)
    entries = data['techniques'] if isinstance(data, dict) else data
    problems = validate(entries, families_of(data), starter_src())
    if problems:
        fail('invalid library:\n  ' + '\n  '.join(problems[:20]))
    return entries


def families_of(data):
    """The library's family list (name, about), or None for a library that has none."""
    fams = data.get('families') if isinstance(data, dict) else None
    if not isinstance(fams, list):
        return None
    return [(f['name'], f.get('about', '')) for f in fams if isinstance(f, dict) and f.get('name')]


def starter_src():
    return next((p for p in _SOURCES if os.path.isfile(os.path.join(p, 'lib', 'anim.ts'))), None)


_EXPORTS = {}
_EXPORT_RE = re.compile(r'^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|function\*?|class|type|interface|enum)\s+'
                        r'([A-Za-z_$][\w$]*)', re.M)


def module_exports(src, mod):
    """The names a starter module exports, or None when the module does not exist."""
    key = (src, mod)
    if key not in _EXPORTS:
        names = None
        for ext in ('.tsx', '.ts', '.js', '.jsx'):
            path = os.path.join(src, *mod.split('/')) + ext
            if os.path.isfile(path):
                text = open(path, encoding='utf-8').read()
                names = set(_EXPORT_RE.findall(text))
                for grp in re.findall(r'^export\s*\{([^}]*)\}', text, re.M):
                    names |= {p.strip().split(' as ')[-1].replace('type ', '').strip() for p in grp.split(',') if p.strip()}
                break
        _EXPORTS[key] = names
    return _EXPORTS[key]


def weight_of(e):
    """The house weight 0-9 (libraries written before 1.2 call it `evidence`)."""
    return e.get('weight', e.get('evidence', 0))


def validate(entries, families=None, src=None):
    problems, seen, aliases = [], set(), {}
    if not isinstance(entries, list) or not entries:
        return ['the library holds no techniques']
    fam_names = {f for f, _ in families} if families is not None else None
    for i, e in enumerate(entries):
        where = e.get('id', f'#{i}') if isinstance(e, dict) else f'#{i}'
        if not isinstance(e, dict):
            problems.append(f'{where}: not an object')
            continue
        for k in REQUIRED:
            if k not in e or e[k] in ('', None):
                problems.append(f'{where}: missing {k}')
        if 'weight' not in e and 'evidence' not in e:
            problems.append(f'{where}: missing weight')
        if e.get('id') in seen:
            problems.append(f'{where}: duplicate id')
        seen.add(e.get('id'))
        if e.get('category') not in CATEGORIES:
            problems.append(f'{where}: unknown category {e.get("category")!r}')
        fm = e.get('formats') or []
        if not isinstance(fm, list) or not fm or any(f not in FORMATS + ['any'] for f in fm):
            problems.append(f'{where}: formats must be a non-empty list of {FORMATS + ["any"]}')
        if e.get('energy') not in ENERGIES + ['any']:
            problems.append(f'{where}: energy must be one of {ENERGIES + ["any"]}')
        if e.get('role') not in ROLE_WEIGHT:
            problems.append(f'{where}: role must be one of {list(ROLE_WEIGHT)}')
        if e.get('ban_safe') is False and not e.get('ban_safe_variant'):
            problems.append(f'{where}: ban_safe is false but there is no ban_safe_variant')
        w = weight_of(e)
        if not isinstance(w, (int, float)) or isinstance(w, bool) or not 0 <= w <= 9:
            problems.append(f'{where}: weight must be a number 0-9')
        bans = e.get('bans', [])
        if not isinstance(bans, list) or any(b not in BANS for b in bans):
            problems.append(f'{where}: bans must be a list drawn from {BANS}')
        elif e.get('ban_safe') is True and bans:
            problems.append(f'{where}: ban_safe is true but bans lists {bans}')
        elif e.get('ban_safe') is False and not bans:
            problems.append(f'{where}: ban_safe is false, so bans must name the banned looks it relies on')
        if 'family' in e or fam_names is not None:
            if not isinstance(e.get('family'), str) or not e.get('family'):
                problems.append(f'{where}: missing family')
            elif fam_names is not None and e['family'] not in fam_names:
                problems.append(f'{where}: family {e["family"]!r} is not in the library\'s families')
        if 'primitive' in e:
            prims = e['primitive']
            if not isinstance(prims, list) or any(not isinstance(p, str) or not PRIMITIVE.match(p) for p in prims):
                problems.append(f'{where}: primitive must be a list of "fx|lib|kit|brand/Module[.export]" ([] for a recipe in plain layers)')
            elif src:
                for p in prims:
                    mod, _, name = p.partition('.')
                    names = module_exports(src, mod)
                    if names is None:
                        problems.append(f'{where}: primitive {p}: the starter has no src/{mod}')
                    elif name and name not in names:
                        problems.append(f'{where}: primitive {p}: src/{mod} does not export {name}')
        for k in ('conditions', 'jobs'):
            if k in e and (not isinstance(e[k], list) or any(not isinstance(x, str) or not x for x in e[k])):
                problems.append(f'{where}: {k} must be a list of sentences')
        if 'materials' in e and not (isinstance(e['materials'], str) and e['materials']):
            problems.append(f'{where}: materials must be a sentence')
        if 'impact' in e and e['impact'] not in (1, 2, 3, 4, 5):
            problems.append(f'{where}: impact must be 1-5')
        for a in e.get('aliases', []) if isinstance(e.get('aliases', []), list) else [None]:
            if not isinstance(a, str) or not a:
                problems.append(f'{where}: aliases must be a list of ids')
            elif a in aliases:
                problems.append(f'{where}: alias {a} is also an alias of {aliases[a]}')
            else:
                aliases[a] = where
    for a, owner in aliases.items():
        if a in seen:
            problems.append(f'{owner}: alias {a} is also an id')
    return problems


def alias_map(entries):
    """{alias: id}: an id an entry was merged from still names it."""
    return {a: e['id'] for e in entries for a in e.get('aliases', [])}


def calm_fit(e):
    """The energy factor of a calm draw: calm copy, rich picture."""
    if e['category'] in COPY_CATEGORIES:
        return {'calm': 1.0, 'any': 0.7, 'medium': 0.25, 'high': 0.0}[e['energy']]
    return {'calm': 1.0, 'any': 1.0, 'medium': 1.0, 'high': 0.5}[e['energy']]


def weight(e, energy, recent=()):
    w = ROLE_WEIGHT[e['role']] * min(3.0, 1.0 + float(weight_of(e) or 0) / 4.0)
    if energy == 'calm':
        w *= calm_fit(e)  # the words never slam, whip or glitch in a calm film; the picture may move
    elif energy and energy != 'any':
        w *= 1.0 if e['energy'] == energy else (0.7 if e['energy'] == 'any' else 0.25)
    if e['id'] in recent:
        w *= RECENT_FACTOR
    return w


def fits(e, fmt):
    return not fmt or 'any' in e['formats'] or fmt in e['formats'] or bool(set(FORMAT_ALSO.get(fmt, ())) & set(e['formats']))


def draw(pool, n, rng, energy, taken, signature_left, families=None, cap=MAX_PER_FAMILY, recent=()):
    """Weighted draw without replacement. Returns (picks, signature_left).

    families counts the picks per family so far (updated in place); with cap > 0 a family the film
    already holds cap times is not drawn again."""
    families = {} if families is None else families
    picks = []
    cand = [e for e in pool if e['id'] not in taken and weight(e, energy, recent) > 0]
    while len(picks) < n and cand:
        if signature_left <= 0:
            cand = [e for e in cand if e['role'] != 'signature']
        if cap > 0:
            cand = [e for e in cand if not e.get('family') or families.get(e['family'], 0) < cap]
        if not cand:
            break
        ws = [weight(e, energy, recent) for e in cand]
        e = rng.choices(cand, weights=ws, k=1)[0]
        picks.append(e)
        taken.add(e['id'])
        if e.get('family'):
            families[e['family']] = families.get(e['family'], 0) + 1
        if e['role'] == 'signature':
            signature_left -= 1
        cand = [c for c in cand if c['id'] != e['id']]
    return picks, signature_left


def brand_allows(e, allowed):
    """True when the brand supplies every banned look this entry's original recipe relies on."""
    if not allowed:
        return False
    if e.get('bans'):
        return set(e['bans']) <= allowed
    note = (e.get('ban_note', '') + ' ' + e.get('recipe', '')).lower()
    return any(b in note for b in allowed)


def render(e, allowed):
    fam = f" · {e['family']}" if e.get('family') else ''
    lines = [f"### {e['name']}  `{e['id']}`",
             f"*{e['category']}{fam} · {e['role']} · energy {e['energy']} · formats {', '.join(e['formats'])}*", '',
             e['summary'], '']
    if e.get('ban_safe') is False and not brand_allows(e, allowed):
        lines += [f"**Build (ban-safe variant):** {e['ban_safe_variant']}",
                  f"(The full look touches a house ban; use it only for a brand that supplies it: {e['recipe']})"]
    else:
        lines += [f"**Build:** {e['recipe']}"]
    if e.get('primitive'):
        lines.append(f"**Primitive:** {', '.join('`' + p + '`' for p in e['primitive'])}")
    if e.get('materials'):
        lines.append(f"**Materials:** {e['materials']}")
    if e.get('conditions'):
        lines.append(f"**Conditions:** {'; '.join(e['conditions'])}")
    lines += [f"**Timing:** {e['timing']}", f"**Use when:** {e['use_when']}", f"**Avoid when:** {e['avoid_when']}", '']
    return '\n'.join(lines)


CATEGORY_TITLES = {
    'opening_hook': 'Opening hooks', 'transition': 'Transitions', 'camera': 'Camera',
    'typography_motion': 'Typography in motion', 'ui_choreography': 'UI choreography',
    'data_and_numbers': 'Data and numbers', 'product_demo': 'Product demo', 'logo_and_end_card': 'Logo and end card',
    'color_and_light': 'Colour and light', 'texture_and_finish': 'Texture and finish',
    'layout_and_composition': 'Layout and composition', 'pacing_structure': 'Pacing and structure',
    'micro_interaction': 'Micro-interactions', 'depth_and_3d': 'Depth and 3D',
}
GENERATED = ('<!-- Generated by `python3 scripts/pick.py --write-docs references` from assets/library/techniques.json. '
             'Edit the JSON, then regenerate. -->')


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def family_list(entries, data):
    """[(name, about)] in the library's order; families only entries name come last, by name."""
    fams = families_of(data) or []
    named = {f for f, _ in fams}
    extra = sorted({e['family'] for e in entries if e.get('family') and e['family'] not in named})
    return fams + [(f, '') for f in extra]


def _sorted(es):
    return sorted(es, key=lambda e: (CATEGORIES.index(e['category']), list(ROLE_WEIGHT).index(e['role']), e['name'].lower(), e['id']))


def entry_markdown(e):
    meta = f"`{e['id']}` · {CATEGORY_TITLES[e['category']].lower()} · {e['role']} · energy {e['energy']} · {', '.join(e['formats'])}"
    if e.get('aliases'):
        meta += f" · also {', '.join('`' + a + '`' for a in e['aliases'])}"
    out = [f"### {e['name']}", '', meta, '', e['summary'], '', f"- **Build:** {e['recipe']}"]
    if e.get('ban_safe') is False:
        out.append(f"- **Ban-safe variant (the default):** {e['ban_safe_variant']} The full look relies on "
                   f"{', '.join(e.get('bans', []))}; use it only when the brand supplies that look.")
    if e.get('primitive'):
        out.append(f"- **Primitive:** {', '.join('`' + p + '`' for p in e['primitive'])}")
    if e.get('materials'):
        out.append(f"- **Materials:** {e['materials']}")
    if e.get('conditions'):
        out.append(f"- **Conditions:** {'; '.join(e['conditions'])}")
    out += [f"- **Timing:** {e['timing']}", f"- **Use when:** {e['use_when']}", f"- **Avoid when:** {e['avoid_when']}", '']
    return out


def library_markdown(entries, data):
    """The readable index (references/technique-library.md): generated from the JSON so the two never drift."""
    intros = data.get('intros', {}) if isinstance(data, dict) else {}
    fams = family_list(entries, data)
    by_cat = {c: [e for e in entries if e['category'] == c] for c in CATEGORIES}
    out = ['# Technique library', '', GENERATED, '',
           f'{len(entries)} techniques and devices in {len(fams)} families, each with a build recipe, the starter primitive '
           'that builds it when there is one, default timing at 60 fps, and when to use it. Don\'t choose from the library '
           'by hand: draw with `scripts/pick.py` (SKILL.md, Step 1), read a drawn entry with `pick.py --show <id>`, and come '
           'to its family file to find an alternative after a reroll or a small device for one beat '
           '(`pick.py --family "<family>" --n 2` draws from one family).', '',
           'Roles: a **workhorse** carries a film and can recur, an **accent** spices one moment, a **signature** is a hero '
           'move used once (at most 2 per launch film). A plan draws across many families: at most two entries from one '
           'family per film, and the entries your last films drew come up less often.', '',
           'Fields: **Primitive** names the starter export that builds the entry (`fx/Cards.press` is `press` in '
           '`src/fx/Cards.tsx`); an entry without one is a recipe in plain layers. **Materials** are construction '
           'numbers. **Conditions** say how a look the house otherwise avoids (a rainbow edge, a multi-hue gradient, a '
           'glow) is allowed inside that device: one dominant accent per film, every gradient baked and dithered. A '
           '**ban-safe variant** is the default where the full look relies on a house ban.', '',
           '## Families', '', '| Family | Entries | What it holds |', '|---|---|---|']
    for f, about in fams:
        n = sum(1 for e in entries if e.get('family') == f)
        if n:
            out.append(f'| [{f}](library/{slug(f)}.md) | {n} | {about} |')
    loose = [e for e in entries if not e.get('family')]
    if loose:
        out.append(f'| [Other](library/other.md) | {len(loose)} | Entries with no family yet. |')
    out += ['', '## Categories', '',
            'A plan fills its slots by category, in the order the format needs them. Each category\'s house rule, and the '
            'families its entries sit in:', '']
    for c in CATEGORIES:
        es = by_cat[c]
        if not es:
            continue
        out += [f'### {CATEGORY_TITLES[c]} ({len(es)})', '']
        if intros.get(c):
            out += [intros[c], '']
        counts = {}
        for e in es:
            counts[e.get('family') or 'Other'] = counts.get(e.get('family') or 'Other', 0) + 1
        out += ['Families: ' + ', '.join(f'{f} {n}' for f, n in sorted(counts.items(), key=lambda x: (-x[1], x[0]))) + '.', '']
    return '\n'.join(out).rstrip() + '\n'


def family_markdown(entries, data, name):
    """One family's file (references/library/<family>.md): every entry in full."""
    fams = dict(family_list(entries, data))
    if name == 'Other':
        es, about = [e for e in entries if not e.get('family')], 'Entries with no family yet.'
    else:
        es, about = [e for e in entries if e.get('family') == name], fams.get(name, '')
    out = [f'# {name}', '', GENERATED, '',
           (about + ' ' if about else '') + f'{len(es)} entries, by category and role. The [index](../technique-library.md) '
           'lists every family and each category\'s house rule.', '']
    for e in _sorted(es):
        out += entry_markdown(e)
    return '\n'.join(out).rstrip() + '\n'


def doc_files(entries, data):
    """{relative path: text} for every generated doc: the index and one file per family."""
    files = {'technique-library.md': library_markdown(entries, data)}
    for f, _ in family_list(entries, data):
        if any(e.get('family') == f for e in entries):
            files[f'library/{slug(f)}.md'] = family_markdown(entries, data, f)
    if any(not e.get('family') for e in entries):
        files['library/other.md'] = family_markdown(entries, data, 'Other')
    return files


def history_path():
    return os.environ.get('CINETIC_PICK_HISTORY') or os.path.join(os.path.expanduser('~'), '.cinetic', 'pick-history.json')


def history_on(flag_off):
    return not flag_off and os.environ.get('CINETIC_PICK_HISTORY', '').lower() != 'off'


def read_history(enabled):
    if not enabled:
        return []
    try:
        with open(history_path(), encoding='utf-8') as fh:
            h = json.load(fh)
        return [x for x in h if isinstance(x, dict) and isinstance(x.get('ids'), list)] if isinstance(h, list) else []
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
            json.dump(h[:HISTORY_KEEP], fh, indent=1)
    except OSError:
        pass


def read_picks(path, flag):
    try:
        prev = json.load(open(path, encoding='utf-8'))
        return [p for p in prev.get('picks', []) if isinstance(p, dict) and p.get('id')]
    except (OSError, ValueError, AttributeError, TypeError) as e:
        fail(f'{flag} {path}: {e}')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    ap.add_argument('--library', default=DEFAULT_LIBRARY, help='techniques JSON (default: assets/library/techniques.json in the skill, scripts/library/techniques.json in a film project)')
    ap.add_argument('--format', choices=FORMATS, help='the film format; filters entries and sets the plan shape')
    ap.add_argument('--energy', choices=ENERGIES + ['any'], default='calm',
                    help='weights entries toward this energy (default calm: calm copy, rich picture; any: no energy weight)')
    ap.add_argument('--seconds', type=float, help='the film length: about one technique per 3.5 s calm, 2.5 s otherwise (default per format)')
    ap.add_argument('--category', choices=CATEGORIES, help='draw only from this category')
    ap.add_argument('--family', help='draw (or --list, or --markdown) only from this family (its name or file name)')
    ap.add_argument('--n', type=int, default=1, help='how many to draw with --category or --family (default 1)')
    ap.add_argument('--plan', action='store_true', help='draw a whole-film plan (the default without --category or --family)')
    ap.add_argument('--seed', type=int, help='seed for a reproducible draw (default: random, printed)')
    ap.add_argument('--exclude', default='', help='comma-separated ids never to draw (e.g. a reroll)')
    ap.add_argument('--avoid', help='a JSON from an earlier --json run; its ids are not drawn again')
    ap.add_argument('--keep', help='the film\'s own plan (a --json file): its ids are not drawn again and its families count toward the cap')
    ap.add_argument('--max-per-family', type=int, default=MAX_PER_FAMILY, help=f'entries from one family per film (default {MAX_PER_FAMILY}; 0 = no cap)')
    ap.add_argument('--recent', help='comma-separated ids an earlier film drew (default: read from the pick history); they come up less often')
    ap.add_argument('--no-history', action='store_true', help='neither read nor write the pick history')
    ap.add_argument('--brand-supplied', default='', help=f'comma-separated banned looks the brand supplies: {",".join(BANS)}')
    ap.add_argument('--json', help='also write the draw here (a plan written this way is recorded in the pick history)')
    ap.add_argument('--list', action='store_true', help='list ids and names (optionally one --category or --family)')
    ap.add_argument('--show', metavar='ID', help='print one entry in full')
    ap.add_argument('--validate', action='store_true', help='check the library file and exit')
    ap.add_argument('--markdown', action='store_true', help='print the readable index (references/technique-library.md), or with --family that family\'s file')
    ap.add_argument('--write-docs', metavar='DIR', help='write the index and every family file under DIR (the skill\'s references/)')
    a = ap.parse_args()

    data = read_library(a.library)
    entries = load(a.library)
    by_id = {e['id']: e for e in entries}
    aliases = alias_map(entries)
    fams = [f for f, _ in family_list(entries, data)]

    family = None
    if a.family is not None:
        hit = [f for f in fams + ['Other'] if a.family in (f, slug(f)) or a.family.lower() == f.lower()]
        if not hit:
            fail(f'--family: no family {a.family!r}; the families: {", ".join(fams)}')
        family = hit[0]

    if a.validate:
        by = {c: sum(1 for e in entries if e['category'] == c) for c in CATEGORIES}
        nf = len({e['family'] for e in entries if e.get('family')})
        print(f'pick.py: {len(entries)} techniques in {sum(1 for v in by.values() if v)} categories'
              + (f' and {nf} families' if nf else '') + ': ' + ', '.join(f'{c} {n}' for c, n in by.items()))
        src = starter_src()
        if not src and any(e.get('primitive') for e in entries):
            print('pick.py: note: the starter source was not found, so primitives were checked for shape only')
        empty = [c for c, n in by.items() if n == 0]
        if empty:
            fail(f'categories with no entries: {", ".join(empty)}')
        return 0
    if a.write_docs:
        files = doc_files(entries, data)
        for rel, text in files.items():
            path = os.path.join(a.write_docs, *rel.split('/'))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(text)
        lib_dir = os.path.join(a.write_docs, 'library')
        stale = sorted(f for f in os.listdir(lib_dir) if f.endswith('.md') and f'library/{f}' not in files)
        print(f'pick.py: wrote {len(files)} files under {a.write_docs}'
              + (f'; stale (no family any more, delete them): {", ".join(stale)}' if stale else ''))
        return 0
    if a.markdown:
        text = family_markdown(entries, data, family) if family else library_markdown(entries, data)
        sys.stdout.write(text)
        return 0
    if a.list:
        for e in entries:
            if (not a.category or e['category'] == a.category) and (not family or (e.get('family') or 'Other') == family):
                print(f"{e['id']:<34} {e['category']:<22} {e['role']:<9} {e['name']}")
        return 0
    if a.show:
        hit = by_id.get(a.show) or by_id.get(aliases.get(a.show, ''))
        if not hit:
            fail(f'no technique {a.show!r} (run --list)', 1)
        print(render(hit, set()))
        return 0
    if a.n < 1:
        fail('--n must be at least 1')
    if a.max_per_family < 0:
        fail('--max-per-family must be 0 (no cap) or more')

    seed = a.seed if a.seed is not None else int.from_bytes(os.urandom(4), 'big')
    rng = random.Random(seed)
    allowed = {b.strip().lower() for b in a.brand_supplied.split(',') if b.strip()}
    unknown = allowed - set(BANS)
    if unknown:
        fail(f'--brand-supplied: unknown look(s) {", ".join(sorted(unknown))}; choose from {", ".join(BANS)}')
    canon = lambda i: aliases.get(i, i)
    taken = {canon(x.strip()) for x in a.exclude.split(',') if x.strip()}
    if a.avoid:
        taken |= {canon(p['id']) for p in read_picks(a.avoid, '--avoid')}
    families = {}
    if a.keep:
        for p in read_picks(a.keep, '--keep'):
            e = by_id.get(canon(p['id']))
            taken.add(canon(p['id']))
            if e and e.get('family'):
                families[e['family']] = families.get(e['family'], 0) + 1
    hist = history_on(a.no_history)
    if a.recent is not None:
        recent = [canon(x.strip()) for x in a.recent.split(',') if x.strip()]
    else:
        recent = list(dict.fromkeys(canon(i) for h in read_history(hist)[:RECENT_FILMS] for i in h['ids']))
    recent = [i for i in recent if i in by_id]
    rec = set(recent)
    cap = a.max_per_family
    pool = [e for e in entries if fits(e, a.format) and (not family or (e.get('family') or 'Other') == family)]

    picks = []
    single = (a.category or family) and not a.plan
    if single:
        cat_pool = [e for e in pool if not a.category or e['category'] == a.category]
        picks, _ = draw(cat_pool, a.n, rng, a.energy, taken, a.n, families, cap, rec)
    else:
        fmt = a.format or 'launch'
        seconds = a.seconds if a.seconds else DEFAULT_SECONDS[fmt]
        size = plan_size(fmt, seconds, a.energy)
        sig = 2 if size >= 10 else 1  # signature moves per film
        for cat, n in plan_slots(fmt, seconds, a.energy).items():
            got, sig = draw([e for e in pool if e['category'] == cat], n, rng, a.energy, taken, sig, families, cap, rec)
            picks += got
        # A slot whose category has nothing at this energy passes on down the format's order.
        rest = ORDER[fmt][size:] + ORDER[fmt]
        while len(picks) < size and rest:
            cat = rest.pop(0)
            got, sig = draw([e for e in pool if e['category'] == cat], 1, rng, a.energy, taken, sig, families, cap, rec)
            picks += got
    if not picks:
        if single:
            what = ' '.join(x for x in (a.category, f'family {family!r}' if family else '') if x)
            left = [e['id'] for e in pool if (not a.category or e['category'] == a.category) and e['id'] not in taken]
            fail(f'no {what} technique is left for --format {a.format or "any"} '
                 f'({len(taken)} excluded, {len(left)} left). That pick has run out: drop it, with a reason in the '
                 'treatment, or take the slot from another category', 1)
        fail('nothing fits these filters (try a broader --format)', 1)

    head = (f"<!-- pick.py --seed {seed}"
            + (f" --format {a.format}" if a.format else '') + (f" --energy {a.energy}" if a.energy else '')
            + (f" --seconds {a.seconds:g}" if a.seconds and not single else '')
            + (f" --category {a.category}" if a.category and single else '')
            + (f' --family "{family}"' if family and single else '')
            + (f" --n {a.n}" if single else '')
            + (f" --max-per-family {cap}" if cap != MAX_PER_FAMILY else '')
            + (f" --recent {','.join(recent)}" if recent else '') + ' -->')
    print(head)
    print(f"# Drawn techniques (seed {seed})\n")
    print('Build the picks the concept can carry, each retold in its objects. Reroll a pick at most twice, or drop it, with a written reason.\n')
    if len(picks) > 1:
        for e in picks:
            fam = f", {e['family']}" if e.get('family') else ''
            print(f"- {e['category']}: {e['name']} (`{e['id']}`, {e['role']}{fam})")
        print()
    for e in picks:
        print(render(e, allowed))
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, 'w', encoding='utf-8') as fh:
            json.dump({'seed': seed, 'format': a.format, 'energy': a.energy, 'category': a.category, 'family': family,
                       'recent': recent,
                       'picks': [{'id': e['id'], 'name': e['name'], 'category': e['category'], 'family': e.get('family'),
                                  'role': e['role']} for e in picks]}, fh, indent=1)
        if not single:
            write_history(hist, {'ids': [e['id'] for e in picks], 'format': a.format or 'launch'})
    return 0


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):  # a Windows console is cp1252: "≤" in the plan would crash it
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    try:
        sys.exit(main())
    except BrokenPipeError:  # `pick.py | head`: the reader closed early
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        sys.exit(0)
