import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Cursor, cursorRise, pressAt } from '../fx/Cursor';
import { ERASE_HOUSE, eraseSchedule, TypeOn, typeSchedule } from '../fx/TypeOn';
import { AppIcon, Field as FieldPart, hasLogo, Tile } from '../kit';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { DirBlur } from '../fx/Defocus';
import { launch } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { At, Cam, DARK, ScriptLine, useAbs } from './stage';

// FIELD - step one, in the product's own UI. The field arrives on the push the claim left with; its placeholder is
// cleared by a held backspace and the input is typed in bursts; the hand rises from below onto the button and
// presses (the face lifts, the label types its busy state); the results develop in tile by tile (ghost to colour,
// columns then rows) while the camera pulls back about the upper third; the shot whips up into the feed.

/** Layout (px at 1080p): the field, the results grid under it. */
const FIELD = { w: 1280 * U, h: 132 * U, y: 400 * U, button: 230 * U };
const GRID = { cols: 3, w: 470 * U, gap: 44 * U, y: 620 * U, rowH: 420 * U };
/** The pull-back's scale and the screen height it scales about (the upper third: the content rises as it shrinks). */
const PULL = { k: 0.66, oy: 0.28 * H };
/** The whip into the feed: px per frame on the cut, upward. */
export const WHIP_UP = { vCut: -60 * U }; // the flick in the feed picks this up; faster smears the results' read labels into a double image

/** When each result tile appears (absolute frame): +8 f a column, +20 f a row. */
export const tileAt = (i: number) => CUE.develop + f60x(8) * (i % GRID.cols) + f60x(20) * Math.floor(i / GRID.cols);
/**
 * The held backspace from CUE.erase: the house rhythm, its gaps shortened in proportion when the placeholder would
 * not clear by the frame before the value's first key (a long placeholder, a fast track), so it never ends in a pop.
 */
export const ERASE = (() => {
  const n = [...WALK.field.placeholder].length;
  const room = CUE.typeIn - 1 - CUE.erase;
  const need = Math.max(1, ...eraseSchedule(n, { start: 0 }, { fps: FPS }));
  const k = Math.min(1, room / need);
  if (k < 0.5) throw new Error(`Field: the placeholder's ${n} characters need ${need} f to clear and the erase has ${room} f (CUE.erase to CUE.typeIn): shorten the placeholder or move CUE.erase earlier`);
  return { start: CUE.erase, gaps: ERASE_HOUSE.gaps60.map((g) => g * k) };
})();
/** The frame the typed value's last key lands (for the sound). */
export const typedKeys = () => typeSchedule(WALK.field.value, { start: CUE.typeIn, kind: 'human' }, { fps: FPS });

export const Field: React.FC = () => {
  const F = useAbs('field');
  const t = DARK;
  const fieldX = (W - FIELD.w) / 2;
  // the push carried in from the claim, settling; the pull-back about the upper third; the whip up into the cut
  const k = lmix(1.35, 1, prog(F, ACT.field.from, ACT.field.from + f60x(26), E.snapOut)) * lmix(1, PULL.k, prog(F, CUE.pullBack, CUE.pullBack + f60x(40), E.strongInOut));
  // the whip: 0 until it builds, the whole travel on the last frame (launch() is measured from the cut)
  const lo = { vCut: WHIP_UP.vCut, fps: FPS };
  const up = launch(F, ACT.feed.from - 1, lo).x - launch(ACT.feed.from - 1 - f60x(90), ACT.feed.from - 1, lo).x;
  const whipV = launch(F, ACT.feed.from - 1, lo).v / U; // the whip's speed (px/f at 1080p) smears the layer along it
  const arrive = prog(F, ACT.field.from, ACT.field.from + f60x(20), E.snapOut);
  // the hand: up from below the frame onto the button, the press, then off the frame once the product works alone
  const btn = { x: fieldX + FIELD.w - FIELD.button / 2 - 20 * U, y: FIELD.y + FIELD.h / 2 + 10 * U };
  const hand = cursorRise(F, CUE.cursor, btn, {}, { fps: FPS, width: W, height: H });
  const away = prog(F, CUE.press + f60x(14), CUE.press + f60x(34), E.launchIn);
  const press = pressAt(F, CUE.press, FPS);
  const flash = F >= CUE.press ? hitPulse(F - CUE.press, 1, 8, FPS) : 0;
  const erased = F >= CUE.typeIn - 1;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={whipV} axis="y" id="field-whip">
      <Cam k={k} oy={PULL.oy} dy={up}>
        <ScriptLine id="step1" F={F} top={170 * U} color={t.text} exitDir="up" />
        <At x={fieldX} y={FIELD.y + (1 - arrive) * 60 * U} style={{ opacity: arrive }}>
          <FieldPart
            theme={t}
            w={FIELD.w}
            h={FIELD.h}
            glyph="link"
            lead={hasLogo(WALK.input.source) ? <AppIcon logo={WALK.input.source} size={FIELD.h * 0.68} theme={t} lift={6} /> : undefined}
            focus={prog(F, CUE.erase - f60x(10), CUE.erase, E.snapOut)}
            button={{
              w: FIELD.button,
              q: press,
              flash,
              label: F < CUE.busy ? WALK.field.action : <TypeOn id="field-busy" text={WALK.field.busy} frame={F} start={CUE.busy} kind="stream" cps={60} caret={false} role="ui" size={FIELD.h * 0.3} />,
            }}
          >
            {!erased ? (
              <span style={{ color: t.mute }}>
                <TypeOn id="field-placeholder" text={WALK.field.placeholder} frame={F} start={ACT.field.from - 1} kind="human" from={1} erase={ERASE} caretColor={t.accent} role="ui" size={FIELD.h * 0.36} />
              </span>
            ) : (
              <TypeOn id="field-value" text={WALK.field.value} frame={F} start={CUE.typeIn} kind="human" caretColor={t.accent} caretOut={CUE.press} role="ui" size={FIELD.h * 0.36} />
            )}
          </FieldPart>
        </At>
        {/* the results: each tile rises in as a ghost and develops to colour (two static copies cross-faded) */}
        {WALK.results.map((r, i) => {
          const at = tileAt(i);
          if (F < at) return null;
          const p = prog(F, at, at + f60x(16), E.snapOut);
          const dev = prog(F, at + f60x(8), at + f60x(30), E.stdInOut);
          const x = (W - (GRID.cols * GRID.w + (GRID.cols - 1) * GRID.gap)) / 2 + (i % GRID.cols) * (GRID.w + GRID.gap);
          const y = GRID.y + Math.floor(i / GRID.cols) * GRID.rowH + (1 - p) * 40 * U;
          const tile = <Tile theme={t} w={GRID.w} seed={11 + i * 3} title={r.title} meta={r.meta} badge={r.badge} id={`result-${i}`} />;
          return (
            <At key={i} x={x} y={y} w={GRID.w} style={{ opacity: clamp(p * 1.4) }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: GRID.w, filter: 'grayscale(1) contrast(0.4) brightness(1.9)', opacity: 1 - dev }}>{tile}</div>
              <div style={{ position: 'absolute', left: 0, top: 0, width: GRID.w, opacity: dev }}>{tile}</div>
            </At>
          );
        })}
      </Cam>
      </DirBlur>
      {F >= CUE.cursor && away < 1 && (
        <Cursor x={hand.x} y={hand.y + mix(0, H * 0.7, away)} opacity={hand.opacity * (1 - away)} shape="hand" press={press} fill={t.text} outline={t.ground} scale={1.6 * U} shadow="drop" />
      )}
    </AbsoluteFill>
  );
};

