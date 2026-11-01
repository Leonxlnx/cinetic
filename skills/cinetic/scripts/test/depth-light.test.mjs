#!/usr/bin/env node
/**
 * depth-light.test.mjs: the depth-and-light primitives of the Remotion starter against their house numbers.
 *
 *   1. lib/light: the film's one light (FILM_LIGHT, from the upper left, 34 degrees up), the key vector and its
 *      screen direction, a turned panel's normal (CSS rotateZ rotateX rotateY), the light it catches, the key in its
 *      own axes, a point's shadow on the layout plane.
 *   2. fx/Lit litState(): rests face-on (tilt 0 / 0) and holds still (no sway unless given); a declared turn of
 *      10 / -12: the rim's key end on the key side and sliding as the panel turns, the shadow thrown away from the key
 *      (longer and softer with the lift), no haze on the face (the light side lifts 5 % at most, the sheen 3 %); a sway
 *      given as an object fades out without a jump (swayFade); the entry lands face-on at 48 f at 60 fps (the same at 30).
 *   3. fx/DepthStack: planes 0.6 / 1 / 1.4, blur 6 / 0 / 10, parallax 0.5 / 1 / 1.6 (log zoom and pan at those
 *      weights), every plane facing the camera by default (farTurn 0), the near plane fading as it passes the lens, a camera that never
 *      freezes after the push, the same move at 30 and 60 fps, items arriving to their plane's scale; declares();
 *      depthFiller() lists the items that do not say what they carry.
 *   4. lib/camera: swing3d() (the one turn: 26 -> 4 degrees over 108 f at 60 fps, creeping on), cam3dCheck() (15-30
 *      degrees, one axis, at least 48 f, roll within 11), camera3d() and place() (preserve-3d, scale3d, transforms
 *      only), weighShot().
 *   5. fx/Grounds: clean by default (flat and wash put no shape on the ground, a house swing of 0.06 inside
 *      0.02-0.10, dealGrounds() deals only the clean kinds unless a film names others), shapes from a seed for the kinds
 *      a film asks for (the same seed, the same ground), the lift budget (the key gradient swings about `lift`, no
 *      shape brighter than its kind's gain), drift 6-30 px/s that never stops and loops, the camera at the background
 *      weight 0.25, soft sprites (no hard edge), groundRuns() / dealGrounds() (no ground on more than 2 consecutive
 *      shots), croppedByEdge() / cropCheck(), layerShot() at 0.25 / 0.6 / 1.
 *   6. The starter's src has no folder sharing its name with a file beside it in another case (fx/depth/ and a
 *      fx/Depth.tsx): on a case-blind disk an import of the folder would load the file.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/depth-light.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SRC = join(STARTER, 'src');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/depth-light.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as Li from '${url('lib/light.ts')}';
import * as Lt from '${url('fx/Lit.tsx')}';
import * as Ds from '${url('fx/DepthStack.tsx')}';
import * as Cm from '${url('lib/camera.ts')}';
import * as Gr from '${url('fx/Grounds.tsx')}';
const f30 = { fps: 30, width: 1920, height: 1080 };
const f60 = { fps: 60, width: 1920, height: 1080 };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const panel = { x: 960, y: 540, w: 1160, h: 740, r: 56, ground: '#35383C' };
const turned = { x: 10, y: -12 }; // a declared turn (the rest is face-on)
const flat = Lt.litState(0, panel, f60);
const rest = Lt.litState(0, { ...panel, sway: false, tilt: turned }, f60);
const flipped = Lt.litState(0, { ...panel, sway: false, tilt: { x: -10, y: 12 } }, f60);
const high = Lt.litState(0, { ...panel, sway: false, tilt: turned, lift: 72 }, f60);
// sway: the screen speed of the panel's corner, from the tilt change (px a frame)
const corner = (s: any) => { const M = Li.panelMatrix(s.tilt); const v = Li.apply3(M, [580, -370, 0]); const z = v[2] + s.lift; return [960 + (s.x - 960 + v[0]) * (2200 / (2200 - z)), 540 + (s.y - 540 + v[1]) * (2200 / (2200 - z))]; };
const sway = range(0, 420).map((f) => { const a = corner(Lt.litState(f, panel, f30)); const b = corner(Lt.litState(f + 1, panel, f30)); return Math.hypot(b[0] - a[0], b[1] - a[1]); });
const enter = (fps: number, sec: number) => Lt.litState(10 + sec * fps, { ...panel, sway: false, enter: { at: 10 } }, { fps, width: 1920, height: 1080 });
// depth stack
const items: Ds.DepthItem[] = [
  { id: 'a', plane: 'far', x: 400, y: 300, w: 400, h: 120 },
  { id: 'b', plane: 'mid', x: 960, y: 540, w: 400, h: 120, at: 20 },
  { id: 'c', plane: 'near', x: 960, y: 540, w: 400, h: 120 },
];
const stack60 = { items, cam: { moves: Ds.depthPush(10, { film: f60 }) } };
const stack30 = { items, cam: { moves: Ds.depthPush(5, { film: f30 }) } };
const S = (f: number, p: any = stack60, film: any = f60) => Ds.depthStackState(f, p, film);
const deep = { items, cam: { moves: Ds.depthPush(10, { film: f60, zoom: 1.7 }) } };
// camera 3D
const sw = Cm.swing3d({ at: 30, film: f60 });
const base = { ax: 960, ay: 540, sx: 960, sy: 540, k: 1 };
const swBase = { ...base, ...sw.start };
const swAt = (f: number) => Cm.camPath(f, swBase, sw.moves);
const chk = Cm.cam3dCheck(swBase, sw.moves, f60);
const small = Cm.cam3dCheck(base, [{ at: 0, frames: 108, yaw: 10 }], f60);
const big = Cm.cam3dCheck(base, [{ at: 0, frames: 108, yaw: 40 }], f60);
const both = Cm.cam3dCheck(base, [{ at: 0, frames: 108, yaw: 20, pitch: 14 }], f60);
const short = Cm.cam3dCheck(base, [{ at: 0, frames: 30, yaw: 20 }], f60);
const whip = Cm.swing3d({ at: 0, frames: 20, film: f60 }); // a 20 f turn built the documented way, its creep included
const shortSwing = Cm.cam3dCheck({ ...base, ...whip.start }, whip.moves, f60);
const rolled = Cm.cam3dCheck(base, [{ at: 0, frames: 108, pitch: 20, roll: 14 }], f60);
const c3 = Cm.camera3d({ ...base, k: 1.5, yaw: 12 });
const pl = Cm.place(10.5, 20.25, -100, 'rotateY(4deg)');
const wz = [Cm.weighShot({ ...base, k: 4, sx: 1060, yaw: 20 }, base, 0), Cm.weighShot({ ...base, k: 4, sx: 1060, yaw: 20 }, base, 1), Cm.weighShot({ ...base, k: 4, sx: 1060, yaw: 20 }, base, 0.5)];
// grounds
const slate = '#35383C';
const paper = '#F5F6F7';
const kinds = Gr.GROUND_KINDS;
const shapes = kinds.map((kind) => Gr.groundShapes({ kind, base: slate, seed: 3 }));
const ki = (k: string) => kinds.indexOf(k as any);
const again = Gr.groundShapes({ kind: 'pools', base: slate, seed: 3 });
const other = Gr.groundShapes({ kind: 'pools', base: slate, seed: 4 });
const gs = (f: number, g: any, film: any = f30, cam?: any) => Gr.groundState(f, g, film, cam);
const wash = { kind: 'wash' as const, base: slate, seed: 1 };
const drift = range(0, 840).map((f) => { const a = gs(f, wash).wash; const b = gs(f + 1, wash).wash; return Math.hypot(b.x - a.x, b.y - a.y) * 30; });
const pool = Gr.shapePixels({ form: 'pool', x: 0.5, y: 0.5, w: 400, h: 400, rot: 0, soft: 0, alpha: 0.5, depth: 0.2, orbit: { rx: 0, ry: 0, period: 10, phase: 0 } }, '#FFFFFF', 0.5);
const bar = Gr.shapePixels({ form: 'bar', x: 0.5, y: 0.5, w: 120, h: 800, rot: 0, soft: 90, alpha: 0.5, depth: 0.2, orbit: { rx: 0, ry: 0, period: 10, phase: 0 } }, '#FFFFFF', 0.5);
const rowA = (p: any, y: number) => range(0, p.W - 1).map((x) => p.px[(y * p.W + x) * 4 + 3]);
const colA = (p: any, x: number) => range(0, p.H - 1).map((y) => p.px[(y * p.W + x) * 4 + 3]);
const dealt = Gr.dealGrounds(24, { bases: [slate, '#45484C'], seed: 7 });
const dealt2 = Gr.dealGrounds(24, { bases: [slate, '#45484C'], seed: 7 });
const asked = Gr.dealGrounds(24, { bases: [slate, '#45484C'], seed: 7, kinds: Gr.GROUND_KINDS });
const camPan = { shot: { ...base, sx: 1360 }, base };
console.log(JSON.stringify({
  light: { house: Li.FILM_LIGHT, key: Li.toKey(), dir: Li.keyDir(), away: Li.awayAngle(), awayBelow: Li.awayAngle({ azimuth: 180 }) },
  normals: { front: Li.panelNormal({}), right: Li.panelNormal({ y: 12 }), up: Li.panelNormal({ x: 10 }), roll: Li.panelNormal({ z: 90, y: 12 }) },
  faces: { front: Li.faceLight({}), house: Li.faceShift({ x: 10, y: -12 }), away: Li.faceShift({ x: -10, y: 12 }) },
  local: { front: Li.keyLocal({}), turned: Li.keyLocal({ y: 30 }) },
  ground: Li.onGround([100, 100, 36]),
  lit: { flat: flat.tilt, rest: { tilt: rest.tilt, rim: rest.rim, shadow: rest.shadow, tone: rest.tone, sheen: rest.sheen, spill: rest.spill }, flipped: { rim: flipped.rim, shadow: flipped.shadow, tone: flipped.tone }, high: high.shadow, range: Lt.LIT.tiltRange, declares: Lt.declares(), frames: Lt.litFrames({ ...panel, enter: { at: 10 } }, f60),
    raking: Lt.litState(0, { ...panel, sway: false, tilt: { x: 14, y: -14 }, light: { ...Li.FILM_LIGHT, elevation: 12 } }, f60).tone, house: { liftMax: Lt.LIT.liftMax, sheen: Lt.LIT.sheen, reach: Lt.LIT.sheenReach } },
  sway: { min: Math.min(...sway), max: Math.max(...sway), mean: sway.reduce((a, b) => a + b, 0) / sway.length },
  swayAmount: (() => {
    const at = (F: number, sw: any) => Lt.litState(F, { ...panel, sway: sw }, f60);
    const on = at(1146, {}), off = at(1146, false), zero = at(1146, { amount: 0 }), one = at(1146, { amount: 1 });
    let step = 0;
    for (let F = 1131; F <= 1190; F++) { const a = at(F - 1, { amount: Lt.swayFade(F - 1, 1145, 1185) }), b = at(F, { amount: Lt.swayFade(F, 1145, 1185) }); step = Math.max(step, Math.hypot(b.x - a.x, b.y - a.y)); }
    return { toggle: Math.hypot(on.x - off.x, on.y - off.y), zero: zero.x === off.x && zero.y === off.y && zero.tilt.x === off.tilt.x && zero.tilt.y === off.tilt.y, one: one.x === on.x && one.y === on.y && one.tilt.x === on.tilt.x, step };
  })(),
  enter: { start: Lt.litState(10, { ...panel, sway: false, enter: { at: 10 } }, f60).opacity, home60: enter(60, 0.8), home30: enter(30, 0.8), half60: enter(60, 0.4).tilt, half30: enter(30, 0.4).tilt },
  depth: {
    house: Ds.DEPTH,
    at0: S(0).planes.map((p) => ({ plane: p.plane, k: p.shot.k, yaw: p.shot.yaw, blur: p.blur, opacity: p.opacity })),
    end: S(10 + 120).planes.map((p) => ({ plane: p.plane, k: p.shot.k, sx: p.shot.sx, yaw: p.shot.yaw, opacity: p.opacity })),
    end30: S(5 + 60, stack30, f30).planes.map((p) => ({ k: p.shot.k, sx: p.shot.sx })),
    deep: S(10 + 120, deep).planes.map((p) => p.opacity),
    nearPass: [10 + 60, 10 + 120, 10 + 720].map((f) => S(f).planes[2].opacity),
    ks: range(130, 600).map((f) => S(f).planes[1].shot.k),
    items0: S(0).items.map((i) => ({ id: i.id, scale: i.scale, opacity: i.opacity, box: i.box })),
    itemsIn: S(20 + 34).items.map((i) => ({ id: i.id, scale: i.scale, opacity: i.opacity })),
    declares: [Ds.declares({}), Ds.declares({ shutter: { from: 10, to: 40, id: 'pass' } })],
    frames: Ds.depthStackFrames(stack60, f60),
    filler: [Ds.depthFiller(items), Ds.depthFiller(items.map((i) => ({ ...i, carries: 'ui' as const }))), Ds.depthFiller([{ id: 'x', carries: 'glow' as any }])],
  },
  cam: {
    sw: { start: sw.start, moves: sw.moves.length, at29: swAt(29).yaw, landed: swAt(30 + 108).yaw, later: swAt(30 + 108 + 300).yaw, mid: swAt(30 + 54).yaw },
    chk, small, big, both, short, shortSwing, rolled, c3, pl, wz,
    house: Cm.CAM3D,
  },
  grounds: {
    counts: shapes.map((s) => s.length),
    kinds,
    clean: Gr.CLEAN_KINDS,
    plate: Gr.PLATE_KINDS,
    isClean: kinds.map((k) => Gr.isClean({ kind: k })),
    house: { lift: Gr.GROUND.lift, range: Gr.GROUND.liftRange },
    same: JSON.stringify(again) === JSON.stringify(shapes[ki('pools')]),
    differ: JSON.stringify(other) !== JSON.stringify(shapes[ki('pools')]),
    beams: shapes[ki('window')].map((s) => s.rot),
    alphasSlate: Gr.washAlphas(slate, 0.12),
    alphasPaper: Gr.washAlphas(paper, 0.12),
    peak: kinds.map((kind, i) => ({ kind, max: Math.max(0, ...shapes[i].map((s) => s.alpha)) })),
    paperShapes: Gr.groundShapes({ kind: 'wash', base: paper, seed: 1 }).length,
    drift: { min: Math.min(...drift), max: Math.max(...drift) },
    loop: [gs(0, wash).wash, gs(14 * 30, wash).wash],
    loop60: gs(14 * 60, wash, f60).wash,
    speed: gs(0, { kind: 'bars', base: slate, seed: 2 }).speed,
    pan: [gs(0, wash).wash, gs(0, wash, f30, camPan).wash],
    pool: { centre: pool.px[((pool.H >> 1) * pool.W + (pool.W >> 1)) * 4 + 3], edge: pool.px[((pool.H >> 1) * pool.W + 0) * 4 + 3], row: rowA(pool, pool.H >> 1) },
    bar: { row: rowA(bar, bar.H >> 1), col: colA(bar, bar.W >> 1) },
    runs: [Gr.groundRuns([{ kind: 'wash', base: slate }, { kind: 'wash', base: slate }, { kind: 'bars', base: slate }]), Gr.groundRuns([{ kind: 'wash', base: slate }, { kind: 'wash', base: slate }, { kind: 'wash', base: slate }, { kind: 'bars', base: slate }])],
    dealt: dealt.map((g) => g.kind + '|' + g.base + '|' + g.seed),
    dealtRuns: Gr.groundRuns(dealt),
    dealtSame: JSON.stringify(dealt) === JSON.stringify(dealt2),
    asked: asked.map((g) => g.kind),
    askedRuns: Gr.groundRuns(asked),
    crop: [Gr.croppedByEdge({ x: 1700, y: 300, w: 400, h: 200 }, f60), Gr.croppedByEdge({ x: 100, y: 100, w: 400, h: 200 }, f60), Gr.croppedByEdge({ x: 2000, y: 100, w: 400, h: 200 }, f60), Gr.croppedByEdge({ x: 300, y: 1000, w: 400, h: 400 }, f60)],
    cropCheck: [Gr.cropCheck([{ id: 'a', x: 100, y: 100, w: 300, h: 300 }], f60), Gr.cropCheck([{ id: 'a', x: 100, y: 100, w: 300, h: 300 }, { id: 'b', x: -120, y: 600, w: 500, h: 300 }], f60)],
    layers: (['bg', 'mid', 'fg'] as const).map((p) => Gr.layerShot({ ...base, sx: 1360, k: 2 }, base, p)),
    declares: Gr.declares(),
  },
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-depth-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 32 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const none = (d) => !d.stepped.length && !d.flashes.length && !d.cameraBlur.length && !d.seams.length;

// 1. the film's one light
{
  const { house, key, dir, away, awayBelow } = P.light;
  result(house.azimuth === 315 && house.elevation === 34, 'FILM_LIGHT: one key from the upper left, 34 degrees up', JSON.stringify(house));
  result(close(key[0], -0.5862, 1e-3) && close(key[1], -0.5862, 1e-3) && close(key[2], 0.5592, 1e-3), 'toKey: the house key is up-left and toward the viewer (fx/KeyLight convention)', key.map((v) => v.toFixed(4)).join(' '));
  result(dir[0] < 0 && dir[1] < 0 && away === 135 && awayBelow === 0, 'keyDir / awayAngle: lit side up-left, gradients run 135deg; a key from below runs 0deg (upward)', `${dir} ${away} ${awayBelow}`);
  const { front, right, up, roll } = P.normals;
  result(close(front[2], 1) && right[0] > 0.2 && up[1] < -0.15, 'panelNormal: front-on faces the viewer; rotateY + faces right, rotateX + faces up (CSS axes)', `${right.map((v) => v.toFixed(3))} | ${up.map((v) => v.toFixed(3))}`);
  result(roll[1] > 0.2 && Math.abs(roll[0]) < 1e-9, 'panelNormal: roll is outermost (rotateZ 90 turns the rotateY lean to face down)', roll.map((v) => v.toFixed(3)).join(' '));
  const { front: lf, house: sh, away: sa } = P.faces;
  result(close(lf, 0.5592, 1e-3) && sh > 0.1 && sa < -0.1, 'faceLight / faceShift: front-on catches sin 34; the house tilt turns toward the key, its mirror away', `${lf.toFixed(3)} ${sh.toFixed(3)} ${sa.toFixed(3)}`);
  const { front: kf, turned } = P.local;
  result(close(kf[0], key[0]) && close(kf[2], key[2]) && turned[0] < kf[0], 'keyLocal: front-on equals the key; a panel turned right sees the key further to its left', `${turned.map((v) => v.toFixed(3))}`);
  const g = P.ground;
  result(close(g[0] - 100, 36 * 1.4826 * 0.7071, 0.01) && close(g[1] - 100, g[0] - 100, 1e-6), 'onGround: a point 36 px up throws its shadow 1.48 x 36 px down-right', g.map((v) => v.toFixed(2)).join(' '));
}

// 2. Lit
{
  const L = P.lit;
  result(L.flat.x === 0 && L.flat.y === 0 && L.flat.z === 0, 'litState: rests face-on (tilt 0 / 0: a card tilted at rest reads as cheap)', JSON.stringify(L.flat));
  result(L.rest.tilt.x === 10 && L.rest.tilt.y === -12 && Math.abs(L.rest.tilt.x) >= L.range[0] && Math.abs(L.rest.tilt.y) <= L.range[1], 'litState: a declared turn of rotateX 10, rotateY -12 (inside 8-14) is kept', JSON.stringify(L.rest.tilt));
  const rr = L.rest.rim;
  result(rr.x1 < rr.x2 && rr.y1 < rr.y2 && rr.alpha > 0.5, 'litState: the rim runs from the key side (top-left) to the far side', JSON.stringify(rr));
  const fr = L.flipped.rim;
  result(Math.abs(fr.x1 - rr.x1) > 1 || Math.abs(fr.y1 - rr.y1) > 1, 'litState: the rim slides round the edge as the panel turns', `${rr.x1.toFixed(1)},${rr.y1.toFixed(1)} -> ${fr.x1.toFixed(1)},${fr.y1.toFixed(1)}`);
  result(L.rest.tone.light && !L.flipped.tone.light && L.rest.tone.alpha > 0 && L.flipped.tone.alpha > 0, 'litState: a face turned toward the key lifts, one turned away shades', `${JSON.stringify(L.rest.tone)} ${JSON.stringify(L.flipped.tone)}`);
  const s0 = L.rest.shadow;
  const s1 = L.high;
  result(s0.dx > 0 && s0.dy > 0, 'litState: the shadow falls away from the key (down-right in the panel axes)', `${s0.dx.toFixed(1)}, ${s0.dy.toFixed(1)}`);
  result(close(Math.hypot(s1.dx, s1.dy), 2 * Math.hypot(s0.dx, s0.dy), 1e-6) && s1.blur > s0.blur, 'litState: twice the lift, twice the throw and a softer penumbra', `${Math.hypot(s0.dx, s0.dy).toFixed(1)} -> ${Math.hypot(s1.dx, s1.dy).toFixed(1)}, blur ${s0.blur.toFixed(1)} -> ${s1.blur.toFixed(1)}`);
  result(L.rest.sheen.alpha > 0 && L.rest.spill.alpha > 0 && close((L.rest.spill.angle - L.rest.sheen.angle + 360) % 360, 180, 1e-6), 'litState: a sheen from the key side and the ground spill from the far side', `${L.rest.sheen.angle.toFixed(1)} / ${L.rest.spill.angle.toFixed(1)}`);
  result(L.house.liftMax <= 0.05 && L.house.sheen <= 0.03 && L.house.reach <= 0.4 && L.rest.sheen.alpha <= 0.03 && L.raking.alpha <= 0.05 + 1e-9 && L.rest.tone.alpha <= 0.05 + 1e-9,
    'litState: no haze on the face: the light side lifts 5 % at most (even turned into a raking key), the sheen 3 % along the key edge', `rest ${L.rest.tone.alpha.toFixed(3)}, raking ${L.raking.alpha.toFixed(3)}, sheen ${L.rest.sheen.alpha.toFixed(3)}`);
  const sw = P.sway;
  result(sw.max === 0, 'litState: holds still between its moves (no sway, no float, no bob by default)', `min ${sw.min.toFixed(3)} max ${sw.max.toFixed(3)} mean ${sw.mean.toFixed(3)}`);
  const A = P.swayAmount;
  result(A.toggle > 10 && A.zero && A.one && A.step < 2, 'litState: a sway given as an object fades out with sway.amount (0 = sway false, 1 = the old house drift); swayFade over 40 f moves under 2 px a frame where switching it off jumps', `toggle ${A.toggle.toFixed(1)} px, fade step ${A.step.toFixed(2)} px`);
  const E = P.enter;
  result(E.start === 0 && E.home60.tilt.x === 0 && E.home60.tilt.y === 0 && E.home30.tilt.x === 0 && E.home60.opacity === 1, 'litState: the entry starts unseen and lands face-on at 48 f at 60 fps (24 at 30)', `${E.start} ${JSON.stringify(E.home60.tilt)}`);
  result(close(E.half60.x, E.half30.x, 1e-9) && close(E.half60.y, E.half30.y, 1e-9), 'litState: the entry is the same at the same time at 30 and 60 fps', `${E.half60.x.toFixed(3)} / ${E.half30.x.toFixed(3)}`);
  result(none(L.declares) && L.frames.at === 10 && L.frames.home === 58, 'Lit: continuous, declares nothing; litFrames gives the entry and its landing', JSON.stringify(L.frames));
}

// 3. DepthStack
{
  const D = P.depth;
  const pl = D.house.planes;
  result(pl.far.scale === 0.6 && pl.mid.scale === 1 && pl.near.scale === 1.4 && pl.far.blur === 6 && pl.mid.blur === 0 && pl.near.blur === 10 && pl.far.parallax === 0.5 && pl.mid.parallax === 1 && pl.near.parallax === 1.6,
    'DEPTH: scale 0.6 / 1 / 1.4, blur 6 / 0 / 10 px, parallax 0.5 / 1 / 1.6');
  result(D.house.farTurn === 0 && D.at0.every((p) => p.yaw === 0) && D.at0.every((p) => close(p.k, 1)) && D.house.farTurnRange[0] === 8, 'depthStackState: before the move the planes sit at k 1, every plane facing the camera (a far wall turns 8-25 only when declared)', JSON.stringify(D.at0));
  const [far, mid, near] = D.end;
  const lm = Math.log(mid.k);
  result(close(Math.log(near.k) / lm, 1.6, 1e-9) && close(Math.log(far.k) / lm, 0.5, 1e-9) && mid.k > 1.25, 'depthStackState: on the push the near plane zooms at 1.6 and the far at 0.5 on log scale', `k ${far.k.toFixed(4)} / ${mid.k.toFixed(4)} / ${near.k.toFixed(4)}`);
  result(close((near.sx - 960) / (mid.sx - 960), 1.6, 1e-9) && close((far.sx - 960) / (mid.sx - 960), 0.5, 1e-9) && close(near.yaw / mid.yaw, 1.6, 1e-9), 'depthStackState: the pan and the turn split at the same weights', `sx ${far.sx.toFixed(1)} / ${mid.sx.toFixed(1)} / ${near.sx.toFixed(1)}`);
  const [nMid, nLand, nLate] = D.nearPass;
  result(nMid < 1 && nMid > 0 && nLand === 0 && nLate === 0 && near.opacity === 0 && D.deep[2] === 0 && D.deep[1] === 1, 'depthStackState: the near plane fades as the house push passes the lens and is gone when it lands (never a half-transparent veil)', `${D.nearPass.map((o) => o.toFixed(3)).join(' ')} | ${D.deep.join(' ')}`);
  const still = D.ks.some((k, i) => i > 0 && Math.abs(k - D.ks[i - 1]) < 1e-7);
  result(!still, 'depthPush: the camera creeps on after the push: never two equal frames', `k ${D.ks[0].toFixed(5)} -> ${D.ks[D.ks.length - 1].toFixed(5)}`);
  result(D.end30.every((p, i) => close(p.k, D.end[i].k, 1e-9) && close(p.sx, D.end[i].sx, 1e-6)), 'depthPush: the same move at the same time at 30 and 60 fps');
  const [a0, b0, c0] = D.items0;
  result(close(c0.box.w / 1.4, 400, 1e-9) && close(a0.box.w / 0.6, 400, 1e-9) && b0.opacity === 0 && close(b0.scale, 0.88, 1e-9), 'depthStackState: items drawn at their plane\'s scale; an item before its arrival is unseen, 12 % small', JSON.stringify(D.items0.map((i) => [i.id, i.scale, i.opacity])));
  result(D.itemsIn[1].scale === 1 && D.itemsIn[1].opacity === 1, 'depthStackState: an arrival is home at 34 f at 60 fps');
  result(none(D.declares[0]) && D.declares[1].cameraBlur.length === 1 && D.declares[1].cameraBlur[0].id === 'pass', 'DepthStack: declares nothing, or the camera-blur range it is given');
  result(D.frames.moves.length === 2 && D.frames.moves[0].at === 10 && D.frames.items[0].home === 54, 'depthStackFrames: the moves and the arrivals for the sound', JSON.stringify(D.frames));
  result(D.filler[0].join(',') === 'a,b,c' && D.filler[1].length === 0 && D.filler[2][0] === 'x', 'depthFiller: an item that does not say what it carries (ui, text, mark, icon, photo, data) is filler', JSON.stringify(D.filler));
}

// 4. the one 3D move
{
  const C = P.cam;
  result(C.sw.start.yaw === 26 && C.sw.at29 === 26 && close(C.sw.mid, 15, 3) && C.sw.landed < 4 && C.sw.landed > 2.5 && C.sw.later < C.sw.landed, 'swing3d: starts turned 26, lands near 4 at 108 f (60 fps), creeps on the same way', JSON.stringify(C.sw));
  result(C.chk.ok && C.chk.axis === 'yaw' && C.chk.deg >= 15 && C.chk.deg <= 30, 'cam3dCheck: the house turn passes (one axis, 15-30 degrees)', `${C.chk.deg.toFixed(2)} deg ${C.chk.issues.join('; ')}`);
  result(!C.small.ok && !C.big.ok && !C.both.ok && !C.short.ok && !C.rolled.ok, 'cam3dCheck: 10 or 40 degrees, two axes, a 30 f turn and a roll of 14 all fail',
    [C.small, C.big, C.both, C.short, C.rolled].map((c) => c.issues[0] ?? 'ok').join(' | '));
  result(!C.shortSwing.ok && C.shortSwing.issues.some((x) => /lasts 20 f/.test(x)), 'cam3dCheck: a 20 f swing3d fails on its turn, not saved by its 600 f creep', C.shortSwing.issues.join(' | ') || 'ok');
  result(C.c3.transformStyle === 'preserve-3d' && C.c3.transform.includes('scale3d(1.5, 1.5, 1.5)') && C.c3.transform.includes('rotateY(12deg)') && C.c3.left === 0 && C.c3.top === 0, 'camera3d: preserve-3d, scale on all three axes, left/top 0', C.c3.transform);
  result(C.pl.left === 0 && C.pl.top === 0 && C.pl.transform === 'translate3d(10.500px, 20.250px, -100.000px) rotateY(4deg)', 'place: transforms only (translate3d, then the rest)', C.pl.transform);
  const [w0, w1, wh] = C.wz;
  result(w0.k === 1 && w0.sx === 960 && w0.yaw === 0 && close(w1.k, 4) && w1.sx === 1060 && close(wh.k, 2, 1e-9) && close(wh.sx, 1010) && close(wh.yaw, 10), 'weighShot: weight 0 stays, 1 rides the camera, 0.5 takes half (zoom on log scale)', JSON.stringify(wh));
  result(C.house.deg[0] === 15 && C.house.deg[1] === 30 && C.house.perspective >= C.house.perspectiveRange[0] && C.house.perspective <= C.house.perspectiveRange[1], 'CAM3D: 15-30 degrees, perspective inside 1800-2600');
}

// 5. grounds
{
  const G = P.grounds;
  const at = (k) => G.kinds.indexOf(k);
  result(G.clean.join(',') === 'flat,wash' && G.clean.every((k) => G.counts[at(k)] === 0) && G.isClean[at('flat')] && G.isClean[at('wash')] && !G.isClean[at('pools')],
    'groundShapes: the clean kinds (flat, wash) put no shape on the ground: no plate, no pool', G.counts.join(' '));
  result(G.plate.every((k) => G.counts[at(k)] >= 1) && G.counts[at('pools')] >= 3 && G.counts[at('bars')] >= 3, 'groundShapes: a kind a film asks for has its plates; pools and bars several', G.counts.join(' '));
  result(G.house.lift === 0.06 && G.house.range[0] === 0.02 && G.house.range[1] === 0.1, 'GROUND: a house swing of 0.06 inside 0.02-0.10 (the key is felt, never seen as a glow)', JSON.stringify(G.house));
  result(G.same && G.differ, 'groundShapes: the same seed gives the same ground, another seed another');
  result(G.beams.every((r) => close(r, 45, 1e-9)), 'groundShapes: window beams slant along the light (away from the house key: 45 deg)', G.beams.join(' '));
  const sl = G.alphasSlate;
  const pa = G.alphasPaper;
  const swingSlate = sl.light * (1 - sl.L) + sl.shade * 0.3;
  const swingPaper = pa.light * (1 - pa.L) + pa.shade * 0.3;
  result(close(swingSlate, 0.12, 0.005) && close(swingPaper, 0.12, 0.005) && sl.dark && !pa.dark && pa.shade * 0.3 > pa.light * (1 - pa.L), 'washAlphas: the key gradient swings the lift (0.12 L) on slate and on paper; paper gets it mostly from shade', `${swingSlate.toFixed(3)} ${swingPaper.toFixed(3)}`);
  const budget = G.peak.every((p) => p.max * (1 - sl.L) <= 0.12 * 1.6 + 1e-6);
  result(budget, 'groundShapes: no plate changes the ground by more than its kind\'s gain x the lift', G.peak.map((p) => `${p.kind} ${(p.max * (1 - sl.L)).toFixed(3)}`).join(', '));
  result(G.paperShapes === 0, 'groundShapes: no light pool on paper (white light on white does nothing; the wash is shade there)');
  result(G.drift.min >= 6 && G.drift.max <= 30, 'groundState: the light drifts 6-30 px/s on every frame (never frozen)', `${G.drift.min.toFixed(2)}-${G.drift.max.toFixed(2)} px/s`);
  result(close(G.loop[0].x, G.loop[1].x, 1e-6) && close(G.loop[0].y, G.loop[1].y, 1e-6) && close(G.loop60.x, G.loop[0].x, 1e-6), 'groundState: the drift is a closed loop (14 s), the same at 30 and 60 fps');
  result(G.speed > 0, 'groundState: every layer of the ground moves', G.speed.toFixed(4));
  result(close(G.pan[1].x - G.pan[0].x, 100, 1e-6), 'groundState: the ground rides the camera at the background weight (a 400 px pan moves it 100)', `${(G.pan[1].x - G.pan[0].x).toFixed(2)}`);
  const step = (xs) => Math.max(...xs.slice(1).map((v, i) => Math.abs(v - xs[i])));
  result(Math.abs(G.pool.centre - 128) <= 2 && G.pool.edge <= 1 && step(G.pool.row) <= 4, 'shapePixels: a pool is a gaussian with no rim (peak at the centre, 0 at the edge, no step over 4 levels)', `centre ${G.pool.centre} edge ${G.pool.edge} step ${step(G.pool.row)}`);
  result(step(G.bar.row) <= 4 && step(G.bar.col) <= 4 && G.bar.row[0] <= 1, 'shapePixels: a bar is defocused, no hard edge across or along it', `steps ${step(G.bar.row)} / ${step(G.bar.col)}`);
  result(G.runs[0].length === 0 && G.runs[1].length === 1 && G.runs[1][0].from === 0 && G.runs[1][0].to === 2, 'groundRuns: two in a row pass, three in a row fail', JSON.stringify(G.runs));
  const kinds = new Set(G.dealt.map((d) => d.split('|')[0]));
  result(G.dealtRuns.length === 0 && [...kinds].every((k) => G.clean.includes(k)) && kinds.size === 2 && G.dealtSame, 'dealGrounds: 24 shots of the clean kinds by default, no ground on more than 2 in a row, the same deal from the same seed', `${[...kinds].join(' ')}; ${G.dealt.slice(0, 6).join(', ')}`);
  const askedKinds = new Set(G.asked);
  result(G.askedRuns.length === 0 && askedKinds.size >= 4, 'dealGrounds: the kinds a film names are dealt (4+ kinds over 24 shots, no ground on more than 2 in a row)', [...askedKinds].join(' '));
  result(G.crop[0] && !G.crop[1] && !G.crop[2] && G.crop[3], 'croppedByEdge: a box past the right or bottom edge counts; one inside or off frame does not', G.crop.join(' '));
  result(!G.cropCheck[0].ok && G.cropCheck[1].ok && G.cropCheck[1].cropped[0] === 'b', 'cropCheck: a frame needs at least one element cropped by the edge');
  const [bg, mid, fg] = G.layers;
  result(close(bg.sx, 1060) && close(mid.sx, 1200) && close(fg.sx, 1360) && close(Math.log(bg.k) / Math.log(2), 0.25, 1e-9), 'layerShot: bg 0.25, mid 0.6, fg 1.0 of the camera', `${bg.sx} ${mid.sx} ${fg.sx}`);
  result(none(G.declares), 'Grounds: continuous light, declares nothing');
}

// 6. on a case-blind disk (Windows, macOS) `import '../fx/depth'` must reach the folder's index, never a file beside it
// whose name differs only in case (a fx/Depth.tsx once answered it and tsc failed every film that followed the docs)
{
  const clashes = [];
  const walk = (dir) => {
    const names = readdirSync(dir, { withFileTypes: true });
    const files = new Set(names.filter((e) => e.isFile()).map((e) => e.name.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '').toLowerCase()));
    for (const e of names.filter((x) => x.isDirectory())) {
      if (files.has(e.name.toLowerCase())) clashes.push(`${relative(SRC, join(dir, e.name))}/ and a file of that name`);
      walk(join(dir, e.name));
    }
  };
  walk(SRC);
  result(!clashes.length, "no folder of the starter's src shares its name with a file beside it (case-blind imports resolve to one module)", clashes.join('; '));
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
