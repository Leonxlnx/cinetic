// Shared by the design presets: the Design token type every preset is (a named look a film spreads into its own
// tokens: palette, grounds, type scale and weights, radii, shadow recipe, stroke, texture, spacing) and two parts:
// DesignSwatch (the preset at a glance) and DesignFrame (a designed frame in the look: a statement, a card, a picture
// and a mark placeholder over the look's ground, arriving in turn). A preset is a piece: `export const Quiet: Design =
// { ... }` in designs/Quiet.ts with its catalogue entry; the parts have no catalogue entry.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { at as prog, ease, mix } from '../../motion';
import { luminance, softShadow } from '../../world';

/** A named look as tokens. Every colour is a CSS colour; sizes are px at 1920 x 1080. */
export type Design = {
  name: string;
  /** One line: what the look is. */
  look?: string;
  palette: { ground: string; surface: string; ink: string; muted: string; accent: string; accentInk: string; line: string };
  /** Other accents the look allows (the first is `palette.accent`'s neighbour); never a purple or a green. */
  accents?: string[];
  /** The grounds the look uses, in order of use (flat colours or a picture's role). */
  grounds: string[];
  /** The library ground that goes with it (a grounds piece's name), if any. */
  groundPiece?: string;
  type: {
    /** CSS font family (from fonts.ts). */
    font: string;
    /** Statement, heading, body and label sizes (px at 1080). */
    scale: { statement: number; heading: number; body: number; label: number };
    weights: { statement: number; heading: number; body: number };
    tracking?: string;
    /** A giant size for a claim or a cropped word (px at 1080). */
    display?: number;
    /** A second face the look uses for one role (a serif greeting, a mono label). */
    second?: { font: string; role: string };
    case?: 'sentence' | 'lower' | 'title';
    lineHeight?: number;
    /**
     * Statement font sizes as shares of the frame height for a line of 5-6 words (`long`), 3-4 words (`mid`) and 1-2
     * words (`short`): readable type in the look's own proportions (`statementSize` picks one).
     */
    sizes?: { long: number; mid: number; short: number };
  };
  radii: { small: number; card: number; window: number };
  /** The shadow recipe: softShadow's level for a resting card and a hero object (0: no shadow). */
  shadow: { card: number; hero: number };
  stroke: { width: number; color: string };
  /** A texture family, or none: 'none' | 'grain' | 'dots' | 'grid' | 'paper'. */
  texture: 'none' | 'grain' | 'dots' | 'grid' | 'paper';
  /** Spacing (px at 1080): the frame margin, the gap between things, a card's padding. */
  spacing?: { margin: number; gap: number; pad: number };
  /** Pictures: their corner radius (px at 1080) and the grade every picture of the look takes (a CSS filter). */
  picture?: { radius: number; grade: string };
  /** Library pieces whose motion goes with the look. */
  moves?: string[];
};

/** A preset at a glance: its ground, a card in its surface, its type scale in its ink, its palette as chips. */
export const DesignSwatch: React.FC<{ design: Design; w?: number }> = ({ design: d, w = 1280 }) => {
  const p = d.palette;
  const h = w * 0.56;
  return (
    <div style={{ width: w, height: h, background: p.ground, borderRadius: d.radii.window, position: 'relative', overflow: 'hidden', fontFamily: d.type.font || fonts.inter, color: p.ink }}>
      <div style={{ position: 'absolute', left: w * 0.06, top: h * 0.12, fontSize: d.type.scale.statement * (w / 1920), fontWeight: d.type.weights.statement, letterSpacing: d.type.tracking, lineHeight: 1.05 }}>{d.name}</div>
      <div style={{ position: 'absolute', left: w * 0.06, bottom: h * 0.12, width: w * 0.42, padding: w * 0.025, boxSizing: 'border-box', background: p.surface, borderRadius: d.radii.card, border: `${d.stroke.width}px solid ${d.stroke.color}` }}>
        <div style={{ fontSize: d.type.scale.heading * (w / 1920), fontWeight: d.type.weights.heading }}>Heading</div>
        <div style={{ fontSize: d.type.scale.body * (w / 1920), fontWeight: d.type.weights.body, color: p.muted, marginTop: 8 }}>Body text in the look</div>
        <div style={{ display: 'inline-block', marginTop: 16, padding: '8px 18px', borderRadius: d.radii.small, background: p.accent, color: p.accentInk, fontSize: d.type.scale.label * (w / 1920), fontWeight: 600 }}>Action</div>
      </div>
      <div style={{ position: 'absolute', right: w * 0.06, bottom: h * 0.12, display: 'flex', gap: 12 }}>
        {[p.ground, p.surface, p.ink, p.muted, p.accent, p.line].map((c, i) => (
          <div key={i} style={{ width: w * 0.045, height: w * 0.045, borderRadius: d.radii.small, background: c, boxShadow: `inset 0 0 0 1px ${p.line}` }} />
        ))}
      </div>
    </div>
  );
};

/** The statement size in px for a line in a look: by its word count, from `type.sizes` (else `scale.statement`). */
export const statementSize = (d: Design, text: string, height: number) => {
  const n = text.trim().split(/\s+/).length;
  const z = d.type.sizes;
  if (!z) return d.type.scale.statement * (height / 1080);
  return (n <= 2 ? z.short : n <= 4 ? z.mid : z.long) * height;
};

