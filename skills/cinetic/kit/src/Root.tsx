import React from 'react';
import { Composition } from 'remotion';
import { FILMS } from './films';
import { Sheet } from './Sheet';

export const Root: React.FC = () => (
  <>
    {Object.entries(FILMS).map(([id, f]) => (
      <Composition key={id} id={id} component={f.component} durationInFrames={f.duration} fps={f.fps} width={1920} height={1080} />
    ))}
    <Composition id="Sheet" component={Sheet} durationInFrames={3600} fps={30} width={1920} height={1080} defaultProps={{}} />
  </>
);
