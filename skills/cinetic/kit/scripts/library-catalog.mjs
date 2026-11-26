// The motion library's catalogue (src/kit/library/catalog/<category>.ts) read from plain Node: each file's entries are
// plain data between `= [` and the closing `];`, so they are evaluated without a TypeScript step. Shared by frames.mjs
// (library, check) and library-docs.mjs.
import fs from 'node:fs';
import path from 'node:path';

/**
 * Each category: its folder (src/kit/library/<folder>), its catalogue file (catalog/<category>.ts), its section file
 * (references/<doc>) and its reel (src/films/library/<reel>.tsx, registered as <film>). The order is the catalogue's.
 */
export const CATEGORIES = {
  type: { folder: 'type', doc: 'library-type.md', film: 'library-type', reel: 'ReelType' },
  turn: { folder: 'turns', doc: 'library-turns.md', film: 'library-turns', reel: 'ReelTurns' },
  fx: { folder: 'fx', doc: 'library-fx.md', film: 'library-fx', reel: 'ReelFx' },
  camera: { folder: 'camera', doc: 'library-camera.md', film: 'library-camera', reel: 'ReelCamera' },
  ui: { folder: 'ui', doc: 'library-ui.md', film: 'library-ui', reel: 'ReelUi' },
  host: { folder: 'hosts', doc: 'library-hosts.md', film: 'library-hosts', reel: 'ReelHosts' },
  object: { folder: 'objects', doc: 'library-objects.md', film: 'library-objects', reel: 'ReelObjects' },
  ground: { folder: 'grounds', doc: 'library-grounds.md', film: 'library-grounds', reel: 'ReelGrounds' },
  design: { folder: 'designs', doc: 'library-designs.md', film: 'library-designs', reel: 'ReelDesigns' },
};

/** The catalogue folder of a kit or film project (its root folder), or null when it has none. */
export const catalogDir = (root = process.cwd()) => {
  const d = path.join(root, 'src', 'kit', 'library', 'catalog');
  return fs.existsSync(path.join(d, 'types.ts')) ? d : null;
};

/** The plain array of a catalogue file: from its `export const` line's `= [` to the last `];`. */
export const arrayOf = (src, file) => {
  const a = src.indexOf('= [', Math.max(0, src.search(/^export const /m)));
  const b = src.lastIndexOf('];');
  if (a < 0 || b < a) throw new Error(`${file}: no "export const NAME: ... = [ ... ];"`);
  try {
    return new Function(`"use strict"; return (${src.slice(a + 2, b + 1)});`)();
  } catch (e) {
    throw new Error(`${file}: the entries are not plain data (${e.message})`);
  }
};

/** The catalogue's entries in catalogue order (category by category); null when the project has no catalogue. */
export function loadLibrary(root = process.cwd()) {
  const dir = catalogDir(root);
  if (!dir) return null;
  const out = [];
  for (const category of Object.keys(CATEGORIES)) {
    const file = path.join(dir, `${category}.ts`);
    if (!fs.existsSync(file)) continue;
    out.push(...arrayOf(fs.readFileSync(file, 'utf8'), file));
  }
  return out;
}
