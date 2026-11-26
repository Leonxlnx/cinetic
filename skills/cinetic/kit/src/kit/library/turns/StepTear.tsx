// StepTear (turn, join): the old paper is torn away in held steps (a corner, then a strip from the opposite corner, then
// the rest), each step showing more of the next picture under a ragged, pixel-stepped edge and adding one word to
// the line, which stays in place and turns from the paper's ink to the picture's.
// Numbers: 4 steps of 5 f (no tween between them); tear regions grow from the top-right, then the bottom-left, then the
// bottom-right; the edge is stepped on a grid of 1/160 of the width with a ragged noise of 0.1 of the frame.
// Caution: the line must read on both grounds (it changes ink once, on the last step); three or four short words.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { useTextLayout } from '../../type';
import { type Scenes, sp } from './_shared';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const CXY = (c: Corner, W: number, H: number) => [c.endsWith('left') ? 0 : W, c.startsWith('top') ? 0 : H] as const;
const noise = (x: number, y: number, s: number) =>
  0.5 * Math.sin(x * 7.1 + s) * Math.cos(y * 5.3 + s * 1.3) + 0.3 * Math.sin(x * 17.3 + y * 13.1 + s * 2.1) + 0.2 * Math.sin(x * 41.7 - y * 37.9 + s * 0.7);

/**
 * StepTear: a torn reveal in held steps. Every cell of a fine grid gets a value: its distance to the nearest tear corner
 * (each corner starting later: `corners` in order, `stagger` apart) plus a smooth noise (the torn edge) and a cell jitter
 * (its pixel steps). Step i shows the next scene wherever the value is below `levels[i]`; the last level shows all of it.
 * The steps are held (`hold` frames each), never tweened. The line (`words`, one more on each step, centred on x, y) is
 * drawn on top in `ink` and switches to `inkTo` on the last step. `from` is the paper, `to` the picture.
 * Measured: steps on f0, f5, f10, f15 (top-right corner, bottom-left strip, most, all); a word a step.
 */
export const StepTear: React.FC<
  Scenes & {
    words?: string[];
    style?: React.CSSProperties;
    ink?: string;
    inkTo?: string;
    x?: number;
    y?: number;
    hold?: number;
    corners?: Corner[];
    stagger?: number;
    /** The reveal level of each step (0..1 of the farthest value); the last should be 1. */
    levels?: number[];
    rag?: number;
    seed?: number;
  }
> = ({ from, to, at: start, speed = 1, words = [], style = {}, ink, inkTo, x: xIn, y: yIn, hold = 5, corners = ['top-right', 'bottom-left', 'bottom-right'], stagger = 0.22, levels = [0.3, 0.55, 0.8, 1], rag = 0.1, seed = 4 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const n = levels.length;
  const h = sp(hold, speed);
  const step = frame < start ? -1 : Math.floor((frame - start) / h);
  const shown = Math.max(0, Math.min(words.length, step + 1));
  const text = words.slice(0, Math.max(1, shown)).join(' ');
  const last = step >= n - 1;
  const L = useTextLayout(words.join(' ') || ' ', style);
  const Lnow = useTextLayout(text || ' ', style);
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const line = words.length ? (
    <div style={{ position: 'absolute', left: x - Lnow.width / 2, top: y - L.height / 2, whiteSpace: 'pre', ...style, color: last ? inkTo ?? style.color : ink ?? style.color, opacity: Lnow.ready ? 1 : 0 }}>{text}</div>
  ) : null;
  if (step < 0) return <AbsoluteFill>{from}{line}</AbsoluteFill>;
  if (last) return <AbsoluteFill>{to}{line}</AbsoluteFill>;
  const c = W / 160;
  const cols = 160;
  const rows = Math.ceil(H / c);
  const diag = Math.hypot(W, H);
  const level = levels[step];
  // each cell's value, normalised between the smallest and the largest in the frame (level 1 shows all of it)
  const val = (i: number, j: number) => {
    const px = (i + 0.5) * c, py = (j + 0.5) * c;
    let v = Infinity;
    corners.forEach((cn, m) => {
      const [cx, cy] = CXY(cn, W, H);
      v = Math.min(v, m * stagger + Math.hypot(px - cx, py - cy) / diag);
    });
    return v + rag * noise(px / W, py / H, seed) + 0.012 * rand(i * 3.1 + j * 7.7 + seed);
  };
  const V: number[] = [];
  let vmin = Infinity, vmax = -Infinity;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const v = val(i, j);
      V.push(v);
      vmin = Math.min(vmin, v);
      vmax = Math.max(vmax, v);
    }
  let d = '';
  for (let j = 0; j < rows; j++) {
    let run = -1;
    for (let i = 0; i <= cols; i++) {
      const on = i < cols && (V[j * cols + i] - vmin) / (vmax - vmin) < level;
      if (on && run < 0) run = i;
      if (!on && run >= 0) {
        d += `M${(run * c).toFixed(1)} ${(j * c).toFixed(1)}H${(i * c + 0.5).toFixed(1)}V${((j + 1) * c + 0.5).toFixed(1)}H${(run * c).toFixed(1)}Z`;
        run = -1;
      }
    }
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: d ? `path('${d}')` : 'inset(100%)' }}>{to}</AbsoluteFill>
      {line}
    </AbsoluteFill>
  );
};

export const stepTearEnd = (at: number, steps = 4, hold = 5, speed = 1) => at + (steps - 1) * sp(hold, speed);
