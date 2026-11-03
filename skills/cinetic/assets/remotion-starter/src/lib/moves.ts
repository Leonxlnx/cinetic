// The signature moves at their house numbers: the timings that make a launch film read as decided, written as
// pure functions of the frame (any frame, any order, sub-frames for motion blur). Each one is the numeric core of an
// entry in references/motion-library (its slug in brackets); fx/Moves.tsx draws them.
//
// Tables are authored per 30 fps frame (`ref`) and played at the film's rate (24, 25, 30, 50, 60 all agree in
// seconds). Distances are px at 1080p: pass the film ({ fps, width, height }) and they scale with the frame.
//
//   snapSettle / snapTo  [snap-settle, word-build-recentre]  a re-centre or a step: 69 % of the move on the first frame
//   snapShare            [snap-settle]                        any first-frame share (0.4 lockup, 0.66 make-room, 0.8 zoom)
//   wordRise             [word-rise]                          the canonical word entrance: rise, ink ramp, vertical smear
//   arrivalTint          [arrival-tint]                       born in the accent (or a heat ramp), drains to ink
//   popIn                [pop-overshoot]                      0.2 -> 0.7 -> 0.95 -> 1.03 -> 1.0, opacity full in 4 f@60
//   landIn               [spring-land-zoom]                   cuts in at 1.07-1.29x or 50-90 px off, smeared, springs home
//   whipExit / whipEntry [whip-exit-match, velocity-cut]      speed doubles every frame into the cut; the next shot enters
//                                                             at 0.9-1.0 of that speed and brakes on an expo
//   flyFromLens          [fly-from-lens]                      huge, soft and see-through at the lens, shrinking into its slot
//   pressSquash          [press-click]                        cursor 0.8 / button 0.9 for 3 f, released on the click spring
//   holdTail / scaleCreep [drift-tail]                       the never-still hold: the decaying tail of the last move
//   ladder / ladderArrive [dof-ladder]                       depth slots: blur 0/2.5/3/3.5/9, light 1/.92/.85/.78/.70
//   makeRoom             [grow-push]                          the line parts 66 % in one frame for the object in the gap
//   clickBloom / selectRing / glyphSweep / rimStreak         light that marks an event, then leaves
//
// Nothing here loops or floats: every function starts on an event, travels, and lands (item: no idle bob, no aimless
// drift). The hold tail keeps the direction of the move that landed and never turns back.
import { spring } from 'remotion';
import { clamp, SPR } from './anim';
import { mixColor } from './color';
import { type FilmCtx, fpsOf, uOf } from './film';

export const MOVES = {
  /** The rate the tables below are written at (30 fps). */
  ref: 30,
  /** A re-centre or a step: share of the move per 30 fps frame (8 f in all, 69 % on frame 1). */
  snap: { recentre: [0, 0.69, 0.85, 0.93, 0.97, 0.99, 1] as const, first: 0.69, q: 0.48 },
  /** The canonical word rise (per 30 fps frame from the first visible frame): offset share, ink, smear px at a 40 px rise. */
  rise: {
    table: [1, 0.667, 0.458, 0.354, 0.271, 0.229, 0.188, 0.167, 0.146, 0.125, 0.104, 0.104, 0.083, 0.063, 0.042, 0.021, 0] as const,
    ink: [0.34, 0.56, 0.69, 0.77, 0.82, 0.85, 0.89, 0.91, 0.93, 0.94, 0.95, 0.97, 0.98, 1] as const,
    smear: [6, 3, 0] as const,
    /** Rise as a share of the font size: a statement word (0.75 x the cap height), a voice word (0.45 x the x-height). */
    share: { statement: 0.52, voice: 0.24 },
    firstInk: 0.7,
  },
  /** Arrival tint: the accent holds `hold` frames, then drains to ink over `drain` (30 fps frames). */
  tint: { hold: 2, drain: 6 },
  /** The pop: scale keys at 60 fps frames; opacity full after `fade60`. */
  pop: { keys60: [[0, 0.2], [3, 0.7], [6, 0.95], [9, 1.03], [14, 1]] as const, fade60: 4 },
  /** Landing in motion: start scale, start offset px, the spring (SPR.critical: home in 14 f@30; SPR.softLanding for a 6 % landing), smear = share x px/f. */
  land: { scale: 1.17, offset: 70, spring: SPR.critical, smearShare: 0.5, smearMin: 3 },
  /** The whip: build frames of doubling speed (30 fps), the peak px/f at 1080p, the entry/exit ratio, the brake (30 fps). */
  whip: { build: 8, peak: 140, ratio: 0.95, brake: 10, smearShare: 0.5 },
  /** From the lens: start scale, blur px, opacity, yaw deg, frames (30 fps) to land. */
  lens: { from: 3, blur: 20, opacity: 0.45, yaw: 18, frames: 20 },
  /** The press: depth (scale) per kind, frames held (30 fps), the release spring (SPR.criticalFast: settled in 9 f@30). */
  press: { cursor: 0.8, button: 0.9, hold: 3, spring: SPR.criticalFast },
  /** The hold tail: px per 30 fps frame at 1080p (leaves at v0, decays to vEnd = the house creep, 12 px/s, never 0), tau (30 fps frames). Scale creep %/f. */
  tail: { v0: 1.6, vEnd: 0.4, tau: 20, creepPct: 0.2 },
  /** The depth ladder by slot (0 = the sharp plane). */
  ladder: { blur: [0, 2.5, 3, 3.5, 9] as const, light: [1, 0.92, 0.85, 0.78, 0.7] as const, scale: 0.943, arrive: { px: 6, frames: 6 } },
  /** Make room: the gap opens this share on the first frame. */
  room: { first: 0.66, q: 0.45 },
  /** Light on events (px at 1080p, 30 fps frames). */
  bloom: { r0: 150, r1: 580, frames: 18, peak: 0.5 },
  ring: { from: 6, out: 24, width: 2, glow: 14, glowAlpha: 0.35, frames: 6 },
  sweep: { band: 160, angle: -20, peak: 0.5, speed: 60, maxFrames: 25 },
  streak: { core: 3, length: 170, sigma: 45, frames: 24, share: 0.5 },
} as const;

