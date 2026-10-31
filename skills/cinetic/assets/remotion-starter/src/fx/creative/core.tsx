// The creative elements' shared parts: the palette a device draws in, the lit face of a card, the product's scene
// shown inside a box (the scene is a function of its frame, so a device can show it at any moment, at any size),
// phrased onsets and a seeded hash. A creative element is a whole scene, never decoration: it carries the line or the
// picture of one beat, with the product's own scene inside it (references/catalogue.md §0).
//
// House rules every device keeps (the user's binding rules): the camera moves only with a purpose (a move that starts,
// travels and lands; a hold may be still); nothing idles up and down (no bobbing, no breathing UI); cards face the
// camera (a turn only as a designed 3D move that lands facing); one accent; every number at 60 fps and 1080p (f@60,
// px@1080), converted with the film's fps and size.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor, toOklch } from '../../lib/color';
import { type FilmCtx, fpsOf, sizeOf, uOf } from '../../lib/film';

/** The inks a device draws in (a ground family's inks fit: fx/Grounds FamilyInks). */
export type Pal = { ground: string; type: string; mute: string; accent: string; surface: string; line: string; dark: boolean };
/** A box in film px. */
export type Box = { x: number; y: number; w: number; h: number };
/** The product's scene at its own frame: a full-frame node (W x H). */
export type SceneAt = (f: number) => React.ReactNode;
/** A word of a line and whether it is the key word (marked *like this* in the script). */
export type Word = { word: string; key: boolean };

/** What every picture device draws from. `f` frames since the device's beat began (negative while a seam brings it in),
 * `dur` its length, `start` the frame it is seen whole (after a line in front of it has left), `hits` the frames of its
 * own moments (on the music's grid), `scene` the product's scene, `focus` the box of the product's moment in scene px. */
export type PictureProps = { f: number; dur: number; start?: number; hits?: number[]; pal: Pal; seed?: number; scene: SceneAt; focus?: Box; radius?: number; uid?: string };
/** What every line device draws from: the line's words, its size, weight and tracking (the film's face), when it is in,
 * whole and leaving (frames since the beat began), the copy id its words carry for the layout audit (data-text). */
export type LineProps = {
  f: number; dur: number; words: Word[]; id: string; size: number; weight: number; track: number; font: string; pal: Pal;
  resolved: number; out: number; seed?: number; scene?: SceneAt; focus?: Box; radius?: number; uid?: string; cy?: number;
};

/** This film's frames for a count written at 60 fps. */
export const k60 = (film?: Partial<FilmCtx>) => fpsOf(film) / 60;
/** The film's frame size and layout unit. */
export const frameOf = (film?: Partial<FilmCtx>) => {
  const { width, height } = sizeOf(film);
  return { W: width, H: height, u: uOf(film) };
};
/** The whole frame as a box. */
export const frameBox = (film?: Partial<FilmCtx>): Box => {
  const { W, H } = frameOf(film);
  return { x: 0, y: 0, w: W, h: H };
};
/** A box's centre. */
export const centreOf = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** A box mixed toward another (a log scale on the sizes, so a growth reads as even). */
export const mixBox = (a: Box, b: Box, t: number): Box => {
  const lm = (p: number, q: number) => Math.exp(mix(Math.log(Math.max(1e-3, p)), Math.log(Math.max(1e-3, q)), t));
  const w = lm(a.w, b.w);
  const h = lm(a.h, b.h);
  const ca = centreOf(a);
  const cb = centreOf(b);
  return { x: mix(ca.x, cb.x, t) - w / 2, y: mix(ca.y, cb.y, t) - h / 2, w, h };
};
/** A box grown by `p` of its size on every side (negative shrinks). */
export const padBox = (b: Box, p: number): Box => ({ x: b.x - b.w * p, y: b.y - b.h * p, w: b.w * (1 + 2 * p), h: b.h * (1 + 2 * p) });

