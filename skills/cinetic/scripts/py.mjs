#!/usr/bin/env node
/**
 * py.mjs: run one of the project's Python scripts with the right interpreter, wherever npm runs it.
 *
 * The npm scripts call it instead of a bare `python3`, which is missing on a plain Windows install (or is
 * the Microsoft Store alias, which exits 49) and never names a Windows virtualenv (its interpreter is
 * python.exe). It runs $PYTHON when that is set, else the first of python3, python and (on Windows)
 * `py -3` that runs Python 3.10 or newer, with the arguments as given and stdin, stdout and stderr passed
 * through; the exit code is the script's own.
 *
 * Usage (from the project root):  node scripts/py.mjs <script.py> [args ...]
 *                                 node scripts/py.mjs --which     (print the interpreter it would use)
 * Exit codes: the script's own, 2 no arguments, 127 no Python 3.10+ found.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (!args.length || args[0] === '--help' || args[0] === '-h') {
  const doc = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, '');
  console.log(doc.trim());
  process.exit(args.length ? 0 : 2);
}
const win = process.platform === 'win32';
const env = process.env.PYTHON;
const cands = env ? [[env]] : [['python3'], ['python'], ...(win ? [['py', '-3']] : [])];
const ok = ([exe, ...pre]) =>
  env || spawnSync(exe, [...pre, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' }).status === 0;
const use = cands.find(ok);
if (!use) {
  console.error(`py.mjs: no Python 3.10+ found (tried ${cands.map((c) => c.join(' ')).join(', ')}): install it with the packages in docs/setup.md, or set PYTHON to the interpreter of that environment`);
  process.exit(127);
}
if (args[0] === '--which') {
  console.log(use.join(' '));
  process.exit(0);
}
const [exe, ...pre] = use;
const r = spawnSync(exe, [...pre, ...args], { stdio: 'inherit' });
if (r.error) {
  console.error(`py.mjs: could not run ${exe}: ${r.error.message}`);
  process.exit(127);
}
process.exit(r.status ?? 1);
