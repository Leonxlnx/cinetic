// Devices as lit objects: a phone and a laptop that stand in the film's light, never a drawing of one (an outline
// bezel on a flat field). Each is a body with a rim and a thickness, a black glass border round the screen, a glass
// layer over it (an edge highlight and a soft glare that slides with a declared camera move: fx/Lit glass), a contact
// shadow where it meets the ground and a faint reflection of its body on the ground below. The screen is the
// product's own UI (children, drawn at (0, 0) in the screen's box) or a real capture. A product shot that is a bare
// screen uses fx/Lit itself: a screen plane facing the camera, with glass and depth. A device faces the camera and holds
// still between its moves (no sway, no bob); a turn is a declared move (an entry that lands, a turn the shot is about).
// Pure in the frame; transforms only.
import React from 'react';
import { clamp, E, mix, prog } from '../lib/anim';
import { mixColor, oklch, toOklch } from '../lib/color';
import { useFilm, uOf } from '../lib/film';
import { type FilmLight, FILM_LIGHT, type Tilt } from '../lib/light';
import { Lit, type LitEnter, litState, rgbaOf } from '../fx/Lit';
import { shadowTone } from '../fx/KeyLight';
import { kitTheme, type KitTheme } from './theme';

/**
 * House numbers (shares of the device's width unless named). phone: 19.5:9, a corner of 15 %, a black glass border of
 * 3.4 %, the island 30 % wide; laptop: a 16:10 lid with a 2.6 % border, a deck 1.14x the lid wide and 4 % deep.
 * body: the finishes (OKLCH L and C of the frame at the key side and the far side). reflect: the reflection's alpha and
 * reach (share of the device's height); contact: the contact shadow's alpha, its blur (px at 1080p) and its spread.
 */
export const DEVICE = {
  phone: { aspect: 19.5 / 9, radius: 0.15, border: 0.034, island: { w: 0.3, h: 0.085, top: 0.024 } },
  laptop: { aspect: 10 / 16, radius: 0.035, border: 0.026, deck: { w: 1.1, h: 0.04, depth: 0.6, fold: 86, lip: 0.35 } },
  body: { graphite: { lit: 0.46, far: 0.24, C: 0.006 }, silver: { lit: 0.9, far: 0.7, C: 0.004 } },
  glassL: 0.13, // the black glass round the screen (OKLCH L): deep, never #000
  reflect: { alpha: 0.12, reach: 0.22 },
  contact: { alpha: 0.42, blur: 16, spread: 0.08 },
} as const;

export type DeviceFinish = keyof typeof DEVICE.body;
type DeviceBase = {
  frame: number;
  x: number; // the device's centre at rest, px
  y: number;
  w: number; // the device's width, px
  theme?: KitTheme; // the ground's theme: the shadow's hue, the reflection's ground
  ground?: string; // the ground colour under the device (house theme.ground)
  finish?: DeviceFinish; // graphite (house on a dark ground) or silver (house on paper)
  tilt?: Tilt; // degrees at rest (house 0 / 0, facing the camera; a laptop pitches 6 to show its deck); animate it for a declared turn
  sway?: { amount?: number; phase?: number } | false; // off unless given (an idle loop: lint-film idle-bob)
  enter?: LitEnter;
  light?: FilmLight;
  reflect?: boolean; // the body's faint reflection on the ground below (house on)
  id?: string;
  children?: React.ReactNode; // the screen: drawn at (0, 0) in the screen's box (screenBox gives its size)
};

/** The finish's two tones (key side, far side) at the hue of the theme's greys. */
const finishTones = (t: KitTheme, finish: DeviceFinish) => {
  const b = DEVICE.body[finish];
  const h = toOklch(t.ground)[2];
  return [oklch(b.lit, b.C, h), oklch(b.far, b.C, h)] as const;
};

