# Turns: how one section becomes the next

A cut is never bare. Between two beats, something carries the eye across: **speed, an object, a word, a shape, light,
or a ground change on a beat**. Template films crossfade or slide; premium films make the seam out of the scene's own
material, so the film reads as one camera moving through one world. A good film has dozens of seams and almost no
dissolves; a film of 45 s may contain only four true hard cuts, everything else being camera moves, masks, morphs and
flashes. All numbers at 30 fps, 1920x1080.

Kit (`turns.tsx`): `Iris`, `Tiles`, `Pixelate`, `Push`, `ZoomThrough`, `Flash`, plus `turn = { at, ease, logScale, mix }`
for hand-built turns. Each component takes the outgoing shot as `from`, the incoming as `to`, a `start` and a `dur`; put
it in a `Sequence` that spans both shots. Most of the best turns are hand-built per film from the helpers below.

```tsx
<Sequence from={300} durationInFrames={60}>
  <ZoomThrough from={<HubShot />} to={<SearchChapter />} start={20} dur={18} x={1180} y={520} depth={12} />
</Sequence>
```

---

## 0. The rule for choosing

Never a cross-fade between scenes and never an empty frame: at a seam the next ground already holds its subject at full
size while the old one shrinks away. Ask how the two beats relate, then pick from the matching row. Never use the same device on two consecutive seams, and
across the film repeat only the signature device (`film-grammar.md` devices), on at most 3 seams; use flashes at most 3-4
times. The ground changes (two in a film over 12 s) use two different devices, and a colour flood from an object (`Flood`) is at most one of them.

| Relation between beat A and beat B | First choice | Second choice | Never |
|---|---|---|---|
| same subject, closer or further | punch-in cut, zoom cut | carried cut | crossfade |
| same direction of travel / same energy | carried cut (velocity hand-off) | push / whip | ease to stop + cut |
| B is *inside* A (a cell, a window, a card, a screen) | zoom-through / diegetic dive | window dive | iris from nowhere |
| B is caused by A (a choice, a press, a result) | object hand-off / morph | carrier panel | slide |
| same idea, different world | shape iris from A's geometry | occluder wipe | generic circle wipe |
| tonal jump (dark to white, footage to UI) | flash-hidden swap, light flood | ground cut on a beat | crossfade (the midpoint is mud) |
| new chapter of a feature map | hub and dive | ground cut on a beat | title card |
| time skip in a demo (typing, loading) | hidden cut inside a whip | punch-in cut | showing the wait |
| brand identity moment | brand device (mosaic, tear, mark iris) | tiles | stock "glitch" |
| a new act, same cast | ground swap under a layer that stays (9.1) | colour-flip cut with a size step (9.2) | a flood every time |
| one thing, many worlds | object-lock swap (`cards-ui.md`) | ground swap under the thing (9.1) | a row of cards |
| B is A in another form, several times | morph chain (5.8) | object hand-off (5) | cut to a fresh layout |
| a line is being read | **no transition**: hard cut on the beat after the read | | any move while reading |

---

## 1. Carried cut (velocity hand-off)

**What:** the outgoing shot accelerates (pull-back, push, whip, rise); on its fastest frame, hard cut; the incoming shot is
**already moving in the same direction** at a matched speed and decelerates. The brain reads one continuous move.
**When:** the default seam between any two shots that share a direction, a subject or an energy level. A film can use it
for half its seams if the directions vary.
**Numbers:**
- Outgoing, last 6-8 f: each step = previous x 1.4-1.6 (`accel(frame, s, 7, 1.5)`), plus blur proportional to speed
  (2 -> 6 -> 14 px, or a directional smear 8, 16, 32, 60 px for whips).
- Incoming, first 10-30 f: starts at 50-60 % of the exit speed, decays geometrically (`v0 x 0.62^n`) or with
  `cubic-bezier(0.16,0.8,0.3,1)`; landing blur 4-6 px clearing in 3-4 f (`landBlur`).
