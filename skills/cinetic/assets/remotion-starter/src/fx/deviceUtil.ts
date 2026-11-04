// Small shared helpers for the device primitives (Seed, Loaders, Grids, Radiate...): seeded irregular
// onsets and a tiny path builder for clip paths made of rects. Pure, Node-safe.
import { rand } from '../lib/anim';
import { f60x } from '../lib/film';

/**
 * n whole-frame onsets from `start`, gaps drawn from `range` (60 fps frames, inclusive, uniform) and
 * converted to `fps`; cumulative rounding so the mean holds at any rate. Repeatable from `seed`.
 */
export const irregularOnsets = (start: number, n: number, range: [number, number], seed: string | number, fps: number): number[] => {
  const out: number[] = [];
  let t = start;
  for (let i = 0; i < n; i++) {
    out.push(Math.round(t));
    const g = range[0] + rand(`${seed}:gap:${i}`) * (range[1] - range[0]);
    t += f60x(g, fps);
  }
  return out;
};

/** Cumulative whole-frame onsets from explicit gaps (60 fps frames), converted to `fps`. */
export const gapsToOnsets = (start: number, gaps60: readonly number[], fps: number): number[] => {
  const out = [Math.round(start)];
  let t = start;
  for (const g of gaps60) {
    t += f60x(g, fps);
    out.push(Math.round(t));
  }
  return out;
};

/** An SVG/CSS path made of axis-aligned rects (for clip-path: path(...)). */
export const rectsPath = (rects: { x: number; y: number; w: number; h: number }[]): string =>
  rects.map((r) => `M${r.x.toFixed(1)} ${r.y.toFixed(1)}h${r.w.toFixed(1)}v${r.h.toFixed(1)}h${(-r.w).toFixed(1)}Z`).join('');
