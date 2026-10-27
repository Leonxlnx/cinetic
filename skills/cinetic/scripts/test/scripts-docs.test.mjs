#!/usr/bin/env node
/**
 * scripts-docs.test.mjs: the scripts' --help contract, and the docs that describe the scripts.
 *
 *   1. hf-preflight.cjs, an internal helper of hf-finish.sh, answers --help or a missing
 *      environment with one message that points at hf-finish.sh, and exit 2 (no stack trace);
 *      with hf-finish.sh's environment it still runs the preflight and writes the cues.
 *   2. Every other script in scripts/ and scripts/audio/ handles --help.
 *   3. SKILL.md, README.md and docs/setup.md name the same internal helpers as the exceptions.
 *   4. docs/setup.md refreshes a project's scripts with new-film.sh's own copy, which leaves out
 *      scripts/test/ (its fixtures break the rules on purpose), never with a plain cp -R.
 *   5. One way to find Python: what scripts/py.mjs --which prints passes a version check (on Windows
 *      python3 is often the Microsoft Store alias, which runs nothing), $PYTHON and then $CINETIC_PYTHON
 *      are taken as given, no Python on the PATH exits 127, and no script or test spawns a bare python3
 *      or reads those variables itself (shell scripts honour $PYTHON, then ask py.mjs --which).
 *   README.md and docs/ are checked only in a clone of the repository.
 *
 * Usage (from the skill root):  node scripts/test/scripts-docs.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const SCRIPTS = join(SKILL, 'scripts');
const REPO = resolve(SKILL, '..', '..');
const PREFLIGHT = join(SCRIPTS, 'hf-preflight.cjs');
const INTERNAL = ['brand-svg.ts', 'hf-preflight.cjs'];  // run by brand-kit.sh and hf-finish.sh; no CLI of their own
const verbose = process.argv.includes('--verbose');

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const read = (p) => readFileSync(p, 'utf8');
const preflight = (args, extra) => {
  const env = { ...process.env };
  delete env.PROJ; delete env.ENTRY; delete env.CUES_OUT;
  const r = spawnSync(process.execPath, [PREFLIGHT, ...args], { encoding: 'utf8', env: { ...env, ...extra } });
  if (verbose) console.log(`  $ hf-preflight.cjs ${args.join(' ')} -> ${r.status}\n${r.stderr}${r.stdout}`);
  return r;
};

// 1. hf-preflight.cjs
const POINTER = 'bash scripts/hf-finish.sh --help';
for (const [name, args, env] of [
  ['--help', ['--help'], {}],
  ['-h', ['-h'], {}],
  ['no environment', [], {}],
  ['PROJ without ENTRY', [], { PROJ: SKILL }],
  ['--help with the environment set', ['--help'], { PROJ: SKILL, ENTRY: 'index.html' }],
]) {
  const r = preflight(args, env);
  const ok = r.status === 2 && r.stderr.includes(POINTER) && !/Error|\n\s+at /.test(r.stderr) && r.stdout === '';
  result(ok, `hf-preflight.cjs ${name}: points at hf-finish.sh, exit 2`, `exit ${r.status}${ok ? '' : `; stderr: ${r.stderr.trim().split('\n')[0]}`}`);
}
const starter = join(SKILL, 'assets', 'hyperframes-starter');
if (existsSync(join(starter, 'index.html'))) {
  const tmp = mkdtempSync(join(tmpdir(), 'cinetic-preflight-'));
  try {
    const cues = join(tmp, 'cues.json');
    const r = preflight([], { PROJ: starter, ENTRY: 'index.html', CUES_OUT: cues });
    const line = r.stdout.trim();
    const okLine = r.status === 0 && /^P_DUR=\S* P_ROOTFPS=\S* P_W=\S* P_H=\S* P_TLFPS=\S* P_TOTAL=\S* P_ERR=\d+$/.test(line);
    result(okLine, 'hf-preflight.cjs with hf-finish.sh\'s environment: one line of assignments, exit 0', `exit ${r.status}; ${line}`);
    let c = null;
    try { c = JSON.parse(read(cues)); } catch { /* reported below */ }
    result(!!(c && c.total > 0 && c.events && c.events.length), 'hf-preflight.cjs CUES_OUT: writes the starter\'s cues',
      c ? `${c.total} frames, ${c.events?.length ?? 0} events` : 'no cues file');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
} else {
  console.log('skip  hf-preflight.cjs on the starter: no assets/hyperframes-starter/index.html');
}

