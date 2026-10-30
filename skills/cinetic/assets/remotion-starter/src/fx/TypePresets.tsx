import React, { useMemo } from 'react';
import { C, FONT, TYPE } from '../brand/tokens';
import { clamp, E, type Ease, expOut, fd, lmix, mix, perFrame, prog, rand } from '../lib/anim';
import { mixColor, toOklch } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { EMPHASIS_LOOK } from '../lib/look';
import { phrase, type PhraseShape, phraseShape } from '../lib/cadence';
import { baselineOf } from '../lib/measure';
import { PACE } from '../lib/pace';
import type { Declares, Seam, SteppedRange } from '../timeline';
import { ECHO_COPIES, echoCopiesState } from './Echoes';
import { arcOffset, letterState } from './Letters';
import { LINESNAP_HOUSE, makeRoomState, scaleSnapState } from './LineSnap';
import { maskProgress } from './MaskRise';
import { decodeState, mosaicCells } from './Scramble';
import { slicesState } from './Slices';
import { erodeRiseState, fontCycleState, type FontState } from './TypeFx';
import { barBottom, EMPHASIS_DOES, type EmphasisResolved, type EmphasisSpec, emphasisAt, emphasisProgress, emphasisRun, holdTracking, parseKeyed, resolveEmphasis, skipInk } from './TypeEmphasis';
import { typeFillState } from './TypeFill';
import { wordFrames, type WordsSpec, wordState } from './Words';

/**
 * Type presets: two entries and twenty-three line animations. A launch film says its story in short
 * sentences, one clean line on screen at a time, and every line arrives its own way. Each preset is a
 * pure state function of the frame for ONE line (`typeLineState`), tuned to the house timing for
 * strong type moves (frames at 60 fps below, converted with the film's rate; `pace`
 * stretches every length of a preset at once). One renderer, <TypeLine>, draws all of them from the real
 * font's prefix widths, so kerning holds and every glyph is its own transform.
 *
 * The two entries are the plain arrival of a line when no device is the idea (defaults, not devices: they may repeat):
 *   crisp      a hero line: word by word 7 f apart (6-8), each word rising 0.32 em and sharpening from an 8 px blur
 *              (at 1080p) on E.out over 26 f, so the words move while they resolve (crispWords(): the same entry
 *              for <Words> and <Chain>)
 *   calm       a body line: the canonical reveal at the calm pace whatever the film's pace (32 f on E.snapOut, a
 *              third of the line box of rise over 25 f on M.rise, 12 f apart on the reading cadence, no blur: calmWords())
 * An end card never fades in letter by letter: END_CARD_PRESETS leaves out the letter-unit presets (TYPE_PRESET_UNIT).
 * A hero line takes a confident preset (HERO_PRESETS: every word is solid ink within a few frames and moves while it
 * lands); the soft ones (SOFT_PRESETS: a line that reads blurred or half-faded for a long stretch) never take a hero
 * line: heroPreset(p) turns them into crisp.
 *
 * The confident moves, at the house numbers (60 fps frames):
 *   mask       each word rises out of a mask on its baseline: a near-linear head that covers 85 % of 1.05 em in 8 f
 *              and stops dead, darkening from the mute to the ink as it rises; words 8 f apart, the last word 2.5x
 *              slower (MaskRise's linear stop): no fade and no blur, the mask does the reveal
 *   land       the line cuts in oversized (house x1.7; x1.3-2.4 in use) and lands on E.glideOut over 34 f, never
 *              below its size, crisp: a slight defocus rides the scale (0.05 em per unit of scale over 1, sharp as it
 *              lands); given an accent (`colors.accent`) it lands in it and cools to ink 12 f before the scale; with
 *              `lead` only the first words land, the rest append 12 f apart, each cut on at 45 % (solid in 6 f; in the
 *              accent, cooling 13 f after a 6 f hold) while the line re-centres (E.glideOut, 24 f)
 *   fly        every word flies in from the camera: it shows at x5 and soft (0.3 em at that size, the defocus riding
 *              the scale), lands in log scale on E.snapOut in 14 f, 10 f after the last, touching the word before;
 *              8 f after the last lands the spaces open (10 f) and the accent cools to ink left to right, 7 f apart;
 *              then the line recedes 0.15 % a frame (6 % at most)
 *   snap       the words read small (1 / 2.2 of their size, 6 f apart, each solid within 4 f) and, 14 f after the
 *              second last, the last word lands with ONE frame of x2.2 on the whole line: the read words settle
 *              31 px@1080 on E.glideOut, a 3.1 px defocus clears in 7/30 s and the new word fades from 16 % with an
 *              11 px rise (LineSnap scale snap; the jump frame is declared)
 *   room       the held words sit centred; 36 f after the second last the held words creep (17 % of the way,
 *              speeding up 28x), cover 67.5 % in ONE frame and settle on a 0.24 s tail, and the last word cuts on
 *              in the room it made, settling up 0.07 em in 8 f (LineSnap make room; the jump frame is declared)
 *   glide      the set line arrives whole and already moving, sliding 2.4 em from the right on an expo-out (k 3.3,
 *              96 f: it keeps x0.966 of its speed a frame, so it slows into a drift); laid out at 20 % behind a
 *              0.07 em blur, its words resolve left to right, 3.5 f apart, to solid in 8 f; the last word takes 2.5x
 *              as long and closes a 0.3 em gap
 *   fall       each word drops 0.28 em into place from above on E.snapOut in 12 f, from 40 % and the mute to the
 *              ink, trailing a short vertical smear, 9 f apart; the last word lands in the accent and cools over 30 f
 *   open       each word cuts on soft and in the accent, touching the last (a 0.05 em defocus that falls to 0.41 of
 *              itself a frame at 30 fps), then the space opens in 7 f and the line re-centres on E.jump with a
 *              motion trail on its fast frames; the accent holds 6 f and cools to ink over 13 f; 12 / 7 / 12 f apart
 *   build      the canonical word build, the house text voice: the line builds word by word, 6 f apart, each word
 *              fading in over 20 f (E.out) in a tint of the accent that walks to the accent (45 % of 18 f) and darkens
 *              to the ink, while the line re-centres on an expo settle (E.expo) over 15 f, so it stays centred as it
 *              grows. A film reads most of its lines on one voice (this, or one other preset)
 *
 * The devices:
 *   develop   colour fronts run through the line: the tint reveals it behind a crisp 1.1 em edge (22 f), then the
 *              accent (64 f) and the ink (130 f), which stalls at 85 % of the line and catches up last, so the last
 *              word stays in colour longest (TypeFill develop under the hood)
 *   typeFocus  (soft) a big line types on an eased typewriter (30 characters a second, E.type) a little out of
 *              focus (0.12 em); at 25 % of the typing the focus pulls in (blur x0.65 per frame at 30 fps); the
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
 * Exits (`exit` at `out`) leave at speed and are cut on their fastest frame; none of them fades a statement out:
 *   cut; slide (the line accelerates sideways on E.buildIn, 1.5 em in 22 f, and its last three words drop off
 *   right to left 2 f apart before the cut); spread (the words track apart on E.launchIn, 0.5 em per word of the line
 *   further out, while the camera zooms x1.6 toward the first word and the words go right to left, 26 f); collapse
 *   (the tracking collapses toward the line's centre on E.buildIn, 12 % of each glyph's distance, trailing toward the
 *   edges, cut after 10 f); drop (words fall right to left, 4 f apart, E.buildIn 14 f); drift
 *   (dead still, then up and away on E.launchIn, 0.5 em in 30 f, smeared, never faded); push (the line moves up a line
 *   and a quarter on E.liftOut over 28 f and dims to 36 % on its first frame); split (strips spread apart, 43 f);
 *   swarm (words shrink into depth on twos, 12 f, leaving stamps); dive (the camera zooms through one glyph at a
 *   constant log rate, x8.2 in 14 f, and the glyph's ink fills the frame: the line becomes the next shot's ground);
 *   blur (soft: defocus to 0.35 em and fade, 18 f, for a small secondary line only). `dot` adds a square full stop in
 *   the accent that lands 5 f after the line and grows from 82 % in 13 f.
 *
 * Emphasis (`emph`, fx/TypeEmphasis, the numbers in lib/look.ts EMPHASIS_LOOK): every preset can set its key words
 * apart: weight (the family's emphasis weight in the accent, width held), accent, scale and swell (one step up the type
 * scale on the baseline; swell grows in after the landing while the line re-flows round it), marker and box (a bar or
 * the inverted box wiping on behind them, the words knocked out to the ground), under (a rule drawn under them),
 * outline (an outline that fills once landed) and sweep (the accent crossing them and staying). The key words are
 * written between asterisks in `text` ("Brook is a *water bottle*.") or given as `keys`. A line takes the device its
 * film gives it (fx/TypeEmphasis filmEmphasis: one kind, on at most 60 % of the lines) and none otherwise: <TypeLine>
 * adds no house device. The colour follows the preset's own path and lands in
 * the device's colour (the preset run again with that colour as its ink). `align` sets the line flush left or right
 * of its anchor (a stack, an editorial layout): the re-centring moves then hold the aligned edge.
 *
 * Offsets, blurs and sizes in the state are em of the type size; positions come from `LineMetrics`
 * (the renderer measures the real font; tests pass monoMetrics()). Pure and Node-safe except
 * <TypeLine> and measureLine() (call those under <FontGate>). declares(): the font cycle, the redaction
 * hops, the swarm's twos and the decode's blocks are stepped runs; the snap's and the make-room's jump frames are
 * one-frame steps; a dive exit is a zoom-through seam.
 */

