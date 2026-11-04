# Backgrounds

The ground and the world behind the content: lit dark stages, daylight fields, living light fields, photographic
plates, world changes, 3D environments, plate grades, defocused plates, value ramps, brand fields, lit lattices, light
architecture, world swaps, windows onto other worlds, context plates, giant type as scenery, hairline grids, paper,
texture, wallpaper worlds, space fields, radial shaping, the white stage and panel grids. Each entry gives the job the
ground does, its numbers, named presets, how type and UI sit on it, what makes it rich or cheap, and Remotion 4 code
(baked gradients, no animated blur on large layers, deterministic).

**Units.** px at 1920 x 1080; colours as hex; dE is CIE76 colour difference; luma on 0-255. Frames at 30 fps unless noted.

---

## House rules for grounds

1. **Grounds are quiet.** Most shots sit on a flat colour (about 57 %), a linear gradient (about 34 %), a radial (about
   4 %) or a full-frame picture (about 5 %). The ground itself almost never changes: under 1 grey level per frame of
   change on ground pixels. Motion comes from the camera and the content, not from a restless background.
2. **One ground family per film.** Hold one ground value for most of the film; where a film has two worlds they share a
   hue (white / blue / black of one blue; navy / lavender of one violet; day / night of one periwinkle).
3. **The ground hue is the brand hue.** A chromatic ground is the accent or a darker or lighter shade of it; even the
   whites lean toward the brand (a blue-white `#FDFDFF`, a warm white `#FDFBFD`).
4. **Gradients are lights, not decorations.** Most are vertical (a floor tint or sky on light grounds, darker at the
   bottom; a floor glow on dark grounds, darker at the top), some diagonal, few horizontal. Light-ground gradients are
   tiny (8-20 dE top to bottom); dark-ground gradients are value ramps inside one hue.
5. **Every dark ground is lit from one place:** a floor glow, a planet horizon, an under-glow, a stage glow on the hero
   (+9 luma), light pools on a dot grid, a void lifting toward the floor. The light has a position, a size and the brand
   colour.
6. **Worlds change at act boundaries, with a motivated move** (a light rise, a value flip on the same layout, an iris, a
   white wash, a push-wipe panel). Within an act the ground holds.
7. **Pictures are worlds only when graded into the film:** one grade for every photo, defocused behind type, moved by a
   camera that means something.
8. **Grounds carry depth cheaply.** Decide per layer whether it belongs to the world (moves and scales with the camera: a
   grid, a floor light) or is fixed to the screen (a sky, a flat field), and say so in the code.
9. **Decoration on a ground is faint and geometric:** lines 12 % lighter than the field, digits +4 to +13 luma over the
   stage, graph-paper lines 1 px `#CDCDCD` on `#F0F0F0`. Nothing competes with type at reading distance.
10. **Type sits on grounds by value, not by effects:** near-black ink on light (`#2C3330`, `#2F3236`, `#0C0E12`),
    near-white on dark (`#FCFDFF`, `#F2F2F4`); glows only on dark worlds and only on the text itself; on photos the type
    is white and unshadowed, and the photo is darkened or blurred instead.

## Accent relations (derive every ground colour from the accent)

| role | recipe |
|---|---|
| day top | accent mixed into white at 1-3 % (97-99 % white) |
| day floor | accent mixed into white at 35-45 % |
| night base | `#010103` - `#090909` |
| night glow | accent mixed into black at 40-65 % |
| brand field | the accent itself |
| rim on glass | accent mixed into white at about 85 % white |
| lines on a field | accent or field mixed toward white about 12 % |

## Layer stack

1. **Ground** (`AbsoluteFill`): flat colour or gradient, fixed to the screen unless the scene says it zooms with the camera.
2. **Ground light and decoration:** floor glow, horizon, stage glow, lines, light-bar curtain, light blobs (normal blend,
   own blur, never over text); digit fields and dot grids belong to the world and move with the camera.
3. **Far world:** plates, grid walls, horizons, planets, architecture, blurred where stated.
4. **World / camera group:** UI, cards, words, hero objects (the camera moves and scales this group only).
5. **Light effects** (additive, never over the near defocused layer or the wordmark).
6. **Near defocused objects** (a foreground cloud, a laptop lid).
7. **Cursor, then transition overlays** (iris, wash, wipes, flashes), then **post** (motion blur; blur pulses on the stage
   group only, never on the ground; grain where the film has it).

## World systems (pick one per film)

| system | entries | fits | a second world |
|---|---|---|---|
| night stage | `dark-lit-stage` + `lit-lattice` or `radial-shape`, glass UI | developer tools, models, "build" stories | a flash frame or a white wash for the end card |
| day and night of one hue | `daylight-field` + `dark-lit-stage` (+ `brand-field`) | SaaS with a strong accent | flips at the problem -> product turn (an iris, a hard cut on a word) |
| light-field journey | `light-field` + `value-ramp` + a floor light; glass reads the field | assistants, health, outbound | every act a new field of the same family; floor lights rise on beats |
| sky world | `daylight-field` sky + `world-plate` clouds + `world-3d` diorama | consumer assistants, "always there" | a crane through the clouds into the diorama |
| editorial paper | `paper-ground` + `hairline-grid` + graded full-bleed pictures + `world-swap` | creative tools, image models, brands | full-bleed picture acts between paper acts |
| gallery white | `white-stage` + rich content (+ one `brand-field` at the drop) | products whose content is colourful | one accent field or none |
| brand-field punctuation | `white-stage` or `paper-ground` + `brand-field` on beats | loud launches | the field is the beat |
| glass-and-light 3D | `world-3d` + `dark-lit-stage` + `light-architecture` | brand films, premium teasers | a white-wash act, a light-up |
| many worlds as the arc | `dark-lit-stage` -> `daylight-field` -> plates -> `paper-ground` | only when the story is a journey | each world is a chapter |
| panel grid | `panel-grid` with a system per pane | showreels, feature loops | none (independent clocks) |

## Shared kit (`bg-shared.tsx`)

Every entry below imports this file: 30-fps frame helpers, colour helpers, frame tables for numbers and colours, the easing
tokens of ground moves, an analytic soft light, seeded grain and a 1-LSB dither, a small canvas for huge soft fields, and
the camera wrapper that moves world layers but never the ground. It works beside `fx-shared.tsx` of `effects.md`.

```tsx
// bg-shared.tsx: Remotion 4, CPU only, deterministic (no Math.random, no Date). Compatible with fx-shared.tsx of effects.md.
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';

export const W = 1920, H = 1080;
/** Current frame in 30-fps frames: every table in this file is in 30-fps frames unless it names its own rate. */
export const useF30 = () => { const f = useCurrentFrame(); const {fps} = useVideoConfig(); return (f * 30) / fps; };
/** A frame at another rate converted to 30-fps frames. */
export const src30 = (frame: number, srcFps: number) => (frame * 30) / srcFps;

export type RGB = [number, number, number];
export const hex = (h: string): RGB => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mixHex = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return toHex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t) as RGB);
};
export const rgba = (h: string, a: number) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

/** Numeric table {frame: value}: piecewise, clamped, optional easing per segment. */
export const at = (f: number, t: Record<number, number>, easing?: (x: number) => number) => {
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (ks.length === 1) return t[ks[0]];
  return interpolate(f, ks, ks.map((k) => t[k]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});
};
/** Colour table {frame: '#hex'}: linear per channel between keys, clamped. */
export const colourAt = (f: number, t: Record<number, string>, easing?: (x: number) => number) => {
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (f <= ks[0]) return t[ks[0]];
  if (f >= ks[ks.length - 1]) return t[ks[ks.length - 1]];
  const i = ks.findIndex((k) => k > f), k0 = ks[i - 1], k1 = ks[i];
  const u = (f - k0) / (k1 - k0);
  return mixHex(t[k0], t[k1], easing ? easing(u) : u);
};

/** Easing tokens of ground moves. */
export const EZ = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),      // a push that lands; a mask opening
  sineInOut: Easing.bezier(0.37, 0, 0.63, 1),   // light-pool anchors drifting between positions
  sCurve: Easing.bezier(0.45, 0, 0.55, 1),      // a gradient inverting
  quartOut: Easing.bezier(0.25, 1, 0.5, 1),     // a world rolling back to level
  cubicIn: Easing.bezier(0.32, 0, 0.67, 0),     // a mask narrowing into the cut
};

/** A soft light as an analytic radial gradient: no CSS filter, no banding risk beyond 8 bit. Gaussian-like 4-stop falloff. */
export const glow = (cx: number, cy: number, rx: number, ry: number, colour: string, a = 1) =>
  `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, ${rgba(colour, a)} 0%, ${rgba(colour, a * 0.62)} 30%, ` +
  `${rgba(colour, a * 0.24)} 60%, ${rgba(colour, a * 0.06)} 82%, ${rgba(colour, 0)} 100%)`;

/** Seeded signed-noise tiles (256 px, made once per seed): white tile = positive half, black tile = negative half.
 *  Overlaid in normal blend they add / subtract ~sigma grey levels: grain that does not shift the mean, on dark AND light grounds. */
const tiles = new Map<string, [string, string]>();
export const noiseTiles = (seed: string, sigma: number, size = 256): [string, string] => {
  const key = `${seed}|${sigma}|${size}`;
  const hit = tiles.get(key); if (hit) return hit;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cp = mk(), cn = mk();
  const ip = cp.getContext('2d')!.createImageData(size, size), inn = cn.getContext('2d')!.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const u = Math.max(1e-6, random(`${seed}a${i}`)), v = random(`${seed}b${i}`);
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma; // Gaussian, sigma in grey levels
    const o = i * 4;
    ip.data[o] = ip.data[o + 1] = ip.data[o + 2] = 255; ip.data[o + 3] = Math.min(255, Math.max(0, g));
    inn.data[o] = inn.data[o + 1] = inn.data[o + 2] = 0; inn.data[o + 3] = Math.min(255, Math.max(0, -g));
  }
  cp.getContext('2d')!.putImageData(ip, 0, 0); cn.getContext('2d')!.putImageData(inn, 0, 0);
  const r: [string, string] = [cp.toDataURL(), cn.toDataURL()]; tiles.set(key, r); return r;
};
/** Grain: sigma in grey levels (1.2-3 when a film uses grain at all; most use none). perFrame = re-seeded every frame. */
export const Grain: React.FC<{sigma: number; perFrame?: boolean; style?: React.CSSProperties}> = ({sigma, perFrame = true, style}) => {
  const f = useCurrentFrame();
  const [pos, neg] = noiseTiles('grain', sigma);
  const ox = perFrame ? Math.floor(random(`gx${f}`) * 256) : 0, oy = perFrame ? Math.floor(random(`gy${f}`) * 256) : 0;
  const layer = (url: string): React.CSSProperties => ({position: 'absolute', inset: 0, backgroundImage: `url(${url})`,
    backgroundPosition: `${ox}px ${oy}px`, imageRendering: 'pixelated', pointerEvents: 'none', ...style});
  return <><div style={layer(pos)} /><div style={layer(neg)} /></>;
};
/** 1-LSB static dither: lay over any low-span gradient so the 8-bit encode does not band (all light fields below). */
export const Dither: React.FC = () => <Grain sigma={0.7} perFrame={false} />;

/** Draw at low resolution, show at 1920x1080 with bilinear smoothing: huge soft fields with no CSS blur (the tiny canvas IS the blur).
 *  96x54 for fields with no detail; 192x108 when blob edges must stay round. */
export const SmallCanvas: React.FC<{w?: number; h?: number; draw: (c: CanvasRenderingContext2D, w: number, h: number) => void;
  deps: React.DependencyList; style?: React.CSSProperties}> = ({w = 96, h = 54, draw, deps, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const c = ref.current!.getContext('2d')!; c.clearRect(0, 0, w, h); draw(c, w, h); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={w} height={h} style={{position: 'absolute', inset: 0, width: W, height: H, ...style}} />;
};

/** Screen-fixed ground vs world-attached layer: wrap world layers in the camera transform, never the ground. */
export const Camera: React.FC<{s?: number; x?: number; y?: number; rot?: number; ox?: number; oy?: number; children: React.ReactNode}> =
  ({s = 1, x = 0, y = 0, rot = 0, ox = 960, oy = 540, children}) => (
    <AbsoluteFill style={{transformOrigin: `${ox}px ${oy}px`, transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${s})`}}>{children}</AbsoluteFill>
  );
```

Cost notes (CPU render, software GL): CSS `linear-gradient` / `radial-gradient` layers are nearly free; a full-frame CSS
`filter: blur()` costs 30-200 ms per frame at large radii, so every soft field below is either an analytic gradient or a
`SmallCanvas`; `backdrop-filter` on a large element is the most expensive thing here (use it only for glass over a plate, at
the plate's element size, and prefer a pre-blurred copy of the plate inside the glass's clip). Photos are decoded once
(`<Img>`), graded once, never re-filtered per frame.

## Index

| # | slug | ground | family |
|---|---|---|---|
| 1 | `dark-lit-stage` | dark stage lit from one place | dark, light |
| 2 | `daylight-field` | white top, brand-tinted floor | light |
| 3 | `light-field` | living light field (mesh, blobs, lobes) | gradient |
| 4 | `world-plate` | photographic world plate under a camera | photo |
| 5 | `ground-flip` | the world changes at the act turn | transition |
| 6 | `world-3d` | 3D environment | 3D |
| 7 | `plate-grade` | one grade for every found picture | colour |
| 8 | `defocus-plate` | defocused plate behind type and glass | photo, depth |
| 9 | `value-ramp` | one hue from dark to light | gradient |
| 10 | `brand-field` | full-bleed brand colour | colour |
| 11 | `lit-lattice` | dot grid or glyph field that catches light | dark, texture |
| 12 | `light-architecture` | light-bar curtain, lines and arcs, beams | light |
| 13 | `world-swap` | the ground cuts, the hero holds | photo, rhythm |
| 14 | `window-onto-world` | iris, stadium, letterbox, pixel windows | mask |
| 15 | `context-plate` | the place the product lives | photo, proof |
| 16 | `type-ground` | giant type as a world layer | type |
| 17 | `hairline-grid` | graph paper, bento lines, construction lines | structure |
| 18 | `paper-ground` | warm paper and editorial grounds | light, material |
| 19 | `ground-texture` | grain, fibre, stripes, halftone | finish |
| 20 | `os-wallpaper` | desktop wallpaper with frosted windows | product world |
| 21 | `space-field` | placed points, star field, bokeh | dark, particles |
| 22 | `radial-shape` | centre lift, dip and vignette | shaping |
| 23 | `white-stage` | pure white stage | light |
| 24 | `panel-grid` | 2 x 2 panes, each with its own ground | layout |

---

## Entries

### 1. Dark stage lit from one place · `dark-lit-stage`

Family: dark world, light. Starter: `fx/Grounds`, `fx/LightField`, `fx/Glow` `FloorGlow`. See also `effects.md`
`floor-glow` and `stage-glow`.

**Job.** "Night, focus, the product is the only lit thing"; the light's position says where to look and gives the UI a
floor. A light that rises is a beat: the world switches on with the product.

**Numbers.**
- Base: true black `#000000`-`#0A080A`, or graphite `#101211`-`#181818`; never above `#1C1A1D`; `#090909` behind glass
  (never pure black while content is visible).
