// The premium card: the material every card, panel, chip tile and lockup plate in a film is made of. A card faces the
// camera (no resting tilt: a tilt is a designed 3D move that starts, travels and lands flat), holds still (no idle
// bobbing or breathing), and reads by its material, never as a translucent grey slab:
//   - an opaque face with a quiet vertical sheen (lit from above: 1-2 L* from top to bottom, never a diagonal wash)
//   - a hairline round the edge (ink at 7 % on a light card, white at 8 % on a dark one) and an inner top highlight
//     (the edge catching the key)
//   - two shadow layers under the key (a tight contact shadow and a broad soft ambient one, mostly straight down,
//     nudged away from the light), plus a third, wider layer once it is lifted toward the lens
//   - a real corner radius by size (CARD.radius), the inner radius concentric (outer minus the padding), padding and a
//     type scale inside it (CARD.pad, CARD.type: the text face at film size, nothing under TEXT_MIN)
// Tones: `light` (a near-white card, on any ground), `dark` (a card 8-12 L* over a dark ground, with a rim of light),
// `glass` (frost over a picture behind it: give `backdrop`, the same picture at the same place, and the card blurs its
// own copy of it; without a backdrop glass falls back to the solid tone, never a see-through grey).
// Pure functions of their props; transforms and opacity only.
import React from 'react';
import { C, TEXT_MIN } from '../brand/tokens';
import { mixColor, oklch as fromLch, toOklch } from '../lib/color';
import { face, KIT_FONT } from './parts';

export type CardTone = 'light' | 'dark' | 'glass';
export type CardSize = 'sm' | 'md' | 'lg';

/** House numbers, px at 1080p. */
export const CARD = {
  radius: { sm: 24, md: 34, lg: 46 }, // corner radius by size class (a chip is a pill: h / 2)
  pad: { sm: 30, md: 44, lg: 60 }, // inner padding by size class
  size: { md: 520, lg: 900 }, // width at which a card is md, lg (under md: sm)
  hairline: 1.25, // px
  sheen: { light: 0.05, dark: 0.045 }, // OKLCH L from the top edge to the bottom edge (a lit face, never a flat slab: 4-5 L* across)
  key: { light: 0.04, dark: 0.06 }, // the key's fall-off across the face from the upper left: a shade toward the far corner (light), a lift at the key (dark)
  edge: { light: 0.42 }, // a light card on a dark ground: its top edge catching the key (an outer line of light)
  lift: { dark: 0.09, darkMin: 0.08 }, // a dark card sits this far over its ground (look-audit card-separation: 8 L*)
  // the type inside a card: the text face (FONT.ui) at film size
  type: {
    eyebrow: { px: 36, weight: 600, track: 0.06 }, // a label in capitals, one or two words
    title: { px: 60, weight: 600, track: -0.018 },
    body: { px: 44, weight: 450, track: -0.004 },
    meta: { px: 38, weight: 450, track: 0.004 },
    figure: { px: 132, weight: 600, track: -0.03 },
  },
  glass: { blur: 34, tint: { light: 0.56, dark: 0.5 }, saturate: 1.15 },
} as const;

/** The size class of a card `w` px wide (at 1080p, times the film's unit `u`). */
export const cardSize = (w: number, u = 1): CardSize => (w >= CARD.size.lg * u ? 'lg' : w >= CARD.size.md * u ? 'md' : 'sm');
/** A nested corner: the outer radius minus the padding (never under a third of it), so corners stay concentric. */
export const innerRadius = (r: number, pad: number) => Math.max(r * 0.34, r - pad);

/** The colours a card writes with. */
export type CardInks = { face: string; faceTop: string; faceBottom: string; text: string; mute: string; line: string; accent: string; dark: boolean };

/**
 * A card's inks for a tone on a ground (the ground colour behind it: a token or a family's `ground`). Light cards are
 * near-white at the ground's neutral hue; dark cards sit CARD.lift.dark over the ground (at least 8 L*), at the
 * ground's hue with chroma held under .014, so a card never turns into a second accent. Pure.
 */
