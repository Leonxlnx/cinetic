/**
 * Emphasis: the devices that set a line's key word apart (lib/look.ts EMPHASIS_LOOK holds the measured numbers). <TypeLine> draws them on its key words
 * (`spec.emph`); this file is the pure part: which words, which device, how far along it is at a frame.
 *
 *   weight    the key words at the family's emphasis weight (calm 650, bold 800) in the accent, their width held
 *             (their tracking tightens by what the weight adds, at most 0.06 em)
 *   accent    the key words rest in the accent (colour alone: the quietest device, the film's default kind)
 *   scale     the key words one step up the type scale (calm x1.5, bold x1.35) at the emphasis weight, on the baseline
 *   swell     scale, grown in after the line lands (22 f, E.glideOut): the other words slide apart, the line re-centres
 *   marker    an accent bar wipes on behind the key words (10 f) and knocks them out to the ground (signature only)
 *   box       the inverted box: the line's ink behind them, the words in the ground colour (signature only)
 *   under     a rule draws under them (12 f), the words at the emphasis weight (signature only)
 *   outline   they arrive as an outline and fill left to right once landed (16 f), resting in the accent
 *   sweep     the accent crosses them left to right once the line lands (22 f, a soft front) and stays
 *
 * The key words: a line written with them between asterisks ("Brook is a *water bottle*.") marks them (parseKeyed;
 * copy-check.py reads the same marks and names a key word for a line that has none); else `keys` or `key` on the
 * spec; else the last word.
 *
 * A film's emphasis is quiet and one kind: a line takes none unless its film gives it one (<TypeLine> adds nothing on
 * its own). filmEmphasis gives the film's ONE kind (default `accent`: the key words in the accent colour) to at most 60 %
 * of its lines, the lines whose key words the script names first, never two kinds in one film. A box, a marker bar, an
 * underline (and a pill or a knockout drawn round the words: fx/Markers, fx/Knockout) is never a kind: only the film's
 * declared signature, on one line at most. checkFilmEmphasis measures a deal against that. Node-safe, no DOM.
 */
import { TYPE_FAMILY } from '../brand/tokens';
import { clamp, E, type Ease, prog } from '../lib/anim';
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

/** The kind a film's emphasis takes when it names none: the key words in the accent colour, nothing drawn. */
export const EMPHASIS_DEFAULT: EmphasisName = 'accent';
/** At most this share of a film's lines carries an emphasis. */
export const EMPHASIS_SHARE = 0.6;
/** Devices that draw round the words (a box, a marker bar, an underline): a film's one signature on one line, never its kind. */
export const SIGNATURE_DEVICES: EmphasisName[] = ['box', 'marker', 'under'];

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

export type FilmEmphasisOpts = {
  kind?: EmphasisName; // the film's one kind (default EMPHASIS_DEFAULT); a signature device is never a kind (it falls back to the default)
  keyed?: readonly string[]; // the lines whose key words the script names: they take the kind first
  none?: readonly string[]; // lines that take none and do not count (a name, a version, a piece of a line set in parts)
  fixed?: readonly string[]; // lines placed by a measured width: a kind that changes the width plays as `accent` on them
  signature?: { id: string; device: EmphasisName }; // the film's declared signature: this one line takes it (it counts in the share)
  share?: number; // at most this share of the lines (default EMPHASIS_SHARE)
};

/**
 * The film's emphasis per line id, in film order: its one kind on at most `share` of the counted lines (rounded down),
 * the keyed lines first, picked from the last line back and every other line, so the payoff carries it and two
 * emphasised lines rarely touch; a declared signature on its one line (replacing the earliest pick when the share is
 * full); every other line false. Pure.
 */
export const filmEmphasis = (ids: readonly string[], o: FilmEmphasisOpts = {}): Record<string, EmphasisName | false> => {
  const kind0 = o.kind && !SIGNATURE_DEVICES.includes(o.kind) ? o.kind : EMPHASIS_DEFAULT;
  const live = ids.filter((id) => !(o.none ?? []).includes(id));
  const max = Math.floor((o.share ?? EMPHASIS_SHARE) * live.length + 1e-9);
  const keyed = live.filter((id) => (o.keyed ?? []).includes(id));
  const first = keyed.length ? keyed : live;
  const rest = live.filter((id) => !first.includes(id));
  const order = (list: string[]) => {
    const a: string[] = [];
    const b: string[] = [];
    [...list].reverse().forEach((id, i) => (i % 2 ? b : a).push(id));
    return [...a, ...b];
  };
  const picks = [...order(first), ...order(rest)].slice(0, max);
  const sig = o.signature && live.includes(o.signature.id) ? o.signature : undefined;
  if (sig && !picks.includes(sig.id)) {
    if (picks.length >= max && picks.length) picks.sort((x, y) => live.indexOf(x) - live.indexOf(y)).shift();
    picks.push(sig.id);
  }
  const out: Record<string, EmphasisName | false> = {};
  for (const id of ids) {
    if (!picks.includes(id)) out[id] = false;
    else if (sig && id === sig.id) out[id] = sig.device;
    else out[id] = (o.fixed ?? []).includes(id) && WIDTH_DEVICES.includes(kind0) ? 'accent' : kind0;
  }
  return out;
};

export type FilmEmphasisCheck = { ok: boolean; lines: number; emphasised: number; share: number; kinds: EmphasisName[]; signatures: string[] };

