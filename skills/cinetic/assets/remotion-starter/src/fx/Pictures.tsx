import React, { useId, useMemo } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, M, mix } from '../lib/anim';
import { DEFOCUS_SHARP, defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, FilmProvider, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { conveyorTravel } from './Conveyor';
import { Footage, type FootageProps } from './Footage';
import { Photo, type PhotoGrade, type PhotoMove, type PhotoSrc } from './Photo';
import { type MasonryTile, masonryState } from './Scroll';

/**
 * Pictures: real photographs and footage treated the way a studio treats them. A person, a place, a product or a
 * moment of use is a real photo or clip (scripts/assets.mjs finds them under licences that need no credit, or the
 * user supplies them), never drawn in SVG; these primitives give it the finish: a rounded card with a rim and a
 * contact shadow, a lean in depth, depth of field, motion blur along its travel, and a grade into the film.
 *
 *   PhotoCard      one photo on a card: cover-fit on its focus point, corner radius 8.5 % of the short side, a 1 px
 *                  inner rim, a two-part shadow (a tight contact and a soft lift), an optional mat (a paper gap and a
 *                  hairline in a muted accent around the card), a tilt in 3D (perspective, lean, turn), a push or
 *                  drift inside the card (fx/Photo moves), a grade (kit/theme photoGrade), an appear, a defocus at
 *                  fixed levels and a smear along any direction
 *   ArcRiver       a stream of photo cards: by default a LEVEL row (one y, the path's height at the focus), one
 *                  way, arriving fast and slowing until it lands at rest (PICTURES.river.land), cards upright and
 *                  facing the camera, sizes x0.85-1.18, a smear along the travel from the speed and a defocus that
 *                  grows with the distance from the focus; never cards rising and sinking on a curve while the
 *                  stream pans back and forth. `level={false}` runs it along the curve (spacing measured along it)
 *                  for a designed move; `outAt` sends a landed row off at speed into a cut
 *   PhotoWall      a masonry wall of photos that scrolls up into place, each tile on its own settle (fx/Scroll
 *                  masonryState), smeared by its own speed; wallLayout() builds the columns from the photos' shapes
 *   InlinePhoto    a photo card set inside a line of type, the words on either side at its middle; it settles as the
 *                  line holds (the card is a word of the line while it is on screen). For a chip that grows in a
 *                  gap and cuts through several pictures, fx/InlineGap takes PhotoFill items
 *   PhotoFill      a photo filling any box (a chip, a pill, a device screen), with a push
 *   FootageWindow  a muted clip in a rounded window: fx/Footage (closed-form clock, speed, freezes, loops) inside the
 *                  card's finish
 *
 * House numbers (px at 1080p, 60 fps frames; PICTURES): card radius 8.5 % of the short side; mat gap 10, line 2.5;
 * shadow contact 0 2 5 / .14 and lift 0 14 36 / .16 (scaled by u and the card's size); river cards 280 x 345 at pitch
 * 300 along the curve, sizes x0.85-1.18, across jitter 40, smear at a 300-degree shutter (sigma 0.24 x px a frame),
 * defocus up to 9 px from 30 % to 95 % of the half-diagonal away from the focus; river speed from fx/Conveyor (65 in,
 * 18 cruise, 110 out, px per 60 fps frame). Appear (appearState): settle x1.16 -> 1 with a 6 px defocus over 24 f on
 * M.oversize; rise 6 % of the card's height and a 6 px defocus over 30 f on E.glideOut; clip, the card uncovered from
 * its bottom edge over 26 f on E.softOut while the photo settles x1.12 -> 1; flip, edge-on to face over 22 f on
 * E.glideOut; pop 62 % -> 100 % in 2 f, never over; fade 12 f.
 *
 * Every state is a pure function of the frame (cardBox, appearState, arcRiverState, wallLayout); the components are
 * thin. Blur levels follow lib/defocus (fixed levels cross-faded, at most two copies); a smear on a moving card is an
 * exact Gaussian along its travel on that small layer. pictureTrack() writes the boxes the pictures hold for
 * look-audit.py --imagery-track, so natural colour inside a photo is never read as designed colour.
 */

/** House numbers: px at 1080p (scaled by u), 60 fps frames (f60x), shares. */
export const PICTURES = {
  card: { radius: 0.085, rim: 0.16, contact: [0, 2, 5, 0.14], lift: [0, 14, 36, 0.16] },
  mat: { gap: 10, line: 2.5, shadow: 0.2 }, // a matted card sits nearly flat: its paper ring is the edge
  tilt: { perspective: 1800 },
  river: { pitch: 300, card: [280, 345], size: [0.85, 1.18], across: 40, along: 30, shutter: 300, blur: { max: 9, near: 0.3, far: 0.95 }, land: 96 },
  wall: { gap: 28, cols: 4, aspect: [0.66, 1.5] },
  appear: {
    settle: { dur60: 24, from: 1.16, blur: 6 },
    rise: { dur60: 30, dy: 0.06, blur: 6 },
    clip: { dur60: 26, from: 1.12 },
    flip: { dur60: 22, perspective: 1200 },
    pop: { dur60: 2, from: 0.62 },
    fade: { dur60: 12 },
  },
} as const;

export type Pic = PhotoSrc;
export type CardTilt = { rx?: number; ry?: number; rz?: number; perspective?: number }; // degrees; rx > 0 leans the top away
export type CardMat = { color: string; gap?: number; line?: number; fill?: string }; // gap and line px at 1080p
export type AppearKind = 'settle' | 'rise' | 'clip' | 'flip' | 'pop' | 'fade';
export type Appear = { at: number; kind?: AppearKind; dur60?: number; ease?: Ease; from?: number };
export type AppearState = { p: number; opacity: number; scale: number; dy: number; blur: number; clip: number; inner: number; rotY: number; done: boolean };
export type Smear = { v: number; angle: number }; // film px per film frame along `angle` (deg, 0 = +x, 90 = down)

// ------------------------------------------------------------------------------------------------ appear
/**
 * An entrance at frame f: opacity, scale, dy (px), blur (px at 1080p), clip (share of the card still hidden, from the
 * top: the card is uncovered from its bottom edge up), inner (the photo's own scale inside the card), rotY (deg).
 * h = the card's height in film px (for rise). Pure.
 */
export const appearState = (f: number, a: Appear | undefined, film?: Partial<FilmCtx>, h = 0): AppearState => {
  const rest: AppearState = { p: 1, opacity: 1, scale: 1, dy: 0, blur: 0, clip: 0, inner: 1, rotY: 0, done: true };
  if (!a) return rest;
  const kind = a.kind ?? 'settle';
  const H = PICTURES.appear[kind];
  const fps = fpsOf(film);
  const dur = Math.max(1, f60x(a.dur60 ?? H.dur60, fps));
  const t = clamp((f - a.at) / dur);
  if (f < a.at) return { ...rest, p: 0, opacity: 0, done: false, clip: kind === 'clip' ? 1 : 0 };
  const done = t >= 1;
  switch (kind) {
    case 'settle': {
      const e = (a.ease ?? M.oversize)(t);
      const from = a.from ?? PICTURES.appear.settle.from;
      return { ...rest, p: e, opacity: clamp(t / 0.16), scale: mix(from, 1, e), blur: PICTURES.appear.settle.blur * (1 - e) ** 2, done };
    }
    case 'rise': {
      const e = (a.ease ?? E.glideOut)(t);
      return { ...rest, p: e, opacity: clamp(t / 0.4), dy: (a.from ?? PICTURES.appear.rise.dy) * h * (1 - e), blur: PICTURES.appear.rise.blur * (1 - e), done };
    }
    case 'clip': {
      const e = (a.ease ?? E.softOut)(t);
      return { ...rest, p: e, clip: 1 - e, inner: mix(a.from ?? PICTURES.appear.clip.from, 1, e), done };
    }
    case 'flip': {
      const e = (a.ease ?? E.glideOut)(t);
      return { ...rest, p: e, opacity: t > 0 ? 1 : 0, rotY: (a.from ?? 90) * (1 - e), done };
    }
    case 'pop': {
      const from = a.from ?? PICTURES.appear.pop.from;
      return { ...rest, p: t, scale: mix(from, 1, t), done };
    }
    case 'fade':
    default: {
      const e = (a.ease ?? E.softOut)(t);
      return { ...rest, p: e, opacity: e, done };
    }
  }
};

// ------------------------------------------------------------------------------------------------ card
/** The finish of a card of w x h film px: corner radius, rim width, the two shadows as CSS. Pure. */
export const cardFinish = (w: number, h: number, film?: Partial<FilmCtx>, o: { radius?: number; shadow?: number; rim?: number } = {}) => {
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const r = o.radius ?? PICTURES.card.radius * Math.min(w, h);
  const k = Math.max(0.5, Math.min(2, Math.sqrt((w * h) / (300 * 360 * u * u)))); // larger cards cast larger shadows
  const s = o.shadow ?? 1;
  const [cx, cy, cb, ca] = PICTURES.card.contact;
  const [lx, ly, lb, la] = PICTURES.card.lift;
  const px = (v: number) => `${(v * u * k).toFixed(2)}px`;
  const shadow = s > 0 ? `${px(cx)} ${px(cy)} ${px(cb)} rgba(0,0,0,${(ca * s).toFixed(3)}), ${px(lx)} ${px(ly)} ${px(lb)} rgba(0,0,0,${(la * s).toFixed(3)})` : 'none';
  return { radius: r, rim: Math.max(1, u), rimAlpha: o.rim ?? PICTURES.card.rim, shadow };
};

/** The CSS transform of a tilted card (perspective first, then the lean, the turn, the roll). Pure. */
export const tiltTransform = (t: CardTilt | undefined, film?: Partial<FilmCtx>) => {
  if (!t || (!t.rx && !t.ry && !t.rz)) return '';
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  return `perspective(${((t.perspective ?? PICTURES.tilt.perspective) * u).toFixed(1)}px) rotateX(${(t.rx ?? 0).toFixed(3)}deg) rotateY(${(t.ry ?? 0).toFixed(3)}deg) rotateZ(${(t.rz ?? 0).toFixed(3)}deg)`;
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

/**
 * Blur copies of a card: a defocus `sigma` at fixed levels (lib/defocus, at most two copies cross-faded) and, with a
 * smear, an exact Gaussian along the travel (film px). Each copy is { level, weight, along, across }. Pure.
 */
export const cardBlurCopies = (sigma: number, smear?: number) => {
  const m = Math.max(0, smear ?? 0);
  const base = sigma >= DEFOCUS_SHARP ? defocusMix(sigma) : [{ level: 0, weight: 1 }];
  return base.map((c) => ({ ...c, along: Math.hypot(m, c.level), across: c.level })).map((c) => ({ ...c, along: c.along < DEFOCUS_SHARP ? 0 : c.along }));
};

export type PhotoCardProps = {
  photo: Pic;
  frame: number;
  x: number; // centre, film px
  y: number;
  w: number; // size, film px
  h: number;
  radius?: number; // px; default 8.5 % of the short side
  rim?: number; // the inner hairline's white alpha (0 = none)
  mat?: CardMat; // a paper gap and a hairline around the card
  shadow?: number; // 0..1 (default 1, 0.2 with a mat); 0 = none (a card on a photo, on footage)
  tilt?: CardTilt;
  grade?: PhotoGrade;
  move?: PhotoMove; // a push or drift inside the card (fx/Photo; drift in card px)
  appear?: Appear;
  blur?: number; // defocus sigma, px at 1080p
  smear?: Smear; // motion smear: speed in film px per film frame and the travel's angle
  shutter?: number; // the smear's shutter, degrees (default PICTURES.river.shutter)
  opacity?: number;
  z?: number;
  fill?: string; // the card's colour under the photo while it loads, and behind a contained photo
  children?: React.ReactNode; // drawn over the photo, inside the card (a label, a UI chip)
  style?: React.CSSProperties;
  id?: string;
};

export const PhotoCard: React.FC<PhotoCardProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const auto = useId();
  const uid = safe(p.id ?? auto);
  const fin = cardFinish(p.w, p.h, film, { radius: p.radius, shadow: p.shadow ?? (p.mat ? PICTURES.mat.shadow : 1), rim: p.rim });
  const ap = appearState(p.frame, p.appear, film, p.h);
  const inner = useMemo(() => ({ width: p.w, height: p.h }), [p.w, p.h]);
  if (ap.opacity <= 0 && !ap.done && ap.clip >= 1) return null;
  const smearSigma = p.smear ? (Math.abs(p.smear.v) * (p.shutter ?? PICTURES.river.shutter)) / 360 / Math.sqrt(12) : 0;
  const copies = cardBlurCopies((p.blur ?? 0) * u + ap.blur * u, smearSigma);
  const angle = p.smear?.angle ?? 0;
  const mat = p.mat ? { gap: (p.mat.gap ?? PICTURES.mat.gap) * u, line: (p.mat.line ?? PICTURES.mat.line) * u } : null;
  const grow = mat ? mat.gap + mat.line : 0;
  const clipPath = ap.clip > 0 ? `inset(${(ap.clip * 100).toFixed(3)}% 0 0 0 round ${fin.radius.toFixed(2)}px)` : undefined;
  const card = (
    <div style={{ position: 'absolute', inset: 0 }}>
      {mat && (
        <div style={{ position: 'absolute', inset: -grow, borderRadius: fin.radius + grow, background: p.mat?.fill ?? C.paper, border: `${mat.line.toFixed(2)}px solid ${p.mat?.color}`, boxShadow: fin.shadow, clipPath: clipPath ? `inset(${(ap.clip * 100).toFixed(3)}% 0 0 0 round ${(fin.radius + grow).toFixed(2)}px)` : undefined }} />
      )}
      <div style={{ position: 'absolute', inset: 0, borderRadius: fin.radius, overflow: 'hidden', background: p.fill ?? C.mist, boxShadow: mat ? 'none' : fin.shadow, clipPath, isolation: 'isolate' }}>
        <div style={{ position: 'absolute', inset: 0, transform: ap.inner !== 1 ? `scale(${ap.inner.toFixed(5)})` : undefined, transformOrigin: `${((p.photo.focus?.[0] ?? 0.5) * 100).toFixed(1)}% ${((p.photo.focus?.[1] ?? 0.5) * 100).toFixed(1)}%` }}>
          <FilmProvider value={inner}>
            <Photo photo={p.photo} frame={p.frame} move={p.move} grade={p.grade} style={{ background: p.fill ?? C.mist }} />
          </FilmProvider>
        </div>
        {p.children}
        {fin.rimAlpha > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: fin.radius, boxShadow: `inset 0 0 0 ${fin.rim.toFixed(2)}px rgba(255,255,255,${fin.rimAlpha.toFixed(3)})`, pointerEvents: 'none' }} />}
      </div>
    </div>
  );
  const blurred = copies.length === 1 && copies[0].along === 0 ? (
    card
  ) : (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        {copies.map((c, i) => (c.along > 0 ? (
          <filter key={i} id={`${uid}-b${i}`} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${c.along.toFixed(2)} ${c.across.toFixed(2)}`} />
          </filter>
        ) : null))}
      </svg>
      {copies.map((c, i) => (
        <div key={i} data-audit-copy={i > 0 ? '' : undefined} data-audit-smear={smearSigma > 0 ? '' : undefined} style={{ position: 'absolute', inset: 0, opacity: i === 0 ? 1 : c.weight, transform: angle ? `rotate(${angle.toFixed(3)}deg)` : undefined, filter: c.along > 0 ? `url(#${uid}-b${i})` : undefined }}>
          <div style={{ position: 'absolute', inset: 0, transform: angle ? `rotate(${(-angle).toFixed(3)}deg)` : undefined }}>{card}</div>
        </div>
      ))}
    </>
  );
  const tilt = tiltTransform(p.tilt, film);
  const flip = ap.rotY ? `perspective(${(PICTURES.appear.flip.perspective * u).toFixed(1)}px) rotateY(${ap.rotY.toFixed(3)}deg)` : '';
  const move = `translate(${(p.x - p.w / 2).toFixed(3)}px, ${(p.y - p.h / 2 + ap.dy).toFixed(3)}px)`;
  return (
    <div
      data-imagery=""
      style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transform: `${move} ${tilt} ${flip} scale(${ap.scale.toFixed(5)})`.replace(/\s+/g, ' '), transformOrigin: '50% 50%', opacity: (p.opacity ?? 1) * ap.opacity, zIndex: p.z, ...p.style }}
    >
      {blurred}
    </div>
  );
};

