// Product UI, built in code at film size. Real strings, real icons, generous padding, one radius family.
// Each piece arrives on its own (springs and expo-out), and a real arrow pointer drives it.
import React from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { at, clamp, ease, mix, springAt, springs, type Ease } from './motion';
import { useTyped } from './type';
import { Brand } from './icons';
import { softShadow } from './world';

export type Theme = {
  /** Card surface and its text. */
  surface: string;
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Hairlines and fills behind controls. */
  line: string;
  fill: string;
  /** The product's accent (one colour). */
  accent: string;
  accentInk: string;
  radius: number;
  font: string;
  mono: string;
  /** Card shadow: big, soft, low-opacity. */
  shadow: string;
};

export const lightUI: Theme = {
  surface: '#FFFFFF',
  ink: '#0E1116',
  muted: '#6B7280',
  line: 'rgba(15,23,42,0.08)',
  fill: '#F3F4F6',
  // the ink until the film sets its brand's accent: a generic blue is the default of every template
  accent: '#0E1116',
  accentInk: '#FFFFFF',
  radius: 22,
  font: 'Inter Variable, Inter, system-ui, sans-serif',
  mono: 'Geist Mono Variable, ui-monospace, monospace',
  // layered, tinted, one light from above (softShadow); for another ground: `shadow: softShadow(3, GROUND)`
  shadow: `inset 0 1px 0 rgba(255,255,255,.9), ${softShadow(3, '#F2F3F5')}`,
};

export const darkUI: Theme = {
  surface: '#15171C',
  ink: '#F4F5F7',
  muted: '#9097A3',
  line: 'rgba(255,255,255,0.08)',
  fill: '#20232A',
  accent: '#F4F5F7',
  accentInk: '#0E1116',
  radius: 22,
  font: 'Inter Variable, Inter, system-ui, sans-serif',
  mono: 'Geist Mono Variable, ui-monospace, monospace',
  shadow: `inset 0 1px 0 rgba(255,255,255,.10), 0 0 0 1px rgba(255,255,255,.06), ${softShadow(3, '#0B0C0F')}`,
};

/**
 * Arrival transform for any UI element: rises 40 px, scales from 0.94, de-blurs, springs in.
 * `pop` = smaller and bouncier (chips, badges). Use the returned style on a wrapper.
 */
export const useArrive = (start: number, kind: 'card' | 'pop' | 'ui' | 'heavy' = 'card', from: { y?: number; scale?: number; blur?: number; x?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, start, springs[kind]);
  const y = from.y ?? (kind === 'pop' ? 12 : 40);
  const s = from.scale ?? (kind === 'pop' ? 0.6 : 0.94);
  const b = from.blur ?? (kind === 'pop' ? 0 : 8);
  const x = from.x ?? 0;
  return {
    p,
    style: {
      opacity: clamp(p * 2.2),
      transform: `translate(${mix(p, x, 0)}px, ${mix(p, y, 0)}px) scale(${mix(p, s, 1)})`,
      filter: b && p < 0.98 ? `blur(${mix(clamp(p * 1.3), b, 0)}px)` : undefined,
    } as React.CSSProperties,
  };
};

export const Card: React.FC<{
  t: Theme;
  w?: number;
  h?: number;
  pad?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  glass?: boolean;
}> = ({ t, w, h, pad = 28, children, style, glass }) => (
  <div
    style={{
      width: w,
      height: h,
      padding: pad,
      borderRadius: t.radius,
      background: glass ? 'rgba(255,255,255,0.14)' : t.surface,
      backdropFilter: glass ? 'blur(24px) saturate(1.4)' : undefined,
      border: glass ? '1px solid rgba(255,255,255,0.35)' : `1px solid ${t.line}`,
      boxShadow: t.shadow,
      color: t.ink,
      fontFamily: t.font,
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);

/** An app window with traffic lights and an optional title or URL. */
export const Window: React.FC<{ t: Theme; w: number; h: number; title?: string; children?: React.ReactNode; style?: React.CSSProperties; bar?: number }> = ({
  t,
  w,
  h,
  title,
  children,
  style,
  bar = 52,
}) => (
  <div style={{ width: w, height: h, borderRadius: t.radius, background: t.surface, boxShadow: t.shadow, overflow: 'hidden', border: `1px solid ${t.line}`, fontFamily: t.font, color: t.ink, ...style }}>
    <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: 9, padding: '0 20px', borderBottom: `1px solid ${t.line}` }}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
        <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
      ))}
      {title && (
        <div style={{ flex: 1, textAlign: 'center', marginRight: 66, fontSize: 22, color: t.muted, fontWeight: 500 }}>
          {title}
        </div>
      )}
    </div>
    <div style={{ position: 'relative', height: h - bar }}>{children}</div>
  </div>
);

