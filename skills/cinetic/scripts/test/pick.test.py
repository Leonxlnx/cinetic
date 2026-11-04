#!/usr/bin/env python3
"""pick.test.py: regression tests for pick.py, the weighted random draw from the technique library.

  1. The fixture library validates; broken libraries are refused with exit 2 and a reason.
  2. Draws are reproducible per seed, honour --format, --exclude and --avoid, and never break the
     signature cap of a film. The default energy is calm: calm copy, a picture that never rests (a
     copy category never draws a high-energy entry, a picture category draws one at half weight), a
     calm plan holds one technique per 3.5 s, and a slot with nothing calm left passes down the order.
  3. Ban-unsafe entries print their ban-safe variant unless the brand supplies every banned look.
  4. Weights do what the docstring says: workhorses come up more often than signatures.
  5. The shipped library (assets/library/techniques.json) validates, every entry has a family and a
     primitive list, it can fill a plan for every format, and references/technique-library.md plus
     references/library/<family>.md are exactly its generated Markdown (no stale family file).
  6. The update format: an 8-20 s update film draws its hook, a product moment and its end card first,
     from entries made for update films and from launch, feature and sting entries, never from entries
     that only fit a loop, a walkthrough or a vertical film.
  7. Variety: at most two entries from one family per film (--max-per-family, --keep), entries an
     earlier film drew come up less often (--recent, the pick history), merged ids still resolve.
  8. Hard bans, what exists and the dealt direction: an entry whose recipe puts overshoot or bounce on
     copy, or a script, handwritten, serif or italic face, is never drawn (a brand's serif lifts that
     one); --have keeps UI devices to films with ui and typing or cursor devices to films with input;
     --direction (out/direction.json by default) sets the plan's format, honours its --have, weights its
     techniques up, never draws the ones that fight it and holds one signature, its own; --family takes
     the start of a name.
  9. The script's lines: a whole-film plan carries a line track in one voice: one text animation for every
     sentence (--lines, default from the format and length) from the type arrivals, 0-2 accents for the hero
     line (one per 30 s, none for 1-2 lines), one exit, outside the family cap; the picture plan then draws no type device; --lines 0 turns it
     off; type devices weigh x2, imagery devices x0.2 unless --have photos or footage; the JSON and the
     history carry the lines, and the next plan's --recent names them; the plan names the presets of
     src/fx/TypePresets.tsx when the starter has them.

Usage (from the skill root):  python3 scripts/test/pick.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import types

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


ENV = dict(os.environ, CINETIC_PICK_HISTORY='off')  # the user's own pick history never enters a test


_cli_spec = importlib.util.spec_from_file_location('pick_cli', PICK)
CLI = importlib.util.module_from_spec(_cli_spec)
_cli_spec.loader.exec_module(CLI)


def pick(*args, library=FIXTURE, env=None):
    """Run pick.py's command line in this process (hundreds of draws: one interpreter, not hundreds)."""
    saved_env, saved_argv = dict(os.environ), sys.argv
    out, err, code = io.StringIO(), io.StringIO(), 0
    os.environ.clear()
    os.environ.update(env or ENV)
    sys.argv = ['pick.py', '--library', library, *args]
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = CLI.main() or 0
    except SystemExit as e:
        code = e.code if isinstance(e.code, int) else (0 if e.code is None else 2)
    finally:
        sys.argv = saved_argv
        os.environ.clear()
        os.environ.update(saved_env)
    r = types.SimpleNamespace(returncode=code, stdout=out.getvalue(), stderr=err.getvalue())
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
r = subprocess.run([sys.executable, PICK, '--library', FIXTURE, '--validate'], capture_output=True, text=True, encoding='utf-8', env=ENV)
result(r.returncode == 0 and '24 techniques in 14 categories and 15 families' in r.stdout, 'fixture library validates (from the command line)', r.stderr.strip())

