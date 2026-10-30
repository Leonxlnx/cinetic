#!/usr/bin/env node
/**
 * ui-layout.cjs: product UI is simple and aligned. Two reads on the layout audit's boxes (scripts/layout-audit.sh runs
 * them on every audit and adds what they find to its report; run alone on a report it already wrote):
 *
 *   ui-align       text rows stacked in one card or panel share their left edge: two readable rows, one right under the
 *                  other (the gap under 1.2 line heights, their spans overlapping), whose left edges miss each other by
 *                  more than 2 px and at most 12 px at 1080 (a near miss: a deliberate indent, an icon-led row or a
 *                  second column sits further in) and that are not centred on each other or set flush right together.
 *   text-on-asset  text never cuts into a picture or a mark it does not sit on by design: a readable text box that crosses
 *                  the edge of an official mark ([data-logo]) or a real picture ([data-imagery]) by more than 2 px each
 *                  way, where it shows (the camera float put back on the text). A caption set inside a photo, a mark or
 *                  photo set inside a line (an inline mark, a word knocked out of a photo: 80 % of the asset within the
 *                  line's span, its middle on the line) and boxes that only touch are by design. The boxes cannot tell a mark
 *                  hidden behind a plate from one in view, so here it is a warning: look-audit.py --layout reads the
 *                  pixels beside each crossing and fails the ones in view (on 2 or more audited frames).
 *
 * Readable: effective opacity >= 0.5, not inside a type push in flight or an active smear, and (with layout-audit
 * --speed) moving at most 3 px/f. Each finding is grouped by its pair of ids: ui-align on 2 or more audited frames fails
 * (a resting state), on one it warns (a frame caught mid-move). Px are at 1080 (a 4K or 9:16 frame is scaled).
 *
 * Usage:
 *   node scripts/ui-layout.cjs out/qa/layout-Film.json [--json out/qa/ui-layout.json] [--quiet]
 *   (layout-audit.sh requires it: const { uiLayout } = require('./ui-layout.cjs'))
 * Exit codes: 0 no failure, 1 a failure, 2 bad arguments.
 */
'use strict';

const UI_LAYOUT = {
  align: { tol: 2, near: 12, gap: 1.2, size: 1.6 }, // px at 1080; gap in line heights; type sizes within this ratio (one card's rows)
  asset: { cross: 2 }, // px at 1080 each way
  read: { opacity: 0.5, speed: 3 }, // effective opacity; px/f at 1080 (layout-audit --max-read-speed)
  persist: 2, // audited frames on which a finding fails
};

const r1 = (v) => Math.round(v * 10) / 10;
const readable = (b) => b.opacity >= UI_LAYOUT.read.opacity && b.push !== 'moving' && !b.smear && !(b.speed > UI_LAYOUT.read.speed);
const inside = (a, b, tol) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const cross = (a, b) => [Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)];

/** Near-miss left edges among the stacked rows of one frame: [{ a, b, d }] (d in px at 1080). */
function alignFrame(d) {
  const k = 1080 / (d.height || 1080);
  const P = UI_LAYOUT.align;
  const rows = (d.boxes || []).filter(readable);
  const pics = d.imagery || [];
  const out = [];
  for (const b of rows) {
    // the row right above b: its span overlaps b's, it ends above b's middle, nearest first
    let a = null;
    for (const c of rows) {
      if (c === b || c.y + c.h > b.y + b.h / 2 || c.y >= b.y) continue;
      const [ix] = cross(c, b);
      if (ix <= 0) continue;
      if (!a || c.y + c.h > a.y + a.h) a = c;
    }
    if (!a) continue;
    if (!!a.ui !== !!b.ui || Math.max(a.px, b.px) > P.size * Math.min(a.px, b.px)) continue; // a headline over a card, a wordmark over its line
    const gap = b.y - (a.y + a.h);
    if (gap > P.gap * Math.max(a.h, b.h)) continue; // not one stack
    if (pics.some((p) => inside(a, p, 2) !== inside(b, p, 2))) continue; // one on a picture, one off it: two places
    const dl = Math.abs(a.x - b.x) * k;
    const dc = Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) * k;
    const dr = Math.abs(a.x + a.w - (b.x + b.w)) * k;
    if (dl > P.tol && dl <= P.near && dc > P.tol && dr > P.tol) out.push({ a, b, d: r1(dl) });
  }
  return out;
}

/** A text box where it shows: the audit logs text with the camera float taken out (`float`: x, y, k about the centre);
 * the marks and pictures are logged where they show. */
const onScreen = (b, cw, ch) => {
  const f = b.float;
  if (!Array.isArray(f) || f.length !== 3 || !f[2]) return b;
  return { ...b, x: cw / 2 + (b.x - cw / 2) * f[2] + f[0], y: ch / 2 + (b.y - ch / 2) * f[2] + f[1], w: b.w * f[2], h: b.h * f[2] };
};
/** By design: a caption inside a photo, or the asset set in the line (80 % of it within the line's span, its middle on
 * the line: an inline mark, a word knocked out of a photo). */