// ------------------------------------------------------------------------------------------------ house numbers

/** House numbers: frames at 60 fps, offsets in em. Tuned frame by frame on rendered moves. */
export const TYPE_PRESETS = {
  crisp: { dur60: 26, gap60: 7, riseEm: 0.32, blurPx: 8 }, // the hero entry (blurPx at 1080p, scaled with the frame)
  calm: { pace: 'calm' as const }, // the body entry: PACE.calm's canonical reveal (lib/pace.ts)
  mask: { stagger60: 8, head60: 8, last: 2.5, travel: 1.05, clip: 1.02, inkOfHead: 1.14, inkPower: 1.5 },
  land: { from: 1.7, settle60: 34, blurPerScale: 0.05, coolEarly60: 12, gap60: 12, appearFrom: 0.45, appear60: 6, hold60: 6, cool60: 13, recentre60: 24 },
  fly: { gap60: 10, land60: 14, from: 5, blurEm: 0.3, openLate60: 8, open60: 10, coolStep60: 7, cool60: 13, recede: 0.0015, recedeMax: 0.06 },
  snap: { gap60: 6, hold60: 14, appear60: 4, appearFrom: 0.45, recentre60: 22 },
  room: { gap60: 8, hold60: 36, settle60: 8, settleEm: 0.07, recentre60: 22 },
  glide: { step60: 3.5, resolve60: 8, from: 0.2, blurEm: 0.07, last: 2.5, gapEm: 0.3, slideEm: 2.4, slide60: 96, slideK: 3.3 },
  fall: { gap60: 9, drop60: 12, dropEm: 0.28, from: 0.4, smear: 0.12, linger60: 30 },
  develop: { head60: 22, fronts60: [40, 64, 130], stall: 0.85, feather: 1.1, edge: 0.45 },
  build: { gaps60: [6], lastGap60: 6, fade60: 20, ink60: 18, tintShare: 0.45, recentre60: 15 },
  typeFocus: { cps: 30, blurEm: 0.12, decay30: 0.65, focusAt: 0.25, accent60: 10, push: 0.04, push60: 150, blink60: 32 },
  arc: { stagger60: 2, dur60: 10, from: 0.45, angle: 25, blurEm: 0.06 },
  assemble: { delay60: 20, land60: 16, dyEm: [0.45, 1.3] as [number, number], dxEm: 0.12, push: 0.06, push60: 150 },
  decode: { perGlyph60: 3, bloom60: 16, dashes: 18, dash60: 22 },
  wheel: { lead60: 20, gapFrom60: 16, gapTo60: 6, roll60: 10, settle60: 16, ghost: 0.18, pitch: 1.08, pop: 0.06, pop60: 14, zoom: 0.04 },
  erode: { stagger60: 4, word60: 14, riseIn: 0.12, hold60: 54, every60: 3, frames60: 6, riseDelay60: 6, rise60: 20, riseStagger60: 6, riseEm: 0.45, reflow60: 24 },
  cycle: { every60: 6, scaleFrom: 0.86, word60: 12 },
  punch: { push: 0.24, push60: 28, creep: 0.03, creep60: 120, blurEm: 0.08, focus60: 6 },
  echo: { lead60: 12, lags60: ECHO_COPIES.lags60, out60: ECHO_COPIES.out60, contract: 0.05, contract60: 48, ox: 0.62, oy: 0.82, pad: 0.05 },
  open: { gaps60: [12, 7, 12, 12, 12], open60: 7, recentre60: 22, focusEm: 0.05, focusDecay30: 0.41, hold60: 6, cool60: 13, trail: 0.5 },
  highlight: { stagger60: 4, word60: 20, rise: 0.14, start60: 24, step60: 8, hop60: 6, grow60: 6, park60: 24, wipe60: 12, feather: 0.08, pad: 0.1, h: 0.98 },
  slice: { n: 9, frames60: 43, spread: 0.55 },
  redact: { per60: 2, pad: 0.1, h: 0.92 },
  swarm: { spread60: 6, grow60: 16, from: 0.29, wander: 1.4, stamps: 3, jitter60: 8, jitterEm: 0.035 },
  exit: { blur60: 18, blurEm: 0.35, drop60: 14, dropStagger60: 4, dropEm: 0.6, drift60: 30, driftEm: 0.5, push60: 28, pushEm: 1.25, pushDim: 0.36, split60: 43, splitSpread: 0.5, swarm60: 12, swarmTo: 0.24, dive60: 14, diveScale: 8.2, cover60: 4, slide60: 22, slideEm: 1.5, slideDrop60: 2, slideDrops: 3, spread60: 26, spreadEm: 0.5, spreadZoom: 1.6, spreadFade60: 8, collapse60: 10, collapse: 0.12 },
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
  | 'crisp' | 'calm'
  | 'mask' | 'land' | 'fly' | 'snap' | 'room' | 'glide' | 'fall'
  | 'develop' | 'build' | 'typeFocus' | 'arc' | 'assemble' | 'decode' | 'wheel' | 'erode'
  | 'cycle' | 'punch' | 'echo' | 'open' | 'highlight' | 'slice' | 'redact' | 'swarm';
export type TypeExit = 'cut' | 'slide' | 'spread' | 'collapse' | 'drop' | 'drift' | 'push' | 'split' | 'swarm' | 'dive' | 'blur';
export const TYPE_PRESET_NAMES: TypePresetName[] = ['crisp', 'calm', 'mask', 'land', 'fly', 'snap', 'room', 'glide', 'fall', 'open', 'build', 'punch', 'develop', 'typeFocus', 'arc', 'assemble', 'decode', 'wheel', 'erode', 'cycle', 'echo', 'highlight', 'slice', 'redact', 'swarm'];
export const TYPE_EXITS: TypeExit[] = ['cut', 'slide', 'spread', 'collapse', 'drop', 'drift', 'push', 'split', 'swarm', 'dive', 'blur'];
/** What each preset moves: a letter at a time, a word at a time, or the line as one. */
export const TYPE_PRESET_UNIT: Record<TypePresetName, 'letter' | 'word' | 'line'> = {
  crisp: 'word', calm: 'word', mask: 'word', land: 'line', fly: 'word', snap: 'word', room: 'word', glide: 'word', fall: 'word',
  develop: 'line', build: 'word', typeFocus: 'letter', arc: 'letter', assemble: 'letter', decode: 'letter',
  wheel: 'word', erode: 'letter', cycle: 'word', punch: 'line', echo: 'line', open: 'word', highlight: 'word', slice: 'line', redact: 'word', swarm: 'word',
};
/** Presets an end card's name or tagline may arrive with: never letter by letter (the name is read whole, once). */
export const END_CARD_PRESETS: TypePresetName[] = TYPE_PRESET_NAMES.filter((p) => TYPE_PRESET_UNIT[p] !== 'letter');
/** The preset an end-card line takes: `p` when it moves words or the whole line, else the crisp entry. */
export const endCardPreset = (p: TypePresetName): TypePresetName => (TYPE_PRESET_UNIT[p] === 'letter' ? 'crisp' : p);
/**
 * The confident presets a hero line (the hook, the claim, the promise) takes: every word is solid ink within a few
 * frames and moves while it lands. crisp stays the hero default when no device is the idea.
 */
export const HERO_PRESETS: TypePresetName[] = ['crisp', 'mask', 'land', 'fly', 'snap', 'room', 'glide', 'fall', 'open', 'build', 'punch'];
/** Presets that read blurred or half-faded for a long stretch: a body line or a product moment at most, never a hero line. */
export const SOFT_PRESETS: TypePresetName[] = ['typeFocus'];
/** Exits that fade a line instead of carrying it out at speed: a small secondary line only. */
export const SOFT_EXITS: TypeExit[] = ['blur'];
/** The preset a hero line takes: `p` unless it is a soft one, then the crisp entry. */
export const heroPreset = (p: TypePresetName): TypePresetName => (SOFT_PRESETS.includes(p) ? 'crisp' : p);

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
  lead?: number; // land: how many words land oversized together (default all); the others append after the landing
  scaleFrom?: number; // land: the scale the line cuts in at (default the house x1.7); fly: the scale each word starts at (default x5)
  keys?: [number, number]; // the key words (first and last word index; *marks* in `text` set them): the emphasis lands on them, the first is the keyword
  emph?: EmphasisSpec; // the emphasis device on the key words (fx/TypeEmphasis filmEmphasis); false or unset: none
  align?: 'centre' | 'left' | 'right'; // the line's anchor: its centre (default) or its left or right edge; re-centring moves hold that edge
  seed?: string | number;
  id?: string;
};

/** A glyph set in the emphasis style: its size against the line's (k), its weight and tracking (em). */
export type GlyphStyle = { k: number; weight: number; track: number };

/** Measured layout of a line (px): each glyph's left edge and advance, the line width, the size, a space. */
export type LineMetrics = {
  size: number;
  xs: number[];
  ws: number[];
  width: number;
  space: number;
  alt?: { text: string; xs: number[]; ws: number[]; width: number }[]; // the preset's other strings (typeLineAlts)
  style?: (GlyphStyle | undefined)[]; // the key words' glyphs in the emphasis style (undefined: the line's own)
  base?: { xs: number[]; ws: number[]; width: number }; // the layout without the emphasis's size and weight (a swell grows from it)
  baseline?: number; // em from the top of the glyph's 1 em box down to the baseline (default 0.8)
  weight?: number; // the line's own weight (a swell's weight grows from it)
};

