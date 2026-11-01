#!/usr/bin/env node
/**
 * data-check.mjs: does the film's material hold up when a frame is paused? A viewer reads a paused frame like a
 * screenshot, and a few defects give a made-up product away at once: a date whose weekday is wrong or that sits last
 * month, a count that is not the list under it, a filmstrip that is one still again and again, one stock couple in
 * every beat, a waveform that repeats every few bars. This reads the film's source (parsed with the TypeScript and JSX
 * grammar of @babel/parser, which every Remotion project installs), its public/ pictures and, optionally, the layout
 * audit's measured text,
 * and fails them before a render ships. The kit computes all of it right (src/kit/real.ts); this catches the hand-typed.
 *
 * Checks (error unless marked):
 *   date-weekday   a date printed with a weekday that is not the calendar's ("Tue 28 Oct" when 28 Oct 2026 is a
 *                  Wednesday). A date without a year takes the year that puts it nearest the film's day
 *   date-invalid   a day the month does not have ("Feb 30", "Sep 31")
 *   date-far       (warning) a date more than 45 days before or 180 days after the film's day: a product shows
 *                  today, this week, the next weeks
 *   week-past      (warning) a week range ("Oct 19 – 25") over before the film's week began: last week's screen
 *   week-start     (warning) a 7-day range that starts on neither a Monday nor a Sunday ("Oct 20 – 26" in 2026 runs
 *                  Tuesday to Monday): a calendar week starts where the product's week starts
 *   film-date      (warning) no FILM_DATE (src/kit/real.ts) or a FILM_DATE more than 60 days before today's date:
 *                  every date on screen is computed from the film's own day
 *   count-list     a count over a list it contradicts: an object holding a count ("14 today", `sipsCount: 14`,
 *                  `count: 14`, "46 clips") beside the list it counts (`rows`, `items`, `clips`, ... the noun or the
 *                  one list there) when the count is under the rows, or over them while fewer than 8 rows show
 *                  (a dense screen shows 8+, else the count is the rows': kit/real.ts dayLog, listView, countLabel)
 *   dense-rows     (warning) a screen, list, feed or log element drawn with rows={n} under 8
 *   ago-order      (warning) a list of three or more items timed by `ago` ("now", "2m ago", "1h") that does not run
 *                  newest first: a stack or a feed shows "now" in front and each item older than the one above it
 *   thumb-repeat   a filmstrip or contact row that is one picture again: three or more numbered frames in a row of
 *                  public/ (name-0.jpg, name-1.jpg, ...) that are the same picture at thumbnail size (mean difference
 *                  under 10 of 255 at 8x5 px: a locked-off shot sampled six times), or a list in the source that
 *                  names one picture three times running, or fill()s / maps a length to one picture
 *   photo-repeat   one photograph or clip (its still, graded copy and clip are one picture) in more than --max-beats
 *                  beats (house: half the film's beats, at least 2)
 *   cast-repeat    one shoot or person in more than --max-beats beats: an error for the shoots and people declared in
 *                  cast.json (public/ or the project root: {"<file stem or glob>": {"shoot": "s", "people": ["a"]}},
 *                  `"hero": true` exempts the film's one protagonist), a warning for a shoot read from the files'
 *                  names (the stem's first word: beach-laugh, beach-meet). A beat is an act file (src/acts/*.tsx),
 *                  or a section of a data module (WALK.reading), folded into the act that reads it
 *   co-moving      counters that measure one activity and do not move together: a distance, a climb, steps, a size or a
 *                  percentage that counts with the frame while an elapsed or moving time on the same screen stays frozen
 *                  (or a running clock beside a frozen distance). Read per component from the readouts it draws (JSX
 *                  children and value/text/label props), their text from literals and from the script's own strings
 *                  (`ui(pair, k)` / `.ui[k]` of the pairs whose scene draws it); a readout labelled as a fixed property
 *                  (Total, Goal, Summit, Next, Avg ...) may stay still
 *   case-number    a string naming one of the case's names (the spine's `case: { request, names, numbers }`, src/spine.ts)
 *                  shows a price or a share of the kind the case's numbers hold but another value ("Saturday Ceramics $15"
 *                  while the case says $12): one figure per case, the same in every act
 *   case-name      (warning) a string one or two letters off a case name ("Saturday Ceramic"): the same name, spelled the same
 *   wave-periodic  a waveform, spectrum or level generator built from the bar index with a modulo ("i % 8": a tall
 *                  bar every eighth bar); (warning) wave-synthetic: one made only of sines of the index. Draw the
 *                  track's own peaks (`peaks` below, kit/real.ts peaksBars) or waveBars() noise
 *
 * Usage (from the project root):
 *   node scripts/data-check.mjs [src] [--public public] [--layout out/qa/layout-Film.json] [--today YYYY-MM-DD]
 *        [--max-beats 2] [--no-images] [--json] [--strict]
 *   node scripts/data-check.mjs peaks <audio> [--bars 160] [--from s] [--to s] [--out src/kit/peaks.json]
 *   src        the film's source folder (default src); fx/, lib/, node_modules, out and tests are house code, skipped
 *   --layout   also read the dates in the text boxes the layout audit measured on the render (layout-audit.sh --json)
 *   --today    the film's day (default FILM_DATE from the source, else today's date)
 *   --strict   warnings fail too
 *   peaks      the track's loudness as `bars` values 0..1 (RMS per bar, the loudest 1) over [from, to] seconds, written
 *              as JSON {source, from, to, bars, peaks}: import it and draw waveBars(n, { peaks }) or peaksBars()
 * Needs the project's node_modules (@babel/parser, installed with Remotion) and, for the pictures and peaks, ffmpeg.
 * Exit codes: 0 pass, 1 a check failed (or a warning with --strict), 2 bad arguments or no source.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STARTER = path.resolve(HERE, '..', 'assets', 'remotion-starter');
const SKIP_DIRS = new Set(['node_modules', 'fx', 'lib', 'out', 'test', 'tests', '__pycache__', 'scripts', '.git']);
const PIC_EXT = /\.(jpe?g|png|webp|avif|gif|mp4|mov|webm|m4v)$/i;
const STILL_EXT = /\.(jpe?g|png|webp)$/i;
const PIC_PROP = /^(src|still|photo|pic|picture|image|img|clip|thumb|thumbnail|frame|poster|file|shot|footage|video)$/i;
export const HOUSE = { minRows: 8, maxBeats: 2, sameMad: 10, runMin: 3, farBefore: 45, farAfter: 180, staleDays: 60 };

// ------------------------------------------------------------------------------------------------ the calendar
const WD_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MO_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD_RE = '(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues?|Wed|Thu(?:rs?)?|Fri|Sat|Sun)\\.?';
const MO_RE = '(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\\.?';
const ORD = '(?:st|nd|rd|th)?';
const wdIndex = (s) => {
  const k = s.replace('.', '').slice(0, 3).toLowerCase();
  return WD_SHORT.findIndex((w) => w.toLowerCase() === k);
};
const moIndex = (s) => {
  const k = s.replace('.', '').slice(0, 3).toLowerCase();
  return MO_SHORT.findIndex((m) => m.toLowerCase() === k);
};
const utc = (y, m, d) => Date.UTC(y, m, d) / 86400000; // m 0-11; whole days since 1970
const weekdayOf = (y, m, d) => new Date(Date.UTC(y, m, d)).getUTCDay();
const validDay = (y, m, d) => d >= 1 && m >= 0 && m <= 11 && d <= new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const nearestYear = (m, d, today) => {
  const y0 = new Date(today * 86400000).getUTCFullYear();
  return [y0 - 1, y0, y0 + 1].reduce((a, b) => (Math.abs(utc(b, m, d) - today) < Math.abs(utc(a, m, d) - today) ? b : a));
};
const fmt = (y, m, d) => `${WD_SHORT[weekdayOf(y, m, d)]} ${d} ${MO_SHORT[m]} ${y}`;
const isoOf = (t) => new Date(t * 86400000).toISOString().slice(0, 10);

/** Dates in a text: [{kind: 'wd'|'day'|'range', raw, y, m, d, wd?, explicitYear, end?}] */
export const datesIn = (text, today) => {
  const out = [];
  const taken = [];
  const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
  const add = (a, b, v) => { taken.push([a, b]); out.push(v); };
  const year = (yy, m, d) => (yy ? Number(yy.length === 2 ? `20${yy}` : yy) : nearestYear(m, d, today));
  const pats = [
    // Tue 28 Oct [2026] / Tuesday, 28 October 2026
    [new RegExp(`\\b${WD_RE},?\\s+(\\d{1,2})${ORD}\\s+${MO_RE}(?:,?\\s+(\\d{4}))?(?![\\w])`, 'gi'), (x) => ({ wd: x[1], d: x[2], mo: x[3], y: x[4] })],
    // Tue, Oct 28[, 2026] / Tuesday October 28th
    [new RegExp(`\\b${WD_RE},?\\s+${MO_RE}\\s+(\\d{1,2})${ORD}(?:,?\\s+(\\d{4}))?(?![\\w])`, 'gi'), (x) => ({ wd: x[1], mo: x[2], d: x[3], y: x[4] })],
  ];
  for (const [re, get] of pats) {
    for (const x of text.matchAll(re)) {
      const a = x.index, b = a + x[0].length;
      if (!free(a, b)) continue;
      const g = get(x);
      const m = moIndex(g.mo), d = Number(g.d);
      const y = year(g.y, m, d);
      add(a, b, { kind: 'wd', raw: x[0], y, m, d, wd: wdIndex(g.wd), explicitYear: !!g.y });
    }
  }
  // Tue 10/28 (month/day, or day/month: either order that is a real day with that weekday passes)
  for (const x of text.matchAll(new RegExp(`\\b${WD_RE},?\\s+(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?(?![\\w./])`, 'gi'))) {
    const a = x.index, b = a + x[0].length;
    if (!free(a, b)) continue;
    const wd = wdIndex(x[1]);
    const p = Number(x[2]), q = Number(x[3]);
    const cands = [[p - 1, q], [q - 1, p]].filter(([m, d]) => m >= 0 && m <= 11).map(([m, d]) => ({ m, d, y: year(x[4], m, d) })).filter((c) => validDay(c.y, c.m, c.d));
    if (!cands.length) continue;
    const ok = cands.find((c) => weekdayOf(c.y, c.m, c.d) === wd);
    const c = ok ?? cands[0];
    add(a, b, { kind: 'wd', raw: x[0], ...c, wd, explicitYear: !!x[4] });
  }
  // ranges: Oct 20 – 26 / Oct 26 – Nov 1 [2026]
  for (const x of text.matchAll(new RegExp(`\\b${MO_RE}\\s+(\\d{1,2})${ORD}\\s*(?:[–—-]|to)\\s*(?:${MO_RE}\\s+)?(\\d{1,2})${ORD}(?:,?\\s+(\\d{4}))?(?![\\w])`, 'g'))) {
    const a = x.index, b = a + x[0].length;
    if (!free(a, b)) continue;
    const m = moIndex(x[1]), d = Number(x[2]);
    const m2 = x[3] ? moIndex(x[3]) : m, d2 = Number(x[4]);
    const y = year(x[5], m, d);
    const y2 = m2 < m ? y + 1 : y;
    add(a, b, { kind: 'range', raw: x[0], y, m, d, end: { y: y2, m: m2, d: d2 }, explicitYear: !!x[5] });
  }
  // plain days: Oct 28 / 28 Oct [2026] (capitalised month names only: "may 4" is a verb)
  for (const [re, get] of [
    [new RegExp(`\\b${MO_RE}\\s+(\\d{1,2})${ORD}(?:,?\\s+(\\d{4}))?(?![\\w:.])`, 'g'), (x) => ({ mo: x[1], d: x[2], y: x[3] })],
    [new RegExp(`\\b(\\d{1,2})${ORD}\\s+${MO_RE}(?:,?\\s+(\\d{4}))?(?![\\w])`, 'g'), (x) => ({ d: x[1], mo: x[2], y: x[3] })],
  ]) {
    for (const x of text.matchAll(re)) {
      const a = x.index, b = a + x[0].length;
      if (!free(a, b)) continue;
      const g = get(x);
      const m = moIndex(g.mo), d = Number(g.d);
      add(a, b, { kind: 'day', raw: x[0], y: year(g.y, m, d), m, d, explicitYear: !!g.y });
    }
  }
  return out;
};

