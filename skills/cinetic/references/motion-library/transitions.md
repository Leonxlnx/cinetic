# Transitions

How one scene becomes the next: velocity cuts, zoom-throughs, shared elements, continuous camera, morphs, whips, match
cuts, irises, light handovers, exit-then-enter, cross-overs, card expands, blur-throughs, push wipes, flash frames, snap
punches, text swaps, mosaics, collapses, ground flips, hard cuts done right, torn steps, glitch breaks, split panels,
dissolves, callbacks and the last handover. Each entry gives what carries across the seam, the numbers, named presets,
what makes it rich or cheap, the sound that marks it, the starter primitive, and Remotion 4 code (CPU-safe: transforms,
opacity, clip-path, masks and gradients first; blur as two fixed copies cross-faded; SVG directional blur only on fast
frames; canvas only for bitmap mosaics).

**Units.** px at 1920 x 1080. Rates are per frame at the stated fps: "x1.15-1.35 per frame at 60 fps" means the step grows
by that ratio each 60 fps frame. To convert a per-frame ratio r from 60 fps to 30 fps use r^2; to 24 fps use r^2.5.
Durations are frames at 60 fps unless noted ("f60"); halve them for 30 fps.

---

## Ten seam rules

1. **Something carries across:** motion, an element, the camera, a shape, an anchor, light, the ground or the sentence.
   Name it before you build the seam.
2. **Hide the switch in the fastest, blurriest or brightest frame.**
3. **The next shot inherits one step:** it opens at 0.5-1.15x the outgoing step and decays x0.65-0.94 per frame.
4. **Accelerate in (x1.15-1.35 per frame at 60 fps), decelerate out.**
5. **Smear only fast frames** (0.4-0.5 x the travel, above about 9 px per frame at 60 fps).
6. **One house seam per film plus three or four others;** no single kind over 40 % of the scene changes.
7. **A big change about every 2.4 s** (1.4-3.7 s); montage runs at 0.4-0.7 s per picture.
8. **No cross-fade between unrelated pictures.** A dissolve is 2-3 frames, between versions of the same subject or under a
   wash.
9. **Sound marks the seam** (a whoosh tail across a whip, a pop on a morph, a hit after a pre-hit gap).
10. **Light and dark flip only at section changes,** with a sub hit; at most twice a film.

A plain hard cut is fine for about a third of the big changes, if it carries motion, a slot or an anchor (`hard-cut-right`).
A cut on the beat is not a target: cut on the action, not on the metronome.

## Picking the house seam

Every film repeats one seam as its signature and mixes three or four others. Typical pairs: a velocity cut as the house
seam with match cuts and a light flood; an iris with morphs and exit-then-enter; a cross-over of type states with
whips; a zoom-through with shared elements; a continuous camera with atmosphere pass-throughs. Pick by what the film's
world can carry (a UI world carries velocity, morphs and card expands; a light world carries washes, irises and
flashes; a type-led film carries cross-overs, text swaps and exit-then-enter).

## Shared kit (`seamKit.ts`)

Every implementation imports this file: geometric builds and decays (`buildInto`, `decayFrom`), a seeded noise, a
directional smear above a speed threshold, fixed-level blur copies and frame helpers.

```ts
// seamKit.ts
import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** geometric per-frame rate authored at fromFps, used at toFps */
export const rateAt = (r: number, fromFps: number, toFps: number) => Math.pow(r, fromFps / toFps);
/** deterministic hash -> [0,1) */
export const hash = (i: number, seed = 1) => {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** look up a per-frame table {frame: value}, linear between keys, clamped at the ends */
export const table = (f: number, t: Record<number, number>) => {
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (f <= ks[0]) return t[ks[0]];
  if (f >= ks[ks.length - 1]) return t[ks[ks.length - 1]];
  const i = ks.findIndex((k) => k > f);
  const a = ks[i - 1], b = ks[i];
  return lerp(t[a], t[b], (f - a) / (b - a));
};
/** Offset (px, negative = before) of a move that BUILDS geometrically into a cut.
 *  vCut = speed on the last frame before the cut, r = per-frame ratio (>1). */
export const buildInto = (f: number, cut: number, vCut: number, r: number) => {
  const k = cut - f; // frames left to the cut
  if (k <= 0) return 0;
  return -vCut * (1 - Math.pow(r, -k)) / (1 - 1 / r);
};
/** Offset (px) of a move that DECAYS geometrically after a cut: first step v0, ratio d (<1). */
export const decayFrom = (f: number, cut: number, v0: number, d: number) => {
  const k = Math.max(0, f - cut);
  return (v0 * (1 - Math.pow(d, k))) / (1 - d);
};
/** speed (px/f) of the same curves, for smear */
export const speedInto = (f: number, cut: number, vCut: number, r: number) =>
  f >= cut ? 0 : vCut * Math.pow(r, -(cut - 1 - f));
export const speedFrom = (f: number, cut: number, v0: number, d: number) =>
  f < cut ? 0 : v0 * Math.pow(d, f - cut);
/** log-space scale for zooms: s0 -> s1 with an easing on log(s) (zooms must be eased in log space) */
export const logScale = (t: number, s0: number, s1: number) => Math.exp(lerp(Math.log(s0), Math.log(s1), clamp01(t)));
export const E = {
  expoIn: Easing.in(Easing.exp), expoOut: Easing.out(Easing.exp), quadIn: Easing.in(Easing.quad),
  cubicIn: Easing.in(Easing.cubic), cubicOut: Easing.out(Easing.cubic), circOut: Easing.out(Easing.circle),
  inOut: Easing.inOut(Easing.cubic), sineInOut: Easing.inOut(Easing.sin),
};
export const ramp = (f: number, a: number, b: number, ease = (x: number) => x) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** Defocus without an animated blur radius: a sharp copy and ONE copy blurred at a fixed sigma, cross-faded. */
export const Defocus2: React.FC<{sigma: number; max?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  sigma, max = 24, children, style,
}) => {
  const k = clamp01(sigma / max);
  if (k <= 0.01) return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={style}>
      <AbsoluteFill style={{opacity: 1 - k}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{opacity: k, filter: `blur(${max}px)`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Directional smear along x or y: SVG blur with an anisotropic stdDeviation, only when the move is fast. */
export const Smear: React.FC<{v: number; axis?: 'x' | 'y'; k?: number; min?: number; id: string; children: React.ReactNode}> = ({
  v, axis = 'x', k = 0.45, min = 9, id, children,
}) => {
  const len = Math.abs(v) < min ? 0 : Math.abs(v) * k; // smear length = 0.4-0.5 x travel
  if (len === 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  const sd = len / 2.5; // a Gaussian's visible length is ~2.5 sigma
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={axis === 'x' ? `${sd} 0` : `0 ${sd}`} />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: `url(#${id})`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Two layers with a hard switch at `cut`: the base of every hidden cut. */
export const CutPair: React.FC<{f: number; cut: number; out: React.ReactNode; in: React.ReactNode}> = (p) => (
  <AbsoluteFill>{p.f < p.cut ? p.out : p.in}</AbsoluteFill>
);
```

## Index

| # | slug | seam | carries |
|---|---|---|---|
| 1 | `velocity-cut` | velocity cut, hidden cut inside a whip | motion |
| 2 | `zoom-through` | zoom-through, dive into an element | element -> next ground |
| 3 | `shared-element` | shared element across the seam | element |
| 4 | `continuous-camera` | continuous camera, atmosphere pass-through | camera |
| 5 | `morph` | morph handover | shape |
| 6 | `whip` | whip, spin whip, spin plunge | camera |
| 7 | `match-cut` | match cut on an anchor | anchor |
| 8 | `iris` | iris or mask from a meaningful point | point -> place |
| 9 | `light-carried` | light flood, sweep, wash, impact | light |
| 10 | `exit-then-enter` | exit then enter on a kept ground | ground |
| 11 | `cross-over` | blur-scale overlap of two type states | sentence |
| 12 | `card-expand` | card expands into the world, or shrinks to a card | container |
| 13 | `blur-through` | blur-through, defocus cut | blur |
| 14 | `push-wipe` | push wipe, doors, push-out | edge |
| 15 | `flash-frames` | white, black, glow, inverted frames | light |
| 16 | `snap-punch` | snap zoom, punch-in, reframe | frame |
| 17 | `text-swap` | text swap in a held slot | slot |
| 18 | `pixel-mosaic` | mosaic ladders, stair fronts, cell wipes | texture |
| 19 | `collapse` | collapse to a point, implode | shape |
| 20 | `ground-flip-dip` | ground ramps, bleach, drain, flips | ground |
| 21 | `hard-cut-right` | contrast cuts, montage on a held slot, beat cuts | slot, rhythm |
| 22 | `torn-paper` | torn-paper step wipe | texture |
| 23 | `glitch-break` | stepped full-frame re-treatments | reset |
| 24 | `split-panel` | split panels with staggered swaps | anchor panel |
| 25 | `dissolve` | 2-3 frame dissolve | subject |
| 26 | `callback` | callback, replay seam | memory |
| 27 | `end-handover` | the last handover into the end card | brand |

---

## Entries

### 1. Velocity cut (and the hidden cut inside a camera whip) · `velocity-cut`

Carries: motion. Starter: `fx/Seam` `velocityCut`, `launch()` / `carriedCut()`, `fx/Montage`, `fx/Defocus` `DirBlur`.
See also `animations.md` `whip-exit-match`.

**What.** The outgoing shot accelerates, the cut lands on its fastest frame, and the incoming shot already moves the same
way and decelerates.

**Job.** A cut becomes one continuous move: UI screen to screen without cutting; an exit becomes an entrance.

**Numbers.**
- Build x1.1-1.35 per frame at 60 fps; the last frames grow x1.6-2.6 each (native rate); the last outgoing step 16-88 px.
- Incoming opens at 0.53-0.92 x the last outgoing step and decays x0.90-0.94 per frame at 60 fps; settles in 12-24 f60.
- Smear 0-0.75 x the step, only on fast frames. The whole seam spans about 0.1 s around the cut.

**Presets.**
- *Zoom whip.* Scale per frame 1.0008, 1.000, 1.0009, 1.000, 1.0031, 1.0029, 1.0031, 1.0058, 1.0092, 1.0153, 1.0363, then
  a hidden cut with a x1.353 step into the new view, which keeps braking.
- *Scroll whip.* Content scrolls up 576 px in steps of 1, 2, 2, 4, 5, 8, 15, 36, 72 px per frame; the cut to a new chat
  (at scale 1.40) lands on the 72 px frame.
- *Pull-back into a grid.* An exponential pull-back (0.99 -> 0.84 per frame); on the fastest frame the view switches to
  an infinite grid of windows at about 52 % size, then brakes 17, 9.4, 4 px.
- *Pan through.* Outgoing x steps -2.5, -2.4, -2.8, -3.6, -4.2, -7.2, -10.9, -17.6, -33.4, -88.0 px; cut; incoming -46.9,
  -14.7, -8.6, -7.1, -4.5, -4.0, -3.6, -3.2, -2.6 px.
- *Pull-back with radial blur.* Scale 0.977, 0.971, 0.963, 0.950, 0.932, 0.902, 0.857 about a high anchor, a radial zoom
  blur of 2 / 6 / 14 px on the last three frames; the next frame shows the same card flat on a new ground.
- *Pan steps.* Steps grow x1.25 with motion blur 8, 16, 32, 60 px; one frame is a single 300 px white smear; the next
  shot's cards arrive blurred 12 px and sharpen 8, 5, 3, 1.

**Rich.** A geometric build with the cut on the fastest frame; the incoming shot opening at 0.5-0.9x in the same direction
with an exponential brake; smear only on fast frames; a ground or anchor that helps (a ground flashing the accent for
5 f).

**Cheap.** An ease-in-out that stops before the cut; opposite directions; blur on every frame; the incoming shot at full
speed or at zero.

**Sound.** A click with a falling sweep (60 ms); a hit with a 2 s uplifter; a 40 ms impact; a 410 ms whoosh 500 Hz ->
4 kHz -> 1 kHz peaking 3 frames after the cut.

```tsx
// VelocityCut.tsx: horizontal pan, scroll or log-scale zoom carried through a hard cut
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {buildInto, decayFrom, speedInto, speedFrom, Smear, logScale, ramp, E} from './seamKit';

type Axis = 'x' | 'y';
export const VelocityCut: React.FC<{
  cut: number;            // first frame of the incoming shot
  vCut?: number;          // px/f on the last outgoing frame
  build?: number;         // per-frame ratio into the cut (1.25 @30 ~ x1.12 @60; last frames 1.6-2.6)
  inRatio?: number;       // first incoming step / last outgoing step (0.53-0.92)
  decay?: number;         // per-frame decay after the cut (0.85 @30, 0.93 @60)
  axis?: Axis; dir?: 1 | -1;
  smear?: number;         // 0 = crisp, 0.45 = 0.4-0.5 x travel, 0.7 = @60
  out: React.ReactNode; in: React.ReactNode;
}> = ({cut, vCut = 78, build = 1.6, inRatio = 0.7, decay = 0.85, axis = 'x', dir = -1, smear = 0.45, out, in: inc}) => {
  const f = useCurrentFrame();
  const isOut = f < cut;
  const off = isOut ? buildInto(f, cut, vCut, build) : decayFrom(f, cut, vCut * inRatio, decay);
  const v = isOut ? speedInto(f, cut, vCut, build) : speedFrom(f, cut, vCut * inRatio, decay);
  // signed travel: outgoing is -(distance still to go) and reaches 0 on the cut; incoming grows from 0. One line of motion.
  const tr = axis === 'x' ? `translateX(${dir * off}px)` : `translateY(${dir * off}px)`;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Smear v={smear ? v : 0} k={smear} axis={axis} id={`vc${cut}`}>
        <AbsoluteFill style={{transform: tr}}>{isOut ? out : inc}</AbsoluteFill>
      </Smear>
    </AbsoluteFill>
  );
};

