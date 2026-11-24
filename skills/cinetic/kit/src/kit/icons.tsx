// Real marks and real interface icons. Never draw a look-alike of a company's logo.
//
//   <Brand name="claude" />  a company or product mark. From public/logos when fetched in its newest official form by
//                            scripts/logos.mjs (pass file=), else from Simple Icons (CC0 data; the marks stay
//                            trademarks of their owners) in the brand's own colour.
//   <Icon name="Search" />   an interface glyph from Lucide (ISC) for rows, buttons and chips.
import React from 'react';
import * as si from 'simple-icons';
import * as lucide from 'lucide-react';
import { Img, staticFile } from 'remotion';
import { fromLab, mixLab, parseColor, softShadow, toLab } from './world';

type SimpleIcon = { title: string; hex: string; path: string; slug: string };

const bySlug = (() => {
  const m = new Map<string, SimpleIcon>();
  for (const v of Object.values(si) as unknown[]) {
    const ic = v as SimpleIcon;
    if (ic && typeof ic === 'object' && 'slug' in ic && 'path' in ic) m.set(ic.slug, ic);
  }
  return m;
})();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/\./g, 'dot')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

export const Brand: React.FC<{
  name: string;
  size?: number;
  /** 'brand' = the mark's own colour; any CSS colour = mono in that colour. */
  color?: 'brand' | string;
  /** An official file under public/ (from `node scripts/logos.mjs get <name> --film .`), e.g. 'logos/openai.svg'. */
  file?: string;
  style?: React.CSSProperties;
}> = ({ name, size = 64, color = 'brand', file, style }) => {
  if (file) return <Img src={staticFile(file)} style={{ width: size, height: size, objectFit: 'contain', ...style }} />;
  const ic = bySlug.get(slugify(name));
  if (!ic) {
    throw new Error(`No Simple Icons mark for "${name}". Fetch the official file: node scripts/logos.mjs get ${name} --film . then pass file="logos/<slug>.svg".`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} role="img" aria-label={ic.title}>
      <path d={ic.path} fill={color === 'brand' ? `#${ic.hex}` : color} />
    </svg>
  );
};

/** The brand's own colour (for tiles and glows behind a mark). */
export const brandHex = (name: string) => {
  const ic = bySlug.get(slugify(name));
  return ic ? `#${ic.hex}` : undefined;
};

/** A mark on a rounded tile, like an app icon or an integration chip. */
export const BrandTile: React.FC<{ name: string; size?: number; bg?: string; color?: 'brand' | string; file?: string; radius?: number; shadow?: string }> = ({
  name,
  size = 96,
  bg = '#FFFFFF',
  color = 'brand',
  file,
  radius,
  shadow = softShadow(2),
}) => (
  <div style={{ width: size, height: size, borderRadius: radius ?? size * 0.26, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow, flexShrink: 0 }}>
    <Brand name={name} size={size * 0.56} color={color} file={file} />
  </div>
);

