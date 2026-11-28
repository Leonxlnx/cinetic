// BlockPrint (object, build): a collage prints itself piece by piece: each rectangle lands on its frame as a flat block
// of colour and cuts to its photograph a few frames later (some stay colour), stop-motion, no slide and no fade, while
// the whole group creeps larger; `layout="corners"` sets the pieces round a centred word instead of in one cluster.
// Numbers: a new piece every 2-3 f; each a flat block for 2-6 f, then the photograph on one frame; about one in four
// stays a block; the group creeps 100 to 106 % over its length (expo out); pastel blocks.
// Caution: it is a print, not a fade: never ease the blocks in; keep the blocks to a pastel set of three or four.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { PicTile, rnd } from './_shared';

/** One piece: its box as shares of the frame (centre x, y and size w, h), its frame, frames as a block (-1: stays). */
export type PrintPiece = { x: number; y: number; w: number; h: number; at: number; hold: number; color?: string };

const CLUSTER: PrintPiece[] = [
  { x: 0.5, y: 0.5, w: 0.09, h: 0.24, at: 0, hold: 5 },
  { x: 0.56, y: 0.42, w: 0.08, h: 0.16, at: 7, hold: 3 },
  { x: 0.44, y: 0.46, w: 0.1, h: 0.22, at: 10, hold: 2 },
  { x: 0.58, y: 0.58, w: 0.06, h: 0.12, at: 12, hold: -1 },
  { x: 0.53, y: 0.62, w: 0.12, h: 0.2, at: 14, hold: 3 },
  { x: 0.63, y: 0.38, w: 0.05, h: 0.1, at: 16, hold: -1 },
  { x: 0.4, y: 0.6, w: 0.07, h: 0.13, at: 17, hold: 4 },
  { x: 0.66, y: 0.53, w: 0.07, h: 0.24, at: 19, hold: 3 },
  { x: 0.36, y: 0.4, w: 0.05, h: 0.09, at: 21, hold: -1 },
];
const CORNERS: PrintPiece[] = [
  { x: 0.12, y: 0.18, w: 0.16, h: 0.3, at: 0, hold: 3 },
  { x: 0.86, y: 0.8, w: 0.18, h: 0.28, at: 2, hold: 2 },
  { x: 0.84, y: 0.16, w: 0.1, h: 0.18, at: 4, hold: -1 },
  { x: 0.16, y: 0.82, w: 0.14, h: 0.22, at: 5, hold: 4 },
  { x: 0.28, y: 0.12, w: 0.08, h: 0.14, at: 8, hold: -1 },
  { x: 0.7, y: 0.9, w: 0.12, h: 0.16, at: 10, hold: 3 },
  { x: 0.95, y: 0.48, w: 0.08, h: 0.3, at: 12, hold: 2 },
  { x: 0.05, y: 0.5, w: 0.07, h: 0.2, at: 14, hold: -1 },
];

export const BlockPrint: React.FC<{
  pics: string[];
  at?: number;
  /** The pieces (default: a cluster at the centre, or round the corners). */
  pieces?: PrintPiece[];
  layout?: 'cluster' | 'corners';
  /** The block colours, used in turn. */
  colors?: string[];
  /** Frames over which the group creeps larger. */
  dur?: number;
  seed?: number;
}> = ({ pics, at = 0, pieces, layout = 'cluster', colors = ['#F4E98C', '#F7A1A8', '#A9C4F5', '#F2C7A0'], dur = 60, seed = 4 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const list = pieces ?? (layout === 'corners' ? CORNERS : CLUSTER);
  const creep = mix(ease.out(clamp(t / dur)), 1, 1.06);
  return (
    <AbsoluteFill style={{ transform: `scale(${creep})` }}>
      {list.map((p, i) => {
        if (t < p.at) return null;
        const w = p.w * W;
        const h = p.h * H;
        const style: React.CSSProperties = { position: 'absolute', left: p.x * W - w / 2, top: p.y * H - h / 2, width: w, height: h, zIndex: i };
        const block = p.hold < 0 || t < p.at + p.hold;
        if (block) return <div key={i} style={{ ...style, background: p.color ?? colors[i % colors.length] }} />;
        return <PicTile key={i} src={pics[i % pics.length]} w={w} h={h} pos={`${Math.round(20 + rnd(seed, i, 1) * 60)}% ${Math.round(20 + rnd(seed, i, 2) * 60)}%`} zoom={1 + rnd(seed, i, 3) * 0.8} style={style} />;
      })}
    </AbsoluteFill>
  );
};
