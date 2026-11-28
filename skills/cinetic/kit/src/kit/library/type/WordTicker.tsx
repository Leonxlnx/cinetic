// WordTicker (type, enter / build): a sentence built as a ticker: each new word comes in from the right and slides into
// place, pushing the words before it to the left; the oldest words drop off so only the last few stay; now and then a
// glowing block flashes over a word as if it were selected.
// Numbers: a word lands on an exponential arrival (half-life 1 f: 3/4 of the travel in the first 2 f, 97 % by f5, a tail that
// runs on through the beat, never a dead stop) from 0.45 of the width to the right; the line's re-centre rides the same
// curve and carries on when the next word lands; the
// line keeps its last 2-3 words, the oldest cut off as the new one lands; a flash covers its word for 2 f with a soft glow.
// Caution: short words on the beat; the flash is a rare accent (two in a line at most).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
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
  // each word's arrival: exponential, on screen from its first frame (already moving), half-life 1 f
  const arrive = (i: number) => (frame < T[i] ? 0 : 1 - Math.pow(0.5, (frame - T[i] + 1) / 1));
  const cx = x ?? width / 2;
  const top = (y ?? height / 2) - L.height / 2;
  // the group's left edge (relative to the line's own x) before and after the newest word, each centred
  const span = (a: number, b: number) => L.words[b].x + L.words[b].width - L.words[a].x;
  const first = Math.max(0, k - keep + 1);
  // the line's left edge centred on the newest word j; every arrival adds its own share of the re-centre, so a re-centre
  // still running when the next word lands carries on instead of snapping
  const centred = (j: number) => {
    const a = Math.max(0, j - keep + 1);
    return cx - span(a, j) / 2 - L.words[a].x;
  };
  let left = centred(0);
  for (let i = 1; i <= k; i++) left += (centred(i) - centred(i - 1)) * arrive(i);
  return (
    <>
      {words.map((w, i) => {
        if (i < first || i > k) return null;
        const X = left + L.words[i].x + (1 - arrive(i)) * width * 0.45;
        const f = flashes.find((fl) => fl.index === i && frame >= fl.at && frame < fl.at + 2);
        return (
          <React.Fragment key={i}>
            <span style={{ ...style, position: 'absolute', left: 0, top: 0, transform: `translate(${X}px, ${top}px)`, whiteSpace: 'pre', color }}>{w}</span>
            {f && <div style={{ position: 'absolute', left: X - size * 0.06, top: top + L.words[i].baseline - size * 0.8, width: L.words[i].width + size * 0.12, height: size * 0.98, background: flash, boxShadow: `0 0 ${size * 0.12}px ${flash}` }} />}
          </React.Fragment>
        );
      })}
    </>
  );
};
