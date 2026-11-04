import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { Defocus, SpinBlur } from '../fx/Defocus';
import { SPIN_IN, spinInState } from '../fx/Wordmark';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { AD } from '../ad';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { CARD, SaveWords, StackPicture, stackPush, topCard } from './Open';
import { ActGround, Item, launchOffset, MarkAt, PAGE, SEAM, useAbs } from './stage';

// BRAND - the mark. The brand slot's device (src/deal.ts):
//   spin  the stack carries on receding behind it into the far plane (x0.6, a 6 px defocus, E.glideOut over 40 f:
//         the seam is the stack's own scale); the mark spins in from x2.06 over more than a turn, its rotation
//         settling before its scale (fx/Wordmark spinInState, smeared by fx/Defocus SpinBlur only while it turns
//         fast), then steps aside while the name slides out from behind it
//   tile  the stack's top card carries across the cut (the rest of the stack recedes behind it) and grows into the
//         app's own tile (E.glideOut, 30 f), its content giving way to the accent and the mark in 14 f; it steps aside
//         and the name slides out from behind it
// On its last frames the lockup launches upward (lib/handoff launch): the cut into the field carries that speed.

export const LOCK = { mark: 190, tile: 240, name: 150, gap: 0.32 } as const;

/** The lockup's geometry: the mark's centre at rest and the name's left edge, for a name at the display weight. */
export const lockupGeometry = (name: string, cy: number, mark = LOCK.mark * U) => {
  const size = LOCK.name * U;
  const gap = size * LOCK.gap;
  const nameW = measureTracked(name, size, TYPE.display.weight, TYPE.display.track, FONT.text, { trailing: false });
  const left = (W - (mark + gap + nameW)) / 2;
  return { mark, size, gap, nameW, cx: left + mark / 2, cy, nameLeft: left + mark + gap, room: -(gap + nameW) / 2 };
};

