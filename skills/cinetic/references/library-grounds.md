# Library: grounds

**What it is for:** the ground a film's scenes stand on and how it moves, each the ground of a design preset. Reach
first for `HairlineGrid` (a clean light product), `TechGrid` (night and technical), `PhotoPlate` (a photograph as the
world), `OrbitLines` (quiet statements on cream) and `IsoFloor` (poster fields with blocks). Not here: a ground change
as a join (`TileFlood`, `PixelStair` in [turns](library-turns.md)), a glow (`GlowBars` in [fx](library-fx.md)), faint
gradients or wallpapers. Most grounds here were checked on stills only; their cautions say so. Near neighbours
elsewhere: `IsoFloor` beside `FloorTilt` (camera), `PlanetRim` beside `PlanetPull` (camera) and `GlowBars` (fx),
`DotLattice` beside `DotScreen` (fx); see [library.md](library.md#near-neighbours-across-categories) and [a ground and a
look](library.md#a-ground-and-a-look).

Designed backgrounds and how they move: a flat ground that changes by an object, a grid or a pattern that breathes, a
ground built from the film's own material. Never a faint gradient or a drifting wallpaper. Each piece lives in
`src/kit/library/grounds/` (one file a piece, named after it), with its catalogue entry in
`src/kit/library/catalog/ground.ts` (`category: 'ground'`) and one segment in the `library-grounds` reel
(`src/films/library/ReelGrounds.tsx`); `frames.mjs library --category ground` lists them. Add one by the checklist in
[library.md](library.md#how-to-add-a-piece); the two tables below are written from the catalogue.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [HairlineGrid](#hairlinegrid) | build, idle | 40 f | a white canvas ruled by 1 px hairlines that grow out of the centre crossing, tiny marks at the crossings, accent blocks hopping cell to cell by cuts | a clean product or developer brand whose one accent is a tool mark; paper grid for a serif look, graph grid under loud type |
| [TechGrid](#techgrid) | build, idle | 48 f | black with dashed rules drawn from the centre, square ticks at the crossings (a few in one signal colour) and a thin ring that draws itself round the subject | a technical or event film at night: a word, a photo or a card framed by the drafting table |
| [DotLattice](#dotlattice) | build, idle | 30 f | a fine lattice of ring, round or square dots on black, filled in a wave from a point, lit from inside by slow pools, with a hole that opens for the type | a screen-material film (LED, pixels): the ground under a line or a page, or the first beat built from dots |
| [HalftoneField](#halftonefield) | idle, emphasis | 46 f | a light field of round halftone dots in one flat ink with black clusters; on each swap the clusters change and the ink eases to the next one | behind a held line while the thing beside it changes in held steps (the field takes the colour of each) |
| [PlanetRim](#planetrim) | enter, exit | 30 f | on black, a dark planet rises from the foot: a thin peach rim, a burnt band inside, warm light just above the rim; it sinks on an ease-in | under a product name or a claim on a black film, once (the opening title or the end card) |
| [OrbitLines](#orbitlines) | enter, idle | 22 f | on a warm flat ground two hairline circles larger than the frame start as one, part, turn as a pair and keep turning slowly | under quiet statements on cream, so an empty ground never stands still |
| [CobaltArcs](#cobaltarcs) | idle | 60 f | one flat saturated blue with faint concentric hairline arcs round a point under the frame, widening slowly outward | a brand-colour ground for glass cards and notices |
| [PhotoPlate](#photoplate) | idle, emphasis | 60 f | a full-bleed photograph pushing in slowly, thin white outline shapes drawing onto it, a re-grade that eases in on an event | a photograph as the world: under glass panels, under words, with outlines that frame the subject |
| [CuttingMat](#cuttingmat) | idle | 60 f | a tabletop from above: a slate cutting mat with its grid, a strip of desk, window-blind shadows across it, tracking slowly | a collage or paper look: tiles, stickers and cards laid on a real-looking table |
| [GhostWord](#ghostword) | idle | 30 f | a flat light ground with one giant word a few percent lighter than it, cropped by the frame and drifting sideways | the home ground of a long film whose brand word is the texture under small type |
| [FourUp](#fourup) | loop | 120 f | the frame split into four panels, each playing its own scene on its own loop length and phase, so the four never cut together | a showreel tile or a social loop that shows a body of work at once |
| [IsoFloor](#isofloor) | build | 24 f | a flat poster field ruled a shade darker that tilts from facing the lens into an isometric floor, with flat tiles lying on it | a section of a poster-colour film where blocks, slabs and tags stand on the ground |

<!-- /library:pieces -->

## The grounds

Every ground is a full-frame layer: put it first in the scene, the content above it. Sizes come from the frame
(`useVideoConfig`), so each works in a vertical film too. `at` is the frame its build starts (`-1` on the line grids
shows it whole from frame 0).

### HairlineGrid

A white canvas ruled by 1 px hairlines that grow out of the centre crossing (centre lines first, each next line 2 f
later, 16 f each), with tiny marks at the crossings (`diamond`, `dot`, `cross`, `none`). `blocks` accent squares fill
single cells and hop to a neighbouring cell every `step` frames (6), each on its own beat, keeping out of the `clear`
box round the centre where the type sits. `cell` 0.13 of the height is a layout grid, 0.028-0.031 graph or paper grid;
`dash` (px at 1080) dashes the lines; `drift` slides the canvas like a camera over it.

```tsx
<HairlineGrid at={T.open} blocks={5} accent={ACCENT} clear={[2, 1]} />
```

Caution: the lines stay about 10 % off the ground; one accent, used as a mark.

### TechGrid

Black (#050506) with dashed 6/6 rules on cells 0.22 of the height, drawn out of the centre, 3 px square ticks at the
crossings (one in `signalEvery` in the `signal` colour) and an optional `ring` (1 px, radius 0.45 of the height) that
draws to `sweep` degrees over 30 f. Frame a word, a corner-ticked photo or a terminal card on it.

Caution: one signal colour, under 3 % of the frame; labels beside it tiny and in sentence case.

### DotLattice

A dot screen as a ground: ring, round or square dots 12 px apart at 1080 (`pitch` 0.011), 0.6 of the pitch, unlit at
9 % of `color`; `pools` lit areas (0.35 of the height) lift the dots to `lit` and wander slowly; `fill` brings the
dots in as a wave from a point (the front crosses in `dur` 24 f, each dot pops in 4 f); `hole` clears a box at the
centre for the line (shares of the frame, opens in 10 f).

Caution: the light is in the dots, never a haze over them.

### HalftoneField

A light grey field (#E6E6E6) of round halftone dots 27 px apart at 1080, sized by a soft tone, in the ink of the
current palette (one flat ink by default; two or three run from top left to bottom right), with black clusters on about
`coverage` of the field. On each frame in `swaps` a new set of clusters cuts in and the ink eases to the next palette
over `blend` frames (6); swaps held 12 f or more carry a held line while the thing beside it changes.

Caution: the line sits on a plain backing box, never on the dots; inks of one lightness, swaps 12 f or more apart (faster
swaps, or a light ink after a dark one, strobe).

### PlanetRim

On black, a dark planet (radius 1.1 of the height) rises from the foot: its rim top reaches 60 % of the travel in 4 f,
75 % at 12 f, 85 % at 18 f and rests at 30 f (`top` 0.80 under a statement, 0.62 under an end card); a warm haze
above the rim, fading out about 0.2 of the height up, builds from 4 f over 20 f; `radius` 2.4 gives the gentler arc
of an opening title; a burnt band peaks 0.11 of the height inside the rim; `sinkAt` sends it
down in 11 f (ease-in). `fromX` raises it from a corner.

Caution: one planet a film, under the name or the claim; never a glow on its own.

### OrbitLines

Two 1 px circles (#D9D7D2 on cream, radius 0.32 of the width) fade in as one over 2 f, part vertically to 0.7 of the
height apart in 7 f (expo out), turn as a pair 60 degrees over 11 f (expo out) and keep turning 0.15 degree a frame. The ground under quiet statements on cream.

Caution: faint and mostly off-frame; the line of type is the subject.

### CobaltArcs

One flat saturated blue (#2140D9) with concentric hairline arcs (white at 10 %, 0.12 of the height apart) round a
point 0.25 of the height under the foot, widening 0.0016 of the height a frame; on `at` they draw out from the centre
over about 20 f. Glass cards on it: white at 14 %, a 1 px white rim at 25 %, `softShadow(5, ground)`.

Caution: keep the blue flat; no lighter centre, no glow at the foot.

### PhotoPlate

A full-bleed photograph pushing in (scale 1.04, +0.006 a second), graded by `grade` (one CSS filter for every picture
of the film). `shapes` draw 1.5 px white outlines onto it in 14 f each (a rectangle beside a circle, a pill, a ring:
shares of the frame); `tint` multiplies a colour over it from `tint.at` to `tint.until` (a state: an error, a
warning), easing in and out over `tint.fade` frames (10, never under 8) at `amount` 0.45, so the light never jumps. The ground for glass panels (Frost) and editorial words (Gallery).

Caution: a re-grade needs a reason on screen; the outlines frame the subject, never a word.

### CuttingMat

A slate cutting mat seen from above (grid every 3.7 % of the height, every fifth line stronger, a 45-degree guide),
turned 3 degrees, a strip of warm desk at one edge, window-blind shadows across both (bands 8 % of the height at
`blinds` 0.32, edges soft), the whole table tracking 0.6 % of the height a second. Lay tiles, stickers and cards on it
with a short contact shadow from the same window.

Caution: keep words off the shadow bands.

### GhostWord

A flat light ground with one giant word (`size` 1.15 of the height, the serif italic by default) a few percent lighter
than the ground, cropped by the frame, drifting 0.5 px a frame, softened by 2 px. The home ground of a long film with
small type in front.

Caution: if the ghost can be read before the line in front, it is too strong.

### FourUp

Four half-size panels, each a full-frame scene of yours, on its own loop length (`loops`, 90-150 f) and phase
(`phases`), butted (`gutter` 0) or with 4 px gutters and 8 px corners. The offsets keep the four from ever cutting
together.

Caution: one panel carries the words; spread the phases so no two cuts fall within 6 f.

### IsoFloor

A flat poster field ruled by a grid 12 % darker (cells 1/6 of the height) that tilts into an isometric floor (55
degrees back, -22 round, scale 1 to 0.9) over 12 f in-out (about 60 % of it in the middle 4 f), through a long lens so
it reads nearly orthographic; `flatAt` tilts it
back; `tiles` lie flat on it (cells from the centre crossing), `pan` slides it; drawn as a projected SVG, so it renders fast.

Caution: change the field by a cut or a flood, never a fade; depth from the faces of what stands on it, no shadows.

## In the reel

Every piece's frames in the reel (`--film library-grounds`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-grounds --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| HairlineGrid | `library-grounds` | 0-95 | `node scripts/frames.mjs library --strip HairlineGrid` |
| TechGrid | `library-grounds` | 96-191 | `node scripts/frames.mjs library --strip TechGrid` |
| DotLattice | `library-grounds` | 192-287 | `node scripts/frames.mjs library --strip DotLattice` |
| HalftoneField | `library-grounds` | 288-377 | `node scripts/frames.mjs library --strip HalftoneField` |
| PlanetRim | `library-grounds` | 378-477 | `node scripts/frames.mjs library --strip PlanetRim` |
| OrbitLines | `library-grounds` | 478-567 | `node scripts/frames.mjs library --strip OrbitLines` |
| CobaltArcs | `library-grounds` | 568-657 | `node scripts/frames.mjs library --strip CobaltArcs` |
| PhotoPlate | `library-grounds` | 658-747 | `node scripts/frames.mjs library --strip PhotoPlate` |
| CuttingMat | `library-grounds` | 748-837 | `node scripts/frames.mjs library --strip CuttingMat` |
| GhostWord | `library-grounds` | 838-927 | `node scripts/frames.mjs library --strip GhostWord` |
| FourUp | `library-grounds` | 928-1047 | `node scripts/frames.mjs library --strip FourUp` |
| IsoFloor | `library-grounds` | 1048-1137 | `node scripts/frames.mjs library --strip IsoFloor` |

<!-- /library:reel -->
