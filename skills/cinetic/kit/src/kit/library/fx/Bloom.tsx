// Bloom (fx, emphasis / idle): light that spills in its own colour: a blurred copy added on top, swelling once on a
// hit.
// Numbers: blur 18-40 px at 30-45 %; a pulse to about 2x over 3 f and back over 12-14 f.
// Caution: dark grounds only; on a light ground it greys the picture.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease } from '../../motion';

/**
 * Bloom: light that spills in its own colour. A blurred copy of the content added on top (screen), so bright parts glow
 * and dark parts do nothing; `pulse` swells it once (a hit, a reveal).
 * Measured: blur 18-40 px at 30-45 %; a pulse to ~2x strength over 3 f, back over 12 f.
 */
export const Bloom: React.FC<{ radius?: number; strength?: number; pulse?: { at: number; up?: number; down?: number; gain?: number }; children: React.ReactNode; style?: React.CSSProperties }> = ({
  radius = 28,
  strength = 0.4,
  pulse,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  let k = 1;
  if (pulse) {
    const up = at01(frame, pulse.at, pulse.up ?? 3);
    const down = at01(frame, pulse.at + (pulse.up ?? 3), pulse.down ?? 12);
    k = 1 + ((pulse.gain ?? 2) - 1) * (ease.out(up) - ease.inOut(down));
  }
  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${radius}px)`, opacity: clamp(strength * k), mixBlendMode: 'screen', pointerEvents: 'none' }}>{children}</div>
    </div>
  );
};

const at01 = (f: number, a: number, d: number) => clamp((f - a) / Math.max(1, d));
