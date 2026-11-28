// The film. One file to start: a timeline object T (every scene and sound reads its frames from it), one
// component per section, and the film that places them. Split into files once it grows.
// Write BEATS.md first: the five-line story, the concept, the devices, one row per beat. Take turns, type moves and
// product UI from the motion library (references/library.md) and adapt them; hand-build only what it lacks.
// The ground is flat by default: a flat clean colour or a bold designed scene; a picture only when the user gave it or
// it is the product's content. Frame 0 is never empty and already moving: the first words start before frame 0.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { creep, fonts, Ground, Words } from '../../kit';

const T = {
  open: 0,
  end: 90,
} as const;

// Every join as the first frame of its move and how long the move runs (`{ at: T.turn, len: 14 }`): `frames.mjs joins`
// exports every frame of it at real size, from 2 frames before to 4 after. A bare frame gives only the 9 round it.
// Name the lockup's first frame in T as `lockup` (or export LOCKUP): `frames.mjs check` measures the ending from it.
export const JOINS: ({ at: number; len: number } | number)[] = [];

const Open: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + 0.02 * creep(f, T.open, T.end);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${push})` }}>
      <div style={{ fontFamily: fonts.inter, fontWeight: 520, fontSize: 180, letterSpacing: '-0.025em', color: '#111' }}>
        <Words text="Replace me" start={-8} arrive="rise" style={{ color: '#111' }} />
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
