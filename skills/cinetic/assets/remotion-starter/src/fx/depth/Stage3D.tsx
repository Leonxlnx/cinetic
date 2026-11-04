import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp } from '../../lib/anim';
import { defocusMix, DEFOCUS_LEVELS, DEFOCUS_SHARP } from '../../lib/defocus';
import { useFilm } from '../../lib/film';
import {
  basisOf,
  type Cam,
  cocOf,
  focusDist,
  type Frame,
  frameOf,
  jacobianAt,
  magAt,
  matrixCss,
  planeCorners,
  planeMatrix,
  planePoint,
  type Pose,
  restCam,
  toCam,
  type V3,
} from './math';
import { type Box, type CameraPath, camera } from './shots';

/**
 * Stage3D: a real 3D stage for UI. Planes (a card, an input, a page, a word, a photo) sit in depth; a camera with a
 * lens films them through declared shots (fx/depth/shots: push, pull, follow, travel, crane, orbit, whip, rack);
 * every plane gets the depth of field its distance from the focus gives it, and a smear along its motion on fast
 * moves (none on holds). Lay the shot out flat as usual (each plane's `box` on the 1080p design plane), give planes
 * depth (`z`: + toward the camera), give the camera its shots: depth comes from the camera, never from a card
 * tilted at rest.
 *
 *   <Stage3D camera={cam} ground={<Sky />}>
 *     <Plane box={INPUT} res={3}><Input text={typed(f)} /></Plane>
 *     <Plane box={CARD} z={-420}><Card /></Plane>
 *   </Stage3D>
 *
 * Each plane is one flat element with its own projected matrix3d (no preserve-3d, no CSS perspective), drawn in
 * depth order; defocus and smear use the house blur ladder (lib/defocus: fixed radii, at most two copies cross-faded,
 * three for a plane whose defocus varies across it), so no blur radius ever animates. Pure in the frame: any frame,
 * any order.
 */

/**
 * House numbers: the smear's shutter (a 180-degree shutter: the streak is the distance travelled in half a frame, drawn
 * as a gaussian of sigma = streak x 0.29), the speed under which nothing smears, the caps.
 */
export const STAGE = {
  smear: { shutter: 0.5, k: 0.29, minPxS: 120, cap: 24 },
  dofCap: 32, // the strongest defocus drawn (px at 1080p on screen)
  budget: 6, // planes that may blur in one frame (the rest draw at one fixed level, no cross-fade)
  planeDof: 2, // px of defocus difference across a plane above which it gets a defocus that varies across it
  resMax: 3, // the finest raster (x the plane's own px) for type seen up close
  rasterMax: 9e6, // px of raster per plane at most (res is lowered to fit)
} as const;

export type PoseDelta = Partial<Pick<Pose, 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz' | 's'>> & { opacity?: number };

export type PlaneProps = {
  id?: string;
  /** Where the plane sits on the 1080p design plane before depth (px). */
  box: Box;
  /** Depth: + toward the camera, - away (px). */
  z?: number;
  /** A designed 3D pose about the anchor (deg): x tips the top edge away, y turns the right edge away, z turns clockwise. */
  rot?: { x?: number; y?: number; z?: number };
  /** Anchor inside the box, 0..1 (house centre). */
  anchor?: [number, number];
  scale?: number;
  opacity?: number;
  /** Keep the box's size and place on screen under the opening camera at any depth (grounds, far plates). */
  fit?: boolean;
  /** The plane's own animation at frame f, added to its pose (sub-frames too: its smear follows it). */
  move?: (f: number) => PoseDelta;
  /** Defocus by depth (house true); 'plane' forces a defocus that varies across it (a page in perspective); false: sharp. */
  dof?: boolean | 'plane';
  /** Smear on fast moves (house true). */
  smear?: boolean;
  /** Raster resolution (x its own px): auto from the closest framing of the camera, 1-3. */
  res?: number;
  /** Draw-order bias (+ in front), for a designed overlap the depth sort would not give. */
  order?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** A plane on a Stage3D (outside a stage it draws flat at its box). */
export const Plane: React.FC<PlaneProps> & { stagePlane: true } = Object.assign(
  ({ box, children, style }: PlaneProps) => <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, ...style }}>{children}</div>,
  { stagePlane: true as const },
);

