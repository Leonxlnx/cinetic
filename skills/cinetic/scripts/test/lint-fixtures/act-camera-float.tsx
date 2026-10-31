// Fixture for scripts/test/lint-film.test.mjs. expect: camera-float=5
// The removed camera float and drifts posing as creeps (errors): withLocks, dipAmp, a FloatOpts with the old
// options, a hold drifting 0.5 px/f@60, a list drifting 0.4 px/f@60 between its steps. A still stage ({}), a declared
// move (stageMove) and a sub-pixel creep (0.15) are silent.
import React from 'react';
import { E, prog } from './anim';
import { CUE } from './timeline';
import { type FloatOpts, stageMove, withLocks } from './drift';
import { dipAmp } from './Float';
import { glideList, holdDrift } from './continuity';

export const OLD: FloatOpts = withLocks({}, [], { fps: 30 });
export const SEEDED: FloatOpts = { seed: 'film', amp: 1 };
export const STILL: FloatOpts = {};
export const MOVED: FloatOpts = { moves: [stageMove(CUE.in, 'push')] };
export const amp = dipAmp(0, 100, 0.4, 24);

export const ActFloat: React.FC<{ F: number }> = ({ F }) => {
  const d = holdDrift(F, 0, { px: 0.5, angle: 90 });
  const c = holdDrift(F, 0, { px: 0.15, angle: 90 });
  const list = glideList(F, { at: [10, 40], jump: 96, drift: 0.4 });
  const rise = prog(F, CUE.in, CUE.in + 30, E.glideOut);
  return <div style={{ opacity: rise, transform: `translate3d(${d.x + c.x}px, ${d.y + c.y + list.y}px, 0)` }} />;
};
