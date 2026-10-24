import React from 'react';
import { fd } from '../lib/anim';
import { type MorphBox, morphBox } from '../lib/box';
import type { FilmCtx } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';

// Hard UI: the product changes state the way software does, in one frame, with no tween. A list jumps a
// whole row, a selection box snaps to the next word, a container takes the width of what was typed. Next
// to eased type it reads as the product itself moving rather than an animator. Every jump is a declared
// step (one sample, no shutter blur across it); between jumps nothing moves at all.

/** One state change: from whole frame `at` on, the value is `value`. */
export type HardStepAt<T> = { at: number; value: T };

/** The value at frame f of a list of whole-frame steps (sorted by `at`): the last step with at <= fd(f), else `initial`. */
export const stepValue = <T,>(f: number, steps: HardStepAt<T>[], initial: T): T => {
  const F = fd(f);
  let v = initial;
  for (const s of steps) if (F >= s.at) v = s.value;
  return v;
};

/** A box that snaps between states in whole frames (a selection box, a highlight, an auto-width field). */
export const snapBox = (f: number, steps: HardStepAt<MorphBox>[], initial: MorphBox): Required<MorphBox> => {
  const b = stepValue(f, steps, initial);
  return morphBox(b, b, 1);
};

/** A list that jumps `jump` px every `every` frames from `start`, `count` times (or at explicit frames `at`). */
export type HardListProps = { start?: number; every?: number; count?: number; jump: number; at?: number[] };

/** The frames a hard list jumps on. */
export const hardStepFrames = (p: HardListProps): number[] =>
  p.at ?? Array.from({ length: Math.max(0, p.count ?? 0) }, (_, i) => Math.round((p.start ?? 0) + i * (p.every ?? 1)));

/** Where a hard list is at frame f: `y` px moved (index x jump) and the index of the last jump taken. */
export const hardStepState = (f: number, p: HardListProps): { y: number; index: number } => {
  const F = fd(f);
  const fr = hardStepFrames(p);
  let index = 0;
  for (const a of fr) if (F >= a) index++;
  return { y: index * p.jump, index };
};

/**
 * A list (children laid out in a column, frame px) that moves only in whole-row jumps: up by `jump` px on
 * each of its frames (dir 1), with nothing in between. `x`, `y`, `width`, `height` frame the viewport.
 */
export const HardStep: React.FC<HardListProps & { frame: number; x?: number; y?: number; width: number; height: number; dir?: 1 | -1; children: React.ReactNode; style?: React.CSSProperties }> = ({
  frame,
  x = 0,
  y = 0,
  width,
  height,
  dir = 1,
  children,
  style,
  ...p
}) => {
  const s = hardStepState(frame, p);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden', transform: `translate(${x}px, ${y}px)`, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, transform: `translate3d(0px, ${(-dir * s.y).toFixed(3)}px, 0)` }}>{children}</div>
    </div>
  );
};

/** What a hard list or snap declares: every jump frame as a one-frame designed step. */
export const declares = (p?: (Partial<HardListProps> & { id?: string; steps?: { at: number }[] }) | undefined, _film?: Partial<FilmCtx>): Declares => {
  if (!p) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const frames = p.steps ? p.steps.map((s) => s.at) : p.jump !== undefined ? hardStepFrames(p as HardListProps) : [];
  const stepped: SteppedRange[] = frames.map((a, i) => ({ from: a, to: a + 1, id: `${p.id ?? 'hardStep'}-${i}` }));
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
