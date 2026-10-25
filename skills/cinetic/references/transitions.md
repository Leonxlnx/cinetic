# Transitions

How a cinetic film gets from one shot to the next. Almost never a plain cut and never a crossfade: the transition is
made of something already in the picture. A chip becomes the next word, a word gap opens into the next scene, a pill
breathes and closes into the cut, the camera dives through a soft layer, the whole frame blooms into light, a whip
flashes once. The copy around it stays calm; the transition carries the energy. Read this while planning seams in the
beat sheet (Steps 1-3) and before building any act boundary.

Every primitive below is a pure state function of the frame (`xxxState(frame, props, film)`, closed form, fractional
frames and any order) plus a thin component drawn with transforms, opacity, clip paths and masks. Soft shapes come
from gradients or static pre-blurred plates, never from an animated blur radius; defocus is at most two copies at
fixed levels (`lib/defocus`); when a defocused layer also fades, fade the group and let the copies mix by their
weights inside it. Every fx exports `declares(props, film)`: the seams, flashes and stepped frames it makes on purpose,
so the checks treat them as craft. Numbers are 60 fps frames (`f@60`) unless they say otherwise.

**Contents**
1. [The seam plan](#1-the-seam-plan)
2. [Seam laws](#2-seam-laws)
3. [Pick the transition from the content](#3-pick-the-transition-from-the-content)
4. [Iris](#4-iris)
5. [Morph and MorphChain](#5-morph-and-morphchain)
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

## 1. The seam plan

Every seam is declared in `SEAMS` in `timeline.ts` (`{ at, kind, carry?, dir?, signature?, id? }`) and planned in the
treatment's beat sheet before building. The house mix for a 30-60 s film, as a share of its seams:

| Kind | Share | What carries across |
|---|---|---|
| `velocity` | about 25 % | the speed and direction of the move (`launch` into the cut, `carry` out of it) |
| `hard` | about 15 % | nothing: a designed cut, on a sound |
| `morph` | about 12 % | one object changing state (`MorphChain`, `Morph`) |
| `mask`, `whip` | about 8 % each | a shape opening from the picture; the camera's whip |
| `defocus` | about 7 % | focus (a dive, a defocus cut, a pulse) |
| `light`, `snapZoom` | about 6 % each | an exposure event; a one-frame scale jump |
| `breath`, `zoomThrough` | about 4 % each | a scale breath; a zoom into a shape |
| `stepped`, `colour` | 2-3 % each | a stepped run, a colour field swap |
| `wipe` | when it fits | a travelling soft edge |
| `dissolveUi` | inside UI only | a dissolve of at most 8 f under camera motion, never across an act line |
| `fadeEnd` | the last seam only | a fade only ends the film |

- **At least 40 % of seams are carried** (velocity, morph, breath, zoom-through, whip, snap zoom, mask, wipe, defocus).
- **No kind more than 3 times**, except the film's signature transition (mark it `signature: true`).
- **No dissolve between unrelated shots, and no fade to black except at the very end.**
- A cut film of more than a few seconds has at least one velocity seam.
- One or two signature transitions per film, the rest quieter devices; never the same device twice in a row.

## 2. Seam laws

1. **Both sides at rest, or the incoming shot starts at the outgoing velocity.** Anything else is a visible jerk.
2. **Accelerate out, cut at peak speed, decay in.** The outgoing move ends at speed (a leave curve, or `launch()`:
   the cut frame is the fastest), and the incoming move opens at 0.4-1.4× that speed and decays (`carry()`,
   ×0.78-0.93 a frame) to a living residual (`references/motion-tokens.md` §6).
3. **Match every property across the cut:** position, size, radius, colour, shadow, opacity, blur. A property that
   flips at the cut pops.
4. **The rest pose appears once.** If a move comes to rest on pose P and the next act opens on P, the outgoing act's
   last frame is the move's last in-between and the incoming act's frame 0 is P.
5. **Place things the same way on both sides.** Share the placement function; a layout-placed element on one side
   and a transform-placed one on the other shimmers on the cut.
6. **Never cross-fade two copies of one object.** Morph one object, wipe chrome away with a clip, swap content on a
   single element at the move's fastest frame.
7. **The transition starts from the object the eye is already on.** If the eye is on a word, the iris opens from that
   word; if it is on a chip, the chip carries it.
8. **The incoming shot arrives already moving** (a slide, a pull, a settle, a focus rack), never parked.
9. **A discrete frame is designed:** a flash, a block, a held step is declared and rendered from one sample.
10. **The story device never blinks.** It stays at full opacity through every seam.

## 3. Pick the transition from the content

| The outgoing shot ends on | Use | Seam kind |
|---|---|---|
| a small UI object (chip, pill, dot, button) that means the next thing | `MorphChain`: the object gathers, swells and becomes the next word or panel | `morph` |
| a line of type with a gap between two words | `Iris` from the gap, rate mode | `mask` |
| a framed image or card that should become the next scene | `pillBreath` into the cut, then `Window` steps | `mask` |
| a big soft foreground object, mist, a frosted panel | `Dive` through it | `defocus` |
| a bright moment on the music (a hit, a drop) | `Exposure` bloom | `light` |
| a fast camera move | `FlashCut` inside the whip | `whip` |
| a statement that should feel spoken in silence | `DefocusCut` through one empty frame | `defocus` |
| a section change into one centred statement | `BlobRing` around it | `mask` |
| a hard beat with nothing to carry | `BlockStep` (blocks, then the incoming element's silhouette) | `stepped` |
| a soft reveal across the frame | `Wipe` (feathered or gradient edge) | `wipe` |
| a downbeat with imagery on both sides | `Pixelate` or `MosaicIris` | `stepped` / `mask` |
| any other cut | `scaleBreath`, or a velocity hand-over | `breath` / `velocity` |

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
- Start it on the hit frame. Declares a `mask` seam carrying the shape.

## 5. Morph and MorphChain

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
- **`<Wipe frame start kind angle feather outgoing incoming />`**: the incoming shot behind a travelling soft edge (an
  alpha ramp in a mask, never a blurred element). `kind: 'feather'` (house): a 350 px edge that decelerates across the
  frame (it lands at about a third of its starting speed), 30 f on `E.softOut`. `kind: 'gradient'`: an edge as wide as
  70 % of the element it reveals, at one speed (house 3360 px/s): a line of type washing on. A two-stage push-wipe is
  two wipes in a row, the second starting as the first lands, the same direction.
- **Edge masks**: `edgeMask({ left: 250 })` (and `<Scroll edgeMask>`) is the static version for lines that scroll
  through the frame: a line comes out of nothing instead of being cut by the frame.

## 9. CutFx: cuts dressed with what is on screen

- **`<FlashCut frame cut whip flash streak slide pull out in />`**: the camera whips on an ease-in that never brakes,
  then one over-exposed frame (about 92 % white) with a faint ghost of what was there, then one dark frame of
  horizontal streaks, then the next shot already sliding in, decelerating, and pulling back the moment it lands.
  House: whip 24 f on `E.launchIn` over 0.24 of the frame width; flash 0.92 with a 0.3 ghost; slide 28 f on
  `E.snapOut` from 0.55 of the width; pull 28 f to 0.65 on `E.glideOut`. Cut on a swell's peak.
- **`<DefocusCut frame at out empty in outgoing incoming ground />`**: the outgoing line blurs out and fades together
  (most of the blur late), exactly one empty frame, and the next line arrives very soft and pulls into focus, its blur
  shrinking by about the same ratio each frame until it snaps sharp. House: out 18 f to 32 px on `E.buildIn`; 1 empty
  frame; in from 45 px, ×0.80 per 60 fps frame, sharp after 18 f.
- Small cuts (state functions; draw them with any layers):
  - `blackDipState(f, { cut, black, fadeUp })`: a whip that ends on 1-2 black frames, the next shot fading up (house 2
    black frames, 8 f linear).
  - `doorSplitState(f, { start, frames, axis })`: the frame splits down the middle and both halves slide apart,
    accelerating (house 24 f on `E.buildIn`).
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

- `grid-check.ts`: `seam-plan` (fade only at the end, UI dissolves short and inside acts, kinds ≤ 3, carried ≥ 40 %,
  a velocity seam in a cut film), `declares-cover` (every primitive's seams declared), `cut-on-sound`,
  `reveal-dip`, `anti-metronome`.
- `forensics.py`: `carried-cut` (a declared velocity seam that breaks fails), `dissolve-detect`, `still-cut`,
  `hold-into-exit`; spikes at undeclared cuts usually mean a property flipped or a pose repeated.
- `look-audit.py`: the floor's carried share and scale contrast between shots.
- Grab frames `seam − 2 … seam + 2` (`scripts/grab.sh`) and read them as stills: one outline per object, no property
  flip, the rest pose once.
