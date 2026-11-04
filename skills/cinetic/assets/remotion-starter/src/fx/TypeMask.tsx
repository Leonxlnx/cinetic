import React, { useId } from 'react';
import { C, FONT } from '../brand/tokens';
import { clamp, E, type Ease, lmix } from '../lib/anim';
import { type FilmCtx, FilmProvider, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Type as a window: giant letters cut out of a plate, and the picture (a photo, footage, a whole scene)
 * living behind them, moving on its own. Then the camera pushes into one letter's stroke until the
 * stroke is wider than the frame and the picture behind is the world: one continuous move from a word
 * to a place. The fill is any full-frame layer; the plate is an SVG rect masked by the text, so the
 * glyphs stay vector at any scale, and the plate's own shadow falls just inside the letters (it sits
 * above the picture, like a cut sheet).
 *
 * Push: from `start` for `dur` frames the letters scale about `target` (a frame point inside a stroke,
 * found once on a still) from their creep to `to` in log space on `ease` (house E.launchIn: it builds
 * into the opening, so the next shot can carry the speed); the fill scales about the same point to
 * `fillTo` (house 1.18), slower, so the picture reads as further away than the plate. Once the letters
 * reach `openAt` the stroke covers the frame: the plate is dropped and only the fill draws. Before the
 * push the letters creep (house 1.5 %/s) so the word is never static. An `intro` develops the picture
 * inside the letters out of the plate colour (the word reads first as a shallow emboss: the plate's shadow
 * inside the cut), so the film opens on a word that fills with its world instead of a cut to a busy frame.
 * House: letters 80-95 % of the frame width (a heavy weight, 650-800, tight tracking), plate in the
 * film's ground at opacity 1 (0.86-0.94 lets the picture show through faintly), shadow 0.3 at 10 px
 * blur offset (0, 8) at 1080p, push 40-56 f to x36, openAt x18.
 */
export type TypeMaskProps = {
  frame: number;
  text: string;
  fill: React.ReactNode; // the picture behind the letters: laid out in the frame grown by `fillRoom` on every side (a Photo or Footage covers it)
  fillRoom?: number; // px the fill's frame is grown by, so the aim never shows its edge (default: the aim's travel + 8)
  font?: { family?: string; weight?: number; size?: number; tracking?: number }; // size in px at the film's size, tracking in em
  origin?: [number, number]; // the word's centre, frame px (default the frame centre)
  plate?: { color?: string; opacity?: number };
  shadow?: { dx?: number; dy?: number; blur?: number; alpha?: number } | false;
  creep?: number; // letters' scale growth per second before the push (house 0.015)
  intro?: { start?: number; dur?: number; ease?: Ease }; // the picture develops inside the letters out of the plate colour (house 0 .. 36 f at 60 fps, E.softOut): the word is there on frame 0 as an emboss, then fills with the world
  push?: { start: number; dur: number; target: [number, number]; to?: number; fillTo?: number; ease?: Ease; openAt?: number; aim?: boolean }; // aim (default true): the target travels to the frame's centre on the same curve, so the camera flies into the stroke instead of zooming lopsided
  style?: React.CSSProperties;
  id?: string;
};

export const TYPEMASK_HOUSE = { creep: 0.015, to: 36, fillTo: 1.18, openAt: 18, shadow: { dx: 0, dy: 8, blur: 10, alpha: 0.3 }, intro60: 36 } as const;

export type TypeMaskState = { t: number; k: number; creepK: number; pushK: number; fillK: number; aim: [number, number]; origin: [number, number]; target: [number, number]; open: boolean; develop: number; phase: 'word' | 'push' | 'open' };

/** How far the picture has developed inside the letters (0 = plate colour only, 1 = the picture). Pure. */
export const typeMaskDevelop = (f: number, intro: TypeMaskProps['intro'], fps = 60) => {
  if (!intro) return 1;
  const start = intro.start ?? 0;
  const dur = intro.dur ?? Math.round((TYPEMASK_HOUSE.intro60 * fps) / 60);
  return (intro.ease ?? E.softOut)(clamp((f - start) / Math.max(1e-6, dur)));
};

/** Letters' scale, the fill's scale (both about the target), and whether the window has opened. Pure. */
export const typeMaskState = (f: number, p: Omit<TypeMaskProps, 'frame' | 'fill' | 'text'>, film?: Partial<FilmCtx>): TypeMaskState => {
  const fps = fpsOf(film);
  const { width: W, height: H } = sizeOf(film);
  const creep = p.creep ?? TYPEMASK_HOUSE.creep;
  const ps = p.push;
  const tCreep = Math.max(0, (ps ? Math.min(f, ps.start) : f) / fps);
  const k0 = 1 + creep * tCreep;
  const origin = p.origin ?? [W / 2, H / 2];
  const develop = typeMaskDevelop(f, p.intro, fps);
  if (!ps) return { t: 0, k: k0, creepK: k0, pushK: 1, fillK: 1, aim: [0, 0], origin, target: origin, open: false, develop, phase: 'word' };
  const t = clamp((f - ps.start) / Math.max(1e-6, ps.dur));
  const e = (ps.ease ?? E.launchIn)(t);
  const k = lmix(k0, ps.to ?? TYPEMASK_HOUSE.to, e);
  const pushK = k / k0; // the push about the target, on top of the creep about the word's centre
  const fillK = lmix(1, ps.fillTo ?? TYPEMASK_HOUSE.fillTo, e);
  const open = k >= (ps.openAt ?? TYPEMASK_HOUSE.openAt);
  const aim: [number, number] = ps.aim === false ? [0, 0] : [(W / 2 - ps.target[0]) * e, (H / 2 - ps.target[1]) * e];
  return { t, k, creepK: k0, pushK, fillK, aim, origin, target: ps.target, open, develop, phase: t <= 0 ? 'word' : open ? 'open' : 'push' };
};

