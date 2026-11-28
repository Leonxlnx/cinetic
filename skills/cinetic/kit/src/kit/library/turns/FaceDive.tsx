// FaceDive (turn, join): the camera dives into one face of an object (a hexagon cube face, a tile, a badge) whose
// inside already shows the next scene; the face outruns the picture inside it until its outline passes the frame.
// Numbers: 12 f; the face grows by a constant ratio a frame (about x1.12, 0.3 to 1.15 of the width) and drifts to the
// centre; the scene inside goes 0.85 to 1 (never less than the part of the frame the face spans); the rest of the old scene pushes in a third as fast.
// Caution: draw the same face, with the same preview, in the old scene (or use `preview`); the face must be the subject;
// give it its solid (`solid`) so it reads as an object, not a cut-out.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, logScale, mix } from '../../motion';
import { shade } from '../../world';
import { type Scenes, sp } from './_shared';

const polygon = (cx: number, cy: number, R: number, n: number, rot: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 * i) / n) * Math.PI) / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const;
  });

/**
 * FaceDive: a dive through a polygon face (a hexagon by default, as an isometric cube shows it) into the scene it holds.
 * The face's radius grows by the same ratio every frame (log-linear: the outline seems to rush past), its centre drifts to
 * the frame's centre on an in-out, and the next scene inside grows much less (0.85 to 1), so the face outruns its
 * picture; on its last frame the face's inner circle contains the frame's corners. The rest of the old scene pushes in with
 * the camera at a third of the rate. Measured: 12 f, width 0.30, 0.40, 0.55, 0.65, 0.75 ... 1.15 of the frame.
 */
export const FaceDive: React.FC<
  Scenes & {
    /** The face's centre and circumradius in the old scene. */
    x: number;
    y: number;
    r: number;
    /** Number of sides (6: a hexagon; 4 with rot 45: a square tile) and the rotation of the first vertex (deg). */
    sides?: number;
    rot?: number;
    dur?: number;
    /** Scale of the next scene inside the face at the start. */
    plate?: number;
    /** How much the rest of the old scene follows the dive (0: still, 1: as fast as the face). */
    push?: number;
    /** Frames before `at` in which the face is already drawn, still, showing its preview. */
    preview?: number;
    /** A rim on the face's outline (its edge colour), fading as it grows. */
    color?: string;
    /** The solid under the face: its colour (the sides are drawn in two shades of it, lit from the left) and its depth
     * as a share of `r`. The sides are extruded down from the face's lower edges, so the face reads as an object. */
    solid?: string;
    depth?: number;
  }
> = ({ from, to, at: start, speed = 1, x, y, r, sides = 6, rot = -90, dur = 12, plate = 0.85, push = 0.3, preview = 0, color, solid, depth = 0.5 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start - preview) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const n = Math.max(3, Math.round(sides));
  const Rend = Math.hypot(W / 2, H / 2) / Math.cos(Math.PI / n) + 6;
  const p = frame < start ? 0 : D > 1 ? (frame - start) / (D - 1) : 1;
  const R = logScale(r, Rend, p);
  const m = ease.inOut(p);
  const cx = mix(m, x, W / 2);
  const cy = mix(m, y, H / 2);
  const zoom = Math.pow(R / r, push);
  // the picture inside grows slower than the face, but never so slow that the face shows past its edge inside the
  // frame (that read as dark wedges in the corners for a frame or two): it covers the part of the frame the face spans
  const spanX = Math.max(cx - Math.max(0, cx - R), Math.min(W, cx + R) - cx) / (W / 2);
  const spanY = Math.max(cy - Math.max(0, cy - R), Math.min(H, cy + R) - cy) / (H / 2);
  const ps = Math.max(mix(p, plate, 1), spanX, spanY);
  const pts = polygon(cx, cy, R, n, rot);
  const clip = `polygon(${pts.map(([a, b]) => `${a.toFixed(1)}px ${b.toFixed(1)}px`).join(', ')})`;
  // the solid's side faces: each lower edge of the face extruded straight down, the left-facing one lighter
  const dz = depth * R;
  const sidesPath: Array<[string, string]> = [];
  if (solid) {
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % n];
      // outward normal (dy, -dx): the vertices run clockwise on screen (y down)
      const nx = by - ay;
      const ny = ax - bx;
      if (ny <= 0.01 * R) continue;
      sidesPath.push([`${ax},${ay} ${bx},${by} ${bx},${by + dz} ${ax},${ay + dz}`, shade(solid, nx < 0 ? -0.12 : -0.3)]);
    }
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${cx - x * zoom}px, ${cy - y * zoom}px) scale(${zoom})` }}>{from}</AbsoluteFill>
      {sidesPath.length > 0 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {sidesPath.map(([d, c], i) => (
            <polygon key={i} points={d} fill={c} />
          ))}
        </svg>
      )}
      <AbsoluteFill style={{ clipPath: clip }}>
        <AbsoluteFill style={{ transform: `translate(${cx - W / 2}px, ${cy - H / 2}px) scale(${ps})` }}>{to}</AbsoluteFill>
      </AbsoluteFill>
      {color && p < 0.8 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 1 - p / 0.8 }}>
          <polygon points={pts.map(([a, b]) => `${a},${b}`).join(' ')} fill="none" stroke={color} strokeWidth={Math.max(2, (R / r) * 3)} strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
