import React from 'react';
import { clamp, E, type Ease, fd, mix, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { FONT } from '../brand/tokens';
import type { Declares, SteppedRange } from '../timeline';

/**
 * Gather: many pieces that become one thing.
 *
 *   RingCurl    a straight row of tiles starts turning and both ends wrap round (the leader over the top, the
 *               tail along the bottom) until the row closes into a ring of the same length (32 f, accelerating),
 *               then keeps turning and slows; every tile rides the curve by its arc length
 *   BlockSwarm  coloured blocks flash at scattered spots for two frames each (4 f at 60 fps), converge into the
 *               wordmark's letter slots (18 f), sit there as letter-sized placeholders, and swap to the glyphs one by
 *               one (every 3 f)
 *   ZSwarm      copies of the old line step back into depth (-0.15 scale per 30 fps frame for 6 frames) while copies
 *               of the new line step out of it (+0.10 for 8 frames), each step leaving a fading trail; the new line
 *               jitters for a few frames and locks (26 f at 60)
 *   Comets      two point-symmetric comets (a head and a short tail) spiral out from the centre (10 f), orbit (8 f)
 *               and collapse into the mark's position at full speed (26 f, accelerating); flat accent dots, no halo
 *
 * Every state is a pure function of the frame (closed form); stepped devices decide on whole frames.
 */

type XY = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

// ---------------------------------------------------------------------------------------------- RingCurl

/** House numbers: frames at 60 fps, degrees. */
export const RING_CURL = { frames60: 32, spin: 45, decay60: 10 } as const;

export type RingCurlProps = {
  at: number;
  n: number; // tiles
  pitch: number; // px between tile centres along the row (the ring's circumference is n x pitch)
  frames?: number; // 60 fps frames (house 32)
  ease?: Ease; // house E.buildIn (accelerating: it closes at speed)
  spin?: number; // degrees the whole turns while it curls (house 45)
  decay?: number; // 60 fps frames: the time constant of the spin slowing after it closes (house 10)
  id?: string;
};

export type CurlTile = { i: number; x: number; y: number; rot: number };

/** Every tile's centre (px from the row's centre, which is also the ring's final centre) and rotation (degrees). Pure. */
export const ringCurlState = (frame: number, p: RingCurlProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const fr = Math.max(1, f60x(p.frames ?? RING_CURL.frames60, fps));
  const ease = p.ease ?? E.buildIn;
  const t = clamp((frame - p.at) / fr);
  const k = frame < p.at ? 0 : ease(t);
  const L = p.n * p.pitch;
  const R = L / (2 * Math.PI);
  // spin: on the curl's curve, then carried on and slowing exponentially after the ring closes (closed form)
  const spinDeg = p.spin ?? RING_CURL.spin;
  let spin = spinDeg * k;
  if (frame > p.at + fr) {
    const vEnd = (spinDeg * (ease(1) - ease(1 - 1 / fr))) / 1; // degrees per film frame at the close
    const tau = Math.max(1e-6, f60x(p.decay ?? RING_CURL.decay60, fps));
    spin = spinDeg + vEnd * tau * (1 - Math.exp(-(frame - p.at - fr) / tau));
  }
  const kap = (k * 2 * Math.PI) / L; // curvature
  const th = (spin * Math.PI) / 180;
  const cy = R * k; // keeps the ring's centre on the row's centre as it closes
  const tiles: CurlTile[] = Array.from({ length: p.n }, (_, i) => {
    const s = (i - (p.n - 1) / 2) * p.pitch;
    let x = s;
    let y = 0;
    if (kap > 1e-9) {
      x = Math.sin(kap * s) / kap;
      y = -(1 - Math.cos(kap * s)) / kap;
    }
    y += cy;
    // the whole turns about the centre
    const xr = x * Math.cos(th) - y * Math.sin(th);
    const yr = x * Math.sin(th) + y * Math.cos(th);
    return { i, x: xr, y: yr, rot: ((kap * s) * 180) / Math.PI * -1 + spin };
  });
  return { tiles, k, closed: t >= 1, radius: R };
};

/** Sync: the start, the close (the kick after a short silence), the frame its spin has mostly settled. */
export const ringCurlFrames = (p: RingCurlProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const fr = f60x(p.frames ?? RING_CURL.frames60, fps);
  return { start: p.at, closed: Math.ceil(p.at + fr), settled: Math.ceil(p.at + fr + 3 * f60x(p.decay ?? RING_CURL.decay60, fps)) };
};

/** Draws `render(i)` for each tile, centred on (x, y) and turned with the curve. */
export const RingCurl: React.FC<RingCurlProps & { frame: number; x: number; y: number; render: (i: number) => React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = ringCurlState(props.frame, props, film);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(${props.x}px, ${props.y}px)` }}>
      {s.tiles.map((t) => (
        <div key={t.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) rotate(${t.rot.toFixed(3)}deg)` }}>
          <div style={{ transform: 'translate(-50%, -50%)' }}>{props.render(t.i)}</div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- BlockSwarm

