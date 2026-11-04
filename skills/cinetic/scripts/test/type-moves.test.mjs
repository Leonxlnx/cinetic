#!/usr/bin/env node
/**
 * type-moves.test.mjs: the type moves of the Remotion starter beyond the line presets.
 *
 *   1. Type push (src/fx/TypePush.tsx): from rest (an identity shot on its first frame) to 2.2x on E.cam over 52 f at
 *      60 fps (26 at 30), in log space; the first reading point holds still on the first frame, the last lands on its
 *      target; the layout audit reads it as moving in flight and as a declared bleed once landed; it settles (speed
 *      under 10 % of its peak) before its last frame; a creep keeps the hold alive.
 *   2. Claim on accent (src/fx/TypeClaim.tsx): a cap height of 16.5 % of the frame height (16 % at the least), each
 *      line centred (flush left at 3 % when asked), tracking -0.04 em, weight 600-700, broken into lines that fit, the size coming down to fit a long
 *      claim but never under 16 %; paper or ink on the accent by contrast.
 *   3. Objects inside a line (src/kit/inline.tsx): a slot rolls to the next object every 30 f in 6 f, re-flowing its
 *      width with `each` or holding the widest with `max`; a chip keeps its label at TEXT_MIN; an object line stands its
 *      slot in as one word and fits its width to what the layout audit allows its size.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first; CINETIC_TSX may name
 * another tsx cli.mjs).
 * Usage (from the skill root):  node scripts/test/type-moves.test.mjs [--verbose]
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
const TSX = process.env.CINETIC_TSX || join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/type-moves.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as P from '${url('fx/TypePush.tsx')}';
import * as K from '${url('fx/TypeClaim.tsx')}';
import * as I from '${url('kit/inline.tsx')}';
import { monoMetrics } from '${url('fx/TypePresets.tsx')}';
const film = (fps: number) => ({ fps, width: 1920, height: 1080 });
const read = [{ x: 700, y: 540 }, { x: 1200, y: 540 }];
const push = { at: 100, read };
const s = (f: number, fps = 60, sp: any = push) => P.typePushState(f, sp, film(fps));
const fr60 = P.typePushFrames(push, film(60));
const fr30 = P.typePushFrames({ ...push, at: 50 }, film(30));
const lnk = Array.from({ length: 60 }, (_, k) => Math.log(s(100 + k).k));
const steps = lnk.slice(1).map((v, i) => v - lnk[i]);
const m = monoMetrics('Notes in thirty seconds', 100);
const claim = K.claimLayout({ text: 'Notes in thirty seconds.' }, film(60));
const claimLeft = K.claimLayout({ text: 'Notes in thirty seconds.', justify: 'left' }, film(60));
// 0.52 em a character: two 7-letter words miss the line at 16.5 % (Inter's display cap, 0.727 em) and fit it at 16 %
const half = (t: string, size: number, _w: number, tr: number) => [...t].length * size * (0.52 + tr);
const long = K.claimLayout({ text: 'aaaaaaa bbbbbbb ccccccc ddddddd eeeeeee fffffff', justify: 'left' }, film(60), half);
const longC = K.claimLayout({ text: 'aaaaaaa bbbbbbb ccccccc ddddddd eeeeeee fffffff' }, film(60), half);
const heavy = K.claimLayout({ text: 'Ship it', weight: 900 }, film(60));
const W = [100, 300, 200];
const slot = (f: number, fit: any) => I.inlineSlotState(f, W, { start: 0, fps: 60, fit });
const ol = I.objectLineSpec({ text: 'Notes from [] in thirty seconds', at: 10 }, film(60));
const ol2 = I.objectLineSpec({ text: 'Works with your tools', at: 10 }, film(60));
console.log(JSON.stringify({
  push: {
    rest: s(100), first: s(101), land: s(152), after: s(212), fr60, fr30,
    mid30: s(63, 30, { ...push, at: 50 }).k, mid60: s(152 - 26, 60).k,
    monotone: steps.every((v) => v >= -1e-12), peakAt: steps.indexOf(Math.max(...steps)),
    word: P.wordPoint('Notes in thirty seconds', m, 960, 540, 2), last: P.wordPoint('Notes in thirty seconds', m, 960, 540),
    noBleed: s(160, 60, { ...push, bleed: false }).audit ?? null,
  },
  claim, claimLeft, long, longC, heavy, capEm: K.CLAIM.capEm, ink: [K.inkOn('#08965A'), K.inkOn('#1F3FBF'), K.inkOn('#E8D24A')],
  creep: Array.from({ length: 601 }, (_, f) => K.claimCreep(f, 0, 4, film(60))),
  claimDecl: [K.declares({ at: 300, hold: 240 }), K.declares({ at: 300, hold: 240, flood: false })],
  slot: { f0: slot(0, 'each'), f48: slot(48, 'each'), f56: slot(56, 'each'), f64: slot(64, 'each'), max56: slot(56, 'max'), f120: slot(120, 'each'), roll30: Array.from({ length: 9 }, (_, i) => slot(48 + 2 * i, 'each').q) },
  chip: { small: I.chipSize(60), big: I.chipSize(160) },
  ol: { slot: ol.slot, text: ol.spec.text, tokens: ol.tokens, slot2: ol2.slot, text2: ol2.spec.text },
  fit: { line: I.fitLine(160, 2400, 1920, 1080), calm: I.fitLine(84, 1500, 1920, 1080), fits: I.fitLine(84, 900, 1920, 1080), given: I.fitLine(160, 2400, 1920, 1080, 0.5) },
  share: [I.lineShare(5.6), I.lineShare(8), I.lineShare(10.7), I.lineShare(16)],
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-typemoves-'));
const probeFile = join(TMP, 'probe.tsx');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const D = JSON.parse(r.stdout.trim().split('\n').pop());
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1. type push
const p = D.push;
const id = p.rest.shot;
result(p.rest.phase === 'rest' && near(p.rest.k, 1) && near(id.ax, id.sx) && near(id.ay, id.sy) && near(id.ax, 700) && !p.rest.audit, 'push: its first frame is the line at rest (an identity shot on the first reading point)', JSON.stringify(id));
result(near(p.fr60.frames, 52) && near(p.fr30.frames, 26) && near(p.land.k, 2.2, 1e-9) && near(p.land.shot.sx, 1200 + (960 - 1200) * 0.35, 1e-6) && near(p.land.shot.ax, 1200), 'push: 1.0 -> 2.2x over 52 f at 60 fps (26 at 30), the last reading point landing a third of the way to the centre', JSON.stringify({ k: p.land.k, sx: p.land.shot.sx }));
result(near(p.mid30, p.mid60, 1e-9) && p.monotone && p.peakAt > 3 && p.peakAt < 26, 'push: the same zoom at the same second at 30 and 60 fps, in log space, on E.cam (slow start, peak about a quarter in)', `peak step ${p.peakAt}`);
result(p.first.audit === 'moving' && p.land.audit === 'bleed' && p.noBleed === null && p.fr60.settled > p.fr60.peak && p.fr60.settled <= p.fr60.end, 'push: tagged moving in flight and a declared bleed once landed (bleed: false leaves it a resting state); settled before its last frame', JSON.stringify({ peak: p.fr60.peak, settled: p.fr60.settled, end: p.fr60.end }));
result(p.after.k > p.land.k && p.after.k < p.land.k * 1.03, 'push: a creep keeps the landed hold moving (2 % a second)', `${p.land.k} -> ${p.after.k}`);
result(near(p.word.x, 960 - 1288 / 2 + (504 + 504 + 336) / 2, 1e-6) && near(p.last.y, 540), 'wordPoint(): a word\'s centre in the layer from the measured line', JSON.stringify([p.word, p.last]));

// 2. claim on accent
const c = D.claim;
const capOf = (L) => (L.size * D.capEm) / 1080; // the face's cap in em, as TypeClaim measures it
result(near(capOf(c), 0.165, 1e-9) && c.track === -0.04 && c.weight === 600 && c.fits, 'claim: cap height 16.5 % of the frame height, -0.04 em, weight 600', JSON.stringify({ size: c.size }));
result(c.lines.length >= 2 && c.lines.length <= 3 && c.lines.every((l) => near(l.x + l.width / 2, 960, 1e-6) && l.x >= 58 && l.x + l.width <= 1920 - 58) && near(c.lines[1].top - c.lines[0].top, c.size * 0.98, 1e-6) && Math.abs((c.lines[0].top + c.lines[c.lines.length - 1].top + c.size) / 2 - 540) < 1e-6, 'claim: broken into lines that fit, each centred on the frame, lead 0.98, the block centred on the frame height', c.lines.map((l) => l.text).join(' / '));
const cl = D.claimLeft;
result(cl.left === 58 && cl.lines.every((l) => l.x === 58 && l.x + l.width <= 1920 - 96), "claim: justify 'left' sets it flush left at 3 % (58 px)", JSON.stringify(cl.lines.map((l) => l.x)));
result(D.long.cap >= 0.16 - 1e-9 && D.long.cap < 0.165 && D.long.lines.length === 3 && D.long.fits, 'claim: a long claim comes down toward 16 % to hold in three lines, never under', JSON.stringify({ cap: D.long.cap, lines: D.long.lines.length, fits: D.long.fits }));
result(D.longC.cap >= 0.16 - 1e-9 && D.longC.lines.every((l) => l.x >= 58 - 1e-6 && l.x + l.width <= 1920 - 58 + 1e-6), "claim: centred, a long claim keeps the claim's 3 % margin on both sides (it says when it no longer fits)", JSON.stringify({ cap: D.longC.cap, lines: D.longC.lines.length, fits: D.longC.fits }));
result(D.heavy.weight === 700, 'claim: the weight stays in 600-700', String(D.heavy.weight));
result(D.ink.join() === '#0D0E10,#F5F6F7,#0D0E10', 'claim: the type is paper or ink on the accent, whichever reads', D.ink.join());
{
  const cr = D.creep;
  const v = cr.slice(1).map((x, i) => x - cr[i]);
  const built = cr.findIndex((x) => x > 0) - 1; // the last of 4 words lands at 47 (3 gaps of 7 f, a 26 f entry)
  const after = v.slice(built + 1);
  const smooth = after.every((x, i) => i === 0 || x <= after[i - 1] + 1e-12 && x >= after[i - 1] * 0.99);
  result(built === 47 && cr[built] === 0 && Math.max(...cr) <= 0.03 && smooth && v[built + 3 * 60] > 0, 'claim: the hold creeps once the claim is built, eases toward 3 % and never stops dead', JSON.stringify({ built, end: +cr[600].toFixed(4), v1: +(v[built + 1] * 60).toFixed(4) }));
}
result(JSON.stringify(D.claimDecl[0].colour) === '[{"from":300,"to":540,"id":"claim"}]' && D.claimDecl[1].colour.length === 0, 'claim: declares() gives the accent flood as a colour event (none without the flood)', JSON.stringify(D.claimDecl.map((d) => d.colour)));

// 3. objects inside a line
const S = D.slot;
result(S.f0.i === 0 && S.f0.k === 1 && near(S.f0.width, 100) && S.f48.i === 1 && S.f48.prev === 0 && near(S.f64.width, 300) && S.f56.width > 100 && S.f56.width < 300 && near(S.max56.width, 300) && S.f120.i === 2 && S.f120.k === 1, 'InlineObject: a roll every 48 f in 16 f, the slot re-flowing (each) or holding the widest (max), the last object held', JSON.stringify({ f56: S.f56.width, q: S.f56.q }));
// the roll lands with a tail: from its peak speed to 20 % of it in 3.5 samples at 30 fps or more (forensics motion-decay)
const rollV = S.roll30.slice(1).map((q, i) => q - S.roll30[i]);
const rollPk = rollV.indexOf(Math.max(...rollV));
const rollTail = rollV.slice(rollPk).findIndex((v) => v < 0.2 * rollV[rollPk]);
result(rollTail >= 3.5 || rollTail < 0, 'InlineObject: the roll glides on E.glideOut and lands with a tail (motion-decay)', JSON.stringify(rollV.map((v) => +v.toFixed(3))));
result(near(D.chip.small.label, 36) && near(D.chip.small.h, 72) && near(D.chip.big.h, 160) && near(D.chip.big.label, 80), 'InlineObject: a chip is the cap height with its label at half, the label never under TEXT_MIN (the pill grows round it)', JSON.stringify(D.chip));
result(D.ol.slot === 2 && D.ol.text === 'Notes from mark in thirty seconds' && D.ol.slot2 === 4 && D.ol.text2 === 'Works with your tools mark', 'ObjectLine: "[]" stands in the sentence as one word (without it the object ends the line)', JSON.stringify(D.ol));
const capPct = (px) => (0.72 * px * 100) / 1080;
result(D.share.join() === '0.75,0.61,0.84,0.84' && D.fit.line * 2400 / 160 <= 0.61 * 1920 + 1e-6 && capPct(D.fit.line) < 9 && near(D.fit.fits, 84) && near(D.fit.given, 160 * 0.5 * 1920 / 2400), 'ObjectLine: fitted to what the layout audit allows its size (a line 61 %, a calm sentence 75 %, display and hero 84 %)', JSON.stringify(D.fit));
result(near(D.fit.calm * 1500 / 84, 0.75 * 1920, 1e-6), 'ObjectLine: a calm sentence fits 75 % of the width', String(D.fit.calm));

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
