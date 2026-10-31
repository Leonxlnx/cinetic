import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Lit } from '../fx/Lit';
import { crispWords } from '../fx/TypePresets';
import { Words } from '../fx/Words';
import { face, shadeRgba } from '../kit';
import { clamp, E, mix, prog } from '../lib/anim';
import type { CamMove, Shot } from '../lib/camera';
import { MODAL, modalPush } from '../lib/camera-moves';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, DEAL, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { BASE, circIn, FONT, glass, GROUNDS, INK, useAbs, World } from './stage';

// PAGE - what it made. The shot arrives still moving up (the cards' exit carried, decaying), the main card on screen
// from the cut; the camera eases back as the page settles, the other two cards rising into place a beat apart in an
// upward cascade (150 px, faded in over their first frames: they never cross another card's text). Then the modal
// moment: the page blurs and dims while the camera pushes in, the done toast pops sharp at the push's midpoint, and a
// circ-in pull-out takes everything to black. The deal's device:
//   cascade  the page is the frame: the title's letters swing in on an arc a frame apart, the cards cascade under it
//   panel    the page sits in one lit browser panel facing the camera in the film's light, the title arriving on the crisp entry

export const PAGE_LAYOUT = { title: 190, titleY: 250, card: { w: 430, h: 470 }, gap: 44, cardY: 650, from: 1.18, rise: 150, carry: 260, decay60: 0.86 } as const;

const PlanCard: React.FC<{ i: number; x: number; y: number; o?: number; k?: number }> = ({ i, x, y, o = 1, k = 1 }) => {
  const c = TEASER.page.cards[i];
  const w = PAGE_LAYOUT.card.w * U * k;
  const h = PAGE_LAYOUT.card.h * U * k;
  const ui = 40 * U * k;
  return (
    <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, padding: ui, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: ui * 0.5, opacity: o, transform: `translate3d(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px, 0)`, ...glass(26 * U * k) }}>
      <span data-text={`plan${i + 1}`} style={face(ui, 600, INK.mute)}>{c.name}</span>
      <span data-text={`price${i + 1}`} style={face(ui * 2.3, 600, i === 1 ? INK.accent : INK.text, -0.03)}>{c.value}</span>
      <div style={{ height: 1.5 * U, background: INK.line, margin: `${ui * 0.3}px 0` }} />
      {c.rows.map((r, j) => (
        <span key={j} data-text={`row${i + 1}-${j}`} style={face(ui * 0.95, 500, INK.text)}>{r}</span>
      ))}
    </div>
  );
};

