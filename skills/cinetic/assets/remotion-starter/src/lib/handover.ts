// The handover: ONE element carried across a change of scene. The outgoing scene k draws the element in its own frame
// under its own camera; the incoming scene k + 1 draws its next form in another frame under another camera. Between
// them the element is one object: its box, corner radius, fill, rim, shadow, blur and content morph from the out box
// (scene k, live or sampled at t0) to the in box (scene k + 1, live or sampled at t1), so the cut between the two scenes
// never shows. lib/spine.ts holds the fourteen kinds (H1-H14) with their house frames; this file is their geometry;
// fx/Handover.tsx draws them.
//
//   size     on a log scale (a 40 px chip and a 900 px page meet at a constant perceived speed)
//   path     the centres on a soft arc (a thrown object rises a little; an in-place change does not arc)
//   colour   fill and rim mixed in OKLCH (lightness and chroma straight, the hue the short way round, alpha straight)
//   content  never scaled: each side's content is laid out at its own size and rides the clipping box (or stays home
//            while the box reveals it: an iris, a porthole). It fades (A out over the first 35 %, B in over the last
//            40 %) or swaps in one frame at the smallest or most blurred frame (the cut)
//   blur     a level, drawn by the component as at most two fixed ladder copies (lib/defocus), never an animated radius
//   time     closed form in the frame: any frame, any order, sub-frames (motion blur), scrubbing
//
// The moving kinds are fastest on the cut frame (the swap, the most blurred frame, sits there); a swell and a shrink
// jump once on that frame by design (state.snap: under blur). The scene-internal kinds (stay, part, same-surface) and the
// camera kinds (zoom-into, pull-out, momentum) are drawn by the scenes; the state still gives their box track and, for
// the camera kinds, each scene's transform. handoverDeclares() writes one seam per handover with the element's box on
// every frame, so out/cues.json can carry its track. Node-safe: no React, no DOM.
import { MASK } from '../brand/tokens';
import { clamp, E, type Ease, M } from './anim';
import { type Shot, toScreen } from './camera';
import { oklch, toOklch } from './color';
import { type FilmCtx, fpsOf, sizeOf } from './film';
import { carry, launch } from './handoff';
import { type Form, type HandoverKind, HANDOVERS, handoverFrames } from './spine';
import type { Declares, Seam } from '../timeline';

export type { Form, HandoverKind } from './spine';

// ---------------------------------------------------------------------------------------------------- house numbers

/** House numbers of the drawn handovers: px at 1080p, f@60, shares of the span (u) or of the travel. */
export const HANDOVER_LOOK = {
  arc: { share: 0.08, max: 0.06 }, // the arc's height: a share of the travel, at most a share of the frame height
  flyArc: { share: 0.16, max: 0.1 }, // a thrown element rises more
  fade: { aOut: [0, 0.35], bIn: [0.6, 1] }, // content A out over the first 35 %, B in over the last 40 % (the house morph)
  cross: { aOut: [0.15, 0.5], bIn: [0.45, 0.8] }, // grow: the contents cross-blur round the middle, never an empty slab in flight
  swellIn: 0.3, // swell: the new content blooms in over the first 30 % of the settle from 15 % (its first frame is under the blur)
  contentBlur: 10, // a fading content layer's blur at opacity 0 (it sharpens as it arrives)
  shrinkBlur: 16, // the collapse's blur at the cut (12-20)
  shrinkJump: [0.5, 0.86], // the collapse reaches half its log size by the cut, then jumps under the blur (a one-frame snap)
  swell: 0.5, // +40-60 %
  swellBlur: 6,
  press: { depth: 0.88, down: 6, back: 12, drain: 10 }, // the squeeze to 88 % and back (f@60), then the drain
  pointPx: 16, // converge: the point's size
  convergeBlur: 6,
  spark: 0.85, // converge: how far the point lights up toward white as the many meet (a spark the next element grows from)
  zoom: { ramp: 8, carry: 1 / 3, decay: 0.85 }, // zoom-into: the push eases on over `ramp` f@60; the next scene keeps a third of the last step
  momentum: { v: 48, build: 1.25, ratio: 0.7, decay: 0.915, residual: 0.5, smear: 9 }, // px per f@60 at 1080p
  blend: 0, // f@60 the scenes' own copies cross with the handover's at either end (0: an exact hand-off)
  minPx: 2, // the smallest box drawn
  whole: 0.85, // a side covering this share of the frame is the whole scene (the next scene waits for it to land, or shows round it)
} as const;

// ---------------------------------------------------------------------------------------------------- types

/** A box on screen, film px. */
export type HBox = { x: number; y: number; w: number; h: number };
/** Where a side's element is: a fixed box or the box at frame f (its scene's layout under its scene's camera). */
export type BoxAt = HBox | ((f: number) => HBox);
export type Rim = { color: string; a: number; w: number };
export type Shadow = { y: number; blur: number; a: number };

