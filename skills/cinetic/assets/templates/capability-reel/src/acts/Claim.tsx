import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, TYPE, typeStyle, U } from '../brand/tokens';
import { Words } from '../fx/Words';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { carry } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, chainOf, CLAIM_POP, claimStarts, CUE, f60, f60x, FPS, H, W } from '../timeline';
import { TICKER_EXIT } from './Ticker';
import { LIGHT, lineSize, useAbs } from './stage';

// CLAIM - the big claim on the accent (the film's one colour event), in two beats, each fragment centred. The first fragment's words pop in
// at full strength; it pushes up and dims to a third as the second rises in from low and to the right. The full stop
// is its own square, anchored by its right edge. The words erase and the camera zooms into the square alone, toward
// the frame's centre: the transition opens from it in inverted colours.

/** The full stop's side on screen when the next act takes it over (its half-size is that act's first ring). */
export const STOP_HANDOFF = 108 * U;

export const Claim: React.FC = () => {
  const F = useAbs('claim');
  const [a, b2] = chainOf('claim');
  const ink = LIGHT.ground; // type on the accent: the paper
  const size = Math.min(lineSize(a.text, 'hero', 0.9), lineSize(b2.text, 'hero', 0.9));
  const hasStop = b2.text.endsWith('.');
  const second = hasStop ? b2.text.slice(0, -1) : b2.text;
  const w2 = measureTracked(second, size, TYPE.hero.weight, TYPE.hero.track);
  const side = size * 0.2;
  // both fragments centred on the frame (the second with its square stop after it)
  const x1 = (W - measureTracked(a.text, size, TYPE.hero.weight, TYPE.hero.track)) / 2;
  const x2 = (W - (w2 + (hasStop ? side * 1.25 : 0))) / 2;
  const y1 = H / 2 - size * 1.05;
  const y2 = H / 2 + size * 0.02;
  const push = prog(F, CUE.dim, CUE.dim + f60x(20), E.stdInOut); // the first fragment pushes up and dims (under 20 px/f: it stays readable)
  const rise = prog(F, CUE.frag2, CUE.frag2 + f60x(12), E.snapOut);
  const erase = prog(F, CUE.erase, CUE.erase + f60x(14), E.buildIn); // the words wipe away right to left, the stop stays
  const stopIn = prog(F, CUE.stop, CUE.stop + f60x(10), E.snapOut);
  const stop = { x: x2 + w2 + side * 0.25, y: y2 + size * TYPE.hero.lead * 0.78 - side };
  // the type takes 60 % of the carried move and settles in 14 f: its words pop under 20 px/f and are read near still
  const co = { vCut: TICKER_EXIT.vCut, settle: 14, settleOver: 10, fps: FPS };
  const inX = 0.6 * (carry(F, ACT.claim.from, co).x - carry(ACT.claim.from + f60(200), ACT.claim.from, co).x);
  // the zoom through the full stop: its centre travels to the frame's centre while it grows to the hand-off size
  const z = prog(F, CUE.zoomIn, ACT.rings.from, E.launchIn);
  const k = lmix(1, STOP_HANDOFF / side, z);
  const sc = { x: stop.x + side / 2, y: stop.y + side / 2 };
  const shift = { x: (W / 2 - sc.x) * z, y: (H / 2 - sc.y) * z };
  // the words pop at full strength, 9 f then 7 f apart (the timeline resolves each fragment on the same frames)
  const starts = (c: typeof a) => claimStarts(c.text, c.in);
  return (
    <AbsoluteFill style={{ background: C.accent, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${sc.x.toFixed(2)}px ${sc.y.toFixed(2)}px`, transform: `translate3d(${(shift.x + inX).toFixed(2)}px, ${shift.y.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: x1, top: y1, clipPath: `inset(0 ${(erase * 100).toFixed(2)}% 0 0)`, opacity: mix(1, 0.29, push), transform: `translate3d(0, ${(-push * 0.5 * size).toFixed(2)}px, 0)` }}>
          <Words id="claim.1" text={a.text} frame={F} start={a.in} starts={starts(a)} size={size} dur={f60x(CLAIM_POP)} style={{ ...typeStyle('hero', size), color: ink }} />
        </div>
        {F >= b2.in - 1 && (
          <div style={{ position: 'absolute', left: x2, top: y2, clipPath: `inset(0 ${(erase * 100).toFixed(2)}% 0 0)`, transform: `translate3d(${((1 - rise) * 68 * U).toFixed(2)}px, ${((1 - rise) * 54 * U).toFixed(2)}px, 0)` }}>
            <Words id="claim.2" text={second} frame={F} start={b2.in} starts={starts(b2)} size={size} dur={f60x(CLAIM_POP)} style={{ ...typeStyle('hero', size), color: ink }} />
          </div>
        )}
        {hasStop && F >= CUE.stop && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: side, height: side, background: ink, transformOrigin: '100% 100%', transform: `translate3d(${stop.x.toFixed(2)}px, ${stop.y.toFixed(2)}px, 0) scale(${mix(1.4, 1, stopIn).toFixed(4)})`, opacity: clamp(stopIn * 3) }} />
        )}
      </div>
    </AbsoluteFill>
  );
};
