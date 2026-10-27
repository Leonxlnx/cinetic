import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { ACT, copy, CUE, FPS, H, W } from '../timeline';
import { SpunLockup } from './Brand';
import { adSize, adStyle, adWidth, PAGE, useAbs } from './stage';

// END - the lockup on white: the mark spins in again (the same spin-in, so the ad closes on the move it opened the
// brand with), steps aside, the name slides out; the close settles under them from 108 % into focus and holds.

export const End: React.FC = () => {
  const F = useAbs('end');
  const nm = copy('wordmark');
  const close = copy('close');
  const cy = H / 2 - 50 * U;
  const size = adSize(close.text, 0.5); // never under 72 px: the close is read at feed size too
  const settle = prog(F, close.in, close.resolved, E.snapOut);
  const k = creep(F, ACT.end.from, { pctPerSec: 0.012 }, FPS);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        <SpunLockup F={F} at={CUE.endMark} name={nm.text} id="wordmark" cy={cy} color={PAGE.text} />
        {F >= close.in - 1 && (
          <div style={{ position: 'absolute', left: (W - adWidth(close.text, size)) / 2, top: cy + 150 * U }}>
            <Defocus sigma={mix(6, 0, settle)}>
              <div style={{ transformOrigin: '50% 50%', transform: `scale(${lmix(1.08, 1, settle).toFixed(5)})`, opacity: clamp(settle * 2.5) }}>
                <span data-text="close" style={adStyle(size, PAGE.mute)}>
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
