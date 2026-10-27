import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { fanState } from '../fx/Stack';
import { Notice } from '../kit';
import { E, lmix, prog } from '../lib/anim';
import type { CamMove } from '../lib/camera';
import { useFilm } from '../lib/film';
import { ACT, CUE, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { Caption, INK, useAbs, World } from './stage';

// CARDS - proof. A notification card lands by shrinking from x1.13 (it is readable while it still settles: position
// before focus), two more slide out from behind it into a tilted fan in 3D (fx/Stack fanState: E.in into a blur peak),
// they collapse back, and the stack leaves up on an ease-in, smeared, as the next shot's title swings in.

export const CARD = { w: 900, h: 190, land60: 16, from: 1.13, exit: 1300 } as const;

export const Cards: React.FC = () => {
  const F = useAbs('cards');
  const film = useFilm();
  const w = CARD.w * U;
  const h = CARD.h * U;
  const land = prog(F, ACT.cards.from, ACT.cards.from + f60x(CARD.land60), E.snapOut);
  const k = lmix(CARD.from, 1, land);
  const fan = fanState(F, { open: CUE.fan, close: CUE.collapse }, film);
  const out = (f: number) => -CARD.exit * U * E.launchIn(prog(f, CUE.cardsOut, ACT.page.from, E.linear));
  const v = out(F) - out(F - 1);
  const moves: CamMove[] = [{ at: ACT.cards.from, frames: ACT.cards.dur, zoom: 1.05, ease: E.linear }];
  const cards = [...fan.cards].sort((a, b) => a.z - b.z); // the deepest first, the front card on top
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} moves={moves}>
        <DirBlur v={Math.abs(v) / U} axis="y" id="cards-out">
          <div style={{ position: 'absolute', left: W / 2, top: H / 2 + 60 * U + out(F), perspective: 1800 * U, opacity: Math.min(1, land * 4) }}>
            {cards.map((c) => {
              const d = TEASER.cards[c.i];
              return (
                <div key={c.i} style={{ position: 'absolute', left: -w / 2, top: -h / 2, transform: `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, ${(c.z * 40 * U).toFixed(1)}px) rotateZ(${c.rotZ.toFixed(2)}deg) rotateY(${c.rotY.toFixed(2)}deg) rotateX(${c.rotX.toFixed(2)}deg) scale(${(c.scale * k).toFixed(5)})`, opacity: c.i === 0 ? 1 : Math.min(1, c.q * 4) }}>
                  <Notice theme={INK} w={w} h={h} glyph={d.glyph} title={d.app} body={d.event} id={`card${c.i + 1}`} />
                </div>
              );
            })}
          </div>
        </DirBlur>
      </World>
      <Caption id="connect" F={F} y={230 * U} pop />
    </AbsoluteFill>
  );
};
