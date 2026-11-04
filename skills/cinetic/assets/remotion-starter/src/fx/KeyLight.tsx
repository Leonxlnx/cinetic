import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { mixRgb, oklch as lchColor, toOklch } from '../lib/color';
import { type FilmCtx, fpsOf } from '../lib/film';
import { C } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * Key light: the default light of a film. One directional key (a sun, a high window) at an elevation
 * and an azimuth that are functions of the frame; every raised thing casts a shadow on the floor and
 * sits on a contact shadow; faces turned toward the key are lighter, faces turned away darker, all in
 * one hue. A light event changes what the viewer can see: the noon lift (the key climbs from a raking
 * 8 degrees to 72 in about 1.2 s, every shadow shrinks, and the one element that keeps rising keeps
 * the only long shadow), a raking key swinging across a panel (shadows sweep and every relief shows),
 * a sun arc over a whole film. Never a radial blob behind the subject or the lockup.
 *
 * Geometry is closed form: shadow offset = height x cot(elevation), along the floor, away from the
 * key. Cast shadows of all blocks go into ONE path (overlaps never darken twice) inside one group at a
 * fixed opacity with a fixed penumbra blur (a sun's penumbra is about 1.5 px at film scale; the blur
 * radius is a prop, never animated). Contact shadows are a second group (fixed blur). Optionally the
 * shadow path masks a baked one-hue shadow plate (scripts/dither-gradient.py kind "shadow"), so the
 * shadow tone can vary across the floor without banding.
 *
 * Coordinates: the floor is laid out like a screen (x right, y down, px at 1080p); height z comes up
 * out of the floor. Azimuth is the compass direction the key comes FROM on that floor: 0 from the top
 * of the layout, 90 from the right, 180 from the viewer's side, 270 from the left. The house key is
 * 34 degrees up from the upper left (azimuth 315): shadows fall down and to the right, 1.48 x height.
 *
 * Three ways to draw with it:
 *   - <ReliefScene>: extruded blocks (a product's interface cast as a shallow relief, day blocks on a
 *     floor, wells cut into a slab: negative height) seen through a perspective or orthographic camera,
 *     faces shaded, shadows cast, HTML content mapped onto top faces (matrix3d homography).
 *   - <FloatShadow>: the cast and contact shadow of one flat element (a card, a chip) lifted z px above
 *     a top-down layout, for UI films that stay 2D.
 *   - projectOnWall(): a point light throwing an object's silhouette on a wall (scale and softness
 *     grow as the object nears the light) for a shadow-play film.
 */

const rad = (d: number) => (d * Math.PI) / 180;
export type Pt = [number, number];
export type V3 = [number, number, number];

/** House numbers of the key light. */
export const KEY = {
  elevation: 34, // degrees above the floor
  azimuth: 315, // from the upper left
  rake: [3, 15] as const, // a raking key: elevation band, degrees
  noon: { from: 8, to: 72, durS: 1.2 }, // the noon lift
  shadowAlpha: [0.14, 0.18, 0.24] as const, // [low, house, high] opacity of the one shadow group (ink or plate)
  penumbraPx: 1.5, // fixed blur of the shadow group at 1080p (a sun); 4-10 for a large soft key
  contact: { grow: 3, blur: 5, alpha: 0.32 }, // contact shadow: footprint grown px, fixed blur, opacity
  face: { ambient: 0.62, k: 0.72 }, // face shade: overlay = k x (1 - (a + (1 - a) max(0, n.l))); a face turned away sits ~0.12 L below a lit one
  litDL: 0.08, // a face turned to the key, OKLCH L above the floor tone (one hue)
  awayDL: -0.1, // a face turned away
} as const;

// ------------------------------------------------------------------------------------------ key state

export type KeyState = { elevation: number; azimuth: number; intensity: number };

/** A change of the key over time. Frames are whole-frame starts with fractional durations (film frames). */
export type KeyEvent =
  | { kind: 'noon'; at: number; dur?: number; from?: number; to?: number; ease?: Ease } // elevation lift (house 8 -> 72 over 1.2 s)
  | { kind: 'rake'; at: number; dur: number; fromAz?: number; toAz: number; elevation?: number; ease?: Ease } // azimuth swing, optional low elevation
  | { kind: 'arc'; at: number; dur: number; azimuth?: [number, number]; elevation?: [number, number, number] } // a sun crossing: azimuth from -> to, elevation low -> high -> low
  | { kind: 'move'; at: number; dur: number; elevation?: number; azimuth?: number; intensity?: number; ease?: Ease }; // any channel to a value

export type KeyLightProps = {
  elevation?: number; // the key before any event (house 34)
  azimuth?: number; // house 315
  intensity?: number; // 0..1, scales face shading and the shadow opacity (house 1)
  events?: KeyEvent[];
  seam?: { at: number; id?: string }; // a light event that carries a cut: declared as a `light` seam
};

