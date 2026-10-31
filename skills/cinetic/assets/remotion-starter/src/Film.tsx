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
 * The stage every act stands on (lib/drift, fx/Float): the camera is still unless an act declares a move. Give an act
 * a move only where it shows something (a push that closes on the control that changes, a track that follows what
 * travels, a pull that reveals the whole), from rest to rest: STAGE.<act> = { moves: [stageMove(at, 'push')] }. No
 * float, no drift, no idle loop: holds may be still (lint-film camera-float, forensics.py camera-wander).
 */
export const FLOAT: FloatOpts = {};

// The film: one Sequence per act, handing off on exact frames (each seam is designed inside the
// acts, not a crossfade here), each act on its stage (still unless it declares a move). The soundtrack plays in the Studio once it exists.
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
