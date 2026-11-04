import React from 'react';
import { C, TYPE } from '../brand/tokens';
import { arrive, arriveK, blurIn, blurOut, clamp, depart, E, type Ease, easeOf, M, type Pace, prog } from '../lib/anim';
import { accel, phrase, reading } from '../lib/cadence';
import { accentFade, accentT, mixColor, mixRgb } from '../lib/color';
import { defocusLevel } from '../lib/defocus';
import { f60, f60x, type FilmCtx, fpsOf, paceOf, uOf, useFilm } from '../lib/film';
import { GRAMMAR } from '../lib/look';
import { settleOf } from '../lib/sync';
import type { Declares, Seam } from '../timeline';
import { type FocusOpts, focusState } from './FocusWord';
import { type SweepOpts, sweepColor } from './HueSweep';
import { type MakeRoomOpts, makeRoomState, type ScaleSnapOpts, scaleSnapState } from './LineSnap';
import { blurFilter, type OversizeOpts, oversizeState } from './Oversize';
import { edgeMask } from './Wipe';

/**
 * Word-by-word reveal of one fragment (1-4 words; a longer thought is a chain: fx/Chain). Every
 * default comes from the film's pace (src/lib/pace.ts), the numbers timeline.ts line() and chain()
 * compute `resolved` from, so COPY matches what renders. Pass `pace={PACE.crisp}` to switch them all.
 *
 * The canonical reveal (a 1.2 pace): each word fades in over `wordDur` (32 f@60) on E.snapOut, a
 * third of its first frame already visible, while it rises a share of the line box (`riseUnit`
 * 'line': 0.33) over `riseDur` (25 f@60) on M.rise; no blur. Words start on the reading cadence (a
 * longer word earns a longer look before the next one; the fragment's total span stays the even one,
 * so `resolved` is unchanged). Each word is its own composited layer, so the rise stays sub-pixel
 * smooth to its last frame. A 1.1 pace (no riseUnit) keeps the 1.1 reveal exactly: the rise rides the
 * fade's curve and stops through arrive() (vertical text snaps to whole pixels without a layer).
 *
 * Cadence: 'phrase' (the house when nothing is named: lib/cadence phrase, the gaps growing into the last
 * word, which lands after a held beat; the span of an even stagger, so `resolved` is unchanged), 'even'
 * (a metronome: only when the device needs it), 'reading', 'accelerate' (gaps shrinking from the stagger
 * to half of it, each word quicker too: a payoff) or a list of gaps in 60 fps frames (ACCEL.rows,
 * ACCEL.montage ...). `starts` still wins when given; `durs` gives each word its own fade.
 *
 * Exits (`exit`, default the pace's):
 *   together    1.1: the fragment fades on E.smooth while it lifts `pace.exitLift` em on E.exit.
 *   words       1.1: word by word at half the stagger, accelerating on E.in, blurring once fast.
 *   launch      the line accelerates out at FULL opacity (E.launchIn over `outDur`, `exitDistance` em
 *               towards `exitDir`) and is cut on its fastest frame: `exitAt` is that last frame (the
 *               next shot starts on exitAt + 1). Declares a velocity seam there. The house distance
 *               shrinks so the fastest frame moves the text at most 20 px/f (exitDistanceEm): the speed
 *               the next shot carries belongs to the camera or the container, not to readable type.
 *   launchFade  the same move with a short fade (`exitFade`, 10 f@60) in its last half, ending on the
 *               move's end: for exits with no cut or mask to hide them.
 *   auto        launch when `exitAt` is given (a cut or mask ends the move), else launchFade.
 * The exit starts on `out` (or, without it, so that the last word's move ends on `exitAt`). With both,
 * the cut may come before the curve ends (a cut mid-move, at speed). `exitOverlap` 1: the next shot
 * already enters on the line's last frame (one frame of overlap; the seam is declared there). `exitOrder` staggers the words:
 * 'rtl' / 'ltr' `exitStagger` apart (2 f@60), 'stagger' 6 f@60 apart left to right, 'together'.
 *
 * Accent (`accent` colour): each word lands in it and cools to `color` (the ink) after `accentHold`,
 * linearly over `accentCool` (pace: 18 + 13 f@60 calm), in `accentSpace` (house OKLab: the hue holds
 * while the chroma falls; an sRGB mix drifts the hue on the way to ink). `accentOn` picks the words (all, first, last, or indices).
 * Oversize (`oversize`): the fragment cuts in larger (house x1.6) and settles to size on M.oversize
 * (fx/Oversize), optionally defocused until a frame; it is anchored at `oversize.origin`.
 *
 * Rows (`breaks`): the word indices that start a new row, so the layout table owns a line's breaks per
 * aspect and a line never wraps on a width that happens to fit. The rows stack left-aligned;
 * `style={{ alignItems: 'center' }}` centres each one. Without `breaks` the line is one row.
 *
 * Transform and opacity only; the line keeps its box on every frame, so nothing laid out around it
 * moves, and carries data-text for scripts/layout-audit.sh only while a word of it is on screen.
 */