/** One side of a handover: what the element is there and where its scene draws it. */
export type HandSide = {
  form: Form;
  box: BoxAt; // film px on screen, under this side's own camera
  at?: number; // sample the box at this frame only (the out side at t0, the in side at t1); default live
  r?: number; // corner radius, film px (default by form: a pill or a button is round, a card 22 px, a page 14 px at 1080p)
  fill?: string; // the face (hex, rgb(), rgba()); none: the element is its content
  rim?: Partial<Rim>;
  shadow?: Partial<Shadow>;
  blur?: number; // its own resting blur, px at 1080p
  many?: BoxAt[]; // converge: the many that collapse to the point
  picture?: boolean; // its content is a picture (a photo, a thumbnail, a plate): it scales with the box to cover it, so a tile
  //                   growing into its photo stays one picture (UI content, text and rows, never scales)
};

export type HandoverSpec = {
  kind: HandoverKind;
  at: number; // the cut: the incoming scene's first frame
  from: HandSide;
  to: HandSide;
  element?: string; // the element's id (declares)
  lead?: number; // f@60 before the cut (house: lib/spine HANDOVERS)
  land?: number; // f@60 after it
  point?: { x: number; y: number }; // converge: where the many meet (default the in box's centre)
  dir?: 'left' | 'right' | 'up' | 'down'; // momentum (house left)
  arc?: number; // the arc's height as a share of the travel (house per kind)
  blend?: number; // f@60 of cross with the scenes' own copies at either end (house 0)
  id?: string;
};

/** The element as drawn at one frame. */
export type ElementState = {
  show: boolean; // the handover draws the element on this frame
  shape: HBox; // the drawn shape (an iris's circle may run past the frame)
  box: HBox; // what is visible of it (the shape inside the frame): the track
  r: number;
  circle: boolean; // drawn as a circle (iris, press-open's porthole) clipping its content
  fill: string;
  rim: Rim;
  shadow: Shadow;
  opacity: number;
  blur: number; // px at 1080p
  smear: { v: number; angle: number }; // the centre's speed (px per film frame) and its direction (deg)
  content: { a: number; b: number; blurA: number; blurB: number; show: 'a' | 'b'; scaleA: number; scaleB: number }; // scale: a picture side covers the box; a converge's next element pops up whole from the point
  size: { a: { w: number; h: number }; b: { w: number; h: number } }; // each content's layout size: constant (a picture or a pop scales it about its centre)
  place: { a: { x: number; y: number }; b: { x: number; y: number } }; // each content's top-left on screen
  many: { box: HBox; r: number; opacity: number; size: { w: number; h: number } }[];
};

/** How to draw one of the two scenes on this frame: shown, its opacity, a move (px), a scale about (ox, oy), blur, smear, an iris clip. */
export type SceneLayer = { show: boolean; opacity: number; x: number; y: number; scale: number; ox: number; oy: number; blur: number; smear: number; axis: 'x' | 'y'; clip: { x: number; y: number; w: number; h: number; r: number } | null };

export type HandoverState = {
  kind: HandoverKind;
  f: number;
  t0: number;
  t1: number;
  at: number;
  u: number; // progress through the span, 0..1
  phase: 'before' | 'lead' | 'land' | 'after';
  active: boolean; // t0 <= f < t1
  swap: number; // the frame the content swaps on (the cut)
  snap: boolean; // a designed one-frame jump on this frame (swell, shrink), under blur
  draws: boolean; // the handover draws the element (false: the scenes do; the state is the track)
  el: ElementState;
  /** the scenes' own copies of the element: the opacity to draw them at (0 while the handover draws it) */
  hide: { out: number; in: number };
  scenes: { out: SceneLayer; in: SceneLayer };
};

// ---------------------------------------------------------------------------------------------------- helpers

const mixN = (a: number, b: number, t: number) => a + (b - a) * t;
const lmixN = (a: number, b: number, t: number) => Math.exp(Math.log(Math.max(1e-3, a)) + (Math.log(Math.max(1e-3, b)) - Math.log(Math.max(1e-3, a))) * t);
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const win = (u: number, a: number, b: number) => (b > a ? smooth((u - a) / (b - a)) : u >= b ? 1 : 0);
const centre = (b: HBox) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const fromCentre = (cx: number, cy: number, w: number, h: number): HBox => ({ x: cx - w / 2, y: cy - h / 2, w, h });

/** A side's box at frame f (its own `at` when it is sampled once). */
export const boxAt = (b: BoxAt, f: number): HBox => (typeof b === 'function' ? b(f) : b);
const sideBox = (s: HandSide, f: number): HBox => {
  const b = boxAt(s.box, s.at ?? f);
  return { x: b.x, y: b.y, w: Math.max(0, b.w), h: Math.max(0, b.h) };
};

