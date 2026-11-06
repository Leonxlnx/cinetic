/**
 * cinetic:light solid things: a face that is a substance under one key light, type built as a solid with its sides in
 * shade, and a lit studio for them to stand in
 *
 * A flat fill reads as a diagram; a wireframe reads as a loading state. A thing reads as REAL when it shows what it is
 * made of: how its face takes the light (a sharp moving highlight on lacquer, a horizon line on polished metal, a soft
 * falloff on matte ceramic), that it has sides (darker, falling into occlusion toward the back) and that it stands
 * somewhere (a contact shadow where it meets the floor, its reflection or cast shadow on that floor, a key pool on the
 * wall behind it falling off toward the corners).
 *
 *   faceFill    the front face of a solid in a material, as CSS background layers: on a box, or on type through
 *               background-clip: text. `sweep` (0..1) is where the key's highlight crosses the face: drive it with the
 *               camera or the light, never let it rest.
 *   sideTone    the colour of a solid's side at depth share d (0 its front edge, 1 its back): lit on the key's side,
 *               darker into the back.
 *   SolidType   a word or line as an extruded solid: N copies stepped back along `dir` (the screen direction its back
 *               recedes in, per px of depth: the camera's angle on it), the front face in its material, a lit bevel on
 *               the key's edges. Turning the camera is turning `dir`: the side you see swings across, which is what
 *               makes it read as a thing in space rather than a flat logo.
 *   Studio      a seamless sweep (wall into floor with no hard horizon) lit by a soft key behind the subject: a key
 *               pool on the wall, a pool on the floor, a falloff to the corners. Every field is a baked, dithered
 *               plate (fx/Gradients bakePlate), placed by transform, so a slow dark ramp never bands.
 *   FloorShadow the contact shadow where a thing meets the floor: tight and dark at the contact line, a wide soft
 *               penumbra round it.
 *   Reflection  its children mirrored about a baseline onto a glossy floor, fading with distance from the contact.
 *
 * Numbers are px at 1080 lines (scale by the scene's u). Pure: every part a closed form of its props (any frame, any
 * order); the only cache is the baked plates'.
 */
import React from 'react';
import { Img } from 'remotion';
import { mixColor, toOklch } from '../../lib/color';
import { withAlpha } from '../../lib/handover';
import { clamp } from '../../lib/anim';
import { bakePlate } from '../Gradients';
import { clipText } from '../HueSweep';
import type { Declares } from '../../timeline';

export type MaterialKind = 'lacquer' | 'metal' | 'matte';
/** What surrounds the solid (its reflections and its bounce): a dark stage or a white sweep. */
export type Env = 'dark' | 'light';

/** How each material takes the key (shares of the face, alphas 0..1). */
export const MATERIAL = {
  // deep glossy colour: a lit crown, a soft horizon in the reflection, one sharp white band and a broad soft one
  lacquer: { crown: 0.3, horizon: 0.5, hDrop: 0.22, deep: 0.42, band: 0.85, bandW: 0.035, soft: 0.28, softW: 0.2, bevel: 0.75, side: 0.5 },
  // polished metal: a hard horizon (bright sky above, dark ground below, a bounce near the foot), a wide white band
  metal: { crown: 0.55, horizon: 0.47, hDrop: 0.55, deep: 0.62, band: 0.95, bandW: 0.06, soft: 0.35, softW: 0.26, bevel: 0.9, side: 0.62 },
  // matte ceramic: no band, a broad soft falloff away from the key
  matte: { crown: 0.16, horizon: 0.6, hDrop: 0.08, deep: 0.22, band: 0, bandW: 0, soft: 0.12, softW: 0.4, bevel: 0.45, side: 0.36 },
} as const;

const WHITE = '#FFFFFF';
const BLACK = '#000000';
const pct = (v: number) => `${(clamp(v, -2, 3) * 100).toFixed(2)}%`;

/**
 * The front face in a material: CSS background layers, top layer first. `sweep` 0..1 places the highlight band across
 * the face (it may run past both ends: -0.3..1.3 to enter and leave); `angle` is the band's slant in degrees (house 104:
 * nearly upright, leaning with a key from the upper left); `light` scales every highlight (0 with the key off).
 */
