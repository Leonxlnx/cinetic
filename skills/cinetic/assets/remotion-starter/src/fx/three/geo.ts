// Shared geometry and materials for fx/three: rounded slabs (tiles, phones, cards), the brand's mark as an extruded solid
// (Logo3D, the card, the coin, the parcel label, the dome's plinth), canvas textures and disposal. Px-units (the stage's
// z = 0 plane is the frame at 1:1), y up, the face toward the camera (+z). Built once per prop change, never per frame.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Logo } from '../../brand/Mark';
import { deg, filmLit } from './stage';

/** A rounded rectangle centred on the origin. */
export const roundedRect = (w: number, h: number, r: number): THREE.Shape => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const q = Math.max(0.001, Math.min(r, w / 2, h / 2));
  s.moveTo(x + q, y);
  s.lineTo(x + w - q, y);
  s.quadraticCurveTo(x + w, y, x + w, y + q);
  s.lineTo(x + w, y + h - q);
  s.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  s.lineTo(x + q, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - q);
  s.lineTo(x, y + q);
  s.quadraticCurveTo(x, y, x + q, y);
  return s;
};

/** A thick round-edged slab of a rounded rectangle, centred (front face at +depth/2); `edge` is the bevel's share of the depth. */
export const slabGeometry = (w: number, h: number, depth: number, radius: number, edge = 0.45): THREE.BufferGeometry => {
  const bev = Math.min(depth * edge, radius * 0.95, w / 4, h / 4);
  const core = Math.max(0.01, depth - 2 * bev);
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(roundedRect(w, h, radius), { depth: core, bevelEnabled: bev > 0.01, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 8, curveSegments: 18 });
  g = toCreasedNormals(g, deg(55));
  g.translate(0, 0, -core / 2);
  return g;
};

/** UVs 0..1 over a geometry's x/y bounding box (planar, seen from the front). */
export const fitUv = <G extends THREE.BufferGeometry>(g: G): G => {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - b.min.x) / Math.max(1e-6, b.max.x - b.min.x);
    uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / Math.max(1e-6, b.max.y - b.min.y);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};

/** A canvas texture drawn by `draw` (w x h px), sRGB, mipmapped. */
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (g) draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** A soft round contact shadow (a radial falloff) as a texture: lay it under an object, just above the ground. */
export const contactTex = () =>
  canvasTex(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,1)');
    r.addColorStop(0.35, 'rgba(0,0,0,0.55)');
    r.addColorStop(0.7, 'rgba(0,0,0,0.14)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
  });

/** Dispose every geometry, material and map under an object. */
export const disposeAll = (root: THREE.Object3D) => () =>
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((x) => {
      // every texture the material holds (maps, film thickness, ...)
      for (const v of Object.values(x)) if (v instanceof THREE.Texture) v.dispose();
      x.dispose();
    });
  });

/** Finishes for a solid mark: a black lacquer, a soft satin, polished metal, or clear glass tinted by the fill. */
export type Finish = 'gloss' | 'satin' | 'metal' | 'glass';

export const FINISH: Record<Finish, THREE.MeshPhysicalMaterialParameters> = {
  gloss: { roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1, ior: 1.7 },
  satin: { roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.28, specularIntensity: 0.8 },
  metal: { roughness: 0.26, metalness: 1, clearcoat: 0.2, clearcoatRoughness: 0.1 },
  glass: { roughness: 0.05, metalness: 0, transmission: 1, ior: 1.5, dispersion: 0.25, clearcoat: 0, specularIntensity: 1 },
};

