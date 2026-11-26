// WordTicker (type, enter / build): a sentence built as a ticker: each new word comes in from the right and slides into
// place, pushing the words before it to the left; the oldest words drop off so only the last few stay; now and then a
// glowing block flashes over a word as if it were selected.
// Numbers: a word lands in 5 f (ease-out, 70 % of the travel in the first 2 f) from 0.45 of the width to the right; the
// line keeps its last 2-3 words, the oldest cut off as the new one lands; a flash covers its word for 2 f with a soft glow.
// Caution: short words on the beat; the flash is a rare accent (two in a line at most).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { useTextLayout } from '../../type';

/**
 * WordTicker: the words of `text` arrive on `times` (or every `gap` frames from `at`), each sliding in from the right
 * while the line re-centres; once more than `keep` words are on, the oldest go by cut. `flashes` put a glowing block of
 * `flash` colour over word `index` for 2 frames from `at`.
 */
export const WordTicker: React.FC<{
  text: string;
  at?: number;
  gap?: number;
  times?: number[];
  keep?: number;
  flashes?: Array<{ at: number; index: number }>;
  flash?: string;
  size?: number;
  color?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, gap = 8, times, keep = 3, flashes = [], flash = '#FFFFFF', size = 120, color = '#F4F3F0', leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  const T = words.map((_, i) => times?.[i] ?? Math.round(at + i * gap));
  if (!L.ready || L.words.length < words.length || frame < T[0] || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const k = T.filter((t) => frame >= t).length - 1;
  const age = frame - T[k];
  const e = 1 - Math.pow(1 - clamp((age + 1) / 5), 3);
  const cx = x ?? width / 2;
  const top = (y ?? height / 2) - L.height / 2;
  // the group's left edge (relative to the line's own x) before and after the newest word, each centred
  const span = (a: number, b: number) => L.words[b].x + L.words[b].width - L.words[a].x;
  const first = Math.max(0, k - keep + 1);
  const firstBefore = Math.max(0, k - 1 - keep + 1);
  const leftAfter = cx - span(first, k) / 2 - L.words[first].x;
  const leftBefore = k > 0 ? cx - span(firstBefore, k - 1) / 2 - L.words[firstBefore].x : leftAfter;
  const left = leftBefore + (leftAfter - leftBefore) * e;
  const enter = (1 - e) * width * 0.45;
  return (
    <>
      {words.map((w, i) => {
        if (i < first || i > k) return null;
        const X = left + L.words[i].x + (i === k ? enter : 0);
        const f = flashes.find((fl) => fl.index === i && frame >= fl.at && frame < fl.at + 2);
        return (
          <React.Fragment key={i}>
            <span style={{ ...style, position: 'absolute', left: X, top, whiteSpace: 'pre', color }}>{w}</span>
            {f && <div style={{ position: 'absolute', left: X - size * 0.06, top: top + L.words[i].baseline - size * 0.8, width: L.words[i].width + size * 0.12, height: size * 0.98, background: flash, boxShadow: `0 0 ${size * 0.12}px ${flash}` }} />}
          </React.Fragment>
        );
      })}
    </>
  );
};
