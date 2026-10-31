// Fixture for scripts/test/lint-film.test.mjs. expect: card-tilt=5
// Cards tilted at rest (errors): a constant tilt prop, a constant tilt in a props object, a constant rotateX / rotateY
// pair on a plane (one each: two), a depth item rolled 8 degrees. A turn animated from the frame, an entry's starting tilt
// (from) and a face-on tilt are silent.
import React from 'react';
import { E, mix, prog } from './anim';
import { Lit, type LitProps } from './Lit';
import type { DepthItem } from './DepthStack';

const panel: LitProps = { x: 960, y: 540, w: 900, h: 560, tilt: { x: 9, y: -12 }, ground: '#eef1f4' };
export const ITEMS: DepthItem[] = [{ id: 'near0', plane: 'near', carries: 'icon', x: 1800, y: 900, w: 300, h: 300, rot: 8 }];

export const ActTilt: React.FC<{ F: number }> = ({ F }) => {
  const turn = prog(F, 10, 70, E.strongInOut);
  return (
    <>
      <Lit frame={F} x={960} y={540} w={900} h={560} tilt={{ x: 10, y: -12 }} ground="#eef1f4" />
      <Lit frame={F} {...panel} />
      <Lit frame={F} x={960} y={540} w={900} h={560} tilt={{ x: mix(9, 0, turn), y: mix(-24, 0, turn) }} ground="#eef1f4" enter={{ at: 10, from: { y: 200, tilt: { x: 26, y: -16 } } }} />
      <Lit frame={F} x={960} y={540} w={900} h={560} tilt={{ x: 0, y: 0 }} ground="#eef1f4" />
      <div style={{ transform: 'perspective(2200px) rotateX(9deg) rotateY(-11deg)' }} />
    </>
  );
};
