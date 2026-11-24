// "Lumen 2": an invented AI model launch. 9.5 s at 30 fps.
// One world: a dark stage, shaped light and glass. The ground is a deep oxblood (#2A0A12), a deep tone of the light's own
// red, with one broad bloom of its own hue and nothing else (no floor, no grain, no vignette). The accent is a rose-red
// light (#FF4A61; the product is a model that turns a question into light, so its one colour is the light itself), one
// gradient token for every ray (blush -> rose -> a deeper red), pale rose-white type. One material: frosted glass under
// `softStudio` (a soft room and a soft key from the upper left), the prism and the spinning top alike, with a baked soft
// contact shadow. One voice: Inter, statements at 510, the figures and the wordmark at 600.
//
// Concept: a conversation, because the model's whole job is to answer a question, and the film is one question and its
// answer (asked in a solid input bar, answered as a live simulation that explains itself); rejected: the number (the
// three benchmarks are proof inside the answer, not a story the brief can carry alone), one task, start to finish (the
// concept of every other worked film)
//
// Devices (Lumen 2, a model; the claim: it understands, and shows you why)
// - signature: light. The question's letters squash into a line of light, the line becomes the beam that strikes the
//   glass prism, the rays carry the figures, the last ray widens into the answer, and the ring the top's stem draws
//   becomes the ring of the mark
// - opening: the question already being typed in a solid lit bar, two words typed, the rest landing at once
// - text arrivals: cut-on (the typed question, the wordmark's letters); a rise per word (every statement)
// - type treatment: type said by the object: each claim of the answer sits beside the thing it names (the L vector's
//   name at its tip, "precession." over the ring being drawn, "wins." on the impact)
// - the light changes: the beam strikes (flash, HIT 38) | the fan pulls back | the camera rides each ray to its figure |
//   the context ray widens into the answer (a band of light, the seam) | the camera tilts up off the fallen top, the ring stays
// - spectacle: hero object in light, the beam splitting in the prism and the camera riding three rays, 2.9 s
// - output-big: the three figures born at 250 px at each ray's impact, one at a time, whole, the name under each
// - ending: the ring the stem drew stays as the world falls away, turns to the light, slides into place and closes
//   round the version: "Lumen" cut on beside it, "Available today" under it (no URL, no separate glyph)
//
// BEATS (frames, composition tag, what the viewer sees; how it hands off)
//  1   0-24  full-ui      the solid input bar, centred on the stage, the prism defocused far behind it; the question
//                         types ("Why does a spinning top stay upright?"), the send button presses
//  2  24-38  macro        the letters squash left to right into a line of light, the bar drops away; the line swings
//                         onto the beam's path and becomes the beam                                  (HIT 38)
//  3  38-62  object       the beam strikes the frosted prism: a flash, the fan of rose rays opens, the camera pulls back
//  4  62-130 output-big   the spray goes out; the camera rides one solid ray at a time to its impact, where a figure is
//                         born and counts on twos: 92.4 % Math, 81.0 % Code, 1M tokens Context; each figure is cut
//                         away on the camera's move to the next ray                                  (spectacle)
//  5 130-146 ground       the context ray widens into a band of light; inside it the answer is already running
//  6 146-170 statement    the glass top spinning with its L vector; "Angular momentum." under it
//  7 170-214 macro        a whip to the stem: its tip draws a clean ring; "Gravity becomes precession." above it
//  8 214-240 object       the top tips and falls out of its ring, the camera follows; "Friction" as it tips, "wins."
//                         on the impact (a low cut, a short shake)
//  9 240-286 lockup       the camera tilts up off the fallen top, the ring stays; the ring turns rose, slides into place and shrinks round
//                         the "2" while "Lumen" cuts on beside it, the tip riding the ring as a dot
//
// Music: wheres-hope.mp3 from 7.46 s, its lift on the beam's strike (frame 38).
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
  Ground,
  Icon,
  liftColor,
  logScale,
  mix,
  mixColor,
  Music,
  shake,
  softShadow,
  softStudio,
  typingTimes,
  useTyped,
  Words,
  type Ease,
} from '../../kit';
import { sfx } from '../../sfx';
import { useTextWidthSlow } from './fit';

// ================================================================ world
const OX = '#2A0A12'; // the stage: a deep tone of the light's own red
const ROSE = '#FF4A61'; // the light (the accent)
const BLUSH = '#FFD9DF'; // a light core of the same hue
const PALE = '#FFF4F5'; // type on the stage
const MUTED = '#E9AFB9'; // a needed label on the stage
// the answer plays on the same stage (a warm-white daylight page was tried and lost: the glass went grey and plastic)
const PAGE = OX;
const PAGE_INK = PALE;
const RING_INK = PALE;
const EMPH = ROSE;

// one sans voice (Inter): statements at 500-520, the figures and the wordmark at 600-620
const display: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 510, letterSpacing: '-0.025em' };
const stat: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 600, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' };
const label: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 500, letterSpacing: '-0.005em' };

