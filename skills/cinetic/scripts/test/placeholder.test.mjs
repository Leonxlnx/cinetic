#!/usr/bin/env node
/**
 * placeholder.test.mjs: the placeholder ban the layout audit applies to the render, and the kit's side of it.
 *
 *   1. src/lib/placeholder.ts carries the same lists as scripts/placeholders.json (lint-film.mjs and copy-check.py
 *      read the JSON; the audit runs in the film's bundle and carries its own copy).
 *   2. placeholderIn(): lorem ipsum, "Placeholder", "Label text", a generic label alone, a generic noun and a number;
 *      a template slot in brackets only with `slots`; real words pass ("Invoices sent", "Name", "Item details").
 *   3. isTextBar(): a short, wide, rounded, near-neutral box is a text bar; a tall box, a dot, a square corner and an
 *      accent bar are not. drawnTooLarge(): a drawn person over 72 px and a drawn product over 48 px (at 1080p) fail.
 *   4. The kit marks what it draws: PortraitMark and HalftonePortrait carry data-drawn="person", the kit <Photo>'s
 *      stand-in (asked for with standIn or vessels) data-drawn="product", a <Photo> with no src and no stand-in its empty
 *      state (data-kit-empty, nothing drawn), with src a photograph, unmarked; a picture slot with no photo in
 *      ProjectPanel or a result Tile shows the file it is (FileThumb: the file's own name and size), never the drawn
 *      still life, and with no file name it shows the image glyph alone (kit-empty, never a made-up name); a world
 *      without photos deals no person tiles, one with photos deals them with the photo, and the tile shows it; the
 *      starter's drawn plate is marked a place stand-in.
 *   5. lib/Audit.tsx fails placeholder, bar-text and drawn-figure from those helpers.
 *
 * It runs src through the starter's own tsx and react-dom/server (npm install in assets/remotion-starter first); the
 * photograph paths (an Img needs a composition to render) are read from the source.
 * Usage (from the skill root):  node scripts/test/placeholder.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log('usage: node scripts/test/placeholder.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as P from '${url('lib/placeholder.ts')}';
import * as K from '${url('kit/index.ts')}';
const h = React.createElement;
const mk = (el: any) => renderToStaticMarkup(h(FilmProvider, { value: { fps: 60, width: 1920, height: 1080 } } as any, el));
const t = K.kitTheme('tintedPaper');
const out: any = {};
out.lists = { words: P.PLACEHOLDER_WORDS, labels: P.PLACEHOLDER_LABELS, numbered: P.PLACEHOLDER_NUMBERED };
out.hits = ['Lorem ipsum dolor', 'Placeholder line', 'Label text', 'Button', 'Item 3', 'card #2', 'Your text here', 'Invoices sent', 'Name', 'Item details', 'Paid', '[Product] turns', 'Untitled text'].map((s) => [s, P.placeholderIn(s), P.placeholderIn(s, { slots: true })]);
const grey: [number, number, number] = [214, 217, 222];
out.bars = {
  bar: P.isTextBar({ w: 320, h: 14, radius: 7, rgb: grey, alpha: 1 }),
  tall: P.isTextBar({ w: 320, h: 60, radius: 30, rgb: grey, alpha: 1 }),
  dot: P.isTextBar({ w: 14, h: 14, radius: 7, rgb: grey, alpha: 1 }),
  square: P.isTextBar({ w: 320, h: 14, radius: 0, rgb: grey, alpha: 1 }),
  accent: P.isTextBar({ w: 320, h: 14, radius: 7, rgb: [8, 150, 90], alpha: 1 }),
  faint: P.isTextBar({ w: 320, h: 14, radius: 7, rgb: grey, alpha: 0.1 }),
  half: P.isTextBar({ w: 160, h: 7, radius: 3.5, rgb: grey, alpha: 1 }, 0.5),
};
out.drawn = { p72: P.drawnTooLarge('person', 72, 72), p96: P.drawnTooLarge('person', 96, 96), prod40: P.drawnTooLarge('product', 40, 30), prod60: P.drawnTooLarge('product', 60, 40), half: P.drawnTooLarge('person', 48, 48, 0.5) };
out.portrait = mk(h(K.PortraitMark, { theme: t, seed: 'ana', size: 96 }));
out.halftone = mk(h(K.HalftonePortrait, { theme: t, seed: 'ana', size: 120 }));
out.still = mk(h(K.Photo, { theme: t, w: 300, h: 200, seed: 3, standIn: true }));
out.photoEmpty = mk(h(K.Photo, { theme: t, w: 300, h: 200, seed: 3 }));
out.project = mk(h(K.ProjectPanel, { frame: 60, theme: t, data: K.sample().review }));
out.tile = mk(h(K.Tile, { theme: t, w: 420, title: 'Spring menu', meta: '12 dishes', file: { name: 'spring-menu.jpg', size: '2.4 MB' } }));
out.tileBare = mk(h(K.Tile, { theme: t, w: 420, title: 'Spring menu', meta: '12 dishes' }));
const W0 = K.sample().world('placeholder-test');
const W1 = K.sample().world('placeholder-test', { photos: ['ana.jpg', { src: 'ben.jpg', focus: [0.5, 0.3] }, 'cy.jpg'] });
out.nodes0 = K.worldNodes(W0, 24).filter((n: any) => n.preview === 'person').length;
const n1 = K.worldNodes(W1, 24).filter((n: any) => n.preview === 'person');
out.nodes1 = n1.map((n: any) => n.photo);
console.log(JSON.stringify(out));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-placeholder-'));
try {
  const probe = join(TMP, 'probe.tsx');
  writeFileSync(probe, PROBE);
  const r = spawnSync(process.execPath, [TSX, probe], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
    process.exit(1);
  }
  const P = JSON.parse(r.stdout.trim().split('\n').pop());

  // 1. one list
  const J = JSON.parse(readFileSync(join(SKILL, 'scripts', 'placeholders.json'), 'utf8'));
  for (const k of ['words', 'labels', 'numbered']) result(JSON.stringify(J[k]) === JSON.stringify(P.lists[k]), `lib/placeholder.ts ${k} equal scripts/placeholders.json`, `${J[k].length} vs ${P.lists[k].length}`);

  // 2. placeholderIn
  const hit = Object.fromEntries(P.hits.map(([s, a, b]) => [s, { a, b }]));
  const bad = ['Lorem ipsum dolor', 'Placeholder line', 'Label text', 'Button', 'Item 3', 'card #2', 'Your text here', 'Untitled text'];
  const good = ['Invoices sent', 'Name', 'Item details', 'Paid'];
  result(bad.every((s) => hit[s].a), 'placeholderIn: lorem ipsum, Placeholder, Label text, a generic label, a noun and a number', bad.filter((s) => !hit[s].a).join(', '));
  result(good.every((s) => !hit[s].a && !hit[s].b), 'placeholderIn: real words pass ("Invoices sent", "Name", "Item details", "Paid")', good.filter((s) => hit[s].a || hit[s].b).join(', '));
  result(!hit['[Product] turns'].a && hit['[Product] turns'].b === '[Product]', 'placeholderIn: a bracketed slot only with slots', JSON.stringify(hit['[Product] turns']));

  // 3. bars and drawn sizes
  const B = P.bars;
  result(B.bar && !B.tall && !B.dot && !B.square && !B.accent && !B.faint && B.half, 'isTextBar: a short, wide, rounded, near-neutral box (scaled with the frame); not a tall box, a dot, a square corner, an accent bar or a faint one', JSON.stringify(B));
  const D = P.drawn;
  result(!D.p72 && D.p96 && !D.prod40 && D.prod60 && D.half, 'drawnTooLarge: a person over 72 px, a product over 48 px (at 1080p; a half-size frame scales)', JSON.stringify(D));

  // 4. the kit
  result(/data-drawn="person"/.test(P.portrait) && /data-drawn="person"/.test(P.halftone), 'PortraitMark and HalftonePortrait carry data-drawn="person"');
  const parts = readFileSync(join(SRC, 'kit', 'parts.tsx'), 'utf8');
  const photoSrc = /if \(src\)\s*return \(\s*<div style=\{\{ position: 'relative'[^\n]*\n\s*<Img (?:data-imagery="" )?src=\{src\}/.test(parts);
  result(/data-drawn="product"/.test(P.still) && photoSrc, 'the kit Photo stand-in is marked data-drawn="product"; with src it is the photograph (an Img), unmarked');
  result(/data-kit-empty="Photo"/.test(P.photoEmpty) && !/data-drawn/.test(P.photoEmpty), 'a kit Photo with no src and no stand-in asked for: its empty state, nothing drawn');
  const files = (P.project.match(/\.jpg</g) ?? []).length;
  result(!/data-drawn="product"/.test(P.project) && files === 4 && / MB</.test(P.project), 'ProjectPanel with no photos: each select shows as the file it is (name and size), nothing drawn', `${files} files`);
  const panels = readFileSync(join(SRC, 'kit', 'panels.tsx'), 'utf8');
  result(/photos\[i\] \? <Photo theme=\{t\} w=\{thumb\} h=\{thumb\} src=\{photos\[i\]\} \/> : <FileThumb/.test(panels), 'ProjectPanel with photos: the selects are the photographs');
  result(!/data-drawn/.test(P.tile) && /spring-menu\.jpg</.test(P.tile), 'a result Tile with no src shows the file it is (its own name), never the drawn still life');
  result(!/data-drawn/.test(P.tileBare) && /data-kit-empty="FileThumb"/.test(P.tileBare) && !/\.jpg</.test(P.tileBare), 'a result Tile with no src and no file name: the image glyph alone (kit-empty), never a made-up file name');
  result(P.nodes0 === 0, 'worldNodes: a world without photos deals no person tiles', String(P.nodes0));
  result(P.nodes1.length >= 4 && P.nodes1.every((x) => ['ana.jpg', 'ben.jpg', 'cy.jpg'].includes(x)), 'worldNodes: a world with photos deals person tiles carrying the photo', P.nodes1.join(','));
  const tiles = readFileSync(join(SRC, 'kit', 'tiles.tsx'), 'utf8');
  result(/\{node\.photo \? \(\s*<Img (?:data-imagery="" )?src=\{node\.photo\}/.test(tiles), 'a person tile with a photo shows the photograph (an Img), not a drawn portrait');

  const photoFx = readFileSync(join(SRC, 'fx', 'Photo.tsx'), 'utf8');
  const plate = readFileSync(join(SRC, 'acts', 'plate.tsx'), 'utf8');
  result(/data-drawn=\{p\.photo\.drawn\}/.test(photoFx) && /drawn: 'place'/.test(plate), "the starter's drawn plate is marked a place stand-in (fx/Photo data-drawn): the audit fails it until a real photo replaces it");

  // 5. the audit
  const A = readFileSync(join(SRC, 'lib', 'Audit.tsx'), 'utf8');
  result(/from '\.\/placeholder'/.test(A) && ["kind: 'placeholder'", "kind: 'bar-text'", "kind: 'drawn-figure'"].every((k) => A.includes(k)), 'lib/Audit.tsx fails placeholder, bar-text and drawn-figure from lib/placeholder.ts');
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `placeholder tests: ${failed} failed` : 'placeholder tests: all pass');
process.exit(failed ? 1 : 0);
