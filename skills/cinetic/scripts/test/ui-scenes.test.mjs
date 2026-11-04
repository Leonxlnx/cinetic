#!/usr/bin/env node
/**
 * ui-scenes.test.mjs: the house scenes built around product UI and big type (src/scenes: decode-title, toast-stack,
 * scan-grid, page-fly, glass-prompt, word-cards, macro-type, iris-input) against their contract, read from the modules
 * (no render).
 *
 *   1. meta     id = the file's name, listed in SCENES; 1.5-3 s at 30 fps (45-90 frames); the content it takes named;
 *               the forms it takes over and hands on are spine forms with boxes on the 1080p stage; big or quiet (at
 *               least half big); sound cues in order, inside the scene, of the effects plan's kinds.
 *   2. decode   the dashes are a pure function of the frame (same answer twice), keep out of the title band and are
 *               gone after the decode; the title opens over 18 f and the button lands on its click.
 *   3. timing   the toast arrivals come 7 then 4 f apart and the stack rests inside the scene; the scan's click comes
 *               before the tilt, the grid rises after it and pulls back before the end; the page rises before it
 *               travels and leaves at the end (it comes in rising, the headline follows its on-screen aim
 *               and the travel is front-loaded); the prompt's placeholder cuts before the typing starts; the macro
 *               scene's length grows with the request (and its default is the meta's); the iris opens before the
 *               input lands and the push runs to the end.
 *   4. iris     the window's outline lies between the disc (0.80 R) and the lobe tips (R), and turns with its angle.
 *   5. subject  every scene shows its subject by frame 6 (never an empty card, page or field at its start): the first
 *               toast lands on frame 0 for any number of toasts and is whole on screen by frame 4; the page comes in
 *               with its headline on screen on its first frame; the title decodes and the link types from the first
 *               frames.
 *
 * It runs the scene modules through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/ui-scenes.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/ui-scenes.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
// the index also lists scenes drawn with three.js: without it installed, the listing is read from the index's text
const has3D = existsSync(join(STARTER, 'node_modules', 'three', 'package.json'));
const FILES = ['decode-title', 'toast-stack', 'scan-grid', 'page-fly', 'glass-prompt', 'word-cards', 'macro-type', 'iris-input'];
const PROBE = `
import { FORMS } from '${url('lib/spine.ts')}';
${has3D ? `import { SCENES } from '${url('scenes/index.ts')}';` : 'const SCENES: Record<string, unknown> = {};'}
${FILES.map((f, i) => `import * as M${i} from '${url(`scenes/${f}.tsx`)}';`).join('\n')}
const mods: Record<string, any> = { ${FILES.map((f, i) => `'${f}': M${i}`).join(', ')} };
const metas: Record<string, any> = {};
for (const [f, m] of Object.entries(mods)) metas[f] = Object.entries(m).find(([k]) => k.endsWith('Meta'))?.[1] ?? null;
const D = M0 as any, T = M1 as any, S = M2 as any, P = M3 as any, G = M4 as any, K = M6 as any, I = M7 as any;
const dashes = Array.from({ length: 26 }, (_, t) => D.dashesAt(t));
const radii = (R: number, rot: number) => {
  const pts = I.irisPath(960, 540, R, rot).replace(/[MZ]/g, '').trim().split(' L').map((p: string) => p.split(',').map(Number));
  return pts.map(([x, y]: number[]) => Math.hypot(x - 960, y - 540));
};
console.log(JSON.stringify({
  FORMS,
  metas,
  listed: Object.keys(SCENES),
  decode: { DECODE: D.DECODE, dashes, again: JSON.stringify(D.dashesAt(7.5)) === JSON.stringify(D.dashesAt(7.5)) },
  toasts: T.TOASTS,
  stack: [1, 2, 3, 4, 5].map((n) => T.stackFrame(n)).concat([T.stackFrame(3, true)]),
  toastFirst: [1, 2, 3, 4, 5].map((n) => ({ n, arrive: T.toastArrivals(n), top0: T.toastFirstTop(0, n), top4: Math.max(T.toastFirstTop(4, n), T.toastFirstTop(4, n, true)) })),
  scan: S.SCAN,
  page: P.PAGE_FLY,
  pageY: Array.from({ length: 61 }, (_, t) => [P.pageFlyScreenY(516, P.pageFlyCamera(t, 516)), P.pageFlyScreenY(0, P.pageFlyCamera(t, 516))]),
  prompt: G.GLASS_PROMPT,
  macro: { M: K.MACRO_TYPE, durs: [K.macroTypeDur(K.MACRO_TYPE_SAMPLE), K.macroTypeDur('Could you move my two o clock and tell the whole team?'), K.macroTypeDur('Hi')] },
  iris: { IRIS: I.IRIS_INPUT, r: radii(400, 0), turned: I.irisPath(960, 540, 400, 0) !== I.irisPath(960, 540, 400, 10) },
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-ui-scenes-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
if (!has3D) {
  // each scene's meta import from its file and its SCENES entry, read from the index's text
  const index = readFileSync(join(SRC, 'scenes', 'index.ts'), 'utf8');
  const metaName = (f) => `${f.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Meta`;
  P.listed = FILES.filter((f) => index.includes(`from './${f}'`) && index.includes(`[${metaName(f)}.id]: ${metaName(f)}`));
}

// 1. meta
const KINDS = ['tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop', 'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text'];
const boxOk = (b) => b && P.FORMS.includes(b.form) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0 && b.x + b.w > 0 && b.x < 1920 && b.y + b.h > 0 && b.y < 1080;
const boxNear = (b) => b && P.FORMS.includes(b.form) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0; // a page entering or leaving lies past the edge
for (const [file, m] of Object.entries(P.metas)) {
  result(!!m && m.id === file, `${file}: exports its meta entry, id = the file's name`, m?.id);
  if (!m) continue;
  result(m.dur >= 45 && m.dur <= 90, `${file}: ${m.dur} f at 30 fps (${(m.dur / 30).toFixed(2)} s) is 1.5-3 s`);
  result(Array.isArray(m.props) && m.props.length > 0 && m.props.every((p) => typeof p === 'string' && p.length > 0), `${file}: names the content it takes (${m.props.join(', ')})`);
  const near = file === 'page-fly' ? boxNear : boxOk;
  result((m.handIn === null || near(m.handIn)) && near(m.handOut), `${file}: hands ${m.handIn ? m.handIn.form : 'nothing'} in, ${m.handOut?.form} out, as spine forms on the stage`);
  result(m.klass === 'big' || m.klass === 'quiet', `${file}: is ${m.klass}`);
  const cues = m.cues ?? [];
  result(cues.length > 0 && cues.every((c, i) => KINDS.includes(c.kind) && c.f >= 0 && c.f < m.dur && c.weight > 0 && c.weight <= 1 && (i === 0 || c.f >= cues[i - 1].f)), `${file}: ${cues.length} sound cues inside the scene, of the plan's kinds`, JSON.stringify(cues.map((c) => [c.f, c.kind])));
  result(P.listed.includes(file), `${file}: listed in SCENES`);
}
const big = Object.values(P.metas).filter((m) => m?.klass === 'big').length;
result(big * 2 >= FILES.length, `at least half of them are big moments (${big} of ${FILES.length})`);

// 2. decode
const { DECODE, dashes, again } = P.decode;
result(again, 'decode-title: the dashes are a pure function of the frame');
result(dashes.every((list) => list.every((d) => d.y + d.h <= 440 || d.y >= 640)), 'decode-title: no dash inside the title band (y 440-640)');
result(dashes.slice(0, 6).some((l) => l.length > 6) && dashes.slice(24).every((l) => l.length === 0), 'decode-title: a burst of dashes on the first frames, none after the decode', dashes.map((l) => l.length).join(' '));
result(DECODE.decode[1] - DECODE.decode[0] === 18 && DECODE.fly[1] === DECODE.click && DECODE.click < DECODE.dur, 'decode-title: the title opens over 18 f and the button is clicked on its landing, inside the scene');

// 3. timing
const T = P.toasts;
const gaps = T.arrive.slice(1).map((a, i) => a - T.arrive[i]);
result(gaps.join() === '7,4,4,4' && T.rest < T.dur, 'toast-stack: arrivals 7, 4, 4, 4 f apart and the stack at rest inside the scene', gaps.join());
// framing: the stack is the frame's subject, centred, at least 40 % of the frame wide, for any number of toasts
const stackOk = P.stack.every((s) => Math.abs(s.top + s.shift + (s.bottom - s.top) / 2 - 540) < 1 && Math.abs(s.x + s.w / 2 - 960) < 1 && s.w >= 0.4 * 1920 && s.top + s.shift >= 0 && s.bottom + s.shift <= 1080);
result(stackOk, 'toast-stack: the stack at rest is centred on the frame and at least 40 % of its width, for 1-5 toasts (and with a total)', P.stack.map((s) => `${(s.top + s.shift).toFixed(0)}-${(s.bottom + s.shift).toFixed(0)}`).join(' '));
const S = P.scan;
result(S.type[1] <= S.click && S.click < S.tilt[0] + 1 && S.tilt[1] <= S.rise[0] && S.rise[1] <= S.pull[0] && S.pull[1] < S.dur && S.colour.every((c, i) => i === 0 || c > S.colour[i - 1]), 'scan-grid: typed, clicked, tilted, risen (tiles colour in reading order) and pulled back, in order');
const G = P.page;
result(G.rise[1] < G.travel[1] && G.travel[1] <= G.exit[0] && G.exit[1] === G.dur, 'page-fly: the page rises before the travel ends and leaves on the last frame');
const py = P.pageY.map((p) => p[0]);
result(P.pageY[0][1] > 0 && P.pageY[0][1] < py[0] && Math.abs(py[3] - 760) < 2 && py.every((y, i) => i === 0 || y < py[i - 1]) && py[60] > 0 && py[60] < 120 && py[9] - py[31] > 3 * (py[31] - py[52]), 'page-fly: the page comes in rising, the headline sits where its aim says and the travel is front-loaded', `${py[0].toFixed(0)} ${py[3].toFixed(0)} ${py[31].toFixed(0)} ${py[60].toFixed(0)}`);
result(P.prompt.cut < P.prompt.type && P.prompt.type < P.prompt.dur, 'glass-prompt: the placeholder cuts out before the request types in');
const [k0, k1, k2] = P.macro.durs;
result(k0 === P.metas['macro-type'].dur && k1 > k0 && k2 < k0 && k1 <= 110, 'macro-type: its length grows with the request (the default is the meta\'s)', `${k0} ${k1} ${k2}`);
const I = P.iris.IRIS;
result(I.open < I.pill && I.push[1] === I.dur && I.leave[1] === I.dur, 'iris-input: the window opens before the input lands, the push and the headline leave run to the end');

// 5. subject: on screen by frame 6, never an empty card, page or field at the scene's start
const tf = P.toastFirst;
result(tf.every((x) => x.arrive[0] === 0 && x.top0 < 1080 - 100 && x.top4 + 215 <= 1080), 'toast-stack: the first notice lands on frame 0 (on screen from the first frame, whole by frame 4) for 1-5 toasts', tf.map((x) => `${x.n}:${x.arrive[0]}/${x.top0.toFixed(0)}/${x.top4.toFixed(0)}`).join(' '));
result(py[0] <= 1020 && py[6] <= 1080 - 140, 'page-fly: the page carries its headline from its first frame (centre 1020 px down at most, whole by frame 6)', `${py[0].toFixed(0)} ${py[6].toFixed(0)}`);
result(DECODE.decode[0] <= 6 && S.type[0] <= 6, 'decode-title, scan-grid: the title decodes and the link types in from the first frames', `${DECODE.decode[0]} ${S.type[0]}`);

// 4. iris
const rr = P.iris.r;
result(Math.min(...rr) >= 0.8 * 400 - 0.5 && Math.max(...rr) <= 400 + 0.5 && Math.max(...rr) > 395, 'iris-input: the outline lies between the disc (0.80 R) and the lobe tips (R)', `${Math.min(...rr).toFixed(1)} .. ${Math.max(...rr).toFixed(1)}`);
result(P.iris.turned, 'iris-input: the lobes turn with the angle');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
