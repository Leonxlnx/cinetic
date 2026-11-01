// The depth stage's camera: driven only by declared shots. A shot is one move with a purpose (push in to a target,
// pull back to reveal, follow a subject, travel over a plane, crane down onto a scene, whip to the next subject,
// rack the focus), and every shot starts, travels and lands on a motion token. Between shots the camera holds still.
// No float, no drift, no move that comes back the way it went: checkShots() says so before anything is rendered,
// lint-film reads the declarations, forensics reads them in the render (camera-wander).
//
// Pure and Node-safe. Frames are the stage's own frames (the frame its Sequence gives it); house lengths are 60 fps
// frames converted to the film's rate.
import { clamp, E, type Ease, lmix, mix } from '../../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf } from '../../lib/film';
import {
  add,
  basisOf,
  type Cam,
  focalPx,
  type Frame,
  frameOf,
  LENS,
  lensOfFov,
  lerp3,
  mul,
  project,
  restCam,
  sub,
  toCam,
  type V3,
} from './math';

export type ShotKind = 'push' | 'pull' | 'follow' | 'travel' | 'crane' | 'orbit' | 'whip' | 'rack';
/** Where a shot lands: any camera field (left out: kept), `fov` (deg) in place of `lens`, focus 'target' to follow it. */
export type CamTo = Partial<Omit<Cam, 'focus'>> & { focus?: V3 | 'target'; fov?: number };
/** A framing that resolves against the camera the shot starts from (frame(), macro() and wide() return these). */
export type FramingFn = (from: Cam, fr: Frame) => CamTo;
/** Where a shot lands: camera fields, or a framing resolved against the camera it starts from. */
export type Framing = CamTo | FramingFn;

export type Shot = {
  kind: ShotKind;
  at: number; // first frame of the move
  frames: number; // its length (frames at the film's rate)
  ease: Ease;
  to?: Framing; // where the camera lands (rack: unused)
  subject?: (f: number) => V3; // follow: the world point the camera rides (a caret, a list's newest row, a cursor)
  lag?: number; // follow: smoothing window in frames (the camera trails the subject by about half of it)
  focus?: V3 | 'target'; // rack: where the focus lands
  id?: string;
};

/** House numbers: 60 fps frames and degrees. Every camera move eases from rest to rest (E.strongInOut). */
export const SHOT = {
  push: { frames60: 60 },
  pull: { frames60: 72 },
  follow: { lag60: 24, ramp60: 24 },
  travel: { frames60: 84 },
  crane: { frames60: 96 },
  orbit: { frames60: 90 },
  whip: { frames60: 28 },
  rack: { frames60: 30 },
  macro: { mag: [2.5, 4] as const, fillW: 0.92, fillH: 0.62 },
  reverseGap60: 90, // two moves the opposite way within 1.5 s: back and forth
  driftPxS: 12, // a move whose peak is slower than a sub-pixel creep ...
  driftS: 2, // ... for longer than this is a drift
  busyS: 1.2, // more than one camera move per 1.2 s over 4 s reads as a demo reel
} as const;

type Opts = { frames?: number; ease?: Ease; id?: string; film?: Partial<FilmCtx> };
const lenOf = (frames60: number, o: Opts) => o.frames ?? f60x(frames60, fpsOf(o.film));

