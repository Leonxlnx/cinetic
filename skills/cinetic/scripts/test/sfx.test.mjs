#!/usr/bin/env node
/**
 * sfx.test.mjs: offline tests for scripts/audio/sfx.mjs and its catalogue (scripts/audio/sfx-catalogue.json).
 * No network: the recordings are WAV files made in the test (--fixtures), the history lives under a temp
 * $CINETIC_HOME.
 *
 *   1. The catalogue: at least 60 sounds, unique ids, every field (source, page, file_url, licence, role, align,
 *      onset, loudness, tags, earshot's verdict), every source free of a credit and of an account, links only (no
 *      audio beside it), earshot's forced choice won by every sound, every kit role served by some kind.
 *   2. pick: the same film draws the same set, another film a different one, the last films' sounds held back,
 *      no sound on two roles, a sub-role read by its action (hit.logo_lock plays a lockup hit).
 *   3. get on fixtures: each pick in audio/sfx/ with its licence record (every field credits.py checks, sha256 of
 *      the file), the history written; a second get keeps the files.
 *   4. Offline: --offline leaves every role to the synthesized takes and says FALLBACK, exit 0.
 *   5. place (with a Python that imports numpy, scipy and soundfile): kit.py real --role writes real.lock.json
 *      with the recorded takes; credits.py accepts every record.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGUE, kindsFor, pick, readJson } from '../audio/sfx.mjs';
import { findPython } from '../py.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SFX = path.join(HERE, '..', 'audio', 'sfx.mjs');
let fails = 0, n = 0;
const ok = (cond, what) => { n++; if (!cond) { fails++; console.log(`  FAIL ${what}`); } };

// ------------------------------------------------------------------ 1. the catalogue
const cat = readJson(CATALOGUE);
ok(cat.sounds.length >= 60, `at least 60 sounds (${cat.sounds.length})`);
ok(new Set(cat.sounds.map((s) => s.id)).size === cat.sounds.length, 'unique ids');
for (const s of cat.sounds) {
  const L = cat.sources[s.source];
  ok(L && L.credit === false && L.account === false, `${s.id}: a source with no credit and no account`);
  ok(/^https:\/\//.test(s.file_url) && /\.wav$/.test(s.file_url) && /^https:\/\//.test(s.page), `${s.id}: page and file links`);
  ok(s.licence === s.source && L && L.licence && L.quote && /^\d{4}-\d{2}-\d{2}$/.test(L.read), `${s.id}: licence recorded as read`);
  ok(typeof s.onset_ms === 'number' && typeof s.peak_db === 'number' && s.peak_db <= 0 && typeof s.l50_db === 'number', `${s.id}: onset and loudness`);
  ok(['onset', 'peak'].includes(s.align) && Array.isArray(s.tags) && s.tags.length >= 3, `${s.id}: align and tags`);
  ok(s.ear && typeof s.ear.p === 'number' && s.ear.p >= 0.5 && s.ear.query, `${s.id}: earshot heard its role over the cheap alternatives`);
}
const kinds = new Set(cat.sounds.map((s) => s.role));
for (const k of ['whoosh.short', 'whoosh.medium', 'whoosh.long', 'click.soft', 'click.hard', 'key', 'typing', 'notification',
  'shutter', 'impact', 'sub', 'riser', 'reverse', 'glass', 'paper', 'tick', 'lockup']) ok(kinds.has(k), `kind ${k} in the catalogue`);
for (const r of Object.keys(cat.roles)) ok(kindsFor(cat, r).some((k) => kinds.has(k)), `kit role ${r} has a sound`);
const beside = readdirSync(path.dirname(CATALOGUE)).filter((f) => /\.(wav|mp3|flac|ogg|aiff?)$/i.test(f));
ok(beside.length === 0, 'no audio beside the catalogue');

// ------------------------------------------------------------------ 2. pick
const ROLES = ['tick', 'hit', 'land', 'whoosh.short', 'whoosh.long', 'riser', 'drop', 'key', 'click', 'click.confirm', 'snap', 'bell', 'hit.logo_lock', 'whoosh.long.whip'];
const a1 = pick(cat, ROLES, 'film-a'), a2 = pick(cat, ROLES, 'film-a'), b = pick(cat, ROLES, 'film-b');
const ids = (p) => ROLES.map((r) => p[r]?.id);
ok(JSON.stringify(ids(a1)) === JSON.stringify(ids(a2)), 'the same film draws the same set');
ok(ids(a1).filter((x, i) => x !== ids(b)[i]).length >= 3, 'another film draws a different set');
ok(new Set(ids(a1)).size === ROLES.length, 'every role a sound, none on two roles');
ok(a1['hit.logo_lock'].role === 'lockup' && ['whoosh.medium', 'whoosh.short'].includes(a1['whoosh.long.whip'].role), 'a sub-role read by its action');
const held = pick(cat, ROLES, 'film-c', [{ film: 'film-a', ids: ids(a1) }]);
const sizable = ROLES.filter((r) => kindsFor(cat, r).some((k) => cat.sounds.filter((s) => s.role === k).length > 4));
ok(sizable.every((r) => !ids(a1).includes(held[r].id)), "the last film's sounds held back where the kind has room");

// ------------------------------------------------------------------ 3-5. the CLI on fixtures
function wav(seconds = 0.4, sr = 48000) {   // a decaying 900 Hz click with 20 ms of quiet before it, 16-bit stereo
  const len = Math.round(seconds * sr), data = Buffer.alloc(len * 4);
  for (let i = 0; i < len; i++) {
    const t = i / sr - 0.02;
    const v = t < 0 ? 0 : Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 18) * 0.7;
    const q = Math.round(v * 32767);
    data.writeInt16LE(q, i * 4); data.writeInt16LE(q, i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8, 'latin1'); h.write('fmt ', 12, 'latin1');
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28);
  h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36, 'latin1'); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
const tmp = mkdtempSync(path.join(tmpdir(), 'cinetic-sfx-'));
const fx = path.join(tmp, 'fixtures');
mkdirSync(fx);
const w = wav();
for (const s of cat.sounds) writeFileSync(path.join(fx, `${s.id}.wav`), w);
const env = { ...process.env, CINETIC_HOME: path.join(tmp, 'home') };
delete env.CINETIC_SFX_FIXTURES;
function project(name) {
  const d = path.join(tmp, name);
  mkdirSync(path.join(d, 'audio'), { recursive: true });
  const roles = Object.fromEntries(['tick', 'hit', 'whoosh.short', 'key', 'click', 'snap', 'hit.logo_lock'].map((r) => [r, { sound: 'x/y', align: r.startsWith('whoosh') ? 'peak' : 'onset', bed_db: -6 }]));
  roles.suck = null;
  writeFileSync(path.join(d, 'audio', 'kit.json'), JSON.stringify({ kit: 1, name: 'launch', sr: 48000, roles }));
  return d;
}
const run = (cwd, args) => spawnSync(process.execPath, [SFX, ...args], { cwd, env, encoding: 'utf8' });

const p1 = project('one');
let r = run(p1, ['pick', '--film', 'one']);
ok(r.status === 0, `pick exits 0 (${r.stderr})`);
r = run(p1, ['get', '--fixtures', fx]);
ok(r.status === 0, `get on fixtures exits 0 (${r.stderr})`);
const picks = readJson(path.join(p1, 'audio', 'sfx', 'picks.json'));
ok(Object.keys(picks.roles).length === 7 && !('suck' in picks.roles), 'a pick per role that is on');
ok(picks.fallback.length === 0, 'no fallback with every file');
for (const [role, p] of Object.entries(picks.roles)) {
  const f = path.join(p1, 'audio', 'sfx', p.file), rec = f.replace(/\.wav$/, '.licence.json');
  ok(existsSync(f) && existsSync(rec), `${role}: file and licence record`);
  if (!existsSync(rec)) continue;
  const L = readJson(rec);
  ok(L.record === 1 && L.kind === 'sfx' && L.credit_required === false && L.licence === 'Mixkit Sound Effects Free License'
    && L.licence_seen?.quote && L.page && L.file_url && L.sha256?.length === 64 && L.ai_generated === false && L.vocals === false, `${role}: the record's fields`);
}
const hist = readJson(path.join(tmp, 'home', 'sfx-history.json'));
ok(hist.films.some((h) => h.film === 'one' && h.ids.length === 7), "the film's sounds in the history");
r = run(p1, ['get', '--fixtures', path.join(tmp, 'nowhere')]);
ok(r.status === 0 && !/FALLBACK/.test(r.stdout), 'a second get keeps the files it has');
const second = pick(cat, Object.keys(picks.roles), 'two', hist.films);
ok(Object.values(second).every((s) => !hist.films[0].ids.includes(s.id) || cat.sounds.filter((x) => x.role === s.role).length <= 4), "the next film avoids this film's sounds");

// refine: an effect the mix calls masked is avoided and its role picks again
const whooshBefore = picks.roles['whoosh.short'].id;
mkdirSync(path.join(p1, 'out', 'qa'), { recursive: true });
writeFileSync(path.join(p1, 'out', 'qa', 'score.json'), JSON.stringify({ sfx: { masked: [{ role: 'whoosh.short', f: 40, snr_db: -2 }] } }));
r = run(p1, ['refine', '--film', 'one', '--fixtures', fx, '--python', 'none-such-python']);
const after = readJson(path.join(p1, 'audio', 'sfx', 'picks.json'));
ok(after.roles['whoosh.short'].id !== whooshBefore && after.avoid.includes(whooshBefore), `refine picks again for a masked effect (${r.stdout.split('\n')[0]})`);
ok(after.roles.tick.id === picks.roles.tick.id, 'refine keeps the effects that were heard');
r = run(p1, ['pick', '--film', 'one']);
ok(readJson(path.join(p1, 'audio', 'sfx', 'picks.json')).roles['whoosh.short'].id !== whooshBefore, 'picks.json remembers the avoided sound');

const p2 = project('two');
r = run(p2, ['all', '--offline', '--no-history']);
ok(r.status === 0 && /FALLBACK: synthesized effects/.test(r.stdout), 'offline: exit 0 and a loud fallback');
ok(readJson(path.join(p2, 'audio', 'sfx', 'picks.json')).fallback.length === 7, 'offline: every role in "fallback"');
ok(!existsSync(path.join(p2, 'audio', 'kit', 'real.lock.json')), 'offline: no recorded takes placed');
ok(run(p2, ['bogus']).status === 2, 'an unknown option exits 2');

const found = findPython({ quiet: true });
const py = found && found.length === 1 && spawnSync(found[0], ['-c', 'import numpy, scipy, soundfile'], { encoding: 'utf8' }).status === 0 ? found[0] : null;
if (py) {
  r = run(p1, ['place', '--python', py]);
  ok(r.status === 0, `place exits 0 (${(r.stderr || '').trim().split('\n').pop()})`);
  const lock = path.join(p1, 'audio', 'kit', 'real.lock.json');
  const real = existsSync(lock) ? readJson(lock) : { roles: {} };
  ok(Object.keys(real.roles).length === 7, `real.lock.json holds the 7 roles (${Object.keys(real.roles).length})`);
  ok(Object.values(real.roles).every((x) => x.takes?.length === 3 && x.licence && x.bed_db === -6), 'three takes each, its licence and the role mix keys');
  const credits = path.join(HERE, '..', 'audio', 'credits.py');
  for (const p of Object.values(picks.roles)) {
    const f = path.join(p1, 'audio', 'sfx', p.file);
    const c = spawnSync(py, [credits, '--check', f.replace(/\.wav$/, '.licence.json'), '--track', f], { encoding: 'utf8' });
    ok(c.status === 0, `credits.py accepts ${p.file} (${(c.stdout + c.stderr).trim().split('\n').pop()})`);
  }
} else {
  console.log('  (place skipped: no Python with numpy, scipy and soundfile on the PATH)');
}

console.log(`sfx.test: ${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
