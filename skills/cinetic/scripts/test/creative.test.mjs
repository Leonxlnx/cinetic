#!/usr/bin/env node
/**
 * creative.test.mjs: the creative elements (assets/remotion-starter/src/fx/creative), the deck's random deal of them, and
 * the default launch's own deal and devices (launch-simple plays a spine: devices by verb, house scenes), read from the
 * modules (no render).
 *
 *   1. library     at least 12 finished devices, ids unique, both roles, a recipe of substance and house parameters each,
 *                  meta.ts and index.tsx agree.
 *   2. recipes     each device's pure state lands: it is finite and deterministic at 30 and 60 fps, reaches its end state
 *                  inside its beat and holds it (no idle bobbing after it lands: the state no longer changes).
 *   3. no tilt     the one turning device (object-turn) lands at zero degrees and stays there; letter-swing's letters
 *                  land at exactly zero; nothing else turns. photo-arc's row stays level, travels one way, never overlaps;
 *                  cursor-follow's camera makes one travel and one pull and lands; bubble-swarm's bubbles never overlap and
 *                  hold still; scale-contrast's rising letters start wholly under their mask.
 *   4. timings     meta.ts's line arithmetic (lineResolve, tail) equals the components' own (buildFrames, swapResolve,
 *                  scaleResolve, WINDOW_TAIL, OBJECT_TAIL, AROUND_TAIL).
 *   5. deal        launch-simple deals the text voice and the world from the name (no camera slot): the unnamed
 *                  scaffold plays the floor, ten names deal 2+ voices and 3+ built worlds (never a photograph: that is
 *                  the deck's, for the brief's own subject), the same name the same deal.
 *   6. plan        launch-simple plays the spine: every act the device its verb asks for (lib/spine VERB_DEVICES), one
 *                  signature at most and at the turn, no spine error, every scene drawn by a house scene (SCENE_DRAW).
 *   7. item 29     no camera float: Film.tsx without a Float (holds creep on purpose now: the motion floor asks for it).
 *   8. deck.py     reads the same library from meta.ts, deals two or three with a line and a picture device, never a
 *                  recent set, the needs-gated devices only with --have (or the brief's words), and writes src/dealt.ts;
 *                  eight deals in a row walk the library (recency-weighted), each holding a device the last four lacked.
 *
 * It lays the template over the Remotion starter in a temp folder and imports through the starter's tsx (npm install in
 * assets/remotion-starter first). Usage (from the skill root): node scripts/test/creative.test.mjs [--verbose]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findPython } from '../py.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const STARTER = path.join(SKILL, 'assets', 'remotion-starter');
const TPL = path.join(SKILL, 'assets', 'templates', 'launch-simple');
const TSX = path.join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/creative.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!fs.existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-creative-'));
const DIR = path.join(TMP, 'film');
fs.cpSync(path.join(STARTER, 'src'), path.join(DIR, 'src'), { recursive: true });
const tj = JSON.parse(fs.readFileSync(path.join(TPL, 'template.json'), 'utf8'));
for (const f of tj.copy) {
  fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true });
  fs.copyFileSync(path.join(TPL, f), path.join(DIR, f));
}
for (const f of tj.remove ?? []) fs.rmSync(path.join(DIR, f), { force: true });
fs.copyFileSync(path.join(STARTER, 'package.json'), path.join(DIR, 'package.json'));
fs.symlinkSync(path.join(STARTER, 'node_modules'), path.join(DIR, 'node_modules'), 'junction');
const url = (p) => pathToFileURL(path.join(DIR, 'src', p)).href;
const writeDealt = (creative) => fs.writeFileSync(path.join(DIR, 'src', 'dealt.ts'), `export const DEALT: { direction: string; deal: Record<string, string>; creative?: string[]; reserve?: string[] } | null = ${creative ? JSON.stringify({ direction: '', deal: {}, creative }) : 'null'};\n`);
const writeName = (name) => fs.writeFileSync(path.join(DIR, 'src', 'brand', 'identity.ts'), `export const IDENTITY = { name: ${JSON.stringify(name)}, supplied: false } as const;\n`);

/** Run a probe body (TypeScript, top-level await) in a fresh process; it sets `out`. */
const run = (body) => {
  const file = path.join(DIR, `probe-${Math.round(Math.random() * 1e9)}.mts`);
  fs.writeFileSync(file, `let out: any = {};\ntry {\n${body}\n} catch (e: any) { out.error = String(e?.message ?? e).split('\\n')[0]; }\nout.issues = ((globalThis as any).__cineticGateIssues ?? []).map((x: any) => x.rule + ': ' + x.message);\nconsole.log('@@' + JSON.stringify(out));\n`);
  const r = spawnSync(process.execPath, [TSX, file], { cwd: DIR, encoding: 'utf8', env: { ...process.env, CINETIC_GATE: '' } });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
  return line ? JSON.parse(line.slice(2)) : { error: (r.stderr || r.stdout || 'no output').trim().split('\n').slice(-3).join(' | ') };
};

