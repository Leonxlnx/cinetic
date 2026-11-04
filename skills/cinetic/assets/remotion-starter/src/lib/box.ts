// Box geometry shared by several primitives (fx/Morph, card and bento layouts, container springs): one
// rounded rect state and the clamped blend between two states. It lives in lib/ so primitives built
// in parallel import one stable signature instead of each other's components. Node-safe.
import { clamp, mix } from './anim';
import { mixColor } from './color';

/** One state of the container, in the parent's px. Shadow: black, `a` alpha (0.12-0.22 reads as a real surface). */
export type MorphBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // corner radius; a pill is h / 2
  fill?: string; // a hex token
  stroke?: string; // a hex token
  strokeW?: number;
  shadow?: { y: number; blur: number; a: number };
};

/**
 * The box between A and B at progress p. Sizes are clamped >= 0 and the radius to [0, min(w, h)/2],
 * so a spring that overshoots can never hand Chromium a negative radius (references/chromium-rendering.md §5).
 */
export const morphBox = (A: MorphBox, B: MorphBox, p: number): Required<MorphBox> => {
  const w = Math.max(0, mix(A.w, B.w, p));
  const h = Math.max(0, mix(A.h, B.h, p));
  const q = clamp(p);
  const sa = A.shadow ?? { y: 0, blur: 0, a: 0 };
  const sb = B.shadow ?? { y: 0, blur: 0, a: 0 };
  const fill = A.fill && B.fill ? mixColor(A.fill, B.fill, q) : (B.fill ?? A.fill ?? 'transparent');
  const stroke = A.stroke && B.stroke ? mixColor(A.stroke, B.stroke, q) : (B.stroke ?? A.stroke ?? 'transparent');
  return {
    x: mix(A.x, B.x, p),
    y: mix(A.y, B.y, p),
    w,
    h,
    r: clamp(mix(A.r, B.r, p), 0, Math.min(w, h) / 2),
    fill,
    stroke,
    strokeW: Math.max(0, mix(A.strokeW ?? 0, B.strokeW ?? 0, q)),
    shadow: { y: mix(sa.y, sb.y, q), blur: Math.max(0, mix(sa.blur, sb.blur, q)), a: clamp(mix(sa.a, sb.a, q)) },
  };
};
