// PullTilt (camera, enter, idle): the camera starts close on a corner of a card (its title, its first line) and pulls back
// while swinging round it, so the card turns in perspective (its far side receding, a slight lean) and its footer comes
// into view; it keeps drifting back and turning to the end of the shot.
// Numbers: 2.2x to 1x in 11 f on an in-out, blurred on the fast frames (up to 6 px); to about -24 deg of turn, 12 deg of
// tilt and -3 deg of roll; then 4 % further back and 5 deg more turn over the next 60 f; a slow creep before the pull.
// Caution: the card must be finished and legible at the close view; the turn reveals depth, so give the card a real
// shadow and a ground with some light.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Camera, camSmear, type CamKey } from '../../camera';
import { ease } from '../../motion';

/**
 * PullTilt: `children` laid out at their final framing (the card at the frame's centre); the camera holds at `from` zoom on
 * the point (`fx`, `fy`) until `at`, pulls back and swings to (`turn`, `tilt`, `roll`) over `dur` frames, then drifts on.
 */
export const PullTilt: React.FC<{
  at: number;
  dur?: number;
  from?: number;
  /** The close view's point, px of the frame (default a third in from the top-left). */
  fx?: number;
  fy?: number;
  turn?: number;
  tilt?: number;
  roll?: number;
  /** Frames of the drift after the pull. */
  drift?: number;
  children: React.ReactNode;
}> = ({ at, dur = 11, from = 2.2, fx, fy, turn = -24, tilt = 12, roll = -3, drift = 60, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = (fx ?? W * 0.34) - W / 2;
  const py = (fy ?? H * 0.36) - H / 2;
  const keys: CamKey[] = [
    { f: at - 30, x: px, y: py, zoom: from * 0.97 },
    { f: at, x: px, y: py, zoom: from, curve: ease.linear },
    { f: at + dur, x: 0, y: 0, zoom: 1, ry: turn, rx: tilt, rz: roll, curve: ease.inOut },
    { f: at + dur + drift, x: W * 0.01, y: 0, zoom: 0.96, ry: turn - 5, rx: tilt + 1, rz: roll - 0.5, curve: ease.out },
  ];
  const blur = Math.min(6, camSmear(frame, keys, 0.5, 6));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Camera keys={keys} perspective={W * 1.3}>
        <AbsoluteFill style={{ filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined }}>{children}</AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};
