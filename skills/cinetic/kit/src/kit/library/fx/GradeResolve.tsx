// GradeResolve (fx, build, emphasis): a picture or a grid of pictures switches between its natural colour and a gradient
// map (a warm duotone, a cool one, a thermal palette), cell by cell in a scattered order, each cell by a cut.
// Numbers: the switch spreads over 9 f (8-12) for a 3 x 3 grid of tiles or a full picture cut into 8 x 5 cells; each cell
// changes on one frame, never a fade; the map is luminance to 3-5 colours (dark, mid, light).
// Caution: give it a reason (the product analysing, segmenting, finding); a whole frame turning a colour without one is a
// sudden colour change.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { useUid } from '../_shared';

/** Gradient-map palettes, dark to light. */
export const GRADES = {
  /** warm orange to pink to cream (the analysis look) */
  warm: ['#7A1E2C', '#E2552E', '#F59A5C', '#F7C6C9', '#FFF3E6'],
  /** deep blue to cyan to white */
  cool: ['#0E1B4D', '#1F5FD1', '#46B6E8', '#BFEAF5', '#FFFFFF'],
  /** heat: indigo, magenta, orange, yellow */
  thermal: ['#1A1446', '#7B1F8C', '#E0336B', '#FF8A2A', '#FFE680'],
  /** two-tone: ink and a pale teal */
  teal: ['#0F2F33', '#2E8C86', '#A9E3D6'],
} as const;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

/** The gradient-map filter: luminance, then each channel through the palette's stops. Put it in the tree once. */
const GradeFilter: React.FC<{ id: string; palette: readonly string[] }> = ({ id, palette }) => {
  const c = palette.map(hex);
  const ch = (k: number) => c.map((v) => v[k].toFixed(3)).join(' ');
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={ch(0)} />
          <feFuncG type="table" tableValues={ch(1)} />
          <feFuncB type="table" tableValues={ch(2)} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

/**
 * GradeResolve: `children` drawn twice, natural and through the gradient map; the mapped copy shows in the cells that
 * have switched. `to="grade"` switches natural to mapped, `to="natural"` mapped back to natural. Cells are a `cols` x `rows`
 * grid over the box (lay a tile grid out on the same grid so each tile changes whole), or `cells` given as boxes with
 * their own frames (regions of a room: the desk first, the window last).
 */
export const GradeResolve: React.FC<{
  at: number;
  /** Frames the switch spreads over. */
  dur?: number;
  to?: 'grade' | 'natural';
  palette?: readonly string[];
  cols?: number;
  rows?: number;
  /** Explicit regions in px of the box, each with the frame it switches on (overrides cols and rows). */
  cells?: Array<{ x: number; y: number; w: number; h: number; at: number }>;
  /** Box size (default the frame). */
  w?: number;
  h?: number;
  seed?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, dur = 9, to = 'grade', palette = GRADES.warm, cols = 8, rows = 5, cells, w, h, seed = 3, children, style }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const bw = w ?? W;
  const bh = h ?? H;
  const id = useUid('grade');
  const boxes =
    cells ??
    Array.from({ length: cols * rows }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      // scattered order: each cell's moment is a seeded draw over the spread, the first on `at`
      const t = at + Math.round(rand(seed * 977 + i * 31) * Math.max(0, dur - 1));
      return { x: (c * bw) / cols, y: (r * bh) / rows, w: bw / cols, h: bh / rows, at: t };
    });
  const switched = boxes.filter((b) => frame >= b.at);
  const mapped = to === 'grade' ? switched : boxes.filter((b) => frame < b.at);
  // the mapped copy's mask: the cells it shows in (a hair of overlap so no seam opens between neighbours)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${bw}' height='${bh}'>${mapped
    .map((b) => `<rect x='${(b.x - 0.5).toFixed(1)}' y='${(b.y - 0.5).toFixed(1)}' width='${(b.w + 1).toFixed(1)}' height='${(b.h + 1).toFixed(1)}' fill='white'/>`)
    .join('')}</svg>`;
  const mask = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div style={{ position: 'relative', width: bw, height: bh, ...style }}>
      <GradeFilter id={id} palette={palette} />
      <AbsoluteFill>{children}</AbsoluteFill>
      {mapped.length > 0 && (
        <AbsoluteFill style={{ filter: `url(#${id})`, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}>{children}</AbsoluteFill>
      )}
    </div>
  );
};
