#!/usr/bin/env python3
"""fit.test.py: track.py fit, the music edit fitted to the film's beat plan (an analysis made in code, no audio).

  1. plan_edit with the cuts: a level step of 6 dB or more lands only on a bar that carries a cut; without them the
     same anchors may step mid-shot. The reveal holds the track's entry either way.
  2. end_hold: the tail an ending asks for (its own ring clipped to 1.5-2.5 s, a hit's 1.8 s, a fade's length).
  3. fit on a launch-simple project (tsx from the starter): the timeline is read at the track's tempo, the edit plays
     exactly the film's bars (BARS read again with the final src/music.ts), the track's entry lands on the bar where
     the end act opens (the lockup's), the ending is a hit and never a fade unless asked, and edit.json records the
     fit (`track.py music` fits again from it).
  4. --end fade is honoured when asked; a timeline that does not import leaves src/music.ts as it was.

Usage (from the skill root): python3 scripts/test/fit.test.py
Exit codes: 0 all pass, 1 a test failed (or no tsx: npm install in assets/remotion-starter).
"""
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
TRACK = os.path.join(SKILL, 'scripts', 'audio', 'track.py')
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(SKILL, 'scripts', 'audio'))
spec = importlib.util.spec_from_file_location('track', TRACK)
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
failed = 0


def check(ok, what, detail=''):
    global failed
    failed += not ok
    print(f"{'pass' if ok else 'FAIL'}  {what}" + (f'  ({detail})' if detail else ''))


