// Fixture for scripts/test/lint-film.test.mjs. expect: crossfade=1
// Two full-frame layers dissolving into each other over 40 f fail; a 6 f blend does not.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { E, prog } from './anim';

export const A: React.FC<{ f: number }> = ({ f }) => (
  <>
    <AbsoluteFill style={{ opacity: 1 - prog(f, 100, 140, E.strongInOut) }} />
    <AbsoluteFill style={{ opacity: prog(f, 100, 140, E.strongInOut) }} />
    <AbsoluteFill style={{ opacity: 1 - prog(f, 200, 206, E.strongInOut) }} />
    <AbsoluteFill style={{ opacity: prog(f, 200, 206, E.strongInOut) }} />
  </>
);
