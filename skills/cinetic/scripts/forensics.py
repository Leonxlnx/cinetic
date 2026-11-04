#!/usr/bin/env python3
"""Pixel forensics for a rendered film: the artifacts that eyes on contact sheets miss.

Usage:
  python3 scripts/forensics.py out/film.mp4 --cues out/cues.json --json out/qa/forensics.json
  python3 scripts/forensics.py out/draft.mp4 --cues out/cues.json --spine          # the element's track, swaps, the loop
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
                 burst: the change is spread over >= 3 f@60 (whip, flood, landing)      info
                 jump: optical flow explains it, but it is >= 8x the frames around it
                       (>= 3.0) and no seam is there: the picture moved in one step     fail
                       (within 2 f of a cue: warn)
                 motion: optical flow explains the change (residual < 0.5)            info
                 seam pop: 1-2 frame change on an act boundary, not motion            fail
                 hit: 1-2 frame change within 2 f of a cue or sound event             warn
                      (inside a region: info)
                 pop-in: a region hit >= 6x its neighbours (>= 3.0): a chip, pill or card
                      that arrives whole in one frame on its cue                       warn
                 busy: a region spike while the whole frame changes > 0.15x as much   info
                 pop: any other 1-2 frame change that motion does not explain         fail
  stall        d < 0.05 while d[f-1] > 0.8 and d[f+1] > 0.8 (a repeated frame)         fail
  hold         d < 0.1 for > 150 f@60 (2.5 s at any rate, either pace): a dead stretch, nothing changes
               (90% of its frames change < 16 px by > 24)                                     fail
               the same run where small elements move (a cursor, a counter): a still hold    info
               (a hold may be completely still: the camera moves only with a purpose)
               a static end tail <= 2 s + 1 f is allowed (the audio decays there); a run inside a
               reading window (the cues copy block: an on-screen string's `read` windows, which leave a
               chain's picture beat out; [resolved, out) in an older cues.json) whose
               mean d >= 0.02 is a read: a line held while it is read                       info
  quiet        60-frame mean d < 0.15 (calm: 0.10) outside holds: a still stretch          info
               (the window in 60 fps frames: 1 s at any rate)
  hook         the first 2 s move less than max(0.5 at 60 fps (x 60/fps), 0.5x the film's median 2 s window)
               (films that start at frame 0, not loops; for films of 6 s or less, the first
               1 s under 0.5x the median 1 s): a muted feed decides in second one      warn
               the first 0.5 s window whose mean d passes max(0.03, 0.3x the median d
               of the film's moving frames) starts after 1.0 s                         warn
                                                         after 2.5 s                   fail
  ghost        a frame differs from both neighbours by > 80 while they agree (< 30) on
               > 2000 px (full-res equivalent) and nothing moves within 192 px         fail
               (the same pattern inside motion is a fast element crossing: info)
  border       the outer 1-3 rows/columns differ by > 40 from rows 5-7 inside, on > 25%
               of the edge, at a constant depth for >= 3 frames, in one flat colour that
               holds still while the picture beside it moves (a sliver or gap)        fail
               the same band on a held picture (a sliver or a designed edge)         warn
               (a band that moves with the picture or varies along the edge is content
               crossing the edge; inside a declared stepped range the band is skipped)
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
  dead-stretch a run > 2.5 s (DEAD_S) outside the end lock (cues END; a film without declarations: its
               last 2 s, as look-audit.py) where nothing changes at all: the camera neither moves 6 px/s
               nor creeps 1 %/s, no layer moves 6 px/s, the ground does not change and no content
               changes (typing, a counter: 0.2 % of the frame). A still hold shorter than that passes:
               the camera is still unless a shot declares a move                             fail
  read-move    the camera moves faster than 90 px/s or 15 %/s while text is read           warn
  camera-wander  an aimless camera: inside one shot the camera pans (or pushes) one way and then back
               (most of the picture moving together: two runs of opposite sign on one axis, each 0.4 s or
               longer, both slow: under 60 px/s
               or 4 %/s at their peak, 1 s or less apart): the old float / drift. A designed move
               starts, travels and lands; a reversal device moves fast. A drift: one way through 85 %
               of a shot of 2 s or longer at a flat speed (no start, no landing) between a creep (15
               px/s, 1.5 %/s) and 60 px/s or 4 %/s. Per shot that wanders or drifts           warn
               a wander in two shots or more, a drift in three or more                      fail
               There and back at any speed: two opposite runs 1 s or less apart in one scene (no declared
               seam between them), each travelling 80 px at 1080p or more (a zoom: 3 %), the second
               returning 40 % of the first (a pan across a page and back, push in, pull out)   fail
               Declared camera shots (cues declared.fx[].shots / stages, fx/depth shotDeclares): a shot
               is a purposeful move (its frames never count as an idle camera); two in a row whose
               picture travels opposite ways within 1.5 s, no declared seam between them, go back
               and forth at any speed                                                          fail
               and inside a declared stage the picture creeping at a flat, slow speed outside
               every shot for 1 s or longer is a drift (a plane's eased entry is not)        warn
               and a camera that never rests: faster than a sub-pixel creep (15 px/s, 1.5 %/s) on more
               than 90 % of the body outside declared shots (3 s or longer)                  warn
  static-share the share of the body standing still (camera, layers and ground)            info
  motion-energy  the share of the picture's structure moving 15 px/s or more (the old life gate) info
  still-cut    the share of cuts from a still frame to a still frame                        info
  hold-into-exit  fewer than half of the continuity cuts accelerate into the cut (the last two
               frames run x1.15 faster than the two before them, or end at 3x the hold)     warn
  carried-cut  a declared velocity seam: direction cosine >= 0.7, incoming first-frame speed
               0.4-1.4x the outgoing (the band widened by the read's own spread), then decaying
               every frame; read on the flow with confident text lines masked out, and printed
               against the code's speed when the seam declares v (px/f at 1080p) and ratio  fail
               the same, on a picture that repeats along the move (stripes, tiles, a list: the
               step is only known modulo its period) or whose moving pixels disagree       warn
               every hard cut (a run of at most 3 cut frames: most pixels change and the flow cannot
               explain it) hides itself: a blur at the seam that makes both sides unreadable (sharpness
               dips > 0.9 log units below both settled shots), an anchor held (< 25 % of the frame
               changes, a text line or shape centre within 10 px at 1080p, or the main line or shape
               centred on both sides: the centre slot) or motion at whip speed (cos > 0.7 and the
               picture travelling a fifth of the frame in its last 0.2 s, or 100+ px per 1/30 s at
               1080p). The kept ground (border colour moves < 30) is reported but hides nothing: the
               subject is swapped in one frame. A whip under that speed is `slow` (the subject still
               in frame and readable at the cut). Bare cuts over 10 % of the hard cuts             fail
               (a single bare cut over 10 %, or a film without declared seams: warn; the pixels
               cannot see a matched shape that the seam plan names); a declared scene seam the
               pixels show bare                                                                 fail
  ghost-cut    a cut run whose inner frame is a mix of the frames either side (a dissolve collapsed
               into 1-2 frames, a grey double exposure) or torn (part of the frame already cut, the
               rest not), a blur at the seam or not                                             fail
               a declared seam whose recipe promises a device it does not carry (velocity: motion,
               match-cut: anchor, blur-through: blur, exit-then-enter: ground or blur ...)        warn
               a declared velocity cut whose exit builds slower than x1.1 a frame (house x1.15-1.35
               over the last 8-12 f@60) or whose next shot decays in under 8 f@60 (house 12-24) warn
  ground-flip  a neutral ground (border chroma < 0.04: paper, grey, slate, black) held light (luma
               >= 150) or dark (<= 80) for 0.5 s flips more than twice (flips within 1 s are one
               colour event; a colour field between its deep and light state is one family)  fail
               (a film without declared seams: warn)
  seam-mix     the most-used seam (declared seams by recipe: a spine handover by its kind, fx/Seam ids next; undeclared act
               lines are hard cuts) takes more than 45 % of 5 or more scene changes         fail
               4+ copy lines and no exit-then-enter, text-swap or match-cut                warn
               --seams runs only these three on a 480-wide decode (fast; implies --grammar)
  dissolve-detect  >= 4 f@60 explained as a rising mix of two different images (SSIM < 0.5), or a
               fade to black before the last 2 s, unless a seam declares it (dissolveUi,
               light, fadeEnd)                                                              fail
  end-card     with END declared: the 1.5 s before the lock barely move, or it fades in   warn
Film checks (with the grammar; read at 240 wide, the ending at 480):
  empty-frame  0.1 s or more mid-film with nothing crisp on screen (luma edges over 200 on under 0.05 % of
               the frame: a blurred ground, a dim shape alone; a blur peak of 2 f passes)        warn
               0.5 s or more (a stall: the next element arrives late)                          fail
  frozen-hold  nothing changes for over 1 s mid-film (1.5 s while a line is read), outside the end lock;
               or over 55 % of the body frozen                                               warn
  end-drift    the last 2 s slide at a flat speed (a line fits the middle band's shift, r2 >= 0.95) and
               the last 0.5 s still move at half that speed or more: an ending that never lands  warn
  end-centre   the last frame's lockup (the crisp blobs on its row) sits over 1 % of the width off centre warn
  speck        within 0.5 s of a scene change (a declared seam or cut), all that is crisp on screen fits in a box under
               30 % of the frame's width and height (about 8 % of the frame) on an empty ground, for more than 6 f@30
               (0.2 s): the handover shrank its element to a speck                                fail
  lone-line    a line alone on its ground (1-3 text rows, nothing else crisp) sets at a cap height under 6 % of the
               frame (the rows' ink less their descenders, read at 480 wide) for 0.4 s or more    fail
  world-still  the world's textured corners stay one picture wherever they show and match at both ends
               of a film of 8 s or more (no cloud, light or camera moving it)                   warn
  world-murk   the world's outer ring has no highlight (p99.5 luma under 120) on 70 % of the film  warn
  legibility   each line of the cues copy block (and the first name) against what stands behind it: the
               type is what changes from the frame before it arrives (or after it leaves) to the frame
               once it is whole, the letters' fill of its polarity, over that ground or the flat backing
               it arrived on; WCAG ratio under 3:1                                            warn
               under 2:1 (a grey halo round the letters does not count as a ground)            fail
Sound (any mode; --no-audio or --loop skip it):
  audio        no audio stream, under a second of it, or a silent mix (under -50 dBFS)          fail
  audio-end    the last 0.25 s sit under 12 dB below the loudest 2 s: the music is cut      warn
Spine (--spine, on the draft with its out/cues.json: the element carried across the scene changes; also inside
--grammar-only when the cues declare handovers or a spine). Read at 480 wide; boxes in composition px (1920 wide for a
landscape film, 1080 otherwise; cues `width` or --comp-width):
  spine-track  along each declared handover's box track (a seam with `track`: [[f, x, y, w, h], ...], lib/handover
               handoverDeclares), a crisp object stands in the box on every frame: the luma step across the box's edge
               (an inner band against an outer band, the median along each side) at least 6 levels and twice the film's
               floor (the same read on boxes of its empty ground); gone for more than 2 frames at 30 fps            fail
               the declared box jumps more than 8 % of the frame width in one frame (a whip or a speed handover
               excepted, and a swell's or a shrink's swap frame)                                                       fail
               the cues declare a spine (spine: seams, a spine block) but no handover carries a track             warn
  swap         a hard cut (most pixels change and the flow cannot explain it) that changes more than 65 % of the
               frame with no handover, seam, spine change or --cuts declared within 2 frames: the picture swapped  fail
  text-then-cards  the pixel loop: a line alone (a statement on screen, no declared element drawn, at most 25 % of the
               frame's 16 px blocks busy: 4 % of their pixels 20+ levels off a sigma-6 blur, so a soft plate behind the
               line passes) for 0.4 s, then a picture: over the next 2 s the busy blocks (their upper quartile) rise 8
               points and 1.5 times over the line's own level, with no declared element drawn in its box from the
               line's last frame through those 2 s; twice or more                                                 fail
               once                                                                                                  warn
Motion gates (with the grammar): no event starts or ends in one frame and no hold freezes. Mean luma change
at 160x90, one sample per 1/30 s (landings also at the film's own rate), outside the end lock:
  motion-snap  one-sample changes (>= 2 code values, both neighbours under 35 % of it) that are not cuts:
               more than 0.6 per 3 s outside a declared snap (stepped ranges, flashes, snapZoom seams), or
               more than 1 declared snap device (declarations named alike, 'tick-0' ... 'tick-9', are one) fail
  motion-rest  (info) a deliberate rest: a still run of up to 16 f@60 starting within 0.5 s of a move's landing passes
               motion-frozen (a real rest after a landing, 8-15 f); reported with the film's longest rest (mean change under
               0.3), its rests of 8 f@60 or more per 10 s and its dynamic range (p90 / p25 of the change curve)
  motion-frozen  75 f@30 (2.5 s, DEAD_S) or more in a row where the mean change is under 0.05 and fewer than
               8 px change by 4 values or more: a dead stretch, nothing at all changes (a still hold that
               short of it passes), after the first 0.5 s and outside declared freezes          fail
  motion-decay the median move falls from its peak to 20 % of its speed in under 3.5 f@30 (3+ moves)   fail
  motion-density more than 2 primary moves (peaks >= 25 % of the film's 90th-percentile move) per 3 s  fail
  motion-stop  a move goes still in one frame from above 15 % of its peak speed (cut off mid-ease)    fail
  motion-cut   a visible cut while a braking move is still above 10 % of its peak speed               warn
  motion-floor (every film of 8 s or more, declared or not; --motion-floor and --spine run it too) near-still
               runs of 0.3 s or more (at 320 x 180: under 0.2 % of pixels change 10+ levels and the structure moves
               under 0.03 px a frame (about 0.2 px at 1080p), read on its edges so a pale creep counts, or the only
               change is grain) take more than 10 % of the body (outside the end lock, freezes and ignored ranges);
               a film that never stops reads under 8 %          fail (a body over 60 s: warn); over 8 %  warn
               (one single near-still run up to 2.5 s, a short film's one held breath, warns at most)
  still-run    (a film of 8 s or more) one near-still run (the motion floor's reading) over 0.8 s before the end lock: the
               film holds still only on its end card                                                 fail
  end-blank    a frame in the last 0.3 s is empty (under 0.3 % of its pixels 12+ levels off its median): a
               fade to blank or an empty last frame; the lockup holds to the last frame              fail
  end-hold     the end card stands near-still for over 2.5 s (the still run that reaches into the end lock,
               counted from its start; a lockup keeps living: a slow push that lands, a light pass)   warn
  edge-cover   a frame edge shows a strip that is not the picture (the outer 1-3 px of a side, at 1080p,
               differ by 25+ levels from the flat picture just inside along 85 % of the side, the strip itself
               flat along the side): a world, plate or
               card that does not cover the frame (a pull-back below scale 1, a plane moved off its edge)
               on 0.25 s or more, or on the last frame                                              fail
  end-cut      the film stops mid-fade: the last frames still change by a global gain (a fade) at a third
               or more of the fade's fastest step and the last frame is neither black nor white nor the
               held card (let the fade land on an ease-out, or end on the held frame)              fail
               (fail over 0.25 per 3 s), unless a whip, velocity or zoomThrough seam or a camera-blur
               range carries it into the cut
  What machine-made motion looks like here: many short events that start and stop in one frame, a camera that
  floats with no purpose, and moves cut while still fast. The fixes: fx/GlideStep and lib/continuity
  (glideValue, landBeforeCut), a declared camera move that lands (lib/drift stageMove, lib/camera camPath);
  references/motion-tokens.md "Continuous motion".
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

Frame rate: the runs a hold or a quiet stretch is held for (--max-hold, --quiet-window) are stated in 60 fps frames
and scaled to the same seconds at any rate, and the hook's floor on the opening's motion (0.5, a moving picture's
change) is a 60 fps frame's: a 30 fps frame carries twice the step, so it doubles there. The stillness floors
(--hold-mad, --quiet-mad, the read floor) stay per frame: near stillness d is the encoder's noise, which does not
grow with the step (scaled, a frozen 30 fps hold would fail where its 60 fps twin warns). The grammar's speeds are
px/s already. An explicit flag is taken as given. A pop, a spike and a repeated frame stay per frame.

Writes JSON (--json), a x12 banding stretch sheet and a x25 smear sheet next to it, and a short
summary on stdout.
Exit: 0 no failing check (warnings allowed), 1 a failing check, 2 usage or decode error.
Needs ffmpeg/ffprobe, numpy and opencv-python (the measurements use optical flow); without opencv it stops at once and
names the install. Its sheet helpers (label, tile, imread, imwrite, resize_area, rgb2bgr, inferno), shared with sheet.py
and detail-pair.py, fall back to Pillow when opencv is missing.
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
from collections import deque

import numpy as np

try:
    import cv2
except ModuleNotFoundError:  # the measurements need it (main() names the install); the sheet helpers fall back to Pillow
    cv2 = None
try:
    from PIL import Image, ImageDraw, ImageFont
except ModuleNotFoundError:
    Image = ImageDraw = ImageFont = None

CV2_INSTALL = f'{sys.executable} -m pip install opencv-python-headless'

SW, SH = 480, 270  # MAD analysis size; the thresholds are calibrated at this size
# The dead stretch: the longest run (s) where nothing at all may change (lib/drift DRIFT.dead.s). A still hold shorter
# than that passes: the camera is still unless a shot declares a move.
DEAD_S = 2.5
# Hold and quiet limits per pace. The runs are in 60 fps frames, scaled to the same seconds at the film's rate
# (scaled60); the stillness floors are per frame (the noise floor). Either pace: a hold fails only past DEAD_S.
PACE_LIMITS = {'calm': dict(max_hold=int(DEAD_S * 60), quiet_mad=0.10), 'crisp': dict(max_hold=int(DEAD_S * 60), quiet_mad=0.15)}
HOLD_MAD = 0.1  # a frame whose mean change is under this holds still (near stillness d is the encoder's noise: per frame)
QUIET_WINDOW60 = 60  # 60 fps frames the quiet check averages over (1 s)
READ_MAD = 0.02  # inside a reading window, a run with at least this mean change is a read, not a stall
HOOK_MIN60 = 0.5  # the opening's 2 s move at least this much per 60 fps frame (or half the film's median)


def scaled60(args, fps):
    """The hold and quiet limits at the film's rate, for those left at their defaults (None): the pace's runs in 60 fps
    frames to the same seconds (x fps/60), the stillness floors as they are (per frame); an explicit flag stays as given.
    Returns k60 = fps / 60."""
    k60 = (fps or 60.0) / 60.0
    lim = PACE_LIMITS.get(getattr(args, 'pace', None) or 'crisp', PACE_LIMITS['crisp'])
    if getattr(args, 'max_hold', None) is None:
        args.max_hold = max(2, int(round(lim['max_hold'] * k60)))
    if getattr(args, 'quiet_mad', None) is None:
        args.quiet_mad = lim['quiet_mad']
    if getattr(args, 'hold_mad', None) is None:
        args.hold_mad = HOLD_MAD
    if getattr(args, 'quiet_window', None) is None:
        args.quiet_window = max(2, int(round(QUIET_WINDOW60 * k60)))
    return k60
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
        extra['copy_n'] = sum(1 for x in c['copy'] if x.get('kind', 'copy') == 'copy')
        extra['copy'] = [x for x in c['copy'] if x.get('kind', 'copy') in ('copy', 'name') and _num(x.get('in'))]
    return sorted(set(cuts)), sorted(set(freezes)), sorted(set(ignore)), acts, moments, reading, cues_fps, extra


CARRIED = ('velocity', 'morph', 'breath', 'zoomThrough', 'whip', 'snapZoom', 'mask', 'wipe', 'defocus')
# seams that cut on purpose without carrying motion: their spike or one-frame image is craft, and no continuity cut;
# a breath is a hard cut through one empty frame (it still counts as a carried seam in the mix)
PUNCH = ('hard', 'colour', 'light', 'stepped', 'breath')


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
                # the depth stage's declared camera shots and the stages that declare them (fx/depth shotDeclares)
                shots=[r for r in items('shots') if _num(r.get('from')) and _num(r.get('to')) and r['to'] > r['from']],
                stages=[r for r in items('stages') if _num(r.get('from')) and _num(r.get('to')) and r['to'] > r['from']],
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
def need_images(what):
    """Stop with the install line when neither opencv nor Pillow can do `what`."""
    if cv2 is None and Image is None:
        die(f'{what} needs opencv or Pillow: {CV2_INSTALL} (or {sys.executable} -m pip install pillow)')


def imread(path):
    """A picture file as a BGR uint8 array (None when it cannot be read)."""
    need_images('reading pictures')
    if cv2 is not None:
        return cv2.imread(path, cv2.IMREAD_COLOR)
    try:
        return np.ascontiguousarray(np.asarray(Image.open(path).convert('RGB'))[:, :, ::-1])
    except OSError:
        return None


def imwrite(path, img):
    """Write a BGR uint8 array (PNG or JPEG by the extension)."""
    need_images('writing a sheet')
    if cv2 is not None:
        return cv2.imwrite(path, img)
    Image.fromarray(np.ascontiguousarray(img[:, :, ::-1])).save(path)
    return True


def resize_area(img, size):
    """Resize to (w, h) with an area filter (opencv INTER_AREA, else Pillow's box filter)."""
    w, h = int(size[0]), int(size[1])
    if img.shape[1] == w and img.shape[0] == h:
        return img
    if cv2 is not None:
        return cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    need_images('resizing')
    return np.asarray(Image.fromarray(np.ascontiguousarray(img)).resize((w, h), Image.BOX))


def rgb2bgr(img):
    return np.ascontiguousarray(img[:, :, ::-1])


_INFERNO = [(0, (0, 0, 4)), (32, (33, 12, 74)), (64, (87, 16, 110)), (96, (138, 34, 106)), (128, (188, 55, 84)), (160, (228, 90, 49)),
            (192, (249, 142, 9)), (224, (249, 203, 53)), (255, (252, 255, 164))]  # RGB anchors of the inferno ramp


def inferno(d):
    """A uint8 map as BGR in the inferno ramp (opencv's colour map, else the same ramp from nine anchors)."""
    if cv2 is not None:
        return cv2.applyColorMap(d, cv2.COLORMAP_INFERNO)
    xs = [a for a, _ in _INFERNO]
    lut = np.stack([np.interp(np.arange(256), xs, [c[k] for _, c in _INFERNO]) for k in (2, 1, 0)], axis=1).astype(np.uint8)
    return lut[d]


def _label_pil(img, text, sub):
    """label() without opencv: Pillow's default font on the same dark bars."""
    if Image is None:
        return img
    im = Image.fromarray(np.ascontiguousarray(img[:, :, ::-1]))
    dr = ImageDraw.Draw(im)
    size = max(11, round(img.shape[1] / 40))
    try:
        font = ImageFont.load_default(size=size)
    except TypeError:  # an old Pillow: the fixed bitmap font
        font = ImageFont.load_default()
    x0, y0, x1, y1 = dr.textbbox((0, 0), text, font=font)
    dr.rectangle((0, 0, x1 - x0 + 8, y1 - y0 + 8), fill=(0, 0, 0))
    dr.text((4 - x0, 4 - y0), text, font=font, fill=(255, 255, 255))
    if sub:
        top = y1 - y0 + 8
        a0, b0, a1, b1 = dr.textbbox((0, 0), sub, font=font)
        dr.rectangle((0, top, a1 - a0 + 8, top + b1 - b0 + 8), fill=(40, 40, 40))
        dr.text((4 - a0, top + 4 - b0), sub, font=font, fill=(255, 230, 120))
    img[:] = np.asarray(im)[:, :, ::-1]
    return img


def label(img, text, sub=None):
    if cv2 is None:
        return _label_pil(img, text, sub)
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


BORDER_FLAT_STD = 12.0   # grey levels: the differing outer pixels of a gap hold one colour (the stage behind it)
BORDER_STILL = 1.5       # mean grey-level change per frame under which the outer band holds still


def edge_depth(rows, delta, frac):
    """rows[0] is the outermost line of an edge. Returns (depth, flat): how many outer lines (1-3) differ
    from rows 5-7, or 0 when nothing differs or the reference rows themselves disagree (an edge of
    content passing through, not a sliver); flat when the differing outer pixels hold one colour, as the
    stage behind a gap does (strokes, a texture or a photo crossing the edge vary)."""
    if (np.abs(rows[5] - rows[7]) > delta).mean() > frac / 2:
        return 0, False
    inner = rows[5:8].mean(0)
    depth = 0
    for r in range(4):
        if (np.abs(rows[r] - inner) > delta).mean() > frac:
            depth = r + 1
        else:
            break
    if not 0 < depth <= 3:
        return 0, False
    band = rows[:depth]
    return depth, bool(band[np.abs(band - inner[None]) > delta].std() <= BORDER_FLAT_STD)


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
# motion energy: the share of the picture's structure moving `px` px/s or more over a window. The house band, measured
# (0.4 s windows at 480 wide): the median runs 0.65-0.98; a stretch under `low` lasts at most 1.5 s in three quarters
# of the band and 1.8 s in all but a slow explainer; under `low` on more than a quarter of the body is beyond all
# but two. It is reported (info): a still hold passes, the camera moves only with a purpose.
ENERGY = dict(px=15.0, low=0.3, warn_s=1.5, fail_s=2.0, share=0.25, rest_s=0.25)  # info only now (a still hold passes); rest_s: a stretch opening on a landing counts this much less
# camera-wander: an aimless camera inside one shot (the old float). A run: the camera's speed on one axis at least
# `min` (px/s at 1080p; %/s for the push) with one sign for `run_s` or longer; two runs of opposite sign at most
# `gap_s` apart, both peaking under `slow` (px/s; `slow_pct` %/s), are a wander. A camera that moves faster than a
# sub-pixel creep (`busy_px` px/s or `busy_pct` %/s) on more than `busy` of the body (3 s or longer) never rests.
WANDER = dict(min=6.0, min_pct=0.5, run_s=0.4, gap_s=1.0, slow=60.0, slow_pct=4.0, busy=0.9, busy_s=3.0, busy_px=15.0, busy_pct=1.5, whole=0.7,  # whole: the share of the structure that must move (the camera, not one element)
              # a drift: one run, one way, over `drift_share` of a shot of `drift_s` or longer, at a flat speed (its 10th
              # percentile at least `drift_flat` of its peak: no start, no landing) between a creep (busy_px, busy_pct)
              # and `slow`; an eased move starts and lands, so its speed is never flat
              drift_s=2.0, drift_share=0.85, drift_flat=0.5,
              # declared shots (fx/depth shotDeclares): two in a row whose picture travels opposite ways (cosine under
              # `shots_cos`, each over `shots_px` px, a zoom of 1 % counted as `zoom_px` px) within `shots_gap_s` go back
              # and forth at any speed; inside a declared stage the camera moves only inside its shots (pad `pad_s`)
              shots_cos=-0.3, shots_px=40.0, zoom_px=9.6, shots_gap_s=1.5, pad_s=0.2,
              # there and back at any speed: two opposite runs inside one shot (no declared seam between them), each
              # travelling `back_px` px at 1080p (a zoom: `back_pct` %), the second returning `back_ret` of the first
              back_px=80.0, back_pct=3.0, back_ret=0.4)
# carried-cut: the house band, a direction read needs this coherence, a repeat reaching this autocorrelation makes the
# step ambiguous, and the read's spread widens the ratio band by at most this much
CARRY = dict(cos=0.7, ratio=(0.4, 1.4), coherence=0.5, period_ac=0.5, spread_max=0.5)


def flow_fb(a, b):
    """Dense optical flow a -> b (Farneback; the parameters every probe uses)."""
    return cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 15, 3, 5, 1.2, 0)


