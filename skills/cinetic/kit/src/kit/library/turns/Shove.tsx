// Shove (turn, join / exit): the old scene is cut into bands shoved off one after another while the next slides in
// underneath and lands.
// Numbers: bands 2-3 f apart, 14 f each on expo in, smear up to 28 px; the next scene drops 35 % of the frame and
// lands over 16 f.
// Caution: put the cuts between lines; give ground whenever the next scene is drawn without one.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease } from '../../motion';
import { SmearFilter, t01, useUid } from '../_shared';
import { type Scenes, sp } from './_shared';

/**
 * Shove: the old scene is cut into bands that are shoved off one after another, accelerating, each smearing on its fastest
 * frames (alternate bands may go the other way, so the lines peel apart), while the next scene slides in underneath from
 * another side and lands. The next scene is full-frame from the first frame, so there is never a gap.
 * Measured: bands 2 f apart, each 14 f ease-in out of frame with a smear on the last 3 f; the incoming scene drops ~35 % of
 * the frame and lands with expo out over ~16 f. Clean: every band (and its smear) is off the frame on its last drawn frame,
 * and the incoming scene starts to land only in the last band's fast frames, so no slab of the old scene stays beside it.
 */
export const Shove: React.FC<
  Scenes & {
    /** Where the old bands go. */
    dir?: 'left' | 'right' | 'up' | 'down';
    bands?: number;
    lag?: number;
    dur?: number;
    /** Odd bands go the other way. */
    alternate?: boolean;
    /** Where the next scene comes from, and how far it travels (a share of the frame). */
    enterFrom?: 'top' | 'bottom' | 'left' | 'right';
    enter?: number;
    land?: number;
    smear?: number;
    /** Painted under the incoming scene (its ground), in case it is drawn without one. */
    ground?: string;
    /** Band edges in px across the bands (put them between lines of type); overrides `bands`. */
    cuts?: number[];
  }
> = ({ from, to, at: start, speed = 1, dir = 'left', cuts, bands: nb = 4, lag = 2, dur = 14, alternate = false, enterFrom = 'top', enter = 0.35, land = 16, smear = 28, ground }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('sv');
  const edges = cuts ? [0, ...cuts, (dir === 'left' || dir === 'right' ? H : W) ] : null;
  const bands = edges ? edges.length - 1 : nb;
  const D = sp(dur, speed);
  const LG = Math.max(0, Math.round(lag / speed));
  const LD = sp(land, speed);
  // the next scene lands only once the last band is in its fast frames: no band of the old scene shares a frame with the
  // next scene settled and readable
  const landAt = start + (bands - 1) * LG + Math.max(2, D - 4);
  const end = Math.max(start + D + (bands - 1) * LG, landAt + LD);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}</AbsoluteFill>;
  const horiz = dir === 'left' || dir === 'right';
  const size = horiz ? W : H;
  // every band is wholly off the frame (its smear too) on its last drawn frame: nothing of the old scene is left behind
  const travel = size + 2 * smear + 24;
  const qLast = ease.in((D - 1) / D) || 1;
  const u = ease.out(t01(frame, landAt, LD));
  const eo = (1 - u) * enter * (enterFrom === 'top' || enterFrom === 'bottom' ? H : W) * (enterFrom === 'top' || enterFrom === 'left' ? -1 : 1);
  const et = enterFrom === 'top' || enterFrom === 'bottom' ? `translateY(${eo}px)` : `translateX(${eo}px)`;
  const strips: React.ReactNode[] = [];
  for (let k = 0; k < bands; k++) {
    const s0 = start + k * LG;
    const t = t01(frame, s0, D);
    if (t >= 1) continue;
    const sign = (dir === 'left' || dir === 'up' ? -1 : 1) * (alternate && k % 2 ? -1 : 1);
    const q = Math.min(1, ease.in(t) / qLast);
    const v = Math.abs(Math.min(1, ease.in(t01(frame + 1, s0, D)) / qLast) - q) * travel;
    const o = sign * q * travel;
    const a = edges ? edges[k] : (k / bands) * (horiz ? H : W);
    const b = edges ? edges[k + 1] : ((k + 1) / bands) * (horiz ? H : W);
    const clip = horiz ? `inset(${a}px 0 ${H - b - 0.5}px 0)` : `inset(0 ${W - b - 0.5}px 0 ${a}px)`;
    const blur = Math.min(smear, v * 0.25);
    const id = `${uid}${k}f${frame}`;
    strips.push(
      <AbsoluteFill key={k} style={{ clipPath: clip }}>
        {blur > 0.5 && <SmearFilter id={id} x={horiz ? blur : 0} y={horiz ? 0 : blur} />}
        <AbsoluteFill style={{ transform: horiz ? `translateX(${o}px)` : `translateY(${o}px)`, filter: blur > 0.5 ? `url(#${id})` : undefined }}>{from}</AbsoluteFill>
      </AbsoluteFill>,
    );
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: ground }}>
      <AbsoluteFill style={{ transform: et }}>{to}</AbsoluteFill>
      {strips}
    </AbsoluteFill>
  );
};