export const faceFill = (kind: MaterialKind, base: string, sweep: number, o: { angle?: number; light?: number; env?: Env; pad?: readonly [number, number] } = {}) => {
  const m = MATERIAL[kind];
  const L = clamp(o.light ?? 1, 0, 1.5);
  const ang = o.angle ?? 104;
  // a glossy face reflects its surroundings: a dark stage puts black below its horizon, a white sweep only a soft grey
  const k = o.env === 'light' ? 0.38 : 1;
  const crown = mixColor(base, WHITE, m.crown * L * (o.env === 'light' ? 1.15 : 1));
  const deep = mixColor(base, BLACK, m.deep * k);
  const below = mixColor(base, BLACK, Math.min(0.85, (m.deep + m.hDrop) * k));
  const bounce = mixColor(base, WHITE, m.crown * (o.env === 'light' ? 0.8 : 0.35) * L);
  const layers: string[] = [];
  if (m.band > 0) {
    const a = m.band * Math.min(1, L);
    layers.push(
      `linear-gradient(${ang}deg, ${withAlpha(WHITE, 0)} ${pct(sweep - m.bandW)}, ${withAlpha(WHITE, a)} ${pct(sweep)}, ${withAlpha(WHITE, 0)} ${pct(sweep + m.bandW * 0.6)})`,
    );
  }
  if (m.soft > 0) {
    const s = sweep - 0.08;
    layers.push(`linear-gradient(${ang}deg, ${withAlpha(WHITE, 0)} ${pct(s - m.softW)}, ${withAlpha(WHITE, m.soft * Math.min(1, L))} ${pct(s)}, ${withAlpha(WHITE, 0)} ${pct(s + m.softW)})`);
  }
  // the body: lit crown, the reflected horizon (a step for metal, a soft knee for lacquer), the deep foot, the bounce;
  // on type padded for its descenders (pad: ems above and below its line box) the stops stay on the line box
  const h = m.horizon;
  const knee = kind === 'metal' ? 0.004 : kind === 'lacquer' ? 0.06 : 0.25;
  const [pa, pb] = o.pad ?? [0, 0];
  const v = (q: number) => pct((pa + q) / (1 + pa + pb));
  layers.push(
    `linear-gradient(180deg, ${crown} ${v(0)}, ${mixColor(crown, deep, 0.55)} ${v(h - knee)}, ${below} ${v(h + knee)}, ${deep} ${v(0.82)}, ${bounce} ${v(1)})`,
  );
  return layers.join(', ');
};

/** A solid's side at depth share d (0 its front edge, 1 its back): lit near the face, darker into the back (a white
 * sweep bounces light into the sides: they stay lighter there). */
export const sideTone = (kind: MaterialKind, base: string, d: number, lit = 0.5, env: Env = 'dark') => {
  const m = MATERIAL[kind];
  const k = env === 'light' ? 0.55 : 1;
  const front = mixColor(base, BLACK, m.side * k * (1 - 0.55 * clamp(lit)));
  return mixColor(front, BLACK, (env === 'light' ? 0.28 : 0.45) * Math.pow(clamp(d), 0.8));
};

export type SolidTypeProps = {
  text: string;
  size: number; // font size, px
  family: string;
  weight?: number; // house 650
  track?: number; // em, house -0.045
  /** the face's colour (the brand's accent, its ink or its white) */
  base: string;
  kind?: MaterialKind;
  /** how deep the solid is, px (house 0.17 x size) */
  depth: number;
  /** the screen direction its back recedes in (unit-ish; [0.8, -0.15]: the camera left of it and a little above) */
  dir: readonly [number, number];
  /** 0..1 where the key's band crosses the face */
  sweep: number;
  /** 0..1.5 the key's strength (0: the lights are off, only the shape's dark mass) */
  light?: number;
  /** which way the key comes from, screen degrees (0 right, -90 top; house -125: upper left): the bevel's lit side */
  keyAngle?: number;
  x: number; // the line's left edge and baseline-box top, px
  y: number;
  /** the side's light: 0 the side faces away from the key, 1 into it (house: from dir and keyAngle) */
  sideLit?: number;
  /** what surrounds it (house dark) */
  env?: Env;
};

/**
 * Type as an extruded solid. Draws the back first (copies stepped back along `dir`, one per 2 px of depth, at most 40,
 * each a shade further into occlusion), then a lit bevel on the edges that face the key (a light copy offset toward
 * the key), then the face in its material.
 */
