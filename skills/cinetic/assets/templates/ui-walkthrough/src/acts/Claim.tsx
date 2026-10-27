import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { DEAL } from '../deal';
import { AccentClaim } from '../fx/TypeClaim';
import { crispWords } from '../fx/TypePresets';
import { TypePush } from '../fx/TypePush';
import { Words } from '../fx/Words';
import { ObjectLine } from '../kit/inline';
import { E, hitPulse, lmix, prog } from '../lib/anim';
import { intoCut } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, FPS, H, W } from '../timeline';
import { WALK, withSlot } from '../walk';
import { drift, Ground, lineSize, themeOf, useAbs } from './stage';

// CLAIM - the speed claim, by the dealt device: 'accent' sets it on the accent like a poster (fx/TypeClaim: cap 16 % of
// the frame, flush left at 3 %, -0.04 em, semibold; the film's one colour event), 'push' sends the camera through the
// line on its lit ground to 2.2x onto the number it claims (fx/TypePush, bleeding off the frame), 'object' sets the
// claim's object (its glyph, at cap height) inside the line (kit ObjectLine). Every one builds on the crisp entry and
// keeps creeping; the key swells once while it is read, and a push into the claim accelerates into the zoom-through
// that opens the field.

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
  const film = { fps: FPS, width: W, height: H };
  const out = lmix(1, CLAIM_EXIT.k, intoCut(F, ACT.field.from, 30, FPS)); // the push into the cut
  const key = 0.07 * hitPulse(F - CUE.claimLight, 8, 48, FPS); // one light event under the read
  const d = drift('claim', F, 180, 0.4);
  const size = lineSize(c.text, 'display', 0.84);
  const read = numberPoint(c.text, size, W / 2, H / 2);
  const light = <AbsoluteFill style={{ background: `linear-gradient(200deg, rgba(255,255,255,${key.toFixed(3)}) 0%, rgba(255,255,255,0) 60%)` }} />;
  if (DEAL.claim === 'accent') {
    return (
      <AbsoluteFill style={{ background: C.accent, overflow: 'hidden' }}>
        {/* a 7 % linear creep over the act and the push into the cut, both grown from the flush-left margin, so no word crosses that edge */}
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${(W * 0.03).toFixed(1)}px ${H / 2}px`, transform: `scale(${(out * lmix(1, 1.07, prog(F, ACT.claim.from, ACT.field.from, E.linear))).toFixed(5)})` }}>
          <AccentClaim id="claim" text={c.text} at={c.in} frame={F} />
        </div>
        {light}
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
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(0, ${(H / 2 - (size * TYPE.display.lead) / 2).toFixed(2)}px, 0)` }}>
              <Words id="claim" text={c.text} frame={F} start={c.in} size={size} {...crispWords(film)} style={{ ...typeStyle('display', size), color: t.text }} />
            </div>
          </TypePush>
        ) : (
          <ObjectLine id="claim" text={withSlot(WALK.lines.claim)} objects={[{ kind: 'glyph', name: WALK.claimObject, variant: 'duotone', color: t.accent }]} at={c.in} frame={F} role="display" x={W / 2} y={H / 2} color={t.text} ground={t.dark ? 'dark' : 'light'} theme={t} entry="crisp" />
        )}
      </div>
      {light}
    </AbsoluteFill>
  );
};
