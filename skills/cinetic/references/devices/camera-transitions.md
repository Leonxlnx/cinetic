# Camera transitions

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Transitions made by the camera itself: exits into darkness, whips with roll, jump frames that hide a cut, zooms through an object, dives through a soft layer.

[Camera dives through a soft layer](#camera-dives-through-a-soft-layer) · [No hard cuts: every change hides in a camera event](#no-hard-cuts-every-change-hides-in-a-camera-event) · [Zoom through an object into the next scene](#zoom-through-an-object-into-the-next-scene) · [One jump frame hides the cut inside a zoom](#one-jump-frame-hides-the-cut-inside-a-zoom) · [Whip zoom with roll and counter-roll](#whip-zoom-with-roll-and-counter-roll) · [Camera passes through a ring of cards](#camera-passes-through-a-ring-of-cards) · [Spin accelerates and the frame empties at peak](#spin-accelerates-and-the-frame-empties-at-peak) · [Full-frame defocus pulse hides a change](#full-frame-defocus-pulse-hides-a-change) · [Copy swaps on the camera's velocity peaks](#copy-swaps-on-the-camera-s-velocity-peaks) · [Every cut breathes: scale carries through the cut](#every-cut-breathes-scale-carries-through-the-cut) · [Line leaves upward as the next rises from below](#line-leaves-upward-as-the-next-rises-from-below) · [Snap back from a giant word to the full line](#snap-back-from-a-giant-word-to-the-full-line) · [Zoom cut through a dither dissolve](#zoom-cut-through-a-dither-dissolve) · [Exit at speed into a dark frame, next world fades up](#exit-at-speed-into-a-dark-frame-next-world-fades-up) · [Old layout whips out, new layout whips in from the same side](#old-layout-whips-out-new-layout-whips-in-from-the-same-side)

### Camera dives through a soft layer

`dv-dive-through-layer` · signature · energy medium · any · primitive: Dive

Real clouds (or a blurred horizon band, or mist) rise in front of the type while the camera tilts on an ease-in, a few frames are nothing but the soft layer, and the next shot continues the tilt behind it. **When:** Calm, airy films; any change that wants to feel like moving through space. **Avoid:** Hard-edged occluders.

- **Anatomy:** Tilt -3.4 -> -23.8 px/f; occluder rises defocused; fully covered 10 f; next subject focus lags its position.
- **Timing:** Tilt 90 f; whip 15 f at 100-188 px/f; covered 10-12 f.
- **Sound:** A whoosh under the dive.
- **Build:** `<Dive occluder outgoing incoming>`.

### No hard cuts: every change hides in a camera event

`dv-one-take-film` · signature · energy medium · launch, feature · primitive: camera-moves

A whole film with no plain cuts: every scene change rides a cloud dive, a foreground wipe, a whip, a white-out, a zoom-through, a velocity jump or an iris; about 13 sections of 2.7 s each. **When:** A launch film that should feel like one continuous journey. **Avoid:** Repeating the same carrier twice in a row.

- **Anatomy:** A carrier per seam from the transition families; sections 2-3 s.
- **Timing:** Sections about 160 f each.
- **Sound:** Transitions on whooshes and swells.
- **Build:** One camera function for the film (lib/camera-moves), a seam list where every seam has a declared carrier.

### Zoom through an object into the next scene

`dv-zoom-through-object` · signature · energy high · any · primitive: camera-moves

The camera accelerates into an object (a bottle, a card, a website's hero image, a laptop then a phone then a ring button, a glossy face) on an exponential ease-in until it fills the frame, and the next scene is inside it; bubbles fly off the edges; a defocus spike and a lens-warped close-up can sell the dive; a face can bloom white as it fills. **When:** Going inside the product; from a device to its screen; from a card to its content. **Avoid:** Slowing before the cover.

- **Anatomy:** Per-frame scale 1.009 -> 1.227 (x1.5-9.2), optional roll up to 76 deg; the cover frame is the cut; other elements fade in the last 30 f.
- **Timing:** 23-75 f; the cover at the fastest frame.
- **Sound:** A whoosh; a drum on a white-out; a stop-down silence for a caption.
- **Build:** zoomThrough({ factor, frames, ease: E.buildIn, box, cover: 0.99 }) + handoffShot(carry: ['k']).
- **Materials and numbers:** The surface reveals its material as the camera arrives: a pearly brushed face with a diagonal highlight band (white, about 250 px, at 25 deg), fine streak grain along the band (3-5 % luminance) and faint warm and green rainbow arcs at about 15 %, a 2 px two-hue split on the edges, then a white-out (luma about 16 % -> 85 %) on the section-change hit. A screen zoomed into shows world-scale scanlines (3 px pitch scaling with the camera) that vanish on the pull-back.
- **Conditions:** the film's one spectral accent.

### One jump frame hides the cut inside a zoom

`dv-jump-frame-hidden-cut` · signature · energy high · any · primitive: SnapZoom

A zoom builds on an exponential ease-in, then ONE frame carries a huge scale step (+30-52 %, or 71-86 % of the log move) where the cut hides, often with a brightness flash; the move then eases out in the new shot (a zoom into the input where the typed text jumps ahead; an app pulling back into a wall of app tiles). **When:** Hiding a cut or a content jump in a camera event. **Avoid:** More than one jump frame in a move.

- **Anatomy:** Ease-in 0.1 -> 3.7-16 %/f, the jump frame (with a +61 % luma flash optional), ease-out 11-30 f.
- **Timing:** Build 16-20 f; jump 1 f; land 20-30 f.
- **Sound:** An onset on the jump; a pop and a sub on the switch.
- **Build:** `<SnapZoom pre post flash={{ gain }}>` with the content swap on the jump frame.

### Whip zoom with roll and counter-roll

`dv-whip-zoom-roll` · signature · energy high · launch, feature · primitive: camera-moves

The camera whips to a new subject with an accelerating zoom (about x2) and a roll of up to +17-28 deg with motion blur, then counter-rolls past level and settles; a flat grid can tip into a perspective floor this way; a whip-left with a x1.9 zoom lands on the end of a sentence. **When:** A big change of subject; flat to 3D. **Avoid:** Roll over about 30 deg; readable text during the whip.

- **Anatomy:** Zoom peak 1.078 a frame, roll +2.3 to +5.2 deg/f then a counter-roll to -4.5 deg/f; blur on the fastest frames.
- **Timing:** 36-98 f.
- **Sound:** None needed; a kick on the landing.
- **Build:** whip({ roll, dip }) with the motion-blur pass on the fast frames.

### Camera passes through a ring of cards

`dv-through-the-ring` · signature · energy medium · launch, feature · primitive: camera-moves

A ring of cards seen down its axis: thin radial slivers grow in from the frame edges and thicken (tints first, then real thumbnails); the camera rises and pushes through the ring, the arch of cards sweeps out of frame, and the first word is already there on the other side. **When:** A gallery of examples as a portal. **Avoid:** Flat rings (it needs the perspective).

- **Anatomy:** Slivers coverage 1 -> 37 %; push with vertical flow 2 -> 43 px/f; sweep 13 f; word 20 f expo-out.
- **Timing:** Slivers 28 f; push 60 f.
- **Sound:** A chat pop; a sub-drop as the camera exits the ring.
- **Build:** Cards on a 3D ring (rotateY per card, translateZ radius) with the camera's pitch and k.
- **Materials and numbers:** The ring's cards arrive as needle-like spikes radiating from the frame edges in a two-hue gradient (outer warm, inner deep), pure colour for 12 f; as they widen they reveal video cards seen edge-on, still tinted (colour blend, opacity = 1 - width), and the tint drains in 8 f to true colour.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Spin accelerates and the frame empties at peak

`dv-spin-up-into-cut` · signature · energy high · launch, feature · primitive: Orbit spinUp

A field of tiles spins faster each frame (x1.15-1.43 a frame) while zooming out; the words are erased one every 2 frames so the frame is text-free at peak spin, the cut lands on the fastest frame and the strongest accent, and the spin decays after. **When:** A galaxy of features or sources, into the next act. **Avoid:** Text left on screen at peak spin.

- **Anatomy:** Spin 0.7 -> 14.5 deg/f, zoom x0.90; words erased every 4 f at 60 fps; empty for 6-8 f.
- **Timing:** Spin-up 23-30 f; empty 8 f; decay 33 f.
- **Sound:** The peak on the strongest accent (a kick); a pop after the cut.
- **Build:** spinUp(f, { start, cut, from: 0.35, to: 7.25 }) (fx/Orbit): the spin grows by one ratio a frame into the cut on its fastest frame and decays after it with no speed step (rotationDecay from the peak); zoom out on the camera, erase the words on HardStep every 4 f so the frame is empty at the peak.

### Full-frame defocus pulse hides a change

`dv-defocus-pulse-hide` · workhorse · energy calm · any · primitive: SnapZoom

The whole frame blurs to almost nothing and refocuses while the camera's scale jumps (x1.22-1.36) or a whip happens inside it; a page racks into focus, out again as the next line arrives, and the next screen racks in. **When:** One-take films; hiding reframes and content changes. **Avoid:** Pulses closer than about 0.4 s apart.

- **Anatomy:** Sharpness under 50 % for 15-29 f on a sine; the jump on the softest frame.
- **Timing:** 15-44 f per pulse.
- **Sound:** Pulses on kicks or hits (0-50 ms); a whoosh with the arriving line.
- **Build:** defocusPulse({ at, frames: 18, peakSigma: 20, scaleJump: 1.24 }).
- **Materials and numbers:** A whole-frame blur of about 3, 6, 3 px across the cut (last wide frame, first close-up frame, the next), sharp after: 8 f in all, with no exposure change.

### Copy swaps on the camera's velocity peaks

`dv-copy-swap-on-peak` · workhorse · energy medium · any · primitive: camera-moves

A camera breath (push, then pull) swaps copy exactly on its fastest frames: the old lines are cut out on the peak while the next first word is already arriving; a whip-zoom-out turns an app's name into its icon chip inside the blur; a push-and-crane lets the line leave through the top while the next rises. **When:** Changing statements without a cut. **Avoid:** Swapping on slow frames.

- **Anatomy:** Push x1.475 / pull to 0.96 on strong in-outs; new copy starts 1 f before the peak at 35-40 %.
- **Timing:** Push 56 f; pull 56 f; swap 1 f.
- **Sound:** Voice across the move.
- **Build:** peakFrame() + swapAt(peak, { lead: 1 }).

### Every cut breathes: scale carries through the cut

`dv-cut-open-big-settle` · workhorse · energy medium · any · primitive: camera-moves

The outgoing shot pushes (or zooms toward the camera) on an ease-in into the cut and the incoming shot opens off its rest size: either 5-20 % too big and settling down (the push reads as continuing through the cut), or 62-93 % small and still growing into place. A card can leave by scaling up +25 % into the next wipe instead of shrinking; even a static logo hold ends on a small push. **When:** Every cut that has no other carrier; downbeat cuts. **Avoid:** Opening big on a tight framing; mixing both modes in one sequence.

- **Anatomy:** Push +1-3 % (or +14-25 % for a push-through exit) on an expo-in over 5-18 f; open 8 % big (house) and settle, or open small (76-93 %) and keep growing; optional extra breath after (push +1 %, release -1.4 % into the next transition).
- **Timing:** Push 8-36 f; settle 16-50 f on an expo-out (45 % in the first 10 %); house open 8 %, settle 30 f.
- **Sound:** The cut on a kick or a downbeat (+3 ms); a click; whooshes.
- **Build:** scaleBreath({ mode: 'flip' | 'same', pre, post: { open: 0.08, frames: 30 } }).

### Line leaves upward as the next rises from below

`dv-vertical-carousel-handover` · workhorse · energy calm · any · primitive: Words

A finished line or status accelerates upward (with a little vertical blur) and leaves, while the next line or list rises from below, blurred, and eases into place: the reading direction becomes the motion. **When:** Sequences of statements or status steps. **Avoid:** Both lines on screen and sharp at once.

- **Anatomy:** Exit ease-in 2 -> 19 px/f; entry rise 83 px blurred, easing 8-16 f.
- **Timing:** Exit 20 f; entry 16-20 f; overlap 4-6 f.
- **Sound:** A punchy hit on the arrival.
- **Build:** Words exit 'launch' upward + the next Words rising with focusIn.

### Snap back from a giant word to the full line

`dv-snap-back-to-wide` · accent · energy medium · launch, feature · primitive: SnapZoom

From a giant first word (or a line panning off the edge while it types), a hard cut to the full line at about 36-97 % of the scale, landing slightly small and blurred and growing to rest as the defocus clears. **When:** Revealing the whole sentence after a close-up word. **Avoid:** Landing exactly at rest (the slight undersize carries the motion).

- **Anatomy:** Cut lands at 0.974 scale, grows 6 f; defocus clears; the pan before runs on an expo-in.
- **Timing:** 1 f + 12 f at 60 fps; pans 56 f.
- **Sound:** A speech hit 2 f before the cut.
- **Build:** punchOut-style cut with scaleBreath mode 'same' (open 0.97) and a short defocus.

### Zoom cut through a dither dissolve

`dv-dither-zoom-cut` · accent · energy medium · launch, feature · primitive: Pixelate

Between two frames a globe jumps from one size to 3.4x larger through a 3-frame pixel-dither dissolve, then the view tilts on an expo-out. **When:** Zooming into a planet, a map, an image. **Avoid:** Fine-detail subjects (the dither eats them).

- **Anatomy:** Scale jump on the cut; seeded dither mask dissolving over 3 f.
- **Timing:** Cut 1 f + dither 8 f; tilt 35 f.
- **Sound:** None needed.
- **Build:** A static seeded dither mask plate stepped in three thresholds (HardStep) between the two shots.

### Exit at speed into a dark frame, next world fades up

`dv-whip-to-dark-frame` · accent · energy medium · any · primitive: blackDipState

The outgoing shot accelerates away (an orbit ramping into a 3-frame whip, an assembly flying off, a pull-out that darkens, a last line pushing in while the floor glow sinks, a logo drifting back as it fades) into one or two dark frames, and the next world fades up from them in a few frames. **When:** Changing worlds; before the end card. **Avoid:** Long blacks (over 2 frames at 24-30 fps).

- **Anatomy:** Exit ease-in to 15 %/f or 308 px/f; 1-2 black frames; fade-up about 10 f.
- **Timing:** Exit 18-50 f; black 2-5 f at 60; fade-up 8-10 f.
- **Sound:** A beat on the black (+2 ms); a music gap begins; sub-bass under the glow.
- **Build:** blackDipState({ cut, black: 2, fadeUp: 8 }) after an exit on E.launchIn.

### Old layout whips out, new layout whips in from the same side

`dv-counter-whip-swap` · accent · energy high · launch, feature · primitive: camera-moves

The old composition accelerates out to the right and the new one arrives from the right moving left, decelerating: a swap that reverses direction at the cut. **When:** Comparing two states (before / after, old / new). **Avoid:** Using it as the default (it breaks velocity matching on purpose).

- **Anatomy:** Out quad-in to 110 px/f; in cubic-out.
- **Timing:** Out 30 f, in 42 f at 60 fps.
- **Sound:** An onset 48 ms after the cut.
- **Build:** Two whips with opposite directions; declare the seam as a position seam (not velocity).
