// InkLine (type, enter / build): a centred line built word by word; each word cuts on in a tint (grey, an accent, a
// path of hues or warm light) and inks a few frames later while the whole line re-centres, most of the travel on the
// frame the word lands.
// Numbers: 55 % of the re-centre on the arrival frame, the rest an exponential glide (time constant 2.6 f, done in
// about 10 f); grey to ink in 4 f; a hue path steps one colour a frame (ink in 9 f); warm light sweeps the word right
// to left in 6 f (sine in-out); the new word lands with 40 % of its space, which opens on the same glide (or
// lands wide and closes).
// Caution: one word every 6-12 f; faster than 4 f the tint never shows. Pass `fit` when the line could outgrow the
// frame (it sizes the whole line once, before the first word).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { mixColor, useTextLayout, type TextLayout } from '../../type';

/** Warm light as printed: cream, gold, orange, rose, plum, then the ink (the dark end sweeps in from the right). */
export const HEAT_PATH = ['#FCF0CF', '#F3C474', '#E08A52', '#B9605B', '#7C3B4E', '#3A1B27'];
/** A pastel hue path walked one step a frame: sand, cyan, sky, blue, deep blue (ink on the next frame). Any path may be
 * passed as `tint`; keep invented paths clear of violet and green. */
export const HUE_PATH = ['#EDD8B3', '#E2CA9C', '#B3DCD6', '#9FD6E6', '#9CC4EE', '#7FA6E6', '#5D84D8', '#3E60B2', '#22366A'];

export type InkLineMotion = { lead: number; tau: number; anticipate: number; space: 'open' | 'close' | 'still'; maxWidth: number };

/**
 * Where every word of a line that grows word by word sits at frame `f` (x of each word's left edge relative to the line's
 * centre, before `scale`), with the re-centre chained over the arrivals: each move starts from where the line was when
 * it began, `lead` of it on the arrival frame, then an exponential glide (`tau` frames). `left`/`right` bound the words
 * shown; `scale` sets the whole line smaller, from its first word, when the full line would pass `maxWidth` px (0: never). Shared by the pieces that frame such a line.
 */
export const inkLineLayout = (f: number, L: TextLayout, T: number[], o: InkLineMotion) => {
  const n = T.length;
  const ws = L.words.map((w) => w.width);
  // the space before word i, as the face sets it
  const sp = L.words.map((w, i) => (i === 0 ? 0 : w.x - (L.words[i - 1].x + L.words[i - 1].width)));
  const span = (k: number) => ws.slice(0, k).reduce((a, b) => a + b, 0) + sp.slice(1, k).reduce((a, b) => a + b, 0);
  // the fit is decided once, from the whole line: when the full line would pass `maxWidth` it is set at that size from
  // the first word, so the line never changes size while it grows
  const full = o.maxWidth > 0 ? Math.min(1, o.maxWidth / Math.max(1, span(n))) : 1;
  const fitOf = (_k: number) => full;
  // what is left of a move that starts at arrival t: 1 before it, a linear lead-in while anticipating, (1 - lead) on the
  // arrival frame, then the glide
  const rest = (ff: number, t: number) => {
    const d = ff - t;
    if (d < -o.anticipate) return 1;
    if (d < 0) return 1 - (o.lead * (d + o.anticipate + 1)) / (o.anticipate + 1);
    return (1 - o.lead) * Math.exp(-d / o.tau);
  };
  const starts: Array<readonly [number, number]> = [];
  const chain = (ff: number, upto: number): readonly [number, number] => {
    let l = -span(1) / 2;
    let s = fitOf(1);
    for (let k = 1; k < upto; k++) {
      if (ff < T[k] - o.anticipate) break;
      const r = rest(ff, T[k]);
      l = -span(k + 1) / 2 + (starts[k][0] + span(k + 1) / 2) * r;
      s = fitOf(k + 1) + (starts[k][1] - fitOf(k + 1)) * r;
    }
    return [l, s];
  };
  for (let k = 1; k < n; k++) starts[k] = chain(T[k] - o.anticipate - 1, k);
  const [left, scale] = chain(f, n);
  const spaceNow = (i: number) => {
    if (i === 0) return 0;
    if (o.space === 'still' || f < T[i]) return sp[i];
    const r = clamp(rest(f, T[i]) / Math.max(0.01, 1 - o.lead));
    return o.space === 'open' ? sp[i] * (1 - 0.6 * r) : sp[i] * (1 + 0.55 * r);
  };
  const xs: number[] = [];
  let x = left;
  let right = left;
  for (let i = 0; i < n; i++) {
    x += spaceNow(i);
    xs.push(x);
    x += ws[i] ?? 0;
    if (f >= T[i]) right = x;
  }
  return { xs, left, right, scale };
};

/**
 * InkLine: the voice-over line. Words join a centred line one at a time; each lands in `tint` and becomes the ink:
 * a single colour blends to the ink over `settle` frames (a grey, the accent), an array of colours is walked one a
 * frame (a hue path), and 'heat' prints the word in warm light that sweeps from right to left. `inkOn="next"` holds the
 * tint until the next word lands. The line re-centres on every arrival with `lead` of the move on the arrival frame
 * and a glide after it; `anticipate` starts the slide a few frames early (the line makes room before the word comes).
 * `space` sets how the new word's space behaves: 'open' (lands at 40 % of its space, opens), 'close' (lands wide, closes) or
 * 'still'. `fit`: when the whole line would pass that share of the frame's width, it is set smaller from its first word
 * (one size for the whole build, never a size jump per word); a line that fits is left at `size`.
 */