/** A component that stands for several planes (Fan, RiseBehind): the stage asks it for them. */
export type Expander<P> = React.FC<P> & { expand: (p: P, s: StageInfo) => React.ReactElement<PlaneProps>[] };
export type StageInfo = { frame: number; fr: Frame; path: CameraPath; fps: number };

const isPlane = (el: unknown): el is React.ReactElement<PlaneProps> =>
  React.isValidElement(el) && !!(el.type as { stagePlane?: boolean }).stagePlane;
const isExpander = (el: unknown): el is React.ReactElement<object> =>
  React.isValidElement(el) && typeof (el.type as { expand?: unknown }).expand === 'function';

const flatten = (children: React.ReactNode, s: StageInfo, out: React.ReactElement<PlaneProps>[], flat: React.ReactNode[]) => {
  React.Children.forEach(children, (c) => {
    if (React.isValidElement(c) && c.type === React.Fragment) flatten((c.props as { children?: React.ReactNode }).children, s, out, flat);
    else if (isPlane(c)) out.push(c);
    else if (isExpander(c)) flatten((c.type as unknown as Expander<object>).expand(c.props as object, s), s, out, flat);
    else if (c !== null && c !== undefined && c !== false) flat.push(c);
  });
};

/** A plane's pose at frame f (its props plus its own move), fitted to the opening camera when asked. */
export const poseOf = (p: PlaneProps, f: number, base: Cam, _fr: Frame): { pose: Pose; opacity: number } => {
  const d = p.move ? p.move(f) : {};
  let pose: Pose = {
    x: p.box.x + (d.x ?? 0),
    y: p.box.y + (d.y ?? 0),
    w: p.box.w,
    h: p.box.h,
    z: (p.z ?? p.box.z ?? 0) + (d.z ?? 0),
    rx: (p.rot?.x ?? 0) + (d.rx ?? 0),
    ry: (p.rot?.y ?? 0) + (d.ry ?? 0),
    rz: (p.rot?.z ?? 0) + (d.rz ?? 0),
    ax: p.anchor?.[0] ?? 0.5,
    ay: p.anchor?.[1] ?? 0.5,
    s: (p.scale ?? 1) * (d.s ?? 1),
  };
  if (p.fit) {
    // under the opening camera a plane at depth z shows (dist - z) / dist smaller: scale and place it back onto its box
    const k = (base.dist - pose.z) / base.dist;
    const ax = pose.x + pose.ax * pose.w;
    const ay = pose.y + pose.ay * pose.h;
    const nx = base.target[0] + (ax - base.target[0]) * k;
    const ny = base.target[1] + (ay - base.target[1]) * k;
    pose = { ...pose, x: pose.x + (nx - ax), y: pose.y + (ny - ay), s: pose.s * k };
  }
  return { pose, opacity: clamp((p.opacity ?? 1) * (d.opacity ?? 1)) };
};

const levelAtLeast = (s: number) => DEFOCUS_LEVELS.find((l) => l >= s - 1e-6) ?? DEFOCUS_LEVELS[DEFOCUS_LEVELS.length - 1];
const nearestLevel = (s: number) => (s < DEFOCUS_SHARP ? 0 : DEFOCUS_LEVELS.reduce((b, l) => (Math.abs(l - s) < Math.abs(b - s) ? l : b), DEFOCUS_LEVELS[0]));

