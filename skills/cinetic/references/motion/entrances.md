# Big entrances

An entrance answers one question for the viewer: **where did this come from?** From the dark, from behind the card in
front, from the camera's side of the glass, from a dot, from the previous shot's motion. "From nowhere, fading up" is the
wrong answer, and it is the default answer of template films. All numbers at 30 fps, 1920x1080.

Kit: `at, mix, ease, springAt, springs, logScale, landBlur, keys, clamp` from motion; `useArrive, Card, Toast, Button,
Chip` from ui; `Camera, At` from camera; `Glow` from world; `Brand, BrandTile` from icons.

## House rules

1. **Arrive fast, settle long.** Position lands in 5-8 f; the long tail (focus, scale creep, drift) runs 15-30 f more.
2. **Decouple focus from position.** An object can land in 7 f and still be sharpening at 22 f. That is a lens, not a fade.
3. **After a cut, enter already moving** (matched to the outgoing speed) and decelerate. Entering from rest after a cut
   reads as a new slide.
4. **Vary by object.** Heroes fly or rise out of focus; cards land by shrinking or slide out from behind each other; UI
   children pop in reading order; light grows from an edge; logos converge, spin a fraction of a turn or draw on.
5. **One overshoot budget per film.** A 3-10 % pop belongs to one small family of objects (chips, a badge, tossed letters).
   Cameras, cards and heroes brake without bounce, and nothing that carries data overshoots: values, prices, progress
   bars, charts and the pointer's target land exactly.
6. **Springs by duration and bounce.** Pick how long the move should feel, then its bounce: 0 by default (no overshoot),
   about 0.15 for a brisk UI tail, about 0.3 only for a playful accent, never above 0.4. Lighter objects bounce less.
7. **Staggers are for reading.** Items the viewer reads arrive about 0.15-0.2 s (5-6 f) apart, with at most about five
   visible steps; a panel, its title and its shadow arrive as one event (its children may ripple 1-2 f apart inside it).
8. **No entrance without a sound or a reason** (see `sound-design.md`): landings, docks and pops get a transient on the
   landing frame, not the start.

---

## 1. Hero objects

### 1.1 Lens wake (focus-pull rise)
**What:** the hero rises out of optical blur: position lands in 7 f, focus clears over 22 f, scale creeps on. A soft glow
under it ramps up as it arrives.
**When:** the first product object of a dark-stage or glass film; any "here it is" moment.
**Numbers:** y +206 px -> 0 over 7 f, `cubic-bezier(0.08,0.83,1.0,1.06)`; scale 0.845 -> 1.0 over 20 f (`ease.out`), then
creep to 1.034 by f33; blur per frame 40, 34, 28, 22, 17, 13, 10, 8, 6.5, 5.5, 4.5, 3.8, 3.2, 2.7, 2.2, 1.8, 1.4, 1.1, 0.8,
0.6, 0.4, 0.2, 0; opacity 0.6 -> 1 in 2 f; glow 0 -> 1 over 14 f.

```tsx
const y = mix(at(frame, 0, 7, ease.out), 206, 0);
const s = mix(at(frame, 0, 20, ease.out), 0.845, 1) + 0.034 * at(frame, 20, 30, ease.out);
const b = mix(at(frame, 0, 22, ease.out), 40, 0);
<>
  <Glow x={960} y={600} r={420} color={accent} strength={0.4 * at(frame, 0, 14)} />
  <div style={{ transform: `translateY(${y}px) scale(${s})`, filter: `blur(${b}px)`, opacity: clamp(0.6 + frame * 0.2) }}>
    <Card t={darkUI} w={975} h={182} glass>{/* the input */}</Card>
  </div>
</>
```
**Avoid:** tying the blur to the position curve (`useArrive` does this; see kit gaps); stopping dead after focus.