def analysis(nb=40, bpm=120.0, entry=17, ending='ring', lift=3.0):
    """a track: a quiet intro (bars 1..entry-1 at -14 dB, a lift at bar 9 by `lift` dB), the body from the entry (-5), an outro"""
    beat = 60.0 / bpm
    t = [0.5 + 4 * beat * i for i in range(nb)]
    lufs = [(-14.0 if i + 1 < 9 else -14.0 + lift) if i + 1 < entry else (-5.0 if i + 1 <= nb - 4 else -8.0) for i in range(nb)]
    feat = [[(i % 4) * 0.1, 0.2 if i + 1 < entry else 0.6, 0.1 * ((i // 8) % 2), 0.3] for i in range(nb)]
    secs = [dict(**{'from': 1}, to=entry - 1, key='A minor', label='intro', lufs=-14.0, level=0),
            dict(**{'from': entry}, to=nb - 4, key='A minor', label='peak', lufs=-5.0, level=2),
            dict(**{'from': nb - 3}, to=nb, key='A minor', label='outro', lufs=-8.0, level=1)]
    return dict(file='bed.wav', sha256=None, seconds=t[-1] + 4 * beat + 6.0,
                tempo=dict(bpm=bpm, beat_s=beat), grid=dict(downbeat_confidence=0.95, phase=0, phase_set=False, t0=t[0]),
                bars=[dict(t=t[i], lufs=lufs[i], feat=feat[i]) for i in range(nb)],
                phrases=dict(len=8, starts=[1 + 8 * k for k in range(nb // 8 + 1)]), sections=secs,
                entries=[dict(bar=entry, t=t[entry - 1], drop=True, jump_db=9.0), dict(bar=9, t=t[8], drop=False, jump_db=3.0)],
                accents=[], breaks=[], stops=[], key=dict(name='A minor', r=0.8),
                ending=dict(kind=ending, last_hit_t=t[-1], ring_out_s=3.2, final_bar=nb), analysis=dict(profile='crisp'))


# 1. plan_edit with and without the cuts: a lift of 8 dB at source bar 9 falls on film bar 6 in the natural run to the
# reveal, inside a shot (the cuts are on 3, 7, 10 and 14)
a = analysis(lift=8.0)
lufs = [b['lufs'] for b in a['bars']]
cuts = {3, 7, 10, 14}


def mid_steps(path, cut_bars):
    return [k + 1 for k in range(1, len(path)) if (k + 1) not in cut_bars and abs(lufs[path[k]] - lufs[path[k - 1]]) >= 6.0]


p_cut, info = T.plan_edit(a, 14, 14, 'hit', cuts=cuts)
p_free, _ = T.plan_edit(a, 14, 14, 'hit')
check(not mid_steps(p_cut, cuts) and p_cut[13] == 16, 'plan_edit with the cuts: no level step of 6 dB or more inside a shot; the reveal holds the entry',
      f'path {[j + 1 for j in p_cut]}')
check(p_free[13] == 16 and mid_steps(p_free, cuts), 'plan_edit without them lands the entry on the reveal but steps mid-shot', f'path {[j + 1 for j in p_free]}, mid-shot steps {mid_steps(p_free, cuts)}')

# 2. end_hold
check(T.end_hold(a, 'ring') == 2.5 and T.end_hold(a, 'hit') == T.HIT_RING_S and T.end_hold(a, 'fade', 2.5) == 2.5
      and T.end_hold(dict(a, ending=dict(a['ending'], ring_out_s=0.4)), 'button') == 1.5, 'end_hold: the tail each ending asks for')

# 3. fit on a launch-simple project
tsx = T.find_tsx(SKILL)
if not tsx:
    print('FAIL  tsx not found: npm install in assets/remotion-starter')
    sys.exit(1)
TPL = os.path.join(SKILL, 'assets', 'templates', 'launch-simple', 'src')
tmp = tempfile.mkdtemp(prefix='cinetic-fit-test-')
root = os.path.join(tmp, 'film')
os.makedirs(os.path.join(root, 'src', 'brand'))
os.makedirs(os.path.join(root, 'src', 'lib'))
os.makedirs(os.path.join(root, 'audio', 'music'))
for f in ('timeline.ts', 'launch.ts', 'deal.ts', 'dealt.ts', 'recent.ts'):
    shutil.copy(os.path.join(TPL, f), os.path.join(root, 'src', f))
shutil.copy(os.path.join(SKILL, 'assets', 'remotion-starter', 'src', 'lib', 'pace.ts'), os.path.join(root, 'src', 'lib', 'pace.ts'))
with open(os.path.join(root, 'src', 'brand', 'identity.ts'), 'w', encoding='utf-8') as fh:
    fh.write("export const IDENTITY = { name: 'Lantern', supplied: false } as const;\n")
with open(os.path.join(root, 'audio', 'music', 'bed.track.json'), 'w', encoding='utf-8') as fh:
    json.dump(analysis(nb=48, bpm=124.0), fh)
env = dict(os.environ, PYTHONUTF8='1', PYTHONDONTWRITEBYTECODE='1')


def fit(*args):
    return subprocess.run([sys.executable, TRACK, 'fit', *args], cwd=root, capture_output=True, text=True, encoding='utf-8', env=env, timeout=600)


def plan():
    return T.read_plan(root, tsx)


try:
    r = fit()
    e = json.load(open(os.path.join(root, 'audio', 'music', 'edit.json'), encoding='utf-8')) if r.returncode == 0 else {}
    p = plan() if r.returncode == 0 else {}
    down = p.get('downbeats') or []
    end_bar = 1 + sum(1 for d in down if d <= (p.get('end') or 0) + 0.5) - 1 if down else None
    check(r.returncode == 0 and e.get('film_bars') == round(p.get('bars') or -1), 'fit: the edit plays exactly the film\'s bars (BARS read again on the final grid)',
          f"exit {r.returncode}, edit {e.get('film_bars')}, timeline {p.get('bars')}: {(r.stderr or r.stdout)[-300:]}")
    check(e.get('reveal', {}).get('film_bar') == end_bar and e.get('reveal', {}).get('src_bar') == 17,
          "fit: the track's entry lands on the bar where the end act opens (the lockup's)", f"reveal {e.get('reveal')}, end act bar {end_bar}")
    check(e.get('ending', {}).get('mode') in ('ring', 'button', 'hit') and e.get('args', {}).get('fit') is True and isinstance(e.get('fit', {}).get('cuts'), list),
          'fit: the ending is a hit, never a fade unless asked; edit.json records the fit', f"ending {e.get('ending', {}).get('mode')}, fit {e.get('fit')}")
    # 4. --end fade, and a timeline that does not import
    r2 = fit('--end', 'fade')
    e2 = json.load(open(os.path.join(root, 'audio', 'music', 'edit.json'), encoding='utf-8')) if r2.returncode == 0 else {}
    check(r2.returncode == 0 and e2.get('ending', {}).get('mode') == 'fade' and e2.get('film_bars') == round(plan().get('bars') or -1),
          '--end fade is honoured when asked, the bars still equal', (r2.stderr or r2.stdout)[-200:])
    music_ts = pathlib.Path(root, 'src', 'music.ts')
    before = music_ts.read_text(encoding='utf-8')
    tl = pathlib.Path(root, 'src', 'timeline.ts')
    good = tl.read_text(encoding='utf-8')
    tl.write_text(good + "\nthrow new Error('broken on purpose');\n", encoding='utf-8')
    r3 = fit()
    check(r3.returncode != 0 and music_ts.read_text(encoding='utf-8') == before and 'did not import' in r3.stderr,
          'a timeline that does not import: fit stops and src/music.ts stays as it was', r3.stderr[-200:])
    tl.write_text(good, encoding='utf-8')
finally:
    shutil.rmtree(tmp, ignore_errors=True)

print('fit tests: ' + ('all pass' if not failed else f'{failed} failed'))
sys.exit(1 if failed else 0)
