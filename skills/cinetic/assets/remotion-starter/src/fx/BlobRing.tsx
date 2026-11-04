// cinetic:light blob ring: a soft one-hue vignette shape (a static gradient edge moved and scaled per frame), no glow on an element
import React from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, M, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Blob ring: a soft ring of colour swirls in around the frame and frames the next statement, then
 * breathes: it tightens (the hole shrinks on M.ringTighten) and loosens again while its centre
 * wanders a little. One hue, a soft edge, the middle left clean for type. Reserve it for a section
 * change into a statement (two or three times in a film at most).
 *
 * The ring is one full-frame layer: a radial gradient (clear inside the hole, the colour outside)
 * whose ellipse is scaled and moved per frame; the swirl-in sweeps it on with an angular mask. House
 * numbers (60 fps): swirl 8 f on E.glideOut from a hole 1.6x its rest size; hole at rest 0.74 x 1.12 of
 * the frame (its edge reads as a vignette that crops the corners), soft edge 0.36 of the radius;
 * tighten to 0.86 over 28 f; wobble 25 px over 2 s.
 */
export type BlobRingProps = {
  start: number; // the frame before the ring shows
  swirl?: number; // frames of the swirl-in
  swirlEase?: Ease; // house E.glideOut
  from?: number; // the hole's scale when the swirl starts (house 1.6)
  hole?: { w: number; h: number }; // the hole at rest: the ellipse where the colour is half on, px
  soft?: number; // the edge's half width, share of the ellipse radius (house 0.36)
  gamma?: number; // the edge's profile: density = ramp ^ gamma (house 1, linear; > 1 keeps the hole clean longer and darkens late)
  tighten?: { at?: number; frames?: number; to?: number; ease?: Ease }; // house: from the swirl's end, 28 f, 0.86, M.ringTighten
  release?: { at: number; frames?: number; to?: number; ease?: Ease }; // loosen again (house 16 f back to 1, E.stdInOut)
  wobble?: { px?: number; period?: number }; // centre wander, px at 1080p and seconds
  centre?: { x: number; y: number };
  angle?: number; // where the sweep starts, deg (0 = up, clockwise)
  front?: number; // the sweep front's softness, deg (house 50)
  color?: string; // the ring's hue (house the accent)
  id?: string;
};

export type BlobRingState = {
  phase: 'before' | 'swirl' | 'hold' | 'tighten' | 'release';
  sweep: number; // 0..1 of the turn drawn
  scale: number; // the hole's scale against its rest size
  hw: number; // the hole's half axes now, px
  hh: number;
  cx: number; // its centre now, px
  cy: number;
  soft: number;
  gamma: number;
};

const HOUSE = { swirl60: 8, from: 1.6, soft: 0.36, tighten60: 28, tightenTo: 0.86, release60: 16, wobblePx: 25, wobbleS: 2 } as const;

/** The frames of a blob ring: start, swirl end, tighten start and end. */
export const blobRingFrames = (p: BlobRingProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const swirl = Math.max(1, p.swirl ?? f60x(HOUSE.swirl60, fps));
  const tAt = p.tighten?.at ?? p.start + swirl;
  const tFrames = Math.max(1, p.tighten?.frames ?? f60x(HOUSE.tighten60, fps));
  return { start: p.start, swirlEnd: p.start + swirl, tightenFrom: tAt, tightenTo: tAt + tFrames };
};

