// Text measurement against the real, loaded font. Only call it under <FontGate> (every act is),
// because a measurement taken with the fallback face would be cached and silently wrong.
import { FONT } from '../brand/tokens';

const widths = new Map<string, number>();

/**
 * How a measurement treats the face: `axes` = font-variation-settings (Inter's opsz 14 vs 32 moves widths 3-5 %),
 * `trailing: false` leaves out the tracking after the last letter (the ink a viewer sees ends there), `tabular:
 * false` measures proportional figures (the default stays tabular, as the counters set them).
 */
export type MeasureOpts = { axes?: string; trailing?: boolean; tabular?: boolean };

/** Advance width in px of one line, exactly as the DOM lays it out (variable weight, em tracking). */
export const measureTracked = (text: string, size: number, weight: number, trackEm: number, family = FONT.text, o: MeasureOpts = {}) => {
  const key = `${text}|${size}|${weight}|${trackEm}|${family}|${o.axes ?? ''}|${o.trailing ?? true}|${o.tabular ?? true}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;
  const span = document.createElement('span');
  span.textContent = text;
  Object.assign(span.style, {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'pre',
    fontFamily: family,
    fontSize: `${size}px`,
    fontWeight: String(weight),
    letterSpacing: `${trackEm}em`,
    fontVariantNumeric: o.tabular === false ? 'normal' : 'tabular-nums',
    fontVariationSettings: o.axes ?? 'normal',
    lineHeight: '1',
  });
  document.body.appendChild(span);
  const w = span.getBoundingClientRect().width - (o.trailing === false && text.length ? trackEm * size : 0);
  document.body.removeChild(span);
  widths.set(key, w);
  return w;
};

/** Largest size (px, at most `max`) at which `text` fits in `maxWidth`. Widths scale linearly with size. */
export const fitSize = (text: string, maxWidth: number, max: number, weight: number, trackEm: number, family = FONT.text) =>
  Math.min(max, (maxWidth / measureTracked(text, 100, weight, trackEm, family)) * 100);

/**
 * Ink metrics of `text` from the font itself (canvas measureText): how far glyphs rise above and
 * fall below the baseline, and where the ink starts and ends. Use it to sit a mark on the cap
 * height or a dot on the baseline instead of guessing from the font size.
 */
type Ink = { ascent: number; descent: number; left: number; right: number; fontAscent: number; fontDescent: number };
const inks = new Map<string, Ink>();

export const inkBox = (text: string, size: number, weight: number, family = FONT.text): Ink => {
  const key = `${text}|${size}|${weight}|${family}`;
  const hit = inks.get(key);
  if (hit) return hit;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) throw new Error('inkBox: no 2D canvas context');
  ctx.font = `${weight} ${size}px ${family}`;
  const m = ctx.measureText(text);
  const ink = {
    ascent: m.actualBoundingBoxAscent, // ink above the baseline
    descent: m.actualBoundingBoxDescent, // ink below it
    left: -m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    fontAscent: m.fontBoundingBoxAscent, // the font's line metrics, which CSS line boxes use
    fontDescent: m.fontBoundingBoxDescent,
  };
  inks.set(key, ink);
  return ink;
};

/** Distance from the top of a CSS line box (font-size `size`, line-height `lead`) down to its baseline. */
export const baselineOf = (size: number, weight: number, lead: number, family = FONT.text) => {
  const { fontAscent, fontDescent } = inkBox('Hg', size, weight, family);
  return (size * lead - (fontAscent + fontDescent)) / 2 + fontAscent;
};

/**
 * The em tracking that makes a face's words match widths measured on a target picture (least squares): each sample
 * gives a word's width at tracking 0 (`w0`), its letter count (`n`, every letter carries the tracking) and size,
 * and the width wanted. Pure. Returns the tracking and each sample's remaining error as a share of its width.
 */
export const solveTracking = (samples: readonly { w0: number; n: number; size: number; target: number }[]) => {
  let num = 0;
  let den = 0;
  for (const s of samples) {
    const a = s.n * s.size; // px of width per em of tracking
    num += a * (s.target - s.w0);
    den += a * a;
  }
  const em = den > 0 ? num / den : 0;
  return { em, residue: samples.map((s) => (s.w0 + em * s.n * s.size - s.target) / s.target) };
};

/**
 * A face swap that keeps the target's widths: matching cap height alone leaves words 10-26 % off, so fit the
 * tracking to measured ink widths (`width` px of `text` set at `size`; trailing tracking left out) and read the
 * residue: under 3 % the face fits, over 6 % try the next candidate face. Only under <FontGate>.
 */
export const fitTracking = (samples: readonly { text: string; width: number; size: number }[], weight: number, family = FONT.text, axes?: string) =>
  solveTracking(samples.map((s) => ({ w0: measureTracked(s.text, s.size, weight, 0, family, { axes, trailing: false, tabular: false }), n: Math.max(0, [...s.text].length - 1), size: s.size, target: s.width })));
