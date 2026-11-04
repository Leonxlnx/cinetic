// The film's world light for fx/three: one key (the same azimuth and elevation as lib/light FILM_LIGHT, so a 3D hero
// object, a lit panel and the ground all agree on where the light comes from) plus a light stage the glossy surfaces
// reflect: a procedural environment of a sky/ground gradient and softboxes, built once per light and never fetched.
// Stages: 'studio' (a key softbox, bands overhead and on the key's side that glossy bevels read as lines, a big top
// light behind that top faces catch, a rim strip, a soft front fill: product light on any ground), 'sky' (a bright
// pale dome with a small sun: a cloud or daylight plate), 'night' (deep blue with cool strips: a navy field with a light
// pool), 'black' (near black with two thin strips: glass and marks on a black field, crisp rim lines).
// Conventions: azimuth 0 top, 90 right, 180 below, 270 left (where the key comes FROM on the frame); elevation degrees
// toward the viewer (negative: behind the subject, for rims). three's axes: x right, y up, z toward the viewer.
// cinetic:device-palette light stages: each stage's sky, ground and softbox whites are light, not brand colours
import * as THREE from 'three';
import { FILM_LIGHT } from '../../lib/light';

export type LightStage = 'studio' | 'sky' | 'night' | 'black';

/** The world light as props (every field optional; the defaults are the film's FILM_LIGHT and the 'studio' stage). */
export type Light3D = {
  azimuth?: number; // deg, where the key comes from (FILM_LIGHT.azimuth: 315, the upper left)
  elevation?: number; // deg toward the viewer (FILM_LIGHT.elevation: 34)
  key?: string; // key colour (default a neutral white)
  keyIntensity?: number; // key strength (default per stage)
  sky?: string; // what the surfaces reflect above (default per stage); the plate's sky colour when there is a plate
  ground?: string; // what they reflect below (default per stage); the plate's lower colour
  stage?: LightStage; // the softbox layout (default 'studio')
  env?: number; // environment strength (default per stage)
  soft?: number; // key size in degrees: soft shadow edges (accumulated; default 4)
  sweep?: number; // degrees the light stage turns across a part's move: a highlight travelling over the faces (default per part)
};

type Panel = { az: number; el: number; w: number; h: number; i: number; rel?: boolean; ke?: boolean };
type StageDef = { sky: string; ground: string; horizon: number; key: number; env: number; panels: Panel[] };

// Panels: az/el in degrees (rel: az relative to the key's azimuth; ke: el relative to the key's elevation, so the softbox
// or the sun a glossy face reflects sits exactly where the key comes from), w/h angular size in degrees, i linear intensity.
export const STAGES: Record<LightStage, StageDef> = {
  studio: {
    sky: '#DCE1E8', ground: '#2A2D32', horizon: 0.55, key: 2.4, env: 1,
    panels: [
      { az: 0, el: 0, w: 34, h: 46, i: 7, rel: true, ke: true }, // key softbox
      { az: 0, el: 10, w: 120, h: 14, i: 16 }, // a band overhead: a line along every top bevel
      { az: 0, el: -42, w: 120, h: 50, i: 1.7 }, // a big top light behind: top faces read light at grazing angles
      { az: 0, el: 0, w: 14, h: 90, i: 14, rel: true }, // a tall strip on the key's side: lines along the bevels facing it
      { az: 180, el: -18, w: 12, h: 80, i: 9, rel: true }, // rim strip behind, opposite the key
      { az: 0, el: 80, w: 70, h: 40, i: 1 }, // soft front fill (behind the camera)
      { az: 95, el: 6, w: 34, h: 10, i: 1.2, rel: true }, // low kicker
    ],
  },
  sky: {
    sky: '#9FC2E6', ground: '#E9EEF3', horizon: 0.9, key: 2.0, env: 1.15,
    panels: [
      { az: 0, el: 0, w: 7, h: 7, i: 28, rel: true, ke: true }, // the sun
      { az: 0, el: 70, w: 120, h: 50, i: 1.3 }, // bright upper sky
      { az: 180, el: -10, w: 60, h: 14, i: 1.6, rel: true }, // bright haze behind
      { az: 0, el: 6, w: 100, h: 26, i: 2.2 }, // the bright sky overhead: top bevels and rims catch it
      { az: 90, el: -6, w: 8, h: 56, i: 2.4 }, // side strips: thin bright edges on glass and rims
      { az: 270, el: -6, w: 8, h: 56, i: 2.0 },
    ],
  },
  night: {
    sky: '#0E1A33', ground: '#05070D', horizon: 0.35, key: 1.6, env: 1,
    panels: [
      { az: 0, el: -4, w: 12, h: 60, i: 4, rel: true, ke: true }, // cool key strip
      { az: 150, el: -12, w: 6, h: 70, i: 6, rel: true }, // rim strip
      { az: -150, el: -12, w: 6, h: 70, i: 4, rel: true }, // second rim
      { az: 0, el: 85, w: 50, h: 30, i: 0.6 },
    ],
  },
  black: {
    sky: '#0A0B0D', ground: '#030304', horizon: 0.2, key: 1.4, env: 1,
    panels: [
      { az: 0, el: -6, w: 5, h: 80, i: 9, rel: true, ke: true }, // thin key strip: a crisp line on every rim
      { az: 180, el: -14, w: 4, h: 64, i: 6, rel: true }, // thin rim strip behind
      { az: 0, el: 80, w: 40, h: 16, i: 0.5 },
    ],
  },
};

