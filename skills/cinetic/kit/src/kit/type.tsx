// Type in motion. Every line in a film goes through one of these, so text always arrives as an event.
//
//   <Words>     a line built word by word or letter by letter, in one of the arrival styles below
//   <Swap>      one slot whose word rolls to the next (the "for X / for Y / for Z" cycle)
//   <Typing>    text typed into a field with a caret, at a human, uneven pace
//   <Scramble>  letters decode from random glyphs into the word
//   <Odometer>  a number whose digits roll like a counter
//   <Marker>    a highlight that sweeps behind a word
import React from 'react';
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { at, clamp, ease, mix, rand, springAt, springs, stagger, type Ease } from './motion';

export type Arrive =
  | 'rise' // each unit slides up out of a mask, a few degrees of tilt settling to 0: the classic premium build
  | 'blur' // each unit sharpens from a blur while it drifts up a little and fades in
  | 'scale' // each unit grows from 70 % with a blur, like it is coming toward the lens
  | 'drop' // each unit falls in from above with a spring
  | 'slide' // the line slides in sideways as one (every unit on the first unit's frame: its spacing never changes)
  | 'flip' // each unit turns up from 90 degrees around its baseline (3D)
  | 'cut'; // no animation: the line is just there (for hard-cut rhythm)

// How a line leaves from `leaveAt`: 'cut' (the default once leaveAt is given) is gone on that frame; 'rise' and 'fall'
// travel out behind a mask that closes; 'blur' and 'scale' fade, and are not for statements (text never fades out).
export type Leave = 'none' | 'cut' | 'rise' | 'fall' | 'blur' | 'scale';

type WordsProps = {
  text: string;
  /** Frame the build starts (relative to the Sequence). */
  start?: number;
  /** Build unit. 'word' for statements, 'char' for one big word, 'line' for long copy. */
  by?: 'word' | 'char' | 'line';
  arrive?: Arrive;
  /** Frames between units (compressing stagger). */
  gap?: number;
  /** Frames each unit takes to arrive. */
  dur?: number;
  /** Frame the line starts to leave, and how (default 'cut' when leaveAt is given: gone on that frame). */
  leaveAt?: number;
  leave?: Leave;
  leaveDur?: number;
  /** Words (exact match, case-insensitive, punctuation ignored) drawn in the accent style. */
  accent?: string[];
  accentStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  /** Alignment of wrapped lines. */
  align?: 'center' | 'left' | 'right';
  /** Max width before wrapping (px). */
  width?: number;
  /** Each unit is born in this colour and settles to the line's colour over `settle` frames (fresh words glow). */
  born?: string;
  settle?: number;
  /** Exact start frame per unit (word, char or line), overriding start + gap: put words on the music's plucks. */
  times?: number[];
  /** Let trailing punctuation take the accent or born colour too (default false: punctuation keeps the line's colour). */
  tintPunctuation?: boolean;
};

