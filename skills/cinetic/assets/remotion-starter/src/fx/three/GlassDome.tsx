// glass-dome: a small world under glass. A thin glass dome (clear at the centre, bright at its rims, a soap-film sheen)
// sits on a soft white platform with a rounded rim and a grey bowl beneath it, floating over the film's plate (clouds,
// sky, a field); inside, the idea in miniature: a desk with a laptop showing the product's own screen, the brand's mark
// on a plinth, or a hero object. Official icons can float around it as frosted glass tiles at different depths. The
// camera makes one designed move and lands: 'push' (in from wide and low), 'orbit' (an arc around the dome that lands
// facing it, the light stage's highlights travelling over the glass) or 'dive' (from the whole dome into a macro of
// what is inside, through the glass, focus shallow). The world holds still; only the camera moves, once.
// Without hardware WebGL the part draws a clean flat dome with the same layout (no move).
// cinetic:device-palette diorama materials: the platform's white clay, the grey bowl, the desk and the aluminium are
// object colours, not brand colours
import React, { useEffect, useMemo } from 'react';
import { Img, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import type { Logo } from '../../brand/Mark';
import { E, rand } from '../../lib/anim';
import { canvasTex, contactTex, disposeAll, fitUv, markSolid, roundedRect, slabGeometry, thinGlass } from './geo';
import { draws3D, type GlMode } from './gl';
import { makeTile, TILES } from './GlassTiles';
import { heroSolid, type HeroKind } from './HeroObject';
import type { Light3D } from './light';
import { type Backdrop, clamp01, deg, filmLit, lerp, planeDistance, Stage3D, useSampler, useStageCamera, useTextures } from './stage';

/**
 * House numbers (f@60, px@1080, degrees; lengths as shares of the dome's radius R): the dome's diameter; the move;
 * the platform (radius, thickness, the bowl's depth); the rest view (the eye just above the platform: it looks down
 * 1.5 deg at a point 0.1 R above the platform, so the platform reads as a thick disc); the moves
 * (orbit arc, push start distance, dive magnification); the lens (aperture as a share of the focus distance); the
 * tiles' ring (radius, tile size).
 */
export const DOME = { size: 1080, dur: 150, base: 1.16, baseH: 0.24, bowl: 0.42, pitch: 1.5, aim: 0.1, orbit: 32, push: 1.5, dive: 4.2, aperture: 0.012, ring: 1.3, tile: 0.3 };

export const RECIPE = {
  id: 'glass-dome',
  recipe:
    'A small world under a thin glass dome (clear centre, bright rims, a soap-film sheen) on a thick white platform with a grey bowl, floating over the film\'s plate, big in frame (1080 px across) with the eye just above the platform; inside: a wooden desk with a laptop showing the product\'s screen, the mark on a plinth, or a hero object; official icons as milky glass tiles around it at mid height in depth. One camera move that lands (150 f): push (in from x1.5 and lower, settleOut), orbit (a 32 deg arc landing face-on, strongInOut; the highlights travel over the glass) or dive (from the whole dome into a x4.2 macro of the inside, through the glass, shallow focus). Nothing else moves.',
  params: { ...DOME },
};

export type DomeMove = 'push' | 'orbit' | 'dive' | 'hold';
export type DomeInside = 'laptop' | 'mark' | 'none' | HeroKind;

export type GlassDomeProps = {
  /** What stands inside: 'laptop' (a desk and a laptop showing `screen`), 'mark' (the brand's mark on a plinth), a hero object kind, or 'none'. */
  inside?: DomeInside;
  /** The product's own screen (staticFile image) on the laptop or the phone. */
  screen?: string;
  /** The brand's mark (logoParts of its SVG) for 'mark' and for a card or coin inside. */
  mark?: Logo;
  /** Official icon files floating around the dome as frosted glass tiles. */
  icons?: string[];
  move?: DomeMove;
  at?: number;
  /** Length of the move, f@60 (default 150). */
  dur?: number;
  /** The dome's diameter in px at rest (default 860). */
  size?: number;
  /** Where the dome's centre sits at rest (px from the top-left; default the frame's centre). */
  x?: number;
  y?: number;
  light?: Light3D;
  /** The plate the world floats over (the same picture the film shows), drawn inside the canvas so the glass can show it. */
  backdrop?: Backdrop;
  samples?: number;
  gl?: GlMode;
  seed?: number | string;
};

type Built = { group: THREE.Group; dispose: () => void };

const clay = (color: string, rough = 0.55) => filmLit(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: rough, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(1, 1, 1) }), color);
const phys = (color: string, p: THREE.MeshPhysicalMaterialParameters) => filmLit(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), ...p }), color);

