#!/usr/bin/env node
/**
 * launch-simple.test.mjs: the default launch template, played as a spine, read from its modules (no render).
 *
 *   1. the spine   the scaffold's src/spine.ts plans with no error (SPINE_PLAN.issues.errors empty): one element, 3-5
 *                  acts on whole bars, the lockup as the last scene; one change per scene boundary, every one carried
 *                  (no bare cut: a handover its two forms allow, by the form table or the template's viaOptions, or the
 *                  mark's own entry), no kind on more than 40 % of the changes; the handover plan is the changes
 *                  (HANDOVER_PLAN, one per change, scenes - 1); no scene over 3 s, the lockup 2.5 s at most.
 *   2. lines       at most four; alone only for the promise (the first act) and the claim; each arrives, is whole and
 *                  leaves inside its scene (in < resolved < out), whole on the music's 16th; a line alone at a cap of 6 %
 *                  of the frame or more, in 3 chunks at most, read in 1.2 s at most.
 *   3. stage       every drawn handover's spec (acts/stage specAt) has finite boxes of positive size on both sides on
 *                  every frame of its span, and the element's state there is finite (lib/handover handoverState).
 *   4. sound       src/sync.ts: every cue inside the film, every handover sounds by its kind (the scene-internal ones
 *                  through their scenes), the world's turn
 *                  takes the drop, one lockup hit at weight 1 on the frame the mark lands; declares() gives each drawn
 *                  handover's box track (finite, on every frame of its span) and the world's steps.
 *   5. the end     the mark lands, then the name, then the fact; the end lock runs from the fact to the last frame; no
 *                  settle-out (no fadeEnd seam): the lockup stays whole to the last frame, 1.5 s or more from the mark;
 *                  the world's one turn is the film's colour event.
 *   5b. grounds    one ground for the film (GROUND_PLAN): at most one deliberate change (the flood and its return);
 *                  every scene painted on FILM_GROUND or the one flood; SUBJECTS: no subject over 4.5 s in a row, and a
 *                  spine whose consecutive scenes share a subject past 4.5 s is refused by name.
 *   6. a bad spine a bare cut inside an act is a spine error (SPINE_PLAN.issues.errors names it).
 *   7. grid-check  --part spine passes on the scaffold.
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
const url = (p) => pathToFileURL(path.join(DIR, 'src', p)).href;

/** Run a probe body (TypeScript, top-level await) in a fresh process; it sets `out`. */
const run = (body) => {
  const file = path.join(DIR, `probe-${fs.readdirSync(DIR).length}.mts`);
  fs.writeFileSync(file, `let out: any = {};\ntry {\n${body}\n} catch (e: any) { out.error = String(e?.stack ?? e).split('\\n').slice(0, 3).join(' | '); }\nconsole.log('@@' + JSON.stringify(out));\n`);
  const r = spawnSync(process.execPath, [TSX, file], { cwd: DIR, encoding: 'utf8', env: { ...process.env, CINETIC_GATE: '' }, maxBuffer: 64 * 1024 * 1024 });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
  return line ? JSON.parse(line.slice(2)) : { error: (r.stderr || r.stdout || 'no output').trim().split('\n').slice(-3).join(' | ') };
};

