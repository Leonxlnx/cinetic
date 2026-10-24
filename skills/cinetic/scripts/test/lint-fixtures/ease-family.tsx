// Fixture for scripts/test/lint-film.test.mjs. expect: ease-family=3 ease-family:warn=1
// enter/leave/move and a word's arrival take a curve of their role (three wrong ones fail); a short move
// that starts and stops on E.linear warns; a long linear drift and a log zoom on lmix do not.
import React from 'react';
import { E, enter, leave, lmix, move, prog } from './anim';
import { Words } from './Words';

export const A: React.FC<{ f: number; text: string }> = ({ f, text }) => {
  const a = enter(f, 0, 30, E.buildIn);
  const b = leave(f, 40, 60, E.snapOut);
  const c = move(f, 60, 96, E.strongInOut);
  const d = leave(f, 96, 120, E.launchIn);
  const x = prog(f, 10, 30, E.linear);
  const drift = prog(f, 0, 600, E.linear);
  const k = lmix(1, 1.08, prog(f, 0, 300, E.linear));
  return (
    <>
      <div style={{ opacity: a * b, transform: `translateX(${c * 120 + d * 40}px)` }} />
      <div style={{ transform: `translateX(${x * 200}px)` }} />
      <div style={{ transform: `translateY(${drift * 30}px) scale(${k})` }} />
      <Words text={text} frame={f} start={0} ease={E.launchIn} exitEase={E.buildIn} />
    </>
  );
};
