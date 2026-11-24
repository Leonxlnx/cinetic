// Grounds, worlds and finish. A film lives in ONE world (see references/worlds.md); these are its pieces.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { at, ease, mix, rand } from './motion';

// ---- colour, in OKLab (perceptual: blends and lifts keep their hue instead of greying) ----
type RGB = [number, number, number];
type Lab = [number, number, number];
/** Parse #rgb, #rrggbb(aa) or rgb()/rgba() to 0-255 channels; null if it cannot. */
export const parseColor = (c: string): RGB | null => {
  const s = c.trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
  return m ? [+m[1], +m[2], +m[3]] : null;
};
const toLin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (v: number) => { const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, c)) * 255); };
export const toLab = (rgb: RGB): Lab => {
  const [r, g, b] = rgb.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
export const fromLab = ([L, A, B]: Lab): RGB => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
};
const hexOf = ([r, g, b]: RGB) => `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
const labOf = (c: string): Lab => toLab(parseColor(c) ?? [128, 128, 128]);
/** Luma 0-1 (Rec. 709 weights on the sRGB values): the light/dark measure Ground and Grain use (0.5 splits them). */
export const luminance = (c: string) => {
  const rgb = parseColor(c);
  if (!rgb) return 0.5;
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
};
/** Mix two colours in OKLab (p = 0 gives a, 1 gives b). */
export const mixLab = (a: string, b: string, p: number) => {
  const x = labOf(a);
  const y = labOf(b);
  return hexOf(fromLab([x[0] + (y[0] - x[0]) * p, x[1] + (y[1] - x[1]) * p, x[2] + (y[2] - x[2]) * p]));
};
/** Lift a colour toward light in its own hue (amt 0-1 of the way to white in lightness; the chroma stays). */
export const liftColor = (c: string, amt: number, tint?: string) => {
  const [L, A, B] = labOf(c);
  const t = tint ? labOf(tint) : null;
  const L2 = L + (1 - L) * amt;
  // the hue of the light: the ground's own, or a neighbouring tint mixed in by how strong the lift is
  const k = t ? Math.min(1, amt * 3) : 0;
  return hexOf(fromLab([L2, A + ((t ? t[1] : A) - A) * k, B + ((t ? t[2] : B) - B) * k]));
};
// the old shadeHex: kept for anything that still mixes in sRGB
const shadeHex = (hex: string, toward: string, p: number) => {
  const a = parseColor(hex) ?? [0, 0, 0];
  const b = parseColor(toward) ?? [0, 0, 0];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(', ')})`;
};

/**
 * Dither: noise one or two levels of an 8-bit channel deep, new every frame, laid over a gradient so it never steps into
 * bands (worst on dark grounds after H.264). Invisible by design: it is not grain. Ground and Field already carry it.
 */
