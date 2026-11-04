#!/usr/bin/env node
/**
 * logo-standins.test.mjs: logos.mjs check fails a drawn or inline stand-in for a real company's mark (an official file
 * is required: an open collection through `get`, or the brand's own press-kit file through `get --file`).
 *
 *   caught:  a component named for a brand's logo that draws SVG inline (SlackLogo, logoGithub); a map key named for a
 *            brand holding path data; an inline <svg> labelled with a brand; an image named for a brand that the logo
 *            record does not list; a former name (TwitterLogo -> X).
 *   passes:  the same brand through its official file (staticFile('logos/...'), <AppIcon logo>, <LogoChip logo>); a
 *            listed record file; a generic glyph whose name is a common word (CursorIcon, XIcon, ZoomIcon, a `box` key);
 *            the film's own mark in src/brand/.
 *   and `check <film>` exits 1 on a stand-in, 0 on the clean film.
 * Offline; uses the shipped brand table. Usage (from the skill root): node scripts/test/logo-standins.test.mjs [--verbose]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const LOGOS = join(SKILL, 'scripts', 'logos.mjs');
const verbose = process.argv.includes('--verbose');
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
const { standIns } = await import(pathToFileURL(LOGOS).href);

const put = (root, rel, text) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
};
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-standins-'));
const bad = join(TMP, 'bad');
const good = join(TMP, 'good');
try {
  // the film with stand-ins
  put(bad, 'src/acts/Logos.tsx', `import React from 'react';
export const SlackLogo: React.FC = () => (
  <svg viewBox="0 0 24 24"><path d="M5 15a2 2 0 1 1-2-2h2z" fill="#E01E5A" /></svg>
);
const logoGithub = () => <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" /></svg>;
export const TwitterLogo = () => <svg viewBox="0 0 24 24"><path d="M18 2h3l-7 8 8 12h-6z" /></svg>;
export const MARKS = {
  stripe: 'M13.9 9.8c0-1 .8-1.4 2.2-1.4 2 0 4.4.6 6.4 1.7V4.1z',
  notion: { w: 24 },
};
export const Labelled = () => <svg aria-label="Figma" viewBox="0 0 38 57"><path d="M19 28.5a9.5 9.5 0 1 1 19 0z" /></svg>;
`);
  put(bad, 'public/icons/discord.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#5865F2"/></svg>');
  put(bad, 'public/.keep', '');
  // the clean film: official files, generic glyphs, the film's own mark
  put(good, 'src/acts/Logos.tsx', `import React from 'react';
import { Img, staticFile } from 'remotion';
import { AppIcon, LogoChip } from '../kit/logos';
export const SlackLogo = () => <AppIcon logo="slack" />;
export const FigmaMark = () => <Img src={staticFile('logos/figma.svg')} />;
export const GithubBadge = () => <LogoChip logo="github" />;
export const CursorIcon = () => <svg viewBox="0 0 24 24"><path d="M3 2l7 19 2-8 8-2z" /></svg>;
export const XIcon = () => <svg viewBox="0 0 24 24"><path d="M4 4L20 20M20 4L4 20" /></svg>;
export const ZoomIcon = () => <svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" /></svg>;
export const BOXES = { box: 'M0 0h10v10H0z', linear: 'M0 0L10 10' };
`);
  put(good, 'src/brand/Logo.tsx', `export const Logo = () => <svg aria-label="Slack"><path d="M0 0h4v4z" /></svg>;`);
  put(good, 'public/logos/slack.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
  put(good, 'public/logos/logos.json', JSON.stringify({ about: 'test', logos: { slack: { name: 'Slack', owner: 'Slack Technologies, LLC', files: { mark: { path: 'logos/slack.svg', aspect: 1 } }, sources: { svgl: { licence: 'MIT' } } } } }));

  const rows = standIns(bad);
  const has = (re) => rows.some((r) => re.test(r.why) || re.test(r.file));
  result(has(/SlackLogo draws Slack/), 'a component named SlackLogo that draws SVG inline is a stand-in');
  result(has(/logoGithub draws GitHub/), 'logoGithub drawing a circle is a stand-in for GitHub');
  result(has(/TwitterLogo draws X/), 'a former name (TwitterLogo) is read as the brand (X)');
  result(has(/key "stripe"/) && !has(/key "notion"/), 'a map key named for a brand holding path data is a stand-in; one holding numbers is not');
  result(has(/labelled "Figma"/), 'an inline <svg aria-label="Figma"> is a stand-in');
  result(has(/discord\.svg/), 'an image named for a brand that the record does not list has no provenance');
  result(rows.every((r) => r.slug && r.line >= 0), 'every row names the brand slug for the fix', JSON.stringify(rows.map((r) => r.slug)));
  const clean = standIns(good);
  result(clean.length === 0, 'official files, a listed record file, generic glyphs (cursor, X, zoom, box) and the film\'s own mark pass',
    JSON.stringify(clean.map((r) => `${r.file}:${r.line} ${r.why}`)));
  const run = (film) => spawnSync(process.execPath, [LOGOS, 'check', film], { encoding: 'utf8' });
  const rb = run(bad);
  const rg = run(good);
  result(rb.status === 1 && /STAND-IN/.test(rb.stdout) && /logos\.mjs get slack/.test(rb.stdout), 'check <film> fails a stand-in and says how to get the official file', rb.stdout.split('\n').find((l) => /STAND-IN/.test(l)) || rb.stderr);
  result(!/STAND-IN/.test(rg.stdout), 'check <film> reports no stand-in on the clean film', rg.stdout.trim().split('\n').slice(-2).join(' | '));
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
