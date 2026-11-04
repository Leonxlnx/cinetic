#!/usr/bin/env python3
"""detail-pair.test.py: the detail pass's measures and its outputs.

  1. --self-test: on synthetic frames, the same frame shows no difference; a softer frame, a reference smeared along
     x, a card leaning 9 degrees, a gradient ground against a flat one and a halo on a dark ground are each found; the
     auto regions land where the frames differ; the sheet stacks the whole frames over the 2x regions.
  2. End to end on two images and on two folders: the sheet and the JSON are written, a crop is measured as a region,
     a flat ground against a tilted wash is a ground finding, and --pairs reads F:R and F with --ref-offset.
  3. --help answers without numpy or opencv; no film or no pairs is exit 2.
Needs numpy and opencv-python in the Python that runs it (scripts/py.mjs --which); without them it says so and passes.

Usage (from the skill root):  python3 scripts/test/detail-pair.test.py [--verbose]
Exit codes: 0 all pass (or skipped), 1 a test failed.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..', '..'))
DP = os.path.join(SKILL, 'scripts', 'detail-pair.py')
VERBOSE = '--verbose' in sys.argv
failed = 0


def result(ok, name, detail=''):
    global failed
    failed += 0 if ok else 1
    print(f'{"pass" if ok else "FAIL"}  {name}{"  (" + detail + ")" if detail and (not ok or VERBOSE) else ""}')


def run(args):
    env = {**os.environ, 'PYTHONUTF8': '1'}
    return subprocess.run([sys.executable, DP, *args], capture_output=True, text=True, encoding='utf-8', env=env)


r = run(['--help'])
result(r.returncode == 0 and 'detail pass' in r.stdout, '--help answers (before numpy and opencv load)', (r.stderr or '')[-200:])
try:
    import cv2
    import numpy as np
except ImportError:
    print(f'skip  the measures: {sys.executable} has no numpy/opencv (set PYTHON to an environment with scripts/requirements.txt)')
    print('detail-pair tests: all pass' if not failed else f'detail-pair tests: {failed} failed')
    sys.exit(1 if failed else 0)

# 1. the measures on synthetic frames
r = run(['--self-test'])
lines = [l for l in r.stdout.splitlines() if l.startswith(('pass', 'FAIL'))]
for l in lines:
    result(l.startswith('pass'), 'self-test: ' + l.split('  ', 1)[-1].strip())
result(r.returncode == 0 and len(lines) >= 8, 'the self-test ran every case', (r.stderr or r.stdout)[-300:])

# 2. end to end
tmp = tempfile.mkdtemp(prefix='cinetic-detail-')
w, h = 960, 540
flat = np.full((h, w, 3), 236, np.uint8)
cv2.rectangle(flat, (300, 160), (660, 380), (52, 48, 44), -1)
for k in range(5):
    cv2.line(flat, (340, 210 + 30 * k), (340 + 60 * (k + 2), 210 + 30 * k), (236, 232, 230), 6)
t = np.linspace(0, 1, h)[:, None, None] ** 1.7
washed = (236 * (1 - t) + np.array([230, 160, 120]) * t).astype(np.uint8).repeat(w, 1)  # BGR: a tint gathering at the bottom
washed[160:381, 300:661] = flat[160:381, 300:661]
fa, fb = os.path.join(tmp, 'film.png'), os.path.join(tmp, 'ref.png')
cv2.imwrite(fa, flat)
cv2.imwrite(fb, washed)
out = os.path.join(tmp, 'out')
r = run(['--film', fa, '--ref', fb, '--pairs', '0:0', '--crops', '300,160,360,220', '--auto', '1', '--out', out])
js = os.path.join(out, 'detail.json')
rep = json.load(open(js, encoding='utf-8')) if os.path.exists(js) else {}
sheet = os.path.join(out, 'pair-f0.png')
result(r.returncode == 0 and os.path.exists(sheet) and rep.get('pairs'), 'an image pair: the sheet and the JSON are written', (r.stderr or r.stdout)[-300:])
kinds = {(f['region'].split(' (')[0], f['kind']) for f in rep.get('findings', [])}
result(('frame', 'ground') in kinds, 'a flat ground against a tilted wash is a ground finding', str(sorted(kinds)))
regs = rep.get('pairs', [{}])[0].get('regions', [])
result(len(regs) == 2 and list(regs[0]) == [300, 160, 360, 220], 'the crop is measured as region 1, the auto cell as region 2', str(regs))
img = cv2.imread(sheet) if os.path.exists(sheet) else None
result(img is not None and img.shape[1] >= 1900 and img.shape[0] > 540 + 2 * 220, 'the sheet: the frames side by side, the regions below at 2x', str(None if img is None else img.shape))
da, db = os.path.join(tmp, 'fa'), os.path.join(tmp, 'fb')
os.makedirs(da)
os.makedirs(db)
for i in range(3):
    cv2.imwrite(os.path.join(da, f'{i:03d}.png'), flat)
    cv2.imwrite(os.path.join(db, f'{i:03d}.png'), washed if i == 2 else flat)
r = run(['--film', da, '--ref', db, '--pairs', '0', '--ref-offset', '2', '--auto', '0', '--out', os.path.join(tmp, 'o2')])
rep = json.load(open(os.path.join(tmp, 'o2', 'detail.json'), encoding='utf-8')) if r.returncode == 0 else {}
result(r.returncode == 0 and rep['pairs'][0]['ref'] == 2 and any(f['kind'] == 'ground' for f in rep['findings']), 'folders: F alone pairs with F + --ref-offset (frame 0 with image 2)', (r.stderr or '')[-200:])

# 3. bad input
r = run(['--ref', fb, '--pairs', '0:0'])
result(r.returncode == 2, 'no film: exit 2')
r = run(['--film', fa, '--ref', fb, '--pairs', ''])
result(r.returncode == 2, 'no pairs: exit 2')

print('detail-pair tests: all pass' if not failed else f'detail-pair tests: {failed} failed')
sys.exit(1 if failed else 0)
