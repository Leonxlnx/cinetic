// Real marks in the film: the products a product works with, imports from, runs on or names (its integrations,
// sources, models and platforms), shown as their owners publish them: their own colours and proportions, never
// redrawn, recoloured or squeezed. scripts/logos.mjs fetches them from open collections into public/logos/ (with a
// record of source, licence and trademark owner in public/logos/logos.json) and writes the index src/logos.ts that
// these parts read. Every part is a pure function of its props and `frame`:
//   BrandLogo   a mark or wordmark as crisp SVG at any size, in the version made for its ground
//   AppIcon     an app-icon tile: a squircle with a top light, an inner rim and a soft contact shadow under the
//               house key, the mark centred at its optical size (a brand whose mark is its own tile fills it)
//   LogoChip    a mark and its name on a pill (a source, an integration)
//   InlineLogo  a mark at 1.0 cap height inside a line of type, swapping to the next mark over 6 f
//   LogoTile    one mark in the film's treatment: a neutral tile in the card material (official colours), the mark in
//               the film's ink (its one-colour file), or bare; LogoRow lays out a row in ONE treatment at one size
//               and logoRowCheck() flags a row whose treatments, sizes or colours clash
//   LogoWall, LogoRing  12-30 tiles that arrive tumbling in 3D (20-60 deg) and land flat on their depth, softer
//               further back; still unless a designed drift or orbit is given
// A name with no file falls back to the text pill (kit Chip) or a generic glyph tile, so a film without fetched marks
// still reads. Marks only for what the product really touches; never an endorsement, never a partnership it lacks.
import React, { useId } from 'react';
import { Img, staticFile } from 'remotion';
import { C, TEXT_MIN, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { clamp, E, mix, prog, rand } from '../lib/anim';
import { oklch as fromLch } from '../lib/color';
import { f60x, fpsOf, useFilm } from '../lib/film';
import { inkBox } from '../lib/measure';
import { LOGOS } from '../logos';
import { Chip } from './flow';
import { castShadow, face, Glyph, surfaceShadow, useKitScale } from './parts';
import { cardInks, cardShadow } from './card';
import type { GlyphName } from './sample';
import { type KitTheme, kitTheme, shadeRgba } from './theme';
import { kitEmpty } from './gate';

/** The files logos.mjs writes for a mark: the light-ground default, the dark-ground version, the wordmark and one-colour files. */
export type LogoVariant = 'mark' | 'markDark' | 'wordmark' | 'wordmarkDark' | 'mono' | 'white' | 'black';
export type LogoFile = { src: string; aspect: number };
/** One mark of the index (src/logos.ts): its name, whether it paints dark neutrals or only light ones, whether it is its own tile. */
export type LogoEntry = { name: string; tone: 'colour' | 'dark' | 'light'; tile: 'own' | 'none'; files: Partial<Record<LogoVariant, LogoFile>> };
/** A mark by its slug in src/logos.ts, or an entry given directly. */
export type LogoRef = string | LogoEntry;
export type Ground = 'light' | 'dark';

/** The entry for a slug (or the entry itself); null when the film has not fetched it. */
export const logoOf = (ref: LogoRef | undefined | null): LogoEntry | null => (!ref ? null : typeof ref === 'string' ? (LOGOS as Record<string, LogoEntry>)[ref] ?? null : ref);
/** Has the film fetched this mark? */
export const hasLogo = (ref: LogoRef | undefined | null) => !!logoOf(ref)?.files.mark || !!logoOf(ref)?.files.wordmark;
/** The name to show beside a mark: the entry's, else the slug as given. */
export const logoName = (ref: LogoRef) => logoOf(ref)?.name ?? (typeof ref === 'string' ? ref : ref.name);

/**
 * The file for a ground: on dark, the dark-ground version (a mark that paints dark neutrals is never set dark on dark:
 * its white one-colour file stands in when there is no dark version); `mono` takes the one-colour file for the ground.
 */
export const logoFile = (e: LogoEntry, kind: 'mark' | 'wordmark' = 'mark', ground: Ground = 'light', mono = false): LogoFile | null => {
  const f = e.files;
  if (mono) return (ground === 'dark' ? f.white : f.black ?? f.mono) ?? null;
  if (kind === 'wordmark') return (ground === 'dark' ? f.wordmarkDark ?? (e.tone === 'dark' ? undefined : f.wordmark) : f.wordmark) ?? null;
  return (ground === 'dark' ? f.markDark ?? (e.tone === 'dark' ? f.white : f.mark) : f.mark ?? f.mono) ?? null;
};

/**
 * The optical size of a mark inside a square box: the same area as a square mark of side `box` (a wide mark gets
 * wider and lower, a tall one taller and narrower), held inside maxW x maxH of the box.
 */
export const opticalSize = (aspect: number, box: number, maxW = 1.3, maxH = 1.12) => {
  let w = box * Math.sqrt(aspect);
  let h = box / Math.sqrt(aspect);
  if (w > box * maxW) { w = box * maxW; h = w / aspect; }
  if (h > box * maxH) { h = box * maxH; w = h * aspect; }
  return { w, h };
};

/** A mark or wordmark as SVG (crisp at any size): by height `h`, width `w`, or its optical size in a square `box`. */
export const BrandLogo: React.FC<{ logo: LogoRef; h?: number; w?: number; box?: number; kind?: 'mark' | 'wordmark'; ground?: Ground; mono?: boolean; style?: React.CSSProperties }> = ({
  logo, h, w, box, kind = 'mark', ground = 'light', mono = false, style,
}) => {
  const e = logoOf(logo);
  const f = e && (logoFile(e, kind, ground, mono) ?? (kind === 'wordmark' ? logoFile(e, 'mark', ground, mono) : null));
  if (!e || !f) return null;
  const s = box ? opticalSize(f.aspect, box) : h ? { w: h * f.aspect, h } : w ? { w, h: w / f.aspect } : { w: 64 * U * f.aspect, h: 64 * U };
  return <Img src={staticFile(f.src)} data-logo={e.name} style={{ display: 'block', width: s.w, height: s.h, flex: 'none', ...style }} />;
};

// ------------------------------------------------------------------------------------------------ the app-icon tile
const squircles = new Map<string, string>();
/** A superellipse (|x|^n + |y|^n = 1, n 5: the continuous corner of an app icon) of side s, inset by `i`, as a path. */
export const squirclePath = (s: number, i = 0, n = 5) => {
  const key = `${s.toFixed(2)}|${i.toFixed(2)}|${n}`;
  const hit = squircles.get(key);
  if (hit) return hit;
  const r = s / 2 - i;
  const pts: string[] = [];
  for (let k = 0; k < 96; k++) {
    const a = (k / 96) * Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    pts.push(`${(s / 2 + r * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(2)} ${(s / 2 + r * Math.sign(sn) * Math.abs(sn) ** (2 / n)).toFixed(2)}`);
  }
  const d = `M${pts.join('L')}Z`;
  squircles.set(key, d);
  return d;
};

let paperTheme: KitTheme | null = null;
/** The kit's paper theme, for a part given none (made once). */
const paper = () => (paperTheme ??= kitTheme('tintedPaper'));

/** The tile's two faces: a white one (the default, on any ground) and a deep one; neutrals at the theme's hue. */
const tileFace = (tone: Ground, hue: number) => (tone === 'dark'
  ? { top: fromLch(0.31, 0.006, hue), bottom: fromLch(0.2, 0.006, hue), sheen: 0.1, rimTop: 0.2, rimBottom: 0.05, hair: 0 }
  : { top: fromLch(1, 0, hue), bottom: fromLch(0.955, 0.004, hue), sheen: 0.5, rimTop: 0.95, rimBottom: 0, hair: 0.09 });

export type AppIconProps = {
  logo?: LogoRef;
  size: number;
  /** the tile: white (default) or deep */
  tone?: Ground;
  theme?: KitTheme;
  /** px above the ground (the cast shadow's length): 18 resting, more while it is lifted */
  lift?: number;
  /** the share of the tile the mark's optical size takes (0.54: a square mark 54 % of the side) */
  fill?: number;
  /** a generic glyph when there is no mark (an action, not a product) */
  glyph?: GlyphName;
  scale?: number;
  style?: React.CSSProperties;
};

/**
 * An app-icon tile: a squircle face with a top light, an inner rim (a light edge at the top, a hairline round a
 * white tile so it holds on paper), a soft contact shadow and a cast shadow away from the key; the mark centred at
 * its optical size, or filling the face when the brand's mark is its own tile (drawn 10 % over the face, so its own
 * corners fall outside the squircle). Without a fetched mark: the `glyph` the film picks, duotone; with neither, the
 * bare tile, and a named mark that was not fetched reports kit-empty (node scripts/logos.mjs fetches it): the kit never
 * stands a grid glyph in for a brand.
 */
export const AppIcon: React.FC<AppIconProps> = ({ logo, size: s, tone = 'light', theme, lift = 18, fill = 0.54, glyph, scale, style }) => {
  const u = useKitScale(scale);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const e = logoOf(logo);
  const th = theme ?? paper();
  const F = tileFace(tone, th.hue);
  const shade = (a: number) => shadeRgba(th, a);
  const c = castShadow(lift * u);
  const shadow = [
    `0 ${(0.008 * s).toFixed(2)}px ${(0.02 * s).toFixed(2)}px ${shade(0.14)}`, // contact: tight and faint
    `${(c.dx * 0.6).toFixed(2)}px ${(c.dy * 0.6 + 0.02 * s).toFixed(2)}px ${(c.blur * 1.6 + 0.08 * s).toFixed(2)}px ${shade(c.alpha * 0.55)}`, // cast, away from the key, soft
    `0 ${(0.1 * s).toFixed(2)}px ${(0.26 * s).toFixed(2)}px ${shade(0.07)}`, // ambient
  ].join(', ');
  const own = !!e && e.tile === 'own' && !!e.files.mark;
  const f = e ? logoFile(e, 'mark', tone) : null;
  const m = f ? opticalSize(f.aspect, s * fill) : null;
  const clip = `path('${squirclePath(s)}')`;
  const unfetched = !!logo && !f && !glyph;
  if (unfetched) kitEmpty('AppIcon', `the real mark of ${typeof logo === 'string' ? logo : logo.name} (node scripts/logos.mjs) or a glyph`);
  return (
    <div data-ui data-icon={e?.name ?? glyph ?? 'app'} {...(unfetched ? { 'data-kit-empty': 'AppIcon', 'data-kit-need': 'logo' } : {})} style={{ position: 'relative', width: s, height: s, flex: 'none', ...style }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: s * 0.235, boxShadow: shadow }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: clip, background: `linear-gradient(180deg, ${F.top} 0%, ${F.bottom} 100%)` }}>
        {own && f && <Img src={staticFile(e.files.mark!.src)} data-logo={e.name} style={{ position: 'absolute', left: 0, top: 0, width: 1.1 * s, height: 1.1 * s, display: 'block', transform: `translate(${(-0.05 * s).toFixed(2)}px, ${(-0.05 * s).toFixed(2)}px)` }} />}
        {!own && f && m && (
          <Img src={staticFile(f.src)} data-logo={e!.name} style={{ position: 'absolute', left: 0, top: 0, width: m.w, height: m.h, display: 'block', transform: `translate(${((s - m.w) / 2).toFixed(2)}px, ${((s - m.h) / 2).toFixed(2)}px)` }} />
        )}
        {!f && glyph && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name={glyph} size={s * 0.5} color={tone === 'dark' ? kitTheme('inkStage', th.accent).text : th.accentDeep} variant="duotone" />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(255, 255, 255, ${F.sheen * (own ? 0.35 : 1)}) 0%, rgba(255, 255, 255, 0) 46%)` }} />
      </div>
      <svg width={s} height={s} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden>
        <defs>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity={own ? F.rimTop * 0.5 : F.rimTop} />
            <stop offset="0.5" stopColor="white" stopOpacity={0} />
            <stop offset="1" stopColor="white" stopOpacity={F.rimBottom} />
          </linearGradient>
        </defs>
        {F.hair > 0 && !own && <path d={squirclePath(s, 0.5 * u)} fill="none" stroke={shade(F.hair)} strokeWidth={1 * u} />}
        <path d={squirclePath(s, 1.6 * u)} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={1.6 * u} />
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ chips and inline marks
/** A text size from a part's own dimensions, never under TEXT_MIN at this scale. */
const fit = (n: number, u: number) => Math.max(TEXT_MIN * u, n);

/**
 * A source or integration on a pill: its mark (bare, or on a small tile with `tile`) and its name. Without a fetched
 * mark it is the kit's text pill (Chip, with `glyph` when one is given): the fallback, never the default.
 */
export const LogoChip: React.FC<{ theme: KitTheme; logo: LogoRef; label?: string; h: number; tile?: boolean; glyph?: GlyphName; id?: string; scale?: number }> = ({
  theme: t, logo, label, h, tile, glyph, id = 'kit-logo-chip', scale,
}) => {
  const u = useKitScale(scale);
  const name = label ?? logoName(logo);
  if (!hasLogo(logo)) return <Chip theme={t} label={name} glyph={glyph} h={h} id={id} scale={scale} />;
  const ground: Ground = t.dark ? 'dark' : 'light';
  return (
    <div data-ui style={{ display: 'inline-flex', alignItems: 'center', gap: h * 0.24, height: h, padding: `0 ${h * 0.42}px 0 ${tile ? h * 0.12 : h * 0.26}px`, borderRadius: h / 2, background: t.surface, boxShadow: chipShadow(t, u), boxSizing: 'border-box' }}>
      {tile ? <AppIcon logo={logo} size={h * 0.76} theme={t} lift={4} scale={scale} /> : <BrandLogo logo={logo} box={h * 0.5} ground={ground} />}
      <span data-text={id} style={face(fit(h * 0.4, u), 600, t.text, -0.015)}>
        {name}
      </span>
    </div>
  );
};
const chipShadow = (t: KitTheme, u: number) => surfaceShadow(t, 10, u); // the card material at a chip's lift (kit/parts, kit/card)

/** The cap height of the film's sans at `size` (measured from the face; 0.71 em when no canvas is at hand). */
export const capHeight = (size: number, weight = 450) => {
  try { return inkBox('H', size, weight).ascent || size * 0.71; } catch { return size * 0.71; }
};

/**
 * Which mark an inline slot shows at `frame`: marks change every `every` frames from `start` (60 fps frames, scaled
 * to the film; house 48), each change a `swap`-frame roll (house 16 f at 60): `i` the mark coming in, `prev` the one leaving,
 * `k` 0..1 through the roll (1 when settled). With `loop` it cycles; without, it holds the last mark.
 */
export const inlineLogoState = (frame: number, n: number, o: { start?: number; every?: number; swap?: number; loop?: boolean; fps?: number } = {}) => {
  const fps = o.fps ?? fpsOf();
  const every = f60x(o.every ?? 48, fps), swap = Math.max(1, f60x(o.swap ?? 16, fps));
  const t = frame - (o.start ?? 0);
  if (n <= 0) return { i: 0, prev: 0, k: 1 };
  const step = Math.max(0, Math.floor(t / every));
  const idx = (s: number) => (o.loop ? s % n : Math.min(n - 1, s));
  const i = idx(step);
  const prev = step === 0 ? i : idx(step - 1);
  const k = i === prev ? 1 : clamp((t - step * every) / swap);
  return { i, prev, k };
};

/**
 * Marks at 1.0 cap height inside a line of type: put it between words (an inline-block on the baseline, as wide as
 * the widest mark at cap height). Every `every` frames the marks roll one slot up as one strip over `swap` frames
 * (E.glideOut, landing with a tail), clipped to the line's cap box: the next mark rises from under the baseline as the last one
 * leaves over the cap line, the two never overlapping. `size` and `weight` are the line's own.
 */
export const InlineLogo: React.FC<{ logos: LogoRef[]; size: number; frame: number; start?: number; every?: number; swap?: number; loop?: boolean; weight?: number; ground?: Ground; mono?: boolean }> = ({
  logos, size, frame, start = 0, every = 48, swap = 16, loop = false, weight = 450, ground = 'light', mono = false,
}) => {
  const cap = capHeight(size, weight);
  const files = logos.map((l) => { const e = logoOf(l); return e ? logoFile(e, 'mark', ground, mono) : null; });
  const width = Math.max(cap, ...files.map((f) => (f ? cap * Math.min(1.6, f.aspect) : cap)));
  const { fps } = useFilm();
  const { i, prev, k } = inlineLogoState(frame, logos.length, { start, every, swap, loop, fps });
  const one = (j: number, p: number, leaving: boolean) => {
    const f = files[j];
    if (!f) return null;
    const e = logoOf(logos[j])!;
    const q = E.glideOut(p); // one strip: both marks move together
    const w = Math.min(width, cap * f.aspect), h = w / f.aspect;
    const pitch = 1.2 * cap;
    const y = leaving ? -q * pitch : (1 - q) * pitch;
    const op = leaving ? 1 - 0.5 * q : 1;
    return (
      <Img key={`${j}-${leaving ? 'out' : 'in'}`} src={staticFile(f.src)} data-logo={e.name}
        style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'block', opacity: op, transform: `translate(${((width - w) / 2).toFixed(2)}px, ${((cap - h) / 2 + y).toFixed(2)}px)` }} />
    );
  };
  return (
    <span data-ui style={{ display: 'inline-block', position: 'relative', width, height: cap, verticalAlign: 'baseline', clipPath: `inset(${(-0.06 * cap).toFixed(2)}px -2px ${(-0.06 * cap).toFixed(2)}px -2px)` }}>
      {k < 1 && one(prev, k, true)}
      {one(i, k, false)}
    </span>
  );
};

// ------------------------------------------------------------------------------------------------ treatments and rows
/**
 * How a film presents other products' marks, one treatment per row (never mixed):
 *   tile  a neutral tile in the film's card material (light on a light or mid ground, dark on a dark one), the mark in
 *         its official colours at one optical size: the default, and the answer when official colours fight a
 *         coloured ground (the tile gives every mark the same neutral plate)
 *   ink   the mark in one colour, the film's ink (white on a dark ground), from the brand's own one-colour file: the
 *         quietest row, for a monochrome or colour-field film; only for brands that publish one (logos.mjs fetches it)
 *   bare  the official mark alone at the optical size, for a light page where every mark has a version for the ground
 *   chip  a mark and its name on a pill (LogoChip), every pill one height
 */
export type LogoTreatment = 'tile' | 'ink' | 'bare' | 'chip';

/** House numbers for marks in a row (shares of the tile side). */
export const LOGO_ROW = { fill: 0.5, inkFill: 0.62, radius: 0.24, gap: 0.34, sizeTol: 0.02 } as const;

/** Whether a brand publishes a one-colour mark (the record holds a mono, white or black file). */
export const hasMono = (ref: LogoRef) => {
  const f = logoOf(ref)?.files;
  return !!(f && (f.mono || f.white || f.black));
};

/** Relative lightness (0..1) of a '#rrggbb' or 'rgb()' colour, for picking a tile tone from the ground. */
const lumOf = (c: string) => {
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const v = parseInt(m[1], 16);
    return ((v >> 16) * 0.2126 + ((v >> 8) & 255) * 0.7152 + (v & 255) * 0.0722) / 255;
  }
  const r = c.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  return r ? (Number(r[1]) * 0.2126 + Number(r[2]) * 0.7152 + Number(r[3]) * 0.0722) / 255 : 1;
};

/**
 * One mark in a treatment, `size` px square (the tile's side; bare and ink marks take the same optical box).
 * `ground` is the colour behind it (a family's ground or a token): a tile is light on a light or mid ground, dark on a
 * dark one; ink is `ink` (default: the card ink for the ground, near-black or near-white). `plate`: ink on a tile.
 */
export const LogoTile: React.FC<{ logo: LogoRef; size: number; treatment?: Exclude<LogoTreatment, 'chip'>; ground?: string; ink?: string; plate?: boolean; u?: number; style?: React.CSSProperties }> = ({
  logo, size: s, treatment = 'tile', ground = C.paper, ink, plate, u = U, style,
}) => {
  const e = logoOf(logo);
  const dark = lumOf(ground) < 0.42;
  const g: Ground = dark ? 'dark' : 'light';
  const withTile = treatment === 'tile' || (treatment === 'ink' && !!plate);
  const inks = cardInks(dark ? 'dark' : 'light', ground);
  const fillShare = treatment === 'ink' && !plate ? LOGO_ROW.inkFill : LOGO_ROW.fill;
  const monoFile = e ? logoFile(e, 'mark', g, true) : null;
  // on a light tile the light-ground file, whatever the ground behind the tile
  const colourFile = e ? logoFile(e, 'mark', withTile ? (dark ? 'dark' : 'light') : g) : null;
  const own = !!e && e.tile === 'own' && !!e.files.mark && treatment === 'tile';
  if (!e || (!colourFile && !monoFile)) {
    kitEmpty('LogoTile', `the real mark of ${typeof logo === 'string' ? logo : logo.name} (node scripts/logos.mjs)`);
    return <div data-ui data-kit-empty="LogoTile" style={{ width: s, height: s, flex: 'none', ...style }} />;
  }
  const inkColour = ink ?? inks.text;
  const file = treatment === 'ink' ? monoFile ?? colourFile! : colourFile ?? monoFile!;
  const m = opticalSize(file.aspect, s * fillShare);
  const url = `url(${staticFile(file.src)})`;
  const mark =
    treatment === 'ink' ? (
      <div data-logo={e.name} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${((s - m.w) / 2).toFixed(2)}px, ${((s - m.h) / 2).toFixed(2)}px)`, width: m.w, height: m.h, background: inkColour, WebkitMaskImage: url, maskImage: url, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
    ) : own ? (
      <Img src={staticFile(e.files.mark!.src)} data-logo={e.name} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s, display: 'block' }} />
    ) : (
      <Img src={staticFile(file.src)} data-logo={e.name} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${((s - m.w) / 2).toFixed(2)}px, ${((s - m.h) / 2).toFixed(2)}px)`, width: m.w, height: m.h, display: 'block' }} />
    );
  const k = Math.max(0.5, s / (160 * u)) * u;
  return (
    <div
      data-ui
      data-icon={e.name}
      data-treatment={treatment}
      style={{ position: 'relative', width: s, height: s, flex: 'none', borderRadius: s * LOGO_ROW.radius, overflow: own ? 'hidden' : 'visible', ...(withTile ? { background: `linear-gradient(180deg, ${inks.faceTop}, ${inks.faceBottom})`, boxShadow: cardShadow(inks, lumOf(ground), 0, k) } : null), ...style }}
    >
      {mark}
    </div>
  );
};

/**
 * A row of marks in ONE treatment at ONE size, centred on its box: every tile the same side, every mark the same
 * optical size, the same gap. `ink` on a row where a brand publishes no one-colour mark falls back to `tile` for the
 * whole row (one treatment, never mixed). `chip` sets LogoChips one height (`size` is the pill's height).
 */
export const LogoRow: React.FC<{ logos: LogoRef[]; size: number; treatment?: LogoTreatment; ground?: string; ink?: string; gap?: number; theme?: KitTheme; plate?: boolean; u?: number; style?: React.CSSProperties }> = ({
  logos, size, treatment = 'tile', ground = C.paper, ink, gap, theme, plate, u = U, style,
}) => {
  const g = gap ?? size * LOGO_ROW.gap;
  const t = theme ?? (lumOf(ground) < 0.42 ? kitTheme('inkStage') : paper());
  const tr: LogoTreatment = treatment === 'ink' && !logos.every(hasMono) ? 'tile' : treatment;
  return (
    <div data-ui data-logo-row={tr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: g, ...style }}>
      {logos.map((l, i) => (tr === 'chip' ? <LogoChip key={i} theme={t} logo={l} h={size} scale={u} /> : <LogoTile key={i} logo={l} size={size} treatment={tr} ground={ground} ink={ink} plate={plate} u={u} />))}
    </div>
  );
};

export type LogoRowItem = { logo: LogoRef; treatment: LogoTreatment; size: number; tone?: Ground };

/**
 * The faults of a row of marks as a film draws it: more than one treatment, sizes more than 2 % apart, mixed tile
 * tones, ink on a brand with no one-colour file, a brand's own colour tile among neutral tiles (its colour block
 * fights the row: ink the row, or set every mark bare), and three or more colour marks bare on a coloured ground
 * (`field`: tile them on neutral plates or ink them). Empty: the row is consistent. Pure.
 */
export const logoRowCheck = (items: readonly LogoRowItem[], o: { field?: boolean } = {}) => {
  const out: string[] = [];
  const kinds = [...new Set(items.map((i) => i.treatment))];
  if (kinds.length > 1) out.push(`mixed treatments (${kinds.join(', ')}): one treatment per row`);
  const sizes = items.map((i) => i.size);
  if (sizes.length && Math.max(...sizes) > Math.min(...sizes) * (1 + LOGO_ROW.sizeTol)) out.push(`sizes ${Math.round(Math.min(...sizes))}-${Math.round(Math.max(...sizes))} px: one size per row (the optical size evens the marks out)`);
  const tones = [...new Set(items.filter((i) => i.treatment === 'tile').map((i) => i.tone ?? 'light'))];
  if (tones.length > 1) out.push('light and dark tiles in one row: one tile tone, from the ground');
  for (const i of items) {
    const e = logoOf(i.logo);
    if (!e) continue;
    if (i.treatment === 'ink' && !hasMono(i.logo)) out.push(`${e.name}: ink, but the brand publishes no one-colour mark (fetch it with logos.mjs, or tile the row)`);
    if (i.treatment === 'tile' && e.tile === 'own' && items.some((x) => x !== i && logoOf(x.logo)?.tile !== 'own')) out.push(`${e.name}: its own colour tile among neutral tiles (ink the row, or set every mark bare)`);
  }
  const colourBare = items.filter((i) => (i.treatment === 'bare' || i.treatment === 'chip') && logoOf(i.logo)?.tone === 'colour').length;
  if (o.field && colourBare >= 3) out.push(`${colourBare} colour marks bare on a coloured ground: tile them on neutral plates or ink them`);
  return out;
};

// ------------------------------------------------------------------------------------------------ walls and rings
/** A tile of a wall or ring: where it rests (px, about the layer's top-left), its depth (0 near, 1 far), its turn in the order. */
export type TileSlot = { x: number; y: number; depth: number; order: number; logo: number | null; tilt: [rx: number, ry: number] };

/** The depth bands tiles settle on: scale, defocus (px at 1080p, a fixed level per tile, none on the near half) and how much of the drift they take. */
export const DEPTH = { scale: [1, 0.6], blur: [0, 6], sharp: 0.5, drift: [1, 0.35], bands: [0, 0.42, 0.85] } as const;
/** The defocus of a tile at `depth` (px at 1080p): sharp up to DEPTH.sharp (every mark stays readable), then up to DEPTH.blur[1]. */
export const depthBlur = (depth: number) => mix(DEPTH.blur[0], DEPTH.blur[1], clamp((depth - DEPTH.sharp) / (1 - DEPTH.sharp)));

/** A seeded tumble for a tile: 20-60 degrees about x and y, either way. */
const tumble = (seed: string): [number, number] => {
  const a = 20 + 40 * rand(`${seed}:ax`), b = 20 + 40 * rand(`${seed}:ay`);
  return [rand(`${seed}:sx`) < 0.5 ? -a : a, rand(`${seed}:sy`) < 0.5 ? -b : b];
};

/**
 * A wall's slots: a cols x rows grid (offset every other row), jittered a little, each slot on one of three depth
 * bands; the `n` marks take the slots nearest the centre that are not in `clear` (a box kept free for a line or a
 * hub, px about the centre), the rest are blank tiles. Arrival order runs out from the centre. Pure.
 */
export const wallSlots = (n: number, o: { cols: number; rows: number; cell: number; w: number; h: number; seed?: string | number; clear?: { w: number; h: number } }): TileSlot[] => {
  const seed = String(o.seed ?? 'wall');
  const slots: TileSlot[] = [];
  for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
    const k = `${seed}:${r}:${c}`;
    const x = o.w / 2 + (c - (o.cols - 1) / 2 + (r % 2 ? 0.25 : -0.25)) * o.cell + (rand(`${k}:jx`) - 0.5) * 0.18 * o.cell;
    const y = o.h / 2 + (r - (o.rows - 1) / 2) * o.cell * 0.92 + (rand(`${k}:jy`) - 0.5) * 0.18 * o.cell;
    if (o.clear && Math.abs(x - o.w / 2) < o.clear.w / 2 && Math.abs(y - o.h / 2) < o.clear.h / 2) continue;
    const band = DEPTH.bands[Math.floor(rand(`${k}:d`) * DEPTH.bands.length)];
    slots.push({ x, y, depth: band, order: 0, logo: null, tilt: tumble(k) });
  }
  const dist = (s: TileSlot) => Math.hypot((s.x - o.w / 2) / o.w, (s.y - o.h / 2) / o.h);
  const byCentre = [...slots].sort((a, b) => dist(a) + a.depth * 0.25 - (dist(b) + b.depth * 0.25));
  byCentre.slice(0, n).forEach((s, i) => { s.logo = i; s.depth = Math.min(s.depth, DEPTH.bands[1]); }); // marks sit on the near bands
  [...slots].sort((a, b) => dist(a) + rand(`${seed}:o${a.x.toFixed(0)}`) * 0.08 - (dist(b) + rand(`${seed}:o${b.x.toFixed(0)}`) * 0.08)).forEach((s, i) => { s.order = i; });
  return slots;
};

/**
 * A ring's slots: `n` tiles round an ellipse (rx, ry about the centre), turned by `turn` radians (an orbit: pass
 * speed x seconds); the top of the ring is far (smaller, softer), the bottom near. Pure.
 */
export const ringSlots = (n: number, o: { rx: number; ry: number; w: number; h: number; turn?: number; seed?: string | number }): TileSlot[] => {
  const seed = String(o.seed ?? 'ring');
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (o.turn ?? 0);
    return { x: o.w / 2 + Math.cos(a) * o.rx, y: o.h / 2 + Math.sin(a) * o.ry, depth: clamp((1 - Math.sin(a)) / 2), order: i, logo: i, tilt: tumble(`${seed}:${i}`) };
  });
};

/**
 * A tile's arrival at `frame`: from its tumble (rx, ry), pushed back in depth and dropped a little, to rest on an
 * arrive curve over `dur` 60 fps frames from `at`; opacity in the first third. Pure: { p, rx, ry, z, y, opacity }.
 */
export const tileArrival = (frame: number, at: number, o: { dur?: number; tilt: [number, number]; depthPx?: number; dropPx?: number; fps?: number }) => {
  const fps = o.fps ?? fpsOf();
  const p = prog(frame, at, at + f60x(o.dur ?? 28, fps), E.glideOut);
  const q = 1 - p;
  return { p, rx: o.tilt[0] * q, ry: o.tilt[1] * q, z: -(o.depthPx ?? 520) * q, y: (o.dropPx ?? 70) * q, opacity: clamp(prog(frame, at, at + f60x(10, fps), E.softOut)) };
};

type WallCommon = {
  logos: LogoRef[];
  frame: number;
  start?: number;
  /** the layer's size (px); default the frame */
  w?: number;
  h?: number;
  /** a near tile's side (px) */
  tile?: number;
  /** 60 fps frames between arrivals (in the order out from the centre) */
  stagger?: number;
  dur?: number;
  /** px a second the near tiles drift (far ones take DEPTH.drift of it): off by default (0); give it only for a designed
   *  move that starts, travels and lands, never as an idle wander: it slows to a stop over `travel` */
  drift?: number;
  /** seconds a drift (or a ring's orbit) travels from the layer's start before it lands at rest (default TRAVEL_S) */
  travel?: number;
  tone?: Ground;
  theme?: KitTheme;
  seed?: string | number;
  /** depth softening on (the far bands take DEPTH.blur) */
  blur?: boolean;
};

/** How long a designed drift or orbit travels before it lands (s): the tiles land, then the layer holds still. */
export const TRAVEL_S = 1.8;
/** The distance (in seconds of full speed) a move starting at full speed covers by `t` s when it slows evenly to rest
 * over `travel` s: t - t^2 / 2T, then T / 2 for good. Pure. */
export const landedTravel = (t: number, travel = TRAVEL_S) => {
  const T = Math.max(1e-3, travel);
  const u = Math.min(Math.max(0, t), T);
  return u - (u * u) / (2 * T);
};

const Tile: React.FC<{ slot: TileSlot; logo: LogoRef | null; frame: number; at: number; o: WallCommon; x: number; y: number; size: number; blank?: boolean }> = ({ slot, logo, frame, at, o, x, y, size, blank }) => {
  const a = tileArrival(frame, at, { dur: o.dur, tilt: slot.tilt, depthPx: 520 * U, dropPx: 70 * U });
  if (a.opacity <= 0) return null;
  const s = mix(DEPTH.scale[0], DEPTH.scale[1], slot.depth);
  const sigma = o.blur === false ? 0 : depthBlur(slot.depth);
  const icon = <AppIcon logo={logo ?? undefined} size={size} tone={o.tone} theme={o.theme} lift={mix(64, 18, a.p)} glyph={undefined} />;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((1 - slot.depth) * 100), opacity: a.opacity * (blank ? 0.5 : 1), transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2 + a.y).toFixed(2)}px, ${a.z.toFixed(1)}px) rotateX(${a.rx.toFixed(2)}deg) rotateY(${a.ry.toFixed(2)}deg) scale(${s.toFixed(4)})`, transformStyle: 'flat' }}>
      {sigma >= 0.75 ? <Defocus sigma={sigma} style={{ position: 'relative', width: size, height: size }}>{blank ? <BlankTile size={size} o={o} /> : icon}</Defocus> : blank ? <BlankTile size={size} o={o} /> : icon}
    </div>
  );
};

