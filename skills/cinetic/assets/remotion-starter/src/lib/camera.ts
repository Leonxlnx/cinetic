// The anchor camera: one transform on one world container. A shot says "world point (ax, ay)
// sits at screen point (sx, sy) at scale k", which is how a director thinks about framing, and
// shots chain without drift: lc(lc(A, B, t1), C, t2). Anchors lerp linearly, k in log space.
import type React from 'react';
import { clamp, E, type Ease, lmix, mix } from './anim';
import { f60, f60x, type FilmCtx, fpsOf, sizeOf } from './film';

export type Shot = {
  ax: number; // world point that is framed ...
  ay: number;
  sx: number; // ... at this screen point
  sy: number;
  k: number; // scale (world px -> screen px)
  yaw?: number; // deg, rotateY: each act gets its own axis
  pitch?: number; // deg, rotateX (tilt)
  roll?: number; // deg, rotateZ: rigid in screen space, keep <= 11
};

/** Blend two shots. Scale in log space so a zoom has constant perceived speed. */
export const lc = (A: Shot, B: Shot, t: number): Shot => ({
  ax: mix(A.ax, B.ax, t),
  ay: mix(A.ay, B.ay, t),
  sx: mix(A.sx, B.sx, t),
  sy: mix(A.sy, B.sy, t),
  k: lmix(A.k, B.k, t),
  yaw: mix(A.yaw ?? 0, B.yaw ?? 0, t),
  pitch: mix(A.pitch ?? 0, B.pitch ?? 0, t),
  roll: mix(A.roll ?? 0, B.roll ?? 0, t),
});

/**
 * Style for the world container (lay the world out at left:0, top:0 in world px). All translation
 * lives inside this one matrix: fractional left/top next to a transform snaps to whole pixels and
 * slow drifts stair-step. Roll sits outside the tilt so type is never sheared into faux italics.
 */
export const camera = (s: Shot, perspective = 2400): React.CSSProperties => {
  const rot =
    s.yaw || s.pitch || s.roll
      ? ` perspective(${perspective}px) rotateZ(${s.roll ?? 0}deg) rotateX(${s.pitch ?? 0}deg) rotateY(${s.yaw ?? 0}deg)`
      : '';
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: '0 0',
    transform: `translate(${s.sx}px, ${s.sy}px)${rot} scale(${Math.max(1e-4, s.k)}) translate(${-s.ax}px, ${-s.ay}px)`,
  };
};

/**
 * Screen position of a world point under a flat shot (no yaw/pitch/roll): where to draw an overlay
 * that tracks the product (a cursor, the story device, a caption pinned to a row), every frame.
 */
export const toScreen = (s: Shot, p: { x: number; y: number }) => ({
  x: s.sx + (p.x - s.ax) * s.k,
  y: s.sy + (p.y - s.ay) * s.k,
});

/**
 * Push-in "breath" inside a hold: multiply k by it (amount 0.025 = +2.5%). Released by the next move.
 * Deprecated: lib/handoff.ts creep(f, from, { pctPerSec }) is the same linear push in film time, at any fps.
 */
export const breath = (t: number, amount = 0.025) => 1 + amount * t;

/** Zoom-out hop during a whip (t = the whip's 0..1 progress): multiply k by it. */
export const dip = (t: number, depth = 0.18) => 1 - depth * Math.sin(Math.PI * t) ** 2;

/** Log-scale speed of a zoom (ln k per frame) from frame f - 1 to f. At a cut: zoomSpeed(kOut, cut - 1). */
export const zoomSpeed = (k: (f: number) => number, f: number) => Math.log(Math.max(1e-6, k(f)) / Math.max(1e-6, k(f - 1)));

/**
 * Velocity handoff for any carried quantity (x, y, log scale, roll): the incoming shot starts offset
 * by `from` and moving at `v0` (units per film frame, the outgoing move's speed on the cut frame),
 * and the offset decays exponentially (time constant settle / 5) to exactly 0, with zero speed, at
 * `settle` film frames. Add `d` to the incoming shot's value at t = frames since the cut (0 on its
 * first frame). A cut at peak speed then reads as one move; an incoming shot that starts at rest
 * reads as a stall. Defaults at the film's fps: settle 30 f at 60 fps. lib/handoff.ts handoffShot()
 * applies it to a whole Shot.
 */
