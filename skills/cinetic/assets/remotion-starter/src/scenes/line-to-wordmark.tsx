// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// line-to-wordmark: a question builds word by word inside four selection handles: each word cuts on tinted and inks
// in from left to right along the palette's path (its last letter darkest last), the line re-centring with a jump and
// a glide, the handles jumping wider with each word and blinking on their own; the line splits apart from its middle
// and the product's wordmark is born in the gap, large and blurred, settling as its ink walks the same path to black;
// it slides aside and the version tag cuts on at the slide's peak speed.
// Numbers (frames at 30 fps, px at 1080): words 9 f apart, each inked in ~8 f (3 f later at its right end); the line's
// left edge jumps 55 % of its new travel on the arrival frame and glides the rest (tau 2.6 f); handles 26 px, on
// 1-8 f, off 1-6 f; the split 2 f (30-37 px out); the wordmark x1.3 and 12 px blur -> sharp in 11 f, x1 in 15 f, ink
// home in 15 f; the slide 14 f on the measured curve with the tag on at its 9th frame.
import React from 'react';
import { FONT } from '../brand/tokens';
import { clamp, curveOf, E, rand } from '../lib/anim';
import { mixColor } from '../lib/color';
import { baselineOf, measureTracked } from '../lib/measure';
import { type Palette, paletteOf, ramp, type SceneMeta, useClock } from './parts';

export type LineToWordmarkProps = {
  /** the line built word by word (3-5 words) */
  line: string;
  /** the wordmark: the product's name */
  name: string;
  /** the version or edition that cuts on beside it (optional) */
  tag?: string;
  /** the ink path a word walks as it inks in (light to dark; default the accent's ramp to the ink) */
  path?: readonly string[];
  palette?: Partial<Palette>;
  frame?: number;
};

export const LINE_MARK = { every: 9, first: 1, split: 10, size: 96, mark: 150 } as const;
const SLIDE = curveOf([0, 0.043, 0.097, 0.194, 0.323, 0.484, 0.634, 0.742, 0.828, 0.882, 0.925, 0.946, 0.968, 0.989, 1]);

export const lineToWordmarkDur = (line: string, tag?: string) => {
  const n = line.split(' ').length;
  const born = LINE_MARK.first + (n - 1) * LINE_MARK.every + LINE_MARK.split + 2;
  return born + (tag ? 36 : 24);
};

// a square's blink: on 1-8 f, off 1-6 f, seeded per square (never periodic)
const blinkOn = (sq: number, t: number) => {
  let at = 0;
  for (let k = 0; k < 64; k++) {
    const on = 1 + Math.floor(rand(`hjq-on-${sq}-${k}`) * 8);
    const off = 1 + Math.floor(rand(`hjq-off-${sq}-${k}`) * 6);
    if (t < at + on) return true;
    if (t < at + on + off) return false;
    at += on + off;
  }
  return true;
};

