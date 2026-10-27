#!/usr/bin/env node
/**
 * py.mjs: run one of the project's Python scripts with the right interpreter, wherever npm runs it.
 *
 * The npm scripts call it instead of a bare `python3`, which is missing on a plain Windows install (or is
 * the Microsoft Store alias, which exits 49 or 9009 without running anything) and never names a Windows
 * virtualenv (its interpreter is python.exe). It runs $PYTHON when that is set (else $CINETIC_PYTHON), else
 * the first of python3, python and (on Windows) `py -3` that runs Python 3.10 or newer and imports numpy
 * (if none imports it, the first that runs 3.10+, with a warning), with the arguments as given and stdin,
 * stdout and stderr passed through; the exit code is the script's own. A name is used only after it has
 * run a version check. The scripts and tests that shell out to Python find it here too (`findPython`).
 *
 * Usage (from the project root):  node scripts/py.mjs <script.py> [args ...]
 *                                 node scripts/py.mjs --which     (print the interpreter it would use)
 * Exit codes: the script's own, 2 no arguments, 127 no Python 3.10+ found.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const win = process.platform === 'win32';
const found = new Map();

/** The command that runs Python 3.10+ ([exe, ...args], e.g. ['py', '-3']), or null when none runs. $PYTHON or
 *  $CINETIC_PYTHON is taken as given; otherwise each of python3, python and (on Windows) py -3 must pass a version
 *  check, and with `numpy` (the default) one that imports numpy comes first. `quiet` keeps the warning off stderr. */
export function findPython({ numpy = true, quiet = false } = {}) {
  const key = `${numpy}`;
  if (found.has(key)) return found.get(key);
  const env = process.env.PYTHON || process.env.CINETIC_PYTHON;
  const cands = env ? [[env]] : [['python3'], ['python'], ...(win ? [['py', '-3']] : [])];
  const runs = ([exe, ...pre], imports) =>
    spawnSync(exe, [...pre, '-c', `import sys${imports}; sys.exit(0 if sys.version_info >= (3, 10) else 1)`], { stdio: 'ignore' }).status === 0;
  let use = env ? cands[0] : numpy ? cands.find((c) => runs(c, ', numpy')) : null;
  if (!use) {
    use = cands.find((c) => runs(c, '')) ?? null;
    if (use && numpy && !quiet) console.error(`py.mjs: none of ${cands.map((c) => c.join(' ')).join(', ')} imports numpy; using ${use.join(' ')}: install the packages in docs/setup.md into it, or set PYTHON to the interpreter of an environment that has them`);
  }
  found.set(key, use);
  return use;
}

const self = (() => {
  try { return realpathSync(process.argv[1] || '') === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (self) {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    const doc = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, '');
    console.log(doc.trim());
    process.exit(args.length ? 0 : 2);
  }
  const use = findPython();
  if (!use) {
    console.error(`py.mjs: no Python 3.10+ found (tried python3, python${win ? ', py -3' : ''}): install it with the packages in docs/setup.md, or set PYTHON to the interpreter of that environment`);
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
}
