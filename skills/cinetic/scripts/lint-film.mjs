#!/usr/bin/env node
/**
 * lint-film.mjs: static bans for a cinetic film (Remotion src/ or a HyperFrames project).
 *
 * Catches the code patterns that render wrong or read as generated before anything is rendered:
 *   css-animation     CSS transition/animation, @keyframes, animate-* classes (they do not render
 *                     frame-by-frame: everything must be a function of the frame)
 *   nondeterminism    Math.random, Date.now, performance.now, new Date() (renders must repeat)
 *   will-change-blur  willChange in a file that animates filter: blur() (stale ghost frames)
 *   frame-left-top    left/top/right/bottom driven by the frame (pixel-snapped stairs; use transform)
 *   raw-easing        Easing.bezier / cubic-bezier / Easing.spring|elastic|bounce|back outside lib/anim.ts
 *   spring-config     inline {damping, stiffness} spring configs outside lib/anim.ts (use SPR tokens)
 *   interpolate-clamp interpolate() without extrapolateLeft AND extrapolateRight 'clamp' (it extends)
 *   off-token-color   hex colours not declared in the tokens file; other colour literals (warning)
 *   italic / serif    italic or oblique styles, <i>/<em>, serif families (use --allow when the brand has them)
 *   gradient-multihue gradients across several hues (the generated look)
 *   gradient-low-span opaque gradients spanning < 30 code values (they band in 8 bit; use a dithered PNG)
 *   premount          premountFor is a no-op in renders and ignored with layout="none" (warning)
 *   inbrowser-blur    CameraMotionBlur / HtmlInCanvasMotionBlur / Trail (8-bit accumulation; use render.sh --blur)
 *   remote-font       font packages or stylesheets fetched over the network (ship local variable fonts)
 *   hf-*              HyperFrames: gsap .from(), repeat: -1, <br>, <audio> without id
 *   placeholder       a `cinetic:placeholder` marker is still in the source: the starter's stand-in
 *                     palette, mark or name was never replaced (error; the film would look like every
 *                     other starter film). Invent the brand or apply the user's, then delete the marker.
 *
 * Palette: hex colours must appear in the tokens file (Remotion: src/brand/tokens.ts). In a
 * HyperFrames project with no tokens file, the custom properties in the HTML's `:root { }` blocks
 * are the palette, and motion.js is the easing module (raw beziers are allowed there).
 *
 * Suppress one finding with a reason on the same or previous line:  // lint-ok: <reason>
 * (or <!-- lint-ok: reason --> in HTML). Disable whole rules with --allow serif,italic.
 *
 * Usage:
 *   node scripts/lint-film.mjs [src] [--tokens src/brand/tokens.ts] [--json] [--strict] [--allow rule,...]
 *     src       file or directory to scan (default: src, or . if there is no src)
 *     --tokens  file whose hex colours are the palette (default: <src>/brand/tokens.ts if present,
 *               else the :root custom properties of the scanned HTML/CSS)
 *     --json    print a JSON report instead of text
 *     --strict  warnings fail too
 * Exit codes: 0 clean (warnings allowed unless --strict), 1 errors found, 2 bad arguments.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

// ---------------------------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const opt = { src: null, tokens: null, json: false, strict: false, allow: new Set() };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') opt.json = true;
  else if (a === '--strict') opt.strict = true;
  else if (a === '--tokens') opt.tokens = argv[++i];
  else if (a === '--allow') (argv[++i] || '').split(',').filter(Boolean).forEach((r) => opt.allow.add(r.trim()));
  else if (a === '-h' || a === '--help') {
    console.log(readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
    process.exit(0);
  } else if (a.startsWith('-')) {
    console.error(`lint-film: unknown option ${a}`);
    process.exit(2);
  } else if (!opt.src) opt.src = a;
  else {
    console.error(`lint-film: one path only (got ${opt.src} and ${a})`);
    process.exit(2);
  }
}
const root = resolve(opt.src ?? (existsSync('src') ? 'src' : '.'));
if (!existsSync(root)) {
  console.error(`lint-film: ${root} does not exist`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------- files
// vendor: third-party runtimes (a HyperFrames project's gsap.min.js); scripts: the cinetic tooling itself
const SKIP_DIRS = new Set(['node_modules', 'out', 'build', 'dist', '.git', '.remotion', 'renders', '__pycache__', 'vendor', 'scripts']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.htm']);
const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) {
    if (SKIP_DIRS.has(basename(p))) return;
    for (const e of readdirSync(p)) walk(join(p, e));
  } else if (EXTS.has(extname(p)) && !p.endsWith('.d.ts')) files.push(p);
};
walk(root);

const tokensPath = opt.tokens
  ? resolve(opt.tokens)
  : [join(root, 'brand', 'tokens.ts'), join(root, 'src', 'brand', 'tokens.ts')].find((p) => existsSync(p)) ?? null;
if (opt.tokens && !existsSync(tokensPath)) {
  console.error(`lint-film: tokens file ${opt.tokens} not found`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------- colour helpers
const normHex = (h) => {
  let x = h.replace('#', '').toLowerCase();
  if (x.length === 3 || x.length === 4) x = x.split('').map((c) => c + c).join('');
  return '#' + x.slice(0, 6);
};
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const tokenHex = new Set();
const tokenByName = new Map();
if (tokensPath) {
  const t = readFileSync(tokensPath, 'utf8');
  for (const m of t.matchAll(HEX_RE)) tokenHex.add(normHex(m[0]));
  for (const m of t.matchAll(/([A-Za-z_$][\w$-]*)\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/g)) tokenByName.set(m[1], normHex(m[2]));
  for (const m of t.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) tokenByName.set(m[1], normHex(m[2]));
}
// HyperFrames (or any project without a tokens file): the :root custom properties are the palette.
const ROOT_BLOCK_RE = /:root\s*\{[^}]*\}/g;
let rootTokens = null; // file(s) the :root palette came from
if (!tokensPath) {
  const from = [];
  for (const f of files.filter((x) => /\.(html?|css)$/.test(x))) {
    const src = readFileSync(f, 'utf8');
    for (const block of src.match(ROOT_BLOCK_RE) ?? []) {
      let found = false;
      for (const m of block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g)) {
        tokenHex.add(normHex(m[2]));
        tokenByName.set(m[1], normHex(m[2]));
        found = true;
      }
      if (found && !from.includes(f)) from.push(f);
    }
  }
  if (from.length) rootTokens = from.map((f) => relative(process.cwd(), f) || f).join(', ') + ' :root';
}
const paletteName = tokensPath ? relative(process.cwd(), tokensPath) : rootTokens;
const rgbOf = (hex) => {
  const x = normHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
};
// OKLCH (approximate, enough to tell hues apart)
const oklch = ([r, g, b]) => {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, Bb), h: ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360 };
};
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ---------------------------------------------------------------------------------- source masking
/**
 * Returns the source with comments blanked (same length, newlines kept) so rules never fire on
 * prose like "never use Math.random". Strings are kept. A ' or " only opens a string if it closes
 * on the same line, so apostrophes in JSX text ("doesn't") cannot derail the scan.
 */
