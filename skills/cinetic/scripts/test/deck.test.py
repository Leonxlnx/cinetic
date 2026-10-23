#!/usr/bin/env python3
"""deck.test.py: regression tests for deck.py, the film-direction deal.

  1. The shipped deck validates: 18-24 directions, every library id and primitive name real, the
     catalogue's built primitives exported by the starter; four kinds of space; at least half the deck
     rich; light, mid, dark and colour grounds; many story shapes, lockups and kinds of light; every
     signature concrete (3+ quantities, a node budget) and its own move; lockups and light events
     built from primitives that exist; a direction that waits for planned primitives is not dealt.
  2. Broken decks are refused with exit 2 and a reason (27 kinds of breakage).
  3. Deals are deterministic: the same arguments give the same output and the same files, with an
     explicit seed or with the seed derived from the brief.
  4. Options are distinct (6 formats x 2 paces x 4 asset sets x 60 seeds): different camera motion,
     signature, story shape and lockup; three kinds of space and two kinds of light when the pool has
     them; two ground tones; one rich direction when one fits, at most one quiet one. When a deal is not
     perfect, no perfect set existed in its pool.
  5. Fit filters hold: --format, --pace, --have, --seconds, brief subjects and planned primitives never
     deal a direction that cannot make the film.
  6. The sheet: --direction writes out/direction.json and out/DIRECTION.md with the idea sentence, the
     world and its light build, the story shape, the signature, the lockup, a timed skeleton, the build
     methods and the pick.py line; --keep leaves the brand's slots alone.
  7. Redraws need a reason, are recorded, change the slot, and stop after two per slot.
  8. The history down-weights recent directions and can be switched off.
  9. House wording: the deck, deck.py and a dealt sheet carry no provenance phrasing.

Usage (from the skill root):  python3 scripts/test/deck.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import copy
import importlib.util
import itertools
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
DECK_PY = os.path.join(SKILL, 'scripts', 'deck.py')
SHIPPED = os.path.join(SKILL, 'assets', 'directions', 'directions.json')
VERBOSE = '--verbose' in sys.argv
failed = 0

spec = importlib.util.spec_from_file_location('deck', DECK_PY)
deck = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deck)
DATA = json.load(open(SHIPPED, encoding='utf-8'))
DIRS = DATA['directions']
BY_ID = {d['id']: d for d in DIRS}
CAT = DATA['primitives']
RECIPES = DATA['recipes']
READY = deck.ready_names(CAT, deck.starter_src())
TMP = tempfile.mkdtemp(prefix='deck-test-')
ENV = dict(os.environ, CINETIC_DECK_HISTORY=os.path.join(TMP, 'history.json'), PYTHONUTF8='1')


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


def run(*args, env=None, cwd=None):
    r = subprocess.run([sys.executable, DECK_PY, *args], capture_output=True, text=True, encoding='utf-8',
                       env=env or ENV, cwd=cwd or TMP)
    if VERBOSE:
        print(f'  $ deck.py {" ".join(args)} -> {r.returncode}\n' + r.stdout[-400:] + r.stderr[-400:])
    return r


def options(*args, n=3):
    r = run(*args, '--options', str(n), '--no-history')
    ids = re.findall(r'^## \d+\. `([a-z0-9-]+)`', r.stdout, re.M)
    return r, [BY_ID[i] for i in ids if i in BY_ID]


def inp_of(brief='x', fmt=None, pace='calm', have=(), seconds=None):
    return {'brief': brief, 'format': fmt, 'pace': pace, 'have': sorted(have), 'seconds': seconds, 'avoid': []}


def deal(brief='x', fmt=None, pace='calm', have=(), seconds=None, seed=1, n=3, recent=(), keep=()):
    """In process, the options the CLI would print (parity is checked once below)."""
    return deck.options_for(DATA, inp_of(brief, fmt, pace, have, seconds), seed, n, recent, (), keep, READY)[0]


def broken(mutate):
    """Validate a mutated copy of the shipped deck; returns (exit code, stderr)."""
    data = copy.deepcopy(DATA)
    mutate(data)
    path = os.path.join(TMP, 'broken.json')
    json.dump(data, open(path, 'w', encoding='utf-8'))
    r = run('--deck', path, '--validate')
    return r.returncode, r.stderr


def dealable(d):
    return all(p in READY for p in d.get('requires', []))


# 1. the shipped deck --------------------------------------------------------------------------------
r = run('--validate', '--strict')
result(r.returncode == 0, 'the shipped deck validates (--strict: library, starter source, look.ts)', (r.stdout + r.stderr).strip()[-300:])
n = len(DIRS)
result(18 <= n <= 24, f'the deck holds 18-24 directions ({n})')
lib = deck.load_library(deck.DEFAULT_LIBRARY)
ids = {t for d in DIRS for k in ('techniques', 'avoid_techniques') for t in d[k]}
ids |= {t for d in DIRS for t in d['signature']['techniques'] + d['signature_alt']['techniques'] + d['lockup'].get('techniques', [])}
result(lib is not None and ids <= set(lib), 'every technique id is in assets/library/techniques.json',
       ', '.join(sorted(ids - set(lib or {}))[:5]))
names = {p for d in DIRS for p in d['primitives'] + d['transitions'] + d['signature']['primitives']
         + d['signature_alt']['primitives'] + d['lockup']['primitives']}
result(names <= set(CAT), 'every primitive a direction names is in the catalogue', ', '.join(sorted(names - set(CAT))))
fams = [d['signature']['family'] for d in DIRS]
result(len(set(fams)) == len(fams), 'every direction has its own signature family')
looks = [(d['world']['space'], d['camera']['motion'], d['cuts']['kind']) for d in DIRS]
result(len(set(looks)) == len(looks), 'no two directions share space, camera motion and cut kind')
spaces = {s: sum(1 for d in DIRS if d['world']['space'] == s) for s in deck.SPACES}
result(min(spaces.values()) >= 3 and spaces['relief'] >= 3, f'four kinds of space, at least 3 directions each, lit relief included ({spaces})')
rich = sum(1 for d in DIRS if d['intensity'] >= 4)
result(min(d['intensity'] for d in DIRS) <= 2 and max(d['intensity'] for d in DIRS) == 5 and rich >= n // 2,
       f'the deck spans quiet-but-rich to wild and leans rich ({rich} of {n} at intensity 4-5)')
pals = [p for d in DIRS for p in d['palettes']]
tone = {t: sum(1 for p in pals if RECIPES[p['recipe']]['tone'] == t) / len(pals) for t in deck.TONES}
result(tone['light'] <= 0.45 and tone['mid'] + tone['field'] >= 0.3 and all(tone[t] > 0 for t in deck.TONES),
       'palettes span light, mid, dark and colour grounds, light at most 45 %', ', '.join(f'{t} {v:.0%}' for t, v in tone.items()))
shapes = {}
for d in DIRS:
    shapes.setdefault(d['story']['shape'], []).append(d['id'])
result(len(shapes) >= 10 and max(len(v) for v in shapes.values()) <= 3, f'{len(shapes)} story shapes, none used more than 3 times')
lks = {}
for d in DIRS:
    lks.setdefault(d['lockup']['kind'], []).append(d['id'])
result(len(lks) >= 6 and max(len(v) for v in lks.values()) <= 5,
       f'{len(lks)} lockup kinds, none more than 5 (device-becomes-mark: {len(lks.get("device-mark", []))})')
lights = {d['world']['light_kind'] for d in DIRS}
result(len(lights) >= 5, f'{len(lights)} kinds of light')
vague = [d['id'] for d in DIRS if len(deck.QUANTITY.findall(d['signature']['shot'])) < 3 or not 1 <= d['signature']['elements'] <= deck.MAX_ELEMENTS]
result(not vague, 'every signature shot names 3+ quantities and a node budget of at most 1500', ', '.join(vague))
shared = [f'{a["id"]}/{b["id"]}' for a, b in itertools.combinations(DIRS, 2)
          if (set(a['signature']['techniques']) | set(a['signature_alt']['techniques']))
          & (set(b['signature']['techniques']) | set(b['signature_alt']['techniques']))]
result(not shared, 'no two directions\' signature shots lean on the same library entry', ', '.join(shared[:4]))
planned = {k for k, v in CAT.items() if v['status'] == 'planned'}
leans = [d['id'] for d in DIRS if set(d['lockup']['primitives']) & planned
         or any(re.search(r'\b' + p + r'\b', d['world']['light_build']) for p in planned if re.search(r'[A-Z]', p))]
result(not leans, 'lockups and light events never wait for a planned primitive', ', '.join(leans))
waiting = [d['id'] for d in DIRS if not dealable(d)]
result(all(set(BY_ID[i]['requires']) & planned for i in waiting) and all(
    not (set(d['signature']['primitives']) & planned) or set(d['signature']['primitives']) & planned <= set(d['requires']) for d in DIRS),
    f'a signature that needs a planned primitive lists it in requires ({", ".join(waiting) or "none waiting"})')

# 2. broken decks --------------------------------------------------------------------------------------
cases = [
    ('a missing field', lambda x: x['directions'][0].pop('skeleton'), 'missing skeleton'),
    ('an unknown technique id', lambda x: x['directions'][1]['techniques'].append('zz-not-a-technique'), 'not in the library'),
    ('an unknown primitive', lambda x: x['directions'][2]['primitives'].append('NotAPrimitive'), 'not in the primitives catalogue'),
    ('a banned colour in the world', lambda x: x['directions'][3]['world'].__setitem__('light', 'a soft ' + 'amb' + 'er pool'), 'house ban'),
    ('a banned look in the signature', lambda x: x['directions'][4]['signature'].__setitem__('build', 'a ' + 'gl' + 'ow behind the plate'), 'house ban'),
    ('a shared signature family', lambda x: x['directions'][5]['signature'].__setitem__('family', x['directions'][6]['signature']['family']), 'signature family'),
    ('a copy slot of 6 words', lambda x: x['directions'][7]['skeleton'][0].__setitem__('copy', {'words': [2, 6], 'what': 'too much'}), '1-4 words'),
    ('a ban-unsafe technique', lambda x: x['directions'][8]['techniques'].append('tr-band-wipe'), 'banned look'),
    ('a provenance phrase', lambda x: x['directions'][9].__setitem__('idea', 'As ' + 'learned' + ' from the best, a fold.'), 'house craft'),
    ('a technique-style id', lambda x: x['directions'][10]['signature'].__setitem__('shot', 'As in ' + 'T' + '17, a dive.'), 'house craft'),
    ('skeleton shares that do not add up', lambda x: x['directions'][11]['skeleton'][0].__setitem__('share', 0.5), 'add up'),
    ('a palette outside the accent families', lambda x: x['directions'][12]['palettes'][0].__setitem__('accent', ['pink']), 'accent families'),
    ('a primitive marked built that the starter lacks', lambda x: x['primitives'].__setitem__('Window', {'file': 'fx/Window.tsx', 'status': 'built'}), 'does not export'),
    ('too few directions', lambda x: x.__setitem__('directions', x['directions'][:10]), '18-24'),
    ('a lockup that waits for a planned primitive', lambda x: x['directions'][13]['lockup']['primitives'].append('Wordmark'), 'a lockup is built from primitives that exist'),
    ('a signature on a planned primitive it does not declare', lambda x: x['directions'][14]['signature']['primitives'].append('Cards'), 'list it in requires'),
    ('a vague signature shot', lambda x: x['directions'][15]['signature'].__setitem__('shot', 'Something beautiful happens to the product.'), 'quantities'),
    ('an unknown story shape', lambda x: x['directions'][16]['story'].__setitem__('shape', 'montage-of-everything'), 'story.shape'),
    ('an unknown lockup kind', lambda x: x['directions'][17]['lockup'].__setitem__('kind', 'end-card'), 'lockup.kind'),
    ('a light event on a planned primitive', lambda x: x['directions'][18]['world'].__setitem__('light_build', 'LightField plates moved by opacity'), 'is planned'),
    ('an unknown colour recipe', lambda x: x['directions'][19]['palettes'][0].__setitem__('recipe', 'sunsetPaper'), 'recipe must be one of'),
    ('a signature over the node budget', lambda x: x['directions'][20]['signature'].__setitem__('elements', 5000), 'animated nodes'),
    ('two signatures on one library entry', lambda x: x['directions'][21]['signature_alt'].__setitem__(
        'techniques', list(x['directions'][0]['signature']['techniques'][:1])), 'same library'),
    ('two skeletons timed alike', lambda x: [b.__setitem__('share', a['share']) for a, b in zip(
        x['directions'][1]['skeleton'], x['directions'][2]['skeleton'])] if len(x['directions'][1]['skeleton']) == len(x['directions'][2]['skeleton'])
        else None, 'timed alike'),
    ('a deck of light grounds only', lambda x: [p.__setitem__('recipe', 'tintedPaper') for d in x['directions'] for p in d['palettes']], 'light grounds'),
    ('a beat that uses the alternative signature', lambda x: x['directions'][22]['skeleton'][2].__setitem__(
        'picture', x['directions'][22]['signature_alt']['name'] + ' across the floor.'), 'uses the alternative signature'),
    ('a beat that repeats the signature', lambda x: x['directions'][23]['skeleton'][1].__setitem__(
        'picture', x['directions'][23]['signature']['name'] + ', once more.'), 'repeats the signature shot'),
]
for name, mutate, expect in cases:
    code, err = broken(mutate)
    result(code == 2 and expect in err, f'validate refuses {name}', f'exit {code}; {err.strip().splitlines()[-1][:160] if err.strip() else ""}')

# 3. determinism ---------------------------------------------------------------------------------------
args = ['--brief', 'a ledger app that splits a bill by item', '--format', 'launch', '--pace', 'calm']
a1, b1 = run(*args, '--options', '3', '--seed', '7', '--no-history'), run(*args, '--options', '3', '--seed', '7', '--no-history')
result(a1.returncode == 0 and a1.stdout == b1.stdout, 'the same seed deals the same options')
a2, b2 = run(*args, '--options', '3', '--no-history'), run(*args, '--options', '3', '--no-history')
result(a2.stdout == b2.stdout and 'from the brief' in a2.stdout, 'without --seed the seed comes from the brief, so a rerun deals the same')
sets = {tuple(d['id'] for d in deal('a ledger app that splits a bill by item', 'launch', 'calm', seed=s)) for s in range(40)}
result(len(sets) >= 15, f'different seeds deal different options ({len(sets)} distinct sets in 40 seeds)')
par = all([o['id'] for o in options(*args, '--seed', str(s))[1]] == [o['id'] for o in deal('a ledger app that splits a bill by item', 'launch', 'calm', seed=s)]
          for s in range(5))
result(par, 'the in-process deal used below is exactly what the CLI prints')
outs = []
for i in (1, 2):
    od = os.path.join(TMP, f'det{i}')
    r = run(*args, '--seed', '11', '--direction', 'fold', '--out', od, '--no-history')
    outs.append((r.stdout, open(os.path.join(od, 'direction.json'), encoding='utf-8').read() if r.returncode == 0 else ''))
result(outs[0] == outs[1] and outs[0][1], 'the same sheet twice gives byte-identical stdout and direction.json')

# 4. distinct options ----------------------------------------------------------------------------------
ASSETS = [(), ('ui',), ('footage', 'ui'), ('audio', 'name', 'number', 'ui')]
bad, imperfect, total, dealt = [], 0, 0, set()
tones_seen, lights_seen = set(), set()
for fmt in deck.FORMATS:
    for pace in deck.PACES:
        for have in ASSETS:
            inp = inp_of('test', fmt, pace, have)
            for s in range(60):
                opts, pool, _ = deck.options_for(DATA, inp, s, 3, (), (), (), READY)
                total += 1
                dealt |= {o['id'] for o in opts}
                tag = f'{fmt}/{pace}/{",".join(have) or "-"}/{s}'
                tcache = {d['id']: deck.palette_tone(d, s, RECIPES) for d in pool}
                tf = lambda d: tcache[d['id']]  # noqa: E731
                tones_seen |= {tf(o) for o in opts}
                lights_seen |= {o['world']['light_kind'] for o in opts}
                if len(opts) != min(3, len(pool)):
                    bad.append(f'{tag}: {len(opts)} options')
                    continue
                if any(not deck.fits(o, fmt, pace, have, None, 'test', READY)[0] for o in opts):
                    bad.append(f'{tag}: an option that does not fit')
                issues = []  # checked here independently of option_problems, each asking only what the pool holds
                kinds = lambda key, src: len({key(d) for d in src})  # noqa: E731
                if len({o['camera']['motion'] for o in opts}) < 3 or len({o['signature']['family'] for o in opts}) < 3:
                    issues.append('shared camera motion or signature')
                for what, key, want in (('story shape', lambda d: d['story']['shape'], 3), ('lockup', lambda d: d['lockup']['kind'], 3),
                                        ('space', lambda d: d['world']['space'], 3), ('light', lambda d: d['world']['light_kind'], 2),
                                        ('ground tone', tf, 2)):
                    if kinds(key, opts) < min(want, kinds(key, pool)):
                        issues.append(f'too few kinds of {what}')
                if any(d['intensity'] >= 4 for d in pool) and not any(o['intensity'] >= 4 for o in opts):
                    issues.append('no rich direction')
                if sum(1 for o in opts if o['intensity'] <= 2) > 1:
                    issues.append('two quiet directions')
                probs = deck.option_problems(opts, pool, 3, tf)
                if issues or probs:
                    imperfect += 1
                    if any(not deck.option_problems(list(c), pool, 3, tf) for c in itertools.combinations(pool, 3)):
                        bad.append(f'{tag}: dealt {issues or probs} although a perfect set existed')
result(not bad, f'every deal of 3 ({total} deals): distinct motion, signature, story and lockup; 3 spaces; 2 lights; 2 ground '
                f'tones; a rich one; at most one quiet ({imperfect} imperfect, each because its pool held no perfect set)', '; '.join(bad[:4]))
missing = sorted(d['id'] for d in DIRS if dealable(d) and d['id'] not in dealt and not d['fit'].get('keywords_required'))
result(not missing and tones_seen >= set(deck.TONES) and lights_seen >= set(deck.LIGHT_KINDS),
       f'every dealable direction, ground tone and kind of light turns up across the sweep', ', '.join(missing))
r, opts5 = options('--brief', 'test', '--format', 'launch', '--seed', '3', n=5)
result(len(opts5) == 5 and len({o['id'] for o in opts5}) == 5, '--options 5 deals five different directions')
r = run('--brief', 'x', '--options', '9')
result(r.returncode == 2, '--options outside 2-5 is refused')

# 5. fit filters ---------------------------------------------------------------------------------------
viol = []
for s in range(100):
    for fmt in deck.FORMATS:
        none = deal('x', fmt, seed=s)
        viol += [f'{o["id"]} without its asset' for o in none if deck.needs_of(o)]
        viol += [f'{o["id"]} for {fmt}' for o in none if fmt not in o['fit']['formats']]
        viol += [f'{o["id"]} waiting for planned primitives' for o in none if not dealable(o)]
        viol += [f'{o["id"]} without its subject' for o in none if o['fit'].get('keywords_required')]
    crisp = deal('x', pace='crisp', seed=s)
    viol += [f'{o["id"]} at crisp' for o in crisp if 'crisp' not in o['fit']['paces']]
    short = deal('x', seconds=7, seed=s)
    viol += [f'{o["id"]} at 7 s' for o in short if not o['fit']['seconds'][0] <= 7 <= o['fit']['seconds'][1]]
r, cli = options('--brief', 'x', '--format', 'walkthrough', '--seed', '2')
viol += [f'{o["id"]} for walkthrough (CLI)' for o in cli if 'walkthrough' not in o['fit']['formats'] or deck.needs_of(o)]
result(not viol and cli, 'fit filters hold over 100 seeds (format, assets, planned primitives, subjects, crisp, 7 s) and on the CLI',
       '; '.join(sorted(set(viol))[:4]))
seen_reel = any('reel' in [o['id'] for o in deal('festival footage film', 'launch', have=['footage'], seed=s)] for s in range(60))
result(seen_reel, '--have footage can deal the footage direction')
seen_odo = any('odometer' in [o['id'] for o in deal('saves an hour a day', 'launch', have=['number'], seed=s)] for s in range(60))
seen_wave = any('waveform' in [o['id'] for o in deal('voice notes transcription', 'launch', have=['audio'], seed=s)] for s in range(60))
result(seen_odo and seen_wave, '--have number and --have audio unlock the directions built on them')
seen_res = any('resolution' in [o['id'] for o in deal('an image upscaler for photos', 'launch', seed=s)] for s in range(60))
result(seen_res, 'a subject-bound direction is dealt when the brief names its subject')
r = run('--brief', 'x', '--format', 'walkthrough', '--direction', 'reel', '--no-history', '--out', os.path.join(TMP, 'nofit'))
result(r.returncode == 1 and 'does not fit' in r.stderr, '--direction refuses a direction that cannot make the film')
blocked = [d['id'] for d in DIRS if not dealable(d)]
if blocked:
    b = blocked[0]
    r1 = run('--brief', 'x', '--format', 'launch', '--direction', b, '--no-history', '--out', os.path.join(TMP, 'blocked'))
    r2 = run('--brief', 'x', '--format', 'launch', '--direction', b, '--allow-planned', '--no-history', '--out', os.path.join(TMP, 'blocked'))
    result(r1.returncode == 1 and 'waits for planned' in r1.stderr and r2.returncode == 0 and 'waits for planned' in r2.stdout,
           f'--direction refuses {b} while it waits for planned primitives; --allow-planned deals it with a note')
else:
    result(True, 'no direction waits for planned primitives')
hits = sum(1 for s in range(60) if 'document' in [o['id'] for o in options('--brief', 'a code editor for the terminal cli developer', '--format', 'launch', '--have', 'ui', '--seed', str(s))[1]])
base = sum(1 for s in range(60) if 'document' in [o['id'] for o in options('--brief', 'a product', '--format', 'launch', '--have', 'ui', '--seed', str(s))[1]])
result(hits > base, f'brief keywords raise a direction\'s chance ({base} -> {hits} of 60 deals)')

# 6. the sheet ------------------------------------------------------------------------------------------
od = os.path.join(TMP, 'sheet')
r = run('--brief', 'a ledger app', '--format', 'feature', '--pace', 'calm', '--seconds', '15', '--direction', 'census', '--out', od, '--no-history')
sh = json.load(open(os.path.join(od, 'direction.json'), encoding='utf-8')) if r.returncode == 0 else {}
md = open(os.path.join(od, 'DIRECTION.md'), encoding='utf-8').read() if r.returncode == 0 else ''
result(r.returncode == 0 and md == r.stdout, '--direction writes out/DIRECTION.md (the printed sheet) and out/direction.json')
result(sh.get('direction', {}).get('id') == 'census' and sh.get('palette') and sh.get('type') and sh.get('signature')
       and sh.get('recipes') and sh.get('methods'),
       'direction.json holds the direction, the dealt palette with its recipe, type, signature and build methods')
sk = sh.get('skeleton', [])
result(sk and sk[0]['from_s'] == 0 and sk[-1]['to_s'] == 15 and all(a['to_s'] == b['from_s'] for a, b in zip(sk, sk[1:])),
       'the skeleton is timed end to end over --seconds')
result(all(k in md for k in ('In this film, [', 'Competitor test', 'How the light is built', 'The story shape', 'The signature shot',
                             'The lockup', 'Beat skeleton', 'The picture never rests', 'Build methods', 'scripts/pick.py --format feature')),
       'the sheet carries the idea sentence, light build, story, signature, lockup, skeleton, floor, methods and the pick.py line')
result(sh.get('pick', {}).get('lean') == BY_ID['census']['techniques'], 'direction.json hands pick.py the direction\'s techniques')
mid = next(d for d in DIRS if all(RECIPES[p['recipe']]['status'] == 'planned' for p in d['palettes']))
r = run('--show', mid['id'])
result(r.returncode == 0 and 'not in lib/look.ts yet' in r.stdout and 'palette.py --paper' in r.stdout,
       f'a palette on a planned recipe prints its numbers and how to check them ({mid["id"]})')
od2 = os.path.join(TMP, 'keep')
r = run('--brief', 'x', '--format', 'launch', '--direction', 'rollout', '--keep', 'palette,type', '--out', od2, '--no-history')
sk2 = json.load(open(os.path.join(od2, 'direction.json'), encoding='utf-8')) if r.returncode == 0 else {}
result(r.returncode == 0 and sk2.get('palette') is None and sk2.get('type') is None and 'the brand fixes it' in r.stdout,
       '--keep palette,type deals neither and says to map the brand onto the roles')
r = run('--show', 'fold')
result(r.returncode == 0 and 'The accordion' in r.stdout and 'stone-sheet' in r.stdout and 'Lockup (device-mark)' in r.stdout,
       '--show <id> prints every variant of a direction')
r = run('--show', 'nope')
result(r.returncode == 1, '--show of an unknown id exits 1')
r = run('--list')
result(r.returncode == 0 and len(r.stdout.strip().splitlines()) == n, '--list prints one line per direction')

# 7. redraws ---------------------------------------------------------------------------------------------
od3 = os.path.join(TMP, 'redraw')
run('--brief', 'x', '--format', 'launch', '--direction', 'fold', '--seed', '5', '--out', od3, '--no-history')
before = json.load(open(os.path.join(od3, 'direction.json'), encoding='utf-8'))
r = run('--redraw', 'palette', '--out', od3)
result(r.returncode == 2 and '--reason' in r.stderr, '--redraw without --reason is refused')
r = run('--redraw', 'palette', '--reason', 'the brand owns a red', '--out', od3)
after = json.load(open(os.path.join(od3, 'direction.json'), encoding='utf-8'))
result(r.returncode == 0 and after['palette']['id'] != before['palette']['id'] and after['redraws'][-1]['reason'] == 'the brand owns a red'
       and after['palette']['recipe'] in after['recipes'],
       'a palette redraw changes the palette, its recipe notes, and records the reason')
r1 = run('--redraw', 'signature', '--reason', 'no diagonal fits the panel', '--out', od3)
r2 = run('--redraw', 'signature', '--reason', 'back to the crease after all', '--out', od3)
r3 = run('--redraw', 'signature', '--reason', 'a third try is one too many', '--out', od3)
result(r1.returncode == 0 and 'The accordion' in r1.stdout and r2.returncode == 0 and r3.returncode == 1,
       'a signature redraw deals the alternative; a third redraw of one slot is refused')
r = run('--redraw', 'direction', '--reason', 'the product has no document to fold', '--out', od3)
after = json.load(open(os.path.join(od3, 'direction.json'), encoding='utf-8'))
result(r.returncode == 0 and after['direction']['id'] != 'fold' and dealable(after['direction']) and '## Redraws' in r.stdout,
       'a direction redraw deals another dealable direction and keeps the log')

# 8. history -------------------------------------------------------------------------------------------
hist = os.path.join(TMP, 'h.json')
env = dict(ENV, CINETIC_DECK_HISTORY=hist)
run('--brief', 'x', '--format', 'launch', '--direction', 'census', '--out', os.path.join(TMP, 'h1'), env=env)
h = json.load(open(hist, encoding='utf-8')) if os.path.isfile(hist) else []
result(h and h[0]['direction'] == 'census', 'choosing a direction records it in the history')
r = subprocess.run([sys.executable, DECK_PY, '--brief', 'x', '--format', 'launch', '--options', '3', '--seed', '1'], capture_output=True,
                   text=True, encoding='utf-8', env=env, cwd=TMP)
result('recent films' in r.stdout and 'census' in r.stdout.split('recent films')[-1], 'the options name the recent directions they down-weight')
with_h = sum(1 for s in range(300) if 'census' in [o['id'] for o in deal('x', 'launch', seed=s, recent=['census'])])
without = sum(1 for s in range(300) if 'census' in [o['id'] for o in deal('x', 'launch', seed=s)])
result(with_h < without * 0.7, f'a recent direction is dealt less often ({without} -> {with_h} of 300)')
size = os.path.getsize(hist)
run('--brief', 'x', '--format', 'launch', '--direction', 'fold', '--out', os.path.join(TMP, 'h2'), '--no-history', env=env)
result(os.path.getsize(hist) == size, '--no-history leaves the history alone')

# 9. house wording -------------------------------------------------------------------------------------
texts = {'directions.json': open(SHIPPED, encoding='utf-8').read(), 'DIRECTION.md': md}
src = open(DECK_PY, encoding='utf-8').read()
texts['deck.py (docstring and messages)'] = re.sub(r'WORDING = \[.*?\n\]', '', src, flags=re.S)
leaks = [f'{k}: {m.group(0)}' for k, t in texts.items() for p in deck.WORDING for m in [re.search(p, t, re.I)] if m]
result(not leaks, 'the deck, a dealt sheet and deck.py carry no provenance phrasing', '; '.join(leaks[:4]))
planted = copy.deepcopy(DATA)
planted['directions'][0]['world']['set'] += ' A trick ' + 'stud' + 'ied in reference ' + 'films.'
result(len(deck.wording_hits(planted)) >= 2, 'the wording guard catches planted phrases')
caps = [w for w in re.findall(r'\b[A-Z][A-Z0-9]{3}\b', texts['directions.json']) if w not in ('CSS', 'SVG', 'HTML', 'OKLCH')]
result(not caps, 'the deck carries no stray four-character upper-case codes', ', '.join(sorted(set(caps))[:8]))

print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
