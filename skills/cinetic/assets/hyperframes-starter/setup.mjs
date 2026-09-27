#!/usr/bin/env node
/**
 * setup.mjs: copy the runtime files a HyperFrames render needs into the project, so renders
 * never fetch anything from the network (hosted scripts and fonts fail on offline workers).
 *
 * Runs automatically after `npm install` (postinstall). Safe to re-run.
 *   node setup.mjs            copy vendor/gsap.min.js and the fonts listed in FONTS
 * Exit 0 on success, 1 when a source file is missing (run `npm install` first).
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const COPIES = [
  ['node_modules/gsap/dist/gsap.min.js', 'vendor/gsap.min.js'],
  // One line per face; the file names must match the @font-face url() in index.html.
  ['node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'fonts/geist-latin-wght-normal.woff2'],
];

let missing = 0;
for (const [from, to] of COPIES) {
  const src = join(here, from);
  const dst = join(here, to);
  if (!existsSync(src)) {
    console.error(`setup: missing ${from} (add the package to devDependencies and run npm install)`);
    missing++;
    continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  console.log(`setup: ${to}`);
}
process.exit(missing ? 1 : 0);
