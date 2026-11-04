/**
 * export-cues.ts: writes out/cues.json, the contract between the picture and the soundtrack.
 *
 * It imports the project's timeline (FPS, BPM, TOTAL, ACT, CUE, COPY, PACE_NAME, READ) and the default
 * export of src/sync.ts: a function cues() that returns sound events computed from the same
 * constants, springs and easings the acts animate with. Sync points are computed, never typed.
 *
 * Usage (from the project root):
 *   npx tsx scripts/export-cues.ts [--sync src/sync.ts] [--timeline src/timeline.ts]
 *                                  [--out out/cues.json] [--allow-unknown] [--quiet]
 *
 * Output schema:
 *   { fps, bpm, total, width?, height?, pace?, acts: {name: {from, dur}}, cue: {name: frame},
 *     copy: [{ id, text, in, resolved, out, words, kind, chain?, mode?, read: [[from, to], ...] }],
 *     events: [{ f, kind, weight, pan, pitch?, apexFrac?, dur?, variant?, action?, id?,
 *                structural?, force?, offset_ms?, salience? }],
 *     look?:     { blur, texture, filmType, oneTake, whiteWorld, palette? }  (palette 'mono': look-audit's colour-mass floor asks for the accent on its beats),
 *     declared?: { seams, stepped, flashes, cameraBlur, colour, shots, stages, end, reveal, springClass, structural,
 *                  fx: [{ id, seams, stepped, flashes, cameraBlur, colour, shots, stages }] },
 *     salience?: { cueName: 'copy' | 'hit' | 'cut' | 'move' | 'life' },
 *     spine?:    the timeline's SPINE_PLAN (lib/spine.ts planSpine), as plain data,
 *     music?:    { bpm, beatS, fps, t0, bars, phraseLen?, downbeats, accents, phrases?, sections?,
 *                  entries, breaks?, stops, end } }
 * f is the absolute frame the sound belongs on (fractional allowed), weight 0..2 (1 = normal),
 * pan -1..1, pitch a MIDI number or a note name such as "Eb6", apexFrac (whoosh, suck) the point
 * of the sound that lands on f (0..1; 0 or 1 is clamped for a whoosh or suck, kept for a riser or swell),
 * dur a length in frames; action what the picture does (scripts/audio/actions.py: card-land, click, toggle,
 * a logo lock ...), which kit.py cast voices with the action's own sound (else the words of the id). See references/sound.md. Kind `text` is
 * the one soft sound of a copy fragment landing (fx/Chain chainResolves()), never one per word.
 * structural: true marks an act or section change, the reveal or the ending, which must land on a
 * music event; force: true sounds the event even when a track accent carries the moment;
 * offset_ms (-500..500) overrides the kit role's offset for this one event; salience says what the
 * moment asks of the eye (read-quiet guards copy, hit and cut; life may run during a read).
 * `look`, `declared` and `salience` come from the timeline's optional exports (LOOK, SEAMS, STEPPED,
 * FLASHES, CAMERA_BLUR, COLOUR, SHOTS, STAGES, END, REVEAL, SPRING_CLASS, STRUCTURAL, SALIENCE) and are written only when
 * the timeline has them; `declared.fx` is what the primitives declare about themselves (src/sync.ts
 * `declares()`, each fx's declares(props, film)), which the timeline's declarations must cover
 * (grid-check). `music` is the timeline's MUSIC (src/music.ts, written by track.py grid), passed
 * through when it is set; every frame in it is a film frame.
 * `copy` is the timeline's COPY (every on-screen string with its frames). Each entry's `read` lists
 * the frames in which it is being read, half-open [from, to) ranges: the timeline's READ
 * (src/lib/pace.ts readingWindows(): from `resolved` for at most the pace's readMax, an earlier
 * fragment of a chain only for its own hold, a build line once more after its last fragment), or
 * the same rule computed here for a timeline that does not export READ. forensics.py,
 * measure-speed.py and grid-check --cues read these windows, and `pace` (the timeline's
 * PACE_NAME) sets their calm or crisp thresholds.
 *
 * Exit codes: 0 written, 1 import failure or invalid events (nothing is written).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const KINDS = [
  'tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop',
  'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text',
] as const;
export type Kind = (typeof KINDS)[number];

export type SoundEvent = {
  f: number;
  kind: Kind | string;
  weight?: number;
  pan?: number;
  pitch?: number | string;
  apexFrac?: number;
  dur?: number;
  variant?: string;
  action?: string;
  id?: string;
  structural?: true;
  force?: true;
  offset_ms?: number;
  salience?: Salience;
};

export const SALIENCES = ['copy', 'hit', 'cut', 'move', 'life'] as const;
export type Salience = (typeof SALIENCES)[number];
export const SEAM_KINDS = [
  'velocity', 'morph', 'hard', 'mask', 'whip', 'defocus', 'light', 'snapZoom', 'breath',
  'zoomThrough', 'stepped', 'colour', 'dissolveUi', 'fadeEnd', 'wipe',
] as const;

const FIELDS = new Set(['f', 'kind', 'weight', 'pan', 'pitch', 'apexFrac', 'dur', 'variant', 'action', 'id', 'structural', 'force', 'offset_ms', 'salience']);

// The hold and read numbers of src/lib/pace.ts, for a timeline that exports neither READ nor PACE.
type ReadPace = { holdBase: number; holdPerWord: number; holdMin: number; readMax: number };
// <gen-pace>
const READ_PACE: Record<string, ReadPace> = {
  calm: { holdBase: 36, holdPerWord: 7, holdMin: 52, readMax: 150 },
  crisp: { holdBase: 28, holdPerWord: 6, holdMin: 36, readMax: 120 },
};
// </gen-pace>
type Windows = Record<string, [number, number][]>;
const wordsOf = (t: string) => String(t).split(/\s+/).filter(Boolean).length;
/** src/lib/pace.ts readingWindows(), for timelines written before it existed: the same rule. */
const readingWindows = (copy: { id: string; text: string; in: number; resolved: number; out: number; chain?: string; mode?: string }[], P: ReadPace, fps: number): Windows => {
  const s = fps / 60;
  const cap = Math.round(P.readMax * s);
  const hold = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const w: Windows = {};
  for (const c of copy) {
    const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, b) => a.in - b.in) : [c];
    const last = chain[chain.length - 1];
    const next = chain[chain.indexOf(c) + 1];
    const own: [number, number] = next ? [c.resolved, Math.min(next.in, c.resolved + hold(wordsOf(c.text)), c.out)] : [c.resolved, Math.min(c.out, c.resolved + cap)];
    const line: [number, number] | null = next && (c.mode ?? 'build') === 'build' ? [last.resolved, Math.min(last.out, last.resolved + cap)] : null;
    w[c.id] = (line ? [own, line] : [own]).filter(([a, b]) => b > a);
  }
  return w;
};
const isWindows = (v: unknown): v is Windows =>
  !!v && typeof v === 'object' && Object.values(v as object).every((l) => Array.isArray(l) && l.every((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite)));
