// Small product-UI parts for the picture beats, drawn in the ground family's inks and lit by the film's one key light
// (top left, lib/light FILM_LIGHT): a card, a typed field, a list row that checks itself, a count, a live waveform, a
// listening pill, a lit window onto footage and the planes that part under the picture's camera. A light surface on a
// dark ground (a white card, a phone's light screen) is the film's second value: its content takes surfaceInks().
// They take every string from the scene (from
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
import { BrandLogo } from '../kit/logos';

/** Card numbers (px at 1080p): one radius for the film, inner padding at least 0.8 of the text's cap. */
export const CARD = { radius: 30, pad: 48, row: 100, text: 48, small: 40, creep: 30, creepMax: 40, edge: 1.5 } as const;
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

/** Whether a colour is a light surface (OKLCH L over .8): its content takes dark ink. */
export const isLight = (c: string) => toOklch(c)[0] > 0.8;

/**
 * The inks for content drawn on a surface `bg`: on a light surface (a white card on a dark ground, a light screen) the
 * ink, a muted ink, a hairline and the brand accent at full depth (a dark ground's lifted accent washes out on white);
 * on a dark surface the ground's own inks.
 */
export const surfaceInks = (inks: FamilyInks, bg: string): FamilyInks =>
  isLight(bg) ? { ...inks, type: C.ink, mute: mixColor(C.ink, bg, 0.5), line: mixColor(C.ink, bg, 0.84), accent: C.accent, surface: bg, dark: false } : inks;

/** The film's light surface on this ground: white with a breath of the ground's hue in it (never a cream). */
export const lightSurface = (inks: FamilyInks) => (inks.dark ? mixColor(C.white, inks.ground, 0.035) : C.white);

/** The lit face of a card: its fill lit from the key (brighter toward the top left), its rim and its shadow (CSS). */
export const litFace = (bg: string, inks: FamilyInks, o: { lift?: number; accent?: boolean } = {}) => {
  const e = (CARD.edge * U).toFixed(2);
  const lift = o.lift ?? 0;
  if (inks.dark && isLight(bg) && !o.accent) {
    // a light card on a dark ground: the face falling off a few percent away from the key, its thickness as a shaded
    // lower edge, a tight contact shadow and a wide soft one (an object standing in the room, never a sticker)
    const face = `linear-gradient(158deg, ${bg} 0%, ${bg} 46%, ${mixColor(bg, inks.ground, 0.07)} 100%)`;
    const edge = `inset 0 ${(-2.5 * U).toFixed(2)}px 0 ${mixColor(bg, inks.ground, 0.16)}, inset 0 ${e}px 0 ${C.white}`;
    const shadow = `0 ${(8 * U).toFixed(1)}px ${(18 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.26 + 0.06 * lift).toFixed(3)}), 0 ${(40 * U + lift * 12 * U).toFixed(1)}px ${(96 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.36 + 0.08 * lift).toFixed(3)})`;
    return { background: face, boxShadow: `${edge}, ${shadow}` };
  }
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
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: CARD.radius * U, ...litFace(bg, inks, { lift, accent: !!fill && !isLight(fill) }), opacity: a, transform: `translate3d(${(cx - w / 2).toFixed(3)}px, ${(cy - h / 2 + (1 - a) * 24 * U - lift * 6 * U).toFixed(3)}px, 0)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(0px, ${dy.toFixed(3)}px, 0)` }}>{children}</div>
      <Glare w={w} h={h} r={CARD.radius * U} dark={(inks.dark || !!fill) && !isLight(bg)} />
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

/** A list row: arriving on `at` (a hit), its round check filling from `done` over 16 f, the label easing to the muted ink
 * (`size` its text, `h` its height, px at 1080p). */
