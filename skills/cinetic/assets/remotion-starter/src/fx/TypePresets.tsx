import React, { useMemo } from 'react';
import { C, FONT } from '../brand/tokens';
import { clamp, E, type Ease, expOut, fd, lmix, mix, perFrame, prog, rand } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares, Seam, SteppedRange } from '../timeline';
import { ECHO_COPIES, echoCopiesState } from './Echoes';
import { arcOffset, letterState } from './Letters';
import { decodeState, mosaicCells } from './Scramble';
import { slicesState } from './Slices';
import { erodeRiseState, fontCycleState, type FontState } from './TypeFx';
import { typeFillState } from './TypeFill';

/**
 * Type presets: sixteen line animations, one per sentence. A launch film says its story in short
 * sentences, one clean line on screen at a time, and every line arrives its own way. Each preset is a
 * pure state function of the frame for ONE line (`typeLineState`), tuned to the house timing for
 * strong type moves (frames at 60 fps below, converted with the film's rate; `pace`
 * stretches every length of a preset at once). One renderer, <TypeLine>, draws all of them from the real
 * font's prefix widths, so kerning holds and every glyph is its own transform.
 *
 *   develop    colour fronts run through the line: a pale head that reveals it (22 f), a tint (40 f), the
 *              accent (64 f), then the ink (130 f), which stalls at 85 % of the line and catches up last,
 *              so the last word stays in colour longest (TypeFill develop under the hood)
 *   build      the line builds word by word, 14 / 10 / 10 f apart and a 28 f breath before the last word;
 *              each word arrives at 35 % opacity, blurred and in the accent, sharpens over 24 f and
 *              darkens to ink over 26 f while the whole line re-centres (E.settleOut, 24 f)
 *   typeFocus  a big line types on an eased typewriter (30 characters a second, E.type) while it is out
 *              of focus; at 45 % of the typing the focus pulls in (blur x0.65 per frame at 30 fps); the
 *              keyword turns accent once typed and the camera creeps in 4 %
 *   arc        every letter swings down into its slot on a short arc: shown at 0.45x, turned 25 deg and
 *              soft, landing on M.letterArc (4 % over) in 10 f, 2 f apart (Letters arc)
 *   assemble   the letters gather from seeded heights above and below the baseline, 0-20 f late each,
 *              landing in 16 f (E.snapOut) and inking from grey as they land, while the camera pushes 6 %
 *   decode     the line opens outward from its centre, 3 f a glyph, its fronts drawn as accent blocks,
 *              with data dashes streaking out of the middle and a bloom that clears 16 f after the lock
 *              (Scramble title decode)
 *   wheel      the keyword rolls through values like a picker drum, faster and faster (16 f gaps
 *              shrinking to 6 f), the neighbours ghosted above and below, and lands on the last value
 *              with a 16 f settle and a 6 % pop; the line re-flows around the slot
 *   erode      the line shows an old word in the keyword's slot; after a hold the old word erodes from its
 *              end, a letter every 3 f through a horizontal smear, while the new word's letters rise
 *              0.45 em into place 6 f apart (20 f each, E.snapOut) (TypeFx erode-rise, house stagger)
 *   cycle      only the keyword shuffles weight and width every 6 f (black condensed, thin extended,
 *              black extended ...) while the line steps 14 % larger with each change, then lands on the
 *              line's own style (TypeFx font cycle; a variable face with wght and wdth axes)
 *   punch      one or two words alone and big: cut on, the focus snaps in 6 f and the camera punches in
 *              24 % over 28 f (E.settleOut), then keeps creeping
 *   echo       copies of the line slide out from behind it on knockout boxes, ring by ring (2.4, 7.2 and
 *              9.6 f after the first; 27 f each), so nearer copies hide farther ones; the stack then
 *              contracts 5 % over 48 f (Echoes echo copies)
 *   open       each word cuts on with no word space, then the space opens in 7 f and the line re-centres
 *              on E.jump (most of the move on the first frame); words 12 / 7 / 12 / 12 f apart
 *   highlight  the line rises in grey; a soft accent block lands on the first word, hops word to word
 *              every 8 f (the words it passed turn ink), parks on the keyword for 24 f and wipes off from
 *              its left edge in 12 f, leaving the keyword in the accent
 *   slice      the line arrives cut into 9 horizontal strips, offset sideways, that snap together on
 *              E.jump over 43 f (its exit `split` spreads them apart again: Slices strips)
 *   redact     a solid box hops over the previous line one word every 2 f and the words change under it,
 *              then over the new line's words, and is gone
 *   swarm      every word grows out of depth (0.29x -> 1, stepped on twos, 16 f) along a wandering path,
 *              leaving fading stamps, jitters for 8 f and locks
 *
 * Exits (`exit` at `out`): cut; blur (defocus to 0.35 em and fade, 18 f); drop (words fall right to
 * left, 4 f apart, E.buildIn 14 f); drift (dead still, then away on E.launchIn, 30 f); push (the line
 * moves up a line and a quarter on E.liftOut over 28 f and dims to 36 % on its first frame); split (strips
 * spread apart, 43 f); swarm (words shrink into depth on twos, 12 f, leaving stamps); dive (the camera
 * zooms through one glyph at a constant log rate, x8.2 in 14 f, and the glyph's ink fills the frame: the
 * line becomes the next shot's ground). `dot` adds a square full stop in the accent that lands 5 f after
 * the line and grows from 82 % in 13 f.
 *
 * Offsets, blurs and sizes in the state are em of the type size; positions come from `LineMetrics`
 * (the renderer measures the real font; tests pass monoMetrics()). Pure and Node-safe except
 * <TypeLine> and measureLine() (call those under <FontGate>). declares(): the font cycle, the redaction
 * hops, the swarm's twos and the decode's blocks are stepped runs; a dive exit is a zoom-through seam.
 */

// ------------------------------------------------------------------------------------------------ house numbers

/** House numbers: frames at 60 fps, offsets in em. Tuned frame by frame on rendered moves. */
export const TYPE_PRESETS = {
  develop: { head60: 22, fronts60: [40, 64, 130], stall: 0.85, feather: 2.6, edge: 0.45 },
  build: { gaps60: [14, 10, 10], lastGap60: 28, from: 0.35, appear60: 12, blur60: 24, blurEm: 0.16, ink60: 26, recentre60: 24 },
  typeFocus: { cps: 30, blurEm: 0.3, decay30: 0.65, focusAt: 0.45, accent60: 10, push: 0.04, push60: 150, blink60: 32 },
  arc: { stagger60: 2, dur60: 10, from: 0.45, angle: 25, blurEm: 0.06 },
  assemble: { delay60: 20, land60: 16, dyEm: [0.45, 1.3] as [number, number], dxEm: 0.12, push: 0.06, push60: 150 },
  decode: { perGlyph60: 3, bloom60: 16, dashes: 18, dash60: 22 },
  wheel: { lead60: 20, gapFrom60: 16, gapTo60: 6, roll60: 10, settle60: 16, ghost: 0.18, pitch: 1.08, pop: 0.06, pop60: 14, zoom: 0.04 },
  erode: { stagger60: 4, word60: 14, riseIn: 0.12, hold60: 54, every60: 3, frames60: 6, riseDelay60: 6, rise60: 20, riseStagger60: 6, riseEm: 0.45, reflow60: 24 },
  cycle: { every60: 6, scaleFrom: 0.86, word60: 12 },
  punch: { push: 0.24, push60: 28, creep: 0.03, creep60: 120, blurEm: 0.08, focus60: 6 },
  echo: { lead60: 12, lags60: ECHO_COPIES.lags60, out60: ECHO_COPIES.out60, contract: 0.05, contract60: 48, ox: 0.62, oy: 0.82, pad: 0.05 },
  open: { gaps60: [12, 7, 12, 12, 12], open60: 7, recentre60: 22 },
  highlight: { stagger60: 4, word60: 20, rise: 0.14, start60: 24, step60: 8, hop60: 6, grow60: 6, park60: 24, wipe60: 12, feather: 0.08, pad: 0.1, h: 0.98 },
  slice: { n: 9, frames60: 43, spread: 0.55 },
  redact: { per60: 2, pad: 0.1, h: 0.92 },
  swarm: { spread60: 6, grow60: 16, from: 0.29, wander: 1.4, stamps: 3, jitter60: 8, jitterEm: 0.035 },
  exit: { blur60: 18, blurEm: 0.35, drop60: 14, dropStagger60: 4, dropEm: 0.6, drift60: 30, driftEm: 0.5, push60: 28, pushEm: 1.25, pushDim: 0.36, split60: 43, splitSpread: 0.5, swarm60: 12, swarmTo: 0.24, dive60: 14, diveScale: 8.2, cover60: 4 },
  dot: { late60: 5, grow60: 13, from: 0.82, size: 0.2 },
} as const;

/** Styles the keyword shuffles through in `cycle` (variable axes; the last state is the line's own). */
export const CYCLE_STATES: Vary[] = [
  { wght: 900, wdth: 75 },
  { wght: 200, wdth: 125 },
  { wght: 900, wdth: 125 },
  { wght: 300, wdth: 75 },
  { wght: 800, wdth: 112 },
];

// ------------------------------------------------------------------------------------------------ types

export type TypePresetName =
  | 'develop' | 'build' | 'typeFocus' | 'arc' | 'assemble' | 'decode' | 'wheel' | 'erode'
  | 'cycle' | 'punch' | 'echo' | 'open' | 'highlight' | 'slice' | 'redact' | 'swarm';
