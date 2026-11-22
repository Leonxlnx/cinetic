// "Lumen 2": rework 6 of the v2 kit. ~9.5 s at 30 fps. An invented AI model launch.
// One idea: the question is light. A prompt is typed (three words, then the rest lands at once), its letters squash into
// a line of light, the line becomes the beam that strikes a real glass prism (three.js, lit by a studio environment) and
// the prism fans it into amber rays. The camera rides each ray to its impact, where a benchmark figure is born large.
// The last ray widens into the page and the answer is a live simulation the model wrote: a brass top, one claim per shot,
// each claim set on the object (the L vector pierces "Angular momentum.", "precession." runs along the ring the stem
// draws, "Friction wins." lands as the top hits the floor). The stem's tip, which drew the ring, opens the amber lockup.
// Grounds: dark stage -> bone page -> amber.
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
  fonts,
  GLView,
  Grain,
  logScale,
  mix,
  mixColor,
  Music,
  Odometer,
  shake,
  studioEnvironment,
  typingTimes,
  useTyped,
  Vignette,
  Words,
  type Ease,
} from '../../kit';
import { sfx } from '../../sfx';
import { useTextWidthSlow } from './fit';

const INK = '#07080B';
const AMBER = '#FFB547';
const DEEP = '#D9820B'; // amber that reads on bone (the trace, the ring, "precession.")
const BONE = '#F3EEE4';
const PAGE_INK = '#16130F';
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 600, letterSpacing: '-0.05em' };
// small labels: quiet sentence case in the UI face (no uppercase mono kickers)
const mono: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 560, letterSpacing: '-0.005em' };

const T = {
  send: 24, // enter: the letters squash into a line of light
  line: 31, // the line of light swings onto the beam's path
  hit: 38, // the beam strikes the prism (the music's main hit)
  fan: 54, // pulled back: the whole fan of rays
  nums: [66, 90, 114], // the camera, riding ray i, arrives with it at its impact: the figure is born
  flood: 124, // the context ray widens into the page; the simulation is already running inside it
  claims: [134, 175, 208], // "Angular momentum." / "Gravity becomes precession." / "Friction" (+ "wins." on impact)
  shotB: 166, // whip from the orbit to the macro on the stem
  widen: 192, // spin drops, the circle widens
  fall: 208,
  impact: 220, // the rim hits the floor: cut low, "wins."
  iris: 234, // the precession ring opens into amber
  word: 244,
  end: 286,
} as const;

const W = 1920;
const H = 1080;
const DEG = Math.PI / 180;

// ================================================================ cameras
type Cam = { yaw: number; pitch: number; dist: number; tx: number; ty: number; tz: number };
const orbitCam = (c: Cam, aspect = W / H, fov = 32) => {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
  const y = c.yaw * DEG;
  const p = c.pitch * DEG;
  cam.position.set(c.tx + c.dist * Math.sin(y) * Math.cos(p), c.ty + c.dist * Math.sin(p), c.tz + c.dist * Math.cos(y) * Math.cos(p));
  cam.lookAt(c.tx, c.ty, c.tz);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};
const toPx = (cam: THREE.Camera, v: THREE.Vector3) => {
  const p = v.clone().project(cam);
  return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
};
const lerpCam = (a: Cam, b: Cam, p: number): Cam => ({
  yaw: mix(p, a.yaw, b.yaw),
  pitch: mix(p, a.pitch, b.pitch),
  dist: logScale(a.dist, b.dist, p),
  tx: mix(p, a.tx, b.tx),
  ty: mix(p, a.ty, b.ty),
  tz: mix(p, a.tz, b.tz),
});
// a camera path: each key's curve shapes the travel into it; `cut` jumps on that key's frame
type CamKey = { f: number; c: Cam; curve?: Ease; cut?: boolean };
const camPath = (f: number, ks: CamKey[]): Cam => {
  if (f <= ks[0].f) return ks[0].c;
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i];
    if (f < b.f) {
      const a = ks[i - 1];
      if (b.cut) return a.c;
      return lerpCam(a.c, b.c, (b.curve ?? ease.inOut)(clamp((f - a.f) / (b.f - a.f))));
    }
  }
  return ks[ks.length - 1].c;
};
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const roundCam = (c: Cam): Cam => ({ yaw: r4(c.yaw), pitch: r4(c.pitch), dist: r4(c.dist), tx: r4(c.tx), ty: r4(c.ty), tz: r4(c.tz) });
const nearAngle = (deg: number, ref: number) => deg + 360 * Math.round((ref - deg) / 360);

