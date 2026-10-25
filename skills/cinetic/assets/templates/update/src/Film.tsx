import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from 'remotion';
import { Change } from './acts/Change';
import { EndCard } from './acts/EndCard';
import { Hook } from './acts/Hook';
import { Payoff } from './acts/Payoff';
import { THEME } from './acts/World';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import type { SafeSpec } from './lib/safe';
import { ACT } from './timeline';

/** Written by `npm run audio`. Renders are muted and scripts/render.sh muxes it with ffmpeg. */
export const SOUNDTRACK = 'audio/soundtrack.wav';

/** audit: draw and log the layout audit; safe: its safe zone (a lib/safe.ts preset or insets; default by aspect). */
export type FilmProps = { audit?: boolean; safe?: SafeSpec };

/** The act component for an ACT entry: the hook, change1..changeN, the payoff, the end card. */
export const actComponent = (name: string): React.FC => {
  if (name === 'hook') return Hook;
  if (name === 'payoff') return Payoff;
  if (name === 'end') return EndCard;
  const i = Number(name.replace('change', '')) - 1;
  const C: React.FC = () => <Change i={i} />;
  return C;
};

// The film: one Sequence per act, handing off on exact frames (one camera carries across every act line).
export const Film: React.FC<FilmProps> = ({ audit = false, safe }) => {
  const hasScore = getStaticFiles().some((s) => s.name === SOUNDTRACK);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: THEME.ground }}>
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
