// PullReveal (camera, enter, join): from a close view of one thing the camera pulls back hard to the whole of it (a card
// in its feed, a window on its desk, a message in its thread), blurred in the fast frames, then keeps a slow drift back.
// Numbers: 2.4x to 1x in 4 f with the progress 10 %, 92 %, 97 %, 100 % (a slow first frame, then nearly all of it in
// one); blur up to 14 px on the fast frame; then 3 % more back over the next 60 f.
// Caution: the close view must already be legible (lay the scene out at its final size and start close on it); a pull
// back to an empty frame shows nothing new.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, logScale, mix } from '../../motion';

/** The measured progress of the pull, frame by frame (4 f at speed 1). */
const STEPS = [0, 0.1, 0.92, 0.97, 1];
const stepAt = (t: number) => {
  const u = clamp(t) * (STEPS.length - 1);
  const i = Math.min(STEPS.length - 2, Math.floor(u));
  return mix(u - i, STEPS[i], STEPS[i + 1]);
};

/**
 * PullReveal: `children` laid out at their final framing; before `at` the camera holds close on the point (`fx`, `fy`) at
 * `from` zoom (with a slow creep in), from `at` it pulls back to 1 in `dur` frames, then drifts on back by `settle`.
 */
export const PullReveal: React.FC<{
  at: number;
  /** Frames of the pull (4 measured). */
  dur?: number;
  speed?: number;
  /** Zoom of the close view. */
  from?: number;
  /** The point the close view is on, px of the frame (default the centre). */
  fx?: number;
  fy?: number;
  /** Peak blur in px on the fast frame. */
  blur?: number;
  /** How much further back it drifts after landing (0.03 = 3 %), over `settleDur` frames. */
  settle?: number;
  settleDur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, dur = 4, speed = 1, from = 2.4, fx, fy, blur = 14, settle = 0.03, settleDur = 60, children, style }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = fx ?? W / 2;
  const py = fy ?? H / 2;
  const d = Math.max(1, dur / speed);
  const t = (frame - at) / d;
  const p = stepAt(t);
  const pPrev = stepAt((frame - 1 - at) / d);
  // before the pull a slow creep in (the close view is alive); after it a slow drift back
  const pre = frame < at ? 1 + 0.02 * ease.out(clamp((frame - (at - 40)) / 40)) : 1;
  const after = 1 - settle * ease.out(clamp((frame - at - d) / settleDur));
  const z = logScale(from * pre, 1, p) * after;
  // the close point sits at the frame's centre and travels to its own place as the camera pulls back
  const tx = mix(p, W / 2 - px, 0);
  const ty = mix(p, H / 2 - py, 0);
  const b = Math.min(blur, Math.abs(p - pPrev) * blur * 1.15);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: `${px}px ${py}px`, filter: b > 0.3 ? `blur(${b.toFixed(2)}px)` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
