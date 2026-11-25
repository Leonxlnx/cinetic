// Motion library: turns. How one scene becomes the next, each one clean: at its peak the frame is covered, the two
// scenes never show a gap or a jump in colour or shape, and on its last frame the next scene is whole and at rest.
//
// Every turn takes `from` and `to` (the two scenes, full-frame nodes), `at` (its first frame) and `speed` (1 = the
// measured timing; 2 = twice as fast). Before `at` it draws `from` alone, after its end `to` alone, so it can sit in a
// Sequence that spans both scenes. `turnEnd(...)` helpers give the frame each one finishes on.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, logScale, mix, rand, type Ease } from '../motion';
import { luminance, mixLab } from '../world';
import { Easing } from 'remotion';

type Scenes = { from: React.ReactNode; to: React.ReactNode; at: number; speed?: number };
export type TurnBox = { x: number; y: number; w: number; h: number; r?: number };

const useUid = (p: string) => p + React.useId().replace(/[^a-zA-Z0-9]/g, '');
/** Progress of a move that starts ON frame a and lands ON frame a + d - 1 (1/d on its first frame, 1 on its last). */
const t01 = (f: number, a: number, d: number) => clamp((f - a + 1) / Math.max(1, d));
const sp = (n: number, speed = 1) => Math.max(1, Math.round(n / speed));
/** Smooth seeded noise along one axis (0..1), for ragged fronts. */
const wave = (u: number, seed: number) => 0.5 + 0.5 * (0.55 * Math.sin(u * 5.3 + seed * 1.7) + 0.3 * Math.sin(u * 11.9 + seed * 3.1) + 0.15 * Math.sin(u * 23.1 + seed * 0.7));

/**
 * The mosaic filter: one sample patch per cell (a third of the cell, so it survives a render at half scale), dilated to the
 * whole cell; cells align to the layer's top-left. Give it a unique id per step.
 */
export const PixelFilter: React.FC<{ id: string; step: number }> = ({ id, step }) => {
  const fs = Math.max(2, Math.round(step * 0.34));
  const r = Math.max(0, (step - fs) / 2);
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feFlood x={r} y={r} height={fs} width={fs} />
        <feComposite width={step} height={step} />
        <feTile result="a" />
        <feComposite in="SourceGraphic" in2="a" operator="in" />
        <feMorphology operator="dilate" radius={r} />
      </filter>
    </svg>
  );
};

