// VSCodeNotice (host, enter): VS Code's notification toast for the product's message, with its source and buttons.
// Numbers: VS Code px at scale 2; arrives at `at`, its button presses at `pressAt`.
// Caution: one short message; the product's mark only where VS Code allows one.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix } from '../../motion';
import { HOST_FONT, VS_THEMES } from './_shared';

/**
 * VSCodeNotice: a VS Code notification (bottom right of the editor): the info glyph, the message, its source, the
 * buttons (the first one primary). Place it in VSCodeWindow's children; `at` brings it in (rises 12 px over 8 f).
 */
export const VSCodeNotice: React.FC<{ theme?: 'dark' | 'light'; message: string; source: string; buttons?: string[]; at?: number; pressAt?: number; mark?: React.ReactNode; w?: number; style?: React.CSSProperties }> = ({
  theme = 'dark',
  message,
  source,
  buttons = [],
  at: t0 = 0,
  pressAt,
  mark,
  w = 420,
  style,
}) => {
  const frame = useCurrentFrame();
  const th = VS_THEMES[theme];
  const p = at(frame, t0, 8, ease.out);
  const press = pressAt === undefined ? 0 : clamp(at(frame, pressAt - 2, 2) - at(frame, pressAt + 1, 5));
  if (frame < t0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: w,
        background: theme === 'light' ? '#F8F8F8' : '#202020',
        border: `1px solid ${th.border}`,
        borderRadius: 6,
        boxShadow: theme === 'light' ? '0 0 8px 2px rgba(0,0,0,0.16)' : '0 0 8px 2px rgba(0,0,0,0.6)',
        fontFamily: HOST_FONT,
        color: th.fg,
        transform: `translateY(${mix(p, 12, 0)}px)`,
        opacity: clamp(p * 2),
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 8, padding: '10px 10px 4px 10px', fontSize: 13, lineHeight: '18px' }}>
        {mark ?? <Icon name="Info" size={16} color="#3794FF" stroke={2} />}
        <span style={{ flex: 1 }}>{message}</span>
        <Icon name="X" size={14} color={th.dim} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 10px 34px', fontSize: 12, color: th.dim }}>
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Source: {source}</span>
        {buttons.map((b, i) => (
          <span key={b} style={{ height: 24, padding: '0 10px', display: 'inline-flex', alignItems: 'center', borderRadius: 2, fontSize: 12, whiteSpace: 'nowrap', background: i === 0 ? (press > 0 ? '#026EC1' : '#0078D4') : theme === 'light' ? '#E5E5E5' : '#313131', color: i === 0 ? '#FFFFFF' : th.fg, transform: i === 0 ? `scale(${1 - press * 0.05})` : undefined }}>
            {b}
          </span>
        ))}
      </div>
    </div>
  );
};
