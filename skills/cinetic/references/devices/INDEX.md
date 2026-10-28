# Device book: index

The creative vocabulary of a cinetic film, big and small, in 466 devices: every move the house knows, from a word that inks along a colour path to a glass dome with thin-film colour. None is a default: each film draws its own (`scripts/pick.py`), and a device named once in a brief is one beat's device, not the whole film's. Each device has its own entry in its family file: what it is and when it earns its place, its anatomy, house timing at 60 fps, the sound that goes with it, how to build it (the primitive and its props, or a recipe in plain layers), and, where it matters, the materials and their numbers.

How to use it:

- Draw first (`scripts/pick.py`), then read the drawn devices in full. Use this index to find the right device for a beat after a reroll, or to give a beat a small device of its own.
- One device per beat (about 1.5-2.5 s). A film made of devices is a sampler; a film where each beat has one well-built device reads as designed.
- Roles: a **signature** is a hero move, used once (at most two per launch film); a **workhorse** carries a film and can recur; an **accent** spices one moment.
- Numbers are frames at 60 fps (`f`) and pixels at 1080p unless an entry says otherwise.
- Rainbow, spectral and iridescent accents, multi-hue gradients and light or glow are allowed when they are part of a device: one dominant accent per film, every gradient baked and dithered. Entries that rely on them say so under **Conditions**; entries that rely on a look the house still bans carry a **ban-safe default**.

## Text animations: one per line

Text animation is the main event of a cinetic film: the script's lines (2-7 words each, one on screen at a time) each arrive their own way, no two alike. `pick.py` draws one per line (its line track, `--lines`); give each line the one that says what it says.

- **The presets** (`fx/TypePresets`, `<TypeLine spec={{ preset, text, at, out, exit }}>`): sixteen one-line animations from one spec and one renderer that measures the real font. `develop` (colour fronts run through the line), `build` (word by word on the beat), `typeFocus` (typed out of focus, the focus pulling in), `arc` (letters swing into their slots), `assemble` (letters gather from above and below the baseline), `decode` (the line opens from its centre behind accent blocks), `wheel` (the keyword rolls like a picker drum), `erode` (an old word erodes, the new one rises in its slot), `cycle` (the keyword shuffles weight and width), `punch` (a short line set big, a focus snap and a camera punch), `echo` (copies ring out on knockout boxes), `open` (words cut on touching, then the spaces open), `highlight` (an accent block walks to the keyword and parks), `slice` (strips snap together), `redact` (a box hops over the words as they change), `swarm` (words grow out of depth). Exits: cut, blur, drop, drift, push, split, swarm, dive. What each is for: `references/copy-and-type.md` §8.
- **The type families** hold the rest: [type arrivals](type-arrivals.md), [lines, layout and swaps](lines-layout-and-swaps.md), [type exits](type-exits.md), and [marks, markers and annotations](marks-markers-and-annotations.md) for the keyword.
- **Every hero line takes an emphasis** on its key words, never one device twice in a row: weight, accent, scale, swell, marker, box, under, outline or sweep (`spec.emph`), a two-line statement, a stack, planes in depth or type behind the subject ([type emphasis and dimension](type-emphasis.md)). A line set in one size, one weight and one colour reads flat however it arrives.
- **Around the line:** the graphic effects of the materials section below (dithered gradients, glass, spectral colour, glyph textures, grades as transitions), a morph from the last shot, a grid, a loader, the product's UI. Real photos where the shot shows people, places or products, finished like a studio, never drawn ([photos and footage](photos-and-footage.md), `references/imagery.md`).

## Pick by job