type F = Partial<FilmCtx>;
const refT = (f: number, at: number, fps: number) => ((f - at) * MOVES.ref) / fps;

/** A per-frame table authored at 30 fps (index 0 on `at`), played at the film's rate: linear between table frames. */
export const tableAt = (f: number, at: number, table: readonly number[], film?: F) => {
  const t = refT(f, at, fpsOf(film));
  if (t <= 0) return table[0];
  if (t >= table.length - 1) return table[table.length - 1];
  const i = Math.floor(t);
  return table[i] + (table[i + 1] - table[i]) * (t - i);
};

/** Share of a re-centre or step done at frame f (0 until `at`, 0.69 one 30 fps frame later, 1 after 6). */
export const snapSettle = (f: number, at: number, film?: F) => (f < at ? 0 : tableAt(f, at, MOVES.snap.recentre, film));

/** A value snapped from `a` to `b` at frame `at`. */
export const snapTo = (f: number, at: number, a: number, b: number, film?: F) => a + (b - a) * snapSettle(f, at, film);

/** Share done of a first-frame-heavy move with any first share, then a geometric tail (q per 30 fps frame). */
export const snapShare = (f: number, at: number, film?: F, first: number = MOVES.snap.first, q: number = MOVES.snap.q) => {
  const t = refT(f, at, fpsOf(film));
  if (t <= 0) return 0;
  if (t < 1) return first * t;
  const rem = (1 - first) * q ** (t - 1);
  return rem < 0.002 ? 1 : 1 - rem;
};

export type RiseState = { visible: boolean; dy: number; opacity: number; smear: number };
/**
 * The canonical word entrance at frame f for a word landing at `at`: below its baseline by `rise` px (at 1080p;
 * riseFor() gives it from the font size), most of the rise on frames 1-2, the last 20 % creeping in over 10 frames;
 * opacity starts at `firstInk` (0.7: frame 1 already reads) and is full by frame 3; a vertical smear 6 -> 3 -> 0 px
 * (for a 40 px rise) on the first frames only.
 */
export const wordRise = (f: number, at: number, o: { rise: number; firstInk?: number }, film?: F): RiseState => {
  if (f < at) return { visible: false, dy: o.rise * uOf(film), opacity: 0, smear: 0 };
  const u = uOf(film);
  const R = MOVES.rise;
  const ink = tableAt(f, at, R.ink, film);
  const first = o.firstInk ?? R.firstInk;
  return {
    visible: true,
    dy: o.rise * u * tableAt(f, at, R.table, film),
    opacity: clamp(first + (1 - first) * ((ink - 0.34) / 0.66) * 3),
    smear: tableAt(f, at, R.smear, film) * (o.rise / 40) * u,
  };
};
/** The rise for a font size (px at 1080p): a statement word 0.52 x size (0.75 cap), a voice word 0.24 x size (0.45 x-height). */
export const riseFor = (size: number, kind: keyof typeof MOVES.rise.share = 'statement') => size * MOVES.rise.share[kind];

