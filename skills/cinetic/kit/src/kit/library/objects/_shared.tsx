// Shared by the objects: a picture tile that covers its box (a path under public/ or a URL), the two-tone gradient map
// pictures are born in before they turn true colour, and a seeded random helper.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { parseColor } from '../../world';

/** Deterministic 0..1 for a seed and an index (never Math.random). */
export const rnd = (seed: number, i: number, k = 0) => {
  const r = Math.sin((seed * 7.31 + i * 12.9898 + k * 78.233) * 43.17) * 43758.5453;
  return r - Math.floor(r);
};

/** A public path ('img/x.jpg') or a URL as an <Img> src. */
export const srcOf = (src: string) => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src.replace(/^\//, '')));

const ch = (hex: string) => {
  const c = parseColor(hex) ?? [0, 0, 0];
  return c.map((v) => (v / 255).toFixed(3));
};

/**
 * A gradient map: the picture's luminance mapped from `dark` (shadows) to `light` (highlights). Put it in the tree once
 * and point a layer's `filter: url(#id)` at it.
 */
export const DuotoneFilter: React.FC<{ id: string; dark: string; light: string }> = ({ id, dark, light }) => {
  const d = ch(dark);
  const l = ch(light);
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={`${d[0]} ${l[0]}`} />
          <feFuncG type="table" tableValues={`${d[1]} ${l[1]}`} />
          <feFuncB type="table" tableValues={`${d[2]} ${l[2]}`} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

/**
 * A picture that covers its box. `tone` 1 shows it through the gradient map `filterId`, 0 in true colour (the map is a
 * layer on top whose opacity is `tone`). `pos` is the CSS object-position (a crop of one photograph per tile), `zoom` a
 * scale inside the box.
 */
export const PicTile: React.FC<{ src: string; w: number; h: number; r?: number; tone?: number; filterId?: string; pos?: string; zoom?: number; style?: React.CSSProperties }> = ({ src, w, h, r = 0, tone = 0, filterId, pos = '50% 50%', zoom = 1, style }) => {
  const img: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: zoom !== 1 ? `scale(${zoom})` : undefined };
  return (
    <div style={{ position: 'absolute', width: w, height: h, borderRadius: r, overflow: 'hidden', ...style }}>
      <Img src={srcOf(src)} style={img} />
      {tone > 0 && filterId && <Img src={srcOf(src)} style={{ ...img, filter: `url(#${filterId})`, opacity: Math.min(1, tone) }} />}
    </div>
  );
};

/** Crops that make a few photographs read as many different pictures: object-position and zoom for tile i. */
export const cropOf = (i: number, seed = 1) => ({
  pos: `${Math.round(10 + rnd(seed, i, 1) * 80)}% ${Math.round(10 + rnd(seed, i, 2) * 80)}%`,
  zoom: 1 + rnd(seed, i, 3) * 1.6,
});