export const Dither: React.FC<{ amount?: number }> = ({ amount = 1 }) => {
  const frame = useCurrentFrame();
  const seed = frame % 48;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.07 * amount }}>
      <svg width="100%" height="100%">
        <filter id={`dither${seed}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#dither${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * A ground in one colour, and its light. Never dark corners: the light only LIFTS a broad area in the ground's own hue
 * and falls to exactly the ground's colour at its edge. A dark ground (luminance < 0.5) gets one broad soft bloom (14 %
 * by default); a light ground lifts 2.5 % at most 4 % (a light ground is clean, not lit). `tint` gives the bloom a
 * neighbouring hue (a navy ground with a brighter blue bloom). `light={{ x, y, size, amount }}` places it (shares of the
 * frame); `light={false}` keeps it flat. A dither keeps the gradient from banding.
 */
export const Ground: React.FC<{
  color: string;
  light?: boolean | { x?: number; y?: number; size?: number; amount?: number };
  tint?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ color, light = true, tint, children, style }) => {
  const l = light === false ? null : light === true ? {} : light;
  const lum = luminance(color);
  const dark = lum < 0.5;
  const amt = Math.min(dark ? 0.3 : 0.04, l?.amount ?? (dark ? 0.14 : 0.025));
  const lit = l && amt > 0.002 && parseColor(color);
  let background = color;
  if (lit) {
    const centre = liftColor(color, amt, tint);
    const size = l.size ?? 0.9;
    // a broad plateau that falls smoothly (a bisquare kernel) to exactly the ground's colour: no ring, no dark edge
    const stops = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return `${mixLab(color, centre, (1 - t * t) ** 2)} ${(t * 100).toFixed(1)}%`;
    }).join(', ');
    background = `radial-gradient(ellipse ${size * 100}% ${size * 100}% at ${(l.x ?? 0.5) * 100}% ${(l.y ?? 0.44) * 100}%, ${stops}), ${color}`;
  }
  return (
    <AbsoluteFill data-ground-lum={lum.toFixed(3)} style={{ background, ...style }}>
      {lit && <Dither />}
      {children}
    </AbsoluteFill>
  );
};

/**
 * A soft field of 2-4 neighbouring hues that drift slowly: light on a ground, never a blob wallpaper. Every pixel is a
 * blend of the colours in OKLab (so two hues meet through their true midpoint, never a grey seam), drawn on a small
 * canvas and scaled up (the field is smooth, so nothing is lost), then dithered. Deterministic from the frame.
 * `points` ({ x, y, r } shares of the frame, one per colour) place the hues; `drift` is how far they wander (share of
 * the frame, 0.04 by default), `speed` how fast (1 = a wander of about 20 s).
 */
export const Field: React.FC<{
  colors: string[];
  points?: Array<{ x: number; y: number; r?: number }>;
  drift?: number;
  speed?: number;
  seed?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ colors, points, drift = 0.04, speed = 1, seed = 1, children, style }) => {
  const frame = useCurrentFrame();
  const { width: FW, height: FH } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const n = colors.length;
  const layout: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [[0.22, 0.28], [0.8, 0.78]],
    3: [[0.18, 0.24], [0.84, 0.3], [0.5, 0.92]],
    4: [[0.16, 0.2], [0.86, 0.22], [0.2, 0.9], [0.84, 0.86]],
  };
  const base = layout[Math.min(4, Math.max(1, n))] ?? layout[4];
  const pts = colors.map((c, i) => {
    const p = points?.[i];
    const b = base[i % base.length];
    const x0 = p?.x ?? b[0] + (rand(seed * 31 + i) - 0.5) * 0.12;
    const y0 = p?.y ?? b[1] + (rand(seed * 17 + i * 5) - 0.5) * 0.12;
    const t = frame * 0.0016 * speed;
    return {
      lab: labOf(c),
      x: (x0 + noise2D(`fx${seed}-${i}`, t, i * 3.1) * drift) * FW,
      y: (y0 + noise2D(`fy${seed}-${i}`, i * 2.7, t) * drift) * FH,
      r: (p?.r ?? 0.42) * FW,
    };
  });
  const lumAvg = colors.reduce((s, c) => s + luminance(c), 0) / Math.max(1, n);
  const key = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(';') + colors.join();
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const W = 320;
    const H = Math.round((W * FH) / FW);
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return;
    const img = g.createImageData(W, H);
    const sx = FW / W;
    const sy = FH / H;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let ws = 0;
        let L = 0;
        let A = 0;
        let B = 0;
        for (const p of pts) {
          const dx = (x + 0.5) * sx - p.x;
          const dy = (y + 0.5) * sy - p.y;
          // gaussian weights, normalised: a smooth partition of the frame between the hues
          const w = Math.exp(-(dx * dx + dy * dy) / (2 * p.r * p.r)) + 1e-6;
          ws += w;
          L += w * p.lab[0];
          A += w * p.lab[1];
          B += w * p.lab[2];
        }
        const [r, gg, b] = fromLab([L / ws, A / ws, B / ws]);
        const o = (y * W + x) * 4;
        img.data[o] = r;
        img.data[o + 1] = gg;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, FW, FH]);
  return (
    <AbsoluteFill data-ground-lum={lumAvg.toFixed(3)} style={{ background: colors[0], ...style }}>
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Dither />
      {children}
    </AbsoluteFill>
  );
};

/**
 * A soft shadow: 5 layers whose offset and blur double (one light, from above), each at a few % alpha, tinted to the
 * ground's hue (a shadow is the ground in less light, never grey). `level` is the height: 1 a chip, 2 a resting card,
 * 3 a raised card (UI themes), 4-5 a hero object or a floating device, 6-8 a large device or a modal. Pass the ground
 * the object sits on; a dark ground gets denser layers (its shadow has less room to darken).
 */
export const softShadow = (level = 3, ground = '#F2F2F0') => {
  const [L, A, B] = labOf(ground);
  const dark = L < 0.6;
  // the shadow colour: the ground's hue, much darker, a little less chroma
  const col = fromLab([dark ? 0.08 : Math.min(0.32, L * 0.35), A * 0.6, B * 0.6]);
  const base = 0.5 + level * 0.5;
  const alpha = (dark ? 0.2 : 0.085) * (1 - Math.min(0.5, level * 0.04));
  const layers = [0, 1, 2, 3, 4].map((i) => {
    const o = base * 2 ** i * 0.6;
    const a = alpha * (1 - i * 0.1);
    return `0 ${o.toFixed(1)}px ${(o * 2).toFixed(1)}px rgba(${col.join(',')},${a.toFixed(3)})`;
  });
  // a tight contact layer under everything: the edge sits ON the ground
  return [`0 0.5px 1px rgba(${col.join(',')},${(dark ? 0.3 : 0.06).toFixed(3)})`, ...layers].join(', ');
};

/**
 * A soft living gradient: 2-4 blurred colour fields that drift slowly. For "air" worlds (soft UI on a pale sky,
 * a dark stage with one warm light). Keep the colours close in hue; one may be the accent.
 */
export const Aura: React.FC<{
  base: string;
  blobs: Array<{ color: string; x: number; y: number; r: number }>;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ base, blobs, speed = 1, style }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: base, overflow: 'hidden', ...style }}>
      {blobs.map((b, i) => {
        const dx = noise2D(`ax${i}`, frame * 0.004 * speed, i) * 120;
        const dy = noise2D(`ay${i}`, i, frame * 0.004 * speed) * 90;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x + dx - b.r,
              top: b.y + dy - b.r,
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.color} 0%, transparent 68%)`,
              filter: 'blur(30px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * A line grid. Flat by default; put it inside a <Camera> with rx for a floor in perspective.
 * `reveal` draws it in from the centre over that many frames. It covers width x height (default 6 x 6 frames) and fades
 * toward its edges: on a wide pan or a far pull-back pass a larger width/height.
 */
export const GridLines: React.FC<{
  size?: number;
  color?: string;
  width?: number;
  height?: number;
  thickness?: number;
  start?: number;
  reveal?: number;
  style?: React.CSSProperties;
}> = ({ size = 120, color = 'rgba(255,255,255,0.12)', width = 1920 * 6, height = 1080 * 6, thickness = 1, start = 0, reveal = 0, style }) => {
  const frame = useCurrentFrame();
  const p = reveal ? at(frame, start, reveal, ease.out) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - width / 2,
        top: 540 - height / 2,
        width,
        height,
        backgroundImage: `linear-gradient(${color} ${thickness}px, transparent ${thickness}px), linear-gradient(90deg, ${color} ${thickness}px, transparent ${thickness}px)`,
        backgroundSize: `${size}px ${size}px`,
        // lines fall on multiples of `size` from the frame's top-left corner, so content can snap to the grid
        backgroundPosition: `${(((width / 2 - 960) % size) + size) % size}px ${(((height / 2 - 540) % size) + size) % size}px`,
        maskImage: `radial-gradient(circle at 50% 50%, black ${mix(p, 0, 45)}%, transparent ${mix(p, 2, 70)}%)`,
        WebkitMaskImage: `radial-gradient(circle at 50% 50%, black ${mix(p, 0, 45)}%, transparent ${mix(p, 2, 70)}%)`,
        ...style,
      }}
    />
  );
};

