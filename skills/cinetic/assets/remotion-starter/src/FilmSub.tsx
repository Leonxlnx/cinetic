import React, { useMemo } from 'react';
import { CalculateMetadataFunction, Freeze, useCurrentFrame } from 'remotion';
import { subframes } from './blur';
import { Film } from './Film';
import { TOTAL as FILM_TOTAL } from './timeline';

// The film as a stream of sub-frames for the motion-blurred master (see src/blur.ts). Frame j of
// this composition is the film at the (fractional) time of the j-th sub-frame; accumulate.py
// averages each output frame's group. `groups` (samples per output frame) comes from
// scripts/measure-speed.py via --props=out/samples.json. Discrete state in the acts must use
// fd(frame) so all samples of one output frame agree. `shutters` (optional) shortens the shutter
// on frames too fast for their samples.
export type FilmSubProps = { groups: number[]; shutters?: number[] };

export const FilmSub: React.FC<FilmSubProps> = ({ groups, shutters }) => {
  const j = useCurrentFrame();
  const subs = useMemo(() => subframes(groups, shutters), [groups, shutters]);
  const s = subs[Math.min(j, subs.length - 1)];
  return (
    <Freeze frame={s.t}>
      <Film />
    </Freeze>
  );
};

export const subMetadata: CalculateMetadataFunction<FilmSubProps> = ({ props }) => ({
  durationInFrames: subframes(props.groups, props.shutters).length,
});

// The film sampled for a quick dev round: frame j of this composition is film frame offset + j x step (every 4th
// frame by default), so a whole-film check renders in a quarter of the time and a paired sheet still shows every
// move. Alternate the offset between rounds (0, then 2) to see the frames the last round skipped. Discrete state
// still keys off the film frame (Freeze), so nothing differs from the full render on the frames it shows.
export type FilmEveryProps = { step?: number; offset?: number };

export const FilmEvery: React.FC<FilmEveryProps> = ({ step = 4, offset = 0 }) => {
  const j = useCurrentFrame();
  return (
    <Freeze frame={offset + j * Math.max(1, Math.round(step))}>
      <Film />
    </Freeze>
  );
};

/** Its length: every step-th film frame from offset. */
export const everyMetadata: CalculateMetadataFunction<FilmEveryProps> = ({ props }) => {
  const step = Math.max(1, Math.round(props.step ?? 4));
  return { durationInFrames: Math.max(1, Math.ceil((FILM_TOTAL - (props.offset ?? 0)) / step)) };
};
