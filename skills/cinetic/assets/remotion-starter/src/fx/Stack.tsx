import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { Defocus } from './Defocus';

/**
 * Stack: notifications (payments, sign-ups, replies, orders) piling up as proof that the product works. The newest
 * rises from behind into the front slot (144 px at 1080p, scale 0.92 to 1, 45 % of the way in its first two frames
 * at 60 fps); every older one steps back a slot on the same curve: 4.5 % smaller, 2.4 px softer and closer to the one
 * in front (slot gaps 199, 175, 150, 135 px), until it leaves past the last slot. The stack re-centres as it grows
 * (92 px per item), so the pile stays in the middle of the frame. Arrivals speed up into the payoff (toasts every
 * 8-10 f at 60 fps by the end: lib/cadence ACCEL). Closed form: the state at any frame needs only the arrival frames.
 */

/** House numbers: px at 1080p, 60 fps frames. */
export const STACK = { rise: 144, scaleFrom: 0.92, enter60: 16, stepScale: 0.045, stepBlur: 2.4, gaps: [199, 175, 150, 135] as number[], depth: 4, recentre: 92 } as const;

export type StackProps = {
  arrivals: number[]; // frame each item starts to arrive (item i arrives at arrivals[i]; oldest first)
  enter?: number; // 60 fps frames of the arrival and of each step back (house 16)
  ease?: Ease; // the arrival curve (house E.snapOut: front-loaded, like every UI arrival)
  rise?: number; // px at 1080p the newest rises from (house 144)
  gaps?: number[]; // px at 1080p between neighbouring slots, front first (house 199, 175, 150, 135)
  depth?: number; // slots kept behind the front one before an item leaves (house 4)
  id?: string;
};

export type StackItem = { i: number; slot: number; y: number; scale: number; sigma: number; opacity: number };
export type StackState = { items: StackItem[]; count: number; shift: number };

/** Every visible item at frame f (front last, so draw in order): its slot (0 = front, fractional while stepping back), y offset, scale, softness. Pure. */
export const stackState = (frame: number, p: StackProps, film?: Partial<FilmCtx>): StackState => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const dur = Math.max(1, f60x(p.enter ?? STACK.enter60, fps));
  const ease = p.ease ?? E.snapOut;
  const gaps = (p.gaps ?? STACK.gaps).map((g) => g * u);
  const depth = p.depth ?? STACK.depth;
  const prog = (a: number) => ease(clamp((frame - a) / dur));
  const yOf = (slot: number) => {
    let y = 0;
    for (let k = 0; k < Math.ceil(slot); k++) y += (gaps[Math.min(k, gaps.length - 1)] ?? 0) * clamp(slot - k);
    return y;
  };
  const items: StackItem[] = [];
  let count = 0;
  p.arrivals.forEach((a, i) => {
    if (frame < a) return;
    const own = prog(a);
    count += own;
    const slot = p.arrivals.slice(i + 1).reduce((s, b) => s + (frame >= b ? prog(b) : 0), 0);
    if (slot > depth + 1) return;
    const rise = (p.rise ?? STACK.rise) * u * (1 - own);
    items.push({
      i,
      slot,
      y: yOf(slot) + rise,
      scale: mix(STACK.scaleFrom, 1, own) * (1 - STACK.stepScale * slot),
      sigma: STACK.stepBlur * slot,
      opacity: clamp(own / 0.25) * clamp(depth + 1 - slot),
    });
  });
  items.sort((x, y) => y.slot - x.slot);
  return { items, count, shift: Math.max(0, count - 1) * STACK.recentre * u };
};

/** Sync: each item's arrival and the frame it is home (a soft pop on the arrival's 50 % frame). */
export const stackFrames = (p: StackProps, film?: Partial<FilmCtx>) => {
  const dur = f60x(p.enter ?? STACK.enter60, fpsOf(film));
  return p.arrivals.map((a) => ({ at: a, home: Math.ceil(a + dur) }));
};

/**
 * Draws the stack with its front slot's top edge at (x, y) minus the re-centring shift, each item `width` x `height`
 * scaled about its top centre, the ones behind softened through fixed defocus levels.
 */
