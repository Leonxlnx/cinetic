import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Radiate, RADIATE } from '../fx/Grids';
import { creep } from '../lib/handoff';
import { ACT, CUE, FPS, H, W } from '../timeline';
import { STOP_HANDOFF } from './Claim';
import { INK, LIGHT, useAbs } from './stage';

// RINGS - the graphic transition, in inverted colours: the claim's full stop is the first ring, born as a solid
// square at the centre, and square rings leave it at one constant speed on the beats (fx/Grids Radiate: born at the
// stop's size, the first one a little slower). Then the centre floods with the ink stage, growing by the same ratio
// every frame until it covers the frame: the end card opens on that ink.

export const BIRTHS = [ACT.rings.from, CUE.born1, CUE.born2, CUE.born3, CUE.born4, CUE.born5];

export const Rings: React.FC = () => {
  const F = useAbs('rings');
  const flood = F >= CUE.flood ? Math.min(Math.hypot(W, H) / 2 + 10, RADIATE.flood.from * U * RADIATE.flood.growth60 ** (((F - CUE.flood) * 60) / FPS)) : 0;
  const k = creep(F, ACT.rings.from, { pctPerSec: 0.04 }, FPS);
  return (
    <AbsoluteFill style={{ background: LIGHT.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `scale(${k.toFixed(5)})` }}>
        <Radiate frame={F} start={ACT.rings.from} births={BIRTHS} bornAt={STOP_HANDOFF / 2 / U} speeds={[13.5]} x={W / 2} y={H / 2} color={LIGHT.accent} />
        {flood > 0 && <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * flood, height: 2 * flood, background: INK.ground, transform: `translate3d(${(W / 2 - flood).toFixed(2)}px, ${(H / 2 - flood).toFixed(2)}px, 0)` }} />}
      </div>
    </AbsoluteFill>
  );
};
