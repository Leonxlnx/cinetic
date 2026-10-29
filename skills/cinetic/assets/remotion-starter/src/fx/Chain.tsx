import React from 'react';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { arrive, arriveK, blurIn, depart, E, type Ease, easeOf, holdFor, M, type Pace, prog, wordCount } from '../lib/anim';
import { accentFade, mixColor } from '../lib/color';
import { DEFOCUS_SHARP, defocusLevel, defocusMix } from '../lib/defocus';
import { copyOf, f60, f60x, type FilmCtx, fpsOf, paceOf, sizeOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { settleOf } from '../lib/sync';
import type { Copy, Declares } from '../timeline';
import { type FocusOpts, focusState } from './FocusWord';
import { type SweepOpts, sweepColor } from './HueSweep';
import { type MakeRoomOpts, makeRoomState, type ScaleSnapOpts, type ScaleSnapState, scaleSnapState } from './LineSnap';
import { blurFilter, type OversizeOpts, oversizeState } from './Oversize';
import { edgeMask } from './Wipe';
import { cadenceOffsets, exitDistanceEm, landedOf, launchSeam, unitIfKnown, WORDS_HOUSE } from './Words';

type Role = keyof typeof TYPE;
const split = (text: string) => text.split(/\s+/).filter(Boolean);
const isNew = (p: Pace) => p.riseUnit !== undefined || p.riseDur !== undefined;

/**
 * The fragments of a chain in order of arrival: the COPY entries whose `chain` is this id (looked up in
 * `copy`, default the film's COPY), or the list itself when one is given.
 */
export const fragmentsOf = (chain: string | Copy[], copy?: Copy[]): Copy[] => {
  if (typeof chain !== 'string') {
    if (!chain.length) throw new Error('Chain: an empty fragment list');
    return [...chain].sort((one, two) => one.in - two.in);
  }
  const list = (copy ?? copyOf()).filter((entry) => entry.chain === chain).sort((one, two) => one.in - two.in);
  if (!list.length) throw new Error(`timeline: no COPY chain "${chain}"`);
  return list;
};

/** One fragment's frames (absolute): `settle` is its last word visibly at rest, where its one soft sound goes. */
export type FragmentFrames = { id: string; text: string; words: number; in: number; settle: number; resolved: number; out: number };

/**
 * The word spans of a fragment that starts at `inF`: [start, end] per word (absolute frames). A 1.1
 * pace keeps the even 1.1 spans; a 1.2 pace uses its cadence (the reading cadence keeps the even total
 * span, so the last word still ends on COPY's resolved).
 */
export const fragmentSpans = (text: string, inF: number, p: Pace, fps: number, cadence?: 'phrase' | 'even' | 'reading' | 'accelerate' | number[]): [number, number][] => {
  const words = split(text);
  if (!isNew(p) && cadence === undefined) return words.map((_, i) => [inF + f60(i * p.stagger, fps), inF + f60(i * p.stagger + p.wordDur, fps)]);
  const cad = cadenceOffsets(words, cadence ?? p.cadence ?? 'phrase', f60x(p.stagger, fps), fps);
  const d = f60x(p.wordDur, fps);
  return words.map((_, i) => [inF + cad.onsets[i], inF + cad.onsets[i] + d * ((cadence ?? p.cadence) === 'accelerate' ? cad.durScale[i] : 1)]);
};

/**
 * Options for chainFrames()/chainResolves(): the type size the chain is drawn at, and the film context
 * (pace, fps, copy, frame size; each defaults to the film's: lib/film.ts).
 */
export type ChainTiming = Partial<FilmCtx> & {
  size?: number; // px the chain is set at (default: the line role at the film's frame size, TYPE.line.size * U)
  role?: Role; // its role (the line box of a 1.2 rise; default 'line')
  cadence?: 'phrase' | 'even' | 'reading' | 'accelerate' | number[];
  subpixel?: boolean; // the words on composited layers (a 1.2 pace's default: true)
  ink?: 'reveal' | 'pop' | 'partial'; // how the words arrive (see ChainSpec)
  inkDur?: number; // film frames of a partial ink (default 10 f@60)
};

/**
 * The frames of each fragment of a chain, in order: its first frame, `settle` (the frame its last
 * word reads as landed, where its one soft `text` sound goes and its accent hold counts from), COPY's
 * `resolved` (every word fully in, what grid-check measures holds from) and `out`. The settle is
 * measured on the rise as Chain draws it, at the size the chain is set at (pass `size` when it is
 * not the line role's): a 1.1 pace draws the rise through arrive() (it stops early; settle = 97 %
 * home); a 1.2 pace rises on M.rise over riseDur on a composited layer, and lands where that rise
 * falls under the hold-drift speed (fx/Words landedOf: 90 px/s at 1080p). 'pop' lands on its first
 * frame, 'partial' when its ink is 97 % in.
 */
export const chainFrames = (chain: string | Copy[], o: ChainTiming = {}): FragmentFrames[] => {
  const p = paceOf(o);
  const fps = fpsOf(o);
  const size = o.size ?? TYPE[o.role ?? 'line'].size * uOf(o);
  const ease = easeOf(p);
  return fragmentsOf(chain, typeof chain === 'string' ? copyOf(o) : undefined).map((c) => {
    const n = wordCount(c.text);
    const spans = fragmentSpans(c.text, c.in, p, fps, o.cadence);
    const [s, e] = spans[Math.max(0, n - 1)];
    let settle: number;
    if (o.ink === 'pop') settle = Math.floor(s) + 1;
    else if (o.ink === 'partial') settle = Math.ceil(s + PARTIAL_LANDED * (o.inkDur ?? f60x(10, fps)));
    else if (isNew(p)) {
      const rd = p.riseDur !== undefined ? f60x(p.riseDur, fps) : e - s;
      const re = p.riseDur !== undefined ? M.rise : ease;
      const travel = (p.riseUnit === 'line' ? p.rise * TYPE[o.role ?? 'line'].lead : p.rise) * size;
      const drawn: Ease = (o.subpixel ?? true) ? re : (t) => arrive(re(t), arriveK(travel, rd, M.rise));
      settle = landedOf(s, rd, drawn, travel, fps, unitIfKnown(o) ?? (o.size !== undefined ? 1 : uOf(o)));
    } else {
      const k = arriveK(p.rise * size, e - s, ease);
      settle = settleOf(s, e, (t) => arrive(ease(t), k));
    }
    return { id: c.id, text: c.text, words: n, in: c.in, settle, resolved: c.resolved, out: c.out };
  });
};

/**
 * The frame each fragment of a chain lands on, for src/sync.ts: one soft `text` sound per fragment,
 * never one per word (a word-by-word patter makes a calm line sound busy). Pass the size the act
 * sets the chain at, so the sound meets the words' visible stop:
 *   chainResolves('statement', { size: STATEMENT_SIZE }).forEach((f, i) => ev.push({ f, kind: 'text', weight: 0.8, id: `statement${i + 1}` }));
 */
export const chainResolves = (chain: string | Copy[], o: ChainTiming = {}) => chainFrames(chain, o).map((x) => x.settle);

export type ChainLayoutOpts = {
  role?: Role;
  size?: number; // px; default the role's size
  family?: string;
  x?: number; // the line's centre (align 'center') or left edge (align 'left'), px in the parent
  top?: number; // top of the line box, px in the parent; default: centred on the frame
  align?: 'center' | 'left';
  tail?: number; // px kept free after the line's last word (a period the act draws), counted in the centring
};

export type ChainLayout = {
  mode: 'build' | 'replace';
  size: number;
  top: number;
  /** Per fragment: its COPY entry, its words, and its offset from the line's left edge (0 in replace mode). */
  frags: { copy: Copy; words: string[]; left: number }[];
  /** Ink-to-ink width of the text once fragments 0..j are on (build) or of fragment j alone (replace), no tail. */
  width: number[];
  /** The line's left edge (px in the parent) once fragments 0..j are on (build) or for fragment j (replace). */
  lineLeft: number[];
};

/**
 * Layout of a chain from the real font (call it under FontGate, like every measurement). The act
 * reads it to place things by the text: the starter seats its dot after the last word with
 * lineLeft[last] + width[last].
 */
export const chainLayout = (chain: string | Copy[], o: ChainLayoutOpts & Partial<Pick<FilmCtx, 'copy' | 'width' | 'height'>> = {}): ChainLayout => {
  const list = fragmentsOf(chain, typeof chain === 'string' ? copyOf(o) : undefined);
  const { width: W, height: H } = sizeOf(o);
  const role = o.role ?? 'line';
  const { weight, track, lead } = TYPE[role];
  const size = o.size ?? TYPE[role].size * uOf(o);
  const family = o.family ?? FONT.text;
  const x = o.x ?? W / 2;
  const tail = o.tail ?? 0;
  const mode = list[0].mode ?? 'build';
  // CSS puts the (negative) tracking after the last glyph too, so a measured line ends one tracking
  // short of its last letter's advance: add it back for the visual width.
  const widthOf = (t: string) => measureTracked(t, size, weight, track, family) - track * size;
  const left = (w: number) => (o.align === 'left' ? x : x - (w + tail) / 2);
  const frags = list.map((copy, j) => ({
    copy,
    words: split(copy.text),
    left: mode === 'build' && j > 0 ? measureTracked(list.slice(0, j).map((c) => c.text).join(' ') + ' ', size, weight, track, family) : 0,
  }));
  const width = list.map((_, j) => widthOf(mode === 'build' ? list.slice(0, j + 1).map((c) => c.text).join(' ') : list[j].text));
  return { mode, size, top: o.top ?? H / 2 - (size * lead) / 2, frags, width, lineLeft: width.map(left) };
};

/** How a build line makes room for each new fragment. */
export type RecentreOpts = {
  chain: string | Copy[];
  copy?: Copy[];
  pace?: Pace;
  recentre?: 'jump' | 'glide' | 'slot' | 'room'; // default the pace's (1.1 pace: glide); 'room': fx/LineSnap make-room (creep, one jump frame, tail)
  room?: Partial<Omit<MakeRoomOpts, 'start' | 'distance'>> & { lead?: number }; // 'room': the creep/jump/tail shape; `lead` film frames the jump comes before the fragment shows (default 0)
  recentreDur?: number; // film frames (default the pace's recentreDur)
  recentreEase?: Ease; // default E.jump (jump, slot) / E.expo (glide)
  recentreLead?: number; // film frames a slot (or a glide) opens before the fragment (slot default 12 f@60)
  align?: 'center' | 'left';
  mode?: 'build' | 'replace'; // default the chain's own
  lineLeft?: number[]; // chainLayout().lineLeft: with it the state also returns the line's left edge x
};

export type RecentreState = {
  glide: number[]; // per fragment: progress 0..1 of the move that makes room for it (0 for the first)
  starts: (number | null)[]; // per fragment: the move's 0 frame (it shows from start + 1); null: no move
  durs: number[]; // film frames
  x?: number; // the line's left edge, px (with lineLeft)
};

/**
 * The re-centre of a build line at absolute frame F (pure, closed form). 'jump' (the 1.2 house):
 * the line moves on the very frame the new fragment's first word shows, most of the way at once (E.jump
 * over 22 f@60: 42 % in the first 60 fps frame, 66 % in the first 30 fps frame), so the new words
 * arrive in open space and never slide sideways. 'glide' (1.1): an exponential glide on E.expo that
 * starts `recentreLead` before the fragment, never before the previous one's hold is over. 'slot': a
 * jump that opens `recentreLead` early (12 f@60), the new words then rise into the open slot.
 */
export const recentreState = (F: number, o: RecentreOpts, film?: Partial<FilmCtx>): RecentreState => {
  const fps = fpsOf(film);
  const pace = o.pace ?? paceOf(film);
  const list = fragmentsOf(o.chain, typeof o.chain === 'string' ? (o.copy ?? copyOf(film)) : undefined);
  const chainMode = o.mode ?? list[0].mode ?? 'build';
  const how = o.recentre ?? pace.recentre ?? 'glide';
  const starts: (number | null)[] = [];
  const durs: number[] = [];
  const glide = list.map((copy, j) => {
    if (chainMode !== 'build' || j === 0 || o.align === 'left') {
      starts.push(null);
      durs.push(0);
      return 0;
    }
    if (how === 'glide') {
      const prev = list[j - 1];
      const start = Math.max(prev.resolved + f60(holdFor(wordCount(prev.text), pace), fps), copy.in - (o.recentreLead ?? f60(pace.recentreLead, fps)));
      const dur = o.recentreDur ?? f60(pace.recentreDur, fps);
      starts.push(start);
      durs.push(dur);
      return prog(F, start, start + dur, o.recentreEase ?? E.expo);
    }
    if (how === 'room') {
      // the make-room move of fx/LineSnap: its one jump frame lands on the frame the fragment shows (less `lead`)
      const ro = o.room ?? {};
      const probe = makeRoomState(0, { ...ro, start: 0, distance: 1 }, film);
      const start = copy.in + 1 - (ro.lead ?? 0) - probe.jumpFrame;
      starts.push(start);
      durs.push(probe.end);
      return makeRoomState(F, { ...ro, start, distance: 1 }, film).p;
    }
    const slotLead = how === 'slot' ? (o.recentreLead ?? f60x(Math.max(pace.recentreLead, 12), fps)) : 0;
    const start = copy.in - slotLead;
    const dur = o.recentreDur ?? f60x(pace.recentreDur, fps);
    starts.push(start);
    durs.push(dur);
    return prog(F, start, start + dur, o.recentreEase ?? E.jump);
  });
  const L = o.lineLeft;
  const x = L ? L[0] + glide.reduce((acc, g, j) => (j ? acc + (L[j] - L[j - 1]) * g : acc), 0) : undefined;
  return { glide, starts, durs, x };
};

/**
 * The re-centre moves of a build chain, for the layout audit and sound: per fragment after the first,
 * its id, the frame the line first moves (`at`, the same frame the fragment's first word shows for a
 * jump), the move's 0 frame and length, and the kind.
 */
export const chainJumps = (chain: string | Copy[], o: Omit<RecentreOpts, 'chain' | 'lineLeft'> = {}, film?: Partial<FilmCtx>) => {
  const list = fragmentsOf(chain, typeof chain === 'string' ? (o.copy ?? copyOf(film)) : undefined);
  const pace = o.pace ?? paceOf(film);
  const s = recentreState(-Infinity, { ...o, chain }, film);
  const kind = o.recentre ?? pace.recentre ?? 'glide';
  return list
    .map((c, j) => ({ id: c.id, start: s.starts[j], dur: s.durs[j], kind }))
    .filter((x): x is { id: string; start: number; dur: number; kind: 'jump' | 'glide' | 'slot' | 'room' } => x.start !== null)
    .map((x) => ({ ...x, at: x.kind === 'room' ? makeRoomState(x.start, { ...(o.room ?? {}), start: x.start, distance: 1 }, film).jumpFrame : Math.floor(x.start) + 1 }));
};

/** A soft edge given in px at 1080p, in the film's px (house left 250). */
const edgesAt = ({ left: edgeL = 250, right: edgeR }: { left?: number; right?: number }, edgeScale: number) => ({ left: edgeL * edgeScale, right: edgeR !== undefined ? edgeR * edgeScale : undefined });

/** The house partial-ink steps of an arriving word (30 fps frames 0..5 after its start): it cuts on part-inked and fills in 4 frames. */
export const INK_PARTIAL = [0, 0.39, 0.62, 0.89, 0.98, 1] as const;
/** Share of a partial ink's length where the word is 97 % inked (where it reads as landed). */
const PARTIAL_LANDED = (3 + (0.97 - INK_PARTIAL[3]) / (INK_PARTIAL[4] - INK_PARTIAL[3])) / (INK_PARTIAL.length - 1);
const partialInk = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const n = INK_PARTIAL.length - 1;
  const i = Math.min(n - 1, Math.floor(t * n));
  const u = t * n - i;
  return INK_PARTIAL[i] + (INK_PARTIAL[i + 1] - INK_PARTIAL[i]) * u;
};