fixture = json.load(open(FIXTURE, encoding='utf-8'))['techniques']
broken = [dict(e) for e in fixture]
broken[1] = dict(broken[1], id=broken[0]['id'])                   # duplicate id
broken[2] = {k: v for k, v in broken[2].items() if k != 'recipe'}  # missing field
broken[3] = dict(broken[3], ban_safe=False)                       # no variant, no bans
broken[4] = dict(broken[4], category='fireworks')                 # unknown category
broken[5] = dict(broken[5], bans=['neon-sign'])                    # unknown ban
broken[6] = dict(broken[6], primitive=['fx/Nowhere.thing'])         # a primitive the starter lacks
broken[7] = dict(broken[7], primitive=['fx/Cards.notAnExport'])     # an export the module lacks
broken[8] = dict(broken[8], family='Not listed')                   # a family the library does not list
broken[9] = dict(broken[9], aliases=[broken[10]['id']])            # an alias that is also an id
broken[11] = dict(broken[11], evidence=12)                          # a weight out of 0-9
with tempfile.TemporaryDirectory() as tmp:
    bad = os.path.join(tmp, 'bad.json')
    json.dump({'families': json.load(open(FIXTURE, encoding='utf-8'))['families'], 'techniques': broken}, open(bad, 'w', encoding='utf-8'))
    r = pick('--validate', library=bad)
    want = ['duplicate id', 'missing recipe', 'no ban_safe_variant', 'unknown category', 'bans must be a list',
            'the starter has no src/fx/Nowhere', 'does not export notAnExport', "is not in the library's families",
            'is also an id', 'weight must be a number 0-9']
    missing = [w for w in want if w not in r.stderr]
    result(r.returncode == 2 and not missing, 'a broken library is refused with every reason', f'missing {missing}' if missing else '')
    json.dump({'techniques': []}, open(bad, 'w', encoding='utf-8'))
    result(pick('--validate', library=bad).returncode == 2, 'an empty library is refused')
    r = pick('--validate', library=os.path.join(tmp, 'nope.json'))
    result(r.returncode == 2 and 'cannot read' in r.stderr, 'a missing library file is refused')

# 2. Draws --------------------------------------------------------------------------------------
a, b = pick('--format', 'launch', '--seed', '7'), pick('--format', 'launch', '--seed', '7')
result(a.returncode == 0 and a.stdout == b.stdout, 'same seed, same plan')
result('<!-- pick.py --seed 7 --format launch --energy calm -->' in a.stdout, 'the seed header reproduces the call')
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
loop_hits = sum('fx-tr-loop-only' in ids(draw_json('--format', 'loop', '--energy', 'calm', '--seconds', '20', '--seed', str(s))[1]) for s in range(40))
result(loop_hits > 0, '--format loop can draw a loop-only entry', f'{loop_hits}/40')

sizes = {(f, sec): len(draw_json('--format', f, '--seconds', str(sec), '--seed', '2', '--energy', 'high', '--lines', '0')[1]['picks'])
         for f, sec in (('vertical', 12), ('launch', 30), ('launch', 45), ('sting', 6), ('loop', 10), ('walkthrough', 90))}
result(sizes[('vertical', 12)] == 5 and sizes[('launch', 30)] == 12, 'an energetic plan holds about one technique per 2.5 s', str(sizes))
calm = {sec: len(draw_json('--format', 'launch', '--seconds', str(sec), '--seed', '2')[1]['picks']) for sec in (30, 45)}
result(calm == {30: 9, 45: 13}, 'a calm plan (the default) holds about one technique per 3.5 s', str(calm))
result(sizes[('sting', 6)] == 4 and sizes[('loop', 10)] == 4, 'short pieces still draw at least 4', str(sizes))
import importlib.util
_spec = importlib.util.spec_from_file_location('pick_sizes', PICK)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
result(sizes[('launch', 45)] == 18 and _mod.plan_size('walkthrough', 90) == len(_mod.ORDER['walkthrough']),
       'long films stop at the format\'s full order', str(sizes))
r = pick('--format', 'sting', '--seed', '4')
result(r.returncode == 0 and 'logo_and_end_card' in r.stdout.split('###')[0], 'a sting draws its end card first')
worst = {}
for fmt, cap in (('launch', 2), ('sting', 1), ('feature', 1)):
    worst[fmt] = max(sum(p['role'] == 'signature' for p in draw_json('--format', fmt, '--energy', 'high', '--seed', str(s))[1]['picks'])
                     for s in range(60))
    result(worst[fmt] <= cap, f'{fmt} plans hold at most {cap} signature move(s)', f'worst {worst[fmt]}')

HIGH = {e['id'] for e in fixture if e['energy'] == 'high'}
type_hits = set()
for s_ in range(40):
    type_hits |= set(ids(draw_json('--category', 'typography_motion', '--n', '2', '--seed', str(s_))[1]))
calm_hits = set()
for s_ in range(40):
    calm_hits |= set(ids(draw_json('--category', 'transition', '--n', '3', '--seed', str(s_))[1]))
any_hits = set()
for s_ in range(40):
    any_hits |= set(ids(draw_json('--category', 'typography_motion', '--n', '2', '--seed', str(s_), '--energy', 'any')[1]))
