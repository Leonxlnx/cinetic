// PlanetPull (camera, join, exit): a dark grid floor that filled the frame pulls back into the top of a gridded planet: the
// corners open onto a sky, the floor's lines bend into meridians and parallels, and the planet's rim, lit along its edge,
// sinks to a low horizon a card can rise over.
// Numbers: 18 f on a quadratic ease-out (the corners open in 3 f, then the rim sinks, slowing); the rim from just above
// the frame to 37 % of the height; the radius from 7x the frame height to 1.05x the width (log scale); grid every 4 deg;
// a lit rim 0.6 % of the height, blurred.
// Caution: the sky must be a strong, saturated colour (it is the reveal); the grid stays faint on the planet's dark body.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, logScale, mix } from '../../motion';

/**
 * PlanetPull: from `at` over `dur` frames the camera pulls back from a grid floor to the top of a planet (`body` its colour,
 * `line` its grid, `rim` its lit edge) against `sky` (a CSS background). `children` draw over the sky, behind the planet
 * (a card rising over the horizon).
 */
export const PlanetPull: React.FC<{
  at: number;
  dur?: number;
  body?: string;
  line?: string;
  rim?: string;
  sky?: string;
  /** Where the rim settles, as a share of the height from the top. */
  horizon?: number;
  /** Grid spacing in degrees. */
  step?: number;
  /** The latitude that sits on the rim at the top (deg): the grid near the rim reads as the floor that was pulled from. */
  rimLat?: number;
  children?: React.ReactNode;
}> = ({ at, dur = 18, body = '#0B0A1E', line = 'rgba(140,150,255,0.45)', rim = '#6C7BFF', sky = 'linear-gradient(100deg, #E0346E 0%, #F25A5A 55%, #FFC9A0 100%)', horizon = 0.37, step = 4, rimLat = 12, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  // a quadratic ease-out: the corners open over the first 3 f, then the rim sinks, slowing, to the horizon
  const t = clamp((frame - at) / dur);
  const p = 1 - (1 - t) * (1 - t);
  const R = logScale(H * 7, W * 1.05, p);
  const top = mix(p, -H * 0.1, H * horizon);
  const cx = W / 2;
  const cy = top + R;
  const rad = Math.PI / 180;
  const tilt = rimLat - 90;
  const ct = Math.cos(tilt * rad);
  const st = Math.sin(tilt * rad);
  // a point on the sphere (lon, lat), the sphere turned so latitude `rimLat` lies on the rim at the top of the frame
  const pt = (lon: number, lat: number) => {
    const cl = Math.cos(lat * rad);
    const x = R * cl * Math.sin(lon * rad);
    const yy = R * Math.sin(lat * rad);
    const zz = R * cl * Math.cos(lon * rad);
    const y = -(yy * ct - zz * st);
    const z = yy * st + zz * ct;
    return { x: cx + x, y: cy + y, z };
  };
  // only the band of the sphere near its visible top matters: lat/lon spans in degrees that cover the frame
  const span = Math.min(90, ((Math.max(W, H) * 1.2) / R) * (180 / Math.PI));
  const lines: string[] = [];
  const poly = (pts: Array<{ x: number; y: number; z: number }>) => {
    let d = '';
    let pen = false;
    for (const q of pts) {
      if (q.z <= 0 || q.y > H * 1.2 || q.y < -H * 0.2 || q.x < -W * 0.2 || q.x > W * 1.2) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      pen = true;
    }
    if (d) lines.push(d);
  };
  const lat0 = rimLat;
  const n = 48;
  for (let k = -Math.ceil((span * 1.6) / step); k <= 2; k++) {
    const lat = Math.round(lat0 / step) * step + k * step;
    if (lat <= -89 || lat >= 89) continue;
    poly(Array.from({ length: n + 1 }, (_, i) => pt(-span * 2 + (i / n) * span * 4, lat)));
  }
  for (let k = -Math.ceil((span * 2) / step); k <= Math.ceil((span * 2) / step); k++) {
    const lon = k * step;
    poly(Array.from({ length: n + 1 }, (_, i) => pt(lon, lat0 - span * 1.6 + (i / n) * (span * 1.6 + 6))));
  }
  const rimW = Math.max(2, H * 0.006);
  return (
    <AbsoluteFill style={{ background: sky, overflow: 'hidden' }}>
      {children && <AbsoluteFill>{children}</AbsoluteFill>}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="planetRimGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={rimW * 2.2} />
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill={body} />
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={line} strokeWidth={Math.max(1, H / 900)} />
        ))}
        <circle cx={cx} cy={cy} r={R - rimW} fill="none" stroke={rim} strokeWidth={rimW * 3} filter="url(#planetRimGlow)" opacity={clamp(p * 3)} />
        <circle cx={cx} cy={cy} r={R - rimW / 2} fill="none" stroke={rim} strokeWidth={rimW} opacity={clamp(p * 3)} />
      </svg>
    </AbsoluteFill>
  );
};