### 1.2 Z-fly from the foreground
**What:** the hero enters huge from the camera side (cut by the frame edge), arcs to the centre while receding, and lands
with a small squash. A real move in depth, not a scale tween.
**When:** the first entrance of a recurring hero shape (a sphere, a tile, the mark).
**Numbers:** radius 255, 180, 150, 111, 87, 67, 58, 50, 46 over 10 f (an exponential shrink: use `logScale`); stretched to
0.82 along its travel and smeared 20-40 px on the first 5 f; at landing scaleX 1.06 / scaleY 0.94 for 2 f; then a slow
float of 20-30 px over 8 f.

```tsx
const p = at(frame, 0, 10, ease.out);
const r = logScale(255, 46, p);
const squash = frame >= 10 && frame < 12 ? 'scale(1.06, 0.94)' : '';
<At x={mix(p, 420, 960)} y={mix(p, 1020, 560)}><div style={{ width: r * 2, height: r * 2, transform: squash }}><Hero /></div></At>
```
**Avoid:** fading the hero in; a different entrance each time the hero returns (after the first, it is already there).

### 1.3 Point birth, material follows
**What:** an icon is born from a dot and grows with a quarter-turn spin; its glass container inflates **one frame behind**
it. The icon leads, the material follows.
**When:** a product's first control (a plus, a send arrow) or a seed glyph before an iris.
**Numbers:** glyph 4 -> 84 px in 9 f with a 90 deg spin (reads as an "x" mid-spin); bubble 40, 110, 150, 175, 186, 190 px
over 6 f starting 1 f later; a second element draws on its outline icon with `stroke-dashoffset` over 4 f while its bubble
fades in over 5 f and slides 90 px decelerating.

### 1.4 Construction (line, plane, solid)
**What:** an object is *built* on screen: a 2 px wireframe square, then a solid inner square (frame 2), then faces and
depth (frames 3-8) while it tumbles ~45 deg on a diagonal axis, then it settles front-on.
**When:** "structure", "order", "architecture" beats; any 3D product object.
**Numbers:** tumble over 6 f; settle with an over-damped spring `{mass: 1, stiffness: 30, damping: 12.7}` (no wobble).
Kit: `Box` inside `Camera`, faces' opacity keyed per frame.

```tsx
const solid = clamp((frame - 3) / 5);
<Camera cam={{ rx: mix(springAt(frame, fps, 3, { stiffness: 30, damping: 12.7, mass: 1 }), 45, 20), ry: -30 }}>
  <At><Box w={300} d={300} h={300 * solid} color={accent} edge="rgba(255,255,255,.7)" /></At>
</Camera>
```

### 1.5 Light first
**What:** order of assembly for a lit object: a soft glow column (frame 0), then the solid (frame 2), then the light rig
(frame 3-6): a hard-edged cone that **drops from above** (top edge reaching the frame top in 3 f) and keeps widening for
2 s.
**When:** dark-stage worlds; a reveal that should feel sacred rather than mechanical.

### 1.6 Growth from an edge
**What:** an emissive bar grows from the bottom edge, each frame covering about half the remaining distance, widening as it
goes, its colour cooling from white to the accent in 3 f. A secondary element trails by 2 f.
**Numbers:** top y 620, 328, 158, 32, 0 over 5 f; half-width 32 -> 316 px over 10 f (`cubic-bezier(0.2,0.9,0.3,1)`);
white -> light tint -> accent in 3 f; secondary lanes start 2 f later on the same curve.

### 1.7 Loaded snap
**What:** after a press, a container creeps forward, then makes **one big jump in a single frame**, then brakes. All forward
energy, no wobble. Content rises inside it, masked.
**Numbers:** press scale 1 -> 0.92 in 2 f, back over 5 f with a 1 px ring growing 0 -> 40 px and fading; creep +3-4 px/f for
6 f; jump ~60 % of the total growth in one frame; brake fractions 0.75, 0.84, 0.90, 0.94, 0.97, 0.99, 1. On jump+2 the
content rises inside: 2 f at ~120 px/f, then expo-out over 12 f.

### 1.8 Camera reveal (no entrance at all)
**What:** the element is already on screen when an occluder clears or the camera arrives; it decelerates as if carried
by the camera: 24, 12, 5, 3, 1 px/f.
**When:** a caption or wordmark after a dive through a structure. Zero animation is the most premium entrance of all.

