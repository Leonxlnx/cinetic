// LockupType (logo, build): the mark holds alone at the centre, then slides left as the name appears beside it a letter
// at a time, each letter cut on at full strength; the lockup re-centres with every letter, so it ends centred.
// Numbers: letters at 1, 2, 3, 5, 6, 8 f after the slide starts (about 1.4 f a letter, uneven like a hand on keys),
// each letter's share of the re-centring glides in 5 f on expo out; the gap between mark and name 0.32 of the text size;
// `per={0}` puts the whole name on one frame and slides the lockup to centre in 10 f. The mark may build while it holds:
// pass a function `(p) => node` and it receives 0..1 over `build` frames from `at`.
// Caution: the letters keep the name's final spacing from their first frame (never wide letters that close up).
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp } from '../../motion';
import { useTextLayout } from '../../type';
import { fonts } from '../../fonts';

export const LockupType: React.FC<{
  name: string;
  /** The mark, or a function of its build progress 0..1. Drawn in a box `markW` wide, centred on the line. */
  mark: React.ReactNode | ((p: number) => React.ReactNode);
  markW: number;
  at?: number;
  /** Frames the mark holds alone before the name starts (the slide starts here). */
  hold?: number;
  /** Frames of the mark's own build (when `mark` is a function). */
  build?: number;
  /** Mean frames a letter (0: the whole name on one frame). */
  per?: number;
  /** Exact frames after the hold for each letter (overrides `per`). */
  times?: number[];
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  /** Gap between mark and name as a share of the text size. */
  gap?: number;
  x?: number;
  y?: number;
}> = ({ name, mark, markW, at = 0, hold = 18, build = 12, per = 1.4, times, size, color = '#16233A', style, gap = 0.32, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const ts = size ?? H * 0.07;
  const type: React.CSSProperties = { fontFamily: fonts.inter, fontSize: ts, fontWeight: 560, letterSpacing: '-0.025em', lineHeight: 1.1, color, whiteSpace: 'pre', ...style };
  const L = useTextLayout(name, type);
  if (f < at) return null;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const t = f - at - hold;
  const chars = Array.from(name);
  const measured = [1, 2, 3, 5, 6, 8];
  const tOf = (i: number) => (times ? times[Math.min(i, times.length - 1)] + Math.max(0, i - times.length + 1) : per === 0 ? 0 : per === 1.4 && i < measured.length ? measured[i] : Math.round(1 + i * per));
  const g = gap * ts;
  // right edge of the name after letter i (spaces ride with the letter before them)
  const edge = (i: number) => (L.chars[i] ? L.chars[i].x + L.chars[i].width : 0);
  let shown = -1;
  let wSmooth = markW;
  const glide = per === 0 ? 10 : 5;
  for (let i = 0; i < chars.length; i++) {
    const ti = tOf(i);
    if (t >= ti) shown = i;
    const share = (i === 0 ? g : 0) + edge(i) - (i > 0 ? edge(i - 1) : 0);
    wSmooth += share * ease.out(clamp((t - ti + 1) / glide));
  }
  const left = cx - wSmooth / 2;
  const markNode = typeof mark === 'function' ? mark(ease.out(clamp((f - at) / Math.max(1, build)))) : mark;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left, top: cy, width: markW, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{markNode}</div>
      {shown >= 0 && L.ready && (
        <div style={{ position: 'absolute', left: left + markW + g, top: cy - L.height / 2 - ts * 0.2, width: edge(shown) + 2, height: L.height + ts * 0.5, overflow: 'hidden' }}>
          <div style={{ ...type, position: 'absolute', left: 0, top: ts * 0.2 }}>{name}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
