import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, SAFE, TYPE, typeStyle, U } from '../brand/tokens';
import { AccentClaim, inkOn } from '../fx/TypeClaim';
import { TypeLine } from '../fx/TypePresets';
import { Words } from '../fx/Words';
import { E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { DEAL } from '../deal';
import { ACT, copy, f60x, FPS, H, W } from '../timeline';
import { ActGround, capOf, EMPH, keysFor, MarkWord, PAGE, sentenceSize, useAbs, useCrisp } from './stage';
import { hubOnScreen } from './Grid';

// END - the close. The dealt device (src/deal.ts):
//   lockup  the hub steps aside and grows into the lockup's mark; the name rises in beside it on the crisp entry (one
//           word, never letter by letter); the close arrives under them on the film's voice, word by word
//           (fx/TypePresets crisp, as the halves are said), and holds on a creep
//   claim   the accent floods the frame from the hub (a circle opening on E.glideOut: the film's one colour event);
//           the close is set as the claim on it (fx/TypeClaim: cap 16 % of the frame or more, flush left at 3 %,
//           -0.04 em, semibold, built word by word on the crisp entry), the lockup small on the top margin

const LOCK = { mark: 150, name: 140, below: 150 } as const;

export const End: React.FC = () => {
  const F = useAbs('end');
  const crisp = useCrisp();
  const hub = hubOnScreen(ACT.end.from);
  const nm = copy('wordmark');
  const close = copy('close');
  const k = creep(F, ACT.end.from, { pctPerSec: 0.012 }, FPS); // a sub-pixel creep under the lockup (the end lock may hold still)
  if (DEAL.end === 'claim') {
    const flood = prog(F, ACT.end.from + f60x(4), ACT.end.from + f60x(40), E.glideOut);
    const inked = prog(F, ACT.end.from + f60x(8), ACT.end.from + f60x(30), E.stdInOut);
    const r = Math.hypot(W, H) * 0.6 * flood;
    const ink = inkOn(C.accent);
    const small = 96 * U;
    const markS = capOf(small) * 1.3;
    const move = prog(F, ACT.end.from, ACT.end.from + f60x(40), E.glideOut);
    // the mark and the name: one row centred at the top (never flush left), the claim centred in the middle under it
    const nameGap = capOf(small) * 0.4;
    const rowX = (W - (markS + nameGap + measureTracked(nm.text, small, TYPE.display.weight, TYPE.display.track))) / 2;
    const mx = mix(W / 2, rowX + markS / 2, move);
    const my = mix(H / 2, SAFE.y + markS / 2 + 12 * U, move);
    return (
      <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
        <ActGround F={F} act="end" from="grid" />
        <AbsoluteFill style={{ background: C.accent, clipPath: `circle(${r.toFixed(1)}px at ${(W / 2).toFixed(1)}px ${(H / 2).toFixed(1)}px)` }} />
        {/* the mark turns to the claim's ink as the accent reaches it: two marks crossfading, never a one-frame flip */}
        <MarkWord x={mx} y={my} size={markS} s={lmix(hub / markS, 1, move)} o={1 - inked} />
        {inked > 0 && <MarkWord x={mx} y={my} size={markS} s={lmix(hub / markS, 1, move)} o={inked} fill={ink} />}
        {F >= nm.in && (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(rowX + markS + nameGap).toFixed(2)}px, ${(my - small * 0.56).toFixed(2)}px, 0)` }}>
            <Words id="wordmark" text={nm.text} frame={F} start={nm.in} {...crisp} size={small} color={ink} style={{ ...typeStyle('display', small), lineHeight: 1, color: ink }} />
          </div>
        )}
        {F >= close.in && (
          <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${k.toFixed(5)})` }}>
            <AccentClaim text={close.text} at={close.in} frame={F} flood={false} ground={C.accent} color={ink} maxLines={2} id="close" />
          </div>
        )}
      </AbsoluteFill>
    );
  }
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = size * 0.3;
  const wName = measureTracked(nm.text, size, TYPE.display.weight, TYPE.display.track, undefined, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const yLock = H / 2 - 60 * U;
  const move = prog(F, ACT.end.from, ACT.end.from + f60x(40), E.glideOut);
  const mx = mix(W / 2, left + markH / 2, move);
  const my = mix(H / 2, yLock, move);
  const ms = lmix(hub / markH, 1, move);
  const cs = sentenceSize(close.text);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="end" from="grid" />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        <MarkWord x={mx} y={my - capOf(size) * 0.1 * move} size={markH} s={ms} />
        {F >= nm.in && (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(left + markH + gap).toFixed(2)}px, ${(yLock - size * 0.56).toFixed(2)}px, 0)` }}>
            <Words id="wordmark" text={nm.text} frame={F} start={nm.in} {...crisp} size={size} style={{ ...typeStyle('display', size), lineHeight: 1 }} />
          </div>
        )}
        {F >= close.in - 1 && (
          <TypeLine spec={{ preset: 'crisp', text: close.text, at: close.in - 1, colors: { ink: PAGE.mute, mute: mixColor(PAGE.mute, PAGE.ground, 0.55), accent: PAGE.accent }, id: 'close', emph: EMPH.close, keys: keysFor('close', close.text) }} frame={F} size={cs} y={yLock + LOCK.below * U} />
        )}
      </div>
    </AbsoluteFill>
  );
};