- Positions and directions match within ~20 px across the cut.
- A transient (click + sweep, a whoosh, or the music's kick 2-3 f after the cut) on the cut frame +-1.

```tsx
// A: last 7 frames of the outgoing shot
const q = accel(frame, 53, 7, 1.5);
const A = <AbsoluteFill style={{ transform: `translateX(${-420 * q}px)`, filter: `blur(${12 * q * q}px)` }}><ShotA /></AbsoluteFill>;
// B: starts at the cut, already travelling left, decelerating
const g = (f: number) => (f <= 0 ? 0 : (40 * (1 - Math.pow(0.62, f))) / 0.38);
const B = <AbsoluteFill style={{ transform: `translateX(${105 - g(frame - 60)}px)`, filter: `blur(${landBlur(frame, 60)}px)` }}><ShotB /></AbsoluteFill>;
{frame < 60 ? A : B}
```
**Variants:**
- **Direction relay:** plan each cut as a vector (up, up, outward, forward). The lockup rising -> the next layout rising.
- **Speed carry:** accelerating streams -> a still plate whose pull-back is quick at first, "absorbing" the speed.
- **Scale carry:** a push-in accelerating -> a mark that arrives huge and shrinking.
- **Zoom cut:** a wide UI drifting down-right -> next frame 2.4x closer, continuing the same drift, motion blur on 2 f.
- **Punch-in cut:** on a beat, hard-cut the camera group to x1.30-1.35 about the subject; blur 6, 4, 2, 0 px; a second punch
  of x1.10-1.13 gives a two-step lean-in.
**Avoid:** easing both sides to zero (a dead stop then a dead start reads as two shots); a crossfade under the cut.

### 1.1 A run of velocity cuts
**What:** three to six shots in a row joined by velocity cuts alone, one per beat, no shared object: the film's tempo device,
and the cheapest way to carry seams without turning each into a slow camera event.
**Numbers:** shots of 9-20 f; every exit `accel` over its last 5-7 f, every entry at 50-60 % of that speed and decaying
x0.62 a frame; change direction on each cut (right, up, in, left), or keep one direction for a rush; the cut on the beat,
the kick 2 f after it.
**Sells it:** matched speed on both sides and the beat under it. One creeping hold inside the run breaks it.

---

## 2. Zoom-through and the diegetic dive

**What:** the camera flies into an element (a cell, a window, a card, a cube, a screen, the centre of a bubble) until it
fills the frame; its interior **is** the next shot.
**When:** B lives inside A: a feature inside a hub, an app inside a device, a detail inside a picture.

### 2.1 Zoom-through (kit)
`ZoomThrough` flies into point (x, y) in log space with `ease.in` (`depth` 8-16), blurs the last 40 % up to 10 px, then the
new shot arrives from 1.5x to 1.0 with blur 8 -> 0 over 0.9 x `dur`.
**Numbers:** 15-22 f; for an accelerating push also add a few degrees of roll (up to 12 deg) and radial smear 20-60 px on
the last 4 f.

### 2.2 Window dive (mask grows, content grows less)
**What:** a framed rectangle containing live content scales to cover the frame in ~4 f with an accelerating ease; the
content inside keeps its own motion and grows **less** (~1.3x), which sells depth; on the 5th frame unmount the wrapper and
render the next scene full-frame with identical state.
**Numbers:** mask scale `max(1920 / w, 1080 / h) x 1.05`, `ease.in` over 4 f; a hard high click when the edges leave.

```tsx
const p = at(frame, s, 4, ease.in);
const k = mix(p, 1, Math.max(1920 / w, 1080 / h) * 1.05);
<div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, overflow: 'hidden',
  transform: `scale(${k})` }}>
  <div style={{ transform: `scale(${mix(p, 1, 1.3) / k})`, transformOrigin: '50% 50%' }}><Inner /></div>
</div>
```

### 2.3 Push into a face or screen
**What:** an accelerating push (`ease.in`, x1.46-1.74 over 15 f) into a product object's face, a device's screen or a
bubble's bright centre until its colour fills the frame; that colour is the next ground; the incoming world starts in that
colour. "Screen becomes world": push into a device, the screen content fills, its background turns into the next world's
ground in 2 f.

### 2.4 Zoom-through a card onto what lies below
From a finished answer card, push in and pan down on an accelerating exponential (width x1.00 -> 1.01 over 22 f, then 1.06,
1.11, 1.21, 1.29, 1.55), vertical motion blur 6 -> 20 px on the last 5 f, landing on the input field at macro scale, which
keeps scaling in (ease-out over ~50 f). The field is "below" the card in the same space; never cut to a separate screen.

### 2.5 Snap out
The way back from a dive: a snap zoom-out 4x -> 1x in 5 f with `ease.out`, on a hit. Pair every dive with at most one snap out.

---

## 3. Shape iris

**What:** the next shot opens inside a growing shape. The shape must come from the film: the seed glyph, the hero's
outline, the overlap of two objects, the mark. A generic circle wipe from nowhere is a template tell.
**Kit:** `Iris` grows a circle, a rounded rect, or any SVG path (in a 100x100 box) from (x, y) in log space, scales the
outgoing shot 1 -> 1.12 with blur, and brings the incoming from 1.18 -> 1.0. `ring` adds a fading outline.

```tsx
<Iris from={<Seed />} to={<World />} start={21} dur={35} x={960} y={540} shape={lobedPath(12)} />
```

### 3.1 Iris from a seed glyph (fast-slow-fast)
**What:** a small glyph is born at frame centre and becomes the iris centre; the iris opens around it in three phases
(explosive, slow, accelerating overfill), so the opening feels like a breath, not a wipe. The glyph then turns into a hole
(its fill animates to the stage colour, not its opacity), holds, spins and shrinks away; the next element is born on the
exact pixel where it vanishes.
**Numbers:** a lobed outline (a disc of 0.80 R plus 10-16 circles of 0.265 R on a ring of 0.735 R), feathered 4 px, lobes
rotating 1.25 deg/f; R keys 72, 223, 405, 536, 601, 646, 735, 838, 960, 1110 at f0, 3, 7, 13, 19, 24, 29, 32, 35, 36.
**Avoid:** a plain circle (reads as a cheap wipe); linear growth; glow or particles on the seed.

### 3.2 Two-shape overlap (lens iris)
**What:** two large discs close like curtains (spring `{mass: 1, stiffness: 180, damping: 16}`, 4-8 px overshoot, a 3-4 f
squash at contact), hold, then slide into each other; **their intersection is a window into the next scene**, with a
3-4 px lit rim and a 40-80 px inner glow. Just before it opens, a rim glow slides over the subject to hide the seam.
**Numbers:** lens half-width ~145, 354, 776 px, then off frame over 5 f (centres approach with an ease-in).
Build: next scene clipped by circle A and masked by circle B; both arcs stroked and blurred on top.

### 3.3 Iris under the UI
**What:** the iris opens **beneath** the interface layer: chat bubbles and cards stay on top and slide over the opening
window onto the world. Radius per frame 202, 305, 396, 472, 538, 593, 643, 688, 728, 765, 798, 828, 855 (decelerating),
crisp edge with a 2 px white 50 % outline; remove the mask on the last frame.

### 3.4 Iris from behind
**What:** a sharp-edged rectangle (not rounded) grows from behind a group of objects until the ground is a new colour;
the objects stay in front. A ground change that keeps the cast.

**Avoid (all irises):** scaling the inner scene a lot (only the mask grows; the kit's 1.18 -> 1.0 is the maximum); a fading
mask; more than two irises per film.

---

## 4. Tiles, floods and mosaics

### 4.1 Tiles (kit)
`Tiles` breaks the frame into `cols x rows` tiles that swap in a sweep (`order`: diagonal, center, random, left);
`color` turns the old tiles into a flat colour first. 20-30 f. Use for grid worlds and data products.

### 4.2 Tile flood
**What:** an isometric floor of rhombus tiles flips from ground A to ground B in clusters spreading from a few seeds;
flipping is instant (or a 2 f squash of the rhombus height). **Fast version** (4-6 f) works as a cut; **slow version**
(25-30 f, while objects keep animating) works as a mood change.
**Numbers:** tile ~120 x 60 px; t_i = start + distance to the nearest seed / speed + jitter 0-3 f; overlap tiles by 1 px.
**Avoid:** dissolving the grounds; seams.

### 4.3 Pixel bridge
**What:** the old shot pixelates up over 4 f, hard cut, the new shot pixelates down over 4 f. Blocks are **wider than tall**
in the big phase, the grid is anchored at (0, 0), and each block shows the **mean** colour. The camera keeps moving under it.
**Numbers:** out 12x11, 28x23, 60x44, 130x72 px; in 150x75, 46x34, 18x16, 10x10, then clean. A tiny high tonal click (13-14 kHz,
15 ms) per mosaic frame. Announce it 4 f early with a dither flare (edge dots brighten and multiply).
**Kit:** `Pixelate` (square blocks stepped 4, 8, 16, 32, 64, triangular in time); fine for a quick digital cut.

```tsx
<Pixelate from={<Collage />} to={<Photo />} start={92} dur={8} max={128} />
```

### 4.4 Cell bloom (grid opener into a dive)
Grid-snapped rectangles spawn in bursts every 2-3 f (on/off only, no tweens) until ~70 % of the frame is covered, retract
to three cells on a diagonal, the layer scales 1.0 -> 1.5 about the middle cell (`ease.in`), then the middle cell fills the
frame; its colour and grid continue as the next scene's ground and grid.

---

## 5. Object hand-off and morph

**What:** the element that matters in A physically becomes the element of B. The viewer sees cause and effect. This is the
strongest family of turns; build at least one per film.

### 5.1 Dot, drop, flash, bloom
The final dot of a written line swells (r 10 -> 15 over 2 f, then expo-out to ~75 over 4 f), turns white, falls with gravity
(dy 38, 90, 168, 270 px/f, vertical motion blur 20-40 px), squashes 10 % on impact, and the impact floods the frame (an
additive tinted layer 0 -> 0.85 -> 0 over 4 f) while the new ground crossfades in under it. Out of the impact point a
ring appears (r 70, 20 px band), becomes a glass sphere (r 130), and grows to r ~200 on an arc; the content fades up inside
from +7 f; a second bubble spawns 2 f later on an opposite arc. The flash *is* the cut.

### 5.2 Button becomes window
At macro scale the send control is pressed (r 1.0 -> 0.77 over 6 f, accelerating); its fill **drains** from the bottom up
over 4 f, taking the arrow with it; the surrounding field fades over 9 f; the remaining white circle springs back and grows
(r x1.0 -> x1.53 over 25 f, ease-out); the next picture rises into it from below (clipped) over ~12 f, with a thin inner rim
light on its lower edge. The payoff line then appears around it (see `text.md`, words pushed by an object).

### 5.3 Highlight becomes the next object
From a feed: push in +2 % over 5 f; over 3 f desaturate everything to grey while the highlighted item saturates to the
accent and its edges brighten; blur everything else; the highlight becomes the next scene's pill (same screen position,
scaled up, blurred), the ground darkens over 4 f, the pill settles with a tiny overshoot (0.5 deg, 6 px). The audience sees
*which* item became the insight.

### 5.4 Choice collapses into progress; confirmation blooms into action
See `exits.md` 4.1 and 4.2. Both should be followed by the next element arriving exactly where the old one ended.

### 5.5 Blur morph (glass handover)
Inside a stage blur pulse (16, 26, 28, 30, 28, 18, 12, 7, 2.5, 0 px), cross-fade A out over 4 f (1, 0.6, 0.3, 0.1, 0) and B in
over 4 f, offset by 1 f; B is already centred and lands by shrinking (1.30 -> 1.0 over 11 f). The blur hides that one object
became another. The input-to-bubble "send glow" is the same idea: the input blurs 0, 3, 6, 10, 16 px, becomes a blurred warm
pill of moving colour blobs that travels to the bubble's place, then re-sharpens over 5 f as the sent bubble, still tinted,
cooling by +6 f.

### 5.6 Snap morph licensed by a flash
An exploded object compacts (10 f), white square sparks appear on its faces, a glow ring flares (r ~450, 2 f), and on a 2 f
dissolve with +30 % brightness the object becomes a *different* object (a frosted tile), which then clears over 12-15 f.
The flash licenses the change of shape.

### 5.7 Docking
The hero stays; a new element shoots in from off-frame and docks into it (right end x -> the hero's edge over 6-9 f,
`ease.out`), with a dock flash (6 px white ring + white halo 0.8, 0.4, 0 over 3 f). The world can change around a docked hero.

### 5.8 Morph chain
**What:** one element becomes the next several times running, with no cut: the send dot becomes a pill, the pill a progress
bar, the bar the answer card, the card the window of the next screen. A carrier from beat to beat that needs no ground cut.
**Numbers:** 4-8 links; each holds 6-12 f as itself while something happens in it (a label, a fill, a count). Each change
takes 5-8 f: position, size and radius together with `lerpBox` on `ease.out` (60-70 % of it in the first 2 f), the fill
with `mixColor` over the same frames; the old content cuts out on the change's first frame, the new content cuts on 2-3 f
before it lands. The camera keeps the box at 40-60 % of the frame width.
**Sells it:** the box never leaves the frame and never stops, and every link reads as itself for at least 6 f.
**Avoid:** two links of the same shape in a row; a slow symmetric tween (the middle is mush).

```tsx
// boxes[i] = { x, y, w, h, r } (centre x, y) of each link; starts[i] = the frame link i is complete
const k = Math.max(0, starts.filter((s) => frame >= s).length - 1), n = Math.min(k + 1, boxes.length - 1);
const p = n === k ? 0 : at(frame, starts[n] - 6, 6, ease.out);
const b = lerpBox(p, boxes[k], boxes[n]);
<div style={{ position: 'absolute', left: b.x - b.w / 2, top: b.y - b.h / 2, width: b.w, height: b.h, borderRadius: b.r,
  background: mixColor(fills[k], fills[n], p) }}>{p < 0.4 ? content[k] : content[n]}</div>
```

**Avoid (all morphs):** showing the full tween of a shape morph (bubbles visibly stretching into a bar look like a template;
cut inside it or hide it in blur or light); morphing between unrelated objects.

---

## 6. Flash-hidden swap

**What:** light hides the change. The swap happens at the flash's peak.
**Kit:** `Flash` peaks at `start + 0.4 x dur` (ease-in to the peak, ease-out after), `mix-blend-mode: screen`; tint it in
the world's light colour, not pure white on a dark world.

```tsx
<>{frame < 214 ? <ShotA /> : <ShotB />}<Flash start={210} dur={10} color="#FFF4EA" strength={0.9} /></>
```

### 6.1 Flash gate (two exposure frames)
Inside the fastest frame of an exit whip: **frame N** is full-frame light grey (#EDEDED) with a 30 px-blurred grey ghost of
the object and its key element inverted; **frame N+1** is darker than the stage with ~12 thin horizontal light streaks
(2-4 px tall, 300-1000 px long, 40 px horizontal blur, brightest at the right ends); **frame N+2** the next shot enters at
whip speed with 20 px smear. A reversed noise swell from 10 f before, peaking 3 f after.
**Avoid:** a flash longer than one frame; a "black" frame as bright as the stage.

### 6.2 Light flood
To hide a cut between two UI scenes: over the last 12 f of A, a diagonal light from the top-left ramps 0 -> ~0.85 on the
left third while the right third goes to near black; A pulls back and turns away underneath. Cut on the frame of maximum
light to a field whose own gradient is the same diagonal light, settling over 6 f; the next text starts appearing 1 f later.
**Avoid:** a white flash (too hot) or a crossfade (reads as a dissolve, not as light).

### 6.3 Dip, then flash
Dim the scene for 6 f (mean luma down ~30 %), then overlay a pale field 0, 0.10, 0.30, 0.55, 0.80, 1.0 over 6 f while the old
scene desaturates. The dip makes the flash land. Use for a night-to-day change.

### 6.4 Flash cut to white
An accelerating push on a detail ends in a white frame holding the next subject as a clean cut-out: a white "reset".

---

## 7. Push, whip and hidden cuts

### 7.1 Push (kit)
`Push` moves both shots as one strip (`dir` left, right, up, down) with smear on the fastest frames (`smear` px). 12-18 f,
`ease.inOut`. Join scenes of the **same tone** only; a push across a tonal jump shows a strip of mud.

### 7.2 Whip into darkness
The world slides 150-250 px/f with 60-120 px horizontal smear, empties to near black for 2 f (smeared point streaks), then a
glow and a grid fade in and a new object enters big from the side **carrying the momentum** into the next set.

### 7.3 Staged push wipe
A solid panel with a hard vertical edge (20 px soft shadow onto the old side) pushes the old shot (footage moves at 0.5x the
edge speed and starts moving 4 f before the edge enters). Stage 1 (21 f): edge 0 -> 0.48 W, `cubic-bezier(0.15,0.02,0.01,0.92)`;
a near-hold of 4-6 f at centre while something happens in the new half (typing starts); stage 2 (22 f): edge -> W,
`cubic-bezier(0.69,0.05,0.68,0.78)`. UI in the panel is revealed by the edge passing it. Motion blur only on the 4 fastest
frames of each stage. Best for handing an action from a human moment (footage) to the product.

### 7.4 Hidden cut inside a whip
In a one-canvas demo, on the fastest frame of a zoom or scroll whip, swap the canvas state (another conversation, the text
already typed further) while the camera's velocity continues. Zoom-in whip: per-frame scale x1.02, 1.04, 1.08, 1.15, 1.30,
swap and jump x1.35, then expo-out x1.07, 1.027, 1.014, 1.006. Scroll whip: 1, 2, 3, 4, 6, 9, 15, 30, 60 px/f, swap, the new
state enters at ~260 px/f decaying x0.5 per frame. This is how typing and loading time disappear.

---

## 8. Occluders and carriers

### 8.1 Occluder wipe
A large foreground element (blurred ~6 px) crosses at 10x the camera speed (200-235 px/f) and fills the frame for 3-4 f;
swap the world and stop the camera dead behind it; as it clears, the new subject is revealed with a focus pull 10 -> 1.5 px
over 5 f and secondary elements fading 0 -> 1 in 4 f. The occluder must be **in front of** the title in z.

### 8.2 Carrier panel
A full-frame panel (white or black) with a soft leading edge (120-200 px gradient mask) sweeps up at 300-400 px/f (5-6 f for
the frame), slightly ease-out; **the next scene's hero is already on the panel**, blurred 7 px, sharpening 7, 4, 1.5, 0 as it
settles. Tint the leading edge a hair toward the next ground. A reversed air swell ending on the settle.
**Avoid:** a hard-edged slide (looks like a presentation push) or revealing an empty frame.

```tsx
const y = mix(at(frame, s, 6, ease.out), 1080, 0);
<AbsoluteFill style={{ transform: `translateY(${y}px)`, background: '#fff',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 160px)' }}>
  <div style={{ filter: `blur(${[7, 4, 1.5, 0][clamp(frame - s - 5, 0, 3)]}px)` }}><Claim /></div>
</AbsoluteFill>
```

### 8.3 Fly-through panel
A frosted white rounded rectangle larger than the frame (its blurred edges visible as light bands just inside the frame)
scales down toward the next window's rect over ~20 f (`cubic-bezier(0.2,0.8,0.25,1)`); the frame whites out for 3 f; the
white region **is** the next window's interior, which develops from white and 12 px blur to its content over ~12 f.

### 8.4 Glass morph
The next scene's frosted panel appears over the current picture at 60 % opacity (the area under it turned into a 12 px dot
screen), slides 150 px while a tinted wash spreads from one side, and the picture dissolves away. The next UI arrives before
the cut, as the transition object.

### 8.5 Canvas return
For image tools: the full-frame picture scales to 0.94 inside a thin paper border, then 0.79 (cuts, not tweens); in a narrow
centred window the next picture shows, widens into a card above the first, then snaps to full frame on the strongest hit.
It says "these are pictures in an editor".

---

## 9. Word and ground seams

- **Word becomes picture:** the outer words drift apart (constant ~13 px/f, 4-6 px smear) while the middle word shrinks to
  0.87x; hard cut; the outer slots hold the next two words at the same positions, moving the same ways and decelerating
  (140-230 px over ~25 f, asymmetric); the middle slot holds a picture card at 1.8x shrinking to rest in ~5 f.
- **Carried word:** see `text.md` 9.3.
- **Ground cut on a beat:** a full-frame ground-colour change on a beat is itself a section marker; nothing else is needed.
- **Dimension swing:** the same object re-seen in another projection: flat -> isometric (the camera swings in ~6 f), isometric
  -> top-down (blocks flatten into rectangles over ~8 f), isometric -> front orthographic (a cube becomes a square card).
  Use 3D for "concept" and flat for "interface".
- **Tear step:** a new layer is revealed through a torn clip path whose edge advances in 4-5 steps held 5 f each (6 fps);
  scalloped edge (bumps 40-90 px, jaggies 20-60 px) with a 4 px white fibre fringe on paper, or a band of edge dots between
  photos; alternate the side on each new layer; the text lives on each layer.
- **Corner collapse** and **doors part:** see `exits.md`.

### 9.1 Ground swap under a layer that stays
**What:** the ground hard-cuts to another of the world's grounds on the downbeat while everything above it (the line of type,
the product, the pointer) stays exactly where it is and keeps moving. The persisting layer carries the seam.
**Numbers:** the swap is one frame, on the beat; on that frame the persisting layer re-inks for the new ground (dark ink to
white over 2 f) and takes a +2-3 % scale step; the camera's creep runs on across the cut unchanged; the new ground's texture
(grid, grain) is already drifting.
**Sells it:** the overlay not flinching. Check its contrast on both grounds (4.5:1 for every word).
**Avoid:** a fade between the grounds (mud); the overlay re-laying out on the cut.