const stripComments = (src, html) => {
  const out = src.split('');
  const blank = (a, b) => {
    for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (html && src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      const end = e < 0 ? n : e + 3;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '/' && d === '/') {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? n : e;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '/' && d === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === "'" || c === '"') {
      const eol = src.indexOf('\n', i);
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      if (j < n && src[j] === c && (eol < 0 || j < eol)) {
        i = j + 1;
        continue;
      }
      i++;
      continue;
    }
    if (c === '`') {
      // skip to the closing backtick, descending into ${ } expressions
      let j = i + 1;
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') j += 2;
        else if (src[j] === '$' && src[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (j < n && depth) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
          }
        } else j++;
      }
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join('');
};

/** Text of a balanced (...) group starting at the '(' index. */
const parenGroup = (s, open) => {
  let depth = 0;
  for (let j = open; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')' && --depth === 0) return s.slice(open + 1, j);
  }
  return s.slice(open + 1);
};

// ---------------------------------------------------------------------------------- lint
const issues = [];
let suppressed = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const ext = extname(file);
  const isHtml = ext === '.html' || ext === '.htm';
  const isCss = ext === '.css';
  const isScript = !isHtml && !isCss;
  const rel = relative(process.cwd(), file) || file;
  const norm = file.split(sep).join('/');
  const isAnim = /(^|\/)lib\/anim\.(ts|js|mjs)$/.test(norm) || /(^|\/)motion\.js$/.test(norm);
  const isTokens = tokensPath && resolve(file) === tokensPath;
  const code = isCss ? stripComments(raw, false) : stripComments(raw, isHtml);
  const lines = raw.split('\n');
  const lineStarts = [0];
  for (let k = 0; k < raw.length; k++) if (raw[k] === '\n') lineStarts.push(k + 1);
  const pos = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 };
  };
  const report = (idx, rule, severity, message) => {
    if (opt.allow.has(rule) || [...opt.allow].some((a) => a.endsWith('*') && rule.startsWith(a.slice(0, -1)))) return;
    const { line, col } = pos(idx);
    const here = lines[line - 1] ?? '';
    const prev = lines[line - 2] ?? '';
    if (/lint-ok\s*:\s*\S/.test(here) || /lint-ok\s*:\s*\S/.test(prev)) {
      suppressed++;
      return;
    }
    if (issues.some((x) => x.file === rel && x.line === line && x.rule === rule && x.message === message)) return;
    issues.push({ file: rel, line, col, rule, severity, message, excerpt: here.trim().slice(0, 140) });
  };
  const each = (re, fn) => {
    for (const m of code.matchAll(re)) fn(m, m.index);
  };

  // --- css-animation
  if (!isScript) {
    each(/(?<![\w-])(transition|animation)(-[a-z-]+)?\s*:/g, (m, i) =>
      report(i, 'css-animation', 'error', `CSS ${m[1]} runs on wall-clock time, not the render clock; drive it from the frame`),
    );
  } else {
    // a style key with a literal value: transition: 'opacity 0.3s', animationName: 'spin'
    each(/(?<![\w$.])(transition|animation)([A-Z]\w*)?\s*:\s*['"`]/g, (m, i) =>
      report(i, 'css-animation', 'error', `style ${m[1]}${m[2] ?? ''} runs on wall-clock time, not the render clock; drive it from the frame`),
    );
    // CSS text inside a string or template: 'transition: all 300ms', `animation: spin 2s`
    each(/(?<![\w-])(transition|animation)(-[a-z-]+)?\s*:\s*[^;'"`\n]*?\d*\.?\d+m?s\b/g, (m, i) =>
      report(i, 'css-animation', 'error', `CSS ${m[1]} in a string runs on wall-clock time; drive it from the frame`),
    );
  }
  each(/@keyframes\b/g, (m, i) => report(i, 'css-animation', 'error', '@keyframes do not follow the render clock; animate from the frame'));
  each(/\bclass(?:Name)?\s*=\s*(?:\{\s*)?["'`]([^"'`]*)["'`]/g, (m, i) => {
    const bad = m[1].split(/\s+/).find((c) => /^(animate|transition)(-|$)/.test(c));
    if (bad) report(i, 'css-animation', 'error', `utility class ${bad} animates in real time, not per frame`);
  });

  // --- nondeterminism
  each(/\bMath\.random\s*\(/g, (m, i) => report(i, 'nondeterminism', 'error', 'Math.random differs per render and per tab; use rand(seed) or random(seed)'));
  each(/\b(Date\.now|performance\.now)\s*\(/g, (m, i) => report(i, 'nondeterminism', 'error', `${m[1]} reads wall-clock time; derive everything from the frame`));
  each(/\bnew\s+Date\s*\(\s*\)/g, (m, i) => report(i, 'nondeterminism', 'error', 'new Date() reads wall-clock time; pass a fixed date'));

  // --- will-change-blur
  if (isScript || isCss) {
    const animatedBlur = /blur\(\s*\$\{|blur\(\s*['"`]?\s*\+|blur\([^)]*\$\{/.test(code) || /filter\s*:\s*[^'"`,}\n]*\bblur\b/.test(code);
    if (animatedBlur)
      each(/\b(willChange|will-change)\s*:/g, (m, i) => report(i, 'will-change-blur', 'error', 'will-change in a file that animates blur(): compositor promotion leaves stale ghost frames'));
  }

  // --- frame-left-top: identifiers derived from useCurrentFrame()
  if (isScript) {
    const tainted = new Set(['frame']);
    for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useCurrentFrame\s*\(/g)) tainted.add(m[1]);
    const decls = [...code.matchAll(/\b(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([^;]+?)(?:;|\n\s*(?:const|let|var|return|export|\}))/gs)];
    for (let pass = 0; pass < 6; pass++) {
      let grew = false;
      for (const [, lhs, rhs] of decls) {
        const ids = rhs.match(/[A-Za-z_$][\w$]*/g) ?? [];
        if (!ids.some((id) => tainted.has(id))) continue;
        for (const name of lhs.match(/[A-Za-z_$][\w$]*/g) ?? []) if (!tainted.has(name)) (tainted.add(name), (grew = true));
      }
      if (!grew) break;
    }
    each(/(?<![\w$.-])(left|top|right|bottom|marginLeft|marginTop)\s*:\s*([^,}\n]+)/g, (m, i) => {
      const val = m[2];
      if (/^\s*(number|string|boolean|undefined|null)\b/.test(val)) return; // type annotation
      const ids = (val.match(/[A-Za-z_$][\w$]*/g) ?? []).filter((id) => !/^(Math|px|em|calc)$/.test(id));
      const hitId = ids.find((id) => tainted.has(id));
      if (hitId) report(i, 'frame-left-top', 'error', `${m[1]} follows the frame (via ${hitId}): fractional layout offsets snap to whole pixels; move it into transform: translate()`);
    });
  }

  // --- raw easing / springs outside lib/anim
  if (!isAnim && (isScript || isCss)) {
    each(/\bEasing\.(bezier|spring|elastic|bounce|back|poly|sin|circle|exp|quad|cubic)\s*\(/g, (m, i) =>
      report(i, 'raw-easing', 'error', `Easing.${m[1]} outside lib/anim.ts: add a named token to E (one house motion system)`),
    );
    each(/cubic-bezier\s*\(/g, (m, i) => report(i, 'raw-easing', 'error', 'raw cubic-bezier: use a named easing token'));
    each(/\{[^{}]*\bdamping\s*:[^{}]*\bstiffness\s*:[^{}]*\}|\{[^{}]*\bstiffness\s*:[^{}]*\bdamping\s*:[^{}]*\}/g, (m, i) =>
      report(i, 'spring-config', 'error', 'inline spring config: add a named preset to SPR in lib/anim.ts and use it'),
    );
  }

  // --- interpolate without clamp
  if (isScript) {
    each(/(?<![\w$])interpolate\s*\(/g, (m, i) => {
      const args = parenGroup(code, i + m[0].length - 1);
      const left = /extrapolateLeft\s*:\s*['"]clamp['"]/.test(args);
      const right = /extrapolateRight\s*:\s*['"]clamp['"]/.test(args);
      if (left && right) return;
      if (/\bclamp\b|CLAMP/i.test(args.replace(/['"]clamp['"]/g, ''))) return; // options object from a named constant
      report(i, 'interpolate-clamp', 'error', `interpolate() extends past its range by default (${left ? 'right' : right ? 'left' : 'both sides'} unclamped); use tw()/prog() or clamp both sides`);
    });
  }

  // --- colours
  // the :root blocks of a tokens-less (HyperFrames) project declare the palette
  const rootSpans = !tokensPath && (isHtml || isCss) ? [...raw.matchAll(ROOT_BLOCK_RE)].map((m) => [m.index, m.index + m[0].length]) : [];
  if (!isTokens) {
    each(HEX_RE, (m, i) => {
      if (rootSpans.some(([a, b]) => i >= a && i < b)) return;
      const prev = code.slice(Math.max(0, i - 5), i);
      if (/url\($/.test(prev) || /&$/.test(prev)) return;
      const q = code[i - 1];
      if (isScript && !/['"`\s:(,]/.test(q)) return;
      if (isHtml && /href\s*=\s*["']$|id\s*=\s*["']$/.test(code.slice(Math.max(0, i - 10), i))) return;
      if (!paletteName) return;
      if (!tokenHex.has(normHex(m[0])))
        report(i, 'off-token-color', 'error', `${m[0]} is not a brand token (${paletteName}); add it there with its job, or use an existing token`);
    });
    each(/\b(rgba?|hsla?|oklch|oklab|lab|lch)\(\s*([^)]*)\)/g, (m, i) => {
      const nums = m[2].split(/[\s,/]+/).filter(Boolean);
      if (/^rgba?$/.test(m[1]) && nums.length >= 3) {
        const rgb = nums.slice(0, 3).map(Number);
        if (rgb.every((v) => v === 0) || rgb.every((v) => v === 255)) return; // black/white shadows and veils
      }
      if (/\$\{/.test(m[2])) return; // built from tokens at runtime
      report(i, 'off-token-color', 'warn', `colour literal ${m[0].slice(0, 40)}: prefer a token (pure black/white alphas for shadows are fine)`);
    });
  }

  // --- italic / serif
  each(/fontStyle\s*:\s*['"`](italic|oblique)|font-style\s*:\s*(italic|oblique)/g, (m, i) =>
    report(i, 'italic', 'error', 'italic/oblique: emphasis comes from size or motion (allow with --allow italic if the brand uses it)'),
  );
  each(/<(i|em)(\s[^>]*)?>/g, (m, i) => report(i, 'italic', 'error', `<${m[1]}> renders italic; use a weight or size change`));
  each(/(fontFamily|font-family|family)\s*[:=][^\n;]*/g, (m, i) => {
    if (/(?<!sans-)\bserif\b/.test(m[0].replace(/sans-serif/g, ''))) report(i, 'serif', 'error', 'serif family: one well-made sans unless the brand calls for a serif (--allow serif)');
  });
  each(/@fontsource(-variable)?\/[\w-]*serif[\w-]*/g, (m, i) => {
    if (!/sans/.test(m[0])) report(i, 'serif', 'warn', `${m[0]}: a serif face; fine only if the brand calls for it`);
  });

  // --- gradients
  each(/(repeating-)?(linear|radial|conic)-gradient\s*\(/g, (m, i) => {
    const body = parenGroup(code, i + m[0].length - 1);
    const colors = [];
    let dynamic = false;
    const withTokens = body.replace(/\$\{\s*(?:[A-Za-z_$][\w$]*\.)?([A-Za-z_$][\w$]*)\s*\}/g, (_, name) => {
      if (tokenByName.has(name)) return tokenByName.get(name);
      dynamic = true;
      return '';
    });
    for (const c of withTokens.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(([^)]*)\)|\btransparent\b|var\(--([\w-]+)\)/g)) {
      if (c[0] === 'transparent') colors.push({ rgb: null, a: 0 });
      else if (c[0].startsWith('#')) {
        const x = c[0].slice(1);
        const a = x.length === 8 ? parseInt(x.slice(6), 16) / 255 : x.length === 4 ? parseInt(x[3] + x[3], 16) / 255 : 1;
        colors.push({ rgb: rgbOf(c[0]), a });
      } else if (c[2]) {
        const hex = tokenByName.get(c[2]);
        if (hex) colors.push({ rgb: rgbOf(hex), a: 1 });
        else dynamic = true;
      } else {
        const v = c[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        colors.push({ rgb: v.slice(0, 3), a: v.length > 3 ? v[3] : 1 });
      }
    }
    if (colors.length < 2) return;
    const chromatic = colors.filter((c) => c.rgb && c.a > 0.05).map((c) => oklch(c.rgb)).filter((c) => c.C > 0.04);
    if (chromatic.length >= 2) {
      const hs = chromatic.map((c) => c.h).sort((a, b) => a - b);
      let maxGap = 360 - hs[hs.length - 1] + hs[0];
      for (let k = 1; k < hs.length; k++) maxGap = Math.max(maxGap, hs[k] - hs[k - 1]);
      const spread = 360 - maxGap;
      if (spread > 40) report(i, 'gradient-multihue', 'error', `gradient spans ${Math.round(spread)} degrees of hue: the generated look; use one hue (or a tonal field in the palette)`);
    }
    const opaque = colors.filter((c) => c.rgb && c.a >= 0.99);
    if (!dynamic && opaque.length === colors.length && opaque.length >= 2) {
      const ls = opaque.map((c) => luma(c.rgb));
      const span = Math.max(...ls) - Math.min(...ls);
      if (span > 0 && span < 30)
        report(i, 'gradient-low-span', 'warn', `gradient spans only ${span.toFixed(0)} code values: 8-bit CSS gradients band; use a dithered PNG (scripts/dither-gradient.py)`);
    }
  });

  // --- premount (4.0.529: premounting only runs outside renders, and never with layout="none")
  each(/premountFor\s*=/g, (m, i) => {
    const tagStart = code.lastIndexOf('<', i);
    const tagEnd = code.indexOf('>', i);
    const tag = code.slice(tagStart, tagEnd < 0 ? undefined : tagEnd);
    if (/layout\s*=\s*(\{\s*)?['"]none['"]/.test(tag)) report(i, 'premount', 'warn', 'premountFor is silently ignored with layout="none" (and in every render); remove it');
    else report(i, 'premount', 'warn', 'premountFor does nothing in a render (it only hides preview loading); remove it unless the Studio needs it');
  });

  // --- in-browser motion blur, remote fonts
  each(/\b(CameraMotionBlur|HtmlInCanvasMotionBlur|Trail)\b/g, (m, i) => {
    if (!/@remotion\/motion-blur/.test(code)) return;
    report(i, 'inbrowser-blur', 'warn', `${m[1]} accumulates in 8 bits inside Chromium (rings, tints); render the blur with scripts/render.sh --blur`);
  });
  each(/@remotion\/[\w-]+-fonts\b|@import\s+url\(\s*['"]?https?:|<link[^>]+href\s*=\s*['"]https?:[^'"]*(css|font)/g, (m, i) =>
    report(i, 'remote-font', 'warn', 'fonts fetched at render time: ship local variable fonts (@fontsource-variable/*) behind FontGate'),
  );

  // --- placeholder brand (markers live in comments, so scan the raw source)
  for (const m of raw.matchAll(/cinetic:placeholder\b/g))
    report(
      m.index,
      'placeholder',
      'error',
      "the starter's stand-in brand is still here: invent the film's brand (or apply the user's) per references/brand-and-color.md - palette, mark and name - then delete this marker",
    );

  // --- HyperFrames
  if (isHtml || (isScript && /gsap|timeline\(/.test(code))) {
    each(/\.from\s*\(/g, (m, i) => {
      if (/(Array|Buffer|Object|Set|Map)\.from/.test(code.slice(Math.max(0, i - 7), i + 5))) return;
      report(i, 'hf-from', 'error', 'gsap .from() captures the current DOM state and breaks on seek; use .fromTo()');
    });
    each(/repeat\s*:\s*-1\b/g, (m, i) => report(i, 'hf-repeat', 'error', 'repeat: -1 has no end: seek-driven renders need finite repeats'));
  }
  if (isHtml) {
    each(/<br\s*\/?>/gi, (m, i) => report(i, 'hf-br', 'error', '<br> breaks the line layout rules; use separate line elements'));
    each(/<audio\b[^>]*>/gi, (m, i) => {
      if (!/\bid\s*=/.test(m[0])) report(i, 'hf-audio-id', 'error', '<audio> needs an id');
    });
  }
}

// ---------------------------------------------------------------------------------- report
const errors = issues.filter((x) => x.severity === 'error').length;
const warnings = issues.length - errors;
const failed = errors > 0 || (opt.strict && warnings > 0);
if (opt.json) {
  console.log(
    JSON.stringify(
      { tool: 'lint-film', root: relative(process.cwd(), root) || '.', tokens: paletteName, files: files.length, errors, warnings, suppressed, pass: !failed, issues },
      null,
      1,
    ),
  );
} else {
  for (const x of issues) console.log(`${x.file}:${x.line}:${x.col}  ${x.severity === 'error' ? 'error' : 'warn '}  ${x.rule}  ${x.message}\n    ${x.excerpt}`);
  if (!paletteName) console.log('note: no tokens file or :root palette found; off-token colours were not checked (pass --tokens)');
  console.log(`lint-film: ${files.length} files, ${errors} errors, ${warnings} warnings${suppressed ? `, ${suppressed} suppressed` : ''} -> ${failed ? 'FAIL' : 'pass'}`);
}
process.exit(failed ? 1 : 0);
