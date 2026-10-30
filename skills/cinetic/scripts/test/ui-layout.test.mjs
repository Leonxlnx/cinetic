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
 *   3. The CLI on a report: exit 1 on a ui-align failure, 0 when clean, 2 without a readable report; --help.
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
const { uiLayout, alignFrame, assetFrame } = createRequire(import.meta.url)(CJS);

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

// 3. the CLI
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
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed ? `ui-layout tests: ${failed} failed` : 'ui-layout tests: all pass');
process.exit(failed ? 1 : 0);
