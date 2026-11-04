// Fixture for scripts/test/lint-film.test.mjs. expect: fade-exit:warn=1 linear-opacity:warn=1
// A statement fading out over 30 f with nothing moving warns; the same exit with a move, a short
// 8 f fade and a UI label do not. Type opacity on E.linear warns.
import React from 'react';
import { E, prog } from './anim';
import { typeStyle } from './tokens';

export const A: React.FC<{ f: number; t: string }> = ({ f, t }) => {
  const out = prog(f, 100, 130, E.softIn);
  return (
    <>
      <span data-text="a" style={{ ...typeStyle('display'), opacity: 1 - out }}>{t}</span>
      <span data-text="b" style={{ ...typeStyle('display'), opacity: 1 - out, transform: `translateY(${-40 * out}px)` }}>{t}</span>
      <span data-text="c" style={{ ...typeStyle('line'), opacity: 1 - prog(f, 100, 108, E.buildIn) }}>{t}</span>
      <span data-text="d" data-ui style={{ ...typeStyle('ui'), opacity: 1 - prog(f, 100, 130, E.softIn) }}>{t}</span>
      <span data-text="e" style={{ ...typeStyle('line'), opacity: prog(f, 0, 20, E.linear) }}>{t}</span>
    </>
  );
};
