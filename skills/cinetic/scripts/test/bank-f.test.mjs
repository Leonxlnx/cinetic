#!/usr/bin/env node
/**
 * bank-f.test.mjs: the giant type moments monolith-word, backlit-line and wide-line (src/scenes) and the solid
 * materials they stand in (fx/light/Material) against their contract, read from the modules (no render).
 *
 *   1. meta     id = the file's name, listed in SCENES; 1.5-3 s at 30 fps (45-90 frames) and the file's own length
 *               constant; the content it takes named; it opens on its own picture and hands a word on, a spine form on
 *               the 1920 x 1080 stage; big; sound cues in order, inside the scene, of the plan's kinds; the leading
 *               comment carries the house-scene marker.
 *   2. palette  each scene takes a palette and paints from it (no colour literal in its code), and reads the value
 *               of the ground it is given (a film keeps one ground): never a stage of its own value.
 *   3. type     each is a giant type moment: the line at 300-380 px (cap 20-26 % of the height), fitted to the width;
 *               clipped type is padded for its descenders (clipText).
 *   4. motion   never linear, never frozen: monolith's camera pulls back x2.7 -> x1 in log space, front-loaded, never
 *               back, then pushes; its orbit swings the solid's side across (the back's direction changes sign); the
 *               lights strike on past full and settle; the band crosses the face. backlit's lamp enters from off frame
 *               and passes behind the line, the front light comes up only after the shafts peak, and they die by the
 *               cut. wide-line travels a long line at x1 from its first frame, lands on the last word and pulls back
 *               to the whole line at 86 % of the width; a short line starts closer and pulls back to x1; *a span*
 *               takes the accent.
 *   5. bank     the launch template deals them (src/bank.ts: big, a giant type moment, the line verb; acts/bank.tsx
 *               draws them) and the update template plays them (deal.ts HERO_META, SCENE_SPEC, sceneFit; its sound
 *               moments; acts/scenes.tsx).
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/bank-f.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log('usage: node scripts/test/bank-f.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const ALL = ['monolith-word', 'backlit-line', 'wide-line'];
const PROBE = `
import { FORMS } from '${url('lib/spine.ts')}';
import * as MW from '${url('scenes/monolith-word.tsx')}';
import * as BL from '${url('scenes/backlit-line.tsx')}';
import * as WL from '${url('scenes/wide-line.tsx')}';
import { faceFill, sideTone } from '${url('fx/light/Material.tsx')}';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const lens = { L: 4200, W: 1920, first: 180, last: 3900, firstW: 330 };
const short = { L: 1400, W: 1920, first: 300, last: 1100, firstW: 600 };
console.log(JSON.stringify({
  FORMS,
  metas: { 'monolith-word': MW.monolithWordMeta, 'backlit-line': BL.backlitLineMeta, 'wide-line': WL.wideLineMeta },
  C: { 'monolith-word': MW.MONOLITH, 'backlit-line': BL.BACKLIT, 'wide-line': WL.WIDE },
  mono: range(0, MW.MONOLITH.dur - 1).map((t: number) => MW.monolithCamera(t)),
  back: range(0, BL.BACKLIT.dur - 1).map((t: number) => BL.backlitLight(t)),
  wide: range(0, WL.WIDE.dur - 1).map((t: number) => WL.wideCamera(t, lens)),
  wideShort: range(0, WL.WIDE.dur - 1).map((t: number) => WL.wideCamera(t, short)),
  words: [WL.wideWords('All your notes in *one calm place*'), WL.wideWords('Ship *faster*.'), WL.wideWords('Plain line here')],
  face: [faceFill('lacquer', '#3366ff', 0.5), faceFill('metal', '#cccccc', 0.5, { env: 'light', pad: [0.18, 0.32] }), faceFill('matte', '#3366ff', 0.5, { light: 0 })],
  sides: [sideTone('lacquer', '#3366ff', 0), sideTone('lacquer', '#3366ff', 1), sideTone('lacquer', '#3366ff', 0, 0.5, 'light')],
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-bank-f-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const text = Object.fromEntries(ALL.map((f) => [f, readFileSync(join(SRC, 'scenes', `${f}.tsx`), 'utf8')]));
const index = readFileSync(join(SRC, 'scenes', 'index.ts'), 'utf8');
const material = readFileSync(join(SRC, 'fx', 'light', 'Material.tsx'), 'utf8');

// 1. meta
const KINDS = ['tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop', 'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text'];
const boxOk = (b) => b && P.FORMS.includes(b.form) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0 && b.x >= 0 && b.x + b.w <= 1920 && b.y >= 0 && b.y + b.h <= 1080;
const metaName = (f) => `${f.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Meta`;
for (const file of ALL) {
  const m = P.metas[file];
  result(/^\/\/ cinetic:house-scene\b/.test(text[file]), `${file}: its leading comment carries the house-scene marker`);
  result(index.includes(`from './${file}'`) && index.includes(`[${metaName(file)}.id]: ${metaName(file)}`), `${file}: listed in SCENES`);
  result(!!m && m.id === file, `${file}: exports its meta entry, id = the file's name`, m?.id);
  if (!m) continue;
  result(m.dur >= 45 && m.dur <= 90 && m.dur === P.C[file].dur, `${file}: ${m.dur} f at 30 fps (${(m.dur / 30).toFixed(2)} s) is 1.5-3 s and the file's own length`);
  result(Array.isArray(m.props) && m.props.length > 0 && m.props.every((p) => typeof p === 'string' && p.length > 0), `${file}: names the content it takes (${m.props.join(', ')})`);
  result(m.handIn === null && boxOk(m.handOut) && m.handOut.form === 'word', `${file}: opens on its own picture and hands its word on, inside the stage`);
  result(m.klass === 'big', `${file}: is a big moment`);
  const cues = m.cues ?? [];
  result(cues.length > 0 && cues.every((c, i) => KINDS.includes(c.kind) && c.f >= 0 && c.f < m.dur && c.weight > 0 && c.weight <= 1 && (i === 0 || c.f >= cues[i - 1].f)), `${file}: ${cues.length} sound cues inside the scene, of the plan's kinds`, JSON.stringify(cues.map((c) => [c.f, c.kind])));
}

// 2. palette
for (const file of ALL) {
  const src = text[file];
  const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const lits = [...code.matchAll(/#[0-9A-Fa-f]{3,8}\b(?![\w-])/g)].map((m) => m[0]);
  result(/palette\?: Partial<Palette>/.test(src) && /paletteOf\(/.test(src), `${file}: takes a palette and paints from it`);
  result(lits.length === 0 && !/rgba?\(\s*\d/.test(code) && !/C\.accent/.test(code), `${file}: no colour literal in its code, never the starter's accent`, lits.join(' '));
  result(/toOklch\(P\.ground\)/.test(code) && /dark \?/.test(code), `${file}: reads the value of the ground it is given (dark or light) and lights its stage on it`);
}

// 3. type
const SIZES = { 'monolith-word': P.C['monolith-word'].size, 'backlit-line': P.C['backlit-line'].size, 'wide-line': P.C['wide-line'].size };
for (const file of ALL) {
  const cap = (0.73 * SIZES[file]) / 1080;
  result(SIZES[file] >= 300 && SIZES[file] <= 380 && cap >= 0.2 && cap <= 0.26, `${file}: a giant type moment, ${SIZES[file]} px (cap ${(cap * 100).toFixed(0)} % of the height)`);
}
result(/clipText\(/.test(text['backlit-line']) && /clipText\(/.test(material) && !/WebkitBackgroundClip: 'text'/.test(text['backlit-line'] + material), 'clipped type (the lit glyphs, the solid\'s face) is padded for its descenders (clipText)');
result(!/WebkitTextStroke/.test(material), 'the solid\'s bevel is an offset copy, never a text stroke (a stroke draws a variable font\'s overlapping contours)');
const [lac, metL, mat0] = P.face;
result(/linear-gradient\(104deg/.test(lac) && (lac.match(/linear-gradient/g) ?? []).length === 3, 'faceFill: lacquer is a sharp band, a broad soft one and the lit body', lac.slice(0, 80));
result((mat0.match(/linear-gradient/g) ?? []).length === 2, 'faceFill: matte has no sharp band');
result(/ 12\.00%/.test(metL), 'faceFill: on type padded for its descenders the body\'s stops stay on the line box (0 -> 12 %)', metL.slice(-140));
result(P.sides[1] !== P.sides[0] && P.sides[2] !== P.sides[0], 'sideTone: the back falls into occlusion; a white sweep bounces light into the side');

// 4. motion
const inOrder = (xs, eps = 1e-9) => xs.every((x, i) => i === 0 || x >= xs[i - 1] - eps);
const MC = P.C['monolith-word'];
const ms = P.mono.map((c) => c.s);
const pull = ms.slice(0, MC.pull + 1);
const steps = pull.slice(1).map((v, i) => pull[i] - v);
result(Math.abs(ms[0] - 2.7) < 1e-9 && Math.abs(ms[MC.pull] - 1) < 1e-9 && inOrder(pull.map((v) => -v)), 'monolith-word: the camera pulls back x2.7 -> x1, never back', ms.slice(0, 6).map((v) => v.toFixed(3)).join(' '));
result(steps.indexOf(Math.max(...steps)) <= 3 && ms[15] < 1.15, 'monolith-word: the pull-back is front-loaded (its fastest step in the first frames, near x1 by f15)', `x${ms[15].toFixed(3)} at f15`);
result(inOrder(ms.slice(MC.pull)) && ms[ms.length - 1] > 1.02, 'monolith-word: then a slow push to the cut (never frozen)', ms[ms.length - 1].toFixed(4));
const dx = P.mono.map((c) => c.dx);
result(dx[0] > 0.8 && dx[dx.length - 1] < -0.4 && inOrder(dx.map((v) => -v)), 'monolith-word: the orbit swings the solid\'s side across (the back\'s direction changes sign, never back)', `${dx[0].toFixed(2)} -> ${dx[dx.length - 1].toFixed(2)}`);
const on = P.mono.map((c) => c.on);
result(on[0] <= 0.35 && Math.max(...on) > 1.1 && Math.abs(on[on.length - 1] - 1) < 0.05, 'monolith-word: the lights strike on past full and settle', `${on[0].toFixed(2)} max ${Math.max(...on).toFixed(2)} end ${on[on.length - 1].toFixed(3)}`);
const sw = P.mono.map((c) => c.sweep);
result(sw[0] < 0 && sw[sw.length - 1] > 1 && inOrder(sw), 'monolith-word: the highlight band crosses the face');
const BC = P.C['backlit-line'];
const lamp = P.back.map((c) => c.lamp);
result(lamp[0] < 0 && lamp[BC.pass] > 0.6 && inOrder(lamp), 'backlit-line: the lamp enters from off frame and passes behind the line, never back', `${lamp[0]} -> ${lamp[BC.pass].toFixed(2)}`);
const rays = P.back.map((c) => c.rays);
const front = P.back.map((c) => c.front);
result(front.slice(0, BC.front + 1).every((v) => v === 0) && front[front.length - 1] > 0.95 && rays[rays.length - 1] < 0.1 && Math.max(...rays) > 0.95, 'backlit-line: the front light comes up after the shafts peak, and the shafts die by the cut', `rays end ${rays[rays.length - 1].toFixed(3)}`);
result(inOrder(P.back.map((c) => c.s)) && P.back[P.back.length - 1].s > 1.05, 'backlit-line: the camera pushes in to the cut');
const WC = P.C['wide-line'];
const wl = P.wide;
result(wl.slice(0, WC.travel + 1).every((c) => c.s === 1 && !c.short) && Math.abs(wl[WC.travel].cx - 3900) < 1e-6, 'wide-line: a long line travels at x1 (giant) from its first frame and lands on its last word');
result(Math.abs(wl[0].cx - 0.44 * 1920) < 1e-6, 'wide-line: its first frame is full (the line\'s left edge 6 % in, the next words running off the right)');
const fit = (WC.fit * 1920) / 4200;
result(Math.abs(wl[wl.length - 1].s - fit) / fit < 0.01 && Math.abs(wl[wl.length - 1].cx - 2100) < 25 && inOrder(wl.slice(WC.travel).map((c) => -c.s)), 'wide-line: then pulls back (log space) to the whole line at 86 % of the width', `x${wl[wl.length - 1].s.toFixed(3)}`);
const ws = P.wideShort;
result(ws[0].short && ws[0].s > 1.5 && Math.abs(ws[WC.travel].s - 1) < 1e-9 && ws[ws.length - 1].s > 1.02 && Math.abs(ws[ws.length - 1].cx - 700) < 1, 'wide-line: a short line starts closer on its first word, pulls back to x1 and keeps pushing');
const acc = P.words.map((ws) => ws.map((w) => (w.accent ? 1 : 0)).join(''));
result(acc[0] === '0000111' && acc[1] === '01' && acc[2] === '000' && P.words[1][1].w === 'faster.', 'wide-line: *a span* of one or more words takes the accent, its marks dropped', acc.join(' '));

// 5. bank: both templates play them
const T = join(SKILL, 'assets', 'templates');
const lsBank = readFileSync(join(T, 'launch-simple', 'src', 'bank.ts'), 'utf8');
const lsActs = readFileSync(join(T, 'launch-simple', 'src', 'acts', 'bank.tsx'), 'utf8');
const upDeal = readFileSync(join(T, 'update', 'src', 'deal.ts'), 'utf8');
const upTime = readFileSync(join(T, 'update', 'src', 'timeline.ts'), 'utf8');
const upActs = readFileSync(join(T, 'update', 'src', 'acts', 'scenes.tsx'), 'utf8');
for (const file of ALL) {
  const m = P.metas[file];
  const entry = lsBank.match(new RegExp(`'${file}': \\{[^\\n]*`))?.[0] ?? '';
  result(entry.includes(`dur: ${m.dur}`) && /big: true/.test(entry) && /type: true/.test(entry) && /'line'/.test(entry), `launch-simple: ${file} is in the bank (its length, big, a giant type moment, the line verb)`);
  result(lsActs.includes(`'${file}': { C:`) && lsActs.includes(`case '${file}':`), `launch-simple: acts/bank.tsx draws ${file} with the film's words`);
  result(upDeal.includes(`id: '${file}'`) && upDeal.includes(`'${file}': { dur: ${m.dur},`) && upDeal.includes(`case '${file}':`), `update: ${file} is dealt (HERO_META, SCENE_SPEC, sceneFit)`);
  result(upTime.includes(`'${file}': () => [`) && upActs.includes(`case '${file}':`) && upActs.includes(metaName(file)), `update: ${file} has its sound moments and is drawn with the change's words`);
}
result(/e\.type && stem === 'line' \? PULL\.type/.test(lsBank), 'launch-simple: a line slot pulls toward the giant type moments');

console.log(failed ? `\nbank-f: ${failed} failed` : '\nbank-f: all pass');
process.exit(failed ? 1 : 0);
