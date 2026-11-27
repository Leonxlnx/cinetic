# Camera

There is no real camera in a code-built film, which is exactly why it must be designed: one virtual lens, with mass,
moving through one world. A shot in the kit is a CSS 3D stage (`Camera`) that the lens moves through; even a flat layout
gets depth, parallax and a reason to move. All numbers at 30 fps, 1920x1080.

Kit (`camera.tsx`): `Camera` (keyframes `{ f, x, y, zoom, rx, ry, rz, curve }`, zoom interpolated in log space, the later
key's curve shapes each segment, default `ease.inOut`), `At` (place a child at x, y, z with rotation), `drift(frame, dur,
push, turn)`, `camAt`. From motion: `creep`, `logScale`, `keys`, `accel`, `ease`.

```tsx
<Camera keys={[
  { f: 0, zoom: 1.41, x: -180, y: 220 },            // close on the input
  { f: 22, zoom: 1.0, curve: ease.inOut },           // pull back to the whole app
  { f: 60, zoom: 1.03, curve: ease.out },            // creep, never dead
]}>
  <AppCanvas />
</Camera>
```

## House rules

1. **Never dead still for more than ~0.3 s (10 f).** Every hold carries an idle: `live` (a sub-pixel drift and a 0.6 %/s
   push), a creep (0.5-1 % scale over 20-30 f) or a drift of 0.5-2 px/f. Only the lockup may freeze, after its own creep
   ([Smooth motion](entrances.md#smooth-motion)).
2. **Pull back to establish; push in to leave.** Slow pull-backs (to 0.74-0.90 over 1-2 s) on establishing holds;
   accelerating push-ins (x1.46-1.74, `ease.expoIn` in log space) *into* transitions.
3. **Zoom in log space.** Every zoom over ~1.5x uses `logScale` (the `Camera` does it for you). Linear zooms rush at the
   start and crawl at the end.
4. **The camera has mass.** It brakes without bounce (at most 0.6-0.7 % overshoot on a pull-out); whips are asymmetric.
5. **Motion blur only at the peaks** of whips, rushes and zooms (4-6 frames); holds are razor sharp.
6. **No shake, ever.** No handheld wobble and no screen shake, not even a small one on a landing (`shake()` is deprecated
   and never used): weight comes from the object itself (7.3). No roll except to sell speed.
7. **Square-on to read, yawed to look.** A UI plane faces the lens only when it must be read or used.
8. **Drift with a direction.** A drift moves at most 3-4 % of the frame's width a second (about 2 px/f at 1080p), points
   somewhere that means something, and changes or stops with the story; a uniform float under everything is a tell.
9. **Context before a zoom.** Show the whole (the window, the page, the map) before pushing into a detail, with a landmark
   both frames share; centre on the evidence, not the click; never zoom out before the result has been read.
10. **The machine's turn moves, the person's turn holds.** While the person types, picks or presses, the camera is still
    (under ~10 px in 2.5 s); while the product works, the camera travels.
11. **The camera goes to the event.** A framing may hold while something large changes in it about every 0.7 s (a line
    lands, a panel turns, the UI acts); when only a label or a detail changes, move on: a push, a ride along the object, a
    cut to macro. When the next thing happens somewhere else, the camera is already travelling to it.
12. **A camera that performs.** It pushes in on typing, racks focus between two layers to say which one matters, rides
    the pointer's travel to its target, and pulls back while a count grows (one thing near and large, then many far and
    small), so escalation never crowds a single frame.

---

## 1. Holds that breathe

### 1.1 Creep
**What:** a held shot keeps moving a little: a push of 0.6-0.9 % over 20 f with an expo-out (fast first 5 f), or a drift
of 0.5-2 px/f, or a slow push of 3-5 % over the whole shot.
**When:** every hold. A hold that is a still frame reads as a broken render.

```tsx
const idle = live(frame, { start: 0, seed: 2 });          // drift + 0.6 %/s push + roll, every frame sub-pixel smooth
<div style={{ transform: idle.transform }}>{scene}</div>
// or by hand:
const s = 1 + 0.008 * creep(frame, 0, 20) + 0.0004 * Math.max(0, frame - 20);
// or the kit's living drift added to a key:
const d = drift(frame, 120, 0.035, 0.6);
<Camera cam={{ zoom: d.zoom, ry: d.ry, rx: d.rx }}>{scene}</Camera>
```
**Avoid:** a creep that reverses direction mid-shot (reads as indecision); creeping the type and the ground at the same
rate (use two rates for depth, 1.6).

### 1.2 Breath zoom
**What:** while an answer streams in, the camera breathes out ~2-6 % and back over ~30 f. It gives the build room without a
new shot.

### 1.3 Two-depth parallax in 2D
**What:** without any 3D, two layers move at two rates: the type pushes 1.157x while the cards behind push 1.083x over 20 f;
or a full-bleed plate **pulls back** (1.0 -> 0.843, quad-out over ~38 f, then a near-linear creep) while a phrase in front
**grows** (0.63 -> 1.0 over ~20 f, `ease.out`, then +2 %). Opposite scale directions create depth.

```tsx
const plate = 1 - 0.157 * at(frame, 0, 38, ease.out);
const phrase = mix(at(frame, 0, 20, ease.out), 0.63, 1) * (1 + 0.0007 * frame);
<AbsoluteFill style={{ transform: `scale(${plate * 1.19})` }}><Img src={staticFile('plate.jpg')} /></AbsoluteFill>
<AbsoluteFill style={{ transform: `scale(${phrase})`, ... }}>{phraseNode}</AbsoluteFill>
```

---

## 2. Push-ins

### 2.1 Punch-in cut
**What:** on a beat, hard-cut the camera group to x1.30-1.35 about the subject; landing blur 6, 4, 2, 0 px on the first 4 f;
during the hold, creep +0.6-0.9 %. A second punch of x1.10-1.13 (blur 3, 1.5, 0) gives a two-step lean-in.
**When:** the same subject gets more important (a row ticks, a number lands). The punch is a cut, never an animated zoom.

```tsx
const zoom = frame < 90 ? 1 : frame < 125 ? 1.347 : 1.347 * 1.126;
<Camera cam={{ zoom: zoom * (1 + 0.008 * creep(frame, frame < 125 ? 90 : 125, 20)) }}>
  <div style={{ filter: `blur(${landBlur(frame, 90) || landBlur(frame, 125, 3, 3)}px)` }}>{card}</div>
