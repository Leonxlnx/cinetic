#!/usr/bin/env node
/**
 * deal-source.test.mjs: one source of truth for a film's direction. deck.py deals the direction; launch-simple's
 * src/deal.ts plays it (deck.py writes src/dealt.ts), so the sheet and the template never disagree.
 *
 *   1. Before any deal, src/dealt.ts is null and deal.ts deals from the product's name (DEAL_SOURCE says so).
 *   2. deck.py --direction (with its --why) in a launch-simple project writes src/dealt.ts and section 0 of out/DIRECTION.md; deal.ts's
 *      DEAL (through tsx) equals the sheet's template deal slot for slot, for several directions, and DEAL_SOURCE names
 *      the direction; at least half the slots differ from the template's floor.
 *   3. A redraw rewrites src/dealt.ts with the sheet: they still agree.
 *   4. The last films' choices (src/recent.ts, new-film.sh writes them from the film history): a deal from the name
 *      leaves a recent voice and world out while another is free; the deck's deal is played as dealt (one source).
 *   5. A dealt.ts naming a device the template does not have throws at import with the slot named.
 *   6. In a project whose template deals nothing (no src/deal.ts), deck.py writes no dealt.ts and no section 0.
 *
 * Needs Python (scripts/py.mjs finds it) and tsx (the Remotion starter's node_modules, npm install there first).
 * Usage (from the skill root):  node scripts/test/deal-source.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findPython } from '../py.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const TPL = path.join(SKILL, 'assets', 'templates', 'launch-simple', 'src');
const DECK = path.join(SKILL, 'scripts', 'deck.py');
const verbose = process.argv.includes('--verbose');
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
const findUp = (start, sub) => {
  for (let d = start; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, sub))) return path.join(d, sub);
    if (path.dirname(d) === d) return null;
  }
};
const TSX = findUp(path.join(SKILL, 'assets', 'remotion-starter'), path.join('node_modules', 'tsx', 'dist', 'cli.mjs')) ?? findUp(process.cwd(), path.join('node_modules', 'tsx', 'dist', 'cli.mjs'));
const PY = findPython({ numpy: false, quiet: true });
if (!TSX || !PY) {
  console.log(`FAIL  ${!TSX ? 'tsx not found (npm install in assets/remotion-starter)' : 'no Python found (set PYTHON)'}`);
  process.exit(1);
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-deal-'));
const ENV = { ...process.env, CINETIC_DECK_HISTORY: path.join(TMP, 'deck-history.json'), CINETIC_FILM_HISTORY: path.join(TMP, 'film-history.json'), PYTHONUTF8: '1' };
const deck = (cwd, ...args) => spawnSync(PY[0], [...PY.slice(1), DECK, '--brief', 'a launch film for a trail map that works offline', '--format', 'launch', '--have', 'ui', '--no-history', ...args], { cwd, env: ENV, encoding: 'utf8' });
const dealOf = (dir) => {
  const probe = path.join(dir, 'probe.mts');
  fs.writeFileSync(probe, `const m = await import(${JSON.stringify(pathToFileURL(path.join(dir, 'src', 'deal.ts')).href)});\nconsole.log(JSON.stringify({ deal: m.DEAL, source: m.DEAL_SOURCE, floor: m.FLOOR }));\n`);
  const r = spawnSync(process.execPath, [TSX, probe], { cwd: dir, encoding: 'utf8' });
  try {
    return JSON.parse(r.stdout.trim().split('\n').pop());
  } catch {
    return { error: (r.stderr || r.stdout).trim() };
  }
};
const project = (name, withDeal = true) => {
  const dir = path.join(TMP, name);
  fs.mkdirSync(path.join(dir, 'src', 'brand'), { recursive: true });
  for (const f of withDeal ? ['deal.ts', 'dealt.ts', 'recent.ts', 'launch.ts'] : ['launch.ts']) fs.copyFileSync(path.join(TPL, f), path.join(dir, 'src', f));
  fs.writeFileSync(path.join(dir, 'src', 'brand', 'identity.ts'), "export const IDENTITY = { name: 'Switchyard', supplied: false } as const;\n");
  return dir;
};
const sheetDeal = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'out', 'direction.json'), 'utf8')).template_deal;

try {
  // 1. no deal yet
  const a = project('a');
  const before = dealOf(a);
  result(before.deal && /the name "Switchyard"/.test(before.source ?? ''), 'before any deal: deal.ts deals from the name', JSON.stringify(before).slice(0, 200));

  // 2. deck.py deals; the template plays it
  const dirs = JSON.parse(fs.readFileSync(path.join(SKILL, 'assets', 'directions', 'directions.json'), 'utf8')).directions.map((d) => d.id);
  const pick = [dirs[0], dirs[Math.floor(dirs.length / 2)], dirs[dirs.length - 1]];
  for (const id of pick) {
    const dir = project(`d-${id}`);
    const r = deck(dir, '--direction', id, '--allow-planned', '--why', 'the test picks it: its deal must reach the template');
    if (r.status !== 0) {
      result(false, `deck.py --direction ${id} runs in a launch-simple project`, (r.stderr || r.stdout).slice(-300));
      continue;
    }
    const td = sheetDeal(dir);
    const got = dealOf(dir);
    const md = fs.readFileSync(path.join(dir, 'out', 'DIRECTION.md'), 'utf8');
    const same = td && got.deal && Object.keys(got.deal).every((k) => got.deal[k] === td.deal[k]) && Object.keys(td.deal).length === Object.keys(got.deal).length;
    result(same && fs.existsSync(path.join(dir, 'src', 'dealt.ts')) && /## 0\. The template's deal/.test(md) && got.source === `deck.py direction ${id}`,
      `${id}: the sheet's template deal is the deal the template plays (src/dealt.ts, DIRECTION.md section 0, DEAL_SOURCE)`, JSON.stringify({ sheet: td?.deal, plays: got.deal, source: got.source }).slice(0, 400));
    const off = got.deal && got.floor ? Object.keys(got.floor).filter((k) => got.deal[k] !== got.floor[k]).length : 0;
    result(2 * off >= Object.keys(got.floor ?? {}).length, `${id}: at least half the slots differ from the template's floor`, `${off} of ${Object.keys(got.floor ?? {}).length}`);
  }

  // 3. a redraw rewrites both
  const b = project('b');
  deck(b, '--direction', pick[0], '--allow-planned', '--why', 'the test picks it: its deal must reach the template');
  const r3 = deck(b, '--redraw', 'direction', '--reason', 'the brief asks for a calmer world');
  const after = dealOf(b);
  const td3 = sheetDeal(b);
  result(r3.status === 0 && td3 && after.source === `deck.py direction ${JSON.parse(fs.readFileSync(path.join(b, 'out', 'direction.json'), 'utf8')).direction.id}` && Object.keys(td3.deal).every((k) => after.deal[k] === td3.deal[k]),
    'a redraw rewrites src/dealt.ts with the sheet: they still agree', (r3.stderr || '').slice(-200) + JSON.stringify({ sheet: td3?.deal, plays: after.deal }));

  // 4. the last films' choices: the name's deal leaves them out while another is free; the deck's deal stands as dealt
  const recentTs = (d, r) => fs.writeFileSync(path.join(d, 'src', 'recent.ts'), `export const RECENT: Partial<Record<'voice' | 'ground', readonly string[]>> = ${JSON.stringify(r)};\n`);
  recentTs(a, { voice: [before.deal.voice], ground: [before.deal.ground] });
  const fresh = dealOf(a);
  result(!!fresh.deal && fresh.deal.voice !== before.deal.voice && fresh.deal.ground !== before.deal.ground && /the name "Switchyard"/.test(fresh.source ?? ''),
    'a deal from the name leaves the last films\' voice and world out while another is free', JSON.stringify({ before: before.deal, after: fresh.deal }));
  recentTs(b, { voice: [after.deal.voice], ground: [after.deal.ground] });
  const kept = dealOf(b);
  result(!!kept.deal && Object.keys(after.deal).every((k) => kept.deal[k] === after.deal[k]) && /^deck\.py direction /.test(kept.source ?? ''),
    'the deck\'s deal is played as dealt, recent or not (one source: the sheet and the template agree)', JSON.stringify({ dealt: after.deal, plays: kept.deal }));

  // 5. a device the template does not have
  const dt = path.join(b, 'src', 'dealt.ts');
  fs.writeFileSync(dt, fs.readFileSync(dt, 'utf8').replace(/"voice": ?"\w+"/, '"voice": "typewriter"'));
  const bad = dealOf(b);
  result(!!bad.error && /voice "typewriter"/.test(bad.error), 'a dealt.ts naming a device the template lacks throws with the slot named', (bad.error ?? JSON.stringify(bad)).split(/\r?\n/).filter((l) => /deal:/.test(l)).join(' ').slice(0, 240));

  // 6. a template that deals nothing
  const c = project('c', false);
  const r6 = deck(c, '--direction', pick[0], '--allow-planned');
  result(r6.status === 0 && !fs.existsSync(path.join(c, 'src', 'dealt.ts')) && !/## 0\. The template's deal/.test(fs.readFileSync(path.join(c, 'out', 'DIRECTION.md'), 'utf8')),
    'no src/deal.ts: no dealt.ts and no section 0', (r6.stderr || '').slice(-200));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `deal-source tests: ${failed} failed` : 'deal-source tests: all pass');
process.exit(failed ? 1 : 0);