/** An interface icon from Lucide by its component name: Search, Calendar, Check, Mail, ... (lucide.dev/icons). */
export const Icon: React.FC<{ name: string; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({ name, size = 28, color = 'currentColor', stroke = 2, style }) => {
  const C = (lucide as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>>)[name];
  if (!C) throw new Error(`No Lucide icon "${name}" (see lucide.dev/icons)`);
  return <C size={size} color={color} strokeWidth={stroke} style={style} />;
};

/** A squircle (superellipse, |x|^n + |y|^n = 1) path in a box from 0 to `s`: the continuous corner of a real app icon. */
export const squirclePath = (s: number, n = 5, steps = 160) => {
  const r = s / 2;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const si = Math.sin(t);
    const x = r + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = r + r * Math.sign(si) * Math.abs(si) ** (2 / n);
    pts.push(`${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
};

let iconSeq = 0;
/**
 * An app icon: a squircle tile (a true superellipse) with a two-stop gradient (`colors`: top, bottom, blended in OKLab),
 * a soft top highlight, a 1 px lit rim inside the top edge and a darker one below, a soft drop shadow tinted to the
 * tile's own colour, and a glyph in the middle (`glyph`: any node, drawn at about half the tile; a Lucide <Icon>, a
 * product mark, a drawn SVG). `gloss` (0-1, default 0.6) is the strength of the highlight, `depth` (0-1, default 1) of
 * the shadow, `rim` turns the edge lines off. Light from above, like every shadow in the kit.
 */
export const AppIcon: React.FC<{
  size?: number;
  colors?: [string, string] | string[];
  glyph?: React.ReactNode;
  gloss?: number;
  depth?: number;
  rim?: boolean;
  style?: React.CSSProperties;
}> = ({ size = 160, colors = ['#4A4D57', '#1C1D22'], glyph, gloss = 0.6, depth = 1, rim = true, style }) => {
  const [idRef] = React.useState(() => `aico${++iconSeq}`);
  const id = idRef;
  const c0 = colors[0];
  const c1 = colors[1] ?? colors[0];
  const mid = mixLab(c0, c1, 0.5);
  const d = squirclePath(100);
  const px = 100 / size; // one screen pixel in the tile's units
  // the shadow's colour: the tile's own hue, deep
  const [L, A, B] = toLab(parseColor(c1) ?? [0, 0, 0]);
  const sh = fromLab([Math.min(0.3, L * 0.45), A * 0.8, B * 0.8]).join(',');
  const lumTop = (toLab(parseColor(c0) ?? [0, 0, 0])[0]);
  const dark = lumTop < 0.75;
  const shadowLayer = (dy: number, blur: number, a: number, k: number) => (
    <svg key={k} width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: size * dy, filter: `blur(${(size * blur).toFixed(2)}px)`, overflow: 'visible' }}>
      <path d={d} fill={`rgba(${sh},${(a * depth).toFixed(3)})`} transform={`translate(${50 * (1 - (1 - dy * 0.6))} 0) scale(${1 - dy * 0.6} 1)`} />
    </svg>
  );
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      {depth > 0 && [shadowLayer(0.012, 0.012, 0.32, 0), shadowLayer(0.045, 0.05, 0.2, 1), shadowLayer(0.1, 0.11, 0.16, 2)]}
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c0} />
            <stop offset="0.5" stopColor={mid} />
            <stop offset="1" stopColor={c1} />
          </linearGradient>
          {/* the highlight: light from above falling across the upper half, strongest at the top edge */}
          <radialGradient id={`${id}h`} cx="50" cy="-8" r="78" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity={0.34 * gloss} />
            <stop offset="0.55" stopColor="#fff" stopOpacity={0.08 * gloss} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.55 : 0.85} />
            <stop offset="0.35" stopColor="#fff" stopOpacity={0.06} />
            <stop offset="0.75" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={dark ? 0.28 : 0.14} />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <path d={d} />
          </clipPath>
        </defs>
        <path d={d} fill={`url(#${id}f)`} />
        {gloss > 0 && <path d={d} fill={`url(#${id}h)`} />}
        {rim && (
          <g clipPath={`url(#${id}c)`}>
            {/* 1 px inside the edge: lit along the top, a shade along the bottom */}
            <path d={d} fill="none" stroke={`url(#${id}r)`} strokeWidth={px * 2.2} />
            {/* the outline that keeps a light tile crisp on a light ground */}
            <path d={d} fill="none" stroke={`rgba(${sh},${dark ? 0.35 : 0.16})`} strokeWidth={px * 1.1} />
          </g>
        )}
      </svg>
      {glyph !== undefined && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // the glyph sits IN the tile: a small soft shadow of the tile's own hue under it
            filter: `drop-shadow(0 ${(size * 0.012).toFixed(2)}px ${(size * 0.018).toFixed(2)}px rgba(${sh},${dark ? 0.35 : 0.18}))`,
          }}
        >
          {glyph}
        </div>
      )}
    </div>
  );
};
