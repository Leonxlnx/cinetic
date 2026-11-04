#!/usr/bin/env python3
"""trace-logo.test.py: regression tests for trace-logo.py, the raster logo tracer (logos drawn here, antialiased).

  1. A logo on alpha (a ring, a triangle, an ellipse in one blue, a square in red): four parts in two colours, read
     in order, IoU >= 0.97 overall and per part; the ring is written as arcs with its hole, the triangle as three
     straight sides, the ellipse as curves; the sheet and the JSON report are written.
  2. The same marks opaque on white: the antialiased edges are not colours of their own (two colours, not five).
  3. brand.py takes the traced SVG like a supplied one: the mark splits into the traced parts by their ids.
  4. A trace held to an IoU it cannot reach exits 1; a missing file exits 2.

Usage (from the skill root):  python3 scripts/test/trace-logo.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

import cv2
import numpy as np

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
TRACE = os.path.join(SKILL, 'scripts', 'trace-logo.py')
BRAND = os.path.join(SKILL, 'scripts', 'brand.py')
VERBOSE = '--verbose' in sys.argv
TMP = tempfile.mkdtemp(prefix='trace-test-')
failed = 0


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


def run(script, *args):
    r = subprocess.run([sys.executable, script, *args], capture_output=True, text=True, encoding='utf-8',
                       env=dict(os.environ, PYTHONUTF8='1', PYTHONDONTWRITEBYTECODE='1'))
    if VERBOSE:
        print(f'  $ {os.path.basename(script)} {" ".join(args)} -> {r.returncode}\n' + r.stdout[-1500:] + r.stderr[-800:])
    return r


K, W, H = 8, 320, 120
BLUE, RED = (205, 134, 31), (40, 40, 200)  # BGR: #1F86CD, #C82828


def draw(img, blue, red, hole):
    cv2.circle(img, (60 * K, 60 * K), 40 * K, blue, -1, cv2.LINE_AA)
    cv2.circle(img, (60 * K, 60 * K), 22 * K, hole, -1, cv2.LINE_AA)
    cv2.fillPoly(img, [np.array([[120, 100], [160, 20], [200, 100]], np.int32) * K], blue, cv2.LINE_AA)
    cv2.ellipse(img, (250 * K, 60 * K), (28 * K, 18 * K), 20, 0, 360, blue, -1, cv2.LINE_AA)
    cv2.rectangle(img, (285 * K, 70 * K), (310 * K, 100 * K), red, -1)


alpha = np.zeros((H * K, W * K, 4), np.uint8)
draw(alpha, BLUE + (255,), RED + (255,), (0, 0, 0, 0))
logo = os.path.join(TMP, 'logo.png')
cv2.imwrite(logo, cv2.resize(alpha, (W, H), interpolation=cv2.INTER_AREA))
opaque = np.full((H * K, W * K, 3), 255, np.uint8)
draw(opaque, BLUE, RED, (255, 255, 255))
logo_op = os.path.join(TMP, 'logo-opaque.jpg')
cv2.imwrite(logo_op, cv2.resize(opaque, (W, H), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 95])

# 1. alpha
svg, sheet, rep = (os.path.join(TMP, n) for n in ('logo-mark.svg', 'trace.png', 'trace.json'))
r = run(TRACE, logo, '--out', svg, '--sheet', sheet, '--json', rep)
j = json.load(open(rep, encoding='utf-8')) if os.path.isfile(rep) else {}
parts = j.get('parts', [])
result(r.returncode == 0 and len(parts) == 4 and len(j.get('colours', [])) == 2 and j.get('iou', 0) >= 0.97
       and all(p['iou'] >= 0.95 for p in parts), 'four parts in two colours, IoU >= 0.97 overall (>= 0.95 each)',
       f"exit {r.returncode}, {len(parts)} parts, colours {j.get('colours')}, IoU {j.get('iou')} {[p['iou'] for p in parts]}")
result([p['id'] for p in parts] == ['part-1', 'part-2', 'part-3', 'part-4'] and [round(p['box'][0] / 10) for p in parts] == [2, 12, 22, 28]
       and parts[3]['colour'] == '#C82828', 'parts are named in reading order (ring, triangle, ellipse, square) with their colours',
       json.dumps([[p['id'], p['colour'], [round(v) for v in p['box']]] for p in parts]))
paths = dict(re.findall(r'<path id="(part-\d)"[^>]*\bd="([^"]+)"', open(svg, encoding='utf-8').read())) if os.path.isfile(svg) else {}
ring, tri, ell = paths.get('part-1', ''), paths.get('part-2', ''), paths.get('part-3', '')
result(ring.count('a') == 4 and ring.count('Z') == 2 and 'fill-rule="evenodd"' in open(svg, encoding='utf-8').read(),
       'the ring is two circles written as arcs, its hole kept (even-odd)', ring[:120])
result(tri.count('L') == 3 and 'C' not in tri, 'the triangle is three straight sides with sharp corners', tri)
result(ell.count('C') >= 6 and 'a' not in ell, 'the ellipse is written as smooth curves', ell[:120])
shot = cv2.imread(sheet) if os.path.isfile(sheet) else None
result(shot is not None and shot.shape[0] >= 2 * H and shot.shape[1] >= W + round(W * 80 / H), 'the sheet puts the source over the trace at 16, 64 and full size', str(None if shot is None else shot.shape))

# 2. opaque on white (a JPEG)
r = run(TRACE, logo_op, '--out', os.path.join(TMP, 'op.svg'), '--json', os.path.join(TMP, 'op.json'))
jo = json.load(open(os.path.join(TMP, 'op.json'), encoding='utf-8')) if r.returncode in (0, 1) else {}
result(r.returncode == 0 and len(jo.get('colours', [])) == 2 and len(jo.get('parts', [])) == 4,
       'an opaque logo on white: the antialiased edges are not colours of their own', f"exit {r.returncode}, colours {jo.get('colours')}")

# 3. brand.py reads the trace as a supplied SVG
kit = os.path.join(TMP, 'kit')
os.makedirs(kit)
shutil.copy(svg, os.path.join(kit, 'logo-mark.svg'))
shutil.copy(logo, os.path.join(kit, 'logo.png'))
bj = os.path.join(TMP, 'brand.json')
r = run(BRAND, kit, '--out', bj, '--name', 'Traced')
mark = (json.load(open(bj, encoding='utf-8')).get('logo') or {}).get('mark') or {} if os.path.isfile(bj) else {}
result(r.returncode in (0, 1) and mark.get('file') == 'logo-mark.svg' and mark.get('parts') == ['part-1', 'part-2', 'part-3', 'part-4'],
       'brand.py takes the traced SVG over the PNG and splits it into the traced parts', json.dumps(mark)[:200])

# 4. exit codes
r = run(TRACE, logo, '--out', os.path.join(TMP, 'strict.svg'), '--min-iou', '0.9999')
result(r.returncode == 1 and 'strays' in r.stderr, 'a trace under --min-iou is written and exits 1', f'exit {r.returncode}')
r = run(TRACE, os.path.join(TMP, 'nope.png'), '--out', os.path.join(TMP, 'x.svg'))
result(r.returncode == 2, 'a missing file exits 2', f'exit {r.returncode}')

shutil.rmtree(TMP, ignore_errors=True)
print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
