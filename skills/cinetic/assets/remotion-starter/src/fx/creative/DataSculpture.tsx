// data-sculpture: a number made into an object. A row of lit columns rises out of a baseline, phrased (each one a
// little sooner than the last), the last and tallest in the accent; above them the figure counts up on an ease and
// settles as the last column lands. The data holds up when paused: the columns rise toward the figure, never at random.
import React from 'react';
import { FONT } from '../../brand/tokens';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { face, frameOf, hash01, k60, phrased, type PictureProps, type Recipe, type Params } from './core';

/** House numbers (f@60, px@1080): the columns, their rise, the figure and the baseline. */
export const DATA = { n: 7, col: 92, gap: 34, tall: 380, low: 0.2, rise: 30, span: 0.42, figure: 210, suffix: 0.5, base: 0.74, radius: 16 } as const;

export const RECIPE: Recipe = {
  id: 'data-sculpture',
  recipe:
    'A number made into an object: seven lit columns (92 px) rise out of a baseline (glideOut 30 f each, phrased onsets settling over 42 % of the beat), heights climbing toward the last, tallest one in the accent; above them the figure counts up on settleOut (tabular figures, 210 px) and lands with the last column. Real data only: the figure is the product\'s own.',
  params: { ...DATA },
};

export type Count = { to: number; from?: number; suffix?: string; prefix?: string; decimals?: number };
/** The figure as it reads (prefix, value at `decimals`, suffix). */
export const countText = (c: Count, v: number) => `${c.prefix ?? ''}${v.toFixed(c.decimals ?? (Number.isInteger(c.to) ? 0 : 1))}${c.suffix ?? ''}`;

/** The columns' heights (0..1) at frame t and the figure's value: heights climb toward the last column (seeded steps). */
export const dataState = (t: number, dur: number, count: Count, seed: number, film?: Partial<FilmCtx>, o: Params<typeof DATA> = {}) => {
  const P = { ...DATA, ...o };
  const k = k60(film);
  const span = Math.max(8 * k, dur * P.span);
  const on = phrased(P.n, span, 'settle', 0.82);
  const target = Array.from({ length: P.n }, (_, i) => (i === P.n - 1 ? 1 : mix(P.low, 0.82, (i / (P.n - 1)) ** 1.15) * mix(0.9, 1.06, hash01(seed, i))));
  const h = target.map((v, i) => v * E.glideOut(clamp((t - on[i]) / (P.rise * k))));
  const end = on[P.n - 1] + P.rise * k;
  const p = E.settleOut(clamp(t / end));
  const from = count.from ?? 0;
  return { h, value: mix(from, count.to, p), landed: t >= end, end };
};

export const DataSculpture: React.FC<PictureProps & { count: Count; params?: Params<typeof DATA> }> = ({ f, dur, start = 0, pal, seed = 1, count, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...DATA, ...params };
  const st = dataState(f - start, dur - start, count, seed, film, P);
  const colW = P.col * u;
  const gap = P.gap * u;
  const total = P.n * colW + (P.n - 1) * gap;
  const x0 = (W - total) / 2;
  const base = H * P.base;
  const tall = P.tall * u;
  const text = countText(count, st.value);
  const whole = countText(count, count.to);
  const fs = P.figure * u;
  // the columns before the last in a quiet tone of the ink that still reads on the ground (never a near-white on white)
  const col = (i: number) => (i === P.n - 1 ? pal.accent : pal.dark ? mixColor(pal.ground, '#ffffff', 0.2 + 0.03 * i) : mixColor(pal.ground, pal.type, 0.12 + 0.025 * i));
  const show = E.snapOut(clamp((f - start) / (10 * k60(film))));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* the figure: centred over the columns, its width held by the whole figure (tabular), never jittering */}
      <div data-text={whole} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: W, textAlign: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: fs, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: pal.type, opacity: show, transform: `translate3d(0px, ${(base - tall - fs * 1.18 + (1 - show) * 14 * u).toFixed(2)}px, 0)` }}>
        {text}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: total + 80 * u, height: 2 * u, background: pal.line, transform: `translate3d(${(x0 - 40 * u).toFixed(2)}px, ${base.toFixed(2)}px, 0)` }} />
      {st.h.map((v, i) => {
        const h = Math.max(0, v * tall);
        if (h < 0.5) return null;
        return <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: colW, height: h, borderRadius: `${P.radius * u}px ${P.radius * u}px ${3 * u}px ${3 * u}px`, ...face(col(i), pal, u, { lift: i === P.n - 1 ? 1 : 0 }), transform: `translate3d(${(x0 + i * (colW + gap)).toFixed(2)}px, ${(base - h).toFixed(2)}px, 0)` }} />;
      })}
    </div>
  );
};
