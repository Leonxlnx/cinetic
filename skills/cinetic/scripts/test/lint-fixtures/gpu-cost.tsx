// Fixture for scripts/test/lint-film.test.mjs. expect: gpu-cost:warn=3
// A 60 px blur, an SVG filter animated by the frame and three blurred layers in one file warn; a
// filter set once from props and blurs of 8 px do not.
import React from 'react';
import { useCurrentFrame } from 'remotion';

export const A: React.FC<{ s: number; tone: string }> = ({ s, tone }) => {
  const frame = useCurrentFrame();
  const soft = frame / 10;
  return (
    <>
      <div style={{ filter: 'blur(60px)' }} />
      <div style={{ filter: `blur(${s}px)` }} />
      <div style={{ filter: 'blur(8px)' }} />
      <svg>
        <filter id="soft">
          <feGaussianBlur stdDeviation={soft} />
          <feColorMatrix type="matrix" values={tone} />
        </filter>
      </svg>
    </>
  );
};
