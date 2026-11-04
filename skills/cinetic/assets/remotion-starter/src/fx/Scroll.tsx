import React from 'react';
import { clamp, E, perFrame, SPEED } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { CameraBlurRange, Declares } from '../timeline';
import { edgeMask as wipeEdge } from './Wipe';

// A flick scroll: the list opens on a crawl (or at rest), speeds up by a constant ratio every frame to its
// peak, can hold the peak a few frames, then brakes on friction in two stages (a quick first drop, a long
// slow coast) and lands. Speed against time is a U turned over: the opposite of an S-curve tween, which
// is what makes it read as a hand and a list instead of an animation. Distances and speeds are per frame
// of the film; the ratios are given per frame at `fpsRef` (default 60) and converted for the film's rate.
//
// It is the one UI move fast enough to want camera blur: frames above `blurAbove` px/s (default 900 px/s
// at 1080p) are declared as a CAMERA_BLUR range by declares(), so a crisp film still renders this flick
// with its shutter. House numbers (60 fps): ramp x1.05 a frame over 66 f to 2600 px/s, hold 6 f, brake
// x0.82 for the first share 0.4 then x0.977 (the coast), landing exactly on `distance` when it is given.

export type FlickProps = {
  start: number; // the frame the ramp starts from (before it the list crawls at `crawl`)
  crawl?: number; // px per frame before and at the start of the ramp (default 0: at rest)
  lead?: { v: number; decay: number }; // a speed still carried in at the start (px/frame), decaying x decay a frame (at fpsRef) into the crawl
  ramp?: { frames?: number; growth?: number }; // speed x growth per frame (at fpsRef) for `frames` (film frames) up to the peak
  peak?: number; // px per frame at the peak (default 2600 px/s at 1080p)
  hold?: number; // film frames at the peak (default 6 f at 60 fps)
  /** Friction after the peak, per frame at fpsRef: speed = residual + (peak - residual)(share fast^m + (1 - share) slow^m). */
  brake?: { fast?: number; share?: number; slow?: number; residual?: number };
  distance?: number; // total travel from the start (px): the profile is scaled to land exactly here
  fpsRef?: number; // the rate the ratios are written at (default 60)
  blurAbove?: number; // px/s at 1080p above which frames are declared camera blur (default 900)
  dir?: 1 | -1; // 1: content moves up (scrolls down the page); -1: the other way (default 1)
};

export type FlickState = { y: number; v: number; phase: 'before' | 'ramp' | 'peak' | 'brake' | 'rest' };

const HOUSE = { growth60: 1.05, ramp60: 66, peakPxS: 2600, hold60: 6, fast60: 0.82, share: 0.4, slow60: 0.977 } as const;

/**
 * A feed flicked hard by a thumb (house numbers at 60 fps, px at 1080p): it opens on a carried speed (1920 px/s,
 * x0.837 a frame) decaying into a crawl (285 px/s), ramps x1.054 a frame over 86 f to 5280 px/s (twice the house
 * peak), holds 4 f, brakes fast (x0.922 for a share of 0.6) and coasts (x0.977). The read-every-row feed of a UI
 * walkthrough: a counter climbing beside it, the list landing on the row the next shot is about.
 */
export const FLICK_FEED = { leadPxS: 1920, leadDecay60: 0.837, crawlPxS: 285, ramp60: 86, growth60: 1.054, peakPxS: 5280, hold60: 4, fast60: 0.922, share: 0.6, slow60: 0.977 } as const;

/** FlickProps for a feed flick from `start` at this film's rate and size (FLICK_FEED); `over` replaces any of them. */
export const flickFeed = (start: number, film?: Partial<FilmCtx>, over: Partial<FlickProps> = {}): FlickProps => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const F = FLICK_FEED;
  return {
    start,
    lead: { v: (F.leadPxS * u) / fps, decay: F.leadDecay60 },
    crawl: (F.crawlPxS * u) / fps,
    ramp: { frames: Math.round((F.ramp60 * fps) / 60), growth: F.growth60 },
    peak: (F.peakPxS * u) / fps,
    hold: Math.round((F.hold60 * fps) / 60),
    brake: { fast: F.fast60, share: F.share, slow: F.slow60 },
    fpsRef: 60,
    ...over,
  };
};
const MAX_FRAMES = 4000;

type Profile = { v: number[]; x: number[]; scale: number; rampN: number; holdN: number; end: number; crawl: number }; // crawl: the speed before the start

const cache = new Map<string, Profile>();

