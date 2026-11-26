#!/usr/bin/env node
// library-docs.mjs: the motion library's section docs from its catalogue, and the catalogue checked against the code.
//
//   node scripts/library-docs.mjs            rewrites, inside each references/library-<category>.md, the table of its
//                                            pieces and the "In the reel" table (between their marker comments); the
//                                            hand-written text around them is left alone
//   node scripts/library-docs.mjs --check    exits 1 when a doc is out of date, a piece exported from the library has
//                                            no catalogue entry, an entry names a piece that is not exported, an
//                                            entry's reel range and its reel's segment (SEGMENTS) disagree, a reel's
//                                            segments leave a gap or overlap, a category lacks its folder, catalogue
//                                            file, reel or doc, or a value is not one the catalogue's types allow
//
// Run it in the kit (skills/cinetic/kit): it needs src/kit/library and ../references.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, catalogDir, loadLibrary } from './library-catalog.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = path.resolve(kit, '..', 'references');
const libDir = path.join(kit, 'src', 'kit', 'library');
const check = process.argv.includes('--check');
const problems = [];
const lib = loadLibrary(kit);
if (!lib) {
  console.error(`no catalogue at ${path.join(libDir, 'catalog')}`);
  process.exit(1);
}

// the values the catalogue's types allow (its own unions)
const catSrc = fs.readFileSync(path.join(catalogDir(kit), 'types.ts'), 'utf8');
const union = (name) => {
  const m = catSrc.match(new RegExp(`export type ${name} =([^;]*);`));
  return new Set([...(m?.[1] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1]));
};
const allowed = { category: union('Category'), purpose: union('Purpose'), subject: union('Subject'), mood: union('Mood') };

// ---- entries: fields and values
const seen = new Set();
for (const e of lib) {
  const at = `catalogue entry ${e.name ?? '(no name)'}`;
  if (!e.name || !/^[A-Z]\w*$/.test(e.name)) problems.push(`${at}: name must be the exported component's name`);
  if (seen.has(e.name)) problems.push(`${at}: listed twice`);
  seen.add(e.name);
  if (!allowed.category.has(e.category)) problems.push(`${at}: category "${e.category}" is not one of ${[...allowed.category].join(', ')}`);
  for (const k of ['purpose', 'subject', 'mood']) {
    if (!Array.isArray(e[k]) || !e[k].length) problems.push(`${at}: ${k} must be a list of one or more values`);
    else for (const v of e[k]) if (!allowed[k].has(v)) problems.push(`${at}: ${k} "${v}" is not one of the catalogue's ${k} values (add it to the type in catalog/types.ts if it is new)`);
  }
  if (!(e.frames > 0)) problems.push(`${at}: frames must be a number of frames`);
  for (const k of ['summary', 'use']) if (!e[k] || typeof e[k] !== 'string') problems.push(`${at}: ${k} is empty`);
  if (typeof e.caution !== 'string') problems.push(`${at}: caution must be a line or ''`);
  for (const k of ['summary', 'use', 'caution']) if (typeof e[k] === 'string' && (e[k].includes('|') || e[k].includes('\n'))) problems.push(`${at}: ${k} must be one line without |`);
  if (!e.reel || typeof e.reel.film !== 'string' || !(e.reel.from >= 0) || !(e.reel.to >= e.reel.from)) problems.push(`${at}: reel must be { film, from, to } with 0 <= from <= to`);
  else if (CATEGORIES[e.category] && e.reel.film !== CATEGORIES[e.category].film) problems.push(`${at}: a ${e.category} piece plays in the ${CATEGORIES[e.category].film} reel, not ${e.reel.film}`);
}
// every category's catalogue file, under its own name
for (const category of Object.keys(CATEGORIES)) if (!fs.existsSync(path.join(catalogDir(kit), `${category}.ts`))) problems.push(`src/kit/library/catalog/${category}.ts is missing`);

