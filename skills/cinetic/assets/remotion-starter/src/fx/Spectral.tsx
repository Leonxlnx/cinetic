import React, { useId } from 'react';
import { MASK } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { bakePlate } from './Gradients';
import { COOL_SPECTRUM, type Stop } from './plates';

/**
 * Spectral: rainbow and iridescent accents, each one a film's single dominant accent (the default run is the
 * cool side of the wheel; a brand passes plates.ts FULL_SPECTRUM for a full rainbow).
 *
 *   SpectralRim    a thin prism rim on a rounded shape: a baked, dithered conic spectrum turned by transform
 *                  (24 deg/s, or locked to the shape's own rotation) and masked to a ring 2 px wide, with a
 *                  wider blurred copy behind it as the light it throws
 *   Foil           holographic foil on a squircle icon: one conic foil plate turned to the icon's own angle, a
 *                  sheen band that slides as it turns, an inner frosted tile for the glyph; `develop` takes it
 *                  from pale grey to full colour in 28 f
 *   Disperse       a white mark splits into n hue copies fanned along an angle (6 f out on E.snapOut), then
 *                  recombines (20 f on E.settleOut): the copies' tints sum to white, so at rest it is the mark
 *   SpectralSweep  a narrow spectral band crosses a card or button once (40 f, E.stdInOut) in screen blend and
 *                  leaves it as it was
 *
 * Pure state: rimState(), foilState(), disperseState() (with the copy tints), sweepState(). Nothing steps.
 */

export const SPECTRAL = {
  rim: { width: 2, spin: 24, glow: 0.5, glowBlur: 10 },
  foil: { radius: 0.27, tile: 0.56, develop60: 28 },
  disperse: { n: 6, spread: 28, out60: 6, hold60: 2, back60: 20 },
  sweep: { dur60: 40, width: 0.32, angle: 18 },
} as const;

// cinetic:device-palette pastel foil hues on the cool side, a spectral run
/** Pastel foil hues on the cool side (a brand may pass its own; the ring closes on its first colour). */
export const FOIL_COOL = ['#2FA39A', '#9FE3D6', '#D5ECFF', '#E6F7C8', '#B8EBD7', '#2FA39A'] as const;

/** A closed ring of stops from a hue run (first colour repeated at the end), for conic plates. Pure. */
export const ringStops = (hues: readonly string[]): string[] => (hues[0] === hues[hues.length - 1] ? [...hues] : [...hues, hues[0]]);

// ---------------------------------------------------------------------------------------------------- rim
export type SpectralRimProps = { x: number; y: number; w: number; h: number; r?: number; width?: number; hues?: readonly string[]; angle?: number; spin?: number; at?: number; dur60?: number; glow?: number };

/** The rim's angle (deg) and level at frame f. `angle` alone locks the dispersion to a shape's rotation. Pure. */
export const rimState = (f: number, p: Pick<SpectralRimProps, 'angle' | 'spin' | 'at' | 'dur60'>, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const t0 = p.at ?? 0;
  const angle = (p.angle ?? 0) + ((p.spin ?? SPECTRAL.rim.spin) * (f - t0)) / fps;
  const level = p.at === undefined ? 1 : E.softOut(clamp((f - p.at) / f60x(p.dur60 ?? 34, fps)));
  return { angle, level };
};

const ring = (pad: number): React.CSSProperties => ({
  padding: pad,
  boxSizing: 'border-box',
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  maskComposite: 'exclude',
});

