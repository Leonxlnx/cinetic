// What every act of the explainer shares: the white page (a tinted paper, the type in ink, the accent only on the
// band, the mark and the parts), the absolute frame, the sentence role (small and airy: one short sentence on 90 % white),
// the mark drawn as a word, and placement helpers. Retell it in the dealt direction's world (out/DIRECTION.md): its
// ground and type replace this floor; the product's own picture and marks replace the kit's.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { kitTheme } from '../kit';
import { fitSize, measureTracked } from '../lib/measure';
import { ACT, type ActName, H, W } from '../timeline';

/** The page: a tinted white, ink type, the one accent. The picture's own stage is the mid slate (white type reads on it). */
export const PAGE = kitTheme('tintedPaper', C.accent);
export const SHOT = kitTheme('slateMid', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/**
 * The sentence role: one short sentence on a white page is set small and airy (about 84 px, 5-6 % of the frame
 * height, weight 500, tracked OUT +0.05 em), never the launch film's tight 120 px line. Display sizes keep their
 * negative tracking (the giant name uses TYPE.giant).
 */
export const SENTENCE = { size: 84, weight: TYPE.line.weight, track: 0.05, lead: 1.2 } as const;

/**
 * The size a sentence is set at: the role's size, smaller only when it would not fit `share` of the safe width (0.66:
 * a statement stays under 61 % of the frame), never under 72 px (it must read at feed size). A line that would need
 * less is too long for this film: 3-5 words a line.
 */
export const SENTENCE_MIN = 72;
export const sentenceSize = (text: string, share = 0.66) =>
  Math.max(SENTENCE_MIN * U, Math.min(SENTENCE.size * U, fitSize(text, (W - 2 * SAFE.x) * share, SENTENCE.size * U, SENTENCE.weight, SENTENCE.track)));

/** CSS for the sentence role at a size. */
export const sentenceStyle = (size: number, color: string = PAGE.text): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: size,
  fontWeight: SENTENCE.weight,
  letterSpacing: `${SENTENCE.track}em`,
  lineHeight: SENTENCE.lead,
  whiteSpace: 'pre',
  color,
});

/** The width of a sentence (or part of one) at a size, its trailing tracking left out. */
export const sentenceWidth = (text: string, size: number) => measureTracked(text, size, SENTENCE.weight, SENTENCE.track, FONT.text, { trailing: false });

/** The cap height of the sentence role at a size (Geist-like grotesks: about 0.72 em). */
export const capOf = (size: number) => size * 0.72;

/**
 * The product's mark set as a word: `size` is its height in px (about 1.25 cap heights inline, so it reads as one
 * word of the line), centred on (x, y). `s` and `rot` scale and turn it about its centre; `fill` draws it in one
 * colour (over a picture), else its own colours.
 */
export const MarkWord: React.FC<{ x: number; y: number; size: number; s?: number; rot?: number; o?: number; fill?: string }> = ({ x, y, size, s = 1, rot = 0, o = 1, fill }) => (
  <div
    data-ui
    style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})` }}
  >
    <LogoMark logo={LOGO} size={size} fill={fill ? () => fill : undefined} />
  </div>
);

/** A layer scaled by `k` about the screen point (ox, oy) and moved by (dx, dy): the act's camera on its world. */
export const Cam: React.FC<{ k?: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ k = 1, ox = W / 2, oy = H / 2, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>{children}</div>
);

/** Absolutely placed content, its top-left at (x, y) px. */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`, ...style }}>{children}</div>
);
