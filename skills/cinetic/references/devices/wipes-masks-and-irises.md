# Wipes, masks and irises

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Reveals with an edge: irises from a point on screen, feathered and stepped wipes, block bursts, pill breaths, windows that open inside the shot.

[Iris opens from a point already on screen](#iris-opens-from-a-point-already-on-screen) · [Flat blocks burst out and reveal the next shot](#flat-blocks-burst-out-and-reveal-the-next-shot) · [Pixel-staircase wipe stepped on twos](#pixel-staircase-wipe-stepped-on-twos) · [Ring of pixel blocks expands and reveals](#ring-of-pixel-blocks-expands-and-reveals) · [Soft ring swirls in and frames the statement](#soft-ring-swirls-in-and-frames-the-statement) · [The next shot arrives as an LED dot matrix, then melts solid](#the-next-shot-arrives-as-an-led-dot-matrix-then-melts-solid) · [Title fills with the next image and takes over](#title-fills-with-the-next-image-and-takes-over) · [Two discs converge and their overlap opens a world](#two-discs-converge-and-their-overlap-opens-a-world) · [Halves part like doors and the next card rises through](#halves-part-like-doors-and-the-next-card-rises-through) · [Next shot opens as a window; the old shot steps back](#next-shot-opens-as-a-window-the-old-shot-steps-back) · [UI revealed inside a growing circle whose edge is a band of light](#ui-revealed-inside-a-growing-circle-whose-edge-is-a-band-of-light) · [Picture in a pill mask breathes, then closes into the cut](#picture-in-a-pill-mask-breathes-then-closes-into-the-cut) · [Soft feathered wipe that decelerates](#soft-feathered-wipe-that-decelerates) · [A text-height slot opens behind the line onto the photo](#a-text-height-slot-opens-behind-the-line-onto-the-photo) · [A colour block wipes the line on and lingers](#a-colour-block-wipes-the-line-on-and-lingers) · [Concentric squares radiate at constant speed](#concentric-squares-radiate-at-constant-speed) · [Panel pushes the shot off in two stages](#panel-pushes-the-shot-off-in-two-stages) · [A soft light band carries the old graphic out](#a-soft-light-band-carries-the-old-graphic-out) · [Frame halves flip to a new ground in turn](#frame-halves-flip-to-a-new-ground-in-turn) · [Scene emerges from white, hero first](#scene-emerges-from-white-hero-first)

### Iris opens from a point already on screen

`dv-iris-open` · signature · energy medium · any · primitive: Iris

A circle opens from the object the eye is on (the gap between two words, a sparkle, the centre of a pixel field, the space under a header) and grows by a constant ratio a frame (x1.28 at 60 fps, x1.63 at 30) until it passes the corners, revealing the next scene already moving inside; a scalloped cloud edge makes the matte the subject; it can start already 40 % wide and cover in 4 frames; a pill can widen on an ease-in as the wind-up. **When:** Section changes; reveals from a word or a dot. **Avoid:** Eased irises that start invisible.

- **Anatomy:** r0 about 22 px (visible on frame one), constant ratio; scallop 9 lobes at 6-8 % depth with an 8-12 px feather; inner scene zooming; porthole variant under a header.
- **Timing:** 8-18 f to the far corner; cloud iris 74 f in two phases (40 f expo-out, 30 f ease-in to overfill).
- **Sound:** A glockenspiel note or an orchestral stab on the first frame.
- **Build:** `<Iris mode="rate" originFrom scallop>`.
- **Materials and numbers:** Scalloped iris: about 10 round lobes on the rim (lobe radius about 0.18 of the radius), edge feathered 8-12 px; it grows from about 140 px to past the frame over 72 f (ease-in, then fast) while the footage inside is already moving; the shape that started it becomes a hole in the ground colour.

### Flat blocks burst out and reveal the next shot

`dv-block-burst-wipe` · signature · energy high · launch, feature · primitive: BlockStep

Hard-edged blocks take over the frame: outlined square blocks explode radially out of an icon and cover the frame, revealing a textured field; blocks retreat to one edge in steps while the next frame decodes; after a click, stepped white rectangles grow out of the button leaving a dark window around it; flat rectangles in two colours pop at random places for 1-2 frames each, the next shot showing through. **When:** A click that changes everything; playful, graphic brands. **Avoid:** Gradient or glowing blocks.

- **Anatomy:** Coverage 8.7 -> 95 % in 10 f, or +12-16 % a frame; blocks 280-560 px wide; 2-4 new blocks a step.
- **Timing:** 12-29 f.
- **Sound:** A bubble pop; a UI click; a drum cluster.
- **Build:** `<BlockStep blocks>` with a seeded block list growing from the source box.

### Pixel-staircase wipe stepped on twos

`dv-pixel-stair-wipe` · signature · energy medium · launch, feature · primitive: StairWipe

A wipe in the next scene's colour built from 22-23 px square blocks advances diagonally with a random staircase edge, stepped on twos, with a faint fringe; or horizontal bands of the next scene slide in over the old with a dither-staircase edge. **When:** Image or pixel-flavoured films; a beat with crunchy clicks. **Avoid:** Smooth films.

- **Anatomy:** Coverage 0.3 -> 22 -> 62 -> 85 -> 99 % on 12.5 fps steps, 80 % in the middle 0.36 s; cells 8-23 px.
- **Timing:** 16-55 f.
- **Sound:** A riser peak; crunchy clicks under the steps.
- **Build:** `<StairWipe at color outgoing incoming>` (fx/Grids): 22 px blocks advance diagonally (35 deg) with a seeded staircase edge (12 %), stepped at 12.5 fps, 80 % of the coverage in the middle on M.pixelStair (55 f); a fringe of blocks in the next scene's colour leads it (`fringeAlpha={1}` for a solid accent edge); a wipe seam.
- **Build (bands):** `<DitherBands at outgoing incoming>` (fx/DitherBands): six wide rectangles (2.5-7 times wider than tall) open from their own centres, born over the first 45 % of the run, their rims an ordered dither of 10 px cells 0.06 of the frame height deep; 16 f at 60 fps on E.stdInOut, every frame a step (declared), a wipe seam on the last. Works on any two scenes, no photo; it reads only between grounds that differ (type on paper into a UI, light into dark). `frames={3}` for a dither cut hidden in a zoom jump.

### Ring of pixel blocks expands and reveals

`dv-mosaic-ring-iris` · signature · energy high · launch, sting · primitive: MosaicIris

A ring of random accent-family mosaic blocks (165-240 px thick, soft-edged) grows from the centre; inside it the next scene (the logo) shows through. **When:** A logo reveal; image products. **Avoid:** Multi-hue blocks outside the accent family.

- **Anatomy:** Annulus of cells (24-36 px), ragged edges, colours re-picked on twos; accelerating outward.
- **Timing:** 18 f.
- **Sound:** A whoosh and a hit.
- **Build:** `<MosaicIris>`.

### Soft ring swirls in and frames the statement

`dv-blob-ring-frame` · signature · energy medium · launch, feature · primitive: BlobRing

A thick soft ring of one colour swirls in within 4 frames (a streak, an arc, a full ring) and becomes a vignette with an elliptical hole around the text, then breathes. **When:** Two or three section changes into a statement. **Avoid:** More than three per film.

- **Anatomy:** Swirl 8 f; hole 0.74 x 1.12 of the frame; breathe 44-136 f.
- **Timing:** Swirl 8-12 f; breathe 44-136 f.
- **Sound:** None needed.
- **Build:** `<BlobRing>`.
- **Materials and numbers:** The brush blob under a word starts spinning, collapses edge-on into a thin vertical streak for one nearly empty frame, reappears as a thick open arc round the next word (ring thickness about 25 % of its radius), then grows about 3x a frame for 3-4 frames past the frame edge and settles as a breathing vignette (hole about 1250 x 1000 px). Ring body blurred 40-60 px with a lighter inner edge feathered 150-250 px; the words inside go from grey to ink and the accent word from a pale tint to the accent.

### The next shot arrives as an LED dot matrix, then melts solid

`dv-dot-matrix-arrival` · signature · energy high · launch, sting · primitive: DotMatrix

Over the current shot the coming one appears first as round dots on a regular grid, each dot the colour of the incoming picture at that cell, in blob and band shapes that grow frame by frame (an ellipse, then full-width bands); the gaps still show the outgoing shot, so the two interleave cell by cell; then the solid image fades in under the dots and the dots go. **When:** A cut into a screen, a product UI or a digital world; once per film. **Avoid:** Calm films; a pixelate cut in the same act.

- **Anatomy:** Cell 12 px, dot radius 4.5 px; mask = a soft ellipse (scale 0.3 -> 1.2) plus rows switching on by a seeded hash, stepped rather than smooth; the solid image under the dots, then the dots off.
- **Timing:** About 28 f: first cluster 2 f, mask growth 14 f, solid fade 8 f, dots gone in 6 f.
- **Sound:** A tick cluster under the music.
- **Build:** `<DotMatrix src x y w h at cell={12} r={4.5} centre ellipse={[0.3, 1.2]} rowsFrom={0.35} band={3} grow={14} solid={8} gone={6} seed>` (fx/DotMatrix) laid over the outgoing shot: one canvas of dots in the picture's own colours (sampled once), a blob growing on twos plus seeded bands of rows, then the solid picture under the dots; declared stepped; dotMatrixFrames() for the cues.
- **Materials and numbers:** The dots keep the picture's own colours; the gaps show the outgoing plate, never black.

### Title fills with the next image and takes over

`dv-type-window` · signature · energy high · launch, sting · primitive: Window

A title pushes in accelerating, punches +11 % in one frame, its letters fill with the next image, giant echo copies appear, and the image takes over the frame. **When:** The title before the main section. **Avoid:** Thin letters.

- **Anatomy:** Push +6 % accelerating; punch 1 f; window 23 f; step-out 1 f.
- **Timing:** 95 f in all.
- **Sound:** A drum hit at +45 dB on the step-out.
- **Build:** `<TypeWindow>` (letters as the window, stepped growth) with a SnapZoom punch.

### Two discs converge and their overlap opens a world

`dv-vesica-portal` · signature · energy medium · launch, sting · primitive: recipe (plain layers)

Two dark spheres slide together until only their lens-shaped overlap remains at the centre, rimmed in light, and the next world shows through that overlap. **When:** Two ideas meeting; a hero reveal. **Avoid:** Discs that do not read as objects.

- **Anatomy:** Intersection of two circles as the mask; quad in-out.
- **Timing:** 12 f at 60 fps.
- **Sound:** The beat (+10 ms); a glockenspiel just before.
- **Build:** Recipe: an SVG mask made of the intersection of two circles (clipPath inside clipPath), positions in closed form.

### Halves part like doors and the next card rises through

`dv-door-split-rise` · signature · energy medium · launch, feature · primitive: doorSplitState

The next card peeks up 31 px from the bottom edge as a preview, then the two halves of the current layout accelerate off left and right like doors, and the card rises through the gap. **When:** Introducing the next product surface. **Avoid:** Halves with content that splits a word.

- **Anatomy:** Peek 32 px; doors on the measured path (each step about x1.5 the last, leaving at speed); the card rides up from the bottom edge a third into the doors' run, peaks with them, decays home.
- **Timing:** Peek 12 f; doors 30 f; rise 50 f.
- **Sound:** A pop, a hit, a punchy accent.
- **Build:** doorSplitState({ start, rise: { top } }): the halves' offset and the card's `rise`; draw the card above the halves.

### Next shot opens as a window; the old shot steps back

`dv-window-step` · signature · energy medium · launch, feature · primitive: Window

A rectangle opens around the product showing the next shot at 1:1 while the old shot shrinks into a card on paper in a few held steps; or a framed photo unfolds from portrait to landscape in two stages. **When:** Product-to-world transitions; a framed image growing. **Avoid:** Smooth tweens (the steps are the look).

- **Anatomy:** Old shot 1 -> 0.94 -> 0.80 on 16 fps holds; window grows each step.
- **Timing:** 15-48 f.
- **Sound:** Sub-bass and a kick.
- **Build:** `<Window rects oldScale cadence>`.

### UI revealed inside a growing circle whose edge is a band of light

`dv-light-front-iris` · signature · energy medium · launch, feature · primitive: Glow (LightFront)

After the logo, the product UI appears inside a circle growing from a corner of the panel, and the circle's edge is a band of light rather than a line: the UI brightens to white at the front, saturates to the accent behind it, then falls off to the ground like a scanner passing, and the UI under the band keeps full detail. **When:** The first product reveal from a corner or a sidebar. **Avoid:** Dark-on-dark with no accent; repeated reveals.

- **Anatomy:** Radius expo-out from about 150 px to beyond the diagonal; edge band 90-120 px: an inner white wash at +60 % luminance, the accent at 70 % alpha in the middle, an outer fade to the ground; the ring thins and fades as it leaves the frame.
- **Timing:** 76 f; the cut on an 8th.
- **Sound:** Cut on an 8th onset.
- **Build:** `<LightFront at cx cy dur60={76} band={110}>{incoming}</LightFront>` (fx/Glow): the incoming shot inside a circle growing to the farthest corner on E.stdInOut, whose edge is a dithered band of light (white at the front, the accent behind it, falling to nothing) screen-blended over the content, so the UI under the band keeps its detail.
- **Materials and numbers:** The band is screen-blended over the UI, never replacing it.

### Picture in a pill mask breathes, then closes into the cut

`dv-pill-breath` · workhorse · energy medium · any · primitive: MorphChain

A photo sits in a stadium mask that stretches open front-loaded (90 % in 8 f), holds, then contracts on an ease-in into the cut. **When:** Photo-led openers; framing a picture before the next shot. **Avoid:** Holding too long (6-12 f).

- **Anatomy:** Open 455 -> 685 px or near-circle -> 1371 px; hold 6-12 f; contract to 0.86 of its width.
- **Timing:** Open 40-44 f; hold 12 f; contract 20-22 f.
- **Sound:** Cut-in on a level jump; out on a shutter.
- **Build:** pillBreath(f, { stretch, hold, contract }) + Window for the next shot.

### Soft feathered wipe that decelerates

`dv-feather-wipe` · workhorse · energy calm · any · primitive: Wipe

A field with a very soft edge (a 330-380 px feather, 18 % of the width) travels across the frame and decelerates; variants: a white field thrown up from the bottom in 3 accelerating frames; a defocused photo flooding in from one side; darkness descending from the top until black; a soft gradient front revealing a card that grows behind it; images not yet covered can take a tint. **When:** Soft section changes; revealing an answer. **Avoid:** Hard-edged wipes for calm films (and vice versa).

- **Anatomy:** Feather 10-90 % over 330-380 px; edge speed 269 -> 101 px/f; top leading bottom by about 6 f for a darkness fall.
- **Timing:** 6-38 f (house 30 f on E.softOut).
- **Sound:** An orchestral stab on the first frame; a sub-drop 3 f ahead.
- **Build:** `<Wipe kind="feather" feather={350}>`.
- **Materials and numbers:** The photos first take a gradient-map cast that creeps in from the top-left (shadows deep, mids pink, highlights warm, strength 0 -> 70 % over 24 f), then a broad soft white wash crosses left to right (feather about 40 % of the panel width, accelerating); just ahead of the white the photos turn warm, and the warm front rhymes with the palette of the sentence that follows.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### A text-height slot opens behind the line onto the photo

`dv-slot-behind-line` · accent · energy medium · launch, feature · primitive: recipe (plain layers)

On the word swap a hard-edged slot exactly the height of the text opens behind the line and shows the coming photo; the type flips from grey to white inside it and the caret becomes a selection block for one frame; later the photo fills the frame. **When:** A line that introduces imagery: a new way to see. **Avoid:** Multi-line copy.

- **Anatomy:** Slot about 9 % of the frame tall with hard edges, the photo blurred 4 px inside it; text ink -> white as the slot opens; caret block about 0.6 em at 40 % for 2 f; the full frame fades in 40 f later.
- **Timing:** Caret block 2 f, slot fades in 6 f, colour flip 2 f, full frame over 40 f.
- **Sound:** The music returns on the reveal hit after a short dropout.
- **Build:** Photo clipped by an inset to the line's band, a colour step on the text, then a full-frame Photo fade.

### A colour block wipes the line on and lingers

`dv-colour-block-wipe-on` · accent · energy medium · launch, feature · primitive: Wipe

A block shoots across a line (its leading edge covering 400 px in 3 frames), leaving the words behind it, its trailing edge slower; on the second line it lingers on the last word, which cools from the block's colour. **When:** A tagline on. **Avoid:** A second multi-hue run in the same film.

- **Anatomy:** Lead edge fast, trail edge 3x slower; words cool 15 f.
- **Timing:** Lead 8 f; trail 23-50 f.
- **Sound:** A pop.
- **Build:** Two Wipe edges (lead and trail) with different speeds; words revealed behind the lead.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Concentric squares radiate at constant speed

`dv-radiating-squares` · accent · energy medium · launch, sting · primitive: Radiate

Square outline rings are born at the centre every few frames and expand at a constant speed, thick strokes and wide gaps, like a pulse leaving the centre. **When:** A hub, an end card, a "broadcast" moment. **Avoid:** Easing the expansion (constant speed is the look).

- **Anatomy:** Births every 4-6 f; 38 px/f; stroke about 75 px, gap about 98 px at birth.
- **Timing:** 70 f.
- **Sound:** None.
- **Build:** `<Radiate start x y color stroke={75} speed={15}>` (fx/Grids): square (or `shape="circle"`) rings born every 10-15 f (seeded, or `births` on the beat), growing at one constant speed; `swallow={{ at }}` thickens them until only hairline gaps remain. `bornAt={54}` pops each ring in as a solid square that opens (no tiny first frame); `speeds` gives rings their own speeds (the first a little slower reads as a pulse, not a pattern); `flood={{ at }}` fills the centre with a solid square growing ×1.09 a frame until it covers the frame, the hand-off to a full-colour end card.

### Panel pushes the shot off in two stages

`dv-panel-push-wipe` · accent · energy medium · any · primitive: Wipe

A solid panel wipes in from one side to half the frame, holds while something starts inside it (typing begins), then completes the wipe; or a coloured panel floods one side in the last frames; or a hard-edged panel wipes across in 3 frames already carrying the next word. **When:** Moving from footage to product UI; a beat that needs a hard graphic change. **Avoid:** Gradient panels that are not baked and dithered.

- **Anatomy:** Stage 1 expo-out to half, near-hold 8 f, stage 2; hard wipe 0 -> 58 -> 74 -> 95 % coverage.
- **Timing:** 44 + 48 f; hard wipe 8 f + settle 13 f.
- **Sound:** Voice; a riser into stage 2.
- **Build:** `<Wipe kind="push">` (its house stages are this device: arrival to 0.483 of the frame in 54 f, creep, leave in 42 f at speed, the footage riding 0.62 of the edge, the edge streaking 0.3 of its step); `stages` for other runs.
- **Materials and numbers:** Both layers smear: at the fastest frames the entering panel and the pushed footage carry a horizontal blur of 25-35 px (blur = speed x 0.3), the footage pushed at 0.64x the edge speed and the panel's edge soft over about 30 px; the blur is gone by the park, 24 f in.

### A soft light band carries the old graphic out

`dv-light-band-wipe` · accent · energy medium · any · primitive: LightSweep

The diagram slides out on an expo-in while a soft band of light travels across the frame, accelerating, taking the old graphic with it. **When:** Clearing a diagram or chart. **Avoid:** A glow that is not part of the band (a halo round type).

- **Anatomy:** Band about 0.45 of the width; ease-in.
- **Timing:** 44 f.
- **Sound:** Voice.
- **Build:** `<LightSweep frames={44} gain={0.55}>` + the diagram's exit on E.launchIn. Recipe: an SVG fractal-noise filter stretched vertically (baseFrequency 0.06 x 0.0015) coloured to the accent, masked by a horizontal gradient, translated; bake it as a plate for render speed.
- **Materials and numbers:** The light is textured: fine vertical streaks (6-20 px, plus or minus 15 % luminance) run through the band like a light curtain or a long-exposure aurora, its edge falling off to black over about 300 px; it drifts slowly, then accelerates across as the wipe (about 44 f).

### Frame halves flip to a new ground in turn

`dv-split-flip-frame` · accent · energy high · launch, sting · primitive: HardStep

The left half of the frame flips to a new ground for 3 frames, then the right half (the left reverting), then the whole frame. **When:** A rhythmic flip into an end section. **Avoid:** More than one per film.

- **Anatomy:** Hard halves, one beat each.
- **Timing:** 6 + 8 f, then full.
- **Sound:** A snare, then a whoosh.
- **Build:** HardStep on two half-frame layers.

### Scene emerges from white, hero first

`dv-emerge-from-white` · accent · energy calm · launch, feature · primitive: Develop

A 3D room emerges from a white frame centre-out: the desk gains colour first, then the floor, the right wall, the ceiling, the window. **When:** Revealing a set or a product scene. **Avoid:** Without separable regions.

- **Anatomy:** Per region masks developing in order of importance.
- **Timing:** 24 f power-out.
- **Sound:** A reverse-cymbal riser.
- **Build:** Develop per region (each region a mask over the plate) with starts in order.
