// The 3D stage under every part in fx/three: one full-frame <ThreeCanvas> (@remotion/three), a camera whose z = 0 plane
// maps 1:1 onto the frame's pixels (x right from the centre, y up), the film's world light (light.ts) and a renderer that
// builds each frame from samples like a film camera: every sample poses the scene at its own instant inside the shutter
// (motion blur), looks through its own point of the lens (depth of field) and shifts by a fraction of a pixel (clean
// edges), and the frame is their average, in float, encoded once. Everything is a pure function of the frame: a part
// registers an applier, `(t) => lens`, that poses its objects at film frame t (fractional) and returns the lens.
// Colour: lit surfaces keep their exact colour up to 0.8 linear and roll highlights off smoothly (no hue clipping);
// unlit decals (icons, screens, plates) keep their exact sRGB colours; `flat` on a lit material blends it to its flat
// colour, exactly, which is how a 3D mark lands on its 2D drawing with an invisible swap.
// Cost: one scene render per sample. Holds that do not move render 4 samples, moves 12, a wide lens asks for up to 40
// (MAX_SAMPLES), the Studio preview at most 4. On software GL (no GPU) a sample of a part at 960 x 540 measured 0.15 s
// (the logo, the tiles) to 0.35 s (the dome); a laptop GPU is far faster.
// cinetic:device-palette render internals: the black clear and the white of a fallback plate are not brand colours
import { useFrame, useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, getRemotionEnvironment, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { keyVector, type Light3D, lightOf, type LightFull, stageEnv } from './light';

// ---------------------------------------------------------------------------------------------- the lens and samples

/** What an applier returns for its instant: the lens (aperture radius and focus distance, px of the z = 0 plane). */
export type Lens = {
  aperture?: number; // lens radius in px-units; 0 = everything sharp
  focus?: number; // distance from the camera to the focus plane (px-units); default the z = 0 plane
  still?: boolean; // nothing moves around this instant and the aperture is 0: the frame needs only edge samples
  moving?: boolean; // something moves around this instant: the sample pattern turns each frame (holds keep one pattern)
  samples?: number; // the samples this instant needs at least (a wide lens: more samples, a smooth blur); ignored when the part's samples prop is set
  dither?: number; // 0..1 dither of the final encode (0 where a part must match a flat drawing exactly)
  sweep?: number; // degrees the light stage is turned at this instant (a highlight travelling over glossy faces)
};
export type Applier = (t: number) => Lens | void;

/** The most samples a lens may ask for (a wide aperture on a close-up). */
export const MAX_SAMPLES = 40;

const SamplerCtx = createContext<{ add: (fn: Applier) => () => void } | null>(null);
const CameraCtx = createContext<THREE.PerspectiveCamera | null>(null);

/** Register a part's applier with the stage around it (inside a <Stage3D>). */
export const useSampler = (fn: Applier) => {
  const reg = useContext(SamplerCtx);
  const ref = useRef(fn);
  ref.current = fn;
  useLayoutEffect(() => (reg ? reg.add((t) => ref.current(t)) : undefined), [reg]);
};

/** The stage's camera (px-units: the z = 0 plane is the frame at 1:1, the camera at +z looking down -z). */
export const useStageCamera = () => useContext(CameraCtx);

const halton = (i: number, b: number) => {
  let f = 1;
  let r = 0;
  let k = i;
  while (k > 0) {
    f /= b;
    r += f * (k % b);
    k = Math.floor(k / b);
  }
  return r;
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * Sample i of n: its instant inside the shutter (-0.5..0.5), its lens point (unit disk) and its pixel shift (-0.5..0.5).
 * `turn` (0..1) rotates the lens pattern and shifts the pixel pattern: a different one each frame, so a few samples of a
 * wide blur read as a smooth blur in motion instead of fixed ghost copies (a pure function of the frame).
 */
export const sampleOf = (i: number, n: number, turn = 0) => {
  const m = [5, 7, 11, 13, 3].find((k) => gcd(k, n) === 1) ?? 1;
  const j = (i * m) % n; // decorrelate the lens from the instant
  const r = Math.sqrt((j + 0.5) / n);
  const th = j * 2.399963229728653 + turn * Math.PI * 2; // golden angle: an even disk
  const fx = (halton(i + 1, 2) + turn * 0.7548777) % 1;
  const fy = (halton(i + 1, 3) + turn * 0.5698403) % 1;
  return { dt: (i + 0.5) / n - 0.5, lx: r * Math.cos(th), ly: r * Math.sin(th), jx: fx - 0.5, jy: fy - 0.5 };
};

/** The per-frame turn of the sample pattern (golden ratio steps); used only while something moves, so holds stay steady. */
export const frameTurn = (frame: number) => (Math.floor(frame) * 0.6180339887) % 1;

// ------------------------------------------------------------------------------------------- materials: tone and flat

const TONE = /* glsl */ `
uniform float uFlat;
uniform vec3 uFlatColor;
vec3 cineticTone(vec3 c) {
  float peak = max(c.r, max(c.g, c.b));
  const float s = 0.8;
  if (peak <= s) return c;
  float d = 1.0 - s;
  float np = 1.0 - d * d / (peak + d - s);
  c *= np / peak;
  float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0);
  return mix(c, vec3(np), g);
}
`;

export type LitUniforms = { uFlat: { value: number }; uFlatColor: { value: THREE.Color } };

/**
 * Make a lit material film-ready: highlights roll off above 0.8 linear (colours below stay exact), and `uFlat` (0..1)
 * blends the surface to `flatColor` exactly (sRGB hex in, linear in the shader). Returns the uniforms to animate.
 */
export const filmLit = <M extends THREE.Material>(m: M, flatColor: string, flat?: { value: number }): M & { userData: { lit: LitUniforms } } => {
  const u: LitUniforms = { uFlat: flat ?? { value: 0 }, uFlatColor: { value: new THREE.Color(flatColor) } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlat = u.uFlat;
    sh.uniforms.uFlatColor = u.uFlatColor;
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `${TONE}\nvoid main() {`).replace(/\}\s*$/, '  gl_FragColor.rgb = mix(cineticTone(gl_FragColor.rgb), uFlatColor, uFlat);\n}\n');
  };
  m.customProgramCacheKey = () => 'cinetic-lit';
  m.userData.lit = u;
  return m as M & { userData: { lit: LitUniforms } };
};