- Light position: below the bottom edge (cy 1150-1820) by default, centred on the hero, at the top, or in the corners.
- Light size: rx 700-2700 px, ry 450-1300 px; the peak colour is the brand hue (a blue `#1B2A9A`-`#3A6BE0`, a violet, a
  deep warm or red); the lift on the ground runs from +9 luma (a stage glow) to near white at the rim (a horizon).
- A stage glow lifts the centre 5-9 dE; a floor light 33-68 dE.
- Motion: held, wandering with the shot, rising with a beat (9 f to luma 71), or sinking with a push.

**Presets.**
- *Graphite stage.* `#090909` everywhere (never below luma 9 except a flash frame); a radial white stage glow centred on the
  hero (700 x 450, +9 luma); the box glow sigma 60 px at 6 %; grain sigma 1.2; bloom above luma 200 (radius 18, 0.35).
- *Warm under-glow.* `#010101` stage; glass discs a hair lighter (`#0A0A0A` -> `#0E0C09`); an under-glow centred
  (960, 1150) with radii 700 x 450, core `#7A2E0A`, rising over 38 f and gone 10 f later.
- *Night floor.* `#010103` in the upper half; a deep blue floor glow (left `#04091F` to right `#101651` at y 780,
  `#0F164D`-`#0F1957` at y 1020) whose upper edge undulates slowly.
- *Planet horizon.* Black above; at the bottom an ellipse centred below the frame whose top rim is a soft white-blue band,
  sinking as the camera pushes.
- *Lifting void.* `#101211` at the top and upper sides, `#141517` at the mid sides, `#282C2F` / `#292C31` in the bottom
  corners: the void lifts toward the floor.
- *Navy field and floor light.* A navy base `#020214` with lobes `#05042D` and holes `#010101`; a floor light (an ellipse
  about 2700 px wide) rises over 9 frames (bottom-row luma 5 -> 71) and keeps rising slowly.

**Type and UI.** Near-white ink (`#F2F2F4`-`#FCFDFF`); glass UI (fill `rgba(255,255,255,0.035)`, backdrop blur 14 px, 1 px
border `rgba(255,255,255,0.10-0.16)`); dark input bars `#111318`; one glowing accent glyph; bloom only above luma 200.

**Rich.** A lifted black; one light with a real shape (a wide ellipse below the frame, an under-glow clipped by the hero);
the light in the brand hue; dither or fine grain on the ramp; the light belonging to the camera.

**Cheap.** Flat `#000000` with white cards; a centred grey spotlight; a glow that pulses idly; banding rings; a glow over
the text.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {EZ, Camera, Dither, Grain, at, glow, useF30} from './bg-shared';

/** Night: #010103 + a deep-blue floor glow whose centre wanders per shot (pass cxPct per shot, e.g. 70 -> 40 over the shot). */
export const NightFloor: React.FC<{cxPct?: number}> = ({cxPct = 70}) => (
  <AbsoluteFill style={{background: `radial-gradient(1500px 520px at ${cxPct}% 112%, #1B2A9A 0%, #12207A 30%, #0A1240 60%, rgba(10,18,64,0) 85%), #010103`}}>
    <Dither />
  </AbsoluteFill>
);

/** Lifted black stage + a +9-luma glow that follows the hero (pass the hero centre per frame) + grain sigma 1.2. */
export const LiftedStage: React.FC<{hx: number; hy: number; strength?: number; children?: React.ReactNode}> = ({hx, hy, strength = 1, children}) => (
  <AbsoluteFill style={{background: '#090909'}}>
    {/* +9 luma at the centre = rgba(255,255,255,0.036) over #090909, ellipse 700 x 450 */}
    <AbsoluteFill style={{background: glow(hx, hy, 350, 225, '#FFFFFF', 0.036 * strength), mixBlendMode: 'screen'}} />
    {children}
    <Grain sigma={1.2} />
  </AbsoluteFill>
);

/** Planet horizon: a bottom-anchored vertical profile
 *  whitest at the bottom corners, inside the camera group (it scales x1.41 expo-out over 33 f and dims as the camera pushes). */
export const PlanetHorizon: React.FC<{start?: number}> = ({start = 218}) => {
  const f = useF30() - start;
  const s = 1 + 0.41 * EZ.expoOut(Math.min(1, Math.max(0, f / 33)));
  const dim = at(f, {0: 1, 4: 0.5, 18: 0.19, 40: 0.08}); // luma at y1020: C4DDF7 -> 4D6FB7 -> 162D60 -> 0A1531
  const profile = 'linear-gradient(to top, #DAEAFA 0px, #DAEAFA 20px, #C4DDF7 60px, #8DB7E7 120px, #5282CA 180px, #2D56A6 240px, ' +
    '#1A3C7F 300px, #112B5D 360px, #0A142D 480px, rgba(10,20,45,0) 560px)';
  const corners = 'radial-gradient(760px 150px at 0px 1080px, rgba(245,250,253,0.75), rgba(245,250,253,0) 100%), ' +
    'radial-gradient(760px 150px at 1920px 1080px, rgba(245,250,253,0.75), rgba(245,250,253,0) 100%)';
  return (
    <AbsoluteFill style={{background: '#000000'}}>
      <Camera s={s}>
        <AbsoluteFill style={{background: `${corners}, ${profile}`, opacity: dim}} />
      </Camera>
      <Dither />
    </AbsoluteFill>
  );
};

/** Floor light: rises from the bottom over 9 frames (bottom-row luma 5 -> 71), then keeps rising slowly. */
export const FloorLight: React.FC<{start?: number}> = ({start = 338}) => {
  const f = useF30() - start;
  const lum = at(f, {'-1': 5, 0: 8, 1: 13, 2: 19, 3: 24, 4: 31, 5: 38, 6: 53, 7: 71, 34: 120}); // keeps rising slowly
  const k = Math.min(1, lum / 120);
  const g = 'radial-gradient(1350px 650px at 960px 1260px, #CFE6FA 0%, #AED2F4 29%, #8DA6DB 55%, #7687C9 71%, #5D65AC 86%, ' +
    '#424582 102%, rgba(66,69,130,0) 125%)';
  return (
    <AbsoluteFill style={{background: '#020214'}}>
      <AbsoluteFill style={{background: g, opacity: k, transform: `translateY(${(1 - k) * 120}px)`}} />
      <Dither />
    </AbsoluteFill>
  );
};

/** Under-glow on #010101, to be clipped by the hero (pass a CSS clip-path or mask of the discs for the "strongest inside" read). */
export const UnderGlow: React.FC<{colour?: string; mask?: string}> = ({colour = '#7A2E0A', mask}) => (
  <AbsoluteFill style={{background: '#010101'}}>
    <AbsoluteFill style={{background: glow(960, 1150, 700, 450, colour, 1), WebkitMaskImage: mask, maskImage: mask}} />
    <AbsoluteFill style={{background: glow(960, 1150, 900, 560, colour, 0.35)}} />
    <Dither />
  </AbsoluteFill>
);
```

### 2. Daylight field with a floor tint · `daylight-field`

Family: light world. Starter: `fx/Grounds`, `fx/Gradients`.

**Job.** Daylight, air, calm competence: the brand colour pooled at the floor gives the UI something to stand on and the
frame a direction (light from above, colour below) without a picture.

**Numbers.**
- Top `#FDFDFF`-`#E5F1F8` (white to the palest tint); floor `#C6DFF9`-`#9FAAFA` (the brand tint at L* 70-90).
- A flat share before the ramp of 0-55 % of the height; the ramp runs to the bottom edge.
- Span top to bottom 8-30 dE.
- Blobs: 1-2 white or tint blobs, 420-900 x 300-380 px, alpha 0.35-0.85, `transparent 70%`; a slow drift or none.

**Presets.**
- *Overcast sky* (24 fps). Stops `#E5F1F8` 0 %, `#ECF5F8` 38 %, `#EEF6F9` 55 %, `#E6F0F7` 78 %, a bottom of `#C6DFF9`
  (opening shots) or `#DCEEFA`; two white blobs (420 x 300 at (412, 560) `rgba(247,250,250,.85)`; 520 x 360 at
  (1250, 330) `rgba(243,249,250,.8)`); corner tints `rgba(208,228,246,.5)` top-left and `rgba(200,224,248,.45)`
  bottom-right. It never moves except with the camera.
- *Lavender day.* Pure white at the top, periwinkle at the bottom, plus one or two very soft blue light blobs that drift.
- *Floor glow under UI.* Flat `#FDFDFF` over the top two thirds; `linear-gradient(to bottom, #FDFDFF 0 55%, #F2F5FE 75%,
  #E4E9FD 88%, #D8DEFC 100%)` under cards.
- *Cool light section.* Top `#EEEFEF` / `#EAECEB` / `#DFE0E3`; mid-right `#C8CBCF`; bottom `#C9CACB`.
- *Flat then tint.* Flat `#F7F5F8` down to y 600, then a vertical gradient to `#C8E0FA` at the bottom edge.
- *Grey ring world.* `#E4E7EC` with soft grey shadows; a centred radial `#FFFEFE` -> `#EAF3FE` (8 dE).

**Type and UI.** Near-black ink (`#2C3330`, `#2F3236`); accent words in the brand blue; white or pale-blue cards with soft
blue-grey shadows; the floor tint visible below the cards so they read as standing on light.

**Rich.** 5-6 stops that are almost the same colour; a floor tint in the brand hue; blobs so faint you feel them; dither;
the field moving only with the camera.

**Cheap.** A two-stop white -> saturated blue diagonal; blobs you can point at; a breathing field; text placed on the tinted
floor band.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Dither, useF30} from './bg-shared';

/** Sky field (exact stops); scale/pan it only when the shot's camera moves. */
export const SkyField: React.FC<{bottom?: string; camScale?: number; panX?: number}> = ({bottom = '#DCEEFA', camScale = 1, panX = 0}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#E5F1F8'}}>
    <AbsoluteFill style={{transform: `translateX(${panX}px) scale(${camScale})`, transformOrigin: '960px 540px', background: [
      'radial-gradient(420px 300px at 412px 560px, rgba(247,250,250,.85), rgba(247,250,250,0) 70%)',
      'radial-gradient(520px 360px at 1250px 330px, rgba(243,249,250,.8), rgba(243,249,250,0) 70%)',
      'radial-gradient(500px 400px at 0px 0px, rgba(208,228,246,.5), rgba(208,228,246,0))',
      'radial-gradient(500px 400px at 1648px 1080px, rgba(200,224,248,.45), rgba(200,224,248,0))',
      `linear-gradient(180deg, #E5F1F8 0%, #ECF5F8 38%, #EEF6F9 55%, #E6F0F7 78%, ${bottom} 100%)`].join(', ')}} />
    <Dither />
  </AbsoluteFill>
);

/** Day: white -> periwinkle floor + one drifting periwinkle blob (drift: 30-fps frames -> % of width). */
export const LavenderDay: React.FC<{blobFromPct?: number; blobToPct?: number; dur?: number}> = ({blobFromPct = 45, blobToPct = 55, dur = 90}) => {
  const f = useF30();
  const x = blobFromPct + (blobToPct - blobFromPct) * Math.min(1, f / dur); // linear drift, no breathing
  return (
    <AbsoluteFill style={{background: [
      `radial-gradient(900px 380px at ${x}% 105%, rgba(120,135,250,.35), rgba(120,135,250,0) 70%)`,
      'linear-gradient(180deg, #FDFDFF 0%, #FCFBFF 28%, #F3F6FE 50%, #D9DEFD 72%, #A8B2FB 95%, #9FAAFA 100%)'].join(', ')}}>
      <Dither />
    </AbsoluteFill>
  );
};

/** Flat top + floor glow; `strong` = the end-card glow with the diagonal upper edge. */
export const FloorTint: React.FC<{strong?: boolean}> = ({strong}) => (
  <AbsoluteFill style={{background: strong
    ? 'radial-gradient(1500px 900px at 900px 1500px, #8A95F5 0%, #BBC2FC 45%, #FDFDFF 75%), #FDFDFF'
    : 'linear-gradient(to bottom, #FDFDFF 0%, #FDFDFF 55%, #F2F5FE 75%, #E4E9FD 88%, #D8DEFC 100%)'}}>
    <Dither />
  </AbsoluteFill>
);
```

### 3. Living light field · `light-field`

Family: light, gradient world. Starter: `fx/Gradients`, `fx/BlobRing`. See also `effects.md` `mesh-gradient`.

**Job.** Atmosphere and life without a picture: the brand colour becomes weather. During holds the field keeps the frame
alive without anything bobbing. The colour drifts; the pixels never crawl.

**Numbers.**
- 2-6 blobs or lobes; blur 90-250 px (or a tiny canvas upscaled); drift 0.3-2 px per frame; colour keys every 9-18 f; a
  hue cycle about 48 f.
- One hue family plus a value range; never more than three hues in one field.
- The area behind the text stays calm (a hole, a dark zone, a lobe behind the line).

**Presets.**
- *Colour-table mesh* (25 fps). A 3 x 3 table keyed every 9 f, blurred about 250 px: first key top-left `#F7ADC3`, top
  `#EBC6F4`, top-right `#CAB1F4`, left `#0D0A1A`, centre `#090813`, right `#CFBAF8`, bottom-left `#F6A7B0`, bottom
  `#F8C0E7`, bottom-right `#DEB8F3`; later keys darken the top-right to `#100D23` then `#010101` while the centre lifts to
  `#4E4A64`, `#5C567A`.
