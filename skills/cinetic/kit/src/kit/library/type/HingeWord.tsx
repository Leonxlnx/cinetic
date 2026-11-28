// HingeWord (type, enter / emphasis): a word arrives hinged on its baseline, flipping up from lying flat to face the
// camera while it rises a little and darkens from grey to ink; to swap, the word fades back toward the grey it came
// from (or heats along a colour path when one is given), tips back and rises out while the next word flips up.
// Numbers: rotateX 70 to 0 degrees about the baseline over 7 f (expo out), rising 0.35 em, grey to ink over the same
// frames; 9 f before the swap five steps back toward the grey (or along a given heat path, dark to warm); the old
// word tips back to -60 degrees and rises 0.3 em over 3 f, gone as the new one is half up.
// Caution: one word in a slot (beside a picture, a device, a tile); not for a whole line.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { mixColor, useTextLayout } from '../../type';

/** Warm heat (ink to amber) and a rose heat, five steps each, walked one every two frames before a swap. */
export const HEAT_GOLD = ['#1A1305', '#4A3A0E', '#7F611C', '#BC8545', '#E3A07A'];
export const HEAT_ROSE = ['#170A10', '#45202F', '#773452', '#B2587C', '#DA7FA6'];

/**
 * HingeWord: one slot whose words flip up on their `times`; each word before the next steps back toward `grey` over its
 * last 9 frames (or, given `heat`, along those colour paths in turn: only when the colour means something), then
 * tips back and rises out as the next one flips up. `align` sets which edge of the slot stays fixed
 * (a word beside a picture keeps its inner edge).
 */
export const HingeWord: React.FC<{
  words: string[];
  times: number[];
  heat?: string[][];
  size?: number;
  color?: string;
  /** The colour a word starts in, lying flat (default a mid grey). */
  grey?: string;
  align?: 'left' | 'center' | 'right';
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ words, times, heat, size = 72, color = '#0A0A0A', grey = '#8A8A8A', align = 'left', leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.2 } as const;
  const L = useTextLayout(words[0] ?? '', style);
  if (!L.ready || frame < times[0] || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const base = L.baseline;
  const k = times.filter((t) => frame >= t).length - 1;
  const expo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  // the default path: the ink stepping back toward the grey it arrived from (no colour without a reason)
  const paths = heat?.length ? heat : [[0.2, 0.4, 0.6, 0.8, 1].map((k) => mixColor(color, grey, k * 0.85))];
  const draw = (i: number, key: string) => {
    const age = frame - times[i];
    const nextAt = times[i + 1];
    let rot: number;
    let dy: number;
    let c: string;
    let o = 1;
    if (nextAt !== undefined && frame >= nextAt) {
      // leaving: tips back and rises out
      const q = clamp((frame - nextAt + 1) / 3);
      rot = -60 * q;
      dy = -0.3 * size * q;
      const path = paths[i % paths.length];
      c = path[path.length - 1];
      o = 1 - q;
      if (q >= 1) return null;
    } else {
      const p = expo(clamp(age / 7));
      rot = 70 * (1 - p);
      dy = 0.35 * size * (1 - p);
      c = mixColor(grey, color, p);
      if (nextAt !== undefined && frame >= nextAt - 9) {
        const path = paths[i % paths.length];
        c = path[Math.min(path.length - 1, Math.floor((frame - (nextAt - 9)) / 2))];
      }
    }
    const tx = align === 'left' ? '0' : align === 'right' ? '-100%' : '-50%';
    return (
      <div key={key} style={{ position: 'absolute', left: cx, top: cy - L.height / 2, perspective: size * 9, transform: `translateX(${tx})`, opacity: o }}>
        <span style={{ ...style, display: 'block', whiteSpace: 'pre', color: c, transformOrigin: `50% ${base}px`, transform: `translateY(${dy}px) rotateX(${rot}deg)` }}>{words[i]}</span>
      </div>
    );
  };
  return (
    <>
      {k >= 1 && draw(k - 1, 'prev')}
      {draw(k, 'cur')}
    </>
  );
};
