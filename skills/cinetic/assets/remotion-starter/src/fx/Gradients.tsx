import React, { useLayoutEffect, useRef } from 'react';
import { C } from '../brand/tokens';
import { clamp, E } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { hash01, lab, normStops, plateAt, srgbOf, type Stop } from './plates';

/**
 * Gradients: colour fields computed in float and dithered per pixel, so a slow ramp never bands.
 *
 *   linear   a multi-stop ramp along `angle`; `spin` turns it (deg/s) and `drift` scrolls the stops (ramp
 *            lengths/s, mirrored so there is never a seam)
 *   radial   the ramp out from `centre` to `radius` (share of the box diagonal); the centre can orbit
 *   mesh     3-6 coloured points that each orbit slowly; colours mix in OKLab by softened inverse distance
 *   satin    tall curved folds like satin or an aurora: sin(k b + warp sin(m a + w2 t) + w t) through the ramp,
 *            and the colour rolls from `stops` into `stopsB` on a slow cosine (`folds.period` s)
 *   swirl    liquid light: from dark, a white-hot area rolls in from the `centre` corner with curling arms of
 *            tint and accent behind it, then calms (30-36 f at 60 fps) into a slow drifting field that reaches
 *            `reach` (0.8) of the diagonal, so the far side stays dark; the hot core is the last thing to fade
 *   stripes  glossy diagonal stripes drifting over a radial two-ink ground that falls to near-black
 *
 * Every field is evaluated on a node grid (`step` px, 6), interpolated per pixel in float, then rounded with
 * a dither offset: `blue` (interleaved gradient noise, the house), `ordered` (Bayer 8x8) or `tpdf` (+-1 level).
 * `levels` 256 is plain 8-bit; 2-8 gives a visible dithered posterise (a print or screen texture). `grain`
 * adds monochrome grain (sigma in 8-bit levels, re-seeded at `grainFps`, 24) before the rounding, so the grain
 * dithers too. fieldPixels() is pure and Node-safe; <GradientField> paints it on a canvas at half size by default
 * (`res` 0.5: the field is soft and its dither survives the 2x upscale; give 1 for a posterised or grained field
 * seen close) and computes a still field (fieldIsStill) once per recipe instead of every frame.
 * Plates for the other material files (radial, conic and grain tiles) are baked here once and moved by
 * transform: platePixels() is pure, bakePlate() caches a data URL per recipe.
 */

export const GRADIENTS = { step: 6, grain: 1.5, grainFps: 24, swirl60: 34, satinPeriod: 9, radius: 0.75, res: 0.5 } as const;

export type DitherKind = 'blue' | 'ordered' | 'tpdf';
export type FieldMode = 'linear' | 'radial' | 'mesh' | 'satin' | 'swirl' | 'stripes';
export type MeshPoint = { x: number; y: number; color: string; orbit?: [number, number]; period?: number; phase?: number };

export type GradientFieldProps = {
  mode?: FieldMode;
  stops?: readonly (Stop | string)[]; // the ramp, dark to light
  stopsB?: readonly (Stop | string)[]; // satin: the ramp the colour rolls into
  angle?: number; // degrees: linear, satin and stripes direction (0 = along x)
  spin?: number; // linear: degrees per second
  drift?: number; // linear: stop scroll in ramp lengths per second
  centre?: [number, number]; // radial centre, swirl pivot, stripes ground centre (shares of the box)
  radius?: number; // radial: share of the box diagonal (0.75)
  orbit?: [number, number]; // radial: centre orbit radii (shares) over `period` s
  period?: number; // radial orbit period, s (12)
  points?: MeshPoint[]; // mesh: positions are shares, orbit radii shares, period s
  folds?: { k?: number; warp?: number; m?: number; speed?: number; period?: number };
  swirl?: { at: number; dur60?: number; turn?: number; arms?: number; reach?: number }; // reach: share of the diagonal the settled light covers (0.8)
  stripes?: { k?: number; gloss?: number; speed?: number };
  dither?: DitherKind;
  levels?: number;
  grain?: number;
  grainFps?: number;
  step?: number;
  seed?: number;
};

