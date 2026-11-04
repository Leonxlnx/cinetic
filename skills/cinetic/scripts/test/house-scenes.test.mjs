#!/usr/bin/env node
/**
 * house-scenes.test.mjs: the house scenes porthole-line, mark-pullback, held-product-word, word-build-badge,
 * line-to-wordmark, blobs-to-mark, photo-counters and photo-river (src/scenes) against their contract.
 *
 *   1. meta: id = the file's name, listed in SCENES; 1.5-3 s at 30 fps (45-90 frames); props named; the forms it takes
 *      over and hands on are the spine's forms with boxes on a 1920 x 1080 frame; big or quiet; sound cues in order,
 *      inside the scene, of the effects plan's kinds.
 *   2. lengths: the duration helpers give the meta's length for the default content and grow with the content.
 *   3. palette: paletteOf fills every role from the tokens and keeps what is given; ramp, decay, span, stepped, tab and
 *      perFrame are exact on their ends.
 *   4. measured numbers: the porthole's circle only grows after the drain; the mark's spin ends upright at its rest size;
 *      the blobs end as one dot; the counters' steps land on their last value; the river's pump accelerates, its row's
 *      front cards cut in faster, its far row recedes between the left word and the last card; with no logo the
 *      placeholder mark takes the palette's accent (never the starter's own).
 *   5. subject: every scene shows its subject by frame 6 (never an empty card, page or field at its start): the counters'
 *      first card, the river's first picture and the wordmark's first word are on by then.
 *
 * mark-pullback draws fx/three's Logo3D: when the starter's three.js packages are not installed its checks are skipped
 * (and said so), the rest still run.
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/house-scenes.test.mjs [--verbose]
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
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/house-scenes.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const has3D = existsSync(join(STARTER, 'node_modules', 'three', 'package.json'));
const url = (p) => pathToFileURL(join(SRC, p)).href;
const FILES = ['porthole-line', 'held-product-word', 'word-build-badge', 'line-to-wordmark', 'blobs-to-mark', 'photo-counters', 'photo-river', ...(has3D ? ['mark-pullback'] : [])];
const PROBE = `
import { FORMS } from '${url('lib/spine.ts')}';
import * as Pt from '${url('scenes/parts.ts')}';
${FILES.map((f, i) => `import * as M${i} from '${url(`scenes/${f}.tsx`)}';`).join('\n')}
${has3D ? `import { SCENES } from '${url('scenes/index.ts')}';` : 'const SCENES: Record<string, unknown> | null = null;'}
const mods: Record<string, any> = { ${FILES.map((f, i) => `'${f}': M${i}`).join(', ')} };
const metas: Record<string, any> = {};
for (const [f, m] of Object.entries(mods)) metas[f] = Object.entries(m).find(([k]) => k.endsWith('Meta'))?.[1] ?? null;
const W = M2 as any, L = M3 as any, R = M6 as any, B = M4 as any, C = M5 as any, PL = M0 as any;
console.log(JSON.stringify({
  FORMS,
  metas,
  listed: SCENES ? Object.keys(SCENES) : null,
  durs: {
    badge: [W.wordBuildBadgeDur('Still wondering why'), W.wordBuildBadgeDur('Still booking it all by hand?'), W.wordBuildBadgeDur()],
    mark: [L.lineToWordmarkDur('What if your team', '2.0'), L.lineToWordmarkDur('What if your whole team knew', '2.0'), L.lineToWordmarkDur('What if your team')],
    river: R.photoRiverDur(),
  },
  pal: [Pt.paletteOf(), Pt.paletteOf({ accent: '#2F6BEA', ground: '#000000' })],
  helpers: {
    ramp: [Pt.ramp(['#000000', '#ffffff'], 0), Pt.ramp(['#000000', '#ffffff'], 1), Pt.ramp(['#000000', '#808080', '#ffffff'], 0.5)],
    decay: [Pt.decay(0, 5, 3), Pt.decay(5, 5, 3), Pt.decay(8, 5, 3)],
    span: [Pt.span(-1, 0, 10), Pt.span(5, 0, 10), Pt.span(11, 0, 10)],
    stepped: [Pt.stepped(5.9, 2), Pt.stepped(6, 2)],
    tab: [Pt.tab(-3, [[0, 1], [10, 3]]), Pt.tab(5, [[0, 1], [10, 3]]), Pt.tab(30, [[0, 1], [10, 3]])],
    perFrame: Pt.perFrame(4, [7, 8, 9]),
  },
  porthole: PL.PORTHOLE,
  blobs: B.BLOBS,
  counters: C.COUNTERS,
  layout: [1, 2, 3].map((n) => C.cardLayout(n)).concat([C.cardLayout(1, 'left'), C.cardLayout(1, 'right')]),
  river: R.RIVER,
  subject: { cards: [1, 2, 3].map((n) => C.cardLayout(n)[0].enter), line: L.LINE_MARK.first },
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-scenes-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
if (!has3D) console.log('skip  mark-pullback: three.js is not installed in the starter (npm install), its checks did not run');

// 1. meta
const KINDS = ['tick', 'tock', 'hit', 'land', 'pop', 'whoosh', 'riser', 'drop', 'key', 'click', 'snap', 'swell', 'bell', 'suck', 'text'];
const boxOk = (b) => b && P.FORMS.includes(b.form) && [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0 && b.x + b.w > 0 && b.x < 1920 && b.y + b.h > 0 && b.y < 1080;
for (const [file, m] of Object.entries(P.metas)) {
  result(!!m && m.id === file, `${file}: exports its meta entry, id = the file's name`, m?.id);
  if (!m) continue;
  result(m.dur >= 45 && m.dur <= 90, `${file}: ${m.dur} f at 30 fps (${(m.dur / 30).toFixed(2)} s) is 1.5-3 s`);
  result(Array.isArray(m.props) && m.props.length > 0 && m.props.every((p) => typeof p === 'string' && p.length > 0), `${file}: names the content it takes (${m.props.join(', ')})`);
  result((m.handIn === null || boxOk(m.handIn)) && boxOk(m.handOut), `${file}: hands ${m.handIn ? m.handIn.form : 'nothing'} in, ${m.handOut?.form} out, as spine forms on the frame`);
  result(m.klass === 'big' || m.klass === 'quiet', `${file}: is ${m.klass}`);
  const cues = m.cues ?? [];
  result(cues.length > 0 && cues.every((c, i) => KINDS.includes(c.kind) && c.f >= 0 && c.f < m.dur && c.weight > 0 && c.weight <= 1 && (i === 0 || c.f >= cues[i - 1].f)), `${file}: ${cues.length} sound cues inside the scene, of the plan's kinds`, JSON.stringify(cues.map((c) => [c.f, c.kind])));
  if (P.listed) result(P.listed.includes(file), `${file}: listed in SCENES`);
}
// 2. lengths
const [b0, b1, b2] = P.durs.badge;
result(b0 === P.metas['word-build-badge'].dur && b1 > b0 && b2 === 45, 'word-build-badge: its length grows with the line, the lockup alone is 45 f', `${b0} ${b1} ${b2}`);
const [l0, l1, l2] = P.durs.mark;
result(l0 === P.metas['line-to-wordmark'].dur && l1 > l0 && l2 < l0, 'line-to-wordmark: its length grows with the line and the tag', `${l0} ${l1} ${l2}`);
result(P.durs.river === P.metas['photo-river'].dur, 'photo-river: its length is the pump, the river and the flank', P.durs.river);
// 3. palette and helpers
const [d, g] = P.pal;
result(['ground', 'ink', 'accent', 'lift', 'paper'].every((k) => typeof d[k] === 'string' && d[k].startsWith('#')) && g.accent === '#2F6BEA' && g.ground === '#000000' && g.ink === d.ink, 'paletteOf: every role from the tokens, the given ones kept');
const H = P.helpers;
result(H.ramp[0] === 'rgb(0, 0, 0)' && H.ramp[1] === 'rgb(255, 255, 255)' && H.ramp[2] === 'rgb(128, 128, 128)', 'ramp: its ends and its middle stop exactly', H.ramp.join(' '));
result(H.decay[0] === 1 && H.decay[1] === 1 && Math.abs(H.decay[2] - Math.exp(-1)) < 1e-9 && H.span.join() === '0,0.5,1' && H.stepped.join() === '4,6', 'decay, span, stepped: exact on their ends');
result(H.tab.join() === '1,2,3' && JSON.stringify(H.perFrame) === '[[4,7],[5,8],[6,9]]', 'tab, perFrame: linear between keys, held outside');
// 4. measured numbers
result(P.porthole.drain[0] === 14 && P.porthole.words.bottom - P.porthole.words.top === 12 && P.porthole.exit < P.porthole.dur, 'porthole-line: the drain at 14 f, the bottom line 12 f after the top, the exit inside the scene');
result(P.blobs.dance + P.blobs.birth < P.blobs.slideAt && P.blobs.slideAt + P.blobs.slide < P.blobs.dur, 'blobs-to-mark: the dance, the birth and the slide in order inside the scene');
result(P.counters.count < P.counters.dur && P.counters.develop[1] - P.counters.develop[0] === 4, 'photo-counters: the counters land before the end, the photo develops in 4 f');
result(P.counters.exit - P.counters.count >= 6, 'photo-counters: the last figure is read before the exit push (6 f or more)', `${P.counters.count} -> ${P.counters.exit}`);
// framing: the cards are the frame's subject, placed by composition for their number, never tucked in a corner
{
  const [one, two, three, left, right] = P.layout;
  const inFrame = (c) => c.x >= 0 && c.y >= 0 && c.x + c.w <= 1920 && c.y + c.h <= 1080;
  const cx = (c) => c.x + c.w / 2;
  const cy = (c) => c.y + c.h / 2;
  result(one.length === 1 && Math.abs(cx(one[0]) - 960) < 1 && Math.abs(cy(one[0]) - 540) < 1 && one[0].w >= 0.4 * 1920 && inFrame(one[0]), 'photo-counters: one card is centred and at least 40 % of the frame wide', JSON.stringify(one[0]));
  const mid2 = (Math.min(two[0].x, two[1].x) + Math.max(two[0].x + two[0].w, two[1].x + two[1].w)) / 2;
  result(two.length === 2 && Math.abs(mid2 - 960) < 1 && two.every((c) => inFrame(c) && Math.abs(cy(c) - 540) < 1 && c.w >= 0.3 * 1920) && two[0].x + two[0].w <= two[1].x, 'photo-counters: two cards stand side by side across the centre, each at least 30 % of the frame wide', JSON.stringify(two.map((c) => [c.x, c.y, c.w])));
  result(three.length === 3 && Math.abs(cx(three[0]) - 960) < 1 && three[0].w >= 0.4 * 1920 && three.every(inFrame), 'photo-counters: three cards keep the big one centred, all inside the frame', JSON.stringify(three.map((c) => [c.x, c.y, c.w])));
  result(Math.abs(cx(left[0]) - 640) < 1 && Math.abs(cx(right[0]) - 1280) < 1 && inFrame(left[0]) && inFrame(right[0]), 'photo-counters: place left / right set the one card on a third, inside the frame');
}
result(P.river.segs.every((s, i) => i === 0 || s <= P.river.segs[i - 1]) && P.river.segs[0] > P.river.segs[P.river.segs.length - 1], 'photo-river: the pump accelerates (segments never lengthen)', P.river.segs.join(' '));
const sw = P.river.swaps;
const gaps = sw.slice(1).map((f, i) => f - sw[i]);
result(sw[0] === 0 && sw[sw.length - 1] < P.river.river && gaps.every((g, i) => g > 0 && (i === 0 || g <= gaps[i - 1])), 'photo-river: the row\'s front cards cut in faster and faster inside the row', sw.join(' '));
// the far row behind the last card: every card (2.4 steps back and further) stands between the left word's end (706 px
// left of centre) and the right side of the frame, smaller the further back, and the nearest is under half the card
const far = P.river.far;
const farAt = (a) => { const s = 1 / (1 + far.dz * a); return { s, x: far.x0 + (far.x1 - far.x0) * s }; };
const farRow = Array.from({ length: P.river.rows + 4 }, (_, i) => farAt(2.4 + i));
result(farRow.every((c, i) => c.x > -706 && c.x < 960 && (i === 0 || (c.s < farRow[i - 1].s && c.x < farRow[i - 1].x))) && farRow[0].s < 0.5, 'photo-river: the far row recedes left between the left word and the last card', farRow.map((c) => c.x.toFixed(0)).join(' '));
// no logo given: the placeholder mark is painted in the scene's palette, never in the starter's own accent
for (const f of ['mark-pullback', 'word-build-badge', 'blobs-to-mark']) {
  const src = readFileSync(join(SRC, 'scenes', `${f}.tsx`), 'utf8');
  result(/SAMPLE_MARK_SVG\.split\(C\.accent\)\.join\(P\.accent\)/.test(src) && !/markOf\(/.test(src), `${f}: with no logo the placeholder mark takes the palette's accent`);
}

// 5. subject: on screen by frame 6, never an empty card, page or field at the scene's start
result(P.subject.cards.every((f) => f <= 6) && P.river.swaps[0] === 0 && P.subject.line <= 6, 'photo-counters, photo-river, line-to-wordmark: the first card, picture and word are on by frame 6', `${P.subject.cards.join(',')} ${P.river.swaps[0]} ${P.subject.line}`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
