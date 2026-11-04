#!/usr/bin/env node
/**
 * render-key.test.mjs: the fingerprint render.sh keeps beside a bundle (scripts/render-key.cjs).
 *
 *   1. A src folder's key (the 1.1 mode) changes when a file's bytes change and is the same when nothing did.
 *   2. public/ entries are keyed by path and size, a folder's files and a single file alike (render.sh passes public's
 *      folders but audio/, and its top-level files): a file whose size changes changes the key; a file given in the
 *      list never throws.
 *
 * Usage (from the skill root):  node scripts/test/render-key.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = resolve(HERE, '..', 'render-key.cjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/render-key.test.mjs [--verbose]');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};

const T = mkdtempSync(join(tmpdir(), 'cinetic-rkey-'));
try {
  mkdirSync(join(T, 'src'), { recursive: true });
  mkdirSync(join(T, 'public', 'plates'), { recursive: true });
  writeFileSync(join(T, 'src', 'a.ts'), 'export const A = 1;\n');
  writeFileSync(join(T, 'public', 'plates', 'sky.jpg'), 'x'.repeat(10));
  writeFileSync(join(T, 'public', 'logo.svg'), '<svg/>');
  const key = (...a) => spawnSync(process.execPath, [KEY, ...a], { cwd: T, encoding: 'utf8' });
  const k0 = key('src', 'public/plates', 'public/logo.svg');
  result(k0.status === 0 && /^[0-9a-f]{40}$/.test(k0.stdout.trim()), 'a src folder, a public folder and a public file key without error', (k0.stderr || k0.stdout).trim().slice(0, 200));
  result(key('src', 'public/plates', 'public/logo.svg').stdout === k0.stdout, 'the same files, the same key');
  writeFileSync(join(T, 'public', 'logo.svg'), '<svg></svg>');
  const k1 = key('src', 'public/plates', 'public/logo.svg');
  result(k1.status === 0 && k1.stdout !== k0.stdout, 'a top-level public file whose size changed changes the key');
  writeFileSync(join(T, 'src', 'a.ts'), 'export const A = 2;\n');
  const k2 = key('src', 'public/plates', 'public/logo.svg');
  result(k2.status === 0 && k2.stdout !== k1.stdout, "a source file's bytes changed change the key");
  writeFileSync(join(T, 'public', 'plates', 'sky.jpg'), 'x'.repeat(11));
  result(key('src', 'public/plates', 'public/logo.svg').stdout !== k2.stdout, "a file in a public folder whose size changed changes the key");
} finally {
  rmSync(T, { recursive: true, force: true });
}
console.log(failed ? `render-key tests: ${failed} failed` : 'render-key tests: all pass');
process.exit(failed ? 1 : 0);
