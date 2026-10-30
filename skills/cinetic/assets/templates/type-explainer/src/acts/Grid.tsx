import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { ContentTile, face, shadeRgba, type TileNode, tileArrival, worldNodes } from '../kit';
import { clamp, E, lmix, mix, prog, rand } from '../lib/anim';
import { glideValue } from '../lib/continuity';
import { creep } from '../lib/handoff';
import { EXPLAIN } from '../explain';
import { DEAL } from '../deal';
import { ACT, CUE, f60x, FPS, H, LABELS, W } from '../timeline';
import { WORLD } from './product';
import { ActGround, capOf, MarkWord, PAGE, useAbs } from './stage';
import { HUB, systemK, systemSize } from './System';

// GRID - the mark that was a word is now the hub of the product, and its parts gather round it as content tiles
// (kit ContentTile: each part's glyph or real mark, its name, a preview of what it holds), never bare squares. The
// dealt device (src/deal.ts):
//   hive   the parts are born round the hub in one radial wave (all of them inside 10 f at 60 fps, tumbling in from
//          depth), the product's records filling the outer cells smaller and softer, so the grid has an edge
//   ring   the parts on an ellipse round the hub, tumbling in one after another and orbiting slowly, the far side
//          smaller and softer
//   stack  the parts in three planes round the hub (a far wall turned away, soft cards crossing the edges in front),
//          the camera pushing through them
// Three parts are read, one a second: the tile lifts toward the camera and its name rises beside it at a readable
// size while the camera leans toward it; the rest stay texture. Then the parts gather back into the mark, outer first.

/** A placed tile: its centre, its size, its depth (0 near .. 1 far), its tumble, the frame it arrives. */
type Cell = { x: number; y: number; size: number; depth: number; tilt: [number, number]; at: number; node: TileNode; module: number; d: number; plane?: 'far' | 'mid' | 'near' };

const MODULES: TileNode[] = EXPLAIN.modules.map((m, i) => ({ label: m.label, glyph: m.glyph, logo: m.logo, sub: WORLD.records[i % Math.max(1, WORLD.records.length)]?.title, seed: `${EXPLAIN.name}:m${i}` }));
const FILL = worldNodes(WORLD, 16);
const tumble = (k: string): [number, number] => [(rand(`${k}:a`) < 0.5 ? -1 : 1) * (20 + 40 * rand(`${k}:x`)), (rand(`${k}:b`) < 0.5 ? -1 : 1) * (20 + 40 * rand(`${k}:y`))];

/** The tiles of the dealt device, nearest first (the modules take the near places). Pure. */
export const cells = (): Cell[] => {
  const n = MODULES.length;
  const list: Cell[] = [];
  if (DEAL.grid === 'ring') {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = W / 2 + Math.cos(a) * 640 * U;
      const y = H / 2 + Math.sin(a) * 300 * U;
      list.push({ x, y, size: 210 * U, depth: 0, tilt: tumble(`ring${i}`), at: CUE.tiles + f60x(4 * i), node: MODULES[i], module: i, d: Math.hypot(x - W / 2, y - H / 2) });
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) / 10) * Math.PI * 2;
      const x = W / 2 + Math.cos(a) * 980 * U;
      const y = H / 2 + Math.sin(a) * 470 * U;
      list.push({ x, y, size: 170 * U, depth: 0.85, tilt: tumble(`ringo${i}`), at: CUE.tiles + f60x(10 + 3 * i), node: FILL[i % FILL.length], module: -1, d: Math.hypot(x - W / 2, y - H / 2) });
    }
    return list;
  }
  if (DEAL.grid === 'stack') {
    // nearest the hub first: the three parts read take the places the camera reaches without cropping them
    const mids = [[-300, -330], [330, 300], [-560, 140], [600, -200], [0, -400], [-80, 400], [-640, -280], [660, 230], [-860, -40], [860, 20]];
    for (let i = 0; i < n; i++) {
      const [dx, dy] = mids[i];
      list.push({ x: W / 2 + dx * U, y: H / 2 + dy * U, size: 200 * U, depth: 0, tilt: tumble(`st${i}`), at: CUE.tiles + f60x(3 * i), node: MODULES[i], module: i, d: Math.hypot(dx, dy) * U, plane: 'mid' });
    }
    const fars = [[-760, -330], [760, -330], [-860, 260], [860, 260], [0, -470], [-360, 470], [360, 470]];
    fars.forEach(([dx, dy], i) => list.push({ x: W / 2 + dx * U, y: H / 2 + dy * U, size: 230 * U, depth: 1, tilt: tumble(`stf${i}`), at: CUE.tiles + f60x(6 + 2 * i), node: FILL[i], module: -1, d: Math.hypot(dx, dy) * U, plane: 'far' }));
    const nears = [[-930, 470], [960, -470]];
    nears.forEach(([dx, dy], i) => list.push({ x: W / 2 + dx * U, y: H / 2 + dy * U, size: 260 * U, depth: -0.4, tilt: [12, i ? -16 : 16], at: CUE.tiles + f60x(2 * i), node: FILL[8 + i], module: -1, d: Math.hypot(dx, dy) * U, plane: 'near' }));
    return list;
  }
  // hive: a staggered grid round the hub, nearest first
  const p = 300 * U;
  for (let j = -2; j <= 2; j++)
    for (let i = -4; i <= 4; i++) {
      if (i === 0 && j === 0) continue;
      const x = W / 2 + (i + (Math.abs(j) % 2 ? 0.5 : 0)) * p;
      const y = H / 2 + j * p * 0.8;
      if (x < -p || x > W + p) continue;
      list.push({ x, y, size: 0, depth: 0, tilt: tumble(`hv${i}:${j}`), at: 0, node: FILL[0], module: -1, d: Math.hypot(x - W / 2, y - H / 2) });
    }
  list.sort((a, b) => a.d - b.d || a.x - b.x);
  const reach = list[list.length - 1].d;
  return list.map((c, k) => {
    const mod = k < n;
    return { ...c, module: mod ? k : -1, node: mod ? MODULES[k] : FILL[k % FILL.length], size: (mod ? 210 : 170) * U, depth: mod ? 0 : clamp((c.d - 480 * U) / (reach - 480 * U)) * 0.9 + 0.1, at: CUE.tiles + f60x((10 * c.d) / reach) };
  });
};