/** Push in: the camera closes on a target (a framing: macro(box), frame(box), or any camera fields). */
export const push = (at: number, to: Framing, o: Opts = {}): Shot => ({ kind: 'push', at, frames: lenOf(SHOT.push.frames60, o), ease: o.ease ?? E.strongInOut, to, id: o.id });
/** Pull back: the camera reveals the whole (a wider framing). */
export const pull = (at: number, to: Framing, o: Opts = {}): Shot => ({ kind: 'pull', at, frames: lenOf(SHOT.pull.frames60, o), ease: o.ease ?? E.strongInOut, to, id: o.id });
/** Travel: the camera keeps its angle and distance and glides to another point of a plane (a page, a board, a grid). */
export const travel = (at: number, to: Framing | V3, o: Opts = {}): Shot => ({
  kind: 'travel',
  at,
  frames: lenOf(SHOT.travel.frames60, o),
  ease: o.ease ?? E.strongInOut,
  to: Array.isArray(to) ? { target: to as V3 } : (to as Framing),
  id: o.id,
});
/** Crane: the camera swings over the target (pitch, distance) down onto the scene, landing on its read. */
export const crane = (at: number, to: Framing, o: Opts = {}): Shot => ({ kind: 'crane', at, frames: lenOf(SHOT.crane.frames60, o), ease: o.ease ?? E.strongInOut, to, id: o.id });
/** Orbit: the camera swings around the target sideways (yaw), landing on the side that reads. */
export const orbit = (at: number, to: Framing, o: Opts = {}): Shot => ({ kind: 'orbit', at, frames: lenOf(SHOT.orbit.frames60, o), ease: o.ease ?? E.strongInOut, to, id: o.id });
/** Whip: a fast move to the next subject (long build, short brake); the motion blur hides the swap. */
export const whip = (at: number, to: Framing, o: Opts = {}): Shot => ({ kind: 'whip', at, frames: lenOf(SHOT.whip.frames60, o), ease: o.ease ?? E.whipBuild, to, id: o.id });
/**
 * Follow: the camera rides a moving subject (the caret as text types, the newest row of a list, a cursor on its way
 * to a button), trailing it by about half of `lag` frames and landing when the subject stops (or when the shot ends).
 * The subject is a point [x, y, z] or a box in scene px (a screen's focus box of that frame, placed with placeFocus:
 * `(g) => placeFocus(promptBarLayout(p, g).focus, x, y).caret`): the camera rides its centre.
 * `to` changes the other camera fields over the shot on its ease (a slow push while following).
 */
export const follow = (at: number, subject: (f: number) => V3 | Box, o: Opts & { frames: number; lag?: number; to?: Framing }): Shot => ({
  kind: 'follow',
  at,
  frames: o.frames,
  ease: o.ease ?? E.strongInOut,
  subject: (f: number): V3 => {
    const p = subject(f);
    return 'w' in p ? centreOf(p) : p;
  },
  lag: o.lag ?? f60x(SHOT.follow.lag60, fpsOf(o.film)),
  to: o.to,
  id: o.id,
});
/** Rack focus: the focus travels to a point (or back to the camera's target) while the camera holds or moves. */
export const rack = (at: number, focus: V3 | 'target', o: Opts = {}): Shot => ({ kind: 'rack', at, frames: lenOf(SHOT.rack.frames60, o), ease: o.ease ?? E.strongInOut, focus, id: o.id });

export type Box = { x: number; y: number; w: number; h: number; z?: number };
const centreOf = (b: Box): V3 => [b.x + b.w / 2, b.y + b.h / 2, b.z ?? 0];

/**
 * Frame a box (a UI element's rect on the design plane, z its depth): the camera looks at its centre (or `anchor`,
 * 0..1 inside it) from `yaw` / `pitch`, standing where the box shows `mag` times its size, or where it fills
 * `fill` of the frame (the tighter of width and height). Lens: the shot's own unless given.
 */
export const frame = (box: Box, o: { mag?: number; fill?: number; yaw?: number; pitch?: number; roll?: number; lens?: number; anchor?: [number, number]; aperture?: number } = {}): FramingFn => (from, fr) => {
  const lens = o.lens ?? from.lens;
  const F = focalPx(fr, lens);
  const mag = o.mag ?? (o.fill ?? 0.8) * Math.min(fr.W / box.w, fr.H / box.h);
  const target: V3 = o.anchor ? [box.x + o.anchor[0] * box.w, box.y + o.anchor[1] * box.h, box.z ?? 0] : centreOf(box);
  const to: CamTo = { target, dist: F / mag, lens };
  if (o.yaw !== undefined) to.yaw = o.yaw;
  if (o.pitch !== undefined) to.pitch = o.pitch;
  if (o.roll !== undefined) to.roll = o.roll;
  if (o.aperture !== undefined) to.aperture = o.aperture;
  return to;
};