try {
  // ---- 1-4: the library, read through its modules
  const lib = run(`
  const I: any = await import(${JSON.stringify(url('fx/creative/index.tsx'))});
  const M: any = await import(${JSON.stringify(url('fx/creative/meta.ts'))});
  const film = (fps: number) => ({ fps, width: 1920, height: 1080 });
  out.meta = M.CREATIVE_META.map((m: any) => ({ id: m.id, role: m.role, family: m.family, needs: m.needs, tail: m.tail, handover: !!m.handover, ends: m.ends }));
  out.recipes = Object.fromEntries(Object.entries(I.RECIPES).map(([k, r]: any) => [k, { id: r.id, len: r.recipe.length, params: Object.keys(r.params).length }]));
  const PX: any = await import(${JSON.stringify(url('fx/creative/PixelAssemble.tsx'))});
  const OT: any = await import(${JSON.stringify(url('fx/creative/ObjectTurn.tsx'))});
  const LO: any = await import(${JSON.stringify(url('fx/creative/LogoOrbit.tsx'))});
  const SC: any = await import(${JSON.stringify(url('fx/creative/SplitCompare.tsx'))});
  const DS: any = await import(${JSON.stringify(url('fx/creative/DataSculpture.tsx'))});
  const CF: any = await import(${JSON.stringify(url('fx/creative/ColourFlood.tsx'))});
  const ZW: any = await import(${JSON.stringify(url('fx/creative/ZoomWall.tsx'))});
  const PA: any = await import(${JSON.stringify(url('fx/creative/PhotoArc.tsx'))});
  const SM: any = await import(${JSON.stringify(url('fx/creative/ShapeMorph.tsx'))});
  const DB: any = await import(${JSON.stringify(url('fx/creative/DotButton.tsx'))});
  const WS: any = await import(${JSON.stringify(url('fx/creative/WordSwap.tsx'))});
  const SX: any = await import(${JSON.stringify(url('fx/creative/ScaleContrast.tsx'))});
  const TW: any = await import(${JSON.stringify(url('fx/creative/TypeWindow.tsx'))});
  const TO: any = await import(${JSON.stringify(url('fx/creative/TypeObject.tsx'))});
  const SA: any = await import(${JSON.stringify(url('fx/creative/SplitAround.tsx'))});
  const TY: any = await import(${JSON.stringify(url('fx/creative/type.tsx'))});
  const CU: any = await import(${JSON.stringify(url('fx/creative/CursorFollow.tsx'))});
  const BS: any = await import(${JSON.stringify(url('fx/creative/BubbleSwarm.tsx'))});
  const LS: any = await import(${JSON.stringify(url('fx/creative/LetterSwing.tsx'))});
  const finite = (v: any): boolean => (typeof v === 'number' ? Number.isFinite(v) : Array.isArray(v) ? v.every(finite) : v && typeof v === 'object' ? Object.values(v).every(finite) : true);
  // each device's pure state at fps 30 and 60 over a 2.5 s beat: finite, deterministic, landed by its end, held after
  const box = { x: 510, y: 250, w: 900, h: 580 };
  const runs: Record<string, (t: number, fps: number) => any> = {
    'pixel-assemble': (t, fps) => { const c = PX.pixelCells(box, { x: 960, y: 540 }, 7, film(fps)); const s = PX.pixelState(t, c, film(fps)); return { done: s.whole, close: s.close, n: s.tiles.length }; },
    'object-turn': (t, fps) => { const s = OT.turnState(t, film(fps)); return { done: s.landed, rotY: s.rotY, rotX: s.rotX, z: s.z, x: s.x }; },
    'logo-orbit': (t, fps) => { const s = LO.orbitState(t, 6, 0.58 * 2.5 * fps, film(fps)); return { done: s.grow >= 1, grow: s.grow, tiles: s.tiles.map((x: any) => x.opacity) }; },
    'split-compare': (t, fps) => { const s = SC.splitState(t, 0.68 * 2.5 * fps, film(fps)); return { done: s.whole, divider: s.divider }; },
    'data-sculpture': (t, fps) => { const s = DS.dataState(t, 2.5 * fps, { to: 3.4 }, 7, film(fps)); return { done: s.landed, h: s.h, value: s.value }; },
    'colour-flood': (t, fps) => { const s = CF.floodState(t, 0.34 * 2.5 * fps, -1, { x: 960, y: 540 }, film(fps)); return { done: s.covers, r: s.r, check: s.check }; },
    'zoom-wall': (t, fps) => { const s = ZW.wallState(t, 2.5 * fps, film(fps)); return { done: s.landed, scale: s.scale }; },
    'photo-arc': (t, fps) => { const n = PA.arcCount(0.55 * 2.5 * fps, film(fps)); const s = PA.arcState(t, n, 0.55 * 2.5 * fps, film(fps)); return { done: s.landed, open: s.open }; },
    'shape-morph': (t, fps) => { const sh = [0, 1, 2, 3].map((i) => ({ box: { x: 900 - i * 100, y: 500 - i * 60, w: 120 + i * 200, h: 80 + i * 120 }, r: 20, fill: '#2F6BFF' })); const s = SM.morphState(t, 2.5 * fps, sh, film(fps)); return { done: s.done, box: s.box, open: s.open }; },
    'dot-button': (t, fps) => { const s = DB.dotState(t, { x: 760, y: 700, w: 400, h: 110 }, film(fps)); return { done: s.done, box: s.box, iris: s.iris }; },
    'cursor-follow': (t, fps) => { const s = CU.cursorState(t, { x: 700, y: 800 }, { x: 960, y: 700 }, 0.5 * 2.5 * fps, film(fps)); return { done: s.landed && s.pointerOpacity === 0, zoom: s.zoom, look: s.look }; },
    'bubble-swarm': (t, fps) => { const s = BS.swarmState(t, 6, 0.58 * 2.5 * fps, film(fps)); return { done: s.landed, b: s.bubbles, arrive: s.arrive }; },
  };
  out.states = {};
  for (const [id, fn] of Object.entries(runs)) {
    const r: any = {};
    for (const fps of [30, 60]) {
      const end = Math.round(2.5 * fps);
      const a = fn(end - 1, fps), b = fn(end - 1, fps), c = fn(end + 30, fps), d = fn(end + 90, fps);
      const all = Array.from({ length: end }, (_, t) => fn(t, fps));
      r[fps] = { finite: all.every(finite), det: JSON.stringify(a) === JSON.stringify(b), done: !!a.done, held: JSON.stringify(c) === JSON.stringify(d) };
    }
    out.states[id] = r;
  }
  // item 29: photo-arc's row stays level (one y for every card at every frame), travels one way (each card's x moves
  // monotonically until the landing), never overlaps (neighbours at least a card plus most of the gap apart)
  {
    const at = 75, n = PA.arcCount(at, film(60));
    const ys = new Set(); let backtrack = 0; let minGap = Infinity; let prev: any = null;
    for (let t = 0; t <= at + 60; t++) {
      const s = PA.arcState(t, n, at, film(60));
      s.cards.forEach((c: any) => ys.add(Math.round(c.y * 1000)));
      if (t <= at) {
        const xs = s.cards.map((c: any) => c.x);
        for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i] - xs[i - 1]);
        if (prev) xs.forEach((x: number, i: number) => { if (x - prev[i] > 1e-6) backtrack++; });
        prev = xs;
      }
    }
    out.arc = { ys: ys.size, backtrack, minGap: Math.round(minGap), card: Math.round(PA.ARC.h * PA.ARC.aspect + PA.ARC.gap * 0.9) };
  }
  // item 29: cursor-follow's camera makes one travel and one pull: the zoom never grows, each axis of the look point turns
  // at most once, and it lands on the whole product (zoom 1, the frame's centre)
  {
    let zoomUp = 0, turnsX = 0, turnsY = 0, dx0 = 0, dy0 = 0, pz = Infinity, pl: any = null;
    for (let t = 0; t <= 200; t++) {
      const s = CU.cursorState(t, { x: 640, y: 820 }, { x: 980, y: 690 }, 75, film(60));
      if (s.zoom > pz + 1e-9) zoomUp++;
      pz = s.zoom;
      if (pl) {
        const dx = s.look.x - pl.x, dy = s.look.y - pl.y;
        if (Math.abs(dx) > 1e-6) { if (dx0 && Math.sign(dx) !== Math.sign(dx0)) turnsX++; dx0 = dx; }
        if (Math.abs(dy) > 1e-6) { if (dy0 && Math.sign(dy) !== Math.sign(dy0)) turnsY++; dy0 = dy; }
      }
      pl = s.look;
    }
    const end = CU.cursorState(400, { x: 640, y: 820 }, { x: 980, y: 690 }, 75, film(60));
    out.cursor = { zoomUp, turnsX, turnsY, end: { zoom: end.zoom, x: end.look.x, y: end.look.y, landed: end.landed } };
  }
  // bubble-swarm: the bubbles never overlap (4-7 bubbles, many seeds) and hold still between their pop and their pull
  {
    let overlaps = 0;
    for (let seed = 0; seed < 24; seed++) for (const n of [4, 5, 6, 7]) {
      const ws = Array.from({ length: n }, (_, i) => 300 + ((seed * 37 + i * 91) % 260));
      const b = BS.swarmLayout(ws, seed, film(60));
      for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
        const ox = Math.min(b[i].x + b[i].w, b[j].x + b[j].w) - Math.max(b[i].x, b[j].x);
        const oy = Math.min(b[i].y + b[i].h, b[j].y + b[j].h) - Math.max(b[i].y, b[j].y);
        if (ox > 0 && oy > 0) overlaps++;
      }
    }
    const a = BS.swarmState(80, 6, 87, film(60)), b2 = BS.swarmState(84, 6, 87, film(60));
    out.swarm = { overlaps, held: JSON.stringify(a.bubbles.map((x: any) => x.pop)) === JSON.stringify(b2.bubbles.map((x: any) => x.pop)) && a.bubbles.every((x: any) => x.pull === 0) };
  }
  // letter-swing lands at exactly zero degrees and never swings wider than it starts; scale-contrast's rising letters
  // start wholly under their mask (the first frame shows no stub of an ascender)
  out.swing = { end: [32, 33, 60, 400].map((t) => LS.swingAngle(t)), max: Math.max(...Array.from({ length: 33 }, (_, t) => Math.abs(LS.swingAngle(t)))), from: LS.SWING.from };
  out.mask = { from: SX.MASK.from, bottom: SX.MASK.bottom, rise0: SX.letterRise(0, 0, 1) };
  out.turnEnd = OT.turnState(400, film(60));
  out.turnStart = OT.turnState(0, film(60));
  // line devices: their state lands and holds too
  const k = 1;
  out.lineStates = {
    'word-swap': [WS.swapState(400, 4, ['trip', 'week', 'weekend'], k).cur, WS.swapState(900, 4, ['trip', 'week', 'weekend'], k).cur],
    'type-window': [TW.windowState(300, 100, 260, k).done, TW.windowState(300, 100, 260, k).zoom, TW.windowState(600, 100, 260, k).zoom],
    'type-object': [TO.objectState(400, 100, k).open, TO.objectState(900, 100, k).open],
    'split-around': [SA.aroundState(400, 60, 150, k).open, SA.aroundState(900, 60, 150, k).open],
  };
  // 4: the meta arithmetic against the components'
  out.timings = {
    build: [3, 5, 7].map((n) => [M.lineResolve('type-window', n), TY.buildFrames(n), M.lineResolve('type-object', n), M.lineResolve('split-around', n)]),
    swap: [[4, 2], [5, 3], [3, 1]].map(([n, a]) => [M.lineResolve('word-swap', n, 6, a), WS.swapResolve(n, a)]),
    scale: [4, 7, 11].map((c) => [M.lineResolve('scale-contrast', 4, c), SX.scaleResolve(c)]),
    swing: [[3, 5], [5, 7], [8, 4]].map(([n, c]) => [M.lineResolve('letter-swing', n, c), LS.swingResolve(n, c)]),
    tails: [[M.metaOf('type-window').tail, TW.WINDOW_TAIL], [M.metaOf('type-object').tail, TO.OBJECT_TAIL], [M.metaOf('split-around').tail, SA.AROUND_TAIL]],
  };
  `);
  result(!lib.error, 'the creative library imports', lib.error);
  if (!lib.error) {
    const ids = lib.meta.map((m) => m.id);
    result(ids.length >= 12 && new Set(ids).size === ids.length, `library: ${ids.length} finished devices, ids unique (at least 12)`, ids.join(' '));
    result(lib.meta.some((m) => m.role === 'line') && lib.meta.some((m) => m.role === 'picture'), 'library: devices that draw lines and devices that draw pictures');
    result(new Set(lib.meta.map((m) => m.family)).size >= 12, 'library: at least 12 families of idea', [...new Set(lib.meta.map((m) => m.family))].join(' '));
    const thin = ids.filter((i) => !lib.recipes[i] || lib.recipes[i].id !== i || lib.recipes[i].len < 160 || lib.recipes[i].params < 3);
    result(!thin.length, 'recipes: every device has its recipe (160+ characters, its numbers) and 3+ house parameters', thin.join(' '));
    const bad = Object.entries(lib.states).filter(([, r]) => ![30, 60].every((f) => r[f].finite && r[f].det && r[f].done && r[f].held));
    result(!bad.length, 'recipes: every picture device is finite, deterministic, lands inside a 2.5 s beat and holds still after (30 and 60 fps)', JSON.stringify(bad));
    const ls = lib.lineStates;
    result(ls['word-swap'][0] === 2 && ls['word-swap'][1] === 2 && ls['type-window'][0] && ls['type-window'][1] === ls['type-window'][2] && ls['type-object'][0] === 1 && ls['type-object'][1] === 1 && ls['split-around'][0] === 1, 'recipes: the line devices land on their last state and hold it', JSON.stringify(ls));
    const te = lib.turnEnd;
    result(te.rotY === 0 && te.rotX === 0 && te.z === 0 && te.x === 0 && te.glare === 0 && Math.abs(lib.turnStart.rotY) > 30, 'no tilt: object-turn starts edge-on and lands facing the camera at 0 deg, its light band gone', JSON.stringify({ end: te, start: lib.turnStart.rotY }));
    const t = lib.timings;
    result(t.build.every((r) => r.every((x) => x === r[0])) && t.swap.every(([a, b]) => a === b) && t.scale.every(([a, b]) => a === b) && t.swing.every(([a, b]) => a === b) && t.tails.every(([a, b]) => a === b), 'timings: meta.ts resolves and tails equal the components\' arithmetic', JSON.stringify(t));
    // no device rotates at rest: only object-turn mentions a rotate transform, and lands at zero
    const src = fs.readdirSync(path.join(STARTER, 'src', 'fx', 'creative')).filter((f) => f.endsWith('.tsx') && f !== 'ObjectTurn.tsx' && f !== 'LetterSwing.tsx').filter((f) => /rotate[XYZ]?\(/.test(fs.readFileSync(path.join(STARTER, 'src', 'fx', 'creative', f), 'utf8').replace(/rotate\(\$\{\(\(t \/ k\) \* SPLIT\.spin\)/g, '')));
    result(!src.length, 'no tilt: no other device turns its cards (a spinner\'s arc excepted)', src.join(' '));
    const ar = lib.arc;
    result(ar.ys === 1 && ar.backtrack === 0 && ar.minGap >= ar.card, "item 29: photo-arc's row stays level, travels one way and lands, its cards never overlap", JSON.stringify(ar));
    const cu = lib.cursor;
    result(cu.zoomUp === 0 && cu.turnsX <= 1 && cu.turnsY <= 1 && Math.abs(cu.end.zoom - 1) < 1e-9 && Math.abs(cu.end.x - 960) < 1e-6 && Math.abs(cu.end.y - 540) < 1e-6 && cu.end.landed, "item 29: cursor-follow's camera makes one travel and one pull, never drifts back, and lands on the whole product", JSON.stringify(cu));
    result(lib.swarm.overlaps === 0 && lib.swarm.held, 'bubble-swarm: bubbles never overlap (4-7, 24 seeds) and hold still between pop and pull', JSON.stringify(lib.swarm));
    const sw = lib.swing;
    result(sw.end.every((x) => x === 0) && sw.max <= sw.from + 1e-9, "no tilt: letter-swing's letters land at exactly 0 deg and never swing past their start", JSON.stringify(sw));
    result(lib.mask.from + 0.1 >= lib.mask.bottom && lib.mask.rise0 === 0, 'scale-contrast: rising letters start wholly under the mask (no ascender stub on the first frames)', JSON.stringify(lib.mask));
    const bob = fs.readdirSync(path.join(STARTER, 'src', 'fx', 'creative')).filter((f) => /Math\.sin\([^)]*\bf\b|Math\.sin\([^)]*\bt \//.test(fs.readFileSync(path.join(STARTER, 'src', 'fx', 'creative', f), 'utf8')));
    result(!bob.length, 'no bobbing: no device drives a position with a sine of the frame', bob.join(' '));
  }

  // ---- 5: launch-simple's deal from a name (the spine template deals the text voice and the world; the creative set is
  // the deck's, section 8, for the templates that play it)
  const deal = run(`
  const D: any = await import(${JSON.stringify(url('deal.ts'))});
  out.slots = Object.keys(D.DEVICES); out.floor = D.FLOOR; out.deal = D.DEAL; out.source = D.DEAL_SOURCE;
  `);
  const dealOfName = (name) => {
    writeName(name);
    return run(`const D: any = await import(${JSON.stringify(url('deal.ts'))}); out.deal = D.DEAL; out.source = D.DEAL_SOURCE; out.devices = D.DEVICES; out.floor = D.FLOOR;`);
  };
  result(!deal.error, 'the deal imports', deal.error);
  if (!deal.error) {
    result(JSON.stringify(deal.slots) === JSON.stringify(['voice', 'ground']), 'deal: the spine template deals the text voice and the world, nothing that moves the camera (item 29: the scenes make one push that lands)', JSON.stringify(deal.slots));
    result(JSON.stringify(deal.deal) === JSON.stringify(deal.floor) && /the name "\[/.test(deal.source), 'deal: the unnamed scaffold plays the floor', JSON.stringify({ deal: deal.deal, source: deal.source }));
    const names = ['Ferry', 'Morrow', 'Tern', 'Quill', 'Harbor', 'Lumen', 'Pocket', 'Atlas', 'Sable', 'Juniper'];
    const got = names.map((n) => dealOfName(n));
    const ok = got.every((g) => !g.error && g.deal);
    const BUILT = ['paleSky', 'nearWhite', 'electric', 'blackField', 'deepField'];
    result(ok && new Set(got.map((g) => g.deal.voice)).size >= 2 && new Set(got.map((g) => g.deal.ground)).size >= 3,
      `deal: ten names deal ${ok ? new Set(got.map((g) => g.deal.voice)).size : 0} voices and ${ok ? new Set(got.map((g) => g.deal.ground)).size : 0} worlds (random across the slots)`, JSON.stringify(got.map((g) => g.deal ?? g.error)));
    result(ok && got.every((g) => BUILT.includes(g.deal.ground)), 'deal: a name deals a built world only (a photograph only by the deck, for the brief\'s own subject)', JSON.stringify(got.map((g) => g.deal?.ground)));
    const again = dealOfName('Ferry');
    result(ok && JSON.stringify(again.deal) === JSON.stringify(got[0].deal), 'deal: the same name deals the same voice and world', JSON.stringify([again.deal, got[0].deal]));
  }

  // ---- 6: the plan in launch-simple: the spine's devices by verb, each scene drawn by a house scene
  writeName('Ferry');
  writeDealt(null);
  const a = run(`
  const T: any = await import(${JSON.stringify(url('timeline.ts'))});
  const S: any = await import(${JSON.stringify(url('acts/stage.tsx'))});
  const L: any = await import(${JSON.stringify(url('lib/spine.ts'))});
  out.devices = T.SPINE_PLAN.devices; out.acts = T.SPINE_PLAN.acts.map((x: any) => ({ verb: x.verb, world: x.world, asks: L.devicesFor(x.verb) }));
  out.drawn = T.SCENES.map((s: any) => { try { return [s.name, S.defOf(s.i).form]; } catch (e: any) { return [s.name, 'MISSING ' + String(e?.message ?? e)]; } });
  out.errors = T.SPINE_PLAN.issues.errors;
  `);
  result(!a.error, 'plan: launch-simple imports its spine', a.error);
  if (!a.error) {
    const sig = a.devices.filter((d) => d.signature);
    result(a.devices.length >= a.acts.length && a.devices.every((d) => d.fits && a.acts[d.act].asks.includes(d.id)),
      `plan: every act plays the device its verb asks for (${a.devices.map((d) => `${a.acts[d.act].verb}: ${d.id}`).join(', ')})`, JSON.stringify(a.devices));
    result(sig.length <= 1 && sig.every((d) => a.acts[d.act].world === 'turn') && !a.errors.length,
      'plan: one signature device at most, at the turn; the spine without errors', JSON.stringify({ sig, worlds: a.acts.map((x) => x.world), errors: a.errors }));
    result(a.drawn.every(([, f]) => !/^MISSING/.test(f)), 'plan: every scene of the spine has its house scene (src/product.tsx SCENE_DRAW)', JSON.stringify(a.drawn));
  }
  const film = fs.readFileSync(path.join(TPL, 'src', 'Film.tsx'), 'utf8');
  result(!/<Float\b/.test(film), 'item 29: Film.tsx draws no camera float');

  // ---- 8: deck.py
  const PY = findPython({ numpy: false, quiet: true }) ?? ['python3'];
  const pyCode = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('deck', ${JSON.stringify(path.join(SKILL, 'scripts', 'deck.py'))})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
lib = m.creative_library(${JSON.stringify(DIR)})
out = {'ids': [d['id'] for d in lib]}
deals = [m.deal_creative(lib, n, 'a calm app', [], []) for n in ['Ferry', 'Morrow', 'Tern', 'Quill', 'Harbor', 'Lumen']]
out['deals'] = [d['deal'] for d in deals]
role = {d['id']: d['role'] for d in lib}
out['shape'] = all(2 <= len(d['deal']) <= 3 and any(role[x] == 'line' for x in d['deal']) and any(role[x] == 'picture' for x in d['deal']) for d in deals)
first = deals[0]['deal']
again = m.deal_creative(lib, 'Ferry', 'a calm app', [], [first])['deal']
out['recent'] = {'same': sorted(first) == sorted(again), 'shared': len(set(first) & set(again))}
gated = set()
for n in range(40):
    gated |= set(m.deal_creative(lib, 'film%d' % n, 'a calm app', [], [])['deal'])
out['gated'] = sorted(x for x in gated if x in ('logo-orbit', 'data-sculpture'))
opened = set()
for n in range(60):
    opened |= set(m.deal_creative(lib, 'film%d' % n, 'it works with Slack and GitHub, 3x faster', [], [])['deal'])
out['opened'] = sorted(x for x in opened if x in ('logo-orbit', 'data-sculpture'))
# eight deals in a row, each one the next one's history: the recency weighting walks the library
recent, seen = [], []
for i in range(8):
    d = m.deal_creative(lib, 'run%d' % i, 'a calm app', [], recent)['deal']
    seen.append(d)
    recent = [d] + recent[:3]
out['walk'] = len(set(x for s in seen for x in s))
out['open_n'] = len([d for d in lib if not d['needs'] or all(x not in ('logos', 'count', 'photos') for x in d['needs'])])
out['fresh'] = all(any(x not in set(y for s in seen[max(0, i - 4):i] for y in s) for x in seen[i]) for i in range(1, 8))
photo, nophoto = set(), set()
for n in range(40):
    photo |= set(m.deal_creative(lib, 'p%d' % n, 'it turns your photos into a book', [], [])['deal'])
    nophoto |= set(m.deal_creative(lib, 'p%d' % n, 'a calm app', [], [])['deal'])
out['photo'] = ['photo-arc' in photo, 'photo-arc' in nophoto]
print('@@' + json.dumps(out))
`;
  const r = spawnSync(PY[0], [...PY.slice(1), '-c', pyCode], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
  if (!line) result(false, 'deck.py: the creative deal runs', (r.stderr || r.stdout || r.error?.message || '').trim().split('\n').slice(-3).join(' | '));
  else {
    const o = JSON.parse(line.slice(2));
    result(JSON.stringify(o.ids) === JSON.stringify(lib.meta?.map((x) => x.id)), 'deck.py: reads the same library from meta.ts', o.ids.join(' '));
    result(o.shape && new Set(o.deals.map((x) => [...x].sort().join())).size >= 5, 'deck.py: deals two or three, a line and a picture device, different sets for different films', JSON.stringify(o.deals));
    result(!o.recent.same && o.recent.shared <= 1, 'deck.py: never a recent set, at most one device shared with the last film', JSON.stringify(o.recent));
    result(!o.gated.length && o.opened.length === 2, 'deck.py: logo-orbit and data-sculpture only when the film has logos and a figure (--have or the brief\'s words)', JSON.stringify(o));
    result(o.walk >= Math.min(o.open_n, 13) && o.fresh, `deck.py: eight deals in a row play ${o.walk} of the ${o.open_n} devices open to them, each with a device the last four deals did not play`, JSON.stringify(o.walk));
    result(o.photo[0] && !o.photo[1], 'deck.py: photo-arc only for a film with photos (--have photos or the brief\'s words)', JSON.stringify(o.photo));
  }
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
}
console.log(failed ? `creative tests: ${failed} failed` : 'creative tests: all pass');
process.exit(failed ? 1 : 0);
