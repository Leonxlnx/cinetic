#!/usr/bin/env node
/**
 * bank-d.test.mjs: the house scenes cloud-dome, photo-orbit, card-rivers, site-flip and ribbon-ring (src/scenes)
 * against their contract, read from the modules (no render).
 *
 *   1. meta     id = the file's name, listed in SCENES; 1.5-3 s at 30 fps (45-90 frames) and the file's own length
 *               constant; the content it takes named; the forms it takes over and hands on are spine forms with boxes
 *               on the 1920 x 1080 stage; big or quiet; sound cues in order, inside the scene, of the plan's kinds;
 *               the leading comment carries the house-scene marker.
 *   2. lengths  every timed event lands inside the scene: the words' onsets, the swap, the whip, the build, the exit.
 *   3. palette  each scene takes a palette and paints from it: no colour literal is saturated (the accent comes from
 *               the palette, never a fixed hue), none is green or violet, and the starter's own accent is never named
 *               (with no logo, the placeholder mark takes the palette's accent).
 *   4. handover the words a scene hands on sit centred on the stage; the page leaves past the left edge; the flare
 *               hands on the whole frame; the line the dome scene takes over is centred.
 *   5. numbers  photo-orbit: tiles in front of the line are larger and lower than those behind, the glow is an event at
 *               the ends only, the ring turns faster first; card-rivers: the arms are point-symmetric about the
 *               centre, no card ever covers the word, the river accelerates into the cut; ribbon-ring: full strength
 *               in 4 f, a fade after the whip, the phrase's gaps shrink; site-flip: the page enters from the right,
 *               its turn swings from far-right to near-right, the exit accelerates; cloud-dome: the tilt stops dead,
 *               the push accelerates, near tiles are larger and softer than far ones.
 *
 * cloud-dome draws fx/three's GlassDome on a GPU: when the starter's three.js packages are not installed its module
 * checks are skipped (and said so), its text and index checks still run.
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/bank-d.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/bank-d.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const ALL = ['cloud-dome', 'photo-orbit', 'card-rivers', 'site-flip', 'ribbon-ring'];
const FILES = ALL.filter((f) => has3D || f !== 'cloud-dome');
const PROBE = `
import { FORMS } from '${url('lib/spine.ts')}';
${has3D ? `import { SCENES } from '${url('scenes/index.ts')}';` : 'const SCENES: Record<string, unknown> = {};'}
${FILES.map((f, i) => `import * as M${i} from '${url(`scenes/${f}.tsx`)}';`).join('\n')}
const mods: Record<string, any> = { ${FILES.map((f, i) => `'${f}': M${i}`).join(', ')} };
const metas: Record<string, any> = {};
for (const [f, m] of Object.entries(mods)) metas[f] = Object.entries(m).find(([k]) => k.endsWith('Meta'))?.[1] ?? null;
const O = mods['photo-orbit'], K = mods['card-rivers'], S = mods['site-flip'], R = mods['ribbon-ring'], D = mods['cloud-dome'];
const range = (a: number, b: number, s = 1) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);
console.log(JSON.stringify({
  FORMS,
  metas,
  listed: Object.keys(SCENES),
  orbit: {
    C: O.PHOTO_ORBIT,
    mid: O.orbitPlaces(30, 4),
    glow: range(0, 68).map((t: number) => O.orbitGlow(t)),
    words: [0, 1, 2, 3].map((i) => O.orbitWordAt(i, 4)),
  },
  rivers: {
    C: K.CARD_RIVERS,
    sym: [24, 40, 60, 80, 100].map((a) => { const p = K.armPoint(0, a), q = K.armPoint(1, a); return [(p.x + q.x) / 2, (p.y + q.y) / 2]; }),
    cards: range(0, 86).map((t: number) => K.riverCards(t)),
    speed: range(0, 87).map((t: number) => K.riverSpeed(t)),
    travel: range(0, 87).map((t: number) => K.riverTravel(t)),
  },
  ring: {
    C: R.RIBBON_RING,
    strength: range(0, 55).map((t: number) => R.ribbonStrength(t)),
    on3: R.ribbonOnsets(3, R.RIBBON_RING.first.from, R.RIBBON_RING.first.to),
    on5: R.ribbonOnsets(5, R.RIBBON_RING.first.from, R.RIBBON_RING.first.to),
    on2: R.ribbonOnsets(2, R.RIBBON_RING.second.from, R.RIBBON_RING.second.to),
  },
  site: { C: S.SITE_FLIP, pose: range(2, 61).map((t: number) => S.sitePose(t)), held: S.sitePose(61, false) },
  dome: D ? { C: D.CLOUD_DOME, push: range(28, 84).map((t: number) => D.domePush(t)), tiles: D.domeTiles(50, 6) } : null,
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-bank-d-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
if (!has3D) {
  console.log('skip  cloud-dome: three.js is not installed in the starter (npm install), its module checks did not run');
  const index = readFileSync(join(SRC, 'scenes', 'index.ts'), 'utf8');
  const metaName = (f) => `${f.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Meta`;
  P.listed = ALL.filter((f) => index.includes(`from './${f}'`) && index.includes(`[${metaName(f)}.id]: ${metaName(f)}`));
}
const text = Object.fromEntries(ALL.map((f) => [f, readFileSync(join(SRC, 'scenes', `${f}.tsx`), 'utf8')]));

// 1. meta
const KINDS = ['tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop', 'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text'];
const boxOk = (b) => b && P.FORMS.includes(b.form) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0 && b.x + b.w > 0 && b.x < 1920 && b.y + b.h > 0 && b.y < 1080;
const LEN = { 'photo-orbit': P.orbit.C.dur, 'card-rivers': P.rivers.C.dur, 'site-flip': P.site.C.dur, 'ribbon-ring': P.ring.C.dur, 'cloud-dome': P.dome?.C.dur };
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
const big = Object.values(P.metas).filter((m) => m?.klass === 'big').length;
result(big * 2 >= Object.keys(P.metas).length, `most of them are big moments (${big} of ${Object.keys(P.metas).length})`);

// 2. lengths
const O = P.orbit.C;
result(P.orbit.words.every((w, i) => w < O.dur && (i === 0 || w > P.orbit.words[i - 1])) && O.glowOut[O.glowOut.length - 1][0] < O.dur, 'photo-orbit: the words cut on in order and the flare peaks inside the scene', P.orbit.words.join(' '));
const K = P.rivers.C;
result(K.swap < K.dur && K.second[K.second.length - 1][0] <= K.dur && K.speed[K.speed.length - 1][0] <= K.dur, 'card-rivers: the swap and the last speed key are inside the scene');
const RR = P.ring.C;
result(RR.first.to < RR.fade.at && RR.second.from === RR.fade.at && RR.second.to < RR.dur, 'ribbon-ring: the first phrase ends before the whip, the second lands with it, all inside the scene');
const SF = P.site.C;
const lastSection = SF.build.at + 8 * SF.build.every;
result(lastSection < SF.exit[0] && SF.exit[1] === SF.dur - 1, 'site-flip: the page is built before it leaves, the exit runs to the last frame', `${lastSection} < ${SF.exit[0]}`);
if (P.dome) {
  const DC = P.dome.C;
  result(DC.crane[DC.crane.length - 1][0] < DC.zoom[0] && DC.zoom[1] === DC.dur, 'cloud-dome: the diorama lands long before the push cut, the zoom-blur ends on the last frame');
}

// 3. palette: no fixed accent, nothing green or violet, never the starter's own accent
const oklch = (hex) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r0, g0, b0] = [0, 2, 4].map((i) => lin(parseInt(f.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r0 + 0.5363325363 * g0 + 0.0514459929 * b0);
  const m = Math.cbrt(0.2119034982 * r0 + 0.6806995451 * g0 + 0.1073969566 * b0);
  const s = Math.cbrt(0.0883024619 * r0 + 0.2817188376 * g0 + 0.6299787005 * b0);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
};
for (const file of ALL) {
  const src = text[file];
  const lits = [...src.matchAll(/'#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})'/g)].map((m) => `#${m[1]}`);
  const bad = lits.filter((x) => {
    const c = oklch(x);
    return c.C >= 0.08 || (c.C >= 0.03 && ((c.h >= 125 && c.h <= 165) || (c.h >= 280 && c.h <= 330)));
  });
  result(/palette\?: Partial<Palette>/.test(src) && /paletteOf\(/.test(src), `${file}: takes a palette and paints from it`);
  result(bad.length === 0, `${file}: no saturated, green or violet colour literal (${lits.length} literals, all neutral or pale material)`, bad.join(' '));
  result(!/C\.accent(?!\)\.join\(P\.accent\))/.test(src) && !/#08965A/i.test(src), `${file}: never paints in the starter's own accent`);
}
result(/SAMPLE_MARK_SVG\.split\(C\.accent\)\.join\(P\.accent\)/.test(text['cloud-dome']), 'cloud-dome: with no logo the placeholder mark takes the palette\'s accent');

// 4. handover forms
const M = P.metas;
const centred = (b) => Math.abs(b.x + b.w / 2 - 960) < 24;
if (M['photo-orbit']) result(M['photo-orbit'].handOut.form === 'world' && M['photo-orbit'].handOut.w === 1920 && M['photo-orbit'].handIn === null, 'photo-orbit: opens on its own picture and hands the flared frame on');
if (M['card-rivers']) result(M['card-rivers'].handOut.form === 'word' && centred(M['card-rivers'].handOut), 'card-rivers: hands its word on, centred');
if (M['ribbon-ring']) result(M['ribbon-ring'].handOut.form === 'word' && centred(M['ribbon-ring'].handOut), 'ribbon-ring: hands its line on, centred');
if (M['site-flip']) result(M['site-flip'].handOut.form === 'page' && M['site-flip'].handOut.x < 0, 'site-flip: hands the page on as it leaves past the left edge');
if (M['cloud-dome']) result(M['cloud-dome'].handIn.form === 'word' && centred(M['cloud-dome'].handIn) && M['cloud-dome'].handOut.form === 'world', 'cloud-dome: takes the line over centred and hands the world on');

// 5. measured numbers
const mid = P.orbit.mid;
const front = mid.filter((p) => p.z > 0);
const back = mid.filter((p) => p.z < 0);
result(front.length > 0 && back.length > 0 && Math.min(...front.map((p) => p.s)) > Math.max(...back.map((p) => p.s)) && Math.min(...front.map((p) => p.y)) > Math.max(...back.map((p) => p.y)), 'photo-orbit: tiles in front of the line are larger and lower than those behind', mid.map((p) => `${p.s.toFixed(0)}@${p.y.toFixed(0)}`).join(' '));
const g = P.orbit.glow;
result(g[0] === 1 && g.slice(5, 60).every((v) => v === 0) && g[68] === 1, 'photo-orbit: the glow is an event at the in and the out only');
const turn = (t) => { const k = O.turn; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (t - k[i - 1][0])) / (k[i][0] - k[i - 1][0]); return k[k.length - 1][1]; };
result((turn(10) - turn(2)) / 8 > 3 * ((turn(54) - turn(10)) / 44), 'photo-orbit: the ring turns fast first (40 % by f10), then slow');
result(P.rivers.sym.every(([x, y]) => Math.abs(x - 965) < 1 && Math.abs(y - 540) < 1), 'card-rivers: the arms are point-symmetric about (965, 540)');
// the word's band (cap and descender, 40 px either side of the centre line): every card crossing that band keeps
// clear of a word up to 380 px wide (a long word at the house size), so the word is never covered
const free = P.rivers.cards.map((cs) => Math.min(9999, ...cs.filter((c) => Math.abs(c.y - 540) < (c.w * K.card.ratio) / 2 + 40).map((c) => Math.abs(c.x - 960) - c.w / 2)));
const minFree = Math.min(...free);
result(minFree >= 190, 'card-rivers: no card ever covers the word (a 380 px word stays clear at every frame)', `closest card edge ${minFree.toFixed(0)} px from the centre`);
const sp = P.rivers.speed;
const tr = P.rivers.travel;
result(sp[87] > 4 * sp[57] && sp[0] > sp[5] && tr.every((d, i) => i === 0 || d > tr[i - 1]), 'card-rivers: the river brakes after the cut, cruises, and accelerates x4 into the cut', `${sp[0]} ${sp[5]} ${sp[57]} ${sp[87]}`);
const per = P.rivers.cards.slice(20, 40).map((cs) => [0, 1].map((a) => cs.filter((c) => c.arm === a && c.x > -100 && c.x < 2020 && c.y > -100 && c.y < 1180).length));
result(per.every(([a, b]) => a >= 4 && a <= 8 && b >= 4 && b <= 8), 'card-rivers: 5-6 cards in view on each arm at cruise', per.map((p) => p.join('/')).join(' '));
const st = P.ring.strength;
result(st[4] > 0.99 && st[29] > 0.99 && st[45] < 0.2 && st[55] >= RR.fade.floor && st[55] < 0.1, 'ribbon-ring: full strength in 4 f, held to the whip, faded to a trace by the end', `${st[4].toFixed(2)} ${st[45].toFixed(2)} ${st[55].toFixed(3)}`);
const gaps = (on) => on.slice(1).map((o, i) => o - on[i]);
result([P.ring.on3, P.ring.on5].every((on) => on[0] === RR.first.from && Math.abs(on[on.length - 1] - RR.first.to) < 1e-9 && gaps(on).every((d, i, a) => d > 0 && (i === 0 || d <= a[i - 1]))) && P.ring.on2[1] === RR.second.to, 'ribbon-ring: a phrase\'s words gather pace (gaps shrink) and fill their span', P.ring.on3.map((x) => x.toFixed(1)).join(' '));
const pose = P.site.pose;
const at = (t) => pose[t - 2];
result(at(2).x > at(25).x && at(25).x > at(45).x && at(2).x > 1700, 'site-flip: the page comes in from the right and travels left', `${at(2).x.toFixed(0)} ${at(25).x.toFixed(0)} ${at(45).x.toFixed(0)}`);
result(at(25).yaw > 10 && at(45).yaw < -3, 'site-flip: its turn swings from right side far to right side near', `${at(25).yaw.toFixed(1)} ${at(45).yaw.toFixed(1)}`);
result(at(60).x - at(61).x > 3 * (at(53).x - at(54).x) && at(61).x < at(51).x - 300, 'site-flip: the exit accelerates out to the left', `${(at(53).x - at(54).x).toFixed(0)} -> ${(at(60).x - at(61).x).toFixed(0)} px/f`);
result(Math.abs(P.site.held.x - at(51).x) < 1, 'site-flip: exit false holds the last pose');
if (P.dome) {
  const DC = P.dome.C;
  const c = (t) => DC.crane.find((k) => k[0] === t)?.[1];
  result(c(20) - c(21) > 80 && c(26) - c(27) < 25 && c(28) === 0 && DC.crane.every((k, i) => i === 0 || k[1] <= DC.crane[i - 1][1]), 'cloud-dome: the tilt whips and stops dead at f28');
  const pu = P.dome.push;
  result(pu.every((m, i) => i === 0 || m >= pu[i - 1]) && pu[56] - pu[52] > pu[24] - pu[12], 'cloud-dome: the push only goes in and accelerates into the cut', `${pu[0]} ${pu[24].toFixed(3)} ${pu[56].toFixed(3)}`);
  const ts = P.dome.tiles;
  const near = ts.reduce((a, b) => (b.z > a.z ? b : a));
  const far = ts.reduce((a, b) => (b.z < a.z ? b : a));
  result(near.s > far.s * 1.5 && near.blur > 4 && near.blur > far.blur && Math.min(...ts.map((x) => x.blur)) < 2.5, 'cloud-dome: the tile nearest the lens is larger and softer than the far one, those beside the glass nearly sharp', ts.map((x) => `${x.s.toFixed(0)}/${x.blur.toFixed(1)}`).join(' '));
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
