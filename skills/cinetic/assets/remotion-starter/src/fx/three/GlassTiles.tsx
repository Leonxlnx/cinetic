// glass-tiles: the products a film works with as frosted glass tiles floating in depth, each official icon crisp on
// the face of a thick, round-edged glass square whose edges refract the plate behind and catch the light stage as rim
// light (a thin-film sheen and a little dispersion on the bevels). One designed move: 'arrive' (the tiles rise into
// frame from below and behind, turning to face the camera, outward from the centre, while the camera pushes in once
// and lands), or 'pass' (the tiles hold in depth and the camera tracks past them, landing on the chosen tile as the
// focus pulls to it). Tiles face the camera at rest; nothing bobs.
// Pass the film's plate as `backdrop` (the same picture the film shows behind) so the glass refracts it; without one
// the canvas is transparent and the glass reads as clear, lit edges over whatever is behind.
// Without hardware WebGL the part draws the same layout flat: frosted 2D tiles with the icons, the same move in 2D.
// cinetic:device-palette glass: the clear white of glass and its frost are light, not brand colours
import React, { useEffect, useMemo } from 'react';
import { Img, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { E, rand } from '../../lib/anim';
import { slabGeometry } from './geo';
import { draws3D, type GlMode } from './gl';
import type { Light3D } from './light';
import { type Backdrop, clamp01, deg, filmLit, lerp, planeDistance, Stage3D, useSampler, useTextures } from './stage';

/**
 * House numbers (f@60, px@1080): tile size; depth, corner radius and icon size as shares of the size; frost (0 clear
 * .. 1 milky); the arrival (stagger between tiles, each tile's flight, how far below and behind it starts, its turn);
 * the camera (push from x1.3 of the plane distance, the shot's length) and the lens (aperture as a share of focus);
 * the row's width (share of the frame) and how far its outer tiles come toward the camera (px).
 */
export const TILES = { size: 330, depth: 0.42, radius: 0.27, icon: 0.6, frost: 0.5, stagger: 6, arrive: 48, back: 560, turn: 34, push: 1.3, dur: 150, aperture: 0.018, spread: 0.78, arc: 360 };

export const RECIPE = {
  id: 'glass-tiles',
  recipe:
    'Official icons crisp in thick milky glass tiles (330 px, fully rounded edges, depth 42 %, rainbow fringes and bright rims on the bevels), on an arc opening toward the camera: the middle tiles sharp at the lockup plane, the outer ones nearer, bigger and soft, framing them; arrive: they rise from below and behind, turning 34 deg to face the camera, outward from the centre 6 f apart (48 f each, glideOut) while the camera pushes in from x1.3 and lands after them (150 f, stdInOut); pass: the camera tracks past them and lands on the chosen tile as the focus pulls to it. Faces the camera at rest; no bob.',
  params: { ...TILES },
};

export type TileMove = 'arrive' | 'pass' | 'hold';
export type TileLayout = 'row' | 'flank';
export type TilePlace = { x: number; y: number; z: number }; // px from the frame's centre (y up), depth toward the camera

export type GlassTilesProps = {
  /** Official icon files (staticFile paths to SVG or PNG), one tile each. */
  icons: string[];
  at?: number;
  /** Length of the shot's move, f@60 (default 150). */
  dur?: number;
  move?: TileMove;
  /** 'row' (an arc opening toward the camera: the middle tiles sharp, the outer ones nearer and soft) or 'flank' (tiles both sides of an empty centre for a line or a product). */
  layout?: TileLayout;
  /** Or place each tile yourself (px from the centre, y up, z toward the camera). */
  places?: TilePlace[];
  /** Tile size in px at the frame's plane (default 330). */
  size?: number;
  /** 0 clear .. 1 milky (default 0.5). */
  frost?: number;
  /** The tile the shot lands on and focuses (default the middle one). */
  focus?: number;
  light?: Light3D;
  backdrop?: Backdrop;
  samples?: number;
  gl?: GlMode;
  seed?: number | string;
};

/** The tile's glass. */
export const tileGlass = (size: number, frost: number) =>
  filmLit(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(1, 1, 1),
      // frost: a rougher surface blurs what is behind it, and the milky share (diffuse white lit by the key and the light
      // stage) keeps the tile bright on any plate; the clearcoat stays sharp, so the rims and highlights stay crisp
      roughness: 0.06 + 0.36 * frost,
      transmission: 1 - 0.5 * frost,
      envMapIntensity: 2,
      thickness: size * TILES.depth,
      ior: 1.45,
      iridescence: 1,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [220, 620],
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      dispersion: 0.45,
    }),
    '#FFFFFF',
  );

