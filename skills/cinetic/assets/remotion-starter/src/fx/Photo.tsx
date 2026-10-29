import React, { useId } from 'react';
import { Img } from 'remotion';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, lmix } from '../lib/anim';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * A photograph as the set: framed on its focus point, moved by a slow push or drift, split into depth
 * slices that part as the camera moves (a flat photo read as a space), and graded so stills from
 * different sources sit in one look. Pure state (photoCover, photoState) and a thin component.
 *
 * Framing: the photo covers the frame with its focus point (fx, fy, 0..1 of the image) on the frame's
 * anchor (0..1 of the frame); the cover scale already holds the drift and roll the move will use, so no
 * edge ever shows and nothing is clamped while it moves (a clamp mid-move would stall the speed).
 * `shift` adds a translation computed elsewhere (a carry or launch from lib/handoff for a velocity cut), with
 * `room` kept in the cover for it. It moves every slice alike (a carried camera move, not parallax: amplified on
 * a near slice it would show the far copy behind it), and the root clips at the frame grown by `room`, so a
 * wrapper that translates the whole Photo by up to `room` shows picture at the frame's edge, not the box's.
 * Move: scale about the anchor in log space (lmix: a push has constant perceived speed), drift in frame
 * px. House: a push of 4-8 % over a shot (E.linear on a hold, softOut after a cut), drift 20-40 px/s at
 * 1080p.
 * Depth slices: hand-drawn polygons in image px (the rocks in front, the wave, the sky), each with a
 * depth 0 (the far plane, the photo itself) to 1 (nearest). A slice at depth d takes the move amplified:
 * push^(1 + d g) and drift x (1 + d g), g = `parallax` (house 0.6). Keep the nearest slice's extra travel
 * under ~3 % of the frame: the far copy shows behind its edge, and a small gap reads as depth, a big one as
 * a cut-out. A slice edge should follow a real edge in the photo (a horizon, a rock against spray).
 * Grade: static CSS filters (saturate, contrast, brightness), a one-hue wash (a plate of `tint` in the
 * `color` blend at `tintMix`), or a duotone (an SVG colour matrix, static): nothing animates a filter.
 * Bake the heavy grade into the files with scripts/assets.mjs grade; this one keeps a set consistent.
 */
/** drawn: a stand-in made in code (the starter's plate), marked data-drawn so the layout audit fails it until a real photo replaces it. */
export type PhotoSrc = { src: string; w: number; h: number; focus?: [number, number]; drawn?: 'place' | 'person' | 'product' };
export type PhotoMove = {
  from?: number; // the move's first frame (default the shot's start)
  to?: number; // its last frame (default from + 3 s)
  push?: number; // scale at the end of the move (x, default 1: none); 1.06 = a 6 % push; under 1 a pull-back (it pivots so it ends covering the frame)
  drift?: [number, number]; // frame px travelled over the move (x, y), at the film's size
  roll?: number; // degrees at the end (keep within 2)
  ease?: Ease; // default E.linear (a hold that lives); E.softOut after a cut
};
export type PhotoGrade = {
  saturate?: number;
  contrast?: number;
  brightness?: number;
  tint?: string; // a one-hue wash: the plate colour
  tintMix?: number; // its opacity in the `tintMode` blend (0..1)
  tintMode?: 'color' | 'multiply' | 'soft-light' | 'screen' | 'overlay';
  duotone?: [string, string]; // shadow, highlight: luma mapped between them (replaces saturate)
};
export type DepthSlice = { points: [number, number][]; depth: number; id?: string };
export type PhotoProps = {
  photo: PhotoSrc;
  frame: number;
  move?: PhotoMove;
  anchor?: [number, number]; // where the focus point sits in the frame (0..1), default the centre
  scale?: number; // extra scale on the cover fit (>= 1)
  shift?: [number, number]; // a translation this frame (frame px), on top of the move, the same for every slice: drive it from lib/handoff (carry, launch) for carried cuts
  room?: [number, number]; // the margin the cover keeps for `shift` (frame px each side), so a carried move never shows an edge; the root clips there, not at the frame
  slices?: DepthSlice[];
  parallax?: number; // depth gain g (house 0.6)
  grade?: PhotoGrade;
  style?: React.CSSProperties;
  id?: string;
};

export const PHOTO_HOUSE = { push: 1.06, driftPxS: 30, parallax: 0.6, moveS: 3 } as const;

export type Cover = { k: number; x: number; y: number }; // image px -> frame px: frame = image * k + (x, y)