### 1.9 Blueprint, then fill
**What:** the UI or the object draws itself as 1 px construction lines (its boxes, baselines, a few dimension ticks), then
fills into the real thing on the beat.
**When:** products about building, designing or precision; an opening; a mark with clear geometry.
**Numbers:** lines draw on with `stroke-dashoffset`, 6-10 f each on `ease.out`, longest first, 2 f apart; dimension ticks and
their values (mono) cut on beside them; 16-20 f in, each box fills in 2 f (60 % on the first frame, full on the second) and its
lines fade to 20 % over 6 f, staying as a hairline trace; the camera creeps in 3-5 % throughout.
**Sells it:** lines that match the final layout to the pixel, and the fill landing on the beat.
**Avoid:** drawing every element (draw the 5-12 main boxes; their contents fill with them); a slow fill wipe.

---

## 2. Cards and panels

### 2.1 Shrink landing
**What:** a card arrives **larger than its rest size** (as if coming toward the glass) and lands by shrinking while it
sharpens and slides to centre. No overshoot.
**When:** a card that replaces another inside a camera move or a blur; notification cards; anything "landing".
**Numbers:** scale 1.30, 1.22, 1.17, 1.13, 1.091, 1.059, 1.038, 1.023, 1.010, 1.005, 1.0 (`cubic-bezier(0.0,-0.21,0.158,1.007)`
over 11 f); blur 28 -> 0; x +190 px -> 0 with `ease.out`.

```tsx
const p = at(frame, 0, 11, ease.out);
<div style={{ transform: `translateX(${mix(p, 190, 0)}px) scale(${mix(p, 1.3, 1)})`, filter: `blur(${mix(p, 28, 0)}px)` }}>
  <Card t={darkUI} w={688} h={313} glass>{notification}</Card>
</div>
```
**Avoid:** popping up from small (reads as a notification toy, not a camera landing).

### 2.2 Momentum entry
**What:** after a carried cut, the whole incoming layout starts already moving in the outgoing direction at ~50-60 % of the
exit speed and decays geometrically, plus a short landing blur.
**Numbers:** v(n) = v0 x 0.62^n (e.g. 46, 28, 18, 11, 7, 4, 2, 1 px/f), then a 1 px/f drift; landing blur 6, 4, 2, 0 px.

```tsx
const glideIn = (f: number, v0: number, k = 0.62) => (f <= 0 ? 0 : (v0 * (1 - Math.pow(k, f))) / (1 - k));
const total = 46 / (1 - 0.62);
<AbsoluteFill style={{ transform: `translateX(${glideIn(frame, 46) - total}px)`, filter: `blur(${landBlur(frame, 0)}px)` }}>
  {scene}
</AbsoluteFill>
```

### 2.3 Peek, then rise
**What:** the next card peeks 30 px at the bottom edge for ~6 f (a promise), then rises with a short ease-in into a long
expo-out brake. The cursor or another element can ride up with it.
**Numbers:** after the peek, velocities ~67, 74, 84, 95, 112, 112, 78, 49, 34, 25, 22 ... px/f; rests ~20 f later.

### 2.4 Perspective hero card
**What:** a frame-filling card, built flat then tilted `rotateX(28deg)` under perspective 2000 px, rises from below the
frame on a very fast expo-out; the tilt never changes while it moves; it recedes slightly (scale 1.0 -> 0.98).
**Numbers:** anchor y `330 + 245 * 2^(-t / 2.9)`; vertical motion blur 60, 40, 20, 8, 0 px over the first 5 f.

### 2.5 Panel rise on light
**What:** a big UI panel rises from below the frame onto a floor light established ~8 f earlier, never quite stopping;
its children pop in reading order in the last third.
**Numbers:** top y 1078 -> 434 over 44 f, `cubic-bezier(0.13,0.47,0.14,0.90)` (-70 px/f falling to -2 px/f); children scale
0.92 -> 1 and opacity 0 -> 1 over 6 f, 2 f stagger.

