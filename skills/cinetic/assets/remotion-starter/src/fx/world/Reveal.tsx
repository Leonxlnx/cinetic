/**
 * cinetic:light the band of light riding an iris edge as it opens
 *
 * Reveal: the world opens out of a shape that means something: the product's sparkle, its mark, the button just
 * pressed. Its children (a <World> and what stands in it) show only inside the shape, which grows from the seed to past
 * the frame's farthest corner; outside, whatever is behind the Reveal stays (the dark field the seed sat on).
 *
 *   <Reveal at={24} shape="scallop" seed={C.white}>        (a sparkle seed; the world opens in a cloud-edged iris)
 *     <World kind="clouds" src={staticFile('plates/clouds.jpg')} />
 *   </Reveal>
 *   <Reveal at={40} shape="button" box={{ x: 1180, y: 520, w: 220, h: 84 }}>...</Reveal>   (the pressed button grows into the frame)
 *   <Reveal at={10} shape="path" path={{ d: MARK_D, w: 64, h: 64, origin: [0.5, 0.55] }}>...</Reveal>  (a zoom through the mark)
 *
 *   shape   scallop (a cloud's edge: round lobes of different widths with cusps between them, turning a little as
 *           it opens: the default) · circle · sparkle (a
 *           four-point star that rounds into a circle as it grows) · button (a rounded rect from `box` to the frame)
 *           · path (an SVG path, `path.d` in its own w x h box, scaled up through `origin`, a point inside its solid)
 *   x, y    the origin, frame px (default the frame's centre; button and path take theirs from box and path)
 *   size    the seed's size in px at 1080p (default 64)
 *   dur60   the open in 60 fps frames (default 72: 1.2 s, E.stdInOut: it gathers, opens and lands past the corners)
 *   seed    the seed's colour, drawn before and during the open (default white for scallop, circle and sparkle;
 *           false to draw none, as for a button the shot already draws); it turns a quarter while the world opens
 *           round it and lands as it started. `seedAfter` its colour once the world shows behind it (ink on a pale
 *           plate: give it), `keep` holds it after the open (or let it hand over to the product's button: a disc
 *           drawn under it at the same point as it fades, see lighting.md, iris-into-input)
 *   edge    a band of light riding the iris edge as it opens, 0..1 (default 0.35; 0 for none): three soft strokes, no filter
 *
 * Cost: one clip path on the revealed layer while it opens (none after it lands); the edge is one SVG of three strokes.
 * Pure state: revealState(f, p, film).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../../brand/tokens';
import { clamp, E, type Ease, lmix, mix } from '../../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../../lib/film';
import type { Declares } from '../../timeline';
import { farCorner } from '../Iris';

/**
 * House numbers. `wobble`: how far a cloud edge strays from a regular scallop (lobes of different widths and reach,
 * the same every frame); `seedTurn`: the sparkle seed turns a quarter (a four-point star lands as it started) while the
 * world opens round it.
 */
export const REVEAL = { dur60: 72, size: 64, lobes: 11, depth: 0.09, turn: 0.4, wobble: 1, seedTurn: 90, edge: 0.35, sparkle: 0.3, zoom: 70, band: [22, 10, 3.5] as const, bandA: [0.1, 0.22, 0.75] as const } as const;

export type RevealShape = 'scallop' | 'circle' | 'sparkle' | 'button' | 'path';
export type RevealProps = {
  at: number;
  shape?: RevealShape;
  x?: number;
  y?: number;
  size?: number;
  dur60?: number;
  ease?: Ease;
  box?: { x: number; y: number; w: number; h: number; r?: number };
  path?: { d: string; w: number; h: number; origin?: [number, number] };
  seed?: string | false;
  seedAfter?: string;
  keep?: boolean;
  edge?: number;
  frame?: number;
  children?: React.ReactNode;
};

type Pt = [number, number];

