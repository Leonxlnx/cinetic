// Fixture. expect: italic=4 italic:warn=1
import React from 'react';
import { typeStyle } from './tokens';
export const A: React.FC<{ s: number }> = ({ s }) => (
  <>
    <div style={{ fontStyle: 'italic' }}>Leaning.</div>
    <p>
      One <em>word</em>.
    </p>
    <div style={{ ...typeStyle('display'), transform: `skewX(${-12 * s}deg)` }}>Fast.</div>
    <div style={{ fontSize: 120, transform: 'skewX(-10deg)' }}>Faster.</div>
    <div style={{ width: 200, height: 40, transform: `skewX(${-20 * s}deg)` }} />
  </>
);