</Camera>
```

### 2.2 Push into a transition
**What:** an accelerating push (quad-in or `accel`) into the subject, ending on the cut or the dive. The cut
feels *caused* by the push.
**Numbers:** x1.46-1.74 over 15 f, optional roll up to 12 deg; or a stepped push 1.000, 1.020, 1.067, 1.143, 1.248, 1.379,
1.529 into the cut; radial smear 20-60 px on the last 4 f.

### 2.3 Push on a decision
**What:** when an option is selected, push x1.05 -> 1.46 over 18 f with **one peak-speed frame** (scale jumps ~0.11 in one
frame, 6 px blur) while the anchor drifts so the chosen item, not the frame centre, ends up centred.

```tsx
<Camera keys={[{ f: 0, zoom: 1.05 }, { f: 18, zoom: 1.46, x: chosenX - 960, y: chosenY - 540, curve: ease.inOut }]}>
```

### 2.4 Bowed push (yaw + lens)
**What:** a push that bends: S 1.0 -> 1.575 over 17 f (`cubic-bezier(0.562,0.144,0.199,0.916)`) about a point left of centre,
with `rotateY` 0 -> -8 deg (perspective 1400) and `rotateZ` 0 -> +1 deg ramping over 7 f, plus a barrel bulge (edges bow
~14 px). Crisp at the peak, hold ~10 f, then whip out (accelerating pan -257 px over 7 f, stage blur 2 -> 26 px).
**When:** a dense UI (code, a document) that should feel physical. Skip the bulge before skipping the yaw.

---

## 3. Pull-backs and reveals

### 3.1 Establishing pull-back
Slow pull-back on a hold: zoom 0.90 over 23 f linear, or 0.74 over 55 f with a slightly peaked middle
(`cubic-bezier(0.35,0.1,0.65,0.9)`). Elements of the world **rise into frame** during the first 12 f, so the world builds
as the camera leaves.

### 3.2 Pull-back to reveal scope
A grid of results pulls back to x0.62 (`ease.inOut`, peak in the middle) and reveals the progress bar and counter that were
outside the frame. Use when the next fact is "how much": count, scale, reach.

### 3.3 Pull-back in the world
When the product appears in the world (billboards, print, screens in a room), every shot is a pull-back to 0.42-0.83 of the
start scale over 0.4-1.5 s, the last one with a -3.5 deg roll and an `ease.inOut`. Pulling back is the right move for
"look how big this is". On photographic mock-ups, keep moves tiny instead (0.2-1.5 % push, or a ~140 px pan over 2.4 s):
motion exposes the fakery.

### 3.4 Pull-out with a hair of overshoot, then push
From a close-up at 2.09x, pull out to 1.0 over 36 f (`cubic-bezier(0.719,0.157,0.309,1.11)`: 0.6 % overshoot) while content
streams under the blurred peak; drift; then push in (2.4). A no-hold reversal: the next move starts on the frame the
previous one lands.

### 3.5 Tilt-up reveal
**What:** what the viewer took for a flat graphic is a floor seen from above; the camera tilts up and reveals the space it
lies in. The platform's far edge descends 504 -> 860 px over 18 f, decelerating (`cubic-bezier(0.15,0.6,0.35,1)`).
The transition reframes what you thought you saw.

```tsx
<Camera keys={[{ f: 0, rx: 88 }, { f: 18, rx: 58, y: -120, curve: ease.out }]} perspective={1600}>
  <At z={0} rx={0}><Floor /></At>
  <At z={-600} y={300}><Backdrop /></At>
