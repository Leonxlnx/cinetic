// GradientPass (type, enter / emphasis): a gradient clipped to the glyphs passes along a line: letters appear at a soft
// leading edge in its first colour, run through the colours and settle to the ink behind a second, slower front.
// Numbers: reveal front 1.4 letters a frame (2.5 for a quick title) with a soft edge 3 letters wide; the ink front
// starts about 18 f later at 0.8 letters a frame, easing out at the end; stops peach, pink, sky, blue, then ink; the
// line slides in 0.4 em from the right as it is revealed (optional).
// Caution: one per film, on a closing line or a title; it needs a calm ground (paper, ink, a quiet photo) to read.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { useTextLayout } from '../../type';

/** The default passing colours (warm to cool), first to last. */
export const PASS_STOPS = ['#F6C7A5', '#EFA1C2', '#A9C6F2', '#6F8CEC'];

/**
 * GradientPass: from `at` a soft front reveals the line left to right (`speed` letters a frame), the letters behind it
 * coloured by `stops` (the newest in the first stop); `inkAfter` frames later a second front (`inkSpeed` letters a
 * frame, easing out) turns them to `color`. `inkAfter={-1}` keeps the colours (a title that stays coloured). `slide`
 * moves the line in from the right by that many em while it is revealed. Pass `color="#FFFFFF"` and a single warm stop
 * for the sweep that leaves a coloured title white.
 */
export const GradientPass: React.FC<{
  text: string;
  at?: number;
  /** Letters a frame of the reveal front (default 1.4). */
  speed?: number;
  /** Frames after `at` the ink front starts (default 18; -1: never). */
  inkAfter?: number;
  /** Letters a frame of the ink front (default 0.8). */
  inkSpeed?: number;
  stops?: string[];
  /** Width of the soft leading edge in letters (default 3). */
  soft?: number;
  slide?: number;
  size?: number;
  color?: string;
  /** Start colour: when given, the whole line is already there in it and the fronts recolour it (a sweep, not a reveal). */
  from?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, speed = 1.4, inkAfter = 18, inkSpeed = 0.8, stops = PASS_STOPS, soft = 3, slide = 0.4, size = 96, color = '#141414', from, leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const W = L.width;
  const per = W / Math.max(1, Array.from(text).length); // px a letter
  const f = frame - at;
  const edge = soft * per;
  // the reveal front (px from the line's left) and the ink front behind it
  const reveal = f * speed * per;
  const inkDur = W / (inkSpeed * per);
  const inkP = inkAfter < 0 ? 0 : clamp((f - inkAfter) / inkDur);
  const ink = inkAfter < 0 || f < inkAfter ? -1 : W * (1 - (1 - inkP) * (1 - inkP)) * 1.02 + (inkP >= 1 ? edge * 4 : 0);
  // the coloured band runs from the ink front to the reveal front: the last stop next to the ink, the first at the edge
  const band0 = Math.max(0, ink);
  const band1 = Math.max(band0 + 1, reveal);
  const pct = (px: number) => `${(px / W) * 100}%`;
  const parts: string[] = [];
  if (ink > 0) parts.push(`${color} 0%`, `${color} ${pct(ink)}`);
  const n = stops.length;
  for (let i = 0; i < n; i++) parts.push(`${stops[n - 1 - i]} ${pct(band0 + ((band1 - band0) * i) / Math.max(1, n - 1))}`);
  // past the reveal front: the soft edge fades to nothing (a reveal) or to the start colour (a sweep)
  const tailC = from ?? `${stops[0]}00`;
  parts.push(`${tailC} ${pct(band1 + edge)}`, `${tailC} 100%`);
  const done = ink >= W + edge;
  const sl = slide * size * (1 - clamp(reveal / W)) ** 2;
  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        left: (x ?? width / 2) - W / 2 + sl,
        top: (y ?? height / 2) - L.height / 2,
        whiteSpace: 'pre',
        color: done ? color : 'transparent',
        backgroundImage: done ? undefined : `linear-gradient(90deg, ${parts.join(', ')})`,
        WebkitBackgroundClip: done ? undefined : 'text',
        backgroundClip: done ? undefined : 'text',
      }}
    >
      {text}
    </div>
  );
};