/** A directional blur (px along x and y). Edges are duplicated so a full-frame layer never shows a dark seam. */
export const SmearFilter: React.FC<{ id: string; x: number; y?: number }> = ({ id, x, y = 0 }) => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${Math.max(0, x)} ${Math.max(0, y)}`} edgeMode="duplicate" />
    </filter>
  </svg>
);

/** Red, green and blue pulled apart by `d` px along `angle` (deg). Exact recombination at d = 0. */
export const SplitFilter: React.FC<{ id: string; d: number; angle?: number }> = ({ id, d, angle = 0 }) => {
  const dx = Math.cos((angle * Math.PI) / 180) * d;
  const dy = Math.sin((angle * Math.PI) / 180) * d;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={-dx} dy={-dy} result="ro" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={dx} dy={dy} result="bo" />
        <feComposite in="ro" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
        <feComposite in="rg" in2="bo" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </svg>
  );
};

type Origin = 'top' | 'bottom' | 'left' | 'right' | { x: number; y: number };

/** 0..1 distance of a point from an origin (an edge or a point), normalised to the farthest point of the frame. */
const frontDist = (o: Origin, x: number, y: number, W: number, H: number, metric: 'round' | 'diamond' = 'round') => {
  if (o === 'top') return y / H;
  if (o === 'bottom') return 1 - y / H;
  if (o === 'left') return x / W;
  if (o === 'right') return 1 - x / W;
  const fx = Math.max(o.x, W - o.x);
  const fy = Math.max(o.y, H - o.y);
  if (metric === 'diamond') return (Math.abs(x - o.x) + Math.abs(y - o.y)) / (fx + fy);
  return Math.hypot(x - o.x, y - o.y) / Math.hypot(fx, fy);
};
const across = (o: Origin, x: number, y: number, W: number, H: number) => (o === 'top' || o === 'bottom' ? x / W : o === 'left' || o === 'right' ? y / H : Math.atan2(y - o.y, x - o.x) / Math.PI);

// ---------------------------------------------------------------------------------------------------------------------
/**
 * DotReveal: the next scene arrives as a field of round dots (or square cells) that sweep in from an edge or grow out of
 * an object, each dot one flat colour of the next scene; the dots swell until they merge, then the mosaic resolves to the
 * sharp picture while an optional wash clears. The old scene stays still underneath until the dots cover it.
 * Measured: dots on a 30-36 px pitch appear at about 0.6 of the pitch and swell to cover in ~8 f; a ragged front crosses the
 * frame in ~14 f; the mosaic steps down on twos (36, 24, 18) and the wash fades over ~10 f. ~32 f in all.
 */
export const DotReveal: React.FC<
  Scenes & {
    origin?: Origin;
    pitch?: number;
    shape?: 'dot' | 'square';
    /** Frames for the front to cross the frame. */
    sweep?: number;
    /** Frames for one dot to swell from its first size to cover its cell. */
    grow?: number;
    /** Frames for the mosaic to resolve and the wash to clear. */
    resolve?: number;
    /** How ragged the front is (0 straight, 0.35 the reference). */
    rag?: number;
    /** A colour the dots carry at first (a cool or warm cast), clearing as the picture resolves. */
    wash?: string;
    washAmount?: number;
    seed?: number;
    /** A layer that stays sharp above the dots from `at` on (the UI that the new ground arrives under); it animates itself. */
    front?: React.ReactNode;
  }
> = ({ from, to, front, at: start, speed = 1, origin = 'top', pitch = 36, shape = 'dot', sweep = 14, grow = 8, resolve = 10, rag = 0.35, wash, washAmount = 0.45, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('dr');
  const SW = sp(sweep, speed);
  const GR = sp(grow, speed);
  const RS = sp(resolve, speed);
  const covered = start + SW + GR + 2;
  const end = covered + RS;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}{front}</AbsoluteFill>;
  // mosaic cell: the pitch while the dots grow, then 2/3 and 1/2 of it on twos; the last frames de-blur to sharp
  const k = Math.floor(Math.max(0, frame - covered) / Math.max(1, Math.round(2 / speed)));
  const ladder = [2 / 3, 1 / 2];
  const step = frame < covered ? pitch : k < ladder.length ? Math.round(pitch * ladder[k]) : 1;
  const soft = frame >= covered && k >= ladder.length ? 3 * (1 - t01(frame, covered + ladder.length * Math.max(1, Math.round(2 / speed)), Math.max(1, RS - ladder.length * 2))) : 0;
  const washOp = wash ? washAmount * (1 - t01(frame, covered, RS)) : 0;
  let clip: string | undefined;
  if (frame < covered) {
    const cols = Math.ceil(W / pitch);
    const rows = Math.ceil(H / pitch);
    let d = '';
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = (i + 0.5) * pitch;
        const cy = (j + 0.5) * pitch;
        const dist = frontDist(origin, cx, cy, W, H);
        const n = wave(across(origin, cx, cy, W, H) * 3, seed) * rag + rand(i * 7.13 + j * 31.7 + seed) * 0.05;
        const a = start + (SW * (dist + n)) / (1 + rag + 0.05);
        if (frame < a) continue;
        const e = ease.out(t01(frame, a, GR));
        if (shape === 'dot') {
          const r = pitch * mix(e, 0.3, 0.75);
          d += `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
        } else {
          const s = pitch * mix(e, 0.45, 1.02);
          d += `M${(cx - s / 2).toFixed(1)} ${(cy - s / 2).toFixed(1)}h${s.toFixed(1)}v${s.toFixed(1)}h${(-s).toFixed(1)}Z`;
        }
      }
    clip = d ? `path('${d}')` : 'inset(100%)';
  }
  const fid = `${uid}s${step}f${frame}`;
  return (
    <AbsoluteFill>
      {frame < covered && <AbsoluteFill>{from}</AbsoluteFill>}
      {step > 1 && <PixelFilter id={fid} step={step} />}
      <AbsoluteFill style={{ clipPath: clip ?? `path('M0 0H${W}V${H}H0Z')` }}>
        <AbsoluteFill style={{ filter: step > 1 ? `url(#${fid})` : soft > 0.2 ? `blur(${soft}px)` : undefined }}>{to}</AbsoluteFill>
        {washOp > 0.002 && <AbsoluteFill style={{ background: wash, opacity: washOp, mixBlendMode: luminance(wash!) > 0.5 ? 'screen' : 'multiply' }} />}
      </AbsoluteFill>
      {front}
    </AbsoluteFill>
  );
};
export const dotRevealEnd = (at: number, o: { sweep?: number; grow?: number; resolve?: number; speed?: number } = {}) =>
  at + sp(o.sweep ?? 14, o.speed) + sp(o.grow ?? 8, o.speed) + 2 + sp(o.resolve ?? 10, o.speed);

// ---------------------------------------------------------------------------------------------------------------------
/**
 * BlockBurst: square cells burst out of an object (or eat in from an edge in a staircase) until the next scene fills the
 * frame. Cells arrive half size and step to full two frames later (no ramp: digital), scattered single cells run a frame
 * or two ahead of the front, and some cells arrive as an outline first.
 * Measured: 58-60 px cells; the diamond front moves ~0.8 cells a frame and covers 1080p in ~12 f, the corners fill by
 * ~16 f; outlines hold 2-3 f.
 */
