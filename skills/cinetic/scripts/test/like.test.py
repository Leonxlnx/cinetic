#!/usr/bin/env python3
"""like.test.py: regression tests for like.py, the clip match ("make it feel like this clip").

The clips are made here in code (numpy frames piped to ffmpeg, a WAV of clicks muxed in):
  clip      8 s at 30 fps: six shots of known lengths (median 1.4 s) cut hard on a click, each a block that
            arrives front-loaded and a line of text, on its own ground
  own       the same timing and the same habits, its own layouts, colours and words: a film that borrows grammar
  regraded  the clip with its colours shifted and its picture moved and scaled a little: a recreation
  inverted  the clip in inverted colours: the same layouts in other colours, a recreation

  1. measure writes out/like.json (grammar-score.mjs --target format) and out/LIKE.md: the shot band around the
     clip's median, the cuts it found, cut-on-sound, front-loaded moves, text share, hard hand-overs; no hues.
  2. grammar-score.mjs reads like.json as its target (the shot band is the clip's for every format).
  3. guard: the borrowing film passes; the regraded and the inverted clip and the clip itself fail, with a sheet.
  4. LIKE.md carries the rules (borrow grammar, never content) in house wording.

Usage (from the skill root):  python3 scripts/test/like.test.py [--verbose] [--keep]
Exit codes: 0 all pass, 1 a test failed, 2 a missing tool (ffmpeg, numpy, opencv-python).
"""
import json
import math
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
LIKE = os.path.join(SKILL, 'scripts', 'like.py')
GS = os.path.join(SKILL, 'scripts', 'grammar-score.mjs')
VERBOSE = '--verbose' in sys.argv
TMP = tempfile.mkdtemp(prefix='like-test-')
failed = 0
try:
    import numpy as np
    import cv2
except ImportError as e:
    print(f'like.test.py: needs numpy and opencv-python ({e})')
    sys.exit(2)
if not shutil.which('ffmpeg'):
    print('like.test.py: needs ffmpeg on PATH')
    sys.exit(2)

W, H, FPS = 480, 270, 30
CUTS = [0, 1.2, 2.0, 3.6, 4.4, 6.0, 8.0]  # shots 1.2, 0.8, 1.6, 0.8, 1.6, 2.0 s: median 1.4
GROUNDS = [(28, 44, 58), (196, 204, 210), (40, 60, 52), (210, 214, 200), (52, 40, 60), (205, 210, 216)]  # light and dark in turn
WORDS = ['FAST SYNC', 'NEW', 'SHARED FOLDERS', 'OFFLINE', 'ONE TAP', 'VERSION 2']


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


def run(*args, cwd=TMP):
    r = subprocess.run([sys.executable, LIKE, *args], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd,
                       env=dict(os.environ, PYTHONUTF8='1', PYTHONDONTWRITEBYTECODE='1'))
    if VERBOSE:
        print(f'  $ like.py {" ".join(args)} -> {r.returncode}\n' + r.stdout[-1500:] + r.stderr[-1500:])
    return r


def ease_out(t):
    return 1 - (1 - min(1.0, max(0.0, t))) ** 4


