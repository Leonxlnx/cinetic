#!/usr/bin/env node
/**
 * input.mjs: the input shot, fetched from the brief's words (the first step after the scaffold).
 *
 * The first picture of a launch shows the product's core action literally, with a real person giving the input where
 * the input is human: real footage, never a drawing. This reads launch.ts `input` (the core action in the brief's
 * words: "a person speaking into a phone", "a cook reading a recipe", "a hiker on a trail"), finds the closest
 * footage recipe (scripts/assets.mjs recipe: inputs already looked at on a contact sheet, licences that need no
 * credit; with none for these words, assets.mjs search in the same words, people in shot), downloads its first fitting clip (a clip the cut leaves for the product's own screen first, then one with
 * a screen in shot) trimmed to `--seconds` into public/assets/input.mp4 with its licence record (assets/licences.json),
 * probes it and writes src/input.ts, which the first scene reads. With no recipe or no clip that fits, src/input.ts
 * says status 'none' and why, and the first scene plays its code-built fallback (the device alone).
 * An input that happens on a screen (typing code, a pull request, a click in an app, a query) is not filmed: footage of
 * a person at a desk shows the back of a head and a blur of someone else's screen, nothing of the product, so the
 * product's own screen taking the input is the first picture (a typed field, a cursor, the pull request): status 'none'
 * with that reason, unless --force. A clip whose pixels carry an off-palette colour (orange, amber, salmon, purple:
 * the house bans) over 2 % of the frame warns with its share, so it is picked again before it reaches the film.
 *
 *   node tools/input.mjs ["<the input in your words>"] [--pick N] [--start S] [--seconds 3] [--none "<why>"] [--dry-run]
 *     words      default: launch.ts `input`
 *     --pick N   the recipe's item #N instead of the first fitting clip (after a look: assets.mjs sheet out/assets/input-recipe.json)
 *     --start S  the source second the shot starts at (default 1, or 0 for a clip under 5 s)
 *     --seconds  how long a piece to keep (default 3)
 *     --none     no footage fits this product (say why): writes status 'none', the fallback plays
 *     --force    fetch footage for an input that happens on a screen all the same
 *     --dry-run  print the pick, download nothing
 * Exit codes: 0 written (fetched or none), 1 a step failed (src/input.ts unchanged), 2 bad arguments.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** The share (%) of rgb24 pixels in the house colour bans: orange, amber and salmon (hue 8-50 deg) and purple (270-320),
 * saturated (0.35+) and lit (0.3+). */
const offPalette = (b) => {
  let banned = 0;
  let n = 0;
  for (let i = 0; i + 2 < b.length; i += 3) {
    const r = b[i] / 255, g = b[i + 1] / 255, bl = b[i + 2] / 255;
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
    n++;
    if (mx < 0.3 || d / (mx || 1) < 0.35) continue;
    const hue = ((mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
    if ((hue >= 8 && hue <= 50) || (hue >= 270 && hue <= 320)) banned++;
  }
  return n ? (100 * banned) / n : 0;
};

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
  const src = fs.readFileSync(new URL(import.meta.url), 'utf8');
  console.log(src.slice(src.indexOf('/**') + 3, src.indexOf('*/')).replace(/^ \* ?/gm, '').trim());
  process.exit(0);
}
const opt = (k, d = null) => {
  const i = argv.indexOf(k);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const VALUED = new Set(['--pick', '--start', '--seconds', '--none']);
const words0 = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1])).join(' ').trim();
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src', 'input.ts');
const die = (m, code = 1) => {
  console.error(`input: ${m}`);
  process.exit(code);
};
if (!fs.existsSync(path.join(ROOT, 'src', 'launch.ts')) || !fs.existsSync(path.join(ROOT, 'scripts', 'assets.mjs'))) die('run it from the film project (src/launch.ts and scripts/assets.mjs)', 2);

