// TechGrid (ground, build / idle): a black drafting table: dashed or solid rules drawn out of the centre, square ticks
// at the crossings (a few of them in one signal colour) and a thin ring that draws itself round the subject.
// Numbers: ground #050506, rules #303238 at 1 px, dash 6/6 px, cells 22 % of the height; ticks 3 px squares at 1080; the
// ring 1 px, radius 0.45 of the short side, drawn over 30 f to 300 degrees.
// Caution: one signal colour on under 3 % of the frame; labels at the grid's corners stay tiny and in sentence case.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, ease, rand } from '../../motion';
import { gridLines, hair, HairlineSvg, lineReveal, unit } from './_shared';

/**
 * TechGrid: rules on black that grow from the centre crossing, ticks where they cross (one in `signalEvery` in the
 * signal colour), and an optional partial ring (`ring`) that draws itself from `ring.at`.
 */
export const TechGrid: React.FC<{
  at?: number;
  dur?: number;
  ground?: string;
  color?: string;
  cell?: number;
  /** Dash in px at 1080 (0: solid). */
  dash?: number;
  tick?: string;
  signal?: string;
  /** One crossing in n carries a signal tick (0: none). */
  signalEvery?: number;
  ring?: { at: number; r?: number; sweep?: number; color?: string; dur?: number };
  drift?: [number, number];
  seed?: number;
}> = ({ at = 0, dur = 18, ground = '#050506', color = '#303238', cell = 0.22, dash = 6, tick = '#D9D9D9', signal = '#FFB020', signalEvery = 7, ring, drift = [0, 0], seed = 3 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const u = unit(Math.min(W, H));
  const c = cell * H;
  const ox = (drift[0] * c * f) / fps;
  const oy = (drift[1] * c * f) / fps;
  const lines = gridLines(W, H, c, ox, oy);
  const vs = lines.filter((l) => l.kind === 'v');
  const hs = lines.filter((l) => l.kind === 'h');
  const ts = 3 * u;
  const rp = ring ? prog(f, ring.at, ring.dur ?? 30, ease.inOut) : 0;
  const rr = (ring?.r ?? 0.45) * Math.min(W, H);
  const sweep = (ring?.sweep ?? 300) * rp;
  const a0 = -100;
  const arc = (deg: number) => {
    const a = ((a0 + deg) * Math.PI) / 180;
    return [W / 2 + rr * Math.cos(a), H / 2 + rr * Math.sin(a)];
  };
  const [sx, sy] = arc(0);
  const [ex, ey] = arc(sweep);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <HairlineSvg w={W} h={H} lines={lines} color={color} width={hair(u)} dash={dash * u} reveal={(l) => lineReveal(f, at, l.index, dur, 3)} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {vs.flatMap((v) =>
          hs.map((h) => {
            const p = Math.min(lineReveal(f, at, v.index, dur, 3), lineReveal(f, at, h.index, dur, 3));
            if (p < 0.98) return null;
            const isSignal = signalEvery > 0 && rand(seed + v.index * 31 + h.index * 57) < 1 / signalEvery;
            return <rect key={`${v.index}:${h.index}`} x={v.pos - ts / 2} y={h.pos - ts / 2} width={ts} height={ts} fill={isSignal ? signal : tick} shapeRendering="crispEdges" />;
          }),
        )}
        {ring && rp > 0 && <path d={`M${sx} ${sy}A${rr} ${rr} 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`} fill="none" stroke={ring.color ?? '#B07A36'} strokeWidth={hair(u)} />}
      </svg>
    </AbsoluteFill>
  );
};