/** A line's text with its *marks* taken out and its key words, emphasis and keyword filled in from them. Pure. */
export const typeLineSpec = (s: TypeLineSpec): TypeLineSpec => {
  if (!s.text.includes('*')) return s;
  const k = parseKeyed(s.text);
  const keys = s.keys ?? k.words ?? undefined;
  return { ...s, text: k.text, keys, key: s.key ?? keys?.[0] };
};

/** The roles a hero line is set in. */
export const EMPHASIS_ROLES = ['line', 'display', 'hero'] as const;

/**
 * The emphasis a line takes in <TypeLine>: its own `emph` (the one its film gave it: fx/TypeEmphasis filmEmphasis),
 * else none. No house device is added: a film's emphasis is one kind on at most 60 % of its lines, never one on every
 * line. Pure.
 */
export const defaultEmphasis = (s: TypeLineSpec, _role: string = 'line'): TypeLineSpec => s;

/** The resolved emphasis of a (normalised) line spec, or null. Pure. */
export const lineEmphasis = (s: TypeLineSpec): EmphasisResolved | null => {
  const W = wordMap(s.text);
  const c = colorsOf(s);
  // the slot presets draw the keyword as their own items: it takes the colour devices only, never a size or weight
  const slotKey = s.preset === 'wheel' || s.preset === 'erode' || s.preset === 'cycle';
  const r = resolveEmphasis(s.emph, W.n, keyOf(s, W.n), { marked: s.keys ?? null, accent: c.accent, ink: c.ink });
  if (!r) return null;
  return slotKey ? { ...r, scale: 1, weight: undefined, hold: false } : r;
};

/** The first and last glyph of a word range. */
const glyphRange = (W: ReturnType<typeof wordMap>, words: [number, number]): [number, number] => [W.starts[words[0]] ?? 0, W.ends[words[1]] ?? Math.max(0, W.chars.length - 1)];

/** Emphasis state at a frame: the device, its key words and glyphs, its progress (0..1) and the frame it started. */
export type EmphasisState = EmphasisResolved & { glyphs: [number, number]; p: number; from: number };

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
  clip?: number; // em from the top of the glyph's box at rest: a mask edge fixed in the line; ink below it is hidden (mask)
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
  emph?: EmphasisState; // the emphasis device on the key words (fx/TypeEmphasis)
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

/**
 * Synthetic metrics with a fixed advance (em): tests, and a layout before the font is measured. Given `emph` (a resolved
 * emphasis with a size), the key words' advances grow by its scale (a mono face has no weight to measure). Pure.
 */
export const monoMetrics = (text: string, size = 100, adv = 0.56, alts: string[] = [], emph?: Pick<EmphasisResolved, 'words' | 'scale' | 'weight'> | null): LineMetrics => {
  const one = (t: string) => {
    const n = [...t].length;
    const xs = Array.from({ length: n }, (_, i) => i * adv * size);
    return { text: t, xs, ws: xs.map(() => adv * size), width: n * adv * size };
  };
  const m = one(text);
  const out: LineMetrics = { size, xs: m.xs, ws: m.ws, width: m.width, space: adv * size, alt: alts.map(one), baseline: 0.8 };
  if (!emph || emph.scale === 1) return out;
  const W = wordMap(text);
  const [g0, g1] = glyphRange(W, emph.words);
  const ws = m.ws.map((w, i) => (i >= g0 && i <= g1 ? w * emph.scale : w));
  const xs: number[] = [];
  ws.reduce((x, w, i) => ((xs[i] = x), x + w), 0);
  return { ...out, xs, ws, width: ws.reduce((a, b) => a + b, 0), style: ws.map((_, i) => (i >= g0 && i <= g1 ? { k: emph.scale, weight: emph.weight ?? 500, track: 0 } : undefined)), base: { xs: m.xs, ws: m.ws, width: m.width } };
};

/** The strings a preset lays out besides its own text (wheel values, the old word or line, cycle styles). Pure. */
export const typeLineAlts = (spec: TypeLineSpec): { text: string; vary?: Vary }[] => {
  const s = typeLineSpec(spec);
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

/**
 * Centre shift (em) that keeps the visible part of a growing line centred: the words up to `w` showing. A line set
 * flush left holds its left edge (no shift), one set flush right its right edge.
 */
const ALIGN_SHIFT = { centre: 0.5, left: 0, right: 1 } as const;
const centreShift = (c: Ctx, w: number) => ((c.m.width - right(c.m, c.W.ends[w])) * ALIGN_SHIFT[c.s.align ?? 'centre']) / c.m.size;

/** A re-centring line: the shift follows each new word on `ease` over `dur` frames from its onset. */
const recentre = (c: Ctx, onsets: number[], dur: number, ease: Ease) => {
  let x = centreShift(c, 0);
  for (let w = 1; w < onsets.length; w++) x += (centreShift(c, w) - centreShift(c, w - 1)) * prog(c.f, onsets[w], onsets[w] + dur, ease);
  return x;
};

/**
 * The phrased onsets of a line's n words, `gap` frames apart on average (lib/cadence phrase: the span of an even
 * stagger, so every preset's end frame stays put; fractional frames, as the presets' own numbers are). `shape` names
 * the phrase; without one the line's text deals it (settle twice as often as group or rush). A preset whose last word
 * is the accent (it lands slower, or in the accent) passes 'settle', so the held beat falls before that word.
 */
export const wordOnsets = (s: Pick<TypeLineSpec, 'at' | 'text'>, n: number, gap: number, shape?: PhraseShape): number[] =>
  phrase(n, gap, { shape: shape ?? phraseShape(s.text), seed: s.text, whole: false }).onsets.map((v) => s.at + v);

/** Words that pop on in turn (phrased, `gap` frames apart on average), rising `rise` em on E.snapOut over `dur`. */
const wordsRise = (c: Ctx, st: TypeLineState, gap: number, dur: number, rise: number, color: string, at = c.s.at) => {
  const on = wordOnsets({ at, text: c.s.text }, c.W.n, gap);
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const p = prog(c.f, on[w], on[w] + dur, E.snapOut);
    g.opacity = c.f >= on[w] ? clamp(p * 1.6) : 0;
    g.dy = rise * (1 - p);
    g.color = color;
  });
};

const wordWidth = (c: Ctx, w: number) => right(c.m, c.W.ends[w]) - c.m.xs[c.W.starts[w]];

// ------------------------------------------------------------------------------------------------ presets

/** Onsets of `build`: 6 f apart (gaps60, lastGap60 before the last word of 3+). */
export const buildOnsets = (s: TypeLineSpec, film?: Partial<FilmCtx>): number[] => {
  const B = TYPE_PRESETS.build;
  const fps = fpsOf(film);
  const n = wordMap(s.text).n;
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const out = [s.at];
  for (let w = 1; w < n; w++) out.push(out[w - 1] + T(w === n - 1 && n > 2 ? B.lastGap60 : B.gaps60[Math.min(w - 1, B.gaps60.length - 1)]));
  return out;
};

/**
 * The crisp entry as <Words> props: word by word 7 f apart (60 fps frames), each word fading, rising 0.32 em and
 * sharpening from 8 px (at 1080p) on E.out over 26 f, so it moves while it resolves. Spread it into a hero line's
 * <Words> or <Chain> ({...crispWords(film)}); `stretch` lengthens every length at once. Words clears an entry blur at
 * 60 % of the fade (about 4 f in on E.out); the rise runs the whole 26 f.
 */
export const crispWords = (film?: Partial<FilmCtx>, stretch = 1): Partial<WordsSpec> => {
  const X = TYPE_PRESETS.crisp;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * stretch, fps);
  return { dur: T(X.dur60), ease: E.out, rise: X.riseEm, riseUnit: 'em', riseDur: T(X.dur60), riseEase: E.out, blur: X.blurPx * uOf(film), stagger: T(X.gap60), cadence: 'phrase', subpixel: true };
};

/** The calm entry as <Words> props: PACE.calm's canonical reveal whatever the film's pace (a body line in a crisp film). */
export const calmWords = (film?: Partial<FilmCtx>, stretch = 1): Partial<WordsSpec> => {
  const P = PACE[TYPE_PRESETS.calm.pace];
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * stretch, fps);
  return { pace: P, dur: T(P.wordDur), stagger: T(P.stagger), riseDur: T(P.riseDur ?? P.wordDur), blur: 0 };
};

/** The Words spec an entry preset draws its line with (crisp or calm). */
const entrySpec = (s: TypeLineSpec, film?: Partial<FilmCtx>): WordsSpec => ({
  text: s.text,
  start: s.at,
  ...(s.preset === 'crisp' ? crispWords(film, s.pace ?? 1) : calmWords(film, s.pace ?? 1)),
});

/** crisp and calm: each word moves as the Words entry draws it (opacity, rise, blur); a given keyword sits in the accent. */
const entry = (c: Ctx): TypeLineState => {
  const st = blank(c, c.col.ink);
  const ws = wordState(c.f, { ...entrySpec(c.s, c.film), size: c.m.size }, c.film).words;
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0 || !ws.length) return;
    const q = ws[Math.min(w, ws.length - 1)];
    g.opacity = q.opacity;
    g.dy = q.y;
    g.dx = q.x;
    g.blur = q.blur / c.m.size;
    if (c.s.key !== undefined && w === c.key) g.color = c.col.accent;
  });
  return st;
};