```tsx
const top = mix(at(frame, 0, 44, ease.out), 1078, 434);
const child = (i: number) => { const p = at(frame, 30 + i * 2, 6, ease.out);
  return { opacity: p, transform: `scale(${mix(p, 0.92, 1)})` }; };
```

### 2.6 Cards from behind
**What:** secondary cards slide out from **exactly behind** the front card, never from the frame edges; the second lags the
first; back cards are darker so the front reads first.
**Numbers:** each slide 8 f with ~55 px/f peak blur; second card 2-22 f after the first; back cards 15 % darker; a fan adds
a stack tilt 0 -> -6.6 deg and `rotateY` +4 deg per card (perspective 1600), camera +7.8 % quart-out after the peak. Full
recipe: `cards-ui.md` (deck spread).

### 2.7 Self-dealing deck
**What:** a fan of equal cards grows in **both directions**: new front cards grow out of the current top card (from ~30 %
size, blurred, at the top card's centre, to their own rest place) and new back cards slide out from under the deck.
**Numbers:** per-card offset (+50, -54) px and rotation 2 + 0.7i deg; front entry scale 0.3 -> 1, blur 12 -> 0, opacity
0.4 -> 1 over 4-5 f; back entry 5 f; alternate front and back every 7-8 f; the deck scales 1 -> 0.98 over 12 f then drifts
up-right 0.5 px/f.

### 2.8 Notification expansion
**What:** a dark pill holding only the app icon, blurred, widens to the right over 3 f (x1 1000 -> 1100 -> 1400 -> 1650);
the icon slides 10 px; title and body type in; the banner rises 56 px expo-out. A thin sheen crosses it ~40 f later.

### 2.9 Toast pop
**What:** an overlay (it does not zoom with the stage) rises and sharpens with a hair of overshoot.
**Numbers:** y +62 px -> 0, scale 0.92 -> 1.015 -> 1.0, blur 8 -> 0, opacity 0.4 -> 1, all in 7 f.

```tsx
<Toast t={darkUI} start={324} title="Deployed" body="Build 214 is on production" />
```
Kit `Toast` drops from above with `springs.card`; for an overlay rising from below pass your own wrapper.

---

## 3. UI elements

### 3.1 Reading-order pop
Children of a UI (hero text, input, button, cards) arrive left to right, top to bottom: scale 0.92 -> 1 and opacity 0 -> 1
over 6 f, 2 f stagger. Use `useArrive(start + stagger(i, 2), 'ui')` for each child.

```tsx
{items.map((it, i) => { const a = useArrive(30 + stagger(i, 2), 'ui', { y: 12, scale: 0.92, blur: 0 });
  return <div key={i} style={a.style}>{it}</div>; })}
```
**Avoid:** every child sliding 40 px with blur (the panel already moved; children only pop).

### 3.2 Revealed by an edge, never popped
When a panel or wipe edge passes over UI, the UI is **clipped** by the edge and revealed by it (the icons at the right of
an input appear as the edge passes them). Do not pop elements that a moving edge could reveal.

### 3.3 Cut-on placement
Chips, model rows or picture cards can appear **at full size in one frame** at scattered positions, staggered ~4 f, with
their state changing ~6 f later (an Add pill flips to Added: colour swap + label swap, no tween). On a beat this reads as
confident placement. Pair each with a tick.

### 3.4 Status rows push
New rows arrive at the bottom of a block and **push the block up in a 3-frame expo step**: 44, 4, 1 px (90 % in frame 1).
Rows every 20 f for a calm process, accelerating for a montage (see `cards-ui.md`).

### 3.5 Pop with overshoot (budgeted)
Small objects that spawn from a parent (icons popping out of a device as it opens; a badge on a card) may scale from 0 with ~10 % overshoot over 4-6 f, staggered 4 f. Use once or twice per film.

```tsx
const p = springAt(frame, fps, 870, springs.pop);
<div style={{ transform: `scale(${p})` }}><Icon name="Mail" size={64} /></div>
```

### 3.6 Burst, then heap
**What:** small objects (pills, chips, tags) burst out of a line or a button into a ring, hang there, then fall with gravity
into a heap below while the line above changes. Uses the film's one overshoot family (3.5).
**Numbers:** 8-16 objects; the burst takes 8 f on `springs.pop` (~6 % overshoot) to a ring of radius 260-380 px, 1 f apart;
the ring drifts 1 px/f and turns 0.3 deg/f for ~30 f; then each falls (dy 4, 9, 16, 26, 38 px/f, seeded starts 0-6 f apart),
lands with one 8-14 px bounce and a 2 f squash, and comes to rest overlapping the others; the line above swaps its last word
on the landing (`text.md` 3.5). A soft tick per landing.
**Sells it:** gravity, and the heap's mess (seeded angles, overlaps) against the clean ring.
**Avoid:** a second bounce; a heap that lands as a tidy grid.

---

## 4. Images

### 4.1 Card shrink-to-rest
A photo card cuts on at 1.8x and shrinks to rest in ~5 f (`ease.out`), sharp, no shadow. Use when a picture replaces a
word or arrives on a hit.

### 4.2 Develop
Pictures arrive in a shared tint (the brand colour as a duotone, a magenta screen, or a white veil) and develop to their
own colours at different speeds (9-25 f). Full recipes in `imagery.md`. Combine with a rise of ~186 px expo-out and a
vertical motion blur 30 -> 0 px for a grid.

### 4.3 Pre-punched footage
A footage or still plate hard-cuts in at 1.406x and eases back to 1.0 in 15 f (1.406, 1.329, 1.265, 1.214, 1.173, 1.14 ...,
`cubic-bezier(0.16,0.60,0.33,0.88)`), with a low boom ~8 f in. A cheap and very effective impact entrance for stock.

### 4.4 Diagonal wave
A mosaic of thumbnails materialises as a wave from the top-left: cell onset = start + column + 1.4 x row, each a 2 f pop
from 0 to 1 opacity in the tint, deepening to full colour over ~30 f.

### 4.5 Placement without motion
Picture cards cut on one per 3-5 f at fixed positions around a word: no motion at all, only placement on the beat.

---

## 5. Logos and marks

The mark is the most precious object in the film. Its entrance should come **out of the film's own devices**, be short,
and leave room for a long settle.

### 5.1 Fraction spin
The badge is on screen on the cut frame already at ~2.1x, rotated +84 deg (or -62 deg), with rotational motion blur, and
un-rotates to 0 with a strong ease-out while shrinking and sliding to its rest spot.
**Numbers:** 27 f, `cubic-bezier(0.12,1,0.3,1)`; rotational blur for the first ~5 f (5 copies at 0, -0.25, -0.5, -0.75,
-1 x the per-frame step, opacity 0.2 each, only while the step > 2 deg). A variant spins without scaling in 13 f, circ-out.
The wordmark then slides out of the mark: from +180 px at 22 % opacity, sliding left over 14 f (`ease.out`).

```tsx
const p = at(frame, 0, 27, ease.out);
const rot = mix(p, 84, 0), step = rot - mix(at(frame - 1, 0, 27, ease.out), 84, 0);
const ghosts = Math.abs(step) > 2 ? [0, 0.25, 0.5, 0.75, 1] : [0];
{ghosts.map((k) => <div key={k} style={{ position: 'absolute', opacity: ghosts.length > 1 ? 0.2 : 1,
  transform: `translateX(${mix(p, 200, 0)}px) scale(${mix(p, 2.1, 1)}) rotate(${rot - step * k}deg)` }}>
  <Brand name="yourbrand" file="logos/yourbrand.svg" size={154} /></div>)}
```
**Avoid:** 360-degree spins and bounces: a full spin is a gimmick, a fraction is a flourish.

### 5.2 Slam
The wordmark hard-cuts in at 1.34x; 47 % of the travel to 1.0 happens on the first frame, the rest over ~12 f
(`cubic-bezier(0.08,0.38,0,0.87)`). Holds ~15 f, recedes on an accelerating curve and fades in its last 5 f.

### 5.3 Converge
Four diagonal ticks (the film's selection grammar) point at a small tile; the tile becomes the glyph; the ticks lengthen,
move outward 30-60 px and shrink into dots that vanish over 10 f; the wordmark cuts on and the whole lockup jumps ~200 px
in one frame, then eases the remaining ~300 px over 18-22 f. A sub hit on the jump.

### 5.4 Draw-on during its own whip
A single-stroke mark is drawn along its path (0.25, 0.38, 0.50, 0.55, 0.62, 0.72, 0.82, 0.88, 0.94, 0.98, 1.00 over 11 f)
**while** it flies in from large, upper-left and blurred (14 -> 0 px) to centre (scale 1.57 -> 1.0), then keeps shrinking
(0.97, 0.93, 0.88 over the last 40 f).

### 5.5 Stepped assembly
The mark's parts switch on in a seeded, non-linear order, one every 3 f, with no easing (sometimes one part disappears
again for a frame). Then a 2-frame scale step, not a tween. For pixel and grid worlds.

### 5.6 Built from the motifs
The closing mark is assembled from the film's recurring objects (the hero shape, a piece of the flow element, a small
block) while the world's light goes out. See `exits.md` (lights out).