// Hidden cut inside a zoom whip: scale table into the cut, one jump frame, expo-out after.
export const ZoomWhipCut: React.FC<{cut: number; pivot: [number, number]; out: React.ReactNode; in: React.ReactNode}> = ({cut, pivot, out, in: inc}) => {
  const f = useCurrentFrame();
  const steps = [1.0008, 1.0, 1.0009, 1.0, 1.0031, 1.0029, 1.0031, 1.0058, 1.0092, 1.0153, 1.0363]; // f cut-16 .. cut-1
  let s = 1;
  if (f < cut) {
    const k0 = cut - steps.length; // first whip frame
    for (let i = 0; i < steps.length && k0 + i <= f; i++) s *= steps[i];
  } else {
    // incoming: 1.353 jump already baked into the new framing; continue 1.070, 1.027, 1.014 ... -> 1.48
    s = logScale(ramp(f, cut, cut + 18, E.expoOut), 1.0, 1.48 / 1.353);
  }
  const [px, py] = pivot;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: `${px}px ${py}px`, transform: `scale(${s})`}}>{f < cut ? out : inc}</AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 2. Zoom-through, dive into an element · `zoom-through`

Carries: an element that becomes the next ground. Starter: `fx/Dive`, `fx/Rush`.

**What.** An exponential push centred on an element until it covers the frame; its colour or content is the next shot,
which keeps about a third of the last step and settles.

**Job.** It pushes the viewer into the product; the element is the door to the next idea.

**Numbers.** Push x1.04-1.1 per frame at 60 fps over 16-30 f60; settle 20-36 f60; the next shot carries 0.33 of the last
step; rotation 0-12 degrees; a radial smear of 0-60 px on the last frames; the whole seam 0.5-1 s.

**Presets.**
- *Bubble through white* (24 fps). Zoom x1.74 over 15 f on a quad-in with a 12-degree rotation; the bubble's radius 300,
  330, 400 px; then three frames of its white centre carry into the next scene.
- *Word box dive.* x1.42 per step on twos (x8.2 in 6 f); the cut lands inside the next word's box; a counter glyph becomes
  the frame; no smear.
- *Packshot push.* Push 1.0078, 1.0456, 1.0514, 1.0775, 1.0801, 1.0915 per step; cut to the packshot one step larger
  (x1.086), then 1.026, 1.028 decaying.
- *Square tunnel.* Rings grow 26 px per side per frame (linear), a new square every 4-5 f; the centre square becomes the
  next frame.
- *Face into the lens.* A faceted solid swings a face into the lens; one frame is a pearly field with 60-degree streaks,
  then the soft ground of the next scene.
- *Rush in.* A line grows 1.39x over 9 f about a pivot near the top while its ink moves left.

**Rich.** A log-space exponential push on a meaningful element; the element's colour becomes the next ground; a radial
smear only on the last frames; the incoming shot keeping a third of the last step; parallax while pushing.

**Cheap.** A linear scale on the frame centre; a cross-fade at the end; a static incoming shot; zooming a raster until it
pixelates.

**Sound.** Rising air or an uplifter ending in a pop or hit on the cover frame.

```tsx
// ZoomThrough.tsx: exponential log-space push into an element, cut when it covers, incoming keeps 1/3 of the step
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E, Defocus2} from './seamKit';

export const ZoomThrough: React.FC<{
  start: number; cover: number;        // push starts, element covers the frame (cut frame)
  centre: [number, number];            // the element's centre (screen px at start)
  sCover: number;                      // total scale at the cover frame
  carry?: number;                      // incoming continues: total extra scale (1.026*1.028*1.018 ~ 1.074)
  settle?: number;                     // frames to settle the carry
  rotate?: number;                     // degrees over the push
  smear?: number;                      // max radial-smear-like defocus px in the last frames
  stepped?: 1 | 2;                     // 2 = on twos
  out: React.ReactNode; in: React.ReactNode;
}> = ({start, cover, centre, sCover, carry = 1.074, settle = 30, rotate = 0, smear = 0, stepped = 1, out, in: inc}) => {
  const raw = useCurrentFrame();
  const f = stepped === 2 ? Math.floor(raw / 2) * 2 : raw;
  if (f < cover) {
    const t = ramp(f, start, cover, E.quadIn);
    const s = Math.exp(Math.log(sCover) * t);                      // exponential in log space
    const [cx, cy] = centre;
    // pull the element to the frame centre while pushing
    const tx = (960 - cx) * t, ty = (540 - cy) * t;
    const blur = smear * Math.max(0, (t - 0.7) / 0.3);
    return (
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Defocus2 sigma={blur} max={Math.max(1, smear)}>
          <AbsoluteFill style={{transformOrigin: `${cx}px ${cy}px`, transform: `translate(${tx}px,${ty}px) scale(${s}) rotate(${rotate * t}deg)`}}>
            {out}
          </AbsoluteFill>
        </Defocus2>
      </AbsoluteFill>
    );
  }
  const k = ramp(f, cover, cover + settle, E.expoOut);
  const s2 = Math.exp(Math.log(carry) * k);                          // keeps scaling, decelerating
  return <AbsoluteFill style={{overflow: 'hidden', transform: `scale(${s2 / carry})`}}>{inc}</AbsoluteFill>;
};

// Square tunnel (720p): rings grow 26 px per side per frame, a new square every 4-5 f, last one fills.
export const SquareTunnel: React.FC<{start: number; births?: number[]; fillFrom?: number; color?: string}> = ({
  start, births = [0, 4, 9, 15, 20, 24, 29], fillFrom = 29, color = '#EF4305',
}) => {
  const f = useCurrentFrame() - start;
  return (
    <AbsoluteFill style={{background: '#F9F9F9'}}>
      {births.map((b, i) => {
        const age = f - b;
        if (age < 0) return null;
        const last = i === births.length - 1;
        const half = 43 + 26 * age;                                    // 72-100 px square at birth
        const thick = last && f >= fillFrom ? half : Math.min(half, 24.5); // rings 48-49 px thick
        return (
          <div key={i} style={{position: 'absolute', left: 640 - half, top: 360 - half, width: 2 * half, height: 2 * half,
            boxSizing: 'border-box', border: `${thick}px solid ${color}`}} />
        );
      })}
    </AbsoluteFill>
  );
};
```

### 3. Shared element across the seam · `shared-element`

Carries: an element. Starter: `fx/Handover`, `fx/MatchCut`.

**What.** One element survives the seam and changes role while its surroundings leave and arrive around it (detached into
an overlay above both scenes, or held while the ground cuts under it).

**Job.** Continuity of meaning: the product carried into a new context.

**Numbers.** Surroundings out over 10-14 f60 and in over 8-16 f60; the element moves over 24-36 f60; plates under a held
subject swap every 5-6 f; the seam spans 0.3-1.3 s.

**Presets.**
- *Field from the side.* A white field slides in from the right (edge x 1190, 932, 730, 562, 416, 334, 208, 120, 34 px), a
  band about 190 px wide; the mark grows and moves right through it.
- *Period detaches.* Words vanish by cut left to right; the full stop detaches as a small square and grows; cut to a new
  ground where the square continues.
- *Cards above both scenes.* Two photo cards on a layer above both scenes keep stepping across a velocity cut.
- *Held product, cutting grounds.* The product is held while the ground cuts every 6 f (paper, flowers, fruit, grass); the
  product scales up about 12 % over the run.
- *Avatar carries.* An avatar grows in a word gap (16 -> 107 px over 10 f), a x5 cut onto it, a push 1.078 ... 1.019 per
  frame with a tilt up, then a match cut.
- *Text to button.* Text blooms to white and collapses into a glowing pill that becomes the next button.

**Rich.** The element never pops (the same box, or one inherited step); the element changes role; the surroundings use a
different device.

**Cheap.** Both scenes contain the logo and cross-fade; the element jumps in size or position; the element fades with the
scene.

**Sound.** The element keeps its own sound; a pop at the role change.

```tsx
// SharedElement.tsx: element box interpolated across two scenes; surroundings fade/blur out and in around it
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {ramp, E, Defocus2} from './seamKit';

type Box = {x: number; y: number; w: number; h: number; r?: number};
export const SharedElement: React.FC<{
  start: number; swap: number; end: number;   // move starts, background swap frame, element lands
  from: Box; to: Box;
  element: (k: number) => React.ReactNode;     // k 0..1: draw the element at its role blend (e.g. blue mark -> black inline mark)
  outScene: React.ReactNode; inScene: React.ReactNode;
  roleSwap?: number;                            // frame the element changes role
}> = ({start, swap, end, from, to, element, outScene, inScene, roleSwap}) => {
  const f = useCurrentFrame();
  const t = ramp(f, start, end, E.inOut);
  const b = {x: interpolate(t, [0, 1], [from.x, to.x]), y: interpolate(t, [0, 1], [from.y, to.y]),
    w: interpolate(t, [0, 1], [from.w, to.w]), h: interpolate(t, [0, 1], [from.h, to.h])};
  const outK = ramp(f, start, swap, E.cubicIn);            // 10-14 f@60
  const inK = ramp(f, swap, swap + 12, E.cubicOut);         // 8-16 f@60
  return (
    <AbsoluteFill>
      {f < swap + 1 && (
        <Defocus2 sigma={12 * outK} max={12} style={{opacity: 1 - outK}}>{outScene}</Defocus2>
      )}
      {f >= swap && <AbsoluteFill style={{opacity: inK}}>{inScene}</AbsoluteFill>}
      <div style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h}}>
        {element(roleSwap !== undefined ? (f >= roleSwap ? 1 : 0) : t)}
      </div>
    </AbsoluteFill>
  );
};

// Held subject, plates swap behind it every N frames, subject scale 1 -> 1.12.
export const PlateSwap: React.FC<{start: number; every: number; plates: React.ReactNode[]; subject: React.ReactNode; grow?: number; dur: number}> = ({
  start, every, plates, subject, grow = 1.12, dur,
}) => {
  const f = useCurrentFrame() - start;
  const i = Math.min(plates.length - 1, Math.max(0, Math.floor(f / every)));
  const inPlate = f - i * every;
  const push = 1 + 0.03 * Math.min(1, inPlate / every);     // each plate pushes in ~1.03 while held
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${push})`}}>{plates[i]}</AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${1 + (grow - 1) * Math.min(1, f / dur)})`}}>{subject}</AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 4. Continuous camera, atmosphere pass-through · `continuous-camera`

Carries: the camera. Starter: `lib/camera-moves.ts`, `fx/FloatDepth`. See `camera-type.md`.

**What.** One purposeful camera move carries into the next composition; a cloud, mist or foreground body passes the lens to
hide the switch.

**Job.** Space instead of an edit: one continuous world. The smoothest seam there is.

**Numbers.** 34-62 f60 long; peak speed at 40-57 % of the move; peak 16-133 px per frame at 30 fps; an occluder covering
70 % or more of the frame for 8-12 f60; the seam spans 0.4-0.9 s.

**Presets.**
- *Cloud pass.* The title drifts left 4-18 px per frame, then accelerates 25, 40, 95 px while it defocuses to sigma 10-12
  behind a foreground cloud that rushes past at 170-189 px per frame for 10 frames; the next composition is behind it.
- *Mist band.* A mist band (the brand blue at 70 %, Gaussian 60 px, 300 px tall) rises through the frame (centre y 1150,
  1000, 900, 760); the ground turns pale under it; the next scene is there when it leaves.
- *Tilt into darkness.* The white world slides up and dims to grey; the lockup assembles on a dark violet ground; an
  orchestral stab.
- *Tilt up.* An anchor rises 539, 533, 522, 505, 477, 441 px (x1.6 per frame) into the next composition.
- *Arcing move.* 5 -> 33 px per frame peaking at 40 % of the move, then x0.75-0.85 per frame, with a scale change of -1 to
  -2.2 % per frame.
- *Push without blur.* 2 -> 133 px per frame peaking at 57 %, scale up to +8 % per frame, no blur.

**Rich.** A purpose and a landing; parallax layers; the occluder in the foreground layer; the stop hidden.

**Cheap.** A 2D pan of one flat image; an aimless drift; fog as a full-frame opacity fade.

**Sound.** Band-pass noise 300 -> 2000 Hz over 440 ms; an orchestral stab on the landing.

```tsx
// CraneThrough.tsx: one tilt/crane carrying layers at parallax rates; an occluder covers the switch
import {AbsoluteFill, Img, useCurrentFrame} from 'remotion';
import {table, Defocus2, Smear} from './seamKit';

