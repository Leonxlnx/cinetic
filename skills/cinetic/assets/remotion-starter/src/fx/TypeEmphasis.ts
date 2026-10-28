/**
 * Emphasis: the devices that set a line's key word apart, so a hero line is never one size, one weight and one colour
 * from end to end (lib/look.ts EMPHASIS_LOOK holds the measured numbers). <TypeLine> draws them on its key words
 * (`spec.emph`); this file is the pure part: which words, which device, how far along it is at a frame.
 *
 *   weight    the key words at the family's emphasis weight (calm 650, bold 800) in the accent, their width held
 *             (their tracking tightens by what the weight adds, at most 0.06 em): the default of every hero line
 *   accent    the key words rest in the accent (colour alone: the quietest device)
 *   scale     the key words one step up the type scale (calm x1.5, bold x1.35) at the emphasis weight, on the baseline
 *   swell     scale, grown in after the line lands (22 f, E.glideOut): the other words slide apart, the line re-centres
 *   marker    an accent bar wipes on behind the key words (10 f) and knocks them out to the ground
 *   box       the inverted box: the line's ink behind them, the words in the ground colour
 *   under     a rule draws under them (12 f), the words at the emphasis weight
 *   outline   they arrive as an outline and fill left to right once landed (16 f), resting in the accent
 *   sweep     the accent crosses them left to right once the line lands (22 f, a soft front) and stays
 *
 * The key words: a line written with them between asterisks ("Brook is a *water bottle*.") marks them (parseKeyed;
 * copy-check.py reads the same marks and names a key word for a line that has none); else `keys` or `key` on the
 * spec; else the last word. A film deals one device per line (dealEmphasis: never the same device twice in a row);
 * <TypeLine> gives a hero line that names none the `weight` device (defaultEmphasis). Node-safe, no DOM.
 */
import { TYPE_FAMILY } from '../brand/tokens';
import { clamp, E, type Ease, prog, rand } from '../lib/anim';
import { f60x } from '../lib/film';
import { EMPHASIS_LOOK, type TypeFamily } from '../lib/look';
import type { Declares } from '../timeline';

export type EmphasisName = 'weight' | 'accent' | 'scale' | 'swell' | 'marker' | 'box' | 'under' | 'outline' | 'sweep';
export const EMPHASIS_NAMES: EmphasisName[] = ['weight', 'accent', 'scale', 'swell', 'marker', 'box', 'under', 'outline', 'sweep'];

/** An emphasis device on a line's key words. Every field but `device` has a house default. */
export type Emphasis = {
  device: EmphasisName;
  words?: [number, number]; // the key words, first and last word index (default: the marked words, else the key word)
  scale?: number; // scale, swell: their size against the line (default the family's)
  weight?: number; // their weight (default the family's emphasis weight where the device sets one)
  color?: string; // their resting colour (weight, accent, outline, sweep: default the line's accent); a mark's colour (marker: the accent, box: the ink)
  hold?: boolean; // weight, under, outline: hold the words' width at the emphasis weight (default true)
  at?: number; // the frame an animated device starts (default: once the key words have landed)
};
/** A device by name, a full spec, or false (no emphasis: a body line, a piece of a line set in parts). */
export type EmphasisSpec = Emphasis | EmphasisName | false;

/** What each device changes. */
export const EMPHASIS_DOES: Record<EmphasisName, { size: boolean; weight: boolean; color: boolean; mark?: 'bar' | 'box' | 'under'; front?: 'outline' | 'sweep'; grows?: boolean; hold: boolean }> = {
  weight: { size: false, weight: true, color: true, hold: true },
  accent: { size: false, weight: false, color: true, hold: false },
  scale: { size: true, weight: true, color: false, hold: false },
  swell: { size: true, weight: true, color: false, grows: true, hold: false },
  marker: { size: false, weight: false, color: false, mark: 'bar', hold: false },
  box: { size: false, weight: false, color: false, mark: 'box', hold: false },
  under: { size: false, weight: true, color: false, mark: 'under', hold: true },
  outline: { size: false, weight: true, color: true, front: 'outline', hold: true },
  sweep: { size: false, weight: false, color: false, front: 'sweep', hold: false },
};

/** The device a hero line takes when it names none. */
export const EMPHASIS_DEFAULT: EmphasisName = 'weight';

/** The devices a film deals its lines from, by type family (dealEmphasis). */
export const EMPHASIS_DEAL: Record<TypeFamily, EmphasisName[]> = {
  calm: ['weight', 'under', 'sweep', 'outline', 'swell', 'marker', 'accent'],
  bold: ['weight', 'scale', 'marker', 'under', 'sweep', 'swell', 'box', 'outline'],
};

