// ActionMorph (ui, emphasis / build): a button becomes its own progress bar and closes into a check, the done label
// sliding out beside it.
// Numbers: hover 4 f (10 % darker); dip 4 % over 3 f; widen 14 f; progress `dur` frames; contract 12 f; check 7 f;
// label 14 f.
// Caution: put it at the foot of a real card and drive it with a Pointer click on at + pressAt.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { bez, type Look, useUiFrame, withPace } from './_shared';

/**
 * A button that becomes its own progress bar and closes into a check: one object throughout, one hue, always fully lit.
 * The pointer's arrival darkens the whole pill 10 % (`hoverAt`); pressed (dips 4 %, 3 f), the pill widens into a bar
 * (14 f) and a lighter sweep (white at 24 %) runs inside it from the left with small plateaus (the work happens in steps) while the
 * label becomes the live status in white; at 100 % the bar contracts into a disc (12 f), a check draws and the done
 * label slides out beside it. Frames relative to `at`.
 */
const ActionMorphInner: React.FC<{
  L: Look;
  label: string;
  working: string;
  doneLabel: string;
  at: number;
  pressAt?: number;
  /** Frame (relative) the pointer reaches the button: the whole pill darkens 10 % and its shadow grows. */
  hoverAt?: number;
  dur?: number;
  x?: number;
  y?: number;
  w?: number;
  trackW?: number;
  size?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, label, working, doneLabel, at: start, pressAt = 20, hoverAt, dur = 46, x: xIn, y: yIn, w = 380, trackW = 760, size = 36 , speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  if (t < -12) return null;
  const h = size * 2.7;
  const P = start + pressAt;
  const dip = at(frame, P - 2, 3, ease.out) - at(frame, P + 1, 8, ease.out);
  const widen = at(frame, P + 2, 14, bez(0.3, 0, 0.1, 1));
  const runT = clamp((frame - (P + 6)) / dur);
  // progress with plateaus: a smooth base plus a few small holds
  const prog = clamp(ease.inOut(runT) + 0.04 * Math.sin(runT * 9) * (1 - runT) * runT * 4);
  const fin = P + 6 + dur;
  const shut = at(frame, fin + 4, 12, bez(0.6, 0, 0.2, 1));
  const tick = at(frame, fin + 14, 7, ease.out);
  const doneP = at(frame, fin + 18, 14, bez(0.2, 0.8, 0.2, 1));
  const pop = springAt(frame, 30, fin + 14, springs.pop);
  const width = mix(shut, mix(widen, w, trackW), h);
  const fillFrac = mix(widen, 1, Math.max(prog, 0.04));
  const enter = springAt(frame, 30, start - 12, springs.ui);
  const hv = (hoverAt !== undefined ? at(frame, start + hoverAt, 4, ease.out) : 0) * (1 - widen);
  const pct = Math.round(prog * 100);
  const lab = widen < 0.5 ? label : `${working} ${pct}%`;
  const labOp = widen < 0.5 ? 1 - widen * 2 : clamp(widen * 2 - 1) * (1 - clamp(shut * 3));
  const labelStyle: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: L.font, fontSize: size, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', opacity: labOp };
  const fillW = width * fillFrac;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: clamp(enter * 2) }}>
      <div style={{ position: 'absolute', left: -width / 2 - doneP * size * 3.2, top: -h / 2, width, height: h, borderRadius: h / 2, overflow: 'hidden', transform: `scale(${(1 - dip * 0.04) * mix(shut, 1, 1) * (shut > 0.99 ? mix(pop, 0.9, 1) : 1)})`, background: mixColor(L.accent, '#000000', hv * 0.1), boxShadow: `0 ${size * mix(hv, 0.35, 0.5)}px ${size * mix(hv, 1, 1.4)}px -${size * 0.4}px ${L.accent}${hv > 0.5 ? '88' : '66'}` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: shut > 0 ? mix(shut, fillW, width) : fillW, borderRadius: h / 2, background: `rgba(255,255,255,${0.24 * widen * (1 - shut)})` }} />
        <div style={{ ...labelStyle, color: L.accentInk }}>{lab}</div>
        {shut > 0.6 && (
          <svg width={h} height={h} viewBox="0 0 24 24" style={{ position: 'absolute', left: width / 2 - h / 2, top: 0 }}>
            <path d="M7.2 12.4 L10.6 15.6 L16.8 9" fill="none" stroke={L.accentInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={15} strokeDashoffset={15 * (1 - tick)} />
          </svg>
        )}
      </div>
      {doneP > 0 && (
        <div style={{ position: 'absolute', left: -width / 2 - doneP * size * 3.2 + h + size * 0.6, top: -h / 2, height: h, display: 'flex', alignItems: 'center', fontFamily: L.font, fontSize: size * 1.05, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap', opacity: doneP, transform: `translateX(${mix(doneP, -30, 0)}px)` }}>{doneLabel}</div>
      )}
    </div>
  );
};

export const ActionMorph = withPace(ActionMorphInner);
