// The film context: frame rate, frame size, pace and copy for every primitive. fx/ and lib/ never
// read the starter timeline's module constants (FPS, W, H, COPY); they read this context, so the
// same primitive runs in a 24, 25, 30 or 60 fps composition, at any size, or in a second film in the
// same project. This is the one file in lib/ that imports those constants: they are its defaults.
//
// Resolution, field by field:
//   components  useFilm(): <FilmProvider value> > useVideoConfig() (fps, width, height) > filmDefaults()
//   pure code   a `film` argument (Partial<FilmCtx>) > filmDefaults(); fpsOf()/sizeOf()/paceOf()/copyOf()
// filmDefaults() returns the timeline's numbers. Under CINETIC_STRICT_FILM=1 (set by test runners) it
// throws instead, so a helper that forgets its film context fails loudly in a test at 24 or 30 fps
// rather than passing silently at the starter's 60.
//
// Durations are fractional frames derived from seconds (secToF, f60x); starts are whole frames; discrete
// state decides on fd(frame) (lib/anim.ts). Keep this file free of DOM access: Node scripts load it.
import React, { createContext, useContext, useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import { COPY, type Copy, FPS, H, PACE_NAME, W } from '../timeline';
import { PACE, type Pace } from './pace';

export type { Copy } from '../timeline';

/** What a primitive needs to know about the film it runs in. */
export type FilmCtx = {
  fps: number; // frames per second of the composition (fractional rates such as 30000 / 1001 are fine)
  width: number; // frame size, px
  height: number;
  pace: Pace; // the text pace (lib/pace.ts): word durations, staggers, holds, fx defaults
  copy: Copy[]; // every on-screen string (timeline.ts COPY): Chain and the layout audit look ids up here
};

/** True when CINETIC_STRICT_FILM=1 in the environment (Node only; always false in a browser render). */
export const strictFilm = (): boolean => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.CINETIC_STRICT_FILM === '1';
};

const DEFAULTS: FilmCtx = { fps: FPS, width: W, height: H, pace: PACE[PACE_NAME], copy: COPY };

/**
 * Node-safe defaults from timeline.ts (FPS, W, H, the PACE_NAME pace, COPY), for scripts and for code
 * that runs outside a composition. Throws under CINETIC_STRICT_FILM=1. Do not mutate the result.
 */
export const filmDefaults = (): FilmCtx => {
  if (strictFilm())
    throw new Error('filmDefaults(): CINETIC_STRICT_FILM=1, and no film context was passed. Give the helper its film ({ fps, width, height, pace, copy }) explicitly.');
  return DEFAULTS;
};

/** One field of a partial film context, else its default (which throws under CINETIC_STRICT_FILM=1). */
export const filmField = <K extends keyof FilmCtx>(film: Partial<FilmCtx> | undefined, key: K): FilmCtx[K] => {
  const v = film?.[key];
  return v !== undefined ? (v as FilmCtx[K]) : filmDefaults()[key];
};
export const fpsOf = (film?: Partial<FilmCtx>): number => filmField(film, 'fps');
export const paceOf = (film?: Partial<FilmCtx>): Pace => filmField(film, 'pace');
export const copyOf = (film?: Partial<FilmCtx>): Copy[] => filmField(film, 'copy');
export const sizeOf = (film?: Partial<FilmCtx>): { width: number; height: number } => ({ width: filmField(film, 'width'), height: filmField(film, 'height') });
/** Layout unit of a film: 1 at 1080p, scaling every size with the short side of the frame (brand/tokens.ts U). */
export const uOf = (film?: Partial<FilmCtx>): number => {
  const { width, height } = sizeOf(film);
  return Math.min(width, height) / 1080;
};
/** A complete film context: the given fields, the rest from filmDefaults(). */
export const filmOf = (film?: Partial<FilmCtx>): FilmCtx => ({
  fps: filmField(film, 'fps'),
  width: filmField(film, 'width'),
  height: filmField(film, 'height'),
  pace: filmField(film, 'pace'),
  copy: filmField(film, 'copy'),
});

/** Seconds to frames at `fps`, fractional on purpose (a duration inside a move must not be rounded). */
export const secToF = (s: number, fps: number) => s * fps;
/** A length written in 60 fps frames, in frames at `fps`, fractional (rounding would bend a curve at 24, 25 or 30 fps). */
export const f60x = (frames60: number, fps: number) => (frames60 * fps) / 60;
/** The same, rounded to whole frames: copy timing, Sequence lengths, the defaults of the 1.1 components. */
export const f60 = (frames60: number, fps: number) => Math.round((frames60 * fps) / 60);

const Ctx = createContext<Partial<FilmCtx> | null>(null);

/**
 * Sets the film context for everything inside it. Fields left out come from the enclosing provider,
 * then from the composition (fps, width, height), then from the timeline. A composition at another rate:
 *   <FilmProvider value={{ fps: 30, width: 1920, height: 1080, pace: PACE.crisp }}>...</FilmProvider>
 */
export const FilmProvider: React.FC<{ value: Partial<FilmCtx>; children: React.ReactNode }> = ({ value, children }) => {
  const parent = useContext(Ctx);
  const merged = useMemo(() => ({ ...(parent ?? {}), ...value }), [parent, value]);
  return React.createElement(Ctx.Provider, { value: merged }, children);
};

/** The film context inside a component: provider > useVideoConfig() > filmDefaults(), field by field. */
export const useFilm = (): FilmCtx => {
  const p = useContext(Ctx);
  let vc: { fps: number; width: number; height: number } | null = null;
  try {
    vc = useVideoConfig(); // only context reads inside; it throws outside a composition
  } catch {
    vc = null;
  }
  const fps = p?.fps ?? vc?.fps;
  const width = p?.width ?? vc?.width;
  const height = p?.height ?? vc?.height;
  const pace = p?.pace;
  const copy = p?.copy;
  return useMemo(
    () => ({
      fps: fps ?? filmDefaults().fps,
      width: width ?? filmDefaults().width,
      height: height ?? filmDefaults().height,
      pace: pace ?? filmDefaults().pace,
      copy: copy ?? filmDefaults().copy,
    }),
    [fps, width, height, pace, copy],
  );
};
