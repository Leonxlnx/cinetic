// The screens' common ground: the skin (colours on the kit's Card material), the scale (UI points to film px), the focus
// boxes a camera frames, and the small parts every screen shares (a face, a mark, a picture, a spinner, a check, a caret).
//
// Scale. A screen is laid out in UI points at real web sizes (a 15 pt body, a 13 pt meta line, a 44 pt send button) and
// drawn at `pt` film px per point: SCREEN.pt (2) at 1080p, the size a product shot reads at in a wide frame. Everything is
// vector (DOM type, SVG glyphs) and pictures are fetched at 3x their drawn size, so a camera can push in 3-4x and still see
// crisp type: that is the macro move. Text smaller than the readable size at the scale it is seen at (`view`) is tagged
// data-texture, the rest data-text (the layout audit measures it).
//
// Focus. Every screen exports a layout function (`promptBarLayout(props, frame)` ...) that returns its size and its focus
// boxes: { x, y, w, h, px } in the screen's own px, `px` the type size inside (so a camera knows the scale at which that
// text reads: readScale). The component draws from the same function, so a box is always where the element is drawn, on
// any frame. Boxes that move with time (a caret while typing, the newest notification) are computed for that frame.
// Every element also carries data-focus="<name>" for audits. Place a screen's boxes in a scene with placeFocus().
//
// Skin. `tone`: 'light' (a white card), 'dark' (a card 8-12 L* over a dark ground, a rim of light) or 'glass' (frost: with a
// `backdrop`, the screen blurs its own copy of the picture behind (Frost); without one, a tint and a bright rim, never a
// live backdrop blur (a hard ban that re-blurs the frame on every render); inside a World, fx/light Glass frosts the
// world's own ground). Colours come from cardInks (kit/card.tsx) and the accent; no hex literal here.
// Pure functions of their props and the frame; transforms and opacity only.
import React, { useEffect, useState } from 'react';
import { Img, useCurrentFrame, useDelayRender } from 'remotion';
import { C, TEXT_MIN } from '../../brand/tokens';
import { clamp, rand } from '../../lib/anim';
import { contrastRatio, mixColor, oklch as fromLch, textOn, toOklch } from '../../lib/color';
import { fpsOf, uOf, useFilm } from '../../lib/film';
import { measureTracked } from '../../lib/measure';
import { Card, cardInks, type CardInks } from '../card';
import { ICON_GRID, ICONS, type IconName } from '../icons';
import { AppIcon, hasLogo, type LogoRef } from '../logos';
import { KIT_FONT } from '../parts';

export type ScreenTone = 'light' | 'dark' | 'glass';

/**
 * House numbers. pt: film px per UI point at 1080p. read: the smallest type a viewer reads, px at 1080p (the layout
 * audit's floor; TEXT_MIN for a line held in focus). type: the UI points of each role (a web UI's own sizes). radius:
 * corners in points. caret: blink half-period (s) and the time it stays solid after a key (s). macro: the camera scales a
 * close-up uses (references/product-ui.md §15).
 */
export const SCREEN = {
  pt: 2,
  read: 22,
  type: { micro: 11, meta: 13, body: 15, lead: 17, title: 19, head: 24, display: 32, figure: 42 },
  weight: { body: 450, strong: 560, title: 620, figure: 640 },
  radius: { small: 8, thumb: 12, row: 16, card: 22, panel: 28 },
  caret: { blink: 0.53, solid: 0.55 },
  macro: [3, 4] as const,
} as const;

// ------------------------------------------------------------------------------------------------ focus boxes

/** A focus box in a screen's px: what a camera frames. `px`: the type size inside (px at the screen's scale), if any. */
export type FocusBox = { x: number; y: number; w: number; h: number; px?: number; r?: number };
export type Focus = Record<string, FocusBox>;
/** A screen's layout: its size and its focus boxes (px), for one frame. */
export type ScreenLayout = { w: number; h: number; focus: Focus };

