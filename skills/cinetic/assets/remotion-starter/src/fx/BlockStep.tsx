import React from 'react';
import { clamp } from '../lib/anim';
import type { FilmCtx } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Block step: a hard transition made of flat blocks, one frame each. A block covers part of the old
 * frame (a word, a phrase), the next frame a bigger block somewhere else, then the incoming element
 * appears as a flat silhouette of itself (its exact shape, one colour) that steps back to the real
 * thing in a few even steps (house: 1, 2/3, 1/3, 0 over three frames). Every block frame is a
 * designed flash and the run is stepped (one sample, no shutter blur across it); declares() says so.
 *
 * House numbers: 2 blocks, 1 frame each, the silhouette then 3 frames of linear decay, cut on the hit.
 * The blocks are the film's paper or ink colour (never the accent); each grows from the last.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type BlockStepProps = {
  at: number; // the first block's frame
  blocks: Rect[]; // one rect per frame (frame px)
  hold?: number; // frames each block shows (house 1)
  silhouette?: { rect: Rect; decay?: number; radius?: number }; // the incoming element's box; `decay` frames of even steps back to it (house 3)
  color?: string; // block and silhouette colour (house white)
  id?: string;
};

export type BlockStepState = {
  phase: 'before' | 'block' | 'silhouette' | 'after';
  rect: Rect | null; // the block (or the silhouette's box) drawn on this frame
  opacity: number; // the block's (1) or the silhouette's (stepping down)
  index: number; // which block
  incoming: boolean; // the incoming scene is drawn (from the silhouette frame on)
};

/** The frames of a block step: the first block, the silhouette frame, the first frame after the decay. */
export const blockStepFrames = (p: BlockStepProps) => {
  const hold = Math.max(1, Math.round(p.hold ?? 1));
  const sil = p.at + p.blocks.length * hold;
  const decay = Math.max(0, Math.round(p.silhouette?.decay ?? 3));
  return { at: p.at, silhouette: sil, end: p.silhouette ? sil + decay + 1 : sil };
};

/** The block step at frame f (whole frames: every state is a designed discrete step). Pure. */
export const blockStepState = (f: number, p: BlockStepProps): BlockStepState => {
  const fr = Math.round(f);
  const hold = Math.max(1, Math.round(p.hold ?? 1));
  const t = blockStepFrames(p);
  if (fr < p.at) return { phase: 'before', rect: null, opacity: 0, index: -1, incoming: false };
  if (fr < t.silhouette) {
    const i = Math.floor((fr - p.at) / hold);
    return { phase: 'block', rect: p.blocks[i], opacity: 1, index: i, incoming: false };
  }
  if (!p.silhouette) return { phase: 'after', rect: null, opacity: 0, index: p.blocks.length, incoming: true };
  const decay = Math.max(0, Math.round(p.silhouette.decay ?? 3));
  const k = fr - t.silhouette; // 0 on the silhouette frame
  if (k > decay) return { phase: 'after', rect: null, opacity: 0, index: p.blocks.length, incoming: true };
  return { phase: 'silhouette', rect: p.silhouette.rect, opacity: decay > 0 ? clamp(1 - k / decay) : 1, index: p.blocks.length, incoming: true };
};

/**
 * Renders a block step: `outgoing` until the silhouette frame with the blocks over it, then
 * `incoming` with the silhouette (a flat fill of its box, stepping down) over it. `frame` is local.
 */
export const BlockStep: React.FC<BlockStepProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode }> = (props) => {
  const s = blockStepState(props.frame, props);
  const color = props.color ?? '#FFFFFF';
  const r = props.silhouette?.radius ?? 0;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {s.incoming ? props.incoming : props.outgoing}
      {s.rect && s.opacity > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: s.rect.w,
            height: s.rect.h,
            borderRadius: s.phase === 'silhouette' ? r : 0,
            background: color,
            opacity: s.opacity,
            transform: `translate(${s.rect.x}px, ${s.rect.y}px)`,
          }}
        />
      )}
    </div>
  );
};

/** Every block frame and the silhouette frame are designed flashes; the run is stepped; the silhouette frame is a `stepped` seam. */
export const declares = (p?: Partial<BlockStepProps>, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p || p.at === undefined || !p.blocks) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const id = p.id ?? 'blockStep';
  const t = blockStepFrames(p as BlockStepProps);
  const hold = Math.max(1, Math.round(p.hold ?? 1));
  const flashes = p.blocks.map((_, i) => ({ f: p.at! + i * hold, frames: (hold >= 2 ? 2 : 1) as 1 | 2, id }));
  if (p.silhouette) flashes.push({ f: t.silhouette, frames: 1, id });
  return { stepped: [{ from: p.at, to: Math.max(t.end, p.at + 1), id }], flashes, cameraBlur: [], seams: [{ at: t.silhouette, kind: 'stepped', id }] };
};