```tsx
const g = frame < cut ? BASE : ACCENT;                                  // one frame, on the beat
const k = 1 + 0.025 * (frame >= cut ? 1 : 0) + 0.0006 * (frame - s);   // a small step, the creep runs on
<AbsoluteFill style={{ background: g }}>
  <div style={{ transform: `scale(${k})`, color: mixColor(INK, PAPER, at(frame, cut, 2, ease.out)) }}><Line /></div>
</AbsoluteFill>
```

### 9.2 Colour-flip cut with a size step
**What:** on the downbeat, ground and ink swap (ink on paper becomes paper on ink, or the accent takes the ground) and the
subject jumps one size step on the same frame. Two changes on one frame read as a decision.
**Numbers:** the subject steps x1.25-1.4 (or x0.7) on the cut with a landing blur of 4, 2, 0 px, then creeps; the ground is
flat, no gradient; nothing else changes; a kick on the frame.
**Avoid:** easing the size (that is a zoom); a third change on the same frame.

---

## 10. Hub and dive (chapter structure)

**What:** a recurring map of N objects (one per feature, N = 3 ideal, 4 max), each with a label chip, drifting 1 px/f. At
the start of each chapter the camera re-centres on a different object while the others slide out (~20 f, `ease.inOut`), then
dives into it: it scales about its centre 1 -> 6+ over 18-22 f on an accelerating ease, and on the last frame its interior is
already the chapter's ground (render the interior as the scene and the object's faces as masks). The way out is a snap
zoom-out (5 f, `ease.out`) on a hit. For the climax, bring all N together, add the product object wired to each, then scatter
them to the frame edges where they frame the lockup.

