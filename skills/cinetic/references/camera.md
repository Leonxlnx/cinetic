# Camera

The camera is the main animator of a cinetic film. The copy stays calm; the camera never does. One camera carries the
whole film from shot to shot, every cut keeps the speed it was cut on, and every hold keeps moving. This page covers
the world transform, the anchor camera (`src/lib/camera.ts`), the moves (`src/lib/camera-moves.ts`), snap zooms and
defocus (`fx/SnapZoom`, `fx/RackFocus`, `lib/defocus.ts`), footage ramps (`fx/FootageRamp`), holds, depth, 3D limits,
framing and speed. Read it before building any act where the frame moves, and when a shot feels locked-off, floaty or
seasick.

Everything is a pure function of the frame: a move takes framings and returns a `ShotFn`, `(f) => Shot`, defined for
any frame (fractional frames included, so motion-blur sub-samples, scrubbing and any render order agree), and moves
nest: a move's output is a valid input to the next move. Numbers are 60 fps frames (`f@60`) unless they say otherwise;
every function takes `fps` or reads the film context.

**Contents**
1. [One world transform, one camera](#1-one-world-transform-one-camera)
2. [The anchor camera](#2-the-anchor-camera)
3. [The moves](#3-the-moves)
4. [Snap zoom and the defocus pulse](#4-snap-zoom-and-the-defocus-pulse)
5. [Rack focus and defocus levels](#5-rack-focus-and-defocus-levels)
6. [Footage that breathes](#6-footage-that-breathes)
7. [Holds stay alive; speed carries through cuts](#7-holds-stay-alive-speed-carries-through-cuts)
8. [Depth: three planes, parallax, occlusion](#8-depth-three-planes-parallax-occlusion)
9. [3D, perspective and axes](#9-3d-perspective-and-axes)
10. [Choosing a move for a beat](#10-choosing-a-move-for-a-beat)
11. [Framing, legibility and speed](#11-framing-legibility-and-speed)
12. [Blur policy](#12-blur-policy)

---

## 1. One world transform, one camera

- Lay the product out **once, in its own coordinates** ("app space", for example a 1600×1000 window), and move it with
  **one transform on one wrapper**. The layout never reflows, overlays can be projected onto it, and both sides of a
  seam can use the identical matrix.
- **All translation lives inside the transform.** The wrapper is `position: absolute; left: 0; top: 0;
  transform-origin: 0 0`. A fractional `left`/`top` combined with a scale or rotate snaps to whole pixels: slow moves
  step in 1 px stairs. Never animate `left`, `top`, `width` or `height` of anything the camera carries
  (`frame-left-top`).
- **Write the film's camera as one function** and draw every shot through it:
  ```tsx
  const cam = (f: number): Shot => (f < CUT_A ? opening(f) : f < CUT_B ? middle(f) : ending(f));
  // in the act: <div style={{ ...camera(cam(f)), width: W, height: H }}>{world}</div>
  ```
- Each moving layer gets one transform. A transform nested inside another composited layer snaps to device pixels and
  slow moves stair-step; give a second depth plane its own sibling layer (`parallax()`), never a child transform.
- Big zooms on type: draw the type at the size it will be seen at its biggest and scale it down, or draw it as SVG
  paths; a promoted layer scaled up from a small raster goes soft.

## 2. The anchor camera

Describe a framing the way a director does: *this point of the product sits there on screen, this big.*

```ts
// src/lib/camera.ts (abridged)
export type Shot = {
  ax: number; ay: number; // world point that is framed ...
  sx: number; sy: number; // ... at this screen point
  k: number; // scale (world px -> screen px)
  yaw?: number; pitch?: number; roll?: number; // degrees; roll stays rigid, outside the tilt
};
export declare const lc: (A: Shot, B: Shot, t: number) => Shot;   // anchors and angles linear, k in log space
export declare const camera: (s: Shot, perspective?: number) => React.CSSProperties; // one transform
export declare const toScreen: (s: Shot, p: { x: number; y: number }) => { x: number; y: number };
export declare const dip: (t: number, depth?: number) => number;  // 1 - depth * sin^2(pi t): a hop out through a whip
export declare const handoff: (t: number, v0: number, settle?: number) => number;      // carry a log-scale speed
export declare const zoomHandoff: (t: number, v0: number, settle?: number) => number;  // the same for a zoom-through
```

- Moving between two framings lerps the anchors linearly and `k` in log space, so the subject travels a straight
  screen path at an even zoom rate. Lerping translate and scale separately makes the subject swing off its line.
- The transform reads right to left (anchor to origin, scale, rotate, place on screen), so every punch pivots on the
  subject, not on a corner.
- Overlays that track the product (a cursor, the story device, a caption pinned to a row) are drawn in screen space at
  the projected point every frame: `toScreen(shot, SEND_BUTTON)`. Under rotation, project with the same maths as the
  transform. A photo's points project with `photoPoint` (`references/imagery.md`).
- Modifiers multiply into `k` at the end: a payoff punch `1 + 0.012 · hitPulse(f − cue, 3, 7)` (one per payoff), a dip
  through a whip, a creep through a hold (section 7). `breath()` is the 1.1 hold push; use `creep()`.

## 3. The moves

| Move | What it does | House default | Normal range | Cut / swap on |
|---|---|---|---|---|
| `scaleBreath` | push into the cut (accelerating), next shot opens off its rest and settles | push 3 % over 20 f; open 8 %, settle 30 f on `E.glideOut` | push 1-8 % over 10-20 f; open 5-12 %, settle 8-50 f | `.cut` (the push's fastest frame) |
| `whip` + `whipCurve` | a fast reframe: long build, short brake | 32 f on `E.whipBuild` (peak at 55-60 %) | 17-94 f; peak 1600 px/s house, up to 3700 | `.peak` |
| `peakFrame` / `swapAt` | the fastest frame of any move; a copy swap on it | new copy 40 % on its first frame, arrives over 32 f on `E.snapOut` | first frame 35-45 % | the peak |
| `zoomThrough` | exponential dive into a point until a shape fills the frame | ×8 in 24 f, constant ratio a frame (`E.linear` on log scale) | 14-46 f; `E.buildIn` for a dive that accelerates | `.cut` (99 % cover) |
| `reframeChain` | chained reframes with near-holds, a scale pulse at peak speed, roll | moves 48 f on `E.strongInOut`, holds 8 f drifting 30 px/s, pulse +5 % | moves 27-126 f, holds 4-12 f, pulse 3-6 %, roll 3-8° per move | `.moves` |
| `reversal` | a pull-back that decelerates, turns, and pushes into the cut | pull to 0.85 over 70 f on `E.glideOut`; push +4 % over 24 f on `E.buildIn` | pull 0.80-0.90 over 40-150 f; push 2-6 % over 16-30 f | `.cut` |
| `punchOut` | a tight crop drifts faster and faster, cut to the wide shot at the same world speed | crop ×3; drift builds on the house launch profile; wide shot opens at 1× world speed | crop ×2.5-3.5; opening ratio 0.9-1.1 | `.cut` |
| `parallax` | layers of one push at different log-scale rates | type 1, cards behind about 0.5, ground 0 | 0.4-0.75 for the middle plane | - |

- **`scaleBreath({ from, to, cut, pre, post, mode, dir })`.** Every cut breathes. The push into the cut is built like
  a launch (pass `build` frames, or `a`/`p`, or explicit growth `ratios`); after the cut the incoming shot opens `open`
  off its rest and settles on `post.ease`. `mode: 'flip'` (house) opens big and settles down; `'same'` opens small and
  keeps pushing in. `breathK(f, opts)` is the multiplier alone. Keep 8 % for most cuts and save a 14 % breath for act
  breaks.
- **`whip({ from, to, start, frames, ease, dip, roll })`** blends two framings; `whipCurve({ peak, build, buildP,
  brake, brakeP })` draws the curve from its speed profile. `dip` adds a small zoom-out hop at mid-move, `roll` a tilt
  taken back by the end. Put the whoosh's peak and any content swap on `.peak`.
- **`swapAt(peak, { lead, blank, first, frames, ease })`** changes copy where the eye cannot hold it: on a push,
  `lead: 1` (the new copy is already arriving on the frame before the old one goes); on a pull, `lead: 0, blank: 1`.
  The new copy's arrival is front-loaded; the old copy is never faded out.
- **`zoomThrough({ from, anchor, start, factor, frames, ease, hold, holdFrom, centre, box, cover })`**: k grows by
  `factor` in log space with the anchor held on screen. With a `box` (a letter's counter, a window, a card) `.cut` is
  the first frame the box covers `cover` of the frame: cut there into what was inside, and open the next shot still
  zooming (`handoffShot(..., { carry: ['k'] })`). `hold: 2` posterises the dive on twos.
- **`reframeChain(shots, { start, frames, gap, ease, rollEase, pulse, residual })`**: a camera that tours a product or
  a board. Between moves the frame drifts `residual` along the move it just made. Land each move as the cursor or the
  next element reaches its target.
- **`reversal({ from, start, pull, rest, push })`**: anticipation for the last cut before the end.
- **`punchOut({ wide, cut, crop, dir, drift, carry })`**: open on a detail; `.v(f)` is the content's screen speed.
- **`parallax(layers, move)`** with `layers = [{ w, lag, ease, pan }]`: each layer scales by `exp(w · ln(k / k0))`
  around the same anchor; `parallaxK(k, w)` does one layer of any camera.
- A move can run on stepped time: feed it `stepFrame(f, { animFps: 16 })` and declare the range in `STEPPED`.

## 4. Snap zoom and the defocus pulse

A snap zoom (`fx/SnapZoom`) is a scale change carried by one frame: a short build eases into it, the jump frame takes
most of the change (cut it on a hit), and the landing settles.

| Knob | House default | Normal range |
|---|---|---|
| build (`pre`) | 16 f reaching 30 % of the log change | 3-16 f, 20-35 % |
| jump (`land`) | lands on the target (1.0) | 0.7-1.0 of the change in the jump frame |
| landing (`post`) | 22 f on `E.snapOut` | 4-22 f; `zeta` for a damped settle that carries the jump's speed |
| ratio | - | ×1.1-2.2 in, ×0.3-0.6 out (less reads as a glitch) |
| defocus | 4 px@1080 on the jump frame, clearing in 10 f on `E.glideOut` | 3-9 px; `lead: 1, leadShare: 0.5` softens the frame before |
| flash | off; `{ gain }` = the jump frame only | `{ gain, rise, fall, ease }` = a light swell around the snap (+40-60 % mean brightness on the jump) |

- `snapZoomState(f, props, film)` gives `{ k, lnk, sigma, flash, phase }`; `<SnapZoom frame at to ...>` draws it with
  one transform, the defocus as at most two copies at fixed ladder radii, the flash as a white veil.
- `declares(props)`: the jump frame is a designed step (one sample, no shutter blur across it), a jump-frame flash is a
  declared flash, and the jump is a `snapZoom` seam that carries scale. List it in `src/sync.ts` `declares()`.
- `defocusPulse({ at, frames, peakSigma, peakAt, shape, scaleJump })`: the whole frame goes soft and comes back (house
  18 f, 20 px@1080 at the middle) and the camera's scale jumps by `scaleJump` (house ×1.24) on the peak frame, where
  nobody can see it. Hide a reframe or a size change in it; at most one pulse every 0.4-1.3 s in a one-take film.
  Below 1 px of blur a frame still looks sharp and above 2 px it already looks fully soft, so the shape of the first
  and last few frames is what the eye sees.

## 5. Rack focus and defocus levels

Chromium draws a blur under about 0.5 px as sharp and steps radii, and an animated blur radius on a large layer is
both nondeterministic and expensive. So:

- **Defocus comes in fixed levels** (`lib/defocus.ts`: `DEFOCUS_LEVELS` 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32 px;
  `DEFOCUS_MAX_COPIES` 2). `defocusMix(sigma)` returns at most two copies at neighbouring levels with weights, so any
  sigma reads as a smooth ramp while no blur radius ever animates.
- **`<RackFocus levels>`** follows `t × blur` exactly with those copies; `hero` keeps the product, the word or the
  button sharp above the blurred stack while the world goes soft. `rackState(t, blur)` returns the copies. Without
  `levels` it keeps the 1.1 cross-fade of a sharp and a constant-blur copy.
- **Defocus as a timing tool:** a focus-in word (`FocusWord`), a defocus pulse that hides a change, a defocus cut (9 f
  out, one empty frame, 9 f in), a foreground plate pre-softened once in its bake. Never `filter: blur()` animated on a
  large layer, never `will-change` beside an animated blur.
- Behind a payoff line, veil a defocused background at 80-85 % of the background colour.

## 6. Footage that breathes

`fx/FootageRamp`: each clip plays fast at its ends and slow in its middle, and clips join on their fastest frames, so
the cut hides in the speed.

- Speed is a raised-cosine U from `peak` (house 2.4× real time) to `trough` (0.3) at `dip`; `join: 'cut'` turns it into
  an arch (slow ends, fast middle).
- `rampSource(f, props, film)` gives the clip, the source time (the closed-form integral of the speed) and the source
  frame; `<FootageRamp clips frame>` draws it with `<Freeze>` around `<OffthreadVideo>`, so any frame renders the same
  in any order.
- Footage shot at 120 fps or more gives smooth troughs; at the film's own rate the slow middle repeats source frames
  (declare it stepped).
- `declares(props)`: each join is a `velocity` seam. Put the cut sound on the join. Plain footage on the film's clock
  is `fx/Footage` (`references/imagery.md`).

## 7. Holds stay alive; speed carries through cuts

A locked-off frame reads as a stalled player in a muted feed. Nothing is frozen for more than 0.8 s outside the end
lock (`forensics.py hold-drift`).

| Hold | Life | Number |
|---|---|---|
| any near-hold | creep or drift | `creep()` house 6 %/s (2-15 %/s), or `drift()` house 30 px/s (6-90) |
| text being read | slow drift, creep or moving light under it | under 90 px/s and 15 %/s; a re-centre jump is a decisive move, not drift |
| typing or reading | background parallax under a sharp foreground | background −16 px and +2.5 % while the foreground pushes |
| logo / lockup | a creep of ≤ 6 % for a still hold up to 1.3 s; 10-20 % over about 2 s for a longer one | then the one still hold of the film |

- **A hold turns into its exit.** Over the last 12-20 f before the cut the creep accelerates into it (`intoCut()`): the
  cut lands on the fastest frame and the speed carries across.
- **Speed carries through cuts** (`lib/handoff.ts`, `references/motion-tokens.md` §6): `launch()` into the cut,
  `carry()` out of it at 0.4-1.4× the outgoing speed (house 0.7), decaying ×0.78-0.93 a frame to a living residual;
  `handoffShot(A, B, cut, { carry: ['x', 'y', 'k', 'roll'] })` does it for a camera. Declare velocity seams.
- **Chained moves never stall.** When one move hands over to another, start the second on a zero-slope curve while
  the first is still moving (about 20 f of overlap for moves of similar speed, more when the first is slow); the
  secondary starts before the primary is 90 % home (`overlapAt`).
- Stillness is still allowed: a designed freeze of ≤ 15 f on a silence, and the one still hold at the end lock.

## 8. Depth: three planes, parallax, occlusion

The floor against a flat film asks for two depth planes moving at different rates in at least half of the shots.

- **Three planes:** a soft foreground (one shape from the product's world, 1.2-1.6× the frame height, softened once in
  its plate, crossing near a frame edge at 1.5-2.5× the camera's speed), the subject, and a background or ground that
  moves slower (parallax weights about 1.16 : 1.08 : 1.0 for gentle depth; type 1, cards 0.5-0.75, ground 0 on a push).
  Two planes are usually enough; three is the most before it reads as a parallax demo.
- **Occlusion:** type behind an object, a foreground occluder crossing the subject, inner content that scales less
  than its container: each reads as depth without any 3D.
- **The foreground lands about 20 f before the background** (`leadBy`).
- **Lit depth:** blocks that cast shadows from one key (`references/lighting.md`) read as depth even under a locked
  camera.

## 9. 3D, perspective and axes

- **Perspective 1800-2600 px** on a 1920-wide frame. Below that UI distorts like a wide lens; above, 3D reads flat.
- **Each act gets its own axis:** a vertical hinge (yaw) in one act, a tabletop (pitch) in another, a roll or
  pull-back in a third. The same tilted-card angle three times in 15 s is a template tell.
- **Keep roll rigid and outside the tilt:** `perspective(P) rotateZ(roll) rotateX(tilt)`. The reverse order shears type
  into a faux italic.
- **Limits:** roll ≤ 11°, total visible shear ≤ 7° (for example pitch 42° with roll ≤ 12°).
- **Real 3D only.** Tilted screenshot cards floating in space are a tell; tilt the live product, with its own shadow
  from the key on its own ground.
- **Chromium caps the raster scale under `perspective`**, so text scaled up in 3D goes soft. Lay the product out at
  shot scale with CSS `zoom: Z` and scale the camera by `scale3d(k/Z, k/Z, 1/Z)`, switching Z only on a whole frame at
  a velocity peak (`references/chromium-rendering.md`).

## 10. Choosing a move for a beat

| Beat | Move | Note |
|---|---|---|
| opening on a detail | `punchOut` | the first cut carries the world's speed into the wide shot |
| touring a product or a board | `reframeChain` | one move per idea, near-holds that drift, roll small |
| changing the subject in one breath | `whip` + `swapAt(whip.peak)` | swap copy on the peak, whoosh on the peak |
| a hit, a reveal, a punchline | `SnapZoom` | one jump frame, defocus on it, sound on it |
| going inside (an app, a letter, a card) | `zoomThrough` + `handoffShot(carry: ['k'])` | cut at 99 % cover, open still zooming |
| a change of size you want hidden | `defocusPulse` | the jump on the peak |
| the last cut before the end | `reversal` | pull, turn, push into the cut on its fastest frame |
| every other cut | `scaleBreath` | push 3 %, open 8 %, settle 30 f |
| depth in a flat frame | `parallax` | type 1, cards 0.5-0.75, ground 0 |

At most one new signature move per beat (about 1.5-2.5 s): a camera that changes its idea every half second reads as a
demo reel. More camera devices: the device book's [camera](devices/camera.md) and
[camera transitions](devices/camera-transitions.md).

A camera journey in one function:

```tsx
const chain = reframeChain([F1, F2, F3], { start: 96, frames: [54, 50], gap: 26, fps });
const toFar = whip({ from: chain, to: F4, start: 230, frames: 32, fps });
const wide = (f: number) => (f < toFar.start ? chain(f) : toFar(f));
const open = punchOut({ wide, cut: 75, crop: 3, dir: { x: -1, y: 0 }, drift: { vCut: 38 }, fps });
const swap = swapAt(toFar.peak, { fps }); // the copy changes on the whip's fastest frame
const snap = (f: number) => snapZoomState(f, { at: 316, to: 1.5, defocus: { sigma: 7, lead: 1 } }, { fps });
const dive = zoomThrough({ from: boardAt(340), anchor: windowCentre, start: 340, factor: 14, frames: 26,
  ease: E.buildIn, centre: E.softOut, box: windowRect, width: W, height: H, fps });
const inside = handoffShot(boardCam, (f) => back(f), dive.cut - 1, { carry: ['k'], fps });
const back = reversal({ from: G0, start: dive.cut + 4, pull: { to: 0.82, frames: 110 }, push: { to: 1.06 }, fps });
const last = scaleBreath({ cut: back.cut, from: inside, to: H0, pre: false, post: { open: 0.08, frames: 34 }, fps });
```

Six camera ideas in about 9.5 s, one per beat, every cut carried.

## 11. Framing, legibility and speed

- **The product covers the frame** whenever it is the shot: clamp the camera so no window edge or void enters by
  accident (a `cover(shot, w, h)` helper keeps both edges outside the frame).
- **Bleed and off-centre.** Frame the subject past two edges at 1.2× the frame or more in most acts, off-centre at
  1.1-1.6×; a subject dead centre and inside the frame in more than half the framed samples warns (`framing-centred`).
- **Headroom:** at least 24 px between any glyph and the frame edge at maximum `k` (creep and punch included).
- **Readable text** is at least 36 px on screen after camera scale whenever it is in focus for more than 6 f
  (`TEXT_MIN`): `k ≥ 36 / fontPx` for the smallest text that carries meaning. Smaller text is texture, out of focus or
  gone within 6 f.
- **Overscan** moving layers by 5-8 % so a drift, dip or punch never reveals an edge.

| Move | Speed or length | Note |
|---|---|---|
| hold drift | 6-90 px/s (house 30); under 90 px/s while text is read | visible life, not motion |
| creep in a hold | 2-15 %/s (house 6) | faster than about 15 %/s reads as a move |
| camera move | calm 0.5 s + 1.6 ms/px, 0.9-3.0 s; crisp 0.35 s + 1.35 ms/px, 0.6-2.4 s | `durFor(px, true)` |
| whip | 17-94 f (house 32), peak 1600 px/s (up to 3700) | beside stillness, never while text is read |
| a crisp film's frame | over 3000 px/s for more than 14 f warns (`speed-ceiling`) | cut frames are not moves |

## 12. Blur policy

`LOOK.blur` in `timeline.ts` declares it: `'crisp'` (the default: flat graphics render sharp, one sample a frame) or
`'camera'` (a 180° shutter on frames moving faster than about 900-1200 px/s). A crisp film can hold a camera-real
moment: declare its range in `CAMERA_BLUR` and only those frames get shutter samples. Declared steps (a snap zoom's
jump, a stepped layer), flashes and hard seams always render from one sample. `measure-speed.py --policy auto` and
`render.sh --blur` follow the declaration (`references/finishing.md`).
