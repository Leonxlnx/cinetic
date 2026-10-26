import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle } from '../brand/tokens';
import { LINESNAP_HOUSE } from '../fx/LineSnap';
import { Words } from '../fx/Words';
import { E, lmix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { ACT, copy, CUE, f60, FPS, H, PROMISE_GAP, W } from '../timeline';
import { Cam, LIGHT, lineSize, useAbs } from './stage';

// OPEN - the promise on a clean paper, already moving on frame 0: its words arrive a word gap apart and the last one
// snaps the whole line larger in one frame (fx/LineSnap's scale snap through Words snapLast: x2.2, the read words
// settling, a short defocus clearing). The line holds for its read while the frame creeps, then launches up; the
// card rises on that speed in the next act.

export const Open: React.FC = () => {
  const F = useAbs('open');
  const c = copy('promise');
  const snap = LINESNAP_HOUSE.snap.factor;
  // the finished (snapped) line fits the safe width at the display role: before the snap it is that size / x2.2
  const size = lineSize(c.text, 'display') / snap;
  const n = c.text.trim().split(/\s+/).length;
  const starts = Array.from({ length: n }, (_, i) => c.in + f60(PROMISE_GAP * i));
  const k = creep(F, 0, { pctPerSec: 0.05 }, FPS) * lmix(1, 1.04, prog(F, CUE.exitOpen, ACT.card.from, E.launchIn));
  return (
    <AbsoluteFill style={{ background: LIGHT.ground, overflow: 'hidden' }}>
      <Cam k={k}>
        <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * TYPE.display.lead) / 2, width: W, display: 'flex', justifyContent: 'center' }}>
          <Words
            id="promise"
            text={c.text}
            frame={F}
            start={c.in}
            starts={starts}
            size={size}
            snapLast={{ at: CUE.snap }}
            out={c.out}
            exit="launch"
            exitDir="up"
            exitAt={ACT.card.from - 1}
            style={{ ...typeStyle('display', size), color: LIGHT.text }}
          />
        </div>
      </Cam>
    </AbsoluteFill>
  );
};
