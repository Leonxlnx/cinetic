#!/usr/bin/env node
/**
 * launch-simple.test.mjs: the default launch template's own standard, read from its modules (no render).
 *
 *   1. ground     the key light's plate never turns its top edge into the frame (a hard wedge of bare ground in the
 *                 top corner): at every angle the sway reaches and every height the drift reaches, the edge stays
 *                 above the frame at both sides.
 *   2. claim      the hero word snaps in at x1.6 at most, and the claim is read once it has settled.
 *   3. end card   the lockup's drift starts from rest as the lockup is whole, stands at most END_OFF_MAX px off the
 *                 frame's centre on the hold and passes the centre past the hold's middle; the fact moves with the
 *                 name on one axis (no shear).
 *   4. seams      a line -> picture change is never a match cut (a line and a picture share no shape: a dealt matchCut
 *                 plays as blurThrough); a picture -> picture match cut only where it was dealt, and a dealt one with
 *                 nothing carried over it is reported (gate issue `carry`) with both scenes named.
 *   5. pushes     a picture behind its line (with) takes no push; no two pictures in a row push.
 *   6. key words  at most two lines a film carry a key word, about 40 % of them: two of four pass, two of three fail.
 *   7. lines      a pair may leave its line out (a picture-only beat: one A beat, no COPY line, a carried change
 *                 into it); the first pair and the claim keep theirs; at most four lines a film.
 *   8. field      the claim sits on its colour field even when the scene before it names no `field`: a disc of the
 *                 accent at that scene's focus.
 *   9. layer      a velocity seam's smear runs along the layer's travel (Layer draws it as a directional blur).
 *
 * It lays the template over the Remotion starter in a temp folder (as new-film.sh does) and imports the modules through
 * the starter's tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/launch-simple.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const STARTER = path.join(SKILL, 'assets', 'remotion-starter');
const TPL = path.join(SKILL, 'assets', 'templates', 'launch-simple');
const TSX = path.join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/launch-simple.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!fs.existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

// the project: the starter's src, the template's files over it (template.json copy), its removals gone
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-launch-'));
const DIR = path.join(TMP, 'film');
fs.cpSync(path.join(STARTER, 'src'), path.join(DIR, 'src'), { recursive: true });
const tj = JSON.parse(fs.readFileSync(path.join(TPL, 'template.json'), 'utf8'));
for (const f of tj.copy) {
  fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true });
  fs.copyFileSync(path.join(TPL, f), path.join(DIR, f));
}
for (const f of tj.remove ?? []) fs.rmSync(path.join(DIR, f), { force: true });
fs.copyFileSync(path.join(STARTER, 'package.json'), path.join(DIR, 'package.json'));
fs.symlinkSync(path.join(STARTER, 'node_modules'), path.join(DIR, 'node_modules'), 'junction');
const LAUNCH_SRC = fs.readFileSync(path.join(DIR, 'src', 'launch.ts'), 'utf8');

/** launch.ts with these pairs (and a pin), the scaffold's scenes; the rest of the file kept. */
const writeLaunch = (pairs, pin) => {
  const body = `export const LAUNCH: Launch = {\n  name: IDENTITY.name,\n  pairs: ${JSON.stringify(pairs)},\n  close: 'Out now',\n  input: 'a person speaking into a phone',\n${pin ? `  pin: ${JSON.stringify(pin)},\n` : ''}};\n`;
  const src = LAUNCH_SRC.replace(/export const LAUNCH: Launch = \{[\s\S]*?\n\};\n/, body);
  fs.writeFileSync(path.join(DIR, 'src', 'launch.ts'), src);
};
const url = (p) => pathToFileURL(path.join(DIR, 'src', p)).href;
/** Import the modules in a fresh process and return what the checks read (or the import error). */
const probe = () => {
  const file = path.join(DIR, 'probe.mts');
  fs.writeFileSync(file, `
let out: any = {};
try {
  const T: any = await import(${JSON.stringify(url('timeline.ts'))});
  out = { seams: T.SEAM_PLAN.map((s: any) => [s.recipe, s.id, s.cls]), beats: T.BEAT_PLAN.map((b: any) => [b.id, b.kind]), modes: T.MODES,
    copy: T.COPY.map((c: any) => c.id), cues: Object.keys(T.CUE), hero: T.HERO, keyedMax: T.KEYED_MAX, total: T.TOTAL, lockup: T.CUE.lockup, H: T.H, W: T.W };
  const S: any = await import(${JSON.stringify(url('acts/stage.tsx'))});
  const L: any = await import(${JSON.stringify(url('acts/layer.tsx'))});
  const angles = []; for (let a = -9 - 2.6; a <= -9 + 2.6; a += 0.2) angles.push(a);
  const kys = [-0.12 * T.H - 0.04 * T.H, -0.12 * T.H, -0.12 * T.H + 0.04 * T.H];
  out.edge = Math.max(...angles.flatMap((a) => kys.map((ky) => { const e = S.keyPlateTopEdge(a, ky); return Math.max(e.left, e.right); })));
  const sway = (f: number) => S.endSway(f);
  out.end = { last: sway(T.TOTAL - 1), first: sway(T.CUE.lockup), step0: Math.abs(sway(T.CUE.lockup + 1) - sway(T.CUE.lockup)), max: Math.max(...Array.from({ length: T.TOTAL - T.CUE.lockup }, (_, i) => Math.abs(sway(T.CUE.lockup + i)))), offMax: S.END_OFF_MAX, part: S.END_PART };
  out.fieldOn = S.FIELD_ON;
  out.field = S.fieldBoxOf({ draw: () => null, focus: { x: 400, y: 200, w: 600, h: 400 } });
  out.smear = [L.smearAxis({ x: 80, y: 0 }), L.smearAxis({ x: 0, y: -60 })];
  out.depth = S.TA_DEPTH;
} catch (e: any) { out.error = String(e?.message ?? e).split('\\n')[0]; }
out.issues = ((globalThis as any).__cineticGateIssues ?? []).map((x: any) => x.rule + ': ' + x.message);
console.log('@@' + JSON.stringify(out));
`);
  const r = spawnSync(process.execPath, [TSX, file], { cwd: DIR, encoding: 'utf8', env: { ...process.env, CINETIC_GATE: '' } });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
  return line ? JSON.parse(line.slice(2)) : { error: (r.stderr || r.stdout || 'no output').trim().split('\n').slice(-3).join(' | ') };
};