const develop = (c: Ctx): TypeLineState => {
  const D = TYPE_PRESETS.develop;
  const st = blank(c, c.col.ink);
  const pale = c.col.tint; // the head reveals the line in the tint at full strength behind a crisp edge: never a pale, half-faded run
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

/** A word's colour on the build path at `k` (0..1 of its 18 f): the tint walks to the accent, then darkens to the ink. */
const buildColor = (c: Ctx, k: number, to = c.col.ink) => {
  const B = TYPE_PRESETS.build;
  return k < B.tintShare ? mixColor(c.col.tint, c.col.accent, smoothstep(k / B.tintShare)) : mixColor(c.col.accent, to, clamp((k - B.tintShare) / (1 - B.tintShare)));
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
    g.opacity = prog(c.f, o, o + c.T(B.fade60), E.out); // each word fades in over 20 f, its tint walking to the ink
    const k = clamp((c.f - o) / c.T(B.ink60));
    g.color = buildColor(c, k, keepKey && w === c.key ? c.col.accent : c.col.ink);
  });
  st.x = recentre(c, on, c.T(B.recentre60), E.expo);
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
  st.x = recentre(c, on, c.T(O.recentre60), E.jump);
  // the line's fast frames trail behind it (a shutter's smear, half the frame's travel)
  const v = st.x - recentre({ ...c, f: c.f - 1 }, on, c.T(O.recentre60), E.jump);
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    g.opacity = c.f >= on[w] ? 1 : 0;
    let closed = 0;
    for (let j = 1; j <= w; j++) closed += 1 - k[j];
    g.dx = -space * closed;
    // the new word cuts on soft and sharpens in about three frames at 30 fps (the defocus falls to 0.41 a frame)
    const age = c.f - on[w];
    if (age >= 0) g.blur = O.focusEm * O.focusDecay30 ** ((age * 30) / c.fps);
    if (Math.abs(v) > 0.004) g.smear = [-v * O.trail, 0];
    // the transient accent: the newest word lands in the accent, holds 6 f and cools to the ink over 13 f
    const keep = c.s.key !== undefined && w === c.key;
    g.color = keep ? c.col.accent : mixColor(c.col.accent, c.col.ink, prog(c.f, on[w] + c.T(O.hold60), on[w] + c.T(O.hold60 + O.cool60), E.softOut));
  });
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

// ------------------------------------------------------------------------------------------------ the confident moves

const T60 = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  return (v: number) => f60x(v * (s.pace ?? 1), fps);
};

/** `mask`: each word's onset and head (8 f apart at 60 fps, the last head 2.5x as long), and the line's end. */
export const maskFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const K = TYPE_PRESETS.mask;
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const on = wordOnsets(s, n, T(K.stagger60), 'settle');
  const heads = on.map((_, w) => T(K.head60) * (w === n - 1 && n > 1 ? K.last : 1));
  return { on, heads, end: n ? on[n - 1] + heads[n - 1] : s.at };
};

const mask = (c: Ctx): TypeLineState => {
  const K = TYPE_PRESETS.mask;
  const st = blank(c, c.col.ink);
  const mf = maskFrames(c.s, c.film);
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const o = mf.on[w];
    const p = maskProgress(c.f, { start: o, dur: mf.heads[w] }, 'linearStop', E.out, 0.94, c.fps);
    g.dy = K.travel * (1 - p);
    g.clip = K.clip;
    g.opacity = c.f > o ? 1 : 0;
    const ink = clamp((c.f - o) / (mf.heads[w] * K.inkOfHead)) ** K.inkPower;
    g.color = mixColor(c.col.mute, c.s.key !== undefined && w === c.key ? c.col.accent : c.col.ink, ink);
  });
  return st;
};

/** `land`: the lead group's landing (34 f), each appended word's onset (12 f apart once the lead has landed), the end. */
export const landFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const L = TYPE_PRESETS.land;
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const lead = clamp(Math.round(s.lead ?? n), 1, Math.max(1, n));
  const landed = s.at + T(L.settle60);
  const tail = n - lead > 1 ? wordOnsets({ at: landed, text: s.text }, n - lead, T(L.gap60)) : [landed];
  const on = Array.from({ length: n }, (_, w) => (w < lead ? s.at : tail[w - lead]));
  return { lead, on, landed, end: n > lead ? Math.max(landed, on[n - 1] + T(L.recentre60)) : landed };
};

const land = (c: Ctx): TypeLineState => {
  const L = TYPE_PRESETS.land;
  const st = blank(c, c.col.ink);
  const lf = landFrames(c.s, c.film);
  const from = Math.max(1, c.s.scaleFrom ?? L.from);
  const s = from + (1 - from) * prog(c.f, c.s.at, lf.landed, E.glideOut);
  st.scale = s;
  st.blur = (L.blurPerScale * (s - 1)) / s; // the defocus rides the scale (on screen); the group's filter is drawn before its scale
  st.x = centreShift(c, lf.lead - 1);
  for (let w = lf.lead; w < c.W.n; w++) st.x += (centreShift(c, w) - centreShift(c, w - 1)) * prog(c.f, lf.on[w], lf.on[w] + c.T(L.recentre60), E.glideOut);
  st.origin = [((c.m.xs[0] ?? 0) + right(c.m, c.W.ends[lf.lead - 1]) - c.m.width) / 2 / c.m.size, 0]; // the lead's centre stays put
  // the colour cools from the accent only when the line names one (like an oversized landing): else it lands in ink
  const hot = c.s.colors?.accent !== undefined ? c.col.accent : c.col.ink;
  const cool = prog(c.f, c.s.at, lf.landed - c.T(L.coolEarly60), E.glideOut);
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const keep = c.s.key !== undefined && w === c.key;
    if (w < lf.lead) {
      g.color = keep ? c.col.accent : mixColor(hot, c.col.ink, cool);
      return;
    }
    const o = lf.on[w];
    g.opacity = c.f < o ? 0 : L.appearFrom + (1 - L.appearFrom) * prog(c.f, o, o + c.T(L.appear60), E.snapOut);
    g.color = keep ? c.col.accent : mixColor(hot, c.col.ink, prog(c.f, o + c.T(L.hold60), o + c.T(L.hold60 + L.cool60), E.softOut));
  });
  return st;
};

/** `fly`: each word's onset (10 f apart) and landing (14 f), when the spaces open (8 f after the last lands) and the end. */
export const flyFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const Y = TYPE_PRESETS.fly;
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const on = wordOnsets(s, n, T(Y.gap60));
  const landed = on.map((o) => o + T(Y.land60));
  const open = (landed[n - 1] ?? s.at) + T(Y.openLate60);
  return { on, landed, open, end: open + T(Y.open60) };
};

const fly = (c: Ctx): TypeLineState => {
  const Y = TYPE_PRESETS.fly;
  const st = blank(c, c.col.ink);
  const ff = flyFrames(c.s, c.film);
  const from = Math.max(1.01, c.s.scaleFrom ?? Y.from);
  const n = c.W.n;
  const shut = (1 - prog(c.f, ff.open, ff.end, E.glideOut)) * (c.m.space / c.m.size); // em each word space is still closed
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const o = ff.on[w];
    if (c.f < o) {
      g.opacity = 0;
      return;
    }
    const s = Math.exp(Math.log(from) * (1 - E.snapOut(clamp((c.f - o) / c.T(Y.land60))))); // log scale: one speed toward the lens
    const closed = -shut * (w - (n - 1) / 2); // the words land touching, the line still centred
    const gx = (c.m.xs[i] + c.m.ws[i] / 2 - c.m.width / 2) / c.m.size + closed; // the glyph's centre, em from the line's centre
    g.dx = closed + gx * (s - 1); // scaled about the frame's centre, as a camera would
    g.dy = 0.28 * (s - 1); // keeps the glyph's middle on the line's centre (it scales about 78 % of its box)
    g.sx = s;
    g.sy = s;
    g.blur = (Y.blurEm * (s - 1)) / (from - 1) / s;
    const coolAt = ff.open + c.T(Y.coolStep60) * w;
    g.color = c.s.key !== undefined && w === c.key ? c.col.accent : mixColor(c.col.accent, c.col.ink, prog(c.f, coolAt, coolAt + c.T(Y.cool60), E.softOut));
  });
  if (c.f > ff.end) st.scale = 1 - Math.min(Y.recedeMax, (c.f - ff.end) * (60 / c.fps) * Y.recede); // the line recedes
  return st;
};

/** `snap`: the read words' onsets (6 f apart), the jump frame (14 f after the second last; a whole frame) and the end. */
export const snapFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const S = TYPE_PRESETS.snap;
  const H = LINESNAP_HOUSE.snap;
  const fps = fpsOf(film);
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const on = n > 2 ? [...wordOnsets(s, n - 1, T(S.gap60)), 0] : Array.from({ length: n }, (_, w) => s.at + T(S.gap60) * w);
  const at = n > 1 ? Math.ceil(on[n - 2] + T(S.hold60) - 1e-6) : Math.ceil(s.at - 1e-6);
  if (n) on[n - 1] = at;
  return { on, at, end: at + Math.ceil(Math.max(H.sigmaS, H.settleS, H.wordFadeS) * fps) };
};

