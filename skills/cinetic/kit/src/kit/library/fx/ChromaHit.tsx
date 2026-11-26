// ChromaHit (fx, emphasis): on an impact the colour channels split for two frames and snap back.
// Numbers: 2 f at 14 px then 10 px, clean on the third.
// Caution: one or two hits a film; wrap the object, never the whole frame.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SplitFilter, useUid } from '../_shared';

/**
 * ChromaHit: on an impact the channels split for two frames and snap back, with a small push. Wrap the thing that lands
 * (a word, a mark, the whole frame).
 * Measured: 2 f at ~10 px then ~5 px, 0 on the third. No push, no shake: the object's own landing does the moving.
 */
export const ChromaHit: React.FC<{ at: number; px?: number; frames?: number; angle?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at: start,
  px = 10,
  frames = 2,
  angle = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const uid = useUid('ch');
  const i = frame - start;
  const d = i >= 0 && i < frames ? px * (1 - i / frames / 2) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {d > 0 && <SplitFilter id={`${uid}${i}`} d={d} angle={angle} />}
      <div style={{ position: 'absolute', inset: 0, filter: d > 0 ? `url(#${uid}${i})` : undefined }}>{children}</div>
    </div>
  );
};
