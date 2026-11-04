import React from 'react';
import { fd, lmix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares, Flash, SteppedRange } from '../timeline';

/**
 * Flashes: single frames and short runs that punctuate a cut.
 *
 *   InvertBand    a loop resets through three one-frame images (the product, the key word huge, scattered
 *                 tiles), each with its centre band (56 % of the width) colour-inverted while the outer strips
 *                 stay normal; 2 f each at 60 fps, then the main shot returns
 *   GhostPreflash a huge, faint version of what is about to arrive (5-6x, 8-15 % strength) flashes behind the
 *                 frame for 5-8 f; the real element lands 3-11 f after it
 *   knockback     when the new hero lands, the previous one drops to 55 % strength in one frame
 *
 * Every state decides on whole frames: these are designed flashes, declared as such.
 */

// ---------------------------------------------------------------------------------------------- InvertBand

/** House numbers: frames at 60 fps, the band as shares of the width. */
export const INVERT_BAND = { hold60: 2, band: { x: 0.22, w: 0.56 } } as const;

export type InvertBandProps = {
  at: number; // the first image's frame
  count: number; // images in the run (house 3)
  hold?: number; // 60 fps frames each (house 2)
  band?: { x: number; w: number }; // shares of the width (house 0.22, 0.56)
  id?: string;
};

/** Which image shows at frame f (-1 outside the run). Pure. */
export const invertBandState = (frame: number, p: InvertBandProps, film?: Partial<FilmCtx>) => {
  const per = Math.max(1, Math.round(f60x(p.hold ?? INVERT_BAND.hold60, fpsOf(film))));
  const k = Math.floor((fd(frame) - p.at) / per);
  return { index: k >= 0 && k < p.count ? k : -1, per };
};

/** Sync: each image (a glitch step or a tick each), the return. */
export const invertBandFrames = (p: InvertBandProps, film?: Partial<FilmCtx>) => {
  const { per } = invertBandState(p.at, p, film);
  return { images: Array.from({ length: p.count }, (_, i) => p.at + i * per), back: p.at + p.count * per };
};

/** Draws sources[index] full-frame with an inverted copy clipped to the centre band; nothing outside the run. */
export const InvertBand: React.FC<InvertBandProps & { frame: number; sources: React.ReactNode[] }> = (props) => {
  const film = useFilm();
  const s = invertBandState(props.frame, props, film);
  if (s.index < 0) return null;
  const b = props.band ?? INVERT_BAND.band;
  const src = props.sources[s.index % props.sources.length];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>{src}</div>
      <div style={{ position: 'absolute', inset: 0, filter: 'invert(1)', clipPath: `inset(0 ${((1 - b.x - b.w) * 100).toFixed(3)}% 0 ${(b.x * 100).toFixed(3)}%)` }}>{src}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- GhostPreflash

/** House numbers: frames at 60 fps. */
export const GHOST_PREFLASH = { frames60: 6, scale: 5.5, opacity: 0.12, lead60: 6, grow: 1.08 } as const;

export type GhostPreflashProps = {
  land: number; // the real element's landing frame
  lead?: number; // 60 fps frames between the ghost's end and the landing (house 6: 3-11)
  frames?: number; // 60 fps frames the ghost shows (house 6: 5-8)
  scale?: number; // the ghost's size against the element (house 5.5)
  opacity?: number; // house 0.12
  id?: string;
};

/** The ghost's visibility, scale (it creeps 8 % larger while it shows) and opacity at frame f. Pure. */
export const ghostPreflashState = (frame: number, p: GhostPreflashProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const len = Math.max(1, Math.round(f60x(p.frames ?? GHOST_PREFLASH.frames60, fps)));
  const end = p.land - Math.round(f60x(p.lead ?? GHOST_PREFLASH.lead60, fps));
  const start = end - len;
  const F = fd(frame);
  const on = F >= start && F < end;
  const k = on ? (F - start) / Math.max(1, len - 1) : 0;
  const s0 = p.scale ?? GHOST_PREFLASH.scale;
  return { visible: on, start, end, scale: lmix(s0, s0 * GHOST_PREFLASH.grow, k), opacity: on ? (p.opacity ?? GHOST_PREFLASH.opacity) : 0 };
};

/** Draws `children` (the element, centred on x, y) as the ghost. */
export const GhostPreflash: React.FC<GhostPreflashProps & { frame: number; x: number; y: number; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = ghostPreflashState(props.frame, props, film);
  if (!s.visible) return null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: s.opacity, transform: `translate(${props.x}px, ${props.y}px) scale(${s.scale.toFixed(4)})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', whiteSpace: 'pre' }}>{props.children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- knockback

/** The previous hero's strength: 1 until the new one lands, then `to` (house 0.55) in one frame. */
export const knockback = (frame: number, land: number, to = 0.55): number => (fd(frame) >= land ? to : 1);

// ---------------------------------------------------------------------------------------------- declares

/** InvertBand: each image a declared flash and the run stepped; GhostPreflash: a stepped run; knockback: one stepped frame. */
export const declares = (p?: { band?: Partial<InvertBandProps>; ghost?: Partial<GhostPreflashProps>; knock?: { land: number; id?: string } }, film?: Partial<FilmCtx>): Declares => {
  const stepped: SteppedRange[] = [];
  const flashes: Flash[] = [];
  if (p?.band?.at !== undefined && p.band.count) {
    const fr = invertBandFrames(p.band as InvertBandProps, film);
    const per = fr.images.length > 1 ? fr.images[1] - fr.images[0] : fr.back - fr.images[0];
    fr.images.forEach((f, i) => flashes.push({ f, frames: (Math.min(2, per) as 1 | 2), id: `${p.band!.id ?? 'invertBand'}-${i}` }));
    stepped.push({ from: p.band.at, to: fr.back, id: p.band.id ?? 'invertBand' });
  }
  if (p?.ghost?.land !== undefined) {
    const s = ghostPreflashState(p.ghost.land, p.ghost as GhostPreflashProps, film);
    stepped.push({ from: s.start, to: s.end, id: p.ghost.id ?? 'ghostPreflash' });
  }
  if (p?.knock) stepped.push({ from: p.knock.land, to: p.knock.land + 1, id: p.knock.id ?? 'knockback' });
  return { stepped, flashes, cameraBlur: [], seams: [] };
};
