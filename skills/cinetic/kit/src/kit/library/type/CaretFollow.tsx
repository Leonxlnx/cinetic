// CaretFollow (type, enter): a prompt typed at a giant size; the caret blinks at the centre first, then the line types
// centred, growing from the middle; once it is as wide as the frame the camera holds the caret instead, jumping with it
// in short smeared moves, so the start of the line leaves the frame.
// Numbers: two blinks (on 10 f, off 6 f); the caret half the frame's height (cap height 38 %); a letter every 2-4 f;
// centred until the line fills 95 % of the width (gliding to each new centre, half-life 2 f, from rest), then the caret held at 60 % of the width, each frame closing 60 % of the
// gap (a jump of about 0.15 W over 2 f) with a horizontal smear of 6 % of the speed; the last words may take the accent.
// Caution: one per film: a prompt or a question that is the film's subject; keep it under about 40 characters.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { follow as chase } from '../../motion';
import { typingTimes, useTextLayout } from '../../type';
import { SmearFilter, useUid } from '../_shared';

/**
 * CaretFollow: from `at` the caret blinks `blinks` times at the centre, then `text` types at `cps`, centred and growing
 * from the middle (each letter starts a short critically damped glide to the new centre, half-life `glide` frames; 0
 * re-sets the line on the letter, as a cut); once the line would pass `fill` of the frame's width the camera holds the caret at `edge` instead
 * (each frame it closes `follow` of the gap), smeared sideways by its own speed. `accentFrom` colours the words from that
 * index on in `accent`.
 */
export const CaretFollow: React.FC<{
  text: string;
  at?: number;
  /** Characters a second (default 11: a letter every 2-4 f). */
  cps?: number;
  blinks?: number;
  /** Share of the width the centred line may fill before the camera takes over (default 0.95). */
  fill?: number;
  /** Where the camera holds the caret, as a share of the width (default 0.6). */
  edge?: number;
  /** Share of the gap the camera closes each frame (default 0.6). */
  follow?: number;
  accentFrom?: number;
  accent?: string;
  /** Font size in px (default 52 % of the height, the caret half the frame; at most 29 % of the width in a tall frame). */
  size?: number;
  color?: string;
  caretColor?: string;
  leaveAt?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
  /** Half-life in frames of the centred line's glide to each new centre (default 2; 0: exact, a cut per letter). */
  glide?: number;
}> = ({ text, at = 0, cps = 11, blinks = 2, fill = 0.95, edge = 0.6, follow = 0.6, accentFrom, accent = '#3A5BD9', size, color = '#E4E4E2', caretColor, leaveAt, y, font = fonts.inter, weight = 350, seed = 5, glide = 2 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const id = useUid('caret');
  const fs = size ?? Math.round(Math.min(height * 0.52, width * 0.29));
  const style = { fontFamily: font, fontWeight: weight, fontSize: fs, letterSpacing: '-0.02em', lineHeight: 1.1 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const typeAt = at + blinks * 16;
  const times = typingTimes(text, typeAt, fps, cps, seed);
  const nAt = (f: number) => times.filter((t) => f >= t).length;
  const caretAt = (f: number) => {
    const n = nAt(f);
    return n > 0 ? L.chars[n - 1].x + L.chars[n - 1].width : 0;
  };
  // where the line's left edge wants to be: centred while it fits, else with the caret at `edge`
  const target = (f: number) => {
    const w = caretAt(f);
    return w <= fill * width ? width / 2 - w / 2 : edge * width - w;
  };
  // the camera, chained frame by frame from the first key (the same whatever frame is rendered first); centring glides
  // (a critically damped chase of each letter's centre, or exact with glide 0), the follow eases
  const centred = [[typeAt, width / 2] as const, ...times.filter((t) => caretAt(t) <= fill * width).map((t) => [t, target(t)] as const)];
  let left = width / 2;
  let prev = left;
  for (let f = typeAt; f <= frame; f++) {
    const t = target(f);
    prev = left;
    left = caretAt(f) <= fill * width ? (glide > 0 ? chase(f, centred, glide) : t) : left + (t - left) * follow;
  }
  const speed = Math.abs(left - prev);
  const smear = caretAt(frame) > fill * width ? Math.min(24, speed * 0.06) : 0;
  const n = nAt(frame);
  const words = text.split(' ');
  const accentChar = accentFrom === undefined ? Infinity : words.slice(0, accentFrom).join(' ').length + (accentFrom > 0 ? 1 : 0);
  const caretX = caretAt(frame);
  const caretOn = frame < typeAt ? (frame - at) % 16 < 10 : true;
  const top = (y ?? height / 2) - L.height / 2;
  const g = L.chars[0];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <SmearFilter id={id} x={smear} />
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left}px, ${top}px)`, filter: smear > 0.4 ? `url(#${id})` : undefined }}>
        <span style={{ ...style, position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', color }}>
          {text.slice(0, Math.min(n, accentChar))}
          {n > accentChar && <span style={{ color: accent }}>{text.slice(accentChar, n)}</span>}
        </span>
        {caretOn && <div style={{ position: 'absolute', left: caretX + fs * 0.06, top: g.baseline - fs * 0.78, width: Math.max(3, fs * 0.05), height: fs * 0.92, background: caretColor ?? color }} />}
      </div>
    </div>
  );
};
