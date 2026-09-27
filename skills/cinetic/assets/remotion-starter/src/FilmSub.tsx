import React, { useMemo } from 'react';
import { CalculateMetadataFunction, Freeze, useCurrentFrame } from 'remotion';
import { subframes } from './blur';
import { Film } from './Film';

// The film as a stream of sub-frames for the motion-blurred master (see src/blur.ts). Frame j of
// this composition is the film at the (fractional) time of the j-th sub-frame; accumulate.py
// averages each output frame's group. `groups` (samples per output frame) comes from
// scripts/measure-speed.py via --props=out/samples.json. Discrete state in the acts must use
// fd(frame) so all samples of one output frame agree.
export type FilmSubProps = { groups: number[] };

export const FilmSub: React.FC<FilmSubProps> = ({ groups }) => {
  const j = useCurrentFrame();
  const subs = useMemo(() => subframes(groups), [groups]);
  const s = subs[Math.min(j, subs.length - 1)];
  return (
    <Freeze frame={s.t}>
      <Film />
    </Freeze>
  );
};

export const subMetadata: CalculateMetadataFunction<FilmSubProps> = ({ props }) => ({
  durationInFrames: subframes(props.groups).length,
});
