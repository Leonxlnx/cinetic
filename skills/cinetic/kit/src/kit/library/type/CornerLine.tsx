// CornerLine (type, enter / build): a line built word by word inside four small corner marks that jump outward as it
// widens; on its first frames each mark is a doubled dash in an accent that collapses to one small square.
// Numbers: marks 0.35 em left and right of the line, 0.25 em above and below; the doubled dash (two 10 x 3 px bars, 4 px
// apart at 1080 p) holds 2 f, one bar 2 f, then a 7 px square; the marks follow the line's width with 65 % of the move
// on the arrival frame (snap: 100 %); the words land as in InkLine.
// Caution: structure for one framed line at a time; never frame every line of a film.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { InkLine, inkLineLayout } from './InkLine';

/**
 * CornerLine: InkLine framed by four corner marks. The marks sit at the padded corners of the words shown so far and
 * jump outward with the line as each word lands (`lead` of the move on the arrival frame, 1 for a hard snap). From `at`
 * each mark arrives as a doubled dash in `flash` colour, drops to one bar, then settles to a small square in
 * `markColor` (`mark="bracket"` draws small L brackets instead of squares). The words take InkLine's tint and entry.
 */
export const CornerLine: React.FC<{
  text: string;
  at?: number;
  gap?: number;
  times?: number[];
  size?: number;
  color?: string;
  /** The tint words land in (see InkLine). */
  tint?: string | string[] | 'heat';
  settle?: number;
  mark?: 'square' | 'bracket';
  markColor?: string;
  /** The colour of the doubled dashes on the first frames (default the mark colour). */
  flash?: string;
  /** Share of the marks' and the line's move on the arrival frame (default 0.65). */
  lead?: number;
  space?: 'open' | 'close' | 'still';
  anticipate?: number;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, gap = 8, times, size = 84, color = '#141414', tint = '#7A2E45', settle = 18, mark = 'square', markColor, flash, lead = 0.65, space = 'still', anticipate = 1, leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  const T = words.map((_, i) => times?.[i] ?? Math.round(at + i * gap));
  if (!L.ready || L.words.length < words.length || frame < T[0] || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const tau = 2.4;
  const { left, right } = inkLineLayout(frame, L, T, { lead, tau, anticipate, space, maxWidth: 0 });
  // the ink's vertical extent: cap height above the baseline, a little below it
  const g = L.words[0];
  const yTop = cy - L.height / 2 + g.baseline - size * 0.74;
  const yBot = cy - L.height / 2 + g.baseline + size * 0.06;
  const px = size * 0.35;
  const py = size * 0.25;
  const u = Math.min(width, height) / 1080;
  const mc = markColor ?? color;
  const fc = flash ?? mc;
  const age = frame - T[0];
  const corners = [
    [cx + left - px, yTop - py, -1, -1],
    [cx + right + px, yTop - py, 1, -1],
    [cx + left - px, yBot + py, -1, 1],
    [cx + right + px, yBot + py, 1, 1],
  ] as const;
  const drawMark = ([X, Y, sx, sy]: readonly [number, number, number, number], i: number) => {
    if (age < 4) {
      // the doubled dash (an inner bar at the corner and an outer one 4 px beyond it), then the inner bar alone
      const bars = age < 2 ? 2 : 1;
      return Array.from({ length: bars }, (_, b) => (
        <div key={`${i}-${b}`} style={{ position: 'absolute', left: X - (sx < 0 ? 10 * u : 0) + sx * b * 14 * u, top: Y - 1.5 * u, width: 10 * u, height: 3 * u, background: fc }} />
      ));
    }
    if (mark === 'bracket') {
      const l = size * 0.22;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: sx < 0 ? X : X - l,
            top: sy < 0 ? Y : Y - l,
            width: l,
            height: l,
            [sx < 0 ? 'borderLeft' : 'borderRight']: `${Math.max(1, 2 * u)}px solid ${mc}`,
            [sy < 0 ? 'borderTop' : 'borderBottom']: `${Math.max(1, 2 * u)}px solid ${mc}`,
          }}
        />
      );
    }
    const s = Math.max(3, 7 * u);
    return <div key={i} style={{ position: 'absolute', left: X - s / 2, top: Y - s / 2, width: s, height: s, background: mc }} />;
  };
  return (
    <>
      <InkLine text={text} times={T} size={size} color={color} tint={tint} settle={settle} lead={lead} tau={tau} anticipate={anticipate} space={space} x={cx} y={cy} font={font} weight={weight} tracking={-0.02} />
      {corners.map(drawMark)}
    </>
  );
};