/**
 * Macro close-up: one element fills the frame at 2.5-4x (house: as large as fits 92 % of the width or 62 % of the
 * height, held inside that band), so a pill, a button or a row becomes the whole picture with the world soft
 * behind it. `anchor` frames a point inside the box (0..1), e.g. [0.08, 0.5] for an input's first characters.
 */
export const macro = (box: Box, o: { mag?: number; yaw?: number; pitch?: number; roll?: number; lens?: number; anchor?: [number, number]; aperture?: number } = {}): FramingFn => (from, fr) => {
  const [lo, hi] = SHOT.macro.mag;
  const fit = Math.min((SHOT.macro.fillW * fr.W) / box.w, (SHOT.macro.fillH * fr.H) / box.h);
  return frame(box, { ...o, mag: o.mag ?? clamp(fit, lo, hi) })(from, fr);
};

/** The opening framing (1:1 on the design plane) at another angle: a wide that shows the whole layout. */
export const wide = (o: { yaw?: number; pitch?: number; roll?: number; lens?: number; target?: V3; mag?: number } = {}): FramingFn => (from, fr) => {
  const lens = o.lens ?? from.lens;
  const to: CamTo = { target: o.target ?? [fr.W / 2, fr.H / 2, 0], dist: focalPx(fr, lens) / (o.mag ?? 1), lens, yaw: o.yaw ?? 0, pitch: o.pitch ?? 0, roll: o.roll ?? 0 };
  return to;
};

const resolve = (from: Cam, to: Framing | undefined, fr: Frame): Cam => {
  if (!to) return from;
  const t = typeof to === 'function' ? to(from, fr) : to;
  const lens = t.lens ?? (t.fov !== undefined ? lensOfFov(t.fov) : from.lens);
  return {
    target: t.target ?? from.target,
    dist: t.dist ?? from.dist,
    yaw: t.yaw ?? from.yaw,
    pitch: t.pitch ?? from.pitch,
    roll: t.roll ?? from.roll,
    lens,
    focus: t.focus === 'target' ? null : t.focus ?? from.focus,
    aperture: t.aperture ?? from.aperture,
  };
};

/**
 * Blend two cameras: distance and lens on log scale (a push has a constant perceived speed), angles linearly, and
 * the target so that the landing target travels a straight, eased line on screen while the distance changes (no
 * zoom-then-slide hook on a push into an off-centre button).
 */
const blendCam = (A: Cam, B: Cam, e: number, fr: Frame): Cam => {
  const dist = lmix(A.dist, B.dist, e);
  const lens = lmix(A.lens, B.lens, e);
  const mA = focalPx(fr, A.lens) / A.dist;
  const mT = focalPx(fr, lens) / dist;
  const target = add(B.target, mul(sub(A.target, B.target), (1 - e) * (mA / mT)));
  return { target, dist, lens, yaw: mix(A.yaw, B.yaw, e), pitch: mix(A.pitch, B.pitch, e), roll: mix(A.roll, B.roll, e), focus: e < 1 ? A.focus : B.focus, aperture: mix(A.aperture, B.aperture, e) };
};

/** A follow's subject, smoothed: a bell-weighted average over the last `lag` frames, stopping at `until`. */
export const smoothed = (subject: (f: number) => V3, f: number, lag: number, from: number, until: number, n = 24): V3 => {
  if (lag <= 0) return subject(clamp(f, from, until));
  let acc: V3 = [0, 0, 0];
  let wsum = 0;
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) / n;
    const w = 1 - Math.cos(2 * Math.PI * s); // a bell: the camera's speed never steps when the caret does
    acc = add(acc, mul(subject(clamp(f - s * lag, from, until)), w));
    wsum += w;
  }
  return mul(acc, 1 / wsum);
};

