# Library: turns and effects

Finished animations for how one scene becomes the next, and the finishing layers that make a frame rich. Import them
from the kit (`import { DotReveal, GrowIris, TrackOverlay } from '../../kit';`). The reel `library-turns` shows every
piece with its name: render it to see them move.

Every turn is clean by construction: at its peak the whole frame is covered, the two scenes never show a gap, and on its
last frame the next scene is whole and at rest (a move of `dur` frames starts on `at` and lands on `at + dur - 1`, so
the frame after the turn is identical to its last frame: no pop). Each takes `from` and `to` (two full-frame scenes), `at` (its first
frame) and `speed` (1 is the measured timing, 2 twice as fast); before `at` it draws `from`, after its end `to`, so put it
in a Sequence that spans both scenes. Prefer a turn that carries a real object or picture through the cut (dot reveal
from a phone, dive into a card, shape match, iris from a button) over an abstract wipe. One turn of a kind per film.

Never: a flash of light to hide a cut, a screen shake on an impact (not even a small one), a sudden change of ground
colour or of light and dark mode with no object carrying it, a faint gradient ground, text that leaves by fading while
it rises. Hard colour flips on a beat were tried and dropped: they read as a sudden colour change.

## Turns

### DotReveal
The next scene arrives as a field of round dots (or square cells) that sweep in from an edge or grow out of an object;
each dot is one flat colour of the next scene, the dots swell until they merge, then the mosaic resolves to the sharp
picture. For a picture or a full scene arriving out of a small object (a phone, an icon) or a calm screen.
```tsx
<DotReveal from={phone} to={photoGround} front={<PlannerCard />} at={T.reveal} origin="top" pitch={36} shape="dot" sweep={14} grow={8} resolve={10} rag={0.35} wash="#7CCBFF" seed={3} />
```
- `origin`: `'top' | 'bottom' | 'left' | 'right'` or `{ x, y }` (the object's centre). `shape="square"` gives a pixel
  dissolve. `dotRevealEnd(at, opts)` is its last frame.
- `front`: a layer drawn sharp above the dots from `at` on (the cards or panel the new ground arrives under; it animates
  itself). Only the ground goes through the dots and the mosaic, so the UI stays readable the whole time.
- Numbers: dots start at 0.6 of the pitch and swell to 1.5 (they cover their cell) over 8 f; the ragged front crosses in
  14 f; the mosaic steps 36, 24, 18 on twos, then 3 px of blur clears; the wash clears over the 10 resolve frames.
  About 34 f.
- Caution: small text in the next scene is unreadable until the resolve ends; hold the scene after it.

### BlockBurst
Square cells burst out of an object in a diamond until the next scene fills the frame; cells arrive half size and step to
full two frames later, single scouts run ahead of the front, some cells arrive as an outline first. With an edge as
origin it eats in as a staircase. For a digital or financial product, an icon that opens into its world.
```tsx
<BlockBurst from={iconScene} to={nextScene} at={T.burst} origin={{ x: 960, y: 540 }} cell={60} reach={14} edge="#0B0B0C" outlines={0.07} seed={5} />
```
- Numbers: 60 px cells; the front reaches the farthest corner in 14 f (about 0.8 cells a frame), the last cells land 5 f
  later; outlines hold 2 f (never on the last frame); scouts 1-2 f ahead. `blockBurstEnd(at, opts)`.
- Carry the object through: draw the icon above the turn, crush it to cells (`PixelFilter`, step 22 then 34) for the 4 f
  before `at`, keep it sharp on top while the next scene bursts out of it, then move it aside for the line (the reel does).
- Caution: the outline colour should be one the film already uses (its ink or accent), never a new one.

### GrowIris
A shape grows out of an object on screen until it is the next scene, covering every corner on its last frame (the radius
is solved for the farthest corner). Inside it the next scene settles from smaller, so the opening reads as a push through.
For a button, a pill or a card that opens into what it promises.
```tsx
<GrowIris from={buttonScene} to={nextScene} at={T.open} x={960} y={540} r0={70} dur={6} inner={0.58} rim={ACCENT} />
<GrowIris ... shape="rounded" box={{ w: 1000, h: 150, r: 36 }} dur={8} />   // a card grows into the frame
<GrowIris ... shape="ellipse" aspect={1.3} />                                  // a letter's counter
```
- Numbers: 6 f from the object's size to the corners; the radius is 34, 49, 59, 79, 100 % of the way on frames 1-5
  (`1 - (1 - t)^1.35`); the scene inside goes 0.58 to 1 on expo out; a 6 px soft edge.
- Caution: start it where the object really is (`x`, `y`, `r0` or `box` from the layout), or the shape pops.

### DiveInto
The camera dives into an object (a card, a window, a picture) and its inside is the next scene. The zoom is exponential
and accelerates until the object's rounded box covers the frame, corners included; the next scene is a plate inside the
object that the window outruns, so there is depth; after landing the scene keeps a little of the speed.
```tsx
<DiveInto from={deskScene} to={pictureScene} at={T.dive} box={{ x: 960, y: 640, w: 560, h: 340, r: 26 }} dur={20} plate={1.6} carry={0.03} blur={8} />
```
- Numbers: 20 f, cubic-bezier(0.4, 0, 0.75, 0.35) in log scale; the plate starts `plate` times the window and grows less;
  blur on the outer scene up to 8 px in the last third; after landing the scene grows 3 % more over 18 f (expo out) and
  stays there.
- Caution: words in the next scene should arrive after the landing, not ride in through the window. Draw the object's
  preview as the plate will show it (the next scene at `plate * w / 1920`, centred on the window, no drift), or the
  picture jumps on the first frame of the dive.

### WhipGate
An accelerating whip that never brakes, a two-frame gate inside the blur (both scenes crossed in one smeared exposure,
then the next scene torn into streaks), and the next scene arriving at whip speed, its smear clearing as it slows.
```tsx
<WhipGate from={a} to={b} at={T.whip} dir="right" dur={12} dist={260} smear={26} land={8} enter={160} />
```
- Numbers: 12 f build on cubic-bezier(0.23, 0, 0.72, 0.12), 260 px, smear 1 to 26 px; 2 gate frames; the next scene
  enters 160 px back with a 21 px smear and lands in 8 f. `whipGateEnd(at, opts)`.
- The side a moving scene uncovers is filled with its own mirror image (a continuous edge under the smear), so no frame
  shows a gap or the ground behind the turn.
- Caution: both scenes should share a ground tone; the gate crosses them, it does not hide a jump from light to dark.

### Shove
The old scene is cut into bands (one per line of type) that are shoved off one after another, accelerating and smearing,
while the next scene slides in underneath from another side and lands. For a statement giving way to the product.
```tsx
<Shove from={statement} to={phoneScene} at={T.shove} dir="left" cuts={[449, 632]} lag={3} alternate enterFrom="top" enter={0.35} ground={WHITE} />
```
- Numbers: bands 2-3 f apart, each 14 f on expo in, smear up to 28 px on its fastest frames; the next scene drops 35 % of
  the frame and lands on expo out over 16 f, starting 2 f after the first band.
- Caution: put `cuts` between lines; a band edge through a word reads as a mistake.

### ShapeMatch
A match cut on shape: one shape in the old scene (an icon tile, a chip, a dot) detaches and travels to where the same shape
sits in the next scene, changing size, radius and colour, while the old scene is carried off the other way; the next scene
cuts in around it as it lands. The shape's own copy is cut out of the old scene, so there is never a double.
```tsx
<ShapeMatch from={lineWithTile} to={gridScene} at={T.match} dur={14} a={{ x, y, w: 120, h: 120, r: 28, color: ACCENT }} b={{ x: 960, y: 540, w: 300, h: 300, r: 68, color: ACCENT }} ground={PAPER} inside={<Icon name="Check" size={150} color="#fff" />} />
```
- Numbers: 14 f, the shape on expo in-out; the old scene leaves on expo in over the first 80 % with up to 24 px smear.
- Caution: draw the shape in both scenes at exactly `a` and `b`; let the next scene's other parts arrive after the cut.

### GlitchCut
A few frames where the picture breaks and the next scene flickers through, one state a frame, cut hard: bands of both
scenes displaced (each band wraps, so no empty edge), the old scene crushed to a mosaic under a fine cell grid, rows torn
into horizontal streaks, the channels pulled apart, clean frames of either scene between them.
```tsx
<GlitchCut from={a} to={b} at={T.glitch} steps={['slice', 'from', 'grid-from', 'to', 'scan-to', 'slice', 'to', 'rgb-to']} hold={1} seed={7} shift={130} />
```
- States: `slice`, `grid-from` / `grid-to`, `scan-from` / `scan-to`, `rgb-from` / `rgb-to`, `from`, `to`.
- Numbers: 8 states of 1 f (`hold={2}` on a slow film); bands 30-150 px tall shifted up to 130 px, a fifth of them
  stretched 1.4-2.4x; channel split 10 px; grid cells 18 px; scan rows 14 px torn with a 60 px streak. `glitchCutEnd(at, steps, hold)`.
- Caution: once a film at most, on a hit in the music; never as the default cut.

## Effects

### LightSweep
A band of light crosses a surface once: a broad soft glow with a thin hot line at its leading edge, clipped to the
surface's rounded box. On a card, a button, a glass panel.
```tsx
<LightSweep at={T.sweep} dur={12} w={1000} h={150} radius={36} angle={18} color="#FFFFFF" strength={0.75} width={0.35}><Prompt /></LightSweep>
```
- Numbers: 10-14 f on expo in-out, the band 35 % of the surface, tilted 18 deg; `blend` screen (on a white surface use a
  tinted `color` and `blend="multiply"`).
- Caution: once per surface; a sweep on everything is wallpaper.

### Bloom
Light that spills in its own colour: a blurred copy of the content added on top, so bright parts glow; `pulse` swells it
once on a hit.
```tsx
<Bloom radius={36} strength={0.45} pulse={{ at: T.live, up: 3, down: 14, gain: 2.2 }}>{orbAndWord}</Bloom>
```
- Numbers: blur 18-40 px at 30-45 %; a pulse to about 2x over 3 f and back over 12-14 f.
- Caution: dark grounds only; on a light ground it greys the picture.

### TrackOverlay
Motion tracking laid over a moving object: a thin box round each target that turns with it, a dot at its centre, the live
coordinates above it (they count every frame), dashed arcs that draw between the targets and sweep past them with an
arrowhead; optional guide lines to the frame edges or corner brackets instead of boxes.
```tsx
<TrackOverlay at={T.track} track={(f) => glyphs.map((g) => ({ x: g.x(f), y: g.y(f), w: g.w, h: g.h, rot: g.rot(f) }))} color="#FF3B4E" dot="#FFB020" corners={false} guides={false} size={24} />
```
- Numbers: 1.8 px boxes, a 10 px dot, labels 24 px set 1.5 lines above the box, arcs 1.6 px dashed 10/8 drawing in over
  10 f; it cuts on.
- Caution: the target must move (a drift, a tilt); tracking a still object looks like a template.

### DotScreen
The content seen through a grid of round dots: an LED board or a coarse halftone; unlit dots show faintly on dark.
`amount` blends it with the plain content, to key it on for a few frames or hold it.
```tsx
<DotScreen pitch={15} dot={0.8} amount={1} off="rgba(255,255,255,0.09)"><BigWord /></DotScreen>
```
- Numbers: an 11-16 px pitch, dots 0.8 of it, unlit dots about 9 % on black.
- As a turn (the reel): the word's dots shrink to nothing over 6 f (ease in), the next picture lights up in the same grid
  as its dots grow from 0.05 to 0.86 of the pitch over 10 f (ease out), then `amount` relaxes to 0.55 over 14 f. Animate
  `dot`, never toggle `amount` on and off: a keyed flicker reads as a strobe.
- Caution: words through it need weight 700 or more and 300 px or more, or they break up.

### ChromaHit
On an impact the colour channels split for two frames and snap back. Wrap the thing that lands, not the frame.
```tsx
<ChromaHit at={T.land} px={14} frames={2} angle={0}><PhotoCard /></ChromaHit>
```
- Numbers: 2 f at 14 px then 10 px, clean on the third. No push and no shake: the object's own landing (a scale from
  1.2 to 1 over 6 f) does the moving.