/** Findings for the dates of one text. */
export const checkDates = (text, where, today, add) => {
  const ws = weekdayOf;
  for (const v of datesIn(text, today)) {
    if (!validDay(v.y, v.m, v.d) || (v.end && !validDay(v.end.y, v.end.m, v.end.d))) {
      add('date-invalid', 'error', `"${v.raw}" (${where}) is not a day of the calendar`, where, text);
      continue;
    }
    if (v.kind === 'wd' && v.wd >= 0 && ws(v.y, v.m, v.d) !== v.wd)
      add('date-weekday', 'error', `"${v.raw}" (${where}): ${v.d} ${MO_FULL[v.m]} ${v.y} is a ${WD_FULL[ws(v.y, v.m, v.d)]}, not a ${WD_FULL[v.wd]}; print the weekday from the date (kit/real.ts fmtDay(day(...)))`, where, text);
    const t = utc(v.y, v.m, v.d);
    if (v.kind === 'range') {
      const t2 = utc(v.end.y, v.end.m, v.end.d);
      const weekStart = today - ((new Date(today * 86400000).getUTCDay() + 6) % 7); // the film's Monday
      if (t2 - t === 6 && ![0, 1].includes(ws(v.y, v.m, v.d)))
        add('week-start', 'warn', `"${v.raw}" (${where}) runs ${WD_FULL[ws(v.y, v.m, v.d)]} to ${WD_FULL[ws(v.end.y, v.end.m, v.end.d)]}: a week starts on Monday (or Sunday); kit/real.ts weekOf()`, where, text);
      if (t2 < weekStart - 1 && t2 - t <= 8)
        add('week-past', 'warn', `"${v.raw}" (${where}) ended before the film's week began (${isoOf(weekStart)}): the screen shows this week, weekOf(day()) "${weekLabel(weekStart)}"`, where, text);
      continue;
    }
    if (t < today - HOUSE.farBefore || t > today + HOUSE.farAfter)
      add('date-far', 'warn', `"${v.raw}" (${where}) is ${Math.abs(Math.round(t - today))} days ${t < today ? 'before' : 'after'} the film's day (${isoOf(today)}): a product shows the days round today (kit/real.ts day(FILM_DATE, offset))`, where, text);
  }
};
const weekLabel = (from) => {
  const a = new Date(from * 86400000), b = new Date((from + 6) * 86400000);
  return a.getUTCMonth() === b.getUTCMonth() ? `${MO_SHORT[a.getUTCMonth()]} ${a.getUTCDate()} – ${b.getUTCDate()}` : `${MO_SHORT[a.getUTCMonth()]} ${a.getUTCDate()} – ${MO_SHORT[b.getUTCMonth()]} ${b.getUTCDate()}`;
};

// ------------------------------------------------------------------------------------------------ the source
const loadParser = (roots) => {
  for (const base of roots) {
    try {
      return createRequire(path.join(base, 'package.json'))('@babel/parser');
    } catch { /* next */ }
  }
  return null;
};
const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'range', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'errors', 'typeAnnotation', 'returnType', 'typeParameters', 'superTypeParameters', 'implements', 'decorators']);

const walk = (root) => {
  const out = [];
  const go = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) go(p); }
      else if (/\.(tsx?|jsx?|mjs)$/.test(e.name) && !e.name.endsWith('.d.ts') && !/\.test\./.test(e.name)) out.push(p);
    }
  };
  go(root);
  return out.sort();
};

const picturesIn = (pub) => {
  const out = [];
  const go = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) go(p);
      else if (PIC_EXT.test(e.name)) out.push(p);
    }
  };
  go(pub);
  return out.sort();
};
const baseOf = (f) => path.basename(f).replace(PIC_EXT, '');
const stemOf = (f) => baseOf(f).replace(/\.(natural|matte|silver|night|tint|duotone|deep|graded)$/i, '');

const globRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
const readCast = (roots) => {
  for (const r of roots) {
    const p = path.join(r, 'cast.json');
    if (!fs.existsSync(p)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const map = j.pictures ?? j;
      return { file: p, rules: Object.entries(map).filter(([, v]) => v && typeof v === 'object').map(([k, v]) => ({ re: globRe(k), shoot: v.shoot, people: v.people ?? [], hero: !!v.hero })) };
    } catch (e) {
      return { file: p, error: String(e.message || e), rules: [] };
    }
  }
  return null;
};

// ------------------------------------------------------------------------------------------------ pictures
const ffmpegOk = () => spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
const THUMB = ['-vf', 'scale=8:5:flags=area,format=gray', '-f', 'rawvideo', '-'];
const thumb = (f) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-frames:v', '1', ...THUMB], { maxBuffer: 1 << 20 });
  return r.status === 0 && r.stdout?.length === 40 ? r.stdout : null;
};
/** Thumbnails of a numbered set: one ffmpeg call over the image sequence when the numbers run on, else one a file. */
const thumbsOf = (list) => {
  const first = list[0];
  const run = list.every((x, i) => x.n === first.n + i && x.raw.length === first.raw.length && (x.raw.length === 1 || x.raw[0] !== '0' || first.raw[0] === '0'));
  if (run && !/%/.test(first.f)) {
    const pad = first.raw[0] === '0' && first.raw.length > 1 ? `%0${first.raw.length}d` : '%d';
    const pattern = path.join(path.dirname(first.f), `${first.head}${pad}${first.tail}`);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'image2', '-start_number', String(first.n), '-i', pattern, '-frames:v', String(list.length), ...THUMB], { maxBuffer: 1 << 22 });
    if (r.status === 0 && r.stdout?.length === 40 * list.length) return list.map((_, i) => r.stdout.subarray(40 * i, 40 * i + 40));
  }
  return list.map((x) => thumb(x.f));
};
const mad = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};
/** A relative time in minutes ("now" 0, "2m ago" 2, "1 h" 60, "yesterday" 1440, "3d" 4320), or null when it is none. */
export const agoMinutes = (t) => {
  const s = String(t).trim().toLowerCase();
  if (/^(just )?now$/.test(s)) return 0;
  if (s === 'yesterday') return 1440;
  const m = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|m|min|mins|minutes?|h|hr|hrs|hours?|d|days?|w|wk|wks|weeks?)(?:\s+ago)?$/.exec(s);
  if (!m) return null;
  const unit = m[2][0] === 'm' ? 1 : m[2][0] === 'h' ? 60 : m[2][0] === 'd' ? 1440 : m[2][0] === 'w' ? 10080 : 1 / 60;
  return Number(m[1]) * unit;
};
/** Numbered frame sets in public/ (name-0.jpg, name-1.jpg ... in one folder) and their longest run of the same picture. */
export const thumbRuns = (files) => {
  const groups = new Map();
  for (const f of files) {
    if (!STILL_EXT.test(f)) continue;
    const m = /^(.*?[-_])(\d+)((?:\.[a-z]+)*\.(jpe?g|png|webp))$/i.exec(path.basename(f));
    if (!m) continue;
    const key = path.join(path.dirname(f), `${m[1]}#${m[3]}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ f, n: Number(m[2]), raw: m[2], head: m[1], tail: m[3] });
  }
  const out = [];
  for (const [key, list] of groups) {
    if (list.length < HOUSE.runMin) continue;
    list.sort((a, b) => a.n - b.n);
    const th = thumbsOf(list);
    if (th.some((x) => !x)) continue;
    const diffs = th.slice(1).map((x, i) => mad(x, th[i]));
    let best = 1, run = 1, at = 0, bestAt = 0;
    diffs.forEach((d, i) => {
      if (d < HOUSE.sameMad) { run++; if (run > best) { best = run; bestAt = at; } }
      else { run = 1; at = i + 1; }
    });
    out.push({ set: key, frames: list.length, run: best, from: list[bestAt]?.n, to: list[bestAt + best - 1]?.n, diffs: diffs.map((d) => Math.round(d * 10) / 10) });
  }
  return out;
};

// ------------------------------------------------------------------------------------------------ the checks
export const run = (o) => {
  const findings = [];
  const add = (rule, severity, message, where, text) => findings.push({ rule, severity, message, where, ...(text !== undefined ? { text: String(text).slice(0, 120) } : {}) });
  const src = path.resolve(o.src);
  const project = path.dirname(src);
  const parser = loadParser([project, process.cwd(), STARTER]);
  if (!parser) throw Object.assign(new Error('@babel/parser not found (a Remotion project has it): npm install in the project'), { code: 2 });
  const files = walk(src);
  const rel = (p) => path.relative(process.cwd(), p).split(path.sep).join('/') || p;

  // the film's day
  let filmDate = o.today ?? null, dateFrom = o.today ? '--today' : null;
  if (!filmDate) {
    for (const f of files) {
      const m = /\bFILM_DATE\s*(?::\s*string\s*)?=\s*['"`](\d{4}-\d{2}-\d{2})['"`]/.exec(fs.readFileSync(f, 'utf8'));
      if (m) { filmDate = m[1]; dateFrom = rel(f); break; }
    }
  }
  const sys = Math.floor(Date.now() / 86400000);
  if (!filmDate) {
    filmDate = isoOf(sys);
    dateFrom = 'today';
    add('film-date', 'warn', `no FILM_DATE in the source: the dates are read against today's date (${filmDate}); set the film's day in src/kit/real.ts`, 'src');
  }
  const fm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(filmDate);
  if (!fm) throw Object.assign(new Error(`the film's day "${filmDate}" is not YYYY-MM-DD`), { code: 2 });
  const today = utc(Number(fm[1]), Number(fm[2]) - 1, Number(fm[3]));
  if (dateFrom !== '--today' && dateFrom !== 'today' && sys - today > HOUSE.staleDays)
    add('film-date', 'warn', `FILM_DATE ${filmDate} (${dateFrom}) is ${sys - today} days ago: set it to the release day, so "today" on screen is the day the film comes out`, dateFrom);

  // pictures in public/
  const pub = path.resolve(o.public ?? path.join(project, 'public'));
  const pics = picturesIn(pub);
  const picRel = pics.map((p) => path.relative(pub, p).split(path.sep).join('/'));
  // a picture by its path ('assets/a.jpg') or a bare stem ('beach-laugh' names beach-laugh.natural.mp4): every prefix of a
  // file's name that ends before a dot is a name for it
  const byName = new Map();
  for (const r of picRel) {
    const b = path.posix.basename(r);
    for (let i = b.indexOf('.'); i !== -1; i = b.indexOf('.', i + 1)) { const k = b.slice(0, i); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(r); }
    if (!byName.has(b)) byName.set(b, []);
    byName.get(b).push(r);
  }
  const memo = new Map();
  const resolvePic = (s) => {
    if (!s || s.length < 3 || s.length > 240 || /\s/.test(s)) return [];
    if (memo.has(s)) return memo.get(s);
    const t = s.replace(/^\.?\/+/, '').replace(/^public\//, '');
    let out = [];
    if (PIC_EXT.test(t)) out = (byName.get(path.posix.basename(t)) ?? []).filter((r) => r === t || r.endsWith(`/${t}`));
    else if (!t.includes('/')) out = byName.get(t) ?? []; // a path without an extension is a folder, or built round an interpolation
    memo.set(s, out);
    return out;
  };

  // the source, parsed (Babel's TypeScript and JSX grammar)
  const sources = [];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    const plugins = /\.tsx$/.test(f) ? ['typescript', 'jsx'] : /\.ts$/.test(f) ? ['typescript'] : ['jsx'];
    try {
      const ast = parser.parse(code, { sourceType: 'module', plugins, errorRecovery: true, allowReturnOutsideFunction: true });
      sources.push({ f, code, ast, rel: rel(f), act: /(^|[\\/])(acts|scenes)[\\/]/.test(path.relative(src, f)) });
    } catch (e) {
      add('parse', 'warn', `${rel(f)} could not be read (${String(e.message).split('\n')[0]}): its data is not checked`, rel(f));
    }
  }
  const lineOf = (n) => n.loc?.start.line ?? 0;
  const at = (s, n) => `${s.rel}:${lineOf(n)}`;
  const slice = (s, n) => s.code.slice(n.start, n.end);
  const visit = (root, fn) => {
    const stack = [];
    const go = (node) => {
      if (fn(node, stack) === false) return;
      stack.push(node);
      for (const k in node) {
        if (SKIP_KEYS.has(k)) continue;
        const v = node[k];
        if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') go(c); }
        else if (v && typeof v.type === 'string') go(v);
      }
      stack.pop();
    };
    go(root.type === 'File' ? root.program : root);
  };
  const textOf = (n) => {
    if (!n) return null;
    if (n.type === 'StringLiteral') return n.value;
    if (n.type === 'TemplateLiteral') return n.quasis.map((q) => q.value.cooked ?? q.value.raw).join('\u0000');
    if (n.type === 'JSXText') return n.value.trim() || null;
    return null;
  };
  const nameOf = (k) => (!k ? null : k.type === 'Identifier' ? k.name : k.type === 'StringLiteral' ? k.value : k.type === 'NumericLiteral' ? String(k.value) : null);
  const WRAP = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'ParenthesizedExpression']);
  const unwrap = (e) => { while (e && WRAP.has(e.type)) e = e.expression; return e; };
  const propsOf = (obj) => obj.properties.filter((p) => p.type === 'ObjectProperty' && (!p.computed || p.key.type === 'StringLiteral')).map((p) => ({ name: nameOf(p.key), init: unwrap(p.value), node: p })).filter((p) => p.name);
  const calleeText = (e) => (!e ? '' : e.type === 'Identifier' ? e.name : e.type === 'MemberExpression' && !e.computed ? `${calleeText(e.object)}.${nameOf(e.property)}` : '');
  const isFn = (n) => n && (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression');
  const isSource = (n, stack) => { const p = stack[stack.length - 1]; return p && (p.type === 'ImportDeclaration' || p.type === 'ExportAllDeclaration' || p.type === 'ExportNamedDeclaration' || p.type === 'TSExternalModuleReference') && p.source === n; };

  // 1. dates (every string, template and JSX text in the source; the layout's measured text)
  for (const s of sources) {
    visit(s.ast, (n, stack) => {
      if (n.type === 'TSImportType' || isSource(n, stack)) return false;
      const t = textOf(n);
      if (t) checkDates(t, at(s, n), today, add);
    });
  }
  if (o.layout) {
    const doc = JSON.parse(fs.readFileSync(o.layout, 'utf8'));
    const seen = new Set();
    for (const fr of doc.boxes ?? doc.frames ?? []) for (const b of fr.boxes ?? []) {
      if (!b.text || seen.has(b.text)) continue;
      seen.add(b.text);
      checkDates(b.text, `f${fr.frame} ${b.id ?? 'box'}`, today, add);
    }
  }

  // 2. counts against their lists, and short lists on screens
  const GENERIC = new Set(['today', 'total', 'items', 'item', 'entries', 'rows', 'results', 'found', 'logged', 'all', 'count']);
  const SUBSET = new Set(['new', 'left', 'open', 'unread', 'pending', 'done', 'due', 'overdue', 'failed', 'paid', 'waiting', 'active', 'live', 'flagged', 'starred', 'selected']); // a part of the list: never more than it
  const LIST_NAMES = new Set(['rows', 'items', 'list', 'entries', 'records', 'log', 'feed', 'events', 'history', 'messages', 'results', 'data', 'lines']);
  const UNITS = /^(of|x|min|mins|h|hr|hrs|s|sec|secs|ms|px|ml|l|kg|g|km|m|mi|am|pm|days?|weeks?|hours?|minutes?|seconds?|months?|years?|percent|pages?|mb|gb|kb|fps|bpm)$/i;
  const sing = (w) => w.toLowerCase().replace(/ies$/, 'y').replace(/(ss|sh|ch|x)es$/, '$1').replace(/s$/, '');
  const words = (name) => name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const s of sources) {
    visit(s.ast, (n, stack) => {
      if (n.type === 'ObjectExpression') {
        const props = propsOf(n);
        const arrays = props.filter((p) => p.init?.type === 'ArrayExpression' && p.init.elements.length && p.init.elements.every((e) => e && e.type !== 'SpreadElement'));
        if (!arrays.length) return;
        for (const p of props) {
          let count = null, nouns = [];
          const t = textOf(p.init);
          if (t && !t.includes('\u0000')) {
            const m = /^\s*(\d{1,3}(?:,\d{3})+|\d+)\s+([A-Za-z]+)\b/.exec(t);
            if (m && !UNITS.test(m[2])) { count = Number(m[1].replace(/,/g, '')); nouns = [m[2].toLowerCase(), ...words(p.name)]; }
          } else if (p.init?.type === 'NumericLiteral' && /^(count|total|n|num|[a-z]+(Count|Total|Num|N))$/.test(p.name)) {
            count = p.init.value;
            nouns = words(p.name).filter((w) => !['total', 'num', 'n'].includes(w));
            if (!nouns.length) nouns = ['count'];
          }
          if (count === null || !Number.isFinite(count)) continue;
          const others = arrays.filter((a) => a !== p);
          let list = others.find((a) => nouns.some((w) => w !== 'count' && sing(w) === sing(a.name)));
          const subset = !list && nouns.some((w) => SUBSET.has(w));
          if (!list && nouns.some((w) => GENERIC.has(w) || SUBSET.has(w))) {
            const named = others.filter((a) => LIST_NAMES.has(a.name.toLowerCase()));
            const records = others.filter((a) => a.init.elements.every((e) => ['ObjectExpression', 'ArrayExpression'].includes(unwrap(e)?.type)));
            list = named.length === 1 ? named[0] : records.length === 1 ? records[0] : null;
          }
          if (!list) continue;
          const L = list.init.elements.length;
          const where = at(s, p.node);
          const said = t ? `"${t}"` : `${p.name}: ${count}`;
          if (count < L && !subset) add('count-list', 'error', `${said} (${where}) counts ${count} over the ${L} rows of \`${list.name}\`: the count is the rows' (kit/real.ts countLabel(rows, ...))`, where, t ?? p.name);
          else if (count > L && L < Math.min(count, HOUSE.minRows))
            add('count-list', 'error', `${said} (${where}) says ${count} but \`${list.name}\` holds ${L} row${L === 1 ? '' : 's'}: give the list its ${count} entries and show ${Math.min(count, HOUSE.minRows)}+ (kit/real.ts dayLog + listView), or say ${L}`, where, t ?? p.name);
        }
      }
      if (n.type === 'JSXAttribute' && n.name?.name === 'rows' && n.value?.type === 'JSXExpressionContainer' && n.value.expression?.type === 'NumericLiteral') {
        const v = n.value.expression.value;
        const el = stack[stack.length - 1];
        const tag = el?.type === 'JSXOpeningElement' ? slice(s, el.name) : '';
        if (v < HOUSE.minRows && /Screen|List|Feed|Log|Table|Inbox|History|Panel|Card/.test(tag))
          add('dense-rows', 'warn', `<${tag} rows={${v}}> (${at(s, n)}): a product screen shows ${HOUSE.minRows}+ rows, the rest of the log under the fold`, at(s, n));
      }
    });
  }

  // 2b. relative times down a list: a stack or a feed shows the newest first ("now" in front), each time older than the
  // one above it; a list typed oldest first under a stack that reads newest first is the chronology a paused frame shows
  for (const s of sources) {
    visit(s.ast, (n) => {
      if (n.type !== 'ArrayExpression' || n.elements.length < 3) return;
      const times = n.elements.map((e) => {
        const o = unwrap(e);
        const p = o?.type === 'ObjectExpression' ? propsOf(o).find((q) => q.name === 'ago') : null;
        const t = p ? textOf(p.init) : null;
        return t && !t.includes('\u0000') ? t : null;
      });
      if (times.some((t) => t === null)) return; // every item timed, or the list is no timed stack
      const mins = times.map(agoMinutes);
      if (mins.some((m) => m === null)) return;
      const k = mins.findIndex((m, i) => i > 0 && m < mins[i - 1]);
      if (k > 0)
        add('ago-order', 'warn', `a list timed ${times.map((t) => `"${t}"`).join(', ')} (${at(s, n)}) does not run newest first: "${times[k]}" sits under "${times[k - 1]}". A stack or a feed shows "now" in front and each item older than the one above it (a stack times its cards by slot, not by each item's own time)`, at(s, n), times.join(', '));
    });
  }

  // 3. waveforms built from the index
  const WAVE_NAME = /wave|peak|bars?$|^bars|level|loud|spectr|meter|amplitude|^amp/i;
  const REAL_SRC = /^(rand|noise|noise2D|noise3D|vnoise|hash|peaks?|env|envAt|envelope|waveBars|peaksBars|meterLevel|loudness|rms)$/i;
  for (const s of sources) {
    visit(s.ast, (n) => {
      if (n.type !== 'VariableDeclarator' || !n.init || n.id?.type !== 'Identifier' || !WAVE_NAME.test(n.id.name)) return;
      const params = new Set();
      let modulo = null, trig = false, real = false;
      visit(n.init, (m) => {
        if (isFn(m)) m.params.forEach((p) => p.type === 'Identifier' && params.add(p.name));
        if (m.type === 'BinaryExpression' && m.operator === '%' && unwrap(m.left)?.type === 'Identifier' && params.has(unwrap(m.left).name)) modulo = m;
        if (m.type === 'CallExpression') {
          const c = calleeText(m.callee);
          if (/^Math\.(sin|cos)$/.test(c)) trig = true;
          if (REAL_SRC.test(c.split('.').pop())) real = true;
        }
        if (m.type === 'Identifier' && REAL_SRC.test(m.name)) real = true;
      });
      const where = at(s, n);
      if (modulo) add('wave-periodic', 'error', `${n.id.name} (${where}) is built with "${slice(s, modulo)}": a tall bar every few bars is a pattern the eye finds at once; draw the track's own peaks (data-check.mjs peaks, kit/real.ts waveBars(n, { peaks })) or waveBars() noise`, where);
      else if (trig && !real) add('wave-synthetic', 'warn', `${n.id.name} (${where}) is sines of the index: it repeats; draw the track's own peaks (data-check.mjs peaks) or kit/real.ts waveBars()`, where);
    });
  }

  // 4. pictures: tables of named pictures, the beats that show each, repeated runs
  const tableKeys = new Map(); // key -> Set(picture rel paths)
  const tableVars = new Set();
  const tables = new WeakSet(); // the object literals that define named pictures (a definition is not a use)
  const refOf = (n) => { const t = textOf(n); return t && !t.includes('\u0000') ? resolvePic(t) : []; };
  // an entry names a picture directly: 'a.jpg', still('beach-laugh-3.5', ...), { src: 'clips/a.mp4', ... }
  const picsUnder = (init) => {
    init = unwrap(init);
    const found = new Set();
    const take = (e) => { for (const r of refOf(unwrap(e))) found.add(r); };
    if (!init) return found;
    take(init);
    if (init.type === 'CallExpression') init.arguments.forEach(take);
    if (init.type === 'ObjectExpression') propsOf(init).forEach((p) => take(p.init));
    return found;
  };
  for (const s of sources) {
    visit(s.ast, (n, stack) => {
      if (n.type !== 'ObjectExpression') return;
      const entries = propsOf(n).map((p) => ({ name: p.name, pics: picsUnder(p.init) })).filter((e) => e.pics.size && !PIC_PROP.test(e.name));
      if (entries.length < 2) return;
      for (const e of entries) {
        if (!tableKeys.has(e.name)) tableKeys.set(e.name, new Set());
        e.pics.forEach((p) => tableKeys.get(e.name).add(p));
      }
      let k = stack.length - 1;
      while (k >= 0 && WRAP.has(stack[k].type)) k--;
      if (stack[k]?.type === 'VariableDeclarator' && stack[k].id?.type === 'Identifier') tableVars.add(stack[k].id.name);
      tables.add(n);
    });
  }
  const picKey = (e) => {
    e = unwrap(e);
    if (!e) return null;
    const t = textOf(e);
    if (t && !t.includes('\u0000')) return resolvePic(t).length || tableKeys.has(t) ? t : null;
    if (e.type === 'ObjectExpression') for (const p of propsOf(e)) if (PIC_PROP.test(p.name)) { const v = textOf(p.init); if (v && !v.includes('\u0000')) return v; }
    return null;
  };
  const actName = (s) => path.basename(s.f).replace(/\.[^.]+$/, '').toLowerCase();
  // the beat of a node: its act file, or the section of a data module's top-level object it sits in (WALK.reading)
  const beatOf = (s, stack) => {
    if (s.act) return actName(s);
    for (let i = 0; i < stack.length; i++) {
      const p = stack[i];
      if (p.type !== 'VariableDeclarator') continue;
      if (p.id?.type !== 'Identifier' || unwrap(p.init)?.type !== 'ObjectExpression') return null; // only a data object has sections
      for (let k = i + 1; k < stack.length; k++) if (stack[k].type === 'ObjectProperty') { const sec = nameOf(stack[k].key); return sec ? `${p.id.name}.${sec}` : null; }
      return null;
    }
    return null;
  };
  // data sections read by an act fold into it: WALK.reading read in acts/Feed.tsx is the feed beat
  const sectionAct = new Map();
  for (const s of sources.filter((x) => x.act)) {
    visit(s.ast, (n) => {
      if (n.type === 'MemberExpression' && !n.computed && n.object?.type === 'Identifier') {
        const k = `${n.object.name}.${nameOf(n.property)}`;
        if (!sectionAct.has(k)) sectionAct.set(k, actName(s));
      }
    });
  }
  const uses = new Map(); // picture rel -> Set(beat)
  const use = (pic, beat) => { if (!beat) return; if (!uses.has(pic)) uses.set(pic, new Set()); uses.get(pic).add(sectionAct.get(beat) ?? beat); };
  for (const s of sources) {
    visit(s.ast, (n, stack) => {
      if (isSource(n, stack)) return false;
      // repeated runs: ['reef', 'reef', 'reef'], fill('reef'), Array.from({ length: 6 }, () => 'reef')
      if (n.type === 'ArrayExpression') {
        const keys = n.elements.map(picKey);
        let run = 1;
        for (let i = 1; i < keys.length; i++) {
          run = keys[i] && keys[i] === keys[i - 1] ? run + 1 : 1;
          if (run === HOUSE.runMin) add('thumb-repeat', 'error', `a list (${at(s, n)}) names "${keys[i]}" ${HOUSE.runMin}+ times running: a filmstrip or row of thumbnails shows distinct moments (kit/real.ts thumbsFrom, stripMoments)`, at(s, n));
        }
      }
      if (n.type === 'CallExpression') {
        const c = calleeText(n.callee);
        const arg = n.arguments[n.arguments.length - 1];
        let one = null;
        if (/\.fill$/.test(c) && n.arguments[0]) one = picKey(n.arguments[0]);
        if (c === 'Array.from' && isFn(arg) && arg.params.length === 0 && arg.body.type !== 'BlockStatement') one = picKey(arg.body);
        if (one) add('thumb-repeat', 'error', `${c}(...) (${at(s, n)}) repeats "${one}" in every slot: sample distinct moments (kit/real.ts thumbsFrom, stripMoments)`, at(s, n));
      }
      if (tables.has(n)) return false;
      const beat = beatOf(s, stack);
      const t = textOf(n);
      if (t && !t.includes('\u0000')) {
        for (const r of resolvePic(t)) use(r, beat);
        if (tableKeys.has(t)) for (const r of tableKeys.get(t)) use(r, beat);
      }
      if (n.type === 'MemberExpression' && n.object?.type === 'Identifier' && tableVars.has(n.object.name)) {
        const k = n.computed ? textOf(n.property) : nameOf(n.property);
        if (k && tableKeys.has(k)) for (const r of tableKeys.get(k)) use(r, beat);
      }
    });
  }
  const allBeats = new Set([...uses.values()].flatMap((b) => [...b]));
  const max = o.maxBeats ?? Math.max(HOUSE.maxBeats, Math.floor(allBeats.size / 2)); // house: half the film's beats, at least 2
  const cast = readCast([pub, project]);
  if (cast?.error) add('cast-repeat', 'warn', `${rel(cast.file)} is not JSON (${cast.error})`, rel(cast.file));
  const castOf = (r) => {
    const st = stemOf(r);
    const rule = cast?.rules.find((x) => x.re.test(st) || x.re.test(r) || x.re.test(path.posix.basename(r)));
    if (rule) return { declared: true, shoot: rule.shoot ?? st, people: rule.people, hero: rule.hero };
    return { declared: false, shoot: st.split(/[-_.]/)[0].toLowerCase(), people: [], hero: false };
  };
  const byKey = new Map();
  const byPicture = new Map(); // one picture in its forms (the still, the graded still, the clip): beach-laugh-3.5.jpg, beach-laugh.mp4
  const pictureId = (r) => stemOf(r).replace(/[-_]\d+(\.\d+)?$/, '').toLowerCase();
  for (const [r, beats] of uses) {
    const id = pictureId(r);
    if (!byPicture.has(id)) byPicture.set(id, { beats: new Set(), files: new Set() });
    beats.forEach((b) => byPicture.get(id).beats.add(b));
    byPicture.get(id).files.add(r);
    const c = castOf(r);
    if (c.hero) continue;
    for (const k of [`shoot ${c.shoot}`, ...c.people.map((p) => `person ${p}`)]) {
      if (!byKey.has(k)) byKey.set(k, { beats: new Set(), files: new Set(), declared: c.declared });
      const e = byKey.get(k);
      beats.forEach((b) => e.beats.add(b));
      e.files.add(id);
    }
  }
  for (const [id, e] of byPicture) {
    if (e.beats.size <= max || [...e.files].every((r) => castOf(r).hero)) continue;
    add('photo-repeat', 'error', `${id} (${[...e.files].slice(0, 3).join(', ')}${e.files.size > 3 ? ' ...' : ''}) is shown in ${e.beats.size} beats (${[...e.beats].join(', ')}): one picture in at most ${max}; give the other beats their own (kit/real.ts castPlan)`, id);
  }
  for (const [k, e] of byKey) {
    if (e.beats.size <= max || (e.files.size < 2 && !e.declared)) continue; // one picture alone is photo-repeat's
    add('cast-repeat', e.declared ? 'error' : 'warn', `${k}${e.declared ? '' : ' (read from the file names)'} is in ${e.beats.size} of ${allBeats.size} beats (${[...e.beats].join(', ')}; ${[...e.files].slice(0, 5).join(', ')}${e.files.size > 5 ? ' ...' : ''}): vary the cast, at most ${max} beats a shoot or person (kit/real.ts castPlan${e.declared ? '' : '; declare shoots and people in cast.json'})`, k);
  }

  // 5. numbered frame sets that are one picture
  let images = 'skipped';
  if (!o.noImages && pics.length) {
    if (!ffmpegOk()) images = 'ffmpeg not found';
    else {
      const runs = thumbRuns(pics);
      images = `${runs.length} numbered set${runs.length === 1 ? '' : 's'}`;
      for (const r of runs) if (r.run >= HOUSE.runMin)
        add('thumb-repeat', 'error', `${rel(r.set).replace('#', '*')}: frames ${r.from}-${r.to} (${r.run} of ${r.frames}) are one picture at thumbnail size (differences ${r.diffs.join(' ')} of 255): a strip of a locked-off shot reads as one still repeated; take each frame from another moment or clip (kit/real.ts thumbsFrom, stripMoments)`, rel(r.set));
    }
  }

  // 6. counters that measure one activity move together (distance counting up while the moving time stays frozen)
  coMoving(sources, { visit, unwrap, nameOf, isFn, at, add });

  // 7. the case's names and numbers agree: one request followed through the film shows the same name and the same figures
  caseAgrees(sources, { visit, unwrap, propsOf, textOf, at, add, isSource });

  return { ok: !findings.some((f) => f.severity === 'error') && !(o.strict && findings.length), src: rel(src), filmDate, dateFrom, files: files.length, pictures: pics.length, beats: allBeats.size, images, findings };
};

