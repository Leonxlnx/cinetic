import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Button, DataRow, face, KIT_TYPE, Photo, Surface } from '../kit';
import { E, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { DARK, LIGHT, useAbs } from './stage';

// PAGE - the output, live. The page the product made flies up into the frame tilted back, flattens as it lands,
// its picture develops from a ghost to colour, and it scrolls a little to show it is real. Then it recedes and
// softens while the end card assembles in front of it.

const PAGE = { w: 1320 * U, h: 1700 * U } as const;

export const Page: React.FC = () => {
  const F = useAbs('page');
  const t = LIGHT;
  const fly = prog(F, ACT.page.from, CUE.pageLand, E.snapOut);
  const tilt = mix(24, 0, fly);
  const dy = (1 - fly) * H * 0.85;
  const scroll = prog(F, CUE.scroll, CUE.scroll + f60x(50), E.stdInOut) * 420 * U;
  const recede = prog(F, CUE.recede, ACT.end.from, E.buildIn);
  const k = creep(F, CUE.pageLand, { pctPerSec: 0.03 }, FPS) * lmix(1, 0.86, recede);
  const art = prog(F, CUE.art, CUE.art + f60x(28), E.stdInOut);
  const pad = 80 * U;
  return (
    <AbsoluteFill style={{ background: DARK.ground, overflow: 'hidden' }}>
      <Defocus sigma={recede * 8}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H * 0.4}px`, transform: `translate3d(0, ${(dy - scroll).toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>
          <div style={{ position: 'absolute', left: (W - PAGE.w) / 2, top: 120 * U, width: PAGE.w, height: PAGE.h, transformOrigin: '50% 0%', transform: `perspective(${2400 * U}px) rotateX(${tilt.toFixed(3)}deg)` }}>
            <Surface theme={t} w={PAGE.w} h={PAGE.h} lift={60} r={40 * U}>
              <div style={{ position: 'absolute', left: pad, top: pad, display: 'flex', flexDirection: 'column', gap: 18 * U }}>
                <span data-text="page-headline" style={face(KIT_TYPE.head * U * 1.1, 680, t.text, -0.035)}>
                  {WALK.page.headline}
                </span>
                <span data-text="page-sub" style={face(KIT_TYPE.body * U, 500, t.mute)}>
                  {WALK.page.sub}
                </span>
                <div style={{ marginTop: 12 * U }}>
                  <Button theme={t} label={WALK.page.cta} w={300 * U} h={96 * U} id="page-cta" />
                </div>
              </div>
              <div style={{ position: 'absolute', left: pad, top: 470 * U, width: PAGE.w - 2 * pad, height: 620 * U, borderRadius: 30 * U, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(0.4) brightness(1.9)' }}>
                  <Photo theme={t} w={PAGE.w - 2 * pad} h={620 * U} seed={31} push={prog(F, CUE.pageLand, ACT.end.from, E.linear)} />
                </div>
                <div style={{ position: 'absolute', inset: 0, opacity: art }}>
                  <Photo theme={t} w={PAGE.w - 2 * pad} h={620 * U} seed={31} push={prog(F, CUE.pageLand, ACT.end.from, E.linear)} />
                </div>
              </div>
              {WALK.page.rows.map((r, i) => (
                <div key={i} style={{ position: 'absolute', left: pad, top: (1160 + i * 120) * U }}>
                  <DataRow theme={t} w={PAGE.w - 2 * pad} h={100 * U} label={r} value={WALK.page.cta} id={`page-row-${i}`} />
                </div>
              ))}
            </Surface>
          </div>
        </div>
      </Defocus>
    </AbsoluteFill>
  );
};
