// WhipGate (turn, join): an accelerating whip, a two-frame gate inside the blur, and the next scene arriving at whip
// speed, its smear clearing.
// Numbers: 12 f build on cubic-bezier(0.23, 0, 0.72, 0.12), 260 px, smear 1-26 px; 2 gate frames; lands in 8 f from
// 160 px back.
// Caution: both scenes should share a ground tone; the gate does not hide a jump from light to dark.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, type Ease, mix } from '../../motion';
import { SmearFilter, t01, useUid } from '../_shared';
import { type Scenes, sp } from './_shared';

const bz = (a: number, b: number, c: number, d: number): Ease => Easing.bezier(a, b, c, d);

const whipCurve = bz(0.23, 0, 0.72, 0.12);

/**
 * WhipGate: an accelerating whip that never brakes, a two-frame gate inside the blur (the old and the next scene crossed in
 * one smeared exposure, then the next scene torn into horizontal streaks), and the next scene arriving at whip speed, its
 * smear clearing as it slows. The cut hides inside the fastest frames; no frame is lighter or darker than the scenes.
 * Measured: 12 f build (cubic-bezier 0.23, 0, 0.72, 0.12), +245 px, stage blur 2 to 26 px; 2 gate frames; the next scene
 * enters ~140 px behind its rest with a 20 px smear and lands in ~8 f.
 */
export const WhipGate: React.FC<
  Scenes & {
    /** Where the content travels. */
    dir?: 'left' | 'right' | 'up' | 'down';
    dur?: number;
    dist?: number;
    smear?: number;
    land?: number;
    enter?: number;
  }
> = ({ from, to, at: start, speed = 1, dir = 'right', dur = 12, dist = 260, smear = 26, land = 8, enter = 160 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('wg');
  const D = sp(dur, speed);
  const L = sp(land, speed);
  const gate = start + D;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= gate + 2 + L) return <AbsoluteFill>{to}</AbsoluteFill>;
  const horiz = dir === 'left' || dir === 'right';
  const sign = dir === 'right' || dir === 'down' ? 1 : -1;
  const sm = (id: string, px: number) => <SmearFilter id={id} x={horiz ? px : 0} y={horiz ? 0 : px} />;
  // a scene moved by o px, with a mirrored copy filling the side it uncovers: the edge is continuous, so the frame never
  // shows a gap or the ground behind the turn, and the smear runs across the seam
  const pan = (node: React.ReactNode, o: number, filter?: string, extra?: React.CSSProperties) => {
    const size = horiz ? W : H;
    const m = o - Math.sign(o || 1) * size;
    const t = (v: number) => (horiz ? `translateX(${v}px)` : `translateY(${v}px)`);
    const flip = horiz ? 'scaleX(-1)' : 'scaleY(-1)';
    return (
      <AbsoluteFill style={{ filter, ...extra }}>
        <AbsoluteFill style={{ transform: t(o) }}>{node}</AbsoluteFill>
        {Math.abs(o) > 0.5 && <AbsoluteFill style={{ transform: `${t(m)} ${flip}` }}>{node}</AbsoluteFill>}
      </AbsoluteFill>
    );
  };
  if (frame < gate) {
    const t = t01(frame, start, D);
    const o = sign * dist * whipCurve(t);
    const b = mix(t * t, 1, smear);
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sm(`${uid}a${frame}`, b)}
        {pan(from, o, `url(#${uid}a${frame})`)}
      </AbsoluteFill>
    );
  }
  if (frame === gate) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sm(`${uid}g`, smear * 2.2)}
        {pan(to, -sign * enter * 1.5, `url(#${uid}g)`)}
        {pan(from, sign * dist * 1.35, `url(#${uid}g)`, { opacity: 0.5 })}
      </AbsoluteFill>
    );
  }
  if (frame === gate + 1) {
    const dirn = horiz ? '180deg' : '90deg';
    const lines = `repeating-linear-gradient(${dirn}, #000 0 2px, transparent 2px 5px, rgba(0,0,0,.7) 5px 6px, transparent 6px 11px)`;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sm(`${uid}s`, smear * 1.6)}
        {sm(`${uid}t`, smear * 4)}
        {pan(to, -sign * enter * 1.15, `url(#${uid}s)`)}
        {pan(to, -sign * enter * 0.8, `url(#${uid}t)`, { WebkitMaskImage: lines, maskImage: lines })}
      </AbsoluteFill>
    );
  }
  const u = t01(frame, gate + 2, L);
  const o = -sign * enter * (1 - ease.out(u));
  const b = smear * 0.8 * Math.pow(1 - u, 2);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {sm(`${uid}l${frame}`, b)}
      {pan(to, o, b > 0.3 ? `url(#${uid}l${frame})` : undefined)}
    </AbsoluteFill>
  );
};

export const whipGateEnd = (at: number, o: { dur?: number; land?: number; speed?: number } = {}) => at + sp(o.dur ?? 12, o.speed) + 2 + sp(o.land ?? 8, o.speed);
