// Library, lines that are events: words that land with weight while the line re-centres, a clean masked rise with a word
// swapped in place, a highlighter and an underline that mark a phrase, the scale jump (a giant word cut to a small
// line), and three clean exits: the line pushed apart by what arrives, the word turned into a block that covers the
// frame, and the mask that closes (RiseLine's `leaveAt`).
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { accel, at as prog, clamp, ease, logScale, mix } from '../motion';
import { fonts } from '../fonts';
import { mixColor, useTextLayout, type TextLayout } from '../type';

/** Width of the first `n` words of a measured line (from the first word's left edge to the n-th word's right edge). */
const spanOf = (L: TextLayout, n: number) => {
  if (n <= 0 || !L.words.length) return 0;
  const a = L.words[0];
  const b = L.words[Math.min(n, L.words.length) - 1];
  return b.x + b.width - a.x;
};

/** Default start frame of each word: one word every `gap` frames from `at`. */
const wordTimes = (n: number, at: number, gap: number, times?: number[]) => Array.from({ length: n }, (_, i) => times?.[i] ?? Math.round(at + i * gap));

/** The left edge of a line that grows word by word and re-centres: each arrival adds its own short ease-out move. */
const growLeft = (L: TextLayout, cx: number, times: number[], f: number, recentre: number) => {
  let w = spanOf(L, 1) / 2;
  for (let i = 1; i < times.length; i++) {
    const p = recentre <= 0 ? (f >= times[i] ? 1 : 0) : prog(f, times[i], recentre, ease.out);
    w += ((spanOf(L, i + 1) - spanOf(L, i)) / 2) * p;
  }
  return cx - w;
};

// ---------------------------------------------------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------------------------------------------------
/**
 * RiseLine: the clean masked rise. Each word rises into place from behind its own baseline mask (no fade, no tilt), a
 * few frames after the one before. `swap` replaces one word in place: the old word rises out of its mask, the new one
 * rises in from below and the line re-centres to the new width. `leaveAt`: the mask closes, the words sink back behind
 * their baseline, the last word first.
 */
export const RiseLine: React.FC<{
  text: string;
  at?: number;
  /** Frames between words (default 3). */
  gap?: number;
  /** Frames each word's rise takes (default 14). */
  dur?: number;
  swap?: { at: number; index: number; word: string };
  leaveAt?: number;
  size?: number;
  color?: string;
  /** Colour of the swapped-in word (default the line's). */
  swapColor?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, gap = 3, dur = 14, swap, leaveAt, size = 120, color = '#141414', swapColor, x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.25 } as const;
  const words = text.split(/\s+/).filter(Boolean);
  const after = swap ? words.map((w, i) => (i === swap.index ? swap.word : w)) : words;
  const LA = useTextLayout(words.join(' '), style);
  const LB = useTextLayout(after.join(' '), style);
  if (!LA.ready || !LB.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const top = cy - LA.height / 2;
  const H = LA.height;
  const q = swap ? prog(frame, swap.at + 2, 12, ease.inOut) : 0;
  const n = words.length;
  const mask = (key: string, left: number, w: number, dy: number, word: string, ink: string) => (
    <div key={key} style={{ position: 'absolute', left: left - size * 0.1, top, width: w + size * 0.2, height: H, overflow: 'hidden' }}>
      <span style={{ ...style, position: 'absolute', left: size * 0.1, top: 0, color: ink, whiteSpace: 'pre', transform: `translateY(${dy}px)` }}>{word}</span>
    </div>
  );
  const els: React.ReactNode[] = [];
  words.forEach((wd, i) => {
    const xa = cx - LA.width / 2 + LA.words[i].x;
    const xb = cx - LB.width / 2 + LB.words[i].x;
    const X = mix(q, xa, xb);
    const rise = prog(frame, at + i * gap, dur, ease.out);
    const sink = leaveAt === undefined ? 0 : prog(frame, leaveAt + (n - 1 - i), 9, ease.in);
    const base = (1 - rise) * H + sink * H;
    if (swap && i === swap.index && frame >= swap.at) {
      // one roll: the new word follows the old one a line below, so the two never overlap
      const r = prog(frame, swap.at, 12, ease.inOut);
      if (r < 1) els.push(mask(`o${i}`, X, LA.words[i].width, base - r * H, wd, color));
      els.push(mask(`n${i}`, X, LB.words[i].width, base + (1 - r) * H, swap.word, swapColor ?? color));
    } else els.push(mask(`w${i}`, X, LA.words[i].width, base, wd, color));
  });
  return <div style={{ position: 'absolute', inset: 0 }}>{els}</div>;
};