// ================================================================ the prism world (three.js)
const SRC = new THREE.Vector3(-12, 3.3, 0);
const ENTRY = new THREE.Vector3(-0.56, 0.3, 0);
const EXIT = new THREE.Vector3(0.68, 0.05, 0);
const BEAM_FROM = SRC.clone().lerp(ENTRY, 0.5);
// where the three main rays strike (the figures are born there)
const ENDS = [new THREE.Vector3(4.0, 1.75, 0), new THREE.Vector3(4.6, 0.1, 0), new THREE.Vector3(4.1, -1.05, 0)];
const angleTo = (v: THREE.Vector3) => Math.atan2(v.y - EXIT.y, v.x - EXIT.x);
const A0 = angleTo(ENDS[0]);
const A1 = angleTo(ENDS[1]);
const A2 = angleTo(ENDS[2]);
const FAN = Array.from({ length: 13 }, (_, i) => {
  const a = i <= 6 ? mix(i / 6, A0, A1) : mix((i - 6) / 6, A1, A2);
  const c = i <= 6 ? mixColor('#FFF2D2', AMBER, i / 6) : mixColor(AMBER, '#FF8A2A', (i - 6) / 6);
  return { a, c, main: i === 0 ? 0 : i === 6 ? 1 : i === 12 ? 2 : -1 };
});