result(type_hits and not type_hits & HIGH, 'a calm draw (the default) never takes a high-energy copy entry', str(sorted(type_hits & HIGH)))
result(calm_hits & HIGH, 'calm copy, a picture that never rests: a calm draw can take a high-energy picture entry', str(sorted(calm_hits)))
result(any_hits & HIGH, '--energy any draws high-energy copy entries too', str(sorted(any_hits & HIGH)))
with tempfile.TemporaryDirectory() as tmp:
    lib = os.path.join(tmp, 'type-high.json')
    json.dump({'techniques': [dict(e, energy='high') if e['category'] == 'typography_motion' else e for e in fixture]},
              open(lib, 'w', encoding='utf-8'))
    _, d = draw_json('--format', 'sting', '--seed', '3', library=lib)
    cats = [p['category'] for p in d['picks']]
    result(len(cats) == 4 and 'typography_motion' not in cats, 'a slot with nothing calm left passes to the next category', str(cats))

_, d = draw_json('--category', 'transition', '--n', '7', '--seed', '1', '--exclude', 'fx-tr-accent,fx-tr-workhorse', '--energy', 'any')
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
result(r.returncode == 0 and '## Families' in r.stdout and '| [Shared seams](library/shared-seams.md) | 3 |' in r.stdout
       and '### Transitions (7)' in r.stdout and 'Families: Fam transition 4, Shared seams 3.' in r.stdout, '--markdown renders the index: families and categories')
r = pick('--markdown', '--family', 'fam-ui-choreography')
result(r.returncode == 0 and r.stdout.startswith('# Fam ui choreography') and 'Ban-safe variant (the default):** Opaque' in r.stdout
       and '- **Primitive:** `fx/Cards.press`' in r.stdout, '--markdown --family renders one family in full, with ban-safe variants and primitives')
result(pick('--markdown', '--family', 'nope').returncode == 2, 'an unknown --family is exit 2')
r = pick('--list', '--category', 'transition')
result(r.returncode == 0 and len(r.stdout.strip().splitlines()) == 7, '--list --category lists that category only')
r = pick('--list', '--family', 'Shared seams')
result(r.returncode == 0 and len(r.stdout.strip().splitlines()) == 3, '--list --family lists that family only')

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
    shipped = json.load(open(SHIPPED, encoding='utf-8'))
    ents = shipped['techniques']
    nofam = [e['id'] for e in ents if not e.get('family')]
    noprim = [e['id'] for e in ents if not isinstance(e.get('primitive'), list)]
    old = [e['id'] for e in ents if 'evidence' in e]
    result(not nofam and not noprim and not old and len(shipped.get('families', [])) >= 20,
           'every shipped entry has a family, a primitive list and a weight', f'{nofam[:3]} {noprim[:3]} {old[:3]}')
    for fmt in ('launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical', 'update'):
        r, d = draw_json('--format', fmt, '--seed', '1', library=SHIPPED)
        cats = {p['category'] for p in d['picks']}
        fams = [p['family'] for p in d['picks']]
        worst = max(fams.count(f) for f in fams) if fams else 0
        result(r.returncode == 0 and len(d['picks']) >= 4 and len(cats) >= 4 and worst <= 2,
               f'the shipped library fills a {fmt} plan from many families', f'{len(d["picks"])} picks, {len(cats)} categories, {len(set(fams))} families')
    refs = os.path.join(SKILL, 'references')
    md = os.path.join(refs, 'technique-library.md')
    r = pick('--markdown', library=SHIPPED)
    same = os.path.exists(md) and open(md, encoding='utf-8').read() == r.stdout
    result(same, 'references/technique-library.md matches the JSON', '' if same else 'run: python3 scripts/pick.py --write-docs references')
    import importlib.util as _u
    _s = _u.spec_from_file_location('pick_docs', PICK)
    _m = _u.module_from_spec(_s)
    _s.loader.exec_module(_m)
    files = _m.doc_files(ents, shipped)
    bad = [rel for rel, text in files.items() if rel != 'technique-library.md'
           and not (os.path.exists(os.path.join(refs, *rel.split('/'))) and open(os.path.join(refs, *rel.split('/')), encoding='utf-8').read() == text)]
    lib_dir = os.path.join(refs, 'library')
    stale = sorted(f for f in (os.listdir(lib_dir) if os.path.isdir(lib_dir) else []) if f'library/{f}' not in files)
    result(not bad and not stale, 'references/library/<family>.md match the JSON, with no stale file',
           f'differ: {bad[:3]} stale: {stale[:3]}; run: python3 scripts/pick.py --write-docs references' if bad or stale else '')
    r = pick('--markdown', '--family', 'Camera', library=SHIPPED)
    result(r.returncode == 0 and r.stdout == files.get('library/camera.md'), '--markdown --family prints the family file')
else:
    result(False, 'the shipped library exists', SHIPPED)

