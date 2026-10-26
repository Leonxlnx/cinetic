import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { countLinear } from '../fx/Roll';
import { TypeOn } from '../fx/TypeOn';
import { DataRow, Photo, Pill, Row, Surface } from '../kit';
import { clamp, E, lmix, mix, prog, track } from '../lib/anim';
import { carry } from '../lib/handoff';
import { ACT, CUE, f60, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { WHIP_LEFT } from './Insight';
import { LIGHT, ScriptLine, useAbs } from './stage';

// PICK - step three. The options arrive on the whip's leftward speed; the line says what to do. The camera zooms
// onto the chosen one (ease in, two frames carrying most of the change, a soft landing) while the others vanish in
// two frames; the choice rings in the accent. It lightens, its content lifts away and it collapses into the progress
// pill (most of the change on the last frames); under the pill the output builds from the top down while the label
// types its state and the percentage climbs.

const ROWS = { w: 1180 * U, h: 150 * U, gap: 30 * U, y: 430 * U } as const;
const PILL = { h: 112 * U, y: 250 * U } as const;
const BUILD = { w: 1040 * U, h: 620 * U, y: 400 * U } as const;
/** The zoom onto the chosen row: x1.43, most of it on two frames in the middle (a measured table of the move). */
const zoomAt = (F: number) => lmix(1, 1.43, track(F, [[CUE.select, 0], [CUE.select + f60x(14), 0.12], [CUE.select + f60x(18), 0.82], [CUE.select + f60x(34), 1]]));

export const Pick: React.FC = () => {
  const F = useAbs('pick');
  const t = LIGHT;
  const pick = WALK.pick;
  // the whip's leftward speed carried in, settling: the options arrive from the right and come to rest in place
  const co = { vCut: WHIP_LEFT.vCut, settle: 70, fps: FPS };
  const inX = carry(F, ACT.pick.from, co).x - carry(ACT.pick.from + f60(200), ACT.pick.from, co).x;
  const k = zoomAt(F);
  const rowY = (i: number) => ROWS.y + i * (ROWS.h + ROWS.gap);
  const oy = rowY(pick) + ROWS.h / 2;
  const gone = prog(F, CUE.select + f60x(14), CUE.select + f60x(18), E.linear); // the other rows vanish in two frames
  const ring = prog(F, CUE.chosen, CUE.chosen + f60x(20), E.snapOut);
  // the chosen row -> the progress pill: 70 % of the change on its last frames
  const m = track(F, [[CUE.toPill, 0], [CUE.toPill + f60x(10), 0.3], [CUE.toPill + f60x(14), 1]]);
  const pillOn = F >= CUE.toPill + f60x(14);
  const pct = Math.min(99, Math.floor(countLinear(F, { from: 0, perSec: 38, start: CUE.build }, { fps: FPS }).value));
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(${inX.toFixed(2)}px, 0, 0)` }}>
        <ScriptLine id="pick" F={F} top={180 * U} color={t.text} exitDir="up" />
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${oy}px`, transform: `scale(${(F < CUE.toPill ? k : mix(k, 1, m)).toFixed(5)})` }}>
          {WALK.options.map((o, i) => {
            const at = CUE.options + i * f60x(6);
            const p = prog(F, at, at + f60x(20), E.snapOut);
            const chosen = i === pick;
            if (F < at || (chosen && pillOn) || (!chosen && gone >= 1)) return null;
            const lift = chosen ? m : 0;
            const w = mix(ROWS.w, ROWS.w * 0.66, lift);
            const h = mix(ROWS.h, PILL.h, lift);
            const y = mix(rowY(i), PILL.y, lift);
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: (chosen ? 1 : 1 - gone) * clamp(p * 1.5), transform: `translate3d(${((W - w) / 2 + (1 - p) * 260 * U).toFixed(2)}px, ${y.toFixed(2)}px, 0)` }}>
                <div style={{ width: w, height: h, borderRadius: mix(ROWS.h * 0.26, PILL.h / 2, lift), overflow: 'hidden', position: 'relative' }}>
                  <div style={{ opacity: 1 - clamp(lift / 0.4), transform: `translate3d(0, ${(-26 * U * lift).toFixed(2)}px, 0)` }}>
                    <Row theme={t} w={ROWS.w} h={ROWS.h} glyph={(['grid', 'doc', 'star'] as const)[i % 3]} title={o.title} meta={o.meta} value={o.value} selected={chosen ? ring : 0} id={`option-${i}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {pillOn && (
          <>
            <div style={{ position: 'absolute', left: 0, top: PILL.y, width: W, display: 'flex', justifyContent: 'center' }}>
              <Pill theme={t} h={PILL.h} spin={(F - CUE.toPill) * 9} label={<TypeOn id="build-label" text={WALK.build.label} frame={F} start={CUE.toPill + f60x(14)} kind="stream" cps={84} caret={false} role="ui" size={PILL.h * 0.36} />} value={`${pct}%`} id="build-pill" />
            </div>
            {/* the output building from the top down: its picture develops, its fields arrive in turn */}
            <div style={{ position: 'absolute', left: (W - BUILD.w) / 2, top: BUILD.y }}>
              <Surface theme={t} w={BUILD.w} h={BUILD.h} lift={30} r={36 * U}>
                <div style={{ position: 'absolute', left: 36 * U, top: 36 * U, width: BUILD.w - 72 * U, height: 260 * U, borderRadius: 24 * U, overflow: 'hidden', opacity: prog(F, CUE.build, CUE.build + f60x(8), E.snapOut) }}>
                  {/* the picture develops: a ghost copy (a static filter) under the colour copy fading in */}
                  <div style={{ position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(0.4) brightness(1.9)' }}>
                    <Photo theme={t} w={BUILD.w - 72 * U} h={260 * U} seed={21} />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, opacity: prog(F, CUE.build + f60x(8), CUE.build + f60x(32), E.stdInOut) }}>
                    <Photo theme={t} w={BUILD.w - 72 * U} h={260 * U} seed={21} />
                  </div>
                </div>
                {WALK.page.rows.map((r, i) => {
                  const at = CUE.build + f60x(10) + i * f60x(9);
                  const p = prog(F, at, at + f60x(16), E.snapOut);
                  return (
                    <div key={i} style={{ position: 'absolute', left: 36 * U, top: (330 + i * 86) * U, opacity: p, transform: `translate3d(0, ${((1 - p) * 24 * U).toFixed(2)}px, 0)` }}>
                      <DataRow theme={t} w={BUILD.w - 72 * U} h={78 * U} label={r} value={`${Math.min(100, pct + 12 * (2 - i))}%`} id={`build-row-${i}`} />
                    </div>
                  );
                })}
              </Surface>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
