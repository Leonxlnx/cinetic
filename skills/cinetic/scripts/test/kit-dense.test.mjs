#!/usr/bin/env node
/**
 * kit-dense.test.mjs: dense product screens, worlds, crafted avatars and content tiles (src/kit/data.ts, sample.ts,
 * gate.tsx, dense.tsx, avatars.tsx, tiles.tsx, parts.tsx Avatar / AvatarStack, panels.tsx KitFallback).
 *
 *   1. sample().world() (the gallery's): every kind adds up (status counts are the rows' counts, the total is the rows'
 *      sum, the chart's points sum to the total, ids and names unique, the focus record in the accent state); a billing
 *      world's statuses agree with its dates; the same seed gives the same world, two seeds give different people and rows.
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
 *   6. Nothing sample by default: every kit part given no content of the film's own (DenseScreen, the panels,
 *      KitFallback, walls, rings, tickers, a preview without its content, FileThumb, Photo, an unfetched AppIcon) draws
 *      its empty state (data-kit-empty) with no string of the kit's samples in it, and reports it in kitEmpties(); under
 *      the ship gate (CINETIC_GATE=ship) it throws. A tile or a field given an undefined node (an index past the end of
 *      an empty list) draws the empty state instead of crashing; a code panel without lines draws no bare gutter. Field,
 *      Row, Notice and Toast draw no glyph the film did not pick. A tile's title fits its column (shrinks, then wraps),
 *      never cut with "..."; no part draws "..." at all (a result tile's title, a file name, a preview's lines); a code
 *      panel numbers only the code's own lines; sample() itself reports kit-sample and throws under the ship gate. The retired
 *      sampleWorld() returns an empty world. filmWorld() adds up from the film's rows alone and its screen shows no
 *      chrome string the film did not give ("Search", "This month", "Pro", "Share").
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
const S = K.sample();
const KINDS = ['billing', 'deploys', 'support', 'orders', 'pipeline', 'hiring'] as const;
const worlds: any[] = [];
for (const kind of KINDS) for (const seed of ['alpha', 'beta', 'gamma', 'film-7']) {
  const w = S.world(seed, { kind });
  worlds.push({ kind, seed, bad: K.checkWorld(w), statuses: w.statuses.map((s: any) => s.label), today: w.today, records: w.records.map((r: any) => ({ date: r.date, status: r.status })) });
}
const same = JSON.stringify(S.world('same-seed')) === JSON.stringify(S.world('same-seed'));
const A = S.world('film-one'), B = S.world('film-two');
const differ = { people: A.people.filter((p: any) => B.people.some((q: any) => q.name === p.name)).length, titles: A.records.filter((r: any, i: number) => B.records[i] && B.records[i].title === r.title && B.records[i].value === r.value).length, kinds: new Set(['a','b','c','d','e','f','g','h','i','j'].map((s) => S.world(s).kind)).size };
const screens: Record<string, string> = {};
for (const [name, layout, recipe, seed, view] of [['table-light', 'table', 'tintedPaper', 'film-a', 1], ['table-dark', 'table', 'inkStage', 'film-b', 1], ['board-dark', 'board', 'slateMid', 'film-c', 1], ['board-light', 'board', 'tintedPaper', 'film-d', 1], ['table-small', 'table', 'tintedPaper', 'film-e', 0.6]] as const)
  screens[name] = film(60, h(K.DenseScreen, { frame: 120, theme: K.kitTheme(recipe as any), world: S.world(seed), layout, view }));
// mid-glide (k 5/16, both lines on screen): still exactly one readable line
const glides = ['table', 'board'].map((layout) => film(60, h(K.DenseScreen, { frame: 105, theme: K.kitTheme('tintedPaper'), world: S.world('film-g'), layout, focus: [{ at: 0, row: 2 }, { at: 100, row: 6 }] })));
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
for (const preview of ['doc', 'chart', 'bars', 'list', 'table', 'code']) tiles[preview] = film(60, h(K.ContentTile, { node: { glyph: 'doc', label: 'Pricing page', sub: 'INV-0412 · $1,840.00', preview, seed: 'x', ...S.preview(preview as any, 'x') }, theme: t, w: 240 }));
const personBare = film(60, h(K.ContentTile, { node: { label: 'Maya', sub: 'Design', preview: 'person', status: 'In a call' }, theme: t, w: 240 }));
const tileBare = Object.fromEntries(['doc', 'chart', 'list', 'table', 'code'].map((preview) => [preview, film(60, h(K.ContentTile, { node: { label: 'Send the slides', preview }, theme: t, w: 240 }))]));
const tileLabel = film(60, h(K.ContentTile, { node: { label: 'Send the slides', sub: 'Today' }, theme: t, w: 240 }));
const fallbackTile = film(60, h(K.ContentTile, { node: { logo: 'no-such-mark', glyph: 'chart', label: 'Unfetched', preview: 'chart' }, theme: t, w: 240 }));
const nodes = S.nodes(A, 24);
const fill = S.nodes(S.world('w:fill'), 24);
const wall = film(60, h(K.ContentWall, { nodes: nodes.slice(0, 4), fill, frame: 400, theme: t, seed: 'w', blur: false }));
const ring = film(60, h(K.ContentRing, { nodes: nodes.slice(0, 3), fill, frame: 400, theme: t, seed: 'r', count: 14, blur: false }));
const ticker = film(60, h(K.ContentTicker, { nodes: nodes.slice(0, 3), fill, frame: 400, theme: t, seed: 'k', blur: false }));
const fallback = film(60, h(K.KitFallback, { frame: 60, w: 1500, h: 860, seed: 3, theme: t }));
// 6. nothing sample by default
const own = [{ label: 'Send Maya the slides', sub: 'Today' }, { label: 'Book the dentist', sub: 'Tuesday' }];
const wallOwn = film(60, h(K.ContentWall, { nodes: own, frame: 400, theme: t, seed: 'w', blur: false }));
const before = K.kitEmpties().length; // KitFallback (rendered above) is already in
const bare: Record<string, string> = {
  DenseScreen: film(60, h(K.DenseScreen, { frame: 60, theme: t, seed: 'film-a', kind: 'support' } as any)),
  DenseScreenRetired: film(60, h(K.DenseScreen, { frame: 60, theme: t, world: K.sampleWorld('film-a') })),
  ProjectPanel: film(60, h(K.ProjectPanel, { frame: 60, theme: t })),
  ChatCard: film(60, h(K.ChatCard, { frame: 60, theme: t, at: [10, 20] })),
  FeedCard: film(60, h(K.FeedCard, { frame: 60, theme: t })),
  StatCard: film(60, h(K.StatCard, { frame: 60, theme: t, count: { from: 18240, perSec: 140, start: 0 } })),
  ApprovalsCard: film(60, h(K.ApprovalsCard, { frame: 60, theme: t })),
  BudgetCard: film(60, h(K.BudgetCard, { frame: 60, theme: t })),
  CategoryRows: film(60, h(K.CategoryRows, { frame: 60, theme: t })),
  ChartCard: film(60, h(K.ChartCard, { frame: 60, theme: t })),
  RingCard: film(60, h(K.RingCard, { frame: 60, theme: t })),
  AmountToast: film(60, h(K.AmountToast, { theme: t })),
  ReportCover: film(60, h(K.ReportCover, { frame: 60, theme: t })),
  KitFallback: fallback,
  ContentWall: film(60, h(K.ContentWall, { nodes: [], frame: 60, theme: t })),
  ContentRing: film(60, h(K.ContentRing, { nodes: [], frame: 60, theme: t })),
  ContentTicker: film(60, h(K.ContentTicker, { nodes: [], frame: 60, theme: t })),
  FileThumb: film(60, h(K.FileThumb, { theme: t, w: 300, h: 200, seed: 41 })),
  Photo: film(60, h(K.Photo, { theme: t, w: 300, h: 200, seed: 3 })),
  AppIcon: film(60, h(K.AppIcon, { logo: 'no-such-mark', size: 120, theme: t })),
  CodePanel: film(60, h(K.CodePanel, { theme: t, w: 900, lines: [], rows: 4 })),
};
// an index past the end of an empty list (a template's NODES[i % NODES.length] over no nodes): the empty state, never a crash
const holes: Record<string, string> = {};
for (const [name, el] of [
  ['ContentTile', () => h(K.ContentTile, { node: [][0] as any, theme: t, w: 240 })],
  ['ContentTileBlank', () => h(K.ContentTile, { node: { label: '' } as any, theme: t, w: 240 })],
  ['ContentWall', () => h(K.ContentWall, { nodes: [undefined, undefined] as any, fill: [undefined] as any, frame: 400, theme: t, blur: false })],
  ['ContentRing', () => h(K.ContentRing, { nodes: [undefined] as any, frame: 400, theme: t, blur: false })],
  ['ContentTicker', () => h(K.ContentTicker, { nodes: [undefined] as any, frame: 400, theme: t, blur: false })],
  ['WallWithHoles', () => h(K.ContentWall, { nodes: [own[0], undefined] as any, fill: [undefined, own[1]] as any, frame: 400, theme: t, seed: 'w', blur: false })],
] as const) { try { holes[name] = film(60, (el as any)()); } catch (e) { holes[name] = 'THROW ' + String((e as Error).message); } }
const holeNodes = K.worldNodes(undefined as any, 4).length;
const toastBare = film(60, h(K.Toast, { theme: t, title: 'Moved to Tuesday', w: 520, h: 124 }));
// a title in a narrow column shrinks, then wraps, never "...": a stub DOM measures 0.5 em a letter
const g: any = globalThis;
g.document = { createElement: () => ({ style: {}, textContent: '', getBoundingClientRect() { return { width: String(this.textContent).length * parseFloat(this.style.fontSize) * 0.5 }; } }), body: { appendChild() {}, removeChild() {} } };
const fits = { short: K.fitTitle('Pay rent', 20, 650, 200), shrink: K.fitTitle('Send the slides', 20, 650, 140), wrap: K.fitTitle('Send Maya the slides for Friday', 20, 650, 140) };
const tileFit = film(60, h(K.ContentTile, { node: { glyph: 'doc', label: 'Send Maya the slides for Friday', sub: 'Today' }, theme: t, w: 240 }));
// no part ever draws "...": a result tile's long title, a file thumb's long name, a preview's long lines
const noDots = {
  tile: film(60, h(K.Tile, { theme: t, w: 300, file: { name: 'walk-home-monday-voice-memo-final.m4a' }, title: 'Send Maya the slides for Friday and book the dentist for Tuesday morning', meta: 'Today' })),
  thumb: film(60, h(K.FileThumb, { theme: t, w: 200, h: 140, name: 'walk-home-monday-voice-memo-final.m4a', size: '2.4 MB' })),
  preview: film(60, h(K.ContentTile, { node: { glyph: 'doc', label: 'Notes', lines: ['Send Maya the slides for Friday and the deck for Monday', 'Book the dentist for Tuesday morning before work', 'Pay the rent'] }, theme: t, w: 240 })),
};
delete g.document;
// a code panel numbers the code's own lines, never a gutter running on past its last line
const code4 = film(60, h(K.CodePanel, { theme: t, w: 900, lines: [[{ k: 'kw', s: 'const' }, { k: 'txt', s: ' a = 1;' }], [{ k: 'txt', s: 'a++;' }]], rows: 2, gutter: 40 }));
// sample() itself reports kit-sample (a warning in dev, recorded once) and throws under the ship gate
const sampleReported = K.kitEmpties().some((x: any) => x.part === 'sample()' && /^kit-sample:/.test(x.message));
(globalThis as any).process.env.CINETIC_GATE = 'ship';
let sampleShip = '';
try { K.sample(); } catch (e) { sampleShip = String((e as Error).message); }
delete (globalThis as any).process.env.CINETIC_GATE;
const empties = [...new Set(K.kitEmpties().map((x: any) => x.part))];
const noGlyph = { field: film(60, h(K.Field, { theme: t, w: 900, h: 110 }, 'Walk home, Monday')), row: film(60, h(K.Row, { theme: t, w: 900, h: 110, title: 'Today' })), notice: film(60, h(K.Notice, { theme: t, w: 900, h: 130, title: 'Book the dentist', body: 'Added to Tuesday' })) };
const retired = K.sampleWorld('film-x', { kind: 'billing' });
const FW = K.filmWorld({
  workspace: 'Tern', screen: 'This week', noun: ['task', 'tasks'],
  people: [{ name: 'Leon Lin' }],
  statuses: [{ label: 'Done', tone: 'accent' }, { label: 'Today', tone: 'wait' }],
  records: [
    { title: 'Send Maya the slides', date: 'Today', status: 1, who: 0 },
    { title: 'Book the dentist', date: 'Tue', status: 0, who: 0 },
    { title: 'Pay the rent', date: 'Fri', status: 1 },
    { title: 'Call Mum back', date: 'Sun', status: 1 },
  ],
});
const filmScreen = film(60, h(K.DenseScreen, { frame: 60, theme: t, world: FW, layout: 'table', focus: null }));
const filmBoard = film(60, h(K.DenseScreen, { frame: 60, theme: t, world: FW, layout: 'board', focus: null }));
const filmNodes = K.worldNodes(FW, 6);
const env = (globalThis as any).process.env;
env.CINETIC_GATE = 'ship';
let shipThrow = '';
try { film(60, h(K.DenseScreen, { frame: 60, theme: t })); } catch (e) { shipThrow = String((e as Error).message); }
delete env.CINETIC_GATE;
const sampleStrings = [...S.docLines, ...S.listLines, ...S.fileStems, ...S.codeLines.map((c: any) => c[1]), S.review.product, S.review.project.title, S.review.chat.title, S.review.stats.views.label, S.review.stats.views.since, S.budgets.product, S.budgets.team, 'Weekly spend', ...S.companies.pre.flatMap((p: string) => S.companies.suf.map((s: string) => p + ' ' + s))];
console.log(JSON.stringify({ worlds, same, differ, screens, glides, fs60, fs30, fixed, av: { big: avatar(96), chip: avatar(32), half: avatar(220, 'halftone') }, cuts, dots: { n: dots.length, rs: dots.map((d: any) => d[2]), maxY: Math.max(...dots.map((d: any) => d[1])), corner: cornerR(dots), invCorner: cornerR(inv) }, stack, tiles, personBare, tileBare, holes, holeNodes, toastBare, fits, tileFit, noDots, code4, sampleReported, sampleShip, tileLabel, fallbackTile, nodes, wall, ring, ticker, fallback, wallOwn, bare, empties, noGlyph, retired: { records: retired.records.length, people: retired.people.length, origin: retired.origin }, fw: { bad: K.checkWorld(FW), counts: FW.statuses.map((s: any) => s.count), focus: FW.focus, series: FW.series.length }, filmScreen, filmBoard, filmNodes, shipThrow, sampleStrings, wallSlots: K.wallSlots(4, { cols: Math.max(4, Math.round(1920 / (230 * 1.24)) + 1), rows: Math.max(3, Math.round(1080 / (230 * 1.24 * 0.92)) + 1), cell: 230 * 1.24, w: 1920, h: 1080, seed: 'w' }).length }));
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
  result(!bad.length, `sample().world: ${P.worlds.length} worlds over 6 kinds add up (counts, sums, chart, ids, names, focus)`, bad.map((w) => `${w.kind}/${w.seed}: ${w.bad.join('; ')}`).join(' | '));
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
  result(!dateWrong.length, 'sample().world: a bill past its due date and unpaid is overdue, one not yet due is due, a draft has no date', dateWrong.slice(0, 4).join(' | '));
  result(P.same, 'sample().world: the same seed gives the same world');
  result(P.differ.people <= 2 && P.differ.titles <= 2 && P.differ.kinds >= 4, 'sample().world: two seeds get different people and rows, and the seeds deal the kinds', JSON.stringify(P.differ));

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
  result(P.nodes.length === 24 && P.nodes.every((n) => n.label && n.label.length > 1) && new Set(P.nodes.map((n) => n.preview)).size >= 5, 'sample().nodes: 24 labelled gallery nodes, five or more preview kinds');
  result(/data-kit-empty="ContentTile"/.test(P.personBare) && !/data-drawn/.test(P.personBare), 'ContentTile person preview without a photo: kit-empty, never a drawn face for a name');
  for (const [kind, html] of Object.entries(P.tileBare)) {
    const n = strings(html).length;
    result(/data-kit-empty="ContentTile"/.test(html) && n === 1, `ContentTile ${kind} preview without its content: an empty preview (kit-empty), no sample lines`, `${n} strings`);
  }
  result(!/data-kit-empty/.test(P.tileLabel) && strings(P.tileLabel).length === 2 && !/<svg/.test(P.tileLabel), 'ContentTile with a label and no preview content: label and sub only, no glyph the film did not pick, no preview well');
  const tileCount = (html) => (html.match(/data-ui="true"[^>]*style="position:relative;width:[\d.]+px;height:[\d.]+px;border-radius/g) ?? []).length;
  const wallTiles = tileCount(P.wall);
  result(wallTiles === P.wallSlots && strings(P.wall).length >= wallTiles * 4, 'ContentWall: every slot is a tile with content (no blank tiles)', `${wallTiles} tiles of ${P.wallSlots} slots, ${strings(P.wall).length} strings`);
  result(tileCount(P.ring) === 14 && strings(P.ring).length >= 14 * 4, 'ContentRing: 14 tiles with content');
  result(tileCount(P.ticker) >= 12 && strings(P.ticker).length >= tileCount(P.ticker) * 4, 'ContentTicker: two rows of tiles with content', `${tileCount(P.ticker)} tiles`);
  // 6. nothing sample by default
  const leak = (html) => P.sampleStrings.filter((s) => s && html.includes(`>${s}<`));
  for (const [part, html] of Object.entries(P.bare)) {
    const n = strings(html).length;
    const tag = part === 'DenseScreenRetired' ? 'DenseScreen' : part;
    result(new RegExp(`data-kit-empty="${tag}"`).test(html) && n === 0 && !leak(html).length && !/data-drawn/.test(html), `${part} with no content of the film's own: its empty state (data-kit-empty), no string, nothing drawn`, `${n} strings; leaks ${leak(html).slice(0, 3).join(', ')}`);
  }
  for (const part of ['ContentTile', 'ContentTileBlank', 'ContentWall', 'ContentRing', 'ContentTicker']) {
    const html = P.holes[part];
    const tag = part === 'ContentTileBlank' ? 'ContentTile' : part;
    result(!html.startsWith('THROW') && new RegExp(`data-kit-empty="${tag}"`).test(html) && strings(html).length === 0, `${part} given an undefined node (an index past the end of an empty list): its empty state, no crash`, html.slice(0, 90));
  }
  const holed = P.holes.WallWithHoles;
  result(!holed.startsWith('THROW') && !/data-kit-empty/.test(holed) && tileCount(holed) === P.wallSlots && strings(holed).every((s) => s), 'ContentWall with holes in its nodes and fill: the holes dropped, every slot one of the film items', holed.slice(0, 90));
  result(P.holeNodes === 0, 'worldNodes(undefined): no nodes, no crash');
  result(!/<svg/.test(P.toastBare) && />Moved to Tuesday</.test(P.toastBare), 'Toast draws no glyph the film did not pick (no default check)');
  const F = P.fits;
  result(F.short.px === 20 && !F.short.wrap && F.shrink.px < 20 && F.shrink.px >= 20 * 0.78 && !F.shrink.wrap && F.wrap.wrap && Math.abs(F.wrap.px - 20 * 0.78) < 1e-9, 'fitTitle: a title that fits keeps its size, a little too long shrinks (to 78 %), longer wraps to two lines', JSON.stringify(F));
  const dots = Object.entries(P.noDots).filter(([, html]) => /ellipsis|line-clamp|…|\.\.\./i.test(html)).map(([k]) => k);
  result(!dots.length && /Send Maya the slides for Friday and book/.test(P.noDots.tile) && /walk-home-monday/.test(P.noDots.thumb), 'no kit part draws "...": a result tile\'s long title, a file thumb\'s long name and a preview\'s long lines shrink, wrap or run under the edge', dots.join(', '));
  const gutter = [...P.code4.matchAll(/<div>(\d+)<\/div>/g)].map((m) => Number(m[1]));
  result(gutter.length === 2 && gutter.join() === '1,2', 'CodePanel numbers the code\'s own lines (2 lines: 1 and 2), never a gutter of 40 numbers over nothing', gutter.join(','));
  result(P.sampleReported && /^kit-sample:/.test(P.sampleShip), 'sample() reports kit-sample (a warning in dev, listed by kitEmpties for precheck) and throws under the ship gate', P.sampleShip.slice(0, 80));
  result(!/text-overflow:ellipsis[^"]*">Send Maya the slides for Friday/.test(P.tileFit) && /white-space:normal/.test(P.tileFit), 'ContentTile: a long title wraps in its column, never cut with "..."', P.tileFit.slice(0, 80));
  const wantEmpty = ['sampleWorld', 'DenseScreen', 'ProjectPanel', 'ChatCard', 'FeedCard', 'StatCard', 'ApprovalsCard', 'BudgetCard', 'CategoryRows', 'ChartCard', 'RingCard', 'AmountToast', 'ReportCover', 'KitFallback', 'ContentWall', 'ContentRing', 'ContentTicker', 'FileThumb', 'Photo', 'AppIcon', 'CodePanel', 'ContentTile'];
  result(wantEmpty.every((p) => P.empties.includes(p)), 'kitEmpties(): every empty part is reported once (precheck lists them)', wantEmpty.filter((p) => !P.empties.includes(p)).join(', '));
  result(/kit-empty: DenseScreen/.test(P.shipThrow), 'under the ship gate an empty kit part throws (a film never ships one)', P.shipThrow.slice(0, 80));
  result(!/<svg/.test(P.noGlyph.field) && !/<svg/.test(P.noGlyph.row) && !/<svg/.test(P.noGlyph.notice), 'Field, Row and Notice draw no glyph the film did not pick (no default link, grid or bolt)');
  result(P.retired.records === 0 && P.retired.people === 0 && P.retired.origin === 'empty', 'sampleWorld() is retired: an empty world, never sample rows', JSON.stringify(P.retired));
  result(!P.fw.bad.length && P.fw.counts.join() === '1,3' && P.fw.focus === 1 && P.fw.series === 0, 'filmWorld: the film\'s rows add up (counts, focus in the accent state), no invented chart', JSON.stringify(P.fw));
  const chromeLeak = ['Search', 'This month', 'Pro', 'Share', 'Activity', 'Last 12 weeks', 'Team', 'New task', 'All', '1 members', '1 member'].filter((s) => P.filmScreen.includes(`>${s}<`) || P.filmScreen.includes(` ${s}<`) || P.filmBoard.includes(`>${s}<`));
  result(/>Send Maya the slides</.test(P.filmScreen) && /data-texture/.test(P.filmScreen) && !chromeLeak.length && !leak(P.filmScreen + P.filmBoard).length && !/data-kit-empty/.test(P.filmScreen), 'DenseScreen from filmWorld: the film\'s rows, no chrome string or sample string it did not give', chromeLeak.join(', '));
  result(P.filmNodes.length === 6 && P.filmNodes.every((n) => !n.preview && !n.glyph && !n.lines) && P.filmNodes[0].label === 'Send Maya the slides', 'worldNodes(filmWorld): the film\'s records as labels, no invented preview or glyph', JSON.stringify(P.filmNodes[0]));
  result(tileCount(P.wallOwn) === P.wallSlots && !leak(P.wallOwn).length && strings(P.wallOwn).every((s) => s), 'ContentWall with only the film\'s nodes: its slots repeat the film\'s items, never sample tiles', `${tileCount(P.wallOwn)} tiles`);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