/** Parse #rgb, #rrggbb or rgb(r, g, b) to [r, g, b]. */
const rgbOf = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Blend two colours (#rgb, #rrggbb or rgb()). p = 0 gives a, 1 gives b. */
export const mixColor = (a: string, b: string, p: number) => {
  const A = rgbOf(a);
  const B = rgbOf(b);
  const q = clamp(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)}, ${Math.round(A[1] + (B[1] - A[1]) * q)}, ${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
/** The trailing punctuation of a word ("now." -> "."), which never takes an accent or born colour. */
const punctTail = (w: string) => w.match(/[.,!?:;…]+$/)?.[0] ?? '';

export const Words: React.FC<WordsProps> = ({
  text,
  start = 0,
  by = 'word',
  arrive = 'rise',
  gap,
  dur,
  leaveAt,
  leave: leaveProp,
  leaveDur = 10,
  accent = [],
  accentStyle,
  style,
  align = 'center',
  width,
  born,
  settle = 14,
  times,
  tintPunctuation = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = gap ?? (by === 'char' ? 1.6 : by === 'line' ? 6 : 3.5);
  const d = dur ?? (arrive === 'blur' ? 16 : arrive === 'scale' ? 18 : 14);
  const accents = new Set(accent.map(norm));
  const leave: Leave = leaveProp ?? (leaveAt !== undefined ? 'cut' : 'none');

  const lines = text.split('\n');
  let unitIndex = 0;

  const unit = (content: string, key: string, isAccent: boolean) => {
    const i = unitIndex++;
    // a slide moves the line as one: every unit starts with the first, so the gaps never open and close
    const s = arrive === 'slide' ? (times?.[0] ?? start) : times && times[i] !== undefined ? times[i] : start + stagger(i, g);
    let p = arrive === 'cut' ? (frame >= s ? 1 : 0) : at(frame, s, d, arrive === 'scale' ? ease.soft : ease.out);
    let transform = '';
    let filter = '';
    let opacity = 1;
    let clip = false;
    switch (arrive) {
      case 'rise':
        clip = true;
        transform = `translateY(${mix(p, 105, 0)}%) rotate(${mix(p, 6, 0)}deg)`;
        break;
      case 'blur':
        transform = `translateY(${mix(p, 0.25, 0)}em)`;
        filter = `blur(${mix(p, 14, 0)}px)`;
        opacity = clamp(p * 1.6);
        break;
      case 'scale':
        transform = `scale(${mix(p, 0.7, 1)})`;
        filter = `blur(${mix(p, 10, 0)}px)`;
        opacity = clamp(p * 2);
        break;
      case 'drop': {
        p = springAt(frame, fps, s, springs.card);
        transform = `translateY(${mix(p, -0.9, 0)}em)`;
        opacity = clamp(p * 3);
        break;
      }
      case 'slide':
        transform = `translateX(${mix(p, 0.6, 0)}em)`;
        opacity = clamp(p * 2);
        break;
      case 'flip':
        transform = `perspective(800px) rotateX(${mix(p, -92, 0)}deg)`;
        opacity = clamp(p * 3);
        break;
      default:
        opacity = p;
        break;
    }
    if (leaveAt !== undefined && leave !== 'none' && leave !== 'cut') {
      const q = at(frame, leaveAt + stagger(i, g * 0.5), leaveDur, ease.in);
      if (leave === 'rise') {
        clip = true;
        transform += ` translateY(${mix(q, 0, -105)}%)`;
      } else if (leave === 'fall') {
        clip = true;
        transform += ` translateY(${mix(q, 0, 105)}%)`;
      } else if (leave === 'blur') {
        filter += ` blur(${mix(q, 0, 16)}px)`;
        opacity *= 1 - q;
      } else if (leave === 'scale') {
        transform += ` scale(${mix(q, 1, 1.25)})`;
        filter += ` blur(${mix(q, 0, 12)}px)`;
        opacity *= 1 - q;
      }
    }
    const hidden =
      (arrive !== 'cut' && frame < s) ||
      (leaveAt !== undefined && leave === 'cut' && frame >= leaveAt) ||
      (leaveAt !== undefined && (leave === 'rise' || leave === 'fall') && frame >= leaveAt + stagger(i, g * 0.5) + leaveDur);
    const bornColor = born && frame < s + (arrive === 'cut' ? 0 : d) + settle + 1 ? mixColor(born, (style?.color as string) ?? '#000000', at(frame, s + (arrive === 'cut' ? 0 : d * 0.4), settle, ease.inOut)) : undefined;
    // punctuation is never coloured: a tinted unit's trailing marks keep the line's own colour
    const tail = !tintPunctuation && ((isAccent && accentStyle?.color) || bornColor) ? punctTail(content) : '';
    const { color: accentColor, ...accentRest } = (isAccent ? accentStyle : undefined) ?? {};
    const inner = (
      <span
        style={{
          display: 'inline-block',
          visibility: hidden ? 'hidden' : undefined,
          transform,
          filter: filter || undefined,
          opacity,
          transformOrigin: arrive === 'flip' ? '50% 100%' : '50% 60%',
          whiteSpace: 'pre',
          ...(tail ? accentRest : { color: bornColor, ...(isAccent ? accentStyle : null) }),
        }}
      >
        {tail ? (
          <>
            {content.length > tail.length && <span style={{ color: accentColor ?? bornColor }}>{content.slice(0, -tail.length)}</span>}
            <span style={style?.color ? { color: style.color } : undefined}>{tail}</span>
          </>
        ) : (
          content
        )}
      </span>
    );
    return clip ? (
      <span key={key} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', padding: '0.08em 0.02em 0.14em', margin: '-0.08em -0.02em -0.14em' }}>
        {inner}
      </span>
    ) : (
      <React.Fragment key={key}>{inner}</React.Fragment>
    );
  };

  return (
    <div style={{ textAlign: align, width, whiteSpace: width ? 'normal' : 'nowrap', lineHeight: 1.04, ...style }}>
      {lines.map((line, li) => {
        const words = line.split(' ');
        return (
          <div key={li}>
            {by === 'line'
              ? unit(line, `l${li}`, accents.has(norm(line)))
              : words.map((w, wi) => {
                  const isAccent = accents.has(norm(w));
                  const space = wi < words.length - 1 ? ' ' : '';
                  if (by === 'char') {
                    // the space sits outside the word's inline-block (a trailing space inside one is trimmed)
                    return (
                      <React.Fragment key={wi}>
                        <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{[...w].map((c, ci) => unit(c, `${wi}-${ci}`, isAccent))}</span>
                        {space && ' '}
                      </React.Fragment>
                    );
                  }
                  return (
                    <React.Fragment key={wi}>
                      {unit(w, `${wi}`, isAccent)}
                      {space && ' '}
                    </React.Fragment>
                  );
                })}
          </div>
        );
      })}
    </div>
  );
};

/** A slot that rolls from one word to the next. `items` change at `every` frames, rolling over `dur`. */
export const Swap: React.FC<{
  /** Words, or nodes (a mark plus a name: <><Brand name="zoom" size={60} /> Zoom</>). */
  items: React.ReactNode[];
  start?: number;
  every?: number;
  dur?: number;
  style?: React.CSSProperties;
  /** Which way the old word leaves. */
  dir?: 'up' | 'down';
  /** Exact frames each item takes over (items[i] from times[i]); overrides start + every. */
  times?: number[];
  /** The first item rises in at its own frame (instead of being there already). */
  enter?: boolean;
  blur?: boolean;
}> = ({ items, start = 0, every = 24, dur = 12, style, dir = 'up', blur = true, times, enter = false }) => {
  const frame = useCurrentFrame();
  const first = times ? times[0] : start;
  if (enter && frame < first) return <span style={{ display: 'inline-block', ...style }} />;
  const entering = enter && frame < first + dur ? 1 - ease.out((frame - first) / dur) : 0;
  // item i takes over at frame takeAt(i); the roll into it starts `dur` frames earlier
  const takeAt = (i: number) => (times ? times[i] : start + i * every);
  let idx = 0;
  for (let i = 0; i < items.length; i++) if (frame >= takeAt(i)) idx = i;
  const next = idx + 1 < items.length ? takeAt(idx + 1) : Infinity;
  const switching = next !== Infinity && frame > next - dur;
  const p = switching ? ease.inOut((frame - (next - dur)) / dur) : 0;
  const s = dir === 'up' ? -1 : 1;
  const cell = (word: React.ReactNode, y: number, o: number, b: number) => (
    <span style={{ position: y === 0 && o === 1 ? 'relative' : 'absolute', left: 0, top: 0, display: 'inline-block', transform: `translateY(${y}em)`, opacity: o, filter: blur && b ? `blur(${b}px)` : undefined, whiteSpace: 'pre' }}>
      {word}
    </span>
  );
  return (
    <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', padding: '0.1em 0', ...style }}>
      {switching ? (
        <>
          <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>{p < 0.5 ? items[idx] : items[idx + 1]}</span>
          {cell(items[idx], s * p * 1.1, 1 - p, p * 10)}
          {cell(items[idx + 1], -s * (1 - p) * 1.1, p, (1 - p) * 10)}
        </>
      ) : (
        cell(items[idx], entering * 1.1, 1 - entering, entering * 10)
      )}
    </span>
  );
};

/**
 * Typed text with a caret, at a believable pace to the end: `cps` 17 by default (about 15 characters a second once the
 * seeded hesitations and the pauses after spaces and punctuation are counted). When time is short, show a prefix as
 * already typed and type the rest; `burst` (the rest landing at once) is kept for older films and is never used.
 */
/** The frame each character of `text` appears on, typed from `start` at about `cps` characters a second (useTyped's cadence). */
export const typingTimes = (text: string, start: number, fps = 30, cps = 17, seed = 3, burst?: number | string) => {
  // burst: a number of words, or the text typed before the rest lands at once (an email, a path: 'maya@')
  const burstChars = typeof burst === 'string' && text.startsWith(burst) && burst.length > 0 ? burst.length : -1;
  const per = fps / cps;
  const out: number[] = [];
  let t = start;
  let words = 0;
  let burstAt = -1;
  let burstIdx = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (burstAt >= 0) {
      // after the burst point the rest lands over 2 frames (first half, then second half), in order
      const rest = text.length - burstIdx;
      out.push(Math.ceil(burstAt) + (i - burstIdx < rest / 2 ? 1 : 2));
      continue;
    }
    t += per + (rand(i * 7.3 + seed) - 0.5) * per * 0.9 + (c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0);
    out.push(Math.ceil(t));
    if (c === ' ') words++;
    if (burstAt < 0 && ((typeof burst === 'number' && words >= burst) || (burstChars > 0 && i + 1 >= burstChars))) {
      burstAt = t;
      burstIdx = i + 1;
    }
  }
  return out;
};

export const useTyped = (text: string, start: number, cps = 17, seed = 3, burst?: number | string) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (burst !== undefined) {
    const keyFrames = typingTimes(text, start, fps, cps, seed, burst);
    const shownN = keyFrames.filter((k) => frame >= k).length;
    return { shown: text.slice(0, shownN), done: shownN >= text.length, doneAt: keyFrames[keyFrames.length - 1] ?? start, keyFrames };
  }
  const per = fps / cps;
  let t = start;
  let shown = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const jitter = (rand(i * 7.3 + seed) - 0.5) * per * 0.9;
    const pause = c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0;
    t += per + jitter + pause;
    if (frame >= t) shown = i + 1;
    else break;
  }
  const doneAt = (() => {
    let tt = start;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      tt += per + (rand(i * 7.3 + seed) - 0.5) * per * 0.9 + (c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0);
    }
    return tt;
  })();
  // the frame each character appears on: drive key sounds and caret-following cameras from it
  const keyFrames: number[] = [];
  {
    let tt = start;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      tt += per + (rand(i * 7.3 + seed) - 0.5) * per * 0.9 + (c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0);
      keyFrames.push(Math.ceil(tt));
    }
  }
  return { shown: text.slice(0, shown), done: shown >= text.length, doneAt, keyFrames };
};

