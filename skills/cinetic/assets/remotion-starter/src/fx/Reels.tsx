import React from 'react';
import { clamp, E, type Ease, fd, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Reels: lists that move through a fixed window.
 *
 *   FocusBand  a tall list scrolls on an in-out speed profile (100 f) through a fixed band at the centre:
 *              the items inside the band are in the accent, the rest grey, and each switches exactly as it
 *              crosses the band's edge (the list is drawn twice: grey, and an accent copy clipped to the band)
 *   GhostReel  a word sits in a slot while dim, softened copies of the previous and next words stay visible
 *              just outside it, like a slot-machine reel; it rolls to the next word on an exit-then-settle
 *              curve (or hard steps every few frames, the picker version); the ghosts move with the roll
 */

// ---------------------------------------------------------------------------------------------- FocusBand

/** House numbers: frames at 60 fps. */
export const FOCUS_BAND = { frames60: 100, ease: E.stdInOut } as const;

export type FocusBandProps = {
  n: number; // items
  rowH: number; // px between items
  start: number;
  from: number; // the item index centred in the band at start (fractional is fine)
  to: number; // ... at the end
  frames?: number; // 60 fps frames (house 100)
  ease?: Ease; // house E.stdInOut (an in-out speed profile)
  band: { y: number; h: number }; // the band, px from the list window's top
  id?: string;
};

/** The list's offset (px: item i's top sits at i * rowH - offset) and which items are (partly) inside the band. Pure. */
export const focusBandState = (frame: number, p: FocusBandProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const t = clamp((frame - p.start) / Math.max(1, f60x(p.frames ?? FOCUS_BAND.frames60, fps)));
  const centre = mix(p.from, p.to, (p.ease ?? FOCUS_BAND.ease)(t));
  const bandMid = p.band.y + p.band.h / 2;
  const offset = centre * p.rowH + p.rowH / 2 - bandMid;
  const inBand: number[] = [];
  for (let i = 0; i < p.n; i++) {
    const top = i * p.rowH - offset;
    const share = clamp((Math.min(top + p.rowH, p.band.y + p.band.h) - Math.max(top, p.band.y)) / p.rowH);
    if (share > 0.5) inBand.push(i);
  }
  return { offset, centre, inBand };
};

/** Sync: when each item enters the band (a soft tick per item if the list is slow; none when it is fast). */
export const focusBandFrames = (p: FocusBandProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const end = Math.ceil(p.start + f60x(p.frames ?? FOCUS_BAND.frames60, fps));
  const enters: { at: number; i: number }[] = [];
  let prev = new Set(focusBandState(p.start, p, film).inBand);
  for (let f = p.start + 1; f <= end; f++) {
    const now = focusBandState(f, p, film).inBand;
    for (const i of now) if (!prev.has(i)) enters.push({ at: f, i });
    prev = new Set(now);
  }
  return { start: p.start, end, enters };
};

/**
 * Draws the list in a window at (x, y) of `width` x `height`: `render(i, inBand)` for each row (the grey
 * copy gets inBand false, the accent copy true); the accent copy is clipped to the band.
 */
export const FocusBand: React.FC<FocusBandProps & { frame: number; x: number; y: number; width: number; height: number; render: (i: number, accent: boolean) => React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = focusBandState(props.frame, props, film);
  const first = Math.max(0, Math.floor(s.offset / props.rowH) - 1);
  const last = Math.min(props.n - 1, Math.ceil((s.offset + props.height) / props.rowH) + 1);
  const rows = (accent: boolean) =>
    Array.from({ length: Math.max(0, last - first + 1) }, (_, k) => first + k).map((i) => (
      <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: props.rowH, transform: `translate3d(0, ${(i * props.rowH - s.offset).toFixed(2)}px, 0)` }}>
        {props.render(i, accent)}
      </div>
    ));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: props.height, overflow: 'hidden', transform: `translate(${props.x}px, ${props.y}px)` }}>
      {rows(false)}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${props.band.y}px 0 ${Math.max(0, props.height - props.band.y - props.band.h)}px 0)` }}>{rows(true)}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- GhostReel

/** House numbers: frames at 60 fps; ghost strength and softness. */
export const GHOST_REEL = { exit60: 26, settle60: 16, every60: 10, ghost: 0.2, sigma: 6, rows: 1 } as const;

export type GhostReelProps = {
  n: number; // words in the reel
  pitch: number; // px between words
  swaps: number[]; // frames the reel starts rolling to word i + 1 (ease) or jumps (step)
  mode?: 'ease' | 'step'; // ease: an exit (E.buildIn 26 f) into a settle (E.snapOut 16 f); step: hard jumps
  exit?: number; // 60 fps frames
  settle?: number;
  ghost?: { opacity?: number; rows?: number }; // house 0.2, one row each side
  id?: string;
};

/** The reel's position in words (fractional while rolling), the current index, and the ghost rows. Pure. */
export const ghostReelState = (frame: number, p: GhostReelProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const ex = Math.max(1, f60x(p.exit ?? GHOST_REEL.exit60, fps));
  const st = Math.max(1, f60x(p.settle ?? GHOST_REEL.settle60, fps));
  let pos = 0;
  for (const s of p.swaps) {
    if ((p.mode ?? 'ease') === 'step') pos += fd(frame) >= s ? 1 : 0;
    else {
      // half the pitch on the exit (accelerating), the other half on the settle (decelerating)
      pos += 0.5 * E.buildIn(clamp((frame - s) / ex)) + 0.5 * E.snapOut(clamp((frame - s - ex) / st));
    }
  }
  pos = Math.min(pos, p.n - 1);
  const index = Math.round(pos);
  const g = p.ghost?.rows ?? GHOST_REEL.rows;
  const ghosts: { i: number; dy: number; opacity: number }[] = [];
  for (let i = Math.max(0, Math.floor(pos) - g); i <= Math.min(p.n - 1, Math.ceil(pos) + g); i++) {
    const d = i - pos;
    if (Math.abs(d) < 0.02) continue;
    ghosts.push({ i, dy: d * p.pitch, opacity: (p.ghost?.opacity ?? GHOST_REEL.ghost) * clamp(1.5 - Math.abs(d) / Math.max(1, g)) });
  }
  return { pos, index, offset: pos * p.pitch, ghosts };
};

/** Sync: each roll's start and the frame it lands (the settle's end): a click on the landing. */
export const ghostReelFrames = (p: GhostReelProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const total = (p.mode ?? 'ease') === 'step' ? 0 : f60x((p.exit ?? GHOST_REEL.exit60) + (p.settle ?? GHOST_REEL.settle60), fps);
  return p.swaps.map((s) => ({ at: s, lands: Math.ceil(s + total) }));
};

/**
 * Draws the reel centred on (x, y) in a slot `slotH` tall: the sharp words clipped to the slot, the
 * neighbours outside it through one fixed softening level (`sigma` px blur, never animated) at low opacity.
 */
export const GhostReel: React.FC<GhostReelProps & { frame: number; x: number; y: number; width: number; slotH: number; render: (i: number) => React.ReactNode; sigma?: number }> = (props) => {
  const film = useFilm();
  const s = ghostReelState(props.frame, props, film);
  const g = props.ghost?.rows ?? GHOST_REEL.rows;
  const span = props.slotH + 2 * (g + 0.5) * props.pitch;
  const lo = Math.max(0, Math.floor(s.pos) - g - 1);
  const hi = Math.min(props.n - 1, Math.ceil(s.pos) + g + 1);
  const list = (dim: boolean) =>
    Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map((i) => {
      const gh = s.ghosts.find((q) => q.i === i);
      return (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: props.slotH, opacity: dim ? (gh?.opacity ?? 0) : 1, transform: `translate3d(0, ${(span / 2 - props.slotH / 2 + (i - s.pos) * props.pitch).toFixed(2)}px, 0)` }}>
          {props.render(i)}
        </div>
      );
    });
  const top = span / 2 - props.slotH / 2;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: span, transform: `translate(${props.x - props.width / 2}px, ${props.y - span / 2}px)` }}>
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${props.sigma ?? GHOST_REEL.sigma}px)`, clipPath: `polygon(0 0, 100% 0, 100% ${top}px, 0 ${top}px, 0 ${top + props.slotH}px, 100% ${top + props.slotH}px, 100% 100%, 0 100%)` }}>{list(true)}</div>
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${top}px 0 ${top}px 0)` }}>{list(false)}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- declares

/** FocusBand: nothing (continuous). GhostReel: its jumps in step mode. */
export const declares = (p?: { reel?: Partial<GhostReelProps> }, _film?: Partial<FilmCtx>): Declares => {
  const r = p?.reel;
  if (!r?.swaps?.length || (r.mode ?? 'ease') !== 'step') return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: r.swaps.map((s, i) => ({ from: s, to: s + 1, id: `${r.id ?? 'ghostReel'}-${i}` })), flashes: [], cameraBlur: [], seams: [] };
};
