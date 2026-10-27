import React from 'react';
import { clamp, E, type Ease, expIn, rand } from '../lib/anim';
import { oklch as lchColor, toOklch } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import { C } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * Pixel devices: a scene pixelating out into a cut and the next one resolving in (on the beat), and a
 * mosaic iris (a ring of square cells opening from a point, the next scene clear inside the ring).
 *
 * Pixelate: the block size grows geometrically into the cut (house x1.57 a frame at 60 fps, 6 -> 160 px
 * at 1080p over 8 frames, a little faster at the end) and shrinks after it (x0.72 a frame from about
 * 190 px). Every frame is one whole block size: the run is stepped (one sample, no shutter blur) and the
 * cut is a `stepped` seam; declares() says so. The cut belongs on the bed's downbeat.
 * Drawn with static SVG filters, one per block size the run uses (centre sample, optional pre-average,
 * dilate to the block), built once from the props; each frame only picks which filter applies, so no
 * filter attribute is animated. Works on any DOM scene or image.
 *
 * Mosaic iris: cells (house 30 px at 1080p) are drawn only inside the annulus [r - ring, r] (house ring
 * 195 px), ragged at both edges, their colours picked from the accent's own family and re-picked on twos;
 * inside the ring the incoming scene shows through a circle, tinted and soft for its first 4 frames.
 */

// ------------------------------------------------------------------------------------------ pixelate

export type PixelPhase = { frames?: number; from?: number; to?: number; ratio?: number; accel?: number; ease?: Ease };
export type PixelateProps = {
  cut: number; // first frame of the incoming scene
  out?: false | PixelPhase; // house { frames: 8 f@60, from: 6, to: 160, accel: 0.55 } (block px at 1080p, log space)
  in?: false | PixelPhase; // house { frames: 11 f@60, from: 190, ratio: 0.72 } (geometric, a frame at 60 fps)
  min?: number; // blocks under this many px render clean (house 2)
  average?: boolean; // pre-average each block (a soft photo mosaic) instead of sampling its centre (house true)
  soften?: number; // edge softness after the dilate, share of the block (house 0)
  id?: string;
};

export const PIXEL = { out: { frames60: 8, from: 6, to: 160, accel: 0.55 }, in: { frames60: 11, from: 190, ratio60: 0.72 }, min: 2 } as const;

export type PixelateState = { side: 'out' | 'in'; block: number; index: number; active: boolean };

const outPhase = (p: PixelateProps, fps: number) => {
  const o = p.out === false ? null : p.out ?? {};
  if (!o) return null;
  const n = Math.max(1, Math.round(o.frames ?? f60x(PIXEL.out.frames60, fps)));
  return { n, from: o.from ?? PIXEL.out.from, to: o.to ?? PIXEL.out.to, ratio: o.ratio, accel: o.accel ?? PIXEL.out.accel, ease: o.ease };
};
const inPhase = (p: PixelateProps, fps: number) => {
  const o = p.in === false ? null : p.in ?? {};
  if (!o) return null;
  const n = Math.max(1, Math.round(o.frames ?? f60x(PIXEL.in.frames60, fps)));
  const ratio = o.ratio ?? PIXEL.in.ratio60 ** (60 / fps); // per film frame
  return { n, from: o.from ?? PIXEL.in.from, to: o.to, ratio, ease: o.ease };
};

/**
 * The block size at frame f, px in the film's own size (1080p numbers scale with the frame height).
 * Out: log-space from `from` to `to` over the last `frames` frames before the cut, on expIn(accel) (or a
 * constant `ratio`). In: from `from` on the cut, x`ratio` a frame (or log-space to `to` on `ease`).
 * Whole film frames decide; the value is the exact block (the drawn one is rounded to whole px).
 */
