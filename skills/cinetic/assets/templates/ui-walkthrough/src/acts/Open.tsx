import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { DEAL } from '../deal';
import { DirBlur } from '../fx/Defocus';
import { Lit } from '../fx/Lit';
import { TypePush } from '../fx/TypePush';
import { capHeight, hasLogo, Surface } from '../kit';
import { fitLine, inlineWidth, type InlineRef } from '../kit/inline';
import { E, lmix, prog } from '../lib/anim';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, f60x, H, moveOf, W } from '../timeline';
import { WALK } from '../walk';
import { CARD, InputFace } from './Card';
import { Ground, HOLD, GROUNDS, launchOut, OPEN_EXIT, themeOf, useAbs } from './stage';
import { MarkLine } from './type';

// OPEN - the promise, already moving on frame 0: one sentence that says what the product is, with the real mark of the
// product the input lives on set inside it at cap height (acts/type.tsx MarkLine: the mark is a word of the line and
// arrives on the line's dealt move). The dealt device holds it: 'line' keeps it in a slow push on its clean ground,
// 'push' sends the camera through it to 2.2x onto the mark (fx/TypePush, bleeding off the frame), 'card' sets it high
// while the input's own lit card rises into the frame from below, cropped by the bottom edge (the next act's object,
// already here). The whole frame then launches up, fastest on the cut, and the card act carries that speed.

export { OPEN_EXIT } from './stage';

/** The promise's object: the source's real mark, or a chip with its name until the mark is fetched. */
export const SOURCE: InlineRef = hasLogo(WALK.input.source) ? WALK.input.source : { kind: 'chip', label: WALK.input.sourceName, glyph: 'link' };

/** The promise's size (px) and the screen point of its object (the push's reading point) for a line centred on (W/2, y). */
const promiseLayout = (ground: 'light' | 'dark', y: number) => {
  const role = TYPE.display;
  const base = role.size * U;
  const text = WALK.lines.promise.includes('[]') ? WALK.lines.promise : `${WALK.lines.promise} []`;
  const tokens = text.split(/\s+/).filter(Boolean);
  const slot = tokens.findIndex((t) => t.includes('[]'));
  const objW = (px: number) => inlineWidth(SOURCE, capHeight(px, role.weight), ground, (t: string, s: number) => measureTracked(t, s, 600, -0.01, FONT.text)) + 0.08 * px;
  const words = (px: number, list: string[]) => measureTracked(list.map((t) => t.replace('[]', '')).join(' '), px, role.weight, role.track, FONT.text);
  const natural = words(base, tokens) + objW(base);
  const size = fitLine(base, natural, W, H);
  const full = words(size, tokens) + objW(size);
  const before = slot > 0 ? words(size, tokens.slice(0, slot)) + size * 0.28 : 0;
  return { size, read: { x: W / 2 - full / 2 + before + objW(size) / 2, y } };
};

export const Open: React.FC = () => {
  const F = useAbs('open');
  const t = themeOf('open');
  const ground = t.dark ? 'dark' : 'light';
  const c = copy('promise');
  const lineY = DEAL.open === 'card' ? H * 0.34 : H / 2;
  const L = promiseLayout(ground, lineY);
  const lift = launchOut('open', F, OPEN_EXIT.vCut); // the whole frame, ground with it
  const v = lift - launchOut('open', F - 1, OPEN_EXIT.vCut);
  const d = HOLD; // the hold rests between moves (no drift)
  // the camera is already arriving on frame 0 (a settle from 1.12x over the line's move); 'line' then keeps a slow
  // linear push under the hold (the line never parks); 'push' brings its own camera, 'card' rides the card's rise
  const kIn = lmix(1.12, 1, prog(F, 0, f60x(110), E.settleOut));
  const k = kIn * (DEAL.open === 'push' ? 1 : lmix(1, 1.06, prog(F, CUE.line, ACT.card.from, E.linear)));
  const line = (
    <MarkLine
      id="promise"
      text={WALK.lines.promise}
      objects={[SOURCE]}
      at={c.in}
      frame={F}
      move={moveOf('promise')}
      role="display"
      size={L.size}
      x={W / 2}
      y={lineY}
      color={t.text}
      accent={t.accent}
      mute={t.mute}
      ground={ground}
      theme={t}
    />
  );
  // 'card': the input's card rises into the lower third, lit and facing the camera, cropped by the bottom edge, while the line reads
  const rise = prog(F, CUE.object, CUE.object + f60x(84), E.glideOut);
  const cardTop = lmix(H + 40 * U, H * 0.62, rise);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={v / U} axis="y" id="open-launch">
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${d.x.toFixed(3)}px, ${(lift + d.y).toFixed(3)}px, 0)` }}>
          <Ground act="open" F={F} />
          {DEAL.open === 'push' ? (
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `${L.read.x.toFixed(1)}px ${lineY}px`, transform: `scale(${kIn.toFixed(5)})` }}>
              <TypePush push={{ at: CUE.push, read: [{ x: W / 2, y: lineY }, L.read], toward: { x: W / 2, y: H / 2 } }} frame={F}>
                {line}
              </TypePush>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `${(DEAL.open === 'card' ? W / 2 : L.read.x).toFixed(1)}px ${lineY}px`, transform: `scale(${k.toFixed(5)})` }}>
              {DEAL.open === 'card' && F >= CUE.object && (
                <Lit frame={F} x={W / 2} y={cardTop + CARD.h / 2} w={CARD.w} h={CARD.h} r={CARD.r} ground={GROUNDS.open.base} id="open-card">
                  <Surface theme={themeOf('card')} w={CARD.w} h={CARD.h} tone="raised" lift={4} r={CARD.r}>
                    <InputFace w={CARD.w} h={CARD.h} />
                  </Surface>
                </Lit>
              )}
              {line}
            </div>
          )}
        </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
