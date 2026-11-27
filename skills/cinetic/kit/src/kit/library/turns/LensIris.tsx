// LensIris (turn, join): two large discs roll in from the sides and close over the old scene; the next scene opens in
// the lens-shaped gap between them (the overlap of two circles), a lit rim on its edge, widening until it passes the
// frame.
// Numbers: discs 0.62 of the height in radius, framing a gap of 0.3 of the width, shut in 6 f on an ease-in; the lens
// opens in 5 f, half-width 0.07, 0.3, 0.53, 0.77, 1 of its end; lens circles 1.8 of the height in radius.
// Caution: the discs' colour must be the next scene's dark ground or the old scene's own objects; a new colour reads as a wipe.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';
import { type Scenes, sp } from './_shared';

/**
 * LensIris: two discs frame the old scene, close over it, and the next scene opens between them in a vesica (the
 * intersection of two circles whose centres approach each other) that widens sideways while it is already taller than
 * the frame, so it reads as an eye opening. Outside the lens the frame is the discs' colour; the rim fades as it opens.
 * It covers the frame on its last frame (solved, not guessed). Measured: 6 f shut, 5 f open, rim glow 3 px.
 */
export const LensIris: React.FC<
  Scenes & {
    /** The discs' colour (and the frame outside the lens). */
    color: string;
    /** The lens rim's colour (a light the film uses). */
    rim?: string;
    /** First frame the discs roll in from off the frame (default `at` - 14). */
    enterAt?: number;
    /** Frames for the discs to shut, and for the lens to open. */
    dur?: number;
    open?: number;
    /** The gap the discs frame before they shut, as a share of the width. */
    gap?: number;
  }
> = ({ from, to, at: start, speed = 1, color, rim, enterAt, dur = 6, open = 5, gap = 0.3 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const S = sp(dur, speed);
  const O = sp(open, speed);
  const e0 = enterAt ?? start - sp(14, speed);
  const cut = start + S;
  if (frame < e0) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= cut + O) return <AbsoluteFill>{to}</AbsoluteFill>;
  const cx = W / 2;
  const cy = H / 2;
  if (frame < cut) {
    // the discs grow as they shut (the camera pushes in) so that, shut, they cover every corner: no sliver of the old
    // scene is left for the lens frame to cut away
    const R0 = 0.62 * H;
    let Rs = Math.max(R0, cx, H / 2);
    for (let i = 0; i < 60 && (cx - 0.2 * Rs) ** 2 + (H / 2) ** 2 > Rs * Rs; i++) Rs *= 1.03;
    Rs *= 1.02;
    const q = frame < start ? 0 : ease.in(t01(frame, start, S));
    const Rd = mix(q, R0, Rs);
    const frameX = cx - (gap * W) / 2 - Rd; // left disc centre framing the gap
    const offX = -Rd - 4; // left disc fully off the frame
    const shutX = cx - Rd * 0.2; // overlapping a little at the centre
    const xl = frame < start ? mix(ease.out(t01(frame, e0, Math.max(1, start - e0))), offX, frameX) : mix(q, frameX, shutX);
    const disc = (x: number) => (
      <div style={{ position: 'absolute', left: x - Rd, top: cy - Rd, width: Rd * 2, height: Rd * 2, borderRadius: '50%', background: color, boxShadow: rim ? `inset 0 0 0 ${Math.max(1, H / 540)}px ${rim}40, 0 0 ${H / 36}px ${rim}26` : undefined }} />
    );
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill>{from}</AbsoluteFill>
        {disc(xl)}
        {disc(2 * cx - xl)}
      </AbsoluteFill>
    );
  }
  const Rl = 1.8 * H;
  const dEnd = Math.sqrt(Rl * Rl - (H / 2) * (H / 2)) - W / 2 - 6;
  const hwEnd = Rl - Math.max(0, dEnd);
  // 0 on the first open frame (the measured slit), 1 on the last
  const p = O > 1 ? (frame - cut) / (O - 1) : 1;
  const hw = hwEnd * mix(p, 0.074, 1);
  const d = Rl - hw;
  const hh = Math.sqrt(Math.max(0, Rl * Rl - d * d));
  const path = `M${cx} ${cy - hh}A${Rl} ${Rl} 0 0 1 ${cx} ${cy + hh}A${Rl} ${Rl} 0 0 1 ${cx} ${cy - hh}Z`;
  return (
    <AbsoluteFill style={{ background: color, overflow: 'hidden' }}>
      <AbsoluteFill style={{ clipPath: `path('${path}')` }}>{to}</AbsoluteFill>
      {rim && p < 1 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 1 - p * 0.8 }}>
          <path d={path} fill="none" stroke={rim} strokeWidth={Math.max(2, (3 * Math.min(W, H)) / 1080)} style={{ filter: `drop-shadow(0 0 ${(10 * Math.min(W, H)) / 1080}px ${rim})` }} />
        </svg>
      )}
    </AbsoluteFill>
  );
};