/** A device resolved for one line: every default filled in. */
export type EmphasisResolved = {
  device: EmphasisName;
  words: [number, number];
  scale: number; // 1 when the device leaves the size alone
  weight?: number; // undefined: the line's weight
  color?: string; // the key words' resting colour (undefined: the preset's own)
  markColor?: string;
  hold: boolean;
  at?: number;
};

/** A word-boundary map of a text (word index per character, -1 on a space). */
const wordStarts = (text: string) => {
  const starts: number[] = [];
  let inWord = false;
  [...text].forEach((c, i) => {
    if (c === ' ') inWord = false;
    else if (!inWord) {
      starts.push(i);
      inWord = true;
    }
  });
  return starts;
};

/**
 * A line written with its key words between asterisks: the clean text and the marked word range ("Brook is a *water
 * bottle*." -> "Brook is a water bottle.", [3, 4]). Every asterisk leaves the text; the first pair marks the words
 * (an unpaired one marks nothing). Pure.
 */
export const parseKeyed = (text: string): { text: string; words: [number, number] | null } => {
  if (!text.includes('*')) return { text, words: null };
  const chars = [...text];
  const marks: number[] = []; // positions in the clean text
  let clean = '';
  for (const c of chars) {
    if (c === '*') marks.push([...clean].length);
    else clean += c;
  }
  if (marks.length < 2) return { text: clean, words: null };
  const starts = wordStarts(clean);
  const open = starts.findIndex((s) => s >= marks[0]);
  let close = -1;
  starts.forEach((s, k) => {
    if (s < marks[1]) close = k;
  });
  if (open < 0 || close < open) return { text: clean, words: null };
  return { text: clean, words: [open, close] };
};

/** The clean text of a line that may carry *marks*. Pure. */
export const keyedText = (text: string) => parseKeyed(text).text;

/**
 * Resolves a line's emphasis: the device, the key words (`marked` from *marks*, else `[key, key]`), the family's size
 * and weight, the colours. `n` is the line's word count, `key` its keyword. Null for no emphasis. Pure.
 */
export const resolveEmphasis = (
  e: EmphasisSpec | undefined,
  n: number,
  key: number,
  o: { marked?: [number, number] | null; family?: TypeFamily; accent?: string; ink?: string } = {},
): EmphasisResolved | null => {
  if (!e || n < 1) return null;
  const spec: Emphasis = typeof e === 'string' ? { device: e } : e;
  const does = EMPHASIS_DOES[spec.device];
  if (!does) return null;
  const family = o.family ?? TYPE_FAMILY;
  const raw = spec.words ?? o.marked ?? [key, key];
  const a = clamp(Math.round(Math.min(raw[0], raw[1])), 0, n - 1);
  const b = clamp(Math.round(Math.max(raw[0], raw[1])), a, n - 1);
  const markColor = does.mark === 'box' ? (spec.color ?? o.ink) : does.mark ? (spec.color ?? o.accent) : undefined;
  return {
    device: spec.device,
    words: [a, b],
    scale: does.size ? Math.max(1, spec.scale ?? EMPHASIS_LOOK.scale[family]) : 1,
    weight: does.weight ? (spec.weight ?? EMPHASIS_LOOK.weight[family]) : spec.weight,
    color: does.color || does.front === 'sweep' ? (does.mark ? undefined : (spec.color ?? o.accent)) : undefined,
    markColor,
    hold: does.hold && spec.hold !== false && !does.size,
    at: spec.at,
  };
};

/** How long an animated device runs (60 fps frames) and on which curve; a static device is whole at once (0). */
export const emphasisRun = (device: EmphasisName): { len60: number; ease: Ease } => {
  const L = EMPHASIS_LOOK;
  switch (device) {
    case 'swell':
      return { len60: L.swell60, ease: E.glideOut };
    case 'marker':
    case 'box':
      return { len60: L.mark60, ease: E.snapOut };
    case 'under':
      return { len60: L.under60, ease: E.snapOut };
    case 'outline':
      return { len60: L.outline60, ease: E.stdInOut };
    case 'sweep':
      return { len60: L.sweep60, ease: E.stdInOut };
    default:
      return { len60: 0, ease: E.linear };
  }
};

/**
 * The device's progress at frame `f` (0..1): the size and weight for swell, the wipe for a mark, the front for
 * outline and sweep; 1 for a static device once the line has begun. `at` is the frame it starts (resolve it with
 * emphasisAt); `pace` stretches it with the line. Pure.
 */
export const emphasisProgress = (f: number, device: EmphasisName, at: number, fps: number, pace = 1): number => {
  const run = emphasisRun(device);
  if (run.len60 <= 0) return 1;
  return prog(f, at, at + f60x(run.len60 * pace, fps), run.ease);
};

/**
 * The frame an animated device starts: its own `at`, else `after60` once the key words have landed. `landed` is the
 * frame the last key word is solid (TypeLine: its onset tick plus 14 f, never after the line resolves). Pure.
 */
