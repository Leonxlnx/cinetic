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
import { mixColor, toOklch } from '../lib/color';
import { uOf, useFilm } from '../lib/film';
import { ICON_GRID, ICONS, type IconPaths } from './icons';
import type { GlyphName } from './sample';
import { type KitTheme, lit, shadeRgba } from './theme';

/** Kit type sizes, px at 1080p: label is the ui role (the smallest size held in focus). */
export const KIT_TYPE = { label: TYPE.ui.size, body: 48, title: 64, head: 84, figure: 160, hero: 230 } as const;

/** The kit's scale: the film's layout unit (1 at 1080p), or an explicit one. */
export const useKitScale = (scale?: number) => {
  const film = useFilm();
  return scale ?? uOf(film);
};

/** CSS for kit text: the film's one sans, tabular figures, no wrapping. */
export const face = (px: number, weight: number, color: string, track = -0.015, lead = 1.15): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: px,
  fontWeight: weight,
  letterSpacing: `${track}em`,
  lineHeight: lead,
  color,
  whiteSpace: 'pre',
  fontVariantNumeric: 'tabular-nums',
});

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
 * The shadows of a surface `lift` px above its ground under the key: a tight contact shadow and a cast
 * shadow thrown away from the light, plus a hairline on the lit edge. One box-shadow value.
 */
export const surfaceShadow = (t: KitTheme, lift: number, u = 1) => {
  const c = castShadow(lift * u);
  const contact = `0 ${(2 * u).toFixed(2)}px ${(KIT_KEY.contact.blur * u).toFixed(2)}px ${shadeRgba(t, KIT_KEY.contact.alpha * (t.shadeA / 0.32))}`;
  const cast = `${c.dx.toFixed(2)}px ${c.dy.toFixed(2)}px ${c.blur.toFixed(2)}px ${shadeRgba(t, c.alpha * (t.shadeA / 0.24))}`;
  const edge = `inset ${(1.5 * u).toFixed(2)}px ${(1.5 * u).toFixed(2)}px 0 rgba(255, 255, 255, ${t.dark ? 0.08 : 0.5})`;
  return `${edge}, ${contact}, ${cast}`;
};

/** A face lit by the key: the fill lifted on the light's side, its own colour mid-way, a touch of shade on the far side. */
export const keyFace = (t: KitTheme, fill: string, amount = 0.08) => `linear-gradient(${keyAngle()}deg, ${lit(t, fill, amount)} 0%, ${fill} 55%, ${mixColor(fill, `rgb(${t.shade.join(', ')})`, amount * 0.6)} 100%)`;