/** A tile without a mark: the wall's quiet grid between the marks. */
const BlankTile: React.FC<{ size: number; o: WallCommon }> = ({ size: s, o }) => {
  const F = tileFace(o.tone ?? 'light', (o.theme ?? paper()).hue);
  return <div style={{ width: s, height: s, clipPath: `path('${squirclePath(s)}')`, background: `linear-gradient(180deg, ${F.top}, ${F.bottom})`, boxShadow: `inset 0 0 0 ${U}px ${shadeRgba(o.theme ?? paper(), 0.06)}` }} />;
};

/**
 * A wall of app-icon tiles: the marks take the slots nearest the centre, blank tiles fill the grid round them; each
 * tile arrives tumbling (20-60 deg) out from the centre and lands flat, facing the camera, on its depth band (smaller
 * and softer further back); it holds still unless `drift` is given for a designed move, which lands over `travel` s. 12-30 marks; `clear` keeps a box free for a line or a hub.
 */
export const LogoWall: React.FC<WallCommon & { cols?: number; rows?: number; clear?: { w: number; h: number }; blanks?: boolean }> = (props) => {
  const { logos, frame, start = 0, w = 1920 * U, h = 1080 * U, tile = 150 * U, stagger = 2, drift = 0, seed = 'wall', blanks = true, travel = TRAVEL_S } = props;
  const fps = fpsOf();
  const cols = props.cols ?? Math.max(4, Math.round(w / (tile * 1.55)));
  const rows = props.rows ?? Math.max(3, Math.round(h / (tile * 1.5)));
  const slots = wallSlots(logos.length, { cols, rows, cell: tile * 1.55, w, h, seed, clear: props.clear });
  // a designed drift slows to rest over `travel`: the wall lands and holds still
  const t = landedTravel(Math.max(0, frame - start) / fps, travel);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: `${(1900 * U).toFixed(0)}px`, transformStyle: 'preserve-3d' }}>
      {slots.filter((s) => blanks || s.logo !== null).map((s, i) => {
        const dx = drift * t * mix(DEPTH.drift[0], DEPTH.drift[1], s.depth);
        const at = start + f60x(stagger, fps) * s.order;
        return <Tile key={i} slot={s} logo={s.logo === null ? null : logos[s.logo]} blank={s.logo === null} frame={frame} at={at} o={props} x={s.x + dx} y={s.y - dx * 0.18} size={tile} />;
      })}
    </div>
  );
};