export const emphasisAt = (r: Pick<EmphasisResolved, 'at'>, landed: number, fps: number, pace = 1) => r.at ?? landed + f60x(EMPHASIS_LOOK.after60 * pace, fps);

/**
 * One device per line for a film's `n` lines, dealt from `seed` (the film's): never the same device twice in a row,
 * nor three lines apart when the pool allows it; `pool` defaults to the family's (EMPHASIS_DEAL). The first hero line
 * takes the house default when `firstDefault` (the film's first statement reads in its plainest contrast). Pure.
 */
export const dealEmphasis = (n: number, seed: string | number, family: TypeFamily = TYPE_FAMILY, pool: EmphasisName[] = EMPHASIS_DEAL[family], firstDefault = false): EmphasisName[] => {
  const out: EmphasisName[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 && firstDefault && pool.includes(EMPHASIS_DEFAULT)) {
      out.push(EMPHASIS_DEFAULT);
      continue;
    }
    let options = pool.filter((d) => d !== out[i - 1] && d !== out[i - 2]);
    if (!options.length) options = pool.filter((d) => d !== out[i - 1]);
    if (!options.length) options = pool;
    out.push(options[Math.floor(rand(`${seed}:emph:${i}`) * options.length) % options.length]);
  }
  return out;
};

/**
 * The width-holding tracking of the key words at the emphasis weight: the line's tracking `track` tightened by what
 * the weight adds to their width (`w1` at the emphasis weight against `w0` at the line's, both at tracking `track`,
 * over `chars` characters at `size` px), never by more than EMPHASIS_LOOK.holdTrack. Pure.
 */
export const holdTracking = (track: number, w0: number, w1: number, chars: number, size: number) => {
  if (chars < 1 || size <= 0) return track;
  const t = track - (w1 - w0) / (chars * size);
  return clamp(t, track - EMPHASIS_LOOK.holdTrack, track);
};

/** Emphasis declares nothing: every device is continuous (no stepped run, flash or seam). */
export const declares = (_e?: EmphasisSpec, _film?: unknown): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

/** The devices that change the key words' size (a layout measured at the line's size must refit: emphasisFitSize). */
export const SIZE_DEVICES: EmphasisName[] = ['scale', 'swell'];
/** The devices that change the line's width: the size devices and the marks that open room round their words. */
export const WIDTH_DEVICES: EmphasisName[] = ['scale', 'swell', 'marker', 'box'];

/**
 * One device per line id for a template's script (dealEmphasis over the ids in film order): `fixed` ids are placed by a
 * measured width (a label in a pill, a line beside a mark) and never take a device that changes it (WIDTH_DEVICES);
 * `none` ids take no emphasis (a name, a piece of a line set in parts);
 * `first` gives the first line the house default. Pure.
 */
export const dealLineEmphasis = (
  ids: readonly string[],
  seed: string | number,
  o: { family?: TypeFamily; fixed?: readonly string[]; none?: readonly string[]; first?: boolean; pin?: Partial<Record<string, EmphasisName | false>> } = {},
): Record<string, EmphasisName | false> => {
  const family = o.family ?? TYPE_FAMILY;
  const pool = EMPHASIS_DEAL[family];
  const live = ids.filter((id) => !(o.none ?? []).includes(id));
  const dealt = dealEmphasis(live.length, seed, family, pool, o.first ?? true);
  const out: Record<string, EmphasisName | false> = {};
  let prev: EmphasisName | undefined;
  live.forEach((id, i) => {
    let d = dealt[i];
    if ((o.fixed ?? []).includes(id) && WIDTH_DEVICES.includes(d)) d = pool.find((x) => !WIDTH_DEVICES.includes(x) && x !== prev && x !== dealt[i + 1]) ?? EMPHASIS_DEFAULT;
    out[id] = o.pin?.[id] ?? d;
    prev = d;
  });
  (o.none ?? []).forEach((id) => (out[id] = o.pin?.[id] ?? false));
  return out;
};

/**
 * The word range of `phrase` inside `text` (case and punctuation aside): a template's script names each line's key
 * words as plain words beside the line (walk.ts `keys`), so the line's own text stays clean. Null when the phrase is
 * not in the line. Pure.
 */
export const keysOf = (text: string, phrase?: string): [number, number] | null => {
  if (!phrase) return null;
  const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}[\]]+/gu, '');
  const words = keyedText(text).split(' ').filter(Boolean).map(norm); // words as wordMap splits them (a figure space is a letter)
  const want = keyedText(phrase).split(/\s+/).filter(Boolean).map(norm).filter(Boolean);
  if (!want.length) return null;
  for (let i = 0; i + want.length <= words.length; i++) if (want.every((w, j) => words[i + j] === w)) return [i, i + want.length - 1];
  return null;
};