export type WordsSpec = {
  text: string;
  start: number; // the frame word 0 begins (it shows from start + 1); word i at start + its cadence offset, or at starts[i]
  starts?: number[];
  breaks?: number[]; // word indices that start a new row (the layout owns the line breaks)
  pace?: Pace;
  stagger?: number; // film frames between word starts (the mean gap on the reading cadence)
  cadence?: 'phrase' | 'even' | 'reading' | 'accelerate' | number[]; // number[]: gaps in 60 fps frames
  accelTo?: number; // 'accelerate': the last gap as a share of the first (default 0.5)
  dur?: number; // film frames of one word's fade
  durs?: number[]; // film frames, per word
  ease?: Ease; // the fade's curve (default the pace's: E.snapOut)
  eases?: Ease[]; // per word (a softer arrival for one word of a fragment)
  rise?: number; // in riseUnit (given without riseUnit: em, its 1.1 meaning; default the pace's rise in the pace's unit)
  riseUnit?: 'em' | 'line';
  riseDur?: number; // film frames of the rise (default the pace's riseDur; a 1.1 pace: the fade's)
  riseEase?: Ease; // default M.rise with a pace riseDur, else the fade's curve
  lead?: number; // line-height in em, for riseUnit 'line' (default 1.1, the line role)
  blur?: number; // px of entry blur (a 1.2 pace: 0)
  size?: number; // px font size (1.1: arriveK; 1.2: px outputs)
  subpixel?: boolean; // composited word layers, no arrive() stop (default: true with a 1.2 pace)
  out?: number; // frame the exit begins
  outDur?: number; // film frames of the exit move
  exit?: 'together' | 'words' | 'launch' | 'launchFade' | 'auto';
  exitAt?: number; // the cut: the last frame the line is drawn (its fastest)
  exitOverlap?: number; // frames the next shot enters before the line's last frame (0 or 1: the overlap grammar); the declared seam moves to exitAt + 1 - exitOverlap
  exitOrder?: 'together' | 'rtl' | 'ltr' | 'stagger';
  exitStagger?: number; // film frames between word exits (rtl/ltr 2 f@60, stagger 6 f@60)
  exitDir?: 'up' | 'down' | 'left' | 'right';
  exitDistance?: number; // em (default 1.25 for launch, shortened so its fastest frame stays under 20 px/f at 1080p; 0.6 for launchFade)
  arriveX?: number | number[]; // em: each word arrives this far beside its slot (positive: from the right) and settles home on an exponential (speech-rhythm builds: 0.1-0.4 em)
  arriveDur?: number; // 60 fps frames until it is 90 % home (house 28: half of it in 8 f, home at 1.6x)
  exitEase?: Ease; // default E.launchIn (launch) / E.buildIn (launchFade)
  exitFade?: number; // film frames of a launchFade's opacity drop (default the pace's exitFade, 10 f@60)
  accent?: string; // the accent colour: words land in it and cool to `color`
  color?: string; // the words' ink, and the one the accent cools to (default: the ink the line inherits; the brand's ink under an accent)
  accentHold?: number; // film frames (default the pace's accentHold, 18 f@60)
  accentCool?: number; // film frames (default the pace's accentCool, 13 f@60)
  accentSpace?: 'srgb' | 'oklab';
  accentEase?: Ease; // the cool's curve (default E.linear: the house transient accent is linear)
  accentOn?: 'all' | 'first' | 'last' | number[];
  oversize?: Partial<Omit<OversizeOpts, 'start'>> & { start?: number };
  focusIn?: boolean | Partial<Omit<FocusOpts, 'start' | 'mode'>>; // each word comes into focus and slides home (fx/FocusWord word mode) instead of the rise
  sweep?: boolean | Partial<Omit<SweepOpts, 'start'>>; // each word inks along the one-hue sweep letter by letter (fx/HueSweep)
  snapLast?: boolean | Partial<ScaleSnapOpts>; // the last word snaps the fragment larger in one frame (fx/LineSnap; `at` default: the frame it shows)
  room?: Partial<Omit<MakeRoomOpts, 'start'>> & { distance: number; lead?: number }; // the words before the last make room for it (fx/LineSnap): px they travel (signed), the jump `lead` frames before it shows
  edgeMask?: { left?: number; right?: number }; // a soft alpha edge for a line scrolling through the frame (fx/Wipe edgeMask), px at 1080p
  id?: string;
};