export type TypeExit = 'cut' | 'blur' | 'drop' | 'drift' | 'push' | 'split' | 'swarm' | 'dive';
export const TYPE_PRESET_NAMES: TypePresetName[] = ['develop', 'build', 'typeFocus', 'arc', 'assemble', 'decode', 'wheel', 'erode', 'cycle', 'punch', 'echo', 'open', 'highlight', 'slice', 'redact', 'swarm'];
export const TYPE_EXITS: TypeExit[] = ['cut', 'blur', 'drop', 'drift', 'push', 'split', 'swarm', 'dive'];

/** Variable-font axes of a glyph or a word. */
export type Vary = { wght?: number; wdth?: number };

export type TypeColors = { ink?: string; accent?: string; mute?: string; ground?: string; tint?: string };

export type TypeLineSpec = {
  preset: TypePresetName;
  text: string; // the sentence, as it reads when it has landed
  at: number; // first frame of the arrival
  out?: number; // first frame of the exit (default: never)
  exit?: TypeExit; // default 'cut'
  key?: number; // the keyword (word index; default the last word): accent, park, punch, cycle, wheel and erode slot
  words?: string[]; // wheel: the values the keyword rolls through before it lands on its own text
  from?: string; // erode: the word the keyword replaces; redact: the previous line
  dot?: boolean; // a square full stop in the accent after the last glyph
  colors?: TypeColors;
  pace?: number; // stretches every length of the preset (1 = the house timing)
  anchor?: number; // dive: the glyph the camera dives through (default the keyword's middle glyph)
  diveTo?: number; // dive: the total zoom (default the house x8.2); the length follows the house rate, x8.2 in 14 f
  anchorAt?: [number, number]; // dive: the point inside that glyph, as a share of its advance and em from the line's centre (down +); aim at ink (a stem, a crossbar) so the zoom lands on solid colour (default [0.32, 0.08])
  seed?: string | number;
  id?: string;
};

/** Measured layout of a line (px): each glyph's left edge and advance, the line width, the size, a space. */
export type LineMetrics = {
  size: number;
  xs: number[];
  ws: number[];
  width: number;
  space: number;
  alt?: { text: string; xs: number[]; ws: number[]; width: number }[]; // the preset's other strings (typeLineAlts)
};

export type GlyphState = {
  ch: string;
  dx: number; // em
  dy: number; // em, down
  sx: number;
  sy: number;
  rot: number; // deg
  blur: number; // em
  smear: [number, number]; // em: a directional motion trail
  opacity: number;
  color: string;
  vary?: Vary;
  mosaic?: number; // 0..1: drawn as accent blocks (decode front)
  glow?: number; // 0..1: the decode bloom
};
export type SlotItem = { text: string; x: number; y: number; opacity: number; blur: number; smear: [number, number]; color: string; vary?: Vary; scale?: number };
/** The keyword drawn as its own items (wheel, erode, cycle): the rest of the line re-flows around `width` (px). */
export type Slot = { word: number; width: number; items: SlotItem[] };
/** A block behind words, em from the line's centre: the highlight and the redaction box. */
export type TypeBox = { x0: number; x1: number; y0: number; y1: number; color: string; opacity: number; feather: number; wipe: number };
export type TypeLayer =
  | { kind: 'echo'; copies: { dx: number; dy: number; k: number }[]; ground: string; color: string; pad: number }
  | { kind: 'strips'; bands: { a0: number; a1: number; d: number }[] }
  | { kind: 'stamps'; stamps: { word: number; dx: number; dy: number; s: number; opacity: number }[] }
  | { kind: 'dashes'; color: string; dashes: { x: number; y: number; w: number; opacity: number }[] }
  | { kind: 'dot'; x: number; s: number; opacity: number; color: string }
  | { kind: 'caret'; x: number; opacity: number; color: string }
  | { kind: 'alt'; index: number; hide: number; color: string }
  | { kind: 'cover'; opacity: number; color: string };

export type TypeLinePhase = 'before' | 'in' | 'hold' | 'out' | 'gone';
export type TypeLineState = {
  glyphs: GlyphState[];
  x: number; // em: the whole line
  y: number;
  scale: number;
  origin: [number, number]; // em from the line's centre: the scale's fixed point
  blur: number; // em, the whole line
  opacity: number;
  fill?: { stops: { c: string; x: number }[] }; // a gradient across the line (em from its left edge)
  slot?: Slot;
  box?: TypeBox;
  layers: TypeLayer[];
  visible: boolean;
  phase: TypeLinePhase;
};

// ------------------------------------------------------------------------------------------------ helpers

/** Words of a line: each glyph's word (-1 for a space) and each word's first and last glyph. Pure. */
export const wordMap = (text: string) => {
  const chars = [...text];
  const wordOf: number[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let w = -1;
  let inWord = false;
  chars.forEach((c, i) => {
    if (c === ' ') {
      wordOf.push(-1);
      inWord = false;
      return;
    }
    if (!inWord) {
      w++;
      starts.push(i);
      inWord = true;
    }
    ends[w] = i;
    wordOf.push(w);
  });
  return { chars, wordOf, starts, ends, n: starts.length, words: starts.map((s, k) => chars.slice(s, ends[k] + 1).join('')) };
};

/** Synthetic metrics with a fixed advance (em): tests, and a layout before the font is measured. Pure. */
export const monoMetrics = (text: string, size = 100, adv = 0.56, alts: string[] = []): LineMetrics => {
  const one = (t: string) => {
    const n = [...t].length;
    const xs = Array.from({ length: n }, (_, i) => i * adv * size);
    return { text: t, xs, ws: xs.map(() => adv * size), width: n * adv * size };
  };
  const m = one(text);
  return { size, xs: m.xs, ws: m.ws, width: m.width, space: adv * size, alt: alts.map(one) };
};

/** The strings a preset lays out besides its own text (wheel values, the old word or line, cycle styles). Pure. */
export const typeLineAlts = (s: TypeLineSpec): { text: string; vary?: Vary }[] => {
  const W = wordMap(s.text);
  const key = keyOf(s, W.n);
  if (s.preset === 'wheel') return [...(s.words ?? []), W.words[key] ?? ''].map((text) => ({ text }));
  if (s.preset === 'erode') return [{ text: s.from ?? '' }];
  if (s.preset === 'redact') return [{ text: s.from ?? '' }];
  if (s.preset === 'cycle') return CYCLE_STATES.map((vary) => ({ text: W.words[key] ?? '', vary }));
  return [];
};

const keyOf = (s: TypeLineSpec, n: number) => clamp(Math.round(s.key ?? n - 1), 0, Math.max(0, n - 1));
const colorsOf = (s: TypeLineSpec) => {
  const accent = s.colors?.accent ?? C.accent;
  return {
    ink: s.colors?.ink ?? C.ink,
    accent,
    mute: s.colors?.mute ?? C.mute,
    ground: s.colors?.ground ?? C.paper,
    tint: s.colors?.tint ?? mixColor(accent, C.white, 0.45),
  };
};
const glyph = (ch: string, color: string, opacity = 1): GlyphState => ({ ch, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, blur: 0, smear: [0, 0], opacity, color });
const right = (m: LineMetrics, i: number) => m.xs[i] + m.ws[i];
const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

type Ctx = {
  f: number;
  s: TypeLineSpec;
  m: LineMetrics;
  fps: number;
  film: Partial<FilmCtx>;
  W: ReturnType<typeof wordMap>;
  col: ReturnType<typeof colorsOf>;
  key: number;
  seed: string | number;
  T: (f60: number) => number; // a 60 fps length in film frames, stretched by the preset's pace
};

const blank = (c: Ctx, color: string, opacity = 1): TypeLineState => ({
  glyphs: c.W.chars.map((ch) => glyph(ch, color, opacity)),
  x: 0,
  y: 0,
  scale: 1,
  origin: [0, 0],
  blur: 0,
  opacity: 1,
  layers: [],
  visible: true,
  phase: 'in',
});

/** Centre shift (em) that keeps the visible part of a growing line centred: the words up to `w` showing. */
const centreShift = (c: Ctx, w: number) => (c.m.width - right(c.m, c.W.ends[w])) / 2 / c.m.size;

/** A re-centring line: the shift follows each new word on `ease` over `dur` frames from its onset. */
const recentre = (c: Ctx, onsets: number[], dur: number, ease: Ease) => {
  let x = centreShift(c, 0);
  for (let w = 1; w < onsets.length; w++) x += (centreShift(c, w) - centreShift(c, w - 1)) * prog(c.f, onsets[w], onsets[w] + dur, ease);
  return x;
};

/** Words that pop on in turn (`gap` frames apart), rising `rise` em on E.snapOut over `dur`. */
const wordsRise = (c: Ctx, st: TypeLineState, gap: number, dur: number, rise: number, color: string, at = c.s.at) => {
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const p = prog(c.f, at + gap * w, at + gap * w + dur, E.snapOut);
    g.opacity = c.f >= at + gap * w ? clamp(p * 1.6) : 0;
    g.dy = rise * (1 - p);
    g.color = color;
  });
};

const wordWidth = (c: Ctx, w: number) => right(c.m, c.W.ends[w]) - c.m.xs[c.W.starts[w]];

// ------------------------------------------------------------------------------------------------ presets

/** Onsets of `build`: 14 / 10 / 10 ... f apart, a 28 f breath before the last word (3+ words). */
export const buildOnsets = (s: TypeLineSpec, film?: Partial<FilmCtx>): number[] => {
  const B = TYPE_PRESETS.build;
  const fps = fpsOf(film);
  const n = wordMap(s.text).n;
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const out = [s.at];
  for (let w = 1; w < n; w++) out.push(out[w - 1] + T(w === n - 1 && n > 2 ? B.lastGap60 : B.gaps60[Math.min(w - 1, B.gaps60.length - 1)]));
  return out;
};

