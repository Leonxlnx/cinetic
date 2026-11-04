// The kit's parts: the small pieces real product UI is made of, built at film size (every size is px at
// 1080p, the web design x1.9: no string under TEXT_MIN) and lit by the house key (KIT_KEY below): a
// contact shadow where a surface meets its ground, a cast shadow thrown away from the light, a face that
// lifts toward it. Every part is a pure function of its props (and of `frame` where it moves), drawn with
// transforms and opacity only. Text carries data-text (the layout audit measures it); the kit's roots
// carry data-ui, so product strings are counted apart from the film's copy.
import React, { useId } from 'react';
import { Img } from 'remotion';
import { C, FONT, TEXT_MIN, TYPE } from '../brand/tokens';
import { clamp, E, mix, prog, rand } from '../lib/anim';
import { mixColor } from '../lib/color';
import { uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { HalftonePortrait, MonogramTile, PortraitMark } from './avatars';
import { ICON_GRID, ICONS, type IconPaths } from './icons';
import type { GlyphName } from './sample';
import { type KitTheme, lit, shadeRgba } from './theme';
import { kitEmpty, KitEmpty } from './gate';

/** Kit type sizes, px at 1080p: label is the ui role (the smallest size held in focus). */
export const KIT_TYPE = { label: TYPE.ui.size, body: 48, title: 64, head: 84, figure: 160, hero: 230 } as const;

/** The kit's scale: the film's layout unit (1 at 1080p), or an explicit one. */
export const useKitScale = (scale?: number) => {
  const film = useFilm();
  return scale ?? uOf(film);
};

/** The kit's face: the film's text face (FONT.ui, the pairing's UI cut: fx/TypePairs), else its one sans. */
export const KIT_FONT: string = (FONT as { ui?: string }).ui ?? FONT.text;

/** CSS for kit text: the text face, tabular lining figures, kerning on, no wrapping. */
export const face = (px: number, weight: number, color: string, track = -0.015, lead = 1.15): React.CSSProperties => ({
  fontFamily: KIT_FONT,
  fontSize: px,
  fontWeight: weight,
  letterSpacing: `${track}em`,
  lineHeight: lead,
  color,
  whiteSpace: 'pre',
  fontVariantNumeric: 'tabular-nums lining-nums',
  fontKerning: 'normal',
});

/**
 * A title's size in a column `maxW` px wide, never cut with "...": the given size when it fits, else smaller down to
 * `min` of it, else that size wrapped onto two lines. Measured with the loaded face in the browser (every act renders
 * under FontGate); on the server (tests) the size is kept.
 */
export const fitTitle = (text: string, px: number, weight: number, maxW: number, min = 0.78): { px: number; wrap: boolean } => {
  if (typeof document === 'undefined' || !text || !(maxW > 0)) return { px, wrap: false };
  const w = measureTracked(text, px, weight, -0.01, KIT_FONT, { trailing: false });
  if (w <= maxW) return { px, wrap: false };
  const k = maxW / w;
  return k >= min ? { px: px * k * 0.99, wrap: false } : { px: px * min, wrap: true };
};

/**
 * A line of kit text inside its parent (px): left-aligned at (x, y), or with `width` set, aligned inside
 * the box [x, x + width] (right or center). Carries a data-text id.
 */
export const Text: React.FC<{ id: string; x?: number; y?: number; px: number; weight?: number; color: string; children: React.ReactNode; track?: number; align?: 'left' | 'right' | 'center'; width?: number; style?: React.CSSProperties }> = ({
  id,
  x = 0,
  y = 0,
  px,
  weight = 500,
  color,
  children,
  track,
  align = 'left',
  width,
  style,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, width, textAlign: width === undefined ? 'left' : align }}>
    <span data-text={id} style={{ ...face(px, weight, color, track), ...style }}>
      {children}
    </span>
  </div>
);

/**
 * The house key the kit is lit by: one directional source from the upper left (azimuth 315, 34 degrees
 * up, the house numbers of fx/KeyLight, which draws relief scenes under the same key). A part `h` px above
 * its ground throws its shadow h / tan(elevation) away from the light (house: 1.48 x h), softer and fainter
 * with height; a tight contact shadow sits where it meets the ground.
 */