// ------------------------------------------------------------------------------------------------ the case
/** Edit distance between two short strings (insertions, deletions, substitutions). */
const editDistance = (a, b) => {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
};
/** Money and shares in a text: [{kind: '$' | '€' | '£' | '%', value}] ("$37", "€ 12.50", "40 %"). */
export const figuresIn = (text) => {
  const out = [];
  for (const m of String(text).matchAll(/([$€£])\s?(\d+(?:[.,]\d+)?)/g)) out.push({ kind: m[1], value: Number(m[2].replace(',', '.')), raw: m[0] });
  for (const m of String(text).matchAll(/(\d+(?:[.,]\d+)?)\s?%/g)) out.push({ kind: '%', value: Number(m[1].replace(',', '.')), raw: m[0] });
  return out;
};
/**
 * case-number (error): a string naming one of the case's names (SPINE_PLAN / src/spine.ts `case: { request, names, numbers }`)
 * shows a price or a share of the same kind as the case's numbers but another value ("Saturday Ceramics $15" while the case
 * says $12). case-name (warning): a string one or two letters off a case name ("Saturday Ceramic"): the same name, spelled
 * the same, in every act.
 */
const caseAgrees = (sources, h) => {
  let C = null;
  let caseNode = null;
  for (const s of sources) {
    h.visit(s.ast, (n) => {
      if (C || n.type !== 'ObjectExpression') return;
      const p = h.propsOf(n).find((x) => x.name === 'case' && x.init?.type === 'ObjectExpression');
      if (!p) return;
      const q = h.propsOf(p.init);
      const str = (k) => { const v = q.find((x) => x.name === k)?.init; return v ? h.textOf(v) : null; };
      const list = (k) => { const v = q.find((x) => x.name === k)?.init; return v?.type === 'ArrayExpression' ? v.elements.map((e) => (e ? h.textOf(h.unwrap(e)) : null)).filter(Boolean) : []; };
      const request = str('request');
      if (!request && !list('names').length) return;
      C = { request, names: list('names'), numbers: list('numbers'), where: h.at(s, p.node) };
      caseNode = p.init;
      return false;
    });
    if (C) break;
  }
  if (!C || (!C.names.length && !C.numbers.length)) return;
  const norm = (x) => String(x).toLowerCase().replace(/\s+/g, ' ').trim();
  const names = C.names.map(norm).filter((x) => x.length >= 3);
  // a name as whole words ("Sunday Choir" is not inside "Sunday Choirs")
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = new Map(names.map((x) => [x, new RegExp(`(^|[^\\p{L}\\p{N}])${esc(x)}($|[^\\p{L}\\p{N}])`, 'u')]));
  const figs = C.numbers.flatMap(figuresIn);
  const seenName = new Set();
  for (const s of sources) {
    h.visit(s.ast, (n, stack) => {
      if (n === caseNode || n.type === 'TSImportType' || h.isSource(n, stack)) return false;
      const t = h.textOf(n);
      if (!t) return;
      const low = norm(t);
      const named = names.filter((x) => word.get(x).test(low));
      if (named.length && figs.length) {
        for (const f of figuresIn(t)) {
          const same = figs.filter((g) => g.kind === f.kind);
          if (same.length && !same.some((g) => Math.abs(g.value - f.value) < 1e-9))
            h.add('case-number', 'error', `"${t.slice(0, 60)}" shows ${f.raw} beside the case's ${C.names.find((x) => word.get(norm(x))?.test(low))}; the case says ${same.map((g) => g.raw).join(' or ')} (${C.where}): the same figure in every act`, h.at(s, n), t);
        }
      }
      if (!named.length && low.length <= 60) {
        for (const x of names) {
          if (x.length < 6 || seenName.has(`${low}|${x}`)) continue;
          const d = editDistance(low, x);
          if (d >= 1 && d <= 2) {
            seenName.add(`${low}|${x}`);
            h.add('case-name', 'warn', `"${t}" is ${d} letter${d > 1 ? 's' : ''} off the case's name "${C.names.find((y) => norm(y) === x)}" (${C.where}): the same name, spelled the same, in every act`, h.at(s, n), t);
          }
        }
      }
    });
  }
};

