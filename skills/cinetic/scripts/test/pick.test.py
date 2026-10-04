#!/usr/bin/env python3
"""pick.test.py: regression tests for pick.py, the weighted random draw from the technique library.

  1. The fixture library validates; broken libraries are refused with exit 2 and a reason.
  2. Draws are reproducible per seed, honour --format, --exclude and --avoid, and never break the
     per-film signature cap.
  3. Ban-unsafe entries print their ban-safe variant unless the brand supplies every banned look.
  4. Weights do what the docstring says: workhorses come up more often than signatures.
  5. The shipped library (assets/library/techniques.json) validates, can fill a plan for every format,
     and references/technique-library.md is exactly its generated Markdown.

Usage (from the skill root):  python3 scripts/test/pick.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
PICK = os.path.join(SKILL, 'scripts', 'pick.py')
FIXTURE = os.path.join(HERE, 'pick-fixtures', 'library.json')
SHIPPED = os.path.join(SKILL, 'assets', 'library', 'techniques.json')
VERBOSE = '--verbose' in sys.argv
failed = 0


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


def pick(*args, library=FIXTURE):
    r = subprocess.run([sys.executable, PICK, '--library', library, *args], capture_output=True, text=True)
    if VERBOSE:
        print(f'  $ pick.py {" ".join(args)} -> {r.returncode}\n' + r.stdout[-600:] + r.stderr[-600:])
    return r


def draw_json(*args, library=FIXTURE):
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'picks.json')
        r = pick(*args, '--json', out, library=library)
        data = json.load(open(out, encoding='utf-8')) if r.returncode == 0 else {'picks': []}
    return r, data


def ids(data):
    return [p['id'] for p in data['picks']]


# 1. Validation ---------------------------------------------------------------------------------
r = pick('--validate')
result(r.returncode == 0 and '23 techniques in 14 categories' in r.stdout, 'fixture library validates', r.stderr.strip())

fixture = json.load(open(FIXTURE, encoding='utf-8'))['techniques']
broken = [dict(e) for e in fixture]
broken[1] = dict(broken[1], id=broken[0]['id'])                   # duplicate id
broken[2] = {k: v for k, v in broken[2].items() if k != 'recipe'}  # missing field
broken[3] = dict(broken[3], ban_safe=False)                       # no variant, no bans
broken[4] = dict(broken[4], category='fireworks')                 # unknown category
broken[5] = dict(broken[5], bans=['neon-sign'])                    # unknown ban
with tempfile.TemporaryDirectory() as tmp:
    bad = os.path.join(tmp, 'bad.json')
    json.dump({'techniques': broken}, open(bad, 'w', encoding='utf-8'))
    r = pick('--validate', library=bad)
    want = ['duplicate id', 'missing recipe', 'no ban_safe_variant', 'unknown category', 'bans must be a list']
    missing = [w for w in want if w not in r.stderr]
    result(r.returncode == 2 and not missing, 'a broken library is refused with every reason', f'missing {missing}' if missing else '')
    json.dump({'techniques': []}, open(bad, 'w', encoding='utf-8'))
    result(pick('--validate', library=bad).returncode == 2, 'an empty library is refused')
    r = pick('--validate', library=os.path.join(tmp, 'nope.json'))
    result(r.returncode == 2 and 'cannot read' in r.stderr, 'a missing library file is refused')

# 2. Draws --------------------------------------------------------------------------------------
a, b = pick('--format', 'launch', '--seed', '7'), pick('--format', 'launch', '--seed', '7')
result(a.returncode == 0 and a.stdout == b.stdout, 'same seed, same plan')
result('<!-- pick.py --seed 7 --format launch -->' in a.stdout, 'the seed header reproduces the call')
plans = {pick('--format', 'launch', '--seed', str(s)).stdout for s in range(8)}
result(len(plans) > 1, 'different seeds give different plans', f'{len(plans)} distinct of 8')

r = pick('--seed', '3')
result(r.returncode == 0 and 'seed 3' in r.stdout, 'no --format draws a launch-shaped plan')

seen_loop_only = False
for s in range(40):
    _, d = draw_json('--format', 'launch', '--seed', str(s))
    if 'fx-tr-loop-only' in ids(d):
        seen_loop_only = True
result(not seen_loop_only, '--format launch never draws a loop-only entry')
loop_hits = sum('fx-tr-loop-only' in ids(draw_json('--format', 'loop', '--energy', 'calm', '--seed', str(s))[1]) for s in range(40))
result(loop_hits > 0, '--format loop can draw a loop-only entry', f'{loop_hits}/40')

worst = {}
for fmt, cap in (('launch', 2), ('sting', 1), ('feature', 1)):
    worst[fmt] = max(sum(p['role'] == 'signature' for p in draw_json('--format', fmt, '--energy', 'high', '--seed', str(s))[1]['picks'])
                     for s in range(60))
    result(worst[fmt] <= cap, f'{fmt} plans hold at most {cap} signature move(s)', f'worst {worst[fmt]}')

_, d = draw_json('--category', 'transition', '--n', '7', '--seed', '1', '--exclude', 'fx-tr-accent,fx-tr-workhorse')
result(not {'fx-tr-accent', 'fx-tr-workhorse'} & set(ids(d)), '--exclude keeps ids out of the draw')
result(len(ids(d)) == len(set(ids(d))), 'a draw never repeats an id')

with tempfile.TemporaryDirectory() as tmp:
    prev = os.path.join(tmp, 'prev.json')
    pick('--format', 'launch', '--seed', '11', '--json', prev)
    used = set(ids(json.load(open(prev, encoding='utf-8'))))
    _, d = draw_json('--format', 'launch', '--seed', '12', '--avoid', prev)
    result(used and not used & set(ids(d)), '--avoid skips every id from an earlier draw')
    open(prev, 'w').write('not json')
    result(pick('--format', 'launch', '--avoid', prev).returncode == 2, 'an unreadable --avoid file is exit 2')

r, d = draw_json('--category', 'camera', '--n', '1', '--seed', '5')
result(r.returncode == 0 and d['seed'] == 5 and len(d['picks']) == 1 and d['picks'][0]['category'] == 'camera',
       '--json records the seed and the picks')
result(pick('--category', 'depth_and_3d', '--n', '1', '--exclude', 'fx-depth-and-3d').returncode == 1,
       'exit 1 when nothing fits')
result(pick('--category', 'camera', '--n', '0').returncode == 2, '--n 0 is exit 2')
r = pick('--show', 'fx-camera')
result(r.returncode == 0 and '**Build:** Build fx-camera.' in r.stdout, '--show prints one entry in full')
result(pick('--show', 'fx-nope').returncode == 1, '--show of an unknown id is exit 1')
r = pick('--markdown')
result(r.returncode == 0 and '## Transitions' in r.stdout and '- [Transitions](#transitions) (7)' in r.stdout
       and 'Ban-safe variant (the default):** Opaque' in r.stdout, '--markdown renders contents, sections and ban-safe variants')
r = pick('--list', '--category', 'transition')
result(r.returncode == 0 and len(r.stdout.strip().splitlines()) == 7, '--list --category lists that category only')

# 3. Bans ---------------------------------------------------------------------------------------
r = pick('--show', 'fx-glass-panel')
result('ban-safe variant' in r.stdout and 'Opaque raised panel' in r.stdout, 'a ban-unsafe entry shows its ban-safe variant')


def glass_draw(*extra):
    for s in range(60):
        r = pick('--category', 'ui_choreography', '--n', '1', '--seed', str(s), *extra)
        if 'fx-glass-panel' in r.stdout:
            return r.stdout
    return ''


out = glass_draw()
result(out and 'Build (ban-safe variant):** Opaque' in out, 'a drawn ban-unsafe entry is built from its variant')
out = glass_draw('--brand-supplied', 'glass')
result(out and '**Build:** Frosted glass' in out, '--brand-supplied glass restores the original recipe')
out = glass_draw('--brand-supplied', 'serif')
result(out and 'ban-safe variant' in out, 'supplying a different look keeps the variant')
r = pick('--category', 'camera', '--brand-supplied', 'neon')
result(r.returncode == 2 and 'unknown look' in r.stderr, 'an unknown --brand-supplied look is exit 2')

# 4. Weights (in process: hundreds of draws) ----------------------------------------------------
import importlib.util
import random

spec = importlib.util.spec_from_file_location('pick', PICK)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
pool = [e for e in fixture if e['category'] == 'transition' and mod.fits(e, 'launch')]


def tally(energy):
    counts = {}
    for s in range(2000):
        got, _ = mod.draw(pool, 1, random.Random(s), energy, set(), 1)
        counts[got[0]['id']] = counts.get(got[0]['id'], 0) + 1
    return counts


counts = tally(None)
work, sig = counts.get('fx-tr-workhorse', 0), counts.get('fx-tr-sig-c', 0)
result(work > 3 * max(sig, 1), 'a proven workhorse is drawn far more often than an unproven signature', f'{work} vs {sig}')
high = tally('high')
result(high.get('fx-tr-sig-a', 0) > 2 * high.get('fx-tr-sig-c', 0), '--energy high favours high-energy entries',
       f"{high.get('fx-tr-sig-a', 0)} vs {high.get('fx-tr-sig-c', 0)}")

# 5. The shipped library ------------------------------------------------------------------------
if os.path.exists(SHIPPED):
    r = pick('--validate', library=SHIPPED)
    result(r.returncode == 0, 'the shipped library validates', (r.stderr or r.stdout).strip()[:300])
    for fmt in ('launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical'):
        r, d = draw_json('--format', fmt, '--seed', '1', library=SHIPPED)
        cats = {p['category'] for p in d['picks']}
        result(r.returncode == 0 and len(cats) >= 6, f'the shipped library fills a {fmt} plan', f'{len(d["picks"])} picks, {len(cats)} categories')
    md = os.path.join(SKILL, 'references', 'technique-library.md')
    r = pick('--markdown', library=SHIPPED)
    same = os.path.exists(md) and open(md, encoding='utf-8').read() == r.stdout
    result(same, 'references/technique-library.md matches the JSON', '' if same else 'run: python3 scripts/pick.py --markdown > references/technique-library.md')
else:
    result(False, 'the shipped library exists', SHIPPED)

print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
