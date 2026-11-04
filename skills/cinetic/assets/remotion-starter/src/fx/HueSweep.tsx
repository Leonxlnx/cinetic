import React from 'react';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { clamp, E, type Ease, prog } from '../lib/anim';
import { mixColor, oklch, pathColor, toOklch } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

type Role = keyof typeof TYPE;

/**
 * A keyword inking along a colour path: it arrives pale, holds its lightness while the colour turns,
 * then darkens through the accent to the ink. The front crosses the word letter by letter (`lag`, house:
 * the right end leads), so mid-sweep the end of the word is a step darker than its start.
 *
 * The public default is ONE hue, held at the accent's hue, with the house lightness and chroma
 * trajectories: lightness stays near a pale L .86 for the first third, then falls on an ease-in to the
 * ink's lightness; chroma dips a little while the lightness holds, swells to its peak (about the accent,
 * at most C .12) just past half-way, and falls away into the ink. A path across hues is the generated
 * look: only a supplied brand may pass one (`path`, mixed in OKLab along `ease`).
 *
 * House timing at 30 fps: 9 frames per word, words 10-12 frames apart on the reading cadence; before an
 * exit the colour can heat back linearly in 6-9 frames (`back`).
 */

/** House numbers: frames at 30 fps; the one-hue trajectory as tables at t = 0, 1/9 ... 1 (L as progress to the ink, C as a share of the peak). */
export const SWEEP_HOUSE = {
  dur30: 9,
  gap30: 11,
  lag30: -0.5, // frames per letter, negative: the right end leads (mid-sweep the last letters are a step darker); a 4-letter word in about 2 frames
  paleL: 0.86,
  peakC: 0.12, // the chroma ceiling of the swell (the accent's own chroma when lower)
  lShape: [0, 0.006, 0.006, 0.024, 0.122, 0.272, 0.482, 0.705, 0.864, 1] as const,
  cShape: [0.7, 0.49, 0.54, 0.66, 0.89, 1, 0.73, 0.38, 0.24, 0.18] as const,
} as const;

/** A table of values at evenly spaced t, drawn with a monotone cubic (no overshoot between points). */
const tableAt = (ys: readonly number[], t: number): number => {
  const n = ys.length - 1;
  if (t <= 0) return ys[0];
  if (t >= 1) return ys[n];
  const h = 1 / n;
  const d = ys.slice(0, -1).map((y, i) => (ys[i + 1] - y) / h);
  const m = ys.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n) return d[n - 1];
    const a = d[i - 1];
    const b = d[i];
    if (a * b <= 0) return 0;
    return (2 * a * b) / (a + b);
  });
  const i = Math.min(n - 1, Math.floor(t / h));
  const u = (t - i * h) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
};

/** True when OKLCH (L, C, h) is inside sRGB (no channel clipped). */
const inGamut = (L: number, Ch: number, h: number) => {
  const r = (h * Math.PI) / 180;
  const a = Ch * Math.cos(r);
  const b = Ch * Math.sin(r);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
};

/** The largest chroma at (L, h) inside sRGB (bisection). */
const maxChroma = (L: number, h: number) => {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid, h)) lo = mid;
    else hi = mid;
  }
  return lo;
};

/**
 * The house one-hue sweep at progress t (0..1): OKLCH at the accent's hue, landing exactly on the ink. The
 * peak chroma is the accent's (at most C .12), lowered when the trajectory would leave sRGB anywhere (a pale,
 * saturated blue clips first), so the chroma keeps its shape instead of flattening at the gamut's edge.
 */