/** The open at frame f: t 0..1 (eased progress e), the radius R in px and whether it has landed. Pure. */
export const revealState = (f: number, p: Pick<RevealProps, 'at' | 'dur60' | 'ease' | 'size' | 'x' | 'y' | 'shape'>, film: Partial<FilmCtx> & { width: number; height: number }) => {
  const u = Math.min(film.width, film.height) / 1080;
  const dur = f60x(p.dur60 ?? REVEAL.dur60, fpsOf(film));
  const t = clamp((f - p.at) / Math.max(1, dur));
  const e = (p.ease ?? E.stdInOut)(t);
  const x = p.x ?? film.width / 2;
  const y = p.y ?? film.height / 2;
  const r0 = ((p.size ?? REVEAL.size) * u) / 2;
  const far = farCorner(x, y, film.width, film.height) / (1 - REVEAL.depth) + 4 * u;
  return { t, e, x, y, r0, R: mix(r0 * 0.9, far, e), started: f >= p.at, landed: t >= 1 };
};

/** A lobe's own number 0..1 (a fixed hash of its index: the same cloud every frame and every render). Pure. */
const lobeHash = (i: number) => {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * A cloud edge: round lobes with cusps between them, turned by `phase` (radians), as points around (x, y). `wobble`
 * (0 a regular scallop, 1 the house cloud) gives the lobes different widths (a smooth, monotonic warp of the angle)
 * and different reach (each lobe bulges by its own fixed amount; the cusps stay on the circle, so the edge is
 * continuous). Pure.
 */
export const scallopPoints = (x: number, y: number, r: number, phase = 0, lobes: number = REVEAL.lobes, depth: number = REVEAL.depth, wobble: number = REVEAL.wobble): Pt[] => {
  const n = lobes * 12;
  return Array.from({ length: n }, (_, i) => {
    const th = (i / n) * Math.PI * 2;
    const tw = th + wobble * (0.11 * Math.sin(3 * th + 1.3) + 0.06 * Math.sin(5 * th + 0.4));
    const q = (lobes * (tw - phase)) / 2;
    const k = Math.sqrt(Math.abs(Math.sin(q)));
    const lobe = ((Math.floor(q / Math.PI) % lobes) + lobes) % lobes;
    const bulge = wobble * (lobeHash(lobe) - 0.5) * 0.08;
    const rr = r * (1 - depth * (1 - k)) * (1 + bulge * k);
    return [x + rr * Math.cos(th), y + rr * Math.sin(th)] as Pt;
  });
};

/** A four-point star rounding into a circle: `round` 0 a star (tips on the axes), 1 a circle. Pure. */
export const sparklePoints = (x: number, y: number, r: number, round: number, turn = 0): Pt[] => {
  const n = 96;
  const k = mix(REVEAL.sparkle, 1, clamp(round));
  return Array.from({ length: n }, (_, i) => {
    const th = (i / n) * Math.PI * 2;
    const tip = Math.abs(Math.cos(2 * th)) ** 5; // 1 on the axes, 0 between them
    const rr = r * (k + (1 - k) * tip);
    return [x + rr * Math.cos(th + turn), y + rr * Math.sin(th + turn)] as Pt;
  });
};

/** A circle as points. Pure. */
export const circlePoints = (x: number, y: number, r: number, n = 96): Pt[] => Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * Math.PI * 2), y + r * Math.sin((i / n) * Math.PI * 2)] as Pt);

const polygonCss = (pts: Pt[]) => `polygon(${pts.map(([a, b]) => `${a.toFixed(1)}px ${b.toFixed(1)}px`).join(', ')})`;
const polylineAttr = (pts: Pt[]) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

/** The sparkle seed as an SVG path in a box of `s` px (concave sides, round tips). Pure. */
export const sparklePath = (s: number) => {
  const c = s / 2;
  const q = s * 0.06; // how far the sides bow in toward the centre
  return `M${c} 0 Q${c + q} ${c - q} ${s} ${c} Q${c + q} ${c + q} ${c} ${s} Q${c - q} ${c + q} 0 ${c} Q${c - q} ${c - q} ${c} 0 Z`;
};

