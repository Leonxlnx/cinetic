import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, TYPE, typeStyle, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { DEAL } from '../deal';
import { Defocus } from '../fx/Defocus';
import { crispWords } from '../fx/TypePresets';
import { Words } from '../fx/Words';
import { ContentWall, type TileNode } from '../kit';
import { E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { PageFace } from './Page';
import { drift, Ground, lineSize, themeOf, useAbs } from './stage';

// END - the lockup, built from the mark's own parts: they arrive in turn and the name is set beside them on the crisp
// entry, off-centre, with the payoff line under it (never letter by letter). Behind it, by the dealt device: 'side'
// keeps the output as a soft far plane cropped by the right edge; 'wall' sets the film's own screens as a soft wall of
// content tiles drifting behind the set. The key passes once across the set (the end card's light event) and a slow
// push keeps the lock alive to the end.

export const End: React.FC = () => {
  const F = useAbs('end');
  const t = themeOf('end');
  const film = { fps: FPS, width: W, height: H };
  const name = copy('wordmark');
  const pay = copy('payoff');
  const markSize = 190 * U;
  const nameSize = TYPE.display.size * U;
  const paySize = lineSize(pay.text, 'line', 0.62);
  const k = lmix(1.05, 1, prog(F, ACT.end.from, ACT.end.from + f60x(40), E.glideOut)) * lmix(1, 1.035, prog(F, ACT.end.from, ACT.end.from + ACT.end.dur, E.linear));
  const band = prog(F, CUE.light, CUE.light + f60x(90), E.stdInOut);
  const lock = prog(F, name.in, CUE.lockup, E.glideOut);
  const d = drift('end', F, 0, 0.3);
  const x0 = 170 * U;
  const nodes: TileNode[] = [
    ...WALK.results.map((r, i) => ({ glyph: 'doc' as const, label: r.title, sub: r.meta, value: r.badge, preview: (['doc', 'chart', 'list'] as const)[i % 3], seed: `${WALK.name}:end:r${i}` })),
    ...WALK.proof.map((p, i) => ({ glyph: 'bolt' as const, label: p.title, sub: p.body, preview: 'bars' as const, seed: `${WALK.name}:end:p${i}` })),
  ];
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Ground act="end" F={F} />
      {DEAL.end === 'wall' ? (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
          <Defocus sigma={7}>
            <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(W * 0.18).toFixed(1)}px, 0, 0)` }}>
              <ContentWall nodes={nodes} frame={F} start={ACT.end.from - f60x(20)} tile={260 * U} stagger={2} theme={t} seed={`${WALK.name}:end`} blur={false} />
            </div>
          </Defocus>
        </div>
      ) : (
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: 0.5, transform: `translate3d(${(W * 0.72 + d.x * 2).toFixed(2)}px, ${(140 * U).toFixed(2)}px, 0) perspective(${2200 * U}px) rotateY(-14deg)` }}>
          <Defocus sigma={12}>
            <PageFace F={F} w={900 * U} h={1100 * U} seed="end" />
          </Defocus>
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${x0}px ${H / 2}px`, transform: `translate3d(${d.x.toFixed(3)}px, ${d.y.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x0}px, ${330 * U}px, 0)` }}>
          <LogoMark
            logo={LOGO}
            size={markSize}
            fill={(part) => (t.dark && part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? t.text : undefined)} // the mark's ink parts read on a dark ground
            poses={(_, j) => {
              const p = prog(F, CUE.mark + j * f60x(6), CUE.mark + f60x(34) + j * f60x(6), E.glideOut);
              const glint = j === LOGO.parts.length - 1 ? 0.06 * hitPulse(F - CUE.rest, 4, 14, FPS) : 0;
              return { x: (1 - p) * -50, o: p, s: 1 + glint };
            }}
          />
        </div>
        {F >= name.in - 1 && (
          <div style={{ position: 'absolute', left: 0, top: 0, color: t.text, transform: `translate3d(${(x0 + markSize + 50 * U + (1 - lock) * -40 * U).toFixed(2)}px, ${(330 * U + markSize / 2 - (nameSize * TYPE.display.lead) / 2).toFixed(2)}px, 0)` }}>
            <Words id="wordmark" text={name.text} frame={F} start={name.in} size={nameSize} {...crispWords(film)} style={{ ...typeStyle('display', nameSize), color: t.text }} />
          </div>
        )}
        {F >= pay.in - 1 && (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x0}px, ${640 * U}px, 0)` }}>
            <Words id="payoff" text={pay.text} frame={F} start={pay.in} size={paySize} {...crispWords(film)} style={{ ...typeStyle('line', paySize), color: t.mute }} />
          </div>
        )}
      </div>
      {/* the key passing across the set once */}
      {F >= CUE.light && F < CUE.light + f60x(90) && (
        <AbsoluteFill style={{ background: `linear-gradient(112deg, rgba(255,255,255,0) ${mix(-30, 110, band) - 14}%, rgba(255,255,255,0.09) ${mix(-30, 110, band)}%, rgba(255,255,255,0) ${mix(-30, 110, band) + 14}%)` }} />
      )}
    </AbsoluteFill>
  );
};