# 6. The update format ---------------------------------------------------------------------------
UPD_LIB = os.path.join(HERE, 'pick-fixtures', 'update-library.json')
r = pick('--validate', library=UPD_LIB)
result(r.returncode == 0 and '20 techniques in 14 categories' in r.stdout, 'a library whose entries list the update format validates', r.stderr.strip())
upd = json.load(open(UPD_LIB, encoding='utf-8'))['techniques']
never = {e['id'] for e in upd if not set(e['formats']) & {'update', 'launch', 'feature', 'sting', 'any'}}
seen, first, bad = set(), [], []
for s in range(60):
    r, d = draw_json('--format', 'update', '--seed', str(s), library=UPD_LIB)
    got = ids(d)
    seen |= set(got)
    bad += [i for i in got if i in never]
    first.append([p['category'] for p in d['picks']][:3])
result(not bad and seen >= {'up-hook-launch', 'up-demo-feature', 'up-end-sting'},
       'an update film draws update entries and borrows launch, feature and sting entries, never loop-, walkthrough- or vertical-only ones',
       ', '.join(sorted(set(bad))[:4]))
result(all(f == ['opening_hook', 'product_demo', 'logo_and_end_card'] for f in first),
       'an update plan fills the hook, a product moment and the end card first')
r, d = draw_json('--format', 'update', '--seed', '4', library=UPD_LIB)
r2, d2 = draw_json('--format', 'update', '--seconds', '20', '--energy', 'high', '--seed', '4', library=UPD_LIB)
result(len(d['picks']) == 4 and len(d2['picks']) == 8 and d['format'] == 'update',
       'a 14 s calm update draws 4 techniques, a 20 s energetic one 8', f'{len(d["picks"])}, {len(d2["picks"])}')
r, d = draw_json('--format', 'launch', '--seed', '4', library=UPD_LIB)
result(r.returncode == 1 or not set(ids(d)) & {e['id'] for e in upd if e['formats'] == ['update']},
       'a launch film never draws an entry made only for update films')

# 7. Variety -------------------------------------------------------------------------------------
SHARED = {e['id'] for e in fixture if e['family'] == 'Shared seams'}
worst, uncapped = 0, 0
for s in range(40):
    got = ids(draw_json('--category', 'transition', '--n', '5', '--energy', 'any', '--seed', str(s))[1])
    worst = max(worst, len(SHARED & set(got)))
    got = ids(draw_json('--category', 'transition', '--n', '5', '--energy', 'any', '--seed', str(s), '--max-per-family', '0')[1])
    uncapped = max(uncapped, len(SHARED & set(got)))
result(worst == 2 and uncapped == 3, 'at most two entries from one family per draw; --max-per-family 0 lifts the cap', f'worst {worst}, uncapped {uncapped}')
with tempfile.TemporaryDirectory() as tmp:
    keep = os.path.join(tmp, 'plan.json')
    json.dump({'picks': [{'id': 'fx-transition'}, {'id': 'fx-tr-workhorse'}]}, open(keep, 'w', encoding='utf-8'))
    hit = set()
    for s in range(30):
        hit |= set(ids(draw_json('--category', 'transition', '--n', '3', '--energy', 'any', '--seed', str(s), '--keep', keep)[1]))
    result(hit and not hit & SHARED, "--keep: the plan's picks are not drawn again and their families count toward the cap", str(sorted(hit & SHARED)))
    hist = os.path.join(tmp, 'history.json')
    env = dict(os.environ, CINETIC_PICK_HISTORY=hist)
    pick('--format', 'launch', '--seed', '5', '--json', os.path.join(tmp, 'a.json'), env=env)
    first = ids(json.load(open(os.path.join(tmp, 'a.json'), encoding='utf-8')))
    r = pick('--format', 'launch', '--seed', '6', '--json', os.path.join(tmp, 'b.json'), env=env)
    h = json.load(open(hist, encoding='utf-8')) if os.path.exists(hist) else []
    head = r.stdout.splitlines()[0] if r.stdout else ''
    result(len(h) == 2 and h[1]['ids'] == first and f"--recent {','.join(first)}" in head,
           'a plan written with --json is recorded; the next plan down-weights it and prints --recent', head[:120])
    r2 = pick(*head[len('<!-- pick.py '):-len(' -->')].split(), '--no-history', env=env)
    result(r2.stdout.split('\n', 1)[1:] == r.stdout.split('\n', 1)[1:], 'the printed header reproduces a plan drawn with a history')
    pick('--category', 'camera', '--json', os.path.join(tmp, 'c.json'), env=env)
    result(len(json.load(open(hist, encoding='utf-8'))) == 2, 'a single draw (a reroll) is not recorded as a film')
work = next(e for e in fixture if e['id'] == 'fx-tr-workhorse')
result(abs(mod.weight(work, None, {'fx-tr-workhorse'}) - mod.RECENT_FACTOR * mod.weight(work, None)) < 1e-9,
       'an entry a recent film drew keeps a fifth of its weight')