export const cardInks = (tone: CardTone, ground: string = C.paper, accent: string = C.accent): CardInks => {
  const [gL, gC, gh] = toOklch(ground);
  const nC = Math.min(0.006, gC);
  const dark = tone === 'dark' || (tone === 'glass' && gL < 0.5);
  if (!dark) {
    const top = fromLch(0.995, nC * 0.4, gh);
    const bottom = fromLch(0.995 - CARD.sheen.light, nC * 0.6, gh);
    const ink = fromLch(0.2, Math.min(0.012, gC), gh);
    return { face: mixColor(top, bottom, 0.5), faceTop: top, faceBottom: bottom, text: ink, mute: fromLch(0.47, Math.min(0.012, gC), gh), line: fromLch(0.9, nC, gh), accent, dark: false };
  }
  const L = Math.max(gL + CARD.lift.dark, gL + CARD.lift.darkMin);
  const cc = Math.min(0.014, gC * 0.6);
  const top = fromLch(Math.min(0.42, L + CARD.sheen.dark * 0.5), cc, gh);
  const bottom = fromLch(Math.min(0.4, L - CARD.sheen.dark * 0.5), cc, gh);
  const aL = toOklch(accent)[0];
  return { face: fromLch(L, cc, gh), faceTop: top, faceBottom: bottom, text: fromLch(0.97, 0.004, gh), mute: fromLch(0.72, 0.01, gh), line: fromLch(Math.min(0.5, L + 0.08), cc, gh), accent: aL < 0.62 ? mixColor(accent, C.white, 0.28) : accent, dark: true };
};

/**
 * The card's shadow (one box-shadow value) for its ground's lightness, `lift` 0..1 (0 resting on the ground, 1 held up
 * toward the lens) and scale `u`: contact + ambient, plus a far layer while lifted; then the hairline and the inner top
 * highlight. Mostly straight down under a softbox key, nudged 22 % away from the light (the key is upper left).
 */
export const cardShadow = (inks: CardInks, groundL: number, lift = 0, u = 1, o: { hairline?: boolean } = {}) => {
  const dark = groundL < 0.5;
  const k = dark ? 1 : 0.85;
  const sh = (a: number) => `rgba(0, 0, 0, ${(a * k).toFixed(3)})`;
  const y1 = (1 + lift) * u;
  const y2 = (14 + 26 * lift) * u;
  const b2 = (40 + 50 * lift) * u;
  const layers = [
    `${(0.22 * y1).toFixed(2)}px ${y1.toFixed(2)}px ${(2.5 * u).toFixed(2)}px ${sh(dark ? 0.45 : 0.1)}`, // contact
    `${(0.22 * y2).toFixed(2)}px ${y2.toFixed(2)}px ${b2.toFixed(2)}px ${(-10 * u).toFixed(2)}px ${sh(dark ? 0.5 : 0.16)}`, // ambient
  ];
  if (lift > 0.05) layers.push(`${(0.22 * 60 * lift * u).toFixed(2)}px ${(60 * lift * u).toFixed(2)}px ${(120 * lift * u).toFixed(2)}px ${(-24 * u).toFixed(2)}px ${sh((dark ? 0.35 : 0.12) * lift)}`);
  const hl = o.hairline === false ? [] : [`inset 0 0 0 ${(CARD.hairline * u).toFixed(2)}px ${inks.dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)'}`];
  const top = `inset 0 ${(1.2 * u).toFixed(2)}px 0 ${inks.dark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(255, 255, 255, 0.9)'}`;
  // a light card in a dark world is a lit object: its top edge catches the key (a hairline of light just outside it),
  // never a white slab with a drop shadow (and never a halo of haze round it)
  const lit = !inks.dark && dark ? [`0 ${(-1.1 * u).toFixed(2)}px 0 rgba(255, 255, 255, ${CARD.edge.light})`] : [];
  return [...hl, top, ...lit, ...layers].join(', ');
};

/** A box-shadow value split into its layers at the top-level commas (an rgba() holds commas of its own). Pure. */
export const shadowLayers = (v: string) => v.split(/,\s*(?![^()]*\))/).map((x) => x.trim()).filter(Boolean);

export type CardProps = {
  tone?: CardTone;
  w: number;
  h: number;
  x?: number;
  y?: number;
  /** the colour behind the card (a family's ground, a token): its lightness sets the shadow, its hue the card's neutrals */
  ground?: string;
  accent?: string;
  size?: CardSize;
  r?: number;
  /** 0 resting (default) .. 1 lifted toward the lens: the shadow grows and softens (a designed move, never an idle bob) */
  lift?: number;
  /** glass: the picture behind the card, drawn at the card's own place (frame coordinates minus x, y); blurred inside it */
  backdrop?: React.ReactNode;
  u?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
};