/**
 * The arrival tint of a word that lands at `at`: `accent` for `hold` frames, then a linear drain to `ink` over `drain`
 * frames (30 fps). `via` adds a heat ramp (e.g. gold, red-orange, plum) walked during the drain before the ink.
 */
export const arrivalTint = (f: number, at: number, o: { accent: string; ink: string; hold?: number; drain?: number; via?: readonly string[] }, film?: F) => {
  const t = refT(f, at, fpsOf(film)) - (o.hold ?? MOVES.tint.hold);
  if (t <= 0) return o.accent;
  const p = clamp(t / (o.drain ?? MOVES.tint.drain));
  if (p >= 1) return o.ink;
  const stops = [o.accent, ...(o.via ?? []), o.ink];
  const x = p * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mixColor(stops[i], stops[i + 1], x - i);
};

/** Keys [frame, value] at 60 fps, linear between keys, played at the film's rate. */
const keysAt = (f: number, at: number, keys: readonly (readonly [number, number])[], film?: F) => {
  const t = ((f - at) * 60) / fpsOf(film);
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [x0, y0] = keys[i];
    const [x1, y1] = keys[i + 1];
    if (t <= x1) return y0 + ((y1 - y0) * (t - x0)) / (x1 - x0);
  }
  return keys[keys.length - 1][1];
};

/**
 * A pop with one overshoot: scale 0.2 -> 0.7 -> 0.95 -> 1.03 -> 1.0 over 14 f@60, opacity full in 4 f@60 (never a slow
 * fade). `from` changes the start (0.35 a popover, 0.92 UI children); `over` the overshoot (0 for a modal, 0.12 a step dot).
 */
export const popIn = (f: number, at: number, film?: F, o: { from?: number; over?: number } = {}) => {
  if (f < at) return { scale: o.from ?? 0.2, opacity: 0, visible: false };
  const from = o.from ?? 0.2;
  const over = o.over ?? 0.03;
  const base = keysAt(f, at, MOVES.pop.keys60, film); // 0.2 .. 1.03 .. 1
  const n = (base - 0.2) / 0.8; // 0 .. 1.0375 .. 1
  const t60 = ((f - at) * 60) / fpsOf(film);
  const scale = n > 1 ? 1 + ((n - 1) / 0.0375) * over : from + (1 - from) * n;
  return { scale, opacity: clamp(t60 / MOVES.pop.fade60 + 0.25), visible: true };
};

/** A Remotion spring config: one of lib/anim SPR (a film keeps one underdamped class). */
export type SpringCfg = { mass?: number; stiffness?: number; damping?: number };
/**
 * A landing in motion: the element cuts in at `scale` (1.07-1.29, or 0.81-0.9 to grow) and/or `offset` px away
 * (50-90 at 1080p) and springs home (settling in 12-25 f@30; MOVES.land.spring is SPR.critical). Opacity is full
 * on the first frame; the smear (px along the offset) is half the frame's travel, on fast frames only.
 */
export const landIn = (f: number, at: number, o: { scale?: number; offset?: { x?: number; y?: number }; spring?: SpringCfg } = {}, film?: F) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const cfg = o.spring ?? MOVES.land.spring;
  const p = (g: number) => (g < at ? 0 : spring({ frame: g - at, fps, config: cfg }));
  const k = p(f);
  const s0 = o.scale ?? 1;
  const ox = (o.offset?.x ?? 0) * u;
  const oy = (o.offset?.y ?? 0) * u;
  const x = ox * (1 - k);
  const y = oy * (1 - k);
  const v = Math.hypot(ox, oy) * Math.abs(p(f) - p(f - 1));
  const smear = v >= MOVES.land.smearMin * u ? v * MOVES.land.smearShare : 0;
  return { visible: f >= at, scale: s0 + (1 - s0) * k, x, y, smear, opacity: f >= at ? 1 : 0, k };
};

/**
 * The exit of a velocity cut: the speed doubles every 30 fps frame and peaks (`peak` px/f at 1080p) on the last frame
 * before `cut`, so the cut lands on the fastest frame. Returns the travel so far (px, positive along the direction),
 * the speed (px per film frame) and the smear (half the speed). Zero before the build.
 */
export const whipExit = (f: number, cut: number, film?: F, o: { peak?: number; build?: number } = {}) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const peak = (o.peak ?? MOVES.whip.peak) * u;
  const n = o.build ?? MOVES.whip.build;
  const tau = Math.min(0, refT(f, cut - 1, fps));
  if (tau < -n || f >= cut) return { x: f >= cut ? (peak / Math.LN2) * (1 - 2 ** -n) : 0, v: 0, smear: 0 };
  const x = (peak / Math.LN2) * (2 ** tau - 2 ** -n);
  const v = peak * 2 ** tau * (MOVES.ref / fps);
  return { x, v, smear: v * MOVES.whip.smearShare };
};

