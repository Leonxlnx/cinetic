import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { actOf, PAGE, Stage } from './acts/stage';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT } from './timeline';

/** Written by `npm run sound`. Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

/** audit: draw and log the layout audit; safe: its safe zone (a lib/safe.ts preset or insets; default by aspect). */
export type FilmProps = { audit?: boolean; safe?: SafeSpec };

/** The act component for each ACT entry, in film order: each is a window on the one stage (acts/stage.tsx). */
export const ACTS: Record<string, React.FC> = Object.fromEntries(Object.keys(ACT).map((n) => [n, actOf(n)]));
export const actComponent = (name: string): React.FC => ACTS[name];

/** One act on its own (Root.tsx solos): the stage at the act's frames. */
export const ActOnStage: React.FC<{ name: string }> = ({ name }) => <Stage F={useCurrentFrame() + ACT[name].from} />;

// The film: one Sequence per act, handing off on exact frames (the handovers are drawn by the stage across act lines).
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: PAGE.ground }}>
        {Object.entries(ACT).map(([name, a], k) => {
          const Act = ACTS[name];
          return (
            <Sequence key={name} from={a.from} durationInFrames={a.dur} name={`${k + 1} ${name}`}>
              <Act />
            </Sequence>
          );
        })}
        {hasScore && <Html5Audio src={staticFile(SOUNDTRACK)} />}
        {audit && <Audit safe={safe} />}
      </AbsoluteFill>
    </FontGate>
  );
};
