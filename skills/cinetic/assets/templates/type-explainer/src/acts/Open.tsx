import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { bandFill, clipText } from '../fx/HueSweep';
import { exitDistanceEm, settleLeft, Words } from '../fx/Words';
import { E, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { fitSize, measureTracked } from '../lib/measure';
import { ACT, copy, CUE, f60x, FPS, H, speechStarts, W } from '../timeline';
import { Cam, capOf, MarkWord, PAGE, sentenceSize, sentenceStyle, useAbs } from './stage';

// OPEN - two shots. The name drops in as one giant word, decelerating, while a band of the accent runs through it from
// left to right (it never finishes: the mark does). On the mark's frame the name is re-set at three quarters of its
// size in ink, the mark pops in after it as the next word, and the two glide left by different amounts so the gap
// closes; they accelerate left into a cut at speed. What the product is, built word by word at the pace of speech:
// each word lands a little right of its slot and settles home while the whole line drifts left on the same curve;
// the camera eases in a little once it is whole; it leaves right, accelerating, its words gone last to first on the
// final frames.

/** The giant name's size: the giant role's look at up to 560 px, fitted to 78 % of the width. */
const giantSize = (text: string) => Math.min(560 * U, fitSize(text, W * 0.78, 560 * U, TYPE.giant.weight, TYPE.giant.track));
/** The name re-set when the mark arrives (one frame, no tween), and the glide that closes the gap (px at 1080p). */
export const RESET = 0.75;
const GLIDE = { name: 70, mark: 100 } as const;

export const Open: React.FC = () => {
  const F = useAbs('open');
  const name = copy('name');
  const what = copy('what');
  const g0 = giantSize(name.text);
  const reset = F >= CUE.mark;
  const gs = reset ? g0 * RESET : g0;
  const wName = measureTracked(name.text, gs, TYPE.giant.weight, TYPE.giant.track, undefined, { trailing: false });
  const markH = capOf(gs) * 1.3;
  const gapF = capOf(gs) * 0.28;
  // the giant word drops in from above on an exponential (90 % home in 24 f: under 20 px/f from its first frame)
  const drop = -200 * U * settleLeft(F - CUE.giant, f60x(24));
  // the band: tail and head as shares of the word's width, travelling until the mark's frame
  const bt = prog(F, CUE.giant, CUE.mark, E.linear);
  const fill = bandFill({ tail: wName * mix(0.11, 0.53, bt), head: wName * mix(0.5, 1.02, bt), edge: 120 * U, ink: PAGE.text, band: PAGE.accent });
  // after the mark: the pair centred with the gap closed; each starts its own glide distance right of home
  const total = wName + gapF + markH;
  const left = (W - total) / 2;
  const glide = settleLeft(F - CUE.mark, f60x(30));
  const pop = prog(F, CUE.mark, CUE.mark + f60x(10), E.snapOut);
  // the pair accelerates left into the cut: its fastest frame stays under 20 px/f for the type
  const outF = CUE.what - CUE.glide;
  const dist = exitDistanceEm('launch', E.launchIn, outF, gs, U) * gs;
  const away = -dist * E.launchIn(prog(F, CUE.glide, CUE.what, E.linear));
  const nameX = (reset ? left + GLIDE.name * U * glide : (W - wName) / 2) + (reset ? away : 0);
  const markX = left + wName + gapF + markH / 2 + GLIDE.mark * U * glide + away;
  const midY = H / 2 + drop;
  // shot 2: what it is, said
  const size = sentenceSize(what.text);
  const n = what.text.trim().split(/\s+/).length;
  const starts = speechStarts(what.in - 1, n); // the first word shows on the cut frame itself
  const build = starts[n - 1] - starts[0];
  const drift = 55 * U * settleLeft(F - what.in, build + f60x(28));
  const cut = ACT.pain.from;
  const vanish = (i: number) => cut - Math.round((i / Math.max(1, n - 1)) * (cut - CUE.vanish)); // the last word goes first, the first on the cut
  const k = creep(F, CUE.what, { pctPerSec: 0.012 }, FPS) * (1 + 0.03 * E.stdInOut(prog(F, CUE.whatPush, CUE.exitWhat + f60x(20), E.linear)));
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      {F < CUE.what && (
        <>
          <div style={{ position: 'absolute', left: 0, top: midY - gs * 0.56, transform: `translate3d(${nameX.toFixed(2)}px, 0, 0)` }}>
            <span data-text="name" style={{ ...typeStyle('giant', gs), lineHeight: 1, ...(reset ? { color: PAGE.text } : clipText(fill)) }}>
              {name.text}
            </span>
          </div>
          {reset && <MarkWord x={markX} y={midY - capOf(gs) * 0.08} size={markH} s={mix(0.55, 1, pop)} />}
        </>
      )}
      {F >= what.in - 1 && (
        <Cam k={k}>
          <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.2) / 2, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(${drift.toFixed(2)}px, 0, 0)` }}>
            <Words
              id="what"
              text={what.text}
              frame={F}
              start={what.in - 1}
              starts={starts}
              size={size}
              dur={f60x(4)}
              rise={0}
              arriveX={0.35}
              out={what.out}
              outDur={cut - what.out}
              exit="launch"
              exitDir="right"
              exitAt={cut - 1}
              wordStyle={(i) => (F >= vanish(i) ? { opacity: 0 } : {})}
              style={sentenceStyle(size)}
            />
          </div>
        </Cam>
      )}
    </AbsoluteFill>
  );
};
