/**
 * type-deal.ts: deal a Remotion film's type pairing (fx/TypePairs) and write it into src/brand/tokens.ts.
 *
 * A pairing is a voice (the film's words: FONT.text) and a text face (product UI, captions: FONT.ui) from the faces
 * bundled in public/fonts (SIL OFL 1.1, nothing fetched), each with its weights per role, optical tracking per size
 * and line height. This script picks one at random from the film's seed (the product's name: the same name, the same
 * pairing), weighted by --mood and leaving out the pairings of the last films in the history, then writes:
 *   FONT.text, FONT.ui, FONT.mono   the pairing's stacks
 *   TYPE (ui caption line display hero giant)   the type family's sizes (src/lib/look.ts TYPE_LOOK, TYPE_FAMILY), the
 *                                   pairing's weights, its tracking at each role's size, the family's leads x leadK
 *   FACES                           every weight the roles use, per face, and the mono, for the FontGate
 *   a `// type pair: <id>` line above FONT; the placeholder lines in tokens.ts and fonts.ts go
 *   film.json devices.type          when the project has a film.json with devices (film-diff's history reads it)
 * Run it again after type-family.mjs (which rewrites TYPE to Inter's numbers) or to change the pairing.
 *
 * Usage (from the project root; the project's own src/fx/TypePairs.ts is the table):
 *   npx tsx scripts/type-deal.ts --seed "<product name>" [--mood calm|technical|friendly|editorial|bold|consumer|finance|creative|ai]
 *                                [--avoid swiss,wide] [--no-history] [--dir <film>] [--dry-run] [--quiet]
 *   npx tsx scripts/type-deal.ts --pair <id> [--dir <film>]     set a named pairing (the director's pick)
 *   npx tsx scripts/type-deal.ts --list                         the pairings with their faces and moods
 *   npx tsx scripts/type-deal.ts --check [--dir <film>]         exit 1 when the tokens are not a pairing's numbers
 * Exit codes: 0 written / listed / in step, 1 a file is missing or out of step, 2 bad arguments.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type TP = typeof import('../assets/remotion-starter/src/fx/TypePairs');

const argv = process.argv.slice(2);
const val = (k: string) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const flag = (k: string) => argv.includes(k);
if (flag('--help') || flag('-h')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}
const ROOT = resolve(val('--dir') ?? '.');
const fail = (m: string, code = 1): never => {
  console.error(`type-deal: ${m}`);
  process.exit(code);
};
const TOKENS = join(ROOT, 'src', 'brand', 'tokens.ts');
const FONTS = join(ROOT, 'src', 'brand', 'fonts.ts');
const LOOK = join(ROOT, 'src', 'lib', 'look.ts');
// the project's table; in the skill itself, the starter's
const tableAt = [join(ROOT, 'src', 'fx', 'TypePairs.ts'), new URL('../assets/remotion-starter/src/fx/TypePairs.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')].find((p) => existsSync(p));
if (!tableAt) fail('src/fx/TypePairs.ts not found (pass --dir <film>)');

const ROLES = ['ui', 'caption', 'line', 'display', 'hero', 'giant'] as const;
const NUM = '(-?\\d+(?:\\.\\d+)?)';
const roleRe = (name: string) => new RegExp(`^(\\s*)${name}: \\{ size: ${NUM}, weight: ${NUM}, track: ${NUM}, lead: ${NUM} \\},?(.*)$`);
const readText = (p: string) => {
  const s = readFileSync(p, 'utf8');
  return { text: s.replace(/\r\n/g, '\n'), eol: s.includes('\r\n') ? '\r\n' : '\n' };
};
const writeText = (p: string, text: string, eol: string) => writeFileSync(p, eol === '\n' ? text : text.replace(/\n/g, eol));

const main = async () => {
  const T: TP = await import(pathToFileURL(tableAt!).href);
  if (flag('--list')) {
    for (const id of T.PAIR_IDS) {
      const p = T.PAIRS[id];
      console.log(`${id.padEnd(11)} voice ${T.FACE_SET[p.voice].family.replace(' Variable', '').padEnd(22)} text ${T.FACE_SET[p.text].family.replace(' Variable', '').padEnd(16)} moods ${p.moods.join(', ')}\n            ${p.about}`);
    }
    return;
  }
  for (const f of [TOKENS, LOOK]) if (!existsSync(f)) fail(`${f} not found (pass --dir <film>)`);
  const { text: tk0, eol } = readText(TOKENS);
  const fam = (/^export const TYPE_FAMILY(?:: TypeFamily)? = '(calm|bold)';/m.exec(tk0)?.[1] ?? 'calm') as 'calm' | 'bold';
  // the family's sizes and leads from TYPE_LOOK
  const look = readFileSync(LOOK, 'utf8').replace(/\r\n/g, '\n');
  const lstart = look.indexOf('export const TYPE_LOOK');
  if (lstart < 0) fail(`${LOOK} has no TYPE_LOOK`);
  const llines = look.slice(lstart).split('\n');
  const at = llines.findIndex((l) => new RegExp(`^\\s*${fam}: \\{\\s*$`).test(l));
  const base: Record<string, { size: number; weight: number; track: number; lead: number }> = {};
  for (const l of llines.slice(at + 1)) {
    if (/^\s*\},?\s*$/.test(l)) break;
    for (const r of ROLES) {
      const m = l.match(roleRe(r));
      if (m) base[r] = { size: +m[2], weight: +m[3], track: +m[4], lead: +m[5] };
    }
  }
  if (ROLES.some((r) => !base[r])) fail(`TYPE_LOOK.${fam} lacks a role`);

  // which pairing
  const current = /^\/\/ type pair: ([a-z]+)/m.exec(tk0)?.[1];
  let id = val('--pair') as string | undefined;
  if (flag('--check')) id = current;
  if (id && !(T.PAIR_IDS as string[]).includes(id)) fail(`no pairing "${id}" (npx tsx scripts/type-deal.ts --list)`, 2);
  let avoid: string[] = (val('--avoid') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!id) {
    const seed = val('--seed');
    if (!seed) fail('give --seed "<product name>" or --pair <id>', 2);
    if (!flag('--no-history')) {
      const hist = process.env.CINETIC_FILM_HISTORY || join(homedir(), '.cinetic', 'film-history.json');
      try {
        const h = JSON.parse(readFileSync(hist, 'utf8')) as { dir?: string; devices?: { type?: string } }[];
        avoid = [...avoid, ...h.filter((x) => resolve(x.dir ?? '') !== ROOT).slice(0, 2).map((x) => x.devices?.type).filter((x): x is string => !!x)];
      } catch {
        /* no history: a first film */
      }
    }
    id = T.dealPair(seed!, { mood: val('--mood') as never, avoid: avoid as never });
  }
  const pair = T.PAIRS[id as keyof TP['PAIRS']];

  // the six roles at the family's sizes
  const set = Object.fromEntries(
    ROLES.map((r) => {
      const s = T.roleSetting(pair.id, r, base[r].size, fam);
      const lead = T.isVoiceRole(r) ? Math.round(base[r].lead * (pair.leadK ?? 1) * 100) / 100 : base[r].lead;
      return [r, { size: base[r].size, weight: s.weight, track: s.track, lead }];
    }),
  ) as Record<(typeof ROLES)[number], { size: number; weight: number; track: number; lead: number }>;
  const voiceFam = T.FACE_SET[pair.voice].family;
  const textFam = T.FACE_SET[pair.text].family;
  const monoFam = T.FACE_SET[pair.mono].family;
  const wv = [...new Set(['line', 'display', 'hero', 'giant'].map((r) => set[r as 'line'].weight).concat([pair.wordmark, pair.emphasis]))].sort((a, b) => a - b);
  const wt = [...new Set([set.ui.weight, set.caption.weight, 600])].sort((a, b) => a - b); // 600: the kit's titles and chips
  const faces = voiceFam === textFam
    ? [...new Set([...wv, ...wt])].sort((a, b) => a - b).map((w) => `${w} 16px "${voiceFam}"`)
    : [...wv.map((w) => `${w} 16px "${voiceFam}"`), ...wt.map((w) => `${w} 16px "${textFam}"`)];
  faces.push(`400 16px "${monoFam}"`);

  let tk = tk0;
  const drift: string[] = [];
  // TYPE roles
  const tStart = tk.indexOf('export const TYPE = {');
  if (tStart < 0) fail(`${TOKENS} has no "export const TYPE = {" block`);
  const tEnd = tk.indexOf('\n};', tStart);
  const block = tk.slice(tStart, tEnd);
  const next = block
    .split('\n')
    .map((l) => {
      for (const r of ROLES) {
        const m = l.match(roleRe(r));
        if (!m) continue;
        const v = set[r];
        if (+m[2] === v.size && +m[3] === v.weight && +m[4] === v.track && +m[5] === v.lead) return l;
        drift.push(r);
        return `${m[1]}${r}: { size: ${v.size}, weight: ${v.weight}, track: ${v.track}, lead: ${v.lead} },${m[6] ?? ''}`;
      }
      return l;
    })
    .join('\n');
  tk = tk.slice(0, tStart) + next + tk.slice(tEnd);
  // FONT
  const fontObj = /^export const FONT\s*=\s*\{[\s\S]*?\n\};?/m.exec(tk);
  if (!fontObj) fail(`${TOKENS} has no FONT object`);
  const setKey = (obj: string, key: string, stack: string, note: string) => {
    const re = new RegExp(`^(\\s*${key}:\\s*)'[^']*'`, 'm');
    if (re.test(obj)) {
      if (!obj.match(re)![0].includes(stack)) drift.push(`FONT.${key}`);
      return obj.replace(re, (_a, head) => `${head}'${stack}'`);
    }
    drift.push(`FONT.${key}`);
    return obj.replace(/\n\};?$/, `\n  ${key}: '${stack}', // ${note}\n};`);
  };
  let fo = fontObj![0];
  fo = setKey(fo, 'text', T.stackOf(pair.voice), 'the film\'s voice');
  fo = setKey(fo, 'ui', T.stackOf(pair.text), 'the text face: kit UI, captions');
  fo = setKey(fo, 'mono', T.stackOf(pair.mono), 'code, logs, aligned data');
  tk = tk.replace(fontObj![0], () => fo);
  // FACES
  const fm = /^export const FACES\s*=\s*\[([^\]]*)\];/m.exec(tk);
  if (!fm) fail(`${TOKENS} has no FACES line`);
  const facesNow = [...fm![1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  if (facesNow.join('|') !== faces.join('|')) drift.push('FACES');
  tk = tk.replace(fm![0], `export const FACES = [${faces.map((f) => `'${f}'`).join(', ')}];`);
  // the pair line and the placeholder
  const pairLine = `// type pair: ${pair.id} (${pair.name}): voice ${voiceFam}, text ${textFam}, mono ${monoFam}; scripts/type-deal.ts`;
  if (current !== pair.id) drift.push('pair');
  tk = tk.replace(/^\/\/ type pair: [^\n]*\n/m, '');
  tk = tk.replace(/^\/\/ cinetic:placeholder - the family is[^\n]*\n(?:\/\/(?! cinetic:)[^\n]*\n)*/m, '');
  const doc = tk.indexOf("/**\n * FONT.text is the film's voice");
  tk = doc >= 0 ? `${tk.slice(0, doc)}${pairLine}\n${tk.slice(doc)}` : tk.replace(/^export const FONT\s*=/m, `${pairLine}\nexport const FONT =`);

  if (flag('--check')) {
    const ok = !!current && drift.filter((d) => d !== 'pair').length === 0;
    if (!flag('--quiet')) console.log(`type-deal: ${ok ? `the tokens hold the ${current} pairing (${fam})` : current ? `out of step with ${current}: ${drift.join(', ')}` : 'no pairing dealt (no "// type pair:" line in tokens.ts)'}`);
    process.exit(ok ? 0 : 1);
  }
  const dry = flag('--dry-run');
  if (!dry) writeText(TOKENS, tk, eol);
  if (!dry && existsSync(FONTS)) {
    const { text: ft0, eol: fe } = readText(FONTS);
    const ft = ft0.replace(/^(?:\/\/\n)?\/\/ cinetic:placeholder[^\n]*\n(?:\/\/(?! cinetic:)[^\n]*\n)*/m, (blk) => blk.split('\n').filter((l) => /^\/\/ opsz\.css/.test(l)).map((l) => `${l}\n`).join(''));
    if (ft !== ft0) writeText(FONTS, ft, fe);
  }
  const fj = join(ROOT, 'film.json');
  if (!dry && existsSync(fj)) {
    try {
      const film = JSON.parse(readFileSync(fj, 'utf8'));
      if (film && typeof film.devices === 'object' && film.devices) {
        film.devices.type = pair.id;
        writeFileSync(fj, JSON.stringify(film, null, 2) + '\n');
      }
    } catch {
      /* film.json not JSON: leave it */
    }
  }
  if (!flag('--quiet')) {
    console.log(`type-deal: ${pair.id} (${pair.name}, ${fam}) -> src/brand/tokens.ts${dry ? ' (dry run)' : ''}${avoid.length ? `; left out ${[...new Set(avoid)].join(', ')}` : ''}`);
    console.log(`  voice ${voiceFam}: line ${set.line.size}/${set.line.weight} ${set.line.track} em, display ${set.display.size}/${set.display.weight} ${set.display.track} em, hero ${set.hero.weight}, giant ${set.giant.weight} ${set.giant.track} em; wordmark ${pair.wordmark}, emphasis ${pair.emphasis}`);
    console.log(`  text  ${textFam}: ui ${set.ui.size}/${set.ui.weight} ${set.ui.track} em, caption ${set.caption.size}/${set.caption.weight}`);
    console.log('  set the wordmark with wordmarkStyle(), figures with numeralStyle(), and any tight display word through safeTrack() (fx/TypePairs)');
  }
};
main().catch((e) => fail(String(e?.stack ?? e)));
