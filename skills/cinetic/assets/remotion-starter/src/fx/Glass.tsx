import React, { useId } from 'react';
import { C, MASK } from '../brand/tokens';
import { clamp, E } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { bakeGrain, bakePixels, bakePlate } from './Gradients';
import { hash01 } from './plates';

/**
 * Glass: a material faked in 2D, deterministic and cheap. CSS cannot sample what is behind a shape, so Glass
 * takes the layer behind as `backdrop` (a full-frame node, drawn by the caller underneath too) and draws an
 * altered copy of it inside the shape; filters are fixed per mode, only clip paths, transforms and opacity move.
 * The copies sit in [data-audit-copy]: the layout audit measures the backdrop's text where it is drawn underneath.
 *
 *   frost      a copy at one blur level (22 px at 1080p), brightened and a little more saturated, a 14 % white
 *              veil, a fine grain, a 1.5 px light top edge and a soft inner shadow at the bottom; the panel
 *              rises 30 f on E.glideOut while the copy stays put, so the frost shows what is behind it now
 *   refract    dark glass: the backdrop magnified 1.15 about the centre, blurred 3 px, at 25 % brightness, its
 *              red and blue copies scaled apart (a radial colour split on bright lines), a caustic in the
 *              accent on the far side and a rim; clear for 6 f, half 2 f later, nearly opaque 10 f after that
 *   flute      reeded glass: one strip per reed (46 px), each a copy squeezed about its own centre and shifted
 *              sideways, with a baked shading plate per reed; `level` 1 -> 0 over 28 f clears the reeds into
 *              the plain picture with no seam (the strips meet exactly at level 0)
 *   thin-film  a soap-bubble dome: the backdrop scaled 1.03 and desaturated inside, concentric thin-film bands
 *              computed from interference (thickness 0.2-1.3 um, thinner at the crown) strongest at the rim,
 *              turning 1.5 deg/s, a white fresnel rim and a window highlight
 *
 * Pure state: glassState(f) gives the level and the refract clarity; fluteStrip() the reed transforms;
 * thinFilmColour() the band colour for a thickness. Glass declares nothing.
 */

export const GLASS = {
  frost: { blur: 22, veil: 0.14, rise: 40, dur60: 30, grain: 5 },
  refract: { magnify: 1.15, blur: 3, dim: 0.25, split: 0.012, clear60: 6, half60: 2, opaque60: 10 },
  flute: { stripe: 46, squeeze: 0.55, shift: 0.4, dur60: 28 },
  film: { scale: 1.03, drift: 1.5, strength: 0.85 },
} as const;

export type GlassMode = 'frost' | 'refract' | 'flute' | 'thin-film';
export type GlassProps = {
  mode: GlassMode;
  x: number; // the shape's box, px in the full frame
  y: number;
  w: number;
  h: number;
  r?: number; // corner radius (a circle when `circle`)
  circle?: boolean;
  at?: number; // frost: rise start; refract: fly-in start (clear from here); flute: clearing start; thin-film: fade-in start
  dur60?: number;
  reverse?: boolean; // flute: slice in instead of clearing
  blur?: number; // frost blur, px at 1080p
  magnify?: number;
  dim?: number;
  caustic?: string; // refract: caustic colour (the accent)
  fill?: string; // refract: the opaque body colour
  stripe?: number; // flute: reed width, px at 1080p
  squeeze?: number; // flute: how much each reed's copy narrows at level 1 (default 0.55); over type lower it (and shift) until no letter reads twice
  shift?: number; // flute: each copy's sideways shift at level 1, a share of the reed (default 0.4)
  tint?: string; // frost veil colour
};

