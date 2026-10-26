import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, TYPE, typeStyle, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { Defocus } from '../fx/Defocus';
import { Words } from '../fx/Words';
import { Photo, Surface } from '../kit';
import { E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { DARK, LIGHT, lineSize, useAbs } from './stage';

// END - the lockup, built from the mark's own parts: they arrive in turn and the name is set beside them, off-centre,
// with the payoff line under it; the output stays behind as a soft far plane on the right. The key passes once
// across the set (the end card's light event) and a slow push keeps the lock alive to the end.

export const End: React.FC = () => {
  const F = useAbs('end');
  const t = DARK;
  const name = copy('wordmark');
  const pay = copy('payoff');
  const markSize = 190 * U;
  const nameSize = TYPE.display.size * U;
  const paySize = lineSize(pay.text, 'line', 0.62);
  const k = creep(F, ACT.end.from, { pctPerSec: 0.02 }, FPS) * lmix(1.06, 1, prog(F, ACT.end.from, ACT.end.from + f60x(30), E.snapOut));
  const band = prog(F, CUE.light, CUE.light + f60x(90), E.stdInOut);
  const lock = prog(F, name.in, CUE.lockup, E.snapOut);
  const x0 = 170 * U;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      {/* the output as the far plane: soft, cropped by the right edge */}
      <div style={{ position: 'absolute', left: W * 0.74, top: 140 * U, opacity: 0.45 }}>
        <Defocus sigma={12}>
          <Surface theme={LIGHT} w={900 * U} h={1100 * U} lift={40} r={40 * U}>
            <div style={{ position: 'absolute', left: 60 * U, top: 300 * U }}>
              <Photo theme={LIGHT} w={780 * U} h={460 * U} seed={31} radius={24 * U} />
            </div>
          </Surface>
        </Defocus>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${x0}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: x0, top: 330 * U }}>
          <LogoMark
            logo={LOGO}
            size={markSize}
            fill={(part) => (part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? t.text : undefined)} // the mark's ink parts read on the dark ground
            poses={(_, j) => {
              const p = prog(F, CUE.mark + j * f60x(5), CUE.mark + f60x(24) + j * f60x(5), E.glideOut);
              const glint = j === LOGO.parts.length - 1 ? 0.1 * hitPulse(F - CUE.rest, 2, 9, FPS) : 0;
              return { x: (1 - p) * -50, o: p, s: 1 + glint };
            }}
          />
        </div>
        {F >= name.in - 1 && (
          <div style={{ position: 'absolute', left: x0 + markSize + 50 * U, top: 330 * U + markSize / 2 - (nameSize * TYPE.display.lead) / 2, color: t.text, transform: `translate3d(${((1 - lock) * -40 * U).toFixed(2)}px, 0, 0)` }}>
            <Words id="wordmark" text={name.text} frame={F} start={name.in} size={nameSize} style={{ ...typeStyle('display', nameSize), color: t.text }} />
          </div>
        )}
        {F >= pay.in - 1 && (
          <div style={{ position: 'absolute', left: x0, top: 640 * U }}>
            <Words id="payoff" text={pay.text} frame={F} start={pay.in} size={paySize} style={{ ...typeStyle('line', paySize), color: t.mute }} />
          </div>
        )}
      </div>
      {/* the key passing across the set once */}
      {F >= CUE.light && F < CUE.light + f60x(90) && (
        <AbsoluteFill style={{ background: `linear-gradient(112deg, rgba(255,255,255,0) ${mix(-30, 110, band) - 14}%, rgba(255,255,255,0.09) ${mix(-30, 110, band)}%, rgba(255,255,255,0) ${mix(-30, 110, band) + 14}%)` }} />
      )}
    </AbsoluteFill>
  );
};
