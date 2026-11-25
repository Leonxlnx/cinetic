// Motion library, ui: shared parts. A premium surface (one radius family, layered tinted shadow, a lit top edge), app
// glyph tiles, the notification card, a pointer that looks right (arrow, outline, a shadow that lifts in travel, an
// arced decelerating path, a squash press and a soft ring), a caret, and typed text with fresh ink.
import React from 'react';
import { Easing, useCurrentFrame } from 'remotion';
import { at, clamp, ease, mix, type Ease } from '../motion';
import { mixColor } from '../type';
import { softShadow } from '../world';
import { AppIcon, Icon } from '../icons';

/** A look for the library's surfaces: light or dark, and the ground they sit on (the shadow takes its hue). */
export type Look = {
  dark: boolean;
  ground: string;
  surface: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  fill: string;
  accent: string;
  accentInk: string;
  font: string;
};

export const lookLight = (accent = '#2B5BFF', ground = '#EEF0F3'): Look => ({
  dark: false,
  ground,
  surface: '#FFFFFF',
  ink: '#111318',
  muted: '#6A7079',
  faint: '#A3A8B0',
  line: 'rgba(17,19,24,0.07)',
  fill: '#F2F3F5',
  accent,
  accentInk: '#FFFFFF',
  font: 'Inter Variable, Inter, sans-serif',
});

export const lookDark = (accent = '#4F7BFF', ground = '#0C0D10'): Look => ({
  dark: true,
  ground,
  surface: '#1B1C21',
  ink: '#F3F4F6',
  muted: '#9EA3AD',
  faint: '#6B707A',
  line: 'rgba(255,255,255,0.08)',
  fill: '#26282E',
  accent,
  accentInk: '#FFFFFF',
  font: 'Inter Variable, Inter, sans-serif',
});

// A piece's playback speed reaches every part inside it (pointer, caret, typed text, checks) through this context.
const TimeCtx = React.createContext<((f: number) => number) | null>(null);

/** The frame as the library's parts see it: the composition frame, mapped by every enclosing <Paced>. */
export const useUiFrame = () => {
  const f = useCurrentFrame();
  const m = React.useContext(TimeCtx);
  return m ? m(f) : f;
};

/** Plays its children at `speed` around `start` (2 = twice as fast). Every library piece with a `speed` wraps itself in one. */
export const Paced: React.FC<{ start: number; speed?: number; children: React.ReactNode }> = ({ start, speed = 1, children }) => {
  const parent = React.useContext(TimeCtx);
  if (speed === 1) return <>{children}</>;
  const map = (f: number) => {
    const g = parent ? parent(f) : f;
    return start + (g - start) * speed;
  };
  return <TimeCtx.Provider value={map}>{children}</TimeCtx.Provider>;
};

/** Wraps a piece so its `speed` reaches every part inside it (the piece then runs at 1 on the mapped frame). */
export const withPace = <P extends { at: number; speed?: number }>(C: React.FC<P>): React.FC<P> => {
  const W: React.FC<P> = (p) => (
    <Paced start={p.at} speed={p.speed ?? 1}>
      <C {...p} speed={1} />
    </Paced>
  );
  return W;
};

/** cubic-bezier as an easing function. */
export const bez = (a: number, b: number, c: number, d: number): Ease => Easing.bezier(a, b, c, d);

/** The surface every library card uses: hairline, a lit top edge, a layered shadow tinted to the ground. */
export const surfaceStyle = (L: Look, level = 3, radius = 32): React.CSSProperties => ({
  background: L.surface,
  borderRadius: radius,
  border: `1px solid ${L.line}`,
  boxShadow: L.dark
    ? `inset 0 1px 0 rgba(255,255,255,0.07), ${softShadow(level, L.ground)}`
    : `inset 0 1px 0 rgba(255,255,255,0.95), ${softShadow(level, L.ground)}`,
  color: L.ink,
  fontFamily: L.font,
  boxSizing: 'border-box',
});

