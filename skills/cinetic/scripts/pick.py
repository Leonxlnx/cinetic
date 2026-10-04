#!/usr/bin/env python3
"""Draw techniques from the library at random, so films don't converge on the same few moves.

An agent left to choose picks the first familiar option: the same fade-up, the same push-in, the
same end card. pick.py draws from assets/library/techniques.json instead, weighted toward what
fits the film (format, energy) and toward proven workhorses, and prints the build recipe for each
draw. The seed is printed, so a plan can be reproduced and written into TREATMENT.md.

Weights: role (workhorse 3, accent 2, signature 1) x proof (1 + evidence / 4, capped at 3) x
energy fit (same 1.0, "any" 0.7, other 0.25). Entries whose formats don't include the film's
format (or "any") are never drawn. Entries that rely on a house-banned look (ban_safe false)
are drawn with their ban-safe variant as the recipe, unless --brand-supplied names that look.

Usage:
  python3 scripts/pick.py --format launch --energy high               # a whole-film plan
  python3 scripts/pick.py --format loop --energy calm --seed 41       # reproducible plan
  python3 scripts/pick.py --category transition --n 3 --format launch # three transitions
  python3 scripts/pick.py --category logo_and_end_card --exclude le-hard-cut-lockup
  python3 scripts/pick.py --plan --avoid out/qa/picks-previous.json    # skip ids used before
  python3 scripts/pick.py --list [--category camera]                  # ids and names
  python3 scripts/pick.py --show tr-mask-wipe-swap                    # one entry in full
  python3 scripts/pick.py --validate                                  # check the library file
  python3 scripts/pick.py ... --json out/qa/picks.json                # also write the draw as JSON

Rules for the agent (SKILL.md, Step 1): draw before you design; build what was drawn, adapted to
the concept; reroll a single pick (--exclude it, same --category) at most twice and write down
why. A draw is a starting point for invention, not a template to paste.

Exit 0 on success, 1 when nothing fits the filters, 2 on bad input or an invalid library.
"""
import argparse
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_LIBRARY = os.path.normpath(os.path.join(HERE, '..', 'assets', 'library', 'techniques.json'))

CATEGORIES = ['opening_hook', 'transition', 'camera', 'typography_motion', 'ui_choreography',
              'data_and_numbers', 'product_demo', 'logo_and_end_card', 'color_and_light',
              'texture_and_finish', 'layout_and_composition', 'pacing_structure',
              'micro_interaction', 'depth_and_3d']
FORMATS = ['launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical']
ENERGIES = ['calm', 'medium', 'high']
ROLE_WEIGHT = {'workhorse': 3.0, 'accent': 2.0, 'signature': 1.0}
REQUIRED = ['id', 'name', 'category', 'summary', 'recipe', 'timing', 'use_when', 'avoid_when',
            'formats', 'energy', 'role', 'ban_safe', 'evidence']

# How many draws per category make one film, by format. Signature moments are capped per film.
PLAN = {
    'launch': {'opening_hook': 1, 'transition': 3, 'camera': 1, 'typography_motion': 2,
               'ui_choreography': 2, 'data_and_numbers': 1, 'product_demo': 1,
               'logo_and_end_card': 1, 'color_and_light': 1, 'texture_and_finish': 1,
               'layout_and_composition': 1, 'pacing_structure': 1, 'micro_interaction': 1,
               'depth_and_3d': 1},
    'feature': {'opening_hook': 1, 'transition': 2, 'camera': 1, 'typography_motion': 1,
                'ui_choreography': 2, 'data_and_numbers': 1, 'product_demo': 1,
                'logo_and_end_card': 1, 'color_and_light': 1, 'layout_and_composition': 1,
                'micro_interaction': 2},
    'loop': {'transition': 1, 'camera': 1, 'typography_motion': 1, 'ui_choreography': 2,
             'product_demo': 1, 'color_and_light': 1, 'layout_and_composition': 1,
             'pacing_structure': 1, 'micro_interaction': 2},
    'sting': {'opening_hook': 1, 'typography_motion': 1, 'logo_and_end_card': 1, 'camera': 1,
              'color_and_light': 1, 'texture_and_finish': 1, 'micro_interaction': 1},
    'walkthrough': {'opening_hook': 1, 'transition': 2, 'camera': 1, 'typography_motion': 1,
                    'ui_choreography': 3, 'product_demo': 2, 'logo_and_end_card': 1,
                    'layout_and_composition': 1, 'pacing_structure': 1, 'micro_interaction': 2},
    'vertical': {'opening_hook': 1, 'transition': 2, 'camera': 1, 'typography_motion': 2,
                 'ui_choreography': 2, 'data_and_numbers': 1, 'product_demo': 1,
                 'logo_and_end_card': 1, 'color_and_light': 1, 'layout_and_composition': 1,
                 'micro_interaction': 1},
}
MAX_SIGNATURE = {'launch': 2, 'feature': 1, 'loop': 1, 'sting': 1, 'walkthrough': 1, 'vertical': 1}
BANS = ['glass', 'glow', 'serif', 'italic', 'orange', 'beige', 'purple', 'gradient', 'filler-text',
        'emoji', 'sparkle', 'confetti', 'particles']


