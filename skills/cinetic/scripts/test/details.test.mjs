#!/usr/bin/env node
/**
 * details.test.mjs: the detail primitives of the Remotion starter against their house numbers. Pure state, plus
 * static markup of the drawn parts (react-dom/server); nothing renders in a browser.
 *
 *   1. dofSigma() (lib/defocus): sharp within 230 px of the focus, 7.5 px at 850 px and beyond, monotone between.
 *   2. Wash 'tilted' (fx/Washes): paper over the first third, 4 % / 24 % / 81 % of the tint at 34 / 52 / 84 % of the
 *      run, the tint at the edge; a linear field at angle 82; the tint the accent a fifth of the way to paper. The
 *      'tint' ground (fx/Grounds) draws it on the ground's base, carries no plates and is never dealt unasked.
 *   3. widenState(), CARD_TILT, cardTiltCss() (fx/Cards): the width share 1 % -> 10 % -> 31 % -> 93 % -> 100 % over
 *      40 f at 60 fps (20 at 30), opened about the centre, the content only in the last third; the lean-back plane is
 *      27 degrees about the top edge at perspective 1000, its top edge 70-85 % of the bottom; a Card with `reveal`
 *      draws a centre inset and hides its content until the last third.
 *   4. DrawPath (fx/DrawPath): drawn share 0 -> 1 on its cue, revealDash from the start, the end and the centre,
 *      elbowPath with one rounded corner, curvePath through its points, pointAtShare by arc length; a dashed path is
 *      a dash pattern shown through a mask (the pattern never moves), a solid one a pathLength dash.
 *   5. KeyRim (fx/Rim): lit 1 facing the key and the base on the far side, the width the eye reads thinning away
 *      from the key, conic stops brightest where the key is.
 *   6. Barrel (fx/Barrel): rows centred on the middle row, bands that tile without overlapping, squashed toward the
 *      drum's edges, outer rows in lower ink, side fragments 43 % of the word on the middle row and about 17 % on the
 *      outer ones; closed, only the middle row at the full line height.
 *   7. Cursor shapes plane and glassTri (fx/Cursor): the plane draws a rim in the accent under its body and a cast
 *      shadow; the glass triangle an ink fill at .55 with a white outline.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/details.test.mjs [--verbose]
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
const NM = join(STARTER, 'node_modules');
const TSX = join(NM, 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/details.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const nm = (p) => pathToFileURL(join(NM, p)).href;
const PROBE = `
import React from '${nm('react/index.js')}';
import { renderToStaticMarkup } from '${nm('react-dom/server.node.js')}';
import { FilmProvider } from '${url('lib/film.ts')}';
import * as D from '${url('lib/defocus.ts')}';
import * as W from '${url('fx/Washes.tsx')}';
import * as Cd from '${url('fx/Cards.tsx')}';
import * as Dp from '${url('fx/DrawPath.tsx')}';
import * as R from '${url('fx/Rim.tsx')}';
import * as B from '${url('fx/Barrel.tsx')}';
import * as Cu from '${url('fx/Cursor.tsx')}';
import * as Gr from '${url('fx/Grounds.tsx')}';
import { C } from '${url('brand/tokens.ts')}';
import { mixColor } from '${url('lib/color.ts')}';
const h = React.createElement;
const film60 = { fps: 60, width: 1920, height: 1080 };
const film30 = { fps: 30, width: 1920, height: 1080 };
const mk = (el: any) => renderToStaticMarkup(h(FilmProvider, { value: film60 } as any, el));
const out: any = {};
out.dof = [0, 100, 230, 400, 540, 850, 1200].map((d) => D.dofSigma(d));
out.dofNeg = D.dofSigma(-850);
out.tilted = W.washStops('tilted', '#FFFFFF', '#000000');
out.tiltedField = W.washField('tilted', { paper: '#FFFFFF' });
out.tiltTint = mixColor(C.accent, C.paper, 0.2);
out.tiltedDefault = W.washField('tilted');
out.grounds = { kinds: Gr.GROUND_KINDS, clean: Gr.CLEAN_KINDS, tintKinds: Gr.TINT_KINDS, gain: Gr.KIND_GAIN.tint, shapes: Gr.groundShapes({ kind: 'tint', base: '#F5F6F7', seed: 1 }).length, dealt: Gr.dealGrounds(12, { bases: ['#F5F6F7', '#E9EBEE'], seed: 3 }).map((g: any) => g.kind) };
out.tintGround = mk(h(Gr.LitGround, { frame: 30, spec: { kind: 'tint', base: '#F5F6F7' } } as any));
out.widen60 = [0, 10, 20, 30, 40, 50].map((d) => Cd.widenState(100 + d, { at: 100 }, film60));
out.widen30 = Cd.widenState(110, { at: 100 }, film30);
out.widenBefore = Cd.widenState(99, { at: 100 }, film60);
out.lean = Cd.CARD_TILT.leanBack;
out.leanCss = Cd.cardTiltCss(Cd.CARD_TILT.leanBack, film60);
out.cardMid = mk(h(Cd.Card, { frame: 110, box: Cd.cardBox(100, 100, 600, 400), reveal: { at: 100 } } as any, h('div', { 'data-text': 'x' }, 'Invoices sent')));
out.cardDone = mk(h(Cd.Card, { frame: 200, box: Cd.cardBox(100, 100, 600, 400), reveal: { at: 100 }, tilt: Cd.CARD_TILT.leanBack } as any, h('div', null, 'Invoices sent')));
out.draw = [99, 100, 118, 136, 200].map((f) => Dp.drawPathState(f, { at: 100 }, film60).drawn);
out.drawRev = Dp.drawPathState(200, { at: 100, reverse: true }, film60).drawn;
out.dashStart = Dp.revealDash(0.25, 'start');
out.dashEnd = Dp.revealDash(0.25, 'end');
out.dashCentre = Dp.revealDash(0.5, 'centre');
out.elbow = Dp.elbowPath([0, 0], [200, 120], { r: 30 });
out.elbowY = Dp.elbowPath([0, 0], [200, 120], { r: 500, axis: 'y' });
out.curve = Dp.curvePath([[0, 0], [100, 50], [200, 0]]);
out.half = Dp.pointAtShare([[0, 0], [100, 0], [100, 100]], 0.5);
out.dashed = mk(h(Dp.DrawPath, { frame: 118, at: 100, d: 'M0 0 L300 0', dash: [12, 10] } as any));
out.solid = mk(h(Dp.DrawPath, { frame: 118, at: 100, points: [[0, 0], [300, 0]], head: {} } as any));
out.rim = { face: R.rimLight(-35, -35), far: R.rimLight(145, -35), alphaFar: R.rimAlphaAt(145, -35), alphaFace: R.rimAlphaAt(-35, -35), wFace: R.rimWidthAt(-35, -35), wFar: R.rimWidthAt(145, -35) };
out.rimStops = R.rimStops(0, '#FFFFFF');
out.rimMarkup = mk(h(R.KeyRim, { w: 400, h: 120, r: 60, light: 0, spill: true } as any));
out.rowsOpen = B.barrelRows(5, 1, 160);
out.rowsClosed = B.barrelRows(5, 0, 160);
out.rowsMid = B.barrelRows(5, 0.25, 160);
out.open = [99, 100, 113, 126, 200].map((f) => B.barrelOpen(f, { at: 100 }, film60));
out.plane = mk(h(Cu.Cursor, { x: 100, y: 100, shape: 'plane', scale: 2.5 } as any));
out.tri = mk(h(Cu.Cursor, { x: 100, y: 100, shape: 'glassTri', scale: 2.5 } as any));
out.accent = C.accent;
console.log(JSON.stringify(out));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-details-'));
try {
  const probe = join(TMP, 'probe.tsx');
  writeFileSync(probe, PROBE);
  const r = spawnSync(process.execPath, [TSX, probe], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
    process.exit(1);
  }
  const P = JSON.parse(r.stdout.trim().split('\n').pop());
  const near = (a, b, e = 1e-3) => Math.abs(a - b) <= e;

  // 1. depth of field by distance
  const [d0, d100, d230, d400, d540, d850, d1200] = P.dof;
  result(d0 === 0 && d100 === 0 && d230 === 0, 'dofSigma: sharp within 230 px of the focus', P.dof.join(', '));
  result(near(d850, 7.5) && near(d1200, 7.5) && near(P.dofNeg, 7.5), 'dofSigma: 7.5 px at 850 px and beyond (either side)', `${d850} ${d1200}`);
  result(d230 < d400 && d400 < d540 && d540 < d850 && near(d540, 3.75, 0.01), 'dofSigma: rises monotone on a smoothstep (half at the middle of the range)', `${d400} ${d540}`);

  // 2. the tilted wash
  const lum = (c) => (c.startsWith('#') ? parseInt(c.slice(1, 3), 16) : Number(c.match(/\d+/)[0])) / 255;
  const T = P.tilted;
  const share = T.map((s) => 1 - lum(s.color));
  result(T.length === 5 && T.map((s) => s.at).join(',') === '0,0.34,0.52,0.84,1', 'tilted wash: knots at 0, 34, 52, 84 and 100 % of the run', T.map((s) => s.at).join(','));
  result(near(share[0], 0, 0.01) && near(share[1], 0.04, 0.02) && near(share[2], 0.24, 0.02) && near(share[3], 0.81, 0.02) && near(share[4], 1, 0.01), 'tilted wash: 4 / 24 / 81 % of the tint at those knots, paper before, the tint at the edge', share.map((v) => v.toFixed(3)).join(' '));
  result(P.tiltedField.mode === 'linear' && P.tiltedField.angle === 82, 'tilted wash: a linear field 8 degrees off vertical (angle 82)', `${P.tiltedField.mode} ${P.tiltedField.angle}`);
  const lastStop = P.tiltedDefault.stops[P.tiltedDefault.stops.length - 1];
  result((lastStop.color ?? lastStop).toLowerCase() === P.tiltTint.toLowerCase(), "tilted wash: the default tint is the accent a fifth of the way to paper", `${JSON.stringify(lastStop)} vs ${P.tiltTint}`);

  const G = P.grounds;
  result(G.kinds.includes('tint') && G.tintKinds.join() === 'tint' && !G.clean.includes('tint') && G.gain === 0 && G.shapes === 0, "Grounds 'tint': a kind with no plates, outside the clean kinds", JSON.stringify(G));
  result(!G.dealt.includes('tint'), "dealGrounds never deals the tint unless a film asks for it by name (one colour ground, never the whole film)", G.dealt.join(','));
  result(/<canvas/.test(P.tintGround) && /background:#F5F6F7/i.test(P.tintGround), "LitGround 'tint': the base under a tilted wash field", P.tintGround.slice(0, 160));

  // 3. widen, tilt
  const w = P.widen60.map((s) => s.width);
  result(near(w[0], 0.01, 0.002) && near(w[1], 0.1, 0.01) && near(w[2], 0.31, 0.01) && near(w[3], 0.93, 0.01) && near(w[4], 1, 1e-6) && near(w[5], 1, 1e-6), 'widenState: 1 % -> 10 % -> 31 % -> 93 % -> 100 % over 40 f at 60 fps', w.map((v) => v.toFixed(3)).join(' '));
  result(near(P.widen30.width, 0.31, 0.01), 'widenState: the same reveal over 20 f at 30 fps', String(P.widen30.width));
  result(P.widen60.every((s) => near(s.inset * 2 + s.width, 1, 1e-9)) && P.widenBefore.width === 0 && P.widenBefore.content === 0, 'widenState: opened about the centre (equal insets), nothing before its cue');
  result(P.widen60[2].content === 0 && P.widen60[3].content > 0 && P.widen60[3].content < 1 && near(P.widen60[4].content, 1, 1e-6), 'widenState: the content fades in only over the last third', P.widen60.map((s) => s.content.toFixed(2)).join(' '));
  const L = P.lean;
  const top = 1; const z = 400 * Math.sin((L.rx * Math.PI) / 180); const bottom = L.perspective / (L.perspective - z);
  result(L.rx === 27 && L.origin.y === 0 && L.perspective === 1000 && top / bottom > 0.7 && top / bottom < 0.85, 'CARD_TILT.leanBack: 27 deg back about the top edge, perspective 1000, the top edge 70-85 % of the bottom (a 400 px card)', (top / bottom).toFixed(3));
  result(/perspective\(1000\.0px\) rotateX\(27\.000deg\)/.test(P.leanCss), 'cardTiltCss: perspective first, then the lean', P.leanCss);
  result(/clip-path:inset\(0 4[0-9.]+% 0 4[0-9.]+% round/.test(P.cardMid) && /opacity:0[;"]/.test(P.cardMid.replace(/opacity:0\.\d+/g, '')), 'Card reveal: a centre inset mid-reveal, the content hidden until the last third', P.cardMid.slice(0, 160));
  result(!/clip-path/.test(P.cardDone) && /rotateX\(27\.000deg\)/.test(P.cardDone) && /transform-origin:50\.00% 0\.00%/.test(P.cardDone), 'Card: no clip once open; the tilt leans it about its top edge');

  // 4. DrawPath
  result(P.draw[0] === 0 && P.draw[1] === 0 && P.draw[2] > 0 && P.draw[2] < 1 && near(P.draw[3], 1) && P.draw[4] === 1 && P.drawRev === 0, 'drawPathState: 0 before its cue, drawn over 36 f, undrawn with reverse', P.draw.join(' '));
  result(P.dashStart.dasharray === '1 1' && near(P.dashStart.offset, 0.75) && near(P.dashEnd.offset, -0.75) && P.dashCentre.dasharray.startsWith('0 0.25000 0.50000'), 'revealDash: from the start, the end and both ends from the centre', `${JSON.stringify(P.dashStart)} ${JSON.stringify(P.dashCentre)}`);
  result(/^M0\.00 0\.00 L170\.00 0\.00 Q200\.00 0\.00 200\.00 30\.00 L200\.00 120\.00$/.test(P.elbow), 'elbowPath: across, one rounded corner, down', P.elbow);
  result(/Q0\.00 120\.00 120\.00 120\.00/.test(P.elbowY), 'elbowPath: down first, the radius clamped to the shorter leg', P.elbowY);
  result(/^M0\.00 0\.00 C.* 100\.00 50\.00 C.* 200\.00 0\.00$/.test(P.curve), 'curvePath: a cubic through every point', P.curve);
  result(near(P.half[0], 100) && near(P.half[1], 0), 'pointAtShare: half way along by arc length', JSON.stringify(P.half));
  result(/<mask/.test(P.dashed) && /stroke-dasharray="12\.00 10\.00"/.test(P.dashed) && /mask="url\(#/.test(P.dashed), 'DrawPath dashed: the dash pattern shown through a revealing mask (it never slides)');
  result(!/<mask/.test(P.solid) && /pathLength="1"/.test(P.solid) && /<circle/.test(P.solid), 'DrawPath solid: a pathLength dash, a head dot riding the drawn end');

  // 5. KeyRim
  const Rm = P.rim;
  result(near(Rm.face, 1) && near(Rm.far, 0) && near(Rm.alphaFace, 0.9) && near(Rm.alphaFar, 0.12), 'rimLight: lit 1 facing the key, 0 on the far side; alpha 0.9 to 0.12', JSON.stringify(Rm));
  result(near(Rm.wFace, 1) && near(Rm.wFar, 0.35), 'rimWidthAt: full toward the key, 35 % on the far side');
  const alphas = [...P.rimStops.matchAll(/rgba\(255, 255, 255, ([\d.]+)\) ([\d.]+)deg/g)].map((m) => [Number(m[2]), Number(m[1])]);
  const best = alphas.reduce((a, b) => (b[1] > a[1] ? b : a));
  result(alphas.length === 25 && near(best[0], 90) && near(best[1], 0.9), 'rimStops: 25 conic stops, brightest at 90 deg (a key from the right)', `${alphas.length} stops, peak ${best}`);
  if (verbose) console.log(P.rimMarkup);
  result(/conic-gradient/.test(P.rimMarkup) && /content-box/.test(P.rimMarkup) && /box-shadow:6\.00px 0\.00px 18\.00px/.test(P.rimMarkup), 'KeyRim: a conic border through a ring mask, the spill offset toward the key', P.rimMarkup.slice(0, 120));

  // 6. Barrel
  const O = P.rowsOpen;
  const gaps = O.slice(1).map((r, i) => r.y - O[i].y);
  result(O.length === 5 && near(O[2].y, 0) && O[2].middle && near(O[0].y, -O[4].y), 'barrelRows: five rows centred on the middle row, symmetric', O.map((r) => r.y.toFixed(1)).join(' '));
  const tiles = (rows) => rows.filter((r) => r.band > 0).every((r, i, a) => i === 0 || r.top >= a[i - 1].bottom - 1e-6);
  result(tiles(O) && tiles(P.rowsMid), 'barrelRows: bands tile the drum, never overlapping the next row (open and mid-close)', `${O.map((r) => `${r.top.toFixed(1)}..${r.bottom.toFixed(1)}`).join(' ')} / ${P.rowsMid.map((r) => `${r.top.toFixed(1)}..${r.bottom.toFixed(1)}`).join(' ')}`);
  result(O[0].scale < O[1].scale && O[1].scale < O[2].scale && O[0].ink < O[1].ink && O[1].ink < 1, 'barrelRows: rows squash and sit back in ink toward the drum\'s edges', O.map((r) => `${r.scale.toFixed(2)}/${r.ink.toFixed(2)}`).join(' '));
  result(near(O[2].side, 0.43) && O[0].side > 0.15 && O[0].side < 0.2 && O[1].side > O[0].side, 'barrelRows: side fragments show 43 % of the word on the middle row, about 17 % on the outer rows', O.map((r) => r.side.toFixed(3)).join(' '));
  const Cl = P.rowsClosed;
  result(near(Cl[2].band, 216) && Cl.filter((r) => !r.middle).every((r) => r.ink === 0) && Cl.every((r) => r.side === 0), 'barrelRows: closed, only the middle row, its band the whole line with room for descenders (1.35 x), no fragments', Cl.map((r) => `${r.band}/${r.ink}`).join(' '));
  result(P.open[0] === 1 && P.open[1] === 1 && P.open[2] < 1 && P.open[2] > 0 && near(P.open[3], 0, 1e-6) && P.open[4] === 0, 'barrelOpen: open until its cue, closed 26 f later', P.open.join(' '));

  // 7. cursor shapes
  const acc = P.accent.toLowerCase();
  result(/<linearGradient/.test(P.plane) && P.plane.toLowerCase().includes(`stop-color="${acc}"`) && /blur\(4\.5px\)/.test(P.plane), 'Cursor plane: a rim ramp through the accent under the body, a cast shadow', P.plane.slice(0, 160));
  result(/fill-opacity="0\.55"/.test(P.tri) && /stroke-width="3\.6"/.test(P.tri), 'Cursor glassTri: an ink fill at .55 and a thick white outline');
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `details tests: ${failed} failed` : 'details tests: all pass');
process.exit(failed ? 1 : 0);
