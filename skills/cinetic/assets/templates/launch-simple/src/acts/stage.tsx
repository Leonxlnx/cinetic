// The one stage every act is a window on: at film frame F it draws the world (src/world.tsx: its step for the act, the
// turn flooding out of the element), the scene on screen (src/product.tsx SCENE_DRAW: the house scene for its form or the
// product's own) and, across every scene change, the element itself carried by its handover (fx/Handover: the out
// scene's box at its hand-over frame becoming the in scene's, each under its own camera; content never scaled; the
// scenes hide their own copy while it flies). Scene-internal handovers (same-surface, stay, part) and the camera kinds
// are drawn by the scenes themselves; the handover still declares its track. Nothing here is a cut from a line to a
// card: a change with nothing carried does not exist in this template.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Handover } from '../fx/Handover';
import { clamp, E } from '../lib/anim';
import { useFilm } from '../lib/film';
import { type BoxAt, type HandoverSpec, ownOpacity } from '../lib/handover';
import { SCENE_DRAW } from '../product';
import { ACT, FADE_FROM, FPS, H, HANDOVER_PLAN, type HandoverPlan, handIn, handOut, lineOf, sceneAt, SCENES, SPINE_PLAN, TOTAL, W } from '../timeline';
import { FilmWorld, lookAt, LOOK_A, toneAt } from '../world';
import type { SceneCtx, SceneDef } from './scenes';

/** The drawing of plan scene i (by its name in src/product.tsx SCENE_DRAW). */
export const defOf = (i: number): SceneDef => {
  const d = SCENE_DRAW[SCENES[i].name];
  if (!d) throw new Error(`stage: src/product.tsx SCENE_DRAW has no scene "${SCENES[i].name}" (scene ${i + 1}, form ${SCENES[i].form})`);
  return d;
};

/** What scene i knows at film frame F (its own copy of the element at `own`). */
export const ctxOf = (i: number, F: number, own = 1): SceneCtx => {
  const s = SCENES[i];
  const hi = handIn(i);
  const ho = handOut(i);
  const dur = s.to - s.from;
  const f = F - s.from;
  const land = hi && hi.kind !== 'cut' && hi.kind !== 'entry' ? hi.span[1] - hi.at : 0;
  const leadAt = ho && ho.kind !== 'cut' && ho.kind !== 'entry' ? ho.span[0] - s.from : dur;
  return {
    i,
    f,
    F,
    dur,
    fps: FPS,
    tone: toneAt(F),
    look: lookAt(F),
    land,
    leadAt,
    inP: land ? clamp(f / land) : 1,
    outP: leadAt < dur ? clamp((f - leadAt) / Math.max(1, dur - leadAt)) : 0,
    own,
    line: lineOf(i),
    prev: i > 0 ? { dur: SCENES[i - 1].to - SCENES[i - 1].from } : undefined,
  };
};

/** The handover a scene change plays, as fx/Handover's spec (boxes live on each side, its look sampled at the hand-over frames). */
export const specOf = (h: HandoverPlan): HandoverSpec | null => {
  if (h.kind === 'cut' || h.kind === 'entry') return null;
  const A = defOf(h.from);
  const B = defOf(h.to);
  const a0 = A.el(ctxOf(h.from, h.span[0]));
  const b1 = B.el(ctxOf(h.to, h.span[1]));
  const many = A.many ? (A.many(ctxOf(h.from, h.span[0])) as BoxAt[]) : undefined;
  return {
    kind: h.kind,
    at: h.at,
    element: SPINE_PLAN.element,
    from: { form: h.forms[0], box: (F: number) => A.el(ctxOf(h.from, F)).box, r: a0.r, fill: a0.fill, rim: a0.rim, shadow: a0.shadow, ...(many && many.length > 1 ? { many } : {}) },
    to: { form: h.forms[1], box: (F: number) => B.el(ctxOf(h.to, F)).box, r: b1.r, fill: b1.fill, rim: b1.rim, shadow: b1.shadow },
    ...(h.dir ? { dir: h.dir } : {}),
    id: `${h.forms[0]}>${h.forms[1]}`,
  };
};
/** Every drawn handover's spec (sync.ts declares their tracks), made on first use: never at import, so text is measured
 * only once the film's faces have loaded (FontGate), never cached from a fallback face. */
const specCache = new Map<number, HandoverSpec | null>();
export const specAt = (k: number): HandoverSpec | null => {
  if (!specCache.has(k)) specCache.set(k, HANDOVER_PLAN[k].draws === 'handover' ? specOf(HANDOVER_PLAN[k]) : null);
  return specCache.get(k) ?? null;
};
export const specs = (): (HandoverSpec | null)[] => HANDOVER_PLAN.map((_, k) => specAt(k));

/** The stage at film frame F. */
export const Stage: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const s = sceneAt(F);
  const k = HANDOVER_PLAN.findIndex((h) => h.draws === 'handover' && F >= h.span[0] && F < h.span[1]);
  const h = k >= 0 ? HANDOVER_PLAN[k] : null;
  const spec = k >= 0 ? specAt(k) : null;
  const own = spec && h ? ownOpacity(F, spec, F < h.at ? 'out' : 'in', film) : 1;
  const D = defOf(s.i);
  const c = ctxOf(s.i, F, own);
  let carried: React.ReactNode = null;
  if (h && spec) {
    const A = defOf(h.from);
    const B = defOf(h.to);
    const ca = ctxOf(h.from, F);
    const cb = ctxOf(h.to, F);
    const a0 = A.el(ctxOf(h.from, h.span[0])).box;
    const b1 = B.el(ctxOf(h.to, h.span[1])).box;
    const manyBoxes = A.many ? A.many(ctxOf(h.from, h.span[0])) : [];
    const AC = A.Content;
    const BC = B.Content;
    carried = (
      <Handover
        {...spec}
        frame={F}
        a={AC ? <AC c={ca} w={a0.w} h={a0.h} /> : undefined}
        b={BC ? <BC c={cb} w={b1.w} h={b1.h} /> : undefined}
        many={manyBoxes.length > 1 && AC ? manyBoxes.map((bx, j) => <AC key={j} c={ca} w={bx.w} h={bx.h} />) : undefined}
      />
    );
  }
  // the settle-out: the whole frame into the world's deep tone with the music's ring-out, complete on the last frame
  const fade = E.softIn(clamp((F - FADE_FROM) / Math.max(1, TOTAL - 1 - FADE_FROM)));
  return (
    <FilmWorld F={F}>
      <D.Draw c={c} />
      {carried}
      {fade > 0.001 ? <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, background: lookAt(F).bottom, opacity: fade }} /> : null}
    </FilmWorld>
  );
};

/** One act as a window on the stage (Film.tsx draws one Sequence per act). */
export const actOf = (name: string): React.FC => {
  const Act: React.FC = () => <Stage F={useCurrentFrame() + ACT[name].from} />;
  Act.displayName = `Act ${name}`;
  return Act;
};
/** The film's page colour under everything (the first world's ground). */
export const PAGE = { ground: LOOK_A.bottom };