type Copy = { iso: number; along: number; angle: number; opacity: number; mask?: string };
type Drawn = {
  key: string;
  z: number;
  matrix: string;
  w: number;
  h: number;
  pad: number;
  res: number;
  opacity: number;
  copies: Copy[];
  el: React.ReactElement<PlaneProps>;
  smear: boolean;
};

/** The raster resolution a plane needs: its closest framing over the stage's frames (centre and the target's foot). */
export const autoRes = (p: PlaneProps, path: CameraPath, frames: number, dpr = 1) => {
  if (p.res) return p.res;
  let mag = 1;
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const f = (frames * i) / n;
    const c = path(f);
    const b = basisOf(c, path.fr);
    const { pose } = poseOf(p, f, path.base, path.fr);
    const cc = toCam(b, planePoint(pose, pose.w / 2, pose.h / 2));
    if (cc[2] > 1) mag = Math.max(mag, magAt(pose, b, pose.w / 2, pose.h / 2));
  }
  const want = Math.ceil(clamp(mag * dpr, 1, STAGE.resMax) * 2) / 2;
  const fitArea = Math.sqrt(STAGE.rasterMax / Math.max(1, p.box.w * p.box.h));
  return Math.max(1, Math.min(want, Math.floor(fitArea * 2) / 2));
};

const resCache = new WeakMap<CameraPath, Map<string, number>>();