/** Everything Chain draws, per word, without the DOM (x comes from the layout). */
export type ChainSpec = Omit<RecentreOpts, 'lineLeft'> & {
  role?: Role;
  size?: number; // px (the rise of a 1.1 pace stops by it)
  ink?: 'reveal' | 'pop' | 'partial'; // how an arriving word shows: the canonical reveal (default), cut on, or part-inked filling in
  inkDur?: number; // film frames of a partial ink (default 10 f@60)
  inkBlur?: number; // px of blur on a part-inked word's first frame, clearing with the ink (default 0)
  cadence?: 'even' | 'reading' | 'accelerate' | number[]; // default the pace's
  exit?: 'together' | 'words' | 'launch' | 'launchFade' | 'auto'; // default the pace's (see fx/Words)
  exitAt?: number; // the cut: the last frame the line is drawn
  exitOverlap?: number; // frames the next shot enters before the line's last frame (0 or 1); moves the declared seam
  exitOrder?: 'together' | 'rtl' | 'ltr' | 'stagger';
  exitStagger?: number;
  exitDir?: 'up' | 'down' | 'left' | 'right';
  exitDistance?: number; // em
  exitEase?: Ease;
  exitFade?: number;
  outDur?: number; // film frames of the exit move (default the pace's exitDur)
  accent?: 'recency' | 'hold' | 'none' | 'transient';
  accentHold?: number; // film frames (default the pace's)
  accentCool?: number;
  accentSpace?: 'srgb' | 'oklab';
  color?: string;
  accentColor?: string;
  oversizeFirst?: boolean | (Partial<Omit<OversizeOpts, 'start'>> & { start?: number });
  subpixel?: boolean; // composited word layers (default: true with a 1.2 pace)
  snapLast?: boolean | (Partial<ScaleSnapOpts>); // the last fragment snaps the whole line larger in one frame (fx/LineSnap scale snap; `at` default: the frame it shows)
  focusIn?: boolean | Partial<Omit<FocusOpts, 'start' | 'mode'>>; // arriving words come into focus and slide home (fx/FocusWord word mode) instead of the rise
  sweep?: boolean | Partial<Omit<SweepOpts, 'start'>>; // arriving words ink along the one-hue sweep, letter by letter (fx/HueSweep), instead of the fragment colour
  sweepOn?: 'all' | 'last' | number[]; // which fragments sweep (default all)
  edgeMask?: { left?: number; right?: number }; // a soft alpha edge for a line that scrolls through the frame (fx/Wipe edgeMask; house left 250 px at 1080p)
};

