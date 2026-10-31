// Fixture for scripts/test/lint-film.test.mjs. expect: camera-float=0
// An act whose tweens are separated by still holds: no creep, no drift, no float. Silent: a hold may be completely
// still (the camera moves only with a purpose; the old hold-drift rule is gone).
import React from 'react';
import { E, prog } from './anim';

export const ActStill: React.FC<{ F: number; a: string }> = ({ F, a }) => {
  const rise = prog(F, 10, 40, E.snapOut);
  const away = prog(F, 120, 146, E.glideOut);
  return <div data-text="a" style={{ opacity: rise, transform: `translate3d(0, ${(1 - rise) * 40 - away * 60}px, 0)` }}>{a}</div>;
};
