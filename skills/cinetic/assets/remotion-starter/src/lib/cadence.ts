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

