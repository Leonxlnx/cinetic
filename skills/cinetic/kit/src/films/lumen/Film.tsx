// "Lumen 2": rework 5 of the v2 kit. ~12 s at 30 fps. An invented AI model launch.
// One idea: the question is light. A prompt typed in macro collapses into a line of light, the line strikes a real glass
// prism (three.js, lit by a studio environment) and splits into a fan of amber rays; three of them strike the benchmark
// numbers. The context ray floods the frame warm white and the answer is on the page: three clauses, each driving a live
// simulation the model wrote (a brass top that spins, precesses, widens and falls). The precession ring opens the amber
// lockup. Grounds: dark stage -> bone page -> amber.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import {
  accel,
  at,
  clamp,
  creep,
  Cues,
  ease,
  Flash,
  Flood,
  fonts,
  GLView,
  Grain,
  keys,
  logScale,
  mix,
  mixColor,
  Music,
  Odometer,
  studioEnvironment,
  typingTimes,
  useTyped,
  Vignette,
  Words,
} from '../../kit';
import { sfx } from '../../sfx';

const INK = '#07080B';
const AMBER = '#FFB547';
const DEEP = '#D9820B'; // amber that reads on bone (the trace, the ring)
const BONE = '#F3EEE4';
const PAGE_INK = '#16130F';
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 600, letterSpacing: '-0.05em' };
const mono: React.CSSProperties = { fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase' };

const T = {
  send: 32, // enter: the prompt collapses into a line of light
  hit: 44, // the line strikes the prism
  settle: 106, // the camera has pulled back to the whole spectrum
  nums: [98, 114, 130],
  flood: 152, // the context ray floods the frame warm white
  answer: 166, // the page, opened in macro on the 0.9 s badge
  chunks: [186, 216, 246],
  fall: 284,
  iris: 300,
  word: 308, // the name cuts on inside the opening ring
  lock: 314,
  end: 362,
} as const;

const W = 1920;
const H = 1080;
const DEG = Math.PI / 180;

// ================================================================ the prism world (three.js)
type Cam = { yaw: number; pitch: number; dist: number; tx: number; ty: number };
const orbitCam = (c: Cam, aspect = W / H, fov = 32) => {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
  const y = c.yaw * DEG;
  const p = c.pitch * DEG;
  cam.position.set(c.tx + c.dist * Math.sin(y) * Math.cos(p), c.ty + c.dist * Math.sin(p), c.dist * Math.cos(y) * Math.cos(p));
  cam.lookAt(c.tx, c.ty, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};
const toPx = (cam: THREE.Camera, v: THREE.Vector3) => {
  const p = v.clone().project(cam);
  return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
};
const onPlaneZ0 = (cam: THREE.PerspectiveCamera, sx: number, sy: number) => {
  const q = new THREE.Vector3((sx / W) * 2 - 1, 1 - (sy / H) * 2, 0.5).unproject(cam);
  const dir = q.sub(cam.position).normalize();
  const t = -cam.position.z / dir.z;
  return cam.position.clone().add(dir.multiplyScalar(t));
};

const NUMS_CAM: Cam = { yaw: 0, pitch: 3, dist: 12, tx: 3.2, ty: -0.6 };
const SRC = new THREE.Vector3(-12, 3.3, 0);
const ENTRY = new THREE.Vector3(-0.56, 0.3, 0);
const EXIT = new THREE.Vector3(0.68, 0.05, 0);
// where the three main rays strike: chosen on screen in the final framing, put back into the world
const TARGETS: [number, number][] = [
  [1000, 262],
  [1000, 560],
  [1000, 858],
];
const ENDS = TARGETS.map(([sx, sy]) => onPlaneZ0(orbitCam(NUMS_CAM), sx, sy));
const angleTo = (v: THREE.Vector3) => Math.atan2(v.y - EXIT.y, v.x - EXIT.x);
const A0 = angleTo(ENDS[0]);
const A1 = angleTo(ENDS[1]);
const A2 = angleTo(ENDS[2]);
const FAN = Array.from({ length: 13 }, (_, i) => {
  const a = i <= 6 ? mix(i / 6, A0, A1) : mix((i - 6) / 6, A1, A2);
  const c = i <= 6 ? mixColor('#FFF2D2', AMBER, i / 6) : mixColor(AMBER, '#FF8A2A', (i - 6) / 6);
  return { a, c, main: i === 0 ? 0 : i === 6 ? 1 : i === 12 ? 2 : -1 };
});

const canvasTex = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d') as CanvasRenderingContext2D);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

type Ray = { meshes: THREE.Mesh[]; radii: number[]; ops: number[] };
type PrismWorld = {
  scene: THREE.Scene;
  prism: THREE.Mesh;
  edges: THREE.LineSegments;
  core: THREE.Sprite;
  incoming: Ray;
  inner: Ray;
  fan: Ray[];
  solid: Ray[];
  glowIn: THREE.Sprite;
  glowOut: THREE.Sprite;
  hits: THREE.Sprite[];
  pool: THREE.Mesh;
  keyOut: THREE.PointLight;
  keyIn: THREE.PointLight;
  dust: THREE.Points;
  dustBase: Float32Array;
};
type PrismState = { cam: Cam; beam: number; inner: number; split: number; reach: number[]; spin: number; t: number };

// rays are ribbons that turn about their own axis to face the lens, textured with a soft profile of light (a hot core,
// a halo, a wide bloom), so a ray never shows a hard cylinder edge
const viewPos = new THREE.Vector3();
const placeRay = (ray: Ray, a: THREE.Vector3, b: THREE.Vector3, k: number) => {
  const d = b.clone().sub(a);
  const len = d.length();
  ray.meshes.forEach((m, i) => {
    m.visible = len > 1e-3 && k > 0.002;
    if (!m.visible) return;
    const mid = a.clone().addScaledVector(d, 0.5);
    const y = d.clone().normalize();
    const x = new THREE.Vector3().crossVectors(y, viewPos.clone().sub(mid)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    m.matrixAutoUpdate = false;
    m.matrix.makeBasis(x.multiplyScalar(ray.radii[i] * 2), y.multiplyScalar(len), z).setPosition(mid);
    m.matrixWorldNeedsUpdate = true;
    (m.material as THREE.MeshBasicMaterial).opacity = ray.ops[i] * k;
  });
};
const profileTex = (faded: boolean) => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const img = g.createImageData(64, 128);
  for (let yy = 0; yy < 128; yy++) {
    // canvas top is the ray's end (uv v = 1)
    const along = faded ? clamp(yy / (128 * 0.5)) ** 1.4 : 1;
    for (let xx = 0; xx < 64; xx++) {
      const dd = Math.abs(xx - 31.5);
      const a = Math.min(1, Math.exp(-((dd / 1.7) ** 2)) + 0.42 * Math.exp(-((dd / 7) ** 2)) + 0.13 * Math.exp(-((dd / 18) ** 2)));
      const o = (yy * 64 + xx) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(255 * a * along);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const buildPrism = (r: THREE.WebGLRenderer): PrismWorld => {
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(r, AMBER);
  const radial = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
  const geo = new THREE.PlaneGeometry(1, 1);
  const profSolid = profileTex(false);
  const profFaded = profileTex(true);
  const mkRay = (color: string, radii: number[], ops: number[], faded: boolean, through = false): Ray => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        map: faded ? profFaded : profSolid,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        depthTest: !through,
      }),
    );
    m.renderOrder = 5;
    scene.add(m);
    return { meshes: [m], radii: [radii[radii.length - 1]], ops: [ops[0]] };
  };
  // the stage: a dark floor that takes light, a far wall with a warm falloff (the glass has something to bend)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#0E0F13', roughness: 0.82, metalness: 0.0, envMapIntensity: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.45;
  scene.add(floor);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 40),
    new THREE.MeshBasicMaterial({
      toneMapped: false,
      map: canvasTex(512, 256, (g) => {
        const grd = g.createRadialGradient(250, 150, 0, 250, 150, 280);
        grd.addColorStop(0, '#4A3518');
        grd.addColorStop(0.4, '#1C140A');
        grd.addColorStop(1, '#08090C');
        g.fillStyle = grd;
        g.fillRect(0, 0, 512, 256);
      }),
    }),
  );
  wall.position.set(0, 8, -10);
  scene.add(wall);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: radial, color: new THREE.Color(AMBER), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(2.6, -1.44, 0.3);
  pool.scale.set(11, 4.2, 1);
  scene.add(pool);
  // the prism: a bevelled triangular glass solid (the bevels catch the studio strips: real rims)
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.25);
  shape.lineTo(-1.08, -0.625);
  shape.lineTo(1.08, -0.625);
  shape.closePath();
  const pg = new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4, steps: 1 });
  pg.translate(0, 0, -0.75);
  const prism = new THREE.Mesh(
    pg,
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      metalness: 0,
      roughness: 0.03,
      transmission: 1,
      thickness: 1.3,
      ior: 1.52,
      dispersion: 0.35,
      attenuationColor: new THREE.Color('#FFE2B0'),
      attenuationDistance: 3,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.6,
      specularIntensity: 1,
    }),
  );
  scene.add(prism);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(pg, 30),
    new THREE.LineBasicMaterial({ color: new THREE.Color('#FFE7C4'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  prism.add(edges);
  const sprite = (color: string, s: number) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial, color: new THREE.Color(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sp.scale.set(s, s, 1);
    sp.renderOrder = 6;
    scene.add(sp);
    return sp;
  };
  const incoming = mkRay('#FFF5E4', [0.32], [1.15], false);
  const inner = mkRay('#FFE9C2', [0.3], [0.85], false, true); // seen through the glass
  const fan = FAN.map((x) => mkRay(x.c, x.main >= 0 ? [0.26] : [0.17], x.main >= 0 ? [1] : [0.6], true));
  const solid = [0, 1, 2].map((i) => mkRay(FAN[i * 6].c, [0.28], [1.05], false));
  const core = sprite(AMBER, 3.2);
  (core.material as THREE.SpriteMaterial).depthTest = false;
  core.position.set(0.05, 0.12, 0);
  const glowIn = sprite('#FFF3DD', 1.4);
  glowIn.position.copy(ENTRY);
  const glowOut = sprite(AMBER, 1.8);
  glowOut.position.copy(EXIT);
  const hits = ENDS.map((e, i) => {
    const s = sprite(FAN[i * 6].c, 1.3);
    s.position.copy(e);
    return s;
  });
  const keyOut = new THREE.PointLight(new THREE.Color(AMBER), 0, 12, 1.4);
  keyOut.position.set(EXIT.x + 0.6, EXIT.y - 0.3, 0.6);
  const keyIn = new THREE.PointLight(new THREE.Color('#FFF1DA'), 0, 8, 1.6);
  keyIn.position.set(ENTRY.x - 0.4, ENTRY.y + 0.2, 0.6);
  scene.add(keyOut, keyIn);
  // haze: motes that only exist where the light is (seeded along the beam and inside the fan)
  const N = 420;
  const base = new Float32Array(N * 3);
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < N; i++) {
    let p: THREE.Vector3;
    if (i < N * 0.35) {
      p = SRC.clone().lerp(ENTRY, rnd());
    } else {
      const a = mix(rnd(), A0 - 0.04, A2 + 0.04);
      const d = mix(Math.pow(rnd(), 0.7), 0.3, 3.6);
      p = new THREE.Vector3(EXIT.x + Math.cos(a) * d, EXIT.y + Math.sin(a) * d, 0);
    }
    base[i * 3] = p.x + (rnd() - 0.5) * 0.35;
    base[i * 3 + 1] = p.y + (rnd() - 0.5) * 0.35;
    base[i * 3 + 2] = (rnd() - 0.5) * 0.9;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({ size: 0.035, map: radial, color: new THREE.Color('#FFD89A'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  dust.renderOrder = 7;
  scene.add(dust);
  return { scene, prism, edges, core, incoming, inner, fan, solid, glowIn, glowOut, hits, pool, keyOut, keyIn, dust, dustBase: base };
};

const drawPrism = (w: PrismWorld, s: PrismState, r: THREE.WebGLRenderer, pw: number, ph: number) => {
  r.shadowMap.enabled = true;
  const cam = orbitCam(s.cam, pw / ph);
  viewPos.copy(cam.position);
  w.prism.rotation.y = s.spin * DEG;
  w.prism.rotation.x = 4 * DEG;
  placeRay(w.incoming, SRC, SRC.clone().lerp(ENTRY, s.beam), 1);
  placeRay(w.inner, ENTRY, ENTRY.clone().lerp(EXIT, s.inner), s.inner > 0 ? 1 : 0);
  const fanLen = 3.7 * s.split;
  FAN.forEach((x, i) => {
    const dir = new THREE.Vector3(Math.cos(x.a), Math.sin(x.a), 0);
    if (x.main >= 0) {
      const k = s.reach[x.main];
      const full = ENDS[x.main].distanceTo(EXIT);
      // the main ray: a fading spray until it is sent to its number, then a solid ray that ends on it
      placeRay(w.fan[i], EXIT, EXIT.clone().addScaledVector(dir, fanLen), s.split * (1 - k));
      placeRay(w.solid[x.main], EXIT, EXIT.clone().addScaledVector(dir, mix(k, Math.min(fanLen, full * 0.6), full)), k > 0 ? 1 : 0);
      const hit = w.hits[x.main];
      hit.visible = k > 0.95;
      hit.scale.setScalar(1.1 + 0.6 * clamp((1 - k) * 20));
    } else {
      placeRay(w.fan[i], EXIT, EXIT.clone().addScaledVector(dir, fanLen), s.split);
    }
  });
  (w.edges.material as THREE.LineBasicMaterial).opacity = 0.22 + 0.4 * s.inner;
  w.core.visible = s.inner > 0;
  (w.core.material as THREE.SpriteMaterial).opacity = 0.32 * s.inner;
  w.glowIn.visible = s.beam > 0.98;
  w.glowIn.scale.setScalar(1.2 + 0.8 * s.inner);
  w.glowOut.visible = s.split > 0.01;
  w.glowOut.scale.setScalar(0.6 + 1.6 * s.split);
  (w.pool.material as THREE.MeshBasicMaterial).opacity = 0.2 * s.split + 0.06 * s.inner;
  w.keyOut.intensity = 9 * s.split;
  w.keyIn.intensity = 2.5 * (s.beam > 0.98 ? 1 : 0);
  const pos = w.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i] = w.dustBase[i] + Math.sin(s.t * 0.05 + i) * 0.05;
    arr[i + 1] = w.dustBase[i + 1] + ((s.t * 0.004 + (i % 7) * 0.03) % 0.3) - 0.15;
    arr[i + 2] = w.dustBase[i + 2];
  }
  pos.needsUpdate = true;
  (w.dust.material as THREE.PointsMaterial).opacity = 0.35 * Math.max(s.split, s.beam > 0.98 ? 0.5 : 0);
  r.render(w.scene, cam);
};

const prismState = (f: number): PrismState => {
  const travel = at(f, T.hit - 6, T.settle - T.hit + 6, ease.glide);
  const pre = at(f, 0, T.hit, ease.out);
  const push = 1 - 0.035 * creep(f, T.settle, 60);
  const cam: Cam = {
    yaw: mix(travel, -36 + 4 * pre, 0),
    pitch: mix(travel, 7, NUMS_CAM.pitch),
    dist: logScale(4.5, NUMS_CAM.dist, travel) * push,
    tx: mix(Math.pow(travel, 1.2), -0.05, NUMS_CAM.tx),
    ty: mix(travel, 0.15, NUMS_CAM.ty),
  };
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  return {
    cam: { yaw: r4(cam.yaw), pitch: r4(cam.pitch), dist: r4(cam.dist), tx: r4(cam.tx), ty: r4(cam.ty) },
    beam: r4(at(f, T.send + 4, T.hit - T.send - 4, ease.in)),
    inner: r4(at(f, T.hit, 5, ease.out)),
    split: r4(at(f, T.hit + 4, 16, ease.out)),
    reach: T.nums.map((n) => r4(at(f, n - 7, 7, ease.in))),
    spin: r4(mix(at(f, 0, T.settle, ease.inOut), -8, 6)),
    t: f,
  };
};

// ---------------------------------------------------------------- 1. the prompt in macro, then light
const PROMPT = 'Why does a spinning top stay upright?';
const TYPE_AT = -14;

const Prompt: React.FC = () => {
  const f = useCurrentFrame();
  const typed = useTyped(PROMPT, TYPE_AT, 20, 3, 3);
  const squash = at(f, T.send, 6, ease.in);
  const shoot = accel(f, T.send + 5, 7, 1.6);
  const barOut = accel(f, T.send, 9, 1.5);
  const push = 1 + 0.03 * creep(f, 0, 40);
  if (f > T.hit) return null;
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      {/* the input, cropped off the right edge: a lit glass surface with the prism glinting behind it */}
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: -80,
          top: 540 - 190,
          height: 380,
          borderRadius: 56,
          background: 'linear-gradient(172deg, rgba(255,240,215,.11), rgba(255,255,255,.025) 60%)',
          boxShadow: 'inset 0 2px 0 rgba(255,214,160,.55), inset 0 0 0 1.5px rgba(255,255,255,.09), 0 50px 90px -30px rgba(0,0,0,.9)',
          transform: `translateY(${barOut * 760}px)`,
          opacity: 1 - barOut,
        }}
      />
      <div style={{ ...mono, position: 'absolute', left: 150, top: 400, fontSize: 30, color: AMBER, opacity: 1 - squash }}>Ask Lumen 2</div>
      <div style={{ position: 'absolute', left: 150, right: 170, top: 452, display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            minWidth: '100%',
            whiteSpace: 'pre',
            ...display,
            fontWeight: 520,
            fontSize: 132,
            lineHeight: 1.05,
            color: mixColor('#F4F2EE', '#FFFFFF', squash),
            transformOrigin: '0% 55%',
            transform: `translateX(${shoot * 2600}px) scaleY(${1 - 0.975 * squash}) scaleX(${1 + 0.3 * squash})`,
            textShadow: squash > 0 ? `0 0 ${30 * squash}px ${AMBER}` : undefined,
            filter: shoot > 0 ? `blur(${shoot * 10}px)` : undefined,
          }}
        >
          {typed.shown}
          <span style={{ display: 'inline-block', width: 8, height: 118, background: AMBER, marginLeft: 6, transform: 'translateY(16px)', opacity: squash > 0 ? 0 : 1 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2-3. the prism: the light splits, the rays strike the numbers
const NUMS = [
  { label: 'Math', v: 92.4, d: 1, suffix: '%' },
  { label: 'Code', v: 81.0, d: 1, suffix: '%' },
  { label: 'Context', v: 1, d: 0, suffix: 'M tokens' },
];

const NumberText: React.FC<{ i: number; x: number; y: number; color: string; glow?: string; dx?: number }> = ({ i, x, y, color, glow, dx = 0 }) => {
  const n = NUMS[i];
  return (
    <div style={{ position: 'absolute', left: x, top: y - 106, transform: `translateX(${dx}px)`, whiteSpace: 'nowrap' }}>
      <div style={{ ...mono, position: 'absolute', top: -30, left: 8, fontSize: 28, color: glow ? AMBER : color }}>{n.label}</div>
      <div style={{ ...display, fontSize: 226, lineHeight: 0.95, color, textShadow: glow }}>
        <Odometer value={n.v} decimals={n.d} start={T.nums[i]} dur={16} sep="" />
        <span style={{ fontSize: 84, letterSpacing: '-0.02em', marginLeft: 10 }}>{n.suffix}</span>
      </div>
    </div>
  );
};

const numberBox = (f: number, i: number) => {
  const cam = orbitCam(prismState(f).cam);
  const p = toPx(cam, ENDS[i]);
  return { x: p.x + 30, y: p.y };
};

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const s = prismState(f);
  const blur = mix(at(f, T.send, 12, ease.out), 14, 0);
  const dim = mix(at(f, T.send, 12, ease.out), 0.55, 1);
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ filter: blur > 0.3 ? `blur(${blur}px) brightness(${dim})` : undefined }}>
        <GLView id="lumen-prism" build={buildPrism} draw={drawPrism} state={s} width={W} height={H} ss={1} />
      </AbsoluteFill>
      {NUMS.map((n, i) => {
        const on = T.nums[i];
        if (f < on) return null;
        const { x, y } = numberBox(f, i);
        const p = at(f, on, 10, ease.out);
        const born = at(f, on, 14, ease.out);
        return <NumberText key={n.label} i={i} x={x} y={y} dx={mix(p, -40, 0)} color={mixColor(AMBER, '#F4F2EE', born)} glow={`0 0 ${mix(born, 60, 26)}px ${AMBER}55`} />;
      })}
      <Vignette amount={0.4} />
    </AbsoluteFill>
  );
};

