// The depth stage's geometry: a real camera (where it stands, what it looks at, its lens) over planes placed in 3D,
// projected into one CSS matrix3d per plane. Pure and Node-safe: no React, no DOM; every value is a function of its
// arguments, so a frame, a sub-frame (motion blur) and a check script all agree.
//
// World space is the frame's own design space at 1080p: x right, y down, z toward the viewer (CSS's axes), in px.
// Under the opening camera (target at the frame's centre, distance = the lens's focal length in px) a plane at z = 0
// lands exactly on its 2D box: lay a shot out flat as usual, then give planes depth and give the camera a shot.

export type V3 = readonly [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => {
  const l = len(a);
  return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0];
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * The camera, as a director rigs it: the point it looks at, how far it stands from it, from which side (yaw: +
 * swings it to the right of the target, so the subject's right side comes nearer; pitch: + raises it above the
 * target looking down), a rigid roll about the lens axis, and the lens (mm, full-frame equivalent on the frame's
 * short side: 50 normal, 28-35 wide with strong perspective, 85-100 long and flat). `focus` is where the lens is
 * focused (a world point, or a distance in px along the lens axis; null: the target) and `aperture` how shallow the
 * depth of field is (0 = all sharp).
 */
export type Cam = {
  target: V3;
  dist: number;
  yaw: number;
  pitch: number;
  roll: number;
  lens: number;
  focus: V3 | number | null;
  aperture: number;
};

/** The frame a stage projects into: design size at 1080p (1920 x 1080 for 16:9) and the scale to the real frame. */
export type Frame = { W: number; H: number; u: number };
export const frameOf = (width: number, height: number): Frame => {
  const u = Math.min(width, height) / 1080;
  return { W: width / u, H: height / u, u };
};

/** Focal length in design px of a lens (mm, full-frame equivalent on the short side, which is 24 mm). */
export const focalPx = (fr: Frame, lens: number) => (Math.min(fr.W, fr.H) * lens) / 24;
/** The lens (mm) of a vertical field of view in degrees on the short side, and back. */
export const lensOfFov = (fovDeg: number) => 12 / Math.tan(rad(fovDeg) / 2);
export const fovOfLens = (lens: number) => (2 * Math.atan(12 / lens) * 180) / Math.PI;

/** House numbers of the stage: lens mm, depth of field, the steepest pitch. */
export const LENS = { mm: 50, aperture: 36, pitchMax: 85, rollMax: 8, near: 0.08 } as const;

/** The opening camera of a frame: the frame's centre at z = 0, framed 1:1 (a plane at z = 0 lands on its box). */
export const restCam = (fr: Frame, o: Partial<Cam> = {}): Cam => {
  const lens = o.lens ?? LENS.mm;
  return {
    target: o.target ?? [fr.W / 2, fr.H / 2, 0],
    dist: o.dist ?? focalPx(fr, lens),
    yaw: o.yaw ?? 0,
    pitch: o.pitch ?? 0,
    roll: o.roll ?? 0,
    lens,
    focus: o.focus ?? null,
    aperture: o.aperture ?? LENS.aperture,
  };
};

/** Where the camera stands and its axes: right, down (screen y) and forward (into the picture). */
export type Basis = { pos: V3; r: V3; d: V3; f: V3; F: number };
export const basisOf = (c: Cam, fr: Frame): Basis => {
  const pitch = Math.max(-LENS.pitchMax, Math.min(LENS.pitchMax, c.pitch));
  const cy = Math.cos(rad(c.yaw));
  const sy = Math.sin(rad(c.yaw));
  const cp = Math.cos(rad(pitch));
  const sp = Math.sin(rad(pitch));
  const off: V3 = [sy * cp, -sp, cy * cp]; // from the target toward the camera (y down: -y is up)
  const pos = add(c.target, mul(off, c.dist));
  const f = mul(off, -1);
  const up: V3 = [0, -1, 0];
  let r = unit(cross(up, f));
  let d = cross(r, f);
  if (c.roll) {
    const cr = Math.cos(rad(c.roll));
    const sr = Math.sin(rad(c.roll));
    const r2 = add(mul(r, cr), mul(d, sr));
    d = add(mul(d, cr), mul(r, -sr));
    r = r2;
  }
  return { pos, r, d, f, F: focalPx(fr, c.lens) };
};

/** A world point in camera space: x right, y down, z the depth in front of the lens (px). */
export const toCam = (b: Basis, p: V3): V3 => {
  const q = sub(p, b.pos);
  return [dot(q, b.r), dot(q, b.d), dot(q, b.f)];
};

/** A world point on screen (real frame px), with its depth; behind the lens: null. */
export const project = (b: Basis, fr: Frame, p: V3): { x: number; y: number; depth: number } | null => {
  const c = toCam(b, p);
  if (c[2] <= 1e-6) return null;
  return { x: fr.u * (fr.W / 2 + (b.F * c[0]) / c[2]), y: fr.u * (fr.H / 2 + (b.F * c[1]) / c[2]), depth: c[2] };
};

/** The camera's focus distance (px along the lens axis): a given distance, its focus point's depth, else the target's. */
export const focusDist = (c: Cam, b: Basis) =>
  typeof c.focus === 'number' ? Math.max(1, c.focus) : c.focus ? Math.max(1, toCam(b, c.focus)[2]) : c.dist;

/**
 * Depth of field: the defocus (px at 1080p, a gaussian sigma) of a point at depth `depth` under a lens focused at
 * `fd`. Thin lens: sigma = aperture x (F / fd) x |depth - fd| / depth, so a macro framing (F / fd = 3) is three times
 * as shallow as the 1:1 framing, and a plane behind the focus softens less than one as far in front of it.
 */
export const cocOf = (depth: number, fd: number, F: number, aperture: number) =>
  depth <= 1e-6 || aperture <= 0 ? 0 : (aperture * (F / fd) * Math.abs(depth - fd)) / depth;

/** A plane's pose: its box on the design plane, its depth, its own turn about its anchor (deg), and its scale. */
export type Pose = {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rx: number; // + tips the top edge away from the camera (a page lying back)
  ry: number; // + turns the right edge away
  rz: number; // + turns it clockwise on screen
  ax: number; // anchor in the box, 0..1 (house centre)
  ay: number;
  s: number; // uniform scale about the anchor
};

type M3 = [number, number, number, number, number, number, number, number, number];
/** The plane's rotation (applied in the order z, x, y), as a row-major 3x3. */
const rotOf = (rx: number, ry: number, rz: number): M3 => {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rad(rx)), Math.sin(rad(rx)), Math.cos(rad(ry)), Math.sin(rad(ry)), Math.cos(rad(rz)), Math.sin(rad(rz))];
  // Rz: (x cz - y sz, x sz + y cz, z); Rx: (x, y cx - z sx, y sx + z cx); Ry: (x cy + z sy, y, -x sy + z cy)
  const Rz: M3 = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const Rx: M3 = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Ry: M3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const m = (A: M3, B: M3): M3 => {
    const o = new Array(9).fill(0) as M3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[3 * i + j] += A[3 * i + k] * B[3 * k + j];
    return o;
  };
  return m(Ry, m(Rx, Rz));
};

