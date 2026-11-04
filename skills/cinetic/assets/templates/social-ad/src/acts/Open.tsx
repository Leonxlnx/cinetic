import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { fanState, pileState } from '../fx/Stack';
import { StatementLine } from '../fx/TypeStack';
import { E, lmix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { creep } from '../lib/handoff';
import { AD } from '../ad';
import { DEAL } from '../deal';
import { copy, CUE, DEALS, f60x, FPS, H, OPEN_LEAD, SPREAD, W } from '../timeline';
import { ActGround, circOut, EMPH, Item, keysFor, lineSize, lineStyle, lineWidth, PAGE, useAbs } from './stage';

// OPEN - two shots. The opener is the open slot's device (src/deal.ts), a confident line move (fx/TypePresets):
//   land  the name cuts in oversized (x1.7) and lands in 34 f, crisp as it lands; each next word is appended 12 f
//         apart, cut on solid in the accent and cooling to ink while the line re-centres (E.glideOut, 24 f)
//   build built word by word on the beat (14, 10, 10 f apart, a breath before the last word), each word cut on
//         solid in a tint of the accent, walking to the accent and darkening to ink while the line re-centres
// The line holds on a creep, then spreads apart into the cut (the spread exit: the words track apart while the camera
// zooms toward the first one), and the stack shot opens on the same outward travel: "Save" and the last word carry on
// outward either side of a hero tile of the product's own content that grows on from x0.9 (the spread's zoom carried
// on, decaying), while the stack slot's
// device builds on it:
//   pile  the product's items flicked onto it one every 6 f from beyond the upper right, each landing on an alternating tilt; once
//         the words have left, the camera pushes in on the pile
//   fan   the hero tile eases aside and the items behind it slide out the other way in 3D, tilting, smeared only
//         while fast; once the words have left, the fan closes back behind the hero tile

/** The stack's hero tile (px at 1080p is 0.48 of the frame height, 4:5) and the stack shot's push (the brand act carries it on). */
export const CARD = { h: 0.48 * H, w: 0.48 * H * 0.8 } as const;
export const stackPush = (F: number) => creep(F, CUE.pile, { pctPerSec: 0.03 }, FPS) * (DEAL.stack === 'pile' ? 1 + 0.06 * prog(F, CUE.gather, CUE.gather + f60x(40), E.stdInOut) : 1);

/**
 * The pile's deal: each card flicks in from beyond the frame's upper right (1300 px out along the pile's fan, 12 f on
 * E.snapOut, smeared by its own speed), so a card never appears on the pile from nothing: a photograph popping in at
 * 220 px reads as a one-frame flash.
 */
const PILE_DEAL = { arrivals: DEALS, drop: 1300, enter: 12 };

/** The stack at absolute frame F (the hero tile and the dealt or fanned items), centred on the frame, unpushed. */
/** The card on top of the stack at frame F (unpushed, about the frame's centre): the brand's tile device carries it across the cut. */
export const topCard = (F: number, film?: Parameters<typeof pileState>[2]) => {
  if (DEAL.stack === 'fan') {
    const c = fanState(F, { open: CUE.deal, close: CUE.gather }, film).cards[0];
    return { i: 0, x: c.x, y: c.y, rot: 0, scale: lmix(0.9, 1, prog(F, CUE.pile, CUE.pile + f60x(30), E.glideOut)) };
  }
  const p = pileState(F, PILE_DEAL, film);
  const c = p.cards[p.cards.length - 1];
  return c ? { i: c.i + 1, x: c.x, y: c.y, rot: c.rot, scale: c.scale } : { i: 0, x: 0, y: 0, rot: 0, scale: 1 };
};

export const StackPicture: React.FC<{ F: number; skipTop?: boolean }> = ({ F, skipTop = false }) => {
  const film = useFilm();
  const cardH = CARD.h;
  const cardW = CARD.w;
  const settle = lmix(0.9, 1, prog(F, CUE.pile, CUE.pile + f60x(30), E.glideOut)); // the spread's zoom carried on, decaying
  if (DEAL.stack === 'fan') {
    const fan = fanState(F, { open: CUE.deal, close: CUE.gather }, film);
    const fast = Math.abs(fan.cards[1].x - fanState(F - 1, { open: CUE.deal, close: CUE.gather }, film).cards[1].x);
    return (
      <div style={{ position: 'absolute', inset: 0, perspective: `${2200 * U}px` }}>
        <DirBlur v={fast / U} angle={180} id="fan">
          {fan.cards
            .slice()
            .reverse()
            .filter((c) => !(skipTop && c.i === 0))
            .map((c) => (
              <div key={c.i} style={{ position: 'absolute', left: W / 2 - cardW / 2, top: H / 2 - cardH / 2, zIndex: 10 + c.z, transform: `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, ${(c.z * 40 * U).toFixed(1)}px) rotateZ(${c.rotZ.toFixed(2)}deg) rotateY(${c.rotY.toFixed(2)}deg) rotateX(${c.rotX.toFixed(2)}deg) scale(${(c.scale * (c.i === 0 ? settle : 1)).toFixed(5)})` }}>
                <Item i={c.i} w={cardW} h={cardH} lift={c.i === 0 ? 30 : 18} />
              </div>
            ))}
        </DirBlur>
      </div>
    );
  }
  const pile = pileState(F, PILE_DEAL, film);
  const fast = pile.cards.reduce((m, c) => Math.max(m, Math.abs(c.v)), 0);
  return (
    <>
      <div style={{ position: 'absolute', left: W / 2, top: H / 2, transform: `scale(${settle.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: -cardW / 2, top: -cardH / 2 }}>
          <Item i={0} w={cardW} h={cardH} lift={24} />
        </div>
      </div>
      <DirBlur v={fast / U} angle={pile.angle} id="pile">
        {pile.cards.filter((_, k) => !(skipTop && k === pile.cards.length - 1)).map((c) => (
          <div key={c.i} style={{ position: 'absolute', left: W / 2 - cardW / 2, top: H / 2 - cardH / 2, opacity: c.opacity, transform: `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) rotate(${c.rot.toFixed(3)}deg) scale(${c.scale.toFixed(5)})` }}>
            <Item i={c.i + 1} w={cardW} h={cardH} lift={18} />
          </div>
        ))}
      </DirBlur>
    </>
  );
};

/**
 * "Save" and the last word either side of the stack at absolute frame F: they carry on outward from the spread
 * (decaying), and once read they leave outward at full ink, accelerating (E.launchIn, 16 f), so the stack holds the
 * frame alone. When their read ends on the open's last bar the leave starts on the cut and the brand act draws it: the
 * words cross the seam moving, never vanishing on it.
 */
export const SaveWords: React.FC<{ F: number }> = ({ F }) => {
  if (F < CUE.pile || F >= CUE.saveOut + f60x(16)) return null;
  const [left, right] = AD.lines.save;
  const size = lineSize(copy('what').text, 0.66);
  const cardW = CARD.w;
  const carry = 140 * U * circOut((F - CUE.pile) / f60x(72));
  const ink = mixColor(PAGE.mute, PAGE.text, prog(F, CUE.pile, CUE.pile + f60x(12), E.softOut));
  const gap = 90 * U;
  const away = 0.5 * W * prog(F, CUE.saveOut, CUE.saveOut + f60x(16), E.launchIn);
  return (
    <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.05) / 2, width: W, height: size * 1.1 }}>
      <span data-text="save" style={{ ...lineStyle(size, ink), position: 'absolute', left: 0, top: 0, transform: `translate3d(${(W / 2 - cardW / 2 - gap - carry - away - lineWidth(left, size)).toFixed(2)}px, 0, 0)` }}>{left}</span>
      {/* the second word takes the film's emphasis when its deal gives the line one (the accent colour), else the first word's ink (it is placed from its left edge) */}
      <span data-text="save" style={{ ...lineStyle(size, EMPH.save ? mixColor(PAGE.mute, PAGE.accent, prog(F, CUE.pile, CUE.pile + f60x(12), E.softOut)) : ink), position: 'absolute', left: 0, top: 0, transform: `translate3d(${(W / 2 + cardW / 2 + gap + carry + away).toFixed(2)}px, 0, 0)` }}>{right}</span>
    </div>
  );
};

export const Open: React.FC = () => {
  const F = useAbs('open');
  const what = copy('what');
  const whatSpec = { emph: EMPH.what, keys: keysFor('what', what.text) };
  // the opener is the film's first statement: one centred line on the film's open (fx/TypeStack StatementLine; a film
  // that makes it its one stack passes `stack`), at the line role's size
  const size = lineSize(what.text, 0.66); // one line, fitted to the frame
  const k = creep(F, what.in, { pctPerSec: 0.02 }, FPS);
  // shot 2: the stack and its two words
  const push = stackPush(F);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="open" />
      {F < CUE.pile && F >= what.in - 1 && (
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${k.toFixed(5)})` }}>
          <StatementLine
            spec={{ preset: DEAL.open, text: what.text, at: what.in - 1, lead: OPEN_LEAD, out: CUE.pile - f60x(SPREAD), exit: 'spread', colors: { ink: PAGE.text, accent: PAGE.accent, mute: PAGE.mute }, id: 'what', ...whatSpec }}
            frame={F}
            size={size}
            y={H / 2}
          />
        </div>
      )}
      {F >= CUE.pile && (
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${push.toFixed(5)})` }}>
          <StackPicture F={F} />
          <SaveWords F={F} />
        </div>
      )}
    </AbsoluteFill>
  );
};
