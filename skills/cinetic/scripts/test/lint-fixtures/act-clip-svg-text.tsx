// Fixture for scripts/test/lint-film.test.mjs. expect: clip-text:warn=1 svg-text:warn=1
// In an act: a gradient clipped to text with no padding warns (its descenders are cut), the same gradient through
// clipText() or on a padded box does not; an SVG <text> warns (it renders wrong under CSS transforms), a path does not.
import React from 'react';
import { clipText } from './HueSweep';

export const ActClip: React.FC<{ a: string; fill: string }> = ({ a, fill }) => (
  <>
    <span data-text="a" style={{ backgroundImage: fill, backgroundClip: 'text', color: 'transparent' }}>{a}</span>
    <span data-text="b" style={{ ...clipText(fill) }}>{a}</span>
    <span data-text="c" style={{ backgroundImage: fill, WebkitBackgroundClip: 'text', padding: '0.18em 0 0.32em', marginTop: '-0.18em' }}>{a}</span>
    <svg width={100} height={40} viewBox="0 0 100 40">
      <path d="M0 0 L100 40" stroke="currentColor" />
      <text x={0} y={30}>{a}</text>
    </svg>
  </>
);