try {
  const P = run(`
  const T: any = await import(${JSON.stringify(url('timeline.ts'))});
  const L: any = await import(${JSON.stringify(url('lib/spine.ts'))});
  const HO: any = await import(${JSON.stringify(url('lib/handover.ts'))});
  const S: any = await import(${JSON.stringify(url('acts/stage.tsx'))});
  const Y: any = await import(${JSON.stringify(url('sync.ts'))});
  const WD: any = await import(${JSON.stringify(url('world.tsx'))});
  const sp = T.SPINE_PLAN;
  out.errors = sp.issues.errors; out.element = sp.element; out.fps = T.FPS; out.total = T.TOTAL; out.bodyEnd = T.BODY_END; out.bar = T.BAR;
  out.acts = sp.acts.map((a: any) => ({ from: a.from, to: a.to, bars: a.bars, world: a.world }));
  out.scenes = T.SCENES.map((s: any) => ({ i: s.i, act: s.act, form: s.form, name: s.name, from: s.from, to: s.to }));
  // a change is allowed by the grammar's recipes, or by the template's own viaOptions (into a scene that opens on its own
  // picture the element grows into it or opens onto it; into an element on screen it may fly there)
  out.changes = T.CHANGES.map((c: any) => ({ kind: c.kind, at: c.at, from: c.from, to: c.to, allowed: c.kind === 'cut' || c.kind === 'entry' ? null : T.viaAllows ? T.viaAllows(c.from.form, c.to.form, c.kind, !!T.CAST[c.to.scene]?.ff) : L.allows(c.from.form, c.to.form, c.kind) }));
  const kinds: Record<string, number> = {};
  for (const c of T.CHANGES) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
  out.seamShare = Math.max(...Object.values(kinds)) / Math.max(1, T.CHANGES.length);
  out.longest = Math.max(...T.SCENES.map((s: any) => s.to - s.from)) / T.FPS;
  out.lockupLen = (T.SCENES[T.SCENES.length - 1].to - T.SCENES[T.SCENES.length - 1].from) / T.FPS;
  out.alone = T.COPY.filter((c: any) => c.place === 'alone').map((c: any) => ({ cap: c.cap, chunks: c.chunks, read: (c.out - c.in) / T.FPS }));
  out.plan = T.HANDOVER_PLAN.map((h: any) => ({ kind: h.kind, at: h.at, span: h.span, from: h.from, to: h.to, draws: h.draws }));
  out.end = sp.end;
  out.lines = T.LINES.map((l: any) => ({ id: l.id, place: l.place, act: l.act, claim: l.claim, scene: l.scene, in: l.in, resolved: l.resolved, out: l.out, q16: T.q16(l.resolved) === l.resolved }));
  // 3. the drawn handovers' boxes and state on every frame of their spans
  out.specs = T.HANDOVER_PLAN.map((h: any, k: number) => {
    if (h.draws !== 'handover') return null;
    const s = S.specAt(k);
    if (!s) return { k, missing: true };
    const bad: string[] = [];
    for (let f = h.span[0]; f <= h.span[1]; f++) {
      const a = typeof s.from.box === 'function' ? s.from.box(f) : s.from.box;
      const b = typeof s.to.box === 'function' ? s.to.box(f) : s.to.box;
      const st = HO.handoverState(f, s, { fps: T.FPS, width: T.W, height: T.H });
      const e = st.el.shape;
      const okBox = (x: any) => x && [x.x, x.y, x.w, x.h].every(Number.isFinite) && x.w > 0 && x.h > 0;
      if (!okBox(a) || !okBox(b) || ![e.x, e.y, e.w, e.h, st.el.opacity, st.el.content.a, st.el.content.b].every(Number.isFinite)) bad.push(String(f));
    }
    return { k, kind: h.kind, bad };
  });
  // 4. the sound and the declares
  out.cues = Y.default().map((e: any) => ({ f: e.f, kind: e.kind, weight: e.weight, id: e.id }));
  out.declares = Y.declares().map((d: any) => ({ id: d.id, seams: (d.seams ?? []).map((x: any) => ({ at: x.at, kind: x.kind, id: x.id, span: x.span, track: x.track })) }));
  out.lock = { lockup: T.LOCKUP_AT, name: T.NAME_AT, fact: T.FACT_AT, end: T.END };
  out.grounds = T.GROUND_PLAN; out.filmGround = T.FILM_GROUND; out.cast = T.CAST.map((c: any) => c.ground); out.subjects = T.SUBJECTS.map((r: any) => ({ subject: r.subject, len: (r.to - r.from) / T.FPS }));
  out.seams = T.SEAMS.map((x: any) => ({ at: x.at, kind: x.kind, id: x.id }));
  out.colour = T.COLOUR; out.worldTurn = WD.WORLD_TURN.at;
  out.turn = sp.world.find((w: any) => w.step === 'turn') ?? null;
  out.hid = Object.fromEntries(L.HANDOVER_KINDS.map((k: string) => [k, L.HANDOVERS[k].id]));
  `);
  result(!P.error, 'the scaffold imports (timeline, stage, sync, world)', P.error);
  if (!P.error) {
    // 1. the spine
    const nS = P.scenes.length;
    result(!P.errors.length && !!P.element && P.acts.length >= 3 && P.acts.length <= 5 && P.scenes[nS - 1].form === 'mark',
      `spine: no error, one element ("${P.element}"), ${P.acts.length} acts, the lockup as the last scene`, JSON.stringify({ errors: P.errors, last: P.scenes[nS - 1] }));
    result(P.acts.every((a, i) => (i === 0 || a.from === P.acts[i - 1].to) && Number.isInteger(a.bars) && a.bars > 0), 'spine: acts contiguous on whole bars', JSON.stringify(P.acts));
    const carried = P.changes.every((c) => c.kind !== 'cut' && (c.kind === 'entry' ? c.to.form === 'mark' : c.allowed === true));
    result(P.changes.length === nS - 1 && carried, `spine: ${P.changes.length} changes for ${nS} scenes, every one carried by a handover its forms allow (${P.changes.map((c) => c.kind).join(', ')})`,
      JSON.stringify(P.changes.map((c) => [c.from.form, c.to.form, c.kind, c.allowed])));
    result(P.plan.length === P.changes.length && P.plan.every((h, i) => h.kind === P.changes[i].kind && h.at === P.changes[i].at && h.span[0] <= h.at && h.at < h.span[1]),
      'spine: the handover plan is the changes, each span around its cut', JSON.stringify(P.plan));
    result(P.changes.length < 5 || P.seamShare <= 0.4 + 1e-9, `spine: no handover kind on more than 40 % of the changes (${Math.round(P.seamShare * 100)} %)`);
    result(P.longest <= 3 + 1e-9 && P.lockupLen <= 2.5 + 1e-9, `scenes: none over 3 s (longest ${P.longest.toFixed(2)} s), the lockup 2.5 s at most (${P.lockupLen.toFixed(2)} s)`);
    result(P.alone.length > 0 && P.alone.every((l) => l.cap >= 0.06 && l.chunks <= 3 && l.read <= 1.2 + 1 / 30),
      'lines: a line alone sets at a cap of 6 % of the frame or more, arrives in 3 chunks at most and is read in 1.2 s at most', JSON.stringify(P.alone));

    // 2. lines
    const alone = P.lines.filter((l) => l.place === 'alone');
    result(P.lines.length <= 4 && alone.every((l) => l.claim || l.act === 0), `lines: ${P.lines.length} (four at most), alone only for the promise and the claim`, JSON.stringify(P.lines.map((l) => [l.id, l.place, l.act])));
    const sceneOf = (i) => P.scenes[i];
    result(P.lines.every((l) => l.in < l.resolved && l.resolved < l.out && l.in >= sceneOf(l.scene).from - 1 && l.q16),
      'lines: each arrives, is whole on the music\'s 16th and leaves after it, inside its scene', JSON.stringify(P.lines));

    // 3. stage
    const drawn = P.specs.filter(Boolean);
    result(drawn.length >= 1 && drawn.every((s) => !s.missing && !s.bad.length),
      `stage: ${drawn.length} drawn handover(s), finite boxes on both sides and a finite element on every frame of each span`, JSON.stringify(drawn.filter((s) => s.missing || s.bad.length)));

    // 4. sound and declares
    const total = P.total;
    result(P.cues.length > 0 && P.cues.every((e) => e.f >= 0 && e.f < total && Number.isFinite(e.f)), `sound: ${P.cues.length} cues, all inside the film`, JSON.stringify(P.cues.filter((e) => !(e.f >= 0 && e.f < total))));
    const sounded = P.plan.filter((h) => h.kind !== 'cut' && h.kind !== 'entry' && !['stay', 'word', 'part', 'same-surface'].includes(h.kind));
    result(sounded.every((h) => P.cues.some((e) => e.id.includes(`${P.hid[h.kind]}-${h.kind}-`))), 'sound: every handover sounds by its kind (the scene-internal stay, word, part and same-surface sound through their scenes)', JSON.stringify(sounded.map((h) => h.kind)));
    const hits = P.cues.filter((e) => /lockup$/.test(e.id));
    result(hits.length === 1 && hits[0].kind === 'hit' && hits[0].weight === 1 && hits[0].f === P.lock.lockup, 'sound: one lockup hit at weight 1 on the frame the mark lands', JSON.stringify(hits));
    result(!P.turn || P.cues.some((e) => e.kind === 'drop' && e.f === P.turn.at), 'sound: the world\'s turn takes the drop', JSON.stringify(P.turn));
    const tracks = P.declares.filter((d) => /^handover-/.test(d.id));
    const tracksOk = tracks.length === drawn.length && tracks.every((d) => d.seams.length === 1 && Array.isArray(d.seams[0].track) && d.seams[0].track.length === d.seams[0].span[1] - d.seams[0].span[0] + 1
      && d.seams[0].track.every((r) => r.length === 5 && r.every(Number.isFinite) && r[3] > 0 && r[4] > 0));
    result(tracksOk && P.declares.some((d) => d.id === 'world-steps'), `declares: each drawn handover's box track on every frame of its span (${tracks.length}), the world's steps`,
      JSON.stringify(tracks.map((d) => [d.id, d.seams[0]?.track?.length, d.seams[0]?.span])));

    // 5. the end
    const L5 = P.lock;
    const lastAct = P.acts[P.acts.length - 1];
    result(L5.lockup >= lastAct.from && L5.lockup < L5.name && L5.name < L5.fact && L5.fact < total && L5.end.to === total && L5.end.from > L5.fact && L5.end.from < total,
      'end: the mark lands in the last act, then the name, then the fact; the end lock runs from the fact to the last frame', JSON.stringify(L5));
    result(!P.seams.some((x) => x.kind === 'fadeEnd') && (total - L5.lockup) / P.fps >= 1.5,
      'end: no settle-out; the lockup stays whole to the last frame, 1.5 s or more from the mark', JSON.stringify({ lockup: L5.lockup, total, seams: P.seams.filter((x) => x.kind === 'fadeEnd') }));
    // 5b. one ground, one subject at a time
    const g = P.grounds;
    let changes = 0;
    for (let k = 0; k + 1 < g.length; k++) {
      changes++;
      if (k + 2 < g.length && g[k + 2].ground === g[k].ground) k++; // a flood and its return count as one
    }
    result(g.length >= 1 && g[0].from === 0 && g[g.length - 1].to === total && changes <= 1 && P.cast.every((c) => c === P.filmGround || c === 'field') && P.cast.filter((c) => c === 'field').length <= 1,
      `grounds: one ground (${P.filmGround}) with at most one deliberate change (${changes}: ${g.map((r) => r.ground).join(' > ')})`, JSON.stringify(g));
    result(P.subjects.every((r) => r.len <= 4.5 + 1e-9), `subjects: none over 4.5 s in a row (longest ${Math.max(...P.subjects.map((r) => r.len)).toFixed(2)} s)`, JSON.stringify(P.subjects));
    result(P.turn ? P.colour.length === 1 && P.colour[0].from === P.turn.at && P.worldTurn === P.turn.at : !P.colour.length,
      'end: the world\'s one turn is the film\'s colour event (declared from its cut; the world turns there)', JSON.stringify({ turn: P.turn, colour: P.colour, world: P.worldTurn }));
  }

  // 6. a bare cut inside an act is a spine error
  const spinePath = path.join(DIR, 'src', 'spine.ts');
  const spineSrc = fs.readFileSync(spinePath, 'utf8');
  const cutSrc = spineSrc.replace(/(\{ form: 'button', name: 'press'[^}]*?)( \})/, "$1, via: 'cut'$2");
  if (cutSrc === spineSrc) result(false, 'a bad spine: the scaffold\'s press scene was found to cut into', 'no { form: \'button\', name: \'press\' ... } in src/spine.ts');
  else {
    fs.writeFileSync(spinePath, cutSrc);
    const B = run(`const T: any = await import(${JSON.stringify(url('timeline.ts'))}); out.errors = T.SPINE_PLAN.issues.errors;`);
    fs.writeFileSync(spinePath, spineSrc);
    result(!B.error && B.errors.some((e) => /bare cut inside an act/.test(e)), 'a bad spine: a bare cut inside an act is a spine error', B.error ?? JSON.stringify(B.errors));
  }

  // 6b. a spine that keeps one subject over 4.5 s is refused by name
  {
    const src0 = fs.readFileSync(spinePath, 'utf8');
    let n = 0;
    const one = src0.replace(/(\{ form: '[a-z-]+', name: '[^']+')/g, (m) => (n++ < 4 ? `${m}, subject: 'one-card'` : m));
    fs.writeFileSync(spinePath, one);
    const R = run(`const T: any = await import(${JSON.stringify(url('timeline.ts'))}); out.subjects = T.SUBJECTS.map((r: any) => (r.to - r.from) / T.FPS);`);
    fs.writeFileSync(spinePath, src0);
    result(n >= 4 && !!R.error && /on one subject \("one-card"/.test(R.error), 'subjects: four scenes on one subject past 4.5 s are refused by name', R.error ?? JSON.stringify(R.subjects));
  }

  // 7. grid-check --part spine on the scaffold
  const g = spawnSync(process.execPath, [TSX, path.join(SKILL, 'scripts', 'grid-check.ts'), 'src/timeline.ts', '--part', 'spine', '--json'], { cwd: DIR, encoding: 'utf8', env: { ...process.env, CINETIC_GATE: '' }, maxBuffer: 64 * 1024 * 1024 });
  let gj = null;
  try {
    gj = JSON.parse(g.stdout.slice(g.stdout.indexOf('{')));
  } catch {}
  const gErr = gj ? (gj.errors ?? gj.issues?.filter?.((x) => x.severity === 'error') ?? []) : null;
  result(g.status === 0, 'grid-check --part spine passes on the scaffold', g.status === 0 ? '' : JSON.stringify(gErr ?? (g.stderr || g.stdout).slice(-400)).slice(0, 500));
} finally {
  // the link to the starter's node_modules goes first (the folder it points at stays)
  try {
    fs.unlinkSync(path.join(DIR, 'node_modules'));
  } catch {}
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `launch-simple tests: ${failed} failed` : 'launch-simple tests: all pass');
process.exit(failed ? 1 : 0);