// ------------------------------------------------------------------------------------------------- the backdrop

/** A plate the glass refracts: an image (cover-fit, the same picture the film shows behind) or a vertical gradient. */
export type Backdrop = string | { top: string; bottom: string };

const PLATE_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }`;
const PLATE_FS = /* glsl */ `
uniform sampler2D uMap; uniform float uHasMap; uniform vec4 uCover; uniform vec3 uTop; uniform vec3 uBottom;
varying vec2 vUv;
void main() {
  vec3 c = mix(uBottom, uTop, vUv.y);
  if (uHasMap > 0.5) c = texture2D(uMap, uCover.xy + vUv * uCover.zw).rgb;
  gl_FragColor = vec4(c, 1.0);
}`;

const PlateMesh: React.FC<{ backdrop: Backdrop; tex: THREE.Texture | null; aspect: number }> = ({ backdrop, tex, aspect }) => {
  const mesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: PLATE_VS,
      fragmentShader: PLATE_FS,
      depthWrite: false,
      depthTest: false,
      uniforms: { uMap: { value: null }, uHasMap: { value: 0 }, uCover: { value: new THREE.Vector4(0, 0, 1, 1) }, uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() } },
    });
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    m.renderOrder = -1000;
    return m;
  }, []);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);
  const mat = mesh.material as THREE.ShaderMaterial;
  if (typeof backdrop === 'string' && tex) {
    const img = tex.image as { width: number; height: number };
    const ia = img.width / img.height;
    // cover: crop the longer side, centred
    const cover = ia > aspect ? new THREE.Vector4((1 - aspect / ia) / 2, 0, aspect / ia, 1) : new THREE.Vector4(0, (1 - ia / aspect) / 2, 1, ia / aspect);
    mat.uniforms.uMap.value = tex;
    mat.uniforms.uHasMap.value = 1;
    mat.uniforms.uCover.value = cover;
  } else if (typeof backdrop !== 'string') {
    mat.uniforms.uHasMap.value = 0;
    mat.uniforms.uTop.value = new THREE.Color(backdrop.top);
    mat.uniforms.uBottom.value = new THREE.Color(backdrop.bottom);
  }
  return <primitive object={mesh} />;
};

// --------------------------------------------------------------------------------------------- textures (delayRender)

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`fx/three: could not load ${src}`));
    img.src = src;
  });

/** An SVG without width/height has no intrinsic size (it would draw at 300 x 150): give it its viewBox's. */
const sizedSvg = async (src: string): Promise<string> => {
  const text = await (await fetch(src)).text();
  const head = text.match(/<svg\b[^>]*>/)?.[0];
  if (!head || (/\swidth\s*=/.test(head) && /\sheight\s*=/.test(head))) return src;
  const vb = head.match(/viewBox\s*=\s*["']([^"']+)["']/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const w = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : 512;
  const h = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : 512;
  const k = 1024 / Math.max(w, h);
  const bare = head.replace(/\s(width|height)\s*=\s*["'][^"']*["']/g, '');
  const fixed = text.replace(head, bare.replace(/<svg\b/, `<svg width="${Math.round(w * k)}" height="${Math.round(h * k)}"`));
  return URL.createObjectURL(new Blob([fixed], { type: 'image/svg+xml' }));
};

/** An image as a texture, drawn into a square or the image's aspect at `px` on its long side (SVG icons stay crisp). */
export const imageTexture = async (src: string, px = 512, square = false): Promise<THREE.Texture> => {
  const img = await loadImage(/\.svg(\?|#|$)/i.test(src) ? await sizedSvg(src).catch(() => src) : src);
  const iw = img.naturalWidth || img.width || px;
  const ih = img.naturalHeight || img.height || px;
  const k = px / Math.max(iw, ih);
  const cw = square ? px : Math.max(1, Math.round(iw * k));
  const ch = square ? px : Math.max(1, Math.round(ih * k));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  if (!g) throw new Error('fx/three: no 2D canvas');
  const dw = iw * k;
  const dh = ih * k;
  g.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
};

/**
 * Load images as textures before the canvas mounts (one delayRender for all of them): null until ready. The frame is
 * held until the render that uses them has committed (so the canvas that draws them has mounted and holds the frame
 * itself): releasing on load would let a frame be captured before the canvas exists. A file that fails stops the render
 * with its path in the message.
 */
export const useTextures = (srcs: (string | undefined)[], px = 512, square = false): (THREE.Texture | null)[] | null => {
  const key = srcs.map((s) => s ?? '').join('|');
  const [state, setState] = useState<{ key: string; tex: (THREE.Texture | null)[] } | null>(null);
  const [handle] = useState(() => delayRender('fx/three: textures'));
  useEffect(() => {
    let live = true;
    Promise.all(srcs.map((s) => (s ? imageTexture(s, px, square) : Promise.resolve(null))))
      .then((tex) => {
        if (live) setState({ key, tex });
      })
      .catch((e: Error) => cancelRender(e));
    return () => {
      live = false;
    };
    // the key carries the sources
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, px, square]);
  const ready = !!state && state.key === key;
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  useEffect(() => () => continueRender(handle), [handle]);
  return ready && state ? state.tex : null;
};

// ----------------------------------------------------------------------------------------------- the accumulator

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const ADD_FS = /* glsl */ `
uniform sampler2D tSrc; uniform float uWeight; varying vec2 vUv;
void main() { gl_FragColor = texture2D(tSrc, vUv) * uWeight; }`;
const OUT_FS = /* glsl */ `
uniform sampler2D tSrc; uniform float uDither; varying vec2 vUv;
float enc(float c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1.0 / 2.4) - 0.055; }
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec4 c = texture2D(tSrc, vUv);
  float a = clamp(c.a, 0.0, 1.0);
  vec3 rgb = a > 1e-6 ? clamp(c.rgb / a, 0.0, 1.0) : vec3(0.0);
  rgb = vec3(enc(rgb.r), enc(rgb.g), enc(rgb.b));
  rgb += (hash(gl_FragCoord.xy) - 0.5) * uDither / 255.0;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0) * a, a);
}`;

const quad = (fs: string, blend: boolean) => {
  const mat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VS,
    fragmentShader: fs,
    depthTest: false,
    depthWrite: false,
    uniforms: { tSrc: { value: null }, uWeight: { value: 1 }, uDither: { value: 1 } },
    ...(blend
      ? { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor }
      : { blending: THREE.NoBlending }),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, mat };
};

type AccumProps = {
  frame: number;
  samples: number; // the default while something moves
  fixed: boolean; // the part's samples prop was set: use exactly that
  stillSamples: number;
  shutter: number; // degrees
  appliers: React.MutableRefObject<Set<Applier>>;
  camera: THREE.PerspectiveCamera;
  keyLight: THREE.DirectionalLight;
  light: LightFull;
};

const Accumulator: React.FC<AccumProps> = ({ frame, samples, fixed, stillSamples, shutter, appliers, camera, keyLight, light }) => {
  const { gl, scene } = useThree();
  const res = useMemo(() => {
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: true, colorSpace: THREE.LinearSRGBColorSpace } as const;
    return {
      sample: new THREE.WebGLRenderTarget(4, 4, opts),
      sampleMs: new THREE.WebGLRenderTarget(4, 4, { ...opts, samples: 4 }),
      accum: new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false }),
      add: quad(ADD_FS, true),
      out: quad(OUT_FS, false),
      cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      size: new THREE.Vector2(),
      base: new THREE.Vector3(),
      key: new THREE.Vector3(),
      last: '',
    };
  }, []);
  useEffect(
    () => () => {
      res.sample.dispose();
      res.sampleMs.dispose();
      res.accum.dispose();
      res.add.mat.dispose();
      res.out.mat.dispose();
    },
    [res],
  );
  const props = useRef({ frame, samples, fixed, stillSamples, shutter });
  props.current = { frame, samples, fixed, stillSamples, shutter };

  useFrame(() => {
    const P = props.current;
    gl.getDrawingBufferSize(res.size);
    const w = Math.max(1, Math.floor(res.size.x));
    const h = Math.max(1, Math.floor(res.size.y));
    if (res.accum.width !== w || res.accum.height !== h) {
      res.sample.setSize(w, h);
      res.sampleMs.setSize(w, h);
      res.accum.setSize(w, h);
      res.last = '';
    }
    // Studio playback re-runs this every display frame: render once per frame and size.
    const stamp = `${P.frame}|${w}x${h}|${P.samples}`;
    if (!getRemotionEnvironment().isRendering && stamp === res.last) return;
    res.last = stamp;

    const apply = (t: number): Lens => {
      let lens: Lens = {};
      appliers.current.forEach((fn) => {
        const l = fn(t);
        if (l) lens = { ...lens, ...l };
      });
      return lens;
    };
    const probe = apply(P.frame);
    const want = probe.still ? P.stillSamples : P.fixed ? P.samples : Math.max(P.samples, Math.min(MAX_SAMPLES, probe.samples ?? 0));
    const n = Math.max(1, Math.round(getRemotionEnvironment().isRendering || P.fixed ? want : Math.min(4, want)));
    const shutterFrac = probe.still ? 0 : P.shutter / 360;
    const target = n < 4 ? res.sampleMs : res.sample;
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(res.accum);
    gl.clear(true, true, true);
    res.key.copy(keyVector(light));
    const D = camera.position.length();
    let dither = 1;
    for (let i = 0; i < n; i++) {
      const s = sampleOf(i, n, probe.moving ? frameTurn(P.frame) : 0);
      const lens = n === 1 ? probe : apply(P.frame + s.dt * shutterFrac);
      dither = lens.dither ?? dither;
      if (lens.sweep !== undefined) scene.environmentRotation.set(0, (lens.sweep * Math.PI) / 180, 0);
      // the lens: move the eye across the aperture, shear the frustum so the focus plane stays put; shift by sub-pixels
      camera.updateMatrixWorld();
      res.base.copy(camera.position);
      const A = lens.aperture ?? 0;
      const F = Math.max(1, lens.focus ?? D);
      const ox = A * s.lx;
      const oy = A * s.ly;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      camera.position.addScaledVector(right, ox).addScaledVector(up, oy);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      const e = camera.projectionMatrix.elements;
      const jx = n === 1 ? 0 : s.jx;
      const jy = n === 1 ? 0 : s.jy;
      e[8] -= (e[0] * ox) / F + (2 * jx) / w;
      e[9] -= (e[5] * oy) / F + (2 * jy) / h;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      // a soft key: each sample sees the light from its own point of the light's disk
      const soft = (light.soft * Math.PI) / 180;
      const kd = res.key.clone();
      const kr = new THREE.Vector3(0, 1, 0).cross(kd).normalize();
      const ku = kd.clone().cross(kr).normalize();
      kd.addScaledVector(kr, Math.tan(soft) * s.ly).addScaledVector(ku, Math.tan(soft) * s.lx).normalize();
      keyLight.position.copy(kd.multiplyScalar(4000));
      keyLight.updateMatrixWorld();

      gl.setRenderTarget(target);
      gl.clear(true, true, true);
      gl.render(scene, camera);

      camera.position.copy(res.base);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      res.add.mat.uniforms.tSrc.value = target.texture;
      res.add.mat.uniforms.uWeight.value = 1 / n;
      gl.setRenderTarget(res.accum);
      gl.render(res.add.scene, res.cam);
    }
    apply(P.frame); // leave the scene posed at the frame
    gl.setRenderTarget(null);
    gl.clear(true, true, true);
    res.out.mat.uniforms.tSrc.value = res.accum.texture;
    res.out.mat.uniforms.uDither.value = dither;
    gl.render(res.out.scene, res.cam);
    gl.autoClear = autoClear;
  }, 1);
  return null;
};

// ------------------------------------------------------------------------------------------------- the stage

/** Field of view of the stage camera (degrees, vertical): 30 reads like a long lens; the z = 0 plane stays 1:1. */
export const FOV = 30;
/** Distance from the camera to the z = 0 plane for a frame `h` px high: objects there are drawn at 1:1. */
export const planeDistance = (h: number, fov = FOV) => h / 2 / Math.tan((fov * Math.PI) / 360);

type StageProps = {
  frame: number; // film frame to draw (fractional is fine: sub-frame renders)
  light?: Light3D;
  backdrop?: Backdrop;
  samples?: number; // exactly this many samples a frame (default: 12 while something moves in renders, more when a part's lens asks, 3 in the Studio)
  shutter?: number; // degrees of shutter (default 180; 0 = no motion blur)
  shadows?: boolean; // the key casts shadows (contact shadows under objects)
  shadowBox?: number; // half size (px) of the key's shadow box around the origin
  fov?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

const SceneSetup: React.FC<{ light: LightFull; camera: THREE.PerspectiveCamera; keyLight: THREE.DirectionalLight; shadows: boolean }> = ({ light, camera, keyLight, shadows }) => {
  const { gl, scene, size } = useThree();
  const env = useMemo(() => stageEnv(gl, light), [gl, light]);
  useEffect(() => () => env.dispose(), [env]);
  useLayoutEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = light.env;
    scene.background = null;
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = THREE.PCFShadowMap; // r18x: PCF is soft; the key's jitter across samples softens it further
    // frosted and thin glass read the scene behind them at half resolution: a quarter of the cost, the frost blurs it anyway
    gl.transmissionResolutionScale = 0.5;
  }, [scene, env, light, gl, shadows]);
  useLayoutEffect(() => {
    camera.aspect = size.width / Math.max(1, size.height);
    camera.position.set(0, 0, planeDistance(size.height, camera.fov));
    camera.lookAt(0, 0, 0);
    camera.near = 2;
    camera.far = planeDistance(size.height, camera.fov) * 8;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return (
    <>
      <primitive object={keyLight} />
      <primitive object={keyLight.target} />
    </>
  );
};

/** The full-frame 3D stage a part draws into (see the file's header). */
export const Stage3D: React.FC<StageProps> = ({ frame, light, backdrop, samples, shutter = 180, shadows = false, shadowBox = 700, fov = FOV, children, style }) => {
  const { width, height } = useVideoConfig();
  const env = getRemotionEnvironment();
  const L = useMemo(() => lightOf(light), [light]);
  const plateTex = useTextures([typeof backdrop === 'string' ? backdrop : undefined], 2048);
  const camera = useMemo(() => new THREE.PerspectiveCamera(fov, width / height, 2, 40000), [fov, width, height]);
  const keyLight = useMemo(() => {
    const k = new THREE.DirectionalLight(L.key, L.keyIntensity);
    k.castShadow = shadows;
    k.shadow.mapSize.set(1024, 1024);
    const c = k.shadow.camera;
    c.left = -shadowBox;
    c.right = shadowBox;
    c.top = shadowBox;
    c.bottom = -shadowBox;
    c.near = 100;
    c.far = 9000;
    k.shadow.bias = -0.0004;
    k.shadow.normalBias = 1.5;
    k.target.position.set(0, 0, 0);
    return k;
  }, [L, shadows, shadowBox]);
  const appliers = useRef(new Set<Applier>());
  const reg = useMemo(
    () => ({
      add: (fn: Applier) => {
        appliers.current.add(fn);
        return () => {
          appliers.current.delete(fn);
        };
      },
    }),
    [],
  );
  if (!plateTex) return null; // textures load first (delayRender holds the frame)
  const n = samples ?? (env.isRendering ? 12 : 3);
  const dpr = typeof window === 'undefined' ? 1 : Math.min(2, Math.max(0.25, window.devicePixelRatio || 1));
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={dpr}
      flat
      linear
      style={{ position: 'absolute', left: 0, top: 0, ...style }}
      gl={{ antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false }}
    >
      <SamplerCtx.Provider value={reg}>
        <CameraCtx.Provider value={camera}>
          <SceneSetup light={L} camera={camera} keyLight={keyLight} shadows={shadows} />
          {backdrop !== undefined && <PlateMesh backdrop={backdrop} tex={plateTex[0]} aspect={width / height} />}
          {children}
          <Accumulator frame={frame} samples={n} fixed={samples !== undefined} stillSamples={Math.min(n, 4)} shutter={shutter} appliers={appliers} camera={camera} keyLight={keyLight} light={L} />
        </CameraCtx.Provider>
      </SamplerCtx.Provider>
    </ThreeCanvas>
  );
};

// -------------------------------------------------------------------------------------------------- small math

/** Clamp to 0..1. */
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Smooth 0..1 ramp between a and b. */
export const ramp = (x: number, a: number, b: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Linear mix. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Degrees to radians. */
export const deg = (d: number) => (d * Math.PI) / 180;
