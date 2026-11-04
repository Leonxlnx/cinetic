#!/usr/bin/env node
// render-key.cjs: the fingerprint render.sh keeps beside a bundle it built, so a rerun knows whether the source of
// the composition it renders changed since (then it rebuilds the bundle; the parts rendered from the old one go,
// or, with --redo A-B, only those that overlap the frames the edit changes).
//
//   node scripts/render-key.cjs --entry src/index.ts --comp Film [--manifest FILE] [<public dir or file>...]
//   node scripts/render-key.cjs <src dir> [<public dir or file>...]  (every file under the src dir, the 1.1 key)
//
// With --entry and --comp the key covers what that composition's frames can depend on: the entry, the file that
// registers the composition (Root.tsx), the closure of relative imports of its component and of every module the
// root uses outside other compositions' elements, and remotion.config.ts beside src/. A module the root imports only
// for other compositions (FilmSub and the sound plan it reads, the stills, the per-act solos' wrappers) is not in
// it, so editing src/sync.ts or a still keeps the Film's parts. Anything it cannot follow (a path alias, a glob
// import, require.context, a composition it cannot find) falls back to every file under the entry's folder.
// Content is hashed (path, size, bytes); public/ folders (which may hold large footage) by path and size.
// --manifest writes {key, mode, comp, component, files: {path: sha1}} so render.sh can name the files that changed.
// Prints one hex line. Exit 0, or 1 on a read error.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1).filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = { entry: null, comp: null, manifest: null, dirs: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--entry') opt.entry = args[++i];
  else if (a === '--comp') opt.comp = args[++i];
  else if (a === '--manifest') opt.manifest = args[++i];
  else opt.dirs.push(a);
}
const posix = (p) => p.split(path.sep).join('/');
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  if (!fs.statSync(dir).isDirectory()) return (out.push(dir), out); // a file given in the list (a top-level public/ file)
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

