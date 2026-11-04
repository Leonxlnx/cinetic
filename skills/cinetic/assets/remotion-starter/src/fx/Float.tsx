// The stage (lib/drift.ts): each act stands on a camera that is still unless the act declares a move. Film.tsx draws
// each act as <ActStage from={ACT[name].from} {...STAGE[name]}>: with no `moves` the act's layer sits exactly on the
// frame (no float, no drift, no idle push); with declared moves (lib/drift stageMove: a push, a pull or a track that
// starts, travels and lands, eased) the act's layer follows them, scaled by bleedFor just enough that its edges never
// show, while the act's ground holds still behind it (fx/Grounds LitGround sits at Depth 0). Inside an act, <Depth z>
// moves a plane z times the declared move (a back layer at 0.6, a near plane at 1.35): the planes part while the move
// runs, parallax without a 3D camera, and rest when it lands. Translation lives in one transform about the frame's
// centre (references/chromium-rendering.md items 1 and 15). Never unclip an act's root to show what it lays out past
// the frame: it paints and blurs everything off screen, and renders crawl (x10 measured).
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { type GroundSpec, LitGround } from './Grounds';
import { useFilm } from '../lib/film';
import { bleedFor, type FloatOpts, stageAt, type StageMove } from '../lib/drift';
import { FloatCtx, T } from './FloatDepth';

export { Depth, useFloat } from './FloatDepth';

/**
 * One act on its stage camera. `from`: the act's first absolute frame (its Sequence's from), so declared moves are in
 * film frames. `o`: stage options shared by every act (lib/drift FloatOpts: its `moves`); `moves`: this act's own
 * declared moves (they add to o.moves). `bleed` (on by default): under a move the act is scaled just enough that its
 * edges never show (1 on a still camera). `amp` is accepted and ignored (there is no float).
 */
export const Float: React.FC<{ from: number; o?: FloatOpts; moves?: readonly StageMove[]; bleed?: boolean; amp?: number | ((F: number) => number); children: React.ReactNode }> = ({ from, o = {}, moves, bleed = true, children }) => {
  const film = useFilm();
  const F = useCurrentFrame() + from;
  const oo: FloatOpts = { moves: [...(o.moves ?? []), ...(moves ?? [])] };
  const s = stageAt(F, oo, film);
  const b = bleed ? bleedFor(oo, film) : 1;
  return (
    <FloatCtx.Provider value={{ s: { ...s, k: s.k * b }, o: oo, bleed: b }}>
      <div className="cinetic-float" data-float={`${s.x.toFixed(3)},${s.y.toFixed(3)},${(s.k * b).toFixed(6)}`} style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, transformOrigin: '50% 50%', transform: T(s.x, s.y, s.k * b) }}>
        {children}
      </div>
    </FloatCtx.Provider>
  );
};

/** How one act stands on the stage (a template's acts/stage.tsx STAGE entry): what ActStage takes beside `from`. */
export type ActGroundOf = GroundSpec | string | ((F: number) => GroundSpec | string | undefined);
export type StageSpec = {
  ground?: ActGroundOf;
  bleed?: boolean;
  /** this act's declared camera moves (lib/drift stageMove), absolute film frames; none: the camera is still */
  moves?: readonly StageMove[];
  /** @deprecated ignored: there is no float */
  amp?: number | ((F: number) => number);
};

/**
 * One act on the film's stage, as Film.tsx draws it: the act on its camera (still, or its declared `moves`), and, for
 * an act moved without bleed, its ground held still behind it (`ground`: the act root's own colour, a GroundSpec, or
 * a function of the absolute frame: what shows at the edge a track moves away from).
 */
export const ActStage: React.FC<StageSpec & { from: number; o?: FloatOpts; children: React.ReactNode }> = ({ from, o, ground, bleed, moves, children }) => {
  const film = useFilm();
  const F = useCurrentFrame() + from;
  const g = typeof ground === 'function' ? ground(F) : ground;
  return (
    <>
      {typeof g === 'string' && <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, background: g }} />}
      {g && typeof g !== 'string' && <LitGround frame={F} spec={g} />}
      <Float from={from} o={o} moves={moves} bleed={bleed}>
        {children}
      </Float>
    </>
  );
};

/** @deprecated the float's amplitude helpers: there is no float, so the amplitude is ignored. Returns 1. */
export const settleAmp = (_from: number, _frames: number, _to = 0) => (_F: number) => 1;
/** @deprecated the float's amplitude helpers: there is no float, so the amplitude is ignored. Returns 1. */
export const dipAmp = (_from: number, _end: number, _low: number, _frames: number) => (_F: number) => 1;
