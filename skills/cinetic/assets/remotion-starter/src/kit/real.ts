// Material realism for product screens and picture beats: the data a viewer checks without meaning to. A paused frame is
// read like a screenshot, and four things give a made-up screen away at once: a date whose weekday is wrong or that sits
// last month, a count that is not the list under it ("14 today" over two rows), a waveform that repeats every few bars,
// and a filmstrip or a cast that is one picture again and again. Everything here is pure (the same arguments give the
// same result on every frame and machine) and seeded with strings, never Math.random or the clock:
//   FILM_DATE, day, fmtDay, weekOf, relDay   the film's own day and real calendar maths round it
//   dayLog, listView, countLabel, checkList  a log of real events whose count is its rows, 8+ rows on a dense screen
//   waveBars, peaksBars                      a waveform from the track's own peaks (data-check.mjs peaks) or noise that never repeats
//   stripMoments, thumbsFrom                 thumbnails sampled from distinct moments of the film's footage
//   castPlan, checkCast                      the cast spread across beats: no shoot or person in more than N beats
// scripts/data-check.mjs fails the same defects in a film's source and render (references/product-ui.md §2).
import { rand } from '../lib/anim';

// ------------------------------------------------------------------------------------------------ the calendar

/**
 * The film's own day, ISO: the release day the film is set on. Every date the product shows is computed from it (today,
 * this week, an hour ago), never typed by hand, so its weekday is right and it never sits in the past. Set it once when
 * the film starts (scripts/data-check.mjs reads it and warns when it is stale); a fixed date keeps renders identical.
 */
export const FILM_DATE = '2026-10-29';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

/** A calendar day: year, month 1-12, day of month, weekday 0 (Sun) - 6, ISO string, days since 1970-01-01 (UTC). */
export type Day = { y: number; m: number; d: number; wd: number; iso: string; n: number };

const DAY_MS = 86400000;
const ofUtc = (t: number): Day => {
  const x = new Date(t);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth() + 1;
  const d = x.getUTCDate();
  return { y, m, d, wd: x.getUTCDay(), iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, n: Math.round(t / DAY_MS) };
};

/** A day `offset` days from `iso` (default the film's day): day(), day(FILM_DATE, -1) is yesterday, day(x, 7) next week. */
export const day = (iso: string | Day = FILM_DATE, offset = 0): Day => {
  if (typeof iso !== 'string') return ofUtc((iso.n + offset) * DAY_MS);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso.trim());
  if (!m) throw new Error(`kit/real day(): "${iso}" is not a YYYY-MM-DD date`);
  return ofUtc(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + offset));
};

/** Whole days from a to b (b later: positive). */
export const daysBetween = (a: Day, b: Day) => b.n - a.n;

export type DayStyle = 'wd' | 'weekday' | 'md' | 'dm' | 'short' | 'dmy' | 'mdy' | 'long' | 'longYear' | 'num';
/**
 * A day as a product prints it, the weekday always from the calendar:
 *   wd 'Thu' · weekday 'Thursday' · md 'Oct 29' · dm '29 Oct' · short 'Thu, Oct 29' · dmy 'Thu 29 Oct' · mdy 'Thu Oct 29'
 *   long 'Thursday, October 29' · longYear 'Thursday, October 29, 2026' · num '10/29'
 */
export const fmtDay = (d: Day, style: DayStyle = 'short'): string => {
  const wd = WEEKDAYS[d.wd];
  const mo = MONTHS[d.m - 1];
  switch (style) {
    case 'wd': return wd;
    case 'weekday': return WEEKDAYS_LONG[d.wd];
    case 'md': return `${mo} ${d.d}`;
    case 'dm': return `${d.d} ${mo}`;
    case 'dmy': return `${wd} ${d.d} ${mo}`;
    case 'mdy': return `${wd} ${mo} ${d.d}`;
    case 'long': return `${WEEKDAYS_LONG[d.wd]}, ${MONTHS_LONG[d.m - 1]} ${d.d}`;
    case 'longYear': return `${WEEKDAYS_LONG[d.wd]}, ${MONTHS_LONG[d.m - 1]} ${d.d}, ${d.y}`;
    case 'num': return `${d.m}/${d.d}`;
    default: return `${wd}, ${mo} ${d.d}`;
  }
};

/** The week holding `d` (default the film's day), starting on `start` (1 Monday, 0 Sunday): days and the product's label "Oct 26 – Nov 1". */
export const weekOf = (d: Day = day(), start = 1) => {
  const from = day(d, -((d.wd - start + 7) % 7));
  const to = day(from, 6);
  const days = Array.from({ length: 7 }, (_, i) => day(from, i));
  const label = from.m === to.m ? `${MONTHS[from.m - 1]} ${from.d} – ${to.d}` : `${MONTHS[from.m - 1]} ${from.d} – ${MONTHS[to.m - 1]} ${to.d}`;
  return { from, to, days, label };
};

