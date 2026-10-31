// Speed carried through cuts, and moves that land. All closed form: every value is a pure
// function of the frame (fractional frames too), so sub-frames, scrubbing and any render order agree.
//
// A velocity-carried cut is two halves:
//   launch()  the outgoing move, accelerating INTO the cut: frames <= cut, the last one (the cut
//             frame) the fastest. Cut on it. x = 0 on the cut frame. Either sign: vCut < 0 moves left
//             or up, the mirror image of the same build.
//   carry()   a move that opens at speed v0 and decays in two stages, a fast first drop then a slow
//             tail, to rest (CARRY.residual60 0: a carried shot lands; a residual creep in the same
//             direction only when given, at most 0.2 px/f@60; with `settle`, to rest by a frame). x = 0 on its `start` frame; the step into start + 1
//             is v0. For an incoming shot, start = its FIRST frame (cut + 1): v0 is then the first
//             step a viewer sees in it, the speed the house ratio talks about (CARRY.ratio x the cut
//             step, 0.4-1.4). For a hold that continues a move without a cut, start = the hold's
//             first frame.
//   carriedCut(f, cut, out, in)   both halves on one continuous coordinate (the step across the cut,
//             which nobody sees, is `jump`, default v0).
// A whole shot between two cuts is shotMove(): it opens carried, comes to rest and
// launches into its own cut (the speeds add). carryChain() strings shots into one coordinate, each
// opening at a share of the previous cut's speed. carryShot() holds a camera alive after a move
// (x, y, log scale and roll each decay to a creep). A hold also keeps moving with creep() (scale)
// or drift() (px) and turns into its exit with intoCut(). handoffShot() carries a camera's x, y,
// log scale and roll through a cut (lib/camera.ts handoff()). overlapAt() and leadBy() time a
// secondary move against its primary.
//
// Speeds are px (or any unit) per FILM frame; shapes are written per 60 fps frame (`fpsRef`) and
// converted, so the same numbers give the same motion in seconds at 24, 25, 30 or 60 fps.
//
// Smear: a move fast enough to streak (SMEAR.threshold) is declared as camera blur on exactly those
// frames (fastRanges()), so the finishing pass smears it the way a shutter would; a hard mask edge
// that travels draws its own streak as a ramp `smearEdge()` px wide (a box-blurred step is a ramp).
import type { CameraBlurRange } from '../timeline';
import { CARRY, clamp, E, prog } from './anim';
import { handoff, type Shot } from './camera';
import { f60x, fpsOf } from './film';

/**
 * When a move smears, house numbers. Slow moves stay crisp in every film; above about 720 px/s at
 * 1080p (24 px a frame at 30 fps, 12 at 60) a camera move, a whip, a scroll into a cut or a slide out
 * of a flash carries a streak of about 0.3-0.5 of its per-frame travel. A travelling hard edge (a
 * push-wipe's edge, a door's seam) streaks 0.3 of its step.
 */
export const SMEAR = { threshold: 720, share: 0.3, pad: 1 } as const;

/**
 * The frames of a move fast enough to smear, as camera-blur ranges [from, to): every frame in
 * [from, to] whose speed (|speed(f)|, frame px per film frame: the step into f) is over `threshold`
 * (px/s at 1080p, house SMEAR.threshold, scaled by `u`), padded by `pad` frames each side (house 1:
 * the shutter opens a little before the peak) and merged. Declare them (CAMERA_BLUR or a primitive's
 * declares()) so a crisp film still renders its whips and flicks with a shutter.
 */
export const fastRanges = (
  speed: (f: number) => number,
  from: number,
  to: number,
  o: { threshold?: number; pad?: number; u?: number; fps?: number; id?: string } = {},
): CameraBlurRange[] => {
  const fps = o.fps ?? fpsOf();
  const per = ((o.threshold ?? SMEAR.threshold) * (o.u ?? 1)) / fps;
  const pad = Math.max(0, Math.round(o.pad ?? SMEAR.pad));
  const out: CameraBlurRange[] = [];
  const id = o.id ?? 'smear';
  for (let f = Math.ceil(from); f <= Math.floor(to); f++) {
    if (!(Math.abs(speed(f)) > per)) continue;
    const a = f - pad;
    const b = f + pad + 1;
    const last = out[out.length - 1];
    if (last && a <= last.to) last.to = Math.max(last.to, b);
    else out.push({ from: a, to: b, id: `${id}-${out.length}` });
  }
  return out;
};