// ------------------------------------------------------------------------------------------------ co-moving counters
/** The quantity a readout's text shows, from its value and its label: time, distance, elevation, steps, energy, size, percent. */
export const quantityOf = (value, label = '') => {
  const v = String(value ?? '').trim();
  const l = String(label ?? '').toLowerCase();
  if (!/\d/.test(v)) return null;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v) || /\b\d+(\.\d+)?\s?(h|hr|hrs|hours?|min|mins|minutes?|sec|secs|seconds?)\b/i.test(v) || (/\b(time|elapsed|duration|eta|remaining|left)\b/.test(l) && /^\d+(\.\d+)?\s?(m|s)?$/i.test(v))) return 'time';
  if (/\b(elevation|gain|climb|ascent|altitude|summit|height)\b/.test(l)) return 'elevation';
  if (/\d\s?ft\b/i.test(v)) return 'elevation';
  if (/\d\s?(mi|km|m|yd|miles?|kilometers?|kilometres?)\b/i.test(v) || /\bdistance\b/.test(l)) return 'distance';
  if (/\bsteps?\b/i.test(v) || /\bsteps?\b/.test(l)) return 'steps';
  if (/\b(k?cal|kj)\b/i.test(v) || /\b(calories|energy)\b/.test(l)) return 'energy';
  if (/\d\s?(kb|mb|gb|tb)\b/i.test(v)) return 'size';
  if (/\d\s?%/.test(v)) return 'percent';
  return null;
};
// a readout that names a fixed property, not the activity's running measure: it may stay still
const FIXED_LABEL = /\b(total|goal|target|summit|max|maximum|best|record|limit|plan|planned|route|next|avg|average|typical|est|estimated|size|length|of)\b/i;
/** Does a counter of quantity `a` counting up beside a still readout of quantity `b` read as broken data? */
export const coupled = (a, b) =>
  a !== b && ((b === 'time' && ['distance', 'elevation', 'steps', 'energy', 'size', 'percent'].includes(a)) || (a === 'time' && ['distance', 'steps', 'energy'].includes(b)));