/** A day as a feed says it relative to today: 'Today', 'Yesterday', 'Tomorrow', the weekday within the week, else 'Oct 20'. */
export const relDay = (d: Day, today: Day = day()) => {
  const k = daysBetween(today, d);
  if (k === 0) return 'Today';
  if (k === -1) return 'Yesterday';
  if (k === 1) return 'Tomorrow';
  if (k > -7 && k < 7) return WEEKDAYS_LONG[d.wd];
  return fmtDay(d, 'md');
};

/** A clock as the product prints it from minutes after midnight: '07:05' (24h) or '7:05 AM' (12h). */
export const clockOf = (min: number, h12 = false) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return h12 ? `${hh % 12 === 0 ? 12 : hh % 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}` : `${String(hh).padStart(2, '0')}:${mm}`;
};

// ------------------------------------------------------------------------------------------------ logs and counts

/** One event of a day's log: when (minutes after midnight, printed), how much (whole units, e.g. ml), its label. */
export type LogEntry = { i: number; at: number; time: string; amount: number; label: string };

/**
 * A day's log of `count` real events between `from` and `now` (minutes after midnight), dealt from `seed`: irregular
 * gaps (people do not sip on a metronome), unique minutes, amounts in whole units that sum exactly to `total`, and labels
 * from `labels` (dealt, never two equal in a row). The header's count is entries.length and its total the amounts' sum,
 * so "14 today" sits over 14 entries and "1,860 ml" over their sum. Chronological; listView() gives the newest first.
 */
export const dayLog = (seed: string, o: { count: number; total?: number; from?: number; now?: number; labels?: readonly string[]; h12?: boolean; min?: number }): LogEntry[] => {
  const n = Math.max(1, Math.round(o.count));
  const from = o.from ?? 7 * 60;
  const now = Math.max(from + n, o.now ?? 18 * 60 + 40);
  // irregular gaps: each a share of the span, drawn from a skewed distribution (many short, a few long)
  const w = Array.from({ length: n + 1 }, (_, i) => 0.25 + Math.pow(rand(`${seed}:gap${i}`), 1.8) * 2.2);
  const sw = w.reduce((a, b) => a + b, 0);
  const at: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += w[i];
    at.push(Math.round(from + (acc / sw) * (now - from)));
  }
  for (let i = 1; i < n; i++) if (at[i] <= at[i - 1]) at[i] = at[i - 1] + 1; // unique minutes
  const total = o.total ?? n * 150;
  const minA = o.min ?? Math.max(1, Math.round((total / n) * 0.35));
  const aw = Array.from({ length: n }, (_, i) => 0.55 + rand(`${seed}:amt${i}`) * 0.9);
  const saw = aw.reduce((a, b) => a + b, 0);
  const free = Math.max(0, total - minA * n);
  const amounts = aw.map((v) => minA + Math.floor((v / saw) * free));
  amounts[n - 1] += total - amounts.reduce((a, b) => a + b, 0); // the remainder on the last: the sum is exact
  const labels = o.labels ?? [];
  let prev = '';
  return at.map((t, i) => {
    let label = '';
    if (labels.length) {
      const k = Math.floor(rand(`${seed}:lab${i}`) * labels.length);
      label = labels[k] === prev && labels.length > 1 ? labels[(k + 1) % labels.length] : labels[k];
      prev = label;
    }
    return { i, at: t, time: clockOf(t, o.h12), amount: amounts[i], label };
  });
};

/** House numbers for a list on a product screen: a dense screen shows at least 8 rows. */
export const LIST = { minRows: 8 } as const;

/**
 * What a list shows: the newest `rows` entries first (default LIST.minRows, never more than there are), how many are
 * left out (a quiet "+6 earlier" row), and the count and sum the header prints, both the whole log's own.
 */
export const listView = <T extends { amount?: number }>(entries: readonly T[], o: { rows?: number; newestFirst?: boolean } = {}) => {
  const rows = Math.min(entries.length, Math.max(1, o.rows ?? LIST.minRows));
  const order = o.newestFirst === false ? [...entries] : [...entries].reverse();
  return { shown: order.slice(0, rows), more: entries.length - rows, count: entries.length, sum: entries.reduce((a, e) => a + (e.amount ?? 0), 0) };
};

/** A count with its noun, from the list itself: countLabel(rows, 'sip') -> '14 sips'; with `suffix`, '14 today'. */
export const countLabel = (list: readonly unknown[] | number, one: string, many = `${one}s`, suffix?: string) => {
  const n = typeof list === 'number' ? list : list.length;
  return suffix ? `${n} ${suffix}` : `${n} ${n === 1 ? one : many}`;
};

