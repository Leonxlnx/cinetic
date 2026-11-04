import React from 'react';
import { C } from '../brand/tokens';
import { clamp } from '../lib/anim';
import { type FilmCtx, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * KeyRim: the edge of a glass card, a pill or a product panel lit by the film's key light. A thin border brightest on
 * the side that faces the light, thinning and fading round to the far side, with an optional soft spill just outside
 * the edge toward the key (a frosted pill whose border thins away from the light, a prompt box whose cold rim is
 * brightest on the right). The light has a side, so the rim has one: a uniform 1 px outline reads as a wireframe.
 * cinetic:light the key's light caught on a lit edge, and its spill just past that edge
 *
 *   rimStops(key, o)   the conic-gradient stops (CSS) for a key from `key` degrees (0 = from the right, 90 = from below,
 *                      the house screen angles), the bright arc `spread` degrees wide at `peak`, `base` on the far side
 *   rimWidthAt(a, o)   the border's width at angle a: full toward the key, `thin` of it on the far side (the border
 *                      itself is drawn at full width and faded; this is the width the eye reads, for checks)
 *   <KeyRim>           the border over a box (a ring mask on the conic gradient, so it follows any radius), the
 *                      spill as an offset soft shadow toward the key
 *
 * House numbers (px at 1080p): width 2, peak alpha 0.9, far side 0.12, the bright arc 110 degrees, thin 0.35; the spill
 * 18 px at 0.18, offset 6 px toward the key. The rim's colour is white on a dark or mid ground, the accent lifted on a
 * light one; one key per film, so every rim in it faces the same way.
 */
export const RIM = { width: 2, peak: 0.9, base: 0.12, spread: 110, thin: 0.35, spill: { blur: 18, alpha: 0.18, offset: 6 } } as const;
export type RimOpts = { peak?: number; base?: number; spread?: number; thin?: number };

const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(a).toFixed(3)})`;
};

/** How lit the rim is at screen angle a (deg, 0 = right, 90 = down) for a key from `key`: 1 facing it, 0 beyond the arc. Pure. */
export const rimLight = (a: number, key: number, spread: number = RIM.spread): number => {
  const d = Math.abs(((((a - key) % 360) + 540) % 360) - 180); // 0..180 from the key's direction
  const half = Math.max(1, spread / 2);
  const t = clamp(d / (half * 1.6));
  return Math.cos((t * Math.PI) / 2) ** 2;
};

/** The rim's alpha at screen angle a. Pure. */
export const rimAlphaAt = (a: number, key: number, o: RimOpts = {}) => {
  const base = o.base ?? RIM.base;
  return base + ((o.peak ?? RIM.peak) - base) * rimLight(a, key, o.spread);
};

/** The width the eye reads at angle a (a share of the full width). Pure. */
export const rimWidthAt = (a: number, key: number, o: RimOpts = {}) => {
  const thin = o.thin ?? RIM.thin;
  return thin + (1 - thin) * rimLight(a, key, o.spread);
};

/** The conic-gradient for a rim of `color` keyed from `key` degrees: 24 stops round the box. Pure. */
export const rimStops = (key: number, color: string, o: RimOpts = {}): string => {
  const n = 24;
  const stops = Array.from({ length: n + 1 }, (_, i) => {
    const conic = (360 * i) / n; // conic 0 = up, clockwise
    const screen = conic - 90; // screen angle: 0 = right, 90 = down
    return `${rgba(color, rimAlphaAt(screen, key, o))} ${conic.toFixed(1)}deg`;
  });
  return `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')})`;
};

export type KeyRimProps = RimOpts & {
  w: number; // the box, film px
  h: number;
  r: number; // corner radius, film px
  light?: number; // where the key light comes from, degrees (0 = right, 90 = below, 180 = left, -90 = above); default -35: the upper right (never `key`: React keeps that name)
  color?: string; // default white
  width?: number; // px at 1080p
  spill?: boolean | { blur?: number; alpha?: number; offset?: number };
  opacity?: number;
  style?: React.CSSProperties;
};

/** The lit border of a w x h box (draw it inside the box's own positioned element). */
export const KeyRim: React.FC<KeyRimProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const key = p.light ?? -35;
  const col = p.color ?? C.white;
  const bw = (p.width ?? RIM.width) * u;
  const sp = p.spill ? { ...RIM.spill, ...(typeof p.spill === 'object' ? p.spill : {}) } : null;
  const rad = (key * Math.PI) / 180;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, pointerEvents: 'none', opacity: p.opacity ?? 1, ...p.style }}>
      {sp && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: p.r,
            boxShadow: `${(Math.cos(rad) * sp.offset * u).toFixed(2)}px ${(Math.sin(rad) * sp.offset * u).toFixed(2)}px ${(sp.blur * u).toFixed(2)}px ${rgba(col, sp.alpha)}`,
            clipPath: `inset(-${(sp.blur * 3 * u).toFixed(1)}px round ${p.r.toFixed(1)}px)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: p.r,
          padding: bw,
          boxSizing: 'border-box',
          background: rimStops(key, col, p),
          WebkitMask: `linear-gradient(${C.ink} 0 0) content-box, linear-gradient(${C.ink} 0 0)`,
          WebkitMaskComposite: 'xor',
          mask: `linear-gradient(${C.ink} 0 0) content-box exclude, linear-gradient(${C.ink} 0 0)`,
        }}
      />
    </div>
  );
};

/** A rim declares nothing. */
export const declares = (_p?: Partial<KeyRimProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