/** House numbers: frames at 60 fps, px at 1080p. */
export const BLOCK_SWARM = { swarm60: 18, every60: 4, spread: 420, swap60: 3, hold60: 6 } as const;

export type BlockSwarmProps = {
  at: number; // the first blocks flash
  slots: Box[]; // the letters' boxes (px), left to right
  swarm?: { frames?: number; every?: number; spread?: number; seed?: string | number }; // 60 fps frames (18), a new spot every 4 f, scatter radius px at 1080p (420)
  hold?: number; // 60 fps frames the placeholders sit in their slots (house 6)
  swap?: number; // 60 fps frames between glyph swaps (house 3)
  id?: string;
};

export type SwarmBlock = { i: number; x: number; y: number; w: number; h: number; phase: 'off' | 'swarm' | 'slot' | 'glyph'; tint: number };

/** Every block: where it is (px), its size and phase, and which tint it carries (an index into your palette). Pure. */
export const blockSwarmState = (frame: number, p: BlockSwarmProps, film?: Partial<FilmCtx>): SwarmBlock[] => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const F = fd(frame);
  const sw = Math.max(1, f60x(p.swarm?.frames ?? BLOCK_SWARM.swarm60, fps));
  const every = Math.max(1, f60x(p.swarm?.every ?? BLOCK_SWARM.every60, fps));
  const spread = (p.swarm?.spread ?? BLOCK_SWARM.spread) * u;
  const seed = p.swarm?.seed ?? 'swarm';
  const s0 = Math.round(p.at + sw + f60x(p.hold ?? BLOCK_SWARM.hold60, fps));
  const per = Math.max(1, f60x(p.swap ?? BLOCK_SWARM.swap60, fps));
  return p.slots.map((b, i) => {
    if (F < p.at) return { i, ...b, phase: 'off', tint: i };
    if (F < p.at + sw) {
      const step = Math.floor((F - p.at) / every + 1e-9);
      const k = E.stdInOut(clamp((p.at + step * every - p.at) / sw)); // converge per held pose
      const r = rand(`${seed}:${i}:${step}`);
      const a = rand(`${seed}:a:${i}:${step}`) * Math.PI * 2;
      const sc = 0.45 + 0.9 * rand(`${seed}:s:${i}:${step}`);
      const cx = b.x + b.w / 2 + Math.cos(a) * spread * r * (1 - k);
      const cy = b.y + b.h / 2 + Math.sin(a) * spread * r * 0.6 * (1 - k);
      const w = mix(b.w * sc, b.w, k);
      const h = mix(b.h * (0.5 + 0.5 * sc), b.h, k);
      return { i, x: cx - w / 2, y: cy - h / 2, w, h, phase: 'swarm', tint: Math.floor(rand(`${seed}:t:${i}:${step}`) * 1000) };
    }
    const glyph = F >= Math.round(s0 + i * per);
    return { i, ...b, phase: glyph ? 'glyph' : 'slot', tint: i };
  });
};

