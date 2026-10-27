import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Comets } from '../fx/Gather';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { copy, CUE, f60x, FPS, H, W } from '../timeline';
import { FONT, INK, MarkAt, useAbs } from './stage';

// END - two comets spiral out of the last word, orbit and spiral in, faster and faster (fx/Gather Comets); on the frame
// they meet, a hard cut to the mark turning in from 50 degrees on a circ-out; the name beside it, the close under them
// settling into focus; the lockup holds on a slow creep.

const LOCK = { mark: 170, name: 130, gap: 0.3 } as const;

export const End: React.FC = () => {
  const F = useAbs('end');
  const nm = copy('wordmark');
  const close = copy('close');
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = size * LOCK.gap;
  const wName = measureTracked(nm.text, size, TYPE.display.weight, TYPE.display.track, FONT.text, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const cy = H / 2 - 40 * U;
  const turn = prog(F, CUE.mark, CUE.mark + f60x(24), (t) => Math.sqrt(1 - (1 - t) ** 2));
  const rise = prog(F, nm.in, nm.resolved + f60x(6), E.snapOut);
  const k = creep(F, CUE.mark, { pctPerSec: 0.012 }, FPS);
  const cs = 72 * U;
  const settle = prog(F, close.in, close.resolved, E.snapOut);
  const cw = measureTracked(close.text, cs, TYPE.line.weight, TYPE.line.track, FONT.text, { trailing: false });
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      {F < CUE.mark && <Comets frame={F} at={CUE.comets} x={W / 2} y={H / 2} color={INK.text} />}
      {F >= CUE.mark && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
          <MarkAt x={left + markH / 2} y={cy} size={markH} rot={mix(50, 0, turn)} s={lmix(1.15, 1, turn)} />
          {F >= nm.in && (
            <div data-text="wordmark" style={{ position: 'absolute', left: left + markH + gap, top: cy - size * 0.56, fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color: INK.text, opacity: clamp(rise * 2), transform: `translate3d(0, ${((1 - rise) * 0.25).toFixed(4)}em, 0)` }}>
              {nm.text}
            </div>
          )}
        </div>
      )}
      {F >= close.in - 1 && (
        <div style={{ position: 'absolute', left: (W - cw) / 2, top: cy + 140 * U }}>
          <Defocus sigma={mix(6, 0, settle)}>
            <div style={{ transformOrigin: '50% 50%', transform: `scale(${lmix(1.08, 1, settle).toFixed(5)})`, opacity: clamp(settle * 2.5) }}>
              <span data-text="close" style={{ fontFamily: FONT.text, fontSize: cs, fontWeight: TYPE.line.weight, letterSpacing: `${TYPE.line.track}em`, lineHeight: 1.1, whiteSpace: 'pre', color: INK.mute }}>
                {close.text}
              </span>
            </div>
          </Defocus>
        </div>
      )}
    </AbsoluteFill>
  );
};
