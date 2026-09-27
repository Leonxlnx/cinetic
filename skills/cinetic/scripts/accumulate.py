#!/usr/bin/env python3
"""Temporal motion blur by accumulation: average each output frame's sub-frames in float, quantize once.

Reads a sub-frame render and writes the blurred master. Two modes:
  samples mode  the FilmSub stream, where output frame f owns groups[f] consecutive sub-frames
                (from scripts/measure-speed.py, the same JSON FilmSub was rendered with)
  --uniform K   a plain render at fps*K (HyperFrames, or any engine without adaptive sampling);
                each output frame averages the ceil(K*shutter/360) sub-frames centred on it

Why outside the browser: compositing samples in Chromium quantizes every layer to 8 bits, which
posterizes soft gradients, tints light greys and darkens the frame a little per sample. Here the
decode is 16-bit, the average is float32, and only pixels that actually changed across the
shutter get a +-1 LSB triangular (TPDF) dither before the single quantization, so blurred ramps
stay smooth while static pixels stay bit-exact. The encode is BT.709 limited range, tagged.

Usage:
  python3 scripts/accumulate.py out/sub.mp4 out/samples.json out/picture.mp4 [--crf 14]
  python3 scripts/accumulate.py out/sub.mp4 out/samples.json out/picture.mp4 --start 600 --count 120
  python3 scripts/accumulate.py renders/x4.mp4 out/picture.mp4 --uniform 4 [--shutter 240]
  python3 scripts/accumulate.py 'frames/*.png' out/picture.mp4 --uniform 4 --in-fps 240

Size and fps come from ffprobe (image sequences need --in-fps). Options: --crf (14), --preset
(slow), --10bit (yuv420p10le, High 10), --start/--count (a range of film frames, for excerpt and
per-act renders), --dither LSB (1.0; 0 = off), --dither-all (dither every pixel), --fps (override
output fps). Exit 0 on success, 1 on failure (stream shorter/longer than the samples expect).
"""
import argparse
import glob
import json
import math
import os
import subprocess
import sys
import time
from collections import OrderedDict
from fractions import Fraction

import numpy as np


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='+', help='SRC SAMPLES OUT, or SRC OUT with --uniform')
    ap.add_argument('--uniform', type=int, help='K: the source was rendered at fps*K; average uniformly')
    ap.add_argument('--shutter', type=float, default=240, help='shutter angle for --uniform (default 240)')
    ap.add_argument('--crf', type=float, default=float(os.environ.get('ACCUM_CRF', 14)))
    ap.add_argument('--preset', default='slow')
    ap.add_argument('--10bit', dest='tenbit', action='store_true', help='encode yuv420p10le (High 10)')
    ap.add_argument('--start', type=int, default=0, help='first film frame in the stream (samples mode)')
    ap.add_argument('--count', type=int, help='number of film frames in the stream (samples mode)')
    ap.add_argument('--dither', type=float, default=1.0, help='TPDF dither amplitude in 8-bit LSB (0 = off)')
    ap.add_argument('--dither-all', action='store_true', help='dither every pixel, not only changed ones')
    ap.add_argument('--fps', type=float, help='output fps (default: source fps, or source fps / K)')
    ap.add_argument('--in-fps', type=float, help='source fps for image sequences')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    if a.uniform:
        if len(a.paths) == 3:
            a.src, _, a.out = a.paths
        elif len(a.paths) == 2:
            a.src, a.out = a.paths
        else:
            ap.error('--uniform takes SRC OUT')
        a.samples = None
        if a.uniform < 1:
            ap.error('--uniform K must be >= 1')
    else:
        if len(a.paths) != 3:
            ap.error('want SRC SAMPLES OUT (or SRC OUT --uniform K)')
        a.src, a.samples, a.out = a.paths
    return a


def fail(msg):
    sys.stderr.write(f'accumulate.py: {msg}\n')
    sys.exit(1)


