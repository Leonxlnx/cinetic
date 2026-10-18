// Fixture for scripts/test/lint-film.test.mjs. expect: text-spring:warn=2
// A custom text wrapper handed an overshooting preset as its spring (cfg={SPR.word}, or config= an
// alias of SPR.pop) around text warns; the same wrapper on SPR.firm, or around a shape, does not.
import React from 'react';
import { SPR } from './anim';
import { Rise } from './Rise';
import { copy } from './timeline';

const BOUNCE = SPR.pop;

export const A: React.FC<{ f: number }> = ({ f }) => (
  <>
    <Rise f={f} at={10} cfg={SPR.word}>
      sounds.
    </Rise>
    <Rise f={f} at={20} config={BOUNCE}>{copy('payoff').text}</Rise>
    <Rise f={f} at={30} cfg={SPR.firm}>
      made by
    </Rise>
    <Rise f={f} at={40} cfg={SPR.pop}>
      <div style={{ width: 20, height: 20 }} />
    </Rise>
  </>
);
