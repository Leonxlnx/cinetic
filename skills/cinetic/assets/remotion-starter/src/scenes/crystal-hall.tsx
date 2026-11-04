// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// crystal-hall: a dark hall of glowing grid walls; a glossy sphere in the accent flies in huge from the lower-left
// foreground, recedes in an arc, lands on the floor at the far end with a small squash and floats up; a glass
// octahedron forms around it in front of a glowing column, a hard-edged cone of light drops from the top of the frame
// onto it and a pillar of light stands under it; while the sphere flies a pillar of light rises and splits into two beams
// racing to the top corners and a far ring lights up behind them, both thinning as the camera keeps pulling back and
// tilting up, the whole scene long; at the end
// the crystal fills with light from its lower point up (and, with a logo, the mark is inside it when the light settles).
// Numbers (frames at 30 fps, px at 1080, at the landed view): the camera pulls back x1.3 -> x1 and tilts up 150 px over
// the scene on cubic-bezier(.14, .57, .42, .95) (31 % of the move in its first 10 %), about (960, 248); the sphere
// shrinks r 300 -> 46 on an exponential over 10 f (blurred 9 px at its fastest), lands at f10 (6 % wider than tall),
// rises into the crystal by f17; the crystal (half width 195, half height 262, centre (960, 600)) forms f12-18 from
// x0.82, turning 30 -> 45 deg about its axis as the camera lands; the cone drops f16-21 (top edge 198 px down -> the
// frame's top, apex hidden behind the crystal at (960, 880)) and widens to 255-1665 px at the top; the pillar is ~180
// px wide at the bottom, 40 at the crystal, its edges 12 px soft; the flash: the lower pyramid whitens f58-61, the upper
// f61-64, a white core r 50 px (50 % at 82, 10 % at 98) peaks f61-64 and settles to 70 %; the beams 14 px wide at f4
// thinning to 3 px by f10 and 30 % after, the ring r 472 -> 710 px, its tube 40 -> 3.5 px over f4-12.
// The crystal is drawn in 3D (fx/three: real glass on a GPU) and, without hardware WebGL, as an exact projection of the
// same solid in SVG (its faces sorted, the back ones seen through the front ones), so a software render reads the same.
import React, { useEffect, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { type Logo, LogoMark } from '../brand/Mark';
import { draws3D, type GlMode } from '../fx/three/gl';
import { deg, Stage3D, useSampler } from '../fx/three/stage';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { type Palette, paletteOf, type SceneMeta, span, tab, useClock } from './parts';
import { bezier, Stage1080 } from './stage1080';

export type CrystalHallProps = {
  /** the product's mark: when given it is inside the crystal once the light settles (the sphere hands over to it) */
  logo?: Logo;
  /** ink: the hall's dark (the ground is always a dark mixed from ink); accent: the grid, the sphere, the cone's edges;
   *  lift: the floor strips and the upper facets; paper: the light at the cone's heart, the pillar and the flash */
  palette?: Partial<Palette>;
  /** 'auto': real glass on a GPU, the projected drawing on software GL; 'fallback' always draws the projection */
  gl?: GlMode;
  frame?: number;
};

export const CRYSTAL_HALL = {
  dur: 78,
  fly: [0, 10] as const,
  rise: [10, 17] as const,
  form: [12, 18] as const,
  cone: [16, 21] as const,
  flash: [58, 61, 64, 66] as const,
  pull: 1.3,
  tilt: 150,
  centre: [960, 600] as const,
  half: [195, 262] as const,
} as const;

const CAM = bezier(0.14, 0.57, 0.42, 0.95);
// the sphere's flight: its centre x, y and radius at the landed view, frame by frame
const FLY_X: [number, number][] = [[0, 520], [2, 610], [4, 735], [6, 850], [8, 915], [10, 952], [12, 958], [14, 960], [17, 960]];
const FLY_Y: [number, number][] = [[0, 1120], [2, 900], [4, 760], [6, 735], [8, 790], [10, 812], [12, 760], [14, 680], [17, 600]];
const FLY_R: [number, number][] = [[0, 300], [2, 200], [4, 130], [6, 88], [8, 62], [10, 50], [14, 46], [17, 46]];
const CONE_TOP: [number, number][] = [[16, 198], [19, 40], [21, 0]];
// the far ring (radius, top, tube width, strength) and the beams (their node, width, strength) of the opening
const RING_R: [number, number][] = [[2, 170], [4, 472], [6, 585], [8, 645], [10, 682], [12, 710]];
const RING_TOP: [number, number][] = [[2, 350], [4, 165], [6, 105], [8, 69], [10, 54], [12, 40]];
const RING_W: [number, number][] = [[2, 6], [4, 40], [6, 24], [8, 12], [10, 6], [12, 3.5]];
const RING_A: [number, number][] = [[2, 0.3], [4, 1], [8, 0.9], [12, 0.45], [78, 0.4]];
const NODE_Y: [number, number][] = [[0, 620], [4, 690], [12, 880]];
const BEAM_W: [number, number][] = [[0, 16], [2, 12], [4, 14], [6, 10], [8, 6], [10, 3], [12, 2.5]];
const BEAM_A: [number, number][] = [[0, 0], [1, 1], [6, 1], [10, 0.5], [12, 0.3], [78, 0.26]];
const CONE_W: [number, number][] = [[16, 150], [18, 380], [21, 545], [30, 640], [50, 700], [78, 712]];

/** The camera at frame t: magnification about (960, 248) and the tilt (px the world sits low), both front-loaded. */
export const crystalCamera = (t: number) => {
  const q = CAM(span(t, 0, CRYSTAL_HALL.dur));
  return { s: CRYSTAL_HALL.pull + (1 - CRYSTAL_HALL.pull) * q, dy: -CRYSTAL_HALL.tilt * (1 - q), q };
};
const toScreen = (x: number, y: number, cam: ReturnType<typeof crystalCamera>): [number, number] => [960 + (x - 960) * cam.s, 248 + (y - 248 + cam.dy) * cam.s];

// ---- the octahedron: vertices, faces, an exact projection (long lens), outward normals for the front / back sort
type V3 = [number, number, number];
const octa = (w: number, h: number): V3[] => [[0, -h, 0], [0, h, 0], [w, 0, 0], [0, 0, w], [-w, 0, 0], [0, 0, -w]];
const FACES: [number, number, number, 'up' | 'low'][] = [
  [0, 2, 3, 'up'], [0, 3, 4, 'up'], [0, 4, 5, 'up'], [0, 5, 2, 'up'],
  [1, 3, 2, 'low'], [1, 4, 3, 'low'], [1, 5, 4, 'low'], [1, 2, 5, 'low'],
];
const LENS = 2600;
const PITCH = 7; // the camera a little above the crystal's waist
export const crystalFaces = (yawDeg: number, cx: number, cy: number, s: number) => {
  const [w, h] = CRYSTAL_HALL.half;
  const a = (yawDeg * Math.PI) / 180;
  const p = (PITCH * Math.PI) / 180;
  const vs = octa(w * s, h * s).map(([x, y, z]): V3 => {
    const x1 = x * Math.cos(a) + z * Math.sin(a);
    const z1 = -x * Math.sin(a) + z * Math.cos(a);
    const y2 = y * Math.cos(p) - z1 * Math.sin(p);
    const z2 = y * Math.sin(p) + z1 * Math.cos(p);
    return [x1, y2, z2];
  });
  const scr = vs.map(([x, y, z]) => {
    const f = LENS / (LENS - z);
    return [cx + x * f, cy + y * f] as [number, number];
  });
  return FACES.map(([i, j, k, half]) => {
    const A = vs[i];
    const B = vs[j];
    const Cc = vs[k];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const v = [Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const cen = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3, (A[2] + B[2] + Cc[2]) / 3];
    if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) n = n.map((c) => -c);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    const view = [-cen[0], -cen[1], LENS - cen[2]];
    const front = n[0] * view[0] + n[1] * view[1] + n[2] * view[2] > 0;
    const light = clamp(0.5 + 0.5 * ((-0.45 * n[0] - 0.7 * n[1] + 0.55 * n[2]) / len)); // key from the upper left front
    return { pts: [scr[i], scr[j], scr[k]] as [number, number][], half, front, light, depth: cen[2] };
  });
};

