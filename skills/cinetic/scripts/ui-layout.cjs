#!/usr/bin/env node
/**
 * ui-layout.cjs: product UI is simple, aligned and whole in the frame. Three reads on the layout audit's boxes (scripts/layout-audit.sh runs
 * them on every audit and adds what they find to its report; run alone on a report it already wrote):
 *
 *   ui-align       text rows stacked in one card or panel share their left edge: two readable rows, one right under the
 *                  other (the gap under 1.2 line heights, their spans overlapping), whose left edges miss each other by
 *                  more than 2 px and at most 12 px at 1080 (a near miss: a deliberate indent, an icon-led row or a
 *                  second column sits further in) and that are not centred on each other or set flush right together. A
 *                  card the camera or a 3D turn tilts draws its one left edge slanted: three stacked rows whose left edges
 *                  lie on one straight line (within 1 px, at most 5 deg off vertical) are one column, not a near miss.
 *   text-on-asset  text never cuts into a picture or a mark it does not sit on by design: a readable text box that crosses
 *                  the edge of an official mark ([data-logo]) or a real picture ([data-imagery]) by more than 2 px each
 *                  way, where it shows (the camera float put back on the text). A caption set inside a photo, a mark or
 *                  photo set inside a line (an inline mark, a word knocked out of a photo: 80 % of the asset within the
 *                  line's span, its middle on the line) and boxes that only touch are by design. The boxes cannot tell a mark
 *                  hidden behind a plate from one in view, so here it is a warning: look-audit.py --layout reads the
 *                  pixels beside each crossing and fails the ones in view (on 2 or more audited frames).
 *                  The kit's icons too (the audit's `icons`: Glyph, GlyphTile, Check, Pending, a spinner, an AppIcon
 *                  without its mark; a glyph by its drawn ink): a readable text box over an icon in view (the audit's
 *                  `visible`, the share of the icon nothing opaque covers, at least 0.5) by more than a quarter of the
 *                  icon's size each way, whose words the audit found drawn on the icon or under it with nothing opaque
 *                  between (`over`, hit-tested in each word's box: the gap a line leaves for an inline glyph and a card
 *                  behind the icon's card are not over it). An icon beside its label or above it (they touch: a quarter or less on one axis), an icon
 *                  inside its own tagged text and text wholly on a tile are by design. The audit sees whether the icon is in view, so under the ship
 *                  gate (CINETIC_GATE=ship, or --ship) a crossing on 2 or more audited frames fails; in dev it warns.
 *   text-edge      the safe area where the camera crops: a readable text box cut by the frame or within 4 % of its edge
 *                  (77 px at the sides, 43 px top and bottom at 1920x1080) where it shows, outside a declared crop. The
 *                  audit's own safe-area check judges the layout (the camera float taken out) and lets a declared bleed
 *                  ([data-audit-push="bleed"]: a type push, a closer frame that bleeds past the edges) cross the edge;
 *                  this read covers what that leaves: product text (data-ui) cut by the frame inside a bleed (a card's
 *                  label sliced by a punch-in), and any text the camera float carries to the edge. A crop that cuts
 *                  text on purpose (a wall of words as texture, a giant word cropped) declares it with [data-audit-crop],
 *                  a scrolling list with [data-audit-scroll]; a statement pushed through the frame stays the push's.
 *                  On 2 or more audited frames it fails, on one it warns (a frame caught mid-move).
 *
 * Readable: effective opacity >= 0.5, not inside a type push in flight or an active smear, and moving at most 3 px/f
 * (layout-audit --speed, else measured here between audited frames up to 12 frames apart). Each finding is grouped by its pair of ids: ui-align on 2 or more audited frames fails
 * (a resting state), on one it warns (a frame caught mid-move). Px are at 1080 (a 4K or 9:16 frame is scaled).
 *
 * Usage:
 *   node scripts/ui-layout.cjs out/qa/layout-Film.json [--json out/qa/ui-layout.json] [--ship] [--quiet]
 *   (layout-audit.sh requires it: const { uiLayout } = require('./ui-layout.cjs'))
 * Exit codes: 0 no failure, 1 a failure, 2 bad arguments.
 */
'use strict';

const UI_LAYOUT = {
  align: { tol: 2, near: 12, gap: 1.2, size: 1.6, tilt: 0.09, line: 1 }, // px at 1080; gap in line heights; type sizes within this ratio (one card's rows); a tilted card's column: slope up to 0.09 (5 deg), its left edges on one line within 1 px
  asset: { cross: 2 }, // px at 1080 each way
  icon: { visible: 0.5, touch: 0.25 }, // an icon in view: this share of it uncovered; text and icon only touch while one axis overlaps by this share of the icon or less
  read: { opacity: 0.5, speed: 3 }, // effective opacity; px/f at 1080 (layout-audit --max-read-speed)
  edge: { margin: 0.04 }, // the share of the frame's width (sides) and height (top, bottom) text keeps clear where it shows
  persist: 2, // audited frames on which a finding fails
};