export type ChainWordState = { opacity: number; y: number; x: number; blur: number; visible: boolean; colors?: string[]; focus?: boolean };
export type ChainState = {
  recentre: RecentreState;
  frags: { id: string; color: string; scale: number; blur: number; visible: boolean; words: ChainWordState[] }[];
  snap?: ScaleSnapState & { at: number }; // snapLast: the line's scale, the read words' settle (px at 1080p), the line's defocus
};

/**
 * The state of a chain at absolute frame F (pure; no DOM): the re-centre, and per fragment its colour,
 * oversize scale and, per word, opacity, rise (y, em), exit offset (x, em) and blur. x positions of the
 * words come from chainLayout() (the component adds them).
 */
export const chainState = (F: number, o: ChainSpec, film?: Partial<FilmCtx>): ChainState => {
  const fps = fpsOf(film);
  const pace = o.pace ?? paceOf(film);
  const fresh = isNew(pace);
  const list = fragmentsOf(o.chain, typeof o.chain === 'string' ? (o.copy ?? copyOf(film)) : undefined);
  const rec = recentreState(F, o, film);
  const ease = easeOf(pace);
  const role = o.role ?? 'line';
  const size = o.size ?? TYPE[role].size * uOf(film);
  const timing = { pace, fps, size, role, cadence: o.cadence, subpixel: o.subpixel ?? fresh, ink: o.ink, inkDur: o.inkDur, copy: o.copy ?? (typeof o.chain === 'string' ? copyOf(film) : undefined), width: film?.width, height: film?.height };
  const settles = chainFrames(o.chain, timing).map((x) => x.settle);
  const od = o.outDur ?? f60x(pace.exitDur, fps);
  const exit = o.exit ?? pace.exit;
  const exitMode: 'together' | 'words' | 'launch' | 'launchFade' = exit === 'auto' ? (o.exitAt !== undefined ? 'launch' : 'launchFade') : exit;
  const last = list.length - 1;
  const accent = o.accent ?? (pace.accentHold !== undefined ? 'transient' : 'recency');
  const color = o.color ?? C.ink;
  const accentColor = o.accentColor ?? C.accent;
  const hold = o.accentHold ?? f60x(pace.accentHold ?? 18, fps);
  const cool = o.accentCool ?? f60x(pace.accentCool ?? 13, fps);
  const riseEm = pace.riseUnit === 'line' ? pace.rise * TYPE[role].lead : pace.rise;
  const sub = o.subpixel ?? fresh;
  const ink = o.ink ?? 'reveal';
  const inkDur = o.inkDur ?? f60x(10, fps);
  const order = o.exitOrder ?? (exitMode === 'words' ? 'stagger' : 'together');
  const es = o.exitStagger ?? f60x(order === 'stagger' ? WORDS_HOUSE.staggerOrder60 : WORDS_HOUSE.exitStagger60, fps);
  const dir = o.exitDir ?? 'up';
  const exitEase = o.exitEase ?? (exitMode === 'launch' ? E.launchIn : E.buildIn);
  const exitFade = o.exitFade ?? f60x(pace.exitFade ?? WORDS_HOUSE.exitFade60, fps);
  const u = unitIfKnown(film) ?? uOf(film);
  const dist = exitDistanceEm(exitMode, exitEase, od, size, u, o.exitDistance);
  const snapO = o.snapLast ? (o.snapLast === true ? {} : o.snapLast) : null;
  const snapAt = snapO ? (snapO.at ?? list[last].in + 1) : undefined;
  const snap = snapO && snapAt !== undefined ? { ...scaleSnapState(F, { ...snapO, at: snapAt }, film), at: snapAt } : undefined;
  const focus = o.focusIn ? (o.focusIn === true ? {} : o.focusIn) : null;
  const sweep = o.sweep ? (o.sweep === true ? {} : o.sweep) : null;
  const sweeps = (j: number) => !!sweep && (o.sweepOn === undefined || o.sweepOn === 'all' ? true : o.sweepOn === 'last' ? j === last : o.sweepOn.includes(j));
  const frags = list.map((copy, j) => {
    const words = split(copy.text);
    const spans = fragmentSpans(copy.text, copy.in, pace, fps, o.cadence);
    const n = words.length;
    const offs = words.map((_, i) => (order === 'together' ? 0 : order === 'rtl' ? (n - 1 - i) * es : i * es));
    const maxOff = Math.max(0, ...offs);
    const base = exitMode === 'launch' || exitMode === 'launchFade' ? (o.exitAt !== undefined && (copy.out === undefined || copy.out === null) ? o.exitAt - od - maxOff : copy.out) : copy.out;
    let fragColor: string;
    if (accent === 'none') fragColor = mixColor(color, color, 0);
    else if (accent === 'hold' && j === last) fragColor = mixColor(accentColor, accentColor, 0);
    else if (accent === 'transient') fragColor = accentFade(F, settles[j], { accent: accentColor, ink: color, hold: (hold * 60) / fps, cool: (cool * 60) / fps, space: o.accentSpace ?? pace.accentSpace ?? 'oklab', fps });
    else fragColor = mixColor(accentColor, color, prog(F, settles[j], settles[j] + f60(pace.accentDur, fps), E.smooth)); // 1.1 recency (and the earlier fragments of 'hold')
    let scale = 1;
    let fblur = 0;
    if (j === 0 && o.oversizeFirst) {
      const ov = o.oversizeFirst === true ? {} : o.oversizeFirst;
      const s = oversizeState(F, { ...ov, start: ov.start ?? spans[0][0] + 1 }, film);
      scale = s.scale;
      fblur = s.blur;
    }
    let anyVisible = false;
    const ws = words.map((_, i): ChainWordState => {
      const [s, e] = spans[i];
      let opacity: number;
      let y = 0;
      let x = 0;
      let blur = 0;
      if (ink === 'pop') opacity = F > s ? 1 : 0;
      else if (ink === 'partial') {
        opacity = partialInk((F - s) / Math.max(1e-6, inkDur));
        if (o.inkBlur) blur = o.inkBlur * (1 - opacity);
      } else {
        const p = prog(F, s, e, ease);
        opacity = p;
        if (fresh) {
          const rd = pace.riseDur !== undefined ? f60x(pace.riseDur, fps) : e - s;
          const c = prog(F, s, s + rd, pace.riseDur !== undefined ? M.rise : ease);
          y = (1 - (sub ? c : arrive(c, arriveK(riseEm * size, rd, M.rise)))) * riseEm;
        } else y = (1 - arrive(p, arriveK(pace.rise * size, e - s, ease))) * pace.rise;
        blur = blurIn(p, pace.blur);
      }
      let colors: string[] | undefined;
      if (focus && ink === 'reveal') {
        // focus in: the word shows soft on its first frame and slides home while it sharpens (no rise)
        const fs = focusState(F, { ...focus, start: s, mode: 'word' }, film).parts[0];
        opacity = fs.opacity;
        y = 0;
        x += (fs.x * u) / size;
        blur = fs.sigma; // px at 1080p: the component draws it on the defocus ladder
      }
      if (snap && j === last) {
        // the snapped word fades in from 16 % with a small rise (the line itself jumps larger)
        opacity = snap.wordOpacity;
        y = (snap.wordY * u) / size / snap.scale; // inside the scaled line: on-screen px divide by the scale
      }
      if (snap && j < last) x += (snap.settleX * u) / size / snap.scale;
      if (sweeps(j)) {
        const w = words[i];
        colors = [...w].map((_, li) => sweepColor(F, { ...sweep, start: s }, li, w.length, film));
      }
      let visible = F > s;
      if (exitMode === 'together' || exitMode === 'words') {
        const o0 = exitMode === 'words' ? copy.out + f60((i * pace.stagger) / 2, fps) : copy.out;
        const exitDur = o.outDur ?? f60(pace.exitDur, fps);
        const q = prog(F, o0, o0 + exitDur, E.exit); // the lift accelerates away
        const fade = prog(F, o0, o0 + exitDur, E.smooth); // the fade has no pop at either end
        y -= depart(q) * pace.exitLift;
        opacity *= 1 - fade;
        if (F >= o0 + exitDur) visible = false; // gone: unmounted, so a left fragment is no longer on screen to the audits
      } else if (base !== undefined && base !== null) {
        const st = base + offs[i];
        const q = prog(F, st, st + od, exitEase);
        const dq = q * dist;
        if (dir === 'up') y -= dq;
        else if (dir === 'down') y += dq;
        else if (dir === 'left') x -= dq;
        else x += dq;
        const end = st + od;
        if (exitMode === 'launchFade') opacity *= 1 - prog(F, end - exitFade, end, E.stdInOut);
        if (F >= end && (exitMode === 'launchFade' || o.exitAt === undefined)) visible = false;
      }
      if (o.exitAt !== undefined && F > o.exitAt) visible = false;
      if (!visible) opacity = 0;
      anyVisible = anyVisible || visible;
      return { opacity, y, x, blur, visible, colors, focus: !!focus && ink === 'reveal' };
    });
    return { id: copy.id, color: fragColor, scale, blur: fblur, visible: anyVisible, words: ws };
  });
  return { recentre: rec, frags, snap };
};

