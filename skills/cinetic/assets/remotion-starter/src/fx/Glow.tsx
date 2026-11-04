import React, { useId, useLayoutEffect, useRef } from 'react';
import { C, MASK } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { bakePlate } from './Gradients';
import { hash01, plateAt, type Stop } from './plates';

/**
 * Glow: light built as anatomy, never a uniform halo. Every blur is a fixed level; light changes by opacity,
 * scale and position only.
 *
 *   Bloom          light that spills past its object: a white-hot core (the emitter pushed toward white, 5 px),
 *                  a body in its own colour (18 px) and a falloff in the `spill` hue (56 px), added in
 *                  plus-lighter at 0.85 / 0.5 / 0.28 of the gain; bloomState() rises 14 f, holds, decays 40 f
 *   RimLight       a rim on the lit side of any silhouette: the alpha minus itself shifted toward the light,
 *                  softened 2 px and filled with the rim colour, added on top
 *   FloorGlow      a two-tone pool under or beside an object: a near-white core off-centre on the edge nearest
 *                  the source, an accent body, a second tone in the falloff; grows 0.4 -> 1 in 14 f (E.snapOut)
 *                  and spills over whatever is around it (a lit key washing its neighbours)
 *   ColourShadow   a tight dark contact shadow plus a cast shadow in the object's own deep hue that slides
 *                  away and softens as the object lifts (two fixed blur levels cross-faded by height)
 *   LightFront     a reveal inside a growing circle whose edge is a band of light: white at the front, the
 *                  accent behind it, falling off to nothing, screen-blended over the content (76 f)
 *   RadialStreaks  broad light streaks radiating round a window (warm-free by default: lift, white, cyan, deep
 *                  teal between black gaps): a baked conic plate blurred once, hollow in the middle, drifting
 *                  outward 1.2 % a second
 */

export const GLOW = {
  bloom: { radii: [5, 18, 56], weights: [0.85, 0.5, 0.28], core: 0.55, rise60: 14, decay60: 40 },
  rim: { width: 3, soft: 2 },
  floor: { grow60: 14, from: 0.4 },
  shadow: { near: 10, far: 34, contact: 0.5, cast: 0.42, reach: 0.6 },
  front: { dur60: 76, band: 110 },
  streaks: { blur: 22, drift: 0.012, inner: 0.32 },
} as const;

const NONE: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };

// ---------------------------------------------------------------------------------------------------- bloom
export type BloomProps = { at?: number; rise60?: number; hold60?: number; decay60?: number; peak?: number; rest?: number; spill?: string; radii?: readonly number[] };

/** Bloom gain at frame f: `rest` before `at`, up to `peak` in 14 f (E.snapOut), held, back to `rest` in 40 f (E.softOut). Pure. */
export const bloomState = (f: number, p: BloomProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const rest = p.rest ?? 0;
  const peak = p.peak ?? 1;
  if (p.at === undefined) return { gain: peak };
  const a = p.at;
  const b = a + f60x(p.rise60 ?? GLOW.bloom.rise60, fps);
  if (p.hold60 === undefined) return { gain: f < a ? rest : rest + (peak - rest) * E.snapOut(clamp((f - a) / (b - a))) };
  const c = b + f60x(p.hold60, fps);
  const d = c + f60x(p.decay60 ?? GLOW.bloom.decay60, fps);
  const gain = f < a ? rest : f < b ? rest + (peak - rest) * E.snapOut((f - a) / (b - a)) : f < c ? peak : peak - (peak - rest) * E.softOut(clamp((f - c) / (d - c)));
  return { gain };
};