export const Typing: React.FC<{
  text: string;
  start?: number;
  cps?: number;
  caret?: boolean;
  caretColor?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  placeholderColor?: string;
  /** @deprecated The rest landing at once reads as a jump: type at a believable speed, or show a prefix as typed. */
  burst?: number | string;
}> = ({ text, start = 0, cps = 17, caret = true, caretColor = 'currentColor', style, placeholder, placeholderColor = 'rgba(128,128,128,.6)', burst }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shown, done, doneAt } = useTyped(text, start, cps, 3, burst);
  const blinkOn = !done || Math.floor((frame - doneAt) / (fps * 0.5)) % 2 === 0;
  return (
    <span style={{ whiteSpace: 'pre', ...style }}>
      {shown.length === 0 && placeholder ? <span style={{ color: placeholderColor }}>{placeholder}</span> : shown}
      {caret && (
        <span
          style={{
            display: 'inline-block',
            width: '0.07em',
            height: '1.05em',
            marginLeft: shown.length ? '0.04em' : 0,
            transform: 'translateY(0.16em)',
            background: caretColor,
            opacity: frame >= start - 6 && blinkOn ? 1 : 0,
            borderRadius: 2,
          }}
        />
      )}
    </span>
  );
};

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
/** Letters resolve left to right from random glyphs. Each letter flickers ~`flicker` frames before it locks. */
export const Scramble: React.FC<{ text: string; start?: number; per?: number; flicker?: number; style?: React.CSSProperties; glyphs?: string }> = ({
  text,
  start = 0,
  per = 1.5,
  flicker = 8,
  style,
  glyphs = GLYPHS,
}) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums', ...style }}>
      {[...text].map((c, i) => {
        const lock = start + i * per + flicker;
        const visible = frame >= start + i * per;
        if (!visible) return <span key={i} style={{ opacity: 0 }}>{c}</span>;
        if (frame >= lock || c === ' ') return <span key={i}>{c}</span>;
        const g0 = glyphs[Math.floor(rand(i * 31 + Math.floor(frame / 2) * 7) * glyphs.length)];
        // the flicker takes the case of the letter it settles to (a sentence-case line never flickers in capitals)
        const g = c !== c.toUpperCase() ? g0.toLowerCase() : g0;
        return (
          <span key={i} style={{ opacity: 0.75 }}>
            {g}
          </span>
        );
      })}
    </span>
  );
};