/** A card face: positioned at (x, y), w x h, facing the camera; content clipped to its corners. */
export const Card: React.FC<CardProps> = ({ tone = 'light', w, h, x = 0, y = 0, ground = C.paper, accent = C.accent, size, r, lift = 0, backdrop, u = 1, children, style, id }) => {
  const sz = size ?? cardSize(w, u);
  const R = r ?? CARD.radius[sz] * u;
  const glass = tone === 'glass' && !!backdrop;
  const solid: CardTone = tone === 'glass' ? (toOklch(ground)[0] < 0.5 ? 'dark' : 'light') : tone;
  const inks = cardInks(glass ? tone : solid, ground, accent);
  const gL = toOklch(ground)[0];
  return (
    <div
      data-ui
      data-card={glass ? 'glass' : solid}
      {...(id ? { 'data-id': id } : {})}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: R,
        overflow: 'hidden',
        transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`,
        background: glass ? 'transparent' : `linear-gradient(180deg, ${inks.faceTop} 0%, ${inks.faceBottom} 100%)`,
        boxShadow: cardShadow(inks, gL, lift, u),
        isolation: 'isolate',
        ...style,
      }}
    >
      {glass && (
        <>
          <div style={{ position: 'absolute', left: -x, top: -y, filter: `blur(${(CARD.glass.blur * u).toFixed(1)}px) saturate(${CARD.glass.saturate})`, transform: 'scale(1.06)', transformOrigin: `${x + w / 2}px ${y + h / 2}px` }}>{backdrop}</div>
          <div style={{ position: 'absolute', inset: 0, background: inks.dark ? `rgba(12, 14, 18, ${CARD.glass.tint.dark})` : `rgba(255, 255, 255, ${CARD.glass.tint.light})` }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(255, 255, 255, ${inks.dark ? 0.06 : 0.22}) 0%, rgba(255, 255, 255, 0) 42%)` }} />
        </>
      )}
      {glass ? null : (
        // the key across the face: it falls off from the upper left (look-audit card-slab reads a face whose own light spans
        // 3 L* or more as lit; the sheen alone is a slab)
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: inks.dark
              ? `radial-gradient(120% 100% at 18% 0%, rgba(255, 255, 255, ${CARD.key.dark}) 0%, rgba(255, 255, 255, 0) 70%)`
              : `radial-gradient(130% 115% at 20% 0%, rgba(0, 0, 0, 0) 38%, rgba(0, 0, 0, ${CARD.key.light}) 100%)`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      {/* the hairline and the top highlight sit over the content, so a photo filling the card still has its edge */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: R, boxShadow: shadowLayers(cardShadow(inks, gL, 0, u)).filter((s) => s.startsWith('inset')).join(', '), pointerEvents: 'none' }} />
    </div>
  );
};

export type CardTextRole = keyof typeof CARD.type;

/**
 * Text inside a card at its role: the text face (FONT.ui), the role's size, weight and tracking (eyebrow in capitals,
 * tracked open), in the card's ink (`mute` for eyebrow and meta). Never under TEXT_MIN at the film's unit `u`.
 */
export const cardText = (role: CardTextRole, inks: CardInks, u = 1, o: { color?: string; px?: number } = {}): React.CSSProperties => {
  const t = CARD.type[role];
  const px = Math.max(TEXT_MIN * u, (o.px ?? t.px) * u);
  const color = o.color ?? (role === 'eyebrow' || role === 'meta' ? inks.mute : inks.text);
  return {
    ...face(px, t.weight, color, t.track, role === 'body' ? 1.3 : role === 'figure' ? 1 : 1.15),
    fontFamily: KIT_FONT,
    ...(role === 'eyebrow' ? { textTransform: 'uppercase' as const } : null),
    ...(role === 'figure' ? { fontVariantNumeric: 'tabular-nums lining-nums' } : null),
  };
};

/** A hairline divider across a card's content box (inside its padding), in the card's line ink. */
export const CardRule: React.FC<{ inks: CardInks; w: number; x?: number; y: number; u?: number }> = ({ inks, w, x = 0, y, u = 1 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: Math.max(1, CARD.hairline * u), background: inks.line }} />
);

/**
 * The cheap-card check for a card a film draws by hand: a translucent fill (alpha under .9), no shadow, no hairline,
 * a resting tilt, or a dark card closer than 8 L* to its ground. Returns the faults (empty: the card is the material).
 */
export const cardFaults = (c: { fillAlpha?: number; shadow?: boolean; hairline?: boolean; tiltDeg?: number; cardL?: number; groundL?: number }) => {
  const out: string[] = [];
  if ((c.fillAlpha ?? 1) < 0.9) out.push('translucent fill: a see-through grey slab reads cheap (an opaque face, or glass with a backdrop)');
  if (c.shadow === false) out.push('no shadow: two layers under the key (cardShadow)');
  if (c.hairline === false) out.push('no hairline or inner highlight: the edge has to catch the light');
  if (Math.abs(c.tiltDeg ?? 0) > 0.5) out.push('a resting tilt: cards face the camera; tilt only inside a designed 3D move that lands flat');
  if (c.cardL !== undefined && c.groundL !== undefined && c.groundL < 0.5 && Math.abs(c.cardL - c.groundL) < CARD.lift.darkMin) out.push('a dark card under 8 L* off its ground');
  return out;
};
