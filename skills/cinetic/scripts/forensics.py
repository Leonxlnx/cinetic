#!/usr/bin/env python3
"""Pixel forensics for a rendered film: the artifacts that eyes on contact sheets miss.

Usage:
  python3 scripts/forensics.py out/film.mp4 --cues out/cues.json --json out/qa/forensics.json
  python3 scripts/forensics.py out/film.mp4 --cuts 600,836-840 --freeze-ok 345-359 --json out/qa/f.json
  python3 scripts/forensics.py out/loop.mp4 --loop --json out/qa/loop.json
  python3 scripts/forensics.py out/a.mp4 --against out/b.mp4        # render twice: nondeterministic frames
  python3 scripts/forensics.py out/film.mp4 --from 1440 --to 1979 --track 700,400,512,256

d[f] is the mean absolute RGB change from frame f-1 to frame f at 480x270 (area downscale).
Frames are 0-based and absolute (frame = t * fps). Defaults (every number is a flag):

  check        rule                                                                     result
  spike        d > 1.0 and d > 2.5 * median(d[f-4..f+4] without f) + 0.3 on the whole frame, or the
               same rule with a 1.5 floor inside one of 9 regions (small pops), then classified:
                 cut: overlaps a declared cut                                           info
                 burst: the change is spread over >= 3 frames (whip, flood, landing)   info
                 motion: optical flow explains the change (residual < 0.5)            info
                 seam pop: 1-2 frame change on an act boundary, not motion            fail
                 hit: 1-2 frame change within 2 f of a cue or sound event             warn
                      (inside a region: info)
                 busy: a region spike while the whole frame changes > 0.15x as much   info
                 pop: any other 1-2 frame change that motion does not explain         fail
  stall        d < 0.05 while d[f-1] > 0.8 and d[f+1] > 0.8 (a repeated frame)         fail
  hold         d < 0.1 for > 48 f (calm: 72 f): frozen (90% of its frames change < 16 px by > 24)  fail
                                   quiet (only small elements move)                   warn
               a static end tail <= 2 s + 1 f is allowed (the audio decays there); a run inside a
               reading window (the cues copy block: an on-screen string's `read` windows, which leave a
               chain's picture beat out; [resolved, out) in an older cues.json) whose
               mean d >= 0.02 is a read: a line held while it is read, alive with a slow drift  info
  quiet        60-frame mean d < 0.15 (calm: 0.10) outside holds (nearly locked-off)   warn
               (inside a reading window with mean d >= 0.02: a read, info)
  hook         the first 2 s move less than max(0.5, 0.5x the film's median 2 s window)
               (films that start at frame 0, not loops; for films of 6 s or less, the first
               1 s under 0.5x the median 1 s): a muted feed decides in second one      warn
               the first 0.5 s window whose mean d passes max(0.03, 0.3x the median d
               of the film's moving frames) starts after 1.0 s                         warn
                                                         after 2.5 s                   fail
  ghost        a frame differs from both neighbours by > 80 while they agree (< 30) on
               > 2000 px (full-res equivalent) and nothing moves within 192 px         fail
               (the same pattern inside motion is a fast element crossing: info)
  border       the outer 1-3 rows/columns differ by > 40 from rows 5-7 inside, on > 25%
               of the edge, at a constant depth for >= 3 frames (a sliver or gap)      fail
  judder       phase-correlated 256 px patches (3x3 grid, or --track) that move in
               whole-pixel stairs (rests and isolated 1 px jumps) in a slow move     warn
  sharpness    a region's Laplacian variance steps x3 in one frame while the region
               is otherwise calm (a stepped blur ramp)                               warn
  banding      > 3% of the frame in 64 px tiles holding a 1-12 level gradient drawn as
               flat 8-bit plateaus with 1-level contour steps (visible bands)        warn
  smear        compression smear on a flat field (paper, a solid stage): in a large region
               held within +-2 of one code value, 16 px blocks of fine 1-level texture
               sit next to clean ones (the encoder kept a pattern in some blocks and
               flattened others: streaks and blotches under a 25x stretch). The smeared
               share of the frame (the lesser of textured and clean, times the region)
               > 0.2 on >= 2 sampled frames (2 per second, exact luma plane)          fail
                                                              on one sampled frame   warn
  loop seam    (--loop) last->first change <= max(0.4, 1.5 * median step at the ends)  fail

Grammar (a film whose cues.json carries the 1.2 declarations, `look` or `declared`, or --grammar; for
an older cues file they are info, so its verdict does not change). Speeds are px/s at 1080p, measured
over 0.4 s windows at 480 wide (camera fit, fastest layer, flat-ground change), so a slow creep reads:
  declared     a spike or stall on a declared stepped range, flash or hard seam (cues `declared`,
               including what each primitive declares) is craft                            info
  hold-drift   a run > 0.8 s (1 s inside a reading window: the read lock) outside the end lock
               (cues END; a film without declarations: its last 2 s, as look-audit.py) where the
               camera neither drifts 6 px/s nor creeps 1 %/s, no layer moves 6 px/s, the ground
               does not change and no content changes (typing, a counter: 0.2 % of the frame)  fail
               inside a reading window: faster than 90 px/s or 15 %/s                       warn
  static-share more than 15 % of the body stands still (camera, layers and ground)          warn
  still-cut    more than 30 % of the cuts go from a still frame to a still frame            warn
  hold-into-exit  fewer than half of the continuity cuts accelerate into the cut (the last two
               frames run x1.15 faster than the two before them, or end at 3x the hold)     warn
  carried-cut  a declared velocity seam: direction cosine >= 0.7, incoming first-frame speed
               0.4-1.4x the outgoing, then decaying every frame                             fail
  dissolve-detect  >= 4 f@60 explained as a rising mix of two different images (SSIM < 0.5), or a
               fade to black before the last 2 s, unless a seam declares it (dissolveUi,
               light, fadeEnd)                                                              fail
  end-card     with END declared: the 1.5 s before the lock barely move, or it fades in   warn
Motion gates (with the grammar): no event starts or ends in one frame and no hold freezes. Mean luma change
at 160x90, one sample per 1/30 s (landings also at the film's own rate), outside the end lock:
  motion-snap  one-sample changes (>= 2 code values, both neighbours under 35 % of it) that are not cuts:
               more than 0.6 per 3 s outside a declared snap (stepped ranges, flashes, snapZoom seams), or
               more than 1 declared snap device (declarations named alike, 'tick-0' ... 'tick-9', are one) fail
  motion-frozen  6 f@30 or more in a row where the mean change is under 0.05 and fewer than 8 px change by
               4 values or more (a 0.3 px/f drift keeps even a sparse frame alive), after the first 0.5 s
               and outside declared freezes; without declarations 1 s of still in all is allowed       fail
  motion-decay the median move falls from its peak to 20 % of its speed in under 3.5 f@30 (3+ moves)   fail
  motion-density more than 2 primary moves (peaks >= 25 % of the film's 90th-percentile move) per 3 s  fail
  motion-stop  a move goes still in one frame from above 15 % of its peak speed (cut off mid-ease)    fail
  motion-cut   a visible cut while a braking move is still above 10 % of its peak speed               warn
               (fail over 0.25 per 3 s), unless a whip, velocity or zoomThrough seam or a camera-blur
               range carries it into the cut
  What machine-made motion looks like here: many short events that start and stop in one frame, dead holds
  between them, and moves cut while still fast. The fixes: fx/GlideStep and lib/continuity (glideValue,
  holdDrift, landBeforeCut); references/motion-tokens.md "Continuous motion".
--no-grammar skips them.
  determinism  (--against) frames whose change between two renders > max(0.3, 5*median) fail

Declare intended cuts, freezes and effects:
  --cuts 600,836-840        hard cuts or flash transitions (a spike overlapping +-1 f is accepted)
  --freeze-ok 345-359       designed freezes/holds (holds, stalls and quiet runs inside are accepted)
  --ignore 10-12            skip every check on these frames (a deliberate glitch)
  --declare qa.json         {"cuts":[600,[836,840]], "freezes":[[345,359]], "ignore":[[10,12]]}
  --cues out/cues.json      the same block under "qa"; events of kind "cut" count as cuts; act
                            boundaries become seams; cue frames and sound events mark hits; its
                            copy block gives the reading windows, its `pace` the default --pace.
  --pace calm|crisp         hold and quiet limits: calm --max-hold 72 --quiet-mad 0.10 (a calm film
                            holds its reads longer), crisp 48 and 0.15 (the default without cues)

Writes JSON (--json), a x12 banding stretch sheet and a x25 smear sheet next to it, and a short
summary on stdout.
Exit: 0 no failing check (warnings allowed), 1 a failing check, 2 usage or decode error.
Needs ffmpeg/ffprobe, numpy and opencv-python.
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
from collections import deque

import cv2
import numpy as np

SW, SH = 480, 270  # MAD analysis size; the thresholds are calibrated at this size
# Hold and quiet limits per pace: a calm film holds its reads longer (a drifting line is alive).
PACE_LIMITS = {'calm': dict(max_hold=72, quiet_mad=0.10), 'crisp': dict(max_hold=48, quiet_mad=0.15)}
READ_MAD = 0.02  # inside a reading window, a run with at least this mean change is a read, not a stall
READ_LOCK_S = 1.0  # hold-drift: a frozen run inside a reading window may last this long (the camera locks on a read)
APEX_KINDS = ('whoosh', 'sweep', 'suck')  # the loudest point of the sound sits on f
END_KINDS = ('riser', 'swell')  # the sound builds and ends on f


def die(msg):
    print(f'forensics: {msg}', file=sys.stderr)
    sys.exit(2)


# ------------------------------------------------------------------------------------------
# decoding (shared with sheet.py and av-audit.py)
# ------------------------------------------------------------------------------------------
def probe(path):
    """Size, fps, frame count and duration of the first video stream."""
    if not os.path.exists(path):
        die(f'no such file: {path}')
    try:
        out = subprocess.run(
            ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
             'stream=width,height,r_frame_rate,nb_frames,duration,pix_fmt:format=duration', '-of', 'json', path],
            capture_output=True, text=True, check=True).stdout
    except FileNotFoundError:
        die('ffprobe not found on PATH')
    except subprocess.CalledProcessError as e:
        die(f'cannot read {path}: {e.stderr.strip()}')
    j = json.loads(out)
    if not j.get('streams'):
        die(f'{path} has no video stream')
    s = j['streams'][0]
    num, den = (s['r_frame_rate'].split('/') + ['1'])[:2]
    fps = float(num) / float(den)
    dur = float(s.get('duration') or j.get('format', {}).get('duration') or 0)
    nb = s.get('nb_frames')
    n = int(nb) if nb and str(nb).isdigit() else int(round(dur * fps))
    return dict(w=int(s['width']), h=int(s['height']), fps=fps, frames=n, duration=dur, pix_fmt=s.get('pix_fmt', ''))


def decode(path, info, start=0, count=None, pix='rgb24', size=None):
    """Yield (frame_index, array). Seeks exactly: the first yielded frame is `start`."""
    w, h = size or (info['w'], info['h'])
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if start > 0:
        cmd += ['-ss', f'{(start - 0.5) / info["fps"]:.6f}']
    cmd += ['-i', path, '-map', '0:v:0']
    if count:
        cmd += ['-frames:v', str(count)]
    if size:
        cmd += ['-vf', f'scale={w}:{h}:flags=area']
    # passthrough: after an accurate seek, the default CFR sync duplicates the first frame
    cmd += ['-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', pix, '-']
    ch = 3 if pix == 'rgb24' else 1
    nbytes = w * h * ch
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    i = start
    try:
        while True:
            buf = p.stdout.read(nbytes)
            if len(buf) < nbytes:
                break
            a = np.frombuffer(buf, np.uint8)
            yield i, (a.reshape(h, w, 3) if ch == 3 else a.reshape(h, w))
            i += 1
    finally:
        p.stdout.close()
        p.kill()
        p.wait()


def decode_y(path, info, start=0, count=None, every=1):
    """Yield (frame_index, luma plane as float32 code values) for every `every`-th frame from `start`.
    The plane is copied as stored (extractplanes, no matrix or range conversion; 10/12-bit sources
    are scaled to 8-bit code units), so a 1-level step in the file is exactly 1.0 here."""
    pf = info.get('pix_fmt', '')
    m = re.search(r'(\d+)(le|be)$', pf)
    bits = int(m.group(1)) if m else 8
    yuv = pf.startswith(('yuv', 'yuvj', 'gray', 'nv'))
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if start > 0:
        cmd += ['-ss', f'{(start - 0.5) / info["fps"]:.6f}']
    cmd += ['-i', path, '-map', '0:v:0']
    if count:  # count source frames; after the select that is ceil(count / every) sampled ones
        cmd += ['-frames:v', str(-(-count // every))]
    sel = f'select=not(mod(n\\,{every}))'
    out_fmt = 'gray' if bits == 8 else f'gray{bits}le'
    cmd += ['-vf', f'{sel},extractplanes=y' if yuv else f'{sel},format=gray', '-fps_mode', 'passthrough',
            '-f', 'rawvideo', '-pix_fmt', out_fmt if yuv else 'gray', '-']
    w, h = info['w'], info['h']
    wide = yuv and bits > 8
    nbytes = w * h * (2 if wide else 1)
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    i = start
    try:
        while True:
            buf = p.stdout.read(nbytes)
            if len(buf) < nbytes:
                break
            a = np.frombuffer(buf, '<u2' if wide else np.uint8).reshape(h, w).astype(np.float32)
            yield i, (a / (1 << (bits - 8)) if wide else a)
            i += every
    finally:
        p.stdout.close()
        p.kill()
        p.wait()


SMEAR_B = 16  # macroblock size: encoder decisions (keep the texture or flatten it) are made per block


def smear_frame(y, min_region=0.01, near=2, mode_min=0.5, tex_hi=0.3, tex_lo=0.02):
    """Compression smear on flat fields. A region counts as a flat field when the 17x17 neighbourhood
    of each of its pixels spans <= 3 code values, it covers >= min_region of the frame, one code value
    holds >= half of it and >= 98% sits within +-near of that value (a truly flat colour, not a
    gradient, texture or blurred UI). In such a field every 16 px block should look alike: all clean
    (an exact encode) or all finely textured (uniform dither or grain). Smear is the mix: blocks whose
    pixels differ from a neighbour on >= tex_hi of the block next to blocks with <= tex_lo. Returns
    the smeared share of the frame (min(textured, clean) x the field's blocks / all blocks)."""
    H, W = y.shape
    y8 = np.clip(np.round(y), 0, 255).astype(np.uint8)
    k = np.ones((17, 17), np.uint8)
    flat = ((cv2.dilate(y8, k).astype(np.int16) - cv2.erode(y8, k)) <= 3).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(flat, connectivity=4)
    diff = np.zeros((H, W), bool)
    diff[:, :-1] |= np.abs(np.diff(y, axis=1)) > 0.5
    diff[:-1] |= np.abs(np.diff(y, axis=0)) > 0.5
    th, tw = H // SMEAR_B, W // SMEAR_B
    if th == 0 or tw == 0:
        return dict(area=0.0, patchy=0.0, field=0.0, level=None)

    def blocks(a):
        return a[:th * SMEAR_B, :tw * SMEAR_B].reshape(th, SMEAR_B, tw, SMEAR_B).mean(axis=(1, 3))

    tex = blocks(diff.astype(np.float32))
    best = dict(area=0.0, patchy=0.0, field=0.0, level=None)
    for c in range(1, n):
        if st[c, cv2.CC_STAT_AREA] < min_region * W * H:
            continue
        inside = lab == c
        full = blocks(inside.astype(np.float32)) >= 0.999
        if full.sum() < 50:
            continue
        hist = np.bincount(y8[inside], minlength=256)
        mode = int(hist.argmax())
        if hist[mode] < mode_min * hist.sum() or hist[max(0, mode - near):mode + near + 1].sum() < 0.98 * hist.sum():
            continue  # a gradient, a texture or soft content: the banding check's business, not this one's
        t = tex[full]
        patchy = min(float((t >= tex_hi).mean()), float((t <= tex_lo).mean()))
        area = patchy * float(full.sum()) / (th * tw)
        if area > best['area'] or best['level'] is None:
            best = dict(area=round(area, 4), patchy=round(patchy, 3), field=round(float(full.sum()) / (th * tw), 3),
                        level=mode)
    return best


def smear_scan(args, info):
    """Sample frames for the smear check; returns [{frame, area, patchy, field, level, _img}]."""
    start = max(0, args.from_frame or 0)
    count = max(1, args.to_frame - start + 1) if args.to_frame is not None else None
    every = args.smear_every or max(1, int(round(info['fps'] / 2)))
    out = []
    for f, y in decode_y(args.video, info, start, count, every):
        r = smear_frame(y)
        lvl = r['level'] if r['level'] is not None else float(np.median(y))
        st = np.clip((y - lvl) * 25 + 128, 0, 255).astype(np.uint8)
        r['_img'] = cv2.cvtColor(cv2.resize(st, (480, int(480 * info['h'] / info['w'])), interpolation=cv2.INTER_AREA),
                                 cv2.COLOR_GRAY2BGR)
        out.append(dict(frame=f, **r))
    return out


# ------------------------------------------------------------------------------------------
# cues (shared with av-audit.py): the new {events:[...]} schema or an older per-key layout
# ------------------------------------------------------------------------------------------
def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def load_cues(path):
    """Normalise a cues file to {fps,total,acts,cue,events:[{f,kind,weight,apex,ends,pan}],qa,schema}.

    New schema: {fps,bpm,total,acts:{name:{from,dur}},cue:{name:f},events:[{f,kind,weight,pan,pitch?,apexFrac?}]}.
    Older exports (per-key lists such as sfx:{name:f|[f]}, peaks:{name:f}, landings:[{f}], rain:[f]) are
    read too: every integer frame list or name->frame map becomes events of that kind; `peaks` and
    whoosh-like names are apex events (the sound's loudest point sits on the frame).
    Event shapes: apex (apexFrac given, or whoosh/suck) peaks on f; ends (riser, swell) builds
    into f; everything else starts on f.
    """
    try:
        c = json.load(open(path))
    except (OSError, json.JSONDecodeError) as e:
        die(f'cannot read cues {path}: {e}')
    total = int(c.get('total') or 0)
    acts = {k: (int(v['from']), int(v['from']) + int(v.get('dur', 0)))
            for k, v in (c.get('acts') or {}).items() if isinstance(v, dict) and 'from' in v}
    cue = {k: int(round(v)) for k, v in (c.get('cue') or {}).items() if _num(v)}
    events = []

    def is_apex(kind):
        return any(a in kind.lower() for a in APEX_KINDS)

    def is_end(kind):
        return any(a in kind.lower() for a in END_KINDS)

    if isinstance(c.get('events'), list):
        schema = 'events'
        for e in c['events']:
            if not isinstance(e, dict) or not _num(e.get('f')):
                continue
            kind = str(e.get('kind', 'hit'))
            apex = ('apexFrac' in e) or is_apex(kind)
            events.append(dict(f=float(e['f']), kind=kind, weight=float(e.get('weight', 1.0)),
                               apex=apex, ends=is_end(kind) and not apex, pan=e.get('pan'), variant=e.get('variant')))
    else:
        schema = 'legacy'
        skip = {'fps', 'total', 'bpm', 'acts', 'cue', 'events', 'qa', 'meta', 'version'}

        def framey(v):
            return _num(v) and float(v).is_integer() and v >= 0 and (not total or v <= total + 1)

        for key, val in c.items():
            if key in skip:
                continue
            if isinstance(val, list) and val and all(framey(v) for v in val):
                events += [dict(f=float(v), kind=key, weight=0.5, apex=is_apex(key), ends=is_end(key), pan=None)
                           for v in val]
            elif isinstance(val, list) and val and all(isinstance(v, dict) and framey(v.get('f')) for v in val):
                events += [dict(f=float(v['f']), kind=key, weight=1.0 if v.get('heavy') else 0.6,
                                apex=is_apex(key), ends=is_end(key), pan=v.get('pan')) for v in val]
            elif isinstance(val, dict):
                for name, v in val.items():
                    apex = key == 'peaks' or is_apex(name)
                    for x in (v if isinstance(v, list) else [v]):
                        if framey(x):
                            events.append(dict(f=float(x), kind=name, weight=1.0, apex=apex,
                                               ends=is_end(name) and not apex, pan=None))
    events.sort(key=lambda e: (e['f'], e['kind']))
    copy = [x for x in (c.get('copy') or []) if isinstance(x, dict) and _num(x.get('resolved')) and _num(x.get('out'))]
    return dict(fps=float(c.get('fps') or 0) or None, total=total, acts=acts, cue=cue, events=events,
                qa=c.get('qa') if isinstance(c.get('qa'), dict) else None, schema=schema, copy=copy,
                pace=c.get('pace') if c.get('pace') in PACE_LIMITS else None,
                look=c.get('look') if isinstance(c.get('look'), dict) else None,
                declared=c.get('declared') if isinstance(c.get('declared'), dict) else None)


# ------------------------------------------------------------------------------------------
# declarations
# ------------------------------------------------------------------------------------------
def parse_ranges(text):
    """'345-359,600' -> [(345, 359), (600, 600)]"""
    out = []
    for part in filter(None, (x.strip() for x in (text or '').split(','))):
        try:
            if '-' in part[1:]:
                a, b = part.split('-', 1)
                out.append((int(a), int(b)))
            else:
                out.append((int(part), int(part)))
        except ValueError:
            die(f'bad frame range: {part}')
    return out


def _pairs(items):
    out = []
    for x in items or []:
        if _num(x):
            out.append((int(x), int(x)))
        elif isinstance(x, (list, tuple)) and len(x) == 2:
            out.append((int(x[0]), int(x[1])))
        else:
            raise ValueError(x)
    return out


def load_declarations(args):
    cuts = parse_ranges(args.cuts)
    freezes = parse_ranges(args.freeze_ok)
    ignore = parse_ranges(args.ignore)
    acts, moments, reading, cues_fps = {}, [], [], None
    extra = dict(look=None, seams=[], stepped=[], flashes=[], camera_blur=[], end=None, events=[])

    def take(block, where):
        if not isinstance(block, dict):
            return
        try:
            cuts.extend(_pairs(block.get('cuts')))
            freezes.extend(_pairs(block.get('freezes')))
            ignore.extend(_pairs(block.get('ignore')))
        except (TypeError, ValueError):
            die(f'bad qa block in {where}: expected cuts:[f|[a,b]], freezes:[[a,b]], ignore:[[a,b]]')

    if args.declare:
        try:
            take(json.load(open(args.declare)), args.declare)
        except (OSError, json.JSONDecodeError) as e:
            die(f'cannot read --declare {args.declare}: {e}')
    if args.cues:
        c = load_cues(args.cues)
        take(c['qa'], args.cues)
        cuts.extend((int(round(e['f'])), int(round(e['f']))) for e in c['events'] if e['kind'].lower() == 'cut')
        acts = c['acts']
        moments = sorted({int(round(e['f'])) for e in c['events']} | set(c['cue'].values()))
        reading = [w for x in c['copy'] for w in read_windows(x) if w[1] > w[0]]
        cues_fps = c['fps']
        extra.update(declared_of(c))
        extra['events'] = c['events']
    return sorted(set(cuts)), sorted(set(freezes)), sorted(set(ignore)), acts, moments, reading, cues_fps, extra


CARRIED = ('velocity', 'morph', 'breath', 'zoomThrough', 'whip', 'snapZoom', 'mask', 'wipe', 'defocus')
PUNCH = ('hard', 'colour', 'light', 'stepped')


def declared_of(c):
    """What the timeline and its primitives declare on purpose (cues.json `look` + `declared`): seams,
    stepped ranges, flashes, camera-blur ranges and the end lock, in film frames."""
    d = c.get('declared') or {}
    fx = [x for x in (d.get('fx') or []) if isinstance(x, dict)]

    def items(key, alt=None):
        own = d.get(key) or (d.get(alt) if alt else None) or []
        return [x for x in own if isinstance(x, dict)] + [y for x in fx for y in (x.get(key) or (x.get(alt) if alt else None) or []) if isinstance(y, dict)]

    end = d.get('end') if isinstance(d.get('end'), dict) else None
    if end and not (_num(end.get('from')) and _num(end.get('to')) and end['to'] > end['from']):
        end = None
    return dict(look=c.get('look'), seams=[s for s in items('seams') if _num(s.get('at'))],
                stepped=[r for r in items('stepped') if _num(r.get('from')) and _num(r.get('to'))],
                flashes=[x for x in items('flashes') if _num(x.get('f'))],
                camera_blur=[r for r in items('cameraBlur', 'camera_blur') if _num(r.get('from')) and _num(r.get('to'))],
                end=end, reveal=d.get('reveal'))


def read_windows(x):
    """The frames in which a copy entry is read: its `read` windows (export-cues.ts writes the
    timeline's READ: an earlier fragment of a chain only for its own hold, so a frozen picture beat
    between two fragments is not excused as a read), or [resolved, out) from an older cues.json."""
    read = x.get('read')
    if isinstance(read, list) and all(isinstance(w, (list, tuple)) and len(w) == 2 for w in read):
        return [(int(a), int(b)) for a, b in read]
    return [(int(x['resolved']), int(x['out']))]


def in_ranges(f, ranges, pad=0):
    return any(a - pad <= f <= b + pad for a, b in ranges)


def act_of(f, acts):
    for name, (a, b) in acts.items():
        if a <= f < b:
            return name
    return None


# ------------------------------------------------------------------------------------------
# sheet helpers (labelled tiles), shared with sheet.py
# ------------------------------------------------------------------------------------------
def label(img, text, sub=None):
    font, sc = cv2.FONT_HERSHEY_SIMPLEX, max(0.4, img.shape[1] / 900)
    (tw, th), base = cv2.getTextSize(text, font, sc, 1)
    cv2.rectangle(img, (0, 0), (tw + 8, th + base + 6), (0, 0, 0), -1)
    cv2.putText(img, text, (4, th + 3), font, sc, (255, 255, 255), 1, cv2.LINE_AA)
    if sub:
        (sw, sh), sb = cv2.getTextSize(sub, font, sc * 0.85, 1)
        y0 = th + base + 6
        cv2.rectangle(img, (0, y0), (sw + 8, y0 + sh + sb + 6), (40, 40, 40), -1)
        cv2.putText(img, sub, (4, y0 + sh + 3), font, sc * 0.85, (120, 230, 255), 1, cv2.LINE_AA)
    return img


def tile(images, cols, pad=4, bg=(90, 90, 90)):
    h, w = images[0].shape[:2]
    rows = (len(images) + cols - 1) // cols
    out = np.full((rows * h + (rows + 1) * pad, cols * w + (cols + 1) * pad, 3), bg, np.uint8)
    for i, im in enumerate(images):
        r, c = divmod(i, cols)
        y, x = pad + r * (h + pad), pad + c * (w + pad)
        out[y:y + h, x:x + w] = im
    return out


# ------------------------------------------------------------------------------------------
# measurements
# ------------------------------------------------------------------------------------------
def grid_boxes(w, h, n=3, size=256):
    size = min(size, w // n, h // n)
    return [(int(w * (i + 0.5) / n) - size // 2, int(h * (j + 0.5) / n) - size // 2, size, size)
            for j in range(n) for i in range(n)]


def edge_depth(rows, delta, frac):
    """rows[0] is the outermost line of an edge. Returns how many outer lines (1-3) differ from
    rows 5-7, or 0 when nothing differs or the reference rows themselves disagree (an edge of
    content passing through, not a sliver)."""
    if (np.abs(rows[5] - rows[7]) > delta).mean() > frac / 2:
        return 0
    inner = rows[5:8].mean(0)
    depth = 0
    for r in range(4):
        if (np.abs(rows[r] - inner) > delta).mean() > frac:
            depth = r + 1
        else:
            break
    return depth if depth <= 3 else 0


BAND_T = 64


def banding_tiles(gray):
    """Boolean map of 64 px tiles that hold a real low-frequency gradient (1-12 levels across the
    tile) rendered as flat 8-bit plateaus split by 1-level contours: visible bands. Dithered
    gradients are not flat; flat fills have no gradient; edges and texture are not smooth."""
    k = np.ones((5, 5), np.uint8)
    rng = cv2.dilate(gray, k).astype(np.int16) - cv2.erode(gray, k)
    th, tw = gray.shape[0] // BAND_T, gray.shape[1] // BAND_T

    def t(a):
        return a[:th * BAND_T, :tw * BAND_T].reshape(th, BAND_T, tw, BAND_T).mean(axis=(1, 3))

    smooth, flat, step = t(rng <= 2), t(rng == 0), t((rng >= 1) & (rng <= 2))
    q = BAND_T // 4
    lo = cv2.GaussianBlur(cv2.resize(gray, (gray.shape[1] // 4, gray.shape[0] // 4),
                                     interpolation=cv2.INTER_AREA).astype(np.float32), (0, 0), 4)
    lo = lo[:th * q, :tw * q].reshape(th, q, tw, q)
    span = lo.max(axis=(1, 3)) - lo.min(axis=(1, 3))
    return (smooth > 0.97) & (flat > 0.5) & (flat < 0.97) & (step > 0.03) & (span >= 1.0) & (span <= 12)


def stretch(gray, gain=12):
    med = float(np.median(gray))
    return np.clip((gray.astype(np.float32) - med) * gain + 128, 0, 255).astype(np.uint8)


def flow_residual(small_prev, small_cur):
    """How much of the change from prev to cur optical flow cannot explain (0 = pure motion, 1 = none)."""
    a = cv2.cvtColor(small_prev, cv2.COLOR_RGB2GRAY)
    b = cv2.cvtColor(small_cur, cv2.COLOR_RGB2GRAY)
    diff = np.abs(b.astype(np.float32) - a)
    m = diff > 12
    if m.sum() < 10:
        return 0.0
    fl = cv2.calcOpticalFlowFarneback(b, a, None, 0.5, 5, 25, 5, 7, 1.5, 0)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float32)
    warped = cv2.remap(a, xx + fl[..., 0], yy + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    res = np.abs(b.astype(np.float32) - warped)
    return float(res[m].mean() / diff[m].mean())


def stairs(v, r, first, win, rmin):
    """Windows of a patch track that move in whole-pixel stairs during a slow move: rests (|u| < 0.15)
    with isolated 1 px jumps between them. Smooth acceleration (rests, then a run of ~1 px steps)
    is not stairs, so at least two jumps must have a rest on both sides."""
    hits = []
    for s in range(0, max(0, len(v) - win + 1), max(1, win // 2)):
        seg, rr = v[s:s + win], r[s:s + win]
        if np.isnan(seg).any() or (rr < rmin).mean() > 0.1:
            continue
        disp = seg.sum(0)
        D = float(np.hypot(*disp))
        if D < 2.0 or D / win > 0.9:
            continue
        u = seg @ (disp / D)
        rest, jump = np.abs(u) < 0.15, np.abs(u - 1) < 0.2
        isolated = sum(1 for i in range(1, win - 1) if jump[i] and rest[i - 1] and rest[i + 1])
        if isolated >= 2 and (rest | jump).mean() >= 0.9:
            hits.append(dict(frm=first + s, to=first + s + win - 1, speed=round(D / win, 3),
                             jumps=int(jump.sum()), isolated=isolated))
    merged = []
    for h in hits:
        if merged and h['frm'] <= merged[-1]['to'] + 1:
            merged[-1]['to'] = h['to']
            merged[-1]['jumps'] = max(merged[-1]['jumps'], h['jumps'])
            merged[-1]['isolated'] = max(merged[-1]['isolated'], h['isolated'])
        else:
            merged.append(dict(h))
    return [{'from': m.pop('frm'), **m} for m in merged]


# ------------------------------------------------------------------------------------------
# the motion probe (shared with look-audit.py): slow and fast motion at analysis size, in constant
# memory. Speeds are px/s at a 1080-high frame, scale rates %/s, so every fps and size compares.
# ------------------------------------------------------------------------------------------
LIVE_PXS = 6.0      # below this (and LIVE_PCT) a frame does not move: a frozen hold
LIVE_PCT = 1.0      # %/s of scale creep
GROUND_CPS = 18.0   # a flat ground tile changing faster than this (codes per second) is living light
ONSET_PXS = 30.0    # a region starting to move faster than this is an animation start
CHANGE_LIVE = 0.002  # share of the frame whose content changes over a window (typing, counters): a hold that lives


def flow_fb(a, b):
    """Dense optical flow a -> b (Farneback; the parameters every probe uses)."""
    return cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 15, 3, 5, 1.2, 0)


def textured(gray, thr=6):
    """Pixels with 2D structure (where flow can be trusted)."""
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    return cv2.dilate((np.hypot(gx, gy) >= thr * 4).astype(np.uint8), None) > 0


def fit_similarity(fl, mask, max_pts=4000, residual=True):
    """Least-squares camera move (translation, scale, roll) that explains the flow on `mask`:
    u = tx + a x - b y, v = ty + b x + a y about the frame centre (a = scale - 1, b = roll).
    Returns (tx, ty, a, b, inlier share, mask of pixels it does not explain) or None."""
    h, w = mask.shape
    ys, xs = np.nonzero(mask)
    if len(xs) < 60:
        return None
    if len(xs) > max_pts:
        k = np.linspace(0, len(xs) - 1, max_pts).astype(int)
        ys, xs = ys[k], xs[k]
    u, v = fl[ys, xs, 0], fl[ys, xs, 1]
    x, y = xs - w / 2.0, ys - h / 2.0
    A = np.zeros((2 * len(x), 4), np.float64)
    A[0::2, 0] = 1
    A[0::2, 2] = x
    A[0::2, 3] = -y
    A[1::2, 1] = 1
    A[1::2, 2] = y
    A[1::2, 3] = x
    rhs = np.empty(2 * len(x))
    rhs[0::2], rhs[1::2] = u, v
    keep = np.ones(len(x), bool)
    p = None
    for _ in range(2):  # fit, drop what moves on its own, fit again
        sel = np.repeat(keep, 2)
        if sel.sum() < 40:
            break
        p, *_ = np.linalg.lstsq(A[sel], rhs[sel], rcond=None)
        r = np.hypot(u - (p[0] + p[2] * x - p[3] * y), v - (p[1] + p[3] * x + p[2] * y))
        keep = r <= max(0.35, 3 * float(np.median(r)))
    if p is None:
        return None
    if not residual:
        return float(p[0]), float(p[1]), float(p[2]), float(p[3]), float(keep.mean()), None
    full_x = np.arange(w)[None, :] - w / 2.0
    full_y = np.arange(h)[:, None] - h / 2.0
    ru = fl[..., 0] - (p[0] + p[2] * full_x - p[3] * full_y)
    rv = fl[..., 1] - (p[1] + p[3] * full_x + p[2] * full_y)
    return float(p[0]), float(p[1]), float(p[2]), float(p[3]), float(keep.mean()), np.hypot(ru, rv)


class MotionProbe:
    """Feed it the frames (gray, analysis size) in order; it measures, per frame f:
      win  (every `wstride` frames, flow f-k -> f over k ~ 0.4 s, which resolves a slow creep):
           cam_pxs / cam_pct  the camera move that explains most structure (px/s at 1080p, %/s)
           layer_pxs          the fastest moving layer (90th percentile of structure speed)
           plane2_pxs         a second plane moving apart from the camera (parallax), else 0
           ground_cps         how fast the flat ground changes (light moving over it)
      pair (on every frame, or only on `pair_frames`, flow f-1 -> f):
           vec                the dominant motion vector of the moving structure (px/f at 1080p)
           speed              its speed (px/s), and the camera fit of the pair
           tiles              which 64 px tiles move faster than ONSET_PXS (for starts and concurrency)
           cut                most pixels change and the flow cannot explain it
    """

    def __init__(self, fps, w, h, window_s=0.4, wstride=None, pair_frames=None, tiles=True, force=(), pair_scale=0.5):
        self.fps, self.w, self.h = fps, w, h
        # the frame-to-frame pairs run at a smaller size (cuts, speeds, tiles); the slow windows at full analysis size
        self.ps = pair_scale if min(w, h) * pair_scale >= 96 else 1.0
        self.pw, self.ph = max(2, int(round(w * self.ps))), max(2, int(round(h * self.ps)))
        self.up = 1080.0 / self.ph
        self.k = max(2, int(round(window_s * fps)))
        self.wstride = wstride or max(1, int(round(fps / 10)))
        self.pair_frames = pair_frames  # None: every frame
        self.force = set(force)  # frames that always get a window measurement (both sides of a cut)
        self.u = 1080.0 / h  # analysis px -> px at 1080p
        self.tile = max(8, int(round(64 * h / 1080)))
        self.ptile = max(4, int(round(64 * self.ph / 1080)))
        self.want_tiles = tiles
        self.buf = deque(maxlen=self.k + 1)
        self.prev_small = None
        self.win, self.pair = {}, {}

    def feed(self, f, gray):
        self.buf.append((f, gray))
        small = gray if self.ps == 1.0 else cv2.resize(gray, (self.pw, self.ph), interpolation=cv2.INTER_AREA)
        if self.prev_small is not None and (self.pair_frames is None or f in self.pair_frames):
            self.pair[f] = self._pair(self.prev_small, small)
        self.prev_small = small
        if len(self.buf) == self.k + 1 and (f % self.wstride == 0 or f in self.force):
            self.win[f] = self._win(self.buf[0][1], gray)

    def _pair(self, a, b):
        diff = cv2.absdiff(a, b)
        frac = float((diff > 24).mean())
        mad = float(diff.mean())
        fl = flow_fb(a, b)
        tex = textured(a)
        mag = np.hypot(fl[..., 0], fl[..., 1])
        moving = tex & (mag > 0.15)
        resid = 0.0
        if frac > 0.2 or mad > 12:
            hh, ww = a.shape
            gx, gy = np.meshgrid(np.arange(ww, dtype=np.float32), np.arange(hh, dtype=np.float32))
            warped = cv2.remap(b, gx + fl[..., 0], gy + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            resid = float(cv2.absdiff(a, warped).mean()) / max(mad, 1e-6)
        out = dict(mad=round(mad, 3), frac=round(frac, 3), cut=bool((frac > 0.35 and resid > 0.5) or (mad > 25 and resid > 0.6)))
        if moving.sum() >= 30:
            vx, vy = float(np.median(fl[..., 0][moving])), float(np.median(fl[..., 1][moving]))
            out['vec'] = [round(vx * self.up, 3), round(vy * self.up, 3)]
            out['speed'] = round(float(np.percentile(mag[moving], 90)) * self.up * self.fps, 1)
        else:
            out['vec'], out['speed'] = [0.0, 0.0], 0.0
        fit = fit_similarity(fl, tex, max_pts=1500, residual=False)
        if fit:
            out['cam'] = [round(fit[0] * self.up, 3), round(fit[1] * self.up, 3), round(fit[2], 5)]
        if self.want_tiles:
            t = self.ptile
            th, tw = a.shape[0] // t, a.shape[1] // t
            m = mag[:th * t, :tw * t].reshape(th, t, tw, t).mean(axis=(1, 3))
            tx = tex[:th * t, :tw * t].reshape(th, t, tw, t).mean(axis=(1, 3))
            out['tiles'] = ((m * self.up * self.fps >= ONSET_PXS) & (tx > 0.05)).astype(np.uint8)
        return out

    def _win(self, a, b):
        dt = self.k / self.fps
        fl = flow_fb(a, b)
        tex = textured(a)
        mag = np.hypot(fl[..., 0], fl[..., 1])
        out = dict(cam_pxs=0.0, cam_pct=0.0, layer_pxs=0.0, plane2_pxs=0.0, ground_cps=0.0, structure=float(tex.mean()))
        if tex.sum() >= 60:
            out['layer_pxs'] = round(float(np.percentile(mag[tex], 90)) * self.u / dt, 2)
            out['moving_share'] = round(float((mag[tex] * self.u / dt >= LIVE_PXS).mean()), 3)  # how much of the structure moves
            fit = fit_similarity(fl, tex)
            if fit:
                tx, ty, sa, rb, inl, res = fit
                out['cam_pxs'] = round(math.hypot(tx, ty) * self.u / dt, 2)
                out['cam_pct'] = round(abs(sa) * 100 / dt, 3)
                out['cam_k'] = round(sa * 100 / dt, 3)  # signed: > 0 pushes in
                out['cam_vec'] = [round(tx * self.u / dt, 2), round(ty * self.u / dt, 2)]
                # a second plane: structure the camera move does not explain, moving on its own
                cam_mag = math.hypot(tx, ty) + abs(sa) * max(a.shape) / 2
                apart = tex & (res > max(0.4, 0.25 * cam_mag))
                if apart.sum() >= max(40, 0.03 * tex.sum()):
                    p2 = float(np.median(mag[apart])) * self.u / dt
                    out['plane2_pxs'] = round(p2, 2)
                    out['plane2_share'] = round(float(apart.sum() / tex.sum()), 3)
        t = self.tile
        th, tw = a.shape[0] // t, a.shape[1] // t
        if th and tw:
            d = cv2.absdiff(a, b).astype(np.float32)[:th * t, :tw * t].reshape(th, t, tw, t).mean(axis=(1, 3))
            flat = tex[:th * t, :tw * t].reshape(th, t, tw, t).mean(axis=(1, 3)) < 0.05
            if flat.sum() >= 3:
                out['ground_cps'] = round(float(np.percentile(d[flat], 95)) / dt, 2)
        out['live'] = bool(out['cam_pxs'] >= LIVE_PXS or out['cam_pct'] >= LIVE_PCT or out['ground_cps'] >= GROUND_CPS)
        # content that changes without moving (typing, a counter, a colour turning) is a living hold too
        out['change'] = round(float((cv2.absdiff(a, b) > 24).mean()), 4)
        out['moving'] = bool(out['live'] or out['layer_pxs'] >= LIVE_PXS)
        return out


def ssim_gray(a, b):
    """Mean structural similarity of two gray frames (float32, 0-255), 7 px Gaussian window."""
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    blur = lambda x: cv2.GaussianBlur(x, (7, 7), 1.5)  # noqa: E731
    ma, mb = blur(a), blur(b)
    va, vb, cov = blur(a * a) - ma * ma, blur(b * b) - mb * mb, blur(a * b) - ma * mb
    m = ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))
    return float(m.mean())


def blend_test(frames, res_max=2.0, min_area=0.2):
    """Is the middle of `frames` (gray, float32) a linear mix of its first and last frame, with the
    mix rising every frame, over two different images? That is a dissolve (or a fade to a flat
    colour). Moving content never fits a mix, so a whip or a push is not one."""
    a, b = frames[0], frames[-1]
    d = b - a
    ch = np.abs(d) > 10
    if ch.mean() < min_area:
        return None
    dd = d[ch]
    den = float((dd * dd).sum())
    alphas, res = [], []
    for img in frames[1:-1]:
        e = (img - a)[ch]
        al = float((e * dd).sum() / den)
        alphas.append(al)
        res.append(float(np.abs(e - al * dd).mean()))
    if max(res) > res_max or not all(0.04 < x < 0.96 for x in alphas):
        return None
    if any(alphas[i + 1] <= alphas[i] + 0.02 for i in range(len(alphas) - 1)):
        return None
    # a slow move of soft content is also a mix of its ends (sub-pixel interpolation); motion explains it
    a8, b8 = np.clip(a, 0, 255).astype(np.uint8), np.clip(b, 0, 255).astype(np.uint8)
    fl = flow_fb(a8, b8)
    hh, ww = a8.shape
    gx, gy = np.meshgrid(np.arange(ww, dtype=np.float32), np.arange(hh, dtype=np.float32))
    warped = cv2.remap(b8, gx + fl[..., 0], gy + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    explained = float(np.abs(a - warped)[ch].mean()) / max(1e-6, float(np.abs(dd).mean()))
    if explained < 0.5:
        return None
    # the two ends are compared over the whole merged span (blend_spans), not this short window
    return dict(alphas=[round(x, 3) for x in alphas], residual=round(max(res), 2), area=round(float(ch.mean()), 3), _a=a, _b=b)


def blend_spans(hits):
    """Merge overlapping blend windows; a span is a dissolve when its first and last image differ
    (SSIM < 0.5), and a fade when one end is a flat colour."""
    spans = []
    for x in hits:
        if spans and x['frm'] <= spans[-1]['to']:
            spans[-1]['to'] = max(spans[-1]['to'], x['to'])
            spans[-1]['_b'] = x['_b']
            spans[-1]['alphas'] = spans[-1]['alphas'] + x['alphas']
        else:
            spans.append(dict(x))
    out = []
    flat = lambda img: float(img.std()) < 6  # noqa: E731
    for sp in spans:
        a, b = sp.pop('_a'), sp.pop('_b')
        sp['ssim'] = round(ssim_gray(a, b), 3)
        sp['black'] = bool(float(b.mean()) < 14 and flat(b)) or bool(float(a.mean()) < 14 and flat(a))
        sp['flat'] = bool(flat(a) or flat(b))
        sp['alphas'] = sp['alphas'][:12]
        if sp['ssim'] < 0.5 or sp['flat']:
            out.append(sp)
    return out


def probe_size(info):
    """The motion probe's analysis size: 480 wide, the source's own aspect (px at 1080p stay true on
    square and tall frames)."""
    w = min(SW, info['w']) // 2 * 2
    return w, max(2, int(round(info['h'] * w / info['w'])) // 2 * 2)


def window_at(win, f, wstride):
    """The window measurement that covers frame f (the nearest one at or after it)."""
    for g in range(f, f + 2 * wstride + 1):
        if g in win:
            return win[g]
    return None


def rolling_median_excl(d, i, r=4):
    lo, hi = max(1, i - r), min(len(d), i + r + 1)
    nb = np.concatenate([d[lo:i], d[i + 1:hi]])
    return float(np.median(nb)) if len(nb) else 0.0


def runs(mask):
    """[(start, end_inclusive)] of True runs."""
    out, s = [], None
    for i, v in enumerate(mask):
        if v and s is None:
            s = i
        elif not v and s is not None:
            out.append((s, i - 1))
            s = None
    if s is not None:
        out.append((s, len(mask) - 1))
    return out


# ------------------------------------------------------------------------------------------
# pass 1: decode once, measure everything per frame
# ------------------------------------------------------------------------------------------
def analyse(args, info):
    fps, W, H = info['fps'], info['w'], info['h']
    start = max(0, args.from_frame or 0)
    count = max(1, args.to_frame - start + 1) if args.to_frame is not None else None
    hw, hh = W // 2, H // 2
    gscale = (W * H) / (hw * hh)  # ghost pixel counts are reported at full-res equivalent
    sboxes = [(int(hw * i / 3), int(hh * j / 3), hw // 3, hh // 3) for j in range(3) for i in range(3)]
    rboxes = [(int(SW * i / 3), int(SH * j / 3), SW // 3, SH // 3) for j in range(3) for i in range(3)]
    tracks = {} if args.no_judder else {f'p{k}': b for k, b in enumerate(grid_boxes(W, H, 3, 256))}
    for k, t in enumerate(args.track or []):
        try:
            x, y, w, h = [int(float(q)) for q in t.split(',')]
        except ValueError:
            die(f'bad --track {t}: expected x,y,w,h')
        if x < 0 or y < 0 or w < 16 or h < 16 or x + w > W or y + h > H:
            die(f'--track {t} is outside the {W}x{H} frame')
        tracks[f'track{k}'] = (x, y, w, h)
    hann = {k: cv2.createHanningWindow((b[2], b[3]), cv2.CV_32F) for k, b in tracks.items()}
    band_every = args.banding_every or max(1, int(round(fps)))
    ghost_margin = 96  # half-res px: a fast element moves up to ~190 full-res px per frame

    M = dict(idx=[], d=[], d2=[], nchg=[], dr=[], sharp=[], depth={e: [] for e in ('top', 'bottom', 'left', 'right')},
             tv={k: [] for k in tracks}, tr={k: [] for k in tracks}, ghosts=[], crossings=[], band=[], det=[],
             tracks=tracks, sboxes=sboxes, rboxes=rboxes)
    smallq = deque(maxlen=3)
    halfq = deque(maxlen=3)
    prev_gray = None
    first_small = None
    other = None
    if args.against:
        oinfo = probe(args.against)
        if (oinfo['w'], oinfo['h']) != (W, H):
            die('--against file has a different size')
        other = decode(args.against, oinfo, start, count)

    probe_m = getattr(args, '_probe', None)  # the grammar probe (hold drift, cuts at speed), when enabled
    dis_n = max(2, int(round(4 * fps / 60)))  # a dissolve shows as a blend over >= 4 f@60
    disq = deque(maxlen=dis_n + 2)
    M['dissolve'] = []
    mc = None if getattr(args, 'no_grammar', False) else MotionCurves(fps)  # the motion gates' luma curves
    M['motion'] = mc
    for f, rgb in decode(args.video, info, start, count):
        small = cv2.resize(rgb, (SW, SH), interpolation=cv2.INTER_AREA).astype(np.int16)
        if mc is not None:
            mc.feed(f, motion_luma(small.astype(np.uint8)))
        if probe_m is not None or getattr(args, '_dissolve', False):
            g8 = cv2.cvtColor(small.astype(np.uint8), cv2.COLOR_RGB2GRAY) if probe_m is None or (probe_m.w, probe_m.h) == (SW, SH) else \
                cv2.resize(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), (probe_m.w, probe_m.h), interpolation=cv2.INTER_AREA)
            if (g8.shape[1], g8.shape[0]) != (SW, SH) and getattr(args, '_dissolve', False):
                g8d = cv2.cvtColor(small.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            else:
                g8d = g8
            if probe_m is not None:
                probe_m.feed(f, g8)
            if getattr(args, '_dissolve', False):
                disq.append((f, g8d.astype(np.float32)))
                if len(disq) == disq.maxlen:
                    hit = blend_test([x[1] for x in disq])
                    if hit:
                        M['dissolve'].append(dict(frm=disq[0][0], to=disq[-1][0], **hit))
        M['idx'].append(f)
        if smallq:
            diff = np.abs(small - smallq[-1])
            M['d'].append(float(diff.mean()))
            M['nchg'].append(int((diff.max(axis=2) > 24).sum()))
            M['dr'].append([float(diff[y:y + h, x:x + w].mean()) for (x, y, w, h) in rboxes])
        else:
            M['d'].append(np.nan)
            M['nchg'].append(0)
            M['dr'].append([0.0] * 9)
        smallq.append(small)
        if len(smallq) == 3:  # change from f-2 to f, stored at f-1 (out-and-back test)
            M['d2'].append(float(np.abs(smallq[2] - smallq[0]).mean()))
        if first_small is None:
            first_small = small
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        g16 = gray.astype(np.int16)
        for name, rows in (('top', g16[:8]), ('bottom', g16[-1:-9:-1]), ('left', g16[:, :8].T),
                           ('right', g16[:, -1:-9:-1].T)):
            M['depth'][name].append(edge_depth(rows, args.border_delta, args.border_frac))

        half = cv2.resize(gray, (hw, hh), interpolation=cv2.INTER_AREA).astype(np.int16)
        halfq.append((f, half))
        if len(halfq) == 3:
            (_, g0), (f1, g1), (_, g2) = halfq
            agree = np.abs(g2 - g0) < 30
            odd = (np.abs(g1 - g0) > args.ghost_delta) & (np.abs(g1 - g2) > args.ghost_delta) & agree
            n_odd = int(odd.sum()) * gscale
            if n_odd > args.ghost_px:
                ys, xs = np.nonzero(odd)
                x0, x1 = max(0, xs.min() - ghost_margin), min(hw, xs.max() + ghost_margin + 1)
                y0, y1 = max(0, ys.min() - ghost_margin), min(hh, ys.max() + ghost_margin + 1)
                moving = int((~agree[y0:y1, x0:x1]).sum()) * gscale
                bx, by = int(xs.min() * 2), int(ys.min() * 2)
                item = dict(frame=f1, px=int(n_odd), motion_px=int(moving),
                            bbox=[bx, by, int(xs.max() * 2) - bx + 2, int(ys.max() * 2) - by + 2])
                (M['ghosts'] if n_odd > 1.5 * moving else M['crossings']).append(item)

        lap = cv2.Laplacian(half.astype(np.float32), cv2.CV_32F)
        M['sharp'].append([float(lap[y:y + h, x:x + w].var()) for (x, y, w, h) in sboxes])

        if tracks:
            gf = gray.astype(np.float32)
            for k, (x, y, w, h) in tracks.items():
                cur = gf[y:y + h, x:x + w]
                prv = prev_gray[y:y + h, x:x + w] if prev_gray is not None else None
                if prv is None or cur.std() < 4 or prv.std() < 4:
                    M['tv'][k].append((np.nan, np.nan))
                    M['tr'][k].append(0.0)
                    continue
                (dx, dy), resp = cv2.phaseCorrelate(prv, cur, hann[k])
                M['tv'][k].append((dx, dy))
                M['tr'][k].append(resp)
            prev_gray = gf

        if not args.no_banding and (f - start) % band_every == 0:
            bt = banding_tiles(gray)
            area = float(bt.mean())
            if area > 0 or len(M['band']) < 1:
                img = cv2.cvtColor(stretch(gray), cv2.COLOR_GRAY2BGR)
                for (ty, tx) in zip(*np.nonzero(bt)):
                    cv2.rectangle(img, (tx * BAND_T, ty * BAND_T), ((tx + 1) * BAND_T - 1, (ty + 1) * BAND_T - 1),
                                  (0, 0, 255), 3)
                M['band'].append(dict(frame=f, area=round(area, 4), tiles=int(bt.sum()),
                                      _img=cv2.resize(img, (480, int(480 * H / W)), interpolation=cv2.INTER_AREA)))

        if other is not None:
            try:
                _, orgb = next(other)
                osmall = cv2.resize(orgb, (SW, SH), interpolation=cv2.INTER_AREA).astype(np.int16)
                M['det'].append((f, float(np.abs(small - osmall).mean())))
            except StopIteration:
                other = None
                M['det'].append((f, np.nan))
    if not M['idx']:
        die('decoded 0 frames (bad file, or --from beyond the end)')
    M['first_small'], M['last_small'] = first_small, smallq[-1]
    return M


# ------------------------------------------------------------------------------------------
# pass 2: classify
# ------------------------------------------------------------------------------------------
def evaluate(args, info, M, decl):
    fps = info['fps']
    if args.max_end_hold is None:  # the audio's decay: 2 s whatever the frame rate
        args.max_end_hold = int(round(2 * fps)) + 1
    cuts, freezes, ignore, acts, moments, reading, cues_fps, extra = decl
    k_ = fps / cues_fps if cues_fps else 1.0  # cues frames -> video frames
    reading = [(int(round(a * k_)), int(round(b * k_))) for a, b in reading]

    def read_run(fa, fb, mean_mad):
        # a run inside one reading window that still changes a little: a held line being read
        return mean_mad >= READ_MAD and any(fa >= x and fb < y for x, y in reading)

    idx = np.array(M['idx'])
    f0, n, last = int(idx[0]), len(idx), int(idx[-1])
    dd = np.nan_to_num(np.array(M['d'], dtype=np.float64), nan=0.0)
    nchg = np.array(M['nchg'])
    dr = np.array(M['dr'])
    seams = sorted(a for a, _ in acts.values() if a > 0)
    flags = []

    def ignored(f):
        return in_ranges(f, ignore)

    def add(check, severity, frame, note, **kw):
        first = frame if isinstance(frame, int) else int(str(frame).split('-')[0])
        item = dict(check=check, severity=severity, frame=frame, t=round(first / fps, 3), note=note)
        if acts:
            item['act'] = act_of(first, acts)
        item.update(kw)
        flags.append(item)

    # --- spikes: whole frame, then each of the 9 regions (small pops hide in the global mean)
    def spike_events(x):
        cand = [k for k in range(1, n) if not ignored(f0 + k) and x[k] > args.spike_min * scale
                and x[k] > args.spike_ratio * rolling_median_excl(x, k) + args.spike_add]
        evs = []
        for k in cand:
            b = rolling_median_excl(x, k)
            e = b + 0.35 * (x[k] - b)
            a_, z_ = k, k
            while a_ - 1 >= 1 and x[a_ - 1] > e and k - a_ < 6:
                a_ -= 1
            while z_ + 1 < n and x[z_ + 1] > e and z_ - k < 6:
                z_ += 1
            if evs and a_ <= evs[-1]['z'] + 1:
                ev = evs[-1]
                ev['z'] = max(ev['z'], z_)
                if x[k] > x[ev['k']]:
                    ev['k'], ev['base'] = k, b
            else:
                evs.append(dict(a=a_, z=z_, k=k, base=b))
        return evs

    scale = 1.0
    events = [dict(ev, region=None, series=dd) for ev in spike_events(dd)]
    scale = args.region_spike_min / args.spike_min
    for rg, box in enumerate(M['rboxes']):
        x = dr[:, rg]
        for ev in spike_events(x):
            if any(g['a'] - 1 <= ev['z'] and ev['a'] <= g['z'] + 1 for g in events if g['region'] is None):
                continue
            events.append(dict(ev, region=rg, series=x))
    events.sort(key=lambda ev: (ev['k'], -1 if ev['region'] is None else ev['region']))

    need = sorted({f0 + ev['k'] for ev in events if ev['z'] - ev['a'] + 1 < args.burst_frames}
                  | {f0 + ev['k'] - 1 for ev in events if ev['z'] - ev['a'] + 1 < args.burst_frames})
    smalls, spans = {}, []
    for f in need:  # re-decode the frames of short events for the flow test, in merged spans
        if spans and f - spans[-1][1] <= 30:
            spans[-1][1] = f
        else:
            spans.append([f, f])
    wanted = set(need)
    for a, b in spans:
        for f, im in decode(args.video, info, a, b - a + 1, size=(SW, SH)):
            if f in wanted:
                smalls[f] = im.copy()
    spikes = []
    for ev in events:
        x, rg = ev['series'], ev['region']
        fa, fz, fk = f0 + ev['a'], f0 + ev['z'], f0 + ev['k']
        L = fz - fa + 1
        it = dict(frame=fk, frames=[fa, fz], mad=round(float(x[ev['k']]), 3), neighbour_median=round(ev['base'], 3))
        where = ''
        if rg is not None:
            bx, by, bw, bh = M['rboxes'][rg]
            k4 = info['w'] / SW
            it['region'] = [int(bx * k4), int(by * k4), int(bw * k4), int(bh * k4)]
            where = f' in region {it["region"]}'
        seam = next((s for s in seams if fa - 1 <= s <= fz + 1), None)
        on_cue = next((m for m in moments if fa - 2 <= m <= fz + 2), None)
        if any(a - 1 <= fz and fa <= b + 1 for a, b in cuts):
            it['class'] = 'cut'
        elif L >= args.burst_frames:
            it['class'] = 'burst'
        else:
            if fk - 1 in smalls and fk in smalls:
                pa, pb = smalls[fk - 1], smalls[fk]
                if rg is not None:
                    bx, by, bw, bh = M['rboxes'][rg]
                    pa, pb = pa[by:by + bh, bx:bx + bw], pb[by:by + bh, bx:bx + bw]
                res = flow_residual(pa, pb)
            else:
                res = 1.0
            it['flow_residual'] = round(res, 2)
            j = ev['a'] - 1  # d2[j] is the change across the middle frame a (out-and-back test)
            it['out_and_back'] = bool(rg is None and L == 2 and 0 <= j < len(M['d2'])
                                      and M['d2'][j] < 0.5 * (dd[ev['a']] + dd[ev['z']]))
            busy = rg is not None and rolling_median_excl(dd, ev['k']) > args.region_busy * x[ev['k']]
            if res < args.flow_explained:
                it['class'] = 'motion'
            elif busy:
                it['class'] = 'busy'  # the whole frame is changing a lot: part of a larger move
            elif seam is not None:
                it['class'] = 'seam-pop'
            elif on_cue is not None:
                it['class'] = 'hit' if rg is None else 'region-hit'
            else:
                it['class'] = 'pop'
        it['seam'] = seam
        it['cue'] = on_cue
        spikes.append(it)
        what = 'a one-frame image' if it.get('out_and_back') else f'a {L}-frame change'
        size = f'({it["mad"]} vs {ev["base"]:.2f} around it{where})'
        if it['class'] == 'seam-pop':
            add('spike', 'fail', fk, f'{what} at the act seam f{seam} {size} that motion does not explain: a '
                'property flipping across the cut; match it on both sides, or declare the cut',
                mad=it['mad'], cls=it['class'], region=it.get('region'))
        elif it['class'] == 'pop':
            add('spike', 'fail', fk, f'{what} {size} that motion does not explain and no cue marks: a pop, a '
                'fade collapsing into 1-2 frames, or an undeclared cut', mad=it['mad'], cls=it['class'],
                region=it.get('region'))
        elif it['class'] == 'hit':
            add('spike', 'warn', fk, f'{what} on the cue at f{on_cue} {size}: fine if it is a designed hit; a '
                'fade or reveal that finishes in 1-2 frames reads as a pop', mad=it['mad'], cls=it['class'],
                region=it.get('region'))

    # --- stalls
    stalls = []
    for k in range(2, n - 1):
        f = f0 + k
        if ignored(f) or in_ranges(f, freezes, 1):
            continue
        if dd[k] < args.stall_max and dd[k - 1] > args.stall_moving and dd[k + 1] > args.stall_moving:
            seam = next((s for s in seams if abs(s - f) <= 1), None)
            stalls.append(dict(frame=f, mad=round(float(dd[k]), 3), before=round(float(dd[k - 1]), 2),
                               after=round(float(dd[k + 1]), 2), seam=seam))
            add('stall', 'fail', f, f'frame {f} repeats frame {f - 1} inside motion (stop-hold-go)'
                + (f' at the seam f{seam}' if seam else '') + '; show the rest pose once or keep the move alive')

    # --- holds
    still = dd < args.hold_mad
    still[0] = False
    holds = []
    for a, b in runs(still):
        fa, fb = f0 + a - 1, f0 + b
        length = fb - fa + 1
        if length <= args.max_hold:
            continue
        frozen = float(np.percentile(nchg[a:b + 1], 90)) < args.frozen_px  # a stray moving frame is not life
        declared = any(fa >= x - 2 and fb <= y + 2 for x, y in freezes)
        at_end = fb >= info['frames'] - 2
        mean_mad = float(dd[a:b + 1].mean())
        kind = ('declared' if declared else 'end' if at_end else 'read' if read_run(fa, fb, mean_mad)
                else ('frozen' if frozen else 'quiet'))
        holds.append({'from': fa, 'to': fb, 'frames': length, 'seconds': round(length / fps, 2), 'kind': kind,
                      'mean_mad': round(mean_mad, 3), 'max_changed_px': int(nchg[a:b + 1].max())})
        if kind in ('declared', 'read') or ignored(fa) or ignored(fb):
            continue
        if kind == 'end':
            if length > args.max_end_hold:
                add('hold', 'fail', f'{fa}-{fb}', f'static end tail of {length} f ({length / fps:.1f} s); keep it <= '
                    f'{args.max_end_hold} f (the audio decay) or give it a visible build (a slow push or drift)')
        elif kind == 'frozen':
            add('hold', 'fail', f'{fa}-{fb}', f'{length} f ({length / fps:.1f} s) frozen: reads as a stalled player; '
                'add a build (push, drift, breath) or declare it with --freeze-ok')
        else:
            add('hold', 'warn', f'{fa}-{fb}', f'{length} f ({length / fps:.1f} s) where only small elements move '
                f'(mean change {holds[-1]["mean_mad"]}): the frame reads locked-off; add a push or drift')

    # --- quiet stretches that are not already holds
    quiet = []
    win = args.quiet_window
    if n > win:
        cs = np.concatenate([[0], np.cumsum(dd)])
        mean = (cs[win:] - cs[:-win]) / win  # mean[k] covers dd[k..k+win-1]
        for a, b in runs(mean < args.quiet_mad):
            fa, fb = f0 + a, f0 + b + win - 1
            if any(h['from'] <= fb and fa <= h['to'] for h in holds):
                continue
            if any(fa >= x - 2 and fb <= y + 2 for x, y in freezes) or ignored(fa):
                continue
            q = {'from': fa, 'to': fb, 'mean_mad': round(float(dd[a:b + win].mean()), 3)}
            q['kind'] = 'read' if read_run(fa, fb, q['mean_mad']) else 'quiet'
            quiet.append(q)
            if q['kind'] == 'quiet':
                add('quiet', 'warn', f'{fa}-{fb}', f'{fb - fa + 1} f of near-stillness (mean change {q["mean_mad"]}); '
                    'fine for a read, otherwise add drift or a push')

    # --- hook: the opening carries at least the film's typical energy (a muted feed decides in second one)
    hook = None
    hw = int(round(2 * fps))
    if n <= 3 * hw:  # a sting or a short cut: judge its first second against its typical second
        hw = int(round(fps))
    if f0 == 0 and last + 1 >= info['frames'] - 2 and n > 3 * hw and not getattr(args, 'loop', False):
        cs = np.concatenate([[0], np.cumsum(dd)])
        typical = float(np.median((cs[hw:] - cs[:-hw]) / hw))
        opening = float(dd[1:hw].mean())
        hook = dict(first_2s=round(opening, 3), typical_2s=round(typical, 3))
        if opening < max(0.5 if hw > fps * 1.5 else 0.0, 0.5 * typical) and not ignored(0):
            add('hook', 'warn', f'0-{hw - 1}', f'the first {hw / fps:.0f} s move {opening:.2f} against a typical {hw / fps:.0f} s of {typical:.2f}: '
                'a still opening loses a muted feed; start inside the action (the device already moving, the first '
                'change by 0.5 s) and let the first line land over motion')

    # --- a still opening: the first visible change belongs in the first 0.1-0.4 s (house), and a still
    # title held 2.7 s before any motion reads as a slow hook. "Still" is
    # measured on the film's own scale (a fine-line sting moves less than a product film): the first
    # half second whose mean change passes 0.3x the median change of the film's moving frames.
    first_change = None
    if f0 == 0 and not getattr(args, 'loop', False) and n > fps:
        moving = dd[1:][dd[1:] > args.hold_mad]
        thr = max(0.03, 0.3 * float(np.median(moving))) if len(moving) else 0.03
        w = max(1, int(round(fps / 2)))
        cs = np.concatenate([[0], np.cumsum(dd)])
        over = np.nonzero((cs[w:] - cs[:-w]) / w > thr)[0]
        first_change = round(float(over[0]) / fps, 2) if len(over) else round(n / fps, 2)
        hook = {**(hook or {}), 'first_change_s': first_change}
        if first_change > 1.0 and not ignored(0) and not any(x <= 2 for x, _ in freezes):
            add('hook', 'fail' if first_change > 2.5 else 'warn', f'0-{int(first_change * fps)}',
                f'the first visible change comes at {first_change:.1f} s: it belongs inside 0.5 s, and the first '
                'hard change (a cut, a reveal, a surge) by about 1.3 s. Start inside the action, put a push or drift '
                'under the first read, or declare a designed still with --freeze-ok')

    # --- ghosts (a declared flash, step or hard seam is designed: the timeline's or a primitive's declares())
    designed = [(int(round(x['f'] * k_)), int(round((x['f'] + int(x.get('frames', 1)) - 1) * k_))) for x in extra.get('flashes', [])]
    # a stepped range covers a one-frame image only where its poses may last one frame: a declared cadence that holds
    # each pose 2 video frames or more never draws one, so a ghost inside it is still a fault (a stale layer, a race)
    def pose_frames(r):
        if _num(r.get('fps')) and r['fps'] > 0:
            return fps / float(r['fps'])
        return float(r['on']) * k_ if _num(r.get('on')) else None
    designed += [(int(round(r['from'] * k_)), int(round(r['to'] * k_)) - 1) for r in extra.get('stepped', [])
                 if pose_frames(r) is None or pose_frames(r) < 2]
    designed += [(int(round(s['at'] * k_)), int(round(s['at'] * k_))) for s in extra.get('seams', []) if s.get('kind') in PUNCH]
    for g in M['ghosts']:
        if ignored(g['frame']) or in_ranges(g['frame'], cuts, 1) or in_ranges(g['frame'], designed, 1):
            continue
        add('ghost', 'fail', g['frame'], f'one-frame image on {g["px"]} px that neither neighbour has and nothing '
            'near it moves (stale layer, compositor race, one-frame flash): inspect with grab.sh', bbox=g['bbox'])

    # --- border slivers: constant depth for >= N frames
    borders = []
    for edge, dep in M['depth'].items():
        dep = np.array(dep)
        k = 0
        while k < n:
            if dep[k] == 0:
                k += 1
                continue
            j = k
            while j + 1 < n and dep[j + 1] == dep[k]:
                j += 1
            if j - k + 1 >= args.sliver_frames and not ignored(f0 + k):
                borders.append(dict(edge=edge, depth_px=int(dep[k]), frames=[f0 + k, f0 + j]))
                add('border', 'fail', f'{f0 + k}-{f0 + j}', f'{edge} edge: the outer {dep[k]} px differ from the '
                    f'pixels inside for {j - k + 1} frames (a sliver or gap); overscan moving layers, clamp the camera')
            k = j + 1

    # --- judder (whole-pixel stairs)
    judder = []
    for key, box in M['tracks'].items():
        v = np.array(M['tv'][key], dtype=np.float64)
        r = np.array(M['tr'][key], dtype=np.float64)
        for w in stairs(v, r, f0, args.judder_window, args.judder_resp):
            if ignored(w['from']) or ignored(w['to']):
                continue
            w['track'], w['box'] = key, list(box)
            judder.append(w)
            add('judder', 'warn', f'{w["from"]}-{w["to"]}', f'a slow move ({w["speed"]} px/f) in {key} {list(box)} '
                f'advances in whole-pixel stairs ({w["jumps"]} jumps): put all translation inside one transform '
                'and animate no left/top', track=key)

    # --- sharpness steps in otherwise calm regions
    S = np.array(M['sharp'])
    sharp_steps = []
    spiky = [(s_['frames'][0] - 1, s_['frames'][1] + 1) for s_ in spikes if s_['class'] != 'motion']
    for k in range(2, n - 1):
        f = f0 + k
        if ignored(f) or in_ranges(f, cuts, 1) or in_ranges(f, spiky):
            continue  # a spike there is already reported
        for rg in range(S.shape[1]):
            a_, b_ = S[k - 1, rg], S[k, rg]
            if max(a_, b_) < args.sharp_min:
                continue
            ratio = max(a_, b_) / max(min(a_, b_), 1e-3)
            if ratio < args.sharp_ratio or dr[k - 1, rg] > 1.0 or dr[k + 1, rg] > 1.0:
                continue
            p = max(S[k - 1, rg], S[k - 2, rg]) / max(min(S[k - 1, rg], S[k - 2, rg]), 1e-3)
            q = max(S[k, rg], S[k + 1, rg]) / max(min(S[k, rg], S[k + 1, rg]), 1e-3)
            if p < 1.5 and q < 1.5:
                x, y, w, h = M['sboxes'][rg]
                reg = [x * 2, y * 2, w * 2, h * 2]
                sharp_steps.append(dict(frame=f, region=reg, before=round(float(a_), 1), after=round(float(b_), 1)))
                add('sharpness', 'warn', f, f'sharpness {a_:.0f} -> {b_:.0f} in one frame in region {reg} while it '
                    'is otherwise still: a stepped blur ramp; cross-fade a sharp and a blurred copy (RackFocus)')
                break

    # --- banding
    band = [{k: v for k, v in s.items() if k != '_img'} for s in M['band']]
    for s in band:
        s['flagged'] = s['area'] > args.band_area
        if s['flagged'] and not ignored(s['frame']):
            add('banding', 'warn', s['frame'], f'{s["area"] * 100:.1f}% of the frame ({s["tiles"]} tiles) is smooth '
                'gradient in flat 8-bit plateaus: visible bands; use dithered PNG backdrops (red boxes in the sheet)')
    band_sheet = None
    if M['band'] and args.banding_sheet:
        picks = sorted(M['band'], key=lambda s: -s['area'])[:8]
        rest = [s for s in M['band'] if s not in picks]
        picks += rest[:: max(1, len(rest) // max(1, 12 - len(picks)))][:12 - len(picks)]
        picks.sort(key=lambda s: s['frame'])
        ims = [label(s['_img'].copy(), f'f{s["frame"]} {s["frame"] / fps:.2f}s',
                     f'x12  banded {s["area"] * 100:.1f}%') for s in picks]
        os.makedirs(os.path.dirname(os.path.abspath(args.banding_sheet)), exist_ok=True)
        cv2.imwrite(args.banding_sheet, tile(ims, 4))
        band_sheet = args.banding_sheet

    # --- compression smear on flat fields
    smear = [{k: v for k, v in x.items() if k != '_img'} for x in M.get('smear', [])]
    over = [x for x in smear if x['area'] > args.smear_area and not ignored(x['frame'])]
    for x in smear:
        x['flagged'] = x in over
    if over:
        sev = 'fail' if len(over) >= 2 else 'warn'
        worst = max(over, key=lambda x: x['area'])
        span = f'{over[0]["frame"]}-{over[-1]["frame"]}' if len(over) > 1 else over[0]['frame']
        add('smear', sev, span, f'compression smear on the flat field (level {worst["level"]}) in {len(over)} sampled '
            f'frames, up to {worst["area"] * 100:.0f}% of the frame at f{worst["frame"]}: blocks of fine 1-level texture '
            'next to clean ones (smear sheet). Blurred master: re-run the current scripts/accumulate.py, which rounds '
            'flat fields exactly; otherwise encode at a lower CRF or 10-bit', frames=[x['frame'] for x in over][:50])
    smear_sheet = None
    if M.get('smear') and args.smear_sheet:
        picks = sorted(M['smear'], key=lambda x: -x['area'])[:4]
        rest = [x for x in M['smear'] if x not in picks]
        picks += rest[:: max(1, len(rest) // 4)][:8 - len(picks)]
        picks.sort(key=lambda x: x['frame'])
        ims = [label(x['_img'].copy(), f'f{x["frame"]} {x["frame"] / fps:.2f}s',
                     f'x25 smear {x["area"] * 100:.0f}% (field {x["field"] * 100:.0f}%)') for x in picks]
        os.makedirs(os.path.dirname(os.path.abspath(args.smear_sheet)), exist_ok=True)
        cv2.imwrite(args.smear_sheet, tile(ims, 4))
        smear_sheet = args.smear_sheet

    # --- loop seam
    loop = None
    if args.loop:
        seam = float(np.abs(M['last_small'] - M['first_small']).mean())
        ends = np.concatenate([dd[1:9], dd[-8:]])
        local = float(np.median(ends)) if len(ends) else 0.0
        limit = max(args.seam_abs, args.seam_ratio * local)
        loop = {'seam_mad': round(seam, 3), 'median_step_at_ends': round(local, 3), 'limit': round(limit, 3),
                'pass': seam <= limit}
        if not loop['pass']:
            add('loop_seam', 'fail', last, f'loop seam change {seam:.2f} > {limit:.2f}: the last frame does not flow '
                'into frame 0 (match state and velocity; the loop is whole bars long)')

    # --- determinism
    det = None
    if args.against:
        vals = np.array([x for _, x in M['det']], dtype=np.float64)
        med = float(np.nanmedian(vals)) if len(vals) and not np.isnan(vals).all() else 0.0
        lim = max(args.det_min, args.det_ratio * med)
        bad = [dict(frame=f, mad=round(x, 3)) for f, x in M['det'] if not np.isnan(x) and x > lim]
        det = dict(against=args.against, median=round(med, 4), limit=round(lim, 3), frames=bad[:200])
        for b in bad[:50]:
            add('determinism', 'fail', b['frame'], f'the two renders differ here ({b["mad"]}): nondeterministic '
                'frame; look for will-change on a blurred layer, Math.random, Date.now')
        if np.isnan(vals).any() or probe(args.against)['frames'] != info['frames']:
            add('determinism', 'fail', last, 'the two renders have different frame counts')

    # --- grammar: the picture never freezes, cuts carry speed, no dissolves (cues with 1.2 declarations,
    # or --grammar; without them these are reported as info so a 1.1 film keeps its verdict)
    grammar = run_grammar(args, info, M, extra, k_, cuts, freezes, ignored, reading, acts, add, spikes, stalls, flags)

    # --- energy summary for pacing reads
    step = max(1, int(round(fps)))
    per_sec = [round(float(dd[max(1, s):s + step].mean()), 2) for s in range(0, n, step) if len(dd[max(1, s):s + step])]
    per_act = {}
    for name, (a, b) in acts.items():
        lo, hi = max(1, a - f0), min(n, b - f0)
        if hi > lo:
            seg = dd[lo:hi]
            per_act[name] = dict(mean=round(float(seg.mean()), 2), p90=round(float(np.percentile(seg, 90)), 2),
                                 still_frac=round(float((seg < args.hold_mad).mean()), 2))
    seam_table = [dict(frame=s, mad=round(float(dd[s - f0]), 3), neighbour_median=round(rolling_median_excl(dd, s - f0), 3))
                  for s in seams if 1 <= s - f0 < n]

    sev = {'fail': 0, 'warn': 1, 'info': 2}
    flags.sort(key=lambda x: (sev[x['severity']], int(str(x['frame']).split('-')[0])))
    fails = sum(1 for x in flags if x['severity'] == 'fail')
    warns = sum(1 for x in flags if x['severity'] == 'warn')
    counts = {}
    for s in spikes:
        counts[s['class']] = counts.get(s['class'], 0) + 1
    return {
        'file': args.video, 'fps': round(fps, 3), 'size': [info['w'], info['h']], 'frames': n, 'range': [f0, last],
        'pass': fails == 0, 'fails': fails, 'warnings': warns,
        'declared': dict(cuts=[list(x) for x in cuts], freezes=[list(x) for x in freezes],
                         ignore=[list(x) for x in ignore], cue_moments=len(moments), reading=[list(x) for x in reading]),
        'pace': args.pace,
        'thresholds': {k: getattr(args, k) for k in (
            'spike_min', 'region_spike_min', 'region_busy', 'spike_ratio', 'spike_add', 'burst_frames', 'flow_explained', 'stall_max', 'stall_moving',
            'hold_mad', 'max_hold', 'frozen_px', 'max_end_hold', 'quiet_window', 'quiet_mad', 'ghost_delta',
            'ghost_px', 'border_delta', 'border_frac', 'sliver_frames', 'judder_window', 'judder_resp',
            'sharp_ratio', 'sharp_min', 'band_area', 'smear_area', 'seam_abs', 'seam_ratio', 'det_min', 'det_ratio')},
        'stats': dict(mad_median=round(float(np.median(dd[1:])), 3) if n > 1 else 0,
                      mad_p90=round(float(np.percentile(dd[1:], 90)), 3) if n > 1 else 0,
                      mad_max=round(float(dd.max()), 3), mad_max_frame=int(f0 + int(np.argmax(dd))),
                      spike_classes=counts, fast_crossings=len(M['crossings']),
                      energy_per_second=per_sec, energy_per_act=per_act),
        'flags': flags,
        'checks': dict(spikes=spikes, stalls=stalls, holds=holds, quiet=quiet, hook=hook, ghosts=M['ghosts'],
                       crossings=M['crossings'][:100], borders=borders, judder=judder, sharpness=sharp_steps,
                       banding=band, banding_sheet=band_sheet, smear=smear, smear_sheet=smear_sheet,
                       seams=seam_table, loop=loop, determinism=det, grammar=grammar),
    }


def grammar_on(args, extra):
    """The grammar checks fail only on a film that declares itself (cues.json with `look` or
    `declared`), or with --grammar; otherwise they are reported as info."""
    if getattr(args, 'no_grammar', False):
        return False
    return bool(getattr(args, 'grammar', False) or extra.get('look') or extra.get('seams') or extra.get('end'))


def cut_frames(extra, acts, cuts, k_):
    """Every designed cut in video frames: act boundaries, declared seams and declared hard cuts."""
    out = {int(round(a * k_)) for a, _ in acts.values() if a > 0}
    out |= {int(round(s['at'] * k_)) for s in extra.get('seams', [])}
    out |= {a for a, _ in cuts}
    return sorted(out)


def run_grammar(args, info, M, extra, k_, cuts, freezes, ignored, reading, acts, add, spikes, stalls, flags):
    fps = info['fps']
    g12 = grammar_on(args, extra)
    sev = (lambda s: s) if g12 else (lambda s: 'info')
    vf = lambda x: int(round(x * k_))  # noqa: E731 (cue frames -> video frames)
    idx = M['idx']
    f0, last = idx[0], idx[-1]
    out = dict(enabled=g12)
    end = extra.get('end')
    end_rng = (vf(end['from']), vf(end['to'])) if end else None
    # an undeclared film (no look, seams or END in its cues) gets the default end lock of look-audit.py,
    # the last 2 s: its closing card may lock off without failing the holds
    undeclared = not (extra.get('look') or extra.get('seams') or extra.get('end'))
    hold_end = end_rng or ((max(f0, last + 1 - int(round(2 * fps))), last + 1) if undeclared else None)
    in_end = lambda f: bool(hold_end and hold_end[0] <= f < hold_end[1])  # noqa: E731

    # declared designed artifacts: a step, a flash, a hard seam or a velocity cut (a new picture carrying the speed;
    # carried-cut checks its direction and speed) is craft, not a pop
    disc = set()
    for r in extra.get('stepped', []):
        disc |= set(range(vf(r['from']), vf(r['to'])))
    for x in extra.get('flashes', []):
        disc |= set(range(vf(x['f']), vf(x['f']) + int(x.get('frames', 1)) + 1))
    for s in extra.get('seams', []):
        if s.get('kind') in PUNCH or s.get('kind') == 'velocity':
            disc |= {vf(s['at']) - 1, vf(s['at'])}
    stepped = [(vf(r['from']), vf(r['to'])) for r in extra.get('stepped', [])]
    declared_hits = []
    for it in spikes:
        if it['class'] in ('pop', 'seam-pop', 'hit', 'region-hit') and any(g in disc for g in range(it['frames'][0] - 1, it['frames'][1] + 2)):
            declared_hits.append(it['frame'])
            it['class'] = 'declared'
    for st in stalls:
        if any(a <= st['frame'] < b for a, b in stepped):
            st['declared'] = True
            declared_hits.append(st['frame'])
    if declared_hits:
        flags[:] = [x for x in flags if not (x['check'] in ('spike', 'stall') and x['frame'] in declared_hits)]
        add('declared', 'info', declared_hits[0], f'{len(declared_hits)} designed step/flash/seam frame(s) accepted from the declarations', frames=declared_hits[:50])

    probe_m = M.get('probe')
    if probe_m is not None:
        win, ws, k = probe_m.win, probe_m.wstride, probe_m.k
        body = [f for f in range(f0 + k, last + 1) if not in_end(f) and not in_ranges(f, freezes) and not ignored(f)]
        state = {f: window_at(win, f, ws) for f in body}
        frozen = [f for f in body if state[f] is not None and not state[f]['live'] and state[f]['layer_pxs'] < LIVE_PXS
                  and state[f].get('change', 0) < CHANGE_LIVE]
        fz = set(frozen)

        def too_long(r):  # 0.8 s; a read lock may hold 1 s inside a reading window (lib/look.ts GRAMMAR.hold.readLockS)
            lock = any(min(r[-1] + 1, y) - max(r[0], x) >= 0.5 * len(r) for x, y in reading)
            return len(r) > (READ_LOCK_S if lock else 0.8) * fps

        runs_f, run = [], []
        for f in body:
            if f in fz and (not run or f == run[-1] + 1):
                run.append(f)
            else:
                if run and too_long(run):
                    runs_f.append((run[0], run[-1]))
                run = [f] if f in fz else []
        if run and too_long(run):
            runs_f.append((run[0], run[-1]))
        for a, b in runs_f:
            add('hold-drift', sev('fail'), f'{a}-{b}', f'{b - a + 1} f ({(b - a + 1) / fps:.1f} s) frozen outside the end lock: nothing drifts '
                f'{LIVE_PXS:g} px/s or creeps {LIVE_PCT:g} %/s, and the ground does not change. Give the hold life (a creep of 2-15 %/s, a drift '
                'of 6-90 px/s, light moving over the ground) and turn it into the exit in its last 12-20 f@60')
        fast_read = [f for f in body if state[f] is not None and any(x <= f < y for x, y in reading)
                     and (state[f]['cam_pxs'] > 90 or state[f]['cam_pct'] > 15)]
        if fast_read:
            add('hold-drift', 'warn', fast_read[0], f'{len(fast_read)} frame(s) move faster than 90 px/s or 15 %/s while text is read '
                f'(from f{fast_read[0]}): a read holds near still (drift 6-90 px/s, creep 2-15 %/s)')
        measured = [f for f in body if state[f] is not None]
        still = [f for f in measured if not state[f]['moving']]
        share = len(still) / max(1, len(measured))
        out['holds'] = dict(frozen_runs=[list(r) for r in runs_f], static_share=round(share, 3), body_frames=len(measured),
                            live_share=round(sum(1 for f in measured if state[f]['live']) / max(1, len(measured)), 3))
        if share > 0.15:
            add('static-share', sev('warn'), f'{f0}-{last}', f'{share * 100:.0f} % of the body stands still (camera, layers and ground '
                'all under 6 px/s): keep it under 15 % (a premium film is dense in time and calm in space)')

        cuts_all = [c for c in cut_frames(extra, acts, cuts, k_) if f0 + k < c < last - 1]
        seam_at = {vf(s['at']): s for s in extra.get('seams', [])}
        rows = []
        N = max(4, int(round(20 * fps / 60)))
        for c in cuts_all:
            bw, aw = win.get(c - 1), win.get(c + k)
            sp = [probe_m.pair.get(g, {}).get('speed') for g in range(c - N, c)]
            hold = [probe_m.pair.get(g, {}).get('speed') for g in range(c - 2 * N, c - N)]
            row = dict(frame=c, kind=seam_at.get(c, {}).get('kind', 'act' if c in {vf(a) for a, _ in acts.values()} else 'cut'),
                       before_moving=bool(bw and bw['moving']), after_moving=bool(aw and aw['moving']))
            if None not in sp and len(sp) >= 4:
                h = float(np.median([x for x in hold if x is not None])) if any(x is not None for x in hold) else 0.0
                # the last two frames run faster than the two before the final four (x1.15), or end at 3x the hold
                end2 = (sp[-1] + sp[-2]) / 2
                before = (sp[-6] + sp[-5]) / 2 if len(sp) >= 6 else sp[0]
                rising = end2 > 0 and end2 >= 1.15 * before
                row['into'] = dict(speeds=[round(x, 1) for x in sp], hold=round(h, 1), rising=bool(rising or sp[-1] >= 3 * max(h, LIVE_PXS)))
            rows.append(row)
        out['cuts'] = rows
        dead = [r for r in rows if not r['before_moving'] and not r['after_moving']]
        if rows and len(dead) / len(rows) > 0.3:
            add('still-cut', sev('warn'), dead[0]['frame'], f'{len(dead)} of {len(rows)} cuts go from a still frame to a still frame: a shot '
                'never starts from rest; carry the speed across (velocity-matched cut, a breath, a whip)')
        cont = [r for r in rows if 'into' in r and r['kind'] not in PUNCH]
        if cont:
            up = sum(1 for r in cont if r['into']['rising'])
            out['hold_into_exit'] = round(up / len(cont), 3)
            if up / len(cont) < 0.5:
                add('hold-into-exit', sev('warn'), cont[0]['frame'], f'only {up} of {len(cont)} cuts accelerate into the cut: the last 12-20 f@60 '
                    'of a hold turn into the exit (speed growing about x1.11-1.16 a frame), and the cut falls on the fastest frame')
        car = []
        decay = 0.97 ** (60 / fps)
        for s in extra.get('seams', []):
            if s.get('kind') != 'velocity':
                continue
            at = vf(s['at'])
            vs = [probe_m.pair.get(g, {}).get('vec') for g in [at - 1] + list(range(at + 1, at + 6))]
            if any(v is None for v in vs):
                continue
            sp = [math.hypot(*v) for v in vs]
            o, i = sp[0], sp[1]
            cos = (vs[0][0] * vs[1][0] + vs[0][1] * vs[1][1]) / max(1e-6, o * i)
            ratio = i / max(1e-6, o)
            decays = all(sp[j + 1] <= sp[j] * decay + 0.5 for j in range(1, len(sp) - 1))
            ok = o >= 2 and cos >= 0.7 and 0.4 <= ratio <= 1.4 and decays
            car.append(dict(frame=at, out=round(o, 2), into=round(i, 2), ratio=round(ratio, 3), cos=round(cos, 3), after=[round(x, 2) for x in sp[2:]], ok=ok))
            if not ok:
                why = ('the outgoing shot is not moving at the cut' if o < 2 else f'direction turns (cos {cos:.2f} < 0.7)' if cos < 0.7
                       else f'incoming speed {ratio:.2f}x the outgoing (0.4-1.4x)' if not 0.4 <= ratio <= 1.4 else 'the incoming shot does not decay')
                add('carried-cut', sev('fail'), at, f'declared velocity seam f{at}: {why}; carry the speed in the same direction and let it '
                    'decay x0.78-0.93 a frame (lib/handoff.ts carriedCut)')
        out['carried'] = car

    # dissolves between unrelated images; a fade to black only at the very end
    spans = blend_spans(M.get('dissolve', []))
    ok_kinds = ('dissolveUi', 'light', 'fadeEnd')
    dis = []
    for sp in spans:
        frames60 = (sp['to'] - sp['frm']) * 60 / fps
        if frames60 < 4 or ignored(sp['frm']):
            continue
        near = [s for s in extra.get('seams', []) if s.get('kind') in ok_kinds and sp['frm'] - 3 <= vf(s['at']) <= sp['to'] + 3]
        at_end = sp['black'] and sp['to'] >= info['frames'] - 1 - 2 * fps
        cls = 'declared' if near else 'end-fade' if at_end else 'dissolve'
        dis.append(dict(frm=sp['frm'], to=sp['to'], cls=cls, black=sp['black'], ssim=sp['ssim'], alphas=sp['alphas']))
        if cls == 'dissolve':
            what = 'a fade to black' if sp['black'] else 'a dissolve between two different images'
            add('dissolve-detect', sev('fail'), f'{sp["frm"]}-{sp["to"]}', f'{what} over {sp["to"] - sp["frm"]} f: no dissolve between shots and a '
                'fade to black only at the end; build the seam from what is on screen (a carried move, a morph, a mask, light), or '
                'declare a UI dissolve (seam dissolveUi, 6-8 f@60)')
    out['dissolves'] = dis

    # the end card ends a physical story: it assembles (motion before the lock) and never fades in
    if end_rng and probe_m is not None:
        e0 = end_rng[0]
        pre = [window_at(probe_m.win, f, probe_m.wstride) for f in range(max(f0, e0 - int(1.5 * fps)), e0)]
        pre = [w for w in pre if w]
        mov = sum(1 for w in pre if w['moving']) / max(1, len(pre))
        faded = [d for d in dis if e0 - 1.5 * fps <= d['to'] <= e0 + 0.25 * fps]
        out['end_card'] = dict(frame=e0, moving_before=round(mov, 3), fades_in=bool(faded))
        if pre and mov < 0.3:
            add('end-card', sev('warn'), e0, 'the end card arrives without a story: little moves in the 1.5 s before the lock; assemble the mark, '
                'snap or settle it, slide the lockup, then hold')
        if faded:
            add('end-card', sev('warn'), faded[0]['frm'], 'the end card fades in: a lockup assembles (parts, a snap, a slide), never a fade-in on a static card')

    # continuous, decaying motion: snaps, frozen runs, settle length, event density, landings
    mc = M.get('motion')
    if mc is not None and mc.first is not None:
        out['motion'] = motion_gates(mc, fps, extra, vf, cuts, freezes, acts, hold_end, not undeclared, add, sev, ignored)
    return out


# ------------------------------------------------------------------------------------------
# motion gates: no event starts or ends in one frame, no hold freezes
# ------------------------------------------------------------------------------------------
# Measured on luma at 160x90 (area), sampled every round(fps / 30)-th frame (about 30 fps); the landings
# also at the film's own rate. The bands separate continuous, decaying motion (one long carrying move, holds
# that drift, moves that land) from the generated kind (short events that start and stop in one frame,
# dead holds between them, moves cut while still fast).
MOTION_W, MOTION_H = 160, 90
MOTION = dict(
    floor=0.05,  # a sample whose mean luma change (code values) is under this, ...
    live_delta=4,  # ... and on which fewer than `live_px` pixels change by this many code values or more, is still
    live_px=8,  # (a slow drift moves its edges by that much: 0.3 px/f@60 shifts a line's edge 5-10 values at 160x90)
    run=6,  # a frozen run: this many still samples at 30 fps
    snap_min=2.0,  # a one-sample change at least this large, ...
    snap_side=0.35,  # ... both neighbours under this share of it, is a snap
    snaps_per3=0.6,  # undeclared snaps per 3 s of body
    snap_devices=1,  # declared snap runs per film (a stepped list, a snap zoom, a flash)
    cut_min=20.0,  # a visible cut: a change this large ...
    cut_ratio=2.0,  # ... and this many times its neighbours
    peak_min=0.5,  # a motion event peaks at least this high
    key=0.2,  # an event starts and lands under this share of its peak
    decay_min=3.5,  # median samples (30 fps) from an event's peak down to `key` of it
    decay_events=3,  # the decay gate needs this many events
    primary=0.25,  # a primary move peaks at this share of the film's 90th-percentile event or more
    primary_per3=2.0,  # primary moves per 3 s of body
    stop=0.15,  # a move that goes still in one frame from above this share of its peak stops dead
    brake=0.10,  # a visible cut while a braking move is above this share of its peak cuts it mid-ease
    braking_per3=0.25,  # such cuts per 3 s of body
    frozen_s=1.0,  # without declarations: still this long in total is the film's one held stop
    episode_s=0.5,  # snaps closer than this are one device (a ticker)
    open_s=0.5,  # the opening may start from a still
)
MOTION_CUT_SEAMS = ('hard', 'velocity', 'whip', 'zoomThrough', 'colour', 'light', 'defocus', 'mask', 'wipe')
MOTION_SNAP_SEAMS = ('snapZoom', 'stepped')
MOTION_CARRY_SEAMS = ('whip', 'velocity', 'zoomThrough')


def motion_luma(img):
    """A frame (RGB or luma, any size) as the motion gates' 160x90 luma plane (float32)."""
    a = np.asarray(img)
    if a.dtype != np.uint8:
        a = np.clip(a, 0, 255).astype(np.uint8)
    if a.ndim == 3:
        if a.shape[:2] != (MOTION_H, MOTION_W):
            a = cv2.resize(a, (MOTION_W, MOTION_H), interpolation=cv2.INTER_AREA)
        return cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32)
    if a.shape != (MOTION_H, MOTION_W):
        a = cv2.resize(a, (MOTION_W, MOTION_H), interpolation=cv2.INTER_AREA)
    return a.astype(np.float32)


class MotionCurves:
    """The motion gates' curves, fed one frame at a time: d1[i] the mean luma change from the frame before,
    dk[i] the change over 1/30 s (from `step` frames before) and nk[i] how many pixels changed over that
    1/30 s by MOTION['live_delta'] or more. Index 0 is the first frame fed (`first`)."""

    def __init__(self, fps, live_delta=MOTION['live_delta']):
        self.fps = fps
        self.step = max(1, int(round(fps / 30.0)))
        self.q = deque(maxlen=self.step + 1)
        self.first = None
        self.live = live_delta
        self.d1, self.dk, self.nk = [], [], []

    def feed(self, f, y):
        if self.first is None:
            self.first = f
        self.q.append(y)
        self.d1.append(float(np.abs(y - self.q[-2]).mean()) if len(self.q) >= 2 else math.nan)
        if len(self.q) == self.step + 1:
            d = np.abs(y - self.q[0])
            self.dk.append(float(d.mean()))
            self.nk.append(int(np.count_nonzero(d >= self.live)))
        else:
            self.dk.append(math.nan)
            self.nk.append(0)


def motion_curves(frames, fps):
    """MotionCurves of a sequence of frames (RGB or luma arrays, any size)."""
    mc = MotionCurves(fps)
    for f, img in enumerate(frames):
        mc.feed(f, motion_luma(img))
    return mc


def motion_measures(d1, dk, fps, cuts=(), snaps_ok=(), carried=(), freezes=(), end_from=None, declared=True, nk=None, P=MOTION):
    """The motion measures on MotionCurves arrays. Every frame argument counts from index 0 of the curves:
    cuts, designed cut frames; snaps_ok, [(from, to)) or [(from, to, device)) declared snap ranges (stepped
    ranges, flashes, snap-zoom seams; ranges that share a device key are one device); carried, frames of declared whips and velocity cuts; freezes, [(a, b)] declared held stops
    (inclusive); end_from, the end lock's first frame; declared, the film declares itself (without
    declarations its densest snap run and up to `frozen_s` of still are its one allowance). Frames in the
    result are source frames from index 0."""
    step = max(1, int(round(fps / 30.0)))
    r = fps / step
    k30 = r / 30.0
    x1 = np.nan_to_num(np.asarray(d1, dtype=np.float64), nan=0.0)
    a = np.nan_to_num(np.asarray(dk, dtype=np.float64), nan=0.0)[::step].copy()
    n_src, n = len(x1), len(a)
    if n:
        a[0] = 0.0

    def smp(f):
        return int(math.ceil(f / step - 1e-9))

    end = n if end_from is None else max(1, min(n, smp(end_from)))
    ok = [(smp(x[0]), max(smp(x[0]) + 1, smp(x[1])), x[2] if len(x) > 2 else None) for x in snaps_ok]

    def ok_key(i):  # the device of the declared snap range sample i falls in, else False
        for s, e, key in ok:
            if s - 1 <= i < e + 1:
                return key if key is not None else ('range', s)
        return False

    def in_ok(i):
        return ok_key(i) is not False

    cutset = {smp(c) for c in cuts if 0 < smp(c) < n}
    for i in range(1 if not declared else n, n):  # a declared film names its cuts: any other jump is a snap
        nb = max(a[i - 1], a[i + 1] if i + 1 < n else 0.0)
        if a[i] >= P['cut_min'] and a[i] >= P['cut_ratio'] * nb and not in_ok(i):
            cutset.add(i)
    cutl = sorted(cutset)

    def near_cut(i, pad=1):
        return any(abs(i - c) <= pad for c in cutl)

    def groups(idx):
        out = []
        for i in idx:
            if out and i - out[-1][-1] <= P['episode_s'] * r:
                out[-1].append(i)
            else:
                out.append([i])
        return out

    def devices(idx):  # declared snaps: one device per declaration key, or per run of snaps closer than episode_s
        out = []
        for i in idx:
            key = ok_key(i)
            g = next((g for g in out if key not in (False, None) and key in g['keys']), None)
            if g is None and out and i - out[-1]['last'] <= P['episode_s'] * r:
                g = out[-1]
            if g is None:
                g = dict(keys=set(), last=i)
                out.append(g)
            if key not in (False, None):
                g['keys'].add(key)
            g['last'] = max(g['last'], i)
        return out

    # 1. snaps: one-sample changes that are not cuts
    snaps = [i for i in range(1, end) if a[i] >= P['snap_min'] and not near_cut(i) and a[i - 1] <= P['snap_side'] * a[i]
             and (i + 1 >= n or a[i + 1] <= P['snap_side'] * a[i])]
    dec = [i for i in snaps if in_ok(i)]
    und = [i for i in snaps if not in_ok(i)]
    allowance = []
    if not declared and und:
        allowance = max(groups(und), key=len)
        und = [i for i in und if i not in allowance]
        dec = sorted(dec + allowance)
    body_s = max(1.0 / r, (end - 1) / r)

    # 2. frozen runs (the opening may start still; declared held stops are craft)
    still = a[:end] < P['floor']
    if nk is not None:  # a slow drift keeps a sparse frame alive: its edges move, though the mean barely does
        still &= np.asarray(nk, dtype=np.int64)[::step][:end] < P['live_px']
    if len(still):
        still[0] = False
    st = int(round(P['open_s'] * r))
    need = max(1, int(math.ceil(P['run'] * k30 - 1e-9)))
    fz = [(smp(s), smp(e)) for s, e in freezes]
    frozen = []
    for s, e in runs(still):
        s = max(s, st)
        if e - s + 1 >= need and not any(s >= x - 1 and e <= y + 1 for x, y in fz):
            frozen.append((s, e))

    # 3. motion events (a move that starts and lands) and how long each takes to settle
    events = []
    for p in range(1, end):
        v = a[p]
        if v < P['peak_min'] or p in cutset or v < a[p - 1] or (p + 1 < n and v <= a[p + 1]):
            continue
        lo, lo_l = p, v
        while lo > 1 and a[lo - 1] <= v and (lo - 1) not in cutset:
            lo -= 1
            lo_l = min(lo_l, a[lo])
        if lo <= 1 or (lo - 1) in cutset:
            lo_l = 0.0
        hi, lo_r = p, v
        while hi + 1 < n and a[hi + 1] <= v and (hi + 1) not in cutset:
            hi += 1
            lo_r = min(lo_r, a[hi])
        if hi + 1 >= n or (hi + 1) in cutset:
            lo_r = 0.0
        if max(lo_l, lo_r) > P['key'] * v:
            continue
        span, why = n - p, 'end'
        for j in range(p + 1, n):
            if j in cutset:
                span, why = j - p, 'cut'
                break
            if a[j] <= P['key'] * v:
                span, why = j - p, 'land'
                break
        events.append(dict(frame=p * step, peak=round(float(v), 3), decay=round(span / k30, 2), ends=why))
    decays = [e['decay'] for e in events if e['ends'] == 'land' or e['decay'] >= P['decay_min']]
    top = float(np.percentile([e['peak'] for e in events], 90)) if events else 0.0
    primary = [e for e in events if e['peak'] >= P['primary'] * top]

    # 4. landings at the film's own rate: a move that stops dead, a cut into a braking move
    cut_src = {int(c) for c in cuts if 0 < c < n_src}
    for i in cutl:
        lo_f, hi_f = max(1, (i - 1) * step + 1), min(n_src, i * step + 1)
        if hi_f > lo_f and not any(lo_f <= c < hi_f for c in cut_src):
            cut_src.add(lo_f + int(np.argmax(x1[lo_f:hi_f])))
    cut_src = sorted(cut_src)

    def near_src(f, pad):
        return any(c - pad <= f <= c + pad for c in cut_src)

    hold = 2 * step
    end_src = min(n_src, end * step)
    stops = []
    for f in range(2, end_src - hold):
        if x1[f] < max(P['floor'], 4 * P['floor']) or not (x1[f + 1:f + 1 + hold] < P['floor']).all() or near_src(f + 1, step + 1):
            continue
        lo, peak, pf = f, x1[f], f
        while lo > 1 and x1[lo - 1] >= P['floor'] and not near_src(lo - 1, 0) and f - lo < 2 * fps:
            lo -= 1
            if x1[lo] > peak:
                peak, pf = x1[lo], lo
        if peak * step >= P['peak_min'] and pf < f and x1[f] > P['stop'] * peak:
            stops.append(dict(frame=f + 1, speed=round(float(x1[f] / peak), 3), peak=round(float(peak), 3)))
    braking = []
    for c in cut_src:
        if c < 4 or c >= end_src or x1[c] < max(P['snap_min'], 2 * x1[c - 1]):
            continue  # not a visible cut: the motion runs on across it
        s1, s2 = x1[c - 1], x1[c - 2]
        lo, peak, pf = c - 1, s1, c - 1
        while lo > 1 and not near_src(lo - 1, 0) and c - lo < 2 * fps and x1[lo - 1] >= P['floor']:
            lo -= 1
            if x1[lo] > peak:
                peak, pf = x1[lo], lo
        if peak * step < P['peak_min'] or pf >= c - step:
            continue
        if s1 > P['brake'] * peak and s1 < s2 and not any(abs(c - w) <= step + 1 for w in carried):
            braking.append(dict(frame=c, speed=round(float(s1 / peak), 3), peak=round(float(peak), 3)))

    return dict(
        fps=fps, step=step, body_s=round(body_s, 3), cuts=[i * step for i in cutl],
        snaps=[i * step for i in snaps], snaps_declared=[i * step for i in dec], snaps_undeclared=[i * step for i in und],
        snap_allowance=[i * step for i in allowance], snap_runs=len(devices(dec)),
        snaps_per3=round(len(und) / body_s * 3, 3),
        frozen=[[s * step, e * step] for s, e in frozen], frozen_frames30=round(sum(e - s + 1 for s, e in frozen) / k30, 2),
        events=events, events_per3=round(len(events) / body_s * 3, 3),
        primary_per3=round(len(primary) / body_s * 3, 3),
        decay_median=round(float(np.median(decays)), 2) if len(decays) >= P['decay_events'] else None,
        stops=stops, braking=braking, braking_per3=round(len(braking) / body_s * 3, 3), declared=declared,
    )


def motion_failures(m, P=MOTION):
    """The gates on motion_measures(): [{check, severity, frame, note}] (frames as in the measures)."""
    out = []

    def add(check, severity, frame, note):
        out.append(dict(check=check, severity=severity, frame=frame, note=note))

    und = m['snaps_undeclared']
    if m['snaps_per3'] > P['snaps_per3']:
        add('motion-snap', 'fail', und[0], f"{len(und)} one-frame snaps outside a declared snap ({m['snaps_per3']:.2f} per 3 s, at most "
            f"{P['snaps_per3']:g}): a state change glides over 16 f@60 on E.glideOut with a shutter smear (fx/GlideStep, lib/continuity "
            'glideValue), it never jumps in one frame')
    if m['snap_runs'] > P['snap_devices']:
        first = m['snaps_declared'][0] if m['snaps_declared'] else 0
        add('motion-snap', 'fail', first, f"{m['snap_runs']} declared snap devices (stepped lists, snap zooms, flashes): a film keeps "
            f"{P['snap_devices']}; glide the others (fx/GlideStep, lib/continuity glideValue: 16 f@60 on E.glideOut)")
    if m['frozen']:
        k30 = m['fps'] / m['step'] / 30.0
        total = m['frozen_frames30']
        if m['declared'] or total > P['frozen_s'] * 30:
            for s, e in m['frozen']:
                add('motion-frozen', 'fail', f'{s}-{e + m["step"] - 1}', f'{(e - s) / m["step"] / k30 + 1:.0f} f@30 frozen (luma change under '
                    f"{P['floor']:g}, under {P['live_px']} px changing by {P['live_delta']:g}+): every hold keeps a drift of 0.3-1 px/f (lib/continuity "
                    'holdDrift); the end lock (END) is the one held stop' + ('' if m['declared'] else f' (this film holds still {total:.0f} f@30 in all; one held stop of up to '
                                      f"{P['frozen_s'] * 30:.0f} f is the allowance)"))
    if m['decay_median'] is not None and m['decay_median'] < P['decay_min']:
        add('motion-decay', 'fail', m['events'][0]['frame'], f"moves fall from their peak to 20 % of it in a median {m['decay_median']:.1f} "
            f"f@30 (at least {P['decay_min']:g}): land every move on an arrive curve over 16 f@60 or more, with a 4-6 f@30 tail")
    if m['primary_per3'] > P['primary_per3']:
        add('motion-density', 'fail', m['events'][0]['frame'], f"{m['primary_per3']:.2f} primary moves per 3 s (at most {P['primary_per3']:g}): "
            'build each 3 s around one long carrying move (48 f@60 or more) and overlap the secondaries by 30-50 % instead of queueing them')
    for s in m['stops']:
        add('motion-stop', 'fail', s['frame'], f"a move stops dead from {s['speed'] * 100:.0f} % of its peak speed in one frame: land it under 10 % "
            'of its peak before it stops or its layer unmounts (lib/continuity landBeforeCut)')
    for b in m['braking']:
        add('motion-cut', 'warn', b['frame'], f"a cut while a braking move is still at {b['speed'] * 100:.0f} % of its peak speed: cut once it has "
            'landed under 10 % (landBeforeCut), or carry it across as a declared whip or velocity seam')
    if m['braking_per3'] > P['braking_per3']:
        add('motion-cut', 'fail', m['braking'][0]['frame'], f"{len(m['braking'])} cuts into braking moves ({m['braking_per3']:.2f} per 3 s, at most "
            f"{P['braking_per3']:g}): a move lands before its cut, unless it is a whip into the cut")
    return out


def device_key(x, kind):
    """The snap device a declaration belongs to: its id without a trailing index (a list's 'tick-0' ...
    'tick-10' are one device); a declaration without an id is its own device."""
    i = x.get('id')
    return (kind, re.sub(r'[-_ ]?\d+$', '', str(i))) if i not in (None, '') else None


def motion_gates(mc, fps, extra, vf, cuts, freezes, acts, hold_end, declared, add, sev, ignored):
    """The motion gates on a film's MotionCurves, from its declarations; flags go through `add`."""
    f0 = mc.first
    rel = lambda f: int(f) - f0  # noqa: E731
    seams = extra.get('seams', [])
    cut_f = [rel(vf(a)) for a, _ in acts.values() if a > 0] + [rel(vf(s['at'])) for s in seams if s.get('kind') in MOTION_CUT_SEAMS]
    cut_f += [rel(a) for a, _ in cuts]
    ok = [(rel(vf(x['from'])), rel(vf(x['to'])), device_key(x, 'stepped')) for x in extra.get('stepped', [])]
    ok += [(rel(vf(x['f'])), rel(vf(x['f']) + int(x.get('frames', 1))), device_key(x, 'flash')) for x in extra.get('flashes', [])]
    ok += [(rel(vf(s['at'])), rel(vf(s['at'])) + 1, device_key(s, 'seam')) for s in seams if s.get('kind') in MOTION_SNAP_SEAMS]
    carried = [rel(vf(s['at'])) for s in seams if s.get('kind') in MOTION_CARRY_SEAMS]
    carried += [rel(vf(x['to'])) for x in extra.get('camera_blur', [])]
    fz = [(rel(a), rel(b)) for a, b in freezes]
    m = motion_measures(mc.d1, mc.dk, fps, cuts=cut_f, snaps_ok=ok, carried=carried, freezes=fz,
                        end_from=rel(hold_end[0]) if hold_end else None, declared=declared, nk=mc.nk)
    for x in motion_failures(m):
        fr = x['frame']
        frame = f'{int(fr.split("-")[0]) + f0}-{int(fr.split("-")[1]) + f0}' if isinstance(fr, str) else int(fr) + f0
        if ignored(int(str(frame).split('-')[0])):
            continue
        add(x['check'], sev(x['severity']), frame, x['note'])
    shift = lambda xs: [x + f0 for x in xs]  # noqa: E731
    m['first'] = f0
    for k in ('cuts', 'snaps', 'snaps_declared', 'snaps_undeclared', 'snap_allowance'):
        m[k] = shift(m[k])
    m['frozen'] = [[a + f0, b + f0] for a, b in m['frozen']]
    for k in ('events', 'stops', 'braking'):
        for x in m[k]:
            x['frame'] += f0
    m['events'] = m['events'][:200]
    m['thresholds'] = dict(MOTION)
    return m


# ------------------------------------------------------------------------------------------
# synthetic clips (the self-tests of forensics.py, look-audit.py and measure-speed.py)
# ------------------------------------------------------------------------------------------
def texture(seed, w, h, scale=6, mean=128, amp=70, tint=None):
    """A deterministic textured RGB plate (blurred noise, structure at `scale` px), grey or tinted
    by (r, g, b) weights."""
    rng = np.random.default_rng(seed)
    n = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), scale)
    n = (n - n.mean()) / (n.std() + 1e-6)
    g = np.clip(mean + amp * n, 0, 255)
    img = np.repeat(g[..., None], 3, axis=2)
    if tint is not None:
        img = np.clip(img * np.array(tint, np.float32)[None, None, :], 0, 255)
    return img.astype(np.uint8)


def warp(img, dx=0.0, dy=0.0, k=1.0):
    """The plate moved by (dx, dy) px and scaled by k about the centre (reflected at the edges)."""
    h, w = img.shape[:2]
    m = np.float32([[k, 0, (1 - k) * w / 2 + dx], [0, k, (1 - k) * h / 2 + dy]])
    return cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def ui_list(w, h, pitch=24, seed=5):
    """A deterministic product list (rows of dark bars with an accent tick on a light ground), RGB."""
    img = np.full((h, w, 3), 236, np.uint8)
    rng = np.random.default_rng(seed)
    for i in range(h // pitch):
        y = pitch // 2 + i * pitch
        cv2.rectangle(img, (w // 8, y), (w // 8 + int(rng.integers(w // 4, int(w * 0.7))), y + pitch // 3), (60, 60, 60), -1)
        cv2.rectangle(img, (w // 12, y), (w // 12 + pitch // 3, y + pitch // 3), (31, 134, 205), -1)
    return img


def ease_bz(x1, y1, x2, y2):
    """A cubic-bezier easing curve t -> progress (the house tokens of lib/anim.ts are these)."""
    def f(t):
        if t <= 0:
            return 0.0
        if t >= 1:
            return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(40):
            u = (lo + hi) / 2
            x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3
            lo, hi = (u, hi) if x < t else (lo, u)
        u = (lo + hi) / 2
        return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3
    return f


def motion_self_test(check):
    """The motion gates on synthetic films measured in memory (no encode): each gate fires on the generated
    pattern and stays quiet on its fix (fx/GlideStep, lib/continuity). Returns the number of failures."""
    fps, w, h, n = 60, 480, 270, 240
    bad = [0]
    L = ui_list(w, h * 3)
    glide_out = ease_bz(0.172, 0.687, 0.393, 0.943)  # E.glideOut, the house arrival
    e_out = ease_bz(0.16, 1, 0.3, 1)  # E.out
    drift = 0.12  # px per frame at 480 wide: 0.5 px/f at 1080p (holdDrift's house speed)

    def frame(img, y=0.0, x=0.0):
        return cv2.warpAffine(img, np.float32([[1, 0, x], [0, 1, -y]]), (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    def film(pos, img=L, smear=False):  # smear: a 180-degree shutter (6 samples across half a frame)
        if not smear:
            return [frame(img, *pos(f)) for f in range(n)]
        return [np.mean([frame(img, *pos(f + 0.5 * ((k + 0.5) / 6 - 0.5))) for k in range(6)], axis=0).astype(np.uint8) for f in range(n)]

    def gates(frames, **kw):
        mc = motion_curves(frames, fps)
        m = motion_measures(mc.d1, mc.dk, fps, nk=mc.nk, **kw)
        return m, {x['check'] for x in motion_failures(m) if x['severity'] == 'fail'}

    def ok(cond, what, detail=''):
        check(cond, 'motion: ' + what, detail)
        bad[0] += 0 if cond else 1

    steps = [30, 70, 110, 150, 190]

    def jumps(f):
        return 24.0 * sum(1 for a in steps if f >= a), 0.0

    m, fl = gates(film(jumps))
    ok('motion-snap' in fl, 'a list that jumps a row in one frame fails motion-snap', f"{len(m['snaps_undeclared'])} undeclared snaps")
    one = [(a, a + 1, ('stepped', 'list')) for a in steps]
    m, fl = gates(film(jumps), snaps_ok=one)
    ok('motion-snap' not in fl, 'declared as one stepped device, its jumps pass motion-snap', f"{m['snap_runs']} device(s)")
    ok('motion-frozen' in fl, '... but its dead holds between the jumps fail motion-frozen', f"{m['frozen_frames30']} f@30 frozen")
    m, fl = gates(film(lambda f: (jumps(f)[0], drift * f)), snaps_ok=one)
    ok('motion-frozen' not in fl, 'the same holds drifting 0.5 px/f (holdDrift) are alive', f"{m['frozen_frames30']} f@30 frozen")
    two = [(a, a + 1, ('stepped', f'tick{a}')) for a in steps[:2]] + [(a, a + 1, ('flash', f'f{a}')) for a in steps[2:]]
    m, fl = gates(film(jumps), snaps_ok=two)
    ok('motion-snap' in fl, 'two or more declared snap devices fail motion-snap (a film keeps one)', f"{m['snap_runs']} devices")
    line = np.full((h * 3, w, 3), 236, np.uint8)
    cv2.rectangle(line, (150, 250), (330, 270), (40, 40, 40), -1)  # one line of type on a clean field
    m, fl = gates(film(lambda f: (0.0, 0.075 * f), img=line))
    ok('motion-frozen' not in fl, 'a sparse frame drifting 0.3 px/f is not frozen', f"{m['frozen_frames30']} f@30 frozen")
    m, fl = gates(film(lambda f: (0.0, 0.0), img=line))
    ok('motion-frozen' in fl, 'the same frame locked off is frozen', f"{m['frozen_frames30']} f@30 frozen")

    def glide(f):
        return sum(24.0 * glide_out((f - a) / 16) for a in steps), drift * f

    m, fl = gates(film(glide, smear=True))
    ok(not m['snaps'] and not m['frozen'] and m['decay_median'] is not None and m['decay_median'] >= MOTION['decay_min'],
       'a list gliding 16 f@60 on E.glideOut with a shutter smear: no snap, no freeze, settles in 3.5 f@30 or more',
       f"decay {m['decay_median']}, snaps {len(m['snaps'])}, frozen {m['frozen_frames30']}")

    def short(f):
        return sum(24.0 * e_out((f - a) / 16) for a in steps), drift * f

    m, fl = gates(film(short, smear=True))
    ok('motion-decay' in fl, 'the same glide on E.out settles too fast (under 3.5 f@30) and fails motion-decay', f"decay {m['decay_median']}")

    def move(f):
        return 200.0 * glide_out((f - 40) / 48), drift * f

    m, fl = gates(film(move, smear=True))
    ok(not fl, 'one carrying move of 48 f@60 that lands, then a drifting hold, passes every gate', ', '.join(sorted(fl)) or 'clean')

    def cut(f):
        return 200.0 * glide_out((min(f, 52) - 40) / 48), 0.0

    m, fl = gates(film(cut))
    ok('motion-stop' in fl, 'the same move stopped dead mid-ease fails motion-stop', str([(x['frame'], x['speed']) for x in m['stops']]))
    crowd = [20 + 30 * i for i in range(7)]

    def many(f):
        return sum(10.0 * glide_out((f - a) / 24) for a in crowd), 0.0

    m, fl = gates(film(many))
    ok('motion-density' in fl, 'seven moves queued in 4 s fail motion-density', f"{m['primary_per3']} primary per 3 s")
    return bad[0]


def write_clip(path, frames, fps, crf=12):
    """Encode RGB frames (an iterable of HxWx3 uint8) to an H.264 file at `fps`."""
    frames = iter(frames)
    first = next(frames)
    h, w = first.shape[:2]
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(fps), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', str(crf), '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    p.stdin.write(np.ascontiguousarray(first, np.uint8).tobytes())
    for fr in frames:
        p.stdin.write(np.ascontiguousarray(fr, np.uint8).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError(f'ffmpeg could not write {path}')


def self_test():
    """Synthetic clips with known motion: each grammar check must fire where it should and stay
    quiet where it should not. Returns the exit code."""
    import shutil
    import tempfile
    tmp = tempfile.mkdtemp(prefix='cinetic-forensics-')
    fps, w, h = 30, 480, 270
    bad = 0
    count = [0]

    def cues(n, seams=(), stepped=(), end=None, look=True, flashes=()):
        c = dict(fps=fps, total=n, acts=dict(a={'from': 0, 'dur': n}), cue={}, events=[], copy=[])
        if look:
            c['look'] = dict(blur='crisp', texture='clean', filmType='launch', oneTake=False, whiteWorld=False)
            c['declared'] = dict(seams=list(seams), stepped=list(stepped), flashes=list(flashes), cameraBlur=[], end=end or {'from': 0, 'to': 0})
        count[0] += 1
        path = os.path.join(tmp, f'cues{count[0]}.json')
        json.dump(c, open(path, 'w'))
        return path

    def run(name, frames, cue_path, more=()):
        clip = os.path.join(tmp, name + '.mp4')
        write_clip(clip, frames, fps)
        out = os.path.join(tmp, name + '.json')
        r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--cues', cue_path, '--json', out, '--no-banding', '--no-smear',
                            '--no-judder', *more], capture_output=True, text=True)
        try:
            return json.load(open(out))
        except (OSError, ValueError):
            print(r.stdout, r.stderr)
            return {'flags': [], 'checks': {}}

    def check(ok, what, detail=''):
        nonlocal bad
        bad += 0 if ok else 1
        print(f"{'pass' if ok else 'FAIL'}  forensics self-test: {what}" + (f'  ({detail})' if detail else ''))

    def flags(rep, name, severity=None):
        return [x for x in rep['flags'] if x['check'] == name and (severity is None or x['severity'] == severity)]

    def gram(rep):
        return rep.get('checks', {}).get('grammar') or {}

    A, B = texture(1, w, h), texture(2, w, h)
    n = 90
    rep = run('frozen', [A] * n, cues(n))
    check(bool(flags(rep, 'hold-drift', 'fail')), 'a frozen 3 s hold fails hold-drift', f"{len(flags(rep, 'hold-drift', 'fail'))} fail")
    check(bool(flags(rep, 'static-share', 'warn')), 'a frozen film warns static-share', f"static share {gram(rep).get('holds', {}).get('static_share')}")
    rep = run('creep', [warp(A, k=1 + 0.03 * i / fps) for i in range(n)], cues(n))
    check(not flags(rep, 'hold-drift', 'fail'), 'a 3 %/s creep keeps the hold alive', f"live share {gram(rep).get('holds', {}).get('live_share')}")
    check(not flags(rep, 'static-share'), 'a creeping film does not warn static-share', f"static share {gram(rep).get('holds', {}).get('static_share')}")
    rep = run('drift', [warp(A, dx=12 * i / fps / 4) for i in range(n)], cues(n))
    check(not flags(rep, 'hold-drift', 'fail'), 'a 12 px/s drift (at 1080p) keeps the hold alive', f"live share {gram(rep).get('holds', {}).get('live_share')}")
    rep = run('frozen11', [A] * n, cues(n, look=False))
    check(not flags(rep, 'hold-drift', 'fail') and not flags(rep, 'hold-drift', 'warn'), 'without 1.2 declarations hold-drift is info only')
    # an undeclared film checked with --grammar: its last 2 s are the end lock (a closing card may lock off)
    lock = [warp(A, dx=12 * i / fps / 4) for i in range(60)] + [warp(A, dx=12 * 59 / fps / 4)] * 60
    rep = run('endlock', lock, cues(120, look=False), ['--grammar'])
    check(not flags(rep, 'hold-drift', 'fail'), 'an undeclared film (--grammar) may lock off in its last 2 s')
    rep = run('midlock', lock[60:] + lock[:60], cues(120, look=False), ['--grammar'])
    check(bool(flags(rep, 'hold-drift', 'fail')), 'the same 2 s lock mid-film fails hold-drift')
    fa, fb = A.astype(np.float32), B.astype(np.float32)
    mix = [A] * 30 + [((1 - t) * fa + t * fb).astype(np.uint8) for t in np.linspace(0, 1, 10)] + [warp(B, dx=i * 0.5) for i in range(50)]
    rep = run('dissolve', mix, cues(90))
    check(bool(flags(rep, 'dissolve-detect', 'fail')), 'a 10 f dissolve between two images fails', str([d['cls'] for d in gram(rep).get('dissolves', [])]))
    rep = run('dissolve-ui', mix, cues(90, seams=[dict(at=35, kind='dissolveUi', id='ui')]))
    check(not flags(rep, 'dissolve-detect', 'fail'), 'the same blend declared as a UI dissolve passes')
    push = [warp(A, dx=-(6 * i + 0.4 * i * i) / 4) for i in range(45)] + [warp(B, dx=-sum(30 * 0.7 * 0.85 ** j for j in range(i)) / 4) for i in range(45)]
    rep = run('carried', push, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry')]))
    car = gram(rep).get('carried', [])
    check(bool(car) and car[0]['ok'], 'a velocity seam that carries speed and direction passes', json.dumps(car[:1]))
    steps_b = [0.0]
    for i in range(1, 45):
        steps_b.append(steps_b[-1] + 24.0 * 0.86 ** (44 - i))  # the step grows x1.16 a frame into the cut (a house build)
    build = [warp(A, dx=-x / 4) for x in steps_b] + [warp(B, dx=-sum(16.0 * 0.85 ** j for j in range(i)) / 4) for i in range(45)]
    rep = run('build', build, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry')]))
    check(not flags(rep, 'hold-into-exit'), 'a hold that builds x1.16 a frame into its cut passes hold-into-exit', str(gram(rep).get('hold_into_exit')))
    level = [warp(A, dx=-3.0 * i) for i in range(45)] + [warp(B, dx=-3.0 * (45 + i)) for i in range(45)]
    rep = run('level', level, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry')]))
    check(bool(flags(rep, 'hold-into-exit', 'warn')), 'a move that runs level into its cut warns hold-into-exit', str(gram(rep).get('hold_into_exit')))
    turn = push[:45] + [warp(B, dx=sum(30 * 0.7 * 0.85 ** j for j in range(i)) / 4) for i in range(45)]
    rep = run('turned', turn, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry')]))
    check(bool(flags(rep, 'carried-cut', 'fail')), 'a velocity seam whose next shot turns around fails', json.dumps(gram(rep).get('carried', [])[:1]))
    rep = run('stillcut', [A] * 45 + [B] * 45, cues(90, seams=[dict(at=45, kind='hard', id='cut')]))
    check(bool(flags(rep, 'still-cut', 'warn')), 'a cut from a still frame to a still frame warns')
    # end-card: with END declared, a lock that arrives after 1.5 s of nothing warns; one that assembles into the lock does not
    lockup = [warp(A, dx=-2.0 * i) for i in range(45)] + [warp(A, dx=-88.0)] * 75
    rep = run('deadend', lockup, cues(120, end={'from': 90, 'to': 120}))
    check(bool(flags(rep, 'end-card', 'warn')), 'an end lock with nothing moving in the 1.5 s before it warns end-card', json.dumps(gram(rep).get('end_card')))
    alive = [warp(A, dx=-2.0 * i, k=1 + 0.002 * i) for i in range(90)] + [warp(A, dx=-178.0, k=1.178)] * 30
    rep = run('liveend', alive, cues(120, end={'from': 90, 'to': 120}))
    check(not flags(rep, 'end-card'), 'an end lock that settles out of motion does not', json.dumps(gram(rep).get('end_card')))
    steps = [warp(A, dx=6 * (i // 3)) for i in range(n)]
    rep = run('stepped', steps, cues(n, stepped=[{'from': 0, 'to': n, 'fps': 10, 'id': 'steps'}]))
    check(not flags(rep, 'stall', 'fail') and not flags(rep, 'spike', 'fail'), 'held frames inside a declared stepped range are craft', f"{len(flags(rep, 'declared'))} declared note(s)")
    race = list(steps)
    race[46] = np.full_like(A, 250)  # mid-pose: a pose held 3 frames never makes a one-frame image
    rep = run('stepghost', race, cues(n, stepped=[{'from': 0, 'to': n, 'fps': 10, 'id': 'steps'}]))
    check(bool(flags(rep, 'ghost', 'fail')), 'a one-frame image inside a stepped range of 3-frame poses is still a ghost', f"{len(flags(rep, 'ghost'))} ghost")
    # the motion gates through the CLI: a list that jumps a row in one frame fails motion-snap and its dead holds motion-frozen
    L = ui_list(w, h * 2)
    hard = [warp(L, dy=-12.0 * sum(1 for a in (12, 27, 42, 57, 72) if i >= a)) for i in range(n)]
    rep = run('hardlist', hard, cues(n))
    check(bool(flags(rep, 'motion-snap', 'fail')) and bool(flags(rep, 'motion-frozen', 'fail')), 'a list that jumps rows in one frame fails motion-snap and motion-frozen',
          f"{len(flags(rep, 'motion-snap'))} snap, {len(flags(rep, 'motion-frozen'))} frozen")
    # a declared flash is designed: no ghost, no pop (it declares itself through the cues, no --cuts)
    flash = [warp(A, dx=0.25 * i) for i in range(45)] + [np.full_like(A, 250)] + [warp(A, dx=0.25 * (46 + i)) for i in range(44)]
    rep = run('flash', flash, cues(n, flashes=[{'f': 45, 'frames': 1, 'id': 'flash'}]))
    check(not flags(rep, 'ghost', 'fail') and not flags(rep, 'spike', 'fail'), 'a declared flash frame is neither a ghost nor a pop',
          f"{len(flags(rep, 'ghost'))} ghost, {len(flags(rep, 'spike'))} spike")
    bad += motion_self_test(check)
    shutil.rmtree(tmp, ignore_errors=True)
    print('forensics self-test: ' + ('all pass' if not bad else f'{bad} failed'))
    return 1 if bad else 0


def grammar_only(args, info, decl):
    """Only the grammar checks, on a decode at the analysis size (no full-resolution pass)."""
    args.grammar = True
    fps = info['fps']
    cuts, freezes, ignore, acts, moments, reading, cues_fps, extra = decl
    k_ = fps / cues_fps if cues_fps else 1.0
    reading = [(int(round(a * k_)), int(round(b * k_))) for a, b in reading]
    cuts_v = cut_frames(extra, acts, cuts, k_)
    n_ = max(4, int(round(20 * fps / 60)))
    kk = max(2, int(round(0.4 * fps)))
    pf = {g for c in cuts_v for g in range(c - 2 * n_ - 1, c + 7)}
    pw, ph = probe_size(info)
    probe_m = MotionProbe(fps, pw, ph, pair_frames=pf, tiles=False, force={x for c in cuts_v for x in (c - 1, c + kk)})
    dis_n = max(2, int(round(4 * fps / 60)))
    disq = deque(maxlen=dis_n + 2)
    M = dict(idx=[], dissolve=[], probe=probe_m, motion=MotionCurves(fps))
    start = max(0, args.from_frame or 0)
    count = max(1, args.to_frame - start + 1) if args.to_frame is not None else None
    for f, rgb in decode(args.video, info, start, count, size=(pw, ph)):
        g8 = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        M['idx'].append(f)
        probe_m.feed(f, g8)
        M['motion'].feed(f, motion_luma(rgb))
        disq.append((f, g8.astype(np.float32)))
        if len(disq) == disq.maxlen:
            hit = blend_test([x[1] for x in disq])
            if hit:
                M['dissolve'].append(dict(frm=disq[0][0], to=disq[-1][0], **hit))
    if not M['idx']:
        die('decoded 0 frames')
    flags = []

    def add(check, severity, frame, note, **kw):
        first = frame if isinstance(frame, int) else int(str(frame).split('-')[0])
        flags.append(dict(check=check, severity=severity, frame=frame, t=round(first / fps, 3), note=note, **kw))

    grammar = run_grammar(args, info, M, extra, k_, cuts, freezes, lambda f: in_ranges(f, ignore), reading, acts, add, [], [], flags)
    fails = sum(1 for x in flags if x['severity'] == 'fail')
    return dict(file=args.video, fps=round(fps, 3), frames=len(M['idx']), grammar_only=True, fails=fails,
                warnings=sum(1 for x in flags if x['severity'] == 'warn'), flags=flags, checks=dict(grammar=grammar)) | {'pass': fails == 0}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument('video', nargs='?')
    ap.add_argument('--self-test', action='store_true', help='run the grammar checks on synthetic clips made in code, then exit')
    ap.add_argument('--json', help='write the report here (e.g. out/qa/forensics.json)')
    ap.add_argument('--cues', help='out/cues.json: act seams, cue moments, a "qa" block, events of kind "cut"')
    ap.add_argument('--declare', help='JSON with cuts / freezes / ignore')
    ap.add_argument('--cuts', help='declared hard cuts or flash transitions, e.g. 600,836-840')
    ap.add_argument('--freeze-ok', help='declared freezes/holds, e.g. 345-359')
    ap.add_argument('--ignore', help='frames to skip entirely, e.g. 10-12')
    ap.add_argument('--from', dest='from_frame', type=int, help='first frame to analyse')
    ap.add_argument('--to', dest='to_frame', type=int, help='last frame to analyse (inclusive)')
    ap.add_argument('--loop', action='store_true', help='check the loop seam (last frame -> frame 0)')
    ap.add_argument('--against', help='a second render of the same thing; report frames that differ')
    ap.add_argument('--track', action='append', help='x,y,w,h region to phase-track for judder (repeatable)')
    ap.add_argument('--no-judder', action='store_true', help='skip the automatic 3x3 judder patches')
    ap.add_argument('--no-banding', action='store_true')
    ap.add_argument('--banding-sheet', help='x12 contrast-stretch sheet PNG (default: banding.png next to --json)')
    ap.add_argument('--banding-every', type=int, help='sample one frame per N for banding (default: fps)')
    ap.add_argument('--no-smear', action='store_true', help='skip the flat-field compression smear check')
    ap.add_argument('--smear-sheet', help='x25 stretch sheet of the smear samples (default: smear.png next to --json)')
    ap.add_argument('--smear-every', type=int, help='sample one frame per N for smear (default: fps / 2)')
    ap.add_argument('--curves', help='also write per-frame MAD and sharpness curves to this JSON')
    ap.add_argument('--pace', choices=sorted(PACE_LIMITS), help="hold and quiet limits (default: the cues file's pace, else crisp)")
    ap.add_argument('--grammar', action='store_true', help='run the grammar checks as fails even without 1.2 declarations in the cues')
    ap.add_argument('--no-grammar', action='store_true', help='skip the grammar checks (hold drift, cuts at speed, dissolves, end card)')
    ap.add_argument('--grammar-only', action='store_true', help='run only the grammar checks, on a small decode (fast; implies --grammar)')
    g = ap.add_argument_group('thresholds (defaults are proven starting points; see references/review-loop.md)')
    g.add_argument('--spike-min', type=float, default=1.0)
    g.add_argument('--spike-ratio', type=float, default=2.5)
    g.add_argument('--spike-add', type=float, default=0.3)
    g.add_argument('--region-spike-min', type=float, default=1.5, help='spike floor inside one of 9 regions')
    g.add_argument('--region-busy', type=float, default=0.15,
                   help='a region spike is part of a larger move when the whole-frame change exceeds this share')
    g.add_argument('--burst-frames', type=int, default=3, help='a change spread over this many frames is a burst')
    g.add_argument('--flow-explained', type=float, default=0.5, help='flow residual below this = motion')
    g.add_argument('--stall-max', type=float, default=0.05)
    g.add_argument('--stall-moving', type=float, default=0.8)
    g.add_argument('--hold-mad', type=float, default=0.1)
    g.add_argument('--max-hold', type=int, default=None, help='frames (default: the pace\'s, calm 72, crisp 48)')
    g.add_argument('--frozen-px', type=int, default=16, help='a hold is frozen if fewer px change by >24 levels')
    g.add_argument('--max-end-hold', type=int, default=None, help='frames of static tail allowed at the end (default: 2 s at the film\'s rate, plus 1)')
    g.add_argument('--quiet-window', type=int, default=60)
    g.add_argument('--quiet-mad', type=float, default=None, help='(default: the pace\'s, calm 0.10, crisp 0.15)')
    g.add_argument('--ghost-delta', type=int, default=80)
    g.add_argument('--ghost-px', type=int, default=2000, help='full-res pixels')
    g.add_argument('--border-delta', type=int, default=40)
    g.add_argument('--border-frac', type=float, default=0.25)
    g.add_argument('--sliver-frames', type=int, default=3)
    g.add_argument('--judder-window', type=int, default=24)
    g.add_argument('--judder-resp', type=float, default=0.7, help='phase-correlation response needed')
    g.add_argument('--sharp-ratio', type=float, default=3.0)
    g.add_argument('--sharp-min', type=float, default=30.0)
    g.add_argument('--band-area', type=float, default=0.03)
    g.add_argument('--smear-area', type=float, default=0.2,
                   help='smeared share of the frame that flags a sample (a clean flat field stays under 0.15; a smeared one reads 0.29-0.42)')
    g.add_argument('--seam-abs', type=float, default=0.4)
    g.add_argument('--seam-ratio', type=float, default=1.5)
    g.add_argument('--det-min', type=float, default=0.3)
    g.add_argument('--det-ratio', type=float, default=5.0)
    args = ap.parse_args()
    if args.self_test:
        sys.exit(self_test())
    if not args.video:
        ap.error('a video is required (or --self-test)')
    if args.banding_sheet is None and args.json and not args.no_banding:
        args.banding_sheet = os.path.join(os.path.dirname(os.path.abspath(args.json)), 'banding.png')

    if args.smear_sheet is None and args.json and not args.no_smear:
        args.smear_sheet = os.path.join(os.path.dirname(os.path.abspath(args.json)), 'smear.png')

    info = probe(args.video)
    decl = load_declarations(args)
    if not args.pace:
        args.pace = (load_cues(args.cues)['pace'] if args.cues else None) or 'crisp'
    for k, v in PACE_LIMITS[args.pace].items():
        if getattr(args, k) is None:
            setattr(args, k, v)
    extra = decl[7]
    args._dissolve = not args.no_grammar
    if grammar_on(args, extra):
        k_ = info['fps'] / decl[6] if decl[6] else 1.0
        cuts_v = cut_frames(extra, decl[3], decl[0], k_)
        n_ = max(4, int(round(20 * info['fps'] / 60)))
        kk = max(2, int(round(0.4 * info['fps'])))
        pf = {g for c in cuts_v for g in range(c - 2 * n_ - 1, c + 7)}
        args._probe = MotionProbe(info['fps'], *probe_size(info), pair_frames=pf, tiles=False, force={x for c in cuts_v for x in (c - 1, c + kk)})
    if args.grammar_only:
        res = grammar_only(args, info, decl)
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            with open(args.json, 'w') as fh:
                json.dump(res, fh, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        print(f'forensics (grammar only): {args.video}  {res["frames"]} frames  {"PASS" if res["pass"] else "FAIL"}  ({res["fails"]} fail, {res["warnings"]} warn)')
        for x in res['flags'][:30]:
            print(f'  {x["severity"]:4s} {x["check"]:9s} f{x["frame"]}: {x["note"]}')
        sys.exit(0 if res['pass'] else 1)
    M = analyse(args, info)
    M['probe'] = getattr(args, '_probe', None)
    M['smear'] = [] if args.no_smear else smear_scan(args, info)
    res = evaluate(args, info, M, decl)

    if args.curves:
        os.makedirs(os.path.dirname(os.path.abspath(args.curves)), exist_ok=True)
        with open(args.curves, 'w') as fh:
            json.dump(dict(first=int(M['idx'][0]), fps=res['fps'],
                           mad=[round(float(x), 3) for x in np.nan_to_num(np.array(M['d'], dtype=float))],
                           sharpness=[[round(float(v), 1) for v in row] for row in M['sharp']]), fh)
    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, 'w') as fh:
            json.dump(res, fh, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))

    print(f'forensics: {args.video}  {res["frames"]} frames @ {res["fps"]} fps  '
          f'{"PASS" if res["pass"] else "FAIL"}  ({res["fails"]} fail, {res["warnings"]} warn)')
    for x in res['flags'][:30]:
        act = f' [{x["act"]}]' if x.get('act') else ''
        print(f'  {x["severity"]:4s} {x["check"]:9s} f{x["frame"]}{act}: {x["note"]}')
    if len(res['flags']) > 30:
        print(f'  ... {len(res["flags"]) - 30} more in the JSON')
    if args.json:
        print(f'  report: {args.json}')
    sys.exit(0 if res['pass'] else 1)


if __name__ == '__main__':
    main()
