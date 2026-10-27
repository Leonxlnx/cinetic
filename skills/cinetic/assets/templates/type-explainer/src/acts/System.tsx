import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE, U } from '../brand/tokens';
import { Wipe } from '../fx/Wipe';
import { settleLeft, Words } from '../fx/Words';
import { E, mix, prog } from '../lib/anim';
import { copy, CUE, f60x, H, halvesIn, W } from '../timeline';
import { EXPLAIN } from '../explain';
import { PictureShot } from './Picture';
import { capOf, MarkWord, PAGE, sentenceSize, sentenceStyle, sentenceWidth, useAbs } from './stage';

// SYSTEM - the film's one soft wipe: white comes in from the right behind a wide feathered edge that decelerates
// (fx/Wipe feather, 350 px), and the line is already moving under it. The first half slides 80 px into place with the
// mark standing after it as a word, centred on the frame; after a pause the second half is appended (each word cut
// on and rising 45 px, a few frames apart). A slow push centred on the mark; then the words float up on an ease-in and
// are gone in 8 f. The mark never moves: the next act builds the product's parts round it.

/** The mark's height as a share of the sentence's cap height, and the gaps either side of it. */
export const HUB = { mark: 1.3, gap: 0.42, push: 0.05 } as const;

/** The system line's size: the sentence role, smaller only when a half would not fit its side of the mark. */
export const systemSize = () => {
  const [a, b2] = EXPLAIN.lines.system;
  const base = sentenceSize(`${a} ${b2}`);
  const side = W / 2 - SAFE.x - capOf(base) * (HUB.mark / 2 + HUB.gap);
  const widest = Math.max(sentenceWidth(a, base), sentenceWidth(b2, base));
  return widest > side ? (base * side) / widest : base;
};

/** The push centred on the mark (the grid act starts where it ends). */
export const hubPush = (F: number) => 1 + HUB.push * E.stdInOut(prog(F, CUE.hubPush, CUE.floatOff + f60x(20), E.linear));

export const System: React.FC = () => {
  const F = useAbs('system');
  const c = copy('system');
  const [ta, tb] = EXPLAIN.lines.system;
  const h = halvesIn(EXPLAIN.lines.system, CUE.system, CUE.system2);
  const size = systemSize();
  const cap = capOf(size);
  const markH = cap * HUB.mark;
  const gap = cap * HUB.gap;
  const wA = sentenceWidth(ta, size);
  const lineTop = H / 2 - (size * 1.2) / 2;
  const slide = 80 * U * settleLeft(F - c.in, f60x(26));
  const pop = prog(F, c.in, c.in + f60x(10), E.snapOut);
  const k = hubPush(F);
  const float = prog(F, CUE.floatOff, CUE.floatOff + f60x(14), E.buildIn);
  const gone = prog(F, CUE.floatOff + f60x(6), CUE.floatOff + f60x(14), E.linear);
  const page = (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        {F >= c.in && <MarkWord x={W / 2 + slide} y={H / 2} size={markH} s={mix(0.7, 1, pop)} />}
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: 1 - gone, transform: `translate3d(0, ${(-60 * U * float).toFixed(2)}px, 0)` }}>
          <div style={{ position: 'absolute', left: W / 2 - markH / 2 - gap - wA + slide, top: lineTop }}>
            <Words id="system" text={ta} frame={F} start={c.in - 1} starts={h.first.map((f) => f - 1)} size={size} dur={f60x(4)} rise={0} style={sentenceStyle(size)} />
          </div>
          {F >= CUE.system2 && (
            <div style={{ position: 'absolute', left: W / 2 + markH / 2 + gap, top: lineTop }}>
              <Words id="system" text={tb} frame={F} start={h.second[0] - 1} starts={h.second.map((f) => f - 1)} size={size} dur={1} rise={(45 * U) / size} riseUnit="em" riseDur={f60x(14)} style={sentenceStyle(size)} />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
  return <Wipe frame={F} start={CUE.wipe} kind="feather" angle={180} frames={f60x(26)} outgoing={<PictureShot F={F} />} incoming={page} />;
};