/** One word's timing (absolute frames). */
export type WordFrame = {
  i: number;
  word: string;
  start: number; // the fade's 0 (the word shows from start + 1)
  dur: number;
  end: number; // start + dur: fully in
  settle: number; // the frame it reads as landed (landedOf: its drawn rise slower than the hold drift; 1.1: 97 % home); its accent hold counts from here
  exitStart: number | null;
  exitEnd: number | null;
};

/** One word's state at a frame. `y` and `x` are em (y down); px when the size is known. */
export type WordState = {
  opacity: number;
  y: number;
  x: number;
  yPx?: number;
  xPx?: number;
  blur: number; // px
  color?: string;
  visible: boolean;
  p: number; // the fade's eased progress
  q: number; // the exit's eased progress
  colors?: string[]; // sweep: per letter
  focus?: boolean; // focusIn: `blur` is px at 1080p, drawn on the defocus ladder
};

export type WordsState = { words: WordState[]; scale: number; blur: number; frames: WordFrame[] };

/** House numbers of the line system's exits and cadence (60 fps frames where marked). */
export const WORDS_HOUSE = { exitDistance: 1.25, fadeDistance: 0.6, exitStagger60: 2, staggerOrder60: 6, exitFade60: 10, accelTo: 0.5, lead: 1.1, maxTextPx: 20, arrive60: 28 } as const;

/**
 * The share of an arrival offset still to travel `t` frames after a word shows, for a settle that is 90 % home after
 * `t90` frames: an exponential (half home at 0.3 x t90, the long tail of speech-paced builds), cut to exactly 0 at 1.6 x t90.
 */
export const settleLeft = (t: number, t90: number): number => {
  if (t <= 0) return 1;
  const tau = Math.max(1e-6, t90) / Math.LN10;
  const end = 1.6 * Math.max(1e-6, t90);
  if (t >= end) return 0;
  const tail = Math.exp(-end / tau);
  return (Math.exp(-t / tau) - tail) / (1 - tail);
};

/**
 * The exit distance in em: `given` when set, else the house distance, which a launch shortens so its fastest frame
 * moves readable text at most WORDS_HOUSE.maxTextPx px a frame at 1080p (the layout audit's text-speed limit: faster
 * full-opacity type turns into a double image). A launchFade keeps its distance: it fades before it is fast.
 */
export const exitDistanceEm = (mode: 'together' | 'words' | 'launch' | 'launchFade', ease: Ease, od: number, px: number, u: number, given?: number): number => {
  if (given !== undefined) return given;
  if (mode !== 'launch') return WORDS_HOUSE.fadeDistance;
  const last = od > 1 ? 1 - ease((od - 1) / od) : 1; // the share of the travel on the move's last frame
  return last > 0 && px > 0 ? Math.min(WORDS_HOUSE.exitDistance, (WORDS_HOUSE.maxTextPx * u) / (last * px)) : WORDS_HOUSE.exitDistance;
};

/**
 * Speed (px/s at 1080p) under which a settling word reads as landed: the fastest house hold drift
 * (GRAMMAR.hold.driftPxS, 6-90 px/s), so what is left of its rise reads as the hold's own life, not
 * as a move.
 */
