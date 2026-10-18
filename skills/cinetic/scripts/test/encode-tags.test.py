#!/usr/bin/env python3
"""encode-tags.test.py: regression tests for the BT.709 tags of the encodes the scripts run.

  1. Every encode in scripts/ that writes -color_primaries bt709 also sets the four tags on its
     frames with setparams. ffmpeg 7.1 and newer take a file's colour tags from the frames, over
     -color_primaries and -color_trc, and scale (or a raw pipe) leaves primaries and transfer unset.
     Static: needs nothing.
  2. With ffmpeg (and numpy for accumulate.py): hf-finish.sh's encode filters and accumulate.py,
     8-bit and 10-bit, write bt709/bt709/bt709/tv on a few test frames. Skipped without them. On
     ffmpeg older than 7.1 these pass with or without setparams; 7.1 and newer are what they guard.

Usage (from the skill root):  python3 scripts/test/encode-tags.test.py [--verbose]
Exit codes: 0 all pass (or skipped), 1 a test failed.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.normpath(os.path.join(HERE, '..'))
VERBOSE = '--verbose' in sys.argv
SETPARAMS = 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv'
WANT = 'bt709/bt709/bt709/tv'
failed = 0


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if VERBOSE or r.returncode:
        print(f'  $ {" ".join(cmd)} -> {r.returncode}\n' + r.stderr[-600:])
    return r


def tags(path):
    """space/primaries/transfer/range of the first video stream, as probe.py reports them."""
    r = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
             'stream=color_space,color_primaries,color_transfer,color_range', '-of', 'json', path])
    s = json.loads(r.stdout or '{}').get('streams', [{}])[0]
    return '/'.join(str(s.get(k)) for k in ('color_space', 'color_primaries', 'color_transfer', 'color_range'))


# 1. static: one setparams per encode that writes the primaries tag
TAG_WRITE = re.compile(r"""-color_primaries['", ]+bt709""")
for path in sorted(glob.glob(os.path.join(SCRIPTS, '*.sh')) + glob.glob(os.path.join(SCRIPTS, '*.py'))):
    src = open(path, encoding='utf-8').read()
    writes, stamps = len(TAG_WRITE.findall(src)), src.count(SETPARAMS)
    if writes:
        result(stamps >= writes, f'{os.path.basename(path)}: setparams in every BT.709-tagged encode',
               f'{writes} encode(s), {stamps} setparams')

# 2. the encodes themselves, when ffmpeg is here
if not (shutil.which('ffmpeg') and shutil.which('ffprobe')):
    print('skip  encode checks: ffmpeg/ffprobe not on PATH')
    sys.exit(1 if failed else 0)
print('      ' + run(['ffmpeg', '-version']).stdout.splitlines()[0])
hf = open(os.path.join(SCRIPTS, 'hf-finish.sh'), encoding='utf-8').read()
vf = re.search(r'-vf "(scale=out_color_matrix=bt709[^"]*)"', hf)
result(vf is not None, "hf-finish.sh: found the PNG encode's -vf")

with tempfile.TemporaryDirectory() as tmp:
    frames = os.path.join(tmp, 'frame_%06d.png')  # like HyperFrames writes them
    run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30', '-frames:v', '4',
         '-start_number', '1', frames])
    if vf:  # the same arguments as hf-finish.sh's encode step, at a fast preset
        out = os.path.join(tmp, 'hf.mp4')
        r = run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-start_number', '1', '-i', frames,
                 '-vf', vf.group(1), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p',
                 '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', out])
        got = tags(out) if r.returncode == 0 else f'ffmpeg exit {r.returncode}'
        result(got == WANT, 'hf-finish.sh encode tags', got)
    try:
        import numpy  # noqa: F401  (accumulate.py needs it)
    except ImportError:
        print('skip  accumulate.py: numpy is not installed')
    else:
        # the frames as a lossless RGB video: accumulate.py reads image sequences by glob, which
        # some ffmpeg builds (Windows) do not support
        src = os.path.join(tmp, 'frames.mkv')
        run(['ffmpeg', '-v', 'error', '-framerate', '30', '-start_number', '1', '-i', frames,
             '-c:v', 'ffv1', '-pix_fmt', 'bgr0', src])
        for extra, name in (([], '8-bit'), (['--10bit'], '10-bit')):
            out = os.path.join(tmp, f'acc{len(extra)}.mp4')
            r = run([sys.executable, os.path.join(SCRIPTS, 'accumulate.py'), src, out, '--uniform', '1',
                     '--preset', 'veryfast', '--quiet', *extra])
            got = tags(out) if r.returncode == 0 else f'accumulate.py exit {r.returncode}'
            result(got == WANT, f'accumulate.py {name} tags', got)

sys.exit(1 if failed else 0)