const T = {
  send: 24, // enter: the letters squash into a line of light
  line: 31, // the line of light swings onto the beam's path
  hit: 38, // the beam strikes the prism (the music's main hit)
  fan: 54, // pulled back: the whole fan of rays
  nums: [66, 93, 120], // the camera, riding ray i, arrives with it at its impact: the figure is born
  flood: 130, // the context ray widens into the page; the simulation is already running inside it
  claims: [138, 176, 214], // "Angular momentum." / "Gravity becomes precession." / "Friction" (+ "wins." on impact)
  shotB: 170, // whip from the orbit to the macro on the stem
  widen: 196, // spin drops, the circle widens
  fall: 214,
  impact: 226, // the rim hits the floor: cut low, "wins."
  iris: 240, // the ring the stem drew opens into the stage again
  word: 250,
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

const canvasTex = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d') as CanvasRenderingContext2D);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
// an opaque backdrop with one broad bloom that falls to exactly the ground's colour (opaque, so glass refracts it)
const bloomTex = (ground: string, centre: string) =>
  canvasTex(1024, 1024, (g) => {
    const grd = g.createRadialGradient(512, 512, 0, 512, 512, 512);
    grd.addColorStop(0, centre);
    grd.addColorStop(0.35, mixColor(centre, ground, 0.5));
    grd.addColorStop(0.75, ground);
    grd.addColorStop(1, ground);
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 1024);
    // an invisible dither against banding on a deep, slow gradient (seeded: the same every frame)
    const img = g.getImageData(0, 0, 1024, 1024);
    let seed = 7;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const n = (seed / 2147483647 - 0.5) * 3;
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
    }
    g.putImageData(img, 0, 0);
  });

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
// one gradient token for every ray: blush -> rose -> a deeper red
const FAN = Array.from({ length: 7 }, (_, i) => {
  const a = i <= 3 ? mix(i / 3, A0, A1) : mix((i - 3) / 3, A1, A2);
  const c = i <= 3 ? mixColor(BLUSH, ROSE, i / 3) : mixColor(ROSE, '#E8203B', (i - 3) / 3);
  return { a, c, main: i === 0 ? 0 : i === 3 ? 1 : i === 6 ? 2 : -1 };
});

// the prism camera: a slow creep on the glass, a pull back to the whole fan, then it rides each ray to its impact
const C_PROMPT: Cam = { yaw: -36, pitch: 7, dist: 6.2, tx: -0.05, ty: 0.15, tz: 0 };
const C_HIT: Cam = { yaw: -31, pitch: 6.5, dist: 5.6, tx: -0.02, ty: 0.15, tz: 0 };
const C_FAN: Cam = { yaw: -15, pitch: 5, dist: 8.8, tx: 1.9, ty: 0.3, tz: 0 };
const RIDE = [
  { yaw: -26, pitch: 7, dist: 4.1 },
  { yaw: -17, pitch: 3, dist: 4.1 },
  { yaw: -31, pitch: 11, dist: 4.1 },
];
// the impact sits left of centre, the figure runs to the right of it
const ride = (i: number, p: THREE.Vector3, push = 1): Cam => {
  const r = RIDE[i];
  const off = 0.62 * (r.dist / 4.1);
  return { yaw: r.yaw, pitch: r.pitch, dist: r.dist * push, tx: p.x + off * Math.cos(r.yaw * DEG), ty: p.y + 0.02, tz: -off * Math.sin(r.yaw * DEG) };
};
const midRay = (i: number) => EXIT.clone().lerp(ENDS[i], 0.5);
const PRISM_KEYS: CamKey[] = [
  { f: 0, c: C_PROMPT },
  { f: T.hit, c: C_HIT, curve: ease.out },
  { f: T.fan, c: C_FAN, curve: ease.out },
  { f: T.nums[0], c: ride(0, ENDS[0]), curve: ease.inOut },
  { f: T.nums[0] + 10, c: ride(0, ENDS[0], 0.94), curve: ease.out },
  { f: T.nums[1] - 8, c: ride(1, midRay(1)), curve: ease.in },
  { f: T.nums[1], c: ride(1, ENDS[1]), curve: ease.out },
  { f: T.nums[1] + 10, c: ride(1, ENDS[1], 0.94), curve: ease.out },
  { f: T.nums[2] - 8, c: ride(2, midRay(2)), curve: ease.in },
  { f: T.nums[2], c: ride(2, ENDS[2]), curve: ease.out },
  { f: T.flood + 16, c: ride(2, ENDS[2], 0.88), curve: ease.out },
];

type Ray = { mesh: THREE.Mesh; radius: number; op: number };
type PrismWorld = {
  scene: THREE.Scene;
  prism: THREE.Mesh;
  core: THREE.Sprite;
  incoming: Ray;
  inner: Ray;
  fan: Ray[];
  solid: Ray[];
  glowOut: THREE.Sprite;
  hits: THREE.Sprite[];
};
type PrismState = { cam: Cam; beam: number; inner: number; split: number; reach: number[]; pulse: number[]; spin: number };