const wrapAz = (a: number) => ((a % 360) + 360) % 360;
/** Shortest-path azimuth mix (degrees). */
const mixAz = (a: number, b: number, t: number) => {
  let d = wrapAz(b) - wrapAz(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return wrapAz(a + d * t);
};

/** The progress of an event at frame f: 0 before `at`, 1 after `at + dur` (fractional frames). */
const evT = (f: number, at: number, dur: number, ease: Ease) => (dur <= 0 ? (f >= at ? 1 : 0) : ease(clamp((f - at) / dur)));

/**
 * The key at frame f. Events fold in order of their start: each one blends from the key the earlier
 * events give at this same frame toward its own target, so overlapping events stay continuous. Pure.
 * The noon lift's default length is KEY.noon.durS at the film's fps.
 */
export const keyLightState = (frame: number, p: KeyLightProps = {}, film?: Partial<FilmCtx>): KeyState => {
  let el = p.elevation ?? KEY.elevation;
  let az = p.azimuth ?? KEY.azimuth;
  let it = p.intensity ?? 1;
  const evs = [...(p.events ?? [])].sort((a, b) => a.at - b.at);
  for (const e of evs) {
    if (frame < e.at) break;
    if (e.kind === 'noon') {
      const dur = e.dur ?? KEY.noon.durS * fpsOf(film);
      const t = evT(frame, e.at, dur, e.ease ?? E.strongInOut);
      el = mix(e.from ?? KEY.noon.from, e.to ?? KEY.noon.to, t);
    } else if (e.kind === 'rake') {
      const t = evT(frame, e.at, e.dur, e.ease ?? E.strongInOut);
      az = mixAz(e.fromAz ?? az, e.toAz, t);
      if (e.elevation !== undefined) el = mix(el, e.elevation, Math.min(1, t * 4));
    } else if (e.kind === 'arc') {
      const t = clamp((frame - e.at) / Math.max(1e-6, e.dur));
      const [a0, a1] = e.azimuth ?? [260, 100];
      const [e0, e1, e2] = e.elevation ?? [6, 62, 6];
      az = mixAz(a0, a1, t); // the sun's own angular speed is near constant: linear
      const s = Math.sin(Math.PI * t); // height of the arc
      el = t < 0.5 ? mix(e0, e1, s) : mix(e2, e1, s);
    } else {
      const t = evT(frame, e.at, e.dur, e.ease ?? E.strongInOut);
      if (e.elevation !== undefined) el = mix(el, e.elevation, t);
      if (e.azimuth !== undefined) az = mixAz(az, e.azimuth, t);
      if (e.intensity !== undefined) it = mix(it, e.intensity, t);
    }
  }
  return { elevation: clamp(el, 0.5, 90), azimuth: wrapAz(az), intensity: clamp(it, 0, 1) };
};

/** The frames of each event: start and end (for sound cues and the cut a light event carries). */
export const keyLightFrames = (p: KeyLightProps = {}, film?: Partial<FilmCtx>) =>
  (p.events ?? []).map((e) => {
    const dur = e.kind === 'noon' ? (e.dur ?? KEY.noon.durS * fpsOf(film)) : e.dur;
    return { kind: e.kind, at: e.at, end: e.at + dur };
  });

/** cot of an angle in degrees (elevation clamped to 0.5-90 so a key on the horizon stays finite). */
export const cotDeg = (deg: number) => 1 / Math.tan(rad(clamp(deg, 0.5, 90)));
/** Shadow length on the floor of something `h` px high under a key at `elevation` degrees. */
export const shadowLength = (h: number, elevation: number) => h * cotDeg(elevation);
/** Unit vector from the floor toward the key (x right, y down the layout, z up). */
export const towardKey = (k: Pick<KeyState, 'elevation' | 'azimuth'>): V3 => {
  const e = rad(k.elevation);
  const a = rad(k.azimuth);
  return [Math.cos(e) * Math.sin(a), -Math.cos(e) * Math.cos(a), Math.sin(e)];
};
/** Unit floor direction shadows fall in (away from the key). */
export const shadowDir = (k: Pick<KeyState, 'azimuth'>): Pt => {
  const a = rad(k.azimuth);
  return [-Math.sin(a), Math.cos(a)];
};
/** Floor offset of the shadow of a point `h` px above the floor. */
export const shadowOffset = (h: number, k: Pick<KeyState, 'elevation' | 'azimuth'>): Pt => {
  const d = shadowDir(k);
  const L = shadowLength(h, k.elevation);
  return [d[0] * L, d[1] * L];
};

/** Matte face shade: the opacity of an ink overlay on a face with outward normal n (unit) under the key. */
export const faceShade = (n: V3, k: KeyState, o: { ambient?: number; k?: number } = {}) => {
  const a = o.ambient ?? KEY.face.ambient;
  const kk = (o.k ?? KEY.face.k) * k.intensity;
  const l = towardKey(k);
  const nl = Math.max(0, n[0] * l[0] + n[1] * l[1] + n[2] * l[2]);
  return clamp(kk * (1 - (a + (1 - a) * nl)));
};
/** The floor's own shade (normal up): a low sun darkens the floor and every top face together. */
export const floorShade = (k: KeyState, o: { ambient?: number; k?: number } = {}) => faceShade([0, 0, 1], k, o);

/** A shadow tone in the ground's own hue: OKLCH L lowered by `dL`, chroma kept (x1.1, capped .13). */
export const shadowTone = (ground: string, dL = 0.16) => {
  const [L, Cc, h] = toOklch(ground);
  return lchColor(clamp(L - dL, 0.02, 1), Math.min(0.13, Cc * 1.1), h);
};
/** The faces of a block in one hue: [top, lit side, away side] from its base colour (KEY.litDL / awayDL). */
export const faceTones = (base: string) => {
  const [L, Cc, h] = toOklch(base);
  return [base, lchColor(clamp(L + KEY.litDL), Cc, h), lchColor(clamp(L + KEY.awayDL), Cc, h)] as const;
};

// ------------------------------------------------------------------------------------------ geometry

/** Convex hull, Andrew's monotone chain (one orientation for every hull, so one path unions them). */
export const hull = (pts: Pt[]): Pt[] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};