/** A geometric mark placeholder in the look's accent: a tile with a quarter cut, never a real company's mark. */
export const MarkPlaceholder: React.FC<{ d: Design; size: number; name?: string }> = ({ d, size, name = 'Fieldwork' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.32 }}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="0" y="0" width="100" height="100" rx={Math.min(30, d.radii.small * 1.4)} fill={d.palette.accent} />
      <path d="M28 72V28h44A44 44 0 0 1 28 72Z" fill={d.palette.accentInk} />
    </svg>
    <span style={{ fontFamily: d.type.font, fontWeight: Math.max(500, d.type.weights.heading), fontSize: size * 0.62, letterSpacing: '-0.02em', color: d.palette.ink }}>{name}</span>
  </div>
);

/**
 * DesignFrame: one designed frame in a look, built in turn from `at`: the statement rises out of a mask (4 f), the card
 * arrives (12 f), the picture opens (18 f), the mark lands (26 f). `ground` is the look's ground piece (else its flat
 * ground). `align` puts the statement at the left margin or centred. Sizes from the frame (any size).
 */
export const DesignFrame: React.FC<{
  design: Design;
  statement: string;
  ground?: React.ReactNode;
  picture?: string;
  at?: number;
  align?: 'left' | 'center';
  heading?: string;
  body?: string;
  action?: string;
  mark?: string;
  /** A plate behind the statement (a colour, e.g. a dark glass over a busy picture), for contrast. */
  plate?: string;
}> = ({ design: d, plate, statement, ground, picture = 'img/waves-009.jpg', at = 0, align = 'left', heading = 'Weekly review', body = 'Three drafts are ready for you', action = 'Open drafts', mark }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const u = H / 1080;
  const p = d.palette;
  const sp = d.spacing ?? { margin: 120, gap: 40, pad: 36 };
  const m = sp.margin * u;
  const dark = luminance(p.ground) < 0.35;
  const s1 = prog(f, at + 4, 16, ease.out);
  const s2 = prog(f, at + 12, 18, ease.out);
  const s3 = prog(f, at + 18, 20, ease.out);
  const s4 = prog(f, at + 26, 14, ease.out);
  const shadow = d.shadow.card > 0 ? softShadow(d.shadow.card, p.ground) : 'none';
  const cardW = 600 * u;
  const picW = 0.27 * W;
  const picH = 0.5 * H;
  const text = d.type.case === 'lower' ? statement.toLowerCase() : statement;
  return (
    <AbsoluteFill style={{ background: p.ground, overflow: 'hidden', color: p.ink }}>
      {ground}
      <div style={{ position: 'absolute', left: align === 'left' ? m : 0, right: align === 'left' ? W * 0.36 : 0, top: 0.16 * H, textAlign: align, overflow: 'hidden', paddingBottom: '0.14em' }}>
        <div
          style={{
            transform: `translateY(${mix(s1, 105, 0)}%)`,
            fontFamily: d.type.font,
            fontSize: statementSize(d, statement, H),
            display: plate ? 'inline-block' : undefined,
            background: plate,
            padding: plate ? '0.18em 0.42em 0.24em' : undefined,
            borderRadius: plate ? d.radii.card * u : undefined,
            backdropFilter: plate ? `blur(${18 * u}px)` : undefined,
            fontWeight: d.type.weights.statement,
            letterSpacing: d.type.tracking,
            lineHeight: d.type.lineHeight ?? 1.04,
          }}
        >
          {text}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: m,
          bottom: 0.14 * H,
          width: cardW,
          padding: sp.pad * u,
          boxSizing: 'border-box',
          background: p.surface,
          borderRadius: d.radii.card * u,
          border: d.stroke.width ? `${d.stroke.width * u}px solid ${d.stroke.color}` : undefined,
          boxShadow: shadow,
          backdropFilter: p.surface.startsWith('rgba') ? `blur(${20 * u}px)` : undefined,
          opacity: s2,
          transform: `translateY(${mix(s2, 40 * u, 0)}px)`,
          fontFamily: d.type.font,
        }}
      >
        <div style={{ fontSize: d.type.scale.heading * u, fontWeight: d.type.weights.heading, letterSpacing: '-0.01em' }}>{heading}</div>
        <div style={{ fontSize: d.type.scale.body * u, fontWeight: d.type.weights.body, color: p.muted, marginTop: 10 * u }}>{body}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 * u, marginTop: 26 * u }}>
          <div style={{ padding: `${12 * u}px ${24 * u}px`, borderRadius: d.radii.small * u, background: p.accent, color: p.accentInk, fontSize: d.type.scale.label * u, fontWeight: 600 }}>{action}</div>
          <div style={{ fontSize: d.type.scale.label * u, color: p.muted }}>2 min ago</div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: m,
          top: 0.5 * H - picH / 2 + 0.04 * H,
          width: picW,
          height: picH,
          borderRadius: (d.picture?.radius ?? d.radii.card) * u,
          overflow: 'hidden',
          clipPath: `inset(${mix(s3, 50, 0)}% 0 ${mix(s3, 50, 0)}% 0 round ${(d.picture?.radius ?? d.radii.card) * u}px)`,
          boxShadow: d.shadow.hero > 0 && s3 > 0.99 ? softShadow(d.shadow.hero, p.ground) : undefined,
          outline: dark ? `1px solid ${p.line}` : undefined,
        }}
      >
        <Img src={staticFile(picture)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${mix(s3, 1.12, 1.02)})`, filter: d.picture?.grade }} />
      </div>
      <div style={{ position: 'absolute', right: m, bottom: 0.07 * H, opacity: s4, transform: `translateY(${mix(s4, 16 * u, 0)}px)` }}>
        <MarkPlaceholder d={d} size={46 * u} name={mark} />
      </div>
    </AbsoluteFill>
  );
};