export const Bloom: React.FC<BloomProps & { frame: number; children: React.ReactNode }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const uid = useId().replace(/[:]/g, '');
  const { gain } = bloomState(p.frame, p, film);
  const radii = p.radii ?? GLOW.bloom.radii;
  const k = GLOW.bloom.core;
  const W = GLOW.bloom.weights;
  const fr = { x: '-30%', y: '-30%', width: '160%', height: '160%' };
  const copy = (i: number) => (
    <div key={i} style={{ position: 'absolute', inset: 0, filter: `url(#bl${uid}${i})`, mixBlendMode: 'plus-lighter', opacity: clamp(gain * W[i]) }}>
      {p.children}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={`bl${uid}0`} colorInterpolationFilters="sRGB" {...fr}>
            <feColorMatrix type="matrix" values={`${1 - k} 0 0 0 ${k} 0 ${1 - k} 0 0 ${k} 0 0 ${1 - k} 0 ${k} 0 0 0 1 0`} />
            <feGaussianBlur stdDeviation={radii[0] * u} />
          </filter>
          <filter id={`bl${uid}1`} colorInterpolationFilters="sRGB" {...fr}>
            <feGaussianBlur stdDeviation={radii[1] * u} />
          </filter>
          <filter id={`bl${uid}2`} colorInterpolationFilters="sRGB" {...fr}>
            <feFlood floodColor={p.spill ?? C.accent} />
            <feComposite in2="SourceAlpha" operator="in" />
            <feGaussianBlur stdDeviation={radii[2] * u} />
          </filter>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0 }}>{p.children}</div>
      {gain > 0.001 ? [0, 1, 2].map(copy) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- rim
export type RimLightProps = { angle?: number; color?: string; width?: number; soft?: number; level?: number };

/** The feOffset that keeps the lit side: the alpha is sampled `width` px toward the light (angle 0 = from the right, -90 = from above). Pure. */
export const rimOffset = (angle: number, width: number) => {
  const a = (angle * Math.PI) / 180;
  return { dx: -width * Math.cos(a), dy: -width * Math.sin(a) };
};

export const RimLight: React.FC<RimLightProps & { children: React.ReactNode }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const uid = useId().replace(/[:]/g, '');
  const o = rimOffset(p.angle ?? -60, (p.width ?? GLOW.rim.width) * u);
  return (
    <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={`rl${uid}`} colorInterpolationFilters="sRGB">
            <feOffset in="SourceAlpha" dx={o.dx} dy={o.dy} result="o" />
            <feComposite in="SourceAlpha" in2="o" operator="out" result="rim" />
            <feGaussianBlur in="rim" stdDeviation={(p.soft ?? GLOW.rim.soft) * u} result="b" />
            <feFlood floodColor={p.color ?? '#FFFFFF'} />
            <feComposite in2="b" operator="in" />
          </filter>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0 }}>{p.children}</div>
      <div style={{ position: 'absolute', inset: 0, filter: `url(#rl${uid})`, mixBlendMode: 'plus-lighter', opacity: p.level ?? 1 }}>{p.children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- floor
export type FloorGlowProps = { x: number; y: number; w: number; h: number; tones?: [string, string]; core?: [number, number]; at?: number; grow60?: number; level?: number };

/** Pool scale and opacity at frame f: 0.4 -> 1 in 14 f on E.snapOut from `at`. Pure. */
export const floorState = (f: number, p: Pick<FloorGlowProps, 'at' | 'grow60' | 'level'>, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const t = p.at === undefined ? 1 : E.snapOut(clamp((f - p.at) / f60x(p.grow60 ?? GLOW.floor.grow60, fps)));
  return { scale: GLOW.floor.from + (1 - GLOW.floor.from) * t, opacity: (p.at === undefined || f >= p.at ? Math.min(1, t * 1.6) : 0) * (p.level ?? 1) };
};

// cinetic:device-palette a light pool's white-hot core and its cool falloff tone (the accent's neighbour)
/** The pool's stops: near-white core, accent body, second tone in the falloff. Pure. */
export const floorStops = (tones: [string, string] = [C.accent, '#11A39A']): Stop[] => [
  { at: 0, color: '#F4FFF8', alpha: 1 },
  { at: 0.16, color: tones[0], alpha: 0.92 },
  { at: 0.5, color: tones[1], alpha: 0.38 },
  { at: 1, color: tones[1], alpha: 0 },
];

export const FloorGlow: React.FC<FloorGlowProps & { frame: number }> = (p) => {
  const film = useFilm();
  const s = floorState(p.frame, p, film);
  const [cx, cy] = p.core ?? [0.5, 0.42];
  const plate = bakePlate('radial', floorStops(p.tones), 512, 256, { cx, cy, rx: 0.5, ry: 0.5 });
  return <img src={plate} style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, transform: `scale(${s.scale.toFixed(4)})`, transformOrigin: `${cx * 100}% ${cy * 100}%`, opacity: s.opacity, mixBlendMode: 'screen', pointerEvents: 'none' }} />;
};

