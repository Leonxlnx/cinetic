import React from 'react';
import { clamp, E, type Ease, fd, M, mix, prog, rand } from '../lib/anim';
import { onTwos, stepFrame } from '../lib/cadence';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import { irregularOnsets, rectsPath } from './deviceUtil';
import type { Declares } from '../timeline';

/**
 * Grids: devices built on a fixed grid of cells.
 *
 *   CellWave   cells switch on outward from an origin, each at one of five opacities (15-100 %), as a
 *              radial wave (accelerating outward, on twos for its first frames) or a diagonal wipe from a
 *              corner (+1 f per column, +1.4 f per row); each cell pops on or fades (40 f in-out), and the
 *              field can leave centre-first. A texture that arrives with the beat, or a wall of thumbnails.
 *   StairWipe  a wipe in the next scene built from square blocks (22 px) whose front advances diagonally
 *              with a seeded staircase edge, stepped at 12.5 fps (on twos at 25), a faint fringe of blocks in
 *              the next scene's colour ahead of it (55 f, M.pixelStair: 80 % of the coverage in the middle).
 *   Radiate    square (or round) outline rings are born at the centre every 10-15 f and grow at one constant
 *              speed, thick strokes and wide gaps, a pulse leaving the centre; `swallow` thickens them until
 *              the colour fills the frame and the gaps become hairlines.
 */

// ---------------------------------------------------------------------------------------------- CellWave

/** House numbers: px at 1080p, frames at 60 fps. */
export const CELL_WAVE = { cell: 40, pitch: 72, frames60: 23, levels: [0.15, 0.35, 0.55, 0.8, 1], fade60: 0, twos60: 8, perCol60: 1, perRow60: 1.4 } as const;

export type CellWaveProps = {
  at: number;
  cols: number;
  rows: number;
  cell?: number; // px at 1080p
  pitch?: number;
  origin?: [number, number]; // grid coordinates (default the centre; a corner for 'diagonal')
  shape?: 'radial' | 'diagonal';
  frames?: number; // radial: 60 fps frames for the wave to reach the farthest cell (house 23)
  ease?: Ease; // radial: house E.buildIn (accelerating outward)
  perCol?: number; // diagonal: 60 fps frames per column (house 1) and per row (1.4)
  perRow?: number;
  levels?: readonly number[]; // opacities, one per cell from a seed
  seed?: string | number;
  fade?: number; // 60 fps frames per cell (0 = pops on, house; 40 = a slow in-out)
  twos?: number; // 60 fps frames from `at` during which the wave steps on twos (house 8)
  out?: { at: number; frames?: number }; // leaves centre-first, same order and spacing
  id?: string;
};

export type WaveCell = { col: number; row: number; x: number; y: number; opacity: number };

const waveOnset = (p: CellWaveProps, c: number, r: number, fps: number) => {
  const [oc, or] = p.origin ?? ((p.shape ?? 'radial') === 'diagonal' ? [0, 0] : [(p.cols - 1) / 2, (p.rows - 1) / 2]);
  if ((p.shape ?? 'radial') === 'diagonal') return f60x(Math.abs(c - oc) * (p.perCol ?? CELL_WAVE.perCol60) + Math.abs(r - or) * (p.perRow ?? CELL_WAVE.perRow60), fps);
  const far = Math.max(...[[0, 0], [p.cols - 1, 0], [0, p.rows - 1], [p.cols - 1, p.rows - 1]].map(([x, y]) => Math.hypot(x - oc, y - or)), 1e-6);
  const d = Math.hypot(c - oc, r - or) / far;
  return f60x(p.frames ?? CELL_WAVE.frames60, fps) * (p.ease ?? E.buildIn)(d);
};

