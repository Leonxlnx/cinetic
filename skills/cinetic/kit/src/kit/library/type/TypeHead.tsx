// TypeHead (type, enter): a line typed letter by letter whose newest letters (or the word being typed) are in an accent
// that cools to the ink a few frames later, so a coloured head runs with the caret.
// Numbers: about one letter every 1.2 f; a letter's first frame at 40 % of the accent, then the accent, held 4 f, cooled
// to the ink over 3 f; by word: the word being typed and the one before in the accent, a finished word cooling 6 f after
// it ends, over 4 f.
// Caution: never a burst: the cadence runs to the end (show a prefix already typed when time is short).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { mixColor, typingTimes, useTextLayout } from '../../type';

/** The colour of character `i` at frame `f`, typed at `times`: the head in `accent`, cooling to `ink`. */
export const headColour = (f: number, i: number, text: string, times: number[], o: { accent: string; ink: string; by: 'letter' | 'word'; hold: number; settle: number }) => {
  const born = times[i];
  if (o.by === 'letter') {
    const age = f - born;
    if (age === 0) return mixColor(o.ink === '#FFFFFF' ? '#000000' : '#FFFFFF', o.accent, 0.4);
    return mixColor(o.accent, o.ink, clamp((age - o.hold) / Math.max(1, o.settle)));
  }
  // by word: the word stays in the accent until it is finished, then cools
  let end = i;
  while (end + 1 < text.length && text[end + 1] !== ' ') end++;
  const doneAt = times[end] ?? born;
  return mixColor(o.accent, o.ink, clamp((f - doneAt - o.hold) / Math.max(1, o.settle)));
};

/**
 * TypeHead: typed text with a coloured head. From `at` the line types at `cps` characters a second (the kit's believable
 * cadence, no burst); each new letter lands in `accent` and cools to `color` (`by="letter"`), or the word being typed
 * is in the accent and cools once finished (`by="word"`). The line is centred and grows from its centre (`align`
 * 'center') or left-anchored at `x`. `caret` follows the last letter and blinks once the typing ends.
 */
export const TypeHead: React.FC<{
  text: string;
  at?: number;
  /** Characters a second (default 25: about one letter every 1.2 f). */
  cps?: number;
  /** Characters already typed at `at` (a prefix shown when time is short). */
  typed?: number;
  by?: 'letter' | 'word';
  accent?: string;
  /** Frames a letter holds the accent (default 4 by letter, 6 by word). */
  hold?: number;
  settle?: number;
  caret?: boolean;
  align?: 'center' | 'left';
  size?: number;
  color?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, cps = 25, typed = 0, by = 'letter', accent = '#2F6BE0', hold, settle, caret = false, align = 'center', size = 64, color = '#141414', leaveAt, x, y, font = fonts.inter, weight = 500, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at - 8 || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const chars = Array.from(text);
  const T = typingTimes(text.slice(typed), at, fps, cps, seed).map((t) => t);
  const times = [...chars.slice(0, typed).map(() => at - 100), ...T];
  const n = times.filter((t) => frame >= t).length;
  const lastC = L.chars[Math.max(0, n - 1)];
  const wNow = n > 0 ? lastC.x + lastC.width : 0;
  const left = align === 'left' ? (x ?? width * 0.1) : (x ?? width / 2) - wNow / 2;
  const top = (y ?? height / 2) - L.height / 2;
  const o = { accent, ink: color, by, hold: hold ?? (by === 'letter' ? 4 : 6), settle: settle ?? (by === 'letter' ? 3 : 4) };
  const doneAt = times[times.length - 1] ?? at;
  const blink = frame < doneAt || Math.floor((frame - doneAt) / 15) % 2 === 0;
  return (
    <div style={{ position: 'absolute', left, top, height: L.height }}>
      {chars.map((c, i) =>
        i < n ? (
          <span key={i} style={{ ...style, position: 'absolute', left: L.chars[i].x, top: 0, whiteSpace: 'pre', color: headColour(frame, i, text, times, o) }}>
            {c}
          </span>
        ) : null,
      )}
      {caret && blink && <div style={{ position: 'absolute', left: wNow + size * 0.04, top: lastC.baseline - size * 0.8, width: Math.max(2, size * 0.06), height: size * 0.95, background: accent, borderRadius: 2 }} />}
    </div>
  );
};