export const LANDED_PXS: number = GRAMMAR.hold.driftPxS[2];

/** The layout unit of a film when its frame size is known (else undefined: the caller decides). */
export const unitIfKnown = (film?: Partial<FilmCtx>): number | undefined =>
  film?.width !== undefined && film?.height !== undefined ? Math.min(film.width, film.height) / 1080 : undefined;

/**
 * The frame a rise visibly lands (pure): the first whole frame past the curve's fastest step from which
 * the drawn step stays under LANDED_PXS, i.e. the arrive point of the curve at its drawn travel `px`
 * (film px) and `fps`; never later than its 97 % settle. `u` scales the threshold with the frame (1 at
 * 1080p). This is where a fragment's one soft sound and its accent hold count from.
 */
export const landedOf = (s: number, rd: number, ease: Ease, px: number, fps: number, u = 1): number => {
  const settle = rd <= 1 ? Math.ceil(s) + 1 : settleOf(s, s + rd, ease);
  if (!(Math.abs(px) > 0) || rd <= 1) return settle;
  const thr = (LANDED_PXS * u) / fps;
  const step = (f: number) => Math.abs(px) * Math.abs(ease(clamp((f + 1 - s) / rd)) - ease(clamp((f - s) / rd)));
  let peak = Math.ceil(s);
  for (let f = Math.ceil(s); f < settle; f++) if (step(f) > step(peak)) peak = f;
  for (let f = Math.max(peak + 1, Math.floor(s) + 1); f < settle; f++) if (step(f) < thr) return f;
  return settle;
};

const isNew = (p: Pace) => p.riseUnit !== undefined || p.riseDur !== undefined;
const splitWords = (text: string) => text.split(' ');

/**
 * Onsets (offsets from the first word, film frames, whole) and duration scales of n words on a
 * cadence. 'reading' keeps the fragment's even total span ((n - 1) x stagger), so COPY's resolved
 * frame stays exact; 'accelerate' runs geometric gaps from the stagger down to accelTo x it.
 */
export const cadenceOffsets = (
  words: string[],
  cadence: 'phrase' | 'even' | 'reading' | 'accelerate' | number[],
  stagger: number,
  fps: number,
  accelTo: number = WORDS_HOUSE.accelTo,
): { onsets: number[]; durScale: number[] } => {
  const n = words.length;
  const ones = words.map(() => 1);
  if (n <= 1) return { onsets: [0], durScale: [1] };
  if (Array.isArray(cadence)) {
    const on = [0];
    for (let i = 1; i < n; i++) on.push(on[i - 1] + f60x(cadence[Math.min(i - 1, cadence.length - 1)] ?? 0, fps));
    return { onsets: on.map((v) => Math.round(v)), durScale: ones };
  }
  if (cadence === 'reading') {
    const raw = reading(words, stagger, { whole: false });
    const total = (n - 1) * stagger;
    const k = raw[n - 1] > 0 ? total / raw[n - 1] : 1;
    return { onsets: raw.map((v) => Math.round(v * k)), durScale: ones };
  }
  if (cadence === 'accelerate') {
    const a = accel(n, stagger, stagger * accelTo, 'geometric');
    return { onsets: a.onsets, durScale: a.durScale };
  }
  if (cadence === 'phrase') return { onsets: phrase(n, stagger, { shape: 'settle', seed: words.join(' ') }).onsets, durScale: ones };
  return { onsets: words.map((_, i) => Math.round(i * stagger)), durScale: ones };
};

const accentPicked = (on: WordsSpec['accentOn'], i: number, n: number) =>
  on === undefined || on === 'all' ? true : on === 'first' ? i === 0 : on === 'last' ? i === n - 1 : on.includes(i);