/** A photo filling its box (a chip, a pill, a device screen) on its focus point, with a push: InlineGap's items, a phone screen. */
export const PhotoFill: React.FC<{ photo: Pic; frame: number; w: number; h: number; move?: PhotoMove; grade?: PhotoGrade; radius?: number; style?: React.CSSProperties }> = (p) => {
  const inner = useMemo(() => ({ width: p.w, height: p.h }), [p.w, p.h]);
  return (
    <div style={{ position: 'relative', width: p.w, height: p.h, borderRadius: p.radius, overflow: 'hidden', ...p.style }}>
      <FilmProvider value={inner}>
        <Photo photo={p.photo} frame={p.frame} move={p.move} grade={p.grade} />
      </FilmProvider>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ arc river
export type ArcPath = { pts: [number, number][]; cum: number[]; length: number };

/** Catmull-Rom through the points (centripetal, so a tight bend never loops), sampled every ~`step` px. Pure. */
export const arcPath = (points: readonly (readonly [number, number])[], step = 6): ArcPath => {
  const P = points.map((q) => [q[0], q[1]] as [number, number]);
  if (P.length < 2) return { pts: P, cum: P.map(() => 0), length: 0 };
  const ext = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]] as [number, number], ...P, [2 * P[P.length - 1][0] - P[P.length - 2][0], 2 * P[P.length - 1][1] - P[P.length - 2][1]] as [number, number]];
  const pts: [number, number][] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
    const d = (a: [number, number], b: [number, number]) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t0 = 0;
    const t1 = t0 + d(p0, p1);
    const t2 = t1 + d(p1, p2);
    const t3 = t2 + d(p2, p3);
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const L = (a: [number, number], b: [number, number], ta: number, tb: number): [number, number] => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
      const A1 = L(p0, p1, t0, t1);
      const A2 = L(p1, p2, t1, t2);
      const A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2);
      const B2 = L(A2, A3, t1, t3);
      pts.push(L(B1, B2, t1, t2));
    }
  }
  pts.push(P[P.length - 1]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, length: cum[cum.length - 1] };
};

