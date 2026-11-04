#!/usr/bin/env node
/**
 * stock-plate.test.mjs: lint-film stock-plate (film-wide warning): a photo world under public/plates/ whose subject (its
 * licence record's title and tags, its plate kind's description, its name) shares no word with BRIEF.md warns; a plate
 * of the brief's own place passes; colour and photo-craft words do not count; no BRIEF.md, no plates: nothing to read.
 * Usage (from the skill root): node scripts/test/stock-plate.test.mjs [--verbose]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LINT = resolve(HERE, '..', 'lint-film.mjs');
const verbose = process.argv.includes('--verbose');
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
const put = (root, rel, text) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
};
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-plate-'));
const film = (name, { brief, plates = [], items = [], worlds }) => {
  const root = join(TMP, name);
  put(root, 'src/Film.tsx', 'export const Film = () => null;\n');
  if (brief) put(root, 'BRIEF.md', brief);
  for (const p of plates) put(root, `public/plates/${p}`, 'x');
  if (items.length) put(root, 'assets/licences.json', JSON.stringify({ items }));
  if (worlds) put(root, 'src/fx/world/worlds.ts', worlds);
  const r = spawnSync(process.execPath, [LINT, join(root, 'src'), '--json'], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout).issues.filter((x) => x.rule === 'stock-plate'); } catch { return [{ message: `no JSON: ${r.stderr.slice(0, 200)}` }]; }
};
const BRIEF = '# BRIEF\nProduct: a recipe and grocery app. Save any recipe from a cookbook photo; a grocery list sorted by aisle.\nphotos: cookbook, cooking, kitchen, vegetables\n';
try {
  let w = film('fern', { brief: BRIEF, plates: ['macro.jpg', 'macro-soft.jpg', 'macro-source.jpg'], items: [{ file: '../public/plates/macro-source.jpg', title: 'Fern Leaf Macro', kind: 'photo' }] });
  result(w.length === 1 && w[0].severity === 'warn' && /Fern Leaf Macro/.test(w[0].excerpt), 'a fern macro plate under a recipe brief warns (once for the plate and its graded copies)', JSON.stringify(w.map((x) => x.message.slice(0, 80))));
  w = film('kitchen', { brief: BRIEF, plates: ['kitchen.jpg', 'kitchen-soft.jpg'], items: [{ file: '../public/plates/kitchen.jpg', title: 'Green Vegetables On A Kitchen Counter', kind: 'photo' }] });
  result(w.length === 0, 'a kitchen plate under the same brief passes', JSON.stringify(w.map((x) => x.message.slice(0, 80))));
  w = film('colour', { brief: BRIEF + 'accent: a calm green world\n', plates: ['leaf.jpg'], items: [{ file: '../public/plates/leaf.jpg', title: 'Green Leaf Soft Light Background', kind: 'photo' }] });
  result(w.length === 1, 'shared colour and light words (green, soft, light, background) do not make a plate belong', JSON.stringify(w.map((x) => x.excerpt)));
  const worlds = "export const PLATES = {\n  nightCity: { what: 'a city at night from above or across water, its lights soft', kind: 'photo', queries: ['city at night', 'night city skyline'] },\n};\n";
  w = film('kind', { brief: BRIEF, plates: ['nightCity.jpg', 'nightCity-soft.jpg'], worlds });
  result(w.length === 1 && /city/.test(w[0].message), 'a plate dealt by kind (nightCity) is read by its kind description', JSON.stringify(w.map((x) => x.message.slice(0, 90))));
  w = film('kind-ok', { brief: '# BRIEF\nA city transit app: night buses across the city.\n', plates: ['nightCity.jpg'], worlds });
  result(w.length === 0, 'the same night city plate under a city transit brief passes');
  w = film('nobrief', { plates: ['macro.jpg'] });
  result(w.length === 0, 'no BRIEF.md: nothing to read the plates against');
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