/**
 * A chain of copy fragments (timeline.ts chain()): one thought arriving 1-4 words at a time, with
 * the picture taking its turn between fragments. Two modes, from COPY:
 *   build    fragments append to one held line. A centred line makes room for each new fragment
 *            (`recentre`): 'jump' (the 1.2 house: on the very frame the new word shows, 66 % of the
 *            way in the first 30 fps frame on E.jump, 22 f@60), 'glide' (1.1: E.expo, `pace.recentreLead`
 *            early) or 'slot' (a jump 12 f@60 early, the words then rise into the open slot). The words
 *            already read ride the move; the arriving ones never move sideways.
 *   replace  each fragment holds the line's place alone; it leaves over `pace.exitDur` and is gone
 *            before the next one rises (timeline.ts chain() times `out` for that).
 * Arrival (`ink`): the canonical word reveal (a 1.2 pace: 32 f@60 on E.snapOut while rising a third of
 * the line box on M.rise, on the reading cadence; a 1.1 pace: the 1.1 reveal), 'pop' (cut on at full
 * ink, no rise: pairs with a jump) or 'partial' (cut on part-inked, filling in over 10 f@60:
 * INK_PARTIAL). Exit: as fx/Words (together and words are 1.1; launch cuts at full opacity on
 * `exitAt`; launchFade; auto). Colour (`accent`): 'transient' (a 1.2 pace's default: the newest
 * fragment lands in the accent, holds `accentHold`, cools linearly to ink over `accentCool`), 'recency'
 * (1.1: an eased relax over accentDur), 'hold' (the last fragment keeps the accent: the payoff), 'none'.
 * `oversizeFirst` lands the first fragment oversized (fx/Oversize). Each fragment's span carries
 * data-text = its COPY id (scripts/layout-audit.sh matches it to its reading window). Transform-only
 * placement; fractional frames are exact.
 */