/**
 * A ring of app-icon tiles round a centre kept free (a line, the product's own mark): the tiles arrive tumbling in
 * turn and land flat; the ring holds still unless `orbit` (degrees a second) is given for a designed turn; the far side
 * of the ring is smaller and softer; a turn slows to rest over `travel` s (TRAVEL_S) and the ring holds.
 */
export const LogoRing: React.FC<WallCommon & { rx?: number; ry?: number; orbit?: number }> = (props) => {
  const { logos, frame, start = 0, w = 1920 * U, h = 1080 * U, tile = 132 * U, stagger = 3, rx = 640 * U, ry = 330 * U, orbit = 0, seed = 'ring', travel = TRAVEL_S } = props;
  const fps = fpsOf();
  // a designed turn slows to rest over `travel`: the ring lands and holds still
  const t = landedTravel(Math.max(0, frame - start) / fps, travel);
  const slots = ringSlots(logos.length, { rx, ry, w, h, turn: (orbit * Math.PI * t) / 180, seed });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: `${(1900 * U).toFixed(0)}px`, transformStyle: 'preserve-3d' }}>
      {slots.map((s, i) => (
        <Tile key={i} slot={{ ...s, depth: s.depth * 0.8 }} logo={logos[i]} frame={frame} at={start + f60x(stagger, fps) * s.order} o={{ ...props, blur: props.blur ?? true }} x={s.x} y={s.y} size={tile} />
      ))}
    </div>
  );
};
