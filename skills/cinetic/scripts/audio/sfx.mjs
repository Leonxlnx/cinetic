#!/usr/bin/env node
/**
 * sfx.mjs: the film's sound effects are real recordings: a different set from the curated catalogue for every
 * film, downloaded at film time into audio/sfx/ with a licence record beside each file, then placed as the takes
 * of the kit roles (kit.py real --role), so score.py puts recorded sound on every cue frame. earshot stays the
 * ears (kit.py listen, listen.py): it judges the takes, the sync and the mix; it no longer makes the effects.
 *
 * Usage (from the project root, after npm run cues and kit.py cast, before npm run sound):
 *   node scripts/audio/sfx.mjs [all] [--film NAME] [--avoid ID,ID] [--kit audio/kit.json] [--to audio/sfx] [--python PY]
 *   node scripts/audio/sfx.mjs pick|get|place|list|licences [options]
 *
 * pick      every kit role that is on gets one catalogue sound of its kind (scripts/audio/sfx-catalogue.json:
 *           "actions" for the action the cast gave the role, else "roles": a kit role -> the kinds that may play it;
 *           a sub-role such as hit.logo_lock or whoosh.long.whip reads its action). Among the best few of each kind the film's own seed (its
 *           name) chooses, a sound any of the last four films played is held back
 *           (~/.cinetic/sfx-history.json, or $CINETIC_HOME), and no sound plays two roles. Writes
 *           audio/sfx/picks.json and records the film's sounds in the history (--no-history: neither reads nor
 *           writes it). --avoid ID[,ID]: sounds this film's mix or listening judged poorly (buried under the track,
 *           a cheap read): the role takes the next one, and picks.json remembers them.
 * get       downloads each pick (its file_url) into audio/sfx/<id>.wav, checks it is a WAV, and writes
 *           <id>.licence.json: the record credits.py and kit.py real check (source, page, file_url, the licence
 *           and its quote as read on the licence page, credit not required, limits). A file already there with
 *           its record is kept. The audio is never committed: the catalogue holds links, not sound.
 * place     kit.py real <file> --role <role> for every downloaded pick: the recording cut to 5 ms before its
 *           transient (onset-aligned on the cue frame), faded, peak-normalised and given the role's own mix keys
 *           (bed_db: its level over the track; offset_ms; min_gap_ms; width), three takes in audio/kit/
 *           (real.lock.json). score.py levels them to the bed, pans them along the cue and masters to -14 LUFS.
 * all       pick, get and place (the default).
 * refine    after a mix (score.py's out/qa/score.json) and kit.py listen (out/qa/kit_listen.json): every effect the mix
 *           calls masked or buried, and every take earshot's ears flag (a cheap alternative outranks the role's own
 *           description), is avoided and its role picks again, then get and place (--score PATH). Mix and listen again.
 * list      the catalogue by role (count, ids); licences: the sources and the licence each was read under.
 *
 * Offline: --offline, or a download that fails, leaves those roles to the kit's synthesized takes, and says so
 * loudly ("FALLBACK: synthesized effects"), with the roles listed in picks.json "fallback". A soundtrack still
 * renders; deliver only after a run with the network. Tests never use the network: --fixtures DIR (or
 * $CINETIC_SFX_FIXTURES) copies <id>.wav from DIR instead of downloading.
 *
 * Exit codes: 0 done (also a stated fallback), 1 a refused licence or a failed place, 2 bad arguments.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPython } from '../py.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CATALOGUE = path.join(HERE, 'sfx-catalogue.json');
const UA = 'Mozilla/5.0 (cinetic sfx.mjs; a film soundtrack)';
const AVOID_FILMS = 4;   // a sound any of the last four films played is held back
const TOP = 4;           // the film's seed chooses among the best few of a kind

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, o) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n'); };
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const today = () => new Date().toISOString().slice(0, 10);
const home = () => process.env.CINETIC_HOME || path.join(homedir(), '.cinetic');

/** 32-bit FNV-1a of a string: the film's seed, so a film always draws the same set and two films draw different ones. */
export function hash(s) {
  let h = 0x811c9dc5;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/**
 * The catalogue kinds that may play a kit role: the action the cast gave it (kit.json cast.roles[role].action), then
 * the role itself, then a sub-role's action (hit.logo_lock), then its base (hit).
 */
export function kindsFor(cat, role, action = null) {
  const map = cat.roles || {};
  const acts = cat.actions || {};
  const norm = (x) => String(x || '').replace(/_/g, '-');
  if (action && acts[norm(action)]) return acts[norm(action)];
  if (map[role]) return map[role];
  const parts = role.split('.');
  const act = acts[norm(parts[parts.length - 1])];
  if (parts.length > 1 && act) return act;
  for (let k = parts.length - 1; k >= 1; k--) {
    const key = parts.slice(0, k).join('.');
    if (map[key]) return map[key];
  }
  return [];
}

/** A sound's rank inside its kind: earshot's forced choice first, then a clean onset and no hiss. */
export function quality(s) {
  const ear = s.ear?.p ?? 0.5;
  const lead = Math.min(1, (s.lead_ms ?? 0) / 60);
  const floor = s.floor_db != null ? Math.min(1, Math.max(0, (s.floor_db + 70) / 40)) : 0.5;
  return ear - 0.15 * lead - 0.1 * floor;
}

/**
 * The film's picks: {role: sound} for every role, each from the role's kinds (the first kind preferred), the
 * last films' sounds and this film's other picks held back, the film's seed choosing among the best TOP.
 */
export function pick(cat, roles, film, history = [], avoid = [], actions = {}) {
  const recent = new Set(history.slice(-AVOID_FILMS).filter((h) => h.film !== film).flatMap((h) => h.ids || []));
  const banned = new Set(avoid);
  const used = new Set();
  const out = {};
  for (const role of roles) {
    const kinds = kindsFor(cat, role, actions[role]);
    let chosen = null;
    for (const kind of kinds) {
      const pool = cat.sounds.filter((s) => s.role === kind && !used.has(s.id) && !banned.has(s.id)).sort((a, b) => quality(b) - quality(a) || (a.id < b.id ? -1 : 1));
      const fresh = pool.filter((s) => !recent.has(s.id));
      const from = (fresh.length ? fresh : pool).slice(0, TOP);
      if (!from.length) continue;
      chosen = from[hash(`${film}|${role}`) % from.length];
      break;
    }
    if (chosen) { used.add(chosen.id); out[role] = chosen; }
  }
  return out;
}

/** The licence record of a catalogue sound (the record music.mjs get writes; credits.py check_record reads it). */
export function licenceRecord(cat, s, { file, sha, bytes, date }) {
  const L = cat.sources[s.source];
  if (!L || L.credit !== false) throw new Error(`${s.id}: source ${s.source} is not one a film may play without a credit`);
  return {
    record: 1, kind: 'sfx', file, sha256: sha, bytes, title: s.title, artist: L.name, source: L.name,
    page: s.page, file_url: s.file_url, licence: L.licence, licence_id: L.licence_id, licence_url: L.url, credit_required: false,
    credit: null, content_id: 'unknown', ai_generated: false, vocals: false, checked: date, certificate: null,
    licence_seen: { quote: L.quote, url: L.read_at, date: L.read },
    limits: L.limits, modifications: 'trimmed to its first gesture, faded and levelled for the film',
    found: { by: 'sfx.mjs', catalogue: s.id, role: s.role },
  };
}

/** The kit roles that are on (a role set to null is off). */
export function kitRoles(kit) {
  return Object.entries(kit.roles || {}).filter(([, r]) => r).map(([n]) => n);
}

function readHistory(p) {
  try { const h = readJson(p); return Array.isArray(h.films) ? h.films : []; } catch { return []; }
}

function isWav(buf) {
  return buf.length > 44 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WAVE';
}

async function download(url, ms = 40000) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms), redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  return null;
}