export const BlockBurst: React.FC<
  Scenes & {
    /** A point (the object's centre) for a burst, or an edge for a staircase eat. */
    origin?: Origin;
    cell?: number;
    /** Frames for the front to reach the farthest corner. */
    reach?: number;
    /** Colour of the outline cells. */
    edge?: string;
    outlines?: number;
    seed?: number;
  }
> = ({ from, to, at: start, speed = 1, origin = { x: 960, y: 540 }, cell = 60, reach = 14, edge = '#0B0B0C', outlines = 0.07, seed = 5 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const RE = sp(reach, speed);
  const end = start + RE + 5;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}</AbsoluteFill>;
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  let d = '';
  const marks: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) * cell;
      const cy = (j + 0.5) * cell;
      const h = rand(i * 13.1 + j * 71.3 + seed);
      const h2 = rand(i * 3.7 + j * 17.9 + seed * 2.3);
      const stair = typeof origin === 'string' ? Math.abs(across(origin, cx, cy, W, H) - 0.5) * 0.45 : 0;
      const dist = frontDist(origin, cx, cy, W, H, 'diamond') + stair;
      const a = start + Math.round(RE * (dist / (1 + (typeof origin === 'string' ? 0.225 : 0))) + h * 2);
      const age = frame - a;
      let s = 0;
      if (age >= 2) s = cell + 1;
      else if (age >= 0) s = cell * 0.62;
      else if (age >= -2 && h2 < 0.3) s = cell * 0.4; // a scout ahead of the front
      if (s <= 0) continue;
      d += `M${(cx - s / 2).toFixed(1)} ${(cy - s / 2).toFixed(1)}h${s.toFixed(1)}v${s.toFixed(1)}h${(-s).toFixed(1)}Z`;
      if (h2 > 1 - outlines && age >= 0 && age < 2)
        marks.push(<div key={`${i}-${j}`} style={{ position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s, boxSizing: 'border-box', border: `${Math.max(3, cell * 0.07)}px solid ${edge}` }} />);
    }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: d ? `path('${d}')` : 'inset(100%)' }}>{to}</AbsoluteFill>
      {marks.length > 0 && <AbsoluteFill>{marks}</AbsoluteFill>}
    </AbsoluteFill>
  );
};
export const blockBurstEnd = (at: number, o: { reach?: number; speed?: number } = {}) => at + sp(o.reach ?? 14, o.speed) + 5;

// ---------------------------------------------------------------------------------------------------------------------
/** Smallest radius at which a shape centred at (x, y) covers the whole W x H frame. */
const coverRadius = (x: number, y: number, W: number, H: number, aspect = 1) => {
  const dx = Math.max(x, W - x);
  const dy = Math.max(y, H - y);
  return Math.sqrt(dx * dx + (dy / aspect) * (dy / aspect));
};

/**
 * GrowIris: a shape grows out of an object on screen until it IS the next scene, and it covers every corner on its last
 * frame (the radius is solved for the farthest corner, not guessed). Inside it, the next scene settles from smaller, so the
 * opening reads as a camera pushing through. Shapes: circle, ellipse (a letter's counter), rounded (a card or a button).
 * Measured: from the object's size to the corners in 6 f; radius 0.34, 0.49, 0.59, 0.79, 1 of the way on f1-5; the scene
 * inside from 0.58 to 1 (expo out); a 6 px soft edge.
 */
export const GrowIris: React.FC<
  Scenes & {
    x: number;
    y: number;
    /** The object's size: a radius for circle and ellipse, a box for rounded. */
    r0?: number;
    box?: { w: number; h: number; r: number };
    shape?: 'circle' | 'ellipse' | 'rounded';
    /** Height over width of an ellipse. */
    aspect?: number;
    dur?: number;
    soft?: number;
    /** Scale of the next scene inside the shape at the start. */
    inner?: number;
    /** A rim on the opening edge (the object's own outline colour), fading as it grows. */
    rim?: string;
  }