export const SolidType: React.FC<SolidTypeProps> = (p) => {
  const kind = p.kind ?? 'lacquer';
  const weight = p.weight ?? 650;
  const track = p.track ?? -0.045;
  const n = Math.max(2, Math.min(40, Math.round(p.depth / 2)));
  const L = clamp(p.light ?? 1, 0, 1.5);
  const key = p.keyAngle ?? -125;
  const kr = (key * Math.PI) / 180;
  // the side faces the key when the back recedes away from it (dir against the key's direction)
  const lit = p.sideLit ?? clamp(0.5 - 0.5 * (p.dir[0] * Math.cos(kr) + p.dir[1] * Math.sin(kr)));
  const text: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    whiteSpace: 'pre',
    fontFamily: p.family,
    fontSize: p.size,
    fontWeight: weight,
    letterSpacing: `${track}em`,
    lineHeight: 1,
    fontVariationSettings: '"opsz" 32',
  };
  const copies = [];
  for (let i = n; i >= 1; i--) {
    const d = i / n;
    const ox = p.dir[0] * p.depth * d;
    const oy = p.dir[1] * p.depth * d;
    const c = mixColor(sideTone(kind, p.base, d, lit, p.env), BLACK, 0.55 * (1 - Math.min(1, L)));
    copies.push(
      <div key={i} style={{ ...text, color: c, transform: `translate(${(p.x + ox).toFixed(2)}px, ${(p.y + oy).toFixed(2)}px)` }}>
        {p.text}
      </div>,
    );
  }
  const faceBase = mixColor(p.base, BLACK, 0.5 * (1 - Math.min(1, L)));
  // the bevel: a lit copy of the face peeking out on the key's side, 1.2 px at 1080 per 100 px of type (an offset
  // copy, never a text stroke: a stroke draws a variable font's overlapping contours inside the glyphs)
  const bevelA = MATERIAL[kind].bevel * Math.min(1, L);
  const bw = Math.max(1, p.size / 160);
  const bx = Math.cos(kr) * bw;
  const by = Math.sin(kr) * bw;
  return (
    <>
      {copies}
      {bevelA > 0.01 ? (
        <div style={{ ...text, color: mixColor(p.base, WHITE, 0.25 + 0.6 * bevelA), transform: `translate(${(p.x + bx).toFixed(2)}px, ${(p.y + by).toFixed(2)}px)` }}>{p.text}</div>
      ) : null}
      <div style={{ ...text, ...clipText(faceFill(kind, faceBase, p.sweep, { light: L, env: p.env, pad: [0.18, 0.32] })), transform: `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)` }}>
        {p.text}
      </div>
    </>
  );
};

export type StudioProps = {
  W: number;
  H: number;
  /** the wall's colour at the key (a dark stage: the ink toward the accent; a light one: the paper) */
  base: string;
  /** the light's colour (house: the accent toward white) */
  light: string;
  tone: 'dark' | 'light';
  /** where the wall turns into the floor, share of the frame's height (house 0.66) */
  horizon?: number;
  /** the key pool on the wall, behind the subject: centre (shares) and radius (share of W) */
  pool?: { x: number; y: number; r: number };
  /** 0..1.5 the key's strength (lights coming on: drive it) */
  on?: number;
  /** the whole set's transform (a camera on the studio: a scale about the frame's centre and a shift, px) */
  scale?: number;
  dx?: number;
  dy?: number;
};

/**
 * A seamless studio sweep lit by one soft key behind the subject. The wall darkens up and out from the key pool, the
 * floor catches a wide pool under the subject and darkens toward the lens, the join is a soft knee (no horizon line),
 * and the corners fall off. Baked plates (dithered): no banding on the slow dark ramps.
 */
