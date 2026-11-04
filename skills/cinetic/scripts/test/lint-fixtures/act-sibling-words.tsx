// Fixture for scripts/test/lint-film.test.mjs. expect: copy-literal:warn=1
// A sentence typed one word per element (each its own span, revealed one by one) escapes COPY as
// surely as a string: the sibling words are read together. A lone one-word label does not warn.
import React from 'react';

const o = (f: number, i: number) => Math.min(1, Math.max(0, (f - i * 8) / 20));

export const Act: React.FC<{ f: number }> = ({ f }) => (
  <div>
    <div style={{ display: 'flex', gap: 18 }}>
      <span style={{ opacity: o(f, 0) }}>Every</span>
      <span style={{ opacity: o(f, 1) }}>sound</span>
      <span style={{ opacity: o(f, 2) }}>is</span>
      <span style={{ opacity: o(f, 3) }}>code.</span>
    </div>
    <span>Plinth</span>
  </div>
);