/** Sync: the swarm (a burst of ticks on its poses), the placeholders landing, each glyph swap. */
export const blockSwarmFrames = (p: BlockSwarmProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const sw = f60x(p.swarm?.frames ?? BLOCK_SWARM.swarm60, fps);
  const s0 = Math.round(p.at + sw + f60x(p.hold ?? BLOCK_SWARM.hold60, fps));
  const per = Math.max(1, f60x(p.swap ?? BLOCK_SWARM.swap60, fps));
  return { start: p.at, slots: Math.round(p.at + sw), swaps: p.slots.map((_, i) => Math.round(s0 + i * per)) };
};

/** The letter slots of `text` set at (x, y) (centre of the line): each glyph's advance box, cap-height tall. Measures (FontGate). */
export const letterSlots = (text: string, x: number, y: number, font: { size: number; weight: number; track: number; family?: string }): Box[] => {
  const fam = font.family ?? FONT.text;
  const ch = Array.from(text);
  const pre = ch.map((_, i) => measureTracked(ch.slice(0, i).join(''), font.size, font.weight, font.track, fam));
  const total = measureTracked(text, font.size, font.weight, font.track, fam);
  const x0 = x - total / 2;
  const capH = font.size * 0.72;
  return ch.map((_, i) => ({ x: x0 + pre[i], y: y - capH / 2, w: (i + 1 < ch.length ? pre[i + 1] : total) - pre[i] - font.size * Math.max(0, font.track), h: capH }));
};

/** Draws the swarm and then the wordmark `text` letter by letter (its slots from letterSlots with the same font). */
export const BlockSwarm: React.FC<Omit<BlockSwarmProps, 'slots'> & { frame: number; text: string; x: number; y: number; font: { size: number; weight: number; track: number; family?: string; color: string }; palette: string[]; radius?: number }> = (props) => {
  const film = useFilm();
  const f = props.font;
  const slots = letterSlots(props.text, props.x, props.y, f);
  const s = blockSwarmState(props.frame, { ...props, slots }, film);
  const chars = Array.from(props.text);
  const lh = f.size * 1.2;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {s.map((b) => {
        if (b.phase === 'off') return null;
        if (b.phase === 'glyph')
          return (
            <div key={b.i} style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: f.family ?? FONT.text, fontSize: f.size, fontWeight: f.weight, lineHeight: `${lh}px`, color: f.color, transform: `translate(${slots[b.i].x.toFixed(2)}px, ${(props.y - lh / 2).toFixed(2)}px)` }}>
              {chars[b.i]}
            </div>
          );
        return <div key={b.i} style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, borderRadius: props.radius ?? 4 * uOf(film), background: props.palette[b.tint % props.palette.length], transform: `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px)` }} />;
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- ZSwarm

/** House numbers: per 30 fps frame steps (the house cadence), frames at 60 fps. */
export const Z_SWARM = { outStep: -0.15, outSteps: 6, inFrom: 0.2, inStep: 0.1, inSteps: 8, inLag60: 4, jitter60: 6, jitterPx: 6, trail: [0.45, 0.2] as number[] } as const;

export type ZSwarmProps = {
  at: number;
  out?: { step?: number; steps?: number }; // scale change per step and steps (house -0.15 x 6)
  in?: { from?: number; step?: number; steps?: number; lag?: number }; // house from 0.2, +0.10 x 8, starting 4 f (60 fps) after the old line
  every?: number; // 60 fps frames per step (house 2: on ones at 30 fps)
  jitter?: { frames?: number; px?: number; seed?: string | number }; // house 6 f at 60, 6 px
  trail?: number[]; // opacities of the copies left by the last steps (house 0.45, 0.2)
  id?: string;
};

export type ZCopy = { scale: number; opacity: number };