// title travel (px/f) integrated into an offset table; the plate moves 1.0x, the cloud ~2.2x
const TITLE_DY: Record<number, number> = {30: 0, 40: -20, 50: -75, 55: -120, 57: -145, 58: -163, 59: -188, 60: -228, 61: -323};
export const CraneThrough: React.FC<{start: number; plate: string; cloud: string; title: React.ReactNode; next: React.ReactNode; stop: number}> = ({
  start, plate, cloud, title, next, stop,
}) => {
  const f = useCurrentFrame();
  const g = f - start + 30;                                 // re-base to frames
  const dy = table(Math.min(g, 61), TITLE_DY) - (g > 61 ? (g - 61) * 120 : 0);
  const sigma = g < 57 ? 0 : Math.min(12, (g - 57) * 3);    // title defocus to sigma 10-12
  const cloudY = 1080 - Math.max(0, g - 57) * 180;          // foreground cloud rushes up 170-189 px/f
  return (
    <AbsoluteFill style={{background: '#EAF2F8', overflow: 'hidden'}}>
      {g < 64 ? (
        <>
          <Img src={plate} style={{position: 'absolute', width: '100%', top: 400 + dy * 1.0}} />
          <AbsoluteFill style={{transform: `translateY(${dy}px)`}}><Defocus2 sigma={sigma} max={12}>{title}</Defocus2></AbsoluteFill>
        </>
      ) : (
        <AbsoluteFill>{next /* the disc rises into view; its own move stops dead at `stop` */}</AbsoluteFill>
      )}
      {g >= 57 && g <= 68 && (
        <Smear v={180} axis="y" k={0.1} id="cloud">
          <Img src={cloud} style={{position: 'absolute', left: -200, width: 2400, top: cloudY}} />
        </Smear>
      )}
    </AbsoluteFill>
  );
};

// MistBand.tsx: a fog band rising, the frame fills, the next scene arrives moving up
export const MistBand: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame() - start;                     // 0 = the first frame of the band
  const cy = f <= 10 ? table(f, {0: 1150, 4: 1000, 7: 900, 10: 760}) : 760 - (f - 10) * 60;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: -200, right: -200, top: cy - 150, height: 300,
        background: 'linear-gradient(180deg, rgba(154,163,220,0.9), rgba(88,104,224,0.7) 40%, rgba(74,90,216,0.0))',
        filter: 'blur(60px)'}} />
      <AbsoluteFill style={{background: '#D0D3E6', opacity: f < 0 ? 0 : Math.min(0.4, f * 0.04)}} />
    </AbsoluteFill>
  );
};
```

### 5. Morph handover · `morph`

Carries: a shape. Starter: `fx/Morph`, `fx/MorphChain`, `fx/MorphPath`. See also `animations.md` `morph-container`.

**What.** One shape interpolates into the next hero on the same centre; a change of topology is hidden at the smallest,
blurriest or brightest moment (including a snap morph, a collapse to a pill, a UI send morph).

**Job.** The product's state change is the scene change.

**Numbers.** Interpolation 18-30 f60; settle 12-20 f60; a snap morph takes 2 frames with a +30 % luma flash; a collapse
under blur 8-10 f60; a swell of +52 %; the seam spans 0.1-0.35 s.

**Presets.**
- *Disc to window.* A grey disc (r 84) grows into a window, its box widening over 6 frames while the radius shrinks and the
  fill turns to the window's ground.
- *Snap morph.* A 50 % blend on the middle frame with a white-blue flash of +30 % luma for 2 frames; a cube becomes a
  concentric frosted tile.
- *Frame to chip.* A frame collapses under blur into a chip (8-10 f), drifts, squeezes, swells +52 % on a cubic-in over
  12 f, and swaps to the word.
- *Card over the face.* A frosted card slides over a face (12 px dot screen), slides left 150 px, a soft wash, and the face
  dissolves under it into the next scene.
- *Comment to pill.* A comment becomes a blue pill that arrives large and blurred while the ground darkens; it settles with
  a 0.5-degree clockwise turn and 6 px (the morph's overshoot).
- *Chip to dot.* The last chip collapses into a pill, then a dot.

**Rich.** The same centre; passing through a simpler shape; radius, size and colour all interpolating; a small overshoot
only on arrival.

**Cheap.** A scale-and-cross-fade of unrelated shapes; a path morph with mismatched points; big UI morphing into big UI;
a thumbnail growing into its own photo while the full photo already shows under it (two copies of one picture at two
scales: mark both sides `picture: true` in `fx/Handover`, so the picture covers the growing box and the next scene waits
for it to land); a container growing out of a point with its text clipped by the box (a converge pops the next element
up whole instead); an empty frame round a shrinking photo (a side that fills the frame reveals the next scene round it).

**Sound.** A 6 kHz shimmer at -22 dB; a 470 Hz pop.

```tsx
// BoxMorph.tsx: disc -> rounded card on the same centre, with colour and radius, optional snap-flash
import {AbsoluteFill, useCurrentFrame, interpolate, interpolateColors} from 'remotion';
import {ramp, E, table} from './seamKit';

export const BoxMorph: React.FC<{start: number; children?: React.ReactNode}> = ({start, children}) => {
  const f = useCurrentFrame() - start;                    // 0 = the first frame of the morph (24 fps, 720p)
  if (f < 0) return null;
  // boxes per frame [x0,y0,x1,y1]
  const K: Record<number, number[]> = {1: [440, 179, 840, 540], 2: [397, 150, 883, 569], 3: [376, 137, 903, 582],
    4: [364, 129, 915, 590], 5: [357, 123, 922, 596], 6: [349, 116, 921, 604], 18: [340, 126, 940, 594]};
  let box: number[];
  if (f < 1) box = [640 - 84, 360 - 84, 640 + 84, 360 + 84];
  else box = [0, 1, 2, 3].map((i) => table(f, Object.fromEntries(Object.entries(K).map(([k, v]) => [Number(k), v[i]]))));
  const w = box[2] - box[0], h = box[3] - box[1];
  const radius = f < 1 ? w / 2 : interpolate(f, [1, 6, 18], [Math.min(w, h) / 2, 24, 12], {extrapolateRight: 'clamp'});
  const col = interpolateColors(Math.min(f, 5), [0, 1, 2, 3, 4, 5], ['#8A8A8A', '#6B6B6B', '#818181', '#9F9F9F', '#C1C1C1', '#E5E4E3']);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: box[0], top: box[1], width: w, height: h, borderRadius: radius,
        background: f >= 6 ? '#FFFFFF' : col, overflow: 'hidden'}}>
        {f >= 6 && children /* content fills after the shape lands */}
      </div>
    </AbsoluteFill>
  );
};

// SnapMorph: 2-frame dissolve between concentric look-alikes with a +30 % luma flash
export const SnapMorph: React.FC<{at: number; a: React.ReactNode; b: React.ReactNode}> = ({at, a, b}) => {
  const f = useCurrentFrame();
  const mix = f < at ? 0 : f === at ? 0.5 : 1;
  const flash = f === at || f === at + 1 ? 0.3 : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - mix}}>{a}</AbsoluteFill>
      <AbsoluteFill style={{opacity: mix}}>{b}</AbsoluteFill>
      <AbsoluteFill style={{background: '#DDEBFF', mixBlendMode: 'screen', opacity: flash}} />
    </AbsoluteFill>
  );
};

// SendMorph: input -> warm glow -> bubble: blur up, swap at the blurriest frame, sharpen into the bubble box
export const SendMorph: React.FC<{start: number; from: {x: number; y: number; w: number; h: number}; to: {x: number; y: number; w: number; h: number};
  input: React.ReactNode; bubble: React.ReactNode}> = ({start, from, to, input, bubble}) => {
  const f = useCurrentFrame() - start;
  const t = ramp(f, 0, 14, E.inOut);
  const blur = 18 * Math.sin(Math.PI * Math.min(1, Math.max(0, f / 14)));   // 0 -> 18 -> 0 px
  const b = {x: interpolate(t, [0, 1], [from.x, to.x]), y: interpolate(t, [0, 1], [from.y, to.y]),
    w: interpolate(t, [0, 1], [from.w, to.w]), h: interpolate(t, [0, 1], [from.h, to.h])};
  return (
    <div style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
      background: f > 4 && f < 10 ? 'radial-gradient(closest-side, rgba(255,180,120,0.9), rgba(255,180,120,0))' : undefined}}>
      {f < 7 ? input : bubble}
    </div>
  );
};
```

### 6. Whip, spin whip, spin plunge · `whip`

Carries: the camera. Starter: `fx/Seam` whip, `fx/Rush`. See also `camera-type.md` whips.

**What.** The camera or the plane accelerates to a peak at about 55 % of the move and brakes; the change happens in the
fast frames; smear on fast frames only.

**Job.** Energy, and adjacency between siblings; a whip into dark is a section break.

**Numbers.** 24-40 f60; build x1.12-1.2 per frame at 60 fps; peak 110-220 px per frame at 60 fps at 55-57 % of the move;
brake x0.80-0.85 per frame; smear 0-0.5 x the step. Spin plunge: -18 degrees and x1.28 over 28 f60.

**Presets.**
- *Asymmetric whip.* Speed 4.1 ... 66.7 px per frame peaking at 55-57 %, braking 58.6, 45.0, 33.2, 27.8, 24.2, 19.2,
  16.1 ... 0.5; smear 0.40-0.50 x the step above about 18 px per frame.
- *Long whip* (24 fps). dx -2.5, -9.3, -19.7, -32.7, -51.0, -74.6, -107.2, -148.2, -186.9, -205, -212, -212, -205, -190,
  -175, -164, -132 ... -41.7 ... -2.2 px; no blur.
- *Card whips up.* A card's bottom edge goes 696 -> 164 px on `cubic-bezier(0.7, 0, 0.95, 0.5)`; the next card rises from
  below.
- *Vertical whip.* A white layer with a soft 500 px lower edge slides up and off while the card flies up; card blur 60, 40,
  20, 8, 0 px.
- *Spin whip* (24 fps). Rotation up to 18.4 degrees per frame, the cloud swelling 1.033-1.040 per frame, a rim smear up to
  120 px.
- *Spin plunge.* Counter-clockwise 0, -0.3, -0.8, -2, -4, -5.5, -8, -12, -18 degrees, scale 1.01 ... 1.28 on the same
  curve, a radial edge blur on the last third, then the cut.

**Rich.** An asymmetric speed curve; one continuous plane; smear in proportion to speed on fast frames; a light layer that
can ride the whip.

**Cheap.** A constant-speed slide; a symmetric ease peaking at 50 %; blur on every frame; the next scene from nowhere.

**Sound.** 600 Hz -> 3 kHz over 200 ms at -14 dB; 300 -> 2000 Hz over 440 ms; 800 Hz -> 2.5 kHz over 300 ms; an air pop at
4.2 kHz on the landing; a sub drop.

```tsx
// Whip.tsx: one plane panned by a speed curve; smear only above a threshold
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Smear, table} from './seamKit';

// Speeds (px/f @30), peak at 0.55-0.57; dir is the screen direction of the content
const WHIP_SPEEDS = [4.1, 4.4, 4.9, 6.0, 7.3, 7.8, 8.2, 9.2, 11.4, 12.1, 14.2, 16.0, 18.5, 20.6, 25.5, 30.9, 36.0, 45.3, 57.6, 66.7,
  66.5, 58.6, 45.0, 33.2, 27.8, 24.2, 19.2, 16.1, 12.0, 8.5, 5.5, 3.2, 1.6, 0.5];
const cum = (a: number[]) => a.reduce<number[]>((o, v, i) => (o.push((o[i - 1] ?? 0) + v), o), []);
const WHIP_POS = cum(WHIP_SPEEDS);

export const Whip: React.FC<{start: number; dir: [number, number]; scale?: number; speeds?: number[]; plane: React.ReactNode; smearK?: number}> = ({
  start, dir, scale = 1, speeds = WHIP_SPEEDS, plane, smearK = 0.45,
}) => {
  const f = useCurrentFrame() - start;
  const pos = speeds === WHIP_SPEEDS ? WHIP_POS : cum(speeds);
  const i = Math.max(0, Math.min(pos.length - 1, Math.floor(f)));
  const fr = f - Math.floor(f);
  const d = f < 0 ? 0 : (pos[i] + (pos[Math.min(pos.length - 1, i + 1)] - pos[i]) * fr) * scale;
  const v = f < 0 || f >= speeds.length ? 0 : speeds[i] * scale;
  const [dx, dy] = dir; const n = Math.hypot(dx, dy) || 1;
  const axis: 'x' | 'y' = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Smear v={v} axis={axis} k={smearK} min={18} id={`whip${start}`}>
        <AbsoluteFill style={{transform: `translate(${(dx / n) * d}px, ${(dy / n) * d}px)`}}>{plane}</AbsoluteFill>
      </Smear>
    </AbsoluteFill>
  );
};