const develop = (c: Ctx): TypeLineState => {
  const D = TYPE_PRESETS.develop;
  const st = blank(c, c.col.ink);
  const pale = mixColor(c.col.tint, c.col.ground, 0.35);
  const fronts = [
    { color: pale, dur: D.head60 * (c.s.pace ?? 1), ease: E.linear },
    { color: c.col.tint, dur: D.fronts60[0] * (c.s.pace ?? 1) },
    { color: c.col.accent, dur: D.fronts60[1] * (c.s.pace ?? 1) },
    { color: c.col.ink, dur: D.fronts60[2] * (c.s.pace ?? 1), stall: D.stall },
  ];
  const fill = typeFillState(c.f, { mode: 'develop', at: c.s.at, text: c.s.text, fronts }, c.film);
  const wEm = c.m.width / c.m.size;
  // fronts as heads along the line (em), each no farther than the one before it
  const heads: number[] = [];
  fill.fronts.forEach((q, k) => heads.push(Math.min(k ? heads[k - 1] : Infinity, q * (wEm + (k ? D.edge : D.feather)))));
  const stops: { c: string; x: number }[] = [];
  const e = D.edge;
  stops.push({ c: c.col.ink, x: heads[3] - e }, { c: c.col.accent, x: heads[3] + e });
  stops.push({ c: c.col.accent, x: heads[2] - e }, { c: c.col.tint, x: heads[2] + e });
  stops.push({ c: c.col.tint, x: heads[1] - e }, { c: pale, x: heads[1] + e });
  stops.push({ c: pale, x: heads[0] - D.feather }, { c: 'transparent', x: heads[0] });
  st.fill = { stops };
  const colorAt = (x: number) => (x < heads[3] ? c.col.ink : x < heads[2] ? c.col.accent : x < heads[1] ? c.col.tint : x < heads[0] - D.feather / 2 ? pale : 'transparent');
  st.glyphs.forEach((g, i) => {
    const x = (c.m.xs[i] + c.m.ws[i] / 2) / c.m.size;
    g.color = colorAt(x);
    g.opacity = x < heads[0] - D.feather ? 1 : clamp((heads[0] - x) / D.feather);
  });
  return st;
};

const build = (c: Ctx): TypeLineState => {
  const B = TYPE_PRESETS.build;
  const st = blank(c, c.col.ink);
  const on = buildOnsets(c.s, c.film);
  const keepKey = c.s.key !== undefined;
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const o = on[w];
    const a = prog(c.f, o, o + c.T(B.appear60), E.snapOut);
    g.opacity = c.f >= o ? B.from + (1 - B.from) * a : 0;
    g.blur = B.blurEm * (1 - prog(c.f, o, o + c.T(B.blur60), E.softOut));
    const ink = prog(c.f, o, o + c.T(B.ink60), E.stdInOut);
    g.color = keepKey && w === c.key ? c.col.accent : mixColor(c.col.accent, c.col.ink, ink);
  });
  st.x = recentre(c, on, c.T(B.recentre60), E.settleOut);
  return st;
};

/** Typing schedule of `typeFocus`: characters on an eased typewriter, the focus frame, the end. */
export const typeFocusFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const F = TYPE_PRESETS.typeFocus;
  const fps = fpsOf(film);
  const n = [...s.text].length;
  const dur = f60x(((n * 60) / F.cps) * (s.pace ?? 1), fps);
  return { start: s.at, dur, focus: s.at + F.focusAt * dur, end: s.at + dur };
};

const typeFocus = (c: Ctx): TypeLineState => {
  const F = TYPE_PRESETS.typeFocus;
  const st = blank(c, c.col.ink);
  const tf = typeFocusFrames(c.s, c.film);
  const typed = c.f < c.s.at ? 0 : Math.min(c.W.chars.length, Math.floor(c.W.chars.length * E.type(clamp((fd(c.f) - c.s.at) / tf.dur))) + 1);
  const accentAt = tf.end + c.T(F.accent60);
  st.glyphs.forEach((g, i) => {
    g.opacity = i < typed ? 1 : 0;
    if (c.W.wordOf[i] === c.key) g.color = mixColor(c.col.ink, c.col.accent, prog(c.f, tf.end, accentAt, E.softOut));
  });
  const r = perFrame(F.decay30, 30, c.fps);
  st.blur = c.f < tf.focus ? F.blurEm : F.blurEm * r ** (c.f - tf.focus);
  st.scale = 1 + F.push * clamp((c.f - c.s.at) / c.T(F.push60));
  const last = Math.max(0, typed - 1);
  const x = typed ? right(c.m, last) / c.m.size : 0;
  const blinkOn = c.f < tf.end ? 1 : Math.floor((fd(c.f) - tf.end) / c.T(F.blink60)) % 2 === 0 ? 1 : 0;
  if (c.f < accentAt + c.T(F.blink60 * 3)) st.layers.push({ kind: 'caret', x: x + 0.04, opacity: blinkOn, color: c.col.accent });
  return st;
};

const arc = (c: Ctx): TypeLineState => {
  const A = TYPE_PRESETS.arc;
  const st = blank(c, c.col.ink);
  const L = letterState(c.f, { text: c.s.text, start: c.s.at, mode: 'arc', stagger: c.T(A.stagger60), dur: c.T(A.dur60), from: A.from, angle: A.angle, color: c.col.ink }, c.film);
  st.glyphs.forEach((g, i) => {
    const l = L.letters[i];
    const [ox, oy] = arcOffset(l.rot);
    g.dx = ox;
    g.dy = oy;
    g.sx = l.sx;
    g.sy = l.sy;
    g.rot = l.rot;
    g.opacity = l.opacity;
    g.blur = A.blurEm * (1 - clamp(l.p));
    if (c.s.key !== undefined && c.W.wordOf[i] === c.key) g.color = c.col.accent;
  });
  return st;
};

const assemble = (c: Ctx): TypeLineState => {
  const A = TYPE_PRESETS.assemble;
  const st = blank(c, c.col.ink);
  st.glyphs.forEach((g, i) => {
    if (c.W.wordOf[i] < 0) return;
    const sgn = rand(`${c.seed}:as:sg:${i}`) < 0.5 ? -1 : 1;
    const dy0 = sgn * mix(A.dyEm[0], A.dyEm[1], rand(`${c.seed}:as:dy:${i}`));
    const dx0 = (rand(`${c.seed}:as:dx:${i}`) * 2 - 1) * A.dxEm;
    const on = c.s.at + c.T(A.delay60 * rand(`${c.seed}:as:d:${i}`));
    const p = prog(c.f, on, on + c.T(A.land60), E.snapOut);
    g.dy = dy0 * (1 - p);
    g.dx = dx0 * (1 - p);
    g.opacity = c.f < on ? 0 : 0.35 + 0.65 * clamp(p * 1.5);
    g.color = mixColor(c.col.mute, c.s.key !== undefined && c.W.wordOf[i] === c.key ? c.col.accent : c.col.ink, p);
    g.blur = 0.05 * (1 - p);
    g.smear = [0, dy0 * 0.22 * (1 - p)];
  });
  st.scale = 1 + A.push * clamp((c.f - c.s.at) / c.T(A.push60));
  return st;
};

/** The decode's lock frames (each glyph) and its end, from the measured centres. */
export const decodeOpts = (c: Pick<Ctx, 's' | 'm' | 'T' | 'seed'>) => ({
  text: c.s.text,
  start: c.s.at,
  title: true,
  edge: 'mosaic' as const,
  centres: c.m.xs.map((x, i) => x + c.m.ws[i] / 2),
  width: c.m.width,
  band: 0.55 * c.m.size,
  perGlyph: c.T(TYPE_PRESETS.decode.perGlyph60),
  seed: c.seed,
});

const decode = (c: Ctx): TypeLineState => {
  const D = TYPE_PRESETS.decode;
  const st = blank(c, c.col.ink);
  const dg = decodeState(c.f, decodeOpts(c), c.film);
  const end = Math.max(...dg.map((g) => g.lock));
  const glow = c.f < end ? 1 : 1 - prog(c.f, end, end + c.T(D.bloom60), E.glideOut);
  st.glyphs.forEach((g, i) => {
    const d = dg[i];
    g.opacity = d.state === 'locked' || d.state === 'still' ? 1 : 0;
    if (d.state === 'mosaic') g.mosaic = d.mosaic;
    g.glow = g.opacity * glow;
    if (c.s.key !== undefined && c.W.wordOf[i] === c.key && d.state === 'locked') g.color = c.col.accent;
  });
  // data dashes streak out of the centre while the title opens
  const span = Math.max(1, end - c.s.at);
  const fade = 1 - clamp((c.f - end) / c.T(D.bloom60));
  if (c.f >= c.s.at && fade > 0) {
    const dashes: { x: number; y: number; w: number; opacity: number }[] = [];
    const half = c.m.width / c.m.size / 2;
    for (let k = 0; k < D.dashes; k++) {
      const on = c.s.at + span * 0.85 * rand(`${c.seed}:dc:on:${k}`);
      const p = prog(c.f, on, on + c.T(D.dash60), E.snapOut);
      if (c.f < on) continue;
      const side = rand(`${c.seed}:dc:s:${k}`) < 0.5 ? -1 : 1;
      const reach = half * (0.4 + 1.1 * rand(`${c.seed}:dc:r:${k}`)) + 0.6;
      const w = 0.25 + 1.1 * rand(`${c.seed}:dc:w:${k}`);
      dashes.push({ x: side * (0.2 + reach * p) - (side < 0 ? w : 0), y: (rand(`${c.seed}:dc:y:${k}`) * 2 - 1) * 1.1, w: w * (1 - 0.5 * p), opacity: (1 - p * 0.6) * fade });
    }
    st.layers.push({ kind: 'dashes', color: c.col.accent, dashes });
  }
  return st;
};

