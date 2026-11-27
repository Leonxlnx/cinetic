// MorphBox (fx, build / join): one rounded shape becomes the next (a pill, a card, a window), each stage's content
// wiping in behind a soft edge.
// Numbers: 10-14 f a stage, from rest with an exponential tail (expo in-out); the wipe runs from 8 % to 70 % of the stage; old content gone in a quarter
// of it.
// Caution: keep the stages in one surface colour; lay each stage's content out at that stage's size.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, type Ease, mix } from '../../motion';
import { mixLab } from '../../world';
import { t01 } from '../_shared';
import type { TurnBox } from '../turns/_shared';

export type MorphStage = {
  at: number;
  box: TurnBox;
  color: string;
  content?: React.ReactNode;
  dur?: number;
  curve?: Ease;
  /**
   * Content laid out where the stage ends (true) instead of riding the box's top-left corner: the growing box opens onto
   * it like a window, so a frame-sized destination stays still while the box reaches it.
   */
  pinned?: boolean;
};

/** Where a MorphBox is on a frame: the stage index, the stage's progress (t raw, p eased) and the box itself. */
export const morphBoxAt = (stages: MorphStage[], frame: number) => {
  if (!stages.length) return null;
  let k = 0;
  while (k < stages.length - 1 && frame >= stages[k + 1].at) k++;
  const cur = stages[k];
  const prev = k > 0 ? stages[k - 1] : null;
  const t = prev ? t01(frame, cur.at, cur.dur ?? 12) : 1;
  const p = (cur.curve ?? ease.expoInOut)(t);
  const A = prev ? prev.box : cur.box;
  const B = cur.box;
  return { k, t, p, x: mix(p, A.x, B.x), y: mix(p, A.y, B.y), w: mix(p, A.w, B.w), h: mix(p, A.h, B.h), r: mix(p, A.r ?? 0, B.r ?? 0) };
};

/** A soft bottom edge for content taller than the box it shows in: rows dissolve at the moving edge, never cut mid-line. */
const edgeMask = (contentH: number, boxH: number, top: number) => {
  const end = boxH - top;
  if (contentH <= end + 1) return null;
  const fade = Math.max(8, Math.min(56, boxH * 0.3));
  return `linear-gradient(180deg, #000 ${end - fade}px, transparent ${end}px)`;
};
const masks = (...m: (string | null | undefined)[]): React.CSSProperties => {
  const list = m.filter((x): x is string => !!x);
  if (!list.length) return {};
  const v = list.join(', ');
  return list.length > 1
    ? { WebkitMaskImage: v, maskImage: v, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }
    : { WebkitMaskImage: v, maskImage: v };
};

/**
 * MorphBox: one rounded shape that becomes the next (a pill, a card, a window) with no pop: position, size, radius and
 * colour interpolate together, and each stage's colour and content wipe in left to right behind a soft lead edge while
 * the old content clears in the first frames. Content is laid out at the stage's own size, top-left anchored.
 * Measured: 8-14 f per stage on a curve from rest with an exponential tail (`ease.expoInOut` by default); the colour wipe
 * trails the size by ~2 f; old content gone in ~3 f.
 * The clock counts a stage's `at` as its first step: on frame `at` the box has already moved 1/dur of the way, and it
 * lands on `at + dur - 1`. `wipe={false}`: no colour wipe and no mask, the colour blends and the contents dissolve in turn
 * with the box's move (the old one gone by 30 % of it, the new one in from 20 % to 55 %). Content taller than the box (a card folding back into a
 * banner) dissolves at the box's moving bottom edge instead of being cut mid-row. A stage with no content grows as a
 * plain slab of its colour: give the last stage its screen. `morphBoxAt(stages, frame)` gives the box on any frame, to
 * size content or neighbours with it.
 */
export const MorphBox: React.FC<{ stages: MorphStage[]; shadow?: string; wipe?: boolean }> = ({ stages, shadow, wipe = true }) => {
  const frame = useCurrentFrame();
  const at = morphBoxAt(stages, frame);
  if (!at || frame < stages[0].at) return null;
  const { k, t, x, y, w, h, r } = at;
  const cur = stages[k];
  const prev = k > 0 ? stages[k - 1] : null;
  const A = prev ? prev.box : cur.box;
  const B = cur.box;
  // the wipe trails the size a little and finishes at 70 % of the stage, so no soft band lingers on the far edge
  const q = prev ? ease.inOut(clamp((t - 0.08) / 0.62)) : 1;
  const lead = 22;
  const edge = mix(q, -lead, 100 + lead);
  const wipeMask = `linear-gradient(90deg, #000 ${edge - lead}%, transparent ${edge}%)`;
  const bg = prev && !wipe ? mixLab(prev.color, cur.color, q) : cur.color;
  // the old content clears in the first quarter; without the wipe the contents dissolve in turn with the box's own move
  // (old out over the first 30 % of it, new in from 20 % to 55 %), so the two never stand over each other at full
  // strength and the box never stands empty while it has barely moved
  const oldOp = wipe ? 1 - clamp(t / 0.25) : 1 - ease.inOut(clamp(at.p / 0.3));
  const newOp = prev && !wipe ? ease.inOut(clamp((at.p - 0.2) / 0.35)) : 1;
  const ox = cur.pinned ? B.x - B.w / 2 - (x - w / 2) : 0;
  const oy = cur.pinned ? B.y - B.h / 2 - (y - h / 2) : 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x - w / 2}px, ${y - h / 2}px)`, width: w, height: h, borderRadius: r, overflow: 'hidden', boxShadow: shadow, background: prev && wipe ? prev.color : bg }}>
      {prev && wipe && q < 1 && <div style={{ position: 'absolute', inset: 0, background: cur.color, WebkitMaskImage: wipeMask, maskImage: wipeMask }} />}
      {prev && wipe && q >= 1 && <div style={{ position: 'absolute', inset: 0, background: cur.color }} />}
      {prev?.content && oldOp > 0.001 && <div style={{ position: 'absolute', left: 0, top: 0, width: A.w, height: A.h, opacity: oldOp, ...masks(edgeMask(A.h, h, 0)) }}>{prev.content}</div>}
      {cur.content && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: ox || oy ? `translate(${ox}px, ${oy}px)` : undefined,
            width: B.w,
            height: B.h,
            opacity: newOp < 1 ? newOp : undefined,
            ...masks(wipe && q < 1 ? wipeMask : null, edgeMask(B.h, h, oy)),
          }}
        >
          {cur.content}
        </div>
      )}
    </div>
  );
};