export const Chain: React.FC<
  ChainLayoutOpts &
    Omit<ChainSpec, 'role' | 'size' | 'align' | 'copy'> & {
      chain: string | Copy[]; // a COPY chain id (looked up in the film's copy) or the fragments themselves
      frame: number; // local frame
      from?: number; // the act's first frame (absolute): COPY frames are absolute
      style?: React.CSSProperties;
    }
> = ({ chain, frame, from = 0, style, role: roleProp, size: sizeProp, family: familyProp, x: xProp, top, align, tail, ...spec }) => {
  const film = useFilm();
  const pace = spec.pace ?? film.pace;
  const F = frame + from;
  const lo: ChainLayoutOpts = { role: roleProp, size: sizeProp, family: familyProp, x: xProp, top, align, tail };
  const L = chainLayout(chain, { ...lo, copy: film.copy, width: film.width, height: film.height });
  const role = roleProp ?? 'line';
  const family = familyProp ?? FONT.text;
  const S = chainState(F, { ...spec, pace, chain, role, size: L.size, align, mode: L.mode, copy: film.copy }, film);
  const rec = recentreState(F, { ...spec, pace, chain, align, mode: L.mode, copy: film.copy, lineLeft: L.lineLeft }, film);
  const lineX = rec.x ?? L.lineLeft[0];
  const sub = spec.subpixel ?? isNew(pace);
  const u = film.height / 1080;
  const lastJ = L.frags.length - 1;
  const lineCx = L.lineLeft[lastJ] + L.width[lastJ] / 2;
  const lineCy = L.top + (L.size * TYPE[role].lead) / 2;
  const mask = spec.edgeMask ? edgeMask(edgesAt(spec.edgeMask, film.height / 1080)) : undefined;
  const frags = (copyKey: number) =>
    L.frags.map(({ copy, words, left }, j) => {
        const fs = S.frags[j];
        if (!fs.visible && F > copy.in) return null;
        if (F < copy.in - 1) return null;
        // build: the line's place, minus the share of its own move (an arriving fragment stays put)
        const x = L.mode === 'build' ? lineX + left + (j ? (L.lineLeft[j] - L.lineLeft[j - 1]) * (1 - rec.glide[j]) : 0) : L.lineLeft[j];
        const fblur = fs.blur > 0 ? defocusLevel(fs.blur * u) : 0;
        return (
          <span
            key={`${copy.id}.${copyKey}`}
            data-text={copyKey === 0 ? copy.id : undefined}
            style={{
              ...typeStyle(role, L.size),
              fontFamily: family,
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'inline-flex',
              flexWrap: 'nowrap',
              color: fs.color,
              transformOrigin: fs.scale !== 1 ? 'center' : undefined,
              transform: `translate(${x.toFixed(3)}px, ${L.top.toFixed(3)}px)${fs.scale !== 1 ? ` scale(${fs.scale.toFixed(6)})` : ''}`, // flat: the words below carry the layers (a layer inside a layer snaps to whole pixels)
              filter: fblur > 0 ? blurFilter(fblur) : undefined,
            }}
          >
            {words.map((w, i) => {
              const ws = fs.words[i];
              const b = ws.blur > 0 ? (spec.ink === 'partial' || ws.focus ? defocusLevel(ws.blur * u) : ws.blur) : 0;
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    transform: sub ? `translate3d(${ws.x.toFixed(5)}em, ${ws.y.toFixed(5)}em, 0)` : ws.x ? `translate(${ws.x.toFixed(4)}em, ${ws.y.toFixed(4)}em)` : `translateY(${ws.y.toFixed(4)}em)`,
                    willChange: sub && b <= 0.05 ? 'transform' : undefined, // a sharp word on its own layer; a blurring one never
                    filter: blurFilter(b),
                    opacity: ws.opacity,
                  }}
                >
                  {ws.colors ? [...w].map((c, li) => <span key={li} style={{ color: ws.colors?.[li] }}>{c}</span>) : w}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </span>
        );
      });
  if (!S.snap) return <div style={{ position: 'absolute', left: 0, top: 0, ...mask, ...style }}>{frags(0)}</div>;
  // snapLast: the whole line jumps larger about its finished centre in one frame; a short defocus clears on
  // at most two fixed ladder copies (the group faded as one), wrapped round the scale so the radii are
  // on-screen px (inside a x2.2 scale every on-screen sigma under about 1.1 px would draw sharp); the two copies
  // add in an isolated group (plus-lighter, each at its weight), the weighted mix of a transparent text layer
  const sn = S.snap;
  const copies = sn.sigma * u >= DEFOCUS_SHARP ? defocusMix(sn.sigma * u) : [{ level: 0, weight: 1 }];
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, isolation: copies.length > 1 ? 'isolate' : undefined, ...mask, ...style }}>
      {copies.map((c, k) => (
        <div key={k} style={{ position: 'absolute', left: 0, top: 0, opacity: c.weight, filter: c.level > 0 ? blurFilter(c.level) : undefined, mixBlendMode: k > 0 ? 'plus-lighter' : undefined }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${lineCx.toFixed(2)}px ${lineCy.toFixed(2)}px`, transform: `scale(${sn.scale.toFixed(6)})` }}>{frags(k)}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * What a Chain instance does on purpose: a launch exit cut on `exitAt` makes a velocity seam on the
 * next frame; an oversized first fragment that snaps sharp is a designed step. Re-centre jumps are
 * decisive moves of read text, listed by chainJumps() for the layout audit (not a step, flash or seam).
 */
export const declares = (p?: Partial<ChainSpec> & { id?: string }, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p) return out;
  const id = p.id ?? (typeof p.chain === 'string' ? p.chain : 'chain');
  const pace = p.pace ?? (film?.pace as Pace | undefined);
  const exit = p.exit ?? pace?.exit;
  if (p.exitAt !== undefined && (exit === 'launch' || exit === 'auto')) out.seams?.push(launchSeam(p.exitDir ?? 'up', p.exitAt + 1 - (p.exitOverlap ?? 0), id));
  const ov = typeof p.oversizeFirst === 'object' ? p.oversizeFirst : undefined;
  if (ov?.defocus && ov.defocusUntil !== undefined) out.stepped?.push({ from: ov.defocusUntil, to: ov.defocusUntil + 1, id });
  if (p.chain !== undefined && (p.recentre === 'room' || p.snapLast)) {
    // the make-room jump frames and the scale snap are designed one-frame steps (fx/LineSnap)
    if (p.recentre === 'room') for (const j of chainJumps(p.chain, { ...p, recentre: 'room' }, film)) out.stepped?.push({ from: j.at, to: j.at + 1, id });
    if (p.snapLast) {
      const snapFrags = fragmentsOf(p.chain, typeof p.chain === 'string' ? (p.copy ?? copyOf(film)) : undefined);
      const snapFrame = (p.snapLast === true ? undefined : p.snapLast.at) ?? snapFrags[snapFrags.length - 1].in + 1;
      out.stepped?.push({ from: snapFrame, to: snapFrame + 1, id });
    }
  }
  return out;
};