export const handoff = (t: number, v0: number, settle?: number, fps: number = fpsOf()) => {
  const T = Math.max(1, settle ?? f60(30, fps));
  const a = 5; // window length in time constants
  const tau = T / a;
  const ea = Math.exp(-a);
  const s = clamp(t / T);
  // exponential decay minus its tangent at T, so position and velocity both reach 0 at t = T
  const d = (-v0 * tau * (Math.exp(-a * s) - ea * (1 + a - a * s))) / (1 - ea);
  const v = (v0 * (Math.exp(-a * s) - ea)) / (1 - ea);
  const from = (-v0 * tau * (1 - ea * (1 + a))) / (1 - ea);
  return { d, v: t >= T ? 0 : v, from };
};

/**
 * Velocity handoff for a zoom-through cut: handoff() on log scale. The incoming shot keeps zooming at
 * the outgoing move's log-scale speed `v0` (zoomSpeed at the cut), then comes to rest at `settle`.
 * Multiply the incoming shot's k by `.k` at t = frames since the cut (0 on its first frame); `.from`
 * is where it starts (= exp(-0.193·v0·settle)), so lengthen `settle` for a bigger entry, shorten it
 * for less. Defaults at 60 fps: settle 30 f. An exit of 1 -> 1.2 on E.in over 12 f, cut on its 12th
 * frame (v0 = 0.047), starts the entry at 0.76x: the 0.75 -> 1 entry of references/transitions.md
 * §4.8, with no speed step at the cut.
 */
export const zoomHandoff = (t: number, v0: number, settle?: number, fps: number = fpsOf()) => {
  const h = handoff(t, v0, settle, fps);
  return { k: Math.exp(h.d), v: h.v, from: Math.exp(h.from) };
};

/**
 * One move of a camera path (camPath): from frame `at`, over `frames`, on `ease`, the shot travels by these
 * amounts. zoom is a scale ratio (0.48 = pull out to 48 %, 1.57 = push in), applied in log space; pan moves the
 * framed screen point (sx, sy) in px, look moves the framed world point (ax, ay) in world px; roll, yaw and pitch
 * add degrees. A cut-at-peak whip is a move on E.launchIn whose last frame is the cut.
 */
export type CamMove = {
  at: number;
  frames: number;
  ease?: Ease; // house E.strongInOut (a reframe); E.launchIn into a cut; E.glideOut out of one
  zoom?: number;
  pan?: { x?: number; y?: number };
  look?: { x?: number; y?: number };
  roll?: number;
  yaw?: number;
  pitch?: number;
};

/**
 * The camera as the animator: one layout under one shot per frame, the shot = `base` plus every move's share of
 * its amounts at frame f. Moves add, so a move that starts before the previous one ends takes over without a hold
 * (their speeds add through the overlap): chain a slide-in's settle into a pull-back, a rise's drift into a
 * zoom-out, a push into a whip-out, the next move starting on the frame the last one slows. Pure, any frame order.
 */
export const camPath = (f: number, base: Shot, moves: readonly CamMove[]): Shot => {
  let lnk = Math.log(Math.max(1e-6, base.k));
  const s: Shot = { ...base, yaw: base.yaw ?? 0, pitch: base.pitch ?? 0, roll: base.roll ?? 0 };
  for (const m of moves) {
    const t = (m.ease ?? E.strongInOut)(clamp((f - m.at) / Math.max(1, m.frames)));
    if (m.zoom !== undefined) lnk += Math.log(Math.max(1e-6, m.zoom)) * t;
    s.sx += (m.pan?.x ?? 0) * t;
    s.sy += (m.pan?.y ?? 0) * t;
    s.ax += (m.look?.x ?? 0) * t;
    s.ay += (m.look?.y ?? 0) * t;
    s.roll = (s.roll ?? 0) + (m.roll ?? 0) * t;
    s.yaw = (s.yaw ?? 0) + (m.yaw ?? 0) * t;
    s.pitch = (s.pitch ?? 0) + (m.pitch ?? 0) * t;
  }
  s.k = Math.exp(lnk);
  return s;
};

/**
 * How fast the picture moves under a camera path at frame f (from f - 1 to f): the screen velocity (px per film
 * frame, film px) of the world point framed at `at` (default the centre of `film`'s frame; the timeline's size
 * without one), its speed and direction (deg, 0 = +x, 90 = down: DirBlur's `angle`), and the zoom speed (ln k per
 * frame). Feed speed / u to DirBlur for a camera smear on translation; pushes stay crisp.
 */
export const camVel = (f: number, base: Shot, moves: readonly CamMove[], atIn?: { x: number; y: number }, film?: Partial<FilmCtx>) => {
  const size = sizeOf(film);
  const at = atIn ?? { x: size.width / 2, y: size.height / 2 };
  const now = camPath(f, base, moves);
  const was = camPath(f - 1, base, moves);
  const p = { x: now.ax + (at.x - now.sx) / now.k, y: now.ay + (at.y - now.sy) / now.k }; // the world point under `at` now
  const q = toScreen(was, p);
  const vx = at.x - q.x;
  const vy = at.y - q.y;
  return { vx, vy, speed: Math.hypot(vx, vy), angle: (Math.atan2(vy, vx) * 180) / Math.PI, vk: Math.log(now.k / was.k) };
};