/** A product glyph: a squircle tile with a two-stop gradient and a Lucide icon, or a letter (never a brand look-alike). */
export const Glyph: React.FC<{ icon?: string; letter?: string; colors?: [string, string]; size?: number }> = ({ icon, letter, colors = ['#3D6BFF', '#1E46D8'], size = 76 }) => (
  <AppIcon
    size={size}
    colors={colors}
    gloss={0.45}
    depth={0.55}
    glyph={
      icon ? (
        <Icon name={icon} size={size * 0.5} color="#FFFFFF" stroke={2.2} />
      ) : (
        <span style={{ fontFamily: 'Inter Variable, sans-serif', fontWeight: 650, fontSize: size * 0.46, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{letter}</span>
      )
    }
  />
);

/** A round letter avatar (a person). */
export const Face: React.FC<{ name: string; color?: string; size?: number }> = ({ name, color = '#C8692E', size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size,
      flexShrink: 0,
      background: `linear-gradient(160deg, ${mixColor(color, '#FFFFFF', 0.18)}, ${color})`,
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter Variable, sans-serif',
      fontWeight: 600,
      fontSize: size * 0.4,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
    }}
  >
    {name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')}
  </div>
);

export type NoticeData = {
  title: string;
  body?: string;
  time?: string;
  icon?: string;
  letter?: string;
  colors?: [string, string];
  /** A small line above the title (the app's name). */
  app?: string;
  /** The app's real logo (a React node, for example a <Brand>): drawn in place of the glyph tile. */
  mark?: React.ReactNode;
};

/** The app's mark at `size`: the passed logo when there is one, otherwise a neutral glyph tile. */
export const MarkSlot: React.FC<{ mark?: React.ReactNode; icon?: string; letter?: string; colors?: [string, string]; size: number }> = ({ mark, icon, letter, colors, size }) =>
  mark ? (
    <div style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mark}</div>
  ) : (
    <Glyph icon={icon} letter={letter} colors={colors} size={size} />
  );

/** A keyboard hint: a small key cap (hairline, a 1 px darker bottom edge), for shortcuts beside an action. */
export const KeyHint: React.FC<{ L: Look; k: string; size?: number; style?: React.CSSProperties }> = ({ L, k, size = 24, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: size * 1.5,
      height: size * 1.5,
      padding: `0 ${size * 0.4}px`,
      boxSizing: 'border-box',
      borderRadius: size * 0.38,
      border: `1px solid ${L.dark ? 'rgba(255,255,255,0.12)' : 'rgba(17,19,24,0.12)'}`,
      boxShadow: `inset 0 -1.5px 0 ${L.dark ? 'rgba(0,0,0,0.35)' : 'rgba(17,19,24,0.08)'}`,
      background: L.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
      color: L.muted,
      fontFamily: L.font,
      fontSize: size * 0.82,
      fontWeight: 560,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      ...style,
    }}
  >
    {k}
  </span>
);

/** A padded tag: tinted ground, its colour as text, full radius; padding a quarter of the size top and bottom, 0.7 at the sides. */
export const Pill: React.FC<{ L: Look; label: string; color?: string; size?: number; icon?: string; solid?: boolean; style?: React.CSSProperties }> = ({ L, label, color, size = 24, icon, solid, style }) => {
  const c = color ?? L.muted;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.32,
        padding: `${size * 0.26}px ${size * 0.7}px`,
        borderRadius: size * 2,
        background: solid ? c : color ? mixColor(L.surface, c, L.dark ? 0.2 : 0.12) : L.fill,
        color: solid ? '#FFFFFF' : color ? (L.dark ? mixColor(c, '#FFFFFF', 0.25) : mixColor(c, '#000000', 0.12)) : L.muted,
        fontFamily: L.font,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.15,
        letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size * 0.95} stroke={2.2} />}
      {label}
    </span>
  );
};

