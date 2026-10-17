/**
 * grid-check.ts: checks a film's timeline against the timing rules before anything renders.
 *
 * Imports the project's src/timeline.ts (FPS, BPM, TOTAL, ACT, CUE, COPY; optional BEAT, BAR, TAIL,
 * PACE_NAME, PACE, READ), or a HyperFrames project's timeline.js (its FILM object; PACE_NAME and
 * PACE from the timeline or the motion.js beside it), and checks, with the 60 fps numbers scaled
 * to the film's fps:
 *   beat-whole     one beat is a whole number of frames (60*FPS/BPM)
 *   acts           acts are contiguous from 0 to TOTAL with positive lengths
 *   acts-on-bar    every act starts on a bar line (warning)
 *   cue-grid       every CUE is a frame in [0, TOTAL) on the 16th grid, or its line carries a
 *                  trailing `// offgrid: <reason>` comment (or an entry in an exported OFFGRID map)
 *   copy           every COPY entry has in <= resolved <= out inside the film
 *   text-hold      resolved text holds >= max(holdMin, holdBase + holdPerWord * words) before it
 *                  leaves (calm: 60 f, or 42 f + 8 f/word; crisp: 36 f + 6 f/word); a build chain's
 *                  line holds that long for all its words after its last fragment resolves
 *   fragment       words per COPY entry: a warning above maxNewWords (calm 4, crisp 5), an error
 *                  above maxNewWords + 2 when calm (a full sentence arriving at once) or above
 *                  10 when crisp; kind: 'ui' entries are exempt
 *   copy-lines     <= 2 lines per entry (warning)
 *   copy-concurrent film words on screen at once (in <= f < out + exitDur: a leaving fragment is
 *                  still seen until its exit is over): an error above maxVisibleBuild (calm 8), or
 *                  above maxVisibleReplace (calm 5) when every entry on screen is a replace-mode
 *                  fragment; a warning when film and ui words together pass 14
 *   read-first     two film entries that are not one chain: the later one arrives only after the
 *                  earlier one, still on screen, has resolved and held its read (an error when
 *                  calm, a warning when crisp): two lines arriving together are a sentence dump
 *   reveal-rate    an entry of 3+ words revealed faster than 8 f per word, (resolved - in) /
 *                  (words - 1): a sentence dumped at once (warning)
 *   chain-gap      inside a chain (COPY entries sharing `chain`): each fragment arrives only after
 *                  the previous one has resolved and held its read (error), with a picture beat of
 *                  gapMin..gapMax frames (calm 30-90 f) after that read (shorter: an error when
 *                  calm, a warning when crisp; longer: a warning); in replace mode the previous
 *                  fragment's exit (exitDur: calm 24 f, crisp 16 f) is over >= 6 f before the next
 *                  arrives (error); a chain keeps one mode and a build chain clears at one `out`
 *   chain-beat     the picture beat between two fragments really happens: at least one CUE (or,
 *                  with --cues, a sound event other than a `text` sound) in [read, next.in) (an
 *                  error when calm, a warning when crisp)
 *   read-quiet     calm: no CUE starts inside a reading window (READ) other than a text's own
 *                  frames: what was just said is read in the quiet (warning)
 *   word-rate      film words resolving in any 5 s window <= 5 * maxWordsPerSec (calm 6), and the
 *                  body's average <= avgWordsPerSec (calm 0.9 w/s) (warnings)
 *   text-share     film copy on screen on <= textShare of the body's frames (calm 65%; a warning,
 *                  an error when calm and more than 10 points over), and every 10 s of body (all
 *                  of it, if shorter) holds a text-free run >= freeRun frames (calm 90 f): the
 *                  picture gets its turns (warning)
 *   word-total     on-screen words <= --max-words (default: the pace's maxWords, calm 30, crisp 35);
 *                  entries with kind: 'ui' (terminal commands, code, URLs, app labels the product
 *                  shows) are counted apart, not budgeted
 *   event-gap      no stretch without an event (cue, copy change, act change, or a cues.json event
 *                  with --cues) longer than --max-gap frames (default: the pace's maxGap, calm 72 f,
 *                  crisp 48 f), tail excluded. A reading window counts as alive: a hold being read
 *                  needs a slow drift, not a tick planted in it. The windows are the timeline's
 *                  READ (src/lib/pace.ts readingWindows(): from `resolved` for at most readMax, calm
 *                  150 f; an earlier fragment of a chain only for its own hold, so a chain's picture
 *                  beat is not a read; a build line once more after its last fragment), else a
 *                  cues.json copy block's `read`, else the same rule computed here. One designed
 *                  near-still hold may be declared with `export const HOLD = {from, to}` (60-96 f
 *                  at 60 fps, on the key claim under a music dropout), and gaps inside it pass
 *   tail           >= 1 s after the last cue so the audio can decay (warning)
 *   whole-bars     the body (TOTAL - TAIL) is whole bars; loops need it (warning)
 *
 * The pace: --pace calm|crisp, else the timeline's PACE_NAME, else crisp (a timeline written before
 * paces existed). The numbers come from the timeline's exported PACE (src/lib/pace.ts) when it has
 * one, so a retuned token moves the checks with the picture; otherwise from the copy below.
 *
 * Usage:
 *   npx tsx scripts/grid-check.ts [src/timeline.ts | timeline.js] [--pace calm|crisp] [--strict]
 *                                 [--json] [--max-words N] [--max-gap N] [--cues out/cues.json]
 *   Without a path: src/timeline.ts, else timeline.js. Node 22.18+ runs it without tsx too, when
 *   the timeline has no extensionless imports (a HyperFrames timeline.js):
 *   node scripts/grid-check.ts timeline.js
 *   --strict  warnings fail too.   --json  machine-readable report on stdout.
 * Exit codes: 0 pass, 1 a check failed (or a warning with --strict), 2 bad arguments / import error.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';

type Act = { from: number; dur: number };
type Copy = { id: string; text: string; in: number; resolved: number; out?: number | null; kind?: string; chain?: string; mode?: string };
type Finding = { check: string; severity: 'error' | 'warn'; message: string };
type Pace = {
  holdBase: number; holdPerWord: number; holdMin: number; readMax: number; gapMin: number; gapMax: number;
  maxNewWords: number; maxVisibleBuild: number; maxVisibleReplace: number; maxWordsPerSec: number;
  avgWordsPerSec: number; maxWords: number; textShare: number; freeRun: number; maxGap: number; exitDur: number;
};
type Windows = Record<string, [number, number][]>;

// The check numbers of src/lib/pace.ts (60 fps frames), for timelines that do not export PACE.
const BUILTIN: Record<'calm' | 'crisp', Pace> = {
  calm: { holdBase: 42, holdPerWord: 8, holdMin: 60, readMax: 150, gapMin: 30, gapMax: 90, maxNewWords: 4, maxVisibleBuild: 8, maxVisibleReplace: 5, maxWordsPerSec: 1.2, avgWordsPerSec: 0.9, maxWords: 30, textShare: 0.65, freeRun: 90, maxGap: 72, exitDur: 24 },
  crisp: { holdBase: 36, holdPerWord: 6, holdMin: 42, readMax: 120, gapMin: 18, gapMax: 90, maxNewWords: 5, maxVisibleBuild: 10, maxVisibleReplace: 10, maxWordsPerSec: 2.0, avgWordsPerSec: 1.2, maxWords: 35, textShare: 0.8, freeRun: 60, maxGap: 48, exitDur: 16 },
};

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
if (has('-h') || has('--help')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}
const valued = new Set(['--max-words', '--max-gap', '--cues', '--pace']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1]));
const tlPath = resolve(positional[0] ?? (!existsSync('src/timeline.ts') && existsSync('timeline.js') ? 'timeline.js' : 'src/timeline.ts'));
const json = has('--json');
const strict = has('--strict');

const die = (msg: string): never => {
  if (json) console.log(JSON.stringify({ tool: 'grid-check', pass: false, fatal: msg }));
  else console.error(`grid-check: ${msg}`);
  process.exit(2);
};

const wordsOf = (text: unknown) => String(text ?? '').split(/\s+/).filter(Boolean).length;

/**
 * src/lib/pace.ts readingWindows(), for a timeline that exports no READ (and no cues.json `read`):
 * the same rule, so every check reads text the same way.
 */