// ---------------------------------------------------------------------------------------------------- dither
const BAYER8 = (() => {
  const m = [0];
  for (let n = 1; n < 8; n *= 2) {
    const s = m.length;
    const side = Math.sqrt(s);
    const next = new Array(s * 4);
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++) {
        const v = 4 * m[y * side + x];
        const w = side * 2;
        next[y * w + x] = v;
        next[y * w + x + side] = v + 2;
        next[(y + side) * w + x] = v + 3;
        next[(y + side) * w + x + side] = v + 1;
      }
    m.splice(0, m.length, ...next);
  }
  return m;
})();

/** Bayer 8x8 threshold at pixel (x, y), in (0, 1). Pure. */
export const bayer8 = (x: number, y: number) => (BAYER8[((y & 7) << 3) | (x & 7)] + 0.5) / 64;
/** Interleaved gradient noise (a cheap blue-ish noise) at pixel (x, y), in [0, 1). Pure. */
export const ign = (x: number, y: number, seed = 0) => {
  const v = 52.9829189 * ((0.06711056 * (x + 5.588238 * seed) + 0.00583715 * (y + 5.588238 * seed)) % 1);
  return v - Math.floor(v);
};
/** The rounding offset in levels: ordered and blue are uniform +-0.5, tpdf triangular +-1. Pure. */
export const ditherOffset = (kind: DitherKind, x: number, y: number, seed = 0) =>
  kind === 'ordered' ? bayer8(x, y) - 0.5 : kind === 'blue' ? ign(x, y, seed) - 0.5 : hash01(x, y, seed) + hash01(x + 7919, y + 104729, seed + 1) - 1;
/** A 0..1 value rounded to `levels` steps with offset `n` (in steps), back as 0..255. Pure. */
export const quantise = (v: number, levels: number, n: number) => {
  const L = Math.max(2, levels) - 1;
  return Math.round((clamp(Math.round(v * L + n), 0, L) / L) * 255);
};
/** Monochrome grain at pixel (x, y) for grain frame `g`: triangular, sigma `sigma` levels. Pure. */
export const grainAt = (x: number, y: number, g: number, sigma: number) => (hash01(x, y, 977 + g * 13) + hash01(x + 61, y + 29, 991 + g * 13) - 1) * sigma * 2.449;
/** The grain frame index at film frame f (grain re-seeds at `gfps`, not every frame of a 60 fps film). */
export const grainFrame = (f: number, fps: number, gfps: number = GRADIENTS.grainFps) => Math.floor((f * Math.min(gfps, fps)) / fps + 1e-6);

// ---------------------------------------------------------------------------------------------------- ramps
const lutCache = new Map<string, Float32Array>();
/** A ramp as n gamma-sRGB float triples (OKLab mix between stops), cached per stop list. Pure. */
export const rampLut = (stops: readonly (Stop | string)[], n = 256): Float32Array => {
  const key = `${JSON.stringify(stops)}|${n}`;
  const hit = lutCache.get(key);
  if (hit) return hit;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = plateAt(stops, i / (n - 1));
    out[i * 3] = c[0];
    out[i * 3 + 1] = c[1];
    out[i * 3 + 2] = c[2];
  }
  lutCache.set(key, out);
  return out;
};
const rampInto = (lut: Float32Array, u: number, o: Float32Array, k: number) => {
  const n = lut.length / 3 - 1;
  const p = clamp(u) * n;
  const i = Math.min(n - 1, Math.floor(p));
  const t = p - i;
  for (let c = 0; c < 3; c++) o[k + c] = lut[i * 3 + c] + (lut[(i + 1) * 3 + c] - lut[i * 3 + c]) * t;
};

/** House ramps, dark to light: the night on the brand's neutral ink with the accent, and the accent's cool neighbours. */
export const NIGHT = [C.ink, C.ink2, C.accent, C.accentLift, C.paper] as const;
// cinetic:device-palette the tide ramp: the accent's cool neighbours, a colour field
export const TIDE = ['#06121A', '#0E3B4A', '#11A39A', '#9FE3D6', '#F4FBFA'] as const;