/** The streak a hard edge draws at speed v (px per film frame): a ramp `share` x |v| wide (house SMEAR.share), never under `min` px (anti-aliasing). */
export const smearEdge = (v: number, o: { share?: number; min?: number } = {}) => Math.max(o.min ?? 1.5, (o.share ?? SMEAR.share) * Math.abs(v));

/** Position and speed of one half of a carried cut: x relative to the cut frame, v = the step into this frame. */
export type Carried = { x: number; v: number };

/**
 * The house build into a cut (60 fps frames): the step k frames before the cut is vCut * exp(-a * k^p).
 * The last frame grows the speed about x1.6 at 60 fps (x2.2 at 30), the frames before it x1.3-1.5
 * each, and the move rises from 1 % of the cut speed to the cut in about 20 frames at 60 fps (10 at 30).
 */
export const LAUNCH = { a: 0.47, p: 0.76 } as const;

export type LaunchOpts = {
  vCut: number; // speed (units per film frame) on the cut frame: the step into it, the fastest of the move
  /**
   * The shape, going back from the cut: the step k frames before it is vCut * exp(-a * s^p), with s = k in
   * 60 fps frames. p = 1 is a geometric build (a constant growth e^a a frame); p < 1 front-loads the
   * acceleration into the last frames before the cut. Default: the house LAUNCH profile; with `a` alone
   * p is 1, with `ratio` alone the build is geometric (a = ln ratio, p = 1).
   */
  a?: number;
  p?: number;
  ratio?: number; // a geometric build instead: growth of the step per 60 fps frame into the cut
  /** Explicit growth factors into the cut, oldest first (step[j+1] / step[j]); earlier frames repeat the first. Overrides a/p/ratio. */
  ratios?: number[];
  floor?: number; // the step's size never falls below this going back (units per film frame, in vCut's direction): a move already under way
  fpsRef?: number; // the frame rate a, ratio and floor are written at (default 60; ratios are per film frame)
  fps?: number; // the film's fps (default: the film context)
};

/**
 * The outgoing half: position relative to the cut frame (0 on it, negative before) and the step into
 * frame f (the step k frames before the cut is vCut * exp(-a * s^p), or the ratios walked back from
 * the cut). Frames after the cut continue at vCut (sub-frame samples of the cut frame never stall);
 * a fractional frame moves linearly inside its frame's step. Bounded work: the sum stops once the
 * steps are negligible, and a floor is added in closed form.
 */
export const launch = (f: number, cut: number, o: LaunchOpts): Carried => {
  const fps = o.fps ?? fpsOf();
  if (f >= cut) return { x: (f - cut) * o.vCut, v: o.vCut };
  // worked out on the speed's size, the direction put back at the end: a leftward or upward move
  // (vCut < 0) builds exactly like its mirror image
  if (o.vCut < 0) {
    const m = launch(f, cut, { ...o, vCut: -o.vCut, fps });
    return { x: -m.x, v: -m.v };
  }
  const ref = o.fpsRef ?? 60;
  const floor = (Math.abs(o.floor ?? 0) * ref) / fps;
  const r = o.ratios && o.ratios.length ? o.ratios : null;
  const house = o.a === undefined && o.ratio === undefined;
  const a = o.a ?? (o.ratio !== undefined ? Math.log(o.ratio) : LAUNCH.a);
  const p = o.p ?? (house ? LAUNCH.p : 1);
  let raw = o.vCut; // the ratios path walks back one frame per call, k = 0, 1, 2 ...
  const step = (k: number) => {
    if (r) {
      if (k > 0) raw /= r[r.length - k] ?? r[0];
      return Math.max(floor, raw);
    }
    return Math.max(floor, o.vCut * Math.exp(-a * ((k * ref) / fps) ** p));
  };
  const back = cut - f; // > 0
  const m = Math.floor(back);
  let x = 0;
  for (let k = 0; k < m; k++) {
    const s = step(k);
    if (!r && floor > 0 && s <= floor) return { x: x - floor * (back - k), v: floor }; // on the floor from here back
    if (floor === 0 && s < 1e-9) return { x, v: 0 }; // the move had not started this far back
    x -= s;
  }
  const v = step(m); // the step of the frame f sits in (from cut - m - 1 to cut - m)
  return { x: x - (back - m) * v, v };
};

