# Library: finishing effects

**What it is for:** a layer that finishes a frame already right: light, an impact, a screen material, an analytic mark.
Reach first for `LightSweep` (a surface catching light), `ChromaHit` (a landing), `GlyphSheen` (a payoff word),
`ShimmerText` (the product working) and `BackdropFocus` (an arrival over its screen). Not here: joins (`MorphBox` is the
one effect that also joins; the rest are [turns](library-turns.md)), camera moves ([camera](library-camera.md)), grounds
([grounds](library-grounds.md); `GlowBars` is the one effect that serves as a ground). Near neighbours elsewhere:
`TrackOverlay` beside `TrackedType` (type), `DotScreen` beside `DotWord` (type) and `DotLattice` (ground), `MorphBox`
beside `CollapsePill` (turn) and `ActionMorph` (ui), `StepScan` beside `CellStack` (object), `CornerHunt` beside
`CornerLine` (type) and `SelectFrame` (ui), `BackdropFocus` beside `RackFocus` (camera), `GlowBars` beside `PlanetRim`
(ground); see [library.md](library.md#near-neighbours-across-categories).

The finishing layers that make a frame rich: light crossing a surface, a bloom on a light source, tracking marks over a
moving object, a dot screen, a channel split on a landing, and one rounded shape that becomes the next. Import them from
the kit (`import { LightSweep, Bloom, MorphBox } from '../../kit';`). The reel `library-fx` shows every piece with its
name; `frames.mjs library --category fx` lists them.

An effect finishes something that is already right; it never carries a scene on its own. Once per surface, on the
moment that matters, and never as a way to hide a cut: a flash of light, a screen shake or a strobe are never effects.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [LightSweep](#lightsweep) | emphasis | 12 f | a band of light crosses a surface once, a soft glow with a thin hot line at its leading edge, clipped to the box | a card, a button or a glass panel at the moment it matters |
| [Bloom](#bloom) | emphasis, idle | 17 f | light that spills in its own colour: a blurred copy added on top, swelling once on a hit | a bright thing on a dark ground that should glow, or pulse once |
| [TrackOverlay](#trackoverlay) | idle, emphasis | 60 f | motion tracking over a moving object: turning boxes, centre dots, live coordinates and dashed arcs between targets | an analytic, technical layer over something that moves |
| [DotScreen](#dotscreen) | idle, join | 30 f | the content seen through a grid of round dots, an LED board or a coarse halftone; animate the dot size to turn | a big word or a picture as an LED board; a turn between two through the same grid |
| [ChromaHit](#chromahit) | emphasis | 2 f | on an impact the colour channels split for two frames and snap back | a landing the viewer sees: wrap the thing that lands |
| [MorphBox](#morphbox) | build, join | 14 f | one rounded shape becomes the next (a pill, a card, a window), each stage's content wiping in behind a soft edge | carries the object: one surface that changes shape keeps the eye; for thinking becoming an answer, a pill becoming a card becoming a window |
| [GradeResolve](#graderesolve) | build, emphasis | 9 f | pictures switch to a gradient map (warm, cool, thermal, two-tone) or back to natural colour, cell by cell in a scattered order, each cell a cut | the product reading pictures: analysing, segmenting, sorting a library; or footage resolving to its true colour |
| [Stepped](#stepped) | idle, build | 60 f | a treatment for any move: drawn on twos or held 3-5 frames a step like stop-motion, each step a hair off, with grain moving every frame | a collage or drawn scene that should read handmade; cut-outs that land and wobble |
| [ShimmerText](#shimmertext) | loop | 30 f | a small status line with a lighter or darker band crossing it on a loop; the words swap by cut between passes | the product working: reading, thinking, building, while the viewer waits |
| [GlyphSheen](#glyphsheen) | emphasis | 26 f | light passing through letters: a soft bright band clipped to the glyphs crosses a huge word once, a fainter highlight a letter behind | the payoff word or name set huge, the moment it is complete |
| [PenMarks](#penmarks) | emphasis | 7 f | a pen over the frame: a hand loop round a point, a ring, a curved arrow with its head, a zigzag, a tick, drawn on twos as glowing light or a dry marker, retracting in order | pointing at the one thing in the frame the line is about |
| [LensBulge](#lensbulge) | idle, enter | 14 f | the whole scene through one barrel lens: the centre swelled, the edges bent and darker, a hair of colour fringe, optionally the pixel grid of a filmed screen | a section whose shots should read as one screen being filmed (a fisheye over devices, a monitor finish) |
| [GlowBars](#glowbars) | enter, idle | 34 f | a strong coloured glow rises from a corner of a dark ground seen through reeded glass: narrow soft columns that lean slowly while the glow drifts | the ground for one held thing (a dialog, a field, a wordmark) on dark |
| [BlobKnock](#blobknock) | emphasis | 10 f | a heavily blurred blob in the colour of the line slides in under a bold line and settles; the letters over its dense part turn white | the line that names the change, set bold and large on a light ground |
| [CornerHunt](#cornerhunt) | idle | 45 f | a viewfinder hunting round a phrase: tiny squares at the corners of an invisible box, 1-4 lit each frame, the box jumping between three sizes, never tweened | a phrase about finding, framing or selecting, while it holds |
| [StepScan](#stepscan) | loop | 16 f | a small grid of square cells with one strong row stepping down it by cuts, the row it left at a mid tint, the rest pale; an all-pale beat, then it restarts | a machine reading line by line, beside the line that says what it reads |
| [FrostEdge](#frostedge) | idle, exit | 40 f | a frosted band at the top of a scrolling column: what slides into it goes soft and pale, as if under frosted glass; or a whole surface clearing from frosted | a chat or a feed scrolling away under its header without a hard cut-off edge |
| [DriftField](#driftfield) | build, idle | 70 f | small glowing dots pop on one by one at seeded spots and drift into a loose cloud; or short hairline dashes that blink on, live a few frames and slide | a quiet beat on a night ground; the many small signals a product gathers |
| [RingBurst](#ringburst) | emphasis | 16 f | on a press a ring of halftone dots grows out of the button and thins as it goes, the dots largest on its crest; no flash | the one press that starts something (record, send, run) |
| [BackdropFocus](#backdropfocus) | emphasis | 10 f | when a toast or dialog arrives the scene behind grows a little, softens and dims, the arrival sharp on top; it comes back into focus as the arrival leaves | a confirmation, a result or a notice over the screen it is about |
| [SliceShift](#sliceshift) | emphasis, exit | 40 f | white hairlines slide in from the top and bottom in mirrored pairs and cut a picture into bands that slip down by their own amounts | a photograph with one clear subject that should break or sink |

<!-- /library:pieces -->

## The effects

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

### GradeResolve
Pictures switch between natural colour and a gradient map (a warm duotone, a cool one, a thermal palette, a two-tone),
cell by cell in a scattered order, each cell by a cut: the product reading, sorting or segmenting a library; or footage
resolving to its true colour region by region.
```tsx
<GradeResolve at={T.read} dur={9} to="grade" palette={GRADES.warm} cols={6} rows={3} w={1500} h={600}>{tileGrid}</GradeResolve>
```
- Numbers: the switch spreads over 8-12 f; each cell changes on one frame, never a fade; lay a tile grid out on the same
  `cols` x `rows` so each tile changes whole; `cells` takes explicit regions with their own frames (a room: the desk
  first, the window last); `to="natural"` runs it the other way.
- Caution: give it a reason the viewer sees (the product analysing); a whole frame turning a colour without one is a
  sudden colour change.

### Stepped
A treatment that wraps any move: its children advance on a stepped clock (on twos for drawn graphics, held 3-5 f a step
for stop-motion collage), each step may sit a hair off its place, while grain moves every frame.
```tsx
<Stepped n={3} jitter={2} turn={0.8} grain={0.05}>{collage}</Stepped>
```
- Numbers: `n` 2 drawn, 3-5 stop-motion; jitter 0-3 px and 0-1.2 deg a step; the kit's `Grain` at 0.04-0.06 (on a light
  ground pass `force`).
- Caution: step the drawing, never the camera, typing or a counting number: two clocks read handmade, one stepped clock
  for everything reads as a low frame rate.

### ShimmerText
A small working status ("reading", "building") with a lighter or darker band crossing it on a loop while the words hold;
`swaps` change the words by cut between passes.
```tsx
<ShimmerText text="Reading the analytics" at={T.work} period={30} pass={18} color="#9BA0A8" light="#16181C" size={38} swaps={[{ at: T.work + 60, text: 'Checking load times' }]} />
```
- Numbers: the band 35 % of the line, crossing in 18 f, one pass every 30 f; base and band about 35 % apart in lightness
  (grey with a near-black band on white, a mid tone with a white band on dark).
- Caution: UI size only, one status at a time; swap the words between passes, never mid-pass.

### GlyphSheen
Light passing through letters: a soft bright band, clipped to the glyphs, crosses a huge word once, the letter under it
lifting nearly to white, a fainter highlight a letter behind.
```tsx
<GlyphSheen text="Tidal" at={T.name} dur={26} size={560} fill="linear-gradient(180deg, #0F3440, #2C7F8F 70%, #8FD3DA)" />
```
- Numbers: 24-28 f for a four- or five-letter word (about 6 f a letter), close to linear; the band 22 % of the word, the
  echo at 40 % strength 12 % behind; `fill` a colour or a gradient that stays the word's own fill.
- Caution: once, on the payoff word set large; on small type it reads as a flicker.

### PenMarks
A narrator's pen over the frame: a hand loop round a point, a ring, a curved arrow with its head, a zigzag growth line, a
tick; each draws in a few frames on twos, holds, and retracts from its tail. `look="light"` glows (a white core in a
coloured halo) for dark grounds; `look="marker"` is a flat dry stroke.
```tsx
<PenMarks look="light" color="#5E9BFF" marks={[{ kind: 'loop', x: 960, y: 470, r: 62, at: 10, out: 66 }, { kind: 'arrow', x: 1040, y: 500, tx: 1330, ty: 440, bend: -0.35, at: 30, out: 70 }]} />
```
- Numbers: loop 4-6 f (1.1 turns, the radius wandering 8 %), arrow 6-8 f with its head on the last fifth, zigzag 10-14 f,
  tick 2-4 f; strokes 0.5 % of the frame height; retract in 6 f.
- Caution: one or two marks at a time and let the words carry the meaning; three at once is a doodle.

### LensBulge
The whole scene through one barrel lens: the centre swelled, straight lines bending near the edges, the edges darker, a
hair of colour fringe at the rim, optionally the fine pixel grid of a filmed screen. Different materials under it read
as one screen.
```tsx
<LensBulge amount={0.16} at={T.open} from={0.2} dur={14} chroma={2.5} vignette={0.36} grid={4}>{scene}</LensBulge>
```
- Numbers: `amount` 0.12-0.2 (the centre near 1x, the edges bowed in 8-14 %, the corners dark); on an entrance from
  1.5x the amount, relaxing in 10-14 f; fringe 1-3 px; vignette 25-40 %; grid 3-4 px at 8 %.
- Caution: the amount is capped at 0.2 (`LENS_MAX`): the 8-bit displacement map would shift in visible steps above it.
  One lens for a whole section, never on and off between shots; keep type out of the outer fifth.

### GlowBars
A strong coloured glow rises from a corner of a dark ground, seen through reeded glass: narrow soft columns that lean
slowly from upright toward the diagonal while the glow drifts. A ground for one held thing.
```tsx
<GlowBars at={T.export} dur={34} color="#FF9A3C" rim="#D23A2A" ground="#0A0A0C"><ExportDialog /></GlowBars>
```
- Numbers: reeds 4.5 % of the frame width apart (22 across); the rise 30-40 f on an expo-out; the lean 0 to 28 deg over 3-4 s;
  two hues, a hot core and a deeper rim; `ground` a #rrggbb colour.
- Caution: strong and saturated, never faint (a pale gradient behind a frame is slop); behind one held thing, never
  busy UI.

### BlobKnock
A heavily blurred blob in the line's own colour slides in under a bold line and settles; where it is dense the letters
turn white, so the words read through the colour.
```tsx
<BlobKnock text="From draft to shipped" at={T.line} dur={10} from={0.84} to={0.56} color="#2747D9" size={96} />
```
- Numbers: two lobes, 30 % of the frame wide and 24 % high in all, centred a little under the line, blurred 3 % of the height; 30 % of the width in 10 f
  on an expo-out, then 1 px a frame of drift.
- Caution: one bold line, 6 % of the frame height or more; the blob is the line's colour, never a second hue.

### CornerHunt
A viewfinder hunting round a phrase: tiny squares at the corners of an invisible box, 1-4 of them lit each frame, the box
jumping between three sizes, never tweened; it settles on all four corners when the phrase is done.
```tsx
<CornerHunt at={T.find} until={T.find + 46} w={520} h={70} color="#141519" />
```
- Numbers: squares 2.2 % of the frame height; a new state every 2 f; three boxes round a phrase about 18 % of the frame
  wide: tight (1.4x its width, 3.8x its height), wide (4.1x by 5.1x) and middle (2.6x by 5.1x).
- Caution: one phrase while it holds; never round running text.

### StepScan
A small grid of square cells with one strong row stepping down it by cuts: the row it left drops to a mid tint, the rest
stay pale; after the last row the whole grid goes pale for a beat and the scan restarts at the top. A machine reading.
```tsx
<StepScan at={T.read} cols={4} rows={4} color="#E8492B" />
```
- Numbers: 4 x 4 cells, each 4.5 % of the frame height with gaps of 0.75 a cell; holds 6, 4, 1, 4 f a row and 1 f all
  pale (uneven on purpose); tints 100 %, 45 % for the row just left, 18 % pale; `axis="col"` scans columns.
- Caution: small and once, beside the line that says what is read; never full screen.

### FrostEdge
A frosted band at the top (or bottom) of a scrolling column: what slides into it goes soft and pale, as if passing under
frosted glass, so a chat or a feed scrolls away under its header without a hard edge. `clearAt` makes the whole surface
start frosted and clear.
```tsx
<FrostEdge w={900} h={710} band={170}><Messages style={{ transform: `translateY(${-scroll}px)` }} /></FrostEdge>
```
- Numbers: the band 18-24 % of the column; blur up to 10 px toward the edge while the content fades out across it; a
  clearing surface from 14 px and a 60 % white veil to clear in 14-18 f.
- Caution: the band must sit under something (a header, an avatar, the frame edge); in open space it reads as a smudge.

### DriftField
Small particles pop on one by one at seeded spots, glow and drift slowly into a loose cloud on a dark ground; or, with
`shape="dash"`, short hairline dashes that blink on, live a few frames and slide.
```tsx
<DriftField at={T.night} count={28} rate={2.5} area={[0.18, 0.18, 0.66, 0.52]} avoid={[0.3, 0.62, 0.4, 0.12]} color="#4A6BFF" />
```
- Numbers: a new dot every 2-3 f; dots 0.45-1.2 % of the frame height, popping past 1.15x to 1x in 4 f; drift 0.2-0.6 px
  a frame; dashes 2-4 % of the width, 1 px, living 4-8 f.
- Caution: a texture for a quiet beat; keep it out of the type box (`avoid`), never confetti on a hit.

### RingBurst
On a press, a ring of halftone dots grows out of the button and thins as it goes: the dots are largest on its crest and
shrink to nothing either side. The scene may dim a little for the press (`dim`); there is never a flash.
```tsx
<RingBurst at={T.press} dur={16} x={960} y={540} from={70} to={420} color="#F07A2E" dim={0.12} />
```
- Numbers: 16 f on an expo-out to 30-40 % of the frame height; the band 18 % of the height wide at the start, 6 % at the
  end; dots on a 1.5 % pitch; `dim` 0-0.35, in over 6 f and back over 10 f.
- Caution: once, on the press that starts something; the button dips too.

### BackdropFocus
When a toast, a dialog or a result arrives, the scene behind it grows a little, softens and dims, so the arrival sits sharp
on top; from `outAt` the arrival goes and the scene sharpens again.
```tsx
<BackdropFocus at={T.done} outAt={T.done + 46} front={<Toast />}><PricingView /></BackdropFocus>
```
- Numbers: 10 f on an ease-out: the scene to 1.03x, 8 px of blur, 30 % dim; the arrival from 0.94x, 2 f later, over 8 f;
  the way back 8 f.
- Caution: one arrival at a time; keep the scene recognisable through the blur.

### SliceShift
White hairlines slide in from the top and the bottom in mirrored pairs and cut a picture into horizontal bands; each band
then slips down by its own amount, so the subject is sliced and sinks.
```tsx
<SliceShift at={T.break} pairs={3} dur={30} sink={0.09}><Photo src={portrait} /></SliceShift>
```
- Numbers: 3 pairs, each line sliding in over 8 f, 4 f apart; bands slip up to 9 % of the height over 30 f, the middle
  ones most; lines 1 px at 1080, white at 85 %.
- Caution: photographs and footage only; on UI or type it reads as a rendering fault.

## Helpers
The effects use the library's SVG filters (`PixelFilter`, `SmearFilter`, `SplitFilter`, in
`src/kit/library/_shared.tsx`; see [library-turns.md](library-turns.md#helpers)).

## In the reel

Every piece's frames in the reel (`--film library-fx`), and the one command that shows just that piece: its frames in
one still (run it in a film project; `render --film library-fx --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| LightSweep | `library-fx` | 0-65 | `node scripts/frames.mjs library --strip LightSweep` |
| Bloom | `library-fx` | 66-129 | `node scripts/frames.mjs library --strip Bloom` |
| TrackOverlay | `library-fx` | 130-209 | `node scripts/frames.mjs library --strip TrackOverlay` |
| DotScreen | `library-fx` | 210-293 | `node scripts/frames.mjs library --strip DotScreen` |
| ChromaHit | `library-fx` | 294-365 | `node scripts/frames.mjs library --strip ChromaHit` |
| MorphBox | `library-fx` | 366-465 | `node scripts/frames.mjs library --strip MorphBox` |
| GradeResolve | `library-fx` | 466-525 | `node scripts/frames.mjs library --strip GradeResolve` |
| Stepped | `library-fx` | 526-585 | `node scripts/frames.mjs library --strip Stepped` |
| ShimmerText | `library-fx` | 586-685 | `node scripts/frames.mjs library --strip ShimmerText` |
| GlyphSheen | `library-fx` | 686-735 | `node scripts/frames.mjs library --strip GlyphSheen` |
| PenMarks | `library-fx` | 736-819 | `node scripts/frames.mjs library --strip PenMarks` |
| LensBulge | `library-fx` | 820-869 | `node scripts/frames.mjs library --strip LensBulge` |
| GlowBars | `library-fx` | 870-959 | `node scripts/frames.mjs library --strip GlowBars` |
| BlobKnock | `library-fx` | 960-1009 | `node scripts/frames.mjs library --strip BlobKnock` |
| CornerHunt | `library-fx` | 1010-1075 | `node scripts/frames.mjs library --strip CornerHunt` |
| StepScan | `library-fx` | 1076-1135 | `node scripts/frames.mjs library --strip StepScan` |
| FrostEdge | `library-fx` | 1136-1199 | `node scripts/frames.mjs library --strip FrostEdge` |
| DriftField | `library-fx` | 1200-1289 | `node scripts/frames.mjs library --strip DriftField` |
| RingBurst | `library-fx` | 1290-1339 | `node scripts/frames.mjs library --strip RingBurst` |
| BackdropFocus | `library-fx` | 1340-1419 | `node scripts/frames.mjs library --strip BackdropFocus` |
| SliceShift | `library-fx` | 1420-1479 | `node scripts/frames.mjs library --strip SliceShift` |

<!-- /library:reel -->
