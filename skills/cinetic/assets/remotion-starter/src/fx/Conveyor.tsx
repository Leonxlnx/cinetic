import React from 'react';
import { clamp } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Conveyor: streams of cards travelling on a diagonal (or a row) with a U-shaped speed: fast on entry,
 * slow in the middle where the eye can read them, fast on exit; soft fade masks at the frame edges. Two
 * conveyors in opposite directions read as rivers of work. The exit can be a rush: the speed grows
 * exponentially (most of the change in the last fifth) into a blur and the cut.
 *
 * Speed (px per 60 fps frame at 1080p): enters at `in` and settles exponentially to `cruise` over `inFrames`
 * (house 65 -> 18 in 56 f), cruises, then from `outAt` grows exponentially to `out` over `outFrames`
 * (house 28 f; k 5: 64 % of the change in the last 20 %). Travel s(f) is the closed-form integral, so any
 * frame renders without stepping through the ones before it.
 */

/** House numbers: px per 60 fps frame at 1080p, frames at 60 fps. */
export const CONVEYOR = { vIn: 65, cruise: 18, vOut: 110, in60: 56, out60: 28, kIn: 4, kOut: 5, angle: -44, gap: 36, blurAbove60: 20 } as const;

export type ConveyorProps = {
  start: number; // first frame (speed = in)
  n: number; // items in the loop
  pitch: number; // distance between item origins along the path, px (item size + gap)
  angle?: number; // direction of travel, degrees (0 = right, -44 = up-right, 136 = down-left)
  speed?: { in?: number; cruise?: number; out?: number }; // px per 60 fps frame at 1080p
  inFrames?: number; // 60 fps frames
  outAt?: number; // the exit acceleration starts (default: never)
  outFrames?: number;
  kIn?: number; // exponential shapes (house 4 and 5)
  kOut?: number;
  phase?: number; // px offset of the whole stream along the path (stagger two conveyors)
  id?: string;
};

export type ConveyorItem = { i: number; along: number; x: number; y: number };

/** Travel (px along the path since start) and speed (px per film frame) at frame f, closed form. */
export const conveyorTravel = (frame: number, p: ConveyorProps, film?: Partial<FilmCtx>): { s: number; v: number } => {
  const fps = fpsOf(film);
  const k = (uOf(film) * 60) / fps; // px per 60 fps frame at 1080p -> px per film frame
  const vi = (p.speed?.in ?? CONVEYOR.vIn) * k;
  const vc = (p.speed?.cruise ?? CONVEYOR.cruise) * k;
  const vo = (p.speed?.out ?? CONVEYOR.vOut) * k;
  const Ti = Math.max(1, f60x(p.inFrames ?? CONVEYOR.in60, fps));
  const ki = p.kIn ?? CONVEYOR.kIn;
  const tau = Ti / ki;
  const t = frame - p.start;
  if (t <= 0) return { s: vi * t, v: vi };
  // entry: v = vc + (vi - vc) e^(-t / tau)
  const sIn = (x: number) => vc * x + (vi - vc) * tau * (1 - Math.exp(-x / tau));
  const vInAt = (x: number) => vc + (vi - vc) * Math.exp(-x / tau);
  if (p.outAt === undefined || frame <= p.outAt) return { s: sIn(t), v: vInAt(t) };
  // exit: v = vb + (vo - vb) (e^(ko x / To) - 1) / (e^ko - 1), vb the speed when the exit starts
  const t0 = p.outAt - p.start;
  const s0 = sIn(t0);
  const vb = vInAt(t0);
  const To = Math.max(1, f60x(p.outFrames ?? CONVEYOR.out60, fps));
  const ko = p.kOut ?? CONVEYOR.kOut;
  const x = Math.min(frame - p.outAt, To);
  const A = (vo - vb) / (Math.exp(ko) - 1);
  const sOut = vb * x + A * ((To / ko) * (Math.exp((ko * x) / To) - 1) - x);
  const vOut = vb + A * (Math.exp((ko * x) / To) - 1);
  const over = frame - p.outAt - x; // past the exit: keep going at full speed
  return { s: s0 + sOut + over * vo, v: over > 0 ? vo : vOut };
};

