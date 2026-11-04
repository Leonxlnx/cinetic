#!/usr/bin/env node
/**
 * frames.test.mjs: scripts/frames.mjs against a stand-in Remotion CLI (no browser, no GPU, no network).
 *
 *   1. The bundle is built once per state of the source: a second still reuses it (no second `remotion bundle`),
 *      an edit under src/ builds a new one.
 *   2. Concurrency never exceeds the cores Remotion sees: with OMP_NUM_THREADS=2 (GNU nproc reports 2, and Remotion
 *      refuses a --concurrency above nproc) three stills ask for at most 2 tabs, and --concurrency 8 is lowered to 2.
 *   3. A GPU-path failure ("Target closed") retries once on swangle and keeps swangle for an hour (gl.json fallback),
 *      on top of the probe's pick, which stays; `frames.mjs gl` prints swangle meanwhile; an hour later the pick is
 *      used again (a GPU that failed once under load is not given up for good).
 *   4. An error in the film's own code (a TypeError) fails at once: no swangle retry, gl.json untouched.
 *   5. The probe ranks backends on the steady state (first to last frame written), not on whole calls: angle with a slow
 *      start but fast frames is kept (whole calls would pick swangle, as on a busy laptop); a near tie keeps angle;
 *      swangle clearly faster (a busy GPU) gets an hour's fallback while angle stays the machine's answer.
 *
 * Usage (from the skill root):  node scripts/test/frames.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRAMES = path.resolve(HERE, '..', 'frames.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/frames.test.mjs [--verbose]');
  process.exit(0);
}

// the stand-in CLI: logs every call as one JSON line; renders 1x1 PNGs; fails on demand
const STUB = String.raw`
const fs = require('fs'), path = require('path');
const a = process.argv.slice(2);
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify(a) + '\n');
const flag = (k) => { const x = a.find((s) => s.startsWith('--' + k + '=')); return x ? x.slice(k.length + 3) : null; };
if (a[0] === 'bundle') { const d = a[a.indexOf('--out-dir') + 1]; fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), '<html></html>'); process.exit(0); }
if (a[0] === 'compositions') { console.log('Film                30      64x36      90 (3.00 sec)'); process.exit(0); }
if (a[0] === 'render') {
  const cores = Number(process.env.STUB_CORES || 16), conc = Number(flag('concurrency') || 1);
  if (conc > cores) { console.error('Error: concurrency is set higher than the amount of CPU cores available. Available CPU cores: ' + cores + ', value set: ' + conc); process.exit(1); }
  const gl = flag('gl') || 'config';
  if ((process.env.STUB_FAIL_GL || '').split(',').includes(gl)) { console.error('Error: Target closed (the GPU process exited)'); process.exit(1); }
  if (process.env.STUB_CODE_ERROR) { console.error("TypeError: Cannot read properties of undefined (reading 'x')"); process.exit(1); }
  const out = a[3]; fs.mkdirSync(out, { recursive: true });
  const ms = (k) => Number(process.env['STUB_' + k + '_' + gl.replace(/-/g, '_').toUpperCase()] || 0);
  const nap = (t) => { if (t > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, t); };
  nap(ms('START'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  for (const part of flag('frames').split(',')) { const [x, y] = part.split('-').map(Number); for (let f = x; f <= (y ?? x); f++) { nap(ms('FRAME')); fs.writeFileSync(path.join(out, f + '.png'), png); } }
  process.exit(0);
}
console.error('stub: unknown call ' + a.join(' ')); process.exit(2);
`;

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-test-'));
const LOG = path.join(ROOT, 'calls.jsonl');
fs.mkdirSync(path.join(ROOT, 'src'));
fs.writeFileSync(path.join(ROOT, 'src', 'index.ts'), 'export {};\n');
fs.writeFileSync(path.join(ROOT, 'package.json'), '{"name":"frames-test","private":true}\n');
const CLI = path.join(ROOT, 'node_modules', '@remotion', 'cli');
fs.mkdirSync(CLI, { recursive: true });
fs.writeFileSync(path.join(CLI, 'package.json'), '{"name":"@remotion/cli","version":"0.0.0","bin":{"remotion":"stub.cjs"}}\n');
fs.writeFileSync(path.join(CLI, 'stub.cjs'), STUB);
const GLJSON = path.join(ROOT, 'out', '.bundle', 'gl.json');

const calls = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const renders = () => calls().filter((c) => c[0] === 'render');
const flagOf = (c, k) => (c.find((s) => s.startsWith(`--${k}=`)) || '').slice(k.length + 3) || null;
function run(args, env = {}) {
  fs.rmSync(LOG, { force: true });
  const clean = { ...process.env };
  for (const k of Object.keys(clean)) if (/^(OMP_NUM_THREADS|OMP_THREAD_LIMIT|CINETIC_GL|STUB_.*)$/.test(k)) delete clean[k];
  const r = spawnSync(process.execPath, [FRAMES, ...args], { cwd: ROOT, encoding: 'utf8', env: { ...clean, STUB_LOG: LOG, ...env } });
  if (verbose) console.log(`$ frames.mjs ${args.join(' ')}\n${r.stdout}${r.stderr}`);
  return r;
}

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !detail ? '' : `: ${detail}`}`); if (!ok) failed++; };

try {
  // 1. one bundle per state of the source
  let r = run(['still', '10']);
  check('first still renders', r.status === 0 && fs.existsSync(path.join(ROOT, 'out', 'stills', 'f0010.png')), r.stderr);
  check('first still bundles once', calls().filter((c) => c[0] === 'bundle').length === 1);
  r = run(['still', '20']);
  check('second still reuses the bundle', r.status === 0 && calls().filter((c) => c[0] === 'bundle').length === 0, r.stderr);
  fs.writeFileSync(path.join(ROOT, 'src', 'index.ts'), 'export const x = 1;\n');
  r = run(['still', '20']);
  check('an edit under src/ builds a new bundle', r.status === 0 && calls().filter((c) => c[0] === 'bundle').length === 1, r.stderr);

  // 2. concurrency within the cores Remotion sees (nproc honours OMP_NUM_THREADS)
  r = run(['still', '1,2,3'], { OMP_NUM_THREADS: '2', STUB_CORES: '2' });
  const c3 = renders().map((c) => Number(flagOf(c, 'concurrency')));
  check('OMP_NUM_THREADS=2: three stills render', r.status === 0, r.stderr.trim().split('\n').pop());
  check('OMP_NUM_THREADS=2: at most 2 tabs', c3.length === 1 && c3[0] <= 2, `asked ${c3}`);
  r = run(['still', '1,2,3', '--concurrency', '8'], { OMP_NUM_THREADS: '2', STUB_CORES: '2' });
  check('--concurrency 8 lowered to the 2 cores Remotion sees', r.status === 0 && Number(flagOf(renders()[0] || [], 'concurrency')) === 2 && /using 2/.test(r.stderr), r.stderr);

  // 3. GPU-path failure: swangle for an hour on top of the probe's pick, then the pick again
  fs.mkdirSync(path.dirname(GLJSON), { recursive: true });
  r = run(['gl', '--quiet']); // the probe on the stand-in (both backends draw the same 1x1 frames; the faster wins)
  const key = JSON.parse(fs.existsSync(GLJSON) ? fs.readFileSync(GLJSON, 'utf8') : '{}').key;
  check('gl probe writes a pick for this machine', r.status === 0 && !!key && ['angle', 'swangle'].includes(r.stdout.trim()), r.stdout + r.stderr);
  // from here on the probe picked angle (the real 780M result), written as the probe writes it
  fs.writeFileSync(GLJSON, JSON.stringify({ key, at: new Date().toISOString(), gl: 'angle', probe: { angle: { ok: true, s: 3 }, swangle: { ok: true, s: 12 } } }));
  r = run(['still', '30'], { STUB_FAIL_GL: 'angle' });
  const gls = renders().map((c) => flagOf(c, 'gl'));
  check('a failure on angle retries once on swangle', r.status === 0 && gls.join(',') === 'angle,swangle', `gl calls ${gls}`);
  let g = JSON.parse(fs.readFileSync(GLJSON, 'utf8'));
  check('the probe pick stays, the fallback rides on it', g.gl === 'angle' && g.fallback?.gl === 'swangle' && /Target closed/.test(g.fallback.why || ''), JSON.stringify(g));
  r = run(['still', '31']);
  check('within the hour the next still uses swangle', r.status === 0 && flagOf(renders()[0] || [], 'gl') === 'swangle', String(renders().map((c) => flagOf(c, 'gl'))));
  r = run(['gl', '--quiet']);
  check('frames.mjs gl prints swangle within the hour', r.status === 0 && r.stdout.trim() === 'swangle', r.stdout + r.stderr);
  if (g.fallback) g.fallback.at = new Date(Date.now() - 2 * 3600e3).toISOString();
  fs.writeFileSync(GLJSON, JSON.stringify(g));
  r = run(['still', '32']);
  check('an hour later the probe pick is used again', r.status === 0 && flagOf(renders()[0] || [], 'gl') === 'angle', String(renders().map((c) => flagOf(c, 'gl'))));
  r = run(['gl', '--quiet']);
  check('frames.mjs gl prints the pick again', r.status === 0 && r.stdout.trim() === 'angle', r.stdout + r.stderr);

  // 4. a film-code error: no retry, gl.json untouched
  const before = fs.readFileSync(GLJSON, 'utf8');
  r = run(['still', '33'], { STUB_CODE_ERROR: '1' });
  check('a TypeError fails at once (one render call, exit 1)', r.status === 1 && renders().length === 1, `${renders().length} calls, exit ${r.status}`);
  check('gl.json untouched by a code error', fs.readFileSync(GLJSON, 'utf8') === before);

  // 5. the probe: steady state, a margin for angle, software wins only for an hour. On Linux the probe also tries
  // angle-egl and egl, which the stand-in does not time: they fail here, so the cases weigh angle against swangle
  const linuxOnly = process.platform === 'linux' ? ['angle-egl', 'egl'] : [];
  const probeWith = (env) => {
    const x = run(['gl', '--force'], { ...env, STUB_FAIL_GL: [env.STUB_FAIL_GL, ...linuxOnly].filter(Boolean).join(',') });
    return { x, g: JSON.parse(fs.readFileSync(GLJSON, 'utf8')) };
  };
  let p = probeWith({ STUB_START_ANGLE: '900', STUB_FRAME_ANGLE: '10', STUB_FRAME_SWANGLE: '90' });
  check('slow start, fast frames: angle kept (whole calls would say swangle)', p.x.status === 0 && p.x.stdout.trim() === 'angle' && p.g.gl === 'angle' && !p.g.fallback, p.x.stdout + p.x.stderr);
  p = probeWith({ STUB_FRAME_ANGLE: '66', STUB_FRAME_SWANGLE: '60' });
  check('a near tie (1.1x) keeps angle', p.x.status === 0 && p.g.gl === 'angle' && !p.g.fallback, p.x.stdout + p.x.stderr);
  p = probeWith({ STUB_FRAME_ANGLE: '200', STUB_FRAME_SWANGLE: '20' });
  check('swangle clearly faster: an hour of swangle, angle stays the answer', p.x.status === 0 && p.x.stdout.trim() === 'swangle' && p.g.gl === 'angle' && p.g.fallback?.gl === 'swangle', p.x.stdout + p.x.stderr);
  p = probeWith({ STUB_FAIL_GL: 'angle' });
  check('angle failing in the probe: swangle is the answer', p.x.status === 0 && p.g.gl === 'swangle' && !p.g.fallback, p.x.stdout + p.x.stderr);
} finally {
  fs.rmSync(ROOT, { recursive: true, force: true });
}
console.log(failed ? `${failed} failed` : 'all pass');
process.exit(failed ? 1 : 0);
