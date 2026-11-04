import React, { useId } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { plateAt } from './plates';

/**
 * GradientMap: a picture's luminance mapped onto the film's inks (shadows to a deep ink, mids to the accent,
 * highlights to a pale tint), so real imagery carries the palette. Each map is ONE static SVG filter
 * (luminance, then a component-transfer table built from the stops in OKLab); every change of map is a change
 * of which statically filtered copy shows, by opacity or on a cut, so no filter value ever animates.
 *
 *   map      the shot's map (2-5 stops, dark to light) with `mix` toward the original; `in` tints it on over
 *            the original (house 8 f)
 *   to       cross-fade to another map (a drifting map, 30-100 f) or to 'true' colour: a photo that arrives as
 *            a duotone and develops (house 36 f on M.develop)
 *   roll     a tile cycles through a palette of maps (6 f a map, tiles staggered 6 f), washed toward the stage
 *            at first (55 %), the wash draining as it goes, and lands on true colour on a cut (stepped)
 *   TrueColourBoxes  thin white boxes pop onto subjects (4 f) and keep them in true colour while the frame
 *            around them is mapped; each box is a plain copy clipped to it
 *
 * House maps: inkMap (ink, accent, pale tint), COOL, MINT, a cool HEAT (navy, teal, lime, pale) and six
 * pastel roll maps round the accent's side of the wheel. Pure state: gradientMapState(f), trueBoxState(f).
 */

export type MapStops = readonly string[];

export const GRADIENT_MAP = { in60: 8, to60: 36, perMap60: 6, stagger60: 6, wash: 0.55, boxPop60: 4, boxStroke: 2, table: 9 } as const;

/** The film's own two-ink field: luminance 0 -> a deep ink, .5 -> the accent, 1 -> a pale tint. */
export const inkMap = (ink: string = C.ink, accent: string = C.accent): MapStops => [mixColor(ink, accent, 0.18), accent, mixColor(accent, '#FFFFFF', 0.82)];
// cinetic:device-palette false-colour maps: each a dark-to-light run for one picture's luminance
export const COOL: MapStops = ['#0B2F38', '#1E8FA3', '#8FE3EE', '#F0FBFD'];
export const MINT: MapStops = ['#0B3D2A', '#2F9E6E', '#9BE8C2', '#F5FFF9'];
export const HEAT: MapStops = ['#142028', '#126E7A', '#7CCB5E', '#E9F7B8', '#FFFFFF'];
/** Pastel maps for a roll: each a dark-to-light run at one hue round the accent's side of the wheel. */
export const PASTEL_ROLL: MapStops[] = [
  ['#24433A', '#9BD9B8', '#F4FBF7'],
  ['#20404A', '#93D3E0', '#F2FAFC'],
  ['#2A3A55', '#A6BDEA', '#F4F7FD'],
  ['#2E4636', '#B8DE9A', '#F7FBF1'],
  ['#1F4446', '#8FDCD2', '#F0FBF9'],
  ['#273F52', '#9CC8EC', '#F3F8FD'],
];

export type GradientMapProps = {
  at: number;
  map: MapStops;
  mix?: number; // 0 = the full map, 1 = the original
  in?: number; // 60 fps frames for the map to tint on over the original (0 = already on)
  to?: { map: MapStops | 'true'; at: number; dur?: number; ease?: Ease };
  roll?: { palette?: MapStops[]; perMap?: number; stagger?: number; index?: number; land?: 'true' | 'map'; wash?: number };
  id?: string;
};

export type MapLayer = { map: MapStops | 'true'; opacity: number };
export type GradientMapState = { layers: MapLayer[]; wash: number; step: number };

/** Which statically mapped copies show at frame f, bottom first, with their opacities. Pure. */
export const gradientMapState = (frame: number, p: GradientMapProps, film?: Partial<FilmCtx>): GradientMapState => {
  const fps = fpsOf(film);
  const t = frame - p.at;
  if (p.roll) {
    const pal = p.roll.palette ?? PASTEL_ROLL;
    const per = Math.max(1, f60x(p.roll.perMap ?? GRADIENT_MAP.perMap60, fps));
    const start = f60x((p.roll.stagger ?? GRADIENT_MAP.stagger60) * (p.roll.index ?? 0), fps);
    const k = Math.max(0, Math.floor((t - start) / per));
    const w0 = p.roll.wash ?? GRADIENT_MAP.wash;
    if (k >= pal.length) return { layers: [{ map: p.roll.land === 'map' ? p.map : 'true', opacity: 1 }], wash: 0, step: pal.length };
    return { layers: [{ map: pal[k], opacity: 1 }], wash: w0 * (1 - k / pal.length), step: k };
  }
  const tin = f60x(p.in ?? 0, fps);
  const on = tin > 0 ? E.softOut(clamp(t / tin)) : t >= 0 ? 1 : 0;
  const layers: MapLayer[] = [];
  const mixK = p.mix ?? 0;
  layers.push({ map: 'true', opacity: 1 });
  layers.push({ map: p.map, opacity: on * (1 - mixK) });
  if (p.to) {
    const d = Math.max(1, f60x(p.to.dur ?? GRADIENT_MAP.to60, fps));
    const k = (p.to.ease ?? (p.to.map === 'true' ? ((t2: number) => t2) : E.strongInOut))(clamp((frame - p.to.at) / d));
    if (p.to.map === 'true') layers[1].opacity *= 1 - k;
    else layers.push({ map: p.to.map, opacity: k * on * (1 - mixK) });
  }
  return { layers: layers.filter((l) => l.opacity > 0.001 || l.map === 'true'), wash: 0, step: -1 };
};