/** The point at arc length s (clamped to the path) and the tangent's angle (deg). Pure. */
export const pathAt = (path: ArcPath, s: number): { x: number; y: number; angle: number } => {
  const { pts, cum, length } = path;
  if (pts.length < 2) return { x: pts[0]?.[0] ?? 0, y: pts[0]?.[1] ?? 0, angle: 0 };
  const v = clamp(s, 0, length);
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= v) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const t = (v - cum[lo]) / seg;
  const [a, b] = [pts[lo], pts[hi]];
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
};

/** A path turned half round the frame's centre (px at 1080p, 1920 x 1080 by default): the second arm of an S. Pure. */
export const mirrorPath = (points: readonly (readonly [number, number])[], W = 1920, H = 1080): [number, number][] => points.map(([x, y]) => [W - x, H - y]);

/**
 * House paths, px at 1080p (1920 x 1080). `rise`: in from the left edge just under the middle, bending up and out at
 * the top a little left of centre, the arm of an S above a centred word; mirrorPath(rise) is the arm below it. Both
 * run well past the frame so the loop's seam is never seen. `sweep`: a wide shallow arc across the lower third.
 */
export const ARC_PATHS = {
  rise: [[-560, 590], [-120, 560], [200, 520], [470, 430], [690, 270], [820, 80], [880, -160], [905, -480]] as [number, number][],
  sweep: [[-420, 980], [0, 840], [480, 760], [960, 735], [1440, 760], [1920, 840], [2340, 980]] as [number, number][],
};

