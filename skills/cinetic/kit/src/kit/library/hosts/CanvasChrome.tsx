// CanvasChrome (host, idle): the fixed floating chrome of a design-canvas app (file pill, people, tool rail, zoom)
// over its moving canvas.
// Numbers: floating panels, 25 px text; the chrome stays fixed while the canvas moves.
// Caution: this is the product's chrome, so its colours are the film's; for Figma itself show the real mark.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';
import { Icon } from '../../icons';
import { mixColor } from '../../type';
import { softShadow } from '../../world';
import { HOST_FONT } from './_shared';

export type CanvasColours = { ground: string; surface: string; ink: string; muted: string; line: string; accent: string; accentPale: string; font: string };

/**
 * CanvasChrome: the fixed chrome of a design-canvas app over its moving canvas, in floating panels: the file pill
 * (mark, product, path, file), the people and an action (a sync or share button) at the top right, the tool rail (left,
 * or a bar at the bottom centre the way current design tools set it), the zoom at the bottom right. The product's own
 * look: pass its colours and mark. Sizes are screen px at `size` (the text size, default 25).
 */
export const CanvasChrome: React.FC<{
  mark?: React.ReactNode;
  product: string;
  path?: string[];
  file: string;
  people?: Array<{ initials: string; color: string }>;
  action?: { label: string; icon?: React.ReactNode; dark?: boolean };
  tools?: string[];
  activeTool?: number;
  toolbar?: 'left' | 'bottom';
  zoom?: number;
  colours?: Partial<CanvasColours>;
  size?: number;
  w?: number;
  h?: number;
}> = ({ mark, product, path = [], file, people = [], action, tools = ['MousePointer2', 'Frame', 'Square', 'PenTool', 'Type', 'MessageCircle'], activeTool = 0, toolbar = 'left', zoom = 1, colours, size = 25, w = 1920, h = 1080 }) => {
  const C: CanvasColours = { ground: '#F4F5F7', surface: '#FFFFFF', ink: '#15171C', muted: '#5D6470', line: 'rgba(21,23,28,0.10)', accent: '#0D99FF', accentPale: '#E5F4FF', font: HOST_FONT, ...colours };
  const k = size / 25;
  const pill: React.CSSProperties = { position: 'absolute', display: 'flex', alignItems: 'center', gap: 14 * k, height: 64 * k, padding: `0 ${22 * k}px`, borderRadius: 20 * k, background: C.surface, border: `1.5px solid ${C.line}`, boxShadow: softShadow(2, C.ground), fontFamily: C.font, fontSize: size, color: C.ink, boxSizing: 'border-box', whiteSpace: 'nowrap' };
  const toolBtn = (n: string, i: number) => (
    <div key={n} style={{ width: 44 * k, height: 44 * k, borderRadius: 12 * k, background: i === activeTool ? C.accentPale : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={n} size={26 * k} color={i === activeTool ? C.accent : C.muted} stroke={2} />
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, pointerEvents: 'none' }}>
      <div style={{ ...pill, left: 40 * k, top: 36 * k }}>
        {mark}
        <span style={{ fontWeight: 640 }}>{product}</span>
        {path.map((s) => (
          <React.Fragment key={s}>
            <span style={{ color: mixColor(C.muted, C.surface, 0.45) }}>/</span>
            <span style={{ color: C.muted }}>{s}</span>
          </React.Fragment>
        ))}
        <span style={{ color: mixColor(C.muted, C.surface, 0.45) }}>/</span>
        <span style={{ fontWeight: 560 }}>{file}</span>
      </div>
      {(people.length > 0 || action) && (
        <div style={{ ...pill, right: 40 * k, top: 36 * k, gap: 10 * k, paddingRight: 10 * k }}>
          {people.map((pp, i) => (
            <div key={pp.initials} style={{ width: 40 * k, height: 40 * k, borderRadius: 40 * k, background: pp.color, color: '#FFFFFF', fontSize: 17 * k, fontWeight: 620, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: i ? -16 * k : 0, border: `${2.5 * k}px solid ${C.surface}` }}>
              {pp.initials}
            </div>
          ))}
          {action && (
            <span style={{ marginLeft: 8 * k, display: 'inline-flex', alignItems: 'center', gap: 8 * k, padding: `${10 * k}px ${18 * k}px`, borderRadius: 14 * k, background: action.dark === false ? C.accent : C.ink, color: '#FFFFFF', fontWeight: 600, fontSize: 23 * k }}>
              {action.icon}
              {action.label}
            </span>
          )}
        </div>
      )}
      {toolbar === 'left' ? (
        <div style={{ ...pill, left: 40 * k, top: h / 2 - (tools.length * 66 * k) / 2, height: 'auto', flexDirection: 'column', padding: `${16 * k}px ${12 * k}px`, gap: 22 * k }}>{tools.map(toolBtn)}</div>
      ) : (
        <div style={{ ...pill, left: w / 2 - (tools.length * 54 * k + 24 * k) / 2, bottom: 36 * k, gap: 10 * k, padding: `0 ${12 * k}px` }}>{tools.map(toolBtn)}</div>
      )}
      <div style={{ ...pill, right: 40 * k, bottom: 36 * k, height: 54 * k, fontSize: 23 * k, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
        <Icon name="Minus" size={20 * k} color={C.muted} stroke={2.2} />
        {Math.round(zoom * 100)}%
        <Icon name="Plus" size={20 * k} color={C.muted} stroke={2.2} />
      </div>
    </div>
  );
};
