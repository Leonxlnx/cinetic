import React from 'react';
import { Composition, Folder, Still } from 'remotion';
import { Act1 } from './acts/Act1';
import { Act2 } from './acts/Act2';
import { Act3 } from './acts/Act3';
import { Act4 } from './acts/Act4';
import { C, U } from './brand/tokens';
import { Film, FilmProps } from './Film';
import { FilmEvery, everyMetadata, FilmSub, subMetadata } from './FilmSub';
import { Audit } from './lib/Audit';
import { FontGate } from './lib/FontGate';
import { BrandAvatar, BrandHeader, BrandLockup, BrandMark, LogoSheet, LogoWallStill, MarkSizes, MarkStill } from './Stills';
import { ACT, FPS, H, TOTAL, W } from './timeline';

// An act on its own, font-gated like the film, so it can be iterated without scrubbing the film.
// Composition ActN is the Nth entry of ACT (scripts/layout-audit.sh relies on that order).
const solo = (Act: React.FC) => {
  const Solo: React.FC<FilmProps> = ({ audit = false, safe }) => (
    <FontGate>
      <div style={{ position: 'absolute', inset: 0, background: C.paper }}>
        <Act />
        {audit && <Audit safe={safe} />}
      </div>
    </FontGate>
  );
  return Solo;
};
const Act1Solo = solo(Act1);
const Act2Solo = solo(Act2);
const Act3Solo = solo(Act3);
const Act4Solo = solo(Act4);

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
    {/* The film sampled for a dev round: every 4th frame (--props='{"step":4,"offset":2}' for the others). */}
    <Composition id="FilmEvery" component={FilmEvery} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ step: 4, offset: 0 }} calculateMetadata={everyMetadata} />

    <Folder name="Acts">
      <Composition id="Act1" component={Act1Solo} durationInFrames={ACT.line.dur} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
      <Composition id="Act2" component={Act2Solo} durationInFrames={ACT.plate.dur} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
      <Composition id="Act3" component={Act3Solo} durationInFrames={ACT.frame.dur} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
      <Composition id="Act4" component={Act4Solo} durationInFrames={ACT.mark.dur} fps={FPS} width={W} height={H} defaultProps={{ audit: false } as FilmProps} />
    </Folder>

    <Folder name="Stills">
      <Still id="Mark16" component={MarkStill} width={16} height={16} defaultProps={{ size: 16, surface: 'paper' as const }} />
      <Still id="MarkLarge" component={MarkStill} width={W} height={H} defaultProps={{ size: 640 * U, surface: 'paper' as const }} />
      <Still id="MarkSizes" component={MarkSizes} width={W} height={H} />
      {/* the real marks the film fetched (scripts/logos.mjs) in the kit's logo parts */}
      <Still id="KitLogos" component={LogoSheet} width={W} height={H} defaultProps={{ logos: [] as string[] }} />
      <Still id="KitLogoWall" component={LogoWallStill} width={W} height={H} defaultProps={{ logos: [] as string[], frame: 120, ground: 'light' as const, ring: false }} />
    </Folder>

    {/* The brand as files, for a brand the film invented: bash scripts/brand-kit.sh renders these. */}
    <Folder name="Brand">
      <Still id="BrandMark" component={BrandMark} defaultProps={{ size: 1024, ground: 'light' as const }} calculateMetadata={({ props }) => ({ width: props.size, height: props.size })} />
      <Still id="BrandLockup" component={BrandLockup} width={2400} height={800} defaultProps={{ ground: 'light' as const }} />
      <Still id="BrandAvatar" component={BrandAvatar} width={400} height={400} defaultProps={{ ground: 'light' as const }} />
      <Still id="BrandHeader" component={BrandHeader} width={1500} height={500} defaultProps={{ ground: 'light' as const }} />
    </Folder>
  </>
);
