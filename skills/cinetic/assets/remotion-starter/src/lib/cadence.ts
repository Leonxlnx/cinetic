// Cadence: when things happen. Stepped time (an animation on 12/16/20 fps or on twos inside a 60 fps
// film), accelerating onsets for a payoff, the reading rhythm of a fragment's words, and irregular
// but repeatable gaps for a collage. Pure functions of their arguments; discrete states decide on
// whole frames, so every motion-blur sub-sample of one output frame agrees. Node-safe.
import { clamp, type Ease, rand } from './anim';
import { fpsOf } from './film';

/**
 * Stepped time: the frame an animation running at `animFps` shows at film frame f (a film at
 * `filmFps`). It holds each pose for filmFps / animFps frames: 16 fps in a 60 fps film holds 3.75
 * frames, so the holds alternate 4, 4, 4, 3 (16 in 24: one held frame in every 3). `phase` shifts
 * the grid (frames). Feed the result to the animation instead of f; declare the range in the
 * timeline's STEPPED so blur sampling and the checks treat it as designed.
 */
export const stepFrame = (f: number, o: { animFps?: number; filmFps?: number; phase?: number } = {}): number => {
  const anim = o.animFps ?? 12;
  const film = o.filmFps ?? fpsOf();
  const phase = o.phase ?? 0;
  const per = film / anim; // film frames per pose
  const k = Math.floor((Math.round(f) - phase) / per + 1e-9);
  return phase + k * per;
};

/** On twos (or threes): every `on` frames the pose updates; between, it holds (whole frames from `phase`). */
export const onTwos = (f: number, on = 2, phase = 0): number => phase + Math.floor((Math.round(f) - phase) / on) * on;

/**
 * Accelerating onsets: n items whose gaps go from `first` to `last` frames (last < first speeds up),
 * shaped geometric (equal ratios, the house payoff), linear, or by an ease. `onsets[0]` is 0; add the
 * group's start. `durScale[i]` = gap after item i / first gap: scale each item's own duration with
 * it, so later items are quicker too. Onsets are whole frames.
 */
export const accel = (n: number, first: number, last: number, shape: 'geometric' | 'linear' | Ease = 'geometric') => {
  const gaps = Array.from({ length: Math.max(0, n - 1) }, (_, i) => {
    const t = n > 2 ? i / (n - 2) : 0;
    if (shape === 'geometric') return first * (last / first) ** t;
    if (shape === 'linear') return first + (last - first) * t;
    return first + (last - first) * shape(t);
  });
  const onsets = [0];
  for (const g of gaps) onsets.push(onsets[onsets.length - 1] + g);
  return { onsets: onsets.map((o) => Math.round(o)), durScale: onsets.map((_, i) => (gaps[Math.min(i, gaps.length - 1)] ?? first) / first) };
};

/**
 * The reading cadence of a fragment: word i starts after word i-1 by `base` frames scaled by the
 * previous word's length against the fragment's mean (clamped to 0.7-1.4x), so a long word earns a
 * longer look before the next one arrives. `onsets[0]` is 0; whole frames unless `whole` is false.
 * The total span stays close to (n - 1) * base.
 */
export const reading = (words: string[], base: number, o: { min?: number; max?: number; whole?: boolean } = {}): number[] => {
  const min = o.min ?? 0.7;
  const max = o.max ?? 1.4;
  const len = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length || 1);
  const mean = len.length > 1 ? len.slice(0, -1).reduce((a, b) => a + b, 0) / (len.length - 1) : 1;
  const out = [0];
  for (let i = 1; i < words.length; i++) out.push(out[i - 1] + base * clamp(len[i - 1] / mean, min, max));
  return o.whole === false ? out : out.map((v) => Math.round(v));
};

/**
 * Irregular gaps that repeat: n whole-frame gaps between `min` and `max` whose mean is `mean` (as
 * close as whole frames allow), from `seed`. For a stop-motion collage or markers that blink on an
 * uneven beat: the eye reads it as hand-timed, the render reads it the same every time.
 */