// ---------------------------------------------------------------------------------------------------- shadow
export type ColourShadowProps = { lift: number; angle?: number; tint?: string; contact?: number; cast?: number };

/** Shadow geometry for a lift (px above the ground at 1080p): cast offset, the far-blur share and the contact opacity. Pure. */
export const shadowState = (lift: number, p: Pick<ColourShadowProps, 'angle' | 'contact' | 'cast'>, u = 1) => {
  const a = (((p.angle ?? 90) * Math.PI) / 180);
  const d = (GLOW.shadow.reach * lift + 6) * u;
  const far = clamp(lift / 80);
  return { dx: d * Math.cos(a), dy: d * Math.sin(a), far, contact: (p.contact ?? GLOW.shadow.contact) * (1 - clamp(lift / 30)), cast: (p.cast ?? GLOW.shadow.cast) * (1 - 0.35 * far) };
};

export const ColourShadow: React.FC<ColourShadowProps & { children: React.ReactNode }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const uid = useId().replace(/[:]/g, '');
  const s = shadowState(p.lift, p, u);
  const tint = p.tint ?? mixColor(C.accent, C.ink, 0.5); // the accent's deep shade
  const sh = (id: string, color: string, blur: number) => (
    <filter id={`cs${uid}${id}`} colorInterpolationFilters="sRGB" x="-30%" y="-30%" width="160%" height="160%">
      <feFlood floodColor={color} />
      <feComposite in2="SourceAlpha" operator="in" />
      <feGaussianBlur stdDeviation={blur * u} />
    </filter>
  );
  const copy = (id: string, opacity: number, dx: number, dy: number) =>
    opacity > 0.002 ? (
      <div key={id} style={{ position: 'absolute', inset: 0, filter: `url(#cs${uid}${id})`, opacity, transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)` }}>
        {p.children}
      </div>
    ) : null;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {sh('c', MASK, 3)}
          {sh('n', tint, GLOW.shadow.near)}
          {sh('f', tint, GLOW.shadow.far)}
        </defs>
      </svg>
      {copy('f', s.cast * s.far, s.dx, s.dy)}
      {copy('n', s.cast * (1 - s.far), s.dx, s.dy)}
      {copy('c', s.contact, 0, 2 * u)}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(-p.lift * u).toFixed(2)}px)` }}>{p.children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- light front
export type LightFrontProps = { at: number; cx: number; cy: number; dur60?: number; band?: number; stops?: (Stop | string)[]; ease?: Ease };

/** The front's radius at frame f (0 -> the farthest corner plus the band) and the band width, px. Pure. */
export const lightFrontState = (f: number, p: LightFrontProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const W = film.width ?? 1920;
  const H = film.height ?? 1080;
  const far = Math.max(Math.hypot(p.cx, p.cy), Math.hypot(W - p.cx, p.cy), Math.hypot(p.cx, H - p.cy), Math.hypot(W - p.cx, H - p.cy));
  const band = (p.band ?? GLOW.front.band) * uOf(film);
  const t = clamp((f - p.at) / f60x(p.dur60 ?? GLOW.front.dur60, fps));
  return { R: (far + band) * (p.ease ?? E.stdInOut)(t), band, t };
};

const ringLuts = new Map<string, [number, number, number, number][]>();
/** The band as RGBA bytes (W x H at `res`): behind the front at distance d, the stops at u = d / band, dithered. Pure. */
export const ringPixels = (W: number, H: number, cx: number, cy: number, R: number, band: number, stops: readonly (Stop | string)[]) => {
  const key = JSON.stringify(stops);
  let lut = ringLuts.get(key);
  if (!lut) {
    lut = Array.from({ length: 256 }, (_, i) => plateAt(stops, i / 255));
    ringLuts.set(key, lut);
  }
  const px = new Uint8ClampedArray(W * H * 4);
  const y0 = Math.max(0, Math.floor(cy - R));
  const y1 = Math.min(H, Math.ceil(cy + R));
  const x0 = Math.max(0, Math.floor(cx - R));
  const x1 = Math.min(W, Math.ceil(cx + R));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const d = R - Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < 0 || d > band) continue;
      const c = lut[Math.round((d / band) * 255)];
      const edge = clamp(d); // 1 px anti-alias at the front
      const k = (y * W + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        const v = (ch === 3 ? c[3] * edge : c[ch]) * 255 + hash01(x, y, ch) - 0.5;
        px[k + ch] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  return px;
};

export const LightFront: React.FC<LightFrontProps & { frame: number; children: React.ReactNode; res?: number }> = (p) => {
  const film = useFilm();
  const ref = useRef<HTMLCanvasElement>(null);
  const s = lightFrontState(p.frame, p, film);
  const res = p.res ?? 0.5;
  const W = Math.round(film.width * res);
  const H = Math.round(film.height * res);
  const stops = p.stops ?? [
    { at: 0, color: '#FFFFFF', alpha: 1 },
    { at: 0.3, color: C.accentLift, alpha: 0.85 },
    { at: 0.65, color: C.accent, alpha: 0.35 },
    { at: 1, color: C.accent, alpha: 0 },
  ];
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    img.data.set(ringPixels(W, H, p.cx * res, p.cy * res, s.R * res, s.band * res, stops));
    ctx.putImageData(img, 0, 0);
  });
  if (s.t <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: s.t >= 1 ? undefined : `circle(${s.R.toFixed(2)}px at ${p.cx}px ${p.cy}px)` }}>{p.children}</div>
      {s.t < 1 ? <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, mixBlendMode: 'screen' }} /> : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- streaks
