// Shared by the type pieces: absolute centring, a damped spring, word spans of a measured line, seeded typing
// times, and a word rasterised into a grid of cells (dot-matrix, tile and pixel letters) with a seeded hash.
import React from 'react';
import { continueRender, delayRender } from 'remotion';
import { ease, at as prog } from '../../motion';
import type { TextLayout } from '../../type';

export const absCentre = (x: number, y: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' });

/** A damped spring from 0 to 1 starting at frame 0 (pure, cheap): `zeta` damping ratio, `w` angular speed per frame. */
export const spr = (t: number, zeta = 0.42, w = 0.42) => {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
};

/** Width of the first `n` words of a measured line (from the first word's left edge to the n-th word's right edge). */
const spanOf = (L: TextLayout, n: number) => {
  if (n <= 0 || !L.words.length) return 0;
  const a = L.words[0];
  const b = L.words[Math.min(n, L.words.length) - 1];
  return b.x + b.width - a.x;
};

/** The left edge of a line that grows word by word and re-centres: each arrival adds its own short ease-out move. */
export const growLeft = (L: TextLayout, cx: number, times: number[], f: number, recentre: number) => {
  let w = spanOf(L, 1) / 2;
  for (let i = 1; i < times.length; i++) {
    const p = recentre <= 0 ? (f >= times[i] ? 1 : 0) : prog(f, times[i], recentre, ease.out);
    w += ((spanOf(L, i + 1) - spanOf(L, i)) / 2) * p;
  }
  return cx - w;
};

type RasterCell = { x: number; y: number; col: number; row: number; cover: number; edge: boolean };

type RasterCell2 = RasterCell & { char: number };

type Raster = { ready: boolean; w: number; h: number; cols: number; rows: number; cells: RasterCell2[]; cell: number; charX: number[]; charW: number[] };

const cache = new Map<string, Raster>();

/** Deterministic 0..1 from two numbers (a cell's index and a seed). */
export const hash = (a: number, b = 0) => {
  const r = Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453;
  return r - Math.floor(r);
};

/**
 * Rasterise `text` set in `font` (a CSS font family) at `size` px into cells of `cell` px: every cell whose coverage is
 * over `threshold` is kept, with its centre (px from the text box's top-left) and whether it sits on the letter's edge.
 * The render waits until the face has loaded and the cells are known.
 */
export const useRaster = (text: string, o: { font: string; size: number; weight?: number | string; cell: number; threshold?: number; tracking?: number }): Raster => {
  const { font, size, weight = 600, cell, threshold = 0.42, tracking = 0 } = o;
  const key = JSON.stringify([text, font, size, weight, cell, threshold, tracking]);
  const [r, setR] = React.useState<Raster>(() => cache.get(key) ?? { ready: false, w: 0, h: 0, cols: 0, rows: 0, cells: [], cell, charX: [], charW: [] });
  const [handle] = React.useState(() => (cache.has(key) ? null : delayRender(`raster ${text}`)));
  React.useLayoutEffect(() => {
    if (cache.has(key)) {
      setR(cache.get(key)!);
      if (handle !== null) continueRender(handle);
      return;
    }
    let alive = true;
    const spec = `${weight} ${size}px ${font}`;
    const load = (() => {
      try {
        return document.fonts.load(spec, text);
      } catch {
        return Promise.resolve([]);
      }
    })();
    load
      .catch(() => null)
      .then(() => document.fonts.ready)
      .then(() => {
        if (!alive) return;
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.font = spec;
        // letter spacing in em, applied by hand so it works in every browser build
        const chars = Array.from(text);
        const adv = chars.map((ch) => ctx.measureText(ch).width);
        const track = tracking * size;
        const width = Math.ceil(adv.reduce((a, b) => a + b, 0) + track * Math.max(0, chars.length - 1) + size * 0.1);
        const height = Math.ceil(size * 1.25);
        const cols = Math.ceil(width / cell);
        const rows = Math.ceil(height / cell);
        c.width = cols * cell;
        c.height = rows * cell;
        ctx.font = spec;
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'alphabetic';
        let x = size * 0.05;
        const base = size * 0.98;
        const starts: number[] = [];
        chars.forEach((ch, i) => {
          starts.push(x);
          ctx.fillText(ch, x, base);
          x += adv[i] + track;
        });
        const charOf = (px: number) => {
          let k = 0;
          for (let i = 0; i < starts.length; i++) if (px >= starts[i] - track / 2) k = i;
          return k;
        };
        const img = ctx.getImageData(0, 0, c.width, c.height).data;
        const cov = new Float32Array(cols * rows);
        const step = Math.max(1, Math.floor(cell / 5));
        for (let ry = 0; ry < rows; ry++)
          for (let cx = 0; cx < cols; cx++) {
            let s = 0;
            let n = 0;
            for (let yy = ry * cell + step / 2; yy < (ry + 1) * cell; yy += step)
              for (let xx = cx * cell + step / 2; xx < (cx + 1) * cell; xx += step) {
                s += img[(Math.floor(yy) * c.width + Math.floor(xx)) * 4 + 3];
                n++;
              }
            cov[ry * cols + cx] = s / n / 255;
          }
        const cells: RasterCell2[] = [];
        const on = (cx: number, ry: number) => cx >= 0 && ry >= 0 && cx < cols && ry < rows && cov[ry * cols + cx] > threshold;
        for (let ry = 0; ry < rows; ry++)
          for (let cx = 0; cx < cols; cx++)
            if (on(cx, ry))
              cells.push({
                x: (cx + 0.5) * cell,
                y: (ry + 0.5) * cell,
                col: cx,
                row: ry,
                cover: cov[ry * cols + cx],
                edge: !(on(cx - 1, ry) && on(cx + 1, ry) && on(cx, ry - 1) && on(cx, ry + 1)),
                char: charOf((cx + 0.5) * cell),
              });
        // trim empty rows and columns so the box hugs the ink
        const minC = Math.min(...cells.map((q) => q.col));
        const maxC = Math.max(...cells.map((q) => q.col));
        const minR = Math.min(...cells.map((q) => q.row));
        const maxR = Math.max(...cells.map((q) => q.row));
        const out: Raster = {
          ready: true,
          cell,
          cols: maxC - minC + 1,
          rows: maxR - minR + 1,
          w: (maxC - minC + 1) * cell,
          h: (maxR - minR + 1) * cell,
          cells: cells.map((q) => ({ ...q, col: q.col - minC, row: q.row - minR, x: q.x - minC * cell, y: q.y - minR * cell })),
          charX: starts.map((s0) => s0 - minC * cell),
          charW: adv,
        };
        cache.set(key, out);
        setR(out);
        if (handle !== null) continueRender(handle);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return r;
};

/** A canvas drawn every frame by `draw` (sync, in a layout effect, so the frame is captured drawn). */
export const FrameCanvas: React.FC<{ w: number; h: number; draw: (ctx: CanvasRenderingContext2D) => void; style?: React.CSSProperties; deps: unknown[] }> = ({ w, h, draw, style, deps }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    draw(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} width={Math.max(1, Math.ceil(w))} height={Math.max(1, Math.ceil(h))} style={{ display: 'block', width: w, height: h, ...style }} />;
};

/** Seeded, uneven typing times: char i shows from the returned frame (gaps of 1-4 frames, longer after a space). */
export const typeTimes = (text: string, start: number, per: number, seed: number) => {
  const out: number[] = [];
  let t = start;
  Array.from(text).forEach((ch, i) => {
    out.push(Math.round(t));
    const jitter = 0.45 + hash(i, seed) * 1.3;
    t += per * jitter * (ch === ' ' ? 1.8 : 1);
  });
  return out;
};