/** Every item's offset along the path and in x/y (px from the stream's origin), looped with period n * pitch. Pure. */
export const conveyorState = (frame: number, p: ConveyorProps, film?: Partial<FilmCtx>) => {
  const { s, v } = conveyorTravel(frame, p, film);
  const a = ((p.angle ?? CONVEYOR.angle) * Math.PI) / 180;
  const L = p.n * p.pitch;
  const items: ConveyorItem[] = Array.from({ length: p.n }, (_, i) => {
    const raw = i * p.pitch + s + (p.phase ?? 0);
    const along = ((raw % L) + L) % L - L / 2; // centred on the origin
    return { i, along, x: Math.cos(a) * along, y: Math.sin(a) * along };
  });
  return { s, v, items, period: L };
};

/** Sync: the entry (a whoosh), when it reaches cruise (within 5 %), the exit, and when it hits full exit speed (the cut). */
export const conveyorFrames = (p: ConveyorProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const Ti = f60x(p.inFrames ?? CONVEYOR.in60, fps);
  const cruise = Math.round(p.start + (Ti / (p.kIn ?? CONVEYOR.kIn)) * Math.log(20));
  const out = p.outAt;
  const cut = out === undefined ? undefined : Math.round(out + f60x(p.outFrames ?? CONVEYOR.out60, fps));
  return { start: p.start, cruise: Math.min(cruise, Math.round(p.start + Ti)), out, cut };
};

/**
 * Draws the stream centred on (x, y): `render(i)` for each item (a card at its own size, centred on its
 * position), clipped to the frame with soft edges (`fade` px of alpha ramp on every side).
 */
export const Conveyor: React.FC<ConveyorProps & { frame: number; x: number; y: number; render: (i: number) => React.ReactNode; fade?: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = conveyorState(props.frame, props, film);
  const f = props.fade ?? 160 * uOf(film);
  const mask = `linear-gradient(90deg, transparent 0, black ${f}px, black calc(100% - ${f}px), transparent 100%), linear-gradient(180deg, transparent 0, black ${f * 0.6}px, black calc(100% - ${f * 0.6}px), transparent 100%)`;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', maskImage: mask, WebkitMaskImage: mask, maskComposite: 'intersect', WebkitMaskComposite: 'source-in', ...props.style }}>
      {s.items.map((it) => (
        <div key={it.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(props.x + it.x).toFixed(2)}px, ${(props.y + it.y).toFixed(2)}px, 0)` }}>
          <div style={{ transform: 'translate(-50%, -50%)' }}>{props.render(it.i)}</div>
        </div>
      ))}
    </div>
  );
};

/** Fast frames (above 20 px per 60 fps frame) are declared camera blur: a crisp film still smears a rush. */
export const declares = (p?: Partial<ConveyorProps> & { until?: number }, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined || !p.n || !p.pitch) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fps = fpsOf(film);
  const lim = (CONVEYOR.blurAbove60 * uOf(film) * 60) / fps;
  const until = p.until ?? conveyorFrames(p as ConveyorProps, film).cut ?? p.start + Math.round(f60x(CONVEYOR.in60, fps));
  const ranges: { from: number; to: number; id: string }[] = [];
  let open: number | null = null;
  for (let f = p.start; f <= until; f++) {
    const fast = conveyorTravel(f, p as ConveyorProps, film).v > lim;
    if (fast && open === null) open = f;
    if (!fast && open !== null) {
      ranges.push({ from: open, to: f, id: `${p.id ?? 'conveyor'}-${ranges.length}` });
      open = null;
    }
  }
  if (open !== null) ranges.push({ from: open, to: until + 1, id: `${p.id ?? 'conveyor'}-${ranges.length}` });
  return { stepped: [], flashes: [], cameraBlur: ranges, seams: [] };
};

/** The share of a speed change that happens in the last `tail` of the exit (64 % in the last 20 % at k 5). */
export const exitTailShare = (k: number = CONVEYOR.kOut, tail = 0.2) => clamp(1 - (Math.exp(k * (1 - tail)) - 1) / (Math.exp(k) - 1));
