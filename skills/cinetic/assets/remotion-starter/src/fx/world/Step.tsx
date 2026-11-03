/**
 * World steps: the world changes one step per act, on the act's cut, and holds its course inside the act. One world a
 * film (one place or field, one ground family); the spine (lib/spine.ts) gives each act its step:
 *
 *   enter      act 1: the camera enters the place (a push of 1.07 that lands at the act's end, front-loaded) and, when
 *              the element has arrived, the lens racks the plate soft behind it (the sharp and the soft copy cross by
 *              opacity: never an animated blur)
 *   closer     a step into the place: a push of 1.09 and a rise, fastest on the cut (it carries the cut), its long tail
 *              landing at the act's end
 *   light      the light moves: the key climbs and brightens (glass, rims and glowing type read it: fx/light), and a pool
 *              of light rises from the floor (fx/light GlowPool)
 *   turn       the film's one colour or value event: a flood grows out of the element (a circle from its centre, the
 *              opposite value of the world by default: a light world turns dark, a dark one light, or a colour given)
 *              and becomes the ground for the acts after it (declared as a colour event)
 *   pull-back  the place wide again for the claim and the lockup: the pushes undone, landing at scale 1 at the act's end (never
 *              below 1: a world smaller than the frame shows the layer under it as a strip at the frame's edges)
 *   hold       nothing changes: the element turns, the world keeps still
 *
 * Every move starts, travels and lands (fastest on its cut, a long settle that ends on the next cut): the world never
 * drifts and never stands dead between two cuts. Moves only on act cuts, always the same way (deeper, higher), never
 * here and back inside an act.
 *
 *   <WorldSteps kind="clouds" src={...} soft={...} steps={stepsFromPlan(SPINE_PLAN, { turnFrom })}>...</WorldSteps>
 *
 * worldStep(f, steps) is the pure state (the move, the rack, the key, the glow, the flood); worldStepDeclares(steps)
 * the moves as declared camera shots and the turn as a colour event.
 */
import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { clamp, E, type Ease } from '../../lib/anim';
import { oklch, toOklch } from '../../lib/color';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../../lib/film';
import { cutCurve } from '../../lib/handover';
import type { SpinePlan, WorldStep } from '../../lib/spine';
import type { ColourRange, Declares } from '../../timeline';
import { bakePlate } from '../Gradients';
import { GlowPool } from '../light/Glow';
import type { Key } from '../light/light';
import { Plate, type PlateMove, plateMove } from './Plate';
import { World, type WorldProps } from './World';
import { type WorldKind, worldOf } from './worlds';

/** House numbers: scales, px at 1080p, shares of the frame, f@60 (each move lands on its act's end when the step knows it). */
export const WORLD_STEP = {
  enter: { scale: 1.07, open: 96, rack: 30, rackAt: 0.4 }, // the rack starts 40 % into the act (when the element has arrived), over 30 f
  closer: { scale: 1.09, rise: 16, lead: 10, land: 120 }, // from 10 f before the cut; 120 f when the act's end is unknown
  light: { up: 0.1, gain: 0.22, dur: 84, pool: { y: 0.94, r: 0.42, ry: 0.16, strength: 0.6 } },
  turn: { dur: 30, lift: 0.04 }, // the flood covers the frame in 30 f (glideOut), its edge a soft 4 % of the frame
  pullBack: { wide: 1, lead: 10, dur: 96 }, // lands at 1: the world always covers the frame (forensics edge-cover)
} as const;

/** One step on an act's cut: `at` the cut, `to` the act's end (the move lands there), `from` where a turn's flood starts (film px), `rack` the frame the enter's rack starts, `color` a turn's colour. */
export type StepAt = { step: WorldStep; at: number; to?: number; from?: { x: number; y: number }; rack?: number; color?: string };

/** The steps of a spine plan, one per act (`turnFrom`: the element's centre on the turn's cut; `rack`: the enter's rack frame). */
export const stepsFromPlan = (plan: SpinePlan, o: { turnFrom?: { x: number; y: number }; rack?: number; turnColor?: string } = {}): StepAt[] =>
  plan.world.map((w) => ({ step: w.step, at: w.at, to: plan.acts[w.act]?.to, ...(w.step === 'turn' && o.turnFrom ? { from: o.turnFrom } : {}), ...(w.step === 'enter' && o.rack !== undefined ? { rack: o.rack } : {}), ...(w.step === 'turn' && o.turnColor ? { color: o.turnColor } : {}) }));

const sorted = (steps: readonly StepAt[]) => [...steps].sort((a, b) => a.at - b.at);
/** A curve fastest on the cut (share uc of the move before it), landing at rest: a move that carries its cut. */
const carrying = (uc: number): Ease => (t: number) => cutCurve(t, uc, E.buildIn, E.glideOut);