export const sweepHouse = (t: number, accent: string = C.accent, ink: string = C.ink): string => {
  if (t >= 1) return mixColor(ink, ink, 0);
  const [, ac, h] = toOklch(accent);
  const [li] = toOklch(ink);
  const H = SWEEP_HOUSE;
  const Lat = (u: number) => H.paleL + (li - H.paleL) * tableAt(H.lShape, u);
  let Cpk = Math.min(ac, H.peakC);
  for (let k = 0; k < H.lShape.length; k++) {
    const u = k / (H.lShape.length - 1);
    const sh = tableAt(H.cShape, u);
    if (sh > 0) Cpk = Math.min(Cpk, (0.98 * maxChroma(Lat(u), h)) / sh);
  }
  return oklch(Lat(t), Cpk * tableAt(H.cShape, t), h);
};

/** The house sweep as stops (for a preview or a legend): 10 colours at t = 0 ... 1. */
export const sweepPath = (accent: string = C.accent, ink: string = C.ink): { stops: string[]; at: number[] } => {
  const at = SWEEP_HOUSE.lShape.map((_, k) => k / (SWEEP_HOUSE.lShape.length - 1));
  return { stops: at.map((t) => sweepHouse(t, accent, ink)), at };
};

export type SweepOpts = {
  start: number; // the sweep's 0 frame (its first colour shows on start)
  dur?: number; // film frames (house 9 at 30 fps)
  path?: string[]; // a supplied brand's colour stops (mixed in OKLab); default: the house one-hue sweep of accent and ink
  at?: number[]; // stop positions 0..1 (default evenly spaced)
  accent?: string; // the accent the house sweep is built on (default C.accent)
  ink?: string; // the ink it lands on (default C.ink)
  ease?: Ease; // progress over time (default linear: the house trajectory carries its own shape)
  lag?: number; // film frames per letter of front delay (house -0.5 at 30 fps: the right end leads); positive: the left end leads
  back?: { at: number; dur?: number }; // heat back to the start colour before an exit, linearly (house 7 f at 30 fps)
};

/**
 * The colour at frame f of the letter at index i of n (pure). The front reaches letter i `lag` x i frames
 * after letter 0 (lag < 0: the right end leads). Returns an 'rgb(...)' string.
 */
export const sweepColor = (f: number, o: SweepOpts, i = 0, n = 1, film?: Partial<FilmCtx>): string => {
  const fps = fpsOf(film);
  const dur = o.dur ?? f60x(SWEEP_HOUSE.dur30 * 2, fps);
  const lag = o.lag ?? f60x(SWEEP_HOUSE.lag30 * 2, fps);
  const pos = lag >= 0 ? i : n - 1 - i;
  const delay = Math.abs(lag) * pos;
  const t = clamp((f - o.start - delay) / Math.max(1e-6, dur));
  let s = (o.ease ?? E.linear)(t);
  if (o.back) s *= 1 - prog(f, o.back.at, o.back.at + (o.back.dur ?? f60x(14, fps)), E.linear);
  return o.path ? pathColor(o.path, s, o.at) : sweepHouse(s, o.accent, o.ink);
};

/** OKLCH lightness and chroma of the sweep at frame f (letter 0): the public-default trajectory check reads these. */
export const sweepLC = (f: number, o: SweepOpts, film?: Partial<FilmCtx>): { L: number; C: number; h: number } => {
  const [L, Ch, h] = toOklch(sweepColor(f, o, 0, 1, film));
  return { L, C: Ch, h };
};

/** Frames of a sweep: start, the frame the first letter reaches ink, and the last letter. */
export const sweepFrames = (o: SweepOpts, n = 1, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const dur = o.dur ?? f60x(SWEEP_HOUSE.dur30 * 2, fps);
  const lag = Math.abs(o.lag ?? f60x(SWEEP_HOUSE.lag30 * 2, fps));
  return { start: o.start, first: Math.ceil(o.start + dur), last: Math.ceil(o.start + dur + lag * (n - 1)) };
};

/**
 * <HueSweep text start>: the word drawn letter by letter in its sweep colour (layout untouched: the
 * letters are spans of one line). Several words: `starts` per word (else `gap` film frames apart, house 11
 * at 30 fps), each sweeping on its own.
 */