// SpinPlunge.tsx: rotation + scale on one ease-in curve, radial edge blur, cut on the last frame
const ROT: Record<number, number> = {0: 0, 8: -0.3, 12: -0.8, 16: -2, 20: -4, 22: -5.5, 24: -8, 26: -12, 28: -18};
const SCL: Record<number, number> = {0: 1, 12: 1.01, 16: 1.03, 20: 1.06, 22: 1.09, 24: 1.13, 26: 1.19, 28: 1.28};
export const SpinPlunge: React.FC<{start: number; pivot: [number, number]; children: React.ReactNode}> = ({start, pivot, children}) => {
  const f = useCurrentFrame() - start;
  const r = table(f, ROT), s = table(f, SCL);
  const edge = Math.max(0, (f - 14) / 14);              // radial edge blur from 14 f after the start
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: `${pivot[0]}px ${pivot[1]}px`, transform: `rotate(${r}deg) scale(${s})`}}>{children}</AbsoluteFill>
      {/* radial edge softness: a blurred copy masked to the edges would cost a full-frame filter; cheaper: a vignette of the
          blurred plate pre-rendered, or skip below 4 deg/f */}
      <AbsoluteFill style={{background: `radial-gradient(closest-side, rgba(0,0,0,0) 60%, rgba(255,255,255,${0.15 * edge}) 100%)`}} />
    </AbsoluteFill>
  );
};
```

### 7. Match cut on an anchor · `match-cut`

Carries: an anchor. Starter: `fx/MatchCut`.

**What.** A hard cut keeps one anchor within about 10 px; its size may jump; the ground and the luma may change (an anchor,
a screen, a word, a motion, a graphic).

**Job.** The cheapest way to make a hard cut flow; it creates rhyme.

**Numbers.** Anchor within 10 px; a size jump of 0.28-3.62x; the incoming motion at 1 / crop of the outgoing speed, decaying
x0.72-0.82 per frame at 30 fps; a luma jump of 37-220 is fine; the seam is one frame.

**Presets.**
- *Disc pair.* Two discs (r 292) contract x0.97 into the cut; an outline ring (r 240) and a rounded frame 975 x 486 sit on
  the pair's centre at the inherited size.
- *Punch-out.* A 3.1x crop drifts 0.03 ... 7.04 px per frame (x1.15-1.2 per frame); cut; the wide shot continues at 1.86 px
  per frame (about 1 / crop) and decays x0.72-0.82.
- *Screen to frame.* A screen rect (531 x 305 px) becomes the full frame (x3.62) on a hard cut with no zoom frames.
- *Match on motion.* A line accelerates up into the cut; the logo continues the upward motion (see `velocity-cut`).
- *Match on the word.* A card's title sits where the wordmark was; the card arrives blurred and close.
- *Graphic match.* A stem drops at x 960 (its bottom at 160, 237, 277, 303, 319, 332, 341 px), continuing a vertical from
  the last shot.

**Rich.** A meaningful anchor; the motion continuing at a scaled speed; the anchor inheriting its size.

**Cheap.** Centring unrelated objects; an anchor that jumps 30-80 px; motion that stops at the cut.

**Sound.** Usually none; a tick on montage cuts.

```tsx
// MatchCut.tsx: anchor box kept across the cut; outgoing drift accelerates in, incoming continues at ~1/crop and decays
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {buildInto, decayFrom} from './seamKit';

export const AnchorMatchCut: React.FC<{
  cut: number;
  crop: number;                     // outgoing scale relative to the incoming
  anchor: [number, number];         // anchor centre in INCOMING screen px; outgoing is scaled about it
  vCut?: number; build?: number; decay?: number;  // 7.04 px/f, x1.18, x0.77 (@30)
  out: React.ReactNode; in: React.ReactNode;
}> = ({cut, crop, anchor, vCut = 7, build = 1.18, decay = 0.77, out, in: inc}) => {
  const f = useCurrentFrame();
  const [ax, ay] = anchor;
  if (f < cut) {
    const x = buildInto(f, cut, vCut, build);             // drift right, accelerating into the cut
    return (
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <AbsoluteFill style={{transformOrigin: `${ax}px ${ay}px`, transform: `translateX(${-x}px) scale(${crop})`}}>{out}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const x = decayFrom(f, cut, vCut / crop, decay);         // continues at ~1/crop of the speed
  return <AbsoluteFill style={{overflow: 'hidden', transform: `translateX(${x}px)`}}>{inc}</AbsoluteFill>;
};

// Ring carried across photo cuts: one outline ring on a kept centre, opening at the inherited radius
export const CarriedRing: React.FC<{cuts: number[]; centre: [number, number]; radii: number[]; contract?: number}> = ({cuts, centre, radii, contract = 0.985}) => {
  const f = useCurrentFrame();
  const i = cuts.filter((c) => f >= c).length - 1;
  if (i < 0) return null;
  const r = radii[i] * Math.pow(contract, f - cuts[i]);    // still contracting after the cut, then settle
  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <circle cx={centre[0]} cy={centre[1]} r={r} fill="none" stroke="#FFFFFF" strokeWidth={4} />
    </svg>
  );
};
```

### 8. Iris or mask from a meaningful point · `iris`

Carries: a point that becomes a place. Starter: `fx/Iris`. See also `effects.md` `iris`.

**What.** A mask centred on a meaningful point opens onto the next scene, already playing inside (scalloped, vesica,
porthole under UI, black disc, pixel-mosaic ring, curtains).

**Job.** An action becomes a place: "open this".

**Numbers.** A fast iris grows x1.55-1.7 per frame at 30 fps (x1.27 at 60); a soft iris takes 13-15 f; a brand iris 36 f at
30 fps; a vesica 4 f; edge 0-12 px soft; the motion inside runs 1-1.15x the outgoing motion; a house opening takes 9 f.

**Presets.**
- *Word-gap iris.* Centred in a gap between words: r 22, 44, 76, 122, 190, 295, 474, 805 px, then full (r = 22 x
  1.62^frame); a hard edge; the line inside is 1.15x the outgoing line.
- *Black disc from a button.* A hard-edged black disc grows from the clicked button: r 50, 95, 226, 370, 490, 590, 674,
  748, 813, 871, 923, 971, 1014, 1050, 1085 px ... (decelerating).
- *Porthole under the chat.* r 202, 305, 396, 472, 538, 593, 643, 688, 728, 765, 798, 828, 855 px at 24 fps under the chat
  layer; a 3 px soft edge and a 2 px rim.
- *Pill to iris.* A pill widens, then an iris opens: diameter 808, 1424, 1730, 1898 px, then full.
- *Scalloped window.* 14 lobes, a soft 12 px edge, fast-slow-fast over 36 f; the star in its centre darkens to a black hole.
- *Curtains and vesica.* Two spheres (r about 820) close like curtains; their overlap is the window, with a 3-4 px violet
  rim and a 40-80 px inner glow.

**Rich.** A meaningful (sometimes moving) centre; the next scene already moving inside; a mask with character; a rim light.

**Cheap.** A centred circle on a static frame; a linear radius; a big feather; an iris as an exit with nothing inside.

**Sound.** An 800 Hz -> 3 kHz swish (120 ms) plus a 700 Hz pop (40 ms) at -10 dBFS; a pop with an 800-930 Hz ding.

```tsx
// Iris.tsx: geometric or tabled circular iris; inside renders the next scene at its own clock
import {AbsoluteFill, useCurrentFrame, Sequence} from 'remotion';
import {table} from './seamKit';

export const GeoIris: React.FC<{start: number; centre: [number, number]; r0?: number; ratio?: number; next: React.ReactNode;
  nextStartsAt: number; prev: React.ReactNode; rim?: string}> = ({start, centre, r0 = 22, ratio = 1.62, next, nextStartsAt, prev, rim}) => {
  const f = useCurrentFrame();
  const r = f < start ? 0 : r0 * Math.pow(ratio, f - start);
  const [cx, cy] = centre;
  const far = Math.hypot(Math.max(cx, 1920 - cx), Math.max(cy, 1080 - cy));
  if (r >= far) return <AbsoluteFill><Sequence from={nextStartsAt}>{next}</Sequence></AbsoluteFill>;
  return (
    <AbsoluteFill>
      {prev}
      {r > 0 && (
        <AbsoluteFill style={{clipPath: `circle(${r}px at ${cx}px ${cy}px)`}}>
          <Sequence from={nextStartsAt}>{next}</Sequence>
        </AbsoluteFill>
      )}
      {rim && r > 0 && (
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={rim} strokeWidth={2} />
        </svg>
      )}
    </AbsoluteFill>
  );
};
// Radii per frame: pass as a table instead of a ratio
export const DISC_IRIS: Record<number, number> = {0: 50, 1: 95, 2: 226, 3: 370, 4: 490, 5: 590, 6: 674, 7: 748, 8: 813, 9: 871,
  10: 923, 11: 971, 12: 1014, 13: 1050, 14: 1085, 15: 1105};
export const PORTHOLE_RADII: Record<number, number> = {0: 202, 1: 305, 2: 396, 3: 472, 4: 538, 5: 593, 6: 643, 7: 688, 8: 728,
  9: 765, 10: 798, 11: 828, 12: 855};

// Vesica.tsx: the overlap of two circles (r 820) whose centres approach
export const Vesica: React.FC<{start: number; next: React.ReactNode}> = ({start, next}) => {
  const f = useCurrentFrame() - start;
  const d = table(f, {0: 1330, 1: 1100, 2: 800, 3: 420, 4: 0});   // centre distance (1330 px on the first frame), accelerating
  const cxA = 960 - d / 2, cxB = 960 + d / 2, cy = 600, r = 820;
  return (
    <AbsoluteFill>
      <svg width={0} height={0}>
        <defs>
          <clipPath id="vesA"><circle cx={cxA} cy={cy} r={r} /></clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{clipPath: 'url(#vesA)'}}>
        <AbsoluteFill style={{clipPath: `circle(${r}px at ${cxB}px ${cy}px)`}}>{next}</AbsoluteFill>
      </AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <circle cx={cxA} cy={cy} r={r} fill="none" stroke="#754CD9" strokeWidth={3.5} />
        <circle cx={cxB} cy={cy} r={r} fill="none" stroke="#754CD9" strokeWidth={3.5} />
      </svg>
    </AbsoluteFill>
  );
};
```

### 9. Light-carried handover · `light-carried`

Carries: light. Starter: `fx/Exposure`, `fx/Washes`, `fx/LightField`. See also `effects.md` `light-flood`.

**What.** Light crosses or fills the frame; the old picture darkens or fades under it; the cut lands inside the brightest
frames (a flood, a light-sweep wipe, a white wash, an impact wash, streaks).

**Job.** Revelation, a change of state: something took effect.

**Numbers.** 10-20 f60; soft edges 120-500 px; a wash peaking at 0.35-1; streak bands 80-220 px.

**Presets.**
- *Diagonal flood.* Left / right luma 71/85, 76/83, 84/78, 99/65, 122/36, 145/14, 153/2 over 12 f: a lavender light comes
  in diagonally from the left while the right side falls to black; the cut lands inside the light.
- *Sweeping pool.* The camera pans right, accelerating, while a light pool sweeps right to left; a bright band crosses and
  leaves.
- *White wash.* A white layer with a 500 px soft edge travels x 1650 -> -300 over 11 f on an ease-out; the macro fades
  under it; the next line cuts on at about 70 % of the run.
- *Impact wash.* On an impact, median luma 115 -> 204; the next frame a lavender-white wash with a pink ring (r 70, ring
  20 px); the ground settles over 5 f.
- *Rising panel.* A white panel with a soft 120 px top edge rises about 370 px per frame; the next line rides on it.
- *Field overlay.* The floor light dims (luma 74, 70, 63, 50), then a lavender-white field overlay 0, 0.10, 0.30, 0.55,
  0.80, 1.0 over 6 f; the dashboard desaturates under it.

**Rich.** Directional, shaped light; the frame reacting (the far side darkens, desaturates, blurs); the cut inside the
light; the new scene's light settling.

**Cheap.** A uniform fade to white and back; a directionless flash; light that does not affect the picture.

**Sound.** A reversed swell (300 ms, -16 dB); a low hit with a pad (1.1 s); a 79 Hz punch after streaks.

```tsx
// LightFlood.tsx: a directional light floods in from one side, the far side darkens, cut under the light
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E} from './seamKit';

export const LightFlood: React.FC<{start: number; cut: number; light?: string; from?: 'left' | 'right'; out: React.ReactNode; in: React.ReactNode}> = ({
  start, cut, light = '#A59CED', from = 'left', out, in: inc,
}) => {
  const f = useCurrentFrame();
  const k = ramp(f, start, cut, E.quadIn);                        // luma left 71 -> 153, right 85 -> 2
  const after = ramp(f, cut, cut + 6, E.cubicOut);                 // the new field's light settles
  const dir = from === 'left' ? '115deg' : '-65deg';
  return (
    <AbsoluteFill>
      {f < cut ? (
        <>
          {out}
          {/* darken the far side */}
          <AbsoluteFill style={{background: `linear-gradient(${dir}, rgba(0,0,0,0) 30%, rgba(0,0,0,${0.97 * k}) 85%)`}} />
          {/* the flood itself: screen-like light from the near corner */}
          <AbsoluteFill style={{background: `linear-gradient(${dir}, ${light} 0%, rgba(165,156,237,0) ${20 + 60 * k}%)`, opacity: 0.25 + 0.75 * k}} />
        </>
      ) : (
        <>
          {inc}
          <AbsoluteFill style={{background: `linear-gradient(${dir}, ${light} 0%, rgba(165,156,237,0) 70%)`, opacity: 1 - after}} />
        </>
      )}
    </AbsoluteFill>
  );
};