- *Navy and lavender fields.* A navy base with brighter lobes and dark holes; text glow from a blurred copy of the text;
  later a lavender field of the same family.
- *Warm mesh.* The top 40 % light grey `#E7E7E7` with a soft edge; below it four blurred blobs (warm, red, pink, lavender)
  drifting slowly; colour keys every 3 f along a slow path (`#F3C89E` / `#CBADC8` / `#A391F4` -> `#DBB3B4` / `#CBAAC7` /
  `#B9A1DB` ...).
- *Graphite lobes.* Two lobes on `#181818`, blurred 120-160 px, drifting independently with no flicker.
- *Cream to pastel.* Cream `#F9F8F3` turning into blue `#A1BCDE`, light blue `#A7C8F3`, peach and lavender blobs over 12 f.
- *Built photo ground.* On `#EFEFEF`, five blurred colour masses (90 px) plus fine grain, built in code instead of a file.

**Type and UI.** White type on the dark phases, near-black on the light; glass panels show a blurred copy of the field; text
never on a blob's bright core.

**Rich.** Rendered small and upscaled (no banding); colours keyed from a table; a drift slower than the eye tracks; one
family; a calm zone behind the type.

**Cheap.** Three saturated CSS blobs at full opacity; blobs with visible edges; rainbow hues; a field pulsing in scale.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Dither, Grain, SmallCanvas, colourAt, hex, src30, useF30} from './bg-shared';

/** A 3-stop vertical field keyed per frame (25-fps keys converted), the inversion over 20 f on an S-curve. */
const KEYS25: Record<number, [string, string, string]> = {0: ['#F3C89E', '#CBADC8', '#A391F4'], 24: ['#F3C89E', '#CBADC8', '#A391F4'],
  27: ['#EDC5A2', '#CAADC9', '#A893EE'], 30: ['#DBB3B4', '#CBAAC7', '#B9A1DB'], 33: ['#CBA4BF', '#C9A8C7', '#C9AACA'],
  36: ['#BA96CF', '#C9A6C4', '#DAB6B7'], 39: ['#B28ED6', '#CBA3C3', '#E2BCAF'], 42: ['#AE8CDA', '#CAA2C4', '#E5BAA9'],
  45: ['#AC8ADF', '#C9A0C1', '#E7B49F'], 51: ['#A88CE3', '#C89ABD', '#E7AA97'], 57: ['#A68BE8', '#C896BA', '#E79E8B'],
  60: ['#A68BE9', '#C893B8', '#EA9986']};
export const InvertingField: React.FC = () => {
  const f = useF30();
  const t = (i: number) => Object.fromEntries(Object.entries(KEYS25).map(([k, v]) => [src30(+k, 25), v[i]]));
  const [top, mid, bot] = [0, 1, 2].map((i) => colourAt(f, t(i)));
  return <AbsoluteFill style={{background: `linear-gradient(180deg, ${top} 0%, ${mid} 50%, ${bot} 100%)`}}><Dither /></AbsoluteFill>;
};

/** A blob field on a tiny canvas (192 x 108 shown at 1920 x 1080): positions drift linearly (px/f in 1920 space), colours from tables. */
type Blob = {x: number; y: number; rx: number; ry: number; vx: number; vy: number; colour: Record<number, string>; a?: number};
export const BlobField: React.FC<{ground: string; blobs: Blob[]; grain?: number}> = ({ground, blobs, grain}) => {
  const f = useF30();
  return (
    <AbsoluteFill style={{background: ground}}>
      <SmallCanvas w={192} h={108} deps={[f]} draw={(c, w, h) => {
        const k = w / 1920;
        for (const b of blobs) {
          const [r, g, bl] = hex(colourAt(f, b.colour));
          const cx = (b.x + b.vx * f) * k, cy = (b.y + b.vy * f) * k;
          c.save(); c.translate(cx, cy); c.scale(1, b.ry / b.rx);
          const gr = c.createRadialGradient(0, 0, 0, 0, 0, b.rx * k);
          const a = b.a ?? 1;
          [0, 0.3, 0.6, 1].forEach((s, i) => gr.addColorStop(s, `rgba(${r},${g},${bl},${a * [1, 0.62, 0.22, 0][i]})`));
          c.fillStyle = gr; c.beginPath(); c.arc(0, 0, b.rx * k, 0, Math.PI * 2); c.fill(); c.restore();
        }
      }} />
      {grain ? <Grain sigma={grain} /> : <Dither />}
    </AbsoluteFill>
  );
};

/** Preset: five masses (90 px blur equivalent via the tiny canvas), fade by a mean-luma curve. */
export const IizlMasses: React.FC<{start?: number}> = ({start = src30(182, 60)}) => {
  const f = useF30() - start;
  const fade = Math.min(1, Math.max(0, f / src30(22, 60))); // 22 f at 60 fps to the plateau
  return (
    <AbsoluteFill style={{background: '#EFEFEF'}}>
      <AbsoluteFill style={{opacity: fade}}>
        <BlobField ground="transparent" grain={1.5} blobs={[
          {x: 880, y: 700, rx: 330, ry: 250, vx: 0.4, vy: -0.3, colour: {0: '#E8EEF2'}},
          {x: 1120, y: 380, rx: 300, ry: 190, vx: -0.5, vy: 0.2, colour: {0: '#3C6487'}},
          {x: 1350, y: 60, rx: 260, ry: 190, vx: 0.3, vy: 0.4, colour: {0: '#202428'}},
          {x: 400, y: 300, rx: 420, ry: 300, vx: 0.2, vy: 0.3, colour: {0: '#B5D1D8'}, a: 0.9}, // top-left reads #B5D1D8 at the plateau
          {x: 960, y: 1280, rx: 1300, ry: 220, vx: 0, vy: -0.2, colour: {0: '#8A9097'}}]} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
// Use effects.md `mesh-gradient` `MeshField` (the 3 x 3 table every 9 f at 25 fps); silk: `SilkBands`; ring: starter fx/BlobRing.
```

### 4. Photographic world plate under a camera · `world-plate`

Family: photographic world. Starter: `fx/Photo`, `fx/Footage`, `fx/plates.ts`. Plates are found assets (open-licence
photos or clips), never generated.

**Job.** A real place: the product belongs to a world (a sky for an assistant, meadows and windows for "inspiration
everywhere", a forest for calm focus). The camera move through the plate is the transition and the scale cue.

**Numbers.**
- Subjects: sky and clouds first, then landscapes, sea, space. Never an office stock photo as a world.
- Grade: saturation lowered (-20 %), shadows lifted toward the palette (`#A9B4C8`), a cast toward the brand (teal,
  blue-grey, lavender).
- Camera: a crane of 4-16 px per frame accelerating, a slow push of 1.5 % per shot, a pull then push, a per-frame zoom;
  never an idle drift.
- Blur under type: 0 (white words on a calm sky) to about 20 px, up to 90 px for colour masses.

**Presets.**
- *Cloud crane* (24 fps). Three depth layers moving up at different speeds: a far cloud-sea plate, the title, one big
  foreground cloud. A soft mask edge (260 px) climbs y 880 -> 600 -> 430; a pale haze `rgba(238,244,248,a)` fades 0.8 ->
  0.5 -> 0.25 -> 0 over 20 f; the travel accelerates 4, 5, 6, 7, 8, 10, 11, 12, 15, 16 px per frame, then the foreground
  cloud (`#F4F4F6`, blur 6 px) rushes past at 170-189 px per frame for 8 f and the move brakes to 8, 6 px; smear 10 %;
  grade: shadows lifted to `#A9B4C8`, saturation -20 %, blur 1.5 px.
- *Clouds through a scalloped iris.* A dark stage with a cloud plate (its own zoom per frame) masked by a 14-lobe scalloped
  iris with a soft 12 px edge.
- *Window onto a landscape.* A train-window plate (a mountain and lake through the window) scaled about the centre: a pull
  back 1.000 -> 0.888 on a quad-out over 57 f with a 20 px drift left, then still while the type moves; a slight teal
  grade.
- *Worlds as chapters.* A beach (blurred, then sharp, with a cool light sweep), a sky, a forest (normal, then tinted), each
  a chapter of the story.
- *Sunset sky.* A warm sky photo (yellow upper-left to deep red-orange lower-right) with two small lens glints; later a
  black mosaic eats it (see `window-onto-world`).
- *Defocused meadow.* A full-frame, heavily defocused crop of the meadow plate (upper half, 2.0x, about 20 px, lifted to a
  mean of `#4C6672`), perfectly still, resolving into the sharp plate on the next shot.

**Type and UI.** White type on calm areas, no shadow; or type on a heavily blurred crop of the same plate; glass shows a
blurred copy of the plate; small centred headlines on big landscapes.

**Rich.** One plate family per film, graded into the palette; a camera with a start, a travel and a stop hidden by a
foreground element; depth layers (plate, title, foreground).

**Cheap.** A random stock photo per scene, ungraded, cut on and held, unrelated to the line; a slow zoom drift.

```tsx
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {at, src30, useF30} from './bg-shared';

/** Style crane through a graded cloud plate: mask edge rises, haze thins, the plate travels up at the table speeds
 *  a foreground cloud (a second graded cut-out PNG) rushes up and hides the stop. The plate file must be graded once (`plate-grade`). */
export const CloudCrane: React.FC<{plate: string; fgCloud: string; start?: number; children?: React.ReactNode}> = ({plate, fgCloud, start = src30(30, 24), children}) => {
  const f = useF30() - start; const k = 30 / 24; // keys below in 24-fps frames from f30
  const F = (n: number) => (n - 30) * k;
  // cumulative travel from the per-frame speeds (24 fps): integrate once into a table
  const speeds: Record<number, number> = {36: 4, 41: 5, 45: 6, 48: 7, 51: 8, 54: 10, 55: 11, 56: 12, 57: 15, 58: 16};
  let y = 0; const cum: Record<number, number> = {[F(36)]: 0};
  for (let n = 36; n <= 58; n++) { const s = speeds[Object.keys(speeds).map(Number).filter((q) => q <= n).pop()!]; y += s; cum[F(n + 1)] = y; }
  const travel = at(f, cum);
  const edge = at(f, {[F(30)]: 1180, [F(36)]: 880, [F(42)]: 600, [F(48)]: 430, [F(56)]: -300});
  const haze = at(f, {[F(36)]: 0.8, [F(44)]: 0.5, [F(50)]: 0.25, [F(56)]: 0});
  const fgY = at(f, {[F(57)]: 1300, [F(60)]: 700, [F(64)]: -50, [F(68)]: -760}); // 170-189 px/f rush
  const mask = `linear-gradient(to top, #000 0px, #000 ${1080 - edge}px, transparent ${1080 - edge + 260}px)`;
  return (
    <AbsoluteFill>
      {children /* the sky field (`daylight-field`) under it */}
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask, transform: `translateY(${-travel}px)`}}>
        <Img src={staticFile(plate)} style={{width: 1920, height: 1600, objectFit: 'cover'}} />
        <AbsoluteFill style={{background: `rgba(238,244,248,${haze})`}} />
      </AbsoluteFill>
      <Img src={staticFile(fgCloud)} style={{position: 'absolute', left: -200, top: fgY, width: 2300, filter: 'blur(6px)'}} />
    </AbsoluteFill>
  );
};
// Asset rule: one plate family per film (search "aerial sea of clouds dawn", CC0/Unsplash licence), graded with the `plate-grade` map, never
// swapped for an unrelated stock picture per scene. Code fallback for a sky: the `daylight-field` SkyField + two white blobs; for beach the
// CSS bands (sky #8C98A8 y 0-125, sea, sand).
```

### 5. The world changes at the act turn · `ground-flip`

Family: world change, transition. Starter: `fx/Grounds`, `fx/Seam`. See also `transitions.md` `ground-flip-dip`.

**Job.** The ground change is the turn of the argument: dark -> light (problem -> product), light -> dark, night -> day. It
tells a viewer with the sound off that the chapter changed.

**Numbers.**
- Worlds per film: 1, 2 (the default: light and dark of one hue), up to 7 when the arc is the story.
- Devices: a light rise of 18-26 f; a value flip by hard cut in the middle of a motion; an iris of 4-5 f; a wash; a
  push-wipe panel in 2 stages over 48 f; a flash frame and a cut.
- What carries across: the layout, the word, the element, the camera speed.

**Presets.**
- *Light rise* (24 fps). A top-centre patch ramps `#31383F`, `#595C61`, `#818489`, `#A8ABB0`, `#CDCED2`, `#E2E4E4`,
  `#ECEEED`, `#EEEFEE` (one key every 4 f): the world switches on with the title.
- *Value flip.* A light grid (`#F3F1F4`, 1 px lines `#C9C7CC`) collapses and the film cuts to the same layout in dark mode:
  black ground, lines `#4A4A4A`, card fill `#0A080C`, white brackets; the layout settles over 16 f and holds.
- *One hue, three values.* A white title stage, a blue field `#2C68ED` for the working act, black stages for the
  results, a blue light-bar curtain for the launch.
- *Iris into the next world.* A circle with a 6 px soft edge: 808, 1424, 1730, 1898 px, full on the fifth frame.
- *Journey.* Black -> clouds (an iris) -> navy (a hard cut on a word) -> a rising floor light -> a flash -> a lavender
  field.
- *Steps darker.* An act on `#F1F1F1`, the next one step darker `#E9E9E9`, then black lifted by a soft colour haze.

**Type and UI.** Re-ink on the flip (black text -> white, the card fill to near-black, brackets white); the same type sizes
and positions, so the layout reads as the same, inverted.

**Rich.** One change per act, on a story beat, with something carried across; the new world the same hue at another value.

**Cheap.** Every shot on a new random colour; cross-fades between flat colours; a light / dark flip with nothing carried.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colourAt, src30, useF30} from './bg-shared';

