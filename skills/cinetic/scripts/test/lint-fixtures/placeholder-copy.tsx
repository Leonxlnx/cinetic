// Fixture for scripts/test/lint-film.test.mjs. expect: placeholder-copy=7
// Text that marks itself unfinished, in on-screen places: JSX text, a string child, an on-screen prop or key, a
// generic label alone, a generic noun and a number, a COPY string. Real product words pass, and so do code values
// that are not shown (a kind, a role) and a field's real hint.
import React from 'react';

declare const line: (id: string, text: string, at: number) => unknown;
export const COPY = [line('hook', 'Placeholder line', 0), line('what', 'Ledger sends invoices for you.', 60)];

export const DATA = {
  rows: [
    { title: 'Lorem ipsum dolor', meta: 'INV-0412' },
    { title: 'Invoice for Harbor & Co', meta: 'INV-0413' },
    { title: 'Item 3', meta: 'INV-0414' },
  ],
  kind: 'text',
};

export const Bad: React.FC = () => (
  <div>
    <span>Placeholder</span>
    <span>{'Your text here'}</span>
    <Pill label="Label text" />
    <span>Button</span>
  </div>
);

export const Good: React.FC = () => (
  <div role="caption">
    <span>Sent to 14 people</span>
    <Field placeholder="Search invoices" />
    <Pill label="Paid" />
    <span>{'Due Friday'}</span>
  </div>
);

declare const Pill: React.FC<{ label: string }>;
declare const Field: React.FC<{ placeholder: string }>;
