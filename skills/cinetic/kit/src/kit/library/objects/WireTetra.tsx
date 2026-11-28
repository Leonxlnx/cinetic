// WireTetra (object, build): a hairline between two vertex dots turns in space; one vertex splits in two and slides
// apart, opening a triangle; a fourth vertex lifts out of it so the shape reads as a wire tetrahedron while the dots
// fade to pure hairlines; its faces fill one at a time with frosted glass, it swings close to the lens, and a warm light
// (white core, amber edge) blooms inside one face with a faint spectrum along an edge.
// Numbers: the segment turns 120 degrees on 0-22 f; the split 22-30 f; the fourth vertex 30-40 f (dots gone by 36 f);
// faces fill 40, 42, 44, 46 f; the swing 48-56 f from 22 % to 72 % of the short side (log scale, in-out; `size`: above about 0.8
// the corners leave the frame); the light from 50 f; then a slow turn (0.6 degrees a frame); hairlines 1.2 px at 55 %
// white.
// Caution: on a near-black ground only; it is an abstract opener (an idea taking form), one in a film.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix, logScale } from '../../motion';
import { useUid } from '../_shared';

type V3 = [number, number, number];
const rotY = ([x, y, z]: V3, a: number): V3 => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rotX = ([x, y, z]: V3, a: number): V3 => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const rotZ = ([x, y, z]: V3, a: number): V3 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
const lerp3 = (p: number, a: V3, b: V3): V3 => [mix(p, a[0], b[0]), mix(p, a[1], b[1]), mix(p, a[2], b[2])];

// a regular tetrahedron: a base triangle in the plane z = 0 (V0 V1 V2) and an apex V3 above it
const R3 = Math.sqrt(3);
const V0: V3 = [0, -1, 0];
const V1: V3 = [0, 1, 0];
const V2: V3 = [R3, 0, 0];
const C: V3 = [R3 / 3, 0, 0];
const V3a: V3 = [R3 / 3, 0, 1.63];

export const WireTetra: React.FC<{
  at?: number;
  line?: string;
  /** The frosted face colour and the light inside. */
  glass?: string;
  core?: string;
  warm?: string;
  /** Final size as a share of the short side. */
  size?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, line = 'rgba(255,255,255,0.55)', glass = '#C9CACF', core = '#FFF6E8', warm = '#F2A44A', size = 0.72, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('wiretetra');
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const split = ease.inOut(clamp((t - 22) / 8));
  const lift = ease.inOut(clamp((t - 30) / 10));
  const pts: V3[] = [V0, V1, lerp3(split, V1, V2), lerp3(lift, lerp3(split, V1, C), V3a)];
  // centre the shape on its current centroid
  const used = split > 0 ? 3 + (lift > 0 ? 1 : 0) : 2;
  const cen: V3 = [0, 0, 0];
  for (let i = 0; i < used; i++) for (let k = 0; k < 3; k++) cen[k] += pts[i][k] / used;
  const swing = ease.inOut(clamp((t - 48) / 8));
  const scale = logScale(0.11, size / 2.2, swing) * Math.min(W, H) * mix(clamp(t / 22), 0.8, 1);
  const yaw = (t < 22 ? mix(ease.inOut(t / 22), -0.6, 1.5) : 1.5 + (t - 22) * 0.035 + swing * 0.5) + Math.max(0, t - 56) * 0.0105;
  const pitch = 0.35 + split * 0.25 - swing * 0.2;
  const roll = -0.35 + lift * 0.3;
  const proj = pts.map((p) => {
    let q: V3 = [p[0] - cen[0], p[1] - cen[1], p[2] - cen[2]];
    q = rotZ(rotX(rotY(q, yaw), pitch), roll);
    const persp = 4.5 / (4.5 - q[2] * 0.6);
    return { x: cx + q[0] * scale * persp, y: cy + q[1] * scale * persp, z: q[2] };
  });
  const edges: Array<[number, number]> = used === 2 ? [[0, 1]] : used === 3 ? [[0, 1], [1, 2], [2, 0]] : [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]];
  const faces: Array<[number, number, number]> = [[0, 1, 2], [0, 1, 3], [1, 2, 3], [0, 2, 3]];
  const dots = 1 - clamp((t - 32) / 4);
  const light = ease.out(clamp((t - 50) / 10));
  const sorted = used === 4 ? faces.map((fc, i) => ({ fc, i, z: (proj[fc[0]].z + proj[fc[1]].z + proj[fc[2]].z) / 3 })).sort((a, b) => a.z - b.z) : [];
  const near = sorted.length ? sorted[sorted.length - 1] : null;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={glass} stopOpacity={0.62} />
            <stop offset="1" stopColor={glass} stopOpacity={0.3} />
          </linearGradient>
          <radialGradient id={`${id}l`}>
            <stop offset="0" stopColor={core} stopOpacity={0.95} />
            <stop offset="0.35" stopColor={warm} stopOpacity={0.75} />
            <stop offset="1" stopColor={warm} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
            {['#FF6B6B', '#FFC66B', '#FFF27A', '#7BE0FF', '#8C9BFF'].map((c, i) => (
              <stop key={c} offset={i / 4} stopColor={c} stopOpacity={0.5} />
            ))}
          </linearGradient>
        </defs>
        {sorted.map(({ fc, i }) => {
          const on = clamp((t - (40 + i * 2)) / 1.5);
          if (on <= 0) return null;
          const d = `M${fc.map((k) => `${proj[k].x} ${proj[k].y}`).join(' L')} Z`;
          return <path key={`f${i}`} d={d} fill={`url(#${id}g)`} opacity={on} />;
        })}
        {near && light > 0 && (() => {
          const [a, b, c] = near.fc.map((k) => proj[k]);
          const gx = (a.x + b.x * 1.4 + c.x * 0.6) / 3;
          const gy = (a.y + b.y * 1.4 + c.y * 0.6) / 3;
          const r = Math.hypot(b.x - a.x, b.y - a.y) * 0.28 * light;
          const clip = `M${a.x} ${a.y} L${b.x} ${b.y} L${c.x} ${c.y} Z`;
          return (
            <g>
              <clipPath id={`${id}c`}>
                <path d={clip} />
              </clipPath>
              <g clipPath={`url(#${id}c)`}>
                <ellipse cx={gx} cy={gy} rx={r * 0.7} ry={r * 1.3} fill={`url(#${id}l)`} />
                <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={`url(#${id}s)`} strokeWidth={scale * 0.05 * light} strokeOpacity={0.7} strokeLinecap="round" />
              </g>
            </g>
          );
        })()}
        {edges.map(([i, j]) => (
          <line key={`${i}-${j}`} x1={proj[i].x} y1={proj[i].y} x2={proj[j].x} y2={proj[j].y} stroke={line} strokeWidth={1.2} />
        ))}
        {dots > 0 && proj.slice(0, used).map((p, i) => <circle key={`d${i}`} cx={p.x} cy={p.y} r={Math.max(2.5, Math.min(W, H) * 0.004)} fill="#FFFFFF" opacity={dots} />)}
      </svg>
    </AbsoluteFill>
  );
};