// ================================================================ the answer: a page and a live simulation (three.js)
const L = 1.42; // the top's height (tip to stem)
type TopWorld = { scene: THREE.Scene; prec: THREE.Group; tilt: THREE.Group; spin: THREE.Group; shaft: THREE.Mesh; head: THREE.Mesh; trace: THREE.Mesh };

const topPose = (g: number) => {
  const [c1, c2, c3] = T.chunks;
  const gg = Math.min(g, T.fall + 12);
  const widen = at(g, c3, T.fall - c3, ease.inOut);
  const drop = at(g, T.fall, 12, ease.in);
  const k = g - T.fall - 12;
  const bounce = k > 0 ? Math.sin(k * 0.9) * Math.exp(-k * 0.3) * 0.07 : 0;
  const nut = 0.01 * Math.sin(g * 0.7) * (1 - drop);
  const theta = 0.22 + nut + (0.5 - 0.22) * widen + (0.8 - 0.5) * drop - bounce;
  const phi = 2.77 + 0.075 * (gg - T.answer) + 0.0017 * Math.max(0, gg - c3) ** 2;
  const psi = 0.42 * (gg - T.answer) - 0.0045 * Math.max(0, gg - c3) ** 2;
  const arrow = at(g, c1, 10, ease.out) * (1 - at(g, T.fall - 4, 8, ease.in));
  return { theta, phi, psi, arrow, trace: g >= c2 };
};
const stemAt = (g: number, len = L) => {
  const { theta, phi } = topPose(g);
  return new THREE.Vector3(-len * Math.sin(theta) * Math.cos(phi), len * Math.cos(theta), len * Math.sin(theta) * Math.sin(phi));
};
const simCam = (g: number) => {
  const a = mix(at(g, T.answer, T.iris - T.answer, ease.inOut), -0.2, 0.12);
  const d = 5.3 - 0.3 * at(g, T.chunks[1], 40, ease.inOut);
  const lx = -1.32;
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
  cam.position.set(lx + d * Math.sin(a), 2.2, d * Math.cos(a));
  cam.lookAt(lx, 1.02, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

const buildTop = (r: THREE.WebGLRenderer): TopWorld => {
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(r, AMBER);
  const profile = [
    [0, 0],
    [0.05, 0.03],
    [0.3, 0.22],
    [0.62, 0.5],
    [0.76, 0.66],
    [0.75, 0.78],
    [0.56, 0.9],
    [0.2, 0.98],
    [0.09, 1.0],
    [0.08, 1.37],
    [0.05, L],
    [0, L],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tex = canvasTex(512, 8, (g) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, 512, 8);
    g.fillStyle = '#3A2710';
    for (let i = 0; i < 3; i++) g.fillRect((i * 512) / 3, 0, 40, 8);
  });
  const top = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 120),
    new THREE.MeshPhysicalMaterial({ color: '#DDA552', metalness: 1, roughness: 0.24, map: tex, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 1.25 }),
  );
  top.castShadow = true;
  const spin = new THREE.Group();
  spin.add(top);
  const tilt = new THREE.Group();
  tilt.add(spin);
  const prec = new THREE.Group();
  prec.add(tilt);
  scene.add(prec);
  const arrowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAGE_INK) });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 12), arrowMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 24), arrowMat);
  tilt.add(shaft, head);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.26, color: new THREE.Color('#4A3112') }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const key = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 2.4);
  key.position.set(-2.5, 7, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color('#FFF6E8'), new THREE.Color('#C9A879'), 0.6));
  const trace = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(DEEP), toneMapped: false }));
  scene.add(trace);
  return { scene, prec, tilt, spin, shaft, head, trace };
};