/** Darken a colour in OKLab lightness, keeping its hue (amt 0-1). */
const dimColor = (c: string, amt: number) => {
  const [L, A, B] = labOf(c);
  return hexOf(fromLab([L * (1 - amt), A * (1 - amt * 0.3), B * (1 - amt * 0.3)]));
};
const withAlpha = (c: string, a: number) => {
  const rgb = parseColor(c) ?? [0, 0, 0];
  return `rgba(${rgb.join(',')},${a.toFixed(3)})`;
};

/**
 * A solid box in CSS 3D, lit from above: every face carries a top-lit gradient (bright where it meets the light, darker
 * toward the floor), a 1 px light edge where the faces meet, and a contact shadow on the floor that spreads and softens
 * with the box's height. Put content on `top` / `front` / `side` faces (text set ON the object). Lives inside a <Camera>.
 * `material`: 'matte' (default, clay or card stock), 'gloss' (a specular band and brighter edges), 'glass' (tinted,
 * see-through faces with bright rims). `bevel` (px) rounds the edges by light (a band where a round edge turns to the
 * light); real rounded solids need GL (`glRoundedBox` in gl.tsx). `ground` tints the shadow to the floor's hue.
 */
export const Box: React.FC<{
  w: number;
  d: number;
  h: number;
  color: string;
  /** Face colours default to shades of `color`. Side content is drawn on both side faces (only one faces the camera). */
  top?: string;
  front?: string;
  side?: string;
  topContent?: React.ReactNode;
  frontContent?: React.ReactNode;
  sideContent?: React.ReactNode;
  radius?: number;
  /** An explicit edge line colour (replaces the default 1 px light edge). */
  edge?: string;
  style?: React.CSSProperties;
  /** Strength of the contact shadow on the floor (0 = none). Objects without one float and read code-made. */
  shadow?: number;
  bevel?: number;
  material?: 'matte' | 'gloss' | 'glass';
  ground?: string;
}> = ({ w, d, h, color, top, front, side, topContent, frontContent, sideContent, radius = 0, edge, style, shadow = 0.35, bevel = 0, material = 'matte', ground }) => {
  const gloss = material === 'gloss';
  const glass = material === 'glass';
  const topC = top ?? color;
  const frontC = front ?? shade(color, -0.12);
  const sideC = side ?? shade(color, -0.24);
  const edgeA = glass ? 0.55 : gloss ? 0.5 : 0.28;
  const fa = glass ? 0.3 : 1; // face opacity (glass sees through)
  const paint = (c: string) => (glass ? withAlpha(c, fa) : c);
  // a side face: lit at its top edge, falling toward the floor (`up`: which CSS direction of the face points up the box)
  // a face given as a CSS gradient or image is used as it is (only the edges are added)
  const isCol = (c: string) => parseColor(c) !== null;
  const sideBg = (c: string, up: 'top' | 'bottom') =>
    isCol(c) ? `linear-gradient(to ${up === 'top' ? 'bottom' : 'top'}, ${paint(liftColor(c, gloss ? 0.07 : 0.035))} 0%, ${paint(c)} 38%, ${paint(dimColor(c, gloss ? 0.16 : 0.1))} 100%)` : c;
  const topBg =
    (gloss ? `linear-gradient(118deg, transparent 30%, rgba(255,255,255,0.2) 44%, rgba(255,255,255,0.06) 52%, transparent 64%), ` : '') +
    (isCol(topC) ? `linear-gradient(160deg, ${paint(liftColor(topC, gloss ? 0.07 : 0.045))} 0%, ${paint(topC)} 62%, ${paint(dimColor(topC, 0.03))} 100%)` : topC);
  const lightEdge = (side: 'top' | 'bottom' | 'all') => {
    const line = edge ? `inset 0 0 0 1.5px ${edge}` : side === 'all' ? `inset 0 0 0 1px rgba(255,255,255,${edgeA * 0.7})` : `inset 0 ${side === 'top' ? 1 : -1}px 0 rgba(255,255,255,${edgeA})`;
    if (!bevel) return line;
    // a rounded edge by light: the top face darkens slightly toward its rim (the surface turns away from the light), a
    // side face brightens in a band under its top edge (it turns toward it)
    if (side === 'all') return `${line}, inset 0 0 ${bevel * 1.4}px ${bevel * 0.2}px ${withAlpha(isCol(topC) ? dimColor(topC, 0.35) : '#000', 0.22)}, inset 0 0 0 ${Math.max(1, bevel * 0.12)}px rgba(255,255,255,${edgeA * 0.5})`;
    const s = side === 'top' ? 1 : -1;
    return `${line}, inset 0 ${s * bevel * 0.9}px ${bevel}px -${bevel * 0.4}px rgba(255,255,255,${gloss ? 0.3 : 0.18})`;
  };
  const face = (bg: string, ww: number, hh: number, transform: string, shadowCss: string, content?: React.ReactNode, key?: string) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: -ww / 2,
        top: -hh / 2,
        width: ww,
        height: hh,
        background: bg,
        transform,
        borderRadius: radius,
        boxShadow: shadowCss,
        backfaceVisibility: glass ? 'visible' : 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  );
  // the shadow: the floor's hue in less light (black when no ground is given)
  const sc = ground ? fromLab((([L, A, B]) => [Math.min(0.25, L * 0.3), A * 0.6, B * 0.6] as Lab)(labOf(ground))) : ([0, 0, 0] as RGB);
  const sA = shadow * (glass ? 0.5 : 1);
  const m = Math.min(w, d);
  const spread = Math.min(0.5, (h / m) * 0.18);
  const floor = (k: number, grow: number, dx: number, dy: number, blur: number, a: number) => (
    <div
      key={k}
      style={{
        position: 'absolute',
        left: -(w * (1 + grow)) / 2 + dx,
        top: -(d * (1 + grow)) / 2 + dy,
        width: w * (1 + grow),
        height: d * (1 + grow),
        borderRadius: Math.max(radius, m * 0.06),
        background: `rgba(${sc.join(',')},${Math.min(1, a).toFixed(3)})`,
        filter: `blur(${blur.toFixed(1)}px)`,
        transform: `translateZ(${0.3 + k * 0.1}px)`,
      }}
    />
  );
  return (
    <div style={{ position: 'absolute', transformStyle: 'preserve-3d', ...style }}>
      {sA > 0 && [
        // the wide soft shadow: spreads, softens and slides away from the light (top-left) as the box gets taller
        floor(0, 0.1 + spread, h * 0.12, h * 0.16, Math.max(10, m * 0.05 + h * 0.3), sA * 0.55),
        // the contact: dark and tight where the box meets the floor
        floor(1, 0.02, 0, 0, Math.max(3, m * 0.018), sA * 0.9),
      ]}
      {/* top face, lying in the XY plane at z = h (the camera looks down on it when rx > 0) */}
      {face(topBg, w, d, `translateZ(${h}px)`, lightEdge('all'), topContent, 't')}
      {/* front face (toward +y); its CSS top edge is the box's top edge */}
      {face(sideBg(frontC, 'top'), w, h, `translateY(${d / 2}px) translateZ(${h / 2}px) rotateX(-90deg)`, lightEdge('top'), frontContent, 'f')}
      {/* right side (toward +x); its CSS bottom edge is the box's top edge */}
      {face(sideBg(sideC, 'bottom'), d, h, `translateX(${w / 2}px) translateZ(${h / 2}px) rotateY(90deg) rotateZ(90deg)`, lightEdge('bottom'), sideContent, 's')}
      {/* left and back faces so the box reads solid from any orbit */}
      {face(sideBg(sideC, 'bottom'), d, h, `translateX(${-w / 2}px) translateZ(${h / 2}px) rotateY(-90deg) rotateZ(-90deg)`, lightEdge('bottom'), sideContent ? <div style={{ transform: 'rotate(180deg)' }}>{sideContent}</div> : undefined, 'l')}
      {face(sideBg(frontC, 'bottom'), w, h, `translateY(${-d / 2}px) translateZ(${h / 2}px) rotateX(90deg)`, lightEdge('bottom'), undefined, 'b')}
    </div>
  );
};