/**
 * Problems with a count shown over a list (empty when they agree): a count under the rows shown; a count over them while
 * the list shows fewer than LIST.minRows (a dense screen); with `more: false`, rows left out with nowhere to have gone
 * (no "+N more" row, no edge the list runs past).
 */
export const checkList = (count: number, shown: number, o: { more?: boolean; minRows?: number } = {}): string[] => {
  const min = o.minRows ?? LIST.minRows;
  const bad: string[] = [];
  if (count < shown) bad.push(`the count says ${count} over ${shown} rows`);
  if (count > shown && shown < Math.min(count, min)) bad.push(`the count says ${count} but the list shows ${shown} rows (show ${Math.min(count, min)}+)`);
  else if (count > shown && o.more === false) bad.push(`${count - shown} rows are left out with no "+${count - shown} more" row and no edge the list runs past`);
  return bad;
};

// ------------------------------------------------------------------------------------------------ waveforms

/**
 * A waveform's bars from the track's own peaks (the JSON scripts/data-check.mjs peaks writes, any length): resampled to
 * `n` bars by the loudest value in each bin, scaled so the loudest bar is 1, with a floor so silence still draws a dot.
 */
export const peaksBars = (peaks: readonly number[], n: number, floor = 0.06): number[] => {
  if (!peaks.length) return Array.from({ length: n }, () => floor);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * peaks.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * peaks.length) / n));
    let v = 0;
    for (let k = a; k < b && k < peaks.length; k++) v = Math.max(v, peaks[k]);
    out.push(v);
  }
  const top = Math.max(1e-6, ...out);
  return out.map((v) => floor + (1 - floor) * Math.min(1, v / top));
};

/** Smooth value noise in [0,1] at x (a seeded cubic interpolation between random knots): never periodic. */
const vnoise = (x: number, key: string) => {
  const i = Math.floor(x);
  const t = x - i;
  const s = t * t * (3 - 2 * t);
  return rand(`${key}:${i}`) * (1 - s) + rand(`${key}:${i + 1}`) * s;
};

/**
 * `n` waveform bars in [floor, 1]. With `peaks` (the track's own, data-check.mjs peaks) they are the real music
 * (peaksBars). Without, they are noise that never repeats: phrase-length swells, a mid layer and a per-bar grain at
 * unrelated rates, plus `accents` (bar indices where the music hits, e.g. the beats the cut lands on). Never a sine of the
 * index and never a modulo: a tall bar every eighth bar is a pattern the eye finds in a second.
 */
export const waveBars = (n: number, o: { seed?: string; peaks?: readonly number[]; floor?: number; accents?: readonly number[] } = {}): number[] => {
  const floor = o.floor ?? 0.08;
  if (o.peaks?.length) return peaksBars(o.peaks, n, floor);
  const key = o.seed ?? 'wave';
  const acc = new Set(o.accents ?? []);
  const raw = Array.from({ length: n }, (_, i) => {
    const phrase = vnoise(i / 23.7, `${key}:p`); // swells over ~24 bars
    const mid = vnoise(i / 5.3, `${key}:m`);
    const grain = rand(`${key}:g${i}`);
    const v = 0.18 + 0.42 * phrase + 0.24 * mid + 0.22 * grain * grain;
    return acc.has(i) ? Math.max(v, 0.82 + 0.18 * rand(`${key}:a${i}`)) : v;
  });
  const top = Math.max(...raw);
  return raw.map((v) => floor + (1 - floor) * Math.min(1, v / top));
};

// ------------------------------------------------------------------------------------------------ thumbnails

/**
 * `n` moments (seconds) of one clip for a filmstrip or a contact row: spread over [from, to] (default the clip's
 * 4 %-96 %), jittered so they are not a ruler, at least `minGap` apart (default a third of the even spacing), one inside
 * each shot first when the clip's `cuts` (shot changes, seconds) are known. Pure.
 */
export const stripMoments = (dur: number, n: number, o: { from?: number; to?: number; seed?: string; cuts?: readonly number[]; minGap?: number } = {}): number[] => {
  const a = o.from ?? dur * 0.04;
  const b = Math.max(a + 0.01, o.to ?? dur * 0.96);
  const step = (b - a) / Math.max(1, n);
  const gap = o.minGap ?? step / 3;
  const key = o.seed ?? 'strip';
  const shots = [a, ...(o.cuts ?? []).filter((c) => c > a && c < b), b];
  const out: number[] = [];
  if (shots.length - 1 >= n) {
    // more shots than tiles: one moment from each of n shots spread over the clip
    for (let i = 0; i < n; i++) {
      const s = Math.floor((i * (shots.length - 1)) / n);
      const lo = shots[s];
      const hi = shots[s + 1];
      out.push(lo + (hi - lo) * (0.3 + 0.4 * rand(`${key}:${i}`)));
    }
    return out;
  }
  for (let i = 0; i < n; i++) {
    const t = a + step * (i + 0.5) + step * 0.6 * (rand(`${key}:${i}`) - 0.5);
    out.push(i > 0 ? Math.max(t, out[i - 1] + gap) : t);
  }
  return out.map((t) => Math.min(b, t));
};

