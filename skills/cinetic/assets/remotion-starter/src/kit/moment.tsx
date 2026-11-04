// The film's one full-frame product moment: the product's own UI, fed by its data module (the brand's strings,
// numbers and pictures; never the kit's samples), filling the frame on a flat field, its parts
// entering on their beats (about two starts a second) and its real state change landing on the hit frame.
// A film carries one at most (house scenes from src/scenes play most product moments now). It is the moment a viewer sees the
// product used, not a stand-in for it (a tile grid, a thin curve on a photo). The camera locks for it or
// creeps under 3 %; typing or a cursor appears only when the product is used that way (pick.py --have input).
import React from 'react';
import { E, fd, prog } from '../lib/anim';
import { f60x, type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import { Surface } from './parts';
import { type KitTheme, kitTheme } from './theme';

/**
 * House numbers: the window's share of the frame (width, height), the starts a second its parts keep
 * (house 2, band 1.9-2.3), a part's entrance (60 fps frames), the hold after the state change (60 fps
 * frames) and the fewest parts that make a moment.
 */
export const MOMENT = { width: 0.88, height: 0.8, startsPerSec: 2, band: [1.9, 2.3], enter60: 14, hold60: 36, minParts: 3 } as const;

export type MomentPart = { id: string; at: number };
export type MomentPlan = { start: number; step: number; parts: MomentPart[]; hit: number; end: number; startsPerSec: number };

/**
 * When each part of the moment enters and when the product's state changes. Parts enter one per `step`
 * frames from `start`: by default the beat, half beat or two beats nearest 1 / MOMENT.startsPerSec s, so
 * the entrances sit on the grid at about two a second. The state change lands one step after the last
 * entrance (or on `hit`); the moment holds `hold` 60 fps frames after it (house 36). Pure.
 */
export const momentPlan = (o: { start: number; parts: string[]; beat: number; step?: number; hit?: number; hold?: number }, film?: Partial<FilmCtx>): MomentPlan => {
  const fps = fpsOf(film);
  const want = fps / MOMENT.startsPerSec;
  const step = o.step ?? [o.beat, o.beat / 2, o.beat * 2].filter((x) => x >= 1).reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) - 1e-9 ? b : a));
  const parts = o.parts.map((id, i) => ({ id, at: Math.round(o.start + i * step) }));
  const last = parts.length ? parts[parts.length - 1].at : o.start;
  const hit = o.hit ?? Math.round(last + step);
  return { start: o.start, step, parts, hit, end: Math.round(hit + f60x(o.hold ?? MOMENT.hold60, fps)), startsPerSec: fps / step };
};

/** A part's entrance and the state change at frame `frame`: on, its entrance 0..1 (E.snapOut), done after the hit. */
export type MomentState = { on: (id: string) => boolean; t: (id: string) => number; done: boolean; doneT: number };

/** The moment at frame `frame` (pure): which parts are on, how far each has entered, whether the state has changed. */
export const momentState = (frame: number, plan: MomentPlan, film?: Partial<FilmCtx>): MomentState => {
  const fps = fpsOf(film);
  const enter = f60x(MOMENT.enter60, fps);
  const at = new Map(plan.parts.map((p) => [p.id, p.at]));
  const start = (id: string) => at.get(id) ?? plan.start;
  return {
    on: (id) => fd(frame) >= start(id),
    t: (id) => (fd(frame) >= start(id) ? prog(frame, start(id) - 1, start(id) - 1 + enter, E.snapOut) : 0),
    done: fd(frame) >= plan.hit,
    doneT: fd(frame) >= plan.hit ? prog(frame, plan.hit - 1, plan.hit - 1 + enter, E.snapOut) : 0,
  };
};

/** A part that cuts on whole at full ink and slides home (`rise` px at 1080p, house 24): spread it on the part's root. */
export const entering = (t: number, rise = 24, u = 1): React.CSSProperties => ({ opacity: t > 0 ? 1 : 0, transform: `translateY(${((1 - t) * rise * u).toFixed(2)}px)` });

/**
 * The full-frame product moment: a flat field (the kit theme's ground: one colour, no texture or plate) and
 * the product's window centred on it at MOMENT.width x MOMENT.height of the frame, lit by the house key.
 * `children(state, box)` draws the product's own UI inside the window (box: its width and height, px):
 * state.t(id) for each part's entrance, state.done for the state that changed on the hit frame.
 */
export const ProductMoment: React.FC<{
  frame: number;
  plan: MomentPlan;
  theme?: KitTheme;
  width?: number; // the window's share of the frame width (house MOMENT.width)
  height?: number;
  lift?: number;
  children: (s: MomentState, box: { w: number; h: number }) => React.ReactNode;
}> = ({ frame, plan, theme, width = MOMENT.width, height = MOMENT.height, lift = 40, children }) => {
  const film = useFilm();
  const t = theme ?? kitTheme();
  const { width: W, height: H } = sizeOf(film);
  const w = Math.round(W * width);
  const h = Math.round(H * height);
  const s = momentState(frame, plan, film);
  return (
    <div data-moment style={{ position: 'absolute', inset: 0, background: t.ground }}>
      <Surface theme={t} w={w} h={h} x={(W - w) / 2} y={(H - h) / 2} r={Math.min(w, h) * 0.04} lift={lift}>
        {children(s, { w, h })}
      </Surface>
    </div>
  );
};