export const Stack: React.FC<StackProps & { frame: number; x: number; y: number; width: number; height: number; render: (i: number) => React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = stackState(props.frame, props, film);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${props.x.toFixed(2)}px, ${(props.y - s.shift).toFixed(2)}px, 0)` }}>
      {s.items.map((it) => (
        <div
          key={it.i}
          style={{
            position: 'absolute',
            left: -props.width / 2,
            top: 0,
            width: props.width,
            height: props.height,
            opacity: it.opacity,
            transformOrigin: '50% 0',
            transform: `translate3d(0, ${it.y.toFixed(2)}px, 0) scale(${it.scale.toFixed(5)})`,
          }}
        >
          <Defocus sigma={it.sigma}>{props.render(it.i)}</Defocus>
        </div>
      ))}
    </div>
  );
};

/**
 * A pile of photo cards dealt one ON TOP of the last (the opposite layering of the notification stack): each card
 * drops in from up-right (house 34, -30 px at 1080p per card of fan) with a short smear, lands on an alternating tilt
 * and stays; the pile's origin walks down-left as it grows so the whole pile stays framed. Cards land every ~6 f at
 * 60 fps (a flick build). Draw `cards` in order: the newest is last, on top.
 */
export const PILE = { fan: { x: 34, y: -30 }, drop: 220, enter60: 7, tilt: 5.5, walk: { x: -0.5, y: 0.45 }, scaleFrom: 1.12 } as const;

export type PileProps = {
  arrivals: number[]; // frame each card starts to drop (oldest first)
  fan?: { x: number; y: number }; // px at 1080p each newer card sits from the one before (house up-right)
  drop?: number; // px at 1080p a card travels in from, along the fan direction (house 220)
  enter?: number; // 60 fps frames of a drop (house 7: front-loaded on E.snapOut)
  tilt?: number; // deg, alternating sign card to card (house 5.5)
  walk?: { x: number; y: number }; // share of the fan the pile's origin walks back per card (house -0.5, 0.45: down-left)
};
export type PileCard = { i: number; x: number; y: number; rot: number; scale: number; v: number; opacity: number };

/** Every dealt card at frame f (oldest first, the newest on top) and the pile's origin shift. Pure. */
export const pileState = (frame: number, p: PileProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const fan = { x: (p.fan?.x ?? PILE.fan.x) * u, y: (p.fan?.y ?? PILE.fan.y) * u };
  const drop = (p.drop ?? PILE.drop) * u;
  const dur = Math.max(1, f60x(p.enter ?? PILE.enter60, fps));
  const walk = p.walk ?? PILE.walk;
  const len = Math.hypot(fan.x, fan.y) || 1;
  const dir = { x: fan.x / len, y: fan.y / len };
  const at = (a: number, f: number) => E.snapOut(clamp((f - a) / dur));
  const placed = (f: number) => p.arrivals.reduce((n, a) => n + (f >= a ? at(a, f) : 0), 0);
  const n = placed(frame);
  const shift = { x: walk.x * Math.abs(fan.x) * Math.max(0, n - 1), y: walk.y * Math.abs(fan.y) * Math.max(0, n - 1) };
  const cards: PileCard[] = [];
  p.arrivals.forEach((a, i) => {
    if (frame < a) return;
    const q = at(a, frame);
    const q0 = at(a, frame - 1);
    const out = (1 - q) * drop;
    cards.push({
      i,
      x: i * fan.x + dir.x * out + shift.x,
      y: i * fan.y + dir.y * out + shift.y,
      rot: (i % 2 ? -1 : 1) * (p.tilt ?? PILE.tilt) * mix(1.6, 1, q),
      scale: mix(PILE.scaleFrom, 1, q),
      v: (q - q0) * drop, // film px the card travelled this frame along the fan (DirBlur v / u along its angle)
      opacity: clamp(q * 3),
    });
  });
  return { cards, count: n, shift, angle: (Math.atan2(dir.y, dir.x) * 180) / Math.PI + 180 };
};

/**
 * A fan: the front card eases aside while the cards behind it slide out the other way in 3D and tilt (house: two
 * cards behind, spread on E.in over 20 f at 60 fps into a blur peak, collapsing back on E.out over 22 f). Offsets
 * are px at 1080p from the front card's rest centre; rotateZ lags the spread (q^1.4). Smear the cards by the
 * spread's speed (DirBlur) on its fastest frames.
 */
export const FAN = {
  slots: [{ x: 120, y: 33, z: 0 }, { x: -135, y: -31, z: -1 }, { x: -349, y: -87, z: -2 }],
  rotZ: -7.3,
  rotY: -9,
  rotX: 6,
  scaleBehind: 0.97,
  spread60: 20,
  collapse60: 22,
} as const;
export type FanProps = { open: number; close?: number; spread?: number; collapse?: number; slots?: { x: number; y: number; z: number }[] };
export type FanCard = { i: number; x: number; y: number; z: number; rotZ: number; rotY: number; rotX: number; scale: number; q: number };

/** The fan at frame f: q (0 closed .. 1 open) and each card's offset and turn, the front card first. Pure. */
export const fanState = (frame: number, p: FanProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const sp = Math.max(1, f60x(p.spread ?? FAN.spread60, fps));
  const cl = Math.max(1, f60x(p.collapse ?? FAN.collapse60, fps));
  const opening = E.in(clamp((frame - p.open) / sp));
  const q = p.close !== undefined && frame >= p.close ? opening * (1 - E.out(clamp((frame - p.close) / cl))) : opening;
  const slots = p.slots ?? FAN.slots;
  const cards: FanCard[] = slots.map((s, i) => ({
    i,
    x: s.x * u * q,
    y: s.y * u * q,
    z: s.z,
    rotZ: i === 0 ? 0 : FAN.rotZ * Math.pow(q, 1.4),
    rotY: i === 0 ? 0 : FAN.rotY * q,
    rotX: i === 0 ? 0 : FAN.rotX * q,
    scale: i === 0 ? 1 : mix(1, FAN.scaleBehind, q),
    q,
  }));
  return { q, cards };
};

/** Continuous: nothing to declare. */
export const declares = (_p?: Partial<StackProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
