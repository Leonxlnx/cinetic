// StepWhip (type, enter): each word cuts on inside its own slot, its letters shifted right and cropped at the slot's
// edge, and jumps left in halving steps on a 12 fps clock until it sits; the slots are the words' fixed places, so the
// line never re-centres, no word is ever drawn away from its place (the line never starts spaced and closes), and its
// spacing breathes a little while it holds.
// Numbers: offsets 0.72, 0.38, 0.19, 0.09, 0.05, 0.02, 0 of the word's own width, each held 2 or 3 f (smeared sideways
// 0.08 em on the second step only); words 2 f apart inside a phrase, about 10 f between phrases; while holding, each gap moves by up to 0.08
// em every 2 f.
// Caution: a stepped, hand-made voice: one line, short words; never on a calm brand.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { useUid } from '../_shared';
import { hash, WideSmear } from './_shared';

const STEPS = [5.3, 2.0, 1.0, 0.5, 0.25, 0.12, 0];
/** The same halving steps as shares of the word's own width (the word whips in inside its slot). */
const SHARE = [0.72, 0.38, 0.19, 0.09, 0.05, 0.02, 0];
const HOLDS = [2, 3, 2, 3, 2, 3];

/** Offset (em) of a word `age` frames after it cut on, and whether this is the smeared step. */
export const whipOffset = (age: number) => {
  let t = 0;
  for (let i = 0; i < HOLDS.length; i++) {
    if (age < t + HOLDS[i]) return { em: STEPS[i], share: SHARE[i], smear: i === 1 };
    t += HOLDS[i];
  }
  return { em: 0, share: 0, smear: false };
};

/**
 * StepWhip: `text` set centred with every word at its fixed place; word i cuts on at `times[i]` (or `at + i * gap`)
 * and steps in from the right inside its own slot (cropped at the slot's edges, so it never shows away from its place). `breathe` keeps the gaps moving slightly once the words sit (until `still`).
 */
export const StepWhip: React.FC<{
  text: string;
  at?: number;
  gap?: number;
  times?: number[];
  breathe?: boolean;
  /** Frame the breathing stops (default never). */
  still?: number;
  size?: number;
  color?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, gap = 2, times, breathe = true, still, size = 80, color = '#1A1A1A', leaveAt, x, y, font = fonts.inter, weight = 500, seed = 4 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = useUid('whip');
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  const T = words.map((_, i) => times?.[i] ?? at + i * gap);
  if (!L.ready || L.words.length < words.length || frame < T[0] || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const left = (x ?? width / 2) - L.width / 2;
  const top = (y ?? height / 2) - L.height / 2;
  const lastIn = T[T.length - 1] + 15;
  const tick = Math.floor(frame / 2);
  return (
    <div style={{ position: 'absolute', left, top, height: L.height }}>
      <WideSmear id={id} x={size * 0.08} />
      {words.map((w, i) => {
        const age = frame - T[i];
        if (age < 0) return null;
        const { share, smear } = whipOffset(age);
        // the spacing breathes: every word after the first moves by a small seeded amount every 2 frames
        const b = breathe && i > 0 && frame >= lastIn && (still === undefined || frame < still) ? (hash(i * 31 + tick, seed) - 0.5) * 0.16 * size : 0;
        const ww = L.words[i].width;
        const pad = size * 0.06;
        // the slot: the word's own box (a little wider for overhanging glyphs), cropping the letters while they step in
        return (
          <div key={i} style={{ position: 'absolute', left: L.words[i].x + b - pad, top: 0, width: ww + pad * 2, height: L.height, overflow: 'hidden' }}>
            <span style={{ ...style, position: 'absolute', transform: `translate(${pad + share * ww}px, ${0}px)`, left: 0, top: 0, whiteSpace: 'pre', color, filter: smear ? `url(#${id})` : undefined }}>
              {w}
            </span>
          </div>
        );
      })}
    </div>
  );
};