// WhiteWash.tsx: a white layer whose 500 px soft edge travels x 1650 -> -300 (ease-out)
export const WhiteWash: React.FC<{start: number; end: number; color?: string; under: React.ReactNode; over?: React.ReactNode; overAt?: number}> = ({
  start, end, color = '#F4F8F9', under, over, overAt,
}) => {
  const f = useCurrentFrame();
  const x = 1650 + (-300 - 1650) * ramp(f, start, end, E.cubicOut);
  const fadeUnder = 1 - ramp(f, start + 3, end + 1);
  const mask = `linear-gradient(90deg, transparent ${x - 250}px, black ${x + 250}px)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: fadeUnder}}>{under}</AbsoluteFill>
      <AbsoluteFill style={{background: color, maskImage: mask, WebkitMaskImage: mask}} />
      {over && overAt !== undefined && f >= overAt && over}
    </AbsoluteFill>
  );
};
```

### 10. Exit then enter on a kept ground · `exit-then-enter`

Carries: the ground. Starter: `fx/Seam` exit-enter, `fx/TypeStack`.

**What.** The ground never cuts; the outgoing element accelerates away under blur and fades; 0-6 f of ground only; the
incoming element arrives from blur on an expo-out.

**Job.** The next thought; the ground holds the film together.

**Numbers.** Exit 12-18 f60 (8-24 px of travel, a cubic or expo-in, opacity 1 -> 0, blur 0 -> 10-12 px); a gap of 0-6 f60;
entry 14-24 f60 from 4-12 px of blur; overshoot 6 % at most; house 18 f in all.

**Presets.**
- *Standard.* Exit over 12-18 f with steps of 2, 3, 4, 5, 6, 6, 6, 8, 12, 16, 24 px per frame, opacity to 0 and blur to
  10-12 px; a gap of 0-6 f; entry over 14-24 f from blur on an expo-out.
- *Tracking exit.* Blur 0, 1, 2, 3 px, scale 1 -> 0.97, tracking 0 -> +0.25 -> +0.6 em over 3 frames, colour to grey,
  opacity 0.8 -> 0.5; the entry drops 18 px into place.
- *One empty frame.* Exactly one frame of bare ground between the lines.
- *Whip up and out.* A card whips up and out; the next line starts blurred.
- *Under a floor light.* The wordmark dims under a rising floor light; the dashboard rises; the headline drops in.

**Rich.** The ground keeps living during the gap; an exit with character, accelerating; an entry with a different
character; a short empty moment.

**Cheap.** A same-speed fade out and in with a long gap; linear on both sides; cutting the ground.

**Sound.** Often none; a tick on the entry.

```tsx
// ExitEnter.tsx: kept ground; exit accelerates + blurs + fades; optional empty frames; entry from blur, expo-out
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E, Defocus2} from './seamKit';

export const ExitEnter: React.FC<{
  exitStart: number; exitFrames?: number; gap?: number; enterFrames?: number;
  exitDy?: number; enterDy?: number; blur?: number; tracking?: boolean;
  ground: React.ReactNode; out: React.ReactNode; in: React.ReactNode;
}> = ({exitStart, exitFrames = 8, gap = 1, enterFrames = 10, exitDy = -16, enterDy = 20, blur = 10, tracking = false, ground, out, in: inc}) => {
  const f = useCurrentFrame();
  const e = ramp(f, exitStart, exitStart + exitFrames, E.expoIn);
  const enterStart = exitStart + exitFrames + gap;
  const n = ramp(f, enterStart, enterStart + enterFrames, E.expoOut);
  return (
    <AbsoluteFill>
      {ground /* keeps moving: never cut */}
      {f < exitStart + exitFrames && (
        <AbsoluteFill style={{opacity: 1 - e, transform: `translateY(${exitDy * e}px) scale(${1 - 0.03 * e})`,
          letterSpacing: tracking ? `${0.6 * e}em` : undefined, color: tracking ? undefined : undefined}}>
          <Defocus2 sigma={blur * e} max={blur}>{out}</Defocus2>
        </AbsoluteFill>
      )}
      {f >= enterStart && (
        <AbsoluteFill style={{opacity: n, transform: `translateY(${enterDy * (1 - n)}px)`}}>
          <Defocus2 sigma={blur * (1 - n)} max={blur}>{inc}</Defocus2>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

### 11. Cross-over: blur-scale overlap of two type states · `cross-over`

Carries: the sentence. Starter: `fx/TypePairs`, `fx/Words`.

**What.** The outgoing line evaporates left to right while shrinking; the incoming line enters huge and blurred from the
side and resolves; 2-6 f overlap; the frame is never empty.

**Job.** A sentence that never stops: nothing feels cut, even across a long film.

**Numbers.** Evaporation over 5-8 f at 24 fps; the front moves about 160 px per frame and is 0.6-0.8 word widths soft; an
overlap of 2-6 f; the incoming line starts at 1.6-2.5x and settles in 14-19 f at 24 fps.

**Presets.**
- *Evaporate and arrive.* The first line evaporates left to right (a 0.6-0.8 word-width ramp over 6-8 f) while shrinking;
  the product name enters huge and blurred from the left and resolves.
- *Front positions.* The evaporation front at x 583, 716, 878, 1038, 1217 px, gone on the sixth frame; the second line one
  frame later; a planet sinks; a chip fades in.
- *Cut over the fade.* The line fades left to right; a hard cut puts the next word, huge, over the last fading letters.

**Rich.** Each layer keeps its own motion; a soft, directional, slightly blurred front; a short overlap.

**Cheap.** An opacity cross-fade of two centred lines; a hard left-to-right wipe; static lines.

**Sound.** An airy tick and a falling click sweep (-36 semitones).

```tsx
// CrossOver.tsx: outgoing evaporates L->R (soft mask front + blur) while still shrinking; incoming scales in huge from the left
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E, Defocus2, lerp} from './seamKit';

export const CrossOver: React.FC<{
  start: number;               // first frame of the evaporation
  evap?: number;               // frames of evaporation (6-8)
  inStart?: number;            // incoming appears
  settle?: number;             // incoming resolves (19 f at 24 fps)
  lineBox: [number, number];   // outgoing ink x0, x1 (px)
  out: React.ReactNode; in: React.ReactNode;
}> = ({start, evap = 6, inStart, settle = 19, lineBox, out, in: inc}) => {
  const f = useCurrentFrame();
  const s0 = inStart ?? start + 1;
  const p = ramp(f, start, start + evap, (x) => x);         // front speed constant (~160 px/f)
  const [x0, x1] = lineBox;
  const ramp_w = 0.7 * (x1 - x0) / 4;                        // soft ramp ~0.6-0.8 of a word width (4-word line)
  const front = lerp(x0 - ramp_w, x1 + ramp_w, p);
  const mask = `linear-gradient(90deg, transparent ${front - ramp_w}px, black ${front + ramp_w}px)`;
  const shrink = 1 - 0.014 * Math.max(0, f - start) * (1 + p); // keeps shrinking, faster as it leaves
  const k = ramp(f, s0, s0 + settle, E.expoOut);
  const inScale = lerp(2.2, 1, k), inX = lerp(-520, 0, k);   // huge, from the left side, to centre
  return (
    <AbsoluteFill>
      {f < start + evap && (
        <AbsoluteFill style={{transform: `scale(${shrink})`, maskImage: f >= start ? mask : undefined, WebkitMaskImage: f >= start ? mask : undefined}}>
          {out}
        </AbsoluteFill>
      )}
      {f >= s0 && (
        <AbsoluteFill style={{transform: `translateX(${inX}px) scale(${inScale})`, opacity: Math.min(1, 0.4 + k)}}>
          <Defocus2 sigma={12 * (1 - k)} max={12}>{inc}</Defocus2>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

### 12. Card expands into the world, or shrinks to a card · `card-expand`

Carries: a container. Starter: `fx/Window`, `fx/Resize`, `fx/Morph`.

**What.** A UI container grows until its rect is the frame; reversed, the picture shrinks into a card and the next card
lands.

**Job.** "Open it": the product's control explains the cut.

**Numbers.** Expand over 24-41 f60; the content swaps under a 16 px blur at 40-60 % of the expand; a settle 1.03 -> 1.0;
rotation 0-15 degrees; a shrink to 0.94 then 0.79.

**Presets.**
- *Phone to landscape.* A phone grows and rotates to landscape (about -15 degrees); the camera dives in; a loading ring and
  a sphere confirm; the screen whitens into the next scene.
- *Card on paper.* The picture at 0.94 inside a paper frame with a window onto the next picture; then 0.79; the next card
  lands over it.
- *Selection to window.* A selection box fills with a pale accent and grows about the centre into a 759 x 587 editor
  window; its handles become L-brackets.
- *Cell to card.* A table cell turns into a bar that grows into the full card (luma 3 -> 187 over 6 f).
- *Banner expand.* A banner expands from an icon pill, then into the card with a 4-degree settle (+3.4, +1.8, +1.0 % per
  frame).

**Rich.** Rect, radius and fill all animate; the content swaps under a short blur; the new screen builds with a 3-4 f
stagger; a 3D turn is possible.

**Cheap.** Scaling a card screenshot; a hard cut after a slow scale.

**Sound.** A drop kick on the landing; a pop on the settle.

```tsx
// CardExpand.tsx: a card rect grows to the frame; content cross-blurs at 40-60 %; reverse = shrink to a card
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {ramp, E, Defocus2} from './seamKit';

type R = {x: number; y: number; w: number; h: number; r: number};
export const CardExpand: React.FC<{start: number; frames: number; from: R; to?: R; card: React.ReactNode; screen: React.ReactNode; fill?: string}> = ({
  start, frames, from, to = {x: 0, y: 0, w: 1920, h: 1080, r: 0}, card, screen, fill = '#FFFFFF',
}) => {
  const f = useCurrentFrame();
  const t = ramp(f, start, start + frames, E.inOut);
  const b = (k: keyof R) => interpolate(t, [0, 1], [from[k], to[k]]);
  const mid = 1 - Math.abs(t - 0.5) * 2;                    // 0 -> 1 -> 0 around the middle
  const blur = 16 * Math.max(0, (mid - 0.2) / 0.8);
  const settle = f > start + frames ? 1 + 0.03 * Math.pow(0.55, f - start - frames) : 1;
  return (
    <div style={{position: 'absolute', left: b('x'), top: b('y'), width: b('w'), height: b('h'), borderRadius: b('r'),
      overflow: 'hidden', background: fill, transform: `scale(${settle})`}}>
      <Defocus2 sigma={blur} max={16}>{t < 0.5 ? card : screen}</Defocus2>
    </div>
  );
};

// ShrinkToCard: picture -> 0.94 -> 0.79 on paper, next card over it, snap to full on the beat
export const ShrinkToCard: React.FC<{start: number; a: React.ReactNode; b: React.ReactNode}> = ({start, a, b}) => {
  const f = useCurrentFrame() - start;
  if (f >= 3) return <AbsoluteFill>{b}</AbsoluteFill>;     // snap on the third frame
  const s = f < 1 ? 0.94 : 0.79;
  return (
    <AbsoluteFill style={{background: '#F0F0F0'}}>
      <AbsoluteFill style={{transform: `scale(${s})`}}>{a}</AbsoluteFill>
      <div style={{position: 'absolute', left: f < 1 ? 714 : 456, top: f < 1 ? 126 : 24, width: f < 1 ? 496 : 1156, height: f < 1 ? 799 : 901, overflow: 'hidden'}}>
        <AbsoluteFill style={{transform: 'translate(-456px,-24px)'}}>{b}</AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
```

### 13. Blur-through, defocus cut · `blur-through`

Carries: blur. Starter: `fx/Defocus`, `fx/RackFocus`, `fx/Seam` defocus. See also `effects.md` `defocus-exit`.

**What.** The outgoing shot defocuses while moving or scaling away; the cut lands at the blur peak; the incoming shot
resolves while keeping some velocity.

**Job.** Premium lens softness; the colour-blob variant changes the mood.

**Numbers.** Out over 12-16 f60 to a 24-40 px peak; in over 10-16 f60 keeping 0.5-0.8 of the velocity; a landing scale of
1.13 -> 1.0; the seam spans 0.2-1.4 s.

**Presets.**
- *Blur morph inside a whip.* Inside the whip's blur the window cross-dissolves into a dark glass card; the card lands
  shrinking 1.13 -> 1.0 while sharpening.
- *Blob rise.* A warm blob (three palette stops) rises from the bottom-left on a power-in curve, covering the lower 40 %;
  the picture blurs 0 -> about 40 px over 16 f; the blob becomes the next ground.
- *Blur to empty.* The whole picture blurs to an empty white frame.
- *Rows resolve.* Rows resolve with speeds 105, 55, 40, 30, 24, 19 px per frame while their sharpness doubles over 8 f.
- *Dim and bloom.* A slab dims (luma 74 -> 49 over 6 f), then after the cut 49 -> 79 -> 156 -> 205 in 3 f.

**Rich.** Blur with motion and scale; a colour field rising into the blur; a landing scale decay.

**Cheap.** A blur ramp on a static frame plus a cross-fade; an animated blur radius on a full-frame layer.

**Sound.** A whoosh at about 1.2 kHz over 310 ms.

```tsx
// BlurThrough.tsx: out blurs + scales away (quad-in), cut at the peak, in resolves (expo-out) and lands 1.13 -> 1.0
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E, Defocus2} from './seamKit';

export const BlurThrough: React.FC<{cut: number; outFrames?: number; inFrames?: number; peak?: number; land?: number;
  blob?: React.ReactNode; out: React.ReactNode; in: React.ReactNode}> = ({cut, outFrames = 8, inFrames = 7, peak = 32, land = 1.13, blob, out, in: inc}) => {
  const f = useCurrentFrame();
  if (f < cut) {
    const k = ramp(f, cut - outFrames, cut, E.quadIn);
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{transform: `scale(${1 - 0.06 * k})`}}><Defocus2 sigma={peak * k} max={peak}>{out}</Defocus2></AbsoluteFill>
        {blob && <AbsoluteFill style={{transform: `translate(${-400 * (1 - Math.pow(k, 1.3))}px, ${500 * (1 - Math.pow(k, 1.3))}px)`}}>{blob}</AbsoluteFill>}
      </AbsoluteFill>
    );
  }
  const k = ramp(f, cut, cut + inFrames, E.expoOut);
  return (
    <AbsoluteFill style={{transform: `scale(${land + (1 - land) * k})`}}>
      <Defocus2 sigma={peak * (1 - k)} max={peak}>{inc}</Defocus2>
    </AbsoluteFill>
  );
};
```

### 14. Push wipe, doors, push-out by the next element · `push-wipe`

Carries: an edge. Starter: `fx/Wipe`, `fx/Slices`.

**What.** A hard edge pushes the old shot (which moves first); or the layout splits like doors and the next element rises
through; or a new element shoves the old one out.

**Job.** Cause and effect; the layout becomes the transition.

**Numbers.** The edge enters at 70-90 px per frame at 60 fps and decays x0.79-0.85 per frame at 30 fps; the old shot moves at
0.60-0.63 of the edge speed; 40-48 f60. Doors grow x1.5 per frame over 12 f at 24 fps. A half-frame push takes 20-26 f60;
streaks 0.28-0.34 x the step.

**Presets.**
- *Edge push.* The old shot moves first (4, 10, 20, 32 px); the edge follows at 142, 134, 106, 84, 66, 52, 44, 38, 32, 26,
  24, 20, 18, 16, 12, 12, 10, 8, 6, 6, 4 px per frame and stops at 48 % of the width; the old shot moves at 0.6x the edge.
- *Doors.* A card peeks 31 px; the doors open 0.3, 3.5, 5.6, 8.7, 13.4, 19.9, 28.6, 44.4, 79.5, about 256, 257 px per frame
  (x1.5 per frame); the card rises through them (its top 976 -> 168, peaking at about 110 px per frame).
- *Toast push.* A toast rises from the bottom and pushes the card up and out.
- *Half-frame push.* The phone leaves up 6, 8, 11, 13, 18, 26, 42, 66, 91 px per frame; cut; the next shot moves 94, 66, 47,
  34, 25, 19 (x0.7-0.75 per frame); the copy rewrites in place.
- *Layout in and out.* The layout comes in from below on a circ-out (dy +260 -> +3 over 57 f) and leaves on a quad-in (-28
  px per frame at the cut), with vertical motion blur at both ends.

**Rich.** The old shot reacting (moving first, at 0.6x); an edge speed profile with a streak; back-loaded doors with the card
riding their speed.

**Cheap.** A feathered wipe on a static shot; a linear slide; doors on a symmetric ease.

**Sound.** A punchy impact with a 1.2 s ring; a pop per toast.

```tsx
// PushWipe.tsx: two-stage push wipe from the edge steps below; old shot pushed at 0.62x the edge
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Smear} from './seamKit';

const PRE = [4, 10, 20, 32];                                   // old shot moves first (4 f)
const STAGE1 = [142, 134, 106, 84, 66, 52, 44, 38, 32, 26, 24, 20, 18, 16, 12, 12, 10, 8, 6, 6, 4]; // edge (21 f)
const STAGE2 = [6, 10, 10, 14, 18, 20, 26, 30, 38, 44, 52, 60, 68, 76, 82];                        // edge leaves (from hold end)
const sum = (a: number[], n: number) => a.slice(0, Math.max(0, Math.min(a.length, n))).reduce((s, v) => s + v, 0);

export const PushWipe: React.FC<{start: number; hold?: number; panel: React.ReactNode; under: React.ReactNode; W?: number}> = ({
  start, hold = 0, panel, under, W = 1920,
}) => {
  const f = useCurrentFrame() - start;                        // 0 = the old shot's first move
  const e1 = f - PRE.length;                                  // edge stage-1 frame index
  const s2Start = PRE.length + STAGE1.length + hold;
  let edge = 0, v = 0;                                        // edge = px the panel has covered from the right
  if (e1 >= 0) { edge = sum(STAGE1, e1); v = STAGE1[Math.min(STAGE1.length - 1, e1)] ?? 0; }
  if (f >= s2Start) { const k = f - s2Start; edge = sum(STAGE1, STAGE1.length) + sum(STAGE2, k); v = STAGE2[Math.min(STAGE2.length - 1, k)]; }
  const oldShift = f < PRE.length ? -sum(PRE, f) : -sum(PRE, PRE.length) - 0.62 * Math.min(edge, sum(STAGE1, STAGE1.length));
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translateX(${oldShift}px)`}}>{under}</AbsoluteFill>
      <Smear v={v} k={0.31} min={8} id={`pw${start}`}>
        <AbsoluteFill style={{transform: `translateX(${W - edge}px)`}}>{panel}</AbsoluteFill>
      </Smear>
    </AbsoluteFill>
  );
};