// rays are ribbons that turn about their own axis to face the lens, textured with a soft profile of light
const viewPos = new THREE.Vector3();
const placeRay = (ray: Ray, a: THREE.Vector3, b: THREE.Vector3, k: number) => {
  const m = ray.mesh;
  const d = b.clone().sub(a);
  const len = d.length();
  m.visible = len > 1e-3 && k > 0.002;
  if (!m.visible) return;
  const mid = a.clone().addScaledVector(d, 0.5);
  const y = d.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, viewPos.clone().sub(mid)).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  m.matrixAutoUpdate = false;
  m.matrix.makeBasis(x.multiplyScalar(ray.radius * 2), y.multiplyScalar(len), z).setPosition(mid);
  m.matrixWorldNeedsUpdate = true;
  (m.material as THREE.MeshBasicMaterial).opacity = ray.op * k;
};
const profileTex = (faded: boolean) => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const img = g.createImageData(64, 128);
  for (let yy = 0; yy < 128; yy++) {
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

const PRISM_EXPOSURE = 1;
const buildPrism = (r: THREE.WebGLRenderer): PrismWorld => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(OX);
  softStudio(r, scene, { intensity: 0.5, key: 0.8, exposure: PRISM_EXPOSURE });
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
  const mkRay = (color: string, radius: number, op: number, faded: boolean, through = false): Ray => {
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
    return { mesh: m, radius, op };
  };
  // the stage: no floor, one far backdrop with one broad bloom of the stage's own red (the glass has something to bend)
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ toneMapped: false, map: bloomTex(OX, liftColor(OX, 0.1, ROSE)) }));
  wall.position.set(2, 1, -12);
  scene.add(wall);
  // the prism: a triangular glass solid with soft rounded edges, frosted a little (no edge lines)
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.25);
  shape.lineTo(-1.08, -0.625);
  shape.lineTo(1.08, -0.625);
  shape.closePath();
  const pg = new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 8, steps: 1, curveSegments: 4 });
  pg.translate(0, 0, -0.7);
  const prism = new THREE.Mesh(
    pg,
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      metalness: 0,
      roughness: 0.16,
      transmission: 1,
      thickness: 1.3,
      ior: 1.5,
      attenuationColor: new THREE.Color('#FFD3DA'),
      attenuationDistance: 2.5,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.1,
      specularIntensity: 1,
    }),
  );
  scene.add(prism);
  const sprite = (color: string, s: number) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial, color: new THREE.Color(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sp.scale.set(s, s, 1);
    sp.renderOrder = 6;
    scene.add(sp);
    return sp;
  };
  const incoming = mkRay('#FFF1F3', 0.16, 1.1, false, true); // drawn through the glass's near face
  const inner = mkRay(BLUSH, 0.15, 0.8, false, true); // seen through the glass
  const fan = FAN.map((x) => mkRay(x.c, x.main >= 0 ? 0.13 : 0.09, x.main >= 0 ? 1 : 0.6, true));
  const solid = [0, 1, 2].map((i) => mkRay(FAN[i * 3].c, 0.14, 1.05, false));
  const core = sprite(ROSE, 3.0);
  (core.material as THREE.SpriteMaterial).depthTest = false;
  core.position.set(0.05, 0.12, 0);
  const glowOut = sprite(ROSE, 1.8);
  glowOut.position.copy(EXIT);
  const hits = ENDS.map((e, i) => {
    const s = sprite(FAN[i * 3].c, 1.2);
    s.position.copy(e);
    return s;
  });
  return { scene, prism, core, incoming, inner, fan, solid, glowOut, hits };
};

const drawPrism = (w: PrismWorld, s: PrismState, r: THREE.WebGLRenderer, pw: number, ph: number) => {
  r.shadowMap.enabled = false;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = PRISM_EXPOSURE;
  const cam = orbitCam(s.cam, pw / ph);
  viewPos.copy(cam.position);
  w.prism.rotation.y = s.spin * DEG;
  w.prism.rotation.x = 4 * DEG;
  placeRay(w.incoming, BEAM_FROM, SRC.clone().lerp(ENTRY, s.beam), s.beam > 0 ? 1 : 0);
  placeRay(w.inner, ENTRY, ENTRY.clone().lerp(EXIT, s.inner), s.inner > 0 ? 1 : 0);
  const fanLen = 4.4 * s.split;
  // once the camera rides the first ray, the spray goes out: only the solid rays stay (nothing crosses a figure)
  const spray = s.split * (1 - s.reach[0]);
  FAN.forEach((x, i) => {
    const dir = new THREE.Vector3(Math.cos(x.a), Math.sin(x.a), 0);
    if (x.main >= 0) {
      const k = s.reach[x.main];
      const full = ENDS[x.main].distanceTo(EXIT);
      placeRay(w.fan[i], EXIT, EXIT.clone().addScaledVector(dir, fanLen), spray);
      // a ray whose figure has left dims to a trace
      const done = x.main < 2 ? at(s.reach[x.main + 1], 0, 1) : 0;
      placeRay(w.solid[x.main], EXIT, EXIT.clone().addScaledVector(dir, full * mix(k, 0.4, 1)), k > 0 ? 1 - 0.6 * done : 0);
      const hit = w.hits[x.main];
      hit.visible = k > 0.98;
      hit.scale.setScalar(0.8 + 0.6 * s.pulse[x.main]);
      (hit.material as THREE.SpriteMaterial).opacity = 1 - 0.6 * done;
    } else {
      placeRay(w.fan[i], EXIT, EXIT.clone().addScaledVector(dir, fanLen), spray);
    }
  });
  w.core.visible = s.inner > 0;
  (w.core.material as THREE.SpriteMaterial).opacity = 0.26 * s.inner;
  w.glowOut.visible = s.split > 0.01;
  w.glowOut.scale.setScalar(0.6 + 1.3 * s.split);
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
  };
};