/** The resolved knobs of a Words instance (film frames), shared by wordFrames and wordState. */
const knobs = (o: WordsSpec, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const pace = o.pace ?? paceOf(film);
  const fresh = isNew(pace);
  const words = splitWords(o.text);
  const n = words.length;
  const st = o.stagger ?? f60(pace.stagger, fps);
  const cadence = o.cadence ?? pace.cadence ?? 'phrase';
  const cad = cadenceOffsets(words, cadence, cadence === 'reading' ? (o.stagger ?? f60x(pace.stagger, fps)) : st, fps, o.accelTo);
  const d = o.dur ?? f60x(pace.wordDur, fps);
  const e = o.ease ?? easeOf(pace);
  const eases = words.map((_, i) => o.eases?.[i] ?? e);
  const durs = words.map((_, i) => o.durs?.[i] ?? (o.durs ? d : d * (cadence === 'accelerate' ? cad.durScale[i] : 1)));
  const starts = words.map((_, i) => o.starts?.[i] ?? o.start + cad.onsets[i]);
  const riseUnit = o.riseUnit ?? (o.rise !== undefined ? 'em' : (pace.riseUnit ?? 'em')); // an explicit rise without a unit keeps its 1.1 meaning (em)
  const lead = o.lead ?? WORDS_HOUSE.lead;
  const r = o.rise ?? pace.rise;
  const riseEm = riseUnit === 'line' ? r * lead : r;
  const sepRise = o.riseDur !== undefined || o.riseEase !== undefined || pace.riseDur !== undefined;
  const riseDur = o.riseDur ?? (pace.riseDur !== undefined ? f60x(pace.riseDur, fps) : undefined);
  const riseEase = o.riseEase ?? (pace.riseDur !== undefined ? M.rise : e);
  const subpixel = o.subpixel ?? fresh;
  const exit = o.exit ?? pace.exit;
  const mode: 'together' | 'words' | 'launch' | 'launchFade' = exit === 'auto' ? (o.exitAt !== undefined ? 'launch' : 'launchFade') : exit;
  const od = o.outDur ?? f60x(pace.exitDur, fps);
  const order = o.exitOrder ?? (mode === 'words' ? 'stagger' : 'together');
  const es = o.exitStagger ?? f60x(order === 'stagger' ? WORDS_HOUSE.staggerOrder60 : WORDS_HOUSE.exitStagger60, fps);
  const offs = words.map((_, i) => (order === 'together' ? 0 : order === 'rtl' ? (n - 1 - i) * es : i * es));
  const maxOff = Math.max(0, ...offs);
  const base = o.out ?? (o.exitAt !== undefined && (mode === 'launch' || mode === 'launchFade') ? o.exitAt - od - maxOff : undefined);
  const exitEase = o.exitEase ?? (mode === 'launch' ? E.launchIn : E.buildIn);
  const exitFade = o.exitFade ?? f60x(pace.exitFade ?? WORDS_HOUSE.exitFade60, fps);
  return { fps, pace, fresh, words, n, st, d, e, eases, durs, starts, riseEm, sepRise, riseDur, riseEase, subpixel, mode, od, offs, base, exitEase, exitFade };
};

/** Every word's frames (absolute): its start, end, settle (where it reads as landed: landedOf) and exit span. */
export const wordFrames = (o: WordsSpec, film?: Partial<FilmCtx>): WordFrame[] => {
  const k = knobs(o, film);
  return k.words.map((word, i) => {
    const s = k.starts[i];
    const d = k.durs[i];
    let settle: number;
    if ((k.sepRise || k.subpixel) && k.riseEm !== 0) {
      // the drawn rise (as wordState draws it) lands where its step falls under the hold-drift speed
      const rd = k.sepRise ? (k.riseDur ?? d) : d;
      const ease = k.sepRise ? k.riseEase : k.eases[i];
      const u = unitIfKnown(film) ?? (o.size !== undefined ? 1 : uOf(film));
      const travel = k.riseEm * (o.size ?? TYPE.line.size * u);
      const drawn: Ease = k.subpixel ? ease : (t) => arrive(ease(t), o.size ? arriveK(travel, rd, k.riseEase) : 0.94);
      settle = landedOf(s, rd, drawn, travel, k.fps, u);
    } else {
      const onRise = k.sepRise && k.riseEm !== 0; // no rise: the word has landed when its fade is home
      const rd = onRise ? (k.riseDur ?? d) : d;
      settle = rd <= 1 ? s + 1 : settleOf(s, s + rd, onRise ? k.riseEase : k.eases[i]);
    }
    const exitStart = k.base === undefined || k.mode === 'together' || k.mode === 'words' ? (k.base === undefined ? null : k.mode === 'together' ? k.base : k.base + i * (k.st / 2)) : k.base + k.offs[i];
    const exitEnd = exitStart === null ? null : exitStart + k.od;
    return { i, word, start: s, dur: d, end: s + d, settle, exitStart, exitEnd };
  });
};

