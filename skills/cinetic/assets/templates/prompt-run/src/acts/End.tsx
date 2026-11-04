import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, DEAL, f60x, FPS, H, W } from '../timeline';
import { Ground, Line, lineSize, MarkAt, PAGE, SoftCut, useAbs } from './stage';

// END - the lockup, out of the result (its defocus, or the accent leaving up off the frame). The deal's device:
//   pop       the mark lands from 60 % on a glide, sharp from its first frame, and the name slides out from behind it
//   assemble  the mark's parts glide in from three sides a few frames apart and lock together, the camera easing back
// The close lands under them on the film's voice (never letter by letter); the lockup holds on a slow creep while the
// track's last hit rings, about 1.6 s, then the film ends.

const LOCK = { mark: 150, name: 140, gap: 0.3, below: 160 } as const;

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
  const assemble = DEAL.end === 'assemble';
  const pop = prog(F, ACT.end.from, ACT.end.from + f60x(30), E.glideOut);
  const slide = prog(F, nm.in, nm.in + f60x(34), E.glideOut);
  const k = creep(F, ACT.end.from, { pctPerSec: 0.012 }, FPS) * (assemble ? lmix(1.1, 1, prog(F, ACT.end.from, CUE.name + f60x(30), E.glideOut)) : 1);
  const poses = assemble
    ? (_: unknown, i: number) => {
        const from = [{ x: -60, y: 18, rot: -24 }, { x: 54, y: -40, rot: 30 }, { x: 10, y: 60, rot: -12 }][i % 3];
        const q = prog(F, ACT.end.from + f60x(5 * i), CUE.name + f60x(4 * i), E.glideOut);
        return { x: from.x * (1 - q), y: from.y * (1 - q), rot: from.rot * (1 - q), o: clamp(q * 3) };
      }
    : undefined;
  // the claim's accent leaves up off the frame over the first 18 f (the seam out of the claim)
  const lift = DEAL.done === 'claim' ? prog(F, ACT.end.from, ACT.end.from + f60x(18), E.launchIn) : 1;
  // out of the result's defocus (morph): the lockup comes sharp over its first frames (a cross-fade from a defocused copy)
  const soft = DEAL.done === 'claim' ? 0 : 1 - prog(F, ACT.end.from, ACT.end.from + f60x(16), E.stdInOut);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <Ground act="end" F={F} carry={DEAL.done === 'morph' ? { from: 'done', frames: 24 } : undefined} />
      <SoftCut k={soft}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
          <MarkAt x={left + markH / 2} y={cy} size={markH} s={assemble ? 1 : mix(0.6, 1, pop)} o={assemble ? 1 : prog(F, ACT.end.from, ACT.end.from + f60x(10), E.stdInOut)} poses={poses} />
          {F >= nm.in && (
            // the name slides out from behind the mark: masked at the mark's right edge
            <div style={{ position: 'absolute', left: 0, top: 0, width: wName + gap, height: size * 1.3, overflow: 'hidden', transform: `translate3d(${(left + markH + gap * 0.2).toFixed(2)}px, ${(cy - size * 0.66).toFixed(2)}px, 0)` }}>
              <div data-text="wordmark" style={{ fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1.3, whiteSpace: 'pre', color: PAGE.text, transform: `translate3d(${(gap * 0.8 - (1 - slide) * (wName + gap)).toFixed(2)}px, 0, 0)` }}>
                {nm.text}
              </div>
            </div>
          )}
        </div>
        <Line id="close" F={F} y={cy + LOCK.below * U} size={lineSize(close.text, 0.5)} colors={{ ink: PAGE.mute }} />
      </SoftCut>
      {lift < 1 && <AbsoluteFill style={{ background: PAGE.accent, transform: `translate3d(0, ${(-H * lift).toFixed(2)}px, 0)` }} />}
    </AbsoluteFill>
  );
};
