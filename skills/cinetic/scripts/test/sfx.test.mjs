#!/usr/bin/env node
/**
 * sfx.test.mjs: offline tests for scripts/audio/sfx.mjs and its catalogue (scripts/audio/sfx-catalogue.json).
 * No network: the recordings are WAV files made in the test (--fixtures), the history lives under a temp
 * $CINETIC_HOME.
 *
 *   1. The catalogue: at least 60 sounds, unique ids, every field (source, page, file_url, licence, role, align,
 *      onset, loudness, tags, earshot's verdict), every source free of a credit and of an account, links only (no
 *      audio beside it), earshot's forced choice won by every sound, every kind a role or an action lists is of
 *      its sound (IS, SOUNDS), the main kit roles served, every sound's heard lists naming every action and role
 *      its kind may play, no rejected sound left in.
 *   2. pick: the same film draws the same set, another film a different one, the last films' sounds held back,
 *      no sound on two roles, a sub-role read by its action (hit.logo_lock plays a low hit), and never a sound of
 *      another kind (a click as the pop, a key as the text note, a tone as the confirm, a cinematic sting as the
 *      logo lock), even when the catalogue's lists name one; a sound heard as the role's sound first (the test
 *      film's pop, text, logo lock, click and confirm in every film, and 19 of its 24 roles), then one never asked,
 *      then one heard as another; a role judged by its own words read by its own name.
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
import { CATALOGUE, IS, SOUNDS, heard, judgedAs, kindsFor, pick, plays, readJson, soundsFor } from '../audio/sfx.mjs';
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
for (const s of cat.sounds) {
  const asked = (ns) => [...(s.heard_as?.[ns] || []), ...(s.not_heard_as?.[ns] || [])];
  const owed = (m) => Object.entries(m).filter(([, ks]) => ks.includes(s.role)).map(([x]) => x);
  ok(s.heard_as && s.not_heard_as, `${s.id}: heard lists`);
  // taken for an action of its kind; a kind no action lists (whoosh.long), for a kit role
  const [ns, took] = owed(cat.actions).length ? ['actions', s.ear.action] : ['roles', s.ear.role];
  ok(s.heard_as?.[ns]?.includes(took) && typeof s.ear.z === 'number' && s.ear.z >= 2, `${s.id}: heard as the ${ns === 'actions' ? 'action' : 'kit role'} it was taken for`);
  ok(asked('actions').every((x) => cat.actions[x]) && asked('roles').every((x) => cat.roles[x]), `${s.id}: asked about known actions and roles`);
  ok(new Set(asked('actions')).size === asked('actions').length && new Set(asked('roles')).size === asked('roles').length, `${s.id}: heard or not, never both`);
  ok(owed(cat.actions).every((x) => asked('actions').includes(x)) && owed(cat.roles).every((x) => asked('roles').includes(x)),
    `${s.id}: asked about every action and role that lists its kind`);
}
const rejectedIds = new Set(cat.rejected.map((x) => x.id));
ok(cat.sounds.every((s) => !rejectedIds.has(s.id)) && cat.rejected.every((x) => x.role && x.why), 'a rejected sound has its reason and is not in the catalogue');
const kinds = new Set(cat.sounds.map((s) => s.role));
for (const k of ['whoosh.short', 'whoosh.medium', 'whoosh.long', 'click.soft', 'click.hard', 'key', 'typing', 'notification',
  'shutter', 'impact', 'sub', 'riser', 'reverse', 'glass', 'paper', 'tick', 'lockup', 'pop', 'note']) ok(kinds.has(k), `kind ${k} in the catalogue`);
for (const [r, ks] of Object.entries(cat.roles)) {
  ok(soundsFor(r).length > 0, `kit role ${r}: the sounds it is heard as`);
  for (const k of ks) ok(plays(k, r), `kit role ${r} lists ${k}, a ${IS[k] || k}: one of its sounds (${soundsFor(r)})`);
}
for (const [x, ks] of Object.entries(cat.actions)) {
  ok(SOUNDS.actions[x]?.length > 0, `action ${x}: the sounds it is heard as`);
  for (const k of ks) ok(plays(k, 'role', x), `action ${x} lists ${k}, a ${IS[k] || k}: one of its sounds (${SOUNDS.actions[x]})`);
}
for (const r of ['tick', 'tock', 'hit', 'land', 'land.light', 'pop', 'whoosh.short', 'whoosh.long', 'riser', 'swell', 'suck', 'drop', 'key',
  'key.return', 'click', 'click.confirm', 'snap', 'bell', 'text']) ok(kindsFor(cat, r).some((k) => kinds.has(k) && plays(k, r)), `kit role ${r} has a sound of its kind`);
ok(soundsFor('whoosh.long.whip') === SOUNDS.actions.whip && soundsFor('tick.crisp') === SOUNDS.roles.tick
  && soundsFor('hit', 'logo_lock') === SOUNDS.actions['logo-lock'] && soundsFor('nothing.known').length === 0, 'soundsFor reads like kindsFor');
ok(JSON.stringify([judgedAs('hit', 'logo_lock'), judgedAs('hit.logo_lock'), judgedAs('tick.crisp'), judgedAs('text')])
  === JSON.stringify([['actions', 'logo-lock'], ['actions', 'logo-lock'], ['roles', 'tick'], ['roles', 'text']]), 'judgedAs: the action, else the role');
const crisp = { heard_as: { actions: [], roles: ['tick.crisp'] }, not_heard_as: { actions: [], roles: ['tick'] } };
ok(heard(crisp, 'tick.crisp') === 2 && heard(crisp, 'tick') === 0 && heard({}, 'tick.crisp') === 1 && heard(crisp, 'tick.crisp', 'detent') === 1,
  'heard: a role by its own name where the sound was asked about it, else as judgedAs reads it');
const beside = readdirSync(path.dirname(CATALOGUE)).filter((f) => /\.(wav|mp3|flac|ogg|aiff?)$/i.test(f));
ok(beside.length === 0, 'no audio beside the catalogue');

// ------------------------------------------------------------------ 2. pick
const ROLES = ['tick', 'hit', 'land', 'whoosh.short', 'whoosh.long', 'riser', 'drop', 'key', 'click', 'snap', 'bell', 'hit.logo_lock', 'whoosh.long.whip'];
const a1 = pick(cat, ROLES, 'film-a'), a2 = pick(cat, ROLES, 'film-a'), b = pick(cat, ROLES, 'film-b');
const ids = (p) => ROLES.map((r) => p[r]?.id);
ok(JSON.stringify(ids(a1)) === JSON.stringify(ids(a2)), 'the same film draws the same set');
ok(ids(a1).filter((x, i) => x !== ids(b)[i]).length >= 3, 'another film draws a different set');
ok(new Set(ids(a1)).size === ROLES.length, 'every role a sound, none on two roles');
ok(['impact', 'sub'].includes(a1['hit.logo_lock'].role) && ['whoosh.medium', 'whoosh.short'].includes(a1['whoosh.long.whip'].role), 'a sub-role read by its action');
const held = pick(cat, ROLES, 'film-c', [{ film: 'film-a', ids: ids(a1) }]);
const sizable = ROLES.filter((r) => kindsFor(cat, r).some((k) => cat.sounds.filter((s) => s.role === k).length > 4));
ok(sizable.every((r) => !ids(a1).includes(held[r].id)), "the last film's sounds held back where the kind has room");

// never a sound of another kind: the Atlas film's cast drawn for many films, also from lists that name the wrong kinds
const ATLAS = { text: 'text', pop: 'appear', 'pop.shape': 'shape', 'hit.logo_lock': 'logo-lock', click: 'press', land: 'card-land', tick: 'detent', bell: 'chime' };
const loose = {
  ...cat,
  roles: { ...cat.roles, pop: ['pop', 'click.soft'], text: ['key', 'click.soft'], 'click.confirm': ['notification', 'click.hard'], 'key.return': ['click.hard', 'key'] },
  actions: { ...cat.actions, 'logo-lock': ['lockup', 'sub', 'impact'], appear: ['click.soft', 'pop'], text: ['key', 'click.soft'], shape: ['pop', 'whoosh.short'] },
};
const wrong = [];
for (let i = 0; i < 60; i++) {
  for (const c of [cat, loose]) {
    const p = pick(c, [...Object.keys(ATLAS), 'click.confirm', 'key.return'], `film-${i}`, [], [], ATLAS);
    for (const [r, s] of Object.entries(p)) if (!plays(s.role, r, ATLAS[r])) wrong.push(`${r}: ${s.id} ${s.role}`);
    if (/^click\./.test(p.pop?.role) || ['key', 'click.soft'].includes(p.text?.role) || p['hit.logo_lock']?.role === 'lockup'
      || p['click.confirm']?.role === 'notification' || p['key.return']?.role === 'click.hard') wrong.push(`film-${i}: a named wrong pick`);
  }
}
ok(wrong.length === 0, `no role takes a sound of another kind (${[...new Set(wrong)].slice(0, 4).join('; ')})`);
const lone = pick(loose, ['pop'], 'film-x');
ok(!lone.pop || lone.pop.role === 'pop', 'a pop never falls back to a click');
// the four roles the test film played wrong, and its click: a sound earshot heard as the role's sound, in every film
const unheard = [];
for (let i = 0; i < 60; i++) {
  const p = pick(cat, [...Object.keys(ATLAS), 'click.confirm'], `film-${i}`, [], [], ATLAS);
  for (const r of ['pop', 'text', 'hit.logo_lock', 'click', 'click.confirm']) if (heard(p[r], r, ATLAS[r]) !== 2) unheard.push(`${r}: ${p[r]?.id}`);
}
ok(unheard.length === 0, `pop, text, logo lock, click and confirm heard as their sound (${[...new Set(unheard)].slice(0, 4).join('; ')})`);
// every sound heard: the test film's whole cast, each role a sound heard as its sound in every film, but the roles no
// sound is heard as (tick.crisp, snap) and those whose only heard sounds an earlier role may take (tock: tick; swell
// and pop.shape: whoosh.short and each other)
const CAST = { ...ATLAS, 'whoosh.long': 'swipe', 'whoosh.long.whip': 'whip', 'land.light': 'card-land', swell: 'shape', 'swell.swell': 'swell', hit: 'reveal', riser: 'build' };
const FILM = ['tick', 'tick.crisp', 'tock', 'hit', 'land', 'land.light', 'pop', 'whoosh.short', 'whoosh.long', 'riser', 'swell', 'drop', 'key', 'key.space',
  'key.return', 'click', 'click.confirm', 'snap', 'bell', 'text', 'whoosh.long.whip', 'swell.swell', 'pop.shape', 'hit.logo_lock'];
const SHORT = new Set(['tick.crisp', 'snap', 'tock', 'swell', 'pop.shape']);
const unheardFilm = [];
for (let i = 0; i < 60; i++) {
  const p = pick(cat, FILM, `film-${i}`, [], [], CAST);
  for (const r of FILM) if (!SHORT.has(r) && heard(p[r], r, CAST[r]) !== 2) unheardFilm.push(`${r}: ${p[r]?.id}`);
}
ok(unheardFilm.length === 0, `the test film's 19 other roles heard as their sound (${[...new Set(unheardFilm)].slice(0, 4).join('; ')})`);

// heard before never asked before heard as another, a fresh sound before a recent film's, and a real one over none
// (the sounds heard as another rank best by quality and fill the TOP, so only the order of heard can pass)
const S = (id, h, p = 1) => ({ id, role: 'pop', ear: { p }, ...(h === 2 ? { heard_as: { actions: ['appear'], roles: [] } } : h === 0 ? { not_heard_as: { actions: ['appear'], roles: [] } } : {}) });
const tiny = (...ss) => ({ roles: {}, actions: { appear: ['pop'] }, sounds: ss });
const one = (c, hist = []) => pick(c, ['pop'], 'film-t', hist, [], { pop: 'appear' }).pop?.id;
const nos = [1, 2, 3, 4].map((i) => S(`no${i}`, 0));
ok(one(tiny(...nos, S('unasked', 1, 0.9), S('yes', 2, 0.6))) === 'yes' && one(tiny(...nos, S('unasked', 1, 0.9))) === 'unasked'
  && /^no/.test(one(tiny(...nos))), 'heard, then never asked, then heard as another (still a real sound)');
ok(one(tiny(...nos, S('unasked', 1, 0.6), S('yes', 2)), [{ film: 'film-s', ids: ['yes'] }]) === 'unasked'
  && one(tiny(...nos, S('yes', 2, 0.6)), [{ film: 'film-s', ids: ['yes'] }]) === 'yes', "a recent film's heard sound gives way to a fresh one, never to one heard as another");

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