/** The wheel's roll onsets: a short lead, then gaps shrinking geometrically from 16 f to 6 f; the last roll lands. */
export const wheelSwaps = (s: TypeLineSpec, film?: Partial<FilmCtx>): number[] => {
  const H = TYPE_PRESETS.wheel;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const m = (s.words ?? []).length; // rolls: each value to the next, the last onto the keyword's own text
  const out: number[] = [];
  let t = s.at + T(H.lead60);
  for (let j = 0; j < m; j++) {
    out.push(t);
    const k = m > 2 ? j / (m - 2) : 1;
    t += T(H.gapFrom60 * (H.gapTo60 / H.gapFrom60) ** clamp(k));
  }
  return out;
};

/** The wheel's position in values at frame f (fractional while rolling) and its roll speed (values a frame). */
export const wheelPos = (f: number, s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const H = TYPE_PRESETS.wheel;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const sw = wheelSwaps(s, film);
  const at = (g: number) => {
    let p = 0;
    sw.forEach((o, j) => {
      if (j === sw.length - 1) p += 0.5 * E.buildIn(clamp((g - o) / T(H.roll60 * 0.6))) + 0.5 * E.snapOut(clamp((g - o - T(H.roll60 * 0.6)) / T(H.settle60)));
      else {
        const gap = (sw[j + 1] ?? o + T(H.roll60)) - o;
        p += E.stdInOut(clamp((g - o) / Math.min(T(H.roll60), gap)));
      }
    });
    return p;
  };
  return { pos: at(f), speed: at(f + 0.5) - at(f - 0.5), swaps: sw, lands: (sw[sw.length - 1] ?? s.at) + T(H.roll60 * 0.6 + H.settle60) };
};

const wheel = (c: Ctx): TypeLineState => {
  const H = TYPE_PRESETS.wheel;
  const st = blank(c, c.col.ink);
  const values = [...(c.s.words ?? []), c.W.words[c.key]];
  const wp = wheelPos(c.f, c.s, c.film);
  const pos = clamp(wp.pos, 0, values.length - 1);
  wordsRise(c, st, 0, c.T(14), 0.15, c.col.ink);
  const lineIn = prog(c.f, c.s.at, c.s.at + c.T(14), E.snapOut);
  const widthOf = (j: number) => c.m.alt?.[j]?.width ?? wordWidth(c, c.key);
  const j0 = Math.floor(pos);
  const width = mix(widthOf(j0), widthOf(Math.min(values.length - 1, j0 + 1)), pos - j0);
  const landed = c.f >= wp.lands;
  const pop = 1 + H.pop * (landed ? 1 - prog(c.f, wp.lands - c.T(4), wp.lands - c.T(4) + c.T(H.pop60), E.snapOut) : 0);
  const items: SlotItem[] = [];
  for (let j = Math.max(0, j0 - 1); j <= Math.min(values.length - 1, j0 + 2); j++) {
    const d = j - pos;
    const ad = Math.abs(d);
    const o = ad < 1 ? mix(1, H.ghost, smoothstep(ad)) : H.ghost * clamp(2 - ad);
    if (o <= 0.002) continue;
    const isLast = j === values.length - 1;
    items.push({
      text: values[j],
      x: (width - widthOf(j)) / 2 / c.m.size,
      y: d * H.pitch,
      opacity: o * clamp(lineIn * 1.6),
      blur: 0.05 * Math.min(1, ad),
      smear: [0, -wp.speed * H.pitch * 0.7],
      color: isLast && ad < 0.5 ? c.col.accent : c.col.ink,
      scale: isLast ? pop : 1,
    });
  }
  st.slot = { word: c.key, width, items };
  st.scale = 1 + H.zoom * clamp((c.f - c.s.at) / Math.max(1, wp.lands - c.s.at));
  return st;
};

/** When the erode swap starts (after the line has popped on and held). */
export const erodeAt = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const R = TYPE_PRESETS.erode;
  const fps = fpsOf(film);
  const n = wordMap(s.text).n;
  return s.at + f60x((R.stagger60 * (n - 1) + R.hold60) * (s.pace ?? 1), fps);
};

const erode = (c: Ctx): TypeLineState => {
  const R = TYPE_PRESETS.erode;
  const st = blank(c, c.col.ink);
  wordsRise(c, st, c.T(R.stagger60), c.T(R.word60), R.riseIn, c.col.ink);
  const old = c.m.alt?.[0] ?? { text: c.s.from ?? '', xs: [], ws: [], width: 0 };
  const oldChars = [...old.text];
  const newChars = [...c.W.words[c.key]];
  const sw = erodeAt(c.s, c.film);
  const p = c.s.pace ?? 1;
  const er = erodeRiseState(c.f, oldChars.length, newChars.length, { at: sw, every60: R.every60 * p, frames60: R.frames60 * p, riseDelay60: R.riseDelay60 * p, rise60: R.rise60 * p, riseStagger60: R.riseStagger60 * p }, c.film);
  const keyOn = st.glyphs[c.W.starts[c.key]];
  const items: SlotItem[] = [];
  oldChars.forEach((ch, i) => {
    const q = er.old[i];
    if (q >= 1) return;
    items.push({ text: ch, x: (old.xs[i] ?? 0) / c.m.size, y: keyOn.dy, opacity: keyOn.opacity * (1 - clamp(q * 1.6)), blur: 0.02 * q, smear: [-0.5 * Math.sin(Math.PI * q), 0], color: c.col.ink });
  });
  const x0 = c.m.xs[c.W.starts[c.key]];
  newChars.forEach((ch, j) => {
    const r = er.rise[j];
    if (r <= 0) return;
    items.push({ text: ch, x: (c.m.xs[c.W.starts[c.key] + j] - x0) / c.m.size, y: (1 - r) * R.riseEm, opacity: clamp(r * 2.5), blur: 0, smear: [0, 0.35 * (1 - r)], color: c.col.accent });
  });
  const reflow = prog(c.f, sw, sw + c.T(R.reflow60), E.stdInOut);
  st.slot = { word: c.key, width: mix(old.width, wordWidth(c, c.key), reflow), items };
  return st;
};

const cycle = (c: Ctx): TypeLineState => {
  const Y = TYPE_PRESETS.cycle;
  const st = blank(c, c.col.ink);
  wordsRise(c, st, 0, c.T(Y.word60), 0.1, c.col.ink);
  const states: FontState[] = [...CYCLE_STATES, {}].map((v) => ({ wght: (v as Vary).wght ?? 0 }));
  const fc = fontCycleState(c.f, { at: c.s.at, states, every60: Y.every60 * (c.s.pace ?? 1) }, c.film);
  const vary = fc.landed ? undefined : CYCLE_STATES[fc.index];
  const width = fc.landed ? wordWidth(c, c.key) : (c.m.alt?.[fc.index]?.width ?? wordWidth(c, c.key));
  const keyOn = st.glyphs[c.W.starts[c.key]];
  st.slot = { word: c.key, width, items: [{ text: c.W.words[c.key], x: 0, y: keyOn.dy, opacity: keyOn.opacity, blur: 0, smear: [0, 0], color: fc.landed ? c.col.accent : c.col.ink, vary }] };
  st.scale = mix(Y.scaleFrom, 1, fc.index / Math.max(1, states.length - 1));
  return st;
};

const punch = (c: Ctx): TypeLineState => {
  const P = TYPE_PRESETS.punch;
  const st = blank(c, c.col.ink, c.f >= c.s.at ? 1 : 0);
  st.scale = 1 + P.push * prog(c.f, c.s.at, c.s.at + c.T(P.push60), E.settleOut) + P.creep * clamp((c.f - c.s.at - c.T(P.push60)) / c.T(P.creep60));
  st.blur = P.blurEm * (1 - prog(c.f, c.s.at, c.s.at + c.T(P.focus60), E.snapOut));
  if (c.s.key !== undefined) st.glyphs.forEach((g, i) => c.W.wordOf[i] === c.key && (g.color = c.col.accent));
  return st;
};

const echo = (c: Ctx): TypeLineState => {
  const H = TYPE_PRESETS.echo;
  const st = blank(c, c.col.ink, c.f >= c.s.at ? 1 : 0);
  const at = c.s.at + c.T(H.lead60);
  const p = c.s.pace ?? 1;
  const rings = echoCopiesState(c.f, { at, offset: { x: 1, y: 1 }, lags: H.lags60.map((l) => l * p), out: H.out60 * p }, c.film);
  const ox = (H.ox * c.m.width) / c.m.size;
  const copies: { dx: number; dy: number; k: number }[] = [];
  // farthest ring first so nearer copies (and the line itself) hide it
  [...rings].reverse().forEach((r) => {
    if (!r.visible) return;
    const n = r.i + 1;
    const dirs: [number, number][] = [[0, -n], [0, n], [-n, 0], [n, 0]];
    if (r.i >= 1) dirs.push([-r.i, -r.i], [r.i, -r.i], [-r.i, r.i], [r.i, r.i]);
    dirs.forEach(([a, b]) => copies.push({ dx: a * ox * r.k, dy: b * H.oy * r.k, k: r.k }));
  });
  if (copies.length) st.layers.push({ kind: 'echo', copies, ground: c.col.ground, color: c.col.ink, pad: H.pad });
  const full = at + c.T(H.lags60[H.lags60.length - 1] + H.out60);
  st.scale = 1 - H.contract * prog(c.f, full, full + c.T(H.contract60), E.softOut);
  if (c.s.key !== undefined) st.glyphs.forEach((g, i) => c.W.wordOf[i] === c.key && (g.color = c.col.accent));
  return st;
};