/**
 * The entry of a velocity cut: the new shot arrives already moving at `ratio` (0.9-1.0) of the exit's peak and brakes on
 * an expo to rest in about `brake` 30 fps frames. Returns the offset from rest (px, negative = still short of its place,
 * along the direction), the speed and the smear.
 */
export const whipEntry = (f: number, cut: number, film?: F, o: { peak?: number; ratio?: number; brake?: number } = {}) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const v0 = (o.peak ?? MOVES.whip.peak) * u * (o.ratio ?? MOVES.whip.ratio);
  const kk = Math.log(100) / (o.brake ?? MOVES.whip.brake);
  const tau = Math.max(0, refT(f, cut, fps));
  const D = v0 / kk;
  const x = -D * Math.exp(-kk * tau);
  const v = v0 * Math.exp(-kk * tau) * (MOVES.ref / fps);
  return { x: Math.abs(x) < 0.25 * u ? 0 : x, v, smear: v * MOVES.whip.smearShare };
};

/**
 * From the lens: the element starts `from` x its size (1.3-5), blurred `blur` px, at `opacity`, yawed `yaw` degrees, and
 * shrinks on a log scale (an equal ratio per frame, decelerating) into its slot in `frames` (15-24 at 30 fps) while the
 * focus resolves with it.
 */
export const flyFromLens = (f: number, at: number, film?: F, o: { from?: number; blur?: number; opacity?: number; yaw?: number; frames?: number } = {}) => {
  const L = MOVES.lens;
  const t = clamp(refT(f, at, fpsOf(film)) / (o.frames ?? L.frames));
  const e = (1 - 2 ** (-7 * t)) / (1 - 2 ** -7);
  const from = o.from ?? L.from;
  return {
    visible: f >= at,
    scale: Math.exp(Math.log(from) * (1 - e)),
    blur: (o.blur ?? L.blur) * uOf(film) * (1 - e),
    opacity: f < at ? 0 : clamp((o.opacity ?? L.opacity) + (1 - (o.opacity ?? L.opacity)) * clamp(e / 0.6)),
    yaw: (o.yaw ?? L.yaw) * (1 - e),
    t: e,
  };
};

/** A press: the scale drops to `depth` (cursor 0.8, button 0.9) on the first frame, holds `hold` frames (30 fps), then springs back. */
export const pressSquash = (f: number, at: number, film?: F, o: { kind?: 'cursor' | 'button'; depth?: number; hold?: number } = {}) => {
  const fps = fpsOf(film);
  const P = MOVES.press;
  const depth = o.depth ?? (o.kind === 'button' ? P.button : P.cursor);
  const hold = ((o.hold ?? P.hold) * fps) / MOVES.ref;
  if (f < at) return 1;
  if (f < at + hold) return depth;
  return depth + (1 - depth) * spring({ frame: f - at - hold, fps, config: P.spring });
};

/**
 * The hold tail: after a move lands at `at`, the element keeps travelling in the same direction at v0 px per 30 fps frame
 * (1080p), decaying toward vEnd (never 0, never back), until `until` (the next event; it then holds that offset for the
 * next move to take over). Returns px along the move's direction. Use a different v0 per layer for parallax.
 */
export const holdTail = (f: number, at: number, film?: F, o: { v0?: number; vEnd?: number; tau?: number; until?: number } = {}) => {
  const T = MOVES.tail;
  const fps = fpsOf(film);
  const end = o.until ?? Infinity;
  const tau = Math.max(0, refT(Math.min(f, end), at, fps));
  const v0 = o.v0 ?? T.v0;
  const v1 = o.vEnd ?? T.vEnd;
  const k = o.tau ?? T.tau;
  return (v1 * tau + (v0 - v1) * k * (1 - Math.exp(-tau / k))) * uOf(film);
};

/** A scale creep from `at`: `pct` % per 30 fps frame (0.1-0.4 in, negative to shrink), compounding, until `until`. */
export const scaleCreep = (f: number, at: number, film?: F, o: { pct?: number; until?: number } = {}) => {
  const tau = Math.max(0, refT(Math.min(f, o.until ?? Infinity), at, fpsOf(film)));
  return (1 + (o.pct ?? MOVES.tail.creepPct) / 100) ** tau;
};