// ---- the 3D crystal (GPU): two glass pyramids, white edges, the sphere inside, its light from the flash
const CrystalSolid: React.FC<{ P: Palette; frameOf: (t: number) => number; W: number; H: number; k: number; hasLogo: boolean }> = ({ P, frameOf, W, H, k, hasLogo }) => {
  const built = useMemo(() => {
    const [w, h] = CRYSTAL_HALL.half;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const half = (sign: 1 | -1, color: string) => {
      const pos = [0, sign * h, 0, w, 0, 0, 0, 0, w, -w, 0, 0, 0, 0, -w];
      const idx = sign > 0 ? [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1] : [0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 1, 4];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      const flat = g.toNonIndexed();
      flat.computeVertexNormals();
      const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: 0.06, metalness: 0, transmission: 0.92, thickness: 120, ior: 1.5, transparent: true, opacity: 0.9, emissive: new THREE.Color(P.paper), emissiveIntensity: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(flat, m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(flat), new THREE.LineBasicMaterial({ color: new THREE.Color(P.paper), transparent: true, opacity: 0.8 }));
      body.add(mesh, edges);
      return { mesh, m, g, flat, edges };
    };
    const up = half(1, mixColor(P.lift, P.paper, 0.25));
    const low = half(-1, P.accent);
    const sphereM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(P.accent), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(P.accent), emissiveIntensity: 0.25 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sphereM);
    root.add(sphere);
    const dispose = () => {
      [up, low].forEach((x) => {
        x.g.dispose();
        x.flat.dispose();
        x.m.dispose();
        x.edges.geometry.dispose();
        (x.edges.material as THREE.Material).dispose();
      });
      sphere.geometry.dispose();
      sphereM.dispose();
    };
    return { root, body, up, low, sphere, dispose };
  }, [P.accent, P.lift, P.paper]);
  useEffect(() => () => built.dispose(), [built]);
  useSampler((tf) => {
    const t = frameOf(tf);
    const cam = crystalCamera(t);
    const form = E.glideOut(span(t, CRYSTAL_HALL.form[0], CRYSTAL_HALL.form[1]));
    const [cx, cy] = toScreen(CRYSTAL_HALL.centre[0], CRYSTAL_HALL.centre[1], cam);
    const s = cam.s * (0.82 + 0.18 * form) * k;
    built.body.visible = form > 0.001;
    built.body.position.set((cx * k - W / 2), (H / 2 - cy * k), 0);
    built.body.scale.setScalar(s);
    built.body.rotation.set(deg(PITCH), deg(30 + 15 * E.settleOut(span(t, 6, CRYSTAL_HALL.dur))), 0);
    const [f0, f1, f2] = CRYSTAL_HALL.flash;
    built.low.m.emissiveIntensity = 1.6 * span(t, f0, f1) * (1 - 0.3 * span(t, f2, CRYSTAL_HALL.flash[3]));
    built.up.m.emissiveIntensity = 1.6 * span(t, f1, f2) * (1 - 0.3 * span(t, f2, CRYSTAL_HALL.flash[3]));
    built.low.m.opacity = built.up.m.opacity = 0.9 * form;
    const [sx, sy] = toScreen(tab(t, FLY_X), tab(t, FLY_Y), cam);
    const r = tab(t, FLY_R) * cam.s * k;
    const squash = 1 + 0.06 * Math.max(0, 1 - Math.abs(t - CRYSTAL_HALL.fly[1]) / 2);
    built.sphere.position.set(sx * k - W / 2, H / 2 - sy * k, 0);
    built.sphere.scale.set(r * squash, r / squash, r);
    built.sphere.visible = !(hasLogo && t > f2 + 1);
    const moving = t < CRYSTAL_HALL.rise[1] + 1;
    return { moving, still: !moving };
  });
  return <primitive object={built.root} />;
};

