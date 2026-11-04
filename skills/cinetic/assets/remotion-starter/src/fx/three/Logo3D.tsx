// logo-3d: the film's mark as a solid object. The shot opens on an extreme close-up of the extruded mark (bevelled
// edges, a lacquer, satin, metal or glass finish lit by the film's light stage), the camera turning across its face
// while a highlight travels over the bevels and the background parts melt into the lens's blur; then one move pulls
// back, turns the mark to face the camera and presses its depth flat, and the mark lands exactly on the 2D lockup:
// the last 3D frame and the flat drawing (brand/Mark LogoMark) are the same pixels, so the swap is invisible and the
// lockup plays on in 2D. One move that starts, travels and lands; nothing idles after it.
// Without hardware WebGL (software GL, no context) the part draws the same move as a CSS-3D solid (SolidMark): the
// mark's face over a stack of its own silhouette receding in depth, each slice darker, turned by the same pose in a
// real perspective, a light gradient across the face from the key's side and a soft shadow under it, pressing flat as
// it lands on the lockup. A software render reads as an object, never a big flat logo shrinking.
import React, { useEffect, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../../brand/Mark';
import { C } from '../../brand/tokens';
import { clamp, E, rand } from '../../lib/anim';
import { mixColor } from '../../lib/color';
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

/** The SVG of a mark's parts in one colour (a mask: the face's light gradient drawn only inside the mark). */
const markMaskUrl = (lg: Logo) => {
  const paths = lg.parts.flatMap((p) => p.items.filter((it) => it.fill !== 'none').map((it) => `<path d="${it.d}" transform="${it.transform}" fill="#fff"${it.fillRule ? ` fill-rule="${it.fillRule}"` : ''}/>`)).join('');
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${paths}</svg>`)}")`;
};
/** House numbers of the CSS-3D solid: slices a px of depth (capped), the side's darkening front to back, the face's
 * light, the shadow's strength and the lens (CSS perspective, px at 1080p). */
export const SOLID2D = { perPx: 0.42, min: 6, max: 30, side: [0.38, 0.62] as [number, number], light: 0.34, shadow: 0.32, perspective: 1600 } as const;
/**
 * The 3D move without WebGL: the mark's face over `n` slices of its own silhouette receding along its depth, each darker
 * toward the back (the side walls), in one CSS 3D transform (perspective, the pose's turn); a light gradient across the
 * face from the key's side, masked by the mark; a soft shadow under it. As the pose lands the depth presses to nothing,
 * the turn unwinds and the light fades: the last frame is the flat lockup.
 */
export const SolidMark: React.FC<{ logo: Logo; lockup: Lockup; p: number; o: PoseOpts; light?: Light3D; W: number; H: number }> = ({ logo, lockup, p, o, light, W, H }) => {
  const st = logoPose(clamp01(p), o);
  const size = lockup.size;
  const box = logo.box;
  // where the close-up stands (the focus point of the mark at the frame's centre) and where it lands
  const end = { x: lockup.x + ((box.x + box.w / 2) * size) / 100, y: lockup.y + ((box.y + box.h / 2) * size) / 100 };
  const start = { x: W / 2 - o.focus[0] * o.mirror * (box.w / 100) * size * o.scale, y: H / 2 - o.focus[1] * (box.h / 100) * size * o.scale };
  const cx = start.x + (end.x - start.x) * st.travel;
  const cy = start.y + (end.y - start.y) * st.travel;
  const s = st.scale;
  const depthPx = (o.depth / 100) * size * s * st.depth;
  const n = Math.round(clamp(depthPx * SOLID2D.perPx, SOLID2D.min, SOLID2D.max) * Math.min(1, st.depth * 4));
  // the light gradient runs from the key's side across the face; the side walls darker the further back
  const lightA = SOLID2D.light * (1 - st.flat);
  const angle = (((light?.azimuth ?? 315) + 180) % 360).toFixed(1);
  const sideOf = (fill: string, k: number) => mixColor(fill, '#000000', SOLID2D.side[0] + (SOLID2D.side[1] - SOLID2D.side[0]) * (k / Math.max(1, n)));
  const fillOf = (k: number) => (part: { fill: string; items: { fill: string }[] }) => {
    const f = part.items.find((it) => it.fill && it.fill !== 'none')?.fill ?? part.fill ?? '#000000';
    // a fill the mixer reads (#rgb, #rrggbb, rgb()); anything else (a gradient, currentColor) walls in a mid grey of the inks
    return sideOf(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(f) || /^rgba?\(/i.test(f) ? f : mixColor(C.ink, C.white, 0.27), k);
  };
  const face = size * s;
  const left = cx - (((box.x + box.w / 2) * face) / 100);
  const top = cy - (((box.y + box.h / 2) * face) / 100);
  const turn = `perspective(${(SOLID2D.perspective * H) / 1080}px) rotateX(${(-st.pitch).toFixed(3)}deg) rotateY(${st.yaw.toFixed(3)}deg) rotateZ(${st.roll.toFixed(3)}deg)`;
  const origin = `${(((box.x + box.w / 2) * face) / 100).toFixed(2)}px ${(((box.y + box.h / 2) * face) / 100).toFixed(2)}px`;
  const shadowA = SOLID2D.shadow * (1 - st.flat) * clamp(st.depth * 1.5);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, pointerEvents: 'none' }}>
      {shadowA > 0.004 ? (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(cx - face * 0.42).toFixed(2)}px, ${(cy + (box.h / 200) * face * 0.92).toFixed(2)}px)`, width: face * 0.84, height: face * 0.16, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(0, 0, 0, ${shadowA.toFixed(3)}), rgba(0, 0, 0, 0))` }} />
      ) : null}
      <div style={{ position: 'absolute', left: 0, top: 0, width: face, height: face, transformStyle: 'preserve-3d', transformOrigin: origin, transform: `translate(${left.toFixed(2)}px, ${top.toFixed(2)}px) ${turn}` }}>
        {Array.from({ length: n }, (_, i) => n - i).map((k) => (
          <div key={k} style={{ position: 'absolute', inset: 0, transform: `translateZ(${(-(depthPx * k) / n).toFixed(2)}px)` }}>
            <LogoMark logo={logo} size={face} fill={fillOf(k)} />
          </div>
        ))}
        <div style={{ position: 'absolute', inset: 0 }}>
          <LogoMark logo={logo} size={face} />
          {lightA > 0.004 ? (
            <div style={{ position: 'absolute', inset: 0, maskImage: markMaskUrl(logo), WebkitMaskImage: markMaskUrl(logo), maskSize: '100% 100%', WebkitMaskSize: '100% 100%', background: `linear-gradient(${angle}deg, rgba(255, 255, 255, ${lightA.toFixed(3)}) 0%, rgba(255, 255, 255, 0) 55%, rgba(0, 0, 0, ${(lightA * 0.6).toFixed(3)}) 100%)` }} />
          ) : null}
        </div>
      </div>
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
    // the move as a CSS-3D solid on the same curve (no WebGL needed): an object, never a big flat logo shrinking
    return <SolidMark logo={lg} lockup={lockup} p={p} o={o} light={light} W={W} H={H} />;
  }
  return (
    <Stage3D frame={frame} light={light} backdrop={backdrop} samples={samples} fov={o.fov}>
      <LogoScene logo={lg} lockup={lockup} o={o} finish={finish} depth={depth} bevel={bevel} at={at} durF={durF} W={W} H={H} />
    </Stage3D>
  );
};