export type CarryOpts = {
  v0?: number; // the first incoming step (units per film frame); default ratio * vCut
  vCut?: number; // the outgoing speed on the cut frame (with ratio, when v0 is not given)
  ratio?: number; // v0 / vCut (default CARRY.ratio house 0.7; 0.4-1.4 is the normal range)
  decay?: number; // the slow tail's decay per 60 fps frame (default 0.89; 0.78-0.93)
  fast?: { share: number; decay: number }; // the fast first drop: its share of (v0 - residual) and its decay per 60 fps frame (default 0.6, 0.4); share 0 = one stage
  residual?: number; // the creep it settles to, units per 60 fps frame, always in v0's direction (default 0: it lands at rest)
  /**
   * 60 fps frames after `cut` by which the move is at rest, so the camera can lock for a read: the move
   * eases out over the last `settleOver` frames (default 24, 0.4 s) and x stays put from then on.
   * Default: never (the residual drift lives on). House: lock 0.5-1 s on each type read.
   */
  settle?: number;
  settleOver?: number;
  fpsRef?: number; // the frame rate decay, fast.decay, residual and settle are written at (default 60)
  fps?: number;
};

/** The opening step of a carry: v0, else ratio (house CARRY.ratio 0.7) x vCut. */
export const carryV0 = (o: CarryOpts): number => o.v0 ?? (o.ratio ?? CARRY.ratio[1]) * (o.vCut ?? 0);

/**
 * A move that opens at speed v0 and decays in two stages to a living residual drift: position
 * relative to frame `cut` (0 on it) and the step into frame f, step(n) = res + (v0 - res) *
 * (share * fast^(n-1) + (1 - share) * slow^(n-1)), n = f - cut, so the step into cut + 1 is v0.
 * For an incoming shot pass its FIRST frame (the outgoing cut + 1; carriedCut() does it): v0 is
 * then the first step seen in the new shot. For a hold that continues a move, pass the hold's
 * first frame. Frames before `cut` continue at v0 backwards (sub-frame samples never stall).
 */
export const carry = (f: number, cut: number, o: CarryOpts): Carried => {
  const fps = o.fps ?? fpsOf();
  const ref = o.fpsRef ?? 60;
  const v0 = carryV0(o);
  // the drift continues the carried move: a leftward or upward carry settles drifting left or up
  const res = ((v0 < 0 ? -1 : 1) * Math.abs(o.residual ?? CARRY.residual60) * ref) / fps;
  const ds = clamp(o.decay ?? CARRY.decay60[1], 1e-6, 0.999999) ** (ref / fps);
  const share = clamp(o.fast?.share ?? CARRY.fast.share);
  const df = clamp(o.fast?.decay ?? CARRY.fast.decay60, 1e-6, 0.999999) ** (ref / fps);
  const amp = v0 - res;
  // sum over j = 1..n of d^(j-1) = (1 - d^n) / (1 - d), continuous in n
  const at = (n: number) => (n <= 0 ? n * v0 : n * res + amp * (share * (1 - df ** n) / (1 - df) + (1 - share) * (1 - ds ** n) / (1 - ds)));
  const n = f - cut;
  if (o.settle === undefined) {
    if (n <= 0) return { x: n * v0, v: v0 };
    return { x: at(n), v: res + amp * (share * df ** (n - 1) + (1 - share) * ds ** (n - 1)) };
  }
  // settle: the move's own clock runs down. Up to the ease it is n; over the last W frames its rate
  // falls linearly to 0 (the speed eases out with no step), then it stands still and so does x.
  const N = Math.max(0, (o.settle * fps) / ref);
  const W = Math.min(N, Math.max(1e-6, ((o.settleOver ?? 24) * fps) / ref));
  const clock = (m: number) => {
    if (m <= N - W) return m;
    const u = Math.min(m, N) - (N - W);
    return N - W + u - (u * u) / (2 * W);
  };
  const x = at(clock(n));
  return { x, v: x - at(clock(n - 1)) };
};

/** The incoming half of carriedCut(): carry() options plus the unseen step across the cut. */
export type CarriedCutIn = CarryOpts & {
  jump?: number; // the step from the cut frame to the incoming shot's first frame (default v0): it keeps x continuous, nobody sees it
};