/** The ring at frame f. Pure, closed form. */
export const blobRingState = (f: number, p: BlobRingProps, film?: Partial<FilmCtx>): BlobRingState => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const u = Math.min(width, height) / 1080;
  const fr = blobRingFrames(p, film);
  const hole = p.hole ?? { w: 0.74 * width, h: 1.12 * height };
  const soft = p.soft ?? HOUSE.soft;
  let scale = 1;
  let sweep = 1;
  let phase: BlobRingState['phase'] = 'hold';
  if (f <= fr.start) {
    sweep = 0;
    scale = p.from ?? HOUSE.from;
    phase = 'before';
  } else if (f < fr.swirlEnd) {
    const t = (p.swirlEase ?? E.glideOut)(clamp((f - fr.start) / (fr.swirlEnd - fr.start)));
    sweep = t;
    scale = mix(p.from ?? HOUSE.from, 1, t);
    phase = 'swirl';
  }
  if (f >= fr.tightenFrom && phase !== 'before') {
    const to = p.tighten?.to ?? HOUSE.tightenTo;
    const k = (p.tighten?.ease ?? M.ringTighten)(clamp((f - fr.tightenFrom) / (fr.tightenTo - fr.tightenFrom)));
    scale *= mix(1, to, k);
    if (f < fr.tightenTo) phase = 'tighten';
    if (p.release && f >= p.release.at) {
      const rf = Math.max(1, p.release.frames ?? f60x(HOUSE.release60, fps));
      const r = (p.release.ease ?? E.stdInOut)(clamp((f - p.release.at) / rf));
      scale = (scale / mix(1, to, k)) * mix(mix(1, to, k), p.release.to ?? 1, r);
      phase = 'release';
    }
  }
  const wp = (p.wobble?.px ?? HOUSE.wobblePx) * u;
  const per = Math.max(0.1, p.wobble?.period ?? HOUSE.wobbleS) * fps;
  const tw = (f - fr.start) / per;
  const c = p.centre ?? { x: width / 2, y: height / 2 };
  const cx = c.x + (phase === 'before' ? 0 : wp * Math.sin(2 * Math.PI * tw));
  const cy = c.y + (phase === 'before' ? 0 : 0.6 * wp * Math.sin(2 * Math.PI * tw * 0.73 + 1.1));
  return { phase, sweep, scale, hw: (hole.w / 2) * scale, hh: (hole.h / 2) * scale, cx, cy, soft, gamma: Math.max(0.2, p.gamma ?? 1) };
};

/**
 * The ring's colour density (0..1) at a frame point for a state: 0 inside the hole's soft edge, 1
 * outside it, linear across the edge (what the gradient draws); times the sweep mask. For measuring.
 */
export const blobDensity = (s: BlobRingState, x: number, y: number, o: { angle?: number; front?: number } = {}) => {
  const r = Math.hypot((x - s.cx) / s.hw, (y - s.cy) / s.hh);
  const d = clamp((r - (1 - s.soft)) / (2 * s.soft)) ** s.gamma;
  if (s.sweep >= 1) return d;
  const a = ((Math.atan2(x - s.cx, -(y - s.cy)) * 180) / Math.PI - (o.angle ?? 0) + 720) % 360; // 0 = up, clockwise
  const front = o.front ?? 50;
  const reach = s.sweep * (360 + front);
  return d * clamp((reach - a) / front);
};

/** 'r, g, b' of a '#rrggbb' token (or an 'rgb(...)' string). */
const colorRgb = (c: string) => {
  const m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return `${m[1]}, ${m[2]}, ${m[3]}`;
  const h = c.replace('#', '');
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)).join(', ');
};

export const BlobRing: React.FC<BlobRingProps & { frame: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = blobRingState(props.frame, props, film);
  if (s.phase === 'before') return null;
  const color = props.color ?? C.accent;
  // gradient ending shape = the outer edge of the soft band; clear up to the inner edge, then the edge's profile
  // (density = ramp ^ gamma) as eight stops of the one colour at rising alpha
  const outer = 1 + s.soft;
  const inner = ((1 - s.soft) / outer) * 100;
  const rgb = colorRgb(color);
  const stops = Array.from({ length: 9 }, (_, i) => {
    const k = i / 8;
    return `rgba(${rgb}, ${(k ** s.gamma).toFixed(4)}) ${(inner + (100 - inner) * k).toFixed(3)}%`;
  }).join(', ');
  const front = props.front ?? 50;
  const reach = s.sweep * (360 + front);
  const mask =
    s.sweep < 1
      ? `conic-gradient(from ${(props.angle ?? 0).toFixed(2)}deg at ${s.cx.toFixed(2)}px ${s.cy.toFixed(2)}px, #000 0deg, #000 ${Math.max(0, reach - front).toFixed(2)}deg, transparent ${reach.toFixed(2)}deg)`
      : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse ${(s.hw * outer).toFixed(2)}px ${(s.hh * outer).toFixed(2)}px at ${s.cx.toFixed(2)}px ${s.cy.toFixed(2)}px, rgba(${rgb}, 0) 0%, ${stops})`,
        maskImage: mask,
        WebkitMaskImage: mask,
        ...props.style,
      }}
    />
  );
};

/** A blob ring opening a statement is a `mask` seam at its first drawn frame. */
export const declares = (p?: Partial<BlobRingProps>, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.start + 1, kind: 'mask', carry: 'shape', id: p.id ?? 'blobRing' }] };
};