/** The mark's filled shapes grouped by fill colour, in mark units (the 100 box) with y up. */
export const markShapes = (logo: Logo, curve = 40): Map<string, THREE.Shape[]> => {
  const items = logo.parts.flatMap((p) => p.items).filter((it) => it.fill && it.fill !== 'none');
  const esc = (s: string) => s.replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${items
    .map((it) => `<path d="${esc(it.d)}" fill="${esc(it.fill)}"${it.transform ? ` transform="${esc(it.transform)}"` : ''}${it.fillRule ? ` fill-rule="${it.fillRule}"` : ''}/>`)
    .join('')}</svg>`;
  const data = new SVGLoader().parse(svg);
  const out = new Map<string, THREE.Shape[]>();
  for (const path of data.paths) {
    const fill = String((path.userData as { style?: { fill?: string } } | undefined)?.style?.fill ?? '#000000');
    for (const sh of SVGLoader.createShapes(path)) {
      // flip y (SVG is y down) on sampled points; ExtrudeGeometry re-orients the winding itself
      const pts = sh.extractPoints(curve);
      const flip = (v: THREE.Vector2[]) => v.map((p) => new THREE.Vector2(p.x, -p.y));
      const s = new THREE.Shape(flip(pts.shape));
      s.holes = pts.holes.map((h) => new THREE.Path(flip(h)));
      out.set(fill, [...(out.get(fill) ?? []), s]);
    }
  }
  return out;
};

export type MarkSolid = {
  /** Pivot at the mark's centre, the face on z = 0, the body behind it (toward -z); mark units (scale it by size / 100). */
  root: THREE.Group;
  /** The extrusion (scale its z to press the depth flat). */
  body: THREE.Group;
  /** The mark's centre in mark units (y up: the SVG's y negated). */
  centre: THREE.Vector2;
  box: THREE.Box3;
  /** Depth plus both bevels, mark units: how far the body reaches behind the face. */
  thickness: number;
  /** 0..1: blends every face to its flat fill colour (the invisible swap to the 2D lockup). */
  flat: { value: number };
  dispose: () => void;
};

/**
 * The brand's mark as an extruded solid: one mesh per fill colour, bevelled, in a physical finish (`color` paints every
 * part one colour: a white mark on a card, a metal one on a coin). Fills only; strokes are not extruded.
 */
export const markSolid = (logo: Logo, depth: number, bevel: number, finish: Finish = 'gloss', color?: string): MarkSolid => {
  const flat = { value: 0 };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const box = new THREE.Box3();
  const meshes: THREE.Mesh[] = [];
  for (const [fill, shapes] of markShapes(logo)) {
    let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 5, curveSegments: 40 });
    g = toCreasedNormals(g, deg(38));
    g.computeBoundingBox();
    box.union(g.boundingBox!);
    const paint = color ?? fill;
    const col = new THREE.Color(paint);
    const params: THREE.MeshPhysicalMaterialParameters = { ...FINISH[finish], color: col };
    if (finish === 'glass') Object.assign(params, { thickness: depth, attenuationColor: col, attenuationDistance: depth * 3, color: new THREE.Color(1, 1, 1).lerp(col, 0.35) });
    const mat = filmLit(new THREE.MeshPhysicalMaterial(params), paint, flat);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    meshes.push(mesh);
  }
  const centre = new THREE.Vector2((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2);
  for (const m of meshes) {
    // pivot at the mark's centre, the face toward the camera on z = 0, the body behind it
    m.position.set(-centre.x, -centre.y, -box.max.z);
    body.add(m);
  }
  return {
    root,
    body,
    centre,
    box,
    thickness: box.max.z - box.min.z,
    flat,
    dispose: () =>
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }),
  };
};

const GLASS_FS_END = /* glsl */ `
  {
    // thin glass: the reflection (three's specular, already Fresnel-weighted) is added in full; the background behind is
    // dimmed only by the Fresnel share it reflects (blending: ONE, ONE_MINUS_SRC_ALPHA)
    float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
    float fr = uGlassBase + (1.0 - uGlassBase) * pow(1.0 - nv, 5.0);
    gl_FragColor = vec4(cineticGlassTone(gl_FragColor.rgb), fr);
  }
}
`;
const GLASS_TONE = /* glsl */ `
uniform float uGlassBase;
vec3 cineticGlassTone(vec3 c) {
  float peak = max(c.r, max(c.g, c.b));
  if (peak <= 0.8) return c;
  float np = 1.0 - 0.04 / (peak - 0.6);
  return c * (np / peak);
}
`;

/** A thin glass shell material: reflections in full, the background through it barely dimmed (see GLASS_FS_END). */
export const thinGlass = (side: THREE.Side, sheen = 1, film?: THREE.Texture, env = 1.6) => {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.035,
    metalness: 0,
    ior: 1.8,
    envMapIntensity: env,
    specularIntensity: 1,
    iridescence: sheen,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [140, 680],
    iridescenceThicknessMap: film ?? null,
    transparent: true,
    depthWrite: false,
    side,
  });
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  const u = { uGlassBase: { value: 0.025 } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlassBase = u.uGlassBase;
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `${GLASS_TONE}\nvoid main() {`).replace(/\}\s*$/, GLASS_FS_END);
  };
  m.customProgramCacheKey = () => 'cinetic-thin-glass';
  return m;
};
