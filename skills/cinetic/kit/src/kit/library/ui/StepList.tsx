// StepList (ui, build / emphasis): a stepped list carousel: the active label big beside an icon tile, neighbours
// fading by distance, steps accelerating.
// Numbers: each step one pitch (1.25 of the size) in 2 f; neighbours at 55, 28, 10 % with up to 1.4 px blur.
// Caution: 8 items or more, short labels; under 4 f a step the labels stop being readable.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { bez, type Look, surfaceStyle, useUiFrame, withPace } from './_shared';

/**
 * A stepped list carousel: an icon tile with four accent ticks at its corners beside a list whose active item is big in
 * the ink while its neighbours fade by distance. On each step the list moves one pitch in 2 f
 * (cubic-bezier(0.2, 0.9, 0.3, 1)) and the tile's icon swaps by cut on the same frame; holds between steps
 * (`every`, default 5 f, may be a list so the steps accelerate).
 */
const StepListInner: React.FC<{
  L: Look;
  items: Array<{ label: string; icon: string }>;
  at: number;
  every?: number | number[];
  x?: number;
  y?: number;
  size?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, items, at: start, every = 5, x: xIn, y: yIn, size = 64 , speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  const gaps = Array.isArray(every) ? every : items.map(() => every);
  const stepsAt: number[] = [];
  let acc = 0;
  for (let i = 0; i < items.length - 1; i++) {
    acc += gaps[i] ?? gaps[gaps.length - 1];
    stepsAt.push(acc);
  }
  let pos = 0;
  for (const s of stepsAt) pos += at(t, s, 2, bez(0.2, 0.9, 0.3, 1));
  const active = Math.min(items.length - 1, stepsAt.filter((s) => t >= s).length);
  const pitch = size * 1.25;
  const tile = size * 2.6;
  const enter = springAt(frame, 30, start - 10, springs.ui);
  const tick = (sx: number, sy: number, k: number) => (
    <svg key={k} width={22} height={22} viewBox="0 0 22 22" style={{ position: 'absolute', left: sx - 11, top: sy - 11 }}>
      <path d="M11 0 C12 8 14 10 22 11 C14 12 12 14 11 22 C10 14 8 12 0 11 C8 10 10 8 11 0 Z" fill={L.accent} />
    </svg>
  );
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: clamp(enter * 2), transform: `scale(${mix(enter, 0.96, 1)})` }}>
      <div style={{ position: 'absolute', left: -tile - size * 0.6, top: -tile / 2, width: tile, height: tile }}>
        <div style={{ ...surfaceStyle(L, 2, size * 0.42), position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={items[active].icon} size={size * 1.05} color={L.ink} stroke={2} />
        </div>
        {[tick(-14, -14, 0), tick(tile + 14, -14, 1), tick(-14, tile + 14, 2), tick(tile + 14, tile + 14, 3)]}
      </div>
      <div style={{ position: 'absolute', left: size * 0.2, top: 0, fontFamily: L.font, whiteSpace: 'nowrap' }}>
        {items.map((it, i) => {
          const d = i - pos;
          const ad = Math.abs(d);
          if (ad > 3.2) return null;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: d * pitch - size * 0.62, fontSize: size, fontWeight: 560, letterSpacing: '-0.02em', color: mixColor(L.ink, L.faint, clamp(ad)), opacity: [1, 0.55, 0.28, 0.1][Math.min(3, Math.round(ad))] ?? 0, filter: ad > 0.5 ? `blur(${mix(clamp(ad - 0.5), 0, 1.4)}px)` : undefined }}>
              {it.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StepList = withPace(StepListInner);
