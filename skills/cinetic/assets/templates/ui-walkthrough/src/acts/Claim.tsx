import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT, TYPE } from '../brand/tokens';
import { DEAL } from '../deal';
import { AccentClaim } from '../fx/TypeClaim';
import { TypePush } from '../fx/TypePush';
import { E, lmix, prog } from '../lib/anim';
import { intoCut } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, FPS, H, moveOf, W } from '../timeline';
import { WALK, withSlot } from '../walk';
import { Ground, HOLD, lineSize, themeOf, useAbs } from './stage';
import { HeroLine, MarkLine } from './type';

// CLAIM - the speed claim, by the dealt device: 'accent' sets it on the accent like a poster (fx/TypeClaim: cap 16 % of
// the frame, flush left at 3 %, -0.04 em, semibold; the film's one colour event), 'push' sends the camera through the
// line on its lit ground to 2.2x onto the number it claims (fx/TypePush, bleeding off the frame), 'object' sets the
// claim's object (its glyph, at cap height) inside the line (acts/type.tsx MarkLine). The poster builds on the crisp
// entry, the other two on the line's dealt move; every one keeps creeping, and a push into the claim accelerates into
// the zoom-through that opens the field. No light is laid over the type: the ground's own key carries the light.

/** The zoom into the field: the claim's scale on the cut (the field opens settling from it). */
export const CLAIM_EXIT = { k: 1.35 } as const;

/** The reading point of the claim's number (the word with a digit, else its last word), centred on (cx, cy). */
const numberPoint = (text: string, size: number, cx: number, cy: number) => {
  const words = text.split(/\s+/);
  const i = Math.max(0, words.findIndex((w) => /\d/.test(w)) >= 0 ? words.findIndex((w) => /\d/.test(w)) : words.length - 1);
  const role = TYPE.display;
  const m = (s: string) => measureTracked(s, size, role.weight, role.track, FONT.text);
  const full = m(text);
  const before = i ? m(`${words.slice(0, i).join(' ')} `) : 0;
  return { x: cx - full / 2 + before + m(words[i]) / 2, y: cy };
};

export const Claim: React.FC = () => {
  const F = useAbs('claim');
  const t = themeOf('claim');
  const c = copy('claim');
  const out = lmix(1, CLAIM_EXIT.k, intoCut(F, ACT.field.from, 30, FPS)); // the push into the cut
  const d = HOLD; // the hold rests between moves (no drift)
  const size = lineSize(c.text, 'display', 0.84);
  const read = numberPoint(c.text, size, W / 2, H / 2);
  if (DEAL.claim === 'accent') {
    return (
      <AbsoluteFill style={{ background: C.accent, overflow: 'hidden' }}>
        {/* a 7 % linear creep over the act and the push into the cut, both grown from the flush-left margin, so no word crosses that edge */}
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${(W * 0.03).toFixed(1)}px ${H / 2}px`, transform: `scale(${(out * lmix(1, 1.07, prog(F, ACT.claim.from, ACT.field.from, E.linear))).toFixed(5)})` }}>
          <AccentClaim id="claim" text={c.text} at={c.in} frame={F} />
        </div>
      </AbsoluteFill>
    );
  }
  const k = DEAL.claim === 'object' ? lmix(1, 1.08, prog(F, c.resolved, ACT.field.from, E.linear)) : 1;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Ground act="claim" F={F} />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${read.x.toFixed(1)}px ${H / 2}px`, transform: `translate3d(${d.x.toFixed(3)}px, ${d.y.toFixed(3)}px, 0) scale(${(out * k).toFixed(5)})` }}>
        {DEAL.claim === 'push' ? (
          <TypePush push={{ at: CUE.claimPush, read: [{ x: W / 2, y: H / 2 }, read], toward: { x: W * 0.46, y: H / 2 } }} frame={F}>
            <HeroLine id="claim" text={c.text} at={c.in} frame={F} move={moveOf('claim')} role="display" size={size} x={W / 2} y={H / 2} color={t.text} accent={t.accent} mute={t.mute} />
          </TypePush>
        ) : (
          <MarkLine id="claim" text={withSlot(WALK.lines.claim)} objects={[{ kind: 'glyph', name: WALK.claimObject, variant: 'duotone', color: t.accent }]} at={c.in} frame={F} move={moveOf('claim')} role="display" size={size} x={W / 2} y={H / 2} color={t.text} accent={t.accent} mute={t.mute} ground={t.dark ? 'dark' : 'light'} theme={t} />
        )}
      </div>
    </AbsoluteFill>
  );
};