export const Row: React.FC<{ f: number; at: number; done?: number; x: number; y: number; w: number; label: string; inks: FamilyInks; size?: number; h?: number }> = ({ f, at, done, x, y, w, label, inks, size = CARD.text, h = CARD.row }) => {
  const p = clamp((f - at) / (20 * k60));
  const a = E.snapOut(p);
  const q = clamp((f - at) / (34 * k60)); // the rise lands on a glide (34 f), its opacity on the hit
  const d = done === undefined ? 0 : E.stdInOut(clamp((f - done) / (16 * k60)));
  const r = size * 0.42 * U;
  const b = Math.max(2.5, size * 0.052) * U;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h * U, opacity: a, transform: `translate3d(${x.toFixed(3)}px, ${(y + (1 - arrive(E.glideOut(q))) * 18 * U).toFixed(3)}px, 0)` }}>
      <div style={{ position: 'absolute', left: 0, top: (h * U) / 2 - r, width: 2 * r, height: 2 * r, borderRadius: r, boxSizing: 'border-box', border: `${b.toFixed(2)}px solid ${mixColor(inks.line, inks.accent, d)}` }}>
        <div style={{ position: 'absolute', inset: -b, borderRadius: r, background: `radial-gradient(circle at 34% 30%, ${mixColor(inks.accent, C.white, 0.22)} 0%, ${inks.accent} 62%)`, opacity: d }} />
        <svg width={2 * r} height={2 * r} viewBox="0 0 40 40" style={{ position: 'absolute', left: -b, top: -b, opacity: clamp(d * 3) }}>
          <path d="M12 21 L18 27 L29 14" fill="none" stroke={inkOn(inks.accent, inks)} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={30} strokeDashoffset={30 * (1 - d)} />
        </svg>
      </div>
      <Txt x={2 * r + size * 0.6 * U} y={(h * U) / 2 - size * U * 0.62} size={size} color={mixColor(inks.type, inks.mute, 0.6 * d)}>{label}</Txt>
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
 * The product listening, as a pill: a light lit pill (the product's own surface: it reads as UI on any picture, never
 * a dark smudge or a frosted panel) holding the accent's live dot, pulsing, and a live waveform in the accent, arriving
 * on `at` (a short rise on a glide). Centred on (cx, cy), `w` x `h` px at 1080p (animate them to fly it into the
 * product: `n` bars stay fixed, so nothing pops while it changes size); `live` 0 settles the waveform.
 */
export const ListenPill: React.FC<{ f: number; at: number; cx: number; cy: number; inks: FamilyInks; w?: number; h?: number; n?: number; live?: number; opacity?: number }> = ({ f, at, cx, cy, inks, w = 600, h = 136, n = 22, live = 1, opacity = 1 }) => {
  const a = E.glideOut(clamp((f - at) / (30 * k60)));
  const pw = w * U;
  const ph = h * U;
  const bg = lightSurface({ ...inks, dark: true });
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / (FPS * 1.4));
  const dot = ph * 0.24;
  const wx = ph * 0.36 + dot + ph * 0.28;
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: pw, height: ph, borderRadius: ph / 2, ...litFace(bg, { ...inks, dark: true }), opacity: a * opacity, transform: `translate3d(${(cx - pw / 2).toFixed(3)}px, ${(cy - ph / 2 + (1 - a) * 26 * U).toFixed(3)}px, 0)` }}>
      <div style={{ position: 'absolute', left: ph * 0.36, top: ph / 2 - dot / 2, width: dot, height: dot, borderRadius: dot / 2, background: C.accent, boxShadow: `0 0 0 ${(dot * 0.24 * pulse * live).toFixed(2)}px ${mixColor(C.accent, bg, 0.74)}` }} />
      <div style={{ position: 'absolute', left: wx, top: ph * 0.25 }}>
        <Waveform f={f} w={pw - wx - ph * 0.4} h={ph * 0.5} color={C.accent} n={n} live={live} />
      </div>
    </div>
  );
};

/**
 * A lit window onto footage or a photograph: the picture inside a rounded frame standing in the room (a rim catching
 * the key, a contact shadow on the ground, a glare sliding against the camera), centred on (cx, cy), `w` x `h` px. The
 * picture (`children`) is laid out at the frame's full width and scaled into the window, so a soft source is shown
 * smaller and reads sharp; grade it into the film (a tint at the ground's hue, kit/theme photoGrade).
 */
export const Window: React.FC<{ cx: number; cy: number; w: number; h: number; inks: FamilyInks; children: React.ReactNode; opacity?: number; scale?: number }> = ({ cx, cy, w, h, inks, children, opacity = 1, scale = 1 }) => {
  const r = CARD.radius * 1.2 * U;
  const k = w / 1920;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, borderRadius: r, transformOrigin: '50% 50%', transform: `translate3d(${(cx - w / 2).toFixed(3)}px, ${(cy - h / 2).toFixed(3)}px, 0) scale(${scale.toFixed(5)})`, boxShadow: `0 ${(14 * U).toFixed(1)}px ${(30 * U).toFixed(1)}px rgba(0, 0, 0, 0.34), 0 ${(48 * U).toFixed(1)}px ${(120 * U).toFixed(1)}px rgba(0, 0, 0, ${inks.dark ? 0.5 : 0.18})` }}>
      <div data-imagery="" style={{ position: 'absolute', inset: 0, borderRadius: r, overflow: 'hidden', isolation: 'isolate' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: (1920 * h) / w, transformOrigin: '0 0', transform: `scale(${k.toFixed(5)})` }}>{children}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, pointerEvents: 'none', boxShadow: `inset 0 ${(1.5 * U).toFixed(2)}px 0 rgba(255, 255, 255, 0.32), inset 0 0 0 ${(1.5 * U).toFixed(2)}px rgba(255, 255, 255, 0.1)` }} />
      <Glare w={w} h={h} r={r} dark />
    </div>
  );
};

