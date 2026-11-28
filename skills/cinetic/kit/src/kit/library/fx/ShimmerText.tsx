// ShimmerText (fx, loop): a working status line ("thinking", "building") with a lighter band crossing it left to right
// on a loop while the words hold; the wording can swap by cut between passes.
// Numbers: the band 35 % of the line wide, crossing in 18 f on a soft in-out, one pass every 30 f; base and band about
// 35 % apart in lightness (a lavender line with a white band; a grey line with a near-black one on white).
// Caution: one status at a time, small (UI size); swap the words between passes, never mid-pass.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fonts } from '../../fonts';
import { ease } from '../../motion';

/**
 * ShimmerText: `text` set in `color`, a band of `light` crossing it from `at`, one pass every `period` frames, each pass
 * `pass` frames long; `swaps` replace the words by cut on their frames (`[{ at: 60, text: 'Checking the sources' }]`).
 */
export const ShimmerText: React.FC<{
  text: string;
  at: number;
  /** Frames from one pass's start to the next. */
  period?: number;
  /** Frames a pass takes to cross. */
  pass?: number;
  /** Band width as a share of the line. */
  band?: number;
  color?: string;
  light?: string;
  size?: number;
  weight?: number;
  /** Stop passing from this frame (the status is done). */
  until?: number;
  swaps?: Array<{ at: number; text: string }>;
  style?: React.CSSProperties;
}> = ({ text, at, period = 30, pass = 18, band = 0.35, color = '#8C86E8', light = '#FFFFFF', size = 40, weight = 500, until, swaps = [], style }) => {
  const frame = useCurrentFrame();
  const words = [...swaps].sort((a, b) => a.at - b.at).reduce((t, s) => (frame >= s.at ? s.text : t), text);
  const since = frame - at;
  const live = since >= 0 && (until === undefined || frame < until);
  const local = live ? since % period : pass;
  const t = Math.min(1, local / pass);
  // band centre from -band to 1 + band of the line width, on a soft in-out
  const x = -band + (1 + 2 * band) * (0.35 * ease.soft(t) + 0.65 * t);
  const centre = local < pass ? x : -1;
  // the gradient image is 3 line-widths wide with the band at its middle; place its middle at `centre`
  const pos = ((1.5 - centre) / 2) * 100;
  const half = (band / 3 / 2) * 100;
  return (
    <span
      style={{
        fontFamily: fonts.inter,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: '-0.01em',
        whiteSpace: 'pre',
        color: 'transparent',
        backgroundImage: `linear-gradient(90deg, ${color} 0%, ${color} ${50 - half}%, ${light} 50%, ${color} ${50 + half}%, ${color} 100%)`,
        backgroundSize: '300% 100%',
        backgroundPosition: `${pos}% 0`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        ...style,
      }}
    >
      {words}
    </span>
  );
};
