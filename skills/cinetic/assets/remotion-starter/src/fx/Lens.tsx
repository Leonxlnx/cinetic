import React, { useId } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, lmix, SPR, spr } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Lens: a loupe over a picture. A round window shows the same picture magnified about the lens's own
 * centre, so whatever sits under the glass grows in place (a true magnifier, not a second picture laid
 * on top): the viewer sees detail the full frame cannot hold (brush strokes, the foam on a wave, the
 * texture of a material, a figure in a crowd). The lens springs open on a point, glides between stops
 * (each move on strongInOut, closed form, holding at every stop), and can fly home: its last stop
 * shrinks it to the size of a letter's counter or a dot in the layout and it stays a live window there
 * (the o of the name keeps showing the picture).
 *
 * Stops: [{ at, x, y, r?, zoom?, move? }] in frame px; `at` is the frame the lens ARRIVES, the move takes
 * the `move` frames before it (house 40 f at 60 fps). Radius and magnification travel with the move
 * (zoom in log space). The picture is any full-frame layer (a Photo, Footage, a whole scene) and is drawn
 * twice: under the lens (unless `base` is false: the picture is drawn elsewhere) and magnified inside it.
 * Glass: a hairline rim (paper, 2 px at 1080p), a thin shade inside the rim (the glass edge, a static
 * radial gradient), and a soft shadow on the picture thrown away from the key (azimuth 315: shadows to
 * the bottom right), one fixed blur. Nothing animates a filter; the lens moves by transform only.
 * House: r 150 px at 1080p (14 % of the frame height), zoom 2.2 (1.8-3.0: more reads as a cut), open on
 * SPR.landing (one true landing: the only overshoot), stops 0.8-1.4 s apart on the music's beats, a
 * home stop at the size of the counter it becomes. Resolution: the glass shows the picture at zoom x its
 * frame scale, so a 2.2x lens over a full-frame still wants an original of about 2.2 x 1920 = 4200 px
 * wide (museum and orbital originals have it); a 2400 px file reads soft under the glass.
 */
export type LensStop = { at: number; x: number; y: number; r?: number; zoom?: number; move?: number; ease?: Ease };
export type LensProps = {
  frame: number;
  picture: React.ReactNode;
  stops: LensStop[];
  open: number; // the frame the lens starts to open (at the first stop's place)
  close?: number; // the frame it starts to close (shrinks to nothing on softIn over 16 f at 60 fps)
  r?: number; // default radius (frame px)
  zoom?: number; // default magnification
  base?: boolean; // draw the picture under the lens too (default true)
  rim?: { color?: string; width?: number; alpha?: number } | false;
  shade?: number; // the glass edge's strength (0..1, house 0.28)
  shadow?: { alpha?: number; blur?: number; dist?: number } | false;
  azimuth?: number; // the key's azimuth (degrees, 0 = top, clockwise; house 315)
  style?: React.CSSProperties;
  id?: string;
};

