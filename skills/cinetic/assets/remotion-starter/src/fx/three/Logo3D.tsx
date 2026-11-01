// logo-3d: the film's mark as a solid object. The shot opens on an extreme close-up of the extruded mark (bevelled
// edges, a lacquer, satin, metal or glass finish lit by the film's light stage), the camera turning across its face
// while a highlight travels over the bevels and the background parts melt into the lens's blur; then one move pulls
// back, turns the mark to face the camera and presses its depth flat, and the mark lands exactly on the 2D lockup:
// the last 3D frame and the flat drawing (brand/Mark LogoMark) are the same pixels, so the swap is invisible and the
// lockup plays on in 2D. One move that starts, travels and lands; nothing idles after it.
// Without hardware WebGL (software GL, no context) the part draws the same move flat: the 2D mark pulling back to the
// lockup.
import React, { useEffect, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../../brand/Mark';
import { E, rand } from '../../lib/anim';
import { type Finish, markSolid } from './geo';
import { draws3D, type GlMode } from './gl';
import type { Light3D } from './light';
import { type Backdrop, clamp01, deg, planeDistance, ramp, Stage3D, useSampler } from './stage';

export type { Finish } from './geo';

/**
 * House numbers (f@60, px@1080, degrees, mark units of the 100 box): the move's length; the close-up's size (x the
 * lockup), turn and the point of the mark that fills the frame (fractions of the mark's box from its centre); the
 * extrusion and bevel; the lens (aperture as a share of the focus distance); how far the light stage turns; where the
 * depth presses flat and the colour settles to the flat fill (shares of the move); the lens's field of view (a wider
 * lens than the stage's default: the turned close-up in stronger perspective).
 */
export const LOGO3D = {
  dur: 96,
  scale: 7,
  yaw: -62,
  pitch: 17,
  roll: -8,
  focus: [-0.24, -0.2] as [number, number],
  depth: 28,
  bevel: 2.4,
  aperture: 0.022,
  sweep: 120,
  flatten: [0.6, 0.97] as [number, number],
  flat: [0.82, 1] as [number, number],
  fov: 40,
};

export const RECIPE = {
  id: 'logo-3d',
  recipe:
    'The mark as a solid (28 deep in its 100 box, bevelled): an extreme close-up (7x the lockup, turned 62 deg and already turning, a corner of the mark filling the frame, the near edge sharp and the far ones soft) turns as a highlight line travels 120 deg over its bevels, then one strongInOut pull-back (96 f) turns it to face the camera, presses its depth flat (60-97 %) and settles its colour to the flat fill (82-100 %): it lands exactly on the 2D lockup and the swap to the flat mark is invisible.',
  params: { ...LOGO3D },
};

export type Lockup = { x: number; y: number; size: number };

export type Logo3DProps = {
  /** Where the flat mark lands: the top-left (px) of its 100-unit box and its size (px), as Mark size + placeMark(x, y). */
  lockup: Lockup;
  /** The mark: logoParts(svgText) of the brand's SVG (fills only are extruded); default the starter's mark. */
  logo?: Logo;
  /** Frame the move starts (default 0); before it the close-up holds its first pose. */
  at?: number;
  /** Length of the move, f@60 (default 96). */
  dur?: number;
  finish?: Finish;
  /** Extrusion depth and bevel, mark units of the 100 box (defaults 28 and 2.4; keep the bevel under half the thinnest stroke). */
  depth?: number;
  bevel?: number;
  /** The close-up: size (x the lockup), turn (deg) and the point of the mark that fills the frame. */
  from?: Partial<{ scale: number; yaw: number; pitch: number; roll: number; focus: [number, number] }>;
  light?: Light3D;
  /** A plate drawn behind the mark inside the canvas (only needed for a glass finish to refract it). */
  backdrop?: Backdrop;
  samples?: number;
  gl?: GlMode;
  /** The film's seed: mirrors the turn so two films never open on the same angle. */
  seed?: number | string;
};

/** The frame (in the part's own timeline) where the flat lockup takes over. */
export const logo3DEnd = (at = 0, dur: number = LOGO3D.dur, fps = 60) => at + (dur * fps) / 60;

type PoseOpts = typeof LOGO3D & { mirror: number };

/** The move at progress p (0..1): screen scale, turn, how deep, how flat, the lens and the light stage's turn. */
export const logoPose = (p: number, o: PoseOpts = { ...LOGO3D, mirror: 1 }) => {
  // the turn starts at speed (the close-up is already turning on its first frame, a highlight crossing the bevels) and
  // settles as the pull-back, slow at first, takes over and lands
  const zoom = E.strongInOut(clamp01(p));
  const turn = E.settleOut(clamp01(p));
  const travel = E.strongInOut(clamp01(p));
  return {
    scale: Math.exp(Math.log(o.scale) * (1 - zoom)),
    travel,
    yaw: o.yaw * o.mirror * (1 - turn),
    pitch: o.pitch * (1 - turn),
    roll: o.roll * o.mirror * (1 - turn),
    depth: Math.max(0.002, 1 - ramp(p, o.flatten[0], o.flatten[1])),
    flat: ramp(p, o.flat[0], o.flat[1]),
    aperture: o.aperture * (1 - ramp(p, 0.15, 0.78)),
    sweep: o.sweep * o.mirror * (turn - 0.5),
  };
};

const LogoScene: React.FC<{ logo: Logo; lockup: Lockup; o: PoseOpts; finish: Finish; depth: number; bevel: number; at: number; durF: number; W: number; H: number }> = ({ logo, lockup, o, finish, depth, bevel, at, durF, W, H }) => {
  const built = useMemo(() => markSolid(logo, depth, bevel, finish), [logo, depth, bevel, finish]);
  useEffect(() => () => built.dispose(), [built]);
  const k = lockup.size / 100;
  const D = planeDistance(H, o.fov);
  // the lockup's centre on screen (px, y down) and the close-up's: the focus point of the mark at the frame's centre
  const bw = built.box.max.x - built.box.min.x;
  const bh = built.box.max.y - built.box.min.y;
  const end = { x: lockup.x + built.centre.x * k, y: lockup.y - built.centre.y * k };
  const start = { x: W / 2 - o.focus[0] * o.mirror * bw * k * o.scale, y: H / 2 - o.focus[1] * bh * k * o.scale };
  useSampler((t) => {
    const p = clamp01((t - at) / durF);
    const st = logoPose(p, o);
    const cx = start.x + (end.x - start.x) * st.travel;
    const cy = start.y + (end.y - start.y) * st.travel;
    const s = st.scale;
    built.root.position.set((cx - W / 2) / s, (H / 2 - cy) / s, D * (1 - 1 / s));
    built.root.rotation.set(deg(st.pitch), deg(st.yaw), deg(st.roll), 'YXZ');
    built.root.scale.setScalar(k);
    built.body.scale.set(1, 1, st.depth);
    built.flat.value = st.flat;
    const focus = D / s; // the mark's face
    const moving = p > 0 && p < 1;
    // a wide lens asks for more samples: the far bevels blur smoothly instead of in copies
    return { aperture: st.aperture * focus, focus, still: !moving && st.aperture === 0, moving, samples: st.aperture > 0.004 ? 32 : undefined, dither: 1 - st.flat, sweep: st.sweep };
  });
  return <primitive object={built.root} />;
};

const DEFAULT_LOGO = (): Logo => logoParts(SAMPLE_MARK_SVG);

/** The flat lockup: the same parts drawn as SVG at the lockup box (what the 3D mark lands on). */
export const FlatMark: React.FC<{ logo?: Logo; lockup: Lockup; scale?: number; opacity?: number }> = ({ logo, lockup, scale = 1, opacity = 1 }) => {
  const lg = useMemo(() => logo ?? DEFAULT_LOGO(), [logo]);
  const c = { x: lockup.x + (lg.box.x + lg.box.w / 2) * (lockup.size / 100), y: lockup.y + (lg.box.y + lg.box.h / 2) * (lockup.size / 100) };
  return (
    <div style={{ position: 'absolute', left: lockup.x, top: lockup.y, width: lockup.size, height: lockup.size, opacity, transformOrigin: `${c.x - lockup.x}px ${c.y - lockup.y}px`, transform: scale === 1 ? undefined : `scale(${scale})` }}>
      <LogoMark logo={lg} size={lockup.size} />
    </div>
  );
};

/** The mark as a solid object pulled back into its flat lockup (see the file's header). */
export const Logo3D: React.FC<Logo3DProps> = ({ lockup, logo, at = 0, dur = LOGO3D.dur, finish = 'gloss', depth = LOGO3D.depth, bevel = LOGO3D.bevel, from, light, backdrop, samples, gl = 'auto', seed }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const lg = useMemo(() => logo ?? DEFAULT_LOGO(), [logo]);
  const mirror = seed === undefined ? 1 : rand(`logo-3d:${seed}`) < 0.5 ? -1 : 1;
  const o: PoseOpts = useMemo(() => ({ ...LOGO3D, ...from, mirror }), [from, mirror]);
  const durF = (dur * fps) / 60;
  const p = (frame - at) / durF;
  if (p >= 1) return <FlatMark logo={lg} lockup={lockup} />;
  if (!draws3D(gl)) {
    // the 2D move: the flat mark pulling back to the lockup on the same curve
    const st = logoPose(clamp01(p), o);
    return <FlatMark logo={lg} lockup={lockup} scale={Math.min(st.scale, 2.6)} />;
  }
  return (
    <Stage3D frame={frame} light={light} backdrop={backdrop} samples={samples} fov={o.fov}>
      <LogoScene logo={lg} lockup={lockup} o={o} finish={finish} depth={depth} bevel={bevel} at={at} durF={durF} W={W} H={H} />
    </Stage3D>
  );
};
