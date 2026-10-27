import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../brand/tokens';
import { GROUND, type GroundSpec, LitGround } from '../fx/Grounds';
import { type GlowRise, lightFieldState } from '../fx/LightField';
import { E } from '../lib/anim';
import { CUE } from '../timeline';

// The paper stage of the two type acts: a clean ground (the mist token, a step under paper) keyed from one side by
// the film's light (fx/Grounds wash: the key side a little lighter, the far side falling into the ground's own shade,
// drifting on a slow loop), so the light is felt and never seen as a glow; no pool of light sits behind a line
// (references/lighting.md, look-audit ground-haze). The light event: the key strengthens a little as each statement
// lands (a rise of the swing from the house 0.06 toward 0.10, then back). Pure in the absolute frame, so the light
// carries on from Act1 into Act3 as if the camera never left the room.

/** The paper ground: the house wash on mist, at the house swing. */
export const PAPER: GroundSpec = { kind: 'wash', base: C.mist, lift: GROUND.lift, seed: 7 };
/** The same ground with the key at its strongest (the swing the rises reach at their peak). */
const PAPER_LIT: GroundSpec = { ...PAPER, lift: 0.1 };

/** The key rises as each statement lands (absolute frames): up over `dur`, back over `fall`. */
export const PAPER_RISES: GlowRise[] = [
  { at: CUE.land, gain: 2, dur: 18, fall: 60, ease: E.softOut, fallEase: E.softIn },
  { at: CUE.fragC, gain: 2, dur: 24, fall: 70, ease: E.softOut, fallEase: E.softIn },
];

/** How far the key has risen at absolute frame F: 0 at rest, 1 at a rise's peak. */
export const paperRise = (F: number) => Math.min(1, Math.max(0, lightFieldState(F, { glowRise: PAPER_RISES }).gain - 1));

/** The paper ground and its light, for an act whose first absolute frame is `from`. */
export const Paper: React.FC<{ frame: number; from: number }> = ({ frame, from }) => {
  const F = frame + from;
  const rise = paperRise(F);
  return (
    <AbsoluteFill>
      <LitGround frame={F} spec={PAPER} />
      {rise > 0.002 && (
        <AbsoluteFill style={{ opacity: rise }}>
          <LitGround frame={F} spec={PAPER_LIT} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