/** Light-up: the ground follows the ramp (24-fps keys) while the world group keeps its camera move. */
const RAMP24: Record<number, string> = {36: '#31383F', 40: '#595C61', 44: '#818489', 48: '#A8ABB0', 52: '#CDCED2', 56: '#E2E4E4', 60: '#ECEEED', 64: '#EEEFEE'};
export const LightRise: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const f = useF30();
  const top = colourAt(f, Object.fromEntries(Object.entries(RAMP24).map(([k, v]) => [src30(+k, 24), v])));
  // the lower ground lags darker (vignette + tray shadow of the light section: bottom-left ends at #9A9299)
  const low = colourAt(f, {[src30(36, 24)]: '#141517', [src30(64, 24)]: '#C9CACB'});
  return <AbsoluteFill style={{background: `linear-gradient(180deg, ${top} 0%, ${low} 100%)`}}>{children}</AbsoluteFill>;
};

/** Value flip: one layout, two inks; `dark` switches on the cut frame. Use with the same grid component on both sides. */
export const ValueFlip: React.FC<{cut: number; render: (ink: {ground: string; line: string; card: string; text: string}) => React.ReactNode}> = ({cut, render}) => {
  const dark = useF30() >= cut;
  const ink = dark ? {ground: '#000000', line: '#4A4A4A', card: '#0A080C', text: '#FFFFFF'} : {ground: '#F3F1F4', line: '#C9C7CC', card: '#FFFFFF', text: '#111111'};
  return <AbsoluteFill style={{background: ink.ground}}>{render(ink)}</AbsoluteFill>;
};

/** Iris onto the next world: a circle mask whose diameter follows the diameter table (30 fps), 6 px soft edge. */
export const IrisTo: React.FC<{start: number; next: React.ReactNode; prev: React.ReactNode}> = ({start, next, prev}) => {
  const f = useF30() - start;
  const d = f < 0 ? 0 : f >= 4 ? 2400 : [808, 1424, 1730, 1898][Math.floor(f)];
  const r = d / 2;
  const mask = `radial-gradient(circle at 958px 538px, #000 ${Math.max(0, r - 3)}px, transparent ${r + 3}px)`;
  return (
    <AbsoluteFill>
      {prev}
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask}}>{next}</AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 6. 3D environment · `world-3d`

Family: 3D world. Starter: `fx/three/*`, `fx/world/*` (see `three.md`). See also `effects.md` `light-rig-3d`.

**Job.** A place built for the product: the brand as architecture, the product's UI as an object in space, a miniature world
where the assistant lives. It gives the camera something to travel through.

**Numbers.**
- Types: a void with an invisible floor, a neon grid hall or horizon, a sky diorama, a floor lattice, a coloured stage.
- Camera: a roll of 50 degrees in 18 f, a rise and roll to top-down over 34 f, an orbit and fly-in, a tilt so the horizon
  exits.
- Light: emissive geometry (2 px neon lines, emissive boxes), a floor light, a top light; glass at alpha 0.35-0.75 with
  opaque rims.

**Presets.**
- *Layer model.* Ground < far world (grid walls, horizon, planets, architecture; blurred where stated) < hero objects <
  additive light < near defocused objects < wordmark.
- *Neon grid hall* (24 fps). Walls and floor of thin blue and violet neon lines on black (`#4A50E8`, `#7A40E0`, 2 px,
  glowing), a few emissive boxes; a roll -50 -> 0 degrees over 18 f on `cubic-bezier(0.25, 1, 0.5, 1)` (peak 9 degrees
  per frame); the corridor's back wall `#6F7AE9`, the left wall `#10094D`.
- *Neon horizon.* A black sky (`#090E22`) above a straight cyan neon line (`#59BDD0`) with a 30 px glow band above it; the
  camera tilts and the horizon leaves through the top in about 34 f; glass cubes (110-150 px) stand on it.
- *Dock in a void.* One long slab on an invisible floor in a black void, its long axis away from the camera; icons slide
  along it; the camera rises and rolls to top-down.
- *Diorama.* Sky and clouds plate | tiles behind the dome | the dome's back half | disc, desk, figure, laptop | the dome's
  front half (glass) | tiles in front | a foreground cloud.
- *Point to pyramid.* A dot becomes a frosted glass pyramid with spectral edges; the camera orbits and flies into it,
  landing in a composer on a soft defocused ground.

**Type and UI.** Little type inside the 3D world (often none until the wordmark); UI enters as an object; the wordmark is
drawn above the light layers, never lit by them.

**Rich.** True perspective with a camera move that lands; emissive light that defines the space; depth of field on near and
far layers; a world that continues across shots.

**Cheap.** A tilted 2D card on a gradient called 3D; a default grey floor with a hard shadow; a camera orbiting aimlessly.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {EZ, at, src30, useF30} from './bg-shared';

/** Neon grid hall in CSS 3D (CPU-cheap, no WebGL): floor + two walls as planes with repeating 2 px neon lines and a glow copy.
 *  The camera roll (-50 -> 0 deg over 18 f at 24 fps, quartOut) rotates the whole hall about the frame centre. */
const neon = (c1: string, c2: string, pitch: number) =>
  `repeating-linear-gradient(90deg, ${c1} 0 2px, transparent 2px ${pitch}px), repeating-linear-gradient(0deg, ${c2} 0 2px, transparent 2px ${pitch}px)`;