/** The screen's box inside a device w px wide: its offset and size (px), and its corner radius. Pure. */
export const screenBox = (kind: 'phone' | 'laptop', w: number) => {
  const d = kind === 'phone' ? DEVICE.phone : DEVICE.laptop;
  const h = w * d.aspect;
  const b = w * d.border;
  return { x: b, y: b, w: w - 2 * b, h: h - 2 * b, r: Math.max(0, w * d.radius - b * 0.8), outer: { w, h, r: w * d.radius } };
};

/** The body's faint reflection on the ground just below the device (screen space; the device's own tones fading out). */
const Reflection: React.FC<{ x: number; y: number; w: number; h: number; r: number; tone: string; ground: string; opacity: number }> = ({ x, y, w, h, r, tone, ground, opacity }) => {
  const reach = h * DEVICE.reflect.reach;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w * 0.94,
        height: reach,
        borderRadius: `0 0 ${r}px ${r}px`,
        background: `linear-gradient(180deg, ${rgbaOf(mixColor(tone, ground, 0.35), DEVICE.reflect.alpha * opacity)} 0%, ${rgbaOf(ground, 0)} 100%)`,
        transform: `translate3d(${(x - (w * 0.94) / 2).toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
        pointerEvents: 'none',
      }}
    />
  );
};

/** The contact shadow where the device meets the ground: a tight dark core under its foot (screen space). */
const Contact: React.FC<{ x: number; y: number; w: number; tone: string; opacity: number }> = ({ x, y, w, tone, opacity }) => {
  const film = useFilm();
  const u = uOf(film);
  const cw = w * (1 + DEVICE.contact.spread);
  const ch = Math.max(6 * u, w * 0.05);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: cw,
        height: ch,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, ${rgbaOf(tone, DEVICE.contact.alpha * opacity)} 0%, ${rgbaOf(tone, DEVICE.contact.alpha * 0.45 * opacity)} 55%, ${rgbaOf(tone, 0)} 100%)`,
        transform: `translate3d(${(x - cw / 2).toFixed(2)}px, ${(y - ch * 0.45).toFixed(2)}px, 0)`,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * A phone as a lit object: a graphite or silver frame lit from the key (its rim and its thickness from fx/Lit), the
 * black glass border, the island, the screen (children) under glass with a glare that slides with a declared camera
 * move, a contact shadow and a faint reflection on the ground. Held frontal and still by default (tilt 0 / 0, no sway);
 * a turn of 8-14 degrees is a declared move (animate `tilt` or `enter` from a turned pose), never a resting pose.
 */
export const Phone: React.FC<DeviceBase> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const t = p.theme ?? kitTheme();
  const ground = p.ground ?? t.ground;
  const finish = p.finish ?? (t.dark ? 'graphite' : 'silver');
  const [lit, far] = finishTones(t, finish);
  const S = screenBox('phone', p.w);
  const { w, h, r } = S.outer;
  const tilt = p.tilt ?? { x: 0, y: 0 };
  const glass = oklch(DEVICE.glassL, 0.004, toOklch(ground)[2]);
  const I = DEVICE.phone.island;
  const props = { x: p.x, y: p.y, w, h, r, tilt, ground, light: p.light ?? FILM_LIGHT, sway: p.sway ? { deg: 0.8, float: 10, ...p.sway } : (false as const), enter: p.enter, glass: { depth: 14, body: far } };
  const st = litState(p.frame, props, film);
  const shade = shadowTone(ground, 0.3);
  return (
    <>
      {p.reflect !== false && <Reflection x={st.x} y={st.y + h / 2 + 4 * u} w={w} h={h} r={r} tone={lit} ground={ground} opacity={st.opacity} />}
      <Contact x={st.x} y={st.y + h / 2} w={w} tone={shade} opacity={st.opacity} />
      <Lit frame={p.frame} {...props} id={p.id ?? 'phone'}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: `linear-gradient(135deg, ${lit} 0%, ${mixColor(lit, far, 0.55)} 45%, ${far} 100%)` }} />
        <div style={{ position: 'absolute', left: S.x * 0.45, top: S.x * 0.45, width: w - S.x * 0.9, height: h - S.x * 0.9, borderRadius: r - S.x * 0.45, background: glass }} />
        <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, height: S.h, borderRadius: S.r, overflow: 'hidden' }}>{p.children}</div>
        <div style={{ position: 'absolute', left: (w - w * I.w) / 2, top: S.y + w * I.top, width: w * I.w, height: w * I.h, borderRadius: (w * I.h) / 2, background: glass }} />
      </Lit>
    </>
  );
};