/** A presence dot ringed in the surface, for the corner of an avatar. */
export const Presence: React.FC<{ L: Look; color: string; size: number }> = ({ L, color, size }) => (
  <div style={{ position: 'absolute', right: -size * 0.05, bottom: -size * 0.05, width: size * 0.32, height: size * 0.32, borderRadius: size, background: color, border: `${Math.max(2, size * 0.06)}px solid ${L.surface}`, boxSizing: 'content-box' }} />
);

/**
 * A desktop app pane: a window with a title bar (three neutral dots, the app's `mark` and name, an optional node at the
 * right), an optional sidebar under the bar, the content as children (positioned inside the content area, which starts
 * under the bar and right of the sidebar). The same surface family as every card.
 */
export const AppPane: React.FC<{
  L: Look;
  w: number;
  h: number;
  title?: string;
  mark?: React.ReactNode;
  icon?: string;
  colors?: [string, string];
  right?: React.ReactNode;
  sidebar?: React.ReactNode;
  sideW?: number;
  size?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ L, w, h, title, mark, icon = 'LayoutGrid', colors, right, sidebar, sideW = 0, size = 26, children, style }) => {
  const bar = size * 2.5;
  const dot = size * 0.5;
  return (
    <div style={{ ...surfaceStyle(L, 5, size * 1.2), position: 'relative', width: w, height: h, overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: bar, display: 'flex', alignItems: 'center', padding: `0 ${size * 0.9}px`, gap: size * 0.5, borderBottom: `1px solid ${L.line}`, background: L.dark ? 'rgba(255,255,255,0.015)' : '#FBFBFC', boxSizing: 'border-box' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: dot, height: dot, borderRadius: dot, background: L.dark ? '#3A3C43' : '#DDDFE3', flexShrink: 0 }} />
        ))}
        <div style={{ width: size * 0.6 }} />
        {title && (
          <>
            <MarkSlot mark={mark} icon={icon} colors={colors} size={size * 1.2} />
            <div style={{ fontSize: size * 0.95, fontWeight: 600, color: L.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{title}</div>
          </>
        )}
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {sidebar && (
        <div style={{ position: 'absolute', left: 0, top: bar, bottom: 0, width: sideW, borderRight: `1px solid ${L.line}`, background: L.dark ? 'rgba(255,255,255,0.02)' : '#F8F8FA', boxSizing: 'border-box' }}>{sidebar}</div>
      )}
      <div style={{ position: 'absolute', left: sidebar ? sideW : 0, right: 0, top: bar, bottom: 0 }}>{children}</div>
    </div>
  );
};

/** The height of an AppPane's title bar at `size`. */
export const paneBar = (size = 26) => size * 2.5;

/** A sidebar list for an AppPane: rows of icon, label and an optional count; `active` is filled. */
export const PaneSidebar: React.FC<{ L: Look; items: Array<{ icon: string; label: string; count?: string }>; active?: number; size?: number; heading?: string; more?: Array<{ color: string; label: string }> }> = ({ L, items, active = 0, size = 26, heading, more }) => (
  <div style={{ padding: `${size * 0.9}px ${size * 0.6}px`, fontFamily: L.font }}>
    {items.map((it, i) => (
      <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: size * 0.55, height: size * 1.9, padding: `0 ${size * 0.55}px`, borderRadius: size * 0.45, background: i === active ? (L.dark ? 'rgba(255,255,255,0.07)' : 'rgba(17,19,24,0.055)') : 'transparent', color: i === active ? L.ink : L.muted, fontSize: size * 0.92, fontWeight: i === active ? 600 : 500 }}>
        <Icon name={it.icon} size={size * 0.95} stroke={2} />
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{it.label}</span>
        {it.count && <span style={{ fontSize: size * 0.82, color: i === active ? L.ink : L.faint, fontVariantNumeric: 'tabular-nums' }}>{it.count}</span>}
      </div>
    ))}
    {heading && <div style={{ margin: `${size * 1.1}px ${size * 0.55}px ${size * 0.5}px`, fontSize: size * 0.8, color: L.faint, fontWeight: 560 }}>{heading}</div>}
    {more?.map((m) => (
      <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: size * 0.6, height: size * 1.7, padding: `0 ${size * 0.55}px`, color: L.muted, fontSize: size * 0.9, fontWeight: 500 }}>
        <div style={{ width: size * 0.42, height: size * 0.42, borderRadius: size * 0.14, background: m.color, flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap' }}>{m.label}</span>
      </div>
    ))}
  </div>
);

