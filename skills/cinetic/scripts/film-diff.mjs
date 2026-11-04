#!/usr/bin/env node
/**
 * film-diff.mjs: every film looks like itself, never like the last films or the template it came from.
 *
 * A film declares its devices in film.json at the project root. new-film.sh writes it (the template, the start time,
 * the last three films' devices to stay away from); the plan step fills `devices` from references/catalogue.md:
 *   { "template": "launch-simple",
 *     "devices": { "ground": "deepPool", "voice": "build", "emphasis": "colour", "signature": "split-around",
 *                  "moves": ["push", "step-list", "counter"], "seams": ["exitEnter", "matchCut", "blurThrough"],
 *                  "end": "element", "logo": "element-becomes-mark" },
 *     "allow": [] }
 * What the film's code already says fills an empty slot: src/deal.ts DEAL (through tsx: voice, ground, end, camera and
 * the template's own slots), out/cues.json (the declared seams, by recipe) and out/direction.json (the deck's ground
 * family).
 *
 * Checks
 *   repeat    ground, voice, signature and end each differ from every one of the last three films (fail); a template
 *             slot whose every choice the last three films used allows the least recent one (warn). Emphasis and logo
 *             warn when they repeat the last film's. "allow": ["voice"] in film.json (or --allow voice) when the
 *             brief asks for the repeat.
 *   overlap   the move set (voice, signature, logo, the moves, the seam recipes) shares at most 25 % with each of the
 *             last three films (Jaccard: shared / all; fail above 0.25)
 *   floor     a template film's deal plays another device than the template's floor (assets/templates/<name>/
 *             floor.json, the template as it ships) in at least half its slots (fail)
 *   declared  ground, voice, signature, end and two or more moves are named (warn per gap)
 *   type      the type pairing (film.json devices.type, which scripts/type-deal.ts writes) differs from the last
 *             film's (warn: a re-deal with --mood or --pair changes it)
 *   creative  the film's creative elements (film.json devices.creative, else src/deal.ts CREATIVE) are not all the
 *             last film's (warn); --record keeps them, so the next deal (deck.py, deal.ts) plays others
 *   hero      the hero shots (film.json devices.hero, else src/deal.ts HERO_DEAL.deal, the update film's PLAYED or the
 *             launch film's src/timeline.ts PLAYED: its dealt house scenes) are not
 *             all the last film's (warn); --record keeps them, so deck.py's next deal weighs them down
 *   world     the place the film stands in is its world AND that world's hue (film.json devices.world / devices.hue, else
 *             the deal's ground and the hue the accent in src/brand/tokens.ts gives it: launch-simple its own hue, the
 *             starter's fx/world through its window): one of the last three films in the same world at a hue under 40
 *             degrees away fails (a neutral world, or a hue nobody recorded, by its kind alone), even when the ground
 *             families differ; a ground that is itself a world is held to the same rule (a deep field at a blue accent
 *             after one at a green accent passes). --record keeps the world and its hue; deck.py deals away from them
 *
 * Usage (from the film project):
 *   node scripts/film-diff.mjs [<film dir>]              check the film
 *   node scripts/film-diff.mjs [<film dir>] --record     check, then add the film to the history (after the ship gate;
 *                                                        it prints the minutes since new-film.sh wrote film.json)
 *   node scripts/film-diff.mjs --history                 the last films' devices, newest first
 *   node scripts/film-diff.mjs --floor <template>        a template's floor; --write [--from <scaffold>] refreshes
 *                                                        floor.json from its deal.ts FLOOR (a deal that imports the
 *                                                        starter reads it from a fresh scaffold: new-film.sh --template)
 *   --allow slot,...    repeats the brief asks for     --json   machine-readable report
 *   --history-file F    the history (default $CINETIC_FILM_HISTORY, else ~/.cinetic/film-history.json; 12 kept)
 * Exit codes: 0 pass, 1 a check failed, 2 bad arguments or no film.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const SLOTS = ['ground', 'voice', 'emphasis', 'signature', 'end', 'logo'];
const HARD = ['ground', 'voice', 'signature', 'end']; // differ from the last three films
const SOFT = ['emphasis', 'logo']; // differ from the last film
const JACCARD_MAX = 0.25;
const RECENT = 3;
const KEEP = 12;
const RECIPES = new Set(['exitEnter', 'textSwap', 'matchCut', 'velocityCut', 'blurThrough', 'zoomThrough', 'sharedElement']);
// the worlds a template's ground may hold (fx/world; deck.py WORLD_KINDS), the near-neutral ones that show no hue, and the
// hue gap under which two films in one world stand in the same place (deck.py WORLD_SAME_HUE)
export const WORLDS = new Set(['nearWhite', 'paleSky', 'blackField', 'deepField', 'electric', 'clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro']);
const NEUTRAL_WORLDS = new Set(['blackField', 'nearWhite', 'studio']);
const WORLD_SAME_HUE = 40;
// fx/world worlds.ts WORLD_HUE: [lo, hi) lends the accent's own hue, else the default
const FX_WORLD_HUE = { electric: [228, 266, 258], deep: [195, 266, 252], plate: [195, 266, 236], neutral: [140, 266, 245] };

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const value = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
if (flag('-h') || flag('--help')) {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  console.log(src.slice(src.indexOf('/**') + 3, src.indexOf('*/')).replace(/^ \* ?/gm, '').trim());
  process.exit(0);
}
const HISTORY = value('--history-file') || process.env.CINETIC_FILM_HISTORY || path.join(os.homedir(), '.cinetic', 'film-history.json');
const VALUED = new Set(['--history-file', '--allow', '--floor', '--from']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));

