import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { clamp, E, type Ease, rand } from '../../lib/anim';
import { f60x } from '../../lib/film';
import type { V3 } from './math';
import type { Box } from './shots';
import { type Expander, Plane, type PlaneProps, type StageInfo } from './Stage3D';

/**
 * Stacks in real depth for Stage3D: a fan of cards (each a parallel plane further back, facing the camera, read in
 * perspective because the camera stands to one side), and a giant word in front with cards rising behind it. Cards
 * never turn at rest: the camera's angle and the planes' depth give the fan its perspective.
 */

/** House numbers: px at 1080p and 60 fps frames. */
export const STACK = {
  fan: { step: [-150, -64, -240] as const, enter: { frames60: 34, stagger60: 7, from: -520 } },
  rise: { z: -180, wordZ: 140, from: 460, frames60: 40, stagger60: 8 },
} as const;

export type FanProps = {
  id?: string;
  /** The cards, front first: each one real content (a notification, a row, a photo, a price). */
  cards: React.ReactNode[];
  /** One card's size (px at 1080p). */
  size: [number, number];
  /** The front card's centre on the design plane. */
  at: [number, number];
  /** Each card further back: x, y and depth (house STACK.fan.step: back, up and to the left). */
  step?: readonly [number, number, number];
  /** Cards slide forward into their slots from deeper (house 34 f, 7 f apart, from 520 px further back, E.glideOut). */
  enter?: { at: number; frames?: number; stagger?: number; from?: number; ease?: Ease };
  res?: number;
};

/** The fan's slots: each card's box and depth, and its centre in world space (rack the focus to it). */
export const fanSlots = (p: Pick<FanProps, 'cards' | 'size' | 'at' | 'step'>) => {
  const [dx, dy, dz] = p.step ?? STACK.fan.step;
  return p.cards.map((_, i) => {
    const cx = p.at[0] + dx * i;
    const cy = p.at[1] + dy * i;
    const z = dz * i;
    const box: Box = { x: cx - p.size[0] / 2, y: cy - p.size[1] / 2, w: p.size[0], h: p.size[1] };
    const centre: V3 = [cx, cy, z];
    return { box, z, centre };
  });
};

const fanPlanes = (p: FanProps, s: StageInfo): React.ReactElement<PlaneProps>[] => {
  const slots = fanSlots(p);
  const fps = s.fps;
  return slots.map((sl, i) => {
    const en = p.enter;
    const move = en
      ? (f: number) => {
          const frames = en.frames ?? f60x(STACK.fan.enter.frames60, fps);
          const stagger = en.stagger ?? f60x(STACK.fan.enter.stagger60, fps);
          const t = clamp((f - en.at - stagger * (slots.length - 1 - i)) / frames); // the back card first, the front card last
          const e = (en.ease ?? E.glideOut)(t);
          return { z: (en.from ?? STACK.fan.enter.from) * (1 - e), opacity: clamp(t * 3) };
        }
      : undefined;
    return (
      <Plane key={`${p.id ?? 'fan'}-${i}`} id={`${p.id ?? 'fan'}-${i}`} box={sl.box} z={sl.z} move={move} res={p.res}>
        {p.cards[i]}
      </Plane>
    );
  });
};

/** A fan of cards in depth (Stage3D child). Stand the camera to one side (wide({ yaw: 24, pitch: 8 })) and rack along it. */
export const Fan: Expander<FanProps> = Object.assign((() => null) as React.FC<FanProps>, { expand: fanPlanes });

export type RiseBehindProps = {
  id?: string;
  /** The giant word, drawn as it should look (type, colour), filling its box. */
  word: React.ReactNode;
  /** Where the word sits on the design plane. */
  wordBox: Box;
  /** The word's depth: in front of the cards (house +140). */
  wordZ?: number;
  /** The cards that rise behind the word, left to right. */
  cards: React.ReactNode[];
  cardSize: [number, number];
  /** Where the row of cards rests: its centre line and the gap between cards. */
  row: { cx: number; cy: number; gap: number };
  /** The cards' depth (house -180). */
  z?: number;
  /** They rise from `from` px below (house 460), 40 f each, 8 f apart, the middle card first, on E.glideOut. */
  rise: { at: number; frames?: number; stagger?: number; from?: number; ease?: Ease };
  res?: number;
};

