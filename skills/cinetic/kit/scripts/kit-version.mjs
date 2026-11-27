// kit-version.mjs: which kit a film project was made from. new-film.mjs stamps the skill's kit version into the project
// (cinetic-kit.json: a hash of src/kit, src/Sheet.tsx and the scripts, the newest change date and the skill's kit path);
// `frames.mjs check` compares it with the skill's kit when that path still exists and warns when the skill is newer.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const STAMP = 'cinetic-kit.json';

const files = (root) => {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const e of fs.readdirSync(abs).sort()) walk(path.join(rel, e));
    } else out.push(rel);
  };
  walk(path.join('src', 'kit'));
  walk(path.join('src', 'Sheet.tsx'));
  if (fs.existsSync(path.join(root, 'scripts')))
    for (const e of fs.readdirSync(path.join(root, 'scripts')).sort())
      if (/\.(mjs|json)$/.test(e) && !['new-film.mjs', 'library-docs.mjs'].includes(e)) out.push(path.join('scripts', e));
  return out;
};

/** The kit version of a folder (the skill's kit or a project): a short hash of its kit files and their newest date. */
export function kitVersion(root) {
  const h = crypto.createHash('sha256');
  let newest = 0;
  for (const rel of files(root)) {
    const abs = path.join(root, rel);
    h.update(rel.split(path.sep).join('/'));
    h.update(fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n'));
    newest = Math.max(newest, fs.statSync(abs).mtimeMs);
  }
  return { version: h.digest('hex').slice(0, 12), date: new Date(newest || Date.now()).toISOString().slice(0, 10) };
}

/** Writes the stamp into a new project. */
export function stampKit(kitRoot, project) {
  const v = kitVersion(kitRoot);
  fs.writeFileSync(path.join(project, STAMP), JSON.stringify({ ...v, kit: kitRoot }, null, 2) + '\n');
  return v;
}

/**
 * The warning line for `check`, or null: only when the project carries a stamp, the skill's kit is still at its path,
 * and the skill's kit has changed since and is newer. Never throws.
 */
export function staleKitWarning(project = '.') {
  try {
    const p = path.join(project, STAMP);
    if (!fs.existsSync(p)) return null;
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!s.kit || !fs.existsSync(path.join(s.kit, 'src', 'kit'))) return null;
    const now = kitVersion(s.kit);
    if (now.version === s.version || now.date < s.date) return null;
    return `the kit in this project (${s.version}, ${s.date}) is older than the skill's (${now.version}, ${now.date} at ${s.kit}): the skill's pieces and tools have changed since; to take them, copy its src/kit, src/Sheet.tsx and scripts over this project's (your film in src/films stays), or scaffold a new project`;
  } catch {
    return null;
  }
}
