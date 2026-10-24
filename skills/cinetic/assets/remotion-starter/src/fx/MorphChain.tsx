import React from 'react';
import { clamp, E, type Ease, lmix, mix, prog } from '../lib/anim';
import { morphBox, type MorphBox } from '../lib/box';
import { defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares, Seam } from '../timeline';

/**
 * Morph chain: one object carries the film from state to state instead of cutting. A card collapses
 * into a chip, the chip squeezes, swells and becomes a word; a frame collapses into a square that
 * becomes the next shot's first card; a cell grows through the frame; a pill breathes into a window.
 * Every state is a box (lib/box.ts MorphBox) plus blur, opacity, roll and the index of the content it
 * shows; each window moves the box from one state to the next on its own curve, and the box holds
 * between windows. The content swaps when a window completes (a one-frame window with CHAIN_STEP is a
 * designed swap: the next content appears at its own size on that frame).
 *
 * House numbers (60 fps): a hand-off every 8-32 f; a collapse 16-20 f, ease-in under a blur that grows
 * to 12-20 px at 1080p; a squeeze in two phases (a linear gather, then M.squeeze); a swell of +40-60 %
 * over 24 f on M.swell straight into the swap; the next content arrives at the chip's pre-swell size.
 * Blur is drawn as at most two copies at fixed ladder levels (lib/defocus), never an animated radius.
 */

/** One state of the chain: a box, how soft and how opaque it is, its roll (deg) and which content it shows. */
export type ChainBox = MorphBox & { blur?: number; opacity?: number; rot?: number; content?: number };
/** The move from states[i] to states[i + 1]: frames [from, to] on `ease` (geometry), `fade` (blur, opacity; default the same curve). */
export type ChainWindow = { from: number; to: number; ease?: Ease; fade?: Ease; log?: boolean };
export type MorphChainProps = { states: ChainBox[]; windows: ChainWindow[]; id?: string };
export type MorphChainState = {
  box: Required<MorphBox>;
  blur: number; // px at 1080p
  opacity: number;
  rot: number; // deg
  content: number; // index of the content shown
  seg: number; // the window in progress (or the last one completed)
  p: number; // its progress on the geometry curve
  moving: boolean;
};

/** A swap curve: 0 until the window's last frame, 1 on it. A one-frame window on it is a designed content swap. */
export const CHAIN_STEP: Ease = (t: number) => (t < 1 ? 0 : 1);

const contentOf = (s: ChainBox, i: number) => s.content ?? i;

/** Blend two chain states at geometry progress p and fade progress q. `log` blends width and height in log space (a zoom). */
const blend = (A: ChainBox, B: ChainBox, p: number, q: number, log = false) => {
  const box = morphBox(A, B, p);
  if (log) {
    box.w = lmix(Math.max(1e-3, A.w), Math.max(1e-3, B.w), p);
    box.h = lmix(Math.max(1e-3, A.h), Math.max(1e-3, B.h), p);
    box.r = clamp(mix(A.r, B.r, p), 0, Math.min(box.w, box.h) / 2);
  }
  return { box, blur: Math.max(0, mix(A.blur ?? 0, B.blur ?? 0, q)), opacity: clamp(mix(A.opacity ?? 1, B.opacity ?? 1, q)), rot: mix(A.rot ?? 0, B.rot ?? 0, p) };
};

/**
 * The chain at frame f: the box, blur, opacity, roll and content index. Pure and closed form: any
 * frame, any order (fractional frames blend inside a window; a CHAIN_STEP window switches on its end).
 */
export const morphChainState = (f: number, p: MorphChainProps): MorphChainState => {
  const { states, windows } = p;
  if (!states.length) throw new Error('morphChainState: no states');
  const n = Math.min(windows.length, states.length - 1);
  let k = -1; // the last window that has started
  for (let i = 0; i < n; i++) if (f >= windows[i].from) k = i;
  if (k < 0) {
    const s = states[0];
    return { ...blend(s, s, 0, 0), content: contentOf(s, 0), seg: 0, p: 0, moving: false };
  }
  const w = windows[k];
  const A = states[k];
  const B = states[k + 1];
  const t = w.to > w.from ? clamp((f - w.from) / (w.to - w.from)) : 1;
  const pg = (w.ease ?? E.strongInOut)(t);
  const pf = w.fade ? w.fade(t) : pg;
  const b = blend(A, B, pg, pf, w.log);
  const done = t >= 1;
  return { ...b, content: done ? contentOf(B, k + 1) : contentOf(A, k), seg: k, p: pg, moving: !done };
};

