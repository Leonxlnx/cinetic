// Fixture for scripts/test/lint-film.test.mjs. expect: typing-rate:warn=1
// A type-on whose count is built from other names (shown -> left, CPS characters a frame) is
// followed to its real rate: 3 characters a frame is 180 a second (the test checks the number).
import React from 'react';
import { useCurrentFrame } from 'remotion';

const CPS = 3; // characters per frame

export const Code: React.FC<{ parts: string[] }> = ({ parts }) => {
  const f = useCurrentFrame();
  const total = parts.reduce((n, s) => n + s.length, 0);
  const shown = Math.floor(Math.min(total, Math.max(0, (f - 10) * CPS)));
  let left = shown;
  return (
    <span>
      {parts.map((s, j) => {
        const vis = s.slice(0, Math.max(0, left));
        left -= s.length;
        return <span key={j}>{vis}</span>;
      })}
    </span>
  );
};