def fail(msg, code=2):
    print(f'pick.py: {msg}', file=sys.stderr)
    sys.exit(code)


def load(path):
    try:
        with open(path, encoding='utf-8') as fh:
            data = json.load(fh)
    except (OSError, ValueError) as e:
        fail(f'cannot read the library {path}: {e}')
    entries = data['techniques'] if isinstance(data, dict) else data
    problems = validate(entries)
    if problems:
        fail('invalid library:\n  ' + '\n  '.join(problems[:20]))
    return entries


def validate(entries):
    problems, seen = [], set()
    if not isinstance(entries, list) or not entries:
        return ['the library holds no techniques']
    for i, e in enumerate(entries):
        where = e.get('id', f'#{i}') if isinstance(e, dict) else f'#{i}'
        if not isinstance(e, dict):
            problems.append(f'{where}: not an object')
            continue
        for k in REQUIRED:
            if k not in e or e[k] in ('', None):
                problems.append(f'{where}: missing {k}')
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
        if not isinstance(e.get('evidence', 0), (int, float)):
            problems.append(f'{where}: evidence must be a number')
    return problems


def weight(e, energy):
    w = ROLE_WEIGHT[e['role']] * min(3.0, 1.0 + float(e.get('evidence') or 0) / 4.0)
    if energy:
        w *= 1.0 if e['energy'] == energy else (0.7 if e['energy'] == 'any' else 0.25)
    return w


def fits(e, fmt):
    return not fmt or 'any' in e['formats'] or fmt in e['formats']


def draw(pool, n, rng, energy, taken, signature_left):
    """Weighted draw without replacement. Returns (picks, signature_left)."""
    picks = []
    cand = [e for e in pool if e['id'] not in taken]
    while len(picks) < n and cand:
        if signature_left <= 0:
            cand = [e for e in cand if e['role'] != 'signature']
            if not cand:
                break
        ws = [weight(e, energy) for e in cand]
        e = rng.choices(cand, weights=ws, k=1)[0]
        picks.append(e)
        taken.add(e['id'])
        if e['role'] == 'signature':
            signature_left -= 1
        cand = [c for c in cand if c['id'] != e['id']]
    return picks, signature_left


def brand_allows(e, allowed):
    note = (e.get('ban_safe_variant', '') + ' ' + e.get('ban_note', '') + ' ' + e.get('recipe', '')).lower()
    return any(b in note for b in allowed)


