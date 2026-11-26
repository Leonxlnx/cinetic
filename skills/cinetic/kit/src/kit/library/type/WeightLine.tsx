// WeightLine (type, enter / emphasis): words land one or two at a time with weight: big, blurred and warm, dropping
// to size while the line re-centres.
// Numbers: the size falls 2.0 to 1.0 over 8 f with 18 px of blur; the colour cools over 10 f; joining words start at
// 1.18x; the block wipes in 8 f.
// Caution: two words per beat at most; a block on more than one word per film stops meaning anything.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, ease, mix, at as prog } from '../../motion';
import { mixColor, useTextLayout } from '../../type';
import { growLeft } from './_shared';

/** Default start frame of each word: one word every `gap` frames from `at`. */
const wordTimes = (n: number, at: number, gap: number, times?: number[]) => Array.from({ length: n }, (_, i) => times?.[i] ?? Math.round(at + i * gap));

export type LineBlock = {
  /** The word on the block. */
  index: number;
  color: string;
  /** The word's colour on the block. */
  ink: string;
  /** Frame the block wipes in (default: when its word has landed). */
  at?: number;
  /** Frames of the wipe (default 8). */
  dur?: number;
};

/**
 * WeightLine: words arrive one or two at a time and land with weight: each new word comes in larger and blurred in a
 * born colour, sharpens and drops to its size in about 8 frames, then cools to the line's colour, while the line
 * re-centres to make room (most of the travel in the first frames). `block` puts one word on a solid block that wipes in
 * behind it from the left, the word turning to the block's ink as the block passes. Words that share a frame in `times`
 * land together.
 */
export const WeightLine: React.FC<{
  text: string;
  at?: number;
  /** Frames between words (default 9) when `times` is not given. */
  gap?: number;
  /** The start frame of each word. */
  times?: number[];
  size?: number;
  color?: string;
  /** The colour a word is born in (default the line's colour). */
  born?: string;
  /** How much larger a word arrives (default 2). */
  land?: number;
  blur?: number;
  /** Frames a word takes to land (default 8). */
  dur?: number;
  /** Frames of the line's re-centre per arrival (default 9). */
  recentre?: number;
  block?: LineBlock;
  /** From this frame the line is gone (a hard cut on the beat). */
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, gap = 9, times, size = 120, color = '#141414', born, land = 2, blur = 18, dur = 8, recentre = 9, block, leaveAt, x, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const words = text.split(/\s+/).filter(Boolean);
  const T = wordTimes(words.length, at, gap, times);
  const left = growLeft(L, cx, T, frame, recentre);
  const top = cy - L.height / 2;
  const w0 = L.words[0]?.x ?? 0;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((wd, i) => {
        if (frame < T[i]) return null;
        const g = L.words[i];
        // the measured landing: the size falls off like a decay (2.0, 1.65, 1.43, 1.3, 1.17 ... over 8 frames)
        const tt = clamp((frame - T[i]) / dur);
        const p = (1 - Math.exp(-tt * 3.4)) / (1 - Math.exp(-3.4));
        // words that land together scale about their group's centre, so they never overlap
        const grp = T.map((t0, j) => (t0 === T[i] ? j : -1)).filter((j) => j >= 0);
        const gx0 = L.words[grp[0]].x;
        const gx1 = L.words[grp[grp.length - 1]].x + L.words[grp[grp.length - 1]].width;
        // the first word lands from twice its size; words that join the line land from a little larger, pinned at their
        // left edge, so they never cover the words already there
        const first = T[i] === T[0];
        const k = first ? land : 1 + (land - 1) * 0.18;
        const originX = first ? (gx0 + gx1) / 2 - g.x : gx0 - g.x;
        const cool = prog(frame, T[i] + dur * 0.6, 10, ease.linear);
        const ink = born ? mixColor(born, color, cool) : color;
        const X = left + g.x - w0;
        const onBlock = block && block.index === i;
        const bp = onBlock ? prog(frame, block.at ?? T[i] + dur, block.dur ?? 8, ease.out) : 0;
        const pad = size * 0.16;
        const bTop = top + g.baseline - size * 0.88;
        const bH = size * 1.14;
        const wordStyle: React.CSSProperties = { ...style, position: 'absolute', left: X, top, whiteSpace: 'pre', transformOrigin: `${originX}px ${g.baseline - size * 0.35}px`, transform: `scale(${mix(p, k, 1)})`, filter: p < 0.98 ? `blur(${(1 - p) * blur}px)` : undefined, opacity: clamp(p * 4) };
        return (
          <React.Fragment key={i}>
            {onBlock && bp > 0 && <div style={{ position: 'absolute', left: X - pad, top: bTop, width: (g.width + pad * 2) * bp, height: bH, background: block.color }} />}
            <span style={{ ...wordStyle, color: ink }}>{wd}</span>
            {onBlock && bp > 0 && <span style={{ ...wordStyle, color: block.ink, clipPath: `inset(-20% ${Math.max(0, 100 - ((bp * (g.width + pad * 2) - pad) / g.width) * 100)}% -20% -5%)` }}>{wd}</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};
