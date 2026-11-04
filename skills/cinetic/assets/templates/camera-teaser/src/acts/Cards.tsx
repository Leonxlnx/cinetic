import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { DEPTH, type DepthItem, depthPush, DepthStack } from '../fx/DepthStack';
import { AppIcon, ContentRing, ContentWall, face, GlyphTile, hasLogo, logoName, type TileNode } from '../kit';
import { type InlineRef, ObjectLine } from '../kit/inline';
import { clamp, E, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ReadBack } from '../fx/ReadBack';
import { ACT, copy, CUE, DEAL, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { glass, INK, useAbs, World } from './stage';

// CARDS - proof. The whip is carried down into the shot: everything arrives still moving up and decays (x0.85 a frame
// at 60 fps) under the smear. The connect line names where the updates go, the slot inside it rolling the real marks
// of the products it works with (kit ObjectLine, the crisp entry). Three notifications from those products land
// (their marks on the cards). The stack leaves up about 380 px on an ease-in, still crossing the frame at the cut, and
// the page arrives moving the same way. The deal's device:
//   stack  the cards stand stacked in perspective in a depth stack (fx/DepthStack: the products' tiles on the far
//          wall facing the camera, two soft tiles crossing the near plane), the camera pushing through it
//   wall   the cards land one above the next in front of a wall of tiles (kit ContentWall: the products' marks nearest
//          the centre, the product's own records round them), the wall drifting in parallax
//   ring   the cards land in the middle of a ring of tiles that tumble in and orbit (kit ContentRing)

export const CARD = { w: 960, h: 190, icon: 120, gap: 210, exit: 380, carry: 820, decay60: 0.85 } as const;

/** The slot's objects: the integrations' real marks, else the cards' glyphs. */
export const slotObjects = (): InlineRef[] => {
  const marks = TEASER.integrations.filter((s) => hasLogo(s));
  return marks.length ? marks : TEASER.cards.map((c) => ({ kind: 'glyph' as const, name: c.glyph }));
};

/** The tiles round the cards: the integrations' marks first, then the product's own records fill the rest. */
const tileNodes = (): TileNode[] => TEASER.integrations.map((s) => ({ logo: s, label: hasLogo(s) ? logoName(s) : s }));

/** One notification: the product it lands in (its real mark on an app-icon tile, or the glyph), the app, the event, when. */
export const ProofCard: React.FC<{ i: number; w?: number; h?: number }> = ({ i, w = CARD.w * U, h = CARD.h * U }) => {
  const c = TEASER.cards[i];
  const icon = CARD.icon * U * (h / (CARD.h * U));
  const ui = 40 * U * (h / (CARD.h * U));
  return (
    <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', alignItems: 'center', gap: ui * 0.7, padding: `0 ${ui}px`, boxSizing: 'border-box', ...glass(h * 0.24) }}>
      {hasLogo(c.logo) ? <AppIcon logo={c.logo} size={icon} theme={INK} lift={10} /> : <GlyphTile theme={INK} name={c.glyph} size={icon} solid />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: ui * 0.12, flex: 1, minWidth: 0 }}>
        <span data-text={`card${i + 1}`} style={face(ui, 600, INK.text)}>{c.app}</span>
        <span data-text={`card${i + 1}-event`} style={face(ui * 0.95, 500, INK.mute)}>{c.event}</span>
      </div>
      <span data-texture style={face(ui * 0.62, 500, INK.mute)}>{c.when}</span>
    </div>
  );
};

/** When each card lands: the first already landing at the cut (on screen and moving from the cut's first frame), the others on the fan cue a few frames apart. */
const landAt = (i: number) => (i === 0 ? CUE.cards - f60x(12) : CUE.fan + f60x(9 * (i - 1)));

/**
 * The stack device: the cards in the mid plane, stacked in perspective; on the far wall one tile per product it works
 * with (three or four, never a scatter of repeats), and one soft tile crossing the near plane, cropped by the frame edge.
 */