/**
 * The world's camera path for the steps: enter, closer and pull-back moves (each starts, travels and lands; scales
 * multiply, shifts add: World push / Plate move). A pull-back undoes the pushes before it and lands at scale 1: the
 * world's scale never falls below 1, so it covers the frame on every frame. Frames at the film's rate. Pure.
 */
export const worldStepMoves = (steps: readonly StepAt[], film?: Partial<FilmCtx>): (PlateMove & { step: WorldStep })[] => {
  const k = fpsOf(film) / 60;
  const moves: (PlateMove & { step: WorldStep })[] = [];
  let scale = 1;
  let rise = 0;
  for (const s of sorted(steps)) {
    if (s.step === 'enter') {
      const S = WORLD_STEP.enter;
      moves.push({ step: s.step, from: s.at, to: Math.max(s.at + 1, s.to ?? Math.round(s.at + S.open * k)), scale: S.scale, ease: E.glideOut });
      scale *= S.scale;
    } else if (s.step === 'closer') {
      const S = WORLD_STEP.closer;
      const from = Math.round(s.at - S.lead * k);
      const to = Math.max(s.at + 1, s.to ?? Math.round(s.at + S.land * k));
      moves.push({ step: s.step, from, to, scale: S.scale, y: S.rise, ease: carrying((s.at - from) / Math.max(1, to - from)) });
      scale *= S.scale;
      rise += S.rise;
    } else if (s.step === 'pull-back') {
      const S = WORLD_STEP.pullBack;
      const from = Math.round(s.at - S.lead * k);
      const to = Math.max(s.at + 1, s.to ?? Math.round(s.at + S.dur * k));
      const wide = Math.max(1, S.wide); // never below the frame
      moves.push({ step: s.step, from, to, scale: wide / scale, y: -rise, ease: carrying((s.at - from) / Math.max(1, to - from)) });
      scale = wide;
      rise = 0;
    }
  }
  return moves;
};

/** The colour a turn floods with: the given one, else the world's opposite value in its own hue (a light world turns deep, a dark one pale). */
export const turnColorOf = (kind: WorldKind, o: { accent?: string; hue?: number; color?: string } = {}) => {
  if (o.color) return o.color;
  const spec = worldOf(kind, { accent: o.accent, hue: o.hue });
  const [, c, h] = toOklch(spec.base);
  return spec.tone === 'light' ? oklch(0.18, Math.min(0.04, c * 1.2), h) : oklch(0.95, Math.min(0.02, c), h); // lint-ok: computed in OKLCH from the world's own hue, not a literal
};

export type WorldStepState = {
  step: StepAt | null; // the latest step started
  move: { s: number; x: number; y: number }; // the world's camera (Plate move)
  rack: number; // 0 sharp .. 1 the soft copy (enter)
  key: { dx: number; dy: number; gain: number }; // the key's climb (shares of the frame) and its extra strength (light)
  glow: { at: number; strength: number } | null; // a pool of light rising from the floor (light)
  turn: { p: number; cx: number; cy: number; r: number; color: string | undefined } | null; // the flood: progress, centre and radius (film px)
};

/** The world at frame f under its steps. Pure and closed form (any frame, any order). */
export const worldStep = (f: number, steps: readonly StepAt[], film?: Partial<FilmCtx>): WorldStepState => {
  const k = fpsOf(film) / 60;
  const { width: W, height: H } = sizeOf(film);
  const list = sorted(steps);
  const moves = worldStepMoves(list, film);
  const move = plateMove(f, moves);
  let step: StepAt | null = null;
  for (const s of list) if (f >= s.at) step = s;
  // enter: the rack, once the element has arrived
  let rack = 0;
  const enter = list.find((s) => s.step === 'enter');
  if (enter) {
    const S = WORLD_STEP.enter;
    const end = enter.to ?? enter.at + S.open * k;
    const r0 = enter.rack ?? Math.round(enter.at + S.rackAt * (end - enter.at));
    rack = E.stdInOut(clamp((f - r0) / Math.max(1, S.rack * k)));
  }
  // light: the key climbs and brightens over the act, front-loaded; the pool turns on at the cut
  let dy = 0;
  let gain = 0;
  let glow: WorldStepState['glow'] = null;
  for (const s of list) {
    if (s.step !== 'light' || f < s.at) continue;
    const S = WORLD_STEP.light;
    const end = s.to ?? s.at + S.dur * k;
    const e = E.glideOut(clamp((f - s.at) / Math.max(1, end - s.at)));
    dy -= S.up * e;
    gain += S.gain * e;
    glow = { at: s.at, strength: S.pool.strength };
  }
  // turn: the flood out of the element, then the ground
  let turn: WorldStepState['turn'] = null;
  const t = list.find((s) => s.step === 'turn');
  if (t && f >= t.at) {
    const S = WORLD_STEP.turn;
    const c = t.from ?? { x: W / 2, y: H / 2 };
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
    const p = E.glideOut(clamp((f - t.at) / Math.max(1, S.dur * k)));
    turn = { p, cx: c.x, cy: c.y, r: far * (1 + S.lift) * p, color: t.color };
  }
  return { step, move, rack, key: { dx: 0, dy, gain }, glow, turn };
};

