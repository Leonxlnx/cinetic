// FrostEdge (fx, idle, exit): a frosted band at the top (or bottom) of a scrolling column: what slides into it goes soft and
// pale as if passing under frosted glass, so a chat or a feed scrolls away under its header without being cut by a hard
// edge. With `clearAt` the whole surface starts frosted and clears.
// Numbers: the band 18-24 % of the column; blur 0 at its lower edge to 10 px at the top, opacity 1 to 0 over the same
// span; a clearing surface goes from 14 px of blur and 60 % milk to clear in 14-18 f on an ease-out.
// Caution: the band must sit under something (a header, an avatar, the frame edge); a frosted strip in the middle of open
// space reads as a smudge.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease } from '../../motion';

/**
 * FrostEdge: `children` (a column `w` x `h` px, its content moving under it) drawn sharp below the band and frosted inside
 * it: `band` px at the `edge`, blurred up to `blur` px and fading out toward the edge. `clearAt` (and `clearDur`) makes
 * the whole column start frosted (`milk` its white veil) and clear.
 */
export const FrostEdge: React.FC<{
  w: number;
  h: number;
  band?: number;
  edge?: 'top' | 'bottom';
  blur?: number;
  clearAt?: number;
  clearDur?: number;
  milk?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ w, h, band, edge = 'top', blur = 10, clearAt, clearDur = 16, milk = 0.6, children, style }) => {
  const frame = useCurrentFrame();
  const b = band ?? h * 0.22;
  const dir = edge === 'top' ? 'to bottom' : 'to top';
  const pb = (b / h) * 100;
  // complementary masks across the lower part of the band (their alphas sum to 1, so nothing prints twice); the frosted
  // copy also fades out toward the edge
  const sharpMask = `linear-gradient(${dir}, transparent 0%, transparent ${pb * 0.45}%, #000 ${pb * 0.95}%, #000 100%)`;
  const frostMask = `linear-gradient(${dir}, transparent 0%, #000 ${pb * 0.3}%, #000 ${pb * 0.45}%, transparent ${pb * 0.95}%)`;
  const clear = clearAt === undefined ? 1 : ease.out(clamp((frame - clearAt) / clearDur));
  const whole = (1 - clear) * 14;
  return (
    <div style={{ position: 'relative', width: w, height: h, ...style }}>
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: sharpMask, maskImage: sharpMask, filter: whole > 0.3 ? `blur(${whole.toFixed(2)}px)` : undefined }}>{children}</div>
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: frostMask, maskImage: frostMask, filter: `blur(${(blur + whole).toFixed(2)}px)` }}>{children}</div>
      {clear < 1 && <div style={{ position: 'absolute', inset: 0, background: `rgba(255,255,255,${(milk * (1 - clear)).toFixed(3)})`, borderRadius: 'inherit' }} />}
    </div>
  );
};