const NOTE = /^[A-Ga-g][#b]{0,2}-?\d$/;

// ---- declarations (timeline LOOK, SEAMS, STEPPED, FLASHES, CAMERA_BLUR, END, REVEAL, SPRING_CLASS,
// STRUCTURAL, SALIENCE and the primitives' own declares()). Shapes are checked here so cues.json is
// well formed; whether they make sense in the film (inside acts, lengths, coverage) is grid-check's.
type Range = { from: number; to: number; id: string };
type Decl = {
  // v / ratio: a velocity seam's speed in the code (px per frame at 1080p on the cut frame, carriedCut's vCut) and the
  // incoming first step over it (house 0.7); forensics.py carried-cut prints them beside the speed it reads in pixels
  // handover, hid, element, forms, span, swap, boundary, act, track: a spine or handover seam (lib/spine spineDeclares, lib/handover
  // handoverDeclares): which handover carries the change and the element's box [f, x, y, w, h] (composition px) on every frame
  seams: { at: number; kind: string; carry?: string; dir?: number; signature?: boolean; id?: string; v?: number; ratio?: number; handover?: string; hid?: string; element?: string; forms?: string[]; span?: number[]; swap?: number; boundary?: boolean; act?: number; track?: number[][] }[];
  stepped: (Range & { fps?: number; on?: number })[];
  flashes: { f: number; frames: number; id: string }[];
  cameraBlur: Range[];
  colour: Range[]; // colour events (a deep field, an accent flood, a colour cut): look-audit pauses its colour ceilings
  // the depth stage's declared camera moves and the stages that declare them (fx/depth shotDeclares): forensics
  // camera-wander takes a declared shot as a purposeful move and a move inside a stage outside every shot as a drift
  shots: (Range & { kind: string })[];
  stages: Range[];
};
const isFrame = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** One Declares-shaped object (timeline exports or one fx instance) into plain JSON, collecting errors. */
const normDecl = (src: Record<string, unknown>, where: string, errors: string[], names = { seams: 'seams', stepped: 'stepped', flashes: 'flashes', cameraBlur: 'cameraBlur', colour: 'colour', shots: 'shots', stages: 'stages' }): Decl => {
  const list = (k: keyof typeof names): Record<string, unknown>[] => {
    const v = src[names[k]];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) { errors.push(`${where} ${names[k]} must be an array`); return []; }
    return v as Record<string, unknown>[];
  };
  const seams = list('seams').flatMap((s, i) => {
    const at = `${where} ${names.seams}[${i}]`;
    if (!s || !isFrame(s.at)) { errors.push(`${at}: at must be a frame`); return []; }
    if (!SEAM_KINDS.includes(s.kind as (typeof SEAM_KINDS)[number])) { errors.push(`${at}: kind "${s.kind}" is not one of ${SEAM_KINDS.join(', ')}`); return []; }
    if (s.dir !== undefined && s.dir !== 1 && s.dir !== -1) errors.push(`${at}: dir must be 1 or -1`);
    const o: Decl['seams'][number] = { at: s.at, kind: String(s.kind) };
    if (s.carry !== undefined) o.carry = String(s.carry);
    if (s.dir !== undefined) o.dir = Number(s.dir);
    if (s.signature) o.signature = true;
    if (s.id !== undefined) o.id = String(s.id);
    for (const k of ['v', 'ratio'] as const) {
      if (s[k] === undefined) continue;
      if (typeof s[k] !== 'number' || !Number.isFinite(s[k]) || (s[k] as number) <= 0) errors.push(`${at}: ${k} must be a positive number (px per frame at 1080p for v)`);
      else o[k] = s[k] as number;
    }
    if (typeof s.handover === 'string') o.handover = s.handover;
    if (typeof s.hid === 'string') o.hid = s.hid;
    if (typeof s.element === 'string') o.element = s.element;
    if (Array.isArray(s.forms) && s.forms.length === 2) o.forms = (s.forms as unknown[]).map(String);
    if (Array.isArray(s.span) && s.span.length === 2 && (s.span as unknown[]).every(isFrame)) o.span = s.span as number[];
    if (isFrame(s.swap)) o.swap = s.swap;
    if (typeof s.boundary === 'boolean') o.boundary = s.boundary;
    if (isFrame(s.act)) o.act = s.act;
    if (s.track !== undefined) {
      if (Array.isArray(s.track) && (s.track as unknown[]).every((x) => Array.isArray(x) && x.length === 5 && x.every(isFrame))) o.track = s.track as number[][];
      else errors.push(`${at}: track must be [[f, x, y, w, h], ...]`);
    }
    return [o];
  });
  const range = (k: 'stepped' | 'cameraBlur' | 'colour') => list(k).flatMap((r, i) => {
    const at = `${where} ${names[k]}[${i}]`;
    if (!r || !isFrame(r.from) || !isFrame(r.to)) { errors.push(`${at}: from and to must be frames`); return []; }
    if (!(r.to > r.from)) errors.push(`${at}: to (${r.to}) must be after from (${r.from})`);
    const o: Range & { fps?: number; on?: number } = { from: r.from, to: r.to, id: String(r.id ?? `${names[k]}${i}`) };
    if (k === 'stepped') {
      if (r.fps !== undefined) { if (![12, 16, 20, 30].includes(Number(r.fps))) errors.push(`${at}: fps must be 12, 16, 20 or 30`); o.fps = Number(r.fps); }
      if (r.on !== undefined) { if (![2, 3].includes(Number(r.on))) errors.push(`${at}: on must be 2 or 3`); o.on = Number(r.on); }
    }
    return [o];
  });
  const flashes = list('flashes').flatMap((x, i) => {
    const at = `${where} ${names.flashes}[${i}]`;
    if (!x || !isFrame(x.f)) { errors.push(`${at}: f must be a frame`); return []; }
    if (x.frames !== 1 && x.frames !== 2) errors.push(`${at}: frames must be 1 or 2`);
    return [{ f: x.f, frames: Number(x.frames), id: String(x.id ?? `flash${i}`) }];
  });
  const moves = (k: 'shots' | 'stages') => list(k).flatMap((r, i) => {
    const at = `${where} ${names[k]}[${i}]`;
    if (!r || !isFrame(r.from) || !isFrame(r.to) || !(r.to > r.from)) { errors.push(`${at}: from and to must be frames, to after from`); return []; }
    return [{ from: r.from, to: r.to, id: String(r.id ?? `${names[k]}${i}`), ...(k === 'shots' ? { kind: String(r.kind ?? 'move') } : {}) }];
  });
  return { seams, stepped: range('stepped'), flashes, cameraBlur: range('cameraBlur'), colour: range('colour'), shots: moves('shots') as Decl['shots'], stages: moves('stages') };
};

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const flag = (name: string) => process.argv.includes(name);