/**
 * Both halves of a velocity-carried cut on one coordinate: launch() up to and including `cut` (the
 * fastest frame), then the incoming shot from cut + 1, whose first visible step (cut + 1 -> cut + 2)
 * is v0 = in.v0, or in.ratio (house 0.7) x the cut step, decaying to its residual drift. The incoming
 * half takes vCut and fps from `out` unless given. x = 0 on the cut frame.
 */
export const carriedCut = (f: number, cut: number, out: LaunchOpts, inn: CarriedCutIn = {}): Carried => {
  if (f <= cut) return launch(f, cut, out);
  const o: CarryOpts = { ...inn, vCut: inn.vCut ?? out.vCut, fps: inn.fps ?? out.fps };
  const jump = inn.jump ?? carryV0(o);
  if (f <= cut + 1) return { x: jump * (f - cut), v: jump };
  const c = carry(f, cut + 1, o);
  return { x: jump + c.x, v: c.v };
};

/** One shot between two cuts (see shotMove). */
export type ShotMoveOpts = {
  start: number; // the shot's first frame: x = 0 on it
  cut?: number; // its last frame, when it launches into a cut
  carry?: CarryOpts; // the speed it opens with (step into start + 1 = v0), decaying to its residual drift: the hold's life
  launch?: LaunchOpts; // the build into `cut`; leave its floor at 0 (the residual comes from carry)
  fps?: number; // default: the carry's or launch's fps, else the film context
};

/**
 * A shot that opens carried from the previous cut, lives on its residual drift and accelerates into
 * its own cut: carry() from `start` plus launch() into `cut`, the two speeds added, so the hold
 * between them never stops and the build grows out of the drift with no step in speed. x = 0 on
 * `start`; v = the step into frame f. Without `cut` (or `launch`) the shot holds on its drift.
 */
export const shotMove = (f: number, o: ShotMoveOpts): Carried => {
  const fps = o.fps ?? o.carry?.fps ?? o.launch?.fps ?? fpsOf();
  let x = 0;
  let v = 0;
  if (o.carry) {
    const c = carry(f, o.start, { ...o.carry, fps: o.carry.fps ?? fps });
    x += c.x;
    v += c.v;
  }
  if (o.launch && o.cut !== undefined) {
    const lo: LaunchOpts = { ...o.launch, fps: o.launch.fps ?? fps };
    const l = launch(f, o.cut, lo);
    x += l.x - launch(o.start, o.cut, lo).x;
    v += l.v;
  }
  return { x, v };
};

/** One shot of a carryChain(): its cut (none for the last), how it opens, how it builds into the cut. */
export type ChainShot = {
  cut?: number; // the shot's last frame (the next shot starts on cut + 1); omit on the last shot
  carry?: CarryOpts; // without v0 the shot opens at carry.ratio (house 0.7) x the previous shot's speed on its cut frame
  launch?: LaunchOpts; // the build into `cut`
  jump?: number; // the unseen step across the cut into this shot (default its v0)
};
export type ChainState = Carried & {
  shot: number; // index of the shot frame f belongs to (f <= its cut)
  start: number; // that shot's first frame
  local: number; // x inside that shot, 0 on its first frame: pan the shot's own world by it
};

/**
 * A chain of velocity-carried cuts on one continuous coordinate. Shot i runs from the frame after the
 * previous cut (`start` for the first) to its own cut; it opens at its carry's v0, or at carry.ratio
 * x the previous shot's speed on its cut frame (house 0.7), decays to its residual drift (the living
 * hold) and launches into its cut. Direction is kept: every speed is along +x. The last shot holds on
 * its drift (or builds into a final cut of its own).
 */
