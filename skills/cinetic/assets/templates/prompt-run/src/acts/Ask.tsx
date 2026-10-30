import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Iris, irisReveal } from '../fx/Iris';
import { swellState } from '../fx/MicroUI';
import { TypeOn } from '../fx/TypeOn';
import { Composer, surfaceShadow } from '../kit';
import { clamp, E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, DEAL, f60x, H, TYPING, W } from '../timeline';
import { RUN } from '../run';
import { PillShot, pillState } from './Pill';
import { circOut, Ground, Line, lineSize, PAGE, useAbs } from './stage';

// ASK - the request box. It arrives by the deal's device:
//   iris     the iris opens out of the wound-up pill already big (fx/Iris irisReveal) onto a flat field of the accent
//            (the film's one colour event, under a second); the box pushes in on a circ-out while its width unfolds on
//            a faster track of its own; then the field wipes up off the frame, the line over the box changing from the
//            accent's ink to the page's as the edge crosses it (a knockout, never a fade)
//   stretch  no cut: the pill itself stretches into the box (its width, height and corners glide over 36 f at 60 fps),
//            the label dropping out of it as it grows and the box's controls rising in once it has landed
// The line over it lands on the film's voice; the request types fast and slows toward its end; the send button arms. The push creeps on; the act line is a hard punch-in, blurred on both sides on continuous ramps
// (punchBlur: never a held, stepped blur frame).

/** The box at rest (px at 1080p), the push's start scale and lengths, the width's own track, the stretch (60 fps frames). */
export const BOX = { w: 1290, h: 216, y: 60, from: 0.565, push60: 43, w0: 408, unfold60: 30, creep: 0.04, stretch60: 36, wipe60: 24 } as const;

/** The request's typing schedule: fast on the wide shot, slower toward its end (no one-frame burst: every key lands on its own frame). */
export const typing = () => {
  const n = RUN.request.length;
  return { start: CUE.type, kind: 'stream' as const, cps: TYPING.wide, rates: [{ at: Math.floor(n * 0.72), cps: TYPING.close }] };
};

/**
 * The box's screen geometry at absolute frame F: its centre, its content scale, its on-screen width and height, its
 * corner radius and how far its controls have come in (the stretch grows the pill into it; the iris pushes it in).
 */
export const boxAt = (F: number) => {
  const creep = 1 + BOX.creep * prog(F, CUE.iris + f60x(BOX.push60), ACT.click.from, E.linear);
  const rest = { cy: H / 2 + BOX.y * U, h: BOX.h * U, r: Math.min(BOX.h * U * 0.22, 44 * U) };
  if (DEAL.ask === 'stretch') {
    const p = pillState(ACT.ask.from - 1);
    const t = E.glideOut(clamp((F - CUE.iris) / f60x(BOX.stretch60)));
    const sw = mix(p.w, BOX.w * U, t) * creep;
    const sh = mix(p.h, rest.h, t) * creep;
    return { cx: W / 2, cy: mix(p.y, rest.cy, t), k: creep, sw, sh, r: mix(p.h / 2, rest.r, t) * creep, content: prog(F, CUE.iris + f60x(BOX.stretch60 * 0.55), CUE.iris + f60x(BOX.stretch60 + 6), E.glideOut), t };
  }
  const k = mix(BOX.from, 1, circOut((F - CUE.iris) / f60x(BOX.push60))) * creep;
  const sw = mix(BOX.w0, BOX.w, circOut((F - CUE.iris) / f60x(BOX.unfold60))) * U * creep;
  return { cx: W / 2, cy: rest.cy, k, sw, sh: rest.h * k, r: rest.r * k, content: 1, t: 1 };
};