> = ({ from, to, at: start, speed = 1, x, y, r0 = 120, box, shape = 'circle', aspect = 1.25, dur = 6, soft = 6, inner = 0.58, rim }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const t = t01(frame, start, D);
  const p = 1 - Math.pow(1 - t, 1.35);
  const s = mix(ease.out(t), inner, 1);
  const scene = <AbsoluteFill style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${s})` }}>{to}</AbsoluteFill>;
  let win: React.ReactNode;
  if (shape === 'rounded') {
    const b = box ?? { w: r0 * 2, h: r0 * 2, r: r0 * 0.3 };
    const R = b.r;
    // grow each edge to the frame edge plus the corner radius, so the rounded corners sit outside the frame at the end
    const l = mix(p, x - b.w / 2, -R - soft);
    const rr = mix(p, x + b.w / 2, W + R + soft);
    const tp = mix(p, y - b.h / 2, -R - soft);
    const bt = mix(p, y + b.h / 2, H + R + soft);
    win = (
      <div style={{ position: 'absolute', left: l, top: tp, width: rr - l, height: bt - tp, borderRadius: R, overflow: 'hidden', boxShadow: rim ? `inset 0 0 0 ${mix(p, 4, 1)}px ${rim}` : undefined }}>
        <div style={{ position: 'absolute', left: -l, top: -tp, width: W, height: H }}>{scene}</div>
      </div>
    );
  } else {
    const asp = shape === 'ellipse' ? aspect : 1;
    const R = coverRadius(x, y, W, H, asp) + soft + 2;
    const r = mix(p, r0, R);
    const mask = `radial-gradient(ellipse ${r}px ${r * asp}px at ${x}px ${y}px, #000 ${Math.max(0, 100 - (soft / r) * 100)}%, transparent 100%)`;
    win = (
      <>
        <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{scene}</AbsoluteFill>
        {rim && (
          <div style={{ position: 'absolute', left: x - r, top: y - r * asp, width: r * 2, height: r * 2 * asp, borderRadius: '50%', boxShadow: `0 0 0 ${mix(p, 5, 1)}px ${rim}`, opacity: 1 - p }} />
        )}
      </>
    );
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      {win}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/** The smallest scale at which a rounded box (w x h, radius r), centred on the frame, covers the frame corners too. */
const diveCover = (w: number, h: number, r: number, W: number, H: number) => {
  const covers = (s: number) => {
    const A = (w * s) / 2, B = (h * s) / 2, R = r * s;
    if (A < W / 2 || B < H / 2) return false;
    const ex = W / 2 - (A - R), ey = H / 2 - (B - R);
    if (ex <= 0 || ey <= 0) return true;
    return ex * ex + ey * ey <= R * R;
  };
  let lo = Math.max(W / w, H / h), hi = lo * 4;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (covers(m)) hi = m;
    else lo = m;
  }
  return hi * 1.002;
};

const diveCurve: Ease = Easing.bezier(0.4, 0, 0.75, 0.35);

/**
 * DiveInto: the camera dives into an object (a card, a window, a screen, a porthole) and its inside is the next scene.
 * The zoom is exponential and accelerates (ease in) until the object's rounded box covers the frame, corners included,
 * on the last frame of the dive; the next scene is a plate inside the object that the window outruns (it starts already
 * larger than the window and grows less), so there is depth; after landing the next scene keeps a little of the speed.
 * Measured: 18-24 f to cover; window x11, plate x1.9; blur on the outer scene from 0 to ~8 px in the last third.
 */
export const DiveInto: React.FC<
  Scenes & {
    box: TurnBox;
    dur?: number;
    /** How much larger than the window the plate starts (1 = the same size: a rigid dive). */
    plate?: number;
    /** How much the next scene keeps growing after landing (a share of its size) and over how many frames. */
    carry?: number;
    settle?: number;
    blur?: number;
    curve?: Ease;
  }
