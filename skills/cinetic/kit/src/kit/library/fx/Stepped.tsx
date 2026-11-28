// Stepped (fx, idle, build): a treatment that wraps any move: its children are drawn on twos (or held 2-5 f a step, the
// stop-motion clock), each step may sit a hair off (a cut-out laid by hand), while film grain is re-seeded on every frame
// so the held drawing stays alive.
// Numbers: `n` 2 (on twos) for drawn graphics, 3-5 for stop-motion collage; jitter 0-3 px and 0-1.2 deg a step; grain
// the kit's Grain at 0.04-0.06, moving every frame.
// Caution: two clocks read handmade (the camera smooth, the drawing stepped): keep camera moves outside it; never step
// typing or a counting number.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { onTwos, rand } from '../../motion';
import { Grain } from '../../world';

/**
 * Stepped: `children` advance on a stepped clock (every `n` frames), each step optionally nudged by a seeded `jitter`,
 * with `grain` on top re-seeded every frame. Wrap the drawing, not the camera.
 */
export const Stepped: React.FC<{
  /** Frames a step is held: 2 on twos, 3-5 stop-motion. */
  n?: number;
  /** Px a step may sit off its place (0: none). */
  jitter?: number;
  /** Degrees a step may turn (0: none). */
  turn?: number;
  /** The kit's Grain amount (0.03-0.06; 0: none); on a light ground it shows only with `force`. */
  grain?: number;
  force?: boolean;
  seed?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ n = 2, jitter = 0, turn = 0, grain = 0.05, force = false, seed = 5, children, style }) => {
  const frame = useCurrentFrame();
  const held = onTwos(frame, Math.max(1, Math.round(n)));
  const k = Math.floor(held / Math.max(1, n));
  const dx = jitter ? (rand(seed * 31 + k * 7) - 0.5) * 2 * jitter : 0;
  const dy = jitter ? (rand(seed * 53 + k * 11) - 0.5) * 2 * jitter : 0;
  const dr = turn ? (rand(seed * 71 + k * 13) - 0.5) * 2 * turn : 0;
  return (
    <AbsoluteFill style={style}>
      <AbsoluteFill style={{ transform: dx || dy || dr ? `translate(${dx}px, ${dy}px) rotate(${dr}deg)` : undefined }}>
        <Freeze frame={held}>{children}</Freeze>
      </AbsoluteFill>
      {grain > 0 && <Grain amount={grain} force={force} />}
    </AbsoluteFill>
  );
};