/** Darken (amt < 0) or lighten (amt > 0) a hex colour. */
export const shade = (hex: string, amt: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Film grain: animated, fine, subtle (0.03-0.06), always the top layer. For photographs and footage, and at most a touch
 * on a deep ground. On a light ground (luma 0.6 or more) it draws NOTHING unless `force`: visible grain on a flat light
 * ground reads as mud, a dirty screen, not film. It finds the ground itself (the Ground, Field or Paper mounted beside it
 * in the film), or takes `ground` (a colour) when you pass one. Banding is the Dither's job, not grain's.
 */
export const Grain: React.FC<{ amount?: number; blend?: React.CSSProperties['mixBlendMode']; still?: boolean; force?: boolean; ground?: string }> = ({
  amount = 0.05,
  blend = 'overlay',
  still = false,
  force = false,
  ground,
}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState(false);
  useLayoutEffect(() => {
    let light = false;
    if (!force) {
      if (ground) light = luminance(ground) >= 0.6;
      else {
        // the nearest ancestor that holds a ground: every ground mounted on this frame must be light
        let el: HTMLElement | null = ref.current?.parentElement ?? null;
        for (let k = 0; el && k < 12; k++, el = el.parentElement) {
          const gs = Array.from(el.querySelectorAll<HTMLElement>('[data-ground-lum]'));
          if (gs.length) {
            light = gs.every((g) => parseFloat(g.dataset.groundLum ?? '0') >= 0.6);
            break;
          }
        }
      }
    }
    if (light !== off) setOff(light);
  }, [frame, force, ground, off]);
  // still: a fixed fibre (paper, card stock); otherwise film grain that moves every frame
  const seed = still ? 3 : frame % 8;
  return (
    <AbsoluteFill ref={ref} style={{ pointerEvents: 'none', mixBlendMode: blend, opacity: amount * 6, display: off ? 'none' : undefined }}>
      {!off && (
        <svg width="100%" height="100%">
          <filter id={`grain${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

/**
 * Four small marks that frame a line or a component without a box: dots (small squares, crisp at any size) or
 * brackets at the corners of a w x h box. Place it in the same positioned parent as the thing it frames (its box starts
 * at the parent's 0, 0); `inset` moves the marks inward (negative: outward, with air). From `appear` they arrive one by
 * one in reading order (TL, TR, BR, BL), each sliding a few px out from the centre into its corner.
 */
export const CornerMarks: React.FC<{
  w: number;
  h: number;
  inset?: number;
  size?: number;
  color?: string;
  shape?: 'dot' | 'bracket';
  appear?: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ w, h, inset = 0, size, color = '#0E1116', shape = 'dot', appear, x = 0, y = 0, style }) => {
  const frame = useCurrentFrame();
  const s = size ?? (shape === 'dot' ? 9 : 22);
  const t = shape === 'dot' ? s : Math.max(1.5, s * 0.09);
  const corners: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, pointerEvents: 'none', ...style }}>
      {corners.map(([cx, cy], i) => {
        const p = appear === undefined ? 1 : at(frame, appear + i * 3, 10, ease.out);
        if (p <= 0) return null;
        const sx = cx ? -1 : 1; // toward the inside
        const sy = cy ? -1 : 1;
        const px = cx * w + sx * inset;
        const py = cy * h + sy * inset;
        const slide = (1 - p) * 14;
        const common: React.CSSProperties = { position: 'absolute', opacity: Math.min(1, p * 1.6), transform: `translate(${sx * slide}px, ${sy * slide}px)` };
        if (shape === 'dot')
          return <div key={i} style={{ ...common, left: px - s / 2, top: py - s / 2, width: s, height: s, borderRadius: s * 0.16, background: color }} />;
        // a bracket: two strokes meeting at the corner, opening toward the inside
        return (
          <div
            key={i}
            style={{
              ...common,
              left: cx ? px - s : px,
              top: cy ? py - s : py,
              width: s,
              height: s,
              boxSizing: 'border-box',
              borderStyle: 'solid',
              borderColor: color,
              borderWidth: `${cy ? 0 : t}px ${cx ? t : 0}px ${cy ? t : 0}px ${cx ? 0 : t}px`,
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Depth of field for SHAPES: wraps a card, an icon, a photograph or an object and blurs it by its distance from the
 * plane in focus (`z` the thing's depth, `focusZ` the focus, both in the Camera's z units; `aperture` px of blur per
 * 100 units, `max` the cap). Animate `focusZ` to pull focus from one object to another. Never wrap a block of text in
 * it: blurred words read as a mistake, not as depth (dim or move text instead).
 */
export const Defocus: React.FC<{ z: number; focusZ?: number; aperture?: number; max?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  z,
  focusZ = 0,
  aperture = 2.2,
  max = 16,
  children,
  style,
}) => {
  const b = Math.min(max, (Math.abs(z - focusZ) / 100) * aperture);
  return <div style={{ filter: b > 0.15 ? `blur(${b.toFixed(2)}px)` : undefined, ...style }}>{children}</div>;
};

/**
 * Vignette: darkened edges. A rare effect, for a photograph or footage plate only (a lens look), at 0.15-0.3; never on a
 * flat or gradient ground, where it reads as dark corners, the first tell of a cheap film.
 */
export const Vignette: React.FC<{ amount?: number; color?: string }> = ({ amount = 0.35, color = '0,0,0' }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(${color},${amount}) 100%)` }} />
);

/** A soft light that sits behind a hero element and breathes. Sized to its source: a glow is never bigger than ~2x its object. */
export const Glow: React.FC<{ x?: number; y?: number; r?: number; color: string; strength?: number; pulse?: number }> = ({
  x: gx,
  y: gy,
  r = 420,
  color,
  strength = 0.55,
  pulse = 0.08,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: FW, height: FH } = useVideoConfig();
  const x = gx ?? FW / 2;
  const y = gy ?? FH / 2;
  const k = 1 + Math.sin((frame / fps) * 1.4) * pulse;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r * k,
        top: y - r * k,
        width: r * 2 * k,
        height: r * 2 * k,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        opacity: strength,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }}
    />
  );
};

