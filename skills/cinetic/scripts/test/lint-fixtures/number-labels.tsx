// Fixture for scripts/test/lint-film.test.mjs. expect: banned-color=2
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