/**
 * A number that counts to its value like a mechanical counter. By default (`roll="step"`) it moves in whole digits:
 * every frame shows whole numbers, low digits change fast and high digits tick over last. `roll="smooth"` is the
 * earlier reel, each column placed by the continuous value (its lowest digit is mid-roll on most frames). Digits stay sharp.
 * Integers only; pass prefix/suffix for "$", "%", "k".
 */
export const Odometer: React.FC<{
  value: number;
  from?: number;
  start?: number;
  dur?: number;
  prefix?: string;
  suffix?: string;
  /** Thousands separator every 3 digits. */
  sep?: string;
  /** Motion blur on fast reels, max px (default 0: rolling digits stay sharp, never smeared). */
  blur?: number;
  /** Digits after the decimal point (92.4 -> decimals 1). */
  decimals?: number;
  style?: React.CSSProperties;
  curve?: Ease;
  /**
   * 'step' (default): every frame shows whole digits (the count moves in whole units of its last digit), so no frame,
   * held or not, shows a digit clipped mid-roll. 'smooth': the earlier reel whose lowest digit rolls continuously.
   */
  roll?: 'step' | 'smooth';
}> = ({ value, from = 0, start = 0, dur = 40, prefix = '', suffix = '', sep = ',', decimals = 0, style, curve = ease.out, blur: blurMax = 0, roll = 'step' }) => {
  const frame = useCurrentFrame();
  const k10 = Math.pow(10, decimals);
  // snap float noise (0.94 * 100 = 93.99999...) so a number at rest shows exactly its digits
  const snap = (v: number) => (Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v) : v);
  const whole = (v: number) => (roll === 'step' ? Math.round(v) : v);
  const cur = whole(snap(mix(at(frame, start, dur, curve), from, value) * k10));
  const prev = whole(mix(at(frame - 1, start, dur, curve), from, value) * k10);
  const nDigits = Math.max(decimals + 1, String(Math.round(Math.max(Math.abs(value), Math.abs(from)) * k10)).length);
  const H = 1.12;
  const cols: React.ReactNode[] = [];
  for (let k = nDigits - 1; k >= 0; k--) {
    const scale = Math.pow(10, k);
    // A reel only shows once the number is big enough to need it (no leading zeros).
    const needed = Math.abs(cur) >= scale || k <= decimals;
    const pos = ((cur / scale) % 10 + 10) % 10;
    // A real odometer: the lowest reel moves continuously; a higher reel rolls only while every reel below it shows 9
    // and the lowest is rolling over (so a number at rest never shows a half-rolled digit).
    const whole = Math.floor(pos);
    const lower = ((cur % scale) + scale) % scale;
    const frac = k === 0 ? pos - whole : lower > scale - 1 ? lower - (scale - 1) : 0;
    const y = (whole + frac) % 10;
    const speed = Math.abs(cur - prev) / scale;
    // whole steps are never blurred (a blurred whole digit is a smear); blur only on the smooth reel
    const blur = roll === 'step' ? 0 : Math.min(blurMax, speed * 6);
    cols.push(
      <span key={k} style={{ display: 'inline-block', height: `${H}em`, overflow: 'hidden', width: needed ? undefined : 0, verticalAlign: 'bottom' }}>
        <span style={{ display: 'block', transform: `translateY(${-y * H}em)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
            <span key={i} style={{ display: 'block', height: `${H}em`, lineHeight: `${H}em` }}>
              {d}
            </span>
          ))}
        </span>
      </span>,
    );
    if (decimals && k === decimals) cols.push(<span key="dot">.</span>);
    else if (sep && k > decimals && (k - decimals) % 3 === 0 && Math.abs(cur) >= scale) cols.push(<span key={`s${k}`}>{sep}</span>);
  }
  return (
    <span style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums', lineHeight: `${H}em`, ...style }}>
      {prefix && <span>{prefix}</span>}
      {cols}
      {suffix && <span>{suffix}</span>}
    </span>
  );
};

/** A highlight that sweeps in behind its children (left to right), then optionally away. */
export const Marker: React.FC<{
  children: React.ReactNode;
  start?: number;
  dur?: number;
  color?: string;
  inset?: string;
  radius?: number;
  textColor?: string;
}> = ({ children, start = 0, dur = 14, color = '#FFE45C', inset = '0.06em -0.12em', radius = 6, textColor }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.inOut);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset, background: color, borderRadius: radius, transformOrigin: '0 50%', transform: `scaleX(${p})` }} />
      <span style={{ position: 'relative', color: p > 0.5 && textColor ? textColor : undefined }}>{children}</span>
    </span>
  );
};

/**
 * An append build: words join a centred line one at a time (at `times[i]`), and the line re-centres to make room with
 * most of the travel in the first frames (a jump, not a slide). The new word rides in with the line. Widths are
 * measured from a hidden copy, so any face and size works. One line; split long copy into two Builds.
 * `swaps` replaces one word in place on a frame ("Snap it" -> "Draw it"): the old word rolls out, the new one rolls in
 * (the roll of `<Swap>`), and the line re-centres to the new width the same way.
 */
/** A word of a Build: text, or a slot of a fixed width (px) that holds an object in the line (a mark, a tile, a chip). */
export type BuildWord = string | { slot: number; node?: React.ReactNode };
/** One word of a Build replaced in place: from frame `at`, word `index` is `word`. */
export type BuildSwap = { at: number; index: number; word: BuildWord };

export const Build: React.FC<{
  words: BuildWord[];
  times: number[];
  /** Frames the re-centre takes (most of it in the first 2). */
  dur?: number;
  style?: React.CSSProperties;
  /** Per-word styles (accent a word). */
  wordStyle?: (i: number) => React.CSSProperties | undefined;
  /** A new word arrives in this colour and settles to the line colour. */
  born?: string;
  settle?: number;
  /** Gap between words in em. */
  space?: number;
  /** Words replaced in place on their frames; the line re-centres to the new width. */
  swaps?: BuildSwap[];
  /** Frames the roll of a swapped word takes (default 10). */
  swapDur?: number;
  /** Let trailing punctuation take the accent or born colour too (default false: punctuation keeps the line's colour). */
  tintPunctuation?: boolean;
}> = ({ words, times, dur = 9, style, wordStyle, born, settle = 12, space = 0.26, swaps = [], swapDur = 10, tintPunctuation = false }) => {
  const frame = useCurrentFrame();
  const ref = React.useRef<HTMLDivElement>(null);
  const [widths, setWidths] = React.useState<number[] | null>(null);
  const [handle] = React.useState(() => delayRender('measure Build words'));
  React.useLayoutEffect(() => {
    let alive = true;
    // measure once the web fonts have loaded, so the widths are the real face's, not the fallback's
    document.fonts.ready.then(() => {
      if (!alive || !ref.current) return;
      const spans = Array.from(ref.current.querySelectorAll<HTMLSpanElement>('[data-w]'));
      // offsetWidth: layout px, unaffected by any scale on a parent (the Sheet, a camera, a half-size render)
      setWidths(spans.map((s) => s.offsetWidth));
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [handle]);
  const n = words.length;
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : 100;
  const gap = space * fontSize;
  // which swap (index into `swaps`, -1: the word itself) each word shows at frame f; `strict` leaves out swaps on f
  const variants = (f: number, strict = false) =>
    words.map((_, i) => {
      let v = -1;
      swaps.forEach((sw, j) => {
        if (sw.index === i && (strict ? f > sw.at : f >= sw.at) && (v < 0 || sw.at >= swaps[v].at)) v = j;
      });
      return v;
    });
  const widthOf = (i: number, v: number) => (widths ? (v < 0 ? widths[i] : widths[n + v]) : 0);
  const wordOf = (i: number, v: number) => (v < 0 ? words[i] : swaps[v].word);
  const layout = (count: number, vars: number[]) => {
    if (!widths) return [] as number[];
    const ws = Array.from({ length: count }, (_, i) => widthOf(i, vars[i]));
    const total = ws.reduce((a, b) => a + b, 0) + gap * Math.max(0, count - 1);
    let x = -total / 2;
    return ws.map((w) => {
      const left = x;
      x += w + gap;
      return left;
    });
  };
  const shown = times.filter((t) => frame >= t).length;
  const k = shown - 1;
  const lead = (t: number) => {
    const q = clamp(t);
    const kk = 7;
    return (1 - Math.exp(-kk * q)) / (1 - Math.exp(-kk));
  };
  const varsNow = variants(frame);
  // the latest swap of a word already on screen, when it is later than the latest arrival
  let swapAt = -Infinity;
  swaps.forEach((sw) => {
    if (sw.index < shown && frame >= sw.at && sw.at > swapAt) swapAt = sw.at;
  });
  const swapping = shown > 0 && swapAt > times[k];
  // words that arrive on the same frame as the last one arrive together (the line does not slide in from fewer words)
  const before = k >= 0 ? times.slice(0, shown).filter((t) => t < times[k]).length : 0;
  const p = swapping ? lead((frame - swapAt) / dur) : before >= 1 ? lead((frame - times[k]) / dur) : 1;
  const cur = layout(Math.max(0, shown), varsNow);
  const prev = swapping ? layout(shown, variants(swapAt, true)) : layout(before, varsNow);
  const shift = !swapping && before >= 1 && cur.length && prev.length ? cur[0] - prev[0] : 0;
  const xOf = (i: number) => (swapping || i < before ? mix(p, prev[i], cur[i]) : cur[i] - shift * (1 - p));
  // a word drawn: text (the accent or born colour on its letters, never on its trailing punctuation) or a slot
  const draw = (w: BuildWord, i: number, x: number, bornAt: number, extra?: React.CSSProperties, key?: string) => {
    const pos: React.CSSProperties = { position: 'absolute', left: '50%', top: 0, transform: `translateX(${x}px)` };
    if (typeof w !== 'string')
      return (
        <span key={key} style={{ ...pos, width: w.slot, height: '1.2em', display: 'flex', alignItems: 'center', justifyContent: 'center', ...extra }}>
          {w.node}
        </span>
      );
    const ws = wordStyle?.(i);
    // a new word is born in `born` and settles to its own colour (wordStyle's, else the line's)
    const c = born && frame < bornAt + settle + 1 ? mixColor(born, ((ws?.color ?? style?.color) as string) ?? '#000000', at(frame, bornAt, settle, ease.inOut)) : undefined;
    const tail = !tintPunctuation && (c || ws?.color) ? punctTail(w) : '';
    if (!tail)
      return (
        <span key={key} style={{ ...pos, whiteSpace: 'pre', ...ws, ...(c ? { color: c } : {}), ...extra }}>
          {w}
        </span>
      );
    const { color: wc, ...rest } = ws ?? {};
    return (
      <span key={key} style={{ ...pos, whiteSpace: 'pre', ...rest, ...extra }}>
        {w.length > tail.length && <span style={{ color: c ?? wc }}>{w.slice(0, -tail.length)}</span>}
        <span style={style?.color ? { color: style.color } : undefined}>{tail}</span>
      </span>
    );
  };
  return (
    <div style={{ position: 'relative', width: '100%', height: '1.2em', ...style }}>
      {/* hidden copy for measuring: the words, then every swap's word */}
      <div ref={ref} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', left: 0, top: 0 }}>
        {[...words, ...swaps.map((sw) => sw.word)].map((w, j) => (
          <span key={j} data-w="1" style={{ display: 'inline-block', whiteSpace: 'pre', ...(typeof w === 'string' ? wordStyle?.(j < n ? j : swaps[j - n].index) : { width: w.slot }) }}>
            {typeof w === 'string' ? w : null}
          </span>
        ))}
      </div>
      {widths &&
        words.map((_, i) => {
          if (i >= shown) return null;
          // every visible word sits on its slot in the current layout, minus the part of the move not yet travelled
          const x = xOf(i);
          const v = varsNow[i];
          // a swapped word rolls like <Swap>: the old one leaves upward, the new one rises in from below, inside a mask
          if (v >= 0 && frame < swaps[v].at + swapDur) {
            const q = ease.inOut(clamp((frame - swaps[v].at) / swapDur));
            const old = variants(swaps[v].at, true)[i];
            const roll = (w: BuildWord, y: number, o: number, b: number, bornAt: number, key: string) => (
              <span key={key} style={{ position: 'absolute', inset: '-0.1em 0', overflow: 'hidden', pointerEvents: 'none' }}>
                {draw(w, i, x, bornAt, { top: '0.1em', transform: `translateX(${x}px) translateY(${y}em)`, opacity: o, filter: b > 0.3 ? `blur(${b}px)` : undefined })}
              </span>
            );
            return (
              <React.Fragment key={i}>
                {roll(wordOf(i, old), -q * 1.1, 1 - q, q * 10, old < 0 ? times[i] : swaps[old].at, 'o')}
                {roll(wordOf(i, v), (1 - q) * 1.1, q, (1 - q) * 10, swaps[v].at, 'n')}
              </React.Fragment>
            );
          }
          return draw(wordOf(i, v), i, x, v < 0 ? times[i] : swaps[v].at, undefined, String(i));
        })}
    </div>
  );
};

/**
 * A sentence whose slot swaps marks: "Lands in [mark] Slack." The words before the slot stay; on each of `times` the
 * mark and the name roll to the next item and the line re-centres to the new name's width. `times[0]` is the frame the
 * line is there (or the frame the first item joins it, when `enter` builds the words before it).
 */
export const SlotLine: React.FC<{
  /** The words before the slot ("Lands in"). */
  before: string;
  /** Each item: its mark (a <Brand>, an <AppIcon>) and its name. */
  items: Array<{ mark: React.ReactNode; name: string }>;
  /** The frame each item takes the slot. */
  times: number[];
  /** Text after the name (none by default: a statement ends without a full stop unless the sentence needs one). */
  after?: string;
  /** Frames the words before the slot arrive, one per word (default: all at times[0]). */
  enter?: number[];
  /** The slot's width in px (default 1.15 x the font size); size the marks to about 0.85 of the font size. */
  slot?: number;
  style?: React.CSSProperties;
  /** The name's style (the accent colour); its trailing punctuation keeps the line's colour. */
  nameStyle?: React.CSSProperties;
  born?: string;
  dur?: number;
  swapDur?: number;
}> = ({ before, items, times, after = '', enter, slot, style, nameStyle, born, dur, swapDur }) => {
  const lead = before.split(' ').filter(Boolean);
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : 100;
  const sw = slot ?? fontSize * 1.15;
  const mi = lead.length;
  const words: BuildWord[] = [...lead, { slot: sw, node: items[0]?.mark }, `${items[0]?.name ?? ''}${after}`];
  const t0 = times[0] ?? 0;
  const wordTimes = [...lead.map((_, i) => enter?.[i] ?? t0), t0, t0];
  const swaps: BuildSwap[] = items.slice(1).flatMap((it, j) => [
    { at: times[j + 1], index: mi, word: { slot: sw, node: it.mark } },
    { at: times[j + 1], index: mi + 1, word: `${it.name}${after}` },
  ]);
  return <Build words={words} times={wordTimes} swaps={swaps} style={style} wordStyle={(i) => (i === mi + 1 ? nameStyle : undefined)} born={born} dur={dur} swapDur={swapDur} />;
};

/**
 * The laid-out width (px) of a piece of text in a given style, measured from the real face once the fonts have loaded
 * (0 until then; the render waits). Place an object right after a word: a mark beside a name, an underline of the
 * exact length.
 */
/** Resolves once the exact face of a style (its weight, slant and size) has loaded, not only the faces already in use. */
const whenFace = (style: React.CSSProperties, text: string): Promise<unknown> => {
  const size = typeof style.fontSize === 'number' ? `${style.fontSize}px` : style.fontSize ?? '16px';
  const spec = `${style.fontStyle ?? 'normal'} ${style.fontWeight ?? 400} ${size} ${style.fontFamily ?? 'sans-serif'}`;
  let load: Promise<unknown>;
  try {
    load = document.fonts.load(spec, text || 'x');
  } catch {
    load = Promise.resolve();
  }
  return load.catch(() => null).then(() => document.fonts.ready);
};

export const useTextWidth = (text: string, style: React.CSSProperties) => {
  const [w, setW] = React.useState(0);
  const [first] = React.useState(() => delayRender('measure text'));
  const started = React.useRef(false);
  const key = JSON.stringify([text, style.fontFamily, style.fontSize, style.fontWeight, style.letterSpacing, style.fontStyle]);
  React.useLayoutEffect(() => {
    let alive = true;
    // every new text or style holds the frame until it is measured, so a line that is re-used never shows a stale width
    const handle = started.current ? delayRender('measure text') : first;
    started.current = true;
    whenFace(style, text).then(() => {
      if (alive) {
        const el = document.createElement('span');
        Object.assign(el.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', left: '-9999px', top: '0' });
        for (const [k, v] of Object.entries(style)) (el.style as unknown as Record<string, string>)[k] = typeof v === 'number' && k !== 'fontWeight' && k !== 'lineHeight' ? `${v}px` : String(v);
        el.textContent = text;
        document.body.appendChild(el);
        setW(el.offsetWidth);
        el.remove();
      }
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, first]);
  return w;
};

/** A box inside a set line, in px from the line box's top-left corner. */
export type TextRect = { x: number; y: number; width: number; height: number; cx: number; cy: number };
/**
 * Where a character or a word sits in a set line. The box is the glyph's advance and the face's line (as the browser
 * lays it out), `ink` the drawn shape (the dot of a full stop, the bowl of an o), `baseline` the baseline's y and `xMid`
 * the y of the x-height's centre: centre a dot or an object on a lowercase letter at (cx, xMid).
 */
export type GlyphBox = TextRect & { ink: TextRect; baseline: number; xMid: number };
/** A set line measured: its box, the baseline, the x-height and every character's and word's box. */
export type TextLayout = { ready: boolean; width: number; height: number; baseline: number; xHeight: number; xMid: number; chars: GlyphBox[]; words: GlyphBox[] };

const rect = (x: number, y: number, width: number, height: number): TextRect => ({ x, y, width, height, cx: x + width / 2, cy: y + height / 2 });
const union = (a: TextRect[]): TextRect => {
  const x0 = Math.min(...a.map((r) => r.x));
  const y0 = Math.min(...a.map((r) => r.y));
  const x1 = Math.max(...a.map((r) => r.x + r.width));
  const y1 = Math.max(...a.map((r) => r.y + r.height));
  return rect(x0, y0, x1 - x0, y1 - y0);
};
const EMPTY_BOX: GlyphBox = { ...rect(0, 0, 0, 0), ink: rect(0, 0, 0, 0), baseline: 0, xMid: 0 };

/**
 * Measure a line of text as the browser sets it, once the fonts have loaded (the render waits; zeros until then): the
 * box of every character and word relative to the line's own box (its left edge and the top of its line, with the
 * style's `lineHeight`: pass the one the line is drawn with, `<Words>` sets 1.04). For moves that start from a glyph:
 * the full stop that becomes the mark, the camera diving into the o, a dot landing on an i.
 *
 *   const L = useTextLayout('Ship it.', type);       // L.width, L.chars, L.words, L.baseline, L.xMid
 *   const dot = L.chars[L.chars.length - 1].ink;      // the full stop's drawn dot: dot.cx, dot.cy, dot.width
 *   // on screen, for a line centred at (960, 540): x = 960 - L.width / 2 + dot.cx, y = 540 - L.height / 2 + dot.cy
 */
export const useTextLayout = (text: string, style: React.CSSProperties): TextLayout => {
  const [layout, setLayout] = React.useState<TextLayout>({ ready: false, width: 0, height: 0, baseline: 0, xHeight: 0, xMid: 0, chars: [], words: [] });
  const [handle] = React.useState(() => delayRender('measure text layout'));
  const done = React.useRef(false);
  const key = JSON.stringify([text, style.fontFamily, style.fontSize, style.fontWeight, style.letterSpacing, style.fontStyle, style.lineHeight, style.fontVariationSettings, style.fontFeatureSettings]);
  React.useLayoutEffect(() => {
    let alive = true;
    whenFace(style, text).then(() => {
      if (!alive) return;
      const el = document.createElement('div');
      Object.assign(el.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', left: '-9999px', top: '0', display: 'inline-block' });
      for (const [k, v] of Object.entries(style)) (el.style as unknown as Record<string, string>)[k] = typeof v === 'number' && k !== 'fontWeight' && k !== 'lineHeight' ? `${v}px` : String(v);
      Object.assign(el.style, { position: 'absolute', left: '-9999px', top: '0', transform: 'none', whiteSpace: 'pre', display: 'inline-block' });
      const node = document.createTextNode(text);
      const base = document.createElement('span');
      Object.assign(base.style, { display: 'inline-block', width: '0', height: '0', verticalAlign: 'baseline' });
      const ex = document.createElement('span');
      Object.assign(ex.style, { position: 'absolute', left: '0', top: '0', width: '1px', height: '1ex' });
      el.append(node, base, ex);
      document.body.appendChild(el);
      const box = el.getBoundingClientRect();
      const baseline = base.getBoundingClientRect().bottom - box.top;
      const xHeight = ex.getBoundingClientRect().height;
      const xMid = baseline - xHeight / 2;
      // the drawn shape of each character from the canvas's metrics of the same face
      const ctx = document.createElement('canvas').getContext('2d');
      const cs = getComputedStyle(el);
      if (ctx) ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const range = document.createRange();
      const chars: GlyphBox[] = [];
      let off = 0;
      for (const ch of Array.from(text)) {
        range.setStart(node, off);
        range.setEnd(node, off + ch.length);
        off += ch.length;
        const r = range.getBoundingClientRect();
        const g = rect(r.left - box.left, r.top - box.top, r.width, r.height);
        const m = ctx && ch.trim() ? ctx.measureText(ch) : null;
        const ink = m ? rect(g.x - m.actualBoundingBoxLeft, baseline - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) : rect(g.cx, baseline, 0, 0);
        chars.push({ ...g, ink, baseline, xMid });
      }
      const words: GlyphBox[] = [];
      const cps = Array.from(text);
      let i = 0;
      while (i < cps.length) {
        if (!cps[i].trim()) {
          i++;
          continue;
        }
        let j = i;
        while (j < cps.length && cps[j].trim()) j++;
        const part = chars.slice(i, j);
        words.push({ ...union(part), ink: union(part.map((c) => c.ink)), baseline, xMid });
        i = j;
      }
      el.remove();
      setLayout({ ready: true, width: box.width, height: box.height, baseline, xHeight, xMid, chars, words });
      if (!done.current) {
        done.current = true;
        continueRender(handle);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, handle]);
  return layout;
};

const pick = <T,>(list: T[], index: number) => list[index < 0 ? list.length + index : index];
/** The box of character `index` of a set line (negative counts from the end: -1 is the full stop). See useTextLayout. */
export const useGlyphBox = (text: string, style: React.CSSProperties, index: number): GlyphBox => pick(useTextLayout(text, style).chars, index) ?? EMPTY_BOX;
/** The box of word `index` of a set line (words split on spaces; negative counts from the end). See useTextLayout. */
export const useWordBox = (text: string, style: React.CSSProperties, index: number): GlyphBox => pick(useTextLayout(text, style).words, index) ?? EMPTY_BOX;

/**
 * The product's output seen big once: the key words of the answer (a number, a sentence, a result) cut on giant, hold
 * while they creep, then travel into their place in the UI at UI size. `from` and `to` are the text's centre and font
 * size, in px of the frame (or of the world it sits in). After `landed` (start + hold + travel) the UI's own copy takes
 * over: draw it from that frame and stop drawing this.
 */
export const Output: React.FC<{
  text: string;
  start: number;
  /** Frames it stays giant (default 24: long enough to read two or three words). */
  hold?: number;
  /** Frames of the travel into the UI (default 10). */
  travel?: number;
  from: { x: number; y: number; size: number };
  to: { x: number; y: number; size: number };
  /** Born in this colour, settling to the style's colour. */
  born?: string;
  style?: React.CSSProperties;
}> = ({ text, start, hold = 24, travel = 10, from, to, born, style }) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > start + hold + travel) return null;
  const p = ease.inOut(clamp((frame - start - hold) / travel));
  // size in log space, so the shrink reads as one move; a slow creep while it holds
  const size = from.size * Math.pow(to.size / from.size, p) * (1 + 0.035 * clamp((frame - start) / hold) * (1 - p));
  const color = born ? mixColor(born, (style?.color as string) ?? '#000000', at(frame, start, 12, ease.inOut)) : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        left: mix(p, from.x, to.x),
        top: mix(p, from.y, to.y),
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...style,
        fontSize: size,
        color: color ?? style?.color,
      }}
    >
      {text}
    </div>
  );
};

/** The frame an `<Output>` has landed in the UI. */
export const outputLanded = (start: number, hold = 24, travel = 10) => start + hold + travel;
