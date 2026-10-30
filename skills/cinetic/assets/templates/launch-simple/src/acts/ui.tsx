// Small product-UI parts for the picture beats, drawn in the ground family's inks: a card, a typed field, a list row
// that checks itself, a count. They take every string from the scene (from launch.ts `ui`): nothing here carries sample
// content. Rebuild the product's own screens with them, or with the kit (src/kit), at film size (brand/tokens UI_FILM).
//
// Rules these parts keep, so a calm picture never pops: everything a scene shows is mounted for the whole beat (show
// and hide with opacity, never by mounting), text sits on its own composited layer (usePromote), state changes ease in
// (a check fills over 16 f, a caret never blinks) and arrivals land on the beat's own hits (CUE a<pair>h<k>). A
// card's content creeps inside it (30 px/s, centred on the beat, easing off before it nears the edge) while its edge,
// drawn crisp, moves with the camera: two planes under the camera's push.
import React from 'react';
import { C, FONT, TEXT_MIN, U } from '../brand/tokens';
import type { FamilyInks } from '../fx/Grounds';
import { arrive, clamp, E, mix } from '../lib/anim';
import { mixColor, toOklch } from '../lib/color';
import { FPS } from '../timeline';
import { usePromote } from './layer';

/** Card numbers (px at 1080p): one radius for the film, inner padding at least 0.8 of the text's cap. */
export const CARD = { radius: 30, pad: 48, row: 92, text: 44, small: 38, creep: 30, creepMax: 40, edge: 2 } as const;
const k60 = FPS / 60;

/** The picture beat's clock (stage.tsx Scene provides it): frames since the beat began, and its length. */
export const SceneCtx = React.createContext<{ f: number; dur: number }>({ f: 0, dur: 1 });

/** White or ink, whichever reads on `fill`. */
export const inkOn = (fill: string, inks: FamilyInks) => (toOklch(fill)[0] < 0.66 ? C.white : inks.dark ? C.ink : inks.type);

/**
 * A card centred on (cx, cy), `w` x `h` px. It is whole from the beat's first frame (the seam brings it in); `at` gives
 * it its own arrival (rise 24 px, fade, 26 f@60) inside a beat. `fill` colours it (the result in the brand colour);
 * `lift` raises it on a moment. Its content creeps upward through the beat (CARD.creep px/s); its edge is a crisp
 * hairline on a light ground (a rim on a dark one), so the card and its content read as two planes.
 */
export const Card: React.FC<{ f: number; at?: number; cx: number; cy: number; w: number; h: number; inks: FamilyInks; children?: React.ReactNode; lift?: number; fill?: string; creep?: boolean }> = ({ f, at, cx, cy, w, h, inks, children, lift = 0, fill, creep = true }) => {
  const clock = React.useContext(SceneCtx);
  const a = at === undefined ? 1 : E.settleOut(clamp((f - at) / (26 * k60)));
  const bg = fill ?? inks.surface;
  const e = (CARD.edge * U).toFixed(2);
  const shadow = inks.dark ? `inset 0 ${e}px 0 ${mixColor(bg, C.white, 0.22)}, inset 0 0 0 ${e}px ${mixColor(bg, C.white, 0.12)}` : `inset 0 0 0 ${e}px ${mixColor(bg, inks.type, 0.14)}, 0 ${(22 * U).toFixed(1)}px ${(60 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.08 + 0.04 * lift).toFixed(3)})`;
  const raw = ((clock.dur / 2 - clock.f) * CARD.creep) / FPS;
  const dy = creep ? CARD.creepMax * Math.tanh(raw / CARD.creepMax) * U : 0;
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: CARD.radius * U, background: bg, boxShadow: shadow, opacity: a, transform: `translate3d(${(cx - w / 2).toFixed(3)}px, ${(cy - h / 2 + (1 - a) * 24 * U - lift * 6 * U).toFixed(3)}px, 0)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(0px, ${dy.toFixed(3)}px, 0)` }}>{children}</div>
    </div>
  );
};

/** Text at film size inside a card (left edge on the card's padding), on its own layer. */
export const Txt: React.FC<{ x: number; y: number; size?: number; weight?: number; color: string; children: string; opacity?: number }> = ({ x, y, size = CARD.text, weight = 450, color, children, opacity = 1 }) => {
  const promote = usePromote();
  return (
    <div data-text={children} data-ui="" style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: Math.max(TEXT_MIN, size) * U, fontWeight: weight, lineHeight: 1.2, color, opacity, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      {children}
    </div>
  );
};