/** A point of the plane (local px from its box's top-left) in world space. */
export const planePoint = (p: Pose, u: number, v: number): V3 => {
  const R = rotOf(p.rx, p.ry, p.rz);
  const lx = (u - p.ax * p.w) * p.s;
  const ly = (v - p.ay * p.h) * p.s;
  const ox = p.x + p.ax * p.w;
  const oy = p.y + p.ay * p.h;
  return [ox + R[0] * lx + R[1] * ly, oy + R[3] * lx + R[4] * ly, p.z + R[6] * lx + R[7] * ly];
};

/** The plane's normal (toward its front face) in world space. */
export const planeNormal = (p: Pose): V3 => {
  const R = rotOf(p.rx, p.ry, p.rz);
  return [R[2], R[5], R[8]];
};

/**
 * The CSS matrix3d that draws a plane's element (its DOM box `res` times the pose's box, plus `pad` px of margin on
 * every side, transform-origin 0 0, left 0, top 0) where the camera sees it. Column-major, ready for
 * `matrix3d(...)`. The projection is folded in (no CSS perspective, no preserve-3d), so every plane is its own flat
 * element: filters, masks and opacity never break the 3D, and draw order is the stage's own depth sort.
 */
export const planeMatrix = (p: Pose, b: Basis, fr: Frame, res = 1, pad = 0): number[] => {
  const R = rotOf(p.rx, p.ry, p.rz);
  const k = p.s / res;
  // model: dom (U, V) -> world = O + R * ((U / res - pad - ax w) s, (V / res - pad - ay h) s, w)
  const ox = p.x + p.ax * p.w;
  const oy = p.y + p.ay * p.h;
  const cU = -(pad + p.ax * p.w) * p.s;
  const cV = -(pad + p.ay * p.h) * p.s;
  const O: V3 = [ox + R[0] * cU + R[1] * cV, oy + R[3] * cU + R[4] * cV, p.z + R[6] * cU + R[7] * cV];
  const colU: V3 = [R[0] * k, R[3] * k, R[6] * k];
  const colV: V3 = [R[1] * k, R[4] * k, R[7] * k];
  const colW: V3 = [R[2], R[5], R[8]];
  // view: camera = B (world - pos)
  const cam = (v: V3, point: boolean): V3 => (point ? toCam(b, v) : [dot(v, b.r), dot(v, b.d), dot(v, b.f)]);
  const cu = cam(colU, false);
  const cv = cam(colV, false);
  const cw = cam(colW, false);
  const co = cam(O, true);
  // projection: X = u (F x + W/2 z), Y = u (F y + H/2 z), Z = 1, W = z
  const P = (c: V3, w1: number): [number, number, number, number] => [
    fr.u * (b.F * c[0] + (fr.W / 2) * c[2]),
    fr.u * (b.F * c[1] + (fr.H / 2) * c[2]),
    w1,
    c[2],
  ];
  const a = P(cu, 0);
  const bb = P(cv, 0);
  const c = P(cw, 0);
  const d = P(co, 1);
  return [...a, ...bb, ...c, ...d];
};