export const SpectralRim: React.FC<SpectralRimProps & { frame: number }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const s = rimState(p.frame, p, film);
  const r = p.r ?? 24 * u;
  const D = Math.ceil(Math.hypot(p.w, p.h)) + 8;
  const plate = bakePlate('conic', ringStops(p.hues ?? COOL_SPECTRUM), 384, 384);
  const box: React.CSSProperties = { position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: r, overflow: 'hidden' };
  const img = <img src={plate} style={{ position: 'absolute', left: p.w / 2 - D / 2, top: p.h / 2 - D / 2, width: D, height: D, transform: `rotate(${s.angle.toFixed(3)}deg)` }} />;
  const wpx = (p.width ?? SPECTRAL.rim.width) * u;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${SPECTRAL.rim.glowBlur * u}px)`, opacity: (p.glow ?? SPECTRAL.rim.glow) * s.level, mixBlendMode: 'screen' }}>
        <div style={{ ...box, ...ring(wpx * 4) }}>{img}</div>
      </div>
      <div style={{ ...box, ...ring(wpx), opacity: s.level }}>{img}</div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------------- foil
export type FoilProps = { x: number; y: number; size: number; angle: number; hues?: readonly string[]; radius?: number; tile?: number | false; develop?: { at: number; dur60?: number } };

/** Foil develop level (0 pale grey .. 1 full colour) and the sheen offset (share of the size) for an icon angle. Pure. */
export const foilState = (f: number, p: Pick<FoilProps, 'angle' | 'develop'>, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const develop = p.develop ? E.settleOut(clamp((f - p.develop.at) / f60x(p.develop.dur60 ?? SPECTRAL.foil.develop60, fps))) : 1;
  const sheen = 0.5 * Math.sin((p.angle * Math.PI) / 180);
  return { develop, sheen };
};

export const Foil: React.FC<FoilProps & { frame: number; children?: React.ReactNode }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const s = foilState(p.frame, p, film);
  const S = p.size;
  const rad = (p.radius ?? SPECTRAL.foil.radius) * S;
  const plate = bakePlate('conic', ringStops(p.hues ?? FOIL_COOL), 320, 320, { angle: 0 });
  const sheen = bakePlate('linear', [{ at: 0, color: '#FFFFFF', alpha: 0 }, { at: 0.5, color: '#FFFFFF', alpha: 0.55 }, { at: 1, color: '#FFFFFF', alpha: 0 }], 160, 8);
  const shade = bakePlate('radial', [{ at: 0, color: MASK, alpha: 0 }, { at: 0.75, color: MASK, alpha: 0.05 }, { at: 1.05, color: MASK, alpha: 0.22 }], 160, 160);
  const D = S * 1.6;
  const foil = (key: string, grey: boolean, opacity: number) => (
    <img key={key} src={plate} style={{ position: 'absolute', left: (S - D) / 2, top: (S - D) / 2, width: D, height: D, transform: `rotate(${p.angle.toFixed(3)}deg) scale(1.15, 0.85)`, filter: grey ? 'saturate(0) brightness(1.12)' : undefined, opacity }} />
  );
  const T = (p.tile === false ? 0 : (p.tile ?? SPECTRAL.foil.tile)) * S;
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: S, height: S, borderRadius: rad, overflow: 'hidden', boxShadow: `0 ${10 * u}px ${30 * u}px rgba(0,0,0,0.22), inset 0 0 0 ${1 * u}px rgba(255,255,255,0.45)` }}>
      {foil('c', false, 1)}
      {s.develop < 1 ? foil('g', true, 1 - s.develop) : null}
      <img src={sheen} style={{ position: 'absolute', left: -S * 0.5, top: -S * 0.25, width: S * 2, height: S * 1.5, transform: `translateX(${(s.sheen * S).toFixed(2)}px) rotate(24deg)`, mixBlendMode: 'screen' }} />
      <img src={shade} style={{ position: 'absolute', inset: 0, width: S, height: S, mixBlendMode: 'multiply' }} />
      {T > 0 ? (
        <div style={{ position: 'absolute', left: (S - T) / 2, top: (S - T) / 2, width: T, height: T, borderRadius: T * 0.3, background: 'rgba(255,255,255,0.74)', boxShadow: `inset 0 ${1.5 * u}px 0 rgba(255,255,255,0.9), 0 ${3 * u}px ${10 * u}px rgba(0,0,0,0.10)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {p.children}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- disperse
export type DisperseProps = { at: number; spread?: number; angle?: number; n?: number; out60?: number; hold60?: number; back60?: number };

/** Per-copy tints (r, g, b multipliers) for n copies: smooth spectral bumps whose sum is exactly white. Pure. */
export const disperseTints = (n: number): [number, number, number][] => {
  const s = Array.from({ length: n }, (_, i) => (n > 1 ? i / (n - 1) : 0.5));
  const ch = [0.12, 0.5, 0.88].map((mu) => {
    const raw = s.map((v) => Math.exp(-(((v - mu) / 0.3) ** 2)));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / sum);
  });
  return s.map((_, i) => [ch[0][i], ch[1][i], ch[2][i]]);
};