export const pixelateState = (frame: number, p: PixelateProps, film?: Partial<FilmCtx>): PixelateState => {
  const fps = fpsOf(film);
  const s = (film?.height ?? 1080) / 1080;
  const min = (p.min ?? PIXEL.min) * s;
  const f = Math.round(frame);
  const o = outPhase(p, fps);
  if (f < p.cut) {
    if (!o || f < p.cut - o.n) return { side: 'out', block: 0, index: -1, active: false };
    const j = f - (p.cut - o.n);
    const t = o.n > 1 ? j / (o.n - 1) : 1;
    const lt = o.ratio ? (Math.log(o.ratio) * j) / Math.log(o.to / o.from) : (o.ease ?? expIn(o.accel))(t);
    const b = o.from * (o.to / o.from) ** lt * s;
    return { side: 'out', block: b >= min ? b : 0, index: j, active: b >= min };
  }
  const i = inPhase(p, fps);
  if (!i) return { side: 'in', block: 0, index: -1, active: false };
  const j = f - p.cut;
  if (j >= i.n) return { side: 'in', block: 0, index: j, active: false };
  const b = (i.to !== undefined ? i.from * (i.to / i.from) ** (i.ease ?? E.linear)(i.n > 1 ? j / (i.n - 1) : 1) : i.from * i.ratio ** j) * s;
  return { side: 'in', block: b >= min ? b : 0, index: j, active: b >= min };
};

/** The drawn (odd, whole px) block size for a state: a dilate grows one centre pixel by r each side. */
export const drawnBlock = (b: number) => (b <= 0 ? 0 : 2 * Math.max(1, Math.round((b - 1) / 2)) + 1);

/** Every drawn block size the run uses (from the props: the static filter ladder). */
export const pixelLadder = (p: PixelateProps, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  const o = outPhase(p, fps);
  const i = inPhase(p, fps);
  const out = new Set<number>();
  const a = p.cut - (o?.n ?? 0);
  const b = p.cut + (i?.n ?? 0);
  for (let f = a; f < b; f++) {
    const st = pixelateState(f, p, film);
    if (st.active) out.add(drawnBlock(st.block));
  }
  return [...out].sort((x, y) => x - y);
};

/** The frames of a pixelate run: first pixel frame, the cut, the first clean frame after it. */
export const pixelateFrames = (p: PixelateProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  return { from: p.cut - (outPhase(p, fps)?.n ?? 0), cut: p.cut, clean: p.cut + (inPhase(p, fps)?.n ?? 0) };
};

/** Static SVG filters for a ladder of block sizes (ids `${id}-${size}`). Mount once per scene. */
export const PixelFilters: React.FC<{ id: string; sizes: number[]; average?: boolean; soften?: number }> = ({ id, sizes, average = true, soften = 0 }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
    <defs>
      {sizes.map((cellPx) => {
        const half = (cellPx - 1) / 2;
        return (
          <filter key={cellPx} id={`${id}-${cellPx}`} x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            {average && <feGaussianBlur in="SourceGraphic" stdDeviation={cellPx * 0.35} result="avg" />}
            <feFlood x={half} y={half} width={1} height={1} floodColor="#FFFFFF" result="dot" />
            <feComposite in="dot" width={cellPx} height={cellPx} result="cell" />
            <feTile in="cell" result="grid" />
            <feComposite in={average ? 'avg' : 'SourceGraphic'} in2="grid" operator="in" result="samples" />
            <feMorphology in="samples" operator="dilate" radius={half} result="blocks" />
            {soften > 0 && <feGaussianBlur in="blocks" stdDeviation={cellPx * soften} />}
          </filter>
        );
      })}
    </defs>
  </svg>
);

/**
 * A pixelate cut: `outgoing` until the cut, `incoming` from it, each pixelated by its frame's block.
 * `frame` is the local frame. The filters are built once from the props.
 */
export const Pixelate: React.FC<PixelateProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const id = props.id ?? 'pixelate';
  const sizes = pixelLadder(props, film);
  const s = pixelateState(props.frame, props, film);
  const b = drawnBlock(s.block);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      <PixelFilters id={id} sizes={sizes} average={props.average ?? true} soften={props.soften ?? 0} />
      <div style={{ position: 'absolute', inset: 0, filter: s.active ? `url(#${id}-${b})` : undefined }}>{s.side === 'out' ? props.outgoing : props.incoming}</div>
    </div>
  );
};