export const fbox = (x: number, y: number, w: number, h: number, px?: number, r?: number): FocusBox => ({ x, y, w, h, ...(px ? { px } : {}), ...(r ? { r } : {}) });
/** The smallest box holding all of `boxes` (px of the smallest type inside kept). */
export const unionBox = (...boxes: FocusBox[]): FocusBox => {
  const b = boxes.filter(Boolean);
  if (!b.length) return fbox(0, 0, 0, 0);
  const x = Math.min(...b.map((q) => q.x));
  const y = Math.min(...b.map((q) => q.y));
  const px = b.map((q) => q.px).filter((v): v is number => !!v);
  return fbox(x, y, Math.max(...b.map((q) => q.x + q.w)) - x, Math.max(...b.map((q) => q.y + q.h)) - y, px.length ? Math.min(...px) : undefined);
};
/** A screen's boxes placed in its parent: drawn at (x, y) and scaled by k about its top-left corner. */
export const placeFocus = (f: Focus, x: number, y: number, k = 1): Focus =>
  Object.fromEntries(Object.entries(f).map(([n, b]) => [n, { ...b, x: x + b.x * k, y: y + b.y * k, w: b.w * k, h: b.h * k, ...(b.px ? { px: b.px * k } : {}) }]));
/** The camera scale at which the type inside `b` reaches `min` px (TEXT_MIN: held in focus; SCREEN.read: legible). */
export const readScale = (b: FocusBox, min: number = TEXT_MIN) => (b.px ? min / b.px : 1);
/** The camera scale at which `b` fills `share` of a frame (the tighter of width and height). */
export const fillScale = (b: FocusBox, frameW: number, frameH: number, share = 0.62) => Math.min((frameW * share) / Math.max(1, b.w), (frameH * share) / Math.max(1, b.h));
/** The centre of a box. */
export const centreOf = (b: FocusBox) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** The attribute every focusable element carries. */
export const focusAttr = (name: string) => ({ 'data-focus': name });

// ------------------------------------------------------------------------------------------------ skin

/** A screen's colours: the Card inks for its tone on its ground, plus the quiet steps a dense UI needs. */
export type Skin = CardInks & {
  tone: ScreenTone;
  ground: string;
  groundL: number;
  /** third-level text: placeholders, counters at rest, a gutter */
  faint: string;
  /** an inset area: a track, an input well, a thumbnail before its picture */
  well: string;
  /** the accent as a fill that carries words (a send button, a busy button, a call to action): the film's accent itself,
   *  never the lighter lift a dark skin uses for accent words and marks */
  solid: string;
  /** text and glyphs on the accent (on `solid`) */
  accentInk: string;
  /** a quiet tint of the accent (a selected row, a highlight behind a comment) */
  accentSoft: string;
  /** the accent as words on the face (4.5:1) */
  accentText: string;
  /** the rim of light on a dark or glass face */
  rim: string;
  /** the face colour drawn (glass: the tint) */
  fill: string;
};

/**
 * The skin for `tone` on `ground` with `accent` (pure). A dark card on a bright or saturated ground (black notification
 * cards on an electric blue) is computed against a deep ground of the same hue, so it reads near-black, never mid-grey;
 * glass takes white words when white reads better on its ground than ink does (frost over a saturated blue).
 */
export const skinOf = (tone: ScreenTone = 'light', ground0: string = C.paper, accent: string = C.accent): Skin => {
  const [g0L, g0C, g0H] = toOklch(ground0);
  const ground = tone === 'dark' && g0L > 0.45 ? fromLch(0.17, Math.min(0.035, g0C), g0H) : ground0;
  const [gL] = toOklch(ground);
  const glass = tone === 'glass';
  const glassDark = gL < 0.5 || contrastRatio(C.white, ground) >= contrastRatio(C.ink, ground);
  const inks = cardInks(glass ? (glassDark ? 'dark' : 'light') : tone, glass && glassDark && gL >= 0.5 ? fromLch(0.3, Math.min(0.06, g0C), g0H) : ground, accent);
  const dark = inks.dark;
  if (glass && dark && g0L >= 0.45) inks.mute = mixColor(inks.text, ground0, 0.24);
  const [, aC, aH] = toOklch(accent);
  // frost over a bright saturated ground shows more white than frost over a dark one
  const fill = glass ? (dark ? `rgba(255, 255, 255, ${g0L >= 0.45 ? 0.16 : 0.07})` : 'rgba(255, 255, 255, 0.58)') : inks.face;
  // a light skin keeps the ink a touch warmer than black and the mute at 4.5:1 on the face
  const faint = mixColor(inks.mute, inks.face, dark ? 0.42 : 0.48);
  const well = dark ? mixColor(inks.face, C.white, 0.06) : mixColor(inks.face, inks.text, 0.045);
  const accentInk = toOklch(accent)[0] > 0.72 ? fromLch(0.2, Math.min(0.04, aC), aH) : C.white;
  const solid = accent;
  const accentSoft = dark ? mixColor(inks.face, accent, 0.2) : mixColor(C.white, accent, 0.14);
  return {
    ...inks,
    tone,
    ground,
    groundL: gL,
    faint,
    well,
    solid,
    accentInk,
    accentSoft,
    accentText: textOn(inks.accent, glass ? (dark ? C.ink2 : C.paper) : dark ? inks.face : C.white, 4.5),
    rim: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
    fill,
  };
};

