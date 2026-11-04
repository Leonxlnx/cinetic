#!/usr/bin/env node
/**
 * scene-tables.test.mjs: the house scenes that replay a measured move from its tables (src/scenes: ring-dive, key-glow,
 * gloss-orbit, orbit-chips, bar-flood, type-flip, prism-light, beat-lockup), read from the modules (no render).
 *
 *   1. meta        each scene's meta entry: its id is its file's name, 1.5-3 s at 30 fps (45-90 frames), the content
 *                  it takes named, the forms it takes over and hands on are spine forms with boxes on the 1080p stage, big
 *                  or quiet, every sound cue a sync kind inside the scene; at least half of them big.
 *   2. pure        every pure state function gives the same answer twice and at 30 and 60 fps sub-frames (finite, no
 *                  clock of its own).
 *   3. tables      the moves land where their tables say: the ring camera starts down the axis, swings to a low band
 *                  and dives past the ring plane before the name cuts on (it then brakes leftward and stops); the keys
 *                  light in order and are full by their frames; the gloss pointer presses once and the hero settles; the
 *                  chips' pills land on their slots, turn tint then white; the flood's bar grows to the whole frame on
 *                  its frame and never shrinks after its sink; the type poster builds rows in order and the call has
 *                  three rows; the prism clock never runs back and its vertices join across the cut in the hold (no
 *                  jump over 13 px); the lockup's letters land 8 frames apart at 60 fps (closer for a long name, the run
 *                  held to 64) and its length follows the name.
 *   4. subject     every scene shows its subject by frame 6 (never an empty card, page or field at its start): the
 *                  first key lights, the flood's bar stands, the chips' line is on and the first letter lands by then.
 *
 * It runs the scene modules through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/scene-tables.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SRC = join(STARTER, 'src');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/scene-tables.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const url = (p) => pathToFileURL(join(SRC, p)).href;
const IDS = ['ring-dive', 'key-glow', 'gloss-orbit', 'orbit-chips', 'bar-flood', 'type-flip', 'prism-light', 'beat-lockup'];
const PROBE = `
import { FORMS } from '${url('lib/spine.ts')}';
import * as RD from '${url('scenes/ring-dive.tsx')}';
import * as KG from '${url('scenes/key-glow.tsx')}';
import * as GO from '${url('scenes/gloss-orbit.tsx')}';
import * as OC from '${url('scenes/orbit-chips.tsx')}';
import * as BF from '${url('scenes/bar-flood.tsx')}';
import * as TF from '${url('scenes/type-flip.tsx')}';
import * as PL from '${url('scenes/prism-light.tsx')}';
import * as BL from '${url('scenes/beat-lockup.tsx')}';
const metas = [RD.ringDiveMeta, KG.keyGlowMeta, GO.glossOrbitMeta, OC.orbitChipsMeta, BF.barFloodMeta, TF.typeFlipMeta, PL.prismLightMeta, BL.beatLockupMeta];
const range = (a: number, b: number, step: number) => { const o: number[] = []; for (let t = a; t <= b + 1e-9; t += step) o.push(+t.toFixed(4)); return o; };
const sample = (fn: (t: number) => unknown, dur: number) => range(0, dur, 0.5).map((t) => fn(t));
const pure = (fn: (t: number) => unknown, dur: number) => {
  const a = JSON.stringify(sample(fn, dur));
  const b = JSON.stringify(sample(fn, dur));
  return { same: a === b, finite: !/null|NaN|Infinity/.test(a) };
};
const D = RD.RING.dur;
const ring = range(0, D, 1).map((t) => ({ t, ...RD.ringCamera(t), name: RD.ringName(t) }));
const keys = range(0, KG.KEYS.dur, 1).map((t) => ({ t, cam: KG.keyCamera(t), l: [0, 1, 2].map((i) => KG.keyLight(t, i)) }));
const gloss = range(0, GO.GLOSS.dur, 1).map((t) => ({ t, ...GO.glossState(t), p: GO.glossPointer(t) }));
const chips = range(0, 60, 0.5).map((u) => ({ u, ph: OC.ORBIT.big.map((b) => OC.bigChipPhase(u, b.at).phase) }));
const orbit = range(0, OC.ORBIT.dur, 1).map((t) => OC.orbitState(t));
const flood = range(0, BF.FLOOD.dur, 0.5).map((t) => ({ t, ...BF.floodState(t) }));
const rows = TF.posterRows('Launch', 'films that win the internet');
const call = TF.callRows('Build a product with us');
const prism = range(0, PL.PRISM.dur, 0.25).map((t) => PL.prismFrame(t));
const lockShort = BL.beatTimes('northly');
const lockLong = BL.beatTimes('a much longer product name');
console.log(JSON.stringify({
  forms: FORMS, metas,
  pure: {
    ring: pure((t) => RD.ringCamera(t), D), keys: pure((t) => KG.keyCamera(t), KG.KEYS.dur), gloss: pure((t) => GO.glossState(t), GO.GLOSS.dur),
    orbit: pure((t) => OC.orbitState(t), OC.ORBIT.dur), flood: pure((t) => BF.floodState(t), BF.FLOOD.dur), prism: pure((t) => PL.prismFrame(t), PL.PRISM.dur),
  },
  ring, keys, gloss, chips, orbit, flood, rows, call, prism, lockShort, lockLong,
  lockDur: [BL.beatLockupDur('northly'), BL.beatLockupDur('a much longer product name')],
  verts: PL.PRISM.verts, clock: PL.PRISM_CLOCK, slots: KG.KEYS.slots, big: OC.ORBIT.big, dip: OC.ORBIT.dip,
  floodFull: BF.FLOOD.full, nameAt: RD.RING.name.at, diveTo: RD.RING.dive.to, press: GO.GLOSS.pointer.press,
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-scene-tables-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const KINDS = ['tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop', 'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text'];

// 1. meta
result(P.metas.map((m) => m.id).join(' ') === IDS.join(' '), 'each scene\'s meta id is its file name', P.metas.map((m) => m.id).join(' '));
for (const m of P.metas) {
  const boxOk = (b) => b && P.forms.includes(b.form) && b.w > 0 && b.h > 0 && b.x >= -1 && b.y >= -1 && b.x + b.w <= 1921 && b.y + b.h <= 1081;
  result(m.dur >= 45 && m.dur <= 90, `${m.id}: ${m.dur} frames at 30 fps (1.5-3 s)`);
  result(m.props.length > 0 && typeof m.does === 'string' && m.does.length > 20 && ['big', 'quiet'].includes(m.klass), `${m.id}: names its content, says what it does, big or quiet`);
  result((m.handIn === null || boxOk(m.handIn)) && boxOk(m.handOut), `${m.id}: hands in ${m.handIn ? m.handIn.form : 'nothing'} and out ${m.handOut.form}, spine forms with boxes on the stage`);
  result(m.cues.length > 0 && m.cues.every((c) => KINDS.includes(c.kind) && c.f >= 0 && c.f <= m.dur && c.weight > 0 && c.id), `${m.id}: ${m.cues.length} sound cues, sync kinds inside the scene`);
}
result(P.metas.filter((m) => m.klass === 'big').length * 2 >= P.metas.length, 'at least half of them are big moments');

// 2. pure
for (const [k, v] of Object.entries(P.pure)) result(v.same && v.finite, `${k}: the same state twice, finite at every half frame`);

// 3. tables
const ring = P.ring;
const at = (t) => ring.find((s) => s.t === t);
result(at(0).phi === 90 && at(25).phi < 10 && at(40).phi < 15, 'ring: down the axis at the start, a low band (under 10 deg) by f25 that holds to the dive', `${at(0).phi} ${at(25).phi.toFixed(1)} ${at(40).phi.toFixed(1)}`);
result(at(P.diveTo).T < -1200 && at(P.nameAt).T < 0 && ring.every((s, i) => i < 41 || s.T <= ring[i - 1].T + 1e-9), 'ring: the dive pushes on one way, through the ring plane before the name cuts on');
const nm = ring.filter((s) => s.name.on);
result(nm[0].t === P.nameAt && nm.every((s, i) => i === 0 || s.name.dx <= nm[i - 1].name.dx + 1e-9) && Math.abs(nm[nm.length - 1].name.dx - nm[nm.length - 2].name.dx) < 1, 'ring: the name cuts on at its frame and brakes leftward to a stop');
const K = P.keys;
result(P.slots.every((s, i) => K.find((k) => k.t === s.full).l[i] > 0.999 && K.filter((k) => k.t < s.at).every((k) => k.l[i] === 0)), 'keys: each key dark before its frame, full on its frame');
result(K.every((k, i) => i === 0 || k.cam.s <= K[i - 1].cam.s + 0.05) && K[K.length - 1].cam.s < 0.85, 'keys: the camera pulls back to about 0.8 (never a push after the first hold)');
const G = P.gloss;
const pressed = G.filter((g) => g.p && g.p.press > 0.99).map((g) => g.t);
result(pressed.length >= 2 && pressed[0] === P.press && pressed.every((t, i) => i === 0 || t === pressed[i - 1] + 1), 'gloss: one press, on its frame');
result(Math.abs(G[G.length - 1].press - 1) < 0.01 && G[G.length - 1].s > 1.1, 'gloss: the hero settles back to rest, the camera is in');
const ph = P.chips;
result(P.big.every((b, i) => ph.find((c) => c.u === b.at).ph[i] === 'pill' && ph.find((c) => c.u === b.at + 2).ph[i] === 'tint' && ph.find((c) => c.u === b.at + 3).ph[i] === 'white'), 'chips: each pill flies 2 f, turns tint for 1 f, then white');
const O = P.orbit;
result(O.every((o, i) => i === 0 || o.angle >= O[i - 1].angle) && O[0].lineS > 1.25 && O[8].lineS < 1.05 && O[O.length - 1].dip === 1, 'chips: the orbit turns one way, the line lands from 1.29 in a few frames, the ground has dipped by the end');
const F = P.flood;
const full = F.find((s) => s.u >= P.floodFull);
result(full.box.w >= 1919 && full.box.h >= 1079 && full.full, 'flood: the bar is the whole frame on its frame', JSON.stringify(full.box));
const grow = F.filter((s) => s.u >= 13);
result(grow.every((s, i) => i === 0 || s.box.w >= grow[i - 1].box.w), 'flood: after its sink the bar only grows');
result(F.filter((s) => s.u < 4).every((s) => !s.accent) && F.filter((s) => s.u >= 4).every((s) => s.accent), 'flood: it turns to the accent on its frame and stays');
result(P.rows.length === 5 && P.rows[0].words[0] === 'Launch.' && P.rows.every((r, i) => i === 0 || Math.min(...r.at) >= Math.min(...P.rows[i - 1].at)), 'type: the poster opens on the word and builds its rows in order', JSON.stringify(P.rows.map((r) => r.words)));
result(P.call.length === 3 && P.call.flat().join(' ') === 'Build a product with us', 'type: the call is three rows of its words', JSON.stringify(P.call));
result(P.prism.every((f, i) => i === 0 || f >= P.prism[i - 1]) && P.prism[0] === 23 && P.prism[P.prism.length - 1] === 127, 'prism: the clock runs one way from the disc to the white');
const v86 = P.verts['86'];
const v111 = P.verts['111'];
const jump = Math.max(...v86.map((p, i) => Math.hypot(p[0] - v111[i][0], p[1] - v111[i][1])));
result(jump <= 13, 'prism: the hold\'s cut joins (no vertex jumps over 13 px)', jump.toFixed(1));
const gaps = (b) => b.at.slice(1).map((a, i) => +(a - b.at[i]).toFixed(3));
result(gaps(P.lockShort).every((g) => g === 8) && gaps(P.lockLong).every((g) => g < 8) && P.lockLong.at[P.lockLong.at.length - 1] - P.lockLong.at[0] <= 64, 'lockup: letters 8 f apart at 60 fps, closer for a long name, the run held to 64');
result(P.lockDur[1] > P.lockDur[0] && P.lockDur[0] >= 45 && P.lockDur[1] <= 90, 'lockup: its length follows the name, inside 1.5-3 s', P.lockDur.join(' '));

// 4. subject: on screen by frame 6, never an empty card, page or field at the scene's start
result(P.slots[0].at <= 6 && F[0].box.w > 0 && F[0].box.h > 0 && O[0].lineS > 0 && P.lockShort.at[0] <= 12, 'key-glow, bar-flood, orbit-chips, beat-lockup: the first key, the bar, the line and the first letter are on by frame 6', `${P.slots[0].at} ${F[0].box.w}x${F[0].box.h} ${O[0].lineS} ${P.lockShort.at[0] / 2}`);

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall passed');