const drawTop = (w: TopWorld, s: { g: number }, r: THREE.WebGLRenderer, pw: number, ph: number) => {
  r.shadowMap.enabled = true;
  const g = s.g;
  const p = topPose(g);
  w.prec.rotation.y = p.phi;
  w.tilt.rotation.z = p.theta;
  w.spin.rotation.y = p.psi;
  const len = 1.95 * p.arrow;
  w.shaft.visible = w.head.visible = p.arrow > 0.01;
  w.shaft.scale.set(1, Math.max(0.001, len), 1);
  w.shaft.position.y = len / 2;
  w.head.position.y = len + 0.08;
  // the trace of the stem's tip, from the moment precession is named
  const pts: THREE.Vector3[] = [];
  const g0 = T.chunks[1];
  const g1 = Math.min(g, T.fall + 12);
  for (let x = g0; x <= g1; x += 0.5) pts.push(stemAt(x));
  w.trace.geometry.dispose();
  w.trace.geometry = pts.length > 2 ? new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.016, 6, false) : new THREE.BufferGeometry();
  const cam = simCam(g);
  cam.aspect = pw / ph;
  cam.updateProjectionMatrix();
  r.render(w.scene, cam);
};

const ANSWER = [
  { b: 'Angular momentum.', t: 'The spin holds the axis steady.' },
  { b: 'Gravity becomes precession.', t: 'It turns the fall into a slow circle.' },
  { b: 'Friction wins.', t: 'Spin drops, the circle widens, it falls.' },
];
const BADGE = { x: 130, y: 258, w: 560, h: 64 };
const BADGE_C = { x: BADGE.x + BADGE.w / 2, y: BADGE.y + BADGE.h / 2 };