def render(e, allowed):
    lines = [f"### {e['name']}  `{e['id']}`",
             f"*{e['category']} · {e['role']} · energy {e['energy']} · formats {', '.join(e['formats'])}*", '',
             e['summary'], '']
    if e.get('ban_safe') is False and not brand_allows(e, allowed):
        lines += [f"**Build (ban-safe variant):** {e['ban_safe_variant']}",
                  f"(The original look touches a house ban; use it only for a brand that supplies it: {e['recipe']})"]
    else:
        lines += [f"**Build:** {e['recipe']}"]
    lines += [f"**Timing:** {e['timing']}", f"**Use when:** {e['use_when']}", f"**Avoid when:** {e['avoid_when']}", '']
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog=__doc__.split('\n\n', 1)[1])
    ap.add_argument('--library', default=DEFAULT_LIBRARY, help='techniques JSON (default: assets/library/techniques.json)')
    ap.add_argument('--format', choices=FORMATS, help='the film format; filters entries and sets the plan shape')
    ap.add_argument('--energy', choices=ENERGIES, help='weights entries toward this energy')
    ap.add_argument('--category', choices=CATEGORIES, help='draw only from this category')
    ap.add_argument('--n', type=int, default=1, help='how many to draw with --category (default 1)')
    ap.add_argument('--plan', action='store_true', help='draw a whole-film plan (the default without --category)')
    ap.add_argument('--seed', type=int, help='seed for a reproducible draw (default: random, printed)')
    ap.add_argument('--exclude', default='', help='comma-separated ids never to draw (e.g. a reroll)')
    ap.add_argument('--avoid', help='a JSON from an earlier --json run; its ids are not drawn again')
    ap.add_argument('--brand-supplied', default='', help=f'comma-separated banned looks the brand supplies: {",".join(BANS)}')
    ap.add_argument('--json', help='also write the draw here')
    ap.add_argument('--list', action='store_true', help='list ids and names (optionally one --category)')
    ap.add_argument('--show', metavar='ID', help='print one entry in full')
    ap.add_argument('--validate', action='store_true', help='check the library file and exit')
    a = ap.parse_args()

    entries = load(a.library)
    if a.validate:
        by = {c: sum(1 for e in entries if e['category'] == c) for c in CATEGORIES}
        print(f'pick.py: {len(entries)} techniques in {sum(1 for v in by.values() if v)} categories: '
              + ', '.join(f'{c} {n}' for c, n in by.items()))
        empty = [c for c, n in by.items() if n == 0]
        if empty:
            fail(f'categories with no entries: {", ".join(empty)}')
        return 0
    if a.list:
        for e in entries:
            if not a.category or e['category'] == a.category:
                print(f"{e['id']:<34} {e['category']:<22} {e['role']:<9} {e['name']}")
        return 0
    if a.show:
        hit = [e for e in entries if e['id'] == a.show]
        if not hit:
            fail(f'no technique {a.show!r} (run --list)', 1)
        print(render(hit[0], set()))
        return 0
    if a.n < 1:
        fail('--n must be at least 1')

    seed = a.seed if a.seed is not None else int.from_bytes(os.urandom(4), 'big')
    rng = random.Random(seed)
    allowed = {b.strip().lower() for b in a.brand_supplied.split(',') if b.strip()}
    unknown = allowed - set(BANS)
    if unknown:
        fail(f'--brand-supplied: unknown look(s) {", ".join(sorted(unknown))}; choose from {", ".join(BANS)}')
    taken = {x.strip() for x in a.exclude.split(',') if x.strip()}
    if a.avoid:
        try:
            prev = json.load(open(a.avoid, encoding='utf-8'))
            taken |= {p['id'] for p in prev.get('picks', [])}
        except (OSError, ValueError, KeyError, TypeError) as e:
            fail(f'--avoid {a.avoid}: {e}')
    pool = [e for e in entries if fits(e, a.format)]

    picks = []
    if a.category and not a.plan:
        cat_pool = [e for e in pool if e['category'] == a.category]
        picks, _ = draw(cat_pool, a.n, rng, a.energy, taken, signature_left=a.n)
    else:
        fmt = a.format or 'launch'
        sig = MAX_SIGNATURE[fmt]
        for cat, n in PLAN[fmt].items():
            got, sig = draw([e for e in pool if e['category'] == cat], n, rng, a.energy, taken, sig)
            picks += got
    if not picks:
        fail('nothing fits these filters (try without --energy, or a broader --format)', 1)

    head = (f"<!-- pick.py --seed {seed}"
            + (f" --format {a.format}" if a.format else '') + (f" --energy {a.energy}" if a.energy else '')
            + (f" --category {a.category} --n {a.n}" if a.category and not a.plan else '') + ' -->')
    print(head)
    print(f"# Drawn techniques (seed {seed})\n")
    print('Build each one, adapted to the concept. Reroll a single pick at most twice, with a written reason.\n')
    for e in picks:
        print(render(e, allowed))
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, 'w', encoding='utf-8') as fh:
            json.dump({'seed': seed, 'format': a.format, 'energy': a.energy, 'category': a.category,
                       'picks': [{'id': e['id'], 'name': e['name'], 'category': e['category'], 'role': e['role']}
                                 for e in picks]}, fh, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
