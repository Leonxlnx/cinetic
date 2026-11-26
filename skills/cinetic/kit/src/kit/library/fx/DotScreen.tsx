// DotScreen (fx, idle / join): the content seen through a grid of round dots, an LED board or a coarse halftone;
// animate the dot size to turn.
// Numbers: an 11-16 px pitch, dots 0.8 of it, unlit dots about 9 % on black.
// Caution: words through it need weight 700+ and 300 px+; animate dot, never toggle amount.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';

/**
 * DotScreen: the content seen through a grid of round dots, an LED board or a coarse halftone; unlit dots can show
 * faintly so the grid reads on dark. `amount` blends it with the plain content (key it on for a few frames, or hold it).
 * Measured: an 11-16 px pitch, dots ~0.8 of the pitch; unlit dots ~10 % on black.
 */
export const DotScreen: React.FC<{
  pitch?: number;
  dot?: number;
  amount?: number;
  /** The colour of unlit dots ('' for none). */
  off?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ pitch = 14, dot = 0.8, amount = 1, off = 'rgba(255,255,255,0.09)', children, style }) => {
  const r = (pitch * dot) / 2;
  const mask = `radial-gradient(circle at ${pitch / 2}px ${pitch / 2}px, #000 ${r - 0.6}px, transparent ${r + 0.6}px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {amount < 1 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - amount }}>{children}</div>}
      {off && amount > 0 && <div style={{ position: 'absolute', inset: 0, opacity: amount, backgroundImage: mask.replace('#000', off), backgroundSize: `${pitch}px ${pitch}px` }} />}
      {amount > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: amount, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: `${pitch}px ${pitch}px`, maskSize: `${pitch}px ${pitch}px` }}>{children}</div>
      )}
    </div>
  );
};