> = ({ from, to, at: start, speed = 1, box, dur = 20, plate = 2.2, carry = 0.03, settle = 18, blur = 8, curve = diveCurve }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  const end = start + D;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) {
    const q = ease.out(t01(frame, end, sp(settle, speed)));
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transform: `scale(${1 + carry * q})` }}>{to}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const r = box.r ?? 0;
  const S = diveCover(box.w, box.h, r, W, H);
  const p = curve(t01(frame, start, D));
  const s = logScale(1, S, p);
  const cx = mix(p, box.x, W / 2);
  const cy = mix(p, box.y, H / 2);
  // window on screen
  const ww = box.w * s, wh = box.h * s;
  const wl = cx - ww / 2, wt = cy - wh / 2;
  // the plate: log interpolation from `plate` x the window to the full frame, never smaller than the visible window
  const ps0 = (plate * box.w) / W;
  let ps = logScale(Math.max(ps0, (box.h * plate) / H), 1, p);
  const il = Math.max(0, wl), ir = Math.min(W, wl + ww), it = Math.max(0, wt), ib = Math.min(H, wt + wh);
  const need = Math.max((Math.max(cx - il, ir - cx) * 2) / W, (Math.max(cy - it, ib - cy) * 2) / H);
  ps = Math.max(ps, need);
  const speedNow = Math.abs(curve(t01(frame + 1, start, D)) - p);
  const b = blur * clamp((p - 0.35) / 0.65) * clamp(speedNow * 6);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${cx - box.x * s}px, ${cy - box.y * s}px) scale(${s})`, filter: b > 0.3 ? `blur(${b / Math.sqrt(s)}px)` : undefined }}>
        {from}
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: wl, top: wt, width: ww, height: wh, borderRadius: r * s, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: cx - wl - W / 2, top: cy - wt - H / 2, width: W, height: H, transform: `scale(${ps})` }}>{to}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
const bz = (a: number, b: number, c: number, d: number): Ease => Easing.bezier(a, b, c, d);
const whipCurve = bz(0.23, 0, 0.72, 0.12);

/**
 * WhipGate: an accelerating whip that never brakes, a two-frame gate inside the blur (the old and the next scene crossed in
 * one smeared exposure, then the next scene torn into horizontal streaks), and the next scene arriving at whip speed, its
 * smear clearing as it slows. The cut hides inside the fastest frames; no frame is lighter or darker than the scenes.
 * Measured: 12 f build (cubic-bezier 0.23, 0, 0.72, 0.12), +245 px, stage blur 2 to 26 px; 2 gate frames; the next scene
 * enters ~140 px behind its rest with a 20 px smear and lands in ~8 f.
 */
export const WhipGate: React.FC<
  Scenes & {
    /** Where the content travels. */
    dir?: 'left' | 'right' | 'up' | 'down';
    dur?: number;
    dist?: number;
    smear?: number;
    land?: number;
    enter?: number;
  }
> = ({ from, to, at: start, speed = 1, dir = 'right', dur = 12, dist = 260, smear = 26, land = 8, enter = 160 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('wg');
  const D = sp(dur, speed);
  const L = sp(land, speed);
  const gate = start + D;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= gate + 2 + L) return <AbsoluteFill>{to}</AbsoluteFill>;
  const horiz = dir === 'left' || dir === 'right';
  const sign = dir === 'right' || dir === 'down' ? 1 : -1;
  const sm = (id: string, px: number) => <SmearFilter id={id} x={horiz ? px : 0} y={horiz ? 0 : px} />;
  // a scene moved by o px, with a mirrored copy filling the side it uncovers: the edge is continuous, so the frame never
  // shows a gap or the ground behind the turn, and the smear runs across the seam
  const pan = (node: React.ReactNode, o: number, filter?: string, extra?: React.CSSProperties) => {
    const size = horiz ? W : H;
    const m = o - Math.sign(o || 1) * size;
    const t = (v: number) => (horiz ? `translateX(${v}px)` : `translateY(${v}px)`);
    const flip = horiz ? 'scaleX(-1)' : 'scaleY(-1)';
    return (
      <AbsoluteFill style={{ filter, ...extra }}>
        <AbsoluteFill style={{ transform: t(o) }}>{node}</AbsoluteFill>
        {Math.abs(o) > 0.5 && <AbsoluteFill style={{ transform: `${t(m)} ${flip}` }}>{node}</AbsoluteFill>}
      </AbsoluteFill>
    );
  };
  if (frame < gate) {
    const t = t01(frame, start, D);
    const o = sign * dist * whipCurve(t);
    const b = mix(t * t, 1, smear);
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sm(`${uid}a${frame}`, b)}
        {pan(from, o, `url(#${uid}a${frame})`)}
      </AbsoluteFill>
    );
  }
  if (frame === gate) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sm(`${uid}g`, smear * 2.2)}
        {pan(to, -sign * enter * 1.5, `url(#${uid}g)`)}
        {pan(from, sign * dist * 1.35, `url(#${uid}g)`, { opacity: 0.5 })}
      </AbsoluteFill>
    );
  }
  if (frame === gate + 1) {
    const dirn = horiz ? '180deg' : '90deg';
    const lines = `repeating-linear-gradient(${dirn}, #000 0 2px, transparent 2px 5px, rgba(0,0,0,.7) 5px 6px, transparent 6px 11px)`;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sm(`${uid}s`, smear * 1.6)}
        {sm(`${uid}t`, smear * 4)}
        {pan(to, -sign * enter * 1.15, `url(#${uid}s)`)}
        {pan(to, -sign * enter * 0.8, `url(#${uid}t)`, { WebkitMaskImage: lines, maskImage: lines })}
      </AbsoluteFill>
    );
  }
  const u = t01(frame, gate + 2, L);
  const o = -sign * enter * (1 - ease.out(u));
  const b = smear * 0.8 * Math.pow(1 - u, 2);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {sm(`${uid}l${frame}`, b)}
      {pan(to, o, b > 0.3 ? `url(#${uid}l${frame})` : undefined)}
    </AbsoluteFill>
  );
};export const whipGateEnd = (at: number, o: { dur?: number; land?: number; speed?: number } = {}) => at + sp(o.dur ?? 12, o.speed) + 2 + sp(o.land ?? 8, o.speed);

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Shove: the old scene is cut into bands that are shoved off one after another, accelerating, each smearing on its fastest
 * frames (alternate bands may go the other way, so the lines peel apart), while the next scene slides in underneath from
 * another side and lands. The next scene is full-frame from the first frame, so there is never a gap.
 * Measured: bands 2 f apart, each 14 f ease-in out of frame with a smear on the last 3 f; the incoming scene drops ~35 % of
 * the frame and lands with expo out over ~16 f. Clean: every band (and its smear) is off the frame on its last drawn frame,
 * and the incoming scene starts to land only in the last band's fast frames, so no slab of the old scene stays beside it.
 */
