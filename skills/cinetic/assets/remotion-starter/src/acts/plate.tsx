// The film's real imagery: a set of frames (the plate) that the camera arrives on at speed, cuts closer into on
// the beat, then sees through the gap of a line (Act3), cutting through two more frames of the set. Shared by Act2 and
// Act3 so the morph between them is one continuous picture: platePose(F) is a pure function of the
// absolute frame, carried from the statement's launch and drifting on after it.
//
// cinetic:placeholder - the plate is a stand-in drawn in code (forested ridges in blue-hour mist, a photograph's
// own colour and texture, never the accent's hue), so the starter commits no media. A film with pictures of its own
// (the product's photography or screens, or pictures the user supplies) puts them in public/assets/ (node
// scripts/assets.mjs grade), points PLATE and SET_FRAMES at them with their real pixel sizes and focus points
// (SET_FRAMES: one photo per frame) and redraws PLATE_SLICES along the real photo's edges (or deletes them); a film
// without (most films: no stock as the base) builds these shots from the product's UI or a graphic field instead.
// Then delete these lines. Pictures keep their own colour (grade 'natural'); credits never go on screen.
import { CARRY } from '../lib/anim';
import { carry } from '../lib/handoff';
import type { DepthSlice, PhotoMove, PhotoSrc } from '../fx/Photo';
import { bakePixels } from '../fx/Gradients';
import { ditherLevel, hash01, srgbOf } from '../fx/plates';
import { ACT, f60x, FPS } from '../timeline';
import type React from 'react';

const PW = 1920;
const PH = 1080;
const HUE = 245; // OKLCH hue of blue-hour mist: the photograph's own colour, far from the accent's

// Nine ridgelines, far to near: base height (share of the plate), amplitude, OKLCH L and C of the layer. The near
// ones carry a treeline on their crests, so the picture has a photograph's structure, not a gradient's.
const LAYERS = [
  { base: 0.4, amp: 0.045, L: 0.82, C: 0.028, seed: 3 },
  { base: 0.46, amp: 0.05, L: 0.75, C: 0.034, seed: 11 },
  { base: 0.52, amp: 0.055, L: 0.68, C: 0.04, seed: 19 },
  { base: 0.58, amp: 0.06, L: 0.61, C: 0.047, seed: 29 },
  { base: 0.645, amp: 0.065, L: 0.54, C: 0.054, seed: 41 },
  { base: 0.71, amp: 0.07, L: 0.47, C: 0.061, seed: 53 },
  { base: 0.775, amp: 0.07, L: 0.4, C: 0.068, seed: 61 },
  { base: 0.84, amp: 0.065, L: 0.33, C: 0.075, seed: 71 },
  { base: 0.91, amp: 0.06, L: 0.26, C: 0.082, seed: 83 },
] as const;
const NEAR = LAYERS.length - 1;

/** Smooth 1D value noise in [-1, 1] (hash at integer knots, cosine between). Pure. */
const noise1 = (x: number, seed: number) => {
  const i = Math.floor(x);
  const t = x - i;
  const a = hash01(i, 0, seed) * 2 - 1;
  const b = hash01(i + 1, 0, seed) * 2 - 1;
  const s = (1 - Math.cos(Math.PI * t)) / 2;
  return a + (b - a) * s;
};

/** Smooth 2D value noise in [0, 1] (bilinear between hashed lattice points, smoothstep weights). Pure. */
const noise2 = (x: number, y: number, seed: number) => {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const u = x - i;
  const v = y - j;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  const a = hash01(i, j, seed);
  const b = hash01(i + 1, j, seed);
  const c = hash01(i, j + 1, seed);
  const d = hash01(i + 1, j + 1, seed);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
};

/** Height (plate px from the top) of ridge `i` at column x: a few octaves, sharper crests on near layers. Pure. */
export const ridgeY = (i: number, x: number) => {
  const l = LAYERS[i];
  const u = x / PW;
  const n = 0.55 * noise1(u * (3 + i), l.seed) + 0.3 * noise1(u * (9 + 2 * i), l.seed + 1) + 0.15 * noise1(u * (27 + 4 * i), l.seed + 2);
  const trees = i >= 2 ? Math.abs(noise1(u * (220 + 30 * i), l.seed + 3)) * (0.0035 + 0.0011 * (i - 2)) : 0; // a treeline on the nearer crests
  return (l.base - l.amp * n - trees) * PH;
};

const toLab = (L: number, c: number): [number, number, number] => [L, c * Math.cos((HUE * Math.PI) / 180), c * Math.sin((HUE * Math.PI) / 180)];

