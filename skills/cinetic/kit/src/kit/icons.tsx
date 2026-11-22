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
  shadow = '0 10px 30px -10px rgba(0,0,0,.35)',
}) => (
  <div style={{ width: size, height: size, borderRadius: radius ?? size * 0.26, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow, flexShrink: 0 }}>
    <Brand name={name} size={size * 0.56} color={color} file={file} />
  </div>
);

/** An interface icon from Lucide by its component name: Search, Calendar, Check, Sparkles, Mail, ... (lucide.dev/icons). */
export const Icon: React.FC<{ name: string; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({ name, size = 28, color = 'currentColor', stroke = 2, style }) => {
  const C = (lucide as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>>)[name];
  if (!C) throw new Error(`No Lucide icon "${name}" (see lucide.dev/icons)`);
  return <C size={size} color={color} strokeWidth={stroke} style={style} />;
};