/** The licence page still grants what the catalogue recorded (read once per run, before any download). */
async function licenceStillHolds(L) {
  const html = (await download(L.read_at, 20000)).toString('utf8');
  return new RegExp(L.notice, 'i').test(html) && /commercial/i.test(html);
}

/** The interpreter kit.py runs in: --python, else the one scripts/py.mjs finds ([exe, ...args]). */
function python(opt) {
  return opt ? [opt] : findPython({ quiet: true });
}

// ------------------------------------------------------------------------------------------------ commands
function parse(argv) {
  const a = { cmd: 'all', film: path.basename(process.cwd()), kit: 'audio/kit.json', to: 'audio/sfx', history: true, json: false };
  const known = { '--film': 'film', '--kit': 'kit', '--to': 'to', '--python': 'python', '--fixtures': 'fixtures', '--catalogue': 'catalogue', '--avoid': 'avoid', '--score': 'score' };
  const cmds = new Set(['all', 'pick', 'get', 'place', 'refine', 'list', 'licences']);
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (cmds.has(x) && i === 0) a.cmd = x;
    else if (known[x]) { if (argv[i + 1] == null) throw new Error(`${x} needs a value`); a[known[x]] = argv[++i]; }
    else if (x === '--offline') a.offline = true;
    else if (x === '--no-history') a.history = false;
    else if (x === '--json') a.json = true;
    else if (x === '--help' || x === '-h') a.cmd = 'help';
    else throw new Error(`unknown option ${x} (--help)`);
  }
  a.fixtures = a.fixtures || process.env.CINETIC_SFX_FIXTURES || null;
  return a;
}

