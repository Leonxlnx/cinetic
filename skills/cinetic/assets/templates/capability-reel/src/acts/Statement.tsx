import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { resizeState } from '../fx/Resize';
import { Wash } from '../fx/Washes';
import { Words } from '../fx/Words';
import { surfaceShadow } from '../kit';
import { lmix } from '../lib/anim';
import { phraseOnsets } from '../lib/cadence';
import { mixColor } from '../lib/color';
import { counterCreep, intoCut } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { cardBox } from './Record';
import { LIGHT, lineSize, useAbs } from './stage';

// STATEMENT - the cut lands on a kick: on a page whose tint gathers along one tilted edge, a light card opens at the
// record's size and squashes round one line of type in a few frames (fx/Resize carry: front-loaded from the cut), its words popping in a word gap apart. The hold
// counter-creeps (the line in, the card and its grid out), then everything zooms out, accelerating into the cut;
// the ticker opens still zooming out.

export const Statement: React.FC = () => {
  const F = useAbs('statement');
  const t = LIGHT;
  const c = copy('statement');
  const size = lineSize(c.text, 'display', 0.8);
  const textW = measureTracked(c.text, size, TYPE.display.weight, TYPE.display.track);
  const pad = 90 * U;
  const to = { w: textW + 2 * pad, h: size * 1.3 + 2 * 40 * U };
  const prev = cardBox(ACT.statement.from - 1);
  const s = resizeState(F, { at: ACT.statement.from, mode: 'carry', from: { x: prev.x, y: prev.y, w: prev.w, h: prev.h }, to: { x: (W - to.w) / 2, y: (H - to.h) / 2, w: to.w, h: to.h } }, { fps: FPS, width: W, height: H });
  const cc = counterCreep(F, CUE.squashed, {}, FPS);
  const out = lmix(1, 0.86, intoCut(F, ACT.ticker.from, 26, FPS));
  const pitch = 150 * U;
  const lineCol = mixColor(t.ground, t.line, 0.7);
  const n = c.text.trim().split(/\s+/).length;
  const starts = phraseOnsets(c.in, n, f60x(8), { shape: 'settle', seed: c.text }); // lib/cadence: phrased into the last word
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      {/* the paper has a direction: the accent's tint gathers along one tilted edge (fx/Washes tilted), the light card stands clear on it */}
      <Wash frame={F} kind="tilted" paper={t.ground} drift={0.003} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `scale(${(cc.ground * out).toFixed(5)})` }}>
        {/* the paper's grid follows the card, on the record's pitch */}
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden>
          {Array.from({ length: Math.ceil(W / pitch) + 1 }, (_, i) => (
            <line key={`v${i}`} x1={(((s.box.x % pitch) + pitch) % pitch) + i * pitch} y1={0} x2={(((s.box.x % pitch) + pitch) % pitch) + i * pitch} y2={H} stroke={lineCol} strokeWidth={1.5 * U} />
          ))}
          {Array.from({ length: Math.ceil(H / pitch) + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={(((s.box.y % pitch) + pitch) % pitch) + i * pitch} x2={W} y2={(((s.box.y % pitch) + pitch) % pitch) + i * pitch} stroke={lineCol} strokeWidth={1.5 * U} />
          ))}
        </svg>
        <div style={{ position: 'absolute', left: 0, top: 0, width: s.box.w, height: s.box.h, borderRadius: 30 * U, background: t.surface, boxShadow: surfaceShadow(t, 30, U), transform: `translate3d(${s.box.x.toFixed(2)}px, ${s.box.y.toFixed(2)}px, 0)` }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `scale(${(cc.text * out).toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * TYPE.display.lead) / 2, width: W, display: 'flex', justifyContent: 'center' }}>
          <Words id="statement" text={c.text} frame={F} start={c.in} starts={starts} size={size} dur={f60x(4)} style={{ ...typeStyle('display', size), color: t.text }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