/** The stand-in's pixels: sky, nine layers of ridges whose valleys fill with mist, fine texture on the near layers. */
const standInPixels = () => {
  const px = new Uint8ClampedArray(PW * PH * 4);
  const crest = LAYERS.map((_, i) => Float32Array.from({ length: PW }, (_, x) => ridgeY(i, x)));
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      let layer = -1;
      for (let i = LAYERS.length - 1; i >= 0; i--)
        if (y >= crest[i][x]) {
          layer = i;
          break;
        }
      let L: number;
      let c: number;
      if (layer < 0) {
        const v = y / (LAYERS[0].base * PH);
        L = 0.9 - 0.06 * v;
        c = 0.045 - 0.015 * v; // the sky deepest at the top, paling into the haze at the horizon
      } else {
        const l = LAYERS[layer];
        const below = (y - crest[layer][x]) / PH; // depth under the crest: the valley fills with mist
        const mist = Math.min(1, below / 0.06);
        const strata = noise2(x / 26, y / 7, 61 + layer) + 0.5 * noise2(x / 9, y / 3, 71 + layer) - 0.75; // rock and scrub: wider than tall
        const grain = (hash01(x >> 1, y >> 1, 7 + layer) - 0.5) * (0.01 + 0.003 * layer) + 0.035 * strata * (layer / NEAR);
        L = l.L + 0.09 * mist * (1 - layer / 11) + grain;
        c = l.C * (1 - 0.35 * mist);
      }
      const [r, g, b] = srgbOf(toLab(L, c));
      const k = (y * PW + x) * 4;
      px[k] = ditherLevel(r, x, y, 1);
      px[k + 1] = ditherLevel(g, x, y, 3);
      px[k + 2] = ditherLevel(b, x, y, 5);
      px[k + 3] = 255;
    }
  return px;
};

/** The plate (a browser data URL, built once per render tab; '' in Node, where nothing draws). */
export const plateSrc = (): string => bakePixels('cinetic-plate-stand-in', PW, PH, standInPixels);

/** The plate as the film uses it: its pixel size and the focus point the cover keeps on the anchor. */
export const PLATE = (): PhotoSrc => ({ src: plateSrc(), w: PW, h: PH, focus: [0.46, 0.56], drawn: 'place' }); // drawn: the layout audit fails the stand-in until a real photo replaces it (drop the field then)

/**
 * Depth slices along the three nearest crests (image px): they part as the plate moves, so it reads as a space.
 * Each starts a little above its crest, in the mist, so the copy under it never shows a second crest line.
 */
export const PLATE_SLICES: DepthSlice[] = [NEAR - 2, NEAR - 1, NEAR].map((i, j) => ({
  id: `ridge-${i}`,
  depth: 0.5 + 0.25 * j,
  points: [...Array.from({ length: 49 }, (_, s): [number, number] => [(s / 48) * PW, ridgeY(i, (s / 48) * PW) - 34]), [PW, PH], [0, PH]],
}));
/** The depth gain of the slices (fx/Photo parallax): the nearest crest takes the push and drift a third again. */
export const PLATE_PARALLAX = 0.35;

/**
 * The frames of the set, in the order the film shows them: Act2 opens wide (0) and cuts closer on the beat (1);
 * Act3's gap carries frame 1 in and cuts through 2 and 3. The stand-in gives other crops of one picture; real
 * photographs replace them one for one (keep the scale at 1 for a photo framed as it should be seen).
 */
export const SET_FRAMES = (): { photo: PhotoSrc; scale: number }[] => [
  { photo: { ...PLATE(), focus: [0.46, 0.56] }, scale: 1 },
  { photo: { ...PLATE(), focus: [0.7, 0.62] }, scale: 1.7 },
  { photo: { ...PLATE(), focus: [0.22, 0.52] }, scale: 1.45 },
  { photo: { ...PLATE(), focus: [0.56, 0.7] }, scale: 2.2 },
];

// ---- the plate's move: carried in from the statement's launch, then a slow push and drift --------------

/** The carry the plate opens with (lib/handoff): 0.7 of the line's speed on its last frame, decaying to a drift. */
export const PLATE_CARRY = { ratio: CARRY.ratio[1] };

/** The push and drift under the carry (absolute frames: Act3 sees the same picture). */
export const PLATE_MOVE: PhotoMove = { from: ACT.plate.from, to: ACT.plate.from + f60x(300, FPS), push: 1.1, drift: [-120, -16] };

/**
 * The plate's shift at absolute frame F: the carried move, opening at the line's cut speed (px per frame, negative =
 * left). The acts translate the whole plate by it (a wrapper, not Photo's `shift`), so only the push and drift part
 * the slices: a carried travel amplified on the near crest would show the far copy behind it.
 */
export const plateShift = (F: number, vCut: number): [number, number] => [carry(F, ACT.plate.from, { vCut, ratio: PLATE_CARRY.ratio, fps: FPS }).x, 0];

/**
 * Room the cover keeps for the carried travel (frame px each side): the whole travel up to the last frame the plate
 * is drawn (the end of Act3), so the carried move never shows an edge, whatever the line's cut speed.
 */
export const plateRoom = (vCut: number): [number, number] => [Math.ceil(Math.abs(plateShift(ACT.mark.from, vCut)[0])) + 4, 0];

/** Photo's own box opened (no clip, no ground), for the acts that translate the whole plate: the act's frame clips it. */
export const OPEN: React.CSSProperties = { overflow: 'visible', background: 'transparent' };