// --------------------------------------------------------------------------------------- mosaic iris

export type MosaicIrisProps = {
  at: number; // first frame of the iris
  origin: [number, number]; // px
  frames?: number; // to the far corner (house 9 f@30)
  radii?: number[]; // an outer radius per frame from `at` (explicit), px
  ease?: Ease; // front-loaded expansion (house E.snapOut)
  ring?: number; // ring thickness px at 1080p (house 195)
  cell?: number; // cell edge px at 1080p (house 30)
  colors?: string[]; // the cells' family (house: four lightness steps of the accent)
  seed?: string | number;
  reveal?: { frames?: number; tint?: string; sigma?: number }; // inside: tint and softness clearing (house 4 f, the accent, 6 px)
  density?: number; // share of annulus cells drawn (house 0.86; edges thin out)
  id?: string;
};

export type MosaicCell = { x: number; y: number; s: number; fill: string };
export type MosaicIrisState = { r: number; inner: number; cells: MosaicCell[]; tint: number; sigma: number; done: boolean; active: boolean };

/** The accent's own cell family: four OKLCH lightness steps at the accent hue (one hue). */
export const mosaicFamily = (accent: string = C.accent) => {
  const [L, Cc, h] = toOklch(accent);
  return [lchColor(clamp(L - 0.16, 0.08), Cc * 0.9, h), lchColor(clamp(L - 0.06, 0.1), Cc, h), accent, lchColor(clamp(L + 0.12), Cc * 0.8, h)];
};

const farCornerOf = (o: [number, number], W: number, H: number) => Math.max(Math.hypot(o[0], o[1]), Math.hypot(W - o[0], o[1]), Math.hypot(o[0], H - o[1]), Math.hypot(W - o[0], H - o[1]));

/** The outer radius at frame f (0 before `at`). */
export const mosaicRadius = (frame: number, p: MosaicIrisProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const W = film?.width ?? 1920;
  const H = film?.height ?? 1080;
  const s = H / 1080;
  const j = Math.round(frame) - p.at;
  if (j < 0) return 0;
  if (p.radii?.length) return p.radii[Math.min(j, p.radii.length - 1)];
  const n = p.frames ?? f60x(18, fps);
  const end = farCornerOf(p.origin, W, H) + (p.ring ?? 195) * s;
  return end * (p.ease ?? E.snapOut)(clamp(j / n));
};

/** The mosaic iris at frame f: radius, ring, the cells drawn this frame (inside the frame only), the reveal. */
export const mosaicIrisState = (frame: number, p: MosaicIrisProps, film?: Partial<FilmCtx>): MosaicIrisState => {
  const fps = fpsOf(film);
  const W = film?.width ?? 1920;
  const H = film?.height ?? 1080;
  const s = H / 1080;
  const f = Math.round(frame);
  const r = mosaicRadius(f, p, film);
  const ring = (p.ring ?? 195) * s;
  const cell = (p.cell ?? 30) * s;
  const inner = Math.max(0, r - ring);
  const fam = p.colors ?? mosaicFamily();
  const seed = p.seed ?? 'mosaic';
  const dens = p.density ?? 0.86;
  const cells: MosaicCell[] = [];
  // done once the inner edge reaches the far corner: the radius tops out at exactly farCorner + ring, so the
  // test allows half a pixel (a strict > never held, and the outgoing scene was drawn to the end of the act)
  const done = r - ring >= farCornerOf(p.origin, W, H) - 0.5;
  if (r > 0 && !done) {
    const [ox, oy] = p.origin;
    // cell indices are relative to the origin: the ring's reach (+-r) clipped to the frame
    const i0 = Math.max(Math.floor(-r / cell) - 1, Math.floor(-ox / cell) - 1);
    const i1 = Math.min(Math.ceil(r / cell), Math.ceil((W - ox) / cell) + 1);
    const j0 = Math.max(Math.floor(-r / cell) - 1, Math.floor(-oy / cell) - 1);
    const j1 = Math.min(Math.ceil(r / cell), Math.ceil((H - oy) / cell) + 1);
    const tw = Math.floor((f - p.at) / 2); // colours re-picked on twos
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const cx = ox + (i + 0.5) * cell;
        const cy = oy + (j + 0.5) * cell;
        if (cx < -cell || cy < -cell || cx > W + cell || cy > H + cell) continue;
        const d = Math.hypot(cx - ox, cy - oy);
        if (d > r || d < inner) continue;
        const edge = Math.min((r - d) / Math.max(1, ring * 0.25), (d - inner) / Math.max(1, ring * 0.25), 1); // ragged at both edges
        if (rand(`${seed}:${i}:${j}`) > dens * edge + (1 - edge) * 0.25) continue;
        const k = Math.floor(rand(`${seed}:${i}:${j}:${tw}`) * fam.length) % fam.length;
        cells.push({ x: ox + i * cell, y: oy + j * cell, s: cell, fill: fam[k] });
      }
  }
  const rf = p.reveal?.frames ?? f60x(8, fps);
  const t = clamp((f - p.at - 1) / Math.max(1, rf));
  return { r, inner, cells, tint: 1 - t, sigma: (p.reveal?.sigma ?? 6) * s * (1 - t), done, active: f >= p.at && !done };
};

