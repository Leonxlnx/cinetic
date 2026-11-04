import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { phrase } from '../lib/cadence';
import { DEAL, NAME_MOVE } from '../deal';
import { Lit } from '../fx/Lit';
import { E, hitPulse, lmix, prog } from '../lib/anim';
import { measureTracked } from '../lib/measure';
import { ReadBack } from '../fx/ReadBack';
import { ACT, copy, CUE, f60x, FPS, H, moveOf, TOTAL, W } from '../timeline';
import { PageFace } from './Page';
import { Ground, HOLD, GROUNDS, lineSize, themeOf, useAbs } from './stage';
import { HeroLine } from './type';

/** The mark's parts land phrased, the last after a held beat (it carries the glint): lib/cadence, the span of a 6 f stagger. */
const PART_ON = phrase(LOGO.parts.length, f60x(6), { shape: 'settle', seed: 'mark-parts', whole: false }).onsets;

// END - the lockup, built from the mark's own parts: they arrive in turn, the name is set beside them on a confident
// move (never letter by letter) and the payoff line arrives under it on its dealt move, the lockup centred. By the
// dealt device: 'side' keeps the output live behind the lockup, lit and facing the camera, stepping back (soft, dim, a little
// smaller) as the name arrives (the end card built from the film's last picture); 'centre' sets the lockup alone in
// the middle of a clean ground. A slow push keeps the lock alive; it holds about a second and a half before the tail.

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
  const x0 = (W - rowW) / 2;
  const yRow = H / 2 - 70 * U;
  const k = lmix(1.04, 1, prog(F, ACT.end.from, ACT.end.from + f60x(50), E.glideOut)) * lmix(1, 1.03, prog(F, ACT.end.from, ACT.end.from + ACT.end.dur, E.linear));
  const d = HOLD; // the hold rests between moves (no drift)
  const page = prog(F, ACT.end.from, ACT.end.from + f60x(56), E.glideOut);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Ground act="end" F={F} />
      {!centre && (
        // the output, live behind its name: lit, facing the camera, cropped by the bottom edge, stepping back as the name lands
        <ReadBack F={F} at={name.in} out={TOTAL + 600} dim={0.8} blur={9} scale={0.06}>
          <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(d.x * 1.6).toFixed(2)}px, ${((1 - page) * 120 * U).toFixed(2)}px, 0)` }}>
            <Lit frame={F} x={W / 2} y={H * 0.62} w={900 * U} h={1100 * U} r={36 * U} ground={GROUNDS.end.base} id="end-page">
              <PageFace F={F} w={900 * U} h={1100 * U} seed="end" />
            </Lit>
          </div>
        </ReadBack>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${(x0 + rowW / 2).toFixed(1)}px ${H / 2}px`, transform: `translate3d(${d.x.toFixed(3)}px, ${d.y.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x0.toFixed(2)}px, ${(yRow - markSize / 2).toFixed(2)}px, 0)` }}>
          <LogoMark
            logo={LOGO}
            size={markSize}
            fill={(part) => (t.dark && part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? t.text : undefined)} // the mark's ink parts read on a dark ground
            poses={(_, j) => {
              const p = prog(F, CUE.mark + PART_ON[j], CUE.mark + f60x(30) + PART_ON[j], E.glideOut);
              const glint = j === LOGO.parts.length - 1 ? 0.05 * hitPulse(F - CUE.rest, 4, 14, FPS) : 0;
              return { y: (1 - p) * 46, o: Math.min(1, p * 2), s: 1 + glint };
            }}
          />
        </div>
        <HeroLine id="wordmark" text={name.text} at={name.in} frame={F} move={NAME_MOVE} role="display" size={nameSize} x={x0 + markSize + 44 * U + nameW / 2} y={yRow} color={t.text} accent={t.accent} mute={t.mute} />
        <HeroLine id="payoff" text={pay.text} at={pay.in} frame={F} move={moveOf('payoff')} role="line" size={paySize} x={W / 2} y={yRow + markSize / 2 + 90 * U} color={t.mute} accent={t.accent} mute={t.mute} />
      </div>
    </AbsoluteFill>
  );
};
