# Cursor

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

The cursor is a hand: it glides, dwells, presses, drags and leaves once the product acts on its own.

[The cursor as a character](#the-cursor-as-a-character) · [Cursor glides in, dwells, then clicks](#cursor-glides-in-dwells-then-clicks) · [Cursor drags an object into place](#cursor-drags-an-object-into-place) · [The cursor leaves in flight once the product acts](#the-cursor-leaves-in-flight-once-the-product-acts) · [A pointer glyph turns to aim, then moves](#a-pointer-glyph-turns-to-aim-then-moves) · [Hover states fire along the cursor's path](#hover-states-fire-along-the-cursor-s-path)

### The cursor as a character

`dv-cursor-as-character` · signature · energy medium · launch, feature · primitive: Cursor

An oversized cursor (8-12 % of the frame height) with its own look lives in the shot: it banks into its motion within 2 frames, a thick 3D cursor half-spins about its axis and is edge-on at peak speed, a glossy cursor idles with slow decelerating drifts between clicks, an outlined cursor swings upright as it lands and morphs into an I-beam. **When:** Launch films where the product is used by "you". **Avoid:** Multiple cursor styles in one film.

- **Anatomy:** Size 120-170 px; bank = f(velocity); swing from -60 deg to upright over 3 f; idle drift 10 -> 0 px/f.
- **Timing:** Travel 40-52 f (peak 50-80 px/f at about 50 %); swing 8 f.
- **Sound:** Mouse clicks.
- **Build:** `<Cursor shape scale shadow="cast">` with cursorTilt (swing) and a shape switch to ibeam.
- **Materials and numbers:** A glossy 3D cursor (matte white body, a warm bevel gradient, soft drop shadow) rests on the first letter of a line, then rises and passes behind it for 6 f: the letter is drawn over the cursor's tip, as if the cursor were an object moving between layers of type.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Cursor glides in, dwells, then clicks

`dv-cursor-glide-dwell-click` · workhorse · energy calm · any · primitive: Cursor

The cursor enters (often rising from below), decelerates onto its target, rests 5-8 frames, then clicks; the button darkens for a few frames; the card or the camera can start pulling back or pushing in right after the press; or the cursor simply cuts on already over the button and presses. **When:** Every click in a demo. **Avoid:** Clicking on arrival with no dwell.

- **Anatomy:** Travel 22-44 f on an ease-out (172 px in 22 f), dwell 10-16 f, press 6-12 f; macro variant: a hand pressing a cropped send button in close-up.
- **Timing:** 40-70 f per click.
- **Sound:** A click on the press; a kick on the following cut.
- **Build:** cursorState({ moves, click }) + press() on the target.

### Cursor drags an object into place

`dv-cursor-drag` · workhorse · energy medium · any · primitive: Cursor

A grab-hand cursor drags a value cell (tilted about 15 deg, straightening as it drops), a folder into a grid, or a dashed selection marquee across a collage; the hand can squash +33 % on contact and relax. **When:** Drag-and-drop features; selections. **Avoid:** Dragged objects that do not tilt or lag (they look glued).

- **Anatomy:** Object tilt -15 deg -> 0 on drop; drag expo-out; contact pop 3 f, relax 6 f.
- **Timing:** Drag 26-42 f; drop 8 f.
- **Sound:** A drum on the drop.
- **Build:** cursorMove with the dragged object attached by a lagged spring (one per film) or a short delay.

### The cursor leaves in flight once the product acts

`dv-cursor-exit-flight` · workhorse · energy medium · any · primitive: Cursor

After its click the cursor does not fade: it accelerates off the frame on a quad- or expo-in, banking upright as it goes (3 -> 270 px/f); or it travels to the next button, presses, and drifts off. **When:** After the last click of a demo moment. **Avoid:** Fading the cursor; leaving it parked on screen.

- **Anatomy:** Exit speed x1.3-1.9 a frame; bank follows velocity.
- **Timing:** 14-22 f.
- **Sound:** An impact as the last button is pressed.
- **Build:** cursorMove with an exit move on E.buildIn off-frame.
- **Materials and numbers:** After the click the cursor does not just translate: it turns about 200 deg in 10 f (peak about 20 deg/f, expo-out) while it accelerates off the top-right like a flicked paper plane; no motion blur, so the turn reads as a run of poses.

### A pointer glyph turns to aim, then moves

`dv-pointer-glyph-aims` · accent · energy calm · launch, feature · primitive: Cursor

A small pointer shape (a paper plane, a triangle) first rotates to aim at its target, then travels; a tiny pointer drifts in an empty cell and the target appears exactly where it stops; a filled pointer glides into a vacated slot. **When:** Illustrative, non-literal UI films. **Avoid:** Pointers that move before they aim.

- **Anatomy:** Rotate 30-90 deg over 16-20 f ease-out, then rise or glide; drift 2-4 px/f.
- **Timing:** 30-50 f.
- **Sound:** None needed.
- **Build:** `<Cursor shape="plane">` (a glossy paper plane, a rim in the accent's lightness ramp under its long edge, a soft cast shadow) or `shape="glassTri"` (a rounded triangle, ink at 55 % with a thick white outline, readable over a photograph), with cursorTilt then cursorMove.
- **Materials and numbers:** Letter tiles in the pointer's path flip in 3D: a tile goes edge-on (a 4-6 px parallelogram) in about 4 f, starting 2-4 f before the pointer reaches it, a flipped tile shows its letter mirrored; the cut lands before the flip completes.

### Hover states fire along the cursor's path

`dv-hover-trail` · accent · energy calm · any · primitive: Cursor

The cursor sweeps up in one expo-out and every row it passes gets a hover outline for a few frames; a hover on an icon brings a small tooltip; a cursor wanders between the input and cards while the UI eases back. **When:** Showing that a UI is alive and responsive. **Avoid:** Hover states lasting longer than the pass.

- **Anatomy:** Hover 6-8 f per row; tooltip hold 28 f.
- **Timing:** Sweep 52 f (44 % in 10 %).
- **Sound:** A whoosh as it enters.
- **Build:** cursorState + per-element hover flags from the cursor's position at each frame.
