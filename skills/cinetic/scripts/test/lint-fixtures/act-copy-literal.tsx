// Fixture for scripts/test/lint-film.test.mjs. expect: copy-literal:warn=5
// Film copy typed into an act escapes COPY: JSX text, a {'string'} child, text props and a words
// list warn; copy read from the timeline, one-word labels and data-text ids do not.
import React from 'react';
import { copy } from './timeline';
import { Caption, Words } from './Words';

export const Act: React.FC<{ f: number; n: number }> = ({ f, n }) => (
  <div>
    <h1>Ship it today</h1>
    <p>{'Every sound you heard'}</p>
    <Words text="Built for speed" frame={f} start={0} />
    <Caption label={`Made by code`} />
    <Words words={['now', 'it', 'listens']} frame={f} start={0} />
    <span data-text="hero line">{copy('statement').text}</span>
    <Words text={copy('payoff').text} frame={f} start={0} />
    <span>Plinth</span>
    <span>{n} items</span>
  </div>
);
