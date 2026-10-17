// Fixture for scripts/test/lint-film.test.mjs. expect: typing-rate:warn=3
// A TypeOn above 30 chars/s and hand-rolled type-ons that outrun a reader warn (3 chars per frame,
// and one per frame through a variable); 20 chars/s and a fixed slice do not.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TypeOn } from './TypeOn';

export const A: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const fast = text.slice(0, Math.floor((f - 10) * 3));
  const n = Math.floor(f - 20);
  const one = text.slice(0, n);
  const calm = text.slice(0, Math.floor((f - 30) / 3));
  const head = text.slice(0, 4);
  return (
    <>
      <TypeOn text={text} frame={f} start={0} cps={45} />
      <TypeOn text={text} frame={f} start={0} cps={20} />
      <span>{fast}{one}{calm}{head}</span>
    </>
  );
};
