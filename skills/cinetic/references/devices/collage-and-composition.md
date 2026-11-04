# Collage and composition

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Frames built from many parts: four live panels, stop-motion collages, objects popping around a word, one layout shared by a before and an after.

[Card streams on conveyors with U-shaped speed](#card-streams-on-conveyors-with-u-shaped-speed) · [Four de-synchronised mini-films in a gutterless grid](#four-de-synchronised-mini-films-in-a-gutterless-grid) · [A wall of fields all typing at once](#a-wall-of-fields-all-typing-at-once) · [Stop-motion collage: pieces cut in whole](#stop-motion-collage-pieces-cut-in-whole) · [One composition rule per act](#one-composition-rule-per-act) · [Hard split: image half, text half](#hard-split-image-half-text-half) · [Grey problem pills, then blue benefit pills](#grey-problem-pills-then-blue-benefit-pills) · [Objects pop around a word at full size](#objects-pop-around-a-word-at-full-size) · [A set of physical objects as the film's vocabulary](#a-set-of-physical-objects-as-the-film-s-vocabulary) · [Cards flick onto a pile](#cards-flick-onto-a-pile) · [Tiles in a mixed shape vocabulary](#tiles-in-a-mixed-shape-vocabulary)

### Card streams on conveyors with U-shaped speed

`dv-conveyor-streams` · signature · energy high · launch, feature · primitive: Conveyor

Streams of image cards travel on diagonals (one up-right, one down-left) or in rows with fade masks at the edges, fast on entry, slow in the middle, fast on exit; a photo strip accelerates to a whip and slows while the tiles grow so the hero ends large; two rivers of cards accelerate six-fold into a full blur and cut. **When:** Showing volume (thousands of images, many creators, a feed of examples). **Avoid:** Constant-speed marquees.

- **Anatomy:** Rounded cards about 140 px; diagonal angle about 44 deg; edge fade masks; speed U-curve; growth toward the hero.
- **Timing:** In 56 f, cruise, out 28 f; a rush into blur 60 f (64 % of the change in the last 20 %).
- **Sound:** Enters on a swap; exits with the word; a cut +120 ms after the beat.
- **Build:** `<Conveyor start n pitch angle x y render={(i) => card}>` (fx/Conveyor): a looped stream whose speed enters at 65 px/f, settles to 18 (56 f), and with `outAt` grows 6x into the cut (28 f, 64 % of the change in the last fifth); two conveyors at opposite angles with a `phase` offset make the rivers; edges fade by mask; declares() marks the fast frames as camera blur.
- **Materials and numbers:** Rivers get depth per card, not one flat speed blur: neighbours at the same 8-9 px/f are blurred by different seeded amounts (0 or 6-10 px), lean 3-8 deg in perspective and scale down slightly with depth; card radius about 24 px, shadow 0 10px 20px at 10 %. A collage conveyor can magnify while it pans (1 -> 3.2x over 150 f, ease-in) while its content turns from one mood to its opposite, slowing almost to rest for 60 f at the peak so the faces can be read.

### Four de-synchronised mini-films in a gutterless grid

`dv-quad-grid-films` · signature · energy high · loop, launch, feature · primitive: recipe (plain layers)

The frame is split into four panels with no gutters (or near-invisible hairlines), each running its own mini-film in its own style; cuts happen in one panel at a time on an irregular clock (never two on the same frame, at least two panels always moving); motifs echo across panels; near the loop's end the panels relay scenes to each other so the loop never visibly restarts. **When:** Social loops and hero loops that must show breadth; feature reels. **Avoid:** Synchronised cuts across panels; 9:16 frames (panels get too small).

- **Anatomy:** Panels 960 x 540 at 1080p; per-panel state changes about every 1 s; cut gaps 12-88 f at 60 fps, irregular; a motif from one panel reappearing (inverted) in another.
- **Timing:** Panel cuts 12-88 f apart; relays 16 f apart at the loop end.
- **Sound:** One shared bed; pane cuts driven by SFX onsets (whooshes, pops, keypresses), not the beat.
- **Build:** Recipe: CSS grid 2x2, each cell a scaled 1920x1080 composition in `<Loop>` with awkward periods; merge all cut frames and nudge apart any within 6 f.

### A wall of fields all typing at once

`dv-typing-wall` · signature · energy high · launch, feature · primitive: TypeOn

Cut to a wall of question pills all typing word chunks simultaneously (offset 1-3 f), send buttons popping as they finish; the next cut pushes in with a new background colour. **When:** Scale: many users, many questions. **Avoid:** Readable sentences (it is texture).

- **Anatomy:** 6-12 TypeOn instances with seeded offsets; pops on completion.
- **Timing:** 120 f.
- **Sound:** UI pops on the cuts.
- **Build:** Many `<TypeOn kind="field">` with seeded starts.

### Stop-motion collage: pieces cut in whole

`dv-stop-motion-collage` · signature · energy medium · launch, feature · primitive: Stepped.collage

About twenty scraps (torn paper, photos, etchings, handwriting, stickers) are born as cuts at full size, at a deliberately irregular cadence (15 pops a second on average, gaps 1-10 f); some are re-cut larger in 2-3 discrete steps (x1.8-2.1); a layered collage grows and lands on a stab; a sparse layout is replaced by a full collage in one frame and punctuated by a small push. **When:** Editorial, crafted, creator-economy films. **Avoid:** Fading or scaling pieces in; even cadence.

- **Anatomy:** Births as cuts; re-cuts 7-10 f after birth; camera steps on births; one slow push under the whole build (+30 % over 92 f).
- **Timing:** 22 events in 84 f; re-cut steps 7-10 f apart; growth 36 f.
- **Sound:** A free cadence, not beat-locked; an orchestral stab on the landing.
- **Build:** collage({ n, mean: 4, re-cuts, ghosts, camera }) inside `<Stepped fps={16}>`.
- **Materials and numbers:** Every tile lands as a flat colour block first: a solid pastel rectangle cuts on, and 2-6 f later the photo replaces it in exactly that rectangle (a hard swap, no cross-fade); some tiles never resolve; tile pops on the 8th-note hats.

### One composition rule per act

`dv-act-composition-rule` · workhorse · energy calm · any · primitive: recipe (plain layers)

An act keeps exactly one centred object on black for its whole length (a dot, a line, a triangle, a prism), then the next act flips to an off-centre cropped UI: the composition change marks the act change. **When:** Films with a construction act and a product act. **Avoid:** Mixing the two rules within one act.

- **Anatomy:** Centred single object vs off-centre crop.
- **Timing:** Acts of 2-3 s.
- **Sound:** A section change on the switch.
- **Build:** Recipe: a layout rule per act in the timeline.

### Hard split: image half, text half

`dv-hard-split-screen` · workhorse · energy calm · any · primitive: recipe (plain layers)

The frame divides vertically: one half a mockup or picture, the other half a ground with type; the image half can carry a stepped dithered border. **When:** Product plus claim, side by side. **Avoid:** Centred copy in the text half (left-align it).

- **Anatomy:** 50/50 split; cuts swap both halves together.
- **Timing:** About 95 f per pair.
- **Sound:** Cuts on beats.
- **Build:** Recipe: two AbsoluteFill halves with their own content.

### Grey problem pills, then blue benefit pills

`dv-problem-benefit-pills` · accent · energy calm · launch, feature · primitive: Cards

A grey wordmark with an OFF toggle and grey problem pills floating in from the corners; later the same layout in the brand colour with benefit pills floating in from three edges, mirroring it: the before and after share one layout. **When:** Problem/solution structures. **Avoid:** Changing the layout between the two states.

- **Anatomy:** Pills enter expo-out (52 % in 10 %) 300-400 px from edges and idle; grey vs accent.
- **Timing:** Pills 48-94 f each, 80-120 f apart.
- **Sound:** An uplifter sweep on the benefits.
- **Build:** Cards enterState from edges, same positions for both states, colour swapped.
- **Materials and numbers:** Benefit pills fade from the accent at their left end to a pale tint and almost white at their right end (stops 0 / 40 / 75 / 100 %), with a 1 px white inner highlight on the top edge and a soft white glow past their end, so each pill dissolves into the light.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Objects pop around a word at full size

`dv-pop-around-word` · accent · energy high · launch, feature · primitive: HardStep

Around a word or a stacked lockup, sticker objects, ad images or tilted app chips pop on at full size, no scale or fade, staggered by 1-4 frames (one settles 7 px), framing the word with context. **When:** Showing what a word covers (integrations, formats, uses). **Avoid:** More than about eight objects.

- **Anatomy:** Cut-ons at full size; tilts 5-15 deg; lines 2-3 f apart.
- **Timing:** 1 f each; 1-4 f stagger.
- **Sound:** Chat pops.
- **Build:** HardStep visibility per object, positions laid around the word's box.
- **Materials and numbers:** The chips pop exactly where the next words land, so for about 20 f the sentence is tangled with the logos (text over chips, no knockout; chips tilted -25 to +20 deg, white pills with a 1 px border at 6 % and a 6 % shadow); then the chips drift about 220 px upward on an expo-out and the line clears (cleared by 0.7 s).

### A set of physical objects as the film's vocabulary

`dv-object-vocabulary` · accent · energy calm · launch, feature · primitive: Cutouts

Logos become die-cut stickers with a white border and a soft shadow lying on a cutting mat; letters sit on square tiles that drift apart radially under a pull-back, each at its own speed. **When:** Tabletop, crafted films. **Avoid:** Mixing object styles.

- **Anatomy:** Sticker border 6-8 px, contact shadow; tiles about 70 px each with one letter.
- **Timing:** Static, or a radial drift over 36 f.
- **Sound:** None.
- **Build:** Cutouts with paper border; tiles as Cards with radial drift.

### Cards flick onto a pile

`dv-card-pile-on` · accent · energy medium · launch, feature · primitive: Cards

New photo cards pop onto the top of a fanned stack one after another, each starting small and motion-blurred, the cadence decaying until the cut; inside a framed screen, cards spin in toward level, pile up and orbit as a ring. **When:** Accumulation: saves, uploads, picks. **Avoid:** Even cadence.

- **Anatomy:** Arrival 6 f each; one card every 9-10 f, decaying; spin 10 f; orbit 100 f in two pushes.
- **Timing:** 60-110 f.
- **Sound:** A beat bed; a wood-block hit.
- **Build:** Cards cardArrive (rot, scale from 0.7) with starts on a decaying list.
- **Materials and numbers:** A new card is born inside the face of the current top card: small (35 % of a card) and heavily blurred (20 px for 2-4 f) over its right half, it grows and turns toward the viewer (yaw 15 -> 5 deg in perspective) and lands as the new top card with a soft drop shadow appearing; about 12 f per card, one every 24 f.

### Tiles in a mixed shape vocabulary

`dv-shape-vocabulary` · accent · energy calm · any · primitive: recipe (plain layers)

A layout uses a small set of shapes (circles, a rounded square, pills, photos with asymmetric corners), flat colour blocks mixed among photos, tinted photo cards, coloured tag chips and side accent bars, all cropped by the frame. **When:** Bento and collage layouts that should feel designed, not templated. **Avoid:** Every tile the same radius.

- **Anatomy:** Mixed radii (one corner fully round, others small); colour blocks 40-120 px.
- **Timing:** Static after the unfold; tags pop 4-8 f.
- **Sound:** Pops and a ding.
- **Build:** Recipe: per-tile border-radius arrays; colour blocks as Cards.
- **Materials and numbers:** Every frame device is drawn from the logo's parts before the logo appears: the photo mask, the hairline caption frames, the pair of circles and the blobs are the mark's rounded rect, its circular cut-out and its dot; a construction drawing shows the primitives with anchor nodes; the film resolves on their assembly.
