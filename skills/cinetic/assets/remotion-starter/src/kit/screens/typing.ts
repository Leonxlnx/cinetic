// Typing as a person types: a cadence, never a metronome. Each character lands on its own frame (seeded jitter, a beat of
// thought before a word, a longer one after a comma or a full stop), the mean rate is `cps`, and the same text and seed
// land on the same frames on every render. Pure; the key times are cached per text.
import { clamp, fd, rand } from '../../lib/anim';

/** House numbers: the mean rate (characters a second, a fluent typist), the pause factors and the jitter band. */
export const TYPING = { cps: 24, wordStart: 1.55, afterStop: 2.7, jitter: [0.62, 1.38] as const, ink: { hold: 0.22, cool: 0.55 } } as const;

const cache = new Map<string, number[]>();

/** The frame (from the start of typing) each character of `text` lands on: [0, ...], rising. */
export const keyFrames = (text: string, fps: number, cps: number = TYPING.cps, seed = 'type'): number[] => {
  const key = `${seed}|${cps}|${fps}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = text.length;
  const gaps: number[] = [];
  for (let i = 1; i < n; i++) {
    const prev = text[i - 1];
    let k = 1;
    if (text[i] === ' ' && /[,.;:!?]/.test(prev)) k = TYPING.afterStop;
    else if (prev === ' ') k = TYPING.wordStart;
    const j = TYPING.jitter[0] + (TYPING.jitter[1] - TYPING.jitter[0]) * rand(`${seed}:${i}:${text.charCodeAt(i)}`);
    gaps.push(k * j);
  }
  const sum = gaps.reduce((a, b) => a + b, 0) || 1;
  const total = Math.max(0, n - 1) * (fps / cps);
  const out = [0];
  let acc = 0;
  for (const g of gaps) {
    acc += (g / sum) * total;
    out.push(acc);
  }
  cache.set(key, out);
  return out;
};

/** How long `text` takes to type at `cps` (frames, from the first key to the last). */
export const typingFrames = (text: string, fps: number, cps: number = TYPING.cps) => Math.max(0, text.length - 1) * (fps / cps);

export type Typed = {
  /** characters shown */
  n: number;
  shown: string;
  /** frames since the last key landed (since the start when none has) */
  since: number;
  done: boolean;
  /** 0..1 of the text */
  progress: number;
  /** the frame (from the start) each shown character landed on */
  keys: number[];
};

/** The state of `text` typed from `at` at frame `f` (frames of the film). */
export const typedAt = (text: string, f: number, o: { at?: number; cps?: number; fps: number; seed?: string }): Typed => {
  // whole frame (fd): every motion-blur sub-sample of one output frame shows the same letters and the same caret
  const t = fd(f) - (o.at ?? 0);
  const keys = keyFrames(text, o.fps, o.cps, o.seed);
  if (t < 0 || !text.length) return { n: 0, shown: '', since: Math.max(0, t), done: !text.length, progress: 0, keys };
  let n = 0;
  while (n < keys.length && keys[n] <= t) n++;
  return { n, shown: text.slice(0, n), since: t - keys[n - 1], done: n >= text.length, progress: n / text.length, keys };
};

/** The words of a string with their character ranges (trailing spaces belong to the word before). */
export const wordsOf = (s: string) => {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /\S+\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return out;
};

/**
 * How far a typed word has inked from the accent (0) to the ink (1): the word being typed stays in the accent, a word
 * already typed holds TYPING.ink.hold s and settles over TYPING.ink.cool s (the newest word reads as the one arriving).
 */
export const wordInk = (nextWordKey: number | undefined, t: number, fps: number) => {
  if (nextWordKey === undefined || t < nextWordKey) return 0;
  return clamp((t - nextWordKey - TYPING.ink.hold * fps) / (TYPING.ink.cool * fps));
};