/** The camera a stage films through: a function of the frame, with what it was built from. */
export type CameraPath = ((f: number) => Cam) & {
  base: Cam;
  fr: Frame;
  fps: number;
  shots: readonly Shot[];
  /** The focus distance (px along the lens axis) at frame f. */
  fd: (f: number) => number;
};

/**
 * The camera from its shots. `base` is the opening camera (house: 1:1 on the design plane, lens 50, aperture 36);
 * camera moves (every kind but rack) run one after another, each starting from where the last landed; racks run
 * on their own track and may overlap a move. Before the first shot and between shots the camera holds still.
 */
export const camera = (shots: readonly Shot[], o: { base?: Partial<Cam> & { fov?: number }; film?: Partial<FilmCtx> } = {}): CameraPath => {
  const { width, height } = sizeOf(o.film);
  const fr = frameOf(width, height);
  const fps = fpsOf(o.film);
  const b0 = { ...(o.base ?? {}) };
  if (b0.fov !== undefined && b0.lens === undefined) b0.lens = lensOfFov(b0.fov);
  const base = restCam(fr, b0);
  const moves = shots.filter((s) => s.kind !== 'rack').slice().sort((a, b) => a.at - b.at);
  const racks = shots.filter((s) => s.kind === 'rack').slice().sort((a, b) => a.at - b.at);
  // each move's starting camera, resolved once, on first use (a move starts where the previous one landed). Lazy, so
  // a subject that measures type (caretOf) is read inside the film's font gate, never at module load
  const starts: Cam[] = [];
  const ends: Cam[] = [];
  let resolved = false;
  const resolveAll = () => {
    if (resolved) return;
    resolved = true;
    let cur = base;
    for (const m of moves) {
      starts.push(cur);
      let end = resolve(cur, m.to, fr);
      if (m.kind === 'follow' && m.subject) end = { ...end, target: smoothed(m.subject, m.at + m.frames, m.lag ?? 0, m.at, m.at + m.frames - (m.lag ?? 0)) };
      ends.push(end);
      cur = end;
    }
  };
  // a focus (a point, a distance or the target) as a distance under camera c
  const fdFor = (focus: Cam['focus'], c: Cam) =>
    typeof focus === 'number' ? Math.max(1, focus) : focus ? Math.max(1, toCam(basisOf(c, fr), focus)[2]) : c.dist;
  const rig = (f: number): { c: Cam; fd: number } => {
    resolveAll();
    let c = base;
    let fd = fdFor(base.focus, base);
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (f <= m.at) break;
      const t = clamp((f - m.at) / Math.max(1e-6, m.frames));
      const e = m.ease(t);
      if (m.kind === 'follow' && m.subject) {
        const lag = m.lag ?? 0;
        const until = m.at + m.frames - lag;
        const ramp = Math.min(m.frames, f60x(SHOT.follow.ramp60, fps));
        const er = E.strongInOut(clamp((f - m.at) / Math.max(1e-6, ramp)));
        const rest = blendCam(starts[i], { ...ends[i], target: starts[i].target }, e, fr);
        const ride = smoothed(m.subject, f, lag, m.at, until);
        const mA = focalPx(fr, starts[i].lens) / starts[i].dist;
        const mT = focalPx(fr, rest.lens) / rest.dist;
        c = { ...rest, target: add(ride, mul(sub(starts[i].target, ride), (1 - er) * (mA / mT))) };
      } else {
        c = t >= 1 ? ends[i] : blendCam(starts[i], ends[i], e, fr);
      }
      // the lens pulls focus with the move (in diopters, on its ease): from where it started to where it lands
      const fa = fdFor(starts[i].focus, c);
      const fb = fdFor(ends[i].focus, c);
      fd = t >= 1 ? fb : 1 / mix(1 / fa, 1 / fb, e);
    }
    return { c, fd };
  };
  // racks on their own track, in diopters: each from the focus it finds to its own point (or back to the target)
  const fdOf = (f: number, c: Cam, own: number) => {
    let fd = own;
    for (const r of racks) {
      if (f <= r.at) break;
      const t = clamp((f - r.at) / Math.max(1e-6, r.frames));
      const goal = r.focus === 'target' || !r.focus ? c.dist : fdFor(r.focus, c);
      fd = 1 / mix(1 / fd, 1 / goal, r.ease(t));
    }
    return fd;
  };
  const path = ((f: number): Cam => {
    const { c, fd } = rig(f);
    return { ...c, focus: fdOf(f, c, fd) }; // focus resolved to a distance for the stage
  }) as CameraPath;
  path.base = base;
  path.fr = fr;
  path.fps = fps;
  path.shots = shots;
  path.fd = (f: number) => {
    const { c, fd } = rig(f);
    return fdOf(f, c, fd);
  };
  return path;
};

