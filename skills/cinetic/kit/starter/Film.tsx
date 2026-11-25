// The film. One file to start: a timeline object T (every scene and sound reads its frames from it), one
// component per section, and the film that places them. Split into files once it grows.
// Write BEATS.md first: the five-line story, the concept, the devices, one row per beat. Take turns, type moves and
// product UI from the motion library (references/library.md) and adapt them; hand-build only what it lacks.
// The ground is flat by default: a flat clean colour, a real picture, or a bold designed scene.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { creep, fonts, Ground, Words } from '../../kit';

const T = {
  open: 0,
  end: 90,
} as const;

const Open: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + 0.02 * creep(f, T.open, T.end);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${push})` }}>
      <div style={{ fontFamily: fonts.inter, fontWeight: 520, fontSize: 180, letterSpacing: '-0.025em', color: '#111' }}>
        <Words text="Replace me" start={4} arrive="rise" style={{ color: '#111' }} />
      </div>
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => (
  <AbsoluteFill>
    <Ground color="#F4F5F7" />
    <Open />
  </AbsoluteFill>
);

export const duration = T.end;