const fail = (msg: string): never => {
  console.error(`export-cues: ${msg}`);
  process.exit(1);
};

async function load(path: string) {
  if (!existsSync(path)) fail(`cannot find ${path}`);
  try {
    return await import(pathToFileURL(resolve(path)).href);
  } catch (e) {
    return fail(`importing ${path} failed:\n${(e as Error).stack ?? e}`);
  }
}

async function main() {
  if (flag('--help') || flag('-h')) {
    console.log('npx tsx scripts/export-cues.ts [--sync src/sync.ts] [--timeline src/timeline.ts] [--out out/cues.json] [--allow-unknown] [--quiet]');
    return;
  }
  const syncPath = arg('--sync', 'src/sync.ts')!;
  const tlPath = arg('--timeline', resolve(dirname(syncPath), 'timeline.ts'))!;
  const outPath = arg('--out', 'out/cues.json')!;
  const quiet = flag('--quiet');

  const tl = await load(tlPath);
  const T = tl.default && tl.FPS === undefined ? tl.default : tl;
  const { FPS, BPM, TOTAL, ACT, CUE, COPY, PACE_NAME, PACE, READ } = T;
  const { LOOK, SEAMS, STEPPED, FLASHES, CAMERA_BLUR, COLOUR, SHOTS, STAGES, END, REVEAL, SPRING_CLASS, STRUCTURAL, SALIENCE, MUSIC, SPINE_PLAN, W, H } = T;
  for (const [k, v] of Object.entries({ FPS, BPM, TOTAL })) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) fail(`${tlPath} must export a positive number ${k}`);
  }
  if (!ACT || typeof ACT !== 'object') fail(`${tlPath} must export ACT ({name: {from, dur}})`);
  if (!CUE || typeof CUE !== 'object') fail(`${tlPath} must export CUE ({name: frame})`);

  const mod = await load(syncPath);
  const exp = mod.default?.default ?? mod.default ?? mod.cues;
  const raw: unknown = typeof exp === 'function' ? await exp() : exp;
  const list = Array.isArray(raw) ? raw : (raw as { events?: unknown[] })?.events;
  if (!Array.isArray(list)) fail(`${syncPath}: default export cues() must return an array of events`);

  const errors: string[] = [];
  const warnings: string[] = [];
  const events = (list as SoundEvent[]).map((e, i) => {
    const where = `event ${i}${e?.id ? ` (${e.id})` : ''}`;
    if (!e || typeof e !== 'object') {
      errors.push(`${where}: not an object`);
      return null;
    }
    for (const k of Object.keys(e)) if (!FIELDS.has(k)) warnings.push(`${where}: unknown field "${k}" dropped`);
    const f = Number(e.f);
    if (!Number.isFinite(f)) errors.push(`${where}: f must be a frame number, got ${e.f}`);
    else if (f < 0 || f >= TOTAL) errors.push(`${where}: f=${f} is outside the film (0..${TOTAL - 1})`);
    else if (f > TOTAL - 30 && ['hit', 'drop', 'swell', 'bell', 'snap'].includes(e.kind))
      warnings.push(`${where}: ${e.kind} at f=${f} has under 30 f to ring out before the end`);
    if (!KINDS.includes(e.kind as Kind)) {
      if (flag('--allow-unknown')) warnings.push(`${where}: unknown kind "${e.kind}" (score.py will skip it)`);
      else errors.push(`${where}: unknown kind "${e.kind}"; use one of ${KINDS.join(', ')}`);
    }
    const weight = e.weight ?? 1;
    if (!(Number.isFinite(weight) && weight > 0 && weight <= 2)) errors.push(`${where}: weight must be in (0, 2], got ${e.weight}`);
    const pan = e.pan ?? 0;
    if (!(Number.isFinite(pan) && pan >= -1 && pan <= 1)) errors.push(`${where}: pan must be in [-1, 1], got ${e.pan}`);
    if (e.pitch !== undefined && !(typeof e.pitch === 'number' ? Number.isFinite(e.pitch) : NOTE.test(String(e.pitch))))
      errors.push(`${where}: pitch must be a MIDI number or a note like "Eb6", got ${e.pitch}`);
    // apexFrac is 0..1. A riser or swell may peak on its frame (1) or a sound start on it (0); for a whoosh or a suck,
    // exactly 0 or 1 comes from lib/sync peak() on an ease whose speed peaks at an end (E.softOut, E.buildIn,
    // E.launchIn) and would land the sound on its own first or last sample, so it is clamped with a warning
    let apexFrac = e.apexFrac;
    if (apexFrac !== undefined) {
      if (!(Number.isFinite(apexFrac) && apexFrac >= 0 && apexFrac <= 1)) errors.push(`${where}: apexFrac must be in 0..1`);
      else if ((apexFrac === 0 || apexFrac === 1) && (e.kind === 'whoosh' || e.kind === 'suck')) {
        const c = apexFrac === 0 ? 0.05 : 0.95;
        warnings.push(`${where}: apexFrac ${apexFrac} puts the ${e.kind}'s peak on its ${apexFrac === 0 ? 'first' : 'last'} sample (the ease's speed peaks at an end): clamped to ${c}`);
        apexFrac = c;
      }
    }
    if (e.dur !== undefined && !(Number.isFinite(e.dur) && e.dur > 0)) errors.push(`${where}: dur must be > 0 frames`);
    if (e.structural !== undefined && typeof e.structural !== 'boolean') errors.push(`${where}: structural must be true (or left out)`);
    if (e.force !== undefined && typeof e.force !== 'boolean') errors.push(`${where}: force must be true (or left out)`);
    if (e.offset_ms !== undefined && !(Number.isFinite(e.offset_ms) && e.offset_ms >= -500 && e.offset_ms <= 500))
      errors.push(`${where}: offset_ms must be in -500..500, got ${e.offset_ms}`);
    if (e.action !== undefined && (typeof e.action !== 'string' || !e.action.trim())) errors.push(`${where}: action must be a name (actions.py), got ${e.action}`);
    if (e.salience !== undefined && !SALIENCES.includes(e.salience as Salience))
      errors.push(`${where}: salience must be one of ${SALIENCES.join(', ')}, got ${e.salience}`);
    if (e.structural && !MUSIC) warnings.push(`${where}: structural without a track (src/music.ts MUSIC is null): nothing to land on yet`);
    const out: SoundEvent = { f: Math.round(f * 1000) / 1000, kind: e.kind, weight: +(+weight).toFixed(3), pan: +(+pan).toFixed(3) };
    if (e.pitch !== undefined) out.pitch = e.pitch;
    if (e.kind === 'whoosh' || e.kind === 'suck' || apexFrac !== undefined)
      out.apexFrac = +(apexFrac ?? (e.kind === 'suck' ? 0.85 : 0.5)).toFixed(3);
    if (e.dur !== undefined) out.dur = e.dur;
    if (e.variant !== undefined) out.variant = String(e.variant);
    if (e.action !== undefined) out.action = String(e.action).trim();
    if (e.id !== undefined) out.id = String(e.id);
    if (e.structural) out.structural = true;
    if (e.force) out.force = true;
    if (e.offset_ms !== undefined) out.offset_ms = +(+e.offset_ms).toFixed(3);
    if (e.salience !== undefined) out.salience = e.salience;
    return out;
  });
  if (errors.length) fail(`${errors.length} invalid event(s):\n  ${errors.join('\n  ')}`);

  const sorted = (events as SoundEvent[]).sort((a, b) => a.f - b.f || String(a.kind).localeCompare(String(b.kind)));
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.kind === b.kind && a.kind !== 'key' && Math.abs(a.f - b.f) < 0.5)
      warnings.push(`two ${a.kind} events on frame ${b.f}: one sound per visible event`);
  }

  const acts: Record<string, { from: number; dur: number }> = {};
  for (const [k, v] of Object.entries(ACT as Record<string, { from: number; dur: number }>)) acts[k] = { from: v.from, dur: v.dur };
  const cue: Record<string, number> = {};
  for (const [k, v] of Object.entries(CUE as Record<string, unknown>)) if (typeof v === 'number') cue[k] = v;

  // The copy block: every on-screen string with its frames, so the render checks know when text is being read.
  type CopyIn = { id: string; text: string; in: number; resolved: number; out?: number | null; kind?: string; chain?: string; mode?: string };
  const copy = (Array.isArray(COPY) ? (COPY as CopyIn[]) : []).map((c) => ({
    id: String(c.id),
    text: String(c.text),
    in: c.in,
    resolved: c.resolved,
    out: c.out ?? TOTAL,
    words: String(c.text).split(/\s+/).filter(Boolean).length,
    kind: c.kind ?? 'copy',
    ...(c.chain ? { chain: c.chain, mode: c.mode ?? 'build' } : {}),
  }));
  for (const c of copy)
    if (![c.in, c.resolved, c.out].every((v) => typeof v === 'number' && Number.isFinite(v))) fail(`COPY ${c.id}: in/resolved/out must be frames`);
  // reading windows: the timeline's own READ (one rule for every check), else the same rule here
  const paceKey = typeof PACE_NAME === 'string' && PACE_NAME in READ_PACE ? PACE_NAME : 'crisp';
  const readPace: ReadPace = { ...READ_PACE[paceKey], ...((PACE as Record<string, Partial<ReadPace>> | undefined)?.[paceKey] ?? {}) };
  const windows: Windows = isWindows(READ) ? READ : readingWindows(copy, readPace, FPS);
  const copyOut = copy.map((c) => ({ ...c, read: windows[c.id] ?? [] }));

  // ---- declarations, salience and the music grid (written only when the timeline has them) ----
  const derr: string[] = [];
  const extra: Record<string, unknown> = {};
  if (LOOK !== undefined) {
    if (!LOOK || typeof LOOK !== 'object') derr.push('LOOK must be an object {blur, texture, filmType, oneTake, whiteWorld}');
    else {
      const L = LOOK as Record<string, unknown>;
      if (L.blur !== undefined && L.blur !== 'crisp' && L.blur !== 'camera') derr.push(`LOOK.blur must be 'crisp' or 'camera', got ${L.blur}`);
      extra.look = { blur: L.blur ?? 'crisp', texture: L.texture ?? 'clean', filmType: L.filmType ?? 'launch', oneTake: !!L.oneTake, whiteWorld: !!L.whiteWorld, ...(L.palette === 'mono' ? { palette: 'mono' } : {}) };
    }
  }
  const fxRaw: unknown = typeof mod.declares === 'function' ? await mod.declares() : mod.declares;
  if (fxRaw !== undefined && !Array.isArray(fxRaw)) derr.push(`${syncPath}: declares must return an array of {id?, seams?, stepped?, flashes?, cameraBlur?, colour?, shots?, stages?}`);
  const fx = (Array.isArray(fxRaw) ? (fxRaw as Record<string, unknown>[]) : []).map((d, i) => {
    const id = String(d?.id ?? `fx${i}`);
    return { id, ...normDecl(d ?? {}, `${syncPath} declares()[${i}] (${id})`, derr) };
  });
  const hasDecl = [SEAMS, STEPPED, FLASHES, CAMERA_BLUR, COLOUR, SHOTS, STAGES, END, REVEAL, SPRING_CLASS, STRUCTURAL].some((v) => v !== undefined) || fx.length > 0;
  if (hasDecl) {
    const own = normDecl({ SEAMS, STEPPED, FLASHES, CAMERA_BLUR, COLOUR, SHOTS, STAGES }, 'timeline', derr, { seams: 'SEAMS', stepped: 'STEPPED', flashes: 'FLASHES', cameraBlur: 'CAMERA_BLUR', colour: 'COLOUR', shots: 'SHOTS', stages: 'STAGES' });
    let end: { from: number; to: number } | null = null;
    if (END !== undefined) {
      const E = END as Record<string, unknown>;
      if (!E || !isFrame(E.from) || !isFrame(E.to)) derr.push('END must be {from, to} frames');
      else end = { from: E.from, to: E.to };
    }
    if (REVEAL !== undefined && !isFrame(REVEAL)) derr.push('REVEAL must be a frame');
    if (SPRING_CLASS !== undefined && typeof SPRING_CLASS !== 'string') derr.push('SPRING_CLASS must be a string');
    const structural = STRUCTURAL === undefined ? [] : Array.isArray(STRUCTURAL) ? (STRUCTURAL as unknown[]).map(String) : (derr.push('STRUCTURAL must be an array of CUE names'), []);
    for (const n of structural) if (!(n in cue)) derr.push(`STRUCTURAL names "${n}", which is not a CUE`);
    extra.declared = { ...own, end, reveal: isFrame(REVEAL) ? REVEAL : null, springClass: typeof SPRING_CLASS === 'string' ? SPRING_CLASS : '', structural, fx };
  }
  if (SALIENCE !== undefined) {
    if (!SALIENCE || typeof SALIENCE !== 'object') derr.push('SALIENCE must be an object {cueName: salience}');
    else {
      const sal: Record<string, string> = {};
      for (const [k, v] of Object.entries(SALIENCE as Record<string, unknown>)) {
        if (!(k in cue)) derr.push(`SALIENCE names "${k}", which is not a CUE`);
        else if (!SALIENCES.includes(v as Salience)) derr.push(`SALIENCE.${k} must be one of ${SALIENCES.join(', ')}, got ${v}`);
        else sal[k] = String(v);
      }
      extra.salience = sal;
    }
  }
  if (MUSIC !== undefined && MUSIC !== null) {
    const M = MUSIC as Record<string, unknown>;
    const nums = (v: unknown) => Array.isArray(v) && v.every(isFrame);
    if (!(isFrame(M.bpm) && M.bpm > 0)) derr.push('MUSIC.bpm must be a positive number');
    if (!isFrame(M.t0)) derr.push('MUSIC.t0 must be a frame');
    if (M.fps !== FPS) derr.push(`MUSIC.fps (${M.fps}) must equal the timeline's FPS (${FPS}): rerun track.py grid at this fps`);
    if (!nums(M.downbeats) || (M.downbeats as number[]).some((f, i, a) => i > 0 && f <= a[i - 1])) derr.push('MUSIC.downbeats must be increasing film frames');
    if (M.accents !== undefined && !(Array.isArray(M.accents) && (M.accents as Record<string, unknown>[]).every((a) => a && isFrame(a.f)))) derr.push('MUSIC.accents must be [{f, db, band?}]');
    if (M.bpm !== BPM) warnings.push(`the timeline's BPM (${BPM}) is not MUSIC.bpm (${M.bpm}): write BPM = MUSIC?.bpm ?? <grid tempo>`);
    // a JSON copy: every field track.py grid wrote, in film frames
    extra.music = JSON.parse(JSON.stringify(M));
  }
  if (derr.length) fail(`${derr.length} invalid declaration(s):\n  ${derr.join('\n  ')}`);

  // the spine (lib/spine planSpine: plain data) and the composition size the box tracks are written in
  if (SPINE_PLAN !== undefined && SPINE_PLAN !== null) {
    if (typeof SPINE_PLAN !== 'object' || !Array.isArray((SPINE_PLAN as { changes?: unknown }).changes)) fail('SPINE_PLAN must be a planSpine() plan (lib/spine.ts)');
    extra.spine = JSON.parse(JSON.stringify(SPINE_PLAN));
  }
  const size = typeof W === 'number' && typeof H === 'number' && W > 0 && H > 0 ? { width: W, height: H } : {};
  const doc = { fps: FPS, bpm: BPM, total: TOTAL, ...size, ...(typeof PACE_NAME === 'string' ? { pace: PACE_NAME } : {}), acts, cue, copy: copyOut, events: sorted, ...extra };
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, JSON.stringify(doc, null, 1) + '\n');

  if (!quiet) {
    for (const w of warnings) console.warn(`warning: ${w}`);
    const byKind: Record<string, number> = {};
    for (const e of sorted) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    console.log(
      `wrote ${relative(process.cwd(), resolve(outPath))}: ${sorted.length} events ` +
        `(${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(', ')}), ` +
        `${Object.keys(cue).length} cues, ${copy.length} copy entries, ${(TOTAL / FPS).toFixed(2)} s at ${FPS} fps, ${BPM} BPM` +
        (extra.declared ? `; declared ${(['seams', 'stepped', 'flashes', 'cameraBlur', 'colour'] as const).map((k) => `${(extra.declared as Decl)[k].length} ${k}`).join(', ')}, ${fx.length} fx${fx.some((x) => x.shots.length) ? ` (${fx.reduce((n, x) => n + x.shots.length, 0)} camera shots)` : ''}` : '') +
        (extra.music ? `; music grid ${(extra.music as { bpm: number }).bpm} BPM from f${(extra.music as { t0: number }).t0}` : ''),
    );
  }
}

main();
