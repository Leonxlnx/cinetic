// Small product-UI parts for the picture beats, drawn in the ground family's inks and lit by the film's one key light
// (top left, lib/light FILM_LIGHT): a card, a typed field, a list row that checks itself, a count, a live waveform, a
// listening pill and the planes that part under the picture's camera. They take every string from the scene (from
// launch.ts `ui`): nothing here carries sample content. Rebuild the product's own screens with them, or with the kit
// (src/kit: the lit Phone and Laptop in kit/device.tsx), at film size (brand/tokens UI_FILM).
//
// Rules these parts keep, so a calm picture never pops: everything a scene shows is mounted for the whole beat (show
// and hide with opacity, never by mounting), text sits on its own composited layer (usePromote), state changes ease in
// (a check fills over 16 f, a caret never blinks) and arrivals land on the beat's own hits (CUE a<pair>h<k>). A card is
// a lit object, never a flat slab: a face lit from the key (brighter at its top-left, falling off across it), a rim
// where its edges face the key, a contact shadow under it on the ground, one radius for the film. Its content creeps
// inside it (30 px/s, centred on the beat, easing off before it nears the edge) while its edge moves with the camera,
// and a Plane sets a part nearer or farther than the stage (z): the planes part as the camera travels.
import React from 'react';
import { C, FONT, TEXT_MIN, U } from '../brand/tokens';
import type { FamilyInks } from '../fx/Grounds';
import { arrive, clamp, E, mix } from '../lib/anim';
import { mixColor, toOklch } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { FPS } from '../timeline';
import { usePromote } from './layer';

/** Card numbers (px at 1080p): one radius for the film, inner padding at least 0.8 of the text's cap. */
export const CARD = { radius: 30, pad: 48, row: 92, text: 44, small: 38, creep: 30, creepMax: 40, edge: 1.5 } as const;
const k60 = FPS / 60;

/** The picture beat's clock and camera (stage.tsx Scene provides it): frames since the beat began, its length, and the
 * camera's travel this frame (px), which Plane uses to set a part nearer or farther than the stage. */
export const SceneCtx = React.createContext<{ f: number; dur: number; cam: { dx: number; dy: number } }>({ f: 0, dur: 1, cam: { dx: 0, dy: 0 } });

/** White or ink, whichever reads on `fill`. */
export const inkOn = (fill: string, inks: FamilyInks) => (toOklch(fill)[0] < 0.66 ? C.white : inks.dark ? C.ink : inks.type);

/**
 * A plane at depth z under the picture's camera: z 1 is the stage (it travels with the camera), z > 1 is nearer (it
 * leads, 1.3 a foreground pass), z < 1 farther (it lags, 0.6 a back layer). Two planes parting is depth a viewer feels
 * and look-audit floor-depth reads; keep z within 0.5-1.5 so nothing slides off what it belongs to.
 */