const byDesign = (t, s, tol) =>
  inside(t, s, tol) || inside(s, t, tol) || (cross(t, s)[0] >= 0.8 * s.w && s.y + s.h / 2 >= t.y && s.y + s.h / 2 <= t.y + t.h);
/** Text boxes crossing a mark's or a picture's edge on one frame: [{ t, asset, kind, ix, iy }] (px at 1080; t on screen). */
function assetFrame(d) {
  const cw = d.width || 1920, ch = d.height || 1080;
  const k = 1080 / ch;
  const c = UI_LAYOUT.asset.cross;
  const seen = new Set();
  const assets = [...(d.logos || []).map((x) => ({ ...x, kind: 'mark' })), ...(d.imagery || []).map((x) => ({ ...x, kind: 'picture' }))]
    .filter((s) => !s.covered && !(s.opacity < UI_LAYOUT.read.opacity)) // when the audit says so: hidden or faint
    .filter((s) => { const key = [s.kind, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h)].join(); return !seen.has(key) && seen.add(key); });
  const out = [];
  for (const t of (d.boxes || []).filter(readable).map((b) => onScreen(b, cw, ch))) {
    for (const s of assets) {
      const [ix, iy] = cross(t, s);
      if (ix * k <= c || iy * k <= c) continue; // apart, or touching
      if (byDesign(t, s, c / k)) continue;
      out.push({ t, asset: s, kind: s.kind, ix: r1(ix * k), iy: r1(iy * k) });
    }
  }
  return out;
}

/** Both reads over the audited frames ([{ frame, width, height, boxes, logos?, imagery? }]): { issues, warnings }. */
function uiLayout(frames) {
  const groups = new Map();
  const add = (key, frame, x) => {
    const g = groups.get(key) ?? { frames: [], first: x };
    if (!g.frames.includes(frame)) g.frames.push(frame);
    groups.set(key, g);
  };
  for (const d of frames || []) {
    for (const x of alignFrame(d)) add(`ui-align|${x.a.id}|${x.b.id}`, d.frame, { kind: 'ui-align', frame: d.frame, ...x });
    for (const x of assetFrame(d)) add(`text-on-asset|${x.t.id}|${x.asset.name ?? x.kind}`, d.frame, { kind: 'text-on-asset', frame: d.frame, ...x });
  }
  const issues = [], warnings = [];
  for (const g of groups.values()) {
    const x = g.first;
    const n = g.frames.length;
    const on = n > 1 ? ` (on ${n} audited frames: ${g.frames.slice(0, 6).join(', ')}${n > 6 ? ', ...' : ''})` : ' (on one audited frame: mid-move?)';
    const item = x.kind === 'ui-align'
      ? { frame: x.frame, kind: 'ui-align', id: `${x.a.id}+${x.b.id}`, d: x.d, frames: g.frames,
          detail: `"${x.a.text ?? x.a.id}" and "${x.b.text ?? x.b.id}" stack in one card but their left edges miss by ${x.d} px${on}: rows of a card share one left edge (within 2 px), or sit centred on purpose; an indent is a step of 16 px or more` }
      : { frame: x.frame, kind: 'text-on-asset', id: `${x.t.id}+${x.asset.name ?? x.kind}`, cross: [x.ix, x.iy], frames: g.frames,
          detail: `"${x.t.text ?? x.t.id}" cuts ${x.ix}x${x.iy} px into ${x.kind === 'mark' ? `the ${x.asset.name ?? ''} mark` : 'a picture'}${on}: text sits beside a mark or a picture with clear space, or wholly on a photo as its caption, never across its edge (look-audit.py --layout fails it when the asset is in view there)` };
    (x.kind === 'ui-align' && n >= UI_LAYOUT.persist ? issues : warnings).push(item);
  }
  const by = (p, q) => p.frame - q.frame;
  return { issues: issues.sort(by), warnings: warnings.sort(by) };
}

module.exports = { UI_LAYOUT, uiLayout, alignFrame, assetFrame };

if (require.main === module) {
  const fs = require('fs');
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
    process.exit(argv.length ? 0 : 2);
  }
  const src = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--json');
  const out = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  let rep;
  try {
    rep = JSON.parse(fs.readFileSync(src, 'utf8'));
  } catch (e) {
    console.error(`ui-layout: cannot read a layout-audit report at ${src} (${e.message})`);
    process.exit(2);
  }
  const res = uiLayout(rep.boxes || []);
  if (!argv.includes('--quiet')) {
    for (const x of res.issues) console.log(`  f${x.frame}  ${x.kind}  ${x.id}  ${x.detail}`);
    for (const x of res.warnings) console.log(`  f${x.frame}  warn ${x.kind}  ${x.id}  ${x.detail}`);
  }
  const pass = res.issues.length === 0;
  if (out) fs.writeFileSync(out, JSON.stringify({ tool: 'ui-layout', report: src, frames: (rep.boxes || []).length, pass, ...res }, null, 1) + '\n');
  console.log(`ui-layout: ${(rep.boxes || []).length} audited frames, ${res.issues.length} issues, ${res.warnings.length} warnings -> ${pass ? 'pass' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}
