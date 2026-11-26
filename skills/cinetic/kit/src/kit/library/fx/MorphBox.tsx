// MorphBox (fx, build / join): one rounded shape becomes the next (a pill, a card, a window), each stage's content
// wiping in behind a soft edge.
// Numbers: 10-14 f a stage on a quint out; the wipe runs from 8 % to 70 % of the stage; old content gone in a quarter
// of it.
// Caution: keep the stages in one surface colour; lay each stage's content out at that stage's size.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, type Ease, mix } from '../../motion';
import { mixLab } from '../../world';
import { t01 } from '../_shared';
import type { TurnBox } from '../turns/_shared';

export type MorphStage = { at: number; box: TurnBox; color: string; content?: React.ReactNode; dur?: number; curve?: Ease };

/**
 * MorphBox: one rounded shape that becomes the next (a pill, a card, a window) with no pop: position, size, radius and
 * colour interpolate together, and each stage's colour and content wipe in left to right behind a soft lead edge while
 * the old content clears in the first frames. Content is laid out at the stage's own size, top-left anchored.
 * Measured: 8-14 f per stage on a soft out curve; the colour wipe trails the size by ~2 f; old content gone in ~3 f.
 */
export const MorphBox: React.FC<{ stages: MorphStage[]; shadow?: string; wipe?: boolean }> = ({ stages, shadow, wipe = true }) => {
  const frame = useCurrentFrame();
  if (!stages.length || frame < stages[0].at) return null;
  let k = 0;
  while (k < stages.length - 1 && frame >= stages[k + 1].at) k++;
  const cur = stages[k];
  const prev = k > 0 ? stages[k - 1] : null;
  const dur = cur.dur ?? 12;
  const t = prev ? t01(frame, cur.at, dur) : 1;
  const p = (cur.curve ?? ease.soft)(t);
  const A = prev ? prev.box : cur.box;
  const B = cur.box;
  const x = mix(p, A.x, B.x), y = mix(p, A.y, B.y), w = mix(p, A.w, B.w), h = mix(p, A.h, B.h), r = mix(p, A.r ?? 0, B.r ?? 0);
  // the wipe trails the size a little and finishes at 70 % of the stage, so no soft band lingers on the far edge
  const q = prev ? ease.inOut(clamp((t - 0.08) / 0.62)) : 1;
  const lead = 22;
  const edge = mix(q, -lead, 100 + lead);
  const wipeMask = `linear-gradient(90deg, #000 ${edge - lead}%, transparent ${edge}%)`;
  const bg = prev && !wipe ? mixLab(prev.color, cur.color, q) : cur.color;
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, overflow: 'hidden', boxShadow: shadow, background: prev && wipe ? prev.color : bg }}>
      {prev && wipe && q < 1 && <div style={{ position: 'absolute', inset: 0, background: cur.color, WebkitMaskImage: wipeMask, maskImage: wipeMask }} />}
      {prev && wipe && q >= 1 && <div style={{ position: 'absolute', inset: 0, background: cur.color }} />}
      {prev?.content && t < 0.35 && <div style={{ position: 'absolute', left: 0, top: 0, width: A.w, height: A.h, opacity: 1 - clamp(t / 0.25) }}>{prev.content}</div>}
      {cur.content && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: B.w, height: B.h, WebkitMaskImage: q < 1 ? wipeMask : undefined, maskImage: q < 1 ? wipeMask : undefined }}>{cur.content}</div>
      )}
    </div>
  );
};