// DoorSplit.tsx: doors (x1.5/f, back-loaded) + the card rising through the gap at the doors' speed turned 90 deg
const DOOR_V = [0.3, 3.5, 5.6, 8.7, 13.4, 19.9, 28.6, 44.4, 79.5, 256, 257, 257];
const RISE_TOP = [976, 910, 836, 752, 658, 546, 436, 358, 308, 274, 252, 232, 204, 188, 176, 168];
export const DoorSplit: React.FC<{start: number; left: React.ReactNode; right: React.ReactNode; card: React.ReactNode}> = ({start, left, right, card}) => {
  const f = useCurrentFrame() - start;                        // 0 = doors start; the card rises from 5
  const d = sum(DOOR_V, f);
  const top = f < 5 ? 1040 : RISE_TOP[Math.min(RISE_TOP.length - 1, f - 5)];
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translateX(${-d}px)`}}>{left}</AbsoluteFill>
      <AbsoluteFill style={{transform: `translateX(${d}px)`}}>{right}</AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top}}>{card}</div>
    </AbsoluteFill>
  );
};
```

### 15. Flash frames: white, black, glow, inverted · `flash-frames`

Carries: light. Starter: `fx/Flashes`, `fx/CutFx`. See also `effects.md` `flash-frame`.

**What.** 1-6 frames of designed light (or its negative) replace the picture at the seam (a white frame, a glow frame, an
inverted frame, a flash inside a whip, a capture flash, a white matte).

**Job.** Punctuation: the old thing became the new thing.

**Numbers.** 1-6 frames; a decay over 3-4 frames; the incoming shot arrives about 3x faster than the whip that led in.

**Presets.**
- *Ghost flash in a whip.* The whip builds x1.25 per frame to 52 px per frame; one frame `#EDEDED` with a 30 px blurred grey
  ghost of the box and grey smears; then the next shot.
- *Single white frames.* One pure white frame between statements; two glow frames; one inverted frame with a 4 px glow, one
  dark navy frame, then the cut.
- *Flash at the end of a push.* A stepped push 1.000, 1.020, 1.067, 1.143, 1.248, 1.379, 1.529, then a flash cut.
- *Overlay decay.* A white overlay 1, 0.667, 0.333, 0 over 4 frames.
- *Capture flash.* `brightness(2.6) contrast(1.6)` on the picture; the layout swaps under the flash.
- *White matte.* A white matte on the subject 1.0, 0.6, 0.12, 0.

**Rich.** A flash with content (a ghost, streaks); inside motion; the next shot arriving fast.

**Cheap.** A generic 3-frame white fade on a still; a flash on every cut; a silent flash.

**Sound.** A pop with a falling sweep (-21 semitones, 130 ms); a pop on the inverted frame.

```tsx
// FlashFrames.tsx: a 1-2 frame flash with content (ghost / streaks / invert), then the next shot arrives fast
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {hash, decayFrom, Smear} from './seamKit';

export const GhostFlash: React.FC<{at: number; ghost?: React.ReactNode; out: React.ReactNode; in: React.ReactNode; slideV0?: number}> = ({
  at, ghost, out, in: inc, slideV0 = 220,
}) => {
  const f = useCurrentFrame();
  if (f < at) return <AbsoluteFill>{out}</AbsoluteFill>;
  if (f === at) // the white frame with a 30 px blurred ghost of the old layout
    return (
      <AbsoluteFill style={{background: '#EDEDED'}}>
        {ghost && <AbsoluteFill style={{filter: 'blur(30px)', opacity: 0.55}}>{ghost}</AbsoluteFill>}
      </AbsoluteFill>
    );
  if (f === at + 1) // the black streak frame
    return (
      <AbsoluteFill style={{background: '#060606'}}>
        {Array.from({length: 12}).map((_, i) => {
          const y = 401 + hash(i, 7) * 214, w = 300 + hash(i, 9) * 700, x = 1714 - w - hash(i, 3) * 200;
          return <div key={i} style={{position: 'absolute', left: x, top: y, width: w, height: 2 + 2 * hash(i, 5),
            background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,${0.25 + 0.64 * hash(i, 4)}))`, filter: 'blur(1px)'}} />;
        })}
      </AbsoluteFill>
    );
  const x = decayFrom(f, at + 2, slideV0, 0.8);             // opens at ~3x the whip's last step, x0.78-0.85/f
  const v = slideV0 * Math.pow(0.8, f - at - 2);
  return (
    <Smear v={v} k={0.45} id={`gf${at}`}>
      <AbsoluteFill style={{transform: `translateX(${slideV0 / 0.2 - x}px)`}}>{inc}</AbsoluteFill>
    </Smear>
  );
};

export const InvertFrame: React.FC<{at: number; out: React.ReactNode; in: React.ReactNode}> = ({at, out, in: inc}) => {
  const f = useCurrentFrame();
  if (f < at) return <AbsoluteFill>{out}</AbsoluteFill>;
  if (f === at) return <AbsoluteFill style={{filter: 'invert(1) hue-rotate(180deg) drop-shadow(0 0 4px rgba(255,255,255,0.6))'}}>{out}</AbsoluteFill>;
  if (f === at + 1) return <AbsoluteFill style={{background: '#0A1020'}} />;
  return <AbsoluteFill>{inc}</AbsoluteFill>;
};

export const CaptureFlash: React.FC<{start: number; switchAt: number; end: number; a: React.ReactNode; b: React.ReactNode}> = ({start, switchAt, end, a, b}) => {
  const f = useCurrentFrame();
  const on = f >= start && f < end;
  return <AbsoluteFill style={{filter: on ? 'brightness(2.6) contrast(1.6) saturate(1.8)' : undefined}}>{f < switchAt ? a : b}</AbsoluteFill>;
};
```

### 16. Snap zoom, punch-in, reframe cut · `snap-punch`

Carries: the frame. Starter: `fx/SnapZoom`. See also `animations.md` `punch-in`.

**What.** The same scene re-framed in 1-2 frames: a punch-in with a landing blur, a x5-x8 snap zoom, or a hidden snap zoom
under a defocus and a luma flash.

**Job.** Look closer without leaving the scene; it keeps long UI holds alive.

**Numbers.** Punch x1.07-1.5; big jumps x1.97-5; snaps x5.8-7.9; punch-outs x0.11-0.52; a landing blur of 3-6 px over 2-3 f;
a creep of 0.4-0.9 % afterwards.

**Presets.**
- *Snap onto the caret.* x5.8 then x1.364 (x7.9 in total) on the caret, no blur; a snap out x0.112 over 2 frames.
- *Punch with landing blur.* x1.347 about the centre with blur 6, 4, 2, 0 px; later x1.126 with blur 3, 1.5, 0; then a creep
  1.000 -> 1.006 -> 1.008 -> 1.009.
- *Hidden snap-out.* A slow pull 0.998 ... 0.961, a jump 0.85 -> 0.52 under a defocus that clears in 5-6 f and a luma lift
  92 -> 148, then 0.967 ... 0.994.
- *Cut onto the avatar.* A x5 cut onto the avatar, then a push 1.078, 1.045, 1.034, 1.024, 1.022, 1.019 per frame.

**Rich.** Centred on what changes next; a landing blur and a slow creep; exact 2-frame snaps.

**Cheap.** A wandering 15-frame zoom; a punch on nothing; a pixelated raster.

**Sound.** A tick on each punch-in.

```tsx
// PunchIn.tsx: cut to a closer framing about a centre, landing blur 6/4/2/0, then a slow creep
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Defocus2} from './seamKit';

export const PunchIns: React.FC<{cuts: {at: number; k: number; blur: number[]}[]; centre?: [number, number]; children: React.ReactNode}> = ({
  cuts, centre = [960, 540], children,
}) => {
  const f = useCurrentFrame();
  let s = 1, sigma = 0;
  for (const c of cuts) {
    if (f >= c.at) {
      s *= c.k;
      const i = f - c.at;
      sigma = i < c.blur.length ? c.blur[i] : 0;
      s *= 1 + 0.009 * (1 - Math.exp(-(f - c.at) / 6)); // creep 1.000 -> 1.006 (5 f) -> 1.009
    }
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: `${centre[0]}px ${centre[1]}px`, transform: `scale(${s})`}}>
        <Defocus2 sigma={sigma} max={6}>{children}</Defocus2>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
// <PunchIns cuts={[{at: 90, k: 1.347, blur: [6, 4, 2]}, {at: 110, k: 1.126, blur: [3, 1.5]}]}>{card}</PunchIns>

// SnapZoom2: x5.8 then x1.364 more on two frames, about the caret, no blur
export const SnapZoom2: React.FC<{at: number; caret: [number, number]; children: React.ReactNode}> = ({at, caret, children}) => {
  const f = useCurrentFrame();
  const s = f < at ? 1 : f === at ? 5.8 : 7.9;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: `${caret[0]}px ${caret[1]}px`, transform: `translate(${(960 - caret[0]) * (s > 1 ? 1 : 0)}px, 0) scale(${s})`}}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 17. Text swap in a held slot · `text-swap`

Carries: the slot. Starter: `fx/Roll`, `fx/Words`. See also `animations.md` `swap-drum`.

**What.** The slot holds; the words change inside a camera move, under blur, by a push-up stack, by a letter swap or by an
ink-in.

**Job.** The slot is the speaker.

**Numbers.** A blur swap 18-22 f60; a push-up 16-20 f60; an ink-in 10-20 f60; a swap zoom rate of 0.95-1.048 per frame.

**Presets.**
- *Swap in a push.* Scale per frame 1.000 (held 8 f), 1.005, 1.010, 1.010, 1.015, 1.022, 1.030, 1.039, 1.049, 1.064, 1.079,
  1.104, 1.133, 1.178; the swap lands on the fastest frame.
