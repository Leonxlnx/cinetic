import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Words } from '../fx/Words';
import { lmix, prog } from '../lib/anim';
import { Photo, shadeRgba } from '../kit';
import { ACT, chainOf, CUE, f60, f60x, H, POP_GAP, W } from '../timeline';
import { adSize, adStyle, circOut, pictureSrc, quadIn, SHOT, useAbs } from './stage';

// TAGLINES - the hero picture full bleed on one long circ-out pull-back (x1.183 to 1 over about 2.5 s) with a drift on
// the same curve, then a quad-in push of 3.7 % over the last 24 f into the cut. Two short taglines take turns over it,
// each popping on word by word and leaving up before the next arrives.

export const PULL = { from: 1.183, frames: 154, drift: [146, 82] as [number, number], push: 0.037 } as const;

export const Taglines: React.FC = () => {
  const F = useAbs('taglines');
  const t = circOut(prog(F, ACT.taglines.from, ACT.taglines.from + f60x(PULL.frames), (x) => x));
  const push = 1 + PULL.push * quadIn(prog(F, CUE.push, ACT.end.from, (x) => x));
  const k = lmix(PULL.from, 1, t) * push;
  const dx = PULL.drift[0] * U * (1 - t);
  const dy = PULL.drift[1] * U * (1 - t);
  const tags = chainOf('tag');
  return (
    <AbsoluteFill style={{ background: SHOT.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>
        <Photo theme={SHOT} w={W} h={H} seed={23} src={pictureSrc('hero')} />
      </div>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 35% at 50% 50%, ${shadeRgba(SHOT, 0.35)}, ${shadeRgba(SHOT, 0)})` }} />
      {tags.map((c) => {
        if (F < c.in - 1 || F > c.out + f60x(16)) return null;
        const size = adSize(c.text, 0.5) * 1.15;
        const n = c.text.trim().split(/\s+/).length;
        return (
          <div key={c.id} style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.1) / 2, width: W, display: 'flex', justifyContent: 'center' }}>
            <Words id={c.id} text={c.text} frame={F} start={c.in - 1} starts={Array.from({ length: n }, (_, i) => c.in - 1 + f60(POP_GAP * i))} size={size} dur={f60x(3)} rise={0.12} riseUnit="em" out={c.out} exit="launchFade" exitDir="up" style={adStyle(size, SHOT.text)} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
