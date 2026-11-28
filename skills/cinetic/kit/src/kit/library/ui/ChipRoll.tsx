// ChipRoll (ui, emphasis): an app chip (icon and name) inside a sentence rolls vertically like a slot reel through
// other chips: the next one peeks below at 30 %, the reel creeps, then steps, faster each time; the chip's width
// follows its name and the rest of the line closes up.
// Numbers: slot pitch 1.1 em; neighbours at 30 % and 2 px blur, faded at the window's edges; a 12 f creep of 0.15
// pitch before the first step; steps 6, 4, 4 f ease-in-out; the chip's width eases with the step.
// Caution: short names (one word); three or four chips, the last the one the sentence means.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { mixColor, useTextWidth } from '../../type';
import { Glyph, type Look, useUiFrame, withPace } from './_shared';

export type RollChip = { name: string; mark?: React.ReactNode; icon?: string; letter?: string; colors?: [string, string] };

const ChipRollInner: React.FC<{
  L: Look;
  /** The words before and after the slot. */
  before: string;
  after?: string;
  chips: RollChip[];
  at: number;
  /** Frames (from `at`) each step to the next chip starts; one less than the chips. */
  steps?: number[];
  /** Frames each step takes (the last repeats). */
  stepDur?: number[];
  x?: number;
  y?: number;
  size?: number;
  speed?: number;
}> = ({ L, before, after = '', chips, at: start, steps = [18, 25], stepDur = [6, 4], x: xIn, y: yIn, size: sizeIn, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const size = sizeIn ?? Math.min(W, H) * 0.06;
  const style: React.CSSProperties = { fontFamily: L.font, fontSize: size, fontWeight: 500, letterSpacing: '-0.02em' };
  const chipStyle: React.CSSProperties = { ...style, fontSize: size * 0.82 };
  const bw = useTextWidth(before + ' ', style);
  const aw = useTextWidth(after ? ' ' + after : ' ', style);
  const names = chips.map((c) => useTextWidth(c.name, chipStyle));
  const icon = size * 0.82;
  const padX = size * 0.22;
  const chipW = (i: number) => padX + icon + size * 0.2 + names[i] + padX * 1.4;
  // the reel's position in chips: a creep, then the steps
  let pos = 0;
  steps.forEach((s0, k) => {
    pos += at(frame, start + s0, stepDur[Math.min(k, stepDur.length - 1)], ease.inOut);
  });
  const creep = at(frame, start, steps[0] ?? 12, ease.out) * 0.15 * (1 - clamp(pos));
  const reel = pos + creep;
  const i0 = Math.floor(pos);
  const wNow = mix(pos - i0, chipW(Math.min(i0, chips.length - 1)), chipW(Math.min(i0 + 1, chips.length - 1)));
  const total = bw + wNow + aw;
  const left = x - total / 2;
  const pitch = size * 1.1;
  const ch = size * 1.02;
  return (
    <div style={{ position: 'absolute', left, top: y - pitch / 2, height: pitch, width: total, ...style, color: L.ink, whiteSpace: 'pre' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: pitch, display: 'flex', alignItems: 'center' }}>{before}</div>
      {/* the reel window: a chip and its faded neighbours */}
      <div style={{ position: 'absolute', left: bw, top: -pitch, width: Math.max(...chips.map((_, k) => chipW(k))), height: pitch * 3, overflow: 'hidden', WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${pitch * 0.55}px, #000 calc(100% - ${pitch * 0.55}px), transparent 100%)` }}>
        {chips.map((c, i) => {
          const off = i - reel; // 0 = in the slot
          if (Math.abs(off) > 1.6) return null;
          const near = clamp(1 - Math.abs(off));
          const a = mix(near, 0.3, 1);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: pitch + off * pitch + (pitch - ch) / 2, height: ch, display: 'flex', alignItems: 'center', gap: size * 0.2, padding: `0 ${padX * 1.4}px 0 ${padX}px`, borderRadius: ch * 0.24, background: mixColor(L.ground, L.dark ? '#FFFFFF' : '#000000', L.dark ? 0.1 : 0.06), opacity: a, filter: near < 0.9 ? `blur(${mix(near, 2, 0)}px)` : undefined, ...chipStyle, color: L.ink, whiteSpace: 'nowrap' }}>
              <div style={{ width: icon, height: icon, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.mark ?? <Glyph icon={c.icon} letter={c.letter} colors={c.colors} size={icon * 0.92} />}</div>
              {c.name}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: bw + wNow, top: 0, height: pitch, display: 'flex', alignItems: 'center' }}>{after ? ' ' + after : ''}</div>
    </div>
  );
};

export const ChipRoll = withPace(ChipRollInner);
