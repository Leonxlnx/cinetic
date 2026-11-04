#!/usr/bin/env python3
"""deck.test.py: regression tests for deck.py, the film-direction deal.

  1. The shipped decks validate merged: the main deck 18-28 directions, the imagery deck at least 3,
     every library id and primitive name real, the
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
     methods and the pick.py line; no tracks, only the music.mjs lines that find the film's own; --keep
     leaves the brand's slots alone.
  7. Redraws need a reason, are recorded, change the slot, and stop after two per slot.
  8. The history down-weights recent directions and can be switched off.
  9. House wording: the deck, deck.py and a dealt sheet carry no provenance phrasing; run from the skill folder,
     deck.py refuses to write its sheet into it.
 10. Update films: the directions that make them carry an update skeleton (a hook on the version or the
     mark, 2-4 change beats, a payoff, the end card with the version; 1-3 words a fragment); --format update
     deals only them and times --changes N change beats; the version counts as the film's number.
 11. The brand: --brand maps the dealt roles onto the brand's colours (a brand colour near the recipe's
     lightness, else the recipe on the brand's own grey, never a ground at the accent's hue), checks
     contrast, moves to a palette that holds the brand accent when the dealt one cannot, and sets the brand's
     face in the dealt weights; a colour world takes a second brand colour or falls back to a neutral.
 12. Deck hygiene: the real export names (Card), every primitive and recipe the starter has marked built,
     a pre-softened foreground layer on by default in layered spaces, lockups made by the film's own device.
 14. Steering: each brief subject a direction knows triples its weight (a calendar brief deals sundial, which no
     other brief gets); --have input is a word; two type-led directions set frontal type on clean flat grounds and
     a type brief deals them; waveform speaks of the product's sound, never a voice the music ducks under; a
     colour field palette says it is an event, not the film's ground; a light brand put on a darker ground says so.
 13. Imagery decks: every deck file in assets/directions/ is dealt; an imagery-led direction carries a picture
     brief (kind, count, inventory, queries, sources, one grade, choose, refuse) that its sheet prints, for a
     launch and for an update film; a deal of 3 holds an imagery-led direction and a built world when its pool
     has both; --no-imagery deals none; broken deck folders are refused (a thin deck, a catalogue entry two decks
     define differently, a direction id in two decks, a missing or thin picture brief).
 15. Text first, imagery opt-in: an imagery-led direction fits only with --have photos or footage (never dealt
     without, dealt with); type-led directions weigh x4 and graphic ones x1.5, so a plain brief meets a
     type-led direction in about half the deals or more; the sheet asks for a script (5-8 plain sentences, what the product is first, one clean line at a time, each
     with its own text animation), its skeleton gives each copy beat one sentence, and an update sheet one short
     sentence per change.

Usage (from the skill root):  python3 scripts/test/deck.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import copy
import importlib.util
import itertools
import json
import math
import os
import re
import shlex
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
DECK_PY = os.path.join(SKILL, 'scripts', 'deck.py')
SHIPPED = os.path.join(SKILL, 'assets', 'directions', 'directions.json')
IMAGERY = os.path.join(SKILL, 'assets', 'directions', 'imagery.json')
VERBOSE = '--verbose' in sys.argv
failed = 0

spec = importlib.util.spec_from_file_location('deck', DECK_PY)
deck = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deck)
MAIN = json.load(open(SHIPPED, encoding='utf-8'))  # the main deck alone: broken() mutates copies of it
DATA, DECK_PROBLEMS = deck.load_deck(deck.DEFAULT_DECK)  # every deck in assets/directions/, merged: what deck.py deals
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


LIBRARY = deck.load_library(deck.DEFAULT_LIBRARY)


def broken(mutate, cli=False):
    """Validate a mutated copy of the shipped deck; returns (exit code, error text). In process by default
    (each CLI start costs seconds); cli=True goes through deck.py --deck ... --validate."""
    data = copy.deepcopy(MAIN)
    mutate(data)
    if not cli:
        errors, _ = deck.validate(data, LIBRARY, deck.starter_src(), False)
        return (2 if errors else 0), '\n'.join(errors)
    path = os.path.join(TMP, 'broken.json')
    json.dump(data, open(path, 'w', encoding='utf-8'))
    r = run('--deck', path, '--validate')
    return r.returncode, r.stderr


def dealable(d):
    return all(p in READY for p in d.get('requires', []))


def UPD(x):
    """The first direction of a deck copy that makes update films."""
    return next(d for d in x['directions'] if 'update' in d.get('fit', {}).get('formats', []) or 'update' in d)


# 1. the shipped deck --------------------------------------------------------------------------------
r = run('--validate', '--strict')
result(r.returncode == 0, 'the shipped deck validates (--strict: library, starter source, look.ts)', (r.stdout + r.stderr).strip()[-300:])
n = len(DIRS)
PER = DATA.get('decks', {})
result(not DECK_PROBLEMS and 18 <= len(PER.get('directions', [])) <= 28 and len(PER) >= 2 and all(len(v) >= 3 for v in PER.values()),
       f'the main deck holds 18-28 directions, every deck that adds directions at least 3 ({", ".join(f"{k} {len(v)}" for k, v in PER.items())})',
       '; '.join(DECK_PROBLEMS[:3]))
GROW = max(1.0, n / 24)  # the share caps hold per 24 directions
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
result(len(shapes) >= 10 and max(len(v) for v in shapes.values()) <= math.ceil(3 * GROW),
       f'{len(shapes)} story shapes, none used more than {math.ceil(3 * GROW)} times')
lks = {}
for d in DIRS:
    lks.setdefault(d['lockup']['kind'], []).append(d['id'])
result(len(lks) >= 6 and max(len(v) for v in lks.values()) <= math.ceil(5 * GROW),
       f'{len(lks)} lockup kinds, none more than {math.ceil(5 * GROW)} (device-becomes-mark: {len(lks.get("device-mark", []))})')
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
    ('a copy slot of 8 words', lambda x: x['directions'][7]['skeleton'][0].__setitem__('copy', {'words': [2, 8], 'what': 'too much'}), '1-7 words'),
    ('a ban-unsafe technique', lambda x: x['directions'][8]['techniques'].append('tr-band-wipe'), 'banned look'),
    ('a provenance phrase', lambda x: x['directions'][9].__setitem__('idea', 'As ' + 'learned' + ' from the best, a fold.'), 'house craft'),
    ('a technique-style id', lambda x: x['directions'][10]['signature'].__setitem__('shot', 'As in ' + 'T' + '17, a dive.'), 'house craft'),
    ('skeleton shares that do not add up', lambda x: x['directions'][11]['skeleton'][0].__setitem__('share', 0.5), 'add up'),
    ('a palette outside the accent families', lambda x: x['directions'][12]['palettes'][0].__setitem__('accent', ['pink']), 'accent families'),
    ('a primitive marked built that the starter lacks', lambda x: x['primitives'].__setitem__('NoSuchPrimitive', {'file': 'fx/NoSuchPrimitive.tsx', 'status': 'built'}), 'does not export'),
    ('too few directions', lambda x: x.__setitem__('directions', x['directions'][:10]), '18-28'),
    ('a lockup that waits for a planned primitive', lambda x: (x['primitives'].__setitem__('PlannedOnly', {'file': 'fx/PlannedOnly.tsx', 'status': 'planned'}), x['directions'][13]['lockup']['primitives'].append('PlannedOnly')), 'a lockup is built from primitives that exist'),
    ('a signature on a planned primitive it does not declare', lambda x: (x['primitives'].__setitem__('PlannedOnly', {'file': 'fx/PlannedOnly.tsx', 'status': 'planned'}), x['directions'][14]['signature']['primitives'].append('PlannedOnly')), 'list it in requires'),
    ('a vague signature shot', lambda x: x['directions'][15]['signature'].__setitem__('shot', 'Something beautiful happens to the product.'), 'quantities'),
    ('an unknown story shape', lambda x: x['directions'][16]['story'].__setitem__('shape', 'montage-of-everything'), 'story.shape'),
    ('an unknown lockup kind', lambda x: x['directions'][17]['lockup'].__setitem__('kind', 'end-card'), 'lockup.kind'),
    ('a light event on a planned primitive', lambda x: (x['primitives'].__setitem__('PlannedOnly', {'file': 'fx/PlannedOnly.tsx', 'status': 'planned'}), x['directions'][18]['world'].__setitem__('light_build', 'PlannedOnly plates moved by opacity')), 'is planned'),
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
    ('update in fit.formats without an update skeleton', lambda x: UPD(x).pop('update'), 'carries an "update" skeleton'),
    ('an update skeleton without the format', lambda x: UPD(x)['fit']['formats'].remove('update'), 'carries an "update" skeleton'),
    ('an update fragment of 4 words', lambda x: UPD(x)['update']['change'].__setitem__('copy', {'words': [2, 4], 'what': 'too much'}), '1-3 words'),
    ('an update signature on the change beat', lambda x: UPD(x)['update']['change'].__setitem__('signature', True), 'never on the repeated change beat'),
    ('an update hook without frame 0', lambda x: UPD(x)['update']['hook'].__setitem__('picture', 'The version number arrives in the middle of the film somewhere.'), 'frame 0'),
    ('an update end card without the version', lambda x: UPD(x)['update']['end'].__setitem__('picture', 'The mark and the name settle on the floor, nothing more to it.'), 'carries the version'),
    ('an update film of 30 s', lambda x: UPD(x)['update'].__setitem__('seconds', [8, 30]), 'within 8-20'),
    ('an update change without a handoff', lambda x: UPD(x)['update']['change'].pop('handoff'), 'hands over'),
    ('a lockup over a radial plate', lambda x: x['directions'][3]['lockup'].__setitem__('shot', 'Mark, name and tag' + 'line centred over a radial plate.'), 'own device'),
    ('a foreground turned off without a reason', lambda x: x['directions'][4]['world'].__setitem__('foreground', 'off'), 'world.foreground'),
]
for i, (name, mutate, expect) in enumerate(cases):
    code, err = broken(mutate, cli=(i == 0))
    result(code == 2 and expect in err, f'validate refuses {name}{" (through the CLI)" if i == 0 else ""}',
           f'exit {code}; {err.strip().splitlines()[-1][:160] if err.strip() else ""}')

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
                if any(tf(d) in ('mid', 'field') for d in pool) and not any(tf(o) in ('mid', 'field') for o in opts):
                    issues.append('no mid or colour ground')
                if sum(1 for o in opts if o['intensity'] <= 2) > 1:
                    issues.append('two quiet directions')
                probs = deck.option_problems(opts, pool, 3, tf)
                if issues or probs:
                    imperfect += 1
                    if any(not deck.option_problems(list(c), pool, 3, tf) for c in itertools.combinations(pool, 3)):
                        bad.append(f'{tag}: dealt {issues or probs} although a perfect set existed')
result(not bad, f'every deal of 3 ({total} deals): distinct motion, signature, story and lockup; 3 spaces; 2 lights; 2 ground '
                f'tones, one of them mid or colour; a rich one; at most one quiet ({imperfect} imperfect, each because its pool held '
                'no perfect set)', '; '.join(bad[:4]))
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
        # an update film owns its version as its one number (--have number is implied)
        viol += [f'{o["id"]} without its asset' for o in none if [k for k in deck.needs_of(o, fmt) if not (fmt == 'update' and k == 'number')]]
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
# in process (the CLI prints exactly this deal, tested above): 120 CLI runs would take minutes on a busy machine
hits = sum(1 for s in range(60) if 'document' in [o['id'] for o in deal('a code editor for the terminal cli developer', 'launch', have=['ui'], seed=s)])
base = sum(1 for s in range(60) if 'document' in [o['id'] for o in deal('a product', 'launch', have=['ui'], seed=s)])
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
mf = sh.get('music_find', {})
lo, hi = BY_ID['census']['music']['bpm']
result('music_tracks' not in sh and all(f'node scripts/music.mjs {c} ' in mf.get(c, '') and f'--bpm {lo}-{hi} --length 15' in mf.get(c, '') for c in ('search', 'pick')),
       'direction.json lists no tracks: it points to music.mjs search and pick, which hold back every track an earlier film used', str(mf)[:160])
# a recipe the starter does not have yet (made in the test: every shipped recipe is built)
tdeck = copy.deepcopy(DATA)
for k in ('stoneMid', 'slateMid', 'deepField'):
    tdeck['recipes'][k]['status'] = 'planned'
tpath = os.path.join(TMP, 'planned-recipes.json')
json.dump(tdeck, open(tpath, 'w', encoding='utf-8'))
mid = next(d for d in tdeck['directions'] if all(tdeck['recipes'][p['recipe']]['status'] == 'planned' for p in d['palettes']))
r = run('--deck', tpath, '--show', mid['id'])
result(r.returncode == 0 and 'not in lib/look.ts yet' in r.stdout and 'palette.py --paper' in r.stdout,
       f'a palette on a planned recipe prints its numbers and how to check them ({mid["id"]}, a test-made planned recipe)')
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
cmd = re.search(r'<!-- python3 scripts/deck\.py (.*?) -->', r.stdout)
args = shlex.split(cmd.group(1)) if cmd else []
ids = lambda out: re.findall(r'^## \d+\. `([a-z0-9-]+)`', out, re.M)  # noqa: E731
other = dict(ENV, CINETIC_DECK_HISTORY=os.path.join(TMP, 'h-other.json'))
again = run(*args, env=other) if args else None
result('--recent census' in (cmd.group(1) if cmd else '') and again is not None and ids(again.stdout) == ids(r.stdout),
       'the printed command carries --recent and deals the same options on a machine with another history',
       f"{cmd.group(1) if cmd else 'no command'}: {ids(r.stdout)} vs {again and ids(again.stdout)}")
size = os.path.getsize(hist)
run('--brief', 'x', '--format', 'launch', '--direction', 'fold', '--out', os.path.join(TMP, 'h2'), '--no-history', env=env)
result(os.path.getsize(hist) == size, '--no-history leaves the history alone')

# 9. house wording -------------------------------------------------------------------------------------
texts = {'directions.json': open(SHIPPED, encoding='utf-8').read(), 'imagery.json': open(IMAGERY, encoding='utf-8').read(),
         'DIRECTION.md': md}
src = open(DECK_PY, encoding='utf-8').read()
texts['deck.py (docstring and messages)'] = re.sub(r'WORDING = \[.*?\n\]', '', src, flags=re.S)
leaks = [f'{k}: {m.group(0)}' for k, t in texts.items() for p in deck.WORDING for m in [re.search(p, t, re.I)] if m]
result(not leaks, 'the deck, a dealt sheet and deck.py carry no provenance phrasing', '; '.join(leaks[:4]))
planted = copy.deepcopy(DATA)
planted['directions'][0]['world']['set'] += ' A trick ' + 'stud' + 'ied in reference ' + 'films.'
result(len(deck.wording_hits(planted)) >= 2, 'the wording guard catches planted phrases')
caps = [w for w in re.findall(r'\b[A-Z][A-Z0-9]{3}\b', texts['directions.json'] + texts['imagery.json'])
        if w not in ('CSS', 'SVG', 'HTML', 'OKLCH')]
result(not caps, 'the deck carries no stray four-character upper-case codes', ', '.join(sorted(set(caps))[:8]))

# 10. update films -------------------------------------------------------------------------------------
upd = [d for d in DIRS if 'update' in d['fit']['formats']]
result(len(upd) >= 18 and all(isinstance(d.get('update'), dict) and not deck.update_problems(d) for d in upd),
       f'{len(upd)} of {n} directions make update films, each with a valid update skeleton')
for k in (2, 3, 4):
    bs = deck.update_beats(upd[0], k)
    ok = (len(bs) == k + 3 and abs(sum(b['share'] for b in bs) - 1) < 1e-9 and sum(1 for b in bs if b['change']) == k
          and sum(1 for b in bs if b['signature']) == 1 and bs[0]['beat'] == 'hook' and bs[-1]['beat'] == 'end')
    result(ok, f'an update skeleton expands to a hook, {k} change beats, a payoff and the end card, shares adding to 1')
viol = []
for s in range(40):
    for pace in deck.PACES:
        for have in ((), ('ui',)):
            opts, pool, _ = deck.options_for(DATA, inp_of('a notes app, version 2.4 is out', 'update', pace, have), s, 3, (), (), (), READY)
            viol += [f'{o["id"]} in an update deal' for o in opts if 'update' not in o['fit']['formats']]
            viol += [f'{o["id"]} without its asset' for o in opts if not deck.fits(o, 'update', pace, have, None, 'x', READY)[0]]
            if len(opts) < 3:
                viol.append(f'{pace}/{",".join(have) or "-"}/{s}: {len(opts)} options')
result(not viol, 'every update deal of 3 holds only directions that make update films and fit the assets', '; '.join(sorted(set(viol))[:4]))
odo = BY_ID.get('odometer')
if odo and 'update' in odo['fit']['formats']:
    result(deck.fits(odo, 'update', 'calm', (), None, 'x', READY)[0] and not deck.fits(odo, 'launch', 'calm', (), None, 'x', READY)[0],
           'the version is the number an update film owns: the odometer fits an update without --have number, a launch film only with it')
od4 = os.path.join(TMP, 'update')
r = run('--brief', 'a notes app, 2.4 is out', '--format', 'update', '--changes', '4', '--seconds', '16', '--direction', upd[0]['id'], '--out', od4, '--no-history')
shu = json.load(open(os.path.join(od4, 'direction.json'), encoding='utf-8')) if r.returncode == 0 else {}
sk = shu.get('skeleton', [])
result(r.returncode == 0 and shu.get('changes') == 4 and sum(1 for b in sk if b.get('change')) == 4 and sk[-1]['to_s'] == 16
       and 'an update film (4 changes' in r.stdout and 'From one change to the next' in r.stdout and '--changes 4' in r.stdout
       and all(b['copy'] is None or b['copy']['words'][1] <= 3 for b in sk),
       'an update sheet times 4 change beats over 16 s, says how changes hand over, and keeps every fragment at 1-3 words')
r = run('--brief', 'x', '--format', 'update', '--changes', '5', '--options', '3')
r2 = run('--brief', 'x', '--format', 'launch', '--changes', '3', '--options', '3')
result(r.returncode == 2 and r2.returncode == 2 and '--format update' in r2.stderr, '--changes takes 2-4 and belongs to --format update')
result(all('update' in d['fit']['formats'] and isinstance(d.get('update'), dict) for d in DIRS),
       'every direction carries an update skeleton (a short film suits each world)')
nd = copy.deepcopy(DATA)
nou = nd['directions'][0]
nou['fit']['formats'] = [f for f in nou['fit']['formats'] if f != 'update']
nou.pop('update', None)
npath = os.path.join(TMP, 'no-update.json')
json.dump(nd, open(npath, 'w', encoding='utf-8'))
r = run('--deck', npath, '--brief', 'x', '--format', 'update', '--direction', nou['id'], '--out', os.path.join(TMP, 'nou'), '--no-history')
result(r.returncode == 1 and 'does not fit' in r.stderr, '--format update refuses a direction without an update skeleton')
r = run('--show', upd[0]['id'])
result(r.returncode == 0 and 'Update skeleton' in r.stdout, '--show prints the update skeleton')

# 11. the brand -----------------------------------------------------------------------------------------
bdir = os.path.join(TMP, 'brand')
os.makedirs(bdir, exist_ok=True)
bjson = os.path.join(bdir, 'brand.json')
json.dump({'version': 1, 'name': 'Ledgerly', 'colours': {'source': 'supplied', 'accent': '#1F6FEB', 'list': [
    {'hex': '#1F6FEB'}, {'hex': '#0B1220'}, {'hex': '#F4F6FA'}, {'hex': '#8A94A6'}]}, 'fonts': {'family': 'Inter'}}, open(bjson, 'w'))
brand = deck.read_brand(bjson)
maps = [deck.map_palette(p, RECIPES, brand) for d in DIRS for p in d['palettes']]
result(all(m['accent']['hex'] == '#1F6FEB' for m in maps) and all(m['ink']['contrast'] >= 7 or m['ink']['source'] != 'brand' for m in maps),
       'a mapped palette keeps the brand accent and takes a brand ink only when it holds 7:1')
light = [m for m in maps if m['tone'] == 'light']
result(light and all(m['ground']['hex'] == '#F4F6FA' and m['ground']['source'] == 'brand' for m in light),
       'a light recipe takes the brand\'s own light neutral as its ground')
derived = [m for m in maps if m['tone'] == 'field']
result(derived and all(m['ground']['source'] == 'recipe on the brand neutral' and deck.hex_oklch(m['ground']['hex'])[1] <= 0.025
                       and 'no second colour' in m.get('field_note', '') for m in derived),
       "a colour world the brand cannot fill falls back to a neutral ground, never a field at the accent's hue")
result(all(m['ground']['source'] == 'brand' or deck.hex_oklch(m['ground']['hex'])[1] <= 0.025 for m in maps)
       and all(m['ink']['source'] == 'brand' or deck.hex_oklch(m['ink']['hex'])[1] <= 0.025 for m in maps),
       "every derived ground and ink stays neutral (C <= .025): the brand's accent never becomes its ground")
# a kit whose greys lean faintly to the accent hue (a cobalt brand with cool greys): the greys are the grounds
cool = {'file': 'x', 'name': 'x', 'accent': '#1F5EFF', 'colours': ['#1F5EFF', '#F5F7F9', '#EBEDF0', '#DFE2E6', '#0E0F13'],
        'source': 'supplied', 'family': None}
cmaps = [deck.map_palette(p, RECIPES, cool) for d in DIRS for p in d['palettes']]
hn, cn = deck.brand_neutral(cool)
result(cn <= 0.025 and all(m['ground']['hex'] in cool['colours'] or deck.hex_oklch(m['ground']['hex'])[1] <= cn + 0.002 for m in cmaps)
       and any(m['ground']['hex'] == '#F5F7F9' for m in cmaps) and any(m['ground']['hex'] == '#0E0F13' for m in cmaps),
       "a supplied kit's own greys and paper are the grounds; derived grounds carry no more chroma than its greys")
second = dict(cool, colours=cool['colours'] + ['#1E5A52'])
fm = [deck.map_palette(p, RECIPES, second) for d in DIRS for p in d['palettes'] if RECIPES[p['recipe']].get('tone') == 'field']
result(fm and all(m['ground']['hex'] == '#1E5A52' and m['ground']['source'] == 'brand' for m in fm),
       "a colour world takes the brand's second colour when it sits near the field's lightness")
od5 = os.path.join(TMP, 'branded')
r = run('--brief', 'a ledger app', '--format', 'launch', '--direction', 'odometer', '--have', 'number', '--brand', bjson, '--out', od5, '--no-history')
shb = json.load(open(os.path.join(od5, 'direction.json'), encoding='utf-8')) if r.returncode == 0 else {}
bm = shb.get('brand') or {}
result(r.returncode == 0 and bm.get('ok') and bm.get('accent', {}).get('contrast', 0) >= 3 and bm.get('ink', {}).get('contrast', 0) >= 7
       and 'mapped onto the brand' in r.stdout and 'Inter, weights' in r.stdout and 'cinetic:brand-supplied' in r.stdout,
       'a branded sheet maps ground, ink and accent with their contrast and sets the brand\'s face in the dealt weights')
if shb.get('palette') and bm.get('palette') != shb['palette']['id']:
    result('maps cleanly' in bm.get('note', ''), 'when the dealt palette cannot hold the brand accent, the sheet says which palette maps cleanly')
r = run('--brief', 'x', '--format', 'launch', '--direction', 'fold', '--brand', os.path.join(bdir, 'missing.json'), '--out', od5, '--no-history')
result(r.returncode == 2 and 'brand.py' in r.stderr, '--brand with a missing file is refused')

# 12. deck hygiene ---------------------------------------------------------------------------------------
result('Card' in CAT and 'Cards' not in CAT and CAT['Card']['file'] == 'fx/Cards.tsx', 'the catalogue names the starter\'s real Card export')
result(all(v['status'] == 'built' for v in RECIPES.values()), 'every colour recipe the starter has is marked built')
SRC = deck.starter_src()
# never dealt by name: the kit's generic Text and Check come with its panels; glass, glow plates, gradient
# text and font cycling stay in the starter for a brand that supplies them, and the deck lights its worlds
# with the key light and living light instead; a press is shown by the real pointer, so the click bloom (a disc of
# light at the press) is never dealt
UNDEALT = {'Text', 'Check', 'Glass', 'Bloom', 'RimLight', 'FloorGlow', 'ColourShadow', 'LightFront', 'RadialStreaks',
           'GradientText', 'FontCycle', 'ClickBloom'}
unlisted = []
for sub in ('fx', 'kit'):
    for f in sorted(os.listdir(os.path.join(SRC, sub))):
        if f.endswith(('.ts', '.tsx')):
            text = open(os.path.join(SRC, sub, f), encoding='utf-8').read()
            unlisted += [f'{sub}/{f}:{n}' for n in re.findall(r'export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)\b', text)
                         if n not in CAT and n not in UNDEALT]
result(not unlisted, 'every component the starter exports from fx/ and kit/ has a built catalogue entry', ', '.join(unlisted[:6]))
result(not (UNDEALT & set(CAT)), 'glass, glow plates, gradient text and font cycling are never in the catalogue')
key = {d['id']: d['primitives'] for d in DIRS}
result(all(any(n in key[i] for n in ('ReliefScene', 'keyLightState', 'castShadow', 'projectOnWall')) for i in ('relief', 'sundial', 'wells', 'shadow-play')),
       'the light-led directions lean on the directional key (ReliefScene, keyLightState, cast shadows)')
notes = [x for x in run('--validate').stdout.splitlines() if 'mark it built' in x]
result(not notes, 'no planned primitive or recipe is already exported by the starter', '; '.join(notes[:3]))
lay = next(d for d in DIRS if d['world']['space'] == 'layered' and not str(d['world'].get('foreground', '')).startswith('off')
           and 'launch' in d['fit']['formats'] and not deck.needs_of(d))
flat = next(d for d in DIRS if d['world']['space'] == 'flat' and 'launch' in d['fit']['formats'] and not deck.needs_of(d))
r1 = run('--brief', 'x', '--format', 'launch', '--direction', lay['id'], '--out', os.path.join(TMP, 'fg1'), '--no-history')
r2 = run('--brief', 'x', '--format', 'launch', '--direction', flat['id'], '--out', os.path.join(TMP, 'fg2'), '--no-history')
result('Foreground layer (on by default' in r1.stdout and 'Foreground layer' not in r2.stdout and 'pre-softened' in DATA['defaults']['foreground'],
       f'a layered space carries a pre-softened foreground layer by default ({lay["id"]}), a flat one does not ({flat["id"]})')
result('centred and built from' in r1.stdout and 'LogoMark' in r1.stdout, 'the lockup section asks for the film\'s own device, centred and built from the last element, and the supplied logo\'s parts')
result('Ground family (dealt)' in r1.stdout and 'FamilyGround' in r1.stdout, 'the sheet deals one ground family for the whole film')

# 13. imagery decks -------------------------------------------------------------------------------------
IMG = [d for d in DIRS if deck.is_imagery(d)]
result(len(IMG) >= 3 and {d['id'] for d in IMG} == set(PER.get('imagery', [])),
       f'the imagery deck is dealt with the main deck ({len(IMG)} imagery-led directions)')
upd_img = next(d for d in IMG if 'update' in d['fit']['formats'] and not deck.needs_of(d, 'update'))
r1 = run('--brief', 'a tide forecast for small boats', '--format', 'update', '--have', 'photos', '--direction', upd_img['id'], '--out', os.path.join(TMP, 'img1'), '--no-history')
launch_img = next(d for d in IMG if 'launch' in d['fit']['formats'] and not deck.needs_of(d) and d['id'] != upd_img['id'])
r2 = run('--brief', 'a tide forecast for small boats', '--format', 'launch', '--have', 'photos', '--direction', launch_img['id'], '--out', os.path.join(TMP, 'img2'), '--no-history')
result(r1.returncode == 0 and '**Imagery (real pictures are this world):**' in r1.stdout and '## 8. Beat skeleton: an update film' in r1.stdout
       and '**Queries**' in r1.stdout and 'assets.mjs' in r1.stdout,
       f'an imagery-led direction deals an update film with its picture brief ({upd_img["id"]})', (r1.stderr or '')[-200:])
result(r2.returncode == 0 and '**Imagery (real pictures are this world):**' in r2.stdout and '**Refuse:**' in r2.stdout,
       f'and a launch film ({launch_img["id"]})', (r2.stderr or '')[-200:])
r3 = run('--show', IMG[0]['id'])
result(r3.returncode == 0 and '**One grade for every picture:**' in r3.stdout, '--show prints an imagery-led direction\'s picture brief')
mixed, none_img, swept = [], [], 0
for fmt in deck.FORMATS:
    for pace in deck.PACES:
        for s_ in range(20):
            inp = inp_of('test', fmt, pace, ('photos',))
            opts, pool, _ = deck.options_for(DATA, inp, s_, 3, (), (), (), READY)
            swept += 1
            why = ('no imagery' if len(opts) >= 2 and any(deck.is_imagery(d) for d in pool) and not any(deck.is_imagery(o) for o in opts)
                   else 'imagery only' if len(opts) >= 2 and any(not deck.is_imagery(d) for d in pool) and all(deck.is_imagery(o) for o in opts)
                   else '')
            if why:  # allowed only when no set of the pool meets every ask (as in section 4)
                tc = {d['id']: deck.palette_tone(d, s_, RECIPES) for d in pool}
                if any(not deck.option_problems(list(c), pool, 3, lambda d: tc[d['id']]) for c in itertools.combinations(pool, 3)):
                    mixed.append(f'{fmt}/{pace}/{s_}: {why}')
            inp['imagery'] = False
            opts, _, _ = deck.options_for(DATA, inp, s_, 3, (), (), (), READY)
            none_img += [o['id'] for o in opts if deck.is_imagery(o)]
result(not mixed, f'every deal of 3 holds an imagery-led direction and a built world when its pool has both and a perfect set exists ({swept} deals)', '; '.join(mixed[:4]))
result(not none_img, '--no-imagery deals no imagery-led direction', ', '.join(sorted(set(none_img))[:4]))
r = run('--brief', 'x', '--format', 'launch', '--have', 'photos', '--options', '3', '--no-imagery', '--seed', '2', '--no-history')
result(r.returncode == 0 and '--no-imagery' in r.stdout.splitlines()[0] and 'imagery-led' not in r.stdout,
       '--no-imagery reaches the CLI deal and its reproducible command line')
IMG_RAW = json.load(open(IMAGERY, encoding='utf-8'))


def broken_folder(mutate):
    """Validate a deck folder: the main deck and a mutated copy of the imagery deck. Returns the error text."""
    folder = tempfile.mkdtemp(dir=TMP)
    json.dump(MAIN, open(os.path.join(folder, 'directions.json'), 'w', encoding='utf-8'))
    img = copy.deepcopy(IMG_RAW)
    mutate(img)
    json.dump(img, open(os.path.join(folder, 'imagery.json'), 'w', encoding='utf-8'))
    data, problems = deck.load_deck(folder)
    errors, _ = deck.validate(data, LIBRARY, deck.starter_src(), False)
    return folder, '\n'.join(problems + errors)


folder, err = broken_folder(lambda x: None)
r = run('--deck', folder, '--validate')
result(not err and r.returncode == 0 and f'imagery {len(IMG)}' in r.stdout,
       'a deck folder (--deck <folder>) merges its decks', (err or r.stderr)[-200:])
first_prim = next(iter(IMG_RAW['primitives']))
for name, mutate, expect in (
        ('a deck of 2 directions', lambda x: x.__setitem__('directions', x['directions'][:2]), 'at least 3'),
        ('a primitive two decks define differently', lambda x: x['primitives'].__setitem__('Card', {'file': 'fx/Elsewhere.tsx', 'status': 'built'}),
         'differs from the one another deck defines'),
        ('a direction id in two decks', lambda x: x['directions'][0].__setitem__('id', MAIN['directions'][0]['id']), 'duplicate id'),
        ('an imagery-led direction without its picture brief', lambda x: x['directions'][1].pop('assets'), 'needs an assets block'),
        ('a picture brief with 2 queries', lambda x: x['directions'][2]['assets'].__setitem__('queries', ['a', 'b']), 'at least 3 query patterns'),
        ('a picture brief without a grade', lambda x: x['directions'][3]['assets'].__setitem__('grade', {}), 'one look for every picture'),
        ('an unknown kind of picture', lambda x: x['directions'][4]['assets'].__setitem__('kind', ['hologram']), 'assets.kind')):
    _, err = broken_folder(mutate)
    result(expect in err, f'a deck folder with {name} is refused', err.strip().splitlines()[0][:160] if err.strip() else 'no error')

# 14. steering, type-led directions, no borrowed nouns ----------------------------------------------
cal = sum(1 for s_ in range(40) if 'sundial' in [o['id'] for o in deal('a calendar that schedules your week', 'launch', seed=s_)])
cam = sum(1 for s_ in range(40) if 'sundial' in [o['id'] for o in deal('a camera app for night photos', 'launch', seed=s_)])
result(cal >= 24 and cam == 0, 'a calendar brief deals sundial most of the time; a camera brief never gets the calendar world', f'{cal} vs {cam} of 40')
inp1 = inp_of('a ledger app', 'launch', 'calm', ())
w0 = deck.weight(BY_ID['document'], inp1, ())
w2 = deck.weight(BY_ID['document'], inp_of('a code editor for the terminal', 'launch', 'calm', ()), ())
result(abs(w2 / w0 - deck.KEYWORD_X ** min(3, deck.keyword_hits(BY_ID['document'], 'a code editor for the terminal'))) < 1e-9 and w2 >= 9 * w0,
       'each brief subject a direction knows multiplies its weight by 3', f'{w0:g} -> {w2:g}')
r = run('--brief', 'a prompt box that writes SQL', '--format', 'launch', '--have', 'ui,input', '--direction', 'statement', '--out', os.path.join(TMP, 'inp'), '--no-history')
shi = json.load(open(os.path.join(TMP, 'inp', 'direction.json'), encoding='utf-8')) if r.returncode == 0 else {}
result(r.returncode == 0 and 'input' in shi.get('input', {}).get('have', []) and '--direction out/direction.json' in r.stdout,
       '--have input is accepted and reaches the sheet (pick.py reads it from out/direction.json)', r.stderr.strip()[:120])
TYPE_LED = [BY_ID[i] for i in ('statement', 'slot-line') if i in BY_ID]
result(len(TYPE_LED) == 2 and all(d['world']['space'] == 'flat' and d['world']['texture'].startswith('clean')
                                  and all(RECIPES[p['recipe']]['tone'] != 'field' for p in d['palettes']) for d in TYPE_LED),
       'two type-led directions: flat, clean grounds, no colour-field palette')
tl = sum(1 for s_ in range(40) if {'statement', 'slot-line'} & {o['id'] for o in deal('a manifesto in a few simple words', 'launch', seed=s_)})
result(tl >= 30, 'a type brief deals a type-led direction', f'{tl} of 40')
anyb = sum(1 for s_ in range(60) if {'statement', 'slot-line'} & {o['id'] for o in deal('a product', 'launch', seed=s_)})
result(anyb >= 6, 'a plain brief still meets the type-led directions now and then', f'{anyb} of 60')
wv = {k: v for k, v in BY_ID['waveform'].items() if k != 'keywords'}
result(not re.search(r'voice|spoken|speech|duck|every word|syllable', json.dumps(wv), re.I),
       'waveform speaks of the product\'s sound: no voice, speech or ducking outside its keywords')
fp = next((p for p in BY_ID['monument']['palettes'] if RECIPES[p['recipe']]['tone'] == 'field'), None)
result(fp is not None and 'an event, not the film' in ' '.join(deck._palette_lines(fp, RECIPES)), 'a colour field palette says it is an event, not the film\'s ground')
light = {'file': 'brand/brand.json', 'name': 'x', 'accent': '#1F5EFF', 'colours': ['#1F5EFF', '#FFFFFF', '#F4F5F7', '#C9CDD3'], 'source': 'supplied', 'family': None}
dark_pal = next(p for p in BY_ID['statement']['palettes'] if RECIPES[p['recipe']]['tone'] == 'dark')
bmap = deck.brand_mapping(BY_ID['statement'], dark_pal, RECIPES, light)
result('light brand' in bmap.get('tone_note', '') and '--redraw palette' in bmap['tone_note'],
       'a light brand put on a dark ground gets a loud note with the redraw', bmap.get('tone_note', '')[:100])
white_pal = next(p for p in BY_ID['statement']['palettes'] if RECIPES[p['recipe']]['tone'] == 'light')
result('tone_note' not in deck.brand_mapping(BY_ID['statement'], white_pal, RECIPES, light), 'a light brand on a light ground: no note')

# 15. text first, imagery opt-in --------------------------------------------------------------------
no_pics, with_pics, foot = set(), set(), set()
for s_ in range(60):
    for fmt in ('launch', 'update'):
        no_pics |= {o['id'] for o in deal('a tide forecast for small boats', fmt, seed=s_) if deck.is_imagery(o)}
        no_pics |= {o['id'] for o in deal('a notes app', fmt, have=['ui'], seed=s_) if deck.is_imagery(o)}
        with_pics |= {o['id'] for o in deal('a tide forecast for small boats', fmt, have=['photos'], seed=s_) if deck.is_imagery(o)}
        foot |= {o['id'] for o in deal('a tide forecast for small boats', fmt, have=['footage'], seed=s_) if deck.is_imagery(o)}
ok_fit, why_fit = deck.fits(IMG[0], 'launch', 'calm', [], None, 'x', READY)
result(not no_pics and len(with_pics) >= 3 and foot and not ok_fit and 'only with --have photos or footage' in why_fit,
       'an imagery-led direction fits only with --have photos or footage', f'without: {sorted(no_pics)[:3]}; with photos: {len(with_pics)}')
r = run('--brief', 'a tide forecast', '--format', 'launch', '--direction', IMG[0]['id'], '--out', os.path.join(TMP, 'img-no'), '--no-history')
result(r.returncode != 0 and 'photos' in (r.stderr + r.stdout), 'the sheet of an imagery-led direction is refused without --have photos or footage', (r.stderr or r.stdout).strip()[:120])
TL = [d for d in DIRS if deck.is_type_led(d)]
GR = [d for d in DIRS if deck.is_graphic(d) and not deck.is_type_led(d)]
inp0 = inp_of('a product', 'launch', 'calm', ())
base_w = lambda d: deck.KEYWORD_X ** min(3, deck.keyword_hits(d, 'a product'))  # noqa: E731
result({d['id'] for d in TL} >= {'statement', 'slot-line'} and GR and not any(deck.is_imagery(d) for d in GR)
       and all(abs(deck.weight(d, inp0, ()) - deck.TYPE_LED_X * base_w(d)) < 1e-9 for d in TL if not deck.needs_of(d))
       and all(abs(deck.weight(d, inp0, ()) - deck.GRAPHIC_X * base_w(d)) < 1e-9 for d in GR if not deck.needs_of(d)),
       'type-led directions weigh x4, graphic ones x1.5', f'type-led {sorted(d["id"] for d in TL)}')
plain = sum(1 for s_ in range(60) if any(deck.is_type_led(o) for o in deal('a product', 'launch', seed=s_)))
result(plain >= 27, 'a plain brief meets a type-led direction in about half the deals or more', f'{plain} of 60')
r = run('--brief', 'a ledger app', '--format', 'launch', '--direction', 'statement', '--out', os.path.join(TMP, 'script'), '--no-history')
result(r.returncode == 0 and '**The words are a script:**' in r.stdout and 'one sentence:' in r.stdout and '| line |' in r.stdout
       and '2. Write the script' in r.stdout and '--lines <n>' in r.stdout and 'type-led' in r.stdout
       and '`TypeLine` from `fx/TypePresets.tsx`' in r.stdout,
       'the sheet asks for a script, gives each copy beat one sentence and draws one text animation per line (TypeLine)', (r.stderr or '')[-160:])
r = run('--brief', 'a notes app, version 2.4 is out', '--format', 'update', '--direction', 'statement', '--out', os.path.join(TMP, 'script-u'), '--no-history')
result(r.returncode == 0 and 'One plain sentence per change (2-7 words)' in r.stdout and '1-3 words a fragment' not in r.stdout,
       'an update sheet asks for one short sentence per change', (r.stderr or '')[-160:])
# the sheet belongs to the film project: run from the skill folder with the default --out, deck.py refuses to write there
sheet_in_skill = os.path.join(SKILL, 'out', 'direction.json')
had = os.path.exists(sheet_in_skill)
r = run('--brief', 'x', '--format', 'launch', '--direction', 'fold', '--no-history', cwd=SKILL)
made = not had and os.path.exists(sheet_in_skill)
if made:  # never leave a sheet in the skill
    for f in ('direction.json', 'DIRECTION.md'):
        if os.path.exists(os.path.join(SKILL, 'out', f)):
            os.remove(os.path.join(SKILL, 'out', f))
result(r.returncode == 2 and 'inside the skill folder' in r.stderr and not made,
       'deck.py run from the skill folder refuses to write out/ there', (r.stderr or r.stdout)[-160:])


# a template project (src/deal.ts reads ./dealt): deck.py never picks for the agent. Without --direction it deals three
# directions with what the template would play into out/OPTIONS.md and writes no deal; --direction needs --why there
proj = tempfile.mkdtemp(dir=TMP)
os.makedirs(os.path.join(proj, 'src', 'brand'))
with open(os.path.join(proj, 'src', 'deal.ts'), 'w', encoding='utf-8') as fh:
    fh.write("import { DEALT } from './dealt';\nimport { metaOf } from './fx/creative/meta';\nexport const DEVICES = {\n  voice: ['build', 'blur', 'ink'],\n  ground: ['nearWhite', 'lightStudio', 'softSky', 'gradientField', 'whiteBand', 'blackField', 'studio', 'deepPool', 'duskMesh', 'floorGlow', 'lightDark'],\n  end: ['element', 'badge'],\n  camera: ['still', 'land'],\n} as const;\nexport const FLOOR = { voice: 'build', ground: 'nearWhite', end: 'element', camera: 'still' };\n")
with open(os.path.join(proj, 'src', 'brand', 'identity.ts'), 'w', encoding='utf-8') as fh:
    fh.write("export const IDENTITY = { name: 'Tarn', supplied: false } as const;\n")
pout = os.path.join(proj, 'out')
r = run('--brief', 'a budgeting app for shared flats', '--format', 'launch', '--have', 'ui', '--no-history', '--out', pout, cwd=proj)
opt_ids = re.findall(r'^## \d+\. `([a-z0-9-]+)`', r.stdout, re.M)
result(r.returncode == 0 and len(opt_ids) == 3 and os.path.isfile(os.path.join(pout, 'OPTIONS.md')) and not os.path.exists(os.path.join(proj, 'src', 'dealt.ts'))
       and r.stdout.count('**The template plays.**') == 3 and r.stdout.count('**Creative elements.**') == 3 and '--why' in r.stdout,
       'a template project: three directions with what the template plays each (out/OPTIONS.md), no deal until the agent picks', (r.stderr or r.stdout)[-200:])
r = run('--brief', 'a budgeting app for shared flats', '--format', 'launch', '--have', 'ui', '--no-history', '--out', pout, '--direction', opt_ids[0] if opt_ids else 'fold', cwd=proj)
result(r.returncode == 2 and '--why' in r.stderr and not os.path.exists(os.path.join(proj, 'src', 'dealt.ts')),
       'a template project: --direction without --why is refused', (r.stderr or '')[-160:])
why = 'flatmates split one bill: the wall of moments closing into one picture is that'
r = run('--brief', 'a budgeting app for shared flats', '--format', 'launch', '--have', 'ui', '--no-history', '--out', pout, '--direction', opt_ids[0] if opt_ids else 'fold', '--why', why, cwd=proj)
md = open(os.path.join(pout, 'DIRECTION.md'), encoding='utf-8').read() if os.path.isfile(os.path.join(pout, 'DIRECTION.md')) else ''
dealt = open(os.path.join(proj, 'src', 'dealt.ts'), encoding='utf-8').read() if os.path.isfile(os.path.join(proj, 'src', 'dealt.ts')) else ''
result(r.returncode == 0 and f'**Picked** `{opt_ids[0] if opt_ids else ""}`' in md and why in md and '"ground"' in dealt and '**Type.** the `' in md,
       'a template project: the pick deals the sheet, its reason heads DIRECTION.md, the type pairing is dealt', (r.stderr or '')[-160:])
# a template that plays no creative element (its deal.ts imports none from fx/creative, as the update template's) says so
nop = tempfile.mkdtemp(dir=TMP)
os.makedirs(os.path.join(nop, 'src'))
with open(os.path.join(nop, 'src', 'deal.ts'), 'w', encoding='utf-8') as fh:
    fh.write("import { DEALT } from './dealt';\nexport const FLOOR = { ground: 'blackField' };\n")
result(deck.template_plays_creative(proj) and not deck.template_plays_creative(nop) and deck.template_plays_creative(tempfile.mkdtemp(dir=TMP))
       and '## The creative elements: not played' in deck.CREATIVE_NOT_PLAYED and '## The creative elements (dealt' in md,
       'a template whose deal.ts plays no fx/creative element gets "not played" for the creative section; launch-simple and the bare starter play them')
# the eleven ground families are all dealable
fams = {f['id'] for f in DATA['ground_families']['families']}
result(fams >= {'nearWhite', 'lightStudio', 'softSky', 'gradientField', 'whiteBand', 'blackField', 'studio', 'deepPool', 'duskMesh', 'floorGlow', 'lightDark'},
       'the deck deals all eleven ground families of fx/Grounds', ','.join(sorted(fams)))
# the type pairing: from scripts/faces.json pairs, never the last two films' pairings
pairs = [x['id'] for x in (deck._face_set() or {}).get('pairs', [])]
dealt_pairs = [deck.deal_pair(f'film {i}', 'fold', recent=pairs[:2])['id'] for i in range(30)] if pairs else []
result(len(pairs) >= 11 and dealt_pairs and not set(dealt_pairs) & set(pairs[:2]) and len(set(dealt_pairs)) >= 5,
       'the type pairing comes from faces.json pairs at random, never the last two films\' pairings', f'{sorted(set(dealt_pairs))}')
# photo devices only with five pictures or more; the deal leans toward the devices that tell the direction's story
lib = deck.creative_library()
few = deck.deal_creative(lib, 'x', 'a photo album app', ['photos'], photos=3)
many = [deck.deal_creative(lib, f'album {i}', 'a photo album app', ['photos'], photos=8) for i in range(40)]
result(few and 'photo-arc' not in few['deal'] + few['reserve'][:0] and all('photo-arc' not in deck.deal_creative(lib, f'a{i}', 'a photo album app', ['photos'], photos=3)['deal'] for i in range(40))
       and any('photo-arc' in c['deal'] for c in many),
       'photo devices are dealt only with five photos or more', f"{sum('photo-arc' in c['deal'] for c in many)} of 40 with 8 photos")
turn = dict(BY_ID[next(iter(BY_ID))], story={'shape': 'problem-turn', 'line': 'x'})
fit_n = sum(1 for i in range(60) if set(deck.deal_creative(lib, f'f{i}', 'a ledger', ['ui'], direction=turn)['deal']) & set(deck.CREATIVE_FIT['problem-turn']))
base_n = sum(1 for i in range(60) if set(deck.deal_creative(lib, f'f{i}', 'a ledger', ['ui'])['deal']) & set(deck.CREATIVE_FIT['problem-turn']))
result(fit_n > base_n, 'the creative deal leans toward the devices that tell the picked direction\'s story shape', f'{fit_n} vs {base_n} of 60')

print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