/**
 * A soap film's thickness over a dome (the sphere's v: 1 at the top, 0 at the base): thin at the crown, thicker toward
 * the rim, with slow swirls, so the sheen breaks into soft rainbow bands instead of one tint. Deterministic.
 */
export const filmTex = () =>
  canvasTex(64, 256, (g) => {
    const img = g.createImageData(64, 256);
    for (let y = 0; y < 256; y++) {
      const v = 1 - y / 255; // canvas row 0 is the texture's top (v = 1)
      for (let x = 0; x < 64; x++) {
        const u = x / 64;
        const t = 0.18 + 0.72 * Math.pow(1 - v, 0.85) + 0.07 * Math.sin(u * Math.PI * 6 + v * 9) + 0.05 * Math.sin(u * Math.PI * 14 - v * 17);
        const c = Math.round(255 * Math.min(1, Math.max(0, t)));
        const k = (y * 64 + x) * 4;
        img.data[k] = c;
        img.data[k + 1] = c;
        img.data[k + 2] = c;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });

/** The platform: a thick white disc with a fully rounded rim, a grey bowl beneath (top surface at y = 0). */
const platform = (R: number): Built => {
  const group = new THREE.Group();
  const rb = R * DOME.base;
  const h = R * DOME.baseH;
  const e = h / 2;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.001, -h)];
  pts.push(new THREE.Vector2(rb - e, -h));
  for (let i = 1; i < 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI;
    pts.push(new THREE.Vector2(rb - e + Math.cos(a) * e, -e + Math.sin(a) * e));
  }
  pts.push(new THREE.Vector2(rb - e, 0), new THREE.Vector2(0.001, 0));
  const disc = new THREE.Mesh(new THREE.LatheGeometry(pts, 128), clay('#E9EBEE', 0.38));
  disc.material.side = THREE.DoubleSide;
  disc.receiveShadow = true;
  disc.castShadow = true;
  group.add(disc);
  // the bowl: an ellipse from under the rim to a soft point below the centre
  const bowl: THREE.Vector2[] = [];
  const br = rb * 0.9;
  const bd = R * DOME.bowl;
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * (Math.PI / 2);
    bowl.push(new THREE.Vector2(Math.max(0.001, br * Math.sin(a)), -h - bd * Math.cos(a) + 0.5));
  }
  const under = new THREE.Mesh(new THREE.LatheGeometry(bowl, 128), clay('#7E8690', 0.5));
  under.material.side = THREE.DoubleSide;
  group.add(under);
  // the seat the glass stands in: a soft ring
  const seat = new THREE.Mesh(new THREE.TorusGeometry(R * 1.006, R * 0.022, 16, 160), clay('#E7E9EC', 0.45));
  seat.rotation.x = Math.PI / 2;
  seat.position.y = R * 0.006;
  seat.receiveShadow = true;
  group.add(seat);
  return { group, dispose: disposeAll(group) };
};