/**
 * co-moving: per component, the readouts it draws (JSX children and value/text/label props), split into the ones that
 * move with the frame (built from f, frame, t, progress or useCurrentFrame()) and the ones that hold still. Their text
 * comes from literals and from the script's own strings (`ui(pair, k)` or `.ui[k]`, read per pair from the file that
 * holds `pairs: [{ ui: [...] }]`, for the pairs whose scene draws the component). A distance, a climb, steps, a size or a
 * percentage that counts while an elapsed time on the same screen stays frozen (or a running clock beside a frozen
 * distance) is the "made-up product" a paused frame gives away: one progress drives both.
 */
const coMoving = (sources, h) => {
  const { visit, unwrap, nameOf, isFn, at, add } = h;
  // the script's pairs: [{ scene, ui: [...] }]
  const pairs = [];
  for (const s of sources)
    visit(s.ast, (n) => {
      if (n.type !== 'ObjectProperty' || nameOf(n.key) !== 'pairs') return;
      const arr = unwrap(n.value);
      if (arr?.type !== 'ArrayExpression') return;
      arr.elements.forEach((el, i) => {
        el = unwrap(el);
        if (el?.type !== 'ObjectExpression') return;
        const props = Object.fromEntries(el.properties.filter((p) => p.type === 'ObjectProperty').map((p) => [nameOf(p.key), unwrap(p.value)]));
        const ui = props.ui?.type === 'ArrayExpression' ? props.ui.elements.map((x) => (x?.type === 'StringLiteral' ? x.value : x?.type === 'TemplateLiteral' && !x.expressions.length ? x.quasis[0].value.cooked : null)) : [];
        pairs.push({ k: i + 1, scene: props.scene?.type === 'StringLiteral' ? props.scene.value : null, ui });
      });
      return false;
    });
  // scene name -> component name: { distance: { draw: DistanceScene } } or { distance: DistanceScene }
  const sceneOf = new Map();
  for (const s of sources)
    visit(s.ast, (n) => {
      if (n.type !== 'ObjectProperty') return;
      const v = unwrap(n.value);
      const comp = v?.type === 'Identifier' ? v.name : v?.type === 'ObjectExpression' ? (v.properties.find((p) => p.type === 'ObjectProperty' && nameOf(p.key) === 'draw')?.value?.name ?? null) : null;
      const key = nameOf(n.key);
      if (comp && /^[A-Z]/.test(comp) && key && pairs.some((p) => p.scene === key)) {
        if (!sceneOf.has(comp)) sceneOf.set(comp, new Set());
        sceneOf.get(comp).add(key);
      }
    });
  const FRAME = /^(f|frame|t|time|local|lf|progress)$/;
  const READ_ATTR = /^(value|text|label|title|count|amount|number|stat|figure|reading|children)$/i;
  for (const s of sources) {
    // the components: a capitalised function or a const arrow/function
    const comps = [];
    visit(s.ast, (n) => {
      if (n.type === 'FunctionDeclaration' && n.id && /^[A-Z]/.test(n.id.name)) comps.push({ name: n.id.name, fn: n });
      if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && /^[A-Z]/.test(n.id.name) && isFn(unwrap(n.init))) comps.push({ name: n.id.name, fn: unwrap(n.init) });
    });
    for (const { name, fn } of comps) {
      const decl = new Map(); // local name -> init
      const moving = new Set();
      const seed = (p) => {
        if (!p) return;
        if (p.type === 'Identifier' && FRAME.test(p.name)) moving.add(p.name);
        else if (p.type === 'ObjectPattern') for (const q of p.properties) seed(q.type === 'ObjectProperty' ? q.value : q.argument);
        else if (p.type === 'AssignmentPattern') seed(p.left);
      };
      fn.params.forEach(seed);
      visit(fn.body, (n) => {
        if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && n.init) {
          decl.set(n.id.name, n.init);
          const c = unwrap(n.init);
          if (c?.type === 'CallExpression' && /useCurrentFrame$/.test(c.callee?.name ?? c.callee?.property?.name ?? '')) moving.add(n.id.name);
        }
        if (n !== fn.body && isFn(n)) return n.type === 'ArrowFunctionExpression' && n.body.type !== 'BlockStatement' ? undefined : undefined;
      });
      const refs = (e) => {
        const out = new Set();
        visit(e, (n, stack) => {
          const p = stack[stack.length - 1];
          if (n.type === 'Identifier' && !(p?.type === 'MemberExpression' && p.property === n && !p.computed) && !(p?.type === 'ObjectProperty' && p.key === n && !p.computed)) out.add(n.name);
        });
        return out;
      };
      for (let pass = 0; pass < 6; pass++)
        for (const [k, init] of decl) if (!moving.has(k) && [...refs(init)].some((r) => moving.has(r))) moving.add(k);
      const isMoving = (e) => [...refs(e)].some((r) => moving.has(r));
      // the script strings an expression reads (accessor index k) and its literals, through the locals it uses
      const sourcesOf = (e, seen = new Set()) => {
        const acc = new Set();
        const lits = [];
        visit(e, (n, stack) => {
          if (n.type === 'CallExpression') {
            const last = unwrap(n.arguments[n.arguments.length - 1]);
            if (n.callee?.type === 'Identifier' && n.callee.name === 'ui' && last?.type === 'NumericLiteral') acc.add(last.value);
          }
          if (n.type === 'MemberExpression' && n.computed && unwrap(n.property)?.type === 'NumericLiteral' && nameOf(unwrap(n.object)?.property) === 'ui') acc.add(unwrap(n.property).value);
          if ((n.type === 'StringLiteral' || n.type === 'JSXText') && /\d/.test(n.value)) {
            const p = stack[stack.length - 1];
            if (!(p?.type === 'JSXAttribute') && !(p?.type === 'CallExpression' && p.arguments[0] === n && /replace|split|padStart|toFixed/.test(p.callee?.property?.name ?? ''))) lits.push(n.value.trim());
          }
          if (n.type === 'Identifier' && decl.has(n.name) && !seen.has(n.name)) {
            seen.add(n.name);
            const r = sourcesOf(decl.get(n.name), seen);
            r.acc.forEach((x) => acc.add(x));
            lits.push(...r.lits);
          }
        });
        return { acc, lits };
      };
      // the readouts, in document order, with the plain text before each as its label
      const reads = [];
      let lastLabel = '';
      visit(fn.body, (n, stack) => {
        const p = stack[stack.length - 1];
        if (n.type === 'JSXText') {
          const t = n.value.trim();
          if (!t) return;
          if (/\d/.test(t)) reads.push({ node: n, moving: false, acc: new Set(), lits: [t], label: lastLabel });
          else lastLabel = t;
          return;
        }
        if (n.type !== 'JSXExpressionContainer' || n.expression.type === 'JSXEmptyExpression') return;
        if (p?.type === 'JSXAttribute' && !READ_ATTR.test(nameOf(p.name) ?? '')) return false;
        const e = unwrap(n.expression);
        if (e.type === 'StringLiteral' && !/\d/.test(e.value)) {
          lastLabel = e.value;
          return false;
        }
        const src = sourcesOf(e);
        const mv = isMoving(e);
        if (!src.acc.size && !src.lits.length) {
          // a counter built from the frame alone ({n.toLocaleString()} steps): its unit is the text right after it
          let unit = '';
          for (let j = stack.length - 1, child = n; j >= Math.max(0, stack.length - 3) && !unit; child = stack[j], j--) {
            const kids = stack[j].children;
            if (!kids) break;
            const next = kids.slice(kids.indexOf(child) + 1).find((c) => !(c.type === 'JSXText' && !c.value.trim()));
            if (next?.type === 'JSXText') unit = next.value.trim().split(/\s+/)[0];
            else if (next) break;
          }
          if (mv && unit && !/\d/.test(unit)) reads.push({ node: n, moving: true, acc: new Set(), lits: [`0 ${unit}`], show: `the ${unit} counter`, label: lastLabel });
          return false;
        }
        reads.push({ node: n, moving: mv, ...src, label: lastLabel });
        return false;
      });
      if (!reads.some((r) => r.moving)) continue;
      const scenes = sceneOf.get(name);
      // the pairs whose scene this component draws (all of them when it reads the script but no scene names it; none
      // when it reads no script string)
      const cands = pairs.length && reads.some((r) => r.acc.size) ? (scenes ? pairs.filter((q) => scenes.has(q.scene)) : pairs) : [{ k: 0, ui: [] }];
      for (const pr of cands) {
        const movingAcc = new Set(reads.filter((r) => r.moving).flatMap((r) => [...r.acc]));
        const val = (r) => {
          const out = [];
          for (const k of r.acc) if (pr.ui[k] != null) out.push({ v: pr.ui[k], label: k > 0 && pr.ui[k - 1] && !/\d/.test(pr.ui[k - 1]) ? pr.ui[k - 1] : r.label });
          for (const l of r.lits) out.push({ v: l, show: r.show, label: r.label });
          return out;
        };
        const counters = reads.filter((r) => r.moving).flatMap((r) => val(r).map((x) => ({ ...x, q: quantityOf(x.v, x.label), r })));
        const still = reads.filter((r) => !r.moving && ![...r.acc].some((k) => movingAcc.has(k))).flatMap((r) => val(r).map((x) => ({ ...x, q: quantityOf(x.v, x.label), r })));
        const seen = new Set();
        for (const a of counters) for (const b of still) {
          if (!a.q || !b.q || !coupled(a.q, b.q) || FIXED_LABEL.test(b.label) || seen.has(`${a.q}/${b.v}`)) continue;
          seen.add(`${a.q}/${b.v}`);
          add('co-moving', 'error', `${name}${pr.k ? ` (pair ${pr.k}${pr.scene ? `, scene ${pr.scene}` : ''})` : ''}: the ${a.q} counts (${a.show ?? a.v}) while ${b.label ? `"${b.label}" ` : ''}${b.v} (${b.q}) stays frozen on the same screen: counters that measure one activity move together; drive both from one progress (a ${b.q} that runs with the ${a.q}), or leave the frozen one out`, at(s, b.r.node), b.v);
        }
      }
    }
  }
};