/** The fan at frame f: k (0 at rest .. 1 fully split) and each copy's offset along the angle, px. Pure. */
export const disperseState = (f: number, p: DisperseProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const D = SPECTRAL.disperse;
  const n = p.n ?? D.n;
  const a = p.at;
  const b = a + f60x(p.out60 ?? D.out60, fps);
  const c = b + f60x(p.hold60 ?? D.hold60, fps);
  const d = c + f60x(p.back60 ?? D.back60, fps);
  const k = f < a ? 0 : f < b ? E.snapOut((f - a) / (b - a)) : f < c ? 1 : f < d ? 1 - E.settleOut((f - c) / (d - c)) : 0;
  const spread = (p.spread ?? D.spread) * uOf(film) * k;
  const offsets = Array.from({ length: n }, (_, i) => (n > 1 ? (i / (n - 1) - 0.5) * spread : 0));
  return { k, offsets };
};

export const Disperse: React.FC<DisperseProps & { frame: number; children: React.ReactNode }> = (p) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const s = disperseState(p.frame, p, film);
  if (s.k < 0.002) return <div style={{ position: 'absolute', inset: 0 }}>{p.children}</div>;
  const n = s.offsets.length;
  const tints = disperseTints(n);
  const a = ((p.angle ?? 0) * Math.PI) / 180;
  return (
    <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {tints.map((t, i) => (
            <filter key={i} id={`ds${uid}${i}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={`${t[0]} 0 0 0 0 0 ${t[1]} 0 0 0 0 0 ${t[2]} 0 0 0 0 0 1 0`} />
            </filter>
          ))}
        </defs>
      </svg>
      {s.offsets.map((o, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, filter: `url(#ds${uid}${i})`, mixBlendMode: 'plus-lighter', transform: `translate(${(o * Math.cos(a)).toFixed(2)}px, ${(o * Math.sin(a)).toFixed(2)}px)` }}>
          {p.children}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- sweep
export type SpectralSweepProps = { x: number; y: number; w: number; h: number; r?: number; at: number; dur60?: number; width?: number; angle?: number; hues?: readonly string[]; ease?: Ease; blend?: React.CSSProperties['mixBlendMode']; opacity?: number };

/** The band centre as a share of the box width (from -width to 1 + width) and whether it is on screen. Pure. */
export const sweepState = (f: number, p: Pick<SpectralSweepProps, 'at' | 'dur60' | 'width' | 'ease'>, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const t = clamp((f - p.at) / f60x(p.dur60 ?? SPECTRAL.sweep.dur60, fps));
  const w = p.width ?? SPECTRAL.sweep.width;
  return { pos: -w + (1 + 2 * w) * (p.ease ?? E.stdInOut)(t), on: t > 0 && t < 1 };
};

export const SpectralSweep: React.FC<SpectralSweepProps & { frame: number }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const s = sweepState(p.frame, p, film);
  if (!s.on) return null;
  const hues = p.hues ?? COOL_SPECTRUM;
  const stops: Stop[] = [{ at: 0, color: hues[0], alpha: 0 }, ...hues.map((c, i) => ({ at: 0.15 + (0.7 * i) / Math.max(1, hues.length - 1), color: c, alpha: 0.85 })), { at: 1, color: hues[hues.length - 1], alpha: 0 }];
  const bw = (p.width ?? SPECTRAL.sweep.width) * p.w;
  const plate = bakePlate('linear', stops, 256, 8);
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: p.r ?? 16 * u, overflow: 'hidden', mixBlendMode: p.blend ?? 'screen', opacity: p.opacity ?? 0.9, pointerEvents: 'none' }}>
      <img src={plate} style={{ position: 'absolute', left: s.pos * p.w - bw / 2, top: -p.h * 0.5, width: bw, height: p.h * 2, transform: `rotate(${p.angle ?? SPECTRAL.sweep.angle}deg)` }} />
    </div>
  );
};

/** Spectral accents are continuous: nothing steps or flashes. */
export const declares = (_p?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