slam = next(e for e in fixture if e['id'] == 'fx-type-slam')
sig_a = next(e for e in fixture if e['id'] == 'fx-tr-sig-a')
result(mod.weight(slam, 'calm') == 0 and mod.weight(sig_a, 'calm') == 0.5 * mod.weight(sig_a, 'any'),
       'calm weights: a high-energy copy entry 0, a high-energy picture entry half')
with tempfile.TemporaryDirectory() as tmp:
    lib = os.path.join(tmp, 'alias.json')
    data = json.load(open(FIXTURE, encoding='utf-8'))
    data['techniques'] = [dict(e, aliases=['dv-old-camera']) if e['id'] == 'fx-camera' else e for e in data['techniques']]
    json.dump(data, open(lib, 'w', encoding='utf-8'))
    r = pick('--show', 'dv-old-camera', library=lib)
    _, d = draw_json('--category', 'camera', '--n', '2', '--exclude', 'dv-old-camera', '--energy', 'any', '--seed', '1', library=lib)
    result(r.returncode == 0 and '`fx-camera`' in r.stdout and 'fx-camera' not in ids(d), 'a merged id still names its entry (--show, --exclude)')

# 8. Hard bans, what exists, the dealt direction -------------------------------------------------
def entry(id_, category, family, **kw):
    base = dict(id=id_, name=id_.replace('-', ' '), category=category, summary=f'Fixture entry {id_}.', recipe=f'Build {id_}.',
                timing='12 f.', use_when='Tests.', avoid_when='Never.', formats=['any'], energy='any', role='accent',
                ban_safe=True, evidence=4, family=family, primitive=[])
    base.update(kw)
    return base


