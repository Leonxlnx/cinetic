#!/usr/bin/env node
/**
 * data-check.test.mjs: scripts/data-check.mjs on two small films written here, one whose material gives it away and
 * one computed right.
 *
 *   1. The calendar: datesIn() reads "Tue 28 Oct", "Wednesday, October 28, 2026", "Tue, Oct 28", "Tue 10/28", ranges
 *      and plain days, takes the year nearest the film's day, and leaves "may 4" alone; checkDates() fails the wrong
 *      weekday and a day the month does not have, warns on a far date, a past week and a week that starts on a Tuesday.
 *   2. The bad film fails every rule: date-weekday, date-invalid, week-start, week-past, date-far, count-list (a count
 *      over a short list, a count under its rows), dense-rows, wave-periodic, wave-synthetic, thumb-repeat (a list that
 *      names one picture three times, fill(), a numbered strip of one picture), photo-repeat, cast-repeat (declared in
 *      cast.json: an error), co-moving (a distance counting while its moving time stays frozen, read through the
 *      script's ui strings per scene, and a literal clock frozen beside a step counter), ago-order (notices timed
 *      oldest first); exit 1, and --json lists them.
 *   3. The good film passes with no warning: weekdays from the calendar, this week, counts that are their rows, 8 rows,
 *      waveBars(), distinct strip frames, each picture in at most half the beats, a distance and its time counting from
 *      one progress beside a still summit height. FILM_DATE is read from the source.
 *   4. peaks: a track of silence, a loud tone and a soft tone gives bars near 0, 1 and the soft level.
 *   5. Exit 2 on a missing source folder or an unknown option; --help answers.
 *   6. The case: a price beside the case's name that is not the case's fails (case-number), a name one letter off warns
 *      (case-name), the case's own name and price pass.
 * The pictures and the track are written here (tiny PNGs, a WAV); the image and peaks parts need ffmpeg on the PATH.
 * Usage (from the skill root):  node scripts/test/data-check.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const SCRIPT = path.join(SKILL, 'scripts', 'data-check.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/data-check.test.mjs [--verbose]   (ffmpeg on the PATH for the picture and peaks parts)');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
const D = await import(pathToFileURL(SCRIPT).href);
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

// ------------------------------------------------------------------------------------------------ fixtures
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
/** A grey PNG, w x h, value from px(x, y). */
const png = (w, h, px) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(px(x, y))));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const write = (root, rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-datacheck-'));
const BAD = path.join(TMP, 'bad'), GOOD = path.join(TMP, 'good');

// the bad film
write(BAD, 'src/app.ts', `
export const APP = {
  date: 'Tue 28 Oct',
  launch: 'Mon 30 Feb',
  week: { range: 'Oct 20 – 26', last: 'Oct 12 – 18' },
  old: 'Jun 3',
  sips: 'Sips',
  sipsToday: '14 today',
  rows: [['6:10 PM', 'After the run', '+350 ml'], ['4:15 PM', 'At the desk', '+220 ml'], ['1:30 PM', 'Lunch', '+300 ml'], ['10:05 AM', 'Before the meeting', '+180 ml']],
  inbox: { count: 2, items: [{ who: 'Ana' }, { who: 'Ben' }, { who: 'Cy' }] },
  strip: ['van', 'van', 'van', 'park'],
  notices: [{ title: 'New order', ago: '12m ago' }, { title: 'Payout sent', ago: 'now' }, { title: 'New review', ago: '3m ago' }],
};
export const PICS = { cafe: 'assets/photos/maya-cafe.png', park: 'assets/photos/maya-park.png', desk: 'assets/photos/maya-desk.png', run: 'assets/photos/tom-run.png', van: 'assets/photos/van.png' };
export const WAVE = Array.from({ length: 88 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.37)) + (i % 8 === 0 ? 0.2 : 0));
export const LEVELS = Array.from({ length: 40 }, (_, i) => 0.5 + 0.5 * Math.sin(i * 0.7));
export const ROW = new Array(6).fill('assets/photos/van.png');
`);
write(BAD, 'src/acts/Open.tsx', `import { PICS } from '../app';\nexport const Open = () => <img src={PICS.cafe} />;\n`);
write(BAD, 'src/acts/Proof.tsx', `import { PICS } from '../app';\nexport const Proof = () => <div><img src={PICS.park} /><img src={PICS.cafe} /></div>;\n`);
write(BAD, 'src/acts/Feed.tsx', `import { PICS, APP } from '../app';\nexport const Feed = () => <TodayScreen rows={2} date={APP.date}><img src={PICS.desk} /><img src={PICS.cafe} /></TodayScreen>;\n`);
write(BAD, 'src/acts/End.tsx', `import { PICS } from '../app';\nexport const End = () => <div><img src={PICS.cafe} /><img src={PICS.run} /></div>;\n`);
write(BAD, 'public/cast.json', JSON.stringify({ 'maya-*': { shoot: 'maya', people: ['maya'] } }));
for (const n of ['maya-cafe', 'maya-park', 'maya-desk', 'tom-run', 'van']) write(BAD, `public/assets/photos/${n}.png`, png(32, 20, (x, y) => 40 + x * 5 + y * 2));
const LAUNCH = (ui) => `export const LAUNCH = { name: 'Trail', pairs: [
  { line: 'Know where you are.', scene: 'map', ui: ['On trail'] },
  { line: 'See your distance as you go.', scene: 'distance', ui: ${JSON.stringify(ui)} },
] };
`;
const SCENE = (time) => `import { LAUNCH } from './launch';
const ui = (pair: number, j: number) => LAUNCH.pairs[pair - 1]?.ui?.[j] ?? '';
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const MapScene = ({ f, pair }: { f: number; pair: number }) => <div>{ui(pair, 0)}</div>;
const DistanceScene = ({ f, pair }: { f: number; pair: number }) => {
  const run = Math.min(1, f / 60);
  const final = parseFloat(ui(pair, 1)) || 0;
  const unit = ui(pair, 1).replace(/^[\d.,\s]+/, '');
  const v = mix(final - 0.7, final, run);
  const mins = Math.round(mix(120, 134, run));
  return (
    <div>
      <span>{ui(pair, 0)}</span>
      <b>{v.toFixed(1)}</b><i>{unit}</i>
      <span>{ui(pair, 2)}</span>
      ${time}
      <span>{ui(pair, 4)}</span><b>{ui(pair, 5)}</b>
    </div>
  );
};
export const SCENES = { map: { draw: MapScene }, distance: { draw: DistanceScene } };
`;
write(BAD, 'src/launch.ts', LAUNCH(['Distance', '4.8 mi', 'Moving time', '2:14', 'Summit', '6,312 ft']));
write(BAD, 'src/product.tsx', SCENE('<b>{ui(pair, 3)}</b>'));
write(BAD, 'src/acts/Steps.tsx', `export const Steps = ({ frame }: { frame: number }) => {
  const n = Math.round(frame * 21);
  return <div><b>{n.toLocaleString()}</b> steps<span>Elapsed</span><b>12:40</b></div>;
};
`);
for (let i = 0; i < 6; i++) write(BAD, `public/assets/strips/van-${i}.png`, png(32, 20, (x, y) => 30 + x * 6 + y * 3 + ((x * 7 + y * 3 + i) % 5))); // one locked-off shot: the same picture six times

// the good film
write(GOOD, 'src/kit/real.ts', `export const FILM_DATE = '2026-10-29';\nexport const waveBars = (n: number, o: { seed?: string } = {}) => Array.from({ length: n }, () => 0.5);\n`);
write(GOOD, 'src/app.ts', `
import { waveBars } from './kit/real';
export const APP = {
  date: 'Wed 28 Oct',
  long: 'Thursday, October 29, 2026',
  week: { range: 'Oct 26 – Nov 1' },
  next: 'Nov 12',
  sipsToday: '9 today',
  rows: [['6:10 PM', 'After the run'], ['5:02 PM', 'Train'], ['4:15 PM', 'Desk'], ['2:48 PM', 'Walk'], ['1:30 PM', 'Lunch'], ['11:40 AM', 'Desk'], ['10:05 AM', 'Meeting'], ['8:55 AM', 'Train'], ['7:20 AM', 'Breakfast']],
  inbox: { unread: '2 new', items: [{ who: 'Ana' }, { who: 'Ben' }, { who: 'Cy' }] },
  notices: [{ title: 'New order', ago: 'now' }, { title: 'Payout sent', ago: '3m ago' }, { title: 'New review', ago: '1h ago' }],
};
export const PICS = { cafe: 'assets/photos/maya-cafe.png', park: 'assets/photos/maya-park.png', desk: 'assets/photos/maya-desk.png', run: 'assets/photos/tom-run.png', van: 'assets/photos/van.png' };
export const WAVE = waveBars(88, { seed: 'song' });
`);
write(GOOD, 'src/acts/Open.tsx', `import { PICS } from '../app';\nexport const Open = () => <img src={PICS.cafe} />;\n`);
write(GOOD, 'src/acts/Proof.tsx', `import { PICS } from '../app';\nexport const Proof = () => <div><img src={PICS.van} /></div>;\n`);
write(GOOD, 'src/acts/Feed.tsx', `import { PICS, APP } from '../app';\nexport const Feed = () => <TodayScreen rows={8} date={APP.date}><img src={PICS.run} /></TodayScreen>;\n`);
write(GOOD, 'src/acts/End.tsx', `import { PICS } from '../app';\nexport const End = () => <div><img src={PICS.desk} /></div>;\n`);
write(GOOD, 'public/cast.json', JSON.stringify({ 'maya-*': { shoot: 'maya', people: ['maya'] } }));
for (const n of ['maya-cafe', 'maya-park', 'maya-desk', 'tom-run', 'van']) write(GOOD, `public/assets/photos/${n}.png`, png(32, 20, (x, y) => 40 + x * 5 + y * 2));
const looks = [(x, y) => x * 8, (x, y) => 255 - x * 8, (x, y) => y * 12, (x, y) => 255 - y * 12, (x, y) => ((x >> 3) + (y >> 2)) % 2 ? 230 : 20, (x, y) => (x > 16 ? 200 : 40)];
for (let i = 0; i < 6; i++) write(GOOD, `public/assets/strips/van-${i}.png`, png(32, 20, looks[i])); // six distinct moments
write(GOOD, 'src/launch.ts', LAUNCH(['Distance', '4.8 mi', 'Moving time', '2:14', 'Summit', '6,312 ft']));
write(GOOD, 'src/product.tsx', SCENE("<b>{`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`}</b>"));

const cli = (args, cwd) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });

try {
  // 1. the calendar
  const today = Date.UTC(2026, 9, 29) / 86400000;
  const ds = (t) => D.datesIn(t, today).map((v) => `${v.kind}:${v.y}-${v.m + 1}-${v.d}${v.wd !== undefined ? `/${v.wd}` : ''}`);
  result(JSON.stringify(ds('Tue 28 Oct')) === '["wd:2026-10-28/2"]', 'datesIn: "Tue 28 Oct" is 28 Oct 2026 read with a Tuesday', ds('Tue 28 Oct').join());
  result(JSON.stringify(ds('Wednesday, October 28, 2026 and Tue, Oct 28')) === '["wd:2026-10-28/3","wd:2026-10-28/2"]', 'datesIn: long and short month-first forms', ds('Wednesday, October 28, 2026 and Tue, Oct 28').join());
  result(JSON.stringify(ds('Tue 10/28')) === '["wd:2026-10-28/2"]', 'datesIn: "Tue 10/28" (month/day)', ds('Tue 10/28').join());
  result(JSON.stringify(ds('Jan 3')) === '["day:2027-1-3"]' && JSON.stringify(ds('Oct 26 – Nov 1')) === '["range:2026-10-26"]', 'datesIn: the year nearest the film\'s day; a range across months', `${ds('Jan 3')} ${ds('Oct 26 – Nov 1')}`);
  result(ds('it may 4 times').length === 0 && ds('12:30').length === 0 && ds('v2.14 build 48').length === 0, 'datesIn: "may 4", clocks and versions are not dates');
  const got = [];
  const add = (rule, sev) => got.push(`${rule}/${sev}`);
  for (const t of ['Tue 28 Oct', 'Wed 28 Oct', 'Sep 31', 'Oct 20 – 26', 'Oct 12 – 18', 'Jun 3', 'Oct 26 – Nov 1', 'Nov 12', 'Tue 10/28', 'Wed 10/28']) D.checkDates(t, 'x', today, add);
  result(JSON.stringify(got) === JSON.stringify(['date-weekday/error', 'date-invalid/error', 'week-start/warn', 'week-past/warn', 'date-far/warn', 'date-weekday/error']),
    'checkDates: a wrong weekday and an impossible day fail; a Tuesday week, a past week and a far date warn; the right ones pass', got.join(' '));

  // 2. the bad film
  const bad = cli(['src', '--json'], BAD);
  let B = null;
  try { B = JSON.parse(bad.stdout); } catch { /* reported below */ }
  const rules = B ? B.findings.map((f) => `${f.rule}/${f.severity}`) : [];
  const has = (r, n = 1) => rules.filter((x) => x === r).length >= n;
  result(bad.status === 1 && !!B && B.ok === false, 'the bad film fails (exit 1, --json ok false)', `exit ${bad.status}${bad.stderr ? `; ${bad.stderr.trim().split('\n')[0]}` : ''}`);
  for (const [r, n, what] of [
    ['date-weekday/error', 1, '"Tue 28 Oct" is a Wednesday'], ['date-invalid/error', 1, '"Mon 30 Feb"'], ['week-start/warn', 1, '"Oct 20 – 26" runs Tuesday to Monday'],
    ['week-past/warn', 1, '"Oct 12 – 18" is a past week'], ['date-far/warn', 1, '"Jun 3" is months away'], ['count-list/error', 2, '"14 today" over 4 rows; count 2 over 3 items'],
    ['dense-rows/warn', 1, '<TodayScreen rows={2}>'], ['ago-order/warn', 1, 'notices timed "12m ago", "now", "3m ago"'], ['wave-periodic/error', 1, '"i % 8"'], ['wave-synthetic/warn', 1, 'sines of the index'],
    ['thumb-repeat/error', ffmpeg ? 3 : 2, 'a list naming "van" three times, fill(), a numbered strip of one picture'], ['photo-repeat/error', 1, 'the cafe picture in 4 of 5 beats'],
    ['cast-repeat/error', 1, 'maya (cast.json) in 4 beats'], ['co-moving/error', 2, 'a distance counting beside a frozen moving time; steps counting beside a frozen clock'],
  ]) result(has(r, n), `bad film: ${r} x${n} (${what})`, rules.join(' '));
  const msg = (r) => B?.findings.find((f) => f.rule === r)?.message ?? '';
  result(/is a Wednesday, not a Tuesday/.test(msg('date-weekday')) && /says 14 but `rows` holds 4 rows/.test(B?.findings.filter((f) => f.rule === 'count-list').map((f) => f.message).join(' ') ?? ''),
    'bad film: the messages name the calendar\'s weekday and the list\'s real length', msg('date-weekday'));
  result(B?.findings.some((f) => f.rule === 'cast-repeat' && /person maya/.test(f.message)) && B?.findings.some((f) => f.rule === 'photo-repeat' && /maya-cafe/.test(f.message) && /4 beats/.test(f.message)),
    'bad film: the cast is read from cast.json and the beats from the act files', B?.findings.filter((f) => /repeat/.test(f.rule)).map((f) => f.message.slice(0, 80)).join(' | '));

  const co = B?.findings.filter((f) => f.rule === 'co-moving').map((f) => f.message) ?? [];
  result(co.some((m) => /DistanceScene \(pair 2, scene distance\): the distance counts \(4\.8 mi\) while "Moving time" 2:14/.test(m)) && co.some((m) => /Steps: the steps counts/.test(m) && /12:40/.test(m)) && !co.some((m) => /6,312/.test(m)),
    'bad film: co-moving names the counter, the frozen readout and its label (the summit height is a fixed property)', co.join(' | '));
  result(D.agoMinutes('now') === 0 && D.agoMinutes('2m ago') === 2 && D.agoMinutes('1 h') === 60 && D.agoMinutes('yesterday') === 1440 && D.agoMinutes('3d') === 4320
    && D.agoMinutes('30s ago') === 0.5 && D.agoMinutes('Tuesday') === null && D.agoMinutes('12:40') === null,
    'agoMinutes reads now, seconds, minutes, hours, yesterday and days; a weekday or a clock is no relative time');
  result(D.quantityOf('2:14') === 'time' && D.quantityOf('4.8 mi') === 'distance' && D.quantityOf('1,240 ft') === 'elevation' && D.quantityOf('6,312', 'Summit') === 'elevation' && D.quantityOf('38 %') === 'percent' && D.quantityOf('Moving time') === null
    && D.coupled('distance', 'time') && D.coupled('time', 'steps') && !D.coupled('elevation', 'elevation') && !D.coupled('percent', 'size'),
    'quantityOf reads time, distance, climb and percent; coupled pairs a running measure with its clock');

  // 3. the good film
  const good = cli(['src', '--json', '--today', '2026-10-29'], GOOD);
  let G = null;
  try { G = JSON.parse(good.stdout); } catch { /* reported below */ }
  result(good.status === 0 && G?.ok && G.findings.length === 0, 'the good film passes with no warning', G ? G.findings.map((f) => `${f.rule}: ${f.message}`).join(' | ') : `exit ${good.status} ${good.stderr}`);
  result(G?.beats === 4 && G?.pictures === 11 && (ffmpeg ? /1 numbered set/.test(G.images) : true), 'good film: 4 beats, 11 pictures, the strip measured', G ? `${G.beats} beats, ${G.pictures} pictures, images ${G.images}` : '');
  const own = cli(['src', '--json', '--no-images'], GOOD);
  let O = null;
  try { O = JSON.parse(own.stdout); } catch { /* reported below */ }
  result(O?.filmDate === '2026-10-29' && /kit\/real\.ts$/.test(O?.dateFrom ?? ''), 'FILM_DATE is read from the source', O ? `${O.filmDate} from ${O.dateFrom}` : own.stderr);
  const strict = cli(['src', '--strict', '--no-images', '--today', '2026-10-29'], BAD);
  result(strict.status === 1 && /data-check: \d+ errors?, \d+ warnings?/.test(strict.stdout), 'the text report ends on the counts', strict.stdout.trim().split('\n').pop());

  // 4. peaks
  if (ffmpeg) {
    const sr = 8000, secs = 3;
    const wav = Buffer.alloc(44 + sr * secs * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + sr * secs * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(sr * secs * 2, 40);
    for (let i = 0; i < sr * secs; i++) { const a = i < sr ? 0 : i < 2 * sr ? 0.5 : 0.1; wav.writeInt16LE(Math.round(a * 32767 * Math.sin((2 * Math.PI * 440 * i) / sr)), 44 + 2 * i); }
    write(TMP, 'track.wav', wav);
    const pk = cli(['peaks', path.join(TMP, 'track.wav'), '--bars', '30', '--out', path.join(TMP, 'peaks.json')], TMP);
    let P = null;
    try { P = JSON.parse(fs.readFileSync(path.join(TMP, 'peaks.json'), 'utf8')); } catch { /* reported below */ }
    const p = P?.peaks ?? [];
    result(pk.status === 0 && p.length === 30 && Math.max(...p) === 1 && p.slice(0, 9).every((v) => v < 0.02) && p.slice(11, 19).every((v) => v > 0.95) && p.slice(21).every((v) => v > 0.15 && v < 0.25),
      'peaks: silence near 0, the loud tone 1, the soft tone at its level', p.map((v) => v.toFixed(2)).join(' '));
  } else console.log('skip  peaks and the numbered strip: ffmpeg is not on the PATH');

  // 6. the case: its names and numbers agree. A price beside the case's name that is not the case's fails (case-number), a
  // name one letter off warns (case-name); the case's own name and price pass
  const CASE = path.join(TMP, 'case');
  write(CASE, 'src/spine.ts', `export const SPINE = { sentence: 'Fernway books the class.', element: 'request',
  case: { request: 'A booking page for my Sunday choir rehearsal', names: ['Sunday Choir'], numbers: ['$12'] }, acts: [] };\n`);
  write(CASE, 'src/content.ts', `export const FILM_DATE = '2026-10-29';
export const ROWS = ['Sunday Choir · $12 a seat', 'Sunday Choir · $15 a seat', 'Sunday Choirs', 'Book a seat'];\n`);
  const cs = D.run({ src: path.join(CASE, 'src'), noImages: true, today: '2026-10-29' });
  const csF = cs.findings.filter((f) => f.rule.startsWith('case-')).map((f) => `${f.rule}/${f.severity}/${f.text}`);
  result(JSON.stringify(csF) === JSON.stringify(['case-number/error/Sunday Choir · $15 a seat', 'case-name/warn/Sunday Choirs']) && !cs.ok,
    'case: a price beside the case\'s name that is not the case\'s fails (case-number), a name one letter off warns (case-name), the case\'s own pass', JSON.stringify(csF));

  // 5. arguments
  result(cli(['nowhere'], TMP).status === 2 && cli(['src', '--bogus'], GOOD).status === 2, 'exit 2 on a missing source folder or an unknown option');
  const help = cli(['--help'], TMP);
  result(help.status === 0 && /data-check\.mjs/.test(help.stdout) && /count-list/.test(help.stdout), '--help prints the checks');
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