/** A chat message. `from='me'` sits right in the accent, else left on the surface. Arrives with a spring from its corner. */
export const Bubble: React.FC<{ t: Theme; from?: 'me' | 'them'; start: number; children: React.ReactNode; maxW?: number; size?: number }> = ({
  t,
  from = 'them',
  start,
  children,
  maxW = 720,
  size = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, start, springs.card);
  const me = from === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: maxW,
          padding: `${size * 0.62}px ${size * 0.85}px`,
          borderRadius: size * 1.05,
          borderBottomRightRadius: me ? size * 0.3 : size * 1.05,
          borderBottomLeftRadius: me ? size * 1.05 : size * 0.3,
          background: me ? t.accent : t.surface,
          color: me ? t.accentInk : t.ink,
          fontFamily: t.font,
          fontSize: size,
          lineHeight: 1.35,
          boxShadow: me ? 'none' : t.shadow,
          border: me ? 'none' : `1px solid ${t.line}`,
          transformOrigin: me ? '100% 100%' : '0% 100%',
          transform: `scale(${mix(p, 0.6, 1)}) translateY(${mix(p, 20, 0)}px)`,
          opacity: clamp(p * 2.5),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Three dots that bounce while the other side is "thinking". */
export const Thinking: React.FC<{ color?: string; size?: number }> = ({ color = '#9CA3AF', size = 12 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', gap: size * 0.6, alignItems: 'center', height: size * 2 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: size, background: color, transform: `translateY(${Math.sin((frame - i * 4) / 4) * size * 0.35}px)`, opacity: 0.5 + 0.5 * Math.max(0, Math.sin((frame - i * 4) / 4)) }} />
      ))}
    </div>
  );
};