/** The frame a tile is born (sync reads it). */
export const bornAt = (c: Cell) => c.at;

/** The grid's camera: the system act's push carried on, a creep, and the stack's push through its planes. */
const gridPush = (F: number) => (DEAL.grid === 'stack' ? mix(1, 1.18, prog(F, ACT.grid.from, ACT.grid.from + f60x(150), E.strongInOut)) : 1);
const gridK = (F: number) => systemK(F) * creep(F, ACT.grid.from, { pctPerSec: 0.014 }, FPS) * gridPush(F);
/** The hub's height in the grid's world: the mark that was a word grows into the hub over 40 f. */
const hubWorld = (F: number) => capOf(systemSize()) * HUB.mark * lmix(1, HUB.grow, prog(F, ACT.grid.from, ACT.grid.from + f60x(40), E.glideOut));
/** The hub's height on screen at frame F: the end act takes the mark over at exactly this size. */
export const hubOnScreen = (F: number) => hubWorld(F) * gridK(F);

export const Grid: React.FC = () => {
  const F = useAbs('grid');
  const hubH = hubWorld(F);
  const all = cells();
  const dmax = Math.max(...all.map((c) => c.d));
  const t = (F - ACT.grid.from) / FPS;
  const push = gridPush(F);
  /** Where a tile is at this frame: the ring orbits, the stack's planes parallax under the push, the hive drifts with depth; the gather pulls it home. */
  const place = (c: Cell) => {
    const g0 = CUE.gather + f60x(14 * (1 - c.d / dmax));
    const g = prog(F, g0, g0 + f60x(22), E.buildIn);
    const orbit = DEAL.grid === 'ring' ? (2.2 * Math.PI * t) / 180 : 0;
    const ox = DEAL.grid === 'ring' ? (c.x - W / 2) * Math.cos(orbit) - ((c.y - H / 2) * Math.sin(orbit) * 640) / 300 : c.x - W / 2;
    const oy = DEAL.grid === 'ring' ? (c.y - H / 2) * Math.cos(orbit) + ((c.x - W / 2) * Math.sin(orbit) * 300) / 640 : c.y - H / 2;
    const par = c.plane === 'far' ? 0.55 : c.plane === 'near' ? 1.6 : 1;
    const kp = DEAL.grid === 'stack' ? push ** (par - 1) : 1;
    const drift = 10 * U * t * (1 - c.depth * 0.6);
    // the ring's far side (its top) sits deeper: smaller and softer
    const depth = DEAL.grid === 'ring' && c.module >= 0 ? 0.3 * clamp(0.5 - oy / (600 * U)) : c.depth;
    // a read part lifts toward the camera while its name is up, and settles back when the next is read
    const until = c.module >= 0 && c.module < 3 ? (c.module < 2 ? LABELS[c.module + 1] : CUE.gather) : 0;
    const lifted = c.module >= 0 && c.module < 3 ? prog(F, LABELS[c.module], LABELS[c.module] + f60x(24), E.glideOut) * (1 - prog(F, until, until + f60x(24), E.glideOut)) : 0;
    const s = mix(1, 0.62, clamp(depth)) * (depth < 0 ? 1.5 : 1) * mix(1, 1.3, lifted) * mix(1, 0.2, g);
    return { x: mix(W / 2 + ox * kp + drift, W / 2, g), y: mix(H / 2 + oy * kp - drift * 0.2, H / 2, g), g, depth, lifted, s };
  };
  // the part being read: the camera leans toward it (a glide, never a jump), and back to the hub for the gather
  const focus = (m: number) => all.find((c) => c.module === m) ?? all[0];
  const lean = 0.35;
  const lx = glideValue(F, LABELS.map((at, m) => ({ at, value: (W / 2 - focus(m).x) * lean })), 0, { frames: 40, ease: E.settleOut });
  const ly = glideValue(F, LABELS.map((at, m) => ({ at, value: (H / 2 - focus(m).y) * lean })), 0, { frames: 40, ease: E.settleOut });
  const back = prog(F, CUE.gather - f60x(20), CUE.gather + f60x(20), E.stdInOut);
  const k = gridK(F);
  const ui = TYPE.caption.size * 1.15 * U;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="grid" from="system" />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, perspective: `${1900 * U}px`, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `translate3d(${(lx * (1 - back)).toFixed(2)}px, ${(ly * (1 - back)).toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>
        {all
          .slice()
          .sort((a, b) => b.depth - a.depth)
          .map((c, i) => {
            const a = tileArrival(F, c.at, { tilt: c.tilt, depthPx: 520 * U, dropPx: 60 * U, dur: 34 });
            if (a.opacity <= 0) return null;
            const p = place(c);
            const o = a.opacity * (1 - p.g) * (c.module < 0 ? mix(0.95, 0.55, clamp(p.depth)) : 1);
            if (o <= 0.002) return null;
            const sigma = p.depth > 0.3 ? 6 * U * clamp(p.depth) : p.depth < 0 ? 10 * U : 0;
            const rest = c.plane === 'far' ? 16 : 0; // the stack's far wall stays turned away
            const tile = <ContentTile node={c.node} theme={PAGE} w={c.size} lift={mix(64, 18, a.p) + 30 * p.lifted} />;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: o, transform: `translate3d(${(p.x - c.size / 2).toFixed(2)}px, ${(p.y - c.size / 2 + a.y).toFixed(2)}px, ${(a.z + 60 * p.lifted * U).toFixed(1)}px) rotateX(${a.rx.toFixed(2)}deg) rotateY(${(a.ry + rest).toFixed(2)}deg) scale(${p.s.toFixed(4)})` }}>
                {sigma >= 0.75 ? <Defocus sigma={sigma} style={{ position: 'relative', width: c.size, height: c.size }}>{tile}</Defocus> : tile}
              </div>
            );
          })}
        <MarkWord x={W / 2} y={H / 2} size={hubH} />
        {/* the read part's name: a chip on the lifted tile's lower half, the one line read at a time */}
        {LABELS.map((at, m) => {
          const c = focus(m);
          const until = m < 2 ? LABELS[m + 1] : CUE.gather;
          if (F < at || F >= until + f60x(14)) return null;
          const p = place(c);
          const tIn = prog(F, at, at + f60x(20), E.glideOut);
          const tOut = prog(F, until - f60x(2), until + f60x(12), E.buildIn);
          const y = p.y + (c.size * p.s) * 0.26 + (1 - tIn) * 16 * U;
          return (
            <div key={m} data-ui style={{ position: 'absolute', left: 0, top: 0, opacity: tIn * (1 - tOut), transform: `translate3d(${p.x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${mix(0.92, 1, tIn).toFixed(4)})` }}>
              <div style={{ padding: `${(ui * 0.3).toFixed(1)}px ${(ui * 0.62).toFixed(1)}px`, borderRadius: ui, background: PAGE.surface, boxShadow: `0 ${(10 * U).toFixed(1)}px ${(26 * U).toFixed(1)}px ${shadeRgba(PAGE, 0.22)}, inset 0 0 0 ${(1.5 * U).toFixed(1)}px ${PAGE.line}`, whiteSpace: 'pre' }}>
                <span data-text={`label${m + 1}`} style={face(ui, TYPE.caption.weight + 100, PAGE.text, TYPE.caption.track)}>
                  {EXPLAIN.modules[m].label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
