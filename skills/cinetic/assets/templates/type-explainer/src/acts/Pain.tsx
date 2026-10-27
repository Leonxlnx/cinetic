import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { settleLeft, Words } from '../fx/Words';
import { E, prog } from '../lib/anim';
import { ACT, copy, f60x, H, W } from '../timeline';
import { PAGE, sentenceSize, sentenceStyle, useAbs } from './stage';

// PAIN - the problem as one beat: the whole line on screen in one frame, coming into focus in 10 f while it drifts
// right (70 px, 90 % home in 30 f), a real hold, then an ease-in exit the same way, cut at speed. One line, no build: the turn of the story.

/** The beat's drift and exit (px at 1080p). */
export const BEAT_MOVE = { drift: 70, exit: 150 } as const;

export const Pain: React.FC = () => {
  const F = useAbs('pain');
  const c = copy('pain');
  const size = sentenceSize(c.text);
  const n = c.text.trim().split(/\s+/).length;
  const cut = ACT.promise.from;
  // in: the drift's last 70 px, entering from the left so it carries the last line's rightward speed
  const out = Math.min(c.out, cut - f60x(12)); // the exit starts on the line's read (COPY), never later than the cut allows
  const x = -BEAT_MOVE.drift * U * settleLeft(F - c.in, f60x(30)) + BEAT_MOVE.exit * U * E.launchIn(prog(F, out, cut, E.linear));
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      {F >= c.in && F < cut && (
        <Defocus sigma={5 * (1 - prog(F, c.in, c.resolved, E.snapOut))}>
          <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.2) / 2, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(${x.toFixed(2)}px, 0, 0)` }}>
            <Words id="pain" text={c.text} frame={F} start={c.in - 1} starts={Array.from({ length: n }, () => c.in - 1)} size={size} dur={1} rise={0} style={sentenceStyle(size)} />
          </div>
        </Defocus>
      )}
    </AbsoluteFill>
  );
};