/** The dome: a hemisphere of radius R on y = 0, two thin-glass shells (the far wall, then the near one). */
const dome = (R: number): Built => {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(R, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const film = filmTex();
  film.colorSpace = THREE.NoColorSpace; // data, not colour
  // the far wall reflects less (it would draw the light stage's strips as arcs inside); the sheen stays a soft film
  const back = new THREE.Mesh(geo, thinGlass(THREE.BackSide, 0.35, film, 0.9));
  const front = new THREE.Mesh(geo, thinGlass(THREE.FrontSide, 0.6, film, 1.2));
  back.renderOrder = 5;
  front.renderOrder = 6;
  group.add(back, front);
  return { group, dispose: disposeAll(group) };
};

/** A laptop from primitives (w px wide), open, the screen on the lid; its base on y = 0, the screen facing +z. */
export const laptopSolid = (w: number, screen: THREE.Texture | null, color = '#C3C7CD'): Built => {
  const group = new THREE.Group();
  const d = w * 0.68;
  const t = w * 0.028;
  const alu = phys(color, { metalness: 1, roughness: 0.32, clearcoat: 0.15, clearcoatRoughness: 0.2 });
  const deck = new THREE.Mesh(slabGeometry(w, d, t, w * 0.035, 0.32), alu);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = t / 2;
  group.add(deck);
  const well = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(w * 0.86, d * 0.42, w * 0.012), 4), phys('#16171A', { roughness: 0.7 }));
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, t + 0.15, -d * 0.1);
  group.add(well);
  // blank keycaps, one instanced mesh: 13 x 5 keys and a space bar row (they read as a keyboard in a macro)
  const cols = 13;
  const rows = 5;
  const kw = (w * 0.84) / cols;
  const kd = (d * 0.4) / (rows + 1);
  const cap = new THREE.BoxGeometry(kw * 0.84, Math.max(0.6, t * 0.22), kd * 0.82);
  const keyMat = phys('#2A2C31', { roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const keys = new THREE.InstancedMesh(cap, keyMat, cols * rows + 3);
  const mtx = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      mtx.makeTranslation(-w * 0.42 + kw * (c + 0.5), t + 0.4, -d * 0.1 - d * 0.2 + kd * (r + 0.5));
      keys.setMatrixAt(n++, mtx);
    }
  // the bottom row: a wide space bar between two short keys each side
  for (const [cx, sx] of [[0, 5.2], [-w * 0.3, 1.6], [w * 0.3, 1.6]] as const) {
    mtx.makeScale(sx, 1, 1).setPosition(cx, t + 0.4, -d * 0.1 - d * 0.2 + kd * (rows + 0.5));
    keys.setMatrixAt(n++, mtx);
  }
  keys.count = n;
  group.add(keys);
  const pad = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(w * 0.34, d * 0.25, w * 0.016), 4), phys(color, { metalness: 1, roughness: 0.22 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, t + 0.2, d * 0.29);
  group.add(pad);
  const lid = new THREE.Group();
  lid.position.set(0, t, -d / 2 + w * 0.01);
  const lh = d * 0.95;
  const lt = w * 0.016;
  const shell = new THREE.Mesh(slabGeometry(w, lh, lt, w * 0.035, 0.32), alu);
  shell.position.set(0, lh / 2, -lt / 2);
  lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(w * 0.985, lh * 0.975, w * 0.03), 6), phys('#0A0B0D', { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }));
  bezel.position.set(0, lh / 2, 0.25);
  lid.add(bezel);
  const sw = w * 0.93;
  const sh = lh * 0.9;
  const scr = new THREE.Mesh(
    fitUv(new THREE.ShapeGeometry(roundedRect(sw, sh, w * 0.008), 4)),
    screen ? new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }) : phys('#15171B', { roughness: 0.1, clearcoat: 1 }),
  );
  scr.position.set(0, lh / 2 + lh * 0.01, 0.5);
  lid.add(scr);
  // the screen's cover glass: reflections over the picture, the picture itself untouched
  const cover = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(w * 0.985, lh * 0.975, w * 0.03), 6), thinGlass(THREE.FrontSide, 0));
  cover.position.set(0, lh / 2, 0.9);
  cover.renderOrder = 4;
  lid.add(cover);
  lid.rotation.x = -deg(14); // opened a little past upright
  group.add(lid);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  return { group, dispose: disposeAll(group) };
};

