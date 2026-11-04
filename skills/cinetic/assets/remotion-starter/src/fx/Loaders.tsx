import React from 'react';
import { ACCEL, clamp, E, type Ease, fd, lmix, mix, prog, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { C } from '../brand/tokens';
import { gapsToOnsets } from './deviceUtil';
import type { Declares, SteppedRange } from '../timeline';

/**
 * Loaders: the product working, drawn small and exact.
 *
 *   BlockLoader  a tiny grid of accent squares (4 x 4, 22 px cells on a 46 px pitch): one row lit at full
 *                strength with a dimmer trail row behind it steps down the block on the music's onsets
 *                (irregular holds), the other rows sit at a faint level (they step down to it in four
 *                linear frames when the loader starts), and tiled copies each run their own schedule so a
 *                field of them shimmers. It can zoom in until its grid becomes the screen's grid.
 *   ArcLoader    a dot becomes a short dash, then an arc that grows on an accelerating curve to about 300
 *                degrees while it turns, closes into a ring, and the core swells into the button (30 f).
 *   StepList     the agent's step list: each row cuts on with a spinner and a coloured verb at partial ink,
 *                the line fades up, the spinner turns into a check (a 3 f swap) and the verb drains to ink as
 *                the next row arrives; the list jumps a row unanimated (or in short expo steps); the cadence
 *                of rows shortens toward the end (house gaps 18, 18, 14, 10, 8, 6, 6 f at 60 fps).
 *   QuadLoader   the tiny 2 x 2 loader: four squares step clockwise through three strengths (100 / 38 / 17 %),
 *                a hard step every 4-7 f (put it on 16ths); it can hold all four solid (a mark) and its head
 *                cell can show a picture (each step a new take), so the loader grows into tiles.
 *
 * Every state is a pure function of the frame; discrete changes decide on whole frames.
 */

// ---------------------------------------------------------------------------------------------- BlockLoader

/** House numbers: px at 1080p, frames at 60 fps. */
export const BLOCK_LOADER = {
  cols: 4,
  rows: 4,
  cell: 22,
  pitch: 46,
  levels: { lit: 1, trail: 0.38, rest: 0.17 },
  holds60: [17.5, 7.5, 2.5, 7.5, 2.5] as number[], // lit row 1, 2, 3, 4, then one blank beat
  irregular60: [2.5, 17.5] as [number, number], // a copy's own schedule: holds of 1-7 frames at 24 fps
  dim60: 10,
  dimSteps: 4,
  zoom60: 18,
} as const;

export type BlockLoaderProps = {
  start: number; // first frame (all rows lit; the rest steps down to its level over `dim`)
  cols?: number;
  rows?: number;
  cell?: number; // px at 1080p
  pitch?: number;
  steps?: number[]; // explicit frames where the lit row advances (put them on drum onsets)
  holds?: number[]; // or holds in 60 fps frames, cycled (house 17.5, 7.5, 2.5, 7.5, 2.5)
  seed?: string | number; // with no steps or holds: an irregular schedule of its own (a tiled copy)
  phase?: number; // frames this copy runs behind the master clock
  levels?: { lit?: number; trail?: number; rest?: number };
  dim?: false | { frames?: number; steps?: number }; // 60 fps frames (house 10 in 4 linear steps)
  zoom?: { at: number; to: number; frames?: number; ease?: Ease }; // house 18 f on E.launchIn
  id?: string;
};

export type BlockCell = { col: number; row: number; x: number; y: number; opacity: number };

/** Frames where the lit row changes (whole frames, the first is `start`), up to `until`. */
export const blockLoaderSteps = (p: BlockLoaderProps, until: number, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  const start = p.start + (p.phase ?? 0);
  if (p.steps?.length) return [start, ...p.steps.map((s) => s + (p.phase ?? 0)).filter((s) => s > start)];
  const out: number[] = [];
  let t = start;
  for (let i = 0; Math.round(t) <= until && i < 100000; i++) {
    out.push(Math.round(t));
    if (p.holds?.length || p.seed === undefined) {
      const h = p.holds?.length ? p.holds : BLOCK_LOADER.holds60;
      t += f60x(h[i % h.length], fps);
    } else {
      const [a, b] = BLOCK_LOADER.irregular60;
      t += f60x(a + Math.floor(rand(`${p.seed}:hold:${i}`) * ((b - a) / 2.5 + 1)) * 2.5, fps);
    }
  }
  return out;
};

/** Every cell's opacity at frame f, centred on (0, 0); the lit row (-1 = none) and the zoom factor. */
export const blockLoaderState = (frame: number, p: BlockLoaderProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const cols = p.cols ?? BLOCK_LOADER.cols;
  const rows = p.rows ?? BLOCK_LOADER.rows;
  const pitch = (p.pitch ?? BLOCK_LOADER.pitch) * u;
  const lv = { ...BLOCK_LOADER.levels, ...(p.levels ?? {}) };
  const F = fd(frame);
  const start = p.start + (p.phase ?? 0);
  const steps = F >= start ? blockLoaderSteps(p, F, film) : [];
  const j = steps.filter((s) => s <= F).length - 1; // index of the current state
  const cyc = rows + 1; // rows, then one blank
  const lit = j < 0 ? -1 : j % cyc === rows ? -1 : j % cyc;
  const prev = j <= 0 ? -1 : (j - 1) % cyc === rows ? -1 : (j - 1) % cyc;
  // the rest level steps down from full in `dim.steps` linear frames
  let rest = lv.rest;
  if (p.dim !== false) {
    const df = f60x(p.dim?.frames ?? BLOCK_LOADER.dim60, fps);
    const n = p.dim?.steps ?? BLOCK_LOADER.dimSteps;
    const k = Math.min(n, Math.floor(((F - start) / Math.max(1e-6, df)) * n + 1e-9));
    rest = k < 0 ? 1 : mix(1, lv.rest, k / n);
  }
  const cells: BlockCell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const opacity = j < 0 ? 0 : r === lit ? lv.lit : r === prev && lit !== -1 ? Math.max(rest, lv.trail) : rest;
      cells.push({ col: c, row: r, x: (c - (cols - 1) / 2) * pitch, y: (r - (rows - 1) / 2) * pitch, opacity });
    }
  const z = p.zoom;
  const k = z ? lmix(1, z.to, (z.ease ?? E.launchIn)(clamp((frame - z.at) / Math.max(1, f60x(z.frames ?? BLOCK_LOADER.zoom60, fps))))) : 1;
  return { lit, step: j, cells, k };
};