// ---------------------------------------------------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------------------------------------------------
/**
 * ScaleJump: one word, giant, filling the frame edge to edge (cropped by it), pushing in and rising for a few frames;
 * a hard cut to the same word at a middle size for two frames, a cut again to it at line size; then the rest of the
 * line joins it word by word, the line jumping to its new centre on each word. Size as meaning: the big word is the
 * idea, the small line is the sentence.
 */
export const ScaleJump: React.FC<{
  text: string;
  at?: number;
  /** The giant size as a multiple of `size` (default 3.9) and the middle step (default 1.7). */
  big?: number;
  mid?: number;
  /** Frames the giant word holds (default 9) and the middle step (default 2). */
  hold?: number;
  midFor?: number;
  /** Start frames of the following words (default every 12 frames after the line appears). */
  times?: number[];
  /** Frames of the line's re-centre per word (default 0: a jump, as a cut). */
  recentre?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, big = 3.9, mid = 1.7, hold = 9, midFor = 2, times, recentre = 0, size = 150, color = '#141414', x, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.03em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const words = text.split(/\s+/).filter(Boolean);
  const lineAt = at + hold + midFor;
  if (frame < lineAt) {
    const giant = frame < at + hold;
    const p = prog(frame, at, hold, ease.out);
    const s = giant ? big * mix(p, 1, 1.12) : mid;
    // as measured: it starts low, cropped by the bottom edge, and rises as it grows
    const dy = giant ? mix(p, size * big * 0.38, size * big * 0.15) : 0;
    return (
      <div style={{ position: 'absolute', left: cx, top: cy + dy, transform: `translate(-50%, -50%) scale(${s})`, ...style, color, whiteSpace: 'pre' }}>
        {words[0]}
      </div>
    );
  }
  const T = [lineAt, ...words.slice(1).map((_, i) => times?.[i] ?? lineAt + 12 * (i + 1))];
  const left = growLeft(L, cx, T, frame, recentre);
  const w0 = L.words[0].x;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((wd, i) =>
        frame >= T[i] ? (
          <span key={i} style={{ ...style, position: 'absolute', left: left + L.words[i].x - w0, top: cy - L.height / 2, color, whiteSpace: 'pre' }}>
            {wd}
          </span>
        ) : null,
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * PushApart: an exit made by what arrives. A short line sits centred; from `at` the gap between its two halves prises
 * open while a dot grows in it and the camera creeps in (`dur` frames); then a cut in: the object whole in the middle
 * with a small settle, the halves pushed to the frame's edges, out of focus, sliding off. The line hands the frame to
 * the thing it named.
 */
export const PushApart: React.FC<{
  left: string;
  right: string;
  /** Frame the line is there (a cut) and the frame the push starts. */
  from?: number;
  at: number;
  /** The object: any node drawn at `objSize` px square. */
  node: React.ReactNode;
  objSize?: number;
  /** Frames of the push (default 16). */
  dur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ left, right, from = 0, at, node, objSize = 420, dur = 16, size = 120, color = '#141414', x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const LL = useTextLayout(left, style);
  const LR = useTextLayout(right, style);
  if (!LL.ready || !LR.ready || frame < from) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const space = size * 0.28;
  const total = LL.width + space + LR.width;
  const lx = cx - total / 2;
  const gapX = lx + LL.width + space / 2; // the gap's centre in the line
  const cutAt = at + dur;
  const pushed = frame >= cutAt;
  // two beats, as measured: the gap prises open slowly while a dot grows in it and the camera creeps in; then a cut
  // in, the object whole in the middle, the halves at the frame's edges, out of focus, sliding off
  const u = clamp((frame - at) / dur);
  let zoom = 1;
  let objPx = 0;
  let objX = cx;
  let offL = 0;
  let offR = 0;
  let blur = 0;
  if (frame >= at && !pushed) {
    zoom = logScale(1, 1.3, Math.pow(u, 1.4));
    objPx = objSize * logScale(0.015, 0.16, Math.pow(u, 1.2));
    objX = cx + (gapX - cx) * zoom;
    offL = offR = objPx / 2 + size * 0.12 * u;
  } else if (pushed) {
    const t = frame - cutAt;
    zoom = 1.75;
    objPx = objSize * (1 + 0.05 * Math.exp(-t / 4) * Math.cos(t * 0.7));
    const slide = accel(frame, cutAt + 4, 12, 1.3) * width * 0.35 + t * 3;
    // each half's inner edge sits so that about 40 % of it shows at the frame's edge
    offL = Math.max(objSize / 2 + size * 0.4, width / 2 - LL.width * zoom * 0.4) - (cx - (lx + LL.width)) * zoom + slide;
    offR = Math.max(objSize / 2 + size * 0.4, width / 2 - LR.width * zoom * 0.4) - (lx + LL.width + space - cx) * zoom + slide;
    blur = 9;
  }
  const word = (txt: string, L0: typeof LL, left0: number, sign: number, off: number) => (
    <span style={{ ...style, position: 'absolute', left: cx + (left0 - cx) * zoom + sign * off, top: cy - (L0.height * zoom) / 2, transformOrigin: '0 0', transform: `scale(${zoom})`, color, whiteSpace: 'pre', filter: blur ? `blur(${blur}px)` : undefined }}>
      {txt}
    </span>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {word(left, LL, lx, -1, offL)}
      {word(right, LR, lx + LL.width + space, 1, offR)}
      {objPx > 1 && (
        <div style={{ position: 'absolute', left: objX - objPx / 2, top: cy - objPx / 2, width: objPx, height: objPx }}>
          <div style={{ width: objSize, height: objSize, transformOrigin: '0 0', transform: `scale(${objPx / objSize})` }}>{node}</div>
        </div>
      )}
    </div>
  );
};
// ---------------------------------------------------------------------------------------------------------------------
/**
 * BlockOut: an exit that is also a turn. On `at` the line is replaced by a solid block of its own width (a cut, as if
 * the words were selected), and two frames later the block either grows to cover the whole frame (`mode="cover"`: the
 * next shot starts on its colour, a ground cut made from the words) or snaps shut to the right (`mode="collapse"`).
 */
export const BlockOut: React.FC<{
  text: string;
  /** Frame the line is there (a cut). */
  from?: number;
  at: number;
  mode?: 'cover' | 'collapse';
  /** The block's colour (default the line's) and the colour it covers the frame in (default the same). */
  block?: string;
  cover?: string;
  /** Frames of the cover or the collapse (default 12 and 7). */
  dur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, from = 0, at, mode = 'cover', block, cover, dur, size = 120, color = '#141414', x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < from) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const left = cx - L.width / 2;
  const top = cy - L.height / 2;
  if (frame < at)
    return (
      <div style={{ ...style, position: 'absolute', left, top, color, whiteSpace: 'pre' }}>
        {text}
      </div>
    );
  const bc = block ?? color;
  const a = L.words[0].ink;
  const b = L.words[L.words.length - 1].ink;
  const box = { x: left + a.x - size * 0.06, y: top + L.baseline - size * 0.76, w: b.x + b.width - a.x + size * 0.12, h: size * 0.86 };
  const t = frame - at - 2;
  if (mode === 'collapse') {
    const q = t < 0 ? 0 : prog(frame, at + 2, dur ?? 7, ease.in);
    if (q >= 1) return null;
    return <div style={{ position: 'absolute', left: box.x + box.w * q, top: box.y, width: box.w * (1 - q), height: box.h, background: bc }} />;
  }
  const q = t < 0 ? 0 : prog(frame, at + 2, dur ?? 12, ease.inOut);
  // grow in log space so the block keeps an even visual speed from word size to frame size
  const W = logScale(box.w, width * 1.02, q);
  const Hh = logScale(box.h, height * 1.02, q);
  const X = mix(q, box.x + box.w / 2, width / 2) - W / 2;
  const Y = mix(q, box.y + box.h / 2, height / 2) - Hh / 2;
  return <div style={{ position: 'absolute', left: X, top: Y, width: W, height: Hh, background: cover ? mixColor(bc, cover, q) : bc }} />;
};
