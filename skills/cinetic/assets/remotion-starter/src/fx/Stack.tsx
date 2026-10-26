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

/** Continuous: nothing to declare. */
export const declares = (_p?: Partial<StackProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
