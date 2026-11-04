// Fixture for scripts/test/lint-film.test.mjs. expect: drift-toggle:warn=2 idle-bob=2
// An old lit-panel sway switched off once the camera starts to flatten (drift-toggle warns), one switched on a guard (warns), and one
// fading to rest (silent for drift-toggle). The two sway objects are idle loops (idle-bob errors).
import React from 'react';
import { E, prog } from './anim';
import { CUE } from './timeline';
import { Lit, swayFade } from './Lit';

export const ActPanels: React.FC<{ F: number }> = ({ F }) => {
  const flat = prog(F, CUE.in, CUE.in + 40, E.stdInOut);
  const creep = 1 + 0.02 * prog(F, 0, 400, E.linear);
  return (
    <div style={{ transform: `scale(${creep})` }}>
      <Lit frame={F} x={960} y={540} w={800} h={500} ground="#eef1f4" sway={flat > 0 ? false : undefined} />
      <Lit frame={F} x={960} y={540} w={800} h={500} ground="#eef1f4" sway={F < CUE.in && { deg: 1 }} />
      <Lit frame={F} x={960} y={540} w={800} h={500} ground="#eef1f4" sway={{ amount: swayFade(F, CUE.in - 10, CUE.in + 30) }} />
    </div>
  );
};
