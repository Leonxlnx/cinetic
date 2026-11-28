// IsoFloor (ground, build): a flat poster field ruled by a grid a shade darker than itself, which tilts from facing
// the lens into an isometric floor (and back), with flat tiles lying on it.
// Numbers: grid lines 12 % darker than the field, 1 px, cells 1/6 of the height; the tilt to 55 degrees back and -22
// round takes 12 f (in-out, about 60 % of it in the middle 4 f), scale 1 to 0.9; a long lens (perspective 6000 px at
// 1080) so it reads nearly orthographic.
// Caution: one field colour a section; change the field by a cut or a flood, never by fading; no shadows on the
// floor, depth comes from the faces of what stands on it (a tile's `lift` raises it into a block with darker sides).
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, ease } from '../../motion';
import { shade } from '../../world';

/** A tile lying on the floor: its cell (x, y from the centre crossing), size in cells and colour; `lift` (in cells)
 * raises it into a block whose sides are drawn a shade darker, so it stands on the floor once the floor tilts. */
export type FloorTile = { x: number; y: number; w?: number; h?: number; color: string; lift?: number };

/**
 * IsoFloor: `field` colour; tilts to isometric from `at` over `dur` (and back from `flatAt`); `tiles` lie flat on the
 * floor. Drawn as a projected SVG (cheap to render): the grid and the tiles turn exactly as one plane.
 */
export const IsoFloor: React.FC<{
  at?: number;
  dur?: number;
  flatAt?: number;
  field?: string;
  line?: string;
  cell?: number;
  /** Pan of the floor in cells a second, [x, y]. */
  pan?: [number, number];
  tiles?: FloorTile[];
  /** Back tilt and turn at full tilt (degrees) and the scale. */
  tilt?: number;
  turn?: number;
  scale?: number;
}> = ({ at = 0, dur = 12, flatAt, field = '#FF6B1A', line, cell = 1 / 6, pan = [0, 0], tiles = [], tilt = 55, turn = -22, scale = 0.9 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const u = H / 1080;
  const t = prog(f, at, dur, ease.inOut) * (flatAt === undefined ? 1 : 1 - prog(f, flatAt, dur, ease.inOut));
  const c = cell * H;
  const lc = line ?? shade(field, -0.12);
  const ax = (tilt * t * Math.PI) / 180;
  const az = (turn * t * Math.PI) / 180;
  const s = 1 + (scale - 1) * t;
  const P = 6000 * u;
  const px = (pan[0] * c * f) / fps;
  const py = (pan[1] * c * f) / fps;
  // plane point (x, y) about the centre -> screen (CSS order: scale, rotateZ, rotateX, perspective)
  // `up` lifts the point off the plane along its normal (towards the lens when the floor faces it)
  const proj3 = (x: number, y: number, up: number) => {
    const X = (x + px) * s;
    const Y = (y + py) * s;
    const U = up * s;
    const xr = X * Math.cos(az) - Y * Math.sin(az);
    const yr = X * Math.sin(az) + Y * Math.cos(az);
    const y2 = yr * Math.cos(ax) - U * Math.sin(ax);
    const z = yr * Math.sin(ax) + U * Math.cos(ax);
    const k = P / (P - z);
    return { p: [W / 2 + xr * k, H / 2 + y2 * k], z };
  };
  const proj = (x: number, y: number) => proj3(x, y, 0).p;
  const reach = Math.ceil((Math.max(W, H) * 2.2) / c);
  const L = reach * c;
  const lw = Math.max(1, u);
  const lines: string[] = [];
  for (let i = -reach; i <= reach; i++) {
    const a = proj(i * c, -L);
    const b = proj(i * c, L);
    const d = proj(-L, i * c);
    const e = proj(L, i * c);
    lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${d[0]} ${d[1]}L${e[0]} ${e[1]}`);
  }
  return (
    <AbsoluteFill style={{ background: field, overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <path d={lines.join('')} stroke={lc} strokeWidth={lw} fill="none" />
        {tiles.map((tl, i) => {
          const x0 = tl.x * c;
          const y0 = tl.y * c;
          const x1 = x0 + (tl.w ?? 1) * c;
          const y1 = y0 + (tl.h ?? 1) * c;
          const lift = (tl.lift ?? 0) * c;
          const corners: Array<[number, number]> = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
          const top = corners.map(([x, y]) => proj3(x, y, lift).p.join(',')).join(' ');
          if (lift <= 0) return <polygon key={i} points={top} fill={tl.color} />;
          // the four sides, far ones first, each a shade darker than the top (the two facing the light less so)
          const sides = corners.map((a, j) => {
            const b = corners[(j + 1) % 4];
            const q = [proj3(a[0], a[1], 0), proj3(b[0], b[1], 0), proj3(b[0], b[1], lift), proj3(a[0], a[1], lift)];
            return { pts: q.map((v) => v.p.join(',')).join(' '), z: q.reduce((m, v) => m + v.z, 0) / 4, tone: shade(tl.color, j % 2 ? -0.3 : -0.16) };
          });
          sides.sort((m, n) => m.z - n.z);
          return (
            <g key={i}>
              {sides.map((sd, j) => (
                <polygon key={j} points={sd.pts} fill={sd.tone} />
              ))}
              <polygon points={top} fill={tl.color} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