/** A box in a scene's world under the anchor camera of lib/camera (a flat Shot: no yaw, pitch or roll) as a box on screen. */
export const underShot = (world: BoxAt, shot: Shot | ((f: number) => Shot)): ((f: number) => HBox) => (f) => {
  const s = typeof shot === 'function' ? shot(f) : shot;
  const b = boxAt(world, f);
  const p = toScreen(s, b);
  return { x: p.x, y: p.y, w: b.w * s.k, h: b.h * s.k };
};
/** A box scaled by k about (ox, oy). */
export const scaleAbout = (b: HBox, k: number, ox: number, oy: number): HBox => ({ x: ox + (b.x - ox) * k, y: oy + (b.y - oy) * k, w: b.w * k, h: b.h * k });
/** The part of a box inside the frame. */
export const clipToFrame = (b: HBox, W: number, H: number): HBox => {
  const x0 = Math.max(0, b.x);
  const y0 = Math.max(0, b.y);
  const x1 = Math.min(W, b.x + b.w);
  const y1 = Math.min(H, b.y + b.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
};

/**
 * Two curves joined at uc with their speeds matched: `inE` (a leave curve: accelerating into the cut) carries the move
 * to share m of its path by uc, `outE` (an arrive curve: decelerating) the rest, with m chosen so the speed is the same
 * on both sides of the cut. So the fastest frame (the most smeared, where the content swaps) is the cut. Pure.
 */
export const cutCurve = (u: number, uc: number, inE: Ease = E.launchIn, outE: Ease = E.glideOut): number => {
  const t = clamp(u);
  if (uc <= 1e-6) return outE(t);
  if (uc >= 1 - 1e-6) return inE(t);
  const h = 1e-3;
  const a = (inE(1) - inE(1 - h)) / h; // end slope of the leave curve
  const b = (outE(h) - outE(0)) / h; // start slope of the arrive curve
  const m = b / (1 - uc) / (a / uc + b / (1 - uc));
  return t < uc ? m * inE(t / uc) : m + (1 - m) * outE((t - uc) / (1 - uc));
};

// colour: OKLCH with alpha
const alphaOf = (c: string): number => {
  const m = c.trim().match(/^rgba\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,/]+([\d.]+)\s*\)/i);
  if (m) return clamp(Number(m[1]));
  const h = c.trim().replace('#', '');
  if (/^[0-9a-f]{8}$/i.test(h)) return parseInt(h.slice(6, 8), 16) / 255;
  if (/^[0-9a-f]{4}$/i.test(h)) return parseInt(h[3] + h[3], 16) / 255;
  return c.trim() === 'transparent' ? 0 : 1;
};
const rgbPart = (c: string) => (c.trim() === 'transparent' ? 'rgba(0, 0, 0, 0)' : c);
/** A colour at alpha a ('rgba(...)'), from hex or rgb()/rgba(). */
export const withAlpha = (c: string, a: number) => {
  const m = oklchParts(c);
  const s = oklch(m[0], m[1], m[2]);
  const n = s.match(/rgb\((\d+), (\d+), (\d+)\)/);
  return n ? `rgba(${n[1]}, ${n[2]}, ${n[3]}, ${clamp(a).toFixed(3)})` : s;
};
const oklchParts = (c: string): [number, number, number] => toOklch(rgbPart(c).replace(/^(#[0-9a-f]{6})[0-9a-f]{2}$/i, '$1'));
/**
 * The key across an element's face (a CSS background to lay over its fill): it falls off from the upper left, a shade
 * toward the far corner on a light face, a lift at the key on a dark one, so the carried container is a lit object in
 * flight, never a flat slab (the kit Card's face does the same at rest). None on a clear or mostly clear fill. Pure.
 */
export const faceKey = (fill: string): string | undefined => {
  if (alphaOf(fill) < 0.5) return undefined;
  return oklchParts(fill)[0] >= 0.5
    ? 'radial-gradient(130% 115% at 20% 0%, rgba(0, 0, 0, 0) 38%, rgba(0, 0, 0, 0.04) 100%)'
    : 'radial-gradient(120% 100% at 18% 0%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 70%)';
};
/**
 * Two colours mixed in OKLCH at t: lightness and chroma straight, the hue the short way round (a grey takes the other
 * colour's hue, so a white button draining to blue never passes through green), alpha straight. -> 'rgba(...)'.
 */
export const mixOklch = (a: string, b: string, t: number): string => {
  const k = clamp(t);
  const [L1, C1, h1] = oklchParts(a);
  const [L2, C2, h2] = oklchParts(b);
  const g1 = C1 < 0.02 ? h2 : h1;
  const g2 = C2 < 0.02 ? h1 : h2;
  let dh = g2 - g1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const rgb = oklch(mixN(L1, L2, k), mixN(C1, C2, k), (g1 + dh * k + 360) % 360);
  const al = mixN(alphaOf(a), alphaOf(b), k);
  const n = rgb.match(/rgb\((\d+), (\d+), (\d+)\)/);
  return n ? `rgba(${n[1]}, ${n[2]}, ${n[3]}, ${al.toFixed(3)})` : rgb;
};

/** The corner radius a form gets when its side gives none (film px; u: the film's unit). */
export const radiusFor = (form: Form, b: HBox, u = 1): number => {
  const half = Math.min(b.w, b.h) / 2;
  const r = ({ word: half, pill: half, chip: half, button: half, count: half, mark: 0.22 * Math.min(b.w, b.h), card: 22 * u, page: 14 * u, window: 18 * u, list: 18 * u, notice: 18 * u, thread: 20 * u, photo: 14 * u, world: 0 } as Record<Form, number>)[form];
  return Math.max(0, Math.min(half, r));
};

const rimOf = (s: HandSide): Rim => ({ color: s.rim?.color ?? 'rgba(255, 255, 255, 0)', a: s.rim?.a ?? (s.rim?.color ? 1 : 0), w: s.rim?.w ?? (s.rim?.color ? 1.5 : 0) });
const shadowOf = (s: HandSide): Shadow => ({ y: s.shadow?.y ?? 0, blur: s.shadow?.blur ?? 0, a: s.shadow?.a ?? 0 });

// ---------------------------------------------------------------------------------------------------- spans

/** A handover's frames at the film's rate: [lead, land] in film frames (the spec's f@60 overrides, else the house). */
export const handoverLeadLand = (spec: Pick<HandoverSpec, 'kind' | 'lead' | 'land'>, film?: Partial<FilmCtx>): [number, number] => {
  const fps = fpsOf(film);
  const [l0, d0] = handoverFrames(spec.kind, fps);
  const k = fps / 60;
  return [spec.lead !== undefined ? Math.max(0, Math.round(spec.lead * k)) : l0, spec.land !== undefined ? Math.max(1, Math.round(spec.land * k)) : d0];
};
/** The frames a handover spans, [t0, t1): from `lead` before the cut to `land` after it. */
export const handoverSpan = (spec: Pick<HandoverSpec, 'kind' | 'at' | 'lead' | 'land'>, film?: Partial<FilmCtx>): [number, number] => {
  const [lead, land] = handoverLeadLand(spec, film);
  return [spec.at - lead, spec.at + land];
};

// ---------------------------------------------------------------------------------------------------- the state

const restLayer = (show: boolean, W: number, H: number): SceneLayer => ({ show, opacity: 1, x: 0, y: 0, scale: 1, ox: W / 2, oy: H / 2, blur: 0, smear: 0, axis: 'x', clip: null });

/**
 * The handover at frame f: the element (box, radius, fill, rim, shadow, blur, smear, content and where it sits), the
 * scenes' own copies' opacity, and how to draw each scene (the camera kinds move them). Pure and closed form.
 */
export const handoverState = (f: number, spec: HandoverSpec, film?: Partial<FilmCtx>): HandoverState => {
  const fps = fpsOf(film);
  const { width: W, height: H } = sizeOf(film);
  const U = Math.min(W, H) / 1080;
  const L = HANDOVER_LOOK;
  const kind = spec.kind;
  const house = HANDOVERS[kind];
  const [lead, land] = handoverLeadLand(spec, film);
  const at = spec.at;
  const t0 = at - lead;
  const t1 = at + land;
  const span = Math.max(1, t1 - t0);
  const uc = lead / span;
  const k60 = 60 / fps; // f@60 per film frame
  const active = f >= t0 && f < t1;
  const phase: HandoverState['phase'] = f < t0 ? 'before' : f < at ? 'lead' : f < t1 ? 'land' : 'after';
  const draws = house.draws === 'handover';

  // the geometry at any frame g (also used one frame back, for the speed)
  const geo = (g: number) => {
    const u = clamp((g - t0) / span);
    const A = sideBox(spec.from, g);
    const B = sideBox(spec.to, g);
    const cA = centre(A);
    const cB = centre(B);
    const dist = Math.hypot(cB.x - cA.x, cB.y - cA.y);
    const look = kind === 'fly' ? L.flyArc : L.arc;
    const arcH = Math.min(look.max * H, (spec.arc ?? look.share) * dist);
    let p = 0; // geometry progress A -> B
    let s = 1; // extra scale about the centre (a swell, a press)
    let blur = 0;
    let q = 0; // fill progress
    let arc = 0;
    let snapNow = false;
    let shape: HBox | null = null;
    let circle = false;
    const v = (x: number) => clamp((x - uc) / Math.max(1e-6, 1 - uc)); // progress through the land
    const w0 = (x: number) => clamp(x / Math.max(1e-6, uc)); // progress through the lead
    switch (kind) {
      case 'grow': {
        p = cutCurve(u, uc, E.buildIn, E.glideOut);
        q = p;
        arc = arcH;
        break;
      }
      case 'shrink': {
        const [half, after] = L.shrinkJump;
        if (u < uc) {
          p = half * E.buildIn(w0(u));
          blur = L.shrinkBlur * w0(u) ** 2;
        } else {
          const e = E.snapOut(v(u));
          p = after + (1 - after) * e;
          blur = L.shrinkBlur * (1 - e);
        }
        snapNow = Math.round(g) === at && lead > 0;
        q = p;
        break;
      }
      case 'swell': {
        if (u < uc) {
          s = 1 + L.swell * M.swell(w0(u));
          blur = L.swellBlur * w0(u) ** 3;
          q = 0;
        } else {
          const e = E.snapOut(v(u));
          p = e;
          q = e;
          blur = L.swellBlur * clamp(1 - v(u) / 0.3);
        }
        snapNow = Math.round(g) === at && lead > 0;
        break;
      }
      case 'press-open': {
        const tau = (g - t0) * k60; // f@60 into the handover
        const P = L.press;
        if (u < uc) {
          s = tau < P.down ? 1 - (1 - P.depth) * M.press(clamp(tau / P.down)) : tau < P.back ? P.depth + (1 - P.depth) * E.snapOut(clamp((tau - P.down) / (P.back - P.down))) : 1;
          q = smooth((tau - P.back) / P.drain);
        } else {
          p = E.glideOut(v(u));
          q = 1;
        }
        circle = true;
        break;
      }
      case 'iris': {
        // from the element's own shape (a dot, a button, a pill: round ends) to a circle that covers the frame
        const corners = [
          [0, 0],
          [W, 0],
          [0, H],
          [W, H],
        ].map(([x, y]) => Math.hypot(x - cA.x, y - cA.y));
        const D = 2 * Math.max(...corners) + 2;
        const e = E.glideOut(u);
        shape = fromCentre(cA.x, cA.y, lmixN(Math.max(L.minPx * U, A.w), D, e), lmixN(Math.max(L.minPx * U, A.h), D, e));
        circle = true;
        q = smooth(u / 0.3);
        p = 0;
        break;
      }
      case 'fly': {
        p = cutCurve(u, uc, E.launchIn, E.glideOut);
        q = p;
        arc = arcH;
        break;
      }
      case 'converge': {
        const P0 = spec.point ?? cB;
        const pt = L.pointPx * U;
        if (u < uc) {
          const e = E.buildIn(w0(u));
          const w = lmixN(Math.max(pt, A.w), pt, e);
          const h = lmixN(Math.max(pt, A.h), pt, e);
          shape = fromCentre(mixN(cA.x, P0.x, e), mixN(cA.y, P0.y, e), w, h);
          q = 0;
        } else {
          const e = E.snapOut(v(u));
          const w = lmixN(pt, Math.max(pt, B.w), e);
          const h = lmixN(pt, Math.max(pt, B.h), e);
          shape = fromCentre(mixN(P0.x, cB.x, e), mixN(P0.y, cB.y, e), w, h);
          q = 1;
          p = e;
        }
        blur = L.convergeBlur * Math.max(0, 1 - Math.abs(u - uc) / Math.max(1e-6, 0.25));
        break;
      }
      case 'word':
      case 'stay':
      case 'part': {
        p = (kind === 'part' ? E.snapOut : E.glideOut)(u);
        q = p;
        break;
      }
      case 'same-surface': {
        p = E.glideOut(u);
        q = p;
        break;
      }
      case 'zoom-into':
      case 'pull-out':
      case 'momentum': {
        p = u < uc ? 0 : 1;
        q = p;
        break;
      }
    }
    if (!shape) {
      const w = lmixN(Math.max(L.minPx * U, A.w), Math.max(L.minPx * U, B.w), p) * s;
      const h = lmixN(Math.max(L.minPx * U, A.h), Math.max(L.minPx * U, B.h), p) * s;
      shape = fromCentre(mixN(cA.x, cB.x, p), mixN(cA.y, cB.y, p) - arc * Math.sin(Math.PI * p), w, h);
    }
    return { u, A, B, p, s, blur, q, shape, circle, snap: snapNow };
  };

  const G = geo(f);
  const { A, B, u } = G;
  let shape = G.shape;

  // the camera kinds: each scene's transform, the element's box carried by it
  const out = restLayer(f < at, W, H);
  const inn = restLayer(f >= at, W, H);
  if (kind === 'zoom-into' || kind === 'pull-out') {
    // both boxes as they stand on the cut, so the element is the same box on both sides of it (each side under its own camera)
    const A0 = sideBox(spec.from, at);
    const B1 = sideBox(spec.to, at);
    const cA = centre(A0);
    const cB = centre(B1);
    const Z = L.zoom;
    if (kind === 'zoom-into') {
      // push into A until it fills the frame on the cut, about the point that lands it centred
      const kNeed = Math.max(1.0001, Math.max(W / Math.max(1, A0.w), H / Math.max(1, A0.h)));
      const ox = (cA.x * kNeed - W / 2) / (kNeed - 1);
      const oy = (cA.y * kNeed - H / 2) / (kNeed - 1);
      const leadF = Math.max(1, lead) * k60;
      const ramp = Math.min(Z.ramp, leadF);
      const r = Math.log(kNeed) / Math.max(1e-6, leadF - ramp / 2); // ln-scale per f@60 at full rate
      const tau = clamp((f - t0) * k60, 0, leadF);
      const logS = tau <= ramp ? (r * tau * tau) / (2 * ramp) : r * (ramp / 2 + tau - ramp);
      Object.assign(out, { scale: Math.exp(logS), ox, oy });
      const d = Z.decay ** k60;
      const step = r * Z.carry * k60; // a third of the push's last step, ln-scale per film frame
      const n = Math.max(0, f - at);
      Object.assign(inn, { scale: Math.exp((-step * d ** n) / (1 - d)), ox: cB.x, oy: cB.y });
      shape = f < at ? scaleAbout(A, out.scale, ox, oy) : scaleAbout(B, inn.scale, cB.x, cB.y);
    } else {
      // one log-scale pull about one point: the detail's scene before the cut, the bigger scene after it
      const k1 = Math.sqrt((Math.max(1, A0.w) * Math.max(1, A0.h)) / Math.max(1, B1.w * B1.h));
      const k0 = Math.abs(Math.log(k1)) < 1e-3 ? 1.001 : k1;
      const ox = (cA.x - cB.x * k0) / (1 - k0);
      const oy = (cA.y - cB.y * k0) / (1 - k0);
      const lam = Math.log(k0) * (1 - E.strongInOut(u));
      Object.assign(out, { scale: Math.exp(lam - Math.log(k0)), ox, oy });
      Object.assign(inn, { scale: Math.exp(lam), ox, oy });
      shape = f < at ? scaleAbout(A, out.scale, ox, oy) : scaleAbout(B, inn.scale, ox, oy);
    }
  } else if (kind === 'momentum') {
    const Mo = L.momentum;
    const dir = spec.dir ?? 'left';
    const [dx, dy] = dir === 'left' ? [-1, 0] : dir === 'right' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
    const cut = at - 1; // the outgoing scene's last, fastest frame
    const vF = Mo.v * U * k60; // the cut speed, px per film frame (the house number is per f@60 at 1080p)
    const lo = launch(f, cut, { vCut: vF, ratio: Mo.build, fps });
    // the outgoing travel from the handover's first frame (the launch's long, faint tail before it is left out)
    const o = f < t0 ? 0 : lo.x - launch(t0, cut, { vCut: vF, ratio: Mo.build, fps }).x;
    const opts = { v0: Mo.ratio * vF, decay: Mo.decay, fast: { share: 0, decay: 0.4 }, residual: Mo.residual, fps };
    const ci = carry(f, cut, opts);
    const home = carry(at + 24 / k60, cut, opts).x; // home 24 f@60 after the cut
    const i = ci.x - home;
    const axis: 'x' | 'y' = dx ? 'x' : 'y';
    const fast = (v: number) => Math.abs(v) / k60 > Mo.smear * U; // smeared above 9 px per f@60
    Object.assign(out, { x: dx * o, y: dy * o, axis, smear: fast(lo.v) && f < at ? (dx + dy) * lo.v : 0 });
    Object.assign(inn, { x: dx * i, y: dy * i, axis, smear: fast(ci.v) && f >= at ? (dx + dy) * ci.v : 0 });
    shape = f < at ? { ...A, x: A.x + out.x, y: A.y + out.y } : { ...B, x: B.x + inn.x, y: B.y + inn.y };
  } else if (kind === 'iris') {
    // the outgoing scene stays round the opening shape until it covers the frame; the next one shows inside it
    out.show = f < t1;
    inn.show = f >= t0;
    if (active) inn.clip = { x: shape.x, y: shape.y, w: shape.w, h: shape.h, r: Math.min(shape.w, shape.h) / 2 };
  } else if (draws) {
    // an element that becomes the whole frame (a tile growing into its photo) is the next scene: the next scene waits
    // until it lands (shown under it, the scene's own full-frame copy doubles it at another scale) and the scene it
    // leaves stays round it meanwhile; one that starts as the whole frame (a photo collapsing to a point) reveals the
    // next scene round it from the first frame, so the frame never empties round a shrinking element
    const whole = (b: HBox) => Math.max(0, Math.min(b.x + b.w, W) - Math.max(b.x, 0)) * Math.max(0, Math.min(b.y + b.h, H) - Math.max(b.y, 0)) >= L.whole * W * H;
    if (whole(sideBox(spec.to, spec.to.at ?? t1))) {
      out.show = f < t1;
      inn.show = f >= t1;
    } else if (whole(sideBox(spec.from, spec.from.at ?? t0))) {
      out.show = f < t0;
      inn.show = f >= t0;
    }
  }

  // the look: radius, fill, rim, shadow
  const rA = spec.from.r ?? radiusFor(spec.from.form, A, U);
  const rB = spec.to.r ?? radiusFor(spec.to.form, B, U);
  const q = G.q;
  const fillA = spec.from.fill ?? spec.to.fill ?? 'transparent';
  const fillB = spec.to.fill ?? spec.from.fill ?? 'transparent';
  let fill = q <= 0 ? mixOklch(fillA, fillA, 0) : q >= 1 ? mixOklch(fillB, fillB, 0) : mixOklch(fillA, fillB, q);
  // converge: the point is a spark: the face lights toward white as the many meet and cools into the next element
  if (kind === 'converge' && active) fill = mixOklch(fill, 'rgba(255, 255, 255, 1)', L.spark * Math.max(0, 1 - Math.abs(u - uc) / Math.max(1e-6, 0.3)));
  const ra = rimOf(spec.from);
  const rb = rimOf(spec.to);
  const rim: Rim = { color: mixOklch(ra.color, rb.color, q), a: mixN(ra.a, rb.a, q), w: mixN(ra.w, rb.w, q) };
  const sa = shadowOf(spec.from);
  const sb = shadowOf(spec.to);
  const shadow: Shadow = { y: mixN(sa.y, sb.y, q), blur: mixN(sa.blur, sb.blur, q), a: mixN(sa.a, sb.a, q) };
  const circle = kind === 'iris';
  let r: number;
  if (kind === 'iris') r = shape.w / 2;
  else if (kind === 'press-open' && u < uc) r = Math.min(shape.w, shape.h) / 2;
  else {
    const p = clamp(G.p);
    r = mixN(rA * (kind === 'swell' && u < uc ? G.s : 1), rB, kind === 'swell' && u < uc ? 0 : p);
  }
  r = clamp(r, 0, Math.min(shape.w, shape.h) / 2);
  const blur = Math.max(0, G.blur + mixN(spec.from.blur ?? 0, spec.to.blur ?? 0, clamp(G.p)));

  // the content: sizes fixed at each side's own box (sampled where its scene hands it over), riding the box or home
  const Asz = sideBox(spec.from, spec.from.at ?? t0);
  const Bsz = sideBox(spec.to, spec.to.at ?? t1);
  const mode = house.content;
  let ca = 0;
  let cb = 0;
  let show: 'a' | 'b' = f < at ? 'a' : 'b';
  if (mode === 'fade') {
    let aw: [number, number] = [L.fade.aOut[0], L.fade.aOut[1]];
    let bw: [number, number] = [L.fade.bIn[0], L.fade.bIn[1]];
    if (kind === 'grow') {
      aw = [L.cross.aOut[0], L.cross.aOut[1]];
      bw = [L.cross.bIn[0], L.cross.bIn[1]];
    } else if (kind === 'press-open') {
      const P = L.press;
      aw = [(P.back / k60 / span), ((P.back + P.drain) / k60 / span)];
      bw = [uc, uc + 0.12 * (1 - uc)];
    } else if (kind === 'iris') {
      aw = [0, 0.25];
      bw = [0, 0];
    }
    ca = 1 - win(u, aw[0], aw[1]);
    cb = bw[1] > bw[0] ? win(u, bw[0], bw[1]) : u >= bw[0] ? 1 : 0;
    // picture into picture: the next one develops over the last, which stays whole under it (two half-faded pictures
    // over a clear face read as a dip to the ground mid-flight)
    if (spec.from.picture && spec.to.picture) ca = cb >= 1 - 1e-6 ? 0 : 1;
    show = ca >= cb ? 'a' : 'b';
  } else if (mode === 'swap') {
    ca = f < at ? 1 : 0;
    cb = f < at ? 0 : kind === 'swell' ? smooth(((f - at) / span / Math.max(1e-6, 1 - uc)) / L.swellIn + 0.15) : 1;
  } else if (mode === 'keep') {
    ca = 1;
    cb = 0;
    show = 'a';
  }
  const blurA = mode === 'fade' ? L.contentBlur * (1 - ca) : 0;
  const blurB = mode === 'fade' ? L.contentBlur * (1 - cb) : 0;
  const c = centre(shape);
  const home = kind === 'iris' || kind === 'press-open';
  const placeA = { x: c.x - Asz.w / 2, y: c.y - Asz.h / 2 };
  const placeB = home ? { x: B.x, y: B.y } : { x: c.x - Bsz.w / 2, y: c.y - Bsz.h / 2 };
  // a picture covers the shape it rides (the same photo at the same framing on both sides, so the two never double); a
  // converge's next element grows out of the point whole (contained, never clipped mid-text), then sits at its own size
  const cover = (sz: { w: number; h: number }) => Math.max(shape.w / Math.max(1, sz.w), shape.h / Math.max(1, sz.h));
  const contain = (sz: { w: number; h: number }) => Math.min(shape.w / Math.max(1, sz.w), shape.h / Math.max(1, sz.h));
  const scaleA = spec.from.picture && !home ? cover(Asz) : 1;
  const scaleB = home ? 1 : spec.to.picture ? cover(Bsz) : kind === 'converge' && f >= at ? Math.min(1, contain(Bsz)) : 1;

  // converge: the many, each collapsing to the point
  const many: ElementState['many'] = [];
  if (kind === 'converge' && spec.from.many?.length && u < uc) {
    const P0 = spec.point ?? centre(B);
    const pt = L.pointPx * U;
    const e = E.buildIn(clamp(u / Math.max(1e-6, uc)));
    for (const mb of spec.from.many) {
      const b = boxAt(mb, spec.from.at ?? f);
      const cb2 = centre(b);
      const w = lmixN(Math.max(pt, b.w), pt, e);
      const h = lmixN(Math.max(pt, b.h), pt, e);
      const bx = fromCentre(mixN(cb2.x, P0.x, e), mixN(cb2.y, P0.y, e), w, h);
      many.push({ box: bx, r: clamp(mixN(rA, Math.min(w, h) / 2, e), 0, Math.min(w, h) / 2), opacity: 1, size: { w: b.w, h: b.h } });
    }
  }

  // speed: the centre one frame back
  let smear = { v: 0, angle: 0 };
  if (active && (kind === 'fly' || kind === 'grow' || kind === 'converge' || kind === 'shrink')) {
    const p0 = centre(geo(f - 1).shape);
    const dxs = c.x - p0.x;
    const dys = c.y - p0.y;
    smear = { v: Math.hypot(dxs, dys), angle: (Math.atan2(dys, dxs) * 180) / Math.PI };
  }

  const blendF = (spec.blend ?? L.blend) / k60;
  const show0 = draws && active;
  const opacity = blendF > 0 ? Math.min(clamp((f - t0) / blendF), clamp((t1 - f) / blendF)) : 1;
  const hide = draws
    ? { out: f < t0 ? 1 : active && blendF > 0 ? 1 - clamp((f - t0) / blendF) : 0, in: f >= t1 ? 1 : active && blendF > 0 ? 1 - clamp((t1 - f) / blendF) : 0 }
    : { out: 1, in: 1 };
  if (kind === 'momentum') hide.out = hide.in = 1;

  const el: ElementState = {
    show: show0,
    shape,
    box: clipToFrame(shape, W, H),
    r,
    circle,
    fill,
    rim,
    shadow,
    opacity,
    blur,
    smear,
    content: { a: ca, b: cb, blurA, blurB, show, scaleA, scaleB },
    size: { a: { w: Asz.w, h: Asz.h }, b: { w: Bsz.w, h: Bsz.h } },
    place: { a: placeA, b: placeB },
    many,
  };
  return { kind, f, t0, t1, at, u, phase, active, swap: at, snap: active && G.snap, draws, el, hide, scenes: { out, in: inn } };
};

/**
 * The scenes' own copy of the element on one side at frame f: draw it at this opacity (0 while the handover draws it).
 * Give it the film (useFilm() in a component; fx/Handover useOwnOpacity does): the house frames are converted at its rate.
 */
export const ownOpacity = (f: number, spec: HandoverSpec, side: 'out' | 'in', film: Partial<FilmCtx>) => handoverState(f, spec, film).hide[side];

// ---------------------------------------------------------------------------------------------------- the track and declares

/** One sample of the element's box on screen: [frame, x, y, w, h] (film px, 0.1 px). */
export type TrackSample = [number, number, number, number, number];

/** The element's visible box on every frame of the handover, t0 .. t1 inclusive. */
export const handoverTrack = (spec: HandoverSpec, film?: Partial<FilmCtx>): TrackSample[] => {
  const [t0, t1] = handoverSpan(spec, film);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const out: TrackSample[] = [];
  for (let f = t0; f <= t1; f++) {
    const s = handoverState(f, spec, film);
    const b = f >= t1 ? clipToFrame(sideBox(spec.to, f), sizeOf(film).width, sizeOf(film).height) : s.el.box;
    out.push([f, r1(b.x), r1(b.y), r1(b.w), r1(b.h)]);
  }
  return out;
};

/** A handover seam: the timeline's seam plus the element's track (export-cues keeps the seam fields; the id names the handover). */
export type HandoverSeam = Seam & { handover: HandoverKind; hid: string; element: string; forms: [Form, Form]; span: [number, number]; swap: number; track: TrackSample[] };

/**
 * What a handover declares: one seam at its cut, of the kind the seam checks know (lib/spine HANDOVERS: morph, mask,
 * zoomThrough, velocity), carrying the shape (or the scale, or x / y for momentum), its id naming the handover
 * ('handover:H1-grow:request'), and the element's box on every frame of its span (`track`) for the render checks.
 */
export const handoverDeclares = (spec?: Partial<HandoverSpec>, film?: Partial<FilmCtx>): Declares & { seams: HandoverSeam[] } => {
  const none = { stepped: [], flashes: [], cameraBlur: [], colour: [], seams: [] as HandoverSeam[] };
  if (!spec || !spec.kind || spec.at === undefined || !spec.from || !spec.to) return none;
  const full = spec as HandoverSpec;
  const H = HANDOVERS[full.kind];
  const span = handoverSpan(full, film);
  const element = full.element ?? 'element';
  const s: HandoverSeam = {
    at: full.at,
    kind: H.seam,
    carry: H.carry,
    id: `handover:${H.id}-${full.kind}:${full.id ?? element}`,
    handover: full.kind,
    hid: H.id,
    element,
    forms: [full.from.form, full.to.form],
    span,
    swap: full.at,
    track: handoverTrack(full, film),
  };
  if (full.kind === 'momentum') {
    const d = full.dir ?? 'left';
    s.carry = d === 'left' || d === 'right' ? 'x' : 'y';
    s.dir = d === 'left' || d === 'up' ? -1 : 1;
  }
  return { ...none, seams: [s] };
};
export const declares = handoverDeclares;

/** A shadow's colour at alpha a (the mask black: shadows stay black whatever the brand). */
export const shadowColor = (a: number) => withAlpha(MASK, a);
