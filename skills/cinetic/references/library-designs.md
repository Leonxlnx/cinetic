# Library: design presets

**What it is for:** a whole look as tokens, with the ground and the pieces that go with it. Reach first for `Quiet` (a
sentence that builds), `Drafting` (structure and one loud colour), `Cream` (an assistant doing one task), `Ember`
(darkness and one light) and `Gallery` (people and their work). Not here: motion (a preset moves nothing; its `moves`
name the pieces), a purple or green look, a faint gradient ground. The presets are shown on the design reel only, never
yet tried on a whole film. Which ground and type moves go with each: [a ground and a
look](library.md#a-ground-and-a-look).

Named looks as typed token objects (`Design`: palette, grounds, type scale and weights, radii, shadow recipe, stroke,
texture) that a film spreads into its own tokens (`const W = { ...Quiet.palette, radius: Quiet.radii.card }`). A preset
is a piece: `export const Quiet: Design = { ... }` in `designs/Quiet.ts`. Each piece lives in `src/kit/library/designs/`
(one file a piece, named after it), with its catalogue entry in `src/kit/library/catalog/design.ts` (`category:
'design'`) and one segment in the `library-designs` reel (`src/films/library/ReelDesigns.tsx`); `frames.mjs library
--category design` lists them. Add one by the checklist in [library.md](library.md#how-to-add-a-piece); the two tables
below are written from the catalogue.

Its reel segment shows it on a `<DesignSwatch design={Quiet} />` (the preset's ground, a card in its surface, its type
scale in its ink, its palette as chips); `Design` and `DesignSwatch` live in `designs/_shared.tsx`. A preset is a
starting look, never the film's idea: the world still comes from the product ([worlds.md](worlds.md)).

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [Drafting](#drafting) | build | 75 f | a white canvas ruled by quiet hairlines, black type, one saturated accent used only as a tool mark and one full flood | a product or developer brand that wants structure and one loud colour |
| [Blockprint](#blockprint) | build | 75 f | flat poster fields that change by section, a darker grid that tilts into an isometric floor, slabs lit by their faces, lowercase words | an infrastructure or data product told in blocks and colour fields |
| [Nightdesk](#nightdesk) | build | 75 f | a black drafting table: dashed rules, square ticks, a thin ring, white technical type, tiny data labels, one signal colour | a developer, event or night film with photographs and dashboards to frame |
| [Ember](#ember) | build | 75 f | pure black and one warm light with a visible source, white type, dark-glass chips with a hairline edge, amber on the key words | a voice, model or premium product told in darkness and one light |
| [Gallery](#gallery) | build | 75 f | a cream ground, warm documentary photographs in one grade, a deep ink, flat pills and rounded tiles, white outlines drawn on the photos, one light face | a brand film about people and their work |
| [Quiet](#quiet) | build | 75 f | a white or neutral grey stage with one sentence on the centre line, pictures set inside the line, light UI with soft shadows, one blue word | an explainer whose story is a sentence that builds |
| [Cream](#cream) | build | 75 f | a warm cream ground, calm grotesk statements, a text serif for the greeting, a faithful light UI, one earthy accent, two faint circles turning | an assistant or writing product shown doing one task end to end |
| [Folio](#folio) | build | 75 f | a serif voice set big on paper grey with a faint grid, editorial pictures full-bleed, corner brackets and handles in one clay accent | an image or fashion product whose voice is a serif |
| [Pixel](#pixel) | build | 75 f | one screen material in every scene: dots on black, a halftone field, words in dot matrix, the pitch constant within a scene | a short expressive type film or a sting about screens |
| [Sketchbook](#sketchbook) | build | 75 f | warm paper, a slate cutting mat under blind shadows, one dry-brush marker colour, tiles and stickers with short shadows, a hero word dead centre | a hackathon, maker or collage film that should feel made by hand |
| [Cobalt](#cobalt) | build | 75 f | one flat ultramarine as the whole ground with faint arcs, white glass cards with a hairline rim, big Title Case headlines | a creator or commerce product whose brand is one saturated blue |
| [Frost](#frost) | build | 75 f | a photograph or footage as the ground, frosted glass pills and panels over it showing the picture through, white type, a black send button | a consumer assistant set in the world (sky, travel, health) |
| [Tray](#tray) | build | 75 f | real-looking objects on a light grey void: a white tray with a lit bevel, squircle sockets, a heavy grotesk word under a light serif lead | an opener about apps and tools as objects, ending in a lockup |
| [Shout](#shout) | build | 75 f | a tight heavy grotesk with overlapping lines cropped by the frame, tiny type for scale, flat tags turned -3 degrees, one red flood, a graph grid | an agency or launch finale where the words are the image |

<!-- /library:pieces -->

## The presets

A preset is a starting look as tokens. Spread what you need into the film's own tokens and theme:

```tsx
import { Drafting, HairlineGrid, lightUI, softShadow } from '../../kit';
const D = Drafting;
const ui = { ...lightUI, accent: D.palette.accent, ink: D.palette.ink, font: D.type.font, radius: D.radii.card, shadow: softShadow(D.shadow.card, D.palette.ground) };
// the ground that goes with it: D.groundPiece ('HairlineGrid')
```

Each `Design` carries `palette`, `accents` (the others the look allows), `grounds` (in order of use), `groundPiece`
(the library ground that goes with it), `type` (face, sizes in px at 1080, weights, tracking, a `display` size, a
`second` face and its one role, `case`), `radii`, `shadow` (softShadow levels for a card and a hero), `stroke`,
`texture`, `spacing` (margin, gap, padding), `picture` (radius and the one grade every picture takes) and `moves` (the
library pieces whose motion fits). `DesignFrame` draws a designed frame in any preset (a statement, a card, a picture
and a mark placeholder); the reel shows every preset with it. Sizes in the presets were measured on full-resolution
frames: a quiet statement is 4.5-6 % of the frame height, not the 2 % it looks like in a thumbnail.

No preset carries a purple or a green, and none carries a faint gradient ground; looks that need one are not here.

### Statement sizes

Each preset gives its statement sizes as shares of the frame height (`type.sizes`), in the look's own proportions;
`statementSize(design, text, height)` picks one by the line's word count, and `DesignFrame` uses it.

| Preset | 5-6 words | 3-4 words | 1-2 words |
|---|---|---|---|
| Drafting | 0.052 | 0.075 | 0.17 |
| Blockprint | 0.07 | 0.10 | 0.12 |
| Nightdesk | 0.055 | 0.067 | 0.12 |
| Ember | 0.055 | 0.075 | 0.10 |
| Gallery | 0.045 | 0.08 | 0.11 |
| Quiet | 0.05 | 0.056 | 0.16 |
| Cream | 0.044 | 0.05 | 0.08 |
| Folio | 0.07 | 0.09 | 0.25 |
| Pixel | 0.055 | 0.06 | 0.28 |
| Sketchbook | 0.07 | 0.11 | 0.13 |
| Cobalt | 0.085 | 0.13 | 0.22 |
| Frost | 0.05 | 0.06 | 0.12 |
| Tray | 0.09 | 0.14 | 0.19 |
| Shout | 0.12 | 0.185 | 0.21 |

Over a busy picture give the statement a `plate` (a dark glass, e.g. `rgba(12,14,18,0.72)` with a blur) so white type
keeps 7:1.

### Drafting

White, 1 px hairlines #E5E5E5 (HairlineGrid, cells 13 % of the height), black type 56 px Inter 450 at -0.02 em, radius
0, one accent (cobalt #2A4BF2; tangerine and signal yellow allowed) on 4-6 % of a frame, and once a full flood with a
240 px claim. Caution: one accent, used as a mark.

### Blockprint

Flat poster fields that change by section (tangerine #FF6B1A, cobalt, sky #D6E8F7, black, bone), a grid 12 % darker
that tilts into an isometric floor (IsoFloor), lowercase words 110 px staggered one a line, mono tags square-cornered,
no radius, no shadows. Caution: a field changes by a cut or a flood, never a fade.

### Nightdesk

Black #050506, dashed rules #303238 on cells 22 % of the height, 3 px ticks, a thin ring (TechGrid), Geist 500 at 72
px, tiny data labels in mono, one amber signal (#FFB020; electric blue allowed) on under 3 % of the frame. Caution:
labels in sentence case, never tracked capitals.

### Ember

Pure black, one warm light with a source (PlanetRim), white Inter 550 at 80 px, dark-glass chips #141414 with a 1 px
edge at 12 % white and radius 28 % of their height, a warm accent #F07A32 and amber key words. Caution: the light
belongs to an object.

### Gallery

Cream #F2ECE3, deep ink #1D2B45, one light face (Inter 300, a hook at 88 px), warm photographs in one grade, pills and
tiles radius 28 px, thin white outlines drawn on the photos (PhotoPlate `shapes`), apricot and sky as flat shapes; no
shadows. Caution: one grade for every photograph.

### Quiet

White (or #EDEDED), one line on the centre at 60 px Inter 500, pictures set inside the line, pills with a hairline,
cards radius 20 px at softShadow 2, a blue key word under 1 % of the frame. Caution: nothing else on the stage.

### Cream

Cream #F4F1EA with two hairline circles turning (OrbitLines), Inter 420 statements at 48 px, a serif greeting and
wordmark, a white input box radius 14 px with a #E6E3DE edge, a brick accent #A8432A on the send button and the mark
only. Caution: the serif for one role; no full stops on the lines.

### Folio

Paper grey #E9E9E6 with a faint grid every 34 px (HairlineGrid at cell 0.031), Newsreader 500 statements at 100 px,
giant words 220-380 px, corner brackets and handles in clay #C8553D, pictures full-bleed and square. Caution: only for
a brand that speaks in a serif; UI stays in Inter.

### Pixel

Black with a dot lattice 12 px apart (DotLattice) or a grey halftone field 27 px apart (HalftoneField), LED colours
coral, yellow, cyan and white, Inter 500 at 64 px, words in dot matrix through the library's DotWord and LightWord.
Caution: one pitch a scene.

### Sketchbook

Warm paper #F3F1EC, a slate cutting mat under blind shadows (CuttingMat), one marker colour (tangerine #FF6A1F),
hero words 120 px Inter 600, tiles radius 10 % turned -25 to 25 degrees with short shadows. Caution: the hand shows in
strokes (the kit's `Stroke`), never in a handwriting font for statements.

### Cobalt

Flat ultramarine #2140D9 with faint arcs (CobaltArcs), white glass cards (14 % white, 1 px rim at 25 %, softShadow
5, radius 22 px), Title Case headlines at 140 px Inter 400. Caution: keep the blue flat.

### Frost

A photograph or footage as the ground (PhotoPlate), frosted glass over it (16 % white, 20 px backdrop blur, 1 px rim
at 30 %), pills 6 % of the height tall, panels radius 30 px, white Inter 500 at 64 px, a black round send button.
Caution: the picture is the ground, never a pastel gradient field.

### Tray

A light grey void #DADADD, a white tray with a lit bevel, squircle sockets radius 22 % with an inner shadow, a heavy
lowercase Inter 700 word at 150 px (-0.045 em) under a Newsreader lead line, one hot accent #FF5A36 on the heavy
word; the library's GhostFill fills the sockets. Caution: soft contact shadows, never hard edges.

### Shout

White with a graph grid (HairlineGrid at cell 0.028), Inter 700 at 200 px, -0.055 em, leading 0.86 so lines overlap,
cropped by the frame, tiny type in the corners, flat tags turned -3 degrees, one red flood #E8322B. Caution: crop by
the frame, never by a box.

## In the reel

Every piece's frames in the reel (`--film library-designs`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-designs --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| Drafting | `library-designs` | 0-74 | `node scripts/frames.mjs library --strip Drafting` |
| Blockprint | `library-designs` | 75-149 | `node scripts/frames.mjs library --strip Blockprint` |
| Nightdesk | `library-designs` | 150-224 | `node scripts/frames.mjs library --strip Nightdesk` |
| Ember | `library-designs` | 225-299 | `node scripts/frames.mjs library --strip Ember` |
| Gallery | `library-designs` | 300-374 | `node scripts/frames.mjs library --strip Gallery` |
| Quiet | `library-designs` | 375-449 | `node scripts/frames.mjs library --strip Quiet` |
| Cream | `library-designs` | 450-524 | `node scripts/frames.mjs library --strip Cream` |
| Folio | `library-designs` | 525-599 | `node scripts/frames.mjs library --strip Folio` |
| Pixel | `library-designs` | 600-674 | `node scripts/frames.mjs library --strip Pixel` |
| Sketchbook | `library-designs` | 675-749 | `node scripts/frames.mjs library --strip Sketchbook` |
| Cobalt | `library-designs` | 750-824 | `node scripts/frames.mjs library --strip Cobalt` |
| Frost | `library-designs` | 825-899 | `node scripts/frames.mjs library --strip Frost` |
| Tray | `library-designs` | 900-974 | `node scripts/frames.mjs library --strip Tray` |
| Shout | `library-designs` | 975-1049 | `node scripts/frames.mjs library --strip Shout` |

<!-- /library:reel -->