/** A still camera (no shots): the opening camera, or any framing of it. */
export const still = (o: { base?: Partial<Cam> & { fov?: number }; framing?: Framing; film?: Partial<FilmCtx> } = {}): CameraPath => {
  const p = camera([], o);
  if (!o.framing) return p;
  const c = resolve(p.base, o.framing, p.fr);
  return camera([], { ...o, base: c });
};

// ---------------------------------------------------------------------------------------------------------------
// checks and declarations
// ---------------------------------------------------------------------------------------------------------------

export type ShotProblem = { rule: 'shot-overlap' | 'shot-reverse' | 'shot-drift' | 'shot-short' | 'shot-roll' | 'shot-busy' | 'shot-still'; severity: 'error' | 'warn'; at: number; msg: string };

/** What a move does on screen: where the landing target travels (frame fractions) and the log zoom. */
const moveVector = (path: CameraPath, s: Shot): [number, number, number] => {
  const a = path(s.at);
  const b = path(s.at + s.frames);
  const fr = path.fr;
  const ba = basisOf(a, fr);
  const bb = basisOf(b, fr);
  const pa = project(ba, fr, b.target);
  const pb = project(bb, fr, b.target);
  const dx = pa && pb ? (pa.x - pb.x) / (fr.W * fr.u) : 0;
  const dy = pa && pb ? (pa.y - pb.y) / (fr.H * fr.u) : 0;
  const mz = Math.log((focalPx(fr, b.lens) / b.dist) / (focalPx(fr, a.lens) / a.dist));
  // the picture moves opposite to the target's screen travel; a turn reads as a pan of the frame's centre
  const yawPan = ((b.yaw - a.yaw) / 60) * 0.5;
  const pitchPan = ((b.pitch - a.pitch) / 60) * 0.5;
  return [dx + yawPan, dy + pitchPan, mz];
};

/**
 * Screen speed of a move (px/s at 1080p): its peak and its mean (travel over the move's length), read on two probes
 * of the design plane, the frame's centre and a point near the frame's edge (so a push counts as well as a pan).
 */
export const shotSpeed = (path: CameraPath, s: Shot, steps = 24) => {
  const fr = path.fr;
  let peak = 0;
  const probe = (f: number) => {
    const c = path(f);
    const b = basisOf(c, fr);
    return [project(b, fr, [fr.W / 2, fr.H / 2, 0]), project(b, fr, [fr.W * 0.9, fr.H / 2, 0])];
  };
  const d = (u: { x: number; y: number } | null, v: { x: number; y: number } | null) => (u && v ? Math.hypot(v.x - u.x, v.y - u.y) / fr.u : 0);
  for (let i = 0; i < steps; i++) {
    const f0 = s.at + (s.frames * i) / steps;
    const f1 = s.at + (s.frames * (i + 1)) / steps;
    const a = probe(f0);
    const b = probe(f1);
    const dt = (f1 - f0) / path.fps;
    peak = Math.max(peak, d(a[0], b[0]) / dt, d(a[1], b[1]) / dt);
  }
  const a = probe(s.at);
  const b = probe(s.at + s.frames);
  const mean = Math.max(d(a[0], b[0]), d(a[1], b[1])) / Math.max(1e-6, s.frames / path.fps);
  return { peak, mean };
};

