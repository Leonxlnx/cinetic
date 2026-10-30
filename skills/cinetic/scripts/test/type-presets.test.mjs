#!/usr/bin/env node
/**
 * type-presets.test.mjs: the one-line type presets of the Remotion starter (src/fx/TypePresets.tsx).
 *
 *   1. Timing: build's word gaps (the house voice: 6 f apart, half that at 30 fps; each word fading in over 20 f), the
 *      focus pull (blur x0.65 a frame at 30 fps), the wheel's shrinking gaps (16 f to 6 f), the font cycle's
 *      6 f steps, the punch (a 24 % push in 28 f), the redaction's 2 f steps, the swarm on twos.
 *   2. Exits: the dive zooms at a constant log rate (x8.2 in 14 f) into a covering ink, a deeper zoom (diveTo)
 *      at the same rate; push dims to 36 % on its first frame; the square full stop lands 5 f after the line.
 *   3. Properties: every preset with every exit is finite and repeatable, continuous presets give the same
 *      picture at the same second at 30 and 60 fps, and declares() marks the stepped runs and the dive seam.
 *   (Word onsets phrase, lib/cadence phrase: the span of the house stagger, the gaps' spread >= 0.3: timing.test.mjs.)
 *   4. The entries: crisp (words 7 f apart on average, phrased, each rising 0.32 em and sharpening from 8 px on E.out over 26 f, moving
 *      while it resolves; crispWords() for <Words>), calm (PACE.calm's reveal in any film), and no letter-by-letter
 *      preset on an end card.
 *   5. The confident moves: mask (8 f linear-stop head, last word 2.5x), land (x1.7 over 34 f, defocus riding the
 *      scale, lead + append), fly (x5 in 14 f, landing touching, spaces opening), snap and room (one declared jump
 *      frame), glide, fall, the rebuilt open (soft first frame, transient accent, trail) and build (20 f fades, no blur).
 *   6. Exits at speed: slide (right-to-left drops), spread, collapse, drift never fading; the hero / soft roles.
 *
 * It runs src/fx through the starter's own tsx (npm install in assets/remotion-starter first; CINETIC_TSX may
 * name another tsx cli.mjs).
 * Usage (from the skill root):  node scripts/test/type-presets.test.mjs [--verbose]
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
const TSX = process.env.CINETIC_TSX || join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/type-presets.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as T from '${url('fx/TypePresets.tsx')}';
import { PACE } from '${url('lib/pace.ts')}';
const film = (fps: number) => ({ fps, width: 1920, height: 1080, pace: PACE.crisp });
const M = (s: any) => T.monoMetrics(s.text, 100, 0.56, T.typeLineAlts(s).map((a: any) => a.text));
const st = (f: number, s: any, fps = 60) => T.typeLineState(f, s, M(s), film(fps));
const diffs = (a: number[]) => a.slice(1).map((v, i) => v - a[i]);
const build = { preset: 'build', text: 'Move past the usual look', at: 100 };
const tf = { preset: 'typeFocus', text: 'What if your phone knew better', at: 0 };
const wheel = { preset: 'wheel', text: 'Your phone buzzed 96 times today', at: 0, key: 3, words: ['4', '11', '23', '38', '52', '67', '81'] };
const cyc = { preset: 'cycle', text: 'Quiet is a feature', at: 0, key: 0 };
const red = { preset: 'redact', text: 'Hush holds the noise', at: 0, from: 'They never stop' };
const sw = { preset: 'swarm', text: 'Every app wants you', at: 0, seed: 's' };
const dive = { preset: 'slice', text: 'Not right now', at: 0, out: 100, exit: 'dive' };
const d90 = { ...dive, diveTo: 90, anchorAt: [0.5, -0.025] };
const focus = (fps: number) => { const q = T.typeFocusFrames(tf, film(fps)); const f0 = Math.ceil(q.focus) + 1; return st(f0 + 1, tf, fps).blur / st(f0, tf, fps).blur; };
const swOn = T.swarmFrames(sw, film(60)).on[0];
const swScale = (f: number) => st(f, sw).glyphs[0].sx;
let finite = true, repeat = true;
for (const p of T.TYPE_PRESET_NAMES) for (const exit of T.TYPE_EXITS) {
  const s = { preset: p, text: 'Your phone buzzed 96 times', at: 10, out: 300, exit, key: 3, words: ['4', '19', '52'], from: p === 'redact' ? 'Most of it can wait' : 'twelve', dot: true, seed: p };
  for (let f = 0; f < 420; f += 11) {
    const a = st(f, s);
    if (JSON.stringify(a) !== JSON.stringify(st(f, s))) repeat = false;
    const nums = [a.x, a.y, a.scale, a.blur, a.opacity, ...a.glyphs.flatMap((g: any) => [g.dx, g.dy, g.sx, g.sy, g.rot, g.blur, g.opacity])];
    if (nums.some((v) => !Number.isFinite(v))) finite = false;
  }
}
let fpsWorst = 0;
for (const p of ['develop', 'build', 'arc', 'assemble', 'punch', 'echo', 'open', 'slice', 'highlight']) {
  const s60 = { preset: p, text: 'Most of it could have waited', at: 60, key: 2, seed: 'f' };
  for (const sec of [1.05, 1.5, 2.1]) {
    const a = st(sec * 60, s60, 60);
    const b = st(sec * 30, { ...s60, at: 30 }, 30);
    fpsWorst = Math.max(fpsWorst, Math.abs(a.scale - b.scale), Math.abs(a.x - b.x), ...a.glyphs.map((g: any, i: number) => Math.abs(g.dy - b.glyphs[i].dy) + Math.abs(g.opacity - b.glyphs[i].opacity) + Math.abs(g.blur - b.glyphs[i].blur)));
  }
}
const crisp = { preset: 'crisp', text: 'Notes in thirty seconds', at: 100 };
const calm = { preset: 'calm', text: 'It reads the whole meeting', at: 100 };
const cr = (f: number) => st(f, crisp).glyphs[0];
const crF = T.typeLineFrames(crisp, M(crisp), film(60));
const caF = T.typeLineFrames(calm, M(calm), film(60));
const cw30 = T.crispWords(film(30));
const dot = { preset: 'punch', text: 'Quiet', at: 0, dot: true };
const dotF = T.typeLineFrames(dot, M(dot), film(60));
// the confident moves
const mk = { preset: 'mask', text: 'All your notes sync up', at: 0 };
const mkF = T.maskFrames(mk, film(60));
const g0 = (s: any, f: number, i = 0) => st(f, s).glyphs[i];
const ld = { preset: 'land', text: 'One home for everything', at: 0, lead: 2 };
const ldF = T.landFrames(ld, film(60));
const fl = { preset: 'fly', text: 'Plan your launch', at: 0 };
const flF = T.flyFrames(fl, film(60));
const sn = { preset: 'snap', text: 'Try one now', at: 0 };
const snF = T.snapFrames(sn, film(60));
const rm = { preset: 'room', text: 'Map the journey', at: 0 };
const rmF = T.roomFrames(rm, film(60));
const gl = { preset: 'glide', text: 'Send it out on any phone', at: 0 };
const fa = { preset: 'fall', text: 'An honest health guide', at: 0 };
const op = { preset: 'open', text: 'Your creative teams', at: 0 };
const bd = { preset: 'build', text: 'Give it your touch', at: 0 };
const opOn = T.openOnsets(op, film(60));
const ex = (exit: string, f: number) => st(f, { preset: 'crisp', text: 'plans change but people stay', at: -400, out: 0, exit });
const exF = (exit: string) => T.typeLineFrames({ preset: 'crisp', text: 'plans change but people stay', at: -400, out: 0, exit }, M({ text: 'plans change but people stay' }), film(60));
const wordOp = (s: any) => s.glyphs.filter((g: any) => g.ch !== ' ').map((g: any) => g.opacity);
console.log(JSON.stringify({
  build60: diffs(T.buildOnsets(build, film(60))), build30: diffs(T.buildOnsets({ ...build, at: 50 }, film(30))),
  focus30: focus(30), focus60: focus(60),
  wheel: diffs(T.wheelSwaps(wheel, film(60))),
  cycle: Array.from({ length: 36 }, (_, f) => JSON.stringify(st(f, cyc).slot?.items[0].vary ?? null)),
  punch: st(28, { preset: 'punch', text: 'Quiet.', at: 0 }).scale,
  redact: T.redactFrames(red, film(60)),
  swarm: { a: swScale(swOn), b: swScale(swOn + 16), pairs: [0, 4, 8, 12].every((k) => swScale(swOn + k) === swScale(swOn + k + 1)) },
  dive: [101, 106, 111].map((f) => st(f + 1, dive).scale / st(f, dive).scale),
  dive90: { r: st(121, d90).scale / st(120, d90).scale, gone: T.typeLineFrames(d90, M(d90), film(60)).gone, oy: st(101, d90).origin[1] },
  push: st(101, { preset: 'punch', text: 'Not right now', at: 0, out: 100, exit: 'push' }).opacity,
  dot: { at: dotF.dot, resolved: dotF.resolved },
  crisp: { ticks: diffs(crF.ticks), resolved: crF.resolved, f1: cr(101), f8: cr(108), f20: cr(120), f126: cr(126), w3before: st(121, crisp).glyphs[17].opacity, w3at: st(122, crisp).glyphs[17].opacity },
  calm: { ticks: caF.ticks, f1: st(101, calm).glyphs[0], blurMax: Math.max(...Array.from({ length: 80 }, (_, k) => Math.max(...st(100 + k, calm).glyphs.map((g: any) => g.blur)))) },
  cw30: { dur: cw30.dur, stagger: cw30.stagger, blur: cw30.blur, rise: cw30.rise },
  end: T.END_CARD_PRESETS, endArc: T.endCardPreset('arc'), endOpen: T.endCardPreset('open'),
  mask: { gaps: diffs(mkF.on), heads: mkF.heads, f0: g0(mk, 0), f4: g0(mk, 4), f8: g0(mk, 8), f12: g0(mk, 12), f20: g0(mk, 20), dy8: 1.05 * (1 - 0.85) },
  land: { landed: ldF.landed, on: ldF.on, s0: st(0, ld).scale, s17: st(17, ld).scale, s34: st(34, ld).scale, b0: st(0, ld).blur * st(0, ld).scale, b34: st(34, ld).blur, w2before: g0(ld, ldF.on[2] - 1, 9).opacity, w2at: g0(ld, ldF.on[2], 9).opacity, w2solid: g0(ld, ldF.on[2] + 6, 9).opacity, k: T.TYPE_PRESETS.land },
  fly: { on: flF.on, s0: g0(fl, 0).sx, s7: g0(fl, 7).sx, s14: g0(fl, 14).sx, s0w1: g0(fl, Math.ceil(flF.on[1]), 5).sx, b14: g0(fl, 14).blur, open: flF.open, end: flF.end, dxShut: g0(fl, flF.open - 1, 10).dx, dxOpen: g0(fl, flF.end + 1, 10).dx },
  snap: { at: snF.at, before: st(snF.at - 1, sn).scale, at1: st(snF.at, sn).scale, last0: g0(sn, snF.at - 1, 8).opacity, lastAt: g0(sn, snF.at, 8).opacity, decl: T.declares(sn, film(60)).stepped },
  room: { jump: rmF.jump, xs: [rmF.jump - 3, rmF.jump - 2, rmF.jump - 1, rmF.jump, rmF.jump + 1, rmF.jump + 20].map((f) => st(f, rm).x), lastBefore: g0(rm, rmF.jump - 1, 8).opacity, lastAt: g0(rm, rmF.jump, 8).opacity, decl: T.declares(rm, film(60)).stepped },
  glide: { ons: diffs(T.glideFrames(gl, film(60)).on), x0: st(0, gl).x, x96: st(96, gl).x, w0: g0(gl, 1), w0end: g0(gl, 9) },
  fall: { f1: g0(fa, 1), f12: g0(fa, 12), gap: diffs(T.fallFrames(fa, film(60)).on)[0] },
  open: { on: opOn, f0: g0(op, 0), f2: g0(op, 2), f6: g0(op, 6), f30: g0(op, 30), smear: st(opOn[1] + 1, op).glyphs[0].smear[0] },
  build: { f0: g0(bd, 0), f20: g0(bd, 20).opacity, maxBlur: Math.max(...Array.from({ length: 120 }, (_, f) => Math.max(...st(f, bd).glyphs.map((g: any) => g.blur)))) },
  developFeather: T.TYPE_PRESETS.develop.feather,
  exits: {
    slide: { len: exF('slide').gone, f10: ex('slide', 10).x, f15: wordOp(ex('slide', 15)), f17: wordOp(ex('slide', 17)), f19: wordOp(ex('slide', 19)), f21: wordOp(ex('slide', 21)), gone: ex('slide', 22).visible },
    spread: { len: exF('spread').gone, s25: ex('spread', 25).scale, last10: ex('spread', 10).glyphs.at(-1).opacity, last25: ex('spread', 25).glyphs.at(-1).opacity, first25: ex('spread', 25).glyphs[0].opacity, dxLast: ex('spread', 20).glyphs.at(-1).dx },
    collapse: { len: exF('collapse').gone, dx9: ex('collapse', 9).glyphs.at(-1).dx, gone: ex('collapse', 10).visible },
    drift: { op: ex('drift', 20).opacity, y: ex('drift', 29).y },
  },
  roles: { hero: T.HERO_PRESETS, soft: T.SOFT_PRESETS, softExits: T.SOFT_EXITS, heroTF: T.heroPreset('typeFocus'), heroMask: T.heroPreset('mask') },
  finite, repeat, fpsWorst,
  decl: { cycle: T.declares(cyc, film(60)).stepped?.length ?? 0, redact: T.declares(red, film(60)).stepped?.length ?? 0, swarm: T.declares(sw, film(60)).stepped?.[0]?.on ?? 0, dive: T.declares(dive, film(60)).seams?.[0]?.kind ?? '' },
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-typepresets-'));
const probeFile = join(TMP, 'probe.tsx');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1. timing
result(P.build60.join() === '6,6,6,6' && P.build30.join() === '3,3,3,3', 'build (the house voice): words 6 f apart (half at 30 fps)', `${P.build60.join('/')} | ${P.build30.join('/')}`);
result(near(P.focus30, 0.65, 1e-9) && near(P.focus60, Math.sqrt(0.65), 1e-9), 'typeFocus: the focus pulls in at x0.65 a frame at 30 fps, the same per second at 60', `${P.focus30.toFixed(4)} / ${P.focus60.toFixed(4)}`);
result(near(P.wheel[0], 16) && near(P.wheel.at(-1), 6) && P.wheel.every((d, i) => i === 0 || d <= P.wheel[i - 1] + 1e-9), 'wheel: the rolls come faster and faster, 16 f gaps down to 6 f', P.wheel.map((d) => d.toFixed(1)).join('/'));
const changes = P.cycle.map((v, f) => (f && v !== P.cycle[f - 1] ? f : -1)).filter((f) => f > 0);
result(changes.join() === '6,12,18,24,30', 'cycle: the keyword changes style exactly every 6 f, then lands', changes.join(','));
result(near(P.punch, 1.24, 1e-9), 'punch: a 24 % push in 28 f', P.punch.toFixed(4));
result(P.redact.per === 2 && P.redact.end === 14, 'redact: one word every 2 f, the old line then the new one', JSON.stringify(P.redact));
result(near(P.swarm.a, 0.29) && near(P.swarm.b, 1) && P.swarm.pairs, 'swarm: words grow out of depth on twos, 0.29x to full size in 16 f', JSON.stringify(P.swarm));

// 2. exits and marks
const want = 8.2 ** (1 / 14);
result(P.dive.every((x) => near(x, want, 1e-9)), 'dive: a constant log-rate zoom, x8.2 in 14 f', `${P.dive[0].toFixed(5)} (want ${want.toFixed(5)})`);
result(near(P.dive90.r, want, 1e-9) && near(P.dive90.gone, 100 + (14 * Math.log(90)) / Math.log(8.2), 1e-9) && near(P.dive90.oy, -0.025), 'dive: a deeper zoom keeps the rate and lasts longer; anchorAt sets the fixed point', JSON.stringify(P.dive90));
result(near(P.push, 0.36, 1e-9), 'push: the line dims to 36 % on its first frame');
result(P.dot.at === P.dot.resolved + 5, 'dot: the square full stop lands 5 f after the line', JSON.stringify(P.dot));

// 3. properties
result(P.finite && P.repeat, 'every preset with every exit is finite and repeatable');
result(P.fpsWorst < 1e-6, 'continuous presets give the same picture at the same second at 30 and 60 fps', P.fpsWorst.toExponential(2));
result(P.decl.cycle === 1 && P.decl.redact === 1 && P.decl.swarm === 2 && P.decl.dive === 'zoomThrough', 'declares(): stepped runs for the cycle, the redaction and the swarm (on twos); a dive is a zoom-through seam', JSON.stringify(P.decl));

// 4. the entries
const C = P.crisp;
// phrased onsets (lib/cadence phrase): the house stagger's span, gaps that spread (std / mean >= 0.3)
const spreadOf = (g) => { const m = g.reduce((a, b) => a + b, 0) / g.length; return Math.sqrt(g.reduce((a, b) => a + (b - m) ** 2, 0) / g.length) / m; };
const phrased = (gaps, mean) => near(gaps.reduce((a, b) => a + b, 0), mean * gaps.length, 1e-6) && (gaps.length < 2 || spreadOf(gaps) >= 0.3 - 1e-9);
result(phrased(C.ticks, 7) && C.resolved > 121 && C.resolved <= 147, 'crisp: words 7 f apart on average, phrased (60 fps), the line landed within 26 f of its last word', `${C.ticks.join('/')} resolved ${C.resolved}`);
result(C.f1.opacity > 0.15 && C.f1.dy > 0.15 && near(C.f1.blur, 0.08 * Math.max(0, 1 - C.f1.opacity / 0.6), 1e-6) && C.f1.blur > 0 && C.f8.dy > 0.005 && C.f8.dy < C.f1.dy && C.f8.opacity > 0.85 && C.f20.dy > 0 && C.f126.dy === 0 && C.f126.blur === 0 && C.f126.opacity === 1,
  'crisp: a word shows on its first frame soft and low, rises 0.32 em on E.out and still moves once it reads (an 8 px blur at 1080p), home by 26 f', JSON.stringify({ f1: [C.f1.opacity, C.f1.dy, C.f1.blur].map((v) => +v.toFixed(3)), f8: +C.f8.dy.toFixed(4), f20: +C.f20.dy.toFixed(5) }));
result(C.w3before === 0 && C.w3at > 0, 'crisp: the last word waits for its own onset, 21 f after the first', `${C.w3before} -> ${C.w3at}`);
result(P.calm.ticks[0] === 100 && P.calm.ticks.at(-1) === 100 + 11 * 4 && P.calm.f1.dy > 0.28 && P.calm.blurMax === 0, "calm: the calm pace's reading cadence (a 44 f span for five words), a third of the line box of rise, no blur, in a crisp film too", JSON.stringify({ ticks: P.calm.ticks, dy: +P.calm.f1.dy.toFixed(3) }));
result(near(P.cw30.dur, 13) && near(P.cw30.stagger, 3.5) && near(P.cw30.blur, 8) && P.cw30.rise === 0.32, 'crispWords(): the same entry for <Words>, in film frames at 30 fps', JSON.stringify(P.cw30));
result(!['arc', 'assemble', 'decode', 'typeFocus', 'erode'].some((p) => P.end.includes(p)) && P.end.includes('crisp') && P.endArc === 'crisp' && P.endOpen === 'open', 'end cards: no preset that fades in letter by letter (arc becomes crisp; open stays)', P.end.join(','));

// 5. the confident moves (the house numbers in the header of src/fx/TypePresets.tsx)
const K = P.mask;
result(phrased(K.gaps, 8) && K.gaps.at(-1) === Math.max(...K.gaps) && near(K.heads.at(-1), 20) && K.heads.slice(0, -1).every((h) => near(h, 8)), 'mask: words 8 f apart on average, phrased into the last (the longest gap before it), an 8 f head, the last word 2.5x as long', `${K.gaps.join('/')} | ${K.heads.join('/')}`);
result(K.f0.opacity === 0 && near(K.f0.clip, 1.02) && near(K.f0.dy, 1.05) && near(K.f8.dy, K.dy8, 1e-6) && K.f4.dy > 0.55 && K.f4.dy < 0.75 && K.f12.dy < 0.08 && K.f20.dy < 0.025,
  'mask: under the mask on its first frame, a near-linear head (85 % of 1.05 em in 8 f) that stops dead', JSON.stringify({ f4: +K.f4.dy.toFixed(3), f8: +K.f8.dy.toFixed(4), f12: +K.f12.dy.toFixed(4) }));
const L = P.land;
result(near(L.s0, 1.7) && near(L.s34, 1) && L.s17 > 1.03 && L.s17 < 1.2 && near(L.b0, 0.05 * 0.7, 1e-9) && L.b34 === 0, 'land: cuts in at x1.7, lands on E.glideOut in 34 f, a slight defocus riding the scale (sharp as it lands)', JSON.stringify({ s17: +L.s17.toFixed(3), b0: +L.b0.toFixed(3) }));
result(L.on[2] === L.landed && near(L.on[3] - L.on[2], 12) && L.w2before === 0 && near(L.w2at, 0.45) && near(L.w2solid, 1), 'land: with a lead, the other words append 12 f apart once it has landed, cut on at 45 % and solid in 6 f', JSON.stringify(L.on));
const Y = P.fly;
result(Y.on[0] === 0 && near(Y.on.at(-1), 20, 1e-6) && !near(Y.on[1], 10, 0.5) && near(Y.s0, 5) && near(Y.s14, 1) && Y.s7 > 1 && Y.s7 < 1.3 && Y.s0w1 > 2.5 && Y.s0w1 <= 5 && Y.b14 === 0, 'fly: every word flies in from x5 and lands in 14 f (log scale on E.snapOut), 10 f after the last', JSON.stringify({ s7: +Y.s7.toFixed(3), on: Y.on, s0w1: Y.s0w1, s0: Y.s0, s14: Y.s14, b14: Y.b14 }));
result(near(Y.open, 42) && near(Y.dxShut, -0.56, 1e-6) && Math.abs(Y.dxOpen) < 1e-9, 'fly: the words land touching; 8 f after the last lands the spaces open in 10 f', JSON.stringify({ shut: Y.dxShut, open: Y.dxOpen }));
const S = P.snap;
result(S.at === 20 && near(S.before, 1 / 2.2, 1e-9) && S.at1 === 1 && S.last0 === 0 && near(S.lastAt, 0.16) && S.decl.some((r) => r.from === 20 && r.to === 21),
  'snap: the read words sit at 1/2.2; ONE frame (declared) takes the line to full size as the last word lands from 16 %', JSON.stringify({ at: S.at, before: +S.before.toFixed(4) }));
const R = P.room;
const D = R.xs[0] > 0 ? 2.24 : NaN; // 'You are' centred in a 15-letter mono line
result(R.jump === 44 && near((R.xs[2] - R.xs[3]) / D, 0.675, 0.01) && R.xs[0] > R.xs[2] && Math.abs(R.xs[5]) < 0.01 && R.lastBefore === 0 && R.lastAt === 1 && R.decl.some((r) => r.from === 44 && r.to === 45),
  'room: the held words creep, cover 67.5 % in ONE declared frame and settle; the last word cuts on in the room', R.xs.map((x) => x.toFixed(3)).join('/'));
const G = P.glide;
result(phrased(G.ons, 3.5) && near(G.x0, 2.4) && Math.abs(G.x96) < 1e-9 && G.w0.opacity > 0.2 && G.w0.opacity < 1 && G.w0.blur > 0 && near(G.w0end.opacity, 1) && G.w0end.blur === 0,
  'glide: the set line slides in 2.4 em and slows into a drift; words resolve left to right 3.5 f apart on average (phrased), solid in 8 f', JSON.stringify({ w0: [+G.w0.opacity.toFixed(3), +G.w0.blur.toFixed(4)] }));
const F = P.fall;
result(F.f1.dy < 0 && F.f1.smear[1] < 0 && F.f1.opacity >= 0.4 && F.f1.opacity < 1 && F.f12.dy === 0 && F.f12.opacity === 1 && F.gap < 9, 'fall: each word drops into place from above in 12 f, trailing a short smear, 9 f apart on average (phrased: the first gap the quickest)', JSON.stringify({ dy1: +F.f1.dy.toFixed(3) }));
const O = P.open;
result(O.on.join() === '0,12,19' && near(O.f0.blur, 0.05) && near(O.f2.blur, 0.05 * 0.41, 1e-9) && O.f0.color === O.f6.color && O.f30.color !== O.f0.color && O.smear > 0,
  'open: a new word cuts on soft (falling to 0.41 a 30 fps frame) and in the accent, holds 6 f and cools; the re-centre trails', JSON.stringify({ blur2: O.f2.blur, smear: +O.smear.toFixed(4) }));
result(P.build.f0.opacity < 0.05 && P.build.f20 > 0.98 && P.build.maxBlur === 0, 'build: each word fades in over 20 f (a tint walking to ink), sharp all the way', JSON.stringify(P.build));
result(P.developFeather <= 1.2, 'develop: the head reveals the line behind a crisp edge (1.1 em), not a long feather', String(P.developFeather));

// 6. exits leave at speed
const X = P.exits;
const ones = (a, k) => a.slice(0, k).every((v) => v === 1);
const zeros = (a, k) => a.slice(a.length - k).every((v) => v === 0);
result(X.slide.len === 22 && X.slide.f10 > 0 && X.slide.f15.every((v) => v === 1) && zeros(X.slide.f17, 4) && ones(X.slide.f17, 20) && zeros(X.slide.f19, 10) && zeros(X.slide.f21, 13) && ones(X.slide.f21, 11) && X.slide.gone === false,
  'slide: the line accelerates sideways for 22 f; its last three words drop off right to left 2 f apart; nothing fades', JSON.stringify(X.slide.f19));
result(X.spread.len === 26 && X.spread.s25 > 1.35 && X.spread.s25 <= 1.6 && X.spread.last10 === 1 && X.spread.last25 === 0 && X.spread.first25 > 0 && X.spread.dxLast > 0,
  'spread: the words track apart while the camera zooms toward the first one; they go right to left', JSON.stringify(X.spread));
result(X.collapse.len === 10 && X.collapse.dx9 < 0 && X.collapse.gone === false, 'collapse: the tracking collapses toward the centre and the line is cut after 10 f', JSON.stringify(X.collapse));
result(X.drift.op === 1 && X.drift.y < 0, 'drift: carried up and away at speed, never faded', JSON.stringify(X.drift));
const RL = P.roles;
result(['crisp', 'mask', 'land', 'snap', 'room'].every((p) => RL.hero.includes(p)) && RL.soft.join() === 'typeFocus' && RL.softExits.join() === 'blur' && RL.heroTF === 'crisp' && RL.heroMask === 'mask',
  'roles: confident presets for hero lines; the soft ones (typeFocus, the blur exit) never take one', JSON.stringify(RL));

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