/**
 * What the steps declare: each move as a camera shot (forensics reads a declared shot as a purposeful move, never a
 * drift) and the turn as a colour event (look-audit pauses its colour ceilings while the flood covers the frame).
 */
export const worldStepDeclares = (steps: readonly StepAt[], film?: Partial<FilmCtx>, o: { id?: string } = {}): Declares & { shots: { from: number; to: number; id: string; kind: string }[] } => {
  const k = fpsOf(film) / 60;
  const id = o.id ?? 'world';
  const shots = worldStepMoves(steps, film).map((m, i) => ({ from: m.from, to: m.to, id: `${id}-${m.step}-${i}`, kind: m.step === 'pull-back' ? 'pull' : 'push' }));
  const colour: ColourRange[] = steps.filter((s) => s.step === 'turn').map((s) => ({ from: s.at, to: Math.round(s.at + Math.max(WORLD_STEP.turn.dur * k + 1, 120 * k)), id: `${id}-turn` }));
  return { stepped: [], flashes: [], cameraBlur: [], seams: [], colour, shots };
};
export const declares = worldStepDeclares;

/** The turned ground: the flood colour lit from the key (a little lighter toward it), baked once at a quarter size and dithered. */
const floodUrl = (color: string, key: Key) => {
  const [L, c, h] = toOklch(color);
  const lit = oklch(Math.min(0.98, L + (L < 0.5 ? 0.09 : 0.03)), c, h);
  return bakePlate('radial', [{ at: 0, color: lit, alpha: 1 }, { at: 0.55, color, alpha: 1 }, { at: 1, color: oklch(Math.max(0.04, L - 0.05), c, h), alpha: 1 }], 480, 270, { cx: clamp(key.x), cy: clamp(key.y, 0, 0.6), rx: 1.1, ry: 1.2 });
};

/**
 * A World that takes its steps: the camera path, the rack onto its soft copy (a plate world with `soft`), the key's climb
 * and a pool of light (light), the flood (turn), then its children. The children are not moved: give them their own move.
 */
export const WorldSteps: React.FC<WorldProps & { steps: StepAt[]; turnColor?: string }> = (p) => {
  const film = useFilm();
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const { width: W, height: H } = sizeOf(film);
  const s = worldStep(f, p.steps, film);
  const base = worldOf(p.kind, { accent: p.accent, hue: p.hue });
  const key0: Key = { ...base.key, ...p.spec?.key };
  const key: Key = { ...key0, x: key0.x + s.key.dx, y: key0.y + s.key.dy, strength: clamp(key0.strength + s.key.gain) };
  const moves = worldStepMoves(p.steps, film);
  const L = WORLD_STEP.light.pool;
  const flood = s.turn ? (s.turn.color ?? p.turnColor ?? turnColorOf(p.kind, { accent: p.accent, hue: p.hue })) : null;
  return (
    <World {...p} push={moves} spec={{ ...p.spec, key }} frame={f}>
      {p.soft && p.src && s.rack > 0.002 ? (
        // the rack: the soft copy over the sharp plate, moving with it (a fixed blur baked in the file, crossed by opacity)
        <div style={{ position: 'absolute', inset: 0, opacity: s.rack }}>
          <Plate src={p.soft} focus={p.focus ?? base.plate?.focus} depth={0} grade={base.grade} move={moves} frame={f} />
        </div>
      ) : null}
      {s.glow ? <GlowPool x={key.x * W} y={L.y * H} r={L.r * W} ry={L.ry * H} strength={s.glow.strength} at={s.glow.at} frame={f} /> : null}
      {s.turn && flood && s.turn.r > 0.5 ? (
        // the flood: the new ground, lit from the key (a baked, dithered plate), revealed by a circle grown from the element
        <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${s.turn.r.toFixed(2)}px at ${s.turn.cx.toFixed(2)}px ${s.turn.cy.toFixed(2)}px)`, background: flood }}>
          {floodUrl(flood, key) ? <Img src={floodUrl(flood, key)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /> : null}
        </div>
      ) : null}
      {p.children}
    </World>
  );
};