/** An input bar (search / prompt) with typed text, a caret, and a send button that lights up when text exists. */
export const InputBar: React.FC<{
  t: Theme;
  text: string;
  start: number;
  w?: number;
  size?: number;
  placeholder?: string;
  cps?: number;
  leading?: React.ReactNode;
  sendIcon?: React.ReactNode;
  /** Frame the send button is pressed (it dips and flashes). */
  sendAt?: number;
  style?: React.CSSProperties;
  /** @deprecated The rest landing at once reads as a jump: type at a believable speed, or show a prefix as typed. */
  burst?: number | string;
}> = ({ t, text, start, w = 1100, size = 34, placeholder = 'Ask anything', cps = 17, leading, sendIcon, sendAt, style, burst }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shown, done, doneAt } = useTyped(text, start, cps, 3, burst);
  const blink = !done || Math.floor((frame - doneAt) / (fps * 0.5)) % 2 === 0;
  const hasText = shown.length > 0;
  const press = sendAt !== undefined ? at(frame, sendAt, 4, ease.out) - at(frame, sendAt + 4, 10, ease.out) : 0;
  return (
    <div
      style={{
        width: w,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.5,
        padding: `${size * 0.55}px ${size * 0.55}px ${size * 0.55}px ${size * 0.8}px`,
        borderRadius: size * 1.2,
        background: t.surface,
        border: `1px solid ${t.line}`,
        boxShadow: t.shadow,
        fontFamily: t.font,
        fontSize: size,
        color: t.ink,
        ...style,
      }}
    >
      {leading}
      <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {hasText ? shown : <span style={{ color: t.muted }}>{placeholder}</span>}
        <span style={{ display: 'inline-block', width: 3, height: size * 1.05, marginLeft: 2, transform: `translateY(${size * 0.17}px)`, background: t.accent, opacity: frame >= start - 8 && blink && !(sendAt && frame >= sendAt) ? 1 : 0, borderRadius: 2 }} />
      </div>
      <div
        style={{
          width: size * 1.6,
          height: size * 1.6,
          borderRadius: size,
          background: hasText ? t.accent : t.fill,
          color: hasText ? t.accentInk : t.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${1 - press * 0.12})`,
          flexShrink: 0,
        }}
      >
        {sendIcon ?? (
          <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        )}
      </div>
    </div>
  );
};

/** The arrow pointer. Path through points, arcing (never a straight line), easing in-out; presses dip it. */
export type CursorKey = { f: number; x: number; y: number; curve?: Ease };

export const cursorAt = (frame: number, keys: CursorKey[]) => {
  if (frame <= keys[0].f) return { x: keys[0].x, y: keys[0].y, v: 0 };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      const raw = (frame - a.f) / Math.max(1, b.f - a.f);
      const p = (b.curve ?? ease.inOut)(raw);
      // a gentle arc: offset perpendicular to the path, peaking mid-way
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.sin(p * Math.PI) * Math.min(80, len * 0.12);
      return { x: mix(p, a.x, b.x) + (-dy / len) * bow, y: mix(p, a.y, b.y) + (dx / len) * bow, v: len / Math.max(1, b.f - a.f) };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l.x, y: l.y, v: 0 };
};

export const Cursor: React.FC<{
  keys: CursorKey[];
  clicks?: number[];
  size?: number;
  start?: number;
  exitAt?: number;
  color?: string;
  outline?: string;
  /** While dragging (from..to), the pointer rides the dragged object's own path. */
  follow?: { from: number; to: number; at: (frame: number) => { x: number; y: number } };
}> = ({
  keys,
  follow,
  clicks = [],
  size = 46,
  start = 0,
  exitAt,
  color = '#0B0B0C',
  outline = '#FFFFFF',
}) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  // leaving: it accelerates off toward the bottom-right edge over 12 frames, never just vanishes
  if (exitAt !== undefined && frame >= exitAt + 12) return null;
  const dragging = follow && frame >= follow.from && frame <= follow.to;
  const k = dragging && follow ? { ...follow.at(frame), v: 2 } : cursorAt(frame, keys);
  const { x: cx, y: cy, v } = k;
  // alive at rest: a 2-3 px idle drift; leans a few degrees into fast travel
  const x = cx + (v < 0.5 ? Math.sin(frame / 11) * 2.2 : 0);
  const y = cy + (v < 0.5 ? Math.cos(frame / 13) * 1.6 : 0);
  const tilt = Math.max(-8, Math.min(8, v * 0.35));
  let press = 0;
  for (const c of clicks) press = Math.max(press, at(frame, c - 3, 3, ease.out) - at(frame, c, 8, ease.out));
  const appear = at(frame, start, 8, ease.out);
  const gone = exitAt !== undefined ? at(frame, exitAt, 12, ease.in) : 0;
  return (
    <div style={{ position: 'absolute', left: x + gone * 700, top: y + gone * 500, transform: `rotate(${-tilt}deg) scale(${mix(appear, 0.6, 1) * (1 - press * 0.16)})`, transformOrigin: '4px 4px', opacity: appear, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.28))', zIndex: 100 }}>
      <svg width={size} height={size * 1.2} viewBox="0 0 20 24">
        <path d="M2 1.5 L2 19.5 L6.6 15.4 L9.6 22.3 L12.9 20.9 L9.9 14.1 L16.3 14.1 Z" fill={color} stroke={outline} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** A button that presses: dips 6 % at `pressAt`, its fill flashing toward the accent. */
export const Button: React.FC<{ t: Theme; label: React.ReactNode; pressAt?: number; size?: number; primary?: boolean; style?: React.CSSProperties; icon?: React.ReactNode }> = ({
  t,
  label,
  pressAt,
  size = 26,
  primary = true,
  style,
  icon,
}) => {
  const frame = useCurrentFrame();
  const press = pressAt === undefined ? 0 : at(frame, pressAt - 2, 3, ease.out) - at(frame, pressAt + 1, 10, ease.out);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        padding: `${size * 0.62}px ${size * 1.1}px`,
        borderRadius: size * 0.7,
        background: primary ? t.accent : t.fill,
        color: primary ? t.accentInk : t.ink,
        fontFamily: t.font,
        fontWeight: 600,
        fontSize: size,
        transform: `scale(${1 - press * 0.06})`,
        boxShadow: primary ? `0 8px 24px -8px ${t.accent}` : 'none',
        filter: press > 0 ? `brightness(${1 + press * 0.15})` : undefined,
        ...style,
      }}
    >
      {icon}
      {label}
    </div>
  );
};

/** A list row: icon tile, title, subtitle, trailing value. For inboxes, tasks, files, results. */
export const Row: React.FC<{ t: Theme; icon?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; trail?: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  t,
  icon,
  title,
  sub,
  trail,
  size = 30,
  style,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.75, padding: `${size * 0.6}px ${size * 0.7}px`, fontFamily: t.font, color: t.ink, ...style }}>
    {icon && (
      <div style={{ width: size * 2, height: size * 2, borderRadius: size * 0.55, background: t.fill, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: size, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {sub && <div style={{ fontSize: size * 0.78, color: t.muted, marginTop: size * 0.15, whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
    {trail && <div style={{ fontSize: size * 0.85, color: t.muted, fontVariantNumeric: 'tabular-nums' }}>{trail}</div>}
  </div>
);

/** A pill/chip: icon + label. For tags, integrations, statuses. */
export const Chip: React.FC<{ t: Theme; children: React.ReactNode; icon?: React.ReactNode; size?: number; tone?: 'surface' | 'accent' | 'fill'; style?: React.CSSProperties }> = ({
  t,
  children,
  icon,
  size = 26,
  tone = 'surface',
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.45,
      padding: `${size * 0.42}px ${size * 0.8}px ${size * 0.42}px ${icon ? size * 0.55 : size * 0.8}px`,
      borderRadius: 999,
      background: tone === 'accent' ? t.accent : tone === 'fill' ? t.fill : t.surface,
      color: tone === 'accent' ? t.accentInk : t.ink,
      border: tone === 'surface' ? `1px solid ${t.line}` : 'none',
      boxShadow: tone === 'surface' ? t.shadow : 'none',
      fontFamily: t.font,
      fontSize: size,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {icon}
    {children}
  </div>
);

/** A notification toast that drops in from the top with a spring. */
export const Toast: React.FC<{ t: Theme; start: number; icon?: React.ReactNode; title: string; body?: string; w?: number }> = ({ t, start, icon, title, body, w = 680 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, start, springs.card);
  return (
    <div style={{ transform: `translateY(${mix(p, -60, 0)}px) scale(${mix(p, 0.9, 1)})`, opacity: clamp(p * 2) }}>
      <Card t={t} w={w} pad={20} style={{ borderRadius: t.radius * 1.1, display: 'flex', gap: 16, alignItems: 'center' }}>
        {icon && <div style={{ width: 52, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.fill, flexShrink: 0 }}>{icon}</div>}
        <div>
          <div style={{ fontWeight: 600, fontSize: 28 }}>{title}</div>
          {body && <div style={{ fontSize: 24, color: t.muted, marginTop: 4 }}>{body}</div>}
        </div>
      </Card>
    </div>
  );
};

/** A terminal: lines appear on their frames; a line can be typed (prompt) or printed (output). */
export const Terminal: React.FC<{
  t: Theme;
  w: number;
  h: number;
  lines: Array<{ f: number; text: string; kind?: 'cmd' | 'out' | 'ok' | 'dim'; cps?: number }>;
  size?: number;
  title?: string;
  /** false: no window chrome (a full-frame terminal for macro shots). */
  chrome?: boolean;
}> = ({ t, w, h, lines, size = 28, title, chrome = true }) => {
  const frame = useCurrentFrame();
  const body = (children: React.ReactNode) =>
    chrome ? (
      <Window t={{ ...t, surface: '#0C0D10', ink: '#E8EAEE', line: 'rgba(255,255,255,.08)' }} w={w} h={h} title={title}>
        {children}
      </Window>
    ) : (
      <div style={{ width: w, height: h, background: '#0C0D10', borderRadius: t.radius, overflow: 'hidden' }}>{children}</div>
    );
  return body(
    <>
      <div style={{ padding: 28, fontFamily: t.mono, fontSize: size, lineHeight: 1.6, color: '#E8EAEE' }}>
        {lines.map((l, i) => {
          if (frame < l.f) return null;
          if (l.kind === 'cmd') return <TermCmd key={i} text={l.text} start={l.f} cps={l.cps ?? 22} accent={t.accent} />;
          const color = l.kind === 'ok' ? t.accent : l.kind === 'dim' ? '#7C8391' : '#C9CDD5';
          const p = at(frame, l.f, 6, ease.out);
          return (
            <div key={i} style={{ color, opacity: p, transform: `translateY(${mix(p, 6, 0)}px)`, whiteSpace: 'pre' }}>
              {l.text}
            </div>
          );
        })}
      </div>
    </>,
  );
};

const TermCmd: React.FC<{ text: string; start: number; cps: number; accent: string }> = ({ text, start, cps, accent }) => {
  const { shown, done } = useTyped(text, start, cps);
  return (
    <div style={{ whiteSpace: 'pre' }}>
      <span style={{ color: accent }}>❯ </span>
      {shown}
      {!done && <span style={{ background: '#E8EAEE', color: '#0C0D10' }}> </span>}
    </div>
  );
};

/** A progress bar that fills with an ease (never linear unless it is a real rate). */
export const Progress: React.FC<{ t: Theme; start: number; dur: number; w?: number; h?: number; curve?: Ease }> = ({ t, start, dur, w = 400, h = 10, curve = ease.inOut }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, curve);
  return (
    <div style={{ width: w, height: h, borderRadius: h, background: t.fill, overflow: 'hidden' }}>
      <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: h, background: t.accent }} />
    </div>
  );
};

/** A round avatar with initials (or an image). */
export const Avatar: React.FC<{ name: string; color: string; size?: number; src?: string; ring?: string }> = ({ name, color, size = 48, src, ring }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size,
      background: src ? `url(${src}) center/cover` : color,
      color: 'white',
      fontWeight: 600,
      fontSize: size * 0.42,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter Variable, sans-serif',
      boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
      flexShrink: 0,
    }}
  >
    {!src && name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
  </div>
);

/**
 * A chat anchored to the bottom: each message cuts on at full opacity below its slot and rises into place while the
 * older ones move up; messages that rise past `fadeAbove` px from the bottom blur and fade (recency). Pass the
 * messages in order with their frames. Height of a message is estimated from its text (or pass `h`).
 */
export const ChatStack: React.FC<{
  t: Theme;
  msgs: Array<{ f: number; from?: 'me' | 'them'; text?: React.ReactNode; node?: React.ReactNode; h?: number }>;
  w?: number;
  bottom?: number;
  size?: number;
  gap?: number;
  fadeAbove?: number;
}> = ({ t, msgs, w = 1100, bottom = 860, size = 30, gap = 18, fadeAbove = 620 }) => {
  const frame = useCurrentFrame();
  const est = (m: (typeof msgs)[number]) => m.h ?? (typeof m.text === 'string' ? Math.ceil((m.text.length * size * 0.52) / (w * 0.62)) * size * 1.35 + size * 1.3 : size * 3);
  // cumulative lift: every later message pushes the earlier ones up by its height, easing over 10 frames
  return (
    <div style={{ position: 'absolute', left: 960 - w / 2, top: 0, width: w, height: 1080 }}>
      {msgs.map((m, i) => {
        if (frame < m.f) return null;
        let lift = 0;
        for (let j = i + 1; j < msgs.length; j++) lift += (est(msgs[j]) + gap) * at(frame, msgs[j].f, 10, ease.out);
        const rise = at(frame, m.f, 14, ease.out);
        const y = bottom - est(m) - lift + mix(rise, 60, 0);
        const above = bottom - y;
        const old = clamp((above - fadeAbove) / 260);
        const me = m.from === 'me';
        return (
          <div key={i} style={{ position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', filter: old > 0 ? `blur(${old * 6}px)` : undefined, opacity: 1 - old * 0.62 }}>
            {m.node ?? (
              <div
                style={{
                  maxWidth: w * 0.68,
                  padding: `${size * 0.6}px ${size * 0.85}px`,
                  borderRadius: size * 1.05,
                  borderBottomRightRadius: me ? size * 0.3 : size * 1.05,
                  borderBottomLeftRadius: me ? size * 1.05 : size * 0.3,
                  background: me ? t.accent : t.surface,
                  color: me ? t.accentInk : t.ink,
                  border: me ? 'none' : `1px solid ${t.line}`,
                  boxShadow: me ? 'none' : t.shadow,
                  fontFamily: t.font,
                  fontSize: size,
                  lineHeight: 1.35,
                }}
              >
                {m.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Focus: isolate one element. Returns a style for the chosen element (lifts, rings, stays sharp) and one for the rest
 * (blur, dim, shrink a little). `p` from at(frame, T.focus, 10).
 */
export const focusStyles = (p: number, accent = '#2F6BFF') => ({
  chosen: {
    transform: `scale(${mix(p, 1, 1.03)})`,
    boxShadow: `0 0 0 ${mix(p, 0, 3)}px ${accent}, 0 0 ${mix(p, 0, 40)}px ${mix(p, 0, 6)}px ${accent}33`,
    position: 'relative',
    zIndex: 5,
  } as React.CSSProperties,
  rest: { filter: `blur(${mix(p, 0, 5)}px)`, opacity: mix(p, 1, 0.35), transform: `scale(${mix(p, 1, 0.98)})` } as React.CSSProperties,
});

/** Where the cursor is (for things that follow it) plus a soft landing shadow for an oversized "hero" cursor. */
export const CursorShadow: React.FC<{ keys: CursorKey[]; size?: number; start?: number; lift?: number }> = ({ keys, size = 46, start = 0, lift = 1 }) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  const { x, y, v } = cursorAt(frame, keys);
  // the shadow sits further away while the cursor travels (it is "in the air") and converges when it lands
  const off = (8 + Math.min(40, v * 1.2)) * lift;
  return (
    <div style={{ position: 'absolute', left: x + off, top: y + off * 1.1, opacity: 0.25, filter: `blur(${4 + off * 0.12}px)`, zIndex: 99 }}>
      <svg width={size} height={size * 1.2} viewBox="0 0 20 24">
        <path d="M2 1.5 L2 19.5 L6.6 15.4 L9.6 22.3 L12.9 20.9 L9.9 14.1 L16.3 14.1 Z" fill="#000" />
      </svg>
    </div>
  );
};

/**
 * A state pill: a label that changes state on a frame (Add -> Added, Connect -> Synced, Pending -> Paid). The swap is a
 * cut with a short scale pop and a colour change, not a tween: state changes read as decisions. `states` in order.
 */
export const StatePill: React.FC<{
  t: Theme;
  states: Array<{ f: number; label: React.ReactNode; bg: string; ink: string; icon?: React.ReactNode }>;
  size?: number;
  style?: React.CSSProperties;
}> = ({ t, states, size = 26, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let i = 0;
  for (let k = 0; k < states.length; k++) if (frame >= states[k].f) i = k;
  const st = states[i];
  const pop = i > 0 ? springAt(frame, fps, st.f, springs.pop) : 1;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.4,
        padding: `${size * 0.42}px ${size * 0.85}px`,
        borderRadius: 999,
        background: st.bg,
        color: st.ink,
        fontFamily: t.font,
        fontWeight: 600,
        fontSize: size,
        whiteSpace: 'nowrap',
        transform: `scale(${mix(pop, 0.86, 1)})`,
        ...style,
      }}
    >
      {st.icon}
      {st.label}
    </div>
  );
};

/**
 * Working -> done: an arc that steps round 45 degrees a frame (a stepped clock reads digital and alive), then closes into
 * a circle and becomes a check at `doneAt`. Pair the done frame with a tick sound and a weight step on the row's text.
 */
export const Spinner: React.FC<{ start: number; /** Omit to keep it working. */ doneAt?: number; size?: number; color?: string; done?: string; stroke?: number }> = ({
  start,
  doneAt = Number.POSITIVE_INFINITY,
  size = 34,
  color = '#9CA3AF',
  done = '#111111',
  stroke = 3,
}) => {
  const frame = useCurrentFrame();
  if (frame < start) return <div style={{ width: size, height: size }} />;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  if (frame < doneAt) {
    const rot = Math.floor(frame - start) * 45;
    return (
      <svg width={size} height={size} style={{ transform: `rotate(${rot}deg)` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * 0.72} ${c}`} />
      </svg>
    );
  }
  const close = at(frame, doneAt, 3, ease.out);
  const tick = at(frame, doneAt + 2, 6, ease.out);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r + stroke / 2} fill={done} opacity={close} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <path
        d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.44} ${size * 0.66} L ${size * 0.72} ${size * 0.36}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={size}
        strokeDashoffset={size * (1 - tick)}
      />
    </svg>
  );
};