/** The title: letters on an arc (cascade, the one hero word) or the crisp entry (panel). */
const Title: React.FC<{ F: number; size: number; y: number; w: number }> = ({ F, size, y, w }) => {
  const film = useFilm();
  const title = copy('title');
  const style: React.CSSProperties = { fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color: INK.text };
  if (DEAL.page === 'panel') {
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, display: 'flex', justifyContent: 'center', transform: `translateY(${(y - size * 0.5).toFixed(2)}px)` }}>
        <Words id="title" text={title.text} frame={F} start={title.in} size={size} {...crispWords(film)} style={style} />
      </div>
    );
  }
  const letters = [...title.text];
  return (
    <div data-text="title" style={{ position: 'absolute', left: 0, top: 0, width: w, display: 'flex', justifyContent: 'center', transform: `translateY(${(y - size * 0.5).toFixed(2)}px)`, ...style }}>
      {/* lint-ok: hero word (the page's one title word swings in letter by letter) */}
      {letters.map((ch, i) => {
        const at = CUE.page + f60x(2 * i);
        const p = prog(F, at, at + f60x(22), E.glideOut);
        return (
          <span key={i} style={{ display: 'inline-block', opacity: clamp(p * 3), transformOrigin: '0% 100%', transform: `translate3d(${((1 - p) * -0.5).toFixed(3)}em, ${((1 - p) * 0.45).toFixed(3)}em, 0) rotate(${((1 - p) * -38).toFixed(2)}deg) scale(${mix(0.5, 1, p).toFixed(4)})` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** The page's content in a w x h box at scale k: the title and the three cards, the siblings rising a beat after the main one. */
const PageContent: React.FC<{ F: number; k?: number; w?: number; h?: number }> = ({ F, k = 1, w = W, h = H }) => {
  const step = (PAGE_LAYOUT.card.w + PAGE_LAYOUT.gap) * U * k;
  const cy = (PAGE_LAYOUT.cardY / 1080) * h;
  const rise = (at: number) => ({ y: PAGE_LAYOUT.rise * U * k * (1 - E.glideOut(prog(F, at, at + f60x(36), E.linear))), o: prog(F, at, at + f60x(5), E.linear) });
  const a = rise(CUE.sib1);
  const b = rise(CUE.sib2);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      <Title F={F} size={PAGE_LAYOUT.title * U * k} y={(PAGE_LAYOUT.titleY / 1080) * h} w={w} />
      <PlanCard i={1} x={w / 2} y={cy} k={k} />
      {F >= CUE.sib1 && <PlanCard i={0} x={w / 2 - step} y={cy + a.y} o={a.o} k={k} />}
      {F >= CUE.sib2 && <PlanCard i={2} x={w / 2 + step} y={cy + b.y} o={b.o} k={k} />}
    </div>
  );
};

export const pageMoves = (): { base: Shot; moves: CamMove[] } => ({
  base: { ...BASE, k: PAGE_LAYOUT.from },
  moves: [
    { at: CUE.page, frames: f60(70), zoom: 1 / PAGE_LAYOUT.from, ease: E.glideOut },
    { at: CUE.page + f60(60), frames: CUE.dim - CUE.page - f60(60), zoom: 1.03, ease: E.linear }, // the hold keeps moving
    { at: CUE.dim, frames: f60(MODAL.push60), zoom: MODAL.push, ease: E.stdInOut },
    { at: CUE.dim + f60(MODAL.push60 * 0.8), frames: CUE.blackout - CUE.dim, zoom: 1.07, pan: { x: -60 * U }, ease: E.linear }, // the page under the modal keeps moving; the toast holds still over it, sharp
    { at: CUE.blackout, frames: ACT.stages.from - CUE.blackout, zoom: 0.63, ease: circIn },
  ],
});

export const Page: React.FC = () => {
  const F = useAbs('page');
  const film = useFilm();
  const cam = pageMoves();
  const modal = modalPush(F, CUE.dim, film);
  const black = prog(F, CUE.blackout, ACT.stages.from, E.buildIn);
  const toast = modal.toast;
  const tw = 820 * U;
  const th = 156 * U;
  const toastOut = prog(F, CUE.blackout, ACT.stages.from - f60x(6), E.buildIn);
  const carry = PAGE_LAYOUT.carry * U * PAGE_LAYOUT.decay60 ** Math.max(0, ((F - ACT.page.from) * 60) / film.fps);
  const backdrop = modal.veil > MODAL.veil * 0.5; // the page under the modal is a backdrop, not text to read
  const panelW = 1640 * U;
  const panelH = 900 * U;
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <Defocus sigma={modal.blur}>
        <div {...(backdrop ? { 'data-audit-copy': true } : {})} style={{ position: 'absolute', inset: 0, transform: `translate3d(0, ${carry.toFixed(2)}px, 0)` }}>
          <World F={F} act="page" base={cam.base} moves={cam.moves} smear={false}>
            {DEAL.page === 'panel' ? (
              <Lit frame={F} x={W / 2} y={H / 2 + 10 * U} w={panelW} h={panelH} r={30 * U} ground={GROUNDS.page.base} id="page">
                <div style={{ position: 'absolute', inset: 0, ...glass(30 * U), background: INK.surface }}>
                  <PageContent F={F} k={0.84} w={panelW} h={panelH} />
                </div>
              </Lit>
            ) : (
              <PageContent F={F} />
            )}
          </World>
          <AbsoluteFill style={{ background: INK.ground, opacity: modal.veil }} />
        </div>
      </Defocus>
      {toast.shown && (
        <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: tw, height: th, display: 'flex', alignItems: 'center', gap: 28 * U, padding: `0 ${40 * U}px`, boxSizing: 'border-box', borderRadius: th / 2, background: INK.text, boxShadow: `0 ${(30 * U).toFixed(0)}px ${(70 * U).toFixed(0)}px ${shadeRgba(INK, 0.7)}`, opacity: toast.opacity * (1 - toastOut), transform: `translate3d(${((W - tw) / 2).toFixed(2)}px, ${(H * 0.36 - th / 2 + toast.rise * U).toFixed(2)}px, 0) scale(${toast.scale.toFixed(4)})`, filter: toast.blur > 0.05 ? `blur(${(toast.blur * U).toFixed(2)}px)` : undefined }}>
          <div style={{ width: th * 0.42, height: th * 0.42, borderRadius: th, background: INK.accent }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span data-text="toast" style={face(48 * U, 600, INK.ground)}>{TEASER.page.toast.title}</span>
            <span data-text="toast-body" style={face(42 * U, 500, INK.line)}>{TEASER.page.toast.body}</span>
          </div>
        </div>
      )}
      <AbsoluteFill style={{ background: INK.ground, opacity: black }} />
    </AbsoluteFill>
  );
};
