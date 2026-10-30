# Transitions

How a cinetic film gets from one shot to the next. A scene change flows when something carries across it: the ground
stays, the motion runs on, or one anchor (a word slot, a shape, a held object) keeps its place. A hard cut is a normal
seam when it carries one of those; it reads as a jolt only when it carries nothing, or when it flips the ground from
light to dark. Never a crossfade between unrelated shots. Read this while planning seams in the beat sheet
(Steps 1-3) and before building any act boundary: pick each seam from the recipes in §2, build it with `fx/Seam`
(or the primitive the recipe names), declare it, and let `forensics.py` count what each cut carries.

Every primitive below is a pure state function of the frame (`xxxState(frame, props, film)`, closed form, fractional
frames and any order) plus a thin component drawn with transforms, opacity, clip paths and masks. Soft shapes come
from gradients or static pre-blurred plates, never from an animated blur radius; defocus is at most two copies at
fixed levels (`lib/defocus`); when a defocused layer also fades, fade the group and let the copies mix by their
weights inside it. Every fx exports `declares(props, film)`: the seams, flashes and stepped frames it makes on purpose,
so the checks treat them as craft. Numbers are 60 fps frames (`f@60`) and px at 1080p unless they say otherwise.

**Contents**
1. [The seam rules](#1-the-seam-rules)
2. [Recipes at 60 fps](#2-recipes-at-60-fps)
3. [Pick the seam from the content](#3-pick-the-seam-from-the-content)
4. [Iris](#4-iris)
5. [Morph, MorphChain and MatchCut](#5-morph-morphchain-and-matchcut)
6. [Exposure and LightSweep](#6-exposure-and-lightsweep)
7. [BlockStep, Window, TypeWindow](#7-blockstep-window-typewindow)
8. [Dive, BlobRing, Wipe](#8-dive-blobring-wipe)
9. [CutFx: cuts dressed with what is on screen](#9-cutfx-cuts-dressed-with-what-is-on-screen)
10. [Pixel devices](#10-pixel-devices)
11. [Camera seams](#11-camera-seams)
12. [Sound-led cuts](#12-sound-led-cuts)
13. [Bans](#13-bans)
14. [`@remotion/transitions` and the grid](#14-remotiontransitions-and-the-grid)
15. [Checks](#15-checks)

---

## 1. The seam rules

**Every hard cut carries a device.** A hard cut (one frame, most of the picture new) is fine, about a third of a
film's scene changes, when it carries at least one of:

| Device | What it means on screen | Measured as |
|---|---|---|
| Ground kept | the same paper, field or gradient on both sides; only the content changes | the frame's border colour moves under 30 code values |
| Blur at the seam | the cut sits inside a blur: the outgoing shot softens into it, the incoming one resolves out of it | sharpness dips 0.4 log units or more around the cut |
| Anchor held | one thing keeps its screen place: the word slot, a shape's centre, a held subject (its size may jump) | an anchor within 10 px across the cut, or under 35 % of the frame changing |
| Motion carried | the outgoing shot accelerates into the cut, the incoming one already moves the same way and decays | the same direction (cos 0.7 or more), 90 px/s or faster out, 60 px/s in |

A cut with none of them is bare: **at most 10 % of a film's hard cuts are bare** (`forensics.py` carried-cut).

**The ground flips at most twice a film.** A light ground cut to a dark one (or back) is a colour event, the loudest
seam there is: at most 2 in a film, each a declared colour event (a `colour` seam or a `COLOUR` range), placed where
the story turns. Pick one ground family and let the cuts keep it.

**Vary the seams.** The most-used seam kind covers **at most 45 %** of a film's scene changes: plan 3-4 kinds. A
typical mix: hard cuts that carry a device about a third; match-cut and exit-then-enter about a tenth each; blur-through
and velocity-cut about one in sixteen each; then shared element, zoom-through, morph, mask, card expand, whip, wipe.
A film with 4 or more lines moves from line to line at least once with an exit-then-enter, a text-swap or a match-cut
on a kept ground (a type film uses them as its workhorse).

**Declare every seam** in `SEAMS` (`{ at, kind, carry?, dir?, signature?, id? }`); `seamDeclares()` of `fx/Seam`
writes the seam for a recipe and names it in the id (`exitEnter:line-2`), which the checks read. One or two signature
seams per film (`signature: true`), the rest quieter; never the same device twice in a row. No dissolve between
unrelated shots, and no fade to black except at the very end.

**The laws every seam keeps:**
1. **Accelerate out, cut at peak speed, decay in.** Both sides at rest, or the incoming shot opens at 0.4-1.4x the
   outgoing speed in the same direction and decays (`lib/handoff.ts` `launch`, `carry`).
2. **Match every property across the cut**: position, size, radius, colour, shadow, opacity, blur. A property that
   flips at the cut pops.
3. **The rest pose appears once.** The outgoing act's last frame is the move's last in-between; the incoming act's
   frame 0 is the pose.
4. **Place things the same way on both sides** (one placement function), or the cut shimmers.
5. **Never cross-fade two copies of one object.** Morph one object, swap content on one element at the fastest frame.
6. **The seam starts from what the eye is on**, and the story device never blinks.
7. **The incoming shot arrives already moving** (a slide, a settle, a focus resolving), never parked.
8. **A discrete frame is designed** (a flash, a block, a held step): declared and rendered from one sample.

## 2. Recipes at 60 fps

Each recipe gives the frames, the curves and the blur; `fx/Seam` builds the first seven (`recipe` in brackets), the
others name their primitive. `at` is always the incoming shot's first frame.

**Exit-then-enter** (`exitEnter`) - the house seam for centred type: the ground never cuts, so the next line reads as
the next thought.
- The ground (colour, gradient, glow) keeps moving through the whole seam.
- Exit 12-18 f (house 15): the outgoing elements accelerate away 8-24 px (cubic-in or expo-in; the step grows about
  x1.3-1.5 a 30 fps frame), opacity 1 -> 0, blur 0 -> 10-12 px.
- Gap 0-6 f (house 3): only the ground and its light move (a glow rising, a field brightening).
- Enter 14-24 f (house 20): blur 10-12 -> 0 px, opacity 0 -> 1, rising 16-24 px into place on expo-out; the line is
  sharp again about 20 f after the swap. If a hard cut does the swap, put it inside the blur.

**Text-swap** (`textSwap`) - inside a scene: the slot stays, only the words change. Keep the centre and the cap height.
- Blur swap (house): the old line blurs 0 -> 12 px and fades in 8 f (ease-in), the new one resolves from 12 px in
  12-14 f (ease-out), 2-4 f of overlap; 18-22 f in all.
- Push-up: the new line enters one line pitch below and pushes the old one up (a 2-frame ramp, then expo-out, about
  16 px a frame at its peak, 16-20 f); the old line ends at 35-45 % opacity, not gone.
- Ink-in: the new word appears pale (or in the accent tint) at the same centre and inks to its colour in 10-20 f.

**Match-cut** (`matchCut`; for an object box that moves, `MatchCut` §5) - one anchor holds across a one-frame cut.
- Pick the anchor (the word slot, a shape's centre, a held subject) and keep its screen centre within 10 px; its size
  may jump (a tight crop cuts to the wide shot).
- Keep the camera move running through the cut in the same direction: it accelerates over the last 8-12 f, and the
  incoming shot continues at about the same step (divided by the crop when the size jumps) and decays x0.85-0.9 a
  frame over 12-20 f.
- Ground, colour and picture may change freely while the anchor holds. Montage form: the word and its frame fixed at
  centre, the picture cutting every 0.5-0.6 s; plate swap: the subject held, the background cutting every ~10 f.

**Blur-through** (`blurThrough`) - a change of place without a cut feel.
- Out 12-16 f: blur 0 -> 24-40 px (quad-in), the shot shrinking or moving away while it accelerates; optionally the
  light ramps toward the next ground.
- Cut at the blur peak.
- In 10-16 f: blur 24-40 -> 0 px (expo-out) while keeping 50-80 % of the outgoing velocity, decaying x0.88 a frame.

**Velocity-cut** (`velocityCut`) - the speed carries the eye across a total change of content.
- Build the speed geometrically into the cut: x1.15-1.35 a frame over the last 8-12 f, cut on the fastest frame.
- The incoming shot moves the same way, its first step 0.5-0.9x the last outgoing step, decaying x0.90-0.94 a frame
  (12-24 f) to a 1-2 px/f drift.
- Smear only the frames above about 9 px/f, 0.4-0.5x the per-frame travel.
- Content may change completely as long as direction and speed continue.

**Shared element** (`sharedElement`) - one element belongs to both scenes and is never cut (a mark, an avatar, a
card, a field).
- The old surroundings leave around it in 10-14 f (fade, blur or a soft light wipe).
- The element moves and scales into its new role over 24-36 f (ease in-out), or decays after a cut-on-motion.
- The new surroundings arrive in 8-16 f. Occlusion form: a large soft foreground shape (70 % of the frame width or
  more) crosses the lens for 8-12 f and the cut sits under it.

**Zoom-through** (`zoomThrough`; with a camera, `zoomThrough` + `handoffShot` §11) - into the element that becomes the
next frame.
- An exponential push centred on the element: x1.04-1.10 a frame over 16-30 f.
- When the element covers the frame, cut (or a 2-4 f cross) to the next shot at the matching scale; the element's
  colour is the next shot's ground.
- The next shot keeps scaling at about a third of the last step and settles in 20-36 f.

**Morph** (`Morph`, `MorphChain` §5) - one shape becomes the next.
- Same centre; size, radius and colour interpolate over 18-30 f (sine or cubic in-out).
- Hide the change of topology at the smallest or most blurred moment: a dot, a blurred blob, a chip under blur. The
  ground may change at the dot.
- The new element grows and settles over 12-20 f (ease-out).

**Card expand** (`pillBreath` + `Window` §7, or a box tween) - the card becomes the next screen.
- The card rect (x, y, w, h, radius) animates to the frame over 24-36 f (cubic in-out).
- Cross the content inside at 40-60 % of the expand under a blur 0 -> 16 -> 0 px.
- After the rect lands the new screen builds on a 3-4 f stagger, settling from 1.03 to 1. Reversed (the picture
  shrinking into a card), it is a scene exit.

**Mask reveal** (`Iris` §4) - from a meaningful point (a word gap, a button, an avatar).
- Radius 0 -> the half-diagonal: fast, geometric x1.27 a frame (14-16 f); soft, expo-out over 26-30 f.
- A hard edge, or a shape from the brand.
- The incoming shot already moves inside the mask, 1.0-1.15x the outgoing motion, decaying x0.8 a frame.

**Push-slide** (`Wipe kind="push"` §8) - a hard edge travels.
- The old shot moves 3-4 f before the edge enters; the edge enters at 70-90 px/f, decays x0.89-0.92 a frame to a
  2-3 px/f creep near half the frame; the old shot moves at 0.6 of the edge; the second stage leaves accelerating
  x1.07-1.12 a frame and is cut at speed. 40-48 f in all.
- Half-frame form: copy held on one half, only the device half changes (out accelerating, in decaying), 26 f.

**Whip** (`FlashCut` §9, `whip` §11)
- Speed builds x1.12-1.2 a frame to a peak of 110-220 px/f at 0.55 of the move (24-40 f), then brakes x0.8-0.85.
- Directional blur 0.4-0.5x the travel above about 9 px/f. Cut on the peak frame, or under a luma wash.
- The next framing arrives on the brake; a whip into dark doubles as a section break.

**Hard cut, done right**
- The outgoing shot is moving and accelerating into the cut; the incoming one already moves and settles.
- Keep the ground, or hold the type in the same centre slot; a cut that also flips the ground is one of the film's
  two colour events.
- Montage runs: the same slot, 0.4-0.7 s a picture.

**Continuous camera** (`lib/camera-moves.ts`, §11) - no seam at all: one accelerate-peak-decay move (peak at
0.4-0.57 of it, then x0.75-0.85 a frame) carries into the next composition, 34-40 f.

**Colour flip** (`colour` seam) - keep the word or shape at centre, cut the ground colour; or three flips 10 f apart.
It is one of the film's two colour events.

**Light wipe** (`LightSweep` §6) - a soft band of light crosses in 10-20 f, the frame blurs under it and resolves into
the next scene; or a white gradient rises from the bottom and the next word rises behind its edge.

## 3. Pick the seam from the content

| The outgoing shot ends on | Use | Seam kind |
|---|---|---|
| a centred line, the next line is the next thought | `Seam recipe="exitEnter"` (the ground stays) | `breath` |
| a line whose slot the next words take | `Seam recipe="textSwap"` (blur swap, push-up or ink-in) | `defocus` |
| a word, shape or subject the next shot also has at that place | `Seam recipe="matchCut"`, or `MatchCut` for a moving object box | `morph` |
| a fast move, the next shot is new content | `Seam recipe="velocityCut"` | `velocity` |
| a change of place with nothing to carry | `Seam recipe="blurThrough"` | `defocus` |
| an element that goes on into the next scene | `Seam recipe="sharedElement"` | `morph` |
| an element that becomes the next frame | `Seam recipe="zoomThrough"` | `zoomThrough` |
| a small UI object (chip, pill, dot, button) that means the next thing | `MorphChain`: the object gathers, swells and becomes the next word or panel | `morph` |
| a frame built of two panels | `doorSplitState`: the halves leave at speed and the next card rides up through the gap | `mask` |
| a line of type with a gap between two words | `Iris` from the gap, rate mode | `mask` |
| a framed image or card that should become the next scene | `pillBreath` into the cut, then `Window` steps | `mask` |
| a big soft foreground object, mist, a frosted panel | `Dive` through it | `defocus` |
| a bright moment on the music (a hit, a drop) | `Exposure` bloom | `light` |
| a fast camera move | `FlashCut` inside the whip | `whip` |
| a section change into one centred statement | `BlobRing` around it | `mask` |
| a reveal across the frame | `Wipe kind="push"` (a hard edge pushing the old shot along); `feather` or `gradient` for a soft wash | `wipe` |
| a hard beat with nothing to carry | `BlockStep` (blocks, then the incoming element's silhouette) | `stepped` |
| a downbeat with imagery on both sides | `Pixelate` or `MosaicIris` | `stepped` / `mask` |
| any other cut | a hard cut that keeps the ground or the slot, on a sound | `hard` |

The device book holds many more, family by family: [cuts and seams](devices/cuts-and-seams.md),
[camera transitions](devices/camera-transitions.md), [morphs and object handoffs](devices/morphs-and-object-handoffs.md),
[wipes, masks and irises](devices/wipes-masks-and-irises.md), [speed and rush](devices/speed-and-rush.md).

## 4. Iris

`<Iris frame start x y mode="rate" />` grows the radius by the same ratio every frame (house ×1.28 a frame at 60 fps,
×1.64 at 30 fps) from 22 px at 1080p on its first frame: the circle is visible from its first frame, opens from the
point and accelerates in px all the way off the corners (about 16-19 f to the far corner from the centre). The 1.2
paces make rate mode the default (`pace.fx.irisMode`); `mode="ease"` keeps the eased iris.

- `shape` spreads the log growth over the run (a burst out of the point, a near-even middle, an acceleration off the
  corners); give `frames` and `to` with it. `irisRadius()` is the radius alone; `irisRateRun()` its frames.
- `originFrom={{ text, gap, left, top, size, weight, track, lead }}` opens it from the gap after word `gap`
  (`gapOrigin()`: halfway across the space, at mid cap height). Measure under `FontGate`.
- `scallop`: a cloud edge (house 9 lobes, cusps 8 % of the radius deep) that turns a third of a lobe as it opens.
- **The reveal iris** (`irisReveal(start, { x, y })`): a product shot opening onto a new stage opens already big (its
  first radius 37 % of the frame height, never a dot) and covers the frame in 10 f at 60 fps, most of the growth on its
  first frames (radius ratios about 1.76, 1.21, 1.10, 1.07 per 30 fps frame). Wind up first: the container widens on
  an ease-in for a few frames and the iris opens on the next beat. Keep the dot for logo stings.
- **An iris carries speed.** Opened in a line that is moving, the line around the circle accelerates out
  (`launch()`) into the frame the circle covers the frame on, and the line inside opens moving the same way at 1.15×
  that speed, decaying in one stage (×0.65 a 30 fps frame) to its drift: `carriedCut(f, cover, { vCut }, { ratio:
  IRIS_CARRY.ratio, decay: IRIS_CARRY.decay60, fast: { share: 0, decay: 0.4 } })` on the one coordinate both lines
  ride. The circle itself stays where it opened.
- Start it on the hit frame. Declares a `mask` seam carrying the shape.

## 5. Morph, MorphChain and MatchCut

`Morph` (the container morph) keeps its 1.1 API; `path={{ a, b }}` draws the container as an outline morph between
two SVG paths (`morphPath(a, b, p)`) with the content clipped by it, and `seam` declares it. `fx/MorphPath` morphs
outlines that travel round the shape, with followers and goo.

`MorphChain` carries the film through several states of one object instead of cutting:

```tsx
<MorphChain frame={f} states={[chip, gathered, swollen, word]} windows={[{ from, to, ease }, ...]}>
  {[<ChipFace />, <WordFace />]}
</MorphChain>
```

- A state is a box (`lib/box.ts MorphBox`: x, y, w, h, radius, fill, stroke, shadow) plus `blur`, `opacity`, `rot` and
  the `content` index it shows. A window moves the box to the next state on its own `ease` (geometry) and `fade` (blur
  and opacity) curve; `log: true` blends size in log space. The content swaps when a window completes; a one-frame
  window is a designed swap, declared as a `morph` seam (`chainSwaps()`).
- House chain: a hand-off every 8-32 f; a collapse 16-20 f, ease-in under a blur that grows to 12-20 px while the
  object fades into the next state's box; a gather in two phases (a linear drift, then `M.squeeze`); a swell of
  +40-60 % over 24 f on `M.swell` straight into the swap; the next content appears at the object's pre-swell size. Let
  the camera carry the swell's growth on into the new content (a push on `E.glideOut` from the swap frame).
- `collapse(f, { start, frames, zoom, mask, square, into })`: a frame pulls back while its edges close to a centred
  square; on the cut a solid square keeps shrinking, decelerating, and may hand over to the next shot's first card.
- `growThrough(f, { start, frames, from, to })`: a cell grows through the frame on log size (`E.buildIn`); `.cut` is
  the first frame it covers the frame.
- `pillBreath(f, { start, from, to, h, stretch, hold, contract, end })`: a pill mask stretches front-loaded (house 44 f
  on `E.snapOut`), holds 12 f, and contracts into the cut on `E.launchIn` (22 f to 0.86 of its width); pair it with
  `Window` so the next shot opens from the pill's own box.

**MatchCut: the cut that keeps the object.** `<MatchCut frame cut from to outgoing incoming ground />`
(`matchCutState()` for the numbers alone). The eye is on one thing; the world changes around it on the cut and the
thing does not jump. `from` is the object's screen box in the outgoing shot (a function of the frame when it moves),
`to` its rest box in the incoming shot's own layout. The incoming shot opens placed so its object sits one outgoing
step further along (position and size, size in log space: a push of ×1.09 a frame opens ×1.09 bigger than the last
outgoing frame), then settles onto its layout in 36 f, the inherited speed falling to about a third in the first
frames and landing with zero speed.

- Give the incoming rest box a little more room than the inherited one in the direction of the move (a packshot a
  touch bigger than the last pushed frame) so the push lands; where the inherited speed would carry it past its rest
  it brakes instead of bouncing.
- `carry: ['x', 'y']` keeps the position and opens at the new size (a ring that reappears big on the same centre);
  `ratio: 0` matches the box with the object at rest. Draw the incoming shot's paper or colour field as `ground` (it
  never moves, so no edge shows while the shot opens smaller than its rest).
- A shape carried across photo cuts is a match cut too: two discs contracting into the cut become an outline ring on
  the pair's centre and a frame on the pair's box, each opening at the inherited size and still contracting.
- Declares a `morph` seam on the incoming first frame (carrying scale for a push into the object) and camera blur on
  the frames the object moves fast enough to smear.

## 6. Exposure and LightSweep

`<Exposure frame at up down peak brightness swap hue a b />`: the frame over-exposes into a light event and the next
scene settles out of it. The scenes hand over inside the light (a cut, or a dissolve of at most 8 f hidden under the
bloom), and the incoming scene settles back from an overshoot of its own brightness (about 11 % over its rest).

- House: rise 40 f on `E.buildIn` to the peak, veil 0.82, brightness ×1.5, swap 10 f before the peak with a 6 f
  dissolve, settle 26 f on `E.linear`. Peak on a hit. `charge={{ at, gain, rise, fall }}` adds a short charge before
  the bloom.
- The light is the whole frame's, in one hue: never a glow or halo around one element.

`<LightSweep frame start frames band angle gain hue />`: a soft band of light moved by transform (screen blend), swung
past the lens, accelerating (house 44 f on `E.launchIn`, band 0.45 of the frame width, gain 0.55): a sheen across a
product as it lands, or a light event that carries a cut. Both count as the act's light event
(`references/lighting.md`).

## 7. BlockStep, Window, TypeWindow

- **`<BlockStep frame at blocks silhouette outgoing incoming />`**: a hard transition built from flat blocks, one frame
  each: a block covers part of the old frame, the next frame a bigger block elsewhere, then the incoming element
  appears as a flat silhouette of itself that steps back to the real thing (house 1, 2/3, 1/3, 0 over three frames).
  Blocks are the film's paper or ink colour, never the accent. Every block frame is a declared flash; the run is
  stepped. Cut it on a hit.
- **`<Window frame start rects oldScale cadence radius old next />`**: the next shot opens as a window inside the
  current one and takes the frame in a few held steps while the old shot steps back (house 1 → 0.94 → 0.80), on a
  lower cadence (16 fps holds), so it reads as a designed edit. `radius` keeps the corners of the object that became
  the window.
- **`<TypeWindow />`**: the next shot through the letters of a word that scales up step by step until the image takes
  the frame; the title inverts to the light colour on the last step (house 9 steps at 24 fps).

## 8. Dive, BlobRing, Wipe

- **`<Dive frame start outgoing background incoming occluder />`**: a soft occluder (mist, a frosted panel, a big
  blurred foreground object) rises into the frame while the scene behind it defocuses on an accelerating curve; a few
  frames are nothing but the soft layer (the hidden cut sits in the middle); the next subject rises out of it and its
  focus racks in a few frames behind its position. House: rise 40 f, defocus to 16 px, travel 0.35 of the height,
  12 f fully covered, clear 20 f, the subject rises 0.12 of the height over 18 f and racks from 14 px over 36 f,
  starting 4 f after it moves.
- **`<BlobRing frame start hole soft tighten release wobble color />`**: a soft ring of one colour swirls in around the
  frame and frames the next statement, then breathes (tightens on `M.ringTighten`, loosens, its centre wandering).
  House: swirl 8 f from a hole 1.6× its rest size; hole 0.74 × 1.12 of the frame; soft edge 0.36 of the radius;
  tighten to 0.86 over 28 f; wobble 25 px over 2 s. Two or three section changes into a statement at most.
- **`<Wipe frame start kind angle outgoing incoming />`**: the incoming shot behind a travelling edge (an alpha ramp in
  a mask, never a blurred element).
  - `kind: 'push'`, the studio wipe: a hard edge that pushes the outgoing shot along. The edge starts off-frame, so
    the old shot is already moving when it enters; it arrives fast (its speed peaks a quarter of the way in, about 7 %
    of the frame a 60 fps frame), decelerates to 0.483 of the frame in 54 f, creeps, then leaves on `E.buildIn` over
    42 f and is cut at speed. The outgoing shot rides 0.62 of the edge's travel in the arrival and holds while the
    edge leaves. The edge streaks 0.3 of its step (a box-blurred hard edge is a ramp), so it is sharp when slow and
    smeared when fast; the pushed shot is smeared along the travel (`smear: 'draw'`, or `'shutter'` to declare camera
    blur instead). `stages` sets other runs (`[{ to, frames, ease, push, gap }]`), `ride: 1` pins the incoming shot to
    the edge as a sliding sheet.
  - `kind: 'feather'`: a 350 px edge that decelerates across the frame (it lands at about a third of its starting
    speed), 30 f on `E.softOut`. `kind: 'gradient'`: an edge as wide as 70 % of the element it reveals, at one speed
    (house 3360 px/s): a line of type washing on.
  - A wipe is finished on the frame its run ends (`wipeEnd()`), even when its edge lands a hair short of the frame:
    `<Wipe>` stops drawing the outgoing shot from there.
- **Edge masks**: `edgeMask({ left: 250 })` (and `<Scroll edgeMask>`) is the static version for lines that scroll
  through the frame: a line comes out of nothing instead of being cut by the frame.

## 9. CutFx: cuts dressed with what is on screen

- **Blur bridge** (`blurBridge(f, cut)`): a hard punch-in from a wide shot to its close-up (x2-2.5) softens the wide
  shot's last two frames and the close-up's first two (house sigma 1.2, 4 | 3, 1.2 at 1080p, through `Defocus`), and
  the close-up eases back about 9 % on a decaying pull-back, so the jump reads as one push and the close-up breathes.

- **`<FlashCut frame cut whip flash streak slide pull out in />`**: the camera whips on an ease-in that never brakes,
  then one over-exposed frame (about 92 % white) with a faint ghost of what was there, then one dark frame of
  horizontal streaks, then the next shot already sliding in, decelerating, and pulling back the moment it lands.
  House: whip 24 f on `E.launchIn` over 0.24 of the frame width; flash 0.92 with a 0.3 ghost; slide 28 f on
  `E.snapOut` from 0.55 of the width; pull 28 f to 0.65 on `E.glideOut`. Cut on a swell's peak. The slide opens at
  several times the whip's last speed, so its first frames are the most smeared of the cut: the whip's tail and the
  slide's head are drawn with the whip-shutter streak (`smear: 'draw'`, house) and sharpen as the shot lands.
- **`<DefocusCut frame at out empty in outgoing incoming ground />`**: the outgoing line blurs out and fades together
  (most of the blur late), exactly one empty frame, and the next line arrives very soft and pulls into focus, its blur
  shrinking by about the same ratio each frame until it snaps sharp. House: out 18 f to 32 px on `E.buildIn`; 1 empty
  frame; in from 45 px, ×0.80 per 60 fps frame, sharp after 18 f.
- Small cuts (state functions; draw them with any layers):
  - `blackDipState(f, { cut, black, fadeUp })`: a whip that ends on 1-2 black frames, the next shot fading up (house 2
    black frames, 8 f linear).
  - `doorSplitState(f, { start, frames, axis, rise })`: the frame splits down the middle and both halves slide apart
    on the measured door path (each step about ×1.5 the last, leaving at about 250 px a frame at 24 fps; 30 f), and
    the next card inherits their speed turned through 90°: it peeks 32 px over 12 f before the doors move, creeps,
    then rides up from the bottom edge a third into the doors' run, peaks with them and decays home in 50 f (`rise`,
    px below its rest; give its rest `top`). Draw the card above the halves.
  - `fillSwapState(f, { at, n, every, grow, fills })`: hard swaps of full-frame fills a few frames apart, each 4 %
    bigger than the last (house 3 swaps 10 f apart).
  - `tintThroughGrey(f, { start, frames, a, b, grey })`: a colour change that passes through a neutral grey of the
    same lightness, so two tints never mix into a third hue (house 56 f on `E.strongInOut`).
  - A graphic match cut into an object: `zoomThrough({ factor: 1.5, frames: 22 })` with `handoffShot()` carrying the
    log scale across the cut, the next shot opening inside the same shape.

## 10. Pixel devices

- **Pixelate on the beat.** `pixelateState(frame, { cut, out, in }, film)`: the block size grows into the cut on a log
  scale (house 8 f from 6 to 160 px, a little faster at the end) and shrinks after it (from 190 px by ×0.72 a frame for
  11 f). Put the cut on the track's downbeat. `<Pixelate cut out in outgoing incoming />` draws it with static SVG
  filters, one per block size the run uses (`pixelLadder()`), built once: each frame only picks its filter, so no
  filter attribute is animated. The run is stepped and the cut a `stepped` seam.
- **Mosaic iris.** `<MosaicIris at origin ring cell colors reveal outgoing incoming />`: a ring of square cells opens
  from a point (the status dot, the last word's period); cells live only in the annulus (house ring 195 px, cells
  30 px), their colours from the accent's own family re-picked on twos; inside the ring the next scene shows through a
  circle. Front-loaded expansion (`E.snapOut` to the far corner in 18 f). A `mask` seam on its first frame.
- More in the device book: `fx/DotMatrix` (the next shot turns on as an LED dot matrix), `fx/Cascade` (dots,
  halftone, mosaic, then the picture), `fx/Slices`, `fx/Implode`, `fx/Glint` (a pixel sprite that bridges a hard cut).

## 11. Camera seams

The camera makes many of the best seams: `scaleBreath` (every cut breathes), `whip` with `swapAt` on its peak,
`zoomThrough` with `handoffShot`, `SnapZoom` (one jump frame), `defocusPulse`, `reversal` into the last cut,
`punchOut` (`references/camera.md`). Speed through a cut comes from `lib/handoff.ts` (`launch`, `carry`,
`carriedCut`, `carryChain`). Declare each one.

**Fast seams streak.** Slow moves stay crisp; above about 720 px/s at 1080p (24 px a frame at 30 fps, 12 at 60) a
whip, a scroll into a cut, a slide out of a flash or a pushed shot carries a streak of 0.3-0.5 of its per-frame
travel along the move, and a travelling hard edge a ramp 0.3 of its step. Two ways, never both on one layer:

- Draw it: `DirBlur` (`fx/Defocus`) along the move from the layer's speed (the whip shutter, 360°, for whips and the
  slide out of a flash cut). `FlashCut` and `Wipe kind="push"` do this themselves (`smear: 'draw'`).
- Declare it: `blurRanges(shot, from, to, { film })` (`lib/camera-moves.ts`) returns the frames a camera move is fast
  enough to smear on, `fastRanges(speed, from, to)` (`lib/handoff.ts`) the same for any speed; put them in
  `CAMERA_BLUR` (or a primitive's `declares()`, with `smear: 'shutter'`) and the finishing pass renders exactly those
  frames with the shutter. A crisp film keeps its holds sharp and still streaks its whips.

## 12. Sound-led cuts

- **Cut on a sound.** At least half of the hard cuts land on a sound within a frame (the picture may lead by up to
  3 f), and most within 100 ms: an accent of the track or a designed effect (`grid-check cut-on-sound`).
- **A dip before the biggest reveal.** The reveal comes after a break, a stop or a stop-down of 0.2-0.5 s and lands on
  the track's entry (`REVEAL`, `reveal-dip`).
- **One gesture at a time.** A cut the track already accents gets no designed hit; a whoosh belongs to a camera-scale
  move, not to every cut.
- **Not on every downbeat.** Outside reels, at most 60 % of ordinary cuts sit on downbeats and the shot lengths vary
  with the music's phrasing (`anti-metronome`).

## 13. Bans

| Ban | Why | Instead |
|---|---|---|
| A crossfade as a seam (over 8 f, full frame) | nothing carries across, so the film reads as slides | a velocity hand-over, a morph, a mask from the picture |
| A dissolve between unrelated shots, a fade to black mid-film | a soft cut with no idea | a carried seam; `fadeEnd` only closes the film |
| Two layers both fading over black | a 25 % luminance dip at the midpoint | fade only the incoming layer over an opaque outgoing one |
| Glitch, RGB split as decoration, light leak, film burn, swirl, ripple, dreamy zoom, a fade through white | preset gimmicks with no story reason | a seam from this page; a declared one-frame flash inside a whip is craft, a fade through white is not |
| The same device three times (signature excepted) | it becomes a preset | vary the families |
| A whip or fling the blur cannot carry | a long smear with stepped copies | a cut on the beat, a match cut, a mask wipe, a shorter move, or a declared `CAMERA_BLUR` range |
| Two copies of one object cross-fading | a translucent double image | morph one object; swap content at the peak |

## 14. `@remotion/transitions` and the grid

- The package is not in the starter; add it with `npx remotion add @remotion/transitions` so its version matches.
  Treat its gimmicks (book-flip, clock-wipe, crosswarp, dreamy-zoom, film-burn, ripple, swap, zoom-blur) as off-brand.
- **A transition shortens the timeline** (60 + 60 − 15 = 105 frames); every later cue shifts by the overlap unless
  you add the overlap to the outgoing sequence. Prefer seams built inside the acts from shared absolute-frame
  functions: `ACT` stays contiguous and on the grid, and each act still renders alone.

## 15. Checks

- `forensics.py` (seams, on every render; `--seams` runs them alone on a small decode): `carried-cut` counts the
  device each hard cut carries (ground kept, blur at the seam, anchor held, motion carried) and fails when more than
  10 % are bare (one bare cut warns; so does a film that declares no seams, since only the plan names a matched
  shape); a declared seam that does not carry what its recipe promises warns (a velocity seam with no motion across);
  a declared velocity seam whose exit does not build x1.15-1.35 a frame or whose next shot stops inside 8 f warns, and
  one that turns or does not decay fails; `ground-flip` fails a third flip of a neutral ground (paper, grey, slate,
  black) between light and dark (a colour field moving between its deep and light state is one family); `seam-mix` fails when one seam kind takes more than 45 % of the scene changes (5 or more),
  and warns when a film of 4+ lines has no exit-then-enter, text-swap or match-cut. Also `dissolve-detect`,
  `still-cut`, `hold-into-exit`; spikes at undeclared cuts usually mean a property flipped or a pose repeated.
- `grid-check.ts`: `seam-plan` (fade only at the end, UI dissolves short and inside acts, kinds <= 3, carried >= 40 %,
  a velocity seam in a cut film), `declares-cover` (every primitive's seams declared), `cut-on-sound`,
  `reveal-dip`, `anti-metronome`.
- `look-audit.py`: the floor's carried share and scale contrast between shots.
- Grab frames `seam - 2 ... seam + 2` (`scripts/grab.sh`) and read them as stills: one outline per object, no property
  flip, the rest pose once.