/** Every cell's opacity at frame f (top-left px from the grid's top-left). Pure. */
export const cellWaveState = (frame: number, p: CellWaveProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const pitch = (p.pitch ?? CELL_WAVE.pitch) * u;
  const levels = p.levels ?? CELL_WAVE.levels;
  const twos = f60x(p.twos ?? CELL_WAVE.twos60, fps);
  const g = fd(frame) < p.at + twos ? onTwos(frame, 2, p.at) : frame;
  const fade = f60x(p.fade ?? CELL_WAVE.fade60, fps);
  const cells: WaveCell[] = [];
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++) {
      const on = p.at + waveOnset(p, c, r, fps);
      let k = fade > 0 ? prog(g, on, on + fade, E.stdInOut) : fd(g) >= Math.round(on) ? 1 : 0;
      if (p.out) {
        const off = p.out.at + waveOnset(p, c, r, fps);
        const of = f60x(p.out.frames ?? (p.fade || 12), fps);
        k *= 1 - prog(frame, off, off + of, E.stdInOut);
      }
      const lv = levels[Math.floor(rand(`${p.seed ?? 'wave'}:${c}:${r}`) * levels.length)];
      cells.push({ col: c, row: r, x: c * pitch, y: r * pitch, opacity: k * lv });
    }
  return { cells, pitch };
};

/** Sync: the first cell, the last cell on, the out. */
export const cellWaveFrames = (p: CellWaveProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  let last = 0;
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) last = Math.max(last, waveOnset(p, c, r, fps));
  return { start: p.at, full: Math.ceil(p.at + last + f60x(p.fade ?? 0, fps)), out: p.out?.at };
};

