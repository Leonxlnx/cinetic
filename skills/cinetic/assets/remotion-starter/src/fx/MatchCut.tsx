import React from 'react';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import { fastRanges } from '../lib/handoff';
import type { Declares } from '../timeline';

/**
 * MatchCut: the cut that keeps the object. The eye is on one thing (a bottle, a card, a ring, a word); the world
 * around it changes on the cut, the thing does not jump. The incoming shot opens placed so that its object sits
 * where the outgoing object was, one step further along the outgoing move (its position and its size: a push into
 * the object goes on growing it), then settles onto the incoming shot's own layout while that inherited speed
 * decays, front-loaded, to rest. Position and scale are matched on the object's box, scale in log space.
 *
 * Measured house numbers: the incoming object opens one full outgoing step on (ratio 1: a push of x1.09 a step
 * opens x1.09 bigger than the last outgoing frame, its centre within a few px), then decays to rest in about 36 f
 * at 60 fps (the inherited zoom drops to about a third in the first steps). Use it for a push into an object that
 * cuts to its packshot, a ring that becomes the next shot's frame, a pill that becomes the next layout's tile.
 *
 * matchCutState() is pure and closed form (fractional frames, any order); the offset decays on an exponential
 * corrected to land at exactly zero, with zero speed, on the settle frame. Give the incoming rest box a little more
 * room than the inherited one in the direction of the move (a packshot a touch bigger than the last pushed frame),
 * so the inherited push lands; when the speed would carry it past its rest it brakes instead of bouncing.
 */
export type MBox = { x: number; y: number; w: number; h: number };

/** House numbers, 60 fps frames. */
export const MATCH = { ratio: 1, settle60: 36 } as const;

export type MatchCutProps = {
  cut: number; // the outgoing shot's last frame; the incoming shot opens on cut + 1
  from: MBox | ((f: number) => MBox); // the object's screen box in the outgoing shot (a function of the frame when it moves)
  to: MBox; // the object's rest box in the incoming shot's own layout
  ratio?: number; // the incoming first step as a share of the outgoing last step (house 1: one continuous move; 0 = matched, at rest)
  settle?: number; // 60 fps frames until the incoming shot rests on its own layout (house 36)
  carry?: ('x' | 'y' | 'scale')[]; // what the incoming shot inherits (default all three); a channel left out opens at rest
  id?: string;
};

export type MatchCutState = {
  incoming: boolean; // frame f shows the incoming shot (f > cut)
  box: MBox; // where the object is on screen now (outgoing: `from`; incoming: the inherited box settling onto `to`)
  k: number; // the incoming shot's scale about the rest box's centre (1 at rest)
  tx: number; // the incoming shot's offset, px
  ty: number;
  ox: number; // transform origin: the rest box's centre
  oy: number;
  v: number; // the object's speed, px per film frame (centre travel plus size change), the step into f
};

type Ch = { cx: number; cy: number; s: number };
const chOf = (b: MBox): Ch => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2, s: Math.log(Math.max(1e-6, Math.sqrt(b.w * b.h))) });
const boxAt = (p: MatchCutProps, f: number): MBox => (typeof p.from === 'function' ? p.from(f) : p.from);

/**
 * An offset that starts at o0 moving at v0 (units per film frame) and comes to rest at exactly 0, with zero speed, at
 * t = T: (a + b t) e^(-t / tau) minus its value and tangent at T, with a and b solved for o0 and v0. tau is T / 5,
 * shortened when the inherited speed would carry the object past its rest (|v0| tau > |o0| toward it): it brakes
 * harder instead of overshooting (overshoot belongs to true landings only).
 */
const settleOffset = (t: number, o0: number, v0: number, T: number) => {
  if (t >= T) return 0;
  let tau = T / 5;
  if (o0 * v0 < 0 && Math.abs(v0) * tau > Math.abs(o0)) tau = Math.max(1e-3, (0.95 * Math.abs(o0)) / Math.abs(v0));
  const n = T / tau;
  const E = Math.exp(-n);
  const det = (1 - E) ** 2 - n * n * E;
  const a = (o0 * (1 - E + n * E) + n * E * T * v0) / det;
  const b = (v0 * (1 - E - n * E) + (o0 * (1 - E)) / tau) / det;
  const h = (x: number) => (a + b * x) * Math.exp(-x / tau);
  const hT = h(T);
  const dT = (b - (a + b * T) / tau) * E;
  return h(t) - hT - dT * (t - T);
};

