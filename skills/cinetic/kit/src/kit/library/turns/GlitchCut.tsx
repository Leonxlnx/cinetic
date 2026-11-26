// GlitchCut (turn, join): a few frames where the picture breaks and the next scene flickers through, one broken state
// a frame, cut hard.
// Numbers: 8 states of 1 f; bands 30-150 px shifted up to 130 px; channel split 10 px; grid cells 18 px; scan rows 14
// px.
// Caution: once a film at most, on a hit in the music; never as the default cut.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { mix, rand } from '../../motion';
import { PixelFilter, SmearFilter, SplitFilter, useUid } from '../_shared';
import type { Scenes } from './_shared';

export type GlitchState = 'from' | 'to' | 'slice' | 'grid-from' | 'grid-to' | 'rgb-from' | 'rgb-to' | 'scan-from' | 'scan-to';

/**
 * GlitchCut: a few frames where the picture breaks and the next scene flickers through. Each frame is one state, cut
 * hard, no blending: the old scene sliced into displaced bands mixed with the new one, the old scene crushed to a mosaic
 * under a fine cell grid, the channels pulled apart, a clean frame of either scene between them. Use it once, on a beat.
 * Measured: 7-8 states of 1 f (2 f on a slower film), glitched and clean frames alternating; bands 30-140 px tall shifted
 * up to ~130 px; channel split 8-12 px; mosaic cells 16-24 px.
 */
export const GlitchCut: React.FC<
  Scenes & {
    steps?: GlitchState[];
    hold?: number;
    seed?: number;
    shift?: number;
    /** Colour of the grid lines in the grid states. */
    grid?: string;
  }
> = ({ from, to, at: start, steps = ['slice', 'from', 'grid-from', 'to', 'scan-to', 'slice', 'to', 'rgb-to'], hold = 1, seed = 7, shift = 130, grid = 'rgba(20,20,24,.55)' }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('gc');
  const end = start + steps.length * hold;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}</AbsoluteFill>;
  const idx = Math.floor((frame - start) / hold);
  const st = steps[idx];
  const sd = seed + idx * 13.7;
  if (st === 'from' || st === 'to') return <AbsoluteFill>{st === 'from' ? from : to}</AbsoluteFill>;
  if (st === 'rgb-from' || st === 'rgb-to') {
    const id = `${uid}r${idx}`;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <SplitFilter id={id} d={10} angle={rand(sd) * 20 - 10} />
        <AbsoluteFill style={{ filter: `url(#${id})`, transform: `scale(1.015)` }}>{st === 'rgb-from' ? from : to}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (st === 'scan-from' || st === 'scan-to') {
    // rows torn into horizontal bands: a heavy x-only blur, every other band pulled sideways
    const id = `${uid}s${idx}`;
    const rows = 'repeating-linear-gradient(180deg, #000 0 14px, transparent 14px 22px, #000 22px 26px, transparent 26px 40px)';
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <SmearFilter id={id} x={60} />
        <AbsoluteFill style={{ filter: `url(#${id})` }}>{st === 'scan-from' ? from : to}</AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateX(${(rand(sd) - 0.5) * shift}px)`, WebkitMaskImage: rows, maskImage: rows }}>{st === 'scan-from' ? from : to}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (st === 'grid-from' || st === 'grid-to') {
    const id = `${uid}p${idx}`;
    const cell = 18;
    const lines = `repeating-linear-gradient(0deg, ${grid} 0 1px, transparent 1px ${cell}px), repeating-linear-gradient(90deg, ${grid} 0 1px, transparent 1px ${cell}px), repeating-linear-gradient(45deg, transparent 0 ${cell * 0.62}px, rgba(20,20,24,.25) ${cell * 0.62}px ${cell * 0.62 + 1}px, transparent ${cell * 0.62 + 1}px ${cell * 0.71}px)`;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <PixelFilter id={id} step={cell} />
        <AbsoluteFill style={{ clipPath: `path('M0 0H${W}V${H}H0Z')` }}>
          <AbsoluteFill style={{ filter: `url(#${id}) contrast(2.2) grayscale(0.4)` }}>{st === 'grid-from' ? from : to}</AbsoluteFill>
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundImage: lines, mixBlendMode: 'multiply' }} />
      </AbsoluteFill>
    );
  }
  // slice: bands of either scene, displaced, a few stretched
  const bands: React.ReactNode[] = [];
  let yy = 0;
  let k = 0;
  while (yy < H) {
    const hh = Math.round(mix(rand(sd + k * 3.3), 30, 150));
    const src = rand(sd + k * 7.1) < 0.55 ? to : from;
    const dx = (rand(sd + k * 1.9) - 0.5) * 2 * shift * (rand(sd + k * 5.7) < 0.3 ? 0 : 1);
    const stretch = rand(sd + k * 9.1) < 0.18 ? mix(rand(sd + k), 1.4, 2.4) : 1;
    // a displaced band wraps round (a second copy fills the side it left), so no band ever shows an empty edge
    bands.push(
      <AbsoluteFill key={k} style={{ clipPath: `inset(${yy}px 0 ${Math.max(0, H - yy - hh - 0.5)}px 0)` }}>
        <AbsoluteFill style={{ transformOrigin: `${W / 2}px ${yy + hh / 2}px`, transform: `translateX(${dx}px) scaleX(${stretch})` }}>{src}</AbsoluteFill>
        {Math.abs(dx) > 0.5 && stretch === 1 && <AbsoluteFill style={{ transform: `translateX(${dx - Math.sign(dx) * W}px)` }}>{src}</AbsoluteFill>}
      </AbsoluteFill>,
    );
    yy += hh;
    k++;
  }
  return <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>{bands}</AbsoluteFill>;
};

export const glitchCutEnd = (at: number, steps = 8, hold = 1) => at + steps * hold;
