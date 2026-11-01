#!/usr/bin/env node
// new-film.mjs: the body of scripts/new-film.sh, which is the command to run (bash scripts/new-film.sh --help).
//
// new-film.sh used to make about a hundred shell calls (sed, grep, node -e, cp, a subshell per value), and on a busy
// Windows laptop every one of them costs one to four seconds: a scaffold took four to seven minutes. Here the work is
// one node process in two stages around new-film.sh's own copy of scripts/ (one tar):
//   --stage 1   check the arguments, copy the starter and the template, write film.json, src/recent.ts, the name, the
//               grid constants, package.json, .gitignore and the data files the scripts read; leaves DIR in --state
//   --stage 2   node_modules (link or install), fonts, the type family and the type pairing (type-deal.ts, seeded by
//               the name), a brand kit, a clip to borrow from, the music, then the next steps
// Both stages take new-film.sh's arguments as they are. --help prints new-film.sh's usage.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { findPython } from './py.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const SH = path.join(HERE, 'new-film.sh');
const isWin = process.platform === 'win32';
// the scaffold's start: new-film.sh passes its own (bash 5's EPOCHREALTIME), else this process's
const T0 = Number(process.env.CINETIC_NF_T0) > 0 ? Number(process.env.CINETIC_NF_T0) * 1000 : Date.now();

