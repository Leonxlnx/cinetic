// Fixture for scripts/test/lint-film.test.mjs. expect: filler-plate:warn=3 filler-light:warn=2
// Every element in frame has a job; light is motivated and subtle. Blank boxes generated round a line, depth-stack
// items that do not say what they carry, a baked pool over the ground and ground plates with no light named for them
// warn; boxes that carry a line, items that carry content and a clean ground pass.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { DepthStack, type DepthItem } from './DepthStack';
import { dealGrounds, LitGround } from './Grounds';

const GROUND = '#1B1E21';
const RAISED = '#24282C';

export const Bad: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: GROUND }}>
    <Img src={staticFile('fx/pool.png')} style={{ position: 'absolute', inset: 0 }} />
    {Array.from({ length: 7 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', transform: `translate3d(${i * 240}px, ${f * 0.2}px, 0)` }}>
        <div style={{ width: 300, height: 180, borderRadius: 40, background: RAISED, opacity: 0.4 }} />
      </div>
    ))}
  </AbsoluteFill>
);

const blankItems: DepthItem[] = [
  { id: 'a', plane: 'far', x: 300, y: 300, w: 300, h: 300 },
  { id: 'b', plane: 'near', x: 1700, y: 200, w: 280, h: 280 },
];

export const BadStack: React.FC<{ f: number }> = ({ f }) => (
  <DepthStack frame={f} items={blankItems} render={() => null} />
);

export const badGrounds = dealGrounds(6, { bases: [GROUND], kinds: ['pools', 'wash'] });

const items: DepthItem[] = [
  { id: 'c', plane: 'far', carries: 'ui', x: 300, y: 300, w: 300, h: 300 },
  { id: 'd', plane: 'mid', carries: 'text', x: 960, y: 540, w: 600, h: 120 },
];

export const Good: React.FC<{ f: number; rows: { id: string; label: string }[] }> = ({ f, rows }) => (
  <AbsoluteFill>
    <LitGround frame={f} spec={{ kind: 'wash', base: GROUND }} />
    {rows.map((r) => (
      <div key={r.id} data-ui style={{ background: RAISED, borderRadius: 24, padding: 32 }}>
        <span data-text={r.id}>{r.label}</span>
      </div>
    ))}
    <DepthStack frame={f} items={items} render={(id) => <span data-text={id}>{id}</span>} />
  </AbsoluteFill>
);

export const goodGrounds = dealGrounds(6, { bases: [GROUND], kinds: ['flat', 'wash'] });
