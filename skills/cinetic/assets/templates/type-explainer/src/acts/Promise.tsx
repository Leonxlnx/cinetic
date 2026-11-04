import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { settleLeft, Words } from '../fx/Words';
import { AppIcon, GlyphTile, shadeRgba } from '../kit';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { camera } from '../lib/camera';
import { EXPLAIN } from '../explain';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, H, halvesIn, W } from '../timeline';
import { ProductScene } from './product';
import { ActGround, capOf, PAGE, sentenceSize, sentenceStyle, sentenceWidth, useAbs, useCrisp } from './stage';

// PROMISE - the product stands in the line as a word (kit/inline.tsx's grammar: an object at cap height inside the
// sentence). The first half is said on the crisp entry, carried in from the left; the slot opens after it; the
// second half is appended, each word rising into place, while the line re-centres on a 16 f glide (no one-frame
// re-fit) under a slow push. The slot's device (src/deal.ts):
//   pill  the slot opens as a 16:9 pill holding the product (acts/product.tsx at a fraction of its size), and on the
//         last half-beat the pill grows on its own over the words, ease-in, until it IS the next shot
//   roll  the slot first rolls through the products it works with as app icons (explain.ts integrations; without
//         them the product's own parts as glyph tiles), one every 26 f, each roll 8 f on E.snapOut clipped to the
//         slot; the pill rolls in last and grows into the next shot
//   lens  the pill opens; on the last half-beat the camera pushes through the line into it (a zoom-through: the
//         type crosses the frame's edges and the pill fills it)

/** The pill as shares of the sentence's cap height (16:9, so it fills the frame when it grows), and the gaps beside it. */
export const PILL = { w: 3.2, h: 1.8, r: 0.4, gap: 0.42 } as const;
/** Frames (60 fps) between the slot's rolls, and one roll. */
const ROLL = { every: 26, swap: 8 } as const;

type Obj = { kind: 'logo'; logo: string } | { kind: 'glyph'; i: number } | { kind: 'pill' };
const OBJS: Obj[] =
  DEAL.promise === 'roll'
    ? [...(EXPLAIN.integrations.length >= 2 ? EXPLAIN.integrations.slice(0, 3).map((logo): Obj => ({ kind: 'logo', logo })) : [0, 1, 2].map((i): Obj => ({ kind: 'glyph', i }))), { kind: 'pill' }]
    : [{ kind: 'pill' }];

/** The frames the slot rolls on: they fill the slot's time, the pill rolling in last just before the second half arrives (sync reads them). */
export const ROLLS = OBJS.slice(1).map((_, i) => CUE.pill + Math.max(f60x(ROLL.every), (CUE.promise2 - CUE.pill - f60x(10)) / Math.max(1, OBJS.length - 1)) * (i + 1));

