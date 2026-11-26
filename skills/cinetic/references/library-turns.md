# Library: turns

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
| [DotReveal](#dotreveal) | join | 34 f | the next scene arrives as a field of dots (or square cells) from an edge or an object, swelling until they merge | a picture or a full scene arriving out of a small object (a phone, an icon) or a calm screen |
| [BlockBurst](#blockburst) | join | 19 f | square cells burst out of an object in a diamond until the next scene fills the frame; from an edge, a staircase | a digital or financial product, an icon that opens into its world |
| [GrowIris](#growiris) | join | 6 f | a circle, rounded box or ellipse grows out of an object until it is the next scene, which settles from smaller inside | a button, a pill or a card that opens into what it promises |
| [DiveInto](#diveinto) | join | 20 f | the camera dives into a card, a window or a picture, exponentially, and its inside is the next scene | going into the thing on screen: a card, a window, a picture |
| [WhipGate](#whipgate) | join | 22 f | an accelerating whip, a two-frame gate inside the blur, and the next scene arriving at whip speed, its smear clearing | a fast move between two scenes on one ground tone |
| [Shove](#shove) | join, exit | 24 f | the old scene is cut into bands shoved off one after another while the next slides in underneath and lands | a statement giving way to the product |
| [ShapeMatch](#shapematch) | join | 14 f | one shape detaches and travels to where the same shape sits in the next scene, changing size, radius and colour | a match cut on shape: an icon tile, a chip or a dot that is in both scenes |
| [GlitchCut](#glitchcut) | join | 8 f | a few frames where the picture breaks and the next scene flickers through, one broken state a frame, cut hard | a hit in the music, once |
| [WindowOpen](#windowopen) | join | 14 f | a window opens out of the button that was pressed, the next scene's window drawn whole inside the growing rectangle | a press that opens a window or panel: the commonest hand-built join, take this one |

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

<!-- /library:reel -->
