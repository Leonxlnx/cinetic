import React from 'react';
import { C, FONT } from '../brand/tokens';
import { clamp, curveOf, E, type Ease, lmix, perFrame, prog } from '../lib/anim';
import { f60, type FilmCtx, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import { baselineOf, measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';

/** Distance from (x, y) to the farthest corner of a w x h frame. */
export const farCorner = (x: number, y: number, w: number, h: number) => Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

/**
 * House numbers of an iris, 60 fps. Rate mode: the radius grows by `ratio` every frame from `r0`
 * (px at 1080p) on its first frame, so it opens from a point that is already visible and reaches
 * the far corner in about 16-18 frames at any frame size. A scalloped edge has `lobes` round bumps
 * cut `depth` (share of the radius) deep between them and turns `turn` lobes over the opening.
 */
export const IRIS = { ratio: 1.28, r0: 22, margin: 2, scallop: { lobes: 9, depth: 0.08, turn: 0.35 } } as const;

/**
 * The speed an iris carries, house numbers (60 fps): an iris opened inside a moving line is a carried seam. The
 * line around it accelerates out (lib/handoff launch()) into the frame the circle covers the frame on; the line
 * inside opens moving the same way at 1.15 x that speed and decays in one stage, x0.806 a 60 fps frame (x0.65 at
 * 30 fps), to its residual drift. Feed it to carriedCut(f, cover, { vCut }, { ratio: IRIS_CARRY.ratio, decay:
 * IRIS_CARRY.decay60, fast: { share: 0, decay: 0.4 } }) on the one coordinate both lines ride.
 */
export const IRIS_CARRY = { ratio: 1.15, decay60: 0.806 } as const;

/** A rate-mode iris: equal radius ratios per frame (or ratios spread by `shape`) from `r0` to `to`. */
export type IrisRateOpts = {
  start: number; // the first frame the circle shows (radius r0 on it)
  r0?: number; // radius on the first frame, px (house 22 px at 1080p)
  ratio?: number; // radius growth per 60 fps frame (house 1.28 = x1.63 per frame at 30 fps)
  to?: number; // the radius it ends on; default the far corner from (x, y) + 2 px
  x?: number; // origin, frame px (for the default `to`)
  y?: number;
  /**
   * How the log growth is spread over the run: E.linear (default) keeps one ratio every frame; an
   * ease bends it (a curve steeper at both ends bursts out of the point and accelerates off the
   * corners). With a shape, `frames` sets the run length.
   */
  shape?: Ease;
  frames?: number; // run length in film frames; default from the ratio: ln(to / r0) / ln(ratio per film frame)
  width?: number; // frame size for the default `to` (default the film's)
  height?: number;
};

/**
 * The reveal iris: it opens already big (37 % of the frame height as its first radius, never from a dot) and covers
 * the frame in 10 frames at 60 fps, most of the growth up front (radius ratios about 1.76, 1.21, 1.10, 1.07 per
 * 30 fps frame). For a product shot opening onto a new stage; keep IRIS (from the point) for logo stings.
 */
export const IRIS_REVEAL = { r0Share: 0.37, frames60: 10, shape: [0, 0.565, 0.756, 0.851, 0.919, 1] as number[] } as const;
/** Rate-mode options for the reveal iris from (x, y): pass them to irisRadius / <Iris rate>. */
export const irisReveal = (start: number, o: { x?: number; y?: number } = {}, film?: Partial<FilmCtx>): IrisRateOpts => {
  const size = sizeOf(film);
  return { start, r0: IRIS_REVEAL.r0Share * size.height, frames: (IRIS_REVEAL.frames60 * fpsOf(film)) / 60, shape: curveOf(IRIS_REVEAL.shape), x: o.x, y: o.y };
};

/** The run of a rate-mode iris: its start, the first frame it has reached `to`, its length and end radius. */
export const irisRateRun = (o: IrisRateOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const size = o.width !== undefined && o.height !== undefined ? { width: o.width, height: o.height } : sizeOf(film);
  const u = Math.min(size.width, size.height) / 1080;
  const r0 = Math.max(0.01, o.r0 ?? IRIS.r0 * u);
  const to = o.to ?? farCorner(o.x ?? size.width / 2, o.y ?? size.height / 2, size.width, size.height) + IRIS.margin * u;
  const q = perFrame(o.ratio ?? IRIS.ratio, 60, fps);
  const frames = Math.max(1e-3, o.frames ?? Math.log(Math.max(to, r0 * 1.0001) / r0) / Math.log(Math.max(1.0001, q)));
  return { start: o.start, end: Math.ceil(o.start + frames - 1e-9), frames, r0, to };
};

/**
 * Radius of an iris at `frame`.
 * - Ease mode (1.1 call): irisRadius(frame, start, dur, r0, r1, ease) runs from r0 to r1 in log space
 *   on `ease`. In linear px an E.out flood leaps to half the frame on its first frame and a linear one
 *   crawls and then snaps; in log space it opens from the point and decelerates as it fills.
 * - Rate mode: irisRadius(frame, opts, film) grows by the same ratio every frame (or spread by
 *   `shape`) from r0 on `start`; 0 before `start`, `to` from the end on.
 */
export function irisRadius(frame: number, start: number, dur: number, r0: number, r1: number, ease: Ease): number;
export function irisRadius(frame: number, o: IrisRateOpts, film?: Partial<FilmCtx>): number;
export function irisRadius(frame: number, a: number | IrisRateOpts, b?: number | Partial<FilmCtx>, r0?: number, r1?: number, ease?: Ease): number {
  if (typeof a === 'number') return lmix(Math.max(0.01, r0 ?? 1), Math.max(0.01, r1 ?? 1), prog(frame, a, a + (b as number), ease ?? E.out));
  const run = irisRateRun(a, b as Partial<FilmCtx> | undefined);
  if (frame < a.start) return 0;
  const t = clamp((frame - a.start) / run.frames);
  return run.r0 * Math.exp(Math.log(run.to / run.r0) * (a.shape ?? E.linear)(t));
}

/** Where an iris sits in a word gap: the line's text, the gap after word `gap` (0-based), and the line's box. */
export type IrisGap = {
  text: string;
  gap: number; // the gap between word `gap` and word `gap + 1`
  left: number; // the line's left edge, frame px
  top: number; // the top of its line box, frame px
  size: number; // font size, px
  weight?: number;
  track?: number; // em
  lead?: number; // line height (share of size)
  family?: string;
};

/**
 * The centre of a word gap (frame px): halfway across the space after word `gap`, at mid cap height.
 * Measures the real font: call it under FontGate.
 */
export const gapOrigin = (g: IrisGap) => {
  const words = g.text.split(/\s+/).filter(Boolean);
  const weight = g.weight ?? 500;
  const track = g.track ?? 0;
  const family = g.family ?? FONT.text;
  const head = words.slice(0, Math.max(0, Math.min(words.length - 1, g.gap)) + 1).join(' ');
  const x0 = measureTracked(head, g.size, weight, track, family);
  const x1 = measureTracked(`${head} `, g.size, weight, track, family);
  const base = baselineOf(g.size, weight, g.lead ?? 1.1, family);
  return { x: g.left + (x0 + x1) / 2, y: g.top + base - 0.36 * g.size };
};

/** A scalloped (cloud) edge: round lobes with cusps between them, as a CSS polygon around (x, y). */
export const scallopPath = (x: number, y: number, r: number, o: { lobes?: number; depth?: number; phase?: number; points?: number } = {}) => {
  const lobes = Math.max(3, Math.round(o.lobes ?? IRIS.scallop.lobes));
  const depth = clamp(o.depth ?? IRIS.scallop.depth, 0, 0.5);
  const n = Math.max(lobes * 8, o.points ?? lobes * 12);
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const k = Math.abs(Math.sin((lobes * (th - (o.phase ?? 0))) / 2)); // 0 at a cusp, 1 at a lobe's crown
    const rr = r * (1 - depth * (1 - Math.sqrt(k)));
    pts.push(`${(x + rr * Math.cos(th)).toFixed(2)}px ${(y + rr * Math.sin(th)).toFixed(2)}px`);
  }
  return `polygon(${pts.join(', ')})`;
};

export type IrisProps = {
  frame: number; // local frame
  start: number;
  x?: number; // origin, frame px (or give originFrom)
  y?: number;
  dur?: number;
  ease?: Ease;
  close?: boolean;
  r0?: number;
  color?: string; // flood colour (a hex token); omit to reveal children
  children?: React.ReactNode;
  ring?: boolean;
  ringColor?: string;
  ringWidth?: number;
  style?: React.CSSProperties;
  /** 'ease' (the 1.1 iris) or 'rate' (equal ratios per frame); default the pace's fx.irisMode, else 'ease'. */
  mode?: 'ease' | 'rate';
  ratio?: number; // rate mode: growth per 60 fps frame (default the pace's, house 1.28)
  shape?: Ease; // rate mode: how the log growth is spread (default E.linear)
  frames?: number; // rate mode: run length with a shape
  to?: number; // rate mode: the radius the run ends on (default the far corner + 2 px)
  originFrom?: IrisGap; // open from a word gap of a line instead of x, y
  scallop?: boolean | { lobes?: number; depth?: number; turn?: number }; // a cloud edge instead of a circle
  id?: string; // name for the declarations
};

/**
 * Iris: reveals `children` (or floods `color`, a one-time accent flood) through a circle growing
 * from a point (a glyph, a button, a word gap) to the frame's far corner. `close` runs it backwards:
 * the circle shrinks onto the point and hides what was inside.
 *
 * Two clocks. Ease mode (the 1.1 iris): pace.fx.iris frames on E.out (opening) or E.in (closing) in
 * log space, from r0 = 1 px to the far corner + 2 px (more if needed to clear it on the last clipped
 * frame). Rate mode (the 1.2 pace's default): the radius grows by the same ratio every frame (house
 * x1.28 at 60 fps, x1.63 at 30 fps) from 22 px at 1080p on its first frame, so it starts visible and
 * accelerates in px all the way off the corners; `shape` spreads the ratios (a burst out of the point
 * and an acceleration off the corners) when one ratio is too even. Start it on the hit frame.
 *
 * `originFrom` opens it from the gap between two words of a line (gapOrigin()); `scallop` gives it a
 * cloud edge that turns as it opens. Before an opening iris starts nothing is drawn; once it ends the
 * clip is removed (no anti-aliased edge left on screen). `ring` adds a thin ring (2 px at 1080p,
 * never under 1.5 px) that runs ahead of the edge on a shorter clock and fades out. The clip is a
 * clip-path on one full-frame layer, placed in frame px; never put will-change on it.
 */
export const Iris: React.FC<IrisProps> = (props) => {
  const { frame, start, close = false, color, children, ring = false, ringColor = C.accent, style } = props;
  const film = useFilm();
  const { width, height } = film;
  const o = props.originFrom ? gapOrigin(props.originFrom) : { x: props.x ?? width / 2, y: props.y ?? height / 2 };
  const { x, y } = o;
  // an explicit dur or ease asks for the eased iris, whatever the pace's default mode is
  const mode = props.mode ?? (props.dur !== undefined || props.ease !== undefined ? 'ease' : film.pace.fx.irisMode?.mode ?? 'ease');
  const ringWidth = props.ringWidth ?? Math.max(1.5, 2 * uOf(film));
  const far = farCorner(x, y, width, height);
  const content = color !== undefined ? <div style={{ position: 'absolute', inset: 0, background: color }} /> : children;
  const sc = props.scallop ? { ...IRIS.scallop, ...(props.scallop === true ? {} : props.scallop) } : null;
  // a scalloped edge's cusps sit `depth` inside the radius: the run must end that much further out
  const reach = sc ? 1 / (1 - sc.depth) : 1;
  const clipAt = (r: number, t: number) =>
    sc ? scallopPath(x, y, r, { lobes: sc.lobes, depth: sc.depth, phase: (t * sc.turn * 2 * Math.PI) / sc.lobes }) : `circle(${r.toFixed(3)}px at ${x.toFixed(3)}px ${y.toFixed(3)}px)`;
  const layer = (clip?: string) => <div style={{ position: 'absolute', inset: 0, clipPath: clip, ...style }}>{content}</div>;

  if (mode === 'rate') {
    const rate: IrisRateOpts = { start, x, y, r0: props.r0, ratio: props.ratio ?? film.pace.fx.irisMode?.ratio, shape: props.shape, frames: props.frames, to: props.to ?? (far + IRIS.margin * uOf(film)) * reach, width, height };
    const run = irisRateRun(rate, film);
    if (close) {
      // the same run backwards: full on `start`, on the point (r0) at start + frames, gone after it
      if (frame < start) return layer();
      if (frame > start + run.frames) return null;
      const g = start + run.frames - (frame - start);
      return layer(clipAt(irisRadius(g, rate, film), clamp((g - start) / run.frames)));
    }
    if (frame < start) return null;
    if (frame >= run.end) return layer();
    const f = frame;
    const r = irisRadius(f, rate, film);
    const t = clamp((f - start) / run.frames);
    return layer(clipAt(r, t));
  }

  const dur = props.dur ?? f60(film.pace.fx.iris, film.fps);
  const ease = props.ease;
  const r0 = props.r0 ?? 1;
  // An opening circle must already cover the corners on its last clipped frame (start + dur - 1),
  // or they pop in when the clip comes off: far + 2 is short there for an iris of <= 9 frames.
  const e1 = (ease ?? E.out)(clamp((dur - 1) / dur));
  const farR = (far + 2) * reach;
  const R = close || e1 <= 0 ? farR : Math.max(farR, Math.exp((Math.log(farR) - (1 - e1) * Math.log(Math.max(0.01, r0))) / e1));
  const t = prog(frame, start, start + dur, E.linear);
  if (close ? t >= 1 : frame < start) return null;
  if (!close && t >= 1) return layer();
  if (close && frame < start) return layer();
  const r = close ? irisRadius(frame, start, dur, R, r0, ease ?? E.in) : irisRadius(frame, start, dur, r0, R, ease ?? E.out);
  // The ring runs the same curve in 75% of the time, so it stays ahead of the edge, fading as it goes.
  const ringR = irisRadius(frame, start, dur * 0.75, r0, R, ease ?? E.out);
  const ringO = 1 - prog(frame, start + dur * 0.1, start + dur * 0.75, E.smooth);
  return (
    <>
      {layer(clipAt(r, t))}
      {ring && !close && ringO > 0.001 && (
        <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <circle cx={x} cy={y} r={Math.max(0, ringR)} fill="none" stroke={ringColor} strokeWidth={ringWidth} opacity={ringO} />
        </svg>
      )}
    </>
  );
};

/**
 * What an Iris instance does on purpose: an iris that opens on a new scene (or floods it) is a `mask`
 * seam carrying the shape, at its first frame. Without a start it declares nothing (the 1.1 form).
 */
export const declares = (p?: Partial<IrisProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  void film;
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.start, kind: 'mask', carry: 'shape', id: p.id ?? 'iris' }] };
};
