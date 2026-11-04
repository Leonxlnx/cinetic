// Fixture for scripts/test/lint-film.test.mjs. expect: banned-color=3
// An all-digit #NNN(N) in running text is a build or PR number, not a colour; as a whole string or
// after a colour property it is a colour and is checked.
import React from 'react';

export const Labels: React.FC = () => (
  <div>
    <span>{'#2187 built'}</span>
    <span>{`PR #412 merged`}</span>
    <span>Run #1042 cached</span>
  </div>
);

export const purple = '#628'; // #662288 as a whole string: banned
export const css = `border: 1px solid #628;`; // after a colour property: banned
// A number label as a whole string where the product prints it: an array of copy, a copy key. Not colours.
export const PAIR = { line: 'Merge what you tested.', ui: ['Add order history export', '#482', 'Tests passed'] };
export const PR = { id: 'pr', text: '#482', number: '#1042' };
export const accent = { ink: '#628' }; // a colour key: banned