export const LineToWordmark: React.FC<LineToWordmarkProps> = ({ line, name, tag, path, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const cx = W / 2;
  const cy = H / 2;
  const inkPath = path ?? [mixColor(P.lift, P.paper, 0.35), P.lift, P.accent, mixColor(P.accent, P.ink, 0.55), P.ink];
  const words = line.split(' ');
  const n = words.length;
  const on = (i: number) => LINE_MARK.first + i * LINE_MARK.every;
  const split = on(n - 1) + LINE_MARK.split;
  const born = split + 2;
  // a word's ink across its width at tw frames after it cut on: the path walked one step a frame, 3 f later at its end
  const inkGrad = (tw: number) => {
    const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((x) => `${ramp(inkPath, clamp((tw - 3 * x) / 5.5))} ${(x * 100).toFixed(0)}%`);
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  };
  // backgroundImage, never the background shorthand: a changing shorthand resets the clip and the word turns into a box
  const clip: React.CSSProperties = { WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', padding: '0.18em 0 0.32em', margin: '-0.18em 0 -0.32em' };
  if (t < born) {
    const size = LINE_MARK.size * u;
    const space = measureTracked(' ', size, 450, -0.01);
    const ws = words.map((w) => measureTracked(w, size, 450, -0.01));
    const widthTo = (k: number) => ws.slice(0, k + 1).reduce((a, b) => a + b, 0) + k * space;
    let left = cx - ws[0] / 2;
    let shown = 0;
    for (let k = 0; k < n && t >= on(k); k++) {
      shown = k;
      if (k === 0) continue;
      const target = cx - widthTo(k) / 2;
      const nextOn = k + 1 < n ? on(k + 1) : Infinity;
      const tt = Math.min(t, nextOn) - on(k);
      left = target + (left - target) * 0.45 * Math.exp(-tt / 2.6);
    }
    const lineW = widthTo(shown);
    const base = baselineOf(size, 450, 1);
    const top = cy + 0.36 * size - base;
    // the selection handles: a box around the line that jumps wider with each word
    const bx0 = left - 84 * u;
    const bx1 = left + lineW + 84 * u;
    const by0 = cy - 0.36 * size - 149 * u;
    const by1 = cy + 0.36 * size + 118 * u;
    const sq = 26 * u;
    const grey = mixColor(P.ink, P.ground, 0.55);
    const half = Math.floor(n / 2);
    const sp = t - split; // the split
    let x = left;
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
        {sp < 0
          ? [
              [bx0, by0],
              [bx1 - sq, by0],
              [bx0, by1 - sq],
              [bx1 - sq, by1 - sq],
            ].map(([qx, qy], i) => (blinkOn(i, t) ? <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: sq, height: sq, background: grey, transform: `translate(${qx.toFixed(2)}px, ${qy.toFixed(2)}px)` }} /> : null))
          : null}
        {words.map((w, i) => {
          const wx = x;
          x += ws[i] + space;
          if (t < on(i)) return null;
          const out = sp >= 0 ? (i < half ? -1 : 1) * (sp < 1 ? 7 : 34) * u : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(wx + out).toFixed(2)}px, ${top.toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: 450, letterSpacing: '-0.01em', lineHeight: 1 }}>
              <span style={{ backgroundImage: inkGrad(t - on(i)), ...clip }}>{w}</span>
            </div>
          );
        })}
      </div>
    );
  }
  // ---- the wordmark is born in the gap
  const tb = t - born;
  const font = LINE_MARK.mark * u;
  const nameW = measureTracked(name, font, 650, -0.03);
  const tagFont = font * 0.62;
  const tagW = tag ? measureTracked(tag, tagFont, 500, -0.01) : 0;
  const gap = 0.16 * font;
  const shiftTo = tag ? (tagW + gap) / 2 : 0;
  const slide = tag ? SLIDE(clamp((tb - 17) / 14)) : 0;
  const scale = 1 + 0.3 * (1 - E.glideOut(clamp(tb / 15)));
  const blur = 12 * u * (1 - E.softOut(clamp(tb / 11)));
  const ink = ramp(inkPath, clamp(tb / 15));
  const left = cx - nameW / 2 - shiftTo * slide;
  const base = baselineOf(font, 650, 1);
  const tagOn = tb >= 26;
  const tagInk = ramp([P.accent, P.lift, mixColor(P.accent, P.ink, 0.4), P.accent], clamp((tb - 26) / 36));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${nameW / 2}px ${base - 0.36 * font}px`, transform: `translate(${left.toFixed(2)}px, ${(cy + 0.36 * font - base).toFixed(2)}px) scale(${scale.toFixed(4)})`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: font, fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1, color: ink, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        {name}
      </div>
      {tag && tagOn ? (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(left + nameW + gap).toFixed(2)}px, ${(cy + 0.36 * font - baselineOf(tagFont, 500, 1)).toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: tagFont, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1, color: tagInk }}>
          {tag}
        </div>
      ) : null}
    </div>
  );
};

export const lineToWordmarkMeta: SceneMeta = {
  id: 'line-to-wordmark',
  does: 'a line builds word by word inside blinking handles, splits from its middle, and the wordmark is born in the gap',
  dur: lineToWordmarkDur('What if your team', '2.0'),
  props: ['line', 'name', 'tag?', 'path?', 'palette?'],
  handIn: null,
  handOut: { form: 'mark', x: 960 - 300, y: 474, w: 600, h: 138 },
  klass: 'quiet',
  cues: [
    { f: 1, kind: 'tick', id: 'word-1', weight: 0.4 },
    { f: 10, kind: 'tick', id: 'word-2', weight: 0.4 },
    { f: 19, kind: 'tick', id: 'word-3', weight: 0.4 },
    { f: 28, kind: 'tick', id: 'word-4', weight: 0.4 },
    { f: 38, kind: 'whoosh', id: 'split', weight: 0.5 },
    { f: 40, kind: 'swell', id: 'wordmark', weight: 0.8 },
    { f: 66, kind: 'pop', id: 'tag', weight: 0.6 },
  ],
};
