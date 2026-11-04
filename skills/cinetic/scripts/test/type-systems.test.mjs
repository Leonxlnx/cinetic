#!/usr/bin/env node
/**
 * type-systems.test.mjs: a film speaks in one voice, its emphasis is quiet and one kind, its compositions are its own,
 * and its type is set with care (src/fx/TypeSystem.ts, the emphasis in fx/TypeEmphasis.ts, the marks and their timing in
 * fx/TypePresets.tsx, every template's src/deal.ts and its line file). Pure state only; nothing renders.
 *
 *   1. Systems: every line in the film's voice (plain) but the lines an act sets another way (given, declared for the
 *      film's seed, pinned); the same seed, the same systems; checkSystems fails two stacks in a film and a voice on
 *      under half the lines.
 *   2. Emphasis: for 400 films of 1-9 lines (keyed or not, any kind asked, a signature or none) the film's emphasis is
 *      on at most 60 % of the lines, in one kind, a box, marker or underline only as the one signature line; a kind
 *      that is a signature device falls back to the accent; a line placed by its width never takes a size kind.
 *   3. Templates: for 24 product names each template's deal differs from its scaffold (FLOOR) in at least half its
 *      slots AND in at least half the slots that carry a composition (COMPOSITION: where the type and the picture sit,
 *      which leads), so the frame moves, not only the device names; the scaffold keeps the floor; the ui-walkthrough
 *      never deals the claim's object right after the promise's mark; the scaffold's systems pass checkSystems (one
 *      voice, one stack at most); the templates that deal a move per line (ui-walkthrough, update) deal one voice: every
 *      line on the same move and exit for every name; every template's line file sets its emphasis with filmEmphasis.
 *   4. Type craft: a rule under words with descenders breaks round their ink (skip-ink) and, when the gaps would eat
 *      it, sits whole under the descender line; a bar behind words with a descender reaches below the descender line;
 *      an emphasis (marker, rule, swell, sweep) starts only once every word up to its key words is at rest, never
 *      while the word before is still moving in (fall, mask, land, glide, crisp; 60 and 30 fps agree).
 *
 * Usage (from the skill root):  node scripts/test/type-systems.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
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
/**
 * A template's src imports starter modules it does not ship (fx/creative/meta, a lib helper): new-film.sh lays the
 * template over the starter, so here a re-export of the starter's module stands in for each one the copy lacks.
 */
const stubStarterImports = (root) => {
  for (const f of readdirSync(root, { recursive: true }).map((x) => join(root, String(x))).filter((x) => /\.tsx?$/.test(x))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const base = resolve(dirname(f), m[1]);
      if (['.ts', '.tsx', '/index.ts', '/index.tsx'].some((e) => existsSync(base + e))) continue;
      const own = ['.ts', '.tsx'].map((e) => join(SRC, relative(root, base) + e)).find((x) => existsSync(x));
      if (!own) continue;
      mkdirSync(dirname(base), { recursive: true });
      writeFileSync(`${base}.ts`, `export * from '${pathToFileURL(own).href}';\n`);
    }
  }
};
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-typesys-'));
// each template's src beside a re-export of the starter's fx/TypeSystem (one module, so a deal's declarations reach the line deal)
const TPL = ['ui-walkthrough', 'social-ad', 'camera-teaser', 'prompt-run', 'type-explainer', 'update'];
const tplDirs = {};
for (const t of TPL) {
  const d = join(TMP, t, 'src');
  cpSync(join(TEMPLATES, t, 'src'), d, { recursive: true });
  mkdirSync(join(d, 'fx'), { recursive: true });
  writeFileSync(join(d, 'fx', 'TypeSystem.ts'), `export * from '${url('fx/TypeSystem.ts')}';\n`);
  stubStarterImports(d);
  tplDirs[t] = d;
}

