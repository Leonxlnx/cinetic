import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { WORLD } from './acts/look';
import { Stage } from './acts/stage';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT } from './timeline';

/** Written by `npm run audio`. Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

/** audit: draw and log the layout audit; safe: its safe zone (a lib/safe.ts preset or insets; default by aspect). */
export type FilmProps = { audit?: boolean; safe?: SafeSpec };

/** The act component for an ACT entry: a window onto the one stage from the act's first frame. */
export const actComponent = (name: string): React.FC => {
  const from = ACT[name]?.from ?? 0;
  const A: React.FC = () => <Stage from={from} />;
  return A;
};

// The film: one Sequence per act (an update film has one: it cuts on the plan's own frames), each drawing the one stage
// (acts/stage.tsx: the hook, a line card, a house scene or the lockup at that frame, from the plan in src/timeline.ts).
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: WORLD.base }}>
        {Object.entries(ACT).map(([name, a], k) => {
          const Act = actComponent(name);
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
