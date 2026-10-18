// Fixture for scripts/test/lint-film.test.mjs. expect: text-spring:warn=3
// Overshooting springs that move text warn (a preset, an alias of one, spr()'s snap default);
// SPR.calm on text and a snap spring on a shape do not.
import React from 'react';
import { spr, SPR } from './anim';

const LAND = SPR.pop;

export const A: React.FC<{ f: number }> = ({ f }) => {
  const s = spr(f, 10, SPR.snap);
  const y = (1 - s) * 40;
  const t = spr(f, 20, LAND);
  const u = spr(f, 30);
  const calm = spr(f, 40, SPR.calm);
  const box = spr(f, 50, SPR.snap);
  return (
    <>
      <span data-text="a" style={{ transform: `translateY(${y}px)` }}>A</span>
      <span data-text="b" style={{ opacity: t }}>B</span>
      <span data-text="c" style={{ transform: `scale(${u})` }}>C</span>
      <span data-text="d" style={{ transform: `translateY(${(1 - calm) * 40}px)` }}>D</span>
      <div style={{ transform: `scale(${box})`, width: 40, height: 40 }} />
    </>
  );
};
