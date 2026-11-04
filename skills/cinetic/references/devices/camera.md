# Camera

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

One camera per film, never parked, cutting on its fastest frame. These are the moves and the habits that make a flat layout feel shot.

[Zoom into an object on a log curve](#zoom-into-an-object-on-a-log-curve) · [Barrel-roll fly-in down a corridor](#barrel-roll-fly-in-down-a-corridor) · [Camera tilt turns a flat graphic into a space](#camera-tilt-turns-a-flat-graphic-into-a-space) · [Macro pan across giant type](#macro-pan-across-giant-type) · [Montage of constant-rate dolly-outs cut on snares](#montage-of-constant-rate-dolly-outs-cut-on-snares) · [Asymmetric whip: long build, short brake](#asymmetric-whip-long-build-short-brake) · [Chained reframes with near-holds](#chained-reframes-with-near-holds) · [Punch-in zoom carried by a few frames](#punch-in-zoom-carried-by-a-few-frames) · [The hold that never freezes](#the-hold-that-never-freezes) · [Camera follows the caret](#camera-follows-the-caret) · [Long exponential camera settle](#long-exponential-camera-settle) · [Shot opens already moving](#shot-opens-already-moving) · [The camera operates a flat UI](#the-camera-operates-a-flat-ui) · [Camera reframes to make room](#camera-reframes-to-make-room) · [Move accelerates into the cut](#move-accelerates-into-the-cut) · [Camera orbits a panel in 3D](#camera-orbits-a-panel-in-3d) · [Masonry wall scrolls in, drifts, scrolls out](#masonry-wall-scrolls-in-drifts-scrolls-out) · [Ring or field spins in and bleeds off](#ring-or-field-spins-in-and-bleeds-off) · [Camera reverses into a push before the cut](#camera-reverses-into-a-push-before-the-cut) · [Pull-back where the foreground lands first](#pull-back-where-the-foreground-lands-first) · [Base sinks away from the launching object](#base-sinks-away-from-the-launching-object) · [Composition jump-reframes on each arrival](#composition-jump-reframes-on-each-arrival) · [Object rises into frame as focus racks in](#object-rises-into-frame-as-focus-racks-in) · [Zoom energy decays shot by shot](#zoom-energy-decays-shot-by-shot) · [One shot goes completely still](#one-shot-goes-completely-still)

### Zoom into an object on a log curve

`dv-log-zoom-into-object` · signature · energy medium · any · primitive: camera-moves

A point or a small object grows by 3-8x in log space (accelerating then decelerating, or decelerating from the start) and keeps going past frame fill, softening as it grows; an input box can enter barrel-distorted and straighten as it grows. **When:** Dot to planet, a mark to a world, the prompt box becoming the stage. **Avoid:** Linear scale (it reads as slowing down).

- **Anatomy:** Scale on a log curve (tau about 7-15 f on the tail), slight roll 2.5 -> 0 deg/f; optional softening; barrel bulge for 6 f at the start.
- **Timing:** 50-86 f for x3-8; peak 0.25 log/f.
- **Sound:** The fastest frame on a vocal sound or a glockenspiel note.
- **Build:** zoomThrough({ factor, frames, ease }) with lc() log blending.
- **Materials and numbers:** The world is seen through a feathered porthole that opens faster than the footage zooms: the window grows about 7.6x (feathered 6 % of the radius) while the plate inside scales only about 1.9x, on twos with a few single-frame exceptions; the plate is a soft, deliberately upscaled frame.

### Barrel-roll fly-in down a corridor

`dv-barrel-roll-flyin` · signature · energy high · launch, sting · primitive: camera-moves

The camera rolls about 175 deg while flying down a corridor of light tiles to a hero object, pushing about 2x. **When:** The hero reveal of a 3D world, once. **Avoid:** UI films; readable type during the roll.

- **Anatomy:** Roll on a sine-out, push on an ease-in-out, light tiles passing.
- **Timing:** 72 f.
- **Sound:** The music drops out.
- **Build:** lib/camera roll + k on one ShotFn; tiles as a parallax field.

### Camera tilt turns a flat graphic into a space

`dv-tilt-reveals-space` · signature · energy medium · launch, sting · primitive: camera-moves

A flat column or ring becomes a perspective runway or a side-view carousel as the camera tilts; a grid ceiling or floor appears. **When:** Moving from a flat 2D graphic into a 3D world. **Avoid:** Without depth cues ready on the other side.

- **Anatomy:** Tilt of 564 px or a swing from axial to side view; grid planes appear.
- **Timing:** 23-25 f in-out; then a constant orbit of 100 f.
- **Sound:** Between beats.
- **Build:** lib/camera pitch on a 3D-transformed container (perspective 1200 px).
- **Materials and numbers:** After the grid tips into a perspective floor, a minute paragraph lies on the floor beside an object, rotated and foreshortened with it and softened by the floor's depth of field: animate the camera, not the text.

### Macro pan across giant type

`dv-macro-pan-type` · signature · energy high · launch, sting · primitive: camera-moves

The camera slides across type so big it never fits the frame (half the frame height or more), fast at first and decaying, crisp in the centre and soft at the frame edges; a timeline can pan toward the past with speed swells. **When:** A giant number, a date line, a word as landscape. **Avoid:** Text that must be read whole.

- **Anatomy:** Start 300+ px/f decaying about 1/t; edge softening; swells (185 px/f, 318 -> 20 -> 261...) while a tilt accelerates.
- **Timing:** 29-62 f at 25-30 fps; 1881 px in 29 f.
- **Sound:** Kicks on the cut and mid-pan; a stab at the end.
- **Build:** camera x on E.snapOut over a single huge `<Words>`; edge softness as a static mask with two blur levels.

### Montage of constant-rate dolly-outs cut on snares

`dv-log-dolly-montage` · signature · energy medium · launch, sting · primitive: Montage

A run of shots (billboards, posters, streets) each with a steady pull-back at a constant log rate, cut on snares, so the whole run reads as one continuous retreat. **When:** Showing the product out in the world; the climax montage. **Avoid:** Shots with different move directions.

- **Anatomy:** Same log rate in every shot; cuts within 45 ms of snares; the last shot longer.
- **Timing:** Shots 25-50 f; final 85 f.
- **Sound:** Cuts on snares.
- **Build:** `<Montage>` with one travel (pull) and cuts on the accent list.

### Asymmetric whip: long build, short brake

`dv-asymmetric-whip` · workhorse · energy high · any · primitive: camera-moves

A fast reframe whose speed builds for most of the move and brakes in the last third, crisp at the peak (no blur needed below about 100 px/f at 1080p); the copy swaps inside the peak frames. **When:** Changing subject inside one shot; racing up or down a phone; tilting into darkness. **Avoid:** Symmetric eases (they read as a slide).

- **Anatomy:** Build 60-70 % of the move, brake 30-40 %; a slight zoom-out rides along; placeholder -> typed swap at the peak; a second, faster whip can follow immediately.
- **Timing:** 23-69 f; peak 50-178 px/f at 63-70 % of the move; house 32 f, peak 1600 px/s.
- **Sound:** A pop or a pluck at the peak (within 30 ms).
- **Build:** whip({ frames: 32 }) + swapAt(whip.peak).

### Chained reframes with near-holds

`dv-reframe-chain` · workhorse · energy medium · any · primitive: camera-moves

The camera tours a set or a product in short back-to-back moves (each with a needle-sharp speed peak), alternating axes, with a small zoom-out bump at peak speed and a lean of roll; between moves it near-holds and drifts. **When:** Walking through a product screen, a collage, a row of words in outlined circles. **Avoid:** More than one idea per move.

- **Anatomy:** Moves 38-66 f on strong in-outs (peak 26-96 px/f at 41-53 %), roll 2-6 deg per move, scale pulse +5 % at peak (or a dip to x0.91), near-holds of 4-12 f; variant: a pull-out to half size with a lateral pan on one curve.
- **Timing:** Moves 38-72 f at 60 fps; holds 8-20 f; peak 1600-5000 px/s.
- **Sound:** UI pops on clicks; words on the hop landings.
- **Build:** reframeChain(shots, { frames, gap, pulse: 0.05 }).

### Punch-in zoom carried by a few frames

`dv-punch-in` · workhorse · energy high · any · primitive: SnapZoom

A zoom whose change happens in 1-3 explosive frames after a short creep, then an expo tail; punch-ins can be hidden on spoken words, and two punches in a row replace one push. **When:** A hit, a label landing, the spoken key word. **Avoid:** Every cut (save it for hits).

- **Anatomy:** Creep (+0.04 -> +3.3 %/f), 1-3 big frames (x1.15, 1.38, 1.60), tail; x1.11-1.47 per punch; optional 5.6 px defocus on the jump frame and a 3 f ease-in before.
- **Timing:** 18-45 f in all; jump 1-3 f; tail 20-40 f.
- **Sound:** On the spoken word (-10 ms) or the hit.
- **Build:** `<SnapZoom to pre post defocus>`.

### The hold that never freezes

`dv-living-hold` · workhorse · energy calm · any · primitive: camera-moves

Every held frame keeps a slow life: a creep of 0.02-0.45 % a frame, a sub-pixel drift, a 0.6 deg roll over a long photo hold, satellites drifting outward while the centre holds, or the camera breathing on alternate frames while parts creep. **When:** Every hold longer than about 30 f: beauty frames, photo plates, end cards, logo holds. **Avoid:** Visible motion that competes with reading (keep under 3 px/f on copy).

- **Anatomy:** Scale creep (linear or slightly eased), drift 0.2-1.5 px/f, roll -0.02 to -0.04 deg/f; satellites +6 % outward while the core is still; a strictly linear push reads as digital and is fine in a stepped film.
- **Timing:** Whole shot; 0.02-0.4 %/f on photos (1.5-6 % per shot), 0.01 %/f on an end card, 2 %/s for a linear push.
- **Sound:** None; the bed.
- **Build:** camera creep() (2-15 %/s) or drift (30 px/s house) on the shot's framing; roll as a linear term.

### Camera follows the caret

`dv-caret-follow` · workhorse · energy calm · feature, walkthrough · primitive: TypeOn

While text types in a field cropped by the frame, the camera pans with the caret (in pulses, starting a few frames before the typing), and may pull back in one frame to show the whole field when the line ends. **When:** Typing in close-up. **Avoid:** Following every character exactly (lead it slightly).

- **Anatomy:** Pan speed 1-40 px/f tracking the caret; the pan starts 7 f before the typing; a one-frame jump-out at the end; a decaying roll drift while the next label types.
- **Timing:** Over the typing (50-145 f); jump-out 1 f; settle 32 f.
- **Sound:** Spacebar presses.
- **Build:** typeSchedule() positions -> a camera x with a short lead; the jump-out as a HardStep on the framing.

### Long exponential camera settle

`dv-long-decay-settle` · workhorse · energy calm · any · primitive: camera-moves

One long move that decays exponentially over 1-2.5 s (a pull-back of 15 %, a 357 px slide, a layout easing out to 0.88, a push of 1.21x on a finished line), settling just before the next beat; it can start with a tiny anticipation push. **When:** Calm shots after a busy one; holds on photos and dashboards. **Avoid:** Ending the settle after the next cut (then it is not a settle).

- **Anatomy:** Quint- or circ-out; t50 about 0.12-0.2 s, t90 about 0.6 s; optional +0.8 % push before a pull-back.
- **Timing:** 46-160 f; tau about 48 f.
- **Sound:** The bed; the next beat lands on the settle.
- **Build:** A move on E.glideOut (or a decayEase) between two framings; anticipation via reversal with a short pull.

### Shot opens already moving

`dv-opens-already-moving` · workhorse · energy medium · any · primitive: camera-moves

The first frame of a film or a shot already carries a lateral drift, a pan at full speed or a decelerating push (a third of the travel in the first 10 % of the move), which settles on the subject. **When:** The film's first frame; every shot after a transition. **Avoid:** Starting from a parked frame (it reads as a slideshow).

- **Anatomy:** Pan 126 px/f decaying, or a push x1.43 with 36 % of the zoom in the first tenth, or a drift of 12.9 px/f plus a slow zoom-out that decays.
- **Timing:** Settle 36-80 f, front-loaded; critically damped.
- **Sound:** The first music hit at about 0.15 s.
- **Build:** handoffShot()/carriedCut() for cuts; for the opener, a move on E.snapOut whose first frame is already partway.

### The camera operates a flat UI

`dv-flat-ui-camera` · workhorse · energy calm · feature, walkthrough · primitive: camera-moves

The real app UI is never animated as layers: the camera zooms out, scrolls and pushes over one flat canvas, so the product looks untouched and the editing does the talking. **When:** Walkthroughs of a real product from screenshots. **Avoid:** Fake layer animation on a screenshot.

- **Anatomy:** Zooms x0.70-0.92 and scrolls 94-551 px; a symmetric 1.33x zoom; an S-curve push of +30 % on a finished layout.
- **Timing:** Zooms 30-40 f; calm scroll+zoom 75 f; S-push 92 f.
- **Sound:** Voice.
- **Build:** One camera() on a single flat `<Img>` or built canvas; moves from lib/camera-moves.

### Camera reframes to make room

`dv-make-room-reframe` · workhorse · energy medium · any · primitive: camera-moves

When a new element is about to arrive, the camera (or the content) pulls back, shrinks or slides to make room, timed to finish one frame before the new element shows; a push can stay centred on an inline icon so the words part around it. **When:** Adding a second line, more cards, a label, a result under a search bar. **Avoid:** Making room after the element has appeared.

- **Anatomy:** Pull-back to 0.69-0.75; a kick of -6.3 %/f at peak; a 368 px slide with an early speed peak (18 % of the move) and a long tail; a two-phase pull (decelerate, re-accelerate, settle).
- **Timing:** 30-60 f; peak at 18-56 % of the move.
- **Sound:** A kick or a click.
- **Build:** A camera move ending at the new element's onset - 1 (whip or E.glideOut); for an icon-centred push, anchor = the icon.
- **Materials and numbers:** When the cluster outgrows the panel, the whole composition shrinks about 18 % between two drawings with no in-betweens (no blur, no overshoot), paired with a new tile's cut-on, and the slow pan continues.

### Move accelerates into the cut

`dv-accelerate-into-cut` · workhorse · energy medium · any · primitive: camera-moves

The shot leaves by speeding up (a drift, a push, a pull-back, a card shrinking away) and the cut lands on its fastest frame; even a slow push that would normally settle keeps rising into the cut. **When:** Nearly every cut; the end of a film (the last frame at peak speed). **Avoid:** Settling into the cut (that reads as a stall).

- **Anatomy:** Ease-in over the last 6-24 f; a held line growing 0.18 %/f then +3.2 % in its last 6 f; a 3-frame counter-move (0.997, 0.990, 0.976) after a slow push.
- **Timing:** Last 6-70 f on an ease-in; cut speed 6-30 px/f or 0.4-1.5 %/f.
- **Sound:** Kick 24 ms after the cut; a riser or a level swell into it; a spoken word on the cut.
- **Build:** scaleBreath (push into .cut) or punchOut; put the cut on .cut / peakFrame.

### Camera orbits a panel in 3D

`dv-yaw-orbit` · accent · energy medium · launch, feature · primitive: camera-moves

A floating panel or page turns in 3D (its far side receding, the yaw flipping), sometimes with a slight wide-lens bulge on a push; new content pops in during the tail. **When:** Product screens that should feel like objects. **Avoid:** Yaw beyond about 15 deg on readable UI.

- **Anatomy:** Yaw 2-8 deg (far side scaling 1 -> 0.85); a push of x1.57 with 3-5 % barrel bow; content pops in the tail.
- **Timing:** 34-54 f; 5 f ease-in, peak 45 px/f, long quart-out tail.
- **Sound:** A level dip before the flash it leads into.
- **Build:** Cards enterState lean on rotateY, or the camera's yaw in lib/camera.ts; barrel bow as a static SVG displacement map at two strengths.

### Masonry wall scrolls in, drifts, scrolls out

`dv-masonry-scroll` · accent · energy calm · launch, feature · primitive: Scroll

A masonry of framed photo cards with words in the gaps scrolls up on an expo-out entry, decays to a slow drift, then leaves on a circ-in. **When:** A wall of examples or use cases. **Avoid:** Text inside the moving cards.

- **Anatomy:** Entry 22 px/f with 72 % of the travel in the first 10 %; drift 0.7-0.9 px/f; exit circ-in.
- **Timing:** In 60 f, cruise, out 42 f.
- **Sound:** The bed.
- **Build:** flickState with a short ramp, or a camera y on E.snapOut then E.launchIn.

### Ring or field spins in and bleeds off

`dv-rotation-decay` · accent · energy medium · launch, feature · primitive: Orbit rotationDecay

A ring of chips, a ring of tiles or a whole field of tiles arrives already turning and its rotation decays by a constant ratio to a slow cruise that never stops. **When:** Integrations, sources, a galaxy of features around a centre. **Avoid:** Rotation that stops dead.

- **Anatomy:** Start 2.5-15 deg/f, decay x0.88-0.95 a frame, cruise 0.1-2.4 deg/f.
- **Timing:** 30-100 f to the cruise.
- **Sound:** None.
- **Build:** rotationDecay(f, { start, w0: 8, ratio: 0.94, cruise: 0.5 }) (fx/Orbit, degrees and ratios per 60 fps frame): the ring arrives turning at w0 and bleeds off by the ratio to a cruise that never stops, closed form; `<OrbitRing decay>` draws the ring.

### Camera reverses into a push before the cut

`dv-reversal-push` · accent · energy medium · any · primitive: camera-moves

After a pull-back settles, the shot turns and pushes in on an ease-in so the cut lands on the push's top speed; or a push dips mid-move and re-accelerates (a U-shaped speed profile). **When:** The last cut of an act; a hero push that needs two beats. **Avoid:** Too many turns in one shot.

- **Anatomy:** Pull to 0.80-0.90, a rest, a push of 2-6 %; U-speed variant: 0.95 %/f easing to 0.49 then back up to 0.8-0.9 with an accelerating truck.
- **Timing:** Push 24 f quad-in (0.36 %/f at the cut); U-push 54-70 f.
- **Sound:** The cut on the beat (+30 ms); a level swell into it.
- **Build:** reversal({ pull, push }); U-speed via a whipCurve with two peaks.

### Pull-back where the foreground lands first

`dv-parallax-landing-stagger` · accent · energy calm · launch, feature · primitive: camera-moves

Opening on a button over a dot grid, the camera pulls back; the foreground lands about 10 frames before the background, so the depth reads from the timing alone. **When:** Openers on a single object over a textured ground. **Avoid:** Equal timing on both layers.

- **Anatomy:** Background on a soft-start ease-out (peak -5.5 %/f at f7) in log scale; foreground on a shorter curve.
- **Timing:** Background 58 f; foreground 38 f.
- **Sound:** A glockenspiel-like note at 0.05 s.
- **Build:** parallax(layers with different frames) on one pull.

### Base sinks away from the launching object

`dv-ground-falls-away` · accent · energy medium · launch, feature · primitive: camera-moves

As an object launches (a send button, a card), the camera pushes slightly while the base it sat on drifts down and accelerates out of frame, so the object seems to lift off. **When:** The moment a request is sent; an object leaving its container. **Avoid:** Moving the object itself fast at the same time.

- **Anatomy:** Camera push +2-4 %; base y on an ease-in to about 29 px/f; never settles.
- **Timing:** 58 f.
- **Sound:** Kicks under it.
- **Build:** parallax with the base on its own layer and an E.buildIn drop.

### Composition jump-reframes on each arrival

`dv-jump-reframe-on-arrival` · accent · energy high · launch, feature · primitive: Stepped

While a collage is sparse, the whole composition jumps in one frame (about 180 px, or x1.11) each time an element arrives, holding 2-10 f between jumps. **When:** Stop-motion collage builds. **Avoid:** Smooth films.

- **Anatomy:** Single-frame reframes on births; holds 2-10 f.
- **Timing:** Holds 2-10 f.
- **Sound:** None needed.
- **Build:** collage({ camera }) steps on births (x1.05-1.11 or 150-200 px).

### Object rises into frame as focus racks in

`dv-rise-focus-rack` · accent · energy calm · launch, feature · primitive: RackFocus

A floating platform or object rises into frame, slowing, while the image racks from soft to sharp, the focus landing later than the position. **When:** Introducing a 3D object or a device. **Avoid:** Racking before the move.

- **Anatomy:** Rise 9 -> 2 px/f; focus lags by 20 f.
- **Timing:** Rise 18 f; focus 40 f.
- **Sound:** None.
- **Build:** Cards enterState + RackFocus levels with the focus starting 4 f after the move.

### Zoom energy decays shot by shot

`dv-shot-energy-decay` · accent · energy calm · launch, feature · primitive: Montage

After a zoom transition, each following shot pushes in less than the one before (2.1 %/f, 0.54, 0.20, 0), so the sequence calms down without any shot being static. **When:** The run of shots after a big transition. **Avoid:** Reversing the order (it reads as random).

- **Anatomy:** Per shot push rate times about 0.3.
- **Timing:** Over 65 f of shots.
- **Sound:** The bed thins with it.
- **Build:** Montage with push per shot decaying (MONTAGE ratio 0.3), or per-shot creep() rates from a decaying list.

### One shot goes completely still

`dv-one-still-shot` · accent · energy calm · any · primitive: camera-moves

After constant motion everywhere, one shot lands and holds completely still for half a second; the stillness becomes the emphasis. **When:** The keyword of the film ("Instantly"). **Avoid:** More than once per film; holds longer than about 30 f.

- **Anatomy:** Pull-out into the cut accelerating, the next shot opens still moving, then stops dead.
- **Timing:** Out 14 f, in 20 f, still 28 f.
- **Sound:** A ding on the still frame.
- **Build:** A move on E.snapOut that ends exactly; then no creep for 28 f (declare the still range).