/** The material's level at frame f (0..1) and, for refract, the share of the backdrop still seen through. Pure. */
export const glassState = (f: number, p: Pick<GlassProps, 'mode' | 'at' | 'dur60' | 'reverse'>, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const at = p.at;
  if (p.mode === 'frost' || p.mode === 'thin-film') {
    const level = at === undefined ? 1 : E.glideOut(clamp((f - at) / f60x(p.dur60 ?? GLASS.frost.dur60, fps)));
    return { level, clear: 0 };
  }
  if (p.mode === 'flute') {
    if (at === undefined) return { level: 1, clear: 0 };
    const t = E.settleOut(clamp((f - at) / f60x(p.dur60 ?? GLASS.flute.dur60, fps)));
    return { level: p.reverse ? t : 1 - t, clear: 0 };
  }
  // refract: clear 6 f, half by 2 f more, nearly opaque (5 %) 10 f after that
  if (at === undefined) return { level: 1, clear: 0 };
  const R = GLASS.refract;
  const a = at + f60x(R.clear60, fps);
  const b = a + f60x(R.half60, fps);
  const c = b + f60x(R.opaque60, fps);
  const clear = f < a ? 1 : f < b ? 1 - 0.5 * E.linear((f - a) / (b - a)) : f < c ? 0.5 - 0.45 * E.settleOut((f - b) / (c - b)) : 0.05;
  return { level: f < at ? 0 : 1, clear };
};

/** Reed i of a flute run at `level`: its strip box (px from the shape's left) and the copy's squeeze and shift. Pure. */
export const fluteStrip = (i: number, level: number, stripe: number, squeeze: number = GLASS.flute.squeeze, shift: number = GLASS.flute.shift) => ({
  x0: i * stripe,
  x1: (i + 1) * stripe,
  scaleX: 1 - squeeze * level,
  shift: (i % 2 ? -1 : 1) * shift * stripe * level * (0.6 + 0.4 * hash01(i, 3, 11)),
});

/** Thin-film interference colour (gamma sRGB 0..1) for a film `d` nm thick, index 1.33, seen near normal. Pure. */
export const thinFilmColour = (d: number, n = 1.33): [number, number, number] => {
  const I = [620, 540, 460].map((l) => Math.sin((2 * Math.PI * n * d) / l) ** 2);
  return I.map((v) => 0.3 + 0.7 * v) as [number, number, number];
};

/** Film thickness (nm) at radius share rho of the dome, dy the vertical share (-1 top .. 1 bottom): thin at the crown, thick at the rim and the bottom. Pure. */
export const filmThickness = (rho: number, dy = 0) => 220 + 900 * (1 - Math.sqrt(Math.max(0, 1 - rho * rho))) + 200 * (dy + 1) * 0.5;

/** The dome's band plate (2R x 2R RGBA): thickness from the rim to the crown plus a gravity term, alpha strongest at the rim. Pure. */
export const thinFilmPixels = (R: number, strength: number = GLASS.film.strength) => {
  const S = 2 * R;
  const px = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - R) / R;
      const dy = (y + 0.5 - R) / R;
      const rho = Math.hypot(dx, dy);
      if (rho >= 1) continue;
      const d = filmThickness(rho, dy);
      const c = thinFilmColour(d);
      const a = strength * (0.12 + 0.88 * rho ** 3) * clamp((1 - rho) * R);
      const k = (y * S + x) * 4;
      for (let ch = 0; ch < 3; ch++) px[k + ch] = Math.max(0, Math.min(255, Math.round(c[ch] * 255 + hash01(x, y, ch) + hash01(x + 31, y + 7, ch + 5) - 1)));
      px[k + 3] = Math.max(0, Math.min(255, Math.round(a * 255 + hash01(x, y, 9) - 0.5)));
    }
  return px;
};

const KEEP = (c: 0 | 1 | 2, k: number) => {
  const m = Array(20).fill(0);
  m[c * 6] = k;
  m[18] = 1;
  return m.join(' ');
};

