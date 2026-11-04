#!/usr/bin/env node
/**
 * type-emphasis.test.mjs: the type that is not flat (src/fx/TypeEmphasis.ts, the emphasis inside fx/TypePresets.tsx,
 * fx/TypeStack.tsx, fx/TypeDepth.tsx, fx/TypeBehind.tsx) against their house numbers (lib/look.ts EMPHASIS_LOOK,
 * STACK_LOOK). Pure state only; nothing renders.
 *
 *   1. Key words: *marks* in a line's text name them and leave the text; an unpaired mark names nothing.
 *   2. Devices: the family's emphasis weight (calm 650, bold 800) and scale (x1.5, x1.35); the box in the ink; the width
 *      hold tightens the tracking by what the weight adds, never more than 0.06 em.
 *   3. On a line: the key words walk the preset's colour path and land in the accent (the rest in ink); a marker wipes
 *      on in 10 f starting 4 f after the key word lands (half the frames at 30 fps); a swell grows the key words'
 *      advances by its scale; <TypeLine> adds no house device (a line takes the emphasis its film gives it, else
 *      none); a line set flush left never re-centres.
 *   4. Layouts: a stack is centred by default; flush left its lines share their left edge, baselines 1.04 of the lower
 *      size apart, centred as a block, the stair steps a third of the line above; only the key line takes the emphasis
 *      (the film's default kind); exits go last line first, 2 f
 *      apart. Planes scale as perspective / distance, fade as they pass the lens, land sharp on the focus plane. A
 *      matte maps onto a cover-fitted picture.
 *
 * Usage (from the skill root):  node scripts/test/type-emphasis.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/type-emphasis.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as X from '${url('fx/TypeEmphasis.ts')}';
import * as S from '${url('fx/TypeStack.tsx')}';
import * as D from '${url('fx/TypeDepth.tsx')}';
import * as B from '${url('fx/TypeBehind.tsx')}';
import { C } from '${url('brand/tokens.ts')}';
import { PACE } from '${url('lib/pace.ts')}';
const film = (fps: number) => ({ fps, width: 1920, height: 1080, pace: PACE.crisp });
const st = (f: number, s: any, fps = 60, m?: any) => T.typeLineState(f, s, m ?? T.monoMetrics(T.typeLineSpec(s).text), film(fps));

// 1. key words
const k1 = X.parseKeyed('Brook is a *water bottle*.');
const k2 = X.parseKeyed('It watches *every* clip.');
const k3 = X.parseKeyed('One *star only');
const k4 = X.parseKeyed('*Sync it* with Google Fit.');

// 2. devices
const rc = X.resolveEmphasis('weight', 5, 4, { family: 'calm', accent: '#123456' });
const rb = X.resolveEmphasis('scale', 5, 4, { family: 'bold' });
const rcs = X.resolveEmphasis('scale', 5, 4, { family: 'calm' });
const rbox = X.resolveEmphasis('box', 5, 4, { accent: '#123456', ink: '#000001' });
const rmark = X.resolveEmphasis('marker', 5, 4, { accent: '#123456', ink: '#000001' });
const rmarked = X.resolveEmphasis('accent', 5, 4, { marked: [1, 2] });
const hold = [X.holdTracking(0, 300, 318, 6, 100), X.holdTracking(0, 300, 360, 6, 100), X.holdTracking(-0.03, 300, 300, 6, 100)];
const kp = [X.keysOf('[Product] turns your notes into [tasks].', '[tasks]'), X.keysOf('Sync it with Google Fit.', 'google fit'), X.keysOf('Plain line', 'absent')];
const dl = X.filmEmphasis(['a', 'b', 'c', 'name', 'close'], { kind: 'swell', fixed: ['close'], none: ['name'] });

// 3. on a line
const crisp = { preset: 'crisp', text: 'Brook is a *water bottle*.', at: 0, emph: 'weight', colors: { ink: '#111111', accent: '#2E86DE' } };
const cr = st(200, crisp);
const crKey = cr.glyphs[11].color; const crOther = cr.glyphs[0].color;
const ef60 = T.emphasisFrames({ ...crisp, emph: 'marker' }, film(60));
const ef30 = T.emphasisFrames({ ...crisp, emph: 'marker' }, film(30));
const mk = { ...crisp, emph: 'marker' };
const mkP = [ef60.from - 1, ef60.from, ef60.from + 5, ef60.to].map((f) => st(f, mk).emph?.p ?? -1);
const sw = { preset: 'crisp', text: 'It watches *every clip*.', at: 0, emph: 'swell' };
const swr = X.resolveEmphasis('swell', 4, 3, { marked: [2, 3], family: 'calm' });
const mBase = T.monoMetrics('It watches every clip.');
const mSw = T.monoMetrics('It watches every clip.', 100, 0.56, [], swr);
const swF = T.emphasisFrames(sw, film(60));
const swP = [swF.from, swF.from + 11, swF.to].map((f) => st(f, sw, 60, mSw).emph?.p ?? -1);
const def = {
  hero: T.defaultEmphasis({ preset: 'mask', text: 'a b', at: 0 }, 'line').emph,
  display: T.defaultEmphasis({ preset: 'land', text: 'a b', at: 0 }, 'display').emph,
  body: T.defaultEmphasis({ preset: 'calm', text: 'a b', at: 0 }, 'line').emph,
  caption: T.defaultEmphasis({ preset: 'crisp', text: 'a b', at: 0 }, 'caption').emph,
  off: T.defaultEmphasis({ preset: 'crisp', text: 'a b', at: 0, emph: false }, 'line').emph,
  own: T.defaultEmphasis({ preset: 'crisp', text: 'a b', at: 0, emph: 'sweep' }, 'line').emph,
};
const build = { preset: 'build', text: 'Move past the usual look', at: 0 };
const bxC = [20, 40, 60].map((f) => st(f, build).x);
const bxL = [20, 40, 60].map((f) => st(f, { ...build, align: 'left' }).x);
const clean = T.typeLineSpec(crisp);
const noMark = st(200, { preset: 'crisp', text: 'Plain line here', at: 0 });
const slotEm = T.lineEmphasis(T.typeLineSpec({ preset: 'wheel', text: 'It syncs to *phone*', at: 0, words: ['laptop'], emph: 'scale' }));
const finite = ['weight', 'accent', 'scale', 'swell', 'marker', 'box', 'under', 'outline', 'sweep'].every((e) =>
  ['crisp', 'mask', 'land', 'fly', 'snap', 'room', 'glide', 'fall', 'open', 'build', 'punch', 'develop'].every((p) => {
    const s = { preset: p, text: 'Your phone shows *your day*.', at: 10, out: 160, exit: 'slide', emph: e };
    return [0, 10, 30, 60, 90, 120, 170].every((f) => { const a = st(f, s); return a.glyphs.every((g) => Number.isFinite(g.dx) && Number.isFinite(g.opacity)) && (!a.emph || Number.isFinite(a.emph.p)); });
  }));

// 4. layouts
const lay = S.stackLayout([{ size: 100, width: 800 }, { size: 200, width: 600 }], { layout: 'left', x: 80, y: 540, baseline: 0.8 });
const stair = S.stackLayout([{ size: 100, width: 900 }, { size: 100, width: 600 }, { size: 100, width: 300 }], { layout: 'stair', x: 80, y: 540 });
const cen = S.stackLayout([{ size: 100, width: 800 }, { size: 100, width: 400 }], { layout: 'centre', x: 960, y: 540 });
const dflt = S.stackLayout([{ size: 100, width: 800 }, { size: 100, width: 400 }], { x: 960, y: 540 });
const sp = { lines: [{ text: 'Reelweek turns your week' }, { text: 'into a *reel*.', role: 'display' }], at: 100, out: 400, exit: 'slide', id: 'promise' };
const s0 = S.stackLineSpec(sp, 0, film(60)); const s1 = S.stackLineSpec(sp, 1, film(60));
const planes = { planes: [{ text: 'Far line', z: 3000 }, { text: 'Near line', z: 1400 }, { text: 'The read line', z: 2600 }], frame: 0, z0: 0, z1: 1200, from: 0, to: 120 };
const pl0 = D.typePlaneState(0, 2, planes, film(60));
const pl1 = D.typePlaneState(120, 2, planes, film(60));
const plNear = D.typePlaneState(120, 1, planes, film(60));
const plNear2 = D.typePlaneState(110, 1, planes, film(60));
const camAfter = [D.depthCamZ(120, planes, film(60)), D.depthCamZ(180, planes, film(60))];
const mt = B.matteToBox({ points: [[0, 0], [100, 50]], w: 200, h: 100 }, { x: 0, y: 0, w: 400, h: 400 });
const sp2 = [S.splitStatement('Brook is a water bottle.', [3, 4]), S.splitStatement('Drink more.', [1, 1]), S.splitStatement('Sync it with Google Fit.', [0, 1]), S.splitStatement('Your phone shows your day.')];
const decl = S.declares({ lines: [{ text: 'A snap line here', preset: 'snap' }, { text: 'and more' }], at: 0 }, film(60));

console.log(JSON.stringify({
  k1, k2, k3, k4,
  kp, dl, rc, rb, rcs, rbox, rmark, rmarked, hold,
  crKey, crOther, accent: '#2E86DE', clean: clean.text, cleanKeys: clean.keys, cleanKey: clean.key, noMarkKeys: noMark.emph ?? null,
  ef60, ef30, mkP, mBaseW: mBase.width, mSwW: mSw.width, swP, def, bxC, bxL, slotEm, finite,
  lay, stair, cen, dflt, s0: { emph: s0.emph, at: s0.at, out: s0.out, align: s0.align, id: s0.id }, s1: { emph: s1.emph, at: s1.at, out: s1.out },
  pl0, pl1, plNear, plNear2, camAfter, mt, sp2, decl: decl.stepped?.length ?? 0, ink: C.ink,
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-typeemph-'));
const probeFile = join(TMP, 'probe.tsx');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1. key words
result(P.k1.text === 'Brook is a water bottle.' && P.k1.words.join() === '3,4', 'marks: *water bottle* names words 3-4 and leaves the text', JSON.stringify(P.k1));
result(P.k2.words.join() === '2,2' && P.k2.text === 'It watches every clip.', 'marks: one marked word', JSON.stringify(P.k2));
result(P.k3.words === null && P.k3.text === 'One star only', 'marks: an unpaired mark names nothing and still leaves the text', JSON.stringify(P.k3));
result(P.k4.words.join() === '0,1', 'marks: a mark at the line head', JSON.stringify(P.k4));

// 2. devices
result(P.rc.weight === 650 && P.rc.color === '#123456' && P.rc.scale === 1 && P.rc.hold === true && P.rc.words.join() === '4,4', 'weight: the calm emphasis weight (650) in the accent, width held, on the keyword', JSON.stringify(P.rc));
result(near(P.rb.scale, 1.35) && P.rb.weight === 800 && P.rb.hold === false && near(P.rcs.scale, 1.5), 'scale: one step up the type scale (bold x1.35 at 800, calm x1.5); it never holds the width', JSON.stringify([P.rb.scale, P.rcs.scale]));
result(P.rbox.markColor === '#000001' && P.rmark.markColor === '#123456' && P.rmark.color === undefined, 'marks: the box in the ink, the marker in the accent; the words keep their colour for the knock-out', JSON.stringify([P.rbox.markColor, P.rmark.markColor]));
result(P.rmarked.words.join() === '1,2', 'the marked words win over the keyword', JSON.stringify(P.rmarked.words));
result(near(P.hold[0], -0.03) && near(P.hold[1], -0.06) && near(P.hold[2], -0.03), 'width hold: the tracking tightens by what the weight adds, at most 0.06 em', JSON.stringify(P.hold));

result(P.kp[0].join() === '5,5' && P.kp[1].join() === '3,4' && P.kp[2] === null, 'keysOf: a script names its key words in plain words; case and punctuation aside', JSON.stringify(P.kp));
result(P.dl.name === false && P.dl.close === 'accent' && P.dl.b === 'swell' && P.dl.a === false && P.dl.c === false, "film emphasis: a name takes none and does not count; a line placed by its width plays a size kind as the accent; 2 of 4 lines carry it", JSON.stringify(P.dl));

// 3. on a line
result(P.crKey === P.accent && P.crOther === '#111111' && P.clean === 'Brook is a water bottle.' && P.cleanKeys.join() === '3,4' && P.cleanKey === 3, 'weight on a line: the key words land in the accent, the rest in ink; the drawn text has no marks', JSON.stringify([P.crKey, P.crOther]));
result(P.noMarkKeys === null, 'a line with no emph in the pure state has no emphasis (the default is <TypeLine>\'s)');
result(near(P.ef60.to - P.ef60.from, 10) && near(P.ef30.to - P.ef30.from, 5) && near(P.ef60.from / 2, P.ef30.from, 1e-9), 'marker: wipes on in 10 f at 60 fps (5 at 30), 4 f after its key word lands', JSON.stringify([P.ef60, P.ef30]));
result(P.mkP[0] === 0 && P.mkP[1] === 0 && P.mkP[2] > 0.5 && P.mkP[2] < 1 && P.mkP[3] === 1, 'marker: nothing before it starts, past half by mid-wipe (E.snapOut), whole at its end', JSON.stringify(P.mkP));
result(near(P.mSwW - P.mBaseW, 0.5 * 11 * 0.56 * 100, 1e-6), 'swell: the key words\' advances grow by the scale (calm x1.5)', `${P.mBaseW} -> ${P.mSwW}`);
result(P.swP[0] === 0 && P.swP[1] > 0.5 && P.swP[2] === 1, 'swell: grows in over 22 f on E.glideOut once the line has landed', JSON.stringify(P.swP));
result(P.def.hero === undefined && P.def.display === undefined && P.def.body === undefined && P.def.caption === undefined && P.def.off === false && P.def.own === 'sweep', 'default: no house device: a hero line, a display line, a body line and a caption take none unless the film gives one; a named device stays', JSON.stringify(P.def));
result(P.bxC.some((x) => x > 0.01) && P.bxL.every((x) => Math.abs(x) < 1e-9), 'align left: a building line holds its left edge (no re-centre); centred, it re-centres', JSON.stringify([P.bxC, P.bxL]));
result(P.slotEm && P.slotEm.scale === 1 && P.slotEm.weight === undefined, 'slot presets (wheel, erode, cycle): the keyword takes colour devices only, never a size', JSON.stringify(P.slotEm));
result(P.finite, 'every device on every confident preset with an exit is finite at every frame');

// 4. layouts
result(P.lay[0].x === 80 && P.lay[1].x === 80 && near(P.lay[1].baseline - P.lay[0].baseline, 1.04 * 200) && near((P.lay[0].baseline - 0.727 * 100 + P.lay[1].baseline) / 2, 540), 'stack: flush left, baselines 1.04 of the lower size apart, the block centred from its cap line to its last baseline', JSON.stringify(P.lay));
result(near(P.stair[1].x - P.stair[0].x, 0.34 * 900) && near(P.stair[2].x - P.stair[1].x, 0.34 * 600) && near(P.cen[0].x + 400, 960) && near(P.cen[1].x + 200, 960), 'stack: the stair steps a third of the line above; centred lines share an axis', JSON.stringify([P.stair.map((b) => b.x), P.cen.map((b) => b.x)]));
result(near(P.dflt[0].x + 400, 960) && near(P.dflt[1].x + 200, 960), 'stack: centred by default (flush left only when asked)', JSON.stringify(P.dflt.map((b) => b.x)));
result(P.s0.emph === false && P.s1.emph?.device === 'accent' && P.s0.align === 'left' && near(P.s1.at - P.s0.at, 14) && near(P.s0.out - P.s1.out, 2) && P.s0.id === 'promise-0', 'stack: only the key line takes the emphasis; lines start 14 f apart; the last leaves first, 2 f apart', JSON.stringify([P.s0, P.s1]));
result(near(P.pl0.s, 1400 / 2600) && near(P.pl1.s, 1400 / 1400) && P.pl1.sigma === 0 && P.pl1.turn === 0 && P.pl0.sigma > 0, 'planes: scale = perspective / distance; the read plane lands sharp and frontal where the move ends', JSON.stringify([P.pl0, P.pl1]));
result(P.plNear.opacity > 0 && P.plNear.opacity < 1 && P.plNear.opacity < P.plNear2.opacity, 'planes: a plane near the lens fades as it passes', JSON.stringify([P.plNear2.opacity, P.plNear.opacity]));
result(P.camAfter[1] > P.camAfter[0], 'planes: the camera keeps creeping after its move', JSON.stringify(P.camAfter));
result(near(P.mt[0][0], -200) && near(P.mt[0][1], 0) && near(P.mt[1][0], 200) && near(P.mt[1][1], 200), 'behind: the matte maps onto the cover-fitted picture', JSON.stringify(P.mt));
result(P.sp2[0].join('|') === 'Brook is a|water bottle.' && P.sp2[1] === null && P.sp2[2] === null && P.sp2[3].join('|') === 'Your phone shows your|day.', 'statement: four words or more split before the key words; a short line or one led by its key words stays one line', JSON.stringify(P.sp2));
result(P.decl === 1, 'stack declares: its lines\' stepped runs (the snap\'s jump frame)', String(P.decl));

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