export const irregular = (seed: number | string, n: number, mean: number, min: number, max: number): number[] => {
  if (n <= 0) return [];
  const lo = Math.max(1, Math.ceil(min));
  const hi = Math.max(lo, Math.floor(max));
  const target = clamp(mean, lo, hi);
  // start from seeded values spread around the mean, then nudge the sum to n * target inside [lo, hi]
  const g = Array.from({ length: n }, (_, i) => {
    const r = rand(`${seed}:gap:${i}`);
    const span = Math.min(target - lo, hi - target);
    return Math.round(clamp(target + (r * 2 - 1) * Math.max(1, span), lo, hi));
  });
  let diff = Math.round(n * target) - g.reduce((a, b) => a + b, 0);
  for (let pass = 0; diff !== 0 && pass < 4 * n; pass++) {
    const i = Math.floor(rand(`${seed}:fix:${pass}`) * n);
    const step = diff > 0 ? 1 : -1;
    if (g[i] + step >= lo && g[i] + step <= hi) {
      g[i] += step;
      diff -= step;
    }
  }
  return g;
};


/**
 * Phrased staggers: n onsets whose gaps phrase instead of ticking. Equal spacing reads metronomic, the tell of a
 * machine-timed reveal; a phrased run keeps the spread of its gaps (std / mean) at PHRASE.cv or more, the way word and
 * item onsets fall when a person times them: a run decelerating into its accent, a lead that lands and then the rest
 * rushing in, or items arriving in groups with a breath between the groups. Every shape keeps the run's span
 * ((n - 1) x gap), so a line's resolved frame and a list's last onset stay where an even stagger put them.
 *   settle  gaps grow from the first to `settle.ratio` times it, and the gap before the accent (the last item) is
 *           `settle.accent` times longer still: the last word lands after a held beat (house for a line of type)
 *   rush    the lead item lands, holds `rush.lead` times the first quick gap, then the rest come in faster and faster
 *           (to `rush.ratio` of the first quick gap): the accent is the lead
 *   group   items in groups of 2-3 (dealt from the seed, never a group of one past the first), `group.inner` apart
 *           inside a group and `group.between` between groups: the accent is the first of the last group
 * `accent` is the item a caller sets apart (a scale step, the accent colour, a sound): the one after the longest hold.
 */
export const PHRASE = {
  cv: 0.3, // the least spread of a phrased run's gaps (std / mean); an even stagger is 0
  settle: { ratio: 2.2, accent: 1.35 },
  rush: { lead: 2, ratio: 0.42 },
  group: { inner: 0.36, between: 1.65 },
  minGap: 1, // film frames between two onsets at least (whole-frame runs)
} as const;
export type PhraseShape = 'settle' | 'rush' | 'group';
export type Phrase = { onsets: number[]; gaps: number[]; accent: number; groups: number[]; shape: PhraseShape };

/** The spread of a run's gaps (std / mean): 0 for an even stagger; a phrased run keeps PHRASE.cv or more. Pure. */
export const gapSpread = (onsets: readonly number[]): number => {
  const g = onsets.slice(1).map((v, i) => v - onsets[i]);
  if (g.length < 2) return 0;
  const m = g.reduce((a, b) => a + b, 0) / g.length;
  if (m <= 0) return 0;
  return Math.sqrt(g.reduce((a, b) => a + (b - m) ** 2, 0) / g.length) / m;
};

/** Group sizes for n items from a seed: 2s and 3s (the first may be a lone lead when n is 3). Pure. */
export const phraseGroups = (n: number, seed: number | string = 0): number[] => {
  if (n <= 2) return [n];
  if (n === 3) return [1, 2]; // a lead, then a pair (a group of one only ever leads)
  const out: number[] = [];
  let left = n;
  let k = 0;
  while (left > 0) {
    if (left <= 3) {
      out.push(left);
      break;
    }
    const take = left === 4 ? 2 : rand(`${seed}:g${k++}`) < 0.5 ? 2 : 3;
    out.push(take);
    left -= take;
  }
  return out;
};

/** A shape for a run from its seed (a line's text, a list's id): settle twice as often as the others. Pure. */
export const phraseShape = (seed: number | string, allowed: readonly PhraseShape[] = ['settle', 'settle', 'group', 'rush']): PhraseShape =>
  allowed[Math.floor(rand(`${seed}:phrase`) * allowed.length) % allowed.length];