// ---------------------------------------------------------------------------------------------------- fields
/** Swirl progress at frame f: 0 before `at`, 1 when settled. Pure. */
export const swirlProgress = (f: number, s: NonNullable<GradientFieldProps['swirl']>, fps: number) => clamp((f - s.at) / f60x(s.dur60 ?? GRADIENTS.swirl60, fps));

const tri = (v: number) => 1 - Math.abs(((v % 2) + 2) % 2 - 1); // mirrored 0..1..0, no seam

/**
 * Colours of the field's node grid at frame f: (cols x rows) gamma-sRGB float triples for a box W x H with
 * nodes every `step` px (plus one past each edge). Pure.
 */
export const fieldNodes = (W: number, H: number, p: GradientFieldProps, f: number, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const step = Math.max(1, p.step ?? GRADIENTS.step);
  const cols = Math.ceil(W / step) + 1;
  const rows = Math.ceil(H / step) + 1;
  const out = new Float32Array(cols * rows * 3);
  const mode = p.mode ?? 'linear';
  const lut = rampLut(p.stops ?? NIGHT);
  const sec = f / fps;
  const D = Math.hypot(W, H);
  const [cx, cy] = p.centre ?? (mode === 'swirl' ? [0, 1] : mode === 'stripes' ? [0.15, 0.95] : [0.5, 0.5]);
  const a = (((p.angle ?? (mode === 'satin' ? 62 : mode === 'stripes' ? 35 : 0)) + (mode === 'linear' ? (p.spin ?? 0) * sec : 0)) * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  // mesh: points in OKLab, positions at this frame
  const mesh = (p.points ?? []).map((m) => {
    const ph = (2 * Math.PI * sec) / (m.period ?? 10) + (m.phase ?? 0);
    return { x: (m.x + (m.orbit?.[0] ?? 0) * Math.cos(ph)) * W, y: (m.y + (m.orbit?.[1] ?? 0) * Math.sin(ph)) * H, c: lab(m.color) };
  });
  const lutB = mode === 'satin' ? rampLut(p.stopsB ?? p.stops ?? NIGHT) : lut;
  const fo = p.folds ?? {};
  const roll = mode === 'satin' ? 0.5 - 0.5 * Math.cos((2 * Math.PI * sec) / (fo.period ?? GRADIENTS.satinPeriod)) : 0;
  const sw = p.swirl ?? { at: 0 };
  const st = mode === 'swirl' ? swirlProgress(f, sw, fps) : 0;
  const rOrb = p.orbit ?? [0, 0];
  const orbPh = (2 * Math.PI * sec) / (p.period ?? 12);
  const rcx = (cx + rOrb[0] * Math.cos(orbPh)) * W;
  const rcy = (cy + rOrb[1] * Math.sin(orbPh)) * H;
  const tmp = new Float32Array(3);
  const tmpB = new Float32Array(3);
  for (let j = 0; j < rows; j++) {
    const y = Math.min(H, j * step);
    for (let i = 0; i < cols; i++) {
      const x = Math.min(W, i * step);
      const k = (j * cols + i) * 3;
      if (mode === 'linear') {
        const u = ((x - W / 2) * ca + (y - H / 2) * sa) / (Math.abs(W * ca) + Math.abs(H * sa)) + 0.5;
        rampInto(lut, p.drift ? tri(u + (p.drift ?? 0) * sec) : u, out, k);
      } else if (mode === 'radial') {
        rampInto(lut, Math.hypot(x - rcx, y - rcy) / ((p.radius ?? GRADIENTS.radius) * D), out, k);
      } else if (mode === 'mesh') {
        let L = 0;
        let A = 0;
        let B = 0;
        let ws = 0;
        const soft = 0.04 * D * (0.04 * D);
        for (const m of mesh) {
          const w = 1 / ((x - m.x) ** 2 + (y - m.y) ** 2 + soft) ** 1.25;
          L += w * m.c[0];
          A += w * m.c[1];
          B += w * m.c[2];
          ws += w;
        }
        const c = ws > 0 ? srgbOf([L / ws, A / ws, B / ws]) : [0, 0, 0];
        out[k] = c[0];
        out[k + 1] = c[1];
        out[k + 2] = c[2];
      } else if (mode === 'satin') {
        const al = (x * ca + y * sa) / D; // along the folds
        const ac = (-x * sa + y * ca) / D; // across
        const w = 2 * Math.PI;
        const v = Math.sin(w * (fo.k ?? 2.6) * ac + (fo.warp ?? 1.6) * Math.sin(w * (fo.m ?? 0.9) * al + sec * 0.35) + sec * (fo.speed ?? 0.22) * w);
        const v2 = Math.sin(w * 5.3 * ac + 0.7 * Math.sin(w * 1.7 * al - sec * 0.5) - sec * 0.31 * w);
        const u = clamp(0.5 + 0.42 * v + 0.12 * v2);
        const sh = u * u * (3 - 2 * u); // folds turn sharply into dark ribbons
        rampInto(lut, sh, tmp, 0);
        rampInto(lutB, sh, tmpB, 0);
        for (let c = 0; c < 3; c++) out[k + c] = tmp[c] + (tmpB[c] - tmp[c]) * roll;
      } else if (mode === 'swirl') {
        const dx = (x - cx * W) / D;
        const dy = (y - cy * H) / D;
        const r = Math.hypot(dx, dy);
        const th = Math.atan2(dy, dx);
        const e = E.glideOut(st);
        const R = 0.05 + (sw.reach ?? 0.8) * e; // the light front: the far side of the frame stays dark
        const calm = 0.35 + 0.65 * (1 - e); // arms relax but never freeze
        const warpTh = th + (sw.turn ?? 1.4) * (1 - e) * Math.exp(-2.5 * r) + 0.12 * Math.sin(3 * r * 6.283 - sec * 0.6);
        const arms = 1 + 0.55 * calm * Math.sin((sw.arms ?? 3) * warpTh + 11 * r - sec * 1.3) * Math.sin(5 * r - sec * 0.4 + 1.1);
        const body = st <= 0 ? 0 : Math.exp(-((r / Math.max(0.01, R)) ** 2) * 1.6) * arms;
        const hot = st <= 0 ? 0 : Math.exp(-((r / (0.1 + 0.06 * e)) ** 2)) * (1 - 0.35 * e);
        rampInto(lut, clamp(0.78 * body + 0.55 * hot), out, k);
      } else {
        const s = p.stripes ?? {};
        const g = Math.hypot((x - cx * W) / (1.2 * W), (y - cy * H) / (0.9 * H));
        rampInto(lut, clamp(1 - g / 0.8), tmp, 0);
        const band = 0.5 + 0.5 * Math.sin(((x * ca + y * sa) / D) * 2 * Math.PI * (s.k ?? 7) - sec * (s.speed ?? 0.5) * 2 * Math.PI);
        const gl = (s.gloss ?? 0.18) * band ** 6 * (1 - clamp(g / 1.1));
        for (let c = 0; c < 3; c++) out[k + c] = tmp[c] + (1 - tmp[c]) * gl;
      }
    }
  }
  return { cols, rows, step, nodes: out };
};

/**
 * The field as RGBA bytes (W x H, row-major), interpolated from the node grid in float and dithered per pixel.
 * Same frame, same bytes. Pure and Node-safe (pass `out` to reuse a buffer).
 */
export const fieldPixels = (W: number, H: number, p: GradientFieldProps, f: number, film: Partial<FilmCtx>, out?: Uint8ClampedArray) => {
  const fps = fpsOf(film);
  const { cols, step, nodes } = fieldNodes(W, H, p, f, film);
  const px = out && out.length === W * H * 4 ? out : new Uint8ClampedArray(W * H * 4);
  const kind = p.dither ?? 'blue';
  const levels = p.levels ?? 256;
  const sigma = p.grain ?? 0;
  const g = grainFrame(f, fps, p.grainFps);
  const seed = p.seed ?? 0;
  const inv = 1 / step;
  for (let y = 0; y < H; y++) {
    const fy = y * inv;
    const j = Math.floor(fy);
    const ty = fy - j;
    for (let x = 0; x < W; x++) {
      const fx = x * inv;
      const i = Math.floor(fx);
      const tx = fx - i;
      const k00 = (j * cols + i) * 3;
      const k01 = k00 + 3;
      const k10 = k00 + cols * 3;
      const k11 = k10 + 3;
      const n = ditherOffset(kind, x, y, seed);
      const gr = sigma ? grainAt(x, y, g, sigma) / 255 : 0;
      const o = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = nodes[k00 + c] + (nodes[k01 + c] - nodes[k00 + c]) * tx;
        const bot = nodes[k10 + c] + (nodes[k11 + c] - nodes[k10 + c]) * tx;
        px[o + c] = quantise(top + (bot - top) * ty + gr, levels, n);
      }
      px[o + 3] = 255;
    }
  }
  return px;
};