/** The request box with its typing and the send button's swell (the click act frames it close). */
export const ComposerShot: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const b = boxAt(Math.min(F, ACT.click.from));
  const w = b.sw / b.k;
  const h = BOX.h * U;
  const sw = swellState(F, { at: CUE.press, stops: [PAGE.accent, mixColor(PAGE.accent, PAGE.accentDeep, 0.5), PAGE.accentDeep, PAGE.accent] }, film);
  const shell = b.t < 1;
  // the send button arms once the request is in: from the well's grey to the accent on a glide, a small swell that settles
  const arm = prog(F, CUE.arm, CUE.arm + f60x(16), E.glideOut);
  const armSwell = 1 + 0.08 * (prog(F, CUE.arm, CUE.arm + f60x(14), E.glideOut) - prog(F, CUE.arm + f60x(14), CUE.arm + f60x(44), E.stdInOut));
  return (
    <>
      {shell && (
        // the stretch: the pill's shell growing into the box's, the controls not yet in
        <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: b.sw, height: b.sh, borderRadius: b.r, background: PAGE.surface, boxShadow: `${surfaceShadow(PAGE, 30, U)}, inset 0 0 0 ${(2.5 * U).toFixed(2)}px ${PAGE.accent}`, transform: `translate3d(${(b.cx - b.sw / 2).toFixed(2)}px, ${(b.cy - b.sh / 2).toFixed(2)}px, 0)` }} />
      )}
      {b.content > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: shell ? b.content : 1, transformOrigin: '50% 50%', transform: `translate3d(${(b.cx - w / 2).toFixed(2)}px, ${(b.cy - h / 2 + (1 - b.content) * 14 * U).toFixed(2)}px, 0) scale(${b.k.toFixed(5)})` }}>
          <Composer theme={PAGE} w={w} h={h} chip={RUN.chip} focus={1} send={{ scale: sw.scale * armSwell, fill: mixColor(PAGE.well, sw.fill, arm) }} id="composer">
            <TypeOn id="request" text={RUN.request} frame={F} {...typing()} role="ui" size={Math.min(h * 0.19, 44 * U)} caret={F < CUE.press} caretOut={CUE.press} blink={Math.round(f60x(600))} />
          </Composer>
        </div>
      )}
    </>
  );
};

/** The highest a line's centre sits: the top of the middle band (37 % of the height), never the top band. */
export const LINE_MID = 0.37;

/** The punch-in's blur on both sides of the cut: a ramp up over the last 6 f, down over the first 10 f (60 fps). */
export const punchBlur = (F: number) => (F < ACT.click.from ? 4 * prog(F, ACT.click.from - f60x(6), ACT.click.from, E.buildIn) : 3 * (1 - prog(F, ACT.click.from, ACT.click.from + f60x(10), E.glideOut)));

/** The iris device's field: the accent, flat; it wipes up off the frame from `fieldOut` (its bottom edge rising). */
const fieldEdge = (F: number) => H * (1 - prog(F, CUE.fieldOut, CUE.fieldOut + f60x(BOX.wipe60), E.stdInOut));

export const Ask: React.FC = () => {
  const F = useAbs('ask');
  const film = useFilm();
  const tell = copy('tell');
  const b = boxAt(F);
  const size = lineSize(tell.text, 0.6);
  const sigma = punchBlur(F);
  const lineY = Math.max(LINE_MID * H, b.cy - b.sh / 2 - 100 * U); // centred, in the middle band over the box
  if (DEAL.ask === 'stretch') {
    return (
      <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
        <Ground act="ask" F={F} carry={{ from: 'pill', frames: BOX.stretch60 }} />
        <Defocus sigma={sigma}>
          <ComposerShot F={F} />
          <Line id="tell" F={F} y={lineY} size={size} />
        </Defocus>
      </AbsoluteFill>
    );
  }
  const iris = irisReveal(CUE.iris, { x: W / 2, y: H / 2 }, film);
  const edge = fieldEdge(F);
  const clipField = `inset(0 0 ${(H - edge).toFixed(2)}px 0)`;
  const clipPage = `inset(${edge.toFixed(2)}px 0 0 0)`;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <PillShot F={Math.min(F, ACT.ask.from - 1)} />
      <Iris frame={F} start={iris.start} mode="rate" r0={iris.r0} frames={iris.frames} shape={iris.shape} x={W / 2} y={H / 2}>
        <Defocus sigma={sigma}>
          <AbsoluteFill style={{ background: PAGE.ground }}>
            <Ground act="ask" F={F} />
          </AbsoluteFill>
          {edge > 0 && <AbsoluteFill style={{ background: PAGE.accent, clipPath: clipField }} />}
          <ComposerShot F={F} />
          {edge > 0 && (
            // the line's knockout copy on the field (the layout audit reads the page's copy)
            <div data-audit-copy="" style={{ position: 'absolute', inset: 0, clipPath: clipField }}>
              <Line id="tell" F={F} y={lineY} size={size} colors={{ ink: PAGE.accentInk, mute: mixColor(PAGE.accentInk, PAGE.accent, 0.5) }} />
            </div>
          )}
          {edge < H && (
            <AbsoluteFill style={{ clipPath: clipPage }}>
              <Line id="tell" F={F} y={lineY} size={size} />
            </AbsoluteFill>
          )}
        </Defocus>
      </Iris>
    </AbsoluteFill>
  );
};