/** Onsets of `open`: the house cadence 12 / 7 / 12 / 12 / 12 f, repeating. */
export const openOnsets = (s: TypeLineSpec, film?: Partial<FilmCtx>): number[] => {
  const O = TYPE_PRESETS.open;
  const fps = fpsOf(film);
  const n = wordMap(s.text).n;
  const out = [s.at];
  for (let w = 1; w < n; w++) out.push(out[w - 1] + f60x(O.gaps60[(w - 1) % O.gaps60.length] * (s.pace ?? 1), fps));
  return out;
};

const open = (c: Ctx): TypeLineState => {
  const O = TYPE_PRESETS.open;
  const st = blank(c, c.col.ink);
  const on = openOnsets(c.s, c.film);
  const space = c.m.space / c.m.size;
  const k = on.map((o, w) => (w === 0 ? 1 : expOut(6)(clamp((c.f - o) / c.T(O.open60)))));
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    g.opacity = c.f >= on[w] ? 1 : 0;
    let closed = 0;
    for (let j = 1; j <= w; j++) closed += 1 - k[j];
    g.dx = -space * closed;
    if (c.s.key !== undefined && w === c.key) g.color = c.col.accent;
  });
  st.x = recentre(c, on, c.T(O.recentre60), E.jump);
  return st;
};

/** The highlight's schedule: the block lands, each hop, the park and the wipe. */
export const highlightFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const H = TYPE_PRESETS.highlight;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const n = wordMap(s.text).n;
  const key = keyOf(s, n);
  const land = s.at + T(H.start60 + H.stagger60 * (n - 1));
  const hops = Array.from({ length: key }, (_, j) => land + T(H.step60) * (j + 1));
  const parked = land + T(H.step60) * key;
  const wipe = parked + T(H.park60);
  return { land, hops, parked, wipe, end: wipe + T(H.wipe60) };
};

const highlight = (c: Ctx): TypeLineState => {
  const H = TYPE_PRESETS.highlight;
  const st = blank(c, c.col.mute);
  wordsRise(c, st, c.T(H.stagger60), c.T(H.word60), H.rise, c.col.mute);
  const hf = highlightFrames(c.s, c.film);
  const cur = c.f < hf.land ? -1 : Math.min(c.key, Math.floor((c.f - hf.land) / c.T(H.step60)));
  const done = c.f >= hf.end;
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    if (done) g.color = w === c.key ? c.col.accent : c.col.ink;
    else if (cur >= 0 && w === cur) g.color = c.f >= hf.wipe ? c.col.accent : c.col.ground;
    else if (cur >= 0 && w < cur) g.color = c.col.ink;
  });
  if (cur >= 0 && !done) {
    const edge = (w: number) => {
      const x0 = (c.m.xs[c.W.starts[w]] - c.m.width / 2) / c.m.size - H.pad;
      const x1 = (right(c.m, c.W.ends[w]) - c.m.width / 2) / c.m.size + H.pad;
      return [x0, x1];
    };
    const hopP = cur > 0 ? prog(c.f, hf.hops[cur - 1], hf.hops[cur - 1] + c.T(H.hop60), E.snapOut) : 1;
    const [a0, a1] = edge(Math.max(0, cur - 1));
    const [b0, b1] = edge(cur);
    const grow = prog(c.f, hf.land, hf.land + c.T(H.grow60), E.snapOut);
    const wipe = prog(c.f, hf.wipe, hf.end, E.buildIn);
    st.box = { x0: mix(a0, b0, hopP), x1: mix(a1, b1, hopP), y0: -H.h / 2 * grow, y1: H.h / 2 * grow, color: c.col.accent, opacity: 1 - wipe * 0.6, feather: H.feather, wipe };
  }
  return st;
};

const sliceBands = (c: Ctx, n: number, k: number) =>
  Array.from({ length: n }, (_, i) => ({ a0: i / n, a1: (i + 1) / n, d: (rand(`${c.seed}:slices:${i}`) * 2 - 1) * k }));

const slice = (c: Ctx): TypeLineState => {
  const S = TYPE_PRESETS.slice;
  const st = blank(c, c.col.ink, c.f >= c.s.at ? 1 : 0);
  const p = prog(c.f, c.s.at, c.s.at + c.T(S.frames60), E.jump);
  if (p < 1) st.layers.push({ kind: 'strips', bands: sliceBands(c, S.n, (S.spread * c.m.width * (1 - p)) / c.m.size) });
  if (c.s.key !== undefined) st.glyphs.forEach((g, i) => c.W.wordOf[i] === c.key && (g.color = c.col.accent));
  return st;
};

/** The redaction's steps: one word a step (2 f at 60 fps), the old line's words then the new line's. */
export const redactFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const per = f60x(TYPE_PRESETS.redact.per60 * (s.pace ?? 1), fps);
  const nOld = wordMap(s.from ?? '').n;
  const nNew = wordMap(s.text).n;
  return { per, nOld, nNew, end: s.at + per * (nOld + nNew) };
};

const redact = (c: Ctx): TypeLineState => {
  const R = TYPE_PRESETS.redact;
  const st = blank(c, c.col.ink);
  const rf = redactFrames(c.s, c.film);
  const step = Math.floor((fd(c.f) - c.s.at) / rf.per);
  const old = c.m.alt?.[0];
  const OW = wordMap(c.s.from ?? '');
  const boxOf = (xs: number[], ws: number[], width: number, a: number, b: number) => ({
    x0: (xs[a] - width / 2) / c.m.size - R.pad,
    x1: (xs[b] + ws[b] - width / 2) / c.m.size + R.pad,
  });
  if (step < rf.nOld && old) {
    st.glyphs.forEach((g) => (g.opacity = 0));
    st.layers.push({ kind: 'alt', index: 0, hide: step, color: c.col.ink });
    const b = boxOf(old.xs, old.ws, old.width, OW.starts[step], OW.ends[step]);
    st.box = { ...b, y0: -R.h / 2, y1: R.h / 2, color: c.col.ink, opacity: 1, feather: 0, wipe: 0 };
  } else if (step < rf.nOld + rf.nNew) {
    const w = step - rf.nOld;
    st.glyphs.forEach((g, i) => (g.opacity = c.W.wordOf[i] === w ? 0 : 1));
    const b = boxOf(c.m.xs, c.m.ws, c.m.width, c.W.starts[w], c.W.ends[w]);
    st.box = { ...b, y0: -R.h / 2, y1: R.h / 2, color: c.col.ink, opacity: 1, feather: 0, wipe: 0 };
  }
  if (c.s.key !== undefined && step >= rf.nOld + rf.nNew) st.glyphs.forEach((g, i) => c.W.wordOf[i] === c.key && (g.color = c.col.accent));
  return st;
};

/** Each word's swarm onset (seeded within 6 f) and its landing (grow 16 f, jitter 8 f). */
export const swarmFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const H = TYPE_PRESETS.swarm;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const W = wordMap(s.text);
  const on = W.words.map((_, w) => s.at + Math.round(T(H.spread60) * rand(`${s.seed ?? 0}:sw:on:${w}`)));
  return { on, grown: on.map((o) => o + T(H.grow60)), locked: on.map((o) => o + T(H.grow60 + H.jitter60)) };
};

const wordCentre = (c: Ctx, w: number) => (c.m.xs[c.W.starts[w]] + right(c.m, c.W.ends[w])) / 2;

const swarm = (c: Ctx): TypeLineState => {
  const H = TYPE_PRESETS.swarm;
  const st = blank(c, c.col.ink);
  const sf = swarmFrames(c.s, c.film);
  const two = c.T(2);
  const stamps: { word: number; dx: number; dy: number; s: number; opacity: number }[] = [];
  const pose = (w: number, q: number) => {
    const a = rand(`${c.seed}:sw:a:${w}`) * Math.PI * 2;
    const r = H.wander * (0.6 + 0.8 * rand(`${c.seed}:sw:r:${w}`));
    const bend = (rand(`${c.seed}:sw:b:${w}`) * 2 - 1) * 0.6 * Math.sin(Math.PI * q);
    const sx = Math.cos(a) * r * (1 - q) - Math.sin(a) * bend;
    const sy = Math.sin(a) * r * 0.6 * (1 - q) + Math.cos(a) * bend * 0.6;
    return { dx: sx, dy: sy, s: H.from + (1 - H.from) * q };
  };
  const wordPose = c.W.words.map((_, w) => {
    const o = sf.on[w];
    if (c.f < o) return null;
    const stepped = o + Math.floor((c.f - o) / two) * two; // on twos
    const q = clamp((stepped - o) / c.T(H.grow60));
    const ps = pose(w, q);
    if (q < 1)
      for (let k = 1; k <= H.stamps; k++) {
        const qk = clamp((stepped - k * two - o) / c.T(H.grow60));
        if (stepped - k * two < o) break;
        stamps.push({ word: w, ...pose(w, qk), opacity: 0.4 * (1 - k / (H.stamps + 1)) });
      }
    let jx = 0;
    let jy = 0;
    if (c.f >= sf.grown[w] && c.f < sf.locked[w]) {
      const n = Math.floor((c.f - sf.grown[w]) / two);
      jx = (rand(`${c.seed}:sw:jx:${w}:${n}`) * 2 - 1) * H.jitterEm;
      jy = (rand(`${c.seed}:sw:jy:${w}:${n}`) * 2 - 1) * H.jitterEm;
    }
    return { ...ps, dx: ps.dx + jx, dy: ps.dy + jy };
  });
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const p = wordPose[w];
    if (!p) {
      g.opacity = 0;
      return;
    }
    const cg = (c.m.xs[i] + c.m.ws[i] / 2 - wordCentre(c, w)) / c.m.size;
    g.dx = p.dx + (p.s - 1) * cg;
    g.sx = p.s;
    g.sy = p.s;
    g.dy = p.dy;
    if (c.s.key !== undefined && w === c.key && c.f >= sf.locked[w]) g.color = c.col.accent;
  });
  if (stamps.length) st.layers.push({ kind: 'stamps', stamps });
  return st;
};

