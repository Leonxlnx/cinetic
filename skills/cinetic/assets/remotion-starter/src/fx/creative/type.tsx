// The line devices' shared type: a centred row measured with the film's face, words placed by transform, and the build
// every line device starts from (words arriving one by one, rising a little and fading in, the row re-centring as it
// grows). Browser only where it measures (under the film's FontGate).
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { measureTracked } from '../../lib/measure';
import type { Word } from './core';

/** The build every line device starts from (f@60): a word's fade, the stagger between words, its rise (share of size). */
export const BUILD = { fade: 16, stagger: 6, rise: 0.12, recentre: 20 } as const;

/** When a line of n words is whole in the build (f@60). */
export const buildFrames = (n: number) => BUILD.stagger * Math.max(0, n - 1) + Math.max(BUILD.fade, BUILD.recentre);

export type RowFont = { size: number; weight: number; track: number; font: string };
/** Advance width of `s` in the row's face (no trailing tracking). */
export const widthIn = (s: string, f: RowFont) => measureTracked(s, f.size, f.weight, f.track, f.font, { trailing: false });
/** A centred row: each word's left edge (px from the frame's left), its width, the space, the row's width and left. */
export const rowOf = (words: string[], f: RowFont, W: number) => {
  const space = widthIn('a a', f) - 2 * widthIn('a', f);
  const ws = words.map((w) => widthIn(w, f));
  const total = ws.reduce((a, b) => a + b, 0) + space * Math.max(0, words.length - 1);
  const left = (W - total) / 2;
  const xs: number[] = [];
  let x = left;
  for (const w of ws) {
    xs.push(x);
    x += w + space;
  }
  return { xs, ws, space, total, left };
};
/** The largest size (at most f.size) at which the words fit `maxW` on one row. */
export const fitRow = (words: string[], f: RowFont, maxW: number): RowFont => {
  const w = widthIn(words.join(' '), { ...f, size: 100 });
  return { ...f, size: Math.min(f.size, (maxW * 100) / Math.max(1, w)) };
};

/** A word's build state at frame t (frames since the line began, fps scale k): opacity, rise (px), arrival (0..1). */
export const wordIn = (t: number, i: number, k: number, size: number) => {
  const p = clamp((t - i * BUILD.stagger * k) / (BUILD.fade * k));
  return { opacity: E.snapOut(p), rise: (1 - E.glideOut(p)) * BUILD.rise * size, p };
};
/** The row's re-centring offset while a build is under way: words not yet there keep the row centred on those that are. */
export const recentre = (t: number, xs: number[], ws: number[], space: number, k: number) => {
  let off = 0;
  for (let i = 1; i < xs.length; i++) {
    const there = E.glideOut(clamp((t - i * BUILD.stagger * k) / (BUILD.recentre * k)));
    off += ((ws[i] + space) / 2) * (1 - there);
  }
  return off;
};

/** One word set at (x, baseline-ish top y) in the row's face; `id` marks it for the layout audit. */
export const WordAt: React.FC<{ id?: string; text: string; x: number; y: number; f: RowFont; color: string; opacity?: number; scale?: number; origin?: string; style?: React.CSSProperties }> = ({ id, text, x, y, f, color, opacity = 1, scale = 1, origin = '50% 60%', style }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: f.font, fontSize: f.size, fontWeight: f.weight, letterSpacing: `${f.track}em`, lineHeight: 1.06, fontKerning: 'normal', color, opacity, transformOrigin: origin, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)${scale !== 1 ? ` scale(${scale.toFixed(5)})` : ''}`, ...style }}>
    <span data-text={id} style={{ display: 'inline-block' }}>
      {text}
    </span>
  </div>
);

/** The words of a line without their key marks, and the key word's index (the last word when none is marked). */
export const keyIndex = (words: Word[]) => {
  const i = words.findIndex((w) => w.key);
  return i >= 0 ? i : words.length - 1;
};
/** A share of the travel between two values on an ease. */
export const lerp = (a: number, b: number, t: number) => mix(a, b, t);