/**
 * A status pill: a dot and a label inside one lit pill, laid out by the browser (flex), never by a width guessed from
 * the label's letter count (a guess puts the dot on the pill's edge, or the label under its neighbour). The padding
 * is even: the same air left of the dot as right of the label (`h` x PILL.pad), the dot `h` x PILL.dot across, the
 * gap after it `h` x PILL.gap. Anchored at (x, y) by its `anchor` side (a pill at a card's top right: anchor 'right',
 * x the card's inner right edge), vertically centred on y. `dot` its colour (none: a label pill); `on` 0..1 the dot's
 * live pulse; the pill's own text sits on its own layer like every Txt.
 */
export const PILL = { pad: 0.42, dot: 0.24, gap: 0.26, text: 0.5 } as const;
export const Pill: React.FC<{ x: number; y: number; h: number; label: string; fill: string; ink: string; dot?: string; anchor?: 'left' | 'right' | 'center'; on?: number; f?: number; weight?: number; opacity?: number }> = ({ x, y, h, label, fill, ink, dot, anchor = 'left', on = 0, f = 0, weight = 560, opacity = 1 }) => {
  const promote = usePromote();
  const H = h * U;
  const d = H * PILL.dot;
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / (FPS * 1.4));
  const tx = anchor === 'left' ? '0%' : anchor === 'right' ? '-100%' : '-50%';
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, height: H, display: 'flex', alignItems: 'center', gap: dot ? H * PILL.gap : 0, padding: `0 ${(H * PILL.pad).toFixed(2)}px`, borderRadius: H / 2, background: fill, opacity, whiteSpace: 'pre', transform: `translate3d(${x.toFixed(3)}px, ${(y - H / 2).toFixed(3)}px, 0) translateX(${tx})`, willChange: promote ? 'transform' : undefined }}>
      {dot ? <div style={{ flex: 'none', width: d, height: d, borderRadius: d / 2, background: dot, boxShadow: `0 0 0 ${(d * 0.32 * pulse * on).toFixed(2)}px ${mixColor(dot, fill, 0.7)}` }} /> : null}
      <span data-text={label} data-ui="" style={{ fontFamily: FONT.text, fontSize: Math.max(TEXT_MIN, h * PILL.text) * U, fontWeight: weight, letterSpacing: '-0.01em', lineHeight: 1, color: ink }}>{label}</span>
    </div>
  );
};

/**
 * A state change in one control (a button that becomes a badge: "Merge" to "Merged", "Run" to "Passed"): one pill
 * whose label swaps in place, never two controls stacked with cross-fading opacities (the old label shows through the
 * new one). From `at` the old label leaves upward over SWAP.out f@60; the new one rises in from below over SWAP.in f@60,
 * starting as the old one is nearly gone (SWAP.gap, negative: an overlap; they pass apart, never over each other, and
 * the pill is never empty for a frame), while the pill's width glides between the two labels'
 * measured widths and its fill mixes from `fill` to `toFill`. Anchored like Pill (by its right edge at a card's top
 * right). Browser only (it measures with the film's face).
 */
