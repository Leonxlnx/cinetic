import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DEAL } from '../deal';
import { phraseOnsets } from '../lib/cadence';
import { DirBlur } from '../fx/Defocus';
import { Lit } from '../fx/Lit';
import { Spinner } from '../fx/Loaders';
import { countTo } from '../fx/Roll';
import { TypeOn } from '../fx/TypeOn';
import { Check, ContentTile, DataRow, face, KIT_TYPE, Row, Surface, surfaceShadow } from '../kit';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { CUE, f60x, H, W } from '../timeline';
import { WALK } from '../walk';
import { WHIP_LEFT } from './Insight';
import { carryIn, Ground, HOLD, GROUNDS, ReadBack, ScriptLine, themeOf, useAbs } from './stage';

// PICK - step three. The options arrive on the whip's leftward speed, carried and settling; the line says what the
// product makes from the pick. The camera eases in onto the chosen row (a settle of 40 f, never a jump), the others
// fall back and fade, the choice rings in the accent; the row glides up into the build's head while the output builds
// below it, by the dealt device: 'pill' makes the head a progress pill whose percentage climbs over the build, 'assemble'
// flies the output's sections in from depth onto a lit page, 'stream' types the output in top-down under a progress rule.

const ROWS = { w: 1400 * U, h: 168 * U, gap: 28 * U, y: 400 * U } as const;
const HEAD = { w: 820 * U, h: 112 * U, y: 250 * U } as const;
/** The chooser's sheet behind the rows. */
const SHEET = { w: 1540 * U, h: 3 * 168 * U + 2 * 28 * U + 64 * U + 80 * U, y: 400 * U - 64 * U - 40 * U } as const;
/** The options' plane: facing the camera like every product panel. */
const PLANE: React.CSSProperties = { position: 'absolute', inset: 0 };
const BUILD = { w: 1240 * U, h: 700 * U, cy: 790 * U } as const; // its foot runs off the frame
/** The camera onto the chosen row: x1.22, a 40 f settle. */
const zoomAt = (F: number) => lmix(1, 1.22, prog(F, CUE.select, CUE.select + f60x(40), E.settleOut));
/** The options' onsets: phrased (lib/cadence), the first most of the way in on the cut. */
const OPTION_AT = phraseOnsets(CUE.options - f60x(14), WALK.options.length, f60x(5), { shape: 'rush', seed: `${WALK.name}:options` });
/** The build's progress 0..99 (it never shows 100 before the page takes over): a count that eases out and settles (countTo), never a linear tick. */
const pctAt = (F: number) => countTo(F, { from: 0, to: 99, start: CUE.build, dur: f60x(150) });

