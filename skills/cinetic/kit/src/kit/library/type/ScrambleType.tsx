// ScrambleType (type, enter / emphasis): a word or short line shows wrong glyphs that change every few frames and lock
// into the real letters one by one, optionally inside two corner brackets that resize to the word; it can roll to the
// next word inside the brackets and close them to leave.
// Numbers: glyphs change every 3 f (1 f for a fast decode); the first letters lock after 8 f, one more every 3 f; one or
// two unlocked glyphs in the accent; a soft glow while scrambling; the roll swap 7 f (70 % in the first 3 f) with a
// vertical blur; brackets' legs 0.5 em, padding 0.42 em round the cap band; the close: legs shrink and the word dims to 25 % over 6 f.
// Caution: short words and labels (up to about 12 letters); a long line of noise reads as a fault.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

const GLYPHS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@<>/\\[]{}!?*+=';

/** The text shown at frame `f` (relative to the start) for a decode of `text`, and which letters are still wrong. */
export const scrambleAt = (text: string, f: number, o: { step: number; lockAfter: number; per: number; order: 'left' | 'random'; seed: number; grow: number }) => {
  const chars = Array.from(text);
  const idx = chars.map((_, i) => i).filter((i) => chars[i] !== ' ');
  const rank = new Map<number, number>();
  const ordered = o.order === 'left' ? idx : [...idx].sort((a, b) => hash(a, o.seed) - hash(b, o.seed));
  ordered.forEach((i, r) => rank.set(i, r));
  const state = Math.floor(Math.max(0, f) / o.step);
  const visible = o.grow > 0 ? Math.min(chars.length, 1 + Math.floor(Math.max(0, f) / o.grow)) : chars.length;
  const wrong: boolean[] = [];
  const out = chars.map((c, i) => {
    if (i >= visible) {
      wrong.push(false);
      return '';
    }
    if (c === ' ') {
      wrong.push(false);
      return ' ';
    }
    // the first two letters lock together, then one every `per` frames
    const r = rank.get(i) ?? 0;
    const lockF = o.lockAfter + Math.max(0, r - 1) * o.per;
    if (f >= lockF) {
      wrong.push(false);
      return c;
    }
    wrong.push(true);
    const g = GLYPHS[Math.floor(hash(i * 13 + state, o.seed) * GLYPHS.length)];
    return g === c ? GLYPHS[(GLYPHS.indexOf(g) + 7) % GLYPHS.length] : g;
  });
  return { out, wrong, done: wrong.every((w) => !w) && visible === chars.length };
};

/**
 * ScrambleType: a decode. From `at` the word shows wrong glyphs (letters, figures, punctuation) that change every
 * `step` frames; after `lockAfter` frames its letters lock into place, `per` frames apart, left to right or in a
 * seeded order; one or two of the wrong glyphs take the `accent`. `grow` builds the string one glyph every `grow`
 * frames from the left while it scrambles. `brackets` frames it with two corner brackets (bottom-left and top-right)
 * that resize to the word; `swaps` roll it to the next word inside them (the old word up and out, the new one up from
 * below, both with a vertical blur, the brackets and the size following); `closeAt` shrinks the brackets' legs and dims
 * the word, the end of the beat.
 */
