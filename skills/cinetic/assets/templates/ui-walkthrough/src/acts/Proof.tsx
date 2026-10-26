import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Stack } from '../fx/Stack';
import { Notice } from '../kit';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { Cam, DARK, LIGHT, useAbs } from './stage';

// PROOF - results arriving as notices, faster and faster (fx/Stack): the newest rises from behind into the front
// slot, the older ones step back smaller and softer, the pile re-centring as it grows. The act opens on a blur-snap
// zoom (x1.12 settling in 6 f, a defocus clearing) and creeps; in its last frames a light panel wipes up from the
// bottom, accelerating, and the claim opens on it.

export const TOASTS = ['toast0', 'toast1', 'toast2', 'toast3', 'toast4'].map((k) => CUE[k]);

export const Proof: React.FC = () => {
  const F = useAbs('proof');
  const t = DARK;
  const open = prog(F, ACT.proof.from, ACT.proof.from + f60x(12), E.snapOut);
  const k = lmix(1.12, 1, open) * creep(F, ACT.proof.from, { pctPerSec: 0.06 }, FPS);
  const soft = mix(6, 0, clamp((F - ACT.proof.from) / f60x(8)));
  // the wipe into the claim: a light panel rising from the bottom edge, covering the frame on the act line
  const wipe = prog(F, CUE.wipe, ACT.claim.from, E.launchIn);
  const n = Math.min(WALK.proof.length, TOASTS.length);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Defocus sigma={soft}>
        <Cam k={k}>
          <Stack
            frame={F}
            arrivals={TOASTS.slice(0, n)}
            x={W / 2}
            y={H / 2 - 40 * U}
            width={1180 * U}
            height={200 * U}
            render={(i) => <Notice theme={t} w={1180 * U} h={200 * U} glyph="bolt" title={WALK.proof[i].title} body={WALK.proof[i].body} meta={WALK.proof[i].meta} id={`proof-${i}`} />}
          />
        </Cam>
      </Defocus>
      {wipe > 0 && <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, background: LIGHT.ground, transform: `translate3d(0, ${((1 - wipe) * H).toFixed(2)}px, 0)` }} />}
    </AbsoluteFill>
  );
};
