// Fixture for scripts/test/lint-film.test.mjs. expect: move-queue:warn=1
// Three moves timed off CUE.a run one after another inside 3 s (warns once); the moves off CUE.b overlap by half
// (secondaries riding a carrying move: silent). A creep keeps the holds alive.
import React from 'react';
import { E, prog } from './anim';
import { f60x } from './film';
import { CUE } from './timeline';

export const ActQueue: React.FC<{ F: number; a: string }> = ({ F, a }) => {
  const creep = 1 + 0.02 * prog(F, 0, 600, E.linear);
  const one = prog(F, CUE.a, CUE.a + f60x(30), E.snapOut);
  const two = prog(F, CUE.a + f60x(30), CUE.a + f60x(60), E.snapOut);
  const three = prog(F, CUE.a + f60x(60), CUE.a + f60x(90), E.snapOut);
  const carry = prog(F, CUE.b, CUE.b + f60x(96), E.glideOut);
  const ride = prog(F, CUE.b + f60x(48), CUE.b + f60x(96), E.glideOut);
  const ride2 = prog(F, CUE.b + f60x(72), CUE.b + f60x(120), E.glideOut);
  return (
    <div style={{ transform: `scale(${creep})` }}>
      <div data-text="a" style={{ transform: `translate3d(${one * 100 + two * 100 + three * 100}px, 0, 0)` }}>{a}</div>
      <div data-text="b" style={{ transform: `translate3d(0, ${carry * 200 + ride * 40 + ride2 * 20}px, 0)` }}>{a}</div>
    </div>
  );
};