def periods(gray, floor=None):
    """The picture's repeat along x and along y (px, or None): the first autocorrelation peak of its structure at a
    lag of 3 px or more that reaches `floor` (stripes, tiles, a list or a grid of cards repeat; footage and noise do
    not). Optical flow reads a step on a repeating picture only modulo its period."""
    floor = CARRY['period_ac'] if floor is None else floor
    g = gray.astype(np.float32)
    g = g - cv2.GaussianBlur(g, (0, 0), 6)  # the structure, not the light
    ac = np.fft.irfft2(np.abs(np.fft.rfft2(g)) ** 2, s=g.shape)
    if ac[0, 0] <= 0:
        return [None, None]
    ac = ac / ac[0, 0]
    out = []
    for prof in (ac[0, :g.shape[1] // 2], ac[:g.shape[0] // 2, 0]):
        out.append(next((lag for lag in range(3, len(prof) - 1)
                         if prof[lag] >= floor and prof[lag] >= prof[lag - 1] and prof[lag] >= prof[lag + 1]), None))
    return out


_LIKE = []


def text_boxes(gray):
    """Confident text lines in a frame, as (x, y, w, h): like.py's reader (glyphs grouped along a baseline); [] when
    it cannot load."""
    if not _LIKE:
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location('like_text', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'like.py'))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            mod.np, mod.cv2 = np, cv2
            _LIKE.append(mod)
        except Exception:  # noqa: BLE001 (the reader is optional here)
            _LIKE.append(None)
    return _LIKE[0].text_regions(gray) if _LIKE[0] else []


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
      and on `seam_frames` (around declared velocity seams), what carried-cut needs beside vec:
           vec_t, text        vec with confident text lines masked out, and the share of moving pixels they held
           coh, spread        how far the moving pixels agree: the length of their mean unit vector (1 = one
                              direction) and the median deviation of their speeds over the median
           period             the picture's repeat along x and y (px at 1080p, or None): periods()
    """

    def __init__(self, fps, w, h, window_s=0.4, wstride=None, pair_frames=None, tiles=True, force=(), pair_scale=0.5, seam_frames=()):
        self.fps, self.w, self.h = fps, w, h
        # the frame-to-frame pairs run at a smaller size (cuts, speeds, tiles); the slow windows at full analysis size
        self.ps = pair_scale if min(w, h) * pair_scale >= 96 else 1.0
        self.pw, self.ph = max(2, int(round(w * self.ps))), max(2, int(round(h * self.ps)))
        self.up = 1080.0 / self.ph
        self.k = max(2, int(round(window_s * fps)))
        self.wstride = wstride or max(1, int(round(fps / 10)))
        self.pair_frames = pair_frames  # None: every frame
        self.force = set(force)  # frames that always get a window measurement (both sides of a cut)
        self.seam_frames = set(seam_frames)  # frames whose pair also gets the carried-cut reads
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
        if self.prev_small is not None and (self.pair_frames is None or f in self.pair_frames or f in self.seam_frames):
            self.pair[f] = self._pair(self.prev_small, small, self.buf[-2][1] if f in self.seam_frames and len(self.buf) >= 2 else None)
        self.prev_small = small
        if len(self.buf) == self.k + 1 and (f % self.wstride == 0 or f in self.force):
            self.win[f] = self._win(self.buf[0][1], gray)

    def _pair(self, a, b, full_a=None):
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
        if full_a is not None and moving.sum() >= 30:
            out.update(self._carry_read(a, fl, mag, moving, full_a))
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

    def _carry_read(self, a, fl, mag, moving, full_a):
        """vec_t, text, coh, spread and period of one pair (see the class note); full_a: frame a at the analysis size."""
        u, v, m = fl[..., 0][moving], fl[..., 1][moving], mag[moving]
        mm = np.maximum(m, 1e-6)
        out = dict(coh=round(float(math.hypot(float((u / mm).mean()), float((v / mm).mean()))), 3),
                   spread=round(float(np.median(np.abs(m - np.median(m))) / max(1e-6, float(np.median(m)))), 3),
                   period=[None if q is None else round(q * self.up, 1) for q in periods(a)])
        boxes = text_boxes(full_a)
        if boxes:
            k = a.shape[0] / float(full_a.shape[0])
            keep = moving.copy()
            for x, y, bw, bh in boxes:
                keep[int(y * k):int(math.ceil((y + bh) * k)) + 1, int(x * k):int(math.ceil((x + bw) * k)) + 1] = False
            out['text'] = round(1 - float(keep.sum()) / max(1, int(moving.sum())), 3)
            if keep.sum() >= 30:
                out['vec_t'] = [round(float(np.median(fl[..., 0][keep])) * self.up, 3), round(float(np.median(fl[..., 1][keep])) * self.up, 3)]
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
            out['energy'] = round(float((mag[tex] * self.u / dt >= ENERGY['px']).mean()), 3)  # ... and how much of it visibly
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
        # a card or a scene fading over a kept world: the whole frames stay alike, the changed region holds two different
        # pictures (a grey ghost card with the world showing through it)
        ys, xs = np.nonzero(np.abs(b - a) > 10)
        sp['ssim_region'] = None
        if len(xs) and xs.max() - xs.min() >= 32 and ys.max() - ys.min() >= 32:
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            sp['ssim_region'] = round(ssim_gray(a[y0:y1, x0:x1], b[y0:y1, x0:x1]), 3)
            sp['region'] = round(float((y1 - y0) * (x1 - x0)) / float(a.size), 3)
        if sp['ssim'] < 0.5 or sp['flat'] or (sp['ssim_region'] is not None and sp['ssim_region'] < 0.4 and sp.get('region', 0) >= 0.2):
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


def camera_wander(frames, state, breaks, fps, P=WANDER, shots=(), stages=(), seams=(), hard=None, spans=()):
    """An aimless camera over the body frames (state: frame -> its window, with cam_vec px/s and cam_k %/s): inside one
    shot (a break ends it), per axis (x, y, push), runs of one sign at least P['min'] fast for P['run_s'] or longer;
    two runs of opposite sign at most P['gap_s'] apart, both peaking under P['slow'] (px/s) or P['slow_pct'] (%/s), are a
    wander (one event per shot, kind 'reverse'); faster, each travelling P['back_px'] (P['back_pct'] for a zoom) with the
    second returning P['back_ret'] of the first and no declared seam (`seams`, video frames) between them, they go there
    and back (kind 'back': read on scenes split only by the designed cuts `hard`, since a fast move breaks the flow). One run over P['drift_share'] of a shot of P['drift_s'] or longer at a
    flat speed (its 10th percentile at least P['drift_flat'] of its peak) between a creep and P['slow'] is a drift (no
    start, no landing; kind 'drift'). Declared camera shots (video frames, fx/depth shotDeclares): two in a row whose
    picture travels opposite ways within P['shots_gap_s'] go back and forth at any speed (kind 'shots-reverse'); inside
    a declared stage the camera moves only inside its shots (kind 'outside'). Also the share of the body where the
    camera moves outside the declared shots (a camera that never rests)."""
    pad = int(round(P['pad_s'] * fps))
    shot_rng = sorted(((int(s['from']), int(s['to']), s) for s in shots), key=lambda r: (r[0], r[1]))
    in_shot = lambda f: any(a - pad <= f <= b + pad for a, b, _ in shot_rng)  # noqa: E731
    cuts_, cur, prev = [], [], None
    for f in frames:
        w = state.get(f)
        if prev is not None and (f != prev + 1 or f in breaks):
            if cur:
                cuts_.append(cur)
            cur = []
        if w is not None:
            cur.append((f, w))
        prev = f
    if cur:
        cuts_.append(cur)
    events, moving, measured = [], 0, 0
    need, gap = max(2, int(round(P['run_s'] * fps))), int(round(P['gap_s'] * fps))
    moves = lambda w: w.get('cam_pxs', 0) >= P['busy_px'] or abs(w.get('cam_k', 0)) >= P['busy_pct']  # noqa: E731
    for shot in cuts_:
        for f, w in shot:
            measured += 1
            moving += int(moves(w) and not in_shot(f))
        cam = [(w.get('cam_vec', [0, 0]), w.get('cam_k', 0.0)) if w.get('moving_share', 0.0) >= P['whole'] else ([0, 0], 0.0) for _, w in shot]
        axes = (('pans', 'x', [c[0][0] for c in cam], P['min'], P['slow'], 'px/s', P['busy_px']),
                ('pans', 'y', [c[0][1] for c in cam], P['min'], P['slow'], 'px/s', P['busy_px']),
                ('pushes', 'push', [c[1] for c in cam], P['min_pct'], P['slow_pct'], '%/s', P['busy_pct']))
        hit = None
        drift = None
        for what, axis, v, lo, slow, unit, creep in axes:
            runs_, start = [], None
            for i, x in enumerate(v + [0.0]):
                sg = 1 if x >= lo else -1 if x <= -lo else 0
                if start is not None and sg != start[1]:
                    a, s_ = start
                    if i - a >= need:
                        runs_.append((a, i - 1, s_, max(abs(y) for y in v[a:i])))
                    start = None
                if start is None and sg:
                    start = (i, sg)
            for r1, r2 in zip(runs_, runs_[1:]):
                if r1[2] == r2[2] or r2[0] - r1[1] > gap:
                    continue
                sign1 = '+' if r1[2] > 0 else '-'
                sign2 = '+' if r2[2] > 0 else '-'
                if max(r1[3], r2[3]) < slow:
                    hit = dict(**{'from': shot[r1[0]][0], 'to': shot[r2[1]][0]}, axis=axis, what=what, kind='reverse',
                               first=f'{r1[3]:.0f} {unit} {sign1}', second=f'{r2[3]:.0f} {unit} {sign2}')
                    break

            if hit:
                break
            if drift is None and len(v) >= P['drift_s'] * fps:
                for a, b, s_, peak in runs_:
                    sp = sorted(abs(y) for y in v[a:b + 1])
                    p10 = sp[int(0.1 * (len(sp) - 1))]
                    if b - a + 1 >= P['drift_share'] * len(v) and creep <= p10 and p10 >= P['drift_flat'] * peak and peak < slow:
                        sign = '+' if s_ > 0 else '-'
                        drift = dict(**{'from': shot[a][0], 'to': shot[b][0]}, axis=axis, what=what, kind='drift',
                                     first=f'{p10:.0f}-{peak:.0f} {unit} {sign}', second='')
                        break
        if hit:
            events.append(hit)
        elif drift:
            events.append(drift)
    # there and back at speed: scenes split only by the designed cuts (`hard`: act lines, declared seams, declared cuts; a
    # fast move the flow cannot follow is not a scene change), two opposite runs, each travelling far, no seam between
    if hard is not None:
        segs, cur, prev = [], [], None
        for f in frames:
            w = state.get(f)
            if prev is not None and (f != prev + 1 or f in hard):
                if cur:
                    segs.append(cur)
                cur = []
            if w is not None:
                cur.append((f, w))
            prev = f
        if cur:
            segs.append(cur)
        for seg in segs:
            cam = [(w.get('cam_vec', [0, 0]), w.get('cam_k', 0.0)) if w.get('moving_share', 0.0) >= P['whole'] else ([0, 0], 0.0) for _, w in seg]
            hit = None
            for what, axis, v, lo, u_, back_min in (('pans', 'x', [c[0][0] for c in cam], P['min'], 'px', P['back_px']),
                                                     ('pans', 'y', [c[0][1] for c in cam], P['min'], 'px', P['back_px']),
                                                     ('pushes', 'push', [c[1] for c in cam], P['min_pct'], '%', P['back_pct'])):
                runs_, start = [], None
                for i, x in enumerate(v + [0.0]):
                    sg = 1 if x >= lo else -1 if x <= -lo else 0
                    if start is not None and sg != start[1]:
                        if i - start[0] >= need:
                            runs_.append((start[0], i - 1, start[1]))
                        start = None
                    if start is None and sg:
                        start = (i, sg)
                for r1, r2 in zip(runs_, runs_[1:]):
                    if r1[2] == r2[2] or r2[0] - r1[1] > gap:
                        continue
                    f1, f2 = seg[r1[1]][0], seg[r2[0]][0]
                    if any(f1 - pad <= sf <= f2 + pad for sf in seams):
                        continue
                    # a drawn handover moves the element itself (a swell, a grow): its span is not the camera's
                    g0, g1 = seg[r1[0]][0], seg[r2[1]][0]
                    if any(a_ <= g1 and g0 <= b_ and (a_ <= f1 + pad or b_ >= f2 - pad) for a_, b_ in spans):
                        continue
                    t1_ = sum(abs(y) for y in v[r1[0]:r1[1] + 1]) / fps
                    t2_ = sum(abs(y) for y in v[r2[0]:r2[1] + 1]) / fps
                    if t1_ >= back_min and t2_ >= max(back_min, P['back_ret'] * t1_):
                        hit = dict(**{'from': seg[r1[0]][0], 'to': seg[r2[1]][0]}, axis=axis, what=what, kind='back',
                                   first=f"{t1_:.0f} {u_} {'+' if r1[2] > 0 else '-'}", second=f"{t2_:.0f} {u_} {'+' if r2[2] > 0 else '-'}")
                        break
                if hit:
                    break
            if hit:
                events.append(hit)
    # declared shots: the net picture travel of each (px at 1080p; a zoom of 1 % counts zoom_px), two in a row opposite
    nets = []
    for a, b, s in shot_rng:
        vx = vy = vk = 0.0
        for f in range(a, b + 1):
            w = state.get(f)
            if w is None or w.get('moving_share', 0.0) < P['whole']:
                continue
            cv = w.get('cam_vec', [0, 0])
            vx += cv[0] / fps
            vy += cv[1] / fps
            vk += w.get('cam_k', 0.0) / fps * P['zoom_px']
        nets.append((a, b, s, (vx, vy, vk)))
    for (a1, b1, s1, u), (a2, b2, s2, v) in zip(nets, nets[1:]):
        nu, nv = math.sqrt(sum(x * x for x in u)), math.sqrt(sum(x * x for x in v))
        if nu < P['shots_px'] or nv < P['shots_px'] or a2 - b1 > P['shots_gap_s'] * fps:
            continue
        # a declared scene change between the two shots: a new scene's move ("carry on, hold, or cut": the cut is there)
        if any(min(b1, a2) - pad <= sf <= max(b1, a2) + pad for sf in seams):
            continue
        cos = sum(x * y for x, y in zip(u, v)) / (nu * nv)
        if cos < P['shots_cos']:
            name1 = f"{s1.get('kind', 'shot')} {s1.get('id', '')}".strip()
            name2 = f"{s2.get('kind', 'shot')} {s2.get('id', '')}".strip()
            events.append(dict(**{'from': a1, 'to': b2}, axis='shots', what='goes', kind='shots-reverse', first=name1, second=name2))
    # inside a declared stage, the whole picture creeping at a flat, slow speed outside every declared shot for 1 s or
    # longer drifts (a plane's own eased entry is not flat, and the stage's camera moves only through its shots)
    for st in stages:
        run = []
        for f in list(range(int(st['from']), int(st['to']) + 1)) + [None]:
            w = state.get(f) if f is not None else None
            mv = (f is not None and w is not None and f not in breaks and not in_shot(f)
                  and w.get('moving_share', 0.0) >= P['whole'] and moves(w))
            if mv:
                run.append((f, max(w.get('cam_pxs', 0.0) / P['slow'], abs(w.get('cam_k', 0.0)) / P['slow_pct'])))
                continue
            if len(run) >= fps:
                sp = sorted(r[1] for r in run)
                if sp[-1] < 1.0 and sp[int(0.1 * (len(sp) - 1))] >= P['drift_flat'] * sp[-1]:
                    events.append(dict(**{'from': run[0][0], 'to': run[-1][0]}, axis='stage', what='moves', kind='outside',
                                       first=str(st.get('id', 'stage')), second=''))
                    break
            run = []
    share = moving / max(1, measured)
    return dict(events=events, moving_share=round(share, 3), shots=len(cuts_), declared=len(shot_rng),
                busy=bool(measured >= P['busy_s'] * fps and share > P['busy']))


def energy_runs(frames, state, breaks, fps, P=ENERGY):
    """Motion energy over the body frames (state: frame -> its window): the median share of the structure moving
    P['px'] px/s or more, the share of measured frames under P['low'], and the runs under it (a cut, an unmeasured
    frame or a gap in the frames ends a run), longest first: {from, to, s, energy}."""
    vals, runs_, cur = [], [], []

    def close():
        if cur:
            e = [state[f]['energy'] for f in cur]
            # a stretch that opens on a landing (the frame before it is measured, in the body, moving and not a cut) holds
            # the landing's rest: it counts P['rest_s'] less; one that opens dead (a cut, a still) counts whole
            prev = state.get(cur[0] - 1)
            landed = prev is not None and prev.get('energy') is not None and prev['energy'] >= P['low'] and cur[0] not in breaks
            s_ = (cur[-1] - cur[0] + 1) / fps
            runs_.append(dict(**{'from': cur[0]}, to=cur[-1], s=round(max(0.0, s_ - (P.get('rest_s', 0.0) if landed else 0.0)), 2), raw_s=round(s_, 2),
                              landed=bool(landed), energy=round(float(np.mean(e)), 3)))

    for f in frames:
        w = state.get(f)
        e = None if w is None else w.get('energy')
        if e is None or f in breaks or (cur and f != cur[-1] + 1):
            close()
            cur = []
        if e is None:
            continue
        vals.append(e)
        if e < P['low']:
            cur.append(f)
        else:
            close()
            cur = []
    close()
    runs_.sort(key=lambda r: -r['s'])
    low = sum(1 for v in vals if v < P['low'])
    return dict(measured=len(vals), median=round(float(np.median(vals)), 3) if vals else None, low_share=round(low / max(1, len(vals)), 3),
                longest_s=runs_[0]['s'] if runs_ else 0.0, runs=runs_[:12])


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
             edge_move={e: [] for e in ('top', 'bottom', 'left', 'right')}, tv={k: [] for k in tracks}, tr={k: [] for k in tracks}, ghosts=[], crossings=[], band=[], det=[],
             tracks=tracks, sboxes=sboxes, rboxes=rboxes)
    smallq = deque(maxlen=3)
    halfq = deque(maxlen=3)
    prev_band = {}
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
    sc = None if getattr(args, 'no_grammar', False) else SeamScan(fps, W, H)  # the seam checks' reads
    M['seams'] = sc
    fs = None if getattr(args, 'no_grammar', False) else FilmScan(fps, W, H, keep=getattr(args, '_keep', ()))  # the film checks' reads
    M['film'] = fs
    S = getattr(args, '_spine', None)
    sp = SpineScan(fps, W, H, S['tracks'], seams=sc) if (S and sc is not None) else None  # the spine checks' reads
    M['spine'] = sp
    for f, rgb in decode(args.video, info, start, count):
        small = cv2.resize(rgb, (SW, SH), interpolation=cv2.INTER_AREA).astype(np.int16)
        if mc is not None:
            mc.feed(f, motion_luma(small.astype(np.uint8)))
        if sc is not None:
            sc.feed(f, small.astype(np.uint8))
        if fs is not None:
            fs.feed(f, small.astype(np.uint8))
        if sp is not None:
            sp.feed(f, rgb)
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
        for name, rows in (('top', g16[:16]), ('bottom', g16[-1:-17:-1]), ('left', g16[:, :16].T),
                           ('right', g16[:, -1:-17:-1].T)):
            M['depth'][name].append(edge_depth(rows, args.border_delta, args.border_frac))
            # how much each of the outer 3 lines and the lines 5-15 beside them change from the frame before: a gap
            # holds still while the picture beside it moves; content crossing the edge moves with it
            pb = prev_band.get(name)
            M['edge_move'][name].append(None if pb is None else tuple(float(np.abs(rows[r] - pb[r]).mean()) for r in range(3))
                                        + (float(np.abs(rows[5:16] - pb[5:16]).mean()),))
            prev_band[name] = rows.copy()

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
    k60 = scaled60(args, fps)  # the hold and quiet runs at this rate (stated in 60 fps frames)
    read_mad = READ_MAD

    def read_run(fa, fb, mean_mad):
        # a run inside one reading window that still changes a little: a held line being read
        return mean_mad >= read_mad and any(fa >= x and fb < y for x, y in reading)

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

    # a burst is a change spread over --burst-frames frames at 60 fps: 50 ms whatever the rate (2 frames at 30 fps), never
    # under 2 frames, so a 3-frame flood at 60 fps that folds into 2 frames at 30 is still a burst, not a seam-pop
    burst_n = max(2, int(round(args.burst_frames * fps / 60)))
    need = sorted({f0 + ev['k'] for ev in events if ev['z'] - ev['a'] + 1 < burst_n}
                  | {f0 + ev['k'] - 1 for ev in events if ev['z'] - ev['a'] + 1 < burst_n})
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
        elif L >= burst_n:
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
            ratio = float(x[ev['k']]) / max(float(ev['base']), 0.1)
            if res < args.flow_explained and seam is None and x[ev['k']] >= args.jump_min and ratio >= args.jump_ratio:
                # motion explains the change, but the frames around it barely move: the picture moved in one step
                # (a sway or drift switched off, a keyframe restarting, a layout reflow, a part rendered apart)
                it['class'] = 'jump-hit' if on_cue is not None else 'jump'
            elif res < args.flow_explained:
                it['class'] = 'motion'
            elif busy:
                it['class'] = 'busy'  # the whole frame is changing a lot: part of a larger move
            elif seam is not None:
                it['class'] = 'seam-pop'
            elif on_cue is not None and rg is not None and x[ev['k']] >= args.popin_min and ratio >= args.popin_ratio:
                # a shape that arrives whole in one frame on its cue (a chip, a pill, a card at full opacity): a hit
                # by its timing, a pop to the eye; it fades or grows over 6 f or more
                it['class'] = 'pop-in'
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
        elif it['class'] in ('jump', 'jump-hit'):
            add('spike', 'fail' if it['class'] == 'jump' else 'warn', fk, f'{what} {size}: the picture moves in one step '
                f'({it["mad"] / max(ev["base"], 0.1):.0f}x the frames around it) while nothing around it moves: a property '
                'switched in one frame (a sway or drift turned off, a keyframe that restarts, a reflow); fade or ease it '
                '(fx/Lit swayFade, lib/continuity glideValue)' + (f' (on the cue at f{on_cue}: warn)' if on_cue is not None else ''),
                mad=it['mad'], cls=it['class'], region=it.get('region'))
        elif it['class'] == 'pop-in':
            add('spike', 'warn', fk, f'{what} on the cue at f{on_cue} {size}: something arrives whole in one frame (a chip, '
                'a pill or a card at full opacity, {:.0f}x the frames around it); fade or grow it over 6 f or more, a third '
                'visible on its first frame'.format(it['mad'] / max(ev['base'], 0.1)), mad=it['mad'], cls=it['class'], region=it.get('region'))
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
                    f'{args.max_end_hold} f (the audio decay): end the film sooner')
        elif kind == 'frozen':
            add('hold', 'fail', f'{fa}-{fb}', f'{length} f ({length / fps:.1f} s) where nothing changes (a dead stretch, over '
                f'{DEAD_S:g} s): let the product change state in it, cut sooner, or declare it with --freeze-ok')
        else:
            add('hold', 'info', f'{fa}-{fb}', f'{length} f ({length / fps:.1f} s) of still hold where small elements move '
                f'(mean change {holds[-1]["mean_mad"]}): fine, a hold may be still')

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
                add('quiet', 'info', f'{fa}-{fb}', f'{fb - fa + 1} f of near-stillness (mean change {q["mean_mad"]}): a still '
                    'stretch (fine: the camera moves only with a purpose)')

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
        if opening < max(HOOK_MIN60 / k60 if hw > fps * 1.5 else 0.0, 0.5 * typical) and not ignored(0):
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

    # --- border slivers: a flat outer band at a constant depth for >= N frames that holds still while the
    # picture beside it moves (the stage showing through a gap). A band that moves with the picture, or one
    # that varies along the edge, is content crossing the edge; a band on a held picture cannot be told from
    # a designed edge (a warning), and inside a declared stepped range it is the step's own held pose
    borders = []
    stepped_v = [(int(round(r['from'] * k_)), int(round(r['to'] * k_))) for r in extra.get('stepped', [])]
    for edge, dep in M['depth'].items():
        flat = np.array([x[1] for x in dep], bool)
        dep = np.array([x[0] for x in dep])
        mv = M['edge_move'][edge]
        k = 0
        while k < n:
            if dep[k] == 0:
                k += 1
                continue
            j = k
            while j + 1 < n and dep[j + 1] == dep[k]:
                j += 1
            if j - k + 1 >= args.sliver_frames and not ignored(f0 + k) and flat[k:j + 1].mean() >= 0.5:
                ch = [mv[i] for i in range(k + 1, j + 1) if mv[i] is not None]
                oc = float(np.median([np.mean(c[:dep[k]]) for c in ch])) if ch else 0.0
                ic = float(np.median([c[3] for c in ch])) if ch else 0.0
                in_step = any(a <= f0 + k and f0 + j < b for a, b in stepped_v)
                where = f'{edge} edge: the outer {dep[k]} px differ from the pixels inside for {j - k + 1} frames'
                row = dict(edge=edge, depth_px=int(dep[k]), frames=[f0 + k, f0 + j], band_change=round(oc, 2),
                           inside_change=round(ic, 2))
                if oc <= BORDER_STILL and ic >= 2 * oc + 1.0 and not in_step:
                    borders.append(dict(row, verdict='fail'))
                    add('border', 'fail', f'{f0 + k}-{f0 + j}', f'{where}, one flat colour holding still while the picture '
                        f'beside it moves ({oc:.1f} vs {ic:.1f} levels a frame): a sliver or gap; overscan moving layers, '
                        'clamp the camera')
                elif oc <= BORDER_STILL and not in_step:
                    borders.append(dict(row, verdict='warn'))
                    add('border', 'warn', f'{f0 + k}-{f0 + j}', f'{where}, one flat colour on a held picture: a sliver '
                        '(a layer short of the frame) or a designed edge; inspect the crop with grab.sh')
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


def velocity_frames(extra, k_):
    """The pair frames carried-cut reads around each declared velocity seam (video frames)."""
    return {int(round(s['at'] * k_)) + d for s in extra.get('seams', []) if s.get('kind') == 'velocity' for d in range(-1, 6)}


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
        if it['class'] in ('pop', 'seam-pop', 'hit', 'region-hit', 'jump', 'jump-hit', 'pop-in') and any(g in disc for g in range(it['frames'][0] - 1, it['frames'][1] + 2)):
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

        def too_long(r):  # a dead stretch: nothing changes for more than DEAD_S (a still hold shorter than that passes)
            return len(r) > DEAD_S * fps

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
            add('dead-stretch', sev('fail'), f'{a}-{b}', f'{b - a + 1} f ({(b - a + 1) / fps:.1f} s) outside the end lock where nothing changes '
                f'at all (over {DEAD_S:g} s): let the product change state in it (a value, a row, a cursor), cut sooner or give the shot a '
                'declared move that lands; never a float or a drift to fake life')
        fast_read = [f for f in body if state[f] is not None and any(x <= f < y for x, y in reading)
                     and (state[f]['cam_pxs'] > 90 or state[f]['cam_pct'] > 15)]
        if fast_read:
            add('read-move', 'warn', fast_read[0], f'{len(fast_read)} frame(s) move faster than 90 px/s or 15 %/s while text is read '
                f'(from f{fast_read[0]}): a read holds still')
        measured = [f for f in body if state[f] is not None]
        still = [f for f in measured if not state[f]['moving']]
        share = len(still) / max(1, len(measured))
        out['holds'] = dict(frozen_runs=[list(r) for r in runs_f], static_share=round(share, 3), body_frames=len(measured),
                            live_share=round(sum(1 for f in measured if state[f]['live']) / max(1, len(measured)), 3))
        if share > 0.15:
            add('static-share', 'info', f'{f0}-{last}', f'{share * 100:.0f} % of the body stands still (camera, layers and ground '
                'all under 6 px/s): fine, holds may be still')

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
            add('still-cut', 'info', dead[0]['frame'], f'{len(dead)} of {len(rows)} cuts go from a still frame to a still frame '
                '(fine for a calm film; a carried cut flows better where a move runs into the seam)')
        cont = [r for r in rows if 'into' in r and r['kind'] not in PUNCH]
        if cont:
            up = sum(1 for r in cont if r['into']['rising'])
            out['hold_into_exit'] = round(up / len(cont), 3)
            if up / len(cont) < 0.5:
                add('hold-into-exit', sev('warn'), cont[0]['frame'], f'only {up} of {len(cont)} cuts accelerate into the cut: the last 12-20 f@60 '
                    'of a hold turn into the exit (speed growing about x1.11-1.16 a frame), and the cut falls on the fastest frame')
        breaks = set(cuts_all) | {f for f, p in probe_m.pair.items() if p.get('cut')}
        out['energy'] = energy_runs(body, state, breaks, fps)  # info: a still hold passes (dead-stretch fails only nothing changing)
        d_shots = [dict(r, **{'from': vf(r['from']), 'to': vf(r['to'])}) for r in extra.get('shots', [])]
        d_stages = [dict(r, **{'from': vf(r['from']), 'to': vf(r['to'])}) for r in extra.get('stages', [])]
        d_seams = sorted({vf(s_['at']) for s_ in extra.get('seams', []) if _num(s_.get('at')) and s_.get('kind') != 'fadeEnd'})
        d_spans = [(vf(s_['span'][0]), vf(s_['span'][1])) for s_ in extra.get('seams', []) if isinstance(s_.get('span'), (list, tuple)) and len(s_['span']) == 2]
        out['wander'] = wd = camera_wander(body, state, breaks, fps, shots=d_shots, stages=d_stages, seams=d_seams, hard=set(cuts_all), spans=d_spans)
        fix = ('Hold the camera still, or give the shot one declared move that starts, travels and lands (fx/depth camera([push(...), '
               'travel(...)]), lib/drift stageMove, lib/camera camPath)')
        n_kind = {k: sum(1 for x in wd['events'] if x['kind'] == k) for k in ('reverse', 'drift', 'outside', 'back')}
        for e in wd['events']:
            if e['kind'] == 'shots-reverse':  # declared shots straight back the way they came: back and forth at any speed
                add('camera-wander', sev('fail'), f"{e['from']}-{e['to']}", f"two declared camera shots go back and forth ({e['first']}, then "
                    f"{e['second']} the opposite way within {WANDER['shots_gap_s']:g} s): carry on in one direction, hold 1.5 s or more, or cut")
                continue
            if e['kind'] == 'back':  # there and back at speed inside one scene: the pan the viewer reads as aimless
                add('camera-wander', sev('fail'), f"{e['from']}-{e['to']}", f"the camera goes one way and back inside one scene ({e['axis']}: {e['first']} "
                    f"then {e['second']}): the 'pan there and back'. One move that starts, travels and lands on the thing that matters; to show two "
                    'places, hand over or cut between them. ' + fix)
                continue
            msg = {
                'reverse': f"the camera {e['what']} one way and back inside one shot ({e['axis']}: {e['first']} then {e['second']}, both slow): an aimless float. ",
                'drift': f"the camera {e['what']} one way through the whole shot at a flat, slow speed ({e['axis']}: {e['first']}), never starting or "
                         'landing: a drift. ',
                'outside': f"the picture creeps at a flat, slow speed inside the declared stage {e['first']} outside every declared shot: a drift. ",
            }[e['kind']]
            # a float that turns back fails in two shots; a drift (a slow one-way creep, also what footage does) in three
            bad = n_kind['reverse'] >= 2 if e['kind'] == 'reverse' else n_kind[e['kind']] >= 3
            add('camera-wander', sev('fail' if bad else 'warn'), f"{e['from']}-{e['to']}", msg + fix)
        if wd['busy']:
            add('camera-wander', sev('warn'), f'{f0}-{last}', f"the camera moves on {wd['moving_share'] * 100:.0f} % of the body outside "
                'declared shots and never rests: an always-on drift. Let it rest between declared moves (holds may be still)')
        car = []
        decay = 0.97 ** (60 / fps)
        for s in extra.get('seams', []):
            if s.get('kind') != 'velocity':
                continue
            at = vf(s['at'])
            rd = [probe_m.pair.get(g, {}) for g in [at - 1] + list(range(at + 1, at + 6))]
            if any(r.get('vec') is None for r in rd):
                continue
            vs = [r.get('vec_t') or r['vec'] for r in rd]  # confident text lines masked out where the reader found any
            sp = [math.hypot(*v) for v in vs]
            o, i = sp[0], sp[1]
            cos = (vs[0][0] * vs[1][0] + vs[0][1] * vs[1][1]) / max(1e-6, o * i)
            ratio = i / max(1e-6, o)
            # the read's own spread: the moving pixels' disagreement widens the ratio band; a picture that repeats along
            # the move (its period on the axis the step runs) or pixels that disagree on the direction leave it unread
            u = min(CARRY['spread_max'], math.hypot(float(rd[0].get('spread') or 0.0), float(rd[1].get('spread') or 0.0)))
            lo, hi = CARRY['ratio'][0] * (1 - u), CARRY['ratio'][1] * (1 + u)
            coh = min(float(rd[0].get('coh', 1.0)), float(rd[1].get('coh', 1.0)))
            rep_p = [p for r, v in zip(rd[:2], vs[:2]) for p, comp in zip(r.get('period') or [None, None], v)
                     if p and abs(comp) >= 0.3 * max(abs(v[0]), abs(v[1]), 1e-6)]
            decays = all(sp[j + 1] <= sp[j] * decay + 0.5 for j in range(1, len(sp) - 1))
            code = None
            if isinstance(s.get('v'), (int, float)) and s['v'] > 0:
                code = dict(out=float(s['v']), into=round(float(s['v']) * float(s.get('ratio') or 0.7), 2))
            speeds = (f"code {code['out']:g} px/f out, {code['into']:g} in; pixels {o:.1f} out, {i:.1f} in" if code
                      else f'pixels {o:.1f} px/f out, {i:.1f} in (declare v on the seam to compare with the code)')
            why = ('the outgoing shot is not moving at the cut' if o < 2 else f'direction turns (cos {cos:.2f} < {CARRY["cos"]:g})' if cos < CARRY['cos']
                   else f'incoming speed {ratio:.2f}x the outgoing ({lo:.2f}-{hi:.2f}x with the read\'s spread {u:.2f})' if not lo <= ratio <= hi
                   else 'the incoming shot does not decay' if not decays else None)
            unsure = None
            if why and o >= 2:
                if rep_p:
                    unsure = f'the picture repeats every {min(rep_p):g} px along the move, so the step is only known modulo it'
                elif coh < CARRY['coherence'] and why.startswith('direction'):
                    unsure = f'the moving pixels disagree on the direction (coherence {coh:.2f})'
            ok = why is None
            car.append(dict(frame=at, out=round(o, 2), into=round(i, 2), ratio=round(ratio, 3), cos=round(cos, 3), after=[round(x, 2) for x in sp[2:]],
                            band=[round(lo, 2), round(hi, 2)], spread=round(u, 3), coherence=round(coh, 3), period=min(rep_p) if rep_p else None,
                            text=max(float(r.get('text') or 0.0) for r in rd[:2]), code=code, ok=ok, unsure=bool(unsure)))
            if why and unsure:
                add('carried-cut', sev('warn'), at, f'declared velocity seam f{at}: not read with confidence ({why}, but {unsure}); {speeds}: '
                    'check the seam by eye on a contact sheet of its frames')
            elif why:
                add('carried-cut', sev('fail'), at, f'declared velocity seam f{at}: {why}; {speeds}; carry the speed in the same direction and let it '
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

    # seams: every hard cut carries a device, the ground flips at most twice, no seam kind takes over the plan
    sc = M.get('seams')
    if sc is not None and sc.f:
        sc.close()
        out['seams'] = seam_check(sc, extra, k_, acts, add, sev, ignored, extra.get('copy_n', 0))
    # the spine (a film whose cues declare handovers or a spine): the element in its box, no undeclared swap, no loop
    sp, S = M.get('spine'), getattr(args, '_spine', None)
    if sp is not None and sp.n and S:
        out['spine'] = spine_check(sp, S['declared'], S['copy'], add, sev, ignored, S['spine'])
    # the film: never an empty frame or a long freeze, an ending that lands centred, a world that lives
    fs = M.get('film')
    if fs is not None and fs.f:
        seam_f = sorted({vf(x['at']) for x in (extra.get('seams') or []) if isinstance(x, dict) and isinstance(x.get('at'), (int, float)) and x.get('kind') != 'fadeEnd'}
                        | {int(a) for a, _ in cuts})
        out['film'] = film_check(fs, extra, add, sev, ignored, reading, end_rng, legibility_frames(extra, k_), seams=seam_f)
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
    run=int(DEAD_S * 30),  # a frozen run: this many still samples at 30 fps (DEAD_S: a dead stretch; a still hold shorter passes)
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
    rest_max60=16,  # a still run up to this long (f@60) ...
    rest_after_s=0.5,  # ... starting within this of a move's landing is a rest, not a freeze
    rest_d=0.3,  # the rests reported: runs of mean change under this (the picture near still) ...
    rest_min60=8,  # ... this long or more (f@60)
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
    # a rest after a landing: a still run of up to rest_max60 f@60 starting within rest_after_s of a move's landing is a
    # held beat (8-15 f), not a freeze; a dead stretch (no landing before it, or longer) stays frozen
    lands = [e['frame'] // step + int(round(e['decay'] * k30)) for e in events if e['ends'] == 'land']
    rest_runs, kept = [], []
    for s_, e_ in frozen:
        long60 = (e_ - s_ + 1) / k30 * 2
        if long60 <= P['rest_max60'] and any(0 <= s_ - L <= P['rest_after_s'] * r for L in lands):
            rest_runs.append((s_, e_))
        else:
            kept.append((s_, e_))
    frozen = kept
    # the rests the picture holds (mean change under rest_d, the frame near still), its dynamic range (p90 / p25)
    quiet = a[:end] < P['rest_d']
    for c in cutl:
        if c < len(quiet):
            quiet[c] = False
    rr = [(s_, e_) for s_, e_ in runs(quiet) if s_ >= st]
    rest60 = [round((e_ - s_ + 1) / k30 * 2, 1) for s_, e_ in rr]
    body_a = np.array([a[i] for i in range(st, end) if i not in cutset]) if end > st else np.array([0.0])
    p25, p90 = (float(np.percentile(body_a, 25)), float(np.percentile(body_a, 90))) if len(body_a) else (0.0, 0.0)
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
        rests_after_landing=[[s * step, e * step] for s, e in rest_runs], longest_rest60=max(rest60) if rest60 else 0.0,
        rests_per10s=round(sum(1 for x in rest60 if x >= P['rest_min60']) / body_s * 10, 2), dynamic=round(p90 / max(p25, 0.02), 2),
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
                add('motion-frozen', 'fail', f'{s}-{e + m["step"] - 1}', f'{(e - s) / m["step"] / k30 + 1:.0f} f@30 where nothing changes (luma change '
                    f"under {P['floor']:g}, under {P['live_px']} px changing by {P['live_delta']:g}+; over {DEAD_S:g} s): a dead stretch. Let the product "
                    'change state in it or cut sooner; a still hold shorter than that is fine')
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
    m['rests_after_landing'] = [[a + f0, b + f0] for a, b in m.get('rests_after_landing', [])]
    for k in ('events', 'stops', 'braking'):
        for x in m[k]:
            x['frame'] += f0
    m['events'] = m['events'][:200]
    m['thresholds'] = dict(MOTION)
    return m


# ------------------------------------------------------------------------------------------
# seams: what each hard cut carries across (carried-cut), how often the ground flips (ground-flip) and how varied
# the seam plan is (seam-mix). Reads at SEAM['w'] wide: a few floats a frame plus a short ring of frames for the cuts.
# ------------------------------------------------------------------------------------------
# A hard cut flows when it carries a device across: the ground kept (the border's median colour moves under
# `ground` code values), a blur at the seam (sharpness, log10 of the Laplacian variance, dips `blur` under its base),
# an anchor kept (under `area` of the frame changes, a word line or shape centre within `anchor_px` px at 1080p, or the
# main text line or shape centred on both sides, within `slot` of the frame's width and height: the centre slot)
# or motion carried (the same direction, cos >= `cos`, at least `v_out` px per 1/30 s at 1080p out and `v_in` in).
# A cut with none of them is bare. The house: bare cuts at most `bare` of a film's hard cuts (fails from `bare_n` bare
# cuts, warns at one); a hard cut is a run of at most `run` cut frames (cut frames `merge` apart are one); a ground flip
# (a neutral light ground, border luma >= `light` and chroma < `neutral`, cut to a neutral dark one, <= `dark`, or back,
# each side held `hold_s`; flips closer than `flip_merge_s` are one colour event) at most `flips` a film; the most-used
# seam kind at most `mix` of a film's big changes (counted from `mix_min` changes). A velocity cut builds x`build` a frame over its last `build_f60` frames
# and the next shot decays over `decay_f60` (f@60).
# What hides a hard cut (measured on hard cuts: a whip at 32-60 px/f@1080 with the subject still in
# frame and readable, a blur dip of 0.5, a kept murky ground under a swapped card; and on the cuts they passed: a blur-through
# dipping 1.0-1.5, a toast arriving over a fifth of the frame): a blur that makes both sides unreadable (dip > `blur`), a
# move fast enough to smear the subject off frame (>= `hide_v` px per 1/30 s at 1080p, a whip that hides its cut
# runs 150-190; the optical flow saturates near 70 there, so the picture's travel over its last 0.2 s, read by phase correlation,
# counts too: `hide_travel` of the frame width), an anchor held (less than `area` of the frame changes, a shape within
# `anchor_px`, the centre slot). The kept
# ground alone hides nothing: the subject is swapped in one frame (the ground still counts toward a recipe's promise).
SEAM = dict(w=320, aw=480, frac=0.35, mad=25.0, resid=(0.5, 0.6), merge=2, run=3, ground=30.0, blur=0.9, area=0.25,
            anchor_px=10.0, slot=(0.05, 0.10), cos=0.7, v_out=3.0, v_in=2.0, hide_v=100.0, hide_travel=0.2, bare=0.10, bare_n=2, light=150.0, dark=80.0,
            neutral=0.04, hold_s=0.5, flip_merge_s=1.0, flips=2, mix=0.45, mix_min=5, build=(1.15, 1.35), build_f60=(8, 12), decay_f60=(12, 24),
            ghost=(0.15, 0.85), ghost_res=0.3)
# a declared seam's recipe: from its id prefix ('exitEnter:line-2', what fx/Seam declares), else from its kind
SEAM_RECIPES = {'exitEnter': 'exit-then-enter', 'textSwap': 'text-swap', 'matchCut': 'match-cut', 'velocityCut': 'velocity-cut',
                'blurThrough': 'blur-through', 'zoomThrough': 'zoom-through', 'sharedElement': 'shared-element'}
SEAM_OF_KIND = dict(velocity='velocity-cut', morph='morph', hard='hard-cut', mask='mask-reveal', whip='whip', defocus='blur-through',
                    light='light-wipe', breath='exit-then-enter', zoomThrough='zoom-through', colour='colour-flip', wipe='push-slide')
SEAM_WITHIN = ('snapZoom', 'stepped', 'fadeEnd', 'dissolveUi')  # not a change of scene: left out of the mix
SEAM_THOUGHT = ('exit-then-enter', 'text-swap', 'match-cut')  # a type film moves from line to line with one of these


def seam_recipe(s, plan=False):
    """The recipe a declared seam names: its id prefix (exitEnter:..., textSwap:..., fx/Seam) or its kind. For the seam plan
    (plan=True) a spine handover counts by its kind (lib/handover: each of the fourteen is its own way across, whatever seam
    kind it declares for the devices it promises)."""
    if plan and s.get('handover'):
        return f"handover:{s['handover']}"
    pre = str(s.get('id') or '').split(':', 1)[0]
    return SEAM_RECIPES.get(pre) or SEAM_OF_KIND.get(s.get('kind'), str(s.get('kind')))


def oklab_chroma(rgb):
    """OKLab chroma of one sRGB colour (0-255 per channel): under about 0.04 a colour reads neutral (paper, grey, slate)."""
    c = np.asarray(rgb, np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    lms = np.cbrt(np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
                            [0.0883024619, 0.2817188376, 0.6299787005]]) @ c)
    a = 1.9779984951 * lms[0] - 2.4285922050 * lms[1] + 0.4505937099 * lms[2]
    b = 0.0259040371 * lms[0] + 0.7827717662 * lms[1] - 0.8086757660 * lms[2]
    return float(math.hypot(a, b))


def _ring_px(rgb):
    """The outer two rows and columns of a frame, as an (n, 3) array."""
    return np.concatenate([rgb[:2].reshape(-1, 3), rgb[-2:].reshape(-1, 3), rgb[:, :2].reshape(-1, 3), rgb[:, -2:].reshape(-1, 3)], 0)


class SeamScan:
    """Per-frame reads for the seam checks: sharpness, the border's median colour and luma, and whether the pair is a
    hard cut (most pixels change and the flow cannot explain it), at SEAM['w'] wide; at each cut, from a ring of
    frames around it, the changed area, the anchors either side (text lines and shapes off the ground, read at
    SEAM['aw'] wide) and the dominant motion of the moving structure (px per 1/30 s at 1080p) before and after it.
    Optical flow runs only on candidate cuts and around cuts. A run of more than SEAM['run'] cut frames is a fast
    continuous change (a zoom, a whip, a dissolve of pixels), not a hard cut. Feed RGB frames of any size; call
    close() after the last one."""

    def __init__(self, fps, w, h):
        self.fps = fps
        self.sw = min(SEAM['w'], w) // 2 * 2
        self.sh = max(2, int(round(h * self.sw / w)) // 2 * 2)
        self.aw = min(SEAM['aw'], w) // 2 * 2
        self.ah = max(2, int(round(h * self.aw / w)) // 2 * 2)
        self.up = 1080.0 / self.sh
        self.k60 = 60.0 / fps  # f@60 per video frame
        self.pre_n = max(4, int(round(14 / self.k60)))  # frames read before a cut (the build: the last 8-12 f@60)
        self.post_n = max(4, int(round(36 / self.k60)))  # ... and after it (the decay: 12-24 f@60)
        self.f, self.sharp, self.bord, self.luma, self.chroma, self.cut = [], [], [], [], [], []
        self.vec = {}  # frame -> motion of the pair (frame - 1 -> frame), read around cuts
        self.ring = deque(maxlen=self.pre_n + self.post_n + 16)
        self.groups = []  # [first cut frame, last cut frame, read]
        self.cutset = set()
        self.reads = {}  # first cut frame -> image reads at the cut

    def feed(self, f, rgb):
        if rgb.dtype != np.uint8:
            rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        if (rgb.shape[1], rgb.shape[0]) != (self.aw, self.ah):
            rgb = cv2.resize(rgb, (self.aw, self.ah), interpolation=cv2.INTER_AREA)
        small = rgb if (self.aw, self.ah) == (self.sw, self.sh) else cv2.resize(rgb, (self.sw, self.sh), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
        self.f.append(f)
        self.sharp.append(float(np.log10(cv2.Laplacian(g, cv2.CV_64F).var() + 1e-6)))
        med = np.median(_ring_px(small), 0).astype(np.float32)
        self.bord.append(med)
        self.luma.append(float(0.2126 * med[0] + 0.7152 * med[1] + 0.0722 * med[2]))
        self.chroma.append(oklab_chroma(med))
        cut = False
        if self.ring:
            a = self.ring[-1][2]
            diff = cv2.absdiff(a, g)
            frac, mad = float((diff > 24).mean()), float(diff.mean())
            if frac > 0.2 or mad > 12:
                fl = flow_fb(a, g)
                hh, ww = a.shape
                gx, gy = np.meshgrid(np.arange(ww, dtype=np.float32), np.arange(hh, dtype=np.float32))
                warped = cv2.remap(g, gx + fl[..., 0], gy + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
                resid = float(cv2.absdiff(a, warped).mean()) / max(mad, 1e-6)
                cut = (frac > SEAM['frac'] and resid > SEAM['resid'][0]) or (mad > SEAM['mad'] and resid > SEAM['resid'][1])
                if not cut:
                    self.vec[f] = self._vec(a, fl)
        self.cut.append(cut)
        self.ring.append((f, rgb, g))
        if cut:
            self.cutset.add(f)
            if self.groups and not self.groups[-1][2] and f - self.groups[-1][1] <= SEAM['merge']:
                self.groups[-1][1] = f
            else:
                self.groups.append([f, f, False])
        for gr in self.groups[-4:]:
            if not gr[2] and f - gr[1] >= self.post_n + 1:
                self._read(gr)

    def close(self):
        for gr in self.groups:
            if not gr[2]:
                self._read(gr)

    def hard(self):
        """The hard cuts: cut runs of at most SEAM['run'] frames (a flash or a breath is one cut)."""
        return [(a, b) for a, b, _ in self.groups if b - a + 1 <= SEAM['run']]

    def _vec(self, a, fl):
        mov = textured(a) & (np.hypot(fl[..., 0], fl[..., 1]) > 0.15)
        k = self.up * self.fps / 30.0
        return (float(np.median(fl[..., 0][mov])) * k, float(np.median(fl[..., 1][mov])) * k) if mov.sum() >= 30 else (0.0, 0.0)

    def _anchors(self, rgb):
        """The anchors of a frame, the largest first: its text lines (like.py's reader) and the shapes or word lines
        standing off its ground, as (cx, cy, area) in px at the anchor size."""
        out = [(x + w / 2.0, y + h / 2.0, float(w * h)) for x, y, w, h in text_boxes(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))]
        med = np.median(_ring_px(rgb), 0)
        m = (np.abs(rgb.astype(np.int16) - med.astype(np.int16)).max(2) > 40).astype(np.uint8)
        m = cv2.dilate(m, np.ones((3, 9), np.uint8))  # glyphs into words, words into a line
        n, _, st, cen = cv2.connectedComponentsWithStats(m, connectivity=8)
        tot = float(self.aw * self.ah)
        out += [(float(cen[i][0]), float(cen[i][1]), float(st[i, cv2.CC_STAT_AREA])) for i in range(1, n)
                if st[i, cv2.CC_STAT_AREA] >= 0.002 * tot and st[i, cv2.CC_STAT_WIDTH] <= 0.9 * self.aw and st[i, cv2.CC_STAT_HEIGHT] <= 0.9 * self.ah]
        return sorted(out, key=lambda a: -a[2])[:6]

    def _slot(self, anchors):
        """The frame's main anchor (the largest) sits in the centre slot, and is not the whole picture."""
        if not anchors:
            return False
        cx, cy, ar = anchors[0]
        return (abs(cx - self.aw / 2) <= SEAM['slot'][0] * self.aw and abs(cy - self.ah / 2) <= SEAM['slot'][1] * self.ah
                and ar <= 0.4 * self.aw * self.ah)

    def _read(self, gr):
        gr[2] = True
        a, b = gr[0], gr[1]
        if b - a + 1 > SEAM['run']:
            return
        imgs = {x[0]: x for x in self.ring}
        # the motion of every pair in the windows either side that is not itself a cut
        for f in list(range(a - self.pre_n, a)) + list(range(b + 1, b + 1 + self.post_n)):
            if f in self.vec or f in self.cutset or f not in imgs or f - 1 not in imgs:
                continue
            fa, fb = imgs[f - 1][2], imgs[f][2]
            self.vec[f] = self._vec(fa, flow_fb(fa, fb))
        pre, post = imgs.get(a - 1), imgs.get(b)
        if pre is None or post is None:
            return
        area = float((np.abs(pre[1].astype(np.int16) - post[1].astype(np.int16)).max(2) > 40).mean())
        bp, bq = self._anchors(pre[1]), self._anchors(post[1])
        d = min((math.hypot(p[0] - q[0], p[1] - q[1]) for p in bp for q in bq), default=None)
        # a cut run of two or three frames whose inner frame is a mix of the frames either side: both pictures at once (a
        # dissolve collapsed into a frame or two, a double exposure), never a designed seam
        ghost = []
        if b > a:
            p0, p1 = pre[2].astype(np.float32), post[2].astype(np.float32)
            dd = p1 - p0
            ch = np.abs(dd) > 16
            if ch.mean() > 0.05:
                den = float((dd[ch] ** 2).sum())
                hh, ww = dd.shape
                for g in range(a, b):
                    if g not in imgs:
                        continue
                    cur = imgs[g][2].astype(np.float32)
                    e = (cur - p0)[ch]
                    al = float((e * dd[ch]).sum() / max(den, 1e-6))
                    res = float(np.abs(e - al * dd[ch]).mean()) / max(1e-6, float(np.abs(dd[ch]).mean()))
                    if SEAM['ghost'][0] < al < SEAM['ghost'][1] and res < SEAM['ghost_res']:
                        ghost.append(dict(frame=g, alpha=round(al, 2), residual=round(res, 2)))
                        continue
                    # a torn cut: part of the frame already shows the next picture while the rest still shows the last
                    tiles = []
                    for ty in range(4):
                        for tx in range(4):
                            sl = (slice(ty * hh // 4, (ty + 1) * hh // 4), slice(tx * ww // 4, (tx + 1) * ww // 4))
                            m = ch[sl]
                            if m.mean() < 0.3:
                                continue
                            d_, e_ = dd[sl][m], (cur - p0)[sl][m]
                            tiles.append(float((e_ * d_).sum() / max(1e-6, float((d_ * d_).sum()))))
                    if len(tiles) >= 6:
                        old = sum(1 for x in tiles if x < SEAM['ghost'][0])
                        new = sum(1 for x in tiles if x > SEAM['ghost'][1])
                        if min(old, new) >= 0.2 * len(tiles):
                            ghost.append(dict(frame=g, alpha=round(al, 2), residual=round(res, 2), torn=True))
        # how far the outgoing picture travels in its last 0.2 s before the cut (phase correlation reads shifts far past the
        # optical flow's reach): a whip that hides its cut carries the subject a quarter of the frame or more in that time
        travel = None
        back = imgs.get(a - 1 - max(2, int(round(6 * self.fps / 30.0))))
        if back is not None:
            p0, p1 = back[2].astype(np.float32), pre[2].astype(np.float32)
            (dx, dy), _ = cv2.phaseCorrelate(p0, p1, cv2.createHanningWindow((p0.shape[1], p0.shape[0]), cv2.CV_32F))
            travel = round(float(math.hypot(dx, dy)) / p0.shape[1], 3)
        self.reads[a] = dict(area=round(area, 3), anchor_px=None if d is None else round(d * 1080.0 / self.ah, 1),
                             slot=bool(self._slot(bp) and self._slot(bq)), ghost=ghost, travel=travel)


def seam_measures(scan):
    """Every hard cut of a SeamScan with the devices it carries, and the film's ground flips (video frames)."""
    n = len(scan.f)
    if not n:
        return dict(cuts=[], flips=[])
    f0 = scan.f[0]
    sharp = np.array(scan.sharp)
    vec = scan.vec
    sp = lambda f: None if vec.get(f) is None else math.hypot(*vec[f])  # noqa: E731
    k60 = scan.k60
    out = []
    for a, b in scan.hard():
        ia, ib = a - f0, b - f0
        pre, post = ia - 1, ib
        if pre < 0 or post >= n:
            continue
        r = scan.reads.get(a) or {}
        bg = float(np.abs(scan.bord[pre] - scan.bord[post]).max())
        # below both sides: the sharper of two different shots is no blur. Each side's level is read on its settled shot, past
        # the 0.2-0.5 s ramp of a blur-through (a level read inside the ramp hides the blur it measures)
        nb = max(4, int(round(8 * scan.fps / 30.0)))
        sb, sa = sharp[max(0, pre - 2 * nb):max(0, pre - nb + 2)], sharp[min(n, post + nb - 1):min(n, post + 2 * nb)]
        base = min(float(np.median(sb if len(sb) >= 3 else sharp[max(0, pre - 6):pre + 1])),
                   float(np.median(sa if len(sa) >= 3 else sharp[post:post + 7])))
        dip = base - float(sharp[max(0, ia - 2):min(n, ib + 4)].min())
        vo = [vec[f] for f in range(a - 3, a) if vec.get(f) is not None]
        vi = [vec[f] for f in range(b + 1, b + 4) if vec.get(f) is not None]
        o = np.mean(vo, 0) if vo else np.zeros(2)
        i_ = np.mean(vi, 0) if vi else np.zeros(2)
        no, ni = float(np.hypot(*o)), float(np.hypot(*i_))
        cos = float(o @ i_ / (no * ni)) if no > 0.5 and ni > 0.5 else 0.0
        dev = []
        if bg < SEAM['ground']:
            dev.append('ground')
        if dip > SEAM['blur']:
            dev.append('blur')
        held = None
        if r.get('area') is not None:
            held = ('frame' if r['area'] < SEAM['area'] else 'match' if r['anchor_px'] is not None and r['anchor_px'] <= SEAM['anchor_px']
                    else 'slot' if r.get('slot') else None)
        if held:
            dev.append('anchor')
        carried = cos > SEAM['cos'] and no > SEAM['v_out'] and ni > SEAM['v_in']
        fast = no >= SEAM['hide_v'] or (r.get('travel') or 0.0) >= SEAM['hide_travel']
        if carried and fast:
            dev.append('motion')
        # bare: nothing hides the swap (the kept ground alone does not); slow: a whip or velocity cut whose subject is still
        # in frame and readable at the cut (direction carried, speed under hide_v, no blur)
        row = dict(frame=a, to=b, ground_shift=round(bg, 1), blur_dip=round(dip, 2), area=r.get('area'), anchor_px=r.get('anchor_px'),
                   anchor=held, carry=dict(out=round(no, 1), into=round(ni, 1), cos=round(cos, 2)),
                   luma=[round(scan.luma[pre], 1), round(scan.luma[post], 1)], devices=dev, bare=not (set(dev) - {'ground'}),
                   slow=bool(carried and not fast), travel=r.get('travel'), ghost=r.get('ghost') or [])
        if carried:
            # the build into the cut (the step's growth a frame at 60 fps over the last 10 f@60) and the decay after it
            nb = max(2, int(round(10 / k60)))
            s0, s1 = sp(a - 1 - nb), sp(a - 1)
            build = (s1 / s0) ** (1.0 / (nb * k60)) if s0 and s1 and s0 > 0.5 else None
            first = sp(b + 1)
            j = b + 1
            while first and sp(j) is not None and sp(j) > 0.2 * first and (j - b) * k60 < 36:
                j += 1
            row['carry'].update(build60=None if build is None else round(build, 3), decay60=round((j - b - 1) * k60, 1) if first else None)
        out.append(row)
    # ground flips: a neutral ground (paper, grey, slate, black: border chroma under `neutral`) held light or dark for
    # hold_s; a change between them is a flip, and flips closer than flip_merge_s are one colour event (three flips 10 f
    # apart are one). A colour field moving between its deep and its light state is one ground family, not a flip.
    hold = max(1, int(round(SEAM['hold_s'] * scan.fps)))
    state = [None if C >= SEAM['neutral'] else 'light' if L >= SEAM['light'] else 'dark' if L <= SEAM['dark'] else None
             for L, C in zip(scan.luma, scan.chroma)]
    held, i = [], 0
    while i < n:
        j = i
        while j + 1 < n and state[j + 1] == state[i]:
            j += 1
        if state[i] and j - i + 1 >= hold:
            held.append((state[i], i, j))
        i = j + 1
    flips = []
    for (s0, _, e0), (s1, b1, _) in zip(held, held[1:]):
        if s0 == s1:
            continue
        at = scan.f[b1]
        if flips and at - flips[-1]['last'] < SEAM['flip_merge_s'] * scan.fps:
            flips[-1].update(last=at, to=s1)
            continue
        flips.append(dict(frame=scan.f[min(n - 1, e0 + 1)], last=at, frm=s0, to=s1))
    return dict(cuts=out, flips=[x for x in flips if x['frm'] != x['to']])


SEAM_PROMISE = {'velocity-cut': ('motion',), 'whip': ('motion', 'blur'), 'blur-through': ('blur',), 'match-cut': ('anchor',),
                'shared-element': ('anchor',), 'morph': ('anchor', 'blur'), 'exit-then-enter': ('ground', 'blur'), 'text-swap': ('ground', 'anchor'),
                'zoom-through': ('anchor', 'motion', 'blur'), 'colour-flip': ('anchor',)}  # what each recipe carries across a hard cut


def seam_check(scan, extra, k_, acts, add, sev, ignored, copy_n=0):
    """The seam gates on a film's SeamScan and its declared seams; flags go through `add`. Returns the report. A film
    with a seam plan (declared seams) fails carried-cut and ground-flip; one without warns: the pixels cannot see a
    matched shape that a plan would name."""
    m = seam_measures(scan)
    planned = bool(extra.get('seams'))
    gate = (lambda s_: sev(s_)) if planned else (lambda s_: sev('warn') if s_ == 'fail' else sev(s_))
    vf = lambda x: int(round(x * k_))  # noqa: E731
    # one seam per frame (a primitive's declaration repeats the timeline's: the one naming a recipe wins)
    seams = sorted({vf(s['at']): s for s in sorted(extra.get('seams', []), key=lambda s: ':' in str(s.get('id') or ''))}.items())
    stepped = [(vf(r['from']), vf(r['to'])) for r in extra.get('stepped', [])]
    cuts = [c for c in m['cuts'] if not ignored(c['frame']) and not any(x <= c['frame'] < y for x, y in stepped)]
    for c in cuts:
        near = [s for f, s in seams if abs(f - c['frame']) <= 2]
        c['seam'] = seam_recipe(near[0]) if near else None
    bare = [c for c in cuts if c['bare']]
    rep = dict(hard_cuts=len(cuts), bare=len(bare), bare_share=round(len(bare) / len(cuts), 3) if cuts else 0.0, cuts=cuts,
               flips=m['flips'], planned=planned, thresholds=dict(SEAM))

    def why(c):
        if c.get('slow'):
            return (f"f{c['frame']} a whip that moves the picture {100 * (c.get('travel') or 0):.0f} % of the frame in its last 0.2 s, the "
                    'subject still in frame')
        return f"f{c['frame']} the subject swapped in one frame" + (' on the kept ground' if 'ground' in c['devices'] else '')
    if cuts and len(bare) / len(cuts) > SEAM['bare']:
        add('carried-cut', gate('fail' if len(bare) >= SEAM['bare_n'] else 'warn'), bare[0]['frame'], f"{len(bare)} of {len(cuts)} hard cuts hide "
            f"nothing (the house: at most {SEAM['bare'] * 100:.0f} %; {'; '.join(why(c) for c in bare[:5])}): cut inside a blur that makes "
            f"both sides unreadable, whip so the picture travels a fifth of the frame or more in its last 0.2 s and the subject smears off frame, hold an anchor (the "
            'word slot or the shape centre within 10 px) or let the subject leave before the next arrives (fx/Seam: exitEnter, textSwap, '
            'matchCut, velocityCut); the kept ground alone hides nothing', frames=[c['frame'] for c in bare])
    # a declared scene seam the pixels show as a bare cut: the plan says it is carried and nothing carries it
    for c in bare:
        if c['seam'] and c['seam'] != 'hard-cut' and c['seam'] in SEAM_PROMISE:
            add('carried-cut', gate('fail'), c['frame'], f"seam f{c['frame']} is declared {c['seam']} but the cut hides nothing ({why(c)}; blur dip "
                f"{c['blur_dip']:g}, house > {SEAM['blur']:g}): build the recipe so the cut lands inside a real smear, a blur or a match")
    for c in cuts:
        if c.get('ghost'):  # a blur does not excuse it: a cross-fade through murk reads as one
            g = c['ghost'][0]
            what = (f"part of the frame already shows f{c['to']} while the rest still shows f{c['frame'] - 1} (a cut torn across two frames: the "
                    'ground or a layer jumps a frame early)') if g.get('torn') else \
                   (f"a {g['alpha'] * 100:.0f} % mix of f{c['frame'] - 1} and f{c['to']}: a dissolve collapsed into {len(c['ghost'])} frame(s), a grey "
                    'double exposure')
            add('ghost-cut', gate('fail'), g['frame'], f"f{g['frame']} shows both pictures at once ({what}): cut every layer on one frame, inside a "
                'blur or a smear, or let the outgoing subject leave first')
    if len(m['flips']) > SEAM['flips']:
        add('ground-flip', gate('fail'), m['flips'][0]['frame'], f"the ground flips light <-> dark {len(m['flips'])} times (at f"
            f"{', f'.join(str(x['frame']) for x in m['flips'][:6])}; the house: at most {SEAM['flips']} a film, each a declared colour "
            'event): keep one ground family through the film and let the cuts keep it', frames=[x['frame'] for x in m['flips']])
    for c in cuts:
        want = SEAM_PROMISE.get(c['seam'] or '')
        if want and not c['bare'] and not any(d in c['devices'] for d in want):
            add('carried-cut', sev('warn'), c['frame'], f"seam f{c['frame']} is declared {c['seam']} but carries no {' or '.join(want)} across the "
                f"cut (it carries {', '.join(c['devices'])}): build the recipe (references/transitions.md section 2)")
    lo, hi = SEAM['build']
    for c in cuts:
        cr = c['carry']
        if c['seam'] != 'velocity-cut' or cr.get('build60') is None:
            continue
        slow = cr['build60'] < lo - 0.05
        dec = cr.get('decay60')
        short = dec is not None and dec < SEAM['decay_f60'][0] - 4
        if slow or short:
            why = ([f"the exit builds x{cr['build60']:.2f} a frame (house x{lo:g}-{hi:g} over the last {SEAM['build_f60'][0]}-"
                    f"{SEAM['build_f60'][1]} f@60)"] if slow else []) + \
                  ([f"the next shot decays in {dec:g} f@60 (house {SEAM['decay_f60'][0]}-{SEAM['decay_f60'][1]})"] if short else [])
            add('carried-cut', sev('warn'), c['frame'], f"velocity cut f{c['frame']}: " + ', '.join(why))
    # the seam plan: declared seams and undeclared act boundaries (plain cuts), scene changes only
    plan = [seam_recipe(s, plan=True) for f, s in seams if s.get('kind') not in SEAM_WITHIN]
    sf = [f for f, _ in seams]
    plan += ['hard-cut' for a, _ in acts.values() if a > 0 and not any(abs(vf(a) - f) <= 2 for f in sf)]
    if plan:
        top = max(sorted(set(plan)), key=plan.count)
        share = plan.count(top) / len(plan)
        rep['plan'] = dict(changes=len(plan), top=top, top_share=round(share, 3), kinds=sorted(set(plan)))
        if len(plan) >= SEAM['mix_min'] and share > SEAM['mix']:
            add('seam-mix', sev('fail'), 0, f"{plan.count(top)} of {len(plan)} scene changes are {top} (the house: the most-used seam at most "
                f"{SEAM['mix'] * 100:.0f} % of a film's changes): plan 3-4 kinds (references/transitions.md, the recipes)")
        if copy_n >= 4 and not any(p in SEAM_THOUGHT for p in plan):
            add('seam-mix', sev('warn'), 0, f'{copy_n} lines and no exit-then-enter, text-swap or match-cut: move from line to line on a kept '
                'ground (fx/Seam exitEnter, textSwap, matchCut)')
    return rep


def seam_line(rep):
    """One summary line of the seam report."""
    if not rep:
        return
    p = rep.get('plan') or {}
    print(f"  seams: {rep['hard_cuts']} hard cut(s), {rep['bare']} bare ({rep['bare_share'] * 100:.0f} %; house <= {SEAM['bare'] * 100:.0f} %), "
          f"{len(rep['flips'])} ground flip(s) (house <= {SEAM['flips']})"
          + (f", plan: {p['top']} {p['top_share'] * 100:.0f} % of {p['changes']} changes (house <= {SEAM['mix'] * 100:.0f} %)" if p else ''))


# ------------------------------------------------------------------------------------------
# the film checks: an empty frame or a stall, a frozen hold, an ending that lands centred, a world that lives, a sound
# ------------------------------------------------------------------------------------------
# Read at FILM['w'] wide. Crisp content (type, UI, a sharp mark or object) carries luma edges over FILM['edge'] (Sobel,
# 0-255); a frame with fewer than FILM['empty'] of them shows nothing to look at (a blurred ground, a dim shape on murk).
# A good blur-through peaks there for 2 f@30; 4 dead frames before a pop, or a dim mark alone for 13 f, read as
# stalls. A frozen hold: under FILM['frozen_d'] mean change and FILM['frozen_px'] of the pixels moving 6 levels (a film
# freezes at most about 1 s mid-film, its end card excepted). The ending: the last FILM['end_s'] s, read in a
# band across the middle (the lockup's row); the world: its outer ring (highlights) and four corner crops every 0.5 s.
FILM = dict(w=240, edge=200.0, empty=0.0005, empty_warn_s=0.1, empty_fail_s=0.5, open_s=0.5, close_s=0.25,
            frozen_d=0.12, frozen_px=0.0005, frozen_s=1.0, frozen_read_s=1.5, frozen_share=0.55,
            end_s=2.0, drift_px=4.0, drift_r2=0.95, land=0.5, centre=0.01,
            ring=0.08, murk_hi=120.0, murk_share=0.7, world_db=40.0, world_share=0.5, world_tex=3.0, world_min_s=8.0,
            audio_db=-50.0, end_drop_db=12.0, legible=3.0, lost=2.0,
            # a speck: everything crisp fits in a box under 30 % of the frame's width and height (about 8 % of the
            # frame) on an empty ground, read at 480 wide (edges over 48 levels), around a scene change (0.5 s either
            # side); more than 6 frames at 30 fps (0.2 s) of it fails
            speck_edge=48.0, speck_px=24, speck_w=0.3, speck_h=0.3, speck_pad_s=0.5, speck_s=0.2,
            # a line alone (one to three text rows, nothing else crisp) whose cap height is under 6 % of the frame
            # (with 0.4 % read tolerance) for 0.4 s or more fails; text rows: 8 %+ of the band's pixels are edges
            lone_cap=0.056, lone_s=0.4, lone_density=0.08, lone_rows=3)


class FilmScan:
    """Per-frame reads for film_check (feed RGB frames of any size, in order): the share of crisp edges, the frame's
    change, the highlight of the world's outer ring, four corner crops every 0.5 s, and the last FILM['end_s'] + 0.5 s
    as luma at 480 wide."""

    def __init__(self, fps, w, h, keep=()):
        self.fps = fps
        self.tw = min(480, w) // 2 * 2
        self.th = max(2, int(round(h * self.tw / w)) // 2 * 2)
        self.sw = min(FILM['w'], self.tw) // 2 * 2
        self.sh = max(2, int(round(h * self.sw / w)) // 2 * 2)
        self.f, self.edge, self.chg, self.npx, self.ring_hi, self.corners = [], [], [], [], [], []
        self.box, self.lone = [], []  # the crisp content's box (shares of the frame) and a lone line's cap share
        self.every = max(1, int(round(fps / 2)))
        self.prev = None
        self.tail = deque(maxlen=int(round((FILM['end_s'] + 0.5) * fps)) + 2)
        self.keep, self.kept = set(keep), {}  # frames kept whole at 480 wide (the legibility pairs)

    def feed(self, f, rgb):
        if rgb.dtype != np.uint8:
            rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        big = rgb if (rgb.shape[1], rgb.shape[0]) == (self.tw, self.th) else cv2.resize(rgb, (self.tw, self.th), interpolation=cv2.INTER_AREA)
        if f in self.keep:
            self.kept[f] = big.copy()
        small = cv2.resize(big, (self.sw, self.sh), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY).astype(np.float32)
        mag = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
        self.f.append(f)
        self.edge.append(float((mag > FILM['edge']).mean()))
        if self.prev is None:
            self.chg.append(0.0)
            self.npx.append(0.0)
        else:
            d = np.abs(g - self.prev)
            self.chg.append(float(d.mean()))
            self.npx.append(float((d > 6).mean()))
        self.prev = g
        y = small.astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        rw = max(2, int(round(FILM['ring'] * self.sh)))
        ring = np.concatenate([y[:rw].ravel(), y[-rw:].ravel(), y[:, :rw].ravel(), y[:, -rw:].ravel()])
        self.ring_hi.append(float(np.percentile(ring, 99.5)))
        if (len(self.f) - 1) % self.every == 0:
            cw, ch = self.sw // 8, self.sh // 8
            self.corners.append((f, [g[:ch, :cw].copy(), g[:ch, -cw:].copy(), g[-ch:, :cw].copy(), g[-ch:, -cw:].copy()]))
        gb = cv2.cvtColor(big, cv2.COLOR_RGB2GRAY).astype(np.float32)
        self.tail.append((f, gb))
        self.box.append(None)
        self.lone.append(None)
        mb = np.hypot(cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)) > FILM['speck_edge']
        ys, xs = np.nonzero(mb)
        if len(xs) < FILM['speck_px']:
            return
        x0, x1 = np.percentile(xs, [1, 99])
        y0, y1 = np.percentile(ys, [1, 99])
        self.box[-1] = (float(x0) / self.tw, float(y0) / self.th, float(x1 - x0 + 1) / self.tw, float(y1 - y0 + 1) / self.th)
        # a line alone: 1-3 runs of text rows (dense edges) holding nearly all the crisp pixels, side by side in one block
        rows = mb.sum(axis=1)
        on = rows >= 2
        runs_ = []
        i = 0
        while i < len(on):
            if on[i]:
                j = i
                while j + 1 < len(on) and (on[j + 1] or (j + 3 < len(on) and on[j + 2:j + 4].any())):
                    j += 1
                runs_.append((i, j))
                i = j + 1
            else:
                i += 1
        if not 1 <= len(runs_) <= FILM['lone_rows']:
            return
        inside = sum(int(rows[a:b + 1].sum()) for a, b in runs_)
        if inside < 0.95 * len(xs) or (runs_[-1][1] - runs_[0][0] + 1) > 0.45 * self.th:
            return
        caps = []
        for a, b in runs_:
            band = mb[a:b + 1]
            cols = np.nonzero(band.any(axis=0))[0]
            wpx = cols[-1] - cols[0] + 1
            dens = float(band[:, cols[0]:cols[-1] + 1].mean())
            # a text row: wide, 2 % of the frame tall or more, its pixels partly edges (a rule or an outline is all edge)
            if wpx < 0.12 * self.tw or (b - a + 1) < 0.02 * self.th or not FILM['lone_density'] <= dens <= 0.6:
                return
            r = rows[a:b + 1].astype(np.float32)
            med = float(np.median(r[r > 0])) if (r > 0).any() else 0.0
            bottom = b
            while bottom > a and rows[bottom] < 0.3 * med:  # descender rows: sparse below the baseline
                bottom -= 1
            caps.append((bottom - a + 1) / self.th)
        self.lone[-1] = float(np.median(caps))


def film_ending(scan):
    """The last FILM['end_s'] s: the shift of the middle band (the lockup's row) of each frame against the last frame
    (phase correlation, px at 1080p), a line fitted through it (a drift: a flat speed with no landing), and the
    horizontal centre of the crisp content on the last frame (a lockup off centre)."""
    fps = scan.fps
    tail = [x for x in scan.tail if x[0] > scan.f[-1] - FILM['end_s'] * fps]
    if len(tail) < max(8, int(0.5 * fps)):
        return None
    ref = tail[-1][1]
    H, W = ref.shape
    k = 1080.0 / H
    y0, y1, x0, x1 = int(0.30 * H), int(0.70 * H), int(0.15 * W), int(0.85 * W)
    hann = cv2.createHanningWindow((x1 - x0, y1 - y0), cv2.CV_32F)
    rows = []
    for f, g in tail:
        (dx, dy), resp = cv2.phaseCorrelate(g[y0:y1, x0:x1], ref[y0:y1, x0:x1], hann)
        rows.append((f, dx * k, dy * k, resp))
    t = np.array([r[0] for r in rows], np.float64)
    out = dict(frames=[int(t[0]), int(t[-1])])
    best = None
    for ax in (1, 2):
        v = np.array([r[ax] for r in rows], np.float64)
        travel = float(np.abs(v).max())
        if travel < FILM['drift_px']:
            continue
        b, a = np.polyfit(t, v, 1)
        fit = a + b * t
        r2 = 1.0 - float(((v - fit) ** 2).sum()) / max(1e-9, float(((v - v.mean()) ** 2).sum()))
        nl = max(4, int(round(0.5 * fps)))
        bl = float(np.polyfit(t[-nl:], v[-nl:], 1)[0])
        cand = dict(axis='x' if ax == 1 else 'y', travel=round(travel, 1), speed=round(abs(b), 3), r2=round(r2, 3),
                    last_speed=round(abs(bl), 3), lands=bool(abs(bl) < FILM['land'] * abs(b)))
        if best is None or cand['travel'] > best['travel']:
            best = cand
    out['move'] = best
    # the lockup: the crisp content of the middle band merged into blobs (letters into words, the mark beside them); read
    # only when one blob holds most of it (a crisp ridge or a far pill beside low-contrast type is not a lockup to measure)
    mag = np.hypot(cv2.Sobel(ref, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(ref, cv2.CV_32F, 0, 1, ksize=3))
    m = np.zeros(mag.shape, np.uint8)
    m[int(0.30 * H):int(0.70 * H), int(0.03 * W):int(0.97 * W)] = 1
    m &= (mag > FILM['edge'] * 1.5).astype(np.uint8)
    tot = int(m.sum())
    if tot >= 40:
        nb, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(m, np.ones((9, 41), np.uint8)), connectivity=8)
        if nb > 1:
            share = {i: int(m[lab == i].sum()) for i in range(1, nb)}
            i = max(share, key=share.get)
            ya, yb = st[i, cv2.CC_STAT_TOP], st[i, cv2.CC_STAT_TOP] + st[i, cv2.CC_STAT_HEIGHT]
            row = [j for j in share if min(yb, st[j, cv2.CC_STAT_TOP] + st[j, cv2.CC_STAT_HEIGHT]) - max(ya, st[j, cv2.CC_STAT_TOP])
                   >= 0.5 * min(yb - ya, st[j, cv2.CC_STAT_HEIGHT])]  # the blobs on the lockup's row (the mark, the name, a pill)
            px = sum(share[j] for j in row)
            x0b = min(int(st[j, cv2.CC_STAT_LEFT]) for j in row)
            x1b = max(int(st[j, cv2.CC_STAT_LEFT] + st[j, cv2.CC_STAT_WIDTH]) for j in row)
            if px >= 0.8 * tot and x1b - x0b < 0.8 * W:
                cx = (x0b + x1b) / 2.0
                out['centre'] = dict(offset=round(float(cx - W / 2.0) / W, 4), px=round(float(cx - W / 2.0) * k, 1), width=round((x1b - x0b) / W, 3))
    return out


def legibility_frames(extra, k_):
    """The frames the legibility read needs (video frames): for each line and name in the cues copy block, a frame once it
    is whole and two candidates for its ground: the frame before it arrives and the frame after it leaves."""
    out, names = [], 0
    for x in extra.get('copy') or []:
        if x.get('kind') == 'name':  # the wordmark; a badge or a fact joining the lockup moves the name it joins
            names += 1
            if names > 1:
                continue
        b = int(round(min(float(x['out']) - 2, float(x['resolved']) + 4) * k_))
        grounds = [max(0, int(round((float(x['in']) - d) * k_))) for d in (2, 8)] + [int(round((float(x['out']) + 15) * k_))]
        if b > grounds[0]:
            out.append((x, grounds, b))
    return out


def legibility(scan, pairs):
    """The contrast of each line against what stands behind it (WCAG ratio on relative luminance). The type is what
    changes between a ground frame (before the line arrives or after it leaves, whichever matches the line's frame better
    away from the type) and the frame with the line whole; of the two polarities, the one whose pixels reach the extreme
    (white or black fill: the letters, not a soft halo round them), else the larger; their stroke interiors. Its ground is
    what the ground frame shows under the strokes, or the flat backing it arrived on (a pill, a card: a uniform band of the
    other polarity round the strokes; a soft halo is not one). The median ratio of type over that ground."""
    def rel(img):
        c = img.astype(np.float32) / 255.0
        c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        return c @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    w3 = np.array([0.2126, 0.7152, 0.0722], np.float32)
    rows = []
    for x, grounds, b in pairs:
        B = scan.kept.get(b)
        if B is None:
            continue
        yb = B.astype(np.float32) @ w3
        best = None
        for a in grounds:
            A = scan.kept.get(a)
            if A is None:
                continue
            ya = A.astype(np.float32) @ w3
            d = yb - ya
            ch = np.abs(d) > 30
            if ch.mean() > 0.12:  # the scene changed, not just the line
                continue
            near = cv2.dilate(ch.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
            away = float(np.abs(d[~near]).mean())  # the ground itself must not change between the two frames
            if away <= 12:
                best = (away, a, A, d)
                break  # the ground just before the line arrives first; the one after it leaves only when that one changed
        if best is None or best[0] > 12:
            continue
        _, a, A, d = best
        lit, drk = d > 30, d < -30
        ext_l = lit.sum() >= 40 and float(np.median(yb[lit])) >= 228
        ext_d = drk.sum() >= 40 and float(np.median(yb[drk])) <= 30
        light = ext_l if ext_l != ext_d else lit.sum() >= drk.sum()
        m0 = lit if light else drk
        if m0.sum() < 40:
            continue
        # the letters' fill: the changed pixels within 40 levels of the brightest (light type) or darkest (dark type) of them,
        # not the softer changes of the ground around the line
        tone = float(np.percentile(yb[m0], 95 if light else 5))
        t8 = (m0 & ((yb >= tone - 40) if light else (yb <= tone + 40))).astype(np.uint8)
        m = cv2.erode(t8, np.ones((2, 2), np.uint8)).astype(bool)
        if m.mean() < 0.0008:
            continue
        lb_map = rel(B)
        lt = float(np.median(lb_map[m]))
        ring = cv2.dilate(t8, np.ones((7, 7), np.uint8)).astype(bool) & ~cv2.dilate(t8, np.ones((4, 4), np.uint8)).astype(bool)
        other = drk if light else lit
        backed = ring.sum() >= 20 and float((other & ring).sum()) >= 0.6 * float(ring.sum()) and float(yb[ring].std()) < 20
        lg = float(np.median(lb_map[ring])) if backed else float(np.median(rel(A)[m]))
        ratio = (max(lt, lg) + 0.05) / (min(lt, lg) + 0.05)
        rows.append(dict(id=x.get('id'), text=str(x.get('text'))[:40], frames=[a, b], ratio=round(ratio, 2), type='light' if light else 'dark',
                         ground=round(float(np.median(yb[ring])) if backed else float(np.median((A.astype(np.float32) @ w3)[m])), 1),
                         backed=bool(backed)))
    return rows


def film_check(scan, extra, add, sev, ignored, reading=(), end_rng=None, pairs=(), seams=()):
    """Empty frames and stalls, frozen holds, the ending (a drift that never lands, a lockup off centre), a world that never
    changes or has no highlight. Flags go through `add`; returns the report."""
    fps, n = scan.fps, len(scan.f)
    if n < 3:
        return {}
    F = scan.f
    first, last = F[0], F[-1]
    open_n, close_n = int(round(FILM['open_s'] * fps)), int(round(FILM['close_s'] * fps))
    rep = dict(thresholds=dict(FILM))
    # 1. the frame is never empty between two scenes
    empties = []
    for i, j in runs([e < FILM['empty'] for e in scan.edge]):
        a, b = F[i], F[j]
        dur = (b - a + 1) / fps
        if a < first + open_n or b > last - close_n or ignored(a) or dur < FILM['empty_warn_s'] - 1e-9:
            continue
        still = float(np.mean(scan.chg[i:j + 1])) < 2 * FILM['frozen_d']
        empties.append(dict(frm=a, to=b, s=round(dur, 2), still=still, edges=round(float(np.mean(scan.edge[i:j + 1])), 5)))
        add('empty-frame', sev('fail' if dur >= FILM['empty_fail_s'] else 'warn'), f'{a}-{b}', f'{b - a + 1} f ({dur:.2f} s) with nothing crisp on '
            f"screen (crisp edges on {100 * empties[-1]['edges']:.3f} % of the frame: a blurred ground, a dim shape alone"
            f"{'; still: a stall' if still else ''}): the frame is never empty between two scenes; let the next element arrive while "
            'the last one leaves, or keep a blur peak to 2 f')
    rep['empty'] = empties
    # 1b. a scene change never leaves a speck (an element under about 8 % of the frame) alone on an empty ground
    pad = int(round(FILM['speck_pad_s'] * fps))
    near = lambda g: any(abs(g - c) <= pad for c in seams)  # noqa: E731
    specks = []
    if seams and getattr(scan, 'box', None):
        flags_ = [bool(b) and b[2] < FILM['speck_w'] and b[3] < FILM['speck_h'] and near(F[i]) for i, b in enumerate(scan.box)]
        for i, j in runs(flags_):
            a, b = F[i], F[j]
            dur = (b - a + 1) / fps
            if ignored(a) or (end_rng and a >= end_rng[0]) or dur <= FILM['speck_s'] + 1e-9:
                continue
            bx = scan.box[i]
            specks.append(dict(frm=a, to=b, s=round(dur, 2), box=[round(v, 3) for v in bx]))
            add('speck', sev('fail'), f'{a}-{b}', f'{b - a + 1} f ({dur:.2f} s) at a scene change where all that stands on the ground is a speck '
                f'({bx[2] * 100:.0f} % x {bx[3] * 100:.0f} % of the frame): a handover never shrinks its element to a speck on an empty frame; '
                'keep the element big, let the next scene arrive round it while the last one leaves, or vary the handover')
    rep['speck'] = specks
    # 1c. a line alone on its ground sets big: a cap height of 6 % of the frame or more
    smalls = []
    if getattr(scan, 'lone', None):
        flags_ = [c is not None and c < FILM['lone_cap'] for c in scan.lone]
        for i, j in runs(flags_):
            a, b = F[i], F[j]
            dur = (b - a + 1) / fps
            if ignored(a) or (end_rng and a >= end_rng[0]) or dur < FILM['lone_s'] - 1e-9:
                continue
            cap = float(np.median([scan.lone[k] for k in range(i, j + 1)]))
            smalls.append(dict(frm=a, to=b, s=round(dur, 2), cap=round(cap, 4)))
            add('lone-line', sev('fail'), f'{a}-{b}', f'a line alone on its ground for {dur:.2f} s at a cap height of {cap * 100:.1f} % of the frame: a '
                'line alone sets at 6 % or more (house 9 %, the hero bigger; two rows rather than a small line), never a small line in a wide empty frame')
    rep['lone'] = smalls
    # 2. frozen holds: nothing changes for over a second mid-film (a line being read: 1.5 s)
    endf = end_rng[0] if end_rng else last + 1 - int(round(2 * fps))
    frozen = [i > 0 and scan.chg[i] < FILM['frozen_d'] and scan.npx[i] < FILM['frozen_px'] for i in range(n)]
    holds = []
    for i, j in runs(frozen):
        a, b = F[i], min(F[j], endf - 1)
        if a < first + open_n or a >= endf or ignored(a):
            continue
        dur = (b - a + 1) / fps
        inread = sum(1 for g in range(a, b + 1) if in_ranges(g, reading)) > 0.5 * (b - a + 1)
        lim = FILM['frozen_read_s'] if inread else FILM['frozen_s']
        if dur > lim + 1e-9:
            holds.append(dict(frm=a, to=b, s=round(dur, 2), read=inread))
            add('frozen-hold', sev('warn'), f'{a}-{b}', f'{b - a + 1} f ({dur:.1f} s) where nothing at all changes'
                f"{' while a line is read' if inread else ''} (house: {lim:g} s at most mid-film, "
                'the end card excepted): cut sooner, let the next element arrive, or give the hold a declared move that lands')
    body = [frozen[i] for i in range(n) if first + open_n <= F[i] < endf]
    share = sum(body) / max(1, len(body))
    rep['frozen'] = dict(holds=holds, share=round(share, 3))
    if len(body) >= 3 * fps and share > FILM['frozen_share']:
        add('frozen-hold', sev('warn'), f'{first}-{last}', f'{share * 100:.0f} % of the body is frozen (house: {FILM["frozen_share"] * 100:.0f} % at '
            'most): the picture keeps changing between its holds')
    # 3. the ending lands: no flat drift, the lockup centred
    end = film_ending(scan)
    rep['ending'] = end
    if end:
        mv = end.get('move')
        if mv and mv['r2'] >= FILM['drift_r2'] and not mv['lands']:
            add('end-drift', sev('warn'), f"{end['frames'][0]}-{end['frames'][1]}", f"the ending slides {mv['travel']:g} px ({mv['axis']}) at a flat "
                f"{mv['speed'] * fps:.1f} px/s to the last frame and never lands (fit r2 {mv['r2']:.2f}): an aimless drift. Let the lockup "
                'settle (an eased move that lands, then still) and hold, the music ringing out')
        c = end.get('centre')
        if c and abs(c['offset']) > FILM['centre'] and c['width'] < 0.8:
            add('end-centre', sev('warn'), end['frames'][1], f"the last frame's lockup sits {abs(c['px']):g} px {'right' if c['px'] > 0 else 'left'} of "
                f"centre (house: within {FILM['centre'] * 100:g} % of the width): the end card lands centred")
    # 4. the world lives: not one still picture for the whole film, not murk with no highlight
    hi = np.array(scan.ring_hi)
    murk = float((hi < FILM['murk_hi']).mean())
    rep['world'] = dict(murk_share=round(murk, 3), ring_p995=round(float(np.median(hi)), 1))
    if murk > FILM['murk_share'] and n >= 3 * fps:
        add('world-murk', sev('warn'), f'{first}-{last}', f"the world has no highlight on {murk * 100:.0f} % of the film (its brightest point "
            f"{float(np.median(hi)):.0f} of 255 at the median): a murky ground. Give the world its key light: a lit gradient, a glow "
            'pool, a rim, a plate with a light source (references/lighting.md)')
    # 5. every line reads against what stands behind it (large type: 3:1; under 2:1 it is lost)
    leg = legibility(scan, pairs)
    rep['legibility'] = leg
    for r in leg:
        if r['ratio'] < FILM['legible'] and not ignored(r['frames'][1]):
            add('legibility', sev('fail' if r['ratio'] < FILM['lost'] else 'warn'), r['frames'][1], f"\"{r['text']}\" reads at {r['ratio']:.2f}:1 "
                f"against its ground ({r['type']} type over luma {r['ground']:.0f}; house: {FILM['legible']:g}:1 for a line, never under "
                f"{FILM['lost']:g}): darken or soften the ground behind the line (a lit gradient, the plate's -soft copy, a scrim the world "
                'motivates), never a grey halo round the letters')
    span = (scan.corners[-1][0] - scan.corners[0][0]) / fps if len(scan.corners) > 1 else 0.0
    if span >= FILM['world_min_s']:
        still_c, tex_c = 0, 0
        for kc in range(4):
            stack = np.stack([c[1][kc] for c in scan.corners])
            med = np.median(stack, 0)
            if float(med.std()) < FILM['world_tex']:
                continue
            tex_c += 1
            mse = ((stack - med) ** 2).mean(axis=(1, 2))
            psnr = 10 * np.log10(255.0 ** 2 / np.maximum(mse, 1e-6))
            ends = 10 * np.log10(255.0 ** 2 / max(1e-6, float(((stack[0] - stack[-1]) ** 2).mean())))
            # unchanged wherever it shows (cards may cover it for a while) and the same at both ends of the film
            if float((psnr >= FILM['world_db']).mean()) >= FILM['world_share'] and ends >= FILM['world_db']:
                still_c += 1
        rep['world'].update(textured_corners=tex_c, still_corners=still_c)
        if tex_c >= 2 and still_c == tex_c:
            add('world-still', sev('warn'), f'{first}-{last}', f'the world is one still picture for the whole film (its textured corners unchanged '
                f'wherever they show, the same at both ends of {span:.0f} s): let it live (clouds that move, light that changes between acts, '
                'the camera entering it, a plate per act) and let it light what sits in it')
    return rep


# ------------------------------------------------------------------------------------------
# the spine: the element carried across the scene changes, read on the pixels
# ------------------------------------------------------------------------------------------
SPINE_F = dict(
    w=480,  # analysis width
    gap_f30=2,  # frames at 30 fps the element may leave its box (a blur peak, the swap frame)
    jump=0.08,  # share of the frame width the declared box may move in one frame (a whip or a speed handover excepted)
    swap_area=0.65,  # an undeclared hard cut changing more of the frame than this swaps the picture
    declared_pad=2,  # frames: a cut this near a declared change is that change
    present_min=6.0,  # luma levels across the element's edge, at least ...
    present_k=2.0,  # ... and this many times the film's floor (the same read on boxes of its empty ground)
    band=0.06, band_px=2,  # the edge bands: this share of the box's short side, at least band_px
    detail=20, sigma=6, block=16, block_share=0.04,  # detail: a pixel 20+ levels off a sigma-6 blur; a block with 4 %+ of them is busy
    type_max=0.25,  # a line alone: a statement on screen, no declared element drawn, busy blocks at most this share (a soft plate behind it)
    rise=(0.08, 1.5),  # a picture after it: busy blocks over the line's own level by 0.08 and 1.5 times
    type_s=0.4, pic_window_s=2.0,  # the line alone holds 0.4 s; the picture is read over the 2 s after it (its upper quartile)
    loops=2,  # unjoined type -> picture turns that fail (one warns)
)
SPINE_FREE = ('momentum', 'whip', 'velocity')  # handovers that carry speed: their box may jump and blur away


def _seam_list(raw):
    """Every declared seam of a cues file: the timeline's and each primitive's (declared.fx[].seams)."""
    d = raw.get('declared') if isinstance(raw.get('declared'), dict) else {}
    out = [s for s in (d.get('seams') or []) if isinstance(s, dict)]
    for fx in d.get('fx') or []:
        if isinstance(fx, dict):
            out += [s for s in (fx.get('seams') or []) if isinstance(s, dict)]
    return out


def spine_inputs(raw, k_, comp_w, video_w, cuts=()):
    """From a cues file: the handovers that carry a box track (video frames, analysis px), every declared change frame
    (seams, handovers, the spine's changes and the declared cuts, with their spans) and whether the film plays a spine."""
    ka = min(SPINE_F['w'], video_w) / float(comp_w)
    vf = lambda x: int(round(float(x) * k_))  # noqa: E731
    tracks, declared = [], []
    for s in _seam_list(raw):
        if _num(s.get('at')):
            sp = s.get('span') if isinstance(s.get('span'), (list, tuple)) and len(s.get('span')) == 2 else None
            declared.append((vf(sp[0]), vf(sp[1])) if sp and all(_num(v) for v in sp) else (vf(s['at']), vf(s['at'])))
        tr = s.get('track')
        if not isinstance(tr, list) or not tr:
            continue
        kind = str(s.get('handover') or s.get('kind') or '')
        samples = {}
        for row in tr:
            if isinstance(row, (list, tuple)) and len(row) >= 5 and all(_num(v) for v in row[:5]):
                samples[vf(row[0])] = tuple(float(v) * ka for v in row[1:5])
        if samples:
            tracks.append(dict(id=str(s.get('id') or f'handover@{s.get("at")}'), kind=kind, at=vf(s.get('at', min(samples))),
                               swap=vf(s['swap']) if _num(s.get('swap')) else None, free=kind in SPINE_FREE or str(s.get('kind')) == 'whip', samples=samples))
    sp = raw.get('spine') if isinstance(raw.get('spine'), dict) else (raw.get('declared') or {}).get('spine') if isinstance(raw.get('declared'), dict) else None
    for c in (sp or {}).get('changes') or []:
        if isinstance(c, dict) and _num(c.get('at')):
            span = c.get('span') if isinstance(c.get('span'), (list, tuple)) and len(c.get('span')) == 2 else None
            declared.append((vf(span[0]), vf(span[1])) if span and all(_num(v) for v in span) else (vf(c['at']), vf(c['at'])))
    declared += [(int(a), int(b)) for a, b in cuts]
    spine = bool(sp) or bool(tracks) or any(str(s.get('id', '')).startswith(('spine:', 'handover:')) for s in _seam_list(raw))
    return tracks, declared, spine


def _edge_step(g, box, band):
    """The luma step across a box's edge: per side inside the frame, the median along the side of |inner band - outer
    band|; the second largest side (one side may sit against something of its own colour), or the only one. None when
    no side can be read (a box that fills the frame: the element is the picture)."""
    H, W = g.shape
    x, y, w, h = box
    x0, y0, x1, y1 = int(round(x)), int(round(y)), int(round(x + w)), int(round(y + h))
    b = band
    cx0, cx1, cy0, cy1 = max(x0, 0), min(x1, W), max(y0, 0), min(y1, H)
    vals = []
    if cx1 - cx0 >= 3:
        if y0 - b >= 0 and y0 + b <= H:
            vals.append(float(np.median(np.abs(g[y0:y0 + b, cx0:cx1].mean(0) - g[y0 - b:y0, cx0:cx1].mean(0)))))
        if y1 + b <= H and y1 - b >= 0:
            vals.append(float(np.median(np.abs(g[y1 - b:y1, cx0:cx1].mean(0) - g[y1:y1 + b, cx0:cx1].mean(0)))))
    if cy1 - cy0 >= 3:
        if x0 - b >= 0 and x0 + b <= W:
            vals.append(float(np.median(np.abs(g[cy0:cy1, x0:x0 + b].mean(1) - g[cy0:cy1, x0 - b:x0].mean(1)))))
        if x1 + b <= W and x1 - b >= 0:
            vals.append(float(np.median(np.abs(g[cy0:cy1, x1 - b:x1].mean(1) - g[cy0:cy1, x1:x1 + b].mean(1)))))
    if not vals:
        return None
    vals.sort(reverse=True)
    return vals[1] if len(vals) >= 3 else vals[0]


class SpineScan:
    """Per-frame reads for the spine checks at SPINE_F['w'] wide: the edge step of each declared handover's box on its
    frames, the floor (the same read on fixed boxes of the frame, the size of the film's median box), the share of the
    frame off the ground, and the hard cuts (SeamScan) with the area they change. Feed RGB frames of any size."""

    def __init__(self, fps, w, h, tracks, seams=None):
        self.fps = fps
        self.aw = min(SPINE_F['w'], w) // 2 * 2
        self.ah = max(2, int(round(h * self.aw / w)) // 2 * 2)
        self.tracks = tracks
        self.seams = seams if seams is not None else SeamScan(fps, w, h)
        self.own_seams = seams is None
        self.step = {}  # (track index, frame) -> edge step or None
        self.floor = []
        self.busy = {}  # frame -> share of busy blocks (detail)
        sizes = [(bw, bh) for t in tracks for (_, _, bw, bh) in t['samples'].values() if bw > 2 and bh > 2]
        self.fb = (float(np.median([s[0] for s in sizes])), float(np.median([s[1] for s in sizes]))) if sizes else (self.aw * 0.2, self.ah * 0.2)
        self.n = 0

    def feed(self, f, rgb):
        if self.own_seams:
            self.seams.feed(f, rgb)
        small = rgb if (rgb.shape[1], rgb.shape[0]) == (self.aw, self.ah) else cv2.resize(rgb, (self.aw, self.ah), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY).astype(np.float32)
        d = np.abs(g - cv2.GaussianBlur(g, (0, 0), SPINE_F['sigma'])) > SPINE_F['detail']
        B = SPINE_F['block']
        hb, wb = self.ah // B, self.aw // B
        if hb and wb:
            self.busy[f] = float((d[:hb * B, :wb * B].reshape(hb, B, wb, B).mean(axis=(1, 3)) > SPINE_F['block_share']).mean())
        for i, t in enumerate(self.tracks):
            box = t['samples'].get(f)
            if box is None:
                continue
            band = max(SPINE_F['band_px'], int(round(SPINE_F['band'] * min(box[2], box[3]))))
            self.step[(i, f)] = _edge_step(g, box, band) if min(box[2], box[3]) >= 2 * band + 2 else None
        # the floor: five fixed boxes of the film's median size, every eighth frame
        if self.n % 8 == 0:
            bw, bh = min(self.fb[0], self.aw * 0.5), min(self.fb[1], self.ah * 0.5)
            band = max(SPINE_F['band_px'], int(round(SPINE_F['band'] * min(bw, bh))))
            for fx, fy in ((0.12, 0.15), (0.62, 0.12), (0.2, 0.62), (0.58, 0.6), (0.4, 0.38)):
                v = _edge_step(g, (fx * self.aw, fy * self.ah, bw, bh), band)
                if v is not None:
                    self.floor.append(v)
        self.n += 1

    def close(self):
        if self.own_seams:
            self.seams.close()


def spine_check(scan, declared, copy_windows, add, sev, ignored, spine=True):
    """The spine checks on a SpineScan: the element in its box on every frame of each declared handover (no gap past
    SPINE_F['gap_f30'] frames at 30 fps, no jump of the declared box past SPINE_F['jump'] of the width), no undeclared
    swap of the picture, and the pixel text-then-cards loop. Returns the report."""
    fps = scan.fps
    floor = float(np.median(scan.floor)) if scan.floor else 0.0
    thr = max(SPINE_F['present_min'], SPINE_F['present_k'] * floor)
    gap_max = max(SPINE_F['gap_f30'], int(round(SPINE_F['gap_f30'] * fps / 30.0)))
    rep = dict(floor=round(floor, 2), present=round(thr, 2), tracks=[], swaps=[], loops=[])
    present = {}
    for i, t in enumerate(scan.tracks):
        frames = sorted(f for f in t['samples'] if (i, f) in scan.step)
        if not frames:
            continue
        ok = {f: (scan.step[(i, f)] is None or scan.step[(i, f)] >= thr) for f in frames}
        present[i] = ok
        gaps, run = [], []
        for f in frames:
            if not ok[f] and not ignored(f):
                run.append(f)
            else:
                if len(run) > gap_max:
                    gaps.append((run[0], run[-1]))
                run = []
        if len(run) > gap_max:
            gaps.append((run[0], run[-1]))
        jumps = []
        W = float(scan.aw)
        for a, b in zip(frames, frames[1:]):
            if b != a + 1 or t['free'] or ignored(b):
                continue
            if t['kind'] in ('swell', 'shrink') and t['swap'] is not None and abs(b - t['swap']) <= 1:
                continue  # the designed one-frame snap under blur
            (x0, y0, w0, h0), (x1, y1, w1, h1) = t['samples'][a], t['samples'][b]
            d = math.hypot((x1 + w1 / 2) - (x0 + w0 / 2), (y1 + h1 / 2) - (y0 + h0 / 2)) / W
            if d > SPINE_F['jump']:
                jumps.append((b, round(d, 3)))
        steps = [scan.step[(i, f)] for f in frames if scan.step[(i, f)] is not None]
        row = dict(id=t['id'], kind=t['kind'], frames=[frames[0], frames[-1]], present=round(sum(ok.values()) / len(frames), 3),
                   step_median=round(float(np.median(steps)), 1) if steps else None, gaps=gaps[:6], jumps=jumps[:6])
        rep['tracks'].append(row)
        if gaps and not t['free']:
            a, b = gaps[0]
            add('spine-track', sev('fail'), f'{a}-{b}', f"the element of {t['id']} leaves its box for {b - a + 1} frames ({(b - a + 1) / fps:.2f} s; at most {gap_max}): "
                f"nothing crisp stands where the handover says the element is (edge step under {thr:.1f} levels). Draw the element across the cut (fx/Handover), "
                f"or declare the change as what it is", gaps=len(gaps))
        if jumps:
            b, d = jumps[0]
            add('spine-track', sev('fail'), b, f"the declared box of {t['id']} jumps {d * 100:.0f} % of the frame width in one frame (at most {SPINE_F['jump'] * 100:.0f} %): "
                'a jump is a cut, not a handover; carry it on a path (a fly, a whip declared as a speed handover)', jumps=len(jumps))
    if spine and not scan.tracks:
        add('spine-track', sev('warn'), 0, 'the cues declare a spine but no handover carries a box track (a seam with `track`): the element\'s path cannot be checked; '
            'declare the handovers through fx/Handover (handoverDeclares) and export the cues again')
    # swaps: hard cuts that change most of the frame with nothing declared there
    pad = SPINE_F['declared_pad']
    near = lambda a, b: any(a - pad <= y and b + pad >= x for x, y in declared)  # noqa: E731
    for a, b in scan.seams.hard():
        rd = scan.seams.reads.get(a) or {}
        area = rd.get('area')
        if area is None or area <= SPINE_F['swap_area'] or near(a, b) or ignored(a):
            continue
        rep['swaps'].append(dict(frame=a, area=area))
        add('swap', sev('fail'), a, f"a hard cut at {a / fps:.2f} s changes {area * 100:.0f} % of the frame with no handover declared there: the picture is swapped, "
            'not handed on. Carry the element into the next scene (grow, shrink, swell and swap, fly, zoom into it) and declare it', area=area)
    # the pixel loop: a line alone (a statement on screen, nothing else carrying detail), then a picture, with no declared
    # element drawn in its box across the turn. Read relative to the line's own level: a soft plate behind it counts
    fr = sorted(scan.busy)
    if fr and copy_windows:
        on = lambda f: any(a <= f < b for a, b in copy_windows)  # noqa: E731
        carried = lambda f: any(f in t['samples'] and present.get(i, {}).get(f, False) for i, t in enumerate(scan.tracks))  # noqa: E731
        tset = set(f for f in fr if on(f) and scan.busy[f] <= SPINE_F['type_max'] and not carried(f))
        need_t, win = max(1, int(round(SPINE_F['type_s'] * fps))), max(2, int(round(SPINE_F['pic_window_s'] * fps)))
        f, last = 0, max(fr)
        while f <= last:
            if f not in tset:
                f += 1
                continue
            a = f
            while f + 1 in tset:
                f += 1
            b = f
            f += 1
            if b - a + 1 < need_t:
                continue
            level = float(np.median([scan.busy[g] for g in range(a, b + 1) if g in scan.busy]))
            after = [scan.busy[g] for g in range(b + 1, b + 1 + win) if g in scan.busy]
            if len(after) < max(2, int(round(0.5 * fps))):  # half a second of picture at least (the film may end)
                continue
            pic = float(np.percentile(after, 75))
            if pic < max(level + SPINE_F['rise'][0], SPINE_F['rise'][1] * level):
                continue
            if any(carried(g) for g in range(b, b + 1 + win)):
                continue
            rep['loops'].append(dict(type=[a, b], picture=[b + 1, b + win], level=round(level, 3), picture_level=round(pic, 3)))
        if rep['loops']:
            x = rep['loops'][0]
            n = len(rep['loops'])
            add('text-then-cards', sev('fail' if n >= SPINE_F['loops'] else 'warn'), x['type'][0],
                f"{n} turn{'s' if n > 1 else ''} from a line alone to a picture with nothing carried across (first at {x['type'][1] / fps:.2f} s: busy blocks "
                f"{x['level'] * 100:.0f} % under the line, {x['picture_level'] * 100:.0f} % after it): a line, a card, again. Let the picture grow out of the line's element, "
                'or put the line inside the product or around the element', loops=n)
    return rep


def spine_frames(extra_raw, k_):
    """The statements' screen windows (video frames) from the cues copy block: kind copy, not ui strings or the name."""
    out = []
    for c in extra_raw.get('copy') or []:
        if isinstance(c, dict) and _num(c.get('in')) and _num(c.get('out')) and str(c.get('kind', 'copy')) not in ('ui', 'name'):
            out.append((int(round(float(c['in']) * k_)), int(round(float(c['out']) * k_))))
    return out


def spine_setup(args, info, decl, force=False):
    """The spine inputs of a run (dict(tracks, declared, spine, copy)), or None when the cues declare no spine and the
    run did not ask for it (--spine)."""
    if not args.cues and not force:
        return None
    try:
        raw = json.load(open(args.cues)) if args.cues else {}
    except (OSError, ValueError):
        raw = {}
    cues_fps = decl[6]
    k_ = info['fps'] / cues_fps if cues_fps else 1.0
    comp_w = getattr(args, 'comp_width', None) or raw.get('width') or (1920 if info['w'] > info['h'] else 1080)
    tracks, declared, spine = spine_inputs(raw, k_, float(comp_w), info['w'], decl[0])
    if not spine and not force:
        return None
    return dict(tracks=tracks, declared=declared, spine=spine, copy=spine_frames(raw, k_))


def spine_only(args, info, decl):
    """Only the spine checks (the element's box track, swaps, the pixel loop), on a decode at SPINE_F['w'] wide."""
    fps = info['fps']
    cuts, freezes, ignore, acts, moments, reading, cues_fps, extra = decl
    S = spine_setup(args, info, decl, force=True)
    tracks, declared, spine = S['tracks'], S['declared'], S['spine']
    sc = SpineScan(fps, info['w'], info['h'], tracks)
    start = max(0, args.from_frame or 0)
    count = max(1, args.to_frame - start + 1) if args.to_frame is not None else None
    for f, rgb in decode(args.video, info, start, count, size=(sc.seams.aw, sc.seams.ah)):
        sc.feed(f, rgb)
    if not sc.n:
        die('decoded 0 frames')
    sc.close()
    flags = []

    def add(check, severity, frame, note, **kw):
        first = frame if isinstance(frame, int) else int(str(frame).split('-')[0])
        flags.append(dict(check=check, severity=severity, frame=frame, t=round(first / fps, 3), note=note, **kw))

    rep = spine_check(sc, declared, S['copy'], add, lambda s: s, lambda f: in_ranges(f, ignore), spine)
    fails = sum(1 for x in flags if x['severity'] == 'fail')
    return dict(file=args.video, fps=round(fps, 3), frames=sc.n, spine_only=True, fails=fails,
                warnings=sum(1 for x in flags if x['severity'] == 'warn'), flags=flags, checks=dict(spine=rep)) | {'pass': fails == 0}


def audio_check(path, args, fps):
    """The film's sound: an audio stream that plays (every film is music-led), and an ending that rings out (the music
    decays 14-60 dB over its last half second). Returns (report, flags)."""
    if getattr(args, 'no_audio', False) or getattr(args, 'loop', False):
        return dict(skipped=True), []
    flags = []

    def flag(check, severity, frame, note):
        flags.append(dict(check=check, severity=severity, frame=frame, t=round(frame / fps, 3) if isinstance(frame, int) else None, note=note))
    try:
        j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index,codec_name', '-of', 'json',
                                       path], capture_output=True, text=True, check=True).stdout or '{}')
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError):
        return dict(error='ffprobe could not read the audio streams'), []
    if not j.get('streams'):
        flag('audio', 'fail', 0, 'the film is silent: no audio stream. Every film is music-led: npm run sound (the licensed track cut to the '
             'picture, the effects kit, the mix into public/audio/soundtrack.wav), then render again; a silent loop passes --no-audio')
        return dict(stream=False), flags
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    if x.size < 16000:
        flag('audio', 'fail', 0, 'the audio stream holds under a second of sound')
        return dict(stream=True, seconds=round(x.size / 16000.0, 2)), flags
    db = lambda v: 20.0 * math.log10(max(1e-9, float(np.sqrt(np.mean(v * v)))))  # noqa: E731
    whole = db(x)
    w = 800  # 50 ms
    nw = x.size // w
    lv = np.array([db(x[i * w:(i + 1) * w]) for i in range(nw)])
    k2 = 40  # 2 s of 50 ms windows
    loud = max(db(x[i * w:(i + k2) * w]) for i in range(0, max(1, nw - k2 + 1), 5))
    end = db(x[-4000:])  # the last 0.25 s
    rep = dict(stream=True, level_db=round(whole, 1), loudest_2s_db=round(loud, 1), last_quarter_db=round(end, 1),
               last_50ms_db=round(float(lv[-1]), 1) if nw else None)
    if whole < FILM['audio_db']:
        flag('audio', 'fail', 0, f'the soundtrack is silent ({whole:.0f} dBFS over the film): mix the track and the kit (npm run sound) and render again')
    elif loud - end < FILM['end_drop_db']:
        last_f = int(round((x.size / 16000.0) * fps)) - 1
        flag('audio-end', 'warn', last_f, f'the sound stops near full level ({loud - end:.0f} dB under its loudest 2 s in the last 0.25 s; the house '
             'decays 14-60 dB): the music is cut at the end. Let the track\'s own ending ring out on the lockup (track.py fit --end auto; '
             'score.py rings the last downbeat out), never a cut')
    return rep, flags


# ------------------------------------------------------------------------------------------
# motion floor: purposeful motion in every second (a film-level density read)
# ------------------------------------------------------------------------------------------
# A frame is FROZEN when nothing in it moves: under 0.02 % of the pixels change by more than 10 grey levels at 320 x 180 and
# its structure moved under 0.012 px (the change on its edges over their gradient: a pale card creeping on a pale ground
# counts as the move it is; a frame with no edges falls back to a mean change under 0.12 levels), or the only change is temporal noise (animated grain: the
# change against two frames back is no larger than against one, where any real motion, even a 0.3 px/f creep, doubles it).
# The floor is the share of the body spent in frozen runs longer than 0.8 s. A film that never stops reads 0 to about 6 %
# (one deliberate long hold); a film built on still holds reads
# 10-25 %. A film fails above 8 %, warns above 5 %; one single frozen run up to 2.5 s (DEAD_S, a short film's one held
# breath) warns at most. It does not reward fake life: an idle bob or an aimless pan keeps the
# frames changing but fails lint-film idle-bob / camera-float and forensics camera-wander.
MOTION_FLOOR = dict(w=320, h=180, chg=10, hold_chg=0.002, hold_mad=0.12, noise_ratio=1.15, noise_mad=1.5, run_s=0.3, fail=0.10, warn=0.08,
                    end_s=2.0, min_body_s=8.0, long_s=60.0, dead_live=0.25, edge=6.0, edge_px=150, disp=0.03,
                    # end-hold: the still run reaching into the end lock (s); edge-cover: the outer band (px at 320 wide) against
                    # the band just inside, the level step, the share of the side, the run that fails (s); end-cut: a fade still
                    # running on the last frames
                    end_warn=2.5, edge_in=3, edge_step=25.0, edge_share=0.85, edge_sd=14.0, edge_flat=0.35, edge_s=0.25,
                    fade_k=6, fade_min=4.0, fade_res=2.5, fade_tail=0.33, fade_dark=20.0, fade_light=235.0,
                    # still-run: one near-still run over still_s before the end lock fails; end-blank: a frame in the last blank_s
                    # where under blank_share of the pixels differ from its median level by blank_lv or more (an empty frame)
                    still_s=0.8, blank_s=0.3, blank_lv=12, blank_share=0.003)


def _edge_sides(g, P):
    """The four sides of a grey frame (320 wide) whose outer column/row differs from the picture just inside it along most of
    the side: a strip that is not the picture (the white base under a world that shrank, a plane moved off the edge). The
    strip is flat along the side (one layer, not content crossing the edge) and the picture inside it is flat across the
    next few px (a step at the edge, not a card's shaded border or a gradient running out of the frame)."""
    k = P['edge_in']
    h, w = g.shape
    out = []
    for name, o, i, i2 in (('left', g[8:h - 8, 0], g[8:h - 8, k], g[8:h - 8, 2 * k]), ('right', g[8:h - 8, w - 1], g[8:h - 8, w - 1 - k], g[8:h - 8, w - 1 - 2 * k]),
                           ('top', g[0, 8:w - 8], g[k, 8:w - 8], g[2 * k, 8:w - 8]), ('bottom', g[h - 1, 8:w - 8], g[h - 1 - k, 8:w - 8], g[h - 1 - 2 * k, 8:w - 8])):
        o = o.astype(np.float32)
        d = o - i.astype(np.float32)
        med = float(np.median(d))
        if abs(med) < P['edge_step'] or float(o.std()) > P['edge_sd']:
            continue
        share = float(max((d > 0.6 * P['edge_step']).mean(), (d < -0.6 * P['edge_step']).mean()))
        if share >= P['edge_share'] and abs(float(i.mean()) - float(i2.mean())) <= P['edge_flat'] * abs(med):
            out.append((name, round(med, 1)))
    return out


def _fade_tail(tail, P):
    """The last frames (grey, oldest first): is a global fade still running on them? Fits the last frame as gain * frame +
    offset of the frame fade_k back; a fade is a small residual with a real change of level; it is cut when its last steps
    are still a third or more of its fastest and the last frame is neither black nor white."""
    if len(tail) < P['fade_k'] + 1:
        return None
    a = tail[-1 - P['fade_k']].astype(np.float64).ravel()
    b = tail[-1].astype(np.float64).ravel()
    A = np.stack([a, np.ones_like(a)], 1)
    (gain, off), *_ = np.linalg.lstsq(A, b, rcond=None)
    res = float(np.sqrt(np.mean((A @ np.array([gain, off]) - b) ** 2)))
    lum = [float(t.mean()) for t in tail]
    steps = [abs(y - x) for x, y in zip(lum, lum[1:])]
    change = abs(lum[-1] - lum[-1 - P['fade_k']])
    last = float(np.mean(steps[-3:]))
    peak = max(steps[-P['fade_k']:])
    out = dict(gain=round(float(gain), 3), offset=round(float(off), 2), residual=round(res, 2), change=round(change, 2),
               last_step=round(last, 2), peak_step=round(peak, 2), last_luma=round(lum[-1], 1))
    # a fade: a real change of level (gain or offset) that a global gain explains (the picture may keep moving under it)
    out['cut'] = bool(change >= P['fade_min'] and res <= max(P['fade_res'], 0.15 * change) and (abs(gain - 1) >= 0.08 or abs(off) >= 6)
                      and last >= max(0.4, P['fade_tail'] * peak) and P['fade_dark'] < lum[-1] < P['fade_light'])
    return out


def motion_floor(path, info, end_from=None, freezes=(), ignore=()):
    """The motion floor of a video: per-frame change at 320 x 180, the near-still runs of MOTION_FLOOR run_s or more, their
    share of the body (after frame 0, before `end_from` (default: the last 2 s), outside `freezes` / `ignore` ranges [a, b]
    in video frames), the seconds with almost no live frame, and the verdict; with it the end hold (the still run that
    reaches into the end lock), the frame edges (a strip that is not the picture) and the ending (a fade cut short).
    Pure measurement (no flags)."""
    P = MOTION_FLOOR
    fps = info['fps']
    n_all = info['frames']
    end = int(end_from) if end_from is not None else max(1, n_all - int(round(P['end_s'] * fps)))
    prev2 = prev = None
    mad, mad2, chg, disp, edges, blank = [], [], [], [], [], []
    tail = deque(maxlen=P['fade_k'] + 2)
    grad_prev = None
    for _, y in decode(path, info, pix='gray', size=(P['w'], P['h'])):
        g = y.astype(np.int16)
        tail.append(y.copy())
        edges.append(_edge_sides(y, P))
        blank.append(float((np.abs(g - int(np.median(y))) >= P['blank_lv']).mean()) < P['blank_share'])
        grad = np.zeros(g.shape, np.float32)  # |dI/dx| + |dI/dy| in grey levels per px
        grad[:, :-1] += np.abs(np.diff(g, axis=1))
        grad[:-1, :] += np.abs(np.diff(g, axis=0))
        if prev is None:
            mad.append(0.0), mad2.append(0.0), chg.append(0.0), disp.append(None)
        else:
            d = np.abs(g - prev)
            mad.append(float(d.mean()))
            chg.append(float((d > P['chg']).mean()))
            mad2.append(float(np.abs(g - prev2).mean()) if prev2 is not None else 2 * float(d.mean()))
            # how far the structure moved (px at 320 wide): the change on edges over their gradient, so a slow creep of a
            # pale card on a pale ground reads as the move it is, whatever its contrast; None on a frame with no edges
            e = np.maximum(grad, grad_prev) > P['edge']
            if e.sum() >= P['edge_px']:
                gs = max(1e-6, float(np.maximum(grad, grad_prev)[e].sum()))
                one = float(d[e].sum()) / gs
                # a slow creep read over two frames as well (half the two-frame shift): 8-bit levels round a sub-pixel step
                # on a pale edge to nothing, its two-frame shift survives; grain does not add up, so a still frame stays still
                two = float(np.abs(g - prev2)[e].sum()) / gs / 2 if prev2 is not None else 0.0
                disp.append(max(one, two))
            else:
                disp.append(None)
        prev2, prev, grad_prev = prev, g, grad
    n = len(mad)
    end = min(end, n)
    skip = lambda f: any(a <= f <= b for a, b in list(freezes) + list(ignore))  # noqa: E731
    body = [f for f in range(1, end) if not skip(f)]
    res = dict(frames=n, fps=round(fps, 3), body_s=round(len(body) / fps, 2), runs=[], frozen_share=0.0, longest_s=0.0, dead_seconds=0,
               median_change=0.0, need=dict(fail=P['fail'], warn=P['warn'], run_s=P['run_s']), measured=len(body) / fps >= P['min_body_s'])

    def frozen(f):
        if f < 1 or chg[f] >= P['hold_chg']:
            return False
        if (disp[f] < P['disp']) if disp[f] is not None else (mad[f] < P['hold_mad']):
            return True
        # grain alone: a small change that is no larger against two frames back, while the frame before changed as much
        # (a picture on twos repeats a frame, so its ratio says nothing: that change is motion)
        return mad[f] < P['noise_mad'] and mad2[f] < P['noise_ratio'] * mad[f] and mad[f - 1] > 0.6 * mad[f]

    fz = [frozen(f) for f in range(n)]
    runs, a = [], None
    for f in body + [None]:
        if f is not None and fz[f] and (a is None or f == last + 1):
            a = f if a is None else a
            last = f
            continue
        if a is not None and (last - a + 1) / fps >= P['run_s']:
            runs.append((a, last))
        a = None
        if f is not None and fz[f]:
            a = last = f
    frozen_n = sum(b - a + 1 for a, b in runs)
    secs = int(len(body) // fps)
    dead = 0
    for s in range(secs):
        win = body[int(round(s * fps)):int(round((s + 1) * fps))]
        if win and sum(0 if fz[f] else 1 for f in win) / len(win) < P['dead_live']:
            dead += 1
    res.update(runs=[[a, b] for a, b in runs], frozen_share=round(frozen_n / max(1, len(body)), 3),
               longest_s=round(max([(b - a + 1) / fps for a, b in runs] or [0.0]), 2), dead_seconds=dead,
               median_change=round(float(np.median([mad[f] for f in body])) / 255, 5) if body else 0.0)
    sh = res['frozen_share']
    # one held breath is allowed: a single near-still run up to DEAD_S (a short film's one deliberate hold) warns at most
    one_hold = len(runs) <= 1 and res['longest_s'] <= DEAD_S
    res['one_hold'] = one_hold
    res['severity'] = ('info' if not res['measured'] else 'warn' if one_hold and sh > P['warn'] else 'ok' if one_hold
                       else 'fail' if sh > P['fail'] else 'warn' if sh > P['warn'] else 'ok')
    if res['severity'] == 'fail' and res['body_s'] > P['long_s']:
        res['severity'] = 'warn'  # a long explainer may breathe: the floor fails launch-length films (up to a minute)
    res['ok'] = res['severity'] in ('ok', 'info', 'warn')
    # the end hold: the longest still run that reaches into the end lock (from its start, before the lock or in it)
    hold, a = None, None
    for f in range(1, n + 1):
        if f < n and fz[f]:
            a = f if a is None else a
            continue
        if a is not None and f - 1 >= end and (hold is None or f - a > hold[1] - hold[0] + 1):
            hold = (a, f - 1)
        a = None
    res['end_hold'] = dict(frames=list(hold), s=round((hold[1] - hold[0] + 1) / fps, 2)) if hold else None
    # the frame edges: the runs where a side shows a strip that is not the picture, and the last frame
    bad = [f for f in range(n) if edges[f] and not skip(f)]
    eruns, a, last_e = [], None, None
    for f in bad + [None]:
        if f is not None and (a is None or f == last_e + 1):
            a = f if a is None else a
            last_e = f
            continue
        if a is not None:
            eruns.append((a, last_e))
        a = last_e = f
    long_e = [(a, b) for a, b in eruns if (b - a + 1) / fps >= P['edge_s']]
    res['edges'] = dict(frames=len(bad), runs=[[a, b] for a, b in long_e][:8], last=edges[n - 1] if n else [],
                        sides=sorted({s for f in bad for s, _ in edges[f]}),
                        first=dict(frame=bad[0], sides=edges[bad[0]]) if bad else None)
    res['ending'] = _fade_tail(list(tail), P)
    # still runs over still_s before the end lock (each one fails), and an empty frame in the last blank_s
    res['still_runs'] = [[a, b] for a, b in runs if (b - a + 1) / fps > P['still_s']]
    k = max(1, int(np.ceil(P['blank_s'] * fps)))
    empty = [f for f in range(max(0, n - k), n) if blank[f]]
    res['end_blank'] = dict(frames=[empty[0], empty[-1]], count=len(empty), of=min(k, n)) if empty else None
    return res


def motion_floor_check(args, info, decl):
    """The motion floor as a check: (report, flags), with the end hold, the frame edges and the ending. The end lock is the
    cues' declared END, else the last 2 s; declared freezes and ignored ranges are left out."""
    extra = decl[7]
    k_ = info['fps'] / decl[6] if decl[6] else 1.0
    end = extra.get('end')
    end_from = int(round(end['from'] * k_)) if end and end.get('to', 0) > end.get('from', 0) else None
    m = motion_floor(args.video, info, end_from=end_from, freezes=decl[1], ignore=decl[2])
    P = MOTION_FLOOR
    fps = info['fps']
    flags = []
    if m['severity'] in ('fail', 'warn'):
        a, b = max(m['runs'], key=lambda r: r[1] - r[0]) if m['runs'] else (0, 0)
        flags.append(dict(check='motion-floor', severity=m['severity'], frame=f'{a}-{b}', t=round(a / fps, 3),
                          note=f"{m['frozen_share'] * 100:.0f} % of the body ({len(m['runs'])} run(s), longest {m['longest_s']:.1f} s) stands near-still for "
                               f"{P['run_s']:g} s or more (floor {P['fail'] * 100:.0f} %; a film that never stops reads under {P['warn'] * 100:.0f} %): keep purposeful "
                               'motion in every second: the decaying tail of the last move (lib/moves holdTail, 0.3-2 px/f@30, same direction), a scale '
                               'creep of 0.1-0.4 %/f, the product working in frame (typing, a counter, a status), or cut sooner. Never an idle bob or an aimless pan'))
    eh = m.get('end_hold')
    if m['measured'] and eh and eh['s'] > P['end_warn']:
        flags.append(dict(check='end-hold', severity='warn', frame=f"{eh['frames'][0]}-{eh['frames'][1]}", t=round(eh['frames'][0] / fps, 3),
                          note=f"the end card stands near-still for {eh['s']:.1f} s (at most {P['end_warn']:g} s): the lockup keeps "
                               'living until the last frame: a slow push that lands, a light pass over the mark, the line settling (lib/moves holdTail), '
                               'or a shorter hold'))
    ed = m.get('edges') or {}
    if ed.get('runs') or ed.get('last'):
        a, b = ed['runs'][0] if ed.get('runs') else (m['frames'] - 1, m['frames'] - 1)
        sides = ', '.join(ed.get('sides') or [s for s, _ in ed.get('last') or []])
        flags.append(dict(check='edge-cover', severity='fail', frame=f'{a}-{b}', t=round(a / fps, 3),
                          note=f"a strip that is not the picture shows at the frame edge ({sides}; {ed['frames']} frame(s)"
                               f"{', the last frame too' if ed.get('last') else ''}): the world, plate or plane does not cover the frame. Keep every "
                               'full-frame layer at scale 1 or more under its moves (a pull-back lands at 1, never below), overscan a plane that '
                               "travels, and give the composition a ground of the world's own colour"))
    if m['measured'] and m.get('still_runs'):
        sr = m['still_runs']
        a, b = max(sr, key=lambda r: r[1] - r[0])
        flags.append(dict(check='still-run', severity='fail', frame=f'{a}-{b}', t=round(a / fps, 3),
                          note=f"{len(sr)} still run(s) over {P['still_s']:g} s before the lockup (longest {(b - a + 1) / fps:.2f} s, from {a / fps:.2f} s; "
                               f"{', '.join(f'{x / fps:.1f}-{y / fps:.1f} s' for x, y in sr[:6])}): the film holds still only on its end card. Keep every hold "
                               'moving between its moves: the decaying tail of the last move, a creep of 0.1-0.4 %/f, a light pass, a rack, the product working'))
    eb = m.get('end_blank')
    if eb and m['frames'] / fps >= 3:
        flags.append(dict(check='end-blank', severity='fail', frame=f"{eb['frames'][0]}-{eb['frames'][1]}", t=round(eb['frames'][0] / fps, 3),
                          note=f"{eb['count']} of the last {eb['of']} frames ({P['blank_s']:g} s) are empty (one flat level): the lockup stays complete and alive to "
                               'the last frame (a creep, a light), never a fade to blank, never an empty last frame'))
    en = m.get('ending')
    if en and en.get('cut') and m['frames'] / fps >= 3:
        flags.append(dict(check='end-cut', severity='fail', frame=m['frames'] - 1, t=round((m['frames'] - 1) / fps, 3),
                          note=f"the film stops mid-fade: the last frames still fade (gain {en['gain']:g}, last steps {en['last_step']:g} of its fastest "
                               f"{en['peak_step']:g} levels) and the last frame sits at luma {en['last_luma']:g}, neither black nor the held card. Let the fade "
                               "land (an ease-out that reaches its end a few frames before the last), or end on the held lockup with the music's ring-out"))
    return m, flags


def merge_flags(res, flags):
    """Add flags made outside a pass (the audio) to a result: counts and verdict."""
    if not flags:
        return res
    res['flags'] = flags + res['flags']
    res['fails'] = res.get('fails', 0) + sum(1 for x in flags if x['severity'] == 'fail')
    res['warnings'] = res.get('warnings', 0) + sum(1 for x in flags if x['severity'] == 'warn')
    res['pass'] = res['fails'] == 0
    return res


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
    ok('motion-frozen' not in fl, '... and its still holds between the jumps (0.7 s each) pass: a hold may be still', f"{m['frozen_frames30']} f@30 frozen")
    two = [(a, a + 1, ('stepped', f'tick{a}')) for a in steps[:2]] + [(a, a + 1, ('flash', f'f{a}')) for a in steps[2:]]
    m, fl = gates(film(jumps), snaps_ok=two)
    ok('motion-snap' in fl, 'two or more declared snap devices fail motion-snap (a film keeps one)', f"{m['snap_runs']} devices")
    line = np.full((h * 3, w, 3), 236, np.uint8)
    cv2.rectangle(line, (150, 250), (330, 270), (40, 40, 40), -1)  # one line of type on a clean field
    m, fl = gates(film(lambda f: (0.0, 0.075 * f), img=line))
    ok('motion-frozen' not in fl, 'a sparse frame creeping 0.3 px/f is not frozen', f"{m['frozen_frames30']} f@30 frozen")
    m, fl = gates(film(lambda f: (0.0, 0.0), img=line))
    ok('motion-frozen' in fl, 'the same frame locked off for 3.5 s (nothing changes past DEAD_S) is a dead stretch', f"{m['frozen_frames30']} f@30 frozen")

    # a real rest: a move lands on E.glideOut, the picture holds still 16 f, then drifts on: a held beat, not a freeze;
    # the same landing followed by a 40 f still is a dead stretch (frozen)
    def landed(hold):
        def pos(f):
            y = 60.0 * glide_out((f - 30) / 24)
            return y + (drift * (f - 54 - hold) if f > 54 + hold else 0.0), 0.0
        return pos

    m, fl = gates(film(landed(16), smear=True))
    ok('motion-frozen' not in fl and m['longest_rest60'] >= 8,
       'a move that lands and rests 16 f@60 before moving on is a rest (reported), not motion-frozen',
       f"rests {m['rests_after_landing']}, longest {m['longest_rest60']} f@60, frozen {m['frozen']}")
    m, fl = gates(film(landed(40), smear=True))
    ok('motion-frozen' not in fl, 'the same landing followed by a 40 f still hold passes (a hold may be still)', f"frozen {m['frozen']}")
    m, fl = gates(film(landed(400), smear=True))
    ok('motion-frozen' in fl, 'the same landing followed by 3.1 s where nothing changes is a dead stretch (fails motion-frozen)', f"frozen {m['frozen']}")

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


def seam_self_test(check):
    """The seam checks on synthetic films measured in memory (no encode): what each hard cut carries, the ground flips
    and the seam plan. Returns the number of failures."""
    fps, w, h = 30, 480, 270
    bad = [0]

    def ok(cond, what, detail=''):
        bad[0] += 0 if cond else 1
        check(cond, what, detail)

    def ground(v):
        return np.full((h, w, 3), v, np.uint8)

    def card(v, seed):
        img = ground(v)
        img[27:243, 48:432] = texture(seed, 384, 216, scale=4)
        return img

    def rect(v, c, x0, y0, x1, y1):
        img = ground(v)
        img[y0:y1, x0:x1] = c
        return img

    def disc(v, c, cx, cy, r):
        img = ground(v)
        cv2.circle(img, (cx, cy), r, (c, c, c), -1)
        return img

    def scan_of(frames):
        sc = SeamScan(fps, w, h)
        for i, fr in enumerate(frames):
            sc.feed(i, fr)
        sc.close()
        return sc

    def gate(frames, seams=(), acts=None, copy_n=0, plan=True):
        flags = []
        add = lambda check_, severity, frame, note, **kw: flags.append(dict(check=check_, severity=severity, frame=frame, note=note))  # noqa: E731
        ss = list(seams) or ([dict(at=0, kind='hard', id='plan')] if plan else [])  # a film with a seam plan
        rep = seam_check(scan_of(frames), dict(seams=ss, stepped=[]), 1.0, acts or {}, add, lambda s: s, lambda f: False, copy_n)
        return rep, flags

    # a light ground with a card, the same ground with another card (ground kept), a dark ground with a disc on the
    # other side (bare, and a flip), the light ground with a bar (bare, a flip back)
    film = [card(236, 1)] * 30 + [card(236, 2)] * 30 + [disc(30, 220, 380, 135, 40)] * 30 + [rect(236, 40, 40, 110, 140, 150)] * 30
    rep, fl = gate(film)
    cuts = rep['cuts']
    ok(len(cuts) == 3 and 'ground' in cuts[0]['devices'] and cuts[1]['bare'] and cuts[2]['bare'],
       'seams: a card swap on a kept ground carries the ground; a cut to another ground and another place carries nothing (bare)',
       json.dumps([(c['frame'], c['devices'], c['ground_shift'], c['area'], c['anchor_px']) for c in cuts]))
    ok(any(x['check'] == 'carried-cut' and x['severity'] == 'fail' for x in fl), 'seams: 2 bare cuts of 3 fail carried-cut (house: at most 10 %)',
       str([x['check'] for x in fl]))
    ok(len(rep['flips']) == 2 and not any(x['check'] == 'ground-flip' for x in fl), 'seams: two ground flips are inside the house (at most 2)',
       json.dumps(rep['flips']))
    rep, fl = gate(film, plan=False)
    ok(any(x['check'] == 'carried-cut' and x['severity'] == 'warn' for x in fl) and not any(x['severity'] == 'fail' for x in fl),
       'seams: the same film without a seam plan warns, never fails (a matched shape the plan would name is invisible to the pixels)',
       str([(x['check'], x['severity']) for x in fl]))

    # the same cut to a dark ground with the bar held in its slot: the anchor carries it
    film = [rect(236, 40, 140, 115, 340, 155)] * 30 + [rect(30, 220, 150, 115, 330, 155)] * 30
    rep, fl = gate(film)
    ok(len(rep['cuts']) == 1 and 'anchor' in rep['cuts'][0]['devices'] and not rep['cuts'][0]['bare'],
       'seams: a cut that flips the ground but holds the line in its slot carries an anchor', json.dumps(rep['cuts']))

    # the centre slot: a centred line on paper cut to a picture with a centred line (another size, a few px lower) is
    # carried; the same cut with the incoming line set at the left edge is not
    photo = texture(5, w, h, scale=3, amp=20, tint=(0.55, 0.7, 0.9))

    def lined(img, x0, x1, y0, y1, c):
        out = img.copy()
        out[y0:y1, x0:x1] = c
        return out
    film = [rect(236, 40, 150, 120, 330, 150)] * 30 + [lined(photo, 120, 360, 124, 156, 250)] * 30
    rep, _ = gate(film)
    ok(len(rep['cuts']) == 1 and rep['cuts'][0]['anchor'] == 'slot', 'seams: a centred line cut to a picture with its line centred keeps the centre slot',
       json.dumps(rep['cuts']))
    film = [rect(236, 40, 150, 120, 330, 150)] * 30 + [lined(photo, 16, 200, 200, 232, 250)] * 30
    rep, _ = gate(film)
    ok(len(rep['cuts']) == 1 and rep['cuts'][0]['bare'], 'seams: the same cut with the incoming line low at the left edge carries nothing',
       json.dumps(rep['cuts']))

    # a cut inside a blur: the outgoing shot softens into it, the incoming one resolves out of it
    A, B = texture(3, w, h, scale=2), texture(4, w, h, scale=2, tint=(0.5, 0.6, 0.9))
    soft = lambda img, s: img if s < 0.3 else cv2.GaussianBlur(img, (0, 0), s)  # noqa: E731
    film = [A] * 20 + [soft(A, 0.6 * i) for i in range(1, 9)] + [soft(B, 0.6 * (9 - i)) for i in range(1, 9)] + [B] * 20
    rep, _ = gate(film)
    ok(len(rep['cuts']) == 1 and 'blur' in rep['cuts'][0]['devices'], 'seams: a cut at the peak of a blur carries the blur',
       json.dumps([(c['frame'], c['blur_dip'], c['devices']) for c in rep['cuts']]))

    # a velocity cut: the exit builds x1.2 a 30 fps frame into the cut at whip speed (the picture travels a quarter of the frame in
    # its last 0.2 s), the next shot enters the same way and decays
    A6, B6 = texture(3, w, h, scale=6), texture(4, w, h, scale=6, tint=(0.5, 0.6, 0.9))

    def whip(scale):
        xs, x = [], 0.0
        for k in range(30):
            x += 30.0 * 0.83 ** (29 - k)
            xs.append(x)
        fr = [warp(A6, dx=-v * scale) for v in xs]
        x = 0.0
        for j in range(30):
            x += 0.7 * 30.0 * 0.86 ** j
            fr.append(warp(B6, dx=-x * scale))
        return fr
    rep, _ = gate(whip(1.0), seams=[dict(at=30, kind='velocity', id='velocityCut:push')])
    c = (rep['cuts'] or [{}])[0]
    ok(bool(rep['cuts']) and 'motion' in c['devices'] and not c['bare'] and c['seam'] == 'velocity-cut',
       'seams: a velocity cut at whip speed (the picture a fifth of the frame or more in its last 0.2 s) carries the motion',
       json.dumps([c.get('carry'), c.get('travel')]))
    # the same cut at 0.44x the speed (on a finer picture, where the flow reads every step): its build (a frame at 60 fps) and
    # decay are measured; the subject is still in frame and readable when it is swapped (a whip that does not hide its cut),
    # bare on a kept-ground film, and a declared seam the pixels show bare fails
    A6, B6 = A, B
    rep, fl = gate(whip(0.44), seams=[dict(at=30, kind='velocity', id='velocityCut:push')])
    c = (rep['cuts'] or [{}])[0]
    cr = c.get('carry', {})
    ok(bool(rep['cuts']) and cr.get('build60') and 1.05 <= cr['build60'] <= 1.45 and cr.get('decay60') and 8 <= cr['decay60'] <= 36,
       'seams: a velocity cut\'s build (a frame at 60 fps) and decay are measured', json.dumps(c.get('carry')))
    ok(bool(rep['cuts']) and c.get('slow') and c.get('bare') and any(x['check'] == 'carried-cut' and x['severity'] == 'fail' and 'declared' in x['note']
                                                                for x in fl),
       'seams: a whip whose picture travels a tenth of the frame in its last 0.2 s is slow and bare, and its declared velocity seam fails',
       json.dumps([c.get('carry'), c.get('travel')]))

    # a card swapped for another card in another place on the same ground: the kept ground alone hides nothing
    film = [rect(236, 40, 40, 40, 200, 140)] * 30 + [rect(236, 90, 260, 120, 440, 230)] * 30
    rep, _ = gate(film)
    c = (rep['cuts'] or [{}])[0]
    ok(bool(rep['cuts']) and 'ground' in c['devices'] and c['bare'], 'seams: a card swapped for another elsewhere on the kept ground is bare',
       json.dumps([(x['frame'], x['devices'], x['area']) for x in rep['cuts']]))

    # a cut run whose inner frame mixes both pictures (a dissolve collapsed into a frame) is a ghost; a torn cut (half the
    # frame already cut) too
    mix = (0.5 * card(236, 1).astype(np.float32) + 0.5 * card(30, 2).astype(np.float32)).astype(np.uint8)
    rep, fl = gate([card(236, 1)] * 30 + [mix] + [card(30, 2)] * 30)
    ok(any(x['check'] == 'ghost-cut' for x in fl), 'seams: a one-frame 50 % mix between two pictures is a ghost cut',
       json.dumps([(x['frame'], x['to'], x['ghost']) for x in rep['cuts']]))
    torn = card(30, 2).copy()
    torn[:, :w // 2] = card(236, 1)[:, :w // 2]
    rep, fl = gate([card(236, 1)] * 30 + [torn] + [card(30, 2)] * 30)
    ok(any(x['check'] == 'ghost-cut' and 'torn' in x['note'] for x in fl), 'seams: a frame half cut (the left half still the last picture) is a torn cut',
       json.dumps([(x['frame'], x['to'], x['ghost']) for x in rep['cuts']]))

    # the ground flips four times (fails), a colour flip of three steps 5 frames apart is one event
    film = [ground(236)] * 30 + [ground(28)] * 30 + [ground(236)] * 30 + [ground(28)] * 30 + [ground(236)] * 30
    rep, fl = gate(film)
    ok(len(rep['flips']) == 4 and any(x['check'] == 'ground-flip' and x['severity'] == 'fail' for x in fl),
       'seams: a ground that flips light <-> dark four times fails ground-flip', json.dumps(rep['flips']))
    film = [ground(236)] * 30 + [ground(28)] * 5 + [ground(236)] * 5 + [ground(28)] * 35
    rep, _ = gate(film)
    ok(len(rep['flips']) == 1, 'seams: three flips 5 frames apart that end dark are one colour event', json.dumps(rep['flips']))
    lav, navy = np.full((h, w, 3), (189, 187, 241), np.uint8), np.full((h, w, 3), (15, 16, 45), np.uint8)
    rep, _ = gate([lav] * 30 + [navy] * 30 + [lav] * 30 + [navy] * 30 + [lav] * 30)
    ok(not rep['flips'], 'seams: a colour field moving between its light and its deep state is one ground family, not a flip', json.dumps(rep['flips']))

    # the seam plan: five scene changes of one kind fail seam-mix; named recipes from fx/Seam count as theirs
    still = [card(236, 1)] * 20
    one = [dict(at=10 * (i + 1), kind='zoomThrough', id=f'z{i}') for i in range(5)]
    rep, fl = gate(still, seams=one, copy_n=5)
    ok(rep['plan']['top'] == 'zoom-through' and any(x['check'] == 'seam-mix' and x['severity'] == 'fail' for x in fl)
       and any(x['check'] == 'seam-mix' and x['severity'] == 'warn' for x in fl),
       'seams: five zoom-throughs in five changes fail seam-mix; 5 lines with no exit-then-enter, text-swap or match-cut warn', json.dumps(rep['plan']))
    mixed = [dict(at=10, kind='breath', id='exitEnter:a'), dict(at=20, kind='defocus', id='textSwap:b'), dict(at=30, kind='morph', id='matchCut:c'),
             dict(at=40, kind='zoomThrough', id='z'), dict(at=50, kind='velocity', id='v')]
    rep, fl = gate(still, seams=mixed, copy_n=5)
    ok(not any(x['check'] == 'seam-mix' for x in fl) and 'exit-then-enter' in rep['plan']['kinds'] and 'text-swap' in rep['plan']['kinds'],
       'seams: a mixed plan with an exit-then-enter and a text-swap passes seam-mix', json.dumps(rep['plan']))
    # a spine film (lib/spine spineDeclares): each change counts by its handover, whatever seam kind it declares for the
    # devices it promises; six handovers of six kinds that all declare a shape carried (morph) pass, five converges fail
    hs = ['grow', 'swell', 'fly', 'stay', 'word', 'same-surface']
    spine = [dict(at=10 * (i + 1), kind='morph', carry='shape', id=f'spine:H{i + 1}-{k}:request:a>b', handover=k) for i, k in enumerate(hs)]
    rep, fl = gate(still * 4, seams=spine)
    ok(not any(x['check'] == 'seam-mix' for x in fl) and rep['plan']['changes'] == 6 and rep['plan']['top_share'] <= SEAM['mix'],
       'seams: a spine film of six handover kinds that each declare morph passes seam-mix (counted by handover)', json.dumps(rep['plan']))
    conv = [dict(at=10 * (i + 1), kind='breath', carry='shape', id=f'spine:H12-converge:request:a>b{i}', handover='converge') for i in range(5)]
    rep, fl = gate(still * 4, seams=conv)
    ok(rep['plan']['top'] == 'handover:converge' and any(x['check'] == 'seam-mix' and x['severity'] == 'fail' for x in fl),
       'seams: a spine film that converges at all five changes fails seam-mix', json.dumps(rep['plan']))
    return bad[0]


def film_self_test(check, tmp):
    """The film checks on synthetic films measured in memory (an empty stall, a frozen hold, an ending that drifts or lands,
    a still or murky world), and the sound checks on three small muxed clips. Failures are counted by `check`."""
    fps, w, h = 30, 480, 270

    def scan_of(frames):
        fs = FilmScan(fps, w, h)
        for i, fr in enumerate(frames):
            fs.feed(i, fr)
        return fs

    def gate(frames, reading=(), end_rng=None):
        fl = []
        add = lambda check_, severity, frame, note, **kw: fl.append(dict(check=check_, severity=severity, frame=frame, note=note))  # noqa: E731
        rep = film_check(scan_of(frames), {}, add, lambda s: s, lambda f: False, reading, end_rng)
        return rep, fl

    def names(fl):
        return sorted({(x['check'], x['severity']) for x in fl})
    ground = np.full((h, w, 3), 24, np.uint8)
    lit = cv2.GaussianBlur(texture(9, w, h, scale=8, mean=150, amp=60), (0, 0), 1.0)  # a lit world with highlights

    def card(img, x, seed=1):
        out = img.copy()
        out[70:200, int(x):int(x) + 220] = texture(seed, 220, 130, scale=2, mean=128, amp=110)
        return out
    # a card scene, 20 f with nothing crisp (the ground alone, still), the next card: an empty stall; a 2 f gap passes
    moving = [card(lit, 60 + 2 * i) for i in range(30)]
    rep, fl = gate(moving + [cv2.GaussianBlur(lit, (0, 0), 6)] * 20 + [card(lit, 200 + 2 * i, 2) for i in range(30)])
    check(('empty-frame', 'fail') in names(fl), 'film: 20 f with nothing crisp between two scenes fail empty-frame (a stall)', str(names(fl)))
    rep, fl = gate(moving + [cv2.GaussianBlur(lit, (0, 0), 6)] * 2 + [card(lit, 200 + 2 * i, 2) for i in range(30)])
    check(not any(x['check'] == 'empty-frame' for x in fl), 'film: a 2 f blur peak between two scenes passes', str(names(fl)))
    # 45 f where nothing changes mid-film warn frozen-hold; 25 f pass; inside a reading window 45 f pass
    tail = [card(lit, 100 + i, 2) for i in range(60)]
    rep, fl = gate(moving + [moving[-1]] * 45 + tail)
    check(('frozen-hold', 'warn') in names(fl), 'film: 1.5 s frozen mid-film warns frozen-hold (house 1 s)', str(names(fl)))
    rep, fl = gate(moving + [moving[-1]] * 25 + tail)
    check(not any(x['check'] == 'frozen-hold' for x in fl), 'film: 0.8 s frozen passes (holds may be still)', str(names(fl)))
    rep, fl = gate(moving + [moving[-1]] * 40 + tail, reading=[(30, 75)])
    check(not any(x['check'] == 'frozen-hold' for x in fl), 'film: 1.3 s frozen while a line is read passes (1.5 s)', str(names(fl)))
    # a speck at a scene change: a small chip alone on the empty ground for 12 f fails; for 4 f, or a big card, passes
    flat = np.full((h, w, 3), 236, np.uint8)

    def chip(img, cw, ch):
        out = img.copy()
        x0, y0 = (w - cw) // 2, (h - ch) // 2
        out[y0:y0 + ch, x0:x0 + cw] = (40, 90, 220)
        return out
    big = [chip(flat, 300, 170)] * 20

    def gate_s(frames):
        fl = []
        add = lambda check_, severity, frame, note, **kw: fl.append(dict(check=check_, severity=severity))  # noqa: E731
        film_check(scan_of(frames), {}, add, lambda s: s, lambda f: False, (), None, seams=[30])
        return fl
    fl = gate_s(big + [chip(flat, 60, 24)] * 12 + big)
    check(('speck', 'fail') in names(fl), 'film: a small chip alone on the empty ground for 12 f at a scene change fails speck', str(names(fl)))
    fl = gate_s(big + [chip(flat, 60, 24)] * 4 + big)
    check(not any(x['check'] == 'speck' for x in fl), 'film: a chip for 4 f (or a big card) at a scene change passes', str(names(fl)))
    # a line alone: rows of letters at a 4 % cap for 0.5 s fail lone-line; the same at an 8 % cap pass
    def line_img(cap):
        img = flat.copy()
        ch = max(3, int(round(cap * h)))
        y0 = (h - ch) // 2
        for k in range(12):  # letter-like strokes across a third of the width
            x = int(w * 0.33) + k * int(w * 0.03)
            img[y0:y0 + ch, x:x + max(2, ch // 4)] = 30
            img[y0:y0 + max(2, ch // 6), x:x + int(w * 0.02)] = 30
        return img
    fl = gate_s(big + [line_img(0.04)] * 16 + big)
    check(('lone-line', 'fail') in names(fl), 'film: a line alone at a 4 % cap for 0.5 s fails lone-line', str(names(fl)))
    fl = gate_s(big + [line_img(0.08)] * 16 + big)
    check(not any(x['check'] == 'lone-line' for x in fl), 'film: a line alone at an 8 % cap passes', str(names(fl)))

    # the ending: a lockup sliding at a flat 0.25 px/f to the last frame warns end-drift; the same slide eased to a stop passes
    def lockup(dx):
        img = np.full((h, w, 3), 20, np.uint8)
        cv2.rectangle(img, (150, 120), (178, 148), (235, 235, 235), -1)
        for j in range(6):
            cv2.rectangle(img, (192 + 22 * j, 122), (206 + 22 * j, 146), (240, 240, 240), -1)
        return warp(img, dx=dx)
    body = [card(lit, 60 + 2 * i) for i in range(60)]
    rep, fl = gate(body + [lockup(0.25 * i) for i in range(75)])
    check(('end-drift', 'warn') in names(fl), 'film: an ending that slides at a flat 7.5 px/s to the last frame warns end-drift', str(rep.get('ending')))
    rep, fl = gate(body + [lockup(18.0 * (1 - (1 - min(1.0, i / 40.0)) ** 3)) for i in range(75)])
    check(not any(x['check'] == 'end-drift' for x in fl), 'film: the same move eased to a stop, then still, passes', str(rep.get('ending')))
    rep, fl = gate(body + [lockup(40.0)] * 75)
    check(('end-centre', 'warn') in names(fl), 'film: a lockup held 90 px right of centre warns end-centre', str(rep.get('ending')))
    rep, fl = gate(body + [lockup(7.0)] * 75)
    check(not any(x['check'] == 'end-centre' for x in fl), 'film: a centred lockup passes end-centre', str(rep.get('ending')))

    # the world: one textured photo for 10 s under changing cards warns world-still; the photo drifting with a camera passes; murk
    photo = texture(4, w + 200, h, scale=5, mean=140, amp=70)
    frames = [card(photo[:, :w], 60 + (i % 90)) if (i // 60) % 2 else photo[:, :w].copy() for i in range(300)]
    rep, fl = gate(frames)
    check(('world-still', 'warn') in names(fl), 'film: one still photo for 10 s warns world-still', str(rep.get('world')))
    frames = [card(np.ascontiguousarray(photo[:, int(i * 0.6):int(i * 0.6) + w]), 60 + (i % 90)) if (i // 60) % 2
              else np.ascontiguousarray(photo[:, int(i * 0.6):int(i * 0.6) + w]) for i in range(300)]
    rep, fl = gate(frames)
    check(not any(x['check'] == 'world-still' for x in fl), 'film: the same world crossed by a camera passes', str(rep.get('world')))
    murk = cv2.GaussianBlur(texture(5, w, h, scale=8, mean=40, amp=30), (0, 0), 6)
    rep, fl = gate([card(murk, 60 + i) for i in range(120)])
    check(('world-murk', 'warn') in names(fl), 'film: a dark blurred world with no highlight warns world-murk', str(rep.get('world')))

    # legibility: a white line arriving over a bright haze fails (about 1.4:1); the same line over a dark ground passes
    def lined(g):
        out = np.full((h, w, 3), g, np.uint8)
        cv2.putText(out, 'SEE THE VIEW', (90, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 5, cv2.LINE_AA)
        return out
    for g, want in ((215, True), (40, False)):
        frames = [np.full((h, w, 3), g, np.uint8)] * 20 + [lined(g)] * 40 + [np.full((h, w, 3), g, np.uint8)] * 30
        extra = dict(copy=[{'id': 'l', 'text': 'See the view', 'kind': 'copy', 'in': 20, 'resolved': 24, 'out': 60}])
        pairs = legibility_frames(extra, 1.0)
        fs = FilmScan(fps, w, h, keep={f for _, gg, b in pairs for f in (*gg, b)})
        for i, fr in enumerate(frames):
            fs.feed(i, fr)
        fl = []
        rep = film_check(fs, extra, lambda check_, severity, frame, note, **kw: fl.append(dict(check=check_, severity=severity)),
                         lambda s: s, lambda f: False, (), None, pairs)
        got = any(x['check'] == 'legibility' and x['severity'] == 'fail' for x in fl)
        check(got == want, f"film: a white line over a {'bright haze fails' if want else 'dark ground passes'} legibility", str(rep.get('legibility')))

    # the sound: no audio stream fails; a tone cut at full level warns; the same tone fading out passes
    class A:
        no_audio = False
        loop = False
    clip = os.path.join(tmp, 'film-a.mp4')
    write_clip(clip, [ground] * 60, fps)
    _, fl = audio_check(clip, A, fps)
    check(any(x['check'] == 'audio' and x['severity'] == 'fail' for x in fl), 'audio: a film with no audio stream fails', str(names(fl)))
    for name, af, want in (('cut', 'volume=0.5', True), ('ring', 'volume=0.5,afade=t=out:st=1.3:d=0.7', False)):
        out = os.path.join(tmp, f'film-{name}.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', clip, '-f', 'lavfi', '-i', 'sine=frequency=330:duration=2', '-af', af, '-c:v', 'copy',
                        '-c:a', 'aac', '-shortest', out], capture_output=True)
        _, fl = audio_check(out, A, fps)
        got = any(x['check'] == 'audio-end' for x in fl)
        check(got == want and not any(x['severity'] == 'fail' for x in fl),
              f"audio: a tone {'cut at full level warns audio-end' if want else 'that fades over its last 0.7 s passes'}", str(names(fl)))
    return 0


def spine_self_test(tmp):
    """The spine checks on synthetic clips (--spine): a card carried along its declared track passes; the card gone from
    its box for 5 frames, or its declared box jumping a third of the frame in one frame, fails spine-track; an
    undeclared hard cut that swaps the picture fails swap (declared, it passes); a line alone on an empty frame, then a
    picture, twice, fails text-then-cards (with an element drawn across the turns, it passes). Returns the failures."""
    fps, w, h = 30, 480, 270
    bad = 0
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    ground = np.broadcast_to((np.array([38, 42, 50], np.float32) + 30 * yy), (h, w, 3)).astype(np.uint8)
    card = lambda img, x, y: cv2.rectangle(img, (int(x), int(y)), (int(x) + 60, int(y) + 40), (222, 226, 232), -1)  # noqa: E731
    ease = lambda t: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, t)))  # noqa: E731

    def check(ok, what, detail=''):
        nonlocal bad
        bad += 0 if ok else 1
        print(f"{'pass' if ok else 'FAIL'}  forensics self-test: {what}" + (f'  ({detail})' if detail else ''))

    def run(name, frames, seams=(), copy=(), mode='--spine'):
        clip = os.path.join(tmp, f'spine-{name}.mp4')
        if not os.path.exists(clip):
            write_clip(clip, frames, fps)
        cp = os.path.join(tmp, f'spine-{name}-cues.json')
        json.dump(dict(fps=fps, total=len(frames), width=w, acts=dict(a={'from': 0, 'dur': len(frames)}), cue={}, events=[],
                       copy=[dict(id=f'l{i}', text='A line', kind='copy', resolved=a, **{'in': a, 'out': b}) for i, (a, b) in enumerate(copy)],
                       look=dict(blur='crisp', texture='clean', filmType='launch', oneTake=False, whiteWorld=False),
                       declared=dict(seams=list(seams), fx=[], end={'from': 0, 'to': 0})), open(cp, 'w'))
        out = os.path.join(tmp, f'spine-{name}{mode}.json')
        r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--cues', cp, mode, '--json', out, '--no-audio'], capture_output=True, text=True)
        try:
            return json.load(open(out))
        except (OSError, ValueError):
            print(r.stdout[-400:], r.stderr[-400:])
            return {'flags': [], 'checks': {}}

    def flags(rep, name, severity=None):
        return [x for x in rep['flags'] if x['check'] == name and (severity is None or x['severity'] == severity)]

    # a card flying across the frame on frames 10-40, its declared box on every frame
    xs = {f: 60 + 300 * ease((f - 10) / 30) for f in range(10, 41)}
    track = [[f, round(x, 1), 110.0, 60.0, 40.0] for f, x in xs.items()]
    seam = dict(at=25, kind='morph', carry='shape', id='handover:H8-fly:request', handover='fly', span=[10, 40], track=track)
    pos = lambda f: xs[min(40, max(10, f))]  # noqa: E731
    clip = [card(ground.copy(), pos(f), 110) for f in range(60)]
    rep = run('carried', clip, [seam])
    check(not flags(rep, 'spine-track') and not flags(rep, 'swap'), 'a card carried along its declared box track passes spine-track',
          json.dumps((rep.get('checks', {}).get('spine') or {}).get('tracks', [])[:1])[:240])
    gone = [ground.copy() if 20 <= f <= 24 else card(ground.copy(), pos(f), 110) for f in range(60)]
    rep = run('gap', gone, [seam])
    check(bool(flags(rep, 'spine-track', 'fail')), 'the card gone from its box for 5 frames fails spine-track', str([x['note'][:80] for x in flags(rep, 'spine-track')]))
    rep = run('gap', gone, [seam], mode='--grammar-only')
    check(bool(flags(rep, 'spine-track', 'fail')) and 'spine' in (rep.get('checks', {}).get('grammar') or {}),
          'with handovers declared in the cues, --grammar-only runs the spine checks too', str([(x['check'], x['note'][:60]) for x in rep['flags'] if 'spine' in x['check']]))
    jx = {f: (100 if f < 25 else 260) for f in range(10, 41)}
    jseam = dict(seam, track=[[f, float(x), 110.0, 60.0, 40.0] for f, x in jx.items()])
    jumped = [card(ground.copy(), jx[min(40, max(10, f))], 110) for f in range(60)]
    rep = run('jump', jumped, [jseam])
    check(any('jumps' in x['note'] for x in flags(rep, 'spine-track', 'fail')), 'a declared box jumping a third of the frame in one frame fails spine-track',
          str([x['note'][:80] for x in flags(rep, 'spine-track')]))
    # a swap: one picture, then another, cut in one frame, nothing declared there
    A, B = texture(1, w, h, mean=70), texture(2, w, h, mean=190)
    swapped = [A] * 30 + [B] * 30
    rep = run('swap', swapped)
    check(bool(flags(rep, 'swap', 'fail')), 'an undeclared hard cut that changes most of the frame fails swap', str([x['note'][:80] for x in flags(rep, 'swap')]))
    rep = run('swap-declared', swapped, [dict(at=30, kind='hard', id='spine:cut:request:card>page')])
    check(not flags(rep, 'swap'), 'the same cut declared (a spine section break) is no swap')
    # the pixel loop: a line alone on the ground, then a picture, twice; then the same with an element drawn across the turns
    def line(img):
        cv2.putText(img, 'A line on its own', (120, 142), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (235, 235, 235), 2, cv2.LINE_AA)
        return img
    P = texture(3, w, h, mean=120)
    loop = [line(ground.copy()) for _ in range(20)] + [P.copy() for _ in range(20)] + [line(ground.copy()) for _ in range(20)] + [P.copy() for _ in range(20)]
    cuts = [dict(at=20, kind='hard', id='cut-a'), dict(at=40, kind='hard', id='cut-b'), dict(at=60, kind='hard', id='cut-c')]
    rep = run('loop', loop, cuts, copy=[(0, 20), (40, 60)])
    check(bool(flags(rep, 'text-then-cards', 'fail')), 'a line alone, then a picture, twice, with nothing carried across fails text-then-cards',
          str([x['note'][:90] for x in flags(rep, 'text-then-cards')]))
    held = [card(f_, 200, 180) for f_ in loop]
    stays = [dict(at=20, kind='morph', carry='shape', id='handover:H9-stay:a', handover='stay', span=[14, 26], track=[[f, 200.0, 180.0, 60.0, 40.0] for f in range(14, 27)]),
             dict(at=60, kind='morph', carry='shape', id='handover:H9-stay:b', handover='stay', span=[54, 66], track=[[f, 200.0, 180.0, 60.0, 40.0] for f in range(54, 67)])]
    rep = run('loop-carried', held, stays + [cuts[1]], copy=[(0, 20), (40, 60)])
    check(not flags(rep, 'text-then-cards') and not flags(rep, 'spine-track'), 'the same turns with the element drawn in its box across them pass',
          str([(x['check'], x['note'][:80]) for x in rep['flags']]))
    return bad


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


def self_test(part='all'):
    """Synthetic clips with known motion: each grammar check must fire where it should and stay
    quiet where it should not. Returns the exit code. part 'spine': only the spine checks."""
    import shutil
    import tempfile
    tmp = tempfile.mkdtemp(prefix='cinetic-forensics-')
    if part == 'spine':
        bad = spine_self_test(tmp)
        shutil.rmtree(tmp, ignore_errors=True)
        print('forensics self-test (spine): ' + ('all pass' if not bad else f'{bad} failed'))
        return 1 if bad else 0
    fps, w, h = 30, 480, 270
    bad = 0
    count = [0]

    def cues(n, seams=(), stepped=(), end=None, look=True, flashes=(), fx=()):
        c = dict(fps=fps, total=n, acts=dict(a={'from': 0, 'dur': n}), cue={}, events=[], copy=[])
        if look:
            c['look'] = dict(blur='crisp', texture='clean', filmType='launch', oneTake=False, whiteWorld=False)
            c['declared'] = dict(seams=list(seams), stepped=list(stepped), flashes=list(flashes), cameraBlur=[], end=end or {'from': 0, 'to': 0}, fx=list(fx))
        count[0] += 1
        path = os.path.join(tmp, f'cues{count[0]}.json')
        json.dump(c, open(path, 'w'))
        return path

    def run(name, frames, cue_path, more=()):
        clip = os.path.join(tmp, name + '.mp4')
        write_clip(clip, frames, fps)
        out = os.path.join(tmp, name + '.json')
        r = subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--cues', cue_path, '--json', out, '--no-banding', '--no-smear',
                            '--no-judder', '--no-audio', *more], capture_output=True, text=True)
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

    def floor_tests():
        # the motion floor (11 s clips: a film-level read): a slow one-way tail passes; still holds fail, with grain on them too;
        # one held breath of 2 s passes
        nf = 330
        rep = run('floor-tail', [warp(A, dx=0.1 * i) for i in range(nf)], cues(nf), more=('--motion-floor',))
        mf = rep.get('checks', {}).get('motion_floor') or {}
        check(not flags(rep, 'motion-floor'), 'motion floor: a 0.4 px/f@1080 one-way tail all through is never frozen', json.dumps({k: mf.get(k) for k in ('frozen_share', 'runs')}))
        seg = lambda i: (i % 105) if (i % 105) < 60 else 60  # noqa: E731  2 s moving, 1.5 s held, three times
        holds = [warp(A, dx=1.5 * (60 * (i // 105) + seg(i))) for i in range(nf)]
        rep = run('floor-holds', holds, cues(nf), more=('--motion-floor',))
        mf = rep.get('checks', {}).get('motion_floor') or {}
        check(bool(flags(rep, 'motion-floor', 'fail')), 'motion floor: three 1.5 s still holds in 9 s fail', json.dumps({k: mf.get(k) for k in ('frozen_share', 'runs')}))
        rng = np.random.default_rng(7)
        grain = [np.clip(fr.astype(np.float32) + rng.normal(0, 1.0, fr.shape[:2])[..., None], 0, 255).astype(np.uint8) for fr in holds]
        rep = run('floor-grain', grain, cues(nf), more=('--motion-floor',))
        mf = rep.get('checks', {}).get('motion_floor') or {}
        check(bool(flags(rep, 'motion-floor', 'fail')), 'motion floor: the same holds under animated grain still fail (grain is not motion)',
              json.dumps({k: mf.get(k) for k in ('frozen_share', 'runs')}))
        pale = np.full((h, w, 3), 233, np.uint8)  # a pale card with pale rows on a pale ground: little contrast, few edges
        cv2.rectangle(pale, (140, 75), (340, 200), (250, 250, 250), -1, cv2.LINE_AA)
        for r_ in range(3):
            cv2.rectangle(pale, (160, 100 + 30 * r_), (290 - 30 * r_, 112 + 30 * r_), (205, 208, 212), -1, cv2.LINE_AA)
        rep = run('floor-pale', [warp(pale, dx=0.3 * i) for i in range(nf)], cues(nf), more=('--motion-floor',))
        mf = rep.get('checks', {}).get('motion_floor') or {}
        check(not flags(rep, 'motion-floor'), 'motion floor: a pale card creeping 1.2 px/f@1080 (a house tail) on a pale ground is motion (read by its edges, not its contrast)',
              json.dumps({k: mf.get(k) for k in ('frozen_share', 'runs')}))
        rep = run('floor-pale-still', [pale] * nf, cues(nf), more=('--motion-floor',))
        check(bool(flags(rep, 'motion-floor', 'fail')), 'motion floor: the same pale card held still all through fails')
        one = [warp(A, dx=1.5 * (i if i < 120 else 120 if i < 180 else i - 60)) for i in range(nf)]
        rep = run('floor-one', one, cues(nf), more=('--motion-floor',))
        check(not flags(rep, 'motion-floor', 'fail'), 'motion floor: one held breath of 2 s passes (warns at most)', str([x['severity'] for x in flags(rep, 'motion-floor')]))
        check(bool(flags(rep, 'still-run', 'fail')), 'still-run: that 2 s held breath mid-film fails (the film holds still only on its end card)',
              json.dumps((rep.get('checks', {}).get('motion_floor') or {}).get('still_runs')))
        short = [warp(A, dx=1.5 * (i if i < 120 else 120 if i < 141 else i - 21)) for i in range(nf)]
        rep = run('floor-short', short, cues(nf), more=('--motion-floor',))
        check(not flags(rep, 'still-run'), 'still-run: a 0.7 s rest between two moves passes', json.dumps((rep.get('checks', {}).get('motion_floor') or {}).get('still_runs')))
        # the frame edges: a light strip down both sides of a dark moving world (the base showing past a shrunk ground) fails
        dark = texture(3, w, h, mean=70, amp=30)
        strip = []
        for i in range(nf):
            fr = warp(dark, dx=0.3 * i)
            if i >= 150:
                fr[:, :2] = 200
                fr[:, w - 2:] = 200
            strip.append(fr)
        rep = run('floor-edge', strip, cues(nf), more=('--motion-floor',))
        check(bool(flags(rep, 'edge-cover', 'fail')), 'edge-cover: a light strip down both sides of a dark world from 5 s to the end fails',
              json.dumps((rep.get('checks', {}).get('motion_floor') or {}).get('edges')))
        check(not flags(run('floor-edge-ok', strip[:150], cues(150), more=('--motion-floor',)), 'edge-cover'), 'edge-cover: the same world covering the frame passes')
        # the ending: a fade still running on the last frame fails end-cut; one that lands on black passes
        moving = [warp(dark, dx=0.3 * i) for i in range(nf)]
        cut = [np.clip(fr.astype(np.float32) * (1 - 0.6 * max(0, i - (nf - 10)) / 10), 0, 255).astype(np.uint8) for i, fr in enumerate(moving)]
        rep = run('floor-endcut', cut, cues(nf), more=('--motion-floor',))
        check(bool(flags(rep, 'end-cut', 'fail')), 'end-cut: a fade to 40 % still running on the last frame fails', json.dumps((rep.get('checks', {}).get('motion_floor') or {}).get('ending')))
        landed = [np.clip(fr.astype(np.float32) * (1 - min(1.0, max(0, i - (nf - 24)) / 14)), 0, 255).astype(np.uint8) for i, fr in enumerate(moving)]
        rep = run('floor-endok', landed, cues(nf), more=('--motion-floor',))
        check(not flags(rep, 'end-cut'), 'end-cut: a fade that lands on black 10 frames before the end passes', json.dumps((rep.get('checks', {}).get('motion_floor') or {}).get('ending')))
        check(bool(flags(rep, 'end-blank', 'fail')), 'end-blank: that same fade, landed on an empty black frame, fails (the lockup holds to the last frame)',
              json.dumps((rep.get('checks', {}).get('motion_floor') or {}).get('end_blank')))
        check(not flags(run('floor-endlive', moving, cues(nf), more=('--motion-floor',)), 'end-blank'), 'end-blank: a picture still moving on its last frame passes')
    A, B = texture(1, w, h), texture(2, w, h)
    n = 90
    if part == 'motion':
        floor_tests()
        shutil.rmtree(tmp, ignore_errors=True)
        print('forensics self-test (motion floor): ' + ('all pass' if not bad else f'{bad} failed'))
        return 1 if bad else 0
    rep = run('frozen', [A] * 120, cues(120))
    check(bool(flags(rep, 'dead-stretch', 'fail')), 'a 4 s hold where nothing changes fails dead-stretch', f"{len(flags(rep, 'dead-stretch', 'fail'))} fail")
    check(not flags(rep, 'static-share', 'warn') and not flags(rep, 'motion-energy'), 'static-share and motion-energy are info only (a still hold passes)')
    rep = run('still2', [A] * 60 + [warp(A, dx=-6.0 * i) for i in range(30)], cues(90))
    check(not flags(rep, 'dead-stretch') and not flags(rep, 'hold', 'fail') and not flags(rep, 'hold', 'warn'), 'a 2 s still hold before a move passes (the camera is still unless a shot moves)',
          str([(x['check'], x['severity']) for x in rep['flags'] if x['check'] in ('hold', 'dead-stretch', 'quiet')]))
    rep = run('creep', [warp(A, k=1 + 0.03 * i / fps) for i in range(n)], cues(n))
    check(not flags(rep, 'dead-stretch', 'fail'), 'a 3 %/s creep is not a dead stretch', f"live share {gram(rep).get('holds', {}).get('live_share')}")
    rep = run('drift', [warp(A, dx=12 * i / fps / 4) for i in range(n)], cues(n))
    check(not flags(rep, 'dead-stretch', 'fail') and not flags(rep, 'camera-wander', 'fail'), 'a 12 px/s one-way creep (at 1080p) is neither dead nor a wander', json.dumps(gram(rep).get('wander', {})))
    floor_tests()
    # the old camera float: +-24 px at 1080p sideways at 1.3 rad/s, the push breathing 3 %: it pans one way and back
    fl6 = [warp(A, dx=24 * math.cos(1.3 * i / fps) / 4, k=1 + 0.015 * (1 + math.sin(1.3 * i / fps))) for i in range(180)]
    rep = run('float', fl6, cues(180))
    check(bool(flags(rep, 'camera-wander')), 'the old camera float (24 px sideways, 1.3 rad/s) is an aimless camera (camera-wander)', json.dumps(gram(rep).get('wander', {})))
    # a designed track: one way, eased from rest to rest, then a still hold
    trk = [warp(A, dx=-160 / 4 * (lambda t: t * t * (3 - 2 * t))(min(1.0, i / 48))) for i in range(110)]
    rep = run('track', trk, cues(110))
    check(not flags(rep, 'camera-wander') and not flags(rep, 'dead-stretch'), 'a declared track that starts, travels and lands, then a still hold, passes', json.dumps(gram(rep).get('wander', {})))
    # an aimless pan: one way through the whole shot at a flat 36 px/s (at 1080p), never starting or landing
    rep = run('slowpan', [warp(A, dx=-36 / 4 * i / fps) for i in range(n)], cues(n))
    check(any('drift' in x['note'] for x in flags(rep, 'camera-wander')), 'a flat 36 px/s pan through the whole shot (no start, no landing) is a drift (camera-wander)',
          json.dumps(gram(rep).get('wander', {}))[:300])
    # the depth stage's declared shots (fx/depth shotDeclares): eased moves from rest to rest
    ease = lambda t: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, t)))  # noqa: E731
    k_at = lambda i, a, b, k0, k1: k0 + (k1 - k0) * ease((i - a) / (b - a))  # noqa: E731
    stage = [{'id': 'stage3d', 'shots': [], 'stages': [{'from': 0, 'to': 100, 'id': 'stage3d'}]}]
    # a declared push, a hold, then a declared pull straight back: back and forth at any speed
    pp = [warp(A, k=k_at(i, 6, 36, 1.0, 1.25) if i < 46 else k_at(i, 46, 76, 1.25, 1.0)) for i in range(100)]
    fx_pp = [{'id': 'stage3d', 'shots': [{'from': 6, 'to': 36, 'kind': 'push', 'id': 'in'}, {'from': 46, 'to': 76, 'kind': 'pull', 'id': 'out'}]}]
    rep = run('shots-back', pp, cues(100, fx=fx_pp))
    check(bool(flags(rep, 'camera-wander', 'fail')), 'a declared push, then a declared pull straight back 0.3 s after it lands, goes back and forth (camera-wander fails)',
          json.dumps(gram(rep).get('wander', {}))[:300])
    # a declared push, a hold, then a declared travel on: purposeful moves, each landing; the stage is otherwise still
    po = [warp(A, k=k_at(i, 6, 36, 1.0, 1.25), dx=0 if i < 46 else -160 / 4 * ease((i - 46) / 30)) for i in range(100)]
    fx_po = [{'id': 'stage3d', 'shots': [{'from': 6, 'to': 36, 'kind': 'push', 'id': 'in'}, {'from': 46, 'to': 76, 'kind': 'travel', 'id': 'on'}],
              'stages': stage[0]['stages']}]
    rep = run('shots-on', po, cues(100, fx=fx_po))
    check(not flags(rep, 'camera-wander'), 'a declared push, a hold, then a declared travel on (each starting and landing) passes camera-wander',
          json.dumps(gram(rep).get('wander', {}))[:300])
    # inside a declared stage, a flat 36 px/s creep that no shot declares (1.8 s): a drift outside the shots
    od = [warp(A, k=k_at(i, 6, 36, 1.0, 1.25), dx=0 if i < 45 else -36 / 4 * (i - 45) / fps) for i in range(100)]
    fx_od = [{'id': 'stage3d', 'shots': [{'from': 6, 'to': 36, 'kind': 'push', 'id': 'in'}], 'stages': stage[0]['stages']}]
    rep = run('shots-outside', od, cues(100, fx=fx_od))
    check(any('outside every declared shot' in x['note'] for x in flags(rep, 'camera-wander')), 'inside a declared stage, a pan no shot declares is a drift (camera-wander)',
          json.dumps(gram(rep).get('wander', {}))[:300])

    def blob(i):  # a still card with one small chip sliding across it: one small thing moves
        out = A.copy()
        x = int(40 + 3 * i)
        cv2.rectangle(out, (x, 120), (x + 24, 140), (250, 250, 250), -1)
        return out
    rep = run('onething', [blob(i) for i in range(120)], cues(120))
    check(not flags(rep, 'motion-energy') and not flags(rep, 'dead-stretch'), 'one small chip moving on a still frame for 4 s passes: the product changes, the camera rests',
          json.dumps(gram(rep).get('energy', {}).get('runs', [])[:1]))
    rep = run('frozen11', [A] * 120, cues(120, look=False))
    check(not flags(rep, 'dead-stretch', 'fail') and not flags(rep, 'dead-stretch', 'warn'), 'without 1.2 declarations dead-stretch is info only')
    # an undeclared film checked with --grammar: its last 2 s are the end lock (a closing card may lock off)
    lock = [warp(A, dx=12 * i / fps / 4) for i in range(60)] + [warp(A, dx=12 * 59 / fps / 4)] * 60
    rep = run('endlock', lock, cues(120, look=False), ['--grammar'])
    check(not flags(rep, 'dead-stretch', 'fail'), 'an undeclared film (--grammar) may lock off in its last 2 s')
    rep = run('midlock', lock[60:] + lock[:60], cues(120, look=False), ['--grammar'])
    check(not flags(rep, 'dead-stretch', 'fail'), 'the same 2 s lock mid-film passes (a still hold under 2.5 s)')
    dead = [warp(A, dx=12 * i / fps / 4) for i in range(30)] + [warp(A, dx=12 * 29 / fps / 4)] * 90 + [warp(A, dx=12 * (29 + i) / fps / 4) for i in range(90)]
    rep = run('midlock3', dead, cues(210, look=False), ['--grammar'])
    check(bool(flags(rep, 'dead-stretch', 'fail')), 'a 3 s lock mid-film where nothing changes fails dead-stretch')
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
    rep = run('turned-code', turn, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry', v=30, ratio=0.7)]))
    note = (flags(rep, 'carried-cut', 'fail') or [{}])[0].get('note', '')
    check('code 30 px/f out, 21 in; pixels' in note, 'a seam that declares v prints the speed in the code beside the pixels', note[:160])
    # an incoming picture that repeats (stripes crossed by lines every 12 px): the flow reads its step only modulo the
    # period (here a sideways step, cos 0), so the seam warns and is never failed on that read
    xs = np.arange(w * 2)
    stripes = np.repeat(np.repeat((128 + 90 * np.sign(np.sin(2 * math.pi * xs / 12))).astype(np.uint8)[None, :], h, 0)[..., None], 3, 2)
    stripes[::12] = 60
    tiles = push[:45] + [warp(stripes, dx=-sum(30 * 0.7 * 0.85 ** j for j in range(i)) / 4) for i in range(45)]
    rep = run('tiles', tiles, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry')]))
    car = gram(rep).get('carried', [])
    # the speed read's own verdicts (the hide rule may still call a 41 px/f push too slow to hide its cut: another read)
    speed_read = lambda r, s: [x for x in flags(r, 'carried-cut', s) if x['note'].startswith('declared velocity seam')]  # noqa: E731
    check(not speed_read(rep, 'fail') and bool(speed_read(rep, 'warn')) and bool(car) and car[0]['unsure'] and car[0]['period'],
          'a velocity seam read on a repeating picture warns (the step is known only modulo its period), never fails', json.dumps(car[:1]))
    # type that slides the other way over the incoming shot: its lines are masked out of the flow
    def typed(img, dx):
        out = img.copy()
        cv2.rectangle(out, (0, 20), (w - 1, 250), (232, 232, 232), -1)
        for row, word in enumerate(('CARRY THE SPEED', 'ACROSS THE CUT', 'AND LET IT DECAY', 'ONE FRAME AT A', 'TIME')):
            cv2.putText(out, word, (int(16 + dx), 58 + 44 * row), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (20, 20, 20), 3, cv2.LINE_AA)
        return out
    over = push[:45] + [typed(warp(B, dx=-sum(30 * 0.7 * 0.85 ** j for j in range(i)) / 4), 3.0 * i) for i in range(45)]
    rep = run('typed', over, cues(90, seams=[dict(at=45, kind='velocity', carry='x', dir=-1, id='carry')]))
    car = gram(rep).get('carried', [])
    check(bool(car) and car[0]['text'] > 0.3 and not speed_read(rep, 'fail'), 'type sliding the other way over the incoming shot is masked out of the flow', json.dumps(car[:1]))
    rep = run('breath', push[:45] + [np.zeros_like(A)] + [warp(B, dx=-sum(30 * 0.7 * 0.85 ** j for j in range(i)) / 4) for i in range(44)],
              cues(90, seams=[dict(at=45, kind='breath', id='breath')]))
    check(not flags(rep, 'spike', 'fail') and not flags(rep, 'ghost') and not flags(rep, 'hold-into-exit'),
          'a declared breath (a hard cut through one empty frame) is craft: no pop, no ghost, no continuity cut', str([x['check'] for x in rep['flags']]))
    rep = run('stillcut', [A] * 45 + [B] * 45, cues(90, seams=[dict(at=45, kind='hard', id='cut')]))
    check(bool(flags(rep, 'still-cut', 'info')) and not flags(rep, 'still-cut', 'warn'), 'a cut from a still frame to a still frame is reported (info): holds may be still')
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
    # a jump: a slow drift whose layer steps 24 px (at 1080p) in one frame, as a sway switched off does: motion explains
    # the change, but nothing around it moves, so it fails; the same step on a declared hard seam is a cut
    jumpy = [warp(A, dx=0.15 * i + (6.0 if i >= 45 else 0.0)) for i in range(n)]
    rep = run('jump', jumpy, cues(n))
    check(any(x.get('cls') == 'jump' for x in flags(rep, 'spike', 'fail')), 'a slow drift that steps 24 px in one frame fails spike (a jump)',
          str([(x['frame'], x.get('cls')) for x in flags(rep, 'spike')]))
    rep = run('jump-seam', jumpy, cues(n, seams=[dict(at=45, kind='hard', id='cut')]))
    check(not flags(rep, 'spike', 'fail'), 'the same step on a declared hard seam is a cut, not a jump', str([(x['frame'], x.get('cls')) for x in flags(rep, 'spike')]))
    # a pop-in: on a slow drift a solid chip appears whole on its cue (warn); the same chip fading in over 10 f does not
    def chip(img, a):
        out = img.astype(np.float32)
        y0, y1, x0, x1 = 205, 229, 370, 410  # a small chip: a region spike, under the whole-frame floor (a whole-frame hit warns already)
        out[y0:y1, x0:x1] = (1 - a) * out[y0:y1, x0:x1] + a * np.array([20, 60, 150], np.float32)  # a dark accent chip (the read is on luma)
        return out.astype(np.uint8)
    soft = texture(3, w, h, scale=48, amp=24)  # a quiet ground (a page, a lit wall): the chip is the only event
    drift_ = [warp(soft, dx=0.15 * i) for i in range(n)]
    cue_path = cues(n)
    cj = json.load(open(cue_path))
    cj['cue'] = {'chip': 45}
    json.dump(cj, open(cue_path, 'w'))
    rep = run('popin', [chip(f, 1.0 if i >= 45 else 0.0) for i, f in enumerate(drift_)], cue_path)
    check(any(x.get('cls') == 'pop-in' for x in flags(rep, 'spike', 'warn')), 'a chip that arrives whole on its cue warns (pop-in)', str([(x['frame'], x.get('cls')) for x in flags(rep, 'spike')]))
    rep = run('fadein', [chip(f, min(1.0, max(0.0, (i - 44) / 10))) for i, f in enumerate(drift_)], cue_path)
    check(not any(x.get('cls') == 'pop-in' for x in flags(rep, 'spike')), 'the same chip fading in over 10 f does not', str([(x['frame'], x.get('cls')) for x in flags(rep, 'spike')]))
    race = list(steps)
    race[46] = np.full_like(A, 250)  # mid-pose: a pose held 3 frames never makes a one-frame image
    rep = run('stepghost', race, cues(n, stepped=[{'from': 0, 'to': n, 'fps': 10, 'id': 'steps'}]))
    check(bool(flags(rep, 'ghost', 'fail')), 'a one-frame image inside a stepped range of 3-frame poses is still a ghost', f"{len(flags(rep, 'ghost'))} ghost")
    # the motion gates through the CLI: a list that jumps a row in one frame fails motion-snap; its short still holds pass
    L = ui_list(w, h * 2)
    hard = [warp(L, dy=-12.0 * sum(1 for a in (12, 27, 42, 57, 72) if i >= a)) for i in range(n)]
    rep = run('hardlist', hard, cues(n))
    check(bool(flags(rep, 'motion-snap', 'fail')) and not flags(rep, 'motion-frozen', 'fail'), 'a list that jumps rows in one frame fails motion-snap (its 0.5 s still holds pass)',
          f"{len(flags(rep, 'motion-snap'))} snap, {len(flags(rep, 'motion-frozen'))} frozen")
    # a declared flash is designed: no ghost, no pop (it declares itself through the cues, no --cuts)
    flash = [warp(A, dx=0.25 * i) for i in range(45)] + [np.full_like(A, 250)] + [warp(A, dx=0.25 * (46 + i)) for i in range(44)]
    rep = run('flash', flash, cues(n, flashes=[{'f': 45, 'frames': 1, 'id': 'flash'}]))
    check(not flags(rep, 'ghost', 'fail') and not flags(rep, 'spike', 'fail'), 'a declared flash frame is neither a ghost nor a pop',
          f"{len(flags(rep, 'ghost'))} ghost, {len(flags(rep, 'spike'))} spike")
    # border: a flat band that holds still while the picture pans is a gap; dark strokes scrolling along the edge
    # over paper are content crossing it; the same flat band on a held picture only warns
    def banded(img):
        o = img.copy()
        o[:2] = 18
        return o
    rep = run('sliver', [banded(warp(A, dx=3.0 * i)) for i in range(45)], cues(45))
    check(bool(flags(rep, 'border', 'fail')), 'a flat 2 px band holding still while the picture pans fails border',
          json.dumps([x['note'][:90] for x in flags(rep, 'border')]))
    strokes = np.full((2, w * 3, 3), 236, np.uint8)
    for x in range(0, w * 3, 14):
        strokes[:, x:x + 9] = 40
    paper = np.full_like(A, 236)
    rep = run('edgeink', [np.concatenate([strokes[:, 5 * i:5 * i + w], paper[2:]]) for i in range(45)], cues(45))
    check(not flags(rep, 'border'), 'strokes scrolling along the edge over paper are content, not a sliver',
          f"{len(flags(rep, 'border'))} border")
    rep = run('heldband', [banded(A)] * 45, cues(45))
    check(bool(flags(rep, 'border', 'warn')) and not flags(rep, 'border', 'fail'), 'a flat band on a held picture warns, never fails',
          f"{[x['severity'] for x in flags(rep, 'border')]}")
    bad += motion_self_test(check)
    bad += seam_self_test(check)
    bad += film_self_test(check, tmp)
    bad += spine_self_test(tmp)
    # the same picture at 60 and at 30 fps (every second frame): a pan, a 1.5 s hold drifting 0.004 px a 60 fps frame,
    # a pan; the quiet stretch is found at both rates (its window is 1 s at any rate, not 60 frames)
    P = texture(1, w + 600, h)
    xs, x = [], 0.0
    for i in range(180):
        x += 6.0 if i < 30 or i >= 120 else 0.004
        xs.append(x)
    verdict = {}
    for r in (60, 30):
        clip = os.path.join(tmp, f'rate{r}.mp4')
        write_clip(clip, [warp(P, dx=-v) for v in xs[::60 // r]], r)
        cp = os.path.join(tmp, f'rate{r}.json')
        json.dump(dict(fps=r, total=3 * r, acts=dict(a={'from': 0, 'dur': 3 * r}), cue={}, events=[], copy=[], pace='crisp'), open(cp, 'w'))
        out = os.path.join(tmp, f'rate{r}-rep.json')
        subprocess.run([sys.executable, os.path.abspath(__file__), clip, '--cues', cp, '--json', out, '--no-banding', '--no-smear', '--no-judder',
                        '--no-grammar', '--no-audio'], capture_output=True, text=True)
        try:
            rep = json.load(open(out))
        except (OSError, ValueError):
            rep = {'flags': [], 'thresholds': {}}
        verdict[r] = (sorted({(x['check'], x['severity']) for x in rep['flags'] if x['check'] in ('hold', 'quiet')}), rep.get('thresholds', {}))
    check(verdict[60][0] == verdict[30][0] and all(sv == 'info' for _, sv in verdict[60][0]) and verdict[30][1].get('quiet_window') == 30 and verdict[30][1].get('max_hold') == 75,
          'a near-still hold reads the same at 60 and at 30 fps, and passes (info; the quiet window 1 s, the dead-stretch run 2.5 s at either rate)',
          f"{verdict[60][0]} / {verdict[30][0]}; at 30 fps window {verdict[30][1].get('quiet_window')} f, hold {verdict[30][1].get('max_hold')} f")
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
    probe_m = MotionProbe(fps, pw, ph, pair_frames=pf, tiles=False, force={x for c in cuts_v for x in (c - 1, c + kk)},
                          seam_frames=velocity_frames(extra, k_))
    dis_n = max(2, int(round(4 * fps / 60)))
    disq = deque(maxlen=dis_n + 2)
    M = dict(idx=[], dissolve=[], probe=probe_m, motion=MotionCurves(fps), seams=SeamScan(fps, info['w'], info['h']),
             film=FilmScan(fps, info['w'], info['h'], keep={f for _, g, b in legibility_frames(extra, k_) for f in (*g, b)}))
    S = getattr(args, '_spine', None)
    M['spine'] = SpineScan(fps, info['w'], info['h'], S['tracks'], seams=M['seams']) if S else None
    start = max(0, args.from_frame or 0)
    count = max(1, args.to_frame - start + 1) if args.to_frame is not None else None
    for f, rgb in decode(args.video, info, start, count, size=(pw, ph)):
        g8 = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        M['idx'].append(f)
        probe_m.feed(f, g8)
        M['motion'].feed(f, motion_luma(rgb))
        M['seams'].feed(f, rgb)
        M['film'].feed(f, rgb)
        if M['spine'] is not None:
            M['spine'].feed(f, rgb)
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


def seams_only(args, info, decl):
    """Only the seam checks (the device each hard cut carries, the ground flips, the seam plan), on a small decode."""
    args.grammar = True
    fps = info['fps']
    cuts, freezes, ignore, acts, moments, reading, cues_fps, extra = decl
    k_ = fps / cues_fps if cues_fps else 1.0
    sc = SeamScan(fps, info['w'], info['h'])
    pairs = legibility_frames(extra, k_)
    fs = FilmScan(fps, info['w'], info['h'], keep={f for _, g, b in pairs for f in (*g, b)})
    start = max(0, args.from_frame or 0)
    count = max(1, args.to_frame - start + 1) if args.to_frame is not None else None
    for f, rgb in decode(args.video, info, start, count, size=(sc.aw, sc.ah)):
        sc.feed(f, rgb)
        fs.feed(f, rgb)
    if not sc.f:
        die('decoded 0 frames')
    sc.close()
    flags = []

    def add(check, severity, frame, note, **kw):
        first = frame if isinstance(frame, int) else int(str(frame).split('-')[0])
        flags.append(dict(check=check, severity=severity, frame=frame, t=round(first / fps, 3), note=note, **kw))

    ign = lambda f: in_ranges(f, ignore)  # noqa: E731
    rep = seam_check(sc, extra, k_, acts, add, lambda s: s, ign, extra.get('copy_n', 0))
    end = extra.get('end')
    vf = lambda x: int(round(x * k_))  # noqa: E731
    reading = [(vf(a), vf(b)) for a, b in reading]
    film = film_check(fs, extra, add, lambda s: s, ign, reading, (vf(end['from']), vf(end['to'])) if end else None, pairs)
    fails = sum(1 for x in flags if x['severity'] == 'fail')
    return dict(file=args.video, fps=round(fps, 3), frames=len(sc.f), seams_only=True, fails=fails,
                warnings=sum(1 for x in flags if x['severity'] == 'warn'), flags=flags,
                checks=dict(grammar=dict(seams=rep, film=film))) | {'pass': fails == 0}


def energy_line(res):
    """The motion energy summary under the verdict line (the grammar's energy measure, when it ran)."""
    g = res.get('checks', {}).get('grammar') or res.get('grammar') or {}
    en = g.get('energy')
    seam_line(g.get('seams'))
    if en and en.get('measured'):
        print(f"  motion energy: median {en['median']:.2f} of the structure moving {ENERGY['px']:g} px/s+, under {ENERGY['low']:g} on "
              f"{en['low_share'] * 100:.0f} % of the body, longest {en['longest_s']:g} s (band: {ENERGY['warn_s']:g} s, {ENERGY['share'] * 100:.0f} %)")
    m = g.get('motion') or {}
    if 'longest_rest60' in m:
        print(f"  motion rests: longest {m['longest_rest60']:g} f@60 near still, {m['rests_per10s']:g} rests of {MOTION['rest_min60']} f+ per 10 s, "
              f"dynamic range {m['dynamic']:g} (p90 / p25), {len(m.get('rests_after_landing', []))} held rest(s) after a landing")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument('video', nargs='?')
    ap.add_argument('--self-test', nargs='?', const='all', choices=['all', 'spine', 'motion'],
                    help='run the checks on synthetic clips made in code, then exit (spine: only the spine checks)')
    ap.add_argument('--json', help='write the report here (e.g. out/qa/forensics.json)')
    ap.add_argument('--cues', help='out/cues.json: act seams, cue moments, a "qa" block, events of kind "cut"')
    ap.add_argument('--declare', help='JSON with cuts / freezes / ignore')
    ap.add_argument('--cuts', help='declared hard cuts or flash transitions, e.g. 600,836-840')
    ap.add_argument('--freeze-ok', help='declared freezes/holds, e.g. 345-359')
    ap.add_argument('--ignore', help='frames to skip entirely, e.g. 10-12')
    ap.add_argument('--from', dest='from_frame', type=int, help='first frame to analyse')
    ap.add_argument('--to', dest='to_frame', type=int, help='last frame to analyse (inclusive)')
    ap.add_argument('--loop', action='store_true', help='check the loop seam (last frame -> frame 0)')
    ap.add_argument('--no-audio', action='store_true', help='a silent deliverable (a loop, a sting for a muted feed): skip the sound checks')
    ap.add_argument('--no-motion-floor', action='store_true', help='skip the motion floor (frozen runs over 0.8 s, a film-level read)')
    ap.add_argument('--motion-floor', action='store_true', help='run only the motion floor and print it (fast: one 320 x 180 decode)')
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
    ap.add_argument('--seams', action='store_true', help='run only the seam checks (carried-cut devices, ground-flip, seam-mix) on a 320-wide '
                    'decode (fast; implies --grammar)')
    ap.add_argument('--spine', action='store_true', help="run only the spine checks (the element in each declared handover's box, undeclared "
                    'swaps, the pixel text-then-cards loop) on a 480-wide decode')
    ap.add_argument('--comp-width', type=int, help='composition width of the box tracks in the cues (default: the cues width, else 1920 for a '
                    'landscape film, 1080 otherwise)')
    g = ap.add_argument_group('thresholds (defaults are proven starting points; see references/review-loop.md)')
    g.add_argument('--spike-min', type=float, default=1.0)
    g.add_argument('--spike-ratio', type=float, default=2.5)
    g.add_argument('--spike-add', type=float, default=0.3)
    g.add_argument('--region-spike-min', type=float, default=1.5, help='spike floor inside one of 9 regions')
    g.add_argument('--region-busy', type=float, default=0.15,
                   help='a region spike is part of a larger move when the whole-frame change exceeds this share')
    g.add_argument('--burst-frames', type=int, default=3, help='a change spread over this many frames at 60 fps is a burst (scaled to the frame rate, never under 2)')
    g.add_argument('--flow-explained', type=float, default=0.5, help='flow residual below this = motion')
    g.add_argument('--jump-ratio', type=float, default=8.0, help='a flow-explained spike this many times its neighbours = a jump')
    g.add_argument('--jump-min', type=float, default=3.0, help='... and at least this large (mean abs change, 0-255)')
    g.add_argument('--popin-ratio', type=float, default=6.0, help='an unexplained region change on a cue this many times its neighbours = a pop-in')
    g.add_argument('--popin-min', type=float, default=3.0, help='... and at least this large in its region (mean abs change, 0-255)')
    g.add_argument('--stall-max', type=float, default=0.05)
    g.add_argument('--stall-moving', type=float, default=0.8)
    g.add_argument('--hold-mad', type=float, default=None, help='mean change per frame under which a frame holds still (default 0.1)')
    g.add_argument('--max-hold', type=int, default=None, help='frames (default: the pace\'s, calm 72, crisp 48 at 60 fps: 1.2 s, 0.8 s at any rate)')
    g.add_argument('--frozen-px', type=int, default=16, help='a hold is frozen if fewer px change by >24 levels')
    g.add_argument('--max-end-hold', type=int, default=None, help='frames of static tail allowed at the end (default: 2 s at the film\'s rate, plus 1)')
    g.add_argument('--quiet-window', type=int, default=None, help='frames (default 60 at 60 fps: 1 s at any rate)')
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
    if cv2 is None:
        die(f'the measurements need opencv (optical flow, edges), which {sys.executable} does not have: {CV2_INSTALL}, '
            'or run it with a Python that has it (PYTHON=<python> node scripts/py.mjs scripts/forensics.py ...)')
    if args.self_test:
        sys.exit(self_test(args.self_test))
    if not args.video:
        ap.error('a video is required (or --self-test)')
    if args.banding_sheet is None and args.json and not args.no_banding:
        args.banding_sheet = os.path.join(os.path.dirname(os.path.abspath(args.json)), 'banding.png')

    if args.smear_sheet is None and args.json and not args.no_smear:
        args.smear_sheet = os.path.join(os.path.dirname(os.path.abspath(args.json)), 'smear.png')

    info = probe(args.video)
    decl = load_declarations(args)
    if args.motion_floor:
        m, fl = motion_floor_check(args, info, decl)
        res = dict(file=args.video, frames=m['frames'], fps=m['fps'], checks=dict(motion_floor=m), flags=fl,
                   fails=sum(1 for x in fl if x['severity'] == 'fail'), warnings=sum(1 for x in fl if x['severity'] == 'warn'))
        res['pass'] = res['fails'] == 0
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            with open(args.json, 'w') as fh:
                json.dump(res, fh, indent=1)
        eh = m.get('end_hold') or {}
        print(f"forensics (motion floor): {args.video}  {'PASS' if res['pass'] else 'FAIL'}  near-still {m['frozen_share'] * 100:.1f} % of {m['body_s']} s "
              f"(fail > {MOTION_FLOOR['fail'] * 100:.0f} %), {len(m['runs'])} run(s) of {MOTION_FLOOR['run_s']:g} s+, longest {m['longest_s']} s, "
              f"{m['dead_seconds']} dead second(s), median change {m['median_change']}, end hold {eh.get('s', 0)} s, "
              f"edge strip on {(m.get('edges') or {}).get('frames', 0)} frame(s)" + ('' if m['measured'] else '  (under 8 s: info only)'))
        for x in fl:
            print(f"  {x['severity']:4s} {x['check']}: {x['note']}")
        sys.exit(0 if res['pass'] else 1)
    if not args.pace:
        args.pace = (load_cues(args.cues)['pace'] if args.cues else None) or 'crisp'
    # the pace's hold and quiet limits are stated at 60 fps: evaluate() scales those left at None (scaled60)
    extra = decl[7]
    args._dissolve = not args.no_grammar
    aud, aud_flags = audio_check(args.video, args, info['fps'])
    args._spine = spine_setup(args, info, decl)  # the spine checks join the grammar when the cues declare a spine
    if args.spine:
        # the spine gate reads the whole film's motion too: the floor, the end hold, the frame edges and the ending
        floor_m, floor_flags = (None, []) if args.no_motion_floor else motion_floor_check(args, info, decl)
        res = merge_flags(spine_only(args, info, decl), aud_flags + floor_flags)
        res['checks']['audio'] = aud
        res['checks']['motion_floor'] = floor_m
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            with open(args.json, 'w') as fh:
                json.dump(res, fh, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        sp = res['checks']['spine']
        print(f'forensics (spine): {args.video}  {res["frames"]} frames  {"PASS" if res["pass"] else "FAIL"}  ({res["fails"]} fail, {res["warnings"]} warn)  '
              f'{len(sp["tracks"])} handover track(s), {len(sp["swaps"])} swap(s), {len(sp["loops"])} type -> picture turn(s); edge floor {sp["floor"]}')
        for x in res['flags'][:30]:
            print(f'  {x["severity"]:4s} {x["check"]:9s} f{x["frame"]}: {x["note"]}')
        sys.exit(0 if res['pass'] else 1)
    if args.seams:
        res = merge_flags(seams_only(args, info, decl), aud_flags)
        res['checks']['audio'] = aud
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            with open(args.json, 'w') as fh:
                json.dump(res, fh, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        print(f'forensics (seams): {args.video}  {res["frames"]} frames  {"PASS" if res["pass"] else "FAIL"}  ({res["fails"]} fail, {res["warnings"]} warn)')
        seam_line(res['checks']['grammar']['seams'])
        for x in res['flags'][:30]:
            print(f'  {x["severity"]:4s} {x["check"]:9s} f{x["frame"]}: {x["note"]}')
        sys.exit(0 if res['pass'] else 1)
    if grammar_on(args, extra):
        k_ = info['fps'] / decl[6] if decl[6] else 1.0
        cuts_v = cut_frames(extra, decl[3], decl[0], k_)
        n_ = max(4, int(round(20 * info['fps'] / 60)))
        kk = max(2, int(round(0.4 * info['fps'])))
        pf = {g for c in cuts_v for g in range(c - 2 * n_ - 1, c + 7)}
        args._probe = MotionProbe(info['fps'], *probe_size(info), pair_frames=pf, tiles=False, force={x for c in cuts_v for x in (c - 1, c + kk)},
                                  seam_frames=velocity_frames(extra, k_))
    floor_m, floor_flags = (None, []) if args.no_motion_floor else motion_floor_check(args, info, decl)
    aud_flags = aud_flags + floor_flags
    if args.grammar_only:
        res = merge_flags(grammar_only(args, info, decl), aud_flags)
        res['checks']['audio'] = aud
        res['checks']['motion_floor'] = floor_m
        if args.json:
            os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
            with open(args.json, 'w') as fh:
                json.dump(res, fh, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        print(f'forensics (grammar only): {args.video}  {res["frames"]} frames  {"PASS" if res["pass"] else "FAIL"}  ({res["fails"]} fail, {res["warnings"]} warn)')
        energy_line(res)
        for x in res['flags'][:30]:
            print(f'  {x["severity"]:4s} {x["check"]:9s} f{x["frame"]}: {x["note"]}')
        sys.exit(0 if res['pass'] else 1)
    args._keep = {f for _, g, b in legibility_frames(extra, info['fps'] / decl[6] if decl[6] else 1.0) for f in (*g, b)}
    M = analyse(args, info)
    M['probe'] = getattr(args, '_probe', None)
    M['smear'] = [] if args.no_smear else smear_scan(args, info)
    res = merge_flags(evaluate(args, info, M, decl), aud_flags)
    res.setdefault('checks', {})['audio'] = aud
    res['checks']['motion_floor'] = floor_m

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
    energy_line(res)
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
