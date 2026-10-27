// Fixture for scripts/test/lint-film.test.mjs. expect: hold-drift:warn=1
// An act whose tweens are separated by holds where nothing moves: no creep, no drift, no carried camera (warns once).
import React from 'react';
import { E, prog } from './anim';

export const ActStill: React.FC<{ F: number; a: string }> = ({ F, a }) => {
  const rise = prog(F, 10, 40, E.snapOut);
  const away = prog(F, 120, 146, E.glideOut);
  return <div data-text="a" style={{ opacity: rise, transform: `translate3d(0, ${(1 - rise) * 40 - away * 60}px, 0)` }}>{a}</div>;
};
