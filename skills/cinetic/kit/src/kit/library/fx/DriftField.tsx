// DriftField (fx, build, idle): small particles pop on one by one at seeded spots, glow and drift slowly, gathering into a
// loose cloud on a dark ground; or (`shape="dash"`) short hairline dashes that blink on, live a few frames and slide,
// like construction lines or data passing.
// Numbers: a new dot every 2-3 f; dots 0.45-1.2 % of the frame height, popping from nothing past 1.15x to 1x in 4 f;
// drift 0.2-0.6 px a frame; dashes 2-4 % of the width, 1 px, living 4-8 f.
// Caution: a texture for a quiet beat (a night ground, a pause before the line); keep it out of the type's box (`avoid`)
// and never use it as confetti on a hit.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, rand } from '../../motion';

/**
 * DriftField: `count` particles born from `at`, one every `rate` frames, inside `area` (x, y, w, h as shares of the frame)
 * and outside `avoid` (the same, optional), drifting by (`vx`, `vy`) px a frame; dashes live `life` frames, dots stay.
 */
export const DriftField: React.FC<{
  at: number;
  count?: number;
  rate?: number;
  area?: [number, number, number, number];
  avoid?: [number, number, number, number];
  shape?: 'dot' | 'dash';
  color?: string;
  glow?: number;
  vx?: number;
  vy?: number;
  life?: number;
  seed?: number;
}> = ({ at, count = 24, rate = 2.5, area = [0.2, 0.25, 0.65, 0.6], avoid, shape = 'dot', color = '#3D5CFF', glow = 1, vx = 0.3, vy = -0.2, life, seed = 11 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const pts = React.useMemo(() => {
    const out: Array<{ x: number; y: number; s: number; born: number; k: number }> = [];
    let tries = 0;
    for (let i = 0; out.length < count && tries < count * 20; tries++) {
      const r1 = rand(seed * 101 + tries * 7);
      const r2 = rand(seed * 211 + tries * 13);
      const x = area[0] + r1 * area[2];
      const y = area[1] + r2 * area[3];
      if (avoid && x > avoid[0] && x < avoid[0] + avoid[2] && y > avoid[1] && y < avoid[1] + avoid[3]) continue;
      out.push({ x, y, s: 0.45 + 0.75 * Math.pow(rand(seed * 307 + tries * 3), 2), born: at + Math.round(i * rate + rand(seed * 401 + i) * rate * 0.6), k: rand(seed * 503 + tries) });
      i++;
    }
    return out;
  }, [count, rate, area, avoid, seed, at]);
  const lifeOf = life ?? (shape === 'dash' ? 6 : Infinity);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {pts.map((p, i) => {
        const age = frame - p.born;
        if (age < 0 || age >= lifeOf) return null;
        const pop = age < 2 ? ease.out(clamp((age + 1) / 2)) * 1.15 : 1 + 0.15 * (1 - clamp((age - 1) / 3));
        const dx = vx * age * (0.6 + p.k * 0.8);
        const dy = vy * age * (0.6 + p.k * 0.8);
        if (shape === 'dash') {
          const len = W * (0.02 + 0.02 * p.k);
          return <div key={i} style={{ position: 'absolute', left: p.x * W + dx * 4, top: p.y * H, width: len, height: Math.max(1, H / 1080), background: color, opacity: 0.8 }} />;
        }
        const d = (H * p.s) / 100 * pop;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x * W + dx - d / 2,
              top: p.y * H + dy - d / 2,
              width: d,
              height: d,
              borderRadius: '50%',
              background: color,
              boxShadow: glow > 0 ? `0 0 ${d * 1.6 * glow}px ${d * 0.4 * glow}px ${color}88` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
