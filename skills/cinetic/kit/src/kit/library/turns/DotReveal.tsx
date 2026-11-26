// DotReveal (turn, join): the next scene arrives as a field of dots (or square cells) from an edge or an object,
// swelling until they merge.
// Numbers: dots 0.6 to 1.5 of the pitch over 8 f; the ragged front crosses in 14 f; the mosaic steps 36, 24, 18 px on
// twos; about 34 f.
// Caution: small text in the next scene is unreadable until the resolve ends; hold the scene after it.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, mix, rand } from '../../motion';
import { luminance } from '../../world';
import { PixelFilter, t01, useUid } from '../_shared';
import { across, frontDist, type Origin, type Scenes, sp } from './_shared';

/** Smooth seeded noise along one axis (0..1), for ragged fronts. */
const wave = (u: number, seed: number) => 0.5 + 0.5 * (0.55 * Math.sin(u * 5.3 + seed * 1.7) + 0.3 * Math.sin(u * 11.9 + seed * 3.1) + 0.15 * Math.sin(u * 23.1 + seed * 0.7));

/**
 * DotReveal: the next scene arrives as a field of round dots (or square cells) that sweep in from an edge or grow out of
 * an object, each dot one flat colour of the next scene; the dots swell until they merge, then the mosaic resolves to the
 * sharp picture while an optional wash clears. The old scene stays still underneath until the dots cover it.
 * Measured: dots on a 30-36 px pitch appear at about 0.6 of the pitch and swell to cover in ~8 f; a ragged front crosses the
 * frame in ~14 f; the mosaic steps down on twos (36, 24, 18) and the wash fades over ~10 f. ~32 f in all.
 */
export const DotReveal: React.FC<
  Scenes & {
    origin?: Origin;
    pitch?: number;
    shape?: 'dot' | 'square';
    /** Frames for the front to cross the frame. */
    sweep?: number;
    /** Frames for one dot to swell from its first size to cover its cell. */
    grow?: number;
    /** Frames for the mosaic to resolve and the wash to clear. */
    resolve?: number;
    /** How ragged the front is (0 straight, 0.35 the reference). */
    rag?: number;
    /** A colour the dots carry at first (a cool or warm cast), clearing as the picture resolves. */
    wash?: string;
    washAmount?: number;
    seed?: number;
    /** A layer that stays sharp above the dots from `at` on (the UI that the new ground arrives under); it animates itself. */
    front?: React.ReactNode;
  }
> = ({ from, to, front, at: start, speed = 1, origin = 'top', pitch = 36, shape = 'dot', sweep = 14, grow = 8, resolve = 10, rag = 0.35, wash, washAmount = 0.45, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('dr');
  const SW = sp(sweep, speed);
  const GR = sp(grow, speed);
  const RS = sp(resolve, speed);
  const covered = start + SW + GR + 2;
  const end = covered + RS;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}{front}</AbsoluteFill>;
  // mosaic cell: the pitch while the dots grow, then 2/3 and 1/2 of it on twos; the last frames de-blur to sharp
  const k = Math.floor(Math.max(0, frame - covered) / Math.max(1, Math.round(2 / speed)));
  const ladder = [2 / 3, 1 / 2];
  const step = frame < covered ? pitch : k < ladder.length ? Math.round(pitch * ladder[k]) : 1;
  const soft = frame >= covered && k >= ladder.length ? 3 * (1 - t01(frame, covered + ladder.length * Math.max(1, Math.round(2 / speed)), Math.max(1, RS - ladder.length * 2))) : 0;
  const washOp = wash ? washAmount * (1 - t01(frame, covered, RS)) : 0;
  let clip: string | undefined;
  if (frame < covered) {
    const cols = Math.ceil(W / pitch);
    const rows = Math.ceil(H / pitch);
    let d = '';
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = (i + 0.5) * pitch;
        const cy = (j + 0.5) * pitch;
        const dist = frontDist(origin, cx, cy, W, H);
        const n = wave(across(origin, cx, cy, W, H) * 3, seed) * rag + rand(i * 7.13 + j * 31.7 + seed) * 0.05;
        const a = start + (SW * (dist + n)) / (1 + rag + 0.05);
        if (frame < a) continue;
        const e = ease.out(t01(frame, a, GR));
        if (shape === 'dot') {
          const r = pitch * mix(e, 0.3, 0.75);
          d += `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
        } else {
          const s = pitch * mix(e, 0.45, 1.02);
          d += `M${(cx - s / 2).toFixed(1)} ${(cy - s / 2).toFixed(1)}h${s.toFixed(1)}v${s.toFixed(1)}h${(-s).toFixed(1)}Z`;
        }
      }
    clip = d ? `path('${d}')` : 'inset(100%)';
  }
  const fid = `${uid}s${step}f${frame}`;
  return (
    <AbsoluteFill>
      {frame < covered && <AbsoluteFill>{from}</AbsoluteFill>}
      {step > 1 && <PixelFilter id={fid} step={step} />}
      <AbsoluteFill style={{ clipPath: clip ?? `path('M0 0H${W}V${H}H0Z')` }}>
        <AbsoluteFill style={{ filter: step > 1 ? `url(#${fid})` : soft > 0.2 ? `blur(${soft}px)` : undefined }}>{to}</AbsoluteFill>
        {washOp > 0.002 && <AbsoluteFill style={{ background: wash, opacity: washOp, mixBlendMode: luminance(wash!) > 0.5 ? 'screen' : 'multiply' }} />}
      </AbsoluteFill>
      {front}
    </AbsoluteFill>
  );
};

export const dotRevealEnd = (at: number, o: { sweep?: number; grow?: number; resolve?: number; speed?: number } = {}) =>
  at + sp(o.sweep ?? 14, o.speed) + sp(o.grow ?? 8, o.speed) + 2 + sp(o.resolve ?? 10, o.speed);
