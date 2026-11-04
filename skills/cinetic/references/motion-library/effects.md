# Effects

Picture effects for launch films: depth of field and blur ladders, motion blur, glow and bloom, light pools, light
sweeps and glints, glass, masks and irises, gradients and gradient maps, flashes and washes, particles, lens
distortion, chromatic aberration, shadows, reflections, grain, vignette and 3D lighting. Each entry gives the job the
effect does, its numbers, named presets, what makes it rich or cheap, the starter primitive it extends, and a
Remotion 4 implementation that renders on the CPU (no WebGL needed, no `Math.random`, no wall clock).

**Units.** px at 1920 x 1080. Frames are 30 fps frames unless a line says otherwise; at another rate multiply frame
counts by `fps / 30` (the code does this with `f30()`). "Blur N px" and "sigma N" mean the CSS `blur()` value, the
Gaussian standard deviation. A film uses three to five effects from this file, never all of them.

**Order.** Entries are ranked by how much they lift a film. The first thirteen (depth, light and material) are where
production value comes from; the finishing layers near the end are mostly absent from a clean digital film.

---

## House rules

1. **Depth is made of blur ladders, not engines.** Put elements on discrete depth slots, and pair every blur step with
   a dim step and a scale step (blur 0 / 2.5 / 3 / 3.5 / 9 px with brightness 100 / 92 / 85 / 78 / 70 % and scale
   1 / 0.943 / 0.894 / 0.849 / 0.807). A blur without dimming reads as a cheap filter.
2. **Defocus is a timing tool.** It ends a beat (an 18 f accelerating ramp to 12 px), hides a cut (6 px out, then
   14-12-10-7-4-0 px in) and introduces a word (14-10-7-4-2-0 px with scale 1.09 -> 1.00). Hold opacity at 1.0 while
   the blur runs; the blur does the work a fade would do.
3. **Motion blur is a policy per film.** Either blur only the fast frames (whips, flights, rising words: a rising word
   smears 6 / 3 / 0 px on its first three frames) or keep the whole film crisp at any speed. Never blur slow moves.
   A film whose camera should read as real blurs; a flat graphic film stays crisp. Choose once (`LOOK.blur`).
4. **Light comes from below and from the object, never from a centred blob.** Anchor floor glows off-frame (an ellipse
   centred at (960, 1250) with radii 1250 x 700, or (960, 1150) with 700 x 450) so only the falloff shows. Emissive
   objects glow in their own colour at radius 20-40 px and 30-45 % strength.
5. **Glass is a dark or translucent body, light only at the rims, and a blurred copy of the world behind.** The frost
   scales with the element (sigma 6 px for a bubble, 12 for a pill, 28 for a large card). Over a flat ground there is
   nothing to frost: use a diagonal sheen instead.
6. **Light sweeps are narrow and clipped.** Bands 120-200 px wide (6-10 % of the frame), slanted about -20 degrees,
   visible only on the object's faces, one pass, 25-70 px per frame.
7. **Irises are fast and decelerate.** 4-14 frames; the radius grows about x1.5 on the first frame and x1.04 by the
   end (diameter shares 0.37, 0.65, 0.79, 0.86, 1.0). The next world is already moving inside, and a 2-4 px light
   rim marks the edge on dark worlds.
8. **Pictures develop.** Bring images in as a tint, duotone or gradient map built from the palette, then resolve them
   to true colour in reading order (blur clears 6-4-2-1-0, then a 3 f colour cross-fade per tile).
9. **A flash is one frame, on a hit, and carries a ghost** of what came before (a grey ghost of the outgoing object at
   10-30 % luma, or light streaks on the next black frame).
10. **The finishing stack is mostly absent.** A clean digital film has no global grain, no lens vignette, no global
    bloom and no chromatic aberration; flat grounds sit within one code value. Grain, vignette and fringes belong to
    footage, "filmed screen" and paper looks only, and grain there is sigma 1.2-3 on 0-255.

## Layer order

Bottom to top. A blur named for a scene applies to the camera group only, unless the whole frame is meant. Glows,
cones and beams add light to what is below them and are never drawn over the near defocused layer or the wordmark. The
lens layer is fixed to the frame and never moves with the camera.

```
stage        flat colour; never pure #000 / #FFF in a dark or light film (#090909, #010101, #010103 / #FDFDFF)
world        mesh gradient, photo plate or far geometry (blurred where far)          mesh-gradient, dof-ladder
light field  floor or under-glow, stage glow (normal alpha or screen)                floor-glow, stage-glow
hero         glass, UI planes, 3D objects with their own rims, sheen and shadows     frosted-glass, glass-solid, shadows, light-rig-3d
add light    cones, beams, halos, specular streaks, comets (screen / lighter)        light-geometry, light-trails, light-sweep
near layer   foreground blurs (additive light is not drawn over it)                  dof-ladder
type         never shadowed; a glow is a blurred copy behind the text                element-glow
overlays     flashes, washes, irises, mosaics (per shot)                              flash-frame, light-flood, iris, pixel-mosaic
lens         DOF bands, motion blur, chromatic aberration, barrel, vignette          motion-blur, chromatic-aberration, lens-distortion, vignette
grade        gradient map or LUT (photo films only), grain, final 0.6 px soften     develop, grain, final-soften
```

## Choosing a set by world

Pick three to five from the row that matches the film's world, and vary the pick from film to film.

| world | effects that belong together |
|---|---|
| dark stage with glass and light | `glass-solid` + `light-sweep` (or its rim streak) + `floor-glow` + `bloom` in the object's own colour + `motion-blur` on whips + `flash-frame` with a ghost + `particle-field` (placed points) |
| light UI world (white or pale) | `dof-ladder` slots + `defocus-exit` / `focus-pull-in` timing + a sky-blue `floor-glow` + `frosted-glass` over a moving plate + `element-glow` click bloom + tinted `shadows` + `light-flood` wash |
| colour-field world | `mesh-gradient` or silk field + `focus-pull-in` words + `iris` + `pixel-mosaic` + `develop` |
| photographic or footage | `develop` (gradient map / LUT) + stylised `chromatic-aberration` + `grain` sigma 3 + lens `vignette` + a 1-2 f `smear-displace` on a cut |
| editorial or paper | paper `grain` 2-3 % + a single-word `bloom` + one-frame `flash-frame` + `colour-front-sweep` |
| 3D object | `light-rig-3d` + `glass-solid` + `dof-ladder` at the extremes of a move + accumulated `motion-blur` on fast frames |

## Shared code

Every implementation below imports this file. Save it as `fx-shared.tsx` beside the components. It is deterministic
(seeded `random()`, no clock) and uses the starter's fixed defocus levels so no blur radius ever animates.

```tsx
// fx-shared.tsx: Remotion 4, no GPU. Deterministic: no Math.random, no Date.
import React, {useMemo} from 'react';
import {Easing, interpolate, random} from 'remotion';

/** Piecewise-linear lookup in a frame table {frame: value}; clamps outside. Optional easing per segment. */
export type Table = Record<number, number>;
export const at = (f: number, t: Table, easing?: (x: number) => number): number => {
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (ks.length === 1) return t[ks[0]];
  return interpolate(f, ks, ks.map((k) => t[k]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});
};

/** 30-fps frame of the current frame (the tables in this library are given in 30 fps frames; convert with k = fps/30). */
export const f30 = (frame: number, fps: number) => (frame * 30) / fps;

/** House easing tokens (cubic-bezier control points). */
export const EZ = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  wordLand: Easing.bezier(0.13, 0.68, 0.15, 0.93), // Word entry (16 f, 0.34 opacity on frame 1)
  recentre: Easing.bezier(0.08, 1.01, 0.22, 0.94), // Append-recentre: 69 % on the first frame
  pop: Easing.bezier(0.2, 0.8, 0.3, 1), // Dot growth, staircase settle
  starGrow: Easing.bezier(0.09, 0.89, 1.0, 0.96), // Star radius
  panIn: Easing.bezier(0.55, 0, 1, 0.45), // Ease-in pan
  quadIn: Easing.in(Easing.quad),
  quintIn: Easing.in(Easing.poly(5)), // Focus pull
  circOut: Easing.out(Easing.circle), // Modal 0.69 -> 1.0
};

/** hex -> rgba() */
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Fixed defocus levels (the starter's lib/defocus.ts): no blur radius ever animates; any sigma = at most two cached copies. */
export const LEVELS = [0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64] as const;
export const levelMix = (s: number): {level: number; w: number}[] => {
  if (s < 0.5) return [{level: 0, w: 1}];
  const lv = [0, ...LEVELS];
  for (let i = 0; i < lv.length - 1; i++) {
    const a = lv[i], b = lv[i + 1];
    if (s <= b) {
      const w = (s - a) / (b - a);
      return [{level: a, w: 1 - w}, {level: b, w}].filter((c) => c.w > 0.002);
    }
  }
  return [{level: LEVELS[LEVELS.length - 1], w: 1}];
};

/** <Soft sigma> : defocus any layer with two fixed-level copies (bottom copy full, top copy at its weight = exact lerp on opaque pixels). */
export const Soft: React.FC<{sigma: number; style?: React.CSSProperties; children: React.ReactNode}> = ({sigma, style, children}) => {
  const mix = levelMix(sigma);
  return (
    <div style={{position: 'absolute', inset: 0, ...style}}>
      {mix.map((c, i) => (
        <div key={c.level} style={{position: 'absolute', inset: 0, opacity: i === 0 ? 1 : c.w, filter: c.level ? `blur(${c.level}px)` : undefined}}>
          {children}
        </div>
      ))}
    </div>
  );
};

/** Directional (one-axis) blur as a static SVG gaussian; quantise sigma to 0.5 px steps so the filter is reused. */
export const shutterSigma = (pxPerFrame: number, shutterDeg = 180) => (Math.abs(pxPerFrame) * (shutterDeg / 360)) / Math.sqrt(12);
export const DirBlur: React.FC<{id: string; sx?: number; sy?: number; children: React.ReactNode}> = ({id, sx = 0, sy = 0, children}) => {
  const qx = Math.round(sx * 2) / 2, qy = Math.round(sy * 2) / 2;
  const fid = `${id}-${qx}-${qy}`;
  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={fid} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${qx} ${qy}`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: qx || qy ? `url(#${fid})` : undefined}}>{children}</div>
    </>
  );
};