export const KIT_KEY = { azimuth: 315, elevation: 34, contact: { blur: 5, alpha: 0.32 }, cast: { alpha: 0.18, blurPerPx: 0.3, maxAlpha: 0.24 } } as const;

/** The cast shadow of a part `h` px above its ground under the kit's key: offset (px), blur (px), alpha. */
export const castShadow = (h: number, key: { azimuth: number; elevation: number } = KIT_KEY) => {
  const len = Math.max(0, h) / Math.tan(((Math.max(5, Math.min(85, key.elevation)) * Math.PI) / 180));
  const az = (key.azimuth * Math.PI) / 180; // the floor direction the light comes from (0 = top, 90 = right)
  return {
    dx: -Math.sin(az) * len, // shadows fall away from the light
    dy: Math.cos(az) * len,
    blur: 2 + KIT_KEY.cast.blurPerPx * Math.max(0, h),
    alpha: Math.min(KIT_KEY.cast.maxAlpha, KIT_KEY.cast.alpha * (1 + 8 / (8 + Math.max(0, h)))),
  };
};

/** The CSS angle (deg) of a gradient running away from the key (lit side first): azimuth 315 -> 135deg. */
export const keyAngle = (azimuth: number = KIT_KEY.azimuth) => (((azimuth + 180) % 360) + 360) % 360;

/**
 * A card's material (house numbers): the rim light (a hairline round the edge: white at `rim` on a dark card, the
 * shade at `hair` on a light one), an inner top highlight (`top`: the edge catching the key) and, on a dark card, the
 * far edge falling into shade (`far`). The theme keeps a dark card 8 L* or more over its ground (kit/theme.ts): a dark
 * card reads off its ground by light, never as one grey a step off another (look-audit card-separation). kit/card.tsx
 * is the same material as a standalone Card.
 */
export const CARD_LIGHT = { rim: 0.08, hair: 0.07, top: 0.11, topLight: 0.9, far: 0.18 } as const;

/**
 * The shadows of a surface `lift` px above its ground (28 resting): the hairline and the inner top highlight, a tight
 * contact shadow and a broad soft ambient one, mostly straight down (a softbox key from above), nudged 22 % away from
 * the light; the ambient layer lengthens and softens with the lift. In the theme's own shade. One box-shadow value.
 */
export const surfaceShadow = (t: KitTheme, lift: number, u = 1) => {
  const L = CARD_LIGHT;
  const y1 = 1.2 * u;
  const y2 = (4 + 0.4 * Math.max(0, lift)) * u;
  const b2 = (12 + 1.0 * Math.max(0, lift)) * u;
  const sp = -0.3 * Math.max(0, lift) * u;
  const k = t.shadeA / (t.dark ? 0.32 : 0.24);
  const contact = `${(0.22 * y1).toFixed(2)}px ${y1.toFixed(2)}px ${(2.5 * u).toFixed(2)}px ${shadeRgba(t, (t.dark ? 0.42 : 0.1) * k)}`;
  const ambient = `${(0.22 * y2).toFixed(2)}px ${y2.toFixed(2)}px ${b2.toFixed(2)}px ${sp.toFixed(2)}px ${shadeRgba(t, (t.dark ? 0.48 : 0.15) * k)}`;
  const hair = t.dark ? `inset 0 0 0 ${(1.25 * u).toFixed(2)}px rgba(255, 255, 255, ${L.rim})` : `inset 0 0 0 ${(1.25 * u).toFixed(2)}px ${shadeRgba(t, L.hair)}`;
  const top = `inset 0 ${(1.2 * u).toFixed(2)}px 0 rgba(255, 255, 255, ${t.dark ? L.top : L.topLight})`;
  return `${hair}, ${top}, ${contact}, ${ambient}`;
};

/** A face lit from above: the fill lifted a touch at the top, its own colour mid-way, a touch of shade at the bottom (a vertical sheen, never a diagonal wash). */
export const keyFace = (t: KitTheme, fill: string, amount = 0.08) => `linear-gradient(180deg, ${lit(t, fill, amount * 0.45)} 0%, ${fill} 55%, ${mixColor(fill, `rgb(${t.shade.join(', ')})`, amount * 0.3)} 100%)`;