const die = (msg, code = 2) => {
  console.error(`film-diff: ${msg}`);
  process.exit(code);
};
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const norm = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v.map(norm).filter(Boolean) : []);

export function readHistory(file = HISTORY) {
  const h = readJson(file);
  return Array.isArray(h) ? h.filter((x) => x && typeof x === 'object' && x.devices) : [];
}

function writeHistory(entry, file = HISTORY) {
  const h = readHistory(file);
  h.unshift(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(h.slice(0, KEEP), null, 1) + '\n');
}

/** The deal of a project's src/deal.ts (DEAL, FLOOR), through tsx; null without tsx or deal.ts. */
function tsDeal(dir, name = 'DEAL') {
  const m = tsDealMany(dir, [name]);
  return m ? m[name] ?? null : null;
}
/** Several exports of src/deal.ts (or another src module) in one tsx run (each run costs seconds): { name: value }, or null. */
function tsDealMany(dir, names, file = 'deal.ts') {
  const deal = path.join(dir, 'src', file);
  if (!fs.existsSync(deal)) return null;
  const up = (from, rel) => {
    for (let d = path.resolve(from); ; d = path.dirname(d)) {
      if (fs.existsSync(path.join(d, rel))) return path.join(d, rel);
      if (path.dirname(d) === d) return null;
    }
  };
  const tsx = up(dir, path.join('node_modules', 'tsx', 'dist', 'cli.mjs')) ?? up(SKILL, path.join('assets', 'remotion-starter', 'node_modules', 'tsx', 'dist', 'cli.mjs'));
  if (!tsx) return null;
  const probe = path.join(os.tmpdir(), `film-diff-${process.pid}.mts`);
  fs.writeFileSync(probe, `import { pathToFileURL } from 'node:url';\nconst m = await import(pathToFileURL(${JSON.stringify(deal)}).href);\nconsole.log(JSON.stringify(Object.fromEntries(${JSON.stringify(names)}.map((n) => [n, m[n] ?? null]))));\n`);
  const r = spawnSync(process.execPath, [tsx, probe], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  fs.rmSync(probe, { force: true });
  try {
    return JSON.parse(r.stdout.trim().split('\n').pop());
  } catch {
    return null;
  }
}

/** OKLCH [C, h] of a #RRGGBB colour (h in degrees). */
export function hexChromaHue(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(m[1].slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  return [Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
/** The hue (degrees, rounded) world `kind` takes under accent `hex` in a film made from `template`, else null. */
export function worldHue(kind, hex, template) {
  const ch = WORLDS.has(kind) ? hexChromaHue(hex) : null;
  if (!ch) return null;
  const [c, h] = ch;
  if (template === 'launch-simple') return Math.round(h) % 360;
  const win = kind === 'electric' ? 'electric' : kind === 'deepField' || kind === 'nightCity' ? 'deep' : NEUTRAL_WORLDS.has(kind) ? 'neutral' : 'plate';
  const [lo, hi, dflt] = FX_WORLD_HUE[win];
  return c >= 0.04 && h >= lo && h < hi ? Math.round(h) % 360 : dflt;
}
/** Two films stand in the same place: one world, hues under WORLD_SAME_HUE apart (a neutral world or an unknown hue: the kind alone). */
export function samePlace(kind, hue, other, otherHue) {
  if (!kind || kind !== other) return false;
  if (NEUTRAL_WORLDS.has(kind) || !Number.isFinite(hue) || !Number.isFinite(otherHue)) return true;
  const d = Math.abs(hue - otherHue) % 360;
  return Math.min(d, 360 - d) < WORLD_SAME_HUE;
}
/** A history entry's world and hue (an older entry: its deal's ground, or its ground when that is a world). */
const placeOf = (h) => {
  const d = h?.devices ?? {};
  const w = norm(d.world) || (WORLDS.has(h?.deal?.ground) ? h.deal.ground : WORLDS.has(d.ground) ? d.ground : '');
  return { world: w, hue: Number.isFinite(d.hue) ? d.hue : null };
};
/** The accent of a project (src/brand/tokens.ts `accent: '#RRGGBB'`), else null. */
const accentOf = (dir) => {
  try {
    return /\baccent:\s*['"](#[0-9A-Fa-f]{6})['"]/.exec(fs.readFileSync(path.join(dir, 'src', 'brand', 'tokens.ts'), 'utf8'))?.[1] ?? null;
  } catch {
    return null;
  }
};

const seamRecipe = (s) => {
  const pre = String(s.id ?? '').split(':')[0];
  return RECIPES.has(pre) ? pre : String(s.kind ?? '');
};

/** The film's devices: film.json first, then what its code declares. */
export function filmDevices(dir, { useTsx = true } = {}) {
  const fj = readJson(path.join(dir, 'film.json')) ?? {};
  const d = fj.devices ?? {};
  const out = Object.fromEntries(SLOTS.map((s) => [s, norm(d[s])]));
  out.moves = list(d.moves);
  out.seams = list(d.seams);
  out.camera = norm(d.camera);
  out.type = norm(d.type);
  out.creative = list(d.creative);
  out.hero = list(d.hero);
  const got = useTsx ? tsDealMany(dir, ['DEAL', 'CREATIVE', 'HERO_DEAL', 'PLAYED']) : null;
  const deal = got ? got.DEAL : null;
  // CREATIVE is the ids, or the deal object launch-simple exports ({ deal: [ids], reserve, source })
  const cr = Array.isArray(got?.CREATIVE) ? got.CREATIVE : Array.isArray(got?.CREATIVE?.deal) ? got.CREATIVE.deal : null;
  if (!out.creative.length && cr) out.creative = list(cr);
  // the hero shots the film played (launch-simple HERO_DEAL.deal, the update film's PLAYED): recorded, so the next deals
  // (deck.py recent_hero, the templates' recent.ts) weigh them down and every film shoots its own
  const hr = Array.isArray(got?.HERO_DEAL?.deal) ? got.HERO_DEAL.deal : Array.isArray(got?.PLAYED) ? got.PLAYED : null;
  if (!out.hero.length && hr) out.hero = list(hr);
  // launch-simple's house scenes: the timeline's PLAYED (the bank's deal), so the next film is dealt others
  if (useTsx && !out.hero.length && fs.existsSync(path.join(dir, 'src', 'bank.ts'))) {
    const played = tsDealMany(dir, ['PLAYED'], 'timeline.ts')?.PLAYED;
    if (Array.isArray(played)) out.hero = list(played);
  }
  if (deal && typeof deal === 'object') {
    for (const s of ['voice', 'ground', 'end', 'camera']) if (!out[s] && typeof deal[s] === 'string') out[s] = deal[s];
    if (!out.seams.length) out.seams = [...new Set(['seamTA', 'seamAT'].map((s) => deal[s]).filter((x) => typeof x === 'string'))];
  }
  // the place: the world (declared, else the deal's ground when it holds worlds) and the hue it takes from the accent
  out.world = norm(d.world) || (deal && WORLDS.has(deal.ground) ? deal.ground : WORLDS.has(out.ground) ? out.ground : '');
  out.hue = Number.isFinite(d.hue) ? d.hue : out.world ? worldHue(out.world, accentOf(dir), norm(fj.template)) : null;
  const cues = readJson(path.join(dir, 'out', 'cues.json'));
  const declared = cues?.declared?.seams;
  if (Array.isArray(declared) && declared.length) out.seams = [...new Set([...out.seams, ...declared.map(seamRecipe).filter(Boolean)])];
  const dir0 = readJson(path.join(dir, 'out', 'direction.json'));
  if (dir0) {
    if (!out.ground && dir0.ground_family?.id) out.ground = dir0.ground_family.id;
    out.deck = { direction: dir0.direction?.id ?? null, signature: dir0.signature?.family ?? null, lockup: dir0.direction?.lockup?.kind ?? null };
  }
  return { template: norm(fj.template) || null, devices: out, deal, allow: list(fj.allow), started: fj.started ?? null };
}

/** The move set two films are compared on: the type voice, the signature, the logo design, the moves, the seam recipes. */
export const moveSet = (d) => new Set([d.voice && `voice:${d.voice}`, d.signature && `signature:${d.signature}`, d.logo && `logo:${d.logo}`,
  ...(d.moves ?? []).map((m) => `move:${m}`), ...(d.seams ?? []).map((s) => `seam:${s}`)].filter(Boolean));

export const jaccard = (a, b) => {
  const A = moveSet(a), B = moveSet(b);
  const all = new Set([...A, ...B]);
  if (!all.size) return 0;
  let shared = 0;
  for (const x of A) if (B.has(x)) shared++;
  return shared / all.size;
};

/** Every check on a film's record against the history (newest first) and its template's floor. */
export function diff(film, history, { allow = [], floor = null, choices = {} } = {}) {
  const findings = [];
  const add = (check, severity, message) => findings.push({ check, severity, message });
  const d = film.devices;
  const recent = history.slice(0, RECENT);
  const ok = new Set([...allow, ...(film.allow ?? [])]);
  for (const s of ['ground', 'voice', 'signature', 'end']) if (!d[s]) add('declared', 'warn', `no ${s} named (film.json devices.${s}): name it, so the next film can stay away from it`);
  if ((d.moves ?? []).length < 2) add('declared', 'warn', `${(d.moves ?? []).length} moves named (film.json devices.moves): pick 2-3 from references/catalogue.md`);
  for (const s of HARD) {
    if (!d[s] || ok.has(s)) continue;
    // a ground that is a world is a place: the same world at another hue is another place (samePlace)
    const placed = s === 'ground' && WORLDS.has(d[s]);
    const same = (h, o) => (placed ? samePlace(o, o === d[s] ? d.hue : null, placeOf(h).world || h.devices?.[s], placeOf(h).hue) : h.devices?.[s] === o);
    const hits = recent.map((h, i) => (same(h, d[s]) ? i + 1 : 0)).filter(Boolean);
    if (!hits.length) continue;
    const opts = Array.isArray(choices[s]) && choices[s].length ? choices[s] : null;
    const lastUse = (o) => {
      const i = recent.findIndex((h) => same(h, o));
      return i < 0 ? Infinity : i + 1;
    };
    const free = opts ? opts.filter((o) => lastUse(o) === Infinity) : null;
    const leastRecent = opts ? opts.reduce((a, o) => (lastUse(o) > lastUse(a) ? o : a), opts[0]) : null;
    if (free && !free.length && d[s] === leastRecent) {
      add('repeat', 'warn', `${s} ${d[s]} repeats the film ${hits[0]} back: the least recent of the template's ${opts.length} choices (the last ${RECENT} films used every one)`);
    } else {
      add('repeat', 'error', `${s} ${d[s]}${placed && Number.isFinite(d.hue) ? ` at hue ${d.hue}` : ''} repeats the film ${hits.map((k) => `${k} back`).join(' and ')}${free?.length ? ` (free: ${free.join(', ')})` : ''}: choose another (film.json, or the deal's pin), or add "${s}" to film.json allow when the brief asks for it`);
    }
  }
  // the world under another ground family: two families that both stand in one world at one hue are one place
  if (d.world && d.world !== d.ground && !ok.has('world') && !ok.has('ground')) {
    const hits = recent.map((h, i) => (samePlace(d.world, d.hue, placeOf(h).world, placeOf(h).hue) ? i + 1 : 0)).filter(Boolean);
    if (hits.length) add('world', 'error', `the world ${d.world}${Number.isFinite(d.hue) ? ` at hue ${d.hue}` : ''} is the film ${hits.map((k) => `${k} back`).join(' and ')}'s place (a world at a hue ${WORLD_SAME_HUE} degrees or more away, or another world, is another place): re-deal (deck.py), pin another, or add "world" to film.json allow when the brief asks for it`);
  }
  for (const s of SOFT) {
    if (d[s] && !ok.has(s) && recent[0]?.devices?.[s] === d[s]) add('repeat', 'warn', `${s} ${d[s]} is the last film's: a different ${s} reads as a different film`);
  }
  if (d.type && !ok.has('type') && recent[0]?.devices?.type === d.type) add('type', 'warn', `the type pairing ${d.type} is the last film's: deal another (npx tsx scripts/type-deal.ts --seed "<name>" --mood <m>, or --pair <id>)`);
  const lastHero = list(recent[0]?.devices?.hero);
  if ((d.hero ?? []).length && lastHero.length && !ok.has('hero') && d.hero.every((c) => lastHero.includes(c)))
    add('hero', 'warn', `the hero shots (${d.hero.join(', ')}) are all the last film's: deal again (deck.py) so this film shoots its own`);
  const lastCr = list(recent[0]?.devices?.creative);
  if ((d.creative ?? []).length && lastCr.length && !ok.has('creative') && d.creative.every((c) => lastCr.includes(c)))
    add('creative', 'warn', `the creative elements (${d.creative.join(', ')}) are all the last film's: deal again (deck.py) so this film has its own`);
  recent.forEach((h, i) => {
    const j = jaccard(d, h.devices ?? {});
    if (j > JACCARD_MAX + 1e-9) add('overlap', 'error', `the move set shares ${(100 * j).toFixed(0)} % with the film ${i + 1} back${h.name ? ` (${h.name})` : ''} (at most ${100 * JACCARD_MAX} %): trade a move or a seam for another from references/catalogue.md`);
  });
  if (floor?.deal && film.deal && typeof film.deal === 'object') {
    const slots = Object.keys(floor.deal);
    const same = slots.filter((s) => JSON.stringify(film.deal[s]) === JSON.stringify(floor.deal[s]));
    if (slots.length && 2 * (slots.length - same.length) < slots.length) add('floor', 'error', `the deal plays the ${film.template} template's own device in ${same.length} of ${slots.length} slots (${same.join(', ')}): at least half must differ (unpin them, or a new seed in the content file)`);
  }
  return findings;
}

function floorOf(template) {
  return readJson(path.join(SKILL, 'assets', 'templates', template, 'floor.json'));
}
function choicesOf(template) {
  const t = template ? readJson(path.join(SKILL, 'assets', 'templates', template, 'template.json')) : null;
  return t?.deal?.slots ?? {};
}

function main() {
  if (flag('--history')) {
    const h = readHistory();
    if (flag('--json')) console.log(JSON.stringify(h, null, 1));
    else if (!h.length) console.log(`film-diff: no films in ${HISTORY} yet`);
    else h.forEach((e, i) => console.log(`${i + 1}. ${e.name ?? '(unnamed)'}${e.template ? ` [${e.template}]` : ''}: ${SLOTS.map((s) => `${s} ${e.devices[s] || '-'}`).join(', ')}${placeOf(e).world ? `; world ${placeOf(e).world}${Number.isFinite(placeOf(e).hue) ? ` at hue ${placeOf(e).hue}` : ''}` : ''}; moves ${(e.devices.moves ?? []).join(' ') || '-'}; seams ${(e.devices.seams ?? []).join(' ') || '-'}${e.devices.type ? `; type ${e.devices.type}` : ''}${(e.devices.creative ?? []).length ? `; creative ${e.devices.creative.join(' ')}` : ''}${(e.devices.hero ?? []).length ? `; hero ${e.devices.hero.join(' ')}` : ''}`));
    return 0;
  }
  const fl = value('--floor');
  if (fl !== undefined) {
    const tdir = path.join(SKILL, 'assets', 'templates', fl ?? '');
    if (!fl || !fs.existsSync(path.join(tdir, 'template.json'))) die(`--floor ${fl}: no template of that name in assets/templates`);
    if (flag('--write')) {
      const from = value('--from') ? path.resolve(value('--from')) : tdir;
      const deal = tsDeal(from, 'FLOOR');
      if (!deal) die(`--floor ${fl} --write: ${fs.existsSync(path.join(from, 'src', 'deal.ts')) ? `could not import ${from}/src/deal.ts with tsx (a deal that imports the starter: scaffold the template with new-film.sh --template ${fl} and pass --from <that folder>)` : 'the template deals nothing (no src/deal.ts)'}`, 1);
      fs.writeFileSync(path.join(tdir, 'floor.json'), JSON.stringify({ template: fl, about: 'The template as it ships: what its unnamed scaffold plays (src/deal.ts FLOOR). film-diff.mjs holds a film made from it to at least half its slots apart.', deal }, null, 1) + '\n');
    }
    const f = floorOf(fl);
    console.log(f ? JSON.stringify(f, null, 1) : `film-diff: ${fl} has no floor.json (it deals nothing)`);
    return 0;
  }
  const dir = path.resolve(positional[0] ?? '.');
  if (!fs.existsSync(path.join(dir, 'src')) && !fs.existsSync(path.join(dir, 'film.json'))) die(`${dir}: not a film project (no src/ and no film.json)`);
  const film = filmDevices(dir, { useTsx: !flag('--no-tsx') });
  const allow = (value('--allow') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const history = readHistory();
  const name = readJson(path.join(dir, 'package.json'))?.name ?? path.basename(dir);
  const findings = diff(film, history.filter((h) => h.dir !== dir), { allow, floor: film.template ? floorOf(film.template) : null, choices: choicesOf(film.template) });
  const errors = findings.filter((f) => f.severity === 'error');
  if (flag('--json')) console.log(JSON.stringify({ film: { name, ...film }, history: history.length, findings }, null, 1));
  else {
    const d = film.devices;
    console.log(`film-diff: ${name}${film.template ? ` [${film.template}]` : ''}: ${SLOTS.map((s) => `${s} ${d[s] || '-'}`).join(', ')}${d.world ? `; world ${d.world}${Number.isFinite(d.hue) ? ` at hue ${d.hue}` : ''}` : ''}; moves ${d.moves.join(' ') || '-'}; seams ${d.seams.join(' ') || '-'}${d.type ? `; type ${d.type}` : ''}${d.creative.length ? `; creative ${d.creative.join(' ')}` : ''}${(d.hero ?? []).length ? `; hero ${d.hero.join(' ')}` : ''}`);
    console.log(`  against ${Math.min(RECENT, history.length)} of the last films${film.template ? ` and the ${film.template} floor` : ''}`);
    for (const f of findings) console.log(`  ${f.severity === 'error' ? 'FAIL' : 'warn'}  ${f.check}: ${f.message}`);
    if (!findings.length) console.log('  pass: nothing repeats');
  }
  if (flag('--record')) {
    if (errors.length) die(`not recorded: ${errors.length} check(s) fail`, 1);
    const minutes = film.started && !Number.isNaN(Date.parse(film.started)) ? Math.round((Date.now() - Date.parse(film.started)) / 60000) : null;
    writeHistory({ name, dir, template: film.template, recorded: new Date().toISOString().slice(0, 10), minutes, devices: film.devices, deal: film.deal ?? null });
    if (!flag('--json')) console.log(`  recorded in ${HISTORY}${minutes !== null ? `; the run took ${minutes} min from new-film.sh (the budget: 90, at most 120)` : ''}`);
  }
  return errors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