export const ScrambleType: React.FC<{
  text: string;
  at?: number;
  /** Frames each wrong glyph holds (default 3). */
  step?: number;
  /** Frames before the first letters lock (default 8). */
  lockAfter?: number;
  /** Frames between locks (default 3). */
  per?: number;
  order?: 'left' | 'random';
  /** Build the string from the left, one glyph every `grow` frames (default 0: whole length at once). */
  grow?: number;
  size?: number;
  color?: string;
  /** The colour of one or two of the wrong glyphs (default a clear blue). */
  accent?: string;
  /** A soft glow behind the word while it scrambles (default on). */
  glow?: boolean;
  brackets?: boolean;
  /** The brackets' colour (default the word's colour at 70 %). */
  bracketColor?: string;
  swaps?: Array<{ at: number; text: string; size?: number }>;
  closeAt?: number;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({
  text,
  at = 0,
  step = 3,
  lockAfter = 8,
  per = 3,
  order = 'random',
  grow = 0,
  size = 90,
  color = '#F2F2F0',
  accent = '#3B82F0',
  glow = true,
  brackets = false,
  bracketColor,
  swaps = [],
  closeAt,
  leaveAt,
  x,
  y,
  font = fonts.inter,
  weight = 500,
  seed = 7,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sizes = [size, ...swaps.map((s) => s.size ?? size)];
  const texts = [text, ...swaps.map((s) => s.text)];
  const st = (s: number) => ({ fontFamily: font, fontWeight: weight, fontSize: s, letterSpacing: '-0.01em', lineHeight: 1.15 }) as const;
  // every word measured once (hooks in a fixed order: the base word and up to three swaps)
  const L0 = useTextLayout(texts[0], st(sizes[0]));
  const L1 = useTextLayout(texts[1] ?? '', st(sizes[1] ?? size));
  const L2 = useTextLayout(texts[2] ?? '', st(sizes[2] ?? size));
  const L3 = useTextLayout(texts[3] ?? '', st(sizes[3] ?? size));
  const Ls = [L0, L1, L2, L3];
  if (!L0.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const f = frame - at;
  // which word, and the roll into it
  let k = 0;
  swaps.forEach((s, j) => {
    if (frame >= s.at && j + 1 < 4) k = j + 1;
  });
  const swapStart = k > 0 ? swaps[k - 1].at : -Infinity;
  const DUR = 7;
  const rollP = k > 0 ? clamp(1 - Math.pow(1 - clamp((frame - swapStart + 1) / DUR), 2.6)) : 1;
  const rolling = k > 0 && rollP < 1;
  const sc = scrambleAt(text, f, { step, lockAfter, per, order, seed, grow });
  const scrambling = k === 0 && !sc.done;
  // the box the brackets frame: the shown string's width while scrambling, the word's after
  const cur = Ls[k];
  const prev = k > 0 ? Ls[k - 1] : cur;
  const wNow = k === 0 ? (scrambling ? cur.width * (sc.out.join('').length / Math.max(1, Array.from(text).length)) : cur.width) : mix(rollP, prev.width, cur.width);
  const sNow = k === 0 ? sizes[0] : mix(rollP, sizes[k - 1], sizes[k]);
  const pad = sNow * 0.42;
  const leg = sNow * 0.5;
  const close = closeAt !== undefined ? prog(frame, closeAt, 6, ease.linear) : 0;
  const legNow = leg * (1 - clamp(close * 1.6));
  const dim = 1 - 0.75 * close;
  const bc = bracketColor ?? color;
  const line = Math.max(1, Math.round(height / 540));
  const boxW = wNow + pad * 2;
  const boxH = sNow * 0.8 + pad * 2;
  const word = (s: string, wrong: boolean[] | null, sz: number, dy: number, blur: number, key: string) => (
    <div key={key} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translateY(${dy + sz * 0.05}px)`, ...st(sz), whiteSpace: 'pre', color, textShadow: glow && wrong && scrambling ? `0 0 ${sz * 0.25}px ${color}88, 0 0 ${sz * 0.6}px ${color}40` : undefined, filter: blur > 0.3 ? `url(#scramble-v${Math.round(blur)})` : undefined }}>
      {wrong
        ? Array.from(s).map((c, i) => {
            // one or two wrong glyphs take the accent, chosen per state
            const lit = wrong[i] && hash(i + Math.floor(f / step) * 3, seed + 1) > 0.62;
            return (
              <span key={i} style={{ color: lit ? accent : color }}>
                {c}
              </span>
            );
          })
        : s}
    </div>
  );
  const lineH = sNow * 1.25;
  return (
    <div style={{ position: 'absolute', left: cx - boxW / 2, top: cy - boxH / 2, width: boxW, height: boxH, opacity: dim }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        {[2, 4, 6, 8].map((b) => (
          <filter key={b} id={`scramble-v${b}`} x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation={`0 ${b}`} />
          </filter>
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, overflow: rolling ? 'hidden' : 'visible' }}>
        {k === 0 && word(sc.out.join(''), sc.wrong, sizes[0], 0, 0, 'w0')}
        {k > 0 && rolling && word(texts[k - 1], null, sizes[k - 1], -rollP * lineH, Math.min(8, Math.sin(rollP * Math.PI) * 8), 'old')}
        {k > 0 && word(texts[k], null, sNow, (1 - rollP) * lineH, rolling ? Math.min(8, Math.sin(rollP * Math.PI) * 8) : 0, 'new')}
      </div>
      {brackets && (
        <>
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: legNow, height: leg, borderLeft: `${line}px solid ${bc}`, borderBottom: legNow > 0.5 ? `${line}px solid ${bc}` : undefined, opacity: 0.75 }} />
          <div style={{ position: 'absolute', right: 0, top: 0, width: legNow, height: leg, borderRight: `${line}px solid ${bc}`, borderTop: legNow > 0.5 ? `${line}px solid ${bc}` : undefined, opacity: 0.75 }} />
        </>
      )}
    </div>
  );
};
