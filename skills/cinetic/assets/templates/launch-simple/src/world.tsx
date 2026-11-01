// The film's world: the place it stands in (fx/world), dealt with the direction (deal.ts `ground`), one for the whole
// film and never cut, with its key light that glass, rims, type and the product pick up (references/lighting.md §8).
// Film.tsx draws it under every act; inside it, fx/light Glass frosts exactly this ground, a rim is brightest on the side
// that faces its key, a sweep is that light crossing an edge, and the hero shots (src/hero) stand in it.
//
// A plate world (clouds, sky, aerial, sea, nightCity, studio, macro) is a real photograph: `node scripts/assets.mjs plate
// <kind>` saves a sheet of candidates; pick one for its light and a calm area where the lines and the glass sit, then
// `node scripts/assets.mjs plate <kind> --pick <n> --to public/plates --accent '<the accent>'` writes
// public/plates/<kind>.jpg (graded for the film) and <kind>-soft.jpg (what glass frosts, the far depth). Until the plate
// is there a built world of the same tone stands in (PLATE_FALLBACK) and precheck says so.
import React from 'react';
import { getStaticFiles, Img, staticFile } from 'remotion';
import { C } from './brand/tokens';
import { DEAL } from './deal';
import type { FamilyInks } from './fx/Grounds';
import { bakePlate } from './fx/Gradients';
import { type BuiltKind, isPlateWorld, type PlateKind, type PlateMove, plateMove, World, type WorldKind, type WorldSpec, worldOf } from './fx/world';
import { clamp, E } from './lib/anim';
import { mixColor } from './lib/color';
import { timingFail } from './lib/continuity';
import { worldPath } from './fx/world';
import { OPEN_RACK, SEAM_PLAN } from './timeline';

/** The dealt world. */
export const WORLD_KIND = DEAL.ground as WorldKind;
/** The built world that stands in for a plate world until its picture is fetched: the same tone, the same type. */
export const PLATE_FALLBACK: Record<PlateKind, BuiltKind> = { clouds: 'deepField', aerial: 'deepField', sea: 'deepField', macro: 'deepField', nightCity: 'blackField', sky: 'paleSky', studio: 'nearWhite' };
/** Where assets.mjs plate writes a plate world's picture (public/), and its soft copy. */
export const platePath = (kind: WorldKind, soft = false) => `plates/${kind}${soft ? '-soft' : ''}.jpg`;
const hasStatic = (p: string) => {
  try {
    return getStaticFiles().some((s) => s.name === p);
  } catch {
    return false;
  }
};
/** The world the film draws: the dealt one with its picture, or (a plate world whose picture is not fetched) its stand-in. */
export const worldDrawn = (): { kind: WorldKind; src?: string; soft?: string; standIn: boolean } => {
  if (!isPlateWorld(WORLD_KIND)) return { kind: WORLD_KIND, standIn: false };
  if (!hasStatic(platePath(WORLD_KIND))) return { kind: PLATE_FALLBACK[WORLD_KIND], standIn: true };
  return { kind: WORLD_KIND, src: staticFile(platePath(WORLD_KIND)), soft: hasStatic(platePath(WORLD_KIND, true)) ? staticFile(platePath(WORLD_KIND, true)) : undefined, standIn: false };
};
// a plate world without its picture plays its stand-in; precheck reports it (the ship gate fails it)
if (isPlateWorld(WORLD_KIND) && typeof document !== 'undefined' && worldDrawn().standIn)
  timingFail('world', `world: the dealt world "${WORLD_KIND}" is a photograph and public/${platePath(WORLD_KIND)} is missing (a ${PLATE_FALLBACK[WORLD_KIND]} stands in): node scripts/assets.mjs plate ${WORLD_KIND}, then --pick <n> --to public/plates --accent '${C.accent}'`);

/** The dealt world's colours for the film (its tone and type hold for its stand-in too). */
export const WORLD_SPEC: WorldSpec = worldOf(WORLD_KIND);
/** A dark world (white type), else a light one (ink type). */
export const WORLD_DARK = WORLD_SPEC.tone === 'dark';
/** The night worlds, where the product's surfaces are dark glass lit by their rims; elsewhere they are light. */
const NIGHT = new Set<WorldKind>(['blackField', 'deepField', 'nightCity']);
export const SURFACE_DARK = NIGHT.has(WORLD_KIND);
/**
 * The template's inks in this world: the ground and its far tone, the type and its mute, the accent (lifted on a dark
 * world), the product's surface (dark glass on the night worlds, white elsewhere), a hairline. `spec`: the drawn world's.
 */
