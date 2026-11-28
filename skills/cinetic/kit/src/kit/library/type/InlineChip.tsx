// InlineChip (type, emphasis): a small rounded picture opens inside a sentence between two words, from a thin sliver
// to its width, pushing the words apart while the line stays centred; its picture can change every few frames and the
// chip can grow later.
// Numbers: chip 1.4 em wide, 0.8 em tall, radius 22 % of its height; opens from a 0.08 em sliver to full width in 4 f
// (ease-out, 70 % by the second frame); pictures swap by cut every 10-12 f; a later growth to about 2.4 x 1.3 em over 8 f.
// Caution: the chip shows what the sentence names (a photo, a product, a face), never a decoration; one chip a line.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';

/**
 * InlineChip: `text` is set and centred; at `at` a chip opens after word `after` (0-based), from a sliver to `w` x `h`
 * em in `open` frames, and the words part to make room. `pictures` are file names under public/ (or nodes), shown in
 * turn: one every `every` frames, or on `times`. `grow` widens and heightens the chip later (the picture taking over).
 * `words` builds the line word by word first (frame per word); words after the chip may arrive with it.
 */
export const InlineChip: React.FC<{
  text: string;
  /** The chip opens after this word. */
  after: number;
  at?: number;
  /** Frames the chip takes to open (default 4). */
  open?: number;
  /** Chip size in em (default 1.4 x 0.8). */
  w?: number;
  h?: number;
  pictures: Array<string | React.ReactNode>;
  every?: number;
  times?: number[];
  grow?: { at: number; dur?: number; w: number; h: number };
  /** The frame each word appears (default: all there from the start). */
  words?: number[];
  size?: number;
  color?: string;
  /** The chip's ground while a picture loads and its 1 px edge (default a soft grey). */
  chip?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, after, at = 0, open = 4, w = 1.4, h = 0.8, pictures, every = 11, times, grow, words: wordTimes, size = 96, color = '#141414', chip = '#D9D6D0', leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  if (!L.ready || L.words.length < words.length || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const shown = words.map((_, i) => frame >= (wordTimes?.[i] ?? -Infinity));
  if (!shown.some(Boolean)) return null;
  // chip size now: a sliver that opens, then an optional growth
  const p = frame < at ? -1 : prog(frame, at, open, ease.out);
  const g = grow ? prog(frame, grow.at, grow.dur ?? 8, ease.inOut) : 0;
  const cw = p < 0 ? 0 : mix(g, mix(p, 0.08, w), grow?.w ?? w) * size;
  const ch = p < 0 ? 0 : mix(g, h, grow?.h ?? h) * size;
  const sp = L.words.length > 1 ? L.words[1].x - (L.words[0].x + L.words[0].width) : size * 0.26;
  // the chip takes a slot after word `after` with one space either side
  const slot = p < 0 ? 0 : cw + sp;
  const lastShown = shown.lastIndexOf(true);
  const firstShown = shown.indexOf(true);
  const x0 = L.words[firstShown].x;
  const x1 = L.words[lastShown].x + L.words[lastShown].width;
  const total = x1 - x0 + (after < lastShown ? slot : p < 0 ? 0 : slot);
  const left = (x ?? width / 2) - total / 2 - x0;
  const top = (y ?? height / 2) - L.height / 2;
  const k = times ? Math.max(0, times.filter((t) => frame >= t).length - 1) : Math.max(0, Math.floor((frame - at) / every));
  const pic = pictures[Math.min(pictures.length - 1, k)];
  const chipX = L.words[after].x + L.words[after].width + sp;
  const chipY = L.words[0].xMid - ch / 2 - size * 0.02;
  return (
    <div style={{ position: 'absolute', left, top, height: L.height }}>
      {words.map((wd, i) =>
        shown[i] ? (
          <span key={i} style={{ ...style, position: 'absolute', left: L.words[i].x + (i > after ? slot : 0), top: 0, whiteSpace: 'pre', color }}>
            {wd}
          </span>
        ) : null,
      )}
      {p >= 0 && (
        <div style={{ position: 'absolute', left: chipX, top: chipY, width: cw, height: ch, borderRadius: ch * 0.22, overflow: 'hidden', background: chip, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.06)` }}>
          {typeof pic === 'string' ? <Img src={staticFile(pic)} style={{ position: 'absolute', left: '50%', top: '50%', width: Math.max(cw, ch * 1.6), height: Math.max(ch, cw / 1.6), objectFit: 'cover', transform: 'translate(-50%, -50%)' }} /> : pic}
        </div>
      )}
    </div>
  );
};
