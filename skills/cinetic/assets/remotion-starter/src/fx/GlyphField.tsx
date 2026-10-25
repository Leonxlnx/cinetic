import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { FONT } from '../brand/tokens';
import { clamp, E } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { type RGB, useImageGrid } from './Cascade';
import { irregularOnsets } from './deviceUtil';
import { hash01 } from './plates';

/**
 * GlyphField: a picture's texture made of characters and dots, the family round AsciiField.
 *
 *   edge      a band of tiny monospace glyphs hugs every subject's silhouette like a typed outline: the
 *             heaviest glyph on the strongest edge, lighter ones further out (the band sits mostly outside the
 *             subject), a few dots bleeding inside; on strong straight edges the glyph follows the edge angle
 *             (| on verticals, - on horizontals, / and \ on diagonals). It re-samples on an irregular beat
 *             (every 2-4 f at 60 fps) so it shimmers, and before a cut it flares (12 f): wider, heavier, brighter
 *   halftone  the picture as a dot screen: radius = r_max x sqrt(1 - luma) on an 8 px pitch (dark dots on a
 *             light ground; `invert` for light dots on dark), optional phosphor triads (red, green and blue dots)
 *             where the picture has edges; re-sampled every 2-7 f if asked
 *   mask      a patch of light glyphs on a value ramp (. - = + x) licks up through a shape and dies: band 45 %
 *             of the box tall, about 6 px a frame upward, denser in the middle; a burst lives 32 f and repeats
 *             52 f later (`count` bursts), clipped to `path`
 *
 * Luma and edges are computed once per source picture (sampled once, Cascade's useImageGrid), so every frame is
 * pure: glyphFieldState(f), edgeGlyph(), maskGlyph(), halftoneRadius(). Glyph changes are stepped: declared.
 */

export const GLYPH_FIELD = {
  edge: { cols: 120, rows: 60, ramp: ' .:-=+*#%@', every: [2, 4] as [number, number], flare60: 12, threshold: 0.2 },
  halftone: { pitch: 8, rmax: 4.6, every: [2, 7] as [number, number] },
  mask: { cell: 12, ramp: ' .-=+x', band: 0.45, speed: 6, life60: 32, every60: 52, count: 2, boxH: 432 },
} as const;

export type GlyphFieldProps = {
  mode: 'edge' | 'halftone' | 'mask';
  at: number;
  cols?: number;
  rows?: number;
  ramp?: string; // light to heavy
  resample?: [number, number] | false; // 60 fps frames between re-samples
  flare?: { at: number; dur?: number }; // edge: the flare before a cut
  threshold?: number; // edge: share of the strongest edge below which a cell stays empty (0.2)
  invert?: boolean; // halftone: light dots for light areas (on a dark ground)
  triads?: boolean; // halftone: phosphor triads on edges
  band?: { height?: number; speed?: number; life?: number; every?: number; count?: number; boxH?: number }; // mask (boxH: the shape's height, px at 1080p)
  seed?: string | number;
  id?: string;
};

export type GlyphFieldState = { on: boolean; variant: number; flare: number; bandY: number; burst: number };

/** Luma (0..1) per cell from an RGB grid. Pure. */
export const lumaOf = (grid: readonly RGB[]) => grid.map((p) => (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255);

const blur3 = (v: readonly number[], cols: number, rows: number) =>
  v.map((_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    let s = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const cc = c + dx;
        const rr = r + dy;
        if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
        s += v[rr * cols + cc];
        n++;
      }
    return s / n;
  });

/**
 * Sobel edges on a blurred luma grid: magnitude normalised to the 95th percentile (0..1+), the edge angle
 * (radians, of the gradient), and a halo (the magnitude spread outward twice) that carries the band. Pure.
 */
export const edgeField = (luma: readonly number[], cols: number, rows: number) => {
  const L = blur3(luma, cols, rows);
  const at = (c: number, r: number) => L[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))];
  const gx: number[] = [];
  const gy: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      gx.push(at(c + 1, r - 1) + 2 * at(c + 1, r) + at(c + 1, r + 1) - at(c - 1, r - 1) - 2 * at(c - 1, r) - at(c - 1, r + 1));
      gy.push(at(c - 1, r + 1) + 2 * at(c, r + 1) + at(c + 1, r + 1) - at(c - 1, r - 1) - 2 * at(c, r - 1) - at(c + 1, r - 1));
    }
  const raw = gx.map((x, i) => Math.hypot(x, gy[i]));
  const sorted = [...raw].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))] || 1;
  const mag = raw.map((m) => m / p95);
  const halo = blur3(blur3(mag, cols, rows), cols, rows);
  return { mag, halo, ang: gx.map((x, i) => Math.atan2(gy[i], x)), luma: L };
};

