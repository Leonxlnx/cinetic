# Colour and light

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Colour as a carrier of recency and emphasis, light as an event. One accent, cooling to ink; one light event per act; grounds that change on the beat. Gradient maps, mesh grounds and floor light live here too: one gradient family per film, baked and dithered.

[False-colour palette cycles, then resolves material by material](#false-colour-palette-cycles-then-resolves-material-by-material) · [Cards flood with colour and defocus one by one](#cards-flood-with-colour-and-defocus-one-by-one) · [Light lines shoot through the frame](#light-lines-shoot-through-the-frame) · [People become flat colour silhouettes](#people-become-flat-colour-silhouettes) · [Planet horizon drops and the sky blooms](#planet-horizon-drops-and-the-sky-blooms) · [Floor glow under the stage, brightening into reveals](#floor-glow-under-the-stage-brightening-into-reveals) · [Frame blooms into light and settles out of it](#frame-blooms-into-light-and-settles-out-of-it) · [Soft blobs drift behind the copy](#soft-blobs-drift-behind-the-copy) · [Newest word lands in the accent and cools to ink](#newest-word-lands-in-the-accent-and-cools-to-ink) · [A light sheen crosses a landing object once](#a-light-sheen-crosses-a-landing-object-once) · [A photo turned into a two- or three-ink gradient map](#a-photo-turned-into-a-two-or-three-ink-gradient-map) · [Background steps back behind the type](#background-steps-back-behind-the-type) · [Brand colour withheld until the mark lands](#brand-colour-withheld-until-the-mark-lands) · [Ground colour changes per shot and per act](#ground-colour-changes-per-shot-and-per-act) · [Glow and grain boil on held graphics](#glow-and-grain-boil-on-held-graphics) · [Type changes colour with what is behind it](#type-changes-colour-with-what-is-behind-it) · [Heat ramp as the arrival and exit colour system](#heat-ramp-as-the-arrival-and-exit-colour-system) · [A tint wave travels through the words and drains](#a-tint-wave-travels-through-the-words-and-drains) · [Ground flips on one frame as punctuation](#ground-flips-on-one-frame-as-punctuation) · [Click or hover lights the object](#click-or-hover-lights-the-object) · [Element enters over-exposed and decays to its tone](#element-enters-over-exposed-and-decays-to-its-tone) · [Ground darkens or drains as an exit](#ground-darkens-or-drains-as-an-exit) · [Object materialises through a colour wash](#object-materialises-through-a-colour-wash) · [Type filled with a gradient that blooms](#type-filled-with-a-gradient-that-blooms) · [Full-frame satin folds of colour that roll through hues](#full-frame-satin-folds-of-colour-that-roll-through-hues) · [Light cone drops and flashes twice](#light-cone-drops-and-flashes-twice) · [Tiny glints and light scribbles](#tiny-glints-and-light-scribbles) · [Ground gradient swaps or floods](#ground-gradient-swaps-or-floods) · [Hard colour swaps that step the size](#hard-colour-swaps-that-step-the-size) · [Soft light hops to the active card](#soft-light-hops-to-the-active-card) · [Core glows up to white-hot](#core-glows-up-to-white-hot) · [Ghost pre-flash of an upcoming element](#ghost-pre-flash-of-an-upcoming-element) · [Soft window-blind shadows across the set](#soft-window-blind-shadows-across-the-set) · [Category tint crossfades through grey](#category-tint-crossfades-through-grey) · [The cut frame glows and decays](#the-cut-frame-glows-and-decays) · [Light bands flow along a column](#light-bands-flow-along-a-column) · [Tiles warm up, then bleach to white](#tiles-warm-up-then-bleach-to-white) · [Previous hero knocked back in one frame](#previous-hero-knocked-back-in-one-frame) · [Small token cycles through hues](#small-token-cycles-through-hues)

### False-colour palette cycles, then resolves material by material

`dv-thermal-lut-cycle` · signature · energy medium · launch, sting · primitive: GradientMap

A 3D room is shown in a thermal false-colour palette whose hues rotate while the camera pushes in, then each material resolves to its real look in turn (desk, wall, ceiling). **When:** A film about sensing, rendering or AI vision. **Avoid:** Without a real 3D or photo plate to map.

- **Anatomy:** Hue rotation on a luminance map; resolve per material mask.
- **Timing:** Cycle 77 f; resolves 12-20 f each inside a 53 f window.
- **Sound:** A riser into it, then quiet.
- **Build:** `<GradientMap at map roll={{ palette, perMap: 6, land: 'true' }}>{plate}</GradientMap>` (fx/GradientMap): statically filtered copies shown in turn (pass a hue-rotated palette for the thermal cycle), landing on true colour on a cut; per-material resolves are true-colour copies under masks; declared stepped.
- **Materials and numbers:** A blurred backdrop photo (12 px) inside an iris is gradient-mapped to saturated pastels with a map whose hue keeps rolling (about 6 f per stop through six stops) under a thin white cell grid (1 px at 35 %, 12 px pitch), while the whole layer fades out over 36 f.
- **Conditions:** gradients baked as dithered plates and moved by transform.
- **Ban-safe default:** Cycle a two-tone map of the accent's lightness steps, then resolve. (the full look relies on orange, purple; use it only when the brand supplies it)

### Cards flood with colour and defocus one by one

`dv-flood-defocus-cards` · signature · energy medium · launch, feature · primitive: recipe (plain layers)

On the line "more than anyone can track", each card turns fully into the brand colour and blurs into a soft blob in a few frames, staggered around the ring, then the whole frame fades to white. **When:** Showing overload: too many tools, tabs, tasks. **Avoid:** Light brand colours (the blobs disappear).

- **Anatomy:** Per card a colour flood overlay plus a fixed defocus ladder; clockwise stagger; white fade.
- **Timing:** Flood 8 f, fade 10 f, stagger 5-6 f.
- **Sound:** Voice cadence.
- **Build:** Recipe: Cards with an overlay of the accent (opacity tween) and RackFocus levels per card; Exposure to white at the end.

### Light lines shoot through the frame

`dv-light-line-shoot` · signature · energy high · launch, sting · primitive: LightLine

From black, a thin light bar shoots up from the frame edge to full height in a few frames; lines extend from a hero to the corners; thin light axes pierce an object one after another. **When:** A cold open on a dark stage; a hero moment in a 3D world. **Avoid:** Neon glows (keep the lines thin and the halo small).

- **Anatomy:** Bar 60-100 px wide with a 20-30 px soft edge, or 2 px lines; grow from an edge or a point; thin afterwards.
- **Timing:** Bar 12 f quad-out (peak 462 px/f); lines 5-8 f; axes 10-30 f apart.
- **Sound:** The first music hit right after.
- **Build:** `<LightLine at from to color width>` (fx/Streak): grows from `from` on E.snapOut (12 f) and thins to 35 % (10 f); stagger several 10-30 f apart for axes; flat by default, `soft` adds a static blurred copy on dark stages.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### People become flat colour silhouettes

`dv-segmentation-silhouette` · signature · energy medium · launch, feature · primitive: no primitive yet (recipe below)

The people in a collage of tiles switch to flat colour silhouettes with a scattered stagger, then the backgrounds go flat too: a segmentation look that says "the AI sees them". **When:** A film about vision, detection or editing. **Avoid:** Without hand-made mattes (it needs clean cut-outs).

- **Anatomy:** Per tile a matte layer in one flat colour; staggered over 4 f; backgrounds follow.
- **Timing:** 23 f ease-in.
- **Sound:** None, or a soft scan.
- **Build:** Recipe: Cutouts mattes (hand-traced polygons) filled flat, switched on per tile with a seeded stagger.

### Planet horizon drops and the sky blooms

`dv-horizon-drop-reveal` · signature · energy medium · launch, sting · primitive: recipe (plain layers)

From a frame full of dark ground, a glowing horizon drops from the top into place, revealing a sky that blooms from a deep tint to white. **When:** The hero reveal of a world-building film. **Avoid:** Without a 3D or painted plate.

- **Anatomy:** Horizon y from 13 to 732 px quad-out; sky bloom cubic in-out.
- **Timing:** Horizon 42 f; sky 22 f.
- **Sound:** An onset 3 ms after.
- **Build:** Recipe: two plates (ground, sky) moved by transform; sky brightness through a static gradient plate's opacity.
- **Materials and numbers:** The flat grid floor curls into a planet: the light pool slides up and fades (24 f), the frame darkens to near black (mean luma about 5), the straight grid lines bow until the floor is clearly a curved surface, and its top edge drops into view as a horizon with a 6-10 px rim gradient and a soft outer glow. The planet then carries an atmosphere: deep inside, a bright rim, and outside a wide pale halo ring (blur about 30 px) under a hot sky that warms to white over 32 f.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Floor glow under the stage, brightening into reveals

`dv-floor-glow` · workhorse · energy calm · any · primitive: LightField

A one-hue glow rises from the bottom 25-30 % of the frame under UI or type; it brightens into reveals and transitions, can undulate in soft lobes, and is stronger on the end card. **When:** Dark or near-white product stages that should not be flat. **Avoid:** Glow behind a single element; saturated glow.

- **Anatomy:** Bottom band luma rising 4 -> 189 into a reveal; lobes slowly undulating; strength stepping up on the end card.
- **Timing:** Rise 68 f ease-out; continuous breathing; sinks 32 f at the end.
- **Sound:** A sub-bass hit on the rise; an outro pad under the sink.
- **Build:** `<LightField floor={{ plate, height: 0.27, breathe, rises }}>`. Bake each stop set with scripts/dither-gradient.py (kind floor) and move the plates by transform; never an animated CSS gradient.
- **Materials and numbers:** The floor glow is a horizon at dusk, not one colour: a near-white core with a cool tint at the very bottom edge, then the accent body, a deeper hue and a fade to black (radial ellipse about 140 % of the frame wide and 60 % tall, centred just below the frame); it rises over about 68 f as the panel rises. The closing version is a row of 4-5 soft lobes along the bottom third (500-700 px wide, blur about 80 px) with darker gaps, rising and falling out of phase (20-40 px, 2-4 s periods) and sinking 300 px in 30 f before the logo. A three-hue aurora can rise under a translucent prompt box (coverage 2 -> 28 % of the panel in 48 f, then breathing 25-35 %, its core drifting and tilting about 20 deg), visible through the box's lower third.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Frame blooms into light and settles out of it

`dv-exposure-bloom` · workhorse · energy medium · any · primitive: Exposure

The frame over-exposes into a light event (a bloom to white or a pale tint, a wash entering from one side, a short charge before it) and the next scene settles out of it with a small brightness overshoot. **When:** Downbeats, act changes, the moment before a reveal. **Avoid:** Glows around single elements (the light is the whole frame's).

- **Anatomy:** Optional dip of 2 f before; rise; peak at or near white; swap hidden at the peak; settle with an 11 % overshoot; variants: a charge (halo blooms, frame brightens 28 -> 63 luma in 4 f, holds 5 f, cools); a wash entering from the left with the cut under it; a fluid light swirl that resolves into a soft field.
- **Timing:** Rise 10-40 f, peak hold 0-12 f, settle 10-35 f; charge 10/12/35 f.
- **Sound:** On the downbeat, often with a level dip right before; a notification ding at the peak.
- **Build:** `<Exposure at up down peak swap charge>`.

### Soft blobs drift behind the copy

`dv-drifting-blob-field` · workhorse · energy calm · any · primitive: LightField

Large soft colour masses (500-900 px) drift and breathe slowly behind the type, so no ground is flat; a blob can wander continuously and ignore the cuts, or drift and shrink behind a held logo; the colourway can change on cuts. **When:** Text-led films on a coloured ground. **Avoid:** A second mesh field in other hues; blobs that move faster than about 1 px a frame.

- **Anatomy:** 22-37 % of the frame each, about 1 px a frame, area breathing; variant: static soft glows bleeding from the corners with faint layout lines.
- **Timing:** Continuous; contours repeating every 60 f, bands every 116 f; drift 87 f decelerating.
- **Sound:** None.
- **Build:** `<LightField pools={[...]}>` with Lissajous loops; colourway per shot.
- **Materials and numbers:** A mesh gradient built from two inks: saturated pools of the accent in a pale grey-tinted base with near-white highlights along one S-shaped ribbon; blob blur 25-35 % of the frame width; the shapes drift and bend about 0.5 % a frame and stay continuous across cuts in the same colourway. Two-lobe version: a cool lobe and a warm lobe meeting at a soft vertical seam where their mix shows, the shape morphing from a wedge to an ellipse to a pill over about 2 s spans. Add grain at 1.5-2 % or bake the lobes as dithered plates: large soft gradients band at 8 bits.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Newest word lands in the accent and cools to ink

`dv-transient-accent-word` · workhorse · energy calm · any · primitive: Words

Every newly arrived word (or swapped-in word, or a word born from a coloured chip) lands in the accent, or a tint of it, and relaxes to the ink, so colour carries recency. **When:** Any build line, appended words, accent words in a sentence, a word that came out of a coloured object. **Avoid:** Several accent hues in one line; cooling that takes longer than the read.

- **Anatomy:** Colour accent -> ink, linear or slightly eased; secondary words can arrive grey and darken; a word born from a chip starts in the chip's tint; accent words start pale and deepen; variant: a shape recolours in 5 even steps while it rises, the colour finishing 10 f before the position.
- **Timing:** Hold 0-18 f, cool 8-26 f (house 18 + 13 f calm, 7 + 13 crisp); word-by-word sequences left to right; maroon-to-ink cools about 24 f.
- **Sound:** On each word onset when the voice carries it.
- **Build:** Words accent (accentHold, accentCool) or Chain accent="transient"; a chip-born word passes the chip colour as accent.

### A light sheen crosses a landing object once

`dv-sheen-pass` · workhorse · energy calm · any · primitive: LightSweep

A soft pale band about 1.5 letters wide crosses the end logo or a turning object once; mirrored highlights glide along an object's rims; a title fades up with a light sweep and a 1.2-1.4x brightness overshoot. **When:** An end logo landing, a hero object turning, a title reveal. **Avoid:** Repeating sheens; a sheen on every element.

- **Anatomy:** Band 0.45 of the element width moving at about 24 px/f; rim variant: two short streaks mirrored about the centre, front-loaded then linear.
- **Timing:** 26-48 f near-linear (rim: fast start 39 px/f then 15-28 px/f).
- **Sound:** The final kick after the sweep.
- **Build:** `<LightSweep band={0.45} frames={34}>` clipped to the element; rims: LightSweep clipped to the stroke. Recipe: the rounded rect stroked twice with a bright dash (strokeDasharray 120 of 1000) moving in opposite directions from the end, plus a blurred glow copy.
- **Materials and numbers:** A bright C-shaped end cap on a glass pill's rounded end (peak luma 150-200 on a dark panel, glow about 10 px) holds 12 f, then divides: one highlight runs along the top rim and one along the bottom for about 40 f, like light rolling off a glass edge.

### A photo turned into a two- or three-ink gradient map

`dv-gradient-map-plate` · workhorse · energy calm · launch, feature, vertical · primitive: GradientMap

A photograph (clouds, a landscape, a soft figure) is mapped by luminance onto the film's inks: shadows to the deep ink, mids to the accent, highlights to a pale tint, so real imagery carries the brand palette; the map can hold or drift slowly (a head turning from one ink to the next). **When:** Real imagery that must live in a strong palette; an opening field; an infrared or thermal flavour for vision and generation products. **Avoid:** Faces that must read naturally; product screenshots.

- **Anatomy:** Desaturate, then a three-stop table per channel (dark, mid, light); an optional blur (12-30 px) for a defocused figure; slow drift about 2 px/f; optional tiny specks and soft horizontal glints over a two-ink field.
- **Timing:** Holds a whole shot; a drifting map changes its stops over 30-100 f with no snaps.
- **Sound:** Music; no sound of its own.
- **Build:** `<GradientMap at map={inkMap(ink, accent)} mix to={{ map, at, dur }}>{<Photo>}</GradientMap>` (fx/GradientMap): one static luminance-to-table filter per map, built from the stops in OKLab; a drifting map is two copies cross-faded by opacity, never an animated filter.
- **Materials and numbers:** Two-ink field: luminance 0 -> deep ink, 0.5 -> accent, 1 -> pale tint. Infrared: swap the red and green channels so foliage turns crimson while the sky stays blue. Defocused figure: blur 30 px, then a four-stop map whose head and body stops drift apart.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Background steps back behind the type

`dv-background-veil` · workhorse · energy calm · any · primitive: RackFocus

The picture behind a line gets a pale haze and a defocus, a canvas fades into a blurred image, a colour field fades to the neutral stage under the UI, or a dark vignetted plate puts the headline in the bright centre. **When:** Type over footage or a busy picture. **Avoid:** Dark drop shadows behind type.

- **Anatomy:** Background luma lifted (151 -> 224) and defocused; or a vignette with corners at a third of the centre.
- **Timing:** 30-38 f; a fade 23 f sine.
- **Sound:** None.
- **Build:** `<RackFocus levels>` on the background with a veil layer; vignette as a static plate.
- **Materials and numbers:** Calm, uncanny photoreal plates (a lone chair in a meadow, a misty window) in one cool grade carry the copy: an elliptical vignette about 45 % darker at the corners, a lift behind the type, saturation about 0.7; the plates creep almost imperceptibly (0.02-0.4 % a frame) while the copy changes on them.

### Brand colour withheld until the mark lands

`dv-brand-colour-last` · workhorse · energy calm · launch, sting · primitive: HardStep

The mark stays white or ink until everything has cooled, then switches to the brand colour in one frame; or the wordmark is re-coloured for each background and lands on the brand colour last. **When:** End cards and lockups. **Avoid:** A brand colour that is already everywhere in the film.

- **Anatomy:** One-frame switch; a stepped colour sequence per background.
- **Timing:** 1 f switch; 8 f in 4 steps.
- **Sound:** The switch 157 ms after a beat.
- **Build:** HardStep on the mark's fill.
- **Materials and numbers:** Over a warm plate the white wordmark first turns the plate's complement for 4 f (it reads as a translucent multiply), then the brand colour fills the letters from the bottom up with a hard, unfeathered boundary (half, then full, one step every 2 f); the mark switches 2 f before the letters.

### Ground colour changes per shot and per act

`dv-ground-alternation` · workhorse · energy medium · any · primitive: recipe (plain layers)

The ground itself is a beat: shots alternate paper, black with a fine grid, a full brand field, a texture; an act flips the film from a light stage to a dark world and stays there; brand moments sit on a warm stage and the product on a cool one. **When:** Any film with more than four shots. **Avoid:** Two neighbouring shots on the same ground with different content.

- **Anatomy:** A ground per shot from a set of 3-5; one act flip per film; one ground per world.
- **Timing:** Changes on cuts and transitions only.
- **Sound:** A music change on the act flip.
- **Build:** Recipe: a GROUNDS list in the timeline indexed by shot; the flip is a hard cut.

### Glow and grain boil on held graphics

`dv-living-grain-flicker` · workhorse · energy calm · any · primitive: recipe (plain layers)

While shapes hold still, their glow and grain change every frame by a few percent, so a held frame never freezes. **When:** Any hold longer than about 30 f on a graphic, especially on twos. **Avoid:** Visible flicker (keep it 2-4 % of luma).

- **Anatomy:** Per-frame seeded noise on the grain plate and a tiny lightness wobble.
- **Timing:** Every frame, amplitude 2-4 % luma.
- **Sound:** None.
- **Build:** Recipe: a set of 4-8 baked grain plates cycled by frame (seeded), at low opacity.

### Type changes colour with what is behind it

`dv-type-knockout-over-colour` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

A soft blob slides under a typed word and the letters over it knock out to white; big type takes its colour from a blurred image blooming behind it; a small caption flips colour the frame a picture passes under it. **When:** Type that shares the frame with moving colour. **Avoid:** Low contrast in the mixed state.

- **Anatomy:** Two copies of the type (ink and knockout), the knockout clipped by the blob or image shape.
- **Timing:** Blob 22 f expo-out; bloom 33 f; flips on one frame.
- **Sound:** None.
- **Build:** Recipe: render the text twice and clip the white copy with the blob's (static, transformed) mask; or mix-blend-mode difference on a flat field.
- **Materials and numbers:** A defocused, heavily grained iridescent image (teal, magenta, coral on periwinkle) blooms up from a corner behind the giant type (coverage 7 -> 80 % in 32 f) and splits the letters white or black in screen space: white where the bloom covers the paper, black elsewhere, with a mask feather of about 150 px and grain sigma about 1.5.

### Heat ramp as the arrival and exit colour system

`dv-heat-ramp-arrive-exit` · accent · energy medium · launch, feature, sting · primitive: HueSweep

Every arrival cools from a warm tint to the ink and every exit heats back up and bleaches to white; colour leads the fade, so type seems to burn in and burn out. **When:** A whole film's colour grammar, one film at a time. **Avoid:** Brands without a warm accent; mixing with other accent systems.

- **Anatomy:** Arrival: pale warm -> accent -> deep -> ink; exit: ink -> warm -> pale -> white, colour leading opacity.
- **Timing:** Cool 10-15 f; heat 8-23 f.
- **Sound:** None of its own.
- **Build:** HueSweep with back for exits (one hue path, lightness doing the work).
- **Conditions:** gradients baked as dithered plates and moved by transform.
- **Ban-safe default:** One hue: pale accent -> accent -> ink on arrival, the reverse plus a fade on exit. (the full look relies on orange; use it only when the brand supplies it)

### A tint wave travels through the words and drains

`dv-tint-wave-through-words` · accent · energy calm · launch, feature · primitive: TypeFill

A band of tint moves through a line (or a running counter's digits) as the words arrive, peaking on each word as the voice lands it and draining behind; it can park on the last word. **When:** A headline voiced word by word; a counter that should feel alive; a phrase whose last word is the point. **Avoid:** A grey mid-tone in the band (give it shoulders); a second multi-hue accent in the same film.

- **Anatomy:** Tint band about 1.5 words wide; the picture leads the voice by 1-3 f; drain 12-16 f for early words, the last word lingers; variant: a second, slower wave 30-45 % behind a write-on front; variant: the band parks on the last word.
- **Timing:** Word peaks 8 f apart at 60 fps; drain 12-16 f; one pass about 1 s on a counter.
- **Sound:** Voice words land with the tint peaks.
- **Build:** `<TypeFill mode="band" text stops={tintBand(ink, accent)} at dur>` (fx/TypeFill): one plate three widths long, shoulders a deep shade on dark type and a pale tint on light type, slides by transform; typeFillFrames(p, film, wordCentres).cross puts each word's peak on the voice's onset.
- **Materials and numbers:** Band shoulders: when the accent travels through type, the band's edges are never a fade to grey. On black type the stops go black -> a deep shade of the accent (about 0.4 letter wide) -> the accent core (1-1.5 letters) -> the deep shade -> black inside single letters; on white type the shoulders are a pale tint instead. Band speed about 1 letter per 4 f on a giant word; in a sentence the head can run about 20 px/f and park on the keyword. Over a counting number the band is a soft-edged tint about 1.5 digits wide crossing in about 50 f while the digits keep running.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Ground flips on one frame as punctuation

`dv-ground-flip-on-beat` · accent · energy high · any · primitive: HardStep

The background inverts (dark to light) on one frame while the objects stay; or a whole background layer switches from dim grey to the accent on the key word; or a colour change passes through a one-frame near-black dip on a pop. **When:** The key word of a line; a beat inside a held shot. **Avoid:** More than one or two per film (polarity flips are the loudest punctuation).

- **Anatomy:** One-frame switch; optional one-frame dip; objects unchanged.
- **Timing:** 1-2 f; a dip variant 12 f to the dip, 10 f back.
- **Sound:** The resolving word or a pop 33 ms after.
- **Build:** HardStep on the ground colour; the dip as a one-frame fill.
- **Materials and numbers:** Ground and type swap colours through one half-blend frame: the type turns 50 % for a single frame, then the whole palette has swapped (accent type on white instead of white on accent) while small labels keep their colour.

### Click or hover lights the object

`dv-interaction-light-response` · accent · energy medium · launch, feature · primitive: SnapZoom

A click pushes the camera toward the caret and a soft light blooms at the click point; a glossy 3D object brightens and shifts colour under the hovering cursor. **When:** The decisive click of a demo; a hover on a hero object. **Avoid:** Halo glows in house films.

- **Anatomy:** Push tau about 6.5 f; light attack 13 f, release 23 f; hover 84 f then a 20 f shrink.
- **Timing:** Push 15-20 f; light 36 f.
- **Sound:** A click on the beat (+28 ms); a UI pop on the punch-in.
- **Build:** SnapZoom (pre build) on the click; light as SnapZoom flash with a swell (gain 0.4).
- **Materials and numbers:** Emissive heat under the cursor: a glossy object lit by the scene brightens to a hot emissive version of the accent when the cursor reaches it (brightness 1 -> 1.5 and saturation 1.4 over 40 f), its rims glow (drop-shadow 30 px in the accent) and a soft radial glow pools on the ground under it (about 60 % at the centre to 0 at 500 px).
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Element enters over-exposed and decays to its tone

`dv-overexposed-entry` · accent · energy medium · launch, feature, sting · primitive: EntryFlash

New figures appear as flat bright white for a few frames and drop to their real tone in one step; a cut-out subject flashes bright on release while the caption slips behind it. **When:** Figures arriving in a graphic world; the release moment of a selection. **Avoid:** Faces that must be read from the first frame.

- **Anatomy:** White hold 4 f, one-step drop, near and far figures 2 f apart; variant: +60 L* flash on release, decaying 20 f, with a depth swap of the caption.
- **Timing:** Hold 10 f, drop 1 f; flash hold 5 f, decay 20 f.
- **Sound:** A mouse-click on the release.
- **Build:** `<EntryFlash at color>` inside the arriving element (fx/MicroUI): a flat light overlay holds 10 f and drops in one step; `mode="decay"` fades 1 -> 0 in 5 f (the accent-flash tile on a cut-on).
- **Materials and numbers:** On the first frame after the white flash, figures arrive as one-frame vertical smears (about 150 px, luminance kept, a 3 px colour split), then sharp flat white silhouettes that decay to grey halftone.

### Ground darkens or drains as an exit

`dv-ground-drain` · accent · energy calm · any · primitive: recipe (plain layers)

The white page darkens to black with luma halving per frame while its elements shrink out; a panel drains to grey and darkens slowly; the ground dims to true black under an opening. **When:** The end of a section; an opening that builds on black. **Avoid:** A plain fade to black between unrelated shots.

- **Anatomy:** Accelerating darken (ease-in), chips shrinking one by one; drain S-curve then linear darken.
- **Timing:** 25-40 f; drain 33 f then 128 f.
- **Sound:** A snare starting it.
- **Build:** Recipe: ground colour tween on E.buildIn; shrink the elements with exits 'launch' on scale.
- **Materials and numbers:** Grades as a transition: before a chapter cut the whole frame drains (saturation about 60 -> 15 %, brightness to 0.75) over 16 f ease-in, then a hard cut lands on the brightest frame of the film, so the cut reads as a flash without a white frame. When a white page darkens (luma halving each frame), white pills that were invisible on it suddenly read as raised capsules for a beat before they shrink away.

### Object materialises through a colour wash

`dv-colour-wash-materialise` · accent · energy medium · launch, feature · primitive: Develop

A board or object starts as a flat colour overlay and sweeps through tints before landing on its true colours; or an object is recoloured through a gradient map for 5 frames on a hit. **When:** The first appearance of a product board; a hit on a dock or icon row. **Avoid:** A second multi-hue wash in the same film.

- **Anatomy:** Overlay colour -> tints -> true colours; gradient-map flash on an object within 22 f.
- **Timing:** Wash 54 f; flash 10 f inside 22 f.
- **Sound:** A hit on the flash.
- **Build:** `<Develop>` (duotone tint -> full colour) for the wash; a one-hue flash as a HardStep overlay on the object.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Type filled with a gradient that blooms

`dv-gradient-fill-type` · accent · energy medium · launch, sting · primitive: TypeFill

A key phrase grows a little and its fill turns from white into a soft gradient that blooms, or each word of a hero line carries its own soft gradient and lands in silence. **When:** A brand that owns a gradient; a hero line once. **Avoid:** More than one gradient phrase per film; a gradient that is not the film's own family.

- **Anatomy:** Fill shift white -> gradient over the scale-up (25-30 %), soft bloom; per-word gradients on paper.
- **Timing:** 42-68 f expo-out.
- **Sound:** The music stops for about 1 s under it.
- **Build:** `<TypeFill mode="fill" text stops glow>` (fx/TypeFill): the phrase grows 27 % over 58 f on E.settleOut while its fill turns from solid to the dithered plate in 24 f, one deeper glow copy at a fixed blur behind it. Or `<GradientText>` (fx/TypeFx): a dithered multi-stop plate drifting inside the type with a soft shine band once a period.
- **Materials and numbers:** Construction: the phrase grows 25-30 % over about 58 f while its fill shifts in the first 24 f from white to a horizontal two-hue gradient (a lilac-like left to a sky-like right), with a glow made of a duplicate blurred 18-24 px at about 50 % in a deeper hue behind it; the second word held slightly out of focus (4-6 px). Behind a card, big type can carry a gradient that fades from the saturated hue to nearly the ground colour across the word, so the card in front reads first and the phrase reads as an echo.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform; light built into the device (core, body, falloff), never a uniform halo.

### Full-frame satin folds of colour that roll through hues

`dv-satin-fold-field` · accent · energy medium · launch, sting · primitive: GradientField (satin)

Behind small captions the whole frame is a soft field of tall curved folds like satin or an aurora: dark ribbons sweep diagonally through bright bands and the colour phase slowly rolls from one hue through its neighbour into a deep shade; the calm cousin is a field of glossy diagonal stripes over a two-ink gradient that fades to black at the edges. **When:** A section of short captions over pure colour; music-led films. **Avoid:** Under dense UI; next to another full-frame colour field.

- **Anatomy:** Folds: one colour strip, sin(x * 12 + 0.8 sin(y * 3) + t) through a four-stop ramp, skewed so the folds lean, blurred about 20 px; dark ribbons 80-140 px, highlights about 200 px; phase cycle about 2 s; ripple travel about 3 px/f. Stripes: highlight +12 % luma, 4 px blur, at 135 deg, drifting 1 px/f.
- **Timing:** Continuous, never a held frame.
- **Sound:** VO or music only.
- **Build:** `<GradientField mode="satin" stops={rampA} stopsB={rampB} angle={62} folds={{ period: 9 }}>` (fx/Gradients): tall curved folds, sin(k b + warp sin(m a + w2 t) + w t) through the ramp, computed per frame and dithered so the dark ribbons never band; the colour rolls from ramp A into ramp B on a 9 s cosine. Mode "stripes" is the calm cousin: glossy diagonal stripes drifting over a radial two-ink ground.
- **Materials and numbers:** Ramp: deep shade -> shadow hue -> accent -> highlight tint. Stripes over a radial gradient (120 % x 90 % at the lower left: light tint, accent at 45 %, near-black at 80 %).
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Light cone drops and flashes twice

`dv-light-cone-drop` · accent · energy medium · launch, sting · primitive: LightField

An inverted-triangle beam drops from the top edge, widening, and flashes colour twice on UI pops. **When:** A spotlight on a hero object. **Avoid:** Saturated beams.

- **Anatomy:** Width 487 -> 1447 px circ-out; two colour flashes 0.25 s apart.
- **Timing:** 38 f; flashes at about 15 f and 30 f.
- **Sound:** The second flash 34 ms after a UI pop.
- **Build:** LightField glowRise on a static cone plate scaled by transform; flashes as opacity steps.

### Tiny glints and light scribbles

`dv-micro-glints` · accent · energy medium · launch, sting · primitive: LightField

A few tiny bright points sit on a ring as a dot fills, or small hand-drawn light scribbles flicker on twos around fast objects. **When:** Decorating a transformation with a hint of light (sparingly). **Avoid:** House films without a supplied look (sparkles are decoration).

- **Anatomy:** 3 px points or 20-60 px thin strokes, posed on twos.
- **Timing:** 5 f; 16 f on twos.
- **Sound:** A whoosh build under it.
- **Build:** Stepped on={2} poses of small SVG strokes.
- **Ban-safe default:** Drop it; carry the moment with the object's own motion. (the full look relies on sparkle; use it only when the brand supplies it)

### Ground gradient swaps or floods

`dv-gradient-ground-swap` · accent · energy calm · launch · primitive: LightField

Behind a locked picture the two stops of a vertical gradient trade places; or a brand gradient floods half the frame behind stripes. **When:** Any film that carries one gradient family. **Avoid:** House films.

- **Anatomy:** Stops swap over 48 f; flood coverage 0.14 -> 0.96 in 100 f.
- **Timing:** 48-100 f.
- **Sound:** A reverse-cymbal swell.
- **Build:** Baked dithered gradient plates cross-faded by opacity. Bake every gradient with scripts/dither-gradient.py from one stop list in the brand tokens.
- **Materials and numbers:** One gradient family everywhere: every gradient in the film (strips, light floods, skies, mesh grounds) uses the same five stops, ordered by lightness so no muddy midpoint appears (e.g. a warm stop always sits between the hot hue and white, never beside the cool one); large soft gradients carry a fine per-pixel dither (sigma about 0.75 levels) that only shows under a contrast boost. Variants: a diagonal three-hue ground under floating panels; a pale sky radial (near-white centre, pale blue corners) with blurred clouds drifting about 0.5 px/f that hides every UI scene in air.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Hard colour swaps that step the size

`dv-hard-fill-swaps` · accent · energy high · launch, feature, sting · primitive: fillSwapState

A shape (a pair of circles, discs, a column) hard-cuts through three fills a few frames apart, each swap also stepping it about 4 % larger; or a column switches colour on the frame it passes half its width. **When:** A beat-cut on a simple graphic; building energy before a reveal. **Avoid:** More than one run per act.

- **Anatomy:** 3 swaps, each with a scale step x1.04; text dims a frame before; variant: a column widens 6x and swaps colour at half width with a band of the old colour inside.
- **Timing:** Swaps 10 f apart at 60 fps (6 Hz); widen 20 f cubic-out.
- **Sound:** Swaps next to a kick and a sub-drop.
- **Build:** fillSwapState(f, { at, n: 3, every: 10, grow: 0.04, fills }).
- **Materials and numbers:** The pair cuts through three fills, each held exactly 10 f and each slightly larger (+4 % a step), on third-beats; the text colour switches on the same frame as the fill, and the words can first sink into the disc colour over 6 f before the first swap.

### Soft light hops to the active card

`dv-focus-glow-hop` · accent · energy calm · launch, feature · primitive: LightField

A soft light appears behind one card or tile and moves to the next as each becomes active; a dark grid of keycap tiles lights up tile by tile as labels fade in. **When:** Walking through KPI cards or a grid of features. **Avoid:** Glow halos on light grounds.

- **Anatomy:** Soft light about 100 px around the active element; moves card to card; grows about 2.5x on the tile variant.
- **Timing:** 28 f per hop; tile bloom 14 f.
- **Sound:** None, or a soft tick per hop.
- **Build:** LightField pool moved between card centres on E.snapOut.
- **Materials and numbers:** The light is motivated: a small passing foreground dot leaves a soft radial glow on each card it crosses (a pale accent tint at about 0.55 at the core, radius about 70 px), blooming 2 f after the dot passes and fading over 20 f, so the glow seems lit by the dot.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Core glows up to white-hot

`dv-inner-glow-core` · accent · energy medium · launch, sting · primitive: KeyLight

The core of a hero object brightens to white with a soft halo (or a point's halo blooms wide and contracts, or a held word sits on a faint bloom). **When:** A brand that supplies glow; a living hero object. **Avoid:** House films (a radial glow is the stock look).

- **Anatomy:** Core brightness 153 -> 240 in luma with a halo; halo 250 px contracting to 120 px in one step; repeated beats.
- **Timing:** 19 f cubic-out, repeated; halo held 5 f then one-step contraction.
- **Sound:** A celesta note 53 ms before.
- **Build:** A baked halo plate whose opacity follows haloLevel(); never an animated blur.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Ghost pre-flash of an upcoming element

`dv-ghost-preflash` · accent · energy medium · launch, feature · primitive: GhostPreflash

A huge, faint version of an element that is about to arrive flashes behind the frame for a few frames before the real element lands. **When:** A collage or stop-motion build that should anticipate its next piece. **Avoid:** Clean UI films.

- **Anatomy:** Oversized ghost (5-6x) at 8-15 % strength for 5-8 f; the real element lands 3-11 f later.
- **Timing:** Ghost 5-8 f; real element +3-11 f.
- **Sound:** A whoosh on the flash.
- **Build:** `<GhostPreflash land x y>{element}</GhostPreflash>` (fx/Flashes): the element at 5.5x, 12 %, for 6 f (creeping 8 % larger), ending 6 f before it lands; a stepped run.
- **Materials and numbers:** The ghost can be any layer of the coming shot: a full-frame tinted texture at about 35 % for 10 f, a huge faint line etching at about 10 % and twice its final size for 16 f, a silhouette for 2 f, a coloured glow at 20 % screen over the current plate for 20 f. Small marks can do the same job: corner marks switch to the next shot's accent 4-8 f before the cut, one corner a frame.

### Soft window-blind shadows across the set

`dv-window-light-shadows` · accent · energy calm · launch, feature · primitive: KeyLight

Broad soft diagonal shadow stripes (window blinds) fall across a tabletop set and move with it, so the scene reads as a real room. **When:** Tabletop or desk sets with objects. **Avoid:** Moving the stripes independently of the set.

- **Anatomy:** Static stripe plate in the ground's hue, multiplied, carried with the set.
- **Timing:** Static; moves with the camera.
- **Sound:** None.
- **Build:** A baked shadow plate (dither-gradient 'shadow' kind) with stripes, inside the set's transform.
- **Materials and numbers:** One shadow pass unites photographed and drawn pieces: a real photo cut-out lies among flat illustrated stickers and a drawn note, and a single set of soft diagonal window-blind shadows (bands 140-180 px at 1080p, a 60 px gaussian edge, a dark tint of the ground at multiply) crosses all of them, so the photo and the drawings share one room.

### Category tint crossfades through grey

`dv-tint-through-grey` · accent · energy calm · launch, feature, walkthrough · primitive: tintThroughGrey

Video panels fade in from white into a duotone with a small saturation overshoot; with each category the tint changes by passing through a neutral grey, so two tints never mix into a third hue. **When:** Several categories or use cases shown on the same panels. **Avoid:** More than about four tints.

- **Anatomy:** Duotone in; saturation overshoot +52 % then settle; crossfade via grey.
- **Timing:** Crossfades 13-18 f each; lines 35 f.
- **Sound:** A ding on the first, a sub on the last.
- **Build:** tintThroughGrey(f, { a, b, grey }) on a Develop duotone.

### The cut frame glows and decays

`dv-cut-glow-decay` · accent · energy medium · launch, feature, sting · primitive: Exposure

On the cut frame the whole stage lifts into a soft glow centred on the subject and decays by a constant ratio over half a second; a dark scene can open over-bloomed and let its halo fall. **When:** A cut onto a small bright subject on a dark stage. **Avoid:** Light stages (it reads as a flash fault).

- **Anatomy:** Peak on one frame, decay x0.92 a frame toward the base; halo falls about 70 %.
- **Timing:** Peak 1 f, decay 30-39 f.
- **Sound:** A whoosh into the cut, or an orchestral stab on the beat.
- **Build:** `<Exposure>` with up 0, peak on the cut and down 30 on an exponential.

### Light bands flow along a column

`dv-gradient-band-flow` · accent · energy medium · launch, feature · primitive: LightField

Bands of a lighter tint sweep down a coloured column at constant speed, new pulses every 25 f: the column reads as a channel with something flowing. **When:** A pipe, a column, a stream of data. **Avoid:** Beat-locking it (it should run free).

- **Anatomy:** Leading edge at a constant 256 px/f; pulses every 25 f.
- **Timing:** Constant speed; continuous.
- **Sound:** None.
- **Build:** `<LightField bands={[{ plate, width, y, period, dir: 'down' }]}>`.

### Tiles warm up, then bleach to white

`dv-tint-pulse-bleach` · accent · energy medium · launch, feature · primitive: Exposure

All tiles on a wall warm from grey through a tint over a few frames, then bleach to pure white: a colour pulse that carries a transition. **When:** Leaving a grid of images into a white scene. **Avoid:** Warm hues in a cool brand.

- **Anatomy:** Grey -> tint -> pale -> white; whole wall at once.
- **Timing:** Warm 18 f, bleach 20 f.
- **Sound:** A sub on the bleach.
- **Build:** `<Exposure>` with hue = a pale tint of the accent and swap at the peak.
- **Ban-safe default:** Pulse through a tint of the accent, then bleach. (the full look relies on orange; use it only when the brand supplies it)

### Previous hero knocked back in one frame

`dv-one-frame-knockback` · accent · energy high · launch, feature · primitive: Flashes knockback

When the big type arrives, the previous hero drops to about 55 % strength in a single frame, so the eye moves to the new element. **When:** Stacking a new statement over a previous visual. **Avoid:** Fading it slowly (that reads as indecision).

- **Anatomy:** One-frame opacity step to 0.55.
- **Timing:** 1 f.
- **Sound:** None.
- **Build:** knockback(f, land) (fx/Flashes): the previous hero's strength drops to 55 % on the new hero's landing frame (one stepped frame).

### Small token cycles through hues

`dv-hue-cycle-token` · accent · energy calm · launch, feature · primitive: HueSweep

A version number or a pill border keeps cycling through hues (or a rotating multi-colour stroke) while the wordmark stays ink. **When:** A version tag or an "active" pill in a brand with a multi-colour system. **Avoid:** House films (it reads as a template).

- **Anatomy:** Hue stops 22-26 f each; a border gradient rotating about 6 deg a frame.
- **Timing:** Stops 22-26 f; continuous.
- **Sound:** None.
- **Build:** Brand path colour cycle; the border as a conic gradient (a baked plate) rotated by transform.
- **Conditions:** gradients baked as dithered plates and moved by transform.
- **Ban-safe default:** The token breathes in lightness at the accent hue (a 0.05-0.10 L swing over 1-2 s). (the full look relies on purple; use it only when the brand supplies it)