export const Shove: React.FC<
  Scenes & {
    /** Where the old bands go. */
    dir?: 'left' | 'right' | 'up' | 'down';
    bands?: number;
    lag?: number;
    dur?: number;
    /** Odd bands go the other way. */
    alternate?: boolean;
    /** Where the next scene comes from, and how far it travels (a share of the frame). */
    enterFrom?: 'top' | 'bottom' | 'left' | 'right';
    enter?: number;
    land?: number;
    smear?: number;
    /** Painted under the incoming scene (its ground), in case it is drawn without one. */
    ground?: string;
    /** Band edges in px across the bands (put them between lines of type); overrides `bands`. */
    cuts?: number[];
  }
> = ({ from, to, at: start, speed = 1, dir = 'left', cuts, bands: nb = 4, lag = 2, dur = 14, alternate = false, enterFrom = 'top', enter = 0.35, land = 16, smear = 28, ground }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('sv');
  const edges = cuts ? [0, ...cuts, (dir === 'left' || dir === 'right' ? H : W) ] : null;
  const bands = edges ? edges.length - 1 : nb;
  const D = sp(dur, speed);
  const LG = Math.max(0, Math.round(lag / speed));
  const LD = sp(land, speed);
  // the next scene lands only once the last band is in its fast frames: no band of the old scene shares a frame with the
  // next scene settled and readable
  const landAt = start + (bands - 1) * LG + Math.max(2, D - 4);
  const end = Math.max(start + D + (bands - 1) * LG, landAt + LD);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}</AbsoluteFill>;
  const horiz = dir === 'left' || dir === 'right';
  const size = horiz ? W : H;
  // every band is wholly off the frame (its smear too) on its last drawn frame: nothing of the old scene is left behind
  const travel = size + 2 * smear + 24;
  const qLast = ease.in((D - 1) / D) || 1;
  const u = ease.out(t01(frame, landAt, LD));
  const eo = (1 - u) * enter * (enterFrom === 'top' || enterFrom === 'bottom' ? H : W) * (enterFrom === 'top' || enterFrom === 'left' ? -1 : 1);
  const et = enterFrom === 'top' || enterFrom === 'bottom' ? `translateY(${eo}px)` : `translateX(${eo}px)`;
  const strips: React.ReactNode[] = [];
  for (let k = 0; k < bands; k++) {
    const s0 = start + k * LG;
    const t = t01(frame, s0, D);
    if (t >= 1) continue;
    const sign = (dir === 'left' || dir === 'up' ? -1 : 1) * (alternate && k % 2 ? -1 : 1);
    const q = Math.min(1, ease.in(t) / qLast);
    const v = Math.abs(Math.min(1, ease.in(t01(frame + 1, s0, D)) / qLast) - q) * travel;
    const o = sign * q * travel;
    const a = edges ? edges[k] : (k / bands) * (horiz ? H : W);
    const b = edges ? edges[k + 1] : ((k + 1) / bands) * (horiz ? H : W);
    const clip = horiz ? `inset(${a}px 0 ${H - b - 0.5}px 0)` : `inset(0 ${W - b - 0.5}px 0 ${a}px)`;
    const blur = Math.min(smear, v * 0.25);
    const id = `${uid}${k}f${frame}`;
    strips.push(
      <AbsoluteFill key={k} style={{ clipPath: clip }}>
        {blur > 0.5 && <SmearFilter id={id} x={horiz ? blur : 0} y={horiz ? 0 : blur} />}
        <AbsoluteFill style={{ transform: horiz ? `translateX(${o}px)` : `translateY(${o}px)`, filter: blur > 0.5 ? `url(#${id})` : undefined }}>{from}</AbsoluteFill>
      </AbsoluteFill>,
    );
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: ground }}>
      <AbsoluteFill style={{ transform: et }}>{to}</AbsoluteFill>
      {strips}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * ShapeMatch: a match cut on shape. One shape in the old scene (an icon tile, a chip, a dot, a photo) detaches and travels
 * to where the same shape sits in the next scene, changing size, radius and colour on the way, while the old scene is
 * carried off the other way; the next scene cuts in around the shape the moment it lands.
 * Measured: 12-14 f; the shape on ease in-out; the old scene leaves with ease in and a smear, opposite to the shape's travel.
 * Draw the shape in both scenes at exactly `a` and `b`; `ground` is the next scene's ground (painted behind the travel).
 */
export const ShapeMatch: React.FC<
  Scenes & {
    a: TurnBox & { color: string };
    b: TurnBox & { color: string };
    dur?: number;
    ground: string;
    /** Drawn inside the travelling shape (a glyph, a mark), laid out at `b`'s size and scaled with the shape. */
    inside?: React.ReactNode;
  }