const Plane: React.FC<{t: string; c1: string; c2: string; pitch?: number}> = ({t, c1, c2, pitch = 120}) => (
  <div style={{position: 'absolute', left: -1040, top: -1040, width: 4000, height: 2600, transform: t, transformOrigin: '50% 50%'}}>
    <div style={{position: 'absolute', inset: 0, background: neon(c1, c2, pitch), filter: 'blur(4px)', opacity: 0.8}} />
    <div style={{position: 'absolute', inset: 0, background: neon(c1, c2, pitch)}} />
  </div>
);
export const NeonHall: React.FC<{start?: number}> = ({start = src30(500, 24)}) => {
  const f = useF30() - start;
  const roll = at(f, {0: -50, [src30(18, 24)]: 0}, EZ.quartOut);
  return (
    <AbsoluteFill style={{background: '#000000', overflow: 'hidden', perspective: 900, perspectiveOrigin: '960px 540px'}}>
      <AbsoluteFill style={{transform: `rotate(${roll}deg)`, transformStyle: 'preserve-3d'}}>
        <Plane t="translateY(700px) rotateX(90deg)" c1="#4A50E8" c2="#7A40E0" />
        <Plane t="translateX(-1500px) rotateY(90deg)" c1="#4A50E8" c2="#10094D" />
        <Plane t="translateX(1500px) rotateY(-90deg)" c1="#7A40E0" c2="#4A50E8" />
        <div style={{position: 'absolute', left: 1490, top: 560, width: 210, height: 140, background: '#F7E0D6', boxShadow: '0 0 60px 10px rgba(247,166,207,.6)'}} />
      </AbsoluteFill>
      {/* the far end fades to black: a radial dark core where the corridor converges */}
      <AbsoluteFill style={{background: 'radial-gradient(520px 340px at 960px 520px, #000 0%, rgba(0,0,0,.85) 40%, rgba(0,0,0,0) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Neon horizon: black sky, a 30 px cyan band with a glow above it; `rise` = the tilt moving the horizon up and out over about 34 f. */
export const NeonHorizon: React.FC<{start?: number}> = ({start = src30(536, 24)}) => {
  const f = useF30() - start;
  const y = at(f, {0: 640, [src30(34, 24)]: -60}, EZ.cubicIn); // tilt: horizon leaves the top after 34 f (24 fps)
  return (
    <AbsoluteFill style={{background: '#090E22', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -100, width: 2120, top: y - 220, height: 220, transform: 'rotate(0.25deg)',
        background: 'linear-gradient(to top, rgba(89,189,208,.55), rgba(20,40,90,.25) 50%, rgba(9,14,34,0))'}} />
      <div style={{position: 'absolute', left: -100, width: 2120, top: y, height: 30, background: '#59BDD0', transform: 'rotate(0.25deg)',
        boxShadow: '0 0 40px 8px rgba(89,189,208,.6)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: y + 30, bottom: 0, background: '#03050D'}} />
    </AbsoluteFill>
  );
};
// True 3D: @remotion/three <ThreeCanvas> with MeshPhysicalMaterial only where glass is the
// point; render with --gl=swangle on the CPU slot, at most ~20k triangles, no realtime shadows (bake a soft contact shadow as a
// radial-gradient plane), and keep every non-hero layer (ground, glow, type) in DOM above/below the canvas.
```

### 7. One grade for every found picture · `plate-grade`

Family: photographic world, colour. Starter: `fx/GradientMap`, `fx/Grades`, `fx/Develop`. See also `effects.md` `develop`.

**Job.** It turns found pictures into the film's world and its argument: monochrome = raw, not yet yours; colour =
generated, yours, live. It is what makes a stock photo stop looking like stock.

**Numbers.**
- Map stops 3-6; mix 80 / 20 map / original; a haze of 18 % in screen; contrast -10 %; saturation -20 %; blur 1.5 px.
- Develop: a duotone hold of 9-10 f, a colour fill of 11 f, staggered per thumbnail.
- The map's dark end is the film's dark colour; its light end the paper or white.

**Presets.**
- *Gradient map for every photo.* Luminance -> L 0.00 `#2A1B5C`, 0.25 `#5A5FC8`, 0.45 `#B06CC8`, 0.60 `#E8749E`, 0.78
  `#F49A7E`, 1.00 `#FFF1EC`; mixed 80 % with the original; a haze `#E8E0F4` at 18 % in screen; contrast -10 %. Optional
  ring-dot dither in the shadows (rings 7-9 px, 1.5 px stroke, dots 2-3 px, pitch 10-12 px, opacity 0.55-0.9).
- *Lifted plate.* Shadows lifted to `#A9B4C8`, saturation -20 %, blur 1.5 px.
- *Light cast.* A slight teal grade on a cool plate; a warm plate kept warm when the line is about places.
- *Hue-cycling backdrop.* A blurred photo backdrop cycles `#EFADA8` -> `#E28AD1` -> `#D479F9` -> `#C0CDF6`, a key every
  4 f, while it fades.
- *Duotone develop.* A generated page arrives as a blue duotone for 9 f and its colour fills in over 11 f; thumbnails
  arrive blue-tinted and develop one by one.

**Type and UI.** The palette is shared, so the film's ink and accent read on the pictures without shadows.

**Rich.** One map for the whole film, built once per image, its ends tied to the palette; a develop on a story beat.

**Cheap.** Per-photo filters (sepia here, saturation there); a CSS `hue-rotate()`; a raw stock photo.

```tsx
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {hex} from './bg-shared';

/** A gradient map as an SVG filter: feColorMatrix to luminance, feComponentTransfer tables per channel, mixed with the original.
 *  Defined once; every <Img> of the film uses filter:url(#grade). The browser caches the filtered raster of a static image layer. */
const table = (stops: [number, string][], ch: 0 | 1 | 2, n = 16) =>
  Array.from({length: n + 1}, (_, i) => {
    const t = i / n; let j = stops.findIndex(([p]) => p >= t); if (j <= 0) j = 1;
    const [p0, c0] = stops[j - 1], [p1, c1] = stops[j]; const u = (t - p0) / Math.max(1e-6, p1 - p0);
    return ((hex(c0)[ch] + (hex(c1)[ch] - hex(c0)[ch]) * Math.min(1, Math.max(0, u))) / 255).toFixed(4);
  }).join(' ');
export const GradeDefs: React.FC<{id?: string; stops?: [number, string][]; mix?: number}> = ({id = 'grade', mix = 0.8,
  stops = [[0, '#2A1B5C'], [0.25, '#5A5FC8'], [0.45, '#B06CC8'], [0.6, '#E8749E'], [0.78, '#F49A7E'], [1, '#FFF1EC']]}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="lum" />
      <feComponentTransfer in="lum" result="map">
        <feFuncR type="table" tableValues={table(stops, 0)} />
        <feFuncG type="table" tableValues={table(stops, 1)} />
        <feFuncB type="table" tableValues={table(stops, 2)} />
      </feComponentTransfer>
      <feComposite in="map" in2="SourceGraphic" operator="arithmetic" k1={0} k2={mix} k3={1 - mix} k4={0} result="mixed" />
      {/* contrast -10 %: slope 0.9 about mid grey */}
      <feComponentTransfer in="mixed">
        <feFuncR type="linear" slope={0.9} intercept={0.05} /><feFuncG type="linear" slope={0.9} intercept={0.05} />
        <feFuncB type="linear" slope={0.9} intercept={0.05} />
      </feComponentTransfer>
    </filter>
  </svg>
);
/** A graded plate: the map + the 18 % screen haze. Put <GradeDefs/> once at the root of the composition. */
export const GradedPlate: React.FC<{src: string; style?: React.CSSProperties}> = ({src, style}) => (
  <AbsoluteFill style={style}>
    <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'url(#grade)'}} />
    <AbsoluteFill style={{background: '#E8E0F4', opacity: 0.18, mixBlendMode: 'screen'}} />
  </AbsoluteFill>
);
// Cheaper still for a render farm without GPU: pre-grade every plate once with a node script (sharp or canvas) into
// public/graded/*.jpg and use plain <Img>; the result is identical and costs nothing per frame. grade = a 2-stop map
// [[0,'#A9B4C8'],[1,'#FFFFFF']] mixed at ~0.35 + saturate(0.8) + blur(1.5px), baked the same way.
```

### 8. Defocused plate behind type and glass · `defocus-plate`

Family: photographic world, depth. Starter: `fx/Defocus`, `lib/defocus.ts`. See also `effects.md` `dof-ladder`.

**Job.** A world as mood (warmth, place, time of day) without competing detail; and a focus device: the plate resolving into
the sharp scene is the reveal.

**Numbers.**
- Blur 1-6 px (a rack focus), about 20 px, 24 px (behind glass), over 60 px, 90 px (colour masses).
- The plate is lifted when it carries dark type, darkened for white type.
- It resolves into the sharp scene, or stays as colour.

**Presets.**
- *Defocused crop.* A full-frame crop of the plate's upper half at 2.0x, blurred about 20 px and lifted to a mean of
  `#4C6672`, perfectly still for 36 f, then the sharp plate.
- *Photo fades in behind.* A heavily blurred photo fades in as the ground while a glass band's blue fill fades away (1.0,
  0.6, 0.25, 0 over 10 f at 60 fps); colour masses blurred 90 px.
- *Blush field.* A pearly face light becomes a softer and softer blurred blush field (over 60 px), and a composer lands on it.
- *Layered sky.* A blurred sky plate | blurred tiles | a sharp-ish head | a blurred foreground laptop lid | a white wash.
- *Rack into focus.* A wallpaper racks into focus: blur 6, 4, 1, 0 px over 4 f while it scales slightly.
- *Glass over plate.* Every glass element shows a blurred copy of the plate; teal glass panels 75-90 % opaque over a 24 px
  blur.

**Type and UI.** Big type is fine; glass is natural here (it has something to blur); composers and pills in white or dark
frosted.

**Rich.** Blur with a real lens feel (large, smooth, highlights kept); the plate brightened or darkened for the type; a
resolve on a beat; glass reading a blurred copy of what is behind it.

**Cheap.** A sharp busy photo behind small type; a 4 px CSS blur that looks like a mistake; `backdrop-filter` everywhere.

```tsx
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Soft} from './fx-shared'; // two fixed-level blur copies (effects.md shared code)
import {at, useF30} from './bg-shared';

/** A 2x crop of the next shot's plate, ~20 px defocus, lifted, perfectly still; resolves (sigma 20 -> 0) into the sharp
 *  plate on the cut. Blur uses fixed levels (no animated radius), so the cost is two cached copies. */
export const DefocusPlate: React.FC<{src: string; sigma: number; lift?: number; crop?: {x: number; y: number; s: number}}> = ({src, sigma, lift = 1.18, crop = {x: 217, y: 0, s: 2}}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
    <Soft sigma={sigma}>
      <Img src={staticFile(src)} style={{position: 'absolute', width: 1920 * crop.s, height: 1080 * crop.s, left: -crop.x * crop.s, top: -crop.y * crop.s,
        filter: `brightness(${lift})`}} />
    </Soft>
  </AbsoluteFill>
);

/** Rack focus: 6 -> 4 -> 1 -> 0 px over three frames (30 fps), the wallpaper stays while the window pushes in. */
export const RackIn: React.FC<{src: string; start?: number}> = ({src, start = 279}) => {
  const f = useF30() - start;
  const s = at(f, {0: 6, 1: 4, 2: 1, 3: 0});
  return <DefocusPlate src={src} sigma={s} lift={1} crop={{x: 0, y: 0, s: 1}} />;
};

/** Glass that reads a blurred copy (cheaper than backdrop-filter): clip a pre-blurred copy of the same plate to the glass shape. */
export const GlassOverPlate: React.FC<{src: string; box: {x: number; y: number; w: number; h: number; r: number}; tint: string; sigma?: number}> = ({src, box, tint, sigma = 24}) => (
  <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: box.r, overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 0 0 1px rgba(255,255,255,.14)'}}>
    <div style={{position: 'absolute', left: -box.x, top: -box.y, width: 1920, height: 1080}}>
      <Soft sigma={sigma}><Img src={staticFile(src)} style={{width: 1920, height: 1080, objectFit: 'cover'}} /></Soft>
    </div>
    <div style={{position: 'absolute', inset: 0, background: tint}} />
  </div>
);
// Teal panel: tint = 'linear-gradient(160deg, rgba(0,150,140,.9), rgba(0,120,120,.75))' (75-90 % opaque); dark pill: 'rgba(70,70,70,.55)', sigma 20.
```

### 9. Value ramp: one hue from dark to light · `value-ramp`

Family: gradient world. Starter: `fx/Gradients`, `fx/Grounds`; bake with `scripts/dither-gradient.py`.

**Job.** Colour as a chapter mark and as light: each act gets its own ramp of the brand hue, the darker end anchoring the
frame edge, the bright end lifting the UI.

**Numbers.**
- 2-3 vertical stops, or 4-6 corner or edge samples; the middle stop is the hue at full chroma.
- Value span: dark to mid (black -> `#272972`, 60 dE) or full (black -> `#A79AE0`, 95 dE); light-only fields stay under
  45 dE.
- Angle: vertical (light from below or above) or a diagonal of about 300 degrees (light from the bottom right).
- One hue family per film.

**Presets.**
- *Violet anatomy field.* Top / middle / bottom `#090614` -> `#5A50C0` -> `#A296DF`; a status field from the top right
  `#B8ACF8` -> `#5A4FC0` -> `#050311`.
- *Magenta family.* Every scene a two-colour ground: crimson `#AA083A` / `#E8116E`; sunrise `#F0436C` / white; bubble
  `#5B3AE3` / `#F8BBE7`; message `#FBF1F9` / `#F5DAE9`; laptop `#F474E2` / `#D9BEF1`.
- *Lime and sky.* A lime ground `#D9E307` shading to `#AAAF04` and black toward the top left; a sky `#C8EAFD` -> `#61A0DA`.
- *Night blue.* Black -> `#002461` at about 97 degrees.
- *Four corners.* Top centre mint `#C8EBE7`, top left teal `#B3DEE5`, bottom right saturated blue `#5BAAF6`, bottom left pale
  blue `#ACD6EE`.
- *Banner ground.* Top left / centre / right `#6B69F8` / `#A365D2` / `#EA62A5`; bottom left / centre `#F36499` /
  `#F37161` (one warm-to-violet family as a deliberate banner).

**Type and UI.** Type on the calm (dark or light) end; glass panels over the middle stop; a shimmer clipped to status text on
the light end.

**Rich.** The hue at full chroma only in the middle stop; ends near black or near white; dither; one family.

**Cheap.** Two unrelated saturated hues at 45 degrees; a gradient that animates its angle; banding.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Dither, SmallCanvas, hex} from './bg-shared';

/** A 3-stop ramp; `deg` in CSS degrees (180 = top -> bottom). status: deg 200 (top-right -> bottom), stops as given. */
export const Ramp: React.FC<{stops: string[]; deg?: number; at?: number[]}> = ({stops, deg = 180, at}) => (
  <AbsoluteFill style={{background: `linear-gradient(${deg}deg, ${stops.map((c, i) => `${c} ${at ? at[i] : (100 * i) / (stops.length - 1)}%`).join(', ')})`}}>
    <Dither />
  </AbsoluteFill>
);

/** Corner / edge samples: bilinear-interpolated on a tiny canvas (smooth, no CSS blur). */
export const CornerField: React.FC<{pts: {x: number; y: number; c: string}[]}> = ({pts}) => (
  <AbsoluteFill>
    <SmallCanvas w={64} h={36} deps={[JSON.stringify(pts)]} draw={(c, w, h) => {
      const img = c.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const X = (x / (w - 1)) * 1920, Y = (y / (h - 1)) * 1080;
        let sw = 0; const acc = [0, 0, 0];
        for (const p of pts) { const d2 = (p.x - X) ** 2 + (p.y - Y) ** 2 + 1; const wgt = 1 / (d2 * d2); sw += wgt; const rgb = hex(p.c); acc[0] += rgb[0] * wgt; acc[1] += rgb[1] * wgt; acc[2] += rgb[2] * wgt; }
        const o = (y * w + x) * 4; img.data[o] = acc[0] / sw; img.data[o + 1] = acc[1] / sw; img.data[o + 2] = acc[2] / sw; img.data[o + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }} />
    <Dither />
  </AbsoluteFill>
);
// <CornerField pts={[{x:960,y:0,c:'#C8EBE7'},{x:0,y:0,c:'#B3DEE5'},{x:1920,y:1080,c:'#5BAAF6'},{x:0,y:1080,c:'#ACD6EE'},{x:1920,y:0,c:'#C0E6E9'}]}/>
// (the fifth point, top-right, sits between the mint and teal pair).
```

### 10. Brand-colour field · `brand-field`

Family: colour world. Starter: `fx/Grounds`.

**Job.** The brand as a place: a full-bleed accent says "this is us" louder than a logo, and it sets an act apart.

**Numbers.**
- Duration: a beat (micro-scenes of about 0.5 s), an act (about 3 s), a closing field (about 3 s).
- Value: L* 45-75, mid-saturated (a blue `#2C68ED`, a green `#79CD05`, an orange-red `#EE4204`), or deep (`#153F35`,
  `#4F705E`-`#5E8971`).
- Variation inside the field: 0 (flat) to 6-10 dE (an edge lift, vignette corners).
- Decoration: none, lines 12 % lighter, stripes about 20 % lighter, or grain sigma 3.

**Presets.**
- *Blue working act.* `#2C68ED` (corners `#2D69ED`-`#306AEF`), the centre slightly darker (`#2862E5` -> `#336FFB`, 6.7 dE);
  2 px lines 12 % lighter (`light-architecture`); glass cards
  `linear-gradient(225deg, #2250B0 0%, #3965C4 30%, #5480DF 55%, #3360BD 80%, #204CA4 100%)` with a 1 px rim
  `rgba(255,255,255,0.16)`; secondary text `#A9BCEB`.
- *Flat accent.* An accent field with flat fills, crisp vector edges, no grain, no vignette, no glow.
- *Closing field.* A full-screen accent field with one pixel letter as the close.
- *Spring green.* A vivid green ground for one card, white for the next with green doodles.
- *Beat micro-scenes.* Lime, orange, black, a terminal near-black: one field per beat.
- *Field around a square.* A brand-blue field (`#2336C0` / `#2031B3` left / right) around a black square.

**Type and UI.** White type; secondary text white at 55 %; glass cards in the field's hue with a 1 px white rim at 16 %; a
soft shadow (6, 10) / 18 px on light cards.

**Rich.** Exactly the brand's accent, held for an act; a 6-10 dE lift toward the edges or corners; faint geometric
decoration; glass UI tinted in the same hue.

**Cheap.** A saturated field that is not the brand colour; white cards with grey shadows dropped on it; a field flickering
between colours without a beat.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Grain} from './bg-shared';

/** Blue field: centre slightly darker than the edges (6.7 dE), static; lines from `light-architecture` go on top. */
export const BlueField: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(1400px 900px at 960px 540px, #2862E5 0%, #2C68ED 55%, #336FFB 100%)'}} />
);

/** Green stage: screen-fixed corner vignette (5 corner and edge samples) + grain sigma 3, re-seeded per frame. */
export const GreenStage: React.FC = () => (
  <AbsoluteFill style={{background: [
    'radial-gradient(1100px 800px at 0px 0px, rgba(79,112,94,1) 0%, rgba(79,112,94,0) 100%)',      // #4F705E darkest TL
    'radial-gradient(1000px 760px at 1920px 1080px, rgba(84,119,100,.9) 0%, rgba(84,119,100,0) 100%)', // #547764 BR
    'linear-gradient(180deg, #5E8971 0%, #5B856F 100%)'].join(', ')}}>
    <Grain sigma={3} />
  </AbsoluteFill>
);

/** Orange striped field: vertical stripes ~20 % lighter, corners lighter (stripe pitch about 64 px). */
export const StripedField: React.FC<{pitch?: number}> = ({pitch = 64}) => (
  <AbsoluteFill style={{background: [
    `repeating-linear-gradient(90deg, rgba(249,173,123,.35) 0 ${pitch / 2}px, rgba(249,173,123,0) ${pitch / 2}px ${pitch}px)`,
    'radial-gradient(900px 600px at 0px 0px, rgba(245,161,101,.7), rgba(245,161,101,0))',
    'radial-gradient(900px 600px at 1920px 1080px, rgba(249,173,123,.7), rgba(249,173,123,0))', '#F67E2F'].join(', ')}} />
);
```

### 11. Lit lattice: a dot grid or glyph field that catches light · `lit-lattice`

Family: dark world, texture, light. Starter: `fx/DotMatrix`, `fx/GlyphField`.

**Job.** Data and code as a texture rather than a picture; light pools make a black stage a space with depth and direction;
the lattice's pitch change reads as a camera move.

**Numbers.**
- Pitch 12-48 px (dots), 17 x 19 px (glyphs); a ring dot 0.13-0.40 of the pitch, a solid dot 26 px, glyph cap 11 px.
- Dark lattices sit 4-13 luma above the stage and reach p99 46-67 only inside a light pool; light lattices use 3-4 brand
  tint tiers.
- Light pools: 2 at a time, r 360-620 px, intensity 0.25-1.0, moving between anchors on a sine in-out.

**Presets.**
- *Pulled-back ring grid.* A square lattice of ring dots (`#3A3A3A`, outer 0.4 x pitch, ring width 0.13) whose pitch
  shrinks with a camera pull-back: 26.83, 26.62, 25.85, 24.84, 23.71, 22.51, 21.30, 20.14, 19.15, 18.22, 17.36, 16.64,
  15.98, 15.40, 14.90, 14.47, 14.07, 13.71, 13.41, 13.15, 12.94, 12.75, 12.56, 12.43, 12.31, 12.22, 12.12, 12.07, 12.04,
  12.02 px; two light pools move between anchors (for example (330, 260) r 620 at full and (250, 900) r 400 at 0.3, then
  new anchors every 12-30 f).
- *Frozen digit rain.* Tiny "0" and "1" glyphs in columns (cap 11 px, column pitch 17, row pitch 19), very dim, masked by
  a feathered ellipse.
- *Code with depth.* Code snippets and glyphs with depth blur on `#040307`.
- *Filling lattice* (24 fps). A full-screen lattice (pitch 48.2 px, dots 26 px) fills from the centre outward.

**Type and UI.** White type and glass over the darkest region; pools avoid the text area during holds.

**Rich.** The lattice barely there (+4 to +13 luma) except where light falls; pools moving slowly between anchors; the
lattice belonging to the camera.

**Cheap.** A uniformly bright dot pattern; code rain; a CSS dot background that never changes.

```tsx
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, random} from 'remotion';
import {at, useF30} from './bg-shared';

const PITCH = [26.83, 26.62, 25.85, 24.84, 23.71, 22.51, 21.3, 20.14, 19.15, 18.22, 17.36, 16.64, 15.98, 15.4, 14.9, 14.47, 14.07, 13.71, 13.41,
  13.15, 12.94, 12.75, 12.56, 12.43, 12.31, 12.22, 12.12, 12.07, 12.04, 12.02];
type Pool = [number, number, number, number];
const POOLS: Record<number, Pool[]> = {0: [[330, 260, 620, 1], [250, 900, 400, 0.3]], 12: [[420, 330, 520, 0.55], [300, 880, 420, 0.65]],
  24: [[520, 380, 480, 0.25], [1650, 880, 420, 0.5]], 42: [[1600, 250, 420, 0.8], [700, 420, 380, 0.35]], 60: [[420, 160, 520, 0.55], [1550, 820, 380, 0.35]],
  90: [[250, 120, 500, 0.6], [1850, 300, 380, 0.4]], 128: [[250, 120, 500, 0.6], [1850, 300, 380, 0.4]], 129: [[760, 300, 420, 0.45], [1500, 860, 360, 0.3]],
  175: [[760, 300, 420, 0.45], [1500, 860, 360, 0.3]], 176: [[720, 300, 380, 0.5], [1650, 950, 420, 0.35]], 214: [[720, 300, 380, 0.5], [1650, 950, 420, 0.35]]};
const sine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
const poolsAt = (f: number): Pool[] => {
  const ks = Object.keys(POOLS).map(Number).sort((a, b) => a - b);
  const k1 = ks.find((k) => k >= f) ?? ks[ks.length - 1], k0 = [...ks].reverse().find((k) => k <= f) ?? ks[0];
  const u = k1 === k0 ? 0 : sine((f - k0) / (k1 - k0));
  return POOLS[k0].map((p, i) => p.map((v, j) => v + (POOLS[k1][i][j] - v) * u) as Pool);
};
/** Lit ring-dot lattice on one canvas (1920x1080, ~13k dots at p 12; draw cost ~10-20 ms on CPU). */
export const LitDotGrid: React.FC = () => {
  const f = useF30(); const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!; c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
    const p = f < 30 ? at(f, Object.fromEntries(PITCH.map((v, i) => [i, v]))) : 12.02;
    const pools = poolsAt(f);
    const nx = Math.ceil(960 / p) + 1, ny = Math.ceil(540 / p) + 1;
    c.lineWidth = 0.13 * p;
    for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      const x = 960 + i * p, y = 540 + j * p;
      let L = 0; for (const [cx, cy, r, k] of pools) L += k * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (r * r)));
      L = Math.min(1, L); if (L < 0.02) continue;
      const g = Math.round(0x3a * L * 1.9); // x1.9 so that p99 reaches ~60 in a full pool (the "25 % too dim" fix, est. gain)
      c.strokeStyle = `rgb(${g},${g},${g})`; c.beginPath(); c.arc(x, y, 0.2 * p - 0.065 * p, 0, Math.PI * 2); c.stroke();
    }
  }, [f]);
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0}} />;
};

/** Binary digit field: pre-rendered once (seeded), masked by the feathered ellipse, faded per the table, moved by the camera. */
export const DigitField: React.FC<{opacity: number}> = ({opacity}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!; c.clearRect(0, 0, 1920, 1080);
    c.font = '15px "JetBrains Mono", monospace'; c.textBaseline = 'top'; // cap ~11 px
    for (let x = 0; x < 1920; x += 17) for (let y = 0; y < 1080; y += 19) {
      const r = random(`d${x}-${y}`); if (r < 0.25) continue;
      const ink = 0x16 + Math.floor(random(`i${x}-${y}`) * 9); c.fillStyle = `rgb(${ink},${ink},${ink})`;
      c.fillText(r < 0.625 ? '0' : '1', x, y);
    }
  }, []);
  const mask = 'radial-gradient(820px 780px at 960px 330px, #000 0%, #000 55%, transparent 100%)'; // radii 560 x 520 + 260 feather
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity, WebkitMaskImage: mask, maskImage: mask}} />;
};
// Use on a #0D0D0D -> #090909 ground; opacity = at(f, {6: 0, 16: 1, 33: 1}); it gets the same motion blur as the box during the whips.
```

### 12. Light architecture: curtains, lines and arcs, beams · `light-architecture`

Family: light, decoration. Starter: `fx/light/*`. See also `effects.md` `light-geometry`.

**Job.** A stage built from light in the brand colour: "launch, live, showtime" for the generated product without a
photograph; a wall of light gives a dark scene depth behind the hero.

**Numbers.**
- Bars 18-34 px wide with gaps of 8-16 px, about 60 across 1920 px, brightness 40-100 % (seeded); a vertical ramp from
  dark at the top to a peak at 65 % to a black floor; blurred 2 px.
- Lines 2 px at +12 % lightness; arcs r 1150-1250 px centred below the frame.

**Presets.**
- *Light-bar curtain.* A black base with about 60 vertical bars, each a ramp `#0B2A8C` -> `#3A7BFF` at 65 % -> black; the
  right side and the upper third brighter; a dark halo behind the page that floats on it.
- *Lines on the field.* 2 px lines `#3D76F0` (12 % lighter than `#2C68ED`): one diagonal from (0, 430) to (430, 0) and its
  mirror from (1490, 0) to (1920, 430); two arcs of radius 1150 and 1250 centred at (960, 1900); fixed to the screen.
- *Beams and blocks.* Soft-ended gradient beams and glass blocks, every cone and beam additive over what is below and never
  over the wordmark.

**Type and UI.** A dark page or window sits on the curtain with its own halo; success text in green under the page.

**Rich.** Seeded variation from bar to bar; a ramp with its peak off-centre; a dark halo behind the hero; a 2 px blur so the
bars glow; decoration at +12 % only.

**Cheap.** An even repeating stripe; bright stripes behind text; lens flares.

```tsx
import React, {useMemo} from 'react';
import {AbsoluteFill, random} from 'remotion';

/** Light-bar curtain: ~60 seeded bars, ramp dark-blue -> bright blue at 65 % -> black, brighter right and up, halo behind the page. */
export const LightCurtain: React.FC<{halo?: {x: number; y: number; w: number; h: number}}> = ({halo = {x: 958, y: 595, w: 1700, h: 900}}) => {
  const bars = useMemo(() => {
    const out: {x: number; w: number; b: number}[] = []; let x = -10; let i = 0;
    while (x < 1930) { const w = 18 + random(`bw${i}`) * 16, gap = 8 + random(`bg${i}`) * 8;
      const b = (0.4 + random(`bb${i}`) * 0.6) * (0.75 + 0.25 * (x / 1920)); out.push({x, w, b}); x += w + gap; i++; }
    return out;
  }, []);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: 'blur(2px)'}}>
        {bars.map((b, i) => <div key={i} style={{position: 'absolute', left: b.x, top: 0, width: b.w, height: 1080, opacity: b.b,
          background: 'linear-gradient(180deg, #0B2A8C 0%, #2A62E8 40%, #3A7BFF 65%, #0A1A40 88%, #000000 100%)'}} />)}
      </AbsoluteFill>
      {/* upper third brighter: a soft white-blue lift; then the dark halo behind the page */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(120,170,255,.10) 0%, rgba(120,170,255,0) 40%)', mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: `radial-gradient(${halo.w / 2}px ${halo.h / 2}px at ${halo.x}px ${halo.y}px, rgba(0,0,0,.75) 0%, rgba(0,0,0,.45) 60%, rgba(0,0,0,0) 100%)`}} />
    </AbsoluteFill>
  );
};

/** G-lines: two corner diagonals + two arcs, 2 px #3D76F0, screen-fixed over the blue field. */
export const GLines: React.FC = () => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}} fill="none" stroke="#3D76F0" strokeWidth={2}>
    <line x1={0} y1={430} x2={430} y2={0} /><line x1={1490} y1={0} x2={1920} y2={430} />
    <circle cx={960} cy={1900} r={1150} /><circle cx={960} cy={1900} r={1250} />
  </svg>
);
```

### 13. World swap behind a locked hero · `world-swap`

Family: photographic world, rhythm. Starter: `fx/Montage`. See also `transitions.md` `shared-element`.

**Job.** "Any world": the product (or the generated asset) is constant while the context changes on a beat; the visual
form of "it works everywhere, it can make anything".

**Numbers.** 5-6 frames per world (0.17-0.25 s), 4-7 worlds; the hero keeps a continuous push (scale 1.0 -> 1.12); grounds
may punch 1.016-1.03 on their own cuts.

**Presets.**
- *Product on worlds* (24 fps, on threes). A cut-out product stays locked at the frame centre with a slow push-in while the
  ground behind it cuts every 6 f: paper white with a soft grey shadow, wildflowers from above, fruit slices, long grass;
  the grounds punch 1.03 and 1.016 on two of the cuts.
- *Phone on worlds.* The same phone in a cut-out hand holds while its background photo swaps every 5 frames (7 scenes)
  under a continuous accelerating push.

**Type and UI.** Usually none during the swap; the line arrives as the swap ends.

**Rich.** The hero perfectly locked (or pushing smoothly) across hard cuts of the ground; worlds that share a grade and a
light direction; a musical cadence (on 5s or 6s).

**Cheap.** Cross-fades between grounds; worlds with different light; the hero jumping with each cut.

```tsx
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {at, src30, useF30} from './bg-shared';

/** Grounds cut every `every` source frames behind a hero that pushes smoothly; each ground can punch on its own cut. */
export const WorldSwap: React.FC<{grounds: string[]; hero: React.ReactNode; every?: number; srcFps?: number; start?: number}> = ({grounds, hero, every = 6, srcFps = 24, start = 0}) => {
  const f = useF30() - start; const per = src30(every, srcFps);
  const i = Math.min(grounds.length - 1, Math.max(0, Math.floor(f / per)));
  const local = f - i * per;
  const punch = i === 0 ? 1 : at(local, {0: 1, [per * 0.7]: 1.03}); // 1.03 / 1.016 pushes inside a world
  const heroS = at(f, {0: 1, [per * grounds.length]: 1.12});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${punch})`}}>
        <Img src={staticFile(grounds[i])} style={{width: 1920, height: 1080, objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${heroS})`}}>{hero}</AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### 14. A window onto another world · `window-onto-world`

Family: world, mask. Starter: `fx/Iris`, `fx/Window`, `fx/Pixel`. See also `effects.md` `iris`.

**Job.** The next world is shown before it is entered: a glimpse that becomes the scene (an iris), a picture framed as
content (a stadium), a world consumed by the next idea (pixels).

**Numbers.** An iris reaches the full frame in 4-5 f; a scalloped iris has 14 lobes and a 12 px edge; a stadium widens
455 -> 685 px in about 20 f (expo-out) and narrows 685 -> 591 in 10 f (cubic-in); mosaic cells 45-65 px. The world inside
is already moving; the edge is soft (6-12 px) or pixel-hard.

**Presets.**
- *Scalloped iris.* On a dark stage a white four-point star grows and spins; a scalloped window opens around it onto a cloud
  plate, the star darkening to a black hole over 5 f.
- *Fast iris.* A circle with a 6 px soft edge: 808, 1424, 1730, 1898 px, full.
- *Stadium on paper.* A cream page `#F5F0EA` with a thin grid (1 px `#E4DDD5`); a photo revealed in a stadium of height 369
  whose width grows 455, 532, 569, 595, 613, 627, 639, 647, 653, 659, 665, 669, 671, 675, 677, 679, 681, 683, 685 px, then
  narrows to 591 on a cubic-in.
- *Pixels eat the plate.* From the right edge a black pixel mosaic eats the sky: square cells sweeping right to left, the
  boundary a staircase of 45-65 px squares.
- *Letterbox to quad.* A letterbox window becomes a tilted photo quad, then flat.
- *Split windows.* One window grows to the full frame while the other shrinks.

**Type and UI.** Type outside the window, or arriving after it opens.

**Rich.** A window shape that belongs to the brand (a stadium for a pill UI, a scallop for a star logo, pixels for a pixel
font); the inner world moving on its own; soft, exact edges.

**Cheap.** A circle wipe between unrelated scenes; a hard-edged rectangle sliding.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {at, useF30} from './bg-shared';

/** Stadium window (pane coordinates; scale x2 for a full 1920 frame): the width table, height fixed 369, photo unscaled. */
const WIDTH: Record<number, number> = {85: 455, 86: 532, 87: 569, 88: 595, 89: 613, 90: 627, 91: 639, 92: 647, 93: 653, 94: 659, 95: 665, 96: 669,
  97: 671, 98: 675, 99: 677, 100: 679, 101: 681, 103: 683, 105: 685, 114: 685, 115: 683, 116: 681, 117: 679, 118: 675, 119: 669, 120: 663,
  121: 655, 122: 641, 123: 623, 124: 591};
export const StadiumWindow: React.FC<{world: React.ReactNode}> = ({world}) => {
  const f = useF30(); const w = at(f, WIDTH), h = 369, cx = 477, cy = 268.5;
  return (
    <AbsoluteFill style={{background: '#F5F0EA'}}>
      <svg width={960} height={540} style={{position: 'absolute'}} stroke="#E4DDD5" strokeWidth={1}>
        <line x1={138} y1={0} x2={138} y2={540} /><line x1={816} y1={0} x2={816} y2={540} />
        <line x1={0} y1={84} x2={960} y2={84} /><line x1={0} y1={453} x2={960} y2={453} />
      </svg>
      <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: h / 2, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: -(cx - w / 2), top: -(cy - h / 2), width: 960, height: 540}}>{world}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Scalloped iris: an SVG path of 14 shallow lobes, radius R(f), soft 12 px edge via a blurred mask copy. */
export const ScallopMask = (R: number, lobes = 14, depth = 0.06, cx = 960, cy = 540) => {
  const pts: string[] = [];
  for (let i = 0; i <= 360; i += 2) { const a = (i * Math.PI) / 180; const r = R * (1 - depth + depth * Math.abs(Math.cos((lobes * a) / 2)));
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><filter id='s'><feGaussianBlur stdDeviation='6'/></filter>` +
    `<polygon points='${pts.join(' ')}' fill='black' filter='url(#s)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};
// usage: <AbsoluteFill style={{WebkitMaskImage: ScallopMask(r), maskImage: ScallopMask(r)}}>{cloudPlate}</AbsoluteFill>, r from 0 to about 1300 over 7 f (expo-out).
```

### 15. Context plate: the place the product lives · `context-plate`

Family: photographic world, proof. Starter: `fx/Photo`, `fx/Footage`, `fx/FootageRamp`. Found plates only.

**Job.** Proof and empathy: the problem's real place (a desk buried in paperwork) or the result in the real world (the brand
on a billboard). It answers "who is this for" without words.

**Numbers.** 1-3 s per plate; the camera: a slow push of 1.5 %, a dolly and orbit, a 2 f punch-in, or a pre-punched 1.41x
settling; the content: the user's real situation, or the product's output in the world; the grade natural or the film's
map, darkened under white type.

**Presets.**
- *Desk to phone* (60 fps). A top-down desk; items drop in over 30 f; a slow push-in; the phone wakes; a spin and plunge into
  a hard cut in motion; then notifications rise and stack in 3D while the camera dollies and orbits; a lamp light from the
  upper right (radial `#613217` -> `#170200`).
- *Room plate.* A natural room photo with a false-colour version on top revealed per material; the plate keeps its natural
  depth of field; a 2-frame punch-in.
- *Product mock-up.* A still mock-up photo, nearly static (a slow 1.5 % push): a dark wooden table against a near-black warm
  wall `#170E06`, the product placed in correct perspective.
- *Laptop plate.* A grey wall `#BEBCBF` with near-black silhouettes `#15100C`.
- *Output in the world.* The generated campaign on real billboards in a city.

**Type and UI.** UI floats in perspective on the plate, or a dark frosted pill holds the line; white type on darkened plates.

**Rich.** Plates chosen for the line; mock-ups with the film's own output placed in correct perspective; a camera that moves
into the product; one grade.

**Cheap.** Generic team-in-an-office stock; a plate unrelated to the sentence; a mock-up with the UI pasted flat.

```tsx
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile} from 'remotion';
import {at, useF30} from './bg-shared';

/** A context plate with a purposeful camera: push (scale), optional pre-punch settle, screen-UI in perspective. */
export const ContextPlate: React.FC<{src: string; video?: boolean; push?: number; prePunch?: number; dur: number; children?: React.ReactNode}> = ({src, video, push = 0.015, prePunch, dur, children}) => {
  const f = useF30();
  const settle = prePunch ? at(f, {0: prePunch, 12: 1}, (x) => 1 - Math.pow(1 - x, 4)) : 1;
  const s = settle * (1 + push * Math.min(1, f / dur));
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${s})`}}>
        {video ? <OffthreadVideo src={staticFile(src)} muted /> : <Img src={staticFile(src)} style={{width: 1920, height: 1080, objectFit: 'cover'}} />}
      </AbsoluteFill>
      {children /* UI in the plate's perspective: wrap in a div with perspective + rotateX/Y matched to the plate's vanishing lines */}
    </AbsoluteFill>
  );
};
// Asset search patterns: "top-down desk paperwork invoices phone", "desk sunset window laptop", "dark wood table
// binder mockup" (CC0 / Unsplash / Pexels licence, graded with `plate-grade`). Footage: OffthreadVideo, muted, trimmed to the beat.
```

### 16. Giant type as a world layer · `type-ground`

Family: type, world. Starter: `fx/TypeBehind`, `fx/TypeDepth`. See also `items.md` `giant-type`.

**Job.** The brand name or the verb becomes part of the scenery: the UI sits in the name, the action word sweeps across the
picture. Type and world stop being separate layers.

**Numbers.** Cap 360-718 px (the word fills 80-90 % of the width); translucent or solid black; behind the UI or in front of
the hero; it rises on an ease-out from 160 px per frame to 30.

**Presets.**
- *Name behind the bar.* On a static halftone cloud plate, the brand name in a translucent light-blue serif spans x 210-1730
  (cap top 300, baseline 660); a frosted bar (radius 40, a 2-3 px backdrop blur, `#E8F8FB` at 70 %, a white rim at 60 %)
  sits across it.