</Camera>
```

---

## 4. Moves with momentum

### 4.1 Asymmetric whip
A reposition whip builds over 12 f and stops in 7 f with no overshoot (`cubic-bezier(0.854,0.06,0.425,0.936)`, -290 px,
peak 50 px/f, motion blur half the step). An exit whip is pure acceleration into a cut (`exits.md` 1.3). Change content on
the whip's peak frame (a placeholder cuts out, a state switches).

### 4.2 Scroll whip and fast pan
A page scrolls at ~45-60 px/f under ~40 px vertical blur, skipping the middle, and decelerates to land on the line that
matters. Content moves 1, 2, 2, 4, 5, 8, 15, 36, 72 px/f on the way out; the new state enters braking 259, 131, 54, 30, 18.

### 4.3 Vertical rush
After a hard cut onto an already-moving camera, a horizon rises out of frame fast (64 px/f at the cut, 14 px/f mid,
accelerating again to 18 px/f), continues through a dark transit (quad-in), and a new element drops in from the top
(`cubic-bezier(0.1,0.7,0.3,1)`): one continuous upward journey that ends in a new world.

### 4.4 Roll for speed
A +50 deg roll unwinding to 0 over 18 f (quart-out, peak 9 deg/f) as an object settles: the corridor rights itself. Sells
speed without a cut. Once per film.

### 4.5 Crane through an occluder
The camera cranes (speed ramping 5 -> 20 px/f); a foreground occluder crosses 10x faster and fills the frame for 3-4 f; the
camera stops dead behind it; the new subject is revealed with a focus pull. See `turns.md` 8.1.

---

## 5. Orbit, macro and distance

### 5.1 Orbit with depth
**What:** the camera orbits ~40 deg around a hero object over ~65 f while dollying in, accelerating into a push. Satellites
in front cross the screen one way, those behind the other way (a real orbit, not a carousel); front ones grow fast near the
lens. Blur by depth: front-centre 1-3 px, sides 4-8 px, nearest 8-12 px, background 3-4 px.

```tsx
<Camera keys={[{ f: 0, ry: -20, zoom: 1 }, { f: 65, ry: 20, zoom: 1.6, curve: ease.in }]} perspective={1800}>
  <At><Hero /></At>
  {tiles.map((t, i) => { const a = (i / tiles.length) * Math.PI * 2;
    return <At key={i} x={960 + Math.cos(a) * 520} z={Math.sin(a) * 520} ry={0}><Tile {...t} /></At>; })}