/** A small desk (w px wide) with the laptop on it, a contact shadow under the legs; the floor at y = 0. */
const deskScene = (w: number, screen: THREE.Texture | null, mirror: number): Built & { focus: THREE.Vector3 } => {
  const group = new THREE.Group();
  const dd = w * 0.46;
  const dh = w * 0.34;
  const top = w * 0.04;
  const wood = phys('#A8937F', { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35, sheen: 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color(1, 1, 1) });
  const board = new THREE.Mesh(slabGeometry(w, dd, top, w * 0.03, 0.35), wood);
  board.rotation.x = -Math.PI / 2;
  board.position.y = dh - top / 2;
  group.add(board);
  const leg = new THREE.BoxGeometry(w * 0.045, dh - top, w * 0.045);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const m = new THREE.Mesh(leg, wood);
    m.position.set(lx * (w / 2 - w * 0.05), (dh - top) / 2, lz * (dd / 2 - w * 0.05));
    group.add(m);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, dd * 1.6), new THREE.MeshBasicMaterial({ map: contactTex(), color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.6;
  group.add(shadow);
  const lw = w * 0.62;
  const lap = laptopSolid(lw, screen);
  lap.group.position.set(0, dh, -dd * 0.06);
  lap.group.rotation.y = deg(-8 * mirror);
  group.add(lap.group);
  // a small plant at the far end of the desk: a white pot, a few long leaves
  const plant = new THREE.Group();
  const potH = w * 0.075;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.04, w * 0.032, potH, 32), clay('#F1F2F4', 0.4));
  pot.position.y = potH / 2;
  plant.add(pot);
  const leafGeo = new THREE.SphereGeometry(1, 16, 10);
  const leafMat = phys('#4F7F5E', { roughness: 0.48, sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color('#9CC7A8') });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const tilt = 0.32 + 0.22 * ((i * 37) % 5) / 5;
    const len = w * (0.085 + 0.02 * ((i * 53) % 3));
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.set(w * 0.016, len / 2, w * 0.006);
    leaf.position.set(Math.sin(a) * Math.sin(tilt) * len * 0.5, potH + Math.cos(tilt) * len * 0.5, Math.cos(a) * Math.sin(tilt) * len * 0.5);
    leaf.rotation.set(tilt, a, 0, 'YXZ'); // heading a, then leaning out by tilt: the tip points along its position
    plant.add(leaf);
  }
  plant.position.set(mirror * w * 0.38, dh, -dd * 0.18);
  group.add(plant);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m !== shadow) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  // the macro's focus: the middle of the laptop's screen
  const focus = new THREE.Vector3(0, dh + lw * 0.68 * 0.47, -dd * 0.06 - lw * 0.3);
  return { group, focus, dispose: disposeAll(group) };
};

/** The mark standing on a round plinth (mark size s px). */
const markScene = (s: number, mark: Logo): Built & { focus: THREE.Vector3 } => {
  const group = new THREE.Group();
  const plinthH = s * 0.12;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.42, s * 0.44, plinthH, 96), clay('#E9EBEE', 0.45));
  plinth.position.y = plinthH / 2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);
  const m = markSolid(mark, 22, 2.2, 'gloss');
  const k = s / 100;
  m.root.scale.setScalar(k);
  const bh = (m.box.max.y - m.box.min.y) * k;
  m.root.position.set(0, plinthH + bh / 2, (m.thickness * k) / 2);
  group.add(m.root);
  const focus = new THREE.Vector3(0, plinthH + bh / 2, 0);
  return { group, focus, dispose: disposeAll(group) };
};

type Pose = { pos: THREE.Vector3; target: THREE.Vector3 };

/** The camera at progress p of the move (world px-units; the dome's base centre at the origin). */
export const domePose = (move: DomeMove, p: number, R: number, Dr: number, offset: { x: number; y: number }, inside: THREE.Vector3, mirror: number): Pose => {
  const rest = new THREE.Vector3(offset.x, offset.y + R * DOME.aim, 0);
  let yaw = 0;
  let pitch = DOME.pitch;
  let dist = Dr;
  let target = rest.clone();
  if (move === 'push') {
    const e = E.settleOut(clamp01(p));
    dist = Dr * lerp(DOME.push, 1, e);
    pitch = lerp(DOME.pitch - 3, DOME.pitch, e);
    yaw = mirror * lerp(9, 0, e);
  } else if (move === 'orbit') {
    const e = E.strongInOut(clamp01(p));
    yaw = mirror * DOME.orbit * (1 - e);
    pitch = lerp(DOME.pitch + 6, DOME.pitch, e);
    dist = Dr * lerp(1.1, 1, e);
  } else if (move === 'dive') {
    const e = E.strongInOut(clamp01(p));
    target = rest.clone().lerp(inside, e);
    dist = Dr * Math.exp(-Math.log(DOME.dive) * e);
    pitch = lerp(DOME.pitch, DOME.pitch + 5, e);
    yaw = mirror * 16 * e;
  }
  const dir = new THREE.Vector3(Math.sin(deg(yaw)) * Math.cos(deg(pitch)), Math.sin(deg(pitch)), Math.cos(deg(yaw)) * Math.cos(deg(pitch)));
  return { pos: target.clone().addScaledVector(dir, dist), target };
};