/** Deterministic hash in [0, 1) for card jitter. Pure. */
export const rnd01 = (i: number, seed = 0) => {
  const x = Math.sin((i + 1) * 127.1 + seed * 311.7 + 74.7) * 43758.5453123;
  return x - Math.floor(x);
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** The photo a card shows: neighbours always differ (a step coprime with the set's size). Pure. */
export const photoFor = (i: number, n: number, seed = 0) => {
  if (n <= 1) return 0;
  const step = [7, 5, 3, 11, 13, 1].find((k) => gcd(k, n) === 1) ?? 1;
  return (((i * step + seed) % n) + n) % n;
};

export type ArcRiverProps = {
  photos: Pic[];
  points?: readonly (readonly [number, number])[]; // the path, px at 1080p (default ARC_PATHS.rise)
  start: number; // first frame of the travel (cards are already on the path, moving at the in speed)
  outAt?: number; // the acceleration out starts (the cut lands at outAt + outFrames)
  outFrames?: number; // 60 fps frames (fx/Conveyor house 28)
  inFrames?: number; // 60 fps frames (house 56)
  speed?: { in?: number; cruise?: number; out?: number }; // px per 60 fps frame at 1080p (house 65, 18, 110)
  dir?: 1 | -1; // 1: cards travel in the order of the points, -1 against it
  pitch?: number; // px at 1080p between card centres along the curve (house 300)
  card?: [number, number]; // card size, px at 1080p (house 280 x 345)
  size?: [number, number]; // card scale range (house 0.85-1.18)
  across?: number; // px at 1080p of jitter across the path (house 40)
  along?: number; // px at 1080p of jitter along it (house 30)
  seed?: number;
  focus?: [number, number]; // film px: cards are sharp near it, softer away (default the frame's centre)
  blur?: { max?: number; near?: number; far?: number }; // defocus px at 1080p, from `near` to `far` shares of the half-diagonal
  shutter?: number; // the smear's shutter, degrees (0 = no smear)
  stack?: 'y' | 'along'; // which card is on top where they overlap: the lower one on screen (house), or the one further on
  level?: boolean; // one y for the whole row (the component's default: true): the path's height where it passes the focus
  y?: number; // px at 1080p: the level row's height (default: the path at the focus's x, held inside the frame)
  land?: number | false; // 60 fps frames the row takes to slow from its in speed to rest (default PICTURES.river.land; false: the conveyor's cruise)
};
export type RiverCard = { i: number; photo: number; x: number; y: number; w: number; h: number; along: number; angle: number; v: number; sigma: number; smear: number; z: number };

const pathCache = new Map<string, ArcPath>();
const cachedPath = (points: readonly (readonly [number, number])[], u: number) => {
  const key = `${u}|${JSON.stringify(points)}`;
  let hit = pathCache.get(key);
  if (!hit) {
    if (pathCache.size > 16) pathCache.delete(pathCache.keys().next().value as string);
    hit = arcPath(points.map(([x, y]) => [x * u, y * u] as [number, number]));
    pathCache.set(key, hit);
  }
  return hit;
};

/**
 * Every card of a river at frame f (film px): position on the curve (spacing measured along it, looped over the
 * path's length), size, the tangent's angle, the speed, the defocus sigma (px at 1080p) from the distance to the
 * focus, the smear sigma (film px) from the speed, and a stacking order. Pure.
 */
export const arcRiverState = (f: number, p: ArcRiverProps, film?: Partial<FilmCtx>): { s: number; v: number; cards: RiverCard[]; length: number } => {
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const { width: W, height: H } = film?.width !== undefined && film?.height !== undefined ? sizeOf(film) : { width: 1920, height: 1080 };
  const R = PICTURES.river;
  const pts = p.points ?? ARC_PATHS.rise;
  const fpsK = 60 / (film?.fps ?? 60); // 60 fps frames per film frame
  // a level row lands: from its in speed it slows evenly to rest over `land` (then holds still); `outAt` sends it off
  const landing = p.level && p.land !== false;
  const { s, v } = landing ? landedRiver(f, p, u, fpsK) : conveyorTravel(f, { start: p.start, n: 1, pitch: 1, speed: p.speed, inFrames: p.inFrames, outAt: p.outAt, outFrames: p.outFrames }, film);
  // a level row runs on one straight line across the path's span, at one y
  const xs = pts.map(([x]) => x);
  const fx0 = (p.focus?.[0] ?? W / 2) / u;
  const yAt = (() => {
    const c = cachedPath(pts, 1);
    let best = c.pts[0];
    for (const q of c.pts) if (Math.abs(q[0] - fx0) < Math.abs(best[0] - fx0)) best = q;
    return best[1];
  })();
  const ly = clamp(p.y ?? yAt, 1080 * 0.16, 1080 * 0.84);
  const path = p.level ? cachedPath([[Math.min(...xs, -400), ly], [Math.max(...xs, 2320), ly]], u) : cachedPath(pts, u);
  const L = path.length;
  const n = Math.max(1, Math.round(L / ((p.pitch ?? R.pitch) * u)));
  const pitch = L / n;
  const dir = p.dir ?? 1;
  const [cw, ch] = (p.card ?? R.card).map((x) => x * u);
  const [lo, hi] = p.size ?? R.size;
  const focus = p.focus ?? [W / 2, H / 2];
  const half = Math.hypot(W, H) / 2;
  const bmax = p.blur?.max ?? R.blur.max;
  const near = p.blur?.near ?? R.blur.near;
  const far = p.blur?.far ?? R.blur.far;
  const shutter = p.shutter ?? R.shutter;
  const seed = p.seed ?? 0;
  const cards: RiverCard[] = [];
  for (let i = 0; i < n; i++) {
    const jit = p.level ? 0 : ((rnd01(i, seed + 3) - 0.5) * 2 * (p.along ?? R.along)) * u;
    const along = ((((i * pitch + dir * s + jit) % L) + L) % L);
    const q = pathAt(path, along);
    // a level row keeps one y and one card size (tops and bottoms aligned); a curve takes the jitter across it
    const off = p.level ? 0 : (rnd01(i, seed + 7) - 0.5) * 2 * (p.across ?? R.across) * u;
    const a = (q.angle * Math.PI) / 180;
    const x = q.x - Math.sin(a) * off;
    const y = q.y + Math.cos(a) * off;
    const k = p.level ? 1 : mix(lo, hi, rnd01(i, seed + 11));
    const d = Math.hypot(x - focus[0], y - focus[1]) / half;
    const tt = clamp((d - near) / Math.max(1e-6, far - near));
    const sigma = bmax * tt * tt * (3 - 2 * tt);
    const smear = shutter > 0 ? (Math.abs(v) * shutter) / 360 / Math.sqrt(12) : 0;
    cards.push({ i, photo: photoFor(i, p.photos.length, seed), x, y, w: cw * k, h: ch * k, along, angle: dir > 0 ? q.angle : q.angle + 180, v, sigma, smear, z: Math.round(p.stack === 'along' ? along : y) });
  }
  return { s, v, cards, length: L };
};

/** The level row's travel (film px) and speed (film px a film frame): its in speed until `start`, slowing evenly to
 * rest over `land` 60 fps frames, at rest after; from `outAt` it accelerates off at its out speed over `outFrames`. */
const landedRiver = (f: number, p: ArcRiverProps, u: number, fpsK: number): { s: number; v: number } => {
  const vi = (p.speed?.in ?? 65) * u; // px per 60 fps frame
  const vo = (p.speed?.out ?? 110) * u;
  const T = Math.max(1, typeof p.land === 'number' ? p.land : PICTURES.river.land);
  const t = (f - p.start) * fpsK;
  if (t <= 0) return { s: vi * t, v: vi / fpsK };
  const x = Math.min(t, T);
  let s = vi * (x - (x * x) / (2 * T));
  let v = t < T ? vi * (1 - t / T) : 0;
  if (p.outAt !== undefined && f > p.outAt) {
    const To = Math.max(1, p.outFrames ?? 28);
    const y = (f - p.outAt) * fpsK;
    const a = Math.min(y, To);
    s += (vo * a * a) / (2 * To) + vo * Math.max(0, y - To);
    v = y < To ? (vo * y) / To : vo;
  }
  return { s, v: v / fpsK };
};

/** A river of photo cards: a level row that arrives one way and lands (the default), or, with `level={false}`, a
 * stream along a curve (two on mirrored paths pass like the arms of an S) for a designed move. */
export const ArcRiver: React.FC<ArcRiverProps & { frame: number; radius?: number; rim?: number; shadow?: number; grade?: PhotoGrade; mat?: CardMat; style?: React.CSSProperties }> = (q) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const p = { ...q, level: q.level ?? true };
  const st = arcRiverState(p.frame, p, film);
  const pad = 400 * uOf(film);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...p.style }}>
      {st.cards
        .filter((c) => c.x > -pad && c.x < W + pad && c.y > -pad && c.y < H + pad)
        .map((c) => (
          <PhotoCard
            key={c.i}
            id={`river${c.i}`}
            photo={p.photos[c.photo]}
            frame={p.frame}
            x={c.x}
            y={c.y}
            w={c.w}
            h={c.h}
            radius={p.radius}
            rim={p.rim}
            shadow={p.shadow}
            grade={p.grade}
            mat={p.mat}
            blur={c.sigma}
            smear={c.smear > 0 ? { v: c.v, angle: c.angle } : undefined}
            shutter={p.shutter}
            z={c.z}
          />
        ))}
    </div>
  );
};

