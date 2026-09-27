import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Mark } from './brand/Mark';
import { C, U } from './brand/tokens';

// Style frames: rendered with `npm run stills` and looked at before any animation is built.
// The mark must hold up at favicon size and at full screen, on paper and on ink.

export const MarkStill: React.FC<{ size: number; surface: 'paper' | 'ink' }> = ({ size, surface }) => (
  <AbsoluteFill style={{ background: surface === 'ink' ? C.ink : C.paper, alignItems: 'center', justifyContent: 'center' }}>
    <Mark size={size} ink={surface === 'ink' ? C.paper : C.ink} />
  </AbsoluteFill>
);

const SIZES = [16, 24, 32, 48, 64, 128, 256];

/** The mark at every working size on both surfaces: gaps must stay open and the dot must read. */
export const MarkSizes: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    {(['paper', 'ink'] as const).map((surface) => (
      <div
        key={surface}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64 * U, background: surface === 'ink' ? C.ink : C.paper }}
      >
        {SIZES.map((s) => (
          <Mark key={s} size={s * U} ink={surface === 'ink' ? C.paper : C.ink} />
        ))}
      </div>
    ))}
  </AbsoluteFill>
);