// ---------------------------------------------------------------- 1. the question, then light
const PROMPT = 'Why does a spinning top stay upright?';
const TYPE_AT = -12;
const P_STYLE: React.CSSProperties = { ...label, fontWeight: 480, letterSpacing: '-0.012em', fontSize: 80 };
// a solid lit input bar, centred, 8 % inside the frame; the send button at its right end
const BAR = { x: 170, y: 440, w: 1580, h: 200 };
const SEND = 136;
const TEXT_X = BAR.x + 78;
const TEXT_W = BAR.w - 78 - SEND - 64;

// the letters squash into a line of light, left to right; the line swings onto the beam's path and hands over to it
const Prompt: React.FC = () => {
  const f = useCurrentFrame();
  const w80 = useTextWidthSlow(PROMPT, P_STYLE);
  const size = w80 > 0 ? Math.min(80, (80 * TEXT_W) / w80) : 72;
  const width = w80 > 0 ? (w80 * size) / 80 : 1200;
  const typed = useTyped(PROMPT, TYPE_AT, 20, 3, 3);
  const barOut = accel(f, T.send + 1, 8, 1.6);
  const press = f >= T.send - 2 && f < T.send + 2 ? 0.9 : 1;
  const push = 1 + 0.05 * creep(f, 0, 34);
  const textTop = BAR.y + BAR.h / 2 - size * 0.6;
  const sx = (x: number) => 960 + (x - 960) * push;
  const sy = (y: number) => 540 + (y - 540) * push;
  if (f > T.hit) return null;
  const cam = orbitCam(prismState(f).cam);
  const b = toPx(cam, SRC.clone().lerp(ENTRY, BEAM_HANDOFF));
  const a0 = toPx(cam, SRC.clone().lerp(ENTRY, 0.7));
  const dx = b.x - a0.x;
  const dy = b.y - a0.y;
  const dl = Math.hypot(dx, dy) || 1;
  const a = { x: b.x - (dx / dl) * 3200, y: b.y - (dy / dl) * 3200 };
  const m = at(f, T.line, 4, ease.inOut);
  const lineY = sy(textTop + size * 0.62);
  const L0 = { x: mix(m, sx(TEXT_X), a.x), y: mix(m, lineY, a.y) };
  const L1 = { x: mix(m, sx(TEXT_X + width), b.x), y: mix(m, lineY, b.y) };
  const lineOn = f >= T.line && f < T.line + 7;
  const lineFade = 1 - at(f, T.line + 4, 3, ease.in);
  const len = Math.hypot(L1.x - L0.x, L1.y - L0.y);
  const ang = Math.atan2(L1.y - L0.y, L1.x - L0.x);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {/* the input: one solid lit bar with a lit top rim, sitting on the stage in soft layered shadow */}
        <div
          style={{
            position: 'absolute',
            left: BAR.x,
            top: BAR.y,
            width: BAR.w,
            height: BAR.h,
            borderRadius: BAR.h / 2,
            background: 'linear-gradient(180deg, #FFFFFF, #FBEFF1)',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,1), inset 0 -2px 0 rgba(120,20,40,.08), ${softShadow(6, OX)}`,
            transform: `translateY(${barOut * 900}px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 32,
              top: (BAR.h - SEND) / 2,
              width: SEND,
              height: SEND,
              borderRadius: SEND / 2,
              background: ROSE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${press})`,
              boxShadow: softShadow(2, '#FBEFF1'),
            }}
          >
            <Icon name="ArrowUp" size={64} color="#FFFFFF" stroke={2.6} />
          </div>
        </div>
        {f < T.line + 1 && (
          <div style={{ position: 'absolute', left: TEXT_X, top: textTop, whiteSpace: 'pre', ...P_STYLE, fontSize: size, lineHeight: 1.2 }}>
            {typed.shown.split('').map((ch, i) => {
              const q = at(f, T.send + i * 0.06, 5, ease.in);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    color: mixColor('#2A0A12', '#FFF6F7', clamp(q * 2.2)),
                    transformOrigin: '50% 62%',
                    transform: `scaleY(${1 - 0.97 * q})`,
                    textShadow: q > 0 ? `0 0 ${30 * q}px ${ROSE}` : undefined,
                  }}
                >
                  {ch}
                </span>
              );
            })}
            <span style={{ display: 'inline-block', width: 6, height: size * 0.92, background: ROSE, marginLeft: 6, transform: `translateY(${size * 0.14}px)`, opacity: f >= T.send ? 0 : 1 }} />
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
            background: 'linear-gradient(90deg, rgba(255,241,243,0), #FFF1F3 30%, #FFFFFF)',
            boxShadow: `0 0 26px 8px ${ROSE}AA, 0 0 70px 20px ${ROSE}55`,
            opacity: lineFade,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. the prism: the camera rides each ray to its figure
// one figure at a time, whole: it counts on twos, its name under it, and it leaves before the next ray is sent
const NUMS = [
  { label: 'Math', v: 92.4, d: 1, unit: '%' },
  { label: 'Code', v: 81.0, d: 1, unit: '%' },
  { label: 'Context', v: 1, d: 0, unit: 'M tokens' },
];
const NUM_SIZE = 250;
// a figure is cut away on the camera's move to the next ray (the move carries the cut), the last one by the seam
const numOut = (i: number) => (i < 2 ? T.nums[i + 1] - 6 : T.flood);
const countAt = (f: number, start: number, v: number, d: number) => {
  const fq = start + Math.floor((f - start) / 2) * 2;
  return (v * at(fq, start, 10, ease.out)).toFixed(d);
};

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const s = prismState(f);
  const cam = orbitCam(s.cam);
  const blur = mix(at(f, T.send, 12, ease.out), 30, 0);
  return (
    <AbsoluteFill style={{ background: OX }}>
      <AbsoluteFill style={{ filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        <GLView id="lumen-prism" build={buildPrism} draw={drawPrism} state={s} width={W} height={H} ss={1} />
      </AbsoluteFill>
      {NUMS.map((n, i) => {
        const on = T.nums[i];
        if (f < on || f >= numOut(i)) return null;
        const p = toPx(cam, ENDS[i]);
        const size = NUM_SIZE * (RIDE[i].dist / cam.position.distanceTo(ENDS[i]));
        const settle = mix(at(f, on, 10, ease.out), 1.14, 1);
        return (
          <div key={n.label} style={{ position: 'absolute', left: p.x + size * 0.16, top: p.y - size * 0.56, transformOrigin: '0% 50%', transform: `scale(${settle})`, whiteSpace: 'nowrap' }}>
            <div>
              <div style={{ ...stat, fontSize: size, lineHeight: 1, color: PALE }}>
                {countAt(f, on, n.v, n.d)}
                <span style={{ fontSize: size * 0.4, fontWeight: 540, letterSpacing: '-0.02em', marginLeft: size * 0.05 }}>{n.unit}</span>
              </div>
              <div style={{ ...label, fontSize: Math.max(44, size * 0.18), color: MUTED, marginTop: size * 0.06, marginLeft: size * 0.04 }}>{n.label}</div>
            </div>
          </div>
        );
      })}
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
  const h = hw * 2 + 70;
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
        background: `linear-gradient(180deg, rgba(255,74,97,0), rgba(255,120,140,.5) ${(22 / h) * 100}%, #FFE9EC ${(35 / h) * 100}%, #FFE9EC ${100 - (35 / h) * 100}%, rgba(255,120,140,.5) ${100 - (22 / h) * 100}%, rgba(255,74,97,0))`,
        filter: 'blur(6px)',
      }}
    />
  );
};