export const Plane: React.FC<{ z: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ z, children, style }) => {
  const { cam } = React.useContext(SceneCtx);
  const dx = (z - 1) * cam.dx;
  const dy = (z - 1) * cam.dy;
  return <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${dx.toFixed(3)}px, ${dy.toFixed(3)}px, 0)`, ...style }}>{children}</div>;
};

/** The lit face of a card: its fill lit from the key (brighter toward the top left), its rim and its shadow (CSS). */
export const litFace = (bg: string, inks: FamilyInks, o: { lift?: number; accent?: boolean } = {}) => {
  const e = (CARD.edge * U).toFixed(2);
  const lift = o.lift ?? 0;
  if (inks.dark || o.accent) {
    // a dark (or brand-coloured) card: the face a touch brighter where the key falls, a rim on the edges facing it,
    // a deep contact shadow on the ground
    const face = `linear-gradient(152deg, ${mixColor(bg, C.white, o.accent ? 0.1 : 0.075)} 0%, ${bg} 42%, ${mixColor(bg, C.ink, o.accent ? 0.06 : 0.1)} 100%)`;
    const rim = `inset 0 ${e}px 0 ${mixColor(bg, C.white, o.accent ? 0.34 : 0.3)}, inset ${e}px 0 0 ${mixColor(bg, C.white, o.accent ? 0.2 : 0.16)}, inset 0 0 0 ${e}px ${mixColor(bg, C.white, 0.06)}`;
    const shadow = `0 ${(10 * U).toFixed(1)}px ${(22 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.22 + 0.06 * lift).toFixed(3)}), 0 ${(34 * U + lift * 10 * U).toFixed(1)}px ${(80 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.3 + 0.08 * lift).toFixed(3)})`;
    return { background: face, boxShadow: `${rim}, ${shadow}` };
  }
  // a light card on a light ground: a soft shadow and a top highlight, never a hairline as well
  const face = `linear-gradient(160deg, ${bg} 0%, ${bg} 55%, ${mixColor(bg, inks.type, 0.025)} 100%)`;
  const shadow = `inset 0 ${e}px 0 ${mixColor(bg, C.white, 0.9)}, 0 ${(3 * U).toFixed(1)}px ${(8 * U).toFixed(1)}px rgba(0, 0, 0, 0.05), 0 ${(26 * U + lift * 8 * U).toFixed(1)}px ${(64 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.1 + 0.04 * lift).toFixed(3)})`;
  return { background: face, boxShadow: shadow };
};

/** A glass glare over a lit face: one soft diagonal band that slides against the camera's travel, as a reflection does. */
export const Glare: React.FC<{ w: number; h: number; r: number; dark: boolean }> = ({ w, h, r, dark }) => {
  const { cam } = React.useContext(SceneCtx);
  const at = 30 - (cam.dx / Math.max(1, w)) * 60;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: r, pointerEvents: 'none', background: `linear-gradient(118deg, rgba(255, 255, 255, 0) ${(at - 14).toFixed(2)}%, rgba(255, 255, 255, ${dark ? 0.05 : 0.18}) ${at.toFixed(2)}%, rgba(255, 255, 255, 0) ${(at + 16).toFixed(2)}%)` }} />;
};

/**
 * A card centred on (cx, cy), `w` x `h` px, lit. It is whole from the beat's first frame (the seam brings it in); `at`
 * gives it its own arrival (rise 24 px, fade, 26 f@60) inside a beat. `fill` colours it (the result in the brand
 * colour); `lift` raises it on a moment. Its content creeps upward through the beat (CARD.creep px/s) against its edge:
 * the card and its content read as two planes.
 */
export const Card: React.FC<{ f: number; at?: number; cx: number; cy: number; w: number; h: number; inks: FamilyInks; children?: React.ReactNode; lift?: number; fill?: string; creep?: boolean }> = ({ f, at, cx, cy, w, h, inks, children, lift = 0, fill, creep = true }) => {
  const clock = React.useContext(SceneCtx);
  const a = at === undefined ? 1 : E.settleOut(clamp((f - at) / (26 * k60)));
  const bg = fill ?? inks.surface;
  const raw = ((clock.dur / 2 - clock.f) * CARD.creep) / FPS;
  const dy = creep ? CARD.creepMax * Math.tanh(raw / CARD.creepMax) * U : 0;
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: CARD.radius * U, ...litFace(bg, inks, { lift, accent: !!fill }), opacity: a, transform: `translate3d(${(cx - w / 2).toFixed(3)}px, ${(cy - h / 2 + (1 - a) * 24 * U - lift * 6 * U).toFixed(3)}px, 0)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(0px, ${dy.toFixed(3)}px, 0)` }}>{children}</div>
      <Glare w={w} h={h} r={CARD.radius * U} dark={inks.dark || !!fill} />
    </div>
  );
};

/** Text at film size inside a card (left edge on the card's padding), on its own layer. */
export const Txt: React.FC<{ x: number; y: number; size?: number; weight?: number; color: string; children: string; opacity?: number; track?: number }> = ({ x, y, size = CARD.text, weight = 450, color, children, opacity = 1, track = -0.01 }) => {
  const promote = usePromote();
  return (
    <div data-text={children} data-ui="" style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: Math.max(TEXT_MIN, size) * U, fontWeight: weight, letterSpacing: `${track}em`, lineHeight: 1.2, color, opacity, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      {children}
    </div>
  );
};

/** A string broken into lines no wider than `w` px at `size` (px at 1080p), by words. Browser only (it measures). */
export const wrapWords = (text: string, w: number, size: number, weight = 450, track = -0.01) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measureTracked(next, size * U, weight, track, FONT.text, { trailing: false }) > w) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length !== 2) return lines;
  // two lines balance (never one word left alone on the second): the break that keeps the longer line shortest
  const m = (s: string) => measureTracked(s, size * U, weight, track, FONT.text, { trailing: false });
  let best = lines;
  let bw = Math.max(m(lines[0]), m(lines[1]));
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wi = Math.max(m(a), m(b));
    if (wi <= w && wi < bw) [bw, best] = [wi, [a, b]];
  }
  return best;
};

/** The time a typed string takes (film frames). */
export const typedFrames = (text: string) => Math.ceil(text.length * 2.3 * k60);

/**
 * A typed field: `text` typed from `at` at a hand's rhythm (about 26 characters a second), wrapped at `w` px when given,
 * a steady caret at the end (it never blinks). Each next character fades in over its interval: typing never pops a
 * glyph whole into a still frame. Every line keeps the full string's id (the audit merges them).
 */
export const Typed: React.FC<{ f: number; at: number; x: number; y: number; text: string; inks: FamilyInks; size?: number; w?: number; color?: string }> = ({ f, at, x, y, text, inks, size = CARD.text, w, color }) => {
  const promote = usePromote();
  const per = 2.3 * k60;
  const fi = Math.round(f); // discrete state from the whole frame (sub-frames never disagree)
  const n = Math.max(0, Math.min(text.length, Math.floor((fi - at) / per)));
  const next = n < text.length && fi >= at ? clamp((fi - at) / per - n) : 0;
  const caret = clamp((fi - (at - 12 * k60)) / (8 * k60));
  const lines = w ? wrapWords(text, w, size) : [text];
  const lead = size * U * 1.25;
  const starts = lines.map((_, i) => lines.slice(0, i).reduce((m, l) => m + l.length + 1, 0));
  // the caret sits on the line being typed (the last one once the string is whole)
  const here = Math.max(0, lines.findIndex((l, i) => n <= starts[i] + l.length));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      {lines.map((ln, li) => {
        const shown = Math.max(0, Math.min(ln.length, n - starts[li]));
        const fading = n >= starts[li] && n < starts[li] + ln.length ? next : 0;
        return (
          <div key={li} style={{ position: 'absolute', left: 0, top: li * lead, whiteSpace: 'pre' }}>
            <span data-text={text} data-ui="" style={{ fontFamily: FONT.text, fontSize: size * U, fontWeight: 450, letterSpacing: '-0.01em', lineHeight: 1.2, color: color ?? inks.type }}>
              {ln.slice(0, shown)}
              <span style={{ opacity: fading }}>{fading > 0 ? ln[shown] : ''}</span>
            </span>
            <span style={{ display: 'inline-block', width: 3 * U, height: size * U * 1.05, marginLeft: 4 * U, verticalAlign: 'middle', background: inks.accent, opacity: li === here ? caret : 0 }} />
          </div>
        );
      })}
    </div>
  );
};

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
        <div style={{ position: 'absolute', inset: -2.5 * U, borderRadius: r, background: `radial-gradient(circle at 34% 30%, ${mixColor(inks.accent, C.white, 0.22)} 0%, ${inks.accent} 62%)`, opacity: d }} />
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

/**
 * A live waveform: `n` rounded bars in `w` x `h` px, their heights a pure function of the frame (two slow sines and a
 * syllable rhythm per bar, never random), alive while `live` is 1 and settling flat as it falls to 0 (the input
 * finished). Its colour is the ink it is drawn in (the accent on the product's own surface).
 */
export const Waveform: React.FC<{ f: number; w: number; h: number; color: string; n?: number; live?: number }> = ({ f, w, h, color, n = 22, live = 1 }) => {
  const gap = w / n;
  const bw = Math.max(2 * U, gap * 0.46);
  const t = f / FPS;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      {Array.from({ length: n }, (_, i) => {
        const env = Math.sin((Math.PI * (i + 0.5)) / n) ** 0.7;
        const syl = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * 2.1 + i * 0.13)) * Math.sin(2 * Math.PI * (t * 0.7 + i * 0.37));
        const a = 0.16 + 0.84 * env * mix(0.12, 0.35 + 0.65 * Math.abs(syl), live);
        const bh = Math.max(bw, h * a);
        return <div key={i} style={{ position: 'absolute', left: i * gap + (gap - bw) / 2, top: (h - bh) / 2, width: bw, height: bh, borderRadius: bw / 2, background: color }} />;
      })}
    </div>
  );
};

/**
 * The product listening, as a pill on the near plane over the input footage: a lit dark pill (never a frosted panel)
 * holding the accent's live dot and a waveform, arriving on `at` (a short rise on a glide) and staying live. Centred on
 * (cx, cy); the footage stays the picture, the pill says the product is taking it in.
 */
export const ListenPill: React.FC<{ f: number; at: number; cx: number; cy: number; inks: FamilyInks; w?: number }> = ({ f, at, cx, cy, inks, w = 480 }) => {
  const a = E.glideOut(clamp((f - at) / (30 * k60)));
  const pw = w * U;
  const ph = 116 * U;
  const bg = mixColor(C.ink, C.white, 0.16);
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / (FPS * 1.4));
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: pw, height: ph, borderRadius: ph / 2, ...litFace(bg, { ...inks, dark: true }), opacity: a, transform: `translate3d(${(cx - pw / 2).toFixed(3)}px, ${(cy - ph / 2 + (1 - a) * 26 * U).toFixed(3)}px, 0)` }}>
      <div style={{ position: 'absolute', left: ph * 0.36, top: ph / 2 - 15 * U, width: 30 * U, height: 30 * U, borderRadius: 15 * U, background: inks.accent, boxShadow: `0 0 0 ${(6 * U * pulse).toFixed(2)}px ${mixColor(inks.accent, bg, 0.6)}` }} />
      <div style={{ position: 'absolute', left: ph * 0.36 + 62 * U, top: ph * 0.26 }}>
        <Waveform f={f} w={pw - ph * 0.36 - 62 * U - ph * 0.4} h={ph * 0.48} color={C.white} n={20} />
      </div>
    </div>
  );
};
