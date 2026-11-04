# Camera

The camera moves with a purpose or not at all. It is still unless a shot declares a move: a push that closes on the
thing that changes, a track that follows what travels, a pull that reveals the whole, a whip or a carried cut, each one
starting, travelling and landing on an eased curve. No float, no drift, no idle push: a camera that pans one way and back
for no reason reads as aimless, and holds may be completely still while the product changes in them. This page covers
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
7. [Holds may be still; moves have a purpose; speed carries through cuts](#7-holds-may-be-still-moves-have-a-purpose-speed-carries-through-cuts)
8. [Depth: three planes, parallax, occlusion](#8-depth-three-planes-parallax-occlusion)
9. [3D, perspective and axes](#9-3d-perspective-and-axes)
10. [Choosing a move for a beat](#10-choosing-a-move-for-a-beat)
11. [Framing, legibility and speed](#11-framing-legibility-and-speed)
12. [Blur policy](#12-blur-policy)
13. [The depth stage: a real camera over UI planes (fx/depth)](#13-the-depth-stage-a-real-camera-over-ui-planes-fxdepth)

**Depth comes from a designed 3D shot**, not from a card tilted on a flat ground: a camera with a lens, standing
somewhere, looking at planes that sit at real depths, with depth of field, making one move that starts, travels with
its subject and lands. `fx/depth` (§13) is that stage; its scenes (`MacroType`, `PageTravel`, `FanFocus`, `PushIn`,
`CraneDown`, `RiseScene`) are whole beats with a few props each.

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
export declare const camPath: (f: number, base: Shot, moves: CamMove[]) => Shot;       // moves that add and chain
export declare const camVel: (f: number, base: Shot, moves: CamMove[], at?: { x: number; y: number }, film?: Partial<FilmCtx>) => { vx: number; vy: number; speed: number; angle: number; vk: number };
```

- Moving between two framings lerps the anchors linearly and `k` in log space, so the subject travels a straight
  screen path at an even zoom rate. Lerping translate and scale separately makes the subject swing off its line.
- The transform reads right to left (anchor to origin, scale, rotate, place on screen), so every punch pivots on the
  subject, not on a corner.
- **When the camera is the animator** (a teaser where every shot is one static layout under a moving camera), write
  the shot as `camPath(f, base, moves)`: each move is `{ at, frames, ease, zoom?, pan?, look?, roll? }` and moves
  add, so the next one starts on the frame the last one slows and the camera never holds (a slide-in settling into a
  pull-back x0.65, a rise's drift into a zoom-out x0.48, a push x1.57 into a whip-out). Whips are asymmetric (about
  12 f in on `E.launchIn`, cut at peak; 7 f out on `E.glideOut`). `camVel` gives the picture's speed and direction
  for the smear: `<DirBlur v={vel.speed / u} angle={vel.angle} shutter={DIR_BLUR.whipShutter}>` on translation only
  (pushes stay crisp), sharp under 120 px/s. Pin a camera track on measured element boxes, never on a frame where
  a hero element moves on its own.
- **Entrances that never stop** (`lib/handoff` `expoTail(f, at, from)`): a window or a box rising into a camera shot
  arrives on an expo tail (x0.938 a 60 fps frame, about 90 % home in 36 f) and keeps a residual drift (0.06 px a frame)
  into the next move, so a chained camera never inherits a dead stop.
- **The modal moment** (`lib/camera-moves` `modalPush(f, at)`): the scene under a dialog blurs to 14 px and takes an ink
  veil to 0.45 over 20 f while the camera pushes x1.43 over 42 f; the toast pops sharp at the push's midpoint (opacity in
  8 f, x0.86 to 1 in 10 f, its own blur clearing over 22 f, rising 24 px). Leave on a circ-in pull-out to black.
- Overlays that track the product (a cursor, the story device, a caption pinned to a row) are drawn in screen space at
  the projected point every frame: `toScreen(shot, SEND_BUTTON)`. Under rotation, project with the same maths as the
  transform. A photo's points project with `photoPoint` (`references/imagery.md`).
- Modifiers multiply into `k` at the end: a payoff punch `1 + 0.012 · hitPulse(f − cue, 3, 7)` (one per payoff), a dip
  through a whip, a sub-pixel creep at most through a hold (section 7: a hold may be still).

## 3. The moves

| Move | What it does | House default | Normal range | Cut / swap on |
|---|---|---|---|---|
| `scaleBreath` | push into the cut (accelerating), next shot opens off its rest and settles | push 3 % over 20 f; open 8 %, settle 30 f on `E.glideOut` | push 1-8 % over 10-20 f; open 5-12 %, settle 8-50 f | `.cut` (the push's fastest frame) |
| `whip` + `whipCurve` | a fast reframe: long build, short brake | 32 f on `E.whipBuild` (peak at 55-60 %) | 17-94 f; peak 1600 px/s house, up to 3700 | `.peak` |
| `peakFrame` / `swapAt` | the fastest frame of any move; a copy swap on it | new copy 40 % on its first frame, arrives over 32 f on `E.snapOut` | first frame 35-45 % | the peak |
| `zoomThrough` | exponential dive into a point until a shape fills the frame | ×8 in 24 f, constant ratio a frame (`E.linear` on log scale) | 14-46 f; `E.buildIn` for a dive that accelerates | `.cut` (99 % cover) |
| `reframeChain` | chained reframes with near-holds, a scale pulse at peak speed, roll | moves 48 f on `E.strongInOut`, holds 8 f at rest, pulse +5 % | moves 27-126 f, holds 4-12 f, pulse 3-6 %, roll 3-8° per move | `.moves` |
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
  a board. Between moves the frame rests (`residual` 0; a creep of at most 0.2 px/f@60 along the last move when given). Land each move as the cursor or the
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
- **`<Defocus sigma>`** (`fx/Defocus`) wraps any layer in those copies: a hidden cut's jump frame, a toast stepping back
  in a stack. **`<DirBlur v axis>`** smears along the motion only, from the layer's speed (sigma = px/s × 0.0048 s,
  the smear of a 180° shutter at 30 fps), each level a static one-axis SVG gaussian: flick scrolls, whips and cards
  leaving at speed in a crisp film, without the shutter pass.
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

## 7. Holds may be still; moves have a purpose; speed carries through cuts

The camera is still unless a shot declares a move. A held shot is not a stalled player when something in it changes:
the product changes state (a value, a row, a toggle, a cursor's click), a line builds, a counter lands. What reads as
cheap is the opposite: a camera floating and panning back and forth with no reason, cards bobbing while they are held,
a panel swaying. The stage has no float (`lib/drift`: `stageAt` is still without `moves`; `stageMove(at, 'push' |
'pull' | 'track')` declares one), Lit panels and devices have no sway, holds have no drift.

| Hold | What moves | Number |
|---|---|---|
| any hold | nothing but the product's own change; the camera rests | a sub-pixel creep at most (≤ 0.2 px/f@60, 12 px/s; `holdDrift`, house 0), one way |
| text being read | the type's own build; the camera rests | under 90 px/s and 15 %/s (`forensics.py read-move`) |
| a declared move | a push, pull or track from rest to rest | `stageMove` house push x1.06 / pull x0.94 / track 120 px over 72 f on `E.strongInOut` |
| logo / lockup | the mark assembling, then still | a creep of ≤ 6 % at most |

- **The gates** (`references/checks.md`): `forensics.py dead-stretch` / `motion-frozen` fail only a stretch over 2.5 s
  where nothing changes at all; `camera-wander` fails a camera that pans or pushes one way and back at slow speed inside
  a shot (the old float) or drifts one way through a whole shot at a flat, slow speed, and warns on a camera that never
  rests; `lint-film` fails `camera-float`, `idle-bob`, `card-tilt` and, on the depth stage, `camera-shot` (§13).
- **A move that ends a shot may run into its exit.** A push or track that carries the cut accelerates over its last
  12-20 f (`intoCut()`): the cut lands on the fastest frame and the speed carries across.
- **Speed carries through cuts** (`lib/handoff.ts`, `references/motion-tokens.md` §6): `launch()` into the cut,
  `carry()` out of it at 0.4-1.4× the outgoing speed (house 0.7), decaying ×0.78-0.93 a frame to rest (residual 0);
  `handoffShot(A, B, cut, { carry: ['x', 'y', 'k', 'roll'] })` does it for a camera. Declare velocity seams.
- **Chained moves never stall.** When one move hands over to another, start the second on a zero-slope curve while
  the first is still moving (about 20 f of overlap for moves of similar speed, more when the first is slow); the
  secondary starts before the primary is 90 % home (`overlapAt`).
- Stillness is the default between moves: a held read, a held product state, a held lockup. A stretch over 2.5 s where
  nothing at all changes is dead (cut sooner, or let the product change in it).

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
- **A beat with several objects is a depth stack** (`fx/DepthStack`): far, mid and near planes at scale 0.6 / 1 / 1.4,
  a fixed defocus of 6 / 0 / 10 px and parallax 0.5 / 1 / 1.6 (each plane a sibling world under its share of the
  camera: `lib/camera weighShot()`, zoom on log scale), the far plane turned 8-25 degrees (house 16) as a receding
  wall, items carrying their own turn (rotateX / rotateY 8-25, cards stacked in perspective) and the film's key-side
  rim (`rim`). The camera moves through it: `depthPush(at)` pushes x1.32 with a 90 px pan and a 6 degree yaw over
  120 f on E.strongInOut and creeps on; the near plane grows 1.6x as fast, slides out past the edges and fades as it
  passes the lens. Copy and the product sit on the mid plane, sharp.
  ```tsx
  <DepthStack frame={f} items={items} cam={{ moves: depthPush(CUE.stack) }} rim render={(id) => <Toast ... />} />
  ```
- **The shot's composition in planes** (`fx/Grounds` `Planes`): bg 0.25 (the ground), mid 0.6 (the product), fg 1.0
  (near elements), with at least one element cropped by the frame edge (`cropCheck()`).

## 9. 3D, perspective and axes

- **Perspective 1800-2600 px** on a 1920-wide frame. Below that UI distorts like a wide lens; above, 3D reads flat.
- **One 3D turn per UI film** (`lib/camera` `swing3d`, `CAM3D`): the camera turns once, on one axis, 15-30 degrees
  in total (house 26 -> 4 over 108 f on E.strongInOut, landing nearly front-on for the read, then creeping on the same
  way) through a layout whose layers sit at a depth: `camera3d(shot)` (preserve-3d, the scale on all three axes) with
  each layer placed by `place(x, y, z)`, so near layers swing further than far ones. `cam3dCheck(base, moves)` holds
  the rule (one axis within 15-30, the other within 6, at least 48 f, roll within 11).
  ```tsx
  const sw = swing3d({ at: CUE.turn });
  const shot = camPath(f, { ...base, ...sw.start }, sw.moves);
  <div style={{ ...camera3d(shot), width: W, height: H }}>
    <div style={place(300, 210, -260)}>{chart}</div>
    <div style={place(780, 300, 0)}>{panel}</div>
    <div style={place(1420, 760, 180)}>{toast}</div>
  </div>
  ```
- **Place moving elements with transforms**, never with left/top: a fractional left/top snaps to whole pixels at full
  size and jumps a pixel at a time; `place()` and the fx primitives move everything by translate3d.
- **Cards face the camera.** A lit panel (`fx/Lit`), a device (kit `Phone`, `Laptop`) or a depth item rests face-on
  (house tilt 0 / 0); a card tilted diagonally at rest reads as cheap (`lint-film card-tilt`). A 3D turn is a declared
  object move: the film's one turn that lands face-on, an entry that settles from a turned pose (`enter.from.tilt`), a
  flip the shot is about. At most one such turn an act.
- **Keep roll rigid and outside the tilt:** `perspective(P) rotateZ(roll) rotateX(tilt)`. The reverse order shears type
  into a faux italic.
- **Limits:** roll ≤ 11°, total visible shear ≤ 7° (for example pitch 42° with roll ≤ 12°).
- **Real 3D only.** Tilted screenshot cards floating in space are a tell; when the product turns, turn the live
  product, with its own shadow from the key on its own ground, and land it face-on. For a camera that really stands
  somewhere (perspective, depth of field, a macro close-up, a travel over a page), use the depth stage (§13).
- **Chromium caps the raster scale under `perspective`**, so text scaled up in 3D goes soft. Lay the product out at
  shot scale with CSS `zoom: Z` and scale the camera by `scale3d(k/Z, k/Z, 1/Z)`, switching Z only on a whole frame at
  a velocity peak (`references/chromium-rendering.md`).

## 10. Choosing a move for a beat

| Beat | Move | Note |
|---|---|---|
| opening on a detail | `punchOut` | the first cut carries the world's speed into the wide shot |
| touring a product or a board | `reframeChain` | one move per idea, near-holds at rest, roll small |
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
- **Bleed for pictures, centre for words.** Frame a product or picture past two edges at 1.2× the frame or more in
  most acts, off-centre at 1.1-1.6×; a picture dead centre and inside the frame in more than half the framed samples
  warns (`framing-centred`, which leaves type out). A statement stays centred in the middle band whatever the camera
  does (`layout-audit.sh` placement).
- **Headroom:** at least 24 px between any glyph and the frame edge at maximum `k` (creep and punch included).
- **Readable text** is at least 36 px on screen after camera scale whenever it is in focus for more than 6 f
  (`TEXT_MIN`): `k ≥ 36 / fontPx` for the smallest text that carries meaning. Smaller text is texture, out of focus or
  gone within 6 f.
- **Overscan** a layer under a declared track or pull (`bleedFor`) so the move never reveals an edge.

| Move | Speed or length | Note |
|---|---|---|
| hold | still (house); a creep under 12 px/s (0.2 px/f@60) at most, one way | no float, no drift, no bob |
| declared stage move | push x1.06, pull x0.94, track 120 px over 72 f on `E.strongInOut` | starts, travels, lands; never back the way it went |
| camera move | calm 0.5 s + 1.6 ms/px, 0.9-3.0 s; crisp 0.35 s + 1.35 ms/px, 0.6-2.4 s | `durFor(px, true)` |
| whip | 17-94 f (house 32), peak 1600 px/s (up to 3700) | beside stillness, never while text is read |
| a crisp film's frame | over 3000 px/s for more than 14 f warns (`speed-ceiling`) | cut frames are not moves |

## 12. Blur policy

`LOOK.blur` in `timeline.ts` declares it: `'crisp'` (the default: flat graphics render sharp, one sample a frame) or
`'camera'` (a 180° shutter on frames moving faster than about 900-1200 px/s). A crisp film can hold a camera-real
moment: declare its range in `CAMERA_BLUR` and only those frames get shutter samples. Declared steps (a snap zoom's
jump, a stepped layer), flashes and hard seams always render from one sample. `measure-speed.py --policy auto` and
`render.sh --blur` follow the declaration (`references/finishing.md`).

A spinning element smears around its centre, not along a line: `SpinBlur` (fx/Defocus) draws copies turned back
over half the frame's turn as a running mean (sharp under 1 degree a frame); a mark that spins in
(`fx/Wordmark` `spinInState()`: from x2.06 and over a turn, the turn settling before the scale, then aside to make
room while the name slides out) passes its `omega` to it.

## 13. The depth stage: a real camera over UI planes (fx/depth)

The production-value gap between a clean film and a studio film is mostly depth: a real camera with perspective and
depth of field over UI planes, a macro close-up of the one element that matters, the camera following the action and
landing. `fx/depth` is that stage, pure in the frame (any frame, any order, Node-safe maths), cheap enough for a
laptop. Use it for the one or two shots of a film that carry the feature: the rest may be flat and still. A real 3D
object in the shot (the extruded mark, glass tiles, a dome, one hero object) is `fx/three`: [three.md](three.md).

**The model.** Lay the shot out flat on the 1080p design plane as usual; each piece becomes a `<Plane box>` with a
depth `z` (+ toward the camera). The camera is a director's rig: the point it looks at (`target`), how far it stands
(`dist`), from which side (`yaw` +: to the target's right; `pitch` +: above, looking down), a rigid `roll`, the lens
(`lens` mm on the short side: 50 normal, 28-35 strong perspective, 85-100 long and flat), where it is focused and how
shallow the depth of field is (`aperture`, house 36). The opening camera is 1:1: a plane at z = 0 lands exactly on its
box, so a flat layout keeps its composition until the camera moves. Each plane is one flat element with its own
projected `matrix3d` (no `preserve-3d`), drawn in depth order, so filters, masks and opacity never break the 3D.

**Depth of field** follows the lens (thin lens: sigma = aperture x (F / focus distance) x |depth - focus| / depth), so
a macro framing at 3x is three times as shallow as the 1:1 framing and the world goes soft behind the one element. It
draws in fixed defocus levels (`lib/defocus`, two copies cross-faded, never an animated radius); a plane whose depth
varies across it (a page in perspective) gets a defocus that varies along its depth (three masked copies). A rack moves
the focus in diopters on its own ease while the camera holds or moves.

**Motion blur** is a smear along each plane's screen velocity, a 180-degree shutter (sigma = 0.29 x the distance
travelled in half a frame), from 120 px/s, capped at 24 px, and nothing on a hold; a push smears outward with the zoom.
At most 6 planes blur in one frame (`STAGE.budget`; the farthest beyond it keep one fixed level). A plane's own move
(`move={(f) => ({ y, z, s, opacity })}`, sub-frames included) smears the same way.

### The scenes (one component, a few props)

| Scene | Props that matter | The move (house, f@60) | For |
|---|---|---|---|
| `MacroType` | `box`, `text`, `textX`, `font`, `render(typed, { caret, ages })`, `at`, `mag` 3.6 | a push onto the first characters at macro scale (44 f, `E.strongInOut`) as the first keys land, then a follow of the caret (trailing by about 12 f, holding it a little right of centre) that lands when the typing stops | a prompt, a search, a message being written |
| `PageTravel` | `size`, `from`, `to` (page px), `children` | a travel over the page lying back (camera below, pitch -48, yaw 14, 30 mm) from the headline to the table, closing from x1.25 to x1.55 while the roll unwinds -9 to -4 (160 f, `E.strongInOut`); the page's far edge soft | a document, a plan, a board, a report the product writes |
| `FanFocus` | `cards`, `size`, `focus` | cards slide forward into a fan in depth (34 f each, 7 f apart, back card first); the camera stands to one side (yaw 30) and closes on card `focus` (84 f) while the focus racks from the front card to it (42 f) | notifications, sources, results: many, then the one |
| `PushIn` | `box`, `plane`, `front`, `children` | a push into one element at macro scale, landing at yaw 12, pitch 5 (62 f) as it is pressed or changes | the button that matters, a row, a figure |
| `CraneDown` | `plane`, `children` | the camera swings down from above (pitch 58, x0.72) onto the scene and lands face-on, 1:1 (96 f) | opening on a board, a dashboard, a layout |
| `RiseScene` | `word`, `wordBox`, `cards`, `cardSize`, `row` | cards rise behind a giant word (460 px, 40 f each, 8 f apart, the middle first) while the camera pulls back from x1.32 to 1:1 (90 f); the lens holds the word, then racks to the row as the reveal lands | pricing, plans, a lineup |

```tsx
import { MacroType, PageTravel, FanFocus, PushIn, Plane } from '../fx/depth';

<Sequence from={ACT.ask.from} durationInFrames={ACT.ask.dur}>
  <MacroType box={INPUT} text="Plan my launch week" textX={INPUT.x + 96} font={INPUT_FONT} ground={<Ground />}
    render={(typed, s) => <Composer text={typed} caret={s.caret} />} />
</Sequence>
// src/sync.ts declares(): the render checks read the shots
{ id: 'ask', ...MacroType.declares({ box: INPUT, text: 'Plan my launch week', textX: INPUT.x + 96, font: INPUT_FONT }, { offset: ACT.ask.from, frames: ACT.ask.dur }) },
```

### The shot vocabulary (your own camera)

```tsx
import { camera, push, follow, travel, rack, macro, frame, wide, Stage3D, Plane, checkShots } from '../fx/depth';

const cam = camera([
  push(0, macro(SEND, { mag: 3.2, yaw: 10 }), { frames: 56 }),     // close on the button
  rack(60, ROW_CENTRE, { frames: 30 }),                              // the focus moves to the row that changes
], { base: { yaw: -6 } });                                           // the opening camera: 1:1, a little to the left
// checkShots(cam) in the Studio console: overlap, back and forth, a crawl, a linear move
<Stage3D camera={cam} ground={<Ground />}>
  <Plane box={PANEL} z={-260}><Panel /></Plane>
  <Plane box={INPUT}><Composer /></Plane>
</Stage3D>
```

| Shot | Helper | House f@60 | Easing | Focus | Recipe |
|---|---|---|---|---|---|
| push in | `push(at, macro(box) / frame(box))` | 60 | `E.strongInOut` (an arrive token right after a cut: the cut is its start) | lands on the target | closes on the thing that changes; the landing target travels a straight, eased line on screen |
| pull back | `pull(at, wide())` | 72 | `E.strongInOut` | the target, or rack to what is revealed | reveals the whole; never straight back after a push (hold 1.5 s or more first) |
| follow | `follow(at, subject, { frames, lag })` | lag 24, ramp 24 | the subject's own motion, bell-smoothed | the subject | rides a caret as text types (`caretOf(typing(...))`), the newest row of a list as it fills (`newestOf(rows, times)`: one glide down, never back up), a cursor on its way to a button (`pathOf(a, b, at, frames)`: draw the cursor with the same function), or a kit screen's focus box of that frame placed in the scene (`(g) => placeFocus(promptBarLayout(p, g).focus, x, y).caret`: the camera rides its centre); frame the subject first (it never runs back to catch it) and it lands when the subject stops |
| travel | `travel(at, point or framing)` | 84 | `E.strongInOut` | the target (a page in perspective: its own varying defocus) | keeps its angle and distance and glides over a plane: a page, a board, a grid; the roll may unwind as it goes |
| crane | `crane(at, framing)` | 96 | `E.strongInOut` | lands on the read | swings down from above onto the scene, landing face-on |
| orbit | `orbit(at, { yaw })` | 90 | `E.strongInOut` | the target | swings around the subject sideways, landing on the side that reads |
| whip | `whip(at, framing)` | 28 | `E.whipBuild` | the next subject | a fast move to the next subject; the smear hides the swap |
| rack | `rack(at, point or 'target')` | 30 | `E.strongInOut` | travels to the point | the focus moves to what the line is about; runs beside a move or on a hold |
| macro framing | `macro(box, { mag, anchor })` | - | - | - | frames one element at 2.5-4x (as large as fits 92 % of the width or 62 % of the height): a pill, a button or a row becomes the whole picture |

**Rules.** One move per shot: the next starts once the last has landed. Every move starts, travels and lands (motion
tokens; never `E.linear`, never a crawl under 12 px/s for over 2 s). Never back the way the last move came within 1.5 s
(a push then a pull, a pan right then left): carry on, hold, or cut. Between moves the camera holds still: no float, no
drift, no idle bob. Cards face the camera: the perspective comes from where the camera stands (`wide({ yaw: 24 })`,
`PageTravel`), never from a `Plane` turned at rest; a turn that lands face-on is the plane's own `move`. Keep roll
within 8 degrees and inside a move. Keep every plane in front of the lens; give a far world plane `fit` (it keeps its
box's size and place under the opening camera at any depth). A plane is rasterised at the scale of its closest
framing (`res` 1-3, auto), so type stays sharp at macro scale: keep the plane as small as its content.

**The gates.** `checkShots(cam)` before anything renders (`shot-overlap`, `shot-reverse`, `shot-drift`, `shot-short`,
`shot-roll`, `shot-busy`); `lint-film camera-shot` (a Stage3D camera computed from the frame by hand, a shot on
`E.linear`, overlapping moves, a push straight back into a pull, a camera field on a sine of the frame) and `card-tilt`
(a `Plane` turned at rest); `forensics.py camera-wander` reads the declared shots (`Scene.declares(...)` or
`shotDeclares(cam, { offset, frames })` in `src/sync.ts declares()`): a declared shot is a purposeful move, two in a row
going back and forth fail at any speed, and inside the stage a camera that moves outside its shots is a drift; a flat,
slow pan through a whole shot is a drift in any film.

**Cost.** One plane is one composited layer; defocus and smear are fixed-level filters on a few of them. On software
GL at half size a depth shot renders in about 0.7-1.2 s a frame on a laptop CPU (the macro and push shots are the
cheapest, the page with its varying defocus the dearest); on a GPU it is a small fraction of that. Keep blurred planes
under the budget, big planes few, and the page's defocus for the one page shot.

### Square at rest, a long lens for cards, the world's path

- Cards face the camera at rest: no shot frames its cards with a resting yaw, pitch or roll (a landing at yaw 12 or a
  stack seen from below and to one side reads as the tilted-card look the user named); a turn is a designed 3D move that
  starts, travels and lands square.
- A stack or a list of cards in depth goes on a long lens (85 mm): under a 50 mm lens a card off the axis keystones and
  reads tilted though it is square; depth then comes from the blur ladder and the scale steps, not from keystone.
- The world moves with the film, never on its own: fx/world `worldPath(cuts)` gives it one path, the camera entering the
  place on the opening (x1.07, landing) and moving on at every change of picture (x1.035 and a 14 px rise, starting
  10 f@60 before the cut and landing 30 f@60 after it), always the same way: the place carries each cut, the holds
  between are still. A shot never draws its own copy of the world (a far plane of it jumped at every change of shot).
- A whip between two full-frame pictures travels: fx/Seam velocityCut `travel` (0.75 of the frame by the cut on t^2.2,
  about 260 px a frame and a 38 px smear on the cut frame at 30 fps), every whip of a film the same way; the house launch
  (x1.25 a frame into 48 px/f@60) moves a picture only about 270 px at 30 fps and leaves the cut in sight.

### Catalogue rows (moves)

| id | recipe |
|---|---|
| `macro-type` | the camera pushes onto an input at 3.6x as the first keys land and follows the caret as the line types, the newest characters in the accent settling to ink, the world soft behind (`MacroType`) |
| `page-travel` | a travel over a page lying back in perspective, headline to table, the roll unwinding, the far edge soft (`PageTravel`) |
| `fan-focus` | cards in a fan in depth, the camera to one side closing on one card while the focus racks to it (`FanFocus`) |
| `push-press` | a push into the button at macro scale as the pointer reaches it and presses; a ring opens on the press (`PushIn`) |
| `rise-behind` | cards rise behind a giant word while the camera pulls back; the focus racks from the word to the row (`RiseScene`) |
| `crane-down` | the camera swings down from above onto a board and lands face-on for the read (`CraneDown`) |
