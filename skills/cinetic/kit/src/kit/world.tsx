// Grounds, worlds and finish. A film lives in ONE world (see references/worlds.md); these are its pieces.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { at, ease, mix } from './motion';

const shadeHex = (hex: string, toward: string, p: number) => {
  const n = (h: string) => parseInt(h.replace('#', '').slice(0, 6), 16);
  const a = n(hex);
  const b = n(toward);
  const c = (sh: number) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * p));
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
};

/**
 * A ground in one colour, lit: a soft light in its own hue behind the subject and a gentle fall-off to the edges, so the
 * subject sits in light, not on a flat fill. `light` places it ({ x, y } as shares of the frame, `size`, `amount` 0-1);
 * `light={false}` keeps the ground flat (only when a mass fills the frame, or when the fill must match a flood exactly).
 */
export const Ground: React.FC<{
  color: string;
  light?: boolean | { x?: number; y?: number; size?: number; amount?: number };
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ color, light = true, children, style }) => {
  const l = light === false ? null : light === true ? {} : light;
  // visible on a thumbnail: a dark ground takes a stronger light than a light one (which mostly darkens at its edges)
  const lum = (() => { const n = parseInt(color.replace('#', '').slice(0, 6), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; })();
  const amt = l?.amount ?? (lum < 0.5 ? 0.18 : 0.08);
  const background = l
    ? `radial-gradient(ellipse ${(l.size ?? 0.75) * 100}% ${(l.size ?? 0.75) * 95}% at ${(l.x ?? 0.5) * 100}% ${(l.y ?? 0.46) * 100}%, ${shadeHex(color, '#ffffff', amt)} 0%, ${color} 62%, ${shadeHex(color, '#000000', amt * 0.9)} 100%)`
    : color;
  return <AbsoluteFill style={{ background, ...style }}>{children}</AbsoluteFill>;
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

/**
 * A solid box in CSS 3D with six faces. Put content on `top` / `front` / `side` faces (text set ON the object,
 * like a label printed on a block). Lives inside a <Camera>. Light comes from the top-left: top face brightest.
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
  edge?: string;
  style?: React.CSSProperties;
  /** A soft contact shadow on the floor under the block (0 = none). Objects without one float and read code-made. */
  shadow?: number;
}> = ({ w, d, h, color, top, front, side, topContent, frontContent, sideContent, radius = 0, edge, style, shadow = 0.35 }) => {
  const face = (bg: string, ww: number, hh: number, transform: string, content?: React.ReactNode, key?: string) => (
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
        boxShadow: edge ? `inset 0 0 0 1.5px ${edge}` : undefined,
        backfaceVisibility: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  );
  return (
    <div style={{ position: 'absolute', transformStyle: 'preserve-3d', ...style }}>
      {shadow > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -w * 0.62 + w * 0.08,
            top: -d * 0.62 + d * 0.1,
            width: w * 1.24,
            height: d * 1.24,
            borderRadius: Math.max(radius, Math.min(w, d) * 0.12),
            background: `rgba(0,0,0,${shadow})`,
            filter: `blur(${Math.max(6, Math.min(w, d) * 0.08 + h * 0.06)}px)`,
            transform: 'translateZ(0.5px)',
          }}
        />
      )}
      {/* top face, lying in the XY plane at z = h (the camera looks down on it when rx > 0) */}
      {face(top ?? color, w, d, `translateZ(${h}px)`, topContent, 't')}
      {/* front face (toward +y) */}
      {face(front ?? shade(color, -0.12), w, h, `translateY(${d / 2}px) translateZ(${h / 2}px) rotateX(-90deg)`, frontContent, 'f')}
      {/* right side (toward +x) */}
      {face(side ?? shade(color, -0.24), d, h, `translateX(${w / 2}px) translateZ(${h / 2}px) rotateY(90deg) rotateZ(90deg)`, sideContent, 's')}
      {/* left and back faces so the box reads solid from any orbit */}
      {face(side ?? shade(color, -0.24), d, h, `translateX(${-w / 2}px) translateZ(${h / 2}px) rotateY(-90deg) rotateZ(-90deg)`, sideContent ? <div style={{ transform: 'rotate(180deg)' }}>{sideContent}</div> : undefined, 'l')}
      {face(front ?? shade(color, -0.12), w, h, `translateY(${-d / 2}px) translateZ(${h / 2}px) rotateX(90deg)`, undefined, 'b')}
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

/** Film grain: animated, fine, subtle. 0.04-0.08 on dark grounds, 0.03 on light. Always the top layer. */
export const Grain: React.FC<{ amount?: number; blend?: React.CSSProperties['mixBlendMode']; still?: boolean }> = ({ amount = 0.06, blend = 'overlay', still = false }) => {
  const frame = useCurrentFrame();
  // still: a fixed fibre (paper, card stock); otherwise film grain that moves every frame
  const seed = still ? 3 : frame % 8;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: blend, opacity: amount * 6 }}>
      <svg width="100%" height="100%">
        <filter id={`grain${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Vignette: pulls the eye to the centre. 0.25-0.45. */
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
      boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.45 * lit}), inset 0 0 0 1px rgba(255,255,255,${0.14 * lit}), 0 30px 60px -20px rgba(0,0,0,0.7)`,
      ...style,
    }}
  >
    {sheenAt !== undefined && <Sheen start={sheenAt} />}
    {children}
  </div>
);

/** Paper: a still fibre texture over a flat ground colour (editorial worlds). Put it under the content. */
export const Paper: React.FC<{ color?: string; fibre?: number }> = ({ color, fibre = 0.05 }) => (
  <AbsoluteFill style={{ background: color }}>
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
