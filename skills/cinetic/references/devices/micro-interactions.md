# Micro-interactions

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Presses, toggles, chips, loaders and small state changes, timed the way software behaves: hard where software is hard, eased where people are.

[A tiny seed square appears first, then unfolds](#a-tiny-seed-square-appears-first-then-unfolds) · [Selection handles appear, drift and resize](#selection-handles-appear-drift-and-resize) · [Send button launches](#send-button-launches) · [Integration icons slide in and pin to the pill](#integration-icons-slide-in-and-pin-to-the-pill) · [The film's one spring: a pill opens with overshoot](#the-film-s-one-spring-a-pill-opens-with-overshoot) · [Skeleton placeholders hand over to content](#skeleton-placeholders-hand-over-to-content) · [State changes in place without travel](#state-changes-in-place-without-travel) · [Toast or chip arrives smeared or blurred, then sharpens](#toast-or-chip-arrives-smeared-or-blurred-then-sharpens) · [Click feedback: dot, ring, tint](#click-feedback-dot-ring-tint) · [Believable UI details that sell the product](#believable-ui-details-that-sell-the-product) · [Click answered by a colour pulse, not a bounce](#click-answered-by-a-colour-pulse-not-a-bounce) · [Chips and tags pop in place](#chips-and-tags-pop-in-place) · [Pill grows around its label](#pill-grows-around-its-label) · [Selection bar slides to the clicked item](#selection-bar-slides-to-the-clicked-item) · [The caret waits and blinks](#the-caret-waits-and-blinks) · [Press: squeeze, short hold, snap home](#press-squeeze-short-hold-snap-home) · [The field bends like jelly where it is pressed](#the-field-bends-like-jelly-where-it-is-pressed) · [Input with a moving coloured border](#input-with-a-moving-coloured-border) · [Round button with a liquid fill and a rim](#round-button-with-a-liquid-fill-and-a-rim) · [Hover pulse on contact](#hover-pulse-on-contact) · [Cursor vanishes into an outlined button](#cursor-vanishes-into-an-outlined-button) · [Pill marquee; selected pills fill](#pill-marquee-selected-pills-fill) · [CTA peeks in cropped, then cuts to centred](#cta-peeks-in-cropped-then-cuts-to-centred) · [Tiny labels pop in mirrored pairs and drift out](#tiny-labels-pop-in-mirrored-pairs-and-drift-out)

### A tiny seed square appears first, then unfolds

`dv-seed-square-unfold` · signature · energy medium · any · primitive: Seed

A 15-40 px coloured square appears exactly where something will land and sits for 1-4 frames, then bursts into a photo tile, slides and widens with each typed character into a sticky note, stretches into a label bar whose text types, or a line end becomes a capsule that unfolds centre-out into a labelled card. **When:** Building a layout tile by tile; labels and notes; any arrival that should feel planted. **Avoid:** Seeds that do not match the final element's colour.

- **Anatomy:** Seed square (2-4 % of the frame) -> hold 1-4 f -> expo-out to the full box starting at a third; width follows typing instantly; capsule widens centre-out revealing its letters.
- **Timing:** Seed 2-8 f; tile 12-16 f; new tile every 4-6 f; bar stretch 20 f; capsule 14-20 f.
- **Sound:** A glockenspiel note on the first seed; none per seed after.
- **Build:** `<Seed at box color mode="burst"|"stretch"|"capsule">{content}</Seed>` (fx/Seed): a 24 px square cut on at the landing spot, held 4 f, then burst (expo-out from a third of the way, 14 f), stretch (a bar of the label's height, 20 f) or capsule (centre-out, then open, 17 f); `widths` for a note that widens per typed character; seedOnsets(start, n) for a run every 4-6 f.

### Selection handles appear, drift and resize

`dv-selection-handles` · signature · energy medium · launch, feature · primitive: Markers

Four small square handles appear one by one clockwise around a subject and drift outward; they pull in until they overlap the corners, then spring back past rest; the cursor becomes a corner-bracket handle and drags a translucent selection rectangle; handles snap around a small word and the selection grows to swallow the cards around it. **When:** Editing and selection tools; pointing at the subject of the film. **Avoid:** Handles in a film without an editing idea.

- **Anatomy:** 24-32 px squares; appear 2-3 f apart clockwise; drift 47 px out; overlap then spring past rest; selection rectangle at 25 % white with corner marks.
- **Timing:** Appear 32 f; drift 30 f; spring 15 f; drag 20 f.
- **Sound:** None, or soft ticks.
- **Build:** `<Markers boxes onsets blink>` for the handles; the drag as a Morph box tied to the cursor.

### Send button launches

`dv-send-button-launch` · signature · energy medium · launch, feature · primitive: recipe (plain layers)

The round send button detaches from its box and launches on a J-curve toward the camera (drifting right while rising and growing), or its arrow rotates to point back and flies along the input, erasing the text with a liquid smear. **When:** The moment a request is sent. **Avoid:** Sending without consequence (the next shot must show the result).

- **Anatomy:** x peak early, y peak late (J), diameter growing linearly; arrow rotate 90 deg on an ease, fly on an ease-in, a smear erasing behind it.
- **Timing:** Launch 42 f; rotate 17 f, fly 26 f.
- **Sound:** A kick on the launch, a whoosh on the exit; or a silence then a sub-drop.
- **Build:** Recipe: x on E.snapOut, y on E.buildIn, scale linear; the erase is a Wipe whose edge follows the arrow.
- **Materials and numbers:** The button that flew away comes back: about 2 s later a white disc spins in from a frame corner, motion-blurred (rotational smear for 6 f), and settles into the send slot of the new window (12 f, strong ease-out) on a sub drop.

### Integration icons slide in and pin to the pill

`dv-integration-orbit-pins` · signature · energy medium · launch, feature · primitive: Cards

Five app-icon tiles appear one by one around a central pill as each is named, and matching coloured dots pin to the pill's border, so the connections read. **When:** Integrations, connected sources. **Avoid:** More than about six icons.

- **Anatomy:** Slide about 16 f expo-out; onsets tied to the words; dots at the border points facing each icon.
- **Timing:** 86 f for five.
- **Sound:** Each icon lands with its word.
- **Build:** Cards enterState per icon + small dots placed on the pill's border by angle.

### The film's one spring: a pill opens with overshoot

`dv-one-spring-pill` · signature · energy medium · any · primitive: Cards

The only spring in the film: a pill widens past its size (372 -> 640 -> 588 -> 598 px) into a big glossy button and settles. **When:** The decisive button of the film. **Avoid:** A second spring kind in the same film.

- **Anatomy:** zeta 0.59; 10-19 % overshoot; settles in 22 f.
- **Timing:** 34 f.
- **Sound:** A kick.
- **Build:** springBox(f, start, { A, B, preset: SPR.landing }).

### Skeleton placeholders hand over to content

`dv-skeleton-load` · workhorse · energy calm · any · primitive: Cards

Cards first appear as blank or blurred slabs with grey bars for text (or a code panel with only its line numbers, or avatar circles), then the real content resolves in layers: the pin first, the text, then the photo; a selection dot pops last. **When:** Loading states; anything the product fetches or generates. **Avoid:** Skeletons that last longer than about 0.5 s.

- **Anatomy:** Blank slab 2-4 f; layers 2 f apart; gutter 26 f before the first code pixel.
- **Timing:** Hand-off 28 f; per card 4-6 f.
- **Sound:** UI pops on each card.
- **Build:** Cards with a skeleton face cross-switched to the content face (HardStep per layer).

### State changes in place without travel

`dv-state-change-in-place` · workhorse · energy calm · any · primitive: Toggle / HardStep

A control changes state the way software does: a toggle turns on without sliding (the knob dissolves on the left and reappears on the right while the brand colour switches in the same frame); a header label clears and the new label appears as the chevron slides to its width; sub-panels swap content on one frame; a frosted bubble is a solid button after a cut. **When:** Toggles, status labels, panels switching. **Avoid:** Tweening what software would switch.

- **Anatomy:** One-frame swaps; the only eased part is the chevron or the colour.
- **Timing:** 1 f swaps; label change 16 f; toggle 26 f.
- **Sound:** A state-change sound.
- **Build:** `<Toggle at mode="inPlace" w track trackOn knob>` (fx/MicroUI): the knob dissolves on the left and reappears on the right while the track switches in one frame at the midpoint (26 f); other in-place swaps stay HardStep / stepValue with the chevron on a short E.snapOut. `mode="spring"` (house) crosses on SPR.landing clamped at 6 % with the track snapping 1 f after the click.
- **Materials and numbers:** A chip's label changes by the new label sliding in from the right inside the pill while the old one is clipped (both overlap for 4-6 f, about 20 f per swap); a phone screen can change content by a 6-8 f ghost dissolve (old 100, 50, 20, 0 %) while the device moves.

### Toast or chip arrives smeared or blurred, then sharpens

`dv-toast-chip-entry` · workhorse · energy medium · any · primitive: Cards

A status chip enters sideways as a horizontal smear (a thin streak, then a smeared pill, then sharp); a notification grows from a blurred pill and rises; a toast pops blurred at the push's midpoint, rises and sharpens; a disc inflates behind an icon (the icon leads); a tab bar slides down as the scroll brakes. **When:** Status messages, notifications, small UI pieces arriving. **Avoid:** Long smears on readable text.

- **Anatomy:** Streak 1 f, smear 2 f, sharp; growth 1136 -> 1408 px in 7 f; rise 17 px; the disc starts 2-4 f after its glyph.
- **Timing:** 8-24 f.
- **Sound:** A chat pop or wood-block on the cut; a soft note after whooshes.
- **Build:** Cards enterState with defocus (two ladder copies) and a 1-2 f horizontal ghost.

### Click feedback: dot, ring, tint

`dv-click-ripple-dot` · workhorse · energy calm · any · primitive: Ripple

On click a small dot blooms at the cursor tip, a thin ring expands around it to about 40 px, and the clicked area takes a light tint that holds. **When:** Clicks on flat areas without a button shape. **Avoid:** Glow halos (keep the ring thin).

- **Anatomy:** Dot 18 px, ring 10 -> 40 px fading, area tint over 6 f.
- **Timing:** 26 f in all; ring 12 f.
- **Sound:** A soft UI tap on the ring.
- **Build:** `<Ripple at x y color shape={{ w, h }}>` (fx/MicroUI): an 18 px dot blooms (2 f), a thin ring grows 10 -> 40 px (12 f, E.snapOut) and the clicked area takes a 14 % tint that holds (6 f).

### Believable UI details that sell the product

`dv-ui-anatomy-kit` · workhorse · energy calm · any · primitive: kit

The product reads as real because of small details: the user's message as a dark pill top-right, KPI cards with tiny coloured icon chips and big values, a post card with avatar, handle, verified tick and kebab menu, a grid of task chips with one check toggle and an accent button. **When:** Every product shot. **Avoid:** Lorem ipsum, grey placeholder cards, fake data that does not add up.

- **Anatomy:** Real names and numbers; one accent; state markers (checks, badges, dots).
- **Timing:** Static; enters with its shot (a chip grid can cut in zoomed and zoom out over 78 f).
- **Sound:** None.
- **Build:** kit parts (Avatar, Badge, Check, Button, Toast, Meter) inside Surface.

### Click answered by a colour pulse, not a bounce

`dv-click-colour-pulse` · workhorse · energy calm · any · primitive: Cards

On the click the pointer vanishes and the button's fill ramps through a light tint and lands in its new state (with a check, an "Analyzing" label, a popover from its tail); or the colour drains upward through the button as its arrow launches; or the button flashes white and blurs for 3 f before turning to the active colour. **When:** Send, copy, export, confirm. **Avoid:** A second multi-hue ramp in the same film.

- **Anatomy:** Hover 8 f, click, colour ramp 9-23 f, hold, fade; popover pops from its tail in 3 f.
- **Timing:** Hover 12-19 f; ramp 12-23 f; popover 10 f in, 7 f out.
- **Sound:** A bubble pop at -1.2 dBFS plus a wood-block; a UI pop.
- **Build:** press() q drives a colour interpolation; HardStep for the white flash; springBox from the button for the popover. Recipe: background linear-gradient(0deg, next 0 %, current 66 %), background-size 100 % 300 %, background-position-y stepping 0 -> 100 % inside each 4 f state.
- **Materials and numbers:** The fill changes colour by a vertical gradient climbing through it: each new colour enters at the bottom edge and pushes upward through a soft gradient 1.5x the button's height, about 4 f per state through a short hue walk, then holds 18 f and fades in 6 f.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Chips and tags pop in place

`dv-chip-pop-in-place` · workhorse · energy calm · any · primitive: HardStep

Tags with coloured status dots, secondary chips, an inline file chip in a prompt or a notification dot simply appear at full saturation in one frame, one every few frames: no fly-in. **When:** Secondary UI that should not compete with the hero motion. **Avoid:** Popping the hero element (give it an entrance).

- **Anatomy:** One-frame cut-on; 2-6 f apart; an inline chip appears as one token.
- **Timing:** 1 f each; gaps 4-12 f.
- **Sound:** None, or within another pop.
- **Build:** HardStep visibility per chip.

### Pill grows around its label

`dv-pill-label-build` · workhorse · energy calm · any · primitive: Cards

A pill builds around its words: an outlined pill pre-sized per phrase with words cut on inside it; a link icon first, then words, the outline widening symmetrically; a label pill growing up from its bottom edge beside a tile. **When:** Labels, tags, prompt chips. **Avoid:** Text that spills before the pill grows.

- **Anatomy:** Words 4-6 f apart; width eases with each word (or pre-sized); growth from the bottom edge on an expo-out.
- **Timing:** 10-20 f per pill; words 10-15 f apart.
- **Sound:** A bubble pop and a mouse click 80-140 ms after.
- **Build:** Morph box width from the measured text (FontGate); words pop inside.

### Selection bar slides to the clicked item

`dv-sidebar-nav` · workhorse · energy calm · feature, walkthrough · primitive: Cards

On click the cursor shrinks a little and a solid selection bar slides down the sidebar to the clicked item while the page cross-dissolves in 3-4 frames; a group expands its sub-items and pushes the items below down. **When:** App navigation in a walkthrough. **Avoid:** Pages that slide (they cross-dissolve fast in real apps).

- **Anatomy:** Bar 8 f; dissolve 6-8 f; sub-items open in 12-16 f pushing 110 px.
- **Timing:** 8-16 f.
- **Sound:** A UI click.
- **Build:** snapBox/E.snapOut on the bar's y; Cards stack for the group.

### The caret waits and blinks

`dv-caret-beats` · workhorse · energy calm · any · primitive: TypeOn

The placeholder clears and a thick caret waits about 6 frames before typing starts; after typing, the caret blinks while the bar lifts away. **When:** Before and after any typing. **Avoid:** A caret that blinks during the typing.

- **Anatomy:** Caret 6 x 45 px; hold 12 f; blink on/off 16 f.
- **Timing:** Hold 12 f; blink period 32 f.
- **Sound:** None.
- **Build:** TypeOn caret with a pre-hold and blink.

### Press: squeeze, short hold, snap home

`dv-press-squeeze-release` · workhorse · energy calm · any · primitive: Cards

A pressed button or tile squeezes to 86-90 %, holds a few frames, and snaps home at speed; the cursor itself can squash to 0.8 and spring back slightly larger; a faint ring can pulse out of a pressed tile. **When:** Every click in a product demo. **Avoid:** Bounces after the release; presses without a cursor or a reason.

- **Anatomy:** Down 2-5 f, hold 3-9 f, release 4-6 f snapping home (never above 1); colour snaps 1 f deep -> light on the press and back; cursor shrinks about 30 % area over 2 f.
- **Timing:** Press 10 f + release 12 f at 60 fps (house x0.87, 9 f down, 3 held, 10 up).
- **Sound:** A click on the press frame; a wood-block on the colour change.
- **Build:** press(f, at, { depth: 0.87 }) from Cards; cursor press via Cursor press prop.
- **Materials and numbers:** The press can bend its container: see the jelly press for the edge displacement, and the button fill can change colour by a gradient climbing through it rather than a cross-fade.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### The field bends like jelly where it is pressed

`dv-jelly-press` · accent · energy medium · launch, feature · primitive: no primitive yet (recipe below)

As the cursor presses a button inside an input card, the card's edge and corner bow outward round the button (a soft bulge, the corner radius swelling), the edge goes slightly wavy along its length, then everything springs back. **When:** The one press of a film that should feel physical; playful brands. **Avoid:** Serious enterprise tools; every click.

- **Anatomy:** Edge displacement d(s) = A exp(-(s - s0)^2 / (2 x 120^2)) along the normal, A peaking about 9 px at 1080p; a ripple of 2 px sin(2 pi s / 90 px - phase); stroke and shadow follow the shape; the cursor squashes 1 -> 0.8 -> 1 with it.
- **Timing:** Bulge 6 f, wobble 10 f, release 4 f.
- **Sound:** The click, then a wood-block.
- **Build:** Recipe: the rounded rect as an SVG path sampled at about 80 points, displaced each frame in closed form.

### Input with a moving coloured border

`dv-gradient-border-input` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

A dark rounded input whose border light travels around its outline in two brand colours, continuously. **When:** An AI input in a brand that owns that look. **Avoid:** House films (it reads as the stock AI look).

- **Anatomy:** Conic border rotated continuously.
- **Timing:** Continuous (68 f per turn).
- **Sound:** None.
- **Build:** A conic-gradient border (a baked plate) rotated by transform.
- **Conditions:** gradients baked as dithered plates and moved by transform; light built into the device (core, body, falloff), never a uniform halo.

### Round button with a liquid fill and a rim

`dv-liquid-glass-button` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

A round button with a thin up-arrow, a bright rim highlight and an accent liquid fill pooled at its bottom; it shrinks with the pull-back, pulses on hover and implodes on click. **When:** A hero button in a brand with a glass language. **Avoid:** House films.

- **Anatomy:** Rim highlight, liquid pool, glyph.
- **Timing:** Static; implodes in 6 f.
- **Sound:** None.
- **Build:** Layered circles with a baked rim plate.
- **Materials and numbers:** At rest the round glass button holds a swirling liquid in its lower third and a streak across the top; as the cursor approaches the liquid swirls up and fills the sphere (18 f), on touch it drains to a thin layer (16 f); fill blobs blurred about 10 px inside a hard circle mask, a white inner highlight at 30 %, a rim glow about 8 px. The arrow inside scrolls out of the top (8 f, ease-in), the button is empty for 4 f, and a fresh arrow rises from the bottom (8 f, ease-out), landing as the cursor touches.
- **Conditions:** glass as a material with real frost or refraction, not a default card style.

### Hover pulse on contact

`dv-hover-pulse` · accent · energy calm · any · primitive: hoverPulse

When the cursor touches a button its rim grows about 8 % in 2 f and decays back over 4 f. **When:** Before every important click. **Avoid:** Continuous pulsing.

- **Anatomy:** Scale +7.8 % in 2 f, decay 4 f.
- **Timing:** 12 f at 60 fps.
- **Sound:** None, or a faint tick.
- **Build:** hoverPulse(f, at) (fx/MicroUI) on the rim's scale: +7.8 % in 2 f at 30 fps, back over 4 f.

### Cursor vanishes into an outlined button

`dv-cursor-becomes-button` · accent · energy medium · launch, feature · primitive: Cursor

On click the cursor disappears and an outlined circle with an arrow appears at about 111 % and settles, as if the click produced the button. **When:** A call to action at the end of a demo. **Avoid:** Keeping both cursor and button.

- **Anatomy:** One-frame swap; settle expo-out.
- **Timing:** 16 f.
- **Sound:** None distinct.
- **Build:** Cursor visibility off on the click + Oversize from 1.11.

### Pill marquee; selected pills fill

`dv-pill-marquee-select` · accent · energy calm · launch, feature · primitive: Cards

Rows of outlined pills with words alternate with small line icons, scrolling as a marquee; the selected pills fill with colour from their left end, connectors draw between them, the rest dim. **When:** Choosing among modes or capabilities. **Avoid:** Gradient fills in house films.

- **Anatomy:** Fill left-anchored 16-24 f; connectors 20 f; dim 18 f.
- **Timing:** 175 f in all.
- **Sound:** Voice.
- **Build:** Wipe kind 'feather' inside each selected pill; connectors as stroke draw-ons.
- **Materials and numbers:** The chosen outline pill fills with a horizontal gradient (a pale tint at its left end, the accent at 45 %, a near-black shade at its right end) revealed by width over about 20 f, under white text; its 2 px outline stays visible.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### CTA peeks in cropped, then cuts to centred

`dv-cta-peek-centre` · accent · energy calm · launch · primitive: Cards

A call-to-action tag peeks in at the edge of a grid, cropped, and creeps wider for about a second; hard cut to the tag centred and whole, breathing. **When:** Ending on a registration or sign-up. **Avoid:** Long peeks.

- **Anatomy:** Peek creep 52 f; cut; breathe 24 f expo-out.
- **Timing:** 96 f.
- **Sound:** A kick on the cut.
- **Build:** Cards with a creep, then a cut to a centred Card with Oversize from 1.04.

### Tiny labels pop in mirrored pairs and drift out

`dv-mirrored-label-pairs` · accent · energy calm · launch, feature · primitive: Words

Ten tiny metric labels pop in pairs mirrored about the centre and drift outward slowly. **When:** Surrounding a hero number with context. **Avoid:** Labels that must be read.

- **Anatomy:** Pairs 2-3 f apart; drift outward.
- **Timing:** Pairs over 25 f; drift 36 f.
- **Sound:** None.
- **Build:** Words pairs with mirrored x and an outward drift.