/** Seeded gaussian (Box-Muller on remotion random). */
export const gauss = (seed: string) => {
  const u = Math.max(1e-6, random(seed + 'u')), v = random(seed + 'v');
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Glow stack: tight core + wide skirt (the two-radius halo). */
export const glow2 = (hex: string, tight = 10, a1 = 0.55, wide = 28, a2 = 0.25) =>
  `drop-shadow(0 0 ${tight}px ${rgba(hex, a1)}) drop-shadow(0 0 ${wide}px ${rgba(hex, a2)})`;
```

Starter rules that apply to every entry: never animate `filter: blur()` on a large layer (use `Soft`, which mixes two
cached levels); bake low-span gradients with `scripts/dither-gradient.py` (a CSS ramp across fewer than about 30 code
values bands); real motion blur is the `render.sh --blur` pass driven by `LOOK.blur` / `CAMERA_BLUR`, and `DirBlur` is
the in-browser stand-in.

## Index

| # | slug | effect | family |
|---|---|---|---|
| 1 | `dof-ladder` | depth-of-field ladder on planes | depth |
| 2 | `defocus-exit` | defocus exit and the defocus cut | depth, transition |
| 3 | `focus-pull-in` | focus-pull entrance, blur-resolve words | depth, type |
| 4 | `motion-blur` | motion blur on fast moves | motion, lens |
| 5 | `floor-glow` | floor and under-glow anchored off-frame | light |
| 6 | `frosted-glass` | frosted glass panel | material |
| 7 | `glass-solid` | glass solid with rim light | material, light |
| 8 | `light-sweep` | light sweep, sheen and specular streak | light, material |
| 9 | `element-glow` | element glow, halo, click bloom, selection ring | light |
| 10 | `bloom` | bloom on emissive highlights | light, grade |
| 11 | `iris` | iris into the next world | mask, transition |
| 12 | `mesh-gradient` | mesh gradient and liquid colour field | gradient, world |
| 13 | `develop` | tint, duotone or gradient map to true colour | colour |
| 14 | `zoom-blur` | radial zoom blur on a push | motion, transition |
| 15 | `flash-frame` | colour flash frame on a hit | colour, transition |
| 16 | `light-flood` | light flood, white wash, white-out | light, transition |
| 17 | `soft-mask-reveal` | soft-edge linear mask reveal | mask |
| 18 | `particle-field` | placed, glowing point fields | particles |
| 19 | `light-geometry` | light cones, pillars, beams, neon | light |
| 20 | `light-trails` | light trails, comets, chromatic light lines | light |
| 21 | `stage-glow` | stage glow behind the hero | light |
| 22 | `light-rig-3d` | 3D lighting rig | 3D |
| 23 | `shadows` | hover height, contact and tinted shadows | depth |
| 24 | `colour-front-sweep` | colour front sweeping through type | type, gradient |
| 25 | `status-shimmer` | status shimmer through text | light, UI |
| 26 | `pixel-mosaic` | pixel mosaic and blocky reveals | mask, texture |
| 27 | `lens-distortion` | barrel bulge and fisheye | lens |
| 28 | `echo-copies` | echo and ghost copies | motion |
| 29 | `chromatic-aberration` | chromatic aberration and RGB split | lens |
| 30 | `grain` | grain (off by default) | finish |
| 31 | `halftone-screens` | halftone, dot screens, screen grids | texture |
| 32 | `knockout-clip` | knockout and type as a window | mask, blend |
| 33 | `final-soften` | final 0.6 px soften | finish |
| 34 | `vignette` | vignette as a lens or a content shape | finish |
| 35 | `reflections` | floor and rim reflections | material |
| 36 | `smear-displace` | scan-line smear, row smear, displaced edges | distortion |

---

## Entries

### 1. Depth-of-field ladder on planes · `dof-ladder`

Family: depth. Starter: `fx/DepthStack` (`DEPTH.planes`, far 6 / near 10 px, parallax 0.5 / 1.6), `lib/defocus.ts`
(`DOF`, `dofSigma`, `defocusMix`), `fx/Defocus`. The code adds the slot ladder, static plane classes and a focus band.

**Job.** It ranks information without making text smaller or greyer: the newest, selected or speaking item is the
sharp one. It turns a flat UI into a space the camera moves through, and tells the eye where to look while many things
are on screen.

**Numbers.**
- In-focus plane 0-1.5 px. First step back 1-3 px. Mid 2.5-4 px. Far 4-10 px. Nearest to the lens 8-25 px. Soft
  colour masses 40-60 px.
- Dimming paired with the blur: brightness 92 -> 70 % over four slots, or far opacity 0.6-0.7. Scale per slot -5 to
  -6 % (0.943^n).
- Arrival into the front slot: 6 px -> 0 in 6 f on an expo-out. Retreat: 0 -> 3-6 px over 16-17 f with a fade to
  0.38 or 0.

**Presets.**
- *Stack ladder* (toasts, messages, results). Slots 0-4: blur 0 / 2.5 / 3.0 / 3.5 / 9.0 px, brightness 100 / 92 / 85
  / 78 / 70 %, scale 1.000 / 0.943 / 0.894 / 0.849 / 0.807, visible strips 195 / 170 / 145 / 120 px. A new item
  arrives from 120 px low at scale 0.95, opacity 0.6 and blur 6 px, reaching the slot in 6 f (progress per frame 0.59,
  0.76, 0.87, 0.93, 0.96, 0.98, 1.0); one new item every 4 f. The same ladder works on a black stage.
- *Orbit by depth* (glass tiles around a 3D object). Focus subject 1.0-1.5 px; tiles in front near the centre 1-3 px;
  side and back tiles 4-8 px; the tiles nearest the lens (over 120 px wide) 8-12 px; the far cloud plate 3-4 px.
- *Retreating stack.* Older items ride up while they blur and fade: the oldest 0 -> 6 px and 1 -> 0 over 15-17 f, the
  next 0 -> 3 px and 1 -> 0.38; avatars and labels stay sharp.
- *Static planes* (a cloud of bubbles or tiles). Far elements 6-10 px at 0.6-0.7 opacity, the mid layer sharp, near
  tiles 4-8 px. Fixed per element; the camera lands on each cluster in turn.
- *Focus band* (a tray or desk seen from above). Sharp in the band from 26 % to 79 % of the height, about 5 px at 12 %
  and 90 %, 8 px at the frame edges; anything nearer than the band also gets 12-20 px and motion blur. Two copies
  only: a sharp one masked to the band and a blurred one masked outside it.
- *Ring or marquee.* Chips near the top and bottom of a rotating ring defocus up to 4 px; in three racing pill rows the
  outer rows sit at 4 px and the middle row is sharp.
- *Phone face.* Header sharp, a ramp from 0 at the tab row to about 3 px at the bottom, text fading toward a grey.
- *Selection.* The chosen card gets a focus ring while the other rows blur and dim away and the camera pushes x1.46.
- *Defocused ground.* A field blurred past 60 px reads as colour, not as a picture.

**Rich.** Discrete slots that each pair blur with dimming and scale; the focus plane on the one readable thing; blur
fixed per element and cached; the near-lens element blurred the most (8-25 px) so the frame has a foreground; the blur
retreats on the same curve as the motion.

**Cheap.** One uniform blur on everything but the hero; an animated blur radius; blur without a scale or brightness
step; blurring a line the viewer must read; depth of field on a single flat plane with nothing in front of it.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {Soft, EZ, f30} from './fx-shared';

const SLOTS = {blur: [0, 2.5, 3.0, 3.5, 9.0], bright: [1, 0.92, 0.85, 0.78, 0.7], scale: [1, 0.943, 0.894, 0.849, 0.807], top: [120, 340, 530, 700, 845]};
const ARRIVE = [0, 0.59, 0.76, 0.87, 0.93, 0.96, 0.98, 1.0]; // per frame after entry

/** A depth stack: items[i].at = the 30-fps frame it enters the front slot. Older items step back on the same curve. */
export const DepthLadder: React.FC<{items: {at: number; node: React.ReactNode}[]; cx?: number}> = ({items, cx = 960}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  const arrived = items.filter((it) => f >= it.at);
  return (
    <AbsoluteFill>
      {arrived.map((it, idx) => {
        const later = arrived.slice(idx + 1);                 // items that entered after this one
        const slotF = later.reduce((s, l) => s + stepProgress(f - l.at), 0); // fractional slot index
        const own = stepProgress(f - it.at);                  // own arrival 0..1
        const s = Math.min(slotF, 4.999);
        const i0 = Math.floor(s), u = s - i0, i1 = Math.min(4, i0 + 1);
        const lerp = (a: number[]) => a[i0] + (a[i1] - a[i0]) * u;
        const blur = lerp(SLOTS.blur) + (1 - own) * 6;        // enters at 6 px
        const scale = lerp(SLOTS.scale) * (0.95 + 0.05 * own);
        const top = lerp(SLOTS.top) + (1 - own) * 120;        // enters 120 px low
        const opacity = (0.6 + 0.4 * own) * (slotF > 4.5 ? interpolate(slotF, [4.5, 5], [1, 0]) : 1);
        return (
          <div key={idx} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, zIndex: 100 - Math.round(s * 10), opacity}}>
            <Soft sigma={blur} style={{transform: `translate(0px, ${top - 120}px) scale(${scale})`, transformOrigin: `${cx}px 120px`, filter: `brightness(${lerp(SLOTS.bright)})`}}>
              {it.node}
            </Soft>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
const stepProgress = (df: number) => (df <= 0 ? 0 : df >= 7 ? 1 : ARRIVE[Math.floor(df)] + (ARRIVE[Math.min(7, Math.floor(df) + 1)] - ARRIVE[Math.floor(df)]) * (df % 1));

/** Static plane DOF: blur and dim by depth class; compute once per element. */
export const DOF_CLASS = {focus: {blur: 1.0, op: 1}, step: {blur: 2, op: 0.95}, mid: {blur: 3.5, op: 0.85}, far: {blur: 8, op: 0.65}, lens: {blur: 12, op: 1}} as const;
export const DepthPlane: React.FC<{depth: keyof typeof DOF_CLASS; children: React.ReactNode}> = ({depth, children}) => (
  <Soft sigma={DOF_CLASS[depth].blur} style={{opacity: DOF_CLASS[depth].op}}>{children}</Soft>
);

/** Focus band: sharp copy masked to the band, a blurred copy masked outside it (two copies only). */
export const FocusBand: React.FC<{children: React.ReactNode; y0?: number; y1?: number; edge?: number; sigma?: number}> = ({children, y0 = 250, y1 = 760, edge = 130, sigma = 6}) => {
  const m = `linear-gradient(to bottom, transparent 0, transparent ${y0 - edge}px, #000 ${y0}px, #000 ${y1}px, transparent ${y1 + edge}px)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: `blur(${sigma}px)`}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{WebkitMaskImage: m, maskImage: m}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 2. Defocus exit and the defocus cut · `defocus-exit`

Family: depth, transition. Starter: `fx/RackFocus` (`defocusPulse`) and the defocus seam in `fx/Seam` (9 f out, one
empty frame, 9 f in). The code adds the accelerating exit table, the velocity cut and the card flood.

**Job.** It ends a thought by taking attention away instead of deleting the thing; the old idea is still there, out of
focus. Across a cut it hides the seam and feels like the camera moving into the next place.

**Numbers.**
- Peak 4.5-40 px (words 8-12 px, a whole world 28-40 px). Ramp 3-18 frames. The curve accelerates: under 1 px for the
  first 30 % of the ramp, then fast, peaking on the cut or on the frame the next element covers it.
- After a velocity cut: 14 -> 0 px over 5-6 f (14, 12, 10, 7, 4, 0) with a +12 luma haze on the first 3 f.
- Opacity stays at 1.0 during the defocus. Pair it with a fade (to 0 or 0.38) only for UI items that leave.

**Presets.**
- *Title exit* (at 24 fps, 18 f): sigma per frame 0.0, 0.3, 0.4, 0.8, 1.0, 1.2, 1.7, 2.2, 2.9, 3.6, 4.1, 4.8, 5.6,
  6.4, 7.2, 9.7, 12.0, 12.0, then the cut. Tie it to a camera crane or push. The code resamples it to 30 fps.
- *Velocity cut.* The outgoing scene is pushed to x1.23 and blurred about 6 px on its last frame; the next scene starts
  defocused 14, 12, 10, 7, 4 px and is sharp on the sixth frame, the move continuing through the cut.
- *Short end defocus.* 0.5 px for four frames, then 1.5, 3, 4.5 px held: a four-frame accent on the last beat.
- *Card flood.* One card at a time, the face floods with the brand colour and the card defocuses 0 -> 28 px in 3
  frames while keeping its silhouette and tilt; the next card starts 2-3 f later.
- *World defocus.* A coloured shape rises from a corner while the whole picture defocuses 0 -> 40 px over 16 f; the
  shape becomes the next ground.
- *Pull-out exit.* The camera pulls out fast while the type flies off (top line up and larger, bottom line down and
  larger) with blur 2 -> 8 px; gone in 6 f.
- *Porthole.* A 5-frame defocus 1.35, 2.0, 3.9, 5.3, 6.4 px as the camera passes through an opening.

**Rich.** An accelerating ramp tied to a camera move, peaking exactly on the cut or the cover; opacity held; a
separate defocus-in after the cut; short (18 f or less).

**Cheap.** A linear blur plus a fade on a static camera; blur that starts after the move has stopped; a long defocus
(over 20 f) with nothing happening; animating `filter: blur()` on the full frame.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Soft, at, f30} from './fx-shared';

// Exit table resampled to 30 fps (x1.25): 23 frames from the start of the exit.
const EXIT: Record<number, number> = {0: 0, 1.25: 0.3, 2.5: 0.4, 3.75: 0.8, 5: 1.0, 6.25: 1.2, 7.5: 1.7, 8.75: 2.2, 10: 2.9, 11.25: 3.6, 12.5: 4.1,
  13.75: 4.8, 15: 5.6, 16.25: 6.4, 17.5: 7.2, 18.75: 9.7, 20: 12, 21.25: 12};

/** Defocus exit: opacity held, accelerating blur peaking on the cut. `peak` rescales the table (the table peaks at 12 px). */
export const DefocusExit: React.FC<{start: number; peak?: number; children: React.ReactNode}> = ({start, peak = 12, children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  const sigma = t < 0 ? 0 : (at(t, EXIT) * peak) / 12;
  return <Soft sigma={sigma}>{children}</Soft>;
};

/** Velocity cut, incoming side: 14-12-10-7-4-0 px plus a 12-luma haze on the first 3 frames. */
export const VelocityCutIn: React.FC<{cut: number; children: React.ReactNode}> = ({cut, children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - cut;
  const sigma = t < 0 ? 0 : at(t, {0: 14, 1: 12, 2: 10, 3: 7, 4: 4, 5: 0});
  const haze = t < 0 ? 0 : at(t, {0: 12 / 255, 2: 12 / 255, 3: 0});
  return (
    <AbsoluteFill>
      <Soft sigma={sigma}>{children}</Soft>
      <AbsoluteFill style={{background: '#FFFFFF', opacity: haze * 2.2, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

/** Card flood: face goes brand colour and blurs 0 -> 28 in 3 f, silhouette kept. */
export const FloodBlur: React.FC<{start: number; color?: string; children: React.ReactNode}> = ({start, color = '#2D3AA0', children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  const p = Math.max(0, Math.min(1, t / 3));
  return (
    <Soft sigma={28 * p}>
      <div style={{position: 'absolute', inset: 0}}>{children}</div>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(closest-side, #27328E, ${color} 70%, #6E78D8)`, opacity: p, mixBlendMode: 'normal'}} />
    </Soft>
  );
};
```

### 3. Focus-pull entrance and blur-resolve words · `focus-pull-in`

Family: depth, type. Starter: `fx/FocusWord`. The code adds the halving ladder with a lagging oversize, the accent that
cools after focus, and the low translucent word build.

**Job.** The lens finds the word: attention arrives instead of text appearing. It makes a headline feel photographed
and softens the start of a long typed line.

**Numbers.**
- Start sigma: 2.5-3.5 px for a panel snap, 6-8 px for words, 10-14 px for a hero word or button.
- Duration: 3-6 f for words, 5-9 f for a hero, 20 f (at 24 fps) for a 3D fly-in.
- Curve: decelerating, roughly halving each frame (14, 10, 7, 4, 2, 0). A peak may hold 2 f, then fall on a quint-in.
- Pairing: an oversize of 1.06-1.25 that settles to 1.0 after the blur has cleared, or a rise of 20-30 px. Start
  opacity 0.3-0.4, never 0.
- Colour: the accent while blurred, the base colour 0-9 f after it is sharp.

**Presets.**
- *Hero word.* Blur 14, 10, 7, 4, 2, 0 px; scale 1.09 for five frames, then 1.06, 1.035, 1.015, 1.00 (the scale lags
  the blur by three frames). Anchor on the line's left baseline.
- *Panel snap.* 2.5, 3.5, 3, 3, 2.5, 0 px: it opens soft and snaps into focus on the sixth frame. A snap, not a ramp.
- *Pill pop.* 8, 8, 7, 5, 2, 0 px (quint-in), then hold.
- *Macro to rest.* Start close and tilted on a button at scale 1.25 and blur 8; focus and scale settle together over
  8 f, a cool light sweep crossing during the pull.
- *Accent word.* The new word enters at sigma 6-7 in the accent colour, sharpens over 4-6 f, holds the colour, then
  turns to the base colour.
- *Word build.* Each word enters 30 px low at opacity 0.4 and 2-3 px blur, settles in 3-5 f on an expo-out, 2 f
  apart; a faint vertical echo may double it on the first frames. A lighter variant: blur 8 px, opacity 0.35, 20 px
  slide, 3-5 f.
- *Row cascade.* Each row rises 24 px while blur 6 -> 0 and opacity 0 -> 1 over 5 f; rows 8 f apart.
- *3D fly-in* (24 fps). The line flies back from the lens on a yawed plane, blur 12 -> 0 in 20 f, then shrinks x0.67
  over 24 f while its colour sweeps from the accent to ink.
- *Stepped entry.* Opacity / blur per frame 0.30 / 8, 0.50 / 6, 0.70 / 5, 0.85 / 3, 1 / 0, with a 10 px vertical smear
  on frames two and three.

**Rich.** The blur halves per frame and lands before the scale settles; a small oversize; the word partly visible
(0.3-0.4) from its first frame; the accent that cools after focus.

**Cheap.** A linear blur and an opacity ramp from 0; blur-in on paragraphs; more than 10 f for one word; every word of
a film entering the same way.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Soft, at, EZ, f30} from './fx-shared';

/** Focus pull: blur halves per frame, the oversize lags the blur by 3-4 frames. Anchor = the line's left baseline. */
export const FocusPullWord: React.FC<{start: number; anchor?: [number, number]; accent?: string; base?: string; children: React.ReactNode}> = ({start, anchor = [0, 0], accent, base, children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  if (t < 0) return null;
  const blur = at(t, {0: 14, 1: 10, 2: 7, 3: 4, 4: 2, 5: 0});
  const scale = at(t, {0: 1.09, 4: 1.09, 5: 1.06, 6: 1.035, 7: 1.015, 8: 1.0});
  const color = accent && base ? (t < 8 ? accent : base) : undefined; // Accent while soft, base after
  return (
    <Soft sigma={blur} style={{transform: `scale(${scale})`, transformOrigin: `${anchor[0]}px ${anchor[1]}px`, color}}>
      {children}
    </Soft>
  );
};

/** Word build: enters 30 px low at 0.4 opacity and 2.5 px blur, settles in 4 f expo-out; stagger 2 f per word. */
export const ResolveWord: React.FC<{start: number; children: React.ReactNode}> = ({start, children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  if (t < 0) return null;
  const p = EZ.expoOut(Math.min(1, t / 4));
  return (
    <span style={{display: 'inline-block', transform: `translateY(${30 * (1 - p)}px)`, opacity: 0.4 + 0.6 * p, filter: p < 1 ? `blur(${(2.5 * (1 - p)).toFixed(2)}px)` : undefined}}>
      {children}
    </span>
  );
};
// Note: a per-word blur on small inline spans is cheap; never do this on a full-frame layer.
```

### 4. Motion blur on fast moves (shutter smear) · `motion-blur`

Family: motion, lens. Starter: the `render.sh --blur` pass (`LOOK.blur`, `CAMERA_BLUR`) and `DirBlur`. The code adds
a short-shutter option and the rising-word smear.

**Job.** Weight and speed: a whip reads as a camera move, an arrival as a thrown object. It also hides whip cuts,
because the streak carries the eye across the seam.

**Numbers.**
- Shutter 90-180 degrees (the smear is 7-50 % of the per-frame displacement). 180 degrees on whips and UI flights in a
  camera-blur film; 45-90 degrees on 3D camera cranes and on type.
- Smear lengths: UI flights 20-120 px, whips 60-120 px, long streaks up to 400 px, rising words 6 / 3 / 0 px.
- Windows: 2-10 frames each, only on the listed fast frames; 4-12 samples.
- Ceiling: above 60-80 px per frame a 180-degree shutter shows stepped copies; frame-filling edges may run 150-300 px
  per frame for a few frames only.
- A Gaussian stand-in for a box smear of length L has sigma = L / sqrt(12).

**Presets.**
- *Whole-film 180.* Every moving thing smears 0.5 x its per-frame displacement along its travel; a vertical exit at 106
  px/f gives a 53 px streak, then 27, 13 as it slows.
- *Short shutter* for cranes: smear 7-25 % of the travel (13-21 px on a fast vertical crane), so type goes soft rather
  than streaked.
- *Rising word.* 6 / 3 / 0 px vertical smear on the word's first three frames for a 40-60 px rise.
- *Rows rise blurred.* 30 px, 12 px, 0 by the sixth frame.
- *Smear slide-in.* Expo-out arrival, smear = 0.5 x displacement: a tile's first frame can be a 280 px streak, the next
  120 px.
- *Whip to dark.* 60-120 px blur into an empty dark frame, then the next shot.
- *Rotary smear.* About 90 degrees per frame with an arc-shaped smear (the shutter follows the rotation).
- *Accumulated copies.* 4-6 discrete samples per frame, visible as stacked ghost copies on the fastest frames; 12-16
  copies on a falling object with 12 samples. A deliberate look, not a smooth streak.
- *Crisp film.* No shutter blur anywhere, even at 120-176 px/f. Right for flat graphic films.

**Rich.** Only the fast frames carry blur; the shutter is centred on the frame; the smear follows the path (arcs for
rotations, radial for pushes); the blur ends exactly when the move settles; a crisp film stays crisp.

**Cheap.** Blur on slow moves; a uniform Gaussian instead of a directional one; browser-side multi-sample stacking
(8-bit plus-lighter accumulation posterises gradients and tints greys); stepped copies above 80 px/f; ghosts carried
from the previous shot across a cut.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {DirBlur, shutterSigma, f30} from './fx-shared';

/**
 * In-browser shutter smear for a layer whose position is a pure function pos(f30) -> [x, y].
 * Velocity is taken over ±0.5 f, so the smear is centred on the frame like a real shutter.
 * Below 2 px/f nothing is blurred (slow moves are never blurred). Above 80 px/f, prefer a cut or a mask.
 */
export const Smear: React.FC<{id: string; pos: (f: number) => [number, number]; shutter?: number; children: React.ReactNode}> = ({id, pos, shutter = 180, children}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  const [x0, y0] = pos(f - 0.5), [x1, y1] = pos(f + 0.5);
  const [x, y] = pos(f);
  const vx = x1 - x0, vy = y1 - y0;
  const sx = Math.abs(vx) < 2 ? 0 : shutterSigma(vx, shutter);
  const sy = Math.abs(vy) < 2 ? 0 : shutterSigma(vy, shutter);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px)`}}>
      <DirBlur id={id} sx={sx} sy={sy}>{children}</DirBlur>
    </div>
  );
};

/** Rising word: vertical smear 6 / 3 / 0 px on the word's first three frames (40-60 px rise). */
export const riseSmear = (framesSinceStart: number) => (framesSinceStart < 0 ? 0 : [6, 3, 0][Math.min(2, Math.floor(framesSinceStart))]);
// usage: <DirBlur id={`w${i}`} sy={riseSmear(t - wordStart[i]) / 2}>...  (sigma ≈ length/2 for a short smear)

/**
 * Real shutter (for 'camera' films): declare the frames and let render.sh --blur average sub-frames in float.
 * timeline.ts:  export const CAMERA_BLUR = [[52, 56], [603, 606]];  LOOK.blur = 'crisp';
 * Never wrap the film in @remotion/motion-blur's CameraMotionBlur (8-bit stacking: banding, tinted greys).
 */
```

### 5. Floor and under-glow (a light pool anchored off-frame) · `floor-glow`

Family: light. Starter: `fx/Glow` `FloorGlow`, `fx/LightField`. The code adds the breathing table, plate stops and the
rim pick-up.

**Job.** It gives a flat UI or a line of type a stage and a horizon, so the object stands somewhere. It sets the time of
day and the mood without imagery: day white with sky light, night navy with brand light.

**Numbers.**
- Anchor 100-300 px below the bottom edge (y 1150-1250) or in a corner; radii 700-1250 px across, 450-700 px tall.
- It covers the lower 30-45 % of the frame; the top 45-55 % stays pure ground.
- Strength breathes +/-10-25 % over 6-15 f, or rises with the scene (black -> peak in 38 f -> black in 10 f).
- One hue from the palette: sky blue on white, warm amber on black, brand blue at night, lavender on violet.
- Objects standing in it pick it up on their lower rim.

**Presets.**
- *Sky light on white.* Ellipse centred (960, 1250), radii 1250 x 700, pure white above y 600. Colour samples at
  y 1075 / 900 / 780 / 660 move between a low state `#BADFFA` `#DBEEFD` `#EEF7FE` `#F7FBFE` and a high state `#7FABF6`
  `#A6C5F8` `#C7DBFC` `#E2EEFD`. Breathing: 0 -> 0.85 in 6 f, 0.6 by 12 f, 1.0 at 15 f (grow 3 f more before a whip).
- *Warm pool on black.* Centre (960, 1150), radii 700 x 450, core `#7A2E0A` fading to black; it rises over 38 f and is
  gone 10 f later. Objects in it take a hot lower rim `#F0B292` with a 6-10 px rim bloom `#D04C22`.
- *Linear floor* for card and UI shots: `linear-gradient(to bottom, #FDFDFF 0 50%, #FCFBFF 55%, #F2F5FE 75%, #E4E9FD
  88%, #D8DEFC 100%)`; it swells over 17 f on the end card and eases back.
- *Thin floor line.* A horizontal lavender glow filling the bottom 30 px; glass letters stand on it.
- *Night floor.* `#172480` centred at (960, 1000): a broad soft band over the lower 40 % whose upper edge undulates
  slowly; keys in the lower third pick up `#0B1240`.
- *Bloom at centre* (for an end card only): a soft radial green-white glow about 700 px across.

**Rich.** The centre is off-frame, so only the falloff shows; it is baked with dither (no contour rings); its strength
moves with events; objects pick the light up on their lower edges.

**Cheap.** A centred blob behind the headline; an 8-bit CSS gradient that bands; a multi-hue glow; one static glow for
a whole film.

```tsx
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {at, f30} from './fx-shared';

/**
 * Off-frame under-glow. Two baked, dithered plates (scripts/dither-gradient.py) cross-faded at full strength,
 * because a dithered plate at opacity < 1 bands again (starter finishing.md §3).
 * backdrops.json:
 *   {"name":"under-lo","type":"radial","at":[0.5,1.157],"radius":[0.651,0.648],"stops":[["#BADFFA",0],["#DBEEFD",0.45],["#FFFFFF00",1]]}
 *   {"name":"under-hi","type":"radial","at":[0.5,1.157],"radius":[0.651,0.648],"stops":[["#7FABF6",0],["#A6C5F8",0.45],["#FFFFFF00",1]]}
 */
export const UnderGlow: React.FC<{strength: (f: number) => number; lo?: string; hi?: string; ground?: string}> = ({strength, lo = 'fx/under-lo.png', hi = 'fx/under-hi.png', ground = '#FFFFFF'}) => {
  const {fps} = useVideoConfig();
  const s = Math.max(0, Math.min(1, strength(f30(useCurrentFrame(), fps))));
  return (
    <AbsoluteFill style={{background: ground}}>
      <Img src={staticFile(lo)} style={{position: 'absolute', inset: 0, width: 1920, height: 1080}} />
      <Img src={staticFile(hi)} style={{position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: s}} />
    </AbsoluteFill>
  );
};
// Breathing: strength = (f) => at(f, {0: 0, 6: 0.85, 12: 0.6, 15: 1});

/** Quick CSS version for previews (bands on low-span ramps; bake it for the deliverable). */
export const UnderGlowCSS: React.FC<{c0: string; c1: string; cx?: number; cy?: number; rx?: number; ry?: number}> = ({c0, c1, cx = 960, cy = 1250, rx = 1250, ry = 700}) => (
  <AbsoluteFill style={{background: `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, ${c0} 0%, ${c1} 45%, rgba(255,255,255,0) 100%)`}} />
);

/** Rim pick-up: the object's lower edge takes the glow colour. */
export const rimPickup = (glow: string, side = '#2A2A2A') => `linear-gradient(to bottom, ${side} 55%, ${glow} 100%)`;
// Use it as the stroke gradient of the disc or card outline.
```

### 6. Frosted glass panel (a blurred copy of the world + a bright rim) · `frosted-glass`

Family: material. Starter: `fx/Glass` (`frost` mode, one blur of 22 px). The code makes the frost size-relative and
adds the bright-top rim, the iridescent inner edge and the flat-ground sheen.

**Job.** It makes the UI a physical object in a world: the product floats over everyday life (clouds, a beach, a café),
and the blurred world reads through it, so depth and context arrive together.

**Numbers.**
- Backdrop blur scales with the element, about 4-8 % of its short side: 6 px for a 150 px bubble, 12 px for a 170 px
  pill, 18-22 px for cards, 28 px for a large card.
- Body fill: white at 0.18-0.72 on light worlds; dark at 0.88 on dark worlds; an opaque gradient when the ground is
  flat.
- Rim: 1-2 px, white at 0.10-0.60, brighter at the top (a gradient). A bezel of 7-18 px when the glass frames an opaque
  field.
- Extras: an iridescent inner edge glow of 6 px; an outer glow of 14 px at 0.55; a soft shadow only on light worlds.

**Presets.**
- *Glass over a plate.* Every glass element shows a blurred copy of the plate behind it, clipped to its shape, sigma by
  size (6 / 12 / 28 px).
- *Logo tile.* Rounded square, corner radius 26 % of the side, side = 1.35 x the logo's coloured width (the logo fills
  70 %), body `rgba(255,255,255,.55)`, 1 px white rim, a 6 px pink / cyan iridescent inner edge.
- *Prompt pill, light.* `rgba(255,255,255,0.72)` over an 18 px backdrop blur, 1 px white border at 60 %, shadow `0 8px
  30px rgba(20,40,60,0.12)`. Dark variant: `#0E1218` at 88 % over a 20 px blur.
- *Flat-ground glass.* No blur at all: a diagonal sheen, darker toward two opposite corners (`#2250B0`, `#204CA4`) and
  lighter along the other diagonal, 1 px rim `rgba(255,255,255,0.16)`, radius 56.
- *Bezel frame.* A white field (radius 3) inside a translucent bezel 16-18 px wide (white about 35 % over the ground),
  bezel radius 12, outer white glow 14 px at 0.55.
- *Dark prompt box.* Pill-rect 975 x 182, radius 42, fill `#242424` with the top 40 px at `#2A2A2A`, a 1.5 px border
  `rgba(255,255,255,0.10)`, a soft outer glow (sigma 60 px, 6 %). Pairs with the rim streak in `light-sweep`.
- *Glass grid over photos.* Thin white grid lines with small four-point highlights at the crossings; selected cells fill
  with tinted glass panels.
- *Soft relief button.* Fill `#F1F1F1`, shadow `0 6px 18px rgba(0,0,0,0.07)`, a white top-left highlight `-2px -2px
  6px rgba(255,255,255,0.9)`.

**Rich.** A real, moving picture behind the glass to blur; the blur scaled to the element; the rim a gradient, bright
on top; the inner edge tinted or iridescent; the light direction matching the scene.

**Cheap.** A white 50 % rectangle over a flat colour; a uniform 1 px grey border; glass plus a heavy drop shadow plus a
bevel; a live full-frame `backdrop-filter` (slow, and unstable from frame to frame on the CPU).

```tsx
import React from 'react';

/**
 * Frosted glass over a moving world. `world` is the SAME element as the background (same transform),
 * rendered again inside the clip with a fixed blur. The blur radius never animates.
 */
export const FrostedPanel: React.FC<{
  x: number; y: number; w: number; h: number; r: number;
  world: React.ReactNode;              // the plate, positioned in frame coordinates
  sigma?: number;                       // default: size-relative, 6 % of the short side
  tint?: string;                        // body fill over the blur
  rimTop?: string; rimBottom?: string;  // rim gradient
  iridescent?: boolean;                 // Inner edge
  children?: React.ReactNode;
}> = ({x, y, w, h, r, world, sigma, tint = 'rgba(255,255,255,0.55)', rimTop = 'rgba(255,255,255,0.75)', rimBottom = 'rgba(255,255,255,0.12)', iridescent, children}) => {
  const s = sigma ?? Math.round(Math.min(w, h) * 0.06);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, overflow: 'hidden'}}>
      {/* the world, shifted back so it lines up with the background, blurred once */}
      <div style={{position: 'absolute', left: -x, top: -y, width: 1920, height: 1080, filter: `blur(${s}px)`}}>{world}</div>
      <div style={{position: 'absolute', inset: 0, background: tint}} />
      {iridescent && (
        <div style={{position: 'absolute', inset: 0, borderRadius: r, boxShadow: 'inset 0 0 6px 1px rgba(255,170,220,0.55), inset 0 0 14px 2px rgba(150,230,255,0.35)'}} />
      )}
      {/* rim: a 1.5 px gradient ring, bright on top (the mask keeps only the border) */}
      <div style={{position: 'absolute', inset: 0, borderRadius: r, padding: 1.5, background: `linear-gradient(to bottom, ${rimTop}, ${rimBottom})`,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude'}} />
      <div style={{position: 'absolute', inset: 0}}>{children}</div>
    </div>
  );
};

/** Flat-ground glass: no blur at all, a diagonal sheen and a 1 px rim. */
export const SheenCard: React.FC<{x: number; y: number; w: number; h: number; r?: number; dark?: string; light?: string; children?: React.ReactNode}> = ({x, y, w, h, r = 56, dark = '#2250B0', light = '#2E63C8', children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r,
    background: `linear-gradient(135deg, ${light} 0%, ${dark} 30%, ${light} 50%, ${dark} 72%, #204CA4 100%)`,
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16)'}}>{children}</div>
);
```

### 7. Glass solid with rim light (dark body, light only at the edges) · `glass-solid`

Family: material, light. Starter: `fx/Rim` (`KeyRim`), `fx/Spectral`. The code adds the dark-glass disc, glass type
and a three.js iridescent dome.

**Job.** The hero object (the product's mark, its main button, its one idea) made precious. Light reveals the form, so
the object reads as real and expensive without a texture.

**Numbers.**
- Rim 1.5-5 px, brightest on the side facing the key (top or bottom), with a two-radius glow (10 px at 0.55, 28 px at
  0.25).
- Body: dark (L 4-20 %) with 2-3 tonal zones, or a vertical gradient from black at the top to a light accent at the
  bottom; translucent solids at alpha 0.35-0.75.
- Inner pools: a crescent along the lit edge, an inner reflection rim 40 px inside, thin-film bands of 30-60 px; zone
  edges blurred about 0.12 R.
- State changes: filling with light over 6-10 f; frost to clear over about 12 f; the face turning into the light over
  about 12 f.

**Presets.**
- *Dark glass disc* (a main button). Rim 2.5 px `#FBFCFF`, glow `0 0 10px rgba(255,255,255,.55), 0 0 28px
  rgba(130,120,255,.25)`. Three zones along the vertical axis (t from -1 at the top to +1 at the bottom): top
  `#1E06F0` -> `#1D0EB7` -> `#1D127B` (t -1 to -0.55); middle `#1A1444` -> `#1D1934` -> `#1A1628` (to +0.45); bottom
  `#18144A` -> `#2413C8` -> `#2411EC` -> `#1C0AF2`; a spot `#6A60FF` at t 0.45-0.85. Zone edges blurred 0.12 R.
- *Glass type* (a wordmark about 1000 px tall, a display serif). Each glyph face is a vertical gradient: black at the
  top, `#937BF0` at 60 %, `#A996F9` at 75 %, `#CFC1FC` at 90 %, `#E6DDFB` at the bottom; a 1.5 px mint rim `#C8E8D0` at
  60 % on the top 45 % only; letters standing on a 30 px lavender floor glow `#EBC6EF`.
- *Glass world.* Solids at alpha 0.35-0.75 over the far world with opaque rims; spheres filled from `#151128` (shadow)
  to `#2E216B` (lit upper inner side), a 3-5 px violet-blue rim `#6A5AE8`, a 20 px inner glow and a reflection rim
  40 px inside.
- *Clear dome* (three.js). A refraction band about 50 px at the rim (`#7D89A6`), a 40 px thin-film highlight, iridescent
  arcs of 30-60 px; fresnel power 3, ramp `#DED3DA` `#B9C9E8` `#E8D8B8` `#C8E8E8`, opacity 0.35 over a white base at
  0.08.
- *Faceted solid.* Faces painted with flat colours (no live refraction) and one caustic band about 260 px wide across a
  face, from a mint-white core through warm stops to the face colour.

**Rich.** A dark body with light only at the rims and in a pool on the lit side; 2-3 tonal zones with soft edges; thin
rims (1.5-3 px) brighter where the key is; a floor glow to stand on; one sweep across it.

**Cheap.** A uniform translucent fill; an even outline all round; a glossy top ellipse; a drop shadow under glass;
chrome.

```tsx
import React from 'react';

/** Dark glass disc: three zones as stacked gradients clipped to a circle; rim + two-radius glow. */
export const DarkGlassDisc: React.FC<{cx: number; cy: number; R: number; children?: React.ReactNode}> = ({cx, cy, R, children}) => (
  <div style={{position: 'absolute', left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, borderRadius: '50%', overflow: 'hidden',
    boxShadow: '0 0 0 2.5px #FBFCFF, 0 0 10px 2.5px rgba(255,255,255,.55), 0 0 28px 2.5px rgba(130,120,255,.25)'}}>
    {/* body + top band + bottom crescent; zone edges softened by spacing the stops ~0.12R apart */}
    <div style={{position: 'absolute', inset: 0, background:
      'linear-gradient(to bottom, #1E06F0 0%, #1D0EB7 10%, #1D127B 20%, #1A1444 28%, #1D1934 45%, #1A1628 60%, #18144A 72%, #2413C8 82%, #2411EC 92%, #1C0AF2 100%)'}} />
    {/* the crescent is brighter at the sides than in the middle: darken the centre bottom */}
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(40% 22% at 50% 80%, rgba(31,21,117,0.85), rgba(31,21,117,0) 100%)'}} />
    <div style={{position: 'absolute', left: '72.5%', top: '92.5%', width: R * 0.18, height: R * 0.12, borderRadius: '50%', background: '#6A60FF', filter: `blur(${R * 0.04}px)`, transform: 'translate(-50%,-50%)'}} />
    {children}
  </div>
);

/** Glass type: vertical gradient face, a mint rim on the top 45 % only, a floor glow under the letters. */
export const GlassType: React.FC<{text: string; x: number; y: number; size?: number; font?: string}> = ({text, x, y, size = 1000, font = 'Instrument Serif'}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id="gt-face" x1="0" y1={y - size * 0.72} x2="0" y2={y} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#000000" /><stop offset="0.4" stopColor="#05030A" />
        <stop offset="0.6" stopColor="#937BF0" /><stop offset="0.75" stopColor="#A996F9" />
        <stop offset="0.9" stopColor="#CFC1FC" /><stop offset="1" stopColor="#E6DDFB" />
      </linearGradient>
      <clipPath id="gt-top"><rect x={0} y={y - size * 0.75} width={1920} height={size * 0.75 * 0.45} /></clipPath>
      <linearGradient id="gt-floor" x1="0" y1="1050" x2="0" y2="1080" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#EBC6EF" stopOpacity="0" /><stop offset="1" stopColor="#EBC6EF" />
      </linearGradient>
    </defs>
    <rect x={0} y={1050} width={1920} height={30} fill="url(#gt-floor)" />
    <text x={x} y={y} fontFamily={font} fontSize={size} fill="url(#gt-face)">{text}</text>
    <text x={x} y={y} fontFamily={font} fontSize={size} fill="none" stroke="#C8E8D0" strokeOpacity={0.6} strokeWidth={1.5} clipPath="url(#gt-top)">{text}</text>
  </svg>
);

/* three.js: fresnel iridescence without transmission.
const domeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: {c0: {value: new THREE.Color('#DED3DA')}, c1: {value: new THREE.Color('#B9C9E8')}, c2: {value: new THREE.Color('#E8D8B8')}, c3: {value: new THREE.Color('#C8E8E8')}},
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 c0,c1,c2,c3; varying vec3 vN; varying vec3 vV;
    void main(){ float fr = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
      vec3 ramp = fr < .33 ? mix(c0,c1,fr/.33) : fr < .66 ? mix(c1,c2,(fr-.33)/.33) : mix(c2,c3,(fr-.66)/.34);
      gl_FragColor = vec4(ramp*fr*0.35 + vec3(0.08), fr*0.35 + 0.08); }`,
});
*/
```

### 8. Light sweep, sheen and specular streak, clipped to the object · `light-sweep`

Family: light, material. Starter: `fx/Exposure` `LightSweep` (a light front 0.45 x the frame wide, 12 degrees, gain
0.55, 44 f at 60 fps on `E.launchIn`), `fx/Glint`. The house band is a light front, not a glyph sweep; the code adds a
narrow glyph sweep and a rim streak.

**Job.** "Finished, locked, precious." A sweep marks the moment a thing is complete (a wordmark lands, a row is done)
and makes its material read (glass, metal, satin). A travelling specular streak says a real light hangs above the
object.

**Numbers.**
- Band 120-200 px wide (6-10 % of the frame width; 12-40 % of the element height). Specular streak cores 3 x 170 px.
- Angle -20 to -30 degrees; vertical bands are fine on rows.
- Peak 12-60 % white in screen blend; a streak core reaches luma 135-152 over a dark box.
- Speed 25-70 px per frame; 6-25 f; one pass (one late, smaller highlight is allowed).
- Clipped strictly to the faces: a glyph mask, a border band of +/-8 px, or the card shape.

**Presets.**
- *Glyph sweep.* 120 px band at -20 degrees, peak 0.55, 22 f, slightly accelerating; visible only on the letter faces,
  glyph by glyph; a glassy chime (1.3-2.3 kHz) under it.
- *Row shimmer.* 120 px band, white 35 % in screen blend, left to right at 60 px per frame across the row that just
  completed; each new word of the previous row is brighter for 3 frames.
- *Banner sheen.* A 200 px band at 12 % crossing in 6 frames.
- *Coloured sweep.* A soft diagonal band in a cool accent at 60 % during a focus pull.
- *Rim streak.* The reflection of an overhead light in a glass rim: a 3 px core 170 px long whose brightness along its
  length is a Gaussian (sigma 45 px), a glow 10 px tall and 40 px long (both sigma), white, drawn additively and clipped
  to the border band. One streak holds near the top rim; the other slides along the bottom rim about 640 px in 24 f,
  then rides with the box. Opacity 0.4 on its first frame, 1 from the third.
- *Button sheen.* Two parallel 30-degree stripes in a lighter tint of the button colour at 40 %.
- *Edge travel.* A highlight in the accent travels along a pill's top edge.
- *Glints.* Three 3 px white points with 10 px glows on a dark disc.

**Rich.** Narrow, soft, slanted, clipped to the object's faces, one pass on a beat, with a glassy sound; specular
streaks that move as the object moves.

**Cheap.** A wide band crossing the whole frame; repeated loops; a sweep over a flat card with no material; a hard-edged
band; spill outside the glyphs.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {EZ, f30} from './fx-shared';

/** A band clipped to text: a second copy of the text whose fill is a moving gradient (background-clip:text), screen-blended. */
export const GlyphSweep: React.FC<{start: number; text: string; style: React.CSSProperties; width: number; band?: number; angle?: number; peak?: number; frames?: number}> = ({start, text, style, width, band = 120, angle = -20, peak = 0.55, frames = 22}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  if (t < 0 || t > frames) return null;
  const u = 0.65 * (t / frames) + 0.35 * EZ.panIn(t / frames); // slightly accelerating
  const x = -band + (width + 2 * band) * u;
  const g = `linear-gradient(${90 + angle}deg, transparent ${x - band / 2}px, rgba(255,255,255,${peak}) ${x}px, transparent ${x + band / 2}px)`;
  return (
    <span style={{...style, position: 'absolute', backgroundImage: g, backgroundRepeat: 'no-repeat', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', mixBlendMode: 'screen'}}>
      {text}
    </span>
  );
};

/** Rim streak: a 3 x 170 px core with a Gaussian profile along its length + glow; clip it to the border band. */
export const RimStreak: React.FC<{x: number; y: number; opacity: number}> = ({x, y, opacity}) => (
  <div style={{position: 'absolute', left: x - 120, top: y - 12, width: 240, height: 24, opacity, mixBlendMode: 'screen', pointerEvents: 'none'}}>
    {/* glow: 10 px tall sigma, 40 px long sigma */}
    <div style={{position: 'absolute', left: 60, top: 6, width: 120, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', filter: 'blur(10px)'}} />
    {/* core: 3 px tall, a Gaussian along its length (sigma 45 of 170) */}
    <div style={{position: 'absolute', left: 35, top: 10.5, width: 170, height: 3, borderRadius: 2,
      background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.53) 23%, #FFFFFF 50%, rgba(255,255,255,0.53) 77%, rgba(255,255,255,0) 100%)'}} />
  </div>
);
// Bottom streak centre x per frame from the start of the slide: at(t, {0:1363,2:1365,4:1202,6:1142,8:1074,10:1052,12:1022,14:983,16:962,18:921,20:868,22:810,24:724}).
// Wrap it in a div whose clip-path keeps only the box border band (±8 px).
```

### 9. Element glow and halo (two-radius glows, text glows, click blooms) · `element-glow`

Family: light. Starter: `fx/Glow` (`GLOW.bloom`, radii 5 / 18 / 56, weights 0.85 / 0.5 / 0.28). The code adds a
click bloom and a selection ring.

**Job.** State: selected, active, live, working, clicked. A glow is the visible form of an event, so it appears on the
event and then leaves.

**Numbers.**
- Two-radius stack: a tight core of 6-14 px at 0.40-0.60 plus a wide skirt of 22-40 px at 0.12-0.35.
- Text glows: a blurred copy behind the text, 20-40 px, opacity 0.25-0.6, a hue slightly lighter than the text.
- Click blooms: radius 150-300 px (an under-glow up to 500), life 8-16 f (rise 4-7 f, fade 5-6 f).
- Selection rings: a 2 px stroke + a 14 px glow at 0.35, and an echo ring 60 px out for 5 f.

**Presets.**
- *Glass button rim.* `0 0 10px rgba(255,255,255,.55), 0 0 28px rgba(130,120,255,.25)`.
- *Decode halo.* `#2A1FFF` around the scrambling glyphs, radius about 18 px plus a weaker 40 px skirt; off at lock.
- *Pill glow.* `linear-gradient(180deg, #3B78F2, #2C63E6)`, 2 px rim `rgba(255,255,255,0.35)`, outer glow `0 0 24px
  rgba(60,120,255,0.35)`.
- *Selection ring.* A rounded rect 24 px outside the card, 2 px stroke `#2B4FA8`, 14 px glow `rgba(47,107,234,0.35)`,
  an echo ring 60 px out for 5 f.
- *Glowing border field.* A 1.6 px border in a three-stop conic gradient; the outer glow is the same gradient blurred
  22 px at 0.7, strongest under the bottom edge, over a dark tinted haze.
- *Search field.* A 3 px border `#6BBDF2`, outer glow `0 0 36px rgba(107,189,242,0.35)`; the word carries a faint 6 px
  glow of its own colours.
- *Text glow at night.* A blurred copy of the text in a lighter brand tint behind it, radius about 20 px, its opacity
  rising with the colour change.
- *Click bloom* (24 fps). A soft radial light-blue bloom over the pill and under the text: 150 px across on its first
  frame, peak 4-7 f later (core `#AFD6F5` at the caret, half intensity at radius 150 px, falloff to 290 px), gone 14 f
  after it appeared.
- *Click ring.* A white ring of 8 px plus a 24 px white outer glow at 80 %, 12 f, gone 4 f later; under it a soft glow
  of radius 500 at 35 % in the accent.
- *Hover light.* A soft white radial glow about 70 px wide `rgba(255,255,255,0.55)`, strongest at the click.
- *Own-colour shadow-glow* under an object: 40 px at 30 %.
- *End-card glyph glow.* `text-shadow: 0 0 10px rgba(196,140,255,g), 0 0 34px rgba(150,80,240,g)`, g rising with the
  beat.

**Rich.** Two radii (core and skirt); the element's own hue, a little lighter; a short life tied to an event; the glow
under the text, never over it; strongest on the side facing the light.

**Cheap.** One huge neon outer glow; a glow on every card at rest; a glow colour from outside the palette;
`text-shadow` glows on body copy.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {at, glow2, f30} from './fx-shared';

/** Text glow: a blurred copy of the same text BEHIND it (scope: that text only). */
export const GlowText: React.FC<{text: string; style: React.CSSProperties; glow: string; radius?: number; alpha?: number}> = ({text, style, glow, radius = 20, alpha = 0.5}) => (
  <span style={{position: 'relative', display: 'inline-block'}}>
    <span aria-hidden style={{...style, position: 'absolute', inset: 0, color: glow, filter: `blur(${radius}px)`, opacity: alpha}}>{text}</span>
    <span style={{...style, position: 'relative'}}>{text}</span>
  </span>
);

/** Click bloom at (x, y): appears at `start` (30 fps frames), peaks at +5..+9, gone at +18. */
export const ClickBloom: React.FC<{x: number; y: number; start: number; core?: string}> = ({x, y, start, core = '#AFD6F5'}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  if (t < 0 || t > 18) return null;
  const r = at(t, {0: 75, 5: 290, 9: 300, 18: 320});
  const a = at(t, {0: 0.35, 5: 1, 9: 1, 18: 0});
  return <div style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', opacity: a,
    background: `radial-gradient(closest-side, ${core} 0%, ${core}80 50%, transparent 100%)`, mixBlendMode: 'screen', pointerEvents: 'none'}} />;
};

/** Selection ring: 24 px outside the card, a 2 px stroke + a 14 px glow, and an echo ring 60 px out for 5 f. */
export const FocusRing: React.FC<{x: number; y: number; w: number; h: number; r: number; start: number}> = ({x, y, w, h, r, start}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  if (t < 0) return null;
  const a = at(t, {0: 0, 3: 1});
  const echo = at(t, {4: 0, 5: 0.5, 9: 0});
  const ring = (o: number, op: number) => (
    <div style={{position: 'absolute', left: x - o, top: y - o, width: w + 2 * o, height: h + 2 * o, borderRadius: r + o, border: '2px solid #2B4FA8', opacity: op,
      boxShadow: '0 0 14px rgba(47,107,234,0.35), inset 0 0 14px rgba(47,107,234,0.15)'}} />
  );
  return <>{ring(24, a)}{echo > 0 && ring(84, echo)}</>;
};

// A two-radius glow on any element: style={{filter: glow2('#6BBDF2', 10, 0.55, 36, 0.35)}}
```

### 10. Bloom on emissive highlights · `bloom`

Family: light, grade. Starter: `fx/Glow` `Bloom` (its radii and weights already give a three-radius falloff). The code
adds an end-bloom on light elements and documents the threshold policy.

**Job.** It makes light sources read as light (emissive) instead of paint, and pulls the eye to the brightest thing.

**Numbers.**
- Threshold about luma 200: only near-whites and emissives bloom. Radius 10-18 px for UI, 20-40 px for objects,
  40-60 px halos for light pillars, 90-140 px for single words.
- Strength 0.25-0.55. Falloff: 50 % at about 15 px outside the edge, 25 % at 40 px, 10 % at 70 px.
- Life: on the hit (a one-frame white word bloom, a bloom at the end of a shot), or constant on emissives.

**Presets.**
- *Dark-stage threshold.* Every value above luma 200 blooms with radius 18 px, strength 0.35; the stage stays at
  `#090909`, so only the few whites bloom.
- *Own-colour emissives.* Pillars, beams, neon lines and halos glow in their own colour at radius 20-40 px, 30-45 %.
  A bloom is never drawn over the near defocused layer or the wordmark.
- *Per-element UI bloom.* The prompt box 14 px at 0.55 white; cards 10 px at 0.25 in a lilac; label bars 12 px at 0.35.
- *End bloom.* Only at the end of a shot every tile and word glows white; build it with a drop-shadow whose radius is
  20 + 40 g and a brightness of 1 + 0.8 g, g from 0 to 1.
- *Bloom in.* Opacity 0, 0.3, 0.6, 0.85, 1.0 over 10 f (24 fps) from one corner.
- *Word bloom.* One word in white with a big soft white bloom (radius about 140 px) for one frame, then the next word in
  blue with a strong blue bloom.

**Rich.** Bloom only on the few emissive things; in their own colour; a falloff with three radii; dark grounds kept
dark.

**Cheap.** Bloom on everything (a grey haze over the frame); white bloom on coloured objects; a single uniform halo.

```tsx
import React from 'react';

/**
 * Bloom an emissive layer only: the layer itself + three blurred copies in screen blend.
 * Weights follow the starter (0.85 / 0.5 / 0.28 at 5 / 18 / 56 px), scaled by `strength`; the tint is the layer's own colour.
 */
export const EmissiveBloom: React.FC<{strength?: number; radii?: [number, number, number]; children: React.ReactNode}> = ({strength = 0.4, radii = [5, 18, 56], children}) => {
  const w = [0.85, 0.5, 0.28].map((x) => x * strength);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {radii.map((r, i) => (
        <div key={r} style={{position: 'absolute', inset: 0, filter: `blur(${r}px)`, opacity: w[i], mixBlendMode: 'screen'}}>{children}</div>
      ))}
      <div style={{position: 'absolute', inset: 0}}>{children}</div>
    </div>
  );
};

/** End bloom on a light element; glow level g in 0..1 (drop-shadow + brightness). */
export const endBloom = (g: number) => `drop-shadow(0 0 ${20 + 40 * g}px rgba(255,255,255,${0.9 * g})) brightness(${1 + 0.8 * g})`;
```

### 11. Iris (a circular or shaped window into the next world) · `iris`

Family: mask, transition. Starter: `fx/Iris` (`IRIS_REVEAL.shape` [0, .565, .756, .851, .919, 1], r0Share .37). The
code adds an iris under the UI, a vesica window and the light rim.

**Job.** It enters a new world through the old one, so the two feel connected; it says "look inside" or "into the
product". A shaped iris (scallop, vesica, star) makes the transition belong to the brand.

**Numbers.**
- 4-14 f (house 5 f; 36 f with a slow middle for a hero opening).
- Radius growth per frame: about x1.5 on the first step, decaying to x1.04 (202 -> 305 -> 396 -> 472 px: x1.51, 1.30,
  1.19, 1.14, 1.10 ...). Diameter as a share of the final: 0.37, 0.65, 0.79, 0.86, 1.
- Edge 3-12 px soft (a white-out uses a 200 px feather); a 2-4 px light rim on dark worlds, plus a 40-80 px inner glow.
- Centre: the subject that carries over (a rock, a dome, a word), not always the frame centre.

**Presets.**
- *Fast iris.* A circle centred on the frame with a 6 px soft edge: diameter 808, 1424, 1730, 1898 px, then full frame
  on the fifth frame.
- *Iris under the UI* (24 fps). A circular window opens under the chat layer (the bubbles and labels slide over it),
  the top-view plate already moving inside; radius per frame 202, 305, 396, 472, 538, 593, 643, 688, 728, 765, 798,
  828, 855 px; 3 px soft edge with a 2 px rim at 50 % white.
- *Scalloped iris.* 14 shallow round lobes, a 12 px soft edge, opening around a star over 36 f; the star stays on top.
- *White-out reveal* (25 fps). A white layer at 100 % for two frames, then a radial hole growing from the subject,
  feather 200 px, fully open 8 f later.
- *Vesica.* Two circles of radius about 820 px overlap and their overlap is the window into the next scene; the lens
  half-width grows 145, 354, 776, 961 px over four frames; a 3-4 px violet rim `#754CD9` and a 40-80 px inner glow.
- *Mosaic ring.* A ring of 22 px mosaic squares in five tiers of the accent (`#2A0628` `#5A0F57` `#8E1A8A` `#C42AA4`
  `#E04C9A`, feather 30 px) grows from a small disc over a word: outer / inner radius 118 / 0, 285 / 85, 395 / 252,
  485 / 328, 564 / 421, 632 / 505, 700 / 539, 780 / 640 px.
- *Opening disc.* An iris disc opens the film; discs may open and then blur out.

**Rich.** The next world already alive inside the iris; the iris centred on what carries over; the radius
decelerating; the rim catching light; UI staying on top of the iris when it should.

**Cheap.** A circle wipe from black to black; a linear radius; a hard edge with no rim; an iris that has nothing to do
with the content.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {at, f30} from './fx-shared';

// Normalised radius shares per frame after the start (r / farCorner); a slower decay for longer irises.
const SHARE_FAST = {0: 0.37, 1: 0.65, 2: 0.79, 3: 0.86, 4: 1.0};
const farCorner = (x: number, y: number) => Math.hypot(Math.max(x, 1920 - x), Math.max(y, 1080 - y));

/** Circular iris: `next` is revealed inside, `prev` stays outside. Soft edge + a light rim. `under` keeps UI above. */
export const IrisReveal: React.FC<{start: number; cx?: number; cy?: number; soft?: number; rim?: boolean; next: React.ReactNode; prev?: React.ReactNode; ui?: React.ReactNode}> = ({start, cx = 960, cy = 540, soft = 6, rim = true, next, prev, ui}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  const R = farCorner(cx, cy) + soft;
  const r = t < 0 ? 0 : at(t, SHARE_FAST) * R;
  const mask = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${Math.max(0, r - soft)}px, transparent ${r}px)`;
  return (
    <AbsoluteFill>
      {prev}
      {r > 0 && <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask}}>{next}</AbsoluteFill>}
      {rim && r > 0 && r < R && (
        <div style={{position: 'absolute', left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', boxShadow: '0 0 0 2px rgba(255,255,255,.5)'}} />
      )}
      {ui /* The chat layer stays above the iris */}
    </AbsoluteFill>
  );
};

/** Vesica window: intersection of two circles (r 820) whose centres approach; violet rim + inner glow. */
export const VesicaIris: React.FC<{start: number; next: React.ReactNode}> = ({start, next}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  const half = at(t, {0: 145, 1.25: 354, 2.5: 776, 3.75: 961, 5: 1300}); // 24 fps half-widths resampled to 30 fps
  if (t < 0) return null;
  const r = 820, d = r - half;            // centres at 960 ∓ d (y 600): the lens half-width at y 540 ≈ half
  const ring = (cx: number) => (          // violet rim 3.5 px + 60 px inner glow, drawn on one circle and clipped by the other
    <div style={{position: 'absolute', left: cx - r, top: 600 - r, width: 2 * r, height: 2 * r, borderRadius: '50%',
      boxShadow: 'inset 0 0 0 3.5px #754CD9, inset 0 0 60px 6px rgba(117,76,217,0.55)'}} />
  );
  // nested clip-paths intersect: outer = circle A, inner = circle B
  return (
    <AbsoluteFill style={{clipPath: `circle(${r}px at ${960 - d}px 600px)`}}>
      <AbsoluteFill style={{clipPath: `circle(${r}px at ${960 + d}px 600px)`}}>
        {next}
        {ring(960 - d)}
        {ring(960 + d)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 12. Mesh gradient and liquid colour field (a living ground with no edges) · `mesh-gradient`

Family: gradient, world. Starter: `fx/Gradients`, `fx/BlobRing`. The code adds a colour-table mesh field and silk
bands, both rendered small and upscaled.

**Job.** A living world and a mood without photographs: the brand colour becomes atmosphere, and the field's motion
keeps the frame alive during holds, so the picture never stops.

**Numbers.**
- 3-6 blobs; blur 90-250 px (or a tiny canvas upscaled); one hue family plus a real value range (a field may span
  `#010101` to `#F7ADC3`).
- Drift 0.3-2 px per frame; colour samples change every 9-18 f; a hue cycle period of about 48 f.
- A swirl-in takes 4-6 f; the field breathes or contracts slowly; never fully static.

**Presets.**
- *Colour-table mesh.* A 3 x 3 colour table interpolated every 9 f (at 25 fps) on a 64 x 36 canvas, upscaled with a
  120-250 px blur. A first table: `#F7ADC3` `#EBC6F4` `#CAB1F4` / `#0D0A1A` `#090813` `#CFBAF8` / `#F6A7B0` `#F8C0E7`
  `#DEB8F3` (light corners, a dark middle row). The field blooms when a point field arrives.
- *Split ground.* The top 40 % light grey `#E7E7E7` with a soft edge; below it four blurred blobs drift slowly (warm,
  red, pink, lavender), colours re-sampled every 18 f.
- *Silk bands.* Broad soft curved diagonal bands from lower left to upper right, each 250-350 px wide, at about
  -35 degrees, flowing slowly up and right; colours `#E95951` `#EC7652` `#DD2E6E` `#87079F` `#440162`, hue period 48 f.
- *Liquid ellipses.* 3-4 large blurred ellipses or paths on a teal ground, drifting about 2 px per frame.
- *Blob ring vignette.* A thick ring of heavily blurred periwinkle (sigma 90-120 px; tiers `#4553C4` `#5965C7`
  `#8690D7` `#B9BDE6`) swirls in from one side within 4-6 frames and leaves an elliptical clear hole about 1000-1250 px
  wide around the text.
- *Cheap blob.* Blurred ellipses with `filter: blur(140px)` on a half-scale layer (render at 480 x 270 and upscale).
- *Swirl open.* A luminous S-swirl flashes open into a moving blue mesh.

**Rich.** Rendered small and upscaled (perfectly smooth, no banding), dithered, slowly drifting, one hue family with
real value contrast, the field reacting to events.

**Cheap.** A static two-stop CSS linear gradient; a rainbow of hues; banding; blobs whose edges show.

```tsx
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {f30} from './fx-shared';

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

/**
 * Mesh: a 3x3 colour table every `every` frames (30-fps frames), bicubic-ish upsample on a 64x36 canvas
 * displayed at 1920x1080 with smoothing. No CSS blur on a full-frame layer; the tiny canvas IS the blur.
 */
export const MeshField: React.FC<{table: Record<number, string[]>; every?: number}> = ({table, every = 11}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  useLayoutEffect(() => {
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    const k1 = keys.find((k) => k > f) ?? keys[keys.length - 1];
    const k0 = [...keys].reverse().find((k) => k <= f) ?? keys[0];
    const u = k1 === k0 ? 0 : (f - k0) / (k1 - k0);
    const g = table[k0].map((c, i) => mix(hex(c), hex(table[k1][i]), u)); // 9 colours
    const ctx = ref.current!.getContext('2d')!;
    const W = 64, H = 36, img = ctx.createImageData(W, H);
    const smooth = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gx = (x / (W - 1)) * 2, gy = (y / (H - 1)) * 2;
      const ix = Math.min(1, Math.floor(gx)), iy = Math.min(1, Math.floor(gy));
      const tx = smooth(gx - ix), ty = smooth(gy - iy);
      const c = (r: number, cc: number) => g[r * 3 + cc];
      const top = mix(c(iy, ix), c(iy, ix + 1), tx), bot = mix(c(iy + 1, ix), c(iy + 1, ix + 1), tx);
      const p = mix(top, bot, ty), o = (y * W + x) * 4;
      img.data[o] = p[0]; img.data[o + 1] = p[1]; img.data[o + 2] = p[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [f, table]);
  return <canvas ref={ref} width={64} height={36} style={{position: 'absolute', inset: 0, width: 1920, height: 1080, imageRendering: 'auto'}} />;
};
// Grade-safety: the 8-bit upscale can band on low-span fields; for the deliverable, render through render.sh --blur
// (accumulate.py dithers smooth ramps) or overlay the starter's 1-LSB dither plate.

/** Silk bands: three soft diagonal bands drifting up-right; hue cycles with a 48 f period. */
export const SilkBands: React.FC<{colours?: string[]}> = ({colours = ['#E95951', '#EC7652', '#DD2E6E', '#87079F', '#440162']}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  const phase = (f % 48) / 48;
  const shift = (i: number) => colours[(i + Math.floor(phase * colours.length)) % colours.length];
  const off = (f * 3) % 600; // bands flow right/up
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: shift(4)}}>
      <div style={{position: 'absolute', left: -800, top: -800, width: 3520, height: 2680, transform: `rotate(-35deg) translateX(${off}px)`,
        background: `repeating-linear-gradient(90deg, ${shift(0)} 0px, ${shift(1)} 150px, ${shift(2)} 300px, ${shift(3)} 450px, ${shift(0)} 600px)`, filter: 'blur(60px)'}} />
    </AbsoluteFill>
  );
};
// Cheaper: render SilkBands into a 480x270 <Sequence> layer and scale it x4 (the usual way to afford a 140 px blob blur).
```

### 13. Develop: tint, duotone or gradient map to true colour · `develop`

Family: colour, gradient. Starter: `fx/Develop`, `fx/GradientMap`. The code adds a per-tile develop with a blur ladder,
a reading-order stagger and a decaying arrival tint.

**Job.** "Generating, loading -> the real result." Pictures arrive as data and become real. It also pulls foreign
photos into the film's palette while they are new, so stock never looks random.

**Numbers.**
- Tint phase 3-14 f; per-item stagger 1-4 f in reading order; a 3 f cross-fade per item.
- With blur: the blur clears first (8-10 px, then 6, 4, 2, 1, 0), then the colour arrives.
- Maps: 2-5 stops from the brand palette (the duotone shadow is the brand colour, the highlight white or paper).
- A multiply tint decays roughly geometrically: 1.0, 0.75, 0.5, 0.35, 0.22, 0.08, 0 over 7 f.

**Presets.**
- *Blueprint to colour.* Rows rise blurred (vertical smear 30, 12, 0 px); thumbnails start as white plates `#F2F4FA`
  with blue line art, then develop to colour one by one.
- *Duotone window.* The whole window starts blurred 8 px and blue-monochrome (shadow `#1E44C8` or `#2F5FE0`, highlight
  white), sharpens 4, 2, 1, 0, then each tile cross-fades to colour in 3 f, column by column 3 f apart and the next row
  5 f later.
- *Pastel map.* Cards and tiles arrive gradient-mapped in three pastels (magenta `#D76FE3`, peach `#F8C37B`, mint
  `#9EE8F7`) and flip to true colour; a backdrop blurred 30 px cycles through `#EFADA8` `#E28AD1` `#D479F9` `#C0CDF6`
  every 4 f.
- *Arrival tint.* A newly landed item is a flat accent silhouette; its real texture fades in under a decaying multiply
  (1.0, 0.75, 0.5, 0.35, 0.22, 0.08, 0), with a lighter tint of the accent in between.
- *Card develop* (24 fps). A pink screen-plus-multiply tint fading 1 -> 0 per card over 14-24 f, cards starting 0-9 f
  apart.

**Rich.** Maps built from the palette; a staggered develop in reading order; sharpen first, colour second; true colour
arriving region by region.

**Cheap.** A global greyscale-to-colour fade; sepia; every image tinted the same way all film long.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {at, Soft, f30} from './fx-shared';

/** SVG gradient map: luminance -> table per channel. Stops are hex strings, evenly spaced. */
export const GradientMapFilter: React.FC<{id: string; stops: string[]}> = ({id, stops}) => {
  const ch = (i: number) => stops.map((s) => (parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16) / 255).toFixed(3)).join(' ');
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={ch(0)} /><feFuncG type="table" tableValues={ch(1)} /><feFuncB type="table" tableValues={ch(2)} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

/** Develop for one tile: duotone + blur hold, blur ladder 6-4-2-1-0, then a 3 f colour cross-fade at `colourAt`. */
export const DevelopTile: React.FC<{start: number; colourAt: number; id: string; shadow?: string; children: React.ReactNode}> = ({start, colourAt, id, shadow = '#1E44C8', children}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  const blur = at(f - start, {0: 10, 3: 10, 4: 6, 5: 4, 6: 2, 7: 1, 8: 0});
  const colour = at(f, {[colourAt]: 0, [colourAt + 3]: 1});
  return (
    <Soft sigma={blur}>
      <GradientMapFilter id={id} stops={[shadow, '#FFFFFF']} />
      <AbsoluteFill style={{filter: `url(#${id})`}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{opacity: colour}}>{children}</AbsoluteFill>
    </Soft>
  );
};
// Reading-order stagger: colourAt = groupStart + 3 * column (+5 for the next row).

/** Arrival tint: a flat colour multiply over the item, decaying 1 / .75 / .5 / .35 / .22 / .08 / 0 over 7 f (30 fps). */
export const ArrivalTint: React.FC<{start: number; tint?: string; children: React.ReactNode}> = ({start, tint = '#F07818', children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  const a = at(t, {0: 1, 1: 0.75, 2: 0.5, 3: 0.35, 4: 0.22, 6: 0.08, 7: 0});
  return (
    <div style={{position: 'relative', isolation: 'isolate'}}>
      {children}
      <div style={{position: 'absolute', inset: 0, background: tint, mixBlendMode: t < 1 ? 'normal' : 'multiply', opacity: a}} />
    </div>
  );
};
```

### 14. Radial zoom blur on a push · `zoom-blur`

Family: motion, transition. Starter: `fx/Rush`, `fx/Dive`. The code adds a sharp-centre zoom blur made of scaled copies
and a four-frame cross-zoom.

**Job.** "We go in": a fast push into the product or a detail, with the speed of a camera rushing forward; it masks a
cut from wide to macro.

**Numbers.** 1-5 frames; zoom x1.06-1.2 per frame; streaks 4-40 px growing with the distance from the centre; the centre
sharp within 25-35 % of the frame; often a 4 px blurred bridging frame and then the cut.

**Presets.**
- *Cross-zoom into a macro* (four frames at 30 fps): frame 0 the wide view pushed x1.2 with 6 % spread copies; frame 1
  x1.28; frame 2 a bridging plate at 4 px blur; frame 3 the macro, sharp. Streaks 25-40 px at the edges.
- *Collage hit.* The collage enters scaled x1.06 with a radial blur on the music's uplifter.
- *Carried zoom.* The cut lands still carrying the zoom blur of the previous shot; the list fades in over the next 3 f.
- *Spin plunge.* A steep ease-in counter-clockwise rotation plus zoom about the phone, with a growing edge blur, into a
  hard cut.
- *One-frame radial smear.* Cells doubled with 4-6 px trails toward the centre.

**Rich.** The centre stays sharp (the subject), the streaks grow with radius, it lasts 2-4 f and lands on a detail; the
push is real (3D, parallax).

**Cheap.** A uniform zoom blur over the whole frame for 10 frames or more; zoom blur as a generic transition between
unrelated shots.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * Radial zoom blur: `copies` versions scaled 1 .. 1+spread about (cx, cy), averaged (each at 1/(i+1) so the sum is a mean),
 * then a sharp copy masked to the centre. streak at radius r ≈ r * spread (r = 600 px, spread 0.06 -> 36 px).
 */
export const ZoomBlur: React.FC<{cx?: number; cy?: number; spread: number; copies?: number; sharpR?: number; children: React.ReactNode}> = ({cx = 960, cy = 540, spread, copies = 8, sharpR = 380, children}) => {
  if (spread <= 0.001) return <AbsoluteFill>{children}</AbsoluteFill>;
  const mask = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${sharpR * 0.6}px, transparent ${sharpR}px)`;
  return (
    <AbsoluteFill>
      {Array.from({length: copies}, (_, i) => (
        <AbsoluteFill key={i} style={{transform: `scale(${1 + (spread * i) / (copies - 1)})`, transformOrigin: `${cx}px ${cy}px`, opacity: 1 / (i + 1)}}>
          {children}
        </AbsoluteFill>
      ))}
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
// Cross-zoom at 30 fps: f0 scale 1.2 spread .06 | f1 scale 1.28 spread .06 | f2 bridging plate in <Soft sigma={4}> | f3 the macro.
// 8 copies of a heavy layer is costly: render the outgoing composite once to a still (Freeze) and zoom the still.
```

### 15. Colour flash frame (1-6 frames, on a hit) · `flash-frame`

Family: colour, transition. Starter: `fx/Flashes`. The code adds the ghost flash, the capture overexposure and the
element flash.

**Job.** The punch: energy at a cut point, a capture or create moment, a state change. One frame of light reads as an
event, not as a transition.

**Numbers.**
- 1-6 frames: one full-frame white frame by default; 2-3 f for a matte or dissolve flash; 6 f for an
  overexposed capture.
- Full-frame `#EDEDED`-`#FFFFFF`, or element-only (a button, a silhouette, tiles); +30 % luma for a material snap.
- It often carries a ghost of the outgoing image at 10-30 % luma, an inverted band (x 21-78 % of the width), or light
  streaks on the following black frame.
- Sound: always on a hit.

**Presets.**
- *Ghost flash.* At peak speed of a blurred whip, one frame `#EDEDED` with a grey ghost of the outgoing box, then one
  black frame with faint horizontal light streaks (mean luma about 8), then the next shot.
- *Pure white frame.* One `#FFFFFF` frame between a subtitle collapsing into a streak and the streak resolving into
  the next word.
- *Flash between lines.* Line, white flash, line, white flash, line: three statements in one rhythm.
- *Inverted band.* Three one-frame flash images, each with a colour-inverted vertical band over 21-78 % of the width.
- *Element flash.* A button whitens (`#E8F6FF` fill, 60 px glow) for one frame, then the whip cut.
- *Material snap.* A 2-frame dissolve with a +30 % luma flash as an object snaps into a new material state.
- *Impact wash.* A 3-4 frame flash around an impact: core radius 50 px, half intensity at 82 px, a tenth at 98 px.
- *Capture flash.* `brightness(2.6) contrast(1.6) saturate(2.4)` on the picture for 6 frames, with the shutter click.
- *Matte flash.* Opacity 1.0, 0.6, 0.12 over three frames.

**Rich.** One frame, exactly on the audio hit, carrying a ghost or streak of what came before; element flashes tied to
an action (click, snap).

**Cheap.** Multi-frame fade-to-white cross-fades; repeated strobing; a flash on every cut.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Soft, f30} from './fx-shared';

/** Ghost flash: frame `at` = #EDEDED with a grey ghost of `ghost`; frame at+1 = black with soft horizontal streaks. */
export const GhostFlash: React.FC<{at: number; ghost: React.ReactNode}> = ({at: a, ghost}) => {
  const {fps} = useVideoConfig();
  const f = Math.floor(f30(useCurrentFrame(), fps));
  if (f === a)
    return (
      <AbsoluteFill style={{background: '#EDEDED'}}>
        <Soft sigma={6} style={{filter: 'grayscale(1) brightness(0.55) contrast(0.6)', opacity: 0.28, mixBlendMode: 'multiply'}}>{ghost}</Soft>
      </AbsoluteFill>
    );
  if (f === a + 1)
    return (
      <AbsoluteFill style={{background: '#000'}}>
        {[0.42, 0.47, 0.53, 0.58].map((y, i) => (
          <div key={i} style={{position: 'absolute', left: 634, width: 1080, top: 1080 * y, height: 3 + (i % 2) * 2, background: 'rgba(255,255,255,0.10)', filter: 'blur(3px)'}} />
        ))}
      </AbsoluteFill>
    );
  return null;
};

/** Capture flash: overexpose the current picture for 6 frames. */
export const overexpose = (active: boolean) => (active ? 'brightness(2.6) contrast(1.6) saturate(2.4)' : undefined);

/** Element flash: one frame of a light fill + a 60 px glow. */
export const flashStyle = (on: boolean, fill = '#E8F6FF'): React.CSSProperties => (on ? {background: fill, boxShadow: `0 0 60px ${fill}`} : {});
```

### 16. Light flood, white wash and white-out · `light-flood`

Family: light, transition. Starter: `fx/Washes`, `fx/Exposure`. The code adds a directional wash with a soft front.

**Job.** A soft scene change that feels like light, not an edit: the old world is overexposed away and the new one
forms out of the light. It suits calm, optimistic beats.

**Numbers.** 8-15 frames (11 f at 24 fps); luma target 240-255 (a pale wash at 0.75). Directional (a front with a soft
edge about a quarter of the frame wide), radial (from the subject) or a zoom-through (quad-in, x1.7). The new content
cuts on mid-wash, while the light covers the frame.

**Presets.**
- *White wash* (24 fps). A soft white front travels right to left in 11 f over the old shot (built from 8 strips about
  206 px wide); the macro fades under it; the new line cuts on at about 80 % of the run.
- *Pale wash.* `#F0F5F9` from alpha 0 to 0.75 over 10 f; out through 0.85, 0.6, 0.35, 0.12 in 4 f.
- *Push-out flood.* A push-out and a light flood with the hard cut hidden under the light.
- *Frosted fly-in.* A huge white frosted window flies in from in front of the lens and covers the frame; the next scene
  is behind it.
- *Zoom through white* (24 fps). An accelerating push (quad-in, x1.74 over 19 f) through the white centre of an object
  into the next scene.
- *Blur to white.* A line blurs into an empty white frame.

**Rich.** A front with direction and a soft edge; the cut hidden at peak light; the new content already there as the
light recedes.

**Cheap.** A plain cross-dissolve through white; a fade to white that holds an empty white frame.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {EZ, f30} from './fx-shared';

/** Wash: a soft white front crosses the frame right -> left in `frames`; `next` cuts on at `cutShare` of the run. */
export const WhiteWash: React.FC<{start: number; frames?: number; cutShare?: number; prev: React.ReactNode; next: React.ReactNode; colour?: string}> = ({start, frames = 14, cutShare = 0.7, prev, next, colour = '#FFFFFF'}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  if (t < 0) return <AbsoluteFill>{prev}</AbsoluteFill>;
  if (t > frames) return <AbsoluteFill>{next}</AbsoluteFill>;
  const u = t / frames;
  const soft = 520;
  const front = 1920 + soft - (1920 + 2 * soft) * EZ.expoOut(Math.min(1, u / 0.85)); // white edge x, moving left
  const wash = `linear-gradient(to right, transparent ${front - soft}px, ${colour} ${front}px, ${colour} 100%)`;
  const out = u > 0.85 ? (u - 0.85) / 0.15 : 0; // wash recedes over the last 15 %
  return (
    <AbsoluteFill>
      {u < cutShare ? prev : next}
      <AbsoluteFill style={{background: wash, opacity: 1 - out}} />
    </AbsoluteFill>
  );
};
```

### 17. Soft-edge linear mask reveal (feathered wipes on type and cards) · `soft-mask-reveal`

Family: mask. Starter: `fx/TypeMask`, `fx/MaskRise`, `fx/Wipe`. The code adds a slide that carries its own feathered
mask, and a screen-fixed edge fade.

**Job.** A reveal that reads like light passing or like the reading direction, tied to the element's own motion, so the
word is born as it moves.

**Numbers.** Feather 60-250 px (one to two glyph widths, up to a word's width); the mask edge moves with the element;
6-15 f. Hard clip edges (feather 0) for slot reveals; screen-fixed fades about 300 px wide.

**Presets.**
- *Slide and reveal* (24 fps). A word slides left 154 px on an expo-out while a soft 250 px linear mask reveals it left
  to right over 10 f; no per-letter animation.
- *Double wash.* Text revealed right to left twice with a 60 px soft edge: first a pale accent ghost, then the ink.
- *Edge fade.* `alpha = smoothstep(x, 120, 430)` fixed to the screen: a moving line fades in as it crosses the left
  edge. Around a sphere: text alpha multiplied by `smoothstep(dist, 210, 330)`.
- *Gradient sweep down.* A dark vertical gradient sweeps down over the cards to close a scene.
- *Slot reveal.* Text clipped to one side of a moving edge (a card side or a panel divider) while it slides out;
  panels are `overflow: hidden` windows onto full-size content.

**Rich.** A wide feather (a glyph or more); the mask edge travelling with the slide; a fixed clip edge the content
passes under (it feels physical).

**Cheap.** A hard-edged linear wipe on a static word; a wipe direction unrelated to the motion.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {EZ, f30} from './fx-shared';

/** Slide left `slide` px while a `feather` px soft mask reveals left -> right, both on one expo-out. */
export const SoftMaskSlide: React.FC<{start: number; frames?: number; slide?: number; feather?: number; width: number; children: React.ReactNode}> = ({start, frames = 12, slide = 154, feather = 250, width, children}) => {
  const {fps} = useVideoConfig();
  const t = f30(useCurrentFrame(), fps) - start;
  const p = EZ.expoOut(Math.max(0, Math.min(1, t / frames)));
  const edge = -feather + (width + feather) * p; // mask edge in element px
  const m = `linear-gradient(to right, #000 ${edge}px, transparent ${edge + feather}px)`;
  return (
    <div style={{transform: `translateX(${slide * (1 - p)}px)`, WebkitMaskImage: m, maskImage: m}}>{children}</div>
  );
};

/** Screen-fixed edge fade: wrap a moving line; the mask does not move with it. */
export const EdgeFade: React.FC<{from?: number; to?: number; children: React.ReactNode}> = ({from = 120, to = 430, children}) => {
  const m = `linear-gradient(to right, transparent ${from}px, #000 ${to}px)`;
  return <div style={{position: 'absolute', inset: 0, WebkitMaskImage: m, maskImage: m}}>{children}</div>;
};
```

### 18. Particle and point fields (few, placed, glowing) · `particle-field`

Family: particles, light. Starter: `fx/Seed`, `fx/GlyphField`. The code adds a placed point field, a zooming star
field and the depth extras.

**Job.** Scale and multitude ("many signals", "the whole team"), a network, a night; a field the camera dives through to
change scenes.

**Numbers.**
- 6-15 hero points, plus 2-10 faint depth points at 30-40 % opacity; texture fields (digits, specks) up to about 60
  visible items.
- Points 2-31 px (glow-core diameter 11-31 px); objects 110-150 px; bokeh 52-103 px blurred 4 px.
- Glow 6-10 px Gaussian at 30-50 %. One motion law per field.
- Stagger one new point every 2 f; growth about 8 f on `cubic-bezier(0.2, 0.8, 0.3, 1)`.

**Presets.**
- *Placed night.* Eleven blue dots pop in one every 2 frames at fixed positions (x, y, diameter): (475, 634, 21),
  (536, 291, 21), (643, 724, 28), (752, 559, 17), (830, 365, 25), (965, 547, 30), (1185, 728, 18), (1203, 575, 11),
  (1222, 348, 31), (1377, 718, 21), (1416, 495, 17). Each grows from 0 over 8 f, pops 20-190 px right of its place and
  glides in over 12 f, then drifts 0.3 px per frame. Core `#4A5BF0` (45 % of the diameter), glow `#2A3BD0` at 50 %,
  sigma 6-10; ten faint 3-5 px points at 30 %. The field recedes about (950, 520) with cumulative scale 0.998, 0.995,
  0.993, 0.988, 0.982, 0.968, 0.94.
- *Star field.* A hard cut to 15 white dots (10 px, a 1.5 px soft edge, a 6 px white glow at 30 %) around the centre;
  the positions zoom outward from the centre while the dots keep their size; later the dots become UI chips.
- *Glass rain.* 6-10 small gradient glass cubes (110-150 px) drift down 4-10 px per frame and spin 1-2 degrees per
  frame; the near ones blurred.
- *Digit field.* A binary-digit texture (cap 11 px, pitch 17 x 19, ink `#161616` on `#090909`) masked by an ellipse
  560 x 520 with a 260 px feather, drifting with the camera.
- *Bokeh.* Dark dots float in: diameter 103 px half off a corner blurred 4 px, 52 px nearer the middle, a few more.

**Rich.** Few points at placed positions; staggered pops; depth through faint, blurred extras; one motion law for the
field; points that become UI.

**Cheap.** Hundreds of random twinkling dots; sparkles and confetti; every particle with its own random motion;
particles as decoration with no job.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, random} from 'remotion';
import {at, EZ, f30} from './fx-shared';

type P = [number, number, number]; // x, y, glow-core diameter
/** Point field: one point every `cadence` f, pops right of its place, glides in over 12 f, grows over 8 f, drifts 0.3 px/f. */
export const PointField: React.FC<{start: number; points: P[]; cadence?: number; core?: string; glow?: string; recedeAt?: number}> = ({start, points, cadence = 2, core = '#4A5BF0', glow = '#2A3BD0', recedeAt}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  const t0 = f - start;
  // recede: cumulative scale about (950,520) from a frame table
  const k = recedeAt === undefined ? 1 : at(f - recedeAt, {0: 1, 1: 0.998, 2: 0.993, 3: 0.986, 4: 0.974, 5: 0.957, 6: 0.926, 7: 0.871});
  return (
    <AbsoluteFill style={{transform: `scale(${k})`, transformOrigin: '950px 520px'}}>
      {points.map(([x, y, d], i) => {
        const t = t0 - i * cadence;
        if (t < 0) return null;
        const off = 20 + 170 * random(`pop${i}`);
        const gx = x + off * (1 - EZ.expoOut(Math.min(1, t / 12))) + 0.3 * Math.max(0, t - 12) * 0.7;
        const gy = y + 0.3 * Math.max(0, t - 12) * 0.7;
        const s = EZ.pop(Math.min(1, t / 8));
        const breathe = 1 + 0.06 * Math.sin((f + i * 7) / 9);
        return (
          <div key={i} style={{position: 'absolute', left: gx - d / 2, top: gy - d / 2, width: d, height: d, transform: `scale(${s * breathe})`}}>
            <div style={{position: 'absolute', inset: -d * 0.4, borderRadius: '50%', background: glow, opacity: 0.5, filter: `blur(${d * 0.3}px)`}} />
            <div style={{position: 'absolute', inset: d * 0.275, borderRadius: '50%', background: core}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Star field: positions zoom from a centre (the dots themselves do not grow). zoom(f) from a frame table or an expo-out. */
export const ZoomField: React.FC<{dots: [number, number][]; centre: [number, number]; zoom: number}> = ({dots, centre, zoom}) => (
  <AbsoluteFill>
    {dots.map(([x, y], i) => {
      const X = centre[0] + zoom * (x - centre[0]), Y = centre[1] + zoom * (y - centre[1]);
      return <div key={i} style={{position: 'absolute', left: X - 5, top: Y - 5, width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF',
        boxShadow: '0 0 0 1.5px rgba(255,255,255,0.4), 0 0 6px 2px rgba(255,255,255,0.3)'}} />;
    })}
  </AbsoluteFill>
);
```

### 19. Light cones, pillars, beams and neon (emissive geometry) · `light-geometry`

Family: light. Starter: `fx/light/*`, `fx/LightField`. The code adds a hard additive light cone and a growing pillar.

**Job.** It makes a world out of light alone (a stage, a hall, a horizon) and points at the hero: a cone or a pillar is
a spotlight that says "this".

**Numbers.**
- Edges sharp (2-4 px) with a soft inner falloff of 30-60 px; halos 40-60 px in the element's own colour.
- Growth 3-10 f (a pillar's top goes from y 620 to 0 in 4 f on an expo-out); beams thin as the camera pulls away (40 ->
  4 px over the pull-back).
- Blend: additive (screen) over the world, never over the near defocused layer or the wordmark.

**Presets.**
- *Pillar shoot* (24 fps). An emissive strip grows up from the bottom edge and widens; its top at y 620, 328, 158, 32, 0
  on successive frames; its colour white -> `#FBDDBB` -> `#ED31AC` over 3 frames; half-width on `cubic-bezier(0.2, 0.9,
  0.3, 1)`; halo 40-60 px.
- *Travelling pulse.* A pale band travels along a coloured emissive strip with a soft 150-250 px boundary, period 6-10 f.
- *Y-split.* A thin pillar splits into two straight beams racing to the top corners at 44 degrees; they thin and dim as
  the camera pulls back.
- *Hard cone.* An additive inverted triangle from the top edge: its top edge at y 198 spanning x 804-1113 and its apex
  at (960, 753), widening in 2 frames to the full top edge (x 618-1308) with the apex at (948, 828); a cream centre
  `#FBDDBB` to accent edges `#ED31AC`, 30-60 px inner falloff, 2-4 px edge.
- *Neon ring.* A ring whose stroke thins 40, 24, 12, 6, 4 px as the camera pulls away.
- *Horizon.* A straight cool neon horizon rises out of the top of the frame as the camera tilts down, a reflection
  below the line.
- *Light curtain.* A generated page floats on a curtain of vertical glowing columns; glow bars rise behind a grid.

**Rich.** Sharp-edged geometry with a soft interior falloff; own-colour halos; additive blending; light that thins with
distance.

**Cheap.** Soft blurry god rays everywhere; lens flares; a light with no source or no target.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/** Hard light cone: an inverted triangle, sharp edge, cream centre -> accent edges (30-60 px inner falloff), additive. */
export const LightCone: React.FC<{topX0: number; topX1: number; apex: [number, number]; centre?: string; edge?: string}> = ({topX0, topX1, apex, centre = '#FBDDBB', edge = '#ED31AC'}) => {
  const id = `cone-${topX0}-${apex[1]}`;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen'}}>
      <svg width={1920} height={1080}>
        <defs>
          <linearGradient id={id} x1={topX0} y1="0" x2={topX1} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={edge} /><stop offset="0.12" stopColor={centre} stopOpacity="0.9" />
            <stop offset="0.5" stopColor={centre} /><stop offset="0.88" stopColor={centre} stopOpacity="0.9" /><stop offset="1" stopColor={edge} />
          </linearGradient>
        </defs>
        <polygon points={`${topX0},0 ${topX1},0 ${apex[0]},${apex[1]}`} fill={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Pillar: a strip from the bottom edge up to topY, own-colour halo (60 px), additive. */
export const LightPillar: React.FC<{x: number; topY: number; halfW: number; colour: string; halo?: string}> = ({x, topY, halfW, colour, halo = colour}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen'}}>
    <div style={{position: 'absolute', left: x - halfW - 60, top: topY, width: 2 * halfW + 120, height: 1080 - topY, background: `linear-gradient(to right, transparent, ${halo}55 40%, ${halo}55 60%, transparent)`, filter: 'blur(20px)'}} />
    <div style={{position: 'absolute', left: x - halfW, top: topY, width: 2 * halfW, height: 1080 - topY, background: colour, borderRadius: halfW}} />
  </AbsoluteFill>
);
```

### 20. Light trails, comets and chromatic light lines · `light-trails`

Family: light, particles. Starter: `fx/Streak`, `fx/Trace`. The code adds a ring of light arcs on a canvas and a
three-colour chromatic line.

**Job.** Energy, speed, "something powerful running": light that moves through space and then resolves into the next
element (a word, a logo, a cut).

**Numbers.** Strand widths 2-18 px; additive; colour from a white-hot core to the accent to a dark tail; a chromatic
fringe offset of 1-3 px. Arcs rotate about 3 degrees per frame; comets orbit and converge on the cut; spirals draw on
clockwise, on twos.

**Presets.**
- *Light-trail ring.* About 60 arcs like long-exposure light painting: ellipse radii 520-620 x 380-460 px tilted
  -20 degrees, strokes 2-18 px, colours white, gold `#DDBA20`, dark `#5C3A05`, each arc sweeping 120-300 degrees and
  advancing 3 degrees per frame; a 12 px blurred glow copy; a 3 px cyan / magenta fringe pair; `lighter` blend.
- *Comets.* Two point-symmetric comets expand, orbit and collapse, with light-painting squiggles in the last 8 frames
  (5-7 strokes of 2 px, 40-110 px long, on a 300-600 px ring, re-seeded every frame).
- *Chromatic spiral.* One continuous light line drawn clockwise as a loose spiral around a caption: a 2-3 px white
  core, a 3 px warm / cool fringe, a tail through orange, green and blue offset 0 / 1 / 2 px.
- *Streak resolve.* Three parallel 6 px-apart light lines across 350 px resolve into a word on the next frame.
- *Roaming light.* A light roams; three curves merge into one line that draws right; a light-sweep wipe carries into the
  next scene.

**Rich.** Additive strands with a white-hot core and an accent body; a fringe of 1-3 px; motion that ends in a
convergence or a resolve.

**Cheap.** Neon loops with no destination; a glow trail on every cursor; lines in many unrelated hues.

```tsx
import React, {useLayoutEffect, useRef} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import {f30} from './fx-shared';

/** Ring of light arcs on a canvas ('lighter'); pure function of the frame (no state). Bake to PNGs if slow. */
export const TrailRing: React.FC<{cx?: number; cy?: number; n?: number}> = ({cx = 700, cy = 540, n = 60}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  useLayoutEffect(() => {
    const c = ref.current!, g = c.getContext('2d')!;
    g.clearRect(0, 0, 1920, 1080);
    g.globalCompositeOperation = 'lighter';
    const draw = (dx: number, tint?: string, alpha = 1) => {
      for (let i = 0; i < n; i++) {
        const rx = 520 + 100 * random(`rx${i}`), ry = 380 + 80 * random(`ry${i}`);
        const sweep = (120 + 180 * random(`sw${i}`)) * (Math.PI / 180);
        const a0 = (random(`a${i}`) * 360 + 3 * f) * (Math.PI / 180);
        const w = 2 + 16 * Math.pow(random(`w${i}`), 3);
        const heat = random(`h${i}`);
        g.strokeStyle = tint ?? (heat > 0.8 ? '#FFFFFF' : heat > 0.35 ? '#DDBA20' : '#5C3A05');
        g.globalAlpha = alpha * (0.35 + 0.65 * heat);
        g.lineWidth = w;
        g.beginPath();
        g.ellipse(cx + dx, cy, rx, ry, (-20 * Math.PI) / 180, a0, a0 + sweep);
        g.stroke();
      }
    };
    g.filter = 'blur(12px)'; draw(0, undefined, 0.6);               // the glow copy (canvas filter, Chromium)
    g.filter = 'none';
    draw(-3, '#00E5FF', 0.18); draw(3, '#FF3DCB', 0.18); draw(0);   // fringe copies, then the strands
  }, [f, cx, cy, n]);
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}} />;
};
// Slow in software GL? Render it once to a PNG sequence at 960x540 and play it back with <Img>.

/** Chromatic line: one path stroked three times with offsets 0 / 1 / 2 px (orange, green, blue) under a white core. */
export const ChromaticPath: React.FC<{d: string; progress: number; len: number}> = ({d, progress, len}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
    {[['#E07040', 0], ['#3CC85A', 1], ['#3058D0', 2]].map(([c, o]) => (
      <path key={c as string} d={d} fill="none" stroke={c as string} strokeWidth={3} transform={`translate(${o},${o})`} strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
    ))}
    <path d={d} fill="none" stroke="#F4F8FF" strokeWidth={2.5} strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
  </svg>
);
```

### 21. Stage glow behind the hero (a soft radial halo) · `stage-glow`

Family: light. Starter: `fx/LightField`, `fx/Glow`. The code adds a hopping glow and the baked dark halo.

**Job.** It lights the hero so the dark stage reads as a space and the eye goes to the lit spot; a hopping glow says
which item is active now.

**Numbers.** Radius 70-600 px; tiny on dark grounds (+5 to +12 luma at the core); it follows the hero or hops to the
active item in 2-4 f steps.

**Presets.**
- *Dark stage halo.* Stage `#090909`, under-glow `#121212` (+9 luma), centred on the hero for the whole film except a
  flash frame; the box glow is sigma 60 px at 6 %. Bake and dither it: a CSS ramp across nine code values bands.
- *Click under-glow.* `rgba(240,120,40,0.35)` with radius 500 under a click ring, living 0.9 -> 0.6 -> 0 over 12 f.
- *Hopping glow.* A radial `#FFB27A` at 40 %, radius 70 px, behind KPI cards, hopping from card to card in 2-6 f steps,
  gone 14 f later.
- *Centre lift.* Ground `#0B0D12` with a soft lighter centre `#14171E` (radius about 600 px) behind the centre line.

**Rich.** Nearly invisible (+5-12 luma), dithered, following the hero.

**Cheap.** A bright visible blob; a glow fixed at the frame centre with nothing in it.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {at, f30} from './fx-shared';

/** A hopping glow: x/y tables in 30-fps frames; stepped hops are short eases between keys. */
export const HopGlow: React.FC<{x: Record<number, number>; y: number; r?: number; colour?: string; alpha?: number; gone?: number}> = ({x, y, r = 70, colour = '#FFB27A', alpha = 0.4, gone}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  if (gone !== undefined && f > gone) return null;
  const cx = at(f, x);
  return <div style={{position: 'absolute', left: cx - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', opacity: alpha,
    background: `radial-gradient(closest-side, ${colour}, transparent)`}} />;
};
// The +9-luma stage halo must be a baked, dithered plate: a CSS ramp from #090909 to #121212 is 9 code values (it bands).
```

### 22. 3D lighting rig (key, rim, hemisphere fill; no realtime shadows) · `light-rig-3d`

Family: 3D lighting. Starter: `fx/three/*`, `fx/KeyLight`, `fx/Lit` (see `three.md`). The code adds an extruded-mark
rig and a pull-back with a matching roll.

**Job.** It gives the hero object volume (the logo becomes a thing), and its light makes the object belong to the
film's world (the key matches the floor glow and the sweeps).

**Numbers.**
- Key from the upper left (azimuth about 315 degrees, elevation 35-50 degrees); a cool rim from the right or behind; a
  hemisphere fill at 0.6-0.9.
- Roughness 0.3-0.6, metalness 0; emissive only for the part that is alive (a figure's head, a core).
- No realtime shadows (bake contact shadows instead, see `shadows`); a screen-fixed gradient background; depth of field
  only at the extremes of a move.

**Presets.**
- *Extruded mark.* Extrude the mark's SVG paths with depth 0.35 x the arm width, a 2-3 % bevel with rounded edges
  (radius 0.08 x arm width). Coloured face `#1E56E8`, roughness 0.35, metalness 0, edge glint `#6FD3FF`; dark variant
  `#141416`, roughness 0.3, sides `#8A8A8C` / `#2A2A2C`. Key directional upper-left-front, cool rim right, hemisphere
  sky `#CFE0FF` / ground white. Background radial `#4B7BEF` -> `#9FBDF5` at 300 px -> white at 520 px. Pull-back:
  scale 1.0, 0.624, 0.456, 0.378, 0.33, 0.297, 0.287, 0.278 at 0, 3, 8, 13, 18, 23, 28, 33 f with a roll building to
  about 15 degrees, then landing in the lockup.
- *Diorama.* About 6k triangles: a lathe disc with a rounded profile, white standard material at roughness 0.6, a
  shallow bowl under it; key, rim and hemisphere fill as above.
- *Light as sprites.* Light effects as additive sprites; glass at alpha 0.35-0.75 with opaque rims; emissives blooming
  in their own colour.
- *Flat cubes.* Flat faces (`#154626`, sides `#092913`), no outlines, no ground shadows, no reflections; fast frames
  blurred by 5-sample accumulation.
- *Filmed render.* A clean 3D render seen as if filmed off a screen: a lens layer of depth bands, fringes and a screen
  grid over it.
- *Pre-rendered objects.* Phones and coins rendered once to an image sequence rather than run live in software GL.

**Rich.** One key, one rim, a soft fill; edge glints on bevels; a quiet background; a purposeful camera move (a
pull-back that lands).

**Cheap.** A default ambient plus a point light; chrome or metallic logos; an idle spinning logo; realtime shadow maps
that alias in software GL.

```tsx
import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import * as THREE from 'three';

/** The house rig: key (upper-left-front), cool rim (right/back), hemisphere fill. No shadow maps (software GL). */
export const RefRig: React.FC = () => (
  <>
    <hemisphereLight args={['#CFE0FF', '#FFFFFF', 0.75]} />
    <directionalLight position={[-4, 5, 6]} intensity={1.6} color="#FFFFFF" />
    <directionalLight position={[6, 1, -4]} intensity={0.9} color="#BFD8FF" />
  </>
);

/** Pull-back: camera distance grows x3.6 on a log-distance ease with a matching roll (30 fps frames from the start). */
export const PullBackMark: React.FC<{start: number; geometry: THREE.BufferGeometry}> = ({start, geometry}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = Math.max(0, Math.min(1, ((frame * 30) / fps - start) / 34));
  const e = 1 - Math.pow(1 - t, 3); // close to cubic-bezier(0, .31, .4, .89) on log distance
  const dist = 4 * Math.pow(3.6, e);
  const roll = THREE.MathUtils.degToRad(17.1 * e);
  return (
    <ThreeCanvas width={width} height={height} camera={{position: [0, 0, dist], fov: 30}} gl={{antialias: true}}>
      <RefRig />
      <group rotation={[0, 0, -roll]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#1E56E8" roughness={0.35} metalness={0} />
        </mesh>
      </group>
    </ThreeCanvas>
  );
};
// Extrude: new THREE.ExtrudeGeometry(shapes, {depth: 0.35 * arm, bevelEnabled: true, bevelThickness: 0.03 * arm, bevelSize: 0.03 * arm, bevelSegments: 4}).
// Background: keep the gradient as a screen-fixed DOM layer behind the canvas (gl alpha true), not a 3D object.
```

### 23. Shadows: hover height, contact, tinted card shadows · `shadows`

Family: depth, light. Starter: `fx/Glow` `ColourShadow`. The code adds a hover shadow that converges as the element
lands, and a contact shadow.

**Job.** Height and weight: a far shadow says "above", a converging shadow says "landing", a contact shadow says
"standing here".

**Numbers.**
- Light UI: y 2-18 px, blur 6-50 px, alpha 0.04-0.12, tinted with the ground's hue (blue-grey, plum, navy).
- Dark UI: y 18-20 px, blur 24-60 px, alpha 0.35-0.5, tinted navy (`rgba(8,16,48,.35)`).
- Hover: the offset scales with height (170 px -> 13 px over 16 f as a cursor descends), the blur shrinking with it.
- Contact: an ellipse 0.3-0.5 x the object's width, alpha 0.5, blur 25 px, just below the object.

**Presets.**
- *Hover cursor* (24 fps). A giant outlined cursor with a blurred grey drop shadow far below and right flies in; the
  shadow offset goes (170, 120), (140, 147), (133, 133), (70, 90), (20, 40), (13, 33) px over 16 f as it descends; on
  the click the cursor scales to 0.72.
- *Object on a desk.* `rgba(0,0,0,0.35)`, blur 30 px, offset 40 px down-right.
- *Contact under a title.* A soft dark ellipse about 520 x 70 px centred 55 px below the title centre, black at 0.5,
  blur 25 px.
- *Tinted cursor.* Shadow in the brand blue at 25 %, blur 12 px, offset 6 px down-right; a phone at 25 %, blur 20,
  offset 8 down.
- *Plain 3D cursor.* Offset (12, 22), blur 20, `rgba(0,0,0,0.16)`.
- *Card stacks.* `0 18px 50px rgba(40,80,120,.08), 0 6px 18px rgba(60,100,140,.06)` on pale blue; `0 18px 40px
  rgba(60,70,160,.12)` on periwinkle.

**Rich.** Tinted with the ground hue, very low alpha, the offset proportional to height; converging on landing;
contact shadows under objects on light floors.

**Cheap.** A grey `rgba(0,0,0,.3)` on everything; the same shadow at every height; text shadows.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {at, f30} from './fx-shared';

/** Hover: offset and blur shrink as the element descends; height h in 0..1 (1 = high). */
export const hoverShadow = (h: number, tint = 'rgba(60,70,90,0.28)') => {
  const dx = 13 + 157 * h, dy = 33 + 107 * h, blur = 8 + 30 * h;
  return `drop-shadow(${dx}px ${dy}px ${blur}px ${tint})`;
};
// Descent at 30 fps over 20 f: h = at(t, {0: 1, 5: 0.88, 11: 0.8, 16: 0.42, 19: 0.05, 20: 0})

/** Contact shadow under a moving element. */
export const ContactShadow: React.FC<{cx: number; y: number; w?: number; h?: number}> = ({cx, y, w = 520, h = 70}) => (
  <div style={{position: 'absolute', left: cx - w / 2, top: y - h / 2, width: w, height: h, borderRadius: '50%', background: '#000', opacity: 0.5, filter: 'blur(25px)'}} />
);

/** Tinted light-UI card shadows (two layers, ground hue). */
export const cardShadow = (hueRgb = '40,80,120') => `0 18px 50px rgba(${hueRgb},.08), 0 6px 18px rgba(${hueRgb},.06)`;
```

### 24. Colour-front sweep through type (gradient fill sweep) · `colour-front-sweep`

Family: gradient, type. Starter: `fx/TypeFill`, `fx/HueSweep`. The code adds a heat entry (a five-stop gradient
sliding through the word) and a front with a hot leading band.

**Job.** It marks the newest word with the accent and then lets it settle into the sentence: the eye follows the colour
front through the line.

**Numbers.** The front is 0.3-1 word wide; 6-25 f; the settle from accent to ink takes 3-9 f. Fronts carry a hot band
ahead of the final colour (orange-peach ahead of white; gold ahead of black).

**Presets.**
- *Write and sweep* (25 fps). The title writes on left to right in a coral-to-pink gradient over 11 f, then a white
  front sweeps left to right through it over 20 f with a warm band ahead of the white.
- *Ink to white.* The fill becomes a horizontal white -> black gradient whose stop slides right over 5 f (24 fps).
- *Outline then fill.* The title outline writes on, then a fill sweep follows.
- *Palette ink.* A word written in an eight-stop ink (`#F7D34C` `#F1A051` `#E6606B` `#A3BA67` `#78A69A` `#407CD0`
  `#25549E` `#1A1B1E`) that resolves to the last, darkest stop.
- *Born in the accent.* Words are born blue and settle to ink; the accent word stays blue.
- *Heat entry* (seven frames). A five-stop gradient across the word slides left, the dark end on the right: frame 0
  `transparent transparent #F8D794 #EEA653 #CC6E56`; frame 1 `transparent #F8DA99 #F1AA55 #CB715D #80374C`; frame 2
  `#F6C16B #E18650 #A14756 #461A2B #110509`; frame 3 `#D77B54 #8E3D50 #2E111B #030102 #000`; frame 4 `#AA5258 #521F34
  #0F080B #000 #000`; frame 5 `#6D2C43 #1E0A12 #000 #000 #000`; frame 6 all black.

**Rich.** A front with a hot leading band and a settle; colours from the palette; the sweep following reading or
motion.

**Cheap.** A rainbow gradient left on the text; every word animating its colour.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {f30} from './fx-shared';

/** Heat entry: the word's fill is a 5-stop gradient from the table; step u = frame since entry (0..6). */
const HEAT = [
  ['transparent', 'transparent', '#F8D794', '#EEA653', '#CC6E56'], ['transparent', '#F8DA99', '#F1AA55', '#CB715D', '#80374C'],
  ['#F6C16B', '#E18650', '#A14756', '#461A2B', '#110509'], ['#D77B54', '#8E3D50', '#2E111B', '#030102', '#000000'],
  ['#AA5258', '#521F34', '#0F080B', '#000000', '#000000'], ['#6D2C43', '#1E0A12', '#000000', '#000000', '#000000'],
];
export const HeatWord: React.FC<{start: number; text: string; style: React.CSSProperties}> = ({start, text, style}) => {
  const {fps} = useVideoConfig();
  const u = Math.floor(f30(useCurrentFrame(), fps) * (23.976 / 30) - start * (23.976 / 30)); // table is per 23.976 fps frame
  if (u < 0) return null;
  if (u >= 6) return <span style={{...style, color: '#000'}}>{text}</span>;
  return <span style={{...style, backgroundImage: `linear-gradient(to right, ${HEAT[u].join(', ')})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{text}</span>;
};
```

### 25. Status shimmer through text ("working" labels) · `status-shimmer`

Family: light, UI. Starter: `fx/Loaders`, `fx/Exposure` `LightSweep` (loop mode). The code adds a darker-band shimmer
for light UI whose phase carries across text swaps.

**Job.** "The product is working on it": a live state between request and result, without a spinner.

**Numbers.** Band 40-120 px (an ASCII band up to 350 px); a darker band on light UI, a lighter band on grey or dark UI.
Speed 12 px per frame (loop) to 90 px per frame (one-shot); period 18-30 f; held only while the state lasts, stopped on
the result.

**Presets.**
- *Dark band on light UI.* A band about 70 px wide where grey text turns darker (`#9C9C99` over a base `#C9C9C6`), soft
  edges, moving right at 12 px per frame, loop 30 f, faded in over 3 f; the phase continues when the label text swaps.
- *Gap shimmer.* A 40 px dark gap travelling through the text, period 18 f ("slide to answer" style).
- *Light band on grey.* Mean ink `#C8C8C8` -> `#DCDCDC` -> `#C8C8C8` as a lighter band crosses a thinking label.
- *Working label.* A grey highlight band sweeps the label left to right; the label then turns into the result line.
- *Thinking row.* Grey `#9A9A9A` label with a small icon and a shimmer, followed by a "thought for N seconds" row.
- *Colour shimmer.* The ink shimmers between two accents while three dots pulse one after another.
- *ASCII sweep* (24 fps). A field of `+ = x - .` glyphs on a 9 px grid (mono, 10 px) in the accent, a 350 px tall band
  sweeping at 90 px per frame, twice, 20 f apart.

**Rich.** Subtle contrast (+/-30-40 levels); it stops exactly when the result arrives; the phase continues across a text
swap.

**Cheap.** A bright white band on everything; a shimmer that never resolves.

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {f30} from './fx-shared';

/** Shimmer: a darker band through grey text, moving 12 px/f with a 30 f loop; phase continues across text swaps. */
export const Shimmer: React.FC<{text: string; style: React.CSSProperties; width: number; base?: string; band?: string; bandPx?: number; loop?: number; start?: number}> = ({text, style, width, base = '#C9C9C6', band = '#9C9C99', bandPx = 70, loop = 30, start = 0}) => {
  const {fps} = useVideoConfig();
  const f = f30(useCurrentFrame(), fps);
  const x = (((f - start) % loop) / loop) * (width + 2 * bandPx) - bandPx;
  const fade = Math.min(1, Math.max(0, (f - start) / 3));
  const g = `linear-gradient(90deg, ${base} ${x - bandPx / 2}px, ${band} ${x}px, ${base} ${x + bandPx / 2}px)`;
  return <span style={{...style, backgroundImage: fade > 0 ? g : undefined, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: fade > 0 ? 'transparent' : base}}>{text}</span>;
};
```

### 26. Pixel mosaic and blocky reveals · `pixel-mosaic`

Family: mask, texture. Starter: `fx/Pixel`, `fx/BlockStep`, `fx/DotMatrix`. The code adds a structured block reveal
with seeded ragged fronts and a progressive image load on twos.

**Job.** "Digital, generated, loading": the picture assembles from data. It also works as a brand-coloured wipe.

**Numbers.** Blocks 10-30 px (house cells 14-24 px); steps on twos; 3-25 f; ragged fronts from seeded per-block
thresholds; diamond or ring orders from a centre; the palette's accent as the block colour.

**Presets.**
- *Diamond reveal.* A photo revealed through square cells (14.5-16 px) in diamond rings from a centre; the cells settle
  with a small spring of 120, 40, 37, -19, -19, 11, 0 px offsets.
- *Accent wipe* (60 fps). A 30 px mosaic wipe in the accent and near-black sweeps left to right with a ragged front and
  covers the frame.
- *Stair wipe* (25 fps). Grey 24 px blocks from the top-left, on twos, with a ragged front and a tinted fringe.
- *Element mosaic.* A nearest-neighbour upscale of a 1/b downscale inside the element's box (+16 px around text, +40 px
  when its background is included); text blocks binarised at 0.45.
- *Blocky deal.* A new photo card dealt on top every 8 f through a 3-frame dissolve of 10 px blocks whose threshold is
  seeded noise.
- *Progressive load* (on twos). A picture starts as a 6 px dot, each size held 2 frames, warm and low-res -> final in
  12 f.
- *Mosaic ring iris.* See `iris`.

**Rich.** Block size tied to the layout grid; seeded ragged fronts; on twos; a structured order (rings, diagonals,
reading order).

**Cheap.** A CSS pixelate filter on the full frame; random per-frame noise blocks; blocks aligned to nothing.

```tsx
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {f30} from './fx-shared';

/** Mosaic wipe: blocks of `cell` px switch on when progress passes their seeded threshold; order = left->right with a ragged front. */
export const MosaicWipe: React.FC<{start: number; frames?: number; cell?: number; colour?: string; order?: 'ltr' | 'ring'; cx?: number; cy?: number}> = ({start, frames = 20, cell = 30, colour = '#B8F03A', order = 'ltr', cx = 960, cy = 540}) => {
  const {fps} = useVideoConfig();
  const raw = (f30(useCurrentFrame(), fps) - start) / frames;
  const p = Math.floor(raw * frames / 2) * 2 / frames; // on twos
  if (raw <= 0) return null;
  const cols = Math.ceil(1920 / cell), rows = Math.ceil(1080 / cell);
  const cells: React.ReactNode[] = [];
  const maxD = Math.hypot(1920, 1080) / 2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const base = order === 'ltr' ? i / cols : Math.hypot(i * cell - cx, j * cell - cy) / maxD;
    const th = base * 0.82 + 0.18 * random(`m${i}-${j}`); // ragged front
    if (p >= th) cells.push(<div key={`${i}-${j}`} style={{position: 'absolute', left: i * cell, top: j * cell, width: cell, height: cell, background: colour}} />);
  }
  return <AbsoluteFill>{cells}</AbsoluteFill>;
};
// 64 x 36 = 2304 divs at 30 px is fine; for 10-14 px cells draw into one <canvas> instead.
```

### 27. Lens distortion: barrel bulge and fisheye · `lens-distortion`

Family: lens, distortion. Starter: `fx/Barrel`, `fx/Lens`. The code adds a barrel warp whose strength is driven per
frame and keeps overlays straight.

**Job.** A lens is physical: a bulge on a push makes the move feel like a real camera rushing in; a fisheye says "an old
screen, surveillance, too much".

**Numbers.** `r' = r (1 + k r^2)` with r normalised to the half-diagonal. k 0.01-0.06 for a push accent (it peaks for
about 8 f, then releases); k 0.18 for a fisheye screen look; edges bow 14-25 % of the frame. Always on a push or a
scale-up; overlay elements (the cursor) stay undistorted.

**Presets.**
- *Push bulge.* k = 0.01, 0.03, 0.05, 0.06 over the first 6 f, held to frame 14, then 0.04, 0.02, 0 over 4 f; the edges
  bow about 14 px.
- *UI out of a bulge.* The whole UI scales up out of a lens bulge: barrel strong for 4 f and gone 6 f later, while the
  card grows 552 -> 776 -> 960 -> 1100 -> 1168 -> 1208 -> 1240 -> 1290 px wide over 42 f (a 25 px liquid bulge at the
  start).
- *Fisheye screen.* k = +0.18 over everything except the cursor, 4 px scanlines, edges stretched about 25 %.
- *Bowed grid.* A dashed grid drawn bowed, as if seen through the same lens.

**Rich.** A small k that peaks with the push and releases; the cursor and UI chrome kept straight.

**Cheap.** A permanent fisheye; distortion on text that must be read; warps without a camera move.

```tsx
import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * Barrel warp with feDisplacementMap. The map encodes the per-pixel source offset for k = 1:
 *   offset = (p - c) * (1/(1 + r^2) - 1)  (sample nearer the centre -> content bulges outward)
 * feDisplacementMap: P'(x,y) = P(x + s*(R-0.5), y + s*(G-0.5)); drive s linearly with k (small-k approximation).
 */
const useBarrelMap = (W = 480, H = 270) => useMemo(() => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!, img = g.createImageData(W, H);
  const half = Math.hypot(W / 2, H / 2), maxOff = 0.5 * half; // normalisation for the scale
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - W / 2, dy = y - H / 2, r = Math.hypot(dx, dy) / half;
    const f = 1 / (1 + r * r) - 1;            // k = 1
    const o = (y * W + x) * 4;
    img.data[o] = 128 + 127 * ((dx * f) / maxOff);
    img.data[o + 1] = 128 + 127 * ((dy * f) / maxOff);
    img.data[o + 2] = 0; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}, [W, H]);

export const BarrelWarp: React.FC<{k: number; id?: string; children: React.ReactNode}> = ({k, id = 'barrel', children}) => {
  const map = useBarrelMap();
  const s = k * 2 * 0.5 * Math.hypot(960, 540); // map units -> px at 1920x1080 (maxOff scaled up x4)
  if (k <= 0.001) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={map} x="0" y="0" width="1920" height="1080" preserveAspectRatio="none" result="m" />
          <feDisplacementMap in="SourceGraphic" in2="m" scale={s} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: `url(#${id})`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
// <BarrelWarp k={at(f, {0: .01, 2: .03, 4: .05, 6: .06, 14: .06, 16: .04, 18: .02})}>. Keep the cursor outside the warp.
// Check the result against the window's right edge bows ~14 px at mid-height.
```

### 28. Echo and ghost copies (stamps, ghosting, doubled frames) · `echo-copies`

Family: motion, texture. Starter: `fx/Echoes`. The code adds jump-echo stamps with an age rule and a short ghosting
burst.

**Job.** It shows a path and speed in stop-motion terms (stepped, graphic) and makes a word arrive with force.

**Numbers.** 1-5 copies; opacity by age 1.0 -> 0.20 over 4-5 frames (-0.2 per frame); offsets 6-40 px; no blur on
stamps, a 15 px blur on ghosting.

**Presets.**
- *Jump-echo stamps.* Every position a word leaves stays as a copy that fades about 50 luma per frame: opacity by age
  1.0, 0.81, 0.61, 0.41, 0.20, 0; no blur.
- *Echo behind.* A second copy 30-40 px behind (to the left) at 45 % with an 8 px RGB split; a doubled frame offset
  8 px at 60 % for two frames.
- *Ghosting on a spring.* Frames 1-3 of a fast spring show two copies offset 6 px at 50 % plus a 15 px horizontal blur.
- *Vertical echo.* Rising words doubled by a faint vertical echo.
- *Accumulated copies.* See `motion-blur` (3-4 or 12-16 stacked copies).

**Rich.** A strict age rule, few copies, on stepped motion only.

**Cheap.** Trails behind every move; copies that never fade.

```tsx
import React from 'react';

/** Stamps: positions[k] = where the live word was k frames ago (k = 0 live). Opacity by age, no blur. */
const AGE = [1.0, 0.81, 0.61, 0.41, 0.2];
export const Stamps: React.FC<{positions: [number, number][]; children: React.ReactNode}> = ({positions, children}) => (
  <>
    {positions.slice(0, AGE.length).map(([x, y], k) => (
      <div key={k} style={{position: 'absolute', left: x, top: y, opacity: AGE[k]}}>{children}</div>
    ))}
  </>
);
```

### 29. Chromatic aberration and RGB split · `chromatic-aberration`

Family: lens, distortion. Starter: `fx/Fringe`. The code adds a radial lens split and a lateral split.

**Job.** It says "a real lens, a real screen, a real signal", or marks glass and light as optical.

**Numbers.**
- Lens: 1 / 3 / 7 px (centre / mid-frame / corner), channel scales 1.000 / 1.0015 / 1.003, red outward and blue inward.
- Stylised lateral: 1.5-10 px on figures and type for short windows; 20-30 px for an offline holographic treatment.
- Edge fringes on glass and light: 1-3 px.

**Presets.**
- *Lens layer.* A radial split about 1 px at the centre, 3 px mid-frame, 6-8 px at the corners, visible as cyan / red
  edges on bright contours; fixed to the frame.
- *Figures and crowds.* Red outline +6 px left, cyan -6 px right on a walking figure; 2-10 px on silhouettes, growing
  with figure size; 2-4 px on light lines; 1.5 px on a caption; never on the ground.
- *Holographic treatment* (offline). Red shifted +25 px, blue -25 px, a 15-30 px blur and a five-stop gradient map
  (`#2B2E8C` `#1E7A78` `#E2457E` `#F07A5A` `#E8D8F0`).
- *Light ring fringe.* Two thin cyan / magenta copies of a light ring offset 3 px.
- *Glass edge fringe.* 1 px mint / pink on glass edges; a faint red / blue fringe on a 3D mark's silhouette only.

**Rich.** Radial (growing toward the corners), small (3 px or less over most of the frame), tied to a lens look or to
glass edges.

**Cheap.** A constant lateral RGB split over the whole frame; fringes on body text; glitch fringes without a reason.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/** Radial CA: R and B channel copies scaled about the centre (1.003 / 1.0015 / 1.0), screen-combined over black. */
export const RadialCA: React.FC<{amount?: number; children: React.ReactNode}> = ({amount = 1, children}) => {
  const ch = (m: string, s: number) => (
    <AbsoluteFill style={{transform: `scale(${1 + (s - 1) * amount})`, mixBlendMode: 'screen'}}>
      <AbsoluteFill style={{filter: `url(#ca-${m})`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{background: '#000', isolation: 'isolate'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="ca-r"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
        <filter id="ca-g"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
        <filter id="ca-b"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" /></filter>
      </svg>
      {ch('r', 1.003)}{ch('g', 1.0015)}{ch('b', 1.0)}
    </AbsoluteFill>
  );
};
// Three full copies of the film: expensive. Apply it to a frozen composite or a light scene only; on dark scenes use 'screen' as here,
// on light scenes the same works because the channels sum back to white.
```

### 30. Grain (off by default; sigma 1.2-3 when used) · `grain`

Family: finish. Starter: `fx/Textures` `Grain` (`TEXTURES.grain.sigma` 6: two to five times too strong; set 1.5-2.5 and
leave it off unless the film needs it).

**Job.** Mostly technical: it stops banding on dark ramps and ties CG to photographic plates. On paper or editorial
films it is the material of the paper.

**Numbers.** Sigma 1.2-3 on 0-255 globally (6 only on a single photo shot); opacity 3-6 % in overlay builds; grain size
1-1.5 px; re-seeded every frame or every second frame.

**Presets.**
- *Anti-banding.* Fine luma noise sigma 1.2, static per frame (seeded), on everything; it keeps dark ramps from banding.
- *Editorial.* Monochrome sigma about 2.5 % luma, 1 px, re-seeded every second frame; on paper scenes add a faint fibre
  noise (`feTurbulence` base frequency 0.02 / 0.6, opacity 3 %).
- *Lilac ground.* Sigma about 2.5 levels from a pre-rendered 512 px tile in overlay at 6 %, a new offset every frame.
- *Footage.* Monochrome sigma about 3 in the darks, re-seeded every frame, overlay 0.06: on held frames it is the only
  thing that changes.
- *Light film grain.* Opacity 0.04 with a new seed every frame; a cream paper ground with a 2 % contrast texture.
- *Scoped grain.* Sigma 3, 1.5 px, on one coloured stage only.
- *Local grain.* A photo inset at sigma 6 for its own shot; an anime inset at 6 %.

**Rich.** Invisible at a glance (sigma 1-3), monochrome, seeded per frame, on dark ramps or paper only.

**Cheap.** Visible film-grain overlays; colour noise; grain on a clean digital UI film.

```tsx
import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {gauss, f30} from './fx-shared';

/** Grain: one 512 px Gaussian tile made once; per frame a seeded offset; overlay at `opacity`. Measure: a flat patch's std ≈ target σ. */
export const Grain: React.FC<{opacity?: number; every?: number; tileSigma?: number}> = ({opacity = 0.06, every = 1, tileSigma = 40}) => {
  const {fps} = useVideoConfig();
  const step = Math.floor(f30(useCurrentFrame(), fps) / every);
  const url = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d')!, img = g.createImageData(512, 512);
    for (let i = 0; i < 512 * 512; i++) {
      const v = Math.max(0, Math.min(255, 128 + tileSigma * gauss(`g${i}`)));
      img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = v; img.data[4 * i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }, [tileSigma]);
  const ox = Math.floor(random(`gx${step}`) * 512), oy = Math.floor(random(`gy${step}`) * 512);
  return <AbsoluteFill style={{backgroundImage: `url(${url})`, backgroundPosition: `${ox}px ${oy}px`, mixBlendMode: 'overlay', opacity, pointerEvents: 'none'}} />;
};
// Calibrate: render one frame over #808080 and over #0A0A0A, measure the std of a 200x200 patch; tune opacity to σ 1.5-2.5 there.
```

### 31. Halftone, dither, dot screens and screen grids · `halftone-screens`

Family: texture. Starter: `fx/DotMatrix`, `fx/DitherBands`, `fx/Grids`. The code adds a 1-bit halftone, a difference
dot screen clipped to type, and a frame-fixed screen grid.

**Job.** It turns a photo into print, data or a screen: the picture becomes graphic and brand-coloured, and a screen
grid says "this is a display being filmed".

**Numbers.** Dots 3-10 px on a 6-24 px pitch; screen grids 4-8 px; opacity 0.2-0.35; 1-bit on a brand colour for the
halftone look; fixed to the frame.

**Presets.**
- *1-bit halftone.* A cloud photo rendered as 1-bit dots on a sky accent `#59C9F6`.
- *Ring-dot dither* on a figure's outline for 16 f (strong, then faint), and a two-frame dither flare.
- *Halftone burst.* An accent halftone annulus expands and fades around a click (with the click ring of `element-glow`).
- *Halftone crowd.* Five halftone silhouettes; after a flip their dots turn near-white blue (`#5A9CFF`-`#BFE0FF`).
- *Difference screen.* A dot grid on black; a copy of the grid in `difference` blend clipped to the title's white ink, so
  dark dots show inside the letters.
- *Screen grid.* A 7.75 px repeating grid of 1.5 px lines, `#8A7F96` at 0.22, `multiply`, fixed to the frame.
- *Dot field.* 3 px dots on a 24 px pitch at 0.35.

**Rich.** 1-bit on one brand colour; the grid fixed to the frame; dots tied to a layout pitch.

**Cheap.** A halftone filter over a whole film; moiré from a grid rendered at the wrong scale.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/** Screen grid: frame-fixed, multiply, 7.75 px period, 1.5 px lines. Render at full 1920 width. */
export const ScreenGrid: React.FC<{period?: number; line?: number; colour?: string; opacity?: number}> = ({period = 7.75, line = 1.5, colour = '#8A7F96', opacity = 0.22}) => (
  <AbsoluteFill style={{mixBlendMode: 'multiply', opacity, pointerEvents: 'none',
    backgroundImage: `linear-gradient(to right, ${colour} ${line}px, transparent ${line}px), linear-gradient(to bottom, ${colour} ${line}px, transparent ${line}px)`,
    backgroundSize: `${period}px ${period}px`}} />
);

/** A dot grid copy in difference blend, clipped to the title (put the title text in the mask). */
export const DotScreenInType: React.FC<{text: string; style: React.CSSProperties; pitch?: number}> = ({text, style, pitch = 18}) => (
  <span style={{...style, position: 'absolute', color: 'transparent', mixBlendMode: 'difference',
    backgroundImage: `radial-gradient(circle, #FFFFFF 2px, transparent 2.5px)`, backgroundSize: `${pitch}px ${pitch}px`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>{text}</span>
);
```

### 32. Knockout and type as a window (blend and clip effects) · `knockout-clip`

Family: mask, blend. Starter: `fx/Knockout`, `fx/TypeBehind`, `fx/Cutout`. The code adds a soft moving knockout,
picture-in-text and text behind a subject.

**Job.** It binds type and picture into one object (the word is made of the product's world; the subject stands in front
of the word), which makes the frame feel designed rather than layered.

**Numbers.** Knockouts follow a moving soft shape (a blob's alpha); picture-in-text on 1-3 rows; behind-subject cutouts
with a 2-3 px light outline for the first 2-3 f.

**Presets.**
- *Blob knockout.* A soft blob slides under the text from the right over 13 f; the text is knocked out to white by the
  blob's alpha, with a soft white glow (blur 6 px, 40 %).
- *Difference screen in type.* See `halftone-screens`.
- *Picture in text.* `background-clip: text` with the campaign picture, three rows over 5 f.
- *Text behind the subject.* A cutout of the subject (prepared offline) stands in front of the word, with a 2-3 px light
  outline on its first 2-3 frames.
- *Words behind an object.* Big words pass behind a 3D phone in opposite directions.
- *Tint bands in type.* Gradient bands through text with `background-clip: text`; a designed permanent blur on the right
  40 % of one word.

**Rich.** A clean cutout, a soft moving knockout, the outline only on the first frames.

**Cheap.** Picture-in-text with a busy photo that kills legibility; a hard rectangular knockout.

```tsx
import React from 'react';

/** Knockout: inside the blob, the text turns white (a white copy masked by the blob's alpha), with a soft glow. */
export const BlobKnockout: React.FC<{text: string; style: React.CSSProperties; blobX: number; blobY: number; blobR: number}> = ({text, style, blobX, blobY, blobR}) => {
  const m = `radial-gradient(circle at ${blobX}px ${blobY}px, #000 ${blobR * 0.6}px, transparent ${blobR}px)`;
  return (
    <>
      <span style={{...style, position: 'absolute'}}>{text}</span>
      <span style={{...style, position: 'absolute', color: '#FFFFFF', WebkitMaskImage: m, maskImage: m, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))'}}>{text}</span>
    </>
  );
};
```

### 33. Final soften (a global 0.6 px blur) · `final-soften`

Family: finish. Starter: `render.sh` post pass (an ffmpeg `gblur` after the render, never CSS).

**Job.** It removes the vector-perfect edge so CG UI reads as filmed rather than screenshotted.

**Numbers.** 0.5-0.6 px at 1080p, the whole frame, every frame; never above 0.8 px.

**Rich.** Barely visible: it fixes shimmer on thin lines and hairline aliasing.

**Cheap.** More than about 0.8 px (the film looks out of focus).

```bash
# after the render, before the mux (CPU only):
ffmpeg -y -i picture.mp4 -vf "gblur=sigma=0.6" -c:v libx264 -crf 14 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 picture_soft.mp4
```

### 34. Vignette (only as a lens or a content shape) · `vignette`

Family: finish, lens. Starter: `fx/Lens`, `fx/BlobRing`.

**Job.** A lens vignette belongs to a footage or filmed look; a content vignette (a shape of colour) frames the line of
type.

**Numbers.** Lens: -20 to -35 % at the corners, clear to 55 % of the half-diagonal; tinted with the ground on coloured
stages. In a clean UI film: none, or 2 % at most.

**Presets.**
- *Light lens.* Corners about 22 % darker than the centre on a light ground (centre `#D4D3D8`, corner `#9697A1`).
- *Footage lens.* Radial from the centre, clear to 55 % of the half-diagonal, -35 % at the corners.
- *Tinted stage.* Radial and tinted with the stage (`#4F705E` top-left, `#5E8971` top-right, `#5B856F` bottom), fixed to
  the screen.
- *Paper.* None measurable; a 2 % radial darkening at most.
- *Content vignettes.* A blob ring of colour around the line (see `mesh-gradient`); a faint dark-blue ring around the
  centre during a selection.

**Rich.** Tinted with the ground, clear over the middle 55 %, only in lens-look films.

**Cheap.** A black radial vignette on a clean UI film.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
/** Lens vignette: clear to 55 % of the half-diagonal, −35 % at the corners; tint = a darker ground colour (bake it for dark films). */
export const LensVignette: React.FC<{rgb?: string; strength?: number}> = ({rgb = '0,0,0', strength = 0.35}) => (
  // circle radius 1101 px = the half-diagonal, so 100 % lands exactly on the corners
  <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(circle 1101px at 960px 540px, rgba(${rgb},0) 55%, rgba(${rgb},${strength}) 100%)`}} />
);
```

### 35. Reflections (rare, always physical) · `reflections`

Family: light, material. Starter: `fx/Rim`, `fx/Glint`.

**Job.** It puts an object on a floor (it stands somewhere) and makes glass read as glass. The first reflection to reach for is
a specular highlight on a rim (see `light-sweep`), not a mirror.

**Numbers.** Floor reflections at 0.15-0.3 opacity, fading over 30-40 % of the object's height, blurred 2-4 px; inner
reflection rims 1 px, 40 px inside the edge.

**Presets.**
- *Neon floor.* A glass cube stands on a neon horizon, reflected below it on a near-black floor with a faint reflection
  of the band.
- *Rim highlight.* A glossy black product whose rim highlight is a thin bright arc.
- *Wet ground.* A walking figure reflected on wet sand (photographic).
- *Chart reflection.* A chart faintly reflected on the floor below.

**Rich.** Faint, fading, slightly blurred, only on glossy floors.

**Cheap.** A full-strength mirror copy under every card (the glossy floor of old web pages).

```tsx
import React from 'react';
/** Floor reflection: a mirrored copy under the object, fading over 35 % of its height, blurred 3 px, at 0.22. */
export const FloorReflection: React.FC<{h: number; children: React.ReactNode}> = ({h, children}) => (
  <div style={{position: 'absolute', top: h, left: 0, right: 0, height: h, transform: 'scaleY(-1)', transformOrigin: 'top', opacity: 0.22, filter: 'blur(3px)',
    WebkitMaskImage: 'linear-gradient(to top, #000 0%, transparent 35%)', maskImage: 'linear-gradient(to top, #000 0%, transparent 35%)'}}>{children}</div>
);
```

### 36. Scan-line smear, row smear and displaced edges · `smear-displace`

Family: distortion, texture. Starter: `fx/Slices`, `fx/PenStroke`. The code adds a seeded scan-line smear and a
displaced marker edge.

**Job.** "Signal, transmission, memory": a picture breaks into scan lines at a cut. On strokes, displacement gives a
hand-made edge. Only in a film about signal; otherwise the house no-glitch rule applies.

**Numbers.** 1-2 frame bursts, or 3-14 f; strips 8-40 px; smear runs 40-120 px; displacement scale about 9 px on stroke
edges.

**Presets.**
- *Scan-line smear.* Cut the frame into about 25 horizontal strips of 8-40 px (seeded) and stretch each sideways for 2
  frames, colour-mapped to the palette (`#08304E` at 0, `#3FA0D8` at 0.4, `#7FE6F2` at 0.7, `#E8FBFF` at 1).
- *Row smear* (offline). Horizontal streaks on 10-25 % of the rows (a running maximum over 40-120 px, like a pixel sort)
  on a few cuts.
- *Ragged marker edge.* One edge of a marker stroke displaced: `feTurbulence` base frequency 0.09 / 0.35 (along /
  across), 2 octaves, a seed per stroke, `feDisplacementMap` scale 9 on that edge only.
- *Block break.* A block-glitch transition between two liquid-gradient scenes (8 f).
- *Scanlines.* 4 px lines on a fisheye screen (see `lens-distortion`).

**Rich.** 1-2 frames on a cut, colour-mapped to the palette, seeded; displacement on one edge of a stroke only.

**Cheap.** A looping glitch; RGB noise blocks; glitch as decoration.

```tsx
import React from 'react';
import {AbsoluteFill, random} from 'remotion';

/** Scan-line smear: strips that show one pixel row stretched across, colour-mapped. `src` = a still of the plate. */
export const ScanSmear: React.FC<{src: string; seed?: string}> = ({src, seed = 'smear'}) => {
  const strips: React.ReactNode[] = [];
  let y = 0, i = 0;
  while (y < 830) {
    const h = 8 + Math.floor(32 * random(`${seed}h${i}`));
    const x0 = 400 + Math.floor(1400 * random(`${seed}x${i}`)); // the pixel column that streaks across the strip
    strips.push(
      <div key={i} style={{position: 'absolute', left: 0, top: y, width: 1920, height: h, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: -y, width: 1920, height: 1080, backgroundImage: `url(${src})`, backgroundSize: '1920px 1080px',
          transform: `scaleX(1920)`, transformOrigin: `${x0}px 0`}} />
      </div>,
    );
    y += h; i++;
  }
  return <AbsoluteFill style={{background: '#000', filter: 'url(#cyan-map)'}}>{strips}</AbsoluteFill>;
};
// cyan-map = GradientMapFilter (`develop`) with stops ['#08304E', '#3FA0D8', '#7FE6F2', '#E8FBFF']. One or two frames only, on a cut.
```

---

## Checking a build against these numbers

Measure on rendered frames (CPU tools such as OpenCV and numpy, through the project's heavy-job wrapper).

- **Blur and defocus:** the Laplacian variance (sharpness) of a fixed box per frame; a focus pull reads as a curve such
  as 134, 81, 98, 102, 133, 297 (a snap), an end defocus as 39, 21, 16. Match the curve's shape within +/-20 %.
- **Motion blur:** the streak length along the motion is 0.5 x the per-frame displacement at 180 degrees; measure the run
  of pixels above half the element's contrast along its path.
- **Glows:** the mean B-R (or the hue channel) in a ring 4-20 px outside the ink, per frame.
- **Light sweep:** the area of near-white pixels (min(R, G, B) > 215) on the object per frame; it should rise and fall
  once.
- **Floor glow:** colour samples at fixed points per frame; delta E under 3 against the plan.
- **Iris:** the extent of non-ground pixels per frame against the shares 0.37, 0.65, 0.79, 0.86, 1.
- **Particles:** the count of components per frame (one more every 2 f) and the extent of the field.
- **Grain:** the standard deviation of a flat 200 x 200 patch on a held frame (target 1.2-3).
- **Flashes:** the frame mean luma (a single frame near 237-255, then the next shot).
