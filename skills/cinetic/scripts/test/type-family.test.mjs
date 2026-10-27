#!/usr/bin/env node
/**
 * type-family.test.mjs: switching a film's type family is one step, never a manual paste.
 *
 *   1. scripts/type-family.mjs bold writes TYPE_FAMILY, the six roles of TYPE (TYPE_LOOK.bold number for number) and
 *      the FACES weights into a copy of the starter's tokens; the comments keep their use; --check agrees; calm on the
 *      starter's own tokens changes nothing; calm after bold gives the calm numbers back; bad arguments exit 2.
 *   2. Every template declares type_family (calm or bold) in template.json, and new-film.sh, run on a temp folder,
 *      writes it into the film's tokens (--type wins; needs bash: on Windows, Git for Windows).
 *
 * Usage (from the skill root):  node scripts/test/type-family.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SCRIPT = join(SKILL, 'scripts', 'type-family.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/type-family.test.mjs [--verbose]');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
const run = (...a) => spawnSync(process.execPath, [SCRIPT, ...a], { encoding: 'utf8' });
const ROLES = ['ui', 'caption', 'line', 'display', 'hero', 'giant'];
const rolesIn = (src, from) => {
  const out = {};
  const block = src.slice(src.indexOf(from));
  for (const r of ROLES) {
    const m = block.match(new RegExp(`\\n\\s*${r}: \\{ size: (-?[\\d.]+), weight: (-?[\\d.]+), track: (-?[\\d.]+), lead: (-?[\\d.]+) \\}`));
    out[r] = m ? m.slice(1, 5).map(Number) : null;
  }
  return out;
};

const look = readFileSync(join(STARTER, 'src', 'lib', 'look.ts'), 'utf8');
const bold = rolesIn(look, '  bold: {');
const calm = rolesIn(look, '  calm: {');
const tmp = mkdtempSync(join(tmpdir(), 'cinetic-typefamily-'));
try {
  mkdirSync(join(tmp, 'src', 'lib'), { recursive: true });
  mkdirSync(join(tmp, 'src', 'brand'), { recursive: true });
  copyFileSync(join(STARTER, 'src', 'lib', 'look.ts'), join(tmp, 'src', 'lib', 'look.ts'));
  const TOK = join(tmp, 'src', 'brand', 'tokens.ts');
  copyFileSync(join(STARTER, 'src', 'brand', 'tokens.ts'), TOK);
  const original = readFileSync(TOK, 'utf8');

  const r0 = run('calm', '--dir', tmp, '--quiet');
  result(r0.status === 0 && readFileSync(TOK, 'utf8') === original, 'calm on the starter\'s calm tokens changes nothing');

  const r1 = run('bold', '--dir', tmp, '--quiet');
  const t1 = readFileSync(TOK, 'utf8');
  const got = rolesIn(t1, 'export const TYPE = {');
  result(r1.status === 0 && /TYPE_FAMILY: TypeFamily = 'bold';/.test(t1) && ROLES.every((r) => JSON.stringify(got[r]) === JSON.stringify(bold[r])), 'bold writes TYPE_FAMILY and the six roles, TYPE_LOOK.bold number for number', JSON.stringify(got.line));
  result(/FACES = \['500 16px "Inter Variable"', '600 16px "Inter Variable"', '400 16px "Geist Mono Variable"'\]/.test(t1), 'bold sets FACES to the family\'s weights (500 and 600) and keeps the mono', t1.match(/FACES = .*/)?.[0]);
  result(/line: \{ size: 120[^\n]*\/\/ the sentence line, chains \(fx\/Chain\) and build lines: cap 8\.1 %/.test(t1) && /secondary: \{ size: 48/.test(t1), 'a role\'s comment keeps its use with the new cap height; other roles stay', t1.match(/ {2}line: .*/)?.[0]);
  result(run('bold', '--dir', tmp, '--check').status === 0 && run('calm', '--dir', tmp, '--check').status === 1, '--check: in step with bold, out of step with calm');

  const r2 = run('calm', '--dir', tmp, '--quiet');
  const back = rolesIn(readFileSync(TOK, 'utf8'), 'export const TYPE = {');
  result(r2.status === 0 && ROLES.every((r) => JSON.stringify(back[r]) === JSON.stringify(calm[r])) && run('calm', '--dir', tmp, '--check').status === 0, 'calm after bold gives the calm numbers back');
  result(run('loud', '--dir', tmp).status === 2 && run('bold', '--dir', join(tmp, 'nope')).status === 1, 'an unknown family exits 2; a folder without the tokens exits 1');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// 2. the templates
const TPL = join(SKILL, 'assets', 'templates');
const fams = readdirSync(TPL).filter((d) => existsSync(join(TPL, d, 'template.json'))).map((d) => [d, JSON.parse(readFileSync(join(TPL, d, 'template.json'), 'utf8')).type_family]);
result(fams.length >= 7 && fams.every(([, f]) => f === 'calm' || f === 'bold'), 'every template declares type_family calm or bold', fams.map(([d, f]) => `${d}:${f}`).join(' '));
// new-film.sh itself, on a temp folder: a bold template's film gets bold type, and --type wins over the template
const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
const bash = process.platform === 'win32' ? (existsSync(gitBash) ? gitBash : null) : 'bash';
if (!bash) console.log('skip  new-film.sh --template (no bash: install Git for Windows)');
else {
  const [tpl, fam] = fams.find(([, f]) => f === 'bold') ?? fams[0];
  const other = fam === 'bold' ? 'calm' : 'bold';
  const nfTmp = mkdtempSync(join(tmpdir(), 'cinetic-typefam-nf-'));
  const slash = (p) => p.split('\\').join('/');
  const film = (name, ...more) => {
    const dir = join(nfTmp, name);
    const r = spawnSync(bash, [slash(join(SKILL, 'scripts', 'new-film.sh')), slash(dir), '--template', tpl, '--no-install', ...more], { encoding: 'utf8' });
    const tok = join(dir, 'src', 'brand', 'tokens.ts');
    const got = existsSync(tok) ? readFileSync(tok, 'utf8').match(/export const TYPE_FAMILY: TypeFamily = '(\w+)'/)?.[1] : null;
    return { status: r.status, fam: got ?? null, err: (r.stderr || r.stdout || '').trim().slice(-300) };
  };
  try {
    const own = film('own');
    result(own.status === 0 && own.fam === fam, `new-film.sh --template ${tpl} writes the template's type_family (${fam}) into the film's tokens`, own.status === 0 ? String(own.fam) : own.err);
    const forced = film('forced', '--type', other);
    result(forced.status === 0 && forced.fam === other, `new-film.sh --type ${other} wins over the template's ${fam}`, forced.status === 0 ? String(forced.fam) : forced.err);
  } finally {
    rmSync(nfTmp, { recursive: true, force: true });
  }
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