/** Everything the stage draws for one plane at frame f. Pure. */
const drawPlane = (el: React.ReactElement<PlaneProps>, i: number, f: number, path: CameraPath, frames: number, dpr: number): Drawn | null => {
  const p = el.props;
  const fr = path.fr;
  const cam = path(f);
  const b = basisOf(cam, fr);
  const { pose, opacity } = poseOf(p, f, path.base, fr);
  if (opacity <= 0.001) return null;
  const corners = planeCorners(pose, b);
  if (corners.every((c) => c[2] <= 1)) return null; // behind the lens
  const centre = toCam(b, planePoint(pose, pose.w / 2, pose.h / 2));
  const key = p.id ?? `plane${i}`;
  let cache = resCache.get(path);
  if (!cache) resCache.set(path, (cache = new Map()));
  const ck = `${key}:${frames}:${dpr}`;
  let res = cache.get(ck);
  if (res === undefined) cache.set(ck, (res = autoRes(p, path, frames, dpr)));
  const fd = focusDist(cam, b);
  const ap = cam.aperture;
  const mag = Math.max(1e-3, magAt(pose, b, pose.w / 2, pose.h / 2));
  // smear: the centre's screen velocity over a 180-degree shutter (f +- 1/4), and the zoom's spread at the edges
  let along = 0;
  let iso = 0;
  let angle = 0;
  if (p.smear !== false) {
    const at = (g: number) => {
      const c2 = path(g);
      const b2 = basisOf(c2, fr);
      const { pose: q } = poseOf(p, g, path.base, fr);
      const m = toCam(b2, planePoint(q, q.w / 2, q.h / 2));
      return { x: (b2.F * m[0]) / m[2], y: (b2.F * m[1]) / m[2], mag: magAt(q, b2, q.w / 2, q.h / 2) };
    };
    const a = at(f - 0.25);
    const c = at(f + 0.25);
    const vx = (c.x - a.x) * 2; // px per frame at 1080p design size
    const vy = (c.y - a.y) * 2;
    const pxS = Math.hypot(vx, vy) * path.fps;
    const { minPxS, shutter, k, cap } = STAGE.smear;
    const seconds = (shutter / path.fps) * k; // sigma per px/s
    if (pxS >= minPxS) {
      const sig = Math.min(cap, pxS * seconds);
      // into the plane's own px: the inverse of its Jacobian at the centre
      const J = jacobianAt(pose, b, pose.w / 2, pose.h / 2);
      const det = J.du[0] * J.dv[1] - J.dv[0] * J.du[1];
      if (Math.abs(det) > 1e-9) {
        const lu = (J.dv[1] * vx - J.dv[0] * vy) / det;
        const lv = (-J.du[1] * vx + J.du[0] * vy) / det;
        const l = Math.hypot(lu, lv);
        if (l > 1e-9) {
          const du = lu / l;
          const dv = lv / l;
          const screenPerLocal = Math.hypot(J.du[0] * du + J.dv[0] * dv, J.du[1] * du + J.dv[1] * dv);
          along = (sig / Math.max(1e-6, screenPerLocal)) * res;
          angle = (Math.atan2(dv, du) * 180) / Math.PI;
        }
      }
    }
    const zoomRate = Math.abs(Math.log(Math.max(1e-6, c.mag) / Math.max(1e-6, a.mag))) * 2 * path.fps; // per second
    const radius = 0.25 * Math.hypot(pose.w, pose.h) * mag; // the mean distance of the plane's px from its centre, on screen
    const zs = Math.min(cap, zoomRate * radius * seconds);
    if (zs >= DEFOCUS_SHARP) iso = (zs / mag) * res;
  }
  // depth of field: at the centre, or across the plane when its defocus varies (a page in perspective)
  const copies: Copy[] = [];
  const cocDom = (u: number, v: number) => {
    const cc = toCam(b, planePoint(pose, u, v));
    if (cc[2] <= 1) return STAGE.dofCap;
    const s = Math.min(STAGE.dofCap, cocOf(cc[2], fd, b.F, ap));
    return (s / Math.max(1e-3, magAt(pose, b, u, v))) * res;
  };
  const dofOn = p.dof !== false && ap > 0;
  const centreDof = dofOn ? cocDom(pose.w / 2, pose.h / 2) : 0;
  let planeMode = false;
  let grad: { angle: number; stops: number[] } | null = null;
  if (dofOn) {
    const cs = corners.map((c) => (c[2] <= 1 ? STAGE.dofCap : Math.min(STAGE.dofCap, cocOf(c[2], fd, b.F, ap))));
    const spread = Math.max(...cs) - Math.min(...cs);
    planeMode = p.dof === 'plane' || spread > STAGE.planeDof;
    if (planeMode) {
      // the direction across the plane in which depth changes, in its own px, and the defocus along it
      const d0 = centre[2];
      const du = toCam(b, planePoint(pose, pose.w / 2 + 1, pose.h / 2))[2] - d0;
      const dv = toCam(b, planePoint(pose, pose.w / 2, pose.h / 2 + 1))[2] - d0;
      const g = Math.hypot(du, dv);
      if (g > 1e-9) {
        const gu = du / g;
        const gv = dv / g;
        const ang = (Math.atan2(gu, -gv) * 180) / Math.PI; // CSS gradient angle: 0 = toward the top
        const L = Math.abs(pose.w * gu) + Math.abs(pose.h * gv); // the gradient line spans the box corner to corner
        const n = 9;
        const stops: number[] = [];
        for (let k = 0; k < n; k++) {
          const s = k / (n - 1) - 0.5;
          stops.push(cocDom(pose.w / 2 + s * L * gu, pose.h / 2 + s * L * gv));
        }
        grad = { angle: ang, stops };
      } else planeMode = false;
    }
  }
  const pad = planeMode && grad ? Math.ceil(Math.min(64, 3 * STAGE.dofCap)) : 0;
  const motion = Math.max(along, iso);
  if (planeMode && grad) {
    // three copies: the farthest level underneath, a middle level and the sharp plane on top, each masked along depth
    const top = levelAtLeast(Math.min(32, Math.max(...grad.stops)));
    const mid = nearestLevel(top / 3) || DEFOCUS_LEVELS[0];
    const stopsCss = (fn: (s: number) => number) => {
      const n = grad!.stops.length;
      const W = pose.w + 2 * pad;
      const H = pose.h + 2 * pad;
      const ga = (grad!.angle * Math.PI) / 180;
      const Lpad = Math.abs(W * Math.sin(ga)) + Math.abs(H * Math.cos(ga));
      const Lin = Math.abs(pose.w * Math.sin(ga)) + Math.abs(pose.h * Math.cos(ga));
      const off = (Lpad - Lin) / 2 / Lpad; // the padded box's gradient line is longer: place the stops inside it
      return `linear-gradient(${grad!.angle.toFixed(2)}deg, ${grad!.stops
        .map((s, k) => `rgba(0,0,0,${clamp(fn(s)).toFixed(3)}) ${((off + ((1 - 2 * off) * k) / (n - 1)) * 100).toFixed(2)}%`)
        .join(', ')})`;
    };
    const sm = (level: number) => (along > DEFOCUS_SHARP ? nearestLevel(Math.hypot(along, level)) : 0); // the smear on top, at fixed levels
    if (top <= DEFOCUS_SHARP) copies.push({ iso: 0, along: sm(0), angle, opacity: 1 });
    else {
      copies.push({ iso: top, along: sm(top), angle, opacity: 1 });
      copies.push({ iso: mid, along: sm(mid), angle, opacity: 1, mask: stopsCss((s) => (s <= mid ? 1 : 1 - (s - mid) / Math.max(1e-6, top - mid))) });
      copies.push({ iso: 0, along: sm(0), angle, opacity: 1, mask: stopsCss((s) => 1 - s / Math.max(1e-6, mid)) });
    }
  } else if (motion > 2 * centreDof && motion >= DEFOCUS_SHARP) {
    // smear dominates: one copy at fixed levels (no cross-fade while it travels fast)
    copies.push({ iso: nearestLevel(Math.hypot(iso, centreDof)), along: nearestLevel(Math.hypot(along, centreDof)), angle, opacity: 1 });
  } else {
    const mix = defocusMix(Math.hypot(centreDof, iso));
    mix.forEach((c, k) => copies.push({ iso: c.level, along: along > DEFOCUS_SHARP ? nearestLevel(Math.hypot(along, c.level)) : 0, angle, opacity: k === 0 ? 1 : c.weight }));
  }
  return {
    key,
    z: Math.round(1e6 - centre[2] * 10) + (p.order ?? 0) * 1e7,
    matrix: matrixCss(planeMatrix(pose, b, fr, res, pad)),
    w: pose.w,
    h: pose.h,
    pad,
    res,
    opacity,
    copies,
    el,
    smear: along > DEFOCUS_SHARP,
  };
};