const readingWindows = (copy: Copy[], P: Pace, fps: number, total: number): Windows => {
  const s = fps / 60;
  const cap = Math.round(P.readMax * s);
  const hold = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const w: Windows = {};
  for (const c of copy) {
    const end = c.out ?? total;
    const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, b) => a.in - b.in) : [c];
    const last = chain[chain.length - 1];
    const next = chain[chain.indexOf(c) + 1];
    const own: [number, number] = next ? [c.resolved, Math.min(next.in, c.resolved + hold(wordsOf(c.text)), end)] : [c.resolved, Math.min(end, c.resolved + cap)];
    const line: [number, number] | null = next && (c.mode ?? 'build') === 'build' ? [last.resolved, Math.min(last.out ?? total, last.resolved + cap)] : null;
    const list: [number, number][] = line ? [own, line] : [own];
    w[String(c.id)] = list.filter(([a, b]) => b > a);
  }
  return w;
};
const isWindows = (v: unknown): v is Windows =>
  !!v && typeof v === 'object' && Object.values(v as object).every((l) => Array.isArray(l) && l.every((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite)));

/**
 * The timeline module. A Remotion timeline.ts is an ES module. A HyperFrames timeline.js is a classic
 * script that sets FILM (CommonJS under Node, so the import gives it as `default`), with PACE_NAME
 * and PACE in the motion.js beside it; one that cannot be imported (in an ES-module package) runs
 * in a vm after its motion.js, as the browser loads them.
 */