ban_lib = json.load(open(FIXTURE, encoding='utf-8'))
ban_lib['families'] += [{'name': 'Cursor', 'about': 'Fixture.'}]
ban_lib['techniques'] += [
    entry('fx-type-overshoot', 'typography_motion', 'Fam typography motion', recipe='Per word a damped spring with a landing overshoot of 15 %.'),
    entry('fx-type-calm-land', 'typography_motion', 'Fam typography motion', recipe='Words land on E.softOut with no overshoot.'),
    entry('fx-cam-overshoot', 'camera', 'Fam camera', recipe='The camera lands with a small overshoot.'),
    entry('fx-type-script', 'typography_motion', 'Fam typography motion', recipe='The name, then a pen-written script suffix.'),
    entry('fx-type-serif-cycle', 'typography_motion', 'Fam typography motion', summary='The title swaps through a serif and a mono.'),
    entry('fx-type-sans', 'typography_motion', 'Fam typography motion', recipe='One sans-serif face, never italic.'),
    entry('fx-cursor-click', 'micro_interaction', 'Cursor', summary='A cursor glides to the button and presses it.'),
    entry('fx-ui-typing', 'product_demo', 'Fam product demo', summary='The prompt fills by typing, then the answer streams.'),
    entry('fx-ui-panel', 'ui_choreography', 'Fam ui choreography', summary='Panels slide in on a stagger.'),
]
with tempfile.TemporaryDirectory() as tmp:
    blib = os.path.join(tmp, 'bans.json')
    json.dump(ban_lib, open(blib, 'w', encoding='utf-8'))
    by = {e['id']: e for e in ban_lib['techniques']}
    result(all(mod.breaks_ban(by[i]) for i in ('fx-type-overshoot', 'fx-type-script', 'fx-type-serif-cycle'))
           and not any(mod.breaks_ban(by[i]) for i in ('fx-type-calm-land', 'fx-cam-overshoot', 'fx-type-sans')),
           'hard bans: overshoot on copy, a script suffix and a serif face break them; "no overshoot", a camera overshoot and "sans-serif, never italic" do not',
           str({i: mod.breaks_ban(by[i]) for i in ('fx-type-overshoot', 'fx-type-script', 'fx-type-serif-cycle', 'fx-type-sans')}))
    result(not mod.breaks_ban(by['fx-type-serif-cycle'], {'serif'}), 'a brand that supplies serif lifts the serif ban')
    seen = set()
    for s_ in range(60):
        seen |= set(ids(draw_json('--category', 'typography_motion', '--n', '4', '--energy', 'any', '--seed', str(s_), '--max-per-family', '0', library=blib)[1]))
    result(not seen & {'fx-type-overshoot', 'fx-type-script', 'fx-type-serif-cycle'} and {'fx-type-calm-land', 'fx-type-sans'} <= seen,
           'a draw never deals an entry that breaks a hard ban', str(sorted(seen)))
    r = pick('--category', 'typography_motion', '--n', '2', '--seed', '1', '--energy', 'any', library=blib)
    result('never drawn, the recipe breaks a hard ban' in r.stdout and 'fx-type-overshoot (overshoot on copy)' in r.stdout,
           'the plan names the entries it left out for a hard ban')
    # --have
    def drawn(*extra, n=60):
        got = set()
        for s_ in range(n):
            got |= set(ids(draw_json('--category', extra[0], '--n', '3', '--energy', 'any', '--seed', str(s_), '--max-per-family', '0', *extra[1:], library=blib)[1]))
        return got
    mi_free, mi_ui, mi_in = drawn('micro_interaction'), drawn('micro_interaction', '--have', 'ui'), drawn('micro_interaction', '--have', 'ui,input')
    result('fx-cursor-click' in mi_free and 'fx-cursor-click' not in mi_ui and 'fx-cursor-click' in mi_in,
           '--have: a cursor device needs input (drawn without --have, not with ui alone, again with ui,input)', f'{sorted(mi_ui)}')
    pd_ui, pd_in = drawn('product_demo', '--have', 'ui'), drawn('product_demo', '--have', 'input')
    result('fx-ui-typing' not in pd_ui and 'fx-ui-typing' in pd_in and 'fx-product-demo' in pd_ui, '--have: a typing product moment needs input (input implies ui)')
    r = pick('--category', 'ui_choreography', '--n', '2', '--seed', '2', '--have', 'none', library=blib)
    result(r.returncode == 1 and 'no ui_choreography technique is left' in r.stderr, '--have none: no UI device is drawn for a product with no interface', r.stderr.strip()[:100])
    result(pick('--have', 'ui,printer', library=blib).returncode == 2, '--have: an unknown word is a usage error')
    # --direction
    sheet = {'version': 2, 'tool': 'deck.py', 'direction': {'id': 'fixture-dir'}, 'input': {'have': ['ui'], 'format': 'launch'},
             'pick': {'format': 'sting', 'energy': 'medium', 'seconds': 6, 'lean': ['fx-tr-accent'], 'signature_ids': ['fx-tr-sig-a'],
                      'avoid': ['fx-tr-workhorse']}}
    dpath = os.path.join(tmp, 'direction.json')
    json.dump(sheet, open(dpath, 'w', encoding='utf-8'))
    lean_n = base_n = 0
    sigs, avoided, ui_in = set(), 0, 0
    for s_ in range(80):
        r, d = draw_json('--category', 'transition', '--n', '2', '--seed', str(s_), '--direction', dpath, '--energy', 'any', library=blib)
        got = ids(d)
        lean_n += 'fx-tr-accent' in got
        sigs |= {i for i in got if by[i]['role'] == 'signature'}
        avoided += 'fx-tr-workhorse' in got
        base_n += 'fx-tr-accent' in ids(draw_json('--category', 'transition', '--n', '2', '--seed', str(s_), '--direction', 'none', '--energy', 'any', library=blib)[1])
    result(avoided == 0, '--direction: a technique that fights the direction is never drawn')
    result(lean_n > 1.4 * base_n, '--direction: a technique the direction leans on comes up far more often', f'{lean_n} vs {base_n} of 80')
    result(sigs <= {'fx-tr-sig-a'}, '--direction: the only signature drawn is the direction\'s own', str(sorted(sigs)))
    worst = max(sum(by[i]['role'] == 'signature' for i in ids(draw_json('--seed', str(s_), '--direction', dpath, '--energy', 'high', '--seconds', '45', '--format', 'launch', library=blib)[1])) for s_ in range(40))
    result(worst <= 1, '--direction: a long plan still holds one signature move', f'worst {worst}')
    r, d = draw_json('--seed', '3', '--direction', dpath, library=blib)
    head = r.stdout.splitlines()[0] if r.stdout else ''
    result(d.get('format') == 'sting' and '--energy medium' in head and '--have ui' in head and f'--direction {dpath}' in head
           and 'fx-cursor-click' not in ids(d), '--direction: format, energy, length and --have come from the sheet', head[:160])
    cwd = os.getcwd()
    os.makedirs(os.path.join(tmp, 'film', 'out'))
    json.dump(sheet, open(os.path.join(tmp, 'film', 'out', 'direction.json'), 'w', encoding='utf-8'))
    os.chdir(os.path.join(tmp, 'film'))
    try:
        r_auto = pick('--seed', '3', library=blib)
        r_none = pick('--seed', '3', '--direction', 'none', library=blib)
    finally:
        os.chdir(cwd)
    result('--direction out' in r_auto.stdout.splitlines()[0] and 'the dealt direction fixture-dir' in r_auto.stdout and '--direction none' in r_none.stdout.splitlines()[0],
           'out/direction.json is read by default; --direction none ignores it')
    result(pick('--direction', os.path.join(tmp, 'missing.json'), library=blib).returncode == 2, '--direction: a missing sheet is an error, not a silent plan')
    # --family by the start of its name
    r1 = pick('--family', 'Shared', '--n', '1', '--seed', '1', '--energy', 'any', library=blib)
    r2 = pick('--family', 'Fam', '--n', '1', '--seed', '1', library=blib)
    result(r1.returncode == 0 and 'Shared seams' in r1.stdout and r2.returncode == 2 and 'starts' in r2.stderr, '--family takes the start of a name, and says when it is not unique')
