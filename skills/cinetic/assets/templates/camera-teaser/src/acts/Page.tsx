import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { face } from '../kit';
import { clamp, E, mix, prog } from '../lib/anim';
import type { CamMove, Shot } from '../lib/camera';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { BASE, circIn, FONT, glass, INK, tail, useAbs, World } from './stage';

// PAGE - what it made. The title's letters swing in on an arc a frame apart, the main card rises a beat after them,
// the camera pulls back, and the sibling cards slide in from the left and then the right, braking hard. Then the
// modal moment: the page blurs and dims while the camera pushes in, the done toast pops at the push's midpoint (sharp,
// over the blur), and a circ-in pull-out takes everything to black.

export const PAGE_LAYOUT = { title: 210, titleY: 230, card: { w: 430, h: 500 }, gap: 40, cardY: 640, from: 1.33 } as const;

const PlanCard: React.FC<{ i: number; x: number; y: number }> = ({ i, x, y }) => {
  const c = TEASER.page.cards[i];
  const w = PAGE_LAYOUT.card.w * U;
  const h = PAGE_LAYOUT.card.h * U;
  const ui = 40 * U;
  return (
    <div data-ui style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, padding: ui, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: ui * 0.5, ...glass(26 * U) }}>
      <span data-text={`plan${i + 1}`} style={face(ui, 600, INK.mute)}>{c.name}</span>
      <span data-text={`price${i + 1}`} style={face(ui * 2.3, 600, i === 1 ? INK.accent : INK.text, -0.03)}>{c.value}</span>
      <div style={{ height: 1.5 * U, background: INK.line, margin: `${ui * 0.3}px 0` }} />
      {c.rows.map((r, k) => (
        <span key={k} data-text={`row${i + 1}-${k}`} style={face(ui * 0.95, 500, INK.text)}>{r}</span>
      ))}
    </div>
  );
};

export const Page: React.FC = () => {
  const F = useAbs('page');
  const film = useFilm();
  const title = copy('title');
  const letters = [...title.text];
  const size = PAGE_LAYOUT.title * U;
  const step = ((PAGE_LAYOUT.card.w + PAGE_LAYOUT.gap) * U);
  const cy = PAGE_LAYOUT.cardY * U;
  const main = tail(F, CUE.page + f60(4), 300 * U, film.fps, 0.03);
  const slide = (at: number, from: number) => from * (1 - E.snapOut(prog(F, at, at + f60x(14), E.linear)));
  const base: Shot = { ...BASE, k: PAGE_LAYOUT.from };
  const moves: CamMove[] = [
    { at: CUE.page, frames: f60(40), zoom: 1 / PAGE_LAYOUT.from, ease: E.glideOut },
    { at: CUE.dim, frames: f60(42), zoom: 1.43, ease: E.stdInOut },
    { at: CUE.blackout, frames: ACT.stages.from - CUE.blackout, zoom: 0.63, ease: circIn },
  ];
  const dim = prog(F, CUE.dim, CUE.dim + f60x(20), E.stdInOut);
  const black = prog(F, CUE.blackout, ACT.stages.from, E.buildIn);
  const toastT = F - CUE.toast;
  const tw = 620 * U;
  const th = 130 * U;
  const toastOut = prog(F, CUE.blackout, ACT.stages.from - f60x(6), E.buildIn);
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <Defocus sigma={14 * dim}>
        <World F={F} base={base} moves={moves} smear={false}>
          <div data-text="title" style={{ position: 'absolute', left: 0, top: PAGE_LAYOUT.titleY * U - size * 0.5, width: W, display: 'flex', justifyContent: 'center', fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color: INK.text }}>
            {/* lint-ok: hero word (the page's one title word swings in letter by letter) */}
            {letters.map((ch, i) => {
              const at = CUE.page + f60x(2 * i);
              const p = prog(F, at, at + f60x(18), E.snapOut);
              return (
                <span key={i} style={{ display: 'inline-block', opacity: clamp(p * 3), transformOrigin: '0% 100%', transform: `translate3d(${((1 - p) * -0.5).toFixed(3)}em, ${((1 - p) * 0.45).toFixed(3)}em, 0) rotate(${((1 - p) * -38).toFixed(2)}deg) scale(${mix(0.5, 1, p).toFixed(4)})` }}>
                  {ch}
                </span>
              );
            })}
          </div>
          {F >= CUE.page + f60(4) && <PlanCard i={1} x={W / 2} y={cy + main} />}
          {F >= CUE.sib1 && <PlanCard i={0} x={W / 2 - step - slide(CUE.sib1, 900 * U)} y={cy} />}
          {F >= CUE.sib2 && <PlanCard i={2} x={W / 2 + step + slide(CUE.sib2, 900 * U)} y={cy} />}
        </World>
        <AbsoluteFill style={{ background: INK.ground, opacity: 0.45 * dim }} />
      </Defocus>
      {F >= CUE.toast && (
        <div data-ui style={{ position: 'absolute', left: (W - tw) / 2, top: H / 2 - th / 2, width: tw, height: th, display: 'flex', alignItems: 'center', gap: 28 * U, padding: `0 ${36 * U}px`, boxSizing: 'border-box', opacity: clamp(toastT / f60x(8)) * (1 - toastOut), transform: `translate3d(0, ${((1 - clamp(toastT / f60x(10))) * 24 * U).toFixed(2)}px, 0) scale(${mix(0.86, 1, E.snapOut(clamp(toastT / f60x(10)))).toFixed(4)})`, filter: toastT < f60x(22) ? `blur(${(5 * U * (1 - toastT / f60x(22))).toFixed(2)}px)` : undefined, ...glass(th / 2) }}>
          <div style={{ width: th * 0.42, height: th * 0.42, borderRadius: th, background: INK.accent }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span data-text="toast" style={face(40 * U, 600, INK.text)}>{TEASER.page.toast.title}</span>
            <span data-text="toast-body" style={face(36 * U, 500, INK.mute)}>{TEASER.page.toast.body}</span>
          </div>
        </div>
      )}
      <AbsoluteFill style={{ background: INK.ground, opacity: black }} />
    </AbsoluteFill>
  );
};
