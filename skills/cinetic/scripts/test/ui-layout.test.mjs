#!/usr/bin/env node
/**
 * ui-layout.test.mjs: the UI layout reads on the layout audit's boxes (scripts/ui-layout.cjs).
 *
 *   1. ui-align: two rows stacked in one card whose left edges miss by 6 px fail on 2 audited frames and warn on one;
 *      rows within 2 px, rows centred on each other, rows set flush right together, an indent of 20 px, a headline over
 *      a card's row, two rows on and off a photo and a row in flight are clean; a 4K frame is read at 1080.
 *   2. text-on-asset: a line crossing a picture's edge or a mark is listed (a warning: look-audit.py --layout confirms
 *      it on the pixels); a caption wholly on a photo, an inline mark, a word knocked out of a photo and boxes that only
 *      touch are not; the camera float is put back on the text before it is compared.
 *   3. text over an icon (the audit's `icons`): a line running over an icon in view warns in dev and fails under the ship
 *      gate (opts.ship, CINETIC_GATE=ship) on 2 audited frames, warns on one; the kit's own pairs never trip it: an icon
 *      beside its label (apart, or touching by a quarter of the icon), an icon above its label, an icon inside its own
 *      tagged text (an inline glyph, a button's icon), a line whose words the audit found not drawn over the icon (`over`:
 *      the glyph in the gap the line leaves, a card behind the icon's card); nor an icon under a card (visible < 0.5,
 *      covered) or a faint one.
 *   3b. text-edge: product text cut by the frame inside a declared bleed (a closer frame) or 30 px from its edge fails on
 *      2 audited frames and warns on one; text clear of the edge, a statement pushed through, a declared crop
 *      (data-audit-crop), a scrolling feed, text in flight and faint text pass; a box the camera float carries past the
 *      edge fails where it shows; a box laid out in the margin is the audit's own safe-area finding; 9:16 keeps 4 % too.
 *   4. The CLI on a report: exit 1 on a ui-align failure, 0 when clean, 2 without a readable report; --help; --ship (and
 *      CINETIC_GATE=ship) fails a text over an icon that dev only warns about.
 *
 * Usage (from the skill root):  node scripts/test/ui-layout.test.mjs
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CJS = resolve(HERE, '..', 'ui-layout.cjs');
const { uiLayout, alignFrame, assetFrame, edgeFrame } = createRequire(import.meta.url)(CJS);

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const row = (id, x, y, o = {}) => ({ id, text: id, x, y, w: 300, h: 40, px: 32, opacity: 1, ui: true, ...o });
const frame = (f, boxes, o = {}) => ({ frame: f, width: 1920, height: 1080, boxes, logos: [], imagery: [], ...o });

// 1. ui-align
const card = (dx) => [row('title', 600, 300, { px: 40, h: 48 }), row('when', 600 + dx, 356)];
let r = uiLayout([frame(10, card(6)), frame(20, card(6))]);
result(r.issues.length === 1 && r.issues[0].kind === 'ui-align' && r.issues[0].d === 6, 'two stacked rows 6 px apart on 2 audited frames fail ui-align', JSON.stringify(r.issues.map((x) => [x.id, x.d])));
r = uiLayout([frame(10, card(6))]);
result(!r.issues.length && r.warnings.length === 1, 'on one audited frame it warns (a frame caught mid-move)');
result(!alignFrame(frame(1, card(1.5))).length, 'rows within 2 px share their edge');
result(!alignFrame(frame(1, [row('a', 600, 300), row('b', 606, 350, { w: 288 })])).length, 'rows centred on each other are centred on purpose');
result(!alignFrame(frame(1, [row('a', 600, 300), row('b', 594, 350, { w: 306 })])).length, 'rows set flush right together are fine');
result(!alignFrame(frame(1, card(20))).length, 'an indent of 20 px (an icon-led row, a second level) is not a near miss');
result(!alignFrame(frame(1, [row('head', 600, 200, { ui: false, px: 96, h: 110 }), row('row', 606, 320)])).length, 'a headline over a card\'s row is not one stack');
result(!alignFrame(frame(1, card(6), { imagery: [{ x: 590, y: 340, w: 400, h: 200 }] })).length, 'a row on a photo and a row off it are two places');
result(!alignFrame(frame(1, [row('title', 600, 300), row('when', 606, 350, { speed: 9 })])).length, 'a row in flight (layout-audit --speed) is not read');
result(!alignFrame(frame(1, [row('a', 600, 300), row('b', 606, 520)])).length, 'rows far apart are not one stack');
// a card tilted 1.3 deg (camera roll or a 3D turn): its rows' left edges drift 2.2 px a row down one slanted line
const tilted = [0, 1, 2, 3].map((i) => row(`r${i}`, 600 + i * 2.2, 300 + i * 96, { h: 48 }));
result(!uiLayout([frame(10, tilted), frame(20, tilted)]).issues.length, 'a tilted card: rows whose left edges lie on one slanted line are one column, not a near miss');
const odd = [row('r0', 600, 300, { h: 48 }), row('r1', 600, 396, { h: 48 }), row('r2', 606, 492, { h: 48 })];
r = uiLayout([frame(10, odd), frame(20, odd)]);
result(r.issues.length === 1 && r.issues[0].id === 'r1+r2', 'two rows on one edge and a third 6 px off still fail (the odd row out)', JSON.stringify(r.issues.map((x) => x.id)));
const step = [0, 1, 2].map((i) => row(`s${i}`, 600 + i * 12, 300 + i * 56));
result(uiLayout([frame(10, step), frame(20, step)]).issues.length === 2, 'a staircase steeper than 5 deg is not a tilt: each step fails');
const flying = (f, dx) => frame(f, [row('title', 600 + dx, 300 + dx, { px: 40, h: 48 }), row('when', 606 + dx * 0.9, 356 + dx)]);
r = uiLayout([flying(100, 0), flying(106, 30), flying(112, 60)]);
result(!r.issues.length && !r.warnings.length, 'a card flying in (5 px/f between audited frames, no --speed) is not a resting near miss', JSON.stringify([...r.issues, ...r.warnings].map((x) => [x.id, x.frames])));
const k4 = (b) => ({ ...b, x: b.x * 2, y: b.y * 2, w: b.w * 2, h: b.h * 2, px: b.px * 2 });
r = alignFrame({ frame: 1, width: 3840, height: 2160, boxes: [k4(row('a', 600, 300)), k4(row('b', 603, 350))] });
result(r.length === 1 && r[0].d === 3, 'a 4K frame is read at 1080 (6 px at 2160 = 3 px)', JSON.stringify(r.map((x) => x.d)));

// 2. text-on-asset
const pic = { x: 900, y: 300, w: 400, h: 300 };
r = uiLayout([frame(10, [row('line', 760, 400, { ui: false, w: 300, h: 60, px: 50 })], { imagery: [pic] }), frame(20, [row('line', 760, 400, { ui: false, w: 300, h: 60, px: 50 })], { imagery: [pic] })]);
result(!r.issues.length && r.warnings.length === 1 && r.warnings[0].kind === 'text-on-asset', 'a line crossing a picture\'s edge is listed as a warning (the pixels confirm it)', JSON.stringify(r.warnings.map((x) => x.id)));
result(assetFrame(frame(1, [row('label', 1080, 380, { w: 260 })], { logos: [{ name: 'Slack', x: 1000, y: 360, w: 90, h: 90 }] })).length === 1, 'a label running into a mark is listed');
result(!assetFrame(frame(1, [row('cap', 940, 540, { w: 200 })], { imagery: [pic] })).length, 'a caption wholly on a photo is by design');
result(!assetFrame(frame(1, [row('sentence', 400, 500, { w: 900, h: 80, px: 64 })], { logos: [{ name: 'Zoom', x: 700, y: 505, w: 70, h: 70 }] })).length, 'an inline mark set in the line is by design');
result(!assetFrame(frame(1, [row('photos', 124, 896, { w: 1168, h: 90, px: 90 })], { imagery: [{ x: 960, y: 877, w: 334, h: 128 }] })).length, 'a word knocked out of a photo (the photo 80 % in the line) is by design');
result(!assetFrame(frame(1, [row('near', 598, 400)], { imagery: [pic] })).length, 'boxes that only touch are apart');
result(assetFrame(frame(1, [row('floated', 560, 400, { float: [60, 0, 1] })], { imagery: [pic] })).length === 1, 'the camera float is put back on the text (a box that crosses only where it shows)');

// 3. text over an icon
const icon = (o = {}) => ({ name: 'bell', x: 700, y: 300, w: 48, h: 48, opacity: 1, visible: 1, ...o });
const headline = row('headline', 400, 280, { ui: false, w: 800, h: 90, px: 80 });
const over = (f, ic = icon()) => frame(f, [headline], { icons: [ic] });
r = uiLayout([over(10), over(20)], { ship: false });
result(!r.issues.length && r.warnings.length === 1 && /icon/.test(r.warnings[0].detail) && r.warnings[0].asset === 'icon', 'a line running over an icon in view warns in dev', JSON.stringify(r.warnings.map((x) => [x.id, x.cross])));
r = uiLayout([over(10), over(20)], { ship: true });
result(r.issues.length === 1 && r.issues[0].kind === 'text-on-asset' && r.issues[0].id === 'headline+icon:bell', 'and fails under the ship gate on 2 audited frames', JSON.stringify(r.issues.map((x) => x.id)));
r = uiLayout([over(10)], { ship: true });
result(!r.issues.length && r.warnings.length === 1, 'on one audited frame it warns even under the ship gate (mid-move)');
const prevGate = process.env.CINETIC_GATE;
process.env.CINETIC_GATE = 'ship';
r = uiLayout([over(10), over(20)]);
if (prevGate === undefined) delete process.env.CINETIC_GATE; else process.env.CINETIC_GATE = prevGate;
result(r.issues.length === 1, 'CINETIC_GATE=ship is the ship gate (as precheck --ship and the kit gate read it)');
result(!uiLayout([over(10, icon({ visible: 0.2 })), over(20, icon({ visible: 0.2 }))], { ship: true }).issues.length, 'an icon mostly under a card (visible 0.2) is not text over an icon');
result(!uiLayout([over(10, icon({ visible: 0, covered: true })), over(20, icon({ visible: 0, covered: true }))], { ship: true }).issues.length, 'nor a covered one');
result(!uiLayout([over(10, icon({ opacity: 0.3 })), over(20, icon({ opacity: 0.3 }))], { ship: true }).issues.length, 'nor a faint one (opacity 0.3)');
// the kit's own pairs: a chip (a 25 px glyph, its ink 22 px, a 10.6 px gap, the label), a row's tile and title, a tile over its name
const chip = (f, dx = 0) => frame(f, [row('kit-chip', 632 + dx, 291, { w: 140, h: 38, px: 19 })], { icons: [icon({ name: 'sparkle', x: 600, y: 299, w: 22, h: 22 })] });
r = uiLayout([chip(10), chip(20)], { ship: true });
result(!r.issues.length && !r.warnings.length, 'a glyph beside its label (a chip) is a pair, never a crossing', JSON.stringify(r.warnings.map((x) => x.cross)));
r = uiLayout([chip(10, -15), chip(20, -15)], { ship: true });
result(!r.issues.length && !r.warnings.length, 'a label box that touches its glyph by a quarter of it (5 px of 22) still sits beside it', JSON.stringify(r.warnings.map((x) => x.cross)));
r = uiLayout([chip(10, -24), chip(20, -24)], { ship: true });
result(r.issues.length === 1, 'a label run halfway over its glyph is text over an icon', JSON.stringify(r.issues.map((x) => x.cross)));
const tile = (f) => frame(f, [row('app-name', 588, 384, { w: 104, h: 30, px: 22 })], { icons: [icon({ name: 'calendar', x: 600, y: 300, w: 80, h: 80 })] });
result(!uiLayout([tile(10), tile(20)], { ship: true }).warnings.length, 'a tile over its name (their boxes touching by 4 px) is a pair');
const btn = (f) => frame(f, [row('kit-button', 600, 300, { w: 240, h: 64, px: 26 })], { icons: [icon({ name: 'send', x: 620, y: 312, w: 40, h: 40, inText: 'kit-button' })] });
result(!uiLayout([btn(10), btn(20)], { ship: true }).warnings.length, "an icon inside its own tagged text (a button's icon, an inline glyph) is part of the line");
result(!uiLayout([frame(10, [row('row', 600, 300, { w: 400, h: 40 })], { icons: [icon({ x: 700, y: 360, w: 40, h: 40 })] })], { ship: true }).warnings.length, 'an icon apart from the text is nothing');
// the audit's `over` (the texts whose words it found drawn above the icon) decides where it is logged
r = uiLayout([over(10, icon({ over: ['headline'] })), over(20, icon({ over: ['headline'] }))], { ship: true });
result(r.issues.length === 1, "a text the audit found drawn over the icon fails as before");
r = uiLayout([over(10, icon({ over: [] })), over(20, icon({ over: [] }))], { ship: true });
result(!r.issues.length && !r.warnings.length, 'a line whose box spans an icon set in its gap, or a card behind the icon (over: []), is no crossing');

// 3b. text-edge: the safe area where the camera crops
{
  // a closer frame (a declared bleed) slices a card's label at the right edge; its value sits 30 px inside the edge
  const cut = (f) => frame(f, [row('pr', 1700, 420, { push: 'bleed', crosses: true, w: 260 }), row('live', 1590, 480, { push: 'bleed', w: 300 })]);
  r = uiLayout([cut(330), cut(340)]);
  const ids = r.issues.filter((x) => x.kind === 'text-edge').map((x) => x.id).sort();
  result(JSON.stringify(ids) === '["live","pr"]' && /cut by the frame's right edge/.test(r.issues.find((x) => x.id === 'pr')?.detail ?? '') && /30 px from the frame's right edge/.test(r.issues.find((x) => x.id === 'live')?.detail ?? ''),
    'text-edge: product text cut by the frame in a closer frame, and text 30 px from its edge, fail on 2 audited frames', JSON.stringify(r.issues.map((x) => [x.id, x.gap])));
  r = uiLayout([cut(330)]);
  result(!r.issues.some((x) => x.kind === 'text-edge') && r.warnings.filter((x) => x.kind === 'text-edge').length === 2, 'text-edge: on one audited frame it warns (mid-move)');
  const fine = (f) => frame(f, [
    row('inside', 1400, 420, { push: 'bleed', w: 300 }), // 220 px clear of the edge in the crop
    row('stmt', 1700, 420, { push: 'bleed', crosses: true, ui: false, px: 140, h: 150 }), // a statement pushed through: the push's
    row('wall', 1800, 600, { crop: true, crosses: true }), // a declared crop
    row('feed', 1700, 1000, { scroll: true, crosses: true }), // a list scrolling through
    row('flying', 1800, 300, { push: 'bleed', crosses: true, speed: 14 }), // in flight
    row('faint', 1800, 700, { push: 'bleed', crosses: true, opacity: 0.3 }),
  ]);
  r = uiLayout([fine(330), fine(340)]);
  result(!r.issues.some((x) => x.kind === 'text-edge') && !r.warnings.some((x) => x.kind === 'text-edge'),
    'text-edge: text clear of the edge, a statement pushed through, a declared crop, a scrolling feed, text in flight and faint text pass', JSON.stringify(r.issues.concat(r.warnings).filter((x) => x.kind === 'text-edge').map((x) => x.id)));
  // the camera float carries a box laid out inside the frame to its edge (x1.3 about the centre): on screen it is cut
  const floated = (f) => frame(f, [row('card', 1500, 500, { float: [0, 0, 1.3] }), row('mid', 800, 500, { float: [0, 0, 1.3] })]);
  r = uiLayout([floated(10), floated(20)]);
  result(r.issues.filter((x) => x.kind === 'text-edge').map((x) => x.id).join() === 'card', 'text-edge: a box the camera float carries past the edge fails where it shows; one it keeps inside passes', JSON.stringify(r.issues.map((x) => x.id)));
  // the layout itself past the margin is the audit's safe-area finding, not counted twice here
  result(!edgeFrame(frame(1, [row('margin', 20, 500)])).length, 'text-edge: a box laid out in the margin is left to the audit\'s safe-area (no double count)');
  // 9:16: the margin is 4 % of that frame
  result(edgeFrame(frame(1, [row('v', 1080 - 300 - 30, 900, { push: 'bleed' })], { width: 1080, height: 1920 })).length === 1, 'text-edge: in 9:16 the margin is 4 % of that frame (43 px at the sides)');
}

// 4. the CLI
const tmp = mkdtempSync(join(tmpdir(), 'cinetic-ui-layout-'));
try {
  const write = (name, frames) => { const p = join(tmp, name); writeFileSync(p, JSON.stringify({ tool: 'layout-audit', boxes: frames })); return p; };
  const run = (...a) => spawnSync(process.execPath, [CJS, ...a], { encoding: 'utf8' });
  let c = run(write('bad.json', [frame(10, card(6)), frame(20, card(6))]));
  result(c.status === 1 && /ui-align/.test(c.stdout), 'the CLI fails a report with a resting near miss (exit 1)', c.stdout.trim().split('\n').pop());
  c = run(write('ok.json', [frame(10, card(0)), frame(20, card(0))]), '--json', join(tmp, 'out.json'));
  result(c.status === 0, 'and passes a clean one (exit 0)', c.stdout.trim().split('\n').pop());
  c = run(join(tmp, 'missing.json'));
  result(c.status === 2, 'no readable report: exit 2');
  c = run('--help');
  result(c.status === 0 && /ui-align/.test(c.stdout), '--help prints the doc');
  const iconRep = write('icon.json', [over(10), over(20)]);
  c = spawnSync(process.execPath, [CJS, iconRep], { encoding: 'utf8', env: { ...process.env, CINETIC_GATE: '' } });
  result(c.status === 0 && /warn text-on-asset/.test(c.stdout), 'a text over an icon: dev warns (exit 0)', c.stdout.trim().split('\n').pop());
  c = run(iconRep, '--ship');
  result(c.status === 1 && /ship gate/.test(c.stdout), '--ship fails it (exit 1)', c.stdout.trim().split('\n').pop());
  c = spawnSync(process.execPath, [CJS, iconRep], { encoding: 'utf8', env: { ...process.env, CINETIC_GATE: 'ship' } });
  result(c.status === 1, 'and so does CINETIC_GATE=ship', c.stdout.trim().split('\n').pop());
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed ? `ui-layout tests: ${failed} failed` : 'ui-layout tests: all pass');
process.exit(failed ? 1 : 0);
