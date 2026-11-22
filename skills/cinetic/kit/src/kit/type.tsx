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
  | 'slide' // the line slides in sideways as one, letters spaced wide then tightening
  | 'flip' // each unit turns up from 90 degrees around its baseline (3D)
  | 'cut'; // no animation: the line is just there (for hard-cut rhythm)

export type Leave = 'none' | 'rise' | 'fall' | 'blur' | 'scale';

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
  /** Frame the line starts to leave, and how. */
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

export const Words: React.FC<WordsProps> = ({
  text,
  start = 0,
  by = 'word',
  arrive = 'rise',
  gap,
  dur,
  leaveAt,
  leave = 'none',
  leaveDur = 10,
  accent = [],
  accentStyle,
  style,
  align = 'center',
  width,
  born,
  settle = 14,
  times,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = gap ?? (by === 'char' ? 1.6 : by === 'line' ? 6 : 3.5);
  const d = dur ?? (arrive === 'blur' ? 16 : arrive === 'scale' ? 18 : 14);
  const accents = new Set(accent.map(norm));

  const lines = by === 'line' ? text.split('\n') : [text];
  let unitIndex = 0;

  const unit = (content: string, key: string, isAccent: boolean) => {
    const i = unitIndex++;
    const s = times && times[i] !== undefined ? times[i] : start + stagger(i, g);
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
    if (leaveAt !== undefined && leave !== 'none') {
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
    const hidden = (arrive !== 'cut' && frame < s) || (leaveAt !== undefined && (leave === 'rise' || leave === 'fall') && frame >= leaveAt + stagger(i, g * 0.5) + leaveDur);
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
          color: born && frame < s + (arrive === 'cut' ? 0 : d) + settle + 1 ? mixColor(born, (style?.color as string) ?? '#000000', at(frame, s + (arrive === 'cut' ? 0 : d * 0.4), settle, ease.inOut)) : undefined,
          ...(isAccent ? accentStyle : null),
        }}
      >
        {content}
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
  blur?: boolean;
}> = ({ items, start = 0, every = 24, dur = 12, style, dir = 'up', blur = true, times }) => {
  const frame = useCurrentFrame();
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
        cell(items[idx], 0, 1, 0)
      )}
    </span>
  );
};

/**
 * Typed text with a caret. Human pace: about 14 chars a second with small seeded hesitations, faster
 * inside words. `cps` sets the average speed.
 */
/** The frame each character of `text` appears on, typed from `start` at about `cps` characters a second (useTyped's cadence). */
export const typingTimes = (text: string, start: number, fps = 30, cps = 16, seed = 3) => {
  const per = fps / cps;
  const out: number[] = [];
  let t = start;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    t += per + (rand(i * 7.3 + seed) - 0.5) * per * 0.9 + (c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0);
    out.push(Math.ceil(t));
  }
  return out;
};

export const useTyped = (text: string, start: number, cps = 16, seed = 3) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
}> = ({ text, start = 0, cps = 16, caret = true, caretColor = 'currentColor', style, placeholder, placeholderColor = 'rgba(128,128,128,.6)' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shown, done, doneAt } = useTyped(text, start, cps);
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
        const g = glyphs[Math.floor(rand(i * 31 + Math.floor(frame / 2) * 7) * glyphs.length)];
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
 * A number that rolls to its value like a mechanical counter. Every digit column is a reel 0-9 placed by the
 * continuous value at its place, so low digits spin fast (blurred by their speed) and high digits tick over last.
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
  /** Digits after the decimal point (92.4 -> decimals 1). */
  decimals?: number;
  style?: React.CSSProperties;
  curve?: Ease;
}> = ({ value, from = 0, start = 0, dur = 40, prefix = '', suffix = '', sep = ',', decimals = 0, style, curve = ease.out }) => {
  const frame = useCurrentFrame();
  const k10 = Math.pow(10, decimals);
  const cur = mix(at(frame, start, dur, curve), from, value) * k10;
  const prev = mix(at(frame - 1, start, dur, curve), from, value) * k10;
  const nDigits = Math.max(decimals + 1, String(Math.round(Math.max(Math.abs(value), Math.abs(from)) * k10)).length);
  const H = 1.12;
  const cols: React.ReactNode[] = [];
  for (let k = nDigits - 1; k >= 0; k--) {
    const scale = Math.pow(10, k);
    // A reel only shows once the number is big enough to need it (no leading zeros).
    const needed = Math.abs(cur) >= scale || k <= decimals;
    const pos = ((cur / scale) % 10 + 10) % 10;
    // Settle: only the ones reel moves continuously; higher reels snap with a short roll near each carry.
    const whole = Math.floor(pos);
    const frac = k === 0 ? pos - whole : clamp(((cur % scale) / scale - 0.9) / 0.1);
    const y = (whole + (k === 0 ? frac : frac)) % 10;
    const speed = Math.abs(cur - prev) / scale;
    const blur = Math.min(6, speed * 6);
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
 */
export const Build: React.FC<{
  words: string[];
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
}> = ({ words, times, dur = 9, style, wordStyle, born, settle = 12, space = 0.26 }) => {
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
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : 100;
  const gap = space * fontSize;
  const layout = (n: number) => {
    if (!widths) return [] as number[];
    const ws = widths.slice(0, n);
    const total = ws.reduce((a, b) => a + b, 0) + gap * Math.max(0, n - 1);
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
  const p = k >= 1 ? lead((frame - times[k]) / dur) : 1;
  const cur = layout(Math.max(0, shown));
  const prev = layout(Math.max(0, shown - 1));
  const shift = k >= 1 && cur.length && prev.length ? cur[0] - prev[0] : 0;
  return (
    <div style={{ position: 'relative', width: '100%', height: '1.2em', ...style }}>
      {/* hidden copy for measuring */}
      <div ref={ref} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', left: 0, top: 0 }}>
        {words.map((w, i) => (
          <span key={i} data-w="1" style={{ display: 'inline-block', ...wordStyle?.(i) }}>
            {w}
          </span>
        ))}
      </div>
      {widths &&
        words.map((w, i) => {
          if (i >= shown) return null;
          // every visible word sits on its slot in the current layout, minus the part of the shift not yet travelled
          const x = cur[i] - shift * (1 - p);
          const c = born && frame < times[i] + settle + 1 ? mixColor(born, (style?.color as string) ?? '#000000', at(frame, times[i], settle, ease.inOut)) : undefined;
          return (
            <span key={i} style={{ position: 'absolute', left: '50%', top: 0, transform: `translateX(${x}px)`, whiteSpace: 'nowrap', color: c, ...wordStyle?.(i) }}>
              {w}
            </span>
          );
        })}
    </div>
  );
};
