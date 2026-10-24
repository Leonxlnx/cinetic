import React from 'react';
import { spring } from 'remotion';
import { clamp, E, type Ease, M, mix, SPR, type Spr } from '../lib/anim';
import { mixColor, mixRgb } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import { C } from '../brand/tokens';
import { type Logo, type LogoPart, LogoMark, type PieceXf } from '../brand/Mark';
import type { Declares } from '../timeline';

/**
 * Logo devices for the end of a film, from the brand's own mark (a supplied SVG split into parts by
 * brand/Mark.tsx logoParts(), or the starter's sample mark):
 *
 *   assemble  the mark is built from parts that arrive from alternating frame edges with uneven gaps
 *             (house 4/3/3/7/7/4 frames at 24 fps): long thin parts shoot in at constant speed and stop
 *             dead (the impact is the stop), panels arrive front-loaded, small details pop last.
 *   lockup    the mark shrinks a little (ease in), snaps to half its size in ONE frame on the hit,
 *             settles x0.68, then slides to make room (M.lockup, 17 frames at 25 fps, peak speed past
 *             the middle) while the name rises in from the slide's middle; then it locks.
 *   swing     the mark swings in with an anticipation (a back-swing of ~16 degrees over 2 frames) into
 *             the one logo spring (SPR.logoSwing, about 16 % over), its scale falling exponentially
 *             (tau 12 frames at 24 fps), then a slow recede.
 *   hotGlyphs letters of the name arrive on a grid (house every 6 frames at 60 fps) born in the accent
 *             and cool to ink (house 44 frames). Cooling only: a bloom or halo is a glow, allowed only
 *             when the brand supplies it (`cinetic:brand-supplied glow` in the film, BRIEF.md), and then
 *             as a baked plate whose opacity follows haloLevel(), never an animated blur.
 *
 * The default lockup is the film's own device (the last move of the story's object lands as the mark),
 * never a mark centred over a radial glow.
 */

const f = Math.round;

// ------------------------------------------------------------------------------------------ assemble

export type Edge = 'left' | 'right' | 'top' | 'bottom';
export type AssemblePart = {
  id?: string;
  from: Edge | [number, number]; // a frame edge, or an explicit offset (px) the part starts at
  at: number; // first frame the part is visible (whole frame)
  dur?: number; // frames to land (house: a stripe 6, a panel 9 at 24 fps)
  curve?: 'stop' | Ease; // 'stop' = constant speed, hard stop; or an arrive ease (house E.softOut: fast first frame)
  distance?: number; // travel px (house: from just outside its edge, given `box`)
  box?: { x: number; y: number; w: number; h: number }; // where the part lands, frame px (for the house distance)
  pop?: boolean; // a detail: appears whole on `at`, no travel
  lead?: number; // share of one step already travelled on the first visible frame (house 1: a full step)
};

export type AssembleProps = { parts: AssemblePart[]; id?: string };
export type AssemblePartState = { id: string; dx: number; dy: number; on: boolean; done: boolean; t: number };

export const ASSEMBLE = { gaps24: [4, 3, 3, 7, 7, 4], stripe24: 6, panel24: 9, pop24: 1 } as const;

const edgeVec = (e: Edge): [number, number] => (e === 'left' ? [-1, 0] : e === 'right' ? [1, 0] : e === 'top' ? [0, -1] : [0, 1]);

/** The house travel for a part: from just outside its edge of the frame to where it lands. */
export const edgeDistance = (e: Edge, box: { x: number; y: number; w: number; h: number }, W: number, H: number) =>
  e === 'left' ? box.x + box.w : e === 'right' ? W - box.x : e === 'top' ? box.y + box.h : H - box.y;