/** The frames the chain swaps content on (a window whose two states show different content): seams. */
export const chainSwaps = (p: MorphChainProps) =>
  p.windows
    .slice(0, p.states.length - 1)
    .map((w, i) => ({ at: Math.ceil(w.to), from: contentOf(p.states[i], i), to: contentOf(p.states[i + 1], i + 1) }))
    .filter((s) => s.from !== s.to);

// ------------------------------------------------------------------------------------------------
// collapse: a frame gathers into a square (and may become the next shot's first card)

export type CollapseOpts = {
  start: number; // the content starts pulling back
  frames?: number; // the pull-back, film frames (house 36 f at 60 fps), ending on the cut
  zoom?: number; // the content's scale on the cut frame (house 0.55): an ease-in pull-back, fastest into the cut
  zoomEase?: Ease; // house E.launchIn
  mask?: { frames?: number; side?: number; ease?: Ease }; // the frame closes to a centred square of `side` px over its last `frames` (house 12 f, 0.55 of the height, E.launchIn)
  /** After the cut: a solid square from `from` px to `to` px over `frames`, decelerating (house 10 f on E.snapOut, x0.36). */
  square?: { from?: number; to?: number; frames?: number; ease?: Ease; color?: string };
  /** The next shot's first card: the square hands over to it on `at` (its size, position offset and roll). */
  into?: { at: number; side: number; rot?: number; dx?: number; dy?: number };
  width?: number; // frame size (default the film's)
  height?: number;
  fps?: number;
};

export type CollapseState = {
  phase: 'before' | 'zoom' | 'square' | 'into' | 'after';
  k: number; // the content's scale (zoom phase)
  mask: { w: number; h: number; r: number } | null; // the closing mask, centred (zoom phase)
  side: number; // the square's side (square and into phases), px
  rot: number; // its roll, deg
  dx: number; // its offset from the frame centre (into phase)
  dy: number;
  cut: number; // the first frame of the solid square
};

/**
 * A frame collapses: the content pulls back on an ease-in (fastest into the cut) while the frame's
 * edges close in to a centred square over the last frames; on the cut a solid square takes the
 * mask's place and keeps shrinking, decelerating (equal-ish ratios that relax: x0.70, 0.75, 0.79,
 * 0.85 a frame at 24 fps), and may hand over to the next shot's first card (`into`). Pure.
 */
export const collapse = (f: number, o: CollapseOpts): CollapseState => {
  const fps = o.fps ?? fpsOf();
  const W = o.width ?? 1920;
  const H = o.height ?? 1080;
  const frames = Math.max(1, o.frames ?? f60x(36, fps));
  const cut = Math.round(o.start + frames);
  const zoomTo = o.zoom ?? 0.55;
  const mFrames = Math.max(1, o.mask?.frames ?? f60x(12, fps));
  const side0 = o.mask?.side ?? 0.55 * Math.min(W, H);
  const sq = o.square ?? {};
  const sFrom = sq.from ?? side0;
  const sTo = sq.to ?? sFrom * 0.36;
  const sFrames = Math.max(1, sq.frames ?? f60x(10, fps));
  const base = { k: 1, mask: null, side: 0, rot: 0, dx: 0, dy: 0, cut };
  if (f < o.start) return { ...base, phase: 'before' };
  if (f < cut) {
    const k = lmix(1, zoomTo, prog(f, o.start, cut, o.zoomEase ?? E.launchIn));
    const m = prog(f, cut - mFrames, cut, o.mask?.ease ?? E.launchIn);
    const w = mix(W, side0, m);
    const h = mix(H, side0, m);
    return { ...base, phase: 'zoom', k, mask: { w, h, r: 0 } };
  }
  if (o.into && f >= o.into.at) {
    return { ...base, phase: 'into', side: o.into.side, rot: o.into.rot ?? 0, dx: o.into.dx ?? 0, dy: o.into.dy ?? 0 };
  }
  const t = (sq.ease ?? E.snapOut)(clamp((f - cut) / sFrames));
  return { ...base, phase: f >= cut + sFrames ? 'after' : 'square', side: mix(sFrom, sTo, t) };
};

