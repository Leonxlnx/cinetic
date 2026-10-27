import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { DEAL, NAME_MOVE } from '../deal';
import { Lit } from '../fx/Lit';
import { E, hitPulse, lmix, prog } from '../lib/anim';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, f60x, FPS, H, moveOf, W } from '../timeline';
import { PageFace } from './Page';
import { drift, Ground, GROUNDS, lineSize, themeOf, useAbs } from './stage';
import { HeroLine } from './type';

// END - the lockup, built from the mark's own parts: they arrive in turn, the name is set beside them on a confident
// move (never letter by letter) and the payoff line arrives under it on its dealt move. By the dealt device: 'side'
// keeps the output live on the right, lit and tilted, cropped by the frame's edge (the product's result beside its
// name); 'centre' sets the lockup alone in the middle of a clean ground. A slow push keeps the lock alive; it holds
// about a second and a half before the tail.

export const End: React.FC = () => {
  const F = useAbs('end');
  const t = themeOf('end');
  const name = copy('wordmark');
  const pay = copy('payoff');
  const markSize = 170 * U;
  const nameSize = TYPE.display.size * U;
  const paySize = lineSize(pay.text, 'line', 0.56);
  const nameW = measureTracked(name.text, nameSize, TYPE.display.weight, TYPE.display.track);
  const centre = DEAL.end === 'centre';
  // the lockup's block: the mark and the name on one row, the payoff under it
  const rowW = markSize + 44 * U + nameW;
  const x0 = centre ? (W - rowW) / 2 : 160 * U;
  const yRow = centre ? H / 2 - 70 * U : H / 2 - 90 * U;
  const k = lmix(1.04, 1, prog(F, ACT.end.from, ACT.end.from + f60x(50), E.glideOut)) * lmix(1, 1.03, prog(F, ACT.end.from, ACT.end.from + ACT.end.dur, E.linear));
  const d = drift('end', F, 0, 0.3);
  const page = prog(F, ACT.end.from, ACT.end.from + f60x(56), E.glideOut);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Ground act="end" F={F} />
      {!centre && (
        // the output, live and sharp beside its name: lit and tilted, cropped by the right and bottom edges
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(d.x * 1.6 + (1 - page) * 160 * U).toFixed(2)}px, 0, 0)` }}>
          <Lit frame={F} x={W * 0.86} y={H * 0.62} w={900 * U} h={1100 * U} r={36 * U} tilt={{ x: 10, y: -13 }} ground={GROUNDS.end.base} id="end-page">
            <PageFace F={F} w={900 * U} h={1100 * U} seed="end" />
          </Lit>
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${(x0 + rowW / 2).toFixed(1)}px ${H / 2}px`, transform: `translate3d(${d.x.toFixed(3)}px, ${d.y.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x0.toFixed(2)}px, ${(yRow - markSize / 2).toFixed(2)}px, 0)` }}>
          <LogoMark
            logo={LOGO}
            size={markSize}
            fill={(part) => (t.dark && part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? t.text : undefined)} // the mark's ink parts read on a dark ground
            poses={(_, j) => {
              const p = prog(F, CUE.mark + j * f60x(6), CUE.mark + f60x(30) + j * f60x(6), E.glideOut);
              const glint = j === LOGO.parts.length - 1 ? 0.05 * hitPulse(F - CUE.rest, 4, 14, FPS) : 0;
              return { y: (1 - p) * 46, o: Math.min(1, p * 2), s: 1 + glint };
            }}
          />
        </div>
        <HeroLine id="wordmark" text={name.text} at={name.in} frame={F} move={NAME_MOVE} role="display" size={nameSize} x={x0 + markSize + 44 * U + nameW / 2} y={yRow} color={t.text} accent={t.accent} mute={t.mute} />
        <HeroLine id="payoff" text={pay.text} at={pay.in} frame={F} move={moveOf('payoff')} role="line" size={paySize} x={centre ? W / 2 : x0 + measureTracked(pay.text, paySize, TYPE.line.weight, TYPE.line.track) / 2} y={yRow + markSize / 2 + 90 * U} color={t.mute} accent={t.accent} mute={t.mute} />
      </div>
    </AbsoluteFill>
  );
};
