// Fixture for scripts/test/lint-film.test.mjs. expect: ui-accent-bar=5 ui-accent-bar:warn=2
// Vertical accent lines and bars on a card's edge fail: a 4 px left border, a right border in the accent, an inset shadow
// painting the left side in the accent, a narrow pill before a title, a left border in CSS inside a string. A stripe in a
// colour set by a variable and a neutral stripe down a card's edge warn. A ring, a hairline divider, an L corner, a
// chart's bars, a caret, a dot and a horizontal rule are clean.
import React from 'react';

type T = { accent: string; line: string; surface: string };

export const css = `.card { padding: 24px; border-left: 3px solid var(--accent); }`;

export const Bad: React.FC<{ t: T; col: string; u: number }> = ({ t, col, u }) => (
  <>
    <div style={{ padding: 24, background: t.surface, borderLeft: '4px solid ' + col }} />
    <div style={{ padding: 24, background: t.surface, borderRight: `2px solid ${t.accent}` }} />
    <div style={{ padding: 24, background: t.surface, boxShadow: `inset ${5 * u}px 0 0 ${t.accent}` }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 14, height: 44, borderRadius: 7, background: t.accent }} />
    </div>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: col }} />
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: t.line }} />
  </>
);

export const Good: React.FC<{ t: T; u: number; values: number[] }> = ({ t, u, values }) => {
  const caret = <div style={{ width: 3, height: 40, background: t.accent }} />;
  return (
    <>
      <div style={{ padding: 24, background: t.surface, boxShadow: `inset 0 0 0 ${1.5 * u}px ${t.accent}` }} />
      <div style={{ padding: 24, background: t.surface, boxShadow: `inset -1px 0 0 ${t.line}` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: t.line }} />
      <div style={{ width: 20, height: 20, borderLeft: `2px solid ${t.accent}`, borderTop: `2px solid ${t.accent}` }} />
      <div data-chart style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {values.map((v, i) => <div key={i} style={{ width: 6, height: 60, opacity: v, background: t.accent }} />)}
      </div>
      {caret}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent }} />
      <div style={{ width: 400, height: 3, background: t.accent }} />
    </>
  );
};