/** A rect footprint as a polygon, optionally with rounded corners (`seg` points per corner). */
export const rectFoot = (x: number, y: number, w: number, h: number, r = 0, seg = 5): Pt[] => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rr <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const out: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= seg; i++) {
      const a = rad(a0 + (90 * i) / seg);
      out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  corner(x + w - rr, y + rr, -90);
  corner(x + w - rr, y + h - rr, 0);
  corner(x + rr, y + h - rr, 90);
  corner(x + rr, y + rr, 180);
  return out;
};

/** A polygon grown outward by `d` px about its centroid-free offset (good for convex footprints). */
export const growFoot = (foot: Pt[], d: number): Pt[] => {
  if (!d) return foot;
  const cx = foot.reduce((s, q) => s + q[0], 0) / foot.length;
  const cy = foot.reduce((s, q) => s + q[1], 0) / foot.length;
  return foot.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const L = Math.hypot(dx, dy) || 1;
    return [x + (dx / L) * d, y + (dy / L) * d];
  });
};

/**
 * The floor shadow of a footprint raised from z to z + h under the key: the hull of the footprint
 * moved by z cot(e) and by (z + h) cot(e) along the shadow direction (a block standing on the floor
 * has z = 0). Convex footprints are exact; a concave one gets its hull.
 */
export const castShadow = (foot: Pt[], h: number, k: Pick<KeyState, 'elevation' | 'azimuth'>, z = 0): Pt[] => {
  const a = shadowOffset(z, k);
  const b = shadowOffset(z + Math.max(0, h), k);
  return hull([...foot.map(([x, y]): Pt => [x + a[0], y + a[1]]), ...foot.map(([x, y]): Pt => [x + b[0], y + b[1]])]);
};

/**
 * The exact floor shadow of a prism with ANY footprint (concave, a glyph, a logo part): the footprint
 * swept along the shadow offset = the footprint moved by z cot(e), the footprint moved by (z + h) cot(e),
 * and one quad per edge between them. Returned as polygons for one nonzero path (each oriented the same
 * way, so the union fills once). Holes in the footprint are filled (a short shadow inside a hole is rare
 * and reads as contact shade).
 */
export const sweepShadow = (foot: Pt[], h: number, k: Pick<KeyState, 'elevation' | 'azimuth'>, z = 0): Pt[][] => {
  const a = shadowOffset(z, k);
  const b = shadowOffset(z + Math.max(0, h), k);
  const A = foot.map(([x, y]): Pt => [x + a[0], y + a[1]]);
  const B = foot.map(([x, y]): Pt => [x + b[0], y + b[1]]);
  const out: Pt[][] = [A, B];
  for (let i = 0; i < foot.length; i++) {
    const j = (i + 1) % foot.length;
    out.push([A[i], A[j], B[j], B[i]]);
  }
  return out;
};

/** True when a polygon is convex (all turns one way). */
export const isConvex = (q: Pt[]) => {
  let sign = 0;
  for (let i = 0; i < q.length; i++) {
    const [ax, ay] = q[i];
    const [bx, by] = q[(i + 1) % q.length];
    const [cx, cy] = q[(i + 2) % q.length];
    const z = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (Math.abs(z) < 1e-9) continue;
    if (!sign) sign = Math.sign(z);
    else if (Math.sign(z) !== sign) return false;
  }
  return true;
};

/** Polygons as one SVG path (subpaths share one orientation: fill-rule nonzero unions them). */
export const polyPath = (polys: Pt[][], dp = 2) =>
  polys
    .filter((q) => q.length >= 3)
    .map((q) => 'M' + q.map(([x, y]) => `${x.toFixed(dp)} ${y.toFixed(dp)}`).join('L') + 'Z')
    .join('');

