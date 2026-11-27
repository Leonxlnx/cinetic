// RiseLine (type, enter / exit): each word rises from behind its own baseline mask; a word can roll to another in
// place; the mask closes to leave.
// Numbers: rise 14 f expo out, 3 f between words; swap roll 12 f in-out; sink 9 f expo in, 1 f between words.
// Caution: the mask is the line box: keep other things clear of it or they get cut.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';

/**
 * RiseLine: the clean masked rise. Each word rises into place from behind its own baseline mask (no fade, no tilt), a
 * few frames after the one before. `swap` replaces one word in place: the old word rises out of its mask, the new one
 * rises in from below and the line re-centres to the new width. `leaveAt`: the mask closes, the words sink back behind
 * their baseline, the last word first. `maxWidth` wraps the statement onto as many centred lines as it needs (one
 * placement, the words still rising in reading order across the lines).
 */
export const RiseLine: React.FC<{
  text: string;
  at?: number;
  /** Frames between words (default 3). */
  gap?: number;
  /** Frames each word's rise takes (default 14). */
  dur?: number;
  swap?: { at: number; index: number; word: string };
  leaveAt?: number;
  /** Widest a line may be, in px: the words wrap onto centred lines one line box apart (default: one line). */
  maxWidth?: number;
  size?: number;
  color?: string;
  /** Colour of the swapped-in word (default the line's). */
  swapColor?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, gap = 3, dur = 14, swap, leaveAt, maxWidth, size = 120, color = '#141414', swapColor, x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.25 } as const;
  const words = text.split(/\s+/).filter(Boolean);
  const after = swap ? words.map((w, i) => (i === swap.index ? swap.word : w)) : words;
  const LA = useTextLayout(words.join(' '), style);
  const LB = useTextLayout(after.join(' '), style);
  if (!LA.ready || !LB.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const H = LA.height;
  // lines: greedy breaks on the one-line layout; kept the same through a swap
  const span = (L: typeof LA, a: number, b: number) => L.words[b].x + L.words[b].width - L.words[a].x;
  const lines: number[][] = [];
  words.forEach((_, i) => {
    const ln = lines[lines.length - 1];
    if (maxWidth !== undefined && ln && span(LA, ln[0], i) <= maxWidth) ln.push(i);
    else if (maxWidth !== undefined || !ln) lines.push([i]);
    else ln.push(i);
  });
  const one = lines.length === 1;
  const lineOf = words.map((_, i) => lines.findIndex((ln) => ln.includes(i)));
  const xOf = (L: typeof LA, i: number) => {
    const ln = lines[lineOf[i]];
    if (one) return cx - L.width / 2 + L.words[i].x;
    return cx - span(L, ln[0], ln[ln.length - 1]) / 2 + L.words[i].x - L.words[ln[0]].x;
  };
  const top0 = cy - (H * lines.length) / 2;
  const q = swap ? prog(frame, swap.at + 2, 12, ease.inOut) : 0;
  const n = words.length;
  const mask = (key: string, left: number, w: number, dy: number, word: string, ink: string, top: number) => (
    <div key={key} style={{ position: 'absolute', left: left - size * 0.1, top, width: w + size * 0.2, height: H, overflow: 'hidden' }}>
      <span style={{ ...style, position: 'absolute', left: size * 0.1, top: 0, color: ink, whiteSpace: 'pre', transform: `translateY(${dy}px)` }}>{word}</span>
    </div>
  );
  const els: React.ReactNode[] = [];
  words.forEach((wd, i) => {
    const xa = xOf(LA, i);
    const xb = xOf(LB, i);
    const top = top0 + lineOf[i] * H;
    const X = mix(q, xa, xb);
    const rise = prog(frame, at + i * gap, dur, ease.out);
    const sink = leaveAt === undefined ? 0 : prog(frame, leaveAt + (n - 1 - i), 9, ease.in);
    const base = (1 - rise) * H + sink * H;
    if (swap && i === swap.index && frame >= swap.at) {
      // one roll: the new word follows the old one a line below, so the two never overlap
      const r = prog(frame, swap.at, 12, ease.inOut);
      if (r < 1) els.push(mask(`o${i}`, X, LA.words[i].width, base - r * H, wd, color, top));
      els.push(mask(`n${i}`, X, LB.words[i].width, base + (1 - r) * H, swap.word, swapColor ?? color, top));
    } else els.push(mask(`w${i}`, X, LA.words[i].width, base, wd, color, top));
  });
  return <div style={{ position: 'absolute', inset: 0 }}>{els}</div>;
};
