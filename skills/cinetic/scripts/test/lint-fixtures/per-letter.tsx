// Fixture for scripts/test/lint-film.test.mjs. expect: per-letter:warn=2
// Letters mapped into animated spans warn (split(''), a spread); words do not, nor a letter map
// that only measures, nor the one hero word marked lint-ok.
import React from 'react';

export const A: React.FC<{ text: string; f: number }> = ({ text, f }) => (
  <>
    <span>{text.split('').map((c, i) => <span key={i} style={{ opacity: f > i ? 1 : 0 }}>{c}</span>)}</span>
    <span>{[...text].map((c, i) => <span key={i} style={{ transform: `translateY(${i}px)` }}>{c}</span>)}</span>
    <span>{text.split(' ').map((w, i) => <span key={i} style={{ opacity: 1 }}>{w}</span>)}</span>
    {/* lint-ok: hero word */}
    <span>{Array.from(text).map((c, i) => <span key={i} style={{ opacity: f > i ? 1 : 0 }}>{c}</span>)}</span>
  </>
);

export const codes = [...'abc'].map((c) => c.charCodeAt(0));
