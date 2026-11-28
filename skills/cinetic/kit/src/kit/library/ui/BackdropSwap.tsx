// BackdropSwap (ui, emphasis): a phone holds still at the centre of the frame while the world behind it hard-cuts on
// a fixed grid, picture after picture; the phone shifts only a few pixels and a degree with each backdrop, as if each
// were its own photograph of the same phone, and its shadow falls on every one.
// Numbers: a backdrop every 5 f (exactly), seven by default; per backdrop the phone moves at most 0.4 % of the frame,
// turns at most 1.5 degrees and scales 0.98-1.02 (seeded); phone 0.42 of the frame height tall at 1080 x 1920 or
// 0.62 in a wide frame.
// Caution: backdrops that share one colour with the screen (the product's colour) so the run reads as one idea; the
// screen holds one thing, still and readable; at most eight backdrops.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { Phone } from '../../ui';
import { useUiFrame } from './_shared';

export type Backdrop = { src?: string; color?: string; node?: React.ReactNode; position?: string };

export const BackdropSwap: React.FC<{
  backdrops: Backdrop[];
  at: number;
  /** Frames a backdrop holds. */
  every?: number;
  /** The phone's screen. */
  children: React.ReactNode;
  /** The phone's height as a share of the frame's height. */
  h?: number;
  /** The ground before the first and after the last backdrop. */
  ground?: string;
  /** Show the ground (no backdrop) after the last one. */
  end?: boolean;
  seed?: number;
}> = ({ backdrops, at: start, every = 5, children, h, ground = '#E9E9E7', end = false, seed = 4 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = useUiFrame();
  const k = Math.floor((frame - start) / every);
  const idx = frame < start ? -1 : end && k >= backdrops.length ? -1 : Math.min(k, backdrops.length - 1);
  const b = idx >= 0 ? backdrops[idx] : null;
  const ph = (h ?? (H > W ? 0.42 : 0.62)) * H;
  const pw = ph / 2.3;
  const jx = idx >= 0 ? (rand(seed * 13 + idx) - 0.5) * 2 * 0.004 * W : 0;
  const jy = idx >= 0 ? (rand(seed * 29 + idx) - 0.5) * 2 * 0.004 * H : 0;
  const rot = idx >= 0 ? (rand(seed * 7 + idx * 3) - 0.5) * 3 : 0;
  const sc = idx >= 0 ? 0.98 + rand(seed * 3 + idx * 5) * 0.04 : 1;
  return (
    <AbsoluteFill style={{ background: ground }}>
      {b && (
        <AbsoluteFill style={{ background: b.color ?? ground }}>
          {b.src && <Img src={staticFile(b.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: b.position ?? 'center' }} />}
          {b.node}
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left: W / 2 - pw / 2 + jx, top: H / 2 - ph / 2 + jy, transform: `rotate(${rot}deg) scale(${sc})` }}>
        <Phone w={pw} ground={b?.color ?? '#3A3A3A'}>
          {children}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