// ================================================================ the answer: a live simulation, one claim per shot (three.js)
const L = 1.42; // the top's height (tip to stem)
const ARROW = 1.55; // the L vector's length above the tip
type TopWorld = { scene: THREE.Scene; prec: THREE.Group; tilt: THREE.Group; spin: THREE.Group; shaft: THREE.Mesh; head: THREE.Mesh; ring: THREE.Mesh; bloom: THREE.Mesh; shadow: (x: number, z: number, size?: number, op?: number) => void };

const topPose = (g: number) => {
  const gg = Math.min(g, T.impact);
  const widen = at(g, T.widen, T.fall - T.widen, ease.inOut);
  const drop = at(g, T.fall, T.impact - T.fall, ease.in);
  const k = g - T.impact;
  const bounce = k > 0 ? Math.sin(k * 0.9) * Math.exp(-k * 0.3) * 0.07 : 0;
  const nut = 0.01 * Math.sin(g * 0.7) * (1 - drop);
  const theta = 0.2 + nut + (0.48 - 0.2) * widen + (1.08 - 0.48) * drop - bounce;
  const phi = 2.77 + 0.1 * (gg - T.flood) + 0.002 * Math.max(0, gg - T.widen) ** 2;
  const psi = 0.42 * (gg - T.flood) - 0.004 * Math.max(0, gg - T.widen) ** 2;
  const arrow = at(g, T.claims[0] - 2, 10, ease.out) * (1 - at(g, T.shotB - 2, 6, ease.in));
  return { theta, phi, psi, arrow, widen };
};
const axisAt = (theta: number, phi: number, len: number) => new THREE.Vector3(-len * Math.sin(theta) * Math.cos(phi), len * Math.cos(theta), len * Math.sin(theta) * Math.sin(phi));
const stemAt = (g: number, len = L) => {
  const { theta, phi } = topPose(g);
  return axisAt(theta, phi, len);
};
// the ring the stem's tip draws: a clean circle at the precession's own angle (no nutation), frozen as the top falls
const TRACE_FROM = T.shotB - 2;
const ringTheta = (g: number) => 0.2 + (0.48 - 0.2) * topPose(g).widen;
const ringArc = (g: number) => {
  const a = topPose(TRACE_FROM).phi;
  const b = topPose(Math.min(g, T.fall)).phi;
  return { a, b: Math.min(b, a + Math.PI * 2) };
};

