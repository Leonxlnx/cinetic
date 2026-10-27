import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { stepListState } from '../fx/Loaders';
import { Notice, surfaceShadow } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ACT, copy, f60x, H, W } from '../timeline';
import { RUN } from '../run';
import { RUN_LAYOUT, RunShot, stepProps } from './Run';
import { Inked, lineSize, PAGE, useAbs } from './stage';

// DONE - the run becomes the result. The last row (the step still running) grows out of the list into the result card
// while the rest of the run lifts away and fades; the card's content arrives as it lands, and the line over it is
// written by a front. One object, many states: the row is the card. It goes soft into the lockup.

/** The result card at 1080p. */
export const CARD = { w: 1120, h: 230, y: 90 } as const;

export const Done: React.FC = () => {
  const F = useAbs('done');
  const film = useFilm();
  const c = copy('done');
  const n = RUN.steps.length;
  const rows = stepListState(F, stepProps(), film).rows;
  const last = rows[n - 1];
  const t = prog(F, ACT.done.from, ACT.done.from + f60x(26), E.snapOut);
  const away = prog(F, ACT.done.from, ACT.done.from + f60x(20), E.buildIn);
  const from = { x: RUN_LAYOUT.left * U, y: RUN_LAYOUT.list * U + (last?.y ?? 0) - 60 * U, w: W - (RUN_LAYOUT.left + RUN_LAYOUT.right) * U, h: RUN_LAYOUT.rowH * U };
  const to = { x: (W - CARD.w * U) / 2, y: H / 2 + CARD.y * U - (CARD.h * U) / 2, w: CARD.w * U, h: CARD.h * U };
  const box = { x: mix(from.x, to.x, t), y: mix(from.y, to.y, t), w: mix(from.w, to.w, t), h: mix(from.h, to.h, t) };
  const content = prog(F, ACT.done.from + f60x(14), ACT.done.from + f60x(28), E.snapOut);
  const size = lineSize(c.text, 0.6);
  const soft = prog(F, ACT.end.from - f60x(12), ACT.end.from, E.buildIn); // the result goes soft into the lockup
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <Defocus sigma={10 * soft} style={{ opacity: 1 - 0.85 * soft }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - away, transform: `translate3d(0, ${(-160 * U * away).toFixed(2)}px, 0)` }}>
        <RunShot F={F} />
      </div>
      <div data-ui style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: Math.min(box.h * 0.28, 64 * U), background: PAGE.surface, boxShadow: surfaceShadow(PAGE, mix(4, 36, t), U) }}>
        <div style={{ position: 'absolute', inset: 0, opacity: content, transform: `translate3d(0, ${((1 - content) * 14 * U).toFixed(2)}px, 0)` }}>
          <Notice theme={PAGE} w={box.w} h={box.h} glyph={RUN.result.glyph} title={RUN.result.title} body={RUN.result.body} meta={RUN.result.meta} id="result" />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: to.y - 210 * U, width: W, display: 'flex', justifyContent: 'center' }}>
        <Inked id="done" text={c.text} F={F} at={c.in} size={size} />
      </div>
      </Defocus>
    </AbsoluteFill>
  );
};
