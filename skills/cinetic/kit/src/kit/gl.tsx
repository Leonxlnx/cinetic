// A hero object built in code with three.js (a ring, a device, a glass solid), drawn by ONE shared WebGL renderer into
// each view's own 2D canvas. Chrome allows only ~16 WebGL contexts a page: a <ThreeCanvas> per view breaks the 36-frame
// sheet (which mounts the film 36 times). With GLView every view shares one context.
//
//   const world = (renderer) => { const scene = ...; const camera = ...; return { scene, camera, ring }; };
//   const draw = (w, state, renderer) => { w.ring.rotation.y = state.spin; renderer.render(w.scene, w.camera); };
//   <GLView id="ring" build={world} draw={draw} state={{ spin: mix(p, 0, 2) }} width={1920} height={1080} />
//
// Keep `state` a small plain object (it keys the redraw). Light the object with an environment (a studio of emissive
// strips through PMREMGenerator) and a physical material; flat-lit 3D reads cheaper than good CSS.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';

let shared: THREE.WebGLRenderer | null = null;
const worlds = new Map<string, unknown>();

const renderer = () => {
  if (!shared) {
    shared = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    shared.setClearColor(0x000000, 0);
    shared.toneMapping = THREE.ACESFilmicToneMapping;
    shared.outputColorSpace = THREE.SRGBColorSpace;
  }
  return shared;
};

export function GLView<W, S>({
  id,
  build,
  draw,
  state,
  width,
  height,
  ss = 1.25,
  style,
}: {
  /** One id per world (the scene is built once and reused by every view of it). */
  id: string;
  build: (r: THREE.WebGLRenderer) => W;
  draw: (world: W, state: S, r: THREE.WebGLRenderer, width: number, height: number) => void;
  state: S;
  width: number;
  height: number;
  /** Supersampling: render larger, then scale down (1.25-1.5 for crisp edges on metal). */
  ss?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(state);
  useLayoutEffect(() => {
    const r = renderer();
    if (!worlds.has(id)) worlds.set(id, build(r));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const pw = Math.round(width * dpr * ss);
    const ph = Math.round(height * dpr * ss);
    const c = ref.current;
    if (!c) return;
    if (c.width !== pw) c.width = pw;
    if (c.height !== ph) c.height = ph;
    r.setSize(pw, ph, false);
    draw(worlds.get(id) as W, state, r, pw, ph);
    const g = c.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, pw, ph);
    g.imageSmoothingQuality = 'high';
    g.drawImage(r.domElement, 0, 0, pw, ph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height, ss, id]);
  return (
    <AbsoluteFill style={style}>
      <canvas ref={ref} style={{ width, height }} />
    </AbsoluteFill>
  );
}

/** A studio environment for metal and glass: dark room, soft strip lights (one warm strip in the accent's colour). */
export const studioEnvironment = (r: THREE.WebGLRenderer, accent = '#FF5B2E') => {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050506');
  const strip = (w: number, h: number, color: THREE.Color, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  const a = new THREE.Color(accent);
  strip(1.2, 9, new THREE.Color(5, 5, 5.2), [-5, 1, 2]);
  strip(0.6, 9, new THREE.Color(2.4, 2.4, 2.5), [5, 0, 1.5]);
  strip(9, 0.8, new THREE.Color(1.8, 1.8, 1.9), [0, 6, -1]);
  strip(4, 0.45, new THREE.Color(a.r * 2.2, a.g * 2.2, a.b * 2.2), [1, -5, 3]);
  const pm = new THREE.PMREMGenerator(r);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
};

/** A camera on an orbit about (tx, ty, 0): yaw and pitch in degrees, dist in world units. Pure, so the scene's draw and a
 * DOM overlay can pose the same camera for a frame. */
export const orbitCamera = (c: { yaw?: number; pitch?: number; dist: number; tx?: number; ty?: number }, aspect = 16 / 9, fov = 32) => {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
  const y = ((c.yaw ?? 0) * Math.PI) / 180;
  const p = ((c.pitch ?? 0) * Math.PI) / 180;
  const tx = c.tx ?? 0;
  const ty = c.ty ?? 0;
  cam.position.set(tx + c.dist * Math.sin(y) * Math.cos(p), ty + c.dist * Math.sin(p), c.dist * Math.cos(y) * Math.cos(p));
  cam.lookAt(tx, ty, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

/** Where a 3D point lands in the frame (px): pin a label, a number or a line of type to a spot on the object. */
export const glPoint = (camera: THREE.Camera, p: [number, number, number], width = 1920, height = 1080) => {
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, behind: v.z > 1 };
};

let rayProfile: THREE.CanvasTexture | null = null;
const profile = () => {
  if (rayProfile) return rayProfile;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const img = g.createImageData(64, 4);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 64; x++) {
      const d = Math.abs(x - 31.5);
      // a hot core, a halo, a wide bloom: a ray of light, not a tube
      const a = Math.min(1, Math.exp(-((d / 1.7) ** 2)) + 0.42 * Math.exp(-((d / 7) ** 2)) + 0.13 * Math.exp(-((d / 18) ** 2)));
      const o = (y * 64 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(255 * a);
    }
  g.putImageData(img, 0, 0);
  rayProfile = new THREE.CanvasTexture(c);
  rayProfile.colorSpace = THREE.SRGBColorSpace;
  return rayProfile;
};

/**
 * A ray of light in a three.js scene: a ribbon that turns about its own axis to face the lens, with a soft profile, so
 * it never shows a tube's hard edge. Add it once in `build`; in `draw` call `place(from, to, camera, strength)` (grow
 * `to` along the ray to shoot it; strength 0 hides it). `through: true` keeps it visible inside glass.
 */
export const glRay = (scene: THREE.Scene, color: string, o: { width?: number; opacity?: number; through?: boolean } = {}) => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      map: profile(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: !o.through,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.renderOrder = 5;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false;
  scene.add(mesh);
  const width = o.width ?? 0.5;
  const opacity = o.opacity ?? 1;
  const place = (from: THREE.Vector3, to: THREE.Vector3, camera: THREE.Camera, strength = 1) => {
    const d = to.clone().sub(from);
    const len = d.length();
    mesh.visible = len > 1e-3 && strength > 0.002;
    if (!mesh.visible) return;
    const mid = from.clone().addScaledVector(d, 0.5);
    const y = d.clone().normalize();
    const x = new THREE.Vector3().crossVectors(y, camera.position.clone().sub(mid)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    mesh.matrix.makeBasis(x.multiplyScalar(width), y.multiplyScalar(len), z).setPosition(mid);
    mesh.matrixWorldNeedsUpdate = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * strength;
  };
  return { mesh, place };
};
