// TiltLift (turn, join): the old line lifts and smears upward while a large card, tilted back in perspective, rises from
// below the frame blurred; the next ground floods up from the bottom behind it; the card is sharp in 4 f and settles flat.
// Numbers: card from 0.6 of the height below, 80 % of the rise in 2 f (expo out over 9 f); vertical smear 20 px to 0
// by f4; tilt 28 to 0 deg over 30 f (quint out); the flood covers in 3 f.
// Caution: the card must be big (most of the width) and the next ground a colour the film uses; a small card reads as a pop.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, mix } from '../../motion';
import { SmearFilter, t01, useUid } from '../_shared';
import { type Scenes, sp } from './_shared';

/**
 * TiltLift: a blur-lift into a tilted card. `from` is the old scene; `to` is the next scene's card layer (full frame,
 * no ground: the card where it rests), `ground` the next scene's ground. On `at` the old content lifts with a
 * vertical smear, half the height in 3 f (it never fades: the card and the flood cover it), the card enters from below already blurred and
 * tilted back, the ground floods up from the bottom edge with a soft top, and the card sharpens and settles flat.
 * Measured: card covers ~80 % of its rise in 2 f, sharp on f4; ground white to blue from the bottom over 3 f.
 */
export const TiltLift: React.FC<
  Scenes & {
    ground: string;
    /** Frames for the rise, and for the tilt to settle flat after it. */
    dur?: number;
    settle?: number;
    /** The card's first tilt (deg, leaning back) and how far below it starts (a share of the height). */
    tilt?: number;
    rise?: number;
    /** Vertical smear on the card's first frame, px at a 1080 frame. */
    smear?: number;
  }
> = ({ from, to, at: start, speed = 1, ground, dur = 9, settle = 21, tilt = 28, rise = 0.6, smear = 20 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('tl');
  const D = sp(dur, speed);
  const S = sp(settle, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  const u = Math.min(W, H) / 1080;
  const k = frame - start;
  const all = D + S;
  const rot = tilt * (1 - ease.soft(t01(frame, start, all)));
  const done = frame >= start + all;
  const yCard = mix(ease.out(t01(frame, start, D)), rise * H, 0);
  const sm = smear * u * Math.max(0, 1 - k / sp(4, speed));
  // the old content lifts with a smear, accelerating (0.04, 0.22, 0.5 of the height on its three frames), so the line is
  // above the rising card's soft top edge before the card reaches it; the strip it uncovers at the bottom is filled by
  // the old scene's own bottom band, held in place (its ground), until the flood covers it
  const LIFT = [0.04, 0.22, 0.5];
  const kl = Math.min(2, Math.floor((frame - start) / Math.max(1, sp(1, speed))));
  const liftPx = H * LIFT[Math.max(0, kl)];
  const oldSm = 30 * u * (kl + 1) / 3;
  // the flood from the bottom, one step a frame, as measured (a glow at the bottom, the lower 30 %, about half, all)
  const fk = (frame - start) / Math.max(1, sp(1, speed));
  // (solid below `top`, soft for 0.15 of the height above it; it always covers the strip the lifted scene uncovers)
  const top = fk < 1 ? 0.97 * H : fk < 2 ? 0.85 * H : fk < 3 ? 0.5 * H : -0.01 * H;
  const fid = `${uid}c${frame}`;
  const oid = `${uid}o${frame}`;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {frame < start + sp(3, speed) && (
        <>
          <AbsoluteFill style={{ clipPath: `inset(${H - liftPx - 2}px 0 0 0)` }}>{from}</AbsoluteFill>
          {oldSm > 0.3 && <SmearFilter id={oid} x={0} y={oldSm} />}
          <AbsoluteFill style={{ transform: `translateY(${-liftPx}px)`, filter: oldSm > 0.3 ? `url(#${oid})` : undefined }}>{from}</AbsoluteFill>
        </>
      )}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, transparent ${top - 0.15 * H}px, ${ground} ${top}px)` }} />
      {done ? (
        <AbsoluteFill>{to}</AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ perspective: 1600 * u, perspectiveOrigin: '50% 30%' }}>
          {sm > 0.3 && <SmearFilter id={fid} x={0} y={sm} />}
          <AbsoluteFill style={{ transformOrigin: '50% 100%', transform: `translateY(${yCard}px) rotateX(${rot}deg)`, filter: sm > 0.3 ? `url(#${fid})` : undefined }}>{to}</AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** The first frame the card rests flat. */
export const tiltLiftEnd = (at: number, o: { dur?: number; settle?: number; speed?: number } = {}) => at + sp(o.dur ?? 9, o.speed) + sp(o.settle ?? 21, o.speed);
