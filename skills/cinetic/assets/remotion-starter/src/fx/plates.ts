// Dithered plates for the material devices (TypeFill, BorderBleed, GradientMap): a gradient is computed in
// float OKLab per column, then every pixel is rounded with triangular (TPDF) noise of +-1 level from an integer
// hash of its position, so a slow ramp never shows bands and its mean stays exact. The maths is pure and
// Node-safe; ditherPlate() needs a browser (a canvas) and caches its data URLs per recipe.

export type Stop = { at: number; color: string; alpha?: number };

const hex = (c: string): [number, number, number] => {
  const m = c.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const v = m[1].split(',').map((s) => parseFloat(s));
    return [v[0] / 255, v[1] / 255, v[2] / 255];
  }
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** A colour (hex or rgb()) in OKLab, floats. */
export const lab = (c: string): [number, number, number] => {
  const [r, g, b] = hex(c).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363412718 * g + 0.0514151317 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995272 * g + 0.1073969746 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};

/** OKLab to gamma sRGB floats 0..1 (clipped), unrounded: the dither rounds. */
export const srgbOf = ([L, A, B]: [number, number, number]): [number, number, number] => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((v) => Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, v)))))) as [number, number, number];
};

/** Stops sorted by position; a bare colour list spreads evenly over 0..1. */
export const normStops = (stops: readonly (Stop | string)[]): Stop[] => {
  const n = stops.length;
  return stops.map((s, i) => (typeof s === 'string' ? { at: n > 1 ? i / (n - 1) : 0, color: s } : s)).sort((a, b) => a.at - b.at);
};

/** The plate's colour at u in 0..1 (OKLab mix between neighbouring stops) as gamma sRGB floats plus alpha. Pure. */
export const plateAt = (stops: readonly (Stop | string)[], u: number): [number, number, number, number] => {
  const s = normStops(stops);
  if (!s.length) return [0, 0, 0, 0];
  if (u <= s[0].at) return [...srgbOf(lab(s[0].color)), s[0].alpha ?? 1];
  const last = s[s.length - 1];
  if (u >= last.at) return [...srgbOf(lab(last.color)), last.alpha ?? 1];
  let i = 0;
  while (i < s.length - 2 && u > s[i + 1].at) i++;
  const a = s[i];
  const b = s[i + 1];
  const t = b.at > a.at ? (u - a.at) / (b.at - a.at) : 0;
  const A = lab(a.color);
  const B = lab(b.color);
  const c = srgbOf([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  return [...c, (a.alpha ?? 1) + ((b.alpha ?? 1) - (a.alpha ?? 1)) * t];
};

/** Integer hash of a pixel to [0, 1). */
export const hash01 = (x: number, y: number, seed = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** One channel value (0..1 float) rounded to 0..255 with triangular noise of +-1 level at pixel (x, y). Pure. */
export const ditherLevel = (v: number, x: number, y: number, seed = 0) => {
  const n = hash01(x, y, seed) + hash01(x + 7919, y + 104729, seed + 1) - 1;
  return Math.max(0, Math.min(255, Math.round(v * 255 + n)));
};

const cache = new Map<string, string>();

/**
 * A w x h plate (horizontal gradient along x, or along y when `vertical`) as a PNG data URL, dithered per
 * pixel. Browser only; cached per recipe, so a plate is built once per render tab, then moved by transform.
 */
export const ditherPlate = (stops: readonly (Stop | string)[], w: number, h: number, o: { vertical?: boolean; seed?: number } = {}): string => {
  const W = Math.max(2, Math.round(w));
  const H = Math.max(2, Math.round(h));
  const key = `${JSON.stringify(stops)}|${W}|${H}|${o.vertical ? 1 : 0}|${o.seed ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(W, H);
  const n = o.vertical ? H : W;
  const lut = Array.from({ length: n }, (_, i) => plateAt(stops, n > 1 ? i / (n - 1) : 0));
  const seed = o.seed ?? 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = lut[o.vertical ? y : x];
      const k = 4 * (y * W + x);
      img.data[k] = ditherLevel(c[0], x, y, seed);
      img.data[k + 1] = ditherLevel(c[1], x, y, seed + 2);
      img.data[k + 2] = ditherLevel(c[2], x, y, seed + 4);
      img.data[k + 3] = ditherLevel(c[3], x, y, seed + 6);
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');
  cache.set(key, url);
  return url;
};

// cinetic:device-palette spectral runs for a spectral plate (a rainbow accent is the film's one dominant accent)
/** A ban-safe spectral run round the accent's side of the wheel (lime, green, teal, cyan, blue), no orange or violet. */
export const COOL_SPECTRUM = ['#B9D45F', '#5CC977', '#08965A', '#11A39A', '#2DB4D6', '#3D7BE0'] as const;
/** The full spectrum, for a brand that asks for it (a rainbow accent is one film's one dominant accent). */
export const FULL_SPECTRUM = ['#FFD23F', '#FF8A3D', '#F0407A', '#B04BE0', '#4B6BFF', '#2EC4E6', '#3DDC84', '#C9E46A'] as const;