/**
 * The phrased onsets of n items `gap` frames apart on average (offsets from the first, onsets[0] = 0, the last at
 * (n - 1) x gap exactly). `whole` (default true) rounds to whole frames, keeping each gap at least PHRASE.minGap and the
 * span exact; false keeps the fractional onsets (a primitive that already works in fractional frames). Pure.
 */
export const phrase = (n: number, gap: number, o: { shape?: PhraseShape; seed?: number | string; groups?: number[]; whole?: boolean } = {}): Phrase => {
  const shape = o.shape ?? 'settle';
  if (n <= 1) return { onsets: [0], gaps: [], accent: 0, groups: [n], shape };
  if (n === 2) return { onsets: [0, o.whole === false ? gap : Math.round(gap)], gaps: [gap], accent: 1, groups: [2], shape };
  const P = PHRASE;
  let w: number[] = [];
  let accent = n - 1;
  let groups = [n];
  if (shape === 'settle') {
    w = Array.from({ length: n - 1 }, (_, i) => P.settle.ratio ** (n > 2 ? i / (n - 2) : 0));
    w[n - 2] *= P.settle.accent;
  } else if (shape === 'rush') {
    w = Array.from({ length: n - 1 }, (_, i) => (i === 0 ? P.rush.lead : P.rush.ratio ** (n > 3 ? (i - 1) / (n - 3) : 0)));
    accent = 0;
  } else {
    groups = o.groups && o.groups.reduce((a, b) => a + b, 0) === n ? o.groups : phraseGroups(n, o.seed ?? 0);
    for (let gi = 0; gi < groups.length; gi++) {
      for (let k = 0; k < groups[gi]; k++) if (gi > 0 || k > 0) w.push(k === 0 ? P.group.between : P.group.inner);
    }
    accent = n - groups[groups.length - 1];
  }
  const span = (n - 1) * gap;
  const sum = w.reduce((a, b) => a + b, 0);
  const frac = [0];
  for (const x of w) frac.push(frac[frac.length - 1] + (x / sum) * span);
  if (o.whole === false) return { onsets: frac, gaps: w.map((x) => (x / sum) * span), accent, groups, shape };
  const end = Math.round(span);
  const min = P.minGap;
  if (end < (n - 1) * min) {
    const even = Array.from({ length: n }, (_, i) => Math.round((i * end) / (n - 1)));
    return { onsets: even, gaps: even.slice(1).map((v, i) => v - even[i]), accent, groups, shape };
  }
  const on = frac.map((v) => Math.round(v));
  on[n - 1] = end;
  for (let i = 1; i < n; i++) on[i] = Math.max(on[i], on[i - 1] + min); // each gap at least min, forward
  for (let i = n - 2; i >= 1; i--) on[i] = Math.min(on[i], on[i + 1] - min); // and the span held, backward
  return { onsets: on, gaps: on.slice(1).map((v, i) => v - on[i]), accent, groups, shape };
};

/** Absolute phrased onsets: start + phrase(n, gap, o).onsets (a list's rows, a line's words). Pure. */
export const phraseOnsets = (start: number, n: number, gap: number, o: Parameters<typeof phrase>[2] = {}): number[] =>
  phrase(n, gap, o).onsets.map((v) => start + v);

/**
 * A real rest after a landing. A crafted cut alternates real stillness with hard accents; a picture that never rests
 * reads evenly busy. After a landing the camera float comes to rest on the landing frame and holds `frames60` (8-15
 * f@60, house 12) before it drifts on: restAfter() is that lock, for the float's locks (lib/drift FloatOpts.locks,
 * withLocks). Give the landing a short tail (lib/drift tail, tauS 0.15) so the picture is near still through the rest.
 * forensics.py reads a still run of up to 16 f@60 that starts within 0.5 s of a landing as a rest (motion-rest), not a
 * freeze; a still stretch that opens dead still fails motion-frozen.
 */
export const REST = { frames60: [8, 15] as const, house60: 12, rampS: 0.2 } as const;
export const restAfter = (landing: number, o: { frames60?: number; rampS?: number } = {}): { at: number; holdS: number; rampS: number } => ({
  at: Math.round(landing),
  holdS: clamp(o.frames60 ?? REST.house60, REST.frames60[0], REST.frames60[1]) / 60,
  rampS: o.rampS ?? REST.rampS,
});