# --family --n 3: the family cap (two a film) does not cut a draw from one named family short
r3, d3 = draw_json('--family', 'Camera', '--n', '3', '--seed', '1', '--energy', 'any', '--direction', 'none', '--no-history', library=SHIPPED)
result(r3.returncode == 0 and len(ids(d3)) == 3, '--family Camera --n 3 draws three (the family cap of a plan does not apply)', str(ids(d3)))
# the shipped library: no plan for any format deals an entry that breaks a hard ban
shipped_bad = set()
for fmt in mod.FORMATS:
    for s_ in range(12):
        shipped_bad |= {i for i in ids(draw_json('--format', fmt, '--seed', str(s_), '--energy', 'any', '--direction', 'none', library=SHIPPED)[1]) if i in {
            'dv-baseline-converge-overshoot', 'ty-letter-arc-swing', 'dv-wordmark-soft-reveal', 'dv-signature-write-on', 'dv-typeface-cycle'}}
result(not shipped_bad, 'the shipped library: plans for every format never deal the type-overshoot or script-face entries', str(sorted(shipped_bad)))

# 9. The script's lines ---------------------------------------------------------------------------
TYPE_FAMS = {'Type arrivals', 'Lines, layout and swaps', 'Type exits'}
result([mod.line_count('launch', s_) for s_ in (15, 20, 30, 45)] == [5, 6, 8, 8] and mod.line_count('update', 14) == 4
       and mod.line_count('sting', 6) == 1 and mod.line_count('loop', 10) == 2,
       'a script holds 5-8 sentences in a launch film, 4 in a 14 s update, 1 in a sting, 2 in a loop')
result([mod.accent_count(s_, n_) for s_, n_ in ((15, 5), (30, 8), (45, 8), (90, 12), (25, 2))] == [1, 1, 2, 2, 0],
       'accents beside the voice: one per 30 s of film (rounded up), at most two, none for a script of 1-2 lines')
bad_l, mixed, short = [], [], []
for s_ in range(12):
    r, d = draw_json('--format', 'launch', '--seconds', '30', '--seed', str(s_), '--direction', 'none', library=SHIPPED)
    lines, exits, pic = d.get('lines', []), d.get('exits', []), d['picks']
    lids = [x['id'] for x in lines]
    if d.get('line_count') != 8 or len(lines) != 2 or len(set(lids)) != 2 or [x['line'] for x in lines] != ['voice', 'accent'] or (d.get('voice') or {}).get('id') != lids[0]:
        short.append(f'{s_}: {len(lines)} lines')
    bad_l += [x['id'] for x in lines[:1] if x['family'] != 'Type arrivals' or x['role'] == 'signature']
    bad_l += [x['id'] for x in lines[1:] if x['family'] not in {'Type arrivals', 'Lines, layout and swaps'}]
    bad_l += [x['id'] for x in exits if x['family'] != 'Type exits']
    if len(exits) != 1 or set(lids) & {x['id'] for x in pic} or set(lids) & {x['id'] for x in exits}:
        short.append(f'{s_}: {len(exits)} exits, or a line also drawn elsewhere')
    mixed += [x['id'] for x in pic if x['family'] in TYPE_FAMS or x['category'] == 'typography_motion']
result(not short and not bad_l and '## Text animations: one voice' in r.stdout and 'Voice, every line' in r.stdout,
       'a 30 s launch plan reads its 8 sentences in one voice from the type arrivals, one accent for the hero line and one exit',
       '; '.join(short[:3]) + ' ' + ', '.join(bad_l[:3]))
result(not mixed, 'with a line track the picture plan draws no type device of its own', ', '.join(sorted(set(mixed))[:4]))
r, d = draw_json('--format', 'launch', '--seconds', '30', '--seed', '3', '--lines', '7', '--direction', 'none', library=SHIPPED)
head = r.stdout.splitlines()[0] if r.stdout else ''
result(d.get('line_count') == 7 and len(d.get('lines', [])) == 2 and '--lines 7' in head and '## Text animations: one voice (7 sentences)' in r.stdout,
       '--lines 7: seven sentences in one voice (and an accent), and the header reproduces it', head[:120])