const P = {
  input: (line, extra = {}) => ({ line, scene: 'input', seconds: 2.8, hits: [0.3, 0.62], ui: ['Call the dentist', 'Dentist, Tuesday 9:00'], ...extra }),
  steps: (line, extra = {}) => ({ ...(line ? { line } : {}), scene: 'steps', seconds: 2.4, hits: [0.12, 0.38, 0.62], ui: ['Call the dentist', 'Buy milk', 'Book flights', 'Tuesday', 'Wednesday', 'Friday'], ...extra }),
  result: (line, extra = {}) => ({ ...(line ? { line } : {}), scene: 'result', seconds: 2.6, hits: [0.35], ui: ['Your week is planned', 'Three tasks'], ...extra }),
};

try {
  // a: the scaffold's shape (alone, with, claim), the floor's deal (seamTA matchCut), the steps scene naming no field
  writeLaunch([P.input('Tern turns voice notes into *plans*.'), P.steps('Each task lands on its day.'), P.input('Then you just start.', { seconds: 3.2 }), P.result('Your week, *planned*.')]);
  const a = probe();
  result(!a.error, 'the template imports (four pairs, the floor deal)', a.error);
  if (!a.error) {
    result(a.edge < -40, 'ground: the key plate\'s top edge stays above the frame at every sway angle and drift height', `highest ${a.edge?.toFixed(1)} px`);
    result(a.hero.from <= 1.6 && a.hero.recentre > 0, 'claim: the hero word snaps in at x1.6 at most, into a slot opened before it', JSON.stringify(a.hero));
    const e = a.end;
    result(e.part === 1 && e.step0 < 0.3 && e.max <= e.offMax + 0.5 && Math.abs(e.last) < Math.abs(e.first),
      'end card: the drift starts from rest at the lockup, stays within END_OFF_MAX of the centre, ends nearer it than it starts; the fact shares the axis',
      JSON.stringify(e));
    const ta = a.seams.filter((s) => s[2] === 'TA');
    result(ta.length >= 1 && ta.every((s) => s[0] !== 'matchCut'), 'seams: no line -> picture change is a match cut (the floor deals one; it plays as blurThrough)', JSON.stringify(ta));
    const aa = a.seams.filter((s) => s[2] === 'AA');
    result(aa.every((s) => s[0] !== 'matchCut'), 'seams: no picture -> picture match cut where none was dealt', JSON.stringify(aa));
    const withs = a.modes.map((m, i) => (m === 'with' ? i + 1 : 0)).filter(Boolean);
    const pushes = a.cues.filter((c) => /^a\d+cut$/.test(c)).map((c) => Number(c.slice(1, -3)));
    result(!pushes.some((k) => withs.includes(k)) && !pushes.some((k) => pushes.includes(k + 1)), 'pushes: none on a picture behind its line, never two pictures in a row', `with ${withs}, pushes ${pushes}`);
    result(a.fieldOn === true && a.field && Math.abs(a.field.x + a.field.w / 2 - 700) < 1 && Math.abs(a.field.y + a.field.h / 2 - 400) < 1,
      'field: the claim sits on its colour field though the scene before it names none (a disc at that scene\'s focus)', JSON.stringify({ on: a.fieldOn, box: a.field }));
    result(a.smear[0] === 'x' && a.smear[1] === 'y', 'layer: the smear runs along the travel', JSON.stringify(a.smear));
    result(a.depth.scale < 1 && a.depth.creep <= 0.03 && !('below' in a.depth) && !('drop' in a.depth), 'with: the picture stands centred behind its line, never dropped below it', JSON.stringify(a.depth));
  }

  // b: a picture-only pair between two lines; a dealt picture -> picture match cut over an uncarried change
  writeLaunch([P.input('Tern turns voice notes into *plans*.'), P.result(), P.steps('Each task lands on its day.'), P.result('Your week, planned.')], { seamAA: 'matchCut' });
  const b = probe();
  result(!b.error, 'a picture-only pair imports', b.error);
  if (!b.error) {
    result(b.modes[1] === 'none' && b.beats.filter((x) => x[0] === 'pic2').length === 1 && !b.beats.some((x) => x[0] === 'line2') && !b.copy.includes('line2') && b.copy.includes('ui2.1') && !b.cues.includes('line2'),
      'lines: a pair with no line is one picture beat, its strings kept, no line in COPY or CUE', JSON.stringify({ modes: b.modes, beats: b.beats }));
    result(b.seams.some((s) => s[1] === 'pic1-pic2' && s[2] === 'AA'), 'lines: the change into a picture-only pair is a picture -> picture seam', JSON.stringify(b.seams));
    const mc = b.seams.filter((s) => s[0] === 'matchCut' && s[2] === 'AA').map((s) => s[1]);
    const warned = b.issues.filter((x) => x.startsWith('carry:'));
    result(mc.length >= 1 && warned.length >= 1 && warned.every((w) => mc.some((id) => w.includes(id))) && warned.some((w) => /"result"/.test(w)),
      'seams: a dealt picture -> picture match cut with nothing carried is reported (carry), naming both scenes', JSON.stringify({ mc, warned: warned.map((w) => w.slice(0, 120)) }));
  }

  // c: two key words in three lines fail; five lines fail; a first pair without a line fails
  writeLaunch([P.input('Tern turns notes into *plans*.'), P.steps('Each task finds its *day*.'), P.result('Start your week.')]);
  const c = probe();
  result(/key word/.test(c.error ?? ''), 'key words: two of three lines with a key word fail at import (two of four pass, above)', c.error ?? 'imported');
  writeLaunch([P.input('Tern turns notes into *plans*.'), P.steps('Each task finds its day.'), P.result('Your week is ready.'), P.input('It works offline.'), P.result('Start your week.')]);
  const d = probe();
  result(/at most 4/.test(d.error ?? ''), 'lines: five lines fail (four at most: the pictures carry the rest)', d.error ?? 'imported');
  writeLaunch([P.steps(), P.input('Tern turns notes into plans.'), P.result('Start your week.')]);
  const g = probe();
  result(/first pair and the last/.test(g.error ?? ''), 'lines: the first pair keeps its line', g.error ?? 'imported');
} finally {
  // the link to the starter's node_modules goes first (the folder it points at stays)
  try {
    fs.unlinkSync(path.join(DIR, 'node_modules'));
  } catch {}
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `launch-simple tests: ${failed} failed` : 'launch-simple tests: all pass');
process.exit(failed ? 1 : 0);