const r1 = (v) => Math.round(v * 10) / 10;
const readable = (b) => b.opacity >= UI_LAYOUT.read.opacity && b.push !== 'moving' && !b.smear && !(b.speed > UI_LAYOUT.read.speed);
const inside = (a, b, tol) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const cross = (a, b) => [Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)];

/** Near-miss left edges among the stacked rows of one frame: [{ a, b, d }] (d in px at 1080). A card tilted by the camera
 * or a 3D turn draws its one left edge as a slanted line: three stacked rows whose left edges sit on one straight line (within
 * 1 px, at most 5 deg off vertical) are one column on a tilted card, not a near miss. */
function alignFrame(d) {
  const k = 1080 / (d.height || 1080);
  const P = UI_LAYOUT.align;
  const rows = (d.boxes || []).filter(readable);
  const pics = d.imagery || [];
  // the row right above b in one stack: its span overlaps b's, it ends above b's middle, nearest first; same kind and size
  const up = new Map();
  for (const b of rows) {
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
    up.set(b, a);
  }
  // three rows (p over q over r) whose left edges lie on one slanted line: one column on a tilted card
  const slant = (p, q, r) => {
    if (!p || !r) return false;
    const s1 = (q.x - p.x) / (q.y - p.y), s2 = (r.x - q.x) / (r.y - q.y);
    return Math.abs(s1) <= P.tilt && Math.abs(s2) <= P.tilt && Math.abs(s1 * (r.y - q.y) - (r.x - q.x)) * k <= P.line && Math.sign(s1) === Math.sign(s2);
  };
  const out = [];
  for (const [b, a] of up) {
    const dl = Math.abs(a.x - b.x) * k;
    const dc = Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) * k;
    const dr = Math.abs(a.x + a.w - (b.x + b.w)) * k;
    if (!(dl > P.tol && dl <= P.near && dc > P.tol && dr > P.tol)) continue;
    const below = [...up].find(([, x]) => x === b)?.[0];
    if (slant(up.get(a), a, b) || slant(a, b, below)) continue;
    out.push({ a, b, d: r1(dl) });
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
/** An icon and a text by design: the audit found none of the text's words drawn on the icon or right under it (`over`: an
 * inline glyph in the gap its line leaves, a card behind the icon's card), the icon is part of the line (inside
 * its tagged text), the text sits wholly on the icon's tile, or they only touch (beside its label, or above it: one axis
 * overlaps by a quarter of the icon or less). */
const iconByDesign = (t, s, ix, iy, tol) =>
  (Array.isArray(s.over) && !s.over.includes(t.id)) || (s.inText !== undefined && s.inText === t.id) || inside(t, s, tol) ||
  ix <= UI_LAYOUT.icon.touch * s.w || iy <= UI_LAYOUT.icon.touch * s.h;
/** Text boxes crossing a mark's or a picture's edge, or lying over a kit icon, on one frame: [{ t, asset, kind, ix, iy }]
 * (px at 1080; t on screen). */
function assetFrame(d) {
  const cw = d.width || 1920, ch = d.height || 1080;
  const k = 1080 / ch;
  const c = UI_LAYOUT.asset.cross;
  const seen = new Set();
  const assets = [...(d.logos || []).map((x) => ({ ...x, kind: 'mark' })), ...(d.imagery || []).map((x) => ({ ...x, kind: 'picture' })),
    ...(d.icons || []).map((x) => ({ ...x, kind: 'icon' }))]
    .filter((s) => !s.covered && !(s.opacity < UI_LAYOUT.read.opacity)) // when the audit says so: hidden or faint
    .filter((s) => s.kind !== 'icon' || !(s.visible < UI_LAYOUT.icon.visible)) // an icon mostly under a card or a plate
    .filter((s) => { const key = [s.kind, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h)].join(); return !seen.has(key) && seen.add(key); });
  const out = [];
  for (const t of (d.boxes || []).filter(readable).map((b) => onScreen(b, cw, ch))) {
    for (const s of assets) {
      const [ix, iy] = cross(t, s);
      if (ix * k <= c || iy * k <= c) continue; // apart, or touching
      if (s.kind === 'icon' ? iconByDesign(t, s, ix, iy, c / k) : byDesign(t, s, c / k)) continue;
      out.push({ t, asset: s, kind: s.kind, ix: r1(ix * k), iy: r1(iy * k) });
    }
  }
  return out;
}

