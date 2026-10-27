import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { AvatarStack, face, KIT_TYPE, surfaceShadow } from '../kit';
import { E, hitPulse, mix, prog } from '../lib/anim';
import { DirBlur } from '../fx/Defocus';
import { creep, launch } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { PILL_BOX } from './Feed';
import { DARK, ScriptLine, useAbs } from './stage';

// INSIGHT - what the product found, as one pill: the people who asked, the insight, a count chip that pops on its
// beat. The line above says it in a sentence; the key light swells once before the whip. The shot whips left into
// the choice, its last frame the fastest.

/** The whip into the choice: px per frame on the cut, leftward. */
export const WHIP_LEFT = { vCut: -170 * U };

export const Insight: React.FC = () => {
  const F = useAbs('insight');
  const t = DARK;
  const chip = prog(F, CUE.chip, CUE.chip + f60x(14), E.snapOut);
  const lo = { vCut: WHIP_LEFT.vCut, fps: FPS };
  const dx = launch(F, ACT.pick.from - 1, lo).x - launch(ACT.pick.from - 1 - f60x(90), ACT.pick.from - 1, lo).x;
  const whipV = launch(F, ACT.pick.from - 1, lo).v / U; // the whip's speed (px/f at 1080p) smears the layer along it
  const k = creep(F, ACT.insight.from, { pctPerSec: 0.04 }, FPS);
  const key = 0.05 + 0.06 * hitPulse(F - CUE.glow, 6, 40, FPS); // one light event: the key swells under the read
  const people = WALK.feed.rows.slice(0, 3).map((r) => ({ initials: r.initials }));
  const fill = prog(F, ACT.insight.from, ACT.insight.from + f60x(10), E.snapOut); // the pill's own content arrives as the morph lands
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `linear-gradient(160deg, rgba(255,255,255,${key.toFixed(3)}) 0%, rgba(255,255,255,0) 55%)` }} />
      <DirBlur v={whipV} axis="x" id="insight-whip">
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${PILL_BOX.cy}px`, transform: `translate3d(${dx.toFixed(2)}px, 0, 0) scale(${k.toFixed(5)})` }}>
        <ScriptLine id="insight" F={F} top={250 * U} color={t.text} exitDir="left" exitAt={ACT.pick.from - 1} />
        <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: PILL_BOX.w, height: PILL_BOX.h, borderRadius: PILL_BOX.h / 2, background: t.surface, boxShadow: `${surfaceShadow(t, 34, U)}, inset 0 0 0 ${(3 * U).toFixed(2)}px ${t.accent}`, display: 'flex', alignItems: 'center', gap: 28 * U, padding: `0 ${30 * U}px`, boxSizing: 'border-box', transform: `translate3d(${(PILL_BOX.cx - PILL_BOX.w / 2).toFixed(2)}px, ${(PILL_BOX.cy - PILL_BOX.h / 2).toFixed(2)}px, 0)` }}>
          <div style={{ opacity: fill }}>
            <AvatarStack theme={t} people={people} size={78 * U} ring={t.surface} />
          </div>
          <span data-text="insight-text" style={{ ...face(KIT_TYPE.body * U * 1.15, 620, t.text, -0.02), flex: 1, opacity: fill }}>
            {WALK.insight.text}
          </span>
          <div style={{ padding: `${10 * U}px ${22 * U}px`, borderRadius: 40 * U, background: t.accent, opacity: chip, transform: `scale(${mix(1.3, 1, chip).toFixed(4)})` }}>
            <span data-text="insight-count" style={face(KIT_TYPE.label * U, 700, t.accentInk)}>
              {WALK.insight.count}
            </span>
          </div>
        </div>
      </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
