import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../brand/tokens';
import { bakePlate } from '../fx/Gradients';
import { LightField, type LightFieldProps } from '../fx/LightField';
import { E } from '../lib/anim';
import { CUE, H, W } from '../timeline';

// The paper stage of the two type acts: a neutral ground (the mist token, a step under paper) with living
// light on it, one hue (white), baked and dithered, moved by transform and opacity only (fx/LightField).
// Two pools wander on closed loops; the light rises a little as each statement lands. Pure in the absolute
// frame, so the light carries on from Act1 into Act3 as if the camera never left the room.

/** The light on the paper at absolute frame F (one source for both acts). */
export const paperLight = (): LightFieldProps => {
  const pool = bakePlate('radial', [{ at: 0, color: C.white, alpha: 0.95 }, { at: 0.45, color: C.white, alpha: 0.5 }, { at: 1, color: C.white, alpha: 0 }], 640, 640);
  return {
    pools: [
      { plate: pool, size: 1500, centre: [W * 0.62, H * 0.44], period: 4, freq: [1, 2], opacity: 0.95, breathe: { period: 4, amp: 0.08 } },
      { plate: pool, size: 1100, centre: [W * 0.24, H * 0.7], period: 4, freq: [1, 1], phase: 0.4, opacity: 0.6 },
    ],
    glowRise: [
      { at: CUE.land, gain: 1.25, dur: 18, fall: 60, ease: E.softOut, fallEase: E.softIn },
      { at: CUE.fragC, gain: 1.25, dur: 24, fall: 70, ease: E.softOut, fallEase: E.softIn },
    ],
  };
};

/** The paper ground and its light, for an act whose first absolute frame is `from`. */
export const Paper: React.FC<{ frame: number; from: number }> = ({ frame, from }) => (
  <AbsoluteFill style={{ background: C.mist }}>
    <LightField frame={frame + from} {...paperLight()} />
  </AbsoluteFill>
);
