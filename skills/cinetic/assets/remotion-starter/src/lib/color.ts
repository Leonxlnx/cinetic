// Colour mixing in OKLab. interpolateColors() mixes in gamma sRGB and rounds each step to whole
// code values, so slow ramps stair-step and hue mixes go muddy through grey; this mixes
// perceptually and rounds once, at the end.
import { fpsOf } from './film';

type Lab = [number, number, number];

// Accepts '#rgb', '#rrggbb' and the 'rgb(r, g, b)' strings mixColor returns, so mixes can nest.
const hexToRgb = (hex: string): Lab => {
  const m = hex.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [m[1], m[2], m[3]].map((v) => Number(v) / 255) as Lab;
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255) as Lab;
};
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const toLab = (hex: string): Lab => {
  const [r, g, b] = hexToRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};

const fromLab = ([L, A, B]: Lab) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((c) => Math.round(Math.min(1, Math.max(0, gam(c))) * 255));
};

/** Perceptual mix of two colours (hex or 'rgb(...)'), t in 0..1 -> 'rgb(r, g, b)'. Nesting is safe. */
export const mixColor = (a: string, b: string, t: number) => {
  const A = toLab(a);
  const B = toLab(b);
  const k = Math.min(1, Math.max(0, t));
  const [r, g, bl] = fromLab([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
  return `rgb(${r}, ${g}, ${bl})`;
};

/** A mix in gamma sRGB, rounded once at the end (the space a plain CSS transition mixes in). t in 0..1 -> 'rgb(r, g, b)'. */
export const mixRgb = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const k = Math.min(1, Math.max(0, t));
  const [r, g, bl] = A.map((v, i) => Math.round(Math.min(1, Math.max(0, v + (B[i] - v) * k)) * 255));
  return `rgb(${r}, ${g}, ${bl})`;
};

/** OKLCH of a colour: L 0..1, C (chroma), h in degrees 0..360. */
export const toOklch = (c: string): [number, number, number] => {
  const [L, A, B] = toLab(c);
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), h < 0 ? h + 360 : h];
};

/** A colour from OKLCH (L 0..1, C, h degrees) -> 'rgb(r, g, b)', clipped into sRGB. Recipes (lib/look.ts RECIPE) are written this way. */
export const oklch = (L: number, C: number, h: number) => {
  const r = (h * Math.PI) / 180;
  const [R, G, B] = fromLab([L, C * Math.cos(r), C * Math.sin(r)]);
  return `rgb(${R}, ${G}, ${B})`;
};

/**
 * The transient accent's progress at frame f: 0 (accent) until `hold` 60 fps frames after it landed
 * on `land`, then linear to 1 (ink) over `cool` 60 fps frames. House 18 + 13 (calm), 7 + 13 (crisp).
 */
export const accentT = (f: number, land: number, o: { hold?: number; cool?: number; fps?: number } = {}) => {
  const fps = o.fps ?? fpsOf();
  const hold = ((o.hold ?? 18) * fps) / 60;
  const cool = Math.max(1e-6, ((o.cool ?? 13) * fps) / 60);
  return Math.min(1, Math.max(0, (f - land - hold) / cool));
};

/**
 * A transient accent: the colour at frame f of something that landed on `land` in `accent` and
 * cools to `ink` (accentT's timing), linear in `space`: 'oklab' (house: the hue holds while the chroma
 * falls) or 'srgb' (the 1.1 mix, whose in-betweens drift in hue on the way to ink).
 */
export const accentFade = (f: number, land: number, o: { accent: string; ink: string; hold?: number; cool?: number; space?: 'srgb' | 'oklab'; fps?: number }) => {
  const t = accentT(f, land, o);
  return (o.space ?? 'oklab') === 'srgb' ? mixRgb(o.accent, o.ink, t) : mixColor(o.accent, o.ink, t);
};

/**
 * A colour along a path of stops at t in 0..1 (evenly spaced, or at `at` positions), each leg mixed in
 * OKLab. Keep a path inside one hue (an accent to its ink, light to dark) unless the brand supplies
 * more: a path across hues is the generated look.
 */
export const pathColor = (stops: string[], t: number, at?: number[]) => {
  if (!stops.length) throw new Error('pathColor: no stops');
  if (stops.length === 1) return mixColor(stops[0], stops[0], 0);
  const pos = at ?? stops.map((_, i) => i / (stops.length - 1));
  const k = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < stops.length - 2 && k > pos[i + 1]) i++;
  const span = Math.max(1e-9, pos[i + 1] - pos[i]);
  return mixColor(stops[i], stops[i + 1], (k - pos[i]) / span);
};
