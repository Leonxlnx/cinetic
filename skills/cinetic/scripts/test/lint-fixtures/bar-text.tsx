// Fixture for scripts/test/lint-film.test.mjs. expect: bar-text=2
// Grey bars standing in for text: a skeleton component, and a callback that draws only short rounded boxes at varying
// widths with nothing to read. Rows that carry their words, a progress list and a loading state on purpose pass.
import React from 'react';

const WIDTHS = [0.92, 0.74, 0.86, 0.51];
const ROWS = ['Invoices sent', 'Paid this week', 'Overdue', 'Drafts'];

export const Bad: React.FC = () => (
  <div>
    <Skeleton lines={3} />
    {WIDTHS.map((w, i) => (
      <div key={i} style={{ width: `${w * 100}%`, height: 14, borderRadius: 7, background: '#D6D9DE', marginBottom: 12 }} />
    ))}
  </div>
);

export const Good: React.FC<{ p: number }> = ({ p }) => (
  <div>
    {ROWS.map((t, i) => (
      <div key={i} style={{ height: 48 }}>
        <span>{t}</span>
      </div>
    ))}
    {WIDTHS.map((w, i) => (
      <div key={i} className="progress" style={{ width: `${w * p * 100}%`, height: 8, borderRadius: 4, background: '#D6D9DE' }} />
    ))}
    {/* lint-ok: loading state */}
    <Skeleton lines={2} />
  </div>
);

declare const Skeleton: React.FC<{ lines: number }>;