/** The name sliding out from behind the mark (clipped at the mark's centre), at the display role. */
const SlidingName: React.FC<{ name: string; id: string; x: number; cy: number; size: number; hide: number; opacity: number; color: string }> = ({ name, id, x, cy, size, hide, opacity, color }) => (
  <div data-text={id} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x.toFixed(2)}px, ${(cy - size * 0.56).toFixed(2)}px, 0)`, clipPath: `inset(-20% -5% -30% ${Math.max(0, hide).toFixed(2)}px)`, opacity, fontFamily: FONT.text, fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color }}>
    {name}
  </div>
);

/** The mark spinning in, aside, and the name sliding out from behind it (the end card's spin uses it too). */
export const SpunLockup: React.FC<{ F: number; at: number; name: string; id: string; cy: number; color: string }> = ({ F, at, name, id, cy, color }) => {
  const g = lockupGeometry(name, cy);
  const s = spinInState(F, { at, room: g.room / U }, useFilm());
  if (!s.shown) return null;
  const mx = W / 2 + s.x;
  const nameX = g.nameLeft - (SPIN_IN.slide * U - s.name.x);
  return (
    <>
      {s.name.shown && <SlidingName name={name} id={id} x={nameX} cy={cy} size={g.size} hide={mx - nameX} opacity={s.name.opacity} color={color} />}
      <SpinBlur omega={s.omega} cx={mx} cy={cy}>
        <MarkAt x={mx} y={cy} size={g.mark} s={s.scale} rot={s.rot} />
      </SpinBlur>
    </>
  );
};

/** The hero tile becoming the app's tile with the mark on it, stepping aside, the name sliding out. */
const TileLockup: React.FC<{ F: number; name: string; id: string; cy: number }> = ({ F, name, id, cy }) => {
  const film = useFilm();
  const tile = LOCK.tile * U;
  const g = lockupGeometry(name, cy, tile);
  const k0 = stackPush(ACT.brand.from);
  const grow = prog(F, ACT.brand.from, ACT.brand.from + f60x(30), E.glideOut);
  const face = prog(F, ACT.brand.from + f60x(4), ACT.brand.from + f60x(18), E.stdInOut);
  const s = spinInState(F, { at: ACT.brand.from + f60x(10), room: g.room / U, turns: 0, from: 1 }, film);
  // the stack's top card as the open left it (its place, tilt and size under the stack's push) grows into the app tile
  const top = topCard(ACT.brand.from - 1, film);
  const w = lmix(CARD.w * k0 * top.scale, tile, grow);
  const h = lmix(CARD.h * k0 * top.scale, tile, grow);
  const r = mix(Math.min(CARD.w, CARD.h) * 0.13 * k0, tile * 0.23, grow);
  const mx = W / 2 + top.x * k0 * (1 - grow) + s.x;
  const my = cy + top.y * k0 * (1 - grow);
  const rot = top.rot * (1 - grow);
  const nameX = g.nameLeft - (SPIN_IN.slide * U - s.name.x);
  return (
    <>
      {s.name.shown && <SlidingName name={name} id={id} x={nameX} cy={cy} size={g.size} hide={mx - nameX} opacity={s.name.opacity} color={PAGE.text} />}
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${(mx - w / 2).toFixed(2)}px, ${(my - h / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`, borderRadius: r, overflow: 'hidden', boxShadow: `0 ${(18 * U).toFixed(1)}px ${(40 * U).toFixed(1)}px rgba(0,0,0,${(0.16 * (1 - 0.4 * grow)).toFixed(3)})` }}>
        {face < 1 && (
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${(w / CARD.w).toFixed(5)}, ${(h / CARD.h).toFixed(5)})` }}>
            <Item i={top.i} w={CARD.w} h={CARD.h} lift={0} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: PAGE.accent, opacity: face }}>
          <MarkAt x={w / 2} y={h / 2} size={tile * 0.56} fill={PAGE.accentInk} s={mix(0.8, 1, face)} />
        </div>
      </div>
    </>
  );
};

export const Brand: React.FC = () => {
  const F = useAbs('brand');
  const nm = copy('brandName');
  const rise = launchOffset(F, ACT.field.from - 1, -SEAM.v * U); // the lockup launches up into the cut
  const recede = prog(F, ACT.brand.from, ACT.brand.from + f60x(40), E.glideOut);
  const k = lmix(stackPush(ACT.brand.from), 0.6, recede) * (1 - 0.01 * Math.max(0, F - ACT.brand.from - f60x(40)) / 60);
  // photographs behind the name are busier than tiles: the far plane goes softer and quieter so the lockup reads
  const photos = (AD.pictures as readonly string[]).length > 0;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      {/* the open's ground carried across the morph, the brand's own rising over it (24 f): no ground flips on the cut */}
      <ActGround F={F} act="open" />
      <div style={{ position: 'absolute', inset: 0, opacity: prog(F, ACT.brand.from, ACT.brand.from + f60x(24), E.stdInOut) }}>
        <ActGround F={F} act="brand" />
      </div>
      {(
        // the stack, as the open left it, carried on into the far plane: smaller, softer, rising with the lockup at its
        // weight (the tile device's top card is drawn by the lockup: it carries across)
        <div style={{ position: 'absolute', inset: 0, opacity: clamp(1 - (photos ? 0.6 : 0.25) * recede), transformOrigin: '50% 50%', transform: `translate3d(0, ${(rise * 0.4).toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>
          <Defocus sigma={(photos ? 10 : 6) * U * recede}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <StackPicture F={ACT.brand.from - 1} skipTop={DEAL.brand === 'tile'} />
            </div>
          </Defocus>
        </div>
      )}
      {/* the stack's two words, when their leave starts on the cut, cross it moving (at the open's last push) */}
      {F < CUE.saveOut + f60x(16) && (
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${stackPush(ACT.brand.from - 1).toFixed(5)})` }}>
          <SaveWords F={F} />
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `translate3d(0, ${rise.toFixed(2)}px, 0) scale(${creep(F, ACT.brand.from, { pctPerSec: 0.015 }, FPS).toFixed(5)})` }}>
        {DEAL.brand === 'spin' ? <SpunLockup F={F} at={CUE.mark} name={nm.text} id="brandName" cy={H / 2} color={PAGE.text} /> : <TileLockup F={F} name={nm.text} id="brandName" cy={H / 2} />}
      </div>
    </AbsoluteFill>
  );
};