/** Text cut by the frame or within the edge margin where it shows, outside a declared crop, on one frame:
 * [{ b, cut, sides, gap }] (gap: px at 1080 to the nearest edge, negative when cut). Inside a declared bleed only product
 * text (data-ui) is held here (a statement pushed through the frame is the type push's); outside one, only a box the
 * camera float carries past the margin while its layout sits inside (the audit's safe-area judges the layout). */
function edgeFrame(d) {
  const cw = d.width || 1920, ch = d.height || 1080;
  const k = 1080 / ch;
  const m = UI_LAYOUT.edge.margin;
  const out = [];
  for (const b of (d.boxes || []).filter(readable)) {
    if (b.scroll || b.crop) continue;
    const s = onScreen(b, cw, ch);
    const cut = !!b.crosses || s.x < -1 || s.y < -1 || s.x + s.w > cw + 1 || s.y + s.h > ch + 1;
    const sides = [s.x < m * cw && 'left', s.x + s.w > (1 - m) * cw && 'right', s.y < m * ch && 'top', s.y + s.h > (1 - m) * ch && 'bottom'].filter(Boolean);
    if (!cut && !sides.length) continue;
    if (b.push === 'bleed') {
      if (!b.ui) continue; // a statement landed as a declared bleed: the audit holds it to crossing the edge
    } else {
      // the layout itself: the audit's safe-area judges it; here only what the float adds
      const inLayout = b.x >= m * cw && b.y >= m * ch && b.x + b.w <= (1 - m) * cw && b.y + b.h <= (1 - m) * ch;
      if (!inLayout || !b.float) continue;
    }
    const gap = Math.min(s.x, s.y, cw - (s.x + s.w), ch - (s.y + s.h)) * k;
    out.push({ b, cut, sides: sides.length ? sides : ['edge'], gap: r1(gap) });
  }
  return out;
}

/** Each box's speed (px/f at 1080, its centre) from the audited frames on either side when the audit did not measure it
 * (layout-audit without --speed): the slower of the two moves, neighbours up to 12 frames away. A card still flying in
 * or settling is not a resting state, even on 2 audited frames. */
function withSpeed(frames) {
  const list = [...(frames || [])].sort((p, q) => p.frame - q.frame);
  const at = list.map((d) => new Map((d.boxes || []).map((b) => [b.id, b])));
  const mid = (b) => [b.x + b.w / 2, b.y + b.h / 2];
  return list.map((d, i) => {
    const k = 1080 / (d.height || 1080);
    const v = (b, j) => {
      const e = j >= 0 && j < list.length && Math.abs(list[j].frame - d.frame) <= 12 ? at[j].get(b.id) : null;
      if (!e) return null;
      const [x0, y0] = mid(b), [x1, y1] = mid(e);
      return (Math.hypot(x1 - x0, y1 - y0) * k) / Math.abs(list[j].frame - d.frame);
    };
    return { ...d, boxes: (d.boxes || []).map((b) => {
      if (b.speed !== undefined || b.id === undefined) return b;
      const s = [v(b, i - 1), v(b, i + 1)].filter((x) => x !== null);
      return s.length ? { ...b, speed: r1(Math.min(...s)) } : b;
    }) };
  });
}

/** Under the ship gate (CINETIC_GATE=ship, as precheck --ship and the kit gate read it) a text over an icon in view fails. */
const shipGate = () => (process.env.CINETIC_GATE || '').toLowerCase() === 'ship';
/** The three reads over the audited frames ([{ frame, width, height, boxes, logos?, imagery?, icons? }]): { issues, warnings }.
 * opts.ship: the ship gate (default: CINETIC_GATE=ship). */