export const carryChain = (f: number, start: number, shots: ChainShot[], fps: number = fpsOf()): ChainState => {
  let X = 0; // continuous x on the current shot's first frame
  let s0 = start;
  let vPrev = 0; // speed on the previous cut frame
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    const c = sh.carry ? { ...sh.carry, fps: sh.carry.fps ?? fps, vCut: sh.carry.vCut ?? vPrev } : undefined;
    const mv: ShotMoveOpts = { start: s0, cut: sh.cut, carry: c, launch: sh.launch, fps };
    const last = i === shots.length - 1 || sh.cut === undefined;
    if (last || f <= (sh.cut as number)) {
      const m = shotMove(f, mv);
      return { x: X + m.x, v: m.v, shot: i, start: s0, local: m.x };
    }
    const end = shotMove(sh.cut as number, mv);
    vPrev = end.v;
    const nx = shots[i + 1];
    const v0n = nx.carry ? carryV0({ ...nx.carry, vCut: nx.carry.vCut ?? vPrev }) : 0;
    X += end.x + (nx.jump ?? v0n);
    s0 = (sh.cut as number) + 1;
  }
  return { x: X, v: 0, shot: shots.length - 1, start: s0, local: 0 }; // no shots
};

/** Per-channel carries of carryShot(): x and y in screen px, k as natural-log scale, roll in degrees. */
export type CarryShotOpts = { x?: CarryOpts; y?: CarryOpts; k?: CarryOpts; roll?: CarryOpts; fps?: number };

/**
 * A camera that keeps the momentum of the move before it while it holds: each channel decays from its
 * first step v0 to its residual drift, 0 on frame `from` (screen-space sx/sy in px, k multiplied by
 * exp of the log-scale channel, roll in degrees). The residuals are the hold's creep, so the frame
 * never freezes. Residuals of k and roll default to 0 (give them: px defaults make no sense there).
 */
export const carryShot = (base: Shot, f: number, from: number, o: CarryShotOpts): Shot => {
  const fps = o.fps ?? fpsOf();
  const d = (c: CarryOpts | undefined, unitless: boolean) => (c ? carry(f, from, { ...(unitless ? { residual: 0 } : {}), ...c, fps: c.fps ?? fps }).x : 0);
  return {
    ...base,
    sx: base.sx + d(o.x, false),
    sy: base.sy + d(o.y, false),
    k: base.k * Math.exp(d(o.k, true)),
    roll: (base.roll ?? 0) + d(o.roll, true),
  };
};

/**
 * Hold life from frame `from`: a scale multiplier 1 + pctPerSec * t ({ pctPerSec }, house 6 %/s,
 * range 2-15 %/s) or a drift in px ({ pxPerSec }, house 30 px/s at 1080p, range 6-90; multiply by
 * the film's U). Linear, so the first frame of the hold already moves. 1 (or 0 px) before `from`.
 */
export const creep = (f: number, from: number, o: { pctPerSec: number } | { pxPerSec: number } = { pctPerSec: 0.06 }, fps: number = fpsOf()): number => {
  const t = Math.max(0, f - from) / fps;
  return 'pxPerSec' in o ? o.pxPerSec * t : 1 + o.pctPerSec * t;
};

/** House counter-creep, scale per second: the subject in, its ground out (a statement card holding before a zoom-out). */
export const COUNTER_CREEP = { text: 0.02, ground: -0.016 } as const;

/**
 * Two layers creeping against each other on a hold: the subject (the line, the product) scales in while the ground
 * under it (the card, the grid) scales out, so the hold reads as depth, not a zoom. Scale multipliers from `from`
 * (house +2 %/s and -1.6 %/s); add intoCut() on top to turn both into the exit.
 */
export const counterCreep = (f: number, from: number, o: { text?: number; ground?: number } = {}, fps: number = fpsOf()) => ({
  text: creep(f, from, { pctPerSec: o.text ?? COUNTER_CREEP.text }, fps),
  ground: creep(f, from, { pctPerSec: o.ground ?? COUNTER_CREEP.ground }, fps),
});

/** The entrance that never stops: an expo tail (x0.938 a 60 fps frame) that keeps a residual drift (px per 60 fps frame at 1080p). */
export const TAIL = { decay60: 0.938, drift60: 0.06 } as const;

/**
 * An element arriving on an expo tail: `from` px away at `at`, the rest shrinking by TAIL.decay60 every 60 fps frame
 * (90 % home in about 36 f), with a residual drift of `drift` px a 60 fps frame (x u) that never stops, so a window
 * that has risen keeps rising a little into the next move. Returns the offset in px (from -> 0, then past it).
 */
export const expoTail = (f: number, at: number, from: number, o: { decay60?: number; drift60?: number; u?: number } = {}, fps: number = fpsOf()): number => {
  if (f < at) return from;
  const t = ((f - at) * 60) / fps;
  return from * (o.decay60 ?? TAIL.decay60) ** t - Math.sign(from || 1) * (o.drift60 ?? TAIL.drift60) * (o.u ?? 1) * t;
};

