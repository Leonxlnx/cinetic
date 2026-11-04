import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { Cursor, cursorRise, pressAt } from '../fx/Cursor';
import { DirBlur } from '../fx/Defocus';
import { type LitProps, Lit } from '../fx/Lit';
import { ERASE_HOUSE, eraseSchedule, TypeOn, typeSchedule } from '../fx/TypeOn';
import { AppIcon, AppWindow, ContentTile, Field as FieldPart, filmWorld, hasLogo, Micro, type TileNode } from '../kit';
import { mixColor } from '../lib/color';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { landBeforeCut, timingFail } from '../lib/continuity';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { CLAIM_EXIT } from './Claim';
import { At, Cam, Ground, HOLD, GROUNDS, launchOut, onLit, ReadBack, ScriptLine, themeOf, useAbs } from './stage';

// FIELD - step one, in the product's own window: a lit app window (fx/Lit, kit AppWindow: the workspace, its nav and
// its people around the field, dense and real) arrives on the claim's zoom. The field's placeholder is cleared by a held
// backspace, the input is typed in bursts, the hand rises onto the button and presses (the face lifts, the label types
// its busy state); the results arrive as content tiles that develop from ghost to colour while the camera pulls back
// about the upper third (landing before the whip), and the whole frame whips up into the read.

/** The window at film size, low in the frame; its bottom runs off the frame (a cropped element). It steps back behind the centred line while the line is read. */
const WIN = { w: 1600 * U, h: 980 * U, cx: W / 2, cy: 650 * U } as const;
/** The field and the results grid inside the window's main area (px from the main area's top-left). */
const FIELD = { h: 112 * U, top: 44 * U, button: 210 * U };
const GRID = { cols: 3, gap: 30 * U, top: 200 * U, aspect: 1.32 };
/** The pull-back's scale and the screen height it scales about (the upper third: the content rises as it shrinks). */
const PULL = { k: 0.8, oy: 0.3 * H, frames60: 48 };
/** The whip into the read: px per frame on the cut, upward (the read act arrives on it). */
export const WHIP_UP = { vCut: -64 * U };

/** The held backspace from CUE.erase: the house rhythm, shortened in proportion when the placeholder would not clear before the value's first key. */
export const ERASE = (() => {
  const n = [...WALK.field.placeholder].length;
  const room = CUE.typeIn - 1 - CUE.erase;
  const need = Math.max(1, ...eraseSchedule(n, { start: 0 }, { fps: FPS }));
  const k = Math.min(1, room / need);
  if (k < 0.5) timingFail('erase-room', `Field: the placeholder's ${n} characters need ${need} f to clear and the erase has ${room} f (CUE.erase to CUE.typeIn): shorten the placeholder or move CUE.erase earlier`);
  return { start: CUE.erase, gaps: ERASE_HOUSE.gaps60.map((g) => g * k) };
})();
/** The frames the typed value's keys land (for the sound). */
export const typedKeys = () => typeSchedule(WALK.field.value, { start: CUE.typeIn, kind: 'human' }, { fps: FPS });
/** When each result tile starts to arrive: +6 f a column, +14 f a row (60 fps frames), overlapping into one cascade. */
export const tileAt = (i: number) => CUE.develop + f60x(6) * (i % GRID.cols) + f60x(14) * Math.floor(i / GRID.cols);

// the pull-back lands (under 10 % of its peak speed) before the whip takes the frame
landBeforeCut({ from: CUE.pullBack, dur: f60x(PULL.frames60), ease: E.strongInOut, id: 'field pull-back' }, CUE.whipUp - f60x(4));