/**
 * The state of every word of a Words instance at `frame` (pure, closed form; safe under sub-frames
 * and scrubbing). Pass the film context ({ fps, pace } at least) when calling it outside a component.
 */
export const wordState = (frame: number, o: WordsSpec, film?: Partial<FilmCtx>): WordsState => {
  const k = knobs(o, film);
  const frames = wordFrames(o, film);
  const bl = o.blur ?? k.pace.blur;
  const px = o.size;
  const ink = o.color ?? C.ink;
  const hold = o.accentHold ?? f60x(k.pace.accentHold ?? 18, k.fps);
  const cool = o.accentCool ?? f60x(k.pace.accentCool ?? 13, k.fps);
  const dir = o.exitDir ?? 'up';
  const n = frames.length;
  const u = unitIfKnown(film) ?? uOf(film);
  const em = px ?? TYPE.line.size * u; // px per em for px-valued devices
  const dist = exitDistanceEm(k.mode, k.exitEase, k.od, em, u, o.exitDistance);
  const focus = o.focusIn ? (o.focusIn === true ? {} : o.focusIn) : null;
  const sweep = o.sweep ? (o.sweep === true ? {} : o.sweep) : null;
  const snapO = o.snapLast ? (o.snapLast === true ? {} : o.snapLast) : null;
  const snapAt = snapO ? (snapO.at ?? Math.floor(frames[n - 1].start) + 1) : undefined;
  const snap = snapO && snapAt !== undefined ? scaleSnapState(frame, { ...snapO, at: snapAt }, film) : undefined;
  let roomX = 0;
  if (o.room && n > 1) {
    const probe = makeRoomState(0, { ...o.room, start: 0 }, film);
    const start = Math.floor(frames[n - 1].start) + 1 - (o.room.lead ?? 0) - probe.jumpFrame;
    roomX = (makeRoomState(frame, { ...o.room, start }, film).x - o.room.distance) / em; // em still to travel (the words start where they sat before the room opened)
  }
  const words = frames.map((fr, i): WordState => {
    const ei = k.eases[i];
    const p = prog(frame, fr.start, fr.start + fr.dur, ei);
    let y = 0;
    let x = 0;
    let opacity = p;
    let q = 0;
    let blur = 0;
    let visible = frame > fr.start;
    if (!k.sepRise && !k.subpixel) {
      // the 1.1 reveal: the rise rides the fade's curve and stops early (no layer: whole-pixel snapping)
      const kk = px ? arriveK(k.riseEm * px, fr.dur, ei) : 0.94;
      y = (1 - arrive(p, kk)) * k.riseEm;
    } else {
      const rd = k.sepRise ? (k.riseDur ?? fr.dur) : fr.dur;
      const c = prog(frame, fr.start, fr.start + rd, k.sepRise ? k.riseEase : ei);
      y = (1 - (k.subpixel ? c : arrive(c, px ? arriveK(k.riseEm * px, rd, k.riseEase) : 0.94))) * k.riseEm;
    }
    blur = blurIn(p, bl);
    let focused = false;
    if (focus) {
      // focus in: the word shows soft on its first frame and slides home while it sharpens (no rise)
      const fs = focusState(frame, { ...focus, start: fr.start, mode: 'word' }, film).parts[0];
      opacity = fs.opacity;
      y = 0;
      x += (fs.x * u) / em;
      blur = fs.sigma;
      focused = true;
    }
    if (fr.exitStart !== null) {
      if (k.mode === 'together' || k.mode === 'words') {
        const together = k.mode === 'together';
        q = prog(frame, fr.exitStart, fr.exitStart + k.od, together ? E.exit : E.in);
        const fade = prog(frame, fr.exitStart, fr.exitStart + k.od, E.smooth);
        const lift = together ? k.pace.exitLift : k.riseEm * 0.6;
        y -= depart(q) * lift;
        opacity *= 1 - fade;
        blur += together ? 0 : blurOut(q, bl);
      } else {
        q = prog(frame, fr.exitStart, fr.exitStart + k.od, k.exitEase);
        const dq = q * dist;
        if (dir === 'up') y -= dq;
        else if (dir === 'down') y += dq;
        else if (dir === 'left') x -= dq;
        else x += dq;
        const end = fr.exitStart + k.od;
        if (k.mode === 'launchFade') opacity *= 1 - prog(frame, end - k.exitFade, end, E.stdInOut);
        if (frame >= end && (k.mode === 'launchFade' || o.exitAt === undefined)) visible = false; // gone at the move's end (a cut hides it earlier)
      }
    }
    const ax = Array.isArray(o.arriveX) ? (o.arriveX[i] ?? 0) : (o.arriveX ?? 0);
    if (ax) x += ax * settleLeft(frame - fr.start, f60x(o.arriveDur ?? WORDS_HOUSE.arrive60, k.fps));
    if (snap && i === n - 1) {
      opacity = snap.wordOpacity;
      y = (snap.wordY * u) / em / snap.scale; // inside the scaled span: on-screen px divide by the scale
    }
    if (snap && i < n - 1) x += (snap.settleX * u) / em / snap.scale;
    if (o.room && i < n - 1) x += roomX;
    if (o.exitAt !== undefined && frame > o.exitAt) visible = false;
    if (!visible) opacity = 0;
    const colors = sweep ? [...fr.word].map((_, li) => sweepColor(frame, { ...sweep, start: fr.start }, li, fr.word.length, film)) : undefined;
    let color: string | undefined;
    if (o.accent && accentPicked(o.accentOn, i, frames.length)) {
      const a = { accent: o.accent, ink, hold: (hold * 60) / k.fps, cool: (cool * 60) / k.fps, space: o.accentSpace ?? k.pace.accentSpace ?? 'oklab', fps: k.fps };
      if (!o.accentEase) color = accentFade(frame, fr.settle, a);
      else {
        const t = o.accentEase(accentT(frame, fr.settle, a));
        color = a.space === 'srgb' ? mixRgb(o.accent, ink, t) : mixColor(o.accent, ink, t);
      }
    }
    return { opacity, y, x, yPx: px ? y * px : undefined, xPx: px ? x * px : undefined, blur, color, visible, p, q, colors, focus: focused };
  });
  let scale = 1;
  let lineBlur = 0;
  if (o.oversize) {
    const s = oversizeState(frame, { ...o.oversize, start: o.oversize.start ?? frames[0].start + 1 }, film);
    scale = s.scale;
    lineBlur = s.blur;
  }
  if (snap) {
    scale *= snap.scale;
    lineBlur = Math.max(lineBlur, snap.sigma / snap.scale); // drawn on the scaled span
  }
  return { words, scale, blur: lineBlur, frames };
};

