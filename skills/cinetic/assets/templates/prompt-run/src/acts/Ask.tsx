import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { blurBridge } from '../fx/CutFx';
import { Defocus } from '../fx/Defocus';
import { Iris, irisReveal } from '../fx/Iris';
import { swellState } from '../fx/MicroUI';
import { TypeOn } from '../fx/TypeOn';
import { Composer } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, f60x, H, TYPING, W } from '../timeline';
import { RUN } from '../run';
import { PillShot } from './Pill';
import { circOut, Inked, lineSize, PAGE, useAbs } from './stage';

// ASK - the iris opens out of the wound-up pill already big (37 % of the frame height, covering in 10 f: fx/Iris
// irisReveal) onto a field in the accent's hue that develops for under a second and fades to the stage. The request
// box pushes in on a circ-out while its width unfolds on a faster track of its own (the field opening sideways as we
// push); the line over it is written by a front; the request types fast, a burst of characters landing on one frame.
// The push creeps on; the act line is a hard punch-in, blurred on both sides (fx/CutFx blurBridge).

/** The box at rest (px at 1080p), the push's start scale and lengths, the width's own track (60 fps frames). */
export const BOX = { w: 1290, h: 216, y: 60, from: 0.565, push60: 43, w0: 408, unfold60: 30, creep: 0.04 } as const;

/** The request's typing schedule: fast with a burst on the wide shot, slower in the close-up. */
export const typing = () => {
  const n = RUN.request.length;
  return { start: CUE.type, kind: 'stream' as const, cps: TYPING.wide, skip: [{ at: Math.floor(n * TYPING.burstAt), count: TYPING.burst }], rates: [{ at: Math.floor(n * 0.72), cps: TYPING.close }] };
};

/** The box's screen geometry at absolute frame F: its centre, its content scale and its on-screen width (its own track). */
export const boxAt = (F: number) => {
  const creep = 1 + BOX.creep * prog(F, CUE.iris + f60x(BOX.push60), ACT.click.from, E.linear);
  const k = mix(BOX.from, 1, circOut((F - CUE.iris) / f60x(BOX.push60))) * creep;
  const sw = mix(BOX.w0, BOX.w, circOut((F - CUE.iris) / f60x(BOX.unfold60))) * U * creep;
  return { cx: W / 2, cy: H / 2 + BOX.y * U, k, sw };
};

/** The request box with its typing and the send button's swell (the click act frames it close). */
export const ComposerShot: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const b = boxAt(Math.min(F, ACT.click.from));
  const w = b.sw / b.k;
  const h = BOX.h * U;
  const sw = swellState(F, { at: CUE.press, stops: [PAGE.accent, mixColor(PAGE.accent, PAGE.accentDeep, 0.5), PAGE.accentDeep, PAGE.accent] }, film);
  return (
    <div style={{ position: 'absolute', left: b.cx - w / 2, top: b.cy - h / 2, width: w, height: h, transformOrigin: '50% 50%', transform: `scale(${b.k.toFixed(5)})` }}>
      <Composer theme={PAGE} w={w} h={h} chip={RUN.chip} focus={1} send={{ scale: sw.scale, fill: sw.fill }} id="composer">
        <TypeOn id="request" text={RUN.request} frame={F} {...typing()} role="ui" size={Math.min(h * 0.19, 44 * U)} caret={F < CUE.press} caretOut={CUE.press} />
      </Composer>
    </div>
  );
};

/** The field behind the iris: soft blobs in the accent's hue drifting under a push, a fine grid fading at its edges. */
const Field: React.FC<{ F: number }> = ({ F }) => {
  const t = prog(F, CUE.iris, CUE.fieldOut + f60x(18), E.linear);
  const k = mix(1, 1.3, E.snapOut(t));
  const out = prog(F, CUE.fieldOut, CUE.fieldOut + f60x(18), E.stdInOut);
  const blob = (x: number, y: number, r: number, c: string) => `radial-gradient(circle ${(r * U).toFixed(0)}px at ${x}% ${y}%, ${c}, transparent)`;
  const grid = 31 * U;
  return (
    <AbsoluteFill style={{ background: PAGE.accentDeep, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${k.toFixed(4)})`, background: [blob(30 + 8 * t, 40, 700, PAGE.accent), blob(72 - 6 * t, 62, 620, PAGE.accentSoft), blob(50, 20 + 10 * t, 520, mixColor(PAGE.accent, PAGE.surface, 0.4))].join(', ') }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${PAGE.surface} ${(3 * U).toFixed(1)}px, transparent ${(3 * U).toFixed(1)}px), linear-gradient(90deg, ${PAGE.surface} ${(3 * U).toFixed(1)}px, transparent ${(3 * U).toFixed(1)}px)`,
          backgroundSize: `${grid.toFixed(1)}px ${grid.toFixed(1)}px`,
          opacity: 0.5 * (1 - t),
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 40%, black 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 40%, black 100%)',
        }}
      />
      <AbsoluteFill style={{ background: PAGE.ground, opacity: out }} />
    </AbsoluteFill>
  );
};

export const Ask: React.FC = () => {
  const F = useAbs('ask');
  const film = useFilm();
  const tell = copy('tell');
  const b = boxAt(F);
  const size = lineSize(tell.text, 0.6);
  const iris = irisReveal(CUE.iris, { x: W / 2, y: H / 2 }, film);
  const sigma = blurBridge(F, ACT.click.from, {}, film);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <PillShot F={Math.min(F, ACT.ask.from - 1)} />
      <Iris frame={F} start={iris.start} mode="rate" r0={iris.r0} frames={iris.frames} shape={iris.shape} x={W / 2} y={H / 2}>
        <Defocus sigma={sigma}>
          <Field F={F} />
          <div style={{ position: 'absolute', left: 0, top: b.cy - (BOX.h * U * b.k) / 2 - 190 * U * b.k, width: W, display: 'flex', justifyContent: 'center', transformOrigin: '50% 100%', transform: `scale(${b.k.toFixed(5)})` }}>
            <Inked id="tell" text={tell.text} F={F} at={tell.in} size={size} ink={mixColor(PAGE.surface, PAGE.text, prog(F, CUE.fieldOut, CUE.fieldOut + f60x(18), E.stdInOut))} />
          </div>
          <ComposerShot F={F} />
        </Defocus>
      </Iris>
    </AbsoluteFill>
  );
};
