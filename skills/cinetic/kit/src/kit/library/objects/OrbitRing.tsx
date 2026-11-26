// OrbitRing (object, idle / loop): tiles (icons, cards, chips) ride a flat ellipse round a centre object: large and
// sharp as they pass in front of it left to right, small, soft and dimmer behind it, so the centre sits inside a ring in
// depth.
// Numbers: the ellipse 36 % of W across its half-width and 4 % of H tall; a turn in 150 f (2.4 degrees a frame); tiles
// 112 % in front, 62 % behind, up to 4 px blur and 70 % strength at the back; the tiles enter on the first 10 f
// (scale from 80 %, staggered 1 f); the centre object is drawn between the back and the front halves.
// Caution: 5-9 tiles; the centre object carries the scene (a product, a figure, a phone), the tiles are its world.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';

export const OrbitRing: React.FC<{
  /** The tiles, each drawn centred. */
  items: React.ReactNode[];
  /** The object at the centre (drawn between the back and the front of the ring). */
  centre?: React.ReactNode;
  at?: number;
  /** Half-width and half-height of the ellipse as shares of W and H. */
  rx?: number;
  ry?: number;
  /** Degrees a frame (positive: left to right in front). */
  speed?: number;
  x?: number;
  y?: number;
}> = ({ items, centre, at = 0, rx = 0.36, ry = 0.04, speed = 2.4, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const n = items.length;
  const placed = items.map((node, i) => {
    // angle 90 degrees = in front (bottom of the ellipse); increasing angle moves the front left to right
    const a = ((i / n) * 360 + 200 - t * speed) * (Math.PI / 180);
    const depth = (Math.sin(a) + 1) / 2; // 1 in front, 0 behind
    const enter = ease.out(clamp((t - i) / 10));
    const s = mix(depth, 0.62, 1.12) * mix(enter, 0.8, 1);
    return {
      depth,
      el: (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx + Math.cos(a) * rx * W,
            top: cy + Math.sin(a) * ry * H,
            transform: `translate(-50%, -50%) scale(${s.toFixed(4)})`,
            filter: depth < 0.6 ? `blur(${((0.6 - depth) * 6.6).toFixed(2)}px)` : undefined,
            opacity: mix(depth, 0.7, 1) * enter,
            zIndex: depth < 0.5 ? Math.round(depth * 90) : 110 + Math.round(depth * 100),
          }}
        >
          {node}
        </div>
      ),
    };
  });
  return (
    <AbsoluteFill>
      {placed.map((p) => p.el)}
      {centre && <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)', zIndex: 100 }}>{centre}</div>}
    </AbsoluteFill>
  );
};