// ---- the code: every piece file's components against the catalogue
const exportsOf = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  return [...src.matchAll(/^export\s+(?:const|function)\s+([A-Z]\w*)/gm)].map((m) => m[1]).filter((n) => /[a-z]/.test(n));
};
const exported = new Map(); // piece name -> { category, file }
const top = fs.readFileSync(path.join(libDir, 'index.ts'), 'utf8');
for (const [category, { folder }] of Object.entries(CATEGORIES)) {
  const dir = path.join(libDir, folder);
  if (!fs.existsSync(dir)) {
    problems.push(`src/kit/library/${folder}/ is missing (the ${category} category's folder)`);
    continue;
  }
  if (!new RegExp(`export \\* from '\\./${folder}'`).test(top)) problems.push(`src/kit/library/index.ts does not re-export ./${folder}`);
  const index = fs.existsSync(path.join(dir, 'index.ts')) ? fs.readFileSync(path.join(dir, 'index.ts'), 'utf8') : '';
  if (!index) problems.push(`src/kit/library/${folder}/index.ts is missing`);
  for (const f of fs.readdirSync(dir).filter((x) => /\.tsx?$/.test(x) && !x.startsWith('_') && !/^index\.ts$/.test(x))) {
    for (const n of exportsOf(path.join(dir, f))) {
      exported.set(n, { category, file: `src/kit/library/${folder}/${f}` });
      if (!new RegExp(`\\b${n}\\b`).test(index)) problems.push(`${n} (src/kit/library/${folder}/${f}) is not exported from ${folder}/index.ts`);
    }
  }
}
for (const [n, { category, file }] of exported) {
  const e = lib.find((x) => x.name === n);
  if (!e) problems.push(`${n} is exported from ${file} but has no catalogue entry (a piece file exports pieces; parts go in _shared.tsx)`);
  else if (e.category !== category) problems.push(`${n}: catalogued as ${e.category} but its file is in the ${category} folder (${file})`);
}
for (const e of lib) if (!exported.has(e.name)) problems.push(`catalogue entry ${e.name}: no piece file in src/kit/library/${CATEGORIES[e.category]?.folder ?? e.category}/ exports it`);

