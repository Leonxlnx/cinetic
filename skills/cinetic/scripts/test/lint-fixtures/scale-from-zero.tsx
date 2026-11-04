// Fixture for scripts/test/lint-film.test.mjs. expect: scale-from-zero:warn=3
// Entrances that grow from nothing warn (a tween from 0, a name that holds one, a mix from 0); an
// oversized landing (1.6 -> 1) and a pop that starts at 0.4 do not.
import React from 'react';
import { E, enter, mix, prog, tw } from './anim';

export const A: React.FC<{ f: number }> = ({ f }) => {
  const s = enter(f, 0, 30, E.snapOut);
  const p = prog(f, 0, 30, E.snapOut);
  return (
    <>
      <div style={{ transform: `scale(${tw(f, 0, 20, 0, 1, E.snapOut)})` }} />
      <div style={{ transform: `scale(${s})` }} />
      <div style={{ scale: mix(0, 1, p), width: 20 }} />
      <div style={{ transform: `scale(${mix(1.6, 1, p)})` }} />
      <div style={{ transform: `scale(${0.4 + 0.6 * p})` }} />
    </>
  );
};
