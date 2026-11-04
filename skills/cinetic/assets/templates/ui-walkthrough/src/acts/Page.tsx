import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DEAL } from '../deal';
import { Defocus } from '../fx/Defocus';
import { DepthStack, depthPush } from '../fx/DepthStack';
import { Lit } from '../fx/Lit';
import { Button, ContentTile, DataRow, face, kitTheme, KIT_TYPE, Surface } from '../kit';
import { C } from '../brand/tokens';
import { E, lmix, prog } from '../lib/anim';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { CENTRE, Ground, GROUNDS, themeOf, useAbs } from './stage';

// PAGE - the output, live, by the dealt device: 'lit' rises one page up over the build, turning from a steep tilt to
// face the camera as it lands (fx/Lit), its preview developing and its body scrolling a little to show it is real; 'stack' lands the
// page between its siblings (the other outputs the product made) in a depth stack the camera pushes through. Then it
// recedes and softens while the end card assembles in front of it.

const PAGE = { w: 1320 * U, h: 1700 * U } as const;
/** The output's own theme: the page is paper on any ground (the product's output, not the film's stage). */
export const PAGE_THEME = kitTheme('tintedPaper', C.accent);

/** The page's face: headline, line, action, a developing preview and its sections; `scroll` px moves its body up. */
export const PageFace: React.FC<{ F: number; scroll?: number; w?: number; h?: number; seed?: string }> = ({ F, scroll = 0, w = PAGE.w, h = PAGE.h, seed = 'page' }) => {
  const t = PAGE_THEME;
  const pad = 80 * U;
  const art = prog(F, CUE.art, CUE.art + f60x(30), E.stdInOut);
  const node = { glyph: 'chart' as const, label: WALK.page.rows[0], sub: WALK.page.sub, preview: 'chart' as const, value: WALK.page.cta, seed: `${WALK.name}:${seed}` };
  return (
    <Surface theme={t} w={w} h={h} lift={4} r={40 * U}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(0, ${(-scroll).toFixed(2)}px, 0)` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${pad}px, 0)`, display: 'flex', flexDirection: 'column', gap: 18 * U }}>
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
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${470 * U}px, 0)` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, filter: 'grayscale(1) contrast(0.5) brightness(1.4)', opacity: 1 - art }}>
            <ContentTile node={node} theme={t} w={w - 2 * pad} aspect={(w - 2 * pad) / (620 * U)} lift={6} />
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: art }}>
            <ContentTile node={node} theme={t} w={w - 2 * pad} aspect={(w - 2 * pad) / (620 * U)} lift={6} />
          </div>
        </div>
        {WALK.page.rows.map((r, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${(1160 + i * 120) * U}px, 0)` }}>
            <DataRow theme={t} w={w - 2 * pad} h={100 * U} label={r} value={WALK.page.cta} id={`page-row-${i}`} />
          </div>
        ))}
      </div>
    </Surface>
  );
};

export const Page: React.FC = () => {
  const F = useAbs('page');
  const t = themeOf('page');
  const film = { fps: FPS, width: W, height: H };
  const scroll = prog(F, CUE.scroll, CUE.scroll + f60x(56), E.stdInOut) * 380 * U;
  const recede = prog(F, CUE.recede, ACT.end.from, E.buildIn);
  const k = lmix(1, 1.03, prog(F, CUE.pageLand, ACT.end.from, E.linear)) * lmix(1, 0.88, recede);
  const top = 150 * U + PAGE.h / 2;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Ground act="page" F={F} />
      <Defocus sigma={recede * 8}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H * 0.4}px`, transform: `scale(${k.toFixed(5)})` }}>
          {DEAL.page === 'stack' ? (
            <DepthStack
              frame={F}
              cam={{ base: CENTRE, moves: depthPush(ACT.page.from, { film, frames: ACT.page.dur * 1.2, zoom: 1.18, pan: -60, yaw: 5 }) }}
              rim
              items={[
                { id: 'far-0', plane: 'far', carries: 'ui', x: W * 0.16, y: H * 0.62, w: PAGE.w * 0.7, h: PAGE.h * 0.7, at: ACT.page.from },
                { id: 'far-1', plane: 'far', carries: 'ui', x: W * 0.86, y: H * 0.7, w: PAGE.w * 0.7, h: PAGE.h * 0.7, at: ACT.page.from + f60x(6) },
                { id: 'page', plane: 'mid', carries: 'ui', x: W / 2, y: top - 40 * U, w: PAGE.w, h: PAGE.h, r: 40 * U, at: ACT.page.from },
                { id: 'near-0', plane: 'near', carries: 'ui', x: W * 0.06, y: H * 0.95, w: 520 * U, h: 380 * U, at: ACT.page.from + f60x(10) },
              ]}
              render={(id) => (id === 'page' ? <PageFace F={F} scroll={scroll} /> : id.startsWith('far') ? <PageFace F={F} seed={id} w={PAGE.w * 0.7} h={PAGE.h * 0.7} /> : <ContentTile node={{ glyph: 'check', label: WALK.page.cta, sub: WALK.page.rows[1], preview: 'list', seed: `${WALK.name}:near` }} theme={PAGE_THEME} w={520 * U} aspect={520 / 380} />)}
            />
          ) : (
            <Lit frame={F} x={W / 2} y={top} w={PAGE.w} h={PAGE.h} r={40 * U} ground={GROUNDS.page.base} enter={{ at: ACT.page.from, dur60: (CUE.pageLand - ACT.page.from) * (60 / FPS) + 20, from: { y: top + H * 0.75, tilt: { x: 30, y: -14 } } }} id="page">
              <PageFace F={F} scroll={scroll} />
            </Lit>
          )}
        </div>
      </Defocus>
    </AbsoluteFill>
  );
};