const fid = (along: number, iso: number) => `d3-${Math.round(along * 100)}-${Math.round(iso * 100)}`;

export type Stage3DProps = {
  /** The camera: camera(shots) from fx/depth/shots, or a still Cam. House: the opening camera, still. */
  camera?: CameraPath | Cam;
  /** A ground drawn flat behind every plane (screen space): a lit gradient, a photographic plate. */
  ground?: React.ReactNode;
  /** Planes beyond this many blurred in a frame draw at one fixed level (house STAGE.budget). */
  budget?: number;
  frame?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** The stage. Children: <Plane>s, components that stand for planes (Fan, RiseBehind), and flat overlays drawn on top. */
export const Stage3D: React.FC<Stage3DProps> = ({ camera: cam, ground, budget = STAGE.budget, frame, style, children }) => {
  const film = useFilm();
  const now = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const f = frame ?? now;
  const path: CameraPath = React.useMemo(() => {
    if (cam && typeof cam === 'function') return cam;
    const p = camera([], { film });
    if (!cam) return p;
    return camera([], { film, base: cam as Cam });
  }, [cam, film]);
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(1, window.devicePixelRatio) : 1;
  const info: StageInfo = { frame: f, fr: path.fr, path, fps: path.fps };
  const planes: React.ReactElement<PlaneProps>[] = [];
  const flat: React.ReactNode[] = [];
  flatten(children, info, planes, flat);
  let drawn = planes.map((el, i) => drawPlane(el, i, f, path, durationInFrames, dpr)).filter((d): d is Drawn => !!d);
  // budget: the planes past it (the farthest first) keep one fixed level and no cross-fade
  const blurred = drawn.filter((d) => d.copies.some((c) => c.iso > 0 || c.along > 0)).sort((a, b) => b.z - a.z);
  if (blurred.length > budget) {
    const over = new Set(blurred.slice(budget).map((d) => d.key));
    drawn = drawn.map((d) => (over.has(d.key) ? { ...d, copies: [{ ...d.copies[0], opacity: 1, mask: undefined }] } : d));
  }
  drawn.sort((a, b) => a.z - b.z);
  const filters = new Map<string, { along: number; iso: number }>();
  for (const d of drawn) for (const c of d.copies) if (c.along > c.iso) filters.set(fid(c.along, c.iso), { along: c.along, iso: c.iso });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
      {ground}
      {filters.size > 0 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          {[...filters.entries()].map(([id, v]) => (
            <filter key={id} id={id} x="-30%" y="-10%" width="160%" height="120%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${v.along} ${v.iso}`} />
            </filter>
          ))}
        </svg>
      )}
      {drawn.map((d) => {
        const W = (d.w + 2 * d.pad) * d.res;
        const H = (d.h + 2 * d.pad) * d.res;
        // every offset is a transform (a fractional left / top would snap to whole pixels and misregister the copies)
        const content = (
          <div style={{ position: 'absolute', left: 0, top: 0, width: d.w * d.res, height: d.h * d.res, transform: `translate(${d.pad * d.res}px, ${d.pad * d.res}px)` }}>
            <div style={{ position: 'relative', width: d.w, height: d.h, zoom: d.res, ...d.el.props.style }}>{d.el.props.children}</div>
          </div>
        );
        return (
          <div key={d.key} data-plane={d.key} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: d.matrix, zIndex: d.z, opacity: d.opacity }}>
            {d.copies.map((c, k) => {
              const mask = c.mask ? { WebkitMaskImage: c.mask, maskImage: c.mask } : {};
              const audit = k < d.copies.length - 1 ? { 'data-audit-copy': '' } : {};
              const smear = c.along > c.iso ? { 'data-audit-smear': '' } : {};
              if (c.along > c.iso) {
                const S = Math.ceil(Math.hypot(W, H));
                return (
                  <div key={k} {...audit} {...smear} style={{ position: 'absolute', inset: 0, opacity: c.opacity, ...mask }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: S, height: S, transform: `translate(${(W - S) / 2}px, ${(H - S) / 2}px) rotate(${c.angle.toFixed(2)}deg)`, filter: `url(#${fid(c.along, c.iso)})` }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${(S - W) / 2}px, ${(S - H) / 2}px) rotate(${(-c.angle).toFixed(2)}deg)` }}>{content}</div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={k} {...audit} style={{ position: 'absolute', inset: 0, opacity: c.opacity, filter: c.iso > 0 ? `blur(${c.iso}px)` : undefined, ...mask }}>
                  {content}
                </div>
              );
            })}
          </div>
        );
      })}
      {flat}
    </div>
  );
};

/** Where a world point lands on screen (real frame px) at frame f: for an overlay pinned to a plane (a label, a ring). */
export const screenOf = (path: CameraPath, f: number, p: V3) => {
  const c = path(f);
  const b = basisOf(c, path.fr);
  const q = toCam(b, p);
  if (q[2] <= 1e-6) return null;
  const fr = path.fr;
  return { x: fr.u * (fr.W / 2 + (b.F * q[0]) / q[2]), y: fr.u * (fr.H / 2 + (b.F * q[1]) / q[2]), depth: q[2] };
};

/** The stage's camera for a frame size (useful in tests and scripts): the opening camera of that frame. */
export const openingCam = (width: number, height: number, o: Partial<Cam> = {}) => restCam(frameOf(width, height), o);