export type SurfaceProps = {
  theme: KitTheme;
  w: number;
  h: number;
  x?: number;
  y?: number;
  r?: number; // corner radius (default: kit/card CARD.radius by width, 24 / 34 / 46 px at 1080p, never over 12 % of the short side)
  lift?: number; // px above the ground (default 28): the cast shadow's length and softness
  tone?: 'surface' | 'raised' | 'well' | 'accent' | 'ground';
  fill?: string; // overrides the tone
  scale?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/** A card or panel face on the ground, lit from above, facing the camera, content clipped to it (kit/card.tsx Card is the standalone version). */
export const Surface: React.FC<SurfaceProps> = ({ theme: t, w, h, x = 0, y = 0, r, lift = 28, tone = 'surface', fill, scale, children, style }) => {
  const u = useKitScale(scale);
  const base = fill ?? t[tone];
  return (
    <div
      data-ui
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: r ?? Math.min(Math.min(w, h) * 0.12, (w >= 900 * u ? 46 : w >= 520 * u ? 34 : 24) * u),
        background: keyFace(t, base, tone === 'well' ? 0.03 : 0.07),
        boxShadow: tone === 'well' ? `inset ${(2 * u).toFixed(2)}px ${(3 * u).toFixed(2)}px ${(6 * u).toFixed(2)}px ${shadeRgba(t, t.shadeA * 0.8)}` : surfaceShadow(t, lift, u),
        overflow: 'hidden',
        transform: `translate(${x}px, ${y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** How an avatar is drawn: a lit gradient portrait, a halftone portrait, or a monogram tile (24-40 px chips only). */
export type AvatarKind = 'auto' | 'portrait' | 'halftone' | 'monogram';
/** Up to this size (px at 1080p) an avatar is a monogram tile; above it, a portrait. */
export const AVATAR_MONOGRAM_MAX = 40;

/**
 * A person, crafted (kit/avatars.tsx): a lit gradient portrait in a disc by default, a halftone portrait with
 * `kind="halftone"`, a monogram tile only on a 24-40 px chip (`auto` picks it at AVATAR_MONOGRAM_MAX and under).
 * Never a grey silhouette, never a circle of initials. `seed` is the person (default: their initials and index), so
 * the same person has the same face in every shot; `ring` draws the rim that separates it from what it overlaps.
 * `src` shows a real portrait photograph instead (staticFile of a photo from scripts/assets.mjs --people, or the
 * user's), cropped round its `focus` (0..1, default the upper middle where a face sits): a person who matters in the
 * shot (a channel's owner, a quote card, a team) is a real photo; the drawn portrait is for a crowd of small faces.
 */
export const Avatar: React.FC<{ theme: KitTheme; i: number; initials: string; size: number; ring?: string; x?: number; y?: number; seed?: string | number; kind?: AvatarKind; scale?: number; src?: string; focus?: [number, number] }> = ({
  theme: t,
  i,
  initials,
  size,
  ring,
  x,
  y,
  seed,
  kind = 'auto',
  scale,
  src,
  focus = [0.5, 0.32],
}) => {
  const u = useKitScale(scale);
  const who = seed ?? `${initials}:${i}`;
  const k: AvatarKind = src ? 'portrait' : kind === 'auto' ? (size <= AVATAR_MONOGRAM_MAX * u ? 'monogram' : 'portrait') : kind;
  const rim = ring ? Math.max(1.5 * u, size * 0.055) : 0;
  return (
    <div
      data-ui
      style={{
        position: x === undefined ? 'relative' : 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: k === 'monogram' ? size * 0.3 : '50%',
        boxShadow: [ring && `0 0 0 ${rim.toFixed(2)}px ${ring}`, `0 ${(size * 0.04).toFixed(2)}px ${(size * 0.12).toFixed(2)}px ${shadeRgba(t, t.shadeA * 0.6)}`].filter(Boolean).join(', '),
        flex: 'none',
      }}
    >
      {src ? (
        <Img data-imagery="" src={src} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: `${(focus[0] * 100).toFixed(1)}% ${(focus[1] * 100).toFixed(1)}%`, display: 'block' }} />
      ) : k === 'monogram' ? (
        <MonogramTile theme={t} seed={who} initials={initials} size={size} font={(px, w, c) => face(px, w, c, 0)} />
      ) : k === 'halftone' ? (
        <HalftonePortrait theme={t} seed={who} size={size} />
      ) : (
        <PortraitMark theme={t} seed={who} size={size} />
      )}
    </div>
  );
};

/**
 * Overlapping avatars (the people on a project): each one rimmed in `ring` (the surface it sits on) so the overlap
 * reads as depth, the first on top; `more` adds a count tile ("+12") after the last face.
 */
export const AvatarStack: React.FC<{ theme: KitTheme; people: { initials: string; seed?: string; src?: string; focus?: [number, number] }[]; size: number; ring: string; n?: number; overlap?: number; more?: number; kind?: AvatarKind }> = ({
  theme: t,
  people,
  size,
  ring,
  n = people.length,
  overlap = 0.28,
  more,
  kind,
}) => {
  const shown = people.slice(0, n);
  return (
    <div data-ui style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((p, k) => (
        <div key={k} style={{ marginLeft: k ? -size * overlap : 0, position: 'relative', zIndex: shown.length - k }}>
          <Avatar theme={t} i={k} initials={p.initials} seed={p.seed} size={size} ring={ring} kind={kind} src={p.src} focus={p.focus} />
        </div>
      ))}
      {more !== undefined && more > 0 && (
        <div style={{ marginLeft: -size * overlap, width: size, height: size, borderRadius: '50%', background: t.well, boxShadow: `0 0 0 ${Math.max(1.5, size * 0.055).toFixed(2)}px ${ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: size * overlap * 0.8, boxSizing: 'border-box', flex: 'none' }}>
          <span {...(size * 0.36 >= TEXT_MIN ? { 'data-text': 'kit-avatar-more' } : { 'data-texture': '' })} style={face(size * 0.36, 600, t.mute, -0.02)}>
            {`+${more}`}
          </span>
        </div>
      )}
    </div>
  );
};