/**
 * A film's emphasis measured (each line's device, false for none; ids in `none` do not count): the share of lines that
 * carry one (<= EMPHASIS_SHARE), the kinds other than the signature devices (one at most) and the lines that carry a
 * signature device (one at most). Pure.
 */
export const checkFilmEmphasis = (deal: Record<string, EmphasisSpec | undefined>, none: readonly string[] = []): FilmEmphasisCheck => {
  const ids = Object.keys(deal).filter((id) => !none.includes(id));
  const dev = (e: EmphasisSpec | undefined): EmphasisName | null => (!e ? null : typeof e === 'string' ? e : e.device);
  const on = ids.filter((id) => dev(deal[id]));
  const kinds = [...new Set(on.map((id) => dev(deal[id]) as EmphasisName).filter((d) => !SIGNATURE_DEVICES.includes(d)))];
  const signatures = on.filter((id) => SIGNATURE_DEVICES.includes(dev(deal[id]) as EmphasisName));
  const share = ids.length ? on.length / ids.length : 0;
  return { ok: share <= EMPHASIS_SHARE + 1e-9 && kinds.length <= 1 && signatures.length <= 1, lines: ids.length, emphasised: on.length, share: Math.round(share * 1000) / 1000, kinds, signatures };
};

// ---- Type craft: a rule under words skips their descenders; a bar behind them holds them whole.

/**
 * Glyphs whose ink crosses the baseline downward, with the share of their advance the descender takes (a grotesque's
 * shapes: the tail of y and g, the stems of p and q, the hook of j, a comma's tail, a bracket's foot).
 */
export const DESCENDERS: Record<string, [number, number]> = {
  g: [0.1, 0.9], j: [0.0, 0.72], p: [0.08, 0.34], q: [0.64, 0.92], y: [0.04, 0.74], Q: [0.42, 0.96], ',': [0.12, 0.62], ';': [0.12, 0.62],
  '\u00e7': [0.3, 0.76], '\u015f': [0.3, 0.76], '\u0163': [0.3, 0.76], '\u0119': [0.5, 0.9], '\u0105': [0.55, 0.95], '\u00fd': [0.04, 0.74],
  '\u00ff': [0.04, 0.74], '\u011f': [0.1, 0.9], '\u0135': [0.0, 0.72], '\u0192': [0.0, 0.62], '\u00fe': [0.08, 0.34], '\u00b5': [0.08, 0.3],
  '(': [0.15, 0.85], ')': [0.15, 0.85], '[': [0.15, 0.85], ']': [0.15, 0.85], '{': [0.15, 0.85], '}': [0.15, 0.85], '|': [0.2, 0.8], '/': [0.0, 0.5], '@': [0.1, 0.9],
};
/**
 * A rule that skips descenders, in em of the key words' size: the gap left round a descender's ink, the share of the
 * rule that must remain (else the whole rule sits under the descender line instead), the drop that clears the
 * descender line; and how far below the baseline a bar behind the words reaches when they carry a descender.
 */
export const INK_SKIP = { gap: 0.07, keep: 0.6, below: 0.31, barBelow: 0.3 } as const;

/** Whether any glyph of `text` reaches below the baseline. Pure. */
export const hasDescender = (text: string) => [...text].some((ch) => DESCENDERS[ch] !== undefined);

/**
 * A rule under the key words, skip-ink: `glyphs` are the key run's characters with their left edge and advance (px,
 * the rule's own coordinates), `x0..x1` the rule's span, `S` the key words' size (px), `drop` the house drop (em).
 * Returns the rule's visible runs (px) and its drop: the house drop with a gap round every descender's ink, or, when
 * the gaps would leave under INK_SKIP.keep of the rule, one whole rule under the descender line (INK_SKIP.below). Pure.
 */
export const skipInk = (glyphs: readonly { ch: string; x: number; w: number }[], x0: number, x1: number, S: number, drop: number): { runs: [number, number][]; drop: number } => {
  const len = Math.max(0, x1 - x0);
  const gaps: [number, number][] = [];
  for (const g of glyphs) {
    const d = DESCENDERS[g.ch];
    if (!d) continue;
    const a = g.x + d[0] * g.w - INK_SKIP.gap * S;
    const b = g.x + d[1] * g.w + INK_SKIP.gap * S;
    if (b <= x0 || a >= x1) continue;
    const last = gaps[gaps.length - 1];
    if (last && a <= last[1]) last[1] = Math.min(x1, Math.max(last[1], b));
    else gaps.push([Math.max(x0, a), Math.min(x1, b)]);
  }
  if (!gaps.length) return { runs: len > 0 ? [[x0, x1]] : [], drop };
  const gone = gaps.reduce((s, [a, b]) => s + (b - a), 0);
  if (len <= 0 || gone > (1 - INK_SKIP.keep) * len) return { runs: len > 0 ? [[x0, x1]] : [], drop: Math.max(drop, INK_SKIP.below) };
  const runs: [number, number][] = [];
  let at = x0;
  for (const [a, b] of gaps) {
    if (a > at) runs.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < x1) runs.push([at, x1]);
  return { runs, drop };
};

/**
 * How far below the baseline a bar behind the key words reaches (em of their size): its own bottom (from `h` and
 * `lift` as EMPHASIS_LOOK sets them), or past the descender line when the words carry a descender, so its knock-out
 * never cuts a tail in two. Pure.
 */
export const barBottom = (text: string, h: number, lift: number) => {
  const own = h / 2 - lift;
  return hasDescender(text) ? Math.max(own, INK_SKIP.barBelow) : own;
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