export const worldInks = (spec: WorldSpec = WORLD_SPEC): FamilyInks => {
  const ground = spec.base;
  const dark = spec.tone === 'dark';
  return {
    ground,
    far: mixColor(ground, C.ink, dark ? 0.35 : 0.06),
    type: spec.ink,
    mute: spec.mute,
    accent: dark ? mixColor(C.accent, C.white, 0.28) : C.accent,
    surface: SURFACE_DARK ? mixColor(ground, C.white, 0.12) : C.white,
    line: mixColor(spec.ink, ground, 0.82),
    dark,
  };
};
let drawnInks: FamilyInks | null = null;
/** The inks of the world as drawn (the stand-in's ground while a plate is missing); in Node, the dealt world's. */
export const inksOfWorld = (): FamilyInks => {
  if (drawnInks) return drawnInks;
  const w = typeof document === 'undefined' ? { kind: WORLD_KIND } : worldDrawn();
  drawnInks = worldInks(w.kind === WORLD_KIND ? WORLD_SPEC : worldOf(w.kind));
  return drawnInks;
};
/** The kit screens' tone in this world (src/kit/screens): dark cards on the night worlds, light ones elsewhere. */
export const SCREEN_TONE: 'light' | 'dark' = SURFACE_DARK ? 'dark' : 'light';

/**
 * The focus on a photographic world: the opening frames see the place sharp (where the film stands), then the lens racks
 * to the type and the product (FOCUS: from `at` over `rack` f@60) and the place stays soft behind them, its soft copy
 * laid over the picture (one image, no live blur): a busy plate never fights a line or a lockup. On a dark world the
 * soft place also sinks under a veil of its own deep tone (`veil`): the subject is the brightest thing in the frame, as
 * at night. The hero shots draw their own grounds.
 */
export const FOCUS = { at: OPEN_RACK.at, rack: OPEN_RACK.rack, veil: 0.16 } as const;
/** How far the world has gone soft at film frame F (0 sharp, 1 soft). */
export const worldSoftAt = (F: number, fps: number) => E.stdInOut(clamp((F - (FOCUS.at * fps) / 60) / ((FOCUS.rack * fps) / 60)));

/**
 * The film's path through its world (fx/world worldPath): the camera enters the place on the opening frames (a push that
 * lands as the lens racks to the type) and moves on with every change of picture, landing just after each cut, so the
 * place carries the cut and is never one still photograph for the whole film; every hold between is still, every move
 * the same way (deeper and higher), never a drift.
 */
export const WORLD_MOVES = (fps: number) => worldPath(SEAM_PLAN.filter((s) => s.recipe !== 'handover').map((s) => s.at), { fps });
/** The world under the whole film (Film.tsx, Root.tsx): one place, never cut, moving only with the film's path; the light
 * parts inside read it. `F`: the film frame (the soft copy's rack, the path). `push`/`frame`: a shot's own move on its
 * own clock, added to the path. */
export const FilmWorld: React.FC<{ F?: number; fps?: number; push?: PlateMove; frame?: number; children?: React.ReactNode }> = ({ F = 0, fps = 30, push, frame, children }) => {
  const w = worldDrawn();
  const soft = w.soft ? worldSoftAt(F, fps) : 0;
  // the path on the film's clock, a shot's own move shifted onto it
  const off = frame === undefined ? 0 : F - frame;
  const moves: PlateMove[] = [...WORLD_MOVES(fps), ...(push ? [{ ...push, from: push.from + off, to: push.to + off }] : [])];
  const m = plateMove(F, moves);
  const focus = WORLD_SPEC.plate?.focus ?? [0.5, 0.5];
  // the world's corner falloff drawn over the soft copy too (the same as the world's own: black at its strength in the
  // corners, nothing inside the middle 45 %), so the rack never changes the frame's light
  const vig = w.soft && WORLD_SPEC.vignette > 0 ? bakePlate('radial', [{ at: 0, color: C.ink, alpha: 0 }, { at: 0.45, color: C.ink, alpha: 0 }, { at: 1, color: C.ink, alpha: WORLD_SPEC.vignette }], 320, 180, { rx: 0.7, ry: 0.7 }) : '';
  const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' };
  return (
    <World kind={w.kind} src={w.src} soft={w.soft} spec={w.soft ? { vignette: 0 } : undefined} push={moves} frame={F}>
      {soft > 0.001 ? <Img src={w.soft as string} data-imagery="" style={{ ...fill, objectFit: 'cover', opacity: soft, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `translate(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px) scale(${m.s.toFixed(5)})` }} /> : null}
      {soft > 0.001 && WORLD_DARK ? <div style={{ ...fill, background: WORLD_SPEC.base, opacity: FOCUS.veil * soft }} /> : null}
      {vig ? <Img src={vig} style={fill} /> : null}
      {children}
    </World>
  );
};
/** Whether the world is a photograph (its colour is the place's own: the claim stands in it, no colour field over it). */
export const PLATE_WORLD = isPlateWorld(WORLD_KIND);
