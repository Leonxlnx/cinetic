import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { Act1 } from './acts/Act1';
import { Act2 } from './acts/Act2';
import { C } from './brand/tokens';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import { ACT } from './timeline';

/** Written by `npm run audio`. Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

export type FilmProps = { audit?: boolean };

// The film: one Sequence per act, handing off on exact frames (each seam is designed inside the
// acts, not a crossfade here). The soundtrack plays in the Studio once it exists.
export const Film: React.FC<FilmProps> = ({ audit = false }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.paper }}>
        <Sequence from={ACT.statement.from} durationInFrames={ACT.statement.dur} name="1 Statement">
          <Act1 />
        </Sequence>
        <Sequence from={ACT.mark.from} durationInFrames={ACT.mark.dur} name="2 Mark">
          <Act2 />
        </Sequence>
        {hasScore && <Html5Audio src={staticFile(SOUNDTRACK)} />}
        {audit && <Audit />}
      </AbsoluteFill>
    </FontGate>
  );
};
