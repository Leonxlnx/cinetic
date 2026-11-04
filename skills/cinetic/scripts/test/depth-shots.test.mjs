#!/usr/bin/env node
/**
 * depth-shots.test.mjs: the depth stage's camera shots (fx/depth/shots.ts) as a film calls them.
 *
 *   1. follow: a subject given as a box in scene px (a kit screen's focus box of that frame, placed) is ridden by its
 *      centre: the camera equals the one that follows that centre as a point, on every frame of the shot, moving box
 *      or still.
 *   2. shotDeclares: the moves of a path become ranges in film frames (the offset added, the rack left out) and the
 *      stage itself one range when its length is given.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/depth-shots.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STARTER = join(resolve(HERE, '..', '..'), 'assets', 'remotion-starter');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/depth-shots.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const url = pathToFileURL(join(STARTER, 'src', 'fx', 'depth', 'shots.ts')).href;
const PROBE = `
import * as S from '${url}';
const film = { fps: 60, width: 1920, height: 1080 };
const point = (g: number) => [700 + 6 * g, 520 + 0.5 * g, 0] as [number, number, number];
const box = (g: number) => ({ x: 700 + 6 * g - 40, y: 520 + 0.5 * g - 12, w: 80, h: 24 });
const a = S.camera([S.follow(10, point, { frames: 90, film })], { film });
const b = S.camera([S.follow(10, box, { frames: 90, film })], { film });
const still = S.camera([S.follow(10, () => ({ x: 900, y: 500, w: 40, h: 20 }), { frames: 60, film })], { film });
const stillP = S.camera([S.follow(10, () => [920, 510, 0] as [number, number, number], { frames: 60, film })], { film });
const frames = [0, 10, 30, 55, 80, 100, 140];
const diff = Math.max(...frames.map((f) => Math.max(...['target', 'pos'].flatMap((k) => (((a(f) as any)[k] ?? []) as number[]).map((v, i) => Math.abs(v - (((b(f) as any)[k] ?? []) as number[])[i]))), 0)));
const diffS = Math.max(...frames.map((f) => Math.max(...(((still(f) as any).target ?? []) as number[]).map((v, i) => Math.abs(v - ((stillP(f) as any).target as number[])[i])), 0)));
const moved = Math.abs((a(80) as any).target[0] - (a(10) as any).target[0]);
const path = S.camera([S.push(20, S.frame({ x: 800, y: 400, w: 200, h: 100 }, { mag: 2 }), { frames: 40, film }), S.rack(30, 'target', { frames: 20, film })], { film });
const decl = S.shotDeclares(path, { id: 'macro-1', offset: 300, frames: 120 });
console.log('@@' + JSON.stringify({ diff, diffS, moved, decl }));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-depth-shots-'));
try {
  const probe = join(TMP, 'probe.ts');
  writeFileSync(probe, PROBE);
  const r = spawnSync(process.execPath, [TSX, probe], { cwd: STARTER, encoding: 'utf8' });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
  const P = line ? JSON.parse(line.slice(2)) : null;
  if (!P) {
    result(false, 'the probe ran', (r.stderr || r.stdout || '').trim().split('\n').slice(-4).join(' | '));
  } else {
    result(P.moved > 100 && P.diff < 1e-6, 'follow: a moving box is ridden by its centre (the same camera as following that point)', `moved ${P.moved.toFixed(1)} px, largest difference ${P.diff}`);
    result(P.diffS < 1e-6, 'follow: a still box holds the camera on its centre', `largest difference ${P.diffS}`);
    const d = P.decl;
    result(d.id === 'macro-1' && d.shots.length === 1 && d.shots[0].from === 320 && d.shots[0].to === 360 && d.shots[0].kind === 'push' && d.stages.length === 1 && d.stages[0].from === 300 && d.stages[0].to === 420,
      'shotDeclares: the push as frames 320-360 (offset 300), the rack left out, the stage 300-420', JSON.stringify(d));
  }
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `depth-shots tests: ${failed} failed` : 'depth-shots tests: all pass');
process.exit(failed ? 1 : 0);