/** Hard conic stops with black gaps (shares of the turn). Pure. */
export const streakStops = (streaks: { from: number; to: number; color: string }[]): Stop[] => {
  const s: Stop[] = [{ at: 0, color: MASK }];
  for (const k of streaks) s.push({ at: k.from, color: MASK }, { at: k.from + 0.004, color: k.color }, { at: k.to - 0.004, color: k.color }, { at: k.to, color: MASK });
  s.push({ at: 1, color: MASK });
  return s;
};
// cinetic:device-palette the streaks' cool run: lift, white, cyan and deep teal between the black gaps
export const STREAKS_COOL = streakStops([
  { from: 0.0, to: 0.06, color: '#77D59E' },
  { from: 0.1, to: 0.18, color: '#F4FBFA' },
  { from: 0.24, to: 0.33, color: '#2DB4D6' },
  { from: 0.4, to: 0.52, color: '#0E5C4A' },
  { from: 0.6, to: 0.66, color: '#9FE3D6' },
  { from: 0.73, to: 0.82, color: '#F4FBFA' },
  { from: 0.88, to: 0.95, color: '#11A39A' },
]);

export type RadialStreaksProps = { cx: number; cy: number; size?: number; stops?: Stop[]; inner?: number; drift?: number; angle?: number; opacity?: number };

/** The streak plate's scale at frame f (drifting outward `drift` a second). Pure. */
export const streaksScale = (f: number, p: Pick<RadialStreaksProps, 'drift'>, film: Partial<FilmCtx>) => 1 + (p.drift ?? GLOW.streaks.drift) * (f / fpsOf(film));

export const RadialStreaks: React.FC<RadialStreaksProps & { frame: number }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const S = p.size ?? Math.hypot(film.width, film.height) * 1.1;
  const plate = bakePlate('conic', p.stops ?? STREAKS_COOL, 768, 768, { angle: p.angle ?? -90 });
  const inner = p.inner ?? GLOW.streaks.inner;
  const mask = bakePlate('radial', [{ at: 0, color: MASK, alpha: 0 }, { at: inner, color: MASK, alpha: 0 }, { at: inner * 1.7, color: MASK, alpha: 1 }, { at: 1, color: MASK, alpha: 0.6 }], 256, 256);
  const sc = streaksScale(p.frame, p, film);
  return (
    <div style={{ position: 'absolute', left: p.cx - S / 2, top: p.cy - S / 2, width: S, height: S, WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', transform: `scale(${sc.toFixed(5)})`, opacity: p.opacity ?? 1, mixBlendMode: 'screen', pointerEvents: 'none' }}>
      <img src={plate} style={{ position: 'absolute', inset: 0, width: S, height: S, filter: `blur(${GLOW.streaks.blur * u}px)` }} />
    </div>
  );
};

/** Glows are continuous: nothing steps or flashes. */
export const declares = (_p?: unknown, _film?: Partial<FilmCtx>): Declares => NONE;
