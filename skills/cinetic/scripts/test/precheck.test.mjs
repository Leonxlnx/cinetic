#!/usr/bin/env node
/**
 * precheck.test.mjs: scripts/precheck.mjs, the 30-second check before a render, on a copy of the starter.
 *
 *   1. The starter as shipped: every module imports, no error.
 *   2. Kit parts with no content of the film's own fail (kit-empty): a DenseScreen without world, a ProjectPanel
 *      without data, a StatCard without label, KitFallback; the retired sampleWorld() and a sample() call fail
 *      (kit-sample); a DenseScreen given a world, a kit part with spread props and fx/Photo (a picture plate) pass; the
 *      same through a namespace import (K.sample(), <K.ProjectPanel>), and a sample() call at load (reported at runtime).
 *   3. Timing: a landBeforeCut that cuts a move mid-ease at module load is a warning in dev and the act still imports;
 *      under --ship (CINETIC_GATE=ship) the act throws at import and it is an error; a bare `throw` in a timing assert
 *      is an error either way (it crashes every render).
 *   4. Fit: a content string with "..." fails (truncated); a string wider than the safe width at the kit's label size
 *      fails (fit), one wider than a card's column warns (fit-long); the starter's own COPY lines fit.
 *   5. Progress on stderr while it runs (the import step, the first module imported, the fit step), the report alone on
 *      stdout (--json parses); --quiet leaves the progress out.
 *   6. --json carries the findings; the run stays under 60 s here (30 s is the budget on a quiet machine); an act that
 *      imports a stylesheet or a picture still imports (stubbed on a second run).
 *   8. The cast: a person's name beside CONTENT.people[k].photo that is not that person's fails (cast-name), a role
 *      label passes, one face for two named people warns (cast-face).
 *   9. The case: with a SPINE_PLAN, a word of the case an act lists that no scene or COPY entry carries fails (case), one
 *      the film shows passes, another unseen listed string warns (case-strings).
 *   7. Frames: the starter renders every act at its first, middle and last frame without an error; a planted runtime
 *      TypeError (a status the film never gave) fails with the act, the frames it throws on and the file:line; a browser
 *      global read while rendering is a warning (frames-env); --no-frames renders nothing.
 *
 * It copies the starter's src into a temporary folder with its node_modules linked (npm install in
 * assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/precheck.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const STARTER = path.join(SKILL, 'assets', 'remotion-starter');
const PRE = path.join(SKILL, 'scripts', 'precheck.mjs');
const verbose = process.argv.includes('--verbose');
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!fs.existsSync(path.join(STARTER, 'node_modules', 'tsx'))) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-precheck-test-'));
const film = path.join(TMP, 'film');
const run = (args = [], env = {}) => {
  const t = Date.now();
  const r = spawnSync(process.execPath, [PRE, film, '--json', ...args], { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  let rep = null;
  try {
    rep = JSON.parse(r.stdout);
  } catch {
    rep = { findings: [], error: (r.stderr || r.stdout).slice(0, 400) };
  }
  return { code: r.status, rep, ms: Date.now() - t, stderr: r.stderr ?? '' };
};
const has = (rep, rule, sev, re) => rep.findings.some((f) => f.rule === rule && (!sev || f.severity === sev) && (!re || re.test(`${f.where} ${f.message}`)));
try {
  fs.mkdirSync(film);
  fs.cpSync(path.join(STARTER, 'src'), path.join(film, 'src'), { recursive: true });
  fs.symlinkSync(path.join(STARTER, 'node_modules'), path.join(film, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  fs.copyFileSync(path.join(STARTER, 'tsconfig.json'), path.join(film, 'tsconfig.json'));

  // the cast (static, a film of its own): a person's name set beside CONTENT.people[k].photo is that person's first name;
  // a role label ("You") is not a name; one face standing for two named people warns
  const castFilm = path.join(TMP, 'cast');
  fs.mkdirSync(path.join(castFilm, 'src'), { recursive: true });
  fs.writeFileSync(path.join(castFilm, 'src', 'content.ts'), `export const CONTENT = { "people": [
  { "name": "Sofia Mercer", "photo": 'people/p07.jpg' },
  { "name": "Arjun Chen", "photo": 'people/p35.jpg' },
] };\n`);
  fs.writeFileSync(path.join(castFilm, 'src', 'cast.ts'), `import { CONTENT } from './content';
export const ROW = [
  { label: 'Mei', photo: CONTENT.people[1].photo },
  { label: 'Sofia', photo: CONTENT.people[0].photo },
  { label: 'You', photo: CONTENT.people[0].photo },
  { label: 'Sofia', photo: CONTENT.people[0].photo },
];
export const OTHER = [{ name: 'Arjun', photo: CONTENT.people[1].photo }];\n`);
  const cast = spawnSync(process.execPath, [PRE, castFilm, '--json', '--no-import'], { encoding: 'utf8' });
  let castRep = { findings: [] };
  try { castRep = JSON.parse(cast.stdout); } catch { /* reported below */ }
  const castNames = castRep.findings.filter((f) => f.rule === 'cast-name');
  result(castNames.length === 1 && /"Mei" is set on the face of Arjun Chen/.test(castNames[0].message) && cast.status === 1,
    'cast-name: "Mei" on the face content.ts gives Arjun fails; Sofia on her own face and the role "You" pass', JSON.stringify(castRep.findings).slice(0, 300));
  result(castRep.findings.some((f) => f.rule === 'cast-face' && /Arjun Chen/.test(f.message)), 'cast-face: one face standing for "Mei" and "Arjun" warns',
    JSON.stringify(castRep.findings).slice(0, 300));

  // 1. the starter as shipped
  const clean = run();
  result(clean.code === 0 && clean.rep.imports?.length > 0 && clean.rep.imports.every((x) => x.ok) && !clean.rep.findings.filter((f) => f.severity === 'error').length,
    "the starter as shipped: every module imports, no error", JSON.stringify(clean.rep.findings ?? clean.rep.error).slice(0, 300));
  result(!has(clean.rep, 'fit', 'error', /COPY/), "fit: the starter's own COPY lines fit the safe width", JSON.stringify(clean.rep.findings).slice(0, 200));
  // 5. progress on stderr, the report alone on stdout
  result(/precheck: 1-2\/4 importing \d+ modules/.test(clean.stderr) && /precheck:   imported \S+ \(\d+\.\d s; 1 of \d+\)/.test(clean.stderr) && /precheck:   imports done/.test(clean.stderr) && /precheck: 4\/4 measuring/.test(clean.stderr),
    'progress: each step and the first module imported go to stderr while --json stays parseable on stdout', clean.stderr.slice(0, 300));
  const quiet = run(['--quiet']);
  result(quiet.code === 0 && !/precheck: 1-2\/4/.test(quiet.stderr), '--quiet leaves the progress out', quiet.stderr.slice(0, 200));

  // frames: every act rendered at its first, middle and last frame; the starter renders clean
  result(clean.rep.frames?.acts === 4 && clean.rep.frames?.evaluated >= 10 && clean.rep.frames?.failed === 0 && !has(clean.rep, 'frames') && /precheck:   rendering every act at its first, middle and last frame \(\d+ frames of 4 acts/.test(clean.stderr),
    'frames: the starter renders every act at its first, middle and last frame without an error', JSON.stringify(clean.rep.frames));
  // a planted runtime error (a status the film never gave, read past frame 0 of the act) fails with the act, its frames and
  // the file:line; a browser global read on the act's first frame is a warning (precheck cannot evaluate it, a render can)
  const ACT2 = path.join(film, 'src', 'acts', 'Act2.tsx');
  const act2 = fs.readFileSync(ACT2, 'utf8');
  fs.writeFileSync(ACT2, `import React from 'react';
import { useCurrentFrame } from 'remotion';

const STATUSES: { label: string }[] = [];
export const Act2: React.FC = () => {
  const f = useCurrentFrame();
  if (f === 0) return <div style={{ width: (window as any).innerWidth }} />;
  return <div>{STATUSES[(f % 3) - 3].label}</div>;
};
`);
  const planted = run();
  result(planted.code === 1 && has(planted.rep, 'frames', 'error', /Act2\.tsx:8 act "plate" at f\d+, f\d+ \(\d+\.\d s\) throws while it renders: TypeError: Cannot read properties of undefined \(reading 'label'\)/) && planted.rep.frames?.failed === 3,
    'frames: a planted TypeError fails with the act, the two frames it throws on and the file:line', JSON.stringify(planted.rep.findings.filter((f) => /frames/.test(f.rule)).map((f) => `${f.rule} ${f.where} ${f.message.slice(0, 120)}`)));
  result(has(planted.rep, 'frames-env', 'warn', /Act2\.tsx:7 act "plate" at f\d+ \(.*reaches for window/) && !has(planted.rep, 'frames', 'error', /window/),
    'frames: a browser global read while rendering is a warning (frames-env), not an error', JSON.stringify(planted.rep.findings.filter((f) => /frames/.test(f.rule)).map((f) => `${f.rule} ${f.where}`)));
  const skipped = run(['--no-frames']);
  result(skipped.code === 0 && skipped.rep.frames === null && !has(skipped.rep, 'frames'), '--no-frames renders no act', JSON.stringify(skipped.rep.frames));
  fs.writeFileSync(ACT2, act2);

  // 9. the case: with a SPINE_PLAN, a word of the case an act lists that no scene or COPY entry carries fails (case); one
  // the film shows passes; another listed string nobody shows warns (case-strings)
  const TLS = path.join(film, 'src', 'timeline.ts');
  const tls = fs.readFileSync(TLS, 'utf8');
  fs.writeFileSync(TLS, `${tls}\nexport const SPINE_PLAN = { case: { request: 'plinth cuts to music', names: ['Sunday Choir'], numbers: [] }, acts: [
  { verb: 'cuts', strings: ['plinth cuts'] }, { verb: 'lands', strings: ['Cuts land.', 'Sunday Choir', 'Rehearsal at ten'] }] };\n`);
  const cased = run(['--no-frames']);
  fs.writeFileSync(TLS, tls);
  const caseF = cased.rep.findings.filter((f) => f.rule === 'case' || f.rule === 'case-strings');
  result(cased.code === 1 && caseF.length === 2 && has(cased.rep, 'case', 'error', /act 2 \(lands\) lists "Sunday Choir"/) && has(cased.rep, 'case-strings', 'warn', /"Rehearsal at ten"/),
    'case: an act listing a word of the case no scene carries fails, a listed string the film shows passes, another unseen string warns',
    JSON.stringify(caseF.map((f) => `${f.rule} ${f.severity} ${f.message.slice(0, 90)}`)));

  // 2-4. an act with every fault, a content module with long and cut strings
  const ACT = path.join(film, 'src', 'acts', 'Faulty.tsx');
  fs.writeFileSync(ACT, `import React from 'react';
import { DenseScreen, filmWorld, KitFallback, ProjectPanel, sample, sampleWorld, StatCard } from '../kit';
import { Photo } from '../fx/Photo';
import { E } from '../lib/anim';
import { landBeforeCut } from '../lib/continuity';

landBeforeCut({ from: 100, dur: 34, ease: E.glideOut, id: 'faulty slide' }, 110);
const W = filmWorld({ records: [{ title: 'Send Maya the slides' }] });
const OLD = sampleWorld('faulty');
const GALLERY = sample().world('faulty');
const props = { frame: 0, world: W };
export const Faulty: React.FC = () => (
  <div>
    <DenseScreen frame={0} seed="faulty" kind="support" />
    <DenseScreen frame={0} world={W} />
    <DenseScreen {...props} />
    <ProjectPanel frame={0} />
    <StatCard frame={0} value={3} />
    <KitFallback frame={0} w={100} h={100} />
    <Photo photo={{ src: 'x.jpg' } as never} frame={0} />
    <span>{OLD.screen}{GALLERY.screen}</span>
  </div>
);
`);
  fs.writeFileSync(path.join(film, 'src', 'content.ts'), `export const CONTENT = {
  title: 'Send Maya the slides',
  cut: 'Contracts waiting on le...',
  long: 'This status line keeps going and going well past the edge of any card in the frame, and then on across the whole safe width of the frame as well',
  mid: 'This status line is a little too long for one card column',
};
`);
  // the same parts through a namespace import: K.sample() at load, <K.ProjectPanel> without data, <K.DenseScreen> with a world
  const NS = path.join(film, 'src', 'acts', 'Spaced.tsx');
  fs.writeFileSync(NS, `import React from 'react';
import * as K from '../kit';

const R = K.sample().review;
export const Spaced: React.FC = () => (
  <div>
    <K.ProjectPanel frame={0} />
    <K.DenseScreen frame={0} world={K.filmWorld({ records: [{ title: 'Pay the rent' }] })} />
    <span>{R.product}</span>
  </div>
);
`);
  const dev = run();
  fs.rmSync(NS);
  const kitWhere = (n) => new RegExp(`Faulty\\.tsx:${n}\\b`);
  const nsWhere = (n) => new RegExp(`Spaced\\.tsx:${n}\\b`);
  result(has(dev.rep, 'kit-sample', 'error', nsWhere(4)) && has(dev.rep, 'kit-empty', 'error', nsWhere(7)) && !has(dev.rep, 'kit-empty', null, nsWhere(8)) && has(dev.rep, 'kit-sample', 'error', /sample\(\)/),
    'namespace import (import * as K from "../kit"): K.sample() fails (kit-sample, in the source and at load), <K.ProjectPanel> without data fails, <K.DenseScreen> with a world passes', JSON.stringify(dev.rep.findings.filter((f) => /Spaced|sample\(\)/.test(`${f.where} ${f.message}`)).map((f) => `${f.rule} ${f.where}`)));
  result(dev.code === 1 && has(dev.rep, 'kit-empty', 'error', kitWhere(14)) && has(dev.rep, 'kit-empty', 'error', kitWhere(17)) && has(dev.rep, 'kit-empty', 'error', kitWhere(18)) && has(dev.rep, 'kit-empty', 'error', kitWhere(19)),
    'kit-empty: DenseScreen without world, ProjectPanel without data, StatCard without label, KitFallback fail with their line', JSON.stringify(dev.rep.findings.filter((f) => f.rule === 'kit-empty').map((f) => f.where)));
  result(!has(dev.rep, 'kit-empty', null, kitWhere(15)) && !has(dev.rep, 'kit-empty', null, kitWhere(16)) && !has(dev.rep, 'kit-empty', null, kitWhere(20)),
    'kit-empty: a DenseScreen given a world, spread props and fx/Photo pass');
  result(has(dev.rep, 'kit-sample', 'error', kitWhere(9)) && has(dev.rep, 'kit-sample', 'error', kitWhere(10)), 'kit-sample: the retired sampleWorld() and a sample() call in the film fail', JSON.stringify(dev.rep.findings.filter((f) => f.rule === 'kit-sample').map((f) => f.where)));
  result(has(dev.rep, 'timing', 'warn', /faulty slide/) && dev.rep.imports.find((x) => x.file === 'src/acts/Faulty.tsx')?.ok, 'timing: a move cut mid-ease at module load warns in dev, and the act still imports', JSON.stringify(dev.rep.findings.filter((f) => f.rule === 'timing')).slice(0, 200));
  result(has(dev.rep, 'truncated', 'error', /Contracts waiting/) && has(dev.rep, 'fit', 'error', /keeps going/) && has(dev.rep, 'fit-long', 'warn', /a little too long/) && !has(dev.rep, 'fit', null, /Send Maya/),
    'fit: an ellipsis fails, a string wider than the safe width fails, one wider than a card column warns, a short one passes', JSON.stringify(dev.rep.findings.filter((f) => /fit|trunc/.test(f.rule)).map((f) => f.rule + ' ' + f.message.slice(0, 40))));
  result(dev.ms < 60000, `the check runs in seconds (${(dev.ms / 1000).toFixed(1)} s)`);

  const ship = run(['--ship']);
  result(ship.code === 1 && has(ship.rep, 'timing', 'error', /faulty slide|Faulty/) && ship.rep.imports.find((x) => x.file === 'src/acts/Faulty.tsx')?.ok === false,
    'timing: under --ship the same assert throws at import and fails', JSON.stringify(ship.rep.findings.filter((f) => f.rule === 'timing')).slice(0, 200));

  // COPY lines: set at their role size, a line wider than the safe width fails; in a film whose acts size lines to the
  // width (fitSize) a line that only fits a little smaller passes, one set under 75 % of its role warns, under half fails
  const TL = path.join(film, 'src', 'timeline.ts');
  const tl0 = fs.readFileSync(TL, 'utf8');
  fs.writeFileSync(TL, `${tl0}\nCOPY.push({ id: 'zzmid', text: 'Your voice memos become one clean list, sorted by day, every morning' } as never, { id: 'zzlong', text: 'Your voice memos become one clean list, sorted by day, every single morning, with every task you said out loud on the walk home' } as never);\n`);
  fs.writeFileSync(ACT, `export const N = 1;\n`);
  const plain = run();
  result(has(plain.rep, 'fit', 'error', /zzmid/) && has(plain.rep, 'fit', 'error', /zzlong/), 'fit: a COPY line set at its role size and wider than the safe width fails', JSON.stringify(plain.rep.findings.filter((f) => /fit/.test(f.rule)).map((f) => `${f.rule} ${f.where} ${f.message.slice(0, 60)}`)));
  fs.writeFileSync(path.join(film, 'src', 'acts', 'Sized.tsx'), `import { fitSize } from '../lib/measure';\nexport const size = (t: string) => fitSize(t, 1000, 84, 450, 0);\n`);
  const sized = run();
  result(has(sized.rep, 'fit-small', 'warn', /zzmid/) && has(sized.rep, 'fit', 'error', /zzlong/) && !has(sized.rep, 'fit', 'error', /zzmid/), 'fit: in a film that sizes lines to the width, a line set under 75 % of its role warns, under half fails', JSON.stringify(sized.rep.findings.filter((f) => /fit/.test(f.rule)).map((f) => `${f.rule} ${f.where} ${f.message.slice(0, 90)}`)));
  fs.writeFileSync(TL, tl0);
  fs.rmSync(path.join(film, 'src', 'acts', 'Sized.tsx'));

  // an act that imports a stylesheet and a picture: the plain run fails on them, the stubbed second run imports it
  fs.writeFileSync(path.join(film, 'src', 'acts', 'look.css'), '.a { color: red; }\n');
  fs.writeFileSync(path.join(film, 'src', 'acts', 'pic.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(ACT, `import './look.css';\nimport pic from './pic.png';\nexport const PIC = pic;\n`);
  fs.rmSync(path.join(film, 'src', 'content.ts'));
  const media = run();
  result(media.rep.imports?.find((x) => x.file === 'src/acts/Faulty.tsx')?.ok === true && !has(media.rep, 'imports', 'error'), 'imports: an act importing css and a picture loads (stubbed on a second run)', JSON.stringify(media.rep.findings ?? media.rep.error).slice(0, 200));

  fs.writeFileSync(ACT, `export const N = 1;\nif (N > 0) throw new Error("timeline: the claim line is read until f400 and leaves by f420, after its act's cut (f410)");\n`);
  const bare = run();
  result(bare.code === 1 && has(bare.rep, 'timing', 'error', /timingFail/), "timing: a bare throw in a timing assert is an error in dev too (route it through timingFail)", JSON.stringify(bare.rep.findings).slice(0, 200));
} finally {
  // the node_modules link goes first, on its own, so nothing ever walks into the starter's packages
  const link = path.join(film, 'node_modules');
  try {
    fs.unlinkSync(link);
  } catch {
    try {
      fs.rmdirSync(link);
    } catch {}
  }
  if (!fs.existsSync(link)) fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} failed` : '\nall pass');
process.exit(failed ? 1 : 0);