/** Every part's offset from its landed place at frame fr (whole frames: a stop is exact). Pure. */
export const assembleState = (frame: number, p: AssembleProps, film?: Partial<FilmCtx>): AssemblePartState[] => {
  const fps = fpsOf(film);
  const W = film?.width ?? 1920;
  const H = film?.height ?? 1080;
  const fr = f(frame);
  return p.parts.map((pt, i) => {
    const id = pt.id ?? `p${i}`;
    if (fr < pt.at) return { id, dx: NaN, dy: NaN, on: false, done: false, t: 0 };
    if (pt.pop) return { id, dx: 0, dy: 0, on: true, done: true, t: 1 };
    const dur = Math.max(1, pt.dur ?? f60x(pt.curve === 'stop' ? ASSEMBLE.stripe24 * 2.5 : ASSEMBLE.panel24 * 2.5, fps));
    const lead = pt.lead ?? 1;
    const j = fr - pt.at; // 0 on the first visible frame
    const u = clamp((j + lead) / dur);
    const t = pt.curve === 'stop' ? u : (pt.curve ?? E.softOut)(u);
    let vx = 0;
    let vy = 0;
    if (Array.isArray(pt.from)) [vx, vy] = pt.from;
    else {
      const [ex, ey] = edgeVec(pt.from);
      const D = pt.distance ?? (pt.box ? edgeDistance(pt.from, pt.box, W, H) : pt.from === 'left' || pt.from === 'right' ? W : H);
      vx = ex * D;
      vy = ey * D;
    }
    return { id, dx: vx * (1 - t), dy: vy * (1 - t), on: true, done: u >= 1, t };
  });
};

/**
 * Onsets, landing frames (the first frame a part sits within half a pixel of its place) and the whole
 * build's length (first onset to last landing, inclusive).
 */
export const assembleFrames = (p: AssembleProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const rows = p.parts.map((pt, i) => {
    if (pt.pop) return { at: pt.at, landed: pt.at };
    const dur = Math.max(1, pt.dur ?? f60x(pt.curve === 'stop' ? ASSEMBLE.stripe24 * 2.5 : ASSEMBLE.panel24 * 2.5, fps));
    let landed = pt.at + Math.ceil(dur);
    for (let fr = pt.at; fr <= pt.at + Math.ceil(dur) + 1; fr++) {
      const s = assembleState(fr, { parts: [pt] }, film)[0];
      if (Math.hypot(s.dx, s.dy) < 0.5) {
        landed = fr;
        break;
      }
    }
    void i;
    return { at: pt.at, landed };
  });
  const first = Math.min(...rows.map((r) => r.at));
  const last = Math.max(...rows.map((r) => r.landed));
  return { onsets: rows.map((r) => r.at), landed: rows.map((r) => r.landed), first, last, length: last - first + 1 };
};

/**
 * A house assembly plan for a parsed logo placed at (x, y) with `size` px per 100 mark units: parts
 * alternate edges (the side each part sits on decides, alternating left/right then top/bottom), onsets on
 * the house uneven gaps, long thin parts as stripes ('stop'), the rest as panels, parts under `detail` of
 * the mark's area pop last.
 */
export const assembleFor = (logo: Logo, o: { start: number; x: number; y: number; size: number; gaps?: number[]; detail?: number; order?: string[] }, film?: Partial<FilmCtx>): AssemblePart[] => {
  const fps = fpsOf(film);
  const k = o.size / 100;
  const total = Math.max(1e-6, logo.box.w * logo.box.h);
  const parts = o.order ? (o.order.map((id) => logo.parts.find((q) => q.id === id)).filter(Boolean) as LogoPart[]) : logo.parts;
  const gaps = (o.gaps ?? ASSEMBLE.gaps24.map((g) => f60x(g * 2.5, fps))).map((g) => Math.max(1, Math.round(g)));
  const details = parts.filter((q) => (q.box.w * q.box.h) / total < (o.detail ?? 0.03));
  const main = parts.filter((q) => !details.includes(q));
  const out: AssemblePart[] = [];
  let at = o.start;
  main.forEach((q, i) => {
    const box = { x: o.x + q.box.x * k, y: o.y + q.box.y * k, w: q.box.w * k, h: q.box.h * k };
    const aspect = Math.max(box.w, box.h) / Math.max(1, Math.min(box.w, box.h));
    const horiz = box.w >= box.h;
    const leftHalf = q.cx < logo.box.x + logo.box.w / 2;
    const topHalf = q.cy < logo.box.y + logo.box.h / 2;
    const from: Edge = horiz ? (i % 2 === 0 ? (leftHalf ? 'left' : 'right') : leftHalf ? 'right' : 'left') : topHalf ? 'top' : 'bottom';
    out.push({ id: q.id, from, at, box, curve: aspect > 4 ? 'stop' : E.softOut, dur: f60x((aspect > 4 ? ASSEMBLE.stripe24 : ASSEMBLE.panel24) * 2.5, fps) });
    at += gaps[i % gaps.length];
  });
  for (const q of details) {
    out.push({ id: q.id, from: 'left', at, pop: true });
    at += Math.max(1, Math.round(f60x(5, fps)));
  }
  return out;
};