/**
 * A laptop as a lit object: the lid (a 16:10 screen in its black glass border under glass, fx/Lit with depth) standing
 * on the deck, which lies on the ground in the same perspective (its top face lit from the key, its front lip in shade),
 * a contact shadow along the deck's front and a faint reflection. Opened (`open` 0..1 from `openAt`) the lid hinges up
 * from the deck on E.settleOut.
 */
export const Laptop: React.FC<DeviceBase & { openAt?: number; openDur?: number }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const t = p.theme ?? kitTheme();
  const ground = p.ground ?? t.ground;
  const finish = p.finish ?? (t.dark ? 'graphite' : 'silver');
  const [lit, far] = finishTones(t, finish);
  const S = screenBox('laptop', p.w);
  const { w, h, r } = S.outer;
  const D = DEVICE.laptop.deck;
  const tilt = p.tilt ?? { x: 6, y: 0 }; // facing the camera, pitched just enough to show the deck
  const open = p.openAt === undefined ? 1 : prog(p.frame, p.openAt, p.openAt + (p.openDur ?? 40), E.settleOut);
  const lid = { ...tilt, x: (tilt.x ?? 0) + mix(80, 0, open) };
  const glass = oklch(DEVICE.glassL, 0.004, toOklch(ground)[2]);
  const props = { x: p.x, y: p.y, w, h, r, tilt: lid, ground, light: p.light ?? FILM_LIGHT, sway: p.sway ? { deg: 0.6, float: 8, ...p.sway } : (false as const), enter: p.enter, glass: { depth: 10, body: far } };
  const st = litState(p.frame, props, film);
  const dw = w * D.w;
  const dh = w * D.h;
  const shade = shadowTone(ground, 0.3);
  const base = `translate3d(${(st.x - dw / 2).toFixed(2)}px, ${(st.y + h / 2).toFixed(2)}px, 0) rotateZ(${st.tilt.z.toFixed(3)}deg) rotateY(${st.tilt.y.toFixed(3)}deg) rotateX(${DEVICE.laptop.deck.fold}deg)`;
  return (
    <>
      {p.reflect !== false && <Reflection x={st.x} y={st.y + h / 2 + dh * 0.9} w={dw} h={h} r={dh} tone={lit} ground={ground} opacity={st.opacity * 0.8} />}
      <Contact x={st.x} y={st.y + h / 2 + dh * 0.85} w={dw} tone={shade} opacity={st.opacity} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, perspective: '2200px', perspectiveOrigin: `${film.width / 2}px ${film.height / 2}px`, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: dw,
            height: dw * D.depth,
            borderRadius: dh,
            transformOrigin: '50% 0%',
            transform: base,
            opacity: st.opacity,
            background: `linear-gradient(180deg, ${far} 0%, ${mixColor(lit, far, 0.45)} 70%, ${mixColor(lit, far, 0.2)} 100%)`,
            boxShadow: `inset 0 ${(1.2 * u).toFixed(2)}px 0 ${rgbaOf(lit, 0.8)}, inset 0 ${(-dh * D.lip).toFixed(2)}px 0 ${rgbaOf(shade, 0.35)}`,
          }}
        />
      </div>
      <Lit frame={p.frame} {...props} id={p.id ?? 'laptop'}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: glass, boxShadow: `inset 0 0 0 ${(1.5 * u).toFixed(2)}px ${rgbaOf(lit, 0.35)}` }} />
        <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, height: S.h, borderRadius: Math.max(2 * u, S.r * 0.4), overflow: 'hidden', opacity: clamp(open * 1.4) }}>{p.children}</div>
      </Lit>
    </>
  );
};
