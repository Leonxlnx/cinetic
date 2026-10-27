#!/usr/bin/env node
/**
 * type-family.mjs: switch a Remotion film's type family (calm or bold) in one step.
 *
 * Writes the family's six measured roles from src/lib/look.ts TYPE_LOOK into src/brand/tokens.ts: TYPE_FAMILY, the
 * ui / caption / line / display / hero / giant lines of TYPE (size, weight, tracking, lead; each line's comment keeps
 * its use and states the new cap height) and the FACES the FontGate waits for (the text face at the family's weights).
 * Other roles, colours and the face itself stay as they are. new-film.sh runs it for --type or a template's
 * type_family; run it again any time to switch (a brand's fitted tracking is replaced by the family's: re-fit with
 * scripts/faces.json's offsets, or scripts/font-match.mjs, if the face is not Inter).
 *
 * Usage (from the project root):
 *   node scripts/type-family.mjs <calm|bold> [--dir <film>] [--check] [--quiet]
 *   --check  write nothing; exit 1 when the tokens are not the family's numbers (TYPE_FAMILY or a role differs)
 * Exit codes: 0 written (or --check: in step), 1 a file is missing or does not have the lines to set (or --check: out
 * of step), 2 bad arguments.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const usage = () => console.log('usage: node scripts/type-family.mjs <calm|bold> [--dir <film>] [--check] [--quiet]');
if (argv.includes('--help') || argv.includes('-h')) {
  usage();
  process.exit(0);
}
let family = null;
let dir = '.';
let check = false;
let quiet = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--dir') dir = argv[++i] ?? '';
  else if (a === '--check') check = true;
  else if (a === '--quiet') quiet = true;
  else if (!a.startsWith('-') && !family) family = a;
  else {
    console.error(`type-family: unknown argument ${a}`);
    usage();
    process.exit(2);
  }
}
if (family !== 'calm' && family !== 'bold') {
  console.error('type-family: the family is calm or bold');
  usage();
  process.exit(2);
}
const ROOT = resolve(dir || '.');
const LOOK = join(ROOT, 'src', 'lib', 'look.ts');
const TOKENS = join(ROOT, 'src', 'brand', 'tokens.ts');
const fail = (msg) => {
  console.error(`type-family: ${msg}`);
  process.exit(1);
};
for (const f of [LOOK, TOKENS]) if (!existsSync(f)) fail(`${f} not found (pass --dir <film>)`);

const ROLES = ['ui', 'caption', 'line', 'display', 'hero', 'giant'];
const NUM = '(-?\\d+(?:\\.\\d+)?)';
const roleRe = (name) => new RegExp(`^(\\s*)${name}: \\{ size: ${NUM}, weight: ${NUM}, track: ${NUM}, lead: ${NUM} \\},?(.*)$`);

/** The six roles of a family from look.ts TYPE_LOOK (the block `<family>: {` inside `export const TYPE_LOOK = {`). */
const familyRoles = (src, fam) => {
  const start = src.indexOf('export const TYPE_LOOK');
  if (start < 0) fail(`${LOOK} has no TYPE_LOOK`);
  const lines = src.slice(start).split('\n');
  const at = lines.findIndex((l) => new RegExp(`^\\s*${fam}: \\{\\s*$`).test(l));
  if (at < 0) fail(`TYPE_LOOK has no ${fam} family`);
  const out = {};
  for (const l of lines.slice(at + 1)) {
    if (/^\s*\},?\s*$/.test(l)) break;
    for (const r of ROLES) {
      const m = l.match(roleRe(r));
      if (m) out[r] = { size: +m[2], weight: +m[3], track: +m[4], lead: +m[5] };
    }
  }
  const missing = ROLES.filter((r) => !out[r]);
  if (missing.length) fail(`TYPE_LOOK.${fam} lacks ${missing.join(', ')}`);
  return out;
};