/** The old line's and the new line's copies (current step first, then its trail) and the jitter offset at frame f. Pure. */
export const zSwarmState = (frame: number, p: ZSwarmProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const F = fd(frame);
  const per = Math.max(1, f60x(p.every ?? 2, fps));
  const trail = p.trail ?? Z_SWARM.trail;
  const os = p.out?.step ?? Z_SWARM.outStep;
  const on = p.out?.steps ?? Z_SWARM.outSteps;
  const i0 = p.at + Math.round(f60x(p.in?.lag ?? Z_SWARM.inLag60, fps));
  const is = p.in?.step ?? Z_SWARM.inStep;
  const inN = p.in?.steps ?? Z_SWARM.inSteps;
  const from = p.in?.from ?? Z_SWARM.inFrom;
  const outCopies: ZCopy[] = [];
  const inCopies: ZCopy[] = [];
  const ko = Math.floor((F - p.at) / per + 1e-9);
  if (F < p.at) outCopies.push({ scale: 1, opacity: 1 });
  else if (ko <= on) [0, ...trail].forEach((o, j) => ko - j >= 0 && outCopies.push({ scale: Math.max(0.02, 1 + os * (ko - j)), opacity: j === 0 ? 1 - ko / (on + 1) : o * (1 - ko / (on + 1)) }));
  const ki = Math.floor((F - i0) / per + 1e-9);
  if (F >= i0) [0, ...trail].forEach((o, j) => ki - j >= 0 && (j === 0 || ki <= inN) && inCopies.push({ scale: Math.min(1, from + is * Math.min(inN, ki - j)), opacity: j === 0 ? 1 : o }));
  const lockAt = i0 + Math.ceil(inN * per);
  const jf = f60x(p.jitter?.frames ?? Z_SWARM.jitter60, fps);
  let jx = 0;
  let jy = 0;
  if (F >= lockAt && F < lockAt + jf) {
    const px = (p.jitter?.px ?? Z_SWARM.jitterPx) * u;
    jx = (rand(`${p.jitter?.seed ?? 'z'}:x:${F}`) * 2 - 1) * px;
    jy = (rand(`${p.jitter?.seed ?? 'z'}:y:${F}`) * 2 - 1) * px;
  }
  return { outCopies, inCopies, jx, jy, locked: F >= lockAt + jf, lockAt: Math.ceil(lockAt + jf) };
};

