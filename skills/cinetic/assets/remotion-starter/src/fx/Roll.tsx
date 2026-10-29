import React from 'react';
import { FONT, TYPE, typeStyle } from '../brand/tokens';
import { arrive, arriveK, clamp, E, Ease, fd, mix, prog } from '../lib/anim';
import { stepFrame } from '../lib/cadence';
import { f60, type FilmCtx, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';

type Role = keyof typeof TYPE;

/** The value shown from whole frame `at` on. */
export type RollStep = { at: number; value: number };

/**
 * Steps of a count from a to b over [start, start + dur] on `ease`: one step on every whole frame
 * where the shown integer changes, so a fast stretch ticks every frame and the tail slows down.
 * The last value lands on the end frame (the cue the count resolves on) when the slow tail would flip it
 * alone a few frames before (`holdGap` frames or more after the step before it, 3 f at 60 fps): the
 * count holds the value before it until then, because a lone low digit changing in a still frame just
 * before the hit reads as a glitch no cue explains.
 * The step frames are integers: put ticks on them (thin them first if they come every frame:
 * thinSteps).
 */
export const countSteps = (a: number, b: number, start: number, dur: number, ease: Ease = E.out, holdGap: number = Math.max(2, Math.round((3 * fpsOf()) / 60))): RollStep[] => {
  const raw: RollStep[] = [];
  let last = Math.round(a);
  const end = Math.ceil(start + dur);
  for (let F = Math.ceil(start); F <= end; F++) {
    const v = Math.round(mix(a, b, prog(F, start, start + dur, ease)));
    if (v !== last) raw.push({ at: F, value: (last = v) });
  }
  // the slow tail only: the last gap at least holdGap and wider than the one before it (a linear count keeps its pace)
  const n = raw.length;
  const gap = (i: number) => raw[i].at - raw[i - 1].at;
  if (n >= 2 && raw[n - 1].at < end && gap(n - 1) >= holdGap && (n < 3 || gap(n - 1) > gap(n - 2))) raw[n - 1] = { at: end, value: raw[n - 1].value };
  return raw;
};

/** House numbers of a count that grows as it is read: 60 fps frames a step, the growth a step, the share of the total where it jumps. */
export const GROWTH = { every60: 6, ratio: 2.1, jumpAt: 0.55 } as const;

/**
 * A count that grows geometrically while the product reads (0, 1, 2, 4, 9, 19, 41 ... on a step every 6 f at 60
 * fps, x2.1 a step: 1,000 lands inside one bar), then jumps to the total once it passes `jumpAt` of it: "reading
 * 3,412 replies" that accelerates into its payoff instead of rolling at one rate. `within` (film frames) fits the
 * whole count, jump included, inside that window by raising the growth when the house rate would run past it (a
 * one-bar feed). Every step is a whole-frame RollStep (tick the last).
 */
export const growthSteps = (start: number, to: number, o: { every?: number; ratio?: number; jumpAt?: number; from?: number; within?: number } = {}, fps: number = fpsOf()): RollStep[] => {
  const every = ((o.every ?? GROWTH.every60) * fps) / 60;
  const jumpAt = o.jumpAt ?? GROWTH.jumpAt;
  // the steps that fit the window (the first is the start value, the last the jump): growth enough to reach jumpAt by then
  const fit = o.within !== undefined ? Math.max(3, Math.floor(o.within / every) + 1) : 0;
  const need = fit ? Math.exp(Math.log(Math.max(2, to * jumpAt) / Math.max(1, o.from ?? 1)) / Math.max(1, fit - 2)) : 0;
  const ratio = Math.max(o.ratio ?? GROWTH.ratio, need);
  const out: RollStep[] = [{ at: Math.round(start), value: o.from ?? 0 }];
  let v = Math.max(1, o.from ?? 0);
  for (let k = 1; k < 200; k++) {
    const at = Math.round(start + k * every);
    if (v >= to * jumpAt || (fit && k >= fit - 1)) {
      out.push({ at, value: to });
      break;
    }
    const value = Math.max(out[out.length - 1].value + 1, Math.round(v));
    out.push({ at, value: Math.min(value, to) });
    v = Math.max(v * ratio, value + 1);
  }
  return out;
};

/**
 * The steps that get a sound: at most `perSec` a second (default 12), always keeping the last, so a
 * fast count ticks as a steady run instead of a buzz. The picture still rolls every step.
 */
export const thinSteps = (steps: RollStep[], perSec = 12, fps: number = fpsOf()): RollStep[] => {
  const gap = fps / perSec;
  const out: RollStep[] = [];
  steps.forEach((s, i) => {
    const kept = out[out.length - 1];
    if (i === steps.length - 1 && kept && s.at - kept.at < gap) out.pop(); // the last step always sounds
    if (i === steps.length - 1 || !kept || s.at - kept.at >= gap) out.push(s);
  });
  return out;
};

type Slot = { s: number; d: number; at: number }; // strip position, digit (-1 blank), frame it rolls in

/**
 * Rolling digits. Each digit column is a strip inside its own mask (overflow clip, one line tall):
 * when a step changes that column's digit, the strip slides one slot on E.out over `roll` frames,
 * the new digit rising from below as the value grows and dropping from above as it shrinks. Columns
 * that did not change hold still. Steps closer than `roll` overlap and add up, so a fast count
 * (countSteps) spins the low columns at up to one slot per frame and lands each on its own E.out:
 * an odometer, never two numbers crossfaded in place. Defaults from the film's pace
 * (pace.fx.roll, 60 fps): calm roll 18 f and a 90 f count, crisp 14 f and 60 f; the slide
 * starting one frame before its step (already moving on the step frame) and ending through
 * arrive() at arriveK(), because vertical text snaps to whole pixels and an ease-out tail would
 * tick (references/chromium-rendering.md §15): a display digit is home after ~9 f, stopping from
 * ~1 px/f. Digits are tabular and the column count is fixed (`digits`, default the widest value;
 * leading columns blank unless `pad`), so the box never changes width. `group` (e.g. ',')
 * separates thousands, fading with the column to its left. Integers >= 0. A step that reverses
 * direction before the previous slide has landed (~9 f) swaps the digit still leaving that slot
 * for the incoming one; space reversals about `roll` frames apart.
 * Pass `steps` (event counters: references/product-ui.md §4.2) or `to` with `start` and `dur`.
 */
export const Roll: React.FC<{
  frame: number; // local frame
  from: number; // the value before the first step
  steps?: RollStep[];
  to?: number; // count mode: from -> to over [start, start + dur] on `ease`
  start?: number;
  dur?: number;
  ease?: Ease;
  roll?: number;
  digits?: number;
  pad?: boolean;
  group?: string;
  id?: string; // data-text id for the layout audit
  role?: Role;
  size?: number;
  family?: string;
  lead?: number; // mask height and slot pitch, em
  style?: React.CSSProperties;
  hard?: boolean; // hard UI: each step swaps the digits in one frame, no slide (a counter that runs linear and is cut mid-count)
}> = ({ frame, from, steps, to, start = 0, dur: durProp, ease = E.out, roll: rollProp, digits, pad = false, group, id = 'roll', role = 'display', size: sizeProp, family = FONT.text, lead = 1.2, style, hard = false }) => {
  const film = useFilm();
  const dur = durProp ?? f60(film.pace.fx.roll.dur, film.fps);
  const roll = rollProp ?? f60(film.pace.fx.roll.roll, film.fps);
  const size = sizeProp ?? TYPE[role].size * uOf(film);
  const seq = steps ?? (to === undefined ? [] : countSteps(from, to, start, dur, ease));
  const values = [Math.max(0, Math.round(from)), ...seq.map((x) => Math.max(0, Math.round(x.value)))];
  const D = digits ?? Math.max(...values.map((v) => String(v).length));
  const digitOf = (v: number, c: number) => {
    const p = 10 ** (D - 1 - c);
    return pad || p === 1 || v >= p ? Math.floor(v / p) % 10 : -1;
  };
  if (hard) {
    const shown = stepValueOf(frame, values, seq);
    const txt = String(shown).padStart(pad ? D : 0, '0');
    const padded = txt.padStart(D, ' ');
    const grouped = group ? padded.replace(/\B(?=(\d{3})+(?!\d))/g, group) : padded;
    return (
      <span data-text={id} style={{ ...typeStyle(role, size), fontFamily: family, lineHeight: lead, display: 'inline-block', ...style }}>
        {grouped}
      </span>
    );
  }
  const k = arriveK(lead * size, roll, E.out);
  const move = (at: number) => arrive(prog(frame, at - 1, at - 1 + roll, E.out), k);

  const cols = Array.from({ length: D }, (_, c) => {
    const slots: Slot[] = [{ s: 0, d: digitOf(values[0], c), at: -Infinity }];
    let pos = 0;
    for (let e = 1; e < values.length; e++) {
      const d = digitOf(values[e], c);
      if (d === slots[slots.length - 1].d) continue;
      const dir = values[e] > values[e - 1] ? 1 : -1;
      slots.push({ s: slots[slots.length - 1].s + dir, d, at: seq[e - 1].at });
    }
    for (let j = 1; j < slots.length; j++) pos += (slots[j].s - slots[j - 1].s) * move(slots[j].at);
    // A slot is drawn from the moment it starts rolling in until the next one has fully arrived, or
    // until a reversal reuses its strip position (one digit per position, never two overprinted).
    const started = (j: number) => j === 0 || fd(frame) > slots[j].at - 1; // whole frames: blur sub-samples agree
    const live = slots
      .map((sl, j) => ({
        ...sl,
        y: sl.s - pos,
        alive: started(j) && (j === slots.length - 1 || move(slots[j + 1].at) < 1) && !slots.some((o, i) => i > j && o.s === sl.s && started(i)),
      }))
      .filter((sl) => sl.alive && Math.abs(sl.y) < 1);
    const present = clamp(live.reduce((a, sl) => a + (sl.d >= 0 ? 1 - Math.abs(sl.y) : 0), 0));
    return { live, present };
  });

  return (
    <span data-text={id} style={{ ...typeStyle(role, size), fontFamily: family, lineHeight: lead, display: 'inline-flex', ...style }}>
      {cols.map((col, c) => (
        <React.Fragment key={c}>
          <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', height: `${lead}em` }}>
            <span style={{ visibility: 'hidden' }}>0</span>
            {col.live.map((sl) =>
              sl.d < 0 ? null : (
                <span key={sl.s + ':' + sl.at} style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${(sl.y * lead).toFixed(4)}em)` }}>
                  {sl.d}
                </span>
              ),
            )}
          </span>
          {group && c < D - 1 && (D - 1 - c) % 3 === 0 && <span style={{ opacity: col.present }}>{group}</span>}
        </React.Fragment>
      ))}
    </span>
  );
};

/** The value shown at frame f by a list of steps (whole frames). */
const stepValueOf = (frame: number, values: number[], seq: RollStep[]) => {
  const F = fd(frame);
  let v = values[0];
  seq.forEach((x, i) => {
    if (F >= x.at) v = values[i + 1];
  });
  return v;
};

// ---- a count to a value ------------------------------------------------------------------------------
/**
 * A count to a value eases out and settles: `from` -> `to` over [start, start + dur] on `ease` (house E.out: fast,
 * then slowing into its value), its last value landing on the end frame and holding there (countSteps), never a
 * linear tick, which reads as a machine counting (lint-film linear-count). `decimals` counts in tenths or hundredths
 * (1.86 L). The value shown at frame f (whole frames: every motion-blur sub-sample of a frame agrees). Pure.
 */
export const countTo = (f: number, o: { from: number; to: number; start: number; dur: number; ease?: Ease; decimals?: number }): number => {
  const k = 10 ** Math.max(0, Math.round(o.decimals ?? 0));
  const steps = countSteps(o.from * k, o.to * k, o.start, o.dur, o.ease ?? E.out);
  const F = fd(f);
  let v = Math.round(o.from * k);
  for (const s of steps) {
    if (F < s.at) break;
    v = s.value;
  }
  return v / k;
};

// ---- linear counters --------------------------------------------------------------------------------
/**
 * A live rate, never a count to a value (that is countTo): a counter that runs LINEAR: `from` plus `perSec` units per
 * second since `start`, shown rounded down
 * (or to nearest) on every frame, still counting when the shot cuts. Different counters in one frame run
 * at different rates (14 : 5 : 1 reads as live data). `animFps` puts it on a lower source cadence (a 25 fps
 * screen recording inside a 30 fps film holds every sixth frame); `phase` places that grid (film frames).
 */
export type CountLinear = { from: number; perSec: number; start: number; round?: 'floor' | 'round'; animFps?: number; phase?: number; to?: number };

/** The counter at frame f: the exact value, the integer shown, and the source step index. Pure. */
export const countLinear = (f: number, o: CountLinear, film?: Partial<FilmCtx>): { value: number; shown: number; step: number } => {
  const fps = fpsOf(film);
  const g = o.animFps ? stepFrame(f, { animFps: o.animFps, filmFps: fps, phase: o.phase ?? o.start }) : fd(f);
  const t = Math.max(0, g - o.start) / fps;
  let value = o.from + o.perSec * t;
  if (o.to !== undefined) value = o.perSec >= 0 ? Math.min(o.to, value) : Math.max(o.to, value);
  const shown = (o.round ?? 'floor') === 'floor' ? Math.floor(value + 1e-9) : Math.round(value);
  const step = o.animFps ? Math.round(((g - (o.phase ?? o.start)) * o.animFps) / fps) : fd(f) - Math.round(o.start);
  return { value, shown, step };
};

/** A linear counter as Roll steps over frames [a, b] (one step on every frame its shown value changes). */
export const linearSteps = (o: CountLinear, a: number, b: number, film?: Partial<FilmCtx>): RollStep[] => {
  const out: RollStep[] = [];
  let last = countLinear(a - 1, o, film).shown;
  for (let F = Math.ceil(a); F <= Math.floor(b); F++) {
    const v = countLinear(F, o, film).shown;
    if (v !== last) out.push({ at: F, value: (last = v) });
  }
  return out;
};

/**
 * A count-up that lands on its final value in decelerating steps: the last units arrive one per frame,
 * then one every 2, then every 3 frames (`gaps`, frames between the last steps, last first). Returns the
 * steps of the tail only: from `to - gaps.length` up to `to`, ending on `end`.
 */
export const steppedTail = (to: number, end: number, gaps: number[] = [3, 3, 2, 2, 1, 1, 1]): RollStep[] => {
  const out: RollStep[] = [{ at: end, value: to }];
  let at = end;
  gaps.forEach((g, i) => {
    at -= g;
    out.unshift({ at, value: to - 1 - i });
  });
  return out;
};

/**
 * What a Roll declares: nothing in its 1.1 form; a hard linear counter on a source cadence of 12/16/20/30 fps
 * declares that range as stepped (pass the countLinear options as `count` and the range as `from`/`to`).
 */
export const declares = (props?: { count?: CountLinear; from?: number; to?: number; id?: string }, _film?: Partial<FilmCtx>): Declares => {
  const c = props?.count;
  const allowed = [12, 16, 20, 30] as const;
  if (!c?.animFps || props?.from === undefined || props?.to === undefined || !allowed.includes(c.animFps as (typeof allowed)[number])) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const stepped: SteppedRange[] = [{ from: props.from, to: props.to, fps: c.animFps as SteppedRange['fps'], id: props.id ?? 'counter' }];
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