/** A diagonal sheen that crosses an element once (glass catching the light). Put inside a relatively-positioned, overflow-hidden parent. */
export const Sheen: React.FC<{ start: number; dur?: number; angle?: number; strength?: number; width?: number }> = ({ start, dur = 22, angle = 20, strength = 0.55, width = 30 }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.inOut);
  if (frame < start || frame > start + dur) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: '-50%',
        background: `linear-gradient(${90 + angle}deg, transparent ${mix(p, -10, 90)}%, rgba(255,255,255,${strength}) ${mix(p, -10, 90) + width / 4}%, transparent ${mix(p, -10, 90) + width / 2}%)`,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * A depth ladder: a stack where every newer item pushes the older ones back one slot (smaller, lifted, blurred,
 * dimmer). Notifications, messages, results, history. `items[i].f` is the frame item i arrives; the newest is in front.
 * Each push eases over `push` frames, so a burst of arrivals reads as a pile growing, not a list scrolling.
 */
export const DepthStack: React.FC<{
  items: Array<{ f: number; node: React.ReactNode }>;
  /** Where the front slot sits (centre of the item). */
  x?: number;
  y?: number;
  /** Per slot (front first): scale, lift in px (older items peek above), blur px, brightness. */
  scale?: number[];
  lift?: number[];
  blur?: number[];
  dim?: number[];
  push?: number;
  /** Rise distance of a new arrival (px from below its slot). */
  rise?: number;
}> = ({
  items,
  x = 960,
  y = 540,
  scale = [1, 0.943, 0.894, 0.849, 0.807, 0.77],
  lift = [0, 96, 180, 255, 322, 380],
  blur = [0, 2.5, 3, 3.5, 9, 14],
  dim = [1, 0.92, 0.85, 0.78, 0.7, 0.6],
  push = 6,
  rise = 130,
}) => {
  const frame = useCurrentFrame();
  const lerp = (a: number[], v: number) => {
    const i = Math.min(a.length - 2, Math.floor(v));
    return mix(Math.min(1, Math.max(0, v - i)), a[i], a[i + 1]);
  };
  const n = scale.length;
  return (
    <>
      {items.map((it, i) => {
        if (frame < it.f) return null;
        let slot = 0;
        for (let j = i + 1; j < items.length; j++) slot += at(frame, items[j].f, push, ease.out);
        if (slot > n - 0.5) return null;
        const a = at(frame, it.f, push + 1, ease.out);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y - lerp(lift, slot) + mix(a, rise, 0),
              zIndex: 1000 - Math.round(slot * 10),
              transform: `translate(-50%, -50%) scale(${lerp(scale, slot) * mix(a, 0.95, 1)})`,
              filter: `blur(${lerp(blur, slot) + mix(a, 6, 0)}px) brightness(${lerp(dim, slot)})`,
              opacity: mix(a, 0.6, 1) * Math.min(1, n - 0.5 - slot),
            }}
          >
            {it.node}
          </div>
        );
      })}
    </>
  );
};

