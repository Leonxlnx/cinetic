import React from 'react';
import { clamp, rand } from '../lib/anim';
import { type FilmCtx, fpsOf, uOf, useFilm } from '../lib/film';
import { carry, launch, LAUNCH } from '../lib/handoff';
import type { Declares } from '../timeline';

/**
 * Rush: speed you can feel. A line, a card or a scroll drifts, then its speed grows every frame (going
 * back from the cut: 34, 18, 10, 6, 4, 2 % ... of the cut speed per 24 fps frame, the house launch
 * profile: roughly doubling, hardest in the last frames) and it is hard-cut on its fastest frame. The
 * next shot opens already moving and halves its speed every 24 fps frame (x0.77 per 60 fps frame) until
 * it rests on its layout. Speed carried through a cut reads as one push of energy, not two moves.
 *
 * The picture devices that ride on it (props of the same primitive):
 *   copies   graphic smear instead of shutter blur: 2-3 faint copies where the element was 1-2 frames ago,
 *            drawn only on the fastest frames (crisp films keep type sharp; the copies carry the speed)
 *   lines    thin speed lines along the travel, visible only while the speed is above a threshold
 *
 * The maths is lib/handoff's launch() (the build into the cut) and carry() (the decay after it); this
 * file turns it into a layer offset, the copies and the lines. Pure: rushState(f) for any frame.
 */

/** House numbers. Speeds are px per 60 fps frame at 1080p (converted to the film's rate and size). */
export const RUSH = {
  vCut60: 35, // a crisp line at its fastest (88 px per 24 fps frame); a scroll can take 100+
  floor60: 0.8, // the drift before the build
  lead60: 43, // the drift starts this many 60 fps frames before the cut (house exit 30-43)
  entry: { ratio: 1, decay60: 0.766, residual60: 0 }, // opens at the cut speed (x ratio) and halves per 24 fps frame
  copies: { n: 3, lag: 1, fade: 0.45, from60: 18 }, // drawn above 18 px per 60 fps frame
  lines: { n: 5, from60: 16, full60: 40, len: [180, 420] as [number, number], width: 2 },
  blurAbove60: 100, // declare camera blur only above this speed (a crisp film draws copies instead)
} as const;

export type RushProps = {
  cut: number; // the outgoing shot's last frame (its fastest)
  dir?: number; // travel direction on screen, degrees (0 = right, 90 = down, 180 = left)
  vCut?: number; // px per 60 fps frame at 1080p on the cut (house 35)
  floor?: number; // drift speed before the build, px per 60 fps frame (house 0.8)
  from?: number; // the frame the outgoing element leaves its rest (default cut - 43 f at 60 fps)
  a?: number; // launch profile (lib/handoff LaunchOpts): house a 0.47, p 0.76
  p?: number;
  entry?: false | { ratio?: number; decay?: number; residual?: number }; // false: the next shot is still
  copies?: false | { n?: number; lag?: number; fade?: number; from?: number; side?: 'out' | 'in' | 'both' }; // side: which shot smears (house both; 'out' keeps an arriving line of type clean)
  lines?: false | { n?: number; from?: number; full?: number; len?: [number, number]; width?: number; seed?: string | number };
  id?: string;
};

export type RushState = {
  side: 'out' | 'in';
  along: number; // signed offset from the layout position along dir, px (0 at rest)
  x: number;
  y: number;
  v: number; // speed, px per film frame
  copies: { x: number; y: number; opacity: number }[]; // offsets of the smear copies (absolute, like x and y)
  lines: number; // speed-line strength 0..1
};

const unit = (deg = 0): [number, number] => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

/** Speed scale: px per 60 fps frame at 1080p to px per film frame at the film's size. */
const k60 = (film?: Partial<FilmCtx>) => (uOf(film) * 60) / fpsOf(film);

