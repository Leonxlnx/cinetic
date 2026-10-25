# Photos and footage

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Pictures arrive as a tint and develop; products stay fixed while the world swaps behind them; montages accelerate under held copy.

[Detection boxes keep faces in true colour while the frame turns false-colour](#detection-boxes-keep-faces-in-true-colour-while-the-frame-turns-false-colour) · [Picture montage that accelerates behind held copy](#picture-montage-that-accelerates-behind-held-copy) · [Stills pushed into an expired-film spectral look](#stills-pushed-into-an-expired-film-spectral-look) · [Product stays fixed while the world swaps behind it](#product-stays-fixed-while-the-world-swaps-behind-it) · [Edits happen in place under the hovering cursor](#edits-happen-in-place-under-the-hovering-cursor) · [Photos arrive as a tint and develop to colour](#photos-arrive-as-a-tint-and-develop-to-colour) · [The copy and the work continue on real surfaces](#the-copy-and-the-work-continue-on-real-surfaces) · [One generated character carried across plates](#one-generated-character-carried-across-plates) · [A heat-mapped figure trailed by tinted time echoes](#a-heat-mapped-figure-trailed-by-tinted-time-echoes) · [Product UI framed over live footage](#product-ui-framed-over-live-footage) · [Background plate speeds up and slows with the read](#background-plate-speeds-up-and-slows-with-the-read)

### Detection boxes keep faces in true colour while the frame turns false-colour

`dv-true-colour-in-boxes` · signature · energy medium · launch, feature · primitive: GradientMap / TrueColourBoxes

Over video panels thin white boxes lock onto every face; outside the boxes the footage turns into a false-colour gradient map while inside each box the face stays in true colour, and the map changes with each feature (a cool map, a mint map, a heat map) as small labels type in. **When:** Vision, detection, search-in-video and analysis products: showing what the model sees. **Avoid:** Products with nothing visual to detect.

- **Anatomy:** Boxes 1.5 px white, snapping with no easing, popping before the tint; outside a three-stop map (shadows deep, mids the accent, highlights pale); inside, the plain footage clipped to the box; the palette changes about every 80 f; the heat map adds a warm edge glow where luma changes fast.
- **Timing:** Boxes pop in 4 f, tint in 8 f, labels type over 24 f; about 80 f per palette; a fade to white at the end.
- **Sound:** Soft ticks per label.
- **Build:** `<GradientMap map={COOL} in={8}>{footage}</GradientMap>` with `<TrueColourBoxes boxes={[{ x, y, w, h, at }]}>{footage}</TrueColourBoxes>` (fx/GradientMap): boxes pop in 4 f, each a plain copy clipped to its box with corner ticks; change the map per feature with `to` (COOL, MINT, HEAT).
- **Materials and numbers:** Cool map deep teal -> cyan -> ice; mint map green -> mint -> near-white; heat map lilac -> peach -> warm edges with a pale highlight.

### Picture montage that accelerates behind held copy

`dv-accelerating-flip-montage` · signature · energy high · launch, feature · primitive: Montage

A sentence holds still while images cut behind it with shrinking shot lengths (8-9 f down to 2-3 f); a front card swaps its photo by hard cuts accelerating from 7-12 f to 1-4 f; a central photo flip-book of tilted prints accelerates and the words re-centre to each print's width. **When:** Breadth (use cases, styles, results) under one statement. **Avoid:** Text that changes during the montage.

- **Anatomy:** Interval lists shrinking (6, 6, 3, 5, 3, 3, 4, 2...); prints tilted ±2-5 deg and different sizes; each new photo 12-15 % larger at landing.
- **Timing:** 106-170 f.
- **Sound:** A silence then a whoosh run; a cut into silence at the end.
- **Build:** `<Montage cuts>` with an accelerating cut list (ACCEL.montage); prints as Cards with seeded tilt.
- **Materials and numbers:** Not every change is a cut: for 4-8 f the next image is double-exposed over the current one (screen or lighten at 40-60 %), and the last still leaves by smearing sideways (a blur ramp 0 -> 40 px over 8 f) with a spectral leading edge (red, yellow, white, transparent) in screen blend.
- **Conditions:** the film's one spectral accent.

### Stills pushed into an expired-film spectral look

`dv-spectral-film-stills` · signature · energy high · launch, sting, vertical · primitive: Photo / Fringe

Every still of a fast montage is pushed into one lo-fi spectral look: three or four saturated inks, a cyan fringe on one side of each edge and a red-yellow one on the other, a soft sideways smear, baked light streaks and heavy monochrome grain, so pictures from anywhere read as one printed, expired-film world. **When:** A montage of mixed generated or stock stills that must feel like one world; imaging and creative products. **Avoid:** Product UI; clean corporate films; more than one montage per film.

- **Anatomy:** Per still a local channel split (red sampled to one side, blue to the other, amount gated by a low-frequency noise so fringes are local, 15-30 px at 1080p), a one-axis blur copy (12 px) mixed at 40 %, monochrome grain about 1.5 px at 6 % re-seeded per frame; the palette pushed to a few saturated inks over a pale ground.
- **Timing:** Stills 5-22 f each on an accelerating cadence; the look holds constant across the run.
- **Sound:** Full music under the run, then a stop-down into the next line.
- **Build:** `<Fringe mode="lateral" amount={23} smear={0.4}>` over each Photo still (fx/Fringe: three static one-channel copies in screen blend and one fixed one-axis smear copy), inside the flip montage's cadence; grain from the finish.
- **Materials and numbers:** Fringe = red copy +1.2 % of the width, blue copy -1.2 %, masked by a static soft-noise plate; grain monochrome, sigma about 1.5 levels; inks e.g. magenta, red, cobalt and teal over a pale periwinkle ground.
- **Conditions:** the film's one spectral accent.

### Product stays fixed while the world swaps behind it

`dv-fixed-subject-world-swap` · signature · energy high · launch, feature, vertical · primitive: HardStep

The product (a phone in a hand, a bottle) stays locked in place while the background swaps every 5-6 frames through photos of different places and textures; a heavily blurred background can change on every letter of a typing logo. **When:** Showing versatility (works anywhere, with anything). **Avoid:** Moving the product.

- **Anatomy:** Hard swaps on a fixed cadence; product cut out on top; optional slow push across the run.
- **Timing:** Swaps every 10-15 f at 60 fps; 7-8 backgrounds.
- **Sound:** Ticks or key presses on the swaps.
- **Build:** HardStep over a background list under a fixed Cutouts/Photo of the product.

### Edits happen in place under the hovering cursor

`dv-edit-in-place-under-cursor` · signature · energy calm · launch, feature · primitive: HardStep

The cursor hovers and the image or label changes in place: a product label swaps in one frame after a slow push; a cheek is relit in one step, lips brighten slowly over 45 f; the rest of the picture is untouched. **When:** Image or design editing products. **Avoid:** Big transitions for small edits.

- **Anatomy:** One-frame steps for discrete edits; slow fades for continuous ones; masks per edited region.
- **Timing:** Steps 1 f; slow edits 45 f; push 40 f.
- **Sound:** Key clicks.
- **Build:** HardStep or a short fade between two versions of the region (masked copies).

### Photos arrive as a tint and develop to colour

`dv-photo-develop-duotone` · workhorse · energy calm · any · primitive: Develop / GradientMap

Images do not fade in: they arrive as a duotone or a gradient map in the film's colours (or one frame of solid accent, or grey) and develop to natural colour, linearly or on an S, tile by tile left to right; the chosen photo resolves in colour while the alternatives stay desaturated; an edit appears grey and colour floods in. **When:** Every image in a product film; thumbnails, galleries, photo cards. **Avoid:** A second multi-hue accent in the same film; maps that are not baked or dithered.

- **Anatomy:** Tint -> colour 10-53 f; stagger 4-6 f per tile; one flat accent frame then a 5 f linear tint decay; grey hold 1 f then expo tau 1.2 f.
- **Timing:** 20-53 f per image.
- **Sound:** A sub-drop on the first tile; a spacebar tick.
- **Build:** One picture: `<GradientMap at map={inkMap(ink, accent)} to={{ map: 'true', at, dur: 36 }}>` (fx/GradientMap); a grid of tiles: `roll={{ palette: PASTEL_ROLL, perMap: 6, stagger: 6, index, wash: 0.55 }}` per tile, landing on true colour; `<Develop>` stays the one-hue tint version.
- **Materials and numbers:** Gradient-map roll: the tiles start washed out (the map mixed 55 % toward the stage) and every tile keeps changing its map, about 6 f per map through six to eight pastel maps, staggered about 6 f a tile, before landing on true colour (90 f in all). A cluster can also lose contrast and re-tint into a two-ink duotone as it shrinks into the cut (12 f).
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### The copy and the work continue on real surfaces

`dv-brand-in-the-world` · workhorse · energy medium · launch, feature · primitive: Photo

After the product moment the work leaves the screen: the headlines continue as the copy of billboards and light boxes, the edited image appears as printed magazines, a print lifted through a hard window shadow, a poster wall, a street hoarding, a screen among plants; passers-by and cars cross the foreground as natural wipes. **When:** Creative and brand tools: made here, used everywhere; the last act before the logo. **Avoid:** Internal tools with no visible output; weak mock-ups.

- **Anatomy:** 3-6 shots of 25-90 f; the hero artwork composited onto each surface by a perspective transform with a multiply shadow layer (a hard 45 deg window shadow at 55 %); at night light boxes at about twice the surround with a soft bloom; foreground occluders cross in 20-30 f.
- **Timing:** Shots 25-90 f on the beat; a slow push of 1-3 % per shot.
- **Sound:** Music continues; cuts on beats.
- **Build:** Photo or Footage with the artwork placed by matrix3d onto the print's quad, a multiply shadow plate over it, and a blurred occluder cut-out translating across.
- **Materials and numbers:** Real imagery leads: free photos of surfaces, the artwork composited, one shared light direction per shot; screens cast a faint glow on what is near them.

### One generated character carried across plates

`dv-recurring-generated-character` · workhorse · energy medium · launch, feature · primitive: Photo

The same generated person appears in two or three photographic plates (worried in one place, shocked over a phone in another): the same face and clothes and a consistent grade, so the story has a protagonist without a shoot. **When:** Problem-and-answer stories; reaction beats around UI cards and bubbles. **Avoid:** Uncanny results; more than three plates.

- **Anatomy:** Shallow depth of field (an f/2 look), warm highlights and shadows pushed toward the brand hue; a slow push of 0.3 % per frame; UI cards and bubbles over the plate.
- **Timing:** Plates 100-160 f; cut on the counter-to-shock beat with a momentum zoom.
- **Sound:** The VO tells the pain; chat pops on the UI.
- **Build:** Photo plates sharing one grade; UI layers above.

### A heat-mapped figure trailed by tinted time echoes

`dv-thermal-echo-figure` · accent · energy medium · launch, sting · primitive: Footage / GradientMap

Slow-motion footage of a figure is gradient-mapped like a heat image and trailed by soft translucent copies of itself a few frames behind, in one flat tint, so the movement reads as a long exposure; glyphs can trace its edge. **When:** A sport, motion or generation beat; one hero clip. **Avoid:** Talking heads; UI.

- **Anatomy:** Figure: a three-stop map (deep, hot, pale highlight); echoes: three copies at -2, -4 and -6 source frames, one flat tint, blur 8 px, screen blend at 0.3, 0.2 and 0.1; grain about 4 %.
- **Timing:** The echoes persist through the clip; often speed-ramped into a pixelate cut.
- **Sound:** Music.
- **Build:** `<GradientMap map={HEAT}>` on the main Footage copy (fx/GradientMap); the echoes are Footage copies with startFrom offsets under one flat tint in screen blend.
- **Materials and numbers:** Echo tint flat over a pale ground; in a house film the tint is a pale shade of the accent.
- **Ban-safe default:** Echoes in a pale tint of the accent. (the full look relies on purple; use it only when the brand supplies it)

### Product UI framed over live footage

`dv-product-in-context-footage` · accent · energy calm · launch, feature · primitive: Footage

A rounded screen with a thin rim floats over desaturated moving footage (a figure walking in a forest); a cut-out hand holding a phone slides in and rotates upright. **When:** Putting the product in the world without a full live-action shoot. **Avoid:** Saturated footage competing with the UI.

- **Anatomy:** Footage desaturated; screen with rim; hand slide 91 px + 10 deg rotation circ-out.
- **Timing:** Hand 40 f; footage plays.
- **Sound:** None needed.
- **Build:** `<Footage>` graded down + a Card on top; the hand as a Cutouts piece.
- **Materials and numbers:** Before the edit demos, a few seconds of generated commercial footage of the subject and product (a wide studio shot with gear in frame, a profile close-up, a frontal close-up), cool seamless with warm skin, the last clip frozen under the edit overlays: the raw material the product works on.

### Background plate speeds up and slows with the read

`dv-plate-speed-follows-read` · accent · energy calm · any · primitive: Footage

An aerial footage plate zooms and pans continuously, faster in the intro, slower while text is on screen, faster again at the exit. **When:** Footage behind type. **Avoid:** Fast plates under reading.

- **Anatomy:** Zoom +0.20 %/f and pan -2.4 px/f in the intro, +0.09 %/f and -1.1 px/f under text.
- **Timing:** 372 f.
- **Sound:** Follows the riser.
- **Build:** Footage speed keys or a camera creep() whose rate is keyed to the copy's on-screen spans.
