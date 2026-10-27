import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { conveyorState, type ConveyorProps } from '../fx/Conveyor';
import { DirBlur } from '../fx/Defocus';
import { E, lmix, prog, rand } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, f60, f60x, H, POP_GAP, W } from '../timeline';
import { adSize, adStyle, adWidth, PictureCard, PAGE, useAbs } from './stage';

// RIVERS - two diagonal streams of pictures in opposite directions (fx/Conveyor: in fast, an exponential settle to a
// cruise), the cards upright while the band is diagonal, each overlapping the one before by a fifth like a staircase,
// their sizes varied by depth. A label stands over them and recedes the whole time; once, its last word swaps (the
// label pops x1.18 and settles in 10 f). On the last beats the streams accelerate x6 into their own smear: the cut.

/** The streams: their angle (deg), the card's base width (px at 1080p), the staircase overlap and the depth range. */
export const RIVER = { angle: -37, card: 250, stair: 0.8, sizes: [0.82, 1.24], n: 12, gap: 0.27 } as const;

const stream = (start: number, outAt: number, angle: number, phase: number): ConveyorProps => ({
  start,
  n: RIVER.n,
  pitch: RIVER.card * U * RIVER.stair,
  angle,
  outAt,
  phase,
  id: `river-${angle}`,
});

const River: React.FC<{ F: number; p: ConveyorProps; cy: number; seed: number }> = ({ F, p, cy, seed }) => {
  const s = conveyorState(F, p, useFilm());
  const items = [...s.items].sort((a, b) => a.along - b.along); // later along the travel draws on top
  return (
    <DirBlur v={s.v} angle={p.angle} id={`river${seed}`}>
      {items.map((it) => {
        const k = RIVER.sizes[0] + (RIVER.sizes[1] - RIVER.sizes[0]) * rand(seed * 97 + it.i);
        const w = RIVER.card * U * k;
        const h = w * 1.28;
        return (
          <div key={it.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(W / 2 + it.x - w / 2).toFixed(2)}px, ${(cy + it.y - h / 2).toFixed(2)}px, 0)` }}>
            <PictureCard i={seed * 20 + it.i} w={w} h={h} />
          </div>
        );
      })}
    </DirBlur>
  );
};

export const Rivers: React.FC = () => {
  const F = useAbs('rivers');
  const a = copy('plan');
  const b2 = copy('swap');
  const swapped = F >= b2.in;
  const c = swapped ? b2 : a;
  const words = c.text.trim().split(/\s+/);
  const size = adSize(c.text, 0.5);
  const recede = lmix(1, 0.62, prog(F, a.in, ACT.taglines.from, (t) => t));
  const pop = swapped ? lmix(1.18, 1, E.snapOut(prog(F, b2.in, b2.in + f60x(10), (t) => t))) : 1;
  const gone = prog(F, CUE.rushOut + f60x(12), ACT.taglines.from - f60x(4), (t) => t);
  const w = adWidth(c.text, size) + size * 0.9;
  const up = stream(ACT.rivers.from, CUE.rushOut, RIVER.angle, 0);
  const down = stream(ACT.rivers.from, CUE.rushOut, RIVER.angle + 180, RIVER.card * U * 0.4);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <River F={F} p={up} cy={H / 2 - RIVER.gap * H} seed={1} />
      <River F={F} p={down} cy={H / 2 + RIVER.gap * H} seed={2} />
      {F >= a.in && (
        <div style={{ position: 'absolute', left: W / 2 - w / 2, top: H / 2 - size * 0.8, width: w, height: size * 1.6, borderRadius: size * 0.8, background: PAGE.surface, opacity: 1 - gone, transform: `scale(${(recede * pop).toFixed(5)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span data-text={swapped ? 'swap' : 'plan'} style={{ ...adStyle(size), display: 'inline-flex', whiteSpace: 'pre' }}>
            {words.map((wd, i) => (
              <span key={i} style={{ opacity: swapped || F >= a.in + f60(POP_GAP * i) ? 1 : 0, color: swapped && i === words.length - 1 ? PAGE.accent : undefined }}>
                {wd}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
