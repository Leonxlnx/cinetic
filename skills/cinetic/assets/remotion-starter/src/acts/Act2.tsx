import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { C } from '../brand/tokens';
import { bakePlate } from '../fx/Gradients';
import { Photo } from '../fx/Photo';
import { E, fd, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ACT, CUE, H, W } from '../timeline';
import { lineCutSpeed, statementSize } from './Act1';
import { OPEN, PLATE_MOVE, PLATE_PARALLAX, PLATE_SLICES, plateRoom, plateShift, SET_FRAMES } from './plate';

// ACT 2 - the picture takes its turn, with no words. The plate (the film's real imagery: a stand-in until the
// film's photograph replaces it, acts/plate.tsx) opens already moving left at 0.7 of the statement's speed on
// its last frame (lib/handoff carry), decays to a slow push and drift, and its depth slices part as it moves.
// A band of light crosses it once, left to right; on the beat the film cuts closer into the same set, the drift
// keeping its direction. A second later the closer frame contracts into the next line (Act3).

/** The light band that crosses the plate (frames local to the act): off the frame again before the morph. */
const BAND = { from: 0, to: CUE.plateCut - ACT.plate.from - 4, w: 760, over: 240 };

export const Act2: React.FC = () => {
  const f = useCurrentFrame();
  const film = useFilm();
  const F = f + ACT.plate.from;
  const vCut = lineCutSpeed(film, statementSize());
  const band = bakePlate('linear', [{ at: 0, color: C.white, alpha: 0 }, { at: 0.5, color: C.white, alpha: 0.55 }, { at: 1, color: C.white, alpha: 0 }], BAND.w, 64);
  const bx = -BAND.w - BAND.over + (W + BAND.w + 2 * BAND.over) * prog(f, BAND.from, BAND.to, E.stdInOut);
  const shot = SET_FRAMES()[fd(F) >= CUE.plateCut ? 1 : 0];
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${plateShift(F, vCut)[0].toFixed(2)}px)` }}>
        <Photo photo={shot.photo} scale={shot.scale} frame={F} move={PLATE_MOVE} room={plateRoom(vCut)} slices={PLATE_SLICES} parallax={PLATE_PARALLAX} anchor={[0.5, 0.5]} style={OPEN} />
      </div>
      <Img src={band} style={{ position: 'absolute', left: 0, top: 0, width: BAND.w, height: H, transform: `translateX(${bx.toFixed(2)}px)`, mixBlendMode: 'soft-light' }} />
    </AbsoluteFill>
  );
};
