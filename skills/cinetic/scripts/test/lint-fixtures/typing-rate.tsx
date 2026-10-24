// Fixture for scripts/test/lint-film.test.mjs. expect: typing-rate:warn=5
// Human typing runs 19-45 chars/s (house 30): a TypeOn at 60, a crawl at 10, a stream past 150, and a
// hand-rolled type-on at 3 chars per frame (180/s) or one per frame (60/s) warn; 45, a 120/s stream, 20/s and a fixed slice do not.
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
      <TypeOn text={text} frame={f} start={0} cps={60} />
      <TypeOn text={text} frame={f} start={0} cps={10} />
      <TypeOn text={text} frame={f} start={0} cps={120} kind="stream" />
      <TypeOn text={text} frame={f} start={0} cps={200} kind="stream" />
      <span>{fast}{one}{calm}{head}</span>
    </>
  );
};