> = ({ from, to, at: start, speed = 1, a, b, dur = 14, ground, inside }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('sm');
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const t = t01(frame, start, D);
  const p = ease.inOut(t);
  const x = mix(p, a.x, b.x), y = mix(p, a.y, b.y), w = mix(p, a.w, b.w), h = mix(p, a.h, b.h), r = mix(p, a.r ?? 0, b.r ?? 0);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = -(b.x - a.x) / len, uy = -(b.y - a.y) / len;
  const q = ease.in(clamp(t / 0.8));
  const off = q * W * 0.9;
  const blur = 24 * clamp((q - 0.2) * 2);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      {blur > 0.5 && <SmearFilter id={`${uid}${frame}`} x={Math.abs(ux) * blur} y={Math.abs(uy) * blur} />}
      {q < 1 && (
        <AbsoluteFill style={{ transform: `translate(${ux * off}px, ${uy * off}px)`, filter: blur > 0.5 ? `url(#${uid}${frame})` : undefined }}>
          {/* the shape's own copy is cut out of the old scene: it is the travelling shape now */}
          <AbsoluteFill style={{ clipPath: `path(evenodd, 'M-50 -50H${W + 50}V${H + 50}H-50Z M${a.x - a.w / 2 - 1} ${a.y - a.h / 2 - 1}h${a.w + 2}v${a.h + 2}h${-a.w - 2}Z')` }}>{from}</AbsoluteFill>
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, background: mixLab(a.color, b.color, p), overflow: 'hidden' }}>
        {inside && (
          <div style={{ position: 'absolute', left: (w - b.w) / 2, top: (h - b.h) / 2, width: b.w, height: b.h, transform: `scale(${w / b.w}, ${h / b.h})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inside}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
export type GlitchState = 'from' | 'to' | 'slice' | 'grid-from' | 'grid-to' | 'rgb-from' | 'rgb-to' | 'scan-from' | 'scan-to';

/**
 * GlitchCut: a few frames where the picture breaks and the next scene flickers through. Each frame is one state, cut
 * hard, no blending: the old scene sliced into displaced bands mixed with the new one, the old scene crushed to a mosaic
 * under a fine cell grid, the channels pulled apart, a clean frame of either scene between them. Use it once, on a beat.
 * Measured: 7-8 states of 1 f (2 f on a slower film), glitched and clean frames alternating; bands 30-140 px tall shifted
 * up to ~130 px; channel split 8-12 px; mosaic cells 16-24 px.
 */
export const GlitchCut: React.FC<
  Scenes & {
    steps?: GlitchState[];
    hold?: number;
    seed?: number;
    shift?: number;
    /** Colour of the grid lines in the grid states. */
    grid?: string;
  }
> = ({ from, to, at: start, steps = ['slice', 'from', 'grid-from', 'to', 'scan-to', 'slice', 'to', 'rgb-to'], hold = 1, seed = 7, shift = 130, grid = 'rgba(20,20,24,.55)' }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('gc');
  const end = start + steps.length * hold;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}</AbsoluteFill>;
  const idx = Math.floor((frame - start) / hold);
  const st = steps[idx];
  const sd = seed + idx * 13.7;
  if (st === 'from' || st === 'to') return <AbsoluteFill>{st === 'from' ? from : to}</AbsoluteFill>;
  if (st === 'rgb-from' || st === 'rgb-to') {
    const id = `${uid}r${idx}`;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <SplitFilter id={id} d={10} angle={rand(sd) * 20 - 10} />
        <AbsoluteFill style={{ filter: `url(#${id})`, transform: `scale(1.015)` }}>{st === 'rgb-from' ? from : to}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (st === 'scan-from' || st === 'scan-to') {
    // rows torn into horizontal bands: a heavy x-only blur, every other band pulled sideways
    const id = `${uid}s${idx}`;
    const rows = 'repeating-linear-gradient(180deg, #000 0 14px, transparent 14px 22px, #000 22px 26px, transparent 26px 40px)';
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <SmearFilter id={id} x={60} />
        <AbsoluteFill style={{ filter: `url(#${id})` }}>{st === 'scan-from' ? from : to}</AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateX(${(rand(sd) - 0.5) * shift}px)`, WebkitMaskImage: rows, maskImage: rows }}>{st === 'scan-from' ? from : to}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (st === 'grid-from' || st === 'grid-to') {
    const id = `${uid}p${idx}`;
    const cell = 18;
    const lines = `repeating-linear-gradient(0deg, ${grid} 0 1px, transparent 1px ${cell}px), repeating-linear-gradient(90deg, ${grid} 0 1px, transparent 1px ${cell}px), repeating-linear-gradient(45deg, transparent 0 ${cell * 0.62}px, rgba(20,20,24,.25) ${cell * 0.62}px ${cell * 0.62 + 1}px, transparent ${cell * 0.62 + 1}px ${cell * 0.71}px)`;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <PixelFilter id={id} step={cell} />
        <AbsoluteFill style={{ clipPath: `path('M0 0H${W}V${H}H0Z')` }}>
          <AbsoluteFill style={{ filter: `url(#${id}) contrast(2.2) grayscale(0.4)` }}>{st === 'grid-from' ? from : to}</AbsoluteFill>
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundImage: lines, mixBlendMode: 'multiply' }} />
      </AbsoluteFill>
    );
  }
  // slice: bands of either scene, displaced, a few stretched
  const bands: React.ReactNode[] = [];
  let yy = 0;
  let k = 0;
  while (yy < H) {
    const hh = Math.round(mix(rand(sd + k * 3.3), 30, 150));
    const src = rand(sd + k * 7.1) < 0.55 ? to : from;
    const dx = (rand(sd + k * 1.9) - 0.5) * 2 * shift * (rand(sd + k * 5.7) < 0.3 ? 0 : 1);
    const stretch = rand(sd + k * 9.1) < 0.18 ? mix(rand(sd + k), 1.4, 2.4) : 1;
    // a displaced band wraps round (a second copy fills the side it left), so no band ever shows an empty edge
    bands.push(
      <AbsoluteFill key={k} style={{ clipPath: `inset(${yy}px 0 ${Math.max(0, H - yy - hh - 0.5)}px 0)` }}>
        <AbsoluteFill style={{ transformOrigin: `${W / 2}px ${yy + hh / 2}px`, transform: `translateX(${dx}px) scaleX(${stretch})` }}>{src}</AbsoluteFill>
        {Math.abs(dx) > 0.5 && stretch === 1 && <AbsoluteFill style={{ transform: `translateX(${dx - Math.sign(dx) * W}px)` }}>{src}</AbsoluteFill>}
      </AbsoluteFill>,
    );
    yy += hh;
    k++;
  }
  return <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>{bands}</AbsoluteFill>;
};
export const glitchCutEnd = (at: number, steps = 8, hold = 1) => at + steps * hold;

// ---------------------------------------------------------------------------------------------------------------------
const openCurve: Ease = Easing.bezier(0.32, 0, 0.12, 1);

/**
 * WindowOpen: a window or panel opens out of the button or card that was pressed. The button's rounded rectangle grows
 * into the window's rectangle (position, size and radius together), and inside it the next scene's window is already laid
 * out and drawn whole, scaled to fit the growing rectangle (cover, centred): never an empty plate, never a reveal through
 * a sliding clip edge. The button's own face (`face`) sits on top and fades out in the first fifth, growing 15 % at most. On its last frame the
 * rectangle is the window and the next scene is whole.
 * Measured: 12-16 f; a short lift out of the button then a long settle (cubic-bezier 0.32, 0, 0.12, 1); the shadow grows
 * with it. The scene around the window must be the same in both scenes (one desk, one ground); otherwise open to the
 * full frame (`win` omitted).
 */
export const WindowOpen: React.FC<
  Scenes & {
    /** The button or card in the old scene (its centre, size and radius), exactly as drawn there. */
    box: TurnBox;
    /** The window in the next scene (its centre, size and radius); default the full frame. */
    win?: TurnBox;
    dur?: number;
    /** The button's face (its label and fill, laid out at `box` size), fading out over the first fifth. */
    face?: React.ReactNode;
    /** The window's surface colour, under its content while it grows. */
    surface?: string;
    /** A shadow under the growing rectangle (`softShadow(...)`). */
    shadow?: string;
  }
> = ({ from, to, at: start, speed = 1, box, win, dur = 14, face, surface = '#FFFFFF', shadow }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D - 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const w1 = win ?? { x: W / 2, y: H / 2, w: W, h: H, r: 0 };
  const p = openCurve(t01(frame, start, D));
  const cx = mix(p, box.x, w1.x);
  const cy = mix(p, box.y, w1.y);
  const cw = mix(p, box.w, w1.w);
  const ch = mix(p, box.h, w1.h);
  const cr = mix(p, box.r ?? 0, w1.r ?? 0);
  // the window's content, drawn whole and scaled to cover the rectangle (centred on it): it grows, it is never uncovered
  const s = Math.max(cw / w1.w, ch / w1.h);
  const left = cx - cw / 2;
  const top = cy - ch / 2;
  // the face leaves fast and barely grows: a label scaled up over the window's content reads as an overprint
  const faceO = 1 - clamp(t01(frame, start, Math.max(2, Math.round(D / 5))));
  const fs = Math.min(1.15, cw / box.w, ch / box.h);
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <div style={{ position: 'absolute', left, top, width: cw, height: ch, borderRadius: cr, overflow: 'hidden', background: surface, boxShadow: shadow }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${cw / 2 - w1.x * s}px, ${ch / 2 - w1.y * s}px) scale(${s})` }}>{to}</div>
        {face && faceO > 0.01 && (
          <div style={{ position: 'absolute', left: cw / 2 - box.w / 2, top: ch / 2 - box.h / 2, width: box.w, height: box.h, opacity: faceO, transform: `scale(${fs})` }}>{face}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
export const windowOpenEnd = (at: number, o: { dur?: number; speed?: number } = {}) => at + sp(o.dur ?? 14, o.speed) - 1;