export const HueSweep: React.FC<
  SweepOpts & {
    text: string;
    frame: number; // local frame
    starts?: number[];
    gap?: number;
    role?: Role;
    size?: number;
    family?: string;
    hideBefore?: boolean; // a word is drawn from its sweep's start (default true)
    id?: string;
    style?: React.CSSProperties;
  }
> = ({ text, frame, starts, gap, role = 'display', size: sizeProp, family = FONT.text, hideBefore = true, id = 'sweep', style, ...o }) => {
  const film = useFilm();
  const size = sizeProp ?? TYPE[role].size * uOf(film);
  const words = text.split(' ');
  const g = gap ?? f60x(SWEEP_HOUSE.gap30 * 2, film.fps);
  return (
    <span data-text={id} style={{ ...typeStyle(role, size), fontFamily: family, display: 'inline-block', ...style }}>
      {words.map((w, wi) => {
        const st = starts?.[wi] ?? o.start + wi * g;
        const shown = !hideBefore || frame >= st;
        return (
          <span key={wi} style={{ opacity: shown ? 1 : 0 }}>
            {[...w].map((ch, i) => (
              <span key={i} style={{ color: sweepColor(frame, { ...o, start: st }, i, w.length, film) }}>
                {ch}
              </span>
            ))}
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
};

/** A sweep is a continuous colour change: it declares nothing. */
export const declares = (_props?: Partial<SweepOpts>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

/**
 * A gradient clipped to type, padded so its descenders survive: background-clip: text clips to the element box, so
 * at line-height 1 the bottoms of g, p and y are cut. The padding (.18em above, .32em below) is taken back by a
 * negative margin, so the line sits where it would. Spread it on the span that holds the text.
 */
export const clipText = (fill: string): React.CSSProperties => ({
  backgroundImage: fill,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  padding: '0.18em 0 0.32em',
  marginTop: '-0.18em',
  marginBottom: '-0.32em',
  display: 'inline-block',
});

/**
 * A colour band running through a word: ink | band | ink, its tail and head in px of the word's box (the head leads),
 * each edge `edge` px soft. A giant subject word with the accent passing through it; it need not finish (the cut
 * does). Use with clipText().
 */
export const bandFill = (o: { tail: number; head: number; edge?: number; ink: string; band: string }): string => {
  const e = o.edge ?? 120;
  const px = (v: number) => `${v.toFixed(1)}px`;
  return `linear-gradient(90deg, ${o.ink} ${px(o.tail - e / 2)}, ${o.band} ${px(o.tail + e / 2)}, ${o.band} ${px(o.head - e / 2)}, ${o.ink} ${px(o.head + e / 2)})`;
};

/**
 * Ink by a front moving in px rather than by letters: the part the front has passed is in its ink, the part ahead the colour
 * is a function of the distance to the front (`ramp`: [px ahead of the front, colour] pairs). An answer inking from
 * right to left as it is written (rtl: the front moves left, the ink is behind it on the right). Use with clipText().
 */
export const frontFill = (o: { front: number; ink: string; ramp: [number, string][]; dir?: 'rtl' | 'ltr' }): string => {
  const near = [...o.ramp].sort((p, q) => p[0] - q[0]);
  if ((o.dir ?? 'rtl') === 'rtl') {
    // the front moves left: behind it (right) the ink, ahead of it (left) the ramp by distance
    const stops = [...near].reverse().map(([d, c]) => `${c} ${(o.front - d).toFixed(1)}px`);
    return `linear-gradient(90deg, ${stops.join(', ')}, ${o.ink} ${o.front.toFixed(1)}px)`;
  }
  const stops = near.map(([d, c]) => `${c} ${(o.front + d).toFixed(1)}px`);
  return `linear-gradient(90deg, ${o.ink} ${o.front.toFixed(1)}px, ${stops.join(', ')})`;
};