def source_args(src, in_fps):
    """ffmpeg input args for a video file, a printf pattern or a glob of images."""
    if os.path.isdir(src):
        imgs = sorted(glob.glob(os.path.join(src, '*.png')) + glob.glob(os.path.join(src, '*.jpg')))
        if not imgs:
            fail(f'no .png/.jpg frames in {src}')
        src = os.path.join(src, '*' + os.path.splitext(imgs[0])[1])
    if any(c in src for c in '*?['):
        if not in_fps:
            fail('image sequences need --in-fps')
        return ['-framerate', str(in_fps), '-pattern_type', 'glob', '-i', src], sorted(glob.glob(src))[0], True
    if '%' in src:
        if not in_fps:
            fail('image sequences need --in-fps')
        return ['-framerate', str(in_fps), '-i', src], src % 0 if os.path.exists(src % 0) else src % 1, True
    if not os.path.exists(src):
        fail(f'missing source {src}')
    return ['-i', src], src, False


def probe(path, count_frames):
    cmd = ['ffprobe', '-v', 'error', '-select_streams', 'v:0']
    if count_frames:
        cmd.append('-count_packets')
    cmd += ['-show_entries', 'stream=width,height,avg_frame_rate,r_frame_rate,nb_read_packets,color_space,color_range',
            '-of', 'json', path]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode or not json.loads(r.stdout).get('streams'):
        fail(f'cannot probe {path}: {r.stderr.strip()}')
    s = json.loads(r.stdout)['streams'][0]
    fps = None
    for k in ('avg_frame_rate', 'r_frame_rate'):
        try:
            f = Fraction(s.get(k, '0/0'))
            if f > 0:
                fps = float(f)
                break
        except (ValueError, ZeroDivisionError):
            pass
    n = int(s['nb_read_packets']) if s.get('nb_read_packets') else None
    return s['width'], s['height'], fps, n


