// The living stage (lib/drift.ts): the camera float on every act, planes that part under it, and light that breathes
// over the ground. Film.tsx draws each act as <ActStage from={ACT[name].from} o={FLOAT} {...STAGE[name]}>: every shot
// drifts on one continuous float (sideways up to 31 px/s, a push of up to 3 % carrying the turns; a match cut keeps its
// place across the seam), scaled by bleedFor (about 1.025) so its root, a picture drawn to the frame or a card cropped
// by an edge never shows its edge, while the act's ground holds still on screen (fx/Grounds LitGround sits at Depth 0)
// and the content moves over it. Inside an act, <Depth z> moves a plane z times the float (a back layer at 0.6, a near
// plane at 1.35): the planes part, parallax without a 3D camera. Translation lives in one transform about the frame's
// centre (references/chromium-rendering.md items 1 and 15). Never unclip an act's root to show what it lays out past
// the frame: it paints and blurs everything off screen, and renders crawl (x10 measured).
import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { bakePlate } from './Gradients';
import { type GroundSpec, LitGround } from './Grounds';
import { useFilm } from '../lib/film';
import { bleedFor, breathe, floatAt, type FloatOpts } from '../lib/drift';
import { FloatCtx, T } from './Depth';
import { FILM_LIGHT, keyDir } from '../lib/light';

export { Depth, useFloat } from './Depth';

/**
 * One act on the film's float. `from`: the act's first absolute frame (its Sequence's from), so the float is one
 * function of film time across every act. `o`: the film's float (seed, amp, locks; FLOAT in acts/stage.tsx). `bleed`
 * (on by default): the act floats scaled just enough that its edges never show. `amp` multiplies the film's amplitude
 * for this act, a number or a function of the absolute frame (settleAmp, dipAmp).
 */
export const Float: React.FC<{ from: number; o?: FloatOpts; bleed?: boolean; amp?: number | ((F: number) => number); children: React.ReactNode }> = ({ from, o = {}, bleed = true, amp = 1, children }) => {
  const film = useFilm();
  const F = useCurrentFrame() + from;
  const oo: FloatOpts = { ...o, amp: (o.amp ?? 1) * (typeof amp === 'function' ? amp(F) : amp) };
  const s = floatAt(F, oo, film);
  const b = bleed ? bleedFor(oo, film) : 1;
  return (
    <FloatCtx.Provider value={{ s: { ...s, k: s.k * b }, o: oo, bleed: b }}>
      <div className="cinetic-float" data-float={`${s.x.toFixed(3)},${s.y.toFixed(3)},${(s.k * b).toFixed(6)}`} style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, transformOrigin: '50% 50%', transform: T(s.x, s.y, s.k * b) }}>
        {children}
      </div>
    </FloatCtx.Provider>
  );
};

/** How one act stands on the stage (a template's acts/stage.tsx STAGE entry): what ActStage takes beside the float. */
export type ActGroundOf = GroundSpec | string | ((F: number) => GroundSpec | string | undefined);
export type StageSpec = { ground?: ActGroundOf; bleed?: boolean; amp?: number | ((F: number) => number) };

/**
 * One act on the film's stage, as Film.tsx draws it: the act on the float, and, for an act floated without bleed, its
 * ground held still behind it (`ground`: the act root's own colour, a GroundSpec, or a function of the absolute frame:
 * what shows at the edge the act drifts away from). `amp` scales the float for this act (dipAmp for a line set flush
 * to the frame's edge, settleAmp for an end card that comes to rest under a full-frame reveal); keep it continuous on
 * the act's seams (both helpers start and end at 1), or the picture steps on the cut.
 */
export const ActStage: React.FC<StageSpec & { from: number; o?: FloatOpts; children: React.ReactNode }> = ({ from, o, ground, bleed, amp, children }) => {
  const film = useFilm();
  const F = useCurrentFrame() + from;
  const g = typeof ground === 'function' ? ground(F) : ground;
  return (
    <>
      {typeof g === 'string' && <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, background: g }} />}
      {g && typeof g !== 'string' && <LitGround frame={F} spec={g} />}
      <Float from={from} o={o} bleed={bleed} amp={amp}>
        {children}
      </Float>
    </>
  );
};

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
/** An act's float amplitude easing from 1 at `from` to `to` over `frames`: continuous on its seam (an end card settling). */
export const settleAmp = (from: number, frames: number, to = 0) => (F: number) => 1 + (to - 1) * smooth((F - from) / Math.max(1, frames));
/** An act's float amplitude dipping from 1 at its seams (`from`, `end`) to `low` inside, over `frames` each way (a line set flush to an edge). */
export const dipAmp = (from: number, end: number, low: number, frames: number) => (F: number) =>
  1 + (low - 1) * Math.min(smooth((F - from) / Math.max(1, frames)), smooth((end - F) / Math.max(1, frames)));

/**
 * Light breathing over a ground: a soft plate along the film's key (lit side clear, the far side `ink` at up to
 * `amount`), its strength breathing +-40 % and its edge sliding a few percent along the key over a slow cycle
 * (lib/drift breathe), so a held ground is never dead. A dithered plate, faded by opacity: never a pool or a haze.
 * Put it over the ground, under the content.
 */
export const BreathLight: React.FC<{ frame: number; ink: string; amount?: number; seed?: number | string; periodS?: number }> = ({ frame, ink, amount = 0.06, seed = 5, periodS }) => {
  const film = useFilm();
  const { width: W, height: H } = film;
  const [kx, ky] = keyDir(FILM_LIGHT);
  const angle = (Math.atan2(-ky, -kx) * 180) / Math.PI;
  const size = Math.hypot(W, H) * 1.12;
  const src = bakePlate('linear', [{ at: 0, color: ink, alpha: 0 }, { at: 0.5, color: ink, alpha: 0.55 }, { at: 1, color: ink, alpha: 1 }], size * 0.5, size * 0.5, { seed: 11 });
  if (!src) return null;
  const b = breathe(frame, { seed, periodS }, film);
  const b2 = breathe(frame, { seed: `${seed}:slide`, periodS: (periodS ?? 6.5) * 1.37 }, film);
  const slide = 0.035 * size * b2;
  const dx = -kx * slide;
  const dy = -ky * slide;
  return (
    <Img
      src={src}
      style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: Math.max(0, amount * (1 + 0.4 * b)), transformOrigin: '50% 50%', transform: `translate(${((W - size) / 2 + dx).toFixed(2)}px, ${((H - size) / 2 + dy).toFixed(2)}px) rotate(${angle.toFixed(3)}deg)`, pointerEvents: 'none' }}
    />
  );
};
