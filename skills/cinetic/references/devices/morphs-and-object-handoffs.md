# Morphs and object handoffs

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

The film moves from state to state through one object instead of a cut: text becomes a pill, a dot becomes a caret, a period becomes the next scene.

[Small element grows into the next scene](#small-element-grows-into-the-next-scene) · [Text collapses into an object](#text-collapses-into-an-object) · [The full stop becomes the next object](#the-full-stop-becomes-the-next-object) · [Whole frame collapses into a chip or card](#whole-frame-collapses-into-a-chip-or-card) · [A straight row curls into a ring](#a-straight-row-curls-into-a-ring) · [Old words step into depth, new words step out](#old-words-step-into-depth-new-words-step-out) · [Zoom into a letter until it fills the frame](#zoom-into-a-letter-until-it-fills-the-frame) · [Flat shape builds into a 3D object](#flat-shape-builds-into-a-3d-object) · [Letters replaced by product objects](#letters-replaced-by-product-objects) · [Small object becomes the next word, card or cell](#small-object-becomes-the-next-word-card-or-cell) · [A glyph detaches and becomes UI](#a-glyph-detaches-and-becomes-ui) · [A soft panel flies through the camera](#a-soft-panel-flies-through-the-camera) · [Letterbox window swings open in 3D, then flattens into a card](#letterbox-window-swings-open-in-3d-then-flattens-into-a-card) · [The swap hides in a blur peak](#the-swap-hides-in-a-blur-peak) · [Shape contracts and hands its outline to the next shot](#shape-contracts-and-hands-its-outline-to-the-next-shot) · [Object implodes into a point or vortex](#object-implodes-into-a-point-or-vortex) · [Parts detach and reassemble into a big shape](#parts-detach-and-reassemble-into-a-big-shape) · [Outgoing scene melts by defocus under the next](#outgoing-scene-melts-by-defocus-under-the-next) · [Tiles pass through a wireframe look](#tiles-pass-through-a-wireframe-look) · [Letters spread and double while the ground warms](#letters-spread-and-double-while-the-ground-warms) · [Tags dissolve through low-res pixels into dots](#tags-dissolve-through-low-res-pixels-into-dots) · [Side elements gather toward the centre into the cut](#side-elements-gather-toward-the-centre-into-the-cut)

### Small element grows into the next scene

`dv-grow-into-next-scene` · signature · energy medium · any · primitive: MorphChain

A tooltip pill, a single cell, an inline photo pill or a white button grows (exponentially or on an expo in-out) until it is the next scene; a button can become a porthole the next subject rises into. **When:** Opening a detail into its world; from a chip in a sentence to its full picture. **Avoid:** Growth that slows before the cover (it must accelerate into the frame).

- **Anatomy:** Growth x1.15 a frame while the centre moves to the frame centre; x2.44 in one frame for a cell; an inline pill accelerating its own growth in the last 7 f of a push.
- **Timing:** 14-48 f; the cover frame is the cut.
- **Sound:** Water drops then a sub-drop; an onset at the cover.
- **Build:** growThrough({ start, frames, from, to }) (E.buildIn); the porthole is Iris at the button's size with the next subject masked inside.
- **Materials and numbers:** A notch in a custom glyph of the wordmark becomes a slit that opens into the next shot: an 8 px sliver appears exactly in the notch, then widens into a photo band whose height grows 4, 6, 12, 20, 35, 50, 75, 95, 140 px (one value a frame at 30 fps, width leading height by about 8 f) while the wordmark greys and fades to 20 %.

### Text collapses into an object

`dv-text-collapses-to-object` · signature · energy medium · any · primitive: MorphChain

A finished line stops being text and becomes a thing: both ends rush to the centre while it thickens into a short fat pill (area kept), it is replaced by one solid bar of its size that slides into a chat pill, it blooms and squeezes into a small pill, it heats and collapses to a few dots that draw an icon, blocks advance and eat it from its end, or it is erased in chunks while a square grows in the cleared space. **When:** Moving from a statement to the product (the line becomes the input, the button, the icon). **Avoid:** Collapsing a line before it has been read.

- **Anatomy:** Width 258 -> 66 px, height 10 -> 28 (area constant) on a cubic-in; a solid bar for 3 f; dots for 2 f then strokes; chunks of 2-3 letters a frame.
- **Timing:** 10-50 f; the collapse itself 6-16 f.
- **Sound:** A lead-in to a kick; a kick on the eat; a click on the erase.
- **Build:** `<MorphChain states={[line, bar|pill|dots, object]}>` with a collapse window (ease-in, blur 12-20 px) and a one-frame CHAIN_STEP swap.
- **Materials and numbers:** The object can be a flip-book pixel sprite filled with a grainy two-hue gradient (cells about 40 px, gradient at 135 deg, monochrome grain at about 4 %, rim cells in a deeper shade), one drawing every 4 f, pushing the next word aside as it widens.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### The full stop becomes the next object

`dv-period-becomes-object` · signature · energy medium · launch, sting · primitive: MorphChain

The last mark of a sentence (a period, a signature's dot, a hero point, a bar) turns into the next thing: it scales into a shaded ball and drips a stem that becomes the next shot's line; pops oversized, swells and drops onto a planet; grows exponentially to frame centre and cuts to an inverted frame at the same size; swells into a planet disc; or a bar retracts into a sphere that falls into the end card. **When:** Ending a statement into the next scene; into the end card. **Avoid:** Punctuation the viewer has not noticed (give it a beat).

- **Anatomy:** Pop that starts oversized (r 14 -> 6.6 px), swell on cubic-in, drop on a quart-in with gravity (73 px/f); exponential growth x1.10 -> x1.26 a frame; a stem with 5 % overshoot.
- **Timing:** 28-75 f in all; pop 20 f, swell 10 f, drop 17-25 f.
- **Sound:** An onset on the pop, a UI pop and kicks on the drop; voice names the next thing.
- **Build:** MorphChain from the period's measured box (FontGate) to a ball, then growThrough or a drop on E.buildIn; the full-stop zoom via zoomThrough with an inverted next frame.
- **Materials and numbers:** The swollen dot is first a flat, soft-edged disc with grain (edge feather 10 % of the radius, grain about 6 levels that changes on held frames) for 12 f, then real footage develops into it from one edge (a diagonal mask in 2-3 steps on twos) until it is a photograph.

### Whole frame collapses into a chip or card

`dv-collapse-to-chip` · signature · energy medium · any · primitive: MorphChain

The entire image shrinks fast under heavy blur into a small rounded chip; a design shrinks into a card on paper and cuts to it living on a billboard; a collage collapses into an app-icon tile; a lockup collapses while a strip of tiles grows from its centre glyph; a sheet collapses in hard steps to one cell that turns green and sinks. **When:** Packing a whole scene into one object of the next scene. **Avoid:** Collapsing on an ease-out (it must accelerate).

- **Anatomy:** Collapse 10 f (about 230 px/f) with corner rounding and blur, then a linear shrink, a brief sharpening, a squeeze; stepped variant 835 -> 689 -> 413 -> 309 -> 277 px over 7 f.
- **Timing:** 13-64 f.
- **Sound:** A boom; a drum (+39 ms); a sub-bass.
- **Build:** collapse(f, { start, frames, square, into }) from MorphChain; stepped variant via HardStep widths.
- **Materials and numbers:** A hairline outline (1 px white at 25 %, radius 8, inset 2 % from the text block) appears round the last words in 4 f and contracts with the photo into the chip (image corners 0 -> 40 px, extreme blur); the chip is a live window: a crop of the same photo keeps drifting about 0.75 px/f and lightens about 40 % over 70 f inside it while its label fades in 6 f.

### A straight row curls into a ring

`dv-ring-curl` · signature · energy medium · launch, feature · primitive: RingCurl

A strip of tiles starts rotating with acceleration and both ends wrap around (the leader over the top, the tail along the bottom) until the row closes into a ring, on the kick after a short silence. **When:** Turning a list of things into a cycle or an ecosystem. **Avoid:** Fewer than 5 tiles.

- **Anatomy:** Arc-length parametrisation: tiles move along a path that morphs from a line to a circle while the whole rotates.
- **Timing:** 32 f on an ease-in; the ring closes 4-6 f after the fastest frame.
- **Sound:** A kick exactly on the fastest frame after a 0.35 s silence.
- **Build:** `<RingCurl at n pitch x y render={(i) => tile}>` (fx/Gather): every tile rides a curve bent from the row into a circle of the same length by its arc length (32 f on E.buildIn: it closes at speed), the whole turning 45 deg, then still turning and slowing (tau 10 f).

### Old words step into depth, new words step out

`dv-z-swarm-swap` · signature · energy high · launch, sting · primitive: ZSwarm

Copies of the old words shrink into depth in steps while copies of the new line grow out of depth along the same axis, jitter for a few frames and lock; trails fade. **When:** A techno title change; a hook line swap. **Avoid:** Calm films.

- **Anatomy:** Old -0.15 scale a frame for 6 f, new +0.10 a frame for 8 f, linear; jitter 4 f; trails of each step fading.
- **Timing:** 26 f at 60 fps.
- **Sound:** A punchy impact at full scale.
- **Build:** `<ZSwarm at x y old={line} next={line}>` (fx/Gather): the old line steps back -0.15 scale per 30 fps frame (6 steps), the new one steps out from 0.2 by +0.10 (8 steps, 4 f behind), each step leaving two fading copies (45 %, 20 %); the new line jitters 6 f (6 px) and locks: 26 f in all.

### Zoom into a letter until it fills the frame

`dv-zoom-through-glyph` · signature · energy high · launch, sting · primitive: camera-moves

The middle letters of a word scale up inside their own box at a constant x1.42 a frame (x8 in 6 f) until one glyph part fills the frame, then a match cut to a label box of the same shape. **When:** From a word into its meaning; a title into the first scene. **Avoid:** Letters with thin strokes (the fill reads as a flash).

- **Anatomy:** Constant log rate; the glyph's box as the cover target; label expo-out after the cut.
- **Timing:** Zoom 14 f; label 22 f.
- **Sound:** A drip or bubble on the cover.
- **Build:** zoomThrough({ factor: 8, frames: 14, box: glyphBox }) or `<TypeMask>` push; handoffShot carrying k.

### Flat shape builds into a 3D object

`dv-flat-to-3d-construct` · signature · energy medium · launch, sting · primitive: no primitive yet (recipe below)

A flat outline grows into a solid: a triangle gains a fourth vertex out of plane and turns as a wireframe, its faces fill one after another; a square outline grows into a tumbling cube; a pyramid forms in halves around a hero; flat cards morph into glossy 3D balls while a ring spins. **When:** A product about structure, models, building; a hero object reveal. **Avoid:** Glossy 3D in a flat UI film.

- **Anatomy:** Wireframe 1-2 px; faces fill 2-3 f apart; tumble 180 deg slow-in slow-out.
- **Timing:** Construct 18-72 f.
- **Sound:** A note on the first face fill; a celesta with the core glow.
- **Build:** Recipe: CSS 3D (preserve-3d) faces with stroke-only first, fills on per-face onsets.
- **Materials and numbers:** Construction hairlines stay drawn on top of the shaded solid: every edge, including back edges seen through a clear face, remains a 1 px light line at about 70 % with a non-scaling stroke through the whole beauty hold.
- **Conditions:** glass as a material with real frost or refraction, not a default card style.

### Letters replaced by product objects

`dv-letters-become-objects` · signature · energy medium · launch · primitive: recipe (plain layers)

The letters of a word are swapped in place for product renders (laptop, headphones, camera) with soft contact shadows, the row spreads, then implodes. **When:** Commerce, product catalogues. **Avoid:** Without real product renders.

- **Anatomy:** Per letter a render at the letter's box; spread circ-out; implode 13 f.
- **Timing:** Swap 10 f; spread 90 f; implode 13 f.
- **Sound:** None needed.
- **Build:** Recipe: Letters positions as anchors, `<Img>` per letter with a FloatShadow.

### Small object becomes the next word, card or cell

`dv-object-becomes-ui` · signature · energy medium · any · primitive: MorphChain

A chip, dot, button or circle carries the film into its next state instead of a cut: a squeezed chip swells +52 % and is replaced by a word at the chip's pre-swell size; a dot becomes a text caret in 2 frames and drops into the field; an icon box springs into a pill; a chosen comment collapses into a request pill; a button turns accent and shrinks into the first cell of a chart; solid capsules fly in, flash and become labelled chips; a circle grows and morphs into a rounded card; two shapes merge and pop to a new colour; a toast collapses and a larger card blooms in its place. **When:** Any handoff between product states; the strongest transition family for UI films. **Avoid:** Morphing objects with no relation; slow morphs (keep each step short).

- **Anatomy:** Gather (linear drift, then a squeeze), swell +40-60 % on an ease-in straight into the swap, the new content at the old object's pre-swell size; radius and aspect animate with height leading width; colour flashes 2 f on a merge; one spring allowed (13 % overshoot).
- **Timing:** Hand-offs every 8-32 f; swell 12-24 f; caret 2 f + an over-damped 8 f drop; card bloom 4 + 42 f.
- **Sound:** A beat or kick on the swap; a soft UI tap the frame before a heavy thud.
- **Build:** `<MorphChain states windows>` (house: swell on M.swell 24 f, collapse 16-20 f, camera push on E.glideOut from the swap).

### A glyph detaches and becomes UI

`dv-glyph-handoff` · signature · energy medium · launch, feature · primitive: MorphChain

A part of the logo (an asterisk) lifts off the wordmark and travels on an accelerating arc to become an icon in the UI; an icon dims and hands off to the matching glyph of the wordmark; a send icon flies across a cut as a smear and becomes a slider knob with the pointer. **When:** Brand to product and product to brand. **Avoid:** Glyphs that do not exist in both places.

- **Anatomy:** Arc on an ease-in; cross-dissolve overlap of 6-8 f; momentum continues after the cut.
- **Timing:** 18-48 f.
- **Sound:** The film's start; or none.
- **Build:** logoParts() to isolate the glyph, a bowed path (cursorMove's bow) to the UI icon's box, MorphChain for the shape.

### A soft panel flies through the camera

`dv-fly-through-panel` · signature · energy medium · any · primitive: Dive

The card recedes while a large frosted white panel scales toward the camera and fills the frame, then the next scene comes out of it. **When:** A soft, bright transition between UI scenes. **Avoid:** Dark films (the panel reads as a flash).

- **Anatomy:** Card to 0.86; panel fills (centre luma 188 -> 248); next scene resolves.
- **Timing:** 48 f: 14 f up, 22 f down.
- **Sound:** A glockenspiel note; a level dip before.
- **Build:** `<Dive occluder={softPanel}>` with the panel scaled from 0.6 to 3 on E.buildIn.
- **Conditions:** glass as a material with real frost or refraction, not a default card style.

### Letterbox window swings open in 3D, then flattens into a card

`dv-letterbox-swing-open` · signature · energy high · launch, feature · primitive: Window

A thin letterbox image window slides, opens into a perspective quad with dots at its corners, swings, then flattens into a UI card, and the shot cuts. **When:** Turning an image strip into the product. **Avoid:** Text inside the swinging window.

- **Anatomy:** Letterbox 950 x 86 px; open 1 f; swing 6 f; flatten 2 f.
- **Timing:** 29 f.
- **Sound:** A drum hit.
- **Build:** Window steps for the opening plus a matrix3d swing of the quad; Markers on the corners.

### The swap hides in a blur peak

`dv-swap-at-blur-peak` · workhorse · energy medium · any · primitive: SnapZoom

During a whip or a defocus pulse the content changes where the eye cannot hold it: typed words are replaced mid-whip; a window zooms out into extreme blur and a notification resolves at the same spot; a box goes fully soft and comes back in a new layout; a big blurred blob resolves into the next header; a cut lands blurred and morphs into a near-identical sharp image; a pill becomes a portrait card behind a defocus pulse. **When:** Any content change inside a fast move. **Avoid:** Swapping on a sharp frame.

- **Anatomy:** Sharpness falls to near zero for 2-4 f; swap on the softest frame; the new element resolves as a lens would (focus lagging position).
- **Timing:** 24-60 f; blur peak 4-8 f; resolve tau 6-7 f.
- **Sound:** A whoosh and sub on the peak; an impact on the resolve.
- **Build:** defocusPulse({ at, peakSigma, scaleJump }) + swapAt(peak); whip + swapAt for the whip version.

### Shape contracts and hands its outline to the next shot

`dv-shape-match-cut` · workhorse · energy medium · any · primitive: camera-moves

Before each caption cut an outline circle contracts faster (expo-in in its last 3 frames) and the next shot opens on another outline of the same shape; coral circles shrink and cut to a photo with matching thin outlines that contract in place. **When:** Photo films; chaining captions with one shape motif. **Avoid:** Changing the motif shape between shots.

- **Anatomy:** Outline contracts on an expo-in; the next outline at the same size and place.
- **Timing:** Last 6 f expo-in; outlines settle 16 f.
- **Sound:** A kick on the cut (-17 ms).
- **Build:** Outline as an SVG ring; handoffShot carrying its radius.

### Object implodes into a point or vortex

`dv-implode-to-point` · accent · energy medium · launch, sting · primitive: Implode

A ring spirals inward into a single bright point with the caption fading inside it; a button shrinks under the cursor and the next frame is a short soft swirling ring that births the title; a white disc dissolves from the inside out. **When:** Ending a section on a point; birthing a title from an object. **Avoid:** Long vortices (keep under 12 f).

- **Anatomy:** Spiral radius 369 -> 291 -> 223 -> 64 -> point on twos accelerating; swirl of 2-3 soft arcs for 6 f; an inner hole growing 35 -> 218 px while the disc dims.
- **Timing:** 12-20 f.
- **Sound:** A pop or a spoken word; no hit for the spiral.
- **Build:** `<Implode at r x y color kind="spiral"|"vortex"|"hole">` (fx/Implode): spiral: the ring coils inward on M.squeeze, posed every 5 f (radius 1, .79, .60, .17, then a point held 6 f); vortex: three tightening arcs (12 f); hole: a ground-coloured hole grows in the disc while it dims (18 f).
- **Materials and numbers:** Three constructions. Burn-out: a dark soft hole grows from the disc's centre (radius 12 -> 75 % of the disc) while the outer edge defocuses 0 -> 14 px and the luma drops to about 13 %, in 18 f. Swirl: the dot grid behind bends into waves curling round the target (displacement up to 20-40 px, falling off over 400 px, roughly doubling each frame) and a trail is sucked in as a thin tongue, 8 f into the vortex. Snake: the ring's tail erases while its head keeps drawing past 360 deg on a falling radius, on twos (20 f), the caption fading under the coil.

### Parts detach and reassemble into a big shape

`dv-parts-reassemble-shape` · accent · energy medium · launch, feature · primitive: Wordmark

The type is cut away and its coloured tag fills detach as bars, rotate and slide into a giant arrow that fills the panel, then exit. **When:** Turning labels into a direction (next, forward, go). **Avoid:** Too many parts (more than about 8).

- **Anatomy:** Bars rotate and translate to target slots; quart-in exit.
- **Timing:** Assemble 30 f; exit 18 f.
- **Sound:** None needed.
- **Build:** assembleState with parts given explicit from offsets and rotations.

### Outgoing scene melts by defocus under the next

`dv-defocus-melt-under` · accent · energy calm · any · primitive: Dive

The background layer blurs, smears and darkens away while the next graphic draws on top; a soft blob rises from the bottom while the shot defocuses and tints; the outgoing headline lifts 22 px in one frame and defocuses as a tilted card rises over it. **When:** Layered scene changes where the new element arrives on top. **Avoid:** Fading without defocus (it reads as a crossfade).

- **Anatomy:** Defocus on an ease-in, a darken or tint, a one-frame lift; the incoming element sharp from its first frame.
- **Timing:** 10-25 f.
- **Sound:** A glockenspiel note; the voice phrase start.
- **Build:** `<Dive>` with a short occluder, or RackFocus levels on the outgoing layer while the next draws.
- **Materials and numbers:** Before the colour finale, the photo is re-coloured into the gradient's palette as it blurs away: a faint pale blob breathes up from one corner (10 f), a second hue rises in its place (10 f), then the rest flood in from the other side and, on the same frame, the photo is gradient-mapped (dark -> deep hue, mid -> pink, light -> warm), blurred about 150 px and fades out over 16 f.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Tiles pass through a wireframe look

`dv-xray-wireframe-pass` · accent · energy medium · launch, feature · primitive: HardStep

Collage tiles turn white with thin dark outlines in 2 frames (a structural x-ray), the outlines and caption turn a pale tint and fade to white. **When:** A transition that reveals structure. **Avoid:** Busy tiles.

- **Anatomy:** Two-frame switch, then a tint, then white.
- **Timing:** 5 + 10 f.
- **Sound:** A whoosh.
- **Build:** HardStep to an outline version of each tile (a pre-drawn stroke layer), then a fade to the ground.

### Letters spread and double while the ground warms

`dv-letters-spread-ghost` · accent · energy high · launch, sting · primitive: recipe (plain layers)

A stat's letters spread apart and get doubled outline ghosts while the ground warms to the accent in 4 frames. **When:** Leaving a statistic. **Avoid:** Warm grounds in a cool brand.

- **Anatomy:** Tracking out, outline ghost copies offset, ground colour step.
- **Timing:** 20 f; colour 10 f.
- **Sound:** None needed.
- **Build:** Recipe: Letters tracking out + one outline copy offset per letter; ground via HardStep tween.

### Tags dissolve through low-res pixels into dots

`dv-pixel-dissolve-to-dots` · accent · energy medium · launch, feature · primitive: Pixelate

Tags breathe wider slowly, then dissolve as pale low-resolution pixel blocks into two small dots that hold. **When:** Ending a data moment into a minimal mark. **Avoid:** Large blocks.

- **Anatomy:** Breathe +3.8 %; dissolve 5 f; dots hold 8 f.
- **Timing:** 65 f in all.
- **Sound:** A plucked note.
- **Build:** Pixelate out-phase on the tags, then two dots via HardStep.

### Side elements gather toward the centre into the cut

`dv-gather-to-centre` · accent · energy medium · any · primitive: MorphChain

Stickers and scraps around a headline slide 45-100 px toward it while their scale holds, fastest on the last frame before the transition. **When:** Before a cut or a pixelate on a collage. **Avoid:** Gathering that settles.

- **Anatomy:** Strong ease-in; peak 7 px/f on the last frame.
- **Timing:** 48 f.
- **Sound:** The downbeat at the cut.
- **Build:** MorphChain gather phase (linear drift then M.squeeze) or a simple E.buildIn toward the centre.