/** Sync: the river's whoosh in, its cruise, the exit and the cut (fx/Conveyor's frames). */
export { conveyorFrames as arcRiverFrames } from './Conveyor';

// ------------------------------------------------------------------------------------------------ wall
/**
 * A masonry wall's tiles from the photos' shapes (px at 1080p): `cols` columns of width w inside [x, x + width],
 * each photo's height from its aspect (held to PICTURES.wall.aspect), columns offset by a stagger so the rows never
 * line up, each tile a depth (0.8-1.25: nearer tiles travel further) and a lag (by column). Pure.
 */
export const wallLayout = (photos: Pic[], o: { x?: number; y?: number; width?: number; cols?: number; gap?: number; stagger?: number; seed?: number; rows?: number } = {}): (MasonryTile & { photo: number })[] => {
  const cols = o.cols ?? PICTURES.wall.cols;
  const gap = o.gap ?? PICTURES.wall.gap;
  const width = o.width ?? 1920 - 2 * 120;
  const x0 = o.x ?? 120;
  const y0 = o.y ?? 60;
  const w = (width - gap * (cols - 1)) / cols;
  const [amin, amax] = PICTURES.wall.aspect;
  const stagger = o.stagger ?? 0.42;
  const rows = o.rows ?? Math.ceil(photos.length / cols) + 1;
  const tiles: (MasonryTile & { photo: number })[] = [];
  let k = 0;
  for (let c = 0; c < cols; c++) {
    let y = y0 - (c % 2 === 1 ? stagger * w : 0) - rnd01(c, (o.seed ?? 0) + 17) * 0.2 * w;
    for (let r = 0; r < rows; r++) {
      const ph = photos.length ? photoFor(k, photos.length, o.seed ?? 0) : 0;
      const pic = photos[ph];
      const aspect = pic ? clamp(pic.h / pic.w, amin, amax) : 1.25;
      const h = w * aspect;
      tiles.push({ x: x0 + c * (w + gap), y, w, h, depth: mix(0.8, 1.25, rnd01(k, (o.seed ?? 0) + 5)), lag: c % 3, photo: ph });
      y += h + gap;
      k++;
    }
  }
  return tiles;
};