/** A deterministic hash in [0, 1) of a seed and an index (never Math.random). */
export const hash01 = (seed: number, i: number) => {
  let h = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * `n` onsets over `span` frames from 0, phrased (never a metronome): 'settle' (each gap shorter than the one before, by
 * `r`), 'rush' (each longer), 'even' only on request. The first onset is 0.
 */
export const phrased = (n: number, span: number, shape: 'settle' | 'rush' | 'even' = 'settle', r = 0.78): number[] => {
  if (n <= 1) return [0];
  const gaps = Array.from({ length: n - 1 }, (_, i) => (shape === 'even' ? 1 : shape === 'settle' ? r ** i : r ** (n - 2 - i)));
  const total = gaps.reduce((a, b) => a + b, 0);
  const out = [0];
  for (const g of gaps) out.push(out[out.length - 1] + (g / total) * span);
  return out;
};

/** The frame of the device's k-th moment: its hit when the beat gives one, else a share of the time after `start`. */
export const momentAt = (hits: number[] | undefined, k: number, start: number, dur: number, share: number) =>
  hits && hits[k] !== undefined && hits[k] > start ? hits[k] : start + (dur - start) * share;

/** How the scene's focus box `focus` maps into `box`: scale and offset of the whole scene (contain or cover). */
export const fitInto = (focus: Box, box: Box, fit: 'contain' | 'cover' = 'contain') => {
  const s = fit === 'contain' ? Math.min(box.w / focus.w, box.h / focus.h) : Math.max(box.w / focus.w, box.h / focus.h);
  const c = centreOf(focus);
  const b = centreOf(box);
  return { s, tx: b.x - c.x * s, ty: b.y - c.y * s };
};

/**
 * The product's scene inside a box: the box clips it (rounded), the scene is placed so its focus box fills the box
 * (`fit`), or by an explicit `view` (scale and offset of the whole scene). Laid out at the frame's size and placed by
 * transform, never by left/top.
 */
export const SceneView: React.FC<{ node: React.ReactNode; box: Box; focus?: Box; view?: { s: number; tx: number; ty: number }; radius?: number; fit?: 'contain' | 'cover'; W: number; H: number; style?: React.CSSProperties; clip?: boolean }> = ({ node, box, focus, view, radius = 0, fit = 'contain', W, H, style, clip = true }) => {
  const v = view ?? fitInto(focus ?? { x: 0, y: 0, w: W, h: H }, box, fit);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, overflow: clip ? 'hidden' : 'visible', borderRadius: radius, transform: `translate3d(${box.x.toFixed(3)}px, ${box.y.toFixed(3)}px, 0)`, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate3d(${(v.tx - box.x).toFixed(3)}px, ${(v.ty - box.y).toFixed(3)}px, 0) scale(${v.s.toFixed(5)})` }}>{node}</div>
    </div>
  );
};

/** Whether a colour is light (its content takes dark ink). */
export const isLightColour = (c: string) => toOklch(c)[0] > 0.8;
/** Ink that reads on a fill: white on a mid or dark fill, the palette's dark ink on a light one. */
export const inkFor = (fill: string, pal: Pal) => (toOklch(fill)[0] < 0.66 ? (pal.dark ? pal.type : mixColor(pal.ground, '#ffffff', 0.92)) : pal.dark ? pal.ground : pal.type);

/**
 * The lit face of a card facing the camera (CSS): its fill lit from the key at the top left, a rim on the edges facing
 * it, a tight contact shadow and a wide soft one. Never a flat slab, never an outline.
 */
export const face = (bg: string, pal: Pal, u: number, o: { lift?: number; flat?: boolean } = {}): React.CSSProperties => {
  const lift = o.lift ?? 0;
  const e = (1.5 * u).toFixed(2);
  const light = isLightColour(bg);
  if (pal.dark && light) {
    return {
      background: `linear-gradient(158deg, ${bg} 0%, ${bg} 46%, ${mixColor(bg, pal.ground, 0.08)} 100%)`,
      boxShadow: o.flat ? 'none' : `inset 0 ${(-2.5 * u).toFixed(2)}px 0 ${mixColor(bg, pal.ground, 0.16)}, inset 0 ${e}px 0 #ffffff, 0 ${(8 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px rgba(0, 0, 0, ${(0.26 + 0.06 * lift).toFixed(3)}), 0 ${(40 * u + lift * 12 * u).toFixed(1)}px ${(96 * u).toFixed(1)}px rgba(0, 0, 0, ${(0.36 + 0.08 * lift).toFixed(3)})`,
    };
  }
  if (pal.dark || !light) {
    return {
      background: `linear-gradient(152deg, ${mixColor(bg, '#ffffff', 0.09)} 0%, ${bg} 42%, ${mixColor(bg, '#000000', 0.09)} 100%)`,
      boxShadow: o.flat ? 'none' : `inset 0 ${e}px 0 ${mixColor(bg, '#ffffff', 0.32)}, inset ${e}px 0 0 ${mixColor(bg, '#ffffff', 0.18)}, 0 ${(10 * u).toFixed(1)}px ${(22 * u).toFixed(1)}px rgba(0, 0, 0, ${(0.22 + 0.06 * lift).toFixed(3)}), 0 ${(34 * u + lift * 10 * u).toFixed(1)}px ${(80 * u).toFixed(1)}px rgba(0, 0, 0, ${(0.3 + 0.08 * lift).toFixed(3)})`,
    };
  }
  return {
    background: `linear-gradient(160deg, ${bg} 0%, ${bg} 55%, ${mixColor(bg, pal.type, 0.03)} 100%)`,
    boxShadow: o.flat ? 'none' : `inset 0 ${e}px 0 ${mixColor(bg, '#ffffff', 0.9)}, 0 ${(3 * u).toFixed(1)}px ${(8 * u).toFixed(1)}px rgba(0, 0, 0, 0.05), 0 ${(26 * u + lift * 8 * u).toFixed(1)}px ${(64 * u).toFixed(1)}px rgba(0, 0, 0, ${(0.1 + 0.04 * lift).toFixed(3)})`,
  };
};

