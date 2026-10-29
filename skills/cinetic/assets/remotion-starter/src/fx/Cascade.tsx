import React, { useLayoutEffect, useRef, useState } from 'react';
import { Img, useDelayRender } from 'remotion';
import { clamp, E, fd, mix, rand } from '../lib/anim';
import { mixRgb } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Cascade: a picture is made in front of the viewer, passing through representations of itself.
 *
 *   'dots'         round dots pop into a grid with accelerating density (power-in 2.3 over 38 f at 60 fps,
 *                  up to 58 % of the cells; each dot cut on 1.4x large and settling in 4 f) in seeded colours
 *                  from a small palette (the brand's tints) or a vivid pigment version of the picture's own;
 *                  the dots recolour to the picture's true colours (14 f); then ONE beat each of halftone, pixel
 *                  mosaic and the sharp picture (2.4 f each at 60 fps: one frame at 25). The unlit cells can
 *                  carry the picture faintly (`ghost`)
 *   'progressive'  the picture loads like a progressive render on twos: blank, a soft blob, rough shapes, final
 *                  (46 f), drawn through fixed blur levels (static per stage, never animated)
 *
 * The grid is the picture's own colours: pass `grid` (cols x rows RGB, row-major) or let <Cascade> sample its
 * `src` once (useImageGrid, delayRender). Pure state: cascadeState(f) and cascadeCell(i, f).
 */

export type RGB = [number, number, number];

/** House numbers: frames at 60 fps. */
export const CASCADE = {
  cols: 64,
  rows: 36,
  fill60: 38,
  power: 2.3,
  cover: 0.58,
  pop60: 4,
  popScale: 1.4,
  recolour60: 14,
  stage60: 2.4,
  dot: 0.86, // dot size as a share of the pitch
  ghost: 0, // how much of the picture the unlit cells carry (0.2: the picture is latent in the empty grid)
  vivid: { sat: 1.55, gain: 1.18 },
  progressive60: 46,
  blurs: [64, 24, 8, 0] as number[], // progressive stages (px at 1080p), after a blank one
} as const;

export type CascadeProps = {
  at: number; // first frame of the fill (or of the progressive load)
  mode?: 'dots' | 'progressive';
  cols?: number;
  rows?: number;
  fill?: { frames?: number; power?: number; cover?: number }; // 60 fps frames (house 38), power (2.3), share lit at the end (0.58; 1 lights every cell)
  pop?: { frames?: number; scale?: number }; // a new dot's settle (house 4 f from 1.4x)
  recolour?: number; // 60 fps frames (house 14)
  stages?: ('halftone' | 'mosaic' | 'image')[]; // after the recolour (house all three)
  stage?: number; // 60 fps frames per stage (house 2.4)
  palette?: string[]; // the dots' colours before the recolour, picked per cell from a seed (default: vivid picture colours)
  progressive?: { frames?: number; blurs?: number[] }; // house 46 f on twos through blurs 64, 24, 8, 0
  seed?: string | number;
  id?: string;
};

export type CascadePhase = 'off' | 'fill' | 'recolour' | 'halftone' | 'mosaic' | 'image' | 'blank' | 'load';

export type CascadeState = { phase: CascadePhase; coverage: number; recolour: number; stage: number; blur: number };

const timing = (p: CascadeProps, fps: number) => {
  const fill = Math.max(1, f60x(p.fill?.frames ?? CASCADE.fill60, fps));
  const rec = Math.max(0, f60x(p.recolour ?? CASCADE.recolour60, fps));
  const per = Math.max(1, f60x(p.stage ?? CASCADE.stage60, fps));
  const stages = p.stages ?? ['halftone', 'mosaic', 'image'];
  const s0 = p.at + fill + rec;
  return { fill, rec, per, stages, s0, end: s0 + per * Math.max(0, stages.length - 1) };
};

/** The phase, the lit share, the recolour progress, the stage index (progressive: the blur level) at frame f. Pure. */
export const cascadeState = (frame: number, p: CascadeProps, film?: Partial<FilmCtx>): CascadeState => {
  const fps = fpsOf(film);
  const F = fd(frame);
  if (F < p.at) return { phase: 'off', coverage: 0, recolour: 0, stage: -1, blur: 0 };
  if ((p.mode ?? 'dots') === 'progressive') {
    const blurs = p.progressive?.blurs ?? CASCADE.blurs;
    const total = Math.max(2, f60x(p.progressive?.frames ?? CASCADE.progressive60, fps));
    const n = blurs.length + 1; // a blank stage first
    const g = p.at + Math.floor((F - p.at) / 2) * 2; // on twos
    const k = Math.min(n - 1, Math.floor(((g - p.at) / total) * n + 1e-9));
    return { phase: k === 0 ? 'blank' : k === n - 1 ? 'image' : 'load', coverage: 1, recolour: 1, stage: k, blur: k === 0 ? 0 : blurs[k - 1] };
  }
  const t = timing(p, fps);
  const cover = p.fill?.cover ?? CASCADE.cover;
  const power = p.fill?.power ?? CASCADE.power;
  if (frame < p.at + t.fill) return { phase: 'fill', coverage: cover * clamp((frame - p.at) / t.fill) ** power, recolour: 0, stage: -1, blur: 0 };
  if (F < Math.round(t.s0)) return { phase: 'recolour', coverage: cover, recolour: t.rec > 0 ? E.stdInOut(clamp((frame - p.at - t.fill) / t.rec)) : 1, stage: -1, blur: 0 };
  const k = Math.min(t.stages.length - 1, Math.floor((F - Math.round(t.s0)) / t.per + 1e-9));
  return { phase: t.stages[k], coverage: 1, recolour: 1, stage: k, blur: 0 };
};

/** One cell in the dots phase: lit, its pop scale and its seeded threshold. Pure. */
export const cascadeCell = (i: number, frame: number, p: CascadeProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const r = rand(`${p.seed ?? 'cascade'}:${i}`);
  const cover = p.fill?.cover ?? CASCADE.cover;
  const power = p.fill?.power ?? CASCADE.power;
  const fill = Math.max(1, f60x(p.fill?.frames ?? CASCADE.fill60, fps));
  if (r >= cover) return { on: false, scale: 1, r };
  const onset = Math.round(p.at + fill * (r / cover) ** (1 / power));
  if (fd(frame) < onset) return { on: false, scale: 1, r };
  const pf = Math.max(1, f60x(p.pop?.frames ?? CASCADE.pop60, fps));
  const scale = 1 + ((p.pop?.scale ?? CASCADE.popScale) - 1) * Math.max(0, 1 - (frame - onset) / pf);
  return { on: true, scale, r };
};

/** Sync: the fill (a riser under it), the recolour, each stage (one tick each), the picture (the pop). */
export const cascadeFrames = (p: CascadeProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  if ((p.mode ?? 'dots') === 'progressive') {
    const total = f60x(p.progressive?.frames ?? CASCADE.progressive60, fps);
    const n = (p.progressive?.blurs ?? CASCADE.blurs).length + 1;
    const stages = Array.from({ length: n }, (_, k) => p.at + Math.ceil(((k * total) / n) / 2 - 1e-9) * 2);
    return { fill: p.at, recolour: p.at, stages, image: stages[n - 1], end: stages[n - 1] };
  }
  const t = timing(p, fps);
  const stages = t.stages.map((_, k) => Math.round(t.s0) + Math.ceil(k * t.per - 1e-9));
  return { fill: p.at, recolour: Math.round(p.at + t.fill), stages, image: stages[stages.length - 1], end: stages[stages.length - 1] };
};

// ---- colour helpers ---------------------------------------------------------------------------------------------
const lum = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const rgb = (c: number[]) => `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`;
/** The pigment version of a colour: more chroma and a little more light (the dots are paint, the picture is graded). */
export const vivid = (c: RGB, sat: number = CASCADE.vivid.sat, gain: number = CASCADE.vivid.gain): RGB => {
  const l = lum(c) * 255;
  return c.map((x) => (l + (x - l) * sat) * gain) as RGB;
};

/**
 * The picture's colours on a cols x rows grid, sampled once in the browser from `src` with an object-fit
 * cover crop to `aspect` (w / h of the box it will fill). Holds the render (delayRender) until it has them.
 */
export const useImageGrid = (src: string | undefined, cols: number, rows: number, aspect: number): RGB[] | null => {
  const { delayRender, continueRender } = useDelayRender();
  const [grid, setGrid] = useState<RGB[] | null>(null);
  const [handle] = useState(() => (src ? delayRender(`Cascade grid ${src}`) : null));
  useLayoutEffect(() => {
    if (!src || handle === null) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = cols;
      cv.height = rows;
      const ctx = cv.getContext('2d');
      if (ctx) {
        const ia = img.naturalWidth / img.naturalHeight;
        const [sw, sh] = ia > aspect ? [img.naturalHeight * aspect, img.naturalHeight] : [img.naturalWidth, img.naturalWidth / aspect];
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
        const d = ctx.getImageData(0, 0, cols, rows).data;
        setGrid(Array.from({ length: cols * rows }, (_, i) => [d[4 * i], d[4 * i + 1], d[4 * i + 2]] as RGB));
      }
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = src;
  }, [src, cols, rows, aspect, handle, continueRender]);
  return grid;
};

/**
 * Draws the cascade in a box (x, y, w, h). Dots, recolour, halftone and mosaic are painted on one canvas
 * from the grid; the picture stage (and the progressive stages) draw `src` with object-fit cover.
 * `unlit` is the empty cell's colour (the ground); `ghost` how much of the picture the unlit cells carry.
 * A loader that starts the cascade (QuadLoader) can sit on the grid's centre cells, at the same pitch.
 */
export const Cascade: React.FC<CascadeProps & { frame: number; src: string; x: number; y: number; w: number; h: number; grid?: RGB[]; unlit: string; ghost?: number; shape?: 'square' | 'circle'; blank?: string }> = (props) => {
  const film = useFilm();
  const cols = props.cols ?? CASCADE.cols;
  const rows = props.rows ?? CASCADE.rows;
  const sampled = useImageGrid(props.grid ? undefined : props.src, cols, rows, props.w / props.h);
  const grid = props.grid ?? sampled;
  const s = cascadeState(props.frame, props, film);
  const ref = useRef<HTMLCanvasElement>(null);
  const painted = s.phase === 'fill' || s.phase === 'recolour' || s.phase === 'halftone' || s.phase === 'mosaic';
  useLayoutEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || !grid || !painted) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const pw = props.w / cols;
    const ph = props.h / rows;
    const g = props.ghost ?? CASCADE.ghost;
    const unlit = props.unlit;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const col = grid[i];
        const cx = (c + 0.5) * pw;
        const cy = (r + 0.5) * ph;
        if (s.phase === 'mosaic') {
          ctx.fillStyle = rgb(col);
          ctx.fillRect(c * pw, r * ph, pw + 0.5, ph + 0.5);
          continue;
        }
        if (s.phase === 'halftone') {
          const rad = (Math.min(pw, ph) / 2) * (0.35 + 0.85 * Math.sqrt(lum(col)));
          ctx.fillStyle = rgb(vivid(col, 1.35, 1.1));
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const cell = cascadeCell(i, props.frame, props, film);
        const d = Math.min(pw, ph) * CASCADE.dot * (cell.on ? cell.scale : 1);
        if (cell.on) {
          const pal = props.palette;
          if (pal?.length) {
            const pc = pal[Math.floor(cell.r * 9973) % pal.length];
            ctx.fillStyle = s.recolour > 0 ? mixRgb(pc, rgb(col), s.recolour) : pc;
          } else {
            const v = vivid(col);
            ctx.fillStyle = rgb(v.map((x, k) => mix(x, col[k], s.recolour)));
          }
        } else {
          ctx.fillStyle = g > 0 ? mixRgb(unlit, rgb(col), g) : unlit;
        }
        if ((props.shape ?? 'circle') === 'circle') {
          ctx.beginPath();
          ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(cx - d / 2, cy - d / 2, d, d);
      }
  });
  if (s.phase === 'off') return null;
  const box: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: props.w, height: props.h, transform: `translate(${props.x}px, ${props.y}px)`, overflow: 'hidden' };
  if (s.phase === 'image' || s.phase === 'load')
    return (
      <div style={box}>
        <Img data-imagery="" src={props.src} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: s.blur > 0 ? `blur(${s.blur * (film.height / 1080)}px)` : undefined, transform: s.blur > 0 ? 'scale(1.08)' : undefined }} />
      </div>
    );
  if (s.phase === 'blank') return <div style={{ ...box, background: props.blank ?? props.unlit }} />;
  return (
    <div style={box}>
      <canvas ref={ref} width={Math.round(props.w)} height={Math.round(props.h)} style={{ width: props.w, height: props.h, display: 'block' }} />
    </div>
  );
};

/** The stage run is stepped (each representation is a cut); the progressive load runs on twos. */
export const declares = (p?: Partial<CascadeProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = cascadeFrames(p as CascadeProps, film);
  const id = p.id ?? 'cascade';
  if ((p.mode ?? 'dots') === 'progressive') return { stepped: [{ from: p.at, to: fr.end + 1, on: 2, id }], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: [{ from: fr.stages[0], to: fr.end + 1, id }], flashes: [], cameraBlur: [], seams: [] };
};