export type Tile = { group: THREE.Group; dispose: () => void };

/** One glass tile with its icon on the face (size px). */
export const makeTile = (size: number, tex: THREE.Texture | null, frost: number = TILES.frost): Tile => {
  const group = new THREE.Group();
  const d = size * TILES.depth;
  // edges rounded all the way through (a soap-bar block): the bevels catch the light stage as bright rims
  const geo = slabGeometry(size, size, d, size * TILES.radius, 0.5);
  const glass = tileGlass(size, frost);
  const body = new THREE.Mesh(geo, glass);
  group.add(body);
  let icon: THREE.Mesh | null = null;
  if (tex) {
    const s = size * TILES.icon;
    icon = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    icon.position.z = d / 2 + 0.6;
    icon.renderOrder = 2;
    group.add(icon);
  }
  // (no glass drawn over the icon: its reflection would lift the icon's blacks; official colours stay exact)
  return {
    group,
    dispose: () => {
      geo.dispose();
      glass.dispose();
      if (icon) {
        icon.geometry.dispose();
        (icon.material as THREE.Material).dispose();
      }
    },
  };
};

/** Where n tiles sit (px from the centre, y up, z toward the camera). */
export const tilePlaces = (n: number, W: number, H: number, layout: TileLayout = 'row', spread = TILES.spread, seed: number | string = 0): TilePlace[] => {
  const jit = (i: number) => rand(`tiles:${seed}:${i}`) - 0.5;
  return Array.from({ length: n }, (_, i) => {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const c = u - 0.5; // -0.5 .. 0.5
    if (layout === 'flank') {
      // both sides of an empty centre third, alternating depth, a little height variation
      const side = i % 2 === 0 ? -1 : 1;
      const k = Math.floor(i / 2);
      const m = Math.ceil(n / 2);
      const v = m === 1 ? 0.5 : k / (m - 1);
      return { x: side * W * lerp(0.2, spread / 2 + 0.06, v), y: H * (0.06 * Math.sin(v * 3.1 + side) + 0.03 * jit(i)), z: (k % 2 === 0 ? 120 : -160) + 30 * jit(i + 9) };
    }
    // an arc opening toward the camera: the middle tiles at the lockup plane (sharp), the outer ones nearer and wider
    // (bigger, soft in the lens: a foreground that frames the middle)
    const v = 2 * c; // -1 .. 1
    return { x: c * W * spread, y: H * (0.04 * (i % 2 === 0 ? -1 : 1) + 0.02 * jit(i)), z: TILES.arc * v * v + 30 * jit(i + 5) };
  });
};

type SceneProps = { tex: (THREE.Texture | null)[]; places: TilePlace[]; size: number; frost: number; move: TileMove; at: number; durF: number; k: number; focus: number; W: number; H: number; mirror: number };

