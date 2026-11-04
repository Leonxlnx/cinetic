#!/usr/bin/env node
/**
 * precheck.mjs: the 30-second check before any render. A still or a render costs minutes; this catches in seconds
 * what would crash it or put the wrong content on screen.
 *
 *   1. imports   every act (src/acts/*), the timeline and the film's content modules (src/*.ts) are imported with tsx,
 *                one process, so a module-load assert or a bad import shows here, not 4 minutes into a render
 *   2. timing    the module-load timing asserts (lib/continuity timingFail: landBeforeCut, a line read past its act's
 *                cut): warnings in dev, errors under the ship gate (--ship sets CINETIC_GATE=ship, so they throw); a
 *                bare `throw` in a timing assert is an error either way (it crashes every render: route it through
 *                timingFail)
 *   frames       every act of src/timeline.ts ACT is rendered (react-dom/server, the film's own Film.tsx inside
 *                Remotion's contexts) at its first, middle and last frame (--frames N: N frames an act, spread evenly),
 *                in the same process: any error a render would throw there (a TypeError on data the film never gave,
 *                an empty kit part under --ship) fails with the act, the frames and the file:line. Text measurement
 *                gets a stand-in (a film module that reaches for the DOM sees a measuring document and takes its
 *                browser path) and FontGate lets the frame through; an act that needs a real browser (window, a canvas
 *                read) is a warning, not an error. Kit parts that drew an empty state in those frames are warnings in
 *                dev. --no-frames skips it.
 *   3. kit       kit parts with no content of the film's own (they draw an empty state, data-kit-empty): a kit part
 *                used without its content prop (DenseScreen without world, a panel without data, a StatCard without
 *                label and value, a FileThumb without name, a kit Photo without src, KitFallback), the retired
 *                sampleWorld() and any sample() call in the film's source (kit-sample), through a named or a namespace
 *                import (import * as K from '../kit': K.sample(), <K.ProjectPanel>), and the parts that reported
 *                kit-empty (or a sample() call, kit-sample) while the modules loaded
 *   case         with a SPINE_PLAN, every string an act lists as what it shows (its `strings`) is the film's own on-screen word:
 *                a string of a content module or a COPY entry. A word of the case (the request, its names, its numbers) that
 *                no scene carries is an error (case); any other listed string, a warning (case-strings)
 *   cast         a person's name set beside CONTENT.people[k].photo is that person's first name in src/content.ts (an error:
 *                "Mei" on Arjun's face), a role ("You") excepted; one face standing for two named people warns
 *   4. fit       every on-screen string measured with the film's own font (its woff2's advance widths, tracking and
 *                weight): each COPY line at its type role (line, display for the name, ui) against the safe width (in a
 *                film whose acts size lines to the width with fitSize: the size it gets, a warning under 75 % of its
 *                role and an error under half);
 *                each string of the content modules at the kit's label size (TYPE.ui) against half the safe width (a
 *                card's text column; a warning) and the whole safe width (an error); "..." or "…" in a string (a
 *                truncated title) is an error. The measure leaves out kerning and the display optical size, so it
 *                reads a little wide: a string within 6 % over its box is a warning (fit-edge), not an error.
 *
 * Progress goes to stderr as it runs: each step, the first module tsx imports and every slow one, and a line every 15 s
 * while one is slow (a loaded machine may take minutes on the first import); --quiet leaves it out. The report stays on
 * stdout.
 *
 * Usage (from the film project):  node scripts/precheck.mjs [<film dir>] [--ship] [--json] [--no-import] [--no-frames] [--frames N] [--no-fit] [--quiet]
 *   --ship        the ship gate: timing asserts and empty kit parts throw at import (CINETIC_GATE=ship)
 *   --json        machine-readable findings
 *   --no-import   only the static checks (kit usage in the source; no frames either)
 *   --no-frames   import the modules but render no act
 *   --frames N    frames rendered per act, spread from its first to its last (default 3: first, middle, last)
 *   --no-fit      skip the text measure
 *   --font FILE   measure with this .woff2 (default: the film's FONT.text face in src/brand/fonts, public/fonts (the dealt pairings) or node_modules)
 * Exit codes: 0 no errors, 1 errors (or, with --ship, warnings that the gate fails), 2 bad arguments or no project.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
  const src = fs.readFileSync(new URL(import.meta.url), 'utf8');
  console.log(src.slice(src.indexOf('/**') + 3, src.indexOf('*/')).replace(/^ \* ?/gm, '').trim());
  process.exit(0);
}
const flag = (k) => argv.includes(k);
const opt = (k) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SHIP = flag('--ship');
const QUIET = flag('--quiet');
/** A progress line on stderr (the report stays on stdout, so --json still parses). */
const progress = (msg) => {
  if (!QUIET) process.stderr.write(`precheck: ${msg}
`);
};
const JSON_OUT = flag('--json');
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--font' && argv[i - 1] !== '--frames');
const PER_ACT = opt('--frames') !== undefined ? Math.max(1, Math.min(60, Math.round(Number(opt('--frames'))) || 3)) : 3;
const ROOT = path.resolve(positional[0] ?? '.');
const SRC = path.join(ROOT, 'src');
if (!fs.existsSync(SRC)) {
  console.error(`precheck: no src/ in ${ROOT} (run it from the film project, or give its folder)`);
  process.exit(2);
}
const t0 = Date.now();
const since = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;
const findings = [];
const add = (rule, severity, message, where = '') => findings.push({ rule, severity, message, where });
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ------------------------------------------------------------------------------------------------ the files
const walk = (dir, skip) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!skip.has(e.name)) out.push(...walk(p, skip));
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
};
const HOUSE = new Set(['kit', 'lib', 'fx', 'brand', 'node_modules', 'test', 'tests', 'sandbox']);
const filmFiles = walk(SRC, HOUSE); // the film's own source: acts, the timeline, content modules
const acts = filmFiles.filter((p) => rel(p).startsWith('src/acts/'));
// not content: the entry points, the timeline (its COPY is measured on its own), sound and the dealt direction's notes
const NOT_CONTENT = new Set(['index.ts', 'Root.tsx', 'timeline.ts', 'blur.ts', 'sync.ts', 'music.ts', 'logos.ts', 'deal.ts']);
const top = filmFiles.filter((p) => path.dirname(p) === SRC);
const contentMods = top.filter((p) => p.endsWith('.ts') && !NOT_CONTENT.has(path.basename(p)));
const importList = [
  ...(fs.existsSync(path.join(SRC, 'timeline.ts')) ? [{ path: path.join(SRC, 'timeline.ts'), content: false }] : []),
  ...contentMods.map((p) => ({ path: p, content: true })),
  ...acts.map((p) => ({ path: p, content: false })),
];