/**
 * A wall of many: the same kind of thing in quantity (documents, components, runs, customers' screens), the scale jump
 * that says "all of it". Items fill in from the centre (or a corner) in a fast, compressing wave; pair it with a camera
 * pull-back. `render(i, e)` draws item i at w x h; `e` is the item's progress (0-1) in the `event` wave, a second wave
 * from the same origin on which every item does something (flips from sketch to real, takes the accent, lights a line):
 * that is what makes a wall mean something. `start` far in the past shows the wall complete (a match cut into it).
 */
export const Wall: React.FC<{
  cols: number;
  rows: number;
  w: number;
  h: number;
  gap?: number;
  start: number;
  /** Frames for the whole wave. */
  wave?: number;
  from?: 'center' | 'left' | 'top';
  /** The event wave: starts at `at`, crosses the wall in `wave` frames (default 20), each item takes `dur` (default 10). */
  event?: { at: number; wave?: number; dur?: number };
  render: (i: number, e: number) => React.ReactNode;
  style?: React.CSSProperties;
}> = ({ cols, rows, w, h, gap = 24, start, wave = 24, from = 'center', event, render, style }) => {
  const frame = useCurrentFrame();
  const W = cols * w + (cols - 1) * gap;
  const H = rows * h + (rows - 1) * gap;
  const maxD = from === 'center' ? Math.hypot(cols / 2, rows / 2) : from === 'left' ? cols : rows;
  const items: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const d = from === 'center' ? Math.hypot(c + 0.5 - cols / 2, r + 0.5 - rows / 2) : from === 'left' ? c : r;
      const s = start + Math.pow(d / maxD, 0.8) * wave;
      if (frame < s) continue;
      const p = at(frame, s, 10, ease.out);
      const e = event ? at(frame, event.at + Math.pow(d / maxD, 0.8) * (event.wave ?? 20), event.dur ?? 10, ease.inOut) : 0;
      items.push(
        <div key={i} style={{ position: 'absolute', left: c * (w + gap), top: r * (h + gap), width: w, height: h, opacity: clamp(p * 2), transform: `scale(${mix(p, 0.85, 1)})` }}>
          {render(i, e)}
        </div>,
      );
    }
  return <div style={{ position: 'relative', width: W, height: H, ...style }}>{items}</div>;
};