// launch.ts `input`: read as text (the file imports TypeScript), the first `input: '...'` or "..." outside a comment
const launchSrc = fs.readFileSync(path.join(ROOT, 'src', 'launch.ts'), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const m = launchSrc.match(/\binput\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/);
const words = words0 || (m ? m[2] : '');
if (!words || /^\[.*\]$/.test(words.trim())) die('say the core action: launch.ts input: "<a person doing the input, in the brief\'s words>" (or pass it here)', 2);

const write = (shot) => {
  const body = `// The input shot: the core action as real footage, the first scene's opening (src/product.tsx INPUT reads it).
// Written by \`node tools/input.mjs\` from launch.ts \`input\`; run it again to fetch another clip (--pick N after a look at
// the recipe's sheet), or --none "<why>" when no footage fits. Keep this file free of React and CSS imports.
export type InputShot = {
  status: 'unfetched' | 'fetched' | 'none';
  clip: string; // public/ path
  w: number;
  h: number;
  fps: number;
  from: number; // the source second it starts at
  words?: string; // the input as launch.ts says it
  recipe?: string; // the footage recipe it matched
  source?: string; // the clip's ref (its licence record: assets/licences.json)
  reason?: string; // status 'none': why no clip fits
};

export const INPUT_SHOT: InputShot = ${JSON.stringify(shot)};
`;
  fs.writeFileSync(OUT, body);
  console.log(`input: src/input.ts ${shot.status}${shot.status === 'fetched' ? ` (${shot.source}, ${shot.w}x${shot.h} @ ${shot.fps} fps, from the ${shot.recipe} recipe)` : ` (${shot.reason})`}`);
};

// an input that happens on a screen: the product's own screen is the shot, never a stock clip of someone at a desk
const SCREEN = /\b(typ(e|es|ed|ing)|keyboard|laptop|desk|computer|screen|monitor|developers?|coders?|coding|code|programmers?|click(s|ed|ing)?|pull requests?|commits?|terminal|browser|spreadsheets?|dashboards?|inbox|email|query|queries|prompt)\b/i;
const BODY = /\b(speak|speaks|speaking|talk|talks|talking|says|saying|walk|walks|walking|run|runs|running|hik(e|es|ing)|cook|cooks|cooking|pay|pays|paying|photograph\w*|shoot\w*|film(s|ing)?|draw(s|ing)?|paint\w*|sing\w*|ride|rides|riding|shop\w*|scan(s|ning)?|hold(s|ing)?|record(s|ing)?)\b/i;
const screenOnly = SCREEN.test(words) && !BODY.test(words);
const none = opt('--none');
if (none === null && screenOnly && !argv.includes('--force')) {
  write({ status: 'none', clip: 'assets/input.mp4', w: 1920, h: 1080, fps: 30, from: 0, words, reason: `"${words}" happens on a screen: the first scene shows the product's own screen taking it (a typed field, a cursor, the pull request), never a stock clip of a person at a desk (the back of a head, someone else's screen); --force fetches footage all the same` });
  process.exit(0);
}
if (none !== null) {
  write({ status: 'none', clip: 'assets/input.mp4', w: 1920, h: 1080, fps: 30, from: 0, words, reason: none || 'no footage fits this product' });
  process.exit(0);
}

const node = (args, quiet = false) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'assets.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', stdio: quiet ? 'pipe' : ['ignore', 'pipe', 'pipe'] });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`, status: r.status };
};
// the footage recipe first (inputs already looked at on a contact sheet); with none for these words (or no recipes in
// this project), a search of the free footage sources in the same words, people in shot, landscape
let results = path.join('out', 'assets', 'input-recipe.json');
console.log(`input: the footage recipe for "${words}"`);
const rec = node(['recipe', words, '--kind', 'video', '--out', results]);
let res = rec.ok && fs.existsSync(path.join(ROOT, results)) ? JSON.parse(fs.readFileSync(path.join(ROOT, results), 'utf8')) : null;
if (!res || !(res.items || []).some((it) => it.kind === 'video')) {
  const STOP = new Set(['a', 'an', 'the', 'at', 'on', 'in', 'into', 'of', 'to', 'with', 'and', 'for', 'his', 'her', 'their', 'someone', 'person', 'people']);
  const content = words.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
  const queries = [...new Set([content.join(' '), content.slice(0, 2).join(' '), content[0]].filter(Boolean))];
  results = path.join('out', 'assets', 'input-search.json');
  for (const q of queries) {
    console.log(`input: no recipe clip; searching the free footage sources for "${q}"`);
    const se = node(['search', q, '--kind', 'video', '--people', '--orientation', 'landscape', '--limit', '6', '--out', results]);
    res = se.ok && fs.existsSync(path.join(ROOT, results)) ? JSON.parse(fs.readFileSync(path.join(ROOT, results), 'utf8')) : null;
    if (res && (res.items || []).some((it) => it.kind === 'video')) {
      res.recipe = `search "${q}"`;
      break;
    }
  }
}
if (!res || !(res.items || []).some((it) => it.kind === 'video')) {
  // nothing found: the fallback plays, and the reason says what to search by hand
  write({ status: 'none', clip: 'assets/input.mp4', w: 1920, h: 1080, fps: 30, from: 0, words, reason: `no footage found for "${words}": search by hand (assets.mjs search "<person doing it>" --kind video --people), or keep the fallback` });
  process.exit(0);
}
const items = (res.items || []).filter((it) => it.kind === 'video');
const want = Number(opt('--pick', 0));
// the first clip that leaves the product's screen to the cut (screen 'cut'), then any clip, landscape and full HD first
const fits = (it) => (it.width ?? 1920) >= 1280 && (it.width ?? 16) >= (it.height ?? 9);
const pick = want ? (res.items || []).find((it) => it.n === want) : items.find((it) => it.screen === 'cut' && fits(it)) ?? items.find(fits);
const from = res.recipe?.startsWith('search') ? res.recipe : `the ${res.recipe} recipe`;
if (!pick) {
  write({ status: 'none', clip: 'assets/input.mp4', w: 1920, h: 1080, fps: 30, from: 0, words, recipe: res.recipe, reason: `${from} has no landscape clip: search by hand or keep the fallback` });
  process.exit(0);
}
const secs = Number(opt('--seconds', 3));
const dur = Number(pick.duration ?? 8);
const start = Number(opt('--start', dur >= secs + 2 ? 1 : 0));
console.log(`input: #${pick.n} ${pick.ref} · ${pick.title || ''} · ${pick.shows || ''}`);
if (argv.includes('--dry-run')) process.exit(0);
// the clip always lands as public/assets/input.mp4, the file src/input.ts names: a clip already there steps aside first
// (a download beside it would land as input-2.mp4 while the film went on playing the old one), and comes back when the
// new one fails
const file = path.join(ROOT, 'public', 'assets', 'input.mp4');
const prev = path.join(ROOT, 'public', 'assets', 'input.prev.mp4');
if (fs.existsSync(file)) fs.renameSync(file, prev);
const got = node(['get', `#${pick.n}`, '--from', results, '--to', path.join('public', 'assets'), '--name', 'input', '--trim', `${start},${secs}`, '--res', '1080']);
if (!got.ok || !fs.existsSync(file)) {
  if (fs.existsSync(prev) && !fs.existsSync(file)) fs.renameSync(prev, file);
  console.error(got.out.split('\n').slice(-8).join('\n'));
  die(`could not download ${pick.ref} (src/input.ts unchanged): try --pick <n>, or --none "<why>"`);
}
if (fs.existsSync(prev)) fs.unlinkSync(prev);
// the house colour bans in the clip's pixels (two frames a second at 160 px): orange, amber and salmon (hue 8-50 deg)
// and purple (270-320 deg), saturated and lit; over 2 % of the frame it warns with the share
const px = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'fps=2,scale=160:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 });
if (px.status === 0 && px.stdout?.length) {
  const share = offPalette(px.stdout);
  if (share > 2) console.warn(`input: warn: ${share.toFixed(1)} % of the clip's pixels are an off-palette colour (orange, amber, salmon or purple): pick another (--pick <n> after assets.mjs sheet ${results}) or crop and grade it so none shows`);
}
// its size and rate (the trimmed piece starts at its own second 0)
const pr = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' });
let w = 1920;
let h = 1080;
let fps = 30;
try {
  const s = JSON.parse(pr.stdout).streams[0];
  const [a, b] = String(s.r_frame_rate).split('/').map(Number);
  [w, h, fps] = [s.width, s.height, Math.round((a / (b || 1)) * 1000) / 1000];
} catch {
  console.warn('input: ffprobe could not read the clip; the size and rate are the house 1920x1080 @ 30');
}
write({ status: 'fetched', clip: 'assets/input.mp4', w, h, fps, from: 0, words, recipe: res.recipe, source: pick.ref });
