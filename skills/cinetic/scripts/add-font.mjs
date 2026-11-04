#!/usr/bin/env node
/**
 * add-font.mjs: vendor a @fontsource-variable/* family into the film project, without npm install.
 *
 * A project made with `new-film.sh --link-modules` shares its node_modules with other projects, so
 * `npm install <font>` inside it would write into that shared folder (and change every film that
 * uses it). This script fetches the package with `npm pack` into a temp folder (or reads it from
 * node_modules when it is already there, read-only), and copies the face into the project:
 *
 *   Remotion     src/brand/fonts/<name>/index.css + the .woff2 files it references + LICENSE;
 *                src/brand/fonts.ts imports './fonts/<name>/index.css' in place of the import it
 *                replaces for that role (the starter's stand-in, or a family vendored before);
 *                src/brand/tokens.ts gets the family in FONT.<role> and
 *                FACES, with every weight clamped to the font's axis. The bundler serves the files,
 *                FontGate waits for them: nothing is fetched at render time.
 *   HyperFrames  fonts/<name>-latin[-ext]-wght-normal.woff2 + fonts/<name>-LICENSE, and prints the
 *                @font-face block to paste into index.html.
 *
 * --add <key> vendors a second (or third) family beside the film's own instead of replacing it: a product UI face
 * or a system notification face next to the display face. fonts.ts imports it without dropping anything,
 * tokens.ts gets FONT.<key> (a new line, or the line of that key replaced) and a FACES entry; FONT.text and
 * FONT.mono stay as they are. Use it for the product's own faces only: the film's words keep one sans.
 *
 * Only normal (upright) faces are copied: italics are a hard ban when you invent the look. The
 * package's own category decides the role: a monospace family becomes FONT.mono, a sans FONT.text;
 * serif, display and handwriting families are refused unless --brand-supplied (the user's brand
 * supplied it: record it in BRIEF.md).
 *
 * The face set (scripts/faces.json) is the list to choose from: --list prints it by look (display and
 * text faces, alternates, weights, tracking offset). A face from the set is vendored from the CSS file the
 * set names (opsz.css for Inter and DM Sans, so film sizes take the display cut; --css <file> picks
 * another), and the script prints the set's weights and the tracking offset to add to every TYPE role.
 * A face outside the set is vendored with a warning: compare it against the set with font-match.mjs first.
 *
 * Usage (from the project root, or pass --dir):
 *   node scripts/add-font.mjs <name | @fontsource-variable/name[@version]> [--role text|mono] [--add <key>]
 *                             [--css <file.css>] [--dir <project>] [--no-tokens] [--brand-supplied] [--dry-run]
 *   node scripts/add-font.mjs --list
 *   e.g. node scripts/add-font.mjs dm-sans               (the geometric look)
 *        node scripts/add-font.mjs @fontsource-variable/jetbrains-mono --role mono
 *        node scripts/add-font.mjs inter --add ui        (FONT.ui beside FONT.text)
 * Exit codes: 0 vendored, 1 failed (the message says why), 2 bad arguments.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const HELP = readFileSync(new URL(import.meta.url), 'utf8').replace(/\r\n/g, '\n').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, '');
// Files are edited with LF and written back with the line ending they had (a Windows checkout has CRLF).
const readText = (p) => {
  const s = readFileSync(p, 'utf8');
  return { text: s.replace(/\r\n/g, '\n'), eol: s.includes('\r\n') ? '\r\n' : '\n' };
};
const writeText = (p, text, eol) => writeFileSync(p, eol === '\n' ? text : text.replace(/\n/g, eol));
// npm is npm.cmd on Windows, which execFile cannot start without a shell (EINVAL / ENOENT)
const WIN = process.platform === 'win32';
const npm = (args, opts) => (WIN
  ? execFileSync('npm', args.map((a) => `"${a}"`), { ...opts, shell: true })
  : execFileSync('npm', args, opts));
let tmp = null; // the npm pack folder, removed on every exit
const cleanup = () => { if (tmp) rmSync(tmp, { recursive: true, force: true }); tmp = null; };
const die = (msg, code = 1) => { cleanup(); console.error(`add-font: ${msg}`); process.exit(code); };

// the face set: looks, faces, the CSS file each face is vendored from, its weights and tracking offset
const SET = (() => { try { return JSON.parse(readFileSync(new URL('./faces.json', import.meta.url), 'utf8')); } catch { return null; } })();
const looksOf = (name) => (SET?.looks ?? []).filter((l) => [l.display, l.text, l.mono, ...(l.alternates ?? [])].includes(name));
const printSet = () => {
  if (!SET) die('scripts/faces.json not found next to this script');
  const em = (v) => `${v >= 0 ? '+' : ''}${v} em`;
  console.log(`The face set (scripts/faces.json): free faces, SIL OFL 1.1, fetched from @fontsource-variable. Default: ${SET.default}.`);
  for (const l of SET.looks) {
    const w = l.weights;
    console.log(`\n${l.id}${l.default ? ' (default)' : ''}: ${l.name}\n  display ${l.display}, text ${l.text}, mono ${l.mono}; alternates ${(l.alternates ?? []).join(', ') || '-'}` +
      `\n  weights: text ${w.text}, display ${w.display_calm} calm / ${w.display_bold} bold, wordmark ${w.wordmark}\n  for: ${l.for}`);
  }
  console.log('\nfaces (tracking offset to add to every TYPE role; weight offset to add to every TYPE weight):');
  for (const [n, f] of Object.entries(SET.faces)) console.log(`  ${n.padEnd(18)} "${f.family}"  ${f.css}  offset ${em(f.offset_em)}, weight ${f.weight_offset >= 0 ? '+' : ''}${f.weight_offset}`);
  console.log('\nsetting:\n' + SET.setting.map((s) => `  - ${s}`).join('\n'));
};

const args = process.argv.slice(2);
let spec = null, role = null, dir = '.', tokens = true, brand = false, dry = false, addKey = null, cssFile = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-h' || a === '--help') { console.log(HELP.trim()); process.exit(0); }
  else if (a === '--list') { printSet(); process.exit(0); }
  else if (a === '--css') cssFile = args[++i];
  else if (a === '--role') role = args[++i];
  else if (a === '--dir') dir = args[++i];
  else if (a === '--add') addKey = args[++i] ?? '';
  else if (a === '--no-tokens') tokens = false;
  else if (a === '--brand-supplied') brand = true;
  else if (a === '--dry-run') dry = true;
  else if (a.startsWith('-')) die(`unknown option ${a} (see --help)`, 2);
  else if (spec) die(`one font per run (got ${spec} and ${a})`, 2);
  else spec = a;
}
if (!spec) { console.log(HELP.trim()); die('missing <name | package>', 2); }
if (role && !['text', 'mono'].includes(role)) die('--role must be text or mono', 2);
if (cssFile !== null && !/^[\w.-]+\.css$/.test(cssFile || '')) die('--css needs the name of a CSS file in the package, such as opsz.css', 2);
if (addKey !== null && !/^[a-z][a-zA-Z0-9]*$/.test(addKey)) die('--add needs a key name such as ui or notice (letters and digits)', 2);
if (addKey === 'text' || addKey === 'mono') die(`--add ${addKey} would replace the role: run without --add (with --role mono for a mono)`, 2);
dir = resolve(dir);

// ---- which package ------------------------------------------------------------------------
const m = /^(?:(@[\w.-]+)\/)?([\w.-]+?)(?:@([\w.^~<>=*-]+))?$/.exec(spec);
if (!m) die(`cannot read the package name "${spec}"`, 2);
const scope = m[1] || '@fontsource-variable';
const name = m[2];
const pkg = `${scope}/${name}`;
if (scope !== '@fontsource-variable') console.warn(`add-font: ${pkg} is not a variable package; one face per weight will be copied as its index.css lists them`);

const engine = existsSync(join(dir, 'src/brand')) ? 'remotion' : existsSync(join(dir, 'index.html')) ? 'hyperframes' : null;
if (!engine) die(`${dir} is not a cinetic film (no src/brand/ and no index.html); pass --dir`);

// ---- get the files: node_modules (read-only) or npm pack into a temp folder -----------------
let root = join(dir, 'node_modules', pkg);
if (!existsSync(join(root, 'index.css')) || m[3]) {
  tmp = mkdtempSync(join(tmpdir(), 'add-font-'));
  try {
    const out = npm(['pack', m[3] ? `${pkg}@${m[3]}` : pkg, '--pack-destination', tmp, '--silent'],
      { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(/\r?\n/).pop().trim();
    // a relative name from inside the folder: GNU tar reads "C:\..." as a remote host
    execFileSync('tar', ['-xzf', basename(out)], { cwd: tmp });
  } catch (e) {
    die(`npm pack ${pkg} failed: ${(e.stderr || e.message || '').toString().trim().split('\n').slice(-2).join(' ')}\n` +
      '  (is the name right? the families are listed at fontsource.org; offline, copy the .woff2 files by hand: references/copy-and-type.md §6)');
  }
  root = join(tmp, 'package');
}
try {
  const meta = existsSync(join(root, 'metadata.json')) ? JSON.parse(readFileSync(join(root, 'metadata.json'), 'utf8')) : {};
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  // the CSS the set names for this face (opsz.css: weight and optical size), else index.css
  const setFace = scope === '@fontsource-variable' ? SET?.faces?.[name] : null;
  const cssName = cssFile ?? (setFace?.css && existsSync(join(root, setFace.css)) ? setFace.css : 'index.css');
  if (!existsSync(join(root, cssName))) die(`${pkg} has no ${cssName} (its CSS files: ${readdirSync(root).filter((f) => f.endsWith('.css')).join(', ')})`);
  const css = readFileSync(join(root, cssName), 'utf8');
  const blocks = [...css.matchAll(/(\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]*\}/g)].map((b) => b[0]).filter((b) => !/font-style:\s*(italic|oblique)/.test(b));
  if (!blocks.length) die(`${pkg} has no upright @font-face in index.css`);
  const family = /font-family:\s*['"]([^'"]+)['"]/.exec(blocks[0])?.[1];
  const wr = /font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(blocks[0]);
  const axis = wr ? [Number(wr[1]), Number(wr[2] ?? wr[1])] : [400, 400];
  const category = meta.category || 'unknown';
  if (['serif', 'display', 'handwriting'].includes(category) && !brand)
    die(`${family} is a ${category} family: serif, display and script faces are hard bans when you invent the look ` +
      '(SKILL.md). If the user\'s brand supplies it, rerun with --brand-supplied and record it in BRIEF.md.');
  role = role || (category === 'monospace' || / Mono\b/.test(family) ? 'mono' : 'text');
  const files = [...new Set(blocks.flatMap((b) => [...b.matchAll(/url\(\s*['"]?\.\/(files\/[^'")]+)['"]?\s*\)/g)].map((u) => u[1])))];
  const missing = files.filter((f) => !existsSync(join(root, f)));
  if (missing.length) die(`${pkg} is missing ${missing.join(', ')}`);
  const lic = ['LICENSE', 'LICENSE.md', 'OFL.txt'].find((f) => existsSync(join(root, f)));
  const kb = (fs) => Math.round(fs.reduce((s, f) => s + statSync(join(root, f)).size, 0) / 1024);
  const say = (s) => console.log(`add-font: ${s}`);
  // the set's setting for this face, or a warning when it is outside the set
  const setAdvice = () => {
    if (!SET) return;
    const looks = looksOf(name);
    if (!setFace) {
      if (!brand) console.warn(`add-font: ${name} is outside the face set (scripts/faces.json, node scripts/add-font.mjs --list): rank it against the set with font-match.mjs and record why it wins in TREATMENT.md`);
      return;
    }
    const sgn = (v) => `${v >= 0 ? '+' : ''}${v}`;
    const w = looks[0]?.weights;
    say(`face set: ${looks.map((l) => `${l.id} (${l.name})`).join(', ') || 'a set face'}; vendored from ${cssName}` +
      `${setFace.offset_em ? `; add ${sgn(setFace.offset_em)} em to every TYPE tracking` : '; TYPE tracking as written (the house numbers are Inter\'s)'}` +
      `${setFace.weight_offset ? `, ${sgn(setFace.weight_offset)} to every TYPE weight` : ''}` +
      `${w && role === 'text' ? `; the look's weights: text ${w.text}, display ${w.display_calm} calm / ${w.display_bold} bold, wordmark ${w.wordmark}` : ''}`);
  };

  if (engine === 'hyperframes') {
    const pick = files.filter((f) => /-(latin|latin-ext)-[\w-]*normal\.woff2$/.test(f));
    const dst = join(dir, 'fonts');
    if (!dry) {
      mkdirSync(dst, { recursive: true });
      for (const f of pick) copyFileSync(join(root, f), join(dst, basename(f)));
      if (lic) copyFileSync(join(root, lic), join(dst, `${name}-LICENSE`));
    }
    say(`${family} ${version} (${category}, weight ${axis.join('-')}): ${pick.map((f) => 'fonts/' + basename(f)).join(', ')} (${kb(pick)} KB)`);
    console.log(`\npaste into index.html (and use the family name literally in font-family):\n` +
      pick.map((f) => {
        const b = blocks.find((x) => x.includes(f));
        const range = /unicode-range:\s*([^;]+);/.exec(b)?.[1];
        return `@font-face {\n  font-family: "${family}";\n  src: url("fonts/${basename(f)}") format("woff2");\n  font-weight: ${axis.join(' ')};\n  font-style: normal;${range ? `\n  unicode-range: ${range};` : ''}\n}`;
      }).join('\n'));
    setAdvice();
    cleanup();
    process.exit(0);
  }

  // ---- Remotion: vendor the CSS and its files ------------------------------------------------
  const rel = `fonts/${name}`;
  const dst = join(dir, 'src/brand', rel);
  const header = `/* ${family} ${version}, vendored from ${pkg}/${cssName} by scripts/add-font.mjs (upright faces only).\n` +
    `   Licence: ./LICENSE. Weight axis ${axis.join('-')}. Loaded by src/brand/fonts.ts; FontGate waits for FACES. */\n\n`;
  if (!dry) {
    rmSync(dst, { recursive: true, force: true });
    mkdirSync(join(dst, 'files'), { recursive: true });
    for (const f of files) copyFileSync(join(root, f), join(dst, f));
    if (lic) copyFileSync(join(root, lic), join(dst, 'LICENSE'));
    writeFileSync(join(dst, 'index.css'), header + blocks.join('\n\n') + '\n');
  }
  say(`${family} ${version} (${category}, weight ${axis.join('-')}) -> src/brand/${rel}/ (${files.length} files, ${kb(files)} KB)`);

  // fonts.ts: import the vendored CSS in place of what it replaces for this role: the starter's
  // stand-in, or a family vendored here before for the same role (and the stand-in's marker)
  const fontsTs = join(dir, 'src/brand/fonts.ts');
  const { text: ft0, eol: ftEol } = existsSync(fontsTs) ? readText(fontsTs) : { text: '', eol: '\n' };
  let ft = ft0;
  const replaced = [];
  const drop = (re) => { if (!addKey) ft = ft.replace(re, (line) => (replaced.push(line.trim()), '')); }; // --add keeps every import
  // the starter's stand-in package: Inter (opsz.css) for text, Geist Mono for mono; Geist in films made before Inter
  drop(role === 'mono' ? /^import '@fontsource-variable\/geist-mono(?:\/[^']*)?';[^\n]*\n?/gm : /^import '@fontsource-variable\/(?:inter|geist)(?:\/[^']*)?';[^\n]*\n?/gm);
  drop(new RegExp(`^import '\\./fonts/(?!${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/)[^']+/index\\.css';[^\\n]*\\(${role}\\)[^\\n]*\\n?`, 'gm'));
  if (role === 'text' && !addKey) ft = ft.replace(/^(?:\/\/\n)?\/\/ cinetic:placeholder[^\n]*\n(?:\/\/(?! cinetic:)[^\n]*\n)*/m, '');
  const imp = `import './${rel}/index.css'; // ${family} (${addKey ?? role}), vendored: scripts/add-font.mjs`;
  if (!ft.includes(`'./${rel}/index.css'`)) ft = ft.replace(/\s*$/, '\n') + imp + '\n';
  if (!dry) writeText(fontsTs, ft, ftEol);
  say(`src/brand/fonts.ts imports ./${rel}/index.css${replaced.length ? ` (replacing ${replaced.map((l) => l.replace(/^import /, '').replace(/;.*$/, '')).join(', ')})` : ''}`);

  // tokens.ts: FONT.<role> and FACES follow the family; weights clamp to the axis
  const tokTs = join(dir, 'src/brand/tokens.ts');
  if (tokens && existsSync(tokTs) && addKey) {
    // --add: FONT.<key> beside the film's own families, and its FACES entry; nothing else changes
    const { text: tk0, eol: tkEol } = readText(tokTs);
    let tk = tk0;
    const stack = role === 'mono' ? `"${family}", ui-monospace, monospace` : `"${family}", system-ui, sans-serif`;
    // only inside FONT: the same key elsewhere (C.accent, C.line ...) is a colour, never a font
    const obj = /^export const FONT\s*=\s*\{[\s\S]*?\n\};?/m.exec(tk);
    if (!obj) die('src/brand/tokens.ts has no FONT object to add to (add the family by hand)');
    const keyLine = new RegExp(`^(\\s*${addKey}:\\s*)'[^']*'`, 'm');
    const font = keyLine.test(obj[0]) ? obj[0].replace(keyLine, (_, head) => `${head}'${stack}'`)
      : obj[0].replace(/\n\};?$/, `\n  ${addKey}: '${stack}', // added beside the film's families: add-font.mjs --add\n};`);
    tk = tk.replace(obj[0], () => font);
    tk = tk.replace(/^(export const FACES\s*=\s*\[)([^\]]*)\]/m, (all, head, body) => {
      const faces = [...body.matchAll(/'([^']*)'/g)].map((x) => x[1]);
      if (!faces.some((f) => f.endsWith(`"${family}"`))) faces.push(`${Math.min(axis[1], Math.max(axis[0], 400))} 16px "${family}"`);
      return `${head}${faces.map((f) => `'${f}'`).join(', ')}]`;
    });
    if (!dry) writeText(tokTs, tk, tkEol);
    say(`src/brand/tokens.ts: FONT.${addKey} = '${stack}' beside the film's own families; FACES waits for it`);
    console.log(`next: use FONT.${addKey} for the product's own UI only (the film's words keep FONT.text), then npm run check`);
  } else if (tokens && existsSync(tokTs)) {
    const { text: tk0, eol: tkEol } = readText(tokTs);
    let tk = tk0;
    const line = new RegExp(`^(\\s*${role}:\\s*)'([^']*)'`, 'm');
    const cur = line.exec(tk);
    if (!cur) die(`src/brand/tokens.ts has no FONT.${role} line to set (set FONT and FACES by hand)`);
    const old = /"([^"]+)"/.exec(cur[2])?.[1];
    const stack = role === 'mono' ? `"${family}", ui-monospace, monospace` : `"${family}", system-ui, sans-serif`;
    tk = tk.replace(line, `$1'${stack}'`);
    // the text face (FONT.ui) follows the voice when it was the same family (a one-family film stays one family)
    if (role === 'text') {
      const uiLine = /^(s*ui:s*)'([^']*)'/m;
      const um = uiLine.exec(tk);
      if (um && /"([^"]+)"/.exec(um[2])?.[1] === old) tk = tk.replace(uiLine, `$1'${stack}'`);
    }
    const clampW = (w) => Math.min(axis[1], Math.max(axis[0], w));
    const clamped = [];
    tk = tk.replace(/^(export const FACES\s*=\s*\[)([^\]]*)\]/m, (all, head, body) => {
      const faces = [...body.matchAll(/'([^']*)'/g)].map((x) => x[1]);
      const next = faces.map((f) => {
        const fm = /^(\d+)\s+(\S+)\s+"([^"]+)"$/.exec(f);
        if (!fm || fm[3] !== old) return f;
        const w = clampW(Number(fm[1]));
        if (w !== Number(fm[1])) clamped.push(`${fm[1]} -> ${w}`);
        return `${w} ${fm[2]} "${family}"`;
      });
      if (!next.some((f) => f.endsWith(`"${family}"`))) next.push(`400 16px "${family}"`);
      return `${head}${[...new Set(next)].map((f) => `'${f}'`).join(', ')}]`;
    });
    if (role === 'text') tk = tk.replace(/^\/\/ cinetic:placeholder - the family is[^\n]*\n(?:\/\/(?! cinetic:)[^\n]*\n)*/m, '');
    // TYPE weights outside the axis would silently fall back to the nearest one: say so
    const outside = [...tk.matchAll(/weight:\s*(\d+)/g)].map((x) => Number(x[1])).filter((w) => w < axis[0] || w > axis[1]);
    if (!dry) writeText(tokTs, tk, tkEol);
    say(`src/brand/tokens.ts: FONT.${role} = '${stack}'${old ? ` (was "${old}")` : ''}; FACES follow it` +
      (clamped.length ? ` (weights clamped to the axis: ${clamped.join(', ')})` : ''));
    if (role === 'text' && outside.length) console.warn(`add-font: TYPE uses weight ${[...new Set(outside)].join(', ')}, outside ${family}'s axis ${axis.join('-')}: pick weights inside it`);
    // the mono stand-in stays loaded until a mono replaces it: say so when nothing uses it
    const monoUsed = readdirSync(join(dir, 'src'), { recursive: true }).some((f) => /\.(tsx?)$/.test(f) && !/^brand[\\/]/.test(f) &&
      /\bFONT\.mono\b/.test(readFileSync(join(dir, 'src', f), 'utf8')));
    if (role === 'text' && /Geist Mono/.test(tk) && !monoUsed)
      say('note: the starter\'s mono stand-in (Geist Mono) is still in fonts.ts and FACES, and nothing outside src/brand uses FONT.mono: ' +
        'remove it (the import, its FACES entry and the package) or vendor this film\'s mono with --role mono');
  }

  // package.json: the starter's stand-in dependency for this role is no longer used
  const pj = join(dir, 'package.json');
  const standPkgs = role === 'mono' ? ['@fontsource-variable/geist-mono'] : ['@fontsource-variable/inter', '@fontsource-variable/geist'];
  if (existsSync(pj) && !dry && !addKey) {
    const p = JSON.parse(readFileSync(pj, 'utf8'));
    const srcText = readdirSync(join(dir, 'src'), { recursive: true }).filter((f) => /\.(tsx?|css)$/.test(f)).map((f) => readFileSync(join(dir, 'src', f), 'utf8')).join('\n');
    const dropped = standPkgs.filter((sp) => p.dependencies?.[sp] && !srcText.includes(`'${sp}'`) && !srcText.includes(`'${sp}/`));
    for (const sp of dropped) delete p.dependencies[sp];
    if (dropped.length) {
      writeFileSync(pj, JSON.stringify(p, null, 2) + '\n');
      say(`package.json: dropped ${dropped.join(', ')} (the stand-in)`);
    }
  }
  setAdvice();
  if (!addKey) console.log(`next: choose the weights and tracking in TYPE for this family (references/copy-and-type.md §6), then npm run check && npm run stills`);
} finally {
  cleanup();
}
