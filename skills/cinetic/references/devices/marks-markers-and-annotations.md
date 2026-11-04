# Marks, markers and annotations

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Small marks that point: corner squares, brackets, selection boxes, pen strokes, highlight blocks, rings. They are the cheapest way to make a frame feel designed and alive, and the easiest to overuse: one system per film. A mark round a word (a box, a marker bar, a pill, an underline, a knockout) is a film's one declared signature, on one line at most; a film's everyday emphasis is the accent colour on at most 60 % of its lines (`fx/TypeEmphasis` `filmEmphasis`), never a decoration on every line.

[Four tiny corner squares that blink and jump](#four-tiny-corner-squares-that-blink-and-jump) · [Markers travel as echo bars and stretch ahead of the cut](#markers-travel-as-echo-bars-and-stretch-ahead-of-the-cut) · [Marker-pen strokes write on, slash and erase](#marker-pen-strokes-write-on-slash-and-erase) · [L-brackets frame a word and shrink-wrap it](#l-brackets-frame-a-word-and-shrink-wrap-it) · [Design-tool selection box snaps to each word](#design-tool-selection-box-snaps-to-each-word) · [Keyword sits in a highlight block or pill](#keyword-sits-in-a-highlight-block-or-pill) · [Connector lines draw from one element to the next](#connector-lines-draw-from-one-element-to-the-next) · [Thin pen lines circle, underline and point](#thin-pen-lines-circle-underline-and-point) · [Corner swatches take their colour from the picture](#corner-swatches-take-their-colour-from-the-picture) · [A ring draws around the subject, then ripples](#a-ring-draws-around-the-subject-then-ripples) · [Tracking squares jump over a crowd every frame](#tracking-squares-jump-over-a-crowd-every-frame) · [Corner dots bracket the line; one pops big on entry](#corner-dots-bracket-the-line-one-pops-big-on-entry) · [Rings ripple out from a click or a pill](#rings-ripple-out-from-a-click-or-a-pill) · [Thin outline shapes frame a caption on a photo](#thin-outline-shapes-frame-a-caption-on-a-photo) · [Arrows shoot outward on a swap](#arrows-shoot-outward-on-a-swap)

### Four tiny corner squares that blink and jump

`dv-corner-squares-blink` · signature · energy medium · any · primitive: Corners

Four small squares (14-25 px, slightly rounded, grey or ink) mark the corners of an invisible box around the current words. Each corner blinks on and off on its own uneven rhythm (on 1-8 f, off 1-6 f, rarely all four together), and the box never tweens: it jumps to new extents on word onsets (sometimes 3 f before a long word, so the frame is ready), often larger than the text; markers can each teleport on their own frame (1-6 f apart) along a layout grid, blink for a few frames after arriving, glide with the line's re-centre instead, or linger and blink alone after the phrase is gone. **When:** A text-led opener or a calm statement that needs a living, technical frame; pointing at a word or a figure; any film with a tool or precision idea. **Avoid:** Glow on the squares; tweening the box; markers on every line of a film (one act).

- **Anatomy:** Corner rects at the box corners (inside the box), visibility from a seeded run-length pattern per corner (about 50-60 % on); box from a keyed table on onsets; optional per-marker jump order (TR, TL, BR, BL); optional glide on the re-centre curve with single-corner drop-outs of 1-3 f.
- **Timing:** Box steps on word onsets (or 6 f early at 60 fps); blink runs on 2-16 f, off 2-12 f at 60 fps; marker stagger 2-12 f; linger 15 f after the text.
- **Sound:** None of its own, or ticks and hi-hats on the word steps; silence during the hold.
- **Build:** `<Corners boxes onsets end color size={22}>` (fx/Corners): per-corner seeded blinks (short 2-4 f flickers and 12-34 f holds, off 2-8 f), per-corner jump stagger (house TR 0, TL 2, BL 8, BR 9 f), boxes on word onsets (2-6 f early for a long word), `end` + `linger` (15 f); `mode="glide"` follows a re-centre on E.jump; cornerFrames() lists every jump for ticks.

### Markers travel as echo bars and stretch ahead of the cut

`dv-marker-echo-bars` · signature · energy medium · launch, feature, sting · primitive: Markers / Corners

When the target changes, each corner marker is drawn for a step as 2-3 short bars along its path (a stepped motion trail whose width is the speed), jumps 35-70 % of the way, then settles into a square; in the last 3-5 frames of a card the squares stretch into bars reaching toward where the next card's corners will be; brackets on a closing line chase its edges the same way. **When:** Fast cut sequences of words or cards; replacing motion blur with a graphic trail. **Avoid:** Smooth tweens between targets.

- **Anatomy:** Echo split into lead + gap + echo when a stretch exceeds 3 markers; anticipation stretch 20 -> 28-43 px on an ease-in toward the next corner.
- **Timing:** 15-23 f per move at 60 fps (1-1.6 f hold, expo tau 0.8-1.5 f, 90 % at +5 f); anticipation 8-13 f before the cut.
- **Sound:** Cuts on kicks; the music can drop out under the closing line.
- **Build:** `<Markers echo>` (16 fps clock, jump 0.83, lead 0.38, trail 0.315) moves all four as one; `<Corners mode="jump" anticipate={{ frames: 10 }}>` (fx/Corners) is the per-corner version: 55 % on the jump frame, an exponential settle (tau 2.5 f), three echo bars along the path on the first 3 f, and a stretch reaching 40 % of the way toward the next box on the frame before.

### Marker-pen strokes write on, slash and erase

`dv-marker-pen-annotation` · signature · energy medium · launch, feature, vertical · primitive: PenStroke

Hand-drawn marker strokes in one bright colour (about 30 px, rounded) write on over the type: a big X slashes a word, holds and erases top-down; a zigzag arrow starts as a dot and draws through the line; an underline writes right to left and erases in drawing order across a cut; small arrows write and erase between words, overlapping; a dashed arrow writes dash by dash; doodles are cut mid-erase. **When:** Opinionated copy (crossing out the old way); playful launches; timelines. **Avoid:** Neat vector strokes (it must look drawn); more than one colour.

- **Anatomy:** Stroke draw-on at pen speed with an ease-in-out; erase as a second draw-off in drawing order; X = two strokes, the second starting as the first ends; dash-by-dash reveal.
- **Timing:** Write 17-22 f; hold 8-10 f; erase 12-22 f; an X in 17 f with most of it in 5 f.
- **Sound:** A kick on the slash; bubble pops on the underline; an onset on the X.
- **Build:** `<PenStroke at d={penPaths.x(box).d} color width={30}>` (fx/PenStroke): strokes share one pen (write 20 f on E.stdInOut, split by length; `sequence="chain"` makes the X's second stroke start as the first ends: 61 % of it in 5 of 17 f), hold 8 f, erase in drawing order (16 f) or `erase={{ order: "reverse" }}`; penPaths: underline (rtl), x, ring, arrow, zigzag; `dash={{ n }}` writes dash by dash; penEraseShare() to cut a doodle mid-erase. Recipe: a fixed-seed fractal-noise displacement (baseFrequency 0.18, scale 5) on the stroke, so the edge never boils.
- **Materials and numbers:** Marker strokes have dry, fibrous edges (plus or minus 2-3 px of edge noise at about 1/6 px frequency), round blobby caps 1.1x the stroke width, small width changes along the stroke, a flat fill and no transparency: they sit opaque over black or white letters.

### L-brackets frame a word and shrink-wrap it

`dv-bracket-shrink-wrap` · workhorse · energy medium · any · primitive: Markers

Thin L-shaped corner brackets (top-right and bottom-left, or top-left and bottom-right) frame a word and shrink-wrap it as it changes; on a swap they retract their arms to bare bars and regrow on the opposite corners; tiny L ticks ride along with every copy of a line; small link chips framed by brackets flicker at the frame edges. **When:** Framing the key word; technical, precise brands. **Avoid:** Thick brackets; all four corners (two diagonal ones read better).

- **Anatomy:** 2 px strokes, arms 35-60 px; shrink 221 -> fit; follow swaps with a 14 f cubic-out; retract 8 f, bars 4 f, regrow 6 f.
- **Timing:** Shrink 38 f quad-out; follow 14 f; flicker 4-8 f.
- **Sound:** With pops or kicks.
- **Build:** Markers with corners ['tr','bl'] drawn as L strokes (two thin rects per corner), mode 'glide'.

### Design-tool selection box snaps to each word

`dv-selection-box-snap` · workhorse · energy medium · any · primitive: HardStep

A caption sits inside a thin selection rectangle with small square handles at its corners; each appended word snaps the box to the new width in one frame; a square frame with corner nodes and full-frame crosshair hairlines grows around a hero; new card corners start as long diagonal strokes and collapse into square handles. **When:** Design, editing or creation tools; pointing at a hero object. **Avoid:** Easing the box (it is a tool, it snaps).

- **Anatomy:** 1-2 px rect, 8-12 px handles; snap per word; crosshair hairlines across the frame; diagonal strokes collapsing with tau about 1 f.
- **Timing:** Snaps 8-15 f apart; frame grows 10 f; collapse 23 f.
- **Sound:** Voice; a cut and voice for the hero frame.
- **Build:** snapBox() from HardStep for the rect; handles as Markers with jump 1.

### Keyword sits in a highlight block or pill

`dv-keyword-highlight` · signature · energy calm · any · primitive: Words

The keyword rises into a soft rounded highlight block of the accent that then wipes off, turns the accent in 2 frames, pops in a solid accent pill (62 % -> 100 % in 2 frames), or a pale card appears behind the key comment while the scroll settles; a mention is a tinted chip; two small accent ticks point at the selected row. **When:** The one word or item that matters in a film, as its declared signature (one line). **Avoid:** A block or pill on more than one line of a film; more than one word per line.

- **Anatomy:** Block with a soft edge (about 25 px feather) sized to the word; rise 6 f, hold 10 f, wipe 12 f; pill pop 2 f linear.
- **Timing:** 4-40 f.
- **Sound:** The voice on the keyword; a shutter click.
- **Build:** Words accentOn + a rounded rect behind the word (measured under FontGate) with a Wipe exit; pill pop via Oversize from 0.62 in 2 f.

### Connector lines draw from one element to the next

`dv-connector-draw` · workhorse · energy calm · any · primitive: Stepped.strokeDrawn

A straight line grows down from a title to a new note while a curved line grows from an icon, one frame apart, so the new element is visibly connected to what made it. **When:** Showing relations: a source to a result, a step to the next. **Avoid:** Lines that draw after the element has settled.

- **Anatomy:** 2 px lines, linear-ish growth, 1 f offset between lines.
- **Timing:** 8-12 f each.
- **Sound:** None.
- **Build:** SVG paths with strokeDrawn() or a linear dash tween.
- **Materials and numbers:** Lines start as single dots: a small round dot appears where the line will start and holds 10 f, stretches slowly into a dash (8 f), then draws fast to its end (14 f) while the camera pans; a line drawn out of a node keeps a fixed amount of ink, so it thins as it lengthens (width = 80 / length clamped to 1-4 px). A leftover arc can leave by retracting from its start toward the frame edge (34 f, ease-in) while the next word decodes.

### Thin pen lines circle, underline and point

`dv-pen-line-annotation` · accent · energy calm · any · primitive: Stepped.strokeDrawn

A thin hand-drawn line annotates: an ellipse draws around a word while the word types (a short dash appears 4 f before at the ellipse's start); a loop circles a word or a dot; a curved arrow swings into a dot and retracts; a wavy underline appears under a new word on twos; a closed contour draws at constant pen speed; a thin ellipse orbits a photo. **When:** Circling the key word; pointing at the subject; editorial and voice-led films. **Avoid:** Perfect geometric circles (that is a ring, not a pen).

- **Anatomy:** 1.5-3 px strokes, slightly irregular; pen speed about 65 px/f at 60 fps, slower at corners; on twos for a hand feel.
- **Timing:** Ellipse 28 f with the word; loops 20-25 f; underline 5 f in two steps; arrow draw 10 f, hold 15 f, retract 10 f.
- **Sound:** A paper rustle; none for most.
- **Build:** SVG path + strokeDrawn() at constant pen speed (65 px a frame), inside `<Stepped on={2}>` for the hand feel.
- **Materials and numbers:** A rising zigzag trend line scribbles through a big number (three segments, ending in an arrowhead past the last digit, 30 f expo-out, arrowhead on the last frame) and holds until the stat breaks apart. Annotations leave as the hero changes state, not after: the loop and arrow un-draw in 2 steps over 4 f.

### Corner swatches take their colour from the picture

`dv-palette-corner-swatches` · accent · energy medium · launch, feature · primitive: Corners

Four flat 20 px squares frame a word like crop marks, and on every card they take new colours picked from that card's image. **When:** Word cards over changing imagery; a film about images or design. **Avoid:** Colours that clash with the house accent (pick from the image's own palette).

- **Anatomy:** Corner marks as palette chips; recolour on the cut frame.
- **Timing:** Recolour 0 f on each cut; cards 20-30 f.
- **Sound:** None.
- **Build:** `<Corners colors={[[tl, tr, bl, br], ...]}>` (fx/Corners): per box, per corner colours picked from each card's image, swapped on the cut (the box changes on its onset).

### A ring draws around the subject, then ripples

`dv-ring-draw-around` · accent · energy medium · launch, sting · primitive: Stepped.strokeDrawn

A thin ring draws clockwise around a caption on twos (60 % of the sweep in the first 4 frames), or a clean ring snaps on around a scribble and a second, larger ring appears and fades as a ripple. **When:** Marking a point of interest in a voice-led graphic film. **Avoid:** Glowing rings in house films.

- **Anatomy:** Ring radius about 370 px or 110-150 px; draw on an ease-out; ripple ring 4 f.
- **Timing:** Draw 25 f on twos; ripple 10 f.
- **Sound:** A breath or a short vocal sound.
- **Build:** SVG circle with dash offset (E.snapOut) on twos; the ripple a second circle scaling and fading.
- **Materials and numbers:** The ring is born as a tiny comet dash: a 20 px glowing dash with a colour fringe across it appears up-left of the caption for 4 f, then jumps to an 85 deg arc and keeps drawing clockwise into the full ring (on twos). The halo can be a thick translucent glass ring (about 16 px wide, a pale tint at 35 %, a brighter 2 px inner edge, a 12 px outer bloom) with a fainter second ring outside, which turns into a dark shadow ring (10 px at 80 -> 15 %) as the dot becomes a solid disc.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Tracking squares jump over a crowd every frame

`dv-tracking-marker-flicker` · accent · energy high · launch, feature · primitive: recipe (plain layers)

Small squares and arrow glyphs pop on random people in a crowd, repositioned every frame (1, 12, 5 per frame), like a tracker searching, then lock on one. **When:** Detection, targeting, finding the one. **Avoid:** Calm films.

- **Anatomy:** Seeded positions per frame; count varies per frame.
- **Timing:** 28 f at 60 fps, new positions every frame.
- **Sound:** None needed.
- **Build:** Recipe: a seeded table of positions per frame over a list of head positions; HardStep visibility.

### Corner dots bracket the line; one pops big on entry

`dv-corner-dots-pop-breathe` · accent · energy calm · any · primitive: Corners

Four tiny squares (8-10 px) mark the corners of a text block; one corner pops in as a large blob and shrinks to size, and the dots drift outward as the line grows; reused for each new line. **When:** A system of brackets across a whole film's copy. **Avoid:** Large dots that compete with the type.

- **Anatomy:** Pop 64 x 52 -> 33 x 22 px; drift about 4 px/f following the text box with a lag.
- **Timing:** Pop settle 18 f; drift continuous.
- **Sound:** With the title.
- **Build:** `<Corners size={9} mode="glide" pop={{ corner: 'tr', from: 2.5, frames: 18 }}>` (fx/Corners): one corner enters oversized and settles on M.oversize; the others follow the growing line on E.jump.

### Rings ripple out from a click or a pill

`dv-ripple-rings` · accent · energy calm · any · primitive: Ripple

Rings expand from a click point or from around a pill, one after another in decreasing greys, each fading as it grows; or one large soft ring expands from the cursor. **When:** Calling attention to a control; a broadcast or connect moment. **Avoid:** Glowing gradient rings in house films.

- **Anatomy:** Stadium rings matching the pill's shape, launched every 10 f, each 10 f quad-out; greys stepping darker.
- **Timing:** 10-14 f per ring.
- **Sound:** A click or a hit.
- **Build:** `<Ripple at rings={3} every={10} shape={{ w, h, r }}>` (fx/MicroUI): rings in the control's own shape (a stadium for a pill) launched 10 f apart, each 12 f and a step lighter.
- **Materials and numbers:** Filled tonal rings in stepped greys (four steps from light to near the ground) grow outward one after another, about 6 f apart, their outlines wobbling like jelly (a 4-6 px offset of the new ring for 2-4 f) before settling into a three-step tonal halo.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Thin outline shapes frame a caption on a photo

`dv-outline-shape-frames` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

White 1-2 px outlines (a circle overlapping a rounded rectangle, a huge thin circle, a pill) sit centred on photos around a small one-word caption, contracting 5 % around it or sliding in, while the photo pushes. **When:** Photo-led films with short captions. **Avoid:** Thick strokes; outlines that touch the subject's face.

- **Anatomy:** Outlines contract on expo-out (peak 10 px/f) or slide in (60 px/f first frame) or expand circ-out.
- **Timing:** 16-22 f; captions fade 10 f.
- **Sound:** Kicks and a whoosh on the cuts.
- **Build:** Recipe: SVG outlines centred on the caption with E.snapOut scale; Photo push under them.
- **Materials and numbers:** On live footage a thin white outline circle (about 420 px) or stadium sits off-centre and the phrase assembles word by word inside it, each word fading from grey to white about 10 f apart, overlapping the subjects with no backing.

### Arrows shoot outward on a swap

`dv-swap-arrows` · accent · energy medium · launch, feature · primitive: recipe (plain layers)

On the swap frame, thin light arrows appear at both ends of a phrase and travel outward (170 and 250 px) and fade, like the phrase pushing outward. **When:** A phrase that expands in meaning (more, wider, everywhere). **Avoid:** Arrows on every swap.

- **Anatomy:** Two arrows, power-out travel, fade in-out.
- **Timing:** Left 26 f, right 48 f; fade 34 f.
- **Sound:** The big hit.
- **Build:** Recipe: two small SVG arrows translated on E.snapOut with an opacity hump.
