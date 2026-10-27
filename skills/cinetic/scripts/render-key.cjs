#!/usr/bin/env node
// render-key.cjs: the fingerprint render.sh keeps beside a bundle it built, so a rerun knows whether the source
// changed since (then it rebuilds the bundle and drops the parts rendered from the old one).
//   node scripts/render-key.cjs <dir with contents hashed> [<dir hashed by path and size only>]...
// The first folder (src/) is hashed by every file's path, size and bytes; the others (public/, which may hold
// large footage) by path and size. Prints one hex line. Exit 0, or 1 on a read error.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('usage: node scripts/render-key.cjs <src dir> [<public dir>...]  (prints the source fingerprint render.sh keeps beside its bundle)');
  process.exit(0);
}
const [deepDir, ...shallow] = args;
if (!deepDir) {
  console.error('usage: node render-key.cjs <src dir> [<public dir>...]');
  process.exit(1);
}
const h = crypto.createHash('sha1');
const walk = (dir, deep) => {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, deep);
    else {
      h.update(`${p.split(path.sep).join('/')}:${st.size}\n`);
      if (deep) h.update(fs.readFileSync(p));
    }
  }
};
try {
  walk(deepDir, true);
  for (const d of shallow) walk(d, false);
} catch (e) {
  console.error(`render-key: ${e.message}`);
  process.exit(1);
}
console.log(h.digest('hex'));
