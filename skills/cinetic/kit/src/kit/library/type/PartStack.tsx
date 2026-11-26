// PartStack (type, emphasis): two words of a held line part to open a slot and small pictures cut on into it one after
// another, overlapping in a loose cluster between them (the people, places or things the line is about).
// Numbers: the words part 2.6 em over 9 f (expo out, 70 % by the second frame), the left word moving 45 % of it; the
// first picture 2 f after the part starts, then one every 2-3 f; tiles 1 x 1.15 em, reaching above and below the words,
// with a 0.04 em light edge, seeded offsets within the slot, each newer tile on top; once full, the slot narrows by
// 0.2 em over 10 f.
// Caution: real pictures of the subject (faces, products, places), four to seven of them; never icons or grey blanks.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

/**
 * PartStack: `text` set centred; at `at` the words after word `after` part from the ones before it, opening a slot `gap`
 * em wide, and `pictures` (files under public/, or nodes) cut on into the slot one every `every` frames, overlapping.
 */
export const PartStack: React.FC<{
  text: string;
  after: number;
  at?: number;
  pictures: Array<string | React.ReactNode>;
  every?: number;
  /** The slot's width in em (default 2.6). */
  gap?: number;
  size?: number;
  color?: string;
  /** The tiles' edge colour (default white at 85 %). */
  edge?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, after, at = 0, pictures, every = 2.5, gap = 2.6, size = 90, color = '#F2F1EE', edge = 'rgba(255,255,255,0.85)', leaveAt, x, y, font = fonts.serif, weight = 400, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.01em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  if (!L.ready || L.words.length < words.length || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const n = pictures.length;
  const fullAt = at + 2 + Math.round((n - 1) * every);
  const open = frame < at ? 0 : mix(prog(frame, at, 9, ease.out), 0, gap * size) - prog(frame, fullAt + 2, 10, ease.inOut) * 0.2 * size;
  const left = cx - L.width / 2;
  const top = cy - L.height / 2;
  const slotX = left + L.words[after].x + L.words[after].width + (L.words[after + 1].x - (L.words[after].x + L.words[after].width)) / 2 - open * 0.45;
  const tw = size * 1.0;
  const th = size * 1.15;
  const midY = top + L.words[0].xMid;
  return (
    <>
      {words.map((w, i) => (
        <span key={i} style={{ ...style, position: 'absolute', left: left + L.words[i].x + (i <= after ? -open * 0.45 : open * 0.55), top, whiteSpace: 'pre', color }}>
          {w}
        </span>
      ))}
      {pictures.map((p, i) => {
        if (frame < at + 2 + Math.round(i * every)) return null;
        // a loose cluster: seeded places inside the slot, the first ones high and left, later ones lower and right
        const fx = (i % 3) / 2 - 0.5 + (hash(i, seed) - 0.5) * 0.35;
        const fy = (Math.floor(i / 3) % 2) * 0.8 - 0.4 + (hash(i, seed + 5) - 0.5) * 0.3;
        const X = slotX + open / 2 + fx * Math.max(0, open - tw) * 0.9 - tw / 2;
        const Y = midY + fy * th - th / 2;
        return (
          <div key={i} style={{ position: 'absolute', left: X, top: Y, width: tw, height: th, overflow: 'hidden', border: `${Math.max(1, size * 0.03)}px solid ${edge}`, background: '#9a9a9a', boxSizing: 'border-box' }}>
            {typeof p === 'string' ? <Img src={staticFile(p)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p}
          </div>
        );
      })}
    </>
  );
};