// ---- the reels: every category's reel registered, its segments from frame 0 without gaps, each matching its entry
const films = fs.readFileSync(path.join(kit, 'src', 'films.ts'), 'utf8');
const reelFile = (film) => {
  const comp = films.match(new RegExp(`'${film}'\\s*:\\s*\\{\\s*component:\\s*(\\w+)`))?.[1];
  const imp = comp && [...films.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)].find((m) => m[1].split(',').map((s) => s.trim()).includes(comp));
  const p = imp && path.join(kit, 'src', imp[2] + '.tsx');
  return p && fs.existsSync(p) ? p : null;
};
const reels = new Map();
for (const [category, { film }] of Object.entries(CATEGORIES)) {
  const file = reelFile(film);
  if (!file) {
    problems.push(`reel ${film}: not registered in src/films.ts (or its file is missing)`);
    continue;
  }
  const rel = path.relative(kit, file).split(path.sep).join('/');
  const src = fs.readFileSync(file, 'utf8');
  const list = src.slice(src.indexOf('SEGMENTS: Segment[] = ['));
  if (!src.includes('SEGMENTS: Segment[] = [')) {
    problems.push(`${rel}: no "export const SEGMENTS: Segment[] = [ ... ]"`);
    continue;
  }
  const segs = [...list.slice(0, list.indexOf('];')).matchAll(/\{\s*name:\s*'(\w+)',\s*from:\s*(\d+),\s*dur:\s*(\d+)/g)].map((m) => ({ name: m[1], from: +m[2], dur: +m[3] }));
  reels.set(film, segs);
  let next = 0;
  for (const g of segs) {
    if (g.from !== next) problems.push(`${rel}: segment ${g.name} starts at ${g.from}, should start at ${next} (from = the segment before's from + dur: no gap, no overlap)`);
    next = g.from + g.dur;
  }
  const entries = lib.filter((e) => e.reel?.film === film);
  const own = entries.filter((e) => !e.reel.shownIn);
  for (const g of segs) {
    const e = own.find((x) => x.name === g.name);
    if (!e) problems.push(`${rel}: segment ${g.name} has no catalogue entry with its own range in ${film} (catalog/${category}.ts)`);
    else if (e.reel.from !== g.from || e.reel.to !== g.from + g.dur - 1) problems.push(`${g.name}: the catalogue says frames ${e.reel.from}-${e.reel.to}, its segment in ${rel} ${g.from}-${g.from + g.dur - 1}`);
  }
  for (const e of own) if (!segs.some((g) => g.name === e.name)) problems.push(`${e.name}: no segment in ${rel} (append { name: '${e.name}', from, dur, render })`);
  const names = segs.map((g) => g.name).filter((n) => own.some((e) => e.name === n));
  const order = own.map((e) => e.name).filter((n) => names.includes(n));
  if (names.join() !== order.join()) problems.push(`${film}: the catalogue's order (${order.join(', ')}) is not the reel's (${names.join(', ')})`);
  for (const e of entries.filter((x) => x.reel.shownIn)) {
    const host = segs.find((g) => g.name === e.reel.shownIn);
    if (!host) problems.push(`${e.name}: shownIn ${e.reel.shownIn}, which has no segment in ${rel}`);
    else if (e.reel.from < host.from || e.reel.to > host.from + host.dur - 1) problems.push(`${e.name}: its reel range ${e.reel.from}-${e.reel.to} is outside ${host.name}'s segment (${host.from}-${host.from + host.dur - 1})`);
  }
}

// ---- the docs
const md = (s) => String(s).replace(/\|/g, '\\|');
// the section a piece is described in: the first heading that names it (GitHub's anchor for that heading)
const anchor = (text, name) => {
  const h = text.split('\n').find((l) => /^#{2,4} /.test(l) && new RegExp(`\\b${name}\\b`).test(l));
  return h ? '#' + h.replace(/^#+ /, '').trim().toLowerCase().replace(/[^\w\- ]/g, '').replace(/\s+/g, '-') : null;
};
const piecesTable = (list, text) =>
  list.length
    ? [
        '| Piece | Does | About | Looks like | Reach for it for |',
        '|---|---|---|---|---|',
        ...list.map((e) => {
          const a = anchor(text, e.name);
          return `| ${a ? `[${e.name}](${a})` : e.name} | ${e.purpose.join(', ')} | ${e.frames} f | ${md(e.summary)} | ${md(e.use)} |`;
        }),
      ].join('\n')
    : '_No pieces yet: the first one adds its catalogue entry, and this table is written from it._';
const reelTable = (list) =>
  list.length
    ? [
        '| Piece | Reel | Frames | Strip of just this piece |',
        '|---|---|---|---|',
        ...list.map((e) => `| ${e.name}${e.reel.shownIn ? ` (in ${e.reel.shownIn})` : ''} | \`${e.reel.film}\` | ${e.reel.from}-${e.reel.to} | \`node scripts/frames.mjs library --strip ${e.name}\` |`),
      ].join('\n')
    : '_No reel segments yet._';
const block = (text, key, body, doc) => {
  const a = `<!-- library:${key} (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->`;
  const b = `<!-- /library:${key} -->`;
  const i = text.indexOf(a);
  const j = text.indexOf(b);
  if (i < 0 || j < i) {
    problems.push(`references/${doc}: the markers for the ${key} table are missing (${a} ... ${b})`);
    return text;
  }
  return text.slice(0, i + a.length) + '\n\n' + body + '\n\n' + text.slice(j);
};
const changed = [];
for (const [category, { doc }] of Object.entries(CATEGORIES)) {
  const file = path.join(refs, doc);
  if (!fs.existsSync(file)) {
    problems.push(`references/${doc} is missing`);
    continue;
  }
  const list = lib.filter((e) => e.category === category);
  const old = fs.readFileSync(file, 'utf8');
  let text = block(old, 'pieces', piecesTable(list, old), doc);
  text = block(text, 'reel', reelTable(list), doc);
  if (text !== old) {
    changed.push(doc);
    if (!check) fs.writeFileSync(file, text);
  }
}

if (check && changed.length) problems.push(`out of date (run node scripts/library-docs.mjs): ${changed.map((d) => `references/${d}`).join(', ')}`);
for (const p of problems) console.log(`${check ? 'FAIL' : 'NOTE'}  ${p}`);
if (!check) console.log(changed.length ? `rewrote ${changed.map((d) => `references/${d}`).join(', ')}` : 'the docs were up to date');
console.log(`${lib.length} catalogue entries, ${exported.size} pieces exported, ${reels.size} reels${problems.length ? `, ${problems.length} problem${problems.length === 1 ? '' : 's'}` : ', all consistent'}`);
process.exit(problems.length ? 1 : 0);
