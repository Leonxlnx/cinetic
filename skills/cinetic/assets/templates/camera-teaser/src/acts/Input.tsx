import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { TypeOn } from '../fx/TypeOn';
import { Composer } from '../kit';
import { E, mix, prog } from '../lib/anim';
import type { CamMove } from '../lib/camera';
import { useFilm } from '../lib/film';
import { ACT, CUE, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { Caption, INK, tail, useAbs, World } from './stage';

// INPUT - the request box on the near-black stage. It rises with an expo tail that never quite stops; its focus
// trails its position (sharp a beat after it lands). A rim light glides along its top and bottom edges. The line over
// it says what the product is; the request starts to type. The camera creeps in, whips left (the typing runs on in the
// smear), then whips right on an ease-in and cuts at its fastest frame through one near-white flash frame.

/** The box in the world (px at 1080p): size and centre offset; its rise; the rim light's streak. */
export const BOX = { w: 1100, h: 196, y: 70, rise: 404, focus60: 24, streak: 240 } as const;

/** The box's centre at absolute frame F: its rise is an expo tail with a residual drift, so it never quite stops. */
export const boxCentre = (F: number, fps: number) => ({ x: W / 2, y: H / 2 + BOX.y * U + tail(F, CUE.rise, BOX.rise * U, fps, 0.04) });

/** The camera of the input shot: a creep, a whip left that settles, a whip right into the cut. */
export const inputMoves = (): CamMove[] => [
  { at: CUE.rise, frames: f60(200), zoom: 1.04, ease: E.linear },
  { at: CUE.whipL, frames: f60(16), pan: { x: -260 * U }, ease: E.strongInOut },
  { at: CUE.whipR, frames: ACT.launch.from - CUE.whipR, pan: { x: 900 * U }, ease: E.launchIn },
];

/** The box world: the rising, focusing box with its typing (the launch act frames it close). `send` hides the button once it flies. */
export const InputWorld: React.FC<{ F: number; sendScale?: number }> = ({ F, sendScale = 1 }) => {
  const film = useFilm();
  const w = BOX.w * U;
  const h = BOX.h * U;
  const { x: cx, y: cy } = boxCentre(F, film.fps);
  const sigma = 8 * (1 - prog(F, CUE.rise, CUE.rise + f60x(BOX.focus60), E.softOut));
  const st = prog(F, CUE.sweep, CUE.sweep + f60x(56), E.stdInOut);
  const glow = Math.sin(Math.PI * st);
  const streak = BOX.streak * U;
  const n = TEASER.request.text.length;
  return (
    <Defocus sigma={sigma}>
      <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h }}>
        <Composer theme={INK} w={w} h={h} chip={TEASER.request.chip} focus={0.35} send={{ scale: sendScale }} id="request-box">
          <TypeOn id="request" text={TEASER.request.text} frame={F} start={CUE.type} kind="prompt" skip={[{ at: Math.floor(n * 0.4), count: Math.min(10, Math.floor(n * 0.3)) }]} role="ui" size={Math.min(h * 0.19, 44 * U)} />
        </Composer>
        {st > 0 && st < 1 && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: Math.min(h * 0.22, 44 * U), overflow: 'hidden', pointerEvents: 'none' }}>
            {[0, 1].map((k) => {
              const x = mix(0.85, 0.15, k ? Math.max(0, st - 0.08) : st) * w - streak / 2;
              return (
                <div key={k} style={{ position: 'absolute', left: x, top: k ? h - 3 * U : 0, width: streak, height: 3 * U, opacity: glow * (k ? 0.5 : 0.9), background: `linear-gradient(90deg, transparent, ${INK.text}, transparent)` }} />
              );
            })}
          </div>
        )}
      </div>
    </Defocus>
  );
};

export const Input: React.FC = () => {
  const F = useAbs('input');
  const flash = F === ACT.launch.from - 1;
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} moves={inputMoves()}>
        <InputWorld F={F} />
      </World>
      <Caption id="what" F={F} y={H / 2 - 190 * U} />
      {flash && <AbsoluteFill style={{ background: INK.text, opacity: 0.92 }} />}
    </AbsoluteFill>
  );
};
