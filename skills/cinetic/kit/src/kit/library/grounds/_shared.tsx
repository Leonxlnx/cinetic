// Shared by the grounds: a canvas that redraws on every frame, the hairline grid both line grids draw, and small
// helpers. Parts and helpers only (no catalogue entries).
import React from 'react';
import { clamp, ease } from '../../motion';

/** The frame's scale against a 1080-high frame (sizes in the pieces are written at 1080 and multiplied by this). */
export const unit = (height: number) => height / 1080;

/**
 * A full-frame canvas drawn synchronously for the current frame (device pixels = frame pixels). `draw` gets the 2D
 * context and the size; `deps` must hold everything the drawing depends on (the frame first).
 */
export const FrameCanvas: React.FC<{ width: number; height: number; draw: (g: CanvasRenderingContext2D, w: number, h: number) => void; deps: unknown[]; style?: React.CSSProperties }> = ({ width, height, draw, deps, style }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, width, height);
    draw(g, width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, ...deps]);
  return <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }} />;
};

/** A line of a grid: horizontal (y set) or vertical (x set), its index from the centre line and its drawn share 0..1. */
export type GridLine = { kind: 'h' | 'v'; pos: number; index: number };

/** The lines of a grid with a crossing at (cx, cy) shifted by (ox, oy), covering a w x h frame. */
export const gridLines = (w: number, h: number, cell: number, ox = 0, oy = 0, cx = w / 2, cy = h / 2): GridLine[] => {
  const out: GridLine[] = [];
  const x0 = cx + (((ox % cell) + cell) % cell);
  const y0 = cy + (((oy % cell) + cell) % cell);
  const nx = Math.ceil(w / cell) + 1;
  const ny = Math.ceil(h / cell) + 1;
  for (let i = -nx; i <= nx; i++) {
    const x = x0 + i * cell;
    if (x >= -1 && x <= w + 1) out.push({ kind: 'v', pos: x, index: i });
  }
  for (let j = -ny; j <= ny; j++) {
    const y = y0 + j * cell;
    if (y >= -1 && y <= h + 1) out.push({ kind: 'h', pos: y, index: j });
  }
  return out;
};

/**
 * How far a grid line is drawn at frame f: lines grow out of the centre crossing, the centre lines first and the
 * outer ones `lag` frames a step later, each over `dur` frames (expo out). Before `at` nothing; `at` < 0: drawn whole.
 */
export const lineReveal = (f: number, at: number, index: number, dur = 16, lag = 2) => (at < 0 ? 1 : ease.out(clamp((f - at - Math.abs(index) * lag) / dur)));

/** A grid of 1 px hairlines, drawn as one SVG; each line grows from the frame's centre by `reveal(line)` (0..1). */
export const HairlineSvg: React.FC<{ w: number; h: number; lines: GridLine[]; color: string; width: number; dash?: number; reveal: (l: GridLine) => number }> = ({ w, h, lines, color, width, dash = 0, reveal }) => (
  <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
    {lines.map((l, i) => {
      const p = reveal(l);
      if (p <= 0) return null;
      const d = dash > 0 ? `${dash} ${dash}` : undefined;
      return l.kind === 'v' ? (
        <line key={i} x1={l.pos} x2={l.pos} y1={h / 2 - (p * h) / 2 - 2} y2={h / 2 + (p * h) / 2 + 2} stroke={color} strokeWidth={width} strokeDasharray={d} shapeRendering="crispEdges" />
      ) : (
        <line key={i} y1={l.pos} y2={l.pos} x1={w / 2 - (p * w) / 2 - 2} x2={w / 2 + (p * w) / 2 + 2} stroke={color} strokeWidth={width} strokeDasharray={d} shapeRendering="crispEdges" />
      );
    })}
  </svg>
);

/** A crisp 1 px stroke at any scale (never thinner than one pixel). */
export const hair = (u: number, px = 1) => Math.max(1, Math.round(px * u));