- *Push-up stack.* The old line pushes up 5, 12, 39, 35, 18, 13, 8, 6, 2 px per frame; the new line rises under it.
- *Letter swap.* One phrase turns into another letter by letter in place (outgoing letters drop, new ones rise).
- *Blur swap.* The line blurs out, one empty frame, the next line blurs in.

**Rich.** The swap hidden in speed or blur, or made an event; a smooth re-centring.

**Cheap.** A cross-fade in place; the centre jumping; a typewriter on every swap.

**Sound.** A 240 Hz thump with a 2 kHz tick.

```tsx
// SwapInPush.tsx: the copy swaps on the fastest frame of the push
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {table} from './seamKit';

const S: Record<number, number> = {72: 1, 79: 1, 80: 1.005, 81: 1.01, 82: 1.01, 83: 1.015, 84: 1.022, 85: 1.03, 86: 1.039, 87: 1.049,
  88: 1.064, 89: 1.079, 90: 1.104, 91: 1.133, 92: 1.178, 93: 1.235};
export const SwapInPush: React.FC<{offset: number; swapAt?: number; pivot?: [number, number]; a: React.ReactNode; b: React.ReactNode}> = ({
  offset, swapAt = 93, pivot = [960, 540], a, b,
}) => {
  const f = useCurrentFrame() + offset;                     // map to frames
  const s = table(f, S);
  return (
    <AbsoluteFill style={{transformOrigin: `${pivot[0]}px ${pivot[1]}px`, transform: `scale(${s})`}}>
      {f < swapAt ? a : b}
    </AbsoluteFill>
  );
};

// PushUpStack: new line enters one pitch below and pushes the old up; old ends at 40 %
const STEPS = [5, 12, 39, 35, 18, 13, 8, 6, 2];
export const PushUpStack: React.FC<{start: number; pitch: number; old: React.ReactNode; next: React.ReactNode}> = ({start, pitch, old, next}) => {
  const f = useCurrentFrame() - start;
  const moved = STEPS.slice(0, Math.max(0, Math.min(STEPS.length, f))).reduce((s, v) => s + v, 0);
  const k = moved / STEPS.reduce((s, v) => s + v, 0);
  return (
    <AbsoluteFill style={{transform: `translateY(${-pitch * k}px)`}}>
      <div style={{opacity: 1 - 0.6 * k}}>{old}</div>
      <div style={{position: 'absolute', top: pitch, left: 0, right: 0, opacity: Math.min(1, k * 2)}}>{next}</div>
    </AbsoluteFill>
  );
};
```

### 18. Pixel and mosaic transitions · `pixel-mosaic`

Carries: texture. Starter: `fx/Pixel`, `fx/BlockStep`. See also `effects.md` `pixel-mosaic`.

**What.** Blocks replace the picture: mosaic ladders, stepped stair fronts, slanted cell wipes, 2-frame block glitches.

**Job.** Digital material for AI and developer brands; texture on a cut.

**Numbers.** Mosaic out 7 f60 and in 7 f60; a develop of 40 f60; a stair wipe of 25 f at 25 fps; blocks 22-30 px; a cell wipe
of 71 f60; a glitch of 11 f at 30 fps.

**Presets.**
- *Mosaic ladder.* Out through grids of 9 x 9, 14 x 13, 22 x 19, 34 x 28, 56 x 42, 96 x 60, 160 x 77 cells (wider than
  tall); cut; in through 190 x 83, 96 x 60, 46 x 34, 27 x 23, 18 x 16, 13 x 12, 10 x 10; each cell its true mean colour.
- *Stair front.* A grey stair front from the top-left in 22-24 px blocks, on twos, with a tinted front (yellow, pink,
  violet); coverage 0.003, 0.024 ... accelerating.
- *Cell wipe.* 64 x 36 cells of 30 px in the accent; progress s = column + 0.42 x row; a timing table T(s) accelerating
  over 71 f; jitter -2 to +2 f; 2 % of cells as early islands.
- *Block glitch.* Flat rectangles in three palette colours, 2 f each; the scene is replaced underneath on the middle frame.

**Rich.** A stepped ladder, wider than tall; an anchored grid with true mean colours; a ragged front on twos; a
brand-coloured front.

**Cheap.** A pixelated scaled screenshot with even steps; a uniform diagonal; random noise blocks.

**Sound.** A 2 -> 8 kHz riser with 10-13 kHz clicks per step; 13-14.7 kHz clicks.

```tsx
// CellWipe.tsx: W1: 64x36 cells of 30 px switch on along s = col + 0.42*row with seeded jitter; stays on
import {useEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, delayRender, continueRender, staticFile} from 'remotion';
import {hash, table} from './seamKit';

const T: Record<number, number> = {1: 212, 3: 223, 5: 231, 7: 234, 9: 238, 11: 240, 13: 243, 15: 245, 17: 247, 19: 249, 21: 250, 23: 252,
  25: 253, 27: 254, 29: 255, 31: 256, 33: 257, 35: 258, 39: 259, 41: 260, 45: 261, 47: 262, 51: 263, 55: 264, 59: 265, 61: 266, 67: 267,
  71: 268, 77: 269};
const jitter = (i: number) => {                             // jitter -2..+2 f, mostly 0 or +-1; 2 % islands 4-8 f early
  const u = hash(i, 11);
  if (hash(i, 13) < 0.02) return -(4 + Math.floor(hash(i, 17) * 5));
  return u < 0.05 ? -2 : u < 0.25 ? -1 : u < 0.75 ? 0 : u < 0.95 ? 1 : 2;
};
export const CellWipe: React.FC<{offset?: number; color?: string; cell?: number}> = ({offset = 0, color = '#79CD05', cell = 30}) => {
  const f = useCurrentFrame() + offset;                     // offset maps to frames
  const rects: React.ReactElement[] = [];
  for (let row = 0; row < 36; row++) for (let col = 0; col < 64; col++) {
    const s = col + 0.42 * row;
    const on = table(Math.max(1, s), T) + jitter(row * 64 + col);
    if (f >= on) rects.push(<rect key={row * 64 + col} x={col * cell} y={row * cell} width={cell} height={cell} />);
  }
  return <svg width={1920} height={1080} style={{position: 'absolute'}} shapeRendering="crispEdges"><g fill={color}>{rects}</g></svg>;
};

// Mosaic of a bitmap: canvas downscale with area averaging, upscale without smoothing; block ladder per frame
export const MosaicImg: React.FC<{src: string; block: [number, number] | null}> = ({src, block}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const h = delayRender('mosaic');
    const img = new Image(); img.src = staticFile(src);
    img.onload = () => {
      const c = ref.current!; const ctx = c.getContext('2d')!;
      if (!block) { ctx.drawImage(img, 0, 0, 1920, 1080); continueRender(h); return; }
      const [bw, bh] = block, w = Math.ceil(1920 / bw), hh = Math.ceil(1080 / bh);
      const off = document.createElement('canvas'); off.width = w; off.height = hh;
      const o = off.getContext('2d')!; o.imageSmoothingQuality = 'high'; o.drawImage(img, 0, 0, w, hh);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w, hh, 0, 0, w * bw, hh * bh);
      continueRender(h);
    };
  }, [src, block?.[0], block?.[1]]);
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0}} />;
};
export const MOSAIC_OUT: [number, number][] = [[9, 9], [14, 13], [22, 19], [34, 28], [56, 42], [96, 60], [160, 77]];
export const MOSAIC_IN: [number, number][] = [[190, 83], [96, 60], [46, 34], [27, 23], [18, 16], [13, 12], [10, 10]];
```

### 19. Collapse to a point, implode · `collapse`

Carries: a shape. Starter: `fx/Implode`. See also `animations.md` `collapse-to-icon`.

**What.** The frame or the hero contracts into a small shape on a new ground; the next scene starts there, or a hard cut
follows.

**Job.** Contraction: a problem, an ending, a seed.

**Numbers.** A frame collapse of 3-4 f at 30 fps; a square shrinking over 28 f; the content shrinking 0.6-0.75 as fast as the
frame; a final step of -30 %.

**Presets.**
- *Frame to square.* The left and right edges close over 2 f, then top and bottom over 1 f: a square that shrinks,
  decelerating then accelerating into the cut; the text inside scales 0.75, then 0.60.
- *Chip to dot.* A chip becomes a pill, then a dot.
- *Grid to point.* A grid becomes a square, then a point, shrinking 2.4-4.5 % per frame and then one final -30 % step.
- *Implode.* A glass button implodes into the next scene.

**Rich.** An anisotropic collapse; content shrinking less than the frame; a second acceleration into the cut; a whoosh.

**Cheap.** A uniform `scale(0)` to the centre.

**Sound.** A noise sweep 600 Hz -> 6 kHz over 300 ms.

```tsx
// FrameCollapse.tsx: L/R edges close first, then T/B, to a square that shrinks in-out until the cut
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {ramp, E} from './seamKit';

export const FrameCollapse: React.FC<{start: number; cut: number; ground?: string; children: React.ReactNode}> = ({start, cut, ground = '#3C4BE0', children}) => {
  const f = useCurrentFrame();
  const lr = ramp(f, start, start + 2, E.cubicIn);           // 2 f
  const tb = ramp(f, start + 2, start + 3, E.cubicIn);       // 1 f
  const sq = ramp(f, start + 3, cut, E.sineInOut);           // square keeps shrinking, decel then accel
  const side0 = 620;                                          // square side after the collapse (~ height of the text block area)
  const w = f < start + 3 ? interpolate(lr, [0, 1], [1920, side0]) : side0 * (1 - 0.55 * sq);
  const h = f < start + 2 ? 1080 : f < start + 3 ? interpolate(tb, [0, 1], [1080, side0]) : side0 * (1 - 0.55 * sq);
  const textS = f < start + 3 ? 1 - 0.25 * lr : 0.75 - 0.15 * sq;  // 0.75 after the collapse, 0.60 at the cut
  return (
    <AbsoluteFill style={{background: ground}}>
      <div style={{position: 'absolute', left: 960 - w / 2, top: 540 - h / 2, width: w, height: h, background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: w / 2 - 960, top: h / 2 - 540, width: 1920, height: 1080, transform: `scale(${textS})`}}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};
```

### 20. Ground flip and dip · `ground-flip-dip`

Carries: the ground. Starter: `fx/Grounds`, `fx/Grades`. See also `backgrounds.md`.

**What.** The ground changes on purpose: a designed ramp, a 1-frame grey flash and a fade-up, a heat bleach with the colour
leading, a drain to grey, hard flips with the content held.

**Job.** Mood and section; a dip with a morph says same idea, new world.

**Numbers.** A dip of 13 f at 24 fps (20 f60); a fade-up of 6 f at 30 fps; a bleach of 10 f at 24 fps; a drain of 9-10 f at
30 fps; flips three times, 5 f apart.

**Presets.**
- *Dip to black.* `#F9F9F9`, `#F8F8F8`, `#F4F4F4`, `#F1F1F1`, `#E6E6E6`, `#DADADA`, `#C4C4C4`, `#9A9A9A`, `#525252`,
  `#252525`, `#101010`, `#050505`, `#010101`, `#000000` (slow, then fast, then slow); chips keep acting during it.
- *Dip from the top.* The dark falls from the top: the top corners reach black before the bottom (for example top-left /
  top-centre / bottom `#E8E8E8` / `#EBEBEB` / `#EFEFEF` -> `#000000` / `#010101` / `#565656` over 16 f), black by frame 20.
- *Fade-up.* `#2B2B2B`, `#7B7B7B`, `#A3A3A3`, `#C4C4C4`, `#DFDFDF`, `#E7E7E7`, `#E4E4E4` (a slight settle back).
- *Heat bleach.* Ink black -> dark olive -> gold-tan -> peach -> white; no scale, no blur, no move.
- *Warm pulse.* 15 frames: grey -> yellow -> peach over 7 f, then a bleach to white over 8 f.
- *Mode flip.* A hard cut to the same layout in dark mode in the middle of a collapse.

**Rich.** A non-linear ramp with the content acting during it; the hue leading the luminance in a bleach; flips only at
section changes, with a sub hit.

**Cheap.** A linear fade to black and back up; a flip in the middle of a sentence; a dip that carries nothing.

**Sound.** A 265 ms swell; a 0.5 s reversed swell; a sub hit or sub drop.

```tsx
// GroundRamp.tsx: a ground colour ramp under content that keeps doing its own thing
import {AbsoluteFill, useCurrentFrame, interpolateColors} from 'remotion';

const DIP_TO_BLACK = ['#F9F9F9', '#F8F8F8', '#F4F4F4', '#F1F1F1', '#E6E6E6', '#DADADA', '#C4C4C4', '#9A9A9A', '#525252', '#252525', '#101010',
  '#050505', '#010101', '#000000'];
export const GroundRamp: React.FC<{start: number; ramp?: string[]; children?: React.ReactNode}> = ({start, ramp = DIP_TO_BLACK, children}) => {
  const f = useCurrentFrame() - start;
  const bg = interpolateColors(Math.max(0, Math.min(ramp.length - 1, f)), ramp.map((_, i) => i), ramp);
  return <AbsoluteFill style={{background: bg}}>{children}</AbsoluteFill>;
};

// HeatBleach.tsx: ink colour leads the fade black -> olive -> gold-tan -> peach -> white, no scale, no blur
export const HeatBleach: React.FC<{start: number; frames?: number; children: (color: string) => React.ReactNode}> = ({start, frames = 9, children}) => {
  const f = useCurrentFrame() - start;
  const t = Math.max(0, Math.min(1, f / frames));
  const c = interpolateColors(t, [0, 0.25, 0.5, 0.75, 1], ['#111111', '#4A4A1E', '#C9A66B', '#F6C9A8', '#FFFFFF']);
  return <>{children(c)}</>;
};
```