/**
 * A hard-edged beam of light from above (a trapezoid, additive, brightest at its source). `open` 0..1 opens it.
 * Light with a shape and a timing reads expensive; a vague glow reads generated.
 */
export const Beam: React.FC<{ open: number; color: string; x?: number; w0?: number; w1?: number; floor?: number; strength?: number }> = ({
  open,
  color,
  x: bx,
  w0 = 60,
  w1 = 700,
  floor: bfloor,
  strength = 0.85,
}) => {
  const { width: FW, height: FH } = useVideoConfig();
  const x = bx ?? FW / 2;
  const floor = bfloor ?? FH * 0.8;
  const a = w0 * open;
  const b = w1 * open;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        clipPath: `polygon(${x - a / 2}px -10px, ${x + a / 2}px -10px, ${x + b / 2}px ${floor}px, ${x - b / 2}px ${floor}px)`,
        background: `linear-gradient(180deg, ${color} 0%, ${color}99 30%, ${color}22 80%, transparent 100%)`,
        mixBlendMode: 'screen',
        opacity: strength * Math.min(1, open * 2),
        filter: 'blur(2px)',
        pointerEvents: 'none',
      }}
    />
  );
};

/** The pool a beam (or a lamp) leaves on the floor: an ellipse of light. */
export const Pool: React.FC<{ open: number; color: string; x?: number; y?: number; w?: number; h?: number }> = ({ open, color, x: px, y: py, w: pw, h = 240 }) => {
  const { width: FW, height: FH } = useVideoConfig();
  const x = px ?? FW / 2;
  const y = py ?? FH * 0.8;
  const w = pw ?? FW * 0.73;
  return (
  <div
    style={{
      position: 'absolute',
      left: x - (w / 2) * open,
      top: y - (h / 2) * open,
      width: w * open,
      height: h * open,
      borderRadius: '50%',
      background: `radial-gradient(ellipse, ${color}AA 0%, ${color}33 40%, transparent 70%)`,
      mixBlendMode: 'screen',
      filter: 'blur(6px)',
      pointerEvents: 'none',
    }}
  />
  );
};

