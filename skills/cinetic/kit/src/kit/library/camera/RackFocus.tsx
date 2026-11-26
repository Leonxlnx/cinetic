// RackFocus (camera, enter, emphasis): the lens finds its subject: the shot arrives out of focus and snaps sharp (a screen's
// contents soft for the first frames, then crisp, under a slow push); or a breath: the whole picture softens for a moment
// and refocuses as the scene changes state.
// Numbers: snap: held soft (10-12 px) for 6 f, sharp on the next frame, under a 3 % push over the shot; breath: soft to
// 8 px and back in 6 f (2 up, 4 down). Wrap only what the lens misses (a screen's contents, the picture behind a card).
// Caution: one per scene, on the thing the viewer must read next; text under a long blur is unreadable, so keep the soft
// part short.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease } from '../../motion';

/**
 * RackFocus: `children` soft by `blur` px until `at + hold`, sharp over `snap` frames (mode `snap`), or softened and
 * refocused around `at` (mode `breath`); `push` a slow push over `pushDur` frames from `at`. It fills its parent: wrap a
 * screen's contents inside the screen's frame (the frame stays sharp), or the whole shot.
 */
export const RackFocus: React.FC<{
  at: number;
  mode?: 'snap' | 'breath';
  blur?: number;
  hold?: number;
  snap?: number;
  push?: number;
  pushDur?: number;
  children: React.ReactNode;
}> = ({ at, mode = 'snap', blur = 11, hold = 6, snap = 1, push = 0.03, pushDur = 60, children }) => {
  const frame = useCurrentFrame();
  let b = 0;
  if (mode === 'snap') {
    b = frame < at + hold ? blur : blur * (1 - clamp((frame - at - hold + 1) / snap));
  } else {
    const d = frame - at;
    b = d < 0 ? 0 : d < 2 ? blur * ((d + 1) / 2) : blur * (1 - ease.out(clamp((d - 1) / 4)));
  }
  const z = 1 + push * ease.out(clamp((frame - at) / pushDur));
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${z})`, filter: b > 0.25 ? `blur(${b.toFixed(2)}px)` : undefined }}>{children}</div>
    </div>
  );
};
