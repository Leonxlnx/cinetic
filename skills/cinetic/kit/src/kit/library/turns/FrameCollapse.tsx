// FrameCollapse (turn, join / exit): the whole frame becomes a panel on a flat ground: its sides snap in, then its top
// and bottom, and it shrinks steadily to a small square while its content shrinks less; then the next scene cuts in.
// Numbers: 31 f; width 1, 0.79, 0.64, 0.56, 0.50 ... height starts 2 f later; the square ends at 0.43 of the height;
// the content inside scales to about 0.68.
// Caution: the ground must be a colour the film has earned (its brand field), never a new one; keep the line inside.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { mix } from '../../motion';
import { type Scenes, sp } from './_shared';

// measured progress to the end size, a key a frame for the first nine frames (width; height lags two frames)
const WK = [0.28, 0.47, 0.58, 0.66, 0.7, 0.74, 0.76, 0.79, 0.8];
const HK = [0, 0, 0.035, 0.19, 0.32, 0.39, 0.46, 0.49, 0.54];
const prog = (keys: number[], k: number, D: number) => {
  // keys on the first frames (stretched with speed), then a steady glide to 1 on the last frame
  const n = keys.length;
  // the measured frame for this one: 0 on the first frame, 30 on the last
  const kk = (k * 30) / Math.max(1, D - 1);
  if (kk < n - 1) {
    const i = Math.floor(kk);
    return mix(kk - i, keys[i], keys[i + 1]);
  }
  return mix(Math.min(1, (kk - (n - 1)) / (30 - (n - 1))), keys[n - 1], 1);
};

/**
 * FrameCollapse: the old frame becomes a panel and collapses to a square on a flat ground. The sides snap in first (a
 * fifth of the width on the first frame), the top and bottom follow two frames later, and from about the ninth frame both
 * glide down together to a square of `side` x the frame height. The content inside scales less than the panel (to about
 * `side`^0.45), so the line it carries stays readable; the panel's corners stay square. The next scene cuts in on the
 * frame after. Measured: 31 f; width 1517, 1229, 1075, 960 ... 461 px; height 1080, 1080, 1058, 961 ... 464 px.
 */
export const FrameCollapse: React.FC<
  Scenes & {
    /** The flat ground the panel collapses onto. */
    ground: string;
    dur?: number;
    /** The final square's side as a share of the frame height. */
    side?: number;
    /** Corner radius of the panel at the end, px (0 as measured). */
    radius?: number;
    /** How much the content shrinks with the panel (0: not at all, 1: as much). */
    follow?: number;
  }
> = ({ from, to, at: start, speed = 1, ground, dur = 31, side = 0.43, radius = 0, follow = 0.45 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const k = frame - start;
  const endW = (side * H) / W;
  const pw = prog(WK, k, D);
  const ph = prog(HK, k, D);
  const w = W * mix(pw, 1, endW);
  const h = H * mix(ph, 1, side);
  const s = Math.pow(h / H, follow);
  return (
    <AbsoluteFill style={{ background: ground }}>
      <div style={{ position: 'absolute', left: (W - w) / 2, top: (H - h) / 2, width: w, height: h, overflow: 'hidden', borderRadius: radius * mix(ph, 0, 1) }}>
        <div style={{ position: 'absolute', left: (w - W) / 2, top: (h - H) / 2, width: W, height: H, transform: `scale(${s})` }}>{from}</div>
      </div>
    </AbsoluteFill>
  );
};