function cmdPick(a, cat) {
  const kit = readJson(a.kit);
  const roles = kitRoles(kit);
  const hp = path.join(home(), 'sfx-history.json');
  const hist = a.history ? readHistory(hp) : [];
  const pp = path.join(a.to, 'picks.json');
  const before = existsSync(pp) ? (readJson(pp).avoid || []) : [];
  const avoid = [...new Set([...before, ...String(a.avoid || '').split(',').map((x) => x.trim()).filter(Boolean)])];
  const actions = Object.fromEntries(Object.entries(kit.cast?.roles || {}).map(([n, r]) => [n, r?.action]).filter(([, x]) => x));
  const picks = pick(cat, roles, a.film, hist, avoid, actions);
  const none = roles.filter((r) => !picks[r]);
  const doc = {
    picks: 1, film: a.film, date: today(), catalogue: cat.updated,
    roles: Object.fromEntries(Object.entries(picks).map(([r, s]) => [r, { id: s.id, role: s.role, title: s.title, file: `${s.id}.wav` }])),
    unmatched: none, fallback: [], avoid,
  };
  writeJson(pp, doc);
  if (a.history) {
    const films = readHistory(hp).filter((h) => h.film !== a.film);
    films.push({ film: a.film, date: doc.date, ids: Object.values(picks).map((s) => s.id) });
    writeJson(hp, { films: films.slice(-40) });
  }
  console.log(`sfx: ${Object.keys(picks).length} roles get a recorded effect from the catalogue (${cat.sounds.length} sounds)`
    + (none.length ? `; no catalogue kind for ${none.join(', ')} (the kit's own takes play)` : ''));
  for (const [r, s] of Object.entries(picks)) console.log(`  ${r.padEnd(18)} ${s.id.padEnd(12)} ${s.title}`);
  return doc;
}

async function cmdGet(a, cat) {
  const pp = path.join(a.to, 'picks.json');
  const doc = existsSync(pp) ? readJson(pp) : cmdPick(a, cat);
  const byId = new Map(cat.sounds.map((s) => [s.id, s]));
  const fallback = new Set();
  let checked = null;
  for (const [role, p] of Object.entries(doc.roles)) {
    const s = byId.get(p.id);
    const file = path.join(a.to, p.file);
    const rec = file.replace(/\.wav$/, '.licence.json');
    if (existsSync(file) && existsSync(rec) && readJson(rec).sha256 === sha256(readFileSync(file))) continue;
    let buf = null;
    try {
      if (a.fixtures) {
        const src = path.join(a.fixtures, `${s.id}.wav`);
        if (!existsSync(src)) throw new Error(`no fixture ${src}`);
        buf = readFileSync(src);
      } else if (a.offline) {
        throw new Error('offline');
      } else {
        if (checked === null) checked = await licenceStillHolds(cat.sources[s.source]).catch(() => false);
        if (!checked) {
          console.error(`sfx: the licence page ${cat.sources[s.source].read_at} no longer reads as recorded: refused (read it, then update the catalogue)`);
          return 1;
        }
        buf = await download(s.file_url);
      }
      if (!isWav(buf)) throw new Error('not a WAV file');
    } catch (e) {
      fallback.add(role);
      if (!a.offline) console.error(`sfx: ${s.id} for ${role}: ${e.message}`);
      continue;
    }
    mkdirSync(a.to, { recursive: true });
    writeFileSync(file, buf);
    writeJson(rec, licenceRecord(cat, s, { file: p.file, sha: sha256(buf), bytes: buf.length, date: today() }));
  }
  doc.fallback = [...fallback];
  writeJson(pp, doc);
  const got = Object.keys(doc.roles).length - fallback.size;
  console.log(`sfx: ${got} recorded effects in ${a.to} with their licence records (never committed)`);
  if (fallback.size) {
    console.log(`sfx: FALLBACK: synthesized effects play for ${[...fallback].join(', ')}`
      + ` (${a.offline ? 'offline' : 'the download failed'}): run sfx.mjs again with the network before delivery`);
  }
  return 0;
}

