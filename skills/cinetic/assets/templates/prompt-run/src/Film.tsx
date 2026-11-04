import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { Ask } from './acts/Ask';
import { Click } from './acts/Click';
import { Done } from './acts/Done';
import { End } from './acts/End';
import { Pill } from './acts/Pill';
import { Run } from './acts/Run';
import { FLOAT, PAGE } from './acts/stage';
import { ActStage } from './fx/Float';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT, type ActName } from './timeline';

/** Written by `npm run audio`. Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

/** audit: draw and log the layout audit; safe: its safe zone (a lib/safe.ts preset or insets; default by aspect). */
export type FilmProps = { audit?: boolean; safe?: SafeSpec };

/** The act component for each ACT entry, in film order. */
export const ACTS: Record<ActName, React.FC> = { pill: Pill, ask: Ask, click: Click, run: Run, done: Done, end: End };
export const actComponent = (name: string): React.FC => ACTS[name as ActName];

// The film: one Sequence per act, handing off on exact frames (one object carried through every act line).
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: PAGE.ground }}>
        {Object.entries(ACT).map(([name, a], k) => {
          const Act = actComponent(name);
          return (
            <Sequence key={name} from={a.from} durationInFrames={a.dur} name={`${k + 1} ${name}`}>
              <ActStage from={a.from} o={FLOAT}>
                <Act />
              </ActStage>
            </Sequence>
          );
        })}
        {hasScore && <Html5Audio src={staticFile(SOUNDTRACK)} />}
        {audit && <Audit safe={safe} />}
      </AbsoluteFill>
    </FontGate>
  );
};
