// Fixture for scripts/test/lint-film.test.mjs. expect: end-card-template:warn=1
// A mark, a wordmark and a tagline centred over a radial gradient is the stock end card; the same lockup built
// off-centre on a lit plane, with no radial plate behind it, is not.
import React from 'react';
import { Words } from './Words';
import { Mark } from './Mark';
import { C, typeStyle } from './tokens';

export const StockEnd: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 55%, ${C.ink2} 0%, ${C.ink} 60%)` }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Mark size={168} />
        <div style={typeStyle('display')}>Kitewing</div>
      </div>
      <Words frame={f} text="Review desk for shoots." start={6} style={typeStyle('caption')} />
    </div>
  </div>
);

export const DeviceEnd: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: 'absolute', inset: 0, background: C.slate }}>
    <div style={{ position: 'absolute', left: 140, top: 520, transform: `translateX(${f * 0.4}px)` }}>
      <Mark size={420} />
      <div style={typeStyle('display')}>Kitewing</div>
    </div>
  </div>
);