/**
 * The house rules on a camera's shots, before anything renders: moves never overlap (one move per shot), never come
 * back the way the last one went within 1.5 s, never crawl (a peak under a sub-pixel creep for over 2 s, or a move on
 * E.linear: no start, no landing), stay over 10 f (whips aside), roll within 8 degrees, and leave room between them.
 */
export const checkShots = (path: CameraPath): ShotProblem[] => {
  const out: ShotProblem[] = [];
  const fps = path.fps;
  const moves = path.shots.filter((s) => s.kind !== 'rack').slice().sort((a, b) => a.at - b.at);
  for (let i = 0; i < moves.length; i++) {
    const s = moves[i];
    const prev = moves[i - 1];
    if (prev && s.at < prev.at + prev.frames - 1e-6)
      out.push({ rule: 'shot-overlap', severity: 'error', at: s.at, msg: `${s.kind} at ${s.at} starts before the ${prev.kind} at ${prev.at} lands (${prev.at + prev.frames}): one move per shot, the next starts once the last has landed` });
    if (s.ease === E.linear && s.kind !== 'follow')
      out.push({ rule: 'shot-drift', severity: 'error', at: s.at, msg: `${s.kind} at ${s.at} runs on E.linear: a camera move starts, travels and lands (E.strongInOut, an arrive token after a cut, E.whipBuild)` });
    if (s.frames < f60x(10, fps) && s.kind !== 'whip')
      out.push({ rule: 'shot-short', severity: 'warn', at: s.at, msg: `${s.kind} at ${s.at} lasts ${s.frames.toFixed(1)} f: under 10 f@60 a move reads as a jump (a whip, or a cut)` });
    const end = path(s.at + s.frames);
    if (Math.abs(end.roll) > LENS.rollMax)
      out.push({ rule: 'shot-roll', severity: 'warn', at: s.at, msg: `${s.kind} at ${s.at} lands rolled ${end.roll.toFixed(1)} deg: keep roll within ${LENS.rollMax}` });
    const v = moveVector(path, s);
    const size = Math.hypot(...v);
    if (size < 1e-4 && s.kind !== 'follow')
      out.push({ rule: 'shot-still', severity: 'warn', at: s.at, msg: `${s.kind} at ${s.at} does not move the picture: drop it (a hold is a hold)` });
    const sp = shotSpeed(path, s);
    if (s.kind !== 'follow' && size > 1e-4 && (sp.peak < SHOT.driftPxS || (sp.mean < SHOT.driftPxS && s.frames / fps > SHOT.driftS)))
      out.push({ rule: 'shot-drift', severity: 'error', at: s.at, msg: `${s.kind} at ${s.at} crawls (${sp.mean.toFixed(1)} px/s on average, ${sp.peak.toFixed(1)} at its peak, over ${(s.frames / fps).toFixed(1)} s): a drift, not a shot; give it a purpose and a landing, or hold` });
    if (s.kind === 'follow' && s.subject) {
      // a follow that first runs back to catch its subject goes back and forth: frame the subject before it starts
      const st = path(s.at).target;
      const s0 = s.subject(s.at);
      const s1 = s.subject(s.at + s.frames);
      const catchUp = sub(s0, st);
      const run = sub(s1, s0);
      const cu = Math.hypot(catchUp[0], catchUp[1]);
      if (cu * (focalPx(path.fr, path(s.at).lens) / path(s.at).dist) > 40 && catchUp[0] * run[0] + catchUp[1] * run[1] < 0)
        out.push({ rule: 'shot-reverse', severity: 'error', at: s.at, msg: `follow at ${s.at} first runs back ${cu.toFixed(0)} px to catch its subject, then follows it the other way: frame the subject first (push to it), then follow` });
    }
    if (prev) {
      const u = moveVector(path, prev);
      const gap = s.at - (prev.at + prev.frames);
      const nu = Math.hypot(...u);
      const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / Math.max(1e-9, nu * size);
      if (nu > 1e-4 && size > 1e-4 && d < -0.3 && gap < f60x(SHOT.reverseGap60, fps))
        out.push({ rule: 'shot-reverse', severity: 'error', at: s.at, msg: `${s.kind} at ${s.at} goes back the way the ${prev.kind} at ${prev.at} came, ${(gap / fps).toFixed(2)} s after it landed: back and forth reads as aimless; carry on in one direction, or cut` });
    }
  }
  // busy: count move starts in any 4 s window
  const win = 4 * fps;
  for (let i = 0; i < moves.length; i++) {
    const n = moves.filter((m) => m.at >= moves[i].at && m.at < moves[i].at + win).length;
    if (n > win / fps / SHOT.busyS + 1e-9) {
      out.push({ rule: 'shot-busy', severity: 'warn', at: moves[i].at, msg: `${n} camera moves start within 4 s from ${moves[i].at}: one idea per beat (about 1.5-2.5 s); let the picture hold` });
      break;
    }
  }
  return out;
};