/** Re-sample variant, flare (0..1), mask band centre (share of the box from the top) and burst alpha at frame f. Pure. */
export const glyphFieldState = (frame: number, p: GlyphFieldProps, film?: Partial<FilmCtx>): GlyphFieldState => {
  const fps = fpsOf(film);
  const t = frame - p.at;
  if (t < 0) return { on: false, variant: 0, flare: 0, bandY: 2, burst: 0 };
  const every = p.resample === false ? null : (p.resample ?? (p.mode === 'halftone' ? null : p.mode === 'edge' ? GLYPH_FIELD.edge.every : [3, 3]));
  const variant = every ? irregularOnsets(p.at, 400, every, p.seed ?? 'glyph', fps).filter((o) => o <= frame).length : 0;
  let flare = 0;
  if (p.flare) {
    const d = Math.max(1, f60x(p.flare.dur ?? GLYPH_FIELD.edge.flare60, fps));
    flare = E.buildIn(clamp((frame - p.flare.at) / d));
  }
  if (p.mode !== 'mask') return { on: true, variant, flare, bandY: 2, burst: 1 };
  const b = p.band ?? {};
  const life = f60x(b.life ?? GLYPH_FIELD.mask.life60, fps);
  const per = f60x(b.every ?? GLYPH_FIELD.mask.every60, fps);
  const i = Math.floor(t / per);
  const tb = t - i * per;
  if (i >= (b.count ?? GLYPH_FIELD.mask.count) || tb > life) return { on: false, variant, flare, bandY: 2, burst: 0 };
  const travel = ((b.speed ?? GLYPH_FIELD.mask.speed) * tb * 60) / fps; // px at 1080p (speed per 60 fps frame)
  const h = b.height ?? GLYPH_FIELD.mask.band;
  return { on: true, variant, flare, bandY: 1 + h / 4 - travel / (b.boxH ?? GLYPH_FIELD.mask.boxH), burst: Math.sin(Math.PI * clamp(tb / life)) };
};

/** The glyph of edge cell i (index c + r cols) for a state. Pure. */
export const edgeGlyph = (i: number, c: number, r: number, f: ReturnType<typeof edgeField>, s: GlyphFieldState, p: GlyphFieldProps): string => {
  const ramp = p.ramp ?? GLYPH_FIELD.edge.ramp;
  const thr = (p.threshold ?? GLYPH_FIELD.edge.threshold) * (1 - 0.45 * s.flare);
  const jit = (hash01(c, r, 31 * s.variant + 7) - 0.5) * 0.16;
  const v = Math.max(f.mag[i], 0.8 * f.halo[i]) * (1 + 0.5 * s.flare) + jit;
  if (v < thr) return f.halo[i] > thr * 0.5 && hash01(c, r, s.variant + 99) < 0.12 ? '.' : ' ';
  if (f.mag[i] > 0.75 && s.flare < 0.5) {
    const a = ((f.ang[i] * 180) / Math.PI + 360) % 180; // gradient direction; the edge runs across it
    if (a < 22.5 || a >= 157.5) return '|';
    if (a < 67.5) return '\\';
    if (a < 112.5) return '-';
    return '/';
  }
  const k = clamp((v - thr) / (1 - thr));
  return ramp[Math.min(ramp.length - 1, 1 + Math.floor(k * (ramp.length - 1) + s.flare * 2))];
};

/** Halftone dot radius for a luma (0..1): r_max x sqrt(1 - luma), or sqrt(luma) inverted. Pure. */
export const halftoneRadius = (luma: number, rmax: number, invert = false) => rmax * Math.sqrt(clamp(invert ? luma : 1 - luma));

/** The glyph of mask cell (c, r) of a cols x rows box for a state. Pure. */
export const maskGlyph = (c: number, r: number, rows: number, s: GlyphFieldState, p: GlyphFieldProps): string => {
  if (!s.on) return ' ';
  const ramp = p.ramp ?? GLYPH_FIELD.mask.ramp;
  const h = p.band?.height ?? GLYPH_FIELD.mask.band;
  const y = (r + 0.5) / rows;
  const d = Math.abs(y - s.bandY) / (h / 2);
  const band = d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d);
  const v = band * (0.5 + 0.5 * hash01(c, r, 17 + s.variant)) * s.burst;
  if (v < 0.1) return ' ';
  return ramp[Math.min(ramp.length - 1, 1 + Math.floor(v * (ramp.length - 1)))];
};

/** Sync: the start, each re-sample (soft ticks), the flare. */
export const glyphFieldFrames = (p: GlyphFieldProps, film?: Partial<FilmCtx>, until = p.at + 240) => {
  const fps = fpsOf(film);
  const every = p.resample === false ? null : (p.resample ?? (p.mode === 'edge' ? GLYPH_FIELD.edge.every : null));
  const resamples = every ? irregularOnsets(p.at, 400, every, p.seed ?? 'glyph', fps).filter((o) => o <= until) : [];
  return { start: p.at, resamples, flare: p.flare ? { at: p.flare.at, end: Math.ceil(p.flare.at + f60x(p.flare.dur ?? GLYPH_FIELD.edge.flare60, fps)) } : undefined };
};

