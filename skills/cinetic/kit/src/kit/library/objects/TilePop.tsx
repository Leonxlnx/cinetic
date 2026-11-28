// TilePop (object, enter / build): square photo tiles pop on one a frame and line up into a rising ribbon; each is born
// in a two-tone gradient map and cuts to true colour a few frames later, while the view pans along and pushes in.
// Numbers: one tile a frame for twelve, then one every second frame (seeded 0-1 f of jitter); the first tiles land
// scattered from the lower left and gather into the ribbon on 8-22 f; tiles cut on, no scale; two-tone for 3-6 f, then
// true colour through one in-between frame; sizes grow 7 % a tile; the ribbon rises 15 degrees; the newest tile is 3, 7,
// 12, 24, 30 % of the frame's width at 2, 11, 23, 35, 49 f; a sprinkle of small coloured dots on the first 9 f.
// Caution: it needs many pictures to read as many; with few photographs give each tile its own crop (`cropOf`).
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix, keys } from '../../motion';
import { useUid } from '../_shared';
import { DuotoneFilter, PicTile, cropOf, rnd } from './_shared';

export const TilePop: React.FC<{
  /** Pictures (public paths or URLs); they repeat with new crops when there are fewer than `count`. */
  pics: string[];
  at?: number;
  /** How many tiles. */
  count?: number;
  /** Frames between tiles (1 measured). */
  every?: number;
  /** The gradient map tiles are born in: shadows and highlights. */
  dark?: string;
  light?: string;
  /** Frames of the push after the first tile. */
  dur?: number;
  /** Corner radius as a share of a tile's side. */
  radius?: number;
  /** Colours of the sprinkle of dots (none: []). */
  dots?: string[];
  seed?: number;
  /** Rise of the ribbon in degrees. */
  rise?: number;
}> = ({ pics, at = 0, count = 24, every = 1, dark = '#1D5FA0', light = '#F2E6BE', dur = 48, radius = 0, dots = ['#4D8DF0', '#F2A55A', '#9DB4C8'], seed = 3, rise = 15 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('tilepop');
  const g = 1.07;
  // world: tile k has side g^k, sits after the last with 18 % overlap, the ribbon rises `rise` degrees
  const tan = Math.tan((rise * Math.PI) / 180);
  const xs: number[] = [];
  let x = 0;
  for (let k = 0; k < count; k++) {
    const s = Math.pow(g, k);
    xs.push(x + s / 2);
    x += s * 0.82;
  }
  // one a frame for the first 12, then one every second frame (the measured slowing), seeded 0-1 f of jitter
  const slot = (k: number) => (k < 12 ? k : 12 + (k - 12) * 2) * every;
  const born = (k: number) => at + 2 + Math.round(slot(k) + (k > 0 ? rnd(seed, k, 4) * 0.9 : 0));
  // camera: follows the newest tile (fractional index c) at the right of the frame
  let c = 0;
  for (let k = 1; k < count; k++) c += clamp((f - at - 2 - slot(k - 1)) / Math.max(0.5, slot(k) - slot(k - 1)));
  const ci = Math.floor(c);
  const cf = c - ci;
  const xAt = (k: number) => (k >= count - 1 ? xs[count - 1] : mix(cf, xs[k], xs[k + 1]));
  const camX = xAt(ci);
  // measured: the newest tile 3 % of W at 2 f, 7 % at 11 f, 12 % at 23 f, 24 % at 35 f, 30 % at 49 f
  const sizeNow = keys(((f - at) * 48) / dur, [[2, 0.03], [11, 0.07], [23, 0.12], [35, 0.24], [49, 0.3]], ease.linear) * W;
  const S = sizeNow / Math.pow(g, c);
  // the newest tile sits at the right; the first tiles land scattered (lower left to right) and gather into the ribbon
  // between frames 8 and 22
  const X0 = W * 0.8;
  const Y0 = H * 0.44;
  const gather = ease.inOut(clamp((f - at - 8) / 14));
  const tiles: React.ReactNode[] = [];
  for (let k = 0; k < count; k++) {
    const b = born(k);
    if (f < b) continue;
    const s = Math.pow(g, k) * S;
    const jy = (rnd(seed, k, 5) - 0.5) * 0.5 * Math.pow(g, k);
    const rx = X0 + (xs[k] - camX) * S;
    const ry = Y0 - (xs[k] - camX) * S * tan + jy * S;
    // scattered place: across the frame in birth order, lower left first
    const q = clamp(k / 11);
    const scx = W * (0.04 + q * 0.82 + (rnd(seed, k, 11) - 0.5) * 0.12);
    const scy = H * (mix(q, 0.74, 0.3) + (rnd(seed, k, 12) - 0.5) * 0.36);
    const sx = mix(gather, scx, rx);
    const sy = mix(gather, scy, ry);
    if (sx + s / 2 < -40 || sx - s / 2 > W + 40) continue;
    const hold = 3 + Math.floor(rnd(seed, k, 6) * 4);
    const age = f - b;
    const tone = age < hold ? 1 : age === hold ? 0.5 : 0;
    const crop = cropOf(k, seed);
    tiles.push(
      <PicTile key={k} src={pics[k % pics.length]} w={s} h={s} r={radius * s} tone={tone} filterId={id} pos={crop.pos} zoom={crop.zoom} style={{ left: sx - s / 2, top: sy - s / 2, zIndex: k }} />,
    );
  }
  const sprinkle: React.ReactNode[] = [];
  if (dots.length && f >= at + 2 && f < at + 11) {
    for (let i = 0; i < 9; i++) {
      const on = at + 2 + Math.floor(rnd(seed, i, 7) * 5);
      const off = on + 2 + Math.floor(rnd(seed, i, 8) * 4);
      if (f < on || f >= off) continue;
      const d = Math.max(4, W * 0.0035);
      sprinkle.push(<div key={i} style={{ position: 'absolute', left: rnd(seed, i, 9) * W, top: H * (0.1 + rnd(seed, i, 10) * 0.6), width: d, height: d, background: dots[i % dots.length] }} />);
    }
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <DuotoneFilter id={id} dark={dark} light={light} />
      {sprinkle}
      {tiles}
    </AbsoluteFill>
  );
};