/** The cover fit of a photo: scale and offset with the focus on the anchor, room left for the move. Pure. */
export const photoCover = (photo: PhotoSrc, film?: Partial<FilmCtx>, o: { anchor?: [number, number]; scale?: number; move?: PhotoMove } = {}): Cover => {
  const { width: W, height: H } = sizeOf(film);
  const [fx, fy] = photo.focus ?? [0.5, 0.5];
  const [ax, ay] = o.anchor ?? [0.5, 0.5];
  const dx = Math.abs(o.move?.drift?.[0] ?? 0);
  const dy = Math.abs(o.move?.drift?.[1] ?? 0);
  const a = (Math.abs(o.move?.roll ?? 0) * Math.PI) / 180;
  const rollRoom = Math.cos(a) + (Math.max(W, H) / Math.min(W, H)) * Math.sin(a);
  const k = Math.max((W + 2 * dx) / photo.w, (H + 2 * dy) / photo.h) * Math.max(1, o.scale ?? 1) * rollRoom;
  // focus on the anchor, then clamped so the (drift-free) image covers the frame with the drift's margin
  const x = clamp(ax * W - fx * photo.w * k, W - photo.w * k + dx, -dx);
  const y = clamp(ay * H - fy * photo.h * k, H - photo.h * k + dy, -dy);
  return { k, x, y };
};

export type PhotoLayer = { depth: number; k: number; x: number; y: number; roll: number };
export type PhotoState = { t: number; push: number; drift: [number, number]; roll: number; cover: Cover; layers: PhotoLayer[] };

/**
 * The photo at frame f: move progress t, the push and drift now, and one transform per depth (the base
 * photo at depth 0 first, then each slice). Each layer maps image px to frame px about the anchor:
 * frame = anchor + (image * cover.k + cover.(x, y) - anchor) * push_d + drift_d. Pure, closed form.
 */
export const photoState = (f: number, p: Omit<PhotoProps, 'frame'>, film?: Partial<FilmCtx>): PhotoState => {
  const { width: W, height: H } = sizeOf(film);
  const fps = fpsOf(film);
  const m = p.move ?? {};
  const from = m.from ?? 0;
  const to = m.to ?? from + PHOTO_HOUSE.moveS * fps;
  const t = (m.ease ?? E.linear)(clamp((f - from) / Math.max(1e-6, to - from)));
  const push = lmix(1, Math.max(1e-4, m.push ?? 1), t);
  const drift: [number, number] = [(m.drift?.[0] ?? 0) * t, (m.drift?.[1] ?? 0) * t];
  const roll = (m.roll ?? 0) * t;
  const room = p.room ?? [0, 0];
  const g = p.parallax ?? PHOTO_HOUSE.parallax;
  // a pull-back (push < 1) needs the cover scaled up front, for the nearest slice too
  const pull = Math.min(1, m.push ?? 1) ** (1 + (p.slices?.length ? g : 0));
  const cover = photoCover(p.photo, film, { anchor: p.anchor, scale: (p.scale ?? 1) / pull, move: { ...m, drift: [Math.abs(m.drift?.[0] ?? 0) + Math.abs(room[0]), Math.abs(m.drift?.[1] ?? 0) + Math.abs(room[1])] } });
  const sh = p.shift ?? [0, 0];
  const [ax, ay] = p.anchor ?? [0.5, 0.5];
  const A = [ax * W, ay * H];
  const depths = [0, ...(p.slices ?? []).map((s) => clamp(s.depth))];
  const pushEnd = Math.max(1e-4, m.push ?? 1);
  const layers = depths.map((d) => {
    const pd = push ** (1 + d * g);
    const dd = 1 + d * g;
    // A push in keeps the cover about any anchor; a pull-back about the anchor can end with an edge in the frame
    // when the focus is off centre. Then the pull pivots on the point that ends it covering the frame (with the
    // drift and room margins): one pure scale for the whole move, so the motion stays smooth.
    const pe = pushEnd ** (1 + d * g);
    const pivot = (a: number, c: number, size: number, frame: number, margin: number) => {
      if (pe >= 1) return a;
      const lo = frame - size * cover.k * pe + margin;
      const hi = -margin;
      const end = a + (c - a) * pe;
      const fit = lo > hi ? (lo + hi) / 2 : clamp(end, lo, hi);
      return fit === end ? a : (fit - c * pe) / (1 - pe);
    };
    const px = pivot(A[0], cover.x, p.photo.w, W, Math.abs(m.drift?.[0] ?? 0) * dd + Math.abs(room[0]));
    const py = pivot(A[1], cover.y, p.photo.h, H, Math.abs(m.drift?.[1] ?? 0) * dd + Math.abs(room[1]));
    // the drift parts the slices (x dd); the carried shift moves them all alike
    return { depth: d, k: cover.k * pd, x: px + (cover.x - px) * pd + drift[0] * dd + sh[0], y: py + (cover.y - py) * pd + drift[1] * dd + sh[1], roll: roll * dd };
  });
  return { t, push, drift, roll, cover, layers };
};