// ------------------------------------------------------------------------------------------------ scale and frame

export type ScreenBase = {
  tone?: ScreenTone;
  /** the colour behind the screen (a family's ground, a token): its lightness picks the inks and the shadow */
  ground?: string;
  accent?: string;
  /** film px per UI point (default SCREEN.pt times the film's unit) */
  pt?: number;
  /** the frame since the part's start (default the composition's frame) */
  frame?: number;
  /** the camera scale it is seen at (for the readable / texture tag only) */
  view?: number;
  /** glass: the picture behind the screen, drawn at the screen's own place; the Card blurs its own copy */
  backdrop?: React.ReactNode;
  style?: React.CSSProperties;
};

/** The resolved context of a screen: frame, fps, scale, skin. */
export const useScreen = (p: ScreenBase) => {
  const film = useFilm();
  const cur = useCurrentFrame();
  const u = uOf(film);
  const pt = p.pt ?? SCREEN.pt * u;
  return { f: p.frame ?? cur, fps: fpsOf(film), u, pt, view: p.view ?? 1, skin: skinOf(p.tone, p.ground, p.accent) };
};

/** Frames from seconds at the film's rate. */
export const sec = (s: number, fps: number) => s * fps;

// ------------------------------------------------------------------------------------------------ type

/** CSS for screen text: the kit face, `size` UI points at `pt`, tabular figures. */
export const tx = (size: number, pt: number, weight: number, color: string, o: { track?: number; lead?: number; wrap?: boolean } = {}): React.CSSProperties => ({
  fontFamily: KIT_FONT,
  fontSize: size * pt,
  fontWeight: weight,
  letterSpacing: `${o.track ?? (size >= 24 ? -0.022 : size >= 17 ? -0.012 : -0.004)}em`,
  lineHeight: o.lead ?? (size >= 24 ? 1.12 : 1.32),
  color,
  whiteSpace: o.wrap ? 'normal' : 'pre',
  fontVariantNumeric: 'tabular-nums lining-nums',
  fontKerning: 'normal',
  fontFeatureSettings: '"ss01" 0',
});

/**
 * Holds the frame (delayRender) until a face is loaded: a part that sets a face of its own (a thumbnail's title card)
 * calls it, so no frame is captured with a fallback face. `shorthand`: a CSS font shorthand ('900 16px "Mona Sans
 * Variable"'). A face the film has not registered resolves at once (its fallback stack is what the film has).
 */
export const useFace = (shorthand: string) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => (typeof document === 'undefined' || document.fonts.check(shorthand) ? null : delayRender(`face ${shorthand}`)));
  useEffect(() => {
    if (handle === null) return;
    document.fonts
      .load(shorthand)
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle, shorthand, continueRender, cancelRender]);
};

/** The audit tag for a string at `px` seen at `view`: readable text (data-text) or texture (data-texture). */
export const textTag = (id: string, px: number, view = 1): Record<string, string> => (px * view >= SCREEN.read ? { 'data-text': id } : { 'data-texture': '' });

/** Width of a string in the kit face (measured with the loaded font; 0.55 em a letter on the server, for tests only). */
export const textW = (s: string, px: number, weight: number, track = -0.004) =>
  typeof document === 'undefined' ? s.length * px * 0.55 : measureTracked(s, px, weight, track, KIT_FONT, { trailing: false });

/** Lines of `text` wrapped at `maxW` px in the kit face (greedy, on spaces). */
export const wrapText = (text: string, px: number, weight: number, maxW: number, track = -0.004): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textW(next, px, weight, track) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
};

// ------------------------------------------------------------------------------------------------ numbers

/** 214000 -> '214K', 1250000 -> '1.3M', 940 -> '940'. */
export const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (a >= 1e4) return `${Math.round(n / 1e3)}K`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
};
/** 1234.5 -> '$1,234.50'; whole amounts drop the cents ('$37'). */
export const fmtMoney = (v: number, cur = '$', cents?: boolean) => {
  const c = cents ?? !Number.isInteger(v);
  return `${cur}${v.toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 })}`;
};

