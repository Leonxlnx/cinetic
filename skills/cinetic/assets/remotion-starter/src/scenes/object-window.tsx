// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// object-window: a large glass app window rises into a dark field already a little turned, holding the product's mark
// as a solid object; the object turns half round to face us, the camera pushes in until the window faces it square and
// fills most of the frame; a pointer glides in, rests on the object and clicks, a marker blooms on the spot it chose and
// stays; the pointer travels to the window's dark pill (its confirm) and presses it.
// Numbers (frames at 30 fps, px at 1080): the window arrives at x0.74 of its final size, turned 6 deg (its right side
// 5 % shorter), rising 116 px in 15 f decelerating (-26, -17, -10, -6, -3, -2 px a frame); the object turns 160 -> 0 deg
// about its vertical axis over 14 f on the measured curve (10, 30, 60, 90 ... 179 deg of 180); the push runs f24-46
// on cubic-bezier(.52, .18, .30, .98) to the frame (270, 82)-(1660, 1008), radius 110, inner panel radius 90 with a
// 1.5 px rim (40 % white, brighter on top); the pointer enters from the bottom edge at f42 (peak ~98 px a frame,
// braking), rests on the object at f52, clicks at f58 (the marker grows to 18 px by f61, its halo 50 % at 28 px, 10 % at
// 62 px), travels to the pill f64-71 on cubic-bezier(.76, .08, .11, 1) and presses it at f74.
// The object is fx/three's extruded mark on a GPU and, without hardware WebGL, the same turn as a CSS-3D solid (its
// face over a stack of its own silhouette receding in depth, each slice darker), so a software render reads as an object.
import React, { useEffect, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { type Logo, type LogoPart, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { C, FONT } from '../brand/tokens';
import { Cursor } from '../fx/Cursor';
import { markSolid } from '../fx/three/geo';
import { draws3D, type GlMode } from '../fx/three/gl';
import { deg, Stage3D, useSampler } from '../fx/three/stage';
import { ICON_GRID, ICONS } from '../kit/icons';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { type Palette, paletteOf, type SceneMeta, span, tab, useClock } from './parts';
import { bezier, Stage1080 } from './stage1080';

export type ObjectWindowProps = {
  /** the object: the product's mark (logoParts() of its SVG), extruded into a solid; default the starter's mark in the palette */
  logo?: Logo;
  /** the pill's label (default 'Save') */
  done?: string;
  /** the spot the pointer marks on the object, in the mark's 100 box (default its centre) */
  spot?: readonly [number, number];
  /** ink: the field and the pill; accent: the window's panel tint, the marker; lift: the field's light pool; paper: rims and icons */
  palette?: Partial<Palette>;
  /** false: no pointer (the marker still blooms on its frame) */
  pointer?: boolean;
  gl?: GlMode;
  frame?: number;
};

export const OBJECT_WINDOW = {
  dur: 84,
  rise: [0, 15] as const,
  turn: [10, 24] as const,
  push: [24, 46] as const,
  enter: 42,
  rest: 52,
  click: 58,
  travel: [64, 71] as const,
  press: 74,
  from: 160, // the object's first angle (deg): its back and a side, turning to face
  size: 470, // the object's size at the end (px of the 100 box)
} as const;

const RISE: [number, number][] = [[0, 116], [1, 90], [2, 73], [3, 63], [6, 35], [9, 15], [12, 5], [15, 0]];
const TURN: [number, number][] = [[10, 0], [11, 10], [12, 30], [13, 60], [14, 90], [15, 115], [16, 135], [17, 150], [18, 162], [19, 170], [20, 175], [21, 178], [22, 179], [24, 180]];
const GLIDE: [number, number][] = [[42, 0], [43, 0.17], [44, 0.37], [45, 0.57], [46, 0.73], [47, 0.83], [48, 0.91], [49, 0.955], [50, 0.985], [51, 0.998], [52, 1]];
const PUSH = bezier(0.52, 0.18, 0.3, 0.98);
const TRAVEL = bezier(0.76, 0.08, 0.11, 1);
// the window: final frame and its arriving scale, centre and turn
const WIN = { x: 270, y: 82, w: 1390, h: 926, r: 110, inset: 30 };
const START = { s: 0.742, cx: 955, cy: 539, turn: -6 };

/** The window at frame t: centre, scale, turn (deg about its vertical axis). */
export const windowPose = (t: number) => {
  const p = PUSH(span(t, OBJECT_WINDOW.push[0], OBJECT_WINDOW.push[1]));
  const endC = { x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h / 2 };
  return { cx: START.cx + (endC.x - START.cx) * p, cy: START.cy + (endC.y - START.cy) * p + tab(t, RISE), s: START.s + (1 - START.s) * p, turn: START.turn * (1 - p), p };
};
const objectAngle = (t: number) => OBJECT_WINDOW.from * (1 - tab(t, TURN) / 180);

const Ico: React.FC<{ name: keyof typeof ICONS; x: number; y: number; size: number; color: string }> = ({ name, x, y, size, color }) => (
  <svg width={size} height={size} viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2 }}>
    <path d={ICONS[name].regular} fill={color} />
  </svg>
);

