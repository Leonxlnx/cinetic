// LensBulge (fx, idle, enter): the whole scene seen through one lens: a barrel (fisheye) bulge that swells the centre and
// bends straight lines near the edges, the edges darker, a hair of colour fringe at the rim, and optionally the fine pixel
// grid of a screen being filmed. Different materials under it read as one screen.
// Numbers: `amount` 0.12-0.2 (the centre near 1x, the edge midpoints pulled in 8-14 %, the corners dark); fringe 1-3 px
// at the rim; vignette 25-40 %; a pixel grid of 3-4 px at 6-10 %. On an entrance it starts at 1.5x the amount and relaxes in
// 10-14 f.
// Caution: the amount is capped at 0.2 (LENS_MAX: above it the shift steps visibly); one lens for a whole section, never
// on and off between shots; keep type away from the outer fifth where it bends.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, mix } from '../../motion';
import { useUid } from '../_shared';

const MAP_W = 240;

/** Above this the 8-bit displacement map shifts in visible steps (over 1.3 px); the amount is capped here. */
export const LENS_MAX = 0.2;

/**
 * The barrel displacement map for amount `a` as a PNG data URL (red: x, green: y; 128 is no shift) and the px shift its
 * full range is. Only shifts that still land inside the scene are encoded at full precision; larger ones (the corners,
 * which fall outside the scene anyway) are clamped to the edge of the range, which still lands outside. So the range,
 * and the step between two levels, stays small: about 1.2 px at the cap.
 */
const useBarrelMap = (W: number, H: number, a: number) => {
  const key = Math.round(a * 200) / 200;
  return React.useMemo(() => {
    const mw = MAP_W;
    const mh = Math.max(2, Math.round((MAP_W * H) / W));
    const c = document.createElement('canvas');
    c.width = mw;
    c.height = mh;
    const g = c.getContext('2d');
    if (!g) return { url: '', range: 1 };
    const img = g.createImageData(mw, mh);
    // a point at normalised radius r samples the scene at (1 + a r^2) times its distance from the centre: the centre stays
    // near 1x, the edges bow and the corners fall outside the scene (they show the ground)
    const half = Math.hypot(W / 2, H / 2);
    const dmax = (Math.max(W, H) / 2) * (key / (1 + key)) * 1.04;
    const range = 2 * dmax;
    const lim = (v: number) => Math.max(-dmax, Math.min(dmax, v));
    for (let j = 0; j < mh; j++) {
      for (let i = 0; i < mw; i++) {
        const px = ((i + 0.5) / mw) * W - W / 2;
        const py = ((j + 0.5) / mh) * H - H / 2;
        const r2 = (px * px + py * py) / (half * half);
        const dx = lim(key * px * r2);
        const dy = lim(key * py * r2);
        const k = (j * mw + i) * 4;
        img.data[k] = Math.round(127.5 + (dx / range) * 255);
        img.data[k + 1] = Math.round(127.5 + (dy / range) * 255);
        img.data[k + 2] = 128;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return { url: c.toDataURL('image/png'), range };
  }, [W, H, key]);
};

/**
 * LensBulge: `children` (the whole scene) through a barrel lens of strength `amount`; with `at` it starts at `from` and
 * relaxes to `amount` over `dur` frames. `chroma` the colour fringe in px at the rim, `vignette` the darkening at the
 * edges, `grid` a screen's pixel grid pitch in px (0: none).
 */
export const LensBulge: React.FC<{
  amount?: number;
  at?: number;
  from?: number;
  dur?: number;
  chroma?: number;
  vignette?: number;
  grid?: number;
  /** Colour of the dark edge. */
  ground?: string;
  children: React.ReactNode;
}> = ({ amount = 0.16, at, from, dur = 12, chroma = 2, vignette = 0.32, grid = 0, ground = '#000000', children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('lens');
  const cap = (v: number) => Math.max(0, Math.min(LENS_MAX, v));
  const a = cap(at === undefined ? amount : mix(ease.out(clamp((frame - at) / dur)), from ?? amount * 1.5, amount));
  const map = useBarrelMap(W, H, a);
  const s = map.range;
  // a fringe: red bent a little less, blue a little more (px at the rim)
  const fr = chroma > 0 ? chroma / (Math.hypot(W, H) / 2) : 0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: ground }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feImage href={map.url} x="0" y="0" width={W} height={H} preserveAspectRatio="none" result="map" />
          {chroma > 0 ? (
            <>
              <feDisplacementMap in="SourceGraphic" in2="map" scale={s * (1 - fr * 4)} xChannelSelector="R" yChannelSelector="G" result="dr" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={s} xChannelSelector="R" yChannelSelector="G" result="dg" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={s * (1 + fr * 4)} xChannelSelector="R" yChannelSelector="G" result="db" />
              <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
              <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
              <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
              <feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
              <feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </>
          ) : (
            <feDisplacementMap in="SourceGraphic" in2="map" scale={s} xChannelSelector="R" yChannelSelector="G" />
          )}
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: map.url ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
      {grid > 0 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: 0.08,
            backgroundImage: `linear-gradient(to bottom, #000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)`,
            backgroundSize: `${grid}px ${grid}px`,
          }}
        />
      )}
      {vignette > 0 && <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 72% 72% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)` }} />}
    </AbsoluteFill>
  );
};
