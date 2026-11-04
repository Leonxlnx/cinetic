import React from 'react';
import { FONT, TYPE, typeStyle } from '../brand/tokens';
import { arrive, arriveK, blurIn, clamp, depart, E, Ease, type Pace, prog } from '../lib/anim';
import { phrase } from '../lib/cadence';
import { mixRgb } from '../lib/color';
import { blurFilter } from './Oversize';
import { f60, f60x, type FilmCtx, fpsOf, paceOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

type Role = keyof typeof TYPE;

/** House numbers of the 1.2 linear-stop head (frames at 30 fps; the pace's fx.mask carries dur and lastScale). */
export const MASK_HOUSE = {
  power: 1.15, // the head speeds up slightly: progress (k / head)^power
  headShare: 0.85, // share of the rise covered by the end of the head
  stop: { share: 0.41, fast: 0.1, slow: 0.76 }, // what is left lands on two decays (per 30 fps frame): a large part in one frame, a quiet last few pixels
  inkPower: 1.5, // the ink darkens slowly first, then fast, over the head
  inkOfHead: 1.14, // the darkening lasts a little longer than the head
} as const;

export type MaskRiseHead = 'ease' | 'linearStop';

export type MaskUnitTiming = {
  start: number; // the unit's 0 frame (it shows from start + 1)
  dur: number; // film frames of its head (linearStop) or of its ease
};

/**
 * One unit's rise progress at frame f (pure): 0 = wholly under the mask, 1 = at rest. 'linearStop': a
 * near-linear head (slightly accelerating) that covers ~85 % of the travel in `dur` frames and stops dead,
 * the rest landing in about one frame and a quiet tail (no ease-out glide: the eye reads a stop).
 * 'ease': the 1.1 rise on `ease`, through arrive().
 */
export type MaskStop = { power?: number; headShare?: number; share?: number; fast?: number; slow?: number };

export const maskProgress = (f: number, u: MaskUnitTiming, head: MaskRiseHead, ease: Ease = E.out, ka = 0.94, fps = 30, stop: MaskStop = {}): number => {
  if (head === 'ease') return arrive(prog(f, u.start, u.start + u.dur, ease), ka);
  const k = f - u.start;
  if (k <= 0) return 0;
  const H = MASK_HOUSE;
  const hs = stop.headShare ?? H.headShare;
  if (k <= u.dur) return hs * (k / u.dur) ** (stop.power ?? H.power);
  const j = (k - u.dur) * (30 / fps); // the stop is written per 30 fps frame
  const sh = stop.share ?? H.stop.share;
  const g = sh * (stop.fast ?? H.stop.fast) ** j + (1 - sh) * (stop.slow ?? H.stop.slow) ** j;
  return 1 - (1 - hs) * g;
};

export type MaskRiseOpts = {
  text: string;
  start: number;
  by?: 'word' | 'line';
  pace?: Pace;
  stagger?: number;
  starts?: number[]; // per unit, its 0 frame (reading order; overrides the phrased onsets from start, `stagger` apart on average)
  dur?: number;
  durs?: number[]; // per unit, film frames
  ease?: Ease; // given: the 1.1 eased head (unless head says otherwise)
  head?: MaskRiseHead; // default the pace's (1.2: linearStop), else 'ease'
  lastScale?: number; // the last unit takes lastScale x dur (pace 1.2: 2.8)
  ink?: { from?: string; to?: string; frames?: number; power?: number }; // the unit darkens from `from` to `to` over 1.14 x its head (or `frames`), progress (k / frames)^power (house 1.5)
  stop?: MaskStop; // linearStop: the head's shape and the stop (house MASK_HOUSE)
  travel?: number; // em the unit rises (default the line box plus the clip padding: it starts wholly under the mask)
  clipBelow?: number; // em of clip under the line box (house 0.26: descenders only); deeper, a unit already shows (light, by its ink) while it is still well under the line
  out?: number;
  outDur?: number;
  blur?: number;
  role?: Role;
  size?: number;
};

export type MaskUnitState = { p: number; raw: number; q: number; y: number; ink: number; color?: string; visible: boolean; start: number; dur: number }; // p: rise progress as drawn; raw: the eased head before arrive() (1.1 blur reads it)

/** The units of a MaskRise in reading order, as the component splits them. */
export const maskUnits = (text: string, by?: 'word' | 'line'): string[][] => {
  const lines = text.split('\n').map((l) => l.split(' '));
  const unit = by ?? (text.split(/\s+/).filter(Boolean).length <= 3 ? 'line' : 'word');
  return lines.map((words) => (unit === 'word' ? words.map((w, wi) => (wi < words.length - 1 ? w + ' ' : w)) : [words.join(' ')]));
};

/**
 * Every unit's state at frame f (pure, closed form): rise progress p, exit q, y offset in em (the travel
 * includes the clip padding), ink progress and colour. Pass the film ({ fps, pace } at least) outside a
 * component.
 */
export const maskRiseState = (f: number, o: MaskRiseOpts, film?: Partial<FilmCtx>): MaskUnitState[] => {
  const fps = fpsOf(film);
  const pace = o.pace ?? paceOf(film);
  const head: MaskRiseHead = o.head ?? (o.ease ? 'ease' : (pace.fx.mask.head ?? 'ease'));
  const stagger = o.stagger ?? f60(pace.fx.mask.stagger, fps);
  const dur = o.dur ?? (head === 'linearStop' ? f60x(pace.fx.mask.dur, fps) : f60(pace.fx.mask.dur, fps));
  const lastScale = o.lastScale ?? (head === 'linearStop' ? (pace.fx.mask.lastScale ?? 1) : 1);
  const outDur = o.outDur ?? f60(pace.fx.mask.exitDur, fps);
  const units = maskUnits(o.text, o.by).flat();
  const n = units.length;
  const lead = TYPE[o.role ?? 'display'].lead;
  const travel = o.travel ?? lead + 0.12 + (o.clipBelow ?? 0.26);
  const ease = o.ease ?? E.out;
  const phrased = phrase(n, stagger, { shape: 'settle', seed: o.text, whole: false }).onsets; // lib/cadence: the span of an even stagger, the last unit after a held beat
  return units.map((_, k): MaskUnitState => {
    const s = o.starts?.[k] ?? o.start + phrased[k];
    const d = o.durs?.[k] ?? (k === n - 1 && n > 1 ? dur * lastScale : dur);
    const ka = head === 'ease' && o.size ? arriveK(travel * o.size, d, ease) : 0.94;
    const p = maskProgress(f, { start: s, dur: d }, head, ease, ka, fps, o.stop);
    const raw = head === 'ease' ? prog(f, s, s + d, ease) : p;
    const oq = o.out === undefined ? Infinity : o.out + k * (stagger / 2);
    const q = o.out === undefined ? 0 : prog(f, oq, oq + outDur, E.in);
    const y = (1 - p) * travel - depart(q) * travel;
    // an explicit ink length is the length of a regular unit: the slower last unit darkens over its own share
    const inkF = o.ink?.frames !== undefined ? o.ink.frames * (d / dur) : d * MASK_HOUSE.inkOfHead;
    const ink = head === 'ease' && !o.ink ? 1 : clamp(Math.max(0, (f - s) / Math.max(1e-6, inkF)) ** (o.ink?.power ?? MASK_HOUSE.inkPower));
    const color = o.ink?.from ? mixRgb(o.ink.from, o.ink.to ?? o.ink.from, ink) : undefined;
    return { p, raw, q, y, ink, color, visible: p > 0 && q < 1, start: s, dur: d };
  });
};

/** Each unit's 0 frame (absolute), for the sound cues (one soft tick per unit at most, thinned). */
export const maskRiseFrames = (o: MaskRiseOpts, film?: Partial<FilmCtx>): number[] => maskRiseState(-Infinity, o, film).map((u) => u.start);

/**
 * Line or word cascade that rises from behind a mask under its baseline: each line sits in its own
 * clip (overflow hidden), and each word (`by="word"`) or whole line (`by="line"`) starts one full
 * line below it, so nothing shows until it crosses the mask's edge. Units start `stagger` frames
 * apart in reading order (or at `starts`).
 *
 * Head (`head`, default the pace's): 'linearStop' (a 1.2 pace) rises near-linearly and STOPS: ~85 % of
 * the travel in the head (pace.fx.mask.dur, 10 f at 60 fps), the rest in about one frame and a quiet tail;
 * the last unit takes `lastScale` x the head (2.8: the payoff word arrives slower), and with `ink` each
 * unit darkens from a light grey to the ink over its head. 'ease' (a 1.1 pace, or an explicit `ease`): the
 * 1.1 rise on `ease`, ending through arrive() at arriveK(), so the rise stops from ~1 px/f at any size
 * (vertical text snaps to whole pixels, so an ease-out tail would tick: references/chromium-rendering.md
 * §15); text lands sharp because nothing scales and blur is off unless asked for (then blurIn clears it
 * by 60%). The exit rises out through the top on E.in (through depart), first word first, at half the
 * stagger. `by` defaults to 'line' for a fragment of up to 3 words and to 'word' above that. The clip is
 * padded 0.12 em on top, 0.26 em under the line box (`clipBelow`) and 0.1 em at the sides, so descenders and
 * overhangs are never shaved on a landed line, and the travel covers the padding. Lines are `\n`-separated; each
 * line's text box carries data-text `${id}.${i}` while any of it is on screen.
 */
export const MaskRise: React.FC<
  MaskRiseOpts & {
    frame: number; // local frame
    id?: string;
    family?: string;
    align?: 'left' | 'center' | 'right';
    style?: React.CSSProperties;
  }
> = ({ text, frame, start, id = 'rise', by, pace: paceProp, stagger, starts, dur, durs, ease, head, lastScale, ink, stop, travel, clipBelow, out, outDur, blur = 0, role = 'display', size: sizeProp, family = FONT.text, align = 'left', style }) => {
  const film = useFilm();
  const pace = paceProp ?? film.pace; // the film's pace (lib/film.ts), unless the prop overrides it
  const size = sizeProp ?? TYPE[role].size * uOf(film);
  const pad = { t: 0.12, b: clipBelow ?? 0.26, x: 0.1 };
  const states = maskRiseState(frame, { text, start, by, pace, stagger, starts, dur, durs, ease, head, lastScale, ink, stop, travel, clipBelow, out, outDur, role, size }, film);
  const lines = maskUnits(text, by);
  let k = -1; // reading-order index of the unit
  const fresh = (head ?? (ease ? 'ease' : (pace.fx.mask.head ?? 'ease'))) === 'linearStop';
  return (
    // a flex column, so the clips' negative margins never collapse into each other
    <div style={{ ...typeStyle(role, size), fontFamily: family, textAlign: align, display: 'flex', flexDirection: 'column', ...style }}>
      {lines.map((units, li) => {
        const ps = units.map(() => states[++k]);
        const onScreen = ps.some((u) => u.p > 0 && u.q < 1);
        return (
          <div key={li} style={{ overflow: 'hidden', padding: `${pad.t}em ${pad.x}em ${pad.b}em`, margin: `-${pad.t}em -${pad.x}em -${pad.b}em` }}>
            <span data-text={onScreen ? `${id}.${li}` : undefined} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
              {units.map((u, ui) => {
                const st = ps[ui];
                const b = blur > 0 ? blurIn(st.raw, blur) : 0;
                return (
                  <span
                    key={ui}
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'pre',
                      // a linear-stop rise rides its own layer (sub-pixel to the stop); the 1.1 rise stays flat
                      transform: fresh ? `translate3d(0, ${st.y.toFixed(5)}em, 0)` : `translateY(${st.y.toFixed(4)}em)`,
                      willChange: fresh && b <= 0.05 ? 'transform' : undefined,
                      filter: b > 0.05 ? blurFilter(b) : undefined,
                      color: st.color,
                      visibility: st.p <= 0 || st.q >= 1 ? 'hidden' : undefined,
                    }}
                  >
                    {u}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** What a MaskRise instance does on purpose (steps, flashes, camera blur, seams): nothing; the stop is a curve, not a step. */
export const declares = (_props?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