// the prism camera: a slow creep on the glass, a pull back to the whole fan, then it rides each ray to its impact
const C_PROMPT: Cam = { yaw: -36, pitch: 7, dist: 4.5, tx: -0.05, ty: 0.15, tz: 0 };
const C_HIT: Cam = { yaw: -31, pitch: 6.5, dist: 4.35, tx: -0.02, ty: 0.15, tz: 0 };
const C_FAN: Cam = { yaw: -15, pitch: 5, dist: 8.8, tx: 1.9, ty: 0.3, tz: 0 };
const RIDE = [
  { yaw: -26, pitch: 7, dist: 4.1 },
  { yaw: -17, pitch: 3, dist: 4.1 },
  { yaw: -31, pitch: 11, dist: 4.1 },
];
// the impact sits left of centre, the figure runs to the right of it
const ride = (i: number, p: THREE.Vector3, push = 1): Cam => {
  const r = RIDE[i];
  const off = 0.5 * (r.dist / 4.1);
  return { yaw: r.yaw, pitch: r.pitch, dist: r.dist * push, tx: p.x + off * Math.cos(r.yaw * DEG), ty: p.y + 0.02, tz: -off * Math.sin(r.yaw * DEG) };
};
const midRay = (i: number) => EXIT.clone().lerp(ENDS[i], 0.5);
const PRISM_KEYS: CamKey[] = [
  { f: 0, c: C_PROMPT },
  { f: T.hit, c: C_HIT, curve: ease.out },
  { f: T.fan, c: C_FAN, curve: ease.out },
  { f: T.nums[0], c: ride(0, ENDS[0]), curve: ease.inOut },
  { f: T.nums[0] + 10, c: ride(0, ENDS[0], 0.92), curve: ease.out },
  { f: T.nums[1] - 8, c: ride(1, midRay(1)), curve: ease.in },
  { f: T.nums[1], c: ride(1, ENDS[1]), curve: ease.out },
  { f: T.nums[1] + 10, c: ride(1, ENDS[1], 0.92), curve: ease.out },
  { f: T.nums[2] - 8, c: ride(2, midRay(2)), curve: ease.in },
  { f: T.nums[2], c: ride(2, ENDS[2]), curve: ease.out },
  { f: T.flood + 16, c: ride(2, ENDS[2], 0.86), curve: ease.out },
];

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
type PrismState = { cam: Cam; beam: number; inner: number; split: number; reach: number[]; pulse: number[]; spin: number; t: number };

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
        const grd = g.createRadialGradient(270, 150, 0, 270, 150, 280);
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
  pool.position.set(3.0, -1.44, 0.3);
  pool.scale.set(12, 4.4, 1);
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
  const incoming = mkRay('#FFF5E4', [0.32], [1.15], false, true); // drawn through the glass's near face
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
  const N = 460;
  const base = new Float32Array(N * 3);
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < N; i++) {
    let p: THREE.Vector3;
    if (i < N * 0.3) {
      p = SRC.clone().lerp(ENTRY, rnd());
    } else {
      const a = mix(rnd(), A2 - 0.04, A0 + 0.04);
      const d = mix(Math.pow(rnd(), 0.7), 0.3, 4.4);
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
  // the beam starts off-frame but in front of every camera (a ribbon through the lens would turn edge-on)
  placeRay(w.incoming, BEAM_FROM, SRC.clone().lerp(ENTRY, s.beam), s.beam > 0 ? 1 : 0);
  placeRay(w.inner, ENTRY, ENTRY.clone().lerp(EXIT, s.inner), s.inner > 0 ? 1 : 0);
  const fanLen = 4.4 * s.split;
  FAN.forEach((x, i) => {
    const dir = new THREE.Vector3(Math.cos(x.a), Math.sin(x.a), 0);
    if (x.main >= 0) {
      const k = s.reach[x.main];
      const full = ENDS[x.main].distanceTo(EXIT);
      // the main ray: a fading spray until it is sent to its figure, then a solid ray that shoots to the impact
      placeRay(w.fan[i], EXIT, EXIT.clone().addScaledVector(dir, fanLen), s.split * (1 - k));
      placeRay(w.solid[x.main], EXIT, EXIT.clone().addScaledVector(dir, full * mix(k, 0.4, 1)), k > 0 ? 1 : 0);
      const hit = w.hits[x.main];
      hit.visible = k > 0.98;
      hit.scale.setScalar(0.9 + 0.7 * s.pulse[x.main]);
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

const BEAM_HANDOFF = 0.965; // the DOM line of light ends here on the beam; the 3D beam takes over from it
const prismState = (f: number): PrismState => {
  const pre = at(f, 0, T.hit, ease.out);
  const c = camPath(f, PRISM_KEYS);
  const cam = f < T.hit ? { ...c, yaw: mix(pre, C_PROMPT.yaw, C_HIT.yaw) } : c;
  return {
    cam: roundCam(cam),
    beam: f < T.line + 4 ? 0 : r4(mix(at(f, T.line + 4, T.hit - T.line - 5, ease.out), BEAM_HANDOFF, 1)),
    inner: r4(at(f, T.hit, 5, ease.out)),
    split: r4(at(f, T.hit + 4, 16, ease.out)),
    reach: T.nums.map((n, i) => r4(at(f, n - (i === 0 ? 10 : 8), i === 0 ? 10 : 8, i === 0 ? ease.inOut : ease.out))),
    pulse: T.nums.map((n) => (f >= n ? r4(1 - at(f, n, 10, ease.out)) : 0)),
    spin: r4(mix(at(f, 0, T.fan + 20, ease.inOut), -8, 6)),
    t: f,
  };
};

// ---------------------------------------------------------------- 1. the question, then light
const PROMPT = 'Why does a spinning top stay upright?';
const TYPE_AT = -12;
const P_STYLE: React.CSSProperties = { ...display, fontWeight: 520, fontSize: 132 };
const BAR = { x: 64, y: 340, w: 1792, h: 400 };
const TEXT_X = BAR.x + 84;

// the letters squash into a line of light, left to right; the line swings onto the beam's path and hands over to it
const Prompt: React.FC = () => {
  const f = useCurrentFrame();
  const w132 = useTextWidthSlow(PROMPT, P_STYLE);
  // fit the question inside its own bar (only the frame edge may crop, never the box)
  const size = w132 > 0 ? Math.min(132, (132 * (BAR.w - 84 * 2 - 24)) / w132) : 110;
  const width = w132 > 0 ? (w132 * size) / 132 : 1500;
  const typed = useTyped(PROMPT, TYPE_AT, 20, 3, 3);
  const barOut = accel(f, T.send, 9, 1.5);
  const push = 1 + 0.06 * creep(f, 0, 34);
  const textTop = 548 - size * 0.52;
  const sx = (x: number) => 960 + (x - 960) * push;
  const sy = (y: number) => 540 + (y - 540) * push;
  if (f > T.hit) return null;
  // the line of light: from the squashed text to the beam's path in the prism camera
  const cam = orbitCam(prismState(f).cam);
  const b = toPx(cam, SRC.clone().lerp(ENTRY, BEAM_HANDOFF));
  const a0 = toPx(cam, SRC.clone().lerp(ENTRY, 0.7));
  const dx = b.x - a0.x;
  const dy = b.y - a0.y;
  const dl = Math.hypot(dx, dy) || 1;
  const a = { x: b.x - (dx / dl) * 3200, y: b.y - (dy / dl) * 3200 };
  const m = at(f, T.line, 4, ease.inOut);
  const lineY = sy(textTop + size * 0.56);
  const L0 = { x: mix(m, sx(TEXT_X), a.x), y: mix(m, lineY, a.y) };
  const L1 = { x: mix(m, sx(TEXT_X + width), b.x), y: mix(m, lineY, b.y) };
  const lineOn = f >= T.line && f < T.line + 7;
  const lineFade = 1 - at(f, T.line + 4, 3, ease.in);
  const len = Math.hypot(L1.x - L0.x, L1.y - L0.y);
  const ang = Math.atan2(L1.y - L0.y, L1.x - L0.x);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {/* the input: a lit glass surface with the prism glinting behind it; the question fits inside it */}
        <div
          style={{
            position: 'absolute',
            left: BAR.x,
            top: BAR.y,
            width: BAR.w,
            height: BAR.h,
            borderRadius: 56,
            background: 'linear-gradient(172deg, rgba(255,240,215,.11), rgba(255,255,255,.025) 60%)',
            boxShadow: 'inset 0 2px 0 rgba(255,214,160,.55), inset 0 0 0 1.5px rgba(255,255,255,.09), 0 50px 90px -30px rgba(0,0,0,.9)',
            transform: `translateY(${barOut * 760}px)`,
            opacity: 1 - barOut,
          }}
        />
        <div style={{ ...mono, position: 'absolute', left: TEXT_X + 4, top: textTop - 58, fontSize: 32, color: AMBER, opacity: 1 - at(f, T.send, 5) }}>Ask Lumen 2</div>
        {f < T.line + 1 && (
          <div style={{ position: 'absolute', left: TEXT_X, top: textTop, whiteSpace: 'pre', ...P_STYLE, fontSize: size, lineHeight: 1.12 }}>
            {typed.shown.split('').map((ch, i) => {
              const q = at(f, T.send + i * 0.06, 5, ease.in);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    color: mixColor('#F4F2EE', '#FFF6E2', q),
                    transformOrigin: '50% 56%',
                    transform: `scaleY(${1 - 0.97 * q})`,
                    textShadow: q > 0 ? `0 0 ${34 * q}px ${AMBER}` : undefined,
                  }}
                >
                  {ch}
                </span>
              );
            })}
            <span style={{ display: 'inline-block', width: 8, height: size * 0.88, background: AMBER, marginLeft: 6, transform: `translateY(${size * 0.12}px)`, opacity: f >= T.send ? 0 : 1 }} />
          </div>
        )}
      </AbsoluteFill>
      {lineOn && (
        <div
          style={{
            position: 'absolute',
            left: L0.x,
            top: L0.y - 4,
            width: len,
            height: 8,
            borderRadius: 4,
            transformOrigin: '0 50%',
            transform: `rotate(${ang}rad)`,
            background: 'linear-gradient(90deg, rgba(255,246,226,.0), #FFF6E2 30%, #FFFFFF)',
            boxShadow: `0 0 26px 8px ${AMBER}AA, 0 0 70px 20px ${AMBER}55`,
            opacity: lineFade,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. the prism: the camera rides each ray to its figure
const NUMS = [
  { label: 'Math', v: 92.4, d: 1, suffix: '%' },
  { label: 'Code', v: 81.0, d: 1, suffix: '%' },
  { label: 'Context', v: 1, d: 0, suffix: 'M tokens' },
];
const NUM_SIZE = 380;

const NumberText: React.FC<{ i: number; x: number; y: number; size: number; color: string; glow?: string; scale?: number }> = ({ i, x, y, size, color, glow, scale = 1 }) => {
  const n = NUMS[i];
  return (
    <div style={{ position: 'absolute', left: x, top: y - size * 0.5, transformOrigin: '0% 50%', transform: `scale(${scale})`, whiteSpace: 'nowrap' }}>
      <div style={{ ...mono, position: 'absolute', top: -size * 0.13, left: size * 0.04, fontSize: Math.max(30, size * 0.125), color: AMBER }}>{n.label}</div>
      <div style={{ ...display, fontSize: size, lineHeight: 0.95, color, textShadow: glow }}>
        <Odometer value={n.v} decimals={n.d} start={T.nums[i]} dur={11} sep="" />
        <span style={{ fontSize: size * 0.36, letterSpacing: '-0.02em', marginLeft: size * 0.04 }}>{n.suffix}</span>
      </div>
    </div>
  );
};

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const s = prismState(f);
  const cam = orbitCam(s.cam);
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
        const p = toPx(cam, ENDS[i]);
        // born at the impact, sized by the camera's distance (it rides away with the world)
        const size = NUM_SIZE * (RIDE[i].dist / cam.position.distanceTo(ENDS[i]));
        const born = at(f, on, 14, ease.out);
        return (
          <NumberText
            key={n.label}
            i={i}
            x={p.x + size * 0.1}
            y={p.y}
            size={size}
            scale={mix(at(f, on, 10, ease.out), 1.22, 1)}
            color={mixColor(AMBER, '#F7F3EC', born)}
            glow={`0 0 ${mix(born, 70, 30)}px ${AMBER}66`}
          />
        );
      })}
      <Vignette amount={0.4} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the seam: the context ray widens into the page
const bandAt = (f: number) => {
  const cam = orbitCam(prismState(f).cam);
  const a = toPx(cam, EXIT);
  const b = toPx(cam, ENDS[2]);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const p = at(f, T.flood, 14, ease.glide);
  return { c: b, ang, hw: logScale(14, 1500, p), p };
};
const bandPoly = (c: { x: number; y: number }, ang: number, hw: number) => {
  const u = { x: Math.cos(ang), y: Math.sin(ang) };
  const n = { x: -u.y, y: u.x };
  const pts = [
    [c.x - u.x * 4000 + n.x * hw, c.y - u.y * 4000 + n.y * hw],
    [c.x + u.x * 4000 + n.x * hw, c.y + u.y * 4000 + n.y * hw],
    [c.x + u.x * 4000 - n.x * hw, c.y + u.y * 4000 - n.y * hw],
    [c.x - u.x * 4000 - n.x * hw, c.y - u.y * 4000 - n.y * hw],
  ];
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;
};
const BandGlow: React.FC<{ c: { x: number; y: number }; ang: number; hw: number }> = ({ c, ang, hw }) => {
  const h = hw * 2 + 160;
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x - 4000,
        top: c.y - h / 2,
        width: 8000,
        height: h,
        transformOrigin: '50% 50%',
        transform: `rotate(${ang}rad)`,
        background: `linear-gradient(180deg, rgba(255,181,71,0), rgba(255,200,120,.55) ${(60 / h) * 100}%, #FFF4E0 ${(80 / h) * 100}%, #FFF4E0 ${100 - (80 / h) * 100}%, rgba(255,200,120,.55) ${100 - (60 / h) * 100}%, rgba(255,181,71,0))`,
        filter: 'blur(10px)',
      }}
    />
  );
};

// ================================================================ the answer: a live simulation, one claim per shot (three.js)
const L = 1.42; // the top's height (tip to stem)
type TopWorld = { scene: THREE.Scene; prec: THREE.Group; tilt: THREE.Group; spin: THREE.Group; shaft: THREE.Mesh; head: THREE.Mesh; trace: THREE.Mesh };

const topPose = (g: number) => {
  const gg = Math.min(g, T.impact);
  const widen = at(g, T.widen, T.fall - T.widen, ease.inOut);
  const drop = at(g, T.fall, T.impact - T.fall, ease.in);
  const k = g - T.impact;
  const bounce = k > 0 ? Math.sin(k * 0.9) * Math.exp(-k * 0.3) * 0.07 : 0;
  const nut = 0.01 * Math.sin(g * 0.7) * (1 - drop);
  const theta = 0.2 + nut + (0.48 - 0.2) * widen + (0.8 - 0.48) * drop - bounce;
  const phi = 2.77 + 0.1 * (gg - T.flood) + 0.002 * Math.max(0, gg - T.widen) ** 2;
  const psi = 0.42 * (gg - T.flood) - 0.004 * Math.max(0, gg - T.widen) ** 2;
  const arrow = at(g, T.claims[0] - 2, 10, ease.out) * (1 - at(g, T.shotB - 2, 6, ease.in));
  return { theta, phi, psi, arrow };
};
const axisAt = (theta: number, phi: number, len: number) => new THREE.Vector3(-len * Math.sin(theta) * Math.cos(phi), len * Math.cos(theta), len * Math.sin(theta) * Math.sin(phi));
const stemAt = (g: number, len = L) => {
  const { theta, phi } = topPose(g);
  return axisAt(theta, phi, len);
};

// the cameras of the answer: an orbit with the L vector, a macro on the stem, a follow of the fall, a cut low on impact
const REST = topPose(T.impact + 30);
const FALLEN = axisAt(REST.theta, REST.phi, 0.55);
// the direction the top leans as it falls (the yaw a camera would need to look straight down its stem)
const YAW_AXIS = Math.atan2(-Math.cos(REST.phi), Math.sin(REST.phi)) / DEG;
const YAW_FOLLOW = nearAngle(YAW_AXIS + 90, 40); // side on: it falls across the frame
const YAW_LOW = nearAngle(YAW_AXIS - 50, YAW_FOLLOW); // three-quarter on its lit crown, from the key light's side
const B_MID_YAW = 17;
const ANSWER_KEYS: CamKey[] = [
  { f: T.flood, c: { yaw: -52, pitch: 9, dist: 3.75, tx: 0, ty: 0.74, tz: 0 } },
  { f: T.shotB, c: { yaw: -16, pitch: 7, dist: 3.3, tx: 0, ty: 0.74, tz: 0 }, curve: ease.out },
  { f: T.shotB + 8, c: { yaw: 6, pitch: 15, dist: 2.55, tx: 0, ty: 1.3, tz: 0 }, curve: ease.inOut },
  { f: T.widen + 8, c: { yaw: 28, pitch: 12, dist: 2.4, tx: 0, ty: 1.28, tz: 0 }, curve: ease.out },
  { f: T.fall, c: { yaw: YAW_FOLLOW - 12, pitch: 9, dist: 3.7, tx: FALLEN.x * 0.4, ty: 0.62, tz: FALLEN.z * 0.4 }, curve: ease.inOut },
  { f: T.impact, c: { yaw: YAW_FOLLOW, pitch: 7, dist: 3.9, tx: FALLEN.x, ty: 0.3, tz: FALLEN.z }, curve: ease.in },
  { f: T.impact, c: { yaw: YAW_LOW, pitch: 16, dist: 4.1, tx: FALLEN.x, ty: 0.3, tz: FALLEN.z }, cut: true },
  { f: T.end, c: { yaw: YAW_LOW - 10, pitch: 13, dist: 3.7, tx: FALLEN.x, ty: 0.3, tz: FALLEN.z }, curve: ease.out },
];
const answerCam = (g: number) => roundCam(camPath(g, ANSWER_KEYS));
const simCam = (c: Cam, aspect = W / H) => orbitCam(c, aspect, 30);

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
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 12), arrowMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 24), arrowMat);
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

