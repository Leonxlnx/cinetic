// PenMarks (fx, emphasis): a narrator's pen over the frame: a hand loop drawn round a point, a ring, a curved arrow with
// its head, a zigzag growth line, a tick; each draws in a few frames, holds, and retracts from its tail in order. Two
// looks: `light` (a glowing stroke, a white core in a coloured halo, for dark grounds) and `marker` (a flat dry stroke).
// Numbers: a loop 4-6 f (1.1 turns, its radius wandering 8 %), an arrow 6-8 f with the head on its last 2 f, a zigzag
// 10-14 f, ticks 2-4 f; drawn on twos; strokes 0.5 % of the frame height; retract in 5-6 f.
// Caution: annotate one thing at a time and let the type carry the meaning; three or more marks at once is a doodle.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, onTwos, rand } from '../../motion';

export type PenMark = {
  kind: 'loop' | 'ring' | 'arrow' | 'zigzag' | 'tick';
  /** Start (arrow, zigzag) or centre (loop, ring, tick), px. */
  x: number;
  y: number;
  /** Radius (loop, ring, tick size), px. */
  r?: number;
  /** End point (arrow, zigzag), px. */
  tx?: number;
  ty?: number;
  /** Bend of an arrow (share of its length, + bends left), or the number of steps of a zigzag. */
  bend?: number;
  at: number;
  dur?: number;
  /** The frame it starts to retract (from its tail); omit to keep it. */
  out?: number;
  outDur?: number;
};

type Pt = [number, number];

const pathOf = (m: PenMark, seed: number): Pt[] => {
  const r = m.r ?? 80;
  if (m.kind === 'loop' || m.kind === 'ring') {
    const turns = m.kind === 'loop' ? 1.12 : 1;
    const n = 72;
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = -Math.PI * 0.62 + (i / n) * turns * Math.PI * 2;
      const wob = m.kind === 'loop' ? 1 + 0.08 * Math.sin(i * 0.19 + rand(seed) * 6) + 0.05 * (i / n) : 1;
      return [m.x + Math.cos(a) * r * wob * 1.08, m.y + Math.sin(a) * r * wob * 0.94] as Pt;
    });
  }
  if (m.kind === 'tick') {
    return [
      [m.x - r * 0.5, m.y],
      [m.x - r * 0.12, m.y + r * 0.4],
      [m.x + r * 0.6, m.y - r * 0.5],
    ];
  }
  const tx = m.tx ?? m.x + 300;
  const ty = m.ty ?? m.y;
  if (m.kind === 'zigzag') {
    const steps = Math.max(2, Math.round(m.bend ?? 5));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const kick = i > 0 && i < steps ? (i % 2 ? 1 : -0.55) * (Math.hypot(tx - m.x, ty - m.y) / steps) * 0.55 : 0;
      return [m.x + (tx - m.x) * t, m.y + (ty - m.y) * t + kick] as Pt;
    });
  }
  // arrow: a quadratic bend from start to end
  const bend = m.bend ?? 0.3;
  const mx = (m.x + tx) / 2 - (ty - m.y) * bend;
  const my = (m.y + ty) / 2 + (tx - m.x) * bend;
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return [(1 - t) * (1 - t) * m.x + 2 * (1 - t) * t * mx + t * t * tx, (1 - t) * (1 - t) * m.y + 2 * (1 - t) * t * my + t * t * ty] as Pt;
  });
};

const lengthOf = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const d = (p: Pt[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');

/**
 * PenMarks: the `marks` drawn over what is under them, each on its own frames; `look` light (glow) or marker; `n` the
 * stepped clock (2: on twos, 1: smooth).
 */
export const PenMarks: React.FC<{
  marks: PenMark[];
  look?: 'light' | 'marker';
  color?: string;
  /** Stroke width in px (default 0.5 % of the frame height). */
  width?: number;
  n?: number;
  seed?: number;
}> = ({ marks, look = 'light', color = '#7FB4FF', width, n = 2, seed = 9 }) => {
  const frame0 = useCurrentFrame();
  const frame = n > 1 ? onTwos(frame0, n) : frame0;
  const { width: W, height: H } = useVideoConfig();
  const sw = width ?? Math.max(2, H * 0.005);
  const core = look === 'light' ? '#FFFFFF' : color;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', filter: look === 'light' ? `drop-shadow(0 0 ${sw * 1.6}px ${color}) drop-shadow(0 0 ${sw * 5}px ${color})` : undefined }}>
        {marks.map((m, i) => {
          const pts = pathOf(m, seed + i * 7);
          const L = lengthOf(pts);
          const dur = m.dur ?? (m.kind === 'loop' ? 5 : m.kind === 'arrow' ? 7 : m.kind === 'zigzag' ? 12 : 3);
          const p = ease.out(clamp((frame - m.at + 1) / dur));
          const q = m.out === undefined ? 0 : ease.inOut(clamp((frame - m.out + 1) / (m.outDur ?? 6)));
          if (p <= 0 || q >= 1) return null;
          const shown = Math.max(0, (p - q) * L);
          const end = pts[pts.length - 1];
          const prev = pts[Math.max(0, pts.length - 4)];
          const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
          const hl = Math.max(sw * 5, Math.min(60, L * 0.12));
          const head = m.kind === 'arrow' ? clamp((p - 0.8) / 0.2) * (1 - q) : 0;
          return (
            <g key={i} fill="none" stroke={core} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d={d(pts)} strokeDasharray={`${shown.toFixed(1)} ${(L * 2).toFixed(1)}`} strokeDashoffset={(-q * L).toFixed(1)} />
              {head > 0 && (
                <path
                  d={`M${end[0] + Math.cos(ang + Math.PI * 0.8) * hl * head} ${end[1] + Math.sin(ang + Math.PI * 0.8) * hl * head} L${end[0]} ${end[1]} L${end[0] + Math.cos(ang - Math.PI * 0.8) * hl * head} ${end[1] + Math.sin(ang - Math.PI * 0.8) * hl * head}`}
                />
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