def main():
    a = parse_args()
    t0 = time.time()
    in_args, probe_path, is_seq = source_args(a.src, a.in_fps)
    W, H, src_fps, n_src = probe(probe_path, not is_seq)
    if is_seq:
        src_fps = a.in_fps
        n_src = len(sorted(glob.glob(a.src))) if any(c in a.src for c in '*?[') else None
    if not src_fps:
        fail('cannot tell the source fps; pass --in-fps')

    # plan: for each output frame, the list of source indices it averages
    if a.uniform:
        K = a.uniform
        if n_src is None:
            fail('cannot count source frames; pass a video file')
        n_out = n_src // K
        n = max(1, min(K, math.ceil(K * a.shutter / 360 - 1e-9)))
        h = (n - 1) // 2
        plan = [[min(max(f * K - h + i, 0), n_src - 1) for i in range(n)] for f in range(n_out)]
        out_fps = a.fps or src_fps / K
        expected = n_src
        desc = f'uniform K={K}: {n} of every {K} sub-frames, centred ({a.shutter:g} deg)'
    else:
        try:
            groups = json.load(open(a.samples))['groups']
        except (OSError, ValueError, KeyError) as e:
            fail(f'cannot read groups from {a.samples}: {e}')
        groups = groups[a.start:a.start + a.count if a.count else None]
        if not groups:
            fail(f'no groups at --start {a.start} in {a.samples}')
        plan, j = [], 0
        for g in groups:
            g = max(1, int(g))
            plan.append(list(range(j, j + g)))
            j += g
        expected = j
        n_out = len(plan)
        out_fps = a.fps or src_fps
        desc = f'{n_out} frames from {expected} sub-frames (film frames {a.start}-{a.start + n_out - 1})'
        if n_src is not None and n_src != expected:
            before = sum(max(1, int(g)) for g in json.load(open(a.samples))['groups'][:a.start])
            fail(f'{a.src} has {n_src} frames but {a.samples} expects {expected} sub-frames for film frames '
                 f'{a.start}-{a.start + n_out - 1}: render FilmSub with the same --props file over sub-frames '
                 f'{before}-{before + expected - 1}')

    FRAME = W * H * 3
    # decode at 16 bits with the file's own matrix/range and accurate chroma; swscale maps 8-bit
    # code v to ~v*256 in rgb48, and the encoder maps it back the same way, so 1 LSB = 256 here
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', *in_args, '-vf',
                            'scale=in_color_matrix=auto:in_range=auto:flags=accurate_rnd+full_chroma_int',
                            '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-'], stdout=subprocess.PIPE)
    pix = 'yuv420p10le' if a.tenbit else 'yuv420p'
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-s', f'{W}x{H}',
                            '-r', f'{out_fps:g}', '-i', '-',
                            '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int',
                            '-c:v', 'libx264', '-preset', a.preset, '-crf', f'{a.crf:g}', '-pix_fmt', pix,
                            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
                            '-movflags', '+faststart', a.out], stdin=subprocess.PIPE)

    got_idx = [-1]

    def read_frame():
        buf = bytearray(FRAME * 2)
        view = memoryview(buf)
        got = 0
        while got < len(buf):
            k = dec.stdout.readinto(view[got:])
            if not k:
                return None
            got += k
        got_idx[0] += 1
        return np.frombuffer(buf, dtype='<u2')

    rng = np.random.default_rng(7)
    amp = 256.0 * a.dither
    bank = [((rng.random(FRAME, dtype=np.float32) + rng.random(FRAME, dtype=np.float32)) - 1.0) * amp
            for _ in range(6)] if amp > 0 else None

    cache = OrderedDict()  # source index -> frame (uniform mode windows may overlap or repeat)

    def get(idx):
        while got_idx[0] < idx:
            fr = read_frame()
            if fr is None:
                enc.stdin.close()
                enc.wait()
                fail(f'sub-frame stream ended at frame {got_idx[0] + 1}, expected {expected} ({desc})')
            cache[got_idx[0]] = fr
        return cache[idx]

    def next_frame():
        fr = read_frame()
        if fr is None:
            enc.stdin.close()
            enc.wait()
            fail(f'sub-frame stream ended at frame {got_idx[0] + 1}, expected {expected} ({desc})')
        return fr

    acc = np.zeros(FRAME, dtype=np.float32)
    changed = np.zeros(FRAME, dtype=bool)
    last_log = time.time()
    for f, idxs in enumerate(plan):
        # samples mode streams (a frame's sub-frames are consecutive and used once); uniform mode
        # windows can repeat an index at the ends, so it keeps a small cache
        src = (lambda i: next_frame()) if not a.uniform else get
        first = src(idxs[0])
        acc[:] = first
        if len(idxs) > 1:
            changed[:] = False
            for i in idxs[1:]:
                x = src(i)
                acc += x
                changed |= x != first
            acc /= len(idxs)
        if bank is not None and len(idxs) > 1:
            d = bank[f % len(bank)]
            if a.dither_all:
                acc += d
            else:
                acc += np.where(changed, d, np.float32(0))
        enc.stdin.write(np.clip(acc + 0.5, 0, 65535).astype('<u2').tobytes())
        if a.uniform:
            lo = plan[f + 1][0] if f + 1 < len(plan) else got_idx[0] + 1
            for k in [k for k in cache if k < lo]:
                del cache[k]
        if not a.quiet and time.time() - last_log > 10:
            last_log = time.time()
            el = time.time() - t0
            sys.stderr.write(f'  accumulated {f + 1}/{n_out} frames, {el:.0f}s, eta {el / (f + 1) * (n_out - f - 1):.0f}s\n')

    extra = 0
    while read_frame() is not None:  # drain (uniform mode drops a partial last group)
        extra += 1
    if a.uniform:
        extra = 0
    enc.stdin.close()
    rc = enc.wait()
    dec.stdout.close()
    dec.wait()
    if extra:
        fail(f'sub-frame stream has {extra} more frames than {a.samples} expects ({desc})')
    if rc:
        fail(f'encoder failed (exit {rc})')
    if not a.quiet:
        sys.stderr.write(f'wrote {a.out}: {desc}, {W}x{H}@{out_fps:g}, crf {a.crf:g} {pix} bt709, {time.time() - t0:.0f}s\n')
    print(a.out)


if __name__ == '__main__':
    main()
