// HostType (type, build / enter): one statement typed into a prompt field while the product around it changes by hard
// cut every few frames.
// Numbers: 0.62 characters a frame (0.8-1.2 uneven, 1.5x after a space); a new host every 5 f, each pushing in 0.4 %
// a frame.
// Caution: the default hosts are invented; for real products use their real pages and marks, never a look-alike.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { Icon } from '../../icons';
import { mixColor } from '../../type';
import { softShadow } from '../../world';
import { hash } from './_shared';

export type Host = {
  /** The flat ground behind the product. */
  ground: string;
  /** The field's fill, its text colour, its muted colour (placeholder, chips), its outline. */
  card: string;
  ink: string;
  muted: string;
  line?: string;
  /** The send button when the field has text. */
  accent: string;
  accentInk?: string;
  /** The product's name at the top left, and its glyph (a Lucide icon name). */
  app: string;
  glyph?: string;
  /** The heading above the field. */
  title?: string;
  titleInk?: string;
  /** Small text under the heading. */
  sub?: string;
  radius?: number;
  /** Suggestion chips under the field. */
  chips?: string[];
  /** The model or mode pill in the field. */
  mode?: string;
  /** How far the host is pushed in (1 = none). */
  zoom?: number;
  /** A sidebar of recent projects down the left edge. */
  side?: string[];
};

const HOSTS: Host[] = [
  { ground: '#141416', card: '#1F1F22', ink: '#EDEDED', muted: '#8A8A90', line: '#2C2C30', accent: '#F2F2F2', accentInk: '#111', app: 'Pebbleworks', glyph: 'Hexagon', title: 'What should we build today?', titleInk: '#F0F0F0', radius: 26, mode: 'Fast', chips: ['Landing page', 'Habit tracker', 'Invoice tool'], zoom: 1.0 },
  { ground: '#F6F5F2', card: '#FFFFFF', ink: '#1A1A1A', muted: '#9A9A9E', line: '#E4E2DD', accent: '#FF6A3D', app: 'Sprigly', glyph: 'Sprout', title: 'Turn an idea into an app', titleInk: '#1C1C1C', sub: 'Describe it, we build it, you ship it', radius: 18, mode: 'Pro', zoom: 1.38, side: ['New project', 'Recipe box', 'Gym log', 'Portfolio'] },
  { ground: '#FF6A3D', card: '#1D1B1B', ink: '#F4F4F4', muted: '#8C8580', line: '#2E2A28', accent: '#FFFFFF', accentInk: '#1D1B1B', app: 'Kilnly', glyph: 'Flame', title: 'Build the thing you keep imagining', titleInk: '#FFFFFF', radius: 30, chips: ['Web app', 'Mobile', 'Game'], zoom: 1.14 },
  { ground: '#DCEBFA', card: '#FFFFFF', ink: '#14202C', muted: '#93A0AD', line: '#C9DAEA', accent: '#1F6FEB', app: 'Harborline', glyph: 'Anchor', title: 'Describe your idea', titleInk: '#14202C', sub: 'Apps, sites and tools from one sentence', radius: 14, mode: 'Agent', zoom: 1.52 },
  { ground: '#0D1117', card: '#161B22', ink: '#E6EDF3', muted: '#6E7781', line: '#262C36', accent: '#E6EDF3', accentInk: '#0D1117', app: 'Tidewell', glyph: 'Terminal', title: 'Ask anything, ship anything', titleInk: '#E6EDF3', radius: 12, mode: 'Build', chips: ['Dashboard', 'Chat bot', 'Store'], zoom: 1.24, side: ['Workspace', 'Billing app', 'Team wiki', 'Store front', 'Settings'] },
  { ground: '#F1E9DD', card: '#FBF8F3', ink: '#2A2622', muted: '#A39A8E', line: '#E2D7C7', accent: '#2A2622', accentInk: '#FBF8F3', app: 'Quillby', glyph: 'Feather', title: 'Start with one line', titleInk: '#2A2622', radius: 22, mode: 'Draft', zoom: 1.42 },
];

/** Steady typing times: one character every 1/cps frames with a small seeded unevenness, a beat longer after a space. */
const steadyTimes = (text: string, start: number, cps: number, seed: number) => {
  const out: number[] = [];
  let t = start;
  Array.from(text).forEach((ch, i) => {
    out.push(Math.floor(t));
    t += (1 / cps) * (0.8 + hash(i, seed) * 0.4) * (ch === ' ' ? 1.5 : 1);
  });
  return out;
};

/**
 * HostType: one statement typed into a product's prompt field at a steady, believable pace (never a burst), while the
 * product around it changes by hard cut every few frames (a dark app, a light one, a warm one, a code tool): the field
 * stays at the same spot on screen and the text carries on across every cut, so one sentence reads as said
 * everywhere. Each host is a whole product page (name, heading, field with its mode and send button, chips), on a flat
 * ground. Bring your own `hosts` for the products in your film.
 */
