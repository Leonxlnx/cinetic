// Interleave (turn, join): old and new alternate on single frames (or the old picture alternates with a coarse version
// of itself while the new one builds in the clean frames) for about seven frames, then the new scene holds.
// Numbers: 7 f by default: alt, to, alt, to, alt, to, alt; the default alt frame is the old scene as an 18 px mosaic;
// every frame is whole (no blend, no fade, no white or inverted frame).
// Caution: once a film, on a hit in the music; the alt frame must be the old scene's own material, never a flash.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { PixelFilter, useUid } from '../_shared';
import { type Scenes, sp } from './_shared';

export type InterleaveState = 'from' | 'to' | 'alt';

/**
 * Interleave: single-frame alternation. Each frame of `pattern` shows one whole state: `from` (the old scene), `to` (the
 * next scene, which builds itself over these frames) or `alt` (a texture of the old scene: by default its own mosaic at
 * `cell` px; pass `alt` for a lattice, a line drawing or a dot version of it). After the pattern the next scene holds.
 * With `speed` below 1 each state holds more than a frame. Measured: 7 f, lattice and clean frames alternating, the new
 * cards arriving in the clean frames; a second form alternates the old dot field and the new scene for 5 f.
 */
export const Interleave: React.FC<
  Scenes & {
    pattern?: InterleaveState[];
    /** The texture frame; default the old scene as a mosaic. */
    alt?: React.ReactNode;
    /** Mosaic cell of the default texture frame, px at a 1080 frame. */
    cell?: number;
  }
> = ({ from, to, at: start, speed = 1, pattern = ['alt', 'to', 'alt', 'to', 'alt', 'to', 'alt'], alt, cell = 18 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('il');
  const hold = sp(1, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  const i = Math.floor((frame - start) / hold);
  if (i >= pattern.length) return <AbsoluteFill>{to}</AbsoluteFill>;
  const s = pattern[i];
  if (s === 'from') return <AbsoluteFill>{from}</AbsoluteFill>;
  if (s === 'to') return <AbsoluteFill>{to}</AbsoluteFill>;
  if (alt) return <AbsoluteFill>{alt}</AbsoluteFill>;
  const step = Math.max(4, Math.round((cell * Math.min(W, H)) / 1080));
  const fid = `${uid}f${frame}`;
  return (
    <AbsoluteFill>
      <PixelFilter id={fid} step={step} />
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>{from}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const interleaveEnd = (at: number, steps = 7, speed = 1) => at + steps * sp(1, speed);
