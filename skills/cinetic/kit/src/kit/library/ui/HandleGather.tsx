// HandleGather (ui, emphasis): a word types in fresh ink while small squares appear scattered round the frame, hop
// closer every two frames and lock as the four handles of a selection box round the word, which then takes a pale fill.
// Numbers: letters 1 a frame from +2 f, each born in the accent and cooling to the ink over 4 f; squares appear at
// +0, +2, +4, +5 f, hop on twos between scattered spots, closing in late (progress to the power 2.4), and lock at +14
// to +20 f; the fill at +23 f over 3 f; squares 0.9 % of the frame height; box padding 0.35 em by 0.25 em.
// Caution: one short word or name (it must fit one line); the squares are the handles, so keep exactly four.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix, rand } from '../../motion';
import { mixColor, useTextWidth } from '../../type';
import { type Look, useUiFrame, withPace } from './_shared';

const HandleGatherInner: React.FC<{
  L: Look;
  text: string;
  at: number;
  x?: number;
  y?: number;
  /** The text size in px. */
  size?: number;
  /** The handles' and the fresh letters' colour (default the accent). */
  color?: string;
  /** Frames from `at` the squares lock (the last one) and the fill arrives. */
  lockAt?: number;
  seed?: number;
  speed?: number;
}> = ({ L, text, at: start, x: xIn, y: yIn, size: sizeIn, color, lockAt = 20, seed = 3, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const size = sizeIn ?? Math.min(W, H) * 0.05;
  const c = color ?? L.accent;
  const style: React.CSSProperties = { fontFamily: L.font, fontSize: size, fontWeight: 540, letterSpacing: '-0.015em' };
  const tw = useTextWidth(text, style);
  const bw = tw + size * 0.7;
  const bh = size * 1.5;
  const hs = Math.max(7, Math.min(W, H) * 0.009);
  const corners = [
    [x - bw / 2, y - bh / 2],
    [x + bw / 2, y - bh / 2],
    [x - bw / 2, y + bh / 2],
    [x + bw / 2, y + bh / 2],
  ];
  // the order the squares lock in: left corners first, as measured
  const appear = [0, 2, 4, 5];
  const lock = [lockAt - 6, lockAt - 5, lockAt - 2, lockAt];
  const fill = at(frame, start + lockAt + 3, 3, ease.out);
  const rel = frame - start;
  return (
    <>
      {fill > 0 && <div style={{ position: 'absolute', left: x - bw / 2, top: y - bh / 2, width: bw, height: bh, background: mixColor(L.ground, c, 0.14), opacity: fill }} />}
      <div style={{ position: 'absolute', left: x - tw / 2, top: y - bh / 2, height: bh, display: 'flex', alignItems: 'center', whiteSpace: 'pre', ...style }}>
        {text.split('').map((ch, i) => {
          const t0 = start + 2 + i;
          if (frame < t0) return null;
          return (
            <span key={i} style={{ color: mixColor(c, L.ink, at(frame, t0 + 1, 4, ease.linear)) }}>
              {ch}
            </span>
          );
        })}
      </div>
      {corners.map(([cx, cy], i) => {
        if (rel < appear[i]) return null;
        // stepped on twos: the square holds each spot for two frames, each spot nearer its corner
        const stepped = Math.floor((rel - appear[i]) / 2) * 2 + appear[i];
        const p = clamp((stepped - appear[i]) / Math.max(1, lock[i] - appear[i]));
        // they roam far for most of the time and close in at the end (measured: still scattered at +10 f)
        const q = Math.pow(p, 2.4);
        const fx = (0.08 + rand(seed * 11 + i) * 0.84) * W;
        const fy = (0.08 + rand(seed * 17 + i * 3) * 0.84) * H;
        // the scatter of its hops, gone on lock
        const jx = (rand(seed * 5 + stepped * 7 + i) - 0.5) * W * 0.3 * (1 - q);
        const jy = (rand(seed * 9 + stepped * 13 + i) - 0.5) * H * 0.3 * (1 - q);
        const px = mix(q, fx, cx) + jx;
        const py = mix(q, fy, cy) + jy;
        return <div key={i} style={{ position: 'absolute', left: px - hs / 2, top: py - hs / 2, width: hs, height: hs, background: c }} />;
      })}
    </>
  );
};

export const HandleGather = withPace(HandleGatherInner);