// the cameras of the answer: an orbit with the L vector, a macro on the stem, a follow of the fall, a cut low on impact
const REST = topPose(T.impact + 30);
const FALLEN = axisAt(REST.theta, REST.phi, 0.55);
const YAW_AXIS = Math.atan2(-Math.cos(REST.phi), Math.sin(REST.phi)) / DEG;
const YAW_FOLLOW = nearAngle(YAW_AXIS + 90, 40);
const YAW_LOW = nearAngle(YAW_AXIS - 50, YAW_FOLLOW);
const ANSWER_KEYS: CamKey[] = [
  { f: T.flood, c: { yaw: -52, pitch: 9, dist: 6.1, tx: 0, ty: 0.7, tz: 0 } },
  { f: T.shotB, c: { yaw: -20, pitch: 8, dist: 5.7, tx: 0, ty: 0.7, tz: 0 }, curve: ease.out },
  { f: T.shotB + 8, c: { yaw: 6, pitch: 15, dist: 2.7, tx: 0, ty: 1.42, tz: 0 }, curve: ease.inOut },
  { f: T.widen + 8, c: { yaw: 28, pitch: 15, dist: 3.0, tx: 0, ty: 1.36, tz: 0 }, curve: ease.out },
  { f: T.fall, c: { yaw: YAW_FOLLOW - 12, pitch: 11, dist: 5.8, tx: FALLEN.x * 0.4, ty: 0.42, tz: FALLEN.z * 0.4 }, curve: ease.inOut },
  { f: T.impact, c: { yaw: YAW_FOLLOW, pitch: 10, dist: 6.2, tx: FALLEN.x * 0.6, ty: 0.3, tz: FALLEN.z * 0.6 }, curve: ease.in },
  { f: T.impact, c: { yaw: YAW_LOW, pitch: 16, dist: 6.2, tx: FALLEN.x * 0.6, ty: 0.3, tz: FALLEN.z * 0.6 }, cut: true },
  { f: T.iris, c: { yaw: YAW_LOW - 5, pitch: 15, dist: 6.0, tx: FALLEN.x * 0.6, ty: 0.3, tz: FALLEN.z * 0.6 }, curve: ease.out },
  // the camera tilts up off the fallen top (the world drops away under the ring, the stage's bloom stays with the lens)
  { f: T.word, c: { yaw: YAW_LOW - 7, pitch: 15, dist: 6.0, tx: FALLEN.x * 0.6, ty: 3.6, tz: FALLEN.z * 0.6 }, curve: ease.in },
];
const answerCam = (g: number) => roundCam(camPath(g, ANSWER_KEYS));
const simCam = (c: Cam, aspect = W / H) => orbitCam(c, aspect, 30);

const TOP_EXPOSURE = 1.05;
const buildTop = (r: THREE.WebGLRenderer): TopWorld => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAGE);
  const studio = softStudio(r, scene, { floorY: 0, intensity: 0.95, key: 1.4, exposure: TOP_EXPOSURE, tint: '#0E0206', shadowOpacity: 0.6 });
  // a smooth lathe: the profile is a spline, so the silhouette has no facets and no creases
  const knots = [
    [0, 0],
    [0.06, 0.035],
    [0.32, 0.24],
    [0.62, 0.5],
    [0.76, 0.66],
    [0.74, 0.79],
    [0.55, 0.9],
    [0.2, 0.975],
    [0.095, 1.02],
    [0.08, 1.33],
    [0.06, L - 0.01],
    [0, L],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pts = new THREE.SplineCurve(knots).getPoints(120);
  pts[0].set(0, 0);
  pts[pts.length - 1].set(0, L);
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    metalness: 0,
    roughness: 0.14,
    transmission: 1,
    thickness: 0.9,
    ior: 1.46,
    attenuationColor: new THREE.Color('#FF9FAE'),
    attenuationDistance: 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    specularIntensity: 1,
    envMapIntensity: 1.2,
  });
  const top = new THREE.Mesh(new THREE.LatheGeometry(pts, 160), glass);
  const spin = new THREE.Group();
  spin.add(top);
  const tilt = new THREE.Group();
  tilt.add(spin);
  const prec = new THREE.Group();
  prec.add(tilt);
  scene.add(prec);
  const inkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAGE_INK), toneMapped: false });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 16), inkMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 32), inkMat);
  tilt.add(shaft, head);
  const ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(RING_INK), toneMapped: false }));
  scene.add(ring);
  // one broad bloom behind the top, square to the lens (opaque, so the glass refracts it)
  const bloom = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ toneMapped: false, map: bloomTex(OX, liftColor(OX, 0.1, ROSE)), depthWrite: false }));
  bloom.renderOrder = -2;
  scene.add(bloom);
  const shadow = studio.shadow(0, 0, 1.9);
  return { scene, prec, tilt, spin, shaft, head, ring, bloom, shadow };
};

