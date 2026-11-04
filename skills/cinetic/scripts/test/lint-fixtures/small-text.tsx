// Fixture for scripts/test/lint-film.test.mjs. expect: small-text:warn=3
// Text held in focus is 36 px or more at 1080p: a 24 px label, a 24 px label scaled by U and a role set at 30
// warn; 40 px UI, a size given in another unit and a line marked lint-ok do not.
import React from 'react';
import { typeStyle, U } from './tokens';

export const Labels: React.FC<{ scale: number }> = ({ scale }) => (
  <>
    <span data-text="a" style={{ fontSize: 24 }}>Week 1</span>
    <span data-text="b" style={{ fontSize: 24 * U }}>Week 2</span>
    <span data-text="c" style={typeStyle('caption', 30)}>Week 3</span>
    <span data-text="d" style={{ fontSize: 40 }}>Week 4</span>
    <span data-text="e" style={{ fontSize: 20 * scale }}>Week 5</span>
    {/* lint-ok: blurred far plane, never read */}
    <span data-text="f" style={{ fontSize: 22 }}>Week 6</span>
  </>
);
