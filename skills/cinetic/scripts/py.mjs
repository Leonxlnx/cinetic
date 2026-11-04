#!/usr/bin/env node
/**
 * py.mjs: run one of the project's Python scripts with the right interpreter, wherever npm runs it.
 *
 * The npm scripts call it instead of a bare `python3`, which is missing on a plain Windows install (or is
 * the Microsoft Store alias, which exits 49 or 9009 without running anything) and never names a Windows
 * virtualenv (its interpreter is python.exe). It runs $PYTHON when that is set (else $CINETIC_PYTHON), else
 * the first of the active virtualenv ($VIRTUAL_ENV), a .venv or venv folder in the working folder, the interpreter
 * an earlier run found with the full set (`python` in ~/.cinetic/tools.json, or $CINETIC_HOME: npm run sound records
 * it), python3, python and (on Windows) `py -3` that runs Python 3.10 or newer and imports numpy,
 * scipy and cv2 (else numpy alone; if none imports numpy, the first that runs 3.10+, with a warning), with the
 * arguments as given and stdin, stdout and stderr passed through; the exit code is the script's own. A name is
 * used only after it has run a version check. The scripts and tests that shell out to Python find it here too
 * (`findPython`). --check imports every package in scripts/requirements.txt with that interpreter and prints
 * the ones it misses with the pip line that installs them.
 *
 * Usage (from the project root):  node scripts/py.mjs <script.py> [args ...]
 *                                 node scripts/py.mjs --which     (print the interpreter it would use)
 *                                 node scripts/py.mjs --check     (the packages it misses, and the pip line)
 * Exit codes: the script's own, 2 no arguments, 127 no Python 3.10+ found; --check: 0 every package
 * imports, 1 some are missing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const win = process.platform === 'win32';
const found = new Map();

/** The command that runs Python 3.10+ ([exe, ...args], e.g. ['py', '-3']), or null when none runs. $PYTHON or
 *  $CINETIC_PYTHON is taken as given; otherwise each of the project's virtualenv, the remembered interpreter
 *  (tools.json), python3, python and (on Windows) py -3 must pass a version check, and with `numpy` (the default) one
 *  that imports numpy, scipy and cv2 comes first, then one that imports numpy. `quiet` keeps the warning off stderr. */
export function findPython({ numpy = true, quiet = false } = {}) {
  const key = `${numpy}`;
  if (found.has(key)) return found.get(key);
  const env = process.env.PYTHON || process.env.CINETIC_PYTHON;
  // a project's own environment first: the active virtualenv, then a .venv or venv folder here
  const venvs = [process.env.VIRTUAL_ENV, join(process.cwd(), '.venv'), join(process.cwd(), 'venv')]
    .filter(Boolean)
    .map((d) => join(d, win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python'))
    .filter((p) => existsSync(p))
    .map((p) => [p]);
  // then the interpreter an earlier run found with the full set (sound.mjs and kit.py record it in tools.json)
  const remembered = (() => {
    try {
      const t = JSON.parse(readFileSync(join(process.env.CINETIC_HOME || join(homedir(), '.cinetic'), 'tools.json'), 'utf8'));
      return typeof t.python === 'string' && existsSync(t.python) ? [[t.python]] : [];
    } catch {
      return [];
    }
  })();
  const cands = env ? [[env]] : [...venvs, ...remembered, ['python3'], ['python'], ...(win ? [['py', '-3']] : [])];
  const runs = ([exe, ...pre], imports) =>
    spawnSync(exe, [...pre, '-c', `import sys${imports}; sys.exit(0 if sys.version_info >= (3, 10) else 1)`], { stdio: 'ignore' }).status === 0;
  let use = env ? cands[0] : numpy ? cands.find((c) => runs(c, ', numpy, scipy, cv2')) ?? cands.find((c) => runs(c, ', numpy')) : null;
  if (!use) {
    use = cands.find((c) => runs(c, '')) ?? null;
    if (use && numpy && !quiet) console.error(`py.mjs: none of ${cands.map((c) => c.join(' ')).join(', ')} imports numpy; using ${use.join(' ')}: install scripts/requirements.txt into it (${use.join(' ')} -m pip install -r scripts/requirements.txt), or set PYTHON to the interpreter of an environment that has them`);
  }
  found.set(key, use);
  return use;
}

/** The packages in requirements.txt (beside this file) as [pip name, import name]. */
const REQ = join(dirname(fileURLToPath(import.meta.url)), 'requirements.txt');
const IMPORT_AS = { 'opencv-python': 'cv2', 'opencv-python-headless': 'cv2', pillow: 'PIL', fonttools: 'fontTools' };
export function requirements() {
  if (!existsSync(REQ)) return [];
  return readFileSync(REQ, 'utf8').split(/\r?\n/).map((l) => l.replace(/(^|\s)#.*$/, '').trim()).filter(Boolean)
    .map((l) => l.split(/[\s<>=!~;[]/)[0]).map((n) => [n, IMPORT_AS[n.toLowerCase()] ?? n.replace(/-/g, '_')]);
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
    console.error(`py.mjs: no Python 3.10+ found (tried python3, python${win ? ', py -3' : ''}): install Python 3.11 or newer with the packages in scripts/requirements.txt, or set PYTHON to the interpreter of that environment`);
    process.exit(127);
  }
  if (args[0] === '--which') {
    console.log(use.join(' '));
    process.exit(0);
  }
  if (args[0] === '--check') {
    const req = requirements();
    if (!req.length) {
      console.error(`py.mjs: no ${REQ}`);
      process.exit(2);
    }
    const [exe, ...pre] = use;
    // the import names go in as arguments, never inside the -c string
    const code = [
      'import importlib, sys',
      'miss = []',
      'for m in sys.argv[1:]:',
      '    try:',
      '        importlib.import_module(m)',
      '    except Exception:',
      '        miss.append(m)',
      'print(sys.version.split()[0])',
      'print(" ".join(miss))',
    ].join('\n');
    const r = spawnSync(exe, [...pre, '-c', code, ...req.map(([, m]) => m)], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`py.mjs: ${use.join(' ')} did not run the check: ${(r.stderr || r.error?.message || '').trim().slice(0, 300)}`);
      process.exit(1);
    }
    const [ver = '?', missing = ''] = (r.stdout || '').split(/\r?\n/);
    const miss = new Set(missing.split(' ').filter(Boolean));
    const need = req.filter(([, m]) => miss.has(m)).map(([n]) => n);
    if (!need.length) {
      console.log(`py.mjs: ${use.join(' ')} (Python ${ver}) imports every package in scripts/requirements.txt`);
      process.exit(0);
    }
    console.log(`py.mjs: ${use.join(' ')} (Python ${ver}) is missing ${need.join(', ')}. Install them with`);
    const q = (s) => (/\s/.test(s) ? `"${s}"` : s);
    console.log(`  ${use.map(q).join(' ')} -m pip install -r ${q(REQ.split('\\').join('/'))}`);
    console.log('or set PYTHON to the interpreter of an environment that has them.');
    process.exit(1);
  }
  const [exe, ...pre] = use;
  const r = spawnSync(exe, [...pre, ...args], { stdio: 'inherit' });
  if (r.error) {
    console.error(`py.mjs: could not run ${exe}: ${r.error.message}`);
    process.exit(127);
  }
  process.exit(r.status ?? 1);
}