const drawTop = (w: TopWorld, s: { g: number; cam: Cam }, r: THREE.WebGLRenderer, pw: number, ph: number) => {
  r.shadowMap.enabled = false;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = TOP_EXPOSURE;
  const g = s.g;
  const p = topPose(g);
  w.prec.rotation.y = p.phi;
  w.tilt.rotation.z = p.theta;
  w.spin.rotation.y = p.psi;
  const len = ARROW * p.arrow;
  w.shaft.visible = w.head.visible = p.arrow > 0.01;
  w.shaft.scale.set(1, Math.max(0.001, len), 1);
  w.shaft.position.y = len / 2;
  w.head.position.y = len + 0.1;
  // the contact shadow follows the body: under the tip while it spins, under the rim once it lies down
  const lie = at(g, T.fall, T.impact - T.fall, ease.in);
  const body = axisAt(p.theta, p.phi, 0.62);
  w.shadow(body.x * lie, body.z * lie, mix(lie, 1.7 + 0.5 * p.widen, 2.3), 0.6);
  // the ring: an exact circle, drawn from the macro on, its arc growing with the precession
  const { a, b } = ringArc(g);
  const th = ringTheta(g);
  w.ring.geometry.dispose();
  if (g >= TRACE_FROM + 1 && g < T.iris && b - a > 0.05) {
    const pts: THREE.Vector3[] = [];
    for (let x = a; x <= b + 1e-6; x += Math.min(0.04, (b - a) / 8)) pts.push(axisAt(th, x, L + 0.012));
    w.ring.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), 0.011, 8, false);
  } else w.ring.geometry = new THREE.BufferGeometry();
  const cam = simCam(s.cam, pw / ph);
  {
    // the backdrop stays square to the lens, far behind the top
    const dir = new THREE.Vector3(s.cam.tx, s.cam.ty, s.cam.tz).sub(cam.position).normalize();
    w.bloom.position.copy(cam.position).addScaledVector(dir, 22);
    w.bloom.quaternion.copy(cam.quaternion);
  }
  r.render(w.scene, cam);
};

const ringScreen = (g: number) => {
  const cam = simCam(answerCam(g));
  const th = ringTheta(g);
  const c = toPx(cam, new THREE.Vector3(0, L * Math.cos(th), 0));
  const xs = [0, 1, 2, 3].map((k) => toPx(cam, axisAt(th, (k * Math.PI) / 2, L)));
  const rx = Math.max(...xs.map((q) => Math.abs(q.x - c.x)));
  const ry = Math.max(...xs.map((q) => Math.abs(q.y - c.y)));
  return { x: c.x, y: c.y, rx, ry };
};

// a line leaves by rising out of its own mask, accelerating (no blur, no fade)
const Masked: React.FC<{ out: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ out, children, style }) => (
  <div style={{ position: 'absolute', left: 0, width: W, textAlign: 'center', overflow: 'hidden', paddingBottom: '0.22em', ...style }}>
    <div style={{ transform: `translateY(${-out * 120}%)` }}>{children}</div>
  </div>
);