const PRESETS: Record<TypePresetName, (c: Ctx) => TypeLineState> = { develop, build, typeFocus, arc, assemble, decode, wheel, erode, cycle, punch, echo, open, highlight, slice, redact, swarm };

// ------------------------------------------------------------------------------------------------ frames

/** Key frames of a line: when it is readable, the landing ticks for sound, the exit's last frame. Pure. */
export const typeLineFrames = (s: TypeLineSpec, m: LineMetrics, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const P = TYPE_PRESETS;
  const W = wordMap(s.text);
  const n = W.chars.length;
  let resolved = s.at;
  let ticks: number[] = [s.at];
  switch (s.preset) {
    case 'develop':
      resolved = s.at + T(P.develop.head60);
      ticks = [s.at, s.at + T(P.develop.fronts60[2])];
      break;
    case 'build': {
      const on = buildOnsets(s, film);
      ticks = on;
      resolved = on[on.length - 1] + T(P.build.ink60);
      break;
    }
    case 'typeFocus': {
      const tf = typeFocusFrames(s, film);
      resolved = tf.end;
      ticks = [tf.start, Math.round(tf.focus), Math.round(tf.end)];
      break;
    }
    case 'arc':
      ticks = Array.from({ length: n }, (_, i) => s.at + T(P.arc.stagger60) * i).filter((_, i) => W.wordOf[i] >= 0);
      resolved = s.at + T(P.arc.stagger60) * (n - 1) + T(P.arc.dur60);
      break;
    case 'assemble':
      resolved = s.at + T(P.assemble.delay60 + P.assemble.land60);
      ticks = [s.at, resolved];
      break;
    case 'decode': {
      const dg = decodeState(Infinity, decodeOpts({ s, m, T, seed: s.seed ?? 0 }), film);
      const end = Math.max(...dg.map((g) => g.lock));
      ticks = [s.at, end];
      resolved = end;
      break;
    }
    case 'wheel': {
      const wp = wheelPos(s.at, s, film);
      ticks = [...wp.swaps, Math.round(wp.lands)];
      resolved = wp.lands;
      break;
    }
    case 'erode': {
      const sw = erodeAt(s, film);
      ticks = [s.at, sw];
      resolved = sw + T(P.erode.riseDelay60 + P.erode.riseStagger60 * Math.max(0, [...(W.words[keyOf(s, W.n)] ?? '')].length - 1) + P.erode.rise60);
      break;
    }
    case 'cycle': {
      const steps = CYCLE_STATES.length;
      ticks = Array.from({ length: steps + 1 }, (_, k) => Math.ceil(s.at + T(P.cycle.every60) * k - 1e-6));
      resolved = ticks[ticks.length - 1];
      break;
    }
    case 'punch':
      resolved = s.at + T(P.punch.push60);
      break;
    case 'echo':
      resolved = s.at + T(P.echo.lead60 + P.echo.lags60[P.echo.lags60.length - 1] + P.echo.out60);
      ticks = [s.at, ...P.echo.lags60.map((l) => s.at + T(P.echo.lead60 + l))];
      break;
    case 'open': {
      const on = openOnsets(s, film);
      ticks = on;
      resolved = on[on.length - 1] + T(P.open.recentre60);
      break;
    }
    case 'highlight': {
      const hf = highlightFrames(s, film);
      ticks = [hf.land, ...hf.hops, hf.wipe];
      resolved = hf.end;
      break;
    }
    case 'slice':
      resolved = s.at + T(P.slice.frames60);
      break;
    case 'redact': {
      const rf = redactFrames(s, film);
      ticks = Array.from({ length: rf.nOld + rf.nNew }, (_, k) => s.at + rf.per * k);
      resolved = rf.end;
      break;
    }
    case 'swarm': {
      const sf = swarmFrames(s, film);
      ticks = sf.on;
      resolved = Math.max(...sf.locked);
      break;
    }
  }
  const out = s.out ?? Infinity;
  const ex = s.exit ?? 'cut';
  const E60 = P.exit;
  const exitLen: Record<TypeExit, number> = {
    cut: 0,
    blur: T(E60.blur60),
    drop: T(E60.dropStagger60 * Math.max(0, W.n - 1) + E60.drop60),
    drift: T(E60.drift60),
    push: T(E60.push60),
    split: T(E60.split60),
    swarm: T(E60.swarm60),
    dive: T(diveLen60(s)),
  };
  const dotAt = s.dot ? resolved + T(P.dot.late60) : undefined;
  return { in: s.at, resolved: Math.ceil(resolved), ticks: ticks.map((t) => Math.round(t)), out, gone: out + exitLen[ex], dot: dotAt === undefined ? undefined : Math.round(dotAt) };
};

// ------------------------------------------------------------------------------------------------ exits

/** A dive's length in 60 fps frames: the house rate (x8.2 in 14 f) held until the zoom reaches `diveTo`. */
export const diveLen60 = (s: TypeLineSpec) => {
  const X = TYPE_PRESETS.exit;
  return (X.dive60 * Math.log(Math.max(1.01, s.diveTo ?? X.diveScale))) / Math.log(X.diveScale);
};

const applyExit = (st: TypeLineState, c: Ctx) => {
  const out = c.s.out;
  if (out === undefined || c.f < out) return st;
  const X = TYPE_PRESETS.exit;
  const q = c.f - out;
  const ex = c.s.exit ?? 'cut';
  st.phase = 'out';
  const gone = () => {
    st.visible = false;
    st.phase = 'gone';
    return st;
  };
  if (ex === 'cut') return gone();
  if (ex === 'blur') {
    if (q >= c.T(X.blur60)) return gone();
    const p = E.glideOut(clamp(q / c.T(X.blur60)));
    st.blur += X.blurEm * p;
    st.opacity *= 1 - p;
    return st;
  }
  if (ex === 'drift') {
    if (q >= c.T(X.drift60)) return gone();
    const p = E.launchIn(clamp(q / c.T(X.drift60)));
    st.y -= X.driftEm * p;
    st.opacity *= 1 - p;
    st.blur += 0.04 * p;
    return st;
  }
  if (ex === 'push') {
    if (q >= c.T(X.push60)) return gone();
    const p = E.liftOut(clamp(q / c.T(X.push60)));
    st.y -= X.pushEm * p;
    st.opacity *= fd(q) >= 1 ? X.pushDim * (1 - clamp((q - c.T(10)) / c.T(X.push60 - 10))) : 1;
    return st;
  }
  if (ex === 'drop') {
    const n = c.W.n;
    if (q >= c.T(X.dropStagger60 * Math.max(0, n - 1) + X.drop60)) return gone();
    st.glyphs.forEach((g, i) => {
      const w = c.W.wordOf[i];
      if (w < 0) return;
      const r = n - 1 - w; // right to left
      const p = E.buildIn(clamp((q - c.T(X.dropStagger60) * r) / c.T(X.drop60)));
      g.dy += X.dropEm * p;
      g.opacity *= 1 - clamp(p * 1.4);
      g.smear = [g.smear[0], g.smear[1] - 0.2 * p];
    });
    if (st.slot) {
      const r = n - 1 - st.slot.word;
      const p = E.buildIn(clamp((q - c.T(X.dropStagger60) * r) / c.T(X.drop60)));
      st.slot.items.forEach((it) => {
        it.y += X.dropEm * p;
        it.opacity *= 1 - clamp(p * 1.4);
      });
    }
    return st;
  }
  if (ex === 'split') {
    if (q >= c.T(X.split60)) return gone();
    const film = { ...c.film, width: c.m.width };
    const bands = slicesState(c.f, { at: out, kind: 'strips', n: TYPE_PRESETS.slice.n, frames: X.split60 * (c.s.pace ?? 1), spread: X.splitSpread, seed: `${c.seed}:split` }, { w: c.m.width, h: c.m.size }, film);
    st.layers = st.layers.filter((l) => l.kind !== 'strips');
    st.layers.push({ kind: 'strips', bands: bands.map((b) => ({ a0: b.a0, a1: b.a1, d: b.d / c.m.size })) });
    st.opacity *= 1 - clamp((q - c.T(X.split60 * 0.7)) / c.T(X.split60 * 0.3));
    return st;
  }
  if (ex === 'swarm') {
    if (q >= c.T(X.swarm60)) return gone();
    const two = c.T(2);
    const qs = Math.floor(q / two) * two;
    const p = clamp(qs / c.T(X.swarm60));
    const stamps: { word: number; dx: number; dy: number; s: number; opacity: number }[] = [];
    const at = (w: number, pp: number) => {
      const a = rand(`${c.seed}:swx:a:${w}`) * Math.PI * 2;
      return { dx: Math.cos(a) * 1.2 * pp, dy: Math.sin(a) * 0.7 * pp, s: 1 - (1 - X.swarmTo) * pp };
    };
    st.glyphs.forEach((g, i) => {
      const w = c.W.wordOf[i];
      if (w < 0) return;
      const ps = at(w, p);
      const cg = (c.m.xs[i] + c.m.ws[i] / 2 - wordCentre(c, w)) / c.m.size;
      g.dx += ps.dx + (ps.s - 1) * cg;
      g.dy += ps.dy;
      g.sx *= ps.s;
      g.sy *= ps.s;
      g.opacity *= 1 - 0.5 * p;
    });
    for (let w = 0; w < c.W.n; w++)
      for (let k = 1; k <= 2; k++) {
        const pk = clamp((qs - k * two) / c.T(X.swarm60));
        if (qs - k * two < 0) break;
        stamps.push({ word: w, ...at(w, pk), opacity: 0.35 * (1 - k / 3) });
      }
    st.layers.push({ kind: 'stamps', stamps });
    return st;
  }
  // dive: the camera zooms through one glyph at a constant log rate; its ink covers the frame at the end
  const dive = c.T(diveLen60(c.s));
  if (q >= dive) return gone();
  const a = clamp(Math.round(c.s.anchor ?? Math.floor((c.W.starts[c.key] + c.W.ends[c.key]) / 2)), 0, c.W.chars.length - 1);
  const [ax, ay] = c.s.anchorAt ?? [0.32, 0.08];
  const ox = (c.m.xs[a] + c.m.ws[a] * ax - c.m.width / 2) / c.m.size;
  st.origin = [ox, ay];
  st.scale *= lmix(1, c.s.diveTo ?? X.diveScale, clamp(q / dive));
  st.layers.push({ kind: 'cover', opacity: clamp((q - (dive - c.T(X.cover60))) / c.T(X.cover60)), color: st.glyphs[a]?.color ?? c.col.ink });
  return st;
};