### 21. Hard cut done right · `hard-cut-right`

Carries: a slot or a rhythm. Starter: `fx/Montage`, `fx/HardStep`.

**What.** A plain cut that still carries motion, a slot or a deliberate ground flip; or a montage where the slot holds and
the pictures change on a rhythm.

**Job.** Rhythm and contrast: abundance or reversal.

**Numbers.** Montage pictures 3-20 f each (house 0.4-0.7 s); a luma jump of about 59 on a contrast cut; a
pre-hit gap of 2-5 f.

**Presets.**
- *Contrast cut.* The scale grows +0.4 to +1.8 % per frame into the cut; the incoming shot grows +5.5, +6.2, +3.8 % per
  frame; luma 238 -> 19; the type stays in the same slot.
- *Montage under held words.* Billboards change under held words every 11-20 f; elsewhere 12 cuts in 67 f.
- *Pre-hit gap.* The bed drops to silence and ducks -16 dB for 2-5 f, the cut lands, the accent hits on the first frame
  after.
- *Micro-scenes.* A run of short scenes about 0.5 s each.
- *Re-punch run.* Swaps re-punching on an accelerating rhythm: 7, 10, 7, 6, 7, 12, 8, 4, 4, 9, 8, 4, 4, 4, 3 frames apart.

**Rich.** Motion on both sides; a slot or anchor that holds; cuts accelerating in a run; a gap before the hit.

**Cheap.** Static compositions changing everything at once; even spacing; every cut on the beat by default.

**Sound.** A 2-5 f pre-hit gap; a kick or sub on the first frame after; ticks on montage cuts.

```tsx
// MontageSlot.tsx: pictures cut on a list of frames under a held word slot; each picture pushes 1.03 while held
import {AbsoluteFill, useCurrentFrame} from 'remotion';

export const MontageSlot: React.FC<{cuts: number[]; pictures: React.ReactNode[]; slot: React.ReactNode; stepped?: number}> = ({
  cuts, pictures, slot, stepped = 1,
}) => {
  const raw = useCurrentFrame();
  const f = Math.floor(raw / stepped) * stepped;            // Graphics on threes: stepped = 3
  const i = Math.max(0, cuts.filter((c) => f >= c).length - 1);
  const held = f - cuts[i], len = (cuts[i + 1] ?? cuts[i] + 24) - cuts[i];
  const push = 1 + 0.03 * Math.min(1, held / len);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${push})`}}>{pictures[i]}</AbsoluteFill>
      {slot /* the word + corner markers never move */}
    </AbsoluteFill>
  );
};
```

### 22. Torn-paper step wipe · `torn-paper`

Carries: texture. Starter: `fx/Wipe`.

**What.** A jagged hard edge with a fibre fringe advances in 10-frame steps.

**Job.** Analogue craft, collage.

**Numbers.** 4 steps of 10 f60; a seeded noise amplitude of 40-90 px and wavelengths of 30-120 px; a fringe of 2-6 px white
with a 1-2 px grey shadow.

**Presets.**
- *Four tears.* The edge polyline jumps to a new position every 10 frames (6 per second), each time with a new seeded jagged
  profile; the picture keeps moving under it.

**Rich.** Steps at 6 per second; a fringe and a shadow; the picture moving underneath.

**Cheap.** A smooth jagged wipe.

**Sound.** Stabs or bell notes at 990-1400 Hz on each tear.

```tsx
// TornStep.tsx: a seeded jagged edge that advances in 10-frame steps; the page keeps everything on one side
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {hash} from './seamKit';

const tornPath = (pts: [number, number][], seed: number) => {
  // densify the polyline and displace it by seeded noise (amp 40-90, wavelength 30-120)
  const out: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40));
    for (let k = 0; k < n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      const a = (hash(i * 100 + k, seed) - 0.5) * 2 * (20 + 25 * hash(k, seed + 1));
      out.push(`${x + (nx / L) * a},${y + (ny / L) * a}`);
    }
  }
  out.push(pts[pts.length - 1].join(','));
  return out;
};
export const TornStep: React.FC<{start: number; steps: [number, number][][]; page: string; under: React.ReactNode}> = ({start, steps, page, under}) => {
  const f = useCurrentFrame() - start;
  const i = Math.floor(f / 10);                              // 10-frame steps (6 fps at 60)
  if (i >= steps.length) return <AbsoluteFill>{under}</AbsoluteFill>;
  const edge = tornPath(steps[i], 7 + i);                   // runs from a point on the top edge to a point on the right edge
  const px = (p: string) => p.replace(',', 'px ') + 'px';
  // the page keeps everything below/left of the edge (one top-right tear; a second tear adds a second polygon)
  const pagePoly = `polygon(0px 0px, ${edge.map(px).join(', ')}, 1920px 1080px, 0px 1080px)`;
  return (
    <AbsoluteFill>
      {under}
      <AbsoluteFill style={{background: page, clipPath: pagePoly}} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <polyline points={edge.join(' ')} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={6} />
        <polyline points={edge.join(' ')} fill="none" stroke="#FFFFFF" strokeWidth={4} />
      </svg>
    </AbsoluteFill>
  );
};
```

### 23. Glitch break · `glitch-break`

Carries: a reset. Starter: `fx/CutFx`. Only in a film about signal or reality breaking.

**What.** Designed full-frame states, 2 frames each, hard cuts, with luma alternating.

**Job.** A reboot, a break in reality.

**Numbers.** 2 frames per state; 4 states; 8-11 f in all.

**Presets.**
- *Four states.* A ghost frame (RGB split +/-6 px and a white motion ghost blurred 20 px at 70 %), a blue mosaic duotone in
  six rows, a cyan-green treatment, a white frame: 2 frames each.
- *Scramble break.* A letter scramble, two lavender frames, one black frame.

**Rich.** Each state a complete re-treatment of the frame, exactly 2 f.

**Cheap.** RGB jitter and noise bars for 20 f.

**Sound.** A digital click per state.

```tsx
// GlitchBreak.tsx: N designed full-frame states, 2 frames each, hard cuts, then a white frame
import {AbsoluteFill, useCurrentFrame} from 'remotion';
export const GlitchBreak: React.FC<{start: number; states: React.ReactNode[]; hold?: number; after: React.ReactNode}> = ({start, states, hold = 2, after}) => {
  const f = useCurrentFrame() - start;
  const i = Math.floor(f / hold);
  if (f < 0) return null;
  if (i < states.length) return <AbsoluteFill>{states[i]}</AbsoluteFill>;
  return <AbsoluteFill>{after}</AbsoluteFill>;
};
// state 1 (ghost): <AbsoluteFill><Plate/><AbsoluteFill style={{mixBlendMode:'screen', filter:'blur(20px)', background:
//   'linear-gradient(90deg, rgba(255,255,255,0) 1700px, rgba(255,255,255,.7) 1760px, rgba(255,255,255,0) 1900px)'}}/></AbsoluteFill>
```

### 24. Split panels with staggered swaps · `split-panel`

Carries: the anchor panel. Starter: `fx/Montage`, `fx/Grids`.

**What.** Panels cut on independent rhythms; one anchor panel never cuts; sync cuts are rare.

**Job.** Breadth at once.

**Numbers.** One anchor panel; the busiest panel cuts 1-30 f apart.

**Presets.**
- *Quad reels.* Top-right cuts on frames 19, 104, 123; bottom-left on 8, 19, 49, 50, 51, 52, 60, 71, 101, 102, 103, 104,
  112, 123; bottom-right on 104; top-left never (the anchor). Frames 19, 104 and 123 are the rare sync cuts.
- *Four quadrants.* Each quadrant changes on its own frames.

**Rich.** An anchor panel, staggered others, rare sync cuts.

**Cheap.** All panels cutting together.

**Sound.** Ticks on the sync cuts.

```tsx
// PanelReel.tsx: each panel has its own cut list; panel 0 is the anchor (no cuts)
import {AbsoluteFill, useCurrentFrame} from 'remotion';
export const PanelReel: React.FC<{panels: {box: [number, number, number, number]; cuts: number[]; shots: React.ReactNode[]}[]}> = ({panels}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {panels.map((p, k) => {
        const i = p.cuts.filter((c) => f >= c).length;      // shot index = cuts passed
        const [x, y, w, h] = p.box;
        return <div key={k} style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden'}}>{p.shots[i % p.shots.length]}</div>;
      })}
    </AbsoluteFill>
  );
};
// <PanelReel panels={[{box:[0,0,960,540],cuts:[],shots:[tl]}, {box:[960,0,960,540],cuts:[19,104,123],shots:tr}, ...]}/>
```

### 25. Dissolve · `dissolve`

Carries: the subject. Starter: `fx/Seam` dissolve.

**What.** A very short dissolve, only between versions of the same subject, under a flash or wash, or under a fixed anchor.

**Job.** Continuity of the same subject.

**Numbers.** 2-3 frames.

**Presets.**
- *Blueprint to photo.* Opacity 0.35 -> 1 in two frames.
- *Images under a logo.* Seven images dissolving 3 f each under a fixed logo.
- *Logo to line.* A 2-frame dissolve from the logo to the next line.

**Rich.** 2-3 f, with an anchor above or a wash over it.

**Cheap.** A 15-30 f cross-fade of unrelated scenes.

```tsx
// QuickDissolve.tsx: 2-3 frame dissolve, optionally under a white wash peak
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
export const QuickDissolve: React.FC<{at: number; frames?: number; washPeak?: number; a: React.ReactNode; b: React.ReactNode}> = ({at, frames = 3, washPeak = 0, a, b}) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [at, at + frames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wash = washPeak * (1 - Math.abs(k - 0.5) * 2);
  return (
    <AbsoluteFill>
      {k < 1 && <AbsoluteFill>{a}</AbsoluteFill>}
      {k > 0 && <AbsoluteFill style={{opacity: k}}>{b}</AbsoluteFill>}
      {wash > 0 && <AbsoluteFill style={{background: '#FFFFFF', opacity: wash}} />}
    </AbsoluteFill>
  );
};
```

### 26. Callback, replay seam · `callback`

Carries: memory. Starter: `lib/spine.ts`.

**What.** An earlier passage returns (a frame-shifted replay) after the proof section, entered by the house seam.

**Job.** Rhyme and closure.

**Numbers.** A replay of 36-107 f.

**Presets.**
- *Opening replay.* The opening move (36-42 f) replays near the end, offset in time, now carrying the product.
- *Section replay.* A 107 f passage from the first act replays before the end card.
- *Badge callback.* The end-card badge is an earlier shot time-shifted.

**Rich.** Entered by the house seam; the same sound as the first time.

**Cheap.** A copy plus a cross-fade.

```tsx
// Callback.tsx: replay a scene component at a frame offset
import {Sequence} from 'remotion';
export const Callback: React.FC<{at: number; srcFrom: number; dur: number; Scene: React.FC}> = ({at, srcFrom, dur, Scene}) => (
  // visible window at..at+dur; inside it the scene is shifted so that its own frame srcFrom plays at `at`
  <Sequence from={at} durationInFrames={dur}>
    <Sequence from={-srcFrom}><Scene /></Sequence>
  </Sequence>
);
// <Callback at={900} srcFrom={30} dur={36} Scene={OpeningTitle}/>
```

### 27. The last handover: into the end card and out · `end-handover`

Carries: the brand. Starter: `fx/Wordmark`, `lib/film.ts`. See also `items.md` `logo-lockup`.

**What.** How a film ends: a hold with a slow creep, a dip, or an end in the middle of a move.

**Job.** The brand rests; the last motion slow and purposeful.

**Numbers.** A hold of 2.1-6.1 s; a creep between 0.93 and 1.054 over the hold; a black tail of 3-24 f.

**Presets.**
- *Spin-in lockup.* The badge spins in from 2.16x and +84 degrees and settles in about 54 f; the wordmark slides 183 px while
  fading 0.22 -> 1; the lockup closes 30 f later and holds.
- *Shrinking lockup.* The lockup shrinks to about 0.93 about the centre over the whole hold.
- *Hold to the end.* The end card holds to the last frame and never fades.
- *Black bookends.* 8 black frames, the end card for about 5 s, 3 black frames.

**Rich.** A slow linear creep; a natural decay of the sound.

**Cheap.** A frozen lockup and a one-second fade to black.

**Sound.** A stab or a tonal resolution; then silence or the natural decay.

```tsx
// EndHold.tsx: the lockup lands, then a slow linear creep;
// optional black tail or none
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
export const EndHold: React.FC<{land: number; end: number; to?: number; pivot?: [number, number]; blackTail?: number; children: React.ReactNode}> = ({
  land, end, to = 1.054, pivot = [960, 540], blackTail = 0, children,
}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [land, end - blackTail], [1, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}); // linear on purpose
  const black = blackTail > 0 && f >= end - blackTail;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {!black && <AbsoluteFill style={{transformOrigin: `${pivot[0]}px ${pivot[1]}px`, transform: `scale(${s})`}}>{children}</AbsoluteFill>}
    </AbsoluteFill>
  );
};
```

---

## Planning a film's seams

1. List the scene changes; mark the two or three section changes (the only places a ground may flip light or dark).
2. Pick the house seam from what the world carries; use it on 30-45 % of the changes.
3. Fill the rest with three or four other kinds, never the same kind twice in a row, and one exit-then-enter, text swap or
   match cut if the film has four lines or more.
4. For every hard cut, name what it carries (motion, slot, anchor, ground flip); a cut that carries nothing becomes a
   `velocity-cut`, a `match-cut` or a `blur-through`.
5. Give every seam its sound from the entry, landing on the cover frame, the fastest frame or one frame after the cut.