function cmdPlace(a, cat) {
  const doc = readJson(path.join(a.to, 'picks.json'));
  const py = python(a.python);
  if (!py) { console.error('sfx: place needs a Python with numpy, scipy and soundfile (--python; node scripts/py.mjs --check)'); return 1; }
  const skip = new Set(doc.fallback || []);
  // a role this film placed before that has no recording now (avoided, unmatched, offline) goes back to the kit's own takes
  const lockPath = path.join(a.kit.replace(/\.json$/, ''), 'real.lock.json');
  if (existsSync(lockPath)) {
    const lock = readJson(lockPath);
    const sfxDir = path.resolve(a.to);
    let dropped = 0;
    for (const [role, r] of Object.entries(lock.roles || {})) {
      const mine = r.file && path.resolve(r.file).startsWith(sfxDir + path.sep) && /^mixkit-|^[a-z]+-\d+/.test(path.basename(r.file));
      const now = doc.roles[role];
      if (mine && doc.catalogue && (!now || skip.has(role) || path.basename(r.file) !== now.file)) { delete lock.roles[role]; dropped++; }
    }
    if (dropped) writeJson(lockPath, lock);
  }
  let n = 0;
  for (const [role, p] of Object.entries(doc.roles)) {
    if (skip.has(role)) continue;
    const file = path.join(a.to, p.file);
    if (!existsSync(file)) { skip.add(role); continue; }
    const r = spawnSync(py[0], [...py.slice(1), path.join(HERE, 'kit.py'), 'real', file, '--role', role, '--kit', a.kit,
      '--licence', file.replace(/\.wav$/, '.licence.json')], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(`sfx: place ${role}: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`); return 1; }
    n++;
  }
  console.log(`sfx: ${n} roles play recorded effects (audio/kit/real.lock.json); next: npm run sound, then kit.py listen`);
  if (skip.size) console.log(`sfx: FALLBACK: synthesized effects play for ${[...skip].join(', ')}`);
  return 0;
}

/** The catalogue ids of the effects the last mix calls masked (score.py's "masked" list, by role), null without a report. */
export function maskedIds(a) {
  const sp = a.score || path.join('out', 'qa', 'score.json');
  const pp = path.join(a.to, 'picks.json');
  if (!existsSync(sp) || !existsSync(pp)) return null;
  const find = (o) => { if (!o || typeof o !== 'object') return null; if (Array.isArray(o.masked)) return o.masked; for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; };
  const masked = (find(readJson(sp)) || []).map((m) => m.role);
  // earshot's ears on the placed takes (kit.py listen): a role it flags (a cheap alternative outranks it) picks again too
  const lp = path.join(path.dirname(sp), 'kit_listen.json');
  const flagged = existsSync(lp) ? (readJson(lp).flagged || []).map((f) => String(f).split(' (')[0]) : [];
  const roles = readJson(pp).roles || {};
  return [...new Set([...masked, ...flagged].map((r) => roles[r]?.id).filter(Boolean))];
}

function cmdList(a, cat) {
  const by = {};
  for (const s of cat.sounds) (by[s.role] ||= []).push(s.id);
  if (a.json) { console.log(JSON.stringify(by, null, 1)); return 0; }
  console.log(`sfx: ${cat.sounds.length} sounds, ${Object.keys(by).length} kinds`);
  for (const [k, ids] of Object.entries(by)) console.log(`  ${k.padEnd(14)} ${String(ids.length).padStart(2)}  ${ids.join(' ')}`);
  return 0;
}

function cmdLicences(cat) {
  for (const [id, L] of Object.entries(cat.sources)) console.log(`${id}: ${L.licence} (${L.url}), read ${L.read}: credit ${L.credit ? 'required' : 'not required'}; ${L.limits}`);
  for (const x of cat.not_used || []) console.log(`not used: ${x.source}: ${x.why}`);
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  let a;
  try { a = parse(argv); } catch (e) { console.error(`sfx: ${e.message}`); return 2; }
  if (a.cmd === 'help') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
    return 0;
  }
  const cat = readJson(a.catalogue || CATALOGUE);
  if (a.cmd === 'list') return cmdList(a, cat);
  if (a.cmd === 'licences') return cmdLicences(cat);
  if (!existsSync(a.kit)) { console.error(`sfx: no ${a.kit}: run kit.py init (and kit.py cast) first`); return 2; }
  if (a.cmd === 'pick') { cmdPick(a, cat); return 0; }
  if (a.cmd === 'refine') {
    const ids = maskedIds(a);
    if (ids === null) { console.error(`sfx: refine needs the mix report (${a.score || 'out/qa/score.json'}): run the mix first`); return 2; }
    if (!ids.length) { console.log('sfx: the mix calls no recorded effect masked: nothing to pick again'); return 0; }
    console.log(`sfx: picking again for the masked effects: ${ids.join(', ')}`);
    a.avoid = [a.avoid, ...ids].filter(Boolean).join(',');
  }
  if (a.cmd === 'get') return cmdGet(a, cat);
  if (a.cmd === 'place') return cmdPlace(a, cat);
  cmdPick(a, cat);
  const g = await cmdGet(a, cat);
  return g !== 0 ? g : cmdPlace(a, cat);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(`sfx: ${e.stack || e}`); process.exit(1); });
}
