import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE, U } from '../brand/tokens';
import { PUSH, Wipe, type WipeProps } from '../fx/Wipe';
import { settleLeft, Words } from '../fx/Words';
import { shadeRgba } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { EXPLAIN } from '../explain';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, FPS, H, halvesIn, W } from '../timeline';
import { PictureShot } from './Picture';
import { ActGround, capOf, MarkWord, PAGE, sentenceSize, sentenceStyle, sentenceWidth, useAbs, useCrisp } from './stage';

// SYSTEM - the seam off the product is the dealt device (src/deal.ts):
//   wipe   the film's one soft wipe: the page comes in from the right behind a wide feathered edge that decelerates
//          (fx/Wipe feather, 350 px, 26 f); the picture is drawn under it until the wipe has finished
//   push   the push-wipe (fx/Wipe push, the measured edge path): a hard edge enters from the left pushing the picture
//          right, decelerates to just short of the frame's middle and creeps there, so the first half of the line is
//          read on the page while the picture still holds the right; on the second half the edge leaves at speed,
//          uncovering the mark and the second half; its own streak smears it only while it is fast
//   sheet  the page slides over the product from the right as a lit sheet, its shadow edge leading (E.stdInOut, 36 f)
// The line is already moving under it: the first half slides 80 px into place on the crisp entry (with the seam's
// travel) with the mark standing after it as a word, centred on the frame; the second half is appended, each word
// rising into place. Once it is whole the camera pushes in on the mark (x1.2 on E.stdInOut, landing 40 f into the
// grid); then the words fold into the mark, shrinking toward it on one curve that lands on the cut. The mark never
// moves: the next act builds the product's parts round it.

/** The mark's height as a share of the sentence's cap height, the gaps either side of it, the push on it and how much it grows as the hub. */
export const HUB = { mark: 1.3, gap: 0.42, push: 0.2, grow: 1.9 } as const;
/** The seam's length (60 fps frames): the feather and the sheet; the push-wipe's arrival and exit, and where it parks. */
const SEAM = { wipe: 26, sheet: 36, arrive: PUSH.arrive60, leave: 34, park: 0.44 } as const;

/** The system line's size: the sentence role, smaller only when a half would not fit its side of the mark. */
export const systemSize = () => {
  const [a, b2] = EXPLAIN.lines.system;
  const base = sentenceSize(`${a} ${b2}`);
  const side = W / 2 - SAFE.x - capOf(base) * (HUB.mark / 2 + HUB.gap);
  const widest = Math.max(sentenceWidth(a, base), sentenceWidth(b2, base));
  return widest > side ? (base * side) / widest : base;
};

/** The push centred on the mark once the line is whole: it carries on through the float-off and lands 40 f into the grid, so the mark alone never holds still. */
export const hubPush = (F: number) => 1 + HUB.push * prog(F, CUE.hubPush, ACT.grid.from + f60x(40), E.stdInOut);
/** The page's camera: a creep from the seam on (the read never freezes) and the push on the mark; the grid carries both on. */
export const systemK = (F: number) => hubPush(F) * creep(F, ACT.system.from, { pctPerSec: 0.015 }, FPS);

/** The dealt wipe's props (absolute frames). The push parks by the mark until the second half, then leaves. */
export const systemWipe = (): WipeProps => {
  if (DEAL.system === 'push') {
    const gap = Math.max(0, ((CUE.system2 - f60x(6) - (CUE.wipe + f60x(SEAM.arrive))) * 60) / FPS);
    return { start: CUE.wipe, kind: 'push', angle: 0, stages: [{ to: SEAM.park, frames: SEAM.arrive, gap }, { to: 1, frames: SEAM.leave, ease: E.buildIn }], id: 'the-push-wipe' };
  }
  return { start: CUE.wipe, kind: 'feather', angle: 180, frames: f60x(SEAM.wipe), id: 'the-one-wipe' };
};

export const System: React.FC = () => {
  const F = useAbs('system');
  const crisp = useCrisp();
  const c = copy('system');
  const [ta, tb] = EXPLAIN.lines.system;
  const h = halvesIn(EXPLAIN.lines.system, CUE.system, CUE.system2);
  const size = systemSize();
  const cap = capOf(size);
  const markH = cap * HUB.mark;
  const gap = cap * HUB.gap;
  const wA = sentenceWidth(ta, size);
  const lineTop = H / 2 - (size * 1.2) / 2;
  // the line arrives travelling with the seam: from the right under the wipe and the sheet, from the left under the push
  const dir = DEAL.system === 'push' ? -1 : 1;
  const slide = dir * 80 * U * settleLeft(F - c.in, f60x(26));
  const pop = prog(F, c.in, c.in + f60x(14), E.snapOut);
  const k = systemK(F);
  // once read, the words fold into the mark: they shrink toward it on one curve that lands on the cut (so nothing
  // stops at speed and the mark is never left alone), fading only once they are small
  const off = Math.min(Math.max(CUE.floatOff, c.out), ACT.grid.from - f60x(12));
  const fold = prog(F, off, ACT.grid.from, E.stdInOut);
  const gone = prog(fold, 0.55, 1, E.linear);
  const page = (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="system" />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        {F >= c.in && <MarkWord x={W / 2 + slide} y={H / 2 - cap * 0.08} size={markH} s={mix(0.7, 1, pop)} />}
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: 1 - gone, transformOrigin: `${(W / 2).toFixed(1)}px ${(H / 2).toFixed(1)}px`, transform: `scale(${(1 - 0.85 * fold).toFixed(5)})` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(W / 2 - markH / 2 - gap - wA + slide).toFixed(2)}px, ${lineTop.toFixed(2)}px, 0)` }}>
            <Words id="system" text={ta} frame={F} start={c.in - 1} {...crisp} starts={h.first.map((f) => f - 1)} arriveX={0.25 * dir} size={size} style={sentenceStyle(size)} />
          </div>
          {F >= CUE.system2 - 1 && (
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(W / 2 + markH / 2 + gap).toFixed(2)}px, ${lineTop.toFixed(2)}px, 0)` }}>
              <Words id="system" text={tb} frame={F} start={h.second[0] - 1} {...crisp} starts={h.second.map((f) => f - 1)} size={size} style={sentenceStyle(size)} />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
  if (DEAL.system === 'sheet') {
    const p = prog(F, CUE.wipe, CUE.wipe + f60x(SEAM.sheet), E.stdInOut);
    const x = W * (1 - p);
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {p < 1 && <PictureShot F={F} />}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `translate3d(${x.toFixed(2)}px, 0, 0)`, boxShadow: p < 1 ? `${(-24 * U).toFixed(1)}px 0 ${(60 * U).toFixed(1)}px ${shadeRgba(PAGE, 0.35)}` : undefined }}>
          <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(-x * 0.35).toFixed(2)}px, 0, 0)` }}>{page}</div>
        </div>
      </AbsoluteFill>
    );
  }
  // fx/Wipe stops drawing the picture on the frame the wipe has finished
  return <Wipe frame={F} {...systemWipe()} outgoing={<PictureShot F={F} />} incoming={page} />;
};