const risePlanes = (p: RiseBehindProps, s: StageInfo): React.ReactElement<PlaneProps>[] => {
  const n = p.cards.length;
  const [w, h] = p.cardSize;
  const total = n * w + (n - 1) * p.row.gap;
  const mid = (n - 1) / 2;
  const fps = s.fps;
  const cards = p.cards.map((c, i) => {
    const x = p.row.cx - total / 2 + i * (w + p.row.gap);
    const order = Math.abs(i - mid); // the middle card first, then outward
    const move = (f: number) => {
      const frames = p.rise.frames ?? f60x(STACK.rise.frames60, fps);
      const stagger = p.rise.stagger ?? f60x(STACK.rise.stagger60, fps);
      const t = clamp((f - p.rise.at - stagger * order) / frames);
      const e = (p.rise.ease ?? E.glideOut)(t);
      return { y: (p.rise.from ?? STACK.rise.from) * (1 - e), opacity: clamp(t * 4) };
    };
    return (
      <Plane key={`${p.id ?? 'rise'}-${i}`} id={`${p.id ?? 'rise'}-${i}`} box={{ x, y: p.row.cy - h / 2, w, h }} z={p.z ?? STACK.rise.z} move={move} res={p.res}>
        {c}
      </Plane>
    );
  });
  const word = (
    <Plane key={`${p.id ?? 'rise'}-word`} id={`${p.id ?? 'rise'}-word`} box={p.wordBox} z={p.wordZ ?? STACK.rise.wordZ} res={p.res}>
      {p.word}
    </Plane>
  );
  return [...cards, word];
};

/** A giant word in front with cards rising behind it (Stage3D child): the word occludes them by depth, not by z-index. */
export const RiseBehind: Expander<RiseBehindProps> = Object.assign((() => null) as React.FC<RiseBehindProps>, { expand: risePlanes });

// ---------------------------------------------------------------------------------------------------------------
// typing: the subject a macro shot follows
// ---------------------------------------------------------------------------------------------------------------

export type Typing = { text: string; times: number[]; end: number; chars: (f: number) => number; shown: (f: number) => string };

/**
 * A typed line on a human cadence: when each character lands (frames), how many are shown at frame f. Deterministic
 * (seeded): `cps` characters a second on average, each key 0.6-1.4 of the mean, a breath after a space and a longer
 * one after a comma or a full stop.
 */
export const typing = (text: string, o: { at: number; cps?: number; seed?: string | number; fps: number }): Typing => {
  const mean = o.fps / (o.cps ?? 16);
  const times: number[] = [];
  let t = o.at;
  for (let i = 0; i < text.length; i++) {
    const prev = text[i - 1] ?? '';
    const k = 0.6 + 0.8 * rand(`${o.seed ?? 'type'}:${i}`);
    const pause = prev === ',' || prev === '.' || prev === '?' ? 2.4 : prev === ' ' ? 1.35 : 1;
    t += i === 0 ? 0 : mean * k * pause;
    times.push(t);
  }
  const chars = (f: number) => {
    let n = 0;
    while (n < times.length && times[n] <= f) n++;
    return n;
  };
  return { text, times, end: times[times.length - 1] ?? o.at, chars, shown: (f: number) => text.slice(0, chars(f)) };
};

export type FontSpec = { fontFamily: string; fontSize: number; fontWeight?: number | string; letterSpacing?: number };
const widthCache = new Map<string, number>();
/** Whether the face is loaded (Node, or a browser without the Font Loading API: assume so). */
const faceReady = (font: FontSpec) => {
  if (typeof document === 'undefined' || !document.fonts?.check) return true;
  try {
    return document.fonts.check(`${font.fontWeight ?? 400} ${font.fontSize}px ${font.fontFamily}`);
  } catch {
    return true;
  }
};
/**
 * The width of a string in a font (px). Measured once the face is loaded and cached from then on; a measure taken
 * before (a fallback face) is never kept, so a caret a camera follows lands on the real glyphs.
 */
export const textWidth = (s: string, font: FontSpec) => {
  const key = `${font.fontFamily}|${font.fontSize}|${font.fontWeight ?? 400}|${font.letterSpacing ?? 0}|${s}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  const w = s ? measureText({ text: s, fontFamily: font.fontFamily, fontSize: font.fontSize, fontWeight: String(font.fontWeight ?? 400), letterSpacing: font.letterSpacing ? `${font.letterSpacing}px` : undefined, validateFontIsLoaded: false }).width : 0;
  if (faceReady(font)) widthCache.set(key, w);
  return w;
};

/**
 * Where the caret is at frame f: the world point a follow() rides as the line types (the text's left edge at x,
 * its middle at y, on the plane at depth z; `scale`: the plane's own scale).
 */
export const caretOf = (t: Typing, o: { x: number; y: number; z?: number; font: FontSpec; scale?: number }) => (f: number): V3 => [
  o.x + textWidth(t.shown(f), o.font) * (o.scale ?? 1),
  o.y,
  o.z ?? 0,
];
