// FloorTilt (camera, build, join): the flat ground the words were set on tilts away into a floor seen from above, turned
// a little, so the line that faced the camera now lies on the floor and the next things can stand or land on it; the
// reverse flattens a floor back to a page.
// Numbers: 12-14 f on a slow-start in-out (the first 5 f barely move: a small roll of 1-2 deg; then most of the tilt in
// 4 f); to about 55 deg of tilt and -22 deg of turn, the plane 0.92x; grid lines 1-2 px at the plane's ink.
// Caution: the plane must carry something (a grid, the line, a block) so the tilt reads; set what lands on the floor
// after the tilt, not during it.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, logScale, mix, type Ease } from '../../motion';

type Pose = { tilt?: number; turn?: number; zoom?: number; y?: number };

/**
 * FloorTilt: `children` laid out on a full-frame plane (with an optional grid), posed by `from` before `at` and by `to`
 * after `at + dur`. `tilt` leans the plane back (deg), `turn` rotates it on the floor (deg), `zoom` scales, `y` moves its
 * centre (px, down). Flatten a floor with `from={{ tilt: 55, turn: -22 }} to={{}}`.
 */
export const FloorTilt: React.FC<{
  at: number;
  dur?: number;
  from?: Pose;
  to?: Pose;
  curve?: Ease;
  /** The plane's colour (it extends far past the frame so its edge never shows). */
  ground?: string;
  /** Grid cell in px (0: no grid) and the grid's colour. */
  grid?: number;
  ink?: string;
  /** Perspective in px (default 1.1x the frame width). */
  perspective?: number;
  children?: React.ReactNode;
}> = ({ at, dur = 13, from = {}, to = { tilt: 55, turn: -22, zoom: 0.92, y: 60 }, curve = ease.inOut, ground = '#E8ECEF', grid = 0, ink = 'rgba(18,20,24,0.55)', perspective, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const p = curve(clamp((frame - at) / dur));
  const tilt = mix(p, from.tilt ?? 0, to.tilt ?? 0);
  const turn = mix(p, from.turn ?? 0, to.turn ?? 0);
  const zoom = logScale(from.zoom ?? 1, to.zoom ?? 1, p);
  const y = mix(p, from.y ?? 0, to.y ?? 0);
  const big = 4;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', perspective: perspective ?? W * 1.1, perspectiveOrigin: '50% 35%', background: ground }}>
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `translateY(${y}px) scale(${zoom}) rotateX(${tilt}deg) rotateZ(${turn}deg)`, transformOrigin: '50% 50%' }}>
        <div
          style={{
            position: 'absolute',
            left: (-(big - 1) / 2) * W,
            top: (-(big - 1) / 2) * H,
            width: big * W,
            height: big * H,
            background: ground,
          }}
        />
        {grid > 0 && (
          // vector lines (a repeating gradient breaks into dashes once the plane is tilted)
          <svg style={{ position: 'absolute', left: (-(big - 1) / 2) * W, top: (-(big - 1) / 2) * H }} width={big * W} height={big * H}>
            {Array.from({ length: Math.ceil((big * W) / grid) + 1 }, (_, i) => {
              const x = ((((big - 1) / 2) * W + W / 2) % grid) + i * grid;
              return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={big * H} stroke={ink} strokeWidth={2} />;
            })}
            {Array.from({ length: Math.ceil((big * H) / grid) + 1 }, (_, i) => {
              const y = ((((big - 1) / 2) * H + H / 2) % grid) + i * grid;
              return <line key={`h${i}`} x1={0} y1={y} x2={big * W} y2={y} stroke={ink} strokeWidth={2} />;
            })}
          </svg>
        )}
        <AbsoluteFill>{children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