// ------------------------------------------------------------------------------------------------ state

/**
 * The state of one line at frame f (pure, closed form): its glyphs, its slot, box and layers, and the
 * whole line's transform, in em of the type size. `m` is the line's layout (measureLine() in the
 * browser, monoMetrics() in tests); give `film` its fps (and pace for decode).
 */
export const typeLineState = (f: number, s: TypeLineSpec, m: LineMetrics, film?: Partial<FilmCtx>): TypeLineState => {
  const fps = fpsOf(film);
  const W = wordMap(s.text);
  const c: Ctx = { f, s, m, fps, film: { ...film, fps }, W, col: colorsOf(s), key: keyOf(s, W.n), seed: s.seed ?? 0, T: (v) => f60x(v * (s.pace ?? 1), fps) };
  if (f < s.at || !W.n) {
    const st = blank(c, c.col.ink, 0);
    st.visible = false;
    st.phase = 'before';
    return st;
  }
  const st = PRESETS[s.preset](c);
  const fr = typeLineFrames(s, m, film);
  st.phase = f < fr.resolved ? 'in' : 'hold';
  if (s.dot && fr.dot !== undefined && f >= fr.dot) {
    const D = TYPE_PRESETS.dot;
    const last = W.ends[W.n - 1];
    const sw = st.slot && st.slot.word === W.n - 1 ? st.slot.width - wordWidth(c, st.slot.word) : 0;
    st.layers.push({ kind: 'dot', x: (right(m, last) + sw) / m.size + 0.07, s: mix(D.from, 1, prog(f, fr.dot, fr.dot + c.T(D.grow60), E.snapOut)), opacity: 1, color: c.col.accent });
  }
  return applyExit(st, c);
};

// ------------------------------------------------------------------------------------------------ declares

/** What a line does on purpose: stepped runs (font cycle, redaction hops, swarm on twos, decode blocks) and a dive's seam. */
export const declares = (s?: TypeLineSpec, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!s) return none;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const id = s.id ?? `type-${s.preset}`;
  const stepped: SteppedRange[] = [];
  const seams: Seam[] = [];
  const m = monoMetrics(s.text, 100, 0.56, typeLineAlts(s).map((a) => a.text));
  const fr = typeLineFrames(s, m, film);
  if (s.preset === 'cycle') stepped.push({ from: Math.floor(s.at), to: fr.resolved + 1, id });
  if (s.preset === 'redact') stepped.push({ from: Math.floor(s.at), to: Math.ceil(fr.resolved) + 1, id });
  if (s.preset === 'swarm') stepped.push({ from: Math.floor(s.at), to: fr.resolved + 1, on: 2, id });
  if (s.preset === 'decode') stepped.push({ from: Math.floor(s.at), to: fr.resolved + 1, id });
  if (s.out !== undefined && s.exit === 'swarm') stepped.push({ from: Math.floor(s.out), to: Math.ceil(s.out + T(TYPE_PRESETS.exit.swarm60)) + 1, on: 2, id: `${id}-exit` });
  if (s.out !== undefined && s.exit === 'dive') seams.push({ at: Math.ceil(s.out + T(diveLen60(s))), kind: 'zoomThrough', carry: 'scale', id: `${id}-dive` });
  return { ...none, stepped, seams };
};

// ------------------------------------------------------------------------------------------------ render