### 5.7 Real third-party logos
In "works with" rows, integrations and model pickers, use **real marks** of real products in their official form:
`<BrandTile name="figma" />`, `<Brand name="stripe" color="#ffffff" />`, or an official file fetched into
`public/logos` (`<Brand name="acme" file="logos/acme.svg" />`). Arrive them as cut-on placement (3.3) or reading-order
pops (3.1); never draw a look-alike, never a generic glyph or an emoji for a logo, never animate a third-party mark
itself (no spins, no morphs).

---

## 6. Choosing an entrance

| Object | First choice | Second choice | Never |
|---|---|---|---|
| hero product object | lens wake, z-fly | construction, light first | fade-up |
| card replacing a card | shrink landing | momentum entry | pop from 0 |
| secondary cards | from behind, deck | cut-on placement | slide from frame edge |
| big UI panel | panel rise on light, peek-then-rise | perspective hero card | flat slide-in screenshot |
| UI children | reading-order pop, edge reveal | cut-on placement | each child with its own 40 px blur rise |
| chips, badges | cut-on + state flip | pop with overshoot (budgeted) | bounce on every chip |
| footage / plates | pre-punched settle, develop | carried motion | crossfade |
| logo | fraction spin, slam, converge, draw-on | stepped assembly | 360 spin, bounce, lens flare |

