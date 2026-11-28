// MarkDolly (logo, enter / build): an extreme close-up of the mark as an extruded, bevelled solid (seen from a little
// below), pulling back fast and then slowly while it turns a few degrees, until the whole mark stands in the frame; on
// its last frame it cuts to the flat mark.
// Numbers: the camera from 1.15 to 7 units in 26 f on a log scale with expo out (most of the pull in the first 8 f), 18
// degrees below, the mark turning from 28 to 12 degrees of yaw; extrusion 0.32 of the mark's width with a 0.05 bevel; the
// cut to `flat` at `dur`.
// Caution: software GL: one solid, one light, a light ground; render its strip at half scale. Give it the mark's own
// shape (`arms`, closed outlines in a 2 x 2 box) and colours.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { ease, clamp, mix, logScale } from '../../motion';
import { GLView, softStudio, orbitCamera } from '../../gl';

/** One arm of the mark: a closed outline (points in a -1..1 box) and its colour. */
export type MarkArm = { points: Array<[number, number]>; color: string };

/** The arch's outline (y up, in a -1..1 box): a thick arch over a gap, its legs standing on a step. */
const archPoints = (): Array<[number, number]> => {
  const pts: Array<[number, number]> = [];
  const cy = -0.05;
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI;
    pts.push([Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9]);
  }
  pts.push([0.9, -0.6], [0.48, -0.6]);
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    pts.push([Math.cos(a) * 0.48, cy + Math.sin(a) * 0.48]);
  }
  pts.push([-0.48, -0.6], [-0.9, -0.6]);
  return pts;
};
/**
 * The default mark (invented): an arch in the accent standing on a step in ink, a doorway. `ARCH_SVG` draws the same
 * mark flat for the cut (`flatSize(H)` tall).
 */
export const ARCH_ARMS = (accent = '#2F6BFF', ink = '#15171C'): MarkArm[] => [
  { points: archPoints(), color: accent },
  { points: [[-0.98, -0.72], [0.98, -0.72], [0.98, -0.98], [-0.98, -0.98]], color: ink },
];
/** The default mark drawn flat (an SVG path in a -1..1 box, y down), for `flat`. */
export const ARCH_SVG = (size: number, accent = '#2F6BFF', ink = '#15171C') => (
  <svg width={size} height={size} viewBox="-1 -1 2 2">
    <path d={`M${archPoints().map(([x, y]) => `${x.toFixed(3)} ${(-y).toFixed(3)}`).join(' L')} Z`} fill={accent} />
    <rect x={-0.98} y={0.72} width={1.96} height={0.26} fill={ink} />
  </svg>
);

/** The height in px the flat mark should have to match the solid's last frame (a mark 2 units across). */
export const flatSize = (H: number) => H * 0.467;

type World = { scene: THREE.Scene; group: THREE.Group };

export const MarkDolly: React.FC<{
  at?: number;
  /** Frames of the pull-back; the cut to `flat` lands here. */
  dur?: number;
  arms?: MarkArm[];
  /** The flat mark it cuts to, drawn centred: at the default camera the solid ends 47 % of H tall for a mark 2 units
   * across, so draw the flat mark that size (`flatSize(H)` gives it in px). */
  flat?: React.ReactNode;
  /** CSS background behind the solid. */
  ground?: string;
  /** World id (one per different mark in a film). */
  id?: string;
}> = ({ at = 0, dur = 26, arms, flat, ground = '#EEF1F6', id = 'markdolly' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  if (flat && t >= dur)
    return (
      <AbsoluteFill style={{ background: ground, alignItems: 'center', justifyContent: 'center' }}>
        {flat}
      </AbsoluteFill>
    );
  const p = ease.out(clamp(t / dur));
  const dist = logScale(1.15, 7, p);
  const yaw = mix(p, 28, 12);
  const list = arms ?? ARCH_ARMS();
  const build = (r: THREE.WebGLRenderer): World => {
    const scene = new THREE.Scene();
    softStudio(r, scene, { intensity: 0.75, key: 1.5, toneMapping: 'neutral' });
    const group = new THREE.Group();
    for (const arm of list) {
      const shape = new THREE.Shape();
      arm.points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.64, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3, curveSegments: 4 });
      geo.translate(0, 0, -0.32);
      const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(arm.color), roughness: 0.38, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3 });
      group.add(new THREE.Mesh(geo, mat));
    }
    scene.add(group);
    return { scene, group };
  };
  const draw = (w: World, s: { dist: number; yaw: number }, r: THREE.WebGLRenderer, pw: number, ph: number) => {
    r.toneMapping = THREE.NeutralToneMapping;
    w.group.rotation.y = (s.yaw * Math.PI) / 180;
    const cam = orbitCamera({ yaw: 0, pitch: -18, dist: s.dist }, pw / ph, 34);
    r.render(w.scene, cam);
  };
  return (
    <AbsoluteFill style={{ background: ground }}>
      <GLView id={id} build={build} draw={draw} state={{ dist: +dist.toFixed(4), yaw: +yaw.toFixed(3) }} width={W} height={H} ss={1} />
    </AbsoluteFill>
  );
};
