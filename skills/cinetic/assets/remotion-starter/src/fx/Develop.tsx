import React, { useId } from 'react';
import { Img } from 'remotion';
import { C } from '../brand/tokens';
import { clamp, type Ease, M } from '../lib/anim';
import { stepFrame } from '../lib/cadence';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';
import { type CardImage, imageZoom } from '../lib/image';

// Imagery that develops: a thumbnail, a screenshot or a built panel first shows as a tint (a duotone in
// the film's own ink and accent, or a supplied tinted plate), then comes into full colour. The tint is a
// STATIC filter on one copy; the colour copy above it fades in by opacity on M.develop (an S: it waits,
// develops, settles), column by column `stagger` frames apart. Nothing animates a filter, so the GPU
// cost is one filtered layer per picture. House numbers (60 fps): 24 f per tile on M.develop, 4 f
// between columns; `steps` puts the develop on a lower cadence (16 fps holds) for a stepped look.

export type DevelopProps = {
  start: number; // the first frame of the first column's develop
  dur?: number; // frames per tile (default 24 f at 60 fps)
  ease?: Ease; // default M.develop
  stagger?: number; // frames between columns (default 4 f at 60 fps)
  index?: number; // this picture's column (0 = first)
  steps?: { animFps: 12 | 16 | 20 | 30; phase?: number }; // develop on a stepped cadence (declared)
};

export type DevelopState = { p: number; phase: 'tint' | 'developing' | 'colour' };

const HOUSE = { dur60: 24, stagger60: 4 } as const;

/** Develop progress (0 = the tint, 1 = full colour) of column `index` at frame f. Pure, closed form. */
export const developState = (f: number, o: DevelopProps, film?: Partial<FilmCtx>): DevelopState => {
  const fps = fpsOf(film);
  const dur = Math.max(1e-6, o.dur ?? f60x(HOUSE.dur60, fps));
  const st = o.start + (o.index ?? 0) * (o.stagger ?? f60x(HOUSE.stagger60, fps));
  const g = o.steps ? stepFrame(f, { animFps: o.steps.animFps, filmFps: fps, phase: o.steps.phase ?? st }) : f;
  const t = clamp((g - st) / dur);
  return { p: (o.ease ?? M.develop)(t), phase: t <= 0 ? 'tint' : t >= 1 ? 'colour' : 'developing' };
};

/** The frames column `index` starts and ends its develop. */
export const developFrames = (o: DevelopProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const st = o.start + (o.index ?? 0) * (o.stagger ?? f60x(HOUSE.stagger60, fps));
  return { start: st, end: st + (o.dur ?? f60x(HOUSE.dur60, fps)) };
};

/** A colour as 0..1 sRGB channels: '#rgb', '#rrggbb' or 'rgb(r, g, b)' (what lib/color mixes return). */
const rgb01 = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  const h = c.replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
};

/** A duotone: luminance mapped from `shadow` (dark) to `highlight` (light). Defaults: the ink and a light tint of the accent. */
export type Duotone = { shadow?: string; highlight?: string };

/**
 * The static duotone filter as an inline SVG <filter> (luminance -> a two-colour ramp). Put it once in the
 * tree and point a layer at it with filter: url(#id).
 */
export const DuotoneFilter: React.FC<{ id: string; tone?: Duotone }> = ({ id, tone }) => {
  const a = rgb01(tone?.shadow ?? C.ink);
  const b = rgb01(tone?.highlight ?? mixColor(C.white, C.accent, 0.45));
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          {/* lint-ok: static duotone, set by props once, never by the frame */}
          <feFuncR type="table" tableValues={`${a[0].toFixed(4)} ${b[0].toFixed(4)}`} />
          {/* lint-ok: static duotone, set by props once, never by the frame */}
          <feFuncG type="table" tableValues={`${a[1].toFixed(4)} ${b[1].toFixed(4)}`} />
          {/* lint-ok: static duotone, set by props once, never by the frame */}
          <feFuncB type="table" tableValues={`${a[2].toFixed(4)} ${b[2].toFixed(4)}`} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

/**
 * One developing picture or panel. Content: `image` (a supplied screenshot or product shot, cropped by
 * fit / focus / zoom as in <Card>) or `children` (built UI). The tint: a duotone (default) drawn by a
 * static filter, or `tintSrc` (a supplied pre-tinted plate of the same picture). The colour copy fades
 * in above it on developState. Size: `width` x `height` px, placed with `x`, `y`; `radius` rounds it.
 */
export const Develop: React.FC<
  DevelopProps & {
    frame: number;
    width: number;
    height: number;
    x?: number;
    y?: number;
    radius?: number;
    image?: CardImage;
    tint?: Duotone;
    tintSrc?: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
  }
> = ({ frame, width, height, x = 0, y = 0, radius = 0, image, tint, tintSrc, children, style, ...o }) => {
  const film = useFilm();
  const s = developState(frame, o, film);
  const fid = `duo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const z = image ? imageZoom(frame, image, film.fps) : 1;
  const fx = clamp(image?.focus?.x ?? 0.5) * 100;
  const fy = clamp(image?.focus?.y ?? 0.5) * 100;
  const pic = (src: string, filter?: string, opacity = 1) => (
    <Img data-imagery=""
      src={src}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        objectFit: image?.fit ?? 'cover',
        objectPosition: `${fx}% ${fy}%`,
        transformOrigin: `${fx}% ${fy}%`,
        transform: z !== 1 ? `scale(${z.toFixed(5)})` : undefined,
        filter,
        opacity,
      }}
    />
  );
  const layer = (filter: string | undefined, opacity: number, key: string) => (
    <div key={key} style={{ position: 'absolute', inset: 0, opacity, filter }}>
      {children}
    </div>
  );
  const useDuo = !tintSrc;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height, borderRadius: radius, overflow: 'hidden', transform: `translate(${x}px, ${y}px)`, background: image?.background, ...style }}>
      {useDuo && <DuotoneFilter id={fid} tone={tint} />}
      {s.p < 1 && (image ? (tintSrc ? pic(tintSrc) : pic(image.src, `url(#${fid})`)) : layer(`url(#${fid})`, 1, 'tint'))}
      {s.p > 0 && (image ? pic(image.src, undefined, s.p) : layer(undefined, s.p, 'colour'))}
    </div>
  );
};

/**
 * What a Develop instance declares: its blend as a `light` seam in the middle of the develop (the colour comes up in
 * the same picture, so forensics' dissolve check accepts it there), and a stepped range when it develops on a lower
 * cadence. Declare the instance with the column's `index` the picture uses.
 */
export const declares = (p?: Partial<DevelopProps> & { id?: string }, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = developFrames(p as DevelopProps, film);
  const id = p.id ?? 'develop';
  const seams = [{ at: Math.round((fr.start + fr.end) / 2), kind: 'light' as const, id }];
  const stepped: SteppedRange[] = p.steps ? [{ from: Math.floor(fr.start), to: Math.ceil(fr.end) + 1, fps: p.steps.animFps, id }] : [];
  return { stepped, flashes: [], cameraBlur: [], seams };
};