/** A parsed logo assembling at (x, y), `size` px per 100 units; parts not yet on are not drawn. `frame` is local. */
export const AssembledMark: React.FC<AssembleProps & { logo: Logo; frame: number; x: number; y: number; size: number; fill?: (part: LogoPart, i: number) => string | undefined }> = (props) => {
  const film = useFilm();
  const st = assembleState(props.frame, props, film);
  const k = props.size / 100;
  const byId = new Map(st.map((s) => [s.id, s]));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${props.x}px, ${props.y}px)` }}>
      <LogoMark
        logo={props.logo}
        size={props.size}
        only={props.logo.parts.filter((q) => byId.get(q.id)?.on).map((q) => q.id)}
        poses={(q) => {
          const s = byId.get(q.id);
          return s && s.on ? { x: s.dx / k, y: s.dy / k } : undefined;
        }}
        fill={props.fill}
      />
    </div>
  );
};

// -------------------------------------------------------------------------------------------- lockup

export type LockupProps = {
  at: number; // first frame of the shrink (the mark is at scale 1 on it)
  shrink?: { frames?: number; to?: number; ease?: Ease; hold?: number }; // house 3 f@25 to 0.846 on E.buildIn, 1 held frame
  snap?: { ratio?: number }; // the one-frame snap (house 0.5)
  settle?: { frames?: number; ratio?: number; ease?: Ease }; // house 9 f@25, x0.68 on E.glideOut
  slide?: false | { delay?: number; frames?: number; px?: number; ease?: Ease }; // house: on the settle's last frame, 17 f@25, M.lockup
  wordmark?: false | { at?: 'mid' | number; frames?: number; rise?: number; ease?: Ease }; // house: from the slide's middle, 14 f@25, rises 44 px, E.snapOut
};

export type LockupState = {
  scale: number;
  x: number; // slide offset, px (0 -> -px)
  phase: 'before' | 'shrink' | 'hold' | 'snap' | 'settle' | 'slide' | 'lock';
  wordmark: { on: boolean; t: number; y: number; opacity: number };
};

const lockupTimes = (p: LockupProps, fps: number) => {
  const k = fps / 25;
  const sh = p.shrink ?? {};
  const nS = Math.round(sh.frames ?? 3 * k);
  const hold = Math.round(sh.hold ?? 1);
  const snap = p.at + nS + hold + 1; // the snap frame
  const nSet = Math.round(p.settle?.frames ?? 9 * k);
  const settled = snap + nSet;
  const sl = p.slide === false ? null : p.slide ?? {};
  const slideAt = sl ? settled + Math.round(sl.delay ?? 0) : settled;
  const nSl = sl ? (sl.frames ?? 17 * k) : 0;
  const wm = p.wordmark === false ? null : p.wordmark ?? {};
  const wAt = wm ? (typeof wm.at === 'number' ? wm.at : Math.round(slideAt + nSl / 2)) : Infinity;
  return { nS, hold, snap, nSet, settled, slideAt, nSl, wAt, wFrames: wm ? (wm.frames ?? 14 * k) : 0, lock: Math.max(slideAt + Math.ceil(nSl), wm ? wAt + Math.ceil(wm.frames ?? 14 * k) : 0) };
};

/** The lockup at frame fr: mark scale, slide offset, the name's entrance. Whole frames decide the snap. Pure. */
export const lockupState = (frame: number, p: LockupProps, film?: Partial<FilmCtx>): LockupState => {
  const fps = fpsOf(film);
  const T = lockupTimes(p, fps);
  const fr = f(frame);
  const to = p.shrink?.to ?? 0.846;
  const ratio = p.snap?.ratio ?? 0.5;
  const sr = p.settle?.ratio ?? 0.68;
  let scale = 1;
  let phase: LockupState['phase'] = 'before';
  if (fr > p.at && fr <= p.at + T.nS) {
    scale = mix(1, to, (p.shrink?.ease ?? E.buildIn)((fr - p.at) / T.nS));
    phase = 'shrink';
  } else if (fr > p.at + T.nS && fr < T.snap) {
    scale = to;
    phase = 'hold';
  } else if (fr === T.snap) {
    scale = to * ratio;
    phase = 'snap';
  } else if (fr > T.snap) {
    const t = clamp((fr - T.snap) / Math.max(1, T.nSet));
    scale = to * ratio * mix(1, sr, (p.settle?.ease ?? E.glideOut)(t));
    phase = fr <= T.settled ? 'settle' : 'slide';
  }
  let x = 0;
  if (p.slide !== false && p.slide) {
    const t = clamp((frame - T.slideAt) / Math.max(1e-6, T.nSl));
    x = -(p.slide.px ?? 0) * (p.slide.ease ?? M.lockup)(t);
    if (fr > T.slideAt + T.nSl) phase = 'lock';
  } else if (fr > T.settled) phase = 'lock';
  const wm = p.wordmark === false ? null : p.wordmark ?? {};
  let word = { on: false, t: 0, y: 0, opacity: 0 };
  if (wm && fr >= T.wAt) {
    const t = (wm.ease ?? E.snapOut)(clamp((frame - T.wAt + 1) / Math.max(1e-6, T.wFrames)));
    word = { on: true, t, y: (wm.rise ?? 44) * (film?.height ?? 1080) / 1080 * (1 - t), opacity: t };
  }
  return { scale, x, phase, wordmark: word };
};

/** The lockup's frames: snap (the hit), settled, slide start and end, the name's first frame, the lock. */
export const lockupFrames = (p: LockupProps, film?: Partial<FilmCtx>) => {
  const T = lockupTimes(p, fpsOf(film));
  return { snap: T.snap, settled: T.settled, slideStart: T.slideAt, slideEnd: T.slideAt + T.nSl, wordmark: T.wAt, lock: T.lock };
};

/**
 * A lockup: `mark` (any node, drawn at `markSize` px, centred on (x, y) at scale 1) and `name` (placed
 * to the right of the landed mark by the caller's layout, rising in). `frame` is local.
 */
export const Lockup: React.FC<LockupProps & { frame: number; x: number; y: number; markSize: number; mark: React.ReactNode; name?: React.ReactNode; nameAt?: [number, number] }> = (props) => {
  const film = useFilm();
  const lk = lockupState(props.frame, props, film);
  const half = props.markSize / 2;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: props.markSize, height: props.markSize, transformOrigin: '50% 50%', transform: `translate(${props.x - half + lk.x}px, ${props.y - half}px) scale(${lk.scale})` }}>{props.mark}</div>
      {props.name && lk.wordmark.on && (
        <div data-text style={{ position: 'absolute', left: 0, top: 0, opacity: lk.wordmark.opacity, transform: `translate(${(props.nameAt ?? [props.x, props.y])[0]}px, ${(props.nameAt ?? [props.x, props.y])[1] + lk.wordmark.y}px)` }}>
          {props.name}
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------------------------------------- swing

export type SwingProps = {
  at: number; // first frame (the mark at `from`)
  from?: number; // angle, degrees (house 70: it swings back to 0)
  to?: number; // house 0
  back?: number; // anticipation: degrees away from `to` first (house 16)
  backFrames?: number; // house 2 f@24
  spring?: Spr; // house SPR.logoSwing
  scaleFrom?: number; // house 2.14
  tau?: number; // scale's exponential time constant, frames (house 12.2 f@24)
  recede?: { at: number; perFrame?: number }; // a slow recede after the settle (house 0.3 % a frame at 24 fps)
  spin?: { at: number; degPerSec: number }; // a slow turn that keeps the held mark alive (hold life), from `at`
};

/** The swing at frame fr: angle (degrees), scale. Closed form (Remotion spring sampled at the frame). Pure. */
export const swingState = (frame: number, p: SwingProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const from = p.from ?? 70;
  const to = p.to ?? 0;
  const dir = Math.sign(to - from) || 1;
  const back = p.back ?? 16;
  const nb = p.backFrames ?? (2 * fps) / 24;
  const t = frame - p.at;
  let angle = from;
  if (t > 0 && t <= nb) angle = from - dir * back * E.softOut(t / nb);
  else if (t > nb) {
    const s = spring({ frame: t - nb, fps, config: p.spring ?? SPR.logoSwing });
    angle = from - dir * back + (to - (from - dir * back)) * s;
  }
  const tau = p.tau ?? (12.2 * fps) / 24;
  let scale = t <= 0 ? (p.scaleFrom ?? 2.14) : 1 + ((p.scaleFrom ?? 2.14) - 1) * Math.exp(-t / tau);
  if (p.recede && frame > p.recede.at) scale *= (1 - (p.recede.perFrame ?? 0.003 * (24 / fps))) ** (frame - p.recede.at);
  if (p.spin && frame > p.spin.at) angle += (p.spin.degPerSec * (frame - p.spin.at)) / fps;
  return { angle, scale };
};

/** Overshoot of a swing's spring as a share of its travel (for checks): Remotion spring sampled per frame. */
export const swingOvershoot = (p: SwingProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  let max = 0;
  for (let i = 0; i < fps * 4; i++) max = Math.max(max, spring({ frame: i, fps, config: p.spring ?? SPR.logoSwing }));
  return max - 1;
};

// ---------------------------------------------------------------------------------------- hot glyphs

export type HotGlyphProps = {
  start: number; // the first letter's frame (on the beat)
  every?: number; // frames between letters (house 6 f@60)
  hold?: number; // frames at full heat after birth (house 0)
  cool?: number; // frames to cool (house 44 f@60)
  curve?: Ease; // cooling progress (house E.stdInOut)
  accent?: string; // the heat colour (house C.accent)
  born?: string; // colour on the birth frame when it differs (a paler step of the accent); it reaches `accent` over `peak` frames
  peak?: number; // frames from birth to the full accent (house 0: born at the accent)
  ink?: string; // cooled colour (house C.ink; on a dark ground pass the type colour)
  space?: 'srgb' | 'oklab';
};

/** Letter i at frame fr: on, cooling progress t (0 born hot -> 1 cooled), its colour. Pure. */
export const hotGlyphState = (frame: number, i: number, p: HotGlyphProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const every = p.every ?? f60x(6, fps);
  const born = Math.round(p.start + i * every);
  const fr = f(frame);
  if (fr < born) return { on: false, t: 0, born, color: p.accent ?? C.accent };
  const cool = p.cool ?? f60x(44, fps);
  const pk = p.peak ?? 0;
  const t = (p.curve ?? E.stdInOut)(clamp((frame - born - pk - (p.hold ?? 0)) / Math.max(1e-6, cool)));
  const a = p.accent ?? C.accent;
  const b = p.ink ?? C.ink;
  const mixer = (p.space ?? 'srgb') === 'srgb' ? mixRgb : mixColor;
  if (pk > 0 && p.born && frame - born < pk) return { on: true, t: 0, born, color: mixer(p.born, a, E.softOut(clamp((frame - born) / pk))) };
  return { on: true, t, born, color: mixer(a, b, t) };
};

/** The heat of the whole name at frame fr (mean of (1 - t) over born letters, 0..1): drives a brand-supplied halo plate. */
export const haloLevel = (frame: number, n: number, p: HotGlyphProps, film?: Partial<FilmCtx>) => {
  let s = 0;
  for (let i = 0; i < n; i++) {
    const g = hotGlyphState(frame, i, p, film);
    if (g.on) s += 1 - g.t;
  }
  return s / Math.max(1, n);
};

/** A name whose letters arrive hot and cool (data-text on the whole word; letters are spans). */
export const HotGlyphs: React.FC<HotGlyphProps & { text: string; frame: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const letters = [...props.text];
  return (
    <span data-text={props.text} style={{ whiteSpace: 'pre', ...props.style }}>
      {letters.map((ch, i) => {
        const g = hotGlyphState(props.frame, i, props, film);
        return (
          <span key={i} style={{ color: g.color, opacity: g.on ? 1 : 0 }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

// ---------------------------------------------------------------------------------------- tracking

/** Tracking as a device: letter spacing (em) from `from` to `to` over `frames` (house +0.032 -> 0 over 10 f@60 on E.softOut). */
export const trackingState = (frame: number, p: { at: number; from?: number; to?: number; frames?: number; ease?: Ease }, film?: Partial<FilmCtx>) =>
  mix(p.from ?? 0.032, p.to ?? 0, (p.ease ?? E.softOut)(clamp((frame - p.at) / Math.max(1e-6, p.frames ?? f60x(10, fpsOf(film))))));

// ------------------------------------------------------------------------------------- declarations

/**
 * The lockup's snap is a one-frame scale step (a `stepped` seam inside the shot: one sample on it); a
 * stripe's hard stop is continuous. Pass `lockup` and/or `assemble` props.
 */
export const declares = (p?: { lockup?: LockupProps; assemble?: AssembleProps; id?: string }, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (p?.lockup) {
    const t = lockupFrames(p.lockup, film);
    out.stepped!.push({ from: t.snap, to: t.snap + 1, id: p.id ?? 'lockup' });
  }
  return out;
};

export type { PieceXf };
