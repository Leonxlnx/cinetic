import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { Act1 } from './acts/Act1';
import { Act2 } from './acts/Act2';
import { Act3 } from './acts/Act3';
import { Act4 } from './acts/Act4';
import { C } from './brand/tokens';
import { ActStage } from './fx/Float';
import type { FloatOpts } from './lib/drift';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT } from './timeline';

/** Written by `npm run audio` (the licensed track with the effects levelled over it). Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

/** audit: draw and log the layout audit; safe: its safe zone (a lib/safe.ts preset or insets; default by aspect). */
export type FilmProps = { audit?: boolean; safe?: SafeSpec };

/**
 * The camera float every act sits on (lib/drift, fx/Float): one continuous drift through the whole film (sideways up
 * to 31 px/s, a push of up to 3 % carrying the turns), so no shot ever sits still while one small thing moves
 * (forensics.py motion-energy). Seed it with the film's name; a lock eases it to rest for one read, where its drift
 * runs fastest (withLocks({ seed }, [copy(id)], { fps: FPS }): one or two a film).
 */
export const FLOAT: FloatOpts = { seed: 'starter' };

// The film: one Sequence per act, handing off on exact frames (each seam is designed inside the
// acts, not a crossfade here), each act on the float. The soundtrack plays in the Studio once it exists.
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.paper }}>
        <Sequence from={ACT.line.from} durationInFrames={ACT.line.dur} name="1 Line">
          <ActStage from={ACT.line.from} o={FLOAT}>
            <Act1 />
          </ActStage>
        </Sequence>
        <Sequence from={ACT.plate.from} durationInFrames={ACT.plate.dur} name="2 Plate">
          <ActStage from={ACT.plate.from} o={FLOAT}>
            <Act2 />
          </ActStage>
        </Sequence>
        <Sequence from={ACT.frame.from} durationInFrames={ACT.frame.dur} name="3 Frame">
          <ActStage from={ACT.frame.from} o={FLOAT}>
            <Act3 />
          </ActStage>
        </Sequence>
        <Sequence from={ACT.mark.from} durationInFrames={ACT.mark.dur} name="4 Mark">
          <ActStage from={ACT.mark.from} o={FLOAT}>
            <Act4 />
          </ActStage>
        </Sequence>
        {hasScore && <Html5Audio src={staticFile(SOUNDTRACK)} />}
        {audit && <Audit safe={safe} />}
      </AbsoluteFill>
    </FontGate>
  );
};