/** Sync: the swirl's start and settle frames (the light peak and the calm field). */
export const gradientFieldFrames = (p: GradientFieldProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  return p.swirl ? { start: p.swirl.at, settled: p.swirl.at + f60x(p.swirl.dur60 ?? GRADIENTS.swirl60, fps) } : {};
};

/** A field that never changes over time: no spin, drift, orbit, moving mesh point, moving stripes or grain. Pure. */
export const fieldIsStill = (p: GradientFieldProps) => {
  if (p.grain) return false;
  const mode = p.mode ?? 'linear';
  if (mode === 'linear') return !p.spin && !p.drift;
  if (mode === 'radial') return !p.orbit || (!p.orbit[0] && !p.orbit[1]);
  if (mode === 'mesh') return (p.points ?? []).every((m) => !m.orbit || (!m.orbit[0] && !m.orbit[1]));
  if (mode === 'stripes') return p.stripes?.speed === 0;
  return false; // satin folds and the swirl always move
};

const stillCache = new Map<string, Uint8ClampedArray>();
/** A still field's bytes, computed once per recipe and size (the last 4 recipes are kept). */
const stillPixels = (key: string, W: number, H: number, p: GradientFieldProps, film: Partial<FilmCtx>) => {
  const hit = stillCache.get(key);
  if (hit) return hit;
  const px = fieldPixels(W, H, p, 0, film);
  if (stillCache.size >= 4) stillCache.delete(stillCache.keys().next().value as string);
  stillCache.set(key, px);
  return px;
};