- *Verb sweeps in front.* A giant black word (cap about 718 px, font about 1090 px, with a print texture), cut by the right
  edge, rises on an ease-out (its top-left corner (810, 260) -> (650, 222) -> (486, 182) -> (387, 144) -> (346, 106) ->
  (305, 66) -> (276, 40) over 9 f) in front of the product.
- *Big text behind cards.* A pale blob field | a label | cards and panels | big text behind the cards.

**Type and UI.** The UI must stay legible over the word: a frosted bar or solid cards.

**Rich.** Huge, cropped by the frame, on a different depth plane than the UI, translucent or textured, entering with weight.

**Cheap.** A big faded watermark word that just sits there; outline text at 5 % opacity.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {at, src30, useF30} from './bg-shared';

/** A giant word rising in front of the hero along a top-left corner table (24 fps). */
export const GiantWordRise: React.FC<{word: string; start?: number; font?: string}> = ({word, start = 552, font = '600 1090px "Inter Tight"'}) => {
  const f = useF30();
  const k = (n: number) => src30(n, 24);
  const top = at(f, {[k(start)]: 810, [k(553)]: 650, [k(555)]: 486, [k(556)]: 387, [k(558)]: 346, [k(559)]: 305, [k(561)]: 276});
  const left = at(f, {[k(start)]: 260, [k(553)]: 222, [k(555)]: 182, [k(556)]: 144, [k(558)]: 106, [k(559)]: 66, [k(561)]: 40});
  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
      {/* cap top = top; the em box starts ~0.17 em above the cap top for a grotesk at this size (est.) */}
      <div style={{position: 'absolute', left, top: top - 0.17 * 1090, font, color: '#0D0D0D', lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: '-0.03em'}}>{word}</div>
    </AbsoluteFill>
  );
};