// ------------------------------------------------------------------------------------------------
// growThrough: a cell grows until it fills the frame; the next shot is inside it

export type GrowThroughOpts = {
  start: number;
  frames?: number; // film frames (house 28 f at 60 fps)
  from: MorphBox; // the cell, frame px
  to?: MorphBox; // where it ends (default: the frame, overfilled by 15 %)
  ease?: Ease; // house E.buildIn, on log size (constant ratios read as one zoom that keeps speeding up)
  width?: number;
  height?: number;
  fps?: number;
};

/** A cell grows through the frame: its box, the share of the frame it covers, and `cut` = the first frame it covers it. */
export const growThrough = (f: number, o: GrowThroughOpts) => {
  const fps = o.fps ?? fpsOf();
  const W = o.width ?? 1920;
  const H = o.height ?? 1080;
  const frames = Math.max(1, o.frames ?? f60x(28, fps));
  const to: MorphBox = o.to ?? { x: -0.075 * W, y: -0.075 * H, w: 1.15 * W, h: 1.15 * H, r: 0 };
  const boxAt = (g: number) => {
    const p = prog(g, o.start, o.start + frames, o.ease ?? E.buildIn);
    const w = lmix(Math.max(1e-3, o.from.w), Math.max(1e-3, to.w), p);
    const h = lmix(Math.max(1e-3, o.from.h), Math.max(1e-3, to.h), p);
    const cx = mix(o.from.x + o.from.w / 2, to.x + to.w / 2, p);
    const cy = mix(o.from.y + o.from.h / 2, to.y + to.h / 2, p);
    const r = clamp(mix(o.from.r, to.r, p), 0, Math.min(w, h) / 2);
    return { x: cx - w / 2, y: cy - h / 2, w, h, r };
  };
  const coverOf = (b: { x: number; y: number; w: number; h: number; r: number }) => {
    const ix = Math.max(0, Math.min(W, b.x + b.w) - Math.max(0, b.x));
    const iy = Math.max(0, Math.min(H, b.y + b.h) - Math.max(0, b.y));
    const corners = b.r > 0 && (b.x > 0 || b.y > 0 || b.x + b.w < W || b.y + b.h < H) ? (4 - Math.PI) * b.r * b.r : 0;
    return clamp((ix * iy - corners) / (W * H));
  };
  const box = boxAt(f);
  let cut = Math.ceil(o.start + frames);
  for (let g = Math.ceil(o.start); g <= Math.ceil(o.start + frames); g++)
    if (coverOf(boxAt(g)) >= 0.999 && boxAt(g).x <= 0 && boxAt(g).y <= 0 && boxAt(g).x + boxAt(g).w >= W && boxAt(g).y + boxAt(g).h >= H) {
      cut = g;
      break;
    }
  return { box, cover: coverOf(box), cut };
};

// ------------------------------------------------------------------------------------------------
// pillBreath: a pill mask stretches, holds, and contracts into the cut

export type PillBreathOpts = {
  start: number; // the first frame of the stretch
  from: number; // width on `start`, px
  to: number; // width after the stretch, px
  h: number; // height, px (the pill's radius is h / 2 unless `r` is given)
  r?: number;
  stretch?: number; // frames (house 44 f at 60 fps: 90 % of it in the first 16)
  hold?: number; // frames held at full width (house 12 f)
  contract?: number; // frames of the contraction into the cut (house 22 f)
  end?: number; // width on the last frame before the cut (house 0.86 x to)
  ease?: Ease; // the stretch (house E.snapOut: front-loaded)
  contractEase?: Ease; // the contraction (house E.launchIn: fastest on the cut)
  fps?: number;
};

