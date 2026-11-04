#!/usr/bin/env node
/**
 * world-step.test.mjs: the world's one step per act (src/fx/world/Step.tsx): enter, closer, light, turn, pull-back.
 *
 *   1. worldStepMoves: the camera path of a four-act film at 30 fps: the enter push lands at the first act's end, the
 *      closer step starts just before its cut and lands at its act's end, the pull-back undoes the pushes and lands a
 *      little wider than the opening; light and turn move no camera.
 *   2. Every move starts, travels and lands: its scale never reverses, the closer and pull-back moves are fastest on
 *      their cut (they carry it), and inside every act the world never stands dead until its move lands at the act's
 *      end (no drift: nothing moves outside a declared move).
 *   3. worldStep: the enter racks soft once the element has arrived (0 -> 1, never back); light climbs the key and
 *      brightens it over its act and turns a pool of light on at its cut; the turn's flood grows from the element's
 *      centre and covers the frame in 30 f@60; any frame, any order.
 *   4. turnColorOf: a light world turns deep, a dark one pale, a given colour wins.
 *   5. worldStepDeclares: one camera shot per move (push / pull) and the turn as a colour event; stepsFromPlan reads a
 *      spine plan's steps with each act's end.
 *   6. WorldSteps draws the world with the flood over its ground after the turn and its children above.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/world-step.test.mjs [--verbose]
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
const NM = join(STARTER, 'node_modules');
const TSX = join(NM, 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/world-step.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const nm = (p) => pathToFileURL(join(NM, p)).href;
const PROBE = `
import React from '${nm('react/index.js')}';
import { renderToStaticMarkup } from '${nm('react-dom/server.node.js')}';
import { Internals } from '${nm('remotion/dist/cjs/index.js')}';
import * as WS from '${url('fx/world/Step.tsx')}';
import { plateMove } from '${url('fx/world/Plate.tsx')}';
import { FilmProvider } from '${url('lib/film.ts')}';
import * as S from '${url('lib/spine.ts')}';
const h = React.createElement;
const film = { fps: 30, width: 1920, height: 1080 } as any;
const acts = [[0, 180], [180, 420], [420, 600], [600, 720]];
const steps: WS.StepAt[] = [
  { step: 'enter', at: 0, to: 180 },
  { step: 'closer', at: 180, to: 420 },
  { step: 'turn', at: 420, to: 600, from: { x: 1300, y: 300 } },
  { step: 'pull-back', at: 600, to: 720 },
];
const lightSteps: WS.StepAt[] = [{ step: 'enter', at: 0, to: 180 }, { step: 'light', at: 180, to: 420 }, { step: 'hold', at: 420, to: 720 }];
const moves = WS.worldStepMoves(steps, film);
const track = Array.from({ length: 731 }, (_, f) => plateMove(f, moves));
const states = [0, 60, 100, 150, 179, 180, 200, 300, 419, 420, 425, 435, 440, 500, 600, 700, 720].map((f) => ({ f, ...WS.worldStep(f, steps, film) }));
const light = [170, 180, 200, 260, 330, 419].map((f) => ({ f, ...WS.worldStep(f, lightSteps, film) }));
const order = Array.from({ length: 200 }, (_, i) => (i * 37) % 740);
const a = order.map((f) => JSON.stringify(WS.worldStep(f, steps, film)));
const b = order.slice().sort((x, y) => x - y).map((f) => JSON.stringify(WS.worldStep(f, steps, film)));
const sortedIdx = order.map((f, i) => ({ f, i })).sort((x, y) => x.f - y.f);
const same = sortedIdx.every((o, k) => a[o.i] === b[k]);
const B = (n: number, beat = 0) => Math.round(((n - 1) * 4 + beat) * 15);
const plan = S.planSpine({ sentence: 'Pennant turns one sentence into a page.', element: 'request', case: { request: 'A waitlist page for my Saturday ceramics class' }, acts: [{ verb: 'asks', scenes: ['word', 'pill'] }, { verb: 'writes', scenes: ['page'] }, { verb: 'publishes', scenes: ['button', 'pill'] }, { verb: 'fills', scenes: ['notice', { form: 'count', via: 'converge' }] }] }, { fps: 30, b: B, bars: 12 });
const fromPlan = WS.stepsFromPlan(plan, { turnFrom: { x: 900, y: 500 }, rack: 40 });
const I: any = Internals;
const comp = { component: () => null, durationInFrames: 800, width: 1920, height: 1080, fps: 30, id: 'Probe', order: null, folderName: null, parentFolderName: null, schema: null, calculateMetadata: null, stack: null, defaultProps: {} };
const cm = { compositions: [comp], folders: [], currentAssetMetadata: null, currentCompositionMetadata: { defaultCodec: null, defaultOutName: null, defaultPixelFormat: null, defaultProResProfile: null, defaultSampleRate: null, defaultVideoImageFormat: null, durationInFrames: 800, fps: 30, width: 1920, height: 1080, props: {} }, canvasContent: { type: 'composition', compositionId: 'Probe' } };
const env = { isPlayer: false, isRendering: true, isStudio: false, isClientSideRendering: false, isReadOnlyStudio: false };
const rate = { playbackRate: 1, setPlaybackRate: () => {} };
const inRender = (f: number, el: any) => { const t = { frame: { Probe: f }, isPlaying: () => false, isInsideFreeze: false, audioAndVideoTags: { current: [] } }; return h(I.RemotionEnvironmentContext.Provider, { value: env }, h(I.CanUseRemotionHooksProvider, null, h(I.AbsoluteTimeContext.Provider, { value: t }, h(I.PlaybackRateContext.Provider, { value: rate }, h(I.TimelineContext.Provider, { value: t }, h(I.CompositionManager.Provider, { value: cm }, h(FilmProvider, { value: film }, el))))))); };
const draw = (f: number) => renderToStaticMarkup(inRender(f, h(WS.WorldSteps, { kind: 'deepField', steps, frame: f }, h('div', { 'data-probe': 'child' }, 'x'))));
console.log(JSON.stringify({
  moves: moves.map((m) => ({ step: m.step, from: m.from, to: m.to, scale: m.scale, y: m.y ?? 0 })),
  track: track.map((m) => [m.s, m.y]),
  states, light, same,
  colours: [WS.turnColorOf('nearWhite'), WS.turnColorOf('blackField'), WS.turnColorOf('paleSky', { color: '#123456' })],
  decl: WS.worldStepDeclares(steps, film),
  fromPlan, planActs: plan.acts.map((x) => [x.from, x.to]), planWorld: plan.world,
  markup: { before: draw(400), after: draw(500) },
  acts,
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-worldstep-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const lum = (c) => {
  const m = c.match(/rgba?\((\d+), (\d+), (\d+)/);
  if (!m) return null;
  return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
};

// 1. the camera path
const M = P.moves;
result(M.map((m) => m.step).join(' ') === 'enter closer pull-back', 'enter, closer and pull-back move the camera; light and turn do not', M.map((m) => m.step).join(' '));
result(M[0].from === 0 && M[0].to === 180 && M[0].scale === 1.07, 'the enter push (x1.07) lands at the first act\'s end', JSON.stringify(M[0]));
result(M[1].from === 175 && M[1].to === 420 && M[1].scale === 1.09 && M[1].y === 16, 'the closer step (x1.09, a rise of 16 px) starts 10 f@60 before its cut and lands at its act\'s end', JSON.stringify(M[1]));
const end = P.track[720];
result(Math.abs(end[0] - 1) < 1e-6 && Math.abs(end[1]) < 1e-6 && M[2].to === 720, `the pull-back undoes the pushes and lands at scale 1, the opening's frame (x${end[0].toFixed(4)}, y ${end[1].toFixed(2)})`);
result(T_MIN() >= 1 - 1e-9, `the world's scale never falls below 1 (it covers the frame on every frame: min x${T_MIN().toFixed(4)})`);

function T_MIN() { return Math.min(...P.track.filter(Boolean).map((x) => x[0])); }

// 2. each move starts, travels and lands; the world never stands dead inside an act
const T = P.track;
const speed = (f) => Math.abs(Math.log(T[f][0]) - Math.log(T[f - 1][0])) + Math.abs(T[f][1] - T[f - 1][1]) / 1000;
for (const m of M) {
  const seg = T.slice(m.from, m.to + 1).map((x) => x[0]);
  const dir = Math.sign(seg[seg.length - 1] - seg[0]);
  result(seg.slice(1).every((v, i) => Math.sign(v - seg[i]) === dir || Math.abs(v - seg[i]) < 1e-9), `${m.step}: its scale never reverses (${seg[0].toFixed(4)} -> ${seg[seg.length - 1].toFixed(4)})`);
}
for (const [m, cut] of [[M[1], 180], [M[2], 600]]) {
  let best = m.from + 1;
  for (let f = m.from + 1; f <= m.to; f++) if (speed(f) > speed(best)) best = f;
  result(Math.abs(best - cut) <= 2, `${m.step}: fastest on its cut (frame ${best}, cut ${cut}): it carries the cut`);
}
const still = [];
for (const [a, b] of [[1, 179], [182, 419], [602, 719]]) for (let f = a; f <= b; f++) if (!(speed(f) > 1e-7)) still.push(f);
result(!still.length, 'inside the moving acts the world never stands dead until its move lands at the act\'s end', still.slice(0, 6).join(' '));
const turnAct = [];
for (let f = 421; f <= 594; f++) if (speed(f) > 1e-9) turnAct.push(f);
result(!turnAct.length, 'the turn\'s act moves no camera (its change is the flood): no drift outside a declared move', turnAct.slice(0, 5).join(' '));

// 3. worldStep
const st = Object.fromEntries(P.states.map((s) => [s.f, s]));
result(st[0].rack === 0 && st[60].rack === 0 && st[100].rack > 0 && st[150].rack === 1 && st[700].rack === 1, `the enter racks soft once the element has arrived, never back (${[0, 60, 100, 150, 700].map((f) => st[f].rack.toFixed(2)).join(' ')})`);
result(st[419].turn === null && st[420].turn.p === 0 && st[425].turn.p > 0 && st[440].turn.p === 1 && st[440].turn.cx === 1300 && st[440].turn.cy === 300, 'the turn\'s flood grows from the element\'s centre and covers in 30 f@60', JSON.stringify([st[420].turn, st[440].turn]));
const far = Math.max(Math.hypot(1300, 300), Math.hypot(620, 300), Math.hypot(1300, 780), Math.hypot(620, 780));
result(st[440].turn.r >= far && st[700].turn.p === 1, `the flood covers the whole frame (r ${Math.round(st[440].turn.r)} >= ${Math.round(far)}) and stays the ground`);
const L = P.light;
result(L[0].glow === null && L[1].glow && L[1].key.dy === 0 && L.slice(1).every((s, i) => i === 0 || (s.key.dy < L[i].key.dy && s.key.gain > L[i].key.gain)), 'light: the key climbs and brightens over its act, a pool of light turned on at its cut', JSON.stringify(L.map((s) => [s.f, +s.key.dy.toFixed(3), +s.key.gain.toFixed(3), !!s.glow])));
result(P.same, 'worldStep is the same at any frame in any order');

// 4. colours
const [deep, pale, given] = P.colours;
result(lum(deep) < 0.1 && lum(pale) > 0.8 && given === '#123456', `turnColorOf: a light world turns deep (${deep}), a dark one pale (${pale}), a given colour wins`);

// 5. declares and the plan
const D = P.decl;
result(D.shots.length === 3 && D.shots.every((s, i) => s.from === M[i].from && s.to === M[i].to) && D.shots.map((s) => s.kind).join(' ') === 'push push pull' && D.shots.every((s) => /^world-/.test(s.id)), 'worldStepDeclares: one camera shot per move (push, push, pull)', JSON.stringify(D.shots));
result(D.colour.length === 1 && D.colour[0].from === 420 && D.colour[0].to > 435 && D.seams.length === 0, 'the turn is declared a colour event', JSON.stringify(D.colour));
const fp = P.fromPlan;
result(fp.length === 4 && fp.map((s) => s.step).join(' ') === 'enter closer turn pull-back' && fp.every((s, i) => s.at === P.planActs[i][0] && s.to === P.planActs[i][1]) && fp[2].from.x === 900 && fp[0].rack === 40, 'stepsFromPlan: the plan\'s steps on its act cuts, each landing at its act\'s end, the turn from the element', JSON.stringify(fp));

// 6. the component
result(!/clip-path:circle/.test(P.markup.before) && /clip-path:circle\(/.test(P.markup.after) && P.markup.after.includes('data-probe="child"') && P.markup.after.indexOf('clip-path:circle') < P.markup.after.indexOf('data-probe="child"'), 'WorldSteps draws the flood over the ground after the turn, the children above it');

console.log(failed ? `\n${failed} test(s) failed` : '\nall world-step tests passed');
process.exit(failed ? 1 : 0);