/**
 * Glass done right on a dark or flat ground: a lit gradient (not a backdrop blur over nothing), a bright top rim, a
 * faint inner edge, a soft drop shadow. `lit` (0..1) brightens it as light reaches it; `sheenAt` sends a highlight across.
 */
export const GlassPanel: React.FC<{ w?: number; h?: number; radius?: number; tint?: string; lit?: number; pad?: number | string; children?: React.ReactNode; style?: React.CSSProperties; sheenAt?: number }> = ({
  w,
  h,
  radius = 26,
  tint = '#FFFFFF',
  lit = 1,
  pad = '28px 30px',
  children,
  style,
  sheenAt,
}) => (
  <div
    style={{
      position: 'relative',
      width: w,
      height: h,
      padding: pad,
      boxSizing: 'border-box',
      borderRadius: radius,
      overflow: 'hidden',
      background: `linear-gradient(160deg, ${tint}${Math.round(0x29 * lit).toString(16).padStart(2, '0')}, ${tint}0A)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.45 * lit}), inset 0 0 0 1px rgba(255,255,255,${0.14 * lit}), ${softShadow(4, '#0B0C0F')}`,
      ...style,
    }}
  >
    {sheenAt !== undefined && <Sheen start={sheenAt} />}
    {children}
  </div>
);