const TilesScene: React.FC<SceneProps> = ({ tex, places, size, frost, move, at, durF, k, focus, W, H, mirror }) => {
  const tiles = useMemo(() => tex.map((t) => makeTile(size, t, frost)), [tex, size, frost]);
  useEffect(() => () => tiles.forEach((t) => t.dispose()), [tiles]);
  const root = useMemo(() => {
    const g = new THREE.Group();
    tiles.forEach((t) => g.add(t.group));
    return g;
  }, [tiles]);
  const D = planeDistance(H);
  // the arrival order: outward from the focus tile
  const rank = places.map((_, i) => i).sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus) || a - b);
  const order = places.map((_, i) => rank.indexOf(i));
  const fp = places[Math.min(places.length - 1, Math.max(0, focus))] ?? { x: 0, y: 0, z: 0 };
  useSampler((t) => {
    const local = t - at;
    const p = clamp01(local / durF);
    let camX = 0;
    let camZ = D;
    // the push carries the whole shot: it travels while the tiles land and lands after them
    if (move === 'arrive') camZ = D * lerp(TILES.push, 1, E.stdInOut(p));
    if (move === 'pass') camX = lerp(-mirror * W * 0.42, fp.x, E.strongInOut(p));
    let moving = p > 0 && p < 1;
    tiles.forEach((tile, i) => {
      const pl = places[i];
      let q = 1;
      if (move === 'arrive') {
        q = clamp01((local - order[i] * TILES.stagger * k) / (TILES.arrive * k));
        if (q > 0 && q < 1) moving = true;
      }
      const e = E.glideOut(q);
      const r = E.settleOut(q);
      // start below the frame's bottom edge (at its depth) and behind
      const z0 = pl.z - TILES.back;
      const y0 = ((-H / 2 - size) * (D - z0)) / D;
      tile.group.position.set(lerp(pl.x * 0.85, pl.x, e), lerp(y0, pl.y, e), lerp(z0, pl.z, e));
      const side = pl.x === 0 ? mirror : Math.sign(pl.x);
      tile.group.rotation.set(deg(-TILES.turn * 0.7 * (1 - r)), deg(side * TILES.turn * (1 - r)), deg(side * -6 * (1 - r)));
    });
    const cam = { x: camX, z: camZ };
    root.position.set(-cam.x, 0, D - cam.z); // the camera's move, applied to the world (the stage camera stays the reference)
    const focusDist = cam.z - fp.z;
    return { aperture: TILES.aperture * focusDist, focus: focusDist, still: !moving && TILES.aperture === 0, moving };
  });
  return <primitive object={root} />;
};

const FlatTiles: React.FC<{ icons: string[]; places: TilePlace[]; size: number; move: TileMove; at: number; durF: number; k: number; focus: number; W: number; H: number; frame: number }> = ({ icons, places, size, move, at, durF, k, focus, W, H, frame }) => {
  const D = planeDistance(H);
  const rank = places.map((_, i) => i).sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus) || a - b);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {places
        .map((pl, i) => ({ pl, i }))
        .sort((a, b) => a.pl.z - b.pl.z)
        .map(({ pl, i }) => {
          const q = move === 'arrive' ? clamp01((frame - at - rank.indexOf(i) * TILES.stagger * k) / (TILES.arrive * k)) : 1;
          const e = E.glideOut(q);
          const s = D / (D - pl.z);
          const px = size * s;
          const x = W / 2 + pl.x * s - px / 2;
          const y = H / 2 - pl.y * s - px / 2;
          const rise = (1 - e) * (H / 2 + px); // the arrival, as a transform (sub-pixel smooth)
          const p = clamp01((frame - at) / durF);
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y, width: px, height: px, transform: `translateY(${rise}px)`, borderRadius: px * TILES.radius, background: 'linear-gradient(160deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))', boxShadow: `inset 0 0 0 ${Math.max(1, px * 0.012)}px rgba(255,255,255,0.85), 0 ${px * 0.08}px ${px * 0.22}px rgba(0,0,0,0.12)`, opacity: 0.5 + 0.5 * p + 0.5 * e, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Img src={icons[i]} style={{ width: px * TILES.icon, height: px * TILES.icon, objectFit: 'contain' }} />
            </div>
          );
        })}
    </div>
  );
};

/** Official icons as frosted glass tiles in depth (see the file's header). */
export const GlassTiles: React.FC<GlassTilesProps> = ({ icons, at = 0, dur = TILES.dur, move = 'arrive', layout = 'row', places, size = TILES.size, frost = TILES.frost, focus, light, backdrop, samples, gl = 'auto', seed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const k = fps / 60;
  const durF = dur * k;
  const pl = useMemo(() => places ?? tilePlaces(icons.length, W, H, layout, TILES.spread, seed), [places, icons.length, W, H, layout, seed]);
  const f = focus ?? Math.floor((icons.length - 1) / 2);
  const mirror = rand(`glass-tiles:${seed}`) < 0.5 ? -1 : 1;
  const three = draws3D(gl);
  const tex = useTextures(three ? icons : [], 512, true);
  if (!three) return <FlatTiles icons={icons} places={pl} size={size} move={move} at={at} durF={durF} k={k} focus={f} W={W} H={H} frame={frame} />;
  if (!tex) return null;
  return (
    <Stage3D frame={frame} light={light} backdrop={backdrop} samples={samples}>
      <TilesScene tex={tex} places={pl} size={size} frost={frost} move={move} at={at} durF={durF} k={k} focus={f} W={W} H={H} mirror={mirror} />
    </Stage3D>
  );
};