```tsx
const dive = at(frame, s, 20, ease.in);
<Camera cam={{ x: hubX[i] - 960, y: hubY[i] - 540, zoom: logScale(1, 6.5, dive) }}>
  <Hub focus={i} />
</Camera>
```
**Avoid:** a different visual for the hub each time it returns (it is a place; it must be recognised instantly).

---

**A clip inside a scaled layer.** A `clip-path` (an iris, a window, a tile mask) is measured in its own element's box: inside a
camera or any scaled layer it opens off target by the scale. Put the turn outside the camera, in frame pixels, and place
it with `toScreen` (which follows the camera's pan, zoom and tilt).

## Not in the kit yet (build these by hand from the recipes above)

- **`CarriedCut`** (or `carry()` helpers): outgoing `accel` + speed blur and incoming geometric decay with matched velocity,
  computed from one `v` and `dir`, so seams are matched by construction.
- **`Iris` options:** `lobes` (lobed outline generator), `two-circle` intersection (lens iris with rims and glow), `keys` for
  a custom radius curve (fast-slow-fast), `fromEffect={false}` (no scale/blur on the outgoing shot, needed for "iris under the
  UI" where the UI stays on top).
- **`Pixelate`:** non-square blocks, mean-colour averaging (the `feFlood` trick samples a point, it does not average), an
  explicit block-size list, and a `flare` pre-roll.
- **`TileFlood`:** isometric rhombus floor with seeded cluster flips (fast and slow modes).
- **`FlashGate`:** the two-frame exposure (light frame with ghost, dark frame with streaks).
- **`LightFlood`:** diagonal light / dark gradient overlay with a matching settle on the incoming side.
- **`CarrierWipe`**, **`PushWipe`** (two stages with a mid-hold, pushed footage at 0.5x, edge shadow), **`FlyThroughPanel`**,
  **`GlassMorph`**, **`TearStep`**, **`CanvasReturn`**, **`CellBloom`**.
- **`BlurMorph`:** A/B crossfade inside a stage blur pulse with B's shrink landing.
- **`HiddenCut`:** a camera whip helper that switches `state` on its fastest frame and applies the jump and decay.
- **`ZoomThrough` window mode:** grow a mask rect (not the whole layer) and scale the content less (depth), from a target
  element's rect rather than a point.
- **`Push`:** real directional smear (ghost copies) instead of `scaleX` stretch + isotropic blur.
- **`Hub`:** a component for N labelled objects with focus, slide-out of the others, dive and snap-out.