/** Where an image point lands in the frame on a layer (to pin type or a line to a place in the photo). */
export const photoPoint = (L: PhotoLayer, pt: [number, number], film?: Partial<FilmCtx>, anchor: [number, number] = [0.5, 0.5]) => {
  const { width: W, height: H } = sizeOf(film);
  const x = L.x + pt[0] * L.k;
  const y = L.y + pt[1] * L.k;
  if (!L.roll) return { x, y };
  const a = (L.roll * Math.PI) / 180;
  const cx = anchor[0] * W;
  const cy = anchor[1] * H;
  return { x: cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), y: cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a) };
};

/** The static CSS filter of a grade (no tint, no duotone: those are their own layers). */
export const gradeFilter = (g?: PhotoGrade, duotoneId?: string): string | undefined => {
  if (!g) return undefined;
  const parts: string[] = [];
  if (g.duotone && duotoneId) parts.push(`url(#${duotoneId})`);
  else if (g.saturate !== undefined) parts.push(`saturate(${g.saturate})`);
  if (g.contrast !== undefined) parts.push(`contrast(${g.contrast})`);
  if (g.brightness !== undefined) parts.push(`brightness(${g.brightness})`);
  return parts.length ? parts.join(' ') : undefined;
};

const rgb01 = (c: string): [number, number, number] => {
  const h = c.replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
};

/** The SVG filter of a duotone (luma to the shadow-highlight ramp), defined once and referenced by id. */
export const DuotoneDefs: React.FC<{ id: string; duotone: [string, string] }> = ({ id, duotone }) => {
  const [s, h] = [rgb01(duotone[0]), rgb01(duotone[1])];
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${s[0]} ${h[0]}`} />
            <feFuncG type="table" tableValues={`${s[1]} ${h[1]}`} />
            <feFuncB type="table" tableValues={`${s[2]} ${h[2]}`} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
};

/** A full-frame wash for a grade's tint (above the picture, in its blend mode). */
export const TintPlate: React.FC<{ grade?: PhotoGrade }> = ({ grade }) =>
  grade?.tint && (grade.tintMix ?? 0) > 0 ? (
    <div style={{ position: 'absolute', inset: 0, background: grade.tint, opacity: clamp(grade.tintMix ?? 0), mixBlendMode: grade.tintMode ?? 'color', pointerEvents: 'none' }} />
  ) : null;

const polygon = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;

/** One layer of the photo: the image at natural size, clipped to a slice (image px), placed by its transform (roll pivots on the anchor). */
const Layer: React.FC<{ photo: PhotoSrc; L: PhotoLayer; clip?: [number, number][]; anchor: [number, number]; W: number; H: number }> = ({ photo, L, clip, anchor, W, H }) => {
  const A = [anchor[0] * W, anchor[1] * H];
  const place = `translate(${L.x.toFixed(3)}px, ${L.y.toFixed(3)}px) scale(${L.k.toFixed(5)})`;
  const roll = L.roll ? `translate(${A[0]}px, ${A[1]}px) rotate(${L.roll.toFixed(4)}deg) translate(${-A[0]}px, ${-A[1]}px) ` : '';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: photo.w, height: photo.h, transformOrigin: '0 0', transform: roll + place, clipPath: clip ? polygon(clip) : undefined }}>
      <Img data-imagery="" src={photo.src} style={{ width: photo.w, height: photo.h, display: 'block', objectFit: 'cover', objectPosition: `${((photo.focus?.[0] ?? 0.5) * 100).toFixed(1)}% ${((photo.focus?.[1] ?? 0.5) * 100).toFixed(1)}%` }} />
    </div>
  );
};

export const Photo: React.FC<PhotoProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const uid = useId().replace(/:/g, '');
  const duoId = `duo-${p.id ?? uid}`;
  const s = photoState(p.frame, p, film);
  const anchor = p.anchor ?? [0.5, 0.5];
  const [rx, ry] = (p.room ?? [0, 0]).map((v) => Math.abs(v));
  // clipped at the frame grown by the room: a wrapper carrying the whole Photo within the room shows no edge
  const clip: React.CSSProperties = rx || ry ? { overflow: 'visible', clipPath: `inset(${-ry}px ${-rx}px)` } : { overflow: 'hidden' };
  return (
    <div data-drawn={p.photo.drawn} style={{ position: 'absolute', inset: 0, ...clip, background: C.ink, ...p.style }}>
      {p.grade?.duotone && <DuotoneDefs id={duoId} duotone={p.grade.duotone} />}
      <div style={{ position: 'absolute', inset: 0, filter: gradeFilter(p.grade, duoId) }}>
        {s.layers.map((L, i) => (
          <Layer key={i} photo={p.photo} L={L} clip={i === 0 ? undefined : p.slices?.[i - 1]?.points} anchor={anchor} W={W} H={H} />
        ))}
      </div>
      <TintPlate grade={p.grade} />
    </div>
  );
};

/** What a Photo does on purpose: nothing stepped, nothing cut; its move is continuous. */
export const declares = (_p?: Partial<PhotoProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