export const HostType: React.FC<{
  text: string;
  at?: number;
  /** Characters per frame (default 0.62, about 19 a second). */
  cps?: number;
  /** Frames per host, on average (default 5, seeded between 4 and 6). */
  every?: number;
  hosts?: Host[];
  /** The field's width and its text size. */
  w?: number;
  size?: number;
  x?: number;
  y?: number;
  font?: string;
  seed?: number;
}> = ({ text, at = 0, cps = 0.62, every = 5, hosts = HOSTS, w = 1240, size = 54, x, y, font = fonts.inter, seed = 2 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < at) return null;
  const t = frame - at;
  let k = 0;
  let edge = 0;
  while (true) {
    const len = Math.max(3, Math.round(every * (0.8 + hash(k, seed) * 0.4)));
    if (edge + len > t) break;
    edge += len;
    k++;
  }
  const H = hosts[k % hosts.length];
  const local = t - edge;
  const times = steadyTimes(text, at + 3, cps, seed);
  const shown = times.filter((tt) => frame >= tt).length;
  const typed = text.slice(0, shown);
  const done = shown >= text.length;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2 + 40;
  const fieldH = size * 3.6;
  const z = (H.zoom ?? 1) * (1 + local * 0.004);
  const ax = cx - w / 2 + size * 0.8;
  const ay = cy - fieldH / 2 + size * 1.15;
  const chip = (label: React.ReactNode, key: React.Key, icon?: string, onGround = false) => (
    <div key={key} style={{ height: size * 0.82, padding: `0 ${size * 0.4}px`, borderRadius: size, border: `1.5px solid ${onGround ? mixColor(H.ground, H.titleInk ?? H.ink, 0.3) : H.line ?? H.muted}`, background: onGround ? mixColor(H.ground, H.titleInk ?? H.ink, 0.06) : undefined, display: 'flex', alignItems: 'center', gap: size * 0.18, color: onGround ? H.titleInk ?? H.ink : H.muted, fontFamily: font, fontWeight: 500, fontSize: size * 0.4, whiteSpace: 'pre' }}>
      {icon && <Icon name={icon} size={size * 0.42} color={H.muted} />}
      {label}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: H.ground }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${ax}px ${ay}px`, transform: `scale(${z})` }}>
        {H.side && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 330, background: H.card, borderRight: `1.5px solid ${H.line ?? H.muted}`, paddingTop: 140, boxSizing: 'border-box' }}>
            {H.side.map((s, i) => (
              <div key={i} style={{ margin: '0 22px 8px', padding: '14px 18px', borderRadius: 12, background: i === 0 ? H.ground : 'transparent', fontFamily: font, fontWeight: i === 0 ? 600 : 450, fontSize: 26, color: i === 0 ? H.ink : H.muted, display: 'flex', alignItems: 'center', gap: 14 }}>
                <Icon name={i === 0 ? 'Plus' : 'Folder'} size={24} color={i === 0 ? H.ink : H.muted} />
                {s}
              </div>
            ))}
          </div>
        )}
        {/* the product's own chrome */}
        <div style={{ position: 'absolute', left: 64, top: 48, display: 'flex', alignItems: 'center', gap: 14, fontFamily: font, fontWeight: 600, fontSize: 30, color: H.titleInk ?? H.ink }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: H.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={H.glyph ?? 'Sparkles'} size={26} color={H.accentInk ?? '#FFFFFF'} />
          </div>
          {H.app}
        </div>
        <div style={{ position: 'absolute', right: 64, top: 52, display: 'flex', alignItems: 'center', gap: 18, fontFamily: font, fontWeight: 500, fontSize: 26, color: H.muted }}>
          <span>Docs</span>
          <span>Pricing</span>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: H.line ?? H.muted }} />
        </div>
        {H.title && (
          <div style={{ position: 'absolute', left: cx - w, top: cy - fieldH / 2 - size * (H.sub ? 3.5 : 2.6), width: w * 2, textAlign: 'center', fontFamily: font, fontWeight: 600, fontSize: size * 1.5, letterSpacing: '-0.025em', color: H.titleInk ?? H.ink }}>{H.title}</div>
        )}
        {H.sub && <div style={{ position: 'absolute', left: cx - w, top: cy - fieldH / 2 - size * 1.45, width: w * 2, textAlign: 'center', fontFamily: font, fontWeight: 450, fontSize: size * 0.6, color: H.muted }}>{H.sub}</div>}
        <div style={{ position: 'absolute', left: cx - w / 2, top: cy - fieldH / 2, width: w, height: fieldH, borderRadius: H.radius ?? 18, background: H.card, border: `1.5px solid ${H.line ?? 'transparent'}`, boxShadow: softShadow(3, H.ground), boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', left: size * 0.6, bottom: size * 0.5, display: 'flex', gap: size * 0.25 }}>
            {chip('', 'a', 'Plus')}
            {chip('Attach', 'b', 'Paperclip')}
            {H.mode && chip(H.mode, 'c', 'Zap')}
          </div>
          <div style={{ position: 'absolute', right: size * 0.5, bottom: size * 0.42, width: size * 1.0, height: size * 1.0, borderRadius: '50%', background: typed.length ? H.accent : H.line ?? H.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="ArrowUp" size={size * 0.56} color={typed.length ? H.accentInk ?? '#FFFFFF' : H.muted} />
          </div>
        </div>
        {H.chips && (
          <div style={{ position: 'absolute', left: cx - w / 2, top: cy + fieldH / 2 + size * 0.6, width: w, display: 'flex', justifyContent: 'center', gap: size * 0.3 }}>
            {H.chips.map((c, i) => chip(c, i, undefined, true))}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', left: ax, top: ay - size * 0.6, fontFamily: font, fontWeight: 450, fontSize: size, color: H.ink, whiteSpace: 'pre', lineHeight: 1.2 }}>
        {typed}
        <span style={{ display: 'inline-block', width: 3, height: size * 1.05, marginLeft: 2, verticalAlign: 'text-bottom', background: H.ink, opacity: done && Math.floor(frame / 8) % 2 ? 0 : 1 }} />
        {typed.length === 0 && <span style={{ color: H.muted }}>Describe what you want</span>}
      </div>
    </div>
  );
};
