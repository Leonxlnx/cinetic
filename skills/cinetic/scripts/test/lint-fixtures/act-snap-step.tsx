// Fixture for scripts/test/lint-film.test.mjs. expect: snap-step:warn=2
// One-frame snap primitives in an act with nothing declaring them (no src/sync.ts imports their declares()): the
// stepped value and the hard list warn (one device, so no device-count warning on top). snapLast: false and the
// gliding list stay silent.
import React from 'react';
import { HardStep, stepValue } from './fx/HardStep';
import { GlideStep } from './fx/GlideStep';

export const ActSnap: React.FC<{ F: number; rows: React.ReactNode }> = ({ F, rows }) => {
  const n = stepValue(F, [{ at: 40, value: 2 }], 1);
  const spec = { snapLast: false };
  return (
    <>
      <HardStep frame={F} jump={96} start={30} every={20} count={4} width={800} height={400}>{rows}</HardStep>
      <GlideStep frame={F} jump={96} start={30} every={20} count={4} width={800} height={400}>{rows}</GlideStep>
      <div data-n={n} data-spec={String(spec.snapLast)} />
    </>
  );
};
