# Logo and end card

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

The brand lands as the last move of the story: oversized, assembled, snapped on a hit, slid open, then the one still hold of the film.

## The end card: centred, built from the last element

- **Centred.** The lockup (mark, name, and the one fact under it) sits centred in the frame, its visual mass a little above the geometric centre. The name appears once.
- **Built from what came last.** The lockup comes out of the film's last element: the last picture's card becomes the mark, the last word becomes the wordmark, the light of the last frame spins the badge in. A lockup that fades in from nowhere is the stock end card, centred or not.
- **Held 2–3 s** from the frame it is whole (the name and the fact read), on a creep of 2–6 %, never frozen; the music's ending rings under it.
- **The one fact** (where to get it, when, the price) under the lockup at the caption size, readable for 1.7 s or more; nothing else.
- **Pick one of the ten designs below** for the film, different from the last films' end cards; `assets/templates/launch-simple` deals the first two by name (the badge there turns as the last picture's element shrinks into the mark).

### Ten end-card designs (recipes)

1. **Element becomes the mark.** The last picture's hero element (a card, a button, a disc) keeps its centre while its size, radius and colour interpolate into the mark's tile (30 f, strong in-out; its surroundings leave in 12 f); the glyph inks in on it (18 f); the name slides out from behind the mark (30 f, glide-out, fading up from 45 %) and the pair re-centres as it does. Build: fx/Seam `sharedElement` with the hero's box as `fromBox` and the mark's box as `toBox`. Sound: a soft swell on the morph, one hit on the lockup.
2. **Badge spins in, the name slides out from behind it.** The mark enters at 2x turning 1.1 turns; its scale settles on a circular ease-out over 52 f, its rotation faster (40 f), a spin blur on the first frames; then the name slides out from behind it (165 px, cubic-out, fading up from 45 % in 15 f) and the lockup re-centres. Build: fx/Wordmark `spinInState` (`SPIN_IN`), fx/Defocus `SpinBlur`. Sound: a whoosh on the spin, a hit on the landing.
3. **Word becomes the wordmark.** The last line's last word turns into the name letter by letter in the same slot (outgoing letters drop 30 % of the cap height, new ones rise, 2 f apart), the mark grows in beside it and the pair re-centres (15 f, an exponential glide). Build: fx/Letters swap on the word, fx/Wordmark `lockupLayout` for the final places. Sound: a tick per swapped letter, softly; one hit on the mark.
4. **The line gathers into the name.** The last line's gaps close and the line scales to the name's width, then swaps to the name in one blur swap at the same centre and cap height (old out in 8 f to 12 px blur, new in 13 f); the mark slides in from behind. Build: fx/Seam `textSwap`. Sound: a breath on the swap.
5. **Letters on the beat.** The name appends one letter per beat over the last picture (or over the product's moments cut on the beat); the mark lands on the downbeat after the last letter, the lockup centred from the start (the letters fill a measured slot). Build: fx/Wordmark `HotGlyphs` with `every` = one beat. Sound: the track's own beat; a hit on the mark.
6. **Pull back from inside the mark.** Open on an extreme close-up of the mark (one edge filling the frame, turning slowly), pull back on a long exponential decay (about x0.97 a frame) until the flat lockup holds centred; the name rises in once the mark is whole. Build: a scale track on the mark's layer (lmix in log space), fx/Wordmark `lockupLayout`. Sound: a riser into the pull, the hit when it lands flat.
7. **The film's travelling element becomes the mark.** The one thing that crossed the whole film (a dot, a cursor, a light) arrives at the centre and becomes the mark's accent part; the other parts assemble round it from alternating edges with uneven gaps (4/3/3/7/7/4 f at 24 fps). Build: fx/Wordmark `assembleFor` with the travelling element as the first part. Sound: a pop per main part.
8. **Write in from blur.** The name's letters resolve out of a 12 px blur in a 3 f stagger, grey to ink, the mark settling beside them in the same gesture; nothing moves after it but the creep. Build: fx/TypePresets on the name, a matching blur on the mark. Sound: one soft swell under the build.
9. **Iris from a meaningful point.** The last picture's meaningful point (the button just pressed, the gap between two words) irises open onto the end card's ground; the wordmark inside settles from oversize to its size as the iris completes (24 f). Build: fx/Iris from that point, fx/Wordmark `lockupLayout`. Sound: a soft suck into the iris, a hit on the settle.
10. **Card expands into the end.** The last product card's rectangle animates to the frame (24–36 f) and its surface becomes the end card's ground; the content cross-blurs out at 40–60 % and the mark and the name rise in on the new ground, centred. Build: fx/Resize or a card box track, then the lockup. Sound: a swipe on the expand, a hit on the lockup.

Other products' marks are not an end card: one presentation a film (a chip in the line, pills round a centred line, or a wall of tiles), never a pill on every line (`references/brand-and-color.md` §1b).

[Logo grows out of a line, a bar, a pixel monogram](#logo-grows-out-of-a-line-a-bar-a-pixel-monogram) · [Blobs fuse and split, then collapse into the mark](#blobs-fuse-and-split-then-collapse-into-the-mark) · [Light comets spiral out and collapse into the logo](#light-comets-spiral-out-and-collapse-into-the-logo) · [Logo assembles from parts](#logo-assembles-from-parts) · [Mark swings or spins into place](#mark-swings-or-spins-into-place) · [Brackets become strokes that shrink to dots as the logo grows](#brackets-become-strokes-that-shrink-to-dots-as-the-logo-grows) · [Colour blocks swarm into letter slots and become glyphs](#colour-blocks-swarm-into-letter-slots-and-become-glyphs) · [The mark lands inside a window of a real photograph](#the-mark-lands-inside-a-window-of-a-real-photograph) · [Mark snaps smaller on a hit, then the lockup slides open](#mark-snaps-smaller-on-a-hit-then-the-lockup-slides-open) · [App icon de-blurs while its monogram writes and lines converge](#app-icon-de-blurs-while-its-monogram-writes-and-lines-converge) · [Start inside the mark and pull back to it](#start-inside-the-mark-and-pull-back-to-it) · [Logo cuts in oversized and settles](#logo-cuts-in-oversized-and-settles) · [Wordmark slides out of the mark](#wordmark-slides-out-of-the-mark) · [Wordmark builds letter by letter from the first stroke](#wordmark-builds-letter-by-letter-from-the-first-stroke) · [The one dead-still hold at the end](#the-one-dead-still-hold-at-the-end) · [End letters arrive hot and cool to white](#end-letters-arrive-hot-and-cool-to-white) · [Mark pops squashed and stretches to size](#mark-pops-squashed-and-stretches-to-size) · [Mark resolves in steps: de-pixel, ghost to ink, bold to final](#mark-resolves-in-steps-de-pixel-ghost-to-ink-bold-to-final) · [Wordmark letters blur-stagger in, a script suffix pen-writes](#wordmark-letters-blur-stagger-in-a-script-suffix-pen-writes) · [The mark keeps moving inside every lockup](#the-mark-keeps-moving-inside-every-lockup) · [How the film leaves: fade, cut or defocus](#how-the-film-leaves-fade-cut-or-defocus) · [Wordmark types on a beat grid, lands loose and tightens](#wordmark-types-on-a-beat-grid-lands-loose-and-tightens) · [Logo slams in on one blurred frame](#logo-slams-in-on-one-blurred-frame) · [End logo swells, then settles back](#end-logo-swells-then-settles-back)

### Logo grows out of a line, a bar, a pixel monogram

`dv-logo-build-chain` · signature · energy medium · launch, sting · primitive: MorphChain

The mark is reached through a chain of simple states: a hairline fades in, grows into a tall bar that splits into stripes, the stripe stack squashes (anticipation) and each stripe slides sideways into the pixel mark; or two dots grow into a pixel monogram glyph by glyph, which collapses into a bar, which becomes the symbol. **When:** Brands with a geometric or pixel mark; the opening or the closing of a film. **Avoid:** Chains longer than four states.

- **Anatomy:** Fade 8 f (63 % in the last frame); grow 28 f; squash -5 % then -30 %; stripes slide 23 f on an S-curve; monogram build 38 f, collapse 8 f, bar 1 f.
- **Timing:** 45-82 f.
- **Sound:** A reverse-cymbal swell bed; a pluck on the slide; a drum on the build.
- **Build:** MorphChain with explicit states (line, bar, stripes, mark) and HardStep for the stripe offsets; logoParts() for the final mark.

### Blobs fuse and split, then collapse into the mark

`dv-blob-fusion-mark` · signature · energy high · launch, sting · primitive: MorphPath (Goo)

Two huge blobs enter from both edges, fuse into a gooey shape that shrinks and bulges, split into circles, approach again and repeat three times, shrinking each time, and collapse into the mark. **When:** A brand with round forms; an energetic end. **Avoid:** More than three cycles.

- **Anatomy:** Enter 149 px/f; fuse; split expo-out; approach expo-in; bulge +11 % area and a +12 % rebound.
- **Timing:** Cycles of 18-28 f; 90 f in all.
- **Sound:** A drum at the fusion; a deep boom on the mark.
- **Build:** `<Goo at cx cy span r dot cycles={3} shrink={0.7}>` (fx/MorphPath): two blobs enter accelerating into the first hit, then fuse, split and fuse again (24 f cycles, each 0.7 the size) and collapse into the mark's dot; in flight they stretch along the travel (rx = r(1 + kv), ry = r / (1 + kv)), slowing they wobble with a facet that travels round the edge; one fixed blur and an alpha threshold merge them with crisp edges. gooState() is pure.
- **Materials and numbers:** The blobs are jelly, not perfect metaballs: in flight they stretch along their travel with flattened leading faces (rx = r(1 + kv), ry = r / (1 + kv), rotated to the heading); slowing, they become wobbling circles whose flat facet travels round the edge (r(1 + 0.06 sin(3 theta + 0.2 f))); they fuse, split and fuse again on hits before collapsing to the dot of the mark. Crisp edges, no blur or shadow; a goo filter (blur 18 then an alpha threshold) merges them.

### Light comets spiral out and collapse into the logo

`dv-comets-to-logo` · signature · energy high · launch, sting · primitive: Comets

Two point-symmetric light comets (a bright head, a curved tail) spiral out from the centre, orbit once and collapse into the logo's position at full speed, where the mark appears. **When:** A dark film's logo reveal. **Avoid:** Light grounds; glow-heavy comets in house films.

- **Anatomy:** Expand 10 f, orbit 8 f, collapse 26 f (radial 110 px/f at the end); tails 19-84 px.
- **Timing:** 34 f at 60 fps.
- **Sound:** A run of whooshes, then a hit on the mark.
- **Build:** `<Comets at x y color>` (fx/Gather) centred on the mark: two point-symmetric flat heads with tapering tails spiral out (10 f, E.snapOut, to 450 px), orbit (8 f) and collapse on E.buildIn (26 f), arriving at about 85 px per 30 fps frame; land the mark on cometsState().land. Ban-safe: no halo.
- **Materials and numbers:** The last word dims from white to grey over 14 f while its corner brackets shrink to small hooks; one frame after the dim ends two curved light comets appear crossing the word's centre and swing outward (head at full white, tail 20-85 px, a halo of about 150 px at 4-6 % over the stage, screen blend); the word's ghost stays faintly visible under them for 12 f.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Logo assembles from parts

`dv-logo-assemble-parts` · signature · energy medium · launch, sting · primitive: Wordmark

The mark builds from its parts entering from alternating edges with uneven gaps (panels front-loaded, thin parts as constant-speed stripes that stop dead, small details popping last); a custom round glyph assembles from arc pieces that grow along the circle. **When:** Logos made of geometric parts. **Avoid:** Even gaps (they read mechanical).

- **Anatomy:** Gaps 4/3/3/7/7/4 f at 24 fps; panels 7-12 f expo-out each; arcs 14 f.
- **Timing:** 14-92 f.
- **Sound:** A pop on each main part.
- **Build:** `<AssembledMark>` / assembleFor(logo, ...).

### Mark swings or spins into place

`dv-logo-swing-in` · signature · energy medium · launch, sting · primitive: Wordmark

The mark arrives already turning and settles its rotation exponentially (about 50 deg, no scale change); a round mark spins in from 2x so fast its glyph is a circular smear for a few frames; a mark enters large and blurred, counter-swings 16 deg as anticipation, swings past rest by 15-18 % and settles; a thick 3D logo card swings down from above over the words. **When:** The brand moment, once. **Avoid:** Spinning type (spin the mark only).

- **Anatomy:** Rotation circ-out (peak 15 deg/f); scale falling exponentially (tau 12 f at 24 fps); one spring allowed for the logo.
- **Timing:** 26-56 f; spring settles in 55 f.
- **Sound:** A kick on the cut; a level swell.
- **Build:** swingState({ back, spring: SPR.logoSwing, scaleFrom, tau }). Render the mark 16 times per frame at rotate(theta(t - k dt / 16)) with opacity 1/16 (a 180 deg shutter).
- **Materials and numbers:** Rotational smear on the fastest spin frames: the glyph inside the disc becomes a soft spiral ring and its tail is flung outside the disc as a comet (arc length about rotation speed x shutter x radius, about 100 deg at the peak); the rim becomes a soft band of the ground and the mark's colour; whites stay at full brightness. About 12 f of heavy smear, 12 of partial, sharp after.

### Brackets become strokes that shrink to dots as the logo grows

`dv-markers-collapse-to-logo` · signature · energy medium · launch, sting · primitive: Markers

At the last line the corner brackets turn into four diagonal strokes in an X around a centre dot, which shrink into small dots while the logo grows from the centre; one blink and the end card holds. **When:** A film that used corner markers throughout: they hand over to the logo. **Avoid:** Without a marker system earlier in the film.

- **Anatomy:** Strokes 90 -> 131 px then shrinking to 20-28 px dots; logo expo-out from the centre; one 1-frame blink.
- **Timing:** Strokes 28 f; logo 25 f.
- **Sound:** A sub-bass hit.
- **Build:** Markers rects morphed into diagonal strokes (rotated rects) then dots; Oversize from 0 is not allowed: the logo grows from the centre dot's size on E.snapOut.

### Colour blocks swarm into letter slots and become glyphs

`dv-block-swarm-to-wordmark` · signature · energy high · launch, sting · primitive: BlockSwarm

Coloured rectangles flash at scattered spots for two frames each, converge, become letter-sized placeholders in the wordmark's slots, and swap to glyphs one by one; the mascot fills in to black. **When:** Playful brands with a palette; a wordmark reveal. **Avoid:** Calm films.

- **Anatomy:** Blocks held 2 f at random spots; converge; placeholders in letter boxes; glyph swaps every 1-2 f.
- **Timing:** Swarm 18 f; swaps 2-4 f apart; fill 16 f.
- **Sound:** A whoosh, a bubble pop, a key click.
- **Build:** `<BlockSwarm at text x y font palette>` (fx/Gather): one block per letter flashes at a seeded spot for two frames (4 f at 60), each pose nearer its slot (18 f), sits as a letter-sized placeholder (6 f), then the glyphs swap in left to right every 3 f; letterSlots() gives the boxes; fill the mascot with Develop or a tint.

### The mark lands inside a window of a real photograph

`dv-mark-in-photo-window` · signature · energy calm · launch · primitive: Photo

The logo is not set on a flat ground: it spins in exactly inside the window glass of a warm photograph (a train window onto a mountain lake), sitting on the horizon, with the rest of the photo softly out of focus round it and a very slow push. **When:** A consumer brand with a place or a feeling; the end card of a lifestyle film. **Avoid:** Developer tools; busy photos without a calm window area.

- **Anatomy:** The window area sharp, the foreground and top blurred 12-18 px (a tilt-shift from two masked copies); the mark about 146 px across, centred on the horizon at 52 % of the window's height; push about 1 % over the beat.
- **Timing:** Holds about 90 f; the wordmark follows on the next hit.
- **Sound:** Spin-in on a whoosh; wordmark on the next hit.
- **Build:** Photo framed on the window, a second blurred copy masked outside it, and the lockup placed in the window's rect.
- **Materials and numbers:** Choose a free photo whose window or frame is the composition; grade it toward the brand's ink so the mark owns the brightest colour.

### Mark snaps smaller on a hit, then the lockup slides open

`dv-lockup-snap-slide` · signature · energy high · launch, sting · primitive: Wordmark

The symbol shrinks slowly on an ease-in, snaps to half size in one frame on a drum hit, keeps settling smaller, then slides aside while the wordmark rises or slides out from under it, its letters popping every 1.4 f; a wordmark can arrive oblique, straighten in 3 frames and snap smaller. **When:** The end lockup of a launch film. **Avoid:** Snaps off the beat.

- **Anatomy:** Shrink ease-in, snap x0.5 in 1 f, settle x0.68 expo-out, slide 41-48 f (peak speed past the middle), letters pop with a 24 px rise; then the lock (the one held frame run).
- **Timing:** Snap 1 f; settle 22 f; slide 41-48 f; letters 2-3 f apart.
- **Sound:** A drum on the snap; a 0.35 s drop-out after; a pluck.
- **Build:** `<Lockup at shrink snap settle slide wordmark>`.

### App icon de-blurs while its monogram writes and lines converge

`dv-icon-monogram-converge` · signature · energy medium · launch, sting · primitive: Oversize+Stepped.strokeDrawn

A rounded app-icon tile cuts in blurred at about 2.3x and shrinks to size while sharpening; inside it a monogram is written with a pen; about 16 curves draw in from the frame edges converging on it. **When:** An app's end card. **Avoid:** Too many converging lines (over about 20).

- **Anatomy:** Icon settle 71 f; pen 26 f; lines with linear ink growth 66 f.
- **Timing:** Icon to size 28 f, settle 140 f.
- **Sound:** Voice.
- **Build:** Oversize from 2.3 with defocus; the monogram path with strokeDrawn(); converging curves as SVG paths with dash growth.

### Start inside the mark and pull back to it

`dv-pull-back-from-mark` · signature · energy high · launch, sting · primitive: camera-moves

Hard cut to the inside of a huge 3D mark; the camera pulls back about 12x with a roll (the first frame halves the size, the ratio relaxing after), then snaps to the flat mark. **When:** The end of a film whose mark has a 3D form. **Avoid:** Marks without a recognisable silhouette.

- **Anatomy:** Pull back in log space, roll, final snap to the flat version.
- **Timing:** 76 f + 34 f.
- **Sound:** Kick, snare, kick across the pull.
- **Build:** zoomThrough in reverse (factor 1/12) with roll; HardStep to the flat mark.

### Logo cuts in oversized and settles

`dv-logo-oversize-land` · workhorse · energy medium · any · primitive: Oversize

The mark or wordmark cuts in larger than its rest (1.3-1.9x), often defocused or tinted, and settles down with nearly half the move on the first frame; a square can jump 85 % in one frame and ease the rest over a long tail; a wordmark can resolve from a tint and blur, then drift away accelerating. **When:** Lockups, end cards, the brand's first appearance. **Avoid:** Scaling the logo up from nothing.

- **Anatomy:** Scale 1.34-1.86x -> 1; blur peaks 3 f after entry then clears; colour tint -> ink (or a hue sweep).
- **Timing:** 28-62 f; 47 % of the travel in the first frame.
- **Sound:** The voice saying the name 3 f after the picture; a snare on the jump.
- **Build:** `<Oversize from={1.4} dur={30} defocus>` on the mark; Lockup snap for a one-frame jump.

### Wordmark slides out of the mark

`dv-wordmark-slides-from-mark` · workhorse · energy calm · any · primitive: Wordmark

The mark travels aside to make room and the wordmark slides out from behind it, fading up from pale or revealed by a soft mask, and the whole lockup re-centres; after it lands the gap keeps closing until mark and word almost touch. **When:** Every lockup that does not need a hit. **Avoid:** The wordmark fading in place next to a static mark.

- **Anatomy:** Slide 110-299 px cubic-out (38-42 % on the first step); wordmark opacity 0.3 -> 1 over 15 f, horizontally smeared at first; gap 20 -> 5 px in a slow tail.
- **Timing:** Slide 45-80 f; mask 20 f; gap tail 36 f.
- **Sound:** Often none (the music is in its tail).
- **Build:** Lockup slide + Wipe gradient on the name, or Words with an x offset on E.snapOut.
- **Materials and numbers:** The wordmark can enter as a see-through wash: at 25-35 % opacity over the photo (the scene visible through the letters), doubled sideways by a ghost offset 20-30 px at half its opacity, turning solid brand colour as it slides 110-165 px into place over about 52 f.

### Wordmark builds letter by letter from the first stroke

`dv-wordmark-letter-build` · workhorse · energy medium · launch, feature, sting · primitive: Letters

The first letter is drawn upward from a 1 px line at the baseline to full height while sliding; the remaining letters appear light grey a little to the right, slide left into tight kerning and darken to the ink, 2 frames apart. **When:** The product name, once. **Avoid:** Long names (over about 10 letters).

- **Anatomy:** First letter 1, 3, 7, 16, 30, 49, 72 px on a sine-in; others 60 px offset, sine-out slide, grey to ink.
- **Timing:** First letter 14 f; others 18 f each, 4 f apart.
- **Sound:** None needed; or a soft tick per letter.
- **Build:** `<Letters mode="build">`.

### The one dead-still hold at the end

`dv-still-end-hold` · workhorse · energy calm · any · primitive: recipe (plain layers)

The film's only frozen frames are the end lockup: the card holds completely still for 1.2-3 s while the music drops out or a single final kick lands under it; a URL can pop on a sub-drop; the wordmark can scale in from 0.81 first; a split screen can hold one pane static while the others keep moving. **When:** Every end card. **Avoid:** Fading to black under the hold; freezing anything earlier in the film.

- **Anatomy:** Zero drift (frame difference near 0); optional URL pop in one frame; optional plain entrance (4 blank frames, a 40 f linear fade).
- **Timing:** Hold 73-220 f.
- **Sound:** The music tail drops out (to about -42 LUFS) or a final kick; a cork pop and a sub-drop on the URL.
- **Build:** Recipe: a static end card from the timeline with no creep (declare the still range so the checks accept it).

### End letters arrive hot and cool to white

`dv-hot-glyph-cool` · accent · energy medium · launch, sting · primitive: Wordmark

End wordmark letters arrive one every 6 frames (sixteenths, the first on the beat), each saturated in the accent with a short fade on birth, cooling to white over about 44 f. **When:** End cards in a film with a recency colour system. **Avoid:** Glow halos in house films.

- **Anatomy:** Accent -> white per letter; halo decay 42 f.
- **Timing:** Letters every 6 f; cooling 44 f.
- **Sound:** The first letter on the sub hit.
- **Build:** hotGlyphState / `<HotGlyphs every={6} cool={44}>`.
- **Materials and numbers:** The halo travels with the newest letter: each new letter is born with a gradient fill (white to the accent across the glyph) and a two-layer glow (18 px and 60 px blur), wipes on with a left-to-right alpha ramp for 4 f, and cools to white over about 24 f; a soft radial halo about 350 x 260 px eases toward the newest letter at every step, so the glow is always on the head of the word.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo; gradients baked as dithered plates and moved by transform.

### Mark pops squashed and stretches to size

`dv-mark-squash-pop` · accent · energy medium · launch, sting · primitive: recipe (plain layers)

The mark appears on the frame after a dot at full width but 79 % height (108 % wide), and stretches to its true proportions over 6 frames: a landing with squash. **When:** Marks that land on a beat after a dot or a drop. **Avoid:** Squash on type.

- **Anatomy:** Height 0.79 -> 1 cubic-out over 12 f; width 1.08 -> 1 over 26 f.
- **Timing:** 12-26 f.
- **Sound:** A kick.
- **Build:** Recipe: separate scaleX and scaleY tweens on the mark.

### Mark resolves in steps: de-pixel, ghost to ink, bold to final

`dv-mark-resolve-steps` · accent · energy medium · launch, sting · primitive: Pixelate

A pixel-art mark appears as very coarse cells and resolves to finer cells while it zooms out; a glyph inside a notched square steps from ghost to white to ink; a symbol appears heavy with its counters filled and thins until the holes open, with small ticks radiating. **When:** Pixel or geometric marks. **Avoid:** Smooth tweens for these steps.

- **Anatomy:** Cells 55 -> 20 px near-linear; glyph states 3-4 f each; weight thinning over 34 f.
- **Timing:** 16-75 f.
- **Sound:** A ding; a drum on the bold state.
- **Build:** Pixelate in-phase on the mark; HardStep for the ghost-white-ink states; weight via two outline paths morphed (Morph path).
- **Materials and numbers:** The symbol is a jagged upscaled bitmap until the snap: while big it shows hard pixel staircases with 2-3 grey anti-alias levels per step (a 40 px bitmap scaled with nearest-neighbour, cells about 14 px), and on the one-frame snap to half size on a drum hit it becomes the clean vector.

### Wordmark letters blur-stagger in, a script suffix pen-writes

`dv-wordmark-soft-reveal` · accent · energy calm · launch, sting · primitive: Letters

The icon scales in, then the wordmark letters reveal left to right (about 1.3 f per glyph), each from a blur or a pale tint to full; a script suffix writes on with a pen; a dot can run a rounded path with a hairline trail. **When:** Soft, friendly brands. **Avoid:** Script suffixes in a brand without one.

- **Anatomy:** Per letter blur 20 px -> 0 and fade over 3-4 f; script 16-28 f; settle 100 f; optional 90 f fade to black.
- **Timing:** Letters 22-24 f; script 16-28 f.
- **Sound:** Kicks under the icon; a whoosh on the exit; audio to silence.
- **Build:** Letters build with FocusWord-style blur per letter; script as a stroke path with strokeDrawn().
- **Materials and numbers:** The end fade dims the white ground to grey and black while the floor glow keeps its colour a beat longer (the ground's brightness falls over 90 f, the glow's starts 20 f later), so the coloured light is the last thing besides the wordmark, which deepens to a dark shade of the accent.

### The mark keeps moving inside every lockup

`dv-living-mark-sprite` · accent · energy calm · launch, loop · primitive: Stepped

The mark runs as a 12 fps sprite cycle (wings, legs) in every lockup and in the long end hold, so the end card stays alive while everything else holds; the opening mark sequence can replay frame-identically at the end before branching into the end card. **When:** Brands with a character or animated mark; loops. **Avoid:** Cycles that compete with the wordmark.

- **Anatomy:** Sprite frames every 5 f at 60 fps; not beat-locked; the end hold carries only the sprite.
- **Timing:** Continuous; end hold up to 296 f.
- **Sound:** Music decaying with sparse plucks and ticks.
- **Build:** `<Stepped fps={12}>` around a sprite sheet index; reuse the opening sequence by frame offset.
- **Materials and numbers:** The pixel mark is drawn with 1-bit hatching: the body and wings are runs of diagonal and vertical 1 px stripes (an engraving rendered in pixels), cells 10-11 px at final size; it de-pixels through chunky solid cells into the hatched sprite (36 f), and 2 frames of each run cycle blend to 50 % grey cells.

### How the film leaves: fade, cut or defocus

`dv-end-exit` · accent · energy calm · any · primitive: recipe (plain layers)

The last frames leave on purpose: the logo holds a third of a second and fades out on a sine over 20 f to a few black frames; or a hard cut to black on a drum hit with the tail ringing into silence; or the mark keeps receding and blurs out into silence. **When:** The final second of a film. **Avoid:** An abrupt end with the music still running.

- **Anatomy:** Fade 20 f sine; black 3-50 f; recede 0.3 %/f with a 38 f ease-in defocus.
- **Timing:** 20-103 f.
- **Sound:** A sub-drop tail; a drum hit then silence; audio dropping to silence.
- **Build:** Recipe: an opacity or defocus ramp on the end card group, aligned with the music's end.

### Wordmark types on a beat grid, lands loose and tightens

`dv-wordmark-type-on` · accent · energy medium · launch, sting · primitive: Letters

The wordmark's letters cut in one at a time on a grid locked to the music (every 8 f, triplets of the beat) or one per frame landing a little loose and tightening 3 %; a product mark resolves glyph by glyph with one glyph translucent and darkening in steps. **When:** A lockup for a product with a typed or technical feel. **Avoid:** Off-grid letter timing.

- **Anatomy:** Letters cut on; landing +44 px loose, tightening over 10 f; one glyph darkening in steps.
- **Timing:** Letters every 1-8 f; tighten 20 f.
- **Sound:** Letters within 23-33 ms of beats; a bubble pop at the end.
- **Build:** `<Letters mode="pop" tracking>` with starts on the beat grid.

### Logo slams in on one blurred frame

`dv-logo-slam-frame` · accent · energy high · launch, sting · primitive: HardStep

A big logo glyph fills its quadrant with a heavy motion blur on the last frame of a grid, moving diagonally: a one-frame slam. **When:** Closing a grid section on a hit. **Avoid:** More than one frame.

- **Anatomy:** One frame, blur along the direction of travel.
- **Timing:** 2-3 f.
- **Sound:** None needed.
- **Build:** A one-frame layer with a pre-blurred version of the glyph.

### End logo swells, then settles back

`dv-logo-swell-settle` · accent · energy calm · launch, sting · primitive: Oversize

The end logo grows a little past its rest (1.06 -> 1.22, or x1.4 with a decaying rate), then settles or slowly shrinks a few percent while the ground brightens. **When:** The last beat of a film. **Avoid:** Bounces.

- **Anatomy:** Up on an ease-out, down on an in-out; background brightens over 60 f.
- **Timing:** Up 26-38 f, down 30-44 f.
- **Sound:** The music drops out under it; a quiet tail.
- **Build:** Two tweens on the mark's scale (E.snapOut up, E.strongInOut down) or a reversal on the mark.
