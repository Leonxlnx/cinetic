// DotCanvas (host, idle): a design canvas's dot grid, moved under the chrome with the camera.
// Numbers: a dot every `pitch` px on the canvas ground.
// Caution: none beyond the section's rules.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';

// =====================================================================================================================
// A design canvas's app chrome (the product's own canvas: a design tool, a whiteboard, an editor)
// =====================================================================================================================

/** The canvas itself: a ground with a dot grid at `pitch`. */
export const DotCanvas: React.FC<{ w: number | string; h: number | string; pitch?: number; ground?: string; dot?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ w, h, pitch = 32, ground = '#F4F5F7', dot = 'rgba(21,23,28,0.13)', style, children }) => (
  <div style={{ position: 'absolute', width: w, height: h, background: ground, backgroundImage: `radial-gradient(circle, ${dot} 1.3px, transparent 1.6px)`, backgroundSize: `${pitch}px ${pitch}px`, backgroundPosition: `${pitch / 2}px ${pitch / 2}px`, ...style }}>
    {children}
  </div>
);
