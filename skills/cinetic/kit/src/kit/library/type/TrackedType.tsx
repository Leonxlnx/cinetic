// TrackedType (type, enter / idle): a word on a shallow crest, each letter in a turning outlined box with live
// coordinates, dashed loops between them.
// Numbers: the bend relaxes from 1.3x over 40 f; one box a frame; loops draw over 8 f, 1 f apart, dashes crawl 2.2 px
// a frame.
// Caution: the coordinates are texture, not copy: keep them small and never put a message in them.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

/**
 * TrackedType: a word bent on a shallow arc, each letter in a thin outlined box that turns with it, its live screen
 * coordinates printed above the box, a dot at its centre, and dashed arcs with arrowheads looping between the letters:
 * the look of motion tracking laid over type. `glitch` frames slice and shift the letters for one frame each.
 */
export const TrackedType: React.FC<{
  text: string;
  at?: number;
  size?: number;
  color?: string;
  /** The boxes' outline. */
  box?: string;
  /** The centre dots. */
  dot?: string;
  /** The dashed arcs. */
  path?: string;
  /** Bend of the arc in px at the ends (negative, the default: the ends fall away, a crest; positive: a smile). */
  bend?: number;
  /** Frames over which the bend relaxes from 1.3x to `bend` (the word breathing). */
  dur?: number;
  labels?: boolean;
  paths?: number;
  glitch?: number[];
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, size = 260, color = '#FFFFFF', box = '#E0245E', dot = '#FFC24A', path = 'rgba(255,255,255,0.72)', bend = -130, dur = 40, labels = true, paths = 5, glitch = [], x, y, font = fonts.inter, weight = 500, seed = 7 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '0em', lineHeight: 1.04 } as const;
  const L = useTextLayout(text, style);
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const t = frame - at;
  if (t < 0 || !L.ready) return null;
  const b = bend * mix(prog(frame, at, dur, ease.out), 1.3, 1) + Math.sin(t * 0.09) * bend * 0.04;
  const half = L.width / 2;
  // each letter: its centre on the arc, its angle the arc's slope, a little larger toward the ends
  const letters = L.chars
    .map((g, i) => ({ g, i, ch: Array.from(text)[i] }))
    .filter((q) => q.ch.trim())
    .map((q) => {
      const u = (q.g.cx - half) / half; // -1..1
      const lx = cx + (q.g.cx - half) * (1 + 0.06 * u * u);
      const ly = cy + (q.g.cy - L.height / 2) - b * u * u;
      const slope = (-2 * b * u) / half;
      const ang = (Math.atan(slope) * 180) / Math.PI;
      const sc = 1 + 0.1 * u * u;
      return { ...q, lx, ly, ang, sc, u };
    });
  const appear = (i: number) => t >= i; // a box per frame
  const isGlitch = glitch.includes(frame);
  // dashed loops between letter centres
  const pathEls: React.ReactNode[] = [];
  for (let k = 0; k < paths && letters.length > 1; k++) {
    const a = letters[Math.floor(hash(k, seed) * letters.length)];
    let c = letters[Math.floor(hash(k + 9, seed) * letters.length)];
    if (c === a) c = letters[(letters.indexOf(a) + 2) % letters.length];
    const up = hash(k + 3, seed) > 0.5 ? -1 : 1;
    const lift = size * (0.9 + hash(k + 5, seed) * 1.6) * up;
    const p0 = [a.lx, a.ly];
    const p3 = [c.lx, c.ly];
    const p1 = [mix(0.25, p0[0], p3[0]) - size * 0.4, p0[1] + lift];
    const p2 = [mix(0.75, p0[0], p3[0]) + size * 0.4, p3[1] + lift];
    const bez = (s: number) => {
      const m = 1 - s;
      return [m * m * m * p0[0] + 3 * m * m * s * p1[0] + 3 * m * s * s * p2[0] + s * s * s * p3[0], m * m * m * p0[1] + 3 * m * m * s * p1[1] + 3 * m * s * s * p2[1] + s * s * s * p3[1]];
    };
    const draw = clamp((t - 2 - k) / 8);
    if (draw <= 0) continue;
    const d = `M${p0[0]},${p0[1]} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`;
    const s0 = 0.55;
    const [ax, ay] = bez(s0);
    const [bx, by] = bez(s0 + 0.01);
    const ang = Math.atan2(by - ay, bx - ax);
    const ah = size * 0.06;
    pathEls.push(
      <g key={k} opacity={draw}>
        <path d={d} fill="none" stroke={path} strokeWidth={Math.max(1.5, size * 0.009)} strokeDasharray={`${size * 0.035} ${size * 0.03}`} strokeDashoffset={-t * 2.2} />
        <path
          d={`M${ax - Math.cos(ang - 0.5) * ah},${ay - Math.sin(ang - 0.5) * ah} L${ax},${ay} L${ax - Math.cos(ang + 0.5) * ah},${ay - Math.sin(ang + 0.5) * ah}`}
          fill="none"
          stroke={path}
          strokeWidth={Math.max(1.5, size * 0.009)}
        />
      </g>,
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        {pathEls}
      </svg>
      {letters.map((q, n) => {
        if (!appear(n)) return null;
        const ink = q.g.ink;
        const pad = size * 0.05;
        const bw = Math.max(ink.width, size * 0.18) + pad * 2;
        const bh = q.g.height * 0.78;
        const slices = isGlitch ? [0, 1, 2].map((s) => (hash(s + n * 3, frame) - 0.5) * size * 0.16) : null;
        return (
          <div key={q.i} style={{ position: 'absolute', left: q.lx, top: q.ly, transform: `translate(-50%, -50%) rotate(${q.ang}deg) scale(${q.sc})` }}>
            <div style={{ position: 'relative', width: q.g.width, height: q.g.height }}>
              {(slices ?? [0]).map((off, s) => (
                <span
                  key={s}
                  style={{
                    ...style,
                    position: 'absolute',
                    left: off,
                    top: 0,
                    color,
                    whiteSpace: 'pre',
                    clipPath: slices ? `inset(${s * 33}% 0 ${100 - (s + 1) * 34}% 0)` : undefined,
                  }}
                >
                  {q.ch}
                </span>
              ))}
              <div style={{ position: 'absolute', left: ink.cx - (q.g.x) - bw / 2, top: q.g.height * 0.13, width: bw, height: bh, border: `${Math.max(1.5, size * 0.008)}px solid ${box}` }} />
              <div style={{ position: 'absolute', left: ink.cx - q.g.x - size * 0.02, top: q.g.height * 0.52 - size * 0.02, width: size * 0.04, height: size * 0.04, borderRadius: '50%', background: dot }} />
              {labels && (
                <div style={{ position: 'absolute', left: ink.cx - q.g.x - bw / 2 + size * 0.02, top: q.g.height * 0.13 - size * 0.1, fontFamily: fonts.inter, fontWeight: 500, fontSize: Math.max(14, size * 0.065), color, whiteSpace: 'pre', letterSpacing: '0.02em' }}>
                  {`x: ${Math.round(q.lx)}  y: ${Math.round(q.ly)}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