async function loadTimeline(path: string): Promise<Record<string, unknown>> {
  let T: Record<string, unknown>;
  let M: Record<string, unknown> | undefined;
  const motion = join(dirname(path), 'motion.js');
  try {
    const mod = (await import(pathToFileURL(path).href)) as Record<string, unknown>;
    T = mod.default && mod.FPS === undefined ? { ...(mod.default as object) } : mod;
  } catch (e) {
    if (!/\.c?js$/.test(path)) throw e;
    const ctx: Record<string, unknown> = {};
    ctx.window = ctx;
    createContext(ctx);
    if (existsSync(motion)) runInContext(readFileSync(motion, 'utf8'), ctx, { filename: motion });
    runInContext(readFileSync(path, 'utf8'), ctx, { filename: path });
    if (!ctx.FILM) throw e;
    T = { ...(ctx.FILM as object) };
    M = ctx.MOTION as Record<string, unknown> | undefined;
  }
  if (T.PACE_NAME === undefined && !M && existsSync(motion)) {
    try {
      M = createRequire(path)(motion) as Record<string, unknown>;
    } catch {
      /* an ES-module motion.js: the pace falls back to crisp, as for a timeline written before paces */
    }
  }
  if (T.PACE_NAME === undefined && M && typeof M.PACE_NAME === 'string') Object.assign(T, { PACE_NAME: M.PACE_NAME, PACE: T.PACE ?? M.PACE });
  return T;
}