const TRACE_FROM = T.shotB - 4;
const drawTop = (w: TopWorld, s: { g: number; cam: Cam }, r: THREE.WebGLRenderer, pw: number, ph: number) => {
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
  w.head.position.y = len + 0.1;
  // the trace of the stem's tip: the precession ring, drawn from the macro on the stem
  const pts: THREE.Vector3[] = [];
  const g1 = Math.min(g, T.impact);
  for (let x = TRACE_FROM; x <= g1; x += 0.5) pts.push(stemAt(x));
  w.trace.geometry.dispose();
  w.trace.geometry = pts.length > 2 ? new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.015, 6, false) : new THREE.BufferGeometry();
  r.render(w.scene, simCam(s.cam, pw / ph));
};

// the back half of a ring around the top's axis, as a screen path (left to right): type set along the precession
const arcPath = (cam: THREE.Camera, R: number, h: number, centre: number, span: number) => {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = centre - span + (2 * span * i) / 48;
    pts.push(toPx(cam, new THREE.Vector3(R * Math.cos(a), h, R * Math.sin(a))));
  }
  if (pts[0].x > pts[pts.length - 1].x) pts.reverse();
  return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;
};
// the far side of the ring for the macro's mean camera, fixed in the world (the type turns with the world, not the frame)
const PHI_FAR = Math.atan2(Math.cos(B_MID_YAW * DEG), Math.sin(B_MID_YAW * DEG)) + Math.PI;