/** A typed field: `text` typed from `at` at a hand's rhythm (about 26 characters a second), a steady caret at the end. */
export const Typed: React.FC<{ f: number; at: number; x: number; y: number; text: string; inks: FamilyInks; size?: number }> = ({ f, at, x, y, text, inks, size = CARD.text }) => {
  const promote = usePromote();
  const per = 2.3 * k60;
  const fi = Math.round(f); // discrete state from the whole frame (sub-frames never disagree)
  const n = Math.max(0, Math.min(text.length, Math.floor((fi - at) / per)));
  // the next character fades in over its own interval: typing never pops a glyph whole into a still frame
  const next = n < text.length && fi >= at ? clamp((fi - at) / per - n) : 0;
  const caret = clamp((fi - (at - 12 * k60)) / (8 * k60));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      <span data-text={text} data-ui="" style={{ fontFamily: FONT.text, fontSize: size * U, fontWeight: 450, lineHeight: 1.2, color: inks.type }}>
        {text.slice(0, n)}
        <span style={{ opacity: next }}>{next > 0 ? text[n] : ''}</span>
      </span>
      <span style={{ display: 'inline-block', width: 3 * U, height: size * U * 1.05, marginLeft: 4 * U, verticalAlign: 'middle', background: inks.accent, opacity: caret }} />
    </div>
  );
};

/** The time a typed string takes (film frames). */
export const typedFrames = (text: string) => Math.ceil(text.length * 2.3 * k60);

/** A list row: arriving on `at` (a hit), its round check filling from `done` over 16 f, the label easing to the muted ink. */
export const Row: React.FC<{ f: number; at: number; done?: number; x: number; y: number; w: number; label: string; inks: FamilyInks }> = ({ f, at, done, x, y, w, label, inks }) => {
  const p = clamp((f - at) / (20 * k60));
  const a = E.snapOut(p);
  const q = clamp((f - at) / (34 * k60)); // the rise lands on a glide (34 f), its opacity on the hit
  const d = done === undefined ? 0 : E.stdInOut(clamp((f - done) / (16 * k60)));
  const r = 20 * U;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: CARD.row * U, opacity: a, transform: `translate3d(${x.toFixed(3)}px, ${(y + (1 - arrive(E.glideOut(q))) * 18 * U).toFixed(3)}px, 0)` }}>
      <div style={{ position: 'absolute', left: 0, top: (CARD.row * U) / 2 - r, width: 2 * r, height: 2 * r, borderRadius: r, boxSizing: 'border-box', border: `${(2.5 * U).toFixed(2)}px solid ${mixColor(inks.line, inks.accent, d)}` }}>
        <div style={{ position: 'absolute', inset: -2.5 * U, borderRadius: r, background: inks.accent, opacity: d }} />
        <svg width={2 * r} height={2 * r} viewBox="0 0 40 40" style={{ position: 'absolute', left: -2.5 * U, top: -2.5 * U, opacity: clamp(d * 3) }}>
          <path d="M12 21 L18 27 L29 14" fill="none" stroke={inkOn(inks.accent, inks)} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={30} strokeDashoffset={30 * (1 - d)} />
        </svg>
      </div>
      <Txt x={2 * r + 28 * U} y={(CARD.row * U) / 2 - CARD.text * U * 0.62} color={mixColor(inks.type, inks.mute, 0.6 * d)}>{label}</Txt>
    </div>
  );
};

/** A count that rises from `from` to `to` between two frames and settles (an ease-out, whole numbers, tabular). */
export const Count: React.FC<{ f: number; at: number; until: number; from?: number; to: number; x: number; y: number; size?: number; inks: FamilyInks; suffix?: string }> = ({ f, at, until, from = 0, to, x, y, size = 120, inks, suffix = '' }) => {
  const promote = usePromote();
  const v = Math.round(mix(from, to, E.settleOut(clamp((Math.round(f) - at) / Math.max(1, until - at)))));
  const text = `${v}${suffix}`;
  return (
    <div data-text={text} data-ui="" style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size * U, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: inks.type, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      {text}
    </div>
  );
};