/** The match cut at frame f. Pure. */
export const matchCutState = (f: number, p: MatchCutProps, film?: Partial<FilmCtx>): MatchCutState => {
  const fps = fpsOf(film);
  const R = chOf(p.to);
  const rest = { ox: R.cx, oy: R.cy };
  if (f <= p.cut) {
    const b = boxAt(p, f);
    const a = chOf(b);
    const z = chOf(boxAt(p, f - 1));
    return { incoming: false, box: b, k: 1, tx: 0, ty: 0, ...rest, v: Math.hypot(a.cx - z.cx, a.cy - z.cy) + Math.abs(Math.exp(a.s) - Math.exp(z.s)) };
  }
  const A = chOf(boxAt(p, p.cut));
  const A0 = chOf(boxAt(p, p.cut - 1));
  const r = p.ratio ?? MATCH.ratio;
  const what = new Set(p.carry ?? ['x', 'y', 'scale']);
  const T = Math.max(1, f60x(p.settle ?? MATCH.settle60, fps));
  // per channel: where the incoming object opens (one step on) and how fast it is moving there
  const ch = (key: 'cx' | 'cy' | 's', on: boolean) => {
    if (!on) return { o0: 0, v0: 0 };
    const v = r * (A[key] - A0[key]);
    return { o0: A[key] + v - R[key], v0: v };
  };
  const cx = ch('cx', what.has('x'));
  const cy = ch('cy', what.has('y'));
  const cs = ch('s', what.has('scale'));
  const at = (g: number) => {
    const t = g - (p.cut + 1);
    return { dx: settleOffset(t, cx.o0, cx.v0, T), dy: settleOffset(t, cy.o0, cy.v0, T), ds: settleOffset(t, cs.o0, cs.v0, T) };
  };
  const o = at(f);
  const k = Math.exp(o.ds);
  const box = { x: R.cx + o.dx - (p.to.w * k) / 2, y: R.cy + o.dy - (p.to.h * k) / 2, w: p.to.w * k, h: p.to.h * k };
  // speed: the step into f (the step into the first incoming frame is the outgoing step, r x)
  const prev = f - 1 <= p.cut ? { dx: cx.o0 - cx.v0, dy: cy.o0 - cy.v0, ds: cs.o0 - cs.v0 } : at(f - 1);
  const w0 = Math.sqrt(p.to.w * p.to.h);
  const v = Math.hypot(o.dx - prev.dx, o.dy - prev.dy) + Math.abs(Math.exp(o.ds) - Math.exp(prev.ds)) * w0;
  return { incoming: true, box, k, tx: o.dx, ty: o.dy, ...rest, v };
};

/** The style that places the incoming shot (a full-frame layer laid out in its own rest layout) for a state. */
export const matchCutStyle = (s: MatchCutState): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  transformOrigin: `${s.ox.toFixed(3)}px ${s.oy.toFixed(3)}px`,
  transform: `translate3d(${s.tx.toFixed(3)}px, ${s.ty.toFixed(3)}px, 0) scale(${s.k.toFixed(5)})`,
});

/**
 * Renders a match cut: `outgoing` up to and including the cut frame, then `incoming` (laid out at rest, its object
 * at `to`) placed by the state so its object opens where the outgoing one was. The incoming shot's ground (a CSS
 * background: its paper, its colour field) goes in `ground`, drawn full frame and never moved, so the frame never
 * shows an edge while the shot opens smaller than its rest. `frame` is local.
 */
export const MatchCut: React.FC<MatchCutProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode; ground?: string }> = (props) => {
  const film = useFilm();
  const s = matchCutState(props.frame, props, film);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: s.incoming ? props.ground : undefined }}>
      {s.incoming ? <div style={matchCutStyle(s)}>{props.incoming}</div> : props.outgoing}
    </div>
  );
};

/**
 * A match cut is a `morph` seam on the incoming shot's first frame, carrying the channel that moves most (scale for
 * a push into the object); the frames where the object moves fast enough to smear are camera blur.
 */
export const declares = (p?: Partial<MatchCutProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.cut === undefined || !p.from || !p.to) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const mp = p as MatchCutProps;
  const a = chOf(boxAt(mp, mp.cut));
  const z = chOf(boxAt(mp, mp.cut - 1));
  const vs = Math.abs(a.s - z.s) * Math.sqrt(mp.to.w * mp.to.h);
  const vx = Math.abs(a.cx - z.cx);
  const vy = Math.abs(a.cy - z.cy);
  const carry: 'scale' | 'x' | 'y' = vs >= vx && vs >= vy ? 'scale' : vx >= vy ? 'x' : 'y';
  const { width, height } = sizeOf(film);
  const fps = fpsOf(film);
  const T = Math.ceil(f60x(mp.settle ?? MATCH.settle60, fps));
  const cameraBlur = fastRanges((f) => matchCutState(f, mp, film).v, mp.cut - T, mp.cut + 1 + T, { u: Math.min(width, height) / 1080, fps, id: `${p.id ?? 'matchCut'}-smear` });
  return { stepped: [], flashes: [], cameraBlur, seams: [{ at: mp.cut + 1, kind: 'morph', carry, id: p.id ?? 'matchCut' }] };
};
