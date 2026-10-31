import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { actOf, Ground, PAGE } from './acts/stage';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT } from './timeline';

/** Written by `npm run audio`. Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

/** audit: draw and log the layout audit; safe: its safe zone (a lib/safe.ts preset or insets; default by aspect). */
export type FilmProps = { audit?: boolean; safe?: SafeSpec };

/** The act component for each ACT entry, in film order: each is a window on the one stage (acts/stage.tsx). */
export const ACTS: Record<string, React.FC> = Object.fromEntries(Object.keys(ACT).map((n) => [n, actOf(n)]));
export const actComponent = (name: string): React.FC => ACTS[name];

/** One act as the film draws it: the ground, the act over it. No camera float: the camera moves only with a purpose
 * (the stage's push closer, a creative element's own move); a hold may be still. */
export const ActOnStage: React.FC<{ name: string }> = ({ name }) => {
  const F = useCurrentFrame() + ACT[name].from;
  const Act = actComponent(name);
  return (
    <>
      <Ground F={F} />
      <Act />
    </>
  );
};

// The film: one Sequence per act, handing off on exact frames (the seams are drawn by the stage across act lines).
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: PAGE.ground }}>
        {Object.entries(ACT).map(([name, a], k) => (
          <Sequence key={name} from={a.from} durationInFrames={a.dur} name={`${k + 1} ${name}`}>
            <ActOnStage name={name} />
          </Sequence>
        ))}
        {hasScore && <Html5Audio src={staticFile(SOUNDTRACK)} />}
        {audit && <Audit safe={safe} />}
      </AbsoluteFill>
    </FontGate>
  );
};
