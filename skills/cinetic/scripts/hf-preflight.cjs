#!/usr/bin/env node
/**
 * hf-preflight.cjs: the preflight of hf-finish.sh, which runs it before anything renders.
 *
 * Checks the composition root against motion.js and timeline.js (data-duration = TOTAL / FPS,
 * data-fps, size), checks that every @font-face url and local <script src> the render mounts (the
 * entry and compositions/**) is on disk, and with CUES_OUT set writes FILM.cues() there. Problems
 * go to stderr. stdout is one line of shell assignments that hf-finish.sh evals:
 *   P_DUR=5 P_ROOTFPS=60 P_W=1920 P_H=1080 P_TLFPS=60 P_TOTAL=300 P_ERR=0
 *
 * Env: PROJ (absolute project folder), ENTRY (the html file in it), CUES_OUT (optional path).
 * It is a file of its own because bash 3.2 (macOS's /bin/bash) cannot parse a heredoc inside
 * $( ), and .cjs because it uses require() whatever "type" the project's package.json declares.
 * It has no CLI of its own: with --help, or without PROJ and ENTRY, it says so and exits 2.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
if (process.argv.slice(2).some((a) => a === '--help' || a === '-h') || !process.env.PROJ || !process.env.ENTRY) {
  console.error('hf-preflight.cjs: internal helper of hf-finish.sh, which sets its environment (PROJ, ENTRY, optional CUES_OUT).\n'
    + 'Run the preflight through hf-finish.sh instead: bash scripts/hf-finish.sh --help');
  process.exit(2);
}
const dir = process.env.PROJ, entry = process.env.ENTRY, cuesOut = process.env.CUES_OUT;
const errs = [], warn = [];
const html = fs.readFileSync(path.join(dir, entry), 'utf8');
const rootTag = (html.match(/<[a-z][^>]*\bdata-composition-id\s*=[^>]*>/is) || [''])[0];
const attr = (n) => { const m = rootTag.match(new RegExp('\\b' + n + '\\s*=\\s*["\']([^"\']*)["\']', 'i')); return m ? m[1] : ''; };
const v = { dur: attr('data-duration'), rootFps: attr('data-fps'), w: attr('data-width'), h: attr('data-height') };
if (!rootTag) errs.push(`${entry}: no element with data-composition-id`);
let film = null, motion = null;
const mj = path.join(dir, 'motion.js'), tj = path.join(dir, 'timeline.js');
if (fs.existsSync(mj) && fs.existsSync(tj)) {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  try {
    vm.runInContext(fs.readFileSync(mj, 'utf8'), ctx, { filename: mj });
    vm.runInContext(fs.readFileSync(tj, 'utf8'), ctx, { filename: tj });
    film = ctx.FILM; motion = ctx.MOTION;
  } catch (e) { errs.push(`timeline.js/motion.js failed to load: ${e.message}`); }
}
if (film && motion) {
  const want = film.TOTAL / motion.FPS;
  if (v.dur === '') errs.push(`root data-duration is missing; set it to ${want} (TOTAL ${film.TOTAL} f / ${motion.FPS} fps)`);
  else if (Math.abs(+v.dur - want) > 1e-6) errs.push(`root data-duration="${v.dur}" but TOTAL/FPS = ${want} s; the render would cut or freeze. Make them equal.`);
  if (v.rootFps && +v.rootFps !== motion.FPS) errs.push(`root data-fps="${v.rootFps}" but motion.js FPS = ${motion.FPS}`);
  if (v.w && +v.w !== motion.W || v.h && +v.h !== motion.H) warn.push(`root is ${v.w}x${v.h} but motion.js says ${motion.W}x${motion.H}`);
  if (cuesOut) {
    if (typeof film.cues !== 'function') errs.push('timeline.js has no FILM.cues()');
    else {
      fs.mkdirSync(path.dirname(path.resolve(cuesOut)), { recursive: true });
      fs.writeFileSync(path.resolve(cuesOut), JSON.stringify(film.cues(), null, 1));
    }
  }
} else if (cuesOut) errs.push('--export-cues needs motion.js and timeline.js in the project');
// every html the render mounts: the entry plus compositions/**
const files = [path.join(dir, entry)];
const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) files.push(p); } };
walk(path.join(dir, 'compositions'));
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const face of src.match(/@font-face\s*\{[^}]*\}/gi) || []) {
    for (const m of face.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const u = m[1];
      if (/^(data:|https?:|local\()/i.test(u)) { if (/^https?:/i.test(u)) warn.push(`${path.relative(dir, f)}: remote font ${u} fails offline; ship a local woff2`); continue; }
      if (!fs.existsSync(path.join(dir, u.replace(/^\//, '')))) errs.push(`${path.relative(dir, f)}: font file ${u} is missing (see fonts/README.md; npm install runs setup.mjs)`);
    }
  }
  for (const m of src.matchAll(/<script[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const u = m[1];
    if (/^https?:|^\/\//i.test(u)) { warn.push(`${path.relative(dir, f)}: remote script ${u}; renders need network (vendor it locally)`); continue; }
    if (!fs.existsSync(path.join(dir, u.replace(/^\//, '')))) errs.push(`${path.relative(dir, f)}: script ${u} is missing (npm install runs setup.mjs)`);
  }
}
for (const w of warn) console.error('hf-finish: warning: ' + w);
for (const e of errs) console.error('hf-finish: ' + e);
const num = (x) => (x === '' || x === undefined || x === null || isNaN(+x) ? '' : String(+x));
console.log(`P_DUR=${num(v.dur)} P_ROOTFPS=${num(v.rootFps)} P_W=${num(v.w || (motion && motion.W))} P_H=${num(v.h || (motion && motion.H))} P_TLFPS=${num(motion && motion.FPS)} P_TOTAL=${num(film && film.TOTAL)} P_ERR=${errs.length}`);