export const InkLine: React.FC<{
  text: string;
  at?: number;
  /** Frames between words (default 9) when `times` is not given. */
  gap?: number;
  /** The landing frame of each word. */
  times?: number[];
  size?: number;
  /** The ink. */
  color?: string;
  /** Final colours of chosen words (the accent words of a line), by word index. */
  accents?: Record<number, string>;
  /** How a word lands: a colour, a path of colours (one a frame), or 'heat'. */
  tint?: string | string[] | 'heat';
  /** Frames from a single tint to the ink (default 4). */
  settle?: number;
  /** 'age': a word inks `settle` frames after it lands (default); 'next': it keeps its tint until the next word lands. */
  inkOn?: 'age' | 'next';
  /** 'cut' (default), 'smear' (slides in from the right on one smeared frame), 'blur' (sharpens over 5 f), 'rise'. */
  enter?: 'cut' | 'smear' | 'blur' | 'rise';
  space?: 'open' | 'close' | 'still';
  /** Share of each re-centre done on the arrival frame (default 0.55). */
  lead?: number;
  /** Time constant of the glide after it, in frames (default 2.6). */
  tau?: number;
  /** Frames the re-centre starts before the word lands (default 0). */
  anticipate?: number;
  /** Widest the line may be, as a share of the frame's width; a longer line is set smaller from the start (default 0: never). */
  fit?: number;
  /** From this frame the line is gone (a hard cut). */
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  /** Tracking in em (default -0.02). */
  tracking?: number;
}> = ({
  text,
  at = 0,
  gap = 9,
  times,
  size = 110,
  color = '#141414',
  accents = {},
  tint = '#C4C4C4',
  settle = 4,
  inkOn = 'age',
  enter = 'cut',
  space = 'open',
  lead = 0.55,
  tau = 2.6,
  anticipate = 0,
  fit = 0,
  leaveAt,
  x,
  y,
  font = fonts.inter,
  weight = 500,
  tracking = -0.02,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: `${tracking}em`, lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  const n = words.length;
  const T = Array.from({ length: n }, (_, i) => times?.[i] ?? Math.round(at + i * gap));
  if (!L.ready || L.words.length < n || frame < T[0] - anticipate || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const { xs, scale } = inkLineLayout(frame, L, T, { lead, tau, anticipate, space, maxWidth: fit * width });
  const shown = T.filter((t) => frame >= t).length;
  const colourOf = (i: number) => {
    const fin = accents[i] ?? color;
    const hold = inkOn === 'next' && i + 1 < n ? Math.max(0, T[i + 1] - T[i]) : 0;
    const age = frame - T[i];
    if (tint === 'heat') return fin;
    if (inkOn === 'next' && i + 1 < n && frame < T[i + 1]) return Array.isArray(tint) ? tint[0] : tint;
    if (Array.isArray(tint)) {
      const k = Math.floor(age - hold);
      return k < tint.length ? tint[Math.max(0, k)] : fin;
    }
    return mixColor(tint, fin, clamp((age - hold) / Math.max(1, settle)));
  };
  const top = cy - L.height / 2;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const xx = xs[i];
    if (i < shown) {
      const age = frame - T[i];
      const base: React.CSSProperties = { ...style, position: 'absolute', left: xx, top: 0, whiteSpace: 'pre', color: colourOf(i) };
      if (tint === 'heat' && age < 12) {
        // the word printed in warm light: a gradient clipped to the glyphs, its dark end sweeping in from the right
        const q = clamp(age / 6);
        const p = 0.5 - 0.5 * Math.cos(Math.PI * q);
        const fin = accents[i] ?? color;
        Object.assign(base, {
          color: 'transparent',
          // (from gold, never from a clear or cream stop: the word's first letter would vanish into a light ground)
          backgroundImage: `linear-gradient(90deg, ${HEAT_PATH.slice(1).map((h, j) => `${h} ${j * 12}%`).join(', ')}, ${fin} 70%, ${fin} 100%)`,
          backgroundSize: '300% 100%',
          backgroundPosition: `${p * 100}% 0`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        });
      }
      if (enter === 'smear' && age < 2) {
        // the arrival frame: the word slides in from the right, drawn as a horizontal smear of copies
        const d = (age === 0 ? 0.6 : 0.14) * size;
        for (let g = 0; g < 6; g++) out.push(<span key={`${i}-${g}`} style={{ ...base, left: xx + (d * g) / 5, opacity: 0.3 }}>{words[i]}</span>);
      } else if (enter === 'blur' && age < 5) {
        out.push(<span key={i} style={{ ...base, filter: `blur(${(1 - age / 5) * 0.1 * size}px)` }}>{words[i]}</span>);
      } else if (enter === 'rise' && age < 6) {
        const q = 1 - Math.pow(1 - clamp((age + 1) / 6), 3);
        out.push(<span key={i} style={{ ...base, transform: `translateY(${(1 - q) * 0.2}em)` }}>{words[i]}</span>);
      } else out.push(<span key={i} style={base}>{words[i]}</span>);
    }
  }
  return (
    <div style={{ position: 'absolute', left: cx, top, width: 0, height: L.height, transform: `scale(${scale})`, transformOrigin: '0 50%' }}>
      {out}
    </div>
  );
};
