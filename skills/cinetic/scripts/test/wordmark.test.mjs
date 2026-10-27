#!/usr/bin/env node
/**
 * wordmark.test.mjs: the house end card of the Remotion starter (src/fx/Wordmark.tsx lockup).
 *
 *   1. LOCKUP_FINAL is the landed scale of the house shrink, snap and settle (0.846 x 0.5 x 0.68), and
 *      lockupBox() is where lockupState() leaves the mark.
 *   2. lockupLayout() centres mark + gap + name as one unit on the frame and reports its width share.
 *   3. The default lockup at 25, 30 and 60 fps: from the hit (the snap) to the landed name in 16-24 f at
 *      25 fps (the same seconds at the other rates), with the name rising in whole on the frame the
 *      sliding mark clears its place: on no frame (sub-frames included) is the name drawn while the mark's
 *      right edge is past the name's left edge.
 *   4. lockupState() alone brings the name in on the slide's end; 'mid' and a number still do what they say.
 *   5. The starter's own lockup (acts/Act4.tsx nameOffset): on every reveal frame the name sits level with its
 *      slot (no sideways offset, so no frame shows part of the word, its end first), rising from below the
 *      slot on the cut to home on CUE.lockup, and staying home through the hold.
 *
 * It runs src/fx/Wordmark.tsx through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/wordmark.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/wordmark.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as W from '${url('fx/Wordmark.tsx')}';
import * as A4 from '${url('acts/Act4.tsx')}';
import { CUE } from '${url('timeline.ts')}';
const out: Record<string, unknown> = { FINAL: W.LOCKUP_FINAL, HOUSE: W.LOCKUP_HOUSE };
const lay = W.lockupLayout({ cx: 960, cy: 540, nameW: 560, nameH: 96, width: 1920 });
out.layout = lay;
for (const fps of [25, 30, 60]) {
  const film = { fps, width: 1920, height: 1080 };
  const p = { at: 10, slide: lay.slide };
  const fr = W.lockupFrames(p, film);
  const clear = W.lockupClearFrame({ ...p, x: lay.x, markSize: lay.markSize }, lay.nameAt[0], 0, film);
  const rows = [];
  for (let f = 10; f <= 10 + 3 * fps; f += 0.25) {
    const auto = { ...p, wordmark: { at: clear } };
    const s = W.lockupState(f, auto, film);
    rows.push({ f, right: lay.x + s.x + (lay.markSize * s.scale) / 2, on: s.wordmark.on, t: s.wordmark.t, scale: s.scale, x: s.x });
  }
  const landed = W.lockupFrames({ ...p, wordmark: { at: clear } }, film);
  out['fps' + fps] = { fr, clear, landed, rows, box: W.lockupBox({ ...p, x: lay.x, y: lay.y, markSize: lay.markSize }) };
}
const film25 = { fps: 25, width: 1920, height: 1080 };
out.plain = W.lockupFrames({ at: 0, slide: { px: 300 } }, film25);
out.mid = W.lockupFrames({ at: 0, slide: { px: 300 }, wordmark: { at: 'mid' } }, film25);
out.num = W.lockupFrames({ at: 0, slide: { px: 300 }, wordmark: { at: 7 } }, film25);
out.noSlide = W.lockupFrames({ at: 0 }, film25);
out.act4 = { cut: CUE.lockCut, lockup: CUE.lockup, rows: Array.from({ length: CUE.lockup - CUE.lockCut + 31 }, (_, i) => ({ f: CUE.lockCut - 1 + i, ...A4.nameOffset(CUE.lockCut - 1 + i) })) };
console.log(JSON.stringify(out));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-wordmark-'));
const probeFile = join(TMP, 'probe.tsx');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1. the landed scale and box
result(close(P.FINAL, 0.846 * 0.5 * 0.68), 'LOCKUP_FINAL is 0.846 x 0.5 x 0.68 of markSize', P.FINAL.toFixed(4));
{
  const L = P.layout;
  const last = P.fps25.rows[P.fps25.rows.length - 1];
  result(close(last.scale, P.FINAL) && close(last.x, -L.slide.px), 'lockupState lands the mark at LOCKUP_FINAL after the whole slide');
  const b = P.fps25.box;
  result(close(b.w, L.box.w, 1e-6) && close(b.x, L.box.x, 1e-6) && close(b.y, L.box.y, 1e-6), 'lockupBox() is the box lockupLayout() planned', `${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}`);
}

// 2. layout: one centred unit
{
  const L = P.layout;
  const right = L.nameAt[0] + 560;
  result(close((L.box.x + right) / 2, 960), 'lockupLayout: mark + gap + name centred on the frame', `${L.box.x.toFixed(1)}..${right.toFixed(1)}`);
  result(close(L.box.w, 96) && close(L.widthShare, (96 + 0.4 * 96 + 560) / 1920), 'lockupLayout: the landed mark is the name\'s line, the width share reported', L.widthShare.toFixed(3));
  result(L.widthShare >= P.HOUSE.width[0] && L.widthShare <= P.HOUSE.width[1] && 96 / 1080 >= P.HOUSE.nameMinH, 'a 96 px name of 560 px sits in the house band (35-55 % wide, line 6.7 %+)');
}

// 3. timing and overlap at three rates
for (const fps of [25, 30, 60]) {
  const R = P['fps' + fps];
  const build = (R.landed.lock - R.fr.snap) * (25 / fps);
  result(build >= P.HOUSE.build25[0] && build <= P.HOUSE.build25[1], `${fps} fps: hit to landed name in 16-24 f at 25 fps`, `${build.toFixed(1)} f@25 (snap ${R.fr.snap}, name ${R.clear}, lock ${R.landed.lock})`);
  const overlap = R.rows.filter((s) => s.on && s.right > P.layout.nameAt[0] + 1e-6);
  result(overlap.length === 0, `${fps} fps: the name is never drawn over the sliding mark (sub-frames too)`, overlap.length ? `first at f${overlap[0].f}` : `name from f${R.clear}, slide ends f${R.fr.slideEnd}`);
  result(R.clear <= R.fr.slideEnd && R.clear > R.fr.slideStart, `${fps} fps: the name comes in during the slide, once the mark clears`);
}

// 4. lockupState alone
result(P.plain.wordmark === P.plain.slideEnd, 'lockupState alone: the name on the slide\'s end', `${P.plain.wordmark} / ${P.plain.slideEnd}`);
result(P.mid.wordmark === Math.round((P.mid.slideStart + P.mid.slideEnd) / 2) && P.num.wordmark === 7, "wordmark.at 'mid' and a number keep their meaning");
result(P.noSlide.slideEnd === P.noSlide.settled && P.noSlide.wordmark === P.noSlide.settled, 'no slide: the name follows the settle');

// 5. the starter's lockup
{
  const A = P.act4;
  const side = A.rows.filter((r) => r.x !== 0);
  result(side.length === 0, 'Act4: the name is level with its slot on every frame (the whole word or none of it, never its end first)', side.length ? `x ${side[0].x} at f${side[0].f}` : '');
  const at = (f) => A.rows.find((r) => r.f === f);
  const mono = A.rows.every((r, i) => i === 0 || r.y <= A.rows[i - 1].y + 1e-12);
  result(at(A.cut).y === 1 && at(A.lockup).y === 0 && mono && A.rows.filter((r) => r.f >= A.lockup).every((r) => r.y === 0),
    'Act4: the name rises from below its slot on the cut to home on CUE.lockup, and holds there', `cut ${at(A.cut).y}, lockup ${at(A.lockup).y}, monotone ${mono}`);
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
