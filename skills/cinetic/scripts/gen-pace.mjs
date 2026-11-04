#!/usr/bin/env node
/**
 * gen-pace.mjs: copy the pace numbers from their single source, the Remotion starter's
 * src/lib/pace.ts, into the files that cannot import it:
 *   scripts/grid-check.ts                     BUILTIN    the check numbers (for a timeline that does not export PACE)
 *   scripts/export-cues.ts                    READ_PACE  the reading-window numbers
 *   assets/hyperframes-starter/motion.js      PACE       the whole pace (HyperFrames reads its defaults there)
 * Each block sits between the comment lines `// <gen-pace>` and `// </gen-pace>`; nothing between
 * them is edited by hand. The fields of BUILTIN and READ_PACE are the fields of the `type Pace` and
 * `type ReadPace` declarations in those files, so a check that gains a knob gains it here too.
 *
 * Usage (from the skill root, or from a film project made by new-film.sh):
 *   node scripts/gen-pace.mjs [--check] [--pace path/to/pace.ts]
 *   --check   change nothing; exit 1 and name every block that differs from pace.ts
 *   --pace    the pace file (default: assets/remotion-starter/src/lib/pace.ts in the skill, else src/lib/pace.ts)
 * Targets that do not exist are skipped (a film project has no hyperframes-starter).
 * Exit codes: 0 up to date (or written), 1 out of date with --check, 2 bad arguments or a missing marker.
 * Needs Node 22.13+ (it strips the types of pace.ts with node:module).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as nodeModule from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const argv = process.argv.slice(2);
const die = (msg) => {
  console.error(`gen-pace: ${msg}`);
  process.exit(2);
};
if (argv.includes('--help') || argv.includes('-h')) {
  const doc = readFileSync(fileURLToPath(import.meta.url), 'utf8').split(/\r?\n/).slice(2, 20);
  console.log(doc.map((l) => l.replace(/^ \*\/? ?/, '')).join('\n').trim());
  process.exit(0);
}
const check = argv.includes('--check');
const pi = argv.indexOf('--pace');
if (pi >= 0 && !argv[pi + 1]) die('--pace needs a path');
for (const a of argv) if (a.startsWith('--') && !['--check', '--pace'].includes(a)) die(`unknown option ${a}`);

const candidates = pi >= 0 ? [resolve(argv[pi + 1])] : [join(ROOT, 'assets', 'remotion-starter', 'src', 'lib', 'pace.ts'), join(ROOT, 'src', 'lib', 'pace.ts')];
const paceFile = candidates.find((p) => existsSync(p));
if (!paceFile) die(`no pace.ts found (looked for ${candidates.join(', ')})`);

// pace.ts has no imports: strip its types and evaluate it as a module.
const loadPace = async (file) => {
  const src = readFileSync(file, 'utf8');
  if (typeof nodeModule.stripTypeScriptTypes === 'function') {
    const warn = process.emitWarning; // the experimental-feature notice is noise here
    process.emitWarning = () => {};
    let js;
    try {
      js = nodeModule.stripTypeScriptTypes(src);
    } finally {
      process.emitWarning = warn;
    }
    return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  }
  return import(pathToFileURL(file).href);
};
const { PACE } = await loadPace(paceFile);
if (!PACE || !PACE.calm || !PACE.crisp) die(`${paceFile} does not export PACE with calm and crisp`);

// ---- formatting --------------------------------------------------------------------------------
const lit = (v) => {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`;
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${lit(x)}`).join(', ')} }`;
  die(`cannot write ${JSON.stringify(v)}`);
};
/** `key: value` pairs joined with ', ', wrapped to `width` columns, each line indented by `ind`. */
const wrap = (pairs, ind, width = 118) => {
  const lines = [];
  let cur = '';
  for (const p of pairs) {
    const next = cur ? `${cur} ${p},` : `${p},`;
    if (cur && ind.length + next.length > width) {
      lines.push(ind + cur);
      cur = `${p},`;
    } else cur = next;
  }
  if (cur) lines.push(ind + cur);
  return lines;
};
const fieldsOf = (src, typeName, file) => {
  const m = src.match(new RegExp(`type\\s+${typeName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!m) die(`${file}: no \`type ${typeName} = { ... };\` declaration`);
  return [...m[1].matchAll(/(\w+)\??\s*:/g)].map((x) => x[1]);
};
const pick = (p, fields, what) =>
  fields.map((k) => {
    if (p[k] === undefined) die(`pace.ts has no ${k} (needed by ${what})`);
    return `${k}: ${lit(p[k])}`;
  });

// ---- targets -----------------------------------------------------------------------------------
const OPEN = '// <gen-pace>';
const CLOSE = '// </gen-pace>';
const targets = [
  {
    file: join(ROOT, 'scripts', 'grid-check.ts'),
    body: (src, decl) => {
      const f = fieldsOf(src, 'Pace', 'grid-check.ts');
      return [decl, ...['calm', 'crisp'].map((n) => `  ${n}: { ${pick(PACE[n], f, 'grid-check.ts BUILTIN').join(', ')} },`), '};'];
    },
  },
  {
    file: join(ROOT, 'scripts', 'export-cues.ts'),
    body: (src, decl) => {
      const f = fieldsOf(src, 'ReadPace', 'export-cues.ts');
      return [decl, ...['calm', 'crisp'].map((n) => `  ${n}: { ${pick(PACE[n], f, 'export-cues.ts READ_PACE').join(', ')} },`), '};'];
    },
  },
  {
    file: join(ROOT, 'assets', 'hyperframes-starter', 'motion.js'),
    body: (_src, decl, indent) => {
      const inner = `${indent}  `;
      const out = [decl];
      for (const n of Object.keys(PACE)) {
        out.push(`${inner}${n}: {`);
        const ind = `${inner}  `;
        const flat = [];
        const nested = [];
        for (const [k, v] of Object.entries(PACE[n])) {
          const one = `${k}: ${lit(v)}`;
          // an object too long for one line opens on its own lines, one level deep
          if (v && typeof v === 'object' && !Array.isArray(v) && ind.length + one.length + 1 > 118) nested.push([k, v]);
          else flat.push(one);
        }
        out.push(...wrap(flat, ind));
        for (const [k, v] of nested) {
          out.push(`${ind}${k}: {`);
          out.push(...wrap(Object.entries(v).map(([kk, vv]) => `${kk}: ${lit(vv)}`), `${ind}  `));
          out.push(`${ind}},`);
        }
        out.push(`${inner}},`);
      }
      out.push(`${indent}};`);
      return out;
    },
  },
];

let stale = 0;
let wrote = 0;
for (const t of targets) {
  if (!existsSync(t.file)) continue;
  const src = readFileSync(t.file, 'utf8');
  const lines = src.split(/\r?\n/);
  const a = lines.findIndex((l) => l.trim() === OPEN);
  const b = lines.findIndex((l, i) => i > a && l.trim() === CLOSE);
  if (a < 0 || b < 0) die(`${t.file}: markers ${OPEN} ... ${CLOSE} not found`);
  const declIdx = lines.findIndex((l, i) => i > a && i < b && /=\s*\{\s*$/.test(l));
  if (declIdx < 0) die(`${t.file}: no \`const X = {\` line inside the markers`);
  const decl = lines[declIdx];
  const indent = decl.match(/^\s*/)[0];
  const block = t.body(src, decl, indent);
  const current = lines.slice(a + 1, b);
  const same = current.length === block.length && current.every((l, i) => l === block[i]);
  const rel = t.file.slice(ROOT.length + 1).replace(/\\/g, '/');
  if (same) {
    console.log(`gen-pace: ${rel} up to date`);
    continue;
  }
  if (check) {
    stale++;
    console.log(`gen-pace: ${rel} differs from ${paceFile.slice(ROOT.length + 1).replace(/\\/g, '/')} (run node scripts/gen-pace.mjs)`);
    continue;
  }
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(t.file, [...lines.slice(0, a + 1), ...block, ...lines.slice(b)].join(eol));
  wrote++;
  console.log(`gen-pace: wrote ${rel}`);
}
if (check && stale) process.exit(1);
if (!check) console.log(`gen-pace: ${wrote} file(s) written from ${paceFile}`);