/** The per-frame speeds (index n = the step into frame start + n) and positions of a flick. Memoised by its numbers. */
const profileOf = (p: FlickProps, film?: Partial<FilmCtx>): Profile => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const ref = p.fpsRef ?? 60;
  const key = JSON.stringify([p.crawl, p.lead, p.ramp, p.peak, p.hold, p.brake, p.distance, ref, fps, u]);
  const hit = cache.get(key);
  if (hit) return hit;
  const crawl = p.crawl ?? 0;
  const g = perFrame(p.ramp?.growth ?? HOUSE.growth60, ref, fps);
  const rampN = Math.max(1, Math.round(p.ramp?.frames ?? (HOUSE.ramp60 * fps) / 60));
  const peak = p.peak ?? (HOUSE.peakPxS * u) / fps;
  const holdN = Math.max(0, Math.round(p.hold ?? (HOUSE.hold60 * fps) / 60));
  const fast = perFrame(p.brake?.fast ?? HOUSE.fast60, ref, fps);
  const slow = perFrame(p.brake?.slow ?? HOUSE.slow60, ref, fps);
  const share = clamp(p.brake?.share ?? HOUSE.share);
  const res = p.brake?.residual ?? 0;
  const lv = p.lead?.v ?? crawl;
  const ld = perFrame(clamp(p.lead?.decay ?? 0, 0, 0.999999), ref, fps);
  const v = [lv];
  for (let n = 1; n <= rampN; n++) v.push(Math.max(crawl + (lv - crawl) * ld ** n, peak * g ** -(rampN - n)));
  for (let n = 1; n <= holdN; n++) v.push(peak);
  let m = 1;
  while (v.length < MAX_FRAMES) {
    const s = res + (peak - res) * (share * fast ** m + (1 - share) * slow ** m);
    v.push(s);
    m++;
    if (res === 0 && s < 0.02) break;
    if (res !== 0 && Math.abs(s - res) < 1e-4) break;
  }
  const x = [0];
  for (let n = 1; n < v.length; n++) x.push(x[n - 1] + v[n]);
  const total = x[x.length - 1];
  const scale = p.distance !== undefined && total > 0 ? p.distance / total : 1;
  const out = { v: v.map((s) => s * scale), x: x.map((s) => s * scale), scale, rampN, holdN, end: v.length - 1, crawl: lv * scale };
  if (cache.size > 64) cache.clear();
  cache.set(key, out);
  return out;
};

/**
 * Where a flick is at frame f: `y` (px travelled from the start: content moves by -y for dir 1) and the
 * speed `v` (px per film frame). Whole frames take the profile's own steps; a fractional frame is the
 * straight line between its neighbours (sub-frame safe). Before `start` the list crawls at `crawl`.
 */
export const flickState = (f: number, p: FlickProps, film?: Partial<FilmCtx>): FlickState => {
  const pr = profileOf(p, film);
  const dir = p.dir ?? 1;
  const n = f - p.start;
  if (n <= 0) return { y: dir * pr.crawl * n, v: dir * pr.crawl, phase: 'before' };
  if (n >= pr.end) return { y: dir * pr.x[pr.end], v: 0, phase: 'rest' };
  const i = Math.floor(n);
  const fr = n - i;
  const y = pr.x[i] + fr * pr.v[i + 1];
  const k = Math.ceil(n);
  const phase = k <= pr.rampN ? 'ramp' : k <= pr.rampN + pr.holdN ? 'peak' : 'brake';
  return { y: dir * y, v: dir * pr.v[Math.min(pr.end, Math.max(1, k))], phase }; // v: the step into frame ceil(f)
};

/** The frames of a flick: its start, the peak (first and last peak frame), its landing, its total travel. */
export const flickFrames = (p: FlickProps, film?: Partial<FilmCtx>) => {
  const pr = profileOf(p, film);
  const vmax = Math.max(...pr.v);
  const first = pr.v.findIndex((s) => s >= vmax - 1e-9);
  let last = first;
  while (last + 1 < pr.v.length && pr.v[last + 1] >= vmax - 1e-9) last++;
  return { start: p.start, peakFirst: p.start + first, peakLast: p.start + last, end: p.start + pr.end, distance: pr.x[pr.end], peak: vmax };
};

/** The frames [from, to) whose speed is above `blurAbove` px/s at 1080p: the flick's camera-blur range. */
export const flickBlurRange = (p: FlickProps, film?: Partial<FilmCtx>): { from: number; to: number } | null => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const pr = profileOf(p, film);
  const limit = ((p.blurAbove ?? SPEED.blurThreshold[0]) * u) / fps;
  const idx = pr.v.map((s, n) => (s > limit ? n : -1)).filter((n) => n > 0);
  if (!idx.length) return null;
  // a frame n is drawn after the step v[n]: the shutter of frame start + n spans the step into it
  return { from: p.start + idx[0], to: p.start + idx[idx.length - 1] + 1 };
};