export type WordsProps = WordsSpec & {
  frame: number; // local frame
  style?: React.CSSProperties;
  wordStyle?: (i: number, p: number) => React.CSSProperties; // p = that word's 0..1 entrance
};

export const Words: React.FC<WordsProps> = ({ frame, style, wordStyle, ...spec }) => {
  const film = useFilm();
  const id = spec.id ?? 'words';
  const fontPx = spec.size ?? (typeof style?.fontSize === 'number' ? style.fontSize : undefined);
  const lead = spec.lead ?? (typeof style?.lineHeight === 'number' ? style.lineHeight : undefined);
  const s = wordState(frame, { ...spec, size: fontPx, lead }, film);
  const words = splitWords(spec.text);
  const sub = spec.subpixel ?? isNew(spec.pace ?? film.pace);
  const lineBlur = s.blur > 0 ? defocusLevel(s.blur * (film.height / 1080)) : 0;
  const shown = s.words.some((w) => w.opacity > 0.001); // a line whose words are all gone is gone, and untagged: the layout audit reads only lines on screen
  const breaks = spec.breaks ?? [];
  const rows = [0, ...breaks].map((from, j, all) => words.map((_, i) => i).slice(from, all[j + 1] ?? words.length));
  const word = (i: number) => {
    const w = words[i];
    const ws = s.words[i];
    const b = ws.focus ? defocusLevel(ws.blur * (film.height / 1080)) : ws.blur;
    return (
      <span
        key={i}
        style={{
          display: 'inline-block',
          // a sharp word gets its own composited layer on this frame: its rise stays sub-pixel to the last
          // frame (vertical text in a flat layer snaps to whole pixels); a word that blurs is never promoted
          transform: sub ? `translate3d(${ws.x.toFixed(5)}em, ${ws.y.toFixed(5)}em, 0)` : ws.x ? `translate(${ws.x.toFixed(4)}em, ${ws.y.toFixed(4)}em)` : `translateY(${ws.y.toFixed(4)}em)`,
          willChange: sub && b <= 0.05 ? 'transform' : undefined,
          filter: blurFilter(b),
          opacity: ws.opacity,
          color: ws.color,
          ...wordStyle?.(i, ws.p),
        }}
      >
        {ws.colors ? [...w].map((c, li) => <span key={li} style={{ color: ws.colors?.[li] }}>{c}</span>) : w}
        {i < words.length - 1 && !breaks.includes(i + 1) ? ' ' : ''}
      </span>
    );
  };
  return (
    <span
      data-text={shown ? id : undefined}
      style={{
        display: 'inline-flex',
        ...(breaks.length ? { flexDirection: 'column' as const } : {}),
        flexWrap: 'nowrap',
        whiteSpace: 'pre',
        color: spec.color, // the words' ink without an accent too (an accented word overrides it while it cools)
        ...(spec.oversize || spec.snapLast ? { transformOrigin: spec.oversize?.origin ?? 'center', transform: `scale(${s.scale.toFixed(6)})` } : {}),
        filter: lineBlur > 0 ? blurFilter(lineBlur) : undefined,
        ...(spec.edgeMask ? edgeMask({ left: (spec.edgeMask.left ?? 250) * (film.height / 1080), right: spec.edgeMask.right !== undefined ? spec.edgeMask.right * (film.height / 1080) : undefined }) : {}),
        ...style,
        ...(shown ? {} : { opacity: 0 }),
      }}
    >
      {breaks.length
        ? rows.map((row) => (
            <span key={row[0]} style={{ display: 'flex', flexWrap: 'nowrap' }}>
              {row.map(word)}
            </span>
          ))
        : words.map((_, i) => word(i))}
    </span>
  );
};