/** Signed area (screen coords): used to keep every subpath in one orientation. */
const area = (q: Pt[]) => q.reduce((s, p, i) => s + p[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * p[1], 0) / 2;
const orient = (q: Pt[]) => (area(q) < 0 ? [...q].reverse() : q);

// --------------------------------------------------------------------------------------- the camera

/**
 * A camera over the floor: it looks at `target` (floor px) from `dist` px away, `pitch` degrees above
 * the floor (90 = straight down), turned `yaw` degrees about the vertical (0 = from the viewer's side
 * of the layout), with a pinhole of `focal` px (or orthographic: `ortho`, scale focal / dist).
 */
export type ReliefCamera = {
  width: number;
  height: number;
  target?: Pt; // floor point at the frame centre (default the frame centre)
  dist?: number; // px (house 2.2 x frame height)
  pitch?: number; // degrees above the floor (house 58: a high three-quarter view)
  yaw?: number; // degrees
  focal?: number; // px (house = dist: the target plane at scale 1)
  ortho?: boolean;
  centre?: Pt; // where the target lands on screen (default the frame centre)
  roll?: number; // degrees, screen roll about the centre
};

export type Projected = { x: number; y: number; depth: number; scale: number };

/** The projection of a camera: floor point (x, y, z) -> screen px, depth along the view, local scale. */
export const reliefProjector = (cam: ReliefCamera) => {
  const W = cam.width;
  const H = cam.height;
  const T = cam.target ?? [W / 2, H / 2];
  const D = cam.dist ?? 2.2 * H;
  const pitch = rad(clamp(cam.pitch ?? 58, 1, 90));
  const yaw = rad(cam.yaw ?? 0);
  const focal = cam.focal ?? D;
  const [cx, cy] = cam.centre ?? [W / 2, H / 2];
  const hz: V3 = [Math.sin(yaw), Math.cos(yaw), 0];
  const C3: V3 = [T[0] + D * Math.cos(pitch) * hz[0], T[1] + D * Math.cos(pitch) * hz[1], D * Math.sin(pitch)];
  const f: V3 = [(T[0] - C3[0]) / D, (T[1] - C3[1]) / D, -C3[2] / D];
  const r: V3 = [Math.cos(yaw), -Math.sin(yaw), 0];
  const u: V3 = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  const ro = rad(cam.roll ?? 0);
  const cr = Math.cos(ro);
  const sr = Math.sin(ro);
  const proj = (p: V3): Projected => {
    const d: V3 = [p[0] - C3[0], p[1] - C3[1], p[2] - C3[2]];
    const xc = d[0] * r[0] + d[1] * r[1] + d[2] * r[2];
    const yc = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
    const zc = Math.max(1e-3, d[0] * f[0] + d[1] * f[1] + d[2] * f[2]);
    const s = cam.ortho ? focal / D : focal / zc;
    const X = xc * s;
    const Y = -yc * s;
    return { x: cx + X * cr - Y * sr, y: cy + X * sr + Y * cr, depth: zc, scale: s };
  };
  return { proj, eye: C3, forward: f };
};

/**
 * A CSS matrix3d that maps a w x h box (transform-origin 0 0) onto a screen quad [tl, tr, br, bl]:
 * the exact projective map, so HTML laid out flat lands on a face seen in perspective.
 */
export const quadMatrix = (w: number, h: number, q: [Pt, Pt, Pt, Pt]) => {
  // unit square -> quad (Heckbert), then pre-scale by 1/w, 1/h
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  let g = 0;
  let hh = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den;
    hh = (dx1 * sy - sx * dy1) / den;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + hh * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + hh * y3;
  const ff = y0;
  const A = a / w;
  const B = b / h;
  const D2 = d / w;
  const E2 = e / h;
  const G = g / w;
  const Hh = hh / h;
  const n = (v: number) => (Math.abs(v) < 1e-12 ? 0 : +v.toPrecision(10));
  return `matrix3d(${[A, D2, 0, G, B, E2, 0, Hh, 0, 0, 1, 0, c, ff, 0, 1].map(n).join(',')})`;
};

// ---------------------------------------------------------------------------------------- the relief

/**
 * One extruded unit: a floor footprint (polygon, or `rect`) raised `h` px (negative: a well sunk into
 * the floor, rect footprints only), optionally lifted `z` px off the floor. Colours are the top face and
 * the side base (faces are shaded from it in one hue); `content` places HTML on the top face.
 */
export type ReliefBlock = {
  id?: string;
  foot?: Pt[];
  rect?: { x: number; y: number; w: number; h: number; r?: number };
  h: number;
  z?: number;
  top?: string;
  side?: string;
  shadow?: boolean; // casts a shadow (house true)
  contact?: boolean; // sits on a contact shadow (house true when z = 0)
  content?: { w: number; h: number; node: React.ReactNode }; // a w x h HTML box mapped onto the top face (rect blocks)
};

export type ReliefFace = { block: number; kind: 'top' | 'side' | 'wall' | 'floor'; pts: Pt[]; n: V3; shade: number; fill: string; depth: number };
export type ReliefDraw = {
  order: number[]; // block indices back to front
  faces: ReliefFace[][]; // per block (same index as the input), back to front inside the block
  shadow: string; // ONE screen-space path: every cast shadow and every well's inner shadow
  contact: string; // contact shadows (screen space)
  quads: (null | [Pt, Pt, Pt, Pt])[]; // the top face (a well: its floor) of rect blocks, for content
  topShade: number[]; // the shade of that face (the content gets the same overlay)
  clips: (null | string)[]; // a well's opening (screen path): the well draws inside it
  topShadows: (null | { path: string; clip: string })[]; // taller blocks' shadows falling on this block's top face (screen), clipped to it
  floorShade: number;
};

const footOf = (b: ReliefBlock): Pt[] => {
  if (b.foot) return b.foot;
  const r = b.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  return rectFoot(r.x, r.y, r.w, r.h, r.r ?? 0);
};

/** Shadow inside a rect well of depth d: the strips of its floor the opening does not let the key reach. */
export const wellShadow = (r: { x: number; y: number; w: number; h: number }, d: number, k: Pick<KeyState, 'elevation' | 'azimuth'>): Pt[][] => {
  const [ox, oy] = shadowOffset(d, k); // the lit patch is the opening moved by the shadow offset
  const out: Pt[][] = [];
  const x0 = r.x;
  const x1 = r.x + r.w;
  const y0 = r.y;
  const y1 = r.y + r.h;
  const sx = clamp(Math.abs(ox), 0, r.w);
  const sy = clamp(Math.abs(oy), 0, r.h);
  if (sx > 0.01) out.push(ox > 0 ? [[x0, y0], [x0 + sx, y0], [x0 + sx, y1], [x0, y1]] : [[x1 - sx, y0], [x1, y0], [x1, y1], [x1 - sx, y1]]);
  if (sy > 0.01) {
    const xa = ox > 0 ? x0 + sx : x0;
    const xb = ox > 0 ? x1 : x1 - sx;
    if (xb - xa > 0.01) out.push(oy > 0 ? [[xa, y0], [xb, y0], [xb, y0 + sy], [xa, y0 + sy]] : [[xa, y1 - sy], [xb, y1 - sy], [xb, y1], [xa, y1]]);
  }
  return out;
};

/**
 * Everything a relief draws at one frame, in screen space: faces with their shade, the one shadow
 * path, contact shadows, top-face quads. Pure (no DOM): curve tests and audits read it.
 * Footprints are walked clockwise on screen (y down); outward edge normal = (ey, -ex) / |e|.
 */
export const reliefState = (blocks: ReliefBlock[], cam: ReliefCamera, k: KeyState, o: { ambient?: number; k?: number; ink?: string; contactGrow?: number } = {}): ReliefDraw => {
  const { proj, eye } = reliefProjector(cam);
  const ink = o.ink ?? C.ink;
  const P = (x: number, y: number, z: number): Pt => {
    const q = proj([x, y, z]);
    return [q.x, q.y];
  };
  const shadeOf = (n: V3) => faceShade(n, k, o);
  const shadowPolys: Pt[][] = [];
  const contactPolys: Pt[][] = [];
  const faces: ReliefFace[][] = [];
  const quads: (null | [Pt, Pt, Pt, Pt])[] = [];
  const topShade: number[] = [];
  const clips: (null | string)[] = [];
  const depthOf: number[] = [];
  blocks.forEach((b, bi) => {
    const foot = orient(footOf(b));
    const z0 = b.z ?? 0;
    const cx = foot.reduce((s, q) => s + q[0], 0) / foot.length;
    const cy = foot.reduce((s, q) => s + q[1], 0) / foot.length;
    depthOf[bi] = proj([cx, cy, z0 + b.h / 2]).depth;
    const top = b.top ?? C.mist;
    const side = b.side ?? top;
    const list: ReliefFace[] = [];
    const tsh = shadeOf([0, 0, 1]);
    topShade[bi] = tsh;
    if (b.h >= 0) {
      const zt = z0 + b.h;
      if (b.shadow !== false && zt > 0) {
        if (isConvex(foot)) shadowPolys.push(castShadow(foot, b.h, k, z0).map(([x, y]) => P(x, y, 0)));
        else for (const q of sweepShadow(foot, b.h, k, z0)) shadowPolys.push(q.map(([x, y]) => P(x, y, 0)));
      }
      if (b.contact !== false && z0 === 0) contactPolys.push(growFoot(foot, o.contactGrow ?? KEY.contact.grow).map(([x, y]) => P(x, y, 0)));
      for (let i = 0; i < foot.length; i++) {
        const a = foot[i];
        const c = foot[(i + 1) % foot.length];
        const ex = c[0] - a[0];
        const ey = c[1] - a[1];
        const L = Math.hypot(ex, ey);
        if (L < 1e-6 || b.h <= 0) continue;
        const n: V3 = [ey / L, -ex / L, 0];
        const mx = (a[0] + c[0]) / 2;
        const my = (a[1] + c[1]) / 2;
        if (n[0] * (eye[0] - mx) + n[1] * (eye[1] - my) <= 0) continue; // faces away from the eye
        const sh = shadeOf(n);
        list.push({ block: bi, kind: 'side', pts: [P(a[0], a[1], z0), P(c[0], c[1], z0), P(c[0], c[1], zt), P(a[0], a[1], zt)], n, shade: sh, fill: mixRgb(side, ink, sh), depth: proj([mx, my, (z0 + zt) / 2]).depth });
      }
      list.sort((p, q) => q.depth - p.depth);
      list.push({ block: bi, kind: 'top', pts: foot.map(([x, y]) => P(x, y, zt)), n: [0, 0, 1], shade: tsh, fill: mixRgb(top, ink, tsh), depth: depthOf[bi] });
      const r = b.rect;
      quads[bi] = r ? [P(r.x, r.y, zt), P(r.x + r.w, r.y, zt), P(r.x + r.w, r.y + r.h, zt), P(r.x, r.y + r.h, zt)] : null;
      clips[bi] = null;
    } else {
      // a well cut into the floor: its floor at h, the inner walls that face the eye, the inner shadow
      const r = b.rect ?? { x: 0, y: 0, w: 0, h: 0 };
      const d = -b.h;
      const cs: Pt[] = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
      const fpts = cs.map(([x, y]) => P(x, y, -d));
      list.push({ block: bi, kind: 'floor', pts: fpts, n: [0, 0, 1], shade: tsh, fill: mixRgb(top, ink, tsh), depth: depthOf[bi] });
      const walls: ReliefFace[] = [];
      for (let i = 0; i < 4; i++) {
        const a = cs[i];
        const c = cs[(i + 1) % 4];
        const ex = c[0] - a[0];
        const ey = c[1] - a[1];
        const L = Math.hypot(ex, ey);
        const n: V3 = [-ey / L, ex / L, 0]; // a wall faces into the well
        const mx = (a[0] + c[0]) / 2;
        const my = (a[1] + c[1]) / 2;
        if (n[0] * (eye[0] - mx) + n[1] * (eye[1] - my) <= 0) continue;
        const sh = shadeOf(n);
        walls.push({ block: bi, kind: 'wall', pts: [P(a[0], a[1], 0), P(c[0], c[1], 0), P(c[0], c[1], -d), P(a[0], a[1], -d)], n, shade: sh, fill: mixRgb(side, ink, sh), depth: proj([mx, my, -d / 2]).depth });
      }
      walls.sort((p, q) => q.depth - p.depth);
      list.push(...walls);
      for (const s of wellShadow(r, d, k)) shadowPolys.push(s.map(([x, y]) => P(x, y, -d)));
      quads[bi] = [fpts[0], fpts[1], fpts[2], fpts[3]];
      clips[bi] = polyPath([cs.map(([x, y]) => P(x, y, 0))]);
    }
    faces[bi] = list;
  });
  // shadows falling on lower tops: the part of each taller block above this top's height, cast onto that plane
  const feet = blocks.map((b) => orient(footOf(b)));
  const bbox = (q: Pt[]) => q.reduce((m, [x, y]) => [Math.min(m[0], x), Math.min(m[1], y), Math.max(m[2], x), Math.max(m[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
  const boxes = feet.map(bbox);
  const topShadows: ReliefDraw['topShadows'] = blocks.map((b, bi) => {
    if (b.h <= 0 || (b.z ?? 0) !== 0) return null;
    const hb = b.h;
    const polysOn: Pt[][] = [];
    blocks.forEach((a, ai) => {
      if (ai === bi || a.shadow === false || a.h <= 0) return;
      const ha = (a.z ?? 0) + a.h;
      if (ha <= hb + 0.01) return;
      const z0 = Math.max(0, (a.z ?? 0) - hb);
      const len = shadowLength(ha - hb, k.elevation);
      const [x0, y0, x1, y1] = boxes[ai];
      const [u0, v0, u1, v1] = boxes[bi];
      if (x1 + len < u0 || x0 - len > u1 || y1 + len < v0 || y0 - len > v1) return;
      const polys = isConvex(feet[ai]) ? [castShadow(feet[ai], ha - hb - z0, k, z0)] : sweepShadow(feet[ai], ha - hb - z0, k, z0);
      for (const q of polys) polysOn.push(orient(q.map(([x, y]) => P(x, y, hb))));
    });
    if (!polysOn.length) return null;
    return { path: polyPath(polysOn), clip: polyPath([feet[bi].map(([x, y]) => P(x, y, hb))]) };
  });
  const order = blocks.map((_, i) => i).sort((a, b) => depthOf[b] - depthOf[a]);
  return { order, faces, shadow: polyPath(shadowPolys.map(orient)), contact: polyPath(contactPolys.map(orient)), quads, topShade, clips, topShadows, floorShade: floorShade(k, o) };
};

export type ReliefSceneProps = {
  blocks: ReliefBlock[];
  camera: ReliefCamera;
  keyLight: KeyState;
  floor?: string | null; // floor colour (null: transparent, the scene sits on your own ground)
  floorPlate?: string; // a baked floor plate (URL) drawn instead of the flat floor colour
  ink?: string; // shade and shadow colour (house C.ink)
  shadowAlpha?: number; // house KEY.shadowAlpha[1]
  penumbra?: number; // fixed blur of the shadow group, px (house 1.5)
  shadowPlate?: string; // a baked one-hue shadow plate (URL): the shadow path masks it instead of an ink fill
  contact?: false | { blur?: number; alpha?: number };
  shadeFloor?: boolean; // darken the floor with a low key, like the top faces (house true)
  ambient?: number; // face shade ambient (house KEY.face.ambient)
  id?: string; // unique per scene in a frame (filter, mask and clip ids)
};

/**
 * Draws a relief: floor, contact shadows, the one shadow group, then each block (its faces back to
 * front and its HTML top content) in depth order. The blur radii are fixed props, never animated.
 */
export const ReliefScene: React.FC<ReliefSceneProps> = (scene) => {
  const p = scene;
  const { width: W, height: H } = p.camera;
  const id = p.id ?? 'relief';
  const ink = p.ink ?? C.ink;
  const d = reliefState(p.blocks, p.camera, p.keyLight, { ink, ambient: p.ambient });
  const shA = (p.shadowAlpha ?? KEY.shadowAlpha[1]) * p.keyLight.intensity;
  const penumbraPx = scene.penumbra ?? KEY.penumbraPx;
  const contactSpec = scene.contact === false ? null : { blur: scene.contact?.blur ?? KEY.contact.blur, alpha: scene.contact?.alpha ?? KEY.contact.alpha };
  const ct = contactSpec;
  const full: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'visible' };
  const pts = (q: Pt[]) => q.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={full}>
        <defs>
          <filter id={`${id}-pen`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={penumbraPx} />
          </filter>
          {ct && (
            <filter id={`${id}-ct`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={contactSpec!.blur} />
            </filter>
          )}
          {p.shadowPlate && (
            <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
              <path d={d.shadow} fill="#FFFFFF" filter={`url(#${id}-pen)`} />
            </mask>
          )}
        </defs>
        {p.floorPlate ? <image href={p.floorPlate} x={0} y={0} width={W} height={H} preserveAspectRatio="none" /> : p.floor ? <rect x={0} y={0} width={W} height={H} fill={p.floor} /> : null}
        {p.shadeFloor !== false && d.floorShade > 0.001 && (p.floor || p.floorPlate) && <rect x={0} y={0} width={W} height={H} fill={ink} opacity={d.floorShade} />}
        {ct && d.contact && <path d={d.contact} fill={ink} opacity={ct.alpha} filter={`url(#${id}-ct)`} />}
        {p.shadowPlate ? (
          <image href={p.shadowPlate} x={0} y={0} width={W} height={H} preserveAspectRatio="none" mask={`url(#${id}-mask)`} opacity={clamp(shA / KEY.shadowAlpha[1])} />
        ) : (
          <g opacity={shA} filter={`url(#${id}-pen)`}>
            <path d={d.shadow} fill={ink} />
          </g>
        )}
      </svg>
      {d.order.map((bi) => {
        const b = p.blocks[bi];
        const q = d.quads[bi];
        const clip = d.clips[bi];
        const content = b.content && q && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: b.content.w, height: b.content.h, transformOrigin: '0 0', transform: quadMatrix(b.content.w, b.content.h, q) }}>
            {b.content.node}
            {d.topShade[bi] > 0.001 && <div style={{ position: 'absolute', inset: 0, background: ink, opacity: d.topShade[bi] }} />}
          </div>
        );
        if (clip)
          // a well: its floor, its content, then its walls, all inside the opening
          return (
            <div key={`${b.id ?? ''}#${bi}`} style={{ ...full, clipPath: `path('${clip}')` }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={full}>
                <polygon points={pts(d.faces[bi][0].pts)} fill={d.faces[bi][0].fill} />
              </svg>
              {content}
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={full}>
                {d.faces[bi].slice(1).map((fc, j) => (
                  <polygon key={j} points={pts(fc.pts)} fill={fc.fill} />
                ))}
              </svg>
            </div>
          );
        const ts = d.topShadows[bi];
        return (
          <React.Fragment key={`${b.id ?? ''}#${bi}`}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={full}>
              {d.faces[bi].map((fc, j) => (
                <polygon key={j} points={pts(fc.pts)} fill={fc.fill} />
              ))}
            </svg>
            {content}
            {ts && (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={full}>
                <defs>
                  <clipPath id={`${id}-top-${bi}`}>
                    <path d={ts.clip} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${id}-top-${bi})`}>
                  <g opacity={shA} filter={`url(#${id}-pen)`}>
                    <path d={ts.path} fill={ink} />
                  </g>
                </g>
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------------- one lifted flat element

/**
 * The shadow of one flat element (a card, a chip) lifted `z` px above a top-down layout: the box's
 * footprint moved z cot(e) away from the key, with a penumbra that grows with the lift (a soft key),
 * plus a contact shadow while it is near the floor. Screen = floor (no camera).
 */
export const floatShadowState = (box: { x: number; y: number; w: number; h: number; r?: number }, z: number, k: KeyState, o: { soft?: number; thick?: number } = {}) => {
  const foot = rectFoot(box.x, box.y, box.w, box.h, box.r ?? 0);
  const poly = castShadow(foot, o.thick ?? 0, k, Math.max(0, z));
  const soft = o.soft ?? 0.06; // penumbra per px of lift (an area key); 0 = a sun
  const blur = KEY.penumbraPx + soft * shadowLength(Math.max(0, z), k.elevation);
  const contact = clamp(1 - z / 24); // contact fades over the first 24 px of lift
  return { poly, path: polyPath([orient(poly)]), blur, contact, offset: shadowOffset(Math.max(0, z), k) };
};

/**
 * A lifted element's shadow, drawn under it. The blur is chosen from two fixed ladder radii by the lift
 * (each a static filter; their opacities cross-fade), so no blur radius is animated.
 */
export const FloatShadow: React.FC<{
  box: { x: number; y: number; w: number; h: number; r?: number };
  z: number;
  keyLight: KeyState;
  width: number;
  height: number;
  ink?: string;
  alpha?: number;
  soft?: number;
  levels?: [number, number]; // the two fixed blur radii (px) the penumbra cross-fades between (house 2, 12)
  id?: string;
}> = (shadowProps) => {
  const p = shadowProps;
  const s = floatShadowState(p.box, p.z, p.keyLight, { soft: p.soft });
  const ink = p.ink ?? C.ink;
  const [blurLo, blurHi] = shadowProps.levels ?? [2, 12];
  const [l0, l1] = [blurLo, blurHi];
  const w = clamp((s.blur - l0) / (l1 - l0));
  const a = (p.alpha ?? KEY.shadowAlpha[1]) * p.keyLight.intensity;
  const id = p.id ?? 'float';
  const ct = growFoot(rectFoot(p.box.x, p.box.y, p.box.w, p.box.h, p.box.r ?? 0), KEY.contact.grow);
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <filter id={`${id}-a`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blurLo} />
        </filter>
        <filter id={`${id}-b`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blurHi} />
        </filter>
      </defs>
      {s.contact > 0 && <path d={polyPath([orient(ct)])} fill={ink} opacity={KEY.contact.alpha * s.contact} filter={`url(#${id}-a)`} />}
      <path d={s.path} fill={ink} opacity={a * (1 - w)} filter={`url(#${id}-a)`} />
      {w > 0.001 && <path d={s.path} fill={ink} opacity={a * w} filter={`url(#${id}-b)`} />}
    </svg>
  );
};

// ---------------------------------------------------------------------------- a point light on a wall

/**
 * Shadow play: a point light at `light` (x, y on the wall's plane, z px in front of it) throws the
 * silhouette of points that sit `z` px in front of the wall. Returns the wall points, the shadow's scale
 * (light distance / (light distance - object distance)) and its softness for a light of `radius` px.
 */
export const projectOnWall = (pts: V3[], light: V3, radius = 20) => {
  const out: Pt[] = pts.map(([x, y, z]) => {
    const t = light[2] / Math.max(1e-3, light[2] - z);
    return [light[0] + (x - light[0]) * t, light[1] + (y - light[1]) * t];
  });
  const zMean = pts.reduce((s, q) => s + q[2], 0) / Math.max(1, pts.length);
  const scale = light[2] / Math.max(1e-3, light[2] - zMean);
  const blur = (radius * zMean) / Math.max(1e-3, light[2] - zMean);
  return { pts: out, scale, blur };
};

// ------------------------------------------------------------------------------------- declarations

/** A light event that carries a cut is a `light` seam; otherwise the key declares nothing (all continuous). */
export const declares = (p?: Partial<KeyLightProps>, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p?.seam) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.seam.at, kind: 'light', id: p.seam.id ?? 'keyLight' }] };
};
