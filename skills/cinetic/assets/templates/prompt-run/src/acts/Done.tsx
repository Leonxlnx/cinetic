import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { AccentClaim, inkOn } from '../fx/TypeClaim';
import { Notice, surfaceShadow } from '../kit';
import { clamp, E, mix, prog } from '../lib/anim';
import { ACT, copy, CUE, DEAL, f60x, H, W } from '../timeline';
import { RUN } from '../run';
import { LINE_MID } from './Ask';
import { PANEL, RUN_LAYOUT, RunShot } from './Run';
import { Ground, Line, lineSize, PAGE, SoftCut, useAbs } from './stage';

// DONE - the result. The deal's device:
//   morph  the run becomes the result: the last row (the step still running) grows out of the run into the result
//          card while the rest of the run lifts away; the card's content rises in as it lands, the line over it lands
//          on the film's voice; one object, many states: the row is the card. It goes soft into the lockup.
//   claim  the accent rises over the run (a wipe from the bottom edge, 20 f at 60 fps) and the line is set as the
//          claim on it (fx/TypeClaim: cap 16.5 % of the frame, flush left at 3 %, -0.04 em, semibold), the result
//          card gliding up under it; the accent leaves up into the lockup. The film's colour event.

/** The result card at 1080p (morph), its corner and the claim's card (claim). */
export const CARD = { w: 1120, h: 230, y: 90, grow60: 30, lift60: 20, wipe60: 20 } as const;

/** Where the last row sits in the run on screen (near enough: the run is nearly front-on by now). */
const lastRow = () => {
  const n = RUN.steps.length;
  const P = PANEL();
  const pad = RUN_LAYOUT.pad * U;
  if (DEAL.run === 'stack') { const mid = (n - 1) / 2; return { x: W / 2 + (n - 1 - mid) * 40 * U - 520 * U, y: H / 2 + 150 * U + (n - 1 - mid) * 150 * U - 75 * U, w: 1040 * U, h: 150 * U }; }
  const pw = DEAL.run === 'split' ? P.w * 0.62 : P.w;
  const px = DEAL.run === 'split' ? W / 2 - (P.w * 0.6) / 2 - 20 * U : P.x;
  return { x: px - pw / 2 + pad, y: P.y - P.h / 2 + pad + (RUN_LAYOUT.list + (n - 1) * RUN_LAYOUT.rowH) * U, w: pw - 2 * pad, h: RUN_LAYOUT.rowH * U };
};

const Result: React.FC<{ w: number; h: number; o?: number; dy?: number }> = ({ w, h, o = 1, dy = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, opacity: o, transform: `translate3d(0, ${dy.toFixed(2)}px, 0)` }}>
    <Notice theme={PAGE} w={w} h={h} glyph={RUN.result.glyph} title={RUN.result.title} body={RUN.result.body} meta={RUN.result.meta} id="result" photo={RUN.photos.result ? staticFile(RUN.photos.result) : undefined} />
  </div>
);

const Morph: React.FC<{ F: number }> = ({ F }) => {
  const c = copy('done');
  const t = prog(F, ACT.done.from, ACT.done.from + f60x(CARD.grow60), E.glideOut);
  const away = prog(F, ACT.done.from, ACT.done.from + f60x(CARD.lift60), E.buildIn);
  const from = lastRow();
  const to = { x: (W - CARD.w * U) / 2, y: H / 2 + CARD.y * U - (CARD.h * U) / 2, w: CARD.w * U, h: CARD.h * U };
  const box = { x: mix(from.x, to.x, t), y: mix(from.y, to.y, t), w: mix(from.w, to.w, t), h: mix(from.h, to.h, t) };
  const content = prog(F, ACT.done.from + f60x(14), ACT.done.from + f60x(30), E.glideOut);
  const soft = prog(F, ACT.end.from - f60x(16), ACT.end.from, E.stdInOut); // the result goes soft into the lockup (a cross-fade to a defocused copy)
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - soft }}>
    <SoftCut k={soft}>
      {away < 1 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - away, transform: `translate3d(0, ${(-160 * U * away).toFixed(2)}px, 0)` }}>
          <RunShot F={F} />
        </div>
      )}
      <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: Math.min(box.h * 0.28, 64 * U), background: PAGE.surface, boxShadow: surfaceShadow(PAGE, mix(4, 36, t), U), transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)` }}>
        <Result w={box.w} h={box.h} o={content} dy={(1 - content) * 14 * U} />
      </div>
      <Line id="done" F={F} y={Math.max(LINE_MID * H, to.y - 130 * U)} size={lineSize(c.text, 0.6)} />
    </SoftCut>
    </div>
  );
};

const Claim: React.FC<{ F: number }> = ({ F }) => {
  const c = copy('done');
  const wipe = prog(F, ACT.done.from, ACT.done.from + f60x(CARD.wipe60), E.stdInOut);
  const edge = H * (1 - wipe);
  const cw = 820 * U;
  const ch = 168 * U;
  const card = prog(F, CUE.doneLine + f60x(20), CUE.doneLine + f60x(54), E.glideOut);
  return (
    <>
      {wipe < 1 && <RunShot F={F} />}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${edge.toFixed(2)}px 0 0 0)` }}>
        <AccentClaim text={c.text} at={c.in} frame={F} ground={PAGE.accent} color={inkOn(PAGE.accent, PAGE.surface, PAGE.text)} maxLines={2} id="done" />
        {card > 0 && (
          <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: cw, height: ch, borderRadius: ch * 0.24, background: PAGE.surface, boxShadow: surfaceShadow(PAGE, 30, U), opacity: clamp(card * 2.5), willChange: 'transform', transform: `translate3d(${((W - cw) / 2).toFixed(2)}px, ${(H - 0.06 * H - ch + (1 - card) * 60 * U).toFixed(2)}px, 0)` }}>
            <Result w={cw} h={ch} />
          </div>
        )}
      </div>
    </>
  );
};

export const Done: React.FC = () => {
  const F = useAbs('done');
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <Ground act="done" F={F} carry={DEAL.done === 'morph' ? { from: 'run', frames: CARD.grow60 } : undefined} />
      {/* the hold keeps moving: the whole result creeps 3 % over the act (a composited layer: the slow scale never stair-steps the type) */}
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 55%', willChange: 'transform', transform: `scale(${(1 + (DEAL.done === 'claim' ? 0 : 0.03) * prog(F, ACT.done.from, ACT.end.from, E.linear)).toFixed(5)})` }}>
        {DEAL.done === 'claim' ? <Claim F={F} /> : <Morph F={F} />}
      </div>
    </AbsoluteFill>
  );
};