const PROBE = `
import * as Y from '${url('fx/TypeSystem.ts')}';
import * as X from '${url('fx/TypeEmphasis.ts')}';
import * as T from '${url('fx/TypePresets.tsx')}';
import { PACE } from '${url('lib/pace.ts')}';
const film = (fps: number) => ({ fps, width: 1920, height: 1080, pace: PACE.crisp });

// 1. systems
const fs1 = Y.filmSystems(['a', 'b', 'c', 'd'], 'seed1', { given: { b: 'inline' }, pin: { d: 'push' } });
Y.declareHeadlines(424242, { b: 'giant' });
const fsDecl = Y.filmSystems(['what', 'a', 'b', 'c'], 424242, {});
const same = JSON.stringify(Y.filmSystems(['a', 'b', 'c'], 'Brook')) === JSON.stringify(Y.filmSystems(['a', 'b', 'c'], 'Brook'));
const chk = [Y.checkSystems(['stack', 'stack', 'plain', 'plain']), Y.checkSystems(['plain', 'plain', 'inline', 'plain']), Y.checkSystems(['plain', 'giant', 'push', 'typed'], 'plain'), Y.checkSystems(['plain', null, 'stack', 'plain'])];

// 2. emphasis
let shareBad = 0, kindBad = 0, sigBad = 0, sigMiss = 0, fixedBad = 0, total = 0;
const KINDS = ['accent', 'weight', 'scale', 'swell', 'outline', 'sweep', 'box', 'marker', 'under'];
for (let k = 0; k < 400; k++) {
  const n = 1 + (k % 9);
  const ids = Array.from({ length: n }, (_, i) => 'l' + i);
  const keyed = ids.filter((_, i) => (k >> (i % 5)) % 2 === 0);
  const kind = KINDS[k % KINDS.length] as any;
  const sig = k % 3 === 0 && n > 1 ? { id: ids[(k >> 2) % n], device: (['box', 'marker', 'under'] as const)[k % 3 === 0 ? (k >> 4) % 3 : 0] } : undefined;
  const fixed = k % 4 === 0 ? [ids[n - 1]] : [];
  const e = X.filmEmphasis(ids, { kind, keyed, signature: sig, fixed });
  const c = X.checkFilmEmphasis(e);
  total++;
  if (c.share > 0.6 + 1e-9) shareBad++;
  if (c.kinds.length > 1 || c.kinds.some((d) => X.SIGNATURE_DEVICES.includes(d))) kindBad++;
  if (c.signatures.length > (sig ? 1 : 0)) sigBad++;
  if (sig && Math.floor(0.6 * n + 1e-9) >= 1 && e[sig.id] !== sig.device) sigMiss++;
  if (fixed.some((id) => e[id] && e[id] !== sig?.device && ['scale', 'swell'].includes(e[id] as string))) fixedBad++;
}
const five = X.filmEmphasis(['a', 'b', 'c', 'd', 'e']);
const named = X.filmEmphasis(['a', 'b', 'c', 'd', 'e'], { keyed: ['b', 'd'], kind: 'weight' });
const sigFive = X.filmEmphasis(['a', 'b', 'c', 'd', 'e'], { signature: { id: 'a', device: 'marker' } });
const boxKind = X.filmEmphasis(['a', 'b', 'c'], { kind: 'box' });
const none = X.filmEmphasis(['a', 'b', 'name'], { none: ['name'] });
const chkE = [X.checkFilmEmphasis({ a: 'weight', b: 'accent', c: false, d: false }), X.checkFilmEmphasis({ a: 'marker', b: 'box', c: false, d: false, e: false }), X.checkFilmEmphasis({ a: 'accent', b: 'accent', c: 'accent' }), X.checkFilmEmphasis(five)];

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

console.log(JSON.stringify({ fs1, fsDecl, same, chk, total, shareBad, kindBad, sigBad, sigMiss, fixedBad, five, named, sigFive, boxKind, none, chkE, ink, bars, waits, weightFrom }));
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
// the script's lines of each template (its line file's ids, in film order)
const LINE_IDS = {
  'social-ad': `['what', 'save', 'find', 'tag.1', 'tag.2', 'swap', 'close']`,
  'camera-teaser': `['what', 'build', 'connect', 'close']`,
  'prompt-run': `['what', 'ask', 'tell', 'done', 'close']`,
  'type-explainer': `['what', 'pain', 'promise', 'system', 'close']`,
  'ui-walkthrough': `[...D.LINE_IDS]`,
  update: `[...D.LINE_IDS].slice(0, 3)`,
};
// where each template sets its emphasis (the line file must use filmEmphasis, never a per-line deal)
const LINE_FILE = { 'social-ad': 'acts/stage.tsx', 'camera-teaser': 'acts/stage.tsx', 'prompt-run': 'acts/stage.tsx', 'type-explainer': 'acts/stage.tsx', 'ui-walkthrough': 'acts/type.tsx', update: 'acts/type.tsx' };
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
const ids: string[] = ${LINE_IDS[t]};
const seed = (D as any).DEAL_SEED ?? (D as any).SEED;
const fsys = Y.filmSystems(ids, seed, {});
const sysCheck = Y.checkSystems(ids.map((id) => fsys[id]), 'plain');
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const voices = typeof (D as any).dealLines === 'function' ? NAMES.map((n) => (D as any).dealLines(hash(n), ids, {}, ${t === 'ui-walkthrough' ? "['payoff']" : '[]'})) : [];
const oneVoice = voices.every((v: any) => new Set(ids.map((id) => v.move[id])).size === 1 && new Set(ids.map((id) => v.exit[id])).size === 1);
console.log(JSON.stringify({ slots: slots.length, floorKept: JSON.stringify(D.DEAL) === JSON.stringify(D.FLOOR),
  minApart: Math.min(...deals.map((d: any) => slots.filter((s) => d[s] !== D.FLOOR[s]).length)),
  compOk: comp.every((c) => c.ok), compMin: Math.min(...comp.map((c) => c.moved)), bearing: comp[0].bearing,
  distinct: new Set(deals.map((d) => JSON.stringify(d))).size,
  objectAfterMark: ${t === 'ui-walkthrough' ? `deals.filter((d: any) => d.claim === 'object').length` : '0'},
  declared, sysCheck, voices: voices.length, oneVoice, moves: voices.slice(0, 3).map((v: any) => v.voice) }));
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
result(P.fs1.a === 'plain' && P.fs1.b === 'inline' && P.fs1.c === 'plain' && P.fs1.d === 'push', 'systems: every line in the voice (plain) but the given and the pinned lines', JSON.stringify(P.fs1));
result(P.fsDecl.b === 'giant' && P.fsDecl.what === 'plain' && P.fsDecl.a === 'plain' && P.same, "systems: a template's declared lines keep theirs for its seed; the same seed, the same systems", JSON.stringify(P.fsDecl));
result(!P.chk[0].ok && P.chk[0].stacks === 2 && P.chk[1].ok && P.chk[1].voice === 'plain' && !P.chk[2].ok && P.chk[2].voiceShare === 0.25 && P.chk[3].ok,
  'checkSystems: two stacks in a film fail; the voice on half the lines or more passes, on a quarter fails; a line with none is skipped', JSON.stringify(P.chk.map((c) => [c.ok, c.stacks, c.voiceShare])));
// 2
result(P.shareBad === 0 && P.kindBad === 0 && P.sigBad === 0, 'emphasis: on at most 60 % of the lines, one kind, a box/marker/underline only as the one signature line (400 films)', `${P.shareBad} / ${P.kindBad} / ${P.sigBad} of ${P.total}`);
result(P.sigMiss === 0 && P.fixedBad === 0, 'emphasis: the declared signature lands on its line; a line placed by its width never takes a size kind', `${P.sigMiss} / ${P.fixedBad}`);
result(P.five.e === 'accent' && P.five.c === 'accent' && P.five.a === 'accent' && P.five.b === false && P.five.d === false, 'emphasis: by default the accent colour on 3 of 5 lines, from the last line back, every other line', JSON.stringify(P.five));
result(P.named.b === 'weight' && P.named.d === 'weight' && P.named.e === 'weight' && P.named.a === false && P.named.c === false, 'emphasis: the lines whose key words the script names take the kind first; the share fills from the rest', JSON.stringify(P.named));
result(P.sigFive.a === 'marker' && Object.values(P.sigFive).filter(Boolean).length === 3 && P.boxKind.c === 'accent' && P.none.name === false && [P.none.a, P.none.b].filter(Boolean).length === 1,
  'emphasis: a signature takes its line inside the share; a box asked as the kind plays the accent; a name takes none and does not count', JSON.stringify([P.sigFive, P.boxKind, P.none]));
result(!P.chkE[0].ok && P.chkE[0].kinds.length === 2 && !P.chkE[1].ok && P.chkE[1].signatures.length === 2 && !P.chkE[2].ok && P.chkE[2].share === 1 && P.chkE[3].ok,
  'checkFilmEmphasis: two kinds fail, two signatures fail, every line emphasised fails, the default deal passes', JSON.stringify(P.chkE.map((c) => [c.ok, c.share, c.kinds, c.signatures])));
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
  result(d.sysCheck.ok, `--template ${t}: the scaffold's lines speak in one voice (plain on half or more, one stack at most)`, JSON.stringify({ check: d.sysCheck, declared: d.declared }));
  if (d.voices) result(d.oneVoice, `--template ${t}: one voice: every line on the same move and the same exit, for every name`, JSON.stringify(d.moves));
  const src = readFileSync(join(TEMPLATES, t, 'src', LINE_FILE[t]), 'utf8');
  result(src.includes('filmEmphasis(') && !/dealLine(Emphasis|Headlines)\(/.test(src), `--template ${t}: its line file sets the film's emphasis with filmEmphasis (one kind, <= 60 % of the lines)`);
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
