#!/usr/bin/env node
// new-film.mjs: start a film project from the kit.
//
//   node <skill>/kit/scripts/new-film.mjs <folder> [--name "Product"] [--no-install]
//
// Copies the kit (src/kit, scripts, configs), a blank film (src/films/main) and the motion library's reels
// (src/films/library: --film library-type, library-turns, library-fx, library-camera, library-ui, library-hosts,
// library-objects, library-grounds, library-designs) into <folder>, then installs the packages (skip with --no-install, e.g. when a node_modules folder
// sits in a parent folder already).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampKit } from './kit-version.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dest = args.find((a) => !a.startsWith('--'));
if (!dest) {
  console.log('usage: node new-film.mjs <folder> [--name "Product"] [--no-install]');
  process.exit(64);
}
const out = path.resolve(dest);
if (fs.existsSync(out) && fs.readdirSync(out).length) {
  console.error(`${out} is not empty`);
  process.exit(1);
}
const copy = (rel, filter = () => true) => {
  const from = path.join(kit, rel);
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, path.join(out, rel), { recursive: true, filter: (p) => !/node_modules|[\\/]out[\\/]?|[\\/]public[\\/](sfx|music)/.test(p.slice(kit.length)) && filter(p) });
};
fs.mkdirSync(out, { recursive: true });
for (const f of ['package.json', 'tsconfig.json', 'remotion.config.ts', '.gitignore']) copy(f);
// library-docs.mjs writes the skill's own reference docs: a kit tool, not a film project's
copy('scripts', (p) => !p.endsWith('new-film.mjs') && !p.endsWith('library-docs.mjs'));
copy('src/kit');
// the real marks the kit ships (public/logos, its record and CREDITS.md) and their index, which <Brand> reads
copy('public/logos');
for (const f of ['index.ts', 'Root.tsx', 'Sheet.tsx', 'logos.ts']) copy(`src/${f}`);
copy('starter', () => true);
// the motion library's reels, so the project can render and sheet them (frames.mjs render --film library-ui); the
// turns reel shows licensed photographs from public/img when the kit has them
copy('src/films/library');
const imgDir = path.join(kit, 'public', 'img');
if (fs.existsSync(imgDir)) fs.cpSync(imgDir, path.join(out, 'public', 'img'), { recursive: true });
// the blank film and the registry that points at it
fs.mkdirSync(path.join(out, 'src', 'films', 'main'), { recursive: true });
// the reels the kit has (an older kit may lack one): registered beside the film
const REELS = [
  { id: 'library-type', file: 'ReelType', comp: 'ReelType', dur: 'reelTypeDuration' },
  { id: 'library-turns', file: 'ReelTurns', comp: 'ReelTurns', dur: 'reelTurnsDuration' },
  { id: 'library-fx', file: 'ReelFx', comp: 'ReelFx', dur: 'reelFxDuration' },
  { id: 'library-camera', file: 'ReelCamera', comp: 'ReelCamera', dur: 'reelCameraDuration' },
  { id: 'library-ui', file: 'ReelUi', comp: 'ReelUi', dur: 'reelUiDuration' },
  { id: 'library-hosts', file: 'ReelHosts', comp: 'ReelHosts', dur: 'reelHostsDuration' },
  { id: 'library-objects', file: 'ReelObjects', comp: 'ReelObjects', dur: 'reelObjectsDuration' },
  { id: 'library-grounds', file: 'ReelGrounds', comp: 'ReelGrounds', dur: 'reelGroundsDuration' },
  { id: 'library-designs', file: 'ReelDesigns', comp: 'ReelDesigns', dur: 'reelDesignsDuration' },
].filter((r) => fs.existsSync(path.join(out, 'src', 'films', 'library', `${r.file}.tsx`)));
fs.copyFileSync(path.join(kit, 'starter', 'Film.tsx'), path.join(out, 'src', 'films', 'main', 'Film.tsx'));
fs.rmSync(path.join(out, 'starter'), { recursive: true, force: true });
fs.writeFileSync(
  path.join(out, 'src', 'films.ts'),
  [
    '// The films in this project. Each registers as its own composition (and is reachable by the Sheet).',
    "import type React from 'react';",
    "import { Film, duration } from './films/main/Film';",
    ...REELS.map((r) => `import { ${r.comp}, ${r.dur} } from './films/library/${r.file}';`),
    '',
    'export const FILMS: Record<string, { component: React.FC; duration: number; fps: number; width?: number; height?: number }> = {',
    '  // a vertical film: add width: 1080, height: 1920 (and lay the film out for that frame)',
    '  main: { component: Film, duration, fps: 30 },',
    "  // the motion library's reels: every piece of a category, named, in catalogue order (frames.mjs library --strip <Name>)",
    ...REELS.map((r) => `  '${r.id}': { component: ${r.comp}, duration: ${r.dur}, fps: 30 },`),
    '};',
    '',
  ].join('\n'),
);
fs.writeFileSync(path.join(out, 'src', 'sfx.ts'), '// Written by scripts/sfx.mjs get (empty until you fetch sounds).\nexport const sfx = {} as const;\n');
fs.mkdirSync(path.join(out, 'public'), { recursive: true });
const name = (() => {
  const i = args.indexOf('--name');
  return i >= 0 ? args[i + 1] : path.basename(out);
})();
const pkg = JSON.parse(fs.readFileSync(path.join(out, 'package.json'), 'utf8'));
pkg.name = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '-film';
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
// the kit's version, so `frames.mjs check` can say when the skill's kit has moved on since this copy
const kv = stampKit(kit, out);
console.log(`film project: ${out} (kit ${kv.version}, ${kv.date})`);
if (!args.includes('--no-install')) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['install', '--no-audit', '--no-fund'], { cwd: out, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('first: find in the library (node scripts/frames.mjs library [--category turn] [--purpose join]; --show <Name> gives its props, --strip <Name> its frames; render --film library-<type|turns|fx|camera|ui|hosts|objects|grounds|designs> to see a reel move)');
console.log('next: BRIEF.md, BEATS.md (one row per beat, tagged by composition), then src/films/main/Film.tsx and: node scripts/frames.mjs sheet');