/**
 * Paints the field into a canvas of the box (w x h, default the film). `res` (0.5) paints smaller and scales up: a
 * full-size field costs several hundred ms a frame on the CPU, half size a quarter to a third of that. A still
 * field is computed once and drawn once while the canvas stays mounted; a moving one is computed every frame.
 */
export const GradientField: React.FC<GradientFieldProps & { frame: number; x?: number; y?: number; w?: number; h?: number; res?: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const ref = useRef<HTMLCanvasElement>(null);
  const { frame, x, y, w: bw, h: bh, res: r, style, ...field } = props;
  const w = bw ?? film.width;
  const h = bh ?? film.height;
  const res = r ?? GRADIENTS.res;
  const W = Math.max(2, Math.round(w * res));
  const H = Math.max(2, Math.round(h * res));
  const p: GradientFieldProps = { ...field, step: (field.step ?? GRADIENTS.step) * res };
  const still = fieldIsStill(p);
  const key = still ? `${W}x${H}|${JSON.stringify(p)}` : '';
  const buf = useRef<Uint8ClampedArray | undefined>(undefined);
  const drawn = useRef('');
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || (still && drawn.current === key)) return;
    const px = still ? stillPixels(key, W, H, p, film) : (buf.current = fieldPixels(W, H, p, frame, film, buf.current));
    const img = ctx.createImageData(W, H);
    img.data.set(px);
    ctx.putImageData(img, 0, 0);
    drawn.current = key;
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', left: x ?? 0, top: y ?? 0, width: w, height: h, ...style }} />;
};

// ---------------------------------------------------------------------------------------------------- plates
export type PlateKind = 'linear' | 'radial' | 'conic';
export type PlateOpts = { cx?: number; cy?: number; rx?: number; ry?: number; angle?: number; seed?: number; vertical?: boolean };