/** Where n tiles float around a dome of radius R (world px-units, y up). */
export const domeTilePlaces = (n: number, R: number, seed: number | string = 0) =>
  Array.from({ length: n }, (_, i) => {
    // both sides of the dome, from the front quarter (near the camera, soft in the lens) round to the back (seen beside and
    // through the glass); never in front of what is inside, never straight behind it
    const side = i % 2 === 0 ? 1 : -1;
    const m = side > 0 ? Math.ceil(n / 2) : Math.floor(n / 2);
    const u = m <= 1 ? 0.5 : Math.floor(i / 2) / (m - 1);
    // 26 deg (in front, over the dome's edge on screen) round to 150 deg (behind); the side one highest: none hides another
    const a = deg((side > 0 ? 26 + 124 * u : 334 - 124 * u) + 6 * (rand(`dome-tiles:${seed}:${i}`) - 0.5));
    const r = R * DOME.ring;
    const h = 0.4 + 0.3 * Math.sin(Math.PI * u) - 0.06 * u + (side > 0 ? 0 : 0.05);
    return new THREE.Vector3(Math.sin(a) * r, R * h + R * 0.04 * (rand(`dome-tiles:${seed}:y${i}`) - 0.5), Math.cos(a) * r);
  });

type SceneProps = { inside: DomeInside; screen: THREE.Texture | null; mark?: Logo; icons: (THREE.Texture | null)[]; move: DomeMove; at: number; durF: number; R: number; x: number; y: number; W: number; H: number; mirror: number; seed: string };

const DomeScene: React.FC<SceneProps> = ({ inside, screen, mark, icons, move, at, durF, R, x, y, W, H, mirror, seed }) => {
  const camera = useStageCamera();
  const world = useMemo(() => {
    const root = new THREE.Group();
    const parts: Built[] = [platform(R), dome(R)];
    let focus = new THREE.Vector3(0, R * 0.3, 0);
    if (inside === 'laptop') {
      const d = deskScene(R * 1.0, screen, mirror);
      parts.push(d);
      focus = d.focus;
    } else if (inside === 'mark' && mark) {
      const m = markScene(R * 0.62, mark);
      parts.push(m);
      focus = m.focus;
    } else if (inside !== 'none' && inside !== 'mark') {
      const s = inside === 'coin' ? R * 0.55 : inside === 'phone' ? R * 0.8 : R * 0.7;
      const h = heroSolid(inside, s, { screen, mark, seed });
      const box = new THREE.Box3().setFromObject(h.group);
      h.group.position.y = -box.min.y + 0.5;
      h.group.rotation.y = deg(-14 * mirror);
      parts.push(h);
      focus = new THREE.Vector3(0, (box.max.y - box.min.y) / 2, 0);
    }
    const ts = R * DOME.tile;
    const places = domeTilePlaces(icons.length, R, seed);
    icons.forEach((tex, i) => {
      const t = makeTile(ts, tex, TILES.frost);
      t.group.position.copy(places[i]);
      root.add(t.group);
      parts.push(t);
    });
    parts.forEach((p) => {
      if (!p.group.parent) root.add(p.group);
    });
    return { root, focus, dispose: () => parts.forEach((p) => p.dispose()) };
  }, [inside, screen, mark, icons, R, mirror, seed]);
  useEffect(() => () => world.dispose(), [world]);
  const Dr = planeDistance(H);
  const offset = { x: W / 2 - x, y: y - H / 2 };
  useSampler((t) => {
    const p = clamp01((t - at) / durF);
    const pose = domePose(move, p, R, Dr, offset, world.focus, mirror);
    if (camera) {
      camera.position.copy(pose.pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld();
    }
    const focus = pose.pos.distanceTo(pose.target);
    const moving = move !== 'hold' && p > 0 && p < 1;
    return { aperture: DOME.aperture * focus, focus, still: !moving && DOME.aperture === 0, moving, samples: move === 'dive' && p > 0.4 ? 16 : 12 };
  });
  return <primitive object={world.root} />;
};

/** The flat drawing (no WebGL): the platform, the dome's outline and sheen, the screen inside, the tiles around. */
const FlatDome: React.FC<{ inside: DomeInside; screen?: string; icons: string[]; R: number; x: number; y: number; H: number; seed: string }> = ({ inside, screen, icons, R, x, y: cy, H, seed }) => {
  const Dr = planeDistance(H);
  const persp = (z: number) => Dr / Math.max(1, Dr - z);
  const rb = R * DOME.base;
  const h = R * DOME.baseH;
  const places = domeTilePlaces(icons.length, R, seed);
  const ts = R * DOME.tile;
  // the platform's top where the 3D rest view puts it (the camera aims a little above it), its top seen from the eye's height
  const y = cy + R * DOME.aim;
  const k = Math.sin(deg(DOME.pitch + 2.5));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {places
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.z < 0)
        .map(({ p, i }) => (
          <FlatTile key={i} src={icons[i]} x={x + p.x * persp(p.z)} y={y - p.y * persp(p.z)} s={ts * persp(p.z)} dim />
        ))}
      <div style={{ position: 'absolute', left: x - rb * 0.9, top: y + h * 0.5, width: rb * 1.8, height: R * DOME.bowl * 1.4, borderRadius: '0 0 50% 50% / 0 0 100% 100%', background: 'linear-gradient(180deg, #A9AEB5, #C9CDD3 70%, #DADDE1)' }} />
      <div style={{ position: 'absolute', left: x - rb, top: y - rb * k, width: rb * 2, height: rb * k * 2 + h, borderRadius: `${rb}px / ${rb * k + h / 2}px`, background: 'linear-gradient(180deg, #FFFFFF, #F1F2F4 46%, #DCDFE3)', boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset' }} />
      {inside === 'laptop' && screen ? (
        <div style={{ position: 'absolute', left: x - R * 0.24, top: y - R * 0.62, width: R * 0.48, height: R * 0.3, borderRadius: R * 0.02, background: '#0A0B0D', padding: R * 0.012, boxSizing: 'border-box' }}>
          <Img src={screen} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: R * 0.01, display: 'block' }} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R, borderRadius: `${R}px ${R}px 0 0`, background: 'radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.28), rgba(255,255,255,0.06) 55%, rgba(255,255,255,0.16))', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.75), inset 0 0 28px rgba(255,255,255,0.35)' }} />
      {places
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.z >= 0)
        .map(({ p, i }) => (
          <FlatTile key={i} src={icons[i]} x={x + p.x * persp(p.z)} y={y - p.y * persp(p.z)} s={ts * persp(p.z)} />
        ))}
    </div>
  );
};