const Stack: React.FC<{ F: number }> = ({ F }) => {
  const w = CARD.w * U;
  const h = CARD.h * U;
  const marks = TEASER.integrations.filter((s) => hasLogo(s));
  const tile = 300 * U;
  const content = marks.length ? ('mark' as const) : ('icon' as const);
  const n = Math.min(4, Math.max(3, marks.length));
  const wall = [{ x: 300, y: 290 }, { x: 1640, y: 250 }, { x: 330, y: 830 }, { x: 1660, y: 810 }];
  const far: DepthItem[] = Array.from({ length: n }, (_, k) => ({ id: `far${k}`, plane: 'far', carries: content, x: wall[k].x * U, y: wall[k].y * U, w: tile, h: tile, r: tile * 0.23, at: CUE.cards + f60x(5 * k) }));
  const near: DepthItem[] = [{ id: 'near0', plane: 'near', carries: content, x: 1830 * U, y: 1000 * U, w: tile * 0.9, h: tile * 0.9 }];
  const cards: DepthItem[] = TEASER.cards.map((_, i) => ({ id: `card${i}`, plane: 'mid', carries: 'ui' as const, x: W / 2 + (i - 1) * 60 * U, y: H / 2 + 110 * U + (i - 1) * CARD.gap * U, w, h, r: h * 0.24, at: landAt(i) }));
  return (
    <DepthStack
      frame={F}
      items={[...far, ...near, ...cards]}
      cam={{ moves: depthPush(CUE.cards, { frames: f60x(150), zoom: 1.18, pan: -60 * U, yaw: 5 }) }}
      rim
      render={(id) => {
        if (id.startsWith('card')) return <ProofCard i={Number(id.slice(4))} />;
        const k = Number(id.replace(/\D/g, ''));
        const mark = marks.length ? marks[k % marks.length] : undefined;
        const s = id.startsWith('near') ? tile * 0.9 : tile;
        return mark ? <AppIcon logo={mark} size={s} theme={INK} tone="dark" lift={24} /> : <GlyphTile theme={INK} name={TEASER.cards[k % 3].glyph} size={s} />;
      }}
    />
  );
};

/** The cards landing one above the next (wall and ring devices): each glides up 60 px into place while it fades in. */
const Landing: React.FC<{ F: number; scale?: number }> = ({ F, scale = 1 }) => {
  const w = CARD.w * U * scale;
  const h = CARD.h * U * scale;
  return (
    <>
      {TEASER.cards.map((_, i) => {
        const q = prog(F, landAt(i), landAt(i) + f60x(DEPTH.enter.frames60), E.glideOut);
        const y = H / 2 + 70 * U + (i - 1) * (h + 26 * U) + (1 - q) * 60 * U;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: clamp(q / 0.3), transform: `translate3d(${(W / 2 - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px, 0) scale(${(0.94 + 0.06 * q).toFixed(4)})` }}>
            <ProofCard i={i} w={w} h={h} />
          </div>
        );
      })}
    </>
  );
};

export const Cards: React.FC = () => {
  const F = useAbs('cards');
  const film = useFilm();
  const carry = (f: number) => CARD.carry * U * CARD.decay60 ** Math.max(0, ((f - ACT.cards.from) * 60) / film.fps);
  const out = (f: number) => -CARD.exit * U * E.launchIn(prog(f, CUE.cardsOut, ACT.page.from, E.linear));
  const y = carry(F) + out(F);
  const v = Math.abs(y - (carry(F - 1) + out(F - 1)));
  const moves = [{ at: ACT.cards.from, frames: ACT.cards.dur, zoom: 1.05, ease: E.linear }];
  const nodes = tileNodes();
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <ReadBack F={F} at={copy('connect').in} out={copy('connect').out} blur={4} dim={0.35}>
      <World F={F} act="cards" moves={moves}>
        {/* the tiles keep the whole centre column clear (the line and the cards are read there): large, few, cropped by the frame edges */}
        {DEAL.cards === 'wall' && <ContentWall nodes={nodes} frame={F} start={CUE.cards} theme={INK} seed={`${TEASER.name}:wall`} tile={300 * U} cols={6} rows={3} clear={{ w: 1200 * U, h: 1400 * U }} />}
        {DEAL.cards === 'ring' && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(0, ${(140 * U).toFixed(2)}px, 0)` }}>
            <ContentRing nodes={nodes} frame={F} start={CUE.cards} theme={INK} seed={`${TEASER.name}:ring`} tile={240 * U} count={8} rx={860 * U} ry={330 * U} />
          </div>
        )}
      </World>
      <DirBlur v={v / U} axis="y" id="cards-carry">
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(0, ${y.toFixed(2)}px, 0)` }}>
          {DEAL.cards === 'stack' ? <Stack F={F} /> : <Landing F={F} scale={DEAL.cards === 'ring' ? 0.82 : 1} />}
        </div>
      </DirBlur>
      </ReadBack>
      {/* the line centred in the middle of the frame while the cards step back behind it (fx/ReadBack) */}
      <ObjectLine id="connect" text={TEASER.lines.connect} objects={slotObjects()} at={CUE.connect} frame={F} y={H / 2 + y * 0.6} color={INK.text} ground="dark" theme={INK} />
    </AbsoluteFill>
  );
};
