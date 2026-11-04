// Fixture for scripts/test/lint-film.test.mjs. expect: type-role:warn=2
// In an act, a font size that is not a type role warns (72), and so does a third non-UI role
// (line, display, hero); 84 px (the calm line), 120 px (the bold family's line) and the ui role do not.
import React from 'react';
import { typeStyle } from './tokens';

export const ActX: React.FC<{ a: string }> = ({ a }) => (
  <>
    <span data-text="a" style={{ ...typeStyle('line') }}>{a}</span>
    <span data-text="b" style={{ ...typeStyle('display') }}>{a}</span>
    <span data-text="c" style={{ ...typeStyle('ui') }}>{a}</span>
    <span data-text="d" style={{ ...typeStyle('hero') }}>{a}</span>
    <span data-text="e" style={{ fontSize: 72 }}>{a}</span>
    <span data-text="f" style={{ fontSize: 84 }}>{a}</span>
    <span data-text="g" style={{ fontSize: 120 }}>{a}</span>
  </>
);