/**
 * A baked plate as RGBA bytes, dithered (tpdf, alpha too): radial (u = elliptical distance from (cx, cy) over
 * (rx, ry), shares), conic (u = turn from `angle` degrees about (cx, cy); give stops that start and end on one
 * colour for a seamless ring) or linear. Pure.
 */
export const platePixels = (kind: PlateKind, stops: readonly (Stop | string)[], W: number, H: number, o: PlateOpts = {}) => {
  const px = new Uint8ClampedArray(W * H * 4);
  const n = 1024;
  const lut = Array.from({ length: n }, (_, i) => plateAt(stops, i / (n - 1)));
  const cx = o.cx ?? 0.5;
  const cy = o.cy ?? 0.5;
  const rx = o.rx ?? 0.5;
  const ry = o.ry ?? 0.5;
  const a0 = ((o.angle ?? 0) * Math.PI) / 180;
  const seed = o.seed ?? 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ux = (x + 0.5) / W;
      const uy = (y + 0.5) / H;
      let u: number;
      if (kind === 'radial') u = Math.hypot((ux - cx) / rx, (uy - cy) / ry);
      else if (kind === 'conic') {
        const t = (Math.atan2((uy - cy) * H, (ux - cx) * W) - a0) / (2 * Math.PI);
        u = t - Math.floor(t);
      } else u = o.vertical ? uy : ux;
      const c = lut[Math.round(clamp(u) * (n - 1))];
      const k = (y * W + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        const v = c[ch] * 255 + hash01(x, y, seed + 2 * ch) + hash01(x + 7919, y + 104729, seed + 2 * ch + 1) - 1;
        px[k + ch] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  return px;
};

/** A grain tile (mid-grey 128 plus monochrome grain of `sigma` levels) as RGBA bytes, for overlay blending. Pure. */
export const grainTilePixels = (size: number, sigma: number, g: number) => {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(255, Math.round(128 + grainAt(x, y, g, sigma))));
      const k = (y * size + x) * 4;
      px[k] = v;
      px[k + 1] = v;
      px[k + 2] = v;
      px[k + 3] = 255;
    }
  return px;
};

const bakeCache = new Map<string, string>();
/** Bytes to a PNG data URL, cached by `key` (browser only; '' in Node). The cache keeps the last 64 recipes. */
export const bakePixels = (key: string, W: number, H: number, make: () => Uint8ClampedArray): string => {
  const hit = bakeCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(W, H);
  img.data.set(make());
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');
  if (bakeCache.size > 64) bakeCache.delete(bakeCache.keys().next().value as string);
  bakeCache.set(key, url);
  return url;
};

/** A baked, dithered plate as a cached data URL (browser): place it with an <img> and move it by transform. */
export const bakePlate = (kind: PlateKind, stops: readonly (Stop | string)[], w: number, h: number, o: PlateOpts = {}) => {
  const W = Math.max(2, Math.round(w));
  const H = Math.max(2, Math.round(h));
  return bakePixels(`${kind}|${JSON.stringify(normStops(stops))}|${W}|${H}|${JSON.stringify(o)}`, W, H, () => platePixels(kind, stops, W, H, o));
};

/** A grain tile as a cached data URL (browser). */
export const bakeGrain = (size: number, sigma: number, g: number) => bakePixels(`grain|${size}|${sigma}|${g}`, size, size, () => grainTilePixels(size, sigma, g));

/**
 * Fields are continuous: nothing flashes, and a posterised field (`levels` < 16) is a texture, not a step. Grain
 * re-seeds at `grainFps` (24): in a faster film each grain holds 2-3 frames, so a grained field gives the frames it
 * is on screen (`span`, [from, to)) and is declared stepped there.
 */
export const declares = (p?: Partial<GradientFieldProps> & { span?: [number, number]; id?: string }, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p?.grain || !p.span || fpsOf(film) <= (p.grainFps ?? GRADIENTS.grainFps)) return none;
  return { ...none, stepped: [{ from: p.span[0], to: p.span[1], id: p.id ?? 'field-grain' }] };
};