/**
 * A mosaic iris: `outgoing` outside the ring, `incoming` inside (a circle of the inner radius), the
 * cells in between. The incoming tint is a flat accent layer fading out; its softness is two fixed blur
 * copies cross-faded (lib/defocus rule: no animated radius).
 */
export const MosaicIris: React.FC<MosaicIrisProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode }> = (props) => {
  const film = useFilm();
  const { width: W, height: H } = film;
  const s = mosaicIrisState(props.frame, props, film);
  const [ox, oy] = props.origin;
  const id = props.id ?? 'mosaic';
  const tint = props.reveal?.tint ?? C.accent;
  const soft = (props.reveal?.sigma ?? 6) * (H / 1080);
  const sharpW = clamp(1 - s.sigma / Math.max(0.01, soft));
  if (props.frame < props.at) return <div style={{ position: 'absolute', inset: 0 }}>{props.outgoing}</div>;
  if (s.done) return <div style={{ position: 'absolute', inset: 0 }}>{props.incoming}</div>;
  const clip = `circle(${s.inner.toFixed(2)}px at ${ox}px ${oy}px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {props.outgoing}
      {s.inner > 0 && (
        <div style={{ position: 'absolute', inset: 0, clipPath: clip }}>
          <div style={{ position: 'absolute', inset: 0, filter: `blur(${soft.toFixed(2)}px)` }}>{props.incoming}</div>
          <div style={{ position: 'absolute', inset: 0, opacity: sharpW }}>{props.incoming}</div>
          {s.tint > 0.001 && <div style={{ position: 'absolute', inset: 0, background: tint, opacity: 0.55 * s.tint }} />}
        </div>
      )}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden data-id={id}>
        {s.cells.map((c, i) => (
          <rect key={i} x={c.x.toFixed(2)} y={c.y.toFixed(2)} width={c.s + 0.5} height={c.s + 0.5} fill={c.fill} />
        ))}
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------------------------- declarations

/** Pixelate: the run is stepped and the cut a `stepped` seam. Mosaic iris: a `mask` seam on its first frame. */
export const declares = (p?: Partial<PixelateProps> & { mosaic?: Partial<MosaicIrisProps> }, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (p?.cut !== undefined) {
    const t = pixelateFrames(p as PixelateProps, film);
    const id = p.id ?? 'pixelate';
    out.stepped!.push({ from: t.from, to: Math.max(t.from + 1, t.clean), id });
    out.seams!.push({ at: t.cut, kind: 'stepped', id });
  }
  if (p?.mosaic?.at !== undefined) out.seams!.push({ at: p.mosaic.at, kind: 'mask', id: p.mosaic.id ?? 'mosaic' });
  return out;
};
