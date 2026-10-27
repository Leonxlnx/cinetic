import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, f60x, FPS, H, W } from '../timeline';
import { capOf, MarkWord, PAGE, sentenceSize, sentenceStyle, sentenceWidth, useAbs } from './stage';
import { HUB, hubPush, systemSize } from './System';

// END - the hub steps aside and grows into the lockup's mark; the name sets beside it letter by letter, a frame and a
// half apart; the close settles under them from 108 % into focus. The lockup holds to the end on a slow creep.

const LOCK = { mark: 150, name: 140, lead: 2, gap: 1.5, frames: 14, rise: 0.3, below: 150 } as const;

export const End: React.FC = () => {
  const F = useAbs('end');
  const hub = capOf(systemSize()) * HUB.mark * hubPush(ACT.grid.from);
  const nm = copy('wordmark');
  const close = copy('close');
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = size * 0.3;
  const wName = measureTracked(nm.text, size, TYPE.display.weight, TYPE.display.track, undefined, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const yLock = H / 2 - 60 * U;
  const move = prog(F, ACT.end.from, ACT.end.from + f60x(36), E.glideOut);
  const mx = mix(W / 2, left + markH / 2, move);
  const my = mix(H / 2, yLock, move);
  const ms = lmix(hub / markH, 1, move);
  const cs = sentenceSize(close.text);
  const settle = prog(F, close.in, close.resolved, E.snapOut);
  const k = creep(F, ACT.end.from, { pctPerSec: 0.01 }, FPS);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        <MarkWord x={mx} y={my} size={markH} s={ms} />
        {F >= nm.in && (
          <div data-text="wordmark" style={{ position: 'absolute', left: left + markH + gap, top: yLock - size * 0.56, display: 'flex', whiteSpace: 'pre', fontFamily: FONT.text }}>
            {/* lint-ok: hero word (the name sets letter by letter once, at the lockup) */}
            {[...nm.text].map((ch, i) => {
              const at = nm.in + f60x(LOCK.lead + LOCK.gap * i);
              const p = prog(F, at, at + f60x(LOCK.frames), E.snapOut);
              return (
                <span key={i} style={{ display: 'inline-block', fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, color: PAGE.text, opacity: Math.min(1, p * 2.5), transform: `translate3d(0, ${((1 - p) * LOCK.rise).toFixed(4)}em, 0)` }}>
                  {ch}
                </span>
              );
            })}
          </div>
        )}
        {F >= close.in - 1 && (
          <div style={{ position: 'absolute', left: (W - sentenceWidth(close.text, cs)) / 2, top: yLock + LOCK.below * U - (cs * 1.2) / 2 }}>
            <Defocus sigma={mix(6, 0, settle)}>
              <div style={{ transformOrigin: '50% 50%', transform: `scale(${lmix(1.08, 1, settle).toFixed(5)})`, opacity: clamp(settle * 2.5) }}>
                <span data-text="close" style={sentenceStyle(cs)}>
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