// ------------------------------------------------------------------------------------------------ surfaces

/**
 * A screen's surface: the kit's Card for light and dark (the material: an opaque face, a quiet sheen, a hairline, the top
 * highlight, two shadows); glass with a backdrop is Frost (the backdrop blurred inside the shape); glass without one is a
 * white tint, a bright rim and a soft drop, which is all a gradient or a soft plate behind needs (a sharp photograph
 * behind takes its soft copy as `backdrop`). No live backdrop blur. Positioned at (x, y), w x h, corners r.
 */
export const Panel: React.FC<{ skin: Skin; w: number; h: number; r: number; x?: number; y?: number; lift?: number; u?: number; backdrop?: React.ReactNode; focus?: string; children?: React.ReactNode; style?: React.CSSProperties; flat?: boolean }> = ({ skin, w, h, r, x = 0, y = 0, lift = 0, u = 1, backdrop, focus, children, style, flat }) => {
  if (skin.tone === 'glass' && backdrop) return <Frost skin={skin} w={w} h={h} r={r} x={x} y={y} u={u} backdrop={backdrop} focus={focus} style={style} flat={flat}>{children}</Frost>;
  if (skin.tone !== 'glass') {
    return (
      <Card tone={skin.tone} w={w} h={h} x={x} y={y} r={r} ground={skin.ground} accent={skin.accent} lift={lift} backdrop={backdrop} u={u} style={{ ...(flat ? { boxShadow: 'none' } : null), ...style }} {...(focus ? { id: focus } : {})}>
        {children}
      </Card>
    );
  }
  const dark = skin.dark;
  return (
    <div
      data-ui
      data-card="glass"
      {...(focus ? focusAttr(focus) : {})}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: r,
        transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`,
        background: `linear-gradient(180deg, ${dark ? `rgba(255, 255, 255, ${skin.groundL >= 0.45 ? 0.26 : 0.1})` : 'rgba(255, 255, 255, 0.72)'} 0%, ${skin.fill} 100%)`,
        boxShadow: [
          `inset 0 0 0 ${(1.4 * u).toFixed(2)}px ${dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.85)'}`,
          `inset 0 ${(1.5 * u).toFixed(2)}px 0 ${dark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.95)'}`,
          ...(flat ? [] : [`0 ${(18 * u).toFixed(1)}px ${(48 * u).toFixed(1)}px ${(-12 * u).toFixed(1)}px rgba(0, 0, 0, ${dark ? 0.45 : 0.14})`, `0 ${(2 * u).toFixed(1)}px ${(6 * u).toFixed(1)}px rgba(0, 0, 0, ${dark ? 0.3 : 0.06})`]),
        ].join(', '),
        overflow: 'hidden',
        isolation: 'isolate',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Frost over a photographic plate (glass with a `backdrop`: the plate at the screen's own place, the plate's soft copy
 * when the film has one): the plate blurred inside the shape, a thin veil (clear white over a mid or dark plate, milky
 * over a bright one), a top sheen, a bright rim and a soft drop. Lighter than the Card's glass, so the plate reads
 * through it as it does through a real frosted pill; the words take the skin's inks (white over a mid or dark plate).
 */
export const Frost: React.FC<{ skin: Skin; w: number; h: number; r: number; x?: number; y?: number; u?: number; backdrop: React.ReactNode; focus?: string; children?: React.ReactNode; style?: React.CSSProperties; flat?: boolean }> = ({ skin, w, h, r, x = 0, y = 0, u = 1, backdrop, focus, children, style, flat }) => {
  const dark = skin.dark;
  return (
    <div data-ui data-card="glass" {...(focus ? focusAttr(focus) : {})} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: r, overflow: 'hidden', isolation: 'isolate', transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`, boxShadow: flat ? 'none' : `0 ${(16 * u).toFixed(1)}px ${(44 * u).toFixed(1)}px ${(-14 * u).toFixed(1)}px rgba(0, 0, 0, ${dark ? 0.42 : 0.2}), 0 ${(2 * u).toFixed(1)}px ${(6 * u).toFixed(1)}px rgba(0, 0, 0, 0.16)`, ...style }}>
      <div style={{ position: 'absolute', left: -x, top: -y, filter: `blur(${(18 * u).toFixed(1)}px) saturate(1.25)`, transform: 'scale(1.05)', transformOrigin: `${x + w / 2}px ${y + h / 2}px` }}>{backdrop}</div>
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 55%, rgba(255, 255, 255, 0.05) 100%)' : 'linear-gradient(180deg, rgba(255, 255, 255, 0.62) 0%, rgba(255, 255, 255, 0.44) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, boxShadow: `inset 0 0 0 ${(1.2 * u).toFixed(2)}px rgba(255, 255, 255, ${dark ? 0.26 : 0.7}), inset 0 ${(1.5 * u).toFixed(2)}px 0 rgba(255, 255, 255, ${dark ? 0.3 : 0.9})`, pointerEvents: 'none' }} />
    </div>
  );
};

/** The two-layer shadow of a small raised thing (a button, a chip, a badge) on a skin, at scale u. */
export const smallShadow = (skin: Skin, u: number, lift = 1) =>
  skin.dark
    ? `0 ${(2 * lift * u).toFixed(1)}px ${(6 * lift * u).toFixed(1)}px rgba(0, 0, 0, 0.45), inset 0 ${(1 * u).toFixed(2)}px 0 rgba(255, 255, 255, 0.14)`
    : `0 ${(1 * lift * u).toFixed(1)}px ${(2 * lift * u).toFixed(1)}px rgba(0, 0, 0, 0.08), 0 ${(6 * lift * u).toFixed(1)}px ${(16 * lift * u).toFixed(1)}px ${(-4 * u).toFixed(1)}px rgba(0, 0, 0, 0.12), inset 0 ${(1 * u).toFixed(2)}px 0 rgba(255, 255, 255, 0.9)`;


// ------------------------------------------------------------------------------------------------ glyphs and marks

/** A glyph (Phosphor, kit/icons.ts) at `size` px. */
export const Icon: React.FC<{ name: IconName; size: number; color: string; weight?: 'regular' | 'bold' | 'fill'; style?: React.CSSProperties }> = ({ name, size, color, weight = 'regular', style }) => {
  const p = ICONS[name];
  return (
    <svg data-icon={name} width={size} height={size} viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`} style={{ display: 'block', flex: 'none', ...style }}>
      <path d={weight === 'fill' ? p.fill : weight === 'bold' ? p.bold : p.regular} fill={color} />
    </svg>
  );
};

