// Fixture for scripts/test/lint-film.test.mjs. expect: (none)
// A spring is followed by name, never through object keys, strings or .property names: a dot's true
// landing on SPR.land does not make a chain timed from MOVES.read "sprung", nor does an object with
// a key (or a string) named like a spring variable elsewhere.
import React from 'react';
import { spr, SPR } from './anim';
import { Chain } from './Chain';
import { Words } from './Words';

const MOVES = { land: 108, read: 144 };
const V2 = { badge: 30, wordIn: 60, label: 'badge' };

export const A: React.FC<{ f: number }> = ({ f }) => {
  const land = spr(f, MOVES.land, SPR.land);
  const badge = spr(f, 20, SPR.pop);
  const out = V2.wordIn + 90;
  return (
    <>
      <div style={{ transform: `scale(${land})`, width: 20, height: 20 }} />
      <div style={{ transform: `scale(${badge})`, width: 20, height: 20 }} />
      <Chain chain="statement" frame={f} from={MOVES.read} />
      <Words text="land" frame={f} start={V2.wordIn} out={out} />
    </>
  );
};