const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const c = answerCam(f);
  const cam = simCam(c);
  const pose = topPose(f);
  const tip = toPx(cam, stemAt(f, ARROW * pose.arrow + 0.24));
  const inA = f < T.shotB + 2;
  const inB = f >= T.shotB && f < T.fall + 2;
  const inC = f >= T.fall - 2;
  return (
    <AbsoluteFill style={{ background: PAGE }}>
      <AbsoluteFill style={{ transform: shake(f, T.impact, 6, 8) }}>
        <GLView id="lumen-top" build={buildTop} draw={drawTop} state={{ g: f, cam: c }} width={W} height={H} ss={1} />
        {/* the vector's name at its tip */}
        {pose.arrow > 0.3 && (
          <div style={{ position: 'absolute', left: tip.x + 20, top: tip.y - 40, fontFamily: fonts.inter, fontStyle: 'italic', fontWeight: 500, fontSize: 80, lineHeight: 1, color: PAGE_INK, opacity: clamp((pose.arrow - 0.3) * 3) }}>L</div>
        )}
        {/* one line a shot, clear of the object, 8 % inside the frame */}
        {inA && (
          <Masked out={accel(f, T.shotB - 5, 5, 1.6)} style={{ top: 818 }}>
            <div style={{ ...display, fontSize: 132, lineHeight: 1 }}>
              <Words text="Angular momentum." start={T.claims[0]} arrive="rise" gap={4} style={{ color: PAGE_INK }} />
            </div>
          </Masked>
        )}
        {inB && (
          <Masked out={accel(f, T.fall - 9, 5, 1.6)} style={{ top: 120 }}>
            <div style={{ ...display, fontSize: 108, lineHeight: 1 }}>
              <Words text="Gravity becomes precession." start={T.claims[1]} arrive="rise" gap={4} accent={['precession']} accentStyle={{ color: EMPH }} style={{ color: PAGE_INK }} />
            </div>
          </Masked>
        )}
        {inC && (
          <Masked out={0} style={{ top: 806, transform: `translateY(${accel(f, T.iris, T.word - T.iris, 1.6) * 700}px)` }}>
            <div style={{ ...display, fontSize: 160, lineHeight: 1 }}>
              <Words text="Friction wins." times={[T.claims[2], T.impact]} arrive="rise" style={{ color: PAGE_INK }} />
            </div>
          </Masked>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- lockup: the stage again; the ring becomes the mark
// The mark: "Lumen" with its version set inside the ring the top drew, the tip still riding it as a dot.
const MARK: React.CSSProperties = { fontFamily: fonts.inter, fontSize: 188, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1 };
const RING_R = 104;
const LockupGround: React.FC = () => <Ground color={OX} tint={ROSE} light={{ x: 0.5, y: 0.48, size: 1.1, amount: 0.08 }} />;
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const wWord = useTextWidthSlow('Lumen', MARK);
  const ww = wWord > 0 ? wWord : 560;
  const gap = 44;
  const total = ww + gap + RING_R * 2;
  const x0 = 960 - total / 2;
  const cy = 520;
  const start = ringScreen(T.iris);
  const g = at(f, T.iris, T.word + 8 - T.iris, ease.out);
  const cx = mix(g, start.x, x0 + ww + gap + RING_R);
  const ccy = mix(g, start.y, cy);
  const rx = logScale(Math.max(60, start.rx), RING_R, g);
  const ry = logScale(Math.max(30, start.ry), RING_R, g);
  // the tip keeps circling, slowing to rest at the ring's upper right
  const dotA = mix(ease.out(at(f, T.iris, 46)), -Math.PI * 3.2, -Math.PI * 0.3);
  const scale = 1 + 0.03 * creep(f, T.word + 10, 40);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <div style={{ position: 'absolute', left: x0, top: cy - 96, ...MARK, color: PALE, whiteSpace: 'pre' }}>
          <Words text="Lumen" start={T.word} by="char" arrive="cut" gap={1.6} style={{ color: PALE }} />
        </div>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <ellipse cx={cx} cy={ccy} rx={rx} ry={ry} fill="none" stroke={mixColor(PALE, ROSE, clamp(g * 2.5))} strokeWidth={mix(g, 4, 9)} />
          <circle cx={cx + rx * Math.cos(dotA)} cy={ccy + ry * Math.sin(dotA)} r={mix(g, 9, 17)} fill={ROSE} />
        </svg>
        {f >= T.word + 8 && (
          <div style={{ position: 'absolute', left: cx - RING_R, top: ccy - RING_R, width: RING_R * 2, height: RING_R * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', ...MARK, fontSize: 132, letterSpacing: '-0.02em', color: PALE }}>
            <span style={{ transform: 'translateY(-4px)' }}>2</span>
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, width: W, top: cy + 168, textAlign: 'center', ...label, fontSize: 42, color: MUTED, opacity: f >= T.word + 14 ? 1 : 0 }}>Available today</div>
      </AbsoluteFill>
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
    <AbsoluteFill style={{ background: OX }}>
      {f < T.flood + 16 && <Stage />}
      {f < T.hit + 1 && <Prompt />}
      {band && <BandGlow c={band.c} ang={band.ang} hw={band.hw} />}
      {band && band.hw - 40 > 0 && (
        <AbsoluteFill style={{ clipPath: bandPoly(band.c, band.ang, band.hw - 40) }}>
          <Answer />
        </AbsoluteFill>
      )}
      {f >= T.iris && <LockupGround />}
      {/* the camera tilts up off the fallen top: the ring stays, turns to the light and becomes the mark */}
      {f >= T.flood + 16 && f < T.word && (
        <Answer />
      )}
      {f >= T.iris && <Lockup />}
      <Flash start={T.hit - 2} dur={8} color="#FFE6EA" strength={0.4} />
      <Music src="music/wheres-hope.mp3" startFrom={7.46} volume={1} breaths={[T.hit]} breathLen={8} duck={[T.hit, T.word]} fadeOut={36} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const lumenDuration = T.end;