/** Translucent giant serif wordmark behind a frosted bar, over a static field. */
export const WordBehind: React.FC<{word: string; field: React.ReactNode; children?: React.ReactNode}> = ({word, field, children}) => (
  <AbsoluteFill>
    {field}
    <div style={{position: 'absolute', left: 0, right: 0, top: 300 - 0.22 * 470, textAlign: 'center', font: '400 470px "Instrument Serif"',
      color: 'rgba(170,215,245,.55)', lineHeight: 1}}>{word}</div>
    {children /* the frosted bar: backdrop-filter blur(3px) at its own size + #E8F8FB at .7 + 1 px white rim at .6 */}
  </AbsoluteFill>
);
```

### 17. Hairline and dashed grids · `hairline-grid`

Family: decoration, structure. Starter: `fx/Grids`, `fx/Brackets`.

**Job.** Structure and craft: "designed, engineered"; the grid is where UI snaps into place, and when it moves with the camera
it shows the scale.

**Numbers.**
- Lines 1-2 px; on light grounds `#C9C7CC`-`#E6E6E6` (6-15 % darker than the ground); on dark grounds `#2A2A2A`-`#4A4A4A`
  or white at 22 %.
- Pitch 65 px (a dashed period), 117-150 px, 120-121.5 px; always centred on the frame centre or on the layout's cells.
- Marks at intersections (diamonds), dashes, bowed arcs (a lens feel).
- Attached to the world, or static; the grid is the layout's skeleton.

**Presets.**
- *Dashed grid.* 2 px grey `#484848` dashes, dash 31 px, gap 34 px (period 65 px at camera scale 1), axis-aligned, bowed
  30 px horizontally and 25 px vertically for a lens feel, attached to the world.
- *Light and dark grid.* A light ground `#F3F1F4` with 1 px `#C9C7CC` lines, or black with 1 px `#4A4A4A`; the lines move
  between holds as the layout changes.
- *Tile grid.* 1 px `#E6E6E6` hairlines with small diamond marks `#D9D9D9` at the intersections, tiles `#F9F9F9` around the
  white hero card; a dark version on black with `#2A2A2A` lines.
- *Graph paper.* Paper `#F0F0F0` (with fibre) and a 1 px grid of `#CDCDCD` on a 120 px pitch.
- *Construction lines.* `#D9D9DB` 2 px on a light ground; white at 22 % on a dark one.
- *Bento.* A `#F4F3F3` ground, white rounded tiles 205 px, radius 46, gutter 46, a 1 px `#EDEDED` edge.

**Type and UI.** Cards and words sit in cells; corner brackets in the grid colour or white.

**Rich.** Hairlines at 6-15 % contrast; marked intersections; cells the content actually uses; the grid moving with the world
or animating as the layout changes.

**Cheap.** A high-contrast CSS background grid that nothing aligns to.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/** Hairline grid centred on the frame, optional diamond marks. Pass inside <Camera> to attach it. */
export const HairGrid: React.FC<{px?: number; py?: number; line?: string; w?: number; marks?: string; ground?: string}> = ({px = 120, py = 121.5, line = '#CDCDCD', w = 1, marks, ground = 'transparent'}) => {
  const ox = 960 % px, oy = 540 % py;
  return (
    <AbsoluteFill style={{background: [
      `repeating-linear-gradient(90deg, ${line} 0 ${w}px, transparent ${w}px ${px}px)`,
      `repeating-linear-gradient(0deg, ${line} 0 ${w}px, transparent ${w}px ${py}px)`].join(', ') + `, ${ground}`,
      backgroundPosition: `${ox}px ${oy}px`}}>
      {marks && <AbsoluteFill style={{backgroundImage: `radial-gradient(circle, ${marks} 0 3px, transparent 3.5px)`, backgroundSize: `${px}px ${py}px`,
        backgroundPosition: `${ox - px / 2}px ${oy - py / 2}px`}} />}
    </AbsoluteFill>
  );
};

/** Dashed grid: 2 px #484848, dash 31 / gap 34; positions per shot (lines in world px); bow = a lens arc (SVG quadratic paths). */
export const DashedGrid: React.FC<{xs: number[]; ys: number[]; bow?: number}> = ({xs, ys, bow = 0}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}} fill="none" stroke="#484848" strokeWidth={2} strokeDasharray="31 34">
    {ys.map((y) => <path key={`h${y}`} d={`M0 ${y + bow * Math.sign(y - 540)} Q960 ${y - bow * Math.sign(y - 540)} 1920 ${y + bow * Math.sign(y - 540)}`} />)}
    {xs.map((x) => <path key={`v${x}`} d={`M${x + bow * 0.8 * Math.sign(x - 960)} 0 Q${x - bow * 0.8 * Math.sign(x - 960)} 540 ${x + bow * 0.8 * Math.sign(x - 960)} 1080`} />)}
  </svg>
);
```

### 18. Warm paper and editorial grounds · `paper-ground`

Family: light world, material. Starter: `fx/Grounds`, `fx/Textures`.

**Job.** Editorial, human, considered: the frame reads like print. A warm paper also makes a single saturated accent glow
without any light effect.

**Numbers.**
- Warm papers `#F4F2EE`-`#F9F8F3`; cool papers `#F0F0F0`, `#F4F2F5`, `#F3F4F6`; cream `#F5F1E8`; grey-cream `#EBE8E3`.
- Texture: none (the default), a fibre noise with luma sd about 1.0, or grain at 4 %.
- Always flat (no gradient, no vignette).

**Presets.**
- *Grey paper with fibre.* `#F0F0F0` corners, `#ECECEC` average, a fine fibre noise (luma sd about 1); each scene a
  full-bleed picture or a card on paper.
- *Cream with grain.* A cream paper with fine grain carrying labels, a branch, leaves.
- *Warm paper.* `#F4F2EE` (frames `#F5F3EF`), the same off-white reused for type on black scenes.
- *Warm off-white.* `#F4F3F1`; a cool lavender-white `#F3F4F6` for a chat scene.
- *Flat cream.* `#F5F1E8`, identical everywhere; or `#F5F0ED`, then a cool lilac-grey `#F4F2F5` for the next act.

**Type and UI.** Warm near-black ink; a serif display is welcome; white cards with no shadow or a hairline.

**Rich.** A paper value taken from real stock; fibre noise at sd about 1; the same off-white reused for type on dark scenes;
flat, sharp photo cards.

**Cheap.** A beige parchment (`#F5E6C8`); heavy paper textures; drop shadows under every card.

```tsx
import React, {useMemo} from 'react';
import {AbsoluteFill, random} from 'remotion';

/** Paper with fibre: a static tile of short, faint, mostly horizontal strokes (luma sd ~1) over the paper colour. Static: paper does not crawl. */
export const Paper: React.FC<{colour?: string; fibre?: boolean}> = ({colour = '#F5F3EF', fibre = true}) => {
  const url = useMemo(() => {
    if (!fibre) return null;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
    for (let i = 0; i < 900; i++) {
      const x = random(`fx${i}`) * 512, y = random(`fy${i}`) * 512, l = 6 + random(`fl${i}`) * 22, a = (random(`fa${i}`) - 0.5) * 0.6;
      g.strokeStyle = random(`fc${i}`) < 0.5 ? 'rgba(0,0,0,0.018)' : 'rgba(255,255,255,0.03)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return c.toDataURL();
  }, [fibre]);
  return <AbsoluteFill style={{background: colour, backgroundImage: url ? `url(${url})` : undefined}} />;
};
// Values: warm paper #F5F3EF, #F7F5F4, #F0F0F0 + fibre, cream #F5F1E8, #F5F0ED, #F9F8F3.
```

### 19. Texture on the ground · `ground-texture`

Family: material, finish. Starter: `fx/Textures`, `fx/DitherBands`. See also `effects.md` `grain`.

**Job.** Material: grain makes a colour field a surface (and kills banding), halftone makes a sky printed, stripes make a grey
read as fabric. It separates the ground from the clean UI on top.

**Numbers.** Grain sigma 1.2-3 levels, 1-1.5 px, re-seeded per frame or static per frame; on the ground only or on
everything. Stripes with a 4 px period at +/-3 levels; halftone dots on a regular grid. Clean digital is the norm: most of the time there is
no grain at all.

**Presets.**
- *Anti-banding grain.* Sigma 1.2 on 0-255, static per frame, on everything; it keeps the dark ramps from banding.
- *Dark-world grain.* 2 levels, opacity 0.04, a new seed every frame.
- *Scoped grain.* On one green stage only: monochrome, sigma about 3, 1.5 px, re-seeded per frame so it shimmers; the card on
  it stays clean.
- *Paper fibre.* Luma sd about 1.0.
- *Fabric grey.* `#D8D8D8` with a fine 45-degree stripe (period about 4 px, +/-3 levels).
- *Halftone sky.* White 1-bit dots on a sky accent `#59C9F6`.

**Type and UI.** Texture never on the type or the cards.

**Rich.** Texture at 1-3 levels, scoped to the ground, re-seeded per frame only where it should shimmer.

**Cheap.** Visible film-grain overlays at 10 % or more; dust and scratches; texture over UI and type.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/** Micro-stripes: 45 deg, period 4 px, +-3 levels around #D8D8D8. */
export const MicroStripes: React.FC = () => (
  <AbsoluteFill style={{background: 'repeating-linear-gradient(45deg, #DBDBDB 0 2px, #D5D5D5 2px 4px)'}} />
);