// ---- the import graph
const EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const resolveFrom = (from, spec) => {
  const base = path.resolve(path.dirname(from), spec);
  for (const e of EXT) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return base + e;
  for (const e of EXT.slice(1, 6)) if (fs.existsSync(path.join(base, 'index' + e))) return path.join(base, 'index' + e);
  return null;
};
class Unfollowable extends Error {}
/** The specifiers a module names: static imports and re-exports (type-only ones aside), import(), require(). */
const specifiers = (src) => {
  if (/\brequire\.context\s*\(|\bimport\.meta\.glob\s*\(/.test(src)) throw new Unfollowable('a glob import');
  const out = [];
  const re = /(?:^|[;\n}])\s*(import|export)\s+(type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (let m; (m = re.exec(src)); ) {
    if (m[2]) continue; // import type / export type: erased
    out.push(m[3] ?? m[4] ?? m[5]);
  }
  return out;
};
const isRelative = (s) => s.startsWith('./') || s.startsWith('../');
const isAlias = (s) => /^(@\/|~|#)/.test(s) || s.startsWith('/');
const closure = (start, seen = new Set()) => {
  const stack = [start];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(f)) continue;
    for (const s of specifiers(fs.readFileSync(f, 'utf8'))) {
      if (isAlias(s)) throw new Unfollowable(`the alias '${s}' in ${posix(path.relative(process.cwd(), f))}`);
      if (!isRelative(s)) continue; // a package
      const r = resolveFrom(f, s);
      if (!r) throw new Unfollowable(`'${s}' in ${posix(path.relative(process.cwd(), f))} does not resolve`);
      stack.push(r);
    }
  }
  return seen;
};

/** Named, default and namespace bindings of a module's imports: {identifier: specifier}. */
const importBindings = (src) => {
  const out = {};
  const re = /(?:^|[;\n])\s*import\s+(?!type\s)([\w$]+)?\s*,?\s*(?:\*\s+as\s+([\w$]+))?\s*(?:\{([^}]*)\})?\s*from\s+['"]([^'"]+)['"]/g;
  for (let m; (m = re.exec(src)); ) {
    const spec = m[4];
    if (m[1]) out[m[1]] = spec;
    if (m[2]) out[m[2]] = spec;
    for (const part of (m[3] ?? '').split(',')) {
      const p = part.trim().replace(/^type\s+/, '');
      if (!p || part.trim().startsWith('type ')) continue;
      const local = p.split(/\s+as\s+/).pop().trim();
      if (local) out[local] = spec;
    }
  }
  return out;
};
/** The [start, end) spans of every <Composition ...> / <Still ...> element and its id. */
const compositionSpans = (src) => {
  const spans = [];
  const re = /<(Composition|Still)\b/g;
  for (let m; (m = re.exec(src)); ) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (quote) {
        if (ch === quote && src[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (depth === 0 && ch === '>') break;
    }
    let end = i + 1;
    if (src[i - 1] !== '/') {
      const close = src.indexOf(`</${m[1]}>`, end);
      if (close >= 0) end = close + m[1].length + 3;
    }
    const text = src.slice(m.index, end);
    const id = /\bid=(?:"([^"]+)"|'([^']+)'|\{\s*['"]([^'"]+)['"]\s*\})/.exec(text);
    spans.push({ start: m.index, end, id: id ? id[1] ?? id[2] ?? id[3] : null, text });
  }
  return spans;
};

/** The files the composition's frames can depend on, or null when it cannot be followed (with the reason). */
const compositionFiles = (entry, comp) => {
  const all = closure(path.resolve(entry));
  const roots = [...all].filter((f) => /\.(tsx|jsx|ts|js)$/.test(f) && /<Composition\b/.test(fs.readFileSync(f, 'utf8')));
  for (const root of roots) {
    const src = fs.readFileSync(root, 'utf8');
    const spans = compositionSpans(src);
    const target = spans.find((s) => s.id === comp);
    if (!target) continue;
    const comp_ = /\bcomponent=\{\s*([\w$]+)\s*\}/.exec(target.text);
    const binds = importBindings(src);
    const files = new Set([path.resolve(entry), root]);
    // every module the root imports is in, unless all its bindings appear only inside other compositions' elements
    const body = src.replace(/(?:^|\n)\s*import\s[^;]*?from\s+['"][^'"]+['"];?/g, (s) => ' '.repeat(s.length));
    const used = {};
    for (const [name, spec] of Object.entries(binds)) {
      const re = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
      for (let m; (m = re.exec(body)); ) {
        const inOther = spans.some((s) => s !== target && m.index >= s.start && m.index < s.end);
        if (!inOther) used[spec] = true;
      }
    }
    const component = comp_ ? binds[comp_[1]] ?? null : null;
    for (const spec of Object.keys(used)) {
      if (!isRelative(spec)) continue;
      const r = resolveFrom(root, spec);
      if (!r) throw new Unfollowable(`'${spec}' in ${posix(path.relative(process.cwd(), root))} does not resolve`);
      closure(r, files);
    }
    return { files, root, component };
  }
  throw new Unfollowable(`no <Composition id="${comp}"> found from ${entry}`);
};

try {
  let files;
  let mode;
  let info = {};
  let shallow = opt.dirs;
  if (opt.entry && opt.comp) {
    try {
      const r = compositionFiles(opt.entry, opt.comp);
      files = [...r.files];
      mode = 'composition';
      info = { root: posix(path.relative(process.cwd(), r.root)), component: r.component };
    } catch (e) {
      if (!(e instanceof Unfollowable)) throw e;
      files = walk(path.dirname(path.resolve(opt.entry)));
      mode = 'all';
      info = { fallback: e.message };
    }
    const cfg = path.resolve(path.dirname(path.resolve(opt.entry)), '..', 'remotion.config.ts');
    if (fs.existsSync(cfg)) files.push(cfg);
  } else {
    const [deep, ...rest] = opt.dirs;
    if (!deep) {
      console.error('usage: node render-key.cjs --entry src/index.ts --comp Film [--manifest FILE] [<public dir>...]  |  node render-key.cjs <src dir> [<public dir>...]');
      process.exit(1);
    }
    files = walk(deep);
    shallow = rest;
    mode = 'all';
  }
  const rel = (p) => posix(path.relative(process.cwd(), p));
  const h = crypto.createHash('sha1');
  const map = {};
  for (const f of [...new Set(files)].sort((a, b) => (rel(a) < rel(b) ? -1 : 1))) {
    const buf = fs.readFileSync(f);
    h.update(`${rel(f)}:${buf.length}\n`);
    h.update(buf);
    map[rel(f)] = sha(buf);
  }
  for (const d of shallow)
    for (const f of walk(d)) {
      const st = fs.statSync(f);
      h.update(`${rel(f)}:${st.size}\n`);
      map[rel(f)] = `size:${st.size}`;
    }
  const key = h.digest('hex');
  if (opt.manifest) fs.writeFileSync(opt.manifest, JSON.stringify({ key, mode, comp: opt.comp, ...info, files: map }, null, 1) + '\n');
  console.log(key);
} catch (e) {
  console.error(`render-key: ${e.message}`);
  process.exit(1);
}