/** One soft diagonal glare band across a face, at `at` (0..1 of the face's width): a reflection that travels only
 * when the object moves (a turn, a slide), never on its own. */
export const Glare: React.FC<{ w: number; h: number; r: number; at: number; strength?: number }> = ({ w, h, r, at, strength = 0.16 }) => {
  const p = at * 100;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: r, pointerEvents: 'none', background: `linear-gradient(115deg, rgba(255, 255, 255, 0) ${(p - 16).toFixed(2)}%, rgba(255, 255, 255, ${strength.toFixed(3)}) ${p.toFixed(2)}%, rgba(255, 255, 255, 0) ${(p + 18).toFixed(2)}%)` }} />;
};

/** A contact shadow on the ground under an object (an ellipse, soft), `w` wide at (cx, cy). */
export const ContactShadow: React.FC<{ cx: number; cy: number; w: number; h?: number; opacity?: number; dark: boolean }> = ({ cx, cy, w, h, opacity = 1, dark }) => {
  const hh = h ?? w * 0.12;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: hh, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(0, 0, 0, ${(dark ? 0.5 : 0.2) * opacity}), rgba(0, 0, 0, 0))`, transform: `translate3d(${(cx - w / 2).toFixed(2)}px, ${(cy - hh / 2).toFixed(2)}px, 0)` }} />;
};

/** Progress of a move from frame a over `d` frames on `ease` (clamped). */
export const run = (f: number, a: number, d: number, ease: (t: number) => number = E.strongInOut) => ease(clamp((f - a) / Math.max(1e-6, d)));

/** The house recipe and parameter card every device exports (the catalogue and the test read them). */
export type Recipe = { id: string; recipe: string; params: Record<string, number | string | boolean | readonly (number | string)[]> };

/** A device's parameter overrides: any of its house numbers, widened (a film may pass any value, not only the house's). */
export type Params<T> = { [K in keyof T]?: T[K] extends number ? number : T[K] extends string ? string : T[K] extends boolean ? boolean : T[K] extends readonly number[] ? readonly number[] : T[K] };