/** The horizontal soft edge of a scrolling line: alpha ramps over `left` px (house 250 at 1080p) and `right` px (default 0). */
export type EdgeMask = { left?: number; right?: number };

/** The CSS mask of a Scroll viewport: the vertical `edge` fade and the horizontal `edgeMask`, intersected when both are given. */
export const scrollMask = (height: number, edge = 0, edgeMask?: EdgeMask | boolean, u = 1): React.CSSProperties => {
  const v = edge > 0 ? `linear-gradient(to bottom, transparent 0px, black ${edge}px, black ${height - edge}px, transparent ${height}px)` : undefined;
  const em = edgeMask === true ? {} : edgeMask || null;
  const h = em ? (wipeEdge({ left: em.left ?? 250 * u, right: em.right ?? 0 }).maskImage as string) : undefined;
  if (v && h) return { maskImage: `${v}, ${h}`, WebkitMaskImage: `${v}, ${h}`, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' };
  const one = v ?? h;
  return one ? { maskImage: one, WebkitMaskImage: one } : {};
};

/**
 * A scrolling list: `children` laid out in a column (frame px), moved by the flick. `edge` fades the
 * content out at the top and bottom of the viewport over `edge` px (a static mask: a viewport, not a
 * glow), so rows enter and leave soft without moving any gradient. `edgeMask` adds the soft left (and
 * right) edge for lines that slide through the frame (fx/Wipe edgeMask: house 250 px at 1080p on the
 * left), so a line comes out of nothing instead of being cut by the frame; both masks intersect.
 */
export const Scroll: React.FC<
  FlickProps & { frame: number; x?: number; y?: number; width: number; height: number; edge?: number; edgeMask?: EdgeMask | boolean; children: React.ReactNode; style?: React.CSSProperties }
> = ({ frame, x = 0, y = 0, width, height, edge = 0, edgeMask, children, style, ...p }) => {
  const film = useFilm();
  const s = flickState(frame, p, film);
  const mask = scrollMask(height, edge, edgeMask, uOf(film));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden', transform: `translate(${x}px, ${y}px)`, ...mask, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, transform: `translate3d(0px, ${(-s.y).toFixed(3)}px, 0)`, willChange: 'transform' }}>{children}</div>
    </div>
  );
};

/**
 * A masonry wall scrolling up into place, every tile on its own settle (never one rigid plane): a tile travels
 * `depth` x the wall's travel (house 0.6-1.4: nearer tiles move further) on an expo-out entry, `lag` x 6 f late at
 * 60 fps, so the wall lands like a stack of separate cards; text set in a gap rides its tile's track. One shared
 * ease-in exit carries every tile out together (the wall accelerating into the cut). Boxes in px at 1080p.
 */
export const MASONRY = { travel: 520, enter60: 64, lag60: 6, exit60: 26, exitBy: 1300 } as const;
export type MasonryTile = { x: number; y: number; w: number; h: number; depth?: number; lag?: number };
export type MasonryProps = { at: number; out?: number; tiles: MasonryTile[]; travel?: number; enter?: number; exit?: number; exitBy?: number };
/** Every tile at frame f: its rest box moved by its own settle and the shared exit, and its speed (film px per film frame, up = negative; DirBlur takes v / u). Pure. */
export const masonryState = (frame: number, p: MasonryProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const travel = (p.travel ?? MASONRY.travel) * u;
  const enter = Math.max(1, f60x(p.enter ?? MASONRY.enter60, fps));
  const exit = Math.max(1, f60x(p.exit ?? MASONRY.exit60, fps));
  const exitBy = (p.exitBy ?? MASONRY.exitBy) * u;
  const offAt = (t: MasonryTile, f: number) => {
    const a = p.at + (t.lag ?? 0) * f60x(MASONRY.lag60, fps);
    const settle = (t.depth ?? 1) * travel * (1 - E.out(clamp((f - a) / enter)));
    const leave = p.out === undefined ? 0 : exitBy * E.in(clamp((f - p.out) / exit));
    return settle - leave;
  };
  return p.tiles.map((t, i) => ({ i, x: t.x * u, y: t.y * u + offAt(t, frame), w: t.w * u, h: t.h * u, v: offAt(t, frame) - offAt(t, frame - 1) }));
};

/** What a flick declares: its fast frames as a camera-blur range (the shutter renders them even in a crisp film). */
export const declares = (p?: Partial<FlickProps> & { id?: string }, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const r = flickBlurRange(p as FlickProps, film);
  const cameraBlur: CameraBlurRange[] = r ? [{ from: r.from, to: r.to, id: p.id ?? 'flick' }] : [];
  return { stepped: [], flashes: [], cameraBlur, seams: [] };
};