</Camera>
```
A simpler ring: tiles on a ring of radius ~520 px viewed from ~18 deg above, perspective ~1400 px, advancing ~250 deg over
68 f, front-loaded (40 % by frame 8), billboarded so tiles face the lens.

### 5.2 Framing escalation on one prop
Three shots of the same object for three beats: wide (object lying, rotating +8 deg over the shot), low pillar (stood up,
camera low, 15 deg off a corner), macro (one face corner, slow 1.5 px/f drift, then a push through the face). Hard cuts on
beats. The sameness of the prop makes three beats feel like one problem.

### 5.3 Macro orbit with parallax
Behind a foreground object (a device lid, a card edge), the camera orbits a small subject: the subject moves one way
(decelerating), the foreground the other way, the background ~2x the subject's speed; foreground 9-11 px blur, subject
1.2-2.5 px, background 9-11 px. Intimacy without a face.

### 5.4 Log-distance dolly
From an extreme close-up of the mark, pull back on a log-distance curve with a roll: scale 1.0 -> 0.624 (3 f) -> 0.456 ->
0.378 -> 0.330 -> 0.297 -> 0.278 (x3.6 distance) and roll 0 -> 17 deg. A brand hit in one move.

### 5.5 Macro to wide
Any feature can open in macro (a single control at 1/5 of the frame height, real depth of field) and pull back to the
whole context, or the reverse. Macro is where materials (glass rims, type texture) are seen; wide is where structure is.
As the film's opening it is one choice among several (`film-grammar.md` openings), right only when that detail is the
story; once per film is plenty.

---

## 6. UI under a camera

### 6.1 Lens-only demo (one canvas, one camera)
**What:** build the app **once** at a reference layout as a single component; all whole-screen motion is one
`translate + scale` on its parent. Content changes are state (typed substring, rows added, answers streamed); the camera
does the rest.
**Numbers:** close-ups at 1.40-1.48x on the input, ~1.41x on the conversation, 2.1x on a detail; pull-backs to 1.0 over
18-22 f, near-symmetric ease-in-out (fastest frame in the middle); zoom-in whips exponential (x1.6-2.4 per frame) with hidden
cuts (`turns.md` 7.4); a 6 % breath zoom while answers stream.
**Avoid:** animating UI panels as separate flying layers; smooth scrolls for row pushes; showing real typing time.

### 6.2 Caret-follow
**What:** while typing in a macro field, the camera scales in until the first word, then translates so the caret stays in a
band ~65-80 % of the frame width, following with a low-pass (~8-10 px/f), accelerating at the end (-9 -> -21 px/f) into the cut.

```tsx
const { shown } = useTyped(text, 10, 18);
const caretX = 260 + measureText({ text: shown, fontFamily, fontSize: 84 }).width;
const target = Math.min(0, 1300 - caretX);           // keep the caret left of x 1300
const camX = lowPass(target, frame, 0.18);           // smoothing helper (see kit gaps)
<div style={{ transform: `translateX(${camX}px) scale(${mix(at(frame, 0, 18, ease.out), 1, 1.18)})`,
  transformOrigin: '0% 60%' }}><Composer text={shown} /></div>
```
**Avoid:** a static field with text running off-frame; centred text growing symmetrically.

### 6.3 Square-on to read, yawed to look
A UI card rises already yawed (~6 deg, right side ~5 % shorter); it squares up only when it must be read or clicked (push-in
to square-on, `cubic-bezier(0.52,0.18,0.30,0.98)`), holds **still** while the cursor acts, then pulls back and turns away
(`cubic-bezier(0.64,0.17,0.85,0.62)`). Reading planes keep ~1 deg of perspective even when "flat", which says "this is a
surface in space".

### 6.4 Whip up-and-back, then yaw
A big panel whips up 126 px while shrinking 1587 -> 1414 px wide in 9 f (heavy vertical blur on the peak 6 f), decelerates
into place while turning ~7 deg, drifts 10 f, then yaws further and recedes on an ease-in into the next turn. The headline
moves at ~60 % of the panel's speed and slides **behind** the panel's top rim.

### 6.5 Product still, world moving
**What:** the product object stays screen-locked (outside the camera group) while the environment pulls back, pans or
rebuilds around it, like a HUD object in a 3D world. The clearest way to keep the product readable through spectacle.
**Numbers:** world 1.0 -> 0.74 over ~55 f (`cubic-bezier(0.35,0.1,0.65,0.9)`) with a ~1 % pan; one far element at 40-60 px
blur for depth. Re-use the same world twice (night and day) so the climax feels like an arrival.

```tsx
<AbsoluteFill>
  <Camera keys={[{ f: 0, zoom: 1 }, { f: 55, zoom: 0.74, x: 20 }]}><World /></Camera>
  <At x={960} y={540}><Hero /></At>  {/* outside the camera: locked */}