async function main() {
  if (!existsSync(tlPath)) die(`${tlPath} not found`);
  let T: Record<string, unknown>;
  try {
    T = await loadTimeline(tlPath);
  } catch (e) {
    return die(`importing ${tlPath} failed (keep timeline.ts free of React/CSS imports): ${(e as Error).message}`);
  }
  const src = readFileSync(tlPath, 'utf8');
  const FPS = Number(T.FPS);
  const BPM = Number(T.BPM);
  const TOTAL = Number(T.TOTAL);
  const ACT = T.ACT as Record<string, Act> | undefined;
  const CUE = T.CUE as Record<string, number | number[]> | undefined;
  const COPY = (T.COPY as Copy[] | undefined) ?? [];
  for (const [k, v] of Object.entries({ FPS, BPM, TOTAL })) if (!(v > 0)) die(`timeline must export a positive number ${k}`);
  if (!ACT || typeof ACT !== 'object') die('timeline must export ACT ({name: {from, dur}})');
  if (!CUE || typeof CUE !== 'object') die('timeline must export CUE ({name: frame})');
  if (!Array.isArray(COPY)) die('COPY must be an array of {id, text, in, resolved, out}');

  const paceName = (val('--pace') ?? (typeof T.PACE_NAME === 'string' ? T.PACE_NAME : 'crisp')) as 'calm' | 'crisp';
  if (!(paceName in BUILTIN)) die(`--pace must be calm or crisp (got ${paceName})`);
  const exported = (T.PACE as Record<string, Partial<Pace>> | undefined)?.[paceName];
  const P: Pace = { ...BUILTIN[paceName], ...(exported ?? {}) };

  const s = FPS / 60; // the 60 fps rules, scaled to this film
  const maxWords = Number(val('--max-words') ?? P.maxWords);
  const maxGap = Number(val('--max-gap') ?? Math.round(P.maxGap * s));
  const BEAT = (60 / BPM) * FPS;
  const BAR = BEAT * 4;
  const S16 = BEAT / 4;
  const TAIL = T.TAIL !== undefined ? Number(T.TAIL) : 0;
  const bodyEnd = TOTAL - TAIL;
  const out: Finding[] = [];
  const err = (check: string, message: string) => out.push({ check, severity: 'error', message });
  const warn = (check: string, message: string) => out.push({ check, severity: 'warn', message });

  // Off-grid reasons: `name: value, // offgrid: why` on the declaring line, or export OFFGRID = {name: 'why'}.
  const offgrid = new Map<string, string>();
  for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:.*\/\/.*\boffgrid:\s*(.+)$/gm)) offgrid.set(m[1], m[2].trim());
  for (const [k, v] of Object.entries((T.OFFGRID as Record<string, string>) ?? {})) offgrid.set(k, String(v));

  // --- beat
  if (Math.abs(BEAT - Math.round(BEAT)) > 1e-9) {
    const ok = [];
    for (let b = 60; b <= 200; b++) if (Number.isInteger((60 / b) * FPS)) ok.push(b);
    err('beat-whole', `a beat is ${BEAT.toFixed(3)} f at ${BPM} BPM / ${FPS} fps; use a BPM with whole beats: ${ok.join(', ')}`);
  }
  if (T.BEAT !== undefined && Math.abs(Number(T.BEAT) - BEAT) > 1e-9) err('beat-whole', `exported BEAT ${T.BEAT} != 60/BPM*FPS = ${BEAT}`);
  if (T.BAR !== undefined && Math.abs(Number(T.BAR) - BAR) > 1e-9) err('beat-whole', `exported BAR ${T.BAR} != 4 beats = ${BAR}`);

  // --- acts
  const acts = Object.entries(ACT!).sort((a, b) => a[1].from - b[1].from);
  let at = 0;
  for (const [name, a] of acts) {
    if (!(a.dur > 0)) err('acts', `ACT.${name} has dur ${a.dur}`);
    if (a.from !== at) err('acts', `ACT.${name} starts at ${a.from}, expected ${at} (${a.from > at ? 'gap' : 'overlap'} of ${Math.abs(a.from - at)} f)`);
    const off = Math.abs(a.from - Math.round(a.from / BAR) * BAR);
    if (off > 0.5 && !offgrid.has(name)) warn('acts-on-bar', `ACT.${name} starts at ${a.from}, ${off.toFixed(1)} f off a bar line`);
    at = a.from + a.dur;
  }
  if (acts.length && at !== TOTAL) err('acts', `acts end at ${at} but TOTAL is ${TOTAL}`);

  // --- cues
  const cueFrames: { name: string; f: number }[] = [];
  for (const [name, v] of Object.entries(CUE!)) {
    const list = Array.isArray(v) ? v : [v];
    list.forEach((f, i) => {
      const label = Array.isArray(v) ? `${name}[${i}]` : name;
      if (typeof f !== 'number' || !Number.isFinite(f)) return err('cue-grid', `CUE.${label} is not a frame number (${f})`);
      if (!Number.isInteger(f)) err('cue-grid', `CUE.${label} = ${f} is fractional; cues are whole frames`);
      if (f < 0 || f >= TOTAL) err('cue-grid', `CUE.${label} = ${f} is outside the film [0, ${TOTAL})`);
      const off = Math.abs(f - Math.round(f / S16) * S16);
      if (off > 0.5 + 1e-9 && !offgrid.has(name))
        err('cue-grid', `CUE.${label} = ${f} is ${off.toFixed(2)} f off the 16th grid (${S16} f); snap it with b() or add "// offgrid: <reason>"`);
      cueFrames.push({ name: label, f });
    });
  }

  // --- copy: one entry at a time
  let words = 0;
  let uiWords = 0;
  const holdNeed = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const fragErr = paceName === 'calm' ? P.maxNewWords + 2 : 10;
  const valid: (Copy & { out: number; n: number; ui: boolean })[] = [];
  for (const c of COPY) {
    const id = c.id ?? '?';
    const n = wordsOf(c.text);
    const ui = c.kind === 'ui'; // product strings: a typed command, code, a URL, an app label
    if (ui) uiWords += n;
    else words += n;
    const o = c.out ?? TOTAL;
    if (![c.in, c.resolved, o].every(Number.isFinite)) {
      err('copy', `COPY ${id}: in/resolved/out must be frames`);
      continue;
    }
    if (!(c.in <= c.resolved && c.resolved <= o)) err('copy', `COPY ${id}: needs in <= resolved <= out (got ${c.in}, ${c.resolved}, ${o}); unresolved text never exits`);
    if (c.in < 0 || o > TOTAL) err('copy', `COPY ${id}: [${c.in}, ${o}] is outside the film [0, ${TOTAL}]`);
    valid.push({ ...c, out: o, n, ui });
    const hold = o - c.resolved;
    if (hold < holdNeed(n) && ui) warn('text-hold', `COPY ${id} (ui) "${c.text}" holds ${hold} f resolved; ${n} word(s) want >= ${holdNeed(n)} f if it must be read`);
    else if (hold < holdNeed(n)) err('text-hold', `COPY ${id} "${c.text}" holds ${hold} f resolved; ${n} word(s) need >= ${holdNeed(n)} f`);
    if (ui) continue; // UI strings keep the product's own layout
    if (n > fragErr) err('fragment', `COPY ${id} "${c.text}" shows ${n} words at once; a thought longer than ${P.maxNewWords} words arrives as a chain of fragments (timeline.ts chain())`);
    else if (n > P.maxNewWords) warn('fragment', `COPY ${id} "${c.text}" has ${n} words; a fragment holds 1-${P.maxNewWords} (split it into a chain)`);
    const lines = String(c.text).split('\n');
    if (lines.length > 2) warn('copy-lines', `COPY ${id}: ${lines.length} lines on screen at once (keep <= 2)`);
    const rate = (c.resolved - c.in) / Math.max(1, n - 1);
    if (n >= 3 && rate < 8 * s) warn('reveal-rate', `COPY ${id} "${c.text}" reveals ${n} words in ${c.resolved - c.in} f (${rate.toFixed(1)} f per word < ${8 * s}): a block, not a read; stagger the words or split the line`);
  }
  if (words > maxWords) err('word-total', `${words} on-screen words; the budget is ${maxWords} (--max-words). Typed commands, code, URLs and app labels belong in COPY with kind: 'ui' and are not budgeted`);

  // --- reading windows: the timeline's READ, else the cues.json copy block's `read`, else the same rule here
  const fromCues = (() => {
    const p = val('--cues');
    if (!p || !existsSync(p)) return null;
    const w: Windows = {};
    for (const c of JSON.parse(readFileSync(p, 'utf8')).copy ?? []) if (isWindows({ x: c.read })) w[String(c.id)] = c.read;
    return Object.keys(w).length ? w : null;
  })();
  const READ: Windows = isWindows(T.READ) ? (T.READ as Windows) : (fromCues ?? readingWindows(valid, P, FPS, TOTAL));

  // --- chains: fragments of one thought
  const chains = new Map<string, typeof valid>();
  for (const c of valid) if (c.chain) chains.set(c.chain, [...(chains.get(c.chain) ?? []), c]);
  const exitF = Math.round(P.exitDur * s); // a leaving entry is seen until its exit is over
  const calm = paceName === 'calm';
  const sev = (check: string, message: string) => (calm ? err : warn)(check, message);
  const soundEvents: { f: number; kind: string }[] = [];
  const cuesPath = val('--cues');
  let cuesDoc: { events?: { f: number; kind?: string }[]; copy?: { id: string; read?: unknown }[] } | null = null;
  if (cuesPath) {
    if (!existsSync(cuesPath)) die(`--cues ${cuesPath} not found (run npx tsx scripts/export-cues.ts)`);
    cuesDoc = JSON.parse(readFileSync(cuesPath, 'utf8'));
    for (const e of cuesDoc!.events ?? []) if (Number.isFinite(e.f)) soundEvents.push({ f: e.f, kind: String(e.kind ?? '') });
  }
  for (const [name, list] of chains) {
    list.sort((a, b) => a.in - b.in);
    const modes = new Set(list.map((c) => c.mode ?? 'build'));
    if (modes.size > 1) err('chain-gap', `chain ${name} mixes modes (${[...modes].join(', ')}); a chain either builds one line or replaces in place`);
    const mode = list[0].mode ?? 'build';
    if (mode === 'build') {
      const outs = new Set(list.map((c) => c.out));
      if (outs.size > 1) err('chain-gap', `build chain ${name} leaves at ${[...outs].join(', ')}; a built line clears as a whole (one out for every fragment)`);
      const last = list[list.length - 1];
      const total = list.reduce((n, c) => n + c.n, 0);
      if (list.length > 1 && last.out - last.resolved < holdNeed(total))
        err('text-hold', `build chain ${name} holds ${last.out - last.resolved} f after its last fragment; its ${total} words need >= ${holdNeed(total)} f`);
    }
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1], list[i]];
      const read = a.resolved + holdNeed(a.n);
      const gap = b.in - read;
      if (gap < 0) err('chain-gap', `${b.id} arrives at f${b.in}, ${-gap} f before ${a.id} has been read (resolved f${a.resolved} + ${holdNeed(a.n)} f)`);
      else if (gap < Math.round(P.gapMin * s)) sev('chain-gap', `${a.id} -> ${b.id}: ${gap} f of picture between the read and the next fragment; give the picture its beat (${Math.round(P.gapMin * s)}-${Math.round(P.gapMax * s)} f)`);
      else if (gap > Math.round(P.gapMax * s)) warn('chain-gap', `${a.id} -> ${b.id}: ${gap} f between the read and the next fragment; past ${Math.round(P.gapMax * s)} f the thought breaks in two`);
      if (gap >= Math.round(P.gapMin * s)) {
        // the picture beat must be something the picture does: a cue, or a sound that is not a text sound
        const beat = cueFrames.some((c) => c.f >= read && c.f < b.in) || soundEvents.some((e) => e.kind !== 'text' && e.f >= read && e.f < b.in);
        if (!beat)
          sev('chain-beat', `${a.id} -> ${b.id}: nothing happens between the read (f${read}) and the next fragment (f${b.in}): no CUE${cuesPath ? ' and no sound other than text' : ''} there. The picture takes its turn between fragments (the product does what the fragment set up): give it a cue`);
      }
      const clear = Math.round((P.exitDur + 6) * s);
      if (mode === 'replace' && b.in < a.out + clear)
        err('chain-gap', `replace chain ${name}: ${b.id} arrives at f${b.in} while ${a.id} is still leaving (out f${a.out} + a ${exitF} f exit); start it >= ${clear} f after ${a.id}'s out, so its exit is over first`);
    }
  }

  // --- separate entries that arrive together (not one chain): the earlier one is read first
  const film = valid.filter((c) => !c.ui);
  const byIn = [...film].sort((a, b) => a.in - b.in);
  for (let i = 0; i < byIn.length; i++)
    for (let j = i + 1; j < byIn.length; j++) {
      const [a, b] = [byIn[i], byIn[j]];
      if (a.chain && a.chain === b.chain) continue; // chain-gap checks a chain's own fragments
      if (b.in >= a.out) continue; // a has left before b arrives
      const read = a.resolved + holdNeed(a.n);
      if (b.in < read)
        sev('read-first', `${b.id} "${b.text}" arrives at f${b.in} while ${a.id} "${a.text}" is on screen and not yet read (resolved f${a.resolved} + ${holdNeed(a.n)} f): two lines at once read as one sentence dumped. Write them as one chain() so they take turns, or bring ${b.id} in after f${read}`);
    }

  // --- what is on screen, frame by frame (film copy; ui counted apart)
  let maxVisible = 0;
  let worst: { f: number; ids: string[]; n: number; limit: number } | null = null;
  let textFrames = 0;
  let maxBoth = 0;
  const free: boolean[] = [];
  for (let f = 0; f < TOTAL; f++) {
    const on = film.filter((c) => c.in <= f && f < c.out); // on screen until its exit begins (text-share)
    const seen = film.filter((c) => c.in <= f && f < c.out + exitF); // ... and until its exit is over (concurrency)
    const n = seen.reduce((m, c) => m + c.n, 0);
    const both = n + valid.filter((c) => c.ui && c.in <= f && f < c.out + exitF).reduce((m, c) => m + c.n, 0);
    const limit = seen.length && seen.every((c) => c.mode === 'replace') ? P.maxVisibleReplace : P.maxVisibleBuild;
    maxVisible = Math.max(maxVisible, n);
    maxBoth = Math.max(maxBoth, both);
    if (n > limit && (!worst || n - limit > worst.n - worst.limit)) worst = { f, ids: seen.map((c) => c.id), n, limit };
    if (f < bodyEnd) {
      if (on.length) textFrames++;
      free.push(!on.length);
    }
  }
  if (worst) err('copy-concurrent', `${worst.n} film words on screen at f${worst.f} (${worst.ids.join(', ')}); at most ${worst.limit} at once: one fragment at a time`);
  if (maxBoth > 14) warn('copy-concurrent', `up to ${maxBoth} words (film copy and ui) readable at once; past 14 the frame reads as a page`);

  // --- copy rate and text share
  const win5 = Math.round(5 * FPS);
  const resolves = film.map((c) => ({ f: c.resolved, n: c.n })).sort((a, b) => a.f - b.f);
  let peak = { n: 0, f: 0 };
  for (const r of resolves) {
    const n = resolves.filter((x) => x.f >= r.f && x.f < r.f + win5).reduce((m, x) => m + x.n, 0);
    if (n > peak.n) peak = { n, f: r.f };
  }
  const maxIn5 = Math.round(5 * P.maxWordsPerSec);
  if (peak.n > maxIn5) warn('word-rate', `${peak.n} film words resolve in the 5 s from f${peak.f}; keep <= ${maxIn5} (${P.maxWordsPerSec} w/s): fewer words, or let the picture take the time`);
  const bodySec = bodyEnd / FPS;
  const avg = bodySec > 0 ? words / bodySec : 0;
  if (avg > P.avgWordsPerSec) warn('word-rate', `${avg.toFixed(2)} film words per second over the body; keep <= ${P.avgWordsPerSec}`);
  const share = bodyEnd > 0 ? textFrames / bodyEnd : 0;
  if (film.length && share > P.textShare)
    (calm && share > P.textShare + 0.1 ? err : warn)('text-share', `film copy is on screen on ${(100 * share).toFixed(1)}% of the body; keep <= ${Math.round(100 * P.textShare)}%: give the picture beats with no copy`);
  // the longest text-free run inside every 10 s window of the body (the whole body when shorter)
  const freeNeed = Math.round(P.freeRun * s);
  const win10 = Math.min(bodyEnd, Math.round(10 * FPS));
  const runIn = (a: number, b: number) => {
    let best = 0;
    let cur = 0;
    for (let f = a; f < b; f++) best = Math.max(best, (cur = free[f] ? cur + 1 : 0));
    return best;
  };
  let longestFree = runIn(0, bodyEnd);
  if (film.length && freeNeed > 0 && win10 > 0) {
    for (let a = 0; a + win10 <= bodyEnd; a += Math.max(1, Math.round(FPS / 2))) {
      const run = runIn(a, a + win10);
      if (run < freeNeed) {
        warn('text-share', `no text-free stretch of ${freeNeed} f between f${a} and f${a + win10} (longest ${run} f): every 10 s needs a picture beat with no copy`);
        break;
      }
    }
  }

  // --- event gaps (the tail is for the audio to decay, so it is excluded)
  const events = new Set<number>([0, bodyEnd]);
  // One designed near-still hold per film (the key claim, under a music dropout) may run past the gap limit.
  const HOLD = T.HOLD as { from: number; to: number } | undefined;
  const holdMax = Math.round(96 * s);
  let hold: { from: number; to: number } | null = null;
  if (HOLD !== undefined) {
    if (!HOLD || !Number.isFinite(HOLD.from) || !Number.isFinite(HOLD.to) || HOLD.to <= HOLD.from) {
      err('hold', 'HOLD must be {from, to} frames with to > from');
    } else if (HOLD.to - HOLD.from > holdMax) {
      err('hold', `HOLD runs ${HOLD.to - HOLD.from} f; a designed hold is at most ${holdMax} f (96 f at 60 fps)`);
    } else {
      hold = HOLD;
      events.add(HOLD.from);
      events.add(HOLD.to);
    }
  }
  for (const c of cueFrames) events.add(c.f);
  for (const [, a] of acts) events.add(a.from);
  for (const c of valid) for (const f of [c.in, c.resolved, c.out]) events.add(f);
  for (const e of soundEvents) events.add(Math.round(e.f));
  // Reading windows: a resolved line being read is alive, so it fills the gap it sits in.
  const reading = Object.values(READ).flat();
  const uncovered = (a: number, b: number) => {
    // the longest run of frames in (a, b) that no reading window covers
    let best = 0;
    let cur = 0;
    for (let f = a + 1; f < b; f++) best = Math.max(best, (cur = reading.some(([x, y]) => f >= x && f < y) ? 0 : cur + 1));
    return best + 1; // + 1: a run of k uncovered frames between two events spans k + 1 frame steps
  };
  const ev = [...events].filter((f) => f >= 0 && f <= bodyEnd).sort((a, b) => a - b);
  let longestGap = 0;
  for (let i = 1; i < ev.length; i++) {
    const gap = ev[i] - ev[i - 1];
    if (hold && ev[i - 1] >= hold.from && ev[i] <= hold.to) continue; // the declared hold
    const live = gap > maxGap ? uncovered(ev[i - 1], ev[i]) : gap;
    longestGap = Math.max(longestGap, Math.min(gap, live));
    if (gap > maxGap && live > maxGap) {
      const near = cueFrames.filter((c) => c.f === ev[i - 1] || c.f === ev[i]).map((c) => c.name);
      err('event-gap', `${live} f without an event or a line being read between f${ev[i - 1]} and f${ev[i]}${near.length ? ` (${near.join(', ')})` : ''}; add the beat that keeps it alive (a move, a peak, a drift under a read) or --max-gap`);
    }
  }

  // --- read-quiet: nothing new starts while a fragment is read (calm)
  if (calm) {
    const textFrames = new Set(valid.flatMap((c) => [c.in, c.resolved, c.out]));
    const loud = new Set<string>();
    for (const c of valid) {
      if (c.ui) continue;
      for (const [a, b] of READ[String(c.id)] ?? [])
        for (const q of cueFrames)
          if (q.f >= a && q.f < b && q.f < bodyEnd && !textFrames.has(q.f) && !loud.has(q.name)) {
            loud.add(q.name);
            warn('read-quiet', `CUE.${q.name} (f${q.f}) starts while ${c.id} "${c.text}" is being read (f${a}-${b}): nothing new starts during a reading hold; move it after the read, where the picture takes its turn`);
          }
    }
  }

  // --- tail and bars
  const lastCue = cueFrames.reduce((m, c) => Math.max(m, c.f), 0);
  if (TOTAL - lastCue < FPS) warn('tail', `only ${TOTAL - lastCue} f after the last cue; leave >= ${FPS} f (1 s) for the audio to decay`);
  if (T.TAIL !== undefined && TAIL < FPS) warn('tail', `TAIL is ${TAIL} f; use >= ${FPS} f (1 s)`);
  if (Math.abs(bodyEnd / BAR - Math.round(bodyEnd / BAR)) > 1e-6) warn('whole-bars', `the body (TOTAL - TAIL = ${bodyEnd} f) is ${(bodyEnd / BAR).toFixed(2)} bars; whole bars loop and end cleanly`);

  // --- report
  const errors = out.filter((x) => x.severity === 'error').length;
  const warnings = out.length - errors;
  const pass = errors === 0 && !(strict && warnings > 0);
  const summary = {
    fps: FPS,
    bpm: BPM,
    beat: BEAT,
    bar: BAR,
    total: TOTAL,
    seconds: +(TOTAL / FPS).toFixed(3),
    acts: acts.length,
    cues: cueFrames.length,
    pace: paceName,
    words,
    uiWords,
    maxWords,
    maxVisible,
    wordsPerSec: +avg.toFixed(2),
    peakWordsIn5s: peak.n,
    textShare: +share.toFixed(3),
    longestTextFree: longestFree,
    maxGap,
    longestGap,
  };
  if (json) console.log(JSON.stringify({ tool: 'grid-check', timeline: tlPath, pass, errors, warnings, summary, findings: out }, null, 1));
  else {
    for (const f of out) console.log(`${f.severity === 'error' ? 'FAIL' : 'warn'}  ${f.check}  ${f.message}`);
    console.log(
      `grid-check: ${summary.seconds} s, ${BPM} BPM @ ${FPS} fps (beat ${BEAT} f, bar ${BAR} f), ${paceName} pace, ${summary.acts} acts, ${summary.cues} cues, ` +
        `${words}/${maxWords} words${uiWords ? ` (+${uiWords} ui)` : ''}, <= ${maxVisible} on screen, ${summary.wordsPerSec} w/s, ` +
        `text on ${Math.round(100 * share)}% (longest text-free ${longestFree} f), longest gap ${longestGap}/${maxGap} f -> ${pass ? 'pass' : 'FAIL'} (${errors} errors, ${warnings} warnings)`,
    );
  }
  process.exit(pass ? 0 : 1);
}

main();
