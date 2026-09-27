import React from 'react';
import { Composition, Folder, Still } from 'remotion';
import { Act1 } from './acts/Act1';
import { Act2 } from './acts/Act2';
import { C, U } from './brand/tokens';
import { Film, FilmProps } from './Film';
import { FilmSub, subMetadata } from './FilmSub';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import { MarkSizes, MarkStill } from './Stills';
import { ACT, FPS, H, TOTAL, W } from './timeline';

// An act on its own, font-gated like the film, so it can be iterated without scrubbing the film.
// Composition ActN is the Nth entry of ACT (scripts/layout-audit.sh relies on that order).
const solo = (Act: React.FC) => {
  const Solo: React.FC<FilmProps> = ({ audit = false }) => (
    <FontGate>
      <div style={{ position: 'absolute', inset: 0, background: C.paper }}>
        <Act />
        {audit && <Audit />}
      </div>
    </FontGate>
  );
  return Solo;
};
const Act1Solo = solo(Act1);
const Act2Solo = solo(Act2);

export const RemotionRoot: React.FC = () => (
  <>
    {/* The film. Render with scripts/render.sh (muted picture + ffmpeg mux + sync check). */}
    <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
    {/* The film as sub-frames for the motion-blurred master (render.sh --blur passes out/samples.json). */}
    <Composition
      id="FilmSub"
      component={FilmSub}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ groups: [] as number[] }}
      calculateMetadata={subMetadata}
    />

    <Folder name="Acts">
      <Composition id="Act1" component={Act1Solo} durationInFrames={ACT.statement.dur} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
      <Composition id="Act2" component={Act2Solo} durationInFrames={ACT.mark.dur} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
    </Folder>

    <Folder name="Stills">
      <Still id="Mark16" component={MarkStill} width={16} height={16} defaultProps={{ size: 16, surface: 'paper' as const }} />
      <Still id="MarkLarge" component={MarkStill} width={W} height={H} defaultProps={{ size: 640 * U, surface: 'paper' as const }} />
      <Still id="MarkSizes" component={MarkSizes} width={W} height={H} />
    </Folder>
  </>
);