const claimLeave = (f: number, start: number) => {
  const q = accel(f, start, 8, 1.5);
  return { transform: `translateY(${-q * 700}px)`, filter: q > 0.05 ? `blur(${q * 14}px)` : undefined, opacity: 1 - q * 0.6 };
};

const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const c = answerCam(f);
  const cam = simCam(c);
  const pose = topPose(f);
  const tip = toPx(cam, stemAt(f, 1.95 * pose.arrow + 0.3));
  const inA = f < T.shotB + 8;
  const inB = f >= T.shotB && f < T.widen + 13;
  const inC = f >= T.fall - 2;
  // the iris: the stem's tip, the point that drew the precession ring, opens into the amber ground
  const ringC = toPx(cam, stemAt(f));
  const iris = at(f, T.iris, T.word - T.iris, ease.in);
  const arcId = `lumen-arc-${f}`;
  const slide = at(f, T.claims[1] + 3, 12, ease.out);
  return (
    <AbsoluteFill style={{ background: BONE }}>
      <AbsoluteFill style={{ transform: shake(f, T.impact, 8, 9) }}>
        {/* behind the object: the claims of the orbit and the macro (the top and the L vector pass in front of them) */}
        {inA && (
          <div style={{ position: 'absolute', left: 0, width: W, top: 58, textAlign: 'center', ...claimLeave(f, T.shotB - 2) }}>
            <div style={{ ...display, fontSize: 204, lineHeight: 1, transform: `translateX(${mix(at(f, T.flood, T.shotB - T.flood, ease.out), 50, -40)}px)` }}>
              <Words text="Angular momentum." start={T.claims[0]} arrive="rise" gap={4} style={{ color: PAGE_INK }} />
            </div>
          </div>
        )}
        {inB && (
          <AbsoluteFill style={claimLeave(f, T.widen + 4)}>
            <div style={{ position: 'absolute', left: 0, width: W, top: 34, textAlign: 'center', ...display, fontSize: 184, lineHeight: 1 }}>
              <Words text="Gravity becomes" start={T.claims[1]} arrive="rise" gap={4} style={{ color: PAGE_INK }} />
            </div>
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
              <defs>
                <path id={arcId} d={arcPath(cam, 1.2, 1.32, PHI_FAR, 1.35)} />
              </defs>
              <text fill={DEEP} style={{ ...display, fontSize: 236, letterSpacing: '-0.045em' }} opacity={clamp(slide * 4)}>
                <textPath href={`#${arcId}`} startOffset={`${mix(slide, 82, 50)}%`} textAnchor="middle">
                  precession.
                </textPath>
              </text>
            </svg>
          </AbsoluteFill>
        )}
        <GLView id="lumen-top" build={buildTop} draw={drawTop} state={{ g: f, cam: c }} width={W} height={H} ss={1} />
        {/* on the object: the vector's name at its tip */}
        {pose.arrow > 0.3 && tip.y > 30 && (
          <div style={{ position: 'absolute', left: tip.x + 22, top: tip.y - 30, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 92, color: PAGE_INK, opacity: clamp((pose.arrow - 0.3) * 3) }}>L</div>
        )}
        {/* the fall: "Friction" as it tips, "wins." on the impact, in front of the floor */}
        {inC && (
          <div style={{ position: 'absolute', left: 0, width: W, top: 764, textAlign: 'center', ...display, fontSize: 260, lineHeight: 1 }}>
            <Words text="Friction wins." times={[T.claims[2], T.impact]} arrive="rise" style={{ color: PAGE_INK }} />
          </div>
        )}
      </AbsoluteFill>
      {f >= T.iris && (
        <AbsoluteFill style={{ clipPath: `circle(${logScale(60, 2400, iris)}px at ${ringC.x}px ${ringC.y}px)` }}>
          <Lockup />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- lockup: the amber ground the ring opened (1.6 s)
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const sweep = at(f, T.word + 8, 28, ease.inOut);
  const ring = at(f, T.iris, 50, ease.out);
  const mask = `linear-gradient(100deg, transparent ${mix(sweep, -30, 100)}%, black ${mix(sweep, -18, 112)}%, transparent ${mix(sweep, -6, 124)}%)`;
  return (
    <AbsoluteFill style={{ background: AMBER, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          left: 960 - mix(ring, 700, 1250),
          top: 560 - mix(ring, 700, 1250),
          width: mix(ring, 1400, 2500),
          height: mix(ring, 1400, 2500),
          borderRadius: '50%',
          border: `4px solid ${DEEP}`,
          opacity: 0.55 * (1 - ring),
        }}
      />
      <div style={{ transform: `scale(${logScale(1.12, 1, at(f, T.word, 18, ease.out)) * (1 + 0.025 * creep(f, T.word + 10, 40))})`, textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ ...display, fontSize: 430, lineHeight: 0.9 }}>
            <Words text="Lumen 2" start={T.word} by="char" arrive="cut" gap={1.4} style={{ color: INK }} />
          </div>
          <div style={{ ...display, fontSize: 430, lineHeight: 0.9, position: 'absolute', inset: 0, color: '#FFF6E6', WebkitMaskImage: mask, maskImage: mask, opacity: f >= T.word + 6 ? 1 : 0 }}>Lumen 2</div>
        </div>
        <div style={{ ...mono, fontSize: 36, color: '#3A2600', marginTop: 34, opacity: f >= T.word + 12 ? 1 : 0 }}>Available today · lumen.ai/2</div>
      </div>
    </AbsoluteFill>
  );
};

export const LumenFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const keysAt = typingTimes(PROMPT, TYPE_AT, 30, 20, 3, 3).filter((k) => k >= 0);
  const band = f >= T.flood && f < T.flood + 16 ? bandAt(f) : null;
  const cues = [
    ...[keysAt[0], keysAt[3], keysAt[keysAt.length - 1]].map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.32 + i * 0.05 })),
    { at: T.send, ...s['mixkit-3124'], volume: 0.45 },
    { at: T.line, ...s['mixkit-168'], volume: 0.35 },
    { at: T.hit, ...s['mixkit-784'], volume: 0.45 },
    { at: T.hit, ...s['mixkit-2299'], volume: 0.95 },
    { at: T.hit + 6, ...s['mixkit-1492'], volume: 0.3 },
    ...T.nums.map((t, i) => ({ at: t, ...s['mixkit-2568'], volume: 0.42, rate: 0.95 + i * 0.08 })),
    ...T.nums.map((t) => ({ at: t + 3, ...s['mixkit-1049'], volume: 0.18 })),
    ...[T.nums[1] - 8, T.nums[2] - 8].map((t) => ({ at: t + 3, ...s['mixkit-175'], volume: 0.22 })),
    { at: T.flood + 6, ...s['mixkit-175'], volume: 0.4 },
    ...T.claims.map((t, i) => ({ at: t, ...s['mixkit-3000'], volume: 0.28, rate: 1 + i * 0.06 })),
    { at: T.shotB + 4, ...s['mixkit-168'], volume: 0.25 },
    { at: T.impact, ...s['mixkit-2384'], volume: 0.45 },
    { at: T.impact, ...s['mixkit-2299'], volume: 0.4 },
    { at: T.iris + 4, ...s['mixkit-168'], volume: 0.3 },
    { at: T.word, ...s['mixkit-2299'], volume: 0.7 },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      {f < T.flood + 16 && <Stage />}
      {f < T.hit + 1 && <Prompt />}
      {band && <BandGlow c={band.c} ang={band.ang} hw={band.hw} />}
      {band && band.hw * 0.85 - 160 > 0 && (
        <AbsoluteFill style={{ clipPath: bandPoly(band.c, band.ang, band.hw * 0.85 - 160), opacity: clamp((band.hw * 0.85 - 160) / 260) }}>
          <Answer />
        </AbsoluteFill>
      )}
      {f >= T.flood + 16 && f < T.word && <Answer />}
      {f >= T.word && <Lockup />}
      <Flash start={T.hit - 2} dur={8} color="#FFF1DA" strength={0.4} />
      <Grain amount={0.045} />
      <Music src="music/wheres-hope.mp3" startFrom={7.46} volume={1} breaths={[T.hit]} breathLen={8} duck={[T.hit, T.word]} fadeOut={36} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const lumenDuration = T.end;