function uiLayout(frames, opts = {}) {
  const ship = opts.ship ?? shipGate();
  const groups = new Map();
  const add = (key, frame, x) => {
    const g = groups.get(key) ?? { frames: [], first: x };
    if (!g.frames.includes(frame)) g.frames.push(frame);
    groups.set(key, g);
  };
  for (const d of withSpeed(frames)) {
    for (const x of alignFrame(d)) add(`ui-align|${x.a.id}|${x.b.id}`, d.frame, { kind: 'ui-align', frame: d.frame, ...x });
    for (const x of assetFrame(d)) add(`text-on-asset|${x.t.id}|${x.kind}|${x.asset.name ?? x.kind}`, d.frame, { kind: 'text-on-asset', frame: d.frame, ...x });
    for (const x of edgeFrame(d)) add(`text-edge|${x.b.id}|${x.b.text ?? ''}`, d.frame, { kind: 'text-edge', frame: d.frame, ...x, w: d.width || 1920, h: d.height || 1080 });
  }
  const issues = [], warnings = [];
  for (const g of groups.values()) {
    const x = g.first;
    const n = g.frames.length;
    const on = n > 1 ? ` (on ${n} audited frames: ${g.frames.slice(0, 6).join(', ')}${n > 6 ? ', ...' : ''})` : ' (on one audited frame: mid-move?)';
    const item = x.kind === 'text-edge'
      ? { frame: x.frame, kind: 'text-edge', id: x.b.id, sides: x.sides, gap: x.gap, frames: g.frames,
          detail: `"${x.b.text ?? x.b.id}" is ${x.cut ? `cut by the frame's ${x.sides.join(' and ')} edge` : `${x.gap} px from the frame's ${x.sides.join(' and ')} edge`}${x.b.push === 'bleed' ? ' in a crop that bleeds past the frame' : ' where the camera float carries it'}${on}: text stays whole and ${Math.round(UI_LAYOUT.edge.margin * 100)} % inside the frame (${Math.round(UI_LAYOUT.edge.margin * x.w)} px at the sides, ${Math.round(UI_LAYOUT.edge.margin * x.h)} px top and bottom); frame the crop on the text's card, or declare a crop that cuts text on purpose (data-audit-crop)` }
      : x.kind === 'ui-align'
      ? { frame: x.frame, kind: 'ui-align', id: `${x.a.id}+${x.b.id}`, d: x.d, frames: g.frames,
          detail: `"${x.a.text ?? x.a.id}" and "${x.b.text ?? x.b.id}" stack in one card but their left edges miss by ${x.d} px${on}: rows of a card share one left edge (within 2 px), or sit centred on purpose; an indent is a step of 16 px or more` }
      : x.kind === 'icon'
        ? { frame: x.frame, kind: 'text-on-asset', id: `${x.t.id}+icon:${x.asset.name ?? 'icon'}`, asset: 'icon', cross: [x.ix, x.iy], frames: g.frames,
            detail: `"${x.t.text ?? x.t.id}" runs ${x.ix}x${x.iy} px over the ${x.asset.name ?? ''} icon in view${on}: an icon sits beside its label with clear space, or in the line as a word (kit/inline.tsx), never under or on text${ship ? '' : ' (the ship gate fails it on 2 audited frames)'}` }
        : { frame: x.frame, kind: 'text-on-asset', id: `${x.t.id}+${x.asset.name ?? x.kind}`, cross: [x.ix, x.iy], frames: g.frames,
            detail: `"${x.t.text ?? x.t.id}" cuts ${x.ix}x${x.iy} px into ${x.kind === 'mark' ? `the ${x.asset.name ?? ''} mark` : 'a picture'}${on}: text sits beside a mark or a picture with clear space, or wholly on a photo as its caption, never across its edge (look-audit.py --layout fails it when the asset is in view there)` };
    const fails = n >= UI_LAYOUT.persist && (x.kind === 'ui-align' || x.kind === 'text-edge' || (x.kind === 'icon' && ship)); // x.kind: ui-align, text-edge, or the asset's kind
    (fails ? issues : warnings).push(item);
  }
  const by = (p, q) => p.frame - q.frame;
  return { issues: issues.sort(by), warnings: warnings.sort(by) };
}

module.exports = { UI_LAYOUT, uiLayout, alignFrame, assetFrame, edgeFrame, shipGate };

if (require.main === module) {
  const fs = require('fs');
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
    process.exit(argv.length ? 0 : 2);
  }
  const src = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--json');
  const ship = argv.includes('--ship') || shipGate();
  const out = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  let rep;
  try {
    rep = JSON.parse(fs.readFileSync(src, 'utf8'));
  } catch (e) {
    console.error(`ui-layout: cannot read a layout-audit report at ${src} (${e.message})`);
    process.exit(2);
  }
  const res = uiLayout(rep.boxes || [], { ship });
  if (!argv.includes('--quiet')) {
    for (const x of res.issues) console.log(`  f${x.frame}  ${x.kind}  ${x.id}  ${x.detail}`);
    for (const x of res.warnings) console.log(`  f${x.frame}  warn ${x.kind}  ${x.id}  ${x.detail}`);
  }
  const pass = res.issues.length === 0;
  if (out) fs.writeFileSync(out, JSON.stringify({ tool: 'ui-layout', report: src, frames: (rep.boxes || []).length, gate: ship ? 'ship' : 'dev', pass, ...res }, null, 1) + '\n');
  console.log(`ui-layout (${ship ? 'ship gate' : 'dev'}): ${(rep.boxes || []).length} audited frames, ${res.issues.length} issues, ${res.warnings.length} warnings -> ${pass ? 'pass' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}