/** Offset along the travel and speed at frame f (fractional frames welcome). */
export const rushAlong = (f: number, p: RushProps, film?: Partial<FilmCtx>): { side: 'out' | 'in'; along: number; v: number } => {
  const fps = fpsOf(film);
  const k = k60(film);
  const vCut = (p.vCut ?? RUSH.vCut60) * k;
  const lo = { vCut, a: p.a ?? LAUNCH.a, p: p.p ?? LAUNCH.p, floor: (p.floor ?? RUSH.floor60) * uOf(film), fps }; // a, p and floor are per 60 fps frame (launch converts)
  if (f <= p.cut) {
    const from = p.from ?? p.cut - Math.round((RUSH.lead60 * fps) / 60);
    if (f <= from) return { side: 'out', along: 0, v: 0 };
    const o = launch(f, p.cut, lo);
    return { side: 'out', along: o.x - launch(from, p.cut, lo).x, v: o.v };
  }
  if (p.entry === false) return { side: 'in', along: 0, v: 0 };
  const e = p.entry ?? {};
  const v0 = (e.ratio ?? RUSH.entry.ratio) * vCut;
  const decay = e.decay ?? RUSH.entry.decay60;
  const residual = (e.residual ?? RUSH.entry.residual60) * uOf(film);
  const o = { v0, decay, residual, fast: { share: 0, decay: 0.5 }, fps };
  // the first incoming frame shows the element fully displaced; the step into the next frame is v0
  const x = carry(f, p.cut + 1, o);
  const ds = decay ** (60 / fps);
  const total = (v0 - (residual * 60) / fps) / (1 - ds); // the decaying part's whole travel; a residual keeps drifting past rest
  return { side: 'in', along: x.x - total, v: x.v };
};

/** The full state: offsets, speed, smear copies and speed-line strength. Pure. */
export const rushState = (f: number, p: RushProps, film?: Partial<FilmCtx>): RushState => {
  const [ux, uy] = unit(p.dir);
  const k = k60(film);
  const s = rushAlong(f, p, film);
  const copies: RushState['copies'] = [];
  if (p.copies !== false) {
    const pc: Exclude<RushProps["copies"], false | undefined> = p.copies || {};
    const c = { n: pc.n ?? RUSH.copies.n, lag: pc.lag ?? RUSH.copies.lag, fade: pc.fade ?? RUSH.copies.fade, from: pc.from ?? RUSH.copies.from60 };
    const side = pc.side ?? 'both';
    if (s.v >= c.from * k && (side === 'both' || side === s.side)) {
      for (let i = 1; i <= c.n; i++) {
        const g = rushAlong(f - i * c.lag, p, film);
        if (g.side !== s.side) break; // never smear across the cut
        copies.push({ x: ux * g.along, y: uy * g.along, opacity: c.fade ** i });
      }
    }
  }
  let lines = 0;
  if (p.lines !== false) {
    const pl: Exclude<RushProps["lines"], false | undefined> = p.lines || {};
    const l = { from: pl.from ?? RUSH.lines.from60, full: pl.full ?? RUSH.lines.full60 };
    lines = clamp((s.v - l.from * k) / Math.max(1e-6, (l.full - l.from) * k));
  }
  return { side: s.side, along: s.along, x: ux * s.along, y: uy * s.along, v: s.v, copies, lines };
};

/** Speed per film frame over [a, b] (whole frames): the series a test or a sound plan reads. */
export const rushSpeeds = (p: RushProps, a: number, b: number, film?: Partial<FilmCtx>): number[] =>
  Array.from({ length: b - a + 1 }, (_, i) => {
    const f = a + i;
    const s0 = rushAlong(f - 1, p, film);
    const s1 = rushAlong(f, p, film);
    return s0.side === s1.side ? Math.abs(s1.along - s0.along) : NaN;
  });

/** Sync: drift start, the cut (a sub or a punchy hit), the first incoming frame and when it is at rest. */
export const rushFrames = (p: RushProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const from = p.from ?? p.cut - Math.round((RUSH.lead60 * fps) / 60);
  let settled = p.cut + 1;
  if (p.entry !== false) for (let f = p.cut + 1; f < p.cut + 10 * fps; f++) if (Math.abs(rushAlong(f, p, film).along) < 0.5) { settled = f; break; }
  return { from, cut: p.cut, firstIn: p.cut + 1, settled };
};