const inkA = (a: number) => { const n = parseInt(C.ink.replace('#', ''), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(a).toFixed(3)})`; };

export const LENS_HOUSE = { r: 150, zoom: 2.2, move60: 40, close60: 16, rim: { width: 2, alpha: 0.9 }, shade: 0.28, shadow: { alpha: 0.32, blur: 18, dist: 14 }, azimuth: 315 } as const;

export type LensState = { x: number; y: number; r: number; zoom: number; open: number; visible: boolean; stop: number; moving: boolean };

/**
 * The lens at frame f: centre (frame px), the radius as drawn (the stop radius times the open/close
 * scale), the magnification, the open scale (0..~1.1 on the landing spring, then 1), which stop it is at
 * or heading to, and whether it is travelling. Pure, closed form.
 */
export const lensState = (f: number, p: Omit<LensProps, 'frame' | 'picture'>, film?: Partial<FilmCtx>): LensState => {
  const fps = fpsOf(film);
  const { height: H } = sizeOf(film);
  const k = H / 1080;
  const r0 = p.r ?? LENS_HOUSE.r * k;
  const z0 = p.zoom ?? LENS_HOUSE.zoom;
  const stops = [...p.stops].sort((a, b) => a.at - b.at);
  if (!stops.length) return { x: 0, y: 0, r: 0, zoom: 1, open: 0, visible: false, stop: 0, moving: false };
  const R = (s: LensStop) => s.r ?? r0;
  const Z = (s: LensStop) => Math.max(1, s.zoom ?? z0);
  let x = stops[0].x;
  let y = stops[0].y;
  let r = R(stops[0]);
  let zoom = Z(stops[0]);
  let stop = 0;
  let moving = false;
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i];
    const dur = s.move ?? f60x(LENS_HOUSE.move60, fps);
    const t0 = s.at - dur;
    if (f <= t0) break;
    const a = stops[i - 1];
    const e = (s.ease ?? E.strongInOut)(clamp((f - t0) / Math.max(1e-6, dur)));
    x = a.x + (s.x - a.x) * e;
    y = a.y + (s.y - a.y) * e;
    r = R(a) + (R(s) - R(a)) * e;
    zoom = lmix(Z(a), Z(s), e);
    stop = i;
    moving = f < s.at;
  }
  const opened = f < p.open ? 0 : spr(f, p.open, SPR.landing, fps);
  const closeDur = f60x(LENS_HOUSE.close60, fps);
  const closing = p.close !== undefined && f > p.close ? 1 - E.softIn(clamp((f - p.close) / Math.max(1e-6, closeDur))) : 1;
  const open = Math.max(0, opened * closing);
  return { x, y, r: r * open, zoom, open, visible: open > 0.002, stop, moving };
};

/** Where a picture point (frame px, unmagnified) appears inside the lens, or null when it is outside the glass. */
export const lensPoint = (s: LensState, pt: [number, number]) => {
  const x = s.x + (pt[0] - s.x) * s.zoom;
  const y = s.y + (pt[1] - s.y) * s.zoom;
  return Math.hypot(x - s.x, y - s.y) <= s.r ? { x, y } : null;
};

export const Lens: React.FC<LensProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const k = H / 1080;
  const uid = useId().replace(/:/g, '');
  const id = `lens-${p.id ?? uid}`;
  const s = lensState(p.frame, p, film);
  const rim = p.rim === false ? null : { color: C.paper, ...LENS_HOUSE.rim, ...(p.rim ?? {}) };
  const sh = p.shadow === false ? null : { ...LENS_HOUSE.shadow, ...(p.shadow ?? {}) };
  const az = (((p.azimuth ?? LENS_HOUSE.azimuth) * Math.PI) / 180);
  const dist = (sh?.dist ?? 0) * k * s.open;
  const sx = -Math.sin(az) * dist;
  const sy = Math.cos(az) * dist;
  const shade = clamp(p.shade ?? LENS_HOUSE.shade);
  const mag = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) scale(${s.zoom.toFixed(5)}) translate(${(-s.x).toFixed(2)}px, ${(-s.y).toFixed(2)}px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...p.style }}>
      {p.base !== false && <div style={{ position: 'absolute', inset: 0 }}>{p.picture}</div>}
      {s.visible && (
        <>
          {sh && (
            <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden>
              <defs>
                <filter id={`${id}-s`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation={sh.blur * k} />
                </filter>
              </defs>
              <circle cx={s.x + sx} cy={s.y + sy} r={s.r} fill={C.ink} opacity={sh.alpha} filter={`url(#${id}-s)`} />
            </svg>
          )}
          <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${s.r.toFixed(2)}px at ${s.x.toFixed(2)}px ${s.y.toFixed(2)}px)` }}>
            <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: mag }}>{p.picture}</div>
            {shade > 0 && (
              <div style={{ position: 'absolute', left: s.x - s.r, top: s.y - s.r, width: 2 * s.r, height: 2 * s.r, borderRadius: '50%',
                background: `radial-gradient(circle at 50% 50%, ${inkA(0)} 72%, ${inkA(shade * 0.55)} 92%, ${inkA(shade)} 100%)` }} />
            )}
          </div>
          {rim && (
            <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden>
              <circle cx={s.x} cy={s.y} r={Math.max(0, s.r - (rim.width * k) / 2)} fill="none" stroke={rim.color} strokeOpacity={rim.alpha} strokeWidth={rim.width * k} />
            </svg>
          )}
        </>
      )}
    </div>
  );
};

/** A lens moves continuously: nothing stepped, no seams of its own. */
export const declares = (_p?: Partial<LensProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
