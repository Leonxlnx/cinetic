// PixelMark (logo, build): a mark made of square cells assembles on a dark ground by trial: partial sets of its cells
// blink on, vanish and come back in other combinations for a few frames, then the whole mark holds while faint hairline
// guides run out along its cell edges, rows first and columns after.
// Numbers: empty 2 f; six partial sets at 2, 4, 7, 9, 11, 12 f (each holds 1-3 f, 25-60 % of the cells); the whole
// mark from 13 f; row guides from 6 f, column guides from 13 f, flickering on twos until 20 f, then steady at the
// guide colour; `shrinkAt` steps it down 100, 82, 66, 54 % on every second frame (a mark leaving the centre).
// Caution: one flat ground and one cell colour; it is a mark made of cells, not a word (DotWord spells words).
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rnd } from './_shared';

/** The default mark: an arrow of cells rising to the right on a 5 x 5 grid. */
export const ARROW_CELLS: Array<[number, number]> = [
  [0, 4], [1, 3], [2, 2], [3, 1], [4, 0], [2, 0], [3, 0], [4, 1], [4, 2],
];

export const PixelMark: React.FC<{
  at?: number;
  /** The mark's cells, [column, row]. */
  cells?: Array<[number, number]>;
  color?: string;
  /** Hairline guide colour (false: none). */
  guides?: string | false;
  /** A cell's side in px (default 5.5 % of H). */
  cell?: number;
  /** Frame (from `at`) the mark steps down in size; none by default. */
  shrinkAt?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, cells = ARROW_CELLS, color = '#FFFFFF', guides = 'rgba(255,255,255,0.16)', cell, shrinkAt, seed = 2, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const c = cell ?? H * 0.055;
  const cols = Math.max(...cells.map((q) => q[0])) + 1;
  const rows = Math.max(...cells.map((q) => q[1])) + 1;
  const steps = [2, 4, 7, 9, 11, 12];
  let set: boolean[];
  if (t < 2) set = cells.map(() => false);
  else if (t >= 13) set = cells.map(() => true);
  else {
    let si = 0;
    for (let i = 0; i < steps.length; i++) if (t >= steps[i]) si = i;
    // the sets repeat by pairs (A B A B' C A) so the eye catches the same shape coming back
    const key = [0, 1, 0, 2, 3, 0][si];
    const share = 0.25 + rnd(seed, key, 1) * 0.35;
    set = cells.map((_, i) => rnd(seed, i * 7 + key, 2) < share);
    if (!set.some(Boolean)) set[Math.floor(rnd(seed, key, 3) * cells.length)] = true;
  }
  let scale = 1;
  if (shrinkAt !== undefined && t >= shrinkAt) scale = [1, 0.82, 0.66, 0.54][Math.min(3, Math.floor((t - shrinkAt) / 2) + 1)];
  const s = c * scale;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const left = cx - (cols * s) / 2;
  const top = cy - (rows * s) / 2;
  const lines: React.ReactNode[] = [];
  if (guides) {
    const flick = (i: number) => t >= 20 || rnd(seed, i, Math.floor(t / 2) + 10) > 0.3;
    if (t >= 6)
      for (let r = 0; r <= rows; r++) {
        if (!flick(r)) continue;
        const a = rnd(seed, r, 4);
        const x0 = t >= 13 ? 0 : cx - W * (0.15 + a * 0.35);
        const x1 = t >= 13 ? W : cx + W * (0.1 + rnd(seed, r, 5) * 0.35);
        lines.push(<div key={`r${r}`} style={{ position: 'absolute', left: x0, width: x1 - x0, top: Math.round(top + r * s), height: 1, background: guides }} />);
      }
    if (t >= 13)
      for (let q = 0; q <= cols; q++) {
        if (!flick(q + 40)) continue;
        lines.push(<div key={`c${q}`} style={{ position: 'absolute', top: 0, height: H, left: Math.round(left + q * s), width: 1, background: guides }} />);
      }
  }
  return (
    <AbsoluteFill>
      {lines}
      {cells.map((q, i) =>
        set[i] ? <div key={i} style={{ position: 'absolute', left: left + q[0] * s, top: top + q[1] * s, width: s + 0.5, height: s + 0.5, background: color }} /> : null,
      )}
    </AbsoluteFill>
  );
};
