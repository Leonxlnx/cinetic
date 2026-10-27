import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, f60x, FPS, H, W } from '../timeline';
import { lineSize, lineStyle, lineWidth, MarkAt, PAGE, useAbs } from './stage';

// END - out of the result's defocus: the mark pops, the name rises in beside it, the close settles under them from
// 108 % into focus; the lockup holds on a slow creep.

const LOCK = { mark: 150, name: 140, gap: 0.3, below: 150 } as const;

export const End: React.FC = () => {
  const F = useAbs('end');
  const nm = copy('wordmark');
  const close = copy('close');
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = size * LOCK.gap;
  const wName = measureTracked(nm.text, size, TYPE.display.weight, TYPE.display.track, FONT.text, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const cy = H / 2 - 50 * U;
  const pop = prog(F, ACT.end.from - 1, ACT.end.from + f60x(14), E.snapOut); // on screen from the act's first frame
  const rise = prog(F, nm.in, nm.resolved + f60x(6), E.snapOut);
  const cs = lineSize(close.text, 0.5);
  const settle = prog(F, close.in, close.resolved, E.snapOut);
  const k = creep(F, ACT.end.from, { pctPerSec: 0.012 }, FPS);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        <MarkAt x={left + markH / 2} y={cy} size={markH} s={mix(0.6, 1, pop)} o={Math.min(1, pop * 3)} />
        {F >= nm.in && (
          <div data-text="wordmark" style={{ position: 'absolute', left: left + markH + gap, top: cy - size * 0.56, fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color: PAGE.text, opacity: clamp(rise * 2), transform: `translate3d(0, ${((1 - rise) * 0.25).toFixed(4)}em, 0)` }}>
            {nm.text}
          </div>
        )}
        {F >= close.in - 1 && (
          <div style={{ position: 'absolute', left: (W - lineWidth(close.text, cs)) / 2, top: cy + LOCK.below * U - (cs * 1.15) / 2 }}>
            <Defocus sigma={mix(6, 0, settle)}>
              <div style={{ transformOrigin: '50% 50%', transform: `scale(${lmix(1.08, 1, settle).toFixed(5)})`, opacity: clamp(settle * 2.5) }}>
                <span data-text="close" style={{ ...lineStyle(cs), color: PAGE.mute }}>
                  {close.text}
                </span>
              </div>
            </Defocus>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