---

## Not in the kit yet (build these by hand from the recipes above)

- **`useArrive` couples focus to the spring.** Needed: separate `focusDur` and `posDur` (lens wake), a `from.scale > 1`
  preset (`'land'`: shrink landing, no overshoot), and an optional creep tail.
- **Momentum entry helper:** `glideIn(frame, v0, k)` / `carryIn(frame, start, {dir, v0, k})` returning the decaying offset,
  paired with `accel` exits so seams can be velocity-matched by construction.
- **Squash and stretch helper** for flying heroes (stretch along velocity, squash on landing).
- **Rotational motion blur** (`spinBlur` ghost copies driven by the per-frame angle step).
- **`Deck`** (self-dealing fan, both directions) and **`FanFromBehind`** (lagged slide-outs with tilt and darkening).
- **`Notification`** (pill-from-icon expansion with typed title/body) and an overlay toast that rises from below.
- **`LightBar`** (emissive bar growing from an edge with cooling colour and trailing secondary) and **`LightCone`**.
- **`Brand` draw-on:** a `draw` progress prop that renders the mark's path as a stroke with `stroke-dashoffset`.
- **Stepped helpers:** `onTwos(frame)` / `stepClock(frame, n)` for stepped assemblies and cut-step scale jumps.
- **Cell-grow mask:** a component that grows a rectangle by grid cells (notched outline) instead of scaling it.