/** The output being built: a lit panel whose preview develops and whose sections arrive by the dealt device. */
const Build: React.FC<{ F: number }> = ({ F }) => {
  const t = themeOf('pick');
  const pct = pctAt(F);
  const pad = 36 * U;
  const enter = prog(F, CUE.build - f60x(6), CUE.build + f60x(40), E.settleOut);
  const node = { glyph: 'doc' as const, label: WALK.page.headline, sub: WALK.page.sub, preview: 'doc' as const, seed: `${WALK.name}:build` };
  const rows = phraseOnsets(CUE.build + f60x(16), WALK.page.rows.length, f60x(DEAL.build === 'assemble' ? 14 : 10), { shape: 'settle', seed: `${WALK.name}:build` }); // lib/cadence: phrased into the last section, never a metronome
  const rowAt = (i: number) => rows[Math.min(i, rows.length - 1)];
  return (
    <Lit frame={F} x={W / 2} y={BUILD.cy} w={BUILD.w} h={BUILD.h} r={34 * U} ground={GROUNDS.pick.base} enter={{ at: CUE.build - f60x(6), dur60: 46 }} id="build">
      <Surface theme={t} w={BUILD.w} h={BUILD.h} lift={4} r={34 * U}>
        {DEAL.build === 'stream' && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: BUILD.w * (pct / 100), height: 6 * U, background: t.accent }} />
        )}
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${pad}px, 0)`, opacity: enter }}>
          {DEAL.build === 'stream' ? (
            <span data-text="build-headline" style={face(KIT_TYPE.head * U, 650, t.text, -0.03)}>
              <TypeOn id="build-head" text={WALK.page.headline} frame={F} start={CUE.build + f60x(8)} kind="stream" cps={70} caret={false} role="ui" size={KIT_TYPE.head * U} />
            </span>
          ) : (
            <ContentTile node={node} theme={t} w={BUILD.w - 2 * pad} aspect={(BUILD.w - 2 * pad) / (250 * U)} lift={6} />
          )}
        </div>
        {WALK.page.rows.map((r, i) => {
          const at = rowAt(i);
          const p = prog(F, at, at + f60x(DEAL.build === 'assemble' ? 36 : 26), DEAL.build === 'assemble' ? E.settleOut : E.glideOut);
          const y = (DEAL.build === 'stream' ? 140 : 320) * U + i * 88 * U;
          // assemble: each section flies in from in front of the page (larger, offset, soft), landing in its slot
          const s = DEAL.build === 'assemble' ? mix(1.5, 1, p) : 1;
          const dx = DEAL.build === 'assemble' ? (1 - p) * (i % 2 ? 220 : -220) * U : 0;
          const dy = (1 - p) * (DEAL.build === 'assemble' ? -120 : 24) * U;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: clamp(p * 1.5), transform: `translate3d(${(pad + dx).toFixed(2)}px, ${(y + dy).toFixed(2)}px, 0) scale(${s.toFixed(4)})`, transformOrigin: '50% 50%' }}>
              <DataRow theme={t} w={BUILD.w - 2 * pad} h={78 * U} label={r} value={DEAL.build === 'pill' ? `${Math.min(100, pct + 12 * (2 - i))}%` : WALK.page.cta} id={`build-row-${i}`} />
            </div>
          );
        })}
      </Surface>
    </Lit>
  );
};

export const Pick: React.FC = () => {
  const F = useAbs('pick');
  const t = themeOf('pick');
  const pick = WALK.pick;
  const carried = carryIn('pick', F, WHIP_LEFT.vCut, 60, 0.75);
  const cv = (carried - carryIn('pick', F - 1, WHIP_LEFT.vCut, 60, 0.75)) / U;
  const d = HOLD; // the hold rests between moves (no drift)
  const rowY = (i: number) => ROWS.y + i * (ROWS.h + ROWS.gap);
  const oy = rowY(pick) + ROWS.h / 2;
  const gone = prog(F, CUE.select + f60x(8), CUE.select + f60x(34), E.stdInOut); // the other rows fall back and fade
  const ring = prog(F, CUE.chosen, CUE.chosen + f60x(24), E.glideOut);
  // the chosen row glides into the build's head (shape and place on one curve) while the camera eases back out
  const m = prog(F, CUE.toPill, CUE.toPill + f60x(28), E.strongInOut);
  const zoom = mix(zoomAt(F), 1, m);
  const headOn = F >= CUE.toPill + f60x(28);
  const pct = pctAt(F);
  const sheetIn = prog(F, CUE.options - f60x(20), CUE.options + f60x(24), E.glideOut); // the chooser arrives with its rows, already in on the cut
  return (
    <AbsoluteFill style={{ background: GROUNDS.pick.base, overflow: 'hidden' }}>
      <DirBlur v={cv} axis="x" id="pick-carry">
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(carried + d.x).toFixed(2)}px, ${d.y.toFixed(3)}px, 0)` }}>
          <Ground act="pick" F={F} />
          <ReadBack id="pick" F={F}>
          <div style={PLANE}>
          {/* the sheet the options sit on: the product's chooser, lit with them; it falls back as the build takes over */}
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: (1 - m) * sheetIn, transformOrigin: `${(SHEET.w / 2).toFixed(2)}px ${(oy - SHEET.y).toFixed(2)}px`, transform: `translate3d(${((W - SHEET.w) / 2).toFixed(2)}px, ${SHEET.y.toFixed(2)}px, 0) scale(${(zoom * mix(0.94, 1, sheetIn)).toFixed(5)})` }}>
            <Surface theme={t} w={SHEET.w} h={SHEET.h} tone="raised" lift={30} r={36 * U}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: SHEET.w, height: 64 * U, background: mixColor(t.surface, t.ground, 0.25), boxShadow: `inset 0 -${(1 * U).toFixed(2)}px 0 ${t.line}` }} />
            </Surface>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${oy}px`, transform: `scale(${zoom.toFixed(5)})` }}>
            {WALK.options.map((o, i) => {
              const at = OPTION_AT[i]; // the first row is most of the way in on the cut: the whip lands on content
              const p = prog(F, at, at + f60x(30), E.glideOut);
              const chosen = i === pick;
              if (F < at || (chosen && headOn) || (!chosen && gone >= 1)) return null;
              const lift = chosen ? m : 0;
              // the morph into the head, drawn in the camera's frame: the head's screen box divided back through the zoom
              const hw = HEAD.w / zoom;
              const hh = HEAD.h / zoom;
              const hy = oy + (HEAD.y - oy) / zoom;
              const w = mix(ROWS.w, hw, lift);
              const h = mix(ROWS.h, hh, lift);
              const y = mix(rowY(i), hy, lift);
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: (chosen ? 1 : 1 - gone) * clamp(p * 1.5), transform: `translate3d(${((W - w) / 2 + (1 - p) * 200 * U).toFixed(2)}px, ${(y + (chosen ? 0 : gone * 40 * U)).toFixed(2)}px, 0)` }}>
                  {/* the container carries its own surface and the choice's ring through the morph, so the box reads on any ground */}
                  <div style={{ width: w, height: h, borderRadius: mix(ROWS.h * 0.26, hh / 2, lift), overflow: 'hidden', position: 'relative', background: chosen ? t.surface : undefined, boxShadow: chosen ? `${surfaceShadow(t, mix(14, 30, lift), U)}, inset 0 0 0 ${(3 * U * Math.max(ring, lift)).toFixed(2)}px ${t.accent}` : undefined }}>
                    <div style={{ opacity: 1 - clamp(lift / 0.4), transform: `translate3d(0, ${(-26 * U * lift).toFixed(2)}px, 0)` }}>
                      <Row theme={t} w={ROWS.w} h={ROWS.h} glyph={o.glyph} title={o.title} meta={o.meta} value={o.value} selected={0} id={`option-${i}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          {F >= CUE.build - f60x(6) && <Build F={F} />}
          <div style={PLANE}>
          {headOn && (
            // the head: the morph's own box (no pop where the row hands over), its content arriving inside it
            <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: HEAD.w, height: HEAD.h, display: 'flex', alignItems: 'center', gap: 22 * U, padding: `0 ${34 * U}px`, boxSizing: 'border-box', borderRadius: HEAD.h / 2, background: t.surface, boxShadow: `${surfaceShadow(t, 30, U)}, inset 0 0 0 ${(3 * U).toFixed(2)}px ${t.accent}`, transform: `translate3d(${((W - HEAD.w) / 2).toFixed(2)}px, ${HEAD.y.toFixed(2)}px, 0)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 * U, flex: 1, opacity: prog(F, CUE.toPill + f60x(28), CUE.toPill + f60x(44), E.glideOut) }}>
                {DEAL.build === 'pill' ? <Spinner size={HEAD.h * 0.46} color={t.accent} angle={(F - CUE.toPill) * 9} /> : <Check size={HEAD.h * 0.5} fill={t.accent} tick={t.accentInk} />}
                <span data-text="build-head-label" style={{ ...face(HEAD.h * 0.36, 600, t.text, -0.01), flex: 1 }}>
                  {DEAL.build === 'pill' ? <TypeOn id="build-label" text={WALK.build.label} frame={F} start={CUE.toPill + f60x(30)} kind="stream" cps={84} caret={false} role="ui" size={HEAD.h * 0.36} /> : WALK.options[pick].title}
                </span>
                {DEAL.build === 'pill' && (
                  <span data-text="build-pct" style={face(HEAD.h * 0.36, 650, t.mute, -0.01)}>
                    {`${pct}%`}
                  </span>
                )}
              </div>
            </div>
          )}
          </div>
          </ReadBack>
          {/* the line centred in the middle of the frame while the chooser steps back behind it (stage ReadBack) */}
          <ScriptLine id="pick" F={F} color={t.text} accent={t.accent} mute={t.mute} />
        </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