/** A search field: icon, a placeholder or children (typed text), a key hint at the right. */
export const SearchField: React.FC<{ L: Look; w: number | string; size?: number; placeholder?: string; hint?: string; children?: React.ReactNode }> = ({ L, w, size = 26, placeholder = 'Search', hint = '⌘K', children }) => (
  <div style={{ width: w, height: size * 1.85, borderRadius: size * 0.5, background: L.fill, display: 'flex', alignItems: 'center', gap: size * 0.45, padding: `0 ${size * 0.3}px 0 ${size * 0.6}px`, boxSizing: 'border-box', fontFamily: L.font, fontSize: size * 0.9, color: L.faint, whiteSpace: 'nowrap' }}>
    <Icon name="Search" size={size * 0.9} color={L.muted} stroke={2.2} />
    <span style={{ flex: 1, color: children ? L.ink : L.faint }}>{children ?? placeholder}</span>
    {hint && <KeyHint L={L} k={hint} size={size * 0.72} />}
  </div>
);

/** A notification card: glyph (or the app's mark), title with the time at the right, one or two lines of body. Even padding all round. */
export const Notice: React.FC<{ L: Look; n: NoticeData; w?: number; size?: number; style?: React.CSSProperties }> = ({ L, n, w = 860, size = 32, style }) => (
  <div style={{ ...surfaceStyle(L, 3, size * 1.05), width: w, padding: size * 0.85, display: 'flex', gap: size * 0.7, alignItems: 'center', ...style }}>
    <MarkSlot mark={n.mark} icon={n.icon} letter={n.letter} colors={n.colors} size={size * 2.35} />
    <div style={{ flex: 1, minWidth: 0 }}>
      {n.app && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.5, marginBottom: size * 0.12 }}>
          <div style={{ flex: 1, fontSize: size * 0.9, color: L.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{n.app}</div>
          {n.time && <div style={{ fontSize: size * 0.9, color: L.faint, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{n.time}</div>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.5 }}>
        <div style={{ flex: 1, fontSize: size, fontWeight: 620, letterSpacing: '-0.012em', whiteSpace: 'nowrap' }}>{n.title}</div>
        {n.time && !n.app && <div style={{ fontSize: size * 0.94, color: L.faint, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{n.time}</div>}
      </div>
      {n.body && <div style={{ fontSize: size * 0.94, color: L.muted, marginTop: size * 0.14, lineHeight: 1.3, letterSpacing: '-0.005em' }}>{n.body}</div>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------------------------------------------
// The pointer

export type PointerKey = { f: number; x: number; y: number; curve?: Ease; /** The arc of the move arriving here (default the pointer's `bow`; 0 = straight, for a drag along a track). */ bow?: number };

/** Default travel: leaves briskly, decelerates long onto the target (the pointer "aims"). */
export const aim: Ease = bez(0.3, 0.05, 0.12, 1);

/** Where the pointer is on a frame: an arc between keys (bowed to one side, never a straight line), and its speed. */
export const pointerAt = (frame: number, keys: PointerKey[], bow = 0.14) => {
  if (frame <= keys[0].f) return { x: keys[0].x, y: keys[0].y, vx: 0, vy: 0 };
  const pos = (fr: number) => {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (fr <= b.f) {
        const p = (b.curve ?? aim)(clamp((fr - a.f) / Math.max(1, b.f - a.f)));
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.sin(p * Math.PI) * Math.min(120, len * (b.bow ?? bow));
        return { x: mix(p, a.x, b.x) + (dy / len) * k, y: mix(p, a.y, b.y) - (dx / len) * k };
      }
    }
    const l = keys[keys.length - 1];
    return { x: l.x, y: l.y };
  };
  const a = pos(frame);
  const b = pos(frame - 1);
  return { ...a, vx: a.x - b.x, vy: a.y - b.y };
};

/** The press of a pointer at `c`: 0..1, in over 3 frames, springing back over 6. */
export const pressOf = (frame: number, clicks: number[]) => {
  let p = 0;
  for (const c of clicks) p = Math.max(p, at(frame, c - 3, 3, ease.out) - at(frame, c, 7, bez(0.3, 1.5, 0.5, 1)));
  return p;
};

/**
 * A pointer that looks right: a macOS-proportioned arrow (tip, straight left edge, notch, tail) in near-black with a
 * white outline a tenth of its height, a two-layer shadow that drifts away while it travels (it is lifted) and closes
 * when it lands, a lean of a few degrees into its travel, a 2 px idle drift at rest, a squash press (0.84) that springs
 * back, and a soft ring that blooms from the tip on each click. `size` is its height in px.
 */
export const Pointer: React.FC<{
  keys: PointerKey[];
  clicks?: number[];
  size?: number;
  start?: number;
  /** Frame it leaves (accelerating down-right, 12 frames). */
  exitAt?: number;
  color?: string;
  outline?: string;
  ring?: string | false;
  hand?: boolean;
  bow?: number;
}> = ({ keys, clicks = [], size = 64, start = keys[0].f, exitAt, color = '#111216', outline = '#FFFFFF', ring = '#8FB0FF', hand = false, bow = 0.14 }) => {
  const frame = useUiFrame();
  if (frame < start) return null;
  if (exitAt !== undefined && frame > exitAt + 14) return null;
  const k = pointerAt(frame, keys, bow);
  const v = Math.hypot(k.vx, k.vy);
  const rest = clamp(1 - v / 3);
  const x = k.x + Math.sin(frame / 13) * 1.6 * rest;
  const y = k.y + Math.cos(frame / 17) * 1.2 * rest;
  const lean = clamp(k.vx / 40, -1, 1) * 7;
  const press = pressOf(frame, clicks);
  const appear = at(frame, start, 6, ease.out);
  const out = exitAt !== undefined ? at(frame, exitAt, 14, ease.in) : 0;
  const lift = Math.min(1, v / 25);
  const s = size / 24;
  const rings = ring
    ? clicks
        .filter((c) => frame >= c && frame < c + 22)
        .map((c) => {
          const q = at(frame, c, 20, ease.out);
          const r = mix(q, size * 0.25, size * 1.5);
          return (
            <div
              key={c}
              style={{
                position: 'absolute',
                left: k.x - r,
                top: k.y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: r,
                border: `${mix(q, size * 0.14, size * 0.03)}px solid ${ring}`,
                opacity: (1 - q) * 0.55,
                filter: `blur(${mix(q, 1, 5)}px)`,
                pointerEvents: 'none',
              }}
            />
          );
        })
    : null;
  const path = hand ? HAND : ARROW;
  return (
    <>
      {rings}
      <div
        style={{
          position: 'absolute',
          left: x + out * 520 - 3.2 * s,
          top: y + out * 380 - 2 * s,
          width: size,
          height: size,
          transformOrigin: `${3.2 * s}px ${2 * s}px`,
          transform: `rotate(${lean}deg) scale(${mix(appear, 0.7, 1) * (1 - press * 0.16)})`,
          opacity: appear * (1 - out),
          filter: `drop-shadow(0 ${mix(lift, 1.5, 7) * s * 0.5}px ${mix(lift, 1.5, 4) * s * 0.5}px rgba(0,0,0,${mix(lift, 0.28, 0.16)})) drop-shadow(0 ${mix(lift, 4, 14) * s * 0.5}px ${mix(lift, 6, 14) * s * 0.5}px rgba(0,0,0,${mix(lift, 0.16, 0.1)}))`,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`ptr${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor={mixColor(color, '#FFFFFF', 0.16)} />
              <stop offset="1" stopColor={color} />
            </linearGradient>
          </defs>
          <path d={path} fill={`url(#ptr${color.replace(/[^a-zA-Z0-9]/g, "")})`} stroke={outline} strokeWidth={1.7} strokeLinejoin="round" paintOrder="stroke" />
        </svg>
      </div>
    </>
  );
};

// tip at (3.2, 2): a straight left edge, a notch, a tail at the angle of the real arrow
const ARROW = 'M3.2 2 L3.2 19.1 L7.25 15.3 L10.1 21.6 L12.75 20.45 L9.95 14.25 L15.4 14.25 Z';
const HAND =
  'M8.2 2.6 C8.2 1.6 10.2 1.6 10.2 2.6 L10.2 9.6 L10.4 9.6 L10.4 8.2 C10.4 7.2 12.3 7.2 12.3 8.2 L12.3 9.8 L12.5 9.8 L12.5 8.8 C12.5 7.8 14.4 7.8 14.4 8.8 L14.4 10.3 L14.6 10.3 L14.6 9.7 C14.6 8.7 16.4 8.7 16.4 9.7 L16.4 15.2 C16.4 18.6 14.6 21.2 11.6 21.2 L10.6 21.2 C8.6 21.2 7.5 20.2 6.4 18.6 L3.6 14.4 C3.1 13.6 4.2 12.5 5.1 13.2 L8.2 15.6 Z';

/** A text caret: a 3 px bar in the accent, solid while typing, blinking (15 f) when idle. */
export const Caret: React.FC<{ color: string; height: number; typing?: boolean; since?: number; hidden?: boolean }> = ({ color, height, typing = true, since = 0, hidden }) => {
  const frame = useUiFrame();
  const on = typing || Math.floor((frame - since) / 15) % 2 === 0;
  return <span style={{ display: 'inline-block', width: Math.max(2.5, height * 0.07), height, marginLeft: 3, verticalAlign: 'middle', transform: `translateY(-${height * 0.06}px)`, borderRadius: 2, background: color, opacity: on && !hidden ? 1 : 0 }} />;
};

/**
 * Typed text with fresh ink: each character appears on its key frame in `born` and cools to `color` over `cool`
 * frames (the newest letters glow, then settle). `times` are the key frames (from typingTimes).
 */
export const InkTyped: React.FC<{ text: string; times: number[]; color: string; born: string; cool?: number }> = ({ text, times, color, born, cool = 6 }) => {
  const frame = useUiFrame();
  return (
    <>
      {text.split('').map((c, i) =>
        frame >= times[i] ? (
          <span key={i} style={{ color: mixColor(born, color, at(frame, times[i], cool, ease.linear)) }}>
            {c}
          </span>
        ) : null,
      )}
    </>
  );
};

/** Words that arrive one by one (frames `times`): each is born at 45 % in `born`, de-blurs and settles in 4 frames. */
export const InkWords: React.FC<{ text: string; start: number; every?: number; color: string; born: string }> = ({ text, start, every = 2, color, born }) => {
  const frame = useUiFrame();
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => {
        const f0 = start + i * every;
        const q = at(frame, f0, 5, ease.out);
        return (
          <span key={i} style={{ color: mixColor(born, color, q), opacity: frame < f0 ? 0 : mix(q, 0.45, 1), filter: q < 1 ? `blur(${mix(q, 3, 0)}px)` : undefined }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </>
  );
};

/** The frame a word-by-word line ends on. */
export const inkWordsEnd = (text: string, start: number, every = 2) => start + (text.split(' ').length - 1) * every + 5;
