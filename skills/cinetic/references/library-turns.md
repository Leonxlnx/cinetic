# Library: turns

**What it is for:** the join, one scene becoming the next, covering the whole frame. Each entry's `use` starts with what
it carries (the object, the press, the line being read, a shape, a colour field, the motion, a held layer, or nothing,
on a hit in the music). Reach first for `DiveInto` (into the object), `WindowOpen` (a press opens its window), `DotIris`
(the line carried), `ShapeMatch` (a shape in both scenes) and `VelocityCut` (the motion). Not here: line exits that also
turn (`BlockOut`, `PushApart`, `ClipExit` in [type](library-type.md)), camera moves (`PullReveal`, `ExposureRamp` in
[camera](library-camera.md)), the joins into a lockup (`PixelIris`, `PlateSqueeze` in [objects](library-objects.md)).
Near neighbours elsewhere: `DotIris` beside `PushApart` (type), `ChipBloom` beside `InlineChip` (type), `FrameCollapse`
beside `PlateSqueeze` (object), `GrowIris` beside `PixelIris` (object), `CollapsePill` beside `MorphBox` (fx),
`StampHop` beside `BlockOut` (type); see [library.md](library.md#near-neighbours-across-categories) and the join table
in [library.md](library.md#a-join-by-what-it-carries).

Finished animations for how one scene becomes the next. Import them from the kit
(`import { DotReveal, GrowIris, WindowOpen } from '../../kit';`). The reel `library-turns` shows every piece with its
name; `frames.mjs library --category turn` lists them. The finishing layers that make a frame rich (a light sweep,
bloom, tracking marks, a dot screen, a channel split, a morphing box) are their own category: [library-fx.md](library-fx.md).

Every turn is clean by construction: at its peak the whole frame is covered, the two scenes never show a gap, and on its
last frame the next scene is whole and at rest (a move of `dur` frames starts on `at` and lands on `at + dur - 1`, so
the frame after the turn is identical to its last frame: no pop). Each takes `from` and `to` (two full-frame scenes), `at` (its first
frame) and `speed` (1 is the measured timing, 2 twice as fast); before `at` it draws `from`, after its end `to`, so put it
in a Sequence that spans both scenes. Prefer a turn that carries a real object or picture through the cut (dot reveal
from a phone, dive into a card, shape match, iris from a button) over an abstract wipe. One turn of a kind per film.

Never: a flash of light to hide a cut, a screen shake on an impact (not even a small one), a sudden change of ground
colour or of light and dark mode with no object carrying it, a faint gradient ground, text that leaves by fading while
it rises. Hard colour flips on a beat were tried and dropped: they read as a sudden colour change.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [DotReveal](#dotreveal) | join | 34 f | the next scene arrives as a field of dots (or square cells) from an edge or an object, swelling until they merge | carries the object it grows from: the next scene swells as dots out of a phone, an icon or an edge; for a picture or a full scene arriving out of something small, or after a calm screen |
| [BlockBurst](#blockburst) | join | 19 f | square cells burst out of an object in a diamond until the next scene fills the frame; from an edge, a staircase | carries the object it bursts from: square cells break out of an icon into its world; for a digital or financial product |
| [GrowIris](#growiris) | join | 6 f | a circle, rounded box or ellipse grows out of an object until it is the next scene, which settles from smaller inside | carries the press: a button, a pill or a card grows into the scene it promises (cause and effect) |
| [DiveInto](#diveinto) | join | 20 f | the camera dives into a card, a window or a picture, exponentially, and its inside is the next scene | carries the object: the camera goes into the card, window or picture on screen and its inside is the next scene |
| [WhipGate](#whipgate) | join | 22 f | an accelerating whip, a two-frame gate inside the blur, and the next scene arriving at whip speed, its smear clearing | carries the motion: a fast whip between two scenes on one ground tone |
| [Shove](#shove) | join, exit | 24 f | the old scene is cut into bands shoved off one after another while the next slides in underneath and lands | carries the motion: the old scene is shoved off in bands as the next slides in under it; for a statement giving way to the product |
| [ShapeMatch](#shapematch) | join | 14 f | one shape detaches and travels to where the same shape sits in the next scene, changing size, radius and colour | carries a shape: an icon tile, a chip or a dot that is in both scenes travels to its next place (a match cut on shape) |
| [GlitchCut](#glitchcut) | join | 8 f | a few frames where the picture breaks and the next scene flickers through, one broken state a frame, cut hard | carries nothing: the hard cut on a hit in the music, broken for a few frames, once |
| [WindowOpen](#windowopen) | join | 14 f | a window opens out of the button that was pressed, the next scene's window drawn whole inside the growing rectangle | carries the press: the pressed button grows into the window or panel it opens; the commonest hand-built join, take this one |
| [DotIris](#dotiris) | join | 9 f | a dot appears at one point (the gap between two words, a button) and opens by a constant ratio a frame into the next scene, playing inside it at its own scale | carries the line being read and the point it opens from (the gap between two words, a button), the line drawn at the same place in both scenes; for a line that opens onto a lighter or darker world |
| [ChipBloom](#chipbloom) | join | 7 f | a picture chip inside a sentence grows, pushing the words apart, then opens to the full frame in two frames: its picture is the next scene | carries the object: the chip's own picture becomes the frame; for a sentence that names the thing the next scene shows |
| [FaceDive](#facedive) | join | 12 f | the camera dives through a polygon face (a hexagon cube face, a tile) that already holds the next scene; the face outruns its picture | carries the object: its face already holds the next scene; for a diagram of objects where one of them is the next subject |
| [VelocityCut](#velocitycut) | join | 11 f | the outgoing content's speed doubles every frame, the cut lands on the fastest frame and the next content enters moving the same way and brakes | carries the motion: the next content enters at the speed the old one left; for two scenes on one ground: a line to the product, one step of a flow to the next |
| [FrameCollapse](#framecollapse) | join, exit | 31 f | the whole frame becomes a panel on a flat ground: sides snap in, then top and bottom, then it shrinks to a small square while its line stays readable | carries the old frame itself, as a panel, onto a colour field; for closing a chapter: the problem shot shrinks away before the answer |
| [LensIris](#lensiris) | join | 11 f | two large discs roll in and close over the old scene; the next scene opens in the lens-shaped gap between them with a lit rim | carries a shape (two closing discs) and their dark colour field, which is the next ground; for a dark, three-dimensional world, an eye or a lens metaphor |
| [TiltLift](#tiltlift) | join, enter | 30 f | the old line lifts with a vertical smear while a big card tilted back rises from below, blurred; the next ground floods up behind it and the card settles flat | carries the upward motion, and a colour field flooding in behind the card; for a statement giving way to the product's first card |
| [CrossFall](#crossfall) | join | 12 f | the old line dims and recedes in place while the next title falls in on top, huge and blurred, and settles sharp | carries the line's place: the title lands where the old line was being read; for a run of statements and a name on one dark ground |
| [PixelStair](#pixelstair) | join | 26 f | the next scene advances in large square cells: a skyline on twos with hot cells on its edge, or a scatter of loose cells that accelerates | carries a colour field: the next ground arrives as the cells; for a picture or a board giving way to a flat ground, a digital product |
| [TileFlood](#tileflood) | join | 30 f | isometric diamond tiles spawn from two corners and thicken into a checker until the next ground fills the frame, the objects on top throughout | carries a held layer: the objects stay while the ground floods behind them; for an isometric diagram whose ground changes while its objects stay |
| [Interleave](#interleave) | join | 7 f | old and new alternate on single frames (the old scene as its own mosaic, the new one building) for seven frames, then the new scene holds | carries the old scene's own material (its texture frames), on the rhythm of the music; for a hit in the music between two scenes of one material |
| [StampHop](#stamphop) | join | 7 f | a flat box hops one word a frame along the line; under it the line is replaced and the box hops on over the new words | carries the line's place and size: only the words change under the box; for a rhythmic swap of two short lines on the music |
| [CollapsePill](#collapsepill) | join | 9 f | the chosen row blurs its content away into its own surface, then collapses (height far faster than width) into a small pill at its next place, which sharpens with its label | carries a shape: the row's box becomes the pill; for a request, comment or result that becomes the job that runs it (a status, a progress, a send) |
| [StepTear](#steptear) | join | 16 f | the paper is torn away in held steps with a ragged pixel-stepped edge (a corner, the opposite corner, most, all), each step adding one word to the line in place | carries the line (one word a step, in place) and the next picture under the tear; for a statement built over a picture, an editorial or collage voice |

<!-- /library:pieces -->

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
- Caution: the iris shows the next scene around its opening point first. When the next scene's content sits far from
  that point (an editor whose code is at the top left, a page whose title is across the frame), the opening frames show
  an almost empty plate: move the content to the opening point, or use `WindowOpen`, which scales the whole window into
  the growing rectangle.

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
- Numbers: bands 2-3 f apart, each 14 f on expo in, smear up to 28 px on its fastest frames; every band, its smear
  included, is off the frame on its last drawn frame. The next scene drops 35 % of the frame and lands on expo out over
  16 f, starting in the last band's fast frames (4 f before it leaves), so no slab of the old scene stays beside the next
  scene settled.
- Caution: put `cuts` between lines; a band edge through a word reads as a mistake. Give `ground` (the next scene's
  ground) whenever the next scene is drawn without one: until it lands, the strip it uncovers shows the ground.

### WindowOpen
A window or panel opens out of the button or card that was pressed: the button's rounded rectangle grows into the
window's rectangle (centre, size and radius together), and inside it the next scene's window is already laid out and
drawn whole, scaled to cover the growing rectangle. Never an empty plate, never a reveal through a sliding clip edge.
The commonest join a film builds by hand; take this one.
```tsx
<WindowOpen from={cardScene} to={editorScene} at={T.open} box={{ x: 1300, y: 772, w: 340, h: 92, r: 46 }} win={{ x: 880, y: 540, w: 1460, h: 840, r: 30 }} dur={14} face={<OpenButton />} shadow={softShadow(5, PAPER)} />
```
- `box`: the button exactly as drawn in the old scene. `win`: the window exactly as drawn in the next scene (omit it to
  open to the full frame). `face`: the button's own label and fill at `box` size, fading out in the first fifth (3 f) and
  growing 15 % at most. `windowOpenEnd(at, opts)` is its last frame.
- Numbers: 14 f on cubic-bezier(0.32, 0, 0.12, 1) (a short lift out of the button, then a long settle); the content is
  scaled by the larger of the two ratios (cover), centred on the rectangle.
- Caution: the scene around the window must be the same in both scenes (one desk, one ground), and whatever the old
  scene has around the button (its card) lies wholly inside `win`, or a sliver of it stays beside the window until the
  last frame; otherwise open to the full frame. Lay the window's content out at its final size: it is scaled, never
  reflowed.

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

### DotIris
A dot appears at one point of the old frame (the gap between two words, a button, a sparkle) and opens into the next
scene by the same ratio every frame, so it reads as a dot, then a disc, then the frame. The next scene plays inside it at
its own scale (a window, not a zoom) and the old scene keeps moving under its edge. For a line or a button that opens onto
a lighter or darker world; carry the line by drawing it at the same place in both scenes.
```tsx
<DotIris from={darkLine} to={lightLine} at={T.open} x={gapX} y={lineY} dur={9} r0={23} />
```
- Carries: the line (drawn at the same place in both scenes) and the opening point.
- Numbers: 9 f from a 23 px dot (at a 1080 frame) to the corners; radius about x1.6 a frame (23, 46, 75, 115, 190, 294,
  473, 808 px, then cover); a 1.5 px edge. `inner` below 1 adds a settle inside; `color` a thin ring that fades.
- Caution: the point must be real (the gap from `useTextLayout`, the button's centre); `GrowIris` is the one for a button
  that opens at its own size.

### ChipBloom
A picture chip set inside a sentence grows in place, the words riding its edges, then opens to the whole frame in two
frames: its picture is the next scene. The piece sets the line itself; `from` is the ground behind it. For a sentence that
names what the next scene shows (pair it with `InlineChip`, which opens the chip in the line).
```tsx
<ChipBloom from={<Ground color={WHITE} />} to={photoScene} at={T.bloom} before="we keep the sea" after="in one place" style={type} chip={{ w: 200, h: 112, r: 26 }} />
```
- Carries: the object: the chip's own picture becomes the frame.
- Numbers: 5 f of growth to 1.75x on an ease-in (1.03, 1.12, 1.27, 1.48, 1.75), then 2 f to the full frame (log scale,
  centre to the frame's centre, radius to 0); the picture inside always covers the chip.
- Caution: the chip shows the next scene's own picture from the first frame (draw `to` still: no drift, no words until it
  has landed).

### FaceDive
The camera dives through one face of an object (a hexagon cube face by default, any polygon) whose inside already holds
the next scene. The face grows by a constant ratio a frame and drifts to the centre; the picture inside grows much less, so
the face outruns it; the rest of the old scene pushes in at a third of the rate.
```tsx
<FaceDive from={diagram} to={nextScene} at={T.dive} x={640} y={430} r={210} sides={6} rot={-90} dur={12} preview={30} />
```
- Carries: the object: its face already holds the next scene.
- Numbers: 12 f, about x1.12 a frame (0.3 to 1.15 of the width); the face's inner circle contains the corners on its last
  frame; the scene inside 0.85 to 1. `preview` draws the face still before `at` (so the old scene need not draw it).
- Caution: the face must be the subject, the one object the story goes into; for a card, a screen or a window use `DiveInto`.

### VelocityCut
A cut hidden in a velocity hand-off: the old content creeps, its speed doubles every frame, the cut lands on the fastest
frame, and the next content enters already moving the same way and brakes. Neither leaves the frame; the eye follows the
speed. For two scenes on one ground (a line to the product, one step of a flow to the next).
```tsx
<VelocityCut from={lineOnly} to={cardOnly} at={T.cut} dir="left" dur={5} travel={0.1} enter={0.08} land={6} ground={WHITE} />
```
- Carries: the motion: the next content enters at the speed the old one left.
- Numbers: steps 6, 12, 24, 48, 96 px at 1920 (0.1 of the width in all); the next content 0.08 of the width back, closing
  by 0.3 a frame (150, 45, 14 px), at rest in 6 f. `smear` adds a directional blur (0 as measured). `velocityCutEnd(at)`.
- Caution: pass both scenes without their ground and give `ground`; the move shifts content, never the world.

### FrameCollapse
The whole frame becomes a panel on a flat ground: its sides snap in, its top and bottom follow two frames later, and it
glides down to a small square while its content shrinks less, so its line stays readable; then the next scene cuts in.
For closing a chapter (the problem shot shrinks away before the answer).
```tsx
<FrameCollapse from={problemShot} to={answerScene} at={T.close} ground={BRAND} dur={31} side={0.43} />
```
- Carries: the old frame itself, as a panel, onto a colour field.
- Numbers: 31 f; width 1, 0.79, 0.64, 0.56, 0.50 ... 0.24 of the frame, height from f2 to 0.43; content to about
  `side`^0.45 (0.68); square corners.
- Caution: the ground is the film's own brand field, never a new colour; set the line short (two lines) so the collapsing
  panel never crops it.

### LensIris
Two large discs roll in from the sides, frame the old scene, and close over it while they grow (the camera pushes in), so
that shut they cover every corner; the next scene opens in a lens (the overlap of two circles) that widens sideways while
already taller than the frame, a lit rim on its edge.
```tsx
<LensIris from={worldA} to={worldB} at={T.shut} color={NIGHT} rim={SKY} dur={6} open={5} gap={0.3} />
```
- Carries: a shape (two closing discs) and their dark colour field, which is the next ground.
- Numbers: discs from 0.62 of the height in radius, rolling in over the 14 f before `at`, shut in 6 f on an ease-in; the
  lens opens in 5 f, half-width 0.07, 0.3, 0.53, 0.77, 1 of its end (solved so the last frame covers the corners); lens
  circles 1.8 of the height in radius.
- Caution: `color` must be the next scene's ground (outside the lens the frame is that colour until it covers); for a
  dark, three-dimensional world.

### TiltLift
A blur-lift into a tilted card: the old line lifts with a vertical smear (never a fade) while a large card tilted back in
perspective rises from below, blurred; the next ground floods up from the bottom edge behind it; the card is sharp in four
frames and settles flat. `to` is the card's layer (no ground), `ground` the next ground.
```tsx
<TiltLift from={statement} to={cardLayer} at={T.lift} ground={COBALT} dur={9} settle={21} tilt={28} rise={0.6} />
```
- Carries: the upward motion, and a colour field flooding in behind the card.
- Numbers: 80 % of the rise in 2 f (expo out over 9 f); vertical smear 20 px to 0 by f4; tilt 28 deg to flat over 30 f
  (quint out); the old scene lifts 0.04, 0.22, 0.5 of the height on its three frames; the flood steps up from the
  bottom (a glow, a third, a half, all) with a soft top. `tiltLiftEnd(at)`.
- Caution: the card must be most of the width; the ground a colour the film uses.

### CrossFall
A cross-over between two lines on one dark ground: the next title falls in on top of the old line, large, blurred and dim,
settling sharp; the old line stays in place, smaller and dimmer, and is gone on frame 5, while the title is still soft.
```tsx
<CrossFall from={oldLine} to={title} at={T.title} ground={NIGHT} dur={12} hold={5} scale={1.5} blur={22} side={-0.06} />
```
- Carries: the line's place: the title lands where the old line was being read.
- Numbers: new title 1.5x, 22 px blur, 30 % light to rest in 12 f (`1 - (1 - t)^2.2`: a third on its second frame),
  drifting in from 6 % to the side; old line to 0.94x and 12 % over 3 f.
- Caution: on a dark, flat ground (the dim start reads as depth there); the old line never rises or drifts.

### PixelStair
A stepped pixel wipe in large square cells. `front="skyline"`: the next scene advances as a skyline of blocks held on
twos, the cells just ahead of its edge glowing in `tints`; `front="scatter"`: loose cells run ahead of an accelerating
front, on ones.
```tsx
<PixelStair from={photoScene} to={greyField} at={T.wipe} tints={['#FFD27A', '#FFA48C', '#FFE9B8']} />
<PixelStair from={board} to={brandField} at={T.wipe} front="scatter" />
```
- Carries: a colour field: the next ground arrives as the cells.
- Numbers: skyline 26 f, cells 1/42 of the width, angle 35 deg from the top-left, half the frame by f10, a long tail;
  scatter 26 f, cells 1/64, angle 14 deg, t^3.5 (a fifth of the frame at f17), a third of the threshold random.
- Caution: tints are colours of the old picture (its lights), never a new accent; leave them out on a flat scene.

### TileFlood
Isometric diamond tiles spawn from two corners (the second a few frames later), multiply into a ragged checker and
thicken until the next scene is the frame; the objects on `front` stay on top throughout.
```tsx
<TileFlood from={lightGrid} to={darkGrid} front={<Slabs />} at={T.flood} dur={30} tiles={12} corners={['bottom-left', 'top-right']} delays={[0, 0.15]} />
```
- Carries: a held layer: the objects stay while the ground floods behind them.
- Numbers: tiles 1/12 of the width, 0.58 as tall (true isometric); each tile pops on its frame; a third of the threshold
  random, so lone tiles land well ahead; the clock eases in (t^1.6).
- Caution: keep the subject on `front`; a flood that carries nothing reads as a wipe.

### Interleave
Single-frame alternation: each frame shows one whole state, the old scene, the next scene (building itself) or a texture of
the old scene (by default its own mosaic), for about seven frames; then the next scene holds. No blend, no fade, no white
or inverted frame.
```tsx
<Interleave from={line} to={pile} at={T.hit} pattern={['alt', 'to', 'alt', 'to', 'alt', 'to', 'alt']} cell={18} />
```
- Carries: the old scene's own material (its texture frames), on the rhythm of the music.
- Numbers: 7 f; the default texture is the old scene as an 18 px mosaic (pass `alt` for a lattice or a dot version);
  a second form alternates `from` and `to` for 5 f. `interleaveEnd(at, steps)`.
- Caution: once a film, on a hit in the music; the texture frame is the old scene's own material, never a flash.

### StampHop
A flat box hops along the line one word a frame, covering each word in turn; on the frame after the last word the new line
is in place under it, and the box hops on over the new words and is gone. Every frame a whole state.
```tsx
<StampHop from={ground} to={ground} at={T.swap} text="They read it once" next="Now it stays" style={type} color="#F2F3F5" />
```
- Carries: the line's place and size: only the words change under the box.
- Numbers: 1 f a word (`hold` for more); the box is the word plus 0.08 em a side, 0.98 em tall from 0.8 em above the
  baseline. `stampHopEnd(at, words, nextWords)`.
- Caution: lines of two to five words, the hops on the music's sixteenths.

### CollapsePill
A row (a comment, a list item, a result) becomes the pill of the job it started: its content blurs away into its own
surface, the slab sinks a little and collapses, height far faster than width, to the pill's place and colour under a soft
blur; the pill sharpens and its label arrives. `from` and `to` are the scenes without the row and the pill (the piece
draws both, and keeps drawing the pill on `to`).
```tsx
<CollapsePill from={thread} to={sending} at={T.pick} a={{ x: 960, y: 540, w: 1080, h: 128, r: 30, color: '#F2F3F5' }} b={{ x: 960, y: 820, w: 460, h: 72, r: 36, color: BRAND }} row={<Row />} pill={<PillLabel />} />
```
- Carries: a shape: the row's box becomes the pill.
- Numbers: 9 f; content gone in 3 f; a 1 f sink of 10 % of the row's height; the collapse in 3 f (height on expo out,
  width on quad out); blur up to 10 px, peaking in the collapse, clear by f9; the colour blends under the blur; the
  scene behind blurs and dims away over 5 f.
- Caution: the pill must be what the row became (its job running, its result); its colour one the film already uses.

### StepTear
The paper is torn away in held steps (a corner, the opposite corner, most of it, all), each step showing more of the next
picture under a ragged, pixel-stepped edge and adding one word to the line, which stays in place and changes ink once,
on the last step.
```tsx
<StepTear from={<Ground color={WHITE} />} to={<Photo src={pic} />} at={T.tear} words={['Read', 'the', 'whole', 'tide']} style={type} ink="#B5482F" inkTo="#fff" hold={5} />
```
- Carries: the line (one word a step, in place) and the next picture under the tear.
- Numbers: 4 steps of 5 f, no tween between them; levels 0.3, 0.55, 0.8, 1 of the farthest value; corners top-right,
  bottom-left, bottom-right, 0.22 apart; the edge stepped on a grid of 1/160 of the width with a ragged noise of 0.1.
  `stepTearEnd(at)`.
- Caution: three or four short words that read on both grounds: set `y` over a calm, even part of the picture (sky, a
  wall), never over spray or busy detail; one tear in a film.

## Helpers
`PixelFilter`, `SmearFilter` (directional blur, edges duplicated) and `SplitFilter` (channel split) are the SVG filters
the turns and effects use (`src/kit/library/_shared.tsx`); put one in the tree and point a layer's `filter: url(#id)`
at it.

## In the reel

Every piece's frames in the reel (`--film library-turns`), and the one command that shows just that piece: its frames in
one still (run it in a film project; `render --film library-turns --range a-b` for the piece in motion, and `joins
--film library-turns --at <frame>` for nine consecutive frames of a turn at real size).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| DotReveal | `library-turns` | 0-179 | `node scripts/frames.mjs library --strip DotReveal` |
| BlockBurst | `library-turns` | 180-304 | `node scripts/frames.mjs library --strip BlockBurst` |
| GrowIris | `library-turns` | 305-416 | `node scripts/frames.mjs library --strip GrowIris` |
| DiveInto | `library-turns` | 417-510 | `node scripts/frames.mjs library --strip DiveInto` |
| WhipGate | `library-turns` | 511-584 | `node scripts/frames.mjs library --strip WhipGate` |
| Shove | `library-turns` | 585-660 | `node scripts/frames.mjs library --strip Shove` |
| ShapeMatch | `library-turns` | 661-740 | `node scripts/frames.mjs library --strip ShapeMatch` |
| GlitchCut | `library-turns` | 741-808 | `node scripts/frames.mjs library --strip GlitchCut` |
| WindowOpen | `library-turns` | 809-885 | `node scripts/frames.mjs library --strip WindowOpen` |
| DotIris | `library-turns` | 886-955 | `node scripts/frames.mjs library --strip DotIris` |
| ChipBloom | `library-turns` | 956-1031 | `node scripts/frames.mjs library --strip ChipBloom` |
| FaceDive | `library-turns` | 1032-1113 | `node scripts/frames.mjs library --strip FaceDive` |
| VelocityCut | `library-turns` | 1114-1185 | `node scripts/frames.mjs library --strip VelocityCut` |
| FrameCollapse | `library-turns` | 1186-1266 | `node scripts/frames.mjs library --strip FrameCollapse` |
| LensIris | `library-turns` | 1267-1341 | `node scripts/frames.mjs library --strip LensIris` |
| TiltLift | `library-turns` | 1342-1417 | `node scripts/frames.mjs library --strip TiltLift` |
| CrossFall | `library-turns` | 1418-1489 | `node scripts/frames.mjs library --strip CrossFall` |
| PixelStair | `library-turns` | 1490-1625 | `node scripts/frames.mjs library --strip PixelStair` |
| TileFlood | `library-turns` | 1626-1699 | `node scripts/frames.mjs library --strip TileFlood` |
| Interleave | `library-turns` | 1700-1767 | `node scripts/frames.mjs library --strip Interleave` |
| StampHop | `library-turns` | 1768-1829 | `node scripts/frames.mjs library --strip StampHop` |
| CollapsePill | `library-turns` | 1830-1898 | `node scripts/frames.mjs library --strip CollapsePill` |
| StepTear | `library-turns` | 1899-1968 | `node scripts/frames.mjs library --strip StepTear` |

<!-- /library:reel -->
