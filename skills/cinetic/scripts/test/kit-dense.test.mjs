#!/usr/bin/env node
/**
 * kit-dense.test.mjs: dense product screens, sample worlds, crafted avatars and content tiles (src/kit/data.ts,
 * dense.tsx, avatars.tsx, tiles.tsx, parts.tsx Avatar / AvatarStack, panels.tsx KitFallback).
 *
 *   1. sampleWorld(): every kind adds up (status counts are the rows' counts, the total is the rows' sum, the chart's
 *      points sum to the total, ids and names unique, the focus record in the accent state); a billing world's
 *      statuses agree with its dates; the same seed gives the same world, two seeds give different people and rows.
 *   2. DenseScreen (table and board, light and dark): 25+ product strings, exactly one readable line (data-text) at
 *      4 % of the frame height or more, every other string texture (data-texture, never data-text), most of them at
 *      the micro sizes (12-16 px at 1080p); the readable line keeps 4 % of the frame when the screen is seen smaller.
 *   3. focusState(): a fixed row, and a schedule that glides 16 f at 60 fps (8 at 30) from one row to the next.
 *   4. Avatars: a portrait (an SVG with a head, hair and features) above 40 px, a monogram tile with the initials at
 *      40 px and under, never the old grey silhouette; seeds deal at least five hair cuts; the halftone portrait has
 *      dots of many sizes, covers the whole box, reads as a figure on a pale ground (small dots in the backdrop's
 *      corner, large ones in the hair and garment) and turns positive with `invert`; a stack rims each face and draws "+N".
 *   5. Tiles: each preview kind carries content; worldNodes() gives labelled nodes from the world; a wall, a ring and
 *      a ticker render a tile with content in every slot (no blank tile, no bare square); an unfetched mark falls
 *      back to a glyph tile with its label.
 *   6. KitFallback: a large landscape box gets a dense screen.
 *
 * (Walls, rings and tickers are rendered with blur: false here: a softened tile is drawn twice, at two fixed blur levels.)
 * It runs src through the starter's own tsx and react-dom/server (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/kit-dense.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const STARTER = path.join(SKILL, 'assets', 'remotion-starter');
const SRC = path.join(STARTER, 'src');
const NM = path.join(STARTER, 'node_modules');
const TSX = path.join(NM, 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/kit-dense.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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

const url = (p) => pathToFileURL(path.join(SRC, p)).href;
const nm = (p) => pathToFileURL(path.join(NM, p)).href;
const PROBE = `
import React from '${nm('react/index.js')}';
import { renderToStaticMarkup } from '${nm('react-dom/server.node.js')}';
import * as K from '${url('kit/index.ts')}';
import { FilmProvider } from '${url('lib/film.ts')}';
const h = React.createElement;
const film = (fps: number, el: any, width = 1920, height = 1080) => renderToStaticMarkup(h(FilmProvider, { value: { fps, width, height } }, el));
const KINDS = ['billing', 'deploys', 'support', 'orders', 'pipeline', 'hiring'] as const;
const worlds: any[] = [];
for (const kind of KINDS) for (const seed of ['alpha', 'beta', 'gamma', 'film-7']) {
  const w = K.sampleWorld(seed, { kind });
  worlds.push({ kind, seed, bad: K.checkWorld(w), statuses: w.statuses.map((s: any) => s.label), today: w.today, records: w.records.map((r: any) => ({ date: r.date, status: r.status })) });
}
const same = JSON.stringify(K.sampleWorld('same-seed')) === JSON.stringify(K.sampleWorld('same-seed'));
const A = K.sampleWorld('film-one'), B = K.sampleWorld('film-two');
const differ = { people: A.people.filter((p: any) => B.people.some((q: any) => q.name === p.name)).length, titles: A.records.filter((r: any, i: number) => B.records[i] && B.records[i].title === r.title && B.records[i].value === r.value).length, kinds: new Set(['a','b','c','d','e','f','g','h','i','j'].map((s) => K.sampleWorld(s).kind)).size };
const screens: Record<string, string> = {};
for (const [name, layout, recipe, seed, view] of [['table-light', 'table', 'tintedPaper', 'film-a', 1], ['table-dark', 'table', 'inkStage', 'film-b', 1], ['board-dark', 'board', 'slateMid', 'film-c', 1], ['board-light', 'board', 'tintedPaper', 'film-d', 1], ['table-small', 'table', 'tintedPaper', 'film-e', 0.6]] as const)
  screens[name] = film(60, h(K.DenseScreen, { frame: 120, theme: K.kitTheme(recipe as any), seed, layout, view }));
// mid-glide (k 5/16, both lines on screen): still exactly one readable line
const glides = ['table', 'board'].map((layout) => film(60, h(K.DenseScreen, { frame: 105, theme: K.kitTheme('tintedPaper'), seed: 'film-g', layout, focus: [{ at: 0, row: 2 }, { at: 100, row: 6 }] })));
const fs60 = [0, 1, 4, 8, 16, 40].map((d) => K.focusState(100 + d, [{ at: 0, row: 2 }, { at: 100, row: 6 }], { fps: 60 }));
const fs30 = K.focusState(104, [{ at: 0, row: 2 }, { at: 100, row: 6 }], { fps: 30 });
const fixed = K.focusState(77, 5);
const t = K.kitTheme('tintedPaper');
const avatar = (size: number, kind?: string) => film(60, h(K.Avatar, { theme: t, i: 0, initials: 'MK', size, kind, seed: 'mara' }));
const cuts = new Set(Array.from({ length: 50 }, (_, i) => K.portraitStyle('p' + i).hair)).size;
const dots = K.halftoneDots('someone', 28);
const inv = K.halftoneDots('someone', 28, true);
const cornerR = (ds: any[]) => Math.max(0, ...ds.filter((d: any) => d[0] < 9 && d[1] < 9).map((d: any) => d[2]));
const stack = film(60, h(K.AvatarStack, { theme: t, people: A.people.slice(0, 4), size: 64, ring: t.surface, more: 9 }));
const tiles: Record<string, string> = {};
for (const preview of ['doc', 'chart', 'bars', 'list', 'person', 'table', 'code']) tiles[preview] = film(60, h(K.ContentTile, { node: { glyph: 'doc', label: 'Pricing page', sub: 'INV-0412 · $1,840.00', preview, seed: 'x' }, theme: t, w: 240 }));
const fallbackTile = film(60, h(K.ContentTile, { node: { logo: 'no-such-mark', glyph: 'chart', label: 'Unfetched', preview: 'chart' }, theme: t, w: 240 }));
const nodes = K.worldNodes(A, 24);
const wall = film(60, h(K.ContentWall, { nodes: nodes.slice(0, 4), frame: 400, theme: t, seed: 'w', blur: false }));
const ring = film(60, h(K.ContentRing, { nodes: nodes.slice(0, 3), frame: 400, theme: t, seed: 'r', count: 14, blur: false }));
const ticker = film(60, h(K.ContentTicker, { nodes: nodes.slice(0, 3), frame: 400, theme: t, seed: 'k', blur: false }));
const fallback = film(60, h(K.KitFallback, { frame: 60, w: 1500, h: 860, seed: 3, theme: t }));
console.log(JSON.stringify({ worlds, same, differ, screens, glides, fs60, fs30, fixed, av: { big: avatar(96), chip: avatar(32), half: avatar(220, 'halftone') }, cuts, dots: { n: dots.length, rs: dots.map((d: any) => d[2]), maxY: Math.max(...dots.map((d: any) => d[1])), corner: cornerR(dots), invCorner: cornerR(inv) }, stack, tiles, fallbackTile, nodes, wall, ring, ticker, fallback, wallSlots: K.wallSlots(4, { cols: Math.max(4, Math.round(1920 / (230 * 1.24)) + 1), rows: Math.max(3, Math.round(1080 / (230 * 1.24 * 0.92)) + 1), cell: 230 * 1.24, w: 1920, h: 1080, seed: 'w' }).length }));
`;

/** The strings in a markup: data-text elements and data-texture spans, each with its largest font size. */
const strings = (html) => {
  const out = [];
  const re = /<(\w+)([^>]*?)\s(data-text="([^"]*)"|data-texture="[^"]*")([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = `${m[2]} ${m[5]}`;
    const fsz = Number((attrs.match(/font-size:\s*([\d.]+)px/) ?? [])[1] ?? NaN);
    // a data-text wrapper sizes its text in children: take the largest font size up to its closing tag
    let px = fsz;
    if (Number.isNaN(px)) {
      const tail = html.slice(m.index, m.index + 1200);
      const sizes = [...tail.matchAll(/font-size:\s*([\d.]+)px/g)].map((x) => Number(x[1]));
      px = sizes.length ? Math.max(...sizes) : NaN;
    }
    out.push({ kind: m[3].startsWith('data-text=') ? 'text' : 'texture', id: m[4] ?? '', px });
  }
  return out;
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-kitdense-'));
try {
  const probeFile = path.join(TMP, 'probe.tsx');
  fs.writeFileSync(probeFile, PROBE);
  const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
    process.exit(1);
  }
  const P = JSON.parse(r.stdout.trim().split('\n').pop());

  // 1. sample worlds
  const bad = P.worlds.filter((w) => w.bad.length);
  result(!bad.length, `sampleWorld: ${P.worlds.length} worlds over 6 kinds add up (counts, sums, chart, ids, names, focus)`, bad.map((w) => `${w.kind}/${w.seed}: ${w.bad.join('; ')}`).join(' | '));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateWrong = [];
  for (const w of P.worlds.filter((x) => x.kind === 'billing')) {
    const today = Date.UTC(w.today.y, w.today.m - 1, w.today.d);
    for (const rec of w.records) {
      const label = w.statuses[rec.status];
      if (rec.date === '—') { if (label !== 'Draft') dateWrong.push(`${w.seed}: no date but ${label}`); continue; }
      const [mon, day] = rec.date.split(' ');
      const mi = MONTHS.indexOf(mon);
      // the due date is within a few weeks of today: pick the year that puts it nearest
      const cands = [w.today.y - 1, w.today.y, w.today.y + 1].map((y) => Date.UTC(y, mi, Number(day)));
      const due = cands.reduce((a, b) => (Math.abs(b - today) < Math.abs(a - today) ? b : a));
      if (label === 'Overdue' && !(due < today)) dateWrong.push(`${w.seed}: overdue but due ${rec.date}`);
      if (label === 'Due' && due < today) dateWrong.push(`${w.seed}: due but past ${rec.date}`);
    }
  }
  result(!dateWrong.length, 'sampleWorld: a bill past its due date and unpaid is overdue, one not yet due is due, a draft has no date', dateWrong.slice(0, 4).join(' | '));
  result(P.same, 'sampleWorld: the same seed gives the same world');
  result(P.differ.people <= 2 && P.differ.titles <= 2 && P.differ.kinds >= 4, 'sampleWorld: two films get different people and rows, and the seeds deal the kinds', JSON.stringify(P.differ));

  // 2. dense screens
  for (const [name, html] of Object.entries(P.screens)) {
    const s = strings(html);
    const texts = s.filter((x) => x.kind === 'text');
    const textures = s.filter((x) => x.kind === 'texture');
    const minFocus = Math.ceil((0.04 * 1080) / (name === 'table-small' ? 0.6 : 1));
    const micro = textures.filter((x) => x.px >= 11 && x.px <= 16.5).length;
    result(s.length >= 25, `DenseScreen ${name}: 25+ product strings`, `${s.length}`);
    result(texts.length === 1 && texts[0].id === 'kit-dense-focus' && texts[0].px >= minFocus, `DenseScreen ${name}: exactly one readable line, at >= ${minFocus} px (4 % of the frame at its view)`, JSON.stringify(texts.slice(0, 4)));
    result(micro >= 25 && textures.every((x) => !(x.px >= minFocus)), `DenseScreen ${name}: the rest is texture, most of it at 12-16 px`, `${micro} micro of ${textures.length}`);
  }

  for (const [i, html] of P.glides.entries()) {
    const texts = strings(html).filter((x) => x.kind === 'text');
    result(texts.length === 1 && texts[0].id === 'kit-dense-focus', `DenseScreen ${i ? 'board' : 'table'} mid-glide: the leaving and the arriving line are never both readable (one data-text)`, JSON.stringify(texts));
  }

  // 3. focus schedule
  const [a0, a1, a4, a8, a16, a40] = P.fs60;
  result(a0.row === 6 && a0.prev === 2 && a0.k === 0 && Math.abs(a8.k - 0.5) < 1e-9 && a16.k === 1 && a40.k === 1 && a1.k > 0 && a4.k < a8.k, 'focusState: the lens glides 16 f at 60 fps from the last row to the next', JSON.stringify(P.fs60.map((x) => x.k)));
  result(Math.abs(P.fs30.k - 0.5) < 1e-9 && P.fixed.row === 5 && P.fixed.k === 1, 'focusState: 8 f at 30 fps; a fixed row is settled');

  // 4. avatars
  const big = P.av.big;
  result(/<svg/.test(big) && (big.match(/<(path|ellipse|circle)/g) ?? []).length >= 10 && !/>MK</.test(big), 'Avatar at 96 px: a crafted portrait (head, hair, features), no initials', `${(big.match(/<(path|ellipse|circle)/g) ?? []).length} shapes`);
  result(/>MK</.test(P.av.chip) && /data-texture/.test(P.av.chip), 'Avatar at 32 px: a monogram tile with the initials (texture)');
  result(!/M3\.6 21\.5c/.test(big + P.av.chip) && !fs.readFileSync(path.join(SRC, 'kit', 'parts.tsx'), 'utf8').includes('M3.6 21.5c'), 'no grey silhouette anywhere in the kit');
  result(P.cuts >= 5, 'portraitStyle: 50 people get at least five hair cuts', String(P.cuts));
  const rs = P.dots.rs;
  result(P.dots.n > 300 && Math.max(...rs) > 2.5 * Math.min(...rs) && (P.av.half.match(/<circle/g) ?? []).length > 300, 'HalftonePortrait: a dot screen of many sizes', `${P.dots.n} dots, r ${Math.min(...rs).toFixed(2)}-${Math.max(...rs).toFixed(2)}`);
  result(P.dots.maxY >= 96 && P.dots.corner < 0.5 * Math.max(...rs) && P.dots.invCorner > P.dots.corner, 'HalftonePortrait: covers the box, a figure on a pale ground, positive when inverted', `bottom row y ${P.dots.maxY.toFixed(1)}, corner r ${P.dots.corner.toFixed(2)} (inverted ${P.dots.invCorner.toFixed(2)}), max r ${Math.max(...rs).toFixed(2)}`);
  result((P.stack.match(/<svg/g) ?? []).length === 4 && /0 0 0 [\d.]+px/.test(P.stack) && /\+9/.test(P.stack), 'AvatarStack: four rimmed portraits and "+9"');

  // 5. tiles
  for (const [kind, html] of Object.entries(P.tiles)) {
    const n = strings(html).length;
    result(n >= (kind === 'chart' || kind === 'bars' ? 3 : 5), `ContentTile ${kind}: label, sub line and a preview with content`, `${n} strings`);
  }
  result(/Unfetched/.test(P.fallbackTile) && !/data-logo/.test(P.fallbackTile), 'ContentTile: an unfetched mark falls back to a glyph tile with its label');
  result(P.nodes.length === 24 && P.nodes.every((n) => n.label && n.label.length > 1) && new Set(P.nodes.map((n) => n.preview)).size >= 5, 'worldNodes: 24 labelled nodes from the world, five or more preview kinds');
  const tileCount = (html) => (html.match(/data-ui="true"[^>]*style="position:relative;width:[\d.]+px;height:[\d.]+px;border-radius/g) ?? []).length;
  const wallTiles = tileCount(P.wall);
  result(wallTiles === P.wallSlots && strings(P.wall).length >= wallTiles * 4, 'ContentWall: every slot is a tile with content (no blank tiles)', `${wallTiles} tiles of ${P.wallSlots} slots, ${strings(P.wall).length} strings`);
  result(tileCount(P.ring) === 14 && strings(P.ring).length >= 14 * 4, 'ContentRing: 14 tiles with content');
  result(tileCount(P.ticker) >= 12 && strings(P.ticker).length >= tileCount(P.ticker) * 4, 'ContentTicker: two rows of tiles with content', `${tileCount(P.ticker)} tiles`);
  const fb = strings(P.fallback);
  result(fb.length >= 25 && fb.filter((x) => x.kind === 'text').length === 1, 'KitFallback: a large landscape box gets a dense screen with one readable line', `${fb.length} strings`);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
