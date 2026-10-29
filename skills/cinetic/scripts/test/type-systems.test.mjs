#!/usr/bin/env node
/**
 * type-systems.test.mjs: a film owns its headline systems and its compositions, and its type is set with care
 * (src/fx/TypeSystem.ts, the deal in fx/TypeEmphasis.ts, the marks and their timing in fx/TypePresets.tsx, every
 * template's src/deal.ts and its line file). Pure state only; nothing renders.
 *
 *   1. Systems: for 400 seeds and 3-9 lines, no system on two lines in a row and none on more than two lines (when the
 *      pool holds the film at two); given lines keep theirs and count; a line placed by its width only takes plain,
 *      front or rule; the same seed deals the same systems; checkSystems names a repeat and an overused system.
 *   2. Devices from systems: every template-style line deal (dealLineEmphasis) plays devices whose systems obey 1; a
 *      template's declared lines (declareHeadlines) count for its seed; the first line keeps the house default.
 *   3. Templates: for 24 product names each template's deal differs from its scaffold (FLOOR) in at least half its
 *      slots AND in at least half the slots that carry a composition (COMPOSITION: where the type and the picture sit,
 *      which leads), so the frame moves, not only the device names; the scaffold keeps the floor; the ui-walkthrough
 *      never deals the claim's object right after the promise's mark; the scaffold's own line deal (its line file or
 *      its declared lines) never repeats a dealt system.
 *   4. Type craft: a rule under words with descenders breaks round their ink (skip-ink) and, when the gaps would eat
 *      it, sits whole under the descender line; a bar behind words with a descender reaches below the descender line;
 *      an emphasis (marker, rule, swell, sweep) starts only once every word up to its key words is at rest, never
 *      while the word before is still moving in (fall, mask, land, glide, crisp; 60 and 30 fps agree).
 *
 * Usage (from the skill root):  node scripts/test/type-systems.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const TEMPLATES = join(SKILL, 'assets', 'templates');
const SRC = join(STARTER, 'src');
const TSX = process.env.CINETIC_TSX || join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/type-systems.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-typesys-'));
// each template's src beside a re-export of the starter's fx/TypeSystem (one module, so a deal's declarations reach the line deal)
const TPL = ['ui-walkthrough', 'social-ad', 'camera-teaser', 'prompt-run', 'type-explainer', 'update'];
const tplDirs = {};
for (const t of TPL) {
  const d = join(TMP, t, 'src');
  cpSync(join(TEMPLATES, t, 'src'), d, { recursive: true });
  mkdirSync(join(d, 'fx'), { recursive: true });
  writeFileSync(join(d, 'fx', 'TypeSystem.ts'), `export * from '${url('fx/TypeSystem.ts')}';\n`);
  tplDirs[t] = d;
}

const PROBE = `
import * as Y from '${url('fx/TypeSystem.ts')}';
import * as X from '${url('fx/TypeEmphasis.ts')}';
import * as T from '${url('fx/TypePresets.tsx')}';
import { PACE } from '${url('lib/pace.ts')}';
const film = (fps: number) => ({ fps, width: 1920, height: 1080, pace: PACE.crisp });

// 1. systems
const ALL = Y.HEADLINE_SYSTEMS;
let seqBad = 0, capBad = 0, givenBad = 0, fixedBad = 0, total = 0;
const caps: number[] = [];
for (let k = 0; k < 400; k++) {
  const n = 3 + (k % 7);
  const ids = Array.from({ length: n }, (_, i) => 'l' + i);
  const pool = k % 3 === 0 ? Y.DEVICE_SYSTEMS : k % 3 === 1 ? ALL : ['plain', 'front', 'marker', 'rule', 'swell', 'stack', 'typed'];
  const given = k % 4 === 0 ? { l1: 'inline' as const } : k % 4 === 1 ? { l0: 'stack' as const, l2: 'push' as const } : {};
  const fixed = k % 5 === 0 ? ['l' + (n - 1)] : [];
  const d = Y.dealSystems(ids, 'seed' + k, { pool: pool as any, given, fixed, first: k % 2 === 0 });
  const seq = ids.map((id) => d[id]);
  total++;
  const free = ids.filter((id) => !(id in given));
  // repeats between two dealt lines, or a dealt line beside a given one, never happen
  if (seq.some((s, i) => i && s === seq[i - 1] && (free.includes(ids[i]) || free.includes(ids[i - 1])))) seqBad++;
  const roomy = (pool.length) * Y.MAX_PER_FILM >= n;
  const cnt: Record<string, number> = {};
  seq.forEach((s) => (cnt[s] = (cnt[s] ?? 0) + 1));
  if (roomy && Object.values(cnt).some((c) => c > Y.MAX_PER_FILM)) capBad++;
  caps.push(Math.max(...Object.values(cnt)));
  if (Object.entries(given).some(([id, s]) => d[id] !== s)) givenBad++;
  if (fixed.some((id) => !(id in given) && !Y.WIDTH_HELD.includes(d[id]))) fixedBad++;
}
const same = JSON.stringify(Y.dealSystems(['a', 'b', 'c', 'd', 'e'], 'Brook')) === JSON.stringify(Y.dealSystems(['a', 'b', 'c', 'd', 'e'], 'Brook'));
const chk = [Y.checkSystems(['stack', 'stack', 'plain']), Y.checkSystems(['stack', 'plain', 'stack', 'rule', 'stack']), Y.checkSystems(['plain', null, 'rule', 'marker'])];

// 2. devices from systems
let devBad = 0, firstBad = 0;
for (let k = 0; k < 300; k++) {
  const ids = ['what', 'a', 'b', 'c', 'd', 'e', 'close'].slice(0, 3 + (k % 5));
  const fam = k % 2 ? 'bold' : 'calm';
  const e = X.dealLineEmphasis(ids, 'f' + k, { family: fam as any, fixed: ['close'] });
  const sys = ids.map((id) => Y.systemOfDevice(e[id] as any));
  const c = Y.checkSystems(sys);
  if (!c.ok || ids.some((id, i) => i && e[id] === e[ids[i - 1]])) devBad++;
  if (e[ids[0]] !== 'weight') firstBad++;
}
Y.declareHeadlines(424242, { what: 'stack', b: 'giant' });
const dh = X.dealLineHeadlines(['what', 'a', 'b', 'c'], 424242, {});
const dhSys = ['what', 'a', 'b', 'c'].map((id) => dh[id].system);
const dlE = X.dealLineEmphasis(['what', 'a', 'b', 'c'], 424242, {});

// 4. type craft
const glyphs = (word: string, x0 = 0, adv = 50) => [...word].map((ch, i) => ({ ch, x: x0 + i * adv, w: adv }));
const ink = {
  plain: X.skipInk(glyphs('clean'), 0, 250, 100, 0.13),
  every: X.skipInk(glyphs('every'), 0, 250, 100, 0.13),
  day: X.skipInk(glyphs('your day'), 0, 400, 100, 0.13),
  gypsy: X.skipInk(glyphs('gypsy'), 0, 250, 100, 0.13),
};
const bars = { song: X.barBottom('song', 1.12, 0.36), sun: X.barBottom('sun', 1.12, 0.36), boxSip: X.barBottom('sip.', 1.42, 0.34) };
// the emphasis waits for rest: every word up to the key words at rest when the device starts
const restAt = (s: any, f: number, upto: number) => {
  const st = T.typeLineState(f, { ...s, emph: false, out: undefined }, T.monoMetrics(T.typeLineSpec(s).text), film(s.fps ?? 60));
  const W = T.wordMap(T.typeLineSpec(s).text);
  const g1 = W.ends[upto];
  return st.glyphs.slice(0, g1 + 1).every((g, i) => W.wordOf[i] < 0 || (Math.abs(g.dy) < 0.006 && Math.abs(g.dx) < 0.006 && Math.abs(g.sx - 1) < 0.006 && g.opacity >= 0.98 && g.blur < 0.003));
};
const waits: any[] = [];
for (const preset of ['fall', 'mask', 'land', 'glide', 'crisp']) {
  for (const emph of ['marker', 'under', 'swell', 'sweep']) {
    for (const text of ['Its cap counts every *sip*.', 'It watches *every clip*.', 'Pick a *song* you love.']) {
      const s = { preset, text, at: 0, emph };
      const ef = T.emphasisFrames(s, film(60));
      const W = T.wordMap(T.typeLineSpec(s).text);
      const keys = T.typeLineSpec(s).keys ?? [W.n - 1, W.n - 1];
      const ef30 = T.emphasisFrames(s, film(30));
      waits.push({ preset, emph, text, from: ef?.from, ok: !!ef && restAt(s, ef.from, keys[1]) && restAt({ ...s, fps: 30 }, ef30.from, keys[1]), half: ef && ef30 ? Math.abs(ef.from / 2 - ef30.from) : 99 });
    }
  }
}
const weightFrom = T.emphasisFrames({ preset: 'fall', text: 'Its cap counts every *sip*.', at: 0, emph: 'weight' }, film(60));

console.log(JSON.stringify({ total, seqBad, capBad, givenBad, fixedBad, maxCap: Math.max(...caps), same, chk, devBad, firstBad, dhSys, dlE, ink, bars, waits, weightFrom }));
`;

const run = (code, name) => {
  const f = join(TMP, name);
  writeFileSync(f, code);
  return spawnSync(process.execPath, [TSX, f], { encoding: 'utf8', cwd: STARTER, maxBuffer: 32 * 1024 * 1024 });
};
const r = run(PROBE, 'probe.tsx');
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  rmSync(TMP, { recursive: true, force: true });
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());

// 3. the templates' deals, each in its own process (a deal's declarations live in its process)
const NAMES = ['Tessel', 'Plinth', 'Northwind', 'Loomly', 'Quarry', 'Brightdesk', 'Halyard', 'Orbitly', 'Fernway', 'Glint', 'Parcel', 'Corvid',
  'Lumen', 'Basalt', 'Driftwood', 'Keel', 'Marlow', 'Sable', 'Verity', 'Waypoint', 'Zephyr', 'Ledgerly', 'Cobalt Notes', 'Pine & Post'];
// the line deal each template's acts/stage.tsx (or its line file) makes, as written there
const LINE_DEAL = {
  'social-ad': `X.dealLineEmphasis(['what', 'tag.1', 'tag.2', 'swap', 'close'], D.SEED, { fixed: ['swap', 'close'] })`,
  'camera-teaser': `X.dealLineEmphasis(['what', 'build', 'close'], D.DEAL_SEED, { fixed: ['close'] })`,
  'prompt-run': `X.dealLineEmphasis(['what', 'ask', 'tell', 'done', 'close'], D.DEAL_SEED, { fixed: ['what', 'ask', 'close'] })`,
  'type-explainer': `X.dealLineEmphasis(['what', 'pain', 'close'], D.SEED, { fixed: ['close'] })`,
};
const tplOut = {};
for (const t of TPL) {
  const deal = pathToFileURL(join(tplDirs[t], 'deal.ts')).href;
  const code = `
import * as D from '${deal}';
import * as Y from '${url('fx/TypeSystem.ts')}';
import * as X from '${url('fx/TypeEmphasis.ts')}';
const NAMES = ${JSON.stringify(NAMES)};
const slots = Object.keys(D.FLOOR);
const deals = NAMES.map((n) => D.dealOf(n));
const comp = deals.map((d: any) => Y.compositionApart(d, D.FLOOR, D.COMPOSITION, slots as any));
const declared: Record<string, string> = (D as any).HEADLINES_SET ?? {};
${LINE_DEAL[t] ? `const e = ${LINE_DEAL[t]}; const ids = Object.keys(e); const sys = ids.map((id) => declared[id] ?? Y.systemOfDevice(e[id] as any));` : 'const ids: string[] = []; const sys: any[] = [];'}
const dealtRepeat = ids.some((id, i) => i && sys[i] === sys[i - 1] && !(declared[id] && declared[ids[i - 1]]));
console.log(JSON.stringify({ slots: slots.length, floorKept: JSON.stringify(D.DEAL) === JSON.stringify(D.FLOOR),
  minApart: Math.min(...deals.map((d: any) => slots.filter((s) => d[s] !== D.FLOOR[s]).length)),
  compOk: comp.every((c) => c.ok), compMin: Math.min(...comp.map((c) => c.moved)), bearing: comp[0].bearing,
  distinct: new Set(deals.map((d) => JSON.stringify(d))).size,
  objectAfterMark: ${t === 'ui-walkthrough' ? `deals.filter((d: any) => d.claim === 'object').length` : '0'},
  declared, sys, dealtRepeat }));
`;
  const tr = run(code, `deal-${t}.mts`);
  try {
    tplOut[t] = JSON.parse(tr.stdout.trim().split('\n').pop());
  } catch {
    tplOut[t] = { error: (tr.stderr || tr.stdout).trim().split('\n').slice(0, 6).join(' | ') };
  }
}
rmSync(TMP, { recursive: true, force: true });

// 1
result(P.seqBad === 0, 'systems: no system on two lines in a row (a dealt line never repeats its neighbour, given or dealt)', `${P.seqBad} of ${P.total}`);
result(P.capBad === 0, 'systems: none on more than two lines of a film whenever the pool can hold the film at two', `${P.capBad} of ${P.total}, max ${P.maxCap}`);
result(P.givenBad === 0 && P.fixedBad === 0, 'systems: given lines keep their system; a line placed by its width takes plain, front or rule only', `${P.givenBad} / ${P.fixedBad}`);
result(P.same, 'systems: the same seed deals the same systems');
result(!P.chk[0].ok && P.chk[0].repeats.length === 1 && !P.chk[1].ok && P.chk[1].over[0]?.system === 'stack' && P.chk[1].repeats.length === 0 && P.chk[2].ok,
  'checkSystems: names a repeat in a row and a system on three lines; a line with none in between is skipped', JSON.stringify(P.chk));
// 2
result(P.devBad === 0, 'line deal: the devices dealt to a script never repeat a system (or a device) on two lines in a row, none on more than two', String(P.devBad));
result(P.firstBad === 0, 'line deal: the first line keeps the house default (weight)', String(P.firstBad));
result(P.dhSys[0] === 'stack' && P.dhSys[2] === 'giant' && !['stack', 'giant'].includes(P.dhSys[1]) && !['stack', 'giant'].includes(P.dhSys[3]) && ['weight', 'accent'].includes(P.dlE.what),
  'declared lines: a template declares what its acts set (a stack, a poster); the line deal counts them and deals round them', JSON.stringify([P.dhSys, P.dlE]));
// 3
for (const t of TPL) {
  const d = tplOut[t];
  if (d.error) {
    result(false, `--template ${t}: its deal loads`, d.error);
    continue;
  }
  result(d.floorKept && 2 * d.minApart >= d.slots && d.compOk && d.distinct >= 6,
    `--template ${t}: every product's deal moves the frame off the scaffold (half the slots, and half the ${d.bearing} that carry a composition)`,
    `${d.slots} slots, >= ${d.minApart} apart, >= ${d.compMin} of ${d.bearing} compositions moved, ${d.distinct} deals of 24`);
  if (t === 'ui-walkthrough') result(d.objectAfterMark === 0, '--template ui-walkthrough: the claim never deals its object right after the promise\'s mark (one system twice in a row)', String(d.objectAfterMark));
  if (d.sys.length) result(!d.dealtRepeat, `--template ${t}: the scaffold's line deal never repeats a dealt system beside another line`, JSON.stringify({ sys: d.sys, declared: d.declared }));
}
// 4
const I = P.ink;
result(I.plain.runs.length === 1 && I.plain.drop === 0.13, 'skip-ink: a word without descenders keeps one whole rule at the house drop', JSON.stringify(I.plain));
result(I.every.runs.length === 2 && I.every.drop === 0.13 && I.every.runs[0][1] < 4 * 50 + 0.04 * 50 && I.every.runs[1][0] > 4 * 50 + 0.74 * 50,
  'skip-ink: "every" breaks the rule round the y\'s tail (a gap of its ink plus 0.07 em each side)', JSON.stringify(I.every));
result(I.day.runs.length >= 2 && I.day.drop === 0.13, 'skip-ink: "your day" breaks round both tails', JSON.stringify(I.day));
result(I.gypsy.runs.length === 1 && I.gypsy.drop > 0.3, 'skip-ink: when the gaps would eat the rule ("gypsy") it sits whole under the descender line', JSON.stringify(I.gypsy));
result(P.bars.song >= 0.3 && Math.abs(P.bars.sun - 0.2) < 1e-9 && P.bars.boxSip >= 0.3, 'bars: a bar behind words with a descender reaches below the descender line; without one it keeps its own bottom', JSON.stringify(P.bars));
const bad = P.waits.filter((w) => !w.ok);
result(bad.length === 0, 'emphasis waits: marker, rule, swell and sweep start only once every word up to the key words is at rest (fall, mask, land, glide, crisp)',
  bad.slice(0, 4).map((w) => `${w.preset}/${w.emph} "${w.text}" from ${w.from}`).join('; '));
result(P.waits.every((w) => w.half <= 0.51), 'emphasis waits: 60 and 30 fps agree (half the frames, within half a frame)', JSON.stringify(P.waits.filter((w) => w.half > 0.51).slice(0, 3)));
result(P.weightFrom && P.weightFrom.from === P.weightFrom.to, 'a static device (weight) needs no wait: it is whole as its words land', JSON.stringify(P.weightFrom));

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall pass');
