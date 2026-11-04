#!/usr/bin/env node
/**
 * add-font.test.mjs: scripts/add-font.mjs --add on a film made in a temp folder from the starter's brand files and a
 * small variable-font package written in code (no network, no npm).
 *
 *   1. --add <key> writes FONT.<key> and a FACES entry and changes nothing else in tokens.ts, also when the key is a
 *      palette name (accent, line, mute): C keeps every colour.
 *   2. A second --add of the same key replaces FONT.<key> in place (one line, the newer family).
 *   3. --add text and --add mono are refused (they would replace a role).
 *
 * Usage (from the skill root):  node scripts/test/add-font.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const ADD = join(SKILL, 'scripts', 'add-font.mjs');
const BRAND = join(SKILL, 'assets', 'remotion-starter', 'src', 'brand');
const verbose = process.argv.includes('--verbose');

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const objOf = (src, name) => (new RegExp(`^export const ${name}\\s*=\\s*[\\[{][\\s\\S]*?\\n[\\]}];?`, 'm').exec(src) || [''])[0];

const tmp = mkdtempSync(join(tmpdir(), 'cinetic-add-font-'));
try {
  const film = join(tmp, 'film');
  mkdirSync(join(film, 'src', 'brand'), { recursive: true });
  for (const f of ['tokens.ts', 'fonts.ts']) copyFileSync(join(BRAND, f), join(film, 'src', 'brand', f));
  const pkg = (name, family) => {
    const root = join(film, 'node_modules', '@fontsource-variable', name);
    mkdirSync(join(root, 'files'), { recursive: true });
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: `@fontsource-variable/${name}`, version: '1.0.0' }));
    writeFileSync(join(root, 'metadata.json'), JSON.stringify({ category: 'sans-serif' }));
    writeFileSync(join(root, 'files', `${name}-latin-wght-normal.woff2`), 'not a font: the test only copies it');
    writeFileSync(join(root, 'index.css'), `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-display: swap;\n  font-weight: 100 900;\n  src: url(./files/${name}-latin-wght-normal.woff2) format('woff2-variations');\n}\n`);
  };
  pkg('quill-sans', 'Quill Sans Variable');
  pkg('quill-grotesk', 'Quill Grotesk Variable');
  const run = (...args) => {
    const r = spawnSync(process.execPath, [ADD, ...args, '--dir', film], { encoding: 'utf8' });
    if (verbose) console.log(`  $ add-font.mjs ${args.join(' ')} -> ${r.status}\n${r.stdout}${r.stderr}`);
    return r;
  };
  const tokens = () => readFileSync(join(film, 'src', 'brand', 'tokens.ts'), 'utf8');
  const before = tokens();
  const keep = (src) => src.replace(objOf(src, 'FONT'), '').replace(objOf(src, 'FACES'), '');

  // 1. a palette name as the key
  for (const key of ['accent', 'line']) {
    const r = run('quill-sans', '--add', key);
    const now = tokens();
    const font = objOf(now, 'FONT');
    result(r.status === 0 && new RegExp(`\\n\\s*${key}: '"Quill Sans Variable", system-ui, sans-serif'`).test(font),
      `--add ${key}: FONT.${key} is the family`, r.status === 0 ? font.split('\n').filter((l) => l.includes(key)).join(' | ') : r.stderr.trim());
    result(objOf(now, 'C') === objOf(before, 'C') && keep(now) === keep(before),
      `--add ${key}: the palette and everything outside FONT and FACES are unchanged`);
  }
  result(/"Quill Sans Variable"'/.test(objOf(tokens(), 'FACES')), 'FACES waits for the added family');

  // 2. the same key again: replaced in place
  const r2 = run('quill-grotesk', '--add', 'accent');
  const font2 = objOf(tokens(), 'FONT');
  result(r2.status === 0 && (font2.match(/\n\s*accent:/g) || []).length === 1 && font2.includes('"Quill Grotesk Variable"') && !/accent: '"Quill Sans/.test(font2),
    'a second --add accent replaces FONT.accent in place', font2.split('\n').filter((l) => l.includes('accent')).join(' | '));

  // 3. the roles are refused
  for (const key of ['text', 'mono']) {
    const r = run('quill-sans', '--add', key);
    result(r.status === 2, `--add ${key} is refused (exit 2)`, `exit ${r.status}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
