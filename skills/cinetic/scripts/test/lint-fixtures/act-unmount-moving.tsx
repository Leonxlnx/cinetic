// Fixture for scripts/test/lint-film.test.mjs. expect: unmount-moving:warn=1
// The card unmounts on CUE.out while its slide, started 6 f before, still runs near full speed (warns); the badge
// unmounts long after its rise has landed (silent). A creep keeps the act alive (hold-drift stays silent).
import React from 'react';
import { E, prog } from './anim';
import { CUE } from './timeline';

export const ActLeave: React.FC<{ F: number; a: string }> = ({ F, a }) => {
  const creep = 1 + 0.02 * prog(F, 0, 400, E.linear);
  const slide = prog(F, CUE.out - 6, CUE.out + 30, E.glideOut);
  const rise = prog(F, CUE.in, CUE.in + 30, E.glideOut);
  return (
    <div style={{ transform: `scale(${creep})` }}>
      {F < CUE.out && <div data-text="a" style={{ transform: `translate3d(${slide * 300}px, 0, 0)` }}>{a}</div>}
      {F < CUE.in + 90 && <div data-text="b" style={{ transform: `translate3d(0, ${(1 - rise) * 40}px, 0)` }}>{a}</div>}
    </div>
  );
};