export const SWAP = { out: 8, gap: -2, in: 14 } as const;
export const SwapLabel: React.FC<{ f: number; at: number; x: number; y: number; h: number; from: string; to: string; fill: string; toFill: string; ink: string; toInk: string; anchor?: 'left' | 'right' | 'center'; weight?: number }> = ({ f, at, x, y, h, from, to, fill, toFill, ink, toInk, anchor = 'left', weight = 600 }) => {
  const promote = usePromote();
  const H = h * U;
  const size = Math.max(TEXT_MIN, h * PILL.text) * U;
  const pad = H * PILL.pad * 1.2;
  const wa = measureTracked(from, size, weight, -0.01, FONT.text, { trailing: false }) + 2 * pad;
  const wb = measureTracked(to, size, weight, -0.01, FONT.text, { trailing: false }) + 2 * pad;
  const u = clamp((Math.round(f) - at) / (SWAP.out * k60));
  const v = clamp((Math.round(f) - at - (SWAP.out + SWAP.gap) * k60) / (SWAP.in * k60));
  const g = E.stdInOut(clamp((Math.round(f) - at) / ((SWAP.out + SWAP.gap + SWAP.in) * k60)));
  const w = mix(wa, wb, g);
  const left = anchor === 'left' ? x : anchor === 'right' ? x - w : x - w / 2;
  const old = 1 - E.buildIn(u);
  const neu = E.glideOut(v);
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: H, borderRadius: H / 2, background: mixColor(fill, toFill, g), overflow: 'hidden', transform: `translate3d(${left.toFixed(3)}px, ${(y - H / 2).toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      <span data-text={from} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: weight, letterSpacing: '-0.01em', lineHeight: 1, color: ink, opacity: old, transform: `translate3d(0px, ${(-0.5 * H * E.buildIn(u)).toFixed(3)}px, 0)` }}>{u < 1 ? from : ''}</span>
      <span data-text={to} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: weight, letterSpacing: '-0.01em', lineHeight: 1, color: toInk, opacity: neu, transform: `translate3d(0px, ${(0.5 * H * (1 - neu)).toFixed(3)}px, 0)` }}>{v > 0 ? to : ''}</span>
    </div>
  );
};

/**
 * A card's height from what it holds: `rows` heights (px at 1080p) stacked with `gap` between them, the same padding
 * above the first and below the last (CARD.pad): content centred in its card, never 25 px of air on top and 100 below.
 * Lay the rows out from `cardRows(...).y[i]` (each row's top inside the card).
 */
export const cardRows = (rows: number[], gap = 0, pad: number = CARD.pad): { h: number; y: number[] } => {
  const y: number[] = [];
  let at = pad;
  for (const r of rows) {
    y.push(at * U);
    at += r + gap;
  }
  return { h: (at - (rows.length ? gap : 0) + pad) * U, y };
};

/**
 * Other products' marks round a line held over them (pair `beat: 'over'`, SceneProps `band`): the official marks
 * (scripts/logos.mjs, kit/logos BrandLogo), bare, no app-icon tile and no card, set beside the line at its height:
 * the first half of the list on its left, the rest on its right, MARKS.gap x their size from the band's sides, so the
 * line keeps the middle and nothing stacks above or below it (a mark row over a line is a stacked layout; tiles read
 * as an app store, not as the products this one works with). Each arrives from further out on a glide (`at`, frames
 * from the picture's start, MARKS.stagger f@60 apart) and keeps parting from the line slowly (MARKS.part px a second):
 * two planes. `size` the marks' optical box, px at 1080 (house: 0.8 of the band's height, 150 at most).
 */
export const MARKS = { gap: 0.55, space: 0.45, stagger: 8, rise: 46, dur: 30, part: 6 } as const;
export const MarksRound: React.FC<{ f: number; band: { x: number; y: number; w: number; h: number }; logos: string[]; ground?: 'light' | 'dark'; size?: number; at?: number }> = ({ f, band, logos, ground = 'light', size, at = 0 }) => {
  const s = size !== undefined ? size * U : Math.min(band.h * 0.8, 150 * U);
  const cy = band.y + band.h / 2;
  const half = Math.ceil(logos.length / 2);
  const sides: [string[], number][] = [[logos.slice(0, half), -1], [logos.slice(half), 1]];
  const t = f / FPS;
  return (
    <>
      {sides.flatMap(([list, side]) =>
        list.map((logo, j) => {
          const k = side < 0 ? list.length - 1 - j : j; // 0 = nearest the line
          const i = side < 0 ? j : half + j;
          const a = E.glideOut(clamp((f - at - i * MARKS.stagger * k60) / (MARKS.dur * k60)));
          const edge = side < 0 ? band.x - s * MARKS.gap - s - k * s * (1 + MARKS.space) : band.x + band.w + s * MARKS.gap + k * s * (1 + MARKS.space);
          const x = edge + side * ((1 - a) * MARKS.rise + MARKS.part * t) * U;
          return (
            <div key={logo} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a, transform: `translate3d(${x.toFixed(3)}px, ${(cy - s / 2).toFixed(3)}px, 0)` }}>
              <BrandLogo logo={logo} box={s} ground={ground} />
            </div>
          );
        }),
      )}
    </>
  );
};
