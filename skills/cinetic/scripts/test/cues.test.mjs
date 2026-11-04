#!/usr/bin/env node
/**
 * cues.test.mjs: export-cues.ts carries what a film declares into out/cues.json, where the render checks read it.
 *
 *   1. A timeline's SEAMS (the settle-out `fadeEnd` among them), SHOTS and STAGES, and src/sync.ts declares() entries
 *      holding the depth stage's camera shots and stages (the shape fx/depth shotDeclares returns), reach `declared`
 *      (top level and fx[]) with their ids, frames and each shot's kind; the summary line counts the camera shots.
 *   2. A shot whose `to` is not after its `from` stops the export and names the entry.
 *
 * It runs export-cues.ts through the starter's tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/cues.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const CUES = join(SKILL, 'scripts', 'export-cues.ts');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/cues.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-cues-'));
const timeline = (shots) => `export const FPS = 30;
export const BPM = 120;
export const TOTAL = 300;
export const PACE_NAME = 'crisp';
export const ACT = { open: { from: 0, dur: 150 }, product: { from: 150, dur: 150 } };
export const CUE = { open: 0, product: 150, land: 200 };
export const COPY = [{ id: 'line1', text: 'Plans that hold.', in: 10, resolved: 30, out: 120 }];
export const SEAMS = [{ at: 150, kind: 'whip', dir: 1, id: 'velocityCut:open-product' }, { at: 282, kind: 'fadeEnd', id: 'fadeEnd:settle-out' }];
export const SHOTS = ${JSON.stringify(shots)};
export const STAGES = [{ from: 150, to: 300, id: 'product' }];
`;
const SYNC = `export default function cues() { return [{ f: 150, kind: 'whoosh', weight: 0.8, pan: 0, id: 'cut' }]; }
export const declares = () => [{ id: 'macro-type-1', shots: [{ from: 20, to: 50, kind: 'push', id: 'type-push' }, { from: 52, to: 110, kind: 'follow', id: 'type-follow' }],
  stages: [{ from: 10, to: 140, id: 'macro-type-1' }], seams: [], stepped: [], flashes: [], cameraBlur: [] }];
`;
const run = (dir) => spawnSync(process.execPath, [TSX, CUES, '--sync', join(dir, 'src', 'sync.ts'), '--out', join(dir, 'out', 'cues.json')], { cwd: dir, encoding: 'utf8' });
const film = (name, shots) => {
  const dir = join(TMP, name);
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'timeline.ts'), timeline(shots));
  writeFileSync(join(dir, 'src', 'sync.ts'), SYNC);
  return dir;
};

try {
  // 1. the declarations reach cues.json
  const good = film('good', [{ from: 160, to: 190, kind: 'push', id: 'product-push' }]);
  const r = run(good);
  let c = null;
  try { c = JSON.parse(readFileSync(join(good, 'out', 'cues.json'), 'utf8')); } catch { /* reported below */ }
  result(r.status === 0 && !!c?.declared, 'export-cues writes declared for a timeline with seams, shots and stages', (r.stderr || r.stdout).trim().slice(0, 300));
  if (c?.declared) {
    const d = c.declared;
    result(d.seams.some((s) => s.kind === 'fadeEnd' && s.at === 282 && s.id === 'fadeEnd:settle-out'), 'the settle-out (a fadeEnd seam) reaches cues.json, so the ending is read as one', JSON.stringify(d.seams));
    result(JSON.stringify(d.shots) === JSON.stringify([{ from: 160, to: 190, id: 'product-push', kind: 'push' }]) && JSON.stringify(d.stages) === JSON.stringify([{ from: 150, to: 300, id: 'product' }]),
      "the timeline's SHOTS and STAGES reach declared.shots / declared.stages", JSON.stringify({ shots: d.shots, stages: d.stages }));
    const fx = d.fx?.[0];
    result(!!fx && fx.id === 'macro-type-1' && fx.shots.map((s) => `${s.id}:${s.kind}:${s.from}-${s.to}`).join(',') === 'type-push:push:20-50,type-follow:follow:52-110' && fx.stages.length === 1 && fx.stages[0].from === 10,
      "a stage's declares() camera shots and stage reach declared.fx[] with their kinds (forensics camera-wander reads them)", JSON.stringify(fx));
    result(/2 camera shots/.test(r.stdout), 'the summary line counts the declared camera shots', r.stdout.trim().split('\n').pop());
  }
  // 2. a shot that ends where it starts stops the export
  const bad = film('bad', [{ from: 160, to: 160, kind: 'push', id: 'flat' }]);
  const rb = run(bad);
  result(rb.status === 1 && /SHOTS\[0\]: from and to must be frames, to after from/.test(rb.stderr), 'a shot whose to is not after its from stops the export, the entry named', (rb.stderr || rb.stdout).trim().slice(0, 200));
} finally {
  rmSync(TMP, { recursive: true, force: true });
}

console.log(failed ? `cues tests: ${failed} failed` : 'cues tests: all pass');
process.exit(failed ? 1 : 0);
