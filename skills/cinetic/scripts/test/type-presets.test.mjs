#!/usr/bin/env node
/**
 * type-presets.test.mjs: the one-line type presets of the Remotion starter (src/fx/TypePresets.tsx).
 *
 *   1. Timing: build's word gaps (14 / 10 / 10 f and a 28 f breath before the last, half that at 30 fps), the
 *      focus pull (blur x0.65 a frame at 30 fps), the wheel's shrinking gaps (16 f to 6 f), the font cycle's
 *      6 f steps, the punch (a 24 % push in 28 f), the redaction's 2 f steps, the swarm on twos.
 *   2. Exits: the dive zooms at a constant log rate (x8.2 in 14 f) into a covering ink, a deeper zoom (diveTo)
 *      at the same rate; push dims to 36 % on its first frame; the square full stop lands 5 f after the line.
 *   3. Properties: every preset with every exit is finite and repeatable, continuous presets give the same
 *      picture at the same second at 30 and 60 fps, and declares() marks the stepped runs and the dive seam.
 *   4. The entries: crisp (words 7 f apart, each rising 0.32 em and sharpening from 8 px on E.out over 26 f, moving
 *      while it resolves; crispWords() for <Words>), calm (PACE.calm's reveal in any film), and no letter-by-letter
 *      preset on an end card.
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
result(P.build60.join() === '14,10,10,28' && P.build30.join() === '7,5,5,14', 'build: words 14 / 10 / 10 f apart, a 28 f breath before the last (half at 30 fps)', `${P.build60.join('/')} | ${P.build30.join('/')}`);
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
result(C.ticks.join() === '7,7,7' && C.resolved > 121 && C.resolved <= 147, 'crisp: words 7 f apart (60 fps), the line landed within 26 f of its last word', `${C.ticks.join('/')} resolved ${C.resolved}`);
result(C.f1.opacity > 0.15 && C.f1.dy > 0.15 && near(C.f1.blur, 0.08 * Math.max(0, 1 - C.f1.opacity / 0.6), 1e-6) && C.f1.blur > 0 && C.f8.dy > 0.005 && C.f8.dy < C.f1.dy && C.f8.opacity > 0.85 && C.f20.dy > 0 && C.f126.dy === 0 && C.f126.blur === 0 && C.f126.opacity === 1,
  'crisp: a word shows on its first frame soft and low, rises 0.32 em on E.out and still moves once it reads (an 8 px blur at 1080p), home by 26 f', JSON.stringify({ f1: [C.f1.opacity, C.f1.dy, C.f1.blur].map((v) => +v.toFixed(3)), f8: +C.f8.dy.toFixed(4), f20: +C.f20.dy.toFixed(5) }));
result(C.w3before === 0 && C.w3at > 0, 'crisp: the last word waits for its own onset, 21 f after the first', `${C.w3before} -> ${C.w3at}`);
result(P.calm.ticks[0] === 100 && P.calm.ticks.at(-1) === 100 + 12 * 4 && P.calm.f1.dy > 0.3 && P.calm.blurMax === 0, "calm: the calm pace's reading cadence (a 48 f span for five words), a third of the line box of rise, no blur, in a crisp film too", JSON.stringify({ ticks: P.calm.ticks, dy: +P.calm.f1.dy.toFixed(3) }));
result(near(P.cw30.dur, 13) && near(P.cw30.stagger, 3.5) && near(P.cw30.blur, 8) && P.cw30.rise === 0.32, 'crispWords(): the same entry for <Words>, in film frames at 30 fps', JSON.stringify(P.cw30));
result(!['arc', 'assemble', 'decode', 'typeFocus', 'erode'].some((p) => P.end.includes(p)) && P.end.includes('crisp') && P.endArc === 'crisp' && P.endOpen === 'open', 'end cards: no preset that fades in letter by letter (arc becomes crisp; open stays)', P.end.join(','));

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