// 2. every other script handles --help
const scripts = [];
for (const sub of ['', 'audio']) {
  const d = join(SCRIPTS, sub);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).sort()) {
    if (/\.(sh|py|mjs|cjs|js|ts)$/.test(f)) scripts.push(sub ? `${sub}/${f}` : f);
  }
}
const noHelp = scripts.filter((f) => !INTERNAL.includes(f)).filter((f) => {
  const src = read(join(SCRIPTS, f));
  return !(src.includes('--help') || (f.endsWith('.py') && src.includes('argparse.ArgumentParser')));
});
result(scripts.length > 20 && noHelp.length === 0, `every script but ${INTERNAL.join(' and ')} handles --help`,
  noHelp.length ? `no --help in ${noHelp.join(', ')}` : `${scripts.length - INTERNAL.length} scripts`);
for (const f of INTERNAL) result(scripts.includes(f), `internal helper ${f} exists`);

// 3. the docs name the same exceptions
const docs = [['skills/cinetic/SKILL.md', join(SKILL, 'SKILL.md')], ['README.md', join(REPO, 'README.md')], ['docs/setup.md', join(REPO, 'docs', 'setup.md')]];
for (const [name, path] of docs) {
  if (!existsSync(path)) { console.log(`skip  ${name}: not in this checkout`); continue; }
  const lines = read(path).split('\n').filter((l) => l.includes('--help') && INTERNAL.some((h) => l.includes(h)));
  const missing = INTERNAL.filter((h) => !lines.some((l) => l.includes(h)));
  result(lines.length > 0 && missing.length === 0, `${name}: the --help sentence names ${INTERNAL.join(' and ')} as the exceptions`,
    lines.length ? (missing.length ? `missing ${missing.join(', ')}` : '') : 'no sentence about --help and the helpers');
}

// 4. docs/setup.md copies scripts like new-film.sh does
const setup = join(REPO, 'docs', 'setup.md');
if (existsSync(setup)) {
  const doc = read(setup);
  const scaffold = (read(join(SCRIPTS, 'new-film.sh')).match(/\(cd "\$SKILL\/scripts" && tar(?: --exclude=\S+)+ -cf - \.\)/) || [''])[0];
  result(scaffold.includes('--exclude=./test'), 'new-film.sh copies scripts/ without scripts/test', scaffold || 'tar copy not found');
  result(!/cp -R "?\$SKILL\/scripts/.test(doc), 'docs/setup.md: no cp -R of the skill\'s scripts/ into a project');
  result(!!scaffold && doc.includes(scaffold), 'docs/setup.md: refreshes a project\'s scripts with new-film.sh\'s tar copy');
} else {
  console.log('skip  docs/setup.md: not in this checkout');
}

// 5. one way to find Python
{
  const PYMJS = join(SCRIPTS, 'py.mjs');
  const bare = { ...process.env };
  delete bare.PYTHON; delete bare.CINETIC_PYTHON;
  const which = (env) => spawnSync(process.execPath, [PYMJS, '--which'], { encoding: 'utf8', env });
  const w = which(bare);
  const cmd = w.stdout.trim().split(/\s+/).filter(Boolean);
  if (w.status === 0) {
    const v = spawnSync(cmd[0], [...cmd.slice(1), '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' });
    result(v.status === 0, `py.mjs --which names a Python that runs 3.10+ (${cmd.join(' ')})`, `exit ${v.status}`);
  } else console.log(`skip  py.mjs --which: no Python 3.10+ here (exit ${w.status})`);
  result(which({ ...bare, CINETIC_PYTHON: '/opt/py/bin/python' }).stdout.trim() === '/opt/py/bin/python', 'py.mjs honours $CINETIC_PYTHON');
  result(which({ ...bare, PYTHON: '/a/python', CINETIC_PYTHON: '/b/python' }).stdout.trim() === '/a/python', 'py.mjs: $PYTHON comes before $CINETIC_PYTHON');
  const empty = mkdtempSync(join(tmpdir(), 'cinetic-nopy-'));
  try {
    const n = which({ ...bare, PATH: empty, Path: empty });
    result(n.status === 127 && n.stdout === '', 'py.mjs --which with no Python on the PATH: exit 127, nothing named', `exit ${n.status} ${n.stdout.trim()}`);
  } finally { rmSync(empty, { recursive: true, force: true }); }
  const files = [];
  for (const sub of ['', 'audio', 'test']) for (const f of readdirSync(join(SCRIPTS, sub))) if (/\.(mjs|cjs|js|ts|sh)$/.test(f)) files.push(join(sub, f));
  const offenders = files.filter((f) => f !== 'py.mjs' && f !== join('test', 'scripts-docs.test.mjs')).filter((f) => {
    const src = read(join(SCRIPTS, f));
    return /(spawnSync|execFileSync|execSync|spawn)\(\s*['"]python3?['"]/.test(src) || /command python3/.test(src)
      || /process\.env\.(CINETIC_)?PYTHON\b/.test(src);
  });
  result(!offenders.length, 'every script and test finds Python through py.mjs (no bare python3, no own $PYTHON lookup)', offenders.join(', '));
}

process.exit(failed ? 1 : 0);