const snap = (c: Ctx): TypeLineState => {
  const S = TYPE_PRESETS.snap;
  const H = LINESNAP_HOUSE.snap;
  const st = blank(c, c.col.ink);
  const sf = snapFrames(c.s, c.film);
  const n = c.W.n;
  const ss = scaleSnapState(c.f, { at: sf.at }, c.film);
  const em = uOf(c.film) / c.m.size; // em per px at 1080p
  const small = 1 / H.factor;
  st.scale = ss.snapped ? 1 : small;
  if (!ss.snapped && n > 1) st.x = small * recentre(c, sf.on.slice(0, n - 1), c.T(S.recentre60), E.jump); // centre the read words while small
  if (ss.snapped) st.blur = ss.sigma * em;
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const keep = c.s.key !== undefined && w === c.key;
    if (w === n - 1) {
      g.opacity = ss.snapped ? ss.wordOpacity : 0;
      g.dy = ss.snapped ? ss.wordY * em : 0;
      if (keep) g.color = c.col.accent;
      return;
    }
    const o = sf.on[w];
    g.opacity = c.f < o ? 0 : S.appearFrom + (1 - S.appearFrom) * prog(c.f, o, o + c.T(S.appear60), E.snapOut);
    if (ss.snapped) g.dx = ss.settleX * em; // the read words land beside the new one
    if (keep) g.color = c.col.accent;
  });
  return st;
};

/** `room`: the held words' onsets (8 f apart), the jump frame (36 f after the second last), the creep's first frame, the end. */
export const roomFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const R = TYPE_PRESETS.room;
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const on = n > 2 ? [...wordOnsets(s, n - 1, T(R.gap60)), 0] : Array.from({ length: n }, (_, w) => s.at + T(R.gap60) * w);
  const jump = n > 1 ? Math.ceil(on[n - 2] + T(R.hold60) - 1e-6) : Math.ceil(s.at - 1e-6);
  if (n) on[n - 1] = jump;
  const probe = makeRoomState(0, { start: 0, distance: 1000 }, film);
  const start = jump - probe.jumpFrame;
  return { on, jump, start, end: Math.max(start + probe.end, jump + T(R.settle60)) };
};

const room = (c: Ctx): TypeLineState => {
  const R = TYPE_PRESETS.room;
  const st = blank(c, c.col.ink);
  const rf = roomFrames(c.s, c.film);
  const n = c.W.n;
  if (n > 1) {
    const held = recentre(c, rf.on.slice(0, n - 1), c.T(R.recentre60), E.jump);
    const mr = makeRoomState(c.f, { start: rf.start, distance: -centreShift(c, n - 2) * 1000 }, c.film); // creep, ONE frame, a tail
    st.x = held + mr.x / 1000;
  }
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const o = rf.on[w];
    g.opacity = c.f >= o ? 1 : 0;
    g.dy = R.settleEm * (1 - prog(c.f, o, o + c.T(R.settle60), E.snapOut));
    if (c.s.key !== undefined && w === c.key) g.color = c.col.accent;
  });
  return st;
};

/** `glide`: each word's onset (3.5 f apart) and resolve (8 f, the last 2.5x), and the end. */
export const glideFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const G = TYPE_PRESETS.glide;
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const on = wordOnsets(s, n, T(G.step60), 'settle');
  const durs = on.map((_, w) => T(G.resolve60) * (w === n - 1 && n > 1 ? G.last : 1));
  return { on, durs, end: n ? on[n - 1] + durs[n - 1] : s.at };
};

const glideSlide = expOut(TYPE_PRESETS.glide.slideK);

const glide = (c: Ctx): TypeLineState => {
  const G = TYPE_PRESETS.glide;
  const st = blank(c, c.col.ink);
  const gf = glideFrames(c.s, c.film);
  const n = c.W.n;
  // arrives moving (about 0.09 em a frame at 60 fps) and keeps x0.966 of its speed a frame: it slows into a drift
  st.x = G.slideEm * (1 - glideSlide(clamp((c.f - c.s.at) / c.T(G.slide60))));
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const o = gf.on[w];
    const p = prog(c.f, o, o + gf.durs[w], E.snapOut); // the whole line is laid out from its first frame, faint and soft
    g.opacity = G.from + (1 - G.from) * p;
    g.blur = G.blurEm * (1 - p);
    if (w === n - 1 && n > 1) g.dx = G.gapEm * (1 - prog(c.f, o, o + gf.durs[w], E.glideOut)); // the last word closes its gap
    if (c.s.key !== undefined && w === c.key) g.color = c.col.accent;
  });
  return st;
};

/** `fall`: each word's onset (9 f apart) and landing (12 f), and the end. */
export const fallFrames = (s: TypeLineSpec, film?: Partial<FilmCtx>) => {
  const F = TYPE_PRESETS.fall;
  const T = T60(s, film);
  const n = wordMap(s.text).n;
  const on = wordOnsets(s, n, T(F.gap60), 'settle');
  return { on, end: (on[n - 1] ?? s.at) + T(F.drop60) };
};

const fall = (c: Ctx): TypeLineState => {
  const F = TYPE_PRESETS.fall;
  const st = blank(c, c.col.ink);
  const ff = fallFrames(c.s, c.film);
  const n = c.W.n;
  const accentWord = c.s.key !== undefined ? c.key : n - 1;
  st.glyphs.forEach((g, i) => {
    const w = c.W.wordOf[i];
    if (w < 0) return;
    const o = ff.on[w];
    const p = prog(c.f, o, o + c.T(F.drop60), E.snapOut);
    g.opacity = c.f < o ? 0 : F.from + (1 - F.from) * p;
    g.dy = -F.dropEm * (1 - p);
    if (c.f >= o && p < 1) g.smear = [0, -F.smear * (1 - p)]; // the trail above, where it came from
    if (w === accentWord) {
      const lands = o + c.T(F.drop60);
      const to = c.s.key !== undefined ? c.col.accent : mixColor(c.col.accent, c.col.ink, prog(c.f, lands, lands + c.T(F.linger60), E.softOut));
      g.color = mixColor(c.col.mute, to, p);
    } else g.color = mixColor(c.col.mute, c.col.ink, p);
  });
  return st;
};

const PRESETS: Record<TypePresetName, (c: Ctx) => TypeLineState> = { crisp: entry, calm: entry, mask, land, fly, snap, room, glide, fall, develop, build, typeFocus, arc, assemble, decode, wheel, erode, cycle, punch, echo, open, highlight, slice, redact, swarm };

// ------------------------------------------------------------------------------------------------ frames