export const Field: React.FC = () => {
  const F = useAbs('field');
  const t = themeOf('field');
  const world = filmWorld({ workspace: WALK.name, records: WALK.results.map((r) => ({ title: r.title, sub: r.meta })) });
  const lit: LitProps = { x: WIN.cx, y: WIN.cy, w: WIN.w, h: WIN.h, r: 26 * U, ground: GROUNDS.field.base };
  // the claim's zoom carried in and settling; the pull-back about the upper third; the whip up into the cut
  const k = lmix(CLAIM_EXIT.k, 1, prog(F, ACT.field.from, ACT.field.from + f60x(40), E.glideOut)) * lmix(1, PULL.k, prog(F, CUE.pullBack, CUE.pullBack + f60x(PULL.frames60), E.strongInOut));
  const up = launchOut('field', F, WHIP_UP.vCut);
  const whipV = (up - launchOut('field', F - 1, WHIP_UP.vCut)) / U;
  const d = HOLD; // the hold rests between moves (no drift)
  // the window's main area and the field inside it (px in the window)
  const side = Math.min(250 * U, WIN.w * 0.18);
  const main = { x: side, y: 46 * U, w: WIN.w - side, h: WIN.h - 46 * U };
  const pad = 40 * U;
  const fieldW = main.w - 2 * pad;
  // the hand: up from below onto the button of the window, the press, then off the frame
  const btnIn = { x: main.x + pad + fieldW - FIELD.button / 2 - 20 * U, y: main.y + FIELD.top + FIELD.h / 2 };
  const btn = onLit(F, lit, btnIn.x - WIN.w / 2, btnIn.y - WIN.h / 2);
  const hand = cursorRise(F, CUE.cursor, { x: btn.x, y: btn.y + 10 * U }, {}, { fps: FPS, width: W, height: H });
  const away = prog(F, CUE.press + f60x(14), CUE.press + f60x(40), E.buildIn);
  const press = pressAt(F, CUE.press, FPS);
  const flash = F >= CUE.press ? hitPulse(F - CUE.press, 2, 8, FPS) : 0;
  const erased = F >= CUE.typeIn - 1;
  const tile = (fieldW - (GRID.cols - 1) * GRID.gap) / GRID.cols;
  // a found item that is a picture shows its real photo (walk.ts photos.results); the rest show the product's own previews
  const shots = WALK.photos.results as readonly string[];
  const nodes: TileNode[] = WALK.results.map((r, i) => ({ glyph: (['play', 'doc', 'chart', 'list', 'image', 'table'] as const)[i % 6], label: r.title, sub: r.meta, value: r.badge, preview: shots[i] ? 'photo' : (['chart', 'doc', 'list', 'table', 'bars', 'code'] as const)[i % 6], ...(shots[i] ? { photo: staticFile(shots[i]) } : {}), seed: `${WALK.name}:result:${i}` }));
  return (
    <AbsoluteFill style={{ background: GROUNDS.field.base, overflow: 'hidden' }}>
      <DirBlur v={whipV} axis="y" id="field-whip">
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${d.x.toFixed(3)}px, ${(up + d.y).toFixed(3)}px, 0)` }}>
          <Ground act="field" F={F} />
          <Cam k={k} oy={PULL.oy}>
            <ReadBack id="step1" F={F}>
            <Lit frame={F} {...lit} id="field-window">
              <AppWindow theme={t} world={world} w={WIN.w} h={WIN.h} frame={F}>
                {(m) => (
                  <>
                    <At x={m.x + pad} y={m.y + FIELD.top}>
                      <FieldPart
                        theme={t}
                        w={fieldW}
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
                    {/* the workspace's recent items under the field (texture: the product in use), clearing as the results arrive */}
                    {prog(F, CUE.develop - f60x(10), CUE.develop + f60x(16), E.stdInOut) < 1 && (
                      <div style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - prog(F, CUE.develop - f60x(10), CUE.develop + f60x(16), E.stdInOut), transform: `translate3d(${(m.x + pad).toFixed(2)}px, ${(m.y + GRID.top).toFixed(2)}px, 0)` }}>
                        {world.screen && (
                          <Micro px={13 * U} weight={600} color={t.mute} upper>
                            {world.screen}
                          </Micro>
                        )}
                        {/* each cell only where the film gives it (walk.ts results: a title and its meta; no id, date, value or status unless the film adds them) */}
                        {world.records.slice(0, 9).map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 * U, width: fieldW, height: 54 * U, boxShadow: `inset 0 -${(1 * U).toFixed(2)}px 0 ${t.line}`, transform: `translate3d(0, ${(10 * U).toFixed(2)}px, 0)` }}>
                            {r.id && <Micro px={14 * U} color={t.mute} mono>{r.id}</Micro>}
                            <Micro px={15 * U} weight={600} color={i === 0 ? t.text : mixColor(t.text, t.mute, 0.35)}>{r.title}</Micro>
                            <span style={{ flex: 1 }} />
                            {r.sub && <Micro px={14 * U} color={t.mute}>{r.sub}</Micro>}
                            {r.date && <Micro px={14 * U} color={t.mute}>{r.date}</Micro>}
                            {r.value && <Micro px={14 * U} color={t.text}>{r.value}</Micro>}
                            {world.statuses[r.status] && <Micro px={13 * U} color={i === 0 ? t.accent : t.mute}>{world.statuses[r.status].label}</Micro>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* the results: each tile rises in as a ghost and develops to colour */}
                    {nodes.map((n, i) => {
                      const at = tileAt(i);
                      if (F < at) return null;
                      const p = prog(F, at, at + f60x(30), E.glideOut);
                      const dev = prog(F, at + f60x(10), at + f60x(36), E.stdInOut);
                      const x = m.x + pad + (i % GRID.cols) * (tile + GRID.gap);
                      const y = m.y + GRID.top + Math.floor(i / GRID.cols) * (tile / GRID.aspect + GRID.gap) + (1 - p) * 36 * U;
                      const card = <ContentTile node={n} theme={t} w={tile} aspect={GRID.aspect} lift={10} />;
                      return (
                        <At key={i} x={x} y={y} w={tile} style={{ opacity: clamp(p * 1.4) }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, filter: 'grayscale(1) contrast(0.5) brightness(1.5)', opacity: 1 - dev }}>{card}</div>
                          <div style={{ position: 'absolute', left: 0, top: 0, opacity: dev }}>{card}</div>
                        </At>
                      );
                    })}
                  </>
                )}
              </AppWindow>
            </Lit>
            </ReadBack>
            {F >= CUE.cursor && away < 1 && (
              <Cursor x={hand.x} y={hand.y + mix(0, H * 0.7, away)} opacity={hand.opacity * (1 - away)} shape="hand" press={press} fill={t.text} outline={t.ground} scale={1.6 * U} shadow="drop" />
            )}
          </Cam>
          {/* the line centred in the middle of the frame while the window steps back behind it (stage ReadBack) */}
          <ScriptLine id="step1" F={F} color={t.text} accent={t.accent} mute={t.mute} />
        </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
