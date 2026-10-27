import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { Words } from '../fx/Words';
import { Photo } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { ACT, copy, CUE, f60x, H, halvesIn, W } from '../timeline';
import { EXPLAIN } from '../explain';
import { capOf, PAGE, SHOT, sentenceSize, sentenceStyle, sentenceWidth, useAbs } from './stage';

// PROMISE - a picture stands in for a word. The first half is said; the picture opens after it as a small rounded
// pill while a slow push-in runs. The second half is appended: in ONE frame the line re-centres on its new width and
// the push drops back to 1, then the push continues (expo-out to x1.21). On the last half-beat the pill grows on its
// own, ease-in, over the words, and on the act line it IS the next shot: the same picture, full bleed.

/** The pill as shares of the sentence's cap height (a 168 x 88 px pill with 22 px corners at an 80 px line). */
export const PILL = { w: 2.9, h: 1.5, r: 0.38, gap: 0.42 } as const;
/** The push before and after the re-fit, and the pill's own growth into the cut. */
const PUSH = { before: 0.07, after: 0.21, grow: 2.2 } as const;

/** The picture: a supplied file in public/ (explain.ts picture.src), or the kit's still life until then. */
export const Picture: React.FC<{ w: number; h: number; push?: number; radius?: number }> = ({ w, h, push = 0, radius = 0 }) => (
  <Photo theme={SHOT} w={w} h={h} seed={EXPLAIN.picture.seed} src={EXPLAIN.picture.src ? staticFile(EXPLAIN.picture.src) : undefined} push={push} radius={radius} />
);

export const PromiseLine: React.FC = () => {
  const F = useAbs('promise');
  const c = copy('promise');
  const [ta, tb] = EXPLAIN.lines.promise;
  const h = halvesIn(EXPLAIN.lines.promise, CUE.promise, CUE.promise2);
  const size = sentenceSize(c.text, 0.6);
  const cap = capOf(size);
  const pw = PILL.w * cap;
  const ph = PILL.h * cap;
  const gap = PILL.gap * cap;
  const wA = sentenceWidth(ta, size);
  const wB = sentenceWidth(tb, size);
  const second = F >= CUE.promise2;
  // before the re-fit: first half + pill, centred; after it: first half + pill + second half, centred (one frame)
  const total = second ? wA + gap + pw + gap + wB : wA + gap + pw;
  const x0 = (W - total) / 2;
  const pillX = x0 + wA + gap;
  const midY = H / 2;
  const pillC = { x: pillX + pw / 2, y: midY };
  const k = second ? 1 + PUSH.after * E.glideOut(prog(F, CUE.promise2, ACT.picture.from, E.linear)) : 1 + PUSH.before * E.glideOut(prog(F, c.in, CUE.promise2, E.linear));
  const open = prog(F, CUE.pill, CUE.pill + f60x(12), E.snapOut);
  const grow = mix(1, PUSH.grow, E.launchIn(prog(F, CUE.grow, ACT.picture.from, E.linear)));
  const lineTop = midY - (size * 1.2) / 2;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${pillC.x.toFixed(2)}px ${pillC.y.toFixed(2)}px`, transform: `scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: x0, top: lineTop }}>
          <Words id="promise" text={ta} frame={F} start={c.in - 1} starts={h.first.map((f) => f - 1)} size={size} dur={f60x(4)} rise={0} arriveX={0.3} style={sentenceStyle(size)} />
        </div>
        {second && (
          <div style={{ position: 'absolute', left: pillX + pw + gap, top: lineTop }}>
            <Words id="promise" text={tb} frame={F} start={h.second[0] - 1} starts={h.second.map((f) => f - 1)} size={size} dur={1} rise={(45 * U) / size} riseUnit="em" riseDur={f60x(14)} style={sentenceStyle(size)} />
          </div>
        )}
        {F >= CUE.pill && (
          <div
            data-ui
            style={{
              position: 'absolute',
              left: pillX,
              top: midY - ph / 2,
              width: pw,
              height: ph,
              borderRadius: PILL.r * cap,
              overflow: 'hidden',
              transformOrigin: '50% 50%',
              transform: `scale(${(mix(0.4, 1, open) * grow).toFixed(5)})`,
              opacity: Math.min(1, open * 3),
              boxShadow: `inset 0 0 ${(6 * U).toFixed(1)}px ${(2 * U).toFixed(1)}px ${PAGE.surface}`,
            }}
          >
            <div style={{ position: 'absolute', left: 0, top: (ph - (pw * H) / W) / 2 }}>
              <Picture w={pw} h={(pw * H) / W} />
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
