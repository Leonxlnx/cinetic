#!/usr/bin/env node
/**
 * handover.test.mjs: one element carried across a change of scene (src/lib/handover.ts, src/fx/Handover.tsx), each side
 * under its own camera.
 *
 *   1. Determinism: every kind's state at every frame and sub-frame of its span is the same computed forward,
 *      backward or in a scrambled order (closed form: any frame, any order).
 *   2. House frames: the span is lead + land of lib/spine HANDOVERS at 30 and at 60 fps (the same seconds), a lead never
 *      under its leadMin film frames (a converge: 8 at 30 fps, so its collapse reads as a move).
 *   3. Box continuity across the cut: the element is picked up exactly where the outgoing scene draws it (its box under
 *      a moving camera at t0), lands exactly where the incoming scene draws it (under another camera at t1), and no
 *      frame steps further than its neighbours, the cut frame included; the one designed jump (swell, shrink) is
 *      declared on the cut frame and hidden under blur.
 *   4. Content never scaled: each side's content keeps its layout size on every frame (sampled where its scene hands
 *      it over), and the drawn markup carries no scale on the content or the container.
 *   5. No frame without the element: every frame of a drawn handover shows a container of at least 2 px with a face
 *      or content, and the markup draws it; the scenes' own copies hide exactly inside the span.
 *   6. The swap: one-frame swaps flip on the cut, which is the most blurred frame (shrink, converge), the smallest
 *      (converge) or the fastest (fly); a fade crosses where both contents are nearly gone; a grow's cross at 30 fps
 *      has no one-frame spike (no frame's change of the contents or the shape twice both its neighbours').
 *   7. The camera kinds: zoom-into pushes into the element until it fills the frame on the cut and the next scene opens
 *      still growing; pull-out pulls both scenes about one point; momentum launches one scene and carries the next the
 *      same way. Scene-internal kinds draw nothing and keep the scenes' copies.
 *   8. Colour in OKLCH: endpoints exact, a grey takes the other colour's hue (no detour through another hue), alpha
 *      straight; cutCurve is fastest on the cut with the speed matched across it.
 *   9. Declares and the cue export: handoverDeclares gives one seam with the element's box on every frame; through
 *      scripts/export-cues.ts the seam (and the spine's seams) reach out/cues.json with their kinds, ids and the element's
 *      box track, and the SPINE_PLAN reaches it as `spine`.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/handover.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SRC = join(STARTER, 'src');
const NM = join(STARTER, 'node_modules');
const TSX = join(NM, 'tsx', 'dist', 'cli.mjs');
const CUES = join(SKILL, 'scripts', 'export-cues.ts');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/handover.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
// the specs, shared by the probe and the cue fixture
const SPECS = `
import * as Hd from '${url('lib/handover.ts')}';
import type { Shot } from '${url('lib/camera.ts')}';
export const W = 1920, H = 1080;
// two scenes, each under its own camera: the outgoing one drifts right and pushes, the incoming one pulls back
export const camA = (f: number): Shot => ({ ax: 960, ay: 540, sx: 960 + (f - 80) * 1.5, sy: 540, k: 1 + 0.002 * (f - 80) });
export const camB = (f: number): Shot => ({ ax: 960, ay: 540, sx: 960, sy: 540 - (f - 100) * 0.8, k: 0.94 + 0.0015 * (f - 100) });
const A = (b: Hd.HBox) => Hd.underShot(b, camA);
const B = (b: Hd.HBox) => Hd.underShot(b, camB);
const frame = { x: 0, y: 0, w: W, h: H };
const ink = { color: '#FFFFFF', a: 0.5, w: 1.5 };
const sh = { y: 18, blur: 40, a: 0.22 };
export const AT = 100;
export const specs: Record<string, Hd.HandoverSpec> = {
  grow: { kind: 'grow', at: AT, element: 'request', from: { form: 'pill', box: A({ x: 560, y: 480, w: 800, h: 110 }), fill: '#FFFFFF', rim: ink, shadow: sh }, to: { form: 'page', box: B({ x: 420, y: 140, w: 1080, h: 800 }), fill: '#F5F6F7', shadow: sh } },
  shrink: { kind: 'shrink', at: AT, element: 'stack', from: { form: 'card', box: A({ x: 360, y: 160, w: 1200, h: 760 }), fill: '#1C1E22' }, to: { form: 'chip', box: B({ x: 860, y: 500, w: 200, h: 64 }), fill: '#08965A' } },
  swell: { kind: 'swell', at: AT, element: 'status', from: { form: 'chip', box: A({ x: 860, y: 506, w: 200, h: 68 }), fill: '#08965A' }, to: { form: 'button', box: B({ x: 780, y: 490, w: 360, h: 100 }), fill: '#1C1E22' } },
  'press-open': { kind: 'press-open', at: AT, element: 'send', from: { form: 'button', box: A({ x: 900, y: 480, w: 120, h: 120 }), fill: '#08965A' }, to: { form: 'window', box: B({ x: 460, y: 190, w: 1000, h: 700 }), fill: '#F5F6F7' } },
  iris: { kind: 'iris', at: AT, element: 'dot', from: { form: 'button', box: A({ x: 920, y: 500, w: 80, h: 80 }), fill: '#FFFFFF' }, to: { form: 'world', box: frame, fill: '#35383C' } },
  fly: { kind: 'fly', at: AT, element: 'live', from: { form: 'pill', box: A({ x: 700, y: 600, w: 520, h: 90 }), fill: '#08965A' }, to: { form: 'notice', box: B({ x: 1240, y: 120, w: 560, h: 130 }), fill: '#FFFFFF', shadow: sh } },
  converge: { kind: 'converge', at: AT, element: 'signups', from: { form: 'notice', box: A({ x: 660, y: 300, w: 600, h: 120 }), fill: '#FFFFFF', many: [A({ x: 660, y: 300, w: 600, h: 120 }), A({ x: 660, y: 440, w: 600, h: 120 }), A({ x: 660, y: 580, w: 600, h: 120 })] }, to: { form: 'count', box: B({ x: 800, y: 420, w: 320, h: 240 }), fill: '#1C1E22' } },
  'zoom-into': { kind: 'zoom-into', at: AT, element: 'screen', from: { form: 'window', box: A({ x: 660, y: 340, w: 600, h: 400 }) }, to: { form: 'world', box: frame } },
  'pull-out': { kind: 'pull-out', at: AT, element: 'mark', from: { form: 'mark', box: A({ x: 510, y: 90, w: 900, h: 900 }) }, to: { form: 'mark', box: B({ x: 880, y: 460, w: 160, h: 160 }) } },
  momentum: { kind: 'momentum', at: AT, element: 'payments', from: { form: 'notice', box: A({ x: 660, y: 480, w: 600, h: 120 }) }, to: { form: 'notice', box: B({ x: 660, y: 480, w: 600, h: 120 }) } },
  stay: { kind: 'stay', at: AT, element: 'card', from: { form: 'card', box: A({ x: 700, y: 300, w: 520, h: 480 }) }, to: { form: 'card', box: B({ x: 700, y: 300, w: 520, h: 480 }) } },
  word: { kind: 'word', at: AT, element: 'word', from: { form: 'word', box: A({ x: 840, y: 500, w: 240, h: 80 }), fill: 'rgba(255, 255, 255, 0)' }, to: { form: 'word', box: B({ x: 660, y: 420, w: 600, h: 200 }), fill: 'rgba(255, 255, 255, 0)' } },
  part: { kind: 'part', at: AT, element: 'photo', from: { form: 'word', box: A({ x: 900, y: 500, w: 120, h: 80 }) }, to: { form: 'photo', box: B({ x: 760, y: 400, w: 400, h: 280 }) } },
  'same-surface': { kind: 'same-surface', at: AT, element: 'page', from: { form: 'page', box: A({ x: 420, y: 140, w: 1080, h: 800 }) }, to: { form: 'button', box: B({ x: 1200, y: 800, w: 220, h: 80 }) } },
};
`;
const PROBE = `
import React from '${nm('react/index.js')}';
import { renderToStaticMarkup } from '${nm('react-dom/server.node.js')}';
import { Internals } from '${nm('remotion/dist/cjs/index.js')}';
import * as Hd from '${url('lib/handover.ts')}';
import * as S from '${url('lib/spine.ts')}';
import { FilmProvider } from '${url('lib/film.ts')}';
import { Handover, underStage } from '${url('fx/Handover.tsx')}';
import { restCam } from '${url('fx/depth/math.ts')}';
import { specs, W, H, AT } from './specs.ts';
const h = React.createElement;
const film = { fps: 30, width: W, height: H } as any;
const film60 = { fps: 60, width: W, height: H } as any;
const I: any = Internals;
const comp = { component: () => null, durationInFrames: 400, width: W, height: H, fps: 30, id: 'Probe', order: null, folderName: null, parentFolderName: null, schema: null, calculateMetadata: null, stack: null, defaultProps: {} };
const cm = { compositions: [comp], folders: [], currentAssetMetadata: null, currentCompositionMetadata: { defaultCodec: null, defaultOutName: null, defaultPixelFormat: null, defaultProResProfile: null, defaultSampleRate: null, defaultVideoImageFormat: null, durationInFrames: 400, fps: 30, width: W, height: H, props: {} }, canvasContent: { type: 'composition', compositionId: 'Probe' } };
const env = { isPlayer: false, isRendering: true, isStudio: false, isClientSideRendering: false, isReadOnlyStudio: false };
const rate = { playbackRate: 1, setPlaybackRate: () => {} };
// a component inside a composition at frame f (the contexts a render gives it)
const inRender = (f: number, el: any) => { const t = { frame: { Probe: f }, isPlaying: () => false, isInsideFreeze: false, audioAndVideoTags: { current: [] } }; return h(I.RemotionEnvironmentContext.Provider, { value: env }, h(I.CanUseRemotionHooksProvider, null, h(I.AbsoluteTimeContext.Provider, { value: t }, h(I.PlaybackRateContext.Provider, { value: rate }, h(I.TimelineContext.Provider, { value: t }, h(I.CompositionManager.Provider, { value: cm }, h(FilmProvider, { value: film }, el))))))); };
const r2 = (v: number) => Math.round(v * 100) / 100;
const box = (b: any) => [r2(b.x), r2(b.y), r2(b.w), r2(b.h)];
const out: any = {};
let picture: any = null;
for (const [name, spec] of Object.entries(specs)) {
  const [t0, t1] = Hd.handoverSpan(spec, film);
  const frames: number[] = [];
  for (let f = t0 - 2; f <= t1 + 2; f++) for (const s of [0, 0.25, 0.5, 0.75]) frames.push(f + s);
  const at = (f: number) => JSON.stringify(Hd.handoverState(f, spec, film));
  const fwd = frames.map(at);
  const back = frames.slice().reverse().map(at).reverse();
  const order = frames.map((_, i) => (i * 7919) % frames.length);
  const mixed: string[] = new Array(frames.length);
  for (const i of order) mixed[i] = at(frames[i]);
  const states = [];
  for (let f = t0 - 1; f <= t1; f++) {
    const s = Hd.handoverState(f, spec, film);
    states.push({ f, show: s.el.show, active: s.active, phase: s.phase, snap: s.snap, shape: box(s.el.shape), box: box(s.el.box), r: r2(s.el.r), blur: r2(s.el.blur), smear: r2(s.el.smear.v), op: s.el.opacity,
      fillA: Number((s.el.fill.match(/rgba\\(.*,\\s*([\\d.]+)\\)/) ?? [0, 1])[1]), ca: r2(s.el.content.a), cb: r2(s.el.content.b), show2: s.el.content.show, sizeA: [r2(s.el.size.a.w), r2(s.el.size.a.h)], sizeB: [r2(s.el.size.b.w), r2(s.el.size.b.h)], kA: s.el.content.scaleA, kB: s.el.content.scaleB,
      hideOut: s.hide.out, hideIn: s.hide.in, draws: s.draws, outS: r2(s.scenes.out.scale), inS: r2(s.scenes.in.scale), outX: r2(s.scenes.out.x), inX: r2(s.scenes.in.x), outY: r2(s.scenes.out.y), inY: r2(s.scenes.in.y), outShow: s.scenes.out.show, inShow: s.scenes.in.show, clip: !!s.scenes.in.clip, ox: r2(s.scenes.out.ox), oy: r2(s.scenes.out.oy), iox: r2(s.scenes.in.ox), ioy: r2(s.scenes.in.oy) });
  }
  const sideA = Hd.boxAt(spec.from.box, t0);
  const sideB = Hd.boxAt(spec.to.box, t1);
  const markup = [t0, Math.round((t0 + spec.at) / 2), spec.at, Math.round((spec.at + t1) / 2), t1 - 1].map((f) =>
    renderToStaticMarkup(inRender(f, h(Handover, { ...spec, frame: f, a: h('div', { 'data-probe': 'a' }, 'Request'), b: h('div', { 'data-probe': 'b' }, 'Result') }))));
  const markAll: boolean[] = [];
  for (let f = t0; f < t1; f++) markAll.push(renderToStaticMarkup(inRender(f, h(Handover, { ...spec, frame: f, a: h('i', null, 'a'), b: h('i', null, 'b') }))).includes('data-handover='));
  out[name] = { t0, t1, span60: Hd.handoverSpan(spec, film60), same: fwd.every((x, i) => x === back[i] && x === mixed[i]), n: frames.length, states, sideA: box(sideA), sideB: box(sideB), markup, markAll, decl: Hd.handoverDeclares(spec, film) };
}
{
  // a picture side: a 16:9 tile growing into its full-frame photo (both sides pictures)
  const pic: any = { kind: 'grow', at: AT, element: 'photo', from: { form: 'photo', box: { x: 300, y: 420, w: 384, h: 216 }, picture: true }, to: { form: 'photo', box: { x: 0, y: 0, w: W, h: H }, picture: true } };
  const [p0, p1] = Hd.handoverSpan(pic, film);
  const rows: any[] = [];
  for (let f = p0; f < p1; f++) {
    const s = Hd.handoverState(f, pic, film);
    rows.push({ f, kA: s.el.content.scaleA, kB: s.el.content.scaleB, w: s.el.shape.w, h: s.el.shape.h, ca: s.el.content.a, cb: s.el.content.b, outShow: s.scenes.out.show, inShow: s.scenes.in.show, active: s.active });
  }
  const after = Hd.handoverState(p1, pic, film);
  picture = { t0: p0, t1: p1, rows, after: { outShow: after.scenes.out.show, inShow: after.scenes.in.show } };
}
// colour and curves
const hueOf = (c: string) => { const m = c.match(/rgba?\\((\\d+), (\\d+), (\\d+)/); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
const colour = {
  ends: [Hd.mixOklch('#FFFFFF', '#08965A', 0), Hd.mixOklch('#FFFFFF', '#08965A', 1)],
  mid: hueOf(Hd.mixOklch('#FFFFFF', '#2B5BD7', 0.5)),
  greyBlue: [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => hueOf(Hd.mixOklch('#808080', '#2B5BD7', t))),
  alpha: Hd.mixOklch('rgba(255, 255, 255, 0.2)', '#000000', 0.5),
};
const curve = (uc: number) => { const n = 400; const ys = Array.from({ length: n + 1 }, (_, i) => Hd.cutCurve(i / n, uc)); const v = ys.slice(1).map((y, i) => (y - ys[i]) * n); return { ys: [ys[0], ys[n]], mono: v.every((x) => x >= -1e-9), peakAt: v.indexOf(Math.max(...v)) / n, left: v[Math.round(uc * n) - 2], right: v[Math.round(uc * n) + 1] }; };
const stage = underStage({ x: 400, y: 300, w: 500, h: 200 }, () => restCam({ W, H, u: 1 }), film)(0);
console.log(JSON.stringify({ out, picture, colour, curves: [curve(0.4), curve(0.3)], stage }));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-handover-'));
writeFileSync(join(TMP, 'specs.ts'), SPECS);
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 256 * 1024 * 1024 });
if (r.status !== 0) {
  rmSync(TMP, { recursive: true, force: true });
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const O = P.out;
const DRAWN = ['grow', 'shrink', 'swell', 'press-open', 'iris', 'fly', 'converge', 'word'];
const SCENE = ['stay', 'part', 'same-surface', 'zoom-into', 'pull-out', 'momentum'];
const ELEMENT = ['grow', 'shrink', 'swell', 'press-open', 'fly', 'converge', 'word', 'stay', 'part', 'same-surface', 'pull-out'];
const HOUSE = { grow: [12, 18], shrink: [12, 8], swell: [12, 17], 'press-open': [22, 36], iris: [0, 28], 'zoom-into': [22, 28], 'pull-out': [30, 48], fly: [14, 22], stay: [0, 18], word: [0, 36], part: [0, 18], converge: [10, 26], 'same-surface': [0, 36], momentum: [16, 18] };
// the fewest film frames a lead takes at any rate (lib/spine leadMin): a converge's collapse reads as a move, not a dissolve
const LEAD_MIN = { converge: 8 };
const near = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const cx = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];
const step = (p, q) => { const [ax, ay] = cx(p); const [bx, by] = cx(q); return Math.max(Math.hypot(bx - ax, by - ay), Math.abs(q[2] - p[2]) / 2, Math.abs(q[3] - p[3]) / 2); };

// 1. determinism
for (const [k, o] of Object.entries(O)) result(o.same, `${k}: the same state at ${o.n} frames and sub-frames forward, backward and scrambled`);

// 2. house frames
for (const [k, o] of Object.entries(O)) {
  const [lead, land] = HOUSE[k];
  const at30 = [100 - Math.max(Math.round(lead / 2), LEAD_MIN[k] ?? 1), 100 + Math.max(1, Math.round(land / 2))];
  result(o.t0 === (lead ? Math.min(at30[0], 100 - 1) : 100) && o.t1 === at30[1] && o.span60[0] === 100 - (lead ? Math.max(lead, LEAD_MIN[k] ?? 0) : 0) && o.span60[1] === 100 + land,
    `${k}: spans ${lead} + ${land} f@60${LEAD_MIN[k] ? `, a lead of ${LEAD_MIN[k]} film frames at least` : ''} (${o.t0}..${o.t1} at 30 fps, ${o.span60.join('..')} at 60)`);
}

// 3. continuity across the cut, each side under its own camera
for (const k of ELEMENT) {
  const o = O[k];
  const s0 = o.states.find((s) => s.f === o.t0);
  const s1 = o.states.find((s) => s.f === o.t1);
  const tol = k === 'pull-out' ? 2 : 0.6;
  result(near(s0.shape, o.sideA, tol), `${k}: picked up where the outgoing scene draws it (its box under the moving camera at t0)`, `${s0.shape} vs ${o.sideA}`);
  result(near(s1.shape, o.sideB, Math.max(tol, 0.02 * Math.max(o.sideB[2], o.sideB[3]) * (k === 'pull-out' ? 1 : 0)) ), `${k}: lands where the incoming scene draws it (under the other camera at t1)`, `${s1.shape} vs ${o.sideB}`);
  const span = o.states.filter((s) => s.f >= o.t0 && s.f < o.t1);
  const steps = span.slice(1).map((s, i) => ({ f: s.f, d: step(span[i].shape, s.shape), snap: s.snap, blur: s.blur }));
  const big = steps.filter((x) => x.d > 0.15 * 1920 && !x.snap);
  result(!big.length, `${k}: no frame steps more than 15 % of the width`, JSON.stringify(big.slice(0, 3)));
  const cut = steps.find((x) => x.f === 100);
  const around = steps.filter((x) => x.f === 99 || x.f === 101).map((x) => x.d);
  if (cut && !cut.snap) result(cut.d <= 2.5 * Math.max(...around, 1) + 2, `${k}: the cut frame moves like its neighbours (the cut does not show)`, `cut ${cut.d.toFixed(1)} px, around ${around.map((v) => v.toFixed(1)).join(', ')}`);
  const snaps = steps.filter((x) => x.snap);
  if (['swell', 'shrink'].includes(k)) result(snaps.length === 1 && snaps[0].f === 100 && snaps[0].blur >= 4, `${k}: its one designed jump is declared on the cut frame, under ${snaps[0]?.blur ?? 0} px of blur`, JSON.stringify(snaps));
  else result(!snaps.length, `${k}: no designed jump`);
}

// 4. content never scaled
for (const k of DRAWN) {
  const o = O[k];
  const sa = o.states.filter((s) => s.active).map((s) => s.sizeA.join('x'));
  const sb = o.states.filter((s) => s.active).map((s) => s.sizeB.join('x'));
  result(new Set(sa).size === 1 && new Set(sb).size === 1 && sa[0] === `${o.sideA[2]}x${o.sideA[3]}` && sb[0] === `${o.sideB[2]}x${o.sideB[3]}`, `${k}: each content keeps its own layout size on every frame (${sa[0]}, ${sb[0]})`);
  const wrappers = o.markup.flatMap((m) => [...m.matchAll(/data-handover-content="(a|b)" style="([^"]*)"/g)].map((x) => x[2]));
  const container = o.markup.flatMap((m) => [...m.matchAll(/data-handover="[^"]*" style="([^"]*)"/g)].map((x) => x[1]));
  // a converge's next element pops up whole out of the point (contained, up to its own size); nothing else scales
  const popped = k === 'converge' ? wrappers.filter((st) => /scale\(/.test(st)) : [];
  const still = k === 'converge' ? wrappers.filter((st) => !/scale\(/.test(st)) : wrappers;
  result(wrappers.length > 0 && still.every((st) => !/scale\(/.test(st)) && container.every((st) => !/scale\(/.test(st)) && popped.every((st) => Number((st.match(/scale\(([\d.]+)\)/) ?? [0, 2])[1]) <= 1),
    `${k}: the drawn container carries no scale; the content none (a converge's next element only pops up to its own size: ${popped.length} layer(s))`, popped.join(' | '));
  if (k === 'converge') {
    const act = o.states.filter((s) => s.active);
    result(act.every((s) => s.kA === 1 && (s.f < 100 ? s.kB === 1 : s.kB <= 1 + 1e-9)) && act.some((s) => s.f >= 100 && s.kB < 1),
      'converge: the next element grows out of the point whole (contained, never clipped mid-text), never past its own size', act.map((s) => `${s.f}:${s.kB.toFixed(2)}`).join(' '));
  } else result(o.states.every((s) => s.kA === 1 && s.kB === 1), `${k}: no content scale (UI content never scales)`);
}

// 4b. a picture side scales with its box: the tile and its photo are one picture at one scale (never a double image),
// the photo develops over the tile (no dip), and the next scene waits until the element lands (it is the whole frame)
{
  const Pc = P.picture;
  const same = Pc.rows.filter((r) => r.active).every((r) => Math.abs((r.kA * 384) / (r.kB * 1920) - 1) < 1e-6 && r.kA * 384 >= r.w - 1e-6 && r.kA * 216 >= r.h - 1e-6);
  result(same, 'picture: the tile and the photo cover the growing box at one scale on every frame (one picture, never doubled)', JSON.stringify(Pc.rows.slice(0, 3)));
  result(Pc.rows.every((r) => r.ca === 1 || r.cb >= 1 - 1e-6), 'picture: the photo develops over the tile, which stays whole under it (no dip to the ground)', Pc.rows.map((r) => `${r.ca.toFixed(2)}/${r.cb.toFixed(2)}`).join(' '));
  result(Pc.rows.every((r) => r.outShow && !r.inShow) && Pc.after.inShow, 'picture: an element that becomes the whole frame is the next scene: that scene waits for it to land, the last one stays round it', JSON.stringify(Pc.after));
}

// 5. no frame without the element
for (const k of DRAWN) {
  const o = O[k];
  const span = o.states.filter((s) => s.f >= o.t0 && s.f < o.t1);
  const bad = span.filter((s) => !s.show || s.op <= 0 || s.shape[2] < 2 || s.shape[3] < 2 || (s.fillA < 0.05 && s.ca + s.cb < 0.05));
  result(!bad.length && o.markAll.every(Boolean), `${k}: every frame of the span shows the element (${span.length} frames), and the markup draws it`, JSON.stringify(bad.slice(0, 2)));
  const hides = o.states.every((s) => (s.f < o.t0 ? s.hideOut === 1 : s.f < o.t1 ? s.hideOut === 0 && s.hideIn === 0 : s.hideIn === 1));
  result(hides, `${k}: the scenes' own copies hide exactly inside the span`);
}

// 6. the swap
for (const k of ['shrink', 'swell', 'converge', 'fly']) {
  const o = O[k];
  const span = o.states.filter((s) => s.f >= o.t0 && s.f < o.t1);
  const flip = span.find((s) => s.ca === 0 && s.cb > 0);
  const whole = span.find((s) => s.cb === 1);
  result(flip && flip.f === 100 && span.filter((s) => s.f < 100).every((s) => s.ca === 1 && s.cb === 0) && whole && whole.f <= (k === 'swell' ? 104 : 101), `${k}: the content swaps on the cut (${k === 'swell' ? 'the new one blooming in under the blur' : 'in one frame'})`, `flip at ${flip?.f}, whole at ${whole?.f}`);
}
for (const k of ['shrink', 'converge']) {
  const o = O[k];
  const span = o.states.filter((s) => s.f >= o.t0 && s.f < o.t1);
  const maxBlur = Math.max(...span.map((s) => s.blur));
  result(span.find((s) => s.f === 100).blur === maxBlur && maxBlur >= (k === 'shrink' ? 12 : 5), `${k}: the cut is the most blurred frame (${maxBlur} px)`);
}
{
  const span = O.converge.states.filter((s) => s.f >= O.converge.t0 && s.f < O.converge.t1);
  const area = (s) => s.shape[2] * s.shape[3];
  result(area(span.find((s) => s.f === 100)) === Math.min(...span.map(area)), 'converge: the cut is the smallest frame (the point)');
  const fly = O.fly.states.filter((s) => s.f >= O.fly.t0 && s.f < O.fly.t1);
  const fast = Math.max(...fly.map((s) => s.smear));
  result(fly.find((s) => s.f === 100).smear >= 0.9 * fast && fast > 10, `fly: the cut is the fastest frame (${fly.find((s) => s.f === 100).smear} of ${fast} px a frame), drawn with a smear`);
  const grow = O.grow.states.filter((s) => s.f >= O.grow.t0 && s.f < O.grow.t1);
  const g = grow.find((s, i) => i > 0 && s.show2 !== grow[i - 1].show2);
  const dbl = grow.filter((s) => s.ca > 0.6 && s.cb > 0.6);
  result(g && g.ca <= 0.5 && g.cb <= 0.5 && !dbl.length, `grow: the contents cross-blur round the middle (frame ${g?.f}: ${g?.ca} / ${g?.cb}), never both at full strength`);
  // the cross at 30 fps has no one-frame spike: no frame changes the contents (opacity on both sides, and the shape's
  // growth) more than twice as much as both frames around it (forensics reads such a frame as a pop mid-grow)
  const step = grow.slice(1).map((s, i) => Math.abs(s.ca - grow[i].ca) + Math.abs(s.cb - grow[i].cb));
  const grew = grow.slice(1).map((s, i) => Math.abs(s.shape[2] - grow[i].shape[2]) + Math.abs(s.shape[3] - grow[i].shape[3]));
  const spike = (d, floor) => d.findIndex((v, i) => i > 0 && i < d.length - 1 && v > floor && v > 2 * Math.max(d[i - 1], d[i + 1]));
  result(spike(step, 0.1) < 0 && spike(grew, 8) < 0, 'grow: the contents and the shape change smoothly frame to frame at 30 fps (no one-frame spike)', JSON.stringify({ step: step.map((v) => +v.toFixed(2)), grew: grew.map((v) => Math.round(v)) }));
}

// 7. the camera kinds and the scene kinds
{
  const z = O['zoom-into'].states;
  const lead = z.filter((s) => s.f >= O['zoom-into'].t0 && s.f < 100);
  const last = lead[lead.length - 1];
  const first = z.find((s) => s.f === 100);
  result(lead.slice(1).every((s, i) => s.outS >= lead[i].outS) && last.outS > 2, `zoom-into: the outgoing scene pushes in without reversing (x${last.outS} by the cut)`);
  result(last.shape[2] >= 0.8 * 1920 || last.shape[3] >= 0.8 * 1080, 'zoom-into: the element all but fills the frame on the last frame before the cut', JSON.stringify(last.shape));
  const land = z.filter((s) => s.f >= 100 && s.f <= O['zoom-into'].t1);
  result(first.inS < 1 && land.slice(1).every((s, i) => s.inS >= land[i].inS) && land[land.length - 1].inS > 0.97, `zoom-into: the next scene opens still growing (x${first.inS}) and settles at its rest`);
  const p = O['pull-out'].states;
  result(p.every((s) => s.ox === p[0].ox && s.oy === p[0].oy && s.iox === p[0].ox && s.ioy === p[0].oy), 'pull-out: both scenes scale about one point');
  const m = O.momentum.states;
  const mo = m.filter((s) => s.f >= O.momentum.t0 && s.f < 100).map((s) => s.outX);
  const mi = m.filter((s) => s.f >= 100 && s.f < O.momentum.t1).map((s) => s.inX);
  const vo = mo.slice(1).map((x, i) => x - mo[i]);
  const vi = mi.slice(1).map((x, i) => x - mi[i]);
  result(vo.every((v) => v <= 0) && Math.abs(vo[vo.length - 1]) >= Math.abs(vo[0]) && vi.every((v) => v <= 0) && mi[0] > 0 && Math.abs(vi[vi.length - 1]) < Math.abs(vi[0]), 'momentum: the outgoing scene accelerates left into the cut, the next one arrives moving left and decays', JSON.stringify({ vo: vo.map((v) => Math.round(v)), vi: vi.map((v) => Math.round(v)) }));
  for (const k of SCENE) result(O[k].states.every((s) => !s.show && !s.draws && s.hideOut === 1 && s.hideIn === 1), `${k}: the scenes draw it (no element drawn, their copies kept)`);
  const iris = O.iris.states.filter((s) => s.f >= O.iris.t0 && s.f < O.iris.t1);
  result(iris.every((s) => s.clip && s.inShow) && iris[iris.length - 1].shape[2] >= 1920, 'iris: the next scene shows inside the opening shape, which ends covering the frame');
}

// 8. colour and curves
{
  const C = P.colour;
  result(C.ends[0] === 'rgba(255, 255, 255, 1.000)' && /^rgba\(8, 150, 90, 1\.000\)$/.test(C.ends[1]), 'mixOklch: the endpoints are the colours themselves', C.ends.join(' '));
  const blueish = C.greyBlue.every(([r, g, b]) => b >= r && b >= g - 2);
  result(blueish, 'mixOklch: a grey mixing into blue stays in blue\'s hue all the way (no detour)', JSON.stringify(C.greyBlue));
  result(/, 0\.600\)$/.test(C.alpha), 'mixOklch: alpha mixes straight', C.alpha);
  for (const c of P.curves) result(c.ys[0] === 0 && Math.abs(c.ys[1] - 1) < 1e-9 && c.mono && Math.abs(c.left - c.right) / Math.max(c.left, c.right) < 0.08, `cutCurve: 0 to 1, never back, the speed matched across the cut (${c.left.toFixed(2)} / ${c.right.toFixed(2)}), peak at ${c.peakAt.toFixed(2)}`);
  result(near([P.stage.x, P.stage.y, P.stage.w, P.stage.h], [400, 300, 500, 200], 0.5), 'underStage: a plane at z = 0 under the opening camera lands on its own box', JSON.stringify(P.stage));
}

// 9. declares and the cue export
const SEAM_KINDS = ['velocity', 'morph', 'hard', 'mask', 'whip', 'defocus', 'light', 'snapZoom', 'breath', 'zoomThrough', 'stepped', 'colour', 'dissolveUi', 'fadeEnd', 'wipe'];
for (const [k, o] of Object.entries(O)) {
  const s = o.decl.seams?.[0];
  const okSeam = o.decl.seams.length === 1 && s.at === 100 && SEAM_KINDS.includes(s.kind) && s.id.startsWith('handover:H') && s.id.includes(`-${k}:`) && s.handover === k && s.span[0] === o.t0 && s.span[1] === o.t1;
  const tr = s?.track ?? [];
  const okTrack = tr.length === o.t1 - o.t0 + 1 && tr.every((x, i) => x[0] === o.t0 + i) && tr.slice(0, -1).every((x) => { const st = o.states.find((q) => q.f === x[0]); return near(x.slice(1), st.box, 0.06); });
  result(okSeam && okTrack, `${k}: declares one ${s?.kind} seam at the cut with the element's box on its ${tr.length} frames`, s ? `${s.id} ${s.kind}` : 'none');
}

// the cue export: a fixture timeline with the spine's seams and a handover declared by src/sync.ts
const proj = join(TMP, 'film');
mkdirSync(join(proj, 'src'), { recursive: true });
mkdirSync(join(proj, 'out'), { recursive: true });
writeFileSync(join(proj, 'src', 'specs.ts'), SPECS);
writeFileSync(join(proj, 'src', 'timeline.ts'), `
import * as S from '${url('lib/spine.ts')}';
export const FPS = 30;
export const BPM = 120;
const b = (n: number, beat = 0) => Math.round(((n - 1) * 4 + beat) * 15);
export const SPINE_PLAN = S.planSpine({ sentence: 'Pennant turns one sentence into a launch page.', element: 'request', case: { request: 'A waitlist page for my Saturday ceramics class' },
  acts: [{ verb: 'asks', scenes: ['word', 'pill'] }, { verb: 'writes', scenes: ['page'] }, { verb: 'fills', scenes: ['notice', { form: 'count', via: 'converge' }] }] }, { fps: FPS, b, bars: 8 });
export const TOTAL = b(9) + 30;
export const ACT = { all: { from: 0, dur: TOTAL } };
export const CUE = { start: 0 };
export const COPY = [];
export const SEAMS = S.spineDeclares(SPINE_PLAN).seams;
`);
writeFileSync(join(proj, 'src', 'sync.ts'), `
import * as Hd from '${url('lib/handover.ts')}';
import { specs } from './specs.ts';
const film = { fps: 30, width: 1920, height: 1080 } as any;
export default () => [];
export const declares = () => [{ id: 'handover-grow', ...Hd.handoverDeclares(specs.grow, film) }, { id: 'handover-fly', ...Hd.handoverDeclares(specs.fly, film) }];
`);
const ex = spawnSync(process.execPath, [TSX, CUES, '--sync', join(proj, 'src', 'sync.ts'), '--out', join(proj, 'out', 'cues.json'), '--quiet'], { cwd: proj, encoding: 'utf8' });
let cues = null;
try {
  cues = JSON.parse(readFileSync(join(proj, 'out', 'cues.json'), 'utf8'));
} catch {
  cues = null;
}
rmSync(TMP, { recursive: true, force: true });
result(ex.status === 0 && !!cues?.declared, 'export-cues takes the spine\'s seams and the handovers\' declares', (ex.stderr || ex.stdout).trim().slice(0, 300));
if (cues?.declared) {
  const top = cues.declared.seams ?? [];
  result(top.length >= 4 && top.every((s) => s.id.startsWith('spine:H') && SEAM_KINDS.includes(s.kind)) && top.some((s) => s.id.includes('-converge:request:notice>count')), `cues.json carries the spine's ${top.length} seams, each naming its handover`, top.map((s) => s.id).join(' '));
  const fx = (cues.declared.fx ?? []).find((d) => d.id === 'handover-grow');
  const s = fx?.seams?.[0];
  result(!!s && s.at === 100 && s.kind === 'morph' && s.carry === 'shape' && s.id === 'handover:H1-grow:request', 'cues.json carries a handover\'s seam (kind, carry, the handover in its id)', JSON.stringify(s));
  const tr = s?.track ?? [];
  result(tr.length === O.grow.t1 - O.grow.t0 + 1 && JSON.stringify(tr) === JSON.stringify(O.grow.decl.seams[0].track) && s.handover === 'grow' && s.element === 'request' && s.forms.join('>') === 'pill>page' && s.span.join() === [O.grow.t0, O.grow.t1].join() && s.swap === 100, `cues.json carries the element's box track (${tr.length} frames) with the handover, the element, the forms, the span and the swap`);
  const sp = cues.spine;
  result(!!sp && sp.v === 1 && sp.element === 'request' && sp.changes.length === top.length && top.every((x) => x.handover && x.forms?.length === 2 && x.span?.length === 2), 'cues.json carries the SPINE_PLAN as spine, and each spine seam its handover, forms and span');
}

console.log(failed ? `\n${failed} test(s) failed` : '\nall handover tests passed');
process.exit(failed ? 1 : 0);