type DrawProps = GlyphFieldProps & { frame: number; x: number; y: number; w: number; h: number; color: string; src?: string; grid?: RGB[]; path?: string; weight?: number; opacity?: number };

/** Draws the field in a box (x, y, w, h): text rows for edge and mask, a canvas for the halftone. */
export const GlyphField: React.FC<DrawProps> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const s = glyphFieldState(props.frame, props, film);
  const isHT = props.mode === 'halftone';
  const cols = props.cols ?? (isHT ? Math.max(1, Math.round(props.w / (GLYPH_FIELD.halftone.pitch * u))) : props.mode === 'mask' ? Math.max(1, Math.round(props.w / (GLYPH_FIELD.mask.cell * u))) : GLYPH_FIELD.edge.cols);
  const cw0 = props.w / cols;
  const erows = props.rows ?? Math.max(1, Math.round(props.h / (isHT ? cw0 : cw0 / 0.6))); // glyph cells are 0.6 em wide, a line 1 em tall
  const sampled = useImageGrid(props.mode === 'mask' || props.grid ? undefined : props.src, cols, erows, props.w / props.h);
  const grid = props.grid ?? sampled;
  const field = useMemo(() => (grid && props.mode !== 'mask' ? edgeField(lumaOf(grid), cols, erows) : null), [grid, cols, erows, props.mode]);
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!isHT) return;
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!field || !s.on) return;
    const cw = props.w / cols;
    const ch = props.h / erows;
    const rmax = GLYPH_FIELD.halftone.rmax * u;
    for (let r = 0; r < erows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const jl = s.variant ? (hash01(c, r, s.variant) - 0.5) * 0.06 : 0;
        const rad = halftoneRadius(field.luma[i] + jl, rmax, props.invert);
        if (rad < 0.3) continue;
        const cx = (c + 0.5) * cw;
        const cy = (r + 0.5) * ch;
        if (props.triads && field.mag[i] > 0.5) {
          const o = rad * 0.55;
          // cinetic:device-palette the RGB triad of a screen's phosphor dots
          (['#FF2A2A', '#30C85A', '#2A6BFF'] as const).forEach((col, k) => {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(cx + o * Math.cos((k * 2 * Math.PI) / 3), cy + o * Math.sin((k * 2 * Math.PI) / 3), rad * 0.6, 0, Math.PI * 2);
            ctx.fill();
          });
          continue;
        }
        ctx.fillStyle = props.color;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
  });
  if (!s.on) return null;
  const box: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: props.w, height: props.h, transform: `translate(${props.x}px, ${props.y}px)`, overflow: 'hidden' };
  if (isHT) return <canvas ref={ref} width={Math.round(props.w)} height={Math.round(props.h)} style={{ ...box, opacity: props.opacity ?? 1 }} />;
  const R = erows;
  const cw = props.w / cols;
  const lh = props.h / R;
  const lines = Array.from({ length: R }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (props.mode === 'edge' ? (field ? edgeGlyph(r * cols + c, c, r, field, s, props) : ' ') : maskGlyph(c, r, R, s, props))).join(''),
  );
  return (
    <div
      style={{ ...box, clipPath: props.path ? `path('${props.path}')` : undefined, fontFamily: FONT.mono, fontSize: cw / 0.6, fontWeight: props.weight ?? (s.flare > 0.5 ? 600 : 400), lineHeight: `${lh}px`, color: props.color, whiteSpace: 'pre', letterSpacing: 0, opacity: (props.opacity ?? 0.85) + (1 - (props.opacity ?? 0.85)) * s.flare }}
      aria-hidden
    >
      {lines.map((ln, r) => (
        <div key={r} style={{ height: lh }}>
          {ln}
        </div>
      ))}
    </div>
  );
};

/** Glyphs change on frames (re-samples, bursts): the field's life is a stepped run. */
export const declares = (p?: Partial<GlyphFieldProps> & { until?: number }, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || p.at === undefined || !p.mode) return none;
  const fps = fpsOf(film);
  let to = p.until ?? p.at + f60x(240, fps);
  if (p.mode === 'mask') {
    const b = p.band ?? {};
    to = p.at + f60x((b.every ?? GLYPH_FIELD.mask.every60) * ((b.count ?? GLYPH_FIELD.mask.count) - 1) + (b.life ?? GLYPH_FIELD.mask.life60), fps);
  }
  if (p.mode === 'halftone' && !p.resample) return none;
  return { ...none, stepped: [{ from: p.at, to: Math.ceil(to) + 1, id: p.id ?? `glyph-${p.mode}` }] };
};
