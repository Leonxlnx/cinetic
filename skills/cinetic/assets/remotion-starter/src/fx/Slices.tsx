import React from 'react';
import { clamp, E, type Ease, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Slices: an element cut into bands that move apart along the bands or across them.
 *
 *   'strips'  type cut into thin horizontal strips (8-10 per glyph height) that slide sideways by different
 *             seeded amounts until they span the frame's width: full width a few frames in (43 f, front-loaded);
 *             set `back` to gather them again
 *   'slats'   a picture cut into 4-6 horizontal slats offset up and down by different amounts, so it reads as
 *             a stepped, sliced object, the offsets settling to flat (65 f, ease-out)
 *
 * One state for both (the bands, their extents as shares of the element, their offsets in px). The element is
 * drawn once per band, each copy clipped to its band (no blur, no filters).
 */

/** House numbers: frames at 60 fps. */
export const SLICES = { strips: { n: 9, frames60: 43, spread: 1.0 }, slats: { n: 5, frames60: 65, spread: 0.08 } } as const;

export type SlicesProps = {
  at: number;
  kind?: 'strips' | 'slats';
  n?: number; // bands (strips house 9, slats 5)
  spread?: number; // largest offset: strips a share of the frame width (house 1.0), slats a share of the element height (0.08)
  offsets?: number[]; // explicit offsets per band, -1..1 (default seeded)
  frames?: number; // 60 fps frames (strips 43, slats 65)
  ease?: Ease; // house strips E.jump (spread by 3 frames at 24 fps), slats E.snapOut
  back?: { at: number; frames?: number }; // strips gather again (accelerating)
  seed?: string | number;
  id?: string;
};

export type SliceBand = { i: number; a0: number; a1: number; d: number };

/** Every band: its extent across the element (shares 0..1, top to bottom) and its offset (px) at frame f. Pure. */
export const slicesState = (frame: number, p: SlicesProps, size: { w: number; h: number }, film?: Partial<FilmCtx>): SliceBand[] => {
  const fps = fpsOf(film);
  const kind = p.kind ?? 'strips';
  const house = kind === 'strips' ? SLICES.strips : SLICES.slats;
  const n = p.n ?? house.n;
  const fr = Math.max(1, f60x(p.frames ?? house.frames60, fps));
  const t = clamp((frame - p.at) / fr);
  const e = frame < p.at ? 0 : (p.ease ?? (kind === 'strips' ? E.jump : E.snapOut))(t);
  // strips: grow apart (0 -> 1, then back); slats: start offset and settle (1 -> 0)
  let k = kind === 'strips' ? e : 1 - e;
  if (kind === 'slats' && frame < p.at) k = 1;
  if (p.back) k *= 1 - E.buildIn(clamp((frame - p.back.at) / Math.max(1, f60x(p.back.frames ?? 20, fps))));
  const spread = (p.spread ?? house.spread) * (kind === 'strips' ? (film?.width ?? size.w) : size.h);
  return Array.from({ length: n }, (_, i) => {
    const o = p.offsets?.[i] ?? rand(`${p.seed ?? 'slices'}:${i}`) * 2 - 1;
    return { i, a0: i / n, a1: (i + 1) / n, d: o * spread * k };
  });
};

/** Sync: the cut (a slice or a zip), the moment it is spread (strips) or flat (slats), the gather. */
export const slicesFrames = (p: SlicesProps, film?: Partial<FilmCtx>) => {
  const house = (p.kind ?? 'strips') === 'strips' ? SLICES.strips : SLICES.slats;
  return { cut: p.at, done: Math.ceil(p.at + f60x(p.frames ?? house.frames60, fpsOf(film))), back: p.back?.at };
};

/**
 * Draws `children` (laid out in a w x h box at x, y) once per band, clipped to the band; strips move along x,
 * slats along y.
 */
export const Slices: React.FC<SlicesProps & { frame: number; x: number; y: number; w: number; h: number; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const bands = slicesState(props.frame, props, { w: props.w, h: props.h }, film);
  const strips = (props.kind ?? 'strips') === 'strips';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.w, height: props.h, transform: `translate(${props.x}px, ${props.y}px)` }}>
      {bands.map((b) => (
        <div
          key={b.i}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `inset(${(b.a0 * 100).toFixed(3)}% -400% ${((1 - b.a1) * 100).toFixed(3)}% -400%)`,
            transform: strips ? `translate3d(${b.d.toFixed(2)}px, 0, 0)` : `translate3d(0, ${b.d.toFixed(2)}px, 0)`,
          }}
        >
          {props.children}
        </div>
      ))}
    </div>
  );
};

/** Continuous: nothing to declare. */
export const declares = (_p?: Partial<SlicesProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
