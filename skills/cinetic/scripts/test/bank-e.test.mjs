#!/usr/bin/env node
/**
 * bank-e.test.mjs: the house scenes phone-pullback, street-poster, room-push, crystal-hall and object-window
 * (src/scenes) against their contract, read from the modules (no render).
 *
 *   1. meta     id = the file's name, listed in SCENES; 1.5-3 s at 30 fps (45-90 frames) and the file's own length
 *               constant; the content it takes named; the forms it takes over and hands on are spine forms with boxes
 *               on the 1920 x 1080 stage; big or quiet; sound cues in order, inside the scene, of the plan's kinds;
 *               the leading comment carries the house-scene marker.
 *   2. lengths  every timed event lands inside the scene and in order; the street scene's length grows with its
 *               plates (one plate 45 f, four within 3 s) and each plate is on for its own frames.
 *   3. palette  each scene takes a palette and paints from it: no colour literal at all in its source, the starter's
 *               own accent never named (with no logo, the placeholder mark is repainted in the palette).
 *   4. handover the phone hands its menu on near the bottom centre after taking the mark over; the room hands the
 *               product's screen on as the whole frame; the street hands its photograph on; the crystal hands itself
 *               on centred; the window hands on the frame it pushed in to.
 *   5. numbers  the phone's pull-back runs x2.7 -> x1 with its fastest step past the middle of the move, its homography
 *               maps a box's corners exactly onto the quad and the tilted phone leans its top away; the room punches
 *               in x1.5 then x1.6 and never pulls back before the push; each street plate pulls back x1.39 onto a view
 *               where its boards span at most half the frame and the photograph still covers the stage; the crystal's
 *               camera is front-loaded (a quarter of the move in its first tenth) and the solid shows four faces
 *               front and four behind; the window arrives at x0.74 and lands square on its frame.
 *
 * crystal-hall and object-window draw fx/three on a GPU: when the starter's three.js packages are not installed their
 * module checks are skipped (and said so), their text and index checks still run.
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/bank-e.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/bank-e.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const has3D = existsSync(join(STARTER, 'node_modules', 'three', 'package.json'));
const url = (p) => pathToFileURL(join(SRC, p)).href;
const ALL = ['phone-pullback', 'street-poster', 'room-push', 'crystal-hall', 'object-window'];
const NEEDS_3D = ['crystal-hall', 'object-window'];
const FILES = ALL.filter((f) => has3D || !NEEDS_3D.includes(f));
const PROBE = `
import { FORMS } from '${url('lib/spine.ts')}';
${has3D ? `import { SCENES } from '${url('scenes/index.ts')}';` : 'const SCENES: Record<string, unknown> = {};'}
${FILES.map((f, i) => `import * as M${i} from '${url(`scenes/${f}.tsx`)}';`).join('\n')}
const mods: Record<string, any> = { ${FILES.map((f, i) => `'${f}': M${i}`).join(', ')} };
const metas: Record<string, any> = {};
for (const [f, m] of Object.entries(mods)) metas[f] = Object.entries(m).find(([k]) => k.endsWith('Meta'))?.[1] ?? null;
const PP = mods['phone-pullback'], SP = mods['street-poster'], RP = mods['room-push'], CH = mods['crystal-hall'], OW = mods['object-window'];
const range = (a: number, b: number, s = 1) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);
const quad = [[300, 200], [1500, 260], [1400, 900], [360, 980]];
const apply = (m: string, x: number, y: number) => {
  const v = m.replace(/^matrix3d\\(|\\)$/g, '').split(',').map(Number);
  const w = v[3] * x + v[7] * y + v[15];
  return [(v[0] * x + v[4] * y + v[12]) / w, (v[1] * x + v[5] * y + v[13]) / w];
};
const mat = PP.quadMatrix(800, 450, quad);
const pose = { k: 1, tilt: 28, yaw: 0, roll: 0, ox: 960, oy: 1000 };
const plate = { src: 'p.jpg', w: 1600, h: 1200, boards: [[[952, 455], [1155, 439], [1163, 529], [955, 538]]] };
console.log(JSON.stringify({
  FORMS,
  metas,
  listed: Object.keys(SCENES),
  phone: {
    C: PP.PHONE_PULLBACK,
    s: range(0, 44).map((t: number) => PP.phoneCamera(t).s),
    corners: [[0, 0], [800, 0], [800, 450], [0, 450]].map(([x, y]) => apply(mat, x, y)),
    quad,
    lean: [PP.phonePoint(0, 0, pose), PP.phonePoint(1000, 0, pose), PP.phonePoint(1000, 2060, pose), PP.phonePoint(0, 2060, pose)],
  },
  street: {
    C: SP.STREET_POSTER,
    durs: [1, 2, 3, 4].map((n) => SP.streetPosterDur(n)),
    at: [0, 17, 18, 35, 36, 59].map((t) => SP.plateAt(t, 3)),
    view: [SP.plateView(plate, 0, 18, false), SP.plateView(plate, 18, 18, false)],
    last: [SP.plateView(plate, 0, 24, true), SP.plateView(plate, 24, 24, true)],
  },
  room: { C: RP.ROOM_PUSH, z: range(0, RP.ROOM_PUSH.push[0]).map((t: number) => RP.roomZoom(t)) },
  crystal: CH ? { C: CH.CRYSTAL_HALL, cam: [0, 7.8, 78].map((t: number) => CH.crystalCamera(t)), faces: CH.crystalFaces(45, 960, 600, 1).map((f: any) => f.front) } : null,
  window: OW ? { C: OW.OBJECT_WINDOW, start: OW.windowPose(0), risen: OW.windowPose(15), landed: OW.windowPose(OW.OBJECT_WINDOW.push[1]) } : null,
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-bank-e-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
if (!has3D) {
  console.log(`skip  ${NEEDS_3D.join(', ')}: three.js is not installed in the starter (npm install), their module checks did not run`);
  const index = readFileSync(join(SRC, 'scenes', 'index.ts'), 'utf8');
  const metaName = (f) => `${f.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Meta`;
  P.listed = ALL.filter((f) => index.includes(`from './${f}'`) && index.includes(`[${metaName(f)}.id]: ${metaName(f)}`));
}
const text = Object.fromEntries(ALL.map((f) => [f, readFileSync(join(SRC, 'scenes', `${f}.tsx`), 'utf8')]));

// 1. meta
const KINDS = ['tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop', 'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text'];
const boxOk = (b) => b && P.FORMS.includes(b.form) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0 && b.x + b.w > 0 && b.x < 1920 && b.y + b.h > 0 && b.y < 1080;
const LEN = { 'phone-pullback': P.phone.C.dur, 'street-poster': P.street.durs[2], 'room-push': P.room.C.dur, 'crystal-hall': P.crystal?.C.dur, 'object-window': P.window?.C.dur };
for (const file of ALL) {
  result(/^\/\/ cinetic:house-scene\b/.test(text[file]), `${file}: its leading comment carries the house-scene marker`);
  result(P.listed.includes(file), `${file}: listed in SCENES`);
}
for (const [file, m] of Object.entries(P.metas)) {
  result(!!m && m.id === file, `${file}: exports its meta entry, id = the file's name`, m?.id);
  if (!m) continue;
  result(m.dur >= 45 && m.dur <= 90 && m.dur === LEN[file], `${file}: ${m.dur} f at 30 fps (${(m.dur / 30).toFixed(2)} s) is 1.5-3 s and the file's own length`);
  result(Array.isArray(m.props) && m.props.length > 0 && m.props.every((p) => typeof p === 'string' && p.length > 0), `${file}: names the content it takes (${m.props.join(', ')})`);
  result((m.handIn === null || boxOk(m.handIn)) && boxOk(m.handOut), `${file}: hands ${m.handIn ? m.handIn.form : 'nothing'} in, ${m.handOut?.form} out, as spine forms on the stage`);
  result(m.klass === 'big' || m.klass === 'quiet', `${file}: is ${m.klass}`);
  const cues = m.cues ?? [];
  result(cues.length > 0 && cues.every((c, i) => KINDS.includes(c.kind) && c.f >= 0 && c.f < m.dur && c.weight > 0 && c.weight <= 1 && (i === 0 || c.f >= cues[i - 1].f)), `${file}: ${cues.length} sound cues inside the scene, of the plan's kinds`, JSON.stringify(cues.map((c) => [c.f, c.kind])));
}

// 2. lengths and order
const inOrder = (xs) => xs.every((x, i) => i === 0 || x >= xs[i - 1]);
const PC = P.phone.C;
result(inOrder([PC.pull[1], PC.press]) && inOrder([PC.enter, PC.land, PC.press, PC.menu[0], PC.menu[1], PC.hover[1]]) && PC.hover[1] < PC.dur, 'phone-pullback: the pull lands, the pointer lands, presses, the menu pops and the row is reached, in order inside the scene');
const [d1, d2, d3, d4] = P.street.durs;
result(d1 === 45 && d2 >= d1 && d3 > d2 && d4 > d3 && d4 <= 90, 'street-poster: its length grows with the plates (one plate 45 f, four within 3 s)', P.street.durs.join(' '));
const at = P.street.at.map((a) => `${a.i}:${a.local}/${a.len}`).join(' ');
result(at === '0:0/18 0:17/18 1:0/18 1:17/18 2:0/24 2:23/24', 'street-poster: each plate is on for its own frames, the last for the rest', at);
const RC = P.room.C;
result(inOrder([RC.haze[1], RC.resolve[0]]) && RC.resolve[1] < RC.punch[0] && RC.punch[1] === RC.creep[0] && RC.creep[1] === RC.push[0] && RC.push[1] < RC.dur, 'room-push: the haze, the pass, the punch, the creep and the push in order, the screen held at the end');
if (P.crystal) {
  const CC = P.crystal.C;
  result(CC.fly[1] <= CC.rise[1] && CC.form[0] < CC.cone[0] && CC.cone[1] < CC.flash[0] && inOrder(CC.flash) && CC.flash[3] < CC.dur, 'crystal-hall: the sphere lands, the crystal forms, the cone drops and the crystal fills with light, in order inside the scene');
}
if (P.window) {
  const WC = P.window.C;
  result(WC.turn[1] <= WC.push[0] && inOrder([WC.enter, WC.rest, WC.click, WC.travel[0], WC.travel[1], WC.press]) && WC.press < WC.dur, 'object-window: the turn ends before the push; the pointer rests, clicks, travels and presses in order inside the scene');
}

// 3. palette: every colour from the palette, never the starter's accent
for (const file of ALL) {
  const src = text[file];
  const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const lits = [...code.matchAll(/#[0-9A-Fa-f]{3,8}\b(?![\w-])/g)].map((m) => m[0]).filter((x) => !/^#(cr|ch|p)/.test(x));
  result(/palette\?: Partial<Palette>/.test(src) && /paletteOf\(/.test(src), `${file}: takes a palette and paints from it`);
  result(lits.length === 0 && !/rgba?\(\s*\d/.test(code), `${file}: no colour literal in its code (every colour is the palette's or mixed from it)`, lits.join(' '));
  result(!/C\.accent(?!\)\.join\(P\.accent\))/.test(src) && !/#08965A/i.test(src), `${file}: never paints in the starter's own accent`);
}
for (const f of ['phone-pullback', 'object-window']) result(/SAMPLE_MARK_SVG\.split\(C\.accent\)\.join\(P\.accent\)/.test(text[f]), `${f}: with no logo the placeholder mark is repainted in the palette`);

// 4. handover forms
const M = P.metas;
const centred = (b) => Math.abs(b.x + b.w / 2 - 960) < 40;
const full = (b) => b.x === 0 && b.y === 0 && b.w === 1920 && b.h === 1080;
result(M['phone-pullback'].handIn.form === 'mark' && M['phone-pullback'].handOut.form === 'card' && centred(M['phone-pullback'].handOut) && M['phone-pullback'].handOut.y + M['phone-pullback'].handOut.h / 2 > 540, 'phone-pullback: takes the mark over and hands its menu on near the bottom centre', JSON.stringify(M['phone-pullback'].handOut));
result(M['street-poster'].handIn === null && M['street-poster'].handOut.form === 'photo' && full(M['street-poster'].handOut), 'street-poster: opens on its own photograph and hands it on');
result(M['room-push'].handIn === null && M['room-push'].handOut.form === 'window' && full(M['room-push'].handOut), 'room-push: hands the product\'s screen on as the whole frame');
if (M['crystal-hall']) result(M['crystal-hall'].handOut.form === 'mark' && centred(M['crystal-hall'].handOut), 'crystal-hall: hands the crystal (the mark inside it) on, centred');
if (M['object-window'] && P.window) {
  const o = M['object-window'].handOut;
  const L = P.window.landed;
  result(o.form === 'window' && Math.abs(o.x + o.w / 2 - L.cx) < 1 && Math.abs(o.y + o.h / 2 - L.cy) < 1 && L.s === 1, 'object-window: hands on the frame it pushed in to');
}

// 5. measured numbers
const s = P.phone.s;
const steps = s.slice(1).map((v, i) => s[i] - v);
const peak = steps.indexOf(Math.max(...steps));
result(s[0] === 2.7 && s[44] === 1 && inOrder(s.map((v) => -v)) && peak >= 22 && peak <= 34, 'phone-pullback: the pull-back runs x2.7 -> x1, never back, its fastest step past the middle', `peak at f${peak}`);
const err = Math.max(...P.phone.corners.map((c, i) => Math.hypot(c[0] - P.phone.quad[i][0], c[1] - P.phone.quad[i][1])));
result(err < 0.01, 'phone-pullback: the homography maps a box\'s corners exactly onto the quad', err.toExponential(2));
const [tl, tr, br, bl] = P.phone.lean;
result(tr[0] - tl[0] < br[0] - bl[0] && Math.abs((br[0] + bl[0]) / 2 - 960) < 0.5, 'phone-pullback: the tilted phone leans its top away (its top edge shorter than its bottom)');
const z = P.room.z;
result(z[RC.punch[0]] === 1.5 && z[RC.punch[1]] === 1.6 && inOrder(z) && z[0] === 1, 'room-push: a creep, the punch x1.5 then x1.6, never pulling back before the push', `${z[0]} ${z[RC.punch[0]]} ${z[RC.punch[1]]} ${z[z.length - 1].toFixed(3)}`);
const [v0, v1] = P.street.view;
const [l0, l1] = P.street.last;
const boardW = (v) => (1163 - 952) * v.s;
const covers = (v) => v.ox <= 0.001 && v.oy <= 0.001 && v.ox + 1600 * v.s >= 1919.99 && v.oy + 1200 * v.s >= 1079.99;
result(Math.abs(v0.z / v1.z - P.street.C.from) < 1e-6 && Math.abs(l0.z / l1.z - P.street.C.fromLast) < 1e-6, 'street-poster: each plate pulls back x1.39 (the last x1.6, eased)');
result(boardW(v1) <= 0.5 * 1920 + 1 && [v0, v1, l0, l1].every(covers), 'street-poster: the boards end at most half the frame wide and the photograph covers the stage throughout', `${boardW(v1).toFixed(0)} px`);
if (P.crystal) {
  const [c0, c10, c1] = P.crystal.cam;
  result(Math.abs(c0.s - 1.3) < 1e-9 && Math.abs(c1.s - 1) < 1e-9 && c10.q >= 0.25, 'crystal-hall: the camera pulls back x1.3 -> x1, front-loaded (a quarter of the move in its first tenth)', c10.q.toFixed(3));
  const fr = P.crystal.faces;
  result(fr.length === 8 && fr.filter(Boolean).length === 4, 'crystal-hall: the octahedron shows four faces in front and four behind');
}
if (P.window) {
  const { start, risen, landed } = P.window;
  result(Math.abs(start.s - 0.742) < 1e-9 && start.cy - risen.cy === 116 && landed.s === 1 && landed.turn === 0, 'object-window: the window arrives at x0.74 turned, rises 116 px and lands square at full size');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