/** Sync: the tint on, each roll step and the landing, the end of a cross-fade. */
export const gradientMapFrames = (p: GradientMapProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  if (p.roll) {
    const pal = p.roll.palette ?? PASTEL_ROLL;
    const per = f60x(p.roll.perMap ?? GRADIENT_MAP.perMap60, fps);
    const start = p.at + f60x((p.roll.stagger ?? GRADIENT_MAP.stagger60) * (p.roll.index ?? 0), fps);
    const steps = Array.from({ length: pal.length }, (_, i) => Math.ceil(start + i * per));
    return { start: p.at, steps, land: Math.ceil(start + pal.length * per) };
  }
  const toEnd = p.to ? Math.ceil(p.to.at + f60x(p.to.dur ?? GRADIENT_MAP.to60, fps)) : undefined;
  return { start: p.at, on: Math.ceil(p.at + f60x(p.in ?? 0, fps)), toEnd };
};

/** feComponentTransfer table values per channel for a map (OKLab-interpolated, `n` entries). Pure. */
export const mapTables = (stops: MapStops, n: number = GRADIENT_MAP.table): [string, string, string] => {
  const rows = Array.from({ length: n }, (_, i) => plateAt(stops, i / (n - 1)));
  return [0, 1, 2].map((c) => rows.map((r) => r[c].toFixed(4)).join(' ')) as [string, string, string];
};

const MapFilter: React.FC<{ id: string; stops: MapStops }> = ({ id, stops }) => {
  const [r, g, b] = mapTables(stops);
  return (
    <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
      <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues={r} />
        <feFuncG type="table" tableValues={g} />
        <feFuncB type="table" tableValues={b} />
      </feComponentTransfer>
    </filter>
  );
};

/**
 * Draws `children` (a full-box picture layer: Photo, Footage, an <Img>) once per visible layer, each copy under
 * its own static map filter. `stage` is the wash colour of a roll (the ground).
 */
export const GradientMap: React.FC<GradientMapProps & { frame: number; stage?: string; style?: React.CSSProperties; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const s = gradientMapState(props.frame, props, film);
  const all: MapStops[] = props.roll ? [...(props.roll.palette ?? PASTEL_ROLL), props.map] : [props.map, ...(props.to && props.to.map !== 'true' ? [props.to.map] : [])];
  const idOf = (m: MapStops) => `gm${uid}-${all.indexOf(m)}`;
  return (
    <div style={{ position: 'absolute', inset: 0, ...props.style }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {all.map((m, i) => (
            <MapFilter key={i} id={`gm${uid}-${i}`} stops={m} />
          ))}
        </defs>
      </svg>
      {s.layers.map((l, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, opacity: l.opacity, filter: l.map === 'true' ? undefined : `url(#${idOf(l.map)})` }}>
          {props.children}
        </div>
      ))}
      {s.wash > 0 ? <div style={{ position: 'absolute', inset: 0, background: props.stage ?? C.paper, opacity: s.wash }} /> : null}
    </div>
  );
};

// ---- TrueColourBoxes ------------------------------------------------------------------------------------------

export type TrueBox = { x: number; y: number; w: number; h: number; at: number };

/** A box's pop (0..1: the frame scales 1.12 -> 1 and fades on in 4 f) and whether its true-colour clip is on. Pure. */
export const trueBoxState = (frame: number, b: TrueBox, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const d = Math.max(1, f60x(GRADIENT_MAP.boxPop60, fps));
  const k = frame < b.at ? 0 : E.snapOut(clamp((frame - b.at) / d));
  return { pop: k, scale: 1.12 - 0.12 * k, on: frame >= b.at };
};

/** Each box: a plain copy of `children` clipped to it (true colour), a thin frame and corner ticks on top. */
export const TrueColourBoxes: React.FC<{ frame: number; boxes: TrueBox[]; color?: string; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const sw = GRADIENT_MAP.boxStroke * u;
  const W = film.width;
  const H = film.height;
  return (
    <>
      {props.boxes.map((b, i) => {
        const s = trueBoxState(props.frame, b, film);
        if (!s.on) return null;
        const tick = Math.min(b.w, b.h) * 0.16;
        const col = props.color ?? C.white;
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${b.y}px ${W - b.x - b.w}px ${H - b.y - b.h}px ${b.x}px)` }}>{props.children}</div>
            <svg width={b.w} height={b.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: s.pop, transform: `translate(${b.x}px, ${b.y}px) scale(${s.scale})`, transformOrigin: `${b.w / 2}px ${b.h / 2}px` }} aria-hidden>
              <rect x={0} y={0} width={b.w} height={b.h} fill="none" stroke={col} strokeOpacity={0.7} strokeWidth={sw} />
              <path d={`M0 ${tick}V0H${tick}M${b.w - tick} 0H${b.w}V${tick}M${b.w} ${b.h - tick}V${b.h}H${b.w - tick}M${tick} ${b.h}H0V${b.h - tick}`} fill="none" stroke={col} strokeWidth={sw * 2} />
            </svg>
          </React.Fragment>
        );
      })}
    </>
  );
};

/** A roll changes map on frames (stepped); a cross-fade and the boxes are continuous. */
export const declares = (p?: Partial<GradientMapProps>, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || p.at === undefined || !p.roll || !p.map) return none;
  const fr = gradientMapFrames(p as GradientMapProps, film) as { land: number };
  return { ...none, stepped: [{ from: p.at, to: fr.land + 1, id: p.id ?? 'gradient-roll' }] };
};
