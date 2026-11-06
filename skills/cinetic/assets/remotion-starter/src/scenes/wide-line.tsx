// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// wide-line: a statement set bigger than the frame. The first word fills the screen at cap ~22 % of the height and the
// camera travels the line word by word in one expo move (the type smears along the travel at speed, sharp as it
// slows), lands on the last word, then pulls back in log space until the whole line sits in the frame: the size is the
// moment, and the pull-back says it again as one thought. On a lit studio sweep (clean ground, a soft key behind the
// line); the accent word (*word*) in the accent, the rest in the ink. A short line (it fits at hero size) starts on
// its first word closer still (up to x2.2) and pulls back to the whole line instead of travelling.
// Numbers (frames at 30 fps, px at 1080): the line 330 px, weight 650, tracking -0.04 em; the travel f0-38 from the
// first word's centre to the last's (expo in-out, k 6), smeared along x by a 180-degree shutter (sigma <= 12 px);
// the pull-back f38-70 to 86 % of the width (zoomAt, XP.arrive), the camera gliding to the line's middle; a short line
// pulls back f0-38 (XP.arrive) and pushes x1 -> x1.04 to the cut. 2.33 s. Big.
import React from 'react';
import { FONT } from '../brand/tokens';
import { E, panTo, travel, XP, zoomAt } from '../lib/anim';
import { mixColor, oklch, toOklch } from '../lib/color';
import { baselineOf, measureTracked } from '../lib/measure';
import { Studio } from '../fx/light/Material';
import { Smear } from '../fx/Moves';
import { type Palette, paletteOf, type SceneMeta, useClock } from './parts';

export type WideLineProps = {
  /** the statement: 3-7 words; mark one word *like this* for the accent */
  line: string;
  palette?: Partial<Palette>;
  frame?: number;
};

export const WIDE = { dur: 70, travel: 38, size: 330, weight: 650, track: -0.04, fit: 0.86 } as const;

/** The line's words, each with its accent flag: *a span* of one or more words takes the accent. */
export const wideWords = (line: string) => {
  let inSpan = false;
  return line.trim().split(/\s+/).filter(Boolean).map((w) => {
    const opens = w.startsWith('*');
    const closes = /\*[.,!?:;]?$/.test(w) && (!opens || w.length > 1);
    const accent = inSpan || opens;
    inSpan = (inSpan || opens) && !closes;
    return { w: w.replace(/\*/g, ''), accent };
  });
};

/**
 * The camera at frame t (30 fps) on a line of length L (px at hero size) in a frame W wide, its first and last words'
 * centres and the first word's width: the centre on the line `cx` and the scale `s`. A long line travels at x1 from
 * its first frame (the line's left edge 6 % in) to the last word, then pulls back in log space to 86 % of the width; a
 * short line (it fits at hero size) starts on its first word, closer still, pulls back to x1 and keeps pushing.
 */
export const wideCamera = (t: number, o: { L: number; W: number; first: number; last: number; firstW: number }) => {
  const short = o.L <= 0.92 * o.W;
  if (short) {
    const close = Math.min(2.2, (0.9 * o.W) / Math.max(1, o.firstW));
    return {
      short,
      cx: panTo(t, 0, WIDE.travel, o.first, o.L / 2, 7),
      s: t < WIDE.travel ? zoomAt(t, 0, WIDE.travel, close, 1, XP.arrive) : zoomAt(t, WIDE.travel, WIDE.dur, 1, 1.04, E.softOut),
    };
  }
  const fit = Math.min(1, (WIDE.fit * o.W) / o.L);
  const cx0 = Math.min(Math.max(o.first, 0.44 * o.W), o.L / 2);
  return {
    short,
    cx: t < WIDE.travel ? travel(t, 0, WIDE.travel, cx0, o.last, 6) : panTo(t, WIDE.travel, WIDE.dur, o.last, o.L / 2, 6),
    s: t < WIDE.travel ? 1 : zoomAt(t, WIDE.travel, WIDE.dur, 1, fit, XP.arrive),
  };
};

export const WideLine: React.FC<WideLineProps> = ({ line, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const size = WIDE.size * u;
  const words = wideWords(line);
  const space = measureTracked(' ', size, WIDE.weight, WIDE.track);
  let x = 0;
  const placed = words.map((o) => {
    const ww = measureTracked(o.w, size, WIDE.weight, WIDE.track);
    const at = x;
    x += ww + space;
    return { ...o, x: at, ww };
  });
  const L = Math.max(1, x - space);
  const cap = 0.73 * size;
  // the line's own space: its left edge at 0, its cap centred on the frame's middle
  const top = H / 2 + cap / 2 - baselineOf(size, WIDE.weight, 1);
  const first = placed[0] ? placed[0].x + placed[0].ww / 2 : L / 2;
  const last = placed.length ? placed[placed.length - 1].x + placed[placed.length - 1].ww / 2 : L / 2;
  // the camera: a centre on the line (cx) and a scale (s)
  const lens = { L, W, first, last, firstW: placed[0]?.ww ?? L };
  const { short, cx, s } = wideCamera(t, lens);
  // the travel's speed on screen (px a frame): the shutter (180 degrees) smears half of it along x, a Gaussian of a
  // third of that length, at most 12 px; a short line only zooms (a sideways smear would be wrong) and stays sharp
  const v = short ? 0 : (cx - wideCamera(t - 1, lens).cx) * s;
  const sigma = Math.min(12 * u, (0.5 * Math.abs(v)) / 3);
  // the sweep takes the value of the ground it is given (a film keeps one ground); the ink reads on it
  const dark = toOklch(P.ground)[0] < 0.5;
  const white = oklch(0.985, 0.004, toOklch(P.accent)[2]);
  const ink = P.ink;
  const sweep = dark ? P.ground : mixColor(P.ground, white, 0.5);
  const light = mixColor(P.accent, white, dark ? 0.5 : 0.78);
  const cam = `translate(${(W / 2).toFixed(2)}px, 0px) scale(${s.toFixed(5)}) translate(${(-cx).toFixed(2)}px, 0px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: sweep }}>
      <Studio W={W} H={H} base={sweep} light={light} tone={dark ? 'dark' : 'light'} horizon={0.74} pool={{ x: 0.5, y: 0.48, r: 0.46 }} on={1} scale={1 + (s - 1) * 0.15} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `0 ${H / 2}px`, transform: cam }}>
        {/* each word its own smear (an SVG Gaussian along x, in the line's space: the camera's scale is undone) */}
        {placed.map((o, i) => (
          <Smear key={i} id={`wide-line-${i}`} sx={sigma / Math.max(0.05, s)} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${o.x.toFixed(2)}px, ${top.toFixed(2)}px)` }}>
            <span style={{ whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: WIDE.weight, letterSpacing: `${WIDE.track}em`, lineHeight: 1, fontVariationSettings: '"opsz" 32', color: o.accent ? P.accent : ink }}>{o.w}</span>
          </Smear>
        ))}
      </div>
    </div>
  );
};

export const wideLineMeta: SceneMeta = {
  id: 'wide-line',
  does: 'a statement set bigger than the frame: the camera travels it word by word at giant size, then pulls back until the whole line sits in the frame',
  dur: WIDE.dur,
  props: ['line', 'palette?'],
  handIn: null,
  handOut: { form: 'word', x: 134, y: 470, w: 1652, h: 140 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'travel', weight: 0.5 },
    { f: WIDE.travel, kind: 'land', id: 'last-word', weight: 0.45 },
    { f: WIDE.travel + 4, kind: 'whoosh', id: 'pull-back', weight: 0.35 },
  ],
};