/** The product moment drawn to cover a w x h box with corner radius r (the scene is the full frame, scaled; looking into it while the box is small). */
export const ProductIn: React.FC<{ F: number; w: number; h: number; r: number; look?: number }> = ({ F, w, h, r, look }) => {
  // small, the pill looks into the screen (x1.7, so it reads as the product's own light UI, not a dark box); as it
  // grows to the frame the view pulls back to the whole shot, exactly the next shot's first frame at full size
  const fill = Math.max(w / W, h / H);
  const s = fill * (look ?? lmix(1.7, 1, Math.sqrt(clamp(fill))));
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: r, overflow: 'hidden', boxShadow: `0 ${(8 * U).toFixed(1)}px ${(22 * U).toFixed(1)}px ${shadeRgba(PAGE, 0.2)}` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${((w - W * s) / 2).toFixed(2)}px, ${((h - H * s) / 2).toFixed(2)}px) scale(${s.toFixed(5)})` }}>
        <ProductScene F={F} />
      </div>
    </div>
  );
};

export const PromiseLine: React.FC = () => {
  const F = useAbs('promise');
  const crisp = useCrisp();
  const c = copy('promise');
  const [ta, tb] = EXPLAIN.lines.promise;
  const h = halvesIn(EXPLAIN.lines.promise, CUE.promise, CUE.promise2);
  const cut = ACT.picture.from;
  const size = sentenceSize(c.text, 0.66);
  const cap = capOf(size);
  const pw = PILL.w * cap;
  const ph = PILL.h * cap;
  const gap = PILL.gap * cap;
  const tile = cap * 1.6;
  const widths = OBJS.map((o) => (o.kind === 'pill' ? pw : tile));
  const rolls = ROLLS;
  const idx = rolls.filter((r) => F >= r).length;
  const q = idx > 0 ? prog(F, rolls[idx - 1], rolls[idx - 1] + f60x(ROLL.swap), E.snapOut) : 1;
  const open = prog(F, CUE.pill, CUE.pill + f60x(16), E.snapOut);
  const slotW = F < CUE.pill ? 0 : idx > 0 ? mix(widths[idx - 1], widths[idx], q) : widths[0] * open;
  const wA = sentenceWidth(ta, size);
  const wB = sentenceWidth(tb, size);
  const second = prog(F, CUE.promise2 - 1, CUE.promise2 - 1 + f60x(16), E.glideOut); // the re-centre glides
  const total = wA + gap * open + slotW + (gap + wB) * second;
  const carry = -150 * U * settleLeft(F - c.in, f60x(26)); // in from the left at the last line's exit speed, decaying
  const x0 = (W - total) / 2 + carry;
  const slotX = x0 + wA + gap * open;
  const midY = H / 2;
  const lineTop = midY - (size * 1.2) / 2;
  const slotC = { x: slotX + slotW / 2, y: midY - cap * 0.06 };
  // the slow push about the slot, all act long (one continuous curve: no drop at the second half)
  const push = lmix(1, 1.28, prog(F, c.in, cut, E.softOut));
  // lens: from the grow cue the camera pushes through the line into the pill until the pill covers the frame
  const lensP = DEAL.promise === 'lens' ? prog(F, CUE.grow - f60x(10), cut - 1, E.buildIn) : 0;
  const kEnd = Math.max(W / pw, H / ph);
  const k = DEAL.promise === 'lens' && lensP > 0 ? lmix(push, kEnd, lensP) : push;
  const shot = { ax: slotC.x, ay: slotC.y, sx: mix(slotC.x, W / 2, lensP), sy: mix(slotC.y, H / 2, lensP), k };
  // pill and roll: the pill grows on its own from its place in the line to the full frame, ease-in, into the cut
  const grow = DEAL.promise === 'lens' ? 0 : prog(F, CUE.grow - f60x(8), cut - 1, E.buildIn);
  const pillOn = OBJS[idx].kind === 'pill';
  const inLine = { x: slotC.x - (pw * push) / 2, y: slotC.y - (ph * push) / 2, w: pw * push, h: ph * push };
  // the size grows in log space (one perceived speed) and the centre travels with it to the frame's centre
  const gw = lmix(inLine.w, W, grow);
  const gh = lmix(inLine.h, H, grow);
  const gs = (gw - inLine.w) / Math.max(1, W - inLine.w);
  const rect = { x: mix(slotC.x, W / 2, gs) - gw / 2, y: mix(slotC.y, H / 2, gs) - gh / 2, w: gw, h: gh };
  const pitch = Math.max(ph, tile) * 1.15;
  const rollY = idx > 0 ? (1 - q) * pitch : 0;
  const rollLeave = idx > 0 && q < 1 ? -q * pitch : null;
  const slotBox = { y0: midY - pitch / 2, y1: midY + pitch / 2 };
  const objAt = (o: Obj, w: number) =>
    o.kind === 'logo' ? <AppIcon logo={o.logo} size={w} theme={PAGE} lift={8} /> : o.kind === 'glyph' ? <GlyphTile theme={PAGE} name={EXPLAIN.modules[o.i].glyph} size={w} solid /> : null;
  const pillScale = OBJS.length === 1 ? mix(0.4, 1, open) : 1;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="promise" />
      <div style={{ ...camera(shot), width: W, height: H }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x0.toFixed(2)}px, ${lineTop.toFixed(2)}px, 0)` }}>
          <Words id="promise" text={ta} frame={F} start={c.in - 1} {...crisp} starts={h.first.map((f) => f - 1)} arriveX={-0.3} size={size} style={sentenceStyle(size)} />
        </div>
        {F >= CUE.promise2 - 1 && (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(slotX + slotW + gap).toFixed(2)}px, ${lineTop.toFixed(2)}px, 0)` }}>
            <Words id="promise" text={tb} frame={F} start={h.second[0] - 1} {...crisp} starts={h.second.map((f) => f - 1)} size={size} style={sentenceStyle(size)} />
          </div>
        )}
        {/* the slot's strip: the objects before the pill roll through it, clipped to the slot */}
        {F >= CUE.pill && !pillOn && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `inset(${slotBox.y0.toFixed(2)}px 0 ${(H - slotBox.y1).toFixed(2)}px 0)` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, opacity: clamp(open * 3), transform: `translate3d(${(slotC.x - tile / 2).toFixed(2)}px, ${(midY - tile / 2 + rollY).toFixed(2)}px, 0) scale(${(idx === 0 ? mix(0.6, 1, open) : 1).toFixed(4)})` }}>
              {objAt(OBJS[idx], tile)}
            </div>
            {rollLeave !== null && idx > 0 && OBJS[idx - 1].kind !== 'pill' && (
              <div style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - 0.5 * q, transform: `translate3d(${(slotC.x - tile / 2).toFixed(2)}px, ${(midY - tile / 2 + rollLeave).toFixed(2)}px, 0)` }}>{objAt(OBJS[idx - 1], tile)}</div>
            )}
          </div>
        )}
        {/* lens: the pill lives in the line's world, and the camera goes through it */}
        {pillOn && DEAL.promise === 'lens' && (
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: clamp(open * 3), transformOrigin: '50% 50%', transform: `translate3d(${(slotC.x - pw / 2).toFixed(2)}px, ${(slotC.y - ph / 2).toFixed(2)}px, 0) scale(${pillScale.toFixed(4)})` }}>
            <ProductIn F={F} w={pw} h={ph} r={PILL.r * cap * (1 - lensP) ** 2} look={lmix(1.7, 1, lensP)} />
          </div>
        )}
      </div>
      {/* pill and roll: the pill in screen space, rolling in (roll), opening (pill), then growing into the next shot */}
      {pillOn && DEAL.promise !== 'lens' && (
        <div style={{ position: 'absolute', inset: 0, clipPath: idx > 0 && q < 1 ? `inset(${(slotC.y - (pitch * push) / 2).toFixed(2)}px 0 ${(H - slotC.y - (pitch * push) / 2).toFixed(2)}px 0)` : undefined }}>
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: OBJS.length === 1 ? clamp(open * 3) : 1, transformOrigin: '50% 50%', transform: `translate3d(${rect.x.toFixed(2)}px, ${(rect.y + rollY * push).toFixed(2)}px, 0) scale(${pillScale.toFixed(4)})` }}>
            <ProductIn F={F} w={rect.w} h={rect.h} r={PILL.r * cap * push * (1 - grow)} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