export const matrixCss = (m: readonly number[]) => `matrix3d(${m.map((v) => (Math.abs(v) < 1e-9 ? 0 : +v.toPrecision(9))).join(',')})`;

/** The plane's four corners (local box corners) in camera space, for depth sorting, culling and defocus. */
export const planeCorners = (p: Pose, b: Basis): V3[] =>
  [
    [0, 0],
    [p.w, 0],
    [p.w, p.h],
    [0, p.h],
  ].map(([u, v]) => toCam(b, planePoint(p, u, v)));

/**
 * How many screen px one local px of the plane covers at local point (u, v) (the larger axis, at 1080p design
 * size): its magnification there. A plane facing the camera at z = 0 under the opening camera is 1.
 */
export const magAt = (p: Pose, b: Basis, u: number, v: number) => {
  const c = toCam(b, planePoint(p, u, v));
  if (c[2] <= 1e-6) return Infinity;
  const e = 1;
  const cu = toCam(b, planePoint(p, u + e, v));
  const cv = toCam(b, planePoint(p, u, v + e));
  const sx = (q: V3) => (b.F * q[0]) / q[2];
  const sy = (q: V3) => (b.F * q[1]) / q[2];
  const du = Math.hypot(sx(cu) - sx(c), sy(cu) - sy(c));
  const dv = Math.hypot(sx(cv) - sx(c), sy(cv) - sy(c));
  return Math.max(du, dv);
};

/** Screen-space (design px) Jacobian of the plane at local (u, v): columns d(screen)/du and d(screen)/dv. */
export const jacobianAt = (p: Pose, b: Basis, u: number, v: number) => {
  const s = (uu: number, vv: number) => {
    const c = toCam(b, planePoint(p, uu, vv));
    return [(b.F * c[0]) / c[2], (b.F * c[1]) / c[2]] as const;
  };
  const o = s(u, v);
  const a = s(u + 1, v);
  const c = s(u, v + 1);
  return { du: [a[0] - o[0], a[1] - o[1]] as const, dv: [c[0] - o[0], c[1] - o[1]] as const };
};