/** The depth ladder: blur (px at 1080p), brightness and scale of slot n (0 = the sharp plane; past 4 the far slot holds). */
export const ladder = (n: number, film?: F) => {
  const L = MOVES.ladder;
  const i = Math.max(0, Math.min(L.blur.length - 1, Math.round(n)));
  return { blur: L.blur[i] * uOf(film), brightness: L.light[i], scale: L.scale ** Math.max(0, n) };
};
/** A slot's arrival: 6 px (1080p) below its place, home in 6 frames (30 fps) on an expo-out. */
export const ladderArrive = (f: number, at: number, film?: F) => {
  const t = clamp(refT(f, at, fpsOf(film)) / MOVES.ladder.arrive.frames);
  return MOVES.ladder.arrive.px * uOf(film) * 2 ** (-8 * t) * (1 - t);
};

/** Make room: how far a gap of `gap` px has opened at frame f (66 % on the first frame, a short geometric tail). */
export const makeRoom = (f: number, at: number, gap: number, film?: F) => gap * snapShare(f, at, film, MOVES.room.first, MOVES.room.q);

/** A click bloom from frame `at`: radius 150 -> 580 px (1080p) over 18 frames (30 fps), half intensity at the start, gone at the end. */
export const clickBloom = (f: number, at: number, film?: F) => {
  const B = MOVES.bloom;
  const t = refT(f, at, fpsOf(film)) / B.frames;
  if (t < 0 || t >= 1) return null;
  const e = 1 - (1 - t) ** 3;
  return { r: (B.r0 + (B.r1 - B.r0) * e) * uOf(film), opacity: B.peak * (1 - t) ** 1.6 };
};

/** A selection ring from frame `at`: it grows from 6 to 24 px outside the element (1080p) in 6 frames (30 fps), 2 px wide, a 14 px glow at 0.35. */
export const selectRing = (f: number, at: number, film?: F) => {
  const R = MOVES.ring;
  if (f < at) return null;
  const t = clamp(refT(f, at, fpsOf(film)) / R.frames);
  const e = 1 - 2 ** (-8 * t);
  const u = uOf(film);
  return { out: (R.from + (R.out - R.from) * e) * u, width: R.width * u, glow: R.glow * u, glowAlpha: R.glowAlpha, opacity: clamp(t * 4) };
};

/**
 * A glyph light sweep across an element `span` px wide (1080p): a band of `band` px at `angle` degrees crossing at
 * `speed` px per 30 fps frame, peak `peak`, never longer than 25 frames (faster if the span needs it). Returns the band
 * centre in px from the element's left edge (it starts a band-width outside the left edge), and its opacity.
 */
export const glyphSweep = (f: number, at: number, span: number, film?: F, o: { band?: number; speed?: number; peak?: number } = {}) => {
  const S = MOVES.sweep;
  const band = o.band ?? S.band;
  const travel = span + 2 * band;
  const speed = Math.max(o.speed ?? S.speed, travel / S.maxFrames);
  const t = refT(f, at, fpsOf(film));
  const frames = travel / speed;
  if (t < 0 || t > frames) return null;
  const u = uOf(film);
  const p = t / frames;
  return { x: (-band + travel * p) * u, band: band * u, angle: S.angle, opacity: (o.peak ?? S.peak) * Math.sin(Math.PI * clamp(p * 1.15)) ** 0.5 };
};

/**
 * A rim streak on a box w x h (1080p px): a bright core 3 x 170 px travelling clockwise from the top-left corner along
 * `share` of the perimeter (0.5: the top and the right edge) in `frames` (30 fps) on an ease-out. Returns its centre,
 * the edge's angle (deg) and its opacity.
 */
export const rimStreak = (f: number, at: number, box: { w: number; h: number }, film?: F, o: { share?: number; frames?: number } = {}) => {
  const S = MOVES.streak;
  const t = refT(f, at, fpsOf(film)) / (o.frames ?? S.frames);
  if (t < 0 || t > 1) return null;
  const u = uOf(film);
  const { w, h } = box;
  const per = 2 * (w + h);
  const e = 1 - (1 - t) ** 2;
  let d = per * (o.share ?? S.share) * e;
  const seg: [number, number, number, number, number][] = [[0, 0, 1, 0, w], [w, 0, 0, 1, h], [w, h, -1, 0, w], [0, h, 0, -1, h]];
  for (const [x0, y0, dx, dy, len] of seg) {
    if (d <= len) return { x: (x0 + dx * d) * u, y: (y0 + dy * d) * u, angle: (Math.atan2(dy, dx) * 180) / Math.PI, opacity: Math.sin(Math.PI * t) ** 0.6 };
    d -= len;
  }
  return null;
};
