import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { Comets } from '../fx/Gather';
import { TypeLine } from '../fx/TypePresets';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, DEAL, f60x, FPS, H, W } from '../timeline';
import { FONT, INK, MarkAt, useAbs, voiceSpec, World } from './stage';

// END - the mark, the name beside it, the close under them; the lockup holds on a slow creep while the track's last hit
// rings. The deal's device:
//   comets    two comets spiral out of the last word, orbit and spiral in, faster and faster (fx/Gather Comets); the
//             hard cut lands as they meet, still accelerating, onto the mark turning in from 50 degrees on a circ-out
//   assemble  the mark's parts arrive from three sides on glides a few frames apart and lock together, the camera
//             easing back as they meet
// The name rises in beside the mark; the close arrives on the film's voice (never letter by letter).

const LOCK = { mark: 210, name: 160, gap: 0.3, close: 84, below: 170 } as const;

/**
 * The comets' run, timed so they meet on the frame after the cut (the cut lands while they still accelerate): the house
 * 6 / 4 / 18 f (60 fps) of spiral out, orbit and collapse, squeezed to fit between the act line and the mark at a fast track.
 */
export const cometsRun = () => {
  const T60 = 28;
  const k = Math.min(1, ((CUE.mark + 1 - ACT.end.from) * 60) / FPS / T60);
  return { at: CUE.mark + 1 - f60x(T60 * k), frames: { expand: 6 * k, orbit: 4 * k, collapse: 18 * k } };
};

export const End: React.FC = () => {
  const F = useAbs('end');
  const nm = copy('wordmark');
  const close = copy('close');
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = size * LOCK.gap;
  const wName = measureTracked(nm.text, size, TYPE.display.weight, TYPE.display.track, FONT.text, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const cy = H / 2 - 80 * U; // the lockup a little above the middle, so the close under it stays in the middle band
  const comets = DEAL.end === 'comets';
  const turn = prog(F, CUE.mark, CUE.mark + f60x(30), (t) => Math.sqrt(1 - (1 - t) ** 2));
  const rise = prog(F, nm.in, nm.in + f60x(30), E.glideOut);
  const k = creep(F, comets ? CUE.mark : ACT.end.from, { pctPerSec: 0.012 }, FPS) * (comets ? 1 : lmix(1.12, 1, prog(F, ACT.end.from, CUE.mark + f60x(20), E.glideOut)));
  const cs = LOCK.close * U;
  // assemble: each part of the mark starts off to one side and glides home, a few frames apart, landing on the mark cue
  const poses = comets
    ? undefined
    : (_: unknown, i: number) => {
        const from = [{ x: -60, y: 18, rot: -24 }, { x: 54, y: -40, rot: 30 }, { x: 10, y: 60, rot: -12 }][i % 3];
        const q = prog(F, ACT.end.from + f60x(6 * i), CUE.mark + f60x(4 * i), E.glideOut);
        return { x: from.x * (1 - q), y: from.y * (1 - q), rot: from.rot * (1 - q), o: clamp(q * 3) };
      };
  const moves = [{ at: ACT.end.from, frames: ACT.end.dur, zoom: 1.03, ease: E.linear }];
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} act="end" moves={moves}>
        <div />
      </World>
      {comets && F < CUE.mark && <Comets frame={F} {...cometsRun()} x={W / 2} y={H / 2} color={INK.text} />}
      {(!comets || F >= CUE.mark) && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
          <MarkAt x={left + markH / 2} y={cy} size={markH} rot={comets ? mix(50, 0, turn) : 0} s={comets ? lmix(1.15, 1, turn) : 1} poses={poses} />
          {F >= nm.in && (
            <div style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', transform: `translate3d(${(left + markH + gap).toFixed(2)}px, ${(cy - size * 0.62).toFixed(2)}px, 0)` }}>
              <div data-text="wordmark" style={{ fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1.1, whiteSpace: 'pre', color: INK.text, opacity: clamp(rise * 2), transform: `translate3d(${((1 - rise) * -0.35).toFixed(4)}em, 0, 0)` }}>
                {nm.text}
              </div>
            </div>
          )}
        </div>
      )}
      {F >= close.in - 1 && (
        <TypeLine spec={voiceSpec('close', { ink: INK.mute })} frame={F} x={W / 2} y={cy + LOCK.below * U + cs * 0.55} size={cs} weight={TYPE.line.weight} track={TYPE.line.track} />
      )}
    </AbsoluteFill>
  );
};