/** A masonry wall of photos settling into place (fx/Scroll masonryState), each tile smeared by its own speed. */
export const PhotoWall: React.FC<{ frame: number; photos: Pic[]; tiles: (MasonryTile & { photo?: number })[]; at: number; out?: number; travel?: number; enter?: number; exit?: number; exitBy?: number; radius?: number; rim?: number; shadow?: number; grade?: PhotoGrade; mat?: CardMat; focus?: [number, number]; blur?: number; style?: React.CSSProperties }> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const st = masonryState(p.frame, { at: p.at, out: p.out, tiles: p.tiles, travel: p.travel, enter: p.enter, exit: p.exit, exitBy: p.exitBy }, film);
  const half = Math.hypot(W, H) / 2;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...p.style }}>
      {st.map((t) => {
        const cx = t.x + t.w / 2;
        const cy = t.y + t.h / 2;
        if (cy + t.h < 0 || cy - t.h > H) return null;
        const d = p.focus ? Math.hypot(cx - p.focus[0], cy - p.focus[1]) / half : 0;
        const ph = p.tiles[t.i].photo ?? photoFor(t.i, p.photos.length);
        return (
          <PhotoCard key={t.i} id={`wall${t.i}`} photo={p.photos[ph]} frame={p.frame} x={cx} y={cy} w={t.w} h={t.h} radius={p.radius} rim={p.rim} shadow={p.shadow} grade={p.grade} mat={p.mat}
            blur={p.focus ? (p.blur ?? 6) * clamp((d - 0.35) / 0.6) : 0} smear={Math.abs(t.v) > 0.5 ? { v: t.v, angle: 90 } : undefined} />
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ inline
export type LineFont = { size: number; weight?: number; family?: string; color?: string; track?: number }; // size px at 1080p
/**
 * A photo card set inside a line of type: `left` and `right` beside the card, `gap` em from it, the whole line centred
 * on x and the card's middle on y (film px). The card's size is in em of the type (house 8 x 7.5 em: a card that holds a
 * person, the words a caption beside it); the words sit at `align` of the card's height (house 0.62: a little under its
 * middle, where the eye leaves the face). Use mat for a passe-partout ring.
 */
export const INLINE_PHOTO = { card: [8.06, 7.47] as [number, number], gap: 0.55, align: 0.62 } as const;
export const InlinePhoto: React.FC<{ frame: number; x: number; y: number; left?: React.ReactNode; right?: React.ReactNode; photo: Pic; font: LineFont; card?: [number, number]; gap?: number; align?: number; appear?: Appear; mat?: CardMat; grade?: PhotoGrade; move?: PhotoMove; words?: { opacity?: number; dy?: number }; style?: React.CSSProperties }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const size = p.font.size * u;
  const [ew, eh] = p.card ?? INLINE_PHOTO.card;
  const w = ew * size;
  const h = eh * size;
  const gap = (p.gap ?? INLINE_PHOTO.gap) * size;
  const top = (p.align ?? INLINE_PHOTO.align) * h - size * 0.5;
  const type: React.CSSProperties = { fontFamily: p.font.family, fontSize: size, fontWeight: p.font.weight ?? 450, color: p.font.color ?? C.ink, letterSpacing: `${p.font.track ?? -0.01}em`, whiteSpace: 'nowrap', lineHeight: 1, marginTop: top, opacity: p.words?.opacity ?? 1, transform: p.words?.dy ? `translateY(${(p.words.dy * u).toFixed(2)}px)` : undefined, position: 'relative', zIndex: 2 };
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y - h / 2, transform: 'translateX(-50%)', display: 'flex', alignItems: 'flex-start', gap, ...p.style }}>
      {p.left !== undefined && <div style={type}>{p.left}</div>}
      <div style={{ position: 'relative', width: w, height: h, flex: 'none' }}>
        <PhotoCard photo={p.photo} frame={p.frame} x={w / 2} y={h / 2} w={w} h={h} appear={p.appear} mat={p.mat} grade={p.grade} move={p.move} />
      </div>
      {p.right !== undefined && <div style={type}>{p.right}</div>}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ footage
/** A muted clip in a rounded window (fx/Footage inside the card's finish): w x h film px centred on (x, y). */
export const FootageWindow: React.FC<{ frame: number; x: number; y: number; w: number; h: number; clip: Omit<FootageProps, 'frame' | 'style'>; radius?: number; rim?: number; shadow?: number; tilt?: CardTilt; appear?: Appear; mat?: CardMat; z?: number; children?: React.ReactNode; style?: React.CSSProperties }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const fin = cardFinish(p.w, p.h, film, { radius: p.radius, shadow: p.shadow ?? (p.mat ? PICTURES.mat.shadow : 1), rim: p.rim });
  const ap = appearState(p.frame, p.appear, film, p.h);
  const inner = useMemo(() => ({ width: p.w, height: p.h }), [p.w, p.h]);
  if (ap.opacity <= 0 && !ap.done) return null;
  const mat = p.mat ? { gap: (p.mat.gap ?? PICTURES.mat.gap) * u, line: (p.mat.line ?? PICTURES.mat.line) * u } : null;
  const grow = mat ? mat.gap + mat.line : 0;
  const clipPath = ap.clip > 0 ? `inset(${(ap.clip * 100).toFixed(3)}% 0 0 0 round ${fin.radius.toFixed(2)}px)` : undefined;
  const sigma = ap.blur * u;
  return (
    <div data-imagery="" style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transform: `translate(${(p.x - p.w / 2).toFixed(3)}px, ${(p.y - p.h / 2 + ap.dy).toFixed(3)}px) ${tiltTransform(p.tilt, film)} scale(${ap.scale.toFixed(5)})`, opacity: ap.opacity, zIndex: p.z, filter: sigma >= DEFOCUS_SHARP ? `blur(${defocusMix(sigma)[0].level}px)` : undefined, ...p.style }}>
      {mat && <div style={{ position: 'absolute', inset: -grow, borderRadius: fin.radius + grow, background: p.mat?.fill ?? C.paper, border: `${mat.line.toFixed(2)}px solid ${p.mat?.color}`, boxShadow: fin.shadow }} />}
      <div style={{ position: 'absolute', inset: 0, borderRadius: fin.radius, overflow: 'hidden', background: C.ink, boxShadow: mat ? 'none' : fin.shadow, clipPath, isolation: 'isolate' }}>
        <div style={{ position: 'absolute', inset: 0, transform: ap.inner !== 1 ? `scale(${ap.inner.toFixed(5)})` : undefined }}>
          <FilmProvider value={inner}>
            <Footage {...p.clip} frame={p.frame} />
          </FilmProvider>
        </div>
        {p.children}
        {fin.rimAlpha > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: fin.radius, boxShadow: `inset 0 0 0 ${fin.rim.toFixed(2)}px rgba(255,255,255,${fin.rimAlpha.toFixed(3)})`, pointerEvents: 'none' }} />}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the look audit