export const Studio: React.FC<StudioProps> = (p) => {
  const hz = p.horizon ?? 0.66;
  const on = clamp(p.on ?? 1, 0, 1.5);
  const pool = p.pool ?? { x: 0.5, y: 0.46, r: 0.42 };
  const dark = p.tone === 'dark';
  const [lb] = toOklch(p.base);
  // a light studio stays clean: a whisper of falloff (a grey vignette reads as dirt on a white sweep)
  const top = dark ? mixColor(p.base, BLACK, 0.62) : mixColor(p.base, BLACK, 0.035);
  const wall = dark ? mixColor(p.base, BLACK, 0.3) : p.base;
  const knee = dark ? mixColor(p.base, p.light, 0.1 * on) : mixColor(p.base, WHITE, 0.55);
  const floorNear = dark ? mixColor(p.base, BLACK, 0.72) : mixColor(p.base, BLACK, lb > 0.9 ? 0.05 : 0.08);
  // the sweep: one vertical plate (wall, knee, floor), baked small and stretched (a vertical ramp has no horizontal detail)
  const sweep = bakePlate(
    'linear',
    [
      { at: 0, color: top },
      { at: hz * 0.72, color: wall },
      { at: hz, color: knee },
      { at: Math.min(0.98, hz + 0.1), color: mixColor(knee, floorNear, 0.45) },
      { at: 1, color: floorNear },
    ],
    8,
    540,
    { vertical: true, seed: 11 },
  );
  const keyPool = bakePlate(
    'radial',
    [
      { at: 0, color: mixColor(p.light, WHITE, dark ? 0.35 : 0.7), alpha: dark ? 0.62 : 0.5 },
      { at: 0.22, color: mixColor(p.light, WHITE, dark ? 0 : 0.5), alpha: dark ? 0.36 : 0.26 },
      { at: 0.55, color: p.light, alpha: dark ? 0.12 : 0.06 },
      { at: 1, color: p.light, alpha: 0 },
    ],
    384,
    256,
    { seed: 12 },
  );
  const floorPool = bakePlate(
    'radial',
    [
      { at: 0, color: mixColor(p.light, WHITE, 0.2), alpha: dark ? 0.4 : 0.35 },
      { at: 0.4, color: p.light, alpha: dark ? 0.14 : 0.1 },
      { at: 1, color: p.light, alpha: 0 },
    ],
    384,
    96,
    { seed: 13 },
  );
  const vignette = bakePlate(
    'radial',
    [
      { at: 0, color: BLACK, alpha: 0 },
      { at: 0.62, color: BLACK, alpha: 0 },
      { at: 1, color: BLACK, alpha: dark ? 0.55 : 0.05 },
    ],
    320,
    180,
    { seed: 14 },
  );
  const s = p.scale ?? 1;
  const set: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: p.W,
    height: p.H,
    transformOrigin: `${p.W / 2}px ${p.H / 2}px`,
    transform: `translate(${(p.dx ?? 0).toFixed(2)}px, ${(p.dy ?? 0).toFixed(2)}px) scale(${s.toFixed(5)})`,
  };
  const pw = pool.r * 2 * p.W;
  const ph = pw * (2 / 3);
  const fw = pw * 1.5;
  const fh = fw * 0.25;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: floorNear }}>
      {/* the set is a little bigger than the frame so a camera move never shows its edge */}
      <div style={set}>
        {sweep ? <Img src={sweep} style={{ position: 'absolute', left: -p.W * 0.25, top: -p.H * 0.25, width: p.W * 1.5, height: p.H * 1.5 }} /> : null}
        {keyPool ? <Img src={keyPool} style={{ position: 'absolute', left: pool.x * p.W - pw / 2, top: pool.y * p.H - ph / 2, width: pw, height: ph, opacity: Math.min(1, on) }} /> : null}
        {floorPool ? <Img src={floorPool} style={{ position: 'absolute', left: pool.x * p.W - fw / 2, top: hz * p.H + p.H * 0.04 - fh / 2, width: fw, height: fh, opacity: Math.min(1, on) }} /> : null}
      </div>
      {vignette ? <Img src={vignette} style={{ position: 'absolute', left: 0, top: 0, width: p.W, height: p.H }} /> : null}
    </div>
  );
};

/** The contact shadow where a thing of width w meets the floor at (x, y): a tight dark line in a wide soft penumbra. */
export const FloorShadow: React.FC<{ x: number; y: number; w: number; ink: string; strength?: number }> = ({ x, y, w, ink, strength = 1 }) => {
  const a = clamp(strength, 0, 1.5);
  return (
    <>
      <div style={{ position: 'absolute', left: x - w * 0.56, top: y - w * 0.035, width: w * 1.12, height: w * 0.07, borderRadius: '50%', background: `radial-gradient(closest-side, ${withAlpha(ink, 0.32 * a)}, ${withAlpha(ink, 0)})` }} />
      <div style={{ position: 'absolute', left: x - w * 0.5, top: y - 3, width: w, height: 6, borderRadius: 3, background: `radial-gradient(closest-side, ${withAlpha(ink, 0.7 * a)}, ${withAlpha(ink, 0)})` }} />
    </>
  );
};

/**
 * Its children mirrored about the line y = `baseline` (frame px) onto a glossy floor: the reflection fades from
 * `strength` at the contact to nothing `reach` px below it, and is a little soft (a real floor is never a mirror).
 */
export const Reflection: React.FC<{ baseline: number; reach: number; strength?: number; blur?: number; children: React.ReactNode }> = ({ baseline, reach, strength = 0.22, blur = 2, children }) => {
  const mask = `linear-gradient(180deg, rgba(0,0,0,${strength.toFixed(3)}) ${baseline}px, rgba(0,0,0,0) ${baseline + reach}px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `0 ${baseline}px`, transform: 'scaleY(-1)', filter: blur > 0 ? `blur(${blur}px)` : undefined }}>{children}</div>
    </div>
  );
};

export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