/** A round tick: done. */
export const Check: React.FC<{ size: number; fill: string; tick: string; ring?: string }> = ({ size, fill, tick, ring }) => (
  <svg data-icon="check" width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <circle cx={12} cy={12} r={ring ? 10.6 : 11.5} fill={fill} stroke={ring} strokeWidth={ring ? 1.6 : 0} />
    <path d="M7 12.5l3.2 3.2L17 9" stroke={tick} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** A ring with a dot: waiting. */
export const Pending: React.FC<{ size: number; stroke: string; fill: string }> = ({ size, stroke, fill }) => (
  <svg data-icon="pending" width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <circle cx={12} cy={12} r={10.2} fill={fill} stroke={stroke} strokeWidth={1.6} />
    <circle cx={12} cy={12} r={3} fill={stroke} />
  </svg>
);

/** How a glyph is drawn: a line (regular, or bold from weight 2.3), filled, or duotone (a quiet tone under the line). */
export type GlyphStyle = 'line' | 'fill' | 'duotone';

/**
 * A generic glyph (kit/icons.ts, Phosphor): `weight` keeps the old stroke scale (2 = the regular line, 2.3 and up the
 * bold one); `variant` fills it or lays the duotone's tone (`tone`, default the line colour at 20 %) under the line.
 * For a product, source or model the film names, use its real mark (kit/logos.tsx) instead. Tagged data-icon: the layout
 * audit logs its drawn box, so text crossing it is caught (scripts/ui-layout.cjs); set it beside its label, never under text.
 */
export const Glyph: React.FC<{ name: GlyphName; size: number; color: string; weight?: number; variant?: GlyphStyle; tone?: string }> = ({ name, size, color, weight = 2, variant = 'line', tone }) => {
  const p: IconPaths = ICONS[name];
  return (
    <svg data-icon={name} width={size} height={size} viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`} style={{ display: 'block' }}>
      {variant === 'fill' && <path d={p.fill} fill={color} />}
      {variant === 'duotone' && <path d={p.tone} fill={tone ?? color} opacity={tone ? 1 : 0.2} />}
      {variant !== 'fill' && <path d={variant === 'duotone' ? p.duo ?? p.regular : weight >= 2.3 ? p.bold : p.regular} fill={color} />}
    </svg>
  );
};

/** A glyph on a soft accent tile (a category, a generic action): duotone on the soft tile, filled on the solid one. */
export const GlyphTile: React.FC<{ theme: KitTheme; name: GlyphName; size: number; solid?: boolean; variant?: GlyphStyle }> = ({ theme: t, name, size, solid, variant }) => (
  <div data-icon={name} style={{ width: size, height: size, borderRadius: size * 0.28, background: solid ? t.accent : t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
    <Glyph name={name} size={size * 0.56} color={solid ? t.accentInk : t.dark ? t.text : t.accentDeep} weight={2.2} variant={variant ?? (solid ? 'fill' : 'duotone')} />
  </div>
);

/** A status pill: a dot and a label; `on` switches it to the accent. */
export const Badge: React.FC<{ theme: KitTheme; label: string; on?: boolean; px?: number; id?: string }> = ({ theme: t, label, on, px = KIT_TYPE.label, id = 'kit-badge' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: px * 0.4, height: px * 1.9, padding: `0 ${px * 0.7}px`, borderRadius: px, boxShadow: `inset 0 0 0 ${Math.max(1.5, px * 0.05)}px ${on ? t.accent : t.line}`, background: on ? mixColor(t.surface, t.accent, 0.14) : 'transparent' }}>
    <div style={{ width: px * 0.38, height: px * 0.38, borderRadius: '50%', background: on ? t.accent : t.mute }} />
    <span data-text={id} style={face(px, 600, on ? t.text : t.mute)}>
      {label}
    </span>
  </div>
);

/** A filled bar on its track: `p` 0..1 of the way. */
export const Meter: React.FC<{ theme: KitTheme; w: number; h: number; p: number; fill?: string }> = ({ theme: t, w, h, p, fill }) => (
  <div style={{ position: 'relative', width: w, height: h, borderRadius: h / 2, background: t.well, overflow: 'hidden', flex: 'none' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: h / 2, background: fill ?? t.accent, transformOrigin: '0 50%', transform: `scaleX(${clamp(p).toFixed(5)})` }} />
  </div>
);

/** A primary action: a pill in the accent. `q` (0..1) is the press: the face deepens as it goes down. */
export const Button: React.FC<{ theme: KitTheme; label: string; w: number; h: number; q?: number; hover?: boolean; id?: string }> = ({ theme: t, label, w, h, q = 0, hover, id = 'kit-button' }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: h / 2,
      background: mixColor(hover ? lit(t, t.accent, 0.12) : t.accent, t.accentDeep, 0.35 * clamp(q)),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 ${(h * 0.08 * (1 - clamp(q))).toFixed(2)}px ${(h * 0.24).toFixed(2)}px ${shadeRgba(t, t.shadeA * (1 - 0.6 * clamp(q)))}`,
    }}
  >
    <span data-text={id} style={face(h * 0.42, 600, t.accentInk, -0.01)}>
      {label}
    </span>
  </div>
);