// ------------------------------------------------------------------------------------------------ 3. kit usage (static)
/** What each kit part needs from the film: one entry per required prop, alternatives with |. */
const KIT_NEEDS = {
  DenseScreen: ['world'],
  AppWindow: ['world'],
  ProjectPanel: ['data'],
  ChatCard: ['data'],
  FeedCard: ['data'],
  ApprovalsCard: ['data'],
  BudgetCard: ['data'],
  CategoryRows: ['data'],
  ChartCard: ['data'],
  RingCard: ['data'],
  AmountToast: ['data'],
  ReportCover: ['data'],
  StatCard: ['label', 'value|count'],
  FileThumb: ['name'],
  Photo: ['src|vessels|standIn'],
  Tile: ['src|file'],
  KitFallback: ['(never: give the card its own UI or picture)'],
  ContentWall: ['nodes'],
  ContentRing: ['nodes'],
  ContentTicker: ['nodes'],
};
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
/** The attribute names of a JSX opening tag starting after `<Name` at `i` (spreads as '...'). */
const attrsAt = (s, i) => {
  const names = [];
  let depth = 0;
  let q = null;
  let tok = '';
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = null;
      continue;
    }
    if (depth > 0) {
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '"' || c === "'" || c === '`') q = c;
      continue;
    }
    if (c === '{') {
      if (s.slice(i + 1).trimStart().startsWith('...')) names.push('...');
      depth++;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      continue;
    }
    if (c === '>' || (c === '/' && s[i + 1] === '>')) break;
    if (/[\w-]/.test(c)) tok += c;
    else {
      if (tok && /^[A-Za-z]/.test(tok)) names.push(tok);
      tok = '';
    }
  }
  if (tok) names.push(tok);
  return names;
};
for (const file of filmFiles) {
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  const local = new Map(); // local name -> kit export
  for (const m of code.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]((?:\.\.?\/)+(?:src\/)?kit(?:\/[\w-]+)?)['"]/g)) {
    for (const part of m[1].split(',')) {
      const [a, b] = part.replace(/\btype\s+/, '').trim().split(/\s+as\s+/);
      if (a) local.set((b ?? a).trim(), a.trim());
    }
  }
  // a namespace import (import * as K from '../kit'): K.sample(), K.sampleWorld(), <K.DenseScreen /> are the same parts
  for (const m of code.matchAll(/import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]((?:\.\.?\/)+(?:src\/)?kit(?:\/[\w-]+)?)['"]/g))
    for (const kit of ['sample', 'sampleWorld', 'REVIEW', 'BUDGETS', 'SAMPLE', ...Object.keys(KIT_NEEDS)]) local.set(`${m[1]}.${kit}`, kit);
  if (!local.size) continue;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [name, kit] of local) {
    if (kit === 'sampleWorld')
      for (const m of code.matchAll(new RegExp(`\\b${esc(name)}\\s*\\(`, 'g')))
        add('kit-sample', 'error', `${name}() is retired: it returns an empty world (every part fed by it draws its empty state). Build the film's own world with filmWorld({ records, people, statuses }) from the product's strings`, `${rel(file)}:${lineOf(code, m.index)}`);
    if (kit === 'sample')
      for (const m of code.matchAll(new RegExp(`\\b${esc(name)}\\s*\\(`, 'g')))
        add('kit-sample', 'error', "sample() is the kit's gallery and tests only: a film shows its own content", `${rel(file)}:${lineOf(code, m.index)}`);
    if (['REVIEW', 'BUDGETS', 'SAMPLE'].includes(kit) && (!name.includes('.') || new RegExp(`\\b${esc(name)}\\b`).test(code))) add('kit-sample', 'error', `${kit} is sample content (no longer exported): pass the product's own data`, rel(file));
    const needs = KIT_NEEDS[kit];
    if (!needs || !file.endsWith('.tsx')) continue;
    for (const m of code.matchAll(new RegExp(`<${esc(name)}(?=[\\s/>])`, 'g'))) {
      const attrs = attrsAt(code, m.index + name.length + 1);
      const where = `${rel(file)}:${lineOf(code, m.index)}`;
      if (kit === 'KitFallback') {
        add('kit-empty', 'error', 'KitFallback draws an empty state: give the card the product\'s own UI (a kit panel with the film\'s data, a DenseScreen with filmWorld) or a real picture', where);
        continue;
      }
      if (kit === 'Photo' && attrs.includes('photo')) continue; // fx/Photo (a picture plate), not the kit's
      if (attrs.includes('...')) continue; // spread props: cannot tell
      const missing = needs.filter((n) => !n.split('|').some((x) => attrs.includes(x)));
      if (missing.length) add('kit-empty', 'error', `<${name}> without ${missing.join(', ')}: it draws an empty state (data-kit-empty), never sample content; pass the film's own`, where);
    }
  }
}

// ------------------------------------------------------------------------------------------------ 3b. the cast (static)
// A face carries one name: a person's name set beside CONTENT.people[k].photo is that person's first name (never "Mei" on
// the face src/content.ts gives to Arjun), and one face never stands for two named people in one film.
{
  const contentTs = path.join(SRC, 'content.ts');
  const people = [];
  if (fs.existsSync(contentTs)) {
    const ct = fs.readFileSync(contentTs, 'utf8');
    const at = ct.search(/["']?people["']?\s*:\s*\[/);
    if (at >= 0) {
      let depth = 0, end = ct.length;
      for (let i = ct.indexOf('[', at); i < ct.length; i++) {
        if (ct[i] === '[') depth++;
        else if (ct[i] === ']' && --depth === 0) { end = i; break; }
      }
      for (const m of ct.slice(at, end).matchAll(/["']?name["']?\s*:\s*["']([^"']+)["']/g)) people.push(m[1]);
    }
  }
  const ROLE = new Set(['You', 'Me', 'Us', 'Team', 'Everyone', 'Guest', 'Admin', 'Owner', 'Host', 'Support', 'Bot']); // a role, not a name
  const personLike = (s) => /^[A-Z][a-z]+(?: [A-Z][a-z]*\.?)?$/.test(s.trim()) && !ROLE.has(s.trim().split(/\s+/)[0]);
  const faces = new Map(); // k -> Map(label -> where)
  if (people.length) {
    for (const f of filmFiles) {
      if (path.resolve(f) === path.resolve(contentTs)) continue;
      const src = stripComments(fs.readFileSync(f, 'utf8'));
      const pat = /\{([^{}]*?)\bCONTENT\.people\[(\d+)\]\.photo([^{}]*?)\}/g;
      for (const m of src.matchAll(pat)) {
        const k = Number(m[2]);
        const body = m[1] + m[3];
        const lm = body.match(/\b(?:label|name|who|author|by|first)\s*:\s*['"]([^'"]+)['"]/);
        if (!lm || !personLike(lm[1]) || k >= people.length) continue;
        const label = lm[1].trim();
        const where = `${rel(f)}:${lineOf(src, m.index)}`;
        const first = people[k].split(/\s+/)[0];
        if (label.split(/\s+/)[0] !== first)
          add('cast-name', 'error', `"${label}" is set on the face of ${people[k]} (CONTENT.people[${k}]): a face carries its own name; use the person whose first name is ${label.split(/\s+/)[0]}, or name this one ${first}`, where);
        if (!faces.has(k)) faces.set(k, new Map());
        faces.get(k).set(label, where);
      }
    }
    for (const [k, labels] of faces) {
      if (labels.size > 1)
        add('cast-face', 'warn', `the face of ${people[k]} (CONTENT.people[${k}]) stands for ${[...labels.keys()].map((x) => `"${x}"`).join(' and ')}: one face, one person; give each their own (a varied cast)`, [...labels.values()][0]);
    }
  }
}

// ------------------------------------------------------------------------------------------------ 1-2. imports with tsx
const findUp = (start, sub) => {
  for (let d = start; ; d = path.dirname(d)) {
    const p = path.join(d, sub);
    if (fs.existsSync(p)) return p;
    if (path.dirname(d) === d) return null;
  }
};
let probe = null;
if (!flag('--no-import') && importList.length) {
  const tsx = findUp(ROOT, path.join('node_modules', 'tsx', 'dist', 'cli.mjs')) ?? findUp(path.dirname(fileURLToPath(import.meta.url)), path.join('assets', 'remotion-starter', 'node_modules', 'tsx', 'dist', 'cli.mjs'));
  if (!tsx) add('imports', 'error', 'tsx not found (npm install in the film project): the acts were not imported');
  else {
    const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-precheck-'));
    try {
      // non-code imports (css, fonts, pictures, sounds) load as empty modules: Node cannot import them, the bundler can
      const hooks = path.join(TMP, 'hooks.mjs');
      fs.writeFileSync(hooks, `export async function load(url, ctx, next) {
  if (/\\.(css|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|mp4|webm|mov|wav|mp3|m4a|json5)(\\?.*)?$/i.test(url)) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return next(url, ctx);
}\n`);
      const reg = path.join(TMP, 'register.mjs');
      // tsx runs a .tsx act of a package without "type": "module" as CommonJS, where an import is a require that the ESM
      // load hook never sees: the same extensions get an empty CommonJS module too
      const STUB = ['.css', '.woff', '.woff2', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov', '.wav', '.mp3', '.m4a', '.json5'];
      fs.writeFileSync(reg, `import Module, { register } from 'node:module';\nregister(${JSON.stringify(pathToFileURL(hooks).href)});\nfor (const ext of ${JSON.stringify(STUB)}) Module._extensions[ext] = (m) => { m.exports = { __esModule: true, default: '' }; };\n`);
      const child = path.join(TMP, 'probe.mts');
      // frames: the film's own Film.tsx rendered at every act's first, middle and last frame, after the imports
      const filmTsx = path.join(SRC, 'Film.tsx');
      const FRAMES = !flag('--no-frames') && fs.existsSync(filmTsx) && fs.existsSync(path.join(SRC, 'timeline.ts'))
        ? { src: SRC, filmPath: filmTsx, film: pathToFileURL(filmTsx).href, timeline: pathToFileURL(path.join(SRC, 'timeline.ts')).href, fontGate: path.join(SRC, 'lib', 'FontGate.tsx'), per: PER_ACT }
        : null;
      fs.writeFileSync(child, `
import Module, { createRequire } from 'node:module';
import fs from 'node:fs';
const M: any = Module;
// a CommonJS module's non-code imports (css, fonts, pictures, sounds) load as empty modules here (cheap); the ESM hook of
// the second run covers ES modules
for (const ext of ${JSON.stringify(STUB)}) M._extensions[ext] = (m: any) => { m.exports = { __esModule: true, default: '' }; };
const FRAMES: any = ${JSON.stringify(FRAMES)};
const SRC_DIR = FRAMES ? String(FRAMES.src).toLowerCase() : '';
const inSrc = (f: unknown) => typeof f === 'string' && !!SRC_DIR && f.toLowerCase().startsWith(SRC_DIR) && !/[\\\\/]node_modules[\\\\/]/.test(f);
/** A document stand-in for rendering outside a browser: text widths from a per-letter estimate, a 2D context that measures and no-ops. */
const makeDom = () => {
  const em = (ch: string) => (ch === ' ' ? 0.28 : /[iljtfrI.,:;'!|]/.test(ch) ? 0.3 : /[mwMW@%]/.test(ch) ? 0.86 : /[A-Z0-9#$&]/.test(ch) ? 0.66 : 0.55);
  const width = (text: unknown, px: number, track = 0) => {
    let u = 0;
    let n = 0;
    for (const ch of String(text ?? '')) { u += em(ch); n++; }
    return (u + track * n) * px;
  };
  const num = (v: unknown, d: number) => { const x = parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : d; };
  const ctx2d = () => {
    const base: any = {
      font: '16px sans-serif',
      measureText(text: string) {
        const px = num((/([\\d.]+)px/.exec(String(base.font)) ?? [])[1], 16);
        const w = width(text, px);
        return { width: w, actualBoundingBoxAscent: px * 0.73, actualBoundingBoxDescent: /[gjpqy,]/.test(String(text)) ? px * 0.21 : 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: w, fontBoundingBoxAscent: px * 0.97, fontBoundingBoxDescent: px * 0.24 };
      },
      createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, Math.round(w) * Math.round(h) * 4)) }),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, Math.round(w) * Math.round(h) * 4)) }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({}),
    };
    return new Proxy(base, { get: (t: any, k: any) => (k in t ? t[k] : () => undefined) });
  };
  const el = (tag: string): any => {
    const style: any = {};
    const node: any = {
      tagName: String(tag).toUpperCase(), style, textContent: '', width: 300, height: 150, children: [],
      appendChild: (c: any) => c, removeChild: (c: any) => c, setAttribute() {}, getAttribute: () => null, addEventListener() {}, removeEventListener() {},
      getBoundingClientRect() {
        const px = num(style.fontSize, 16);
        const ls = String(style.letterSpacing ?? '');
        const w = width(node.textContent, px, /em$/.test(ls) ? num(ls, 0) : num(ls, 0) / px);
        const h = px * num(style.lineHeight, 1.2);
        return { x: 0, y: 0, left: 0, top: 0, width: w, height: h, right: w, bottom: h };
      },
      getContext: () => ctx2d(),
      toDataURL: () => 'data:image/png;base64,',
    };
    return node;
  };
  return { createElement: el, createElementNS: (_ns: string, tag: string) => el(tag), body: el('body'), head: el('head'), documentElement: el('html'), fonts: { check: () => true, load: async () => [], ready: Promise.resolve(), add() {} }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
};
if (FRAMES) {
  // a film module that reaches for the DOM (text measured with a span or a canvas, a plate baked to a data URL) sees the
  // stand-in, so it takes its browser path as in a render; node_modules (Remotion) still see no document and keep their
  // server paths
  const compile0 = M.prototype._compile;
  M.prototype._compile = function (code: string, filename: string) {
    if (inSrc(filename) && /\\bdocument\\b/.test(code)) {
      const head = /^\\s*(['"])use strict\\1;?/.exec(code);
      const at = head ? head[0].length : 0;
      code = code.slice(0, at) + 'var document = globalThis.__cineticPrecheckDom;' + code.slice(at);
    }
    return compile0.call(this, code, filename);
  };
  (globalThis as any).__cineticPrecheckDom = makeDom();
  // FontGate holds every frame until the fonts load in an effect, and effects never run here: it lets the frame through
  if (fs.existsSync(FRAMES.fontGate)) {
    const m = new M.Module(FRAMES.fontGate);
    m.filename = FRAMES.fontGate;
    m.loaded = true;
    m.exports = { FontGate: ({ children }: any) => children };
    M._cache[FRAMES.fontGate] = m;
  }
}
const mods: { path: string; content: boolean }[] = ${JSON.stringify(importList.map((m) => ({ path: pathToFileURL(m.path).href, rel: rel(m.path), content: m.content })))};
const SKIP = new Set(['src', 'photo', 'photos', 'file', 'files', 'logo', 'logos', 'glyph', 'kind', 'url', 'href', 'id', 'seed', 'ease', 'layout', 'world', 'preview', 'tone', 'source', 'ground', 'recipe', 'font', 'family', 'look', 'path', 'audio', 'music', 'track', 'template', 'engine', 'mode', 'role', 'theme', 'stage', 'transition', 'move', 'anchor', 'side', 'variant', 'fit', 'easing']);
const strings: { where: string; text: string }[] = [];
const visit = (v: unknown, where: string, depth: number, key: string) => {
  if (depth > 7 || SKIP.has(key)) return;
  if (typeof v === 'string') {
    const t = v.trim();
    if (/[A-Za-z]/.test(t) && !/^[a-z0-9]+([-_./][a-z0-9]+)+$/.test(t) && !/^(https?:|#[0-9a-f]{3,8}$|\\.?\\.?\\/)/i.test(t) && !/^[a-z][a-zA-Z0-9]*$/.test(t)) strings.push({ where, text: v });
    return;
  }
  if (Array.isArray(v)) v.forEach((x, i) => visit(x, where + '[' + i + ']', depth + 1, key));
  else if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) for (const [k, x] of Object.entries(v)) visit(x, where + '.' + k, depth + 1, k);
};
const out: any = { imports: [], strings, copy: null, size: null, tokens: null };
for (const m of mods as any[]) {
  const t = Date.now();
  process.stderr.write('@@P@@ start ' + m.rel + '\\n');
  try {
    const ns: any = await import(m.path);
    out.imports.push({ file: m.rel, ok: true, ms: Date.now() - t });
    process.stderr.write('@@P@@ done ' + m.rel + ' ' + (Date.now() - t) + '\\n');
    if (m.content) for (const [k, v] of Object.entries(ns)) visit(v, m.rel + ':' + k, 0, k);
    if (m.rel === 'src/timeline.ts') {
      out.copy = (ns.COPY ?? []).map((c: any) => ({ id: c.id, text: c.text, kind: c.kind ?? 'copy' }));
      out.size = { w: ns.W, h: ns.H };
      const sp: any = ns.SPINE_PLAN;
      if (sp && typeof sp === 'object') out.spine = { case: sp.case ?? null, acts: (Array.isArray(sp.acts) ? sp.acts : []).map((a: any, i: number) => ({ i, verb: String(a?.verb ?? ''), strings: Array.isArray(a?.strings) ? a.strings.map(String) : Array.isArray(a?.ui) ? a.ui.map(String) : [] })) };
    }
  } catch (e: any) {
    out.imports.push({ file: m.rel, ok: false, ms: Date.now() - t, error: String(e?.message ?? e).split('\\n').slice(0, 3).join(' | ') });
  }
}
try {
  const tk: any = await import(${JSON.stringify(pathToFileURL(path.join(SRC, 'brand', 'tokens.ts')).href)});
  out.tokens = { font: tk.FONT?.text, type: tk.TYPE, safe: tk.SAFE, textMin: tk.TEXT_MIN };
} catch (e: any) { out.tokensError = String(e?.message ?? e).split('\\n')[0]; }
const g: any = globalThis;
out.issues = [...(g.__cineticGateIssues ?? [])];
out.empties = [...(g.__cineticKitEmpty ?? [])];
if (FRAMES) {
  const fr: any = { acts: 0, evaluated: 0, blank: 0, errors: [], fps: 30 };
  out.frames = fr;
  const t0 = Date.now();
  const nameOf = (e: any) => (e && typeof e.name === 'string' && e.name) || 'Error';
  let stage = 'import';
  try {
    const tl: any = await import(FRAMES.timeline);
    const fm: any = await import(FRAMES.film);
    stage = 'setup';
    const req = createRequire(FRAMES.filmPath);
    const React: any = req('react');
    const { renderToStaticMarkup } = req('react-dom/server');
    const I: any = req('remotion').Internals;
    const Film = fm.Film ?? fm.default;
    const acts = Object.entries((tl.ACT ?? {}) as Record<string, any>).filter(([, a]) => a && Number.isFinite(a.from) && a.dur > 0);
    if (typeof Film !== 'function') fr.skip = 'src/Film.tsx exports no Film component';
    else if (!acts.length) fr.skip = 'src/timeline.ts exports no ACT';
    else {
      stage = 'render';
      const total = Math.max(Number(tl.TOTAL) || 0, ...acts.map(([, a]) => a.from + a.dur));
      const fps = Number(tl.FPS) || 30;
      const W = Number(tl.W) || 1920;
      const H = Number(tl.H) || 1080;
      fr.fps = fps;
      const comp = { component: Film, durationInFrames: total, width: W, height: H, fps, id: 'Film', order: null, folderName: null, parentFolderName: null, schema: null, calculateMetadata: null, stack: null, defaultProps: {} };
      const cm = { compositions: [comp], folders: [], currentAssetMetadata: null, currentCompositionMetadata: { defaultCodec: null, defaultOutName: null, defaultPixelFormat: null, defaultProResProfile: null, defaultSampleRate: null, defaultVideoImageFormat: null, durationInFrames: total, fps, width: W, height: H, props: {} }, canvasContent: { type: 'composition', compositionId: 'Film' } };
      const env = { isPlayer: false, isRendering: true, isStudio: false, isClientSideRendering: false, isReadOnlyStudio: false };
      const rate = { playbackRate: 1, setPlaybackRate: () => {} };
      const h = React.createElement;
      const at = (f: number) => {
        const t = { frame: { Film: f }, isPlaying: () => false, isInsideFreeze: false, audioAndVideoTags: { current: [] } };
        return h(I.RemotionEnvironmentContext.Provider, { value: env }, h(I.CanUseRemotionHooksProvider, null, h(I.AbsoluteTimeContext.Provider, { value: t }, h(I.PlaybackRateContext.Provider, { value: rate }, h(I.TimelineContext.Provider, { value: t }, h(I.CompositionManager.Provider, { value: cm }, h(Film, {})))))));
      };
      const plan = acts.map(([name, a]) => {
        const n = Math.min(FRAMES.per, a.dur);
        return [name, [...new Set(Array.from({ length: n }, (_, i) => a.from + (n === 1 ? 0 : Math.round(((a.dur - 1) * i) / (n - 1)))))].filter((f) => f < total)] as [string, number[]];
      });
      process.stderr.write('@@P@@ note frames ' + plan.reduce((s, [, l]) => s + l.length, 0) + ' ' + plan.length + '\\n');
      // React's dev notes and Remotion's server notes stay out of the report (an empty kit part is read from its record)
      const quiet = { error: console.error, warn: console.warn };
      console.error = () => {};
      console.warn = () => {};
      try {
        for (const [name, list] of plan) {
          fr.acts++;
          for (const f of list) {
            process.stderr.write('@@P@@ start f' + f + ':' + name + '\\n');
            fr.evaluated++;
            try {
              if (!renderToStaticMarkup(at(f))) fr.blank++;
            } catch (e: any) {
              const hit = String(e?.stack ?? '').split('\\n').map((s) => /\\(?([A-Za-z]:[\\\\/][^()]*?|\\/[^()]*?):(\\d+):\\d+\\)?\\s*$/.exec(s)).find((x) => x && inSrc(x[1]));
              fr.errors.push({ act: name, f, name: nameOf(e), message: String(e?.message ?? e).split('\\n')[0].slice(0, 300), file: hit ? hit[1] : '', line: hit ? Number(hit[2]) : 0 });
            }
          }
        }
      } finally {
        console.error = quiet.error;
        console.warn = quiet.warn;
      }
    }
  } catch (e: any) {
    fr.fail = { stage, message: nameOf(e) + ': ' + String(e?.message ?? e).split('\\n').slice(0, 2).join(' | ') };
  }
  fr.ms = Date.now() - t0;
  fr.issues = (g.__cineticGateIssues ?? []).slice(out.issues.length);
  fr.empties = (g.__cineticKitEmpty ?? []).slice(out.empties.length);
}
process.stdout.write('\\n@@PRECHECK@@' + JSON.stringify(out) + '\\n');
`);
      const env = { ...process.env, ...(SHIP ? { CINETIC_GATE: 'ship' } : {}) };
      if (!SHIP) delete env.CINETIC_GATE;
      // plain tsx first: a loader hook runs every module through an extra thread (5x slower); only a film whose acts import
      // css, fonts or media needs the stub hook, and gets a second run with it
      // the probe runs as a child with its progress streamed: each module as it starts and lands, a line every 15 s while
      // one is slow (tsx compiles the first imports cold: 30 s on a quiet machine, minutes on a loaded one)
      const run = (args) =>
        new Promise((resolve) => {
          const p = spawn(process.execPath, args, { cwd: ROOT, env });
          let stdout = '', stderr = '', at = null, n = 0, err = null, buf = '';
          const beat = setInterval(() => progress(`  ... still ${/^f\d+:/.test(at ?? '') ? 'rendering' : 'importing'} (${since()}${at ? `, at ${at}` : ', starting tsx'})`), 15000);
          const kill = setTimeout(() => {
            err = new Error('timed out after 300 s');
            p.kill();
          }, 300000);
          p.stdout.on('data', (d) => (stdout += d));
          p.stderr.on('data', (d) => {
            buf += d;
            let k;
            while ((k = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, k).replace(/\r$/, '');
              buf = buf.slice(k + 1);
              const m = /^@@P@@ (start|done|note) (\S+)(?: (\d+))?(?: (\d+))?/.exec(line);
              if (!m) stderr += `${line}\n`;
              else if (m[1] === 'start') at = m[2];
              else if (m[1] === 'note') progress(`  rendering every act at ${PER_ACT === 3 ? 'its first, middle and last frame' : `${PER_ACT} frames`} (${m[3]} frames of ${m[4]} acts, ${since()})...`);
              else if (++n === 1 || Number(m[3]) >= 2000) progress(`  imported ${m[2]} (${(Number(m[3]) / 1000).toFixed(1)} s; ${n} of ${importList.length})`);
            }
          });
          p.on('error', (e) => (err = e));
          p.on('close', (status) => {
            clearInterval(beat);
            clearTimeout(kill);
            resolve({ stdout, stderr: stderr + buf, status, error: err });
          });
        });
      const once = async (hooked) => {
        const r = await run([tsx, ...(hooked ? ['--import', pathToFileURL(reg).href] : []), child]);
        const at = (r.stdout ?? '').lastIndexOf('@@PRECHECK@@');
        if (at < 0) return { fail: `the import probe did not finish: ${((r.stderr || r.stdout || '') + (r.error ? ` ${r.error.message}` : '')).trim().split('\n').slice(-6).join(' | ')}` };
        return { probe: JSON.parse(r.stdout.slice(at + 12).trim().split('\n')[0]) };
      };
      progress(`1-2/4 importing ${importList.length} modules with tsx (the acts, the timeline, the content)...`);
      let res = await once(false);
      const MEDIA = /Unknown file extension|ERR_UNKNOWN_FILE_EXTENSION|Cannot parse|unexpected token|Unexpected character/i;
      if (res.probe?.imports.some((x) => !x.ok && MEDIA.test(x.error)) || MEDIA.test(res.probe?.frames?.fail?.message ?? '')) {
        progress('  again with stubs for css, fonts and media (an act imports one)...');
        res = await once(true);
      }
      progress(`  imports done (${since()})`);
      if (res.fail) add('imports', 'error', res.fail);
      else probe = res.probe;
    } finally {
      fs.rmSync(TMP, { recursive: true, force: true });
    }
  }
}
const TIMING = /landBeforeCut|timingFail|after its act's cut|f to clear|act's cut|is read until|lands on f|cut or unmount|start it \d+ f earlier/i;
if (probe) {
  for (const im of probe.imports.filter((x) => !x.ok)) {
    if (/kit-(empty|sample):/.test(im.error)) add(/kit-sample:/.test(im.error) ? 'kit-sample' : 'kit-empty', 'error', `${im.file} throws under the ship gate: ${im.error}`, im.file);
    else if (TIMING.test(im.error))
      add('timing', 'error', `${im.file} throws at import (a timing assert): ${im.error}. ${SHIP ? 'The ship gate fails it.' : 'A bare throw crashes every render: route it through timingFail (lib/continuity.ts), which warns in dev and fails only under the ship gate.'}`, im.file);
    else add('imports', 'error', `${im.file} does not import: ${im.error}`, im.file);
  }
  for (const x of probe.issues) add('timing', SHIP ? 'error' : 'warn', x.message, x.rule);
  for (const x of probe.empties) add(/^kit-sample:/.test(x.message) ? 'kit-sample' : 'kit-empty', 'error', x.message, x.part);
  const fr = probe.frames;
  if (fr?.fail) {
    if (fr.fail.stage === 'import') add('imports', 'error', `src/Film.tsx does not import: ${fr.fail.message}`, 'src/Film.tsx');
    else add('frames', fr.fail.stage === 'render' ? 'error' : 'warn', `no act was rendered (${fr.fail.stage}): ${fr.fail.message}`, 'src/Film.tsx');
  } else if (fr?.skip) add('frames', 'warn', `no act was rendered: ${fr.skip}`, 'src/Film.tsx');
  if (fr && !fr.fail && !fr.skip) {
    // a browser global the act reaches for while it renders: precheck cannot evaluate it, the render can (a warning)
    const ENV = /^(window|self|navigator|location|Image|HTMLElement|HTMLCanvasElement|OffscreenCanvas|requestAnimationFrame|cancelAnimationFrame|ResizeObserver|IntersectionObserver|getComputedStyle|matchMedia|localStorage|sessionStorage|AudioContext|FontFace|DOMMatrix|Path2D|CSS) is not defined/;
    // every frame failing on Remotion's own contexts: the film loads a second copy of remotion (ES modules), not the film's fault
    const CTX = /can only be called inside|TimelineContext is not available|No video config found|useVideoConfig\(\) can only/i;
    if (fr.errors.length && fr.errors.length === fr.evaluated && fr.errors.every((e) => CTX.test(e.message)))
      add('frames', 'warn', `no act could be evaluated: ${fr.errors[0].message} (the film's modules load another copy of remotion); check the acts in stills`, 'src/Film.tsx');
    else {
      const groups = new Map();
      for (const e of fr.errors) {
        const k = `${e.act}\u0000${e.message}`;
        if (!groups.has(k)) groups.set(k, { ...e, frames: [] });
        groups.get(k).frames.push(e.f);
      }
      for (const e of groups.values()) {
        const where = e.file ? `${rel(e.file)}:${e.line}` : `ACT ${e.act}`;
        const at = `act "${e.act}" at f${e.frames.join(', f')} (${(e.frames[0] / (fr.fps || 30)).toFixed(1)} s)`;
        const env = ENV.exec(e.message);
        if (env) add('frames-env', 'warn', `${at} reaches for ${env[1]} while it renders, which precheck cannot evaluate outside a browser: check that act in a still`, where);
        else if (/kit-(empty|sample):/.test(e.message)) add(/kit-sample:/.test(e.message) ? 'kit-sample' : 'kit-empty', 'error', `${at} throws under the ship gate: ${e.message}`, where);
        else if (TIMING.test(e.message)) add('timing', 'error', `${at} throws a timing assert while it renders: ${e.message}`, where);
        else add('frames', 'error', `${at} throws while it renders: ${e.name}: ${e.message}. A render crashes on those frames: read the film's own content there, never data it does not give`, where);
      }
    }
    if (fr.evaluated && fr.blank === fr.evaluated) add('frames', 'warn', 'every rendered frame came out empty (a gate that waits for an effect, such as an older lib/FontGate): the acts were not evaluated; check them in stills', 'src/Film.tsx');
    for (const x of fr.issues ?? []) add('timing', SHIP ? 'error' : 'warn', `while rendering: ${x.message}`, x.rule);
    // one line per kit part that drew its empty state in those frames (a warning in dev; under --ship it throws above)
    const parts = new Map();
    for (const x of fr.empties ?? []) {
      if (/^kit-sample:/.test(x.message)) add('kit-sample', 'error', `while rendering: ${x.message}`, x.part);
      else parts.set(x.part, [...(parts.get(x.part) ?? []), x.need]);
    }
    for (const [part, needs] of parts) add('kit-empty', 'warn', `while rendering: ${part} drew its empty state (pass ${needs.join('; ')}): the film's own content, never sample data`, part);
  }
}

// ------------------------------------------------------------------------------------------------ 4. fit
if (!flag('--no-fit')) progress(`4/4 measuring the on-screen strings with the film's font (${since()})...`);
/** Advance widths of a woff2 (cmap + hmtx; the default instance), or null. */
const readWoff2 = (file) => {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x774f4632) return null;
  const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
  const numTables = b.readUInt16BE(12);
  const compLen = b.readUInt32BE(20);
  let o = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const c = b[o++];
      v = v * 128 + (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
    return v;
  };
  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = b[o++];
    let tag;
    if ((flags & 0x3f) === 63) {
      tag = b.toString('latin1', o, o + 4);
      o += 4;
    } else tag = TAGS[flags & 0x3f];
    const ver = (flags >> 6) & 3;
    const orig = base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? ver === 0 : ver !== 0;
    const len = transformed ? base128() : orig;
    dir.push({ tag, len, transformed });
  }
  const data = zlib.brotliDecompressSync(b.subarray(o, o + compLen));
  const tables = {};
  let at = 0;
  for (const t of dir) {
    tables[t.tag] = { buf: data.subarray(at, at + t.len), transformed: t.transformed };
    at += t.len;
  }
  const head = tables.head.buf;
  const hhea = tables.hhea.buf;
  const upem = head.readUInt16BE(18);
  const nh = hhea.readUInt16BE(34);
  const hm = tables.hmtx;
  const adv = [];
  for (let i = 0; i < nh; i++) adv.push(hm.transformed ? hm.buf.readUInt16BE(1 + 2 * i) : hm.buf.readUInt16BE(4 * i));
  const cmap = tables.cmap.buf;
  const map = new Map();
  const n = cmap.readUInt16BE(2);
  let best = null;
  for (let i = 0; i < n; i++) {
    const pid = cmap.readUInt16BE(4 + 8 * i);
    const eid = cmap.readUInt16BE(6 + 8 * i);
    const off = cmap.readUInt32BE(8 + 8 * i);
    const fmt = cmap.readUInt16BE(off);
    const score = (fmt === 12 ? 2 : fmt === 4 ? 1 : 0) + (pid === 3 || pid === 0 ? 1 : 0);
    if ((fmt === 4 || fmt === 12) && (!best || score > best.score)) best = { off, fmt, score, eid };
  }
  if (best?.fmt === 12) {
    const groups = cmap.readUInt32BE(best.off + 12);
    for (let g = 0; g < groups; g++) {
      const p = best.off + 16 + 12 * g;
      const s = cmap.readUInt32BE(p);
      const e = cmap.readUInt32BE(p + 4);
      const gid = cmap.readUInt32BE(p + 8);
      for (let c = s; c <= e && c < 0x30000; c++) map.set(c, gid + c - s);
    }
  } else if (best?.fmt === 4) {
    const segX2 = cmap.readUInt16BE(best.off + 6);
    const ends = best.off + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = cmap.readUInt16BE(ends + 2 * s);
      const start = cmap.readUInt16BE(starts + 2 * s);
      const delta = cmap.readInt16BE(deltas + 2 * s);
      const ro = cmap.readUInt16BE(ranges + 2 * s);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let gid;
        if (!ro) gid = (c + delta) & 0xffff;
        else {
          const p = ranges + 2 * s + ro + 2 * (c - start);
          gid = cmap.readUInt16BE(p);
          if (gid) gid = (gid + delta) & 0xffff;
        }
        map.set(c, gid);
      }
    }
  }
  // the default weight of a variable face (fvar), for the weight correction below
  let wght = 400;
  if (tables.fvar) {
    const f = tables.fvar.buf;
    const axesOff = f.readUInt16BE(4);
    const count = f.readUInt16BE(8);
    const size = f.readUInt16BE(10);
    for (let i = 0; i < count; i++) {
      const p = axesOff + i * size;
      if (f.toString('latin1', p, p + 4) === 'wght') wght = f.readInt32BE(p + 8) / 65536;
    }
  }
  const advOf = (gid) => adv[Math.min(gid, adv.length - 1)] ?? 0;
  return { upem, advOf, map, wght, space: advOf(map.get(32) ?? 0) };
};
/** Width in px of one line: advances at `px`, the tracking between letters, a weight correction for a variable face (about 2 % wider per 100 units of weight). */
const measurer = (font) => (text, px, weight = 400, track = 0) => {
  let units = 0;
  let n = 0;
  for (const ch of text) {
    const g = font.map.get(ch.codePointAt(0));
    units += g === undefined ? font.upem * 0.55 : font.advOf(g);
    n++;
  }
  const w = (units / font.upem) * px * (1 + 0.0002 * (weight - font.wght));
  return w + Math.max(0, n - 1) * track * px;
};
const fontFile = () => {
  if (opt('--font')) return path.resolve(opt('--font'));
  const fam = (probe?.tokens?.font ?? '"Inter Variable"').match(/["']?([^"',]+)["']?/)?.[1]?.trim() ?? 'Inter Variable';
  const slug = fam.replace(/\s+variable$/i, '').trim().toLowerCase().replace(/\s+/g, '-');
  const dirs = [path.join(SRC, 'brand', 'fonts', slug), path.join(ROOT, 'public', 'fonts', slug), path.join(ROOT, 'node_modules', '@fontsource-variable', slug, 'files'), findUp(ROOT, path.join('node_modules', '@fontsource-variable', slug, 'files'))].filter(Boolean);
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    const files = fs.readdirSync(d).filter((f) => f.endsWith('.woff2') && /latin-(wght|opsz|standard)?-?normal/.test(f) && !/latin-ext/.test(f));
    const pick = files.find((f) => /wght-normal/.test(f)) ?? files.find((f) => /normal/.test(f));
    if (pick) return path.join(d, pick);
  }
  return null;
};
let measured = 0;
if (!flag('--no-fit') && probe) {
  const ff = fontFile();
  let font = null;
  try {
    font = ff ? readWoff2(ff) : null;
  } catch (e) {
    add('fit', 'warn', `the film's font (${ff}) could not be read: ${e.message}; the fit check was skipped`);
  }
  if (!ff) add('fit', 'warn', "the film's font file was not found (src/brand/fonts, public/fonts or node_modules/@fontsource-variable): the fit check was skipped (--font FILE)");
  if (font) {
    const width = measurer(font);
    const W = probe.size?.w ?? 1920;
    const H = probe.size?.h ?? 1080;
    const u = Math.min(W, H) / 1080;
    const T = probe.tokens?.type ?? {};
    const safeW = W - 2 * (probe.tokens?.safe?.x ?? 96 * u);
    const role = (k) => T[k] ?? { size: { ui: 40, line: 84, display: 160 }[k] ?? 40, weight: 450, track: 0 };
    const check = (text, r, box, where, kind) => {
      for (const ln of String(text).split('\n')) {
        if (!ln.trim()) continue;
        measured++;
        const px = r.size * u;
        const w = width(ln, px, r.weight, r.track ?? 0);
        const q = w / box;
        const tag = `"${ln.length > 60 ? `${ln.slice(0, 57)}...` : ln}" is ${Math.round(w)} px at ${Math.round(px)} px`;
        if (q > 1.06) add('fit', 'error', `${tag}, wider than its box (${Math.round(box)} px, ${kind}): shorten it, or give it a line of its own`, where);
        else if (q > 0.97) add('fit-edge', 'warn', `${tag}, at the edge of its box (${Math.round(box)} px, ${kind}): check it in a still`, where);
      }
    };
    // a film whose acts size their lines to the width (lib/measure fitSize) never sets a long line wider than the frame:
    // it sets it smaller. There the measure says how small: under 75 % of its role a line reads small (warn), under half
    // it is no longer a line (error). A film that sets lines at their role size gets the plain width check.
    const fitted = filmFiles.some((p) => /\bfitSize\s*\(/.test(fs.readFileSync(p, 'utf8')));
    for (const c of probe.copy ?? []) {
      const r = role(c.kind === 'name' ? 'display' : c.kind === 'ui' ? 'ui' : 'line');
      if (!fitted || c.kind === 'ui') {
        check(c.text, r, safeW, `COPY ${c.id}`, 'the safe width');
        continue;
      }
      for (const ln of String(c.text).split('\n')) {
        if (!ln.trim()) continue;
        measured++;
        const px = r.size * u;
        const k = safeW / width(ln, px, r.weight, r.track ?? 0);
        if (k >= 0.75) continue;
        const tag = `"${ln.length > 60 ? `${ln.slice(0, 57)}...` : ln}" fits the safe width only at ${Math.round(px * k)} px (${Math.round(k * 100)} % of its ${Math.round(px)} px role)`;
        if (k < 0.5) add('fit', 'error', `${tag}: too long to read as one line: shorten it, or split it across two beats`, `COPY ${c.id}`);
        else add('fit-small', 'warn', `${tag}: the act sets it that small (fitSize); a shorter line reads bigger`, `COPY ${c.id}`);
      }
    }
    const seen = new Set();
    for (const s of probe.strings ?? []) {
      if (seen.has(s.text)) continue;
      seen.add(s.text);
      if (/\.\.\.|…/.test(s.text)) add('truncated', 'error', `"${s.text}" carries an ellipsis: a UI title is written whole (shorten it), never cut with "..."`, s.where);
      const r = role('ui');
      const w = width(s.text, r.size * u, r.weight, r.track ?? 0);
      measured++;
      if (w > safeW * 1.06) add('fit', 'error', `"${s.text.slice(0, 60)}" is ${Math.round(w)} px at the kit's label size (${Math.round(r.size * u)} px): wider than the safe width (${Math.round(safeW)} px)`, s.where);
      else if (w > safeW * 0.5) add('fit-long', 'warn', `"${s.text.slice(0, 60)}" is ${Math.round(w)} px at the kit's label size: wider than a card's text column (${Math.round(safeW * 0.5)} px); a kit part cuts it with "..." or wraps it: shorten it`, s.where);
    }
  }
}

// ------------------------------------------------------------------------------------------------ 5. the case
// The spine's one case runs from the request to the result: the words each act of SPINE_PLAN lists as what it shows (its
// strings) are the film's own on-screen words, a string of its content modules or a COPY entry. A word of the case (its
// request, names, numbers) that no scene carries is an error; any other listed string no scene carries warns.
if (probe?.spine) {
  const norm = (x) => String(x).toLowerCase().replace(/[^\p{L}\p{N}$€£%.]+/gu, ' ').trim();
  const shown = norm([...(probe.strings ?? []).map((x) => x.text), ...(probe.copy ?? []).map((c) => c.text)].join(' | '));
  const C = probe.spine.case ?? {};
  const caseWords = new Set([C.request, ...(C.names ?? []), ...(C.numbers ?? [])].filter(Boolean).map(norm));
  const isCase = (x) => [...caseWords].some((w) => w && (norm(x).includes(w) || w.includes(norm(x))));
  for (const a of probe.spine.acts ?? []) {
    const missing = a.strings.filter((x) => norm(x) && !shown.includes(norm(x)));
    const lost = missing.filter(isCase);
    const other = missing.filter((x) => !isCase(x));
    if (lost.length) add('case', 'error', `act ${a.i + 1}${a.verb ? ` (${a.verb})` : ''} lists ${lost.map((x) => `"${x}"`).join(', ')} of the case as what it shows, but no scene or COPY entry carries it: the case's words are the product's own strings, the same in every act (put them in the content the act's scenes draw)`, 'src/timeline.ts SPINE_PLAN');
    if (other.length) add('case-strings', 'warn', `act ${a.i + 1}${a.verb ? ` (${a.verb})` : ''} lists ${other.map((x) => `"${x}"`).join(', ')} as what it shows, but no scene or COPY entry carries it`, 'src/timeline.ts SPINE_PLAN');
  }
}

// ------------------------------------------------------------------------------------------------ report
const errors = findings.filter((f) => f.severity === 'error');
const warns = findings.filter((f) => f.severity === 'warn');
const ok = !errors.length;
const secs = (Date.now() - t0) / 1000;
if (JSON_OUT) {
  const fr = probe?.frames;
  const frames = fr ? { acts: fr.acts, evaluated: fr.evaluated, failed: fr.errors?.length ?? 0, seconds: +((fr.ms ?? 0) / 1000).toFixed(1), ...(fr.skip ? { skip: fr.skip } : {}) } : null;
  console.log(JSON.stringify({ ok, gate: SHIP ? 'ship' : 'dev', seconds: +secs.toFixed(1), imports: probe?.imports ?? [], frames, measured, findings, summary: { errors: errors.length, warnings: warns.length } }, null, 1));
} else {
  const im = probe?.imports ?? [];
  const fr = probe?.frames;
  const frames = fr && !fr.fail && !fr.skip ? `${fr.evaluated} frames of ${fr.acts} acts rendered (${fr.errors.length} failed), ` : '';
  console.log(`precheck: ${rel(SRC) || 'src'} (${SHIP ? 'ship gate' : 'dev'}): ${im.filter((x) => x.ok).length} of ${importList.length} modules imported, ${frames}${filmFiles.length} files scanned for kit parts, ${measured} strings measured, ${secs.toFixed(1)} s`);
  for (const f of findings) console.log(`${f.severity.padStart(5)}  ${f.rule}${f.where ? ` (${f.where})` : ''}: ${f.message}`);
  console.log(`precheck: ${errors.length} error${errors.length === 1 ? '' : 's'}, ${warns.length} warning${warns.length === 1 ? '' : 's'}${ok ? '' : ': fix them before any still or render'}`);
}
process.exit(ok ? 0 : 1);