/** Draws the material over the shape (and `children` on top of it, inside the box). */
export const Glass: React.FC<GlassProps & { frame: number; backdrop: React.ReactNode; children?: React.ReactNode }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const uid = useId().replace(/[:]/g, '');
  const W = film.width;
  const H = film.height;
  const s = glassState(p.frame, p, film);
  const rise = p.mode === 'frost' ? (1 - s.level) * GLASS.frost.rise * u : 0;
  const y = p.y + rise;
  const r = p.circle ? Math.min(p.w, p.h) / 2 : (p.r ?? 24 * u);
  const cx = p.x + p.w / 2;
  const cy = y + p.h / 2;
  const clip = p.circle ? `circle(${r}px at ${cx}px ${cy}px)` : `inset(${y}px ${W - p.x - p.w}px ${H - y - p.h}px ${p.x}px round ${r}px)`;
  const box: React.CSSProperties = { position: 'absolute', left: p.x, top: y, width: p.w, height: p.h, borderRadius: r };
  const full: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  const layers: React.ReactNode[] = [];
  if (p.mode === 'frost') {
    const veil = p.tint ?? `rgba(255,255,255,${GLASS.frost.veil})`;
    layers.push(
      <div key="sh" style={{ ...box, boxShadow: `0 ${18 * u}px ${54 * u}px rgba(0,0,0,0.26), 0 ${2 * u}px ${6 * u}px rgba(0,0,0,0.12)` }} />,
      <div key="cp" data-audit-copy style={{ ...full, clipPath: clip }}>
        <div style={{ ...full, filter: `blur(${(p.blur ?? GLASS.frost.blur) * u}px) saturate(1.15) brightness(1.06)` }}>{p.backdrop}</div>
      </div>,
      <div key="vl" style={{ ...box, background: veil }} />,
      <div key="gr" style={{ ...box, backgroundImage: `url(${bakeGrain(128, GLASS.frost.grain, 3)})`, mixBlendMode: 'overlay', opacity: 0.6 }} />,
      <div key="rm" style={{ ...box, boxShadow: `inset 0 ${1.5 * u}px 0 rgba(255,255,255,0.55), inset 0 0 0 ${1 * u}px rgba(255,255,255,0.16), inset 0 ${-14 * u}px ${28 * u}px rgba(0,0,0,0.10)` }} />,
    );
  } else if (p.mode === 'refract') {
    const R = GLASS.refract;
    const mg = p.magnify ?? R.magnify;
    const dim = p.dim ?? R.dim;
    const origin = `${cx}px ${cy}px`;
    const copy = (c: 0 | 1 | 2, sc: number) => (
      <div key={`c${c}`} style={{ ...full, transform: `scale(${sc.toFixed(5)})`, transformOrigin: origin, filter: `url(#gl${uid}${c}) blur(${R.blur * u}px)`, mixBlendMode: c ? 'screen' : 'normal' }}>
        {p.backdrop}
      </div>
    );
    const caustic = bakePlate('radial', [{ at: 0, color: '#FFFFFF', alpha: 0.95 }, { at: 0.18, color: p.caustic ?? C.accentLift, alpha: 0.8 }, { at: 1, color: p.caustic ?? C.accent, alpha: 0 }], 160, 160);
    const spec = bakePlate('radial', [{ at: 0, color: '#FFFFFF', alpha: 0.85 }, { at: 1, color: '#FFFFFF', alpha: 0 }], 96, 64);
    layers.push(
      <svg key="defs" width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {([0, 1, 2] as const).map((c) => (
            <filter key={c} id={`gl${uid}${c}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={KEEP(c, dim)} />
            </filter>
          ))}
        </defs>
      </svg>,
      <div key="body" data-audit-copy style={{ ...full, clipPath: clip, opacity: s.level }}>
        <div style={{ ...full, background: p.fill ?? C.ink }} />
        <div style={{ ...full, background: MASK, opacity: s.clear, isolation: 'isolate' }}>
          {copy(0, mg * (1 - R.split))}
          {copy(1, mg)}
          {copy(2, mg * (1 + R.split))}
        </div>
        <img src={caustic} style={{ position: 'absolute', left: cx - 0.2 * p.w, top: cy + 0.05 * p.h, width: 0.75 * p.w, height: 0.5 * p.h, mixBlendMode: 'screen', opacity: 0.8 }} />
        <img src={spec} style={{ position: 'absolute', left: p.x + 0.18 * p.w, top: y + 0.1 * p.h, width: 0.34 * p.w, height: 0.2 * p.h, transform: 'rotate(-28deg)', mixBlendMode: 'screen', opacity: 0.7 }} />
      </div>,
      <div key="rim" style={{ ...box, opacity: s.level, boxShadow: `inset 0 0 0 ${1.2 * u}px rgba(255,255,255,0.30), inset ${-6 * u}px ${-10 * u}px ${24 * u}px rgba(0,0,0,0.45)` }} />,
    );
  } else if (p.mode === 'flute') {
    const st = (p.stripe ?? GLASS.flute.stripe) * u;
    const n = Math.ceil(p.w / st);
    const shade = bakePlate(
      'linear',
      [
        { at: 0, color: MASK, alpha: 0.28 },
        { at: 0.3, color: '#FFFFFF', alpha: 0.14 },
        { at: 0.55, color: '#FFFFFF', alpha: 0 },
        { at: 1, color: MASK, alpha: 0.22 },
      ],
      Math.round(st),
      8,
    );
    const strips = Array.from({ length: n }, (_, i) => {
      const fs = fluteStrip(i, s.level, st, p.squeeze, p.shift);
      const sx = p.x + fs.x0;
      const right = Math.max(0, W - Math.min(p.x + p.w, p.x + fs.x1));
      return (
        <div key={i} style={{ ...full, clipPath: `inset(${y}px ${right}px ${H - y - p.h}px ${sx}px)` }}>
          <div style={{ ...full, transform: `translateX(${fs.shift.toFixed(2)}px) scaleX(${fs.scaleX.toFixed(4)})`, transformOrigin: `${sx + st / 2}px ${cy}px` }}>{p.backdrop}</div>
        </div>
      );
    });
    layers.push(
      <div key="st" data-audit-copy style={{ ...full, clipPath: clip }}>
        {strips}
      </div>,
      <div key="sh" style={{ ...box, backgroundImage: `url(${shade})`, backgroundSize: `${st}px 100%`, opacity: 0.9 * s.level }} />,
    );
  } else {
    const R = Math.round(r);
    const plate = bakePixels(`thinfilm|${R}`, 2 * R, 2 * R, () => thinFilmPixels(R));
    const rot = (GLASS.film.drift * p.frame) / film.fps;
    const hl = bakePlate('radial', [{ at: 0, color: '#FFFFFF', alpha: 0.9 }, { at: 0.6, color: '#FFFFFF', alpha: 0.35 }, { at: 1, color: '#FFFFFF', alpha: 0 }], 120, 60);
    layers.push(
      <div key="cp" data-audit-copy style={{ ...full, clipPath: clip, opacity: s.level }}>
        <div style={{ ...full, transform: `scale(${GLASS.film.scale})`, transformOrigin: `${cx}px ${cy}px`, filter: 'saturate(0.7) brightness(1.05)' }}>{p.backdrop}</div>
        <img src={plate} style={{ position: 'absolute', left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, transform: `rotate(${rot.toFixed(3)}deg)`, mixBlendMode: 'screen' }} />
        <img src={hl} style={{ position: 'absolute', left: cx - 0.62 * R, top: cy - 0.78 * R, width: 0.62 * R, height: 0.3 * R, transform: 'rotate(-32deg)', opacity: 0.75 }} />
      </div>,
      <div key="rim" style={{ ...box, borderRadius: '50%', opacity: s.level, boxShadow: `inset 0 0 0 ${1.5 * u}px rgba(255,255,255,0.55), inset 0 0 ${22 * u}px rgba(255,255,255,0.28)` }} />,
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: p.mode === 'frost' ? s.level : 1 }}>
      {layers}
      {p.children ? <div style={{ ...box, overflow: 'hidden', opacity: p.mode === 'refract' ? s.level : 1 }}>{p.children}</div> : null}
    </div>
  );
};

/** Glass is a material: nothing steps or flashes. */
export const declares = (_p?: Partial<GlassProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