/** The pill at frame f: width, height, radius, phase, and `cut` = the first frame after the contraction (cut on it). */
export const pillBreath = (f: number, o: PillBreathOpts) => {
  const fps = o.fps ?? fpsOf();
  const stretch = Math.max(1, o.stretch ?? f60x(44, fps));
  const hold = Math.max(0, o.hold ?? f60x(12, fps));
  const contract = Math.max(1, o.contract ?? f60x(22, fps));
  const end = o.end ?? 0.86 * o.to;
  const a = o.start + stretch;
  const b = a + hold;
  const c = b + contract;
  let w: number;
  let phase: 'before' | 'stretch' | 'hold' | 'contract' | 'after';
  if (f < o.start) {
    w = o.from;
    phase = 'before';
  } else if (f < a) {
    w = mix(o.from, o.to, (o.ease ?? E.snapOut)(clamp((f - o.start) / stretch)));
    phase = 'stretch';
  } else if (f < b) {
    w = o.to;
    phase = 'hold';
  } else {
    w = mix(o.to, end, (o.contractEase ?? E.launchIn)(clamp((f - b) / contract)));
    phase = f <= c ? 'contract' : 'after';
  }
  return { w, h: o.h, r: o.r ?? o.h / 2, phase, cut: Math.round(c) + 1, holdFrom: a, contractFrom: b };
};

// ------------------------------------------------------------------------------------------------
// the component

/**
 * Renders a morph chain: one box at the state's geometry (transform only, real width/height/radius),
 * the state's content inside it (children[content], laid out in the box), the box's blur as at most
 * two stacked copies at fixed levels, its opacity and roll. `frame` is the local frame.
 */
export const MorphChain: React.FC<
  MorphChainProps & { frame: number; children?: React.ReactNode[]; style?: React.CSSProperties; clipContent?: boolean }
> = ({ frame, states, windows, children = [], style, clipContent = true }) => {
  const film = useFilm();
  const s = morphChainState(frame, { states, windows });
  const { box } = s;
  const copies = defocusMix(s.blur * uOf(film));
  const sh = box.shadow;
  const body = (level: number, opacity: number, key: number) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: box.w,
        height: box.h,
        borderRadius: box.r,
        overflow: clipContent ? 'hidden' : 'visible',
        background: box.fill,
        opacity,
        filter: level > 0 ? `blur(${level}px)` : undefined,
        boxShadow: level === 0 && sh.a > 0.001 ? `0 ${sh.y.toFixed(2)}px ${sh.blur.toFixed(2)}px rgba(0,0,0,${sh.a.toFixed(3)})` : undefined,
      }}
    >
      {children[s.content]}
      {box.strokeW > 0.01 && <div style={{ position: 'absolute', inset: 0, borderRadius: box.r, boxShadow: `inset 0 0 0 ${box.strokeW.toFixed(2)}px ${box.stroke}` }} />}
    </div>
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity: s.opacity,
        transformOrigin: `${(box.w / 2).toFixed(3)}px ${(box.h / 2).toFixed(3)}px`,
        transform: `translate(${box.x.toFixed(3)}px, ${box.y.toFixed(3)}px)${s.rot ? ` rotate(${s.rot.toFixed(3)}deg)` : ''}`,
        ...style,
      }}
    >
      {copies.map((c, i) => body(c.level, i === 0 ? 1 : c.weight, i))}
    </div>
  );
};

/**
 * What a morph chain declares: every content swap is a `morph` seam carrying the shape (the object
 * carries the film across it; no cut). A collapse or grow-through used as a transition declares its
 * cut through `seams` passed in props (`extraSeams`).
 */
export const declares = (p?: Partial<MorphChainProps> & { extraSeams?: Seam[] }, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p || !p.states || !p.windows) return { stepped: [], flashes: [], cameraBlur: [], seams: p?.extraSeams ?? [] };
  const id = p.id ?? 'morphChain';
  const seams: Seam[] = chainSwaps(p as MorphChainProps).map((s, i) => ({ at: s.at, kind: 'morph', carry: 'shape', id: `${id}-${i}` }));
  return { stepped: [], flashes: [], cameraBlur: [], seams: [...seams, ...(p.extraSeams ?? [])] };
};
