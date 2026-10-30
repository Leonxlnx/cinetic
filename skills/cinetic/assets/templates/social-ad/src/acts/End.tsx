import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { TypeLine } from '../fx/TypePresets';
import { E, lmix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { creep } from '../lib/handoff';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, FPS, H } from '../timeline';
import { lockupGeometry, SpunLockup } from './Brand';
import { ActGround, EMPH, keysFor, lineSize, MarkAt, PAGE, useAbs } from './stage';

// END - the lockup on the page. It opens still carrying the push into the cut (x1.04 relaxing to 1 over 30 f) and
// creeps on: the end lock never freezes. The end slot's device (src/deal.ts):
//   spin  the mark spins in, steps aside, the name slides out from behind it (the brand's spin, when the brand did not
//         spin: the mark spins once a film at most)
//   rise  the mark rises out of a mask on its baseline and stops dead (8 f), the name rises beside it 6 f later
// The close then arrives under them on the film's voice (fx/TypePresets crisp, word by word), and holds.

/** The mask rise: a near-linear head that covers most of its travel and stops dead (60 fps frames, em of its height). */
const RISE = { head60: 10, travel: 1.05, lag60: 6 } as const;
const riseOf = (F: number, at: number) => {
  const t = Math.max(0, Math.min(1, (F - at) / f60x(RISE.head60)));
  return RISE.travel * (1 - (t < 0.85 ? t / 0.85 * 0.9 : 0.9 + (t - 0.85) / 0.15 * 0.1));
};

const RisenLockup: React.FC<{ F: number; at: number; name: string; id: string; cy: number }> = ({ F, at, name, id, cy }) => {
  const g = lockupGeometry(name, cy);
  if (F < at) return null;
  const m = riseOf(F, at);
  const n = riseOf(F, at + f60x(RISE.lag60));
  const ink = mixColor(PAGE.mute, PAGE.text, Math.min(1, (F - at - f60x(RISE.lag60)) / f60x(12)));
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: g.mark * 1.2, height: g.mark * 1.2, transform: `translate3d(${(g.cx - g.mark * 0.6).toFixed(2)}px, ${(cy - g.mark * 0.6).toFixed(2)}px, 0)`, overflow: 'hidden' }}>
        <MarkAt x={g.mark * 0.6} y={g.mark * 0.6 + m * g.mark} size={g.mark} />
      </div>
      {F >= at + f60x(RISE.lag60) && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${g.nameLeft.toFixed(2)}px, ${(cy - g.size * 0.62).toFixed(2)}px, 0)`, overflow: 'hidden', height: g.size * 1.1, paddingTop: g.size * 0.06 }}>
          <div data-text={id} style={{ transform: `translate3d(0, ${(n * g.size).toFixed(2)}px, 0)`, fontFamily: FONT.text, fontSize: g.size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color: ink }}>
            {name}
          </div>
        </div>
      )}
    </>
  );
};

export const End: React.FC = () => {
  const F = useAbs('end');
  const nm = copy('wordmark');
  const close = copy('close');
  const cy = H / 2 - 50 * U;
  const size = lineSize(close.text, 0.5) * 0.72; // the close reads under the name, smaller than the ad's line, never under 72 px
  const k = lmix(1.04, 1, prog(F, ACT.end.from, ACT.end.from + f60x(30), E.glideOut)) * creep(F, ACT.end.from, { pctPerSec: 0.03 }, FPS);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="end" />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${k.toFixed(5)})` }}>
        {DEAL.end === 'spin' ? <SpunLockup F={F} at={CUE.endMark} name={nm.text} id="wordmark" cy={cy} color={PAGE.text} /> : <RisenLockup F={F} at={CUE.endMark} name={nm.text} id="wordmark" cy={cy} />}
        {F >= close.in - 1 && <TypeLine spec={{ preset: 'crisp', text: close.text, at: close.in - 1, colors: { ink: PAGE.mute, mute: mixColor(PAGE.mute, PAGE.ground, 0.55), accent: PAGE.accent }, id: 'close', emph: EMPH.close, keys: keysFor('close', close.text) }} frame={F} size={Math.max(72 * U, size)} y={cy + 170 * U} />}
      </div>
    </AbsoluteFill>
  );
};
