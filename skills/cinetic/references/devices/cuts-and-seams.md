# Cuts and seams

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

What crosses a cut: a velocity, an object, a scale step, a single designed frame. Every seam carries something.

[Pixel glint sprite on twos bridges a cut](#pixel-glint-sprite-on-twos-bridges-a-cut) · [Glitch run: distinct full-frame looks on twos](#glitch-run-distinct-full-frame-looks-on-twos) · [An object continues through the cut in a new role](#an-object-continues-through-the-cut-in-a-new-role) · [Over-exposed frame with a negative ghost](#over-exposed-frame-with-a-negative-ghost) · [Flat layout cuts into the same layout in the world](#flat-layout-cuts-into-the-same-layout-in-the-world) · [White blocks step, the last is the next object's silhouette](#white-blocks-step-the-last-is-the-next-object-s-silhouette) · [Three single frames with an inverted centre band](#three-single-frames-with-an-inverted-centre-band) · [Velocity handoff: cut on the fastest frame, next shot already moving](#velocity-handoff-cut-on-the-fastest-frame-next-shot-already-moving) · [Cut from a tight crop to the wide shot at the same world speed](#cut-from-a-tight-crop-to-the-wide-shot-at-the-same-world-speed) · [Cut tighter mid-move, same vector](#cut-tighter-mid-move-same-vector) · [Pixelate out and in on the beat](#pixelate-out-and-in-on-the-beat) · [Full blur straight into a near-static calm shot](#full-blur-straight-into-a-near-static-calm-shot) · [Scene burns out to white](#scene-burns-out-to-white) · [One block stamped into a plus of five](#one-block-stamped-into-a-plus-of-five) · [Cut through exactly one blank frame](#cut-through-exactly-one-blank-frame) · [Vertical drum swap with a heat and a tilt](#vertical-drum-swap-with-a-heat-and-a-tilt) · [Blur out to blank frames, then cut](#blur-out-to-blank-frames-then-cut) · [Line parts from the middle, layout swaps on frame three](#line-parts-from-the-middle-layout-swaps-on-frame-three) · [Next scene's tiles fly over the outgoing shot](#next-scene-s-tiles-fly-over-the-outgoing-shot) · [One panel at 2x for one frame](#one-panel-at-2x-for-one-frame) · [An empty beat before the logo](#an-empty-beat-before-the-logo) · [One or two inverted frames between shots](#one-or-two-inverted-frames-between-shots) · [Short fade through white between sections](#short-fade-through-white-between-sections)

### Pixel glint sprite on twos bridges a cut

`dv-glint-sprite-bridge` · signature · energy medium · launch, feature, sting · primitive: Glint

Right after a hard cut, a tiny cluster of 3-4 bright squares (about 66, 53 and 24 px) drops diagonally across the frame, changing its arrangement every 2 frames through six poses (diagonal triplet, tall bar + square + dot, wide block + tick, two bars + dot in an L, a long bar with dots above and below, a single square), then vanishes; the new scene rises behind it on ones while the stage flashes and decays. **When:** A cut that needs a bridge with character: from a send action to the result, into a new scene on a whip. **Avoid:** Glows on light grounds; using it more than twice per film.

- **Anatomy:** A pose table of rects in local px; the group travels a slightly accelerating path (about 34 px per pose); each square with a soft halo; stage glow to luma 36 then a decay over 30 f.
- **Timing:** 6 poses x 4 f at 60 fps (on twos at 30) = 24 f; path 340 px.
- **Sound:** A whip whoosh into the cut.
- **Build:** `<Glint at x y color>` (fx/Glint) on the first frame after the cut: six poses of 1-3 squares, a new pose every 4 f at 60 fps (on twos at 30), dropping down-right along a 330 px path; `flip` mirrors it; glintGlow(f, at) gives the stage flash (half gone in one 30 fps frame, then a 30 f tail).
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Glitch run: distinct full-frame looks on twos

`dv-glitch-state-run` · signature · energy high · launch, sting · primitive: no primitive yet (recipe below)

A break out of live action in four completely different full-frame looks, each held exactly two frames, alternating bright and dark: a ghost smear with channel split, a blue block mosaic with the subject inverted, a scan-line displacement tear, a black frame with the caption collapsed into a streak; or a posterised 1-bit capture flash for four frames that breaks up. **When:** Tearing the viewer from realism into the graphic world, once, on the end of a spoken phrase. **Avoid:** Calm films; more than once; gradual blending between states.

- **Anatomy:** States held 2 f each; luma high-low-high-low (139, 29, 117, 4); bands 10-40 px tall with seeded offsets.
- **Timing:** 4 states x 5 f (20 f); posterise 8 f + 4 f break.
- **Sound:** Starts on the end of the spoken phrase; a shutter hit on the capture.
- **Build:** Recipe: a sequencer of 2-frame looks, each its own layer: offset copies, a Pixelate block level, seeded horizontal strips, a black frame with a scaleY streak.

### An object continues through the cut in a new role

`dv-object-carries-cut` · signature · energy medium · any · primitive: camera-moves

One element keeps moving across a hard cut and changes role on the other side: an avatar accelerating upward becomes the small header of a chat; a mark keeps shrinking while the background cuts; a finished line keeps breathing apart through the cut; a prompt card drifts up and jumps (+10.5 %) into a sent message bubble. **When:** Linking two states of the product; the brand mark entering the product. **Avoid:** Changing the element's speed at the cut.

- **Anatomy:** Same screen position and speed on both sides (±20-30 px); scale may jump up to +10 % hidden by the cut.
- **Timing:** Pre-cut 15-42 f ease-in; post-cut 23-89 f.
- **Sound:** The cut on the beat (-27 ms); a footstep-like hit after.
- **Build:** handoffShot(carry: ['x','y','k']) with the element drawn in both shots at the matched place; declare a velocity seam.
- **Materials and numbers:** The logo icon survives the wipe: as a feathered white wipe erases the wordmark, the icon stays fully visible on top of the white for one frame, and on the next it is a small black glyph on a white tile already in its slot inside the new UI (a position jump of about 120 px).

### Over-exposed frame with a negative ghost

`dv-flash-ghost-cut` · signature · energy high · launch, feature, sting · primitive: FlashCut

After a whip on an ease-in, one frame at about 92 % white carries a blurred grey negative ghost of the outgoing object, then one dark streak frame, then the next shot sliding in. **When:** A whip transition on a swell's peak. **Avoid:** Calm films.

- **Anatomy:** Whip ease-in; flash 0.92 with a 0.3 ghost; one streak frame; slide in 28 f and pull back.
- **Timing:** Flash 2 f.
- **Sound:** On the swell peak.
- **Build:** `<FlashCut whip flash streak slide pull>`.

### Flat layout cuts into the same layout in the world

`dv-match-into-world` · signature · energy medium · launch, feature · primitive: camera-moves

A flat graphic layout pans (or the camera pushes toward a monitor) and cuts into real footage where the same layout is a street hoarding or the monitor's content full-frame: the design steps out into the world. **When:** Showing a design or a screen in use. **Avoid:** Without footage that matches the layout's geometry.

- **Anatomy:** Exit ease-in; the matched element at the same screen place on both sides; the cut can be silent.
- **Timing:** Pre 42 f; post 145 f.
- **Sound:** The cut on a beat with a boom; or a silent cut inside a silence.
- **Build:** zoomThrough to the monitor's box then handoffShot; for the hoarding, match the layout's corners with a matrix3d onto the footage.

### White blocks step, the last is the next object's silhouette

`dv-block-silhouette-step` · signature · energy high · launch, feature, sting · primitive: BlockStep

Hard white blocks one frame each: one over the title, a bigger one elsewhere, then a pure-white silhouette of the incoming page that greys down into it; or a word-sized white block that jumps between word slots on twos, replacing a cut. **When:** A hard beat with nothing to carry; swapping words in a ticker. **Avoid:** Glowing blocks in house films.

- **Anatomy:** Blocks grow from each other; the silhouette steps back 1, 0.66, 0.33, 0; the redaction block sits over old words 2 f, the new word 1 f, off its end 1 f.
- **Timing:** 3 x 2 f + a 6 f decay (12 f); redaction runs 8 f.
- **Sound:** A hit or speech on the silhouette; clicks on the block jumps.
- **Build:** `<BlockStep blocks silhouette>`; the redaction variant is BlockStep with blocks taken from the word boxes.
- **Materials and numbers:** The incoming page arrives as a pure white rectangle, then decays through grey to its real dark self one step a frame (white overlay opacity 1, 0.65, 0.35, 0, no easing between), landing on a VO syllable; a 2 px white rim light with a soft glow brightest at the bottom-left keeps the page's edge lit from below.

### Three single frames with an inverted centre band

`dv-inverted-band-separator` · signature · energy high · launch, loop · primitive: InvertBand

A loop resets through three one-frame images (the product UI, the key word huge, scattered tiles), each with its centre band (about 56 % of the width) colour-inverted while the outer strips stay normal; then the main shot returns. **When:** A loop separator; a beat between sections in a playful film. **Avoid:** More than once per loop.

- **Anatomy:** A fixed vertical band applying invert over three different sources, one frame each.
- **Timing:** 3 x 2 f; repeats every 104 f in a loop.
- **Sound:** None needed.
- **Build:** `<InvertBand at count={3} sources={[a, b, c]}>` (fx/Flashes): each source one beat (2 f at 60), with an inverted copy clipped to the centre 56 % band; every image a declared flash.

### Velocity handoff: cut on the fastest frame, next shot already moving

`dv-velocity-handoff-cut` · workhorse · energy medium · any · primitive: camera-moves

The outgoing shot accelerates (a push with roll, a whip, a rise, a zoom-out) and is cut on its fastest frame; the incoming shot opens moving the same way, at about half to one-and-a-half times that speed, and decelerates to rest. Every cut hands over a carrier: velocity, scale direction, shape or position. **When:** The default for every cut in a film. **Avoid:** Cutting between two parked frames; cutting into a move in the opposite direction.

- **Anatomy:** Exit ease-in over 4-29 f (about x1.13-1.3 a frame; a whip doubling each step); entry expo-out at 0.5-1.5x the exit speed (22-52 px/f on frame one), settling in 20-60 f; a 4 f pre-roll drift can announce the next shot's direction; a zoom can carry across (x0.963 in 7 f, the next shot still zooming and pulling focus).
- **Timing:** Exit 8-58 f; entry 20-72 f; cut speeds 15-200 px/f at 1080p.
- **Sound:** A whoosh, kick or pop on the cut (within ±30 ms of the beat); a water drop plus sub.
- **Build:** carriedCut()/handoffShot() from lib/handoff with scaleBreath, whip or punchOut; declare the seam.

### Cut from a tight crop to the wide shot at the same world speed

`dv-punch-out-cut` · workhorse · energy medium · any · primitive: camera-moves

A giant cropped word or detail drifts (accelerating), then a hard cut to the full composition, where the drift continues at the world's speed (screen speed divided by the scale); the data or the dots can keep filling across the cut. **When:** Opening on a detail; revealing a sentence or a chart after a close-up. **Avoid:** Changing direction at the cut.

- **Anatomy:** Crop 2.5-3.5x; drift quad-in to 3 px/f; post-cut decay circ-out 46 f over 12.6 px.
- **Timing:** Pre 18-28 f; post 46 f.
- **Sound:** A level swell (no onset needed); a vocal swell at the start.
- **Build:** punchOut({ crop: 3, drift }).

### Cut tighter mid-move, same vector

`dv-punch-in-cut` · workhorse · energy medium · any · primitive: camera-moves

A hard cut to a 1.16-2.5x closer framing of the same thing, inside a continuing move: the content keeps moving the same way and decelerates, or the close-up pulls back 9 % on a decay, or just creeps on; a jump cut can skip forward inside an expansion. **When:** Emphasis on a word, a field, a button while the action continues. **Avoid:** Cutting to the same scale (a jump cut that reads as a mistake).

- **Anatomy:** Scale step 1.16-2.5x on the cut; the motion vector continues; decay or creep after; two one-frame punch-ins can coexist with two marker sets.
- **Timing:** Settle 30-70 f (34 % in the first 10 %); creep 0.4-0.6 %/f.
- **Sound:** On the beat (+40 ms) or a keypress just before.
- **Build:** handoffShot with a scale factor (carry x, y); SnapZoom with pre: 0 for the one-frame version.

### Pixelate out and in on the beat

`dv-pixelate-beat` · accent · energy high · launch, feature, sting · primitive: Pixelate

The outgoing frame turns into a mosaic whose blocks grow from 6 to 160 px (42 % of the change in the last frame), cut, and the incoming frame starts coarse and resolves. **When:** A downbeat cut; image or AI products. **Avoid:** More than once per act.

- **Anatomy:** Log-scale block growth, soft block edges, cut on the downbeat.
- **Timing:** Out 8 f, in 11 f (about 0.3 s).
- **Sound:** The cut 13 ms before the downbeat; an orchestral stab.
- **Build:** `<Pixelate cut out in>`.

### Full blur straight into a near-static calm shot

`dv-speed-contrast-cut` · accent · energy high · launch, feature · primitive: camera-moves

From a 6800 px/s smear on white, cut straight to a calm, sharp, full-bleed landscape with a small tagline; the frame before the blur cut can show the outgoing scene sharp in an earlier position, a frozen anchor before the smear. **When:** Contrast between product speed and a calm promise. **Avoid:** Blending the two speeds.

- **Anatomy:** Blur at peak speed on the last frames; one sharp anchor frame; the calm shot barely moving.
- **Timing:** Cut on the grid (+120 ms vs the beat).
- **Sound:** The blur's whoosh cut dead by the calm shot.
- **Build:** Scroll or whip at peak speed with the blur pass on its frames, cut to a Photo with a 0.3 px/f drift.

### Scene burns out to white

`dv-burn-to-white` · accent · energy high · launch, sting · primitive: Exposure

The scene over-exposes into white: a bloom ring grows while tiles fly at the camera, a collage's contrast collapses through stepped tints, or a whip pan washes to white, then a hard cut to a white page. **When:** Into a white end section; the loudest moment. **Avoid:** Tinted burns outside the brand colour.

- **Anatomy:** Luma 173-189 -> 234-237 over 5-16 f; tints stepped every 2-3 f.
- **Timing:** 30-40 f ramp.
- **Sound:** The loudest moment with a crack or uplifter; a whoosh.
- **Build:** `<Exposure>` with up = the ramp and swap at the peak, hue white.
- **Ban-safe default:** The burn is white or a pale tint of the accent only. (the full look relies on orange; use it only when the brand supplies it)

### One block stamped into a plus of five

`dv-stamp-replicate` · accent · energy high · launch, feature · primitive: HardStep

On one frame the loader block is replicated into a plus of five blocks (each in a different phase of its animation) at 58 % scale, which then pulse smaller twice. **When:** A loader or icon multiplying into many. **Avoid:** Without a loop-able element to replicate.

- **Anatomy:** One-frame stamp; pulses -15 % then -11 % expo-out.
- **Timing:** Stamp 1 f; pulses 22 f each.
- **Sound:** An orchestral stab (+10 ms).
- **Build:** HardStep the copies on one frame; each copy's animation offset by a phase.

### Cut through exactly one blank frame

`dv-one-blank-frame` · accent · energy calm · any · primitive: blackDipState

A hard cut through exactly one empty frame (black, pure white, or the brand's background colour) separates two sections like a breath. **When:** Between story and finale; a section break inside a voice-led film. **Avoid:** More than one per minute; two frames (that reads as a glitch).

- **Anatomy:** One full frame of a flat colour.
- **Timing:** 1 f at the film rate (2-3 f at 60 fps).
- **Sound:** Between voice words, or a shutter click and a drum just after.
- **Build:** blackDipState({ black: 1, fadeUp: 0 }) or a one-frame flat Sequence.
- **Materials and numbers:** A panel can start from one empty frame of its ground (2 f) before the first block, again before a loop restart.

### Vertical drum swap with a heat and a tilt

`dv-drum-swap` · accent · energy medium · launch, feature · primitive: MaskRise

Before each swap the word heats in colour, tilts away like a drum face and exits up while the next word (or icon tile) enters from below; the last one flattens and exits. **When:** A list of sources or places in one sentence ("from Phone / Folders / Drives"). **Avoid:** More than three swaps.

- **Anatomy:** Heat 23 f, rotateX tilt on exit, entry from below.
- **Timing:** Heat 23 f; exit 20 f; entry 23-25 f; final flatten 10 f.
- **Sound:** Plucks on the swaps; a shutter on the last.
- **Build:** MaskRise in + an exit with rotateX(-60deg) and rise; colour via HueSweep back.

### Blur out to blank frames, then cut

`dv-defocus-blank-cut` · accent · energy calm · any · primitive: DefocusCut

The grid goes fully out of focus for 3 frames, then 2 empty light frames, then the next shot; blanks can follow the next shot too. **When:** A soft change of subject on a light stage. **Avoid:** Blank frames on a dark film (they read as drops).

- **Anatomy:** Blur ramp, empty frames, cut.
- **Timing:** 6 f blur + 4 f blank at 60 fps.
- **Sound:** None.
- **Build:** `<DefocusCut out empty={2}>`.

### Line parts from the middle, layout swaps on frame three

`dv-line-split-swap` · accent · energy high · launch, feature · primitive: doorSplitState

The two halves of a title move apart from the middle (7 px, then 31-38 px) and on the third frame the whole layout is replaced. **When:** A quick change of scene from a centred title. **Avoid:** Long splits (the swap must come early).

- **Anatomy:** Ease-in split; swap on frame 3.
- **Timing:** 6 f at 60 fps.
- **Sound:** An orchestral stab.
- **Build:** doorSplitState on the title layer only, swap on its third frame.

### Next scene's tiles fly over the outgoing shot

`dv-overlap-tiles-cut` · accent · energy medium · launch, feature · primitive: Cards

Tiles of the next scene fly into the frame over the outgoing card a few frames before the cut; or the old panels hold 1-3 frames over the new photo, then blank tiles re-tile into the new layout and fill. **When:** Grid-based films; image-led sequences. **Avoid:** Tiles that do not belong to the next scene.

- **Anatomy:** Tiles settle expo (34 % on the first moving frame); overlap 4 f; re-tile 12 f, fill 12-20 f.
- **Timing:** 38-108 f.
- **Sound:** An onset at the tiles; speech then a glockenspiel.
- **Build:** Cards enterState per tile starting 8 f before the cut; HardStep holds for the overlap.

### One panel at 2x for one frame

`dv-overscale-bridge-frame` · accent · energy high · launch, feature · primitive: HardStep

From a four-quadrant grid, all quadrants make their last move and on the final frame one quadrant fills the frame at 2x for exactly one frame, then a hard cut. **When:** Leaving a grid of shots. **Avoid:** More than one frame.

- **Anatomy:** A one-frame full-frame of one cell, scaled 2x.
- **Timing:** 1 f.
- **Sound:** None needed.
- **Build:** HardStep the cell's scale to frame size for one frame.

### An empty beat before the logo

`dv-empty-beat` · accent · energy calm · launch, sting · primitive: recipe (plain layers)

After the last phrase blurs out, the frame stays empty (just the ground and its light) for about three quarters of a second before the logo arrives. **When:** Before the end card. **Avoid:** Longer than about 1 s; a dead black frame without the ground's light.

- **Anatomy:** Ground only, light field alive.
- **Timing:** 45 f at 60 fps.
- **Sound:** Quiet.
- **Build:** A gap in the timeline with the LightField still running.

### One or two inverted frames between shots

`dv-inverted-flash-frame` · accent · energy high · launch, sting · primitive: HardStep

Between two shots, one frame of the scene (or two frames of the key word) appears with its colours inverted: black type on the accent, white on black. **When:** Punctuation between scenes; flashing the key word. **Avoid:** Long flashes; more than two per film.

- **Anatomy:** Inverted colours on one or two frames; the key word alone, centred.
- **Timing:** 1-2 f at the film rate.
- **Sound:** A chat pop.
- **Build:** HardStep a one-frame layer with filter invert(1) (or a pre-built inverted card).
- **Materials and numbers:** The flash frame can already carry the next scene's geometry (a dashed circle split by a line, two faint perspective lines) that only arrives seconds later: a seed planted in 4 f.

### Short fade through white between sections

`dv-white-dip-fade` · accent · energy calm · any · primitive: blackDipState

Section changes on a white ground use quick fades through white (10-28 f at 60 fps). **When:** Light-ground films. **Avoid:** Dark grounds (use a cut).

- **Anatomy:** Opacity dip to the white ground and back.
- **Timing:** 10-28 f.
- **Sound:** Often a ding or a pluck.
- **Build:** blackDipState with the ground colour white and fadeUp 8-14 f.