/** Draws the old and the new line (nodes centred on x, y) as their stepped copies. */
export const ZSwarm: React.FC<ZSwarmProps & { frame: number; x: number; y: number; old: React.ReactNode; next: React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = zSwarmState(props.frame, props, film);
  const copy = (node: React.ReactNode, c: ZCopy, key: string, dx = 0, dy = 0) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, opacity: c.opacity, transform: `translate(${(props.x + dx).toFixed(2)}px, ${(props.y + dy).toFixed(2)}px) scale(${c.scale.toFixed(4)})` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', whiteSpace: 'pre' }}>{node}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {s.outCopies.slice().reverse().map((c, j) => copy(props.old, c, `o${j}`))}
      {s.inCopies.slice().reverse().map((c, j) => copy(props.next, c, `n${j}`, j === s.inCopies.length - 1 ? s.jx : 0, j === s.inCopies.length - 1 ? s.jy : 0))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Comets

/** House numbers: frames at 60 fps, px at 1080p. */
export const COMETS = { expand60: 10, orbit60: 8, collapse60: 26, r: 450, turns: 1.1, tail60: 6, head: 16 } as const;

export type CometsProps = {
  at: number;
  n?: number; // heads, point-symmetric (house 2)
  r?: number; // orbit radius, px at 1080p (house 450)
  frames?: { expand?: number; orbit?: number; collapse?: number }; // 60 fps frames (10, 8, 26)
  turns?: number; // total turns over the run (house 1.1)
  tail?: number; // 60 fps frames of path the tail shows (house 6)
  id?: string;
};

/** A head's position at frame f relative to the mark's centre (closed form). */
const cometAt = (frame: number, i: number, p: CometsProps, fps: number, u: number): XY | null => {
  const e = f60x(p.frames?.expand ?? COMETS.expand60, fps);
  const o = f60x(p.frames?.orbit ?? COMETS.orbit60, fps);
  const c = Math.max(1, f60x(p.frames?.collapse ?? COMETS.collapse60, fps));
  const T = e + o + c;
  const t = frame - p.at;
  if (t < 0 || t > T) return null;
  const R = (p.r ?? COMETS.r) * u;
  const r = t < e ? R * E.snapOut(t / Math.max(1, e)) : t < e + o ? R : R * (1 - E.buildIn((t - e - o) / c));
  const n = p.n ?? 2;
  const th = 2 * Math.PI * (p.turns ?? COMETS.turns) * (t / T) + (2 * Math.PI * i) / n;
  return { x: r * Math.cos(th), y: r * Math.sin(th) };
};

/** Every head (px from the mark's centre) with its tail points (newest first), and whether the mark has landed. Pure. */
export const cometsState = (frame: number, p: CometsProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const n = p.n ?? 2;
  const tailF = f60x(p.tail ?? COMETS.tail60, fps);
  const heads = Array.from({ length: n }, (_, i) => {
    const h = cometAt(frame, i, p, fps, u);
    if (!h) return null;
    const tail: XY[] = [];
    for (let k = 1; k <= 6; k++) {
      const q = cometAt(frame - (tailF * k) / 6, i, p, fps, u);
      if (q) tail.push(q);
    }
    return { i, ...h, tail };
  }).filter((h): h is NonNullable<typeof h> => h !== null);
  const land = p.at + f60x((p.frames?.expand ?? COMETS.expand60) + (p.frames?.orbit ?? COMETS.orbit60) + (p.frames?.collapse ?? COMETS.collapse60), fps);
  return { heads, landed: frame >= land, land: Math.ceil(land) };
};

/** Draws the heads (flat dots) and tapering tails in `color`, around the mark's centre (x, y). */
export const Comets: React.FC<CometsProps & { frame: number; x: number; y: number; color: string; head?: number }> = (props) => {
  const film = useFilm();
  const s = cometsState(props.frame, props, film);
  const hr = ((props.head ?? COMETS.head) * uOf(film)) / 2;
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} aria-hidden>
      <g transform={`translate(${props.x} ${props.y})`}>
        {s.heads.map((h) => (
          <g key={h.i}>
            {[h, ...h.tail].slice(0, -1).map((a, k) => {
              const b = [h, ...h.tail][k + 1];
              return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={props.color} strokeWidth={2 * hr * (1 - k / 7)} strokeLinecap="round" opacity={1 - k / 7} />;
            })}
            <circle cx={h.x} cy={h.y} r={hr} fill={props.color} />
          </g>
        ))}
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------- declares

/** BlockSwarm: the swarm is stepped (poses every 4 f) and each glyph swap a stepped frame; ZSwarm: its run is stepped; RingCurl and Comets: nothing. */
export const declares = (p?: { swarm?: Partial<BlockSwarmProps>; z?: Partial<ZSwarmProps> }, film?: Partial<FilmCtx>): Declares => {
  const stepped: SteppedRange[] = [];
  if (p?.swarm?.at !== undefined && p.swarm.slots?.length) {
    const fr = blockSwarmFrames(p.swarm as BlockSwarmProps, film);
    stepped.push({ from: fr.start, to: fr.swaps[fr.swaps.length - 1] + 1, id: p.swarm.id ?? 'blockSwarm' });
  }
  if (p?.z?.at !== undefined) {
    const s = zSwarmState(p.z.at, p.z as ZSwarmProps, film);
    stepped.push({ from: p.z.at, to: s.lockAt + 1, id: p.z.id ?? 'zSwarm' });
  }
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};

/**
 * Satellites clearing: each item flies out along its OWN vector (not radially from the centre) on a quad-in over 26 f
 * at 60 fps, growing to x1.45 as it goes and fading in its last third, while the container they circled changes on
 * the same frame (a label swap on the kick). Pure: each item's offset, scale and opacity at frame f.
 */
export const SCATTER = { frames60: 26, grow: 1.45 } as const;
export type ScatterProps = { at: number; items: { vx: number; vy: number; delay?: number }[]; frames?: number; grow?: number };
export const scatterState = (frame: number, p: ScatterProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const dur = Math.max(1, f60x(p.frames ?? SCATTER.frames60, fps));
  return p.items.map((it, i) => {
    const t = clamp((frame - p.at - f60x(it.delay ?? 0, fps)) / dur);
    const q = t * t;
    return { i, dx: it.vx * q, dy: it.vy * q, scale: mix(1, p.grow ?? SCATTER.grow, q), opacity: 1 - clamp((t - 0.66) / 0.34), gone: t >= 1 };
  });
};
