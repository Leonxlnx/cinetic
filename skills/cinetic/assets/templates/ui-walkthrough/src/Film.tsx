import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { Card } from './acts/Card';
import { Claim } from './acts/Claim';
import { End } from './acts/End';
import { Feed } from './acts/Feed';
import { Field } from './acts/Field';
import { Insight } from './acts/Insight';
import { Open } from './acts/Open';
import { Page } from './acts/Page';
import { Pick } from './acts/Pick';
import { Proof } from './acts/Proof';
import { DARK, FLOAT, STAGE } from './acts/stage';
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
export const ACTS: Record<ActName, React.FC> = { open: Open, card: Card, proof: Proof, claim: Claim, field: Field, feed: Feed, insight: Insight, pick: Pick, page: Page, end: End };
export const actComponent = (name: string): React.FC => ACTS[name as ActName];

// The film: one Sequence per act, handing off on exact frames (every act line is a seam: speed, scale or shape carried),
// each act on its stage over its ground, the camera still unless the act declares a move (acts/stage.tsx FLOAT, STAGE).
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: DARK.ground }}>
        {Object.entries(ACT).map(([name, a], k) => {
          const Act = actComponent(name);
          return (
            <Sequence key={name} from={a.from} durationInFrames={a.dur} name={`${k + 1} ${name}`}>
              <ActStage from={a.from} o={FLOAT} {...STAGE[name as ActName]}>
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
