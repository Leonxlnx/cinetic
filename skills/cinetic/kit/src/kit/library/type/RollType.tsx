// RollType (type, enter / emphasis): a line typed unevenly in place, then its last digit rolls like a counter in
// whole steps and lands with a dash.
// Numbers: typing gaps 0.45-1.75 of per (1.6 f), 1.8x after a space; one whole digit a frame, the last step 5 f;
// neighbours 1.08 em away.
// Caution: never blur the digits or hold one half-rolled; a roll of more than 6 steps reads as a slot machine.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, at as prog } from '../../motion';
import { absCentre, typeTimes } from './_shared';

/**
 * RollType: a line typed in place, character by character at an uneven pace, whose last characters then roll like a
 * counter from `from` to their real value, the neighbouring digits faint above and below ("In 2026": "In 202" types,
 * then the last digit steps 3, 4, 5 a frame each, crisp, with its neighbours faint above and below, and slows onto 6;
 * a low dash appears after it on that last step). Never blurred: a counter that smears reads as a fault.
 */
export const RollType: React.FC<{
  text: string;
  at?: number;
  /**
   * The starting values of the rolling tail, as many characters as roll ("2" rolls the last digit from 2). A longer
   * `from` rolls that many tail characters, each on its own, 2 frames after the one before ("5:48" from "42": the 4
   * holds, the 2 rolls to 8); a digit equal to its target holds still, so pass only the digits that change.
   */
  from?: string;
  /** Frames per typed character, on average (default 1.6). */
  per?: number;
  /** Frames of the roll's last, slowing step (default 5); every step before it takes one frame. */
  rollDur?: number;
  /**
   * Whole digits only (default true): every frame shows whole digits, the last step lands as a cut after a held
   * second-to-last digit, with a 2-frame settle of the landed digit; no frame ever holds a digit clipped mid-roll.
   * false: the earlier roll, whose last step travels through fractions of a digit.
   */
  whole?: boolean;
  size?: number;
  color?: string;
  /** Neighbour digits' strength (0 hides them); they sit 1.08 em above and below the line, so lines stacked closer need 0. */
  ghosts?: number;
  caret?: boolean;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, from = '0', per = 1.6, rollDur = 5, whole = true, size = 160, color = '#141414', ghosts = 0.42, caret = true, x, y, font = fonts.inter, weight = 500, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const chars = Array.from(text);
  const nRoll = Math.min(from.length, chars.length);
  const head = chars.slice(0, chars.length - nRoll);
  const times = typeTimes(head.join(''), at, per, seed);
  const typedEnd = (times[times.length - 1] ?? at) + Math.round(per * 1.4);
  // as measured: no caret while it types; a low dash appears after the rolling digits on their last, slow step and stays
  const span0 = (() => { const a = Number(from[0]); const b = Number(chars[chars.length - nRoll]); return Number.isNaN(a) || Number.isNaN(b) ? 1 : (b - a + 10) % 10; })();
  const slowAt = typedEnd + Math.max(0, span0 - 1) + 1;
  const caretOn = caret && frame >= slowAt;
  const caretEl = (
    <span style={{ position: 'relative', display: 'inline-block', width: 0 }}>
      <span style={{ position: 'absolute', left: '0.06em', bottom: '0.06em', width: '0.4em', height: '0.07em', background: color }} />
    </span>
  );
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline' }}>
      {head.map((ch, i) => (
        <React.Fragment key={i}>
          <span style={{ visibility: frame >= times[i] ? 'visible' : 'hidden' }}>{ch}</span>
        </React.Fragment>
      ))}
      {chars.slice(chars.length - nRoll).map((ch, k) => {
        const s = typedEnd + k * 2;
        const a = Number(from[k]);
        const b = Number(ch);
        const isDigit = !Number.isNaN(a) && !Number.isNaN(b);
        if (!isDigit) return <span key={`r${k}`} style={{ visibility: frame >= s ? 'visible' : 'hidden' }}>{ch}</span>;
        const span = (b - a + 10) % 10;
        // a digit already at its value holds still (no full turn)
        if (span === 0) return <span key={`r${k}`} style={{ visibility: frame >= s ? 'visible' : 'hidden' }}>{ch}</span>;
        // fast first, a long slowing over the last digit: the counter finds its value
        // one whole digit per frame at first (crisp steps, never a smear), then the last step slows over four frames
        const steps = Math.max(0, span - 1);
        const t = frame - s;
        const slow = Math.max(2, rollDur);
        // whole: the second-to-last digit holds through the slow step and the last lands as a cut, settling 0.06 em
        // over 2 frames; the old roll travels through fractions on its last step
        const landed = whole && t >= steps + slow - 2;
        const pos = whole
          ? a + (t <= steps ? Math.max(0, t) : landed ? steps + 1 : steps)
          : a + (t <= steps ? Math.max(0, t) : steps + prog(frame, s + steps, slow, ease.out));
        const base = Math.floor(pos);
        const frac = pos - base;
        const settle = landed ? Math.max(0, 1 - (t - (steps + slow - 2)) / 2) * 0.06 : 0;
        return (
          <span key={`r${k}`} style={{ position: 'relative', display: 'inline-block', visibility: frame >= s ? 'visible' : 'hidden' }}>
            <span style={{ visibility: 'hidden' }}>0</span>
            {[-2, -1, 0, 1, 2].map((d) => {
              const yy = d - frac; // rows from the centre (0 = on the line)
              const dist = Math.abs(yy);
              const o = dist < 0.5 ? 1 - dist * (1 - ghosts) * 2 : Math.max(0, ghosts * (1.6 - dist));
              const done = frame >= s + steps + slow;
              if (done && Math.round(yy) !== 0) return null;
              return (
                <span
                  key={d}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `translateY(${yy * 1.08 + settle}em)`,
                    opacity: done ? 1 : o,
                  }}
                >
                  {(((base + d) % 10) + 10) % 10}
                </span>
              );
            })}
          </span>
        );
      })}
      {caretOn && caretEl}
    </div>
  );
};