export const Reveal: React.FC<RevealProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const { width: W, height: H } = sizeOf(film);
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const shape = p.shape ?? 'scallop';
  const ox = p.box ? p.box.x + p.box.w / 2 : p.x;
  const oy = p.box ? p.box.y + p.box.h / 2 : p.y;
  const s = revealState(f, { ...p, x: ox, y: oy }, { ...film, width: W, height: H });
  const seedColour = p.seed === undefined ? (shape === 'button' ? false : C.white) : p.seed;
  const size = (p.size ?? REVEAL.size) * u;
  const edge = p.edge ?? (shape === 'button' || shape === 'path' ? 0 : REVEAL.edge);

  let clip: string | undefined;
  let rim: Pt[] | null = null;
  let svgClip: React.ReactNode = null;
  const clipId = `reveal-${Math.round(s.x)}-${Math.round(s.y)}-${p.at}`;
  if (s.started && !s.landed) {
    if (shape === 'circle') rim = circlePoints(s.x, s.y, s.R);
    else if (shape === 'sparkle') rim = sparklePoints(s.x, s.y, s.R, s.e * 2.2, s.e * 0.35);
    else if (shape === 'scallop') rim = scallopPoints(s.x, s.y, s.R, s.e * REVEAL.turn);
    if (rim) clip = polygonCss(rim);
    else if (shape === 'button' && p.box) {
      const b = p.box;
      const r = mix(b.r ?? b.h / 2, 0, s.e);
      const top = mix(b.y, 0, s.e);
      const left = mix(b.x, 0, s.e);
      const right = mix(W - b.x - b.w, 0, s.e);
      const bottom = mix(H - b.y - b.h, 0, s.e);
      clip = `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px round ${r.toFixed(1)}px)`;
    } else if (shape === 'path' && p.path) {
      const pa = p.path;
      const [gx, gy] = pa.origin ?? [0.5, 0.5];
      const k0 = size / Math.max(pa.w, pa.h);
      const k = lmix(k0, k0 * REVEAL.zoom, s.e);
      svgClip = (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <path d={pa.d} transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) scale(${k.toFixed(5)}) translate(${(-gx * pa.w).toFixed(3)} ${(-gy * pa.h).toFixed(3)})`} />
            </clipPath>
          </defs>
        </svg>
      );
      clip = `url(#${clipId})`;
    }
  }

  // the seed: drawn before the open and over it, turning to `seedAfter` once the world shows behind it
  const seedK = seedColour ? (p.keep ? 1 : 1 - clamp((s.t - 0.55) / 0.35)) : 0;
  const after = clamp((s.R - size * 1.4) / (size * 0.8));
  const seedFill = seedColour ? (s.started && p.seedAfter ? (after >= 0.5 ? p.seedAfter : seedColour) : seedColour) : undefined;
  const seedNode =
    seedColour && seedK > 0 && shape !== 'button' ? (
      shape === 'path' && p.path ? (
        s.started ? null : (
          <svg width={size} height={size} viewBox={`0 0 ${p.path.w} ${p.path.h}`} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(s.x - size / 2).toFixed(2)}px, ${(s.y - size / 2).toFixed(2)}px)` }}>
            <path d={p.path.d} fill={seedFill} />
          </svg>
        )
      ) : (
        <svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(s.x - size / 2).toFixed(2)}px, ${(s.y - size / 2).toFixed(2)}px) rotate(${(REVEAL.seedTurn * s.e).toFixed(2)}deg)`, opacity: seedK }}>
          <path d={sparklePath(size)} fill={seedFill} />
        </svg>
      )
    ) : null;

  const edgeK = edge * Math.sin(Math.PI * s.t);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, pointerEvents: 'none' }}>
      {svgClip}
      {s.started ? <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: clip, overflow: 'hidden' }}>{p.children}</div> : null}
      {rim && edgeK > 0.01 ? (
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: edgeK, mixBlendMode: 'plus-lighter' }}>
          {REVEAL.band.map((bw, i) => (
            <polygon key={i} points={polylineAttr(rim as Pt[])} fill="none" stroke={C.white} strokeOpacity={REVEAL.bandA[i]} strokeWidth={bw * u} strokeLinejoin="round" />
          ))}
        </svg>
      ) : null}
      {seedNode}
    </div>
  );
};

/** An iris is continuous: nothing steps or flashes (a whole-frame change: the shot declares its seam). */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