/** A linear drift in px from frame `from` (house 30 px/s at 1080p, range 6-90). */
export const drift = (f: number, from: number, pxPerSec = 30, fps: number = fpsOf()) => (pxPerSec * Math.max(0, f - from)) / fps;

/**
 * A hold turning into its exit: 0 until `lead` 60 fps frames before the cut (house 16, range 12-20),
 * then E.launchIn to 1 on the cut frame. Its start is flat, so added on top of a creep the hold
 * speeds up into the cut with no step in velocity.
 */
export const intoCut = (f: number, cut: number, lead = 16, fps: number = fpsOf()) => prog(f, cut - f60x(lead, fps), cut, E.launchIn);

/** Overlap and anticipation, house numbers (60 fps frames). */
export const OVERLAP = {
  secondaryBy: 0.9, // a secondary move starts before its primary is 90 % home
  foregroundLead60: 20, // the foreground lands about 20 f before the background
  enterBefore: [0, 1], // the next element enters 0-1 f before the previous one leaves
} as const;

/**
 * The frame (fractional) a primary tween reaches `share` of its travel: the latest a secondary that
 * overlaps it should start (house share 0.9).
 */
export const overlapAt = (primary: { from: number; to: number; ease: (t: number) => number }, share: number = OVERLAP.secondaryBy): number => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (primary.ease(mid) < share) lo = mid;
    else hi = mid;
  }
  return primary.from + hi * (primary.to - primary.from);
};

/** A frame `lead` 60 fps frames before `at` (default the foreground's 20 f lead over the background), at `fps`. */
export const leadBy = (at: number, lead: number = OVERLAP.foregroundLead60, fps: number = fpsOf()) => at - f60x(lead, fps);

export type HandoffShotOpts = {
  settle?: number; // 60 fps frames the carried offset takes to come to rest in shot B (default 30)
  ratio?: number; // incoming speed as a share of the outgoing one (default 1: one continuous move)
  carry?: ('x' | 'y' | 'k' | 'roll')[]; // what carries (default all four)
  fps?: number;
};

/**
 * A camera cut that keeps its speed: shot A (a function of the frame) runs up to and including the
 * cut frame; from the next frame shot B opens moving at A's speed on the cut frame (screen-space pan
 * in x and y, log scale, roll), and that offset decays to rest in B after `settle` (lib/camera.ts
 * handoff(), zero speed at the end). Returns the shot for any frame.
 */
export const handoffShot = (A: (f: number) => Shot, B: Shot | ((f: number) => Shot), cut: number, o: HandoffShotOpts = {}) => {
  const fps = o.fps ?? fpsOf();
  const settle = f60x(o.settle ?? 30, fps);
  const r = o.ratio ?? 1;
  const what = new Set(o.carry ?? ['x', 'y', 'k', 'roll']);
  const a1 = A(cut);
  const a0 = A(cut - 1);
  // screen-space speed of the world under A on the cut frame (px per film frame)
  const vsx = (a1.sx - a1.ax * a1.k - (a0.sx - a0.ax * a0.k)) * r;
  const vsy = (a1.sy - a1.ay * a1.k - (a0.sy - a0.ay * a0.k)) * r;
  const vk = Math.log(Math.max(1e-6, a1.k) / Math.max(1e-6, a0.k)) * r;
  const vr = ((a1.roll ?? 0) - (a0.roll ?? 0)) * r;
  return (f: number): Shot => {
    if (f <= cut) return A(f);
    const b = typeof B === 'function' ? B(f) : B;
    const t = f - cut - 1; // 0 on B's first frame
    const off = (v: number) => handoff(t, v, settle, fps).d;
    const k = what.has('k') ? b.k * Math.exp(off(vk)) : b.k;
    // a screen offset becomes an anchor offset in B's world: ax moves opposite to the screen
    return {
      ...b,
      ax: what.has('x') ? b.ax - off(vsx) / k : b.ax,
      ay: what.has('y') ? b.ay - off(vsy) / k : b.ay,
      k,
      roll: what.has('roll') ? (b.roll ?? 0) + off(vr) : b.roll,
    };
  };
};

