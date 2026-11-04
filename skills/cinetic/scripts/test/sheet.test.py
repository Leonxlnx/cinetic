#!/usr/bin/env python3
"""sheet.test.py: sheet.py and forensics.py on a Python without opencv.

  1. sheet.py --images tiles two pictures with cv2 blocked: Pillow draws the labelled tiles (or, with no Pillow either,
     it stops with exit 2 and names the install).
  2. sheet.py on a short clip made by ffmpeg (lavfi) with cv2 blocked: frames decoded, labelled and tiled.
  3. forensics.py with cv2 blocked stops at once (exit 2) and names the install line, never a traceback.
  4. With opencv present, the inferno fallback stays close to opencv's own map (mean error under 12 code values).

Usage (from the skill root): python3 scripts/test/sheet.test.py
Exit codes: 0 all pass, 1 a test failed.
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(HERE)
sys.dont_write_bytecode = True

# run a script with `import cv2` failing, as on a Python that never had opencv
BLOCK = ("import sys, runpy\n"
         "class _B:\n"
         "    def find_spec(self, name, path=None, target=None):\n"
         "        if name == 'cv2' or name.startswith('cv2.'):\n"
         "            raise ModuleNotFoundError(\"No module named 'cv2'\", name='cv2')\n"
         "sys.meta_path.insert(0, _B())\n"
         "sys.argv = sys.argv[1:]\n"
         "runpy.run_path(sys.argv[0], run_name='__main__')\n")

failed = 0


def result(ok, what, detail=''):
    global failed
    failed += not ok
    print(f"{'pass' if ok else 'FAIL'}  {what}" + (f'  ({detail})' if detail else ''))


def run_blocked(script, *args):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONUTF8='1')
    return subprocess.run([sys.executable, '-c', BLOCK, os.path.join(SCRIPTS, script), *args],
                          capture_output=True, text=True, env=env, timeout=300)


def have(mod):
    try:
        __import__(mod)
        return True
    except ImportError:
        return False


PIL_OK = have('PIL')
tmp = tempfile.mkdtemp(prefix='cinetic-sheet-')

# 1. --images
if PIL_OK:
    from PIL import Image
    for k, c in enumerate([(20, 120, 110), (230, 236, 240)]):
        Image.new('RGB', (320, 180), c).save(os.path.join(tmp, f'still_{k}.png'))
    out = os.path.join(tmp, 'stills.png')
    r = run_blocked('sheet.py', '--images', os.path.join(tmp, 'still_0.png'), os.path.join(tmp, 'still_1.png'),
                    '--width', '240', '--out', out)
    ok = r.returncode == 0 and os.path.exists(out)
    detail = (r.stderr or r.stdout).strip().splitlines()[-1:] if not ok else ''
    if ok:
        im = Image.open(out).convert('RGB')
        px = im.getpixel((6, 6))  # inside the first tile's label bar: dark, the label drawn
        ok = im.size[0] > 480 and max(px) < 80
        detail = f'{im.size}, label bar {px}'
    result(ok, 'sheet.py --images tiles labelled pictures without opencv (Pillow)', detail)
else:
    r = run_blocked('sheet.py', '--images', os.path.join(tmp, 'none.png'), '--out', os.path.join(tmp, 's.png'))
    result(r.returncode == 2 and 'pip install' in r.stderr, 'sheet.py without opencv or Pillow names the install', r.stderr.strip()[-120:])

# 2. a clip
clip = os.path.join(tmp, 'clip.mp4')
ff = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=2',
                     '-pix_fmt', 'yuv420p', clip], capture_output=True, text=True)
if ff.returncode != 0:
    print('skip  sheet.py on a clip: ffmpeg could not make one')
elif PIL_OK:
    out = os.path.join(tmp, 'clip.png')
    r = run_blocked('sheet.py', clip, '--every', '15', '--width', '160', '--diff', '--out', out)
    ok = r.returncode == 0 and os.path.exists(out)
    result(ok, 'sheet.py samples, labels and diffs a clip without opencv', (r.stderr or r.stdout).strip()[-160:] if not ok else r.stdout.strip()[-80:])

# 3. forensics names the install
r = run_blocked('forensics.py', clip if os.path.exists(clip) else 'x.mp4')
result(r.returncode == 2 and 'opencv' in r.stderr and 'pip install' in r.stderr and 'Traceback' not in r.stderr,
       'forensics.py without opencv stops with the install line', r.stderr.strip()[-160:])

# 4. the inferno ramp against opencv's
if have('cv2'):
    import numpy as np
    import cv2
    sys.path.insert(0, SCRIPTS)
    import forensics as F
    d = np.arange(256, dtype=np.uint8).reshape(16, 16)
    ref = cv2.applyColorMap(d, cv2.COLORMAP_INFERNO).astype(float)
    F.cv2 = None
    mine = F.inferno(d).astype(float)
    err = float(np.abs(ref - mine).mean())
    result(err < 12, 'the inferno fallback follows opencv\'s map', f'mean error {err:.1f}')
else:
    print('skip  the inferno fallback against opencv: no opencv here')

shutil.rmtree(tmp, ignore_errors=True)
print('sheet tests: ' + ('all pass' if not failed else f'{failed} failed'))
sys.exit(1 if failed else 0)