def frame(k, variant):
    """Frame k of a clip variant: 'clip', 'own', 'regraded' or 'inverted'."""
    t = k / FPS
    s = max(i for i in range(len(CUTS) - 1) if CUTS[i] <= t)
    u = (t - CUTS[s]) / (CUTS[s + 1] - CUTS[s])
    own = variant == 'own'
    g = GROUNDS[(s + 3) % 6] if own else GROUNDS[s]
    img = np.zeros((H, W, 3), np.uint8)
    img[:] = g
    dark = sum(g) < 380
    ink = (236, 240, 244) if dark else (24, 28, 32)
    # the block arrives front-loaded (its speed peaks in the first frames of the move) and holds
    p = ease_out(u / 0.55)
    if own:  # its own layout: the block drops from the top on the right, the words sit high on the left
        bw, bh = 150, 120
        x0, y0 = W - bw - 40, int(-bh + p * (bh + 70))
        tx, ty = 30, 60
    else:
        bw, bh = 200, 90
        x0, y0 = int(-bw + p * (bw + 60 + 40 * s)), 150
        tx, ty = 40, 110
    acc = (60, 170, 120) if own else (40, 120, 220)
    cv2.rectangle(img, (x0, y0), (x0 + bw, y0 + bh), acc, -1)
    cv2.rectangle(img, (x0 + 14, y0 + 16), (x0 + bw - 30, y0 + 30), ink, -1)
    word = WORDS[(s + 2) % 6] if own else WORDS[s]
    cv2.putText(img, word, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 1.1 if not own else 0.9, ink, 3, cv2.LINE_AA)
    if variant == 'regraded':
        img = cv2.warpAffine(img, np.float32([[1.03, 0, -6], [0, 1.03, -4]]), (W, H), borderMode=cv2.BORDER_REPLICATE)
        img = np.clip(img.astype(np.int16) + np.array([18, -6, -14]), 0, 255).astype(np.uint8)
    elif variant == 'inverted':
        img = 255 - img
    return img


def write_clip(path, variant):
    wav = path + '.wav'
    sr, n = 48000, int(CUTS[-1] * 48000)
    x = np.zeros(n, np.float32)
    for c in CUTS[1:-1]:  # a click on every cut
        i = int(c * sr)
        x[i:i + 480] += np.hanning(480).astype(np.float32) * np.sin(np.arange(480) * 0.6).astype(np.float32) * 0.8
    for k in range(int(CUTS[-1] * 2)):  # a soft beat at 120 BPM under it
        i = int(k * 0.5 * sr) + 9
        L = 2400
        if i + L < n:
            x[i:i + L] += 0.35 * np.exp(-np.arange(L) / 500).astype(np.float32) * np.sin(2 * math.pi * 60 * np.arange(L) / sr).astype(np.float32)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for k in range(int(CUTS[-1] * FPS)):
        p.stdin.write(frame(k, variant).tobytes())
    p.stdin.close()
    p.wait()
    os.remove(wav)
    return p.returncode == 0 and os.path.isfile(path)


clips = {v: os.path.join(TMP, f'{v}.mp4') for v in ('clip', 'own', 'regraded', 'inverted')}
made = all(write_clip(p, v) for v, p in clips.items())
result(made, 'the four code-made clips are written')

# 1. measure ---------------------------------------------------------------------------------------------
out = os.path.join(TMP, 'out')
r = run('measure', clips['clip'], '--out', out)
like = json.load(open(os.path.join(out, 'like.json'), encoding='utf-8')) if r.returncode == 0 else {}
L = like.get('like', {})
sh = L.get('shots', {})
result(r.returncode == 0 and sh.get('count') == 6 and abs((sh.get('median_s') or 0) - 1.4) <= 0.15,
       'measure finds the six shots and their median length', f'{sh}; {r.stderr[-300:]}')
band = (like.get('shot') or {}).get('band', {})
result(set(band) >= {'launch', 'update'} and band['launch'][0] <= 1.4 <= band['launch'][1],
       'like.json carries a shot band around the clip\'s median for every format', json.dumps(band)[:120])
cs = L.get('cut_on_sound') or {}
result((cs.get('within_100ms') or 0) >= 0.8, 'cuts that land on a click count as cuts on a sound', json.dumps(cs))
fam = (L.get('moves') or {}).get('families') or {}
result(fam and fam.get('front', 0) >= max(fam.get('symmetric', 0), fam.get('back', 0)),
       'the main moves read as front-loaded (arrive curves)', json.dumps(L.get('moves')))
