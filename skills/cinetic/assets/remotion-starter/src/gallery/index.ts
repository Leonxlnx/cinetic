// The parts' proof sheet as its own entry point (the film's entry stays src/index.ts):
//   npx remotion studio src/gallery/index.ts
//   npx remotion render src/gallery/index.ts MovesGallery out/gallery.mp4 --scale=0.5
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { GALLERY, MovesGallery } from './MovesGallery';

const Root: React.FC = () =>
  React.createElement(Composition, { id: 'MovesGallery', component: MovesGallery, durationInFrames: GALLERY.frames, fps: GALLERY.fps, width: GALLERY.width, height: GALLERY.height });

registerRoot(Root);