/** A notice landing on the product: what happened, when, and the glyph the film picks for it (none by default). */
export const Toast: React.FC<{ theme: KitTheme; title: string; sub?: string; w: number; h: number; glyph?: GlyphName; id?: string }> = ({ theme: t, title, sub, w, h, glyph, id = 'kit-toast' }) => {
  const u = useKitScale();
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: h / 2, background: t.dark ? t.raised : t.text, boxShadow: surfaceShadow(t, 40, u), display: 'flex', alignItems: 'center', gap: h * 0.2, padding: `0 ${h * 0.36}px 0 ${glyph ? h * 0.2 : h * 0.36}px`, boxSizing: 'border-box' }}>
      {glyph && (
        <div style={{ width: h * 0.62, height: h * 0.62, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Glyph name={glyph} size={h * 0.36} color={t.accentInk} weight={2.8} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: h * 0.02 }}>
        <span data-text={`${id}-title`} style={face(sub ? h * 0.34 : h * 0.38, 600, t.dark ? t.text : t.ground)}>
          {title}
        </span>
        {sub && (
          <span data-text={`${id}-sub`} style={face(Math.max(KIT_TYPE.label * u, h * 0.26), 500, t.dark ? t.mute : mixColor(t.ground, t.text, 0.35))}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
};

/** A trend line from values (drawn left to right up to `draw` 0..1). */
export const Sparkline: React.FC<{ values: number[]; w: number; h: number; color: string; weight?: number; draw?: number }> = ({ values, w, h, color, weight = 6, draw = 1 }) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - weight - ((v - lo) / Math.max(1e-6, hi - lo)) * (h - 2 * weight)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const len = pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} stroke={color} strokeWidth={weight} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len.toFixed(1)} ${len.toFixed(1)}`} strokeDashoffset={(len * (1 - clamp(draw))).toFixed(1)} />
    </svg>
  );
};

/** Bars that grow from the baseline in turn (from `start`, `stagger` frames apart, `dur` each, front-loaded), labels under them. */
export const BarChart: React.FC<{
  theme: KitTheme;
  frame: number;
  values: number[];
  labels?: string[];
  w: number;
  h: number;
  start?: number;
  stagger?: number;
  dur?: number;
  highlight?: number;
  px?: number;
  id?: string;
}> = ({ theme: t, frame, values, labels, w, h, start = -1e9, stagger = 3, dur = 26, highlight = -1, px = KIT_TYPE.label, id = 'kit-bars' }) => {
  const n = values.length;
  const gap = (w / n) * 0.34;
  const bw = (w - gap * (n - 1)) / n;
  const top = Math.max(...values);
  const labelH = labels ? px * 1.6 : 0;
  const chartH = h - labelH;
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {values.map((v, i) => {
        const g = E.snapOut(clamp((frame - start - i * stagger) / dur));
        const full = (chartH * v) / top;
        return (
          <React.Fragment key={i}>
            {/* the bar rises out of the baseline (a translate inside a clip at the baseline: the rounded top keeps its shape) */}
            <div style={{ position: 'absolute', left: i * (bw + gap), top: 0, width: bw, height: chartH, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: chartH - full, width: bw, height: full, borderRadius: Math.min(bw * 0.22, 14), background: i === highlight ? t.accent : t.accentSoft, transform: `translateY(${((1 - g) * full).toFixed(3)}px)` }} />
            </div>
            {labels?.[i] !== undefined && (
              <div style={{ position: 'absolute', left: i * (bw + gap) - gap / 2, top: chartH + px * 0.35, width: bw + gap, textAlign: 'center' }}>
                <span data-text={`${id}-${i}`} style={face(px, 500, i === highlight ? t.text : t.mute)}>
                  {labels[i]}
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** A donut: `p` of the ring filled in the accent, drawn to `draw` 0..1. */
export const Ring: React.FC<{ theme: KitTheme; size: number; p: number; draw?: number; weight?: number }> = ({ theme: t, size, p, draw = 1, weight }) => {
  const sw = weight ?? size * 0.1;
  const R = size / 2 - sw / 2;
  const Cc = 2 * Math.PI * R;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={t.well} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={t.accent} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${(Cc * clamp(p) * clamp(draw)).toFixed(2)} ${Cc.toFixed(2)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
};

// ------------------------------------------------------------------------------------------ a file, not a picture
/**
 * A picture slot with no picture yet, shown as what the product itself shows for a file: an image glyph on its tile,
 * the file's `name` and `size` as the product lists them (the film's own files). Product UI, never a drawn stand-in for
 * the photo: give the slot a real photo (`src` on Photo) and it shows the photo instead. Without a name it draws the
 * image glyph alone and reports kit-empty: the kit never makes up file names. A long name shrinks, then wraps onto two
 * lines (fitTitle), never cut with "...".
 */
export const FileThumb: React.FC<{ theme: KitTheme; w: number; h: number; name?: string; size?: string; seed?: number; radius?: number; scale?: number }> = ({ theme: t, w, h, name, size, radius = 0, scale }) => {
  const u = useKitScale(scale);
  const px = Math.max(TEXT_MIN * u, Math.min(KIT_TYPE.label * u, w * 0.13));
  if (!name) kitEmpty('FileThumb', "name (the film's own file name) or a real photo");
  const nf = name ? fitTitle(name, px * 0.8, 600, w * 0.86) : { px: px * 0.8, wrap: false };
  return (
    <div data-ui {...(name ? {} : { 'data-kit-empty': 'FileThumb', 'data-kit-need': 'name' })} style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', background: t.well, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px * 0.5 }}>
      <GlyphTile theme={t} name="image" size={Math.min(w, h) * 0.34} />
      {name && <span data-texture="" style={{ ...face(nf.px, 600, t.text, -0.01, 1.1), maxWidth: w * 0.86, overflow: 'hidden', textOverflow: 'clip', textAlign: 'center', ...(nf.wrap ? { whiteSpace: 'normal', overflowWrap: 'anywhere', maxHeight: nf.px * 1.1 * 2 } : null) }}>{name}</span>}
      {name && size && <span data-texture="" style={face(px * 0.7, 500, t.mute, -0.01, 1.1)}>{size}</span>}
    </div>
  );
};

// ------------------------------------------------------------------------------------------ the still life
export type Vessel = 'vase' | 'jar' | 'bowl' | 'bottle' | 'cup';
/** Radius profile of a vessel, bottom (t 0) to lip (t 1), as [t, r] control points (r 1 = its widest). */
const PROFILE: Record<Vessel, { pts: [number, number][]; aspect: number; open: boolean }> = {
  vase: { pts: [[0, 0.52], [0.12, 0.8], [0.38, 1], [0.62, 0.74], [0.8, 0.3], [0.92, 0.32], [1, 0.42]], aspect: 1.55, open: true },
  jar: { pts: [[0, 0.68], [0.2, 0.94], [0.45, 1], [0.74, 0.9], [0.88, 0.6], [1, 0.64]], aspect: 1.08, open: true },
  bowl: { pts: [[0, 0.44], [0.25, 0.72], [0.6, 0.93], [1, 1]], aspect: 0.46, open: true },
  bottle: { pts: [[0, 0.82], [0.1, 1], [0.5, 1], [0.66, 0.78], [0.76, 0.3], [0.86, 0.22], [1, 0.24]], aspect: 2.3, open: false },
  cup: { pts: [[0, 0.7], [0.15, 0.84], [1, 1]], aspect: 0.92, open: true },
};
const smooth = (pts: [number, number][], t: number) => {
  let i = 0;
  while (i < pts.length - 2 && t > pts[i + 1][0]) i++;
  const [t0, r0] = pts[i];
  const [t1, r1] = pts[i + 1];
  const k = clamp((t - t0) / Math.max(1e-6, t1 - t0));
  return mix(r0, r1, k * k * (3 - 2 * k));
};

/**
 * A picture inside product UI: `src`, a real photograph (the product's own, the user's, or one from scripts/assets.mjs),
 * cropped round `focus` with a slow `push` (0..1). Without `src` it draws its empty state and reports kit-empty; the
 * kit's stand-in (matte vessels on a seamless backdrop, marked data-drawn="product", which lint-film's drawn-figure and
 * the layout audit fail) draws only when asked for with `vessels` or `standIn` (the kit's gallery). Give every picture
 * slot a real photo, or show the product's own UI there instead.
 */
export const Photo: React.FC<{ theme: KitTheme; w: number; h: number; seed?: number; vessels?: Vessel[]; standIn?: boolean; src?: string; radius?: number; push?: number; focus?: { x: number; y: number } }> = ({
  theme: t,
  w,
  h,
  seed = 1,
  vessels,
  standIn,
  src,
  radius = 0,
  push = 0,
  focus = { x: 0.5, y: 0.55 },
}) => {
  const uid = `ph${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const k = 1 + 0.12 * clamp(push);
  if (src)
    return (
      <div style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden' }}>
        <Img data-imagery="" src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus.x * 100}% ${focus.y * 100}%`, transform: `scale(${k.toFixed(5)})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }} />
      </div>
    );
  if (!vessels && !standIn) return <KitEmpty part="Photo" need="src (a real photograph)" theme={t} w={w} h={h} r={radius} inline />;
  const r = rand(seed);
  const kinds: Vessel[] = vessels ?? (['vase', 'jar', 'bowl', 'bottle', 'cup'] as Vessel[]).filter((_, i) => rand(seed * 7 + i) > 0.45).slice(0, 3);
  const set = kinds.length ? kinds : (['vase'] as Vessel[]);
  const horizon = h * (0.6 + 0.08 * r);
  const sh = castShadow(1);
  const dir = Math.atan2(sh.dy, sh.dx); // shadows fall away from the key
  const items = set.map((kind, i) => {
    const P = PROFILE[kind];
    const n = set.length;
    const vh = h * (kind === 'bowl' ? 0.2 : kind === 'cup' ? 0.26 : 0.36 + 0.2 * rand(seed * 13 + i));
    const vw = vh / P.aspect;
    const cx = w * ((i + 0.5) / n) + (rand(seed * 17 + i) - 0.5) * w * 0.12;
    const base = horizon + h * (0.1 + 0.14 * rand(seed * 19 + i)) * (i % 2 ? 1 : 0.7);
    const body = t.photo.bodies[(i + Math.floor(r * 4)) % t.photo.bodies.length];
    return { kind, P, vh, vw, cx, base, body, i };
  });
  items.sort((a, b) => a.base - b.base); // back to front
  const path = (it: (typeof items)[number]) => {
    const N = 28;
    const right: string[] = [];
    const left: string[] = [];
    for (let j = 0; j <= N; j++) {
      const tt = j / N;
      const rr = smooth(it.P.pts, tt) * (it.vw / 2);
      const y = it.base - tt * it.vh;
      right.push(`${(it.cx + rr).toFixed(1)} ${y.toFixed(1)}`);
      left.unshift(`${(it.cx - rr).toFixed(1)} ${y.toFixed(1)}`);
    }
    return `M${right.join(' L')} L${left.join(' L')} Z`;
  };
  return (
    <div data-drawn="product" style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', transform: `scale(${k.toFixed(5)})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }}>
        <defs>
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.photo.backdrop[0]} />
            <stop offset="1" stopColor={t.photo.backdrop[1]} />
          </linearGradient>
          <linearGradient id={`${uid}key`} x1="0" y1="0" x2="1" y2="0.7">
            <stop offset="0" stopColor={lit(t, t.photo.backdrop[0], 0.25)} stopOpacity={0.55} />
            <stop offset="0.6" stopColor={t.photo.backdrop[0]} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${uid}fl`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.photo.backdrop[1]} />
            <stop offset="1" stopColor={t.photo.floor} />
          </linearGradient>
          <radialGradient id={`${uid}sh`}>
            <stop offset="0" stopColor={`rgb(${t.shade.join(', ')})`} stopOpacity={0.55} />
            <stop offset="1" stopColor={`rgb(${t.shade.join(', ')})`} stopOpacity={0} />
          </radialGradient>
          {items.map((it) => (
            <linearGradient key={it.i} id={`${uid}v${it.i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={mixColor(it.body, C.white, 0.22)} />
              <stop offset="0.2" stopColor={mixColor(it.body, C.white, 0.1)} />
              <stop offset="0.5" stopColor={it.body} />
              <stop offset="0.8" stopColor={mixColor(it.body, `rgb(${t.shade.join(', ')})`, 0.42)} />
              <stop offset="0.93" stopColor={mixColor(it.body, `rgb(${t.shade.join(', ')})`, 0.26)} />
              <stop offset="1" stopColor={mixColor(it.body, `rgb(${t.shade.join(', ')})`, 0.4)} />
            </linearGradient>
          ))}
        </defs>
        <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}bg)`} />
        <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}key)`} />
        <rect x={0} y={horizon} width={w} height={h - horizon} fill={`url(#${uid}fl)`} />
        {items.map((it) => {
          const len = it.vh * 0.85;
          return (
            <g key={it.i}>
              <ellipse
                cx={it.cx + Math.cos(dir) * len * 0.5}
                cy={it.base + Math.sin(dir) * len * 0.18}
                rx={len * 0.62}
                ry={it.vw * 0.2}
                fill={`url(#${uid}sh)`}
                opacity={0.7}
                transform={`rotate(${((dir * 180) / Math.PI) * 0.25} ${it.cx} ${it.base})`}
              />
              <ellipse cx={it.cx} cy={it.base} rx={it.vw * 0.5} ry={it.vw * 0.07} fill={`url(#${uid}sh)`} />
              <path d={path(it)} fill={`url(#${uid}v${it.i})`} />
              {it.P.open && <ellipse cx={it.cx} cy={it.base - it.vh} rx={smooth(it.P.pts, 1) * (it.vw / 2)} ry={smooth(it.P.pts, 1) * it.vw * 0.09} fill={mixColor(it.body, `rgb(${t.shade.join(', ')})`, 0.55)} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** The frame-progress of a reveal (0 before `at`, 1 after `at + dur`) on the house arrive curve. */
export const reveal = (frame: number, at: number, dur = 14) => prog(frame, at, at + dur, E.snapOut);