/** The margin the fill needs so the aim never shows its edge. */
export const typeMaskRoom = (p: Pick<TypeMaskProps, 'push' | 'fillRoom'>, film?: Partial<FilmCtx>) => {
  if (p.fillRoom !== undefined) return p.fillRoom;
  const { width: W, height: H } = sizeOf(film);
  if (!p.push || p.push.aim === false) return 0;
  return Math.ceil(Math.max(Math.abs(W / 2 - p.push.target[0]), Math.abs(H / 2 - p.push.target[1]))) + 8;
};

/** The fill's log-scale speed (ln units per film frame) on the push's last frame: hand it to the next shot's carry. */
export const typeMaskExitSpeed = (p: Omit<TypeMaskProps, 'frame' | 'fill' | 'text'>, film?: Partial<FilmCtx>) => {
  if (!p.push) return 0;
  const end = p.push.start + p.push.dur;
  return Math.log(typeMaskState(end, p, film).fillK / typeMaskState(end - 1, p, film).fillK);
};

const about = (c: [number, number], k: number) => `translate(${c[0].toFixed(2)} ${c[1].toFixed(2)}) scale(${k.toFixed(5)}) translate(${(-c[0]).toFixed(2)} ${(-c[1]).toFixed(2)})`;

export const TypeMask: React.FC<TypeMaskProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const uid = useId().replace(/:/g, '');
  const id = `tm-${p.id ?? uid}`;
  const s = typeMaskState(p.frame, p, film);
  const room = typeMaskRoom(p, film);
  const o = p.origin ?? [W / 2, H / 2];
  const font = { family: FONT.text, weight: 750, size: 640 * (Math.min(W, H) / 1080), tracking: -0.04, ...(p.font ?? {}) };
  const plate = { color: C.ink, opacity: 1, ...(p.plate ?? {}) };
  const sh = p.shadow === false ? null : { ...TYPEMASK_HOUSE.shadow, ...(p.shadow ?? {}) };
  // the aim moves the whole view (letters and the picture behind) so the target arrives at the frame's centre
  const fillT = `translate(${(s.target[0] + s.aim[0]).toFixed(2)}px, ${(s.target[1] + s.aim[1]).toFixed(2)}px) scale(${s.fillK.toFixed(5)}) translate(${-s.target[0]}px, ${-s.target[1]}px)`;
  const letters = (
    <text
      x={o[0]}
      y={o[1]}
      textAnchor="middle"
      dominantBaseline="central"
      fill="black"
      transform={`${s.aim[0] || s.aim[1] ? `translate(${s.aim[0].toFixed(2)} ${s.aim[1].toFixed(2)}) ` : ''}${s.pushK !== 1 ? `${about(s.target, s.pushK)} ` : ''}${about(s.origin, s.creepK)}`}
      style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: font.size, letterSpacing: `${font.tracking}em` }}
    >
      {p.text}
    </text>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: p.intro ? plate.color : undefined, ...p.style }}>
      <div style={{ position: 'absolute', left: -room, top: -room, width: W + 2 * room, height: H + 2 * room, transformOrigin: `${room}px ${room}px`, transform: s.fillK !== 1 || s.aim[0] || s.aim[1] ? fillT : undefined, opacity: s.develop < 1 ? s.develop : undefined }}>
        <FilmProvider value={{ width: W + 2 * room, height: H + 2 * room }}>{p.fill}</FilmProvider>
      </div>
      {!s.open && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs>
            <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={-W} y={-H} width={W * 3} height={H * 3}>
              <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="white" />
              {letters}
            </mask>
            {sh && (
              <filter id={`${id}-s`} x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation={sh.blur} />
              </filter>
            )}
          </defs>
          {sh && (
            <g filter={`url(#${id}-s)`} transform={`translate(${sh.dx} ${sh.dy})`} opacity={sh.alpha}>
              <g mask={`url(#${id}-m)`}>
                <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={C.ink} />
              </g>
            </g>
          )}
          <g mask={`url(#${id}-m)`}>
            <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={plate.color} opacity={plate.opacity} />
          </g>
        </svg>
      )}
    </div>
  );
};

/** The opening is a zoom-through seam carrying scale: the frame the plate drops. */
export const declares = (p?: Partial<TypeMaskProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || !p.push) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  let at = p.push.start + p.push.dur;
  for (let f = Math.floor(p.push.start); f <= p.push.start + p.push.dur; f++) {
    if (typeMaskState(f, p as TypeMaskProps, film).open) { at = f; break; }
  }
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at, kind: 'zoomThrough', carry: 'scale', id: p.id ?? 'typemask' }] };
};
