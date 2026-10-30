#!/usr/bin/env node
/**
 * kit-real.test.mjs: the material-realism helpers of the product kit (src/kit/real.ts) and the sample world's day.
 *
 *   1. The calendar: day() and fmtDay() print the calendar's weekday in every style ("Wed 28 Oct" for 2026-10-28),
 *      offsets cross months and years, weekOf() is Monday to Sunday round the day with the product's label, relDay()
 *      says Today / Yesterday / the weekday / the date.
 *   2. dayLog(): exactly `count` entries, unique rising minutes inside [from, now], gaps that are not a metronome, amounts
 *      that sum to the total to the unit, no label twice in a row; listView() shows the newest 8 (or all), the count and
 *      the sum are the whole log's; countLabel() reads the list; checkList() fails "14 today" over 2 rows and passes 14
 *      over 8.
 *   3. waveBars(): in [floor, 1], no period (the autocorrelation of the bars, swell removed, stays under 0.4 at every lag
 *      2-40, where a tall bar every 8th or a sine of the index reads over 0.6), accents stand tall, two seeds differ;
 *      peaksBars() keeps the loudest bin and resamples any length.
 *   4. stripMoments() / thumbsFrom(): distinct moments inside the clip, never closer than a third of the even spacing,
 *      one per shot when the cuts are known; neighbours from different clips.
 *   5. castPlan() / checkCast(): no shoot or person in more than maxBeats beats, never the shoot of the beat before;
 *      checkCast() fails one couple in every beat.
 *   6. sample().world() and filmWorld(): seen on the film's day (FILM_DATE) or `today`, the label's weekday the calendar's.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/kit-real.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log('usage: node scripts/test/kit-real.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const PROBE = `
import * as R from '${url('kit/real.ts')}';
import { filmWorld } from '${url('kit/data.ts')}';
import { sample } from '${url('kit/sample.ts')}';
const sampleWorld = sample().world;
const d = (iso: string, k = 0) => R.day(iso, k);
const styles = ['wd', 'weekday', 'md', 'dm', 'short', 'dmy', 'mdy', 'long', 'longYear', 'num'] as const;
const log = R.dayLog('sips', { count: 14, total: 1860, from: 7 * 60 + 5, now: 18 * 60 + 42, labels: ['Desk', 'Walk', 'Lunch', 'Gym', 'Train'] });
const lv = R.listView(log);
const small = R.dayLog('few', { count: 5, total: 900 });
const clips = [{ src: 'a.mp4', dur: 7 }, { src: 'b.mp4', dur: 5, cuts: [1.6, 3.1] }, { src: 'c.mp4', dur: 12 }];
const pics = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'e1', 'f1'].map((id) => ({ id, shoot: id[0], people: id[0] === 'a' ? ['maya', 'jonah'] : [id[0] + '-p'] }));
const beats = ['open', 'proof', 'feed', 'insight', 'pick', 'end'];
const cast = R.castPlan(beats, pics, { perBeat: 2, maxBeats: 2, seed: 'film' });
const couple = Object.fromEntries(beats.map((b) => [b, [pics[0]]]));
console.log(JSON.stringify({
  film: R.FILM_DATE,
  wed: styles.map((s) => R.fmtDay(d('2026-10-28'), s)),
  cross: [R.fmtDay(d('2026-12-30', 3), 'longYear'), R.fmtDay(d('2026-03-01', -1), 'dmy'), d('2028-02-28', 1).iso],
  week: R.weekOf(d('2026-10-29')),
  weekSun: R.weekOf(d('2026-10-29'), 0).label,
  rel: [0, -1, 1, -3, 4, -12].map((k) => R.relDay(d('2026-10-29', k), d('2026-10-29'))),
  clocks: [R.clockOf(7 * 60 + 5), R.clockOf(7 * 60 + 5, true), R.clockOf(0, true), R.clockOf(12 * 60 + 30, true), R.clockOf(1500)],
  log, lv: { shown: lv.shown.map((e: any) => e.i), more: lv.more, count: lv.count, sum: lv.sum },
  small: R.listView(small), label: [R.countLabel(log, 'sip'), R.countLabel(1, 'sip'), R.countLabel(log, 'sip', 'sips', 'today')],
  checks: [R.checkList(14, 2), R.checkList(14, 8), R.checkList(4, 4), R.checkList(2, 4), R.checkList(14, 8, { more: false })],
  wave: R.waveBars(120, { seed: 'song' }), wave2: R.waveBars(120, { seed: 'other' }), acc: R.waveBars(96, { seed: 'song', accents: [7, 31, 55, 79] }),
  peaks: R.peaksBars([0, 0.1, 0.9, 0.2, 0.3, 0.05, 0.6, 0.4], 4), peaksUp: R.peaksBars([0.2, 1, 0.5], 9).length,
  strip: R.stripMoments(7, 6, { seed: 'clip' }), cuts: R.stripMoments(5, 3, { cuts: [1.6, 3.1], seed: 'x' }),
  thumbs: R.thumbsFrom(clips, 12, 'row'),
  cast: Object.fromEntries(Object.entries(cast.plan).map(([b, ps]: any) => [b, ps.map((p: any) => p.id)])), short: cast.short,
  castBad: R.checkCast(cast.plan, 2), coupleBad: R.checkCast(couple, 2),
  world: sampleWorld('kit-real').today, worldAt: sampleWorld('kit-real', { today: '2027-01-04' }).today, fwToday: filmWorld({ records: [{ title: 'x' }] }).today, fwAt: filmWorld({ records: [{ title: 'x' }], today: '2027-01-04' }).today,
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-kitreal-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. the calendar
result(eq(P.wed, ['Wed', 'Wednesday', 'Oct 28', '28 Oct', 'Wed, Oct 28', 'Wed 28 Oct', 'Wed Oct 28', 'Wednesday, October 28', 'Wednesday, October 28, 2026', '10/28']),
  'fmtDay: 2026-10-28 is a Wednesday in every style', P.wed.join(' | '));
result(eq(P.cross, ['Saturday, January 2, 2027', 'Sat 28 Feb', '2028-02-29']), 'day(): offsets cross months, years and a leap day', P.cross.join(' | '));
result(P.week.from.iso === '2026-10-26' && P.week.to.iso === '2026-11-01' && P.week.label === 'Oct 26 – Nov 1' && P.week.days.length === 7 && P.week.days[3].iso === '2026-10-29',
  'weekOf(): Monday to Sunday round the day, "Oct 26 – Nov 1"', `${P.week.from.iso}..${P.week.to.iso} ${P.week.label}`);
result(P.weekSun === 'Oct 25 – 31', 'weekOf(day, 0): a Sunday week', P.weekSun);
result(eq(P.rel, ['Today', 'Yesterday', 'Tomorrow', 'Monday', 'Monday', 'Oct 17']), 'relDay(): Today, Yesterday, Tomorrow, the weekday inside a week, else the date', P.rel.join(' | '));
result(eq(P.clocks, ['07:05', '7:05 AM', '12:00 AM', '12:30 PM', '01:00']), 'clockOf(): 24 h and 12 h clocks', P.clocks.join(' | '));
result(/^\d{4}-\d{2}-\d{2}$/.test(P.film), 'FILM_DATE is an ISO day', P.film);

// 2. logs and counts
const L = P.log;
const at = L.map((e) => e.at);
const gaps = at.slice(1).map((t, i) => t - at[i]);
const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const cv = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length) / mean;
result(L.length === 14 && gaps.every((g) => g > 0) && at[0] >= 425 && at[13] <= 1122, 'dayLog(): 14 entries, rising unique minutes inside the day so far', `${at[0]}..${at[13]}`);
result(cv > 0.3, 'dayLog(): irregular gaps, not a metronome', `gap CV ${cv.toFixed(2)}`);
result(L.reduce((a, e) => a + e.amount, 0) === 1860 && L.every((e) => e.amount > 0), 'dayLog(): the amounts sum to the total to the unit', String(L.reduce((a, e) => a + e.amount, 0)));
result(L.every((e, i) => i === 0 || e.label !== L[i - 1].label) && L.every((e) => /^\d\d:\d\d$/.test(e.time)), 'dayLog(): no label twice in a row, printed clock times');
result(eq(P.lv.shown, [13, 12, 11, 10, 9, 8, 7, 6]) && P.lv.more === 6 && P.lv.count === 14 && P.lv.sum === 1860, 'listView(): the newest 8 rows, 6 more, the count and the sum are the whole log\'s', JSON.stringify(P.lv));
result(P.small.shown.length === 5 && P.small.more === 0 && P.small.count === 5, 'listView(): a short log shows every row', JSON.stringify({ n: P.small.shown.length, more: P.small.more }));
result(eq(P.label, ['14 sips', '1 sip', '14 today']), 'countLabel(): the count read from the list', P.label.join(' | '));
result(P.checks[0].length === 1 && P.checks[1].length === 0 && P.checks[2].length === 0 && P.checks[3].length === 1 && P.checks[4].length === 1,
  'checkList(): "14 today" over 2 rows and 2 over 4 rows fail, 14 over 8 and 4 over 4 pass, rows left out with nowhere to go fail', JSON.stringify(P.checks));

// 3. waveforms
const ac = (v, lag) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  let num = 0, den = 0;
  for (let i = 0; i < v.length; i++) den += (v[i] - m) ** 2;
  for (let i = 0; i + lag < v.length; i++) num += (v[i] - m) * (v[i + lag] - m);
  return num / den;
};
// periodicity: the autocorrelation of the bars after the slow swell is taken out (a 9-bar moving mean), at lags 2-40
const resid = (v, w = 9) => v.map((x, i) => {
  let s = 0, n = 0;
  for (let k = Math.max(0, i - (w >> 1)); k <= Math.min(v.length - 1, i + (w >> 1)); k++) { s += v[k]; n++; }
  return x - s / n;
});
const lags = Array.from({ length: 39 }, (_, i) => i + 2);
const period = (v) => Math.max(...lags.map((k) => ac(resid(v), k)));
const worst = period(P.wave);
const metronome = period(Array.from({ length: 120 }, (_, i) => 0.28 + 0.5 * Math.abs(Math.sin(i * 1.37) * Math.cos(i * 0.41)) + (i % 8 === 0 ? 0.22 : 0)));
const sine = period(Array.from({ length: 120 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 0.9))));
result(P.wave.length === 120 && P.wave.every((v) => v >= 0.08 - 1e-9 && v <= 1 + 1e-9) && Math.max(...P.wave) > 0.999, 'waveBars(): 120 bars in [floor, 1]');
result(worst < 0.4 && metronome > 0.6 && sine > 0.6, 'waveBars(): no period at any lag 2-40 (a tall bar every 8th and a sine of the index both show one)',
  `waveBars ${worst.toFixed(2)}, every-8th ${metronome.toFixed(2)}, sine ${sine.toFixed(2)}`);
result([7, 31, 55, 79].every((i) => P.acc[i] >= 0.8), 'waveBars(): accents stand tall', [7, 31, 55, 79].map((i) => P.acc[i].toFixed(2)).join(' '));
result(P.wave.filter((v, i) => Math.abs(v - P.wave2[i]) > 0.05).length > 60, 'waveBars(): two seeds give two waveforms');
result(Math.abs(P.peaks[1] - 1) < 1e-9 && P.peaks.length === 4 && P.peaks[0] < P.peaks[1] && P.peaksUp === 9, 'peaksBars(): the loudest bin reads 1, any length resamples', P.peaks.map((v) => v.toFixed(2)).join(' '));

// 4. thumbnails
const S = P.strip;
const minGap = Math.min(...S.slice(1).map((t, i) => t - S[i]));
result(S.length === 6 && S.every((t) => t > 0 && t < 7) && minGap >= (6.72 / 6) / 3 - 1e-6, 'stripMoments(): 6 distinct moments inside the clip, a third of the spacing apart', S.map((t) => t.toFixed(2)).join(' '));
result(P.cuts[0] < 1.6 && P.cuts[1] > 1.6 && P.cuts[1] < 3.1 && P.cuts[2] > 3.1, 'stripMoments(): one moment in each shot when the cuts are known', P.cuts.map((t) => t.toFixed(2)).join(' '));
const T = P.thumbs;
const perClip = [0, 1, 2].map((c) => T.filter((x) => x.clip === c).map((x) => x.t));
result(T.length === 12 && T.every((x, i) => i === 0 || x.clip !== T[i - 1].clip) && perClip.every((ts) => new Set(ts.map((t) => t.toFixed(3))).size === ts.length),
  'thumbsFrom(): neighbours from different clips, distinct moments in each', T.map((x) => `${x.clip}@${x.t.toFixed(1)}`).join(' '));

// 5. the cast
const shootsOf = (ids) => [...new Set(ids.map((id) => id[0]))];
const beats = Object.keys(P.cast);
const adj = beats.slice(1).every((b, i) => !shootsOf(P.cast[b]).some((s) => shootsOf(P.cast[beats[i]]).includes(s)));
const count = {};
for (const b of beats) for (const s of shootsOf(P.cast[b])) count[s] = (count[s] || 0) + 1;
result(P.castBad.length === 0 && Object.values(count).every((n) => n <= 2) && adj && P.short.length === 0, 'castPlan(): no shoot in more than 2 beats, never the shoot of the beat before', JSON.stringify(P.cast));
result(P.coupleBad.length === 3 && P.coupleBad.some((m) => /person maya is in 6 beats/.test(m)), 'checkCast(): one couple in every beat fails (the shoot and each person)', P.coupleBad.join(' | '));

// 6. the sample world's day
const wd = (o) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(o.y, o.m - 1, o.d)).getUTCDay()];
result(`${P.world.y}-${String(P.world.m).padStart(2, '0')}-${String(P.world.d).padStart(2, '0')}` === P.film && P.world.weekday === wd(P.world) && P.world.label.startsWith(wd(P.world)),
  'sampleWorld(): seen on the film\'s day, its weekday the calendar\'s', P.world.label);
result(P.worldAt.y === 2027 && P.worldAt.m === 1 && P.worldAt.d === 4 && P.worldAt.weekday === 'Mon', 'sampleWorld({ today }): another day', P.worldAt.label);
result(P.fwToday.label === P.world.label && P.fwAt.weekday === 'Mon' && P.fwAt.label === 'Mon, Jan 4', 'filmWorld(): seen on the film\'s day, or on `today`, its weekday the calendar\'s', `${P.fwToday.label} / ${P.fwAt.label}`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