const widths = new Map<string, number>();
/** Width (px) of a string as the DOM lays it out, with variable axes. Browser only (under FontGate). */
export const measureVar = (text: string, size: number, weight: number, track: number, family: string, vary?: Vary): number => {
  const fvs = vary ? `"wght" ${vary.wght ?? weight}, "wdth" ${vary.wdth ?? 100}` : '';
  const key = `${text}|${size}|${weight}|${track}|${family}|${fvs}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;
  const span = document.createElement('span');
  span.textContent = text;
  Object.assign(span.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', fontFamily: family, fontSize: `${size}px`, fontWeight: String(vary?.wght ?? weight), letterSpacing: `${track}em`, lineHeight: '1', fontVariationSettings: fvs || 'normal' });
  document.body.appendChild(span);
  const w = span.getBoundingClientRect().width;
  document.body.removeChild(span);
  widths.set(key, w);
  return w;
};

/** A line's metrics from the real font (prefix widths keep the kerning) and its preset's other strings. Browser only. */
export const measureLine = (s: TypeLineSpec, size: number, weight: number, track: number, family: string, vary?: Vary): LineMetrics => {
  const one = (t: string, v?: Vary) => {
    const ch = [...t];
    const xs = ch.map((_, i) => measureVar(ch.slice(0, i).join(''), size, weight, track, family, v ?? vary));
    const width = measureVar(t, size, weight, track, family, v ?? vary);
    return { text: t, xs, ws: xs.map((x, i) => (i + 1 < xs.length ? xs[i + 1] : width) - x), width };
  };
  const m = one(s.text);
  const space = measureVar('a a', size, weight, track, family, vary) - measureVar('aa', size, weight, track, family, vary);
  return { size, xs: m.xs, ws: m.ws, width: m.width, space, alt: typeLineAlts(s).map((a) => one(a.text, a.vary)) };
};

const px = (v: number) => `${Number(v.toFixed(2))}px`;
const fvsOf = (v: Vary | undefined, weight: number, base?: Vary) => {
  const k = v ?? base;
  return k ? `"wght" ${k.wght ?? weight}, "wdth" ${k.wdth ?? 100}` : undefined;
};

export type TypeLineProps = {
  spec: TypeLineSpec;
  frame: number;
  x?: number; // the line box's centre, px (default the frame's centre)
  y?: number;
  size: number; // px
  weight?: number;
  family?: string;
  track?: number; // em
  vary?: Vary; // the line's own axes (cycle lands on these)
  metrics?: LineMetrics; // measured elsewhere (default: measureLine under FontGate)
};

/**
 * <TypeLine spec frame size>: one sentence, drawn from its preset's state. The line box is centred on
 * (x, y); every glyph is its own span at its measured prefix position, moved only by transforms.
 */
export const TypeLine: React.FC<TypeLineProps> = (p) => {
  const film = useFilm();
  const weight = p.weight ?? 600;
  const family = p.family ?? FONT.text;
  const track = p.track ?? 0;
  const size = p.size;
  const m = useMemo(() => p.metrics ?? measureLine(p.spec, size, weight, track, family, p.vary), [p.metrics, p.spec, size, weight, track, family, p.vary]);
  const st = typeLineState(p.frame, p.spec, m, film);
  if (!st.visible) return null;
  const W = wordMap(p.spec.text);
  const cx = p.x ?? film.width / 2;
  const cy = p.y ?? film.height / 2;
  const padX = size * 1.2;
  const boxW = m.width + 2 * padX;
  const boxH = size * 1.6;
  const top = size * 0.3; // the glyph box (1 em) inside the line box
  const slotShift = st.slot ? st.slot.width - (right(m, W.ends[st.slot.word]) - m.xs[W.starts[st.slot.word]]) : 0;
  const lineShift = -slotShift / 2;
  const font: React.CSSProperties = { position: 'absolute', top, fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: `${track}em`, lineHeight: 1, whiteSpace: 'pre', fontVariationSettings: fvsOf(undefined, weight, p.vary) };
  const fill = st.fill ? `linear-gradient(90deg, ${st.fill.stops.map((s) => `${s.c} ${px(s.x * size)}`).join(', ')})` : undefined;
  const xOf = (i: number) => padX + m.xs[i] + (st.slot && W.wordOf[i] > st.slot.word ? slotShift : 0) + lineShift;

  const glyphSpan = (g: GlyphState, i: number, key: string, extra: React.CSSProperties = {}, dx = 0, dy = 0) => (
    <span
      key={key}
      style={{
        ...font,
        left: xOf(i),
        color: fill ? 'transparent' : g.color,
        opacity: g.opacity,
        transform: `translate(${px((g.dx + dx) * size)}, ${px((g.dy + dy) * size)}) rotate(${g.rot.toFixed(2)}deg) scale(${g.sx.toFixed(4)}, ${g.sy.toFixed(4)})`,
        transformOrigin: '50% 78%',
        filter: g.blur > 0.002 ? `blur(${px(g.blur * size)})` : undefined,
        fontVariationSettings: fvsOf(g.vary, weight, p.vary),
        ...(fill ? { backgroundImage: fill, backgroundSize: `${px(m.width)} 100%`, backgroundPosition: `${px(-m.xs[i])} 0`, backgroundRepeat: 'no-repeat', WebkitBackgroundClip: 'text', backgroundClip: 'text' } : {}),
        ...extra,
      }}
    >
      {g.ch}
    </span>
  );

  const glyphs = (prefix: string) =>
    st.glyphs.map((g, i) => {
      if (g.ch === ' ' || (st.slot && W.wordOf[i] === st.slot.word)) return null;
      const out: React.ReactNode[] = [];
      if (g.mosaic !== undefined) {
        const cells = mosaicCells(i, g.mosaic, 5, p.spec.seed ?? 0);
        const cw = m.ws[i] / 5;
        const ch = (size * 0.72) / 5;
        cells.forEach((cc, k) =>
          out.push(<div key={`${prefix}m${i}-${k}`} style={{ position: 'absolute', left: xOf(i) + cc.x * cw, top: top + size * 0.06 + cc.y * ch, width: cw * 0.86, height: ch * 0.86, background: colorsOf(p.spec).accent }} />),
        );
      }
      if (g.opacity <= 0.001) return out.length ? out : null;
      const sm = Math.hypot(g.smear[0], g.smear[1]);
      if (sm > 0.01)
        [0.45, 0.28, 0.14].forEach((o, k) => out.push(glyphSpan({ ...g, opacity: g.opacity * o }, i, `${prefix}s${i}-${k}`, {}, (g.smear[0] * (k + 1)) / 3, (g.smear[1] * (k + 1)) / 3)));
      out.push(glyphSpan(g, i, `${prefix}g${i}`));
      return out;
    });

  const slotLeft = st.slot ? padX + m.xs[W.starts[st.slot.word]] + lineShift : 0;
  const slot = st.slot
    ? st.slot.items.map((it, k) => {
        const base: React.CSSProperties = {
          ...font,
          left: slotLeft,
          color: it.color,
          fontVariationSettings: fvsOf(it.vary, weight, p.vary),
          fontWeight: it.vary?.wght ?? weight,
          filter: it.blur > 0.002 ? `blur(${px(it.blur * size)})` : undefined,
          transformOrigin: '50% 60%',
        };
        const t = (dx: number, dy: number) => `translate(${px((it.x + dx) * size)}, ${px((it.y + dy) * size)}) scale(${(it.scale ?? 1).toFixed(4)})`;
        const sm = Math.hypot(it.smear[0], it.smear[1]);
        return (
          <React.Fragment key={`slot${k}`}>
            {sm > 0.01
              ? [0.4, 0.22, 0.1].map((o, j) => (
                  <span key={j} style={{ ...base, opacity: it.opacity * o, transform: t((it.smear[0] * (j + 1)) / 3, (it.smear[1] * (j + 1)) / 3) }}>
                    {it.text}
                  </span>
                ))
              : null}
            <span style={{ ...base, opacity: it.opacity, transform: t(0, 0) }}>{it.text}</span>
          </React.Fragment>
        );
      })
    : null;

  const glow = Math.max(0, ...st.glyphs.map((g) => g.glow ?? 0));
  const col = colorsOf(p.spec);
  const layers = st.layers;
  const strips = layers.find((l) => l.kind === 'strips') as Extract<TypeLayer, { kind: 'strips' }> | undefined;
  const echoL = layers.find((l) => l.kind === 'echo') as Extract<TypeLayer, { kind: 'echo' }> | undefined;
  const alt = layers.find((l) => l.kind === 'alt') as Extract<TypeLayer, { kind: 'alt' }> | undefined;
  const cover = layers.find((l) => l.kind === 'cover') as Extract<TypeLayer, { kind: 'cover' }> | undefined;

  const body = (key: string) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, width: boxW, height: boxH }}>
      {st.box ? (
        <div
          style={{
            position: 'absolute',
            left: boxW / 2 + st.box.x0 * size + lineShift,
            top: boxH / 2 + st.box.y0 * size + size * 0.02,
            width: (st.box.x1 - st.box.x0) * size,
            height: (st.box.y1 - st.box.y0) * size,
            background: st.box.color,
            opacity: st.box.opacity,
            filter: st.box.feather > 0 ? `blur(${px(st.box.feather * size)})` : undefined,
            clipPath: st.box.wipe > 0 ? `inset(-20% -20% -20% ${(st.box.wipe * 100).toFixed(2)}%)` : undefined,
          }}
        />
      ) : null}
      {alt && m.alt?.[alt.index]
        ? (() => {
            const a = m.alt[alt.index];
            const AW = wordMap(a.text);
            return [...a.text].map((ch, i) =>
              ch === ' ' || AW.wordOf[i] === alt.hide ? null : (
                <span key={`alt${i}`} style={{ ...font, left: padX + (m.width - a.width) / 2 + a.xs[i], color: alt.color }}>
                  {ch}
                </span>
              ),
            );
          })()
        : null}
      {glyphs(key)}
      {slot}
      {layers.map((l, k) => {
        if (l.kind === 'dot') {
          const d = TYPE_PRESETS.dot.size * size * l.s;
          return <div key={`dot${k}`} style={{ position: 'absolute', left: padX + l.x * size + lineShift, top: top + size * 0.76 - d, width: d, height: d, background: l.color, opacity: l.opacity }} />;
        }
        if (l.kind === 'caret')
          return <div key={`caret${k}`} style={{ position: 'absolute', left: padX + l.x * size, top: top + size * 0.04, width: Math.max(2, size * 0.055), height: size * 0.86, background: l.color, opacity: l.opacity }} />;
        if (l.kind === 'stamps')
          return l.stamps.map((s, j) => {
            const w = s.word;
            const x0 = padX + m.xs[W.starts[w]];
            return (
              <span key={`st${k}-${j}`} style={{ ...font, left: x0, color: col.ink, opacity: s.opacity, transform: `translate(${px(s.dx * size)}, ${px(s.dy * size)}) scale(${s.s.toFixed(4)})`, transformOrigin: '50% 60%' }}>
                {W.words[w]}
              </span>
            );
          });
        return null;
      })}
    </div>
  );

  const group: React.CSSProperties = {
    position: 'absolute',
    left: cx - boxW / 2,
    top: cy - boxH / 2,
    width: boxW,
    height: boxH,
    transform: `translate(${px(st.x * size)}, ${px(st.y * size)}) scale(${st.scale.toFixed(5)})`,
    transformOrigin: `${px(boxW / 2 + st.origin[0] * size)} ${px(boxH / 2 + st.origin[1] * size)}`,
    opacity: st.opacity,
    filter: st.blur > 0.002 ? `blur(${px(st.blur * size)})` : undefined,
  };
  const dashes = layers.find((l) => l.kind === 'dashes') as Extract<TypeLayer, { kind: 'dashes' }> | undefined;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={group}>
        {dashes
          ? dashes.dashes.map((d, k) => (
              <div key={`dash${k}`} style={{ position: 'absolute', left: boxW / 2 + d.x * size, top: boxH / 2 + d.y * size, width: d.w * size, height: Math.max(2, size * 0.06), background: dashes.color, opacity: d.opacity }} />
            ))
          : null}
        {echoL
          ? echoL.copies.map((cp, k) => (
              <div key={`echo${k}`} style={{ position: 'absolute', left: padX - echoL.pad * size, top: top - echoL.pad * size, width: m.width + 2 * echoL.pad * size, height: size * (1 + 2 * echoL.pad), background: echoL.ground, transform: `translate(${px(cp.dx * size)}, ${px(cp.dy * size)})` }}>
                <span style={{ ...font, top: echoL.pad * size, left: echoL.pad * size, color: echoL.color }}>{p.spec.text}</span>
              </div>
            ))
          : null}
        {glow > 0.01 ? (
          <div style={{ position: 'absolute', inset: 0, opacity: 0.55 * glow, filter: `blur(${px(size * 0.12)})` }}>
            {st.glyphs.map((g, i) => (g.ch === ' ' || g.opacity <= 0 ? null : <span key={`gl${i}`} style={{ ...font, left: xOf(i), color: col.accent }}>{g.ch}</span>))}
          </div>
        ) : null}
        {strips
          ? strips.bands.map((b, k) => (
              <div key={`band${k}`} style={{ position: 'absolute', inset: 0, clipPath: `inset(${px(top + b.a0 * size)} -100% ${px(boxH - top - b.a1 * size)} -100%)`, transform: `translateX(${px(b.d * size)})` }}>
                {body(`b${k}`)}
              </div>
            ))
          : body('main')}
      </div>
      {cover ? <div style={{ position: 'absolute', inset: 0, background: cover.color, opacity: cover.opacity }} /> : null}
    </div>
  );
};
