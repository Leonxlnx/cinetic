import React from 'react';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { clamp, CPS, E, Ease, fd, mix, prog, rand } from '../lib/anim';
import { mixRgb } from '../lib/color';
import { f60, type FilmCtx, fpsOf, paceOf, uOf, useFilm } from '../lib/film';
import { baselineOf, inkBox, measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';

type Role = keyof typeof TYPE;

/**
 * How something types (1.2). Without a `kind`, TypeOn keeps its 1.1 time box (E.type over
 * pace.fx.typeFPerChar per character) or its linear `cps`.
 *
 *   human   a person at the keys: the house 30 characters a second in runs, a key now and then landing
 *           with the one before (a burst), a beat before and after a comma, a breath before the last
 *           word, its last letters slower, a longer stop before the closing ? . or !.
 *   field   a field that fills word by word: one whole word every 5 frames at 60 fps (12 words a second),
 *           each new word in the accent for exactly one frame.
 *   prompt  a prompt typed into the product: it starts slow (5 a second) and speeds up to 19, and slows
 *           again on its last word; `skip` lands a run of characters at once (typing hidden by a whip).
 *   stream  machine output: 50-150 characters a second (house 100), steady, or decelerating over its box
 *           with `ease` (a reply that settles: from ~90 a second down to ~15 as it finishes).
 * Elision (`from`): a cut lands in the middle of the typing, 50-80 % already typed on the first frame:
 * nobody waits for a whole prompt to type.
 */
export type TypeKind = 'human' | 'field' | 'prompt' | 'stream';

export type TypeTiming = {
  start: number; // typing begins; the first character shows on the next whole frame
  dur?: number; // time box in frames (default pace.fx.typeFPerChar per character at 60 fps: calm 3 f = 20 chars/s, crisp 2 f = 30)
  ease?: Ease; // the character count's progress over the box (default E.type: fast start, slow end); a stream: its deceleration
  cps?: number; // linear typing at this many characters per second instead (overrides dur and ease); with a kind: its base rate
  kind?: TypeKind; // 1.2 typing grammar (see TypeKind)
  from?: number; // elision: already typed on the first frame, a share 0..1 (or a count when > 1)
  pauses?: { comma?: number; after?: number; final?: number; beforeLast?: number }; // human: extra key lengths (house 1, 1, 4, 1)
  slowLast?: number; // human: the last word's last letters typed at twice the length (house 2); prompt: the last word's slow-down factor (house 1.6)
  bursts?: number[] | number; // human: character indices that land with the key before, or a seeded share of in-word keys (house 0.08)
  seed?: number | string;
  ramp?: { from?: number; to?: number; chars?: number; hold?: number }; // prompt: cps from -> to over `chars` keys, after `hold` keys at `from` (house 5 -> 19 over 12, hold 1)
  skip?: { at: number; count: number }[]; // prompt/human: from character `at`, `count` characters land on one frame
  gaps?: number[]; // prompt: 60 fps frames between visible keys (a space lands with the letter after it, a burst with the key before), e.g. ACCEL.typing; then the ramp's end rate
  wordFrames?: number; // field: frames per word (house 5 at 60 fps)
  rates?: { at: number; cps: number }[]; // stream: from character `at` on, this rate (a fast wide shot slowing in the close-up); with `skip` a burst lands at once
};
export type TypeFont = { role?: Role; size?: number; family?: string };

/** House numbers of the typing grammar (key lengths in units of one key at the base rate). */
export const TYPE_HOUSE = {
  human: { cps: CPS.human.house, comma: 1, after: 1, final: 4, beforeLast: 1, slowLast: 2, bursts: 0.08 },
  field: { wordS: 5 / 60, accentFrames: 1 },
  prompt: { from: CPS.prompt.start, to: CPS.prompt.end, chars: 12, hold: 1, slowLast: 1.6 },
  stream: { cps: 100 },
  elide: [0.5, 0.8] as const, // a cut into typing lands with this share already typed
} as const;

/**
 * A held backspace clearing a field (a placeholder, an old value): the first key, the repeat delay, then the
 * repeat speeding up to a character every frame at 60 fps. Gaps in 60 fps frames between removed characters,
 * the last one repeating.
 */
export const ERASE_HOUSE = { gaps60: [4, 6, 4, 3, 2, 2, 1] } as const;
export type TypeErase = { start: number; gaps?: readonly number[] };

/** The whole frame on which each character of a `len`-character string ([...text].length) is erased, last character first (index = character). */
export const eraseSchedule = (len: number, e: TypeErase, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  const gaps = e.gaps?.length ? e.gaps : ERASE_HOUSE.gaps60;
  const at = new Array<number>(len);
  let t = e.start;
  for (let k = 0; k < len; k++) {
    t += ((gaps[Math.min(k, gaps.length - 1)] ?? 1) * fps) / 60;
    at[len - 1 - k] = Math.ceil(t - 1e-9);
  }
  return at;
};

const boxOf = (len: number, t: TypeTiming, film?: Partial<FilmCtx>) =>
  t.cps ? (len * fpsOf(film)) / t.cps : Math.max(1, t.dur ?? f60(paceOf(film).fx.typeFPerChar * len, fpsOf(film)));

/** Characters typed at frame f, continuous (0..len). */
const typedAt = (len: number, f: number, t: TypeTiming, film?: Partial<FilmCtx>) =>
  t.cps ? clamp(((f - t.start) * t.cps) / fpsOf(film), 0, len) : len * (t.ease ?? E.type)(clamp((f - t.start) / boxOf(len, t, film)));

/**
 * Whole frame on which each character of a `len`-character string first shows. The component reads
 * the same schedule, so key sounds put on these frames land on the picture exactly:
 * KEY_FRAMES = typeFrames(PROMPT.length, TYPE_T).map((k) => k + ACT.proof.from).
 * (The 1.1 time box and linear rate; with a `kind`, use typeSchedule(text, ...), which needs the text.)
 */
export const typeFrames = (len: number, t: TypeTiming, film?: Partial<FilmCtx>): number[] => {
  const at: number[] = [];
  const end = Math.ceil(t.start + boxOf(len, t, film)) + 1;
  for (let F = Math.ceil(t.start); F <= end && at.length < len; F++) {
    const n = Math.min(len, Math.ceil(typedAt(len, F, t, film) - 1e-6));
    while (at.length < n) at.push(F);
  }
  while (at.length < len) at.push(end);
  return at;
};

// Characters are code points ([...text]) everywhere: an emoji is one key, one schedule entry, one backspace.
const isFinal = (chars: readonly string[], i: number) => i === chars.length - 1 && /[?.!]/.test(chars[i]);
const isComma = (c: string | undefined) => c !== undefined && /[,;:]/.test(c);

/** The index of the first character of the last word (closing punctuation is not a word). */
const lastWordStart = (chars: readonly string[]) => {
  let e = chars.length - 1;
  while (e >= 0 && /[?.!\s]/.test(chars[e])) e--;
  let s = e;
  while (s > 0 && !/\s/.test(chars[s - 1])) s--;
  return { s, e };
};

/**
 * The whole frame each character first shows, for any typing (pure; the 1.1 box without a kind). A
 * schedule decides on whole frames, so a key never shows half-way and motion-blur sub-samples agree.
 */
export const typeSchedule = (text: string, t: TypeTiming, film?: Partial<FilmCtx>): number[] => {
  const len = [...text].length;
  const chars = [...text];
  if (!t.kind) return typeFrames(len, t, film);
  const fps = fpsOf(film);
  const pre = t.from === undefined ? 0 : t.from > 1 ? Math.min(len, Math.round(t.from)) : Math.round(clamp(t.from) * len);
  const at: number[] = chars.map(() => Math.ceil(t.start));
  if (t.kind === 'field') {
    // a word shows whole on its own frame: word k after the cut on start + (k + 1) x wordFrames; a space
    // shows with the word after it; the elided characters show on start
    const wf = t.wordFrames ?? TYPE_HOUSE.field.wordS * fps;
    const w0 = wordOf(chars, pre);
    for (let i = 0; i < len; i++) {
      const w = /\s/.test(chars[i]) ? wordOf(chars, i) + 1 : wordOf(chars, i);
      at[i] = i < pre ? Math.ceil(t.start) : Math.ceil(t.start + (w - w0 + 1) * wf - 1e-9);
    }
    return at;
  }
  if (t.kind === 'stream') {
    const cps = t.cps ?? TYPE_HOUSE.stream.cps;
    const rest = len - pre;
    if (t.ease) {
      const box = Math.max(1, t.dur ?? (rest * fps) / cps);
      // the count follows the ease over the box; each character shows on the first frame the count reaches it
      for (let i = 0; i < len; i++) {
        if (i < pre) { at[i] = Math.ceil(t.start); continue; }
        const need = (i + 1 - pre) / Math.max(1, rest);
        let F = Math.ceil(t.start);
        while (F < t.start + box + 1 && t.ease(clamp((F - t.start) / box)) + 1e-9 < need) F++;
        at[i] = F;
      }
      return at;
    }
    if (t.rates?.length || t.skip?.length) {
      // piecewise rates from given characters; a skip lands `count` characters on one frame
      const rates = [...(t.rates ?? [])].sort((p, q) => p.at - q.at);
      const rateAt = (i: number) => rates.filter((r) => r.at <= i).pop()?.cps ?? cps;
      const burst = new Map((t.skip ?? []).map((k) => [k.at, k.count]));
      let time = t.start;
      for (let i = 0; i < len; i++) {
        if (i < pre) { at[i] = Math.ceil(t.start); continue; }
        const b = burst.get(i);
        time += fps / rateAt(i);
        at[i] = Math.ceil(time - 1e-9);
        if (b) for (let j = 1; j < b && i + j < len; j++) at[i + j] = at[i];
        if (b) i += b - 1;
      }
      return at;
    }
    for (let i = 0; i < len; i++) at[i] = i < pre ? Math.ceil(t.start) : Math.ceil(t.start + ((i + 1 - pre) * fps) / cps - 1e-9);
    return at;
  }
  const H = TYPE_HOUSE.human;
  const P = TYPE_HOUSE.prompt;
  if (t.kind === 'prompt' && t.gaps) {
    // visible keys on an explicit accelerating cadence: group k lands gaps[k - 1] (60 fps frames) after group k - 1
    const burstSet = new Set(Array.isArray(t.bursts) ? t.bursts : []);
    let clock = t.start + 1;
    let g = -1;
    for (let i = 0; i < len; i++) {
      if (i < pre) { at[i] = Math.ceil(t.start); continue; }
      const c = chars[i];
      const joinsNext = /\s/.test(c);
      const joinsPrev = burstSet.has(i) && g >= 0;
      if (!joinsNext && !joinsPrev) {
        g++;
        if (g > 0) clock += g - 1 < t.gaps.length ? (t.gaps[g - 1] * fps) / 60 : fps / (t.ramp?.to ?? P.to);
      }
      at[i] = Math.ceil(clock - 1e-9);
    }
    // a space shows with the letter after it
    for (let i = len - 2; i >= pre; i--) if (/\s/.test(chars[i])) at[i] = at[i + 1];
    return at;
  }
  const { s: lw, e: le } = lastWordStart(chars);
  const seed = t.seed ?? 0;
  const burstSet = Array.isArray(t.bursts) ? new Set(t.bursts) : null;
  const share = typeof t.bursts === 'number' ? t.bursts : H.bursts;
  const skips = t.skip ?? [];
  let clock = t.start; // fractional film frames: the moment the last key landed
  for (let i = 0; i < len; i++) {
    if (i < pre) { at[i] = Math.ceil(t.start); continue; }
    const k = i - pre; // keys typed since the cut
    let u: number; // frames of this key
    if (t.kind === 'human') u = fps / (t.cps ?? H.cps);
    else {
      const from = t.ramp?.from ?? P.from;
      const to = t.ramp?.to ?? P.to;
      const n = Math.max(1, t.ramp?.chars ?? P.chars);
      const hold = t.ramp?.hold ?? P.hold;
      const x = clamp((k - hold) / n);
      u = fps / (from * (to / from) ** x);
    }
    let d = u;
    const c = chars[i];
    const skipped = skips.find((s) => i > s.at && i < s.at + s.count);
    if (skipped) d = 0;
    else if (t.kind === 'human') {
      const pz = t.pauses ?? {};
      if (isComma(c)) d += (pz.comma ?? H.comma) * u;
      if (isComma(chars[i - 1])) d += (pz.after ?? H.after) * u;
      if (i === lw && lw > 0) d += (pz.beforeLast ?? H.beforeLast) * u;
      const slow = t.slowLast ?? H.slowLast;
      if (i <= le && i > le - slow && i > lw) d += u; // the last letters at twice the length
      if (isFinal(chars, i)) d += (pz.final ?? H.final) * u;
      const inWord = i > 0 && !/\s/.test(c) && !/\s/.test(chars[i - 1]) && !isComma(c) && !isFinal(chars, i);
      if (k > 0 && inWord && (burstSet ? burstSet.has(i) : rand(`${seed}:burst:${i}`) < share)) d = 0;
    } else if (i >= lw) d *= t.slowLast ?? P.slowLast;
    clock += d;
    at[i] = Math.max(Math.ceil(t.start), Math.ceil(clock - 1e-9));
  }
  return at;
};

/** Which word a character index sits in (0-based). */
const wordOf = (chars: string[], i: number) => {
  let w = 0;
  for (let j = 1; j <= Math.min(i, chars.length - 1); j++) if (/\s/.test(chars[j - 1]) && !/\s/.test(chars[j])) w++;
  return w;
};

export type TypeState = {
  n: number; // characters shown (decided on fd(frame))
  at: number[]; // each character's first frame
  typing: boolean; // keys still landing
  last: number; // the last key's frame
  accent: boolean[]; // field: characters of the word that arrived on this very frame (its one accent frame)
  age: number[]; // whole frames since each character appeared (-1 before)
  wordAt: number[]; // field: each word's first frame
};

/**
 * The typing state at `frame` (pure; call under FontGate only if you also measure). The schedule is
 * typeSchedule(); `accent` marks the field word that landed on this frame (house one frame).
 */
export const typeState = (frame: number, o: TypeTiming & { text: string; accentFrames?: number }, film?: Partial<FilmCtx>): TypeState => {
  const at = typeSchedule(o.text, o, film);
  const F = fd(frame);
  const n = at.filter((k) => k <= F).length;
  const last = at.length ? at[at.length - 1] : o.start;
  const chars = [...o.text];
  const wordAt: number[] = [];
  chars.forEach((c, i) => {
    if (!/\s/.test(c) && (i === 0 || /\s/.test(chars[i - 1]))) wordAt.push(at[i]);
  });
  const af = o.accentFrames ?? TYPE_HOUSE.field.accentFrames;
  const accent = at.map((k) => o.kind === 'field' && F >= k && F < k + af && k > Math.ceil(o.start));
  return { n, at, typing: F >= o.start && F < last, last, accent, age: at.map((k) => (F >= k ? F - k : -1)), wordAt };
};

/**
 * Typing state at `frame`, the same numbers the component draws with (call it under FontGate, like
 * every measurement): `n` characters shown (decided on fd(frame)), `at` their first frames, `caretX`
 * (the typed text's right edge, px from its left edge; steps with each key; the drawn caret sits
 * the tracking plus 0.03 em further right), `followX` (the same edge, continuous: give it to a
 * camera that follows the caret, through a lag, so the camera never steps), and whether keys are
 * still landing.
 */
export const typeOn = (text: string, frame: number, t: TypeTiming & TypeFont, film?: Partial<FilmCtx>) => {
  const role = t.role ?? 'display';
  const size = t.size ?? TYPE[role].size * uOf(film);
  const { weight, track } = TYPE[role];
  const family = t.family ?? FONT.text;
  const chars = [...text];
  const len = chars.length;
  const at = t.kind ? typeSchedule(text, t, film) : typeFrames(len, t, film);
  const F = fd(frame);
  const n = at.filter((k) => k <= F).length;
  const wOf = (k: number) => (k <= 0 ? 0 : measureTracked(chars.slice(0, k).join(''), size, weight, track, family));
  let c: number;
  if (t.kind) {
    // continuous count between key frames, for a camera that follows the caret
    const done = at.filter((k) => k <= frame).length;
    const next = at[done];
    const prev = done > 0 ? at[done - 1] : t.start;
    c = done >= len ? len : done + (next !== undefined && next > prev ? clamp((frame - prev) / (next - prev)) : 0);
  } else c = typedAt(len, frame, t, film);
  const lo = Math.floor(c);
  const followX = lo >= len ? wOf(len) : mix(wOf(lo), wOf(lo + 1), c - lo);
  const last = len ? at[len - 1] : t.start;
  return { n, at, caretX: wOf(n), followX, typing: F >= t.start && F < last, last, size, weight, track, family };
};

/**
 * Typewriter with a caret. The character count follows an eased progress over a time box (E.type:
 * about 1 char/f at the start, the last key at ~80% of the box) or a linear `cps` rate, decided on
 * whole frames (fd), so motion-blur sub-samples never show a half-typed letter or a double caret.
 * Defaults at 60 fps: box = pace.fx.typeFPerChar per character (calm 3 f: 20 chars/s on average,
 * a rate a viewer can read along with; crisp 2 f), head fade 4 f (each new character ramps in on E.ui,
 * so a burst of 2-3 keys in one frame never pops; 0 = keys appear whole, like a real field), caret
 * solid while keys land and blinking 30 f on / 30 f off while idle, phase-locked to the last key.
 * Every character is laid out from the first frame (untyped ones at opacity 0) and only opacity
 * changes, so earlier characters never reflow, and the caret sits on measured prefix widths of the
 * loaded font (FontGate). Single line. Use typeOn() for the caret position (camera follow) and
 * typeFrames() / typeSchedule() for the key sounds. `charStyle(i, age)` styles character i, `age` whole
 * frames after it appeared (an accent that relaxes to ink over 12 f: references/product-ui.md §6).
 * 1.2 (`kind`, see TypeKind): human, field, prompt and stream typing, elision by a cut (`from`); `accent`
 * colours the field's newest word for its one frame, `trail` colours the newest characters and lets
 * them age to the ink over `trail.chars` characters (a colour trail behind the caret). `erase` clears the string
 * with a held backspace (ERASE_HOUSE: the first key, the repeat delay, the repeat speeding up), last character
 * first: a placeholder or an old value leaving before the new one is typed by a second TypeOn.
 * Typing is for what the product types (a prompt, a command, a field): a person at 30 chars/s or
 * less (lint-film warns: typing-rate), a stream at 50-150; hold the finished string >= 72 f after its
 * last key before it changes. Headlines and film copy are never typed: they arrive as fragments (fx/Chain).
 */
export const TypeOn: React.FC<
  TypeTiming &
    TypeFont & {
      text: string;
      frame: number; // local frame
      id?: string; // data-text id for the layout audit
      fade?: number; // head fade, frames
      caret?: boolean;
      caretColor?: string; // default: the text colour
      blink?: number; // frames on, then the same off, while idle
      caretOut?: number; // frame the caret is removed (the field submits)
      accent?: string; // field: the newest word's colour on its one frame
      accentFrames?: number;
      trail?: { color: string; chars?: number; ink?: string }; // the newest characters in `color`, ageing to `ink` over `chars` characters (house 10)
      erase?: TypeErase; // a held backspace from `start` (ERASE_HOUSE): the characters leave from the end, the caret solid while it runs
      style?: React.CSSProperties;
      charStyle?: (i: number, age: number) => React.CSSProperties;
    }
> = ({ text, frame, id = 'type', fade: fadeProp, caret = true, caretColor = 'currentColor', blink: blinkProp, caretOut, accent, accentFrames, trail, erase, style, charStyle, ...t }) => {
  const film = useFilm();
  const fade = fadeProp ?? (t.kind ? 0 : f60(4, film.fps));
  const blink = blinkProp ?? f60(30, film.fps);
  const s = typeOn(text, frame, t, film);
  const ts = t.kind ? typeState(frame, { ...t, text, accentFrames }, film) : null;
  const role = t.role ?? 'display';
  const lead = TYPE[role].lead;
  const F = fd(frame);
  // A held backspace: characters erased from the end on their whole frames; the caret follows them back.
  const chars = [...text];
  const gone = erase ? eraseSchedule(chars.length, erase, film) : null;
  const goneEnd = gone && erase ? Math.max(erase.start, ...gone) : -Infinity;
  const left = gone ? gone.filter((k) => k > F).length : chars.length;
  const erasing = !!erase && F >= erase.start && F < goneEnd;
  const shownN = Math.min(s.n, left);
  // Caret: solid while typing (or erasing); idle, it blinks with a phase anchored on the typing edges.
  const anchor = F < t.start ? t.start : erase && F >= erase.start ? Math.max(s.last, goneEnd) : s.last;
  const on = s.typing || erasing || Math.floor(Math.abs(F - anchor) / Math.max(1, blink)) % 2 === 0;
  const showCaret = caret && (caretOut === undefined || F < caretOut);
  const ink = inkBox('Hg', s.size, s.weight, s.family);
  const base = baselineOf(s.size, s.weight, lead, s.family);
  const cw = Math.max(2 * uOf(film), 0.055 * s.size);
  const cy = base - ink.ascent - 0.07 * s.size;
  const ch = ink.ascent + ink.descent + 0.14 * s.size;
  // CSS puts the (negative) tracking after each glyph, so the last glyph's ink can reach past the
  // next glyph's origin: clear it by the tracking plus a hairline gap.
  const caretX = shownN === s.n ? s.caretX : measureTracked(chars.slice(0, shownN).join(''), s.size, s.weight, s.track, s.family);
  const cx = shownN > 0 ? caretX + Math.max(0, -s.track) * s.size + 0.03 * s.size : 0;
  const trailN = trail?.chars ?? 10;
  return (
    <span data-text={id} style={{ ...typeStyle(role, s.size), fontFamily: s.family, position: 'relative', display: 'inline-block', ...style }}>
      {chars.map((c, i) => {
        const shown = F >= s.at[i] && (!gone || F < gone[i]);
        const o = !shown ? 0 : fade > 0 ? prog(frame, s.at[i] - 1, s.at[i] - 1 + fade, E.ui) : 1;
        let color: string | undefined;
        if (shown && ts?.accent[i] && accent) color = accent;
        else if (shown && trail) color = mixRgb(trail.color, trail.ink ?? C.ink, clamp((s.n - 1 - i) / Math.max(1, trailN)));
        return (
          <span key={i} style={{ opacity: o, color, ...(shown ? charStyle?.(i, F - s.at[i]) : undefined) }}>
            {c}
          </span>
        );
      })}
      {showCaret && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: cw,
            height: ch,
            borderRadius: cw / 2,
            background: caretColor,
            opacity: on ? 1 : 0,
            transform: `translate(${cx.toFixed(3)}px, ${cy.toFixed(3)}px)`,
          }}
        />
      )}
    </span>
  );
};

/**
 * What a TypeOn instance does on purpose: keys are discrete steps on whole frames, so a 1.2 typing run
 * declares its span stepped (one sample a frame, never shutter-blurred), and an `erase` its backspaces;
 * an instance that types and then erases declares both. The 1.1 form declares nothing.
 */
export const declares = (p?: Partial<TypeTiming> & { text?: string; id?: string; erase?: TypeErase }, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p?.text) return none;
  const stepped: NonNullable<Declares['stepped']> = [];
  if (p.kind && p.start !== undefined) {
    const at = typeSchedule(p.text, p as TypeTiming, film);
    stepped.push({ from: Math.min(...at), to: Math.max(...at) + 1, id: p.id ?? 'type' });
  }
  if (p.erase) {
    const gone = eraseSchedule([...p.text].length, p.erase, film);
    stepped.push({ from: Math.min(...gone), to: Math.max(...gone) + 1, id: `${p.id ?? 'type'}-erase` });
  }
  return { ...none, stepped };
};
