#!/usr/bin/env node
/**
 * moment.test.mjs: the film's one full-frame product moment (src/kit/moment.tsx).
 *
 *   1. momentPlan() puts the parts' entrances on the grid at about two starts a second (the beat, half beat
 *      or two beats nearest 0.5 s) at 60 and 30 fps and 90-140 BPM, the state change one step after the last
 *      entrance, the hold after it; an explicit step or hit wins.
 *   2. momentState(): a part is off before its frame and cuts on whole on it, its entrance runs 0..1, the
 *      state is done from the hit frame on.
 *   3. The window covers most of the frame (MOMENT.width x MOMENT.height) and a moment has at least
 *      MOMENT.minParts parts. references/update-films.md tells what the update template plays: the kit's moment
 *      while the template uses it, otherwise a line and a house scene from the scene bank per change.
 *
 * It runs src/kit through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/moment.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log('usage: node scripts/test/moment.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const PROBE = `
import * as K from '${url('kit/moment.tsx')}';
const parts = ['window', 'list', 'chart', 'button'];
const plans: Record<string, unknown> = {};
for (const fps of [60, 30]) for (const bpm of [90, 100, 120, 140]) {
  const beat = (60 * fps) / bpm;
  plans[fps + '@' + bpm] = K.momentPlan({ start: 100, parts, beat }, { fps });
}
const p = K.momentPlan({ start: 100, parts, beat: 30 }, { fps: 60 });
const st = (f: number) => { const s = K.momentState(f, p, { fps: 60 }); return { on: s.on('chart'), t: s.t('chart'), done: s.done, doneT: s.doneT }; };
console.log(JSON.stringify({
  MOMENT: K.MOMENT, plans,
  forced: K.momentPlan({ start: 0, parts, beat: 30, step: 12, hit: 90 }, { fps: 60 }),
  p, states: [st(p.parts[2].at - 1), st(p.parts[2].at), st(p.parts[2].at + 40), st(p.hit - 1), st(p.hit), st(p.hit + 40)],
  enter: K.entering(0.5, 24, 1), off: K.entering(0, 24, 1),
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-moment-'));
const probeFile = join(TMP, 'probe.tsx');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());

// 1. the plan on the grid
for (const [k, plan] of Object.entries(P.plans)) {
  const [fps, bpm] = k.split('@').map(Number);
  const beat = (60 * fps) / bpm;
  const onGrid = [beat, beat / 2, beat * 2].some((s) => Math.abs(plan.step - s) < 1e-9);
  const gaps = plan.parts.slice(1).map((q, i) => q.at - plan.parts[i].at);
  result(onGrid && plan.startsPerSec >= 1.4 && plan.startsPerSec <= 3, `${fps} fps, ${bpm} BPM: entrances on the grid at about two a second`, `step ${plan.step.toFixed(2)} f, ${plan.startsPerSec.toFixed(2)}/s, gaps ${gaps.join(',')}`);
  result(plan.hit === Math.round(plan.parts[3].at + plan.step) && plan.end > plan.hit, `${fps} fps, ${bpm} BPM: the state change one step after the last entrance, then the hold`);
}
result(P.plans['60@120'].step === 30 && P.plans['60@120'].startsPerSec === 2, '120 BPM at 60 fps: a part every beat, 2 starts a second');
result(P.forced.step === 12 && P.forced.hit === 90 && P.forced.parts[3].at === 36, 'an explicit step and hit win');

// 2. the state
const [before, on, later, preHit, hit, after] = P.states;
result(!before.on && before.t === 0 && on.on && on.t > 0 && on.t < 1 && later.t === 1, 'a part is off before its frame, cuts on whole on it and finishes its entrance', `${on.t.toFixed(3)}`);
result(!preHit.done && hit.done && hit.doneT > 0 && after.doneT === 1, 'the state changes on the hit frame');
result(P.enter.opacity === 1 && P.off.opacity === 0 && /translateY\(12\.00px\)/.test(P.enter.transform), 'entering(): full ink from the first frame, a slide home');

// 3. house numbers and docs
result(P.MOMENT.width >= 0.8 && P.MOMENT.height >= 0.7 && P.MOMENT.minParts >= 3 && P.MOMENT.band[0] <= 2 && P.MOMENT.band[1] >= 2,
  'the window covers most of the frame; a moment has 3+ parts at about 2 starts a second');
const doc = readFileSync(join(SKILL, 'references', 'update-films.md'), 'utf8');
const updSrc = join(SKILL, 'assets', 'templates', 'update', 'src');
const upd = readdirSync(updSrc, { recursive: true }).filter((f) => /\.tsx?$/.test(f)).map((f) => readFileSync(join(updSrc, f), 'utf8')).join('\n');
if (/ProductMoment|momentPlan/.test(upd)) {
  result(/ProductMoment/.test(doc) && /momentPlan/.test(doc), 'references/update-films.md documents the product moment and its kit (the update template plays it)');
} else {
  result(/one line and one house scene/.test(doc) && /`src\/scenes`/.test(doc) && !/ProductMoment|momentPlan/.test(doc),
    'references/update-films.md tells what the update template plays: one line and one house scene from the scene bank per change, no product moment');
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