- Caution: one or two hits a film, on a landing the viewer sees; wrap the object, never the whole frame.

### MorphBox
One rounded shape that becomes the next (a thinking pill, a reply pill, a card, a window) with no pop: position, size,
radius and colour move together, each stage's colour and content wipe in left to right behind a soft lead edge, the old
content clears in the first frames.
```tsx
<MorphBox shadow={softShadow(4, GROUND)} stages={[
  { at: 0, box: { x: 960, y: 560, w: 140, h: 72, r: 36 }, color: '#EEF1F6', content: <Dots /> },
  { at: 16, box: { x: 960, y: 560, w: 520, h: 84, r: 42 }, color: '#FFFFFF', content: <Title />, dur: 10 },
  { at: 32, box: { x: 960, y: 560, w: 720, h: 320, r: 34 }, color: '#FFFFFF', content: <Reply />, dur: 14 },
  { at: 64, box: { x: 960, y: 560, w: 1240, h: 500, r: 28 }, color: '#FFFFFF', content: <Window />, dur: 14 },
]} />
```
- Numbers: 10-14 f per stage on a quint out; the wipe starts 8 % into the stage and is done at 70 % (expo in-out), so no
  soft band lingers on the far edge; old content gone in a quarter of the stage.
- Caution: lay each stage's content out at that stage's size; content wider than its box is cut. Keep the stages in one
  surface colour (grey thinking pill, then white): a stage that turns the accent colour reads as a sudden colour change.

## Helpers
`PixelFilter`, `SmearFilter` (directional blur, edges duplicated) and `SplitFilter` (channel split) are the SVG filters
the pieces use; put one in the tree and point a layer's `filter: url(#id)` at it.
