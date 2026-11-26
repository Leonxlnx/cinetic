// CurlRing (object, build / exit): a row of picture tiles turns from a pale two-tone to true colour left to right, tips
// up into a rising diagonal, and curls: the lead tile rises and turns left over the top and the others follow its path
// one after another, so the row bends into a ring; the ring spins, slows, speeds up again and implodes into the centre.
// Numbers: colour left to right on 0-15 f (2.5 f a tile); the tilt to 50 degrees on 16-24 f (about the row's middle); the curl 24-40 f (the
// spacing opening to the ring's); ring radius 36 % of H; a quarter turn by 60 f, then the radius falls to 6 % and the
// tiles to 60 % on 60-73 f while it spins a half turn faster (ease-in). Tiles stay upright the whole way.
// Caution: give it 5-8 tiles; the implosion should hand over to something that grows out of the centre.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { useUid } from '../_shared';
import { DuotoneFilter, PicTile, cropOf } from './_shared';

export const CurlRing: React.FC<{
  pics: string[];
  at?: number;
  count?: number;
  /** The pale map tiles start in. */
  dark?: string;
  light?: string;
  /** Tile side as a share of H. */
  tile?: number;
  radius?: number;
  /** Whether the ring implodes at the end (73 f). */
  implode?: boolean;
  speed?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ pics, at = 0, count = 6, dark = '#5E6B78', light = '#F6D9D2', tile = 0.2, radius = 0.36, implode = true, speed = 1, seed = 2, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('curlring');
  if (f < at) return null;
  const t = (f - at) * speed;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const s = tile * H;
  const R = radius * H;
  const d0 = s * 1.18;
  const D = (2 * Math.PI * R) / count;
  const a = (50 * Math.PI) / 180;
  const phi0 = Math.PI / 2 - a;
  const T = { x: cx + Math.cos(phi0) * R, y: cy + Math.sin(phi0) * R };
  const u = { x: Math.cos(a), y: -Math.sin(a) };
  const tilt = ease.inOut(clamp((t - 16) / 8));
  const curl = ease.inOut(clamp((t - 24) / 16));
  const sp = mix(curl, d0, D);
  const lead = curl * (count - 1) * D;
  // after the curl: the ring turns on (a quarter turn by 60 f), then spins faster as it implodes
  const spin1 = ease.out(clamp((t - 40) / 20)) * (Math.PI / 2);
  const imp = implode ? ease.in(clamp((t - 60) / 13)) : 0;
  const spin2 = imp * Math.PI;
  const rNow = mix(imp, R, 0.06 * H);
  const scale = mix(imp, 1, 0.6);
  const pos: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    let px: number;
    let py: number;
    // row: centred, flat
    const rx = cx + (i - (count - 1) / 2) * d0;
    const ry = cy;
    // on the path: the lead tile is the last (rightmost); tile i trails it by (count - 1 - i) spacings
    const sI = lead - (count - 1 - i) * sp;
    let pxP: number;
    let pyP: number;
    if (sI <= 0) {
      pxP = T.x + u.x * sI;
      pyP = T.y + u.y * sI;
    } else {
      const ang = phi0 - sI / R;
      pxP = cx + Math.cos(ang) * R;
      pyP = cy + Math.sin(ang) * R;
    }
    if (t < 40) {
      px = mix(tilt, rx, pxP);
      py = mix(tilt, ry, pyP);
    } else {
      const ang = phi0 - (i * D) / R - spin1 - spin2;
      px = cx + Math.cos(ang) * rNow;
      py = cy + Math.sin(ang) * rNow;
    }
    pos.push([px, py]);
  }
  // the tiles' centroid is held at the centre (the row tips about its middle and the ring forms round the centre)
  const mx = pos.reduce((q, p) => q + p[0], 0) / count;
  const my = pos.reduce((q, p) => q + p[1], 0) / count;
  const tiles = pos.map(([px, py], i) => {
    const tone = t < i * 2.5 ? 1 : t < i * 2.5 + 3 ? 1 - (t - i * 2.5) / 3 : 0;
    const crop = cropOf(i, seed);
    const sz = s * scale;
    const X = px + cx - mx;
    const Y = py + cy - my;
    return <PicTile key={i} src={pics[i % pics.length]} w={sz} h={sz} r={sz * 0.1} tone={tone} filterId={id} pos={crop.pos} zoom={crop.zoom} style={{ left: X - sz / 2, top: Y - sz / 2, zIndex: i }} />;
  });
  return (
    <AbsoluteFill>
      <DuotoneFilter id={id} dark={dark} light={light} />
      {tiles}
    </AbsoluteFill>
  );
};