/** Halftone field: a dot screen whose dot radius follows a soft cloud map (two radial gradients drive size via mask). */
export const HalftoneSky: React.FC<{sky?: string; pitch?: number}> = ({sky = '#59C9F6', pitch = 14}) => (
  <AbsoluteFill style={{background: sky}}>
    <AbsoluteFill style={{backgroundImage: `radial-gradient(circle, #FFFFFF 0 ${pitch * 0.36}px, transparent ${pitch * 0.38}px)`, backgroundSize: `${pitch}px ${pitch}px`,
      WebkitMaskImage: 'radial-gradient(700px 300px at 600px 700px, #000 20%, transparent 70%), radial-gradient(800px 260px at 1400px 380px, #000 15%, transparent 70%)',
      maskImage: 'radial-gradient(700px 300px at 600px 700px, #000 20%, transparent 70%), radial-gradient(800px 260px at 1400px 380px, #000 15%, transparent 70%)'}} />
  </AbsoluteFill>
);
// Grain scoped to a ground: <AbsoluteFill><GreenStage/><Grain sigma={3}/></AbsoluteFill> then the card ABOVE the grain layer.
```

### 20. Desktop wallpaper world · `os-wallpaper`

Family: product world. Starter: `fx/Window`, `kit/screens`.

**Job.** "This is your computer": the pain lives in files and apps you know; the wallpaper makes the UI real without a real
screenshot.

**Numbers.** The wallpaper is a recognisable OS-style landscape (dunes, hills), never a brand photo; window glass 7 % white
over a 2 px blur (much less than frosted UI glass: the wallpaper must stay readable); window radius 32 px.

**Presets.**
- *Dunes.* A hard cut to a dune wallpaper racking into focus (blur 6, 4, 1, 0 px over 4 f); a large lightly frosted window
  holds a folder of files.
- *Hills.* A chat window over a green-hills wallpaper (a forested ridge, a misty bright sky) grows in; thread replies slide
  in; a hard cut to a blank grey frame ends it.
- *Dock tray.* A long graphite tray with recessed rounded sockets holding app icons in a void, then lit white.

**Type and UI.** Native-looking window chrome; 7 % white glass; app icons as official assets.

**Rich.** An OS-like wallpaper with depth; a lightly frosted window; the rack focus as the entrance.

**Cheap.** A real OS screenshot with a menu bar and someone's icons.

```tsx
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {at, useF30} from './bg-shared';

/** Wallpaper racks in (6/4/1/0 px), the window grows on a push while the wallpaper holds; the window's glass = a
 *  2 px-blurred copy of the wallpaper clipped to its box (cheaper than backdrop-filter) + white 7 %. */
export const WallpaperWindow: React.FC<{wall: string; start?: number; children?: React.ReactNode}> = ({wall, start = 279, children}) => {
  const f = useF30() - start;
  const blur = at(f, {0: 6, 1: 4, 2: 1, 3: 0});
  const s = at(f, {0: 0.82, 30: 1}, (x) => 1 - Math.pow(1 - x, 3)); // window push (est. 0.82 -> 1 over the scene)
  const box = {w: 1240 * s, h: 760 * s}; const x = 960 - box.w / 2, y = 540 - box.h / 2;
  return (
    <AbsoluteFill>
      <Img src={staticFile(wall)} style={{width: 1920, height: 1080, objectFit: 'cover', filter: blur ? `blur(${blur}px)` : undefined}} />
      <div style={{position: 'absolute', left: x, top: y, width: box.w, height: box.h, borderRadius: 32, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.25)'}}>
        <Img src={staticFile(wall)} style={{position: 'absolute', left: -x, top: -y, width: 1920, height: 1080, objectFit: 'cover', filter: 'blur(2px)'}} />
        <div style={{position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)'}} />
        {children}
      </div>
    </AbsoluteFill>
  );
};
```

### 21. Star field, particle night and bokeh · `space-field`

Family: dark world, particles. Starter: `fx/Seed`. See also `effects.md` `particle-field`.

**Job.** Scale and network: points become nodes, a sky of signals, "every one of your prospects"; space says reach.

**Numbers.** 6-15 hero points plus faint depth points at 30-40 %; points 2-31 px with 1.5-6 px glows; bokeh 52-103 px blurred
4 px; one new point every 2 frames, or a hard cut to the whole field; placed, never random noise.

**Presets.**
- *Star field.* A hard cut to 15 white dots (10 px, a soft 1.5 px edge, a 6 px white glow) that form the field, then bloom,
  then become signal chips.
- *Particle night.* Eleven blue dots pop in, one every 2 frames, at fixed positions over a night floor glow `#172480`; faint
  depth points.
- *Deep space.* Two dark glass planets close in; a fly along an axis; a transit over a dark grid.
- *Earth plate.* An ocean-cloud blue `#3A78D8`, cloud highlights `#D8E8FF`, space beside the limb `#142C6A` (a found plate,
  graded).
- *Dark bokeh.* Black discs of 52-103 px blurred 4 px float in over KPI cards, one half off the top-right corner.

**Type and UI.** White type; points avoid the text box; chips attach to points.

**Rich.** Few, placed, each with a glow, arriving on a rhythm, becoming something (a network, a chart).

**Cheap.** Hundreds of random twinkling particles; a looping star video.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {at, useF30} from './bg-shared';

/** Placed points that pop in on a rhythm, each a core + glow (box-shadow is cheap at this count). */
export const PlacedStars: React.FC<{pts: {x: number; y: number; d: number; colour?: string}[]; every?: number; start?: number; glow?: number}> = ({pts, every = 2, start = 0, glow = 6}) => {
  const f = useF30() - start;
  return (
    <AbsoluteFill>
      {pts.map((p, i) => {
        const s = at(f - i * every, {0: 0, 4: 1.15, 7: 1}); // pop with one overshoot
        return <div key={i} style={{position: 'absolute', left: p.x - p.d / 2, top: p.y - p.d / 2, width: p.d, height: p.d, borderRadius: '50%',
          background: p.colour ?? '#FFFFFF', transform: `scale(${s})`, boxShadow: `0 0 ${glow}px ${glow / 3}px ${p.colour ?? '#FFFFFF'}`, filter: 'blur(0.75px)'}} />;
      })}
    </AbsoluteFill>
  );
};
```

### 22. Radial centre lift, dip and vignette · `radial-shape`

Family: ground shaping. Starter: `fx/LightField`, `fx/Lens`. See also `effects.md` `vignette`.

**Job.** Focus without an effect: the eye goes where the ground is lightest; an off-centre lift implies a light source.

**Numbers.** Stage lifts 5-9 dE on dark and 6-15 dE on light; floor and top lights 12-68 dE; centres at (50 %, 50 %) for heroes,
(50, 0) for a top light, (50, 100) for a floor, (75, 25) for a lamp; off-centre corners for vignettes.

**Presets.**
- *Dark centre lifts.* `#171517` -> `#060406` (5.8 dE); `#1F1C1F` -> `#0A080A` (8.5 dE); `#120F11` -> `#000000` (5.2 dE);
  a navy `#000236` -> `#000003` (33.8 dE); a warm top light `#1C1206` -> black from (50, 0); a lamp `#613217` -> `#170200`
  from (75, 25).
- *Light lifts.* `#FFFEFE` -> `#EAF3FE` (8.1 dE, centred); `#F5F9F8` -> `#D4DFF5` (15 dE) from the right edge.
- *Inverse.* Edges lighter than the centre on a brand field (`#2862E5` centre, `#336FFB` edges, 6.7 dE).
- *Tinted vignette.* Darkest at the top left `#4F705E`, lightest at the top right `#5E8971`, on a green stage.

**Type and UI.** The hero or headline sits at the lift's centre; nothing important in the darker corners.

**Rich.** 5-15 dE; off-centre when there is a source; corners at the true ground value on stages.

**Cheap.** A default black vignette at 40 %; a radial gradient you can see as a circle.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Dither} from './bg-shared';

/** A radial shape: inner -> outer about a centre in %, ellipse sized to the frame (farthest-corner), dithered. */
export const RadialShape: React.FC<{inner: string; outer: string; cx?: number; cy?: number; mid?: number}> = ({inner, outer, cx = 50, cy = 50, mid = 55}) => (
  <AbsoluteFill style={{background: `radial-gradient(farthest-corner at ${cx}% ${cy}%, ${inner} 0%, ${outer} 100%)`, backgroundSize: '100% 100%'}}>
    <Dither />
  </AbsoluteFill>
);
// <RadialShape inner="#1F1C1F" outer="#0A080A"/>; inner #FFFEFE outer #EAF3FE; top light: cx 50 cy 0.
```

### 23. Pure white stage · `white-stage`

Family: light world, base. Starter: `fx/Grounds`.

**Job.** The product's own canvas: when the content is rich (thumbnails, photos, colour accents), white is the gallery wall.

**Numbers.** `#FFFFFF` exactly; a second near-white for app surfaces (`#FAFBF6`, `#FBFAF5`, `#F9F9F9`, `#FAFAFC`) to separate UI
from stage; zero gradient, zero texture, zero drift. Encoded limited-range white reads Y 235.

**Presets.**
- *Pure white film.* Every white pixel 255, 255, 255; the layer order: white stage, pictures and 3D, panels and cards, UI
  chrome, captions, cursor; no grade, vignette, grain, bloom, chromatic aberration, motion blur or depth of field.
- *White with accent glows.* The only glows are radial gradients in the accent, never blurs of content.
- *White cells.* White ground, white cards, a white input box; no grade, vignette, grain or bloom.
- *White with photo cards.* Photo cards, words and one red pill on white.

**Type and UI.** Near-black ink; accent words in the brand colour (accent marker blocks); cards white on white, separated by a
1 px `#EDEDED` edge or a 10 px 4 % shadow; a heat gradient only as `background-clip: text`.

**Rich.** True `#FFFFFF`; a slightly warm second white for app surfaces; content dense and colourful enough to carry the
frame; motion everywhere else.

**Cheap.** White with sparse grey UI and nothing else (the flat minimal look); a light grey `#F5F5F5` that reads dirty next to
white UI.

```tsx
import React from 'react';
import {AbsoluteFill} from 'remotion';

/** The white stage. Encode note: render with the starter's BT.709 limited-range pipeline so #FFFFFF lands at Y 235 (broadcast white). */
export const WhiteStage: React.FC<{children?: React.ReactNode}> = ({children}) => <AbsoluteFill style={{background: '#FFFFFF'}}>{children}</AbsoluteFill>;
export const appSurface = '#FAFBF6'; // App window; sidebar #FBFAF5
```

### 24. Panel grid as a world · `panel-grid`

Family: layout world. Starter: `fx/Grids`, `fx/Montage`. See also `transitions.md` `split-panel`.

**Job.** Breadth at a glance: four features or four products at once; the grid itself is the system.

**Numbers.** Gutters 0 px, or 8 px dark with a 14 px radius; panes 960 x 540 or 948 x 528; pane grounds differ in value but
stay in one family; clocks and cuts are independent.

**Presets.**
- *Gutterless quad.* Four panels, no gutters, borders or rounding; hard seams; each panel its own world and loop (a black
  list, a warm sky, a call screen, a pale 3D floor).
- *Four near-whites.* A gutterless 2 x 2 of 960 x 540 panes: `#F5F0EA`, `#E8E6E7`, `#F6F7F2`, `#F2F2F2`.
- *One light, three graphite.* `#E9EDF0` top left, `#181818` for the other three.
- *Framed quad.* A `#0A0A0A` frame with 8 px gutters and margins, four 948 x 528 panels with a 14 px radius.
- *Quadrants with shapes.* A warm white `#FDFBFD` ground with shapes and arrows cropped by each quadrant.

**Type and UI.** Each pane is a full film at 960 x 540: type sizes halve, everything else follows its own entry.

**Rich.** Pane grounds tuned against each other; independent clocks so the grid breathes; exact seams.

**Cheap.** Four identical panes cutting in sync; random pane colours.

```tsx
import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';

/** 2x2 panes; each pane is its own composition with its own ground and its own clock (offset). gutter 0, or 8 with radius 14. */
export const PanelGrid: React.FC<{panes: {node: React.ReactNode; offset?: number}[]; gutter?: number; radius?: number; frame?: string}> = ({panes, gutter = 0, radius = 0, frame = '#0A0A0A'}) => {
  const w = (1920 - gutter * 3) / 2, h = (1080 - gutter * 3) / 2;
  return (
    <AbsoluteFill style={{background: frame}}>
      {panes.slice(0, 4).map((p, i) => (
        <div key={i} style={{position: 'absolute', left: gutter + (i % 2) * (w + gutter), top: gutter + Math.floor(i / 2) * (h + gutter), width: w, height: h,
          borderRadius: radius, overflow: 'hidden'}}>
          <Sequence from={-(p.offset ?? 0)} layout="none">{p.node}</Sequence>
        </div>
      ))}
    </AbsoluteFill>
  );
};
```

---

## Checking a ground

| check | pass |
|---|---|
| ground change (median grey change per frame on ground pixels) | under 1.0 per shot; up to about 2 only for a living light field or a 3D world |
| colour drift inside a shot | 0-2 dE for solids and paper; 1-14 dE for light fields |
| light-ground gradient span, top to bottom | 8-30 dE |
| dark-ground hue spread | one hue (hue angle spread under 25 degrees) from black to the light |
| ground hue vs the brand accent | within +/-15 degrees of hue, or neutral (chroma under 6) |
| white and paper values | `#FFFFFF` exactly; warm paper `#F5F3EF` +/-2 |
| worlds per film | no more worlds than acts; changes only at act boundaries, each with a `ground-flip` device |
| dark scenes | a stated light layer lifting at least 5 dE, or a floor or horizon light |
| plates | one grade for all; blur of 20 px or more, or a calm sky area where type sits; a camera move that lands |
| banding | no visible steps (adjacent-row difference of 1 LSB or less after encoding, dither on) |
| decoration contrast | lines, dots and digits within +4 to +15 % of the ground |
| type on the ground | contrast 4.5 or more for body lines, 3 or more for display; no text shadow on photos |
