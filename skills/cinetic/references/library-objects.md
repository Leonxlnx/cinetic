# Library: objects and logos

**What it is for:** things and marks: pictures in numbers, solids, shapes that build, things held round a centre, the
lockup. Reach first for `LockupType` (the default end card), `TilePop` (many pictures at once), `MarkCondense` (a mark
arriving the way a design tool builds it), `OrbitRing` (the apps round one product) and `DotRing` (a connection made).
Not here: words performed as type ([type](library-type.md)), interface ([ui](library-ui.md)), grounds
([grounds](library-grounds.md)). Several pieces here were checked at half size or compared once only; their cautions say
so. Near neighbours elsewhere: `PlateSqueeze` beside `FrameCollapse` (turn), `PixelIris` beside `GrowIris` and `DotIris`
(turn), `SlotSwap` beside `InlineChip` (type), `DealtStack` beside `PartStack` (type), `CardDrift` and `OrbitRing`
beside `DepthField` (camera), `CellStack` beside `StepScan` (fx); see
[library.md](library.md#near-neighbours-across-categories) and [the lockup](library.md#the-lockup).

Shapes, icons, pictures and logos that move or are built: a mark drawn stroke by stroke, an icon that assembles, a
picture that is cut, folded or stacked, a device built from its parts. A company's mark is always its real one
(`<Brand>`); a piece moves it, never redraws it. Each piece lives in `src/kit/library/objects/` (one file a piece, named
after it), with its catalogue entry in `src/kit/library/catalog/object.ts` (`category: 'object'`) and one segment in the
`library-objects` reel (`src/films/library/ReelObjects.tsx`); `frames.mjs library --category object` lists them. Add one
by the checklist in [library.md](library.md#how-to-add-a-piece); the two tables below are written from the catalogue.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [TilePop](#tilepop) | enter, build | 48 f | photo tiles pop on one a frame, scattered, then gather into a rising ribbon; each is born two-tone and cuts to true colour | many pictures at once: a community, a catalogue, the people a product serves, at the opening of a film |
| [DealtStack](#dealtstack) | build, emphasis | 25 f | photo cards dealt one on another in the gap of a line, each breaking through in square blocks, the stack fanning up and pushing the words apart | a line about variety or volume (every idea, all your moments) where the pictures are the proof |
| [BlobMerge](#blobmerge) | build | 32 f | two round blobs drift together, merge with a liquid neck, split smaller, merge into a pill and shrink to a dot that snaps into the mark | the opening of a lockup for a brand whose mark is round or soft; two things becoming one |
| [LockupType](#lockuptype) | build | 26 f | the mark holds, then slides left as the name appears beside it a letter about every frame and a half, the lockup re-centring with each letter | the lockup after a mark has been built or carried in; the default end card |
| [CubeSplit](#cubesplit) | build | 58 f | an isometric cube splits into four, the four swing into a ring of eight blocks, and the ring tips over and lands flat as a pixel mark | a mark made of square cells; a product about building blocks, data or infrastructure |
| [SquareTunnel](#squaretunnel) | build, join | 43 f | a square opens into a ring and new squares are born in its hole, every ring growing outward at one speed, until the last grows solid over the frame | out of a square already on screen (a tile, a cell, a button) into the ground of the next scene: depth, speed, going through |
| [PixelMark](#pixelmark) | build, enter | 14 f | a mark of square cells assembles by trial, partial sets blinking on and off, then holds as hairline guides run out along its cell edges | the opening or closing mark of a technical product whose mark is drawn in cells |
| [TumbleLockup](#tumblelockup) | build | 16 f | the app tile grows from a dot with a tilt and overshoot, its glyph popping in, while the letters of the name tumble in two frames apart, small, slanted and tinted, rising into place in ink | the lockup of a consumer app with a coloured tile; a quick, bright ending |
| [DotRing](#dotring) | build | 34 f | scattered dots fly on arcs into a turning ring, stretch into dashes that close it, the ring floods with colour segment by segment and a light runs round it | a moment of connection: many inputs becoming one, a sync, a link made |
| [CurlRing](#curlring) | build, exit | 73 f | a row of picture tiles turns to colour, tips into a diagonal and curls into a ring tile after tile, the ring spinning and imploding into the centre | many things gathered into one before the product appears out of the centre |
| [PillBurst](#pillburst) | enter, exit | 50 f | tool pills burst out from behind a line and settle round it tilted; on the next line they fall under gravity and land in a heap at the bottom | the problem beat: too many tools, tabs or apps, then all of them falling apart |
| [CellStack](#cellstack) | build, loop | 30 f | square cells appear in a row on a white plate, rows join below as dots that grow, the plate becomes a square, then the rows light in turn like a loader | working, indexing or collecting under a line; a loader with character |
| [DiagonalStream](#diagonalstream) | idle, emphasis | 60 f | two bands of rounded picture cards run along one diagonal above and below a centred word, edge cards softened, each turned a little | volume behind a short word: a library, a feed, everything the product holds |
| [BlockPrint](#blockprint) | build | 24 f | a collage prints itself: rectangles land as flat pastel blocks and cut to their photographs a few frames later, some staying colour, the group creeping larger | an editorial or creative brand assembling its world; round a centred word with the corners layout |
| [MarkDolly](#markdolly) | enter, build | 26 f | an extreme close-up of the mark as an extruded bevelled solid pulls back and turns until the whole mark stands in the frame, then cuts to the flat mark | the opening of a lockup for a mark made of bold shapes; the reveal of the brand |
| [PixelatePortrait](#pixelateportrait) | join, build | 9 f | a photograph breaks into coarse blocks and cuts to the mark as a coarse one-bit pixel figure that sharpens in held resolution steps | from a picture of the world to the mark; a pixel or retro brand; a bookend |
| [PlateSqueeze](#platesqueeze) | join, build | 10 f | the full colour field squeezes in from the sides, then from all four, into the small app icon plate round the mark, leaving a step of itself for a few frames | from a full-frame brand colour to the app icon of the lockup |
| [PixelIris](#pixeliris) | join | 8 f | a ring of square pixels opens from a point and races past the corners, the next scene inside settling from soft and large to sharp | onto a wordmark or a brand scene from a busy one; a digital product |
| [ConstructType](#constructtype) | build | 24 f | two handle dots, a hairline between them, a box opening to the right in held steps, and the name typing into it, each letter pale then ink | the wordmark of a design, building or developer tool; the name set the way the product sets things |
| [MarkCondense](#markcondense) | build | 30 f | a blueprint of the mark draws itself (a hairline tile, a construction circle, corner handles), then the real mark condenses inside out of a pale mottled blur and the blueprint fades | the app icon or mark arriving the way a design tool builds it; a reveal on a calm light ground |
| [DotWave](#dotwave) | build, loop | 36 f | a glowing dot opens sideways into a row of fine bars that lives like a level meter, dim rows above and below, and can calm back to one quiet dotted line | a voice, a call, a signal: under or beside one line, out of a dot that was on screen |
| [OrbitRing](#orbitring) | idle, loop | 60 f | tiles ride a flat ellipse round a centre object, large and sharp in front, small, soft and dimmer behind it | the apps or services round one product or figure; a world held round the thing the film is about |
| [WireTetra](#wiretetra) | build | 60 f | a hairline between two dots turns in space, splits into a triangle, lifts into a wire tetrahedron, fills face by face with frosted glass and swings close as a warm light blooms inside | an abstract opener: an idea taking form, a model, an engine, before the product |
| [SpiralFan](#spiralfan) | build, enter | 20 f | a square shrinks and tips, and the cards under it fan out like a deck along a spiral arm while the whole cloud spins clockwise and opens wide round the centre | everything a product reaches (inputs, formats, integrations) bursting out of one thing, round a short line |
| [SlotSwap](#slotswap) | emphasis | 45 f | between two words a picture card cuts to the next picture faster and faster, each a new size, the words hugging every card on the same frame | a line whose proof is many pictures (the work, the products, the people), told in one slot |
| [CardDrift](#carddrift) | idle | 60 f | small cards float round a centred line at several depths, each drifting slowly outward at its own speed, while extra chips pop into the gaps one at a time | the world round a short line: everything a product gathers, a canvas of work, held while the line is read |

<!-- /library:pieces -->

## Pieces

Every piece takes `at` (its first frame), reads the frame's size from `useVideoConfig()` and is deterministic by frame
(`seed` for anything scattered). Pictures are public paths (`'img/tide.jpg'`) or URLs. Marks and names in the reel are
invented; a film gives its own (a company's real mark through `<Brand>`, never redrawn).

Pictures:

### TilePop
Square photo tiles pop on one a frame, scattered from the lower left, and gather into a ribbon that rises to the right
while the view follows the newest tile and pushes in. Each tile is born in a two-tone gradient map and cuts to true
colour a few frames later. For a crowd of pictures at the opening: the people a product serves, a catalogue.
```tsx
<TilePop pics={photos} at={T.open} count={24} dark="#1D5FA0" light="#F2E6BE" />
```
- Numbers: one tile a frame for twelve, then one every second frame; tiles cut on (no scale, no fade); two-tone for
  3-6 f, then true colour through one in-between frame; the newest tile 3, 7, 12, 24, 30 % of the width at 2, 11, 23,
  35, 49 f; the ribbon rises 15 degrees; the first tiles gather into it on 8-22 f.
- Caution: it needs many pictures to read as many; with a few photographs every tile takes its own crop (`cropOf`).

### DealtStack
A rounded photo card in the gap of a line; every few frames a new photo is dealt on top, breaking through in square
blocks, each card stepping up and right with a small turn, so a fanned stack grows and pushes the words apart.
```tsx
<DealtStack pics={photos} at={T.stack} before="Moments" after="kept" deals={[8, 12, 16, 19, 23]} />
```
- Numbers: deals compressing (8, 12, 16, 19, 23 f); each a 2 f block dissolve (blocks 2.2 % of the card); each card
  1.3 % W right, 1.1 % H up, 2.5 degrees on; the stack scales 1 to 1.22 linearly over 24 f; card 23 % W x 45 % H;
  words 6 % of H, weight 560.
- Caution: one short word each side; the cards are pictures, never text to read.

### DiagonalStream
Two bands of rounded picture cards run along one diagonal above and below a centred word, opposite ways or both up,
edge cards softened. `develop` starts each card in the two-tone map; `toCentre` fades them into a hub.
```tsx
<DiagonalStream pics={photos} at={T.feed} angle={35} flow="opposite" />
<DiagonalStream pics={photos} at={T.feed} flow="same" develop toCentre />   // streams flowing into the icon
```
- Numbers: bands 26 % of H from the centre; cards 21 % of H, radius 12 %, overlapping 30 %; 0.5 % of W a frame; up to
  4 px blur within 15 % of the edge; turns of +-4 degrees.
- Caution: the word stays short; the cards are texture.

### BlockPrint
A collage prints itself: each rectangle lands as a flat pastel block and cuts to its photograph 2-6 frames later; some
stay colour; the group creeps larger. `layout="corners"` puts the pieces round a centred word.
```tsx
<BlockPrint pics={photos} at={T.collage} layout="corners" colors={['#F4E98C', '#F7A1A8', '#A9C4F5']} />
```
- Numbers: a piece every 2-3 f; blocks for 2-6 f, then the photograph on one frame; about one in four stays a block;
  the group 100 to 106 % (expo out).
- Caution: a print, never a fade or a slide; three or four pastel blocks.

### SlotSwap
Between two words a picture card cuts to the next picture faster and faster, each a new size and shape, and the words
hug every card on the same frame; the last picture holds.
```tsx
<SlotSwap pics={work} at={T.proof} before="Every" after="kept" gaps={[7, 6, 6, 5, 5, 4, 4, 4]} />
```
- Numbers: cuts 7, 6, 6, 5, 5, 4, 4, 4 f apart; cards 30-46 % of H tall, 0.7-1.5 times as wide, radius 4 % of the
  height; words 6.2 % of H (weight 560), 0.45 em from the card.
- Caution: one word each side; cuts only, never a slide or a fade.

### CardDrift
Small cards float round a centred line at several depths, each drifting slowly outward at its own speed (near ones
larger and sharp, far ones small and soft), while chips pop into the gaps one at a time.
```tsx
<CardDrift at={T.world} items={cards} pops={[<Chip ... />, ...]} clear={{ w: 0.4, h: 0.24 }} />
```
- Numbers: a clear centre of 40 % of W by 24 % of H; depth gives 60 to 120 % scale, 3 px to 0 blur and 0.05 to 0.25 %
  of W a frame of drift; the first set lands on 0-8 f; pops one every 6 f from 14 f (to 108 %, then 100 %, in 4 f).
- Caution: every card is real content of the film; the line stays in the clear centre.

### CurlRing
A row of picture tiles turns to colour left to right, tips into a rising diagonal and curls: the lead tile rises and
turns left over the top and the others follow its path, so the row bends into a ring that spins and implodes.
```tsx
<CurlRing pics={photos} at={T.gather} count={6} />
```
- Numbers: colour 2.5 f a tile; tilt to 30 degrees on 16-24 f; curl 24-40 f; ring radius 30 % of H; a quarter turn
  by 60 f; implosion 60-73 f (radius to 6 %, tiles to 60 %, a half turn, ease-in). Tiles stay upright.
- Caution: 5-8 tiles; let something grow out of the centre where it implodes.

### PixelatePortrait
A full-frame photograph breaks into coarse blocks and cuts to the mark as a coarse one-bit pixel figure on a dark
ground, which sharpens in held resolution steps.
```tsx
<PixelatePortrait src="img/portrait.jpg" at={T.mark} shape={MARK_PATH} color="#fff" ground="#15110D" />
```
- Numbers: photo 1 f, mosaic 1 f (blocks 2.5 % of W), then 10 cells across the mark for 3 f, 16 for 2 f, 26 for 1 f,
  36 after; half-covered cells grey on the middle steps.
- Caution: the mark is a bold closed outline (an SVG path in a 100 x 100 box); thin strokes read as noise at 10 cells.

Shapes and solids:

### BlobMerge
Two round blobs drift together, touch with a liquid neck, merge, split smaller, merge into a pill and shrink to a dot,
on whose frame the mark snaps in.
```tsx
<BlobMerge at={T.mark} color={INK} mark={<Mark size={190} />} />
```
- Numbers: radius 144 px each, 600 px apart (at 1920 wide); touching at 18 f, one blob 20-21 f, two of 85-90 px at
  23 f, a pill at 28-29 f, a 22 px dot at 30 f; the mark at 31 f from 112 to 100 % in 3 f. The neck is a metaball (blur
  and threshold).
- Caution: one in a film, on a flat ground, in the mark's own colour.

### DotRing
Scattered dots fly on arcs into a ring, growing as they fly; the ring turns, the dots stretch into dashes that close
it, the colour floods segment by segment and a light runs round while a short word types inside.
```tsx
<DotRing at={T.link} from={tipPoints} color="#2457F5" light="#7FD8FA" label="linked" />
```
- Numbers: flights 12 f, started 0-4 f apart, dots 0.8 to 4 % of H; ring radius 36 % of H, turning 2 degrees a frame;
  dashes 23-30 f; flood 30-33 f; the light once round in 20 f from 34 f; the word (7.5 % of H)
  a letter a frame from 26 f.
- Caution: the dots should start from something on screen (`from`); one in a film.

### PillBurst
Tool pills burst out from behind a line and settle round it, tilted; on the next line they fall under gravity and land
in a heap along the bottom, some turning as they land.
```tsx
<PillBurst items={[{ label: 'Notes', icon: 'StickyNote' }, ...]} at={T.tools} fallAt={T.broken} />
```
- Numbers: the burst settles in 10 f (expo out), the last quarter of the way out and 12 % of H up, from 85 % size,
  0-3 f apart; gravity 1.4 % of H a frame squared, 0-4 f apart; a 3 f landing with a 2.5 % rebound; up to 60 degrees
  of turn; the heap 6 % of H above the bottom edge; pill text 3 % of H.
- Caution: draw the line above the pills; names short; generic icons or the real marks (`node`).

### CellStack
Square cells appear in a row on a white plate, rows join below as dots that grow, the plate grows from a bar into a
square, then the rows light in turn like a loader.
```tsx
<CellStack at={T.index} cols={4} rows={4} color="#E4572E" />
```
- Numbers: first-row cells 1 f apart, each 30 to 100 % in 2 f; rows at 11, 13, 16 f; the plate re-fits in 3 f; cell
  3.6 % of W on an 8.4 % pitch; the loader from 18 f, rows strong for 5, 4, 2, 3 f, the row before at 55 %, the rest 30 %.
- Caution: a loop under a line, never the line's only content.

### SquareTunnel
A square opens into a ring; new squares are born in its hole and open in turn, every ring growing outward at one speed;
the births quicken and the last square grows solid over the frame.
```tsx
<SquareTunnel at={T.dive} color={ACCENT} size={0.13} />
```
- Numbers: the first square 13 % of H; rings grow 6.9 % of H a frame (linear); 7 % of H thick (each later one 4 %
  more); births every 5 f, every 3 f after 20 f; the last square from 34 f covers the frame at 43 f (ease-in).
- Caution: start from a square that is on screen (a tile, a cell, a button), never a full stop.

### CubeSplit
An isometric cube splits into four, the four swing round into a ring of eight blocks, and the ring tips over and lands
flat and front-on as a pixel mark, construction lines streaking out from it.
```tsx
<CubeSplit at={T.mark} color="#1B2A4A" cells={[[0, 0], [1, 0], [3, 0], [3, 1], [3, 3], [2, 3], [0, 3], [0, 2]]} />
```
- Numbers: hold 7 f, wobble 3 f, split at 10 f (2 x 2 by 14 f), swing 26-31 f, flip 45-50 f (from 55 degrees down to
  straight down, one full spin, blur from the angular speed), land at 106 % settling by 58 f; a cube 5.2 % of W.
- Caution: the mark must be made of cells on a grid; follow it with `LockupType`.

### SpiralFan
A square shrinks and tips; the cards under it fan out like a deck, first in a tight turning cluster, then along a
spiral arm, the whole cloud spinning clockwise and opening wide round a clear centre.
```tsx
<SpiralFan at={T.burst} cards={tiles} count={32} color={ACCENT} />
```
- Numbers: the square 100 to 55 % and 12 degrees on 0-3 f; the fan 3-9 f; the spiral opens 8-19 f to 56 % of H (the
  arm starting half way out); the cloud turns 130 degrees by 19 f, then 0.6 degrees a frame; 1.6 turns; cards 7.5 % of H,
  80 to 110 % from the centre out.
- Caution: 24-40 cards of one family; the centre is for one short line.

### OrbitRing
Tiles (icons, cards, chips) ride a flat ellipse round a centre object: large and sharp as they pass in front left to
right, small, soft and dimmer behind it.
```tsx
<OrbitRing at={T.world} centre={<Product />} items={apps.map((a) => <AppIcon ... />)} />
```
- Numbers: the ellipse 36 % of W wide (half) and 4 % of H tall; a turn in 150 f; tiles 112 % in front, 62 % behind, up
  to 4 px blur and 70 % strength at the back; tiles enter on the first 10 f, 1 f apart.
- Caution: 5-9 tiles; the centre object carries the scene, and the front tiles pass over it: keep its text short.

### DotWave
A glowing dot opens sideways into a row of fine bars that lives like a level meter, dim rows above and below;
`calmAt` narrows it back to one quiet dotted line.
```tsx
<DotWave at={T.voice} calmAt={40} color="#fff" />
```
- Numbers: the row opens to 60 % of W in 14 f (expo out); bars on a 0.55 % of W pitch; spikes on twos up to 11 % of the
  short side, tapering to the edges; four dim rows at +-8 and +-16 % of the short side at 22 %; calming narrows to 30 %
  in 12 f. In a 1080 x 1920 frame the meter keeps its 16:9 height; `width` is still a share of W.
- Caution: one moving thing at a time; it is a signal, not decoration.

### WireTetra
A hairline between two dots turns in space, splits into a triangle, lifts into a wire tetrahedron, fills face by face
with frosted glass and swings close as a warm light blooms inside.
```tsx
<WireTetra at={T.open} />
```
- Numbers: the turn 0-22 f, the split 22-30 f, the fourth vertex 30-40 f, faces at 40, 42, 44, 46 f, the swing 48-56 f
  (22 to 72 % of H by default, log scale; `size`, above about 0.8 the corners leave the frame), the light from 50 f.
- Caution: near-black ground only; an abstract opener, one in a film.

Marks and lockups:

### PixelMark
A mark of square cells assembles by trial (partial sets blink on and off), then holds while hairline guides run out
along its cell edges. `shrinkAt` steps it down.
```tsx
<PixelMark at={T.mark} cells={MARK_CELLS} color="#fff" guides="rgba(255,255,255,0.16)" />
```
- Numbers: six partial sets at 2, 4, 7, 9, 11, 12 f; whole from 13 f; row guides from 6 f, column guides from 13 f,
  steady from 20 f; `shrinkAt`: 100, 82, 66, 54 % on every second frame.
- Caution: cells only, one flat ground; `DotWord` spells words.

### TumbleLockup
The app tile grows out of a dot with a tilt and an overshoot, its glyph popping in, while the name's letters tumble in
two frames apart, small, slanted and tinted, rising into place in ink.
```tsx
<TumbleLockup at={T.lockup} name="Tandem" glyph={<Glyph />} color={BRAND} ink="#1B1416" />
```
- Numbers: the tile to 108 % in 6 f, 100 % by 10 f, turning 15, -8, 0 degrees; the glyph 7-9 f; letters from 1 f, 2 f
  apart, each 4 f (50 to 100 %, slant 14 degrees, from 0.3 em right and 0.25 em low, tile colour to ink).
- `size` defaults to 10 % of the frame's short side (108 px in 16:9 and in a 1080 x 1920 frame); the tile is 1.25 times it.
- Caution: the letters move but the name's spacing never closes up.

### LockupType
The mark holds, then slides left as the name appears beside it a letter about every frame and a half, the lockup
re-centring with each letter. The mark may build while it holds (`mark` as a function of 0..1).
```tsx
<LockupType at={T.lockup} name="Halden" mark={(p) => <Mark p={p} />} markW={128} hold={16} />
<LockupType ... per={0} />   // the name on one frame, the lockup sliding to centre in 10 f
```
- Numbers: letters at 1, 2, 3, 5, 6, 8 f after the hold, then 1.4 f apart; each letter's share of the re-centring
  glides in 5 f (expo out); gap 0.32 of the text size.
- A function mark receives `p` one step in on frame `at` (1/build, then 1 on `at + build - 1`): draw its tile and glyph
  together from `p`, so its first frame is never an empty plate or a stub.
- Caution: letters cut on at the name's final spacing; never wide letters closing, never a fade.

### ConstructType
The name set the way a design tool sets a text box: two handles, a hairline, a box opening right in held steps, the
name typing in, each letter pale then ink.
```tsx
<ConstructType at={T.lockup} name="Gridwell" line="rgba(20,21,25,0.35)" />
```
- Numbers: dots at 0 f, the hairline 2-5 f, the box 4, 12, 30, 62, 100 % wide on 7-11 f, a letter every 1.3 f from
  12 f, pale for 3 f.
- Caution: the outline and handles stay quiet; the name is the subject.

### MarkCondense
The mark's place is drawn first as a blueprint (a hairline tile, a construction circle with its centre, corner
handles); the real mark condenses inside out of a pale mottled blur that darkens and sharpens; the blueprint fades.
```tsx
<MarkCondense at={T.icon} mark={<BrandTile name="..." size={300} />} size={324} line="#3C8DF0" />
```
- Numbers: the blueprint draws on 0-6 f; the mark from 8 f, blur 9 % of its size to 0 and brightness 1.9 to 1 over 13 f
  (expo out), mottled on its first 8 f; the blueprint fades 22-30 f.
- Caution: the mark is the real one; the blueprint stays one thin blue on a calm light ground.

### MarkDolly
An extreme close-up of the mark as an extruded, bevelled solid pulls back and turns until the whole mark stands in the
frame, then cuts to the flat mark.
```tsx
<MarkDolly at={T.mark} flat={ARCH_SVG(flatSize(H))} />                       // the invented default: an arch on a step
<MarkDolly at={T.mark} arms={[{ points: [[...]], color: BRAND }, ...]} flat={<Mark size={flatSize(H)} />} />
```
- Numbers: the camera 1.15 to 7 units in 26 f (log scale, expo out), 18 degrees below; yaw 28 to 12 degrees; the cut
  to `flat` at `dur`.
- Caution: software GL; one solid on a light ground; give one `id` a mark. Draw `flat` at `flatSize(H)` (a mark 2 units
  across ends 47 % of H tall) so the cut keeps its size.

### PlateSqueeze
The full-frame colour field squeezes from the sides, then from all four, into the small app-icon plate round the mark,
leaving a step of itself behind for a few frames.
```tsx
<PlateSqueeze at={T.squeeze} color={BRAND} mark={<Mark size={70} />} plate={0.124} />
```
- Numbers: sides only for 6 f (98, 96, 90, 84, 76, 66 % of W), then all four, the plate at its size on 10 f; the echo
  on 6-9 f; the mark from 1.8x to 1x with the width.
- Caution: the field is the whole ground in one flat colour.

### PixelIris
A ring of square pixels opens from a point and races past the corners; inside it the next scene settles from soft and
large to sharp.
```tsx
<PixelIris from={<Busy />} to={<Wordmark />} at={T.brand} colors={[DEEP, BRAND, NEAR_BLACK]} />
```
- Numbers: 8 f; the ring's outer edge 6, 25, 55, 75, 95, 112, 130, 150 % of H and its inner edge 0, 8, 33, 55, 75,
  92, 110, 130 %; pixels 2.8 % of H; the scene inside 120 % and 8 px blur to sharp by 5 f.
- Caution: the pixel tones come from the next scene; one in a film.

## In the reel

Every piece's frames in the reel (`--film library-objects`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-objects --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| TilePop | `library-objects` | 0-59 | `node scripts/frames.mjs library --strip TilePop` |
| DealtStack | `library-objects` | 60-99 | `node scripts/frames.mjs library --strip DealtStack` |
| BlobMerge | `library-objects` | 100-147 | `node scripts/frames.mjs library --strip BlobMerge` |
| LockupType | `library-objects` | 148-197 | `node scripts/frames.mjs library --strip LockupType` |
| CubeSplit | `library-objects` | 198-281 | `node scripts/frames.mjs library --strip CubeSplit` |
| SquareTunnel | `library-objects` | 282-335 | `node scripts/frames.mjs library --strip SquareTunnel` |
| PixelMark | `library-objects` | 336-375 | `node scripts/frames.mjs library --strip PixelMark` |
| TumbleLockup | `library-objects` | 376-411 | `node scripts/frames.mjs library --strip TumbleLockup` |
| DotRing | `library-objects` | 412-473 | `node scripts/frames.mjs library --strip DotRing` |
| CurlRing | `library-objects` | 474-551 | `node scripts/frames.mjs library --strip CurlRing` |
| PillBurst | `library-objects` | 552-623 | `node scripts/frames.mjs library --strip PillBurst` |
| CellStack | `library-objects` | 624-663 | `node scripts/frames.mjs library --strip CellStack` |
| DiagonalStream | `library-objects` | 664-713 | `node scripts/frames.mjs library --strip DiagonalStream` |
| BlockPrint | `library-objects` | 714-753 | `node scripts/frames.mjs library --strip BlockPrint` |
| MarkDolly | `library-objects` | 754-789 | `node scripts/frames.mjs library --strip MarkDolly` |
| PixelatePortrait | `library-objects` | 790-813 | `node scripts/frames.mjs library --strip PixelatePortrait` |
| PlateSqueeze | `library-objects` | 814-839 | `node scripts/frames.mjs library --strip PlateSqueeze` |
| PixelIris | `library-objects` | 840-865 | `node scripts/frames.mjs library --strip PixelIris` |
| ConstructType | `library-objects` | 866-899 | `node scripts/frames.mjs library --strip ConstructType` |
| MarkCondense | `library-objects` | 900-935 | `node scripts/frames.mjs library --strip MarkCondense` |
| DotWave | `library-objects` | 936-987 | `node scripts/frames.mjs library --strip DotWave` |
| OrbitRing | `library-objects` | 988-1047 | `node scripts/frames.mjs library --strip OrbitRing` |
| WireTetra | `library-objects` | 1048-1123 | `node scripts/frames.mjs library --strip WireTetra` |
| SpiralFan | `library-objects` | 1124-1167 | `node scripts/frames.mjs library --strip SpiralFan` |
| SlotSwap | `library-objects` | 1168-1221 | `node scripts/frames.mjs library --strip SlotSwap` |
| CardDrift | `library-objects` | 1222-1281 | `node scripts/frames.mjs library --strip CardDrift` |

<!-- /library:reel -->