/** The speed lines: thin bars along the travel, seeded rows, length and opacity from the speed. */
const Lines: React.FC<{ strength: number; dir: number; along: number; seed: string | number; n: number; len: [number, number]; width: number; color: string; w: number; h: number }> = (o) => {
  if (o.strength <= 0) return null;
  const rows = Array.from({ length: o.n }, (_, i) => {
    const y = (0.12 + 0.76 * rand(`${o.seed}:y:${i}`)) * o.h;
    const L = (o.len[0] + (o.len[1] - o.len[0]) * rand(`${o.seed}:l:${i}`)) * (0.4 + 0.6 * o.strength);
    const x = ((rand(`${o.seed}:x:${i}`) * o.w + o.along * (1.4 + 0.5 * rand(`${o.seed}:p:${i}`))) % (o.w + L) + o.w + L) % (o.w + L) - L;
    return { y, L, x, a: o.strength * (0.35 + 0.4 * rand(`${o.seed}:a:${i}`)) };
  });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: o.w, height: o.h, transform: `rotate(${o.dir}deg)`, transformOrigin: '50% 50%', pointerEvents: 'none' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: r.L, height: o.width, borderRadius: o.width, background: o.color, opacity: r.a, transform: `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)` }} />
      ))}
    </div>
  );
};

/**
 * Renders a rush across a cut: `out` until the cut (with copies), `in` after it, each offset along `dir`.
 * Both nodes are full-frame layers at their layout positions; the rush only translates them.
 */
export const Rush: React.FC<RushProps & { frame: number; out: React.ReactNode; in: React.ReactNode; lineColor?: string; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = rushState(props.frame, props, film);
  const node = s.side === 'out' ? props.out : props.in;
  const pl: Exclude<RushProps["lines"], false | undefined> | null = props.lines === false ? null : props.lines || {};
  const l = pl ? { n: pl.n ?? RUSH.lines.n, len: pl.len ?? RUSH.lines.len, width: pl.width ?? RUSH.lines.width, seed: pl.seed } : null;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      {s.copies
        .slice()
        .reverse()
        .map((c, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: c.opacity, transform: `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0)` }}>
            {node}
          </div>
        ))}
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)` }}>{node}</div>
      {l && props.lineColor && (
        <Lines strength={s.lines} dir={props.dir ?? 0} along={s.along} seed={l.seed ?? props.id ?? 'rush'} n={l.n} len={[l.len[0] * uOf(film), l.len[1] * uOf(film)]} width={l.width * uOf(film)} color={props.lineColor} w={film.width} h={film.height} />
      )}
    </div>
  );
};

/** A rush is a velocity seam on the cut; frames above RUSH.blurAbove60 are declared camera blur. */
export const declares = (p?: Partial<RushProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.cut === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = rushFrames(p as RushProps, film);
  const lim = RUSH.blurAbove60 * k60(film);
  const fast: number[] = [];
  for (let f = fr.from; f <= fr.settled; f++) if (rushAlong(f, p as RushProps, film).v > lim) fast.push(f);
  const cameraBlur = fast.length ? [{ from: fast[0], to: fast[fast.length - 1] + 1, id: `${p.id ?? 'rush'}-blur` }] : [];
  const d = ((p.dir ?? 0) % 360 + 360) % 360;
  const horiz = Math.abs(Math.cos((d * Math.PI) / 180)) >= Math.abs(Math.sin((d * Math.PI) / 180));
  const sign = horiz ? (Math.cos((d * Math.PI) / 180) >= 0 ? 1 : -1) : Math.sin((d * Math.PI) / 180) >= 0 ? 1 : -1;
  return { stepped: [], flashes: [], cameraBlur, seams: [{ at: p.cut + 1, kind: 'velocity', carry: horiz ? 'x' : 'y', dir: sign as 1 | -1, id: p.id ?? 'rush' }] };
};