const FlatTile: React.FC<{ src: string; x: number; y: number; s: number; dim?: boolean }> = ({ src, x, y, s, dim }) => (
  <div style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: s * TILES.radius, background: 'linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))', boxShadow: `inset 0 0 0 ${Math.max(1, s * 0.014)}px rgba(255,255,255,0.9), 0 ${s * 0.06}px ${s * 0.18}px rgba(0,0,0,0.1)`, opacity: dim ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Img src={src} style={{ width: s * TILES.icon, height: s * TILES.icon, objectFit: 'contain' }} />
  </div>
);

/** A small world under a glass dome (see the file's header). */
export const GlassDome: React.FC<GlassDomeProps> = ({ inside = 'laptop', screen, mark, icons = [], move = 'push', at = 0, dur = DOME.dur, size = DOME.size, x, y, light, backdrop, samples, gl = 'auto', seed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const durF = (dur * fps) / 60;
  const R = size / 2;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const mirror = rand(`glass-dome:${seed}`) < 0.5 ? -1 : 1;
  const three = draws3D(gl);
  const usesScreen = inside === 'laptop' || inside === 'phone';
  const scr = useTextures([three && usesScreen ? screen : undefined], 1600);
  const tiles = useTextures(three ? icons : [], 512, true);
  if (!three) return <FlatDome inside={inside} screen={screen} icons={icons} R={R} x={cx} y={cy} H={H} seed={String(seed)} />;
  if (!scr || !tiles) return null;
  return (
    <Stage3D frame={frame} light={light ?? { stage: 'sky' }} backdrop={backdrop} samples={samples} shadows shadowBox={R * 1.4}>
      <DomeScene inside={inside} screen={scr[0]} mark={mark} icons={tiles} move={move} at={at} durF={durF} R={R} x={cx} y={cy} W={W} H={H} mirror={mirror} seed={String(seed)} />
    </Stage3D>
  );
};
