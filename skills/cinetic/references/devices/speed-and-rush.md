# Speed and rush

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Speed made visible: geometric acceleration into a cut, conveyors of cards, graphic smear frames, speed lines, real blur where it belongs.

[Dragged paint as a pixel mosaic trailing the cursor](#dragged-paint-as-a-pixel-mosaic-trailing-the-cursor) · [Rush: geometric acceleration into the cut](#rush-geometric-acceleration-into-the-cut) · [Real motion blur on fast moves, defocus on snaps](#real-motion-blur-on-fast-moves-defocus-on-snaps) · [Footage speed-ramped, joined on its blurred peaks](#footage-speed-ramped-joined-on-its-blurred-peaks) · [Things burst outward from the centre](#things-burst-outward-from-the-centre) · [Thin speed lines while velocity is high](#thin-speed-lines-while-velocity-is-high) · [Motion blur drawn as a few visible copies](#motion-blur-drawn-as-a-few-visible-copies) · [Tile wall whips in with per-tile parallax](#tile-wall-whips-in-with-per-tile-parallax) · [Two frames of streaks with stripe artefacts](#two-frames-of-streaks-with-stripe-artefacts) · [Graphic smear frames instead of motion blur](#graphic-smear-frames-instead-of-motion-blur)

### Dragged paint as a pixel mosaic trailing the cursor

`dv-mosaic-paint-trail` · signature · energy medium · launch, feature · primitive: no primitive yet (recipe below)

A blob of the accent rendered in 15-20 px mosaic blocks trails behind the cursor like dragged paint, growing, its tail lagging about 10 frames, then retracting. **When:** Drawing, painting, brushing tools. **Avoid:** Smooth gradients for the trail (the mosaic is the look).

- **Anatomy:** Trail sampled from the cursor path over the last 10 f, rasterised to a block grid.
- **Timing:** 44 f; retract 35 px/f.
- **Sound:** None needed.
- **Build:** Recipe: the cursor path (closed form) sampled back in time, each sample stamping blocks of a grid.
- **Materials and numbers:** The trail is a row of stamped copies of one rounded blob along the path, each older stamp darker and less saturated, all drawn through a coarse pixelation (16 px blocks at 1080p, downscale then upscale nearest-neighbour) so soft edges show 3-4 brightness steps; it grows, cruises and shrinks with the cursor's speed and is sucked into the button.

### Rush: geometric acceleration into the cut

`dv-rush-ramp-cut` · signature · energy high · any · primitive: Rush

The rush: a line or a scroll drifts, then roughly doubles its speed every frame (2, 2, 3, 5, 7, 10, 18, 34, 88 px/f) and is hard-cut at the peak; the next shot opens at that speed and halves it every frame (259, 131, 54, 30, 18 px/f); a card can whip crisply (no blur) into the cut and be caught by a decelerating pan; shots can arrive smeared and settle their pan. **When:** Energy peaks; the hook of a launch; moving from one product moment to the next with force. **Avoid:** More than two or three rushes per film; slowing before the cut.

- **Anatomy:** Ratio x1.4-2.4 a frame on the way in; x0.5 a frame on the way out; crisp text up to about 52 px/f.
- **Timing:** Exit 30-43 f; entry decay 30 f.
- **Sound:** A speech onset or a sub on the cut; a punchy hit.
- **Build:** `<Rush cut dir vCut from out in lines lineColor>` (fx/Rush): the outgoing layer builds on lib/handoff launch() (speed roughly doubling every 24 fps frame) and is cut on its fastest frame; the incoming one opens at the cut speed and halves it every 24 fps frame (carry()); `copies` draws 2-3 faint smear copies on the fastest frames, `lines` thin speed lines above 16 px/f; declares a velocity seam and camera blur above 100 px/f.

### Real motion blur on fast moves, defocus on snaps

`dv-motion-blur-policy` · workhorse · energy medium · any · primitive: camera-moves

Every fast move (re-centres, card arrivals, spins, scrolls, streams) carries real sub-frame smear whose length tracks its speed, visible above about 8 px/f; every snap zoom carries 3-9 px of defocus clearing in 4-7 f; fast scrolls carry about 180 deg shutter blur. **When:** Every film with fast motion. **Avoid:** Blur on stepped frames; animated blur radii.

- **Anatomy:** Shutter blur above 8-12 px/f; defocus ladders on snaps.
- **Timing:** Blur only on the fast frames.
- **Sound:** None.
- **Build:** The render's motion-blur pass (--blur) with CAMERA_BLUR ranges; SnapZoom defocus.

### Footage speed-ramped, joined on its blurred peaks

`dv-footage-speed-ramp` · workhorse · energy medium · any · primitive: FootageRamp

Footage runs fast (motion-blurred), slow, fast; clips join on their blurriest, fastest frames; a slow-motion shot can speed up and pixelate out into the next scene. **When:** Live action in a launch film; crowd or sport footage. **Avoid:** Constant-speed clips cut at slow moments.

- **Anatomy:** Speed U from about 2.4x to 0.3x (8:1); join at peak speed; a 6 f pixelate-out.
- **Timing:** Clips 55-103 f.
- **Sound:** Cuts near the beat (+67 ms).
- **Build:** `<FootageRamp clips join="cut">` + Pixelate for the exit.

### Things burst outward from the centre

`dv-burst-out` · accent · energy high · launch, feature · primitive: Orbit burstOut

Satellites fly out radially, growing to about 1.45x, and leave the frame while the label swaps on a kick; a square becomes a deck of about 30 source tiles that fans and bursts along a spiral and stops in 2 frames. **When:** Releasing a hub's contents; "from everywhere". **Avoid:** Calm films.

- **Anatomy:** Radius 640 -> 925 px on an ease-in with growth; spiral burst then a hard stop.
- **Timing:** 26-28 f.
- **Sound:** A label swap on the kick; a kick on the burst.
- **Build:** burstOut(f, { at, n, from, to, grow: 1.45, spiral }) (fx/Orbit): radial positions on E.buildIn (26 f) with growth; `spiral` (degrees per index at full travel) fans a deck along a spiral; stop it on a HardStep.

### Thin speed lines while velocity is high

`dv-speed-lines` · accent · energy medium · launch, feature · primitive: Rush

Three to five thin lines trail a fast object, converging toward it, visible only while it moves fast; comic speed dashes trail travelling items; a burst of short accent dashes streaks across horizontal bands while a title decodes; three parallel stripes shoot in at constant speed and stop dead at the hero. **When:** A thrown object, a travelling message, a decode with energy. **Avoid:** Lines on static frames.

- **Anatomy:** 1 px lines 200-400 px long, opacity tied to speed; dashes 8-60 px; stripes 20 px stopping dead.
- **Timing:** With the speed; bursts 42 f; stripes 12 f linear + a hard stop.
- **Sound:** A decode bed; the music drops out on the hard stop.
- **Build:** `<Rush lines={{ n: 5 }} lineColor>` (fx/Rush): thin bars along the travel whose strength follows the speed (from 16 to 40 px/f at 60 fps), seeded rows, never drawn below the threshold.
- **Materials and numbers:** After the stripes stop dead at the hero, 3-4 very faint thin lines continue past it to the frame edge (opacity 20 % -> 0 along their length), as if the motion had passed through and left a trace.

### Motion blur drawn as a few visible copies

`dv-tapped-blur-ghosts` · accent · energy high · launch, sting · primitive: recipe (plain layers)

On the fastest frames the blur is not a smooth streak: a launching dot is two or three overlapping soft discs stacked along its path, a whipping sentence prints three or four offset copies of each word; speed reads as a graphic. **When:** Graphic, flat films; dots and type in flight. **Avoid:** Photographic footage; films that use true shutter blur elsewhere.

- **Anatomy:** 3-4 taps at t - k dt / 4, each 25-35 % opacity, plus about 6 px of blur; dot taps 9-12 px apart, text taps about 18 px apart; only above about 12 px/f of travel.
- **Timing:** 6-12 f per move.
- **Sound:** Whooshes on the whips.
- **Build:** Recipe: render the moving layer four times at sub-frame offsets with opacity 1/4 each (the shutter with four samples and no extra blur).

### Tile wall whips in with per-tile parallax

`dv-tile-wall-whip` · accent · energy high · launch, feature · primitive: camera-moves

A wall of artwork tiles enters with heavy horizontal blur, each tile decelerating at its own rate (near tiles travel further), then the wall accelerates out and the next wall comes in. **When:** Galleries of work; a portfolio beat. **Avoid:** All tiles on one curve.

- **Anatomy:** Per-tile travel scaled by depth; blur on the fast frames.
- **Timing:** In 28 f, out 16 f cubic-in, next wall 52 f.
- **Sound:** Whooshes.
- **Build:** parallax layers per tile row with whip in and out.

### Two frames of streaks with stripe artefacts

`dv-streak-whip-frames` · accent · energy high · launch, feature · primitive: CutFx

Two frames of heavy horizontal streaking with vertical stripe artefacts (like a smeared barcode), then the next page arrives. **When:** A whip between two product pages. **Avoid:** More than two frames.

- **Anatomy:** The outgoing image stretched horizontally and cut into lines.
- **Timing:** 4 f at 60 fps.
- **Sound:** A whoosh.
- **Build:** FlashCut's streak frame without the flash (streak only), held 2 f.

### Graphic smear frames instead of motion blur

`dv-discrete-smear-frames` · accent · energy medium · any · primitive: Rush

Speed is drawn as designed frames, not shutter blur: 2-3 faint offset copies trail a fast card for a few frames; the nearest figure has a 50 % double behind it; a label box stretches along a hop for exactly one frame; a line lunges 64 px and smears one frame before a scale snap; words are doubled or streaked on the first frame after a cut; a logo's first frame is a rotational blur ring. **When:** Stylised films where real blur would look soft; accents on single fast moments. **Avoid:** Using it everywhere (it is an accent).

- **Anatomy:** Copies at decreasing opacity along the motion; one-frame stretch; one-frame ghost.
- **Timing:** 1-4 f.
- **Sound:** A kick on the logo cut; none for most.
- **Build:** `<Rush copies={{ n: 3, lag: 1, fade: 0.45 }}>` (fx/Rush): 2-3 copies where the element was 1-3 frames ago, at 45 %, 20 %, 9 %, only on frames faster than 18 px/f, never across the cut; `<Corners mode="jump">` draws the same idea as echo bars on markers.
