// StampHop (turn, join): a flat box hops along the line one word a frame, covering each word in turn; under it the
// line is replaced, and the box hops on over the new words and is gone.
// Numbers: one frame a word, no tween; the box is the word's width plus 0.08 em a side and 0.98 em tall from 0.8 em
// above the baseline; the new line appears on the frame after the old line's last word.
// Caution: a rhythm move: put the hops on the music's sixteenths; keep it to lines of two to five words.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTextLayout } from '../../type';
import { type Scenes, sp } from './_shared';

/**
 * StampHop: a redaction box swaps a line. The piece sets both lines (`text` then `next`, each centred on x, y) over
 * `from` and `to` (their grounds). From `at` the box covers word 1, 2, ... of the old line on successive frames; on the
 * frame after the last one, the new line is in place and the box is on its first word, then hops on over `hopNext` of
 * its words and is gone. Every frame is a whole state: no slide, no fade. Measured: 3 old words, then the new line with
 * the box on its first word, 1 f each.
 */
export const StampHop: React.FC<
  Scenes & {
    text: string;
    next: string;
    style: React.CSSProperties;
    /** The box's colour (the line's ink, or the paper on a dark ground). */
    color: string;
    x?: number;
    y?: number;
    /** How many of the new line's words the box covers after the swap (default all of them). */
    hopNext?: number;
    /** Frames the box holds on each word. */
    hold?: number;
  }
> = ({ from, to, at: start, speed = 1, text, next, style, color, x: xIn, y: yIn, hopNext, hold = 1 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const A = useTextLayout(text, style);
  const B = useTextLayout(next, style);
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const fs = typeof style.fontSize === 'number' ? style.fontSize : 80;
  const h = sp(hold, speed);
  const na = Math.max(1, A.words.length || text.split(/\s+/).filter(Boolean).length);
  const nb = Math.min(B.words.length || next.split(/\s+/).filter(Boolean).length, hopNext ?? 99);
  const k = frame < start ? -1 : Math.floor((frame - start) / h);
  const swapped = k >= na;
  const L = swapped ? B : A;
  const left = x - L.width / 2;
  const top = y - L.height / 2;
  const wi = swapped ? k - na : k;
  const box = k >= 0 && wi < (swapped ? nb : na) ? L.words[wi] : undefined;
  return (
    <AbsoluteFill>
      <AbsoluteFill>{swapped ? to : from}</AbsoluteFill>
      <div style={{ position: 'absolute', left, top, whiteSpace: 'pre', ...style, opacity: L.ready ? 1 : 0 }}>{swapped ? next : text}</div>
      {box && (
        <div style={{ position: 'absolute', left: left + box.x - fs * 0.08, top: top + box.baseline - fs * 0.8, width: box.width + fs * 0.16, height: fs * 0.98, background: color }} />
      )}
    </AbsoluteFill>
  );
};

/** The first frame after the last hop. */
export const stampHopEnd = (at: number, words: number, nextWords: number, hold = 1, speed = 1) => at + (words + nextWords) * sp(hold, speed);
