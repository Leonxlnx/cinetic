#!/usr/bin/env node
/**
 * sound.mjs: the film's whole soundtrack in one command (npm run sound): the cues from the timeline, the effects
 * kit cast and rendered for this film's actions, the plan, and the mix over the licensed track, mastered into
 * public/audio/soundtrack.wav. Every step says what it did; a step that cannot run falls back to the next best
 * soundtrack and says why, so a render always has a soundtrack to mux.
 *
 * Usage (from the project root):
 *   node scripts/sound.mjs [--bed-only] [--recast] [--python PY] [--quiet]
 *
 * Steps:
 *   python  an interpreter that imports numpy, scipy, soundfile and pyloudnorm, with no setting needed: --python,
 *           then the one scripts/py.mjs finds; when that lacks them, the one an earlier run found
 *           (~/.cinetic/tools.json, or $CINETIC_HOME), $EARSHOT_PYTHON and the earshot virtualenv in the usual places
 *           (~/earshot/.venv; on Windows X:\earshot\.venv); what works is remembered in tools.json
 *   track   a licensed track in audio/music (music.mjs get) that is not cut yet: track.py analyze (once), then
 *           track.py fit --end auto (the edit on the timeline's bars, src/music.ts, audio/score.json pointed at it);
 *           an edit already there is never touched
 *   cues    tsx scripts/export-cues.ts -> out/cues.json (the timeline's events: taps, landings, lines, seams, the
 *           lockup). A timeline that does not import keeps the last out/cues.json (said), or plays the bed alone
 *   kit     audio/kit.json from the launch preset when there is none; kit.py cast when this film's actions are not
 *           cast yet (--recast casts again); kit.py render (cached). kit.py finds earshot itself (references/sound.md
 *           §1). Without earshot, takes already rendered play as they are; with none, the bed plays alone (PARTIAL)
 *   mix     plan.py, then score.py: the effects on their frames, the stop-downs, the arc, the ending, mastered to
 *           -14 LUFS; stems in out/stems, the report in out/qa/score.json
 *   --bed-only  the edited track alone, as the film plays it (no cues or kit needed)
 *
 * Exit codes: 0 a soundtrack was written and its gate passed (PARTIAL: the bed alone, said why); 1 no soundtrack,
 * or the mix failed its gate (the soundtrack is still written for a preview; the report lists the fixes);
 * 2 bad arguments.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const win = process.platform === 'win32';
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (flag('--help') || flag('-h')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
  process.exit(0);
}
const known = new Set(['--bed-only', '--recast', '--python', '--quiet']);
for (let i = 0; i < args.length; i++) {
  if (!known.has(args[i])) { console.error(`sound: unknown option ${args[i]} (--help)`); process.exit(2); }
  if (args[i] === '--python') i++;
}
const QUIET = flag('--quiet');
const say = (s) => { if (!QUIET) console.log(s); };
const t0 = Date.now();
const secs = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;

if (!existsSync('package.json') || !existsSync('scripts/audio/score.py')) {
  console.error('sound: run it from the film project root (package.json and scripts/audio/ here)');
  process.exit(1);
}
const home = process.env.CINETIC_HOME || join(homedir(), '.cinetic');
const toolsPath = join(home, 'tools.json');
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const tools = readJson(toolsPath) || {};

// ------------------------------------------------------------------------------------------- python
// py.mjs finds the project's Python ($PYTHON, $CINETIC_PYTHON, a virtualenv here, python3, python, py -3); when the one
// it finds lacks the mix's packages, the interpreter an earlier run found and the earshot virtualenv (its own
// environment holds numpy, scipy, soundfile and pyloudnorm) are tried, so a plain `npm run sound` needs no setting
const NEED = 'numpy, scipy, soundfile, pyloudnorm';
const venvPy = (root) => join(root, '.venv', win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python');
async function pythonCandidates() {
  const c = [];
  const add = (how, cmd) => { if (cmd && cmd.length && cmd[0]) c.push({ how, cmd }); };
  add('--python', opt('--python') && [opt('--python')]);
  try {
    const { findPython: viaPy } = await import(new URL('./py.mjs', import.meta.url).href);
    add('py.mjs', viaPy({ quiet: true }));
  } catch { /* an older project without py.mjs: the places below */ }
  add('found before (tools.json)', tools.python && [tools.python]);
  const es = process.env.EARSHOT_PYTHON;
  add('$EARSHOT_PYTHON', es && !/^(none|off)$/i.test(es) && [es]);
  add('earshot found before (tools.json)', tools.earshot?.python && [tools.earshot.python]);
  const roots = [join(homedir(), 'earshot')];
  if (win) for (const d of 'CDEFGHIJKLMNOPQRSTUVWXYZ') roots.push(`${d}:\\earshot`);
  for (const r of roots) if (existsSync(venvPy(r))) add('the earshot virtualenv', [venvPy(r)]);
  const seen = new Set();
  return c.filter((x) => { const k = x.cmd.join(' ').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
async function findSoundPython() {
  const tried = [];
  for (const { how, cmd } of await pythonCandidates()) {
    const [exe, ...pre] = cmd;
    const r = spawnSync(exe, [...pre, '-c', `import sys, ${NEED}; sys.exit(0 if sys.version_info >= (3, 10) else 3)`], { encoding: 'utf8', timeout: 120000 });
    if (r.status === 0) return { cmd, how, tried };
    const why = r.error ? 'does not run' : r.status === 3 ? 'older than Python 3.10' : (String(r.stderr || '').trim().split(/\r?\n/).pop() || `exit ${r.status}`);
    tried.push(`${how} (${cmd.join(' ')}): ${why.slice(0, 120)}`);
  }
  return { cmd: null, tried };
}
const PY = await findSoundPython();
if (!PY.cmd) {
  console.error(`sound: no Python 3.10+ that imports ${NEED}:\n  ` + PY.tried.join('\n  ')
    + `\n  install scripts/requirements.txt into one (node scripts/py.mjs --check prints the pip line); the next run finds it`);
  process.exit(1);
}
if (PY.how !== 'py.mjs' && PY.cmd.length === 1 && tools.python !== resolve(PY.cmd[0])) {
  try { mkdirSync(home, { recursive: true }); writeFileSync(toolsPath, JSON.stringify({ ...(readJson(toolsPath) || {}), python: resolve(PY.cmd[0]) }, null, 1) + '\n'); } catch { /* a read-only home is fine */ }
}
const env = { ...process.env, PYTHONUTF8: '1' };
say(`sound: python ${PY.cmd.join(' ')} (${PY.how})`);

function py(script, a, { show = true } = {}) {
  const [exe, ...pre] = PY.cmd;
  const r = spawnSync(exe, [...pre, script, ...a], { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (show && !QUIET && out) console.log(out.split(/\r?\n/).map((l) => `  ${l}`).join('\n'));
  return { code: r.error ? 127 : r.status ?? 1, out };
}

// ------------------------------------------------------------------------------------------- music
const notes0 = [];
let score = readJson('audio/score.json');
if (!score) { console.error('sound: audio/score.json is missing or not JSON (the starter writes one)'); process.exit(1); }
let music = score.music && typeof score.music === 'object' ? score.music : null;
let hasTrack = !!(music?.track && existsSync(music.track));
let hasEdit = !!(music?.edit && existsSync(music.edit));
if (!hasEdit && !flag('--bed-only')) {
  // a track downloaded with its licence record (music.mjs get) but not cut yet: analyse it, then fit the edit to the
  // timeline's beat plan (track.py fit writes audio/music/edit.json, src/music.ts and points audio/score.json at it)
  let track = hasTrack ? music.track : null;
  if (!track && existsSync('audio/music')) {
    const recs = readdirSync('audio/music').filter((f) => f.endsWith('.licence.json') && !f.startsWith('licence.template'))
      .map((f) => ({ rec: readJson(join('audio/music', f)), f })).filter((x) => x.rec?.file && existsSync(join('audio/music', x.rec.file)));
    if (recs.length === 1) track = join('audio/music', recs[0].rec.file).split('\\').join('/');
    else if (recs.length > 1) notes0.push(`audio/music holds ${recs.length} licensed tracks: name the film's in audio/score.json music.track`);
  }
  if (track) {
    const tj = track.replace(/\.[^./]+$/, '.track.json');
    if (!existsSync(tj)) {
      say(`sound: track.py analyze ${track} (tempo, bars, sections; once per track)`);
      const r = py('scripts/audio/track.py', ['analyze', track]);
      if (r.code !== 0) { console.error('sound: the track analysis failed (above): track.py analyze --phase N, or choose another track'); process.exit(1); }
    }
    say('sound: track.py fit (the edit on the timeline\'s bars; the track\'s own ending when it fits, else one ringing hit)');
    const r = py('scripts/audio/track.py', ['fit', tj, '--end', 'auto']);
    if (r.code !== 0) { console.error('sound: track.py fit failed (above): see references/music.md §6'); process.exit(1); }
    score = readJson('audio/score.json');
    music = score.music && typeof score.music === 'object' ? score.music : null;
    hasTrack = !!(music?.track && existsSync(music.track));
    hasEdit = !!(music?.edit && existsSync(music.edit));
  }
}
if (!hasTrack || !hasEdit) {
  console.error(`sound: ${!music ? 'audio/score.json names no track' : !hasTrack ? `the track ${music?.track} is not here` : `no edit (${music.edit})`}. `
    + 'The film is cut to one licensed track, chosen before the timeline: node scripts/music.mjs pick --mood "<words>" --length <s> '
    + "(or search), get '#n' --to audio/music, then python3 scripts/audio/track.py analyze <file> and track.py fit (references/music.md)");
  process.exit(1);
}

// ------------------------------------------------------------------------------------------- cues
let bedOnly = flag('--bed-only');
const notes = [...notes0];
const tsx = ['node_modules/tsx/dist/cli.mjs', 'node_modules/tsx/dist/cli.js'].find((p) => existsSync(p));
if (!bedOnly) {
  const r = tsx ? spawnSync(process.execPath, [tsx, 'scripts/export-cues.ts'], { encoding: 'utf8', env })
    : spawnSync(win ? 'npx.cmd' : 'npx', ['tsx', 'scripts/export-cues.ts'], { encoding: 'utf8', env, shell: win });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status === 0) say(`sound: cues  ${out.split(/\r?\n/).filter((l) => /^wrote/.test(l)).pop() || 'out/cues.json'} (${secs()})`);
  else if (existsSync('out/cues.json')) {
    notes.push('the timeline did not export its cues (npm run cues prints why): the last out/cues.json was used');
    say(`sound: cues FAILED, keeping the last out/cues.json:\n  ${out.split(/\r?\n/).slice(-6).join('\n  ')}`);
  } else {
    bedOnly = true;
    notes.push('the timeline did not export its cues (npm run cues prints why): the bed plays alone until it does');
    say(`sound: cues FAILED and there is no out/cues.json: the bed alone\n  ${out.split(/\r?\n/).slice(-6).join('\n  ')}`);
  }
}

// ------------------------------------------------------------------------------------------- kit
let kitNote = '';
if (!bedOnly) {
  const kit = readJson('audio/kit.json');
  if (!kit) {
    const r = py('scripts/audio/kit.py', ['init', '--preset', 'launch']);
    if (r.code !== 0) notes.push('audio/kit.json could not be written from the launch preset (kit.py init needs earshot 0.4)');
  }
  const k = readJson('audio/kit.json');
  // the film's actions as kit.py cast reads them (actions.py: the event's action or an alias, the lockup, the words of
  // its id, its kind's default), against the actions the kit is cast for; a set already cast once is not cast again
  // (out/qa/sound-cast.json), so one film keeps its sounds from run to run
  const [exe, ...pre] = PY.cmd;
  const q = spawnSync(exe, [...pre, '-c', ['import json, sys', "sys.path.insert(0, 'scripts/audio')", 'import actions as AC',
    "c = json.load(open('out/cues.json', encoding='utf-8'))", "fps, cue = float(c.get('fps', 60)), c.get('cue') or {}",
    "print(json.dumps(sorted({a for a in (AC.action_of(e, fps, cue) for e in c.get('events', [])) if a})))"].join('\n')], { encoding: 'utf8', env });
  let acts = [];
  try { acts = JSON.parse(String(q.stdout || '').trim().split(/\r?\n/).pop()); } catch { acts = []; }
  const cast = k?.cast?.actions ? new Set(Object.keys(k.cast.actions)) : null;
  const uncast = cast ? acts.filter((a) => !cast.has(a)) : acts;
  const castState = readJson('out/qa/sound-cast.json');
  const tried = JSON.stringify(castState?.actions || null) === JSON.stringify(acts);
  if (k && (flag('--recast') || !cast || (uncast.length && !tried))) {
    say(`sound: kit cast (${!cast ? 'not cast for this film yet' : flag('--recast') ? '--recast' : `new actions: ${uncast.join(', ')}`})`);
    const r = py('scripts/audio/kit.py', ['cast']);
    if (r.code !== 0) notes.push('kit.py cast did not run (earshot not found, see `python3 scripts/audio/kit.py where`): each kind plays the kit\'s one sound');
    else { mkdirSync('out/qa', { recursive: true }); writeFileSync('out/qa/sound-cast.json', JSON.stringify({ actions: acts }, null, 1) + '\n'); }
  }
  say(`sound: kit render (${secs()})`);
  const r = py('scripts/audio/kit.py', ['render']);
  const lock = readJson('audio/kit/kit.lock.json');
  if (!lock) {
    bedOnly = true;
    kitNote = 'no rendered kit and no earshot to render one: the bed plays alone (PARTIAL). Install earshot 0.4 (docs/setup.md, '
      + '"Sound from earshot"), or vendor rendered takes (kit.py vendor --from DIR), then npm run sound again';
  } else if (r.code !== 0) notes.push('kit.py render did not finish (the takes already rendered play)');
}

// ------------------------------------------------------------------------------------------- mix
mkdirSync('out/qa', { recursive: true });
if (!bedOnly) {
  const p = py('scripts/audio/plan.py', ['--quiet'], { show: false });
  if (p.code !== 0) {
    say(`  ${p.out.split(/\r?\n/).slice(-6).join('\n  ')}`);
    if (p.code === 2 || /no rendered kit/i.test(p.out)) { bedOnly = true; kitNote ||= 'the plan found no rendered kit: the bed plays alone (PARTIAL)'; }
  }
}
say(`sound: mix${bedOnly ? ' (the bed alone)' : ''} (${secs()})`);
const mixArgs = ['--cues', 'out/cues.json', '--score', 'audio/score.json', '--out', 'public/audio/soundtrack.wav', '--stems', 'out/stems', '--json', 'out/qa/score.json'];
let m = py('scripts/audio/score.py', bedOnly ? [...mixArgs, '--bed-only'] : mixArgs);
if (m.code !== 0 && !bedOnly && !existsSync('public/audio/soundtrack.wav')) {
  notes.push('the full mix did not render: the bed alone was mixed instead (the report above says why)');
  kitNote ||= 'the full mix did not render: the bed plays alone (PARTIAL)';
  bedOnly = true;
  m = py('scripts/audio/score.py', [...mixArgs, '--bed-only']);
}
// a hero sound the track buries (score.py: "is buried ... cast another sound"): cast once more without it, then mix again
const buried = bedOnly ? [] : [...new Set(((readJson('out/qa/score.json') || {}).fails || [])
  .map((f) => /is buried.*?raise role ([\w.-]+)'s bed_db/.exec(f)?.[1]).filter(Boolean))];
if (buried.length) {
  const k = readJson('audio/kit.json') || {};
  // the sound the role plays: its cast action's pick (a library sound plays as the role's takes), else the role's own
  const avoid = [...new Set(buried.flatMap((r) => [k.cast?.actions?.[k.cast?.roles?.[r]?.action]?.sound, k.roles?.[r]?.sound]).filter(Boolean))];
  if (avoid.length) {
    say(`sound: the track buries ${buried.join(', ')} (${avoid.join(', ')}): kit cast --avoid, render, mix again (${secs()})`);
    if (py('scripts/audio/kit.py', ['cast', '--avoid', avoid.join(',')]).code === 0 && py('scripts/audio/kit.py', ['render']).code === 0) {
      py('scripts/audio/plan.py', ['--quiet'], { show: false });
      m = py('scripts/audio/score.py', mixArgs);
      notes.push(`recast without ${avoid.join(', ')}, which the track buried`);
    }
  }
}
const rep = readJson('out/qa/score.json');
const written = existsSync('public/audio/soundtrack.wav') && statSync('public/audio/soundtrack.wav').mtimeMs >= t0 - 1000;
if (!written || !rep) {
  console.error('sound: FAILED, no soundtrack written (score.py above says why)');
  process.exit(1);
}
const hits = rep.accents;
const line = [`${rep.lufs} LUFS`, `TP ${rep.true_peak_db} dBTP`, rep.events ? `${rep.events.count} events` : '',
  hits ? `${hits.salient} of ${hits.events} events land as hits (${Math.round(100 * (hits.share ?? 0))} %)` : '',
  rep.ending && !rep.ending.abrupt && rep.ending.tail_s != null ? `the end decays over ${(rep.ending.fall_s ?? 0).toFixed(1)} s` : rep.ending?.abrupt ? 'the end is ABRUPT' : ''].filter(Boolean).join(', ');
const tag = kitNote ? 'PARTIAL' : rep.pass ? 'PASS' : 'FAIL';
console.log(`sound: ${tag}  public/audio/soundtrack.wav  ${line}  (${secs()})`);
for (const n of notes) console.log(`  note: ${n}`);
if (kitNote) console.log(`  ${kitNote}`);
if (tag === 'FAIL') console.log('  the soundtrack is written for a preview; fix the FAIL lines above (references/sound.md §10-11), then npm run sound again');
else {
  // the draft again, with the sound under it: when the track's grid (src/music.ts) is newer than the draft, the picture now
  // follows the track's bars and the old draft's timing (and its ending under the ring-out) is stale
  const stale = existsSync('out/draft.mp4') && existsSync('src/music.ts') && statSync('src/music.ts').mtimeMs > statSync('out/draft.mp4').mtimeMs;
  console.log(`  next: bash scripts/render.sh Film out/draft.mp4 --draft --max-min 9${stale ? ' (src/music.ts is newer than out/draft.mp4: the picture follows the track\'s bars now, the old draft is stale)' : ''}`);
}
process.exit(tag === 'FAIL' ? 1 : 0);
