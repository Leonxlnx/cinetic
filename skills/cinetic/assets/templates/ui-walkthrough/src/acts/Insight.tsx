import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { DepthStack } from '../fx/DepthStack';
import { ContentTile, surfaceShadow, type TileNode } from '../kit';
import { E, hitPulse, lmix, prog } from '../lib/anim';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { PILL_BOX, PillContent } from './Feed';
import { CENTRE, drift, Ground, launchOut, ScriptLine, themeOf, useAbs } from './stage';

// INSIGHT - what the product found, as one pill: the people who asked (crafted portraits), the insight, a count chip
// that glides in on its beat. The people who wrote it stand round the pill in depth as content tiles, their names and
// their words (fx/DepthStack: smaller and softer far away, large and soft near the lens) while the camera pushes slowly
// in; the line above says it in a sentence on the crisp entry; the key light swells once before the whole frame whips
// left into the choice, its last frame the fastest.

/** The whip into the choice: px per frame on the cut, leftward. */
export const WHIP_LEFT = { vCut: -96 * U };

/** Where the people stand round the pill (share of the frame) and on which plane. */
const SPOTS: { plane: 'far' | 'near'; x: number; y: number }[] = [
  { plane: 'far', x: 0.12, y: 0.24 },
  { plane: 'far', x: 0.86, y: 0.2 },
  { plane: 'far', x: 0.1, y: 0.82 },
  { plane: 'far', x: 0.9, y: 0.84 },
  { plane: 'near', x: 0.98, y: 0.55 },
  { plane: 'near', x: 0.02, y: 0.5 },
];

export const Insight: React.FC = () => {
  const F = useAbs('insight');
  const t = themeOf('insight');
  const chip = prog(F, CUE.chip, CUE.chip + f60x(24), E.glideOut);
  const dx = launchOut('insight', F, WHIP_LEFT.vCut);
  const whipV = (dx - launchOut('insight', F - 1, WHIP_LEFT.vCut)) / U;
  const k = lmix(1, 1.06, prog(F, ACT.insight.from, ACT.pick.from, E.linear));
  const d = drift('insight', F, 90, 0.35);
  const key = 0.05 * prog(F, ACT.insight.from, ACT.insight.from + f60x(40), E.softOut) + 0.06 * hitPulse(F - CUE.glow, 6, 40, FPS); // the key comes up, then swells once under the read
  const people: TileNode[] = WALK.feed.rows.slice(0, SPOTS.length).map((r, i) => ({ glyph: 'chat', label: r.who, sub: r.text, preview: 'person', seed: `${r.who}:${i}` }));
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={whipV} axis="x" id="insight-whip">
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(dx + d.x).toFixed(3)}px, ${d.y.toFixed(3)}px, 0)` }}>
          <Ground act="insight" F={F} />
          <AbsoluteFill style={{ background: `linear-gradient(160deg, rgba(255,255,255,${key.toFixed(3)}) 0%, rgba(255,255,255,0) 55%)` }} />
          {/* the people who wrote it, round the pill in depth */}
          <DepthStack
            frame={F}
            cam={{ base: CENTRE, moves: [{ at: ACT.insight.from, frames: ACT.insight.dur, zoom: 1.06, ease: E.linear }] }}
            planes={{ far: { blur: 3 }, near: { blur: 7 } }}
            rim
            items={SPOTS.map((s, i) => ({ id: `p${i}`, plane: s.plane, x: W * s.x, y: H * s.y, w: 330 * U, h: 300 * U, tilt: { x: 0, y: s.x < 0.5 ? 14 : -14 }, at: ACT.insight.from + f60x(6 + 6 * i) }))}
            render={(id) => <ContentTile node={people[Number(id.slice(1))]} theme={t} w={330 * U} aspect={1.1} />}
          />
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
            <ScriptLine id="insight" F={F} top={300 * U} color={t.text} />
            <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: PILL_BOX.w, height: PILL_BOX.h, borderRadius: PILL_BOX.h / 2, background: t.surface, boxShadow: `${surfaceShadow(t, 34, U)}, inset 0 0 0 ${(3 * U).toFixed(2)}px ${t.accent}`, transform: `translate3d(${(PILL_BOX.cx - PILL_BOX.w / 2).toFixed(2)}px, ${(PILL_BOX.cy - PILL_BOX.h / 2).toFixed(2)}px, 0)` }}>
              <PillContent chip={chip} />
            </div>
          </div>
        </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