/** Paper: a still fibre texture over a flat ground colour (editorial worlds). Put it under the content. */
export const Paper: React.FC<{ color?: string; fibre?: number }> = ({ color, fibre = 0.05 }) => (
  <AbsoluteFill data-ground-lum={color ? luminance(color).toFixed(3) : undefined} style={{ background: color }}>
    <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: fibre * 8 }}>
      <svg width="100%" height="100%">
        <filter id="paper-fibre">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="3" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0.9 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-fibre)" />
      </svg>
    </AbsoluteFill>
  </AbsoluteFill>
);

/**
 * A hand-drawn stroke: an SVG path that draws itself from `start` over `dur` frames, with a slight wobble so it reads as
 * a pen, not a vector. Pass any path `d` (a sketch, an underline, a circle around a word).
 */
export const Stroke: React.FC<{ d: string; start: number; dur?: number; color?: string; width?: number; w?: number; h?: number; wobble?: number; style?: React.CSSProperties }> = ({
  d,
  start,
  dur = 18,
  color = '#2447F0',
  width = 4,
  w = 1920,
  h = 1080,
  wobble = 1.2,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.inOut);
  const id = `wob${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (frame < start) return null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" />
        <feDisplacementMap in="SourceGraphic" scale={wobble * 3} />
      </filter>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} filter={`url(#${id})`} />
    </svg>
  );
};