</AbsoluteFill>
```

### 6.6 Four clocks
**What:** a gutterless 2x2 grid (or 1x3) of panels, each a small film of the product at work (typing, a list filling, a chart
drawing, a toggle flipping), each with its own camera and its own loop, cutting on its own schedule.
**Numbers:** loop lengths that rarely coincide (37, 43, 53, 61 f), so no two panels cut on one frame; every panel changes
something at least every 12 f and its camera creeps 1-2 %; hard panel edges, no gaps, no radius; one panel on the accent
ground, one on the inverse. To leave, one panel grows to full frame as a window dive (`turns.md` 2.2) while the others keep
running under it.
**Sells it:** the asynchrony. Four panels cutting together read as one slide split in four.
**Avoid:** four panels showing the same thing; gutters and rounded cards (that is a dashboard); text under 30 px inside a panel.

```tsx
const loops = [37, 43, 53, 61];
{loops.map((len, i) => (
  <div key={i} style={{ position: 'absolute', left: (i % 2) * 960, top: Math.floor(i / 2) * 540, width: 960, height: 540, overflow: 'hidden' }}>
    <Panel kind={i} f={(frame - start) % len} />   {/* each panel plays its own loop from its local frame */}
  </div>))}
```

---

## 7. Projection and clocks

### 7.1 Orthographic for systems, perspective for feeling
Isometric scenes (parallel edges, `perspective` very large, e.g. 20000) read as "system diagram"; perspective planes read as
"emotional". Swing between them on purpose (a dimension swing, `turns.md` section 9): the same object re-seen as concept
(3D) and as interface (2D).

```tsx
<Camera perspective={20000} cam={{ rx: 54.7, rz: -45 }}>{isoBlocks}</Camera>   // isometric look
```

### 7.2 Two clocks
The camera always runs smooth, on every frame. Content may step: graphics on twos (`Math.floor(frame / 2) * 2`), paper on 6
fps (hold 5 f), sprites on 2-3 f per cel. A smooth push over stepped content is the most "crafted" texture code can make.
Footage and stills standing in for footage: let them run every frame, or step in a seeded pattern every 1-2 f; keep the
camera smooth over them.

### 7.3 Landing weight, never a shake
The frame never shakes, not even a little on a landing or on the drop. A heavy arrival sells its weight in the object
and around it: it comes in on `ease.in` and stops on one frame, squashes 3-5 % along the fall and settles over 6-8 f
(`ease.out`, no bounce on data); its contact shadow tightens and darkens as it touches; the thing it lands on reacts (a
2-4 px dip, a row nudged aside, a ripple in what it lands in); a physical sound only if something physical happened
([sound-design.md](../sound-design.md)). The camera may brake into the landing; it never jitters.

```tsx
const fall = at(frame, T.drop, 9, ease.in);                       // 0 -> 1, stops dead on the landing frame
const settle = at(frame, T.drop + 9, 8, ease.out);
const squash = fall < 1 ? 1 : 1 - 0.04 * (1 - settle);            // 4 % squash that settles
<div style={{ transform: `translateY(${mix(fall, -700, 0)}px) scale(${1 / squash}, ${squash})`, transformOrigin: '50% 100%' }}>{object}</div>
```

---

## 8. Spectacle shots

The film's one spectacle is picked by what the product claims (`film-grammar.md` spectacle). A wall pulled back from is in
`cards-ui.md`; these are the camera-led ones.

### 8.1 Cascade (speed, automation)
**What:** one action ripples through 20-40 objects in a chain (rows tipping to done, folders sliding into a drive, cards
flipping to approved), each set off by the one before, and the camera rides the front of the chain.
**Numbers:** gaps between items compress: 4, 3, 3, 3, 2, 2, 2, 2, then 1 f; each item's own move is 6-8 f on `ease.in` into
its hit with a 2 f settle, never a symmetric tween. The camera aims at the item that started 4-6 f ago, so it trails the front a little, pushing
1.00 -> 1.15 as the chain speeds up; past the last item it overshoots ~120 px and brakes over 10 f. A tick per item at about
-26 dB, rising in pitch; one low hit on the last.
**Sells it:** the acceleration (the chain outruns the eye) and one item at the front always sharp, the done ones behind it
dimmed 15 %.
**Avoid:** every item moving at once (that is a wave, not a chain); a locked wide camera watching the chain.

```tsx
const gaps = [4, 3, 3, 3, 2, 2, 2, 2];                              // frames between items, compressing, then 1 f
const startOf = (i: number) => s + gaps.slice(0, i).reduce((a, b) => a + b, 0) + Math.max(0, i - gaps.length);
const tip = (i: number) => at(frame, startOf(i), 7, ease.in);       // each item's move into its hit
```

### 8.2 Accelerating montage (variety)
**What:** 10-16 full-bleed examples of what the product can make or take, each in a different composition (a giant word, a
UI crop, a photo, a chart, a split), hard-cut on the beat with shrinking intervals; one element stays fixed across every cut
(the input field, the line "Ask for"), which is what the eye holds on to.
**Numbers:** intervals 7, 7, 5, 5, 4, 3, 3, 3 f..., the last example held 12-20 f and carried into the next beat; each
example enters already moving (a 1.00 -> 1.03 push over its own length, or a 20 px drift); the fixed element creeps; a tick
per cut, the music lifting under the fastest run.
**Sells it:** the compression and the change of composition on every cut. Same-layout examples read as a carousel.
**Avoid:** crossfades or rolls between examples; the first two shorter than 7 f (the viewer must read what the run is).

### 8.3 Fly-through of replicas (a model, an engine)
**What:** 20-30 copies of the hero object in a tunnel or a field; the camera flies through them along one axis while a pulse
of light or colour travels the other way, and brakes on the one hero.
**Numbers:** camera speed ramps 20 -> 80 px/f in z over 30 f (`ease.in`), then brakes into the hero geometrically (x0.62 a
frame); replicas 300-500 px apart in z, blurred by distance (nearest 8-12 px, hero 0-1 px, far 3-4 px); the pulse crosses 2-3
replicas a frame; a roll of up to 8 deg unwinds during the brake.
**Sells it:** near replicas whipping past the lens, and the brake landing exactly on the hero.

### 8.4 Dive to the detail (precision)
**What:** three hard-cut punch-ins down the scale of one point (x4, x16, x64), each a new depth, to the one digit, pixel or line
the product got right; a hairline marker snaps to it at the last step.
**Numbers:** each level 10-14 f, landing blur 6, 3, 0 px, then a +1 % creep; at x64 the detail fills ~40 % of the frame; the
marker's two 1 px ticks cut on 2 f apart and its value (mono) steps by cuts. A tick per level, rising; a click on the marker.
**Sells it:** every level still sharp and still real: draw the detail at the scale you show it, never a blown-up bitmap.
**Avoid:** an animated zoom through the levels (slow, and soft in the middle).

---

## 9. Camera checklist

- Every shot has a written camera: establish (pull-back), hold (creep), leave (push / whip / pull) or locked hero.
- The fastest camera frame of each shot is where its cut or dive happens.
- Pushes into transitions accelerate; pull-backs on establishing holds decelerate.
- No two consecutive shots use the same move in the same direction unless it is a deliberate direction relay.
- Blur appears only on frames moving > ~15 px/f or > ~3 %/f in scale.
- UI is square-on only while it is being read or used.

---

## Not in the kit yet (build these by hand from the recipes above)

- **Camera motion blur:** `Camera` has none. Needed: a `blur` option that derives a stage blur (or a ghost-copy smear along
  the move) from the per-frame camera delta, active only above a speed threshold.
- **Per-property curves:** a key's `curve` applies to x, y, zoom and rotation together; a whip that pans on `ease.in` while
  zooming on `ease.out` needs per-property curves (`curve: { zoom, x, y, r }`).
- **Stepped camera keys:** a `step: 2` option for on-twos camera moves in editorial worlds, and hard cuts between keys
  (`cut: true`) for punch-ins without two keys on adjacent frames.
- **`follow` / `lowPass`:** a deterministic smoothing helper that follows a per-frame target (caret, cursor, chosen item)
  with a given lag; it must be computed from frame 0 each time (no state), e.g. an exponential moving average over frames.
- **Barrel bulge:** a lens-distortion wrapper (SVG `feDisplacementMap` with a radial map, `k` 0-0.06).
- **`drift` translation:** `drift` only returns zoom and rotation; a sideways/vertical drift in px is a common need.
- **`Camera` anchor:** a `target` that keeps a given world point centred while zooming (the "anchor drifts to the chosen
  card" move) instead of hand-computing x and y.
- **Orthographic preset:** `projection="iso"` that sets the iso angles and a huge perspective in one prop.
- **`LockedLayer`:** documentation or a tiny component for layers that live outside the camera (HUD objects) but share
  its timing.
