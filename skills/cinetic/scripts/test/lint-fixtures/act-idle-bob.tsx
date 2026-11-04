// Fixture for scripts/test/lint-film.test.mjs. expect: idle-bob=4
// Idle loops on held UI (errors): a card bobbing on a sine of the frame (inline in a translate), a chip floating on a
// named cosine used as its y, a panel breathing in scale (lib/drift breathe), a lit panel's sway object. A one-shot arc
// (sin(PI * p)), a live dot's opacity pulse and a geometry angle are silent.
import React from 'react';
import { E, prog } from './anim';
import { breathe } from './drift';
import { Lit } from './Lit';

export const ActBob: React.FC<{ F: number; fps: number }> = ({ F, fps }) => {
  const p = prog(F, 10, 40, E.glideOut);
  const hop = 30 * Math.sin(Math.PI * p);
  const float = 6 * Math.cos(F / (fps * 1.4));
  const pulse = 0.55 + 0.45 * Math.cos(F / 9);
  const k = 1 + 0.02 * breathe(F, { seed: 2 });
  const angle = Math.cos((2 * Math.PI * 3) / 8);
  return (
    <div style={{ transform: `scale(${k})` }}>
      <div style={{ transform: `translate3d(0, ${(8 * Math.sin(F / 20)).toFixed(2)}px, 0)` }} />
      <div style={{ transform: `translate3d(${angle}px, ${hop}px, 0)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(0, ${float}px, 0)`, opacity: pulse }} />
      <Lit frame={F} x={960} y={540} w={800} h={500} ground="#eef1f4" sway={{ deg: 1 }} />
    </div>
  );
};
