// MarkPhrase (type, emphasis): a flat highlight sweeps behind a phrase (the words turn to its ink as it passes) or an
// underline draws under it.
// Numbers: highlight 12 f in-out, padded 0.09 em, 1.12 em tall; underline 14 f in-out, 0.07 em thick, 0.13 em under
// the baseline.
// Caution: two marks in a line at most, and colour emphasis in at most two statements of a film.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, at as prog } from '../../motion';
import { useTextLayout } from '../../type';

export type PhraseMark = {
  /** First and last word of the phrase (inclusive). */
  from: number;
  to: number;
  at: number;
  kind: 'highlight' | 'underline';
  color: string;
  /** The phrase's colour under a highlight (default the line's). */
  ink?: string;
  /** Frames of the sweep or draw (default 12 for a highlight, 14 for an underline). */
  dur?: number;
};

/**
 * MarkPhrase: a line that is already there gets marked. A highlight sweeps in behind a phrase from left to right (a flat
 * block a little taller than the capitals) and the words turn to the highlight's ink exactly where it has passed; an
 * underline draws itself under a phrase from the left, round-ended. Several marks, one after another, at most two per
 * line.
 */
export const MarkPhrase: React.FC<{
  text: string;
  /** Frame the line is there (a cut; put a RiseLine before it for an entrance). */
  at?: number;
  marks: PhraseMark[];
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, marks, size = 110, color = '#141414', x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.25 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const left = cx - L.width / 2;
  const top = cy - L.height / 2;
  const line = (ink: string, clip?: string, key?: string) => (
    <div key={key} style={{ ...style, position: 'absolute', left, top, color: ink, whiteSpace: 'pre', clipPath: clip }}>
      {text}
    </div>
  );
  const under: React.ReactNode[] = [];
  const over: React.ReactNode[] = [];
  // a mark never covers punctuation: the phrase ends at its last letter
  const cps = Array.from(text);
  const wordEnd = (wi: number) => {
    let w = -1;
    let last = -1;
    for (let i = 0; i < cps.length; i++) {
      if (cps[i].trim() && (i === 0 || !cps[i - 1].trim())) w++;
      if (w === wi && cps[i].trim() && !/[.,!?:;]/.test(cps[i])) last = i;
      if (w > wi) break;
    }
    const g = L.chars[last];
    return g ? g.x + g.width : 0;
  };
  marks.forEach((m, k) => {
    const a = L.words[m.from];
    const b0 = L.words[m.to];
    if (!a || !b0) return;
    const b = { x: b0.x, width: wordEnd(m.to) - b0.x };
    if (m.kind === 'highlight') {
      const p = prog(frame, m.at, m.dur ?? 12, ease.inOut);
      if (p <= 0) return;
      const pad = size * 0.09;
      const x0 = a.x - pad;
      const w = (b.x + b.width - a.x + pad * 2) * p;
      const hTop = L.baseline - size * 0.9;
      const hH = size * 1.12;
      under.push(<div key={`h${k}`} style={{ position: 'absolute', left: left + x0, top: top + hTop, width: w, height: hH, background: m.color, borderRadius: size * 0.06 }} />);
      if (m.ink) over.push(line(m.ink, `inset(${hTop}px ${Math.max(0, L.width - x0 - w)}px ${Math.max(0, L.height - hTop - hH)}px ${Math.max(0, x0)}px)`, `i${k}`));
    } else {
      const p = prog(frame, m.at, m.dur ?? 14, ease.inOut);
      if (p <= 0) return;
      const th = Math.max(3, size * 0.07);
      under.push(<div key={`u${k}`} style={{ position: 'absolute', left: left + a.x, top: top + L.baseline + size * 0.13, width: Math.max(th, (b.x + b.width - a.x) * p), height: th, borderRadius: th, background: m.color }} />);
    }
  });
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {under}
      {line(color)}
      {over}
    </div>
  );
};
