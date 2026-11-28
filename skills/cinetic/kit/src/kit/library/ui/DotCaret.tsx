// DotCaret (ui, enter): a dot hovering over a browser toolbar drops into the address field and stretches into the
// text caret; the placeholder and the tab icon go, the field widens and the view pushes in; then a query types.
// Numbers: the dot (1.6 % of the frame height) hovers and sinks 0.4 % over `dropAt`; the drop takes 3 f ease-in,
// stretching 2.2 times tall; on landing it is a caret that thins to 2.5 px in 3 f; placeholder and icon fade in 3 f;
// the field widens 1.7 times over 6 f from +3 f (expo-out) while the whole bar pushes 1 to 1.35 over 8 f; typing at
// the kit's cadence, newest letters in fresh ink.
// Caution: the dot should arrive from what came before (a full stop, a cursor, a ball); one query, short.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix } from '../../motion';
import { typingTimes, useTextWidth } from '../../type';
import { InkTyped, type Look, useUiFrame, withPace } from './_shared';

const DotCaretInner: React.FC<{
  L: Look;
  at: number;
  /** Frames from `at` the dot drops. */
  dropAt?: number;
  /** The query typed after the landing, and the frame (from `at`) it starts. */
  text?: string;
  typeAt?: number;
  placeholder?: string;
  x?: number;
  y?: number;
  /** The toolbar's height in px (default 7.2 % of the frame height). */
  size?: number;
  /** The dot's colour (default the ink). */
  color?: string;
  speed?: number;
}> = ({ L, at: start, dropAt = 6, text = '', typeAt = 20, placeholder = 'Search or type a link', x: xIn, y: yIn, size: sizeIn, color, speed = 1 }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const h = sizeIn ?? Math.min(W, H) * 0.072;
  const dot = color ?? L.ink;
  const land = start + dropAt + 3;
  const drop = at(frame, start + dropAt, 3, ease.in);
  const landed = frame >= land;
  const thin = at(frame, land, 3, ease.out);
  const fadePh = at(frame, land, 3, ease.out);
  const widen = at(frame, land + 3, 6, ease.out);
  const push = at(frame, land + 2, 8, ease.out);
  const pushTo = 1.35;
  const fw0 = h * 5.6;
  const fw = mix(widen, fw0, fw0 * 1.7);
  const gap = h * 0.28;
  const total = h + gap + fw + gap + h;
  const left = -total / 2;
  const fieldX = left + h + gap; // the field's left edge, relative to the centre
  const ds = Math.min(W, H) * 0.016;
  // the caret's spot: the start of the field's text
  const caretX = fieldX + h * 0.62;
  const typed = typingTimes(text, start + typeAt, fps, 15, 5);
  const shown = text && frame >= typed[0];
  const nTyped = typed.filter((t) => frame >= t).length;
  const typing = !!text && frame >= typed[0] && frame <= (typed[typed.length - 1] ?? 0) + 2;
  const advance = useTextWidth(text.slice(0, nTyped) || ' ', { fontFamily: L.font, fontSize: h * 0.4 });
  const pill = (w: number, children: React.ReactNode, lft: number, key: string) => (
    <div key={key} style={{ position: 'absolute', left: lft, top: -h / 2, width: w, height: h, borderRadius: h, background: L.surface, boxShadow: L.dark ? '0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 18px rgba(0,0,0,0.35)' : '0 1px 2px rgba(17,19,24,0.05), 0 4px 16px rgba(17,19,24,0.06)', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
      {children}
    </div>
  );
  // before the landing the dot hovers above the field's text start, sinking a little
  const hoverY = -h * 1.25 + clamp((frame - start) / Math.max(1, dropAt)) * Math.min(W, H) * 0.004;
  const dy = mix(drop, hoverY, 0);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, transform: `scale(${mix(push, 1, pushTo)})`, fontFamily: L.font }}>
      {pill(h, <Icon name="ChevronLeft" size={h * 0.5} color={L.ink} stroke={2.2} style={{ margin: 'auto' }} />, left, 'back')}
      {pill(
        fw,
        <>
          <div style={{ marginLeft: h * 0.42, width: h * 0.42, display: 'flex', opacity: 1 - fadePh }}>
            <Icon name="PanelTop" size={h * 0.42} color={L.muted} stroke={2} />
          </div>
          <div style={{ marginLeft: h * 0.25, flex: 1, fontSize: h * 0.4, color: L.faint, whiteSpace: 'nowrap', opacity: 1 - fadePh, overflow: 'hidden' }}>{placeholder}</div>
          <div style={{ marginRight: h * 0.36, display: 'flex' }}>
            <Icon name="RotateCw" size={h * 0.4} color={L.muted} stroke={2.2} />
          </div>
        </>,
        fieldX,
        'field',
      )}
      {pill(h, <Icon name="Ellipsis" size={h * 0.5} color={L.ink} stroke={2.4} style={{ margin: 'auto' }} />, fieldX + fw + gap, 'more')}
      {/* the typed query */}
      {shown && (
        <div style={{ position: 'absolute', left: caretX, top: -h / 2, height: h, display: 'flex', alignItems: 'center', fontSize: h * 0.4, color: L.ink, whiteSpace: 'pre' }}>
          <InkTyped text={text} times={typed} color={L.ink} born={L.accent} cool={6} />
        </div>
      )}
      {/* the dot, then the caret it becomes */}
      {!landed ? (
        <div style={{ position: 'absolute', left: caretX - ds / 2, top: dy - (ds * mix(drop, 1, 2.2)) / 2, width: ds * mix(drop, 1, 0.75), height: ds * mix(drop, 1, 2.2), borderRadius: ds, background: dot, filter: drop > 0.2 ? `blur(${drop * 1.5}px)` : undefined }} />
      ) : (
        <Caretish frame={frame} land={land} thin={thin} h={h} ds={ds} color={dot} x={caretX + (nTyped ? advance + 2 : 0)} typing={typing} />
      )}
    </div>
  );
};

// the caret: a bar that thins from the dot's width, solid while typing, blinking on a 15 f cycle at rest
const Caretish: React.FC<{ frame: number; land: number; thin: number; h: number; ds: number; color: string; x: number; typing: boolean }> = ({ frame, land, thin, h, ds, color, x, typing }) => {
  const ch = mix(thin, ds * 1.6, h * 0.46);
  const cw = mix(thin, ds * 0.7, 2.5);
  const blink = typing || frame <= land + 8 || Math.floor((frame - land - 8) / 15) % 2 === 0;
  return <div style={{ position: 'absolute', left: x - cw / 2, top: -ch / 2, width: cw, height: ch, borderRadius: cw, background: color, opacity: blink ? 1 : 0 }} />;
};

export const DotCaret = withPace(DotCaretInner);