/** The velocity seam a launch exit makes on its cut (`at` = the next shot's first frame): its axis and direction. */
export const launchSeam = (dir: WordsSpec['exitDir'], at: number, id: string): Seam => ({
  at,
  kind: 'velocity',
  carry: dir === 'left' || dir === 'right' ? 'x' : 'y',
  dir: dir === 'right' || dir === 'down' ? 1 : -1,
  id,
});

/**
 * What a Words instance does on purpose: a launch exit cut on `exitAt` makes a velocity seam on the
 * next frame (the cut); an oversized start that snaps sharp is a designed step; an eased reveal and a
 * fade exit declare nothing.
 */
export const declares = (p?: Partial<WordsSpec>, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p) return out;
  const id = p.id ?? 'words';
  const pace = p.pace ?? (film?.pace as Pace | undefined);
  const exit = p.exit ?? pace?.exit;
  if (p.exitAt !== undefined && (exit === 'launch' || exit === 'auto')) out.seams?.push(launchSeam(p.exitDir ?? 'up', p.exitAt + 1 - (p.exitOverlap ?? 0), id));
  if (p.oversize?.defocus && p.oversize.defocusUntil !== undefined) out.stepped?.push({ from: p.oversize.defocusUntil, to: p.oversize.defocusUntil + 1, id });
  if ((p.snapLast || p.room) && p.text !== undefined && p.start !== undefined) {
    // the scale snap and the make-room jump are designed one-frame steps (fx/LineSnap)
    const fr = wordFrames(p as WordsSpec, film);
    const showLast = Math.floor(fr[fr.length - 1].start) + 1;
    if (p.snapLast) {
      const at = (p.snapLast === true ? undefined : p.snapLast.at) ?? showLast;
      out.stepped?.push({ from: at, to: at + 1, id });
    }
    if (p.room && fr.length > 1) {
      const j = showLast - (p.room.lead ?? 0);
      out.stepped?.push({ from: j, to: j + 1, id });
    }
  }
  return out;
};