const usage = () => {
  const lines = fs.readFileSync(SH, 'utf8').split('\n');
  const end = lines.findIndex((l) => l.startsWith('set -euo'));
  console.log(lines.slice(1, end).map((l) => l.replace(/^# ?/, '')).join('\n'));
};
const die = (msg) => { console.error(`new-film: ${msg}`); process.exit(1); };
const warn = (msg) => console.error(`new-film: warning: ${msg}`);
const say = (msg) => console.log(msg);

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) { usage(); process.exit(0); }

// ---------------------------------------------------------------------------------------------- arguments
const o = {
  stage: '', state: '', dir: '', engine: 'remotion', fps: '30', bpm: '', pace: '', type: '', size: '1920x1080', name: '',
  link: '', browser: process.env.CHROMIUM_PATH || '', install: true, force: false, format: 'launch', template: '',
  brands: [], like: '', fonts: [], music: '', record: '', profile: '', analyze: true, add: [], mood: '',
  nameSet: false, bpmSet: false,
};
const ADD_FLAGS = new Set(['--title', '--artist', '--source', '--page', '--licence', '--seen-quote', '--seen-url', '--seen-date', '--credit', '--file-url',
  '--content-id', '--licence-url', '--limits', '--ai-generated', '--vocals', '--certificate', '--modifications']);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const val = (what) => {
    const v = argv[i + 1];
    if (v === undefined || v === '') die(`${a} needs ${what}`);
    i++;
    return v;
  };
  switch (a) {
    case '--stage': o.stage = val('1 or 2'); break;
    case '--state': o.state = val('a file'); break;
    case '--engine': o.engine = val('a value'); break;
    case '--fps': o.fps = val('a value'); break;
    case '--bpm': o.bpm = val('a value'); o.bpmSet = true; break;
    case '--pace': o.pace = val('calm or crisp'); break;
    case '--type': o.type = val('calm or bold'); break;
    case '--size': o.size = val('a value'); break;
    case '--name': o.name = val('a value'); o.nameSet = true; break;
    case '--mood': o.mood = val('a mood (type-deal.ts --list)'); break;
    case '--format': o.format = val('launch or update'); break;
    case '--template': o.template = val('a name (a folder in assets/templates)'); break;
    case '--brand': o.brands.push(val('a kit folder or file')); break;
    case '--like': o.like = val('a clip'); break;
    case '--link-modules': o.link = val('a path'); break;
    case '--browser': o.browser = val('a path'); break;
    case '--font': o.fonts.push(val('a family name or package')); break;
    case '--no-install': o.install = false; break;
    case '--music': o.music = val('a track file'); break;
    case '--record': o.record = val('a licence record'); break;
    case '--profile': o.profile = val('calm, crisp or punchy'); break;
    case '--no-analyze': o.analyze = false; break;
    case '--force': o.force = true; break;
    default:
      if (ADD_FLAGS.has(a)) { o.add.push(a, val('a value')); break; }
      if (a.startsWith('-')) die(`unknown option ${a} (see --help)`);
      if (o.dir) die(`one target directory only (got '${o.dir}' and '${a}')`);
      o.dir = a;
  }
}
if (o.stage !== '1' && o.stage !== '2') die('new-film.mjs is run by new-film.sh (bash scripts/new-film.sh --help)');

// ---------------------------------------------------------------------------------------------- shared helpers
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);
const rel = (p) => p.split(path.sep).join('/');
// a Python step: the interpreter py.mjs finds ($PYTHON when set), with the arguments as given
let PY = null;
const py = (args, opts = {}) => {
  PY = PY || findPython({ numpy: opts.numpy ?? true, quiet: true });
  if (!PY) return { status: 127, stdout: '', stderr: 'no Python 3.10+ found (install Python 3.11+, or set PYTHON)' };
  const [exe, ...pre] = PY;
  return spawnSync(exe, [...pre, ...args], { encoding: 'utf8', stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', cwd: opts.cwd, env: opts.env || process.env, input: opts.input });
};
// the command form the printed next steps use: node scripts/py.mjs (it honours $PYTHON)
const PYS = 'node scripts/py.mjs';

const SRC = path.join(SKILL, 'assets', `${o.engine}-starter`);
let TPL = '';
let template = o.template;
let manifest = null;
const tplKey = (k) => (manifest && typeof manifest[k] === 'string' ? manifest[k] : '');

function settle() {
  if (o.engine !== 'remotion' && o.engine !== 'hyperframes') die('--engine must be remotion or hyperframes');
  if (!/^\d+$/.test(o.fps) || +o.fps <= 0) die('--fps must be a positive integer');
  if (o.pace && o.pace !== 'calm' && o.pace !== 'crisp') die('--pace must be calm or crisp');
  if (o.type && o.type !== 'calm' && o.type !== 'bold') die('--type must be calm or bold');
  if (!exists(SRC)) die(`starter not found: ${SRC}`);
  if (o.format !== 'launch' && o.format !== 'update') die('--format must be launch or update');
  if (o.format === 'update' && !template) template = 'update';
  // a launch is the simple launch unless a template is named (none: the starter's own acts); HyperFrames has no template
  if (o.format === 'launch' && !template && o.engine === 'remotion') template = 'launch-simple';
  if (template === 'none') template = '';
  if (o.format === 'update' && template !== 'update') die(`--format update is the update template: pass --format update or --template ${template}, not both`);
  if (template) {
    if (!/^[a-z0-9-]+$/.test(template)) die('--template takes a template\'s folder name (letters, digits, dashes)');
    TPL = path.join(SKILL, 'assets', 'templates', template);
    if (!exists(path.join(TPL, 'template.json'))) {
      const avail = fs.readdirSync(path.join(SKILL, 'assets', 'templates')).filter((d) => exists(path.join(SKILL, 'assets', 'templates', d, 'template.json')));
      die(`no template '${template}' (assets/templates has: ${avail.join(' ')})`);
    }
    if (o.engine !== 'remotion') die(`--template ${template} is a Remotion template (use --engine remotion)`);
    try { manifest = readJson(path.join(TPL, 'template.json')); } catch { die(`${template}/template.json does not parse as JSON`); }
    if (!o.pace) o.pace = tplKey('pace') || 'crisp';
    const tfam = tplKey('type_family');
    if (tfam && tfam !== 'calm' && tfam !== 'bold') die(`${template}/template.json: type_family must be calm or bold (got ${tfam})`);
    if (!o.type) o.type = tfam;
  }
  if (o.type && o.engine !== 'remotion') die('--type is a Remotion option (the HyperFrames starter keeps its own type)');
  for (const kit of o.brands) if (!exists(kit)) die(`--brand: ${kit} not found`);
  if (o.like && !exists(o.like)) die(`--like: ${o.like} not found`);
  if (!o.bpm) {
    // the starter's own tempo (the template's with --template), unless the pace asks for the crisp one
    let grid = o.engine === 'hyperframes' ? path.join(SRC, 'motion.js') : path.join(SRC, 'src', 'timeline.ts');
    if (TPL) grid = path.join(TPL, 'src', 'timeline.ts');
    const m = /^[ \t]*(?:export )?const BPM = ([0-9.]+);/m.exec(fs.readFileSync(grid, 'utf8'));
    o.bpm = m ? m[1] : '';
    if (o.pace === 'crisp' && !TPL) o.bpm = '120'; // a template keeps its own tempo
    if (!o.bpm) die(`could not read BPM from ${grid}; pass --bpm`);
  }
  if (!/^\d+(\.\d+)?$/.test(o.bpm)) die('--bpm must be a number');
  const sz = /^(\d+)x(\d+)$/.exec(o.size);
  if (!sz) die('--size must look like 1920x1080');
  o.W = +sz[1]; o.H = +sz[2];
  if (o.W % 2 || o.H % 2) die('--size must be even in both dimensions (yuv420p needs it)');
  if (o.music) {
    if (!exists(o.music)) die(`--music: ${o.music} not found`);
    if (!o.record && !o.add.length) die('--music needs its licence: --record <licence.json>, or --title --artist --source --page --licence --seen-quote --seen-url (read on the item\'s own page)');
    if (o.record && !exists(o.record)) die(`--record: ${o.record} not found`);
    if (!o.record) for (const need of ['--title', '--artist', '--source', '--page', '--licence', '--ai-generated', '--vocals'])
      if (!o.add.includes(need)) die(`--music needs ${need} (as the item's own page says; --ai-generated and --vocals are no or yes): the licence record is refused without it`);
    if (o.profile && !/^(calm|crisp|punchy)$/.test(o.profile)) die('--profile must be calm, crisp or punchy');
  }
  // The whole system assumes a beat is a whole number of frames: cues on the grid, sound on the frame. With a track the
  // tempo is the track's (src/music.ts gives b() its fractional frames). The starter's own tempo is a placeholder: at an
  // fps where it gives no whole beat, take the nearest one that does.
  const fps = +o.fps;
  const whole = (b) => Math.abs(60 * fps / b - Math.round(60 * fps / b)) < 1e-9;
  if (!o.music && !whole(+o.bpm)) {
    const ok = [];
    let near = '';
    for (let b = 60; b <= 200; b++) if (Number.isInteger(60 * fps / b)) { ok.push(`${b} (${60 * fps / b} f)`); if (near === '' || Math.abs(b - o.bpm) < Math.abs(near - o.bpm)) near = b; }
    if (!o.bpmSet && near !== '') {
      if (o.stage === '1') console.error(`new-film: at ${fps} fps the starter's ${o.bpm} BPM gives no whole beat: using ${near} BPM (${60 * fps / near} f), a placeholder until track.py grid writes the track's grid (or pass --bpm)`);
      o.bpm = String(near);
    } else die(`at ${fps} fps, ${o.bpm} BPM gives a beat of ${(60 * fps / o.bpm).toFixed(3)} frames. Pick a BPM with a whole beat: ${ok.join(', ')}`);
  }
}

if (!o.dir) { usage(); die('missing <dir>'); }
settle();

// ---------------------------------------------------------------------------------------------- stage 1
function stage1() {
  let DIR = path.resolve(o.dir);
  if (exists(DIR)) {
    if (!fs.statSync(DIR).isDirectory()) die(`${o.dir} exists and is not a directory`);
    if (fs.readdirSync(DIR).length && !o.force) die(`${o.dir} is not empty (use --force to copy into it anyway)`);
  }
  if (!o.name) o.name = path.basename(DIR);
  const pkg = o.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-._]+/, '').replace(/-+$/, '') || 'film';
  fs.mkdirSync(DIR, { recursive: true });
  DIR = fs.realpathSync(DIR);
  // the starter, leaving out anything installed or rendered
  const skip = new Set(['node_modules', 'out', '__pycache__']);
  fs.cpSync(SRC, DIR, { recursive: true, force: true, filter: (s) => !skip.has(path.basename(s)) || s === SRC });
  // a template: its files over the starter (its timeline, acts, film and sound), the starter's own acts removed
  if (TPL) {
    const keep = new Set(manifest.keep_if_present || []); // a brand already written into this folder (--force) stays
    for (const f of manifest.copy) {
      if (keep.has(f) && exists(path.join(DIR, f))) continue;
      fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true });
      fs.copyFileSync(path.join(TPL, f), path.join(DIR, f));
    }
    for (const f of manifest.remove) fs.rmSync(path.join(DIR, f), { force: true });
    say(`new-film: ${manifest.name} template: ${manifest.copy.length} files over the starter, ${manifest.remove.length} removed`);
  }
  // the product's name, first: everything dealt after this (the type pairing, a template's deal) follows it. Without a
  // kit, the template's name slot gets it (the slot otherwise stays '[Product]', marked cinetic:placeholder).
  const idf = path.join(DIR, 'src', 'brand', 'identity.ts');
  if (o.nameSet && !o.brands.length && exists(idf))
    fs.writeFileSync(idf, `// The product name as it is written (new-film.sh --name; scripts/brand.py --name writes it from a brand kit).\nexport const IDENTITY = { name: ${JSON.stringify(o.name)}, supplied: false } as const;\n`);

  // film.json: the devices this film declares and the last three films' devices to stay away from (the film history,
  // ~/.cinetic/film-history.json or $CINETIC_FILM_HISTORY, written by film-diff.mjs --record). A template with
  // src/recent.ts gets those films' dealt choices and creative sets, so its deal leaves them out while another is free.
  const histFile = process.env.CINETIC_FILM_HISTORY || path.join(os.homedir(), '.cinetic', 'film-history.json');
  let hist = [];
  try { hist = readJson(histFile).filter((h) => h && h.devices).slice(0, 3); } catch { /* a first film */ }
  const fj = path.join(DIR, 'film.json');
  if (!exists(fj)) {
    const devices = { ground: '', voice: '', emphasis: 'colour', signature: '', moves: [], seams: [], end: '', logo: '' };
    const recent = hist.map((h) => ({ name: h.name || null, template: h.template || null, devices: h.devices }));
    fs.writeFileSync(fj, `${JSON.stringify({ template: template || null, started: new Date().toISOString(), devices, allow: [], recent }, null, 1)}\n`);
  }
  const rt = path.join(DIR, 'src', 'recent.ts');
  if (exists(rt) && hist.length) {
    const R = {};
    const creative = [];
    const hero = [];
    const text = fs.readFileSync(rt, 'utf8');
    // the slots this template remembers: the names its RECENT type declares (Record<"voice" | "ground" | ...>)
    const typed = /Record<([^,>]+),/.exec(text);
    const keys = typed ? [...typed[1].matchAll(/["']([A-Za-z]+)["']/g)].map((m) => m[1]) : ['voice', 'ground', 'seamTA', 'seamAT', 'end', 'camera'];
    for (const h of hist) {
      const pick = { ...h.devices, ...(h.deal || {}) };
      for (const k of keys) if (typeof pick[k] === 'string' && pick[k]) (R[k] = R[k] || []).push(pick[k]);
      const cr = (h.devices && h.devices.creative) || (h.deal && h.deal.creative);
      if (Array.isArray(cr) && cr.length) creative.push(cr.filter((x) => typeof x === 'string'));
      const hr = (h.devices && h.devices.hero) || (h.deal && h.deal.hero);
      if (Array.isArray(hr) && hr.length) hero.push(hr.filter((x) => typeof x === 'string'));
    }
    // the creative sets and the hero shots ride beside the typed slots (deal.ts reads RECENT.creative and RECENT.hero
    // through a cast), newest first, so the template's own deal weighs the last films' shots down
    const extra = { ...(creative.length ? { creative } : {}), ...(hero.length ? { hero } : {}) };
    const value = Object.keys(extra).length ? `Object.assign(${JSON.stringify(R)}, ${JSON.stringify(extra)})` : JSON.stringify(R);
    fs.writeFileSync(rt, text.replace(/= \{\};\s*$/, `= ${value};\n`));
  }
  if (hist.length) say(`new-film: the last ${hist.length} film(s) in the history: ${hist.map((h) => h.name || '?').join(', ')} (film.json recent; their ground, voice, signature and end card are taken)`);

  // `const NAME = value;`: the FIRST such line only (timeline.ts derives `export const BPM = MUSIC?.bpm ?? GRID_BPM;`
  // from the grid line below it, which must stay as it is)
  const setConst = (file, name, value) => {
    const src = fs.readFileSync(file, 'utf8');
    const re = new RegExp(`^((?:export )?const ${name}(?:: [^=]+)? = )[^;]+;`, 'm');
    if (!re.test(src)) die(`${rel(file)} has no 'const ${name} = ...;' line to set`);
    fs.writeFileSync(file, src.replace(re, (m, head) => `${head}${value};`));
  };
  const pj = path.join(DIR, 'package.json');
  if (o.engine === 'remotion') {
    const tl = path.join(DIR, 'src', 'timeline.ts');
    setConst(tl, 'FPS', o.fps); setConst(tl, 'BPM', o.bpm); setConst(tl, 'W', o.W); setConst(tl, 'H', o.H);
    if (o.pace) setConst(tl, 'PACE_NAME', `'${o.pace}'`);
    fs.writeFileSync(pj, fs.readFileSync(pj, 'utf8').replace(/"name": "[^"]*"/, `"name": "${pkg}"`).replace(/\d+x\d+@\d+/g, `${o.W}x${o.H}@${o.fps}`));
    if (o.browser) {
      try { fs.accessSync(o.browser, fs.constants.X_OK); } catch { warn(`--browser ${o.browser} is not an executable file here`); }
      setConst(path.join(DIR, 'remotion.config.ts'), 'PINNED_BROWSER', `'${o.browser}'`);
    }
  } else {
    // HyperFrames: the grid lives in motion.js (FPS, BPM, W, H); index.html repeats the size, fps and length on the
    // root element, the viewport meta and the html/body box. Set all of them, then derive data-duration from
    // timeline.js (TOTAL / FPS) so the render neither cuts nor freezes.
    const mj = path.join(DIR, 'motion.js');
    if (!exists(mj) || !exists(path.join(DIR, 'timeline.js')) || !exists(path.join(DIR, 'index.html'))) die('HyperFrames starter needs motion.js, timeline.js and index.html');
    let m = fs.readFileSync(mj, 'utf8');
    for (const [k, v] of [['FPS', o.fps], ['BPM', o.bpm], ['W', o.W], ['H', o.H], ...(o.pace ? [['PACE_NAME', `'${o.pace}'`]] : [])]) {
      const re = new RegExp(`^([ \\t]*const ${k} = )[^;]+;`, 'm');
      if (!re.test(m)) die(`motion.js has no 'const ${k} = ...;' line to set`);
      m = m.replace(re, `$1${v};`);
    }
    fs.writeFileSync(mj, m);
    try {
      const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
      for (const f of ['motion.js', 'timeline.js']) vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
      const { FPS } = ctx.MOTION, { TOTAL } = ctx.FILM;
      const dur = +(TOTAL / FPS).toFixed(6);
      const file = path.join(DIR, 'index.html');
      let html = fs.readFileSync(file, 'utf8');
      const root = (html.match(/<[a-z][^>]*\bdata-composition-id\s*=[^>]*>/is) || [])[0];
      if (!root) throw new Error('index.html: no element with data-composition-id');
      const old = (root.match(/\bdata-duration\s*=\s*"([^"]*)"/) || [])[1];
      const setAttr = (tag, name, v) => (new RegExp(`\\b${name}\\s*=\\s*"[^"]*"`).test(tag) ? tag.replace(new RegExp(`\\b${name}\\s*=\\s*"[^"]*"`), `${name}="${v}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${v}">`));
      let tag = root;
      for (const [n, v] of [['data-fps', FPS], ['data-width', o.W], ['data-height', o.H], ['data-duration', dur]]) tag = setAttr(tag, n, v);
      html = html.replace(root, tag);
      // clips that ran the whole film (same data-duration as the old root) keep running the whole film
      if (old !== undefined) html = html.replace(new RegExp(`(\\bdata-duration\\s*=\\s*")${old.replace('.', '\\.')}(")`, 'g'), `$1${dur}$2`);
      html = html.replace(/(<meta\s+name="viewport"\s+content=")[^"]*(")/i, `$1width=${o.W}, height=${o.H}$2`);
      html = html.replace(/(html,\s*body\s*\{[^}]*?\bwidth:\s*)\d+px/, `$1${o.W}px`).replace(/(html,\s*body\s*\{[^}]*?\bheight:\s*)\d+px/, `$1${o.H}px`);
      fs.writeFileSync(file, html);
      say(`new-film: index.html root ${o.W}x${o.H} @ ${FPS} fps, data-duration ${dur} s (TOTAL ${TOTAL} f)`);
    } catch (e) { die(`could not update index.html from motion.js/timeline.js (${e.message})`); }
    if (exists(pj)) fs.writeFileSync(pj, fs.readFileSync(pj, 'utf8').replace(/"name": "[^"]*"/, `"name": "${pkg}"`));
  }
  // score.py refuses a score whose bpm differs from the timeline's: keep audio/score.json on the grid
  const sj = path.join(DIR, 'audio', 'score.json');
  if (exists(sj)) fs.writeFileSync(sj, fs.readFileSync(sj, 'utf8').replace(/("bpm"\s*:\s*)[0-9.]+/, `$1${o.bpm}`));
  // a licensed track never enters git: the project ignores it and everything mixed from it
  const gi = path.join(DIR, '.gitignore');
  const have = exists(gi) ? fs.readFileSync(gi, 'utf8').split(/\r?\n/) : [];
  const add = ['node_modules/', 'out/*', '!out/cues.json', 'public/audio/*.wav', 'audio/music/*', '!audio/music/*.json', '!audio/music/README.md', 'out/cache/', '.DS_Store', '*.log', '__pycache__/']
    .filter((l) => !have.includes(l));
  if (add.length) fs.appendFileSync(gi, `${have.length && have[have.length - 1] !== '' ? '\n' : ''}${add.join('\n')}\n`);
  // the data files the scripts read beside themselves: the technique library (pick.py), the directions (deck.py),
  // the music shortlist (music.mjs), the checked footage picks (assets.mjs recipe reads ../assets)
  fs.mkdirSync(path.join(DIR, 'scripts'), { recursive: true });
  const lib = [path.join(SKILL, 'assets', 'library', 'techniques.json'), path.join(SKILL, 'scripts', 'library', 'techniques.json')].find(exists);
  const copies = [
    [lib, path.join(DIR, 'scripts', 'library')],
    [path.join(SKILL, 'assets', 'directions', 'directions.json'), path.join(DIR, 'scripts', 'directions')],
    [path.join(SKILL, 'assets', 'directions', 'imagery.json'), path.join(DIR, 'scripts', 'directions')],
    [path.join(SKILL, 'assets', 'music', 'shortlist.json'), path.join(DIR, 'scripts', 'music')],
    [path.join(SKILL, 'assets', 'footage-recipes.json'), path.join(DIR, 'assets')],
  ];
  for (const [from, to] of copies) if (from && exists(from)) { fs.mkdirSync(to, { recursive: true }); fs.copyFileSync(from, path.join(to, path.basename(from))); }
  fs.writeFileSync(o.state, `DIR=${shq(DIR)}\n`);
}
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// ---------------------------------------------------------------------------------------------- stage 2
async function stage2() {
  let DIR = '';
  try { DIR = /^DIR='(.*)'$/m.exec(fs.readFileSync(o.state, 'utf8'))[1].replace(/'\\''/g, "'"); } catch { die(`no stage-1 state in ${o.state}`); }
  try { fs.rmSync(o.state, { force: true }); } catch { /* ignore */ }
  if (!o.name) o.name = path.basename(DIR);
  const inDir = { cwd: DIR };
  for (const f of fs.readdirSync(path.join(DIR, 'scripts'))) if (f.endsWith('.sh')) try { fs.chmodSync(path.join(DIR, 'scripts', f), 0o755); } catch { /* ignore */ }

  if (o.link) {
    if (!exists(o.link) || !fs.statSync(o.link).isDirectory()) die(`--link-modules: ${o.link} is not a directory`);
    const nm = path.join(DIR, 'node_modules');
    fs.rmSync(nm, { recursive: true, force: true });
    const target = fs.realpathSync(o.link);
    // on Windows a directory junction (no rights needed; ln -s there copies the whole folder unless symlinks are
    // enabled), which acts like a symlink for node and npm; elsewhere a symlink
    try { fs.symlinkSync(target, nm, isWin ? 'junction' : 'dir'); } catch (e) { die(`--link-modules: could not link node_modules -> ${target} (${e.message})`); }
    if (!exists(nm)) die(`--link-modules: ${rel(nm)} was not created`);
    say(`new-film: linked node_modules -> ${o.link}`);
    // npm's postinstall does not run for a linked folder; run the starter's setup step directly
    if (exists(path.join(DIR, 'setup.mjs'))) {
      const r = spawnSync(process.execPath, ['setup.mjs'], { ...inDir, stdio: 'inherit' });
      if (r.status !== 0) warn('setup.mjs could not copy its files from the linked node_modules (npm install in the film fixes it)');
    }
  } else if (o.install && exists(path.join(DIR, 'package.json'))) {
    const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { ...inDir, stdio: 'inherit', shell: isWin });
    if (r.status !== 0) die(`npm install failed in ${DIR} (rerun it there, or use --link-modules)`);
  }
  const nodeIn = (args, opts = {}) => spawnSync(process.execPath, args, { ...inDir, stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8' });
  for (const font of o.fonts) if (nodeIn([path.join(DIR, 'scripts', 'add-font.mjs'), font, '--dir', DIR]).status !== 0) die(`--font ${font}: could not vendor it (see above)`);
  // The starter's faces come from packages; a linked node_modules made before the default face became Inter may not have it
  if (o.link) {
    const pk = new Set();
    for (const f of [path.join(DIR, 'src', 'brand', 'fonts.ts'), path.join(DIR, 'setup.mjs')])
      if (exists(f)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/@fontsource-variable\/[a-z0-9-]*/g)) pk.add(m[0]);
    for (const p of pk) if (!exists(path.join(DIR, 'node_modules', p)))
      warn(`the linked node_modules has no ${p} (the starter's face): npm i ${p} in ${o.link}, or vendor it into this film with node scripts/add-font.mjs ${p.replace('@fontsource-variable/', '')} --dir ${DIR}`);
  }

  // the type family (the template's or --type's roles into src/brand/tokens.ts), then the pairing dealt from the name
  if (o.type && nodeIn([path.join(SKILL, 'scripts', 'type-family.mjs'), o.type, '--dir', DIR]).status !== 0)
    die(`could not write the ${o.type} type family into ${rel(path.join(DIR, 'src', 'brand', 'tokens.ts'))}`);
  const tsx = (() => {
    try {
      const req = createRequire(path.join(DIR, 'package.json'));
      const pjf = req.resolve('tsx/package.json');
      const bin = readJson(pjf).bin;
      const js = path.join(path.dirname(pjf), typeof bin === 'string' ? bin : bin.tsx);
      return exists(js) ? js : null;
    } catch { return null; }
  })();
  let pairing = '';
  const dealType = o.engine === 'remotion' && exists(path.join(DIR, 'src', 'fx', 'TypePairs.ts')) && !o.brands.length;
  if (dealType) {
    const args = ['scripts/type-deal.ts', '--seed', o.name, '--quiet', ...(o.mood ? ['--mood', o.mood] : [])];
    if (tsx) {
      const r = nodeIn([tsx, ...args], { capture: true });
      if (r.status === 0) {
        try { pairing = (/\/\/ type pair: (\S+)/.exec(fs.readFileSync(path.join(DIR, 'src', 'brand', 'tokens.ts'), 'utf8')) || [])[1] || ''; } catch { /* ignore */ }
        say(`new-film: type pairing ${pairing || '(see src/brand/tokens.ts)'} dealt from the name "${o.name}" (npx tsx scripts/type-deal.ts --list; --pair <id> or --mood <m> to change it)`);
      } else warn(`type-deal.ts did not deal the pairing (${(r.stderr || r.stdout || '').trim().split('\n').pop()}): run npx tsx ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
    } else say(`new-film: deal the type pairing once node_modules is there: npx tsx scripts/type-deal.ts --seed ${JSON.stringify(o.name)}${o.mood ? ` --mood ${o.mood}` : ''}`);
  }

  // a supplied brand kit: brand.json, the tokens, the logo's parts, the screenshots (scripts/brand.py)
  if (o.brands.length) {
    const abs = o.brands.map((k) => path.resolve(k));
    const r = py(['scripts/brand.py', ...abs, '--project', '.', ...(o.nameSet ? ['--name', o.name] : [])], inDir);
    if (r.status !== 0) warn('brand.py reported a failed check (see above): fix the kit or the tokens before the build');
    let gf = '';
    try { gf = ((readJson(path.join(DIR, 'brand', 'brand.json')).fonts) || {}).google || ''; } catch { /* no kit json */ }
    if (gf && nodeIn([path.join(DIR, 'scripts', 'add-font.mjs'), gf, '--dir', DIR, '--brand-supplied']).status !== 0)
      warn(`could not vendor the brand's font ${gf} (node scripts/add-font.mjs "${gf}" --brand-supplied)`);
  }

  // a clip to borrow grammar from: its measured grammar and the rules (scripts/like.py)
  let likeFailed = false;
  if (o.like) {
    const clip = path.resolve(o.like);
    if (py(['scripts/like.py', 'measure', clip, '--out', 'out'], inDir).status !== 0) {
      likeFailed = true; // the project is made; the exit says the clip was not measured
      console.error(`new-film: error: like.py could not measure ${o.like} (needs ffmpeg, numpy, opencv-python): run ${PYS} scripts/like.py measure <clip> --out out in ${DIR}`);
    }
  }

  let TRK = '';
  if (o.music) {
    fs.mkdirSync(path.join(DIR, 'audio', 'music'), { recursive: true });
    fs.copyFileSync(o.music, path.join(DIR, 'audio', 'music', path.basename(o.music)));
    TRK = `audio/music/${path.basename(o.music)}`;
    const stem = path.basename(o.music).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const REC = `audio/music/${stem}.licence.json`;
    const TJ = `audio/music/${stem}.track.json`;
    // an analysis made beside the source file: track.py analyze keeps it when its sha256 and settings match
    const srcTj = path.join(path.dirname(o.music), `${stem}.track.json`);
    if (exists(srcTj) && !exists(path.join(DIR, TJ))) fs.copyFileSync(srcTj, path.join(DIR, TJ));
    if (o.record) {
      fs.copyFileSync(o.record, path.join(DIR, REC));
      if (py(['scripts/audio/credits.py', '--check', REC, '--track', TRK], inDir).status !== 0) die('--record: the licence record does not pass (see above)');
    } else if (py(['scripts/audio/track.py', 'add', TRK, ...o.add, '--out', REC], inDir).status !== 0) die('the licence record was refused (see above): a track the gate cannot license never goes into a film');
    if (o.analyze && py(['scripts/audio/track.py', 'analyze', TRK, ...(o.profile ? ['--profile', o.profile] : []), '--quiet'], inDir).status !== 0)
      warn('track.py analyze did not resolve the downbeat (see above): rerun it with --phase N before track.py edit');
    // score.json: the track, its edit and its record; the key from the analysis; the tempo comes from src/music.ts
    try {
      const p = path.join(DIR, 'audio', 'score.json');
      const s = readJson(p);
      s.music = { track: TRK, edit: 'audio/music/edit.json', licence: REC };
      delete s.bpm;
      try { const k = (readJson(path.join(DIR, TJ)).key || {}).name; if (k) s.key = k; } catch { /* no analysis yet */ }
      s.stopdowns = s.stopdowns || { auto: 'kit', add: [], skip: [], quiet_db: -7 };
      (s.master = s.master || {}).lufs = -14;
      fs.writeFileSync(p, `${JSON.stringify(s, null, 2)}\n`);
      say(`new-film: audio/score.json plays ${TRK} (key ${s.key ?? 'None'})`);
    } catch (e) { die(`could not point audio/score.json at the track (${e.message})`); }
    if (py(['scripts/audio/kit.py', 'init', '--preset', 'launch', '--force'], inDir).status !== 0)
      warn(`the launch kit needs earshot 0.4+ (references/sound.md, Finding earshot: EARSHOT_PYTHON); run ${PYS} scripts/audio/kit.py init --preset launch --force once it is installed`);
  }

  const beat = 60 * o.fps / o.bpm;
  say(`new-film: created ${rel(DIR)} (${o.engine}, ${o.W}x${o.H} @ ${o.fps} fps, ${o.bpm} BPM = ${beat} f per beat${o.pace ? `, ${o.pace} pace` : ''}${o.type ? `, ${o.type} type` : ''}${pairing ? `, the ${pairing} pairing` : ''}${template ? `, the ${template} template` : ''}) in ${((Date.now() - T0) / 1000).toFixed(0)} s`);
  if (!o.nameSet && o.engine === 'remotion') say(`new-film: no --name: the film is dealt from "${o.name}" (the folder's name); pass --name "<Product>" when you scaffold, so the type pairing and the deal follow the product`);
  if (TPL) {
    // the template's own first steps (template.json "next"); the music slot every film fills is printed below
    if ((manifest.next || []).length) say(manifest.next.join('\n'));
    else if (template === 'update') say('update film: write the version and 2-4 changes (one plain sentence each, 2-6 words, a result the user sees, each with its product moment) in src/update.ts;\n  its direction is dealt from the product\'s name (src/deal.ts: one dealer, no deck.py deal on top)');
    // a template whose deal follows the product's name (template.json deal.scaffold) prints what THIS project plays now
    const dealCmd = manifest.deal && manifest.deal.scaffold && manifest.deal.print ? manifest.deal.print : '';
    if (dealCmd) {
      let dealt = '';
      if (tsx && exists(path.join(DIR, 'node_modules'))) {
        const cmd = dealCmd.replace(/^npx tsx\b/, `"${process.execPath}" "${tsx}"`);
        const r = spawnSync(cmd, { ...inDir, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        if (r.status === 0) dealt = (r.stdout || '').trim();
      }
      say(dealt ? `new-film: this film's deal: ${dealt}` : `new-film: print this film's deal (it follows the name in src/brand/identity.ts): ${dealCmd}`);
    }
  }
  if (o.engine === 'remotion') {
    say(`next (the time plan in SKILL.md: a whole draft with its ending by 45 % of the budget, the final started by 70 %):
  cd ${rel(DIR)}
  ${PYS} scripts/copy-check.py TREATMENT.md   # the script first, before any picture: what the product is by 3 s,
                            # one thing it does a line, the close; plain words (references/copy-and-type.md)
  npm run check             # tsc, lint-film, grid-check: fails on purpose until the placeholder brand
                            # (palette, mark and name: cinetic:placeholder in src/brand and COPY) is replaced
  node scripts/precheck.mjs # seconds: every act imports, timing asserts, empty kit parts, text that does not fit
  node scripts/frames.mjs end                   # the ending (lockup) as stills, early: out/stills/end-*.png
  node scripts/frames.mjs still <a CUE frame>   # half-size stills in out/stills/ - look at them
  bash scripts/render.sh Film out/draft.mp4 --draft --max-min 9   # the WHOLE film, early (rerun until exit 0): half size, the
                            # picked track under it (never silent once a track is picked), out/qa/draft-sheet.png (16 tiles)
  node scripts/frames.mjs sheet --from out/draft.mp4 --frames <act range>   # review frames from the draft video
  npm run sound             # the whole soundtrack in one command (the track on the bars, the kit, the mix): PASS, FAIL
                            # or PARTIAL; then the draft again and npm run gates (forensics, UI strings, marks); then:
  bash scripts/render.sh Film out/film.mp4 --max-min 9   # resumable parts: rerun until exit 0
                            # (npm run studio is for a person at the screen: an agent never starts it)`);
  } else {
    say(`next:
  cd ${rel(DIR)}
  ${PYS} scripts/copy-check.py TREATMENT.md   # the script first, before any picture: what the product is by 3 s
  node scripts/lint-film.mjs .   # cinetic bans; fails on purpose until the placeholder palette
                                 # and font in index.html are replaced (references/brand-and-color.md)
  node scripts/grid-check.ts timeline.js   # the grid, the reads and the text flow (Node 22.18+;
                                           # else npx -y tsx scripts/grid-check.ts timeline.js)
  npm run preview                # HyperFrames Studio
  npm run cues && npm run kit && npm run audio && npm run render:preview   # then: npm run render
  npm run listen                 # earshot's ears on the soundtrack: out/qa/listen.json + sound_sheet.png`);
  }
  if (!o.music) {
    say(`music first: the slot is empty, and every film is cut to its own licensed track, never effects only
(references/music.md). In ${rel(DIR)}:
  node scripts/music.mjs search --mood "<the film's mood words>" --bpm <lo-hi> --length <film s>
  node scripts/music.mjs sheet --measure      # audition the first three; never the last film's track
  node scripts/music.mjs get '#n' --to audio/music   # the file and its licence record
  (a track found elsewhere: ${PYS} scripts/audio/track.py add <file> --title T --artist A --source S --page URL
   --licence L --seen-quote Q --seen-url URL --ai-generated no --vocals no)
  then ${PYS} scripts/audio/track.py analyze audio/music/<file>, and track.py edit / grid / check`);
  } else {
    say('music first (references/music.md):');
    if (!o.analyze) say(`  ${PYS} scripts/audio/track.py analyze ${TRK}${o.profile ? ` --profile ${o.profile}` : ''}   # its own job (the longest step); then "key" in audio/score.json and kit.py tune`);
    say(`  ${PYS} scripts/audio/track.py edit --bars N --reveal-bar K [--end auto|own|fade|hit]   # the film's bars on the track; the music ends on a decay
  ${PYS} scripts/audio/track.py grid       # src/music.ts (or music.js): write the timeline on MUSIC bars
  ${PYS} scripts/audio/track.py check      # joins, licence, nothing from the track in git`);
  }
  // one Python story: which interpreter runs the checks and the sheets, and whether the sound kit renders here
  // (frames.mjs python surveys the interpreters once and caches the answer for render.sh and the rest)
  // both at once: each is a few Python starts, seconds apiece on a busy machine
  const jobs = [run(process.execPath, [path.join(DIR, 'scripts', 'frames.mjs'), 'python', '--quiet'], DIR)];
  const kitPy = exists(path.join(DIR, 'audio', 'kit.json')) ? findPython({ numpy: false, quiet: true }) : null;
  if (kitPy) jobs.push(run(kitPy[0], [...kitPy.slice(1), 'scripts/audio/kit.py', 'where'], DIR));
  const [pyOut, kitOut] = await Promise.all(jobs);
  if (pyOut.trim()) say(`python: ${pyOut.trim().split(/\r?\n/).join('\n  ')}`);
  if (kitOut !== undefined) {
    const out = kitOut.split(/\r?\n/).filter(Boolean);
    const last = out.filter((l) => /^kit:/.test(l)).pop() || out.pop();
    if (last) say(last.replace(/^kit:/, 'sound:'));
  }
  if (likeFailed) { console.error(`new-film: ${rel(DIR)} is made, but --like did not measure ${o.like} (see above)`); process.exit(1); }
}
// a child's stdout, without waiting for the others (stderr dropped: these are reports)
function run(exe, args, cwd) {
  return new Promise((resolve) => {
    let out = '';
    const ch = spawn(exe, args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
    ch.stdout.on('data', (d) => { out += d; });
    ch.on('error', () => resolve(out));
    ch.on('close', () => resolve(out));
  });
}

if (o.stage === '1') {
  if (!o.state) die('--stage 1 needs --state <file>');
  stage1();
} else {
  if (!o.state) die('--stage 2 needs --state <file>');
  await stage2();
}