/** Draws the cells at (x, y) as rounded squares in `color`; or `render(cell)` for content per cell (thumbnails). */
export const CellWave: React.FC<CellWaveProps & { frame: number; x: number; y: number; color: string; radius?: number; render?: (c: WaveCell) => React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = cellWaveState(props.frame, props, film);
  const cell = (props.cell ?? CELL_WAVE.cell) * uOf(film);
  const r = (props.radius ?? 6) * uOf(film);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${props.x}px, ${props.y}px)` }} aria-hidden>
      {s.cells.map((c) =>
        c.opacity > 0.001 ? (
          <div key={`${c.col}-${c.row}`} style={{ position: 'absolute', left: c.x, top: c.y, width: cell, height: cell, borderRadius: r, background: props.render ? undefined : props.color, opacity: c.opacity, overflow: 'hidden' }}>
            {props.render?.(c)}
          </div>
        ) : null,
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- StairWipe

/** House numbers: px at 1080p, frames at 60 fps; steps at 12.5 fps. */
export const STAIR_WIPE = { cell: 22, angle: 35, frames60: 55, jitter: 0.12, fps: 12.5, fringe: 0.05, fringeAlpha: 0.38 } as const;

export type StairWipeProps = {
  at: number;
  cell?: number; // px at 1080p
  angle?: number; // direction of travel, degrees (0 = left to right, 90 = top to bottom)
  frames?: number; // 60 fps frames (house 55)
  ease?: Ease; // house M.pixelStair
  jitter?: number; // the staircase's raggedness, share of the frame diagonal (house 0.12)
  fringe?: number; // the fringe band ahead of the front, share (house 0.05)
  fringeAlpha?: number; // the fringe's opacity (house 0.38 faint; 1 = a solid accent leading edge)
  fps?: number; // the step rate (house 12.5)
  seed?: string | number;
  id?: string;
};

export type StairRun = { x: number; y: number; w: number; h: number };

/** Covered blocks (merged per row into runs), the fringe runs and the coverage share at frame f. Pure. */
export const stairWipeState = (frame: number, p: StairWipeProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const cell = (p.cell ?? STAIR_WIPE.cell) * uOf(film);
  const frames = Math.max(1, f60x(p.frames ?? STAIR_WIPE.frames60, fps));
  const g = stepFrame(frame, { animFps: p.fps ?? STAIR_WIPE.fps, filmFps: fps, phase: p.at });
  const t = clamp((g - p.at) / frames);
  const jit = p.jitter ?? STAIR_WIPE.jitter;
  const band = p.fringe ?? STAIR_WIPE.fringe;
  const e = (p.ease ?? M.pixelStair)(t);
  const front = frame < p.at ? -Infinity : mix(-jit - band, 1 + jit, e);
  const a = ((p.angle ?? STAIR_WIPE.angle) * Math.PI) / 180;
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const proj = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => x * ux + y * uy);
  const lo = Math.min(...proj);
  const hi = Math.max(...proj);
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const runs: StairRun[] = [];
  const fringe: StairRun[] = [];
  let on = 0;
  for (let r = 0; r < rows; r++) {
    let run: StairRun | null = null;
    let fr: StairRun | null = null;
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cell;
      const cy = (r + 0.5) * cell;
      const d = (cx * ux + cy * uy - lo) / (hi - lo) + jit * (rand(`${p.seed ?? 'stair'}:${c}:${r}`) * 2 - 1);
      const covered = d < front;
      const inFringe = !covered && d < front + band;
      if (covered) {
        on++;
        if (run && run.x + run.w >= c * cell - 0.01) run.w += cell;
        else runs.push((run = { x: c * cell, y: r * cell, w: cell, h: cell }));
      }
      if (inFringe) {
        if (fr && fr.x + fr.w >= c * cell - 0.01) fr.w += cell;
        else fringe.push((fr = { x: c * cell, y: r * cell, w: cell, h: cell }));
      }
    }
  }
  return { coverage: on / (cols * rows), runs, fringe, done: on === cols * rows, active: frame >= p.at };
};

/** Sync: start, the steps (one tick each, or one texture), the end (a seam). */
export const stairWipeFrames = (p: StairWipeProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const per = fps / (p.fps ?? STAIR_WIPE.fps);
  const end = Math.ceil(p.at + f60x(p.frames ?? STAIR_WIPE.frames60, fps));
  const steps: number[] = [];
  for (let k = 0; p.at + k * per <= end + per; k++) steps.push(Math.ceil(p.at + k * per - 1e-9));
  return { start: p.at, steps, end };
};

/** Renders the wipe: `outgoing`, the fringe blocks in `color`, `incoming` clipped to the covered blocks. */
export const StairWipe: React.FC<StairWipeProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode; color: string }> = (props) => {
  const film = useFilm();
  const s = stairWipeState(props.frame, props, film);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {!s.done && props.outgoing}
      {s.fringe.length > 0 && (
        <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden>
          <path d={rectsPath(s.fringe)} fill={props.color} opacity={props.fringeAlpha ?? STAIR_WIPE.fringeAlpha} />
        </svg>
      )}
      {s.active && s.runs.length > 0 && <div style={{ position: 'absolute', inset: 0, clipPath: s.done ? undefined : `path('${rectsPath(s.runs)}')` }}>{props.incoming}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Radiate

/** House numbers: px at 1080p, frames at 60 fps. */
export const RADIATE = { every60: [10, 15] as [number, number], speed60: 15, stroke: 75, hairline: 2, swallow60: 25, flood: { from: 70, growth60: 1.0915 } } as const;

export type RadiateProps = {
  start: number; // the first birth
  end?: number; // no births after this frame (default: 6 rings)
  births?: number[]; // explicit birth frames (put them on the beat)
  every?: [number, number]; // 60 fps frames between births (house 10-15, irregular)
  seed?: string | number;
  speed?: number; // half-size growth, px per 60 fps frame at 1080p (house 15)
  stroke?: number; // px at 1080p (house 75)
  max?: number; // rings past this half-size are dropped and the flood stops here (default: from the centre (x, y) to the frame's farthest corner, + stroke)
  swallow?: { at: number; frames?: number }; // strokes thicken until only hairline gaps remain (house 25 f, accelerating)
  bornAt?: number; // half-size a ring is born at, px at 1080p (default 0; 54 pops it in as a solid square that opens)
  speeds?: number[]; // per-ring growth (px per 60 fps frame at 1080p) by birth order; missing rings use `speed`
  flood?: { at: number; from?: number; growth?: number }; // the centre floods: a solid square from `from` px half-size (house 70) growing x`growth` a 60 fps frame (house 1.0915) until it covers the frame
  id?: string;
};

/** Ring births (whole frames). */
export const radiateBirths = (p: RadiateProps, film?: Partial<FilmCtx>): number[] => {
  if (p.births?.length) return p.births;
  const fps = fpsOf(film);
  const all = irregularOnsets(p.start, 64, p.every ?? RADIATE.every60, p.seed ?? 'radiate', fps);
  const end = p.end ?? all[5];
  return all.filter((b) => b <= end);
};

/** Every live ring at frame f: half-size (px), stroke (px). Constant speed, closed form. (x, y): the centre, px (default the frame's). */
export const radiateState = (frame: number, p: RadiateProps & { x?: number; y?: number }, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const { width, height } = sizeOf(film);
  const v = ((p.speed ?? RADIATE.speed60) * u * 60) / fps;
  const vOf = (k: number) => (p.speeds?.[k] !== undefined ? (p.speeds[k] * u * 60) / fps : v);
  const born = (p.bornAt ?? 0) * u;
  const stroke0 = (p.stroke ?? RADIATE.stroke) * u;
  // an off-centre ring or flood must reach the farthest corner before it covers the frame
  const cx = p.x ?? width / 2;
  const cy = p.y ?? height / 2;
  const max = p.max ?? Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) + stroke0;
  const births = radiateBirths(p, film);
  const gaps = births.slice(1).map((b, i) => b - births[i]);
  const spacing = (gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : f60x(12, fps)) * v;
  let stroke = stroke0;
  if (p.swallow) {
    const k = E.buildIn(clamp((frame - p.swallow.at) / Math.max(1, f60x(p.swallow.frames ?? RADIATE.swallow60, fps))));
    stroke = mix(stroke0, Math.max(stroke0, spacing - RADIATE.hairline * u), k);
  }
  const rings = births
    .map((b, k) => ({ b, k }))
    .filter(({ b }) => frame >= b)
    .map(({ b, k }) => ({ r: born + (frame - b) * vOf(k), stroke, birth: b }))
    .filter((r) => r.r - r.stroke / 2 < max);
  const fl = p.flood;
  const flood = fl && frame >= fl.at ? Math.min(max, (fl.from ?? RADIATE.flood.from) * u * (fl.growth ?? RADIATE.flood.growth60) ** (((frame - fl.at) * 60) / fps)) : 0;
  return { rings, v, flood };
};

/** Draws the rings centred on (x, y): square outlines (or circles) in `color`. */
export const Radiate: React.FC<RadiateProps & { frame: number; x: number; y: number; color: string; shape?: 'square' | 'circle'; radius?: number }> = (props) => {
  const film = useFilm();
  const s = radiateState(props.frame, props, film);
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden>
      {s.flood > 0 && (props.shape ?? 'square') === 'square' && <rect x={props.x - s.flood} y={props.y - s.flood} width={2 * s.flood} height={2 * s.flood} rx={props.radius ?? 0} fill={props.color} />}
      {s.flood > 0 && props.shape === 'circle' && <circle cx={props.x} cy={props.y} r={s.flood} fill={props.color} />}
      {s.rings.map((g) => {
        const r = Math.max(0.5, g.r);
        const sw = Math.min(g.stroke, 2 * r);
        return (props.shape ?? 'square') === 'circle' ? (
          <circle key={g.birth} cx={props.x} cy={props.y} r={Math.max(0.5, r - sw / 2)} fill="none" stroke={props.color} strokeWidth={sw} />
        ) : (
          <rect key={g.birth} x={props.x - r + sw / 2} y={props.y - r + sw / 2} width={Math.max(0.5, 2 * r - sw)} height={Math.max(0.5, 2 * r - sw)} rx={props.radius ?? 0} fill="none" stroke={props.color} strokeWidth={sw} />
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------- declares

/** CellWave: its twos span; StairWipe: the stepped run and a wipe seam on its first frame; Radiate: nothing. */
export const declares = (p?: { wave?: Partial<CellWaveProps>; stair?: Partial<StairWipeProps> }, film?: Partial<FilmCtx>): Declares => {
  const out: Required<Pick<Declares, 'stepped' | 'flashes' | 'cameraBlur' | 'seams'>> = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (p?.wave?.at !== undefined) out.stepped.push({ from: p.wave.at, to: Math.ceil(p.wave.at + f60x(p.wave.twos ?? CELL_WAVE.twos60, fpsOf(film))), on: 2, id: p.wave.id ?? 'cellWave' });
  if (p?.stair?.at !== undefined) {
    const fr = stairWipeFrames(p.stair as StairWipeProps, film);
    out.stepped.push({ from: fr.start, to: fr.end + 1, id: p.stair.id ?? 'stairWipe' });
    out.seams.push({ at: fr.start, kind: 'wipe', id: p.stair.id ?? 'stairWipe' });
  }
  return out;
};