/** Key frames of a line: when it is readable, the landing ticks for sound, the exit's last frame. Pure. */
export const typeLineFrames = (spec: TypeLineSpec, m: LineMetrics, film?: Partial<FilmCtx>) => {
  const s = typeLineSpec(spec);
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const P = TYPE_PRESETS;
  const W = wordMap(s.text);
  const n = W.chars.length;
  let resolved = s.at;
  let ticks: number[] = [s.at];
  switch (s.preset) {
    case 'crisp':
    case 'calm': {
      const wf = wordFrames(entrySpec(s, film), { ...film, fps });
      ticks = wf.map((w) => w.start);
      resolved = Math.max(...wf.map((w) => w.settle));
      break;
    }
    case 'develop':
      resolved = s.at + T(P.develop.head60);
      ticks = [s.at, s.at + T(P.develop.fronts60[2])];
      break;
    case 'build': {
      const on = buildOnsets(s, film);
      ticks = on;
      resolved = on[on.length - 1] + T(Math.max(P.build.ink60, P.build.fade60));
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
    case 'mask': {
      const mf = maskFrames(s, film);
      ticks = mf.on;
      resolved = mf.end + T(4);
      break;
    }
    case 'land': {
      const lf = landFrames(s, film);
      ticks = [s.at, ...lf.on.slice(lf.lead)];
      resolved = lf.end;
      break;
    }
    case 'fly': {
      const ff = flyFrames(s, film);
      ticks = ff.on;
      resolved = ff.end;
      break;
    }
    case 'snap': {
      const sf = snapFrames(s, film);
      ticks = sf.on;
      resolved = sf.end;
      break;
    }
    case 'room': {
      const rf = roomFrames(s, film);
      ticks = rf.on;
      resolved = rf.end;
      break;
    }
    case 'glide': {
      const gf = glideFrames(s, film);
      ticks = gf.on;
      resolved = gf.end;
      break;
    }
    case 'fall': {
      const ff = fallFrames(s, film);
      ticks = ff.on;
      resolved = ff.end;
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
    slide: T(E60.slide60),
    spread: T(E60.spread60),
    collapse: T(E60.collapse60),
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
    // dead still, then up and away at speed, cut on its fastest frame: never faded
    const len = c.T(X.drift60);
    if (q >= len) return gone();
    const p = E.launchIn(clamp(q / len));
    st.y -= X.driftEm * p;
    const v = X.driftEm * (p - E.launchIn(clamp((q - 1) / len)));
    if (v > 0.004) st.glyphs.forEach((g) => (g.smear = [g.smear[0], g.smear[1] + v * 0.5])); // the trail below it
    return st;
  }
  if (ex === 'slide') {
    // the line accelerates sideways; its last words drop off right to left, 2 f apart, before the cut
    const len = c.T(X.slide60);
    if (q >= len) return gone();
    st.x += X.slideEm * E.buildIn(clamp(q / len));
    const dropAt = (w: number) => {
      const r = c.W.n - 1 - w;
      return r < X.slideDrops ? len - c.T(X.slideDrop60) * (X.slideDrops - r) : Infinity;
    };
    st.glyphs.forEach((g, i) => {
      const w = c.W.wordOf[i];
      if (w >= 0 && q >= dropAt(w)) g.opacity = 0;
    });
    if (st.slot && q >= dropAt(st.slot.word)) st.slot.items.forEach((it) => (it.opacity = 0));
    return st;
  }
  if (ex === 'spread') {
    // the words track apart while the camera zooms toward the first one; they go from the end, right to left
    const len = c.T(X.spread60);
    if (q >= len) return gone();
    const p = E.launchIn(clamp(q / len));
    const n = c.W.n;
    st.glyphs.forEach((g, i) => {
      const w = c.W.wordOf[i];
      if (w < 0) return;
      g.dx += X.spreadEm * w * p;
      const s0 = len * (0.4 + (0.45 * (n - 1 - w)) / Math.max(1, n - 1));
      g.opacity *= 1 - clamp((q - s0) / c.T(X.spreadFade60));
    });
    st.origin = [((c.m.xs[c.W.starts[0]] + right(c.m, c.W.ends[0])) / 2 - c.m.width / 2) / c.m.size, 0];
    st.scale *= Math.exp(Math.log(X.spreadZoom) * p);
    return st;
  }
  if (ex === 'collapse') {
    // the tracking collapses toward the line's centre, faster and faster, and the line is cut while it moves
    const len = c.T(X.collapse60);
    if (q >= len) return gone();
    const p = E.buildIn(clamp(q / len));
    const v = p - E.buildIn(clamp((q - 1) / len));
    st.glyphs.forEach((g, i) => {
      const gx = (c.m.xs[i] + c.m.ws[i] / 2 - c.m.width / 2) / c.m.size;
      g.dx -= gx * X.collapse * p;
      if (v > 0) g.smear = [gx * X.collapse * v * 1.5, g.smear[1]]; // each glyph trails toward the edge it came from (double images)
    });
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
export const typeLineState = (f: number, spec: TypeLineSpec, m: LineMetrics, film?: Partial<FilmCtx>): TypeLineState => {
  const s = typeLineSpec(spec);
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
  const r = lineEmphasis(s);
  if (r) {
    const [g0, g1] = glyphRange(W, r.words);
    if (r.color && EMPHASIS_DOES[r.device].color) {
      // the key words walk the preset's own colour path and land in the device's colour: the preset again, inked in it
      const alt = PRESETS[s.preset]({ ...c, col: { ...c.col, ink: r.color } });
      for (let i = g0; i <= g1; i++) if (st.glyphs[i] && alt.glyphs[i]) st.glyphs[i].color = alt.glyphs[i].color;
      if (st.slot && alt.slot && st.slot.word >= r.words[0] && st.slot.word <= r.words[1]) st.slot.items.forEach((it, k) => (it.color = alt.slot?.items[k]?.color ?? it.color));
    }
    const from = emphasisAt(r, emphasisRun(r.device).len60 > 0 ? emphasisLanded(fr, W.n, r.words[1], c) : emphasisSolid(fr, W.n, r.words[1], c), fps, s.pace ?? 1);
    st.emph = { ...r, glyphs: [g0, g1], p: emphasisProgress(f, r.device, from, fps, s.pace ?? 1), from };
  }
  if (s.dot && fr.dot !== undefined && f >= fr.dot) {
    const D = TYPE_PRESETS.dot;
    const last = W.ends[W.n - 1];
    const sw = st.slot && st.slot.word === W.n - 1 ? st.slot.width - wordWidth(c, st.slot.word) : 0;
    st.layers.push({ kind: 'dot', x: (right(m, last) + sw) / m.size + 0.07, s: mix(D.from, 1, prog(f, fr.dot, fr.dot + c.T(D.grow60), E.snapOut)), opacity: 1, color: c.col.accent });
  }
  return applyExit(st, c);
};

/**
 * Rest, for the words an emphasis waits on (em; per 60 fps frame for the line's slide): no offset, trail, scale, turn,
 * blur or fade left on any glyph, the line no longer re-centring, for two 60 fps steps running. `max60`: the longest an
 * emphasis waits past the line's resolve for a word that never quite stops (a preset's own drift).
 */
export const EMPHASIS_REST = { d: 0.006, s: 0.006, rot: 0.3, blur: 0.003, opacity: 0.98, slide60: 0.002, max60: 30 } as const;
const restCache = new Map<string, number>();
const atRest = (g: GlyphState) => {
  const R = EMPHASIS_REST;
  return Math.abs(g.dx) < R.d && Math.abs(g.dy) < R.d && Math.abs(g.sx - 1) < R.s && Math.abs(g.sy - 1) < R.s && Math.abs(g.rot) < R.rot && g.blur < R.blur && g.opacity >= R.opacity && Math.hypot(g.smear[0], g.smear[1]) < R.d;
};
/**
 * The first frame from `from` on (scanned in 60 fps steps, at most to `to`) at which every word up to `last` is at rest
 * (EMPHASIS_REST): an emphasis never lands on a word while it, or a word before it, is still moving in. Read on the
 * mono metrics, so the render, the timeline and the sound agree. Memoised per line. Pure.
 */
const restFrame = (c: Ctx, last: number, from: number, to: number): number => {
  const s = c.s;
  const key = JSON.stringify([{ ...s, colors: undefined, out: undefined, exit: undefined, emph: undefined, id: undefined, keys: undefined }, c.fps, last, from, to]);
  const hit = restCache.get(key);
  if (hit !== undefined) return hit;
  const m = monoMetrics(s.text, 100, 0.56, typeLineAlts(s).map((a) => a.text));
  const g1 = c.W.ends[last] ?? c.W.chars.length - 1;
  const step = c.fps / 60;
  let run = 0;
  let prevX: number | null = null;
  let found = to;
  for (let k = 0; from + k * step <= to + 1e-9; k++) {
    const f = from + k * step;
    const st = PRESETS[s.preset]({ ...c, f, m });
    const slide = prevX === null ? 0 : Math.abs(st.x - prevX);
    prevX = st.x;
    let ok = slide < EMPHASIS_REST.slide60 && st.blur < EMPHASIS_REST.blur;
    for (let i = 0; ok && i <= g1; i++) if (c.W.wordOf[i] >= 0 && st.glyphs[i]) ok = atRest(st.glyphs[i]);
    run = ok ? run + 1 : 0;
    if (run >= 2) {
      found = f - step;
      break;
    }
  }
  if (restCache.size > 4000) restCache.clear();
  restCache.set(key, found);
  return found;
};

/** The frame the last key word is solid: its onset tick plus 14 f (60 fps), never after the line resolves (a static device starts here). */
const emphasisSolid = (fr: { ticks: number[]; resolved: number }, n: number, last: number, c: Pick<Ctx, 'T'>) =>
  fr.ticks.length === n && fr.ticks[last] !== undefined ? Math.min(fr.resolved, fr.ticks[last] + c.T(14)) : fr.resolved;
/**
 * The frame an animated emphasis may start from: the last key word solid and every word up to it at rest (restFrame),
 * so a pill, a rule or a bar never lands while the word before it is still rising.
 */
const emphasisLanded = (fr: { ticks: number[]; resolved: number }, n: number, last: number, c: Ctx) => {
  const solid = emphasisSolid(fr, n, last, c);
  return Math.max(solid, restFrame(c, last, solid, Math.max(solid, fr.resolved) + c.T(EMPHASIS_REST.max60)));
};

/** When a line's emphasis device runs (frames): its start and its end (equal for a static device). Pure. */
export const emphasisFrames = (spec: TypeLineSpec, film?: Partial<FilmCtx>): { from: number; to: number } | null => {
  const s = typeLineSpec(spec);
  const r = lineEmphasis(s);
  if (!r) return null;
  const fps = fpsOf(film);
  const T = (v: number) => f60x(v * (s.pace ?? 1), fps);
  const W = wordMap(s.text);
  const m = monoMetrics(s.text, 100, 0.56, typeLineAlts(s).map((a) => a.text));
  const fr = typeLineFrames(s, m, film);
  const c: Ctx = { f: s.at, s, m, fps, film: { ...film, fps }, W, col: colorsOf(s), key: keyOf(s, W.n), seed: s.seed ?? 0, T };
  const from = emphasisAt(r, emphasisRun(r.device).len60 > 0 ? emphasisLanded(fr, W.n, r.words[1], c) : emphasisSolid(fr, W.n, r.words[1], c), fps, s.pace ?? 1);
  return { from, to: from + T(emphasisRun(r.device).len60) };
};

// ------------------------------------------------------------------------------------------------ declares

/** What a line does on purpose: stepped runs (font cycle, redaction hops, swarm on twos, decode blocks, the snap's and the make-room's jump frames) and a dive's seam. */
export const declares = (spec?: TypeLineSpec, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!spec) return none;
  const s = typeLineSpec(spec);
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
  if (s.preset === 'snap' && wordMap(s.text).n > 1) {
    const at = snapFrames(s, film).at;
    stepped.push({ from: at, to: at + 1, id: `${id}-jump` }); // the one-frame scale jump
  }
  if (s.preset === 'room' && wordMap(s.text).n > 1) {
    const at = roomFrames(s, film).jump;
    stepped.push({ from: at, to: at + 1, id: `${id}-jump` }); // the one frame that makes the room
  }
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

/**
 * A line's metrics from the real font (prefix widths keep the kerning) and its preset's other strings. With an emphasis
 * that sets a size or a weight, the key words are measured in their own style (prefix widths inside the run) and the
 * words after them move by what the run adds; a width-holding device tightens the run's tracking so it adds nothing.
 * Browser only.
 */
export const measureLine = (spec: TypeLineSpec, size: number, weight: number, track: number, family: string, vary?: Vary): LineMetrics => {
  const s = typeLineSpec(spec);
  const one = (t: string, v?: Vary, sz = size, wt = weight, tr = track) => {
    const ch = [...t];
    const xs = ch.map((_, i) => measureVar(ch.slice(0, i).join(''), sz, wt, tr, family, v ?? vary));
    const width = measureVar(t, sz, wt, tr, family, v ?? vary);
    return { text: t, xs, ws: xs.map((x, i) => (i + 1 < xs.length ? xs[i + 1] : width) - x), width };
  };
  const m = one(s.text);
  const space = measureVar('a a', size, weight, track, family, vary) - measureVar('aa', size, weight, track, family, vary);
  const out: LineMetrics = { size, xs: m.xs, ws: m.ws, width: m.width, space, alt: typeLineAlts(s).map((a) => one(a.text, a.vary)), baseline: baselineOf(size, weight, 1, family) / size, weight };
  const r = lineEmphasis(s);
  const mark = r ? EMPHASIS_DOES[r.device].mark : undefined;
  // a bar or a box opens room round the key words (its side pad), so it never touches the words beside it
  const room = mark === 'bar' ? EMPHASIS_LOOK.marker.pad * size : mark === 'box' ? EMPHASIS_LOOK.box.pad * size : 0;
  if (!r || (r.scale === 1 && (r.weight === undefined || r.weight === weight) && !room)) return out;
  const W = wordMap(s.text);
  const [g0, g1] = glyphRange(W, r.words);
  const chars = [...s.text];
  const run = chars.slice(g0, g1 + 1).join('');
  const w1 = r.weight ?? weight;
  const k = r.scale;
  const styled = k !== 1 || w1 !== weight;
  // the run at the emphasis weight; a width-holding device fits its tracking to the run's width at the line's weight
  const t1 = r.hold && styled ? holdTracking(track, measureVar(run, size, weight, track, family, vary), measureVar(run, size, w1, track, family, vary), [...run].length, size) : track;
  const key = styled ? one(run, undefined, size * k, w1, t1) : { xs: m.xs.slice(g0, g1 + 1).map((x) => x - m.xs[g0]), ws: m.ws.slice(g0, g1 + 1), width: m.xs[g1] + m.ws[g1] - m.xs[g0] };
  const pre = m.xs[g0] ?? 0;
  const add = key.width - (m.xs[g1] + m.ws[g1] - pre) + 2 * room;
  const xs = m.xs.map((x, i) => (i < g0 ? x : i <= g1 ? pre + room + key.xs[i - g0] : x + add));
  const ws = m.ws.map((w, i) => (i >= g0 && i <= g1 ? key.ws[i - g0] : w));
  const style = styled ? chars.map((_, i) => (i >= g0 && i <= g1 ? { k, weight: w1, track: t1 } : undefined)) : undefined;
  return { ...out, xs, ws, width: m.width + add, style, base: { xs: m.xs, ws: m.ws, width: m.width } };
};

/**
 * The size (px) a line is set at so that, with its emphasis landed, it is no wider than the plain line at `size`: a
 * size device (scale, swell) grows the key words and a bar or a box opens room round them, and the line refits (the
 * other words come down a little, the contrast stays). Other devices hold the width: `size` itself. Browser only.
 */
export const emphasisFitSize = (spec: TypeLineSpec, size: number, weight: number, track: number, family: string, role: string = 'line'): number => {
  const s = defaultEmphasis(typeLineSpec(spec), role);
  const r = lineEmphasis(s);
  if (!r || (r.scale === 1 && !EMPHASIS_DOES[r.device].mark)) return size;
  const plain = measureLine({ ...s, emph: false }, size, weight, track, family).width;
  const grown = measureLine(s, size, weight, track, family).width;
  return grown > plain ? (size * plain) / grown : size;
};

/** The width (px) a line takes once its emphasis has landed (measureLine's width): for a layout that sets pieces side by side. Browser only. */
export const typeLineWidth = (spec: TypeLineSpec, size: number, weight: number, track: number, family: string, role: string = 'line'): number =>
  measureLine(defaultEmphasis(typeLineSpec(spec), role), size, weight, track, family).width;

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
  role?: keyof typeof TYPE; // the type role the line is set in (default 'line', the sentence line of the film's family)
  size?: number; // px (default: the role's size at the film's frame)
  weight?: number; // default: the role's
  family?: string;
  track?: number; // em (default: the role's)
  vary?: Vary; // the line's own axes (cycle lands on these)
  metrics?: LineMetrics; // measured elsewhere (default: measureLine under FontGate)
};

/**
 * <TypeLine spec frame>: one sentence, drawn from its preset's state, set in a type role (default the film's sentence
 * line: TYPE.line's size, weight and tracking; size, weight and track override it). The line box is centred on
 * (x, y); every glyph is its own span at its measured prefix position, moved only by transforms.
 */
export const TypeLine: React.FC<TypeLineProps> = (p) => {
  const film = useFilm();
  const roleName = p.role ?? 'line';
  const role = TYPE[roleName];
  const weight = p.weight ?? role.weight;
  const family = p.family ?? FONT.text;
  const track = p.track ?? role.track;
  const size = p.size ?? (role.size * Math.min(film.width, film.height)) / 1080;
  // the line as drawn: its *marks* read, its emphasis the one its film gave it (none by default)
  const spec = useMemo(() => defaultEmphasis(typeLineSpec(p.spec), roleName), [p.spec, roleName]);
  const m = useMemo(() => p.metrics ?? measureLine(spec, size, weight, track, family, p.vary), [p.metrics, spec, size, weight, track, family, p.vary]);
  const st = typeLineState(p.frame, spec, m, film);
  if (!st.visible) return null;
  const W = wordMap(spec.text);
  const col = colorsOf(spec);
  const cx = p.x ?? film.width / 2;
  const cy = p.y ?? film.height / 2;
  const padX = size * 1.2;
  const boxW = m.width + 2 * padX;
  const boxH = size * 1.6;
  const top = size * 0.3; // the glyph box (1 em) inside the line box
  const align = spec.align ?? 'centre';
  const em = st.emph;
  const does = em ? EMPHASIS_DOES[em.device] : undefined;
  // a swell grows the key words from the line's own layout to the emphasised one, a bar or a box opens its room as it
  // wipes on: the other words slide apart and the line re-centres (kinetic reflow)
  const grow = em && (does?.grows || does?.mark === 'bar' || does?.mark === 'box') ? em.p : 1;
  const lay = m.base && grow < 1 ? { xs: m.xs.map((x, i) => mix(m.base!.xs[i], x, grow)), ws: m.ws.map((w, i) => mix(m.base!.ws[i], w, grow)), width: mix(m.base.width, m.width, grow) } : m;
  const slotShift = st.slot ? st.slot.width - (right(m, W.ends[st.slot.word]) - m.xs[W.starts[st.slot.word]]) : 0;
  const lineShift = -slotShift * ALIGN_SHIFT[align] + (m.width - lay.width) * ALIGN_SHIFT[align];
  const font: React.CSSProperties = { position: 'absolute', top, fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: `${track}em`, lineHeight: 1, whiteSpace: 'pre', fontVariationSettings: fvsOf(undefined, weight, p.vary) };
  const fill = st.fill ? `linear-gradient(90deg, ${st.fill.stops.map((s) => `${s.c} ${px(s.x * size)}`).join(', ')})` : undefined;
  const xOf = (i: number) => padX + lay.xs[i] + (st.slot && W.wordOf[i] > st.slot.word ? slotShift : 0) + lineShift;
  const bl = m.baseline ?? 0.8;
  // a key glyph in the emphasis style: its size (on the line's baseline), weight and tracking, grown in by a swell
  const kOf = (i: number) => {
    const gs = m.style?.[i];
    return gs ? mix(1, gs.k, grow) : 1;
  };
  const styleOf = (i: number, g: GlyphState): React.CSSProperties => {
    const gs = m.style?.[i];
    if (!gs) return {};
    const k = kOf(i);
    const wt = mix(m.weight ?? weight, gs.weight, grow);
    return {
      fontSize: size * k,
      fontWeight: wt,
      letterSpacing: `${mix(track, gs.track, grow).toFixed(4)}em`,
      top: top - bl * (k - 1) * size,
      fontVariationSettings: g.vary ? fvsOf(g.vary, wt) : p.vary ? fvsOf({ ...p.vary, wght: wt }, wt) : undefined,
    };
  };
  // the key run's box at this frame (box px): its left and right ink edges and its size
  const run = em
    ? (() => {
        const [g0, g1] = em.glyphs;
        const k = kOf(g0);
        const S = size * k;
        const tr = m.style?.[g1]?.track ?? track;
        return { g0, g1, x0: xOf(g0), x1: xOf(g1) + lay.ws[g1] - tr * S, S, base: top + bl * size };
      })()
    : null;
  const L = EMPHASIS_LOOK;
  // what a key glyph shows: a mark's knock-out, an outline that fills, a sweep into the accent (a masked copy over it)
  const markBox = run && does?.mark && does.mark !== 'under' ? (does.mark === 'box' ? L.box : L.marker) : null;
  const markColor = em?.markColor ?? col.accent;
  const knock = (() => {
    const pick = (c: string) => Math.abs(toOklch(c)[0] - toOklch(markColor)[0]);
    // the line's ground when it stands off the mark, else paper (a light knock-out reads as cut from the bar), else ink
    if (spec.colors?.ground && pick(spec.colors.ground) > 0.35) return spec.colors.ground;
    return pick(C.paper) >= 0.3 ? C.paper : C.ink;
  })();
  const front = (() => {
    if (!run || !em) return null;
    if (markBox) {
      const x0 = run.x0 - markBox.pad * run.S;
      return { at: x0 + em.p * (run.x1 - run.x0 + 2 * markBox.pad * run.S), feather: 0.5, color: knock };
    }
    if (does?.front) {
      const F = (does.front === 'sweep' ? L.sweep.feather : L.outline.feather) * run.S;
      return { at: run.x0 - F / 2 + em.p * (run.x1 - run.x0 + F), feather: F, color: does.front === 'sweep' ? (em.color ?? col.accent) : undefined };
    }
    return null;
  })();
  const inRun = (i: number) => !!run && i >= run.g0 && i <= run.g1;

  const glyphSpan = (g: GlyphState, i: number, key: string, extra: React.CSSProperties = {}, dx = 0, dy = 0) => {
    const k = kOf(i);
    return (
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
          // a mask edge fixed in the line (the glyph's box is k em tall, its baseline on the line's; its local edge moves up as the glyph moves down)
          clipPath: g.clip !== undefined && !fill ? `inset(-60% -40% ${(((k - g.clip - bl * (k - 1) + g.dy + dy) / k) * 100).toFixed(2)}% -40%)` : undefined,
          fontVariationSettings: fvsOf(g.vary, weight, p.vary),
          // a filled glyph is clipped to its box: padded so its descender survives, the margin and the origin taken back (line-height 1)
          ...(fill ? { backgroundImage: fill, backgroundSize: `${px(m.width)} 100%`, backgroundPosition: `${px(-m.xs[i])} 0`, backgroundRepeat: 'no-repeat', WebkitBackgroundClip: 'text', backgroundClip: 'text', padding: '0.18em 0 0.32em', marginTop: '-0.18em', transformOrigin: '50% 64%' } : {}),
          ...styleOf(i, g),
          ...extra,
        }}
      >
        {g.ch}
      </span>
    );
  };

  /** A copy of a key glyph shown left of the front (box px), in `color`: the knock-out, the fill, the sweep. */
  const frontCopy = (g: GlyphState, i: number, key: string, color: string) => {
    if (!front) return null;
    const pad = size * 0.4; // the copy's box widened so overhanging ink stays inside its mask
    const local = front.at + (st.glyphs[run!.g0].dx - g.dx) * size - xOf(i) + pad;
    const a = local - front.feather / 2;
    const b = local + front.feather / 2;
    const mask = `linear-gradient(90deg, #000 ${px(a)}, transparent ${px(Math.max(b, a + 0.5))})`;
    return glyphSpan({ ...g, color }, i, key, { paddingLeft: pad, paddingRight: pad, marginLeft: -pad, WebkitMaskImage: mask, maskImage: mask, WebkitTextStroke: undefined });
  };

  const glyphs = (prefix: string) =>
    st.glyphs.map((g, i) => {
      if (g.ch === ' ' || (st.slot && W.wordOf[i] === st.slot.word)) return null;
      const out: React.ReactNode[] = [];
      if (g.mosaic !== undefined) {
        const cells = mosaicCells(i, g.mosaic, 5, spec.seed ?? 0);
        const cw = m.ws[i] / 5;
        const ch = (size * 0.72) / 5;
        cells.forEach((cc, k) =>
          out.push(<div key={`${prefix}m${i}-${k}`} style={{ position: 'absolute', left: xOf(i) + cc.x * cw, top: top + size * 0.06 + cc.y * ch, width: cw * 0.86, height: ch * 0.86, background: col.accent }} />),
        );
      }
      if (g.opacity <= 0.001) return out.length ? out : null;
      const sm = Math.hypot(g.smear[0], g.smear[1]);
      if (sm > 0.01)
        [0.45, 0.28, 0.14].forEach((o, k) => out.push(glyphSpan({ ...g, opacity: g.opacity * o }, i, `${prefix}s${i}-${k}`, {}, (g.smear[0] * (k + 1)) / 3, (g.smear[1] * (k + 1)) / 3)));
      if (em && inRun(i) && !fill) {
        const done = em.p >= 1;
        if (does?.front === 'outline') {
          // the outline until its fill front has crossed the glyph, the filled copy left of the front
          out.push(done ? glyphSpan(g, i, `${prefix}g${i}`) : glyphSpan(g, i, `${prefix}g${i}`, { color: 'transparent', WebkitTextStroke: `${px(L.outline.stroke * size * kOf(i))} ${g.color}` }));
          if (!done && em.p > 0) out.push(frontCopy(g, i, `${prefix}f${i}`, g.color));
          return out;
        }
        if (front?.color) {
          out.push(glyphSpan(done ? { ...g, color: front.color } : g, i, `${prefix}g${i}`));
          if (!done && em.p > 0) out.push(frontCopy(g, i, `${prefix}f${i}`, front.color));
          return out;
        }
      }
      out.push(glyphSpan(g, i, `${prefix}g${i}`));
      return out;
    });

  // the mark behind (marker, box) or under (under) the key words, wiping on from the left; it rides the first key glyph
  const mark = (() => {
    if (!run || !em || !does?.mark || em.p <= 0) return null;
    const g0 = st.glyphs[run.g0];
    const seen = Math.max(...st.glyphs.slice(run.g0, run.g1 + 1).map((g) => g.opacity));
    if (seen <= 0.001) return null;
    const shift = `translate(${px(g0.dx * size)}, ${px(g0.dy * size)})`;
    const keyText = W.chars.slice(run.g0, run.g1 + 1).join('');
    if (does.mark === 'under') {
      // skip-ink: the rule breaks round every descender's ink, or sits whole under the descender line (TypeEmphasis skipInk)
      const U2 = L.under;
      const left = run.x0 - U2.pad * run.S;
      const w = run.x1 - run.x0 + 2 * U2.pad * run.S;
      const ink = skipInk(
        st.glyphs.slice(run.g0, run.g1 + 1).map((g, k) => ({ ch: g.ch, x: xOf(run.g0 + k) - left, w: lay.ws[run.g0 + k] })),
        0,
        w,
        run.S,
        U2.drop,
      );
      const stops = ink.runs.length === 1 && ink.runs[0][0] <= 0 && ink.runs[0][1] >= w ? undefined : `linear-gradient(90deg, ${['transparent 0px', ...ink.runs.flatMap(([a, b]) => [`transparent ${px(a)}`, `#000 ${px(a)}`, `#000 ${px(b)}`, `transparent ${px(b)}`])].join(', ')})`;
      return <div key="emark" style={{ position: 'absolute', left, top: run.base + ink.drop * run.S, width: w, height: Math.max(2, U2.thick * run.S), background: markColor, opacity: seen, transform: shift, clipPath: `inset(0 ${((1 - em.p) * 100).toFixed(3)}% 0 0)`, ...(stops ? { WebkitMaskImage: stops, maskImage: stops } : {}) }} />;
    }
    // a bar holds the key words whole: past the descender line when they carry one, so the knock-out never cuts a tail
    const B = markBox!;
    const topEm = B.lift + B.h / 2;
    const h = (topEm + barBottom(keyText, B.h, B.lift)) * run.S;
    const w = run.x1 - run.x0 + 2 * B.pad * run.S;
    const r = B.radius * B.h * run.S;
    return <div key="emark" style={{ position: 'absolute', left: run.x0 - B.pad * run.S, top: run.base - topEm * run.S, width: w, height: h, background: markColor, opacity: seen, transform: shift, clipPath: `inset(0 ${((1 - em.p) * 100).toFixed(3)}% 0 0 round ${px(r)})` }} />;
  })();

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
      {mark}
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
    left: align === 'left' ? cx - padX : align === 'right' ? cx - boxW + padX : cx - boxW / 2,
    top: cy - boxH / 2,
    width: boxW,
    height: boxH,
    transform: `translate(${px(st.x * size)}, ${px(st.y * size)}) scale(${st.scale.toFixed(5)})`,
    transformOrigin: `${px(boxW / 2 + st.origin[0] * size)} ${px(boxH / 2 + st.origin[1] * size)}`,
    opacity: st.opacity,
    filter: st.blur > 0.002 ? `blur(${px(st.blur * size)})` : undefined,
  };
  const dashes = layers.find((l) => l.kind === 'dashes') as Extract<TypeLayer, { kind: 'dashes' }> | undefined;
  // what the layout audit reads: one transparent copy of the line over its glyph run (its id, its size after the line's
  // scale, as visible as its most visible glyph), so a preset line is measured like any tagged text
  const seen = Math.max(0, ...st.glyphs.map((g) => g.opacity), ...(st.slot?.items.map((it) => it.opacity) ?? []));
  const probe = (
    <span
      data-text={spec.id ?? `type-${spec.preset}`}
      aria-hidden
      style={{ ...font, left: padX + lineShift, width: m.width + slotShift, height: size, color: 'transparent', opacity: Math.min(1, seen), overflow: 'hidden' }}
    >
      {spec.text}
    </span>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={group}>
        {probe}
        {dashes
          ? dashes.dashes.map((d, k) => (
              <div key={`dash${k}`} style={{ position: 'absolute', left: boxW / 2 + d.x * size, top: boxH / 2 + d.y * size, width: d.w * size, height: Math.max(2, size * 0.06), background: dashes.color, opacity: d.opacity }} />
            ))
          : null}
        {echoL
          ? echoL.copies.map((cp, k) => (
              <div key={`echo${k}`} style={{ position: 'absolute', left: padX - echoL.pad * size, top: top - echoL.pad * size, width: m.width + 2 * echoL.pad * size, height: size * (1 + 2 * echoL.pad), background: echoL.ground, transform: `translate(${px(cp.dx * size)}, ${px(cp.dy * size)})` }}>
                <span style={{ ...font, top: echoL.pad * size, left: echoL.pad * size, color: echoL.color }}>{spec.text}</span>
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