// ------------------------------------------------------------------------------------------------ 3D: the film's one turn

/**
 * The one 3D camera move of a UI film, as numbers: the camera turns once, on one axis (yaw: a vertical hinge; pitch:
 * a tabletop), 15-30 degrees in total, over 72-150 f at 60 fps (house 22 degrees over 108 f on E.strongInOut), landing
 * on a resting angle (house 4: nearly front-on for the read, or a lit tilt of 8-14) and creeping on after it. Under the
 * turn the layout's planes parallax for real: place them at a depth with place(x, y, z) inside camera3d().
 * Perspective 1800-2600 px (house 2200); roll stays within 11 degrees.
 */
export const CAM3D = { deg: [15, 30] as const, house: 22, rest: 4, frames60: [72, 150] as const, house60: 108, minAxis60: 48, otherMax: 6, perspective: 2200, perspectiveRange: [1800, 2600] as const, rollMax: 11, creep: 0.06, creep60: 600 } as const;

/**
 * camera() for a world with depth: the same anchor framing, with `transform-style: preserve-3d` and the scale applied
 * on all three axes (scale3d(k, k, k)), so children placed at a depth (place(x, y, z)) keep it under the camera's yaw
 * and pitch: near layers swing further than far ones and a push grows them faster. The turn pivots on the framed point.
 */
export const camera3d = (s: Shot, perspective: number = CAM3D.perspective): React.CSSProperties => {
  const k = Math.max(1e-4, s.k);
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: '0 0',
    transformStyle: 'preserve-3d',
    transform: `translate(${s.sx}px, ${s.sy}px) perspective(${perspective}px) rotateZ(${s.roll ?? 0}deg) rotateX(${s.pitch ?? 0}deg) rotateY(${s.yaw ?? 0}deg) scale3d(${k}, ${k}, ${k}) translate(${-s.ax}px, ${-s.ay}px)`,
  };
};

/**
 * Where an element sits in the world, by transform only: left and top stay 0 and the place is one translate3d (plus
 * any rotation or scale after it). Moving elements placed with fractional left/top snap to whole pixels at full size
 * and jump; a transform moves them by sub-pixels. z (px toward the viewer) only reads inside camera3d().
 */