| job | first picks | also |
|---|---|---|
| Opening hook | [Shot opens already moving](camera.md#shot-opens-already-moving) · [Iris opens from a point already on screen](wipes-masks-and-irises.md#iris-opens-from-a-point-already-on-screen) · [Oversized landing, defocused start](type-arrivals.md#oversized-landing-defocused-start) · [A fluid swirl of light floods the dark frame and settles](glass-glow-and-spectral.md#a-fluid-swirl-of-light-floods-the-dark-frame-and-settles) · [A band of glyphs traces every subject's edge](texture-grids-and-finish.md#a-band-of-glyphs-traces-every-subject-s-edge) · [Stills pushed into an expired-film spectral look](photos-and-footage.md#stills-pushed-into-an-expired-film-spectral-look) | [No low end until the reveal](sound-and-timing.md#no-low-end-until-the-reveal) · [No hard cuts: every change hides in a camera event](camera-transitions.md#no-hard-cuts-every-change-hides-in-a-camera-event) · [Four de-synchronised mini-films in a gutterless grid](collage-and-composition.md#four-de-synchronised-mini-films-in-a-gutterless-grid) · [A photo turned into a two- or three-ink gradient map](colour-and-light.md#a-photo-turned-into-a-two-or-three-ink-gradient-map) · [Picture montage that accelerates behind held copy](photos-and-footage.md#picture-montage-that-accelerates-behind-held-copy) · [Symbol string tiles the frame and resolves into an ASCII object](texture-grids-and-finish.md#symbol-string-tiles-the-frame-and-resolves-into-an-ascii-object) |
| Reveal | [Iris opens from a point already on screen](wipes-masks-and-irises.md#iris-opens-from-a-point-already-on-screen) · [UI revealed inside a growing circle whose edge is a band of light](wipes-masks-and-irises.md#ui-revealed-inside-a-growing-circle-whose-edge-is-a-band-of-light) · [The next shot arrives as an LED dot matrix, then melts solid](wipes-masks-and-irises.md#the-next-shot-arrives-as-an-led-dot-matrix-then-melts-solid) · [Scene emerges from white, hero first](wipes-masks-and-irises.md#scene-emerges-from-white-hero-first) · [Title fills with the next image and takes over](wipes-masks-and-irises.md#title-fills-with-the-next-image-and-takes-over) · [A text-height slot opens behind the line onto the photo](wipes-masks-and-irises.md#a-text-height-slot-opens-behind-the-line-onto-the-photo) | [Soft ring swirls in and frames the statement](wipes-masks-and-irises.md#soft-ring-swirls-in-and-frames-the-statement) · [Ring of pixel blocks expands and reveals](wipes-masks-and-irises.md#ring-of-pixel-blocks-expands-and-reveals) · [Halves part like doors and the next card rises through](wipes-masks-and-irises.md#halves-part-like-doors-and-the-next-card-rises-through) · [Two discs converge and their overlap opens a world](wipes-masks-and-irises.md#two-discs-converge-and-their-overlap-opens-a-world) · [Planet horizon drops and the sky blooms](colour-and-light.md#planet-horizon-drops-and-the-sky-blooms) · [The music stops for a breath before the reveal](sound-and-timing.md#the-music-stops-for-a-breath-before-the-reveal) |
| Emphasis | [A tint wave travels through the words and drains](colour-and-light.md#a-tint-wave-travels-through-the-words-and-drains) · [Word inks along a colour path](type-arrivals.md#word-inks-along-a-colour-path) · [Colour front sweeps a set line to ink](type-arrivals.md#colour-front-sweeps-a-set-line-to-ink) · [A highlight walks the line, parks on the keyword, new words type hot](type-arrivals.md#a-highlight-walks-the-line-parks-on-the-keyword-new-words-type-hot) · [Four tiny corner squares that blink and jump](marks-markers-and-annotations.md#four-tiny-corner-squares-that-blink-and-jump) · [L-brackets frame a word and shrink-wrap it](marks-markers-and-annotations.md#l-brackets-frame-a-word-and-shrink-wrap-it) | [Design-tool selection box snaps to each word](marks-markers-and-annotations.md#design-tool-selection-box-snaps-to-each-word) · [Keyword sits in a highlight block or pill](marks-markers-and-annotations.md#keyword-sits-in-a-highlight-block-or-pill) · [Type filled with a gradient that blooms](colour-and-light.md#type-filled-with-a-gradient-that-blooms) · [Oversized landing, defocused start](type-arrivals.md#oversized-landing-defocused-start) · [Newest word lands in the accent and cools to ink](colour-and-light.md#newest-word-lands-in-the-accent-and-cools-to-ink) · [Marker-pen strokes write on, slash and erase](marks-markers-and-annotations.md#marker-pen-strokes-write-on-slash-and-erase) |
| Transition | [Velocity handoff: cut on the fastest frame, next shot already moving](cuts-and-seams.md#velocity-handoff-cut-on-the-fastest-frame-next-shot-already-moving) · [An object continues through the cut in a new role](cuts-and-seams.md#an-object-continues-through-the-cut-in-a-new-role) · [Rush: geometric acceleration into the cut](speed-and-rush.md#rush-geometric-acceleration-into-the-cut) · [Pixel glint sprite on twos bridges a cut](cuts-and-seams.md#pixel-glint-sprite-on-twos-bridges-a-cut) · [Full-frame defocus pulse hides a change](camera-transitions.md#full-frame-defocus-pulse-hides-a-change) · [One jump frame hides the cut inside a zoom](camera-transitions.md#one-jump-frame-hides-the-cut-inside-a-zoom) | [Whip zoom with roll and counter-roll](camera-transitions.md#whip-zoom-with-roll-and-counter-roll) · [Zoom through an object into the next scene](camera-transitions.md#zoom-through-an-object-into-the-next-scene) · [Camera dives through a soft layer](camera-transitions.md#camera-dives-through-a-soft-layer) · [Pixelate out and in on the beat](cuts-and-seams.md#pixelate-out-and-in-on-the-beat) · [Ground darkens or drains as an exit](colour-and-light.md#ground-darkens-or-drains-as-an-exit) · [A fluid swirl of light floods the dark frame and settles](glass-glow-and-spectral.md#a-fluid-swirl-of-light-floods-the-dark-frame-and-settles) |
| Proof | [Big statistic lands oversized with tiny labels](data-and-numbers.md#big-statistic-lands-oversized-with-tiny-labels) · [Count grows geometrically, then jumps to the total](data-and-numbers.md#count-grows-geometrically-then-jumps-to-the-total) · [Chart built from tiny cells that fill](data-and-numbers.md#chart-built-from-tiny-cells-that-fill) · [Line chart draws with the voice](data-and-numbers.md#line-chart-draws-with-the-voice) · [Digits roll or resolve into place](data-and-numbers.md#digits-roll-or-resolve-into-place) · [Detection boxes keep faces in true colour while the frame turns false-colour](photos-and-footage.md#detection-boxes-keep-faces-in-true-colour-while-the-frame-turns-false-colour) | [The copy and the work continue on real surfaces](photos-and-footage.md#the-copy-and-the-work-continue-on-real-surfaces) · [One full-spectrum object in a one-hue film](data-and-numbers.md#one-full-spectrum-object-in-a-one-hue-film) · [Four de-synchronised mini-films in a gutterless grid](collage-and-composition.md#four-de-synchronised-mini-films-in-a-gutterless-grid) · [One generated character carried across plates](photos-and-footage.md#one-generated-character-carried-across-plates) · [Thin pen lines circle, underline and point](marks-markers-and-annotations.md#thin-pen-lines-circle-underline-and-point) · [Node graph draws its links](data-and-numbers.md#node-graph-draws-its-links) |
| Product moment | [Panel arrives front-loaded, focus lagging](ui-choreography.md#panel-arrives-front-loaded-focus-lagging) · [Press: squeeze, short hold, snap home](micro-interactions.md#press-squeeze-short-hold-snap-home) · [Agent step list: spinner rows that tick to checks](loaders-and-progress.md#agent-step-list-spinner-rows-that-tick-to-checks) · [A tiny seed square appears first, then unfolds](micro-interactions.md#a-tiny-seed-square-appears-first-then-unfolds) · [Small object becomes the next word, card or cell](morphs-and-object-handoffs.md#small-object-becomes-the-next-word-card-or-cell) · [Whole frame collapses into a chip or card](morphs-and-object-handoffs.md#whole-frame-collapses-into-a-chip-or-card) | [Cursor glides in, dwells, then clicks](cursor.md#cursor-glides-in-dwells-then-clicks) · [Send button launches](micro-interactions.md#send-button-launches) · [Image resolves through representations](loaders-and-progress.md#image-resolves-through-representations) · [The field bends like jelly where it is pressed](micro-interactions.md#the-field-bends-like-jelly-where-it-is-pressed) · [Coloured dots bleed along a border into one spectral ring](glass-glow-and-spectral.md#coloured-dots-bleed-along-a-border-into-one-spectral-ring) · [Code types in plain ink; syntax colours arrive a few frames later](ui-choreography.md#code-types-in-plain-ink-syntax-colours-arrive-a-few-frames-later) |
| Update change | [State changes in place without travel](micro-interactions.md#state-changes-in-place-without-travel) · [The tagline is set as a string inside the product UI](lines-layout-and-swaps.md#the-tagline-is-set-as-a-string-inside-the-product-ui) · [Edits happen in place under the hovering cursor](photos-and-footage.md#edits-happen-in-place-under-the-hovering-cursor) · [Resize: small creep, one big jump, long settle](ui-choreography.md#resize-small-creep-one-big-jump-long-settle) · [New item pushes in, older items step back](ui-choreography.md#new-item-pushes-in-older-items-step-back) · [Only the last word swaps](lines-layout-and-swaps.md#only-the-last-word-swaps) | [Line opens a gap for an inline object](lines-layout-and-swaps.md#line-opens-a-gap-for-an-inline-object) · [Chosen item enlarges while the rest dissolve](ui-choreography.md#chosen-item-enlarges-while-the-rest-dissolve) · [Product stays fixed while the world swaps behind it](photos-and-footage.md#product-stays-fixed-while-the-world-swaps-behind-it) · [Code types in plain ink; syntax colours arrive a few frames later](ui-choreography.md#code-types-in-plain-ink-syntax-colours-arrive-a-few-frames-later) · [Skeleton placeholders hand over to content](micro-interactions.md#skeleton-placeholders-hand-over-to-content) · [Toast or chip arrives smeared or blurred, then sharpens](micro-interactions.md#toast-or-chip-arrives-smeared-or-blurred-then-sharpens) |
| Logo / lockup | [Mark snaps smaller on a hit, then the lockup slides open](logo-and-end-card.md#mark-snaps-smaller-on-a-hit-then-the-lockup-slides-open) · [Logo cuts in oversized and settles](logo-and-end-card.md#logo-cuts-in-oversized-and-settles) · [Wordmark slides out of the mark](logo-and-end-card.md#wordmark-slides-out-of-the-mark) · [Light comets spiral out and collapse into the logo](logo-and-end-card.md#light-comets-spiral-out-and-collapse-into-the-logo) · [Blobs fuse and split, then collapse into the mark](logo-and-end-card.md#blobs-fuse-and-split-then-collapse-into-the-mark) · [Mark resolves in steps: de-pixel, ghost to ink, bold to final](logo-and-end-card.md#mark-resolves-in-steps-de-pixel-ghost-to-ink-bold-to-final) | [End letters arrive hot and cool to white](logo-and-end-card.md#end-letters-arrive-hot-and-cool-to-white) · [The mark lands inside a window of a real photograph](logo-and-end-card.md#the-mark-lands-inside-a-window-of-a-real-photograph) · [A word seen through fluted glass, sliced into refracted strips](glass-glow-and-spectral.md#a-word-seen-through-fluted-glass-sliced-into-refracted-strips) · [Brand colour withheld until the mark lands](colour-and-light.md#brand-colour-withheld-until-the-mark-lands) · [Logo assembles from parts](logo-and-end-card.md#logo-assembles-from-parts) · [The one dead-still hold at the end](logo-and-end-card.md#the-one-dead-still-hold-at-the-end) |
| Texture / material | [A band of glyphs traces every subject's edge](texture-grids-and-finish.md#a-band-of-glyphs-traces-every-subject-s-edge) · [Dither-pixel patch licks up through outlines](texture-grids-and-finish.md#dither-pixel-patch-licks-up-through-outlines) · [A portrait drawn in two digits under a rising gradient](texture-grids-and-finish.md#a-portrait-drawn-in-two-digits-under-a-rising-gradient) · [Halftone, ASCII and dither as the picture's texture](texture-grids-and-finish.md#halftone-ascii-and-dither-as-the-picture-s-texture) · [Holographic foil icons with frosted inner tiles](glass-glow-and-spectral.md#holographic-foil-icons-with-frosted-inner-tiles) · [Soap-bubble glass with thin-film rainbow bands](glass-glow-and-spectral.md#soap-bubble-glass-with-thin-film-rainbow-bands) | [Ground made of vertical bars](texture-grids-and-finish.md#ground-made-of-vertical-bars) · [Full-frame satin folds of colour that roll through hues](colour-and-light.md#full-frame-satin-folds-of-colour-that-roll-through-hues) · [Hairline layout grid as the ground](texture-grids-and-finish.md#hairline-layout-grid-as-the-ground) · [Design-tool guides that track a mask's bounding box](texture-grids-and-finish.md#design-tool-guides-that-track-a-mask-s-bounding-box) · [Grain and print texture as the picture's finish](texture-grids-and-finish.md#grain-and-print-texture-as-the-picture-s-finish) · [A fan of curves that keep vibrating like strings](texture-grids-and-finish.md#a-fan-of-curves-that-keep-vibrating-like-strings) |
| Light / colour event | [Frame blooms into light and settles out of it](colour-and-light.md#frame-blooms-into-light-and-settles-out-of-it) · [Caustic light switches on inside an object](glass-glow-and-spectral.md#caustic-light-switches-on-inside-an-object) · [Floor glow under the stage, brightening into reveals](colour-and-light.md#floor-glow-under-the-stage-brightening-into-reveals) · [A tile lights from beneath and spills onto its neighbours](glass-glow-and-spectral.md#a-tile-lights-from-beneath-and-spills-onto-its-neighbours) · [Click or hover lights the object](colour-and-light.md#click-or-hover-lights-the-object) · [A window floats inside radial light streaks](glass-glow-and-spectral.md#a-window-floats-inside-radial-light-streaks) | [Hard colour swaps that step the size](colour-and-light.md#hard-colour-swaps-that-step-the-size) · [Ground flips on one frame as punctuation](colour-and-light.md#ground-flips-on-one-frame-as-punctuation) · [Soft blobs drift behind the copy](colour-and-light.md#soft-blobs-drift-behind-the-copy) · [Radial lens chromatic aberration on light lines](glass-glow-and-spectral.md#radial-lens-chromatic-aberration-on-light-lines) · [A soft light band carries the old graphic out](wipes-masks-and-irises.md#a-soft-light-band-carries-the-old-graphic-out) · [A light sheen crosses a landing object once](colour-and-light.md#a-light-sheen-crosses-a-landing-object-once) |

## Materials and VFX

How the materials are built: the stops, the layers and the numbers behind gradients, glass, glow and textures. The devices listed under each part use them.

### Gradients and dither

- **Compute in float, dither, quantise once, load as a plate.** A CSS gradient bands at 8 bits and a moving one re-rasterises every frame. Bake every soft ramp with `scripts/dither-gradient.py` (±1 LSB triangular dither) and move the PNG by transform and opacity. A field that must change colour cross-fades two baked plates; it never animates its stops. A plate sized to its text is baked at render time by `ditherPlate()` (fx/plates.ts: OKLab stops, the same triangular dither, cached per recipe).
- **One gradient family per film.** Every strip, sky, light flood and mesh ground uses the same three to five stops from the brand tokens. Order the stops by lightness so no midpoint goes muddy: a warm stop sits between a hot hue and white, never next to the cool hue it would grey against.
- **Grain lives inside the ramp.** Large soft gradients carry a per-pixel dither of about 0.75-1.5 levels sigma that only shows under a contrast boost; flat stages stay clean.
- **Mesh grounds are two inks.** Saturated pools of the accent (blurred 25-35 % of the frame width) in a pale tinted base, near-white highlights along one S-shaped ribbon, drifting about 0.5 % a frame and continuous across cuts.
- **Stepped is a choice.** Hard vertical bars of flat colour make a glow read as a staircase (an audio meter); hard stops never band, so a stepped ramp needs no dither.
- **Floor light is a horizon.** A near-white core at the very bottom edge, then the accent, a deeper hue and black; an ellipse about 140 % of the frame wide centred just below the frame.
- **A tilted tint is a lit page.** Paper over the first third, then an S-shaped ramp to the tint along one edge 8 degrees off vertical (4 / 24 / 81 % of the tint at 34 / 52 / 84 % of the run, the tint the accent a fifth of the way to paper): `fx/Washes` `tilted`, or the `tint` ground of `fx/Grounds` for one act. Nodes, pills and a diagram stand clear on it; it is the film's one colour ground, never every act's.

Devices: [Ground gradient swaps or floods](colour-and-light.md#ground-gradient-swaps-or-floods) · [Soft blobs drift behind the copy](colour-and-light.md#soft-blobs-drift-behind-the-copy) · [Floor glow under the stage, brightening into reveals](colour-and-light.md#floor-glow-under-the-stage-brightening-into-reveals) · [Ground made of vertical bars](texture-grids-and-finish.md#ground-made-of-vertical-bars) · [Full-frame satin folds of colour that roll through hues](colour-and-light.md#full-frame-satin-folds-of-colour-that-roll-through-hues) · [A photo turned into a two- or three-ink gradient map](colour-and-light.md#a-photo-turned-into-a-two-or-three-ink-gradient-map) · [Grey problem pills, then blue benefit pills](collage-and-composition.md#grey-problem-pills-then-blue-benefit-pills) · [Pill marquee; selected pills fill](micro-interactions.md#pill-marquee-selected-pills-fill) · [Outgoing scene melts by defocus under the next](morphs-and-object-handoffs.md#outgoing-scene-melts-by-defocus-under-the-next)

### Type built from gradients

- **Construction.** Clip the text to a layer three times its width (`background-clip: text`, `background-size: 250-300 %`) and slide the layer, or better, use the glyphs as a mask over a baked plate moved by transform. Every effect below is that one move with different stops. `<TypeFill>` (fx/TypeFill) is that move: modes `band` (tintBand, spectralInk), `shimmer`, `develop` (developFronts), `window`, `swap` and `fill`.
- **Shimmer band.** On a dark or tinted ground: a white band about one word wide (5-7 letters) with 2.5 letters of feather each side, about 0.7 letters a frame, period about 40 f, restarting at once. On a light UI invert it: a band darker than the grey base, about 40 % of the word, period 16-20 f. Include the ellipsis.
- **Band shoulders.** A colour band crossing type never fades through grey. On black type: black, a deep shade of the accent (0.4 letter), the accent core (1-1.5 letters), the deep shade, black. On white type the shoulders are a pale tint.
- **Leave ink behind.** A spectral or hue band about three times the label's width slides across on a slow-fast-slow curve (bezier 0.37, 0.13, 0.26, 0.95) and its tail is the ink colour, so the label ends in ink.
- **Develop through hues.** A transparent head feathered over 5 letters, then fronts of several hues, each slower than the last, the ink front easing out and stalling at 85 % before the end catches up.
- **Heat cooling.** A landed word cools from a hot accent to ink as a band about 30 % of its width that crosses in 40 f, expo-out.
- **Glow on type.** A duplicate blurred 18-24 px at about 50 % in a deeper hue behind the fill; on a scramble the halo switches off as a cut on the lock frame.
- **Tight append.** A new word lands touching the last (zero word space, or overlapping when it flies in large), then only the newcomer slides and the space opens over 8-16 f on an ease-out.

Devices: [A shine passes through text while it loads](loaders-and-progress.md#a-shine-passes-through-text-while-it-loads) · [A tint wave travels through the words and drains](colour-and-light.md#a-tint-wave-travels-through-the-words-and-drains) · [Word inks along a colour path](type-arrivals.md#word-inks-along-a-colour-path) · [Colour front sweeps a set line to ink](type-arrivals.md#colour-front-sweeps-a-set-line-to-ink) · [Oversized landing, defocused start](type-arrivals.md#oversized-landing-defocused-start) · [Type filled with a gradient that blooms](colour-and-light.md#type-filled-with-a-gradient-that-blooms) · [A highlight walks the line, parks on the keyword, new words type hot](type-arrivals.md#a-highlight-walks-the-line-parks-on-the-keyword-new-words-type-hot) · [A label rises in gradient ink, then a blink wave turns it white](type-arrivals.md#a-label-rises-in-gradient-ink-then-a-blink-wave-turns-it-white) · [Letter-by-letter fade across a word](type-arrivals.md#letter-by-letter-fade-across-a-word) · [Word cuts on touching, then the space opens](lines-layout-and-swaps.md#word-cuts-on-touching-then-the-space-opens) · [Glyph scramble that locks into the word](type-arrivals.md#glyph-scramble-that-locks-into-the-word) · [End letters arrive hot and cool to white](logo-and-end-card.md#end-letters-arrive-hot-and-cool-to-white) · [Small bevelled metal numerals for rank](data-and-numbers.md#small-bevelled-metal-numerals-for-rank) · [Typing with an accent trail on the newest characters](type-arrivals.md#typing-with-an-accent-trail-on-the-newest-characters)

### Spectral and iridescent

- **One dominant spectral accent per film.** A rainbow is a signal: one object, one border, one band, one plate. Everything else stays in the film's inks.
- **Spectral order.** Keep the wheel in order (red, orange, yellow, green, cyan, blue, violet, magenta) and keep yellow and green thin in arcs; neighbouring hues meet without a grey seam.
- **Thin film.** Soap-bubble bands are pastel (pink, peach, mint, lilac, sky), each 6-10 % of the radius, 25-40 % opacity, soft 20 px edges, strongest at the rim and gone at the crown, with a white fresnel rim.
- **Foil.** Holographic surfaces are a conic gradient (cool rim, warm, pink, lilac) blurred about 6 px inside the shape and turned to a different angle per object, under a frosted white tile.
- **Bleed and travel.** Colour can leak along a border from its sources until it closes into a ring, or slide through a label and leave ink; the movement is what makes it read as meaning.
- **Lens aberration.** A radial channel scale (red 0.982, blue 1.018 about the frame centre) turns every thin light line into a warm-green-blue triplet that grows with radius; build it once over the whole graphic layer.

Devices: [Coloured dots bleed along a border into one spectral ring](glass-glow-and-spectral.md#coloured-dots-bleed-along-a-border-into-one-spectral-ring) · [Word inks along a colour path](type-arrivals.md#word-inks-along-a-colour-path) · [Soap-bubble glass with thin-film rainbow bands](glass-glow-and-spectral.md#soap-bubble-glass-with-thin-film-rainbow-bands) · [Holographic foil icons with frosted inner tiles](glass-glow-and-spectral.md#holographic-foil-icons-with-frosted-inner-tiles) · [Frosted glass tiles with rainbow prism rims](glass-glow-and-spectral.md#frosted-glass-tiles-with-rainbow-prism-rims) · [Radial lens chromatic aberration on light lines](glass-glow-and-spectral.md#radial-lens-chromatic-aberration-on-light-lines) · [Stills pushed into an expired-film spectral look](photos-and-footage.md#stills-pushed-into-an-expired-film-spectral-look) · [Rainbow arcs, prism beams and auras composited into plates](glass-glow-and-spectral.md#rainbow-arcs-prism-beams-and-auras-composited-into-plates) · [One full-spectrum object in a one-hue film](data-and-numbers.md#one-full-spectrum-object-in-a-one-hue-film) · [A window floats inside radial light streaks](glass-glow-and-spectral.md#a-window-floats-inside-radial-light-streaks) · [Rim highlight from a fixed light](texture-grids-and-finish.md#rim-highlight-from-a-fixed-light)

### Glass and refraction

- **Frost is two copies.** A sharp copy of what is behind, clipped outside the glass, and a blurred, dimmed copy (8-24 px, 40-50 % luma) clipped inside it; the rim stays crisp and a soft shadow darkens what sits just above the edge. This beats `backdrop-filter` for determinism and speed.
- **Refraction is a scaled copy.** Inside the shape: the backdrop scaled 1.1-1.2x about its centre, blurred 2-4 px, darkened, with a 2 px channel split on bright lines and a caustic of the accent over 30 % of the radius.
- **Dispersion lives on edges.** Hard edges get 1-1.5 px colour offsets (warm one side, cyan the other) or a soft 60 px rainbow hugging one inner edge; a caustic band has a warm core and magenta and cyan borders.
- **Fluted glass.** Vertical stripes 40-60 px wide, each displacing what is behind by up to 15-25 px with a lens ramp inside the stripe; clear it by stepping the strength through fixed levels.
- **Specular rims.** A bright cap on a pill's rounded end that splits into two glints running along the top and bottom rims; a rim whose bright spot stays fixed while the object moves.
- **Never animate a blur radius.** Every glass effect uses fixed blur levels and opacity, so each frame renders the same at any sample.

Devices: [Frosted panel over a living plate](glass-glow-and-spectral.md#frosted-panel-over-a-living-plate) · [Glass objects refract the world behind them, then turn opaque](glass-glow-and-spectral.md#glass-objects-refract-the-world-behind-them-then-turn-opaque) · [A word seen through fluted glass, sliced into refracted strips](glass-glow-and-spectral.md#a-word-seen-through-fluted-glass-sliced-into-refracted-strips) · [Soap-bubble glass with thin-film rainbow bands](glass-glow-and-spectral.md#soap-bubble-glass-with-thin-film-rainbow-bands) · [Frosted glass tiles with rainbow prism rims](glass-glow-and-spectral.md#frosted-glass-tiles-with-rainbow-prism-rims) · [Caustic light switches on inside an object](glass-glow-and-spectral.md#caustic-light-switches-on-inside-an-object) · [Round button with a liquid fill and a rim](micro-interactions.md#round-button-with-a-liquid-fill-and-a-rim) · [A light sheen crosses a landing object once](colour-and-light.md#a-light-sheen-crosses-a-landing-object-once) · [Rim highlight from a fixed light](texture-grids-and-finish.md#rim-highlight-from-a-fixed-light) · [A ring draws around the subject, then ripples](marks-markers-and-annotations.md#a-ring-draws-around-the-subject-then-ripples)

### Glow anatomy

- **A lit edge has a side.** A glass card's or a pill's border is brightest where it faces the key and thins round to the far side (peak 0.9, far 0.12, the bright arc 110 degrees, the width read at 35 % away from the light), with a soft spill just past the edge toward the key: `fx/Rim` `KeyRim`. A uniform 1 px outline reads as a wireframe.

- **Core, body, falloff.** A light is three stops: a near-white core (about 60 px), a body in the accent (about 220 px), a falloff to transparent. The core sits off-centre, on the edge nearest what the light spills onto.
- **Light is motivated.** It comes from something: a key under a tile, a passing dot, the cursor heating an object, an emissive object tinting the grid lines near it (spill radius 150-250 px).
- **Emissive heat.** Brightness 1 to 1.5 and saturation 1.4 over about 40 f, a 30 px glow on the rims, a soft pool on the ground under it.
- **Glow stays physical.** It is part of a device and moves with it; it is never a uniform halo round an element. Bake radial plates, scale them by transform, blend them in screen.
- **Fades keep colour last.** At the end the ground dims first and the coloured light a beat later, so the light is the last thing besides the mark.

Devices: [A tile lights from beneath and spills onto its neighbours](glass-glow-and-spectral.md#a-tile-lights-from-beneath-and-spills-onto-its-neighbours) · [Soft light hops to the active card](colour-and-light.md#soft-light-hops-to-the-active-card) · [Click or hover lights the object](colour-and-light.md#click-or-hover-lights-the-object) · [Dot grid seen only under wandering light](texture-grids-and-finish.md#dot-grid-seen-only-under-wandering-light) · [Floor glow under the stage, brightening into reveals](colour-and-light.md#floor-glow-under-the-stage-brightening-into-reveals) · [UI revealed inside a growing circle whose edge is a band of light](wipes-masks-and-irises.md#ui-revealed-inside-a-growing-circle-whose-edge-is-a-band-of-light) · [A fluid swirl of light floods the dark frame and settles](glass-glow-and-spectral.md#a-fluid-swirl-of-light-floods-the-dark-frame-and-settles) · [A window floats inside radial light streaks](glass-glow-and-spectral.md#a-window-floats-inside-radial-light-streaks) · [Line chart draws with the voice](data-and-numbers.md#line-chart-draws-with-the-voice) · [End letters arrive hot and cool to white](logo-and-end-card.md#end-letters-arrive-hot-and-cool-to-white) · [Frame blooms into light and settles out of it](colour-and-light.md#frame-blooms-into-light-and-settles-out-of-it) · [Wordmark letters blur-stagger in, a script suffix pen-writes](logo-and-end-card.md#wordmark-letters-blur-stagger-in-a-script-suffix-pen-writes)

### Glyph, ASCII and halftone textures

- **Glyph ramps.** Light to heavy: dot, dash, equals, plus, x; or dot, colon, small o, zero. Pick the glyph by luminance (a picture in characters) or by edge strength (a halo that hugs silhouettes: Sobel on a blurred luma, the band mostly outside the subject).
- **Cells are fixed to the screen.** About 13.5 x 14 px at 1080p for edge halos, 8-12 px for shading; the field re-samples every frame, so it shimmers as the picture moves.
- **Glyphs inside a mask.** A shading band clipped to a shape (a flame, a logo) scrolls through it in short bursts (about 32 f), denser in the middle and sparse at the edges.
- **Halftone.** Dot radius = r_max x sqrt(1 - luma); up close a dot screen can split into red, green and blue triads at the edges (8 px pitch) like a screen filmed close.
- **Dot matrix.** 12 px cells, 4.5 px dots, each the incoming picture's colour, the gaps showing the outgoing shot: a cut becomes a screen turning on.
- **1-bit hatching.** A pixel mark drawn with diagonal and vertical 1 px stripe runs reads as an engraving.

Devices: [A band of glyphs traces every subject's edge](texture-grids-and-finish.md#a-band-of-glyphs-traces-every-subject-s-edge) · [Symbol string tiles the frame and resolves into an ASCII object](texture-grids-and-finish.md#symbol-string-tiles-the-frame-and-resolves-into-an-ascii-object) · [A portrait drawn in two digits under a rising gradient](texture-grids-and-finish.md#a-portrait-drawn-in-two-digits-under-a-rising-gradient) · [Dither-pixel patch licks up through outlines](texture-grids-and-finish.md#dither-pixel-patch-licks-up-through-outlines) · [Halftone, ASCII and dither as the picture's texture](texture-grids-and-finish.md#halftone-ascii-and-dither-as-the-picture-s-texture) · [The next shot arrives as an LED dot matrix, then melts solid](wipes-masks-and-irises.md#the-next-shot-arrives-as-an-led-dot-matrix-then-melts-solid) · [The mark keeps moving inside every lockup](logo-and-end-card.md#the-mark-keeps-moving-inside-every-lockup) · [A patch of light carrying a lattice sweeps under the text](texture-grids-and-finish.md#a-patch-of-light-carrying-a-lattice-sweeps-under-the-text) · [Coarse pixel-mosaic ground behind UI](texture-grids-and-finish.md#coarse-pixel-mosaic-ground-behind-ui) · [Dragged paint as a pixel mosaic trailing the cursor](speed-and-rush.md#dragged-paint-as-a-pixel-mosaic-trailing-the-cursor)

### Grades as transitions

- **Drain, then flash.** Saturation about 60 to 15 % and brightness to 0.75 over 16 f, then a hard cut to the brightest frame of the film: a flash without a white frame.
- **Gradient maps.** Desaturate, then map luminance onto the film's inks (dark, mid, light). A rolling map steps through a palette about every 6 f; a map can arrive from a corner, burn photos warm just ahead of a white wash, or re-colour a photo into the ground's palette as it blurs away.
- **True colour as the focus.** Keep the subject (a face in a detection box, the chosen card) in true colour while everything else is mapped or grey.
- **Complement, then brand.** A white mark over a warm plate turns the complement for 4 f, then the brand colour fills it from the bottom up with a hard edge.
- **Half-blend swap.** Ground and type swap colours through one 50 % frame.
- **Decay through grey.** An incoming element arrives white and decays through grey to itself one step a frame (1, 0.65, 0.35, 0).

Devices: [Ground darkens or drains as an exit](colour-and-light.md#ground-darkens-or-drains-as-an-exit) · [A photo turned into a two- or three-ink gradient map](colour-and-light.md#a-photo-turned-into-a-two-or-three-ink-gradient-map) · [Photos arrive as a tint and develop to colour](photos-and-footage.md#photos-arrive-as-a-tint-and-develop-to-colour) · [False-colour palette cycles, then resolves material by material](colour-and-light.md#false-colour-palette-cycles-then-resolves-material-by-material) · [Detection boxes keep faces in true colour while the frame turns false-colour](photos-and-footage.md#detection-boxes-keep-faces-in-true-colour-while-the-frame-turns-false-colour) · [Soft feathered wipe that decelerates](wipes-masks-and-irises.md#soft-feathered-wipe-that-decelerates) · [Outgoing scene melts by defocus under the next](morphs-and-object-handoffs.md#outgoing-scene-melts-by-defocus-under-the-next) · [Brand colour withheld until the mark lands](colour-and-light.md#brand-colour-withheld-until-the-mark-lands) · [Ground flips on one frame as punctuation](colour-and-light.md#ground-flips-on-one-frame-as-punctuation) · [White blocks step, the last is the next object's silhouette](cuts-and-seams.md#white-blocks-step-the-last-is-the-next-object-s-silhouette) · [Category tint crossfades through grey](colour-and-light.md#category-tint-crossfades-through-grey) · [Wordmark letters blur-stagger in, a script suffix pen-writes](logo-and-end-card.md#wordmark-letters-blur-stagger-in-a-script-suffix-pen-writes)

### Coloured shadows

- **Shadows take the accent.** On light grounds a card's shadow is a dark tint of the accent (0 20px 50px at 30-45 %), never grey or black; a porthole carries a coloured rim on one arc.
- **One shadow pass unites a collage.** Soft diagonal window-blind bands (140-180 px, a 60 px edge, a dark tint of the ground in multiply) cross photographed and drawn pieces alike, so they share one room.
- **Hard sun on real surfaces.** A 45 deg window shadow at about 55 % over a print or a flatlay makes a mock-up read as photographed.
- **Shadow rings.** A glass halo round a dot turns into a dark shadow ring as the dot becomes a solid object.

Devices: [Shadows and rims tinted with the accent](depth-and-3d.md#shadows-and-rims-tinted-with-the-accent) · [Soft window-blind shadows across the set](colour-and-light.md#soft-window-blind-shadows-across-the-set) · [The copy and the work continue on real surfaces](photos-and-footage.md#the-copy-and-the-work-continue-on-real-surfaces) · [A ring draws around the subject, then ripples](marks-markers-and-annotations.md#a-ring-draws-around-the-subject-then-ripples) · [Frosted panel over a living plate](glass-glow-and-spectral.md#frosted-panel-over-a-living-plate)

### Detail primitives

The small finishes a rough build leaves out, each a pure state function with a thin component (`scripts/test/details.test.mjs` holds them to their numbers):

- `fx/DrawPath`: a connector or route drawing on along its length, solid or dashed (the dashes shown through a revealing mask, so the pattern never slides), from the start, the end or both ends; `elbowPath` (one rounded corner) for tree links, `curvePath` for routes between pictures; 36 f on `E.strongInOut`, width 2.5, dash 12 / 10.
- `fx/Cards` `reveal`: a card or a capsule opening from a sliver at its centre (width 1 % -> 10 % -> 31 % -> 93 % -> 100 % over 40 f), its content fading in over the last third; `CARD_TILT.leanBack` (27 degrees back about the top edge at perspective 1000) for the close-up before a snap, `aside`, `floor`.
- `fx/Barrel`: one word repeated in clipped rows round a drum, side fragments of the word wider on the middle row, closing into the line in 26 f.
- `fx/Cursor` `plane` (a glossy paper plane, a rim in the accent's lightness ramp under its long edge, a soft cast shadow) and `glassTri` (a rounded triangle, ink at 55 % with a thick white outline).
- `lib/defocus` `dofSigma`: blur by distance from the focus (sharp within 230 px, 7.5 px at 850 px), drawn with `defocusMix`.
- `fx/Pictures` (`PhotoCard`, `ArcRiver`, `PhotoWall`, `InlinePhoto`, `FootageWindow`) and `fx/Washes`: the studio finish of real photos and the colour grounds (`references/imagery.md` §4).

## Families

- [Type arrivals](type-arrivals.md) (54): How a word, a line or a letter comes onto the screen.
- [Lines, layout and swaps](lines-layout-and-swaps.md) (31): How a held line grows, makes room, re-centres and swaps a word, and how copy is placed around objects.
- [Type exits](type-exits.md) (8): Copy leaves with intent: at speed into a cut, in a designed order, eaten by an object, or blurred into silence.
- [Marks, markers and annotations](marks-markers-and-annotations.md) (15): Small marks that point: corner squares, brackets, selection boxes, pen strokes, highlight blocks, rings.
- [Colour and light](colour-and-light.md) (39): Colour as a carrier of recency and emphasis, light as an event.
- [Glass, glow and spectral](glass-glow-and-spectral.md) (13): Materials that carry light: frost, refraction and fluted glass, thin-film and foil iridescence, spectral borders and arcs, lens aberration, glows built as core, body and falloff.
- [Camera](camera.md) (25): One camera per film, never parked, cutting on its fastest frame.
- [Cuts and seams](cuts-and-seams.md) (23): What crosses a cut: a velocity, an object, a scale step, a single designed frame.
- [Camera transitions](camera-transitions.md) (15): Transitions made by the camera itself: exits into darkness, whips with roll, jump frames that hide a cut, zooms through an object, dives through a soft layer.
- [Morphs and object handoffs](morphs-and-object-handoffs.md) (22): The film moves from state to state through one object instead of a cut: text becomes a pill, a dot becomes a caret, a period becomes the next scene.
- [Wipes, masks and irises](wipes-masks-and-irises.md) (20): Reveals with an edge: irises from a point on screen, feathered and stepped wipes, block bursts, pill breaths, windows that open inside the shot.
- [Speed and rush](speed-and-rush.md) (10): Speed made visible: geometric acceleration into a cut, conveyors of cards, graphic smear frames, speed lines, real blur where it belongs.
- [UI choreography](ui-choreography.md) (33): How product surfaces arrive, stack, unfold, scroll and step aside, so the product reads as a working thing doing its job.
- [Micro-interactions](micro-interactions.md) (24): Presses, toggles, chips, loaders and small state changes, timed the way software behaves: hard where software is hard, eased where people are.
- [Cursor](cursor.md) (6): The cursor is a hand: it glides, dwells, presses, drags and leaves once the product acts on its own.
- [Loaders and progress](loaders-and-progress.md) (13): Waiting made watchable: step lists that tick, thinking indicators, shimmer, loaders built from the film's own graphics, images resolving through stages.
- [Data and numbers](data-and-numbers.md) (17): Numbers that count like software and charts that build from cells and lines, with one number landing as the payoff.
- [Icons and glyphs](icons-and-glyphs.md) (9): Icons that draw, pop, stand in for words and grow out of dots.
- [Photos and footage](photos-and-footage.md) (11): Pictures arrive as a tint and develop; products stay fixed while the world swaps behind them; montages accelerate under held copy.
- [Collage and composition](collage-and-composition.md) (11): Frames built from many parts: four live panels, stop-motion collages, objects popping around a word, one layout shared by a before and an after.
- [Depth and 3D](depth-and-3d.md) (10): Depth from timing and focus: parallax rates, foreground bokeh, type placed between layers, selective focus, objects with physical arcs.
- [Texture, grids and finish](texture-grids-and-finish.md) (22): Grounds that keep empty space active: hairline grids, cell waves, screen textures, grain, stepped cadences.
- [Logo and end card](logo-and-end-card.md) (24): The brand lands as the last move of the story: oversized, assembled, snapped on a hit, slid open, then the one still hold of the film.
- [Sound and timing](sound-and-timing.md) (7): The rules that tie picture to sound: a breath before every reveal, one designed sound per event, one clock per film.
- [Cadence and grammar](cadence-and-grammar.md) (4): Film-wide choices: one motion grammar, designed holds, characters with life.

## Every device

One line each: the device, the jobs it is picked for and where it earns its place, its file (anchors are the names).

### Type arrivals

- **Letters swing in along an arc**: A product name or title that lands on a thud. `type-arrivals.md`
- **Title decodes from the centre outward**: The title of the product, once. `type-arrivals.md`
- **Each word arrives on its own torn layer**: A crafted, editorial film with images. `type-arrivals.md`
- **Typeface cycles while the line steps larger**: A launch about type, image or style. `type-arrivals.md`
- **Giant word rises in, cropped by the frame**: Opening a film or a section with one word. `type-arrivals.md`
- **Masked roll swap with a pre-zoom**: Swapping the key noun of a held line on a beat. `type-arrivals.md`
- **Anagrams reshuffle and lock**: A name or a claim that is "made" in front of the viewer. `type-arrivals.md`
- **Caption resolves out of a light streak**: Voice-led films where captions follow the narration. `type-arrivals.md`
- **Old word erodes while new letters rise**: Swapping one key word in a held line. `type-arrivals.md`
- **Scattered letters assemble into the word**: The payoff word of an act. `type-arrivals.md`
- **Words fly in from behind the camera**: A tagline or a closing line on a strong beat. `type-arrivals.md`
- **Words jump through positions, leaving fading stamps**: A hook line that should feel like a camera-less glitch of motion. `type-arrivals.md`
- **Word shown first as a block of its own size**: A voice-led headline in a bold, graphic film. `type-arrivals.md`
- **Whole line snaps larger on the payoff word**: The spoken payoff word ("now", the product's verb) of a hook. `type-arrivals.md`
- **Centred line builds word by word**: The main statement of a launch film. `type-arrivals.md`
- **Oversized landing, defocused start**: Opening hook, Emphasis. The first word of a film, a title that overflows its pane, a label swap, any word that.... `type-arrivals.md`
- **Typing with an accent trail on the newest characters**: Prompts, AI answers, streamed replies, any product typing. `type-arrivals.md`
- **Word lands soft and pulls into focus**: First word after a cut to black, placeholder text in a field, an end line, a large.... `type-arrivals.md`
- **Answer streams and its card grows line by line**: Showing an AI answer or a generated document. `type-arrivals.md`
- **Fade-and-rise word, front-loaded**: Any calm statement, voice-clocked captions, the body copy of a launch or update film. `type-arrivals.md`
- **In-place ink-up from partial strength**: Dense layouts (a page, a card, data rows, captions on photos) where motion would fight.... `type-arrivals.md`
- **Line whose stagger and fade shrink word by word**: A payoff line, the last line of an act. `type-arrivals.md`
- **Prompt typing that slows on its last word**: The question that triggers the product's answer. `type-arrivals.md`
- **Typing by a person, with word-end pauses**: A prompt or search typed into the product, a title on a device screen, any line that.... `type-arrivals.md`
- **Typing that starts mostly done after a cut**: Several prompts in a row, montages of requests. `type-arrivals.md`
- **Line written on behind a soft moving edge**: Status lines, single lines over a picture. `type-arrivals.md`
- **Cut on low at full ink, slide home**: Punchier copy on a beat, headline words on a coloured field, a word that should touch.... `type-arrivals.md`
- **Word rises out of a baseline mask**: Short commands, verbs on hits, any line that should feel cut and precise. `type-arrivals.md`
- **Colour front sweeps a set line to ink**: Emphasis, Light / colour event. A status title, a sentence whose last words are the point, a giant word inked from the.... `type-arrivals.md`
- **Word inks along a colour path**: Emphasis, Light / colour event. A text-led opener, an AI line that should feel generated, a keyword. `type-arrivals.md`
- **A highlight walks the line, parks on the keyword, new words type hot**: Emphasis, Product moment. A line inside a UI (a subtitle, a result) that carries the claim. `type-arrivals.md`
- **Typing that accelerates into a whip**: Handing off from a typed request to the product's reaction. `type-arrivals.md`
- **Typing whose newest characters arrive smeared**: A prompt or URL typed fast into the product, especially just before a cut hides the.... `type-arrivals.md`
- **A label rises in gradient ink, then a blink wave turns it white**: Emphasis, Product moment. A label on a gradient or tinted card. `type-arrivals.md`
- **Glyph scramble that locks into the word**: A product name, a code, a version, a title once per film. `type-arrivals.md`
- **Handwritten line writes on at pen speed**: Personal, signed, approved moments. `type-arrivals.md`
- **Letters appear in random order**: A button label appearing, an "Analyzing. `type-arrivals.md`
- **Sans line with a contrasting-voice payoff word**: "No X. `type-arrivals.md`
- **Typewriter on an ease-out progress**: A line that should feel written in one stroke. `type-arrivals.md`
- **Word decodes from a low-res pixel version**: Words in a film about images, rendering or AI generation. `type-arrivals.md`
- **Line opens room, then the key word types in**: The key word of a statement. `type-arrivals.md`
- **Pre-centred words switch on every two frames**: A fast opener, a title that rides a camera move, hit captions over footage, huge words.... `type-arrivals.md`
- **Letter-by-letter fade across a word**: An "Introducing" over a photo. `type-arrivals.md`
- **Set line resolves from blur left to right**: A sentence that reads in one sweep. `type-arrivals.md`
- **Word flips up from a flat line**: A word that should feel lifted off the page. `type-arrivals.md`
- **Word halves slide out from behind a plate**: A word that wraps a product or a dock. `type-arrivals.md`
- **Field fills a word at a time, each word lit for one frame**: Showing that the product understands a request instantly. `type-arrivals.md`
- **Placeholder deletes, the real value types in bursts**: A URL, a name or a setting being changed in the product. `type-arrivals.md`
- **Words added into a pill that resizes instantly**: A prompt or idea being formed. `type-arrivals.md`
- **Letter spacing snaps to normal**: Words on cards in a fast cut sequence. `type-arrivals.md`
- **Ticker words slam in, old words cut off the edge**: A rapid list of verbs or features on hits. `type-arrivals.md`
- **Words rise and drop onto one baseline with overshoot**: A playful two-word title on a coloured field. `type-arrivals.md`
- **Word cuts on and drifts, then leaves the same way**: Two labels that relate (a pair of words apart in the frame). `type-arrivals.md`
- **Taglines swap on the second with a small pop**: A run of short claims over a photo. `type-arrivals.md`

### Lines, layout and swaps

- **Line opens a gap for an inline object**: Update change. Showing what a word means ("[images]", "your [product]"). `lines-layout-and-swaps.md`
- **Echo copies slide out from behind the word**: A key word that should feel multiplied or scaled ("Scaling"). `lines-layout-and-swaps.md`
- **Braces jump apart and the words swap inside**: Swapping the key word of a held statement. `lines-layout-and-swaps.md`
- **Words swap on an accelerating cadence**: Showing breadth: categories, example prompts, use cases. `lines-layout-and-swaps.md`
- **Neighbouring words show as dim ghosts around the slot**: Word swaps that should feel like a reel or a list. `lines-layout-and-swaps.md`
- **Words hop between grid cells**: A sentence assembled from parts. `lines-layout-and-swaps.md`
- **Type cut into strips that slide apart**: A big number becoming a field. `lines-layout-and-swaps.md`
- **Line re-centres with most of the move on frame one**: Every centred build line. `lines-layout-and-swaps.md`
- **Only the last word swaps**: Update change. Listing audiences, use cases or outcomes in one held sentence. `lines-layout-and-swaps.md`
- **The tagline is set as a string inside the product UI**: Emphasis, Product moment, Update change. Update films and UI-led launches, where overlaid copy would fight the UI. `lines-layout-and-swaps.md`
- **Make room: creep, one big frame, settle**: Making room for the next word. `lines-layout-and-swaps.md`
- **The gap opens before the word arrives**: Builds where the new element is visual (an avatar, a token, an icon). `lines-layout-and-swaps.md`
- **Line moves through: arrive, drift, leave as one move**: Openers, statements between scenes, loops (elements already moving on the first frame). `lines-layout-and-swaps.md`
- **Line re-centres on a long exponential**: Calm, speech-paced lines. `lines-layout-and-swaps.md`
- **Left-aligned stack builds downward beside the product**: Feature lists next to a device. `lines-layout-and-swaps.md`
- **One word set apart in the line**: The key word of a closing line. `lines-layout-and-swaps.md`
- **Small plain caption directly on the picture**: Voice-locked subtitles. `lines-layout-and-swaps.md`
- **One huge word fills the panel and pushes in**: The verb of the claim, after a zoom-through. `lines-layout-and-swaps.md`
- **Word cuts on touching, then the space opens**: Taglines built word by word. `lines-layout-and-swaps.md`
- **Headline set so large the frame crops it**: Openers on a misty plate. `lines-layout-and-swaps.md`
- **Two words part around the subject, then converge**: Framing a person or product with two words. `lines-layout-and-swaps.md`
- **Words land from four directions**: Poster-style title cards. `lines-layout-and-swaps.md`
- **Old line pushes up and dims in one frame**: Two-line statements where the second line is the point. `lines-layout-and-swaps.md`
- **Old line shrinks out, new line swaps in large**: Status lines, a title swapping to a tagline. `lines-layout-and-swaps.md`
- **Sentence placed around an object**: When copy and imagery share a frame and the layout should feel designed. `lines-layout-and-swaps.md`
- **Hero word shrinks in hard scale steps**: A word arriving on key-click transients. `lines-layout-and-swaps.md`
- **Sentence lands with a ribbon tail**: The first line after a whip. `lines-layout-and-swaps.md`
- **Re-centre jumps on its own cadence**: Logo lockups built letter by letter. `lines-layout-and-swaps.md`
- **Twin discs grow and hold words**: A two-part idea (before / after, you / us). `lines-layout-and-swaps.md`
- **Tiny labels in the empty corners**: Poster-like frames. `lines-layout-and-swaps.md`
- **Two type voices with fixed jobs**: Editorial launches. `lines-layout-and-swaps.md`

### Type exits

- **An object sweeps through and eats the text**: Replacing a word with a product action. `type-exits.md`
- **Type and UI leave by accelerating, cut at speed**: Every exit that leads into a cut. `type-exits.md`
- **Words or items drop out one by one**: Exits that should read as a build in reverse. `type-exits.md`
- **Exit by accelerating shrink or recede**: Text cards between scenes. `type-exits.md`
- **Words blur out and vanish**: Calm statements leaving. `type-exits.md`
- **Words float away; the hub stays**: Turning a statement into the product's centre. `type-exits.md`
- **Letters collapse to the centre and cut**: Exiting a title into a hit. `type-exits.md`
- **Short stepped or accelerating fade-out**: Secondary text clearing the stage for the hero. `type-exits.md`

### Marks, markers and annotations

- **Four tiny corner squares that blink and jump**: Emphasis. A text-led opener or a calm statement that needs a living, technical frame. `marks-markers-and-annotations.md`
- **Markers travel as echo bars and stretch ahead of the cut**: Fast cut sequences of words or cards. `marks-markers-and-annotations.md`
- **Marker-pen strokes write on, slash and erase**: Emphasis. Opinionated copy (crossing out the old way). `marks-markers-and-annotations.md`
- **L-brackets frame a word and shrink-wrap it**: Emphasis. Framing the key word. `marks-markers-and-annotations.md`
- **Design-tool selection box snaps to each word**: Emphasis. Design, editing or creation tools. `marks-markers-and-annotations.md`
- **Keyword sits in a highlight block or pill**: Emphasis. The one word or item that matters in a line or list. `marks-markers-and-annotations.md`
- **Connector lines draw from one element to the next**: Showing relations: a source to a result, a step to the next. `marks-markers-and-annotations.md`
- **Thin pen lines circle, underline and point**: Proof. Circling the key word. `marks-markers-and-annotations.md`
- **Corner swatches take their colour from the picture**: Word cards over changing imagery. `marks-markers-and-annotations.md`
- **A ring draws around the subject, then ripples**: Marking a point of interest in a voice-led graphic film. `marks-markers-and-annotations.md`
- **Tracking squares jump over a crowd every frame**: Detection, targeting, finding the one. `marks-markers-and-annotations.md`
- **Corner dots bracket the line; one pops big on entry**: A system of brackets across a whole film's copy. `marks-markers-and-annotations.md`
- **Rings ripple out from a click or a pill**: Calling attention to a control. `marks-markers-and-annotations.md`
- **Thin outline shapes frame a caption on a photo**: Photo-led films with short captions. `marks-markers-and-annotations.md`
- **Arrows shoot outward on a swap**: A phrase that expands in meaning (more, wider, everywhere). `marks-markers-and-annotations.md`

### Colour and light

- **False-colour palette cycles, then resolves material by material**: A film about sensing, rendering or AI vision. `colour-and-light.md`
- **Cards flood with colour and defocus one by one**: Showing overload: too many tools, tabs, tasks. `colour-and-light.md`
- **Light lines shoot through the frame**: A cold open on a dark stage. `colour-and-light.md`
- **People become flat colour silhouettes**: A film about vision, detection or editing. `colour-and-light.md`
- **Planet horizon drops and the sky blooms**: Reveal. The hero reveal of a world-building film. `colour-and-light.md`
- **Floor glow under the stage, brightening into reveals**: Light / colour event. Dark or near-white product stages that should not be flat. `colour-and-light.md`
- **Frame blooms into light and settles out of it**: Transition, Light / colour event. Downbeats, act changes, the moment before a reveal. `colour-and-light.md`
- **Soft blobs drift behind the copy**: Light / colour event. Text-led films on a coloured ground. `colour-and-light.md`
- **Newest word lands in the accent and cools to ink**: Emphasis. Any build line, appended words, accent words in a sentence, a word that came out of a.... `colour-and-light.md`
- **A light sheen crosses a landing object once**: Light / colour event. An end logo landing, a hero object turning, a title reveal. `colour-and-light.md`
- **A photo turned into a two- or three-ink gradient map**: Opening hook, Texture / material, Light / colour event. Real imagery that must live in a strong palette. `colour-and-light.md`
- **Background steps back behind the type**: Type over footage or a busy picture. `colour-and-light.md`
- **Brand colour withheld until the mark lands**: Logo / lockup. End cards and lockups. `colour-and-light.md`
- **Ground colour changes per shot and per act**: Any film with more than four shots. `colour-and-light.md`
- **Glow and grain boil on held graphics**: Any hold longer than about 30 f on a graphic, especially on twos. `colour-and-light.md`
- **Type changes colour with what is behind it**: Type that shares the frame with moving colour. `colour-and-light.md`
- **Heat ramp as the arrival and exit colour system**: A whole film's colour grammar, one film at a time. `colour-and-light.md`
- **A tint wave travels through the words and drains**: Emphasis, Light / colour event. A headline voiced word by word. `colour-and-light.md`
- **Ground flips on one frame as punctuation**: Light / colour event. The key word of a line. `colour-and-light.md`
- **Click or hover lights the object**: Light / colour event. The decisive click of a demo. `colour-and-light.md`
- **Element enters over-exposed and decays to its tone**: Figures arriving in a graphic world. `colour-and-light.md`
- **Ground darkens or drains as an exit**: Transition. The end of a section. `colour-and-light.md`
- **Object materialises through a colour wash**: The first appearance of a product board. `colour-and-light.md`
- **Type filled with a gradient that blooms**: Emphasis, Light / colour event. A brand that owns a gradient. `colour-and-light.md`
- **Full-frame satin folds of colour that roll through hues**: Texture / material, Light / colour event. A section of short captions over pure colour. `colour-and-light.md`
- **Light cone drops and flashes twice**: A spotlight on a hero object. `colour-and-light.md`
- **Tiny glints and light scribbles**: Decorating a transformation with a hint of light (sparingly). `colour-and-light.md`
- **Ground gradient swaps or floods**: Texture / material. Any film that carries one gradient family. `colour-and-light.md`
- **Hard colour swaps that step the size**: Light / colour event. A beat-cut on a simple graphic. `colour-and-light.md`
- **Soft light hops to the active card**: Walking through KPI cards or a grid of features. `colour-and-light.md`
- **Core glows up to white-hot**: A brand that supplies glow. `colour-and-light.md`
- **Ghost pre-flash of an upcoming element**: A collage or stop-motion build that should anticipate its next piece. `colour-and-light.md`
- **Soft window-blind shadows across the set**: Tabletop or desk sets with objects. `colour-and-light.md`
- **Category tint crossfades through grey**: Several categories or use cases shown on the same panels. `colour-and-light.md`
- **The cut frame glows and decays**: A cut onto a small bright subject on a dark stage. `colour-and-light.md`
- **Light bands flow along a column**: A pipe, a column, a stream of data. `colour-and-light.md`
- **Tiles warm up, then bleach to white**: Leaving a grid of images into a white scene. `colour-and-light.md`
- **Previous hero knocked back in one frame**: Stacking a new statement over a previous visual. `colour-and-light.md`
- **Small token cycles through hues**: A version tag or an "active" pill in a brand with a multi-colour system. `colour-and-light.md`

### Glass, glow and spectral

- **Coloured dots bleed along a border into one spectral ring**: Emphasis, Product moment, Light / colour event. Integrations, works-with-everything, a many-source product. `glass-glow-and-spectral.md`
- **Soap-bubble glass with thin-film rainbow bands**: Product moment, Logo / lockup, Texture / material. A hero object that should feel protected, new or magical. `glass-glow-and-spectral.md`
- **Caustic light switches on inside an object**: Light / colour event. A 3D hero object in a calm opener. `glass-glow-and-spectral.md`
- **A fluid swirl of light floods the dark frame and settles**: Opening hook, Transition, Light / colour event. A section opener or the frame before the logo on a dark film. `glass-glow-and-spectral.md`
- **A word seen through fluted glass, sliced into refracted strips**: Reveal, Logo / lockup, Texture / material. A logo or a word reveal on a dark, lit ground. `glass-glow-and-spectral.md`
- **Radial lens chromatic aberration on light lines**: Texture / material, Light / colour event. A graphic, glitch-flavoured world. `glass-glow-and-spectral.md`
- **A tile lights from beneath and spills onto its neighbours**: Emphasis, Product moment, Light / colour event. Keyboard, grid and tile UIs on dark grounds. `glass-glow-and-spectral.md`
- **Holographic foil icons with frosted inner tiles**: Product moment, Texture / material. A grid of features or integrations that must read premium and related. `glass-glow-and-spectral.md`
- **A window floats inside radial light streaks**: Product moment, Logo / lockup, Light / colour event. The last product frame of a dark launch film, after a glass or light act. `glass-glow-and-spectral.md`
- **Frosted glass tiles with rainbow prism rims**: Product moment, Texture / material. An integrations orbit or icon cloud in a light, airy world. `glass-glow-and-spectral.md`
- **Frosted panel over a living plate**: Brands with a glass language. `glass-glow-and-spectral.md`
- **Glass objects refract the world behind them, then turn opaque**: Product moment, Texture / material. A 3D or glass act. `glass-glow-and-spectral.md`
- **Rainbow arcs, prism beams and auras composited into plates**: Opening hook, Texture / material, Light / colour event. An imaging or generation brand whose plates are the hero. `glass-glow-and-spectral.md`

### Camera

- **Zoom into an object on a log curve**: Dot to planet, a mark to a world, the prompt box becoming the stage. `camera.md`
- **Barrel-roll fly-in down a corridor**: The hero reveal of a 3D world, once. `camera.md`
- **Camera tilt turns a flat graphic into a space**: Moving from a flat 2D graphic into a 3D world. `camera.md`
- **Macro pan across giant type**: A giant number, a date line, a word as landscape. `camera.md`
- **Montage of constant-rate dolly-outs cut on snares**: Showing the product out in the world. `camera.md`
- **Asymmetric whip: long build, short brake**: Changing subject inside one shot. `camera.md`
- **Chained reframes with near-holds**: Walking through a product screen, a collage, a row of words in outlined circles. `camera.md`
- **Punch-in zoom carried by a few frames**: A hit, a label landing, the spoken key word. `camera.md`
- **The hold that never freezes**: Every hold longer than about 30 f: beauty frames, photo plates, end cards, logo holds. `camera.md`
- **Camera follows the caret**: Typing in close-up. `camera.md`
- **Long exponential camera settle**: Calm shots after a busy one. `camera.md`
- **Shot opens already moving**: Opening hook. The film's first frame. `camera.md`
- **The camera operates a flat UI**: Walkthroughs of a real product from screenshots. `camera.md`
- **Camera reframes to make room**: Adding a second line, more cards, a label, a result under a search bar. `camera.md`
- **Move accelerates into the cut**: Nearly every cut. `camera.md`
- **Camera orbits a panel in 3D**: Product screens that should feel like objects. `camera.md`
- **Masonry wall scrolls in, drifts, scrolls out**: A wall of examples or use cases. `camera.md`
- **Ring or field spins in and bleeds off**: Integrations, sources, a galaxy of features around a centre. `camera.md`
- **Camera reverses into a push before the cut**: The last cut of an act. `camera.md`
- **Pull-back where the foreground lands first**: Openers on a single object over a textured ground. `camera.md`
- **Base sinks away from the launching object**: The moment a request is sent. `camera.md`
- **Composition jump-reframes on each arrival**: Stop-motion collage builds. `camera.md`
- **Object rises into frame as focus racks in**: Introducing a 3D object or a device. `camera.md`
- **Zoom energy decays shot by shot**: The run of shots after a big transition. `camera.md`
- **One shot goes completely still**: The keyword of the film ("Instantly"). `camera.md`

### Cuts and seams

- **Pixel glint sprite on twos bridges a cut**: Transition. A cut that needs a bridge with character: from a send action to the result, into a new.... `cuts-and-seams.md`
- **Glitch run: distinct full-frame looks on twos**: Tearing the viewer from realism into the graphic world, once, on the end of a spoken.... `cuts-and-seams.md`
- **An object continues through the cut in a new role**: Transition. Linking two states of the product. `cuts-and-seams.md`
- **Over-exposed frame with a negative ghost**: A whip transition on a swell's peak. `cuts-and-seams.md`
- **Flat layout cuts into the same layout in the world**: Showing a design or a screen in use. `cuts-and-seams.md`
- **White blocks step, the last is the next object's silhouette**: A hard beat with nothing to carry. `cuts-and-seams.md`
- **Three single frames with an inverted centre band**: A loop separator. `cuts-and-seams.md`
- **Velocity handoff: cut on the fastest frame, next shot already moving**: Transition. The default for every cut in a film. `cuts-and-seams.md`
- **Cut from a tight crop to the wide shot at the same world speed**: Opening on a detail. `cuts-and-seams.md`
- **Cut tighter mid-move, same vector**: Emphasis on a word, a field, a button while the action continues. `cuts-and-seams.md`
- **Pixelate out and in on the beat**: Transition. A downbeat cut. `cuts-and-seams.md`
- **Full blur straight into a near-static calm shot**: Contrast between product speed and a calm promise. `cuts-and-seams.md`
- **Scene burns out to white**: Into a white end section. `cuts-and-seams.md`
- **One block stamped into a plus of five**: A loader or icon multiplying into many. `cuts-and-seams.md`
- **Cut through exactly one blank frame**: Between story and finale. `cuts-and-seams.md`
- **Vertical drum swap with a heat and a tilt**: A list of sources or places in one sentence ("from Phone / Folders / Drives"). `cuts-and-seams.md`
- **Blur out to blank frames, then cut**: A soft change of subject on a light stage. `cuts-and-seams.md`
- **Line parts from the middle, layout swaps on frame three**: A quick change of scene from a centred title. `cuts-and-seams.md`
- **Next scene's tiles fly over the outgoing shot**: Grid-based films. `cuts-and-seams.md`
- **One panel at 2x for one frame**: Leaving a grid of shots. `cuts-and-seams.md`
- **An empty beat before the logo**: Before the end card. `cuts-and-seams.md`
- **One or two inverted frames between shots**: Punctuation between scenes. `cuts-and-seams.md`
- **Short fade through white between sections**: Light-ground films. `cuts-and-seams.md`

### Camera transitions

- **Camera dives through a soft layer**: Transition. Calm, airy films. `camera-transitions.md`
- **No hard cuts: every change hides in a camera event**: Opening hook. A launch film that should feel like one continuous journey. `camera-transitions.md`
- **Zoom through an object into the next scene**: Transition. Going inside the product. `camera-transitions.md`
- **One jump frame hides the cut inside a zoom**: Transition. Hiding a cut or a content jump in a camera event. `camera-transitions.md`
- **Whip zoom with roll and counter-roll**: Transition. A big change of subject. `camera-transitions.md`
- **Camera passes through a ring of cards**: A gallery of examples as a portal. `camera-transitions.md`
- **Spin accelerates and the frame empties at peak**: A galaxy of features or sources, into the next act. `camera-transitions.md`
- **Full-frame defocus pulse hides a change**: Transition. One-take films. `camera-transitions.md`
- **Copy swaps on the camera's velocity peaks**: Changing statements without a cut. `camera-transitions.md`
- **Every cut breathes: scale carries through the cut**: Every cut that has no other carrier. `camera-transitions.md`
- **Line leaves upward as the next rises from below**: Sequences of statements or status steps. `camera-transitions.md`
- **Snap back from a giant word to the full line**: Revealing the whole sentence after a close-up word. `camera-transitions.md`
- **Zoom cut through a dither dissolve**: Zooming into a planet, a map, an image. `camera-transitions.md`
- **Exit at speed into a dark frame, next world fades up**: Changing worlds. `camera-transitions.md`
- **Old layout whips out, new layout whips in from the same side**: Comparing two states (before / after, old / new). `camera-transitions.md`

### Morphs and object handoffs

- **Small element grows into the next scene**: Opening a detail into its world. `morphs-and-object-handoffs.md`
- **Text collapses into an object**: Moving from a statement to the product (the line becomes the input, the button, the icon). `morphs-and-object-handoffs.md`
- **The full stop becomes the next object**: Ending a statement into the next scene. `morphs-and-object-handoffs.md`
- **Whole frame collapses into a chip or card**: Product moment. Packing a whole scene into one object of the next scene. `morphs-and-object-handoffs.md`
- **A straight row curls into a ring**: Turning a list of things into a cycle or an ecosystem. `morphs-and-object-handoffs.md`
- **Old words step into depth, new words step out**: A techno title change. `morphs-and-object-handoffs.md`
- **Zoom into a letter until it fills the frame**: From a word into its meaning. `morphs-and-object-handoffs.md`
- **Flat shape builds into a 3D object**: A product about structure, models, building. `morphs-and-object-handoffs.md`
- **Letters replaced by product objects**: Commerce, product catalogues. `morphs-and-object-handoffs.md`
- **Small object becomes the next word, card or cell**: Product moment. Any handoff between product states. `morphs-and-object-handoffs.md`
- **A glyph detaches and becomes UI**: Brand to product and product to brand. `morphs-and-object-handoffs.md`
- **A soft panel flies through the camera**: A soft, bright transition between UI scenes. `morphs-and-object-handoffs.md`
- **Letterbox window swings open in 3D, then flattens into a card**: Turning an image strip into the product. `morphs-and-object-handoffs.md`
- **The swap hides in a blur peak**: Any content change inside a fast move. `morphs-and-object-handoffs.md`
- **Shape contracts and hands its outline to the next shot**: Photo films. `morphs-and-object-handoffs.md`
- **Object implodes into a point or vortex**: Ending a section on a point. `morphs-and-object-handoffs.md`
- **Parts detach and reassemble into a big shape**: Turning labels into a direction (next, forward, go). `morphs-and-object-handoffs.md`
- **Outgoing scene melts by defocus under the next**: Layered scene changes where the new element arrives on top. `morphs-and-object-handoffs.md`
- **Tiles pass through a wireframe look**: A transition that reveals structure. `morphs-and-object-handoffs.md`
- **Letters spread and double while the ground warms**: Leaving a statistic. `morphs-and-object-handoffs.md`
- **Tags dissolve through low-res pixels into dots**: Ending a data moment into a minimal mark. `morphs-and-object-handoffs.md`
- **Side elements gather toward the centre into the cut**: Before a cut or a pixelate on a collage. `morphs-and-object-handoffs.md`

### Wipes, masks and irises

- **Iris opens from a point already on screen**: Opening hook, Reveal, Transition. Section changes. `wipes-masks-and-irises.md`
- **Flat blocks burst out and reveal the next shot**: A click that changes everything. `wipes-masks-and-irises.md`
- **Pixel-staircase wipe stepped on twos**: Image or pixel-flavoured films. `wipes-masks-and-irises.md`
- **Ring of pixel blocks expands and reveals**: Reveal. A logo reveal. `wipes-masks-and-irises.md`
- **Soft ring swirls in and frames the statement**: Reveal. Two or three section changes into a statement. `wipes-masks-and-irises.md`
- **The next shot arrives as an LED dot matrix, then melts solid**: Reveal, Transition, Texture / material. A cut into a screen, a product UI or a digital world. `wipes-masks-and-irises.md`
- **Title fills with the next image and takes over**: Reveal. The title before the main section. `wipes-masks-and-irises.md`
- **Two discs converge and their overlap opens a world**: Reveal. Two ideas meeting. `wipes-masks-and-irises.md`
- **Halves part like doors and the next card rises through**: Reveal. Introducing the next product surface. `wipes-masks-and-irises.md`
- **Next shot opens as a window; the old shot steps back**: Product-to-world transitions. `wipes-masks-and-irises.md`
- **UI revealed inside a growing circle whose edge is a band of light**: Reveal, Product moment, Light / colour event. The first product reveal from a corner or a sidebar. `wipes-masks-and-irises.md`
- **Picture in a pill mask breathes, then closes into the cut**: Photo-led openers. `wipes-masks-and-irises.md`
- **Soft feathered wipe that decelerates**: Soft section changes. `wipes-masks-and-irises.md`
- **A text-height slot opens behind the line onto the photo**: Reveal, Transition. A line that introduces imagery: a new way to see. `wipes-masks-and-irises.md`
- **A colour block wipes the line on and lingers**: A tagline on. `wipes-masks-and-irises.md`
- **Concentric squares radiate at constant speed**: A hub, an end card, a "broadcast" moment. `wipes-masks-and-irises.md`
- **Panel pushes the shot off in two stages**: Moving from footage to product UI. `wipes-masks-and-irises.md`
- **A soft light band carries the old graphic out**: Light / colour event. Clearing a diagram or chart. `wipes-masks-and-irises.md`
- **Frame halves flip to a new ground in turn**: A rhythmic flip into an end section. `wipes-masks-and-irises.md`
- **Scene emerges from white, hero first**: Reveal. Revealing a set or a product scene. `wipes-masks-and-irises.md`

### Speed and rush

- **Dragged paint as a pixel mosaic trailing the cursor**: Drawing, painting, brushing tools. `speed-and-rush.md`
- **Rush: geometric acceleration into the cut**: Transition. Energy peaks. `speed-and-rush.md`
- **Real motion blur on fast moves, defocus on snaps**: Every film with fast motion. `speed-and-rush.md`
- **Footage speed-ramped, joined on its blurred peaks**: Live action in a launch film. `speed-and-rush.md`
- **Things burst outward from the centre**: Releasing a hub's contents. `speed-and-rush.md`
- **Thin speed lines while velocity is high**: A thrown object, a travelling message, a decode with energy. `speed-and-rush.md`
- **Motion blur drawn as a few visible copies**: Emphasis, Transition. Graphic, flat films. `speed-and-rush.md`
- **Tile wall whips in with per-tile parallax**: Galleries of work. `speed-and-rush.md`
- **Two frames of streaks with stripe artefacts**: A whip between two product pages. `speed-and-rush.md`
- **Graphic smear frames instead of motion blur**: Stylised films where real blur would look soft. `speed-and-rush.md`

### UI choreography

- **List scrolls through a focus band**: Currencies, languages, integrations: "all of these". `ui-choreography.md`
- **Resize: small creep, one big jump, long settle**: Update change. Editing, resizing, aspect changes, expanding a field. `ui-choreography.md`
- **Exploded view: panels push out, spin, collapse**: Explaining an architecture, layers or what is inside. `ui-choreography.md`
- **Bento layout unfolds on one shared curve**: The overview of a product. `ui-choreography.md`
- **Cards fly in radially on one ease**: Showing many parts of a product at once around a statement. `ui-choreography.md`
- **Avatar bubbles swoop, orbit and split**: Collaboration and people features. `ui-choreography.md`
- **Panels shrink away and seeds build the logo**: Consolidation claims. `ui-choreography.md`
- **New item pushes in, older items step back**: Update change. Notifications, payments, steps of an agent, feature pills. `ui-choreography.md`
- **Panel arrives front-loaded, focus lagging**: Product moment. The product's first appearance. `ui-choreography.md`
- **Card lands by shrinking to size**: Notifications, dashboards, cards that land on a beat. `ui-choreography.md`
- **Cards fan out from behind into a stack**: Plans, sources, payments, posters: several of one kind. `ui-choreography.md`
- **Grid assembles cell by cell**: Integrations, sponsors, a dashboard filling up. `ui-choreography.md`
- **Chat bubbles cut on and slide up**: Any chat, thread or comment UI. `ui-choreography.md`
- **Chosen item enlarges while the rest dissolve**: Update change. Selecting a product, a plan, a result. `ui-choreography.md`
- **Flick scroll: ramp, peak, friction**: Feeds, lists, long conversations. `ui-choreography.md`
- **Inner UI pops in, left to right or top to bottom**: Filling a panel after it lands. `ui-choreography.md`
- **Phone demo: pull back, tilt while scrolling, press, popup**: Mobile app walkthroughs. `ui-choreography.md`
- **Carousel: fast in, near stop, fast out**: Examples, creators, thumbnails, results. `ui-choreography.md`
- **Thumbnails stay alive inside the cards**: Boards, galleries, dashboards with media. `ui-choreography.md`
- **Tile slides out to clear a slot for the next actor**: Making space inside a bento or layout for a demo action. `ui-choreography.md`
- **UI rises in, holds, launches out**: A rapid sequence of UI moments. `ui-choreography.md`
- **Card scales in, creeps, then pushes into the cut**: Hero cards, export dialogs, posts, chat windows. `ui-choreography.md`
- **Code types in plain ink; syntax colours arrive a few frames later**: Product moment, Update change. SDK, API and developer products. `ui-choreography.md`
- **Bubbles spring-pop from their tail corner**: Questions or messages around a person in footage. `ui-choreography.md`
- **Card or model turns 180 deg with the edge-on frame on the beat**: Revealing the other side. `ui-choreography.md`
- **Chips fall like objects and float back**: Showing disorder or separation with UI chips. `ui-choreography.md`
- **Code streams in line by line**: Developer products. `ui-choreography.md`
- **Button flies in carrying the pointer**: Ending a demo on the action. `ui-choreography.md`
- **Context menu springs up over a blurred page**: Right-click and long-press actions. `ui-choreography.md`
- **Tilted page sweeps up, develops colour, is scrolled**: A product page or a landing page shown as an object. `ui-choreography.md`
- **Calm hold marked only by small label pops**: After a busy run. `ui-choreography.md`
- **Device hinges open and its world pops around it**: Introducing a device or an app in context. `ui-choreography.md`
- **Twin controls split apart from the centre**: A composer's buttons appearing. `ui-choreography.md`

### Micro-interactions

- **A tiny seed square appears first, then unfolds**: Product moment. Building a layout tile by tile. `micro-interactions.md`
- **Selection handles appear, drift and resize**: Editing and selection tools. `micro-interactions.md`
- **Send button launches**: Product moment. The moment a request is sent. `micro-interactions.md`
- **Integration icons slide in and pin to the pill**: Integrations, connected sources. `micro-interactions.md`
- **The film's one spring: a pill opens with overshoot**: The decisive button of the film. `micro-interactions.md`
- **Skeleton placeholders hand over to content**: Update change. Loading states. `micro-interactions.md`
- **State changes in place without travel**: Update change. Toggles, status labels, panels switching. `micro-interactions.md`
- **Toast or chip arrives smeared or blurred, then sharpens**: Update change. Status messages, notifications, small UI pieces arriving. `micro-interactions.md`
- **Click feedback: dot, ring, tint**: Clicks on flat areas without a button shape. `micro-interactions.md`
- **Believable UI details that sell the product**: Every product shot. `micro-interactions.md`
- **Click answered by a colour pulse, not a bounce**: Send, copy, export, confirm. `micro-interactions.md`
- **Chips and tags pop in place**: Secondary UI that should not compete with the hero motion. `micro-interactions.md`
- **Pill grows around its label**: Labels, tags, prompt chips. `micro-interactions.md`
- **Selection bar slides to the clicked item**: App navigation in a walkthrough. `micro-interactions.md`
- **The caret waits and blinks**: Before and after any typing. `micro-interactions.md`
- **Press: squeeze, short hold, snap home**: Product moment. Every click in a product demo. `micro-interactions.md`
- **The field bends like jelly where it is pressed**: Emphasis, Product moment. The one press of a film that should feel physical. `micro-interactions.md`
- **Input with a moving coloured border**: An AI input in a brand that owns that look. `micro-interactions.md`
- **Round button with a liquid fill and a rim**: A hero button in a brand with a glass language. `micro-interactions.md`
- **Hover pulse on contact**: Before every important click. `micro-interactions.md`
- **Cursor vanishes into an outlined button**: A call to action at the end of a demo. `micro-interactions.md`
- **Pill marquee; selected pills fill**: Choosing among modes or capabilities. `micro-interactions.md`
- **CTA peeks in cropped, then cuts to centred**: Ending on a registration or sign-up. `micro-interactions.md`
- **Tiny labels pop in mirrored pairs and drift out**: Surrounding a hero number with context. `micro-interactions.md`

### Cursor

- **The cursor as a character**: Launch films where the product is used by "you". `cursor.md`
- **Cursor glides in, dwells, then clicks**: Product moment. Every click in a demo. `cursor.md`
- **Cursor drags an object into place**: Drag-and-drop features. `cursor.md`
- **The cursor leaves in flight once the product acts**: After the last click of a demo moment. `cursor.md`
- **A pointer glyph turns to aim, then moves**: Illustrative, non-literal UI films. `cursor.md`
- **Hover states fire along the cursor's path**: Showing that a UI is alive and responsive. `cursor.md`

### Loaders and progress

- **Image resolves through representations**: Product moment. Image generation, rendering, any "it makes the picture" beat. `loaders-and-progress.md`
- **Grid loader of blocks: lit row steps, copies in phase**: Openers and loading moments in grid-based brands. `loaders-and-progress.md`
- **Loader arc grows into a ring and the core swells**: The moment between a request and the result. `loaders-and-progress.md`
- **Agent step list: spinner rows that tick to checks**: Product moment. AI agents, builds, workflows, any "it is doing it" moment. `loaders-and-progress.md`
- **A shine passes through text while it loads**: Loading states. `loaders-and-progress.md`
- **Thinking indicator: icon, label and pulsing dots**: Every wait in a product demo. `loaders-and-progress.md`
- **Bubble charges with colour, then snaps wide**: The answer arriving after a typing indicator. `loaders-and-progress.md`
- **Progress line builds with counter-motion**: Progress, search bars forming, a line that becomes a field. `loaders-and-progress.md`
- **Status labels swap faster and faster**: Showing a process speeding to completion. `loaders-and-progress.md`
- **Brand mark rises alone and spins as the loader**: Product moments where the brand is the system. `loaders-and-progress.md`
- **Corner handles turn on one after another: a loading chase**: A selection or a card processing. `loaders-and-progress.md`
- **Ellipsis dots arrive one by one**: Status lines and placeholders. `loaders-and-progress.md`
- **Segmented tick gauge**: A percentage that should read at a glance. `loaders-and-progress.md`

### Data and numbers

- **Chart built from tiny cells that fill**: Proof. Any metric that grows. `data-and-numbers.md`
- **A ring of dots orbits a falling counter and contracts**: A total that gathers many parts. `data-and-numbers.md`
- **Node graph draws its links**: Proof. Integrations, knowledge graphs, connected data, workflows. `data-and-numbers.md`
- **Counters run linear and are cut mid-count**: Live data, savings, usage. `data-and-numbers.md`
- **Result card pops and fills in sequence**: The product's output (a quote, a report, an answer). `data-and-numbers.md`
- **Digits roll or resolve into place**: Proof. Big numbers, scores, amounts. `data-and-numbers.md`
- **Line chart draws with the voice**: Proof. Growth, convergence, a trend behind a statement. `data-and-numbers.md`
- **Big statistic lands oversized with tiny labels**: Proof. The headline number of a film. `data-and-numbers.md`
- **Small data glyphs inside cards**: Profiles, dashboards, rows of results. `data-and-numbers.md`
- **Counter lands in decelerating steps**: The payoff number. `data-and-numbers.md`
- **Word wheel advances like a picker**: Options, formats, apps that the product supports. `data-and-numbers.md`
- **Spec drawing with breathing dimension bars**: Brand or product construction. `data-and-numbers.md`
- **Tag the chosen data, wash out the rest**: Filtering, classification, search results. `data-and-numbers.md`
- **One full-spectrum object in a one-hue film**: Emphasis, Proof. A dashboard widget, a category chart or an icon that must stand out. `data-and-numbers.md`
- **Count grows geometrically, then jumps to the total**: Proof. "Reading N items" moments. `data-and-numbers.md`
- **A row of dots rides a wave in stop-go pulses**: Signal, activity, rhythm. `data-and-numbers.md`
- **Small bevelled metal numerals for rank**: Proof. Leaderboards and rankings inside UI. `data-and-numbers.md`

### Icons and glyphs

- **Blob launches, stretches, hangs and falls**: A playful launch of a single element (an idea leaving the bar). `icons-and-glyphs.md`
- **An icon stands in for a word in the sentence**: Product names, apps, time, anything the viewer knows as an icon. `icons-and-glyphs.md`
- **A single glyph grows, spins upright and opens the film**: Cold opens. `icons-and-glyphs.md`
- **Icons and badges pop in with a small life**: Badges, emoji, small rewards and states. `icons-and-glyphs.md`
- **Line icon draws itself on**: Icons in UI moments. `icons-and-glyphs.md`
- **A row of icons arrives staggered, the chosen one last**: Toolbars, app grids, options. `icons-and-glyphs.md`
- **A dot grows into an icon**: Building icons from nothing. `icons-and-glyphs.md`
- **Arrows as motion motifs**: Direction, growth, uploads, "go". `icons-and-glyphs.md`
- **Companion icon swaps on every tick**: Showing formats or types passing through. `icons-and-glyphs.md`

### Photos and footage

- **Detection boxes keep faces in true colour while the frame turns false-colour**: Proof, Product moment, Light / colour event. Vision, detection, search-in-video and analysis products: showing what the model sees. `photos-and-footage.md`
- **Picture montage that accelerates behind held copy**: Opening hook. Breadth (use cases, styles, results) under one statement. `photos-and-footage.md`
- **Stills pushed into an expired-film spectral look**: Opening hook, Texture / material. A montage of mixed generated or stock stills that must feel like one world. `photos-and-footage.md`
- **Product stays fixed while the world swaps behind it**: Update change. Showing versatility (works anywhere, with anything). `photos-and-footage.md`
- **Edits happen in place under the hovering cursor**: Update change. Image or design editing products. `photos-and-footage.md`
- **Photos arrive as a tint and develop to colour**: Every image in a product film. `photos-and-footage.md`
- **The copy and the work continue on real surfaces**: Proof, Product moment, Update change. Creative and brand tools: made here, used everywhere. `photos-and-footage.md`
- **One generated character carried across plates**: Proof, Product moment. Problem-and-answer stories. `photos-and-footage.md`
- **A heat-mapped figure trailed by tinted time echoes**: Emphasis, Texture / material. A sport, motion or generation beat. `photos-and-footage.md`
- **Product UI framed over live footage**: Putting the product in the world without a full live-action shoot. `photos-and-footage.md`
- **Background plate speeds up and slows with the read**: Footage behind type. `photos-and-footage.md`

### Collage and composition

- **Card streams on conveyors with U-shaped speed**: Showing volume (thousands of images, many creators, a feed of examples). `collage-and-composition.md`
- **Four de-synchronised mini-films in a gutterless grid**: Opening hook, Proof. Social loops and hero loops that must show breadth. `collage-and-composition.md`
- **A wall of fields all typing at once**: Scale: many users, many questions. `collage-and-composition.md`
- **Stop-motion collage: pieces cut in whole**: Editorial, crafted, creator-economy films. `collage-and-composition.md`
- **One composition rule per act**: Films with a construction act and a product act. `collage-and-composition.md`
- **Hard split: image half, text half**: Product plus claim, side by side. `collage-and-composition.md`
- **Grey problem pills, then blue benefit pills**: Problem/solution structures. `collage-and-composition.md`
- **Objects pop around a word at full size**: Showing what a word covers (integrations, formats, uses). `collage-and-composition.md`
- **A set of physical objects as the film's vocabulary**: Tabletop, crafted films. `collage-and-composition.md`
- **Cards flick onto a pile**: Accumulation: saves, uploads, picks. `collage-and-composition.md`
- **Tiles in a mixed shape vocabulary**: Bento and collage layouts that should feel designed, not templated. `collage-and-composition.md`

### Depth and 3D

- **Type sits between layers of the picture**: Making type and product share one space. `depth-and-3d.md`
- **Hero objects fly with physical arcs**: 3D brand worlds. `depth-and-3d.md`
- **Only what matters stays in focus**: Directing attention without moving things. `depth-and-3d.md`
- **Layers move at different rates**: Any flat frame that should read with depth. `depth-and-3d.md`
- **Shadows and rims tinted with the accent**: Texture / material. Light grounds with a strong accent. `depth-and-3d.md`
- **Cards fly in and drift in depth forever**: Galleries, templates, examples as a world. `depth-and-3d.md`
- **Tiles orbit a hero on a ring**: Integrations or features around a product. `depth-and-3d.md`
- **A pixel glyph swings in as an extruded voxel solid**: Emphasis, Logo / lockup. A pixel-font identity. `depth-and-3d.md`
- **Tiny word in front of a giant ghost of itself**: A word about size or scale ("Big"). `depth-and-3d.md`
- **Soft foreground objects pass close to the lens**: Tabletop sets, data scenes, a zoom that needs depth. `depth-and-3d.md`

### Texture, grids and finish

- **A band of glyphs traces every subject's edge**: Opening hook, Transition, Texture / material. Generated imagery, vision and generation products. `texture-grids-and-finish.md`
- **Symbol string tiles the frame and resolves into an ASCII object**: Opening hook. A film about the web, data or the world. `texture-grids-and-finish.md`
- **Grid cells switch on in a wave**: Openers, backgrounds that build, galleries of thousands, "it scales". `texture-grids-and-finish.md`
- **Hairline layout grid as the ground**: Texture / material. Product, tool and design films. `texture-grids-and-finish.md`
- **Grain and print texture as the picture's finish**: Texture / material. Editorial, image-led or dark tech films. `texture-grids-and-finish.md`
- **A portrait drawn in two digits under a rising gradient**: Reveal, Product moment, Texture / material. Developer, data and scraping products. `texture-grids-and-finish.md`
- **Design-tool guides that track a mask's bounding box**: Emphasis, Texture / material. A shape-led identity. `texture-grids-and-finish.md`
- **Accent blocks jump between grid cells on kicks**: Grid-based brands. `texture-grids-and-finish.md`
- **Halftone, ASCII and dither as the picture's texture**: Texture / material. Image-generation, print, editorial or retro-tech films. `texture-grids-and-finish.md`
- **Line-art pattern fills the end card**: End cards on a full accent field. `texture-grids-and-finish.md`
- **A fan of curves that keep vibrating like strings**: Product moment, Texture / material. Connection, sync, everything flowing into one. `texture-grids-and-finish.md`
- **Dither-pixel patch licks up through outlines**: Texture / material. End cards with line art. `texture-grids-and-finish.md`
- **Ground made of vertical bars**: Texture / material. Brand-colour sections. `texture-grids-and-finish.md`
- **A patch of light carrying a lattice sweeps under the text**: Product moment, Texture / material. The send or run moment of a prompt box. `texture-grids-and-finish.md`
- **Dot grid seen only under wandering light**: Dark openers. `texture-grids-and-finish.md`
- **Faint concentric rings behind the subject**: Centred statements. `texture-grids-and-finish.md`
- **Coarse pixel-mosaic ground behind UI**: Image-generation brands. `texture-grids-and-finish.md`
- **Picture sliced into offset slats**: Section breaks on a portrait or a picture. `texture-grids-and-finish.md`
- **Rim highlight from a fixed light**: Logo / lockup, Texture / material. Floating cards in a soft, airy look. `texture-grids-and-finish.md`
- **A thick soft stroke travels across the lower third**: A film whose one gradient is a line. `texture-grids-and-finish.md`
- **Particles pop in during a voice pause**: Filling a pause in narration. `texture-grids-and-finish.md`
- **Photo cards with a mat and a thin coloured outline**: Masonry walls and galleries. `texture-grids-and-finish.md`

### Logo and end card

- **Logo grows out of a line, a bar, a pixel monogram**: Brands with a geometric or pixel mark. `logo-and-end-card.md`
- **Blobs fuse and split, then collapse into the mark**: Logo / lockup. A brand with round forms. `logo-and-end-card.md`
- **Light comets spiral out and collapse into the logo**: Logo / lockup. A dark film's logo reveal. `logo-and-end-card.md`
- **Logo assembles from parts**: Logo / lockup. Logos made of geometric parts. `logo-and-end-card.md`
- **Mark swings or spins into place**: The brand moment, once. `logo-and-end-card.md`
- **Brackets become strokes that shrink to dots as the logo grows**: A film that used corner markers throughout: they hand over to the logo. `logo-and-end-card.md`
- **Colour blocks swarm into letter slots and become glyphs**: Playful brands with a palette. `logo-and-end-card.md`
- **The mark lands inside a window of a real photograph**: Logo / lockup. A consumer brand with a place or a feeling. `logo-and-end-card.md`
- **Mark snaps smaller on a hit, then the lockup slides open**: Logo / lockup. The end lockup of a launch film. `logo-and-end-card.md`
- **App icon de-blurs while its monogram writes and lines converge**: An app's end card. `logo-and-end-card.md`
- **Start inside the mark and pull back to it**: The end of a film whose mark has a 3D form. `logo-and-end-card.md`
- **Logo cuts in oversized and settles**: Logo / lockup. Lockups, end cards, the brand's first appearance. `logo-and-end-card.md`
- **Wordmark slides out of the mark**: Logo / lockup. Every lockup that does not need a hit. `logo-and-end-card.md`
- **Wordmark builds letter by letter from the first stroke**: The product name, once. `logo-and-end-card.md`
- **The one dead-still hold at the end**: Logo / lockup. Every end card. `logo-and-end-card.md`
- **End letters arrive hot and cool to white**: Logo / lockup. End cards in a film with a recency colour system. `logo-and-end-card.md`
- **Mark pops squashed and stretches to size**: Marks that land on a beat after a dot or a drop. `logo-and-end-card.md`
- **Mark resolves in steps: de-pixel, ghost to ink, bold to final**: Logo / lockup. Pixel or geometric marks. `logo-and-end-card.md`
- **Wordmark letters blur-stagger in, a script suffix pen-writes**: Soft, friendly brands. `logo-and-end-card.md`
- **The mark keeps moving inside every lockup**: Brands with a character or animated mark. `logo-and-end-card.md`
- **How the film leaves: fade, cut or defocus**: The final second of a film. `logo-and-end-card.md`
- **Wordmark types on a beat grid, lands loose and tightens**: A lockup for a product with a typed or technical feel. `logo-and-end-card.md`
- **Logo slams in on one blurred frame**: Closing a grid section on a hit. `logo-and-end-card.md`
- **End logo swells, then settles back**: The last beat of a film. `logo-and-end-card.md`

### Sound and timing

- **Every visual event has its own designed sound**: Every film with UI. `sound-and-timing.md`
- **Choose the film's clock: onsets, subdivisions or a seconds grid**: Every film: decide the clock in the treatment. `sound-and-timing.md`
- **No low end until the reveal**: Opening hook, Reveal. Every launch film with a construction or build-up act. `sound-and-timing.md`
- **The music stops for a breath before the reveal**: Reveal. Before every big reveal. `sound-and-timing.md`
- **Captions locked to the voice, picture a frame or two early**: Voice-over films. `sound-and-timing.md`
- **Whoosh run into a thud; the swap just before the kick**: Title landings. `sound-and-timing.md`
- **A screen-fixed voice waveform under moving shots**: Product moment. Voice and call products. `sound-and-timing.md`

### Cadence and grammar

- **One motion grammar for the whole film**: Every film: write the grammar into the treatment. `cadence-and-grammar.md`
- **Graphics on a lower animation cadence**: Graphic, illustrative, collage films. `cadence-and-grammar.md`
- **Eyes open and blink**: Mascots and characters. `cadence-and-grammar.md`
- **A designed hold that clicks into place**: After a landing that should feel locked. `cadence-and-grammar.md`
