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
