import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Words } from '../fx/Words';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { creep, intoCut } from '../lib/handoff';
import { ACT, CLAIM_GAP, copy, CUE, f60, f60x, FPS, H, W } from '../timeline';
import { Cam, LIGHT, lineSize, useAbs } from './stage';

// CLAIM - the speed claim. Its first word arrives giant (the film's one giant word), revealed bottom-up behind the
// wipe that opened the act; on ONE frame the camera snaps out to the whole line (the giant word becomes its first
// word, a defocus clearing) and the other words arrive a word gap apart. The hold pushes in and accelerates into the
// cut, and the field opens on that push; the key swells once across the line while it is read. An inline picture (fx/InlineGap) may take a word's place: an icon for the
// number, the product's mark for its name.

export const Claim: React.FC = () => {
  const F = useAbs('claim');
  const t = LIGHT;
  const c = copy('claim');
  const words = c.text.trim().split(/\s+/);
  const size = lineSize(c.text, 'display');
  const giant = Math.max(TYPE.giant.size * U * 0.6, size * 2.4);
  const snapped = F >= CUE.claimSnap;
  const reveal = prog(F, CUE.claim, CUE.claim + f60x(12), E.snapOut);
  const soft = snapped ? mix(6, 0, clamp((F - CUE.claimSnap) / f60x(6))) : 0;
  const k = creep(F, CUE.claimSnap, { pctPerSec: 0.05 }, FPS) * lmix(1, 1.35, intoCut(F, ACT.field.from, 30, FPS)); // x1.35 keeps the read type under 20 px/f into the cut
  const starts = words.map((_, i) => (i === 0 ? CUE.claim - f60(60) : CUE.claimSnap + f60(CLAIM_GAP * i)));
  const key = 0.06 * hitPulse(F - CUE.claimLight, 8, 48, FPS); // one light event under the read: the key swells across the line
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `linear-gradient(200deg, rgba(255,255,255,${key.toFixed(3)}) 0%, rgba(255,255,255,0) 60%)` }} />
      <Defocus sigma={soft}>
        <Cam k={k}>
          {!snapped ? (
            <div style={{ position: 'absolute', left: 0, top: H / 2 - (giant * TYPE.giant.lead) / 2, width: W, display: 'flex', justifyContent: 'center', clipPath: `inset(${((1 - reveal) * 100).toFixed(2)}% 0 0 0)` }}>
              <span data-text="claim-giant" style={{ ...typeStyle('giant', giant), color: t.text, transform: `translate3d(0, ${((1 - reveal) * 0.25 * giant).toFixed(2)}px, 0)` }}>
                {words[0]}
              </span>
            </div>
          ) : (
            <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * TYPE.display.lead) / 2, width: W, display: 'flex', justifyContent: 'center' }}>
              <Words id="claim" text={c.text} frame={F} start={starts[0]} starts={starts} size={size} style={{ ...typeStyle('display', size), color: t.text }} />
            </div>
          )}
        </Cam>
      </Defocus>
    </AbsoluteFill>
  );
};