export const CrystalHall: React.FC<CrystalHallProps> = ({ logo, palette, gl = 'auto', frame }) => {
  const { t, k: rate, W, H } = useClock(frame);
  const cur = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const P = paletteOf(palette);
  const dark = mixColor(P.ink, P.accent, 0.1);
  const deep = mixColor(P.ink, P.accent, 0.04);
  const grid = withAlpha(mixColor(P.accent, P.paper, 0.15), 0.5);
  const cream = mixColor(P.paper, P.lift, 0.22);
  const cam = crystalCamera(t);
  const three = draws3D(gl);
  // ---- the hall: two grid walls converging on a vanishing point, the back wall, the floor with its light strips
  const VP: [number, number] = [960, 470];
  const fz = (X: number, Y: number, z: number): [number, number] => [VP[0] + (960 * X) / z, VP[1] + (960 * Y) / z];
  const lines: string[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 12; i++) {
      const z = 1 + i * 0.42;
      const a = fz(side * 1.55, -1.25, z);
      const b = fz(side * 1.55, 0.95, z);
      lines.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }
    for (let j = 0; j <= 11; j++) {
      const Y = -1.25 + j * 0.2;
      const a = fz(side * 1.55, Y, 1);
      const b = fz(side * 1.55, Y, 6.04);
      lines.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }
  }
  const backL = fz(-1.55, -1.25, 6.04);
  const backR = fz(1.55, 0.95, 6.04);
  const floorY = fz(0, 0.95, 6.04)[1];
  const backGrid = [
    ...Array.from({ length: 9 }, (_, i) => { const x = backL[0] + ((backR[0] - backL[0]) * (i + 1)) / 10; return `M${x.toFixed(1)} ${backL[1].toFixed(1)} L${x.toFixed(1)} ${backR[1].toFixed(1)}`; }),
    ...Array.from({ length: 6 }, (_, j) => { const y = backL[1] + ((backR[1] - backL[1]) * (j + 1)) / 7; return `M${backL[0].toFixed(1)} ${y.toFixed(1)} L${backR[0].toFixed(1)} ${y.toFixed(1)}`; }),
  ].join(' ');
  // ---- the far ring and the beams of the opening, frame by frame
  const ringR = tab(t, RING_R);
  const ringTop = tab(t, RING_TOP);
  const ringW = tab(t, RING_W);
  const ringA = t < 2 ? 0 : tab(t, RING_A);
  const ringPath = `M ${(960 - ringR).toFixed(1)} ${(ringTop + ringR).toFixed(1)} A ${ringR.toFixed(1)} ${ringR.toFixed(1)} 0 0 1 ${(960 + ringR).toFixed(1)} ${(ringTop + ringR).toFixed(1)}`;
  const nodeY = tab(t, NODE_Y);
  const reach = (nodeY + 400) / Math.tan((44 * Math.PI) / 180);
  const beamPath = `${t < CRYSTAL_HALL.rise[1] ? `M 960 1140 L 960 ${nodeY.toFixed(1)} ` : ''}${t >= 2 ? `M ${(960 - reach).toFixed(1)} -400 L 960 ${nodeY.toFixed(1)} L ${(960 + reach).toFixed(1)} -400` : ''}`;
  const beamW = tab(t, BEAM_W);
  const beamA = tab(t, BEAM_A);
  // ---- the cone, the column, the pillar, the flash
  const coneOn = t >= CRYSTAL_HALL.cone[0];
  const coneTop = tab(t, CONE_TOP);
  const coneHalf = tab(t, CONE_W);
  const drift = (t - CRYSTAL_HALL.cone[0]) / 50; // one slow swing of the cone's light across it
  const form = E.glideOut(span(t, CRYSTAL_HALL.form[0], CRYSTAL_HALL.form[1]));
  const column = E.snapOut(span(t, CRYSTAL_HALL.form[0] - 1, CRYSTAL_HALL.form[0] + 4));
  const pillar = E.snapOut(span(t, CRYSTAL_HALL.form[0], CRYSTAL_HALL.form[0] + 5));
  const columnMask = `linear-gradient(180deg, ${withAlpha(P.ink, 0)} 0%, ${withAlpha(P.ink, 1)} 30%, ${withAlpha(P.ink, 1)} 100%)`;
  const [f0, f1, f2, f3] = CRYSTAL_HALL.flash;
  const wLow = span(t, f0, f1) * (1 - 0.3 * span(t, f2, f3));
  const wUp = span(t, f1, f2) * (1 - 0.3 * span(t, f2, f3));
  const core = clamp(E.snapOut(span(t, f1 - 1, f1 + 1))) * (1 - 0.3 * E.softOut(span(t, f2, f3 + 4)));
  const markOn = logo ? E.snapOut(span(t, f1 + 1, f2 + 1)) : 0;
  // ---- the sphere's flight
  const sr = tab(t, FLY_R);
  const squash = 1 + 0.06 * Math.max(0, 1 - Math.abs(t - CRYSTAL_HALL.fly[1]) / 2);
  const speed = Math.hypot(tab(t + 0.5, FLY_X) - tab(t - 0.5, FLY_X), tab(t + 0.5, FLY_Y) - tab(t - 0.5, FLY_Y));
  const sBlur = Math.min(9, speed / 14);
  const sx = tab(t, FLY_X);
  const sy = tab(t, FLY_Y);
  const yaw = 30 + 15 * E.settleOut(span(t, 6, CRYSTAL_HALL.dur));
  const faces = crystalFaces(yaw, CRYSTAL_HALL.centre[0], CRYSTAL_HALL.centre[1], 0.82 + 0.18 * form);
  const [cx, cy] = CRYSTAL_HALL.centre;
  const [hw, hh] = CRYSTAL_HALL.half;
  const faceFill = (half: 'up' | 'low', light: number, front: boolean) => {
    const base = half === 'up' ? mixColor(P.lift, P.paper, 0.2 + 0.3 * light) : mixColor(P.accent, P.lift, 0.15 + 0.45 * light);
    const lit = mixColor(base, P.paper, half === 'up' ? wUp : wLow);
    return withAlpha(lit, (front ? 0.42 : 0.2) + 0.45 * (half === 'up' ? wUp : wLow));
  };
  const facePath = (pts: [number, number][]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} Z`;
  const sphere = (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * sr, height: 2 * sr, borderRadius: '50%', transform: `translate(${(sx - sr * squash).toFixed(2)}px, ${(sy - sr / squash).toFixed(2)}px) scale(${squash.toFixed(4)}, ${(1 / squash).toFixed(4)})`, transformOrigin: '0 0', background: `radial-gradient(circle at 34% 30%, ${mixColor(P.paper, P.lift, 0.15)} 0%, ${mixColor(P.lift, P.accent, 0.4)} 16%, ${P.accent} 48%, ${mixColor(P.accent, P.ink, 0.45)} 100%)`, boxShadow: `0 0 ${(0.5 * sr).toFixed(1)}px ${withAlpha(P.accent, 0.45)}`, filter: sBlur > 0.3 ? `blur(${sBlur.toFixed(2)}px)` : undefined, opacity: 1 - markOn }} />
  );
  return (
    <Stage1080 W={W} H={H} ground={deep}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '960px 248px', transform: `scale(${cam.s.toFixed(5)}) translateY(${cam.dy.toFixed(2)}px)` }}>
        {/* the back wall and its glow, the far arc, the two grid walls, the floor and its strips */}
        <div style={{ position: 'absolute', left: backL[0], top: backL[1], width: backR[0] - backL[0], height: backR[1] - backL[1], background: deep }} />
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <path d={backGrid} stroke={withAlpha(mixColor(P.accent, P.paper, 0.15), 0.28)} strokeWidth={1.2} fill="none" />
        </svg>
        <div style={{ position: 'absolute', left: 460, top: 120, width: 1000, height: 640, background: `radial-gradient(closest-side, ${withAlpha(P.accent, 0.3)}, ${withAlpha(P.accent, 0)})` }} />
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            <linearGradient id="chFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={mixColor(dark, P.accent, 0.12)} />
              <stop offset="1" stopColor={mixColor(dark, P.accent, 0.3)} />
            </linearGradient>
          </defs>
          <polygon points={`${fz(-1.55, -1.25, 1).join(',')} ${fz(-1.55, -1.25, 6.04).join(',')} ${fz(-1.55, 0.95, 6.04).join(',')} ${fz(-1.55, 0.95, 1).join(',')}`} fill={withAlpha(dark, 0.94)} />
          <polygon points={`${fz(1.55, -1.25, 1).join(',')} ${fz(1.55, -1.25, 6.04).join(',')} ${fz(1.55, 0.95, 6.04).join(',')} ${fz(1.55, 0.95, 1).join(',')}`} fill={withAlpha(dark, 0.94)} />
          <path d={lines.join(' ')} stroke={grid} strokeWidth={1.6} fill="none" />
          <polygon points={`${fz(-1.55, 0.95, 1).join(',')} ${fz(-1.55, 0.95, 6.04).join(',')} ${fz(1.55, 0.95, 6.04).join(',')} ${fz(1.55, 0.95, 1).join(',')}`} fill="url(#chFloor)" />
          <path d={`M ${fz(-0.55, 0.95, 1).join(' ')} L ${fz(-0.12, 0.95, 6.04).join(' ')} M ${fz(0.55, 0.95, 1).join(' ')} L ${fz(0.12, 0.95, 6.04).join(' ')}`} stroke={withAlpha(P.lift, 0.75)} strokeWidth={5} />
          <line x1={backL[0]} y1={floorY} x2={backR[0]} y2={floorY} stroke={withAlpha(P.lift, 0.5)} strokeWidth={2} />
        </svg>
        {/* the far ring of light: bright and thick while near, thinning and fading as the camera pulls back */}
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            <filter id="chGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          {ringA > 0.01 ? (
            <>
              <path d={ringPath} fill="none" stroke={withAlpha(P.accent, 0.8 * ringA)} strokeWidth={ringW * 2.4} filter="url(#chGlow)" />
              <path d={ringPath} fill="none" stroke={withAlpha(mixColor(P.accent, P.paper, 0.35), ringA)} strokeWidth={ringW} />
            </>
          ) : null}
          {/* the light pillar rising from the floor and the two beams racing to the top corners, then faint diagonals */}
          {beamA > 0.01 ? (
            <>
              <path d={beamPath} fill="none" stroke={withAlpha(P.paper, 0.55 * beamA)} strokeWidth={beamW * 3} filter="url(#chGlow)" strokeLinecap="round" />
              <path d={beamPath} fill="none" stroke={withAlpha(P.paper, beamA)} strokeWidth={beamW} strokeLinecap="round" />
            </>
          ) : null}
        </svg>
        {/* the glow at the walls' lower inner corners */}
        <div style={{ position: 'absolute', left: 120, top: 560, width: 520, height: 360, background: `radial-gradient(closest-side, ${withAlpha(P.accent, 0.42)}, ${withAlpha(P.accent, 0)})` }} />
        <div style={{ position: 'absolute', left: 1280, top: 560, width: 520, height: 360, background: `radial-gradient(closest-side, ${withAlpha(P.accent, 0.42)}, ${withAlpha(P.accent, 0)})` }} />
        {/* the cone of light, hard edged, dropping from the top */}
        {coneOn ? (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, clipPath: `polygon(${960 - coneHalf}px ${coneTop}px, ${960 + coneHalf}px ${coneTop}px, 960px 880px)`, background: `linear-gradient(90deg, ${P.accent} ${(4 + 8 * Math.sin(drift * Math.PI * 2)).toFixed(1)}%, ${mixColor(P.accent, cream, 0.55)} 22%, ${cream} ${(50 + 12 * Math.sin(drift * Math.PI * 2)).toFixed(1)}%, ${mixColor(P.accent, cream, 0.55)} 78%, ${P.accent} ${(96 + 4 * Math.sin(drift * Math.PI * 2)).toFixed(1)}%)` }} />
        ) : null}
        {/* the glowing column behind the crystal and the pillar under it */}
        <div style={{ position: 'absolute', left: 760, top: 330, width: 400, height: 560, opacity: column, background: `linear-gradient(90deg, ${withAlpha(P.accent, 0)}, ${withAlpha(P.accent, 0.7)} 22%, ${withAlpha(mixColor(P.accent, P.lift, 0.3), 0.75)} 50%, ${withAlpha(P.accent, 0.7)} 78%, ${withAlpha(P.accent, 0)})`, WebkitMaskImage: columnMask, maskImage: columnMask, filter: 'blur(12px)' }} />
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: pillar }}>
          <defs>
            <linearGradient id="chPillar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={cream} stopOpacity={0} />
              <stop offset="0.38" stopColor={cream} stopOpacity={0.85} />
              <stop offset="0.5" stopColor={P.paper} stopOpacity={1} />
              <stop offset="0.62" stopColor={cream} stopOpacity={0.85} />
              <stop offset="1" stopColor={cream} stopOpacity={0} />
            </linearGradient>
            <filter id="chSoft" x="-30%" y="-10%" width="160%" height="120%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          <polygon points={`${cx - 26},${cy + hh - 10} ${cx + 26},${cy + hh - 10} ${cx + 110},1100 ${cx - 110},1100`} fill="url(#chPillar)" filter="url(#chSoft)" />
        </svg>
        {/* the crystal: back faces, the sphere inside, front faces (the projected drawing), or nothing here when 3D draws it */}
        {!three ? (
          <>
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: form, overflow: 'visible' }}>
              {faces.filter((f) => !f.front).map((f, i) => (
                <path key={i} d={facePath(f.pts)} fill={faceFill(f.half, f.light, false)} stroke={withAlpha(P.paper, 0.3)} strokeWidth={1.5} strokeLinejoin="round" />
              ))}
            </svg>
            {form > 0.001 ? sphere : null}
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: form, overflow: 'visible' }}>
              {faces
                .filter((f) => f.front)
                .sort((a, b) => a.depth - b.depth)
                .map((f, i) => (
                  <path key={i} d={facePath(f.pts)} fill={faceFill(f.half, f.light, true)} stroke={withAlpha(P.paper, 0.85)} strokeWidth={2.2} strokeLinejoin="round" />
                ))}
              <line x1={cx - hw * (0.82 + 0.18 * form)} y1={cy} x2={cx + hw * (0.82 + 0.18 * form)} y2={cy} stroke={withAlpha(P.paper, 0.55)} strokeWidth={2} />
            </svg>
            {form <= 0.001 ? sphere : null}
          </>
        ) : null}
      </div>
      {three ? (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${(1920 / width).toFixed(5)})` }}>
          <Stage3D frame={cur}>
            <CrystalSolid P={P} frameOf={(tf) => tf / rate} W={width} H={height} k={Math.min(width / 1920, height / 1080)} hasLogo={!!logo} />
          </Stage3D>
        </div>
      ) : null}
      {/* the flash's white core, then the mark inside the crystal (over the 3D canvas too) */}
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '960px 248px', transform: `scale(${cam.s.toFixed(5)}) translateY(${cam.dy.toFixed(2)}px)` }}>
      {core > 0 ? <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cx - 130}px, ${cy - 130}px)`, width: 260, height: 260, borderRadius: '50%', opacity: core, background: `radial-gradient(closest-side, ${P.paper} 38%, ${withAlpha(P.paper, 0.5)} 63%, ${withAlpha(P.paper, 0.1)} 75%, ${withAlpha(P.paper, 0)} 100%)` }} /> : null}
      {logo && markOn > 0 ? (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cx - 70}px, ${cy - 70}px)`, width: 140, height: 140, opacity: markOn }}>
          <LogoMark logo={logo} size={140} />
        </div>
      ) : null}
      </div>
    </Stage1080>
  );
};

export const crystalHallMeta: SceneMeta = {
  id: 'crystal-hall',
  does: 'a sphere flies into a dark hall of glowing grid walls and lands; a glass octahedron forms around it, a cone of light drops onto it and it fills with light',
  dur: CRYSTAL_HALL.dur,
  props: ['logo?', 'palette?', 'gl?'],
  handIn: null,
  handOut: { form: 'mark', x: 960 - 195, y: 600 - 262, w: 390, h: 524 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'sphere', weight: 0.6 },
    { f: CRYSTAL_HALL.fly[1], kind: 'land', id: 'landing', weight: 0.6 },
    { f: CRYSTAL_HALL.form[0], kind: 'swell', id: 'crystal', weight: 0.5 },
    { f: CRYSTAL_HALL.cone[0] + 2, kind: 'hit', id: 'cone', weight: 0.8 },
    { f: CRYSTAL_HALL.flash[0], kind: 'riser', id: 'fill', weight: 0.5 },
    { f: CRYSTAL_HALL.flash[1], kind: 'bell', id: 'flash', weight: 0.7 },
  ],
};