/** The CSS-3D solid: the mark's face over slices of its silhouette receding in depth, turned in a real perspective. */
const SliceSolid: React.FC<{ logo: Logo; size: number; yaw: number; P: Palette }> = ({ logo, size, yaw, P }) => {
  const depth = size * 0.22;
  const n = 22;
  const back = Math.cos((yaw * Math.PI) / 180) < 0;
  // each slice in its part's own colour, darker toward the back (a fill the mixer cannot read walls in a mid tone)
  const sideOf = (k: number) => (part: LogoPart) => {
    const f = part.items.find((it) => it.fill && it.fill !== 'none')?.fill ?? part.fill;
    const base = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(f) || /^rgba?\(/i.test(f) ? f : mixColor(P.ink, P.paper, 0.4);
    return mixColor(base, P.ink, 0.32 + 0.36 * (k / n));
  };
  return (
    <div style={{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, transformStyle: 'preserve-3d', transform: `perspective(1800px) rotateX(-6deg) rotateY(${yaw.toFixed(3)}deg)` }}>
      {Array.from({ length: n }, (_, i) => n - i).map((k) => (
        <div key={k} style={{ position: 'absolute', inset: 0, transform: `translateZ(${(-(depth * k) / n).toFixed(2)}px)` }}>
          <LogoMark logo={logo} size={size} fill={sideOf(k)} />
        </div>
      ))}
      <div style={{ position: 'absolute', inset: 0, opacity: back ? 0 : 1 }}>
        <LogoMark logo={logo} size={size} />
      </div>
    </div>
  );
};

const ObjectSolid: React.FC<{ logo: Logo; frameOf: (tf: number) => number; at: (t: number) => { x: number; y: number; size: number; yaw: number }; W: number; H: number }> = ({ logo, frameOf, at, W, H }) => {
  const built = useMemo(() => markSolid(logo, 24, 2.2, 'gloss'), [logo]);
  useEffect(() => () => built.dispose(), [built]);
  useSampler((tf) => {
    const t = frameOf(tf);
    const o = at(t);
    built.root.position.set(o.x - W / 2, H / 2 - o.y, 0);
    built.root.rotation.set(deg(6), deg(o.yaw), 0, 'YXZ');
    built.root.scale.setScalar(o.size / 100);
    built.flat.value = 0;
    const moving = t < OBJECT_WINDOW.push[1] + 1;
    return { moving, still: !moving };
  });
  return <primitive object={built.root} />;
};

export const ObjectWindow: React.FC<ObjectWindowProps> = ({ logo, done = 'Save', spot, palette, pointer = true, gl = 'auto', frame }) => {
  const { t, k: rate, W, H } = useClock(frame);
  const cur = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const P = paletteOf(palette);
  // no logo: the placeholder mark in the palette, its ink parts in paper (a light object in the dark window)
  const lg = useMemo(() => logo ?? logoParts(SAMPLE_MARK_SVG.split(C.accent).join(P.accent).split(C.ink).join(P.paper)), [logo, P.accent, P.paper]);
  const three = draws3D(gl);
  const field = mixColor(P.ink, P.accent, 0.08);
  const win = windowPose(t);
  // where the object stands on screen (the window's centre, a little high) and its size
  const objAt = (tt: number) => {
    const w = windowPose(tt);
    return { x: w.cx, y: w.cy - 10 * w.s, size: OBJECT_WINDOW.size * w.s, yaw: objectAngle(tt) };
  };
  const obj = objAt(t);
  // the spot on the object (screen px), the pill, the pointer's path
  const sp = spot ?? [lg.box.x + lg.box.w * 0.62, lg.box.y + lg.box.h * 0.58];
  const spotX = obj.x + ((sp[0] - 50) / 100) * obj.size;
  const spotY = obj.y + ((sp[1] - 50) / 100) * obj.size;
  const pillC = { x: win.cx + (1504 - 965) * win.s, y: win.cy + (919 - 545) * win.s };
  const g = tab(t, GLIDE);
  const m = TRAVEL(span(t, OBJECT_WINDOW.travel[0], OBJECT_WINDOW.travel[1]));
  const entry = { x: 1480, y: 1110 };
  const px = entry.x + (spotX - entry.x) * g + (pillC.x + 8 - spotX) * m;
  const py = entry.y + (spotY - entry.y) * g + (pillC.y + 6 - spotY) * m;
  const pressAt = (f: number) => {
    const d = t - f;
    return d <= 0 || d >= 6 ? 0 : d < 2 ? d / 2 : 1 - (d - 2) / 4;
  };
  const press = pressAt(OBJECT_WINDOW.click) + pressAt(OBJECT_WINDOW.press);
  const dot = E.snapOut(span(t, OBJECT_WINDOW.click, OBJECT_WINDOW.click + 3));
  const pill = pressAt(OBJECT_WINDOW.press);
  const panelTop = mixColor(P.ink, P.accent, 0.34);
  const panelLow = mixColor(P.ink, P.accent, 0.62);
  const rim = withAlpha(P.paper, 0.4);
  const icon = withAlpha(P.paper, 0.92);
  const chip = withAlpha(P.paper, 0.1);
  const L = (x: number) => x - WIN.x; // window-local coordinates (from its top-left)
  const T = (y: number) => y - WIN.y;
  return (
    <Stage1080 W={W} H={H} ground={field}>
      {/* the field's light pool, rising from below */}
      <div style={{ position: 'absolute', left: -400, top: 260, width: 2720, height: 1000, background: `radial-gradient(ellipse 50% 78% at 50% 100%, ${withAlpha(mixColor(P.lift, P.paper, 0.2), 0.95)} 0%, ${withAlpha(mixColor(P.lift, P.accent, 0.4), 0.7)} 35%, ${withAlpha(P.accent, 0)} 100%)` }} />
      {/* the glass window */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: 2200, perspectiveOrigin: '960px 540px' }}>
        <div style={{ position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, transformOrigin: `${WIN.w / 2}px ${WIN.h / 2}px`, transform: `translate(${(win.cx - (WIN.x + WIN.w / 2)).toFixed(2)}px, ${(win.cy - (WIN.y + WIN.h / 2)).toFixed(2)}px) rotateY(${win.turn.toFixed(3)}deg) scale(${win.s.toFixed(5)})`, transformStyle: 'preserve-3d' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: WIN.r, background: `linear-gradient(180deg, ${withAlpha(P.paper, 0.16)}, ${withAlpha(P.paper, 0.08)})`, boxShadow: `inset 0 0 0 1.5px ${rim}, inset 0 2px 0 ${withAlpha(P.paper, 0.55)}, 0 40px 120px ${withAlpha(P.ink, 0.5)}` }} />
          <div style={{ position: 'absolute', left: WIN.inset, top: 13, width: WIN.w - 2 * WIN.inset, height: WIN.h - 26, borderRadius: 90, overflow: 'hidden', background: `linear-gradient(180deg, ${panelTop}, ${panelLow})`, boxShadow: `inset 0 0 0 1.5px ${withAlpha(P.paper, 0.18)}` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 105, height: '100%', background: withAlpha(P.paper, 0.07) }} />
            {!three ? (
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(obj.x - win.cx + (WIN.w / 2 - WIN.inset)).toFixed(2)}px, ${((obj.y - win.cy) / win.s + (WIN.h / 2 - 13)).toFixed(2)}px)` }}>
                <SliceSolid logo={lg} size={OBJECT_WINDOW.size} yaw={obj.yaw} P={P} />
              </div>
            ) : null}
          </div>
          {/* the left rail */}
          <Ico name="list" x={L(353)} y={T(178)} size={52} color={icon} />
          <Ico name="plus" x={L(353)} y={T(266)} size={48} color={icon} />
          <div style={{ position: 'absolute', left: L(323), top: T(372), width: 60, height: 72, borderRadius: 16, background: chip }} />
          <Ico name="user" x={L(353)} y={T(408)} size={40} color={icon} />
          <Ico name="search" x={L(353)} y={T(528)} size={42} color={icon} />
          <Ico name="clock" x={L(353)} y={T(618)} size={42} color={icon} />
          <div style={{ position: 'absolute', left: L(326), top: T(756), width: 54, height: 54, borderRadius: 14, background: chip }} />
          <Ico name="heart" x={L(353)} y={T(783)} size={38} color={icon} />
          <div style={{ position: 'absolute', left: L(315), top: T(866), width: 74, height: 74, borderRadius: '50%', background: `linear-gradient(135deg, ${P.lift}, ${P.accent})`, boxShadow: `inset 0 0 0 2px ${withAlpha(P.paper, 0.35)}` }} />
          {/* zoom in / out */}
          {[0, 1].map((i) => (
            <div key={i} style={{ position: 'absolute', left: L(1508), top: T(188 + 105 * i), width: 82, height: 82, borderRadius: 22, background: withAlpha(P.paper, 0.12), boxShadow: `inset 0 0 0 1.5px ${withAlpha(P.paper, 0.22)}` }}>
              <div style={{ position: 'absolute', left: 21, top: 39, width: 40, height: 4, borderRadius: 2, background: icon }} />
              {i === 0 ? <div style={{ position: 'absolute', left: 39, top: 21, width: 4, height: 40, borderRadius: 2, background: icon }} /> : null}
            </div>
          ))}
          {/* the dark pill */}
          <div style={{ position: 'absolute', left: L(1406), top: T(880), width: 196, height: 78, borderRadius: 39, background: mixColor(P.ink, P.paper, 0.02 + 0.12 * pill), transform: `scale(${(1 - 0.04 * pill).toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.ui, fontWeight: 600, fontSize: 40, letterSpacing: '-0.01em', color: P.paper }}>{done}</div>
        </div>
      </div>
      {three ? (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${(1920 / width).toFixed(5)})` }}>
          <Stage3D frame={cur}>
            <ObjectSolid logo={lg} frameOf={(tf) => tf / rate} at={(tt) => { const o = objAt(tt); const kk = Math.min(width / 1920, height / 1080); return { x: o.x * kk, y: o.y * kk, size: o.size * kk, yaw: o.yaw }; }} W={width} H={height} />
          </Stage3D>
        </div>
      ) : null}
      {/* the marker on the chosen spot */}
      {dot > 0 ? (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(spotX - 62).toFixed(2)}px, ${(spotY - 62).toFixed(2)}px)`, width: 124, height: 124, borderRadius: '50%', opacity: dot, background: `radial-gradient(closest-side, ${withAlpha(P.lift, 0.5)} 45%, ${withAlpha(P.lift, 0.1)} 100%)` }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: 18, height: 18, borderRadius: '50%', transform: `translate(${(spotX - 9).toFixed(2)}px, ${(spotY - 9).toFixed(2)}px) scale(${(0.4 + 0.6 * dot).toFixed(4)})`, background: mixColor(P.lift, P.paper, 0.35), boxShadow: `0 0 0 3px ${withAlpha(P.paper, 0.85)}` }} />
        </>
      ) : null}
      {pointer && t >= OBJECT_WINDOW.enter ? <Cursor x={px} y={py} scale={1.35} press={clamp(press)} shape="arrow" shadow="cast" fill={P.paper} outline={P.ink} /> : null}
    </Stage1080>
  );
};

export const objectWindowMeta: SceneMeta = {
  id: 'object-window',
  does: 'a glass app window rises holding the product\'s mark as a solid; it turns to face us, the camera pushes in, a pointer marks a spot on it and presses the confirm pill',
  dur: OBJECT_WINDOW.dur,
  props: ['logo?', 'done?', 'spot?', 'palette?', 'pointer?', 'gl?'],
  handIn: { form: 'window', x: 440, y: 311, w: 1031, h: 687, r: 82 },
  handOut: { form: 'window', x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h, r: WIN.r },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'window-rises', weight: 0.4 },
    { f: OBJECT_WINDOW.turn[0] + 2, kind: 'whoosh', id: 'turn', weight: 0.5 },
    { f: OBJECT_WINDOW.push[0] + 6, kind: 'swell', id: 'push', weight: 0.4 },
    { f: OBJECT_WINDOW.click, kind: 'click', id: 'mark-spot', weight: 0.7 },
    { f: OBJECT_WINDOW.click + 1, kind: 'pop', id: 'marker', weight: 0.5 },
    { f: OBJECT_WINDOW.press, kind: 'click', id: 'done', weight: 0.7 },
  ],
};
