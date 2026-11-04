import React from 'react';
import { clamp, E, type Ease, fd, prog, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * CellChart: a chart built from tiny rounded cells (22 px with 4 px gaps at 1080p) that fill like pixels,
 * not bars that grow. Two orders:
 *
 *   column   the first column fills from pale to full (14 f), the pale grid of empty cells fades in (12 f),
 *            then the other columns cut on in bursts, about one column every 2 frames at 60 fps (each burst
 *            fills its column bottom-up in one frame); a cut to a wider framing can keep it filling
 *   scatter  the filled cells appear one by one in a seeded scatter, sparse then dense (an accelerating
 *            count over 60 f) in sync with a counter (cellChartCount), then can snap grey (8 f)
 *
 * The shape is any grid: give `mask` to fill only some cells (a map of dots, a hexagon). Pure state; the
 * component draws one SVG rect per cell.
 */

/** House numbers: px at 1080p, frames at 60 fps. */
export const CELL_CHART = { cell: 22, gap: 4, first60: 14, grid60: 12, perCol60: 2, scatter60: 60, desat60: 8, pale: 0.28, gridLevel: 1 } as const;

export type CellChartProps = {
  at: number; // first frame (the first column starts to fill; scatter: the first cells)
  cols: number;
  rows: number;
  values: number[]; // filled cells per column, counted from the bottom (<= rows)
  cell?: number; // px at 1080p
  gap?: number;
  order?: 'column' | 'scatter';
  first?: number; // column: 60 fps frames of the first column's pale -> full fill (house 14)
  grid?: { at?: number; frames?: number }; // the empty grid fades in (house: 40 % into the first column, 12 f)
  perCol?: number; // column: 60 fps frames between bursts (house 2)
  burstAt?: number; // column: the second column's burst (default: when the grid is in)
  scatter?: { frames?: number; ease?: Ease; seed?: string | number }; // house 60 f on E.buildIn (sparse, then dense)
  desat?: { at: number; frames?: number }; // fill snaps to grey (house 8 f)
  mask?: (col: number, row: number) => boolean; // cells that exist at all (default every cell)
  id?: string;
};

export type ChartCell = { col: number; row: number; x: number; y: number; fill: number; on: boolean };

const gridAt = (p: CellChartProps, fps: number) => p.grid?.at ?? p.at + 0.4 * f60x(p.first ?? CELL_CHART.first60, fps);

const burstFrame = (p: CellChartProps, c: number, fps: number) => {
  const b0 = p.burstAt ?? Math.round(gridAt(p, fps) + f60x(p.grid?.frames ?? CELL_CHART.grid60, fps));
  return Math.round(b0 + (c - 1) * f60x(p.perCol ?? CELL_CHART.perCol60, fps));
};

/** The fill order of a scatter chart: every filled cell with its rank (seeded). */
const scatterRanks = (p: CellChartProps) => {
  const cells: { col: number; row: number; key: number }[] = [];
  p.values.forEach((v, col) => {
    for (let row = 0; row < Math.min(v, p.rows); row++) if (!p.mask || p.mask(col, row)) cells.push({ col, row, key: rand(`${p.scatter?.seed ?? 'cells'}:${col}:${row}`) });
  });
  cells.sort((a, b) => a.key - b.key);
  const rank = new Map<string, number>();
  cells.forEach((c, i) => rank.set(`${c.col}:${c.row}`, i));
  return { rank, total: cells.length };
};

/** How many filled cells show at frame f (drive a counter with it: the count and the dots stay in sync). */
export const cellChartCount = (frame: number, p: CellChartProps, film?: Partial<FilmCtx>): { shown: number; total: number } => {
  const s = cellChartState(frame, p, film);
  return { shown: s.cells.filter((c) => c.on).length, total: s.total };
};

/** Every cell at frame f (top-left px from the chart's top-left), its fill 0..1 and the grid's opacity. Pure. */
export const cellChartState = (frame: number, p: CellChartProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const F = fd(frame);
  const cell = (p.cell ?? CELL_CHART.cell) * u;
  const pitch = cell + (p.gap ?? CELL_CHART.gap) * u;
  const first = f60x(p.first ?? CELL_CHART.first60, fps);
  const gAt = gridAt(p, fps);
  const gridOpacity = prog(frame, gAt, gAt + f60x(p.grid?.frames ?? CELL_CHART.grid60, fps), E.softOut);
  const grey = p.desat ? clamp((frame - p.desat.at) / Math.max(1, f60x(p.desat.frames ?? CELL_CHART.desat60, fps))) : 0;
  const order = p.order ?? 'column';
  const sc = order === 'scatter' ? scatterRanks(p) : null;
  let total = 0;
  let count = 0;
  if (sc) {
    total = sc.total;
    const t = clamp((frame - p.at) / Math.max(1, f60x(p.scatter?.frames ?? CELL_CHART.scatter60, fps)));
    count = F < p.at ? 0 : Math.round(total * (p.scatter?.ease ?? E.buildIn)(t));
  }
  const cells: ChartCell[] = [];
  for (let col = 0; col < p.cols; col++)
    for (let row = 0; row < p.rows; row++) {
      if (p.mask && !p.mask(col, row)) continue;
      const filled = row < (p.values[col] ?? 0);
      if (filled) total += sc ? 0 : 1;
      let fill = 0;
      if (filled) {
        if (sc) fill = (sc.rank.get(`${col}:${row}`) ?? Infinity) < count ? 1 : 0;
        else if (col === 0) fill = F < p.at ? 0 : CELL_CHART.pale + (1 - CELL_CHART.pale) * prog(frame, p.at, p.at + first, E.snapOut);
        else fill = F >= burstFrame(p, col, fps) ? 1 : 0;
      }
      cells.push({ col, row, x: col * pitch, y: (p.rows - 1 - row) * pitch, fill, on: fill > 0 });
    }
  return { cells, gridOpacity, grey, cell, pitch, total, width: p.cols * pitch - (pitch - cell), height: p.rows * pitch - (pitch - cell) };
};

/** Sync: the first fill, the grid, each burst (a fast run of soft ticks), the scatter span, the desaturation. */
export const cellChartFrames = (p: CellChartProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const bursts = (p.order ?? 'column') === 'column' ? Array.from({ length: Math.max(0, p.cols - 1) }, (_, i) => burstFrame(p, i + 1, fps)) : [];
  const end = (p.order ?? 'column') === 'scatter' ? Math.round(p.at + f60x(p.scatter?.frames ?? CELL_CHART.scatter60, fps)) : (bursts[bursts.length - 1] ?? p.at);
  return { first: p.at, grid: Math.round(gridAt(p, fps)), bursts, end, desat: p.desat?.at };
};

/** Draws the chart at (x, y) top-left: empty cells in `empty`, filled in `color` (mixing to `grey` on desat). */
export const CellChart: React.FC<CellChartProps & { frame: number; x: number; y: number; color: string; empty: string; grey?: string; radius?: number }> = (props) => {
  const film = useFilm();
  const s = cellChartState(props.frame, props, film);
  const r = (props.radius ?? 4) * uOf(film);
  const fillC = s.grey > 0 && props.grey ? `color-mix(in oklab, ${props.grey} ${(s.grey * 100).toFixed(1)}%, ${props.color})` : props.color;
  return (
    <svg width={s.width} height={s.height} viewBox={`0 0 ${s.width} ${s.height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translate(${props.x}px, ${props.y}px)` }} aria-hidden>
      {s.gridOpacity > 0 && (
        <g opacity={s.gridOpacity}>
          {s.cells.map((c) => (c.fill < 1 ? <rect key={`e${c.col}-${c.row}`} x={c.x} y={c.y} width={s.cell} height={s.cell} rx={r} fill={props.empty} /> : null))}
        </g>
      )}
      {s.cells.map((c) => (c.on ? <rect key={`f${c.col}-${c.row}`} x={c.x} y={c.y} width={s.cell} height={s.cell} rx={r} fill={fillC} opacity={c.fill} /> : null))}
    </svg>
  );
};

/** Bursts and scatter cells cut on: their span is one stepped range. */
export const declares = (p?: Partial<CellChartProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined || !p.cols) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = cellChartFrames(p as CellChartProps, film);
  const from = fr.bursts[0] ?? p.at;
  return { stepped: [{ from, to: Math.max(from + 1, fr.end + 1), id: p.id ?? 'cellChart' }], flashes: [], cameraBlur: [], seams: [] };
};