const rad = (d: number) => (d * Math.PI) / 180;

/** Unit direction toward (azimuth, elevation) in three's axes; elevation may be negative (behind the subject). */
export const dirOf = (azimuth: number, elevation: number): THREE.Vector3 => {
  const e = rad(Math.max(-89.5, Math.min(89.5, elevation)));
  const a = rad(azimuth);
  return new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.cos(e) * Math.cos(a), Math.sin(e)).normalize();
};

/** The light with every default filled in. */
export const lightOf = (l: Light3D = {}) => {
  const stage = l.stage ?? 'studio';
  const S = STAGES[stage];
  return {
    stage,
    azimuth: l.azimuth ?? FILM_LIGHT.azimuth,
    elevation: l.elevation ?? FILM_LIGHT.elevation,
    key: l.key ?? '#FFFFFF',
    keyIntensity: l.keyIntensity ?? S.key,
    sky: l.sky ?? S.sky,
    ground: l.ground ?? S.ground,
    env: l.env ?? S.env,
    soft: l.soft ?? 4,
    sweep: l.sweep,
  };
};
export type LightFull = ReturnType<typeof lightOf>;

/** The key's direction (toward the light) in three's axes. */
export const keyVector = (l: LightFull) => dirOf(l.azimuth, l.elevation);

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = /* glsl */ `
uniform vec3 uSky; uniform vec3 uGround; uniform float uHorizon;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = mix(uGround, uSky, smoothstep(-0.25, 0.55, h));
  c += uHorizon * 0.35 * exp(-abs(h) * 9.0) * mix(uGround, uSky, 0.5);
  gl_FragColor = vec4(c, 1.0);
}`;

/** The light stage as a scene (for PMREM): a gradient sphere and softbox panels around the origin. */
export const stageScene = (l: LightFull): THREE.Scene => {
  const S = STAGES[l.stage];
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(100, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uSky: { value: new THREE.Color(l.sky) }, uGround: { value: new THREE.Color(l.ground) }, uHorizon: { value: S.horizon } },
      vertexShader: SKY_VS,
      fragmentShader: SKY_FS,
    }),
  );
  scene.add(sky);
  const tint = new THREE.Color(l.key);
  for (const p of S.panels) {
    // three's env lookups: +z toward the viewer, +y up. The panel sits 60 units out along its direction, facing in.
    const az = p.rel ? l.azimuth + p.az : p.az;
    const d = dirOf(az, p.ke ? l.elevation + p.el : p.el);
    const dist = 60;
    const w = 2 * dist * Math.tan(rad(p.w / 2));
    const h = 2 * dist * Math.tan(rad(p.h / 2));
    const mat = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(p.i), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(d.multiplyScalar(dist));
    m.lookAt(0, 0, 0);
    scene.add(m);
  }
  return scene;
};

/** A prefiltered environment map of the light stage. Dispose it with the renderer. */
export const stageEnv = (gl: THREE.WebGLRenderer, l: LightFull): THREE.Texture => {
  const pm = new THREE.PMREMGenerator(gl);
  const scene = stageScene(l);
  const rt = pm.fromScene(scene, 0, 0.1, 200);
  pm.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
  return rt.texture;
};