export type SurfaceProps = {
  theme: KitTheme;
  w: number;
  h: number;
  x?: number;
  y?: number;
  r?: number; // corner radius (default 12 % of the short side, house RADIUS)
  lift?: number; // px above the ground (default 28): the cast shadow's length and softness
  tone?: 'surface' | 'raised' | 'well' | 'accent' | 'ground';
  fill?: string; // overrides the tone
  scale?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/** A card or panel face on the ground, lit by the key, content clipped to it. */
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
        borderRadius: r ?? Math.min(w, h) * 0.12,
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

/** A team member as a disc of one of the theme's tones with their initials (one hue, never a rainbow). */
export const Avatar: React.FC<{ theme: KitTheme; i: number; initials: string; size: number; ring?: string; x?: number; y?: number }> = ({ theme: t, i, initials, size, ring, x, y }) => {
  const tone = t.tones[((i % t.tones.length) + t.tones.length) % t.tones.length];
  const ink = toOklch(tone)[0] > 0.6 ? t.dark ? t.accentInk : t.text : t.dark ? t.text : t.accentInk;
  return (
    <div
      style={{
        position: x === undefined ? 'relative' : 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(${keyAngle()}deg, ${lit(t, tone, 0.12)}, ${tone})`,
        boxShadow: ring ? `0 0 0 ${(size * 0.06).toFixed(2)}px ${ring}` : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {size * 0.38 >= TEXT_MIN ? (
        <span data-text={`kit-avatar-${initials}`} style={face(size * 0.38, 600, ink, 0)}>
          {initials}
        </span>
      ) : (
        // initials would fall under TEXT_MIN: a small avatar is a person, drawn, never mush
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" style={{ display: 'block' }}>
          <circle cx={12} cy={8.2} r={4.4} fill={ink} opacity={0.78} />
          <path d="M3.6 21.5c.9-4.6 4.3-7.2 8.4-7.2s7.5 2.6 8.4 7.2z" fill={ink} opacity={0.78} />
        </svg>
      )}
    </div>
  );
};

/** Overlapping avatars (the people on a project). */
export const AvatarStack: React.FC<{ theme: KitTheme; people: { initials: string }[]; size: number; ring: string; n?: number }> = ({ theme, people, size, ring, n = people.length }) => (
  <div style={{ display: 'flex' }}>
    {people.slice(0, n).map((p, k) => (
      <div key={k} style={{ marginLeft: k ? -size * 0.24 : 0 }}>
        <Avatar theme={theme} i={k} initials={p.initials} size={size} ring={ring} />
      </div>
    ))}
  </div>
);

/** A round tick: done. */
export const Check: React.FC<{ size: number; fill: string; tick: string; ring?: string }> = ({ size, fill, tick, ring }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <circle cx={12} cy={12} r={ring ? 10.6 : 11.5} fill={fill} stroke={ring} strokeWidth={ring ? 1.6 : 0} />
    <path d="M7 12.5l3.2 3.2L17 9" stroke={tick} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** A ring with a dot: waiting. */
export const Pending: React.FC<{ size: number; stroke: string; fill: string }> = ({ size, stroke, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <circle cx={12} cy={12} r={10.2} fill={fill} stroke={stroke} strokeWidth={1.6} />
    <circle cx={12} cy={12} r={3} fill={stroke} />
  </svg>
);

/** How a glyph is drawn: a line (regular, or bold from weight 2.3), filled, or duotone (a quiet tone under the line). */
export type GlyphStyle = 'line' | 'fill' | 'duotone';

/**
 * A generic glyph (kit/icons.ts, Phosphor): `weight` keeps the old stroke scale (2 = the regular line, 2.3 and up the
 * bold one); `variant` fills it or lays the duotone's tone (`tone`, default the line colour at 20 %) under the line.
 * For a product, source or model the film names, use its real mark (kit/logos.tsx) instead.
 */
export const Glyph: React.FC<{ name: GlyphName; size: number; color: string; weight?: number; variant?: GlyphStyle; tone?: string }> = ({ name, size, color, weight = 2, variant = 'line', tone }) => {
  const p: IconPaths = ICONS[name];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`} style={{ display: 'block' }}>
      {variant === 'fill' && <path d={p.fill} fill={color} />}
      {variant === 'duotone' && <path d={p.tone} fill={tone ?? color} opacity={tone ? 1 : 0.2} />}
      {variant !== 'fill' && <path d={variant === 'duotone' ? p.duo ?? p.regular : weight >= 2.3 ? p.bold : p.regular} fill={color} />}
    </svg>
  );
};

/** A glyph on a soft accent tile (a category, a generic action): duotone on the soft tile, filled on the solid one. */
export const GlyphTile: React.FC<{ theme: KitTheme; name: GlyphName; size: number; solid?: boolean; variant?: GlyphStyle }> = ({ theme: t, name, size, solid, variant }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: solid ? t.accent : t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
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

/** A notice landing on the product: a glyph, what happened, when. */
export const Toast: React.FC<{ theme: KitTheme; title: string; sub?: string; w: number; h: number; glyph?: GlyphName; id?: string }> = ({ theme: t, title, sub, w, h, glyph = 'check', id = 'kit-toast' }) => {
  const u = useKitScale();
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: h / 2, background: t.dark ? t.raised : t.text, boxShadow: surfaceShadow(t, 40, u), display: 'flex', alignItems: 'center', gap: h * 0.2, padding: `0 ${h * 0.36}px 0 ${h * 0.2}px`, boxSizing: 'border-box' }}>
      <div style={{ width: h * 0.62, height: h * 0.62, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Glyph name={glyph} size={h * 0.36} color={t.accentInk} weight={2.8} />
      </div>
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
 * A product photograph made in code: matte vessels on a seamless backdrop under the house key, with
 * contact and cast shadows (or a supplied picture: `src`). Seeded, so a thumbnail grid shows a varied
 * set. The colours come from the theme's still-life palette, one hue: the imagery carries colour mass
 * without adding a second accent. `push` (0..1) is a slow move in on the set.
 */
export const Photo: React.FC<{ theme: KitTheme; w: number; h: number; seed?: number; vessels?: Vessel[]; src?: string; radius?: number; push?: number; focus?: { x: number; y: number } }> = ({
  theme: t,
  w,
  h,
  seed = 1,
  vessels,
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
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus.x * 100}% ${focus.y * 100}%`, transform: `scale(${k.toFixed(5)})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }} />
      </div>
    );
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
    <div style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden' }}>
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

/** A slow, closed-form drift for a living hold inside a part (px), so a held panel is never frozen. */
export const drift = (frame: number, fps: number, pxPerSec = 14, seed = 0) => ({ x: (pxPerSec * frame) / fps, y: 0.35 * pxPerSec * Math.sin(frame / (fps * 2.2) + seed) });

/** The frame-progress of a reveal (0 before `at`, 1 after `at + dur`) on the house arrive curve. */
export const reveal = (frame: number, at: number, dur = 14) => prog(frame, at, at + dur, E.snapOut);