/** A declared camera shot for the checks of the render (forensics camera-wander): its frames, kind and id. */
export type ShotRange = { from: number; to: number; kind: ShotKind; id: string };

/**
 * What a stage's camera declares (src/sync.ts declares()): every camera move as a range in film frames (`offset`: the
 * frame the stage's Sequence starts on; a rack moves the focus, not the picture, and is left out), and the stage
 * itself when `frames` (its Sequence's length) is given. forensics camera-wander reads them: a declared shot is a
 * purposeful move; two shots in a row going back and forth still fail, and inside the stage a camera that moves
 * outside every shot is a drift.
 */
export const shotDeclares = (path: CameraPath, o: { id?: string; offset?: number; frames?: number } = {}) => {
  const off = o.offset ?? 0;
  const id = o.id ?? 'stage3d';
  const shots: ShotRange[] = path.shots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.kind !== 'rack')
    .map(({ s, i }) => ({ from: Math.round(off + s.at), to: Math.round(off + s.at + s.frames), kind: s.kind, id: s.id ?? `${id}-${s.kind}-${i}` }));
  const stages = o.frames ? [{ from: Math.round(off), to: Math.round(off + o.frames), id }] : [];
  return { id, shots, stages, seams: [], stepped: [], flashes: [], cameraBlur: [] };
};

/** The camera's world position at frame f (for overlays and checks). */
export const camPos = (path: CameraPath, f: number): V3 => basisOf(path(f), path.fr).pos;

/** Blend helper for overlays: a point between two world points on an ease. */
export const along = (a: V3, b: V3, t: number): V3 => lerp3(a, b, clamp(t));

// ---------------------------------------------------------------------------------------------------------------
// subjects a follow rides (beside caretOf in stacks: the caret as text types)
// ---------------------------------------------------------------------------------------------------------------

/**
 * A list as it fills: the centre of the newest row that has appeared by frame f (rows: their boxes on the design
 * plane, top to bottom; times: the frame each one appears). follow() smooths the steps into one glide down the list.
 */
export const newestOf = (rows: readonly Box[], times: readonly number[]) => (f: number): V3 => {
  let k = 0;
  for (let i = 0; i < rows.length; i++) if (times[i] <= f) k = i;
  const r = rows[k];
  return [r.x + r.w / 2, r.y + r.h / 2, r.z ?? 0];
};

/**
 * A point travelling from a to b (a cursor on its way to a button) over `frames` from `at`, on `ease` (house
 * E.strongInOut): draw the cursor with it and give the same function to follow(), so the camera rides the cursor.
 */
export const pathOf = (a: V3, b: V3, at: number, frames: number, ease: Ease = E.strongInOut) => (f: number): V3 => lerp3(a, b, ease(clamp((f - at) / Math.max(1e-6, frames))));
