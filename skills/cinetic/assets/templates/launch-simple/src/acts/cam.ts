// The scenes' camera: a 2D camera on each scene's stage (design px at 1080p), one purposeful move at a time: it starts,
// travels front-loaded and lands; the last move of a scene lands on the scene's end, so a hold is the decaying tail of
// that move (never a still frame, never a float or a drift back). Scale moves on a log scale. Pure: no React.
import { clamp, E, type Ease } from '../lib/anim';
import { H, W } from '../timeline';

/** The stage point (tx, ty) shown at the frame's centre, at scale s. */
export type Cam2 = { tx: number; ty: number; s: number };
export type CamKey = { f: number; c: Cam2; e?: Ease };
export type Box = { x: number; y: number; w: number; h: number };

export const REST: Cam2 = { tx: W / 2, ty: H / 2, s: 1 };
/** The camera at frame f along its keys (each key's ease shapes the move INTO it; house strongInOut). */
export const camAt = (keys: readonly CamKey[], f: number): Cam2 => {
  if (!keys.length) return REST;
  if (f <= keys[0].f) return keys[0].c;
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f < b.f) {
      const u = (b.e ?? E.strongInOut)(clamp((f - a.f) / Math.max(1e-6, b.f - a.f)));
      return { tx: a.c.tx + (b.c.tx - a.c.tx) * u, ty: a.c.ty + (b.c.ty - a.c.ty) * u, s: Math.exp(Math.log(a.c.s) + (Math.log(b.c.s) - Math.log(a.c.s)) * u) };
    }
  }
  return keys[keys.length - 1].c;
};
/**
 * A scene's last move as a hold that never stops: the move's own ease front-loads it, and `k` of the travel is spread
 * evenly to the scene's end, so the held result keeps travelling the same way (the decaying tail of the move, never a
 * still frame, never back). House k 0.3.
 */
export const holdEase = (e: Ease = E.glideOut, k = 0.3): Ease => (u) => (1 - k) * e(u) + k * u;
/** The camera creeping in from frame `from`: `pct` % of scale per 30 fps frame (a hold creep of 0.1-0.4 %/f). */
export const creep = (c: Cam2, f: number, from: number, fps: number, pct = 0.12): Cam2 => ({ ...c, s: c.s * (1 + pct / 100) ** Math.max(0, ((f - from) * 30) / fps) });
/** The box round two boxes. */
export const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
/** A stage box on screen under the camera. */
export const under = (c: Cam2, b: Box): Box => ({ x: (b.x - c.tx) * c.s + W / 2, y: (b.y - c.ty) * c.s + H / 2, w: b.w * c.s, h: b.h * c.s });
/** The CSS transform that films a stage (origin 0 0) through the camera. */
export const camCss = (c: Cam2) => `translate(${(W / 2).toFixed(2)}px, ${(H / 2).toFixed(2)}px) scale(${c.s.toFixed(5)}) translate(${(-c.tx).toFixed(2)}px, ${(-c.ty).toFixed(2)}px)`;
/** A camera that frames `b` at `fill` of the frame's height (or 84 % of its width), centred on it. */
export const frameBox = (b: Box, fill = 0.62, wide = 0.84): Cam2 => ({ tx: b.x + b.w / 2, ty: b.y + b.h / 2, s: Math.min((H * fill) / Math.max(1, b.h), (W * wide) / Math.max(1, b.w)) });
/** A camera speed check for the motion floor: how far a stage point moves on screen per frame at f (px). */
export const camSpeed = (keys: readonly CamKey[], f: number, p: { x: number; y: number } = { x: W / 2, y: H / 2 }) => {
  const a = camAt(keys, f);
  const b = camAt(keys, f + 1);
  const pa = { x: (p.x - a.tx) * a.s, y: (p.y - a.ty) * a.s };
  const pb = { x: (p.x - b.tx) * b.s, y: (p.y - b.ty) * b.s };
  return Math.hypot(pb.x - pa.x, pb.y - pa.y);
};