tr = L.get('transitions') or {}
result(tr.get('hard', 0) >= 4 and tr.get('soft', 0) == 0, 'the hand-overs read as hard cuts', json.dumps(tr))
ty = L.get('type') or {}
result((ty.get('text_share') or 0) >= 0.5 and 0.03 <= (ty.get('line_height_median') or 0) <= 0.3, 'text share and line height are measured', json.dumps(ty))
te = L.get('tempo') or {}
result(te.get('bpm') is None or 110 <= te['bpm'] <= 130 or 55 <= te['bpm'] <= 65, 'the tempo is the 120 BPM beat under the clip (or its half)', json.dumps(te))
pal = L.get('palette') or {}
result(pal.get('hues', '').startswith('not recorded') and not re.search(r'#[0-9A-Fa-f]{6}', json.dumps(like)),
       'like.json records proportions and ground tones, never the clip\'s colours')

# 2. grammar-score reads it ------------------------------------------------------------------------------
gs = subprocess.run(['node', GS, '--target', os.path.join(out, 'like.json'), '--look', os.path.join(out, 'like-look.json'), '--format', 'update',
                     '--json', os.path.join(TMP, 'gs.json'), '--quiet'], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=SKILL)
try:
    g = json.load(open(os.path.join(TMP, 'gs.json'), encoding='utf-8'))
    g = g['runs'][-1] if isinstance(g, dict) and g.get('runs') else g
    shots = next((d for d in g.get('dims', []) if d['name'] == 'shots'), {})
except (OSError, ValueError, StopIteration):
    g, shots = {}, {}
result(gs.returncode in (0, 1) and (shots.get('value') or {}).get('band') == band.get('update'),
       'grammar-score.mjs --target like.json scores the shots against the clip\'s band', f'{gs.returncode}; {(gs.stderr or gs.stdout)[-200:]}')
result(shots.get('score') == 100, 'the clip scores 100 on its own shot grammar', json.dumps(shots)[:160])

# 3. guard -----------------------------------------------------------------------------------------------
rows = {}
for v in ('own', 'regraded', 'inverted', 'clip'):
    jp = os.path.join(TMP, f'guard-{v}.json')
    r = run('guard', '--film', clips[v], '--clip', clips['clip'], '--json', jp, '--sheet', os.path.join(TMP, f'guard-{v}.png'))
    rows[v] = (r.returncode, json.load(open(jp, encoding='utf-8')) if os.path.isfile(jp) else {})
o = rows['own'][1]
result(rows['own'][0] == 0 and o.get('pass') and o.get('recreations') == 0, 'a film that borrows the grammar with its own layouts passes the guard',
       f"share {o.get('share')}, overlap median {o.get('layout_overlap_median')}")
result(rows['regraded'][0] == 1 and not rows['regraded'][1].get('pass'), 'the clip regraded and moved a little reads as a recreation',
       f"share {rows['regraded'][1].get('share')}")
result(rows['inverted'][0] == 1 and not rows['inverted'][1].get('pass'), 'the same layouts in other colours read as a recreation',
       f"share {rows['inverted'][1].get('share')}")
result(rows['clip'][0] == 1 and rows['clip'][1].get('share') == 1.0, 'the clip against itself is a recreation in every frame')
result(os.path.isfile(os.path.join(TMP, 'guard-regraded.png')), 'the guard writes a paired contact sheet')

# 4. LIKE.md ---------------------------------------------------------------------------------------------
md = open(os.path.join(out, 'LIKE.md'), encoding='utf-8').read() if os.path.isfile(os.path.join(out, 'LIKE.md')) else ''
result('Never content' in md and 'own idea sentence' in md and 'like.py guard' in md and '--target out/like.json' in md,
       'LIKE.md states the rules, the guard and the score against the clip')
pats = [r'reference[ ](films?|clips?|videos?)', r'\bT[0-9]{2}\b', r'\blearned[ ]from\b', r'\bwe[ ](analy[sz]ed|measured)\b', r'\bstud(y|ied)\b']
leaks = [m.group(0) for t in (md, open(LIKE, encoding='utf-8').read()) for p in pats for m in [re.search(p, t, re.I)] if m]
result(not leaks, 'like.py and LIKE.md carry no provenance phrasing', ', '.join(leaks))

if '--keep' not in sys.argv:
    shutil.rmtree(TMP, ignore_errors=True)
else:
    print(f'kept {TMP}')
print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