off = [x for s_ in range(12) for x in draw_json('--format', 'launch', '--seconds', '30', '--seed', str(s_), '--lines', '0', '--direction', 'none', library=SHIPPED)[1]['picks']]
r0, d0 = draw_json('--format', 'launch', '--seed', '1', '--lines', '0', '--direction', 'none', library=SHIPPED)
result(not d0.get('lines') and 'Text animations' not in r0.stdout and any(x['category'] == 'typography_motion' for x in off),
       '--lines 0 turns the line track off; the picture plan draws type devices again')
result(pick('--format', 'launch', '--lines', '17').returncode == 2, '--lines outside 0-16 is a usage error')
shipped_by = {e['id']: e for e in json.load(open(SHIPPED, encoding='utf-8'))['techniques']}
typ = next(e for e in shipped_by.values() if e['family'] == 'Type arrivals' and e['category'] == 'typography_motion')
img = next(e for e in shipped_by.values() if e['family'] == 'Photos and footage')
plain = next(e for e in shipped_by.values() if e['family'] == 'Camera' and not mod.is_imagery(e))
result(mod.kind_factor(typ) == 2.0 and mod.kind_factor(img) == 0.2 and mod.kind_factor(img, True) == 1.0 and mod.kind_factor(plain) == 1.0
       and abs(mod.weight(img, 'any', (), (), True) - 5 * mod.weight(img, 'any')) < 1e-9,
       'type devices weigh x2; imagery devices x0.2, at full weight only when the film has photos or footage')
result(mod.is_imagery(shipped_by['dv-mark-in-photo-window']) and mod.is_imagery(shipped_by['dv-object-vocabulary'])
       and not mod.is_imagery(shipped_by['dv-painted-light-plates']), 'imagery devices: photos and footage, cut-outs, a mark in a photo window; not a baked light plate')


def img_count(*extra):
    n = 0
    for s_ in range(30):
        _, d = draw_json('--format', 'launch', '--seconds', '30', '--seed', str(s_), '--direction', 'none', *extra, library=SHIPPED)
        n += sum(1 for x in d['picks'] if mod.is_imagery(shipped_by[x['id']]))
    return n


n_none, n_ui, n_photos = img_count(), img_count('--have', 'ui'), img_count('--have', 'ui,photos')
result(n_photos > 2 * max(1, n_ui) and n_none <= n_photos, 'imagery devices come up rarely unless --have photos (or footage)', f'no have {n_none}, ui {n_ui}, ui+photos {n_photos} of 30 plans')
r = pick('--format', 'launch', '--have', 'photos', '--seed', '2', '--direction', 'none', library=SHIPPED)
result(r.returncode == 0 and 'imagery devices at full weight' in r.stdout, '--have photos is a word, and the plan says imagery is at full weight')
with tempfile.TemporaryDirectory() as tmp:
    hist = os.path.join(tmp, 'history.json')
    env = dict(os.environ, CINETIC_PICK_HISTORY=hist)
    pick('--format', 'launch', '--seed', '5', '--direction', 'none', '--json', os.path.join(tmp, 'a.json'), library=SHIPPED, env=env)
    a_ = json.load(open(os.path.join(tmp, 'a.json'), encoding='utf-8'))
    r = pick('--format', 'launch', '--seed', '6', '--direction', 'none', library=SHIPPED, env=env)
    h = json.load(open(hist, encoding='utf-8'))
    lids = [x['id'] for x in a_['lines']]
    result(h[0].get('lines') and set(lids) <= set(h[0]['lines']) and all(i in r.stdout.splitlines()[0] for i in lids),
           'the history keeps the line track, and the next plan down-weights it through --recent')
presets = mod.type_presets(mod.starter_src())
if os.path.isfile(os.path.join(SKILL, 'assets', 'remotion-starter', 'src', 'fx', 'TypePresets.tsx')):
    r = pick('--format', 'launch', '--seed', '2', '--direction', 'none', library=SHIPPED)
    result(len(presets) >= 8 and 'src/fx/TypePresets.tsx' in r.stdout and all(p_ in r.stdout for p_ in presets[:4]),
           'the plan names the presets of src/fx/TypePresets.tsx', f'{len(presets)} presets')
    hero = mod.type_presets(mod.starter_src(), 'HERO_PRESETS')
    soft = mod.type_presets(mod.starter_src(), 'SOFT_PRESETS')
    result(hero and set(hero) <= set(presets) and not set(hero) & set(soft) and 'A hero line' in r.stdout and all(p_ in r.stdout for p_ in soft),
           'the plan names the confident presets a hero line takes, and the soft ones it never does', f'{len(hero)} hero, {len(soft)} soft')

print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