const pageTransform = (f: number) => {
  const p = at(f, T.answer, 24, ease.out);
  const s = logScale(3.1, 1, p) * (1 + 0.035 * creep(f, T.answer + 24, 110));
  const tx = (960 - BADGE_C.x) * (1 - p);
  const ty = (540 - BADGE_C.y) * (1 - p);
  return { s, tx, ty, p };
};
const pageToScreen = (f: number, x: number, y: number) => {
  const { s, tx, ty } = pageTransform(f);
  return { x: BADGE_C.x + (x - BADGE_C.x) * s + tx, y: BADGE_C.y + (y - BADGE_C.y) * s + ty };
};

const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const { s, tx, ty } = pageTransform(f);
  const cam = simCam(f);
  const pose = topPose(f);
  const tip = toPx(cam, stemAt(f, 1.95 * pose.arrow + 0.25));
  const stem = toPx(cam, stemAt(f));
  // the iris: the precession ring opens into the amber ground
  const ringC = toPx(cam, new THREE.Vector3(0, L * Math.cos(topPose(T.iris).theta), 0));
  const irisAt = pageToScreen(f, ringC.x, ringC.y);
  const iris = at(f, T.iris, T.lock - T.iris, ease.in);
  return (
    <AbsoluteFill style={{ background: BONE }}>
      <AbsoluteFill style={{ transformOrigin: `${BADGE_C.x}px ${BADGE_C.y}px`, transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        <GLView id="lumen-top" build={buildTop} draw={drawTop} state={{ g: f }} width={W} height={H} ss={1} />
        {/* the labels of the figure, pinned to the simulation */}
        {pose.arrow > 0.3 && (
          <div style={{ position: 'absolute', left: tip.x + 18, top: tip.y - 40, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 64, color: PAGE_INK, opacity: clamp((pose.arrow - 0.3) * 3) }}>L</div>
        )}
        {pose.trace && f < T.fall && (
          <div style={{ position: 'absolute', left: stem.x + 28, top: stem.y - 92, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 64, color: DEEP, opacity: at(f, T.chunks[1] + 4, 6) }}>Ω</div>
        )}
        <div style={{ ...mono, position: 'absolute', right: 70, bottom: 54, fontSize: 26, color: '#7A6F5E' }}>Simulation written by Lumen 2 · 240 Hz</div>
        {/* the page */}
        <div style={{ position: 'absolute', left: 130, top: 150, width: 820 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
            <span style={{ ...mono, fontSize: 26, color: '#8A7F6C' }}>You</span>
            <span style={{ fontFamily: fonts.inter, fontSize: 40, color: '#3B352C', letterSpacing: '-0.01em' }}>{PROMPT}</span>
          </div>
        </div>
        <div
          style={{
            ...mono,
            position: 'absolute',
            left: BADGE.x,
            top: BADGE.y,
            width: BADGE.w,
            height: BADGE.h,
            borderRadius: 32,
            background: AMBER,
            color: '#2A1A04',
            fontSize: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.55), 0 10px 30px -10px ${DEEP}99`,
          }}
        >
          Lumen 2 · thought for 0.9 s
        </div>
        {ANSWER.map((a, i) => {
          const c = T.chunks[i];
          if (f < c) return null;
          const q = at(f, c, 8, ease.out);
          const q2 = at(f, c + 6, 8, ease.out);
          return (
            <div key={i} style={{ position: 'absolute', left: 130, top: 380 + i * 190, width: 1060 }}>
              <div style={{ ...display, fontWeight: 640, fontSize: 68, letterSpacing: '-0.04em', color: PAGE_INK, transform: `translateY(${mix(q, 26, 0)}px)`, opacity: clamp(q * 3) }}>
                <span style={{ color: i === 1 && f < T.chunks[2] ? '#A85F00' : PAGE_INK }}>{a.b}</span>
              </div>
              <div style={{ fontFamily: fonts.inter, fontSize: 42, color: '#4A4337', marginTop: 6, transform: `translateY(${mix(q2, 20, 0)}px)`, opacity: f >= c + 6 ? clamp(q2 * 3) : 0 }}>{a.t}</div>
            </div>
          );
        })}
      </AbsoluteFill>
      {f >= T.iris && (
        <AbsoluteFill style={{ clipPath: `circle(${logScale(70, 2400, iris)}px at ${irisAt.x}px ${irisAt.y}px)` }}>
          <Lockup />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- lockup: the amber ground the ring opened (1.7 s)
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const sweep = at(f, T.lock + 8, 30, ease.inOut);
  const ring = at(f, T.lock - 14, 60, ease.out);
  const mask = `linear-gradient(100deg, transparent ${mix(sweep, -30, 100)}%, black ${mix(sweep, -18, 112)}%, transparent ${mix(sweep, -6, 124)}%)`;
  return (
    <AbsoluteFill style={{ background: AMBER, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          left: 960 - mix(ring, 900, 1250),
          top: 560 - mix(ring, 900, 1250),
          width: mix(ring, 1800, 2500),
          height: mix(ring, 1800, 2500),
          borderRadius: '50%',
          border: `4px solid ${DEEP}`,
          opacity: 0.55 * (1 - ring),
        }}
      />
      <div style={{ transform: `scale(${logScale(1.12, 1, at(f, T.word, 18, ease.out)) * (1 + 0.025 * creep(f, T.lock + 10, 40))})`, textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ ...display, fontSize: 430, lineHeight: 0.9 }}>
            <Words text="Lumen 2" start={T.word} by="char" arrive="cut" gap={1.4} style={{ color: INK }} />
          </div>
          <div style={{ ...display, fontSize: 430, lineHeight: 0.9, position: 'absolute', inset: 0, color: '#FFF6E6', WebkitMaskImage: mask, maskImage: mask, opacity: f >= T.lock + 6 ? 1 : 0 }}>Lumen 2</div>
        </div>
        <div style={{ ...mono, fontSize: 36, color: '#3A2600', marginTop: 34, opacity: f >= T.lock + 14 ? 1 : 0 }}>Available today · lumen.ai/2</div>
      </div>
    </AbsoluteFill>
  );
};

export const LumenFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const keysAt = typingTimes(PROMPT, TYPE_AT, 30, 20, 3, 3).filter((k) => k >= 0);
  const fl = numberBox(T.flood, 2);
  const cues = [
    ...[keysAt[0], keysAt[3], keysAt[keysAt.length - 1]].map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.32 + i * 0.05 })),
    { at: T.send, ...s['mixkit-3124'], volume: 0.45 },
    { at: T.send + 6, ...s['mixkit-168'], volume: 0.35 },
    { at: T.hit, ...s['mixkit-784'], volume: 0.45 },
    { at: T.hit, ...s['mixkit-2299'], volume: 0.95 },
    { at: T.hit + 6, ...s['mixkit-1492'], volume: 0.3 },
    ...T.nums.map((t, i) => ({ at: t, ...s['mixkit-2568'], volume: 0.42, rate: 0.95 + i * 0.08 })),
    ...T.nums.map((t) => ({ at: t + 3, ...s['mixkit-1049'], volume: 0.18 })),
    { at: T.flood + 4, ...s['mixkit-175'], volume: 0.4 },
    { at: T.answer + 2, ...s['mixkit-2867'], volume: 0.3 },
    ...T.chunks.map((t, i) => ({ at: t, ...s['mixkit-3000'], volume: 0.28, rate: 1 + i * 0.06 })),
    { at: T.fall + 12, ...s['mixkit-2384'], volume: 0.4 },
    { at: T.iris + 4, ...s['mixkit-168'], volume: 0.3 },
    { at: T.lock, ...s['mixkit-2299'], volume: 0.7 },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      {f < T.flood + 16 && <Stage />}
      {f < T.hit + 1 && <Prompt />}
      {f >= T.flood && f < T.answer && (
        <Flood from={{ x: fl.x + 250, y: fl.y, w: 500, h: 230, r: 40 }} start={T.flood} dur={T.answer - T.flood} color={BONE} source={<NumberText i={2} x={fl.x} y={fl.y} color={PAGE_INK} />} />
      )}
      {f >= T.answer && f < T.lock && <Answer />}
      {f >= T.lock && <Lockup />}
      <Flash start={T.hit - 2} dur={8} color="#FFF1DA" strength={0.4} />
      <Grain amount={0.045} />
      <Music src="music/wheres-hope.mp3" startFrom={7.26} volume={1} breaths={[T.hit]} breathLen={8} duck={[T.hit, T.lock]} fadeOut={36} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const lumenDuration = T.end;