// ------------------------------------------------------------------------------------------------ peaks
export const peaks = (o) => {
  const args = ['-v', 'error'];
  if (o.from) args.push('-ss', String(o.from));
  if (o.to) args.push('-to', String(o.to));
  args.push('-i', o.audio, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-');
  const r = spawnSync('ffmpeg', args, { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw Object.assign(new Error(`ffmpeg could not read ${o.audio}: ${String(r.stderr).trim().split('\n')[0]}`), { code: 2 });
  const buf = r.stdout;
  const x = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  const n = Math.max(8, Math.round(o.bars ?? 160));
  const vals = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * x.length) / n), b = Math.max(a + 1, Math.floor(((i + 1) * x.length) / n));
    let s = 0;
    for (let k = a; k < b; k++) s += x[k] * x[k];
    vals.push(Math.sqrt(s / (b - a)));
  }
  const top = Math.max(1e-9, ...vals);
  return { source: path.basename(o.audio), from: o.from ?? 0, to: o.to ?? Math.round((x.length / 8000 + (o.from ?? 0)) * 1000) / 1000, bars: n, peaks: vals.map((v) => Math.round((v / top) * 1000) / 1000) };
};

// ------------------------------------------------------------------------------------------------ main
const main = (argv) => {
  if (!argv.length || argv[0] === '-h' || argv[0] === '--help') {
    const doc = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, '');
    console.log(doc.trim());
    return argv.length ? 0 : 0;
  }
  const o = { src: 'src' };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => {
      if (i + 1 >= argv.length) throw Object.assign(new Error(`${k} needs a value`), { code: 2 });
      return argv[++i];
    };
    if (k === '--json') o.json = true;
    else if (k === '--strict') o.strict = true;
    else if (k === '--no-images') o.noImages = true;
    else if (k === '--public') o.public = val();
    else if (k === '--layout') o.layout = val();
    else if (k === '--today') o.today = val();
    else if (k === '--max-beats') o.maxBeats = Number(val());
    else if (k === '--bars') o.bars = Number(val());
    else if (k === '--from') o.from = Number(val());
    else if (k === '--to') o.to = Number(val());
    else if (k === '--out') o.out = val();
    else if (k.startsWith('-')) throw Object.assign(new Error(`unknown option ${k} (see --help)`), { code: 2 });
    else pos.push(k);
  }
  if (pos[0] === 'peaks') {
    if (!pos[1]) throw Object.assign(new Error('peaks needs an audio file'), { code: 2 });
    const p = peaks({ ...o, audio: pos[1] });
    const json = JSON.stringify(p);
    if (o.out) {
      fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      fs.writeFileSync(o.out, `${json}\n`);
      console.log(`data-check peaks: ${p.bars} bars of ${p.source} (${p.from}-${p.to} s) -> ${o.out}`);
    } else console.log(json);
    return 0;
  }
  if (pos[0]) o.src = pos[0];
  if (!fs.existsSync(o.src) || !fs.statSync(o.src).isDirectory()) throw Object.assign(new Error(`no source folder at ${o.src}`), { code: 2 });
  if (o.layout && !fs.existsSync(o.layout)) throw Object.assign(new Error(`no layout audit at ${o.layout}`), { code: 2 });
  const r = run(o);
  if (o.json) {
    console.log(JSON.stringify({ ...r, summary: { errors: r.findings.filter((f) => f.severity === 'error').length, warnings: r.findings.filter((f) => f.severity === 'warn').length } }, null, 1));
    return r.ok ? 0 : 1;
  }
  console.log(`data-check: ${r.src} (${r.files} files, the film's day ${r.filmDate} from ${r.dateFrom}; ${r.pictures} pictures in ${r.beats} beats; images: ${r.images})`);
  for (const f of r.findings) console.log(`${f.severity === 'error' ? 'error' : ' warn'}  ${f.rule}: ${f.message}`);
  const e = r.findings.filter((f) => f.severity === 'error').length, w = r.findings.length - e;
  console.log(`data-check: ${e} error${e === 1 ? '' : 's'}, ${w} warning${w === 1 ? '' : 's'}${r.ok ? '' : ': fix the data before the render (src/kit/real.ts computes it right)'}`);
  return r.ok ? 0 : 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(`data-check: ${e.message}`);
    process.exit(e.code === 2 ? 2 : 1);
  }
}
