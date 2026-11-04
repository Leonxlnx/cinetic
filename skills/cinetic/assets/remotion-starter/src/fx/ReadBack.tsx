/**
 * ReadBack: the picture steps back behind a centred line while it is read. A statement sits centred in the middle of
 * the frame; when the product is on screen at the same time, the product softens (a defocus), dims and recedes a step
 * from just before the line arrives until just after it leaves, then comes sharp again for its own beat. The words read
 * alone on a calm ground and the picture plays before and after them: never a line squeezed above or beside the picture.
 *
 *   readBack(F, at, out)   0 before the line, 1 while it is read, 0 again once it has left (eased, READ_BACK frames)
 *   <ReadBack F at out>    wraps the picture layer (not the line): blur, dim and scale about the frame's centre
 *
 * `at` is the line's first frame, `out` the first frame of its exit (a COPY entry's in and out). Pure but the component.
 */
import React from 'react';
import { U } from '../brand/tokens';
import { E, prog } from '../lib/anim';
import { f60x, type FilmCtx, fpsOf, useFilm } from '../lib/film';

/** House numbers: the defocus (px at 1080p), how much the picture dims, how far it recedes, the ramps (60 fps frames). */
export const READ_BACK = { blur: 7, dim: 0.5, scale: 0.03, lead60: 4, in60: 16, out60: 18 } as const;

/** How far the picture has stepped back at frame F for a line read from `at` to `out` (0..1). Pure. */
export const readBack = (F: number, at: number, out: number, film?: Partial<FilmCtx>, o: Partial<typeof READ_BACK> = {}): number => {
  const fps = fpsOf(film);
  const k = { ...READ_BACK, ...o };
  const t = (n: number) => f60x(n, fps);
  return prog(F, at - t(k.lead60), at + t(k.in60), E.stdInOut) * (1 - prog(F, out - t(2), out + t(k.out60), E.stdInOut));
};

/** The picture layer behind a centred line: softened, dimmed and a step back while the line is read. */
export const ReadBack: React.FC<{ F: number; at: number; out: number; children: React.ReactNode; blur?: number; dim?: number; scale?: number; style?: React.CSSProperties }> = ({ F, at, out, children, blur = READ_BACK.blur, dim = READ_BACK.dim, scale = READ_BACK.scale, style }) => {
  const film = useFilm();
  const b = readBack(F, at, out, film);
  const on = b > 0.002;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - dim * b, filter: on ? `blur(${(blur * U * b).toFixed(2)}px)` : undefined, transformOrigin: '50% 50%', transform: on ? `scale(${(1 - scale * b).toFixed(5)})` : undefined, ...style }}>
      {children}
    </div>
  );
};