const look = readFileSync(LOOK, 'utf8');
const roles = familyRoles(look, family);
let tokens = readFileSync(TOKENS, 'utf8');
const before = tokens;
const capPct = (size) => Math.round(((size * 0.727) / 1080) * 1000) / 10; // Inter's cap is 0.727 em

// TYPE_FAMILY
const famRe = /^(export const TYPE_FAMILY(?:: TypeFamily)? = )'(calm|bold)';/m;
const famNow = tokens.match(famRe)?.[2];
if (!famNow) fail(`${TOKENS} has no "export const TYPE_FAMILY: TypeFamily = '...';" line`);
tokens = tokens.replace(famRe, `$1'${family}';`);

// the six role lines inside `export const TYPE = {`
const tStart = tokens.indexOf('export const TYPE = {');
if (tStart < 0) fail(`${TOKENS} has no "export const TYPE = {" block`);
const tEnd = tokens.indexOf('\n};', tStart);
const block = tokens.slice(tStart, tEnd);
const drift = [];
const next = block
  .split('\n')
  .map((l) => {
    for (const r of ROLES) {
      const m = l.match(roleRe(r));
      if (!m) continue;
      const v = roles[r];
      if (+m[2] === v.size && +m[3] === v.weight && +m[4] === v.track && +m[5] === v.lead) return l; // already the family's
      drift.push(r);
      // the comment keeps its use; its cap height (and a calm or bold range in brackets) follows the family
      const note = (m[6] ?? '').replace(/cap \d+(?:\.\d+)? %( FH)?( \([^)]*\))?/, `cap ${capPct(v.size)} %$1`);
      return `${m[1]}${r}: { size: ${v.size}, weight: ${v.weight}, track: ${v.track}, lead: ${v.lead} },${note}`;
    }
    return l;
  })
  .join('\n');
const seen = ROLES.filter((r) => block.split('\n').some((l) => roleRe(r).test(l)));
if (seen.length !== ROLES.length) fail(`TYPE in ${TOKENS} lacks the line for ${ROLES.filter((r) => !seen.includes(r)).join(', ')} (write each role as { size, weight, track, lead })`);
tokens = tokens.slice(0, tStart) + next + tokens.slice(tEnd);

// FACES: the text face at the family's weights (other faces, such as the mono, stay)
const facesRe = /^export const FACES = \[([^\]]*)\];/m;
const fm = tokens.match(facesRe);
if (fm) {
  const entries = [...fm[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  const text = entries.find((e) => !/mono/i.test(e));
  const famName = text?.match(/\d+ \d+px (.+)$/)?.[1];
  if (famName) {
    const weights = [...new Set(ROLES.map((r) => roles[r].weight))].sort((a, b) => a - b);
    const others = entries.filter((e) => e.match(/\d+ \d+px (.+)$/)?.[1] !== famName);
    const faces = [...weights.map((w) => `${w} 16px ${famName}`), ...others];
    if (faces.join('|') !== entries.join('|')) drift.push('FACES');
    tokens = tokens.replace(facesRe, `export const FACES = [${faces.map((f) => `'${f}'`).join(', ')}];`);
  }
}

if (check) {
  const ok = famNow === family && !drift.length;
  if (!quiet) console.log(`type-family: ${ok ? `the tokens hold the ${family} family` : `out of step with ${family}: ${[famNow !== family ? `TYPE_FAMILY is '${famNow}'` : '', ...drift].filter(Boolean).join(', ')}`}`);
  process.exit(ok ? 0 : 1);
}
if (tokens !== before) writeFileSync(TOKENS, tokens);
if (!quiet) {
  const r = roles;
  console.log(`type-family: ${family} -> src/brand/tokens.ts (line ${r.line.size} / ${r.line.weight}, display ${r.display.size}, hero ${r.hero.size}, giant ${r.giant.size}; weights ${[...new Set(ROLES.map((k) => r[k].weight))].join(' and ')})${tokens === before ? ', already in step' : ''}`);
}
