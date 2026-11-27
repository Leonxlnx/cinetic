// NoticePile (ui, build): one notice lands alone and is held, then more, faster and faster, in a pile with depth; it
// can fold back.
// Numbers: the first lands 1.30 to 1.0 over 12 f; later ones rise 120 px in 6 f; gaps hold, 18, 11, 8, 6, 5, 4, 4, 3;
// collapse 9 f each, 2 f apart.
// Caution: hold the first one 30-45 f; keep every item's text real and different.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { LAND, type Look, Notice, type NoticeData, RISE, table, useUiFrame, withPace } from './_shared';

/** Default arrival offsets: one alone and held, then a second, then the pile accelerates. */
export const pileTimes = (n: number, hold = 40) => {
  const gaps = [hold, 18, 11, 8, 6, 5, 4, 4, 3, 3, 3, 3];
  const out = [0];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + (gaps[i - 1] ?? 3));
  return out;
};

/**
 * A notification pile that builds. The first notice lands alone by shrinking (1.30 to 1.0, blur 28 to 0, 12 f) and is
 * held; each later one rises 120 px into the front slot (scale 0.95, 6 px blur, 6 f) while the older ones step back a
 * slot: smaller (1, 0.943, 0.894, 0.849, 0.807), lower, dimmer and softer, the fifth fading out. Each one behind shows
 * its whole text below the one in front (`stack="lips"`: only a rim of its card, no text); never half a line. The arrivals come
 * faster and faster (`times`, default `pileTimes`). From `collapseAt` (relative) the pile folds back behind the front
 * notice into one, leaving two lips under it. Centre at (x, y): the front notice's centre.
 */
const NoticePileInner: React.FC<{
  L: Look;
  items: NoticeData[];
  at: number;
  /** Arrival frames relative to `at` (default: pileTimes(items.length, hold)). */
  times?: number[];
  hold?: number;
  collapseAt?: number;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  /** px between slots at full size (overrides `stack`). */
  pitch?: number;
  /**
   * What each notice behind shows below the one in front: 'lines' (default) its whole text, title and body, only its top
   * padding under the front one; 'lips' only a rim of its card, no text (a tight pile).
   */
  stack?: 'lines' | 'lips';
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, items, at: start, times, hold = 40, collapseAt, x: xIn, y = 420, w = 860, size = 32, pitch, stack = 'lines', speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const T = (times ?? pileTimes(items.length, hold)).map((t) => t + start);
  // the notice's height: padding plus the taller of the glyph and the text block
  const n0 = items[0];
  const textH = (n0?.app ? size * 1.2 : 0) + size * 1.25 + (n0?.body ? size * 1.36 : 0);
  const h = size * 0.85 * 2 + Math.max(size * 2.35, textH);
  const SC = [1, 0.943, 0.894, 0.849, 0.807, 0.77];
  // the slot step: a notice behind must show either its whole text (its title's top clear of the one in front, which is
  // larger by up to 1/0.943) or no text at all (a rim under the bottom padding); never half a line
  const step = pitch ?? (stack === 'lips' ? size * 0.62 + h * 0.06 : h * 1.065 - size * 0.62);
  const BL = [0, 1.2, 2, 2.8, 5, 8];
  const DIM = [0, 0.06, 0.13, 0.2, 0.3, 0.4];
  const col = collapseAt !== undefined ? start + collapseAt : Infinity;
  const nodes: React.ReactNode[] = [];
  items.forEach((n, i) => {
    if (frame < T[i]) return;
    // slot = how many arrived after this one, eased with the same rise table
    let slot = 0;
    for (let j = i + 1; j < items.length; j++) slot += frame >= T[j] ? table(frame, T[j], RISE) : 0;
    const s0 = Math.floor(slot);
    const fr = slot - s0;
    const lerpArr = (a: number[]) => mix(fr, a[Math.min(a.length - 1, s0)], a[Math.min(a.length - 1, s0 + 1)]);
    let scale = lerpArr(SC);
    let dy = 0;
    for (let k = 0; k < Math.min(slot, 6); k++) dy += step * SC[Math.min(5, k + 1)] * Math.min(1, slot - k);
    let blur = lerpArr(BL);
    let dim = lerpArr(DIM);
    let op = clamp(5 - slot);
    // arrival
    if (i === 0) {
      const sc = table(frame, T[0], LAND);
      scale *= sc;
      blur += mix(clamp((frame - T[0]) / 11), 28, 0);
      op *= clamp((frame - T[0] + 1) / 4);
    } else {
      const r = table(frame, T[i], RISE);
      dy += mix(r, 120, 0);
      scale *= mix(r, 0.95, 1);
      blur += mix(r, 6, 0);
      op *= mix(r, 0.9, 1);
    }
    // collapse: back to front, each folds up behind the front one (ease-in), two lips stay
    if (frame >= col && slot > 0.01) {
      const order = Math.round(slot);
      const c = at(frame, col + Math.max(0, 5 - order) * 2, 9, ease.in);
      const lip = order === 1 ? 1 : order === 2 ? 2 : 0;
      const targetDy = lip ? lip * size * 0.42 : 0;
      const targetSc = lip ? 1 - lip * 0.05 : 0.9;
      dy = mix(c, dy, targetDy);
      scale = mix(c, scale, targetSc);
      op = lip ? op : op * (1 - c);
      blur = mix(c, blur, 0);
      dim = mix(c, dim, lip ? 0.04 * lip : 0);
    }
    const creep = 1 + 0.012 * at(frame, start, 200, ease.out);
    nodes.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: y - h / 2 + dy,
          width: w,
          transformOrigin: '50% 0%',
          transform: `scale(${scale * creep})`,
          opacity: op,
          filter: `${blur > 0.05 ? `blur(${blur}px)` : ''} ${dim > 0 ? `brightness(${L.dark ? 1 - dim * 1.4 : 1 - dim * 0.45})` : ''}`.trim() || undefined,
          zIndex: 100 - Math.round(slot * 10),
        }}
      >
        <Notice L={L} n={n} w={w} size={size} />
      </div>,
    );
  });
  return <>{nodes}</>;
};

export const NoticePile = withPace(NoticePileInner);
