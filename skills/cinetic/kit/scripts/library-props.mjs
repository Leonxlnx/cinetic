#!/usr/bin/env node
// library-props.mjs: check that every usage line in the library's docs matches the piece's real props.
//
//   node scripts/library-props.mjs            list every piece's props that a usage line gets wrong
//   node scripts/library-props.mjs --check    the same, exit 1 on a prop that does not exist (CI)
//   node scripts/library-props.mjs --props <Name>   print one piece's props (required first)
//
// It reads the props of each catalogued piece from the TypeScript types (src/kit/index.ts) and the `<Name ...>` tags
// in the tsx blocks of references/library-*.md. A prop a usage line names that the piece does not have is an error;
// a required prop a usage line leaves out is listed as a note (a line may be shortened with "...").
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, catalogDir, arrayOf } from './library-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = path.resolve(root, '..', 'references');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const args = process.argv.slice(2);

// the catalogue's names, by category
const dir = catalogDir(root);
if (!dir) {
  console.error('no catalogue under src/kit/library/catalog');
  process.exit(1);
}
const names = new Map();
for (const [category, c] of Object.entries(CATEGORIES)) {
  const file = path.join(dir, `${category}.ts`);
  if (!fs.existsSync(file)) continue;
  for (const e of arrayOf(fs.readFileSync(file, 'utf8'), file)) names.set(e.name, { category, doc: c.doc });
}

// each piece's props from the types
const cfgFile = path.join(root, 'tsconfig.json');
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgFile, ts.sys.readFile).config, ts.sys, root);
const entry = path.join(root, 'src', 'kit', 'index.ts');
const program = ts.createProgram([entry], { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();
const mod = checker.getSymbolAtLocation(program.getSourceFile(entry));
const props = new Map();
for (const exp of checker.getExportsOfModule(mod)) {
  if (!names.has(exp.name)) continue;
  const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
  const decl = sym.valueDeclaration ?? sym.declarations?.[0];
  if (!decl) continue;
  const sig = checker.getTypeOfSymbolAtLocation(sym, decl).getCallSignatures()[0];
  if (!sig) continue; // a preset or a value, not a component
  const p = sig.getParameters()[0];
  if (!p) {
    props.set(exp.name, new Map());
    continue;
  }
  const t = checker.getTypeOfSymbolAtLocation(p, decl);
  const m = new Map();
  for (const q of checker.getPropertiesOfType(checker.getApparentType(t))) m.set(q.name, !(q.flags & ts.SymbolFlags.Optional));
  props.set(exp.name, m);
}

if (args[0] === '--props') {
  const m = props.get(args[1]);
  if (!m) {
    console.error(`${args[1]}: not a component in the catalogue`);
    process.exit(1);
  }
  const req = [...m].filter(([, r]) => r).map(([n]) => n);
  const opt = [...m].filter(([, r]) => !r).map(([n]) => n);
  console.log(`${args[1]}\n  required  ${req.join(', ') || '(none)'}\n  optional  ${opt.join(', ') || '(none)'}`);
  process.exit(0);
}

// the attributes of one opening tag, starting after its name
const attrsOf = (s, i) => {
  const out = [];
  let spread = false;
  for (;;) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length || s[i] === '>' || (s[i] === '/' && s[i + 1] === '>')) break;
    if (s[i] === '{') {
      // {...rest}
      spread = true;
      i = skipBraces(s, i);
      continue;
    }
    if (s.startsWith('...', i)) {
      // a shortened line
      spread = true;
      i += 3;
      continue;
    }
    const m = /^[A-Za-z_][\w-]*/.exec(s.slice(i));
    if (!m) break;
    out.push(m[0]);
    i += m[0].length;
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s[i] !== '=') continue; // a bare flag
    i++;
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s[i] === '{') i = skipBraces(s, i);
    else if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      i++;
      while (i < s.length && s[i] !== q) i++;
      i++;
    } else break;
  }
  return { attrs: out, spread };
};
const skipBraces = (s, i) => {
  let d = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '{') d++;
    else if (c === '}') {
      d--;
      if (d === 0) return i + 1;
    }
  }
  return i;
};

if (!fs.existsSync(refs)) {
  console.log('no library docs beside this kit (a film project): use --props <Name>, or frames.mjs library --show <Name>');
  process.exit(0);
}
let errors = 0;
let notes = 0;
let lines = 0;
const shown = new Set();
for (const f of fs.readdirSync(refs).filter((n) => /^library(-\w+)?\.md$/.test(n)).sort()) {
  const src = fs.readFileSync(path.join(refs, f), 'utf8');
  const blocks = [...src.matchAll(/```(?:tsx|jsx|ts)\r?\n([\s\S]*?)```/g)];
  for (const b of blocks) {
    const code = b[1];
    for (const m of code.matchAll(/<([A-Z]\w*)(?=[\s/>])/g)) {
      const name = m[1];
      const have = props.get(name);
      if (!have) continue;
      lines++;
      shown.add(name);
      const { attrs, spread } = attrsOf(code, m.index + m[0].length);
      const at = src.slice(0, b.index + b[0].indexOf(code) + m.index).split('\n').length;
      const unknown = attrs.filter((a) => !have.has(a) && a !== 'key');
      const missing = spread ? [] : [...have].filter(([n, r]) => r && n !== 'children' && !attrs.includes(n)).map(([n]) => n);
      if (unknown.length) {
        errors++;
        console.log(`ERROR ${f}:${at} <${name}> has no prop ${unknown.map((u) => `\`${u}\``).join(', ')} (it has: ${[...have.keys()].join(', ')})`);
      }
      if (missing.length) {
        notes++;
        console.log(`note  ${f}:${at} <${name}> needs ${missing.map((u) => `\`${u}\``).join(', ')}, which the usage line leaves out`);
      }
    }
  }
}
const noLine = [...props.keys()].filter((n) => !shown.has(n));
if (noLine.length) console.log(`note  no usage line in the docs: ${noLine.join(', ')}`);
console.log(`${props.size} components, ${lines} usage lines read, ${errors} with a prop that does not exist, ${notes} leaving out a required prop`);
if (args.includes('--check') && errors) process.exit(1);
