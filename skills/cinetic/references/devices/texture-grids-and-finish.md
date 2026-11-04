# Texture, grids and finish

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Grounds that keep empty space active: hairline grids, cell waves, screen textures, grain, stepped cadences. Glyph fields (pictures and edges drawn in characters), halftone and dot-matrix screens and living line art belong here.

[A band of glyphs traces every subject's edge](#a-band-of-glyphs-traces-every-subject-s-edge) · [Symbol string tiles the frame and resolves into an ASCII object](#symbol-string-tiles-the-frame-and-resolves-into-an-ascii-object) · [Grid cells switch on in a wave](#grid-cells-switch-on-in-a-wave) · [Hairline layout grid as the ground](#hairline-layout-grid-as-the-ground) · [Grain and print texture as the picture's finish](#grain-and-print-texture-as-the-picture-s-finish) · [A portrait drawn in two digits under a rising gradient](#a-portrait-drawn-in-two-digits-under-a-rising-gradient) · [Design-tool guides that track a mask's bounding box](#design-tool-guides-that-track-a-mask-s-bounding-box) · [Accent blocks jump between grid cells on kicks](#accent-blocks-jump-between-grid-cells-on-kicks) · [Halftone, ASCII and dither as the picture's texture](#halftone-ascii-and-dither-as-the-picture-s-texture) · [Line-art pattern fills the end card](#line-art-pattern-fills-the-end-card) · [A fan of curves that keep vibrating like strings](#a-fan-of-curves-that-keep-vibrating-like-strings) · [Dither-pixel patch licks up through outlines](#dither-pixel-patch-licks-up-through-outlines) · [Ground made of vertical bars](#ground-made-of-vertical-bars) · [A patch of light carrying a lattice sweeps under the text](#a-patch-of-light-carrying-a-lattice-sweeps-under-the-text) · [Dot grid seen only under wandering light](#dot-grid-seen-only-under-wandering-light) · [Faint concentric rings behind the subject](#faint-concentric-rings-behind-the-subject) · [Coarse pixel-mosaic ground behind UI](#coarse-pixel-mosaic-ground-behind-ui) · [Picture sliced into offset slats](#picture-sliced-into-offset-slats) · [Rim highlight from a fixed light](#rim-highlight-from-a-fixed-light) · [A thick soft stroke travels across the lower third](#a-thick-soft-stroke-travels-across-the-lower-third) · [Particles pop in during a voice pause](#particles-pop-in-during-a-voice-pause) · [Photo cards with a mat and a thin coloured outline](#photo-cards-with-a-mat-and-a-thin-coloured-outline)

### A band of glyphs traces every subject's edge

`dv-ascii-edge-halo` · signature · energy medium · launch, sting · primitive: GlyphField

Around every subject of a photo or plate a band of tiny white monospace glyphs hugs the silhouette like a typed outline (the heaviest glyph at the strongest edge, lighter ones further out, dots bleeding inside); it re-samples every frame so it shimmers as the plate moves, and before a cut it flares, wider, heavier and brighter, and the frame breaks into blocks. **When:** Generated imagery, vision and generation products; plates that need a signature texture. **Avoid:** UI shots; small subjects.

- **Anatomy:** Cells 13.5 x 14 px at 1080p, fixed to the screen; the glyph picked by edge strength on a blurred luma: over 0.6 a zero, 0.4-0.6 a small o, 0.2-0.4 a colon, 0.1-0.2 a dot, else empty; white at 0.75-0.9; the band sits mostly outside the silhouette (2-4 cells). Flare: threshold 0.4 -> 0.1 and alpha 0.6 -> 1 over 12 f into a pixelate cut.
- **Timing:** Lives for the plate; flare 12 f, then the pixelate.
- **Sound:** None of its own; the flare rides the rising whoosh into the hit.
- **Build:** `<GlyphField mode="edge" src cols={120} threshold={0.2} resample={[2, 4]} flare={{ at, dur: 12 }} color>` (fx/GlyphField): Sobel edges on a blurred luma grid, the heaviest glyph on the strongest edge, angle glyphs on straight edges, the band carried outside the subject by a spread halo; the flare widens and brightens it before the cut.
- **Materials and numbers:** On strong straight edges the glyph follows the edge angle (tall glyphs on vertical edges, round ones on curves).

### Symbol string tiles the frame and resolves into an ASCII object

`dv-ascii-globe-resolve` · signature · energy high · launch, sting · primitive: AsciiField

A short string of symbols repeats in a grid that fills the panel, turns into character columns, and resolves into a flickering ASCII-dither globe. **When:** A film about the web, data or the world; a title reveal from code. **Avoid:** Without a plate to convert.

- **Anatomy:** Grid of characters; columns; luminance mapped to a glyph ramp; style flicker every 1-3 f.
- **Timing:** Settle 63 f; flicker every 3-8 f at 60 fps.
- **Sound:** None needed.
- **Build:** `<AsciiField at x y w h src color>` (fx/Ascii): the symbol string tiles the panel, turns into seeded character columns (from 22 f), the picture resolves through a dark-to-light glyph ramp (from 44 f, settled by 63) and flickers like a dither: about 6 % of the cells swap to a ramp neighbour every 3-8 f.

### Grid cells switch on in a wave

`dv-grid-cell-wave` · workhorse · energy medium · any · primitive: CellWave

Cells on a fixed grid switch on outward from a centre (each at one of a few random opacities), fade in as a radial wave and out centre-first, appear radially around a hub in a few steps, materialise in a diagonal wipe from a corner (duotone first, then colour), or multiply outward from one coloured cell. **When:** Openers, backgrounds that build, galleries of thousands, "it scales". **Avoid:** Cells that move (they only switch).

- **Anatomy:** Radial or diagonal threshold over a static grid; per-cell opacity from 5 levels (15-100 %); on twos for the first frames, then ones; cell 40 px on a 72 px pitch, or 60 px icons on a 95 px pitch.
- **Timing:** 23-75 f; each cell 40 f in-out; wave 20 f across; diagonal onset +1 f per column, +1.4 f per row.
- **Sound:** An onset on the wave; a sub on the gallery; a hit on the radial step.
- **Build:** `<CellWave at cols rows x y color shape="radial"|"diagonal">` (fx/Grids): cells switch on outward from `origin` at one of five seeded strengths (15-100 %), radial on E.buildIn over 23 f (on twos for the first 8 f) or diagonal (+1 f per column, +1.4 per row); `fade={40}` for a slow in-out, `out={{ at }}` leaves centre-first; `render(cell)` puts a thumbnail in each cell.
- **Materials and numbers:** As cells multiply each holds the spreadsheet overflow mark in a dark tone; the clicked centre cell is the full accent and each ring of neighbours a lighter tint (five steps), so the wave reads as a heat map of distance; rows added every 5-6 f.

### Hairline layout grid as the ground

`dv-hairline-grid-ground` · workhorse · energy calm · any · primitive: recipe (plain layers)

A faint layout grid keeps empty space active: dashed grey cells on black that scale with the camera, a cutting-mat grid, hairlines a few percent darker than the page, guides with tiny square markers at intersections, grid paper with ruler ticks, a 1 px grid with small crosses at card corners, white rounded squares on near-white, a thin grid over photos; a wireframe grid of rectangles and nodes can pan and zoom. **When:** Product, tool and design films; any minimal ground that needs structure. **Avoid:** Grids strong enough to read as content (keep lines 3-8 % off the ground).

- **Anatomy:** Cells 16-210 px; 1 px lines; optional heavier line every 5 cells, tick marks on edges, crosses or nodes at intersections; the grid either moves with the camera or stays fixed while the content moves (a fixed grid reads as the screen).
- **Timing:** Static; moves with the camera; a wireframe grid pans over 158 f.
- **Sound:** None.
- **Build:** Recipe: a static SVG pattern (or a baked plate) inside the camera transform; markers as small rects at chosen intersections.
- **Materials and numbers:** The dashed grid can be barrel-curved like a lens (each point pushed out by 1 + 0.06 d^2 from the centre, about 12 px of sag at the frame edges) and the curve swims as the camera pushes; dashes 14 px with 8 px gaps, 1 px mid-grey, cells about 210 px.

### Grain and print texture as the picture's finish

`dv-grain-and-print-texture` · workhorse · energy calm · any · primitive: recipe (plain layers)

Images carry visible grain, low-contrast highlights and soft focus while vector type stays razor sharp on top; white type over imagery carries a speckled, slightly broken print texture; a near-black stage carries a barely visible vertical micro-texture (3-5 % luma). **When:** Editorial, image-led or dark tech films. **Avoid:** Grain on UI text; texture strong enough to read.

- **Anatomy:** Grain changing every frame; print speckle static; micro-texture most visible near the hero's glow.
- **Timing:** Grain every frame; others static.
- **Sound:** None.
- **Build:** Recipe: cycled grain plates (seeded), a static speckle mask on the type, a baked micro-texture plate.

### A portrait drawn in two digits under a rising gradient

`dv-glyph-portrait-gradient` · accent · energy medium · launch, sting · primitive: Ascii (extension needed: TypeFill)

A picture is set as a terminal dump of monospace digits: one digit fills the ground, the other draws the figure in two-by-two blocks like pixel art, and a vertical gradient (white at the top, the accent at the bottom) rises through the glyphs until the card is accent on accent. **When:** Developer, data and scraping products; the moment a card turns into what the machine sees. **Avoid:** A film that already leans on a glyph texture elsewhere.

- **Anatomy:** Glyph cap about 14 px at 1080p, pitch about 17 px; the figure from a 1-bit bitmap on a grid of two-by-two glyph cells; fill = a gradient clipped to the glyphs whose top edge rises from 100 % to -20 % of the card; afterwards the glyphs are a pale tint of the accent on the accent.
- **Timing:** Gradient rise 50 f expo-out, texture holds 75 f.
- **Sound:** The card morph sits on a kick.
- **Build:** AsciiField with a bitmap source and a two-glyph ramp, its glyph layer used as a mask over a baked dithered gradient plate that rises by transform.
- **Materials and numbers:** Stops: near-white at the top edge, then the accent, then a deeper accent at the bottom; glyph colour after the rise = the accent mixed 25 % toward white.

### Design-tool guides that track a mask's bounding box

`dv-tracking-guides` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

Behind a masked photo the faint lines are not a fixed grid: exactly two vertical and two horizontal hairlines sit on the edges of the mask's bounding box, extended across the frame, and they move with it as the mask breathes, like the guides of a design tool. **When:** A shape-led identity; design and layout products; any masked hero image. **Avoid:** Busy grounds; together with a full grid.

- **Anatomy:** Lines 2 px at 1080p, about 10 luma off the ground, no blur; locked to the mask on every frame (no lag); they inherit the mask's breath and its contraction into the cut.
- **Timing:** As long as the mask: breath out 40 f, hold, in 10 f.
- **Sound:** A shutter click on the cut right after the contraction.
- **Build:** Recipe: four SVG lines placed from the mask's rect each frame.

### Accent blocks jump between grid cells on kicks

`dv-grid-blocks-on-kicks` · accent · energy high · launch, feature · primitive: BlockStep

Solid accent blocks exactly one grid cell in size sit in the page grid forming steps and L shapes, and jump to new cells instantly, all together, on kicks. **When:** Grid-based brands; a beat-driven interlude. **Avoid:** Tweening the blocks.

- **Anatomy:** Blocks of one cell (192 px at 1080p); arrangements from a seeded table indexed by kick count.
- **Timing:** 0 f transitions; rearrangements 13-25 f apart.
- **Sound:** Kicks.
- **Build:** HardStep positions from a table of cells indexed by the kick list.

### Halftone, ASCII and dither as the picture's texture

`dv-screen-texture` · accent · energy calm · launch, feature · primitive: GlyphField / AsciiField

Pictures carry a print or screen texture: a grid of glyphs from a brightness ramp sits over the dark areas of images and re-samples irregularly; silhouettes are filled with a fine dot screen; clouds show a halftone in their shadows under a giant translucent wordmark; a light dot grid overlays a defocused photo; small dither pixels sparkle around subjects' edges. **When:** Image-generation, print, editorial or retro-tech films. **Avoid:** Texture on readable type.

- **Anatomy:** Dot pitch about 4 px at 1080p; glyph ramp . : o O 0; re-sample every 2-7 f (a soft flicker).
- **Timing:** Static per frame or re-sampled every 2-7 f.
- **Sound:** None.
- **Build:** `<GlyphField mode="halftone" src triads invert>` (8 px pitch, r = r_max x sqrt(1 - luma), phosphor triads on edges) or `<AsciiField>` for the glyph grid; `resample={[2, 7]}` for the irregular re-sample. Also `<DitherPhoto src inks cell={3}>` (fx/Textures): a photo printed in 2-4 inks through Bayer or blue-noise dither that can develop into the true photo through the same thresholds; `<GradientField levels={4}>` posterises a field with a visible ordered dither.
- **Materials and numbers:** Up close the halftone figures are printed in phosphor triads: the dot screen breaks into red, green and blue dots at the edges (8 px pitch, 3 px dots) with a grey core; on a mosaic glitch frame a fine dot grid at 25 % sits over the flat blocks like an LED wall. A frosted bar over a halftone sky averages the screen into soft colour (blur larger than the dot pitch).
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.

### Line-art pattern fills the end card

`dv-line-art-endcard-pattern` · accent · energy calm · launch, sting · primitive: recipe (plain layers)

Large thin outlines (2-3 px) of a motif in a lighter tint of the accent fill the end card behind the title and logo. **When:** End cards on a full accent field. **Avoid:** Motifs unrelated to the brand.

- **Anatomy:** Static line art, drifting with the card.
- **Timing:** Static.
- **Sound:** None.
- **Build:** Recipe: an SVG line-art layer inside the end card's drift. Recipe: interpolate between a few hand-drawn key paths on a 24 f cycle, or offset each point by noise(i, f).
- **Materials and numbers:** The line art is alive: the outlines behind the end card keep morphing (tongues stretch, curl and change silhouette, 4-8 px of tip travel a frame) so the field flickers gently like a drawing of fire; stroke about 4 px at 1080p in a pale tint of the ground's hue at about 45 % contrast, round joins, no fill.

### A fan of curves that keep vibrating like strings

`dv-string-curve-fan` · accent · energy calm · launch, feature · primitive: no primitive yet (recipe below)

From a hub (an app icon, a node) about sixteen curves fan out to the left and right and never freeze: their amplitudes swell and relax slowly, so they cross each other like vibrating strings or a moire; curves near the axis are saturated and thick, the outer ones thin and pale. **When:** Connection, sync, everything flowing into one; behind a hub while the VO speaks. **Avoid:** Under text; next to another line texture.

- **Anatomy:** Cubic curves from the hub's edge to the frame edge; stroke 2.5 px in the accent at the axis down to 1 px at 30 % outermost; amplitude oscillates 10-20 % on a 2-3 s period with a phase per curve; mirrored on the other side.
- **Timing:** Continuous for 3-6 s.
- **Sound:** VO only.
- **Build:** Recipe: 16-32 SVG paths recomputed each frame from closed-form amplitudes.
- **Materials and numbers:** Opacity and width fall linearly with the curve index; every curve converges exactly on the hub's edge.

### Dither-pixel patch licks up through outlines

`dv-dither-patch-sweep` · accent · energy medium · launch, sting · primitive: GlyphField

A patch of light dither pixels (small crosses) sweeps from bottom to top through a line drawing and dies out; the same burst repeats once. **When:** End cards with line art; a "spark" without sparkles. **Avoid:** Coverage above about 5 %.

- **Anatomy:** Coverage 0.9 -> 4.2 -> 0.8 %; bursts 21 f apart.
- **Timing:** 30 f per burst.
- **Sound:** A stab and a kick.
- **Build:** `<GlyphField mode="mask" path band={{ height: 0.45, speed: 6, life: 32, every: 52, count: 2, boxH }} color>` (fx/GlyphField): a seeded glyph band on the ramp . - = + x, clipped to the shape's path.
- **Materials and numbers:** A glyph patch licks up through a big shape and stays inside its outline: tiny light glyphs on a value ramp (dot < dash < equals < plus < x), denser in the middle and sparser at the edges, cells about 12 px at 1080p, colour a pale tint of the shape at 60-80 %; the band is about 45 % of the shape tall and scrolls about 6 px/f upward; each burst lives 32 f and repeats 52 f later.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.

### Ground made of vertical bars

`dv-fluted-bar-ground` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

The background is a field of flat vertical bars (about 100 px wide), each a single shade, so a soft glow reads as a stepped poster; or vertical stripes with soft light gradients like fluted glass. **When:** Brand-colour sections; checkout or store panels. **Avoid:** A second multi-hue field in the same film.

- **Anatomy:** Bars quantise a smooth field into steps; the glow can spread, sweep and wander.
- **Timing:** Spread 36 f; sweep 150 f; wander 244 f.
- **Sound:** None.
- **Build:** Recipe: render the light field into a few bands of flat colour (posterised horizontally), moved by transform. Shader or canvas: x quantised to 16 bars, band = smoothstep on the distance to a tilted line that moves, colour from a ramp at the bar's centre; the bars have hard edges, so banding is not an issue.
- **Materials and numbers:** The glow is a staircase, not a gradient: hard vertical bars, each one flat colour stepping from a warm deep tone through the accent to violet and black across the frame (about 16 bars), with a smooth fade to black vertically; the glow band slides and tilts so the bars light up and go dark in waves, like an audio meter under the music.
- **Conditions:** gradients baked as dithered plates and moved by transform; glass as a material with real frost or refraction, not a default card style.

### A patch of light carrying a lattice sweeps under the text

`dv-lattice-light-sweep` · accent · energy medium · launch, feature · primitive: LightField (extension needed: pattern)

Before a send, a patch of pale light holding a fine white honeycomb lattice sweeps across the prompt box under the text; the lattice is only visible inside the light, so its edges dissolve, and the text and chips stay crisp on top. **When:** The send or run moment of a prompt box; a processing beat. **Avoid:** Every send; dark text on a dark box.

- **Anatomy:** Light: a radial pale tint at about 70 % to transparent, about 420 x 300 px; hex cells about 55 px with 2 px white lines; travel about 30 px/f, decelerating.
- **Timing:** 28 f.
- **Sound:** The send whoosh.
- **Build:** Recipe: an SVG hex pattern masked by a moving radial gradient (a baked radial PNG as the mask) under the text layer, with a tint layer under the same mask.

### Dot grid seen only under wandering light

`dv-dot-grid-light-pools` · accent · energy calm · any · primitive: LightField

A black stage carries a fine dot grid that is only visible where two or three very soft light pools drift, so the ground breathes with light. **When:** Dark openers; tech films that want depth without objects. **Avoid:** Pools that move fast (keep them slow, every 6-18 f of drift).

- **Anatomy:** 12 px dot grid (luma 17-63) multiplied by the light pools (radius 300-500 px).
- **Timing:** Continuous.
- **Sound:** None.
- **Build:** LightField pools with the dot-grid plate as their mask (mix-blend multiply on a static grid layer).
- **Materials and numbers:** Lights tint the grid: in a dark grid room the lines near each glowing object take that object's colour and brighten (spill radius 150-250 px, near lines at about 200 luma, far lines 40-60), so the grid reads as lit by the objects and the tints move with them.

### Faint concentric rings behind the subject

`dv-concentric-rings-ground` · accent · energy calm · any · primitive: recipe (plain layers)

Very faint concentric ellipses or circles sit behind a word reveal or a centred line, sometimes with tiny accent satellites on them that rotate with a chip ring; a small concentric decal can sit under a hero core. **When:** Centred statements; orbit and ecosystem ideas. **Avoid:** Rings strong enough to read.

- **Anatomy:** 4-5 rings at a few percent contrast; satellites about 6 px.
- **Timing:** Static or rotating with the ring.
- **Sound:** None.
- **Build:** Recipe: static SVG circles; satellites placed by angle and rotated with the ring's closed-form angle.
- **Materials and numbers:** Echo rings follow the morph: as the page darkens the faint concentric circles brighten into lines and, in sync with the centre circle becoming a rounded card, stretch horizontally into concentric stadium outlines (straight segment 0 -> about 700 px in 10-12 f, in-out).

### Coarse pixel-mosaic ground behind UI

`dv-pixel-mosaic-ground` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

The background is made of large square cells (30-45 px) like a low-resolution image of a soft colour field, also used as a dithered strip. **When:** Image-generation brands; behind UI panels. **Avoid:** A second multi-hue field in the same film.

- **Anatomy:** Static cells.
- **Timing:** Static.
- **Sound:** None.
- **Build:** Recipe: a baked low-res plate scaled up with image-rendering pixelated.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Picture sliced into offset slats

`dv-slat-offset-picture` · accent · energy medium · launch, sting · primitive: Slices

A blurred figure is cut into 4-6 horizontal bands that are offset vertically by different amounts, so the image reads as a stepped, sliced object, then the offsets settle. **When:** Section breaks on a portrait or a picture. **Avoid:** Faces that must be read.

- **Anatomy:** Bands 150-250 px; offsets decaying 16 -> 1.5 px/f.
- **Timing:** 65 f ease-out.
- **Sound:** Under the hold.
- **Build:** `<Slices kind="slats" at x y w h n={5} spread={0.08}>{picture}</Slices>` (fx/Slices): 4-6 horizontal slats offset up and down by seeded amounts that settle to flat on E.snapOut (65 f).

### Rim highlight from a fixed light

`dv-fixed-rim-highlight` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

Every container has a 1 px hairline rim that is brightest at one spot, and the bright spot stays put as the container moves: the light source is fixed in the world. **When:** Floating cards in a soft, airy look. **Avoid:** Glass looks in house films.

- **Anatomy:** Rim highlight computed from the container's position relative to a fixed light.
- **Timing:** Static per shot.
- **Sound:** None.
- **Build:** Recipe: a conic highlight on the border whose angle is computed from the card's position against a fixed light point.
- **Materials and numbers:** A spectral rim: a black wordmark on a bright gradient carries a 1.5 px rim at about 0.8, warm on the edges facing the light and cool on the opposite edges (two offset text-shadows), and its interiors carry a faint vertical gradient instead of flat black.
- **Conditions:** glass as a material with real frost or refraction, not a default card style; the film's one spectral accent; gradients baked as dithered plates and moved by transform.

### A thick soft stroke travels across the lower third

`dv-gradient-sine-stroke` · accent · energy calm · launch · primitive: recipe (plain layers)

A thick blurred sine-wave stroke crosses the lower third and travels right at constant speed. **When:** A film whose one gradient is a line. **Avoid:** House films.

- **Anatomy:** Stroke graded across hues, constant speed.
- **Timing:** 90 f linear.
- **Sound:** None.
- **Build:** A baked, dithered stroke plate translated linearly.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Particles pop in during a voice pause

`dv-vo-pause-particles` · accent · energy calm · launch · primitive: recipe (plain layers)

On a dark stage with a breathing floor glow, small dots pop in about 2 f apart, each growing from 0.3 to 1 and drifting, while the voice pauses. **When:** Filling a pause in narration. **Avoid:** House films (particles are decoration).

- **Anatomy:** Dots 3-10 px; expo-out growth.
- **Timing:** Stagger 4 f; growth 30 f.
- **Sound:** The voice pause.
- **Build:** Recipe: seeded dot positions with closed-form growth and drift.
- **Materials and numbers:** Small white square motes (6-8 px, 75 %, 1 px blur, 5-8 at a time) drift about 1 px/f over the gradient during holds, each living 20-60 f, echoing the film's square marks.
- **Conditions:** gradients baked as dithered plates and moved by transform.
- **Ban-safe default:** Drop the motes; keep the gradient breathing. (the full look relies on particles; use it only when the brand supplies it)

### Photo cards with a mat and a thin coloured outline

`dv-matted-photo-card` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

Photos sit inside a white mat with a thin coloured outline that follows the outer radius, like framed prints in a wall. **When:** Masonry walls and galleries. **Avoid:** Heavy shadows on top.

- **Anatomy:** Photo radius about 24 px, mat 12 px, 2 px outline.
- **Timing:** Static.
- **Sound:** None.
- **Build:** Recipe: nested rounded rects; Cards with image.