export type ImageryRow = { from: number; to: number; box: [number, number, number, number]; toBox?: [number, number, number, number] };
/**
 * The boxes the pictures hold, as look-audit.py --imagery-track rows (composition frames and px): boxesAt(f) lists
 * [x, y, w, h] per picture; each picture becomes a row every `step` frames from its box to its next one (a picture
 * found at the same index). Write it once (JSON.stringify) to out/imagery.json and pass --imagery-track. Pure.
 */
export const pictureTrack = (from: number, to: number, boxesAt: (f: number) => [number, number, number, number][], step = 6): ImageryRow[] => {
  const rows: ImageryRow[] = [];
  for (let f = from; f < to; f += step) {
    const g = Math.min(to, f + step);
    const a = boxesAt(f);
    const b = boxesAt(g);
    a.forEach((box, i) => rows.push({ from: f, to: g, box: box.map((v) => Math.round(v)) as ImageryRow['box'], ...(b[i] ? { toBox: b[i].map((v) => Math.round(v)) as ImageryRow['box'] } : {}) }));
  }
  return rows;
};
/** The boxes a river's cards hold at frame f (film px), for pictureTrack. Pure. */
export const riverBoxes = (f: number, p: ArcRiverProps, film?: Partial<FilmCtx>): [number, number, number, number][] =>
  arcRiverState(f, p, film).cards.map((c) => [c.x - c.w / 2, c.y - c.h / 2, c.w, c.h]);

/** Pictures declare nothing stepped or cut: their moves are continuous; a river's fast exit smears in the drawing itself. */
export const declares = (_p?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
