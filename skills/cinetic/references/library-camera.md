# Library: camera moves

**What it is for:** moving the lens: in, back, along, or into a place. Reach first for `PullReveal` (where a thing
lives), `RackFocus` (the next thing to read), `RowTrack` (a row as one object), `PullTilt` (a surface as an object) and
`FloorTilt` (a statement becoming a place). Not here: the dive into an object (`DiveInto` is a
[turn](library-turns.md)), a giant line trucked along (`GiantTruck` in [type](library-type.md)), a section seen through
a lens (`LensBulge` in [fx](library-fx.md)). Near neighbours elsewhere: `CaretCam` beside `CaretFollow` (type),
`FloorTilt` beside `IsoFloor` (ground), `DepthField` beside `CardDrift` and `OrbitRing` (object), `PlanetPull` beside
`PlanetRim` (ground), `RackFocus` beside `BackdropFocus` (fx); see
[library.md](library.md#near-neighbours-across-categories).

Camera moves as finished pieces: a push, a pan, a dive, parallax between layers, a focus pull. Each wraps the scene it
moves and takes `at`, `dur` or `speed` and its distances as props; it reads the frame size from `useVideoConfig()`. Each
piece lives in `src/kit/library/camera/` (one file a piece, named after it), with its catalogue entry in
`src/kit/library/catalog/camera.ts` (`category: 'camera'`) and one segment in the `library-camera` reel
(`src/films/library/ReelCamera.tsx`); `frames.mjs library --category camera` lists them. Add one by the checklist in
[library.md](library.md#how-to-add-a-piece); the two tables below are written from the catalogue.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [CaretCam](#caretcam) | enter, emphasis | 80 f | a prompt types in a small bar, the view cuts into the bar so the words type huge and the camera follows the caret, jumping on at each word, then snaps back | the one prompt of a film that should be read word by word: the request the product answers |
| [PullReveal](#pullreveal) | enter, join | 4 f | from a close view of one thing the camera pulls back hard to the whole of it, blurred on the one fast frame, then drifts on back | showing where a thing lives: a card in its feed, a message in its thread, a window on its desk |
| [DepthField](#depthfield) | enter, exit, idle | 20 f | a field of chips at different depths: they arrive large from outside and shrink into place at their own speeds, drift apart, and fly out past the edges on a push | the many things a product connects (teams, tools, sources) gathering round one centre, and leaving it |
| [FloorTilt](#floortilt) | build, join | 13 f | the flat ground a line sits on tilts away into a floor seen from above and turned, so the line lies on it and the next things land on it | turning a statement into a place: the floor the next objects stand on |
| [PullTilt](#pulltilt) | enter, idle | 11 f | from close on the corner of a card the camera pulls back and swings round it, so the card turns away in perspective and its footer shows, then keeps drifting | introducing a product surface as an object: a composer, a window, a dialog |
| [RackFocus](#rackfocus) | enter, emphasis | 8 f | the lens finds its subject: the shot arrives soft and snaps sharp under a slow push, or the picture softens for a moment and refocuses | the arrival of a screen or picture the viewer must read next; a change of state |
| [ExposureRamp](#exposureramp) | join | 32 f | without a cut the whole world brightens together from graphite to soft white while the camera keeps moving; lit things keep their colour | going from the dark part of a world to the light part of the same world (a night set becoming the day set) |
| [TiltScroll](#tiltscroll) | idle, exit | 60 f | a long page turned a little in 3D on a dark ground scrolls up steadily like a poster passing the lens, then rushes into the cut with a vertical smear | showing a whole site or document the product made, in passing |
| [RowTrack](#rowtrack) | idle, build | 100 f | the camera tracks sideways along a row of slots, cards or years at a constant height, slowing steadily, each one taking its turn at the centre | a row of things that belong together (a tray, a timeline, a shelf) shown as one long object instead of cuts |
| [PlanetPull](#planetpull) | join, exit | 18 f | a dark grid floor pulls back into the top of a gridded planet: the corners open onto a strong sky and the lit rim sinks to a low horizon | from a close, abstract floor to a big world; a horizon for a card or a line to rise over |
| [FractalPull](#fractalpull) | build, exit | 46 f | a small grid of cells scanned row by row replicates outward, a plus first, then a field, while the camera pulls back to a fine flickering field | one process becoming many: scale, parallel work, a fleet |

<!-- /library:pieces -->

## The moves

A camera piece wraps the scene it moves (lay the scene out at its final framing, full frame) and reads the frame size
from `useVideoConfig()`. Inside one, place things with plain absolute layout or the kit's `<At>`; a piece built on the
kit's `<Camera>` (PullTilt) takes the same world. Do not wrap one camera piece in another or in a `<Camera>` with its
own keys: one camera a shot. For a plain push, pan or orbit with no measured shape, the kit's `<Camera keys>` and
`drift()` are the tool; these pieces are the moves with a shape of their own.

### CaretCam
A prompt types into a small bar over the scene; the view cuts into the bar so the same words type huge while the camera
follows the caret (it holds through a word and catches the caret at each word start), then snaps back through one frame
at about 2.2x to the wide view, where the typing finishes.
```tsx
<CaretCam text="Draft a launch plan for the spring range" at={T.type} inAt={T.type + 20} color="rgba(255,255,255,0.58)" ink="#141519" accent="#2F5BFF"><Scene /></CaretCam>
```
- Numbers: a character every 1-3 f (2 on average, seeded); the cut in about 20 f after the first character; macro text
  30 % of the frame height; each catch 3 f (65 %, 90 %, 100 %) to 40 % of the width; the way out one frame at 2.2x.
- Caution: one a film, 25-60 characters of plain words. For a prompt typed giant on its own (no bar), use `CaretFollow`
  in the type library.

### PullReveal
From a close view of one thing the camera pulls back hard to the whole of it: a slow first frame, nearly all of the move
in the next, blurred on that frame, then a slow drift on back.
```tsx
<PullReveal at={T.pull} from={2.5} fx={960} fy={500}><Feed /></PullReveal>
```
- Numbers: 2.4-2.5x to 1x in 4 f, the progress 10 %, 92 %, 97 %, 100 %; blur up to 14 px on the fast frame; then 3 %
  further back over 60 f; a 2 % creep in before the pull.
- Caution: the close view must already be legible: lay the scene out at its final size and start close on it.
- Choosing `from`: the default 2.4 frames a card about 40 % of the frame's width with its neighbours' edges outside.
  For one card alone in the close view, `from` = the frame's width / the card's width, a little more to push its rounded
  corners out: a card a quarter of a 1920 frame wide needs 4 (at 2.4 the neighbours' text is cut on both sides); a
  270 x 480 pin card in a 1080 x 1920 frame, 4.6. Check the first frame of the pull: nothing cut but the card's edges.

### DepthField
Things at different depths (chips, labels, cards) that the camera moves through: they arrive large from outside the
frame and shrink into place at their own speeds, drift apart while held, and fly out past the edges on a push; the
centre stays.
```tsx
<DepthField at={T.gather} dur={20} pushAt={T.leave} pushDur={13} items={[{ x: 0.5, y: 0.5, depth: 1, fixed: true, node: <Hub /> }, { x: 0.25, y: 0.2, depth: 1.6, node: <Chip label="Sales" /> }]} />
```
- Numbers: `x`, `y` shares of the frame at rest; `depth` 1 the focal plane (0.8-2.6 for a field); arrival 20 f on an
  expo-out from 0.85 of the way to the lens; push 12-14 f on an ease-in through the farthest layer; things nearer than
  the focal plane blur.
- Caution: 5-12 things at three or more depths, never on a grid; the subject sits at the centre, `fixed`.

### FloorTilt
The flat ground a line is set on tilts away into a floor seen from above and turned, so the line lies on it and the next
things land on it; `from` and `to` reversed flatten a floor back to a page.
```tsx
<FloorTilt at={T.tilt} dur={13} ground="#E6E1D6" grid={180} ink="rgba(30,24,10,0.35)" to={{ tilt: 54, turn: -24, zoom: 0.9, y: 70 }}>{line}</FloorTilt>
```
- Numbers: 12-14 f on a slow-start in-out (the first 5 f barely move); to 50-58 deg of tilt and -20 to -28 deg of turn;
  a perspective of 1.1x the frame width.
- Caution: the plane must carry a grid or a block so the tilt reads; land things after the tilt. For an orthographic
  isometric floor that carries objects, use `IsoFloor` in the grounds library.

### PullTilt
The camera starts close on the corner of a card and pulls back while swinging round it, so the card turns away in
perspective and its footer comes into view; it keeps drifting back and turning.
```tsx
<PullTilt at={T.card} dur={11} from={2.2} fx={640} fy={420}><Composer /></PullTilt>
```
- Numbers: 2.2x to 1x in 11 f on an in-out, blurred on the fast frames (up to 6 px); to -24 deg of turn, 12 of tilt, -3
  of roll; then 4 % further back and 5 deg more turn over 60 f.
- Caution: the card must be finished at the close view; give it a real shadow and a ground with some light.

### RackFocus
The lens finds its subject: the shot arrives soft and snaps sharp under a slow push (`mode="snap"`), or the picture
softens for a moment and refocuses as the scene changes state (`mode="breath"`).
```tsx
<Monitor><RackFocus at={T.screen} hold={6} snap={1} blur={11} push={0.02}><Chart /></RackFocus></Monitor>
```
- Numbers: snap: soft 10-12 px for 6 f, sharp on the next frame, a 2-3 % push over 60 f; wrap only what the lens misses (a screen's contents inside its sharp frame); breath: to 8 px and back in 6 f.
- Caution: keep the soft part short; one per scene.

### ExposureRamp
Without a cut the whole world brightens together from graphite to soft white while the camera keeps moving; the lit
things (screens, icons, pictures) keep their colour and the surfaces round them change. The scene draws its surfaces
from the exposure it is given.
```tsx
<ExposureRamp at={T.day} dur={32}>{(e) => <Camera keys={dockPan}><Dock slab={e.surface} shadow={e.shadow} /></Camera>}</ExposureRamp>
```
- Numbers: 30-34 f on an in-out; `e.ground` the void, `e.surface` the slabs, `e.line` hairlines, `e.shadow` 0.5 to 0.18.
- Caution: ride a camera move; a still frame brightening reads as a fade. The surfaces change, never the subject.

### TiltScroll
A long page, turned a little in 3D on a dark ground, scrolls up steadily like a poster passing the lens; from `rushAt`
its speed doubles every few frames into the cut, smeared vertically.
```tsx
<TiltScroll at={T.page} speed={8} rushAt={T.page + 66} tilt={8} turn={-6} ground="#0B0F18"><Page /></TiltScroll>
```
- Numbers: the page 70 % of the frame wide; 6-9 px a frame at 1080, rising over 12 f; the rush doubles every 4.5 f,
  smearing up to 18 px.
- Caution: the page must be worth reading in passing; cut on the rush's fastest frame, never let it stop.

### RowTrack
The camera tracks sideways along a row of things (slots in a tray, cards, circles, years on a timeline) at a constant
height, slowing steadily, so each one takes its turn at the centre and the row reads as one long object.
```tsx
<RowTrack at={T.tray} dur={110} from={0.2} to={3.2} ground="#E9E9EC" items={slots} />
```
- Numbers: about 6-8 px a frame at 1080 to start, slowing on an ease-out of power 1.6 over 90-110 f; items 34 % of the
  width, gaps 5 %; a horizontal smear of up to 4 px while it is fast.
- Caution: end on a slow crawl, never a dead stop and never a reverse; each item must be worth a look.

### PlanetPull
A dark grid floor that filled the frame pulls back into the top of a gridded planet: the corners open onto a sky, the
lines bend into meridians and parallels, and the lit rim sinks to a low horizon a card can rise over (`children` draw over
the sky, behind the planet).
```tsx
<PlanetPull at={T.world} dur={18} sky="linear-gradient(100deg, #E2403B, #F3713F 55%, #FFD2A6)" rim="#FFC48E"><Card /></PlanetPull>
```
- Numbers: 18 f on a quadratic ease-out (the corners open in 3 f); the rim from above the frame to 37 % of the height
  (`horizon`); the radius from 7x the
  height to 1.05x the width; grid every 4 deg; a lit rim 0.6 % of the height.
- Caution: the sky must be strong and saturated (it is the reveal); the grid stays faint on the dark body.

### FractalPull
A small grid of cells, a strong row stepping through it, replicates outward (a plus of grids first, then a field) while
the camera pulls back without stopping, until the frame is a fine field flickering row by row.
```tsx
<FractalPull at={T.scale} dur={46} color="#E8492B" ground="#FFFFFF" />
```
- Numbers: units of 4 x 4 cells; neighbours appear by their distance from the centre (3 f for the plus, then faster);
  the pull to 1/5 over 46 f on an in-out; each unit's row steps every 3 f with its own phase.
- Caution: one colour on a light ground; cut away once the field is fine, never hold it.

## In the reel

Every piece's frames in the reel (`--film library-camera`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-camera --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| CaretCam | `library-camera` | 0-119 | `node scripts/frames.mjs library --strip CaretCam` |
| PullReveal | `library-camera` | 120-189 | `node scripts/frames.mjs library --strip PullReveal` |
| DepthField | `library-camera` | 190-279 | `node scripts/frames.mjs library --strip DepthField` |
| FloorTilt | `library-camera` | 280-339 | `node scripts/frames.mjs library --strip FloorTilt` |
| PullTilt | `library-camera` | 340-419 | `node scripts/frames.mjs library --strip PullTilt` |
| RackFocus | `library-camera` | 420-469 | `node scripts/frames.mjs library --strip RackFocus` |
| ExposureRamp | `library-camera` | 470-549 | `node scripts/frames.mjs library --strip ExposureRamp` |
| TiltScroll | `library-camera` | 550-633 | `node scripts/frames.mjs library --strip TiltScroll` |
| RowTrack | `library-camera` | 634-743 | `node scripts/frames.mjs library --strip RowTrack` |
| PlanetPull | `library-camera` | 744-803 | `node scripts/frames.mjs library --strip PlanetPull` |
| FractalPull | `library-camera` | 804-873 | `node scripts/frames.mjs library --strip FractalPull` |

<!-- /library:reel -->
