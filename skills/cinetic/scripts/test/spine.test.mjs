#!/usr/bin/env node
/**
 * spine.test.mjs: the spine grammar of the Remotion starter (src/lib/spine.ts): one sentence played as acts, one case,
 * one element whose form changes from scene to scene, a handover at every change.
 *
 *   1. The house tables: fourteen handovers H1-H14, each with its frames inside its range (lead + land), a seam kind
 *      the checks know that says what it is (a shape carried: morph; a collapse under a blur: defocus; a reveal through
 *      an opening or a gap: mask; a push through: zoomThrough; an exit into a point and an entry out of it: breath;
 *      speed alone: velocity), no kind for more than half of them, and its channels; a converge's lead never under 8
 *      film frames (at 30 fps a 5-frame collapse reads as a dissolve squeezed into a frame: forensics ghost-cut), the
 *      other leads at the house rate; every recipe of the form table names a real handover; kindOf reads names
 *      and ids; handoversFor gives the house recipe first; shrink into a chip and converge through a point are
 *      always allowed; devicesFor reads a verb's family.
 *   2. planSpine on a launch spine of four acts over 12 bars at 30 fps: acts contiguous on bar lines (the first a
 *      quarter, the last a fifth), each act's scenes on whole beats inside it, the lockup added as the last scene,
 *      one change per scene boundary with a handover from the form table (act boundaries on downbeats), at least
 *      three kinds, the element on every change, lines placed (alone at the ends, inside / around between), the
 *      world's steps by position, the case shown in the acts that list it, no issues; the same plan twice.
 *   3. validateSpine fails what breaks the grammar: two acts, a bare cut inside an act, a middle-act alone line with
 *      no join, two turns, no request, a case shown in one act only, a pair with no handover, a device with no verb
 *      (a warning), more devices than acts + 1; an update spine of five acts.
 *   4. spineDeclares: one seam per change (none for the mark's own entry), a seam kind export-cues accepts, the
 *      handover in the id ('spine:H1-grow:request:pill>page'), a momentum seam's axis and direction; chainSentence
 *      reads the chain; changeAt and sceneAt find a frame's handover and scene.
 *
 * It runs src/lib/spine.ts through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/spine.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SRC = join(STARTER, 'src');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/spine.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const url = (p) => pathToFileURL(join(SRC, p)).href;
const PROBE = `
import * as S from '${url('lib/spine.ts')}';
const FPS = 30, BEAT = 15; // 120 BPM at 30 fps
const b = (n: number, beat = 0, sub = 0) => Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
const SPINE: S.Spine = {
  sentence: 'Pennant turns one sentence into a launch page that fills itself.',
  element: 'request',
  case: { request: 'A waitlist page for my Saturday ceramics class', result: 'pennant.page/ceramics', names: ['Saturday Ceramics'], numbers: ['128'] },
  acts: [
    { verb: 'asks', scenes: ['word', { form: 'pill', name: 'prompt' }], line: { text: 'Pennant writes your launch page.', becomes: 'pill' }, strings: ['A waitlist page for my Saturday ceramics class'], devices: [{ id: 'macro-type' }] },
    { verb: 'writes', scenes: [{ form: 'page', name: 'page' }], strings: ['Saturday Ceramics', 'Saturdays 10-12'], devices: [{ id: 'page-fly' }] },
    { verb: 'publishes', scenes: [{ form: 'button', name: 'publish' }, { form: 'pill', name: 'live' }], line: { text: 'Live at pennant.page/ceramics', place: 'inside' }, strings: ['pennant.page/ceramics'], devices: [{ id: 'push-press', signature: true }] },
    { verb: 'fills', scenes: [{ form: 'notice', name: 'signups' }, { form: 'count', name: 'count', via: 'converge' }], line: { text: 'It tells you who joins.', place: 'around' }, strings: ['Saturday Ceramics', '128 on the waitlist'], devices: [{ id: 'toast-stack' }] },
  ],
  claim: { text: 'One sentence. A full class.', join: { in: 'element' } },
};
const plan = S.planSpine(SPINE, { fps: FPS, b, bars: 12 });
const again = S.planSpine(SPINE, { fps: FPS, b, bars: 12 });
const v = (patch: (s: S.Spine) => S.Spine) => S.validateSpine(patch(JSON.parse(JSON.stringify(SPINE))));
const bad = {
  twoActs: v((s) => ({ ...s, acts: s.acts.slice(0, 2) })),
  cutInside: v((s) => { s.acts[2].scenes = [{ form: 'button' }, { form: 'pill', via: 'cut' }]; return s; }),
  aloneMiddle: v((s) => { s.acts[1].line = { text: 'It writes the page for you.', place: 'alone' }; return s; }),
  aloneMiddleJoined: v((s) => { s.acts[1].line = { text: 'It writes the page for you.', place: 'alone', becomes: 'page' }; return s; }),
  twoTurns: v((s) => { s.acts[1].world = 'turn'; s.acts[2].world = 'turn'; return s; }),
  noRequest: v((s) => ({ ...s, case: { request: '' } })),
  oneCaseAct: v((s) => { s.acts.forEach((a, i) => { a.strings = i === 0 ? a.strings : ['Welcome', 'Sign up']; }); return s; }),
  noRecipe: v((s) => { s.acts[1].scenes = [{ form: 'thread' }]; s.acts[2].scenes = [{ form: 'count' }, { form: 'pill' }]; return s; }),
  twoStep: v((s) => { s.acts[0].scenes = ['word']; return s; }),
  noVerbDevice: v((s) => { s.acts[1].devices = [{ id: 'carousel' }]; return s; }),
  tooManyDevices: v((s) => { s.acts[0].devices = [{ id: 'macro-type' }, { id: 'glass-input' }, { id: 'black-glass' }]; s.acts[3].devices = [{ id: 'toast-stack' }, { id: 'glass-counter' }]; return s; }),
  update5: v((s) => ({ ...s, format: 'update', acts: [...s.acts, { verb: 'counts', scenes: ['count'] }] })),
  andAlso: v((s) => ({ ...s, sentence: 'Pennant writes pages and also sends invoices.' })),
};
const momentum = S.planSpine({ ...SPINE, acts: SPINE.acts.map((a, i) => (i === 3 ? { ...a, scenes: [{ form: 'notice' }, { form: 'notice', via: 'momentum', dir: 'up' }, { form: 'count' }] } : a)) } as S.Spine, { fps: FPS, b, bars: 12 });
const entry = S.planSpine({ ...SPINE, end: { via: 'entry' } }, { fps: FPS, b, bars: 12 });
const downbeats = Array.from({ length: 13 }, (_, i) => b(i + 1));
console.log(JSON.stringify({
  kinds: S.HANDOVER_KINDS.map((k) => ({ k, ...S.HANDOVERS[k] })),
  table: Object.entries(S.FORM_PAIRS).flatMap(([row, cols]) => Object.entries(cols as object).flatMap(([col, rs]) => (rs as any[]).map((r) => ({ row, col, r })))),
  kindOf: [S.kindOf('grow'), S.kindOf('H3'), S.kindOf('h12'), S.kindOf('slide'), S.kindOf(undefined)],
  frames: Object.fromEntries([24, 30, 60].map((fps) => [fps, Object.fromEntries(S.HANDOVER_KINDS.map((k) => [k, S.handoverFrames(k, fps)]))])),
  pairs: { pillPage: S.handoversFor('pill', 'page'), cardMark: S.handoversFor('card', 'mark'), threadCount: S.handoversFor('thread', 'count'), wordPage: S.pairRecipes('word', 'page') },
  allows: [S.allows('thread', 'count', 'converge'), S.allows('thread', 'chip', 'shrink'), S.allows('thread', 'count', 'grow'), S.allows('pill', 'page', 'fly')],
  devices: [S.devicesFor('asks'), S.devicesFor('publishes'), S.devicesFor('choosing'), S.devicesFor('ponders'), S.stemVerb('publishes'), S.stemVerb('fills'), S.stemVerb('carries')],
  plan, same: JSON.stringify(plan) === JSON.stringify(again), downbeats,
  bad, momentum: { changes: momentum.changes, share: momentum.share, seams: S.spineDeclares(momentum).seams },
  entry: { end: entry.end, seams: S.spineDeclares(entry).seams.length, changes: entry.changes.length },
  seams: S.spineDeclares(plan).seams,
  chain: S.chainSentence(plan),
  at: { mid: S.changeAt(plan, plan.changes[1].at), none: S.changeAt(plan, plan.acts[1].from + 60), scene: S.sceneAt(plan, plan.acts[2].from + 2) },
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-spine-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 32 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const SEAM_KINDS = ['velocity', 'morph', 'hard', 'mask', 'whip', 'defocus', 'light', 'snapZoom', 'breath', 'zoomThrough', 'stepped', 'colour', 'dissolveUi', 'fadeEnd', 'wipe'];
const has = (issues, re) => issues.some((s) => re.test(s));

// 1. the house tables
result(P.kinds.length === 14 && P.kinds.every((k, i) => k.id === `H${i + 1}`), 'fourteen handovers, H1-H14 in order', P.kinds.map((k) => k.id).join(' '));
for (const k of P.kinds) {
  const total = k.lead + k.land;
  result(total >= k.frames[0] && total <= k.frames[1] + 1, `${k.id} ${k.k}: lead ${k.lead} + land ${k.land} f@60 inside its range ${k.frames.join('-')}`);
}
result(P.kinds.every((k) => SEAM_KINDS.includes(k.seam) && k.channels.length > 0 && ['handover', 'scene'].includes(k.draws)), 'every handover has a seam kind the checks know, channels and who draws it');
// the seam kind each handover really is (references/transitions.md section 3), so a spine film declares a mix of them
const IS = { grow: 'morph', shrink: 'defocus', swell: 'morph', 'press-open': 'mask', iris: 'mask', 'zoom-into': 'zoomThrough', 'pull-out': 'zoomThrough', fly: 'morph', stay: 'morph', word: 'morph', part: 'mask', converge: 'breath', 'same-surface': 'morph', momentum: 'velocity' };
const seamOf = Object.fromEntries(P.kinds.map((k) => [k.k, k.seam]));
const byKind = P.kinds.reduce((m, k) => ({ ...m, [k.seam]: (m[k.seam] ?? 0) + 1 }), {});
result(Object.entries(IS).every(([k, s]) => seamOf[k] === s) && Math.max(...Object.values(byKind)) <= 7 && Object.keys(byKind).length >= 6,
  'each handover declares the seam kind it is (collapse under a blur: defocus, opening or gap: mask, push through: zoomThrough, through a point: breath, speed: velocity, a shape carried: morph); no kind for more than half', JSON.stringify(byKind));
const fr = P.frames;
result(fr[30].converge[0] === 8 && fr[24].converge[0] === 8 && fr[60].converge[0] === 10 && fr[30].grow[0] === 6 && fr[30].fly[0] === 7 && fr[30].converge[1] === 13,
  "a converge's lead never under 8 film frames (8 at 24 and 30 fps, the house 10 at 60); the other leads and the landing at the house rate", JSON.stringify({ c24: fr[24].converge, c30: fr[30].converge, c60: fr[60].converge, grow30: fr[30].grow, fly30: fr[30].fly }));
result(P.kinds.filter((k) => k.channels.includes('E')).length === 13 && P.kinds.find((k) => k.k === 'momentum').channels.join('') === 'M', 'thirteen kinds carry the element; momentum carries speed alone');
const names = P.kinds.map((k) => k.k);
result(P.table.length > 30 && P.table.every((c) => (typeof c.r === 'string' ? names.includes(c.r) : c.r.via.every((x) => names.includes(x)) && typeof c.r.through === 'string')), `every recipe of the form table names real handovers (${P.table.length} recipes)`);
result(JSON.stringify(P.kindOf) === JSON.stringify(['grow', 'swell', 'converge', null, null]), 'kindOf reads a name, an id in either case, and nothing else', JSON.stringify(P.kindOf));
result(P.pairs.pillPage[0] === 'grow' && P.pairs.pillPage.includes('fly') && P.pairs.cardMark[0] === 'pull-out' && P.pairs.threadCount.length === 0, 'handoversFor: the house recipe first (pill -> page grows, a page -> mark pulls out); thread -> count has none', JSON.stringify(P.pairs));
result(typeof P.pairs.wordPage[0] === 'object' && P.pairs.wordPage[0].through === 'pill', 'word -> page goes part then grow through a pill (a two-step recipe)', JSON.stringify(P.pairs.wordPage));
result(JSON.stringify(P.allows) === JSON.stringify([true, true, false, true]), 'allows: converge through a point and shrink into a chip always; grow only where the table has it', JSON.stringify(P.allows));
result(P.devices[0].includes('macro-type') && P.devices[1].includes('push-press') && P.devices[2].includes('fan-focus') && P.devices[3].length === 0 && P.devices[4] === 'publish' && P.devices[5] === 'fill' && P.devices[6] === 'carry', 'devicesFor: a verb picks its family (asks, publishes, choosing); a verb no family names picks none', JSON.stringify(P.devices));

// 2. the plan
const pl = P.plan;
const acts = pl.acts;
result(acts.length === 4 && acts[0].from === 0 && acts.every((a, i) => i === 0 || a.from === acts[i - 1].to) && acts[3].to === P.downbeats[12], 'acts are contiguous and fill the 12 bars', JSON.stringify(acts.map((a) => [a.from, a.to])));
result(acts.every((a) => P.downbeats.includes(a.from) && P.downbeats.includes(a.to)), 'every act starts and ends on a bar line');
result(acts[0].share >= 0.2 && acts[0].share <= 0.32 && acts[3].share >= 0.12 && acts[3].share <= 0.31, `the first act is ${Math.round(acts[0].share * 100)} %, the last ${Math.round(acts[3].share * 100)} % (20-32 %, 12-31 %)`);
const sc = pl.scenes;
result(sc[sc.length - 1].form === 'mark' && sc[sc.length - 1].act === 3, 'the lockup is added as the last act\'s last scene');
result(sc.every((s) => s.to > s.from && (s.from - acts[s.act].from) % 15 === 0 && s.from >= acts[s.act].from && s.to <= acts[s.act].to), 'every scene has frames, starts on a whole beat inside its act');
result(pl.changes.length === sc.length - 1 && pl.changes.every((c, i) => c.at === sc[i + 1].from && c.from.scene === i && c.to.scene === i + 1), 'one change per scene boundary, at the incoming scene\'s first frame');
result(pl.changes.every((c) => c.span[0] <= c.at && c.span[1] > c.at && (c.kind === 'cut' || c.span[1] - c.span[0] > 0)), 'every change spans its handover around its cut');
result(pl.changes.filter((c) => c.boundary).every((c) => c.downbeat), 'act boundaries fall on downbeats');
result(pl.changes.every((c) => c.element) && pl.share.element === 1 && pl.share.withinAct === 1 && pl.share.bare === 0, 'the element carries every change');
result(Object.keys(pl.kinds).length >= 3, `the plan plays ${Object.keys(pl.kinds).length} kinds (at least 3): ${Object.keys(pl.kinds).join(', ')}`);
const cv = pl.changes.find((c) => c.from.form === 'notice' && c.to.form === 'count');
result(cv && cv.kind === 'converge' && cv.id === 'H12', 'a scene\'s via pins its handover (notice -> count converges)');
const g = pl.changes.find((c) => c.from.form === 'pill' && c.to.form === 'page');
result(g && g.kind === 'grow' && g.house && g.span[0] === g.at - 6 && g.span[1] === g.at + 9, 'pill -> page grows on its house frames (12 + 18 f@60 = 6 + 9 at 30 fps)', JSON.stringify(g));
result(pl.lines.length === 4 && pl.lines[0].place === 'alone' && pl.lines[0].join.out === 'element' && pl.lines[1].place === 'inside' && pl.lines[2].place === 'around' && pl.lines[3].id === 'claim' && pl.lines[3].position === 'last', 'lines: the promise alone and joined, inside and around between, the claim last', JSON.stringify(pl.lines.map((l) => [l.place, l.position, l.join])));
result(pl.world.map((w) => w.step).join(' ') === 'enter closer turn pull-back' && pl.world.every((w, i) => w.at === acts[i].from), 'the world\'s steps by position: enter, closer, turn, pull-back, on the act cuts');
const turnCh = pl.changes.find((c) => c.boundary && c.to.act === 2);
result(turnCh && !turnCh.carries.includes('G') && pl.changes.filter((c) => !c.boundary).every((c) => c.carries.includes('G')), 'the turn\'s boundary does not keep the ground; changes inside acts do');
result(acts.every((a) => a.case), 'the case shows in every act that lists it');
result(pl.devices.length === 4 && pl.devices.every((d) => d.fits) && pl.devices.filter((d) => d.signature).length === 1, 'devices: each fits its act\'s verb, one signature');
result(pl.issues.errors.length === 0 && pl.issues.warnings.length === 0, 'the spine plans with no issues', JSON.stringify(pl.issues));
result(P.same, 'planSpine is a pure function of its spine and grid (the same plan twice)');

// 3. validation
const B = P.bad;
result(has(B.twoActs.errors, /acts: 2 acts/), 'two acts fail (a launch plays 3-5)', B.twoActs.errors.join(' | '));
result(has(B.cutInside.errors, /bare cut inside an act/), 'a bare cut inside an act fails', B.cutInside.errors.join(' | '));
result(has(B.aloneMiddle.errors, /alone line in a middle act/) && !has(B.aloneMiddleJoined.errors, /alone line in a middle act/), 'a middle-act alone line fails unless it is joined (becomes)', B.aloneMiddle.errors.join(' | '));
result(has(B.twoTurns.errors, /2 turns/), 'two turns fail (one colour event a film)', B.twoTurns.errors.join(' | '));
result(has(B.noRequest.errors, /case: give the one request/), 'a spine with no request fails', B.noRequest.errors.join(' | '));
result(has(B.oneCaseAct.errors, /case shows in 1 act/), 'a case shown in one act only fails', B.oneCaseAct.errors.join(' | '));
result(has(B.noRecipe.errors, /no handover joins these forms/), 'a pair with no handover fails (go through a chip or a point)', B.noRecipe.errors.join(' | '));
result(has(B.twoStep.errors, /part then grow through a pill/), 'word -> page asks for the pill scene between them', B.twoStep.errors.join(' | '));
result(has(B.noVerbDevice.warnings, /carousel in act 2 serves no verb/), 'a device with no verb is warned', B.noVerbDevice.warnings.join(' | '));
result(has(B.tooManyDevices.errors, /devices: 7 for 4 acts/), 'more devices than acts + 1 fail', B.tooManyDevices.errors.join(' | '));
result(has(B.update5.errors, /5 acts; a update spine plays 3-4|5 acts; a update/), 'an update spine of five acts fails (3-4)', B.update5.errors.join(' | '));
result(has(B.andAlso.errors, /and also/), 'a sentence that needs "and also" fails (two films)', B.andAlso.errors.join(' | '));

// 4. declares
const seams = P.seams;
result(seams.length === pl.changes.length && seams.every((s, i) => s.at === pl.changes[i].at && SEAM_KINDS.includes(s.kind)), 'spineDeclares: one seam per change, a kind export-cues accepts');
result(seams.every((s, i) => s.id === `spine:${pl.changes[i].id}-${pl.changes[i].kind}:request:${pl.changes[i].from.form}>${pl.changes[i].to.form}`), 'each seam\'s id names the handover, the element and the forms', seams.map((s) => s.id).join(' '));
result(seams.every((s) => s.carry && s.element === 'request' && s.forms.length === 2 && s.span.length === 2), 'each seam carries its shape (or scale), the element, the forms and the span');
const mo = P.momentum.seams.find((s) => s.handover === 'momentum');
result(mo && mo.kind === 'velocity' && mo.carry === 'y' && mo.dir === -1, 'a momentum seam is a velocity seam with its axis and direction (up: y, -1)', JSON.stringify(mo));
result(P.momentum.share.momentum > 0 && P.momentum.changes.some((c) => c.kind === 'momentum' && !c.element), 'a momentum change carries speed, not the element');
result(P.entry.end.kind === 'entry' && P.entry.seams === P.entry.changes - 1, 'the mark\'s own entry declares no seam', JSON.stringify(P.entry));
result(P.chain.startsWith('request: word -swell-> pill -grow-> page |writes|') && P.chain.endsWith('-> mark'), 'chainSentence reads the chain', P.chain);
result(P.at.mid && P.at.mid.i === 1 && P.at.none === null && P.at.scene.act === 2, 'changeAt finds the handover of a frame (none in a hold); sceneAt the scene');

console.log(failed ? `\n${failed} test(s) failed` : '\nall spine tests passed');
process.exit(failed ? 1 : 0);