export const place = (x: number, y: number, z = 0, after = ''): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, ${z.toFixed(3)}px)${after ? ` ${after}` : ''}`,
});

export type Swing3dOpts = {
  at: number; // first frame of the turn
  frames?: number; // film frames (house 108 at 60 fps)
  axis?: 'yaw' | 'pitch';
  from?: number; // deg the camera starts turned (house rest + 22)
  to?: number; // deg it lands on (house 4)
  ease?: Ease; // house E.strongInOut
  zoom?: number; // a push or pull riding the turn (ratio)
  pan?: { x?: number; y?: number };
  look?: { x?: number; y?: number };
  creep?: number | false; // share of the turn it keeps drifting on after landing (house 0.06 over 10 s)
  film?: Partial<FilmCtx>;
};

/**
 * The film's one turn as camera-path moves: `start` holds the starting angle to merge into the base shot, `moves` the
 * turn (with any zoom, pan and look riding it) and a slow creep that carries on in the same direction from 80 % of
 * the turn, so the landing never freezes.
 *   const sw = swing3d({ at: 30 });  const shot = camPath(f, { ...base, ...sw.start }, sw.moves);
 */
export const swing3d = (o: Swing3dOpts): { start: Pick<Shot, 'yaw' | 'pitch'>; moves: CamMove[] } => {
  const fps = fpsOf(o.film);
  const frames = o.frames ?? f60x(CAM3D.house60, fps);
  const axis = o.axis ?? 'yaw';
  const to = o.to ?? CAM3D.rest;
  const from = o.from ?? to + CAM3D.house;
  const turn = to - from;
  const moves: CamMove[] = [{ at: o.at, frames, ease: o.ease ?? E.strongInOut, [axis]: turn, ...(o.zoom !== undefined ? { zoom: o.zoom } : {}), ...(o.pan ? { pan: o.pan } : {}), ...(o.look ? { look: o.look } : {}) }];
  const creep = o.creep === undefined ? CAM3D.creep : o.creep;
  if (creep) moves.push({ at: o.at + frames * 0.8, frames: f60x(CAM3D.creep60, fps), ease: E.linear, [axis]: turn * creep });
  return { start: axis === 'yaw' ? { yaw: from } : { pitch: from }, moves };
};

/**
 * Checks a camera path against the one-turn rule: the range of yaw, pitch and roll over the moves' span; exactly one
 * axis turning 15-30 degrees (the other within 6), roll within 11, and the turning move at least 48 f at 60 fps long.
 * `issues` says what breaks the rule (empty when it holds).
 */
export const cam3dCheck = (base: Shot, moves: readonly CamMove[], film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const a = Math.min(...moves.map((m) => m.at), 0);
  const b = Math.max(...moves.map((m) => m.at + m.frames), 1);
  const ext = { yaw: [Infinity, -Infinity], pitch: [Infinity, -Infinity], roll: [Infinity, -Infinity] } as Record<'yaw' | 'pitch' | 'roll', number[]>;
  const n = Math.max(64, Math.ceil(b - a));
  for (let i = 0; i <= n; i++) {
    const s = camPath(a + ((b - a) * i) / n, base, moves);
    for (const ax of ['yaw', 'pitch', 'roll'] as const) {
      const v = s[ax] ?? 0;
      ext[ax][0] = Math.min(ext[ax][0], v);
      ext[ax][1] = Math.max(ext[ax][1], v);
    }
  }
  const yaw = ext.yaw[1] - ext.yaw[0];
  const pitch = ext.pitch[1] - ext.pitch[0];
  const roll = Math.max(Math.abs(ext.roll[0]), Math.abs(ext.roll[1]));
  const axis: 'yaw' | 'pitch' = yaw >= pitch ? 'yaw' : 'pitch';
  const deg = Math.max(yaw, pitch);
  const other = Math.min(yaw, pitch);
  // the turn's length is the move that turns most on the axis: swing3d's long, small creep is not the turn
  const turn = moves.reduce<CamMove | null>((best, m) => (Math.abs(m[axis] ?? 0) >= 1 && (!best || Math.abs(m[axis] ?? 0) > Math.abs(best[axis] ?? 0)) ? m : best), null);
  const issues: string[] = [];
  if (deg < CAM3D.deg[0]) issues.push(`the turn is ${deg.toFixed(1)} deg: a 3D move turns ${CAM3D.deg[0]}-${CAM3D.deg[1]}`);
  if (deg > CAM3D.deg[1]) issues.push(`the turn is ${deg.toFixed(1)} deg: more than ${CAM3D.deg[1]} reads as a spin, not a move through the layout`);
  if (other > CAM3D.otherMax) issues.push(`both axes turn (${yaw.toFixed(1)} yaw, ${pitch.toFixed(1)} pitch): one axis per move, the other within ${CAM3D.otherMax}`);
  if (roll > CAM3D.rollMax) issues.push(`roll ${roll.toFixed(1)} deg: keep it within ${CAM3D.rollMax}`);
  if (turn && turn.frames < f60x(CAM3D.minAxis60, fps)) issues.push(`the turn lasts ${turn.frames.toFixed(0)} f: at least ${CAM3D.minAxis60} f at 60 fps`);
  return { axis, deg, yaw, pitch, roll, issues, ok: issues.length === 0 };
};

/**
 * A depth layer's shot under the camera: weight w takes w of the camera's pan (sx, sy), look (ax, ay) and turn (yaw,
 * pitch) away from `base`, and zooms at w on log scale (base.k x (k / base.k)^w). w 1 rides the camera, 0 stays put,
 * above 1 is nearer than the subject. Roll stays rigid. fx/DepthStack (0.5 / 1 / 1.6) and fx/Grounds Planes
 * (bg 0.25 / mid 0.6 / fg 1) draw each plane through it.
 */
export const weighShot = (shot: Shot, base: Shot, w: number, extra: { yaw?: number; pitch?: number } = {}): Shot => ({
  ax: base.ax + (shot.ax - base.ax) * w,
  ay: base.ay + (shot.ay - base.ay) * w,
  sx: base.sx + (shot.sx - base.sx) * w,
  sy: base.sy + (shot.sy - base.sy) * w,
  k: base.k * Math.exp(w * Math.log(Math.max(1e-6, shot.k) / Math.max(1e-6, base.k))),
  yaw: (base.yaw ?? 0) + ((shot.yaw ?? 0) - (base.yaw ?? 0)) * w + (extra.yaw ?? 0),
  pitch: (base.pitch ?? 0) + ((shot.pitch ?? 0) - (base.pitch ?? 0)) * w + (extra.pitch ?? 0),
  roll: shot.roll ?? 0,
});