export type ClipRef = { src: string; dur: number; cuts?: readonly number[] };
/**
 * `n` thumbnails from several clips: dealt round the clips so two neighbours never come from one clip when there are two
 * or more, each a distinct moment of its clip (stripMoments over that clip's share of the tiles). Draw each with the
 * footage at `t` (fx/Footage from=t, or a frame extracted at t), never one still repeated.
 */
export const thumbsFrom = (clips: readonly ClipRef[], n: number, seed = 'thumbs'): { clip: number; src: string; t: number }[] => {
  if (!clips.length) return [];
  const order = clips.map((_, i) => i).sort((x, y) => rand(`${seed}:o${x}`) - rand(`${seed}:o${y}`));
  const per = order.map((_, k) => Math.floor(n / clips.length) + (k < n % clips.length ? 1 : 0));
  const moments = order.map((c, k) => stripMoments(clips[c].dur, Math.max(1, per[k]), { seed: `${seed}:${c}`, cuts: clips[c].cuts }));
  const used = order.map(() => 0);
  return Array.from({ length: n }, (_, i) => {
    const k = i % order.length;
    const c = order[k];
    const t = moments[k][used[k]++ % moments[k].length];
    return { clip: c, src: clips[c].src, t };
  });
};

// ------------------------------------------------------------------------------------------------ the cast

/** A picture the film may show: its id and file, the shoot it belongs to (one session, one set of people), who is in it. */
export type CastPicture = { id: string; src?: string; shoot?: string; people?: readonly string[] };

const castKeys = (p: CastPicture) => [`shoot:${p.shoot ?? p.id}`, ...(p.people ?? []).map((x) => `person:${x}`)];

/**
 * Pictures for each beat so the cast varies: `perBeat` pictures a beat (a number or one per beat), no shoot or person in
 * more than `maxBeats` beats (house 2), never the shoot of the beat before, the least-used first (ties dealt by `seed`).
 * Returns the plan and what it could not honour (too few shoots for the beats: find more pictures, or show fewer).
 */
export const castPlan = (beats: readonly string[], pictures: readonly CastPicture[], o: { perBeat?: number | readonly number[]; maxBeats?: number; seed?: string } = {}) => {
  const max = o.maxBeats ?? 2;
  const seen = new Map<string, number>();
  const plan: Record<string, CastPicture[]> = {};
  const short: string[] = [];
  let before = new Set<string>();
  beats.forEach((b, bi) => {
    const want = typeof o.perBeat === 'number' ? o.perBeat : o.perBeat?.[bi] ?? 1;
    const here: CastPicture[] = [];
    const now = new Set<string>();
    const score = (p: CastPicture) => Math.max(0, ...castKeys(p).map((k) => seen.get(k) ?? 0)) + rand(`${o.seed ?? 'cast'}:${b}:${p.id}`) * 0.5;
    const pool = [...pictures].sort((x, y) => score(x) - score(y));
    for (const p of pool) {
      if (here.length >= want) break;
      const keys = castKeys(p);
      if (keys.some((k) => before.has(k) || (seen.get(k) ?? 0) >= max)) continue;
      if (here.some((q) => q.id === p.id)) continue;
      here.push(p);
      keys.forEach((k) => now.add(k));
    }
    if (here.length < want) short.push(`${b}: ${here.length} of ${want}`);
    now.forEach((k) => seen.set(k, (seen.get(k) ?? 0) + 1));
    plan[b] = here;
    before = now;
  });
  return { plan, short };
};

/** Problems with a cast (empty when it varies): a shoot or a person in more than `maxBeats` beats (house 2). */
export const checkCast = (plan: Record<string, readonly CastPicture[]>, maxBeats = 2): string[] => {
  const beats = new Map<string, Set<string>>();
  for (const [b, pics] of Object.entries(plan)) for (const p of pics) for (const k of castKeys(p)) beats.set(k, (beats.get(k) ?? new Set()).add(b));
  return [...beats].filter(([, s]) => s.size > maxBeats).map(([k, s]) => `${k.replace(':', ' ')} is in ${s.size} beats (${[...s].join(', ')}): at most ${maxBeats}`);
};
