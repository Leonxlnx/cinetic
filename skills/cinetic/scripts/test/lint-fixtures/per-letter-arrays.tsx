// Fixture for scripts/test/lint-film.test.mjs. expect: per-letter:warn=1
// Spreading an array (rows, bars) into animated elements is not per-letter animation and stays
// silent; spreading a string read from COPY into animated spans warns.
import React from 'react';
import { copy } from './timeline';

const ROWS = [12, 30, 18];

export const A: React.FC<{ f: number; bars: number[] }> = ({ f, bars }) => {
  const head = copy('title').text;
  return (
    <>
      {[...ROWS].map((r, i) => <div key={i} style={{ opacity: f > i ? 1 : 0, height: r }} />)}
      {Array.from(bars).map((h, i) => <div key={i} style={{ transform: `scaleY(${h})` }} />)}
      {[...head].map((c, i) => <span key={i} style={{ opacity: f > i ? 1 : 0 }}>{c}</span>)}
    </>
  );
};