/**
 * A product's mark: its real logo on an app tile when the film fetched it (scripts/logos.mjs), else a picture (`src`), else
 * a glyph on an accent tile. `size` px, corners of an app icon.
 */
export const Mark: React.FC<{ skin: Skin; size: number; logo?: LogoRef; src?: string; glyph?: IconName; solid?: boolean }> = ({ skin, size, logo, src, glyph = 'sparkle', solid = true }) => {
  if (logo && hasLogo(logo)) return <AppIcon logo={logo} size={size} tone={skin.dark ? 'dark' : 'light'} lift={10} />;
  if (src) return <Picture src={src} w={size} h={size} r={size * 0.24} />;
  return (
    <div data-icon={glyph} style={{ width: size, height: size, borderRadius: size * 0.24, flex: 'none', background: solid ? `linear-gradient(180deg, ${mixColor(skin.accent, C.white, 0.16)} 0%, ${skin.accent} 100%)` : skin.accentSoft, boxShadow: `inset 0 ${(size * 0.02).toFixed(2)}px 0 rgba(255, 255, 255, 0.35), 0 ${(size * 0.04).toFixed(2)}px ${(size * 0.1).toFixed(2)}px rgba(0, 0, 0, 0.18)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={glyph} size={size * 0.52} color={solid ? skin.accentInk : skin.accentText} weight="fill" />
    </div>
  );
};

/** A real picture filling w x h (object-fit cover on its `focus`, 0..1), corners r; tagged data-imagery. */
export const Picture: React.FC<{ src: string; w: number; h: number; r?: number; focus?: [number, number]; style?: React.CSSProperties; children?: React.ReactNode }> = ({ src, w, h, r = 0, focus, style, children }) => (
  <div data-imagery style={{ position: 'relative', width: w, height: h, borderRadius: r, overflow: 'hidden', flex: 'none', isolation: 'isolate', ...style }}>
    <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: focus ? `${(focus[0] * 100).toFixed(1)}% ${(focus[1] * 100).toFixed(1)}%` : '50% 50%' }} />
    {children}
  </div>
);

/** A hue for a person without a photo (a product's own coloured initial disc, never grey), from their name. */
export const personHue = (name: string) => Math.floor(rand(`hue:${name}`) * 360);

/**
 * A person: their photo in a circle with a hairline ring (the way a product shows a user), or, with no photo, the product's
 * own initial on a coloured disc (a hue from the name, at the skin's lightness), never a grey silhouette.
 */
export const Face: React.FC<{ skin: Skin; size: number; name: string; src?: string; ring?: string; style?: React.CSSProperties }> = ({ skin, size, name, src, ring, style }) => {
  const rim = ring ? `0 0 0 ${(size * 0.045).toFixed(2)}px ${ring}` : '';
  const inner = `inset 0 0 0 ${Math.max(1, size * 0.012).toFixed(2)}px ${skin.dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)'}`;
  if (src)
    return (
      <div data-imagery style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: 'none', boxShadow: rim, ...style }}>
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: inner }} />
      </div>
    );
  const h = personHue(name);
  const L = skin.dark ? 0.62 : 0.66;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flex: 'none', background: `linear-gradient(160deg, ${fromLch(L + 0.06, 0.11, h)} 0%, ${fromLch(L - 0.06, 0.13, h)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: [rim, inner].filter(Boolean).join(', '), ...style }}>
      <span style={{ ...tx(1, size * 0.44, 520, C.white, { track: 0 }), lineHeight: 1, transform: `translateY(${(-size * 0.02).toFixed(2)}px)` }}>{(name.replace(/^@/, '')[0] ?? '').toLowerCase()}</span>
    </div>
  );
};

/** A spinner: a 280 degree arc turning once every 0.85 s, `size` px, stroke a tenth of it. */
export const Spinner: React.FC<{ f: number; fps: number; size: number; color: string; track?: string }> = ({ f, fps, size, color, track }) => {
  const a = ((f / (0.85 * fps)) * 360) % 360;
  const s = size * 0.11;
  const r = (size - s) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg data-icon="spinner" width={size} height={size} style={{ display: 'block', flex: 'none', transform: `rotate(${a.toFixed(1)}deg)` }}>
      {track && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={s} />}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={s} strokeLinecap="round" strokeDasharray={`${(c * 0.72).toFixed(2)} ${(c * 0.28).toFixed(2)}`} />
    </svg>
  );
};

/**
 * A step's mark: pending (a faint ring), active (a spinner) or done (a filled disc with its tick drawn on over 9 f@60).
 * `p` 0..1 is the tick's draw.
 */
export const StepMark: React.FC<{ skin: Skin; f: number; fps: number; size: number; state: 'pending' | 'active' | 'done'; p?: number; color?: string }> = ({ skin, f, fps, size, state, p = 1, color }) => {
  const col = color ?? skin.accent;
  if (state === 'active') return <Spinner f={f} fps={fps} size={size} color={col} track={skin.dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'} />;
  if (state === 'pending')
    return (
      <svg data-icon="pending" width={size} height={size} style={{ display: 'block', flex: 'none' }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - size * 0.06} fill="none" stroke={skin.faint} strokeWidth={size * 0.09} />
      </svg>
    );
  const len = size * 0.62;
  return (
    <svg data-icon="check" width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flex: 'none', transform: `scale(${(0.86 + 0.14 * clamp(p * 1.6)).toFixed(3)})` }}>
      <circle cx="12" cy="12" r="11.2" fill={col} />
      <path d="M7.2 12.4l3.2 3.2 6.4-6.8" fill="none" stroke={color ? C.white : skin.accentInk} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={(1 - clamp(p)) * len} pathLength={len} />
    </svg>
  );
};

/** A text caret: `h` tall, solid while typing (`since` frames since the last key under SCREEN.caret.solid s), else blinking. */
export const caretOn = (since: number, fps: number) => (since < SCREEN.caret.solid * fps ? 1 : Math.floor((since - SCREEN.caret.solid * fps) / (SCREEN.caret.blink * fps)) % 2 === 0 ? 0 : 1);
export const Caret: React.FC<{ h: number; w: number; color: string; on: number; style?: React.CSSProperties }> = ({ h, w, color, on, style }) => (
  <span data-focus="caret" style={{ display: 'inline-block', width: w, height: h, borderRadius: w / 2, background: color, opacity: on, verticalAlign: 'middle', flex: 'none', ...style }} />
);

/** A light sweep across a box: the x (px) of a soft band crossing `w` once every `period` s (a busy button, a scan). */
export const sweepX = (f: number, fps: number, w: number, period = 1.4) => {
  const k = ((f / (period * fps)) % 1 + 1) % 1;
  return -0.4 * w + k * 1.8 * w;
};