/** Draws the block (centred on x, y): flat rounded squares in `color`. */
export const BlockLoader: React.FC<BlockLoaderProps & { frame: number; x: number; y: number; color?: string; radius?: number }> = (props) => {
  const film = useFilm();
  const s = blockLoaderState(props.frame, props, film);
  const cell = (props.cell ?? BLOCK_LOADER.cell) * uOf(film);
  const r = (props.radius ?? 3) * uOf(film);
  const color = props.color ?? C.accent;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(${props.x}px, ${props.y}px) scale(${s.k.toFixed(5)})` }} aria-hidden>
      {s.cells.map((c) => (c.opacity > 0 ? <div key={`${c.col}-${c.row}`} style={{ position: 'absolute', left: c.x - cell / 2, top: c.y - cell / 2, width: cell, height: cell, borderRadius: r, background: color, opacity: c.opacity }} /> : null))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- ArcLoader

/** House numbers: degrees, frames at 60 fps (30 f in all). */
export const ARC_LOADER = { dot60: 3, grow60: 15, to: 300, spin60: 6, close60: 4, core60: 8 } as const;

export type ArcLoaderProps = {
  at: number;
  r: number; // ring radius, px
  dot?: number; // 60 fps frames as a dot (house 3)
  grow?: { to?: number; frames?: number; ease?: Ease }; // degrees (house 300) over 60 fps frames (house 15) on E.buildIn
  spin?: number; // degrees per 60 fps frame (house 6)
  close?: number; // 60 fps frames to close the ring (house 4)
  core?: { to: number; from?: number; frames?: number; ease?: Ease }; // the core's radius px (house 8 f on E.snapOut)
  id?: string;
};

export type ArcLoaderState = { phase: 'off' | 'dot' | 'arc' | 'ring' | 'core'; start: number; sweep: number; closed: boolean; coreR: number };

/** The arc's start angle and sweep (degrees, 0 = up, clockwise), whether it closed, and the core's radius. */
export const arcLoaderState = (frame: number, p: ArcLoaderProps, film?: Partial<FilmCtx>): ArcLoaderState => {
  const fps = fpsOf(film);
  const dot = f60x(p.dot ?? ARC_LOADER.dot60, fps);
  const gf = Math.max(1, f60x(p.grow?.frames ?? ARC_LOADER.grow60, fps));
  const to = p.grow?.to ?? ARC_LOADER.to;
  const cf = Math.max(1, f60x(p.close ?? ARC_LOADER.close60, fps));
  const kf = Math.max(1, f60x(p.core?.frames ?? ARC_LOADER.core60, fps));
  const t = frame - p.at;
  if (t < 0) return { phase: 'off', start: 0, sweep: 0, closed: false, coreR: 0 };
  const spin = ((p.spin ?? ARC_LOADER.spin60) * 60) / fps;
  const start = spin * Math.min(t, dot + gf + cf);
  const g0 = dot;
  const c0 = dot + gf;
  const k0 = dot + gf + cf;
  const growth = (p.grow?.ease ?? E.buildIn)(clamp((t - g0) / gf));
  let sweep = to * growth;
  if (t >= c0) sweep = mix(to, 360, clamp((t - c0) / cf));
  const coreR = p.core ? mix(p.core.from ?? 0, p.core.to, (p.core.ease ?? E.snapOut)(clamp((t - k0) / kf))) : 0;
  const phase = t < g0 ? 'dot' : t < c0 ? 'arc' : t < k0 ? 'ring' : 'core';
  return { phase, start, sweep, closed: t >= k0, coreR };
};

/** Sync: the dot, the arc start, the closing (a small click) and the core's landing. */
export const arcLoaderFrames = (p: ArcLoaderProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const dot = f60x(p.dot ?? ARC_LOADER.dot60, fps);
  const gf = f60x(p.grow?.frames ?? ARC_LOADER.grow60, fps);
  const cf = f60x(p.close ?? ARC_LOADER.close60, fps);
  const kf = f60x(p.core?.frames ?? ARC_LOADER.core60, fps);
  return { dot: p.at, arc: Math.round(p.at + dot), closed: Math.round(p.at + dot + gf + cf), core: Math.round(p.at + dot + gf + cf + kf) };
};

/** Draws the ring stroke (round caps) and the core, centred on (x, y). */
export const ArcLoader: React.FC<ArcLoaderProps & { frame: number; x: number; y: number; color: string; coreColor?: string; width?: number; children?: React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = arcLoaderState(props.frame, props, film);
  if (s.phase === 'off') return null;
  const w = (props.width ?? 6) * uOf(film);
  const C0 = 2 * Math.PI * props.r;
  const len = (Math.max(0.0001, s.sweep) / 360) * C0;
  const R = props.r + w;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${props.x - R}px, ${props.y - R}px)` }}>
      <svg width={2 * R} height={2 * R} viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
        {s.coreR > 0 && <circle cx={0} cy={0} r={s.coreR} fill={props.coreColor ?? props.color} />}
        <circle cx={0} cy={0} r={props.r} fill="none" stroke={props.color} strokeWidth={w} strokeLinecap="round" strokeDasharray={s.closed ? undefined : `${len.toFixed(2)} ${(C0 + 10).toFixed(2)}`} transform={`rotate(${(s.start - 90).toFixed(2)})`} />
      </svg>
      {props.children && s.coreR > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(R - s.coreR).toFixed(2)}px, ${(R - s.coreR).toFixed(2)}px)`, width: 2 * s.coreR, height: 2 * s.coreR, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp(s.coreR / Math.max(1, props.core?.to ?? 1)) }}>{props.children}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- StepList

/** House numbers: frames at 60 fps, px at 1080p. */
export const STEP_LIST = { rowH: 76, spin60: 20, partial: 0.45, inkDelay60: 6, fade60: 14, swap60: 3, drain60: 6, window: 4, jump60: 8, lastDone60: 36 } as const;

export type StepListProps = {
  rows: { at: number; done?: number; pending?: boolean }[]; // each row's cut-on frame; done = its check (default: the next row's onset); pending: it never checks and pales to the mute ink
  rowH?: number; // px at 1080p
  window?: number; // rows visible before the list starts to jump (house 4)
  jump?: 'snap' | 'expo'; // snap: one frame, unanimated (house); expo: a short E.jump step
  jumpBy?: number; // rows per jump (1, or 0.5 for half-row steps)
  jumpFrames?: number; // expo: 60 fps frames (house 8)
  spin?: number; // spinner degrees per 60 fps frame (house 20: 120 deg per 3 f at 30 fps)
  partial?: number; // the words' ink when they step in (house 0.45)
  inkDelay?: number; // 60 fps frames before the line fades up (house 6)
  fade?: number; // 60 fps frames of the fade up (house 14)
  swap?: number; // spinner -> check, 60 fps frames (house 3)
  drain?: number; // the verb's accent drains to ink, 60 fps frames (house 6)
  rise?: number; // px at 1080p a new row rises inside the stack as it steps in (0: none; a run of agent steps: 18)
  riseFrames?: number; // 60 fps frames of that rise on E.snapOut (house 20)
  id?: string;
};

export type StepRowState = { i: number; visible: boolean; y: number; ink: number; spin: number; check: number; accent: number; pending: number };

/** Row onsets on the house cadence: gaps shorten toward the end (ACCEL.rows, 60 fps frames), from `start`. */
export const stepCadence = (start: number, n: number, film?: Partial<FilmCtx>, gaps60: readonly number[] = ACCEL.rows): number[] => {
  const g = Array.from({ length: Math.max(0, n - 1) }, (_, i) => gaps60[Math.min(i, gaps60.length - 1)]);
  return gapsToOnsets(start, g, fpsOf(film));
};

/** The list offset (px the list has moved up) and every row's state at frame f. Pure. */
export const stepListState = (frame: number, p: StepListProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const F = fd(frame);
  const rowH = (p.rowH ?? STEP_LIST.rowH) * u;
  const win = p.window ?? STEP_LIST.window;
  const by = p.jumpBy ?? 1;
  const n = p.rows.length;
  // the list jumps each time a row beyond the window arrives
  let offset = 0;
  for (let i = win; i < n; i++) {
    const at = p.rows[i].at;
    if ((p.jump ?? 'snap') === 'snap') offset += F >= at ? by * rowH : 0;
    else offset += by * rowH * E.jump(clamp((frame - at) / Math.max(1, f60x(p.jumpFrames ?? STEP_LIST.jump60, fps))));
  }
  const rows: StepRowState[] = p.rows.map((r, i) => {
    const visible = F >= r.at;
    const next = p.rows[i + 1]?.at;
    const done = r.pending ? Infinity : (r.done ?? next ?? r.at + Math.round(f60x(STEP_LIST.lastDone60, fps)));
    const d0 = r.at + f60x(p.inkDelay ?? STEP_LIST.inkDelay60, fps);
    const ink = mix(p.partial ?? STEP_LIST.partial, 1, prog(frame, d0, d0 + f60x(p.fade ?? STEP_LIST.fade60, fps), E.snapOut));
    const check = F < done ? 0 : prog(frame, done - 1, done - 1 + f60x(p.swap ?? STEP_LIST.swap60, fps), E.snapOut);
    const accent = next === undefined || F < next ? 1 : 1 - clamp((frame - next) / Math.max(1, f60x(p.drain ?? STEP_LIST.drain60, fps)));
    const rise = (p.rise ?? 0) * u * (1 - E.snapOut(clamp((frame - r.at) / Math.max(1, f60x(p.riseFrames ?? 20, fps)))));
    const pending = r.pending ? prog(frame, r.at + f60x(30, fps), r.at + f60x(60, fps), E.stdInOut) : 0;
    return { i, visible, y: i * rowH - offset + rise, ink, spin: ((p.spin ?? STEP_LIST.spin60) * 60 * (frame - r.at)) / fps, check, accent, pending };
  });
  return { offset, rowH, rows };
};

/** Sync: each row's cut-on (a soft tick), each check (a brighter tick), each list jump. */
export const stepListFrames = (p: StepListProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const rows = p.rows.map((r) => r.at);
  const checks = p.rows.filter((r) => !r.pending).map((r) => r.done ?? p.rows[p.rows.indexOf(r) + 1]?.at ?? r.at + Math.round(f60x(STEP_LIST.lastDone60, fps)));
  const jumps = p.rows.slice(p.window ?? STEP_LIST.window).map((r) => r.at);
  return { rows, checks, jumps };
};

/** A small spinner: a 270 degree arc (or a dashed ring) that turns. */
export const Spinner: React.FC<{ size: number; color: string; angle: number; dashed?: boolean; width?: number }> = ({ size, color, angle, dashed, width = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', transform: `rotate(${angle.toFixed(1)}deg)` }} aria-hidden>
    <circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '3.2 3.9' : '42 100'} />
  </svg>
);

/** A check in a filled circle that pops from 0.4 to full size as `k` goes 0 -> 1 (the step list's swap; MicroUI CheckPop is the stand-alone pop). */
export const StepCheck: React.FC<{ size: number; fill: string; tick: string; k: number }> = ({ size, fill, tick, k }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', transform: `scale(${mix(0.4, 1, k).toFixed(4)})`, opacity: clamp(k * 3) }} aria-hidden>
    <circle cx={12} cy={12} r={11} fill={fill} />
    <path d="M7 12.5l3.2 3.2L17 9" stroke={tick} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={(1 - clamp(k * 1.4)).toFixed(3)} />
  </svg>
);

/** One row's words: a verb (accent draining to ink) and a detail in the muted tone. */
export type StepLabel = { verb: string; detail?: string };

/**
 * Draws the list at (x, y) (top-left of the window), rows `rowH` apart, `window` rows tall, clipped.
 * Colours: accent for the verb on arrival, ink for words, mute for details and the spinner.
 */
export const StepList: React.FC<StepListProps & { frame: number; labels: StepLabel[]; x: number; y: number; width: number; font: { size: number; weight: number; family: string }; colors: { ink: string; mute: string; accent: string; ground: string; check?: string }; dashed?: boolean }> = (props) => {
  const film = useFilm();
  const s = stepListState(props.frame, props, film);
  const win = props.window ?? STEP_LIST.window;
  const icon = props.font.size * 0.92;
  const mixC = (a: string, b: string, t: number) => `color-mix(in oklab, ${a} ${(t * 100).toFixed(1)}%, ${b})`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: win * s.rowH, overflow: 'hidden', transform: `translate(${props.x}px, ${props.y}px)` }}>
      {s.rows.map((r) =>
        r.visible ? (
          <div key={r.i} style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: s.rowH, display: 'flex', alignItems: 'center', gap: icon * 0.55, transform: `translate3d(0, ${r.y.toFixed(2)}px, 0)` }}>
            <div style={{ position: 'relative', width: icon, height: icon, flex: 'none' }}>
              {r.check < 1 && (
                <div style={{ position: 'absolute', inset: 0, opacity: 1 - clamp(r.check * 2) }}>
                  <Spinner size={icon} color={props.colors.mute} angle={r.spin} dashed={props.dashed || r.pending > 0} />
                </div>
              )}
              {r.check > 0 && (
                <div style={{ position: 'absolute', inset: 0 }}>
                  <StepCheck size={icon} fill={props.colors.check ?? props.colors.accent} tick={props.colors.ground} k={r.check} />
                </div>
              )}
            </div>
            <div style={{ fontFamily: props.font.family, fontSize: props.font.size, fontWeight: props.font.weight, letterSpacing: '-0.01em', whiteSpace: 'pre', opacity: r.ink * (1 - 0.45 * r.pending) }}>
              <span style={{ color: mixC(props.colors.accent, props.colors.ink, r.accent) }}>{props.labels[r.i]?.verb}</span>
              {props.labels[r.i]?.detail && <span style={{ color: props.colors.mute }}>{` ${props.labels[r.i].detail}`}</span>}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- QuadLoader

/** House numbers: frames at 60 fps (a step on 16ths at 124 bpm is 7.26 f), px at 1080p. */
export const QUAD_LOADER = { step60: 7.26, levels: [1, 0.38, 0.17] as number[], cell: 12, gap: 4, order: [0, 1, 3, 2] as number[] } as const;

export type QuadLoaderProps = {
  start: number; // the first step (the head on the top-left cell)
  step?: number; // 60 fps frames per step (house 7.26: 16ths at 124 bpm); or `steps` on onsets
  steps?: number[]; // explicit step frames (whole frames, after `start`)
  levels?: number[]; // head, the cell it just left, the rest (house 1, 0.38, 0.17)
  order?: number[]; // cell order of the head (house clockwise: 0 TL, 1 TR, 3 BR, 2 BL)
  solid?: { from?: number; to?: number }; // frames when all four show at full (a mark, before or after the loop)
  id?: string;
};

/** Each cell's strength (index 0 TL, 1 TR, 2 BL, 3 BR), the step index and the head cell at frame f. Pure. */
export const quadLoaderState = (frame: number, p: QuadLoaderProps, film?: Partial<FilmCtx>) => {
  const F = fd(frame);
  const solid = p.solid && (p.solid.from === undefined || F >= p.solid.from) && (p.solid.to === undefined || F < p.solid.to);
  if (solid || F < p.start) return { step: -1, head: -1, levels: [1, 1, 1, 1].map((v) => (solid ? v : 0)) };
  let step: number;
  if (p.steps?.length) step = p.steps.filter((s) => s > p.start && s <= F).length;
  else step = Math.floor((F - p.start) / Math.max(1e-6, f60x(p.step ?? QUAD_LOADER.step60, fpsOf(film))) + 1e-9);
  const order = p.order ?? QUAD_LOADER.order;
  const lv = p.levels ?? QUAD_LOADER.levels;
  const head = order[step % 4];
  const prev = order[(step + 3) % 4];
  return { step, head, levels: [0, 1, 2, 3].map((i) => (i === head ? lv[0] : i === prev && step > 0 ? lv[1] : lv[2])) };
};

/** Sync: every step frame up to `until` (a soft tick each, or one texture for the loop). */
export const quadLoaderFrames = (p: QuadLoaderProps, until: number, film?: Partial<FilmCtx>): number[] => {
  if (p.steps?.length) return [p.start, ...p.steps.filter((s) => s > p.start && s <= until)];
  const per = Math.max(1e-6, f60x(p.step ?? QUAD_LOADER.step60, fpsOf(film)));
  const out: number[] = [];
  for (let k = 0; p.start + k * per <= until && k < 100000; k++) out.push(Math.ceil(p.start + k * per - 1e-9));
  return out;
};

/**
 * Draws the 2 x 2 at (x, y) (its top-left), cells `cell` px apart by `gap`. `tile(step)` fills the head cell
 * with content (a picture per take) instead of the flat colour.
 */
export const QuadLoader: React.FC<QuadLoaderProps & { frame: number; x: number; y: number; cell?: number; gap?: number; color?: string; radius?: number; tile?: (step: number) => React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = quadLoaderState(props.frame, props, film);
  const u = uOf(film);
  const cell = (props.cell ?? QUAD_LOADER.cell) * u;
  const gap = (props.gap ?? QUAD_LOADER.gap) * u;
  const color = props.color ?? C.accent;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${props.x}px, ${props.y}px)` }} aria-hidden>
      {s.levels.map((o, i) =>
        o > 0 ? (
          <div key={i} style={{ position: 'absolute', left: (i % 2) * (cell + gap), top: Math.floor(i / 2) * (cell + gap), width: cell, height: cell, borderRadius: props.radius ?? cell * 0.18, background: color, opacity: props.tile && i === s.head ? 1 : o, overflow: 'hidden' }}>
            {props.tile && i === s.head ? props.tile(s.step) : null}
          </div>
        ) : null,
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- declares

/** Block and quad loaders: their step spans; step list: each row cut-on, check swap and snap jump; arc loader: nothing. */
export const declares = (
  p?: { block?: Partial<BlockLoaderProps> & { until?: number }; steps?: Partial<StepListProps>; quad?: Partial<QuadLoaderProps> & { until?: number } },
  film?: Partial<FilmCtx>,
): Declares => {
  const stepped: SteppedRange[] = [];
  if (p?.quad?.start !== undefined) stepped.push({ from: p.quad.start, to: p.quad.until ?? p.quad.start + Math.round(fpsOf(film) * 2), id: p.quad.id ?? 'quadLoader' });
  if (p?.block?.start !== undefined) {
    const until = p.block.until ?? p.block.start + Math.round(fpsOf(film) * 2);
    stepped.push({ from: p.block.start + (p.block.phase ?? 0), to: until, id: p.block.id ?? 'blockLoader' });
  }
  if (p?.steps?.rows?.length) {
    const fr = stepListFrames(p.steps as StepListProps, film);
    const id = p.steps.id ?? 'stepList';
    for (const [i, a] of fr.rows.entries()) stepped.push({ from: a, to: a + 1, id: `${id}-row${i}` });
    if ((p.steps.jump ?? 'snap') === 'snap') for (const [i, a] of fr.jumps.entries()) stepped.push({ from: a, to: a + 1, id: `${id}-jump${i}` });
  }
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
