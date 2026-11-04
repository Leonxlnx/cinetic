import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { peakFrame } from '../lib/camera-moves';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares, Seam } from '../timeline';

/**
 * Flip: a layer that turns in depth and changes face.
 *
 *   turn     a card turns 180 degrees about its axis in perspective (a long build, a quicker brake: peak speed near
 *            58 %, 65 f) and is edge-on exactly on the beat, where the faces swap (flipAt places the turn so)
 *   hinge    a slab hinges open about its bottom edge (-90 -> 0 degrees, front-loaded, 22 f): a laptop screen opening
 *   spin     a mark spins on its vertical axis as a loader (26 f a turn), its back face hidden
 *
 * Pure state (flipState, spinAngle); <Flip3D> draws the front or the back face with backface hidden.
 */

/** House numbers: frames at 60 fps, degrees. */
export const FLIP = { turn60: 65, hinge60: 22, spin60: 26, perspective: 1000 } as const;

export type FlipProps = {
  at: number;
  kind?: 'turn' | 'hinge';
  axis?: 'x' | 'y'; // turn: about the vertical (y, house) or horizontal (x) axis; hinge is always x about the bottom edge
  from?: number; // degrees (turn house 0 -> 180, hinge -90 -> 0)
  to?: number;
  frames?: number; // 60 fps frames (turn 65, hinge 22)
  ease?: Ease; // turn house E.whipBuild (peak speed at 55-60 %), hinge E.snapOut
  id?: string;
};

export type FlipState = { angle: number; face: 'front' | 'back'; t: number };

/** The angle and which face shows at frame f. Pure. */
export const flipState = (frame: number, p: FlipProps, film?: Partial<FilmCtx>): FlipState => {
  const fps = fpsOf(film);
  const kind = p.kind ?? 'turn';
  const fr = Math.max(1, f60x(p.frames ?? (kind === 'turn' ? FLIP.turn60 : FLIP.hinge60), fps));
  const t = clamp((frame - p.at) / fr);
  const ease = p.ease ?? (kind === 'turn' ? E.whipBuild : E.snapOut);
  const from = p.from ?? (kind === 'turn' ? 0 : -90);
  const to = p.to ?? (kind === 'turn' ? 180 : 0);
  const angle = mix(from, to, ease(t));
  const a = ((angle % 360) + 360) % 360;
  return { angle, face: a > 90 && a < 270 ? 'back' : 'front', t };
};

/** The frame a turn is edge-on (90 degrees from its start): put it on the downbeat. */
export const edgeOnFrame = (p: FlipProps, film?: Partial<FilmCtx>): number => {
  for (let f = p.at; f < p.at + 10 * fpsOf(film); f++) if (flipState(f, p, film).face === 'back') return f;
  return p.at;
};

/** The start of a turn whose edge-on frame lands on `beat`. */
export const flipAt = (beat: number, p: Omit<FlipProps, 'at'>, film?: Partial<FilmCtx>): number => {
  const probe = edgeOnFrame({ ...p, at: 0 }, film);
  return beat - probe;
};

/** A continuous spin (degrees) about the vertical axis from `start`, one turn per `perTurn` 60 fps frames (house 26). */
export const spinAngle = (frame: number, start: number, film?: Partial<FilmCtx>, perTurn: number = FLIP.spin60): number =>
  frame < start ? 0 : (360 * (frame - start)) / Math.max(1e-6, f60x(perTurn, fpsOf(film)));

/** Sync: the start, the edge-on frame (the downbeat and the face swap), the end. */
export const flipFrames = (p: FlipProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const kind = p.kind ?? 'turn';
  const fr = f60x(p.frames ?? (kind === 'turn' ? FLIP.turn60 : FLIP.hinge60), fps);
  return { start: p.at, edgeOn: kind === 'turn' ? edgeOnFrame(p, film) : undefined, peak: Math.round(peakFrame(p.ease ?? (kind === 'turn' ? E.whipBuild : E.snapOut), p.at, fr)), end: Math.ceil(p.at + fr) };
};

/**
 * Draws `front` (and `back` once past edge-on) turning in perspective; children are laid out in a w x h box at
 * (x, y). A hinge turns about the box's bottom edge. `angle` overrides the state (e.g. spinAngle for a loader).
 */
export const Flip3D: React.FC<FlipProps & { frame: number; x: number; y: number; w: number; h: number; front: React.ReactNode; back?: React.ReactNode; angle?: number; perspective?: number }> = (props) => {
  const film = useFilm();
  const s = flipState(props.frame, props, film);
  const angle = props.angle ?? s.angle;
  const a = ((angle % 360) + 360) % 360;
  const backSide = a > 90 && a < 270;
  const kind = props.kind ?? 'turn';
  const axis = kind === 'hinge' ? 'X' : (props.axis ?? 'y') === 'y' ? 'Y' : 'X';
  const origin = kind === 'hinge' ? '50% 100%' : '50% 50%';
  // the back face is the front turned a further 180 degrees, so it reads the right way round
  const face = backSide && props.back !== undefined ? props.back : props.front;
  const rot = backSide && props.back !== undefined ? angle - 180 : angle;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.w, height: props.h, transform: `translate(${props.x}px, ${props.y}px)`, perspective: props.perspective ?? FLIP.perspective, perspectiveOrigin: origin }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: origin, transform: `rotate${axis}(${rot.toFixed(3)}deg)`, backfaceVisibility: 'hidden' }}>{face}</div>
    </div>
  );
};

/** A turn swaps its face on the edge-on frame: a 'morph' seam (put it on the downbeat). Hinges and spins: nothing. */
export const declares = (p?: Partial<FlipProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined || (p.kind ?? 'turn') !== 'turn') return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const seams: Seam[] = [{ at: edgeOnFrame(p as FlipProps, film), kind: 'morph', carry: 'rot', id: p.id ?? 'flip' }];
  return { stepped: [], flashes: [], cameraBlur: [], seams };
};
