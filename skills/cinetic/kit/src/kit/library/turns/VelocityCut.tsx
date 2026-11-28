// VelocityCut (turn, join): the old content creeps, its speed doubles every frame, the cut lands on the fastest frame,
// and the next content enters already moving the same way and brakes.
// Numbers: 5 f build, each step twice the last (about 6, 12, 24, 48, 96 px at 1920), 0.1 of the width in all; the next
// content enters 0.08 of the width back and settles in 6 f (most of it in the first 2).
// Caution: pass both scenes without their ground and give `ground`: the move shifts the content, not the world.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { SmearFilter, useUid } from '../_shared';
import { type Scenes, sp } from './_shared';

/**
 * VelocityCut: a cut hidden in a velocity hand-off. The outgoing content's step doubles every frame (r = 2), so it reads
 * as still, then gone; the cut lands on its fastest frame, and the incoming content starts displaced back along the same
 * direction and closes the distance geometrically (each frame keeps `q` of the rest), so its first frame moves about as
 * fast as the last outgoing one. Neither leaves the frame: the eye follows the speed, not the edge.
 * Measured: steps 1, 3, 6, 15 cell px on a 333 px cell (6, 17, 35, 87 px at 1920); entry 145, 40, 0 px.
 */
export const VelocityCut: React.FC<
  Scenes & {
    dir?: 'left' | 'right' | 'up' | 'down';
    /** Frames of the accelerating build (the cut is the frame after). */
    dur?: number;
    /** How far the old content travels, and how far back the new one enters, as a share of the frame along `dir`. */
    travel?: number;
    enter?: number;
    /** Frames for the new content to settle, and the share of the rest it keeps each frame. */
    land?: number;
    q?: number;
    /** Each step over the last (2: doubling). */
    r?: number;
    /** Directional smear in px at the fastest frame (0: sharp, as measured). */
    smear?: number;
    /** Painted under both (their shared ground). */
    ground?: string;
  }
> = ({ from, to, at: start, speed = 1, dir = 'left', dur = 5, travel = 0.1, enter = 0.08, land = 6, q = 0.3, r = 2, smear = 0, ground }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('vc');
  const D = sp(dur, speed);
  const L = sp(land, speed);
  const horiz = dir === 'left' || dir === 'right';
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  const span = horiz ? W : H;
  const cut = start + D;
  let off = 0;
  let node: React.ReactNode;
  let sm = 0;
  if (frame < start) node = from;
  else if (frame < cut) {
    // after k frames of build: (r^k - 1) / (r^D - 1) of the travel, the last step the largest
    const k = frame - start + 1;
    off = (sign * travel * span * (Math.pow(r, k) - 1)) / (Math.pow(r, D) - 1);
    sm = smear * Math.pow(r, k - D);
    node = from;
  } else if (frame < cut + L) {
    const k = frame - cut;
    const tail = Math.pow(q, L);
    off = (-sign * enter * span * (Math.pow(q, k) - tail)) / (1 - tail);
    sm = smear * Math.pow(q, k);
    node = to;
  } else node = to;
  const fid = `${uid}f${frame}`;
  return (
    <AbsoluteFill style={{ background: ground }}>
      {sm > 0.3 && <SmearFilter id={fid} x={horiz ? sm : 0} y={horiz ? 0 : sm} />}
      <AbsoluteFill style={{ transform: off ? (horiz ? `translateX(${off}px)` : `translateY(${off}px)`) : undefined, filter: sm > 0.3 ? `url(#${fid})` : undefined }}>{node}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The first frame the next content is at rest. */
export const velocityCutEnd = (at: number, o: { dur?: number; land?: number; speed?: number } = {}) => at + sp(o.dur ?? 5, o.speed) + sp(o.land ?? 6, o.speed);