/**
 * The product's artefact landing inside another product: a minimal surface of that product (a chat channel, a tracker,
 * a mailbox, a document) with its real mark in the header. Items arrive on their frames; the item at `landAt` is the
 * product's own (it arrives lit, then settles). Integrations shown as use, not as a row of logos.
 * The surface is deliberately generic in layout (header, mark, rows): never imitate another product's exact interface.
 */
export const PartnerSurface: React.FC<{
  t: Theme;
  brand: string;
  /** Official mark file when Simple Icons lacks it (logos.mjs get <name>). */
  file?: string;
  kind: 'chat' | 'tracker' | 'mail' | 'doc';
  title: string;
  items: Array<{ f: number; who?: string; text: React.ReactNode; meta?: string; color?: string; done?: number; mark?: React.ReactNode }>;
  landAt?: number;
  w?: number;
  h?: number;
  size?: number;
}> = ({ t, brand, file, kind, title, items, landAt, w = 1100, h, size = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Card t={t} w={w} h={h} pad={0} style={{ borderRadius: t.radius * 1.1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: `${size * 0.7}px ${size}px`, borderBottom: `1px solid ${t.line}` }}>
        <Brand name={brand} file={file} size={size * 1.25} />
        <div style={{ fontSize: size * 0.95, fontWeight: 650, letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      <div style={{ padding: `${size * 0.5}px ${size}px`, display: 'flex', flexDirection: 'column', gap: size * 0.45 }}>
        {items.map((it, i) => {
          if (frame < it.f) return null;
          const p = springAt(frame, fps, it.f, springs.card);
          const mine = landAt !== undefined && it.f === landAt;
          const lit = mine ? 1 - at(frame, it.f + 6, 24, ease.inOut) : 0;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: size * 0.55,
                alignItems: kind === 'chat' ? 'flex-start' : 'center',
                padding: `${size * 0.4}px ${size * 0.45}px`,
                borderRadius: t.radius * 0.6,
                background: mine ? `rgba(${hexToRgb(t.accent)}, ${0.06 + 0.12 * lit})` : 'transparent',
                boxShadow: mine ? `0 0 0 ${1 + lit * 2}px rgba(${hexToRgb(t.accent)}, ${0.25 + 0.5 * lit})` : undefined,
                transform: `translateY(${mix(p, 24, 0)}px)`,
                opacity: clamp(p * 2.5),
              }}
            >
              {kind === 'chat' && <Avatar name={it.who ?? '?'} color={it.color ?? '#8A8F98'} size={size * 1.55} />}
              {kind === 'tracker' &&
                (it.done !== undefined && frame >= it.done ? (
                  <Spinner start={it.done - 1} doneAt={it.done} size={size * 0.85} done={it.color ?? t.accent} />
                ) : (
                  <div style={{ width: size * 0.7, height: size * 0.7, borderRadius: size, border: `2.5px solid ${it.color ?? t.muted}`, flexShrink: 0 }} />
                ))}
              {kind === 'mail' && <div style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, background: mine ? t.accent : 'transparent', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                {it.who && kind !== 'tracker' && (
                  <div style={{ fontSize: size * 0.8, fontWeight: 650 }}>
                    {it.who} {it.meta && <span style={{ color: t.muted, fontWeight: 500, fontSize: size * 0.68, marginLeft: 8 }}>{it.meta}</span>}
                  </div>
                )}
                <div style={{ fontSize: size, lineHeight: 1.35, color: t.ink, marginTop: it.who && kind !== 'tracker' ? 2 : 0, display: 'flex', alignItems: 'center', gap: size * 0.35 }}>
                  {it.mark}
                  <span>{it.text}</span>
                </div>
              </div>
              {kind === 'tracker' && it.meta && <div style={{ fontSize: size * 0.75, color: t.muted, fontFamily: t.mono }}>{it.meta}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const hexToRgb = (h: string) => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/**
 * A relay: one artefact (a chip, a line, a chart) pinned at a screen point while the host products change around it on
 * their frames. Each host is a full-frame node in its own composition (full-bleed page, tilted plane, macro crop), drawn
 * behind the artefact; at each cut the artefact settles (a small lift and a shadow that closes in), so it reads as the
 * same object carried through every product. Hosts should pivot their own motion on `anchor` so it never jumps.
 */
export const Relay: React.FC<{
  anchor: { x: number; y: number };
  artefact: React.ReactNode;
  /** `pose`: a CSS transform for the artefact in that host (e.g. 'perspective(1800px) rotateX(18deg)' to ride a tilted plane). */
  hosts: Array<{ f: number; node: React.ReactNode; pose?: string }>;
  /** px the artefact lifts at each cut. */
  lift?: number;
  /**
   * The artefact is born in the beat before: from frame `f` it flies from `from` (its centre and scale where the product
   * made it) to the anchor, landing on the first host's frame. Draw the Relay above the previous scene.
   */
  enter?: { f: number; from: { x: number; y: number; scale?: number } };
  /**
   * The artefact is the thing to read: it spans at least this share of the frame's width (default 0.55) and is scaled up
   * when it is built smaller. 0 turns this off (an artefact that is tall, not wide).
   */
  minWidth?: number;
}> = ({ anchor, artefact, hosts, lift = 14, enter, minWidth = 0.55 }) => {
  const frame = useCurrentFrame();
  const { width: frameW } = useVideoConfig();
  // measure the artefact once, in a hidden copy that is always mounted (every render tab gets the same size)
  const probe = React.useRef<HTMLDivElement>(null);
  const [natural, setNatural] = React.useState(0);
  const [handle] = React.useState(() => delayRender('measure the relay artefact'));
  React.useLayoutEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      if (probe.current) setNatural(probe.current.offsetWidth);
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [handle]);
  const grow = minWidth > 0 && natural > 0 ? Math.max(1, (minWidth * frameW) / natural) : 1;
  const measure = (
    <div ref={probe} style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
      {artefact}
    </div>
  );
  let i = -1;
  for (let k = 0; k < hosts.length; k++) if (frame >= hosts[k].f) i = k;
  if (i < 0) {
    if (!enter || frame < enter.f || !hosts.length) return measure;
    const p = ease.inOut(clamp((frame - enter.f) / Math.max(1, hosts[0].f - enter.f)));
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {measure}
        <div
          style={{
            position: 'absolute',
            left: mix(p, enter.from.x, anchor.x),
            top: mix(p, enter.from.y, anchor.y) - Math.sin(Math.PI * p) * lift * 1.5,
            transform: `translate(-50%, -50%) scale(${mix(p, enter.from.scale ?? 1, 1.05 * grow)})`,
            filter: `drop-shadow(0 ${mix(p, 6, 30)}px ${mix(p, 10, 34)}px rgba(0,0,0,${mix(p, 0.12, 0.3)}))`,
          }}
        >
          {artefact}
        </div>
      </AbsoluteFill>
    );
  }
  const settle = at(frame, hosts[i].f, 10, ease.out);
  return (
    <AbsoluteFill>
      <AbsoluteFill>{hosts[i].node}</AbsoluteFill>
      {measure}
      <div style={{ position: 'absolute', left: anchor.x, top: anchor.y, transform: `translate(-50%, -50%) ${hosts[i].pose ?? ''} translateY(${-lift * (1 - settle)}px) scale(${mix(settle, 1.05, 1) * grow})`, filter: `drop-shadow(0 ${mix(settle, 22, 8)}px ${mix(settle, 30, 12)}px rgba(0,0,0,${mix(settle, 0.18, 0.28)}))`, zIndex: 50 }}>
        {artefact}
      </div>
    </AbsoluteFill>
  );
};

/**
 * A phone, drawn flat and precise: a dark frame with a lit edge, the island, and the screen as a slot for any UI
 * (`children` is laid out at the screen's size, w x w * 2.167). Pose it with a CSS transform or inside a `<Camera>`.
 */
export const Phone: React.FC<{ w?: number; frame?: string; screen?: string; children?: React.ReactNode; style?: React.CSSProperties; ground?: string }> = ({
  w = 520,
  frame = '#111214',
  screen = '#000',
  children,
  style,
  ground,
}) => {
  const b = Math.round(w * 0.028);
  const sw = w - b * 2;
  const sh = Math.round(sw * 2.167);
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: sh + b * 2,
        borderRadius: w * 0.15,
        background: frame,
        boxShadow: `inset 0 0 0 ${Math.max(1, w * 0.004)}px rgba(255,255,255,0.10), inset 0 ${w * 0.006}px 0 rgba(255,255,255,0.08), ${softShadow(Math.min(8, Math.max(2, w / 90)), ground)}`,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', left: b, top: b, width: sw, height: sh, borderRadius: w * 0.125, overflow: 'hidden', background: screen }}>
        {children}
        <div style={{ position: 'absolute', left: '50%', top: sw * 0.03, width: sw * 0.3, height: sw * 0.085, transform: 'translateX(-50%)', borderRadius: 999, background: '#000' }} />
      </div>
    </div>
  );
};

/** A laptop: the screen (w x w * 0.625, `children` at that size) in a thin dark bezel over a flat base. */
export const Laptop: React.FC<{ w?: number; frame?: string; base?: string; screen?: string; children?: React.ReactNode; style?: React.CSSProperties; ground?: string }> = ({
  w = 1280,
  frame = '#141518',
  base = '#C9CBD0',
  screen = '#fff',
  children,
  style,
  ground,
}) => {
  const b = Math.round(w * 0.018);
  const sh = Math.round(w * 0.625);
  return (
    <div style={{ position: 'relative', width: w + b * 2, ...style }}>
      <div style={{ position: 'relative', width: w + b * 2, height: sh + b * 2, borderRadius: `${w * 0.022}px ${w * 0.022}px 0 0`, background: frame, boxShadow: `inset 0 0 0 ${Math.max(1, w * 0.0015)}px rgba(255,255,255,0.12), ${softShadow(Math.min(8, Math.max(2, w / 180)), ground)}` }}>
        <div style={{ position: 'absolute', left: b, top: b, width: w, height: sh, overflow: 'hidden', background: screen, borderRadius: w * 0.004 }}>{children}</div>
      </div>
      <div style={{ position: 'relative', left: -w * 0.06, width: (w + b * 2) * 1.12, height: w * 0.022, borderRadius: `0 0 ${w * 0.02}px ${w * 0.02}px`, background: `linear-gradient(${base}, ${base} 55%, rgba(0,0,0,0.25))`, boxShadow: softShadow(Math.min(6, Math.max(2, w / 260)), ground) }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: w * 0.12, height: w * 0.008, transform: 'translateX(-50%)', borderRadius: `0 0 ${w * 0.008}px ${w * 0.008}px`, background: 'rgba(0,0,0,0.18)' }} />
      </div>
    </div>
  );
};

/**
 * An object-lock swap: the product's artefact stays fixed at one screen point, still, while host scenes hard-cut behind
 * it on the beat (4-6 f each, accelerating; the last held 12-18 f so it reads). Each host pushes in a touch over its own
 * frames (`push`, 0.02 = 2 %); the artefact only creeps 0.5 % across the whole run. `artefact` may be a function of the
 * host index (a plate that re-tints for each ground). One tour of other products a film, at most 15 % of it.
 */
export const LockSwap: React.FC<{
  anchor: { x: number; y: number };
  artefact: React.ReactNode | ((host: number) => React.ReactNode);
  /** Each host's first frame; `end` closes the last one (for its push). */
  hosts: Array<{ f: number; node: React.ReactNode }>;
  end?: number;
  push?: number;
}> = ({ anchor, artefact, hosts, end, push = 0.02 }) => {
  const frame = useCurrentFrame();
  let i = -1;
  for (let k = 0; k < hosts.length; k++) if (frame >= hosts[k].f) i = k;
  if (i < 0 || !hosts.length) return null;
  const last = end ?? hosts[hosts.length - 1].f + 16;
  const next = hosts[i + 1]?.f ?? last;
  const p = clamp((frame - hosts[i].f) / Math.max(1, next - hosts[i].f));
  const creep = 1 + 0.005 * clamp((frame - hosts[0].f) / Math.max(1, last - hosts[0].f));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: `${anchor.x}px ${anchor.y}px`, transform: `scale(${1 + push * p})` }}>{hosts[i].node}</AbsoluteFill>
      <div style={{ position: 'absolute', left: anchor.x, top: anchor.y, transform: `translate(-50%, -50%) scale(${creep})`, zIndex: 50 }}>
        {typeof artefact === 'function' ? artefact(i) : artefact}
      </div>
    </AbsoluteFill>
  );
};
