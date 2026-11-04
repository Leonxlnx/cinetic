import React from 'react';
import { E } from '../lib/anim';
import { type MorphBox, morphBox } from '../lib/box';
import { type GlideAt, type GlideListProps, type GlideOpts, glideFrames, glideList, glideValue, GLIDE } from '../lib/continuity';
import { type FilmCtx, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { DirBlur } from './Defocus';

// Glide UI: the product changes state the way well-made software animates it. A list or ticker steps a whole row
// in a 16 f glide (60 fps) on E.glideOut, smeared along its motion by a 180-degree shutter (fx/Defocus DirBlur), and
// keeps a slow drift between steps (lib/continuity holdDrift's 0.5 px/f), so nothing jumps in one frame and no hold
// freezes. A selection box or highlight glides between its states the same way (glideBox). The continuous form of
// fx/HardStep: same props, so a hard list becomes a glide by renaming it; HardStep's one-frame jumps stay available
// for the film's one declared snap (forensics motion-snap allows one declared snap device per film).

/** A list (children laid out in a column, frame px) that glides up by `jump` px per step (dir 1) and drifts between steps. */
export const GlideStep: React.FC<
  GlideListProps & { frame: number; x?: number; y?: number; width: number; height: number; dir?: 1 | -1; smear?: boolean; id?: string; children: React.ReactNode; style?: React.CSSProperties }
> = ({ frame, x = 0, y = 0, width, height, dir = 1, smear = true, id, children, style, ...p }) => {
  const film = useFilm();
  const s = glideList(frame, p, film);
  const column = <div style={{ position: 'absolute', left: 0, top: 0, width, transform: `translate3d(0px, ${(-dir * s.y).toFixed(3)}px, 0)` }}>{children}</div>;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden', transform: `translate(${x}px, ${y}px)`, ...style }}>
      {smear ? (
        <DirBlur v={(-dir * s.v) / uOf(film)} axis="y" shutter={180} id={id ? `${id}-glide` : undefined}>
          {column}
        </DirBlur>
      ) : (
        column
      )}
    </div>
  );
};

/**
 * A box that glides between states (a selection box moving to the next word, a highlight to the next row, a field
 * taking the width of what was typed): each step morphs from where the box is to its new state over 16 f at 60 fps on
 * E.glideOut. The continuous form of fx/HardStep snapBox().
 */
export const glideBox = (f: number, steps: GlideAt<MorphBox>[], initial: MorphBox, o: GlideOpts = {}, film?: Partial<FilmCtx>): Required<MorphBox> => {
  let b = morphBox(initial, initial, 1);
  for (let i = 0; i < steps.length; i++) {
    if (f < steps[i].at) break;
    // the share of this step travelled, from the glide's own curve (one curve for the whole morph, colours included)
    const p = glideValue(f, [{ at: steps[i].at, value: 1 }], 0, { ease: E.glideOut, ...o }, film);
    b = morphBox(b, steps[i].value, p);
  }
  return b;
};

/** Frames of a gliding list's steps: for sound sync (a tick on each step's first frame) and for the tests. */
export const glideStepFrames = glideFrames;

/** House numbers of the glide (re-exported from lib/continuity). */
export { GLIDE };

/** A glide is continuous: nothing to declare (no stepped range, no flash, no seam). */
export const declares = (_p?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
