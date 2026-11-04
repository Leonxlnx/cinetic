// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// phone-pullback: an extreme macro on the product's name at the top of its phone app pulls back, fast and then landing,
// into the whole phone lying tilted in 3D on a clean ground; the camera travels down the phone as it pulls back, so the
// pull lands on the feed and the tab bar. A chunky 3D pointer glides in from the lower right, turning on its own axis as
// it travels, presses the raised "+" and a two-row menu pops up out of the button; the pointer settles on the first row.
// Numbers (frames at 30 fps, px at 1080): the pull-back is the measured zoom table, x2.7 -> x1 over 44 f (a fast first
// beat, a slow middle, the peak speed at 65 % of the move, a long landing); the phone is a 1000 x 2060 plane (corner
// radius 150) tilted 28 deg back, yawed -9 deg, rolled -2 deg, drawn at 1 px a unit through one homography (so every
// point of the UI, the pointer's target too, is projected exactly); a soft shadow in the accent's tint falls 10 px under
// it (50 % at 45 px); the pointer is ~120 px tip to tail, extruded 12 % toward the lower right with a white rim on its
// upper-left edge, it enters at f40, lands on the button at f53 (a half turn about its own axis on the way, edge-on at
// its fastest), presses at f55 (x0.88 about the tip in 2 f, back in 3 f); the button lightens and squeezes to 0.95; the
// menu grows out of its tail 0.35 -> 0.9 in 3 f and 1.0 by f67, no overshoot.
import React from 'react';
import { Img } from 'remotion';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { C, FONT } from '../brand/tokens';
import { ICON_GRID, ICONS } from '../kit/icons';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import { type Palette, paletteOf, type SceneMeta, span, tab, useClock } from './parts';
import { srcOf, Stage1080 } from './stage1080';

/** A feed card on the phone: who posted it, its title, a line of text, its tags and its button. */
export type PhoneCard = { who: string; meta?: string; photo?: string; title: string; body?: string; tags?: readonly string[]; action?: string };

export type PhonePullbackProps = {
  /** the product's name, set beside its mark in the app's header (the macro opens on it) */
  name: string;
  /** the product's mark: logoParts() of its SVG (default the starter's mark, painted in the palette) */
  logo?: Logo;
  /** the search field's placeholder */
  search?: string;
  /** the two segments under the search field (the first is selected) */
  tabs?: readonly [string, string];
  /** the feed: one or two cards (the first fills the phone, the second starts above the tab bar) */
  cards: readonly PhoneCard[];
  /** the two rows the "+" opens */
  menu: readonly [string, string];
  /** the four tab-bar labels around the "+" */
  nav?: readonly [string, string, string, string];
  /** ground: the floor the phone lies on; ink: text; accent: the "+", the selected tab, the pointer; paper: the phone */
  palette?: Partial<Palette>;
  /** false: no pointer (the menu still pops on its frame) */
  pointer?: boolean;
  frame?: number;
};

export const PHONE_PULLBACK = {
  dur: 84,
  pull: [0, 44] as const,
  enter: 40,
  land: 53,
  press: 55,
  menu: [57, 67] as const,
  hover: [68, 77] as const,
  tilt: 28,
  yaw: -9,
  roll: -2,
  k: 1.0, // px per design unit at the end of the pull
  from: 2.7, // the macro's magnification
} as const;

// the measured pull-back: the camera's magnification frame by frame (normalised to x2.7 -> x1)
const PULL: [number, number][] = [[0, 2.7], [1, 2.585], [2, 2.474], [3, 2.411], [4, 2.349], [6, 2.266], [8, 2.206], [10, 2.16], [12, 2.115], [14, 2.067], [16, 2.017], [18, 1.96], [20, 1.897], [22, 1.822], [24, 1.73], [26, 1.611], [28, 1.436], [30, 1.193], [32, 1.1], [34, 1.057], [36, 1.033], [38, 1.017], [40, 1.008], [42, 1.002], [44, 1]];
// the pointer's glide from the lower right onto the button: share of the path per frame (fast entry, braking)
const GLIDE: [number, number][] = [[40, 0], [41, 0.17], [42, 0.33], [43, 0.47], [44, 0.59], [45, 0.69], [46, 0.77], [47, 0.84], [48, 0.89], [49, 0.93], [50, 0.96], [51, 0.98], [52, 0.995], [53, 1]];
// the menu's growth out of its tail (scale) and the pointer's press (scale about its tip)
const POP: [number, number][] = [[57, 0.35], [60, 0.9], [62, 0.96], [64, 0.99], [67, 1]];
const PRESS: [number, number][] = [[55, 1], [57, 0.88], [60, 1]];

// the phone in design units: its body, the header, the search field, the segments, the feed, the tab bar and the "+"
const PW = 1000;
const PH = 2060;
const PR = 150;
const FAB = { x: 500, y: 1832, r: 72 };
const POPOVER = { w: 630, tall: 250, bottom: 1752, tail: 30 };
const HEADER = { x: 70, y: 128, mark: 92 };

type Pose = { k: number; tilt: number; yaw: number; roll: number; ox: number; oy: number };
const FOCAL = 1700;
/** Screen position (px at 1080) of a design point (du) on the phone for a pose (perspective about the frame's centre). */
export const phonePoint = (x: number, y: number, p: Pose): [number, number] => {
  const a = (p.tilt * Math.PI) / 180;
  const b = (p.yaw * Math.PI) / 180;
  const c = (p.roll * Math.PI) / 180;
  const lx = (x - PW / 2) * p.k;
  const ly = (y - PH) * p.k; // about the bottom edge's centre
  const Y = ly * Math.cos(a);
  const Z = ly * Math.sin(a); // the top leans away
  const X2 = lx * Math.cos(b) - Z * Math.sin(b);
  const Z2 = lx * Math.sin(b) + Z * Math.cos(b);
  const X3 = X2 * Math.cos(c) - Y * Math.sin(c);
  const Y3 = X2 * Math.sin(c) + Y * Math.cos(c);
  const f = FOCAL / (FOCAL - Z2);
  return [960 + (p.ox - 960 + X3) * f, 540 + (p.oy - 540 + Y3) * f];
};

type Pt = readonly [number, number];
export type Quad = readonly [Pt, Pt, Pt, Pt]; // top-left, top-right, bottom-right, bottom-left
/** The CSS matrix3d that maps a w x h box (transform-origin 0 0) onto a quad: a projective (homography) map. */
export const quadMatrix = (w: number, h: number, q: Quad) => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(den) < 1e-9 ? 0 : (sx * dy2 - dx2 * sy) / den;
  const hh = Math.abs(den) < 1e-9 ? 0 : (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + hh * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + hh * y3;
  const n = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v).toPrecision(9);
  return `matrix3d(${n(a / w)},${n(d / w)},0,${n(g / w)},${n(b / h)},${n(e / h)},0,${n(hh / h)},0,0,1,0,${n(x0)},${n(y0)},0,1)`;
};

/** The final pose (where the pull lands) and the camera at frame t: magnification, the point it pulls toward. */
const POSE: Pose = { k: PHONE_PULLBACK.k, tilt: PHONE_PULLBACK.tilt, yaw: PHONE_PULLBACK.yaw, roll: PHONE_PULLBACK.roll, ox: 980, oy: 1010 };
/** The camera at frame t; `headX` is the centre (du) of the mark and the name together, where the macro opens. */
export const phoneCamera = (t: number, headX = 300) => {
  const HEAD_C = { x: headX, y: HEADER.y + HEADER.mark / 2 };
  const s = tab(t, PULL);
  const q = (PHONE_PULLBACK.from - s) / (PHONE_PULLBACK.from - 1); // 0 at the macro, 1 landed
  const head = phonePoint(HEAD_C.x, HEAD_C.y, POSE);
  // the screen point the camera holds: the frame's centre on the macro, travelling with the pull to the landed framing
  const ax = 960 + (head[0] - 960) * q;
  const ay = 540 + (head[1] - 540) * q;
  return { s, q, map: (p: Pt): Pt => [ax + s * (p[0] - head[0]), ay + s * (p[1] - head[1])] };
};

const Ico: React.FC<{ name: keyof typeof ICONS; x: number; y: number; size: number; color: string; fill?: boolean }> = ({ name, x, y, size, color, fill }) => (
  <svg width={size} height={size} viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`} style={{ position: 'absolute', left: x, top: y }}>
    <path d={fill ? ICONS[name].fill : ICONS[name].regular} fill={color} />
  </svg>
);

/** The chunky 3D pointer: a rounded arrowhead, its extruded side toward the lower right, a rim of light, a soft shadow. */
const ARROW = 'M8 6 L96 40 C103 43 103 52 96 54 L58 64 C55 65 53 67 52 70 L42 108 C40 115 31 115 29 108 L4 14 C2 8 3 4 8 6 Z';
const ChunkyPointer: React.FC<{ x: number; y: number; size: number; turn: number; press: number; P: Palette; uid: string }> = ({ x, y, size, turn, press, P, uid }) => {
  const k = size / 120;
  const face = Math.abs(Math.cos(turn)); // the half turn about its own vertical axis: edge-on at its fastest
  const back = Math.cos(turn) < 0;
  const top = mixColor(P.accent, P.paper, back ? 0.05 : 0.18);
  const rear = mixColor(P.accent, P.paper, back ? 0.45 : 0.72);
  const side = mixColor(P.accent, P.ink, 0.28);
  const depth = 14; // the extrusion, units of the 120 box
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(k * press).toFixed(4)}) scaleX(${Math.max(0.06, face).toFixed(4)})`, transformOrigin: '0 0' }}>
      <svg width={130} height={130} viewBox="0 0 130 130" style={{ position: 'absolute', left: -6, top: -6, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}t`} x1="0.05" y1="0.05" x2="0.8" y2="0.8">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={rear} />
          </linearGradient>
          <filter id={`${uid}s`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g transform="translate(6 6)">
          <path d={ARROW} fill={withAlpha(mixColor(P.accent, P.ink, 0.5), 0.3)} transform="translate(9 12)" filter={`url(#${uid}s)`} />
          {Array.from({ length: depth }, (_, i) => depth - i).map((i) => (
            <path key={i} d={ARROW} fill={side} transform={`translate(${(i * 0.62).toFixed(2)} ${(i * 0.62).toFixed(2)})`} />
          ))}
          <path d={ARROW} fill={`url(#${uid}t)`} />
          <path d="M8 6 L96 40 M8 6 L4 14 L29 108" fill="none" stroke={withAlpha(P.paper, 0.9)} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};

export const PhonePullback: React.FC<PhonePullbackProps> = ({ name, logo, search = 'Search', tabs = ['For you', 'Following'], cards, menu, nav = ['Home', 'Explore', 'Inbox', 'You'], palette, pointer = true, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const lg = React.useMemo(() => logo ?? logoParts(SAMPLE_MARK_SVG.split(C.accent).join(P.accent).split(C.ink).join(P.ink)), [logo, P.accent, P.ink]);
  const nameW = measureTracked(name, 66, 700, -0.025, FONT.ui);
  const cam = phoneCamera(t, (2 * HEADER.x + HEADER.mark + 22 + nameW) / 2);
  const corner = (x: number, y: number) => cam.map(phonePoint(x, y, POSE));
  const quad: Quad = [corner(0, 0), corner(PW, 0), corner(PW, PH), corner(0, PH)];
  // the shadow: the body's outline projected, blurred in screen space, offset down
  const outline: Pt[] = [];
  const cornerArc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = ((a0 + (i * 90) / 6) * Math.PI) / 180;
      outline.push(corner(cx + PR * Math.cos(a), cy + PR * Math.sin(a)));
    }
  };
  cornerArc(PW - PR, PR, -90);
  cornerArc(PW - PR, PH - PR, 0);
  cornerArc(PR, PH - PR, 90);
  cornerArc(PR, PR, 180);
  const halo = mixColor(P.accent, P.ground, 0.45);
  // the press, the menu and the hover
  const pressed = clamp(E.snapOut(span(t, PHONE_PULLBACK.press, PHONE_PULLBACK.press + 2))) * (1 - E.glideOut(span(t, PHONE_PULLBACK.press + 8, PHONE_PULLBACK.press + 10)));
  const pop = t < PHONE_PULLBACK.menu[0] ? 0 : tab(t, POP);
  const popA = E.snapOut(span(t, PHONE_PULLBACK.menu[0], PHONE_PULLBACK.menu[0] + 4));
  const hover = E.glideOut(span(t, PHONE_PULLBACK.hover[0] + 6, PHONE_PULLBACK.hover[1]));
  // the pointer: from below the frame's right edge onto the "+", a half turn on the way, then up onto the first row
  const fab = corner(FAB.x + 6, FAB.y + 4);
  const row1 = corner(POPOVER.w * 0.16 + FAB.x - POPOVER.w / 2 + 60, POPOVER.bottom - POPOVER.tail - POPOVER.tall * 0.72);
  const g = tab(t, GLIDE);
  const toRow = E.stdInOut(span(t, PHONE_PULLBACK.hover[0], PHONE_PULLBACK.hover[1]));
  const start: Pt = [fab[0] + 760, fab[1] + 420];
  const px = start[0] + (fab[0] - start[0]) * g + (row1[0] - fab[0]) * toRow;
  const py = start[1] + (fab[1] - start[1]) * g + (row1[1] - fab[1]) * toRow;
  const turn = Math.PI * (1 - g);
  const press = tab(t, PRESS);
  const ink2 = mixColor(P.ink, P.paper, 0.45);
  const soft = mixColor(P.paper, P.ink, 0.045);
  const line = mixColor(P.paper, P.ink, 0.1);
  const card = cards[0];
  const card2 = cards[1] ?? cards[0];
  const fabFill = mixColor(P.accent, P.paper, 0.38 * pressed);
  const text = (s: string, x: number, y: number, size: number, weight: number, color: string, extra: React.CSSProperties = {}) => (
    <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT.ui, fontSize: size, fontWeight: weight, lineHeight: 1.18, color, whiteSpace: 'nowrap', letterSpacing: '-0.01em', ...extra }}>{s}</div>
  );
  const avatar = (src: string | undefined, label: string, x: number, y: number, d: number) => (
    <div style={{ position: 'absolute', left: x, top: y, width: d, height: d, borderRadius: '50%', overflow: 'hidden', background: mixColor(P.accent, P.paper, 0.7), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.ui, fontWeight: 600, fontSize: d * 0.38, color: P.accent }}>
      {src ? <Img src={srcOf(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : label.slice(0, 1)}
    </div>
  );
  const uid = 'phonepull';
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {/* the shadow under the tilted phone */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: `blur(${(26 * cam.s).toFixed(1)}px)` }}>
        <polygon points={outline.map((p) => `${p[0].toFixed(1)},${(p[1] + 10 * cam.s).toFixed(1)}`).join(' ')} fill={withAlpha(halo, 0.55)} />
      </svg>
      {/* the phone: its face is the screen (no bezel), one homography for every point of it */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH, transformOrigin: '0 0', transform: quadMatrix(PW, PH, quad), borderRadius: PR, overflow: 'hidden', background: P.paper, boxShadow: `inset 0 0 0 2px ${withAlpha(P.paper, 1)}` }}>
        {/* header: the mark and the name (the macro), the bell, the avatar */}
        <div style={{ position: 'absolute', left: HEADER.x, top: HEADER.y }}>
          <LogoMark logo={lg} size={HEADER.mark} />
        </div>
        {text(name, HEADER.x + HEADER.mark + 22, HEADER.y + 10, 66, 700, P.ink, { letterSpacing: '-0.025em' })}
        <Ico name="bell" x={770} y={HEADER.y + 14} size={64} color={P.ink} />
        <div style={{ position: 'absolute', left: 816, top: HEADER.y + 12, width: 22, height: 22, borderRadius: 11, background: P.accent, boxShadow: `0 0 0 5px ${P.paper}` }} />
        {avatar(card.photo, card.who, 862, HEADER.y, 92)}
        {/* search */}
        <div style={{ position: 'absolute', left: 60, top: 296, width: 880, height: 116, borderRadius: 58, background: P.paper, boxShadow: `0 10px 34px ${withAlpha(P.ink, 0.08)}, 0 0 0 2px ${line}` }} />
        <Ico name="search" x={104} y={326} size={56} color={ink2} />
        {text(search, 186, 330, 42, 450, ink2)}
        {/* the two segments */}
        <div style={{ position: 'absolute', left: 60, top: 452, width: 880, height: 108, borderRadius: 54, background: soft }} />
        <div style={{ position: 'absolute', left: 66, top: 458, width: 434, height: 96, borderRadius: 48, background: P.paper, boxShadow: `0 6px 18px ${withAlpha(P.ink, 0.08)}` }} />
        {text(tabs[0], 66, 482, 40, 600, P.ink, { width: 434, textAlign: 'center' })}
        {text(tabs[1], 500, 482, 40, 500, ink2, { width: 434, textAlign: 'center' })}
        {/* the first card */}
        <div style={{ position: 'absolute', left: 40, top: 604, width: 920, height: 920, borderRadius: 44, background: soft }} />
        {avatar(card.photo, card.who, 84, 648, 118)}
        {text(card.who, 230, 660, 46, 600, P.ink)}
        {card.meta ? text(card.meta, 230, 716, 36, 450, ink2) : null}
        <Ico name="heart" x={800} y={668} size={64} color={P.accent} fill />
        <div style={{ position: 'absolute', left: 84, top: 812, width: 830, fontFamily: FONT.ui, fontSize: 56, fontWeight: 650, lineHeight: 1.16, letterSpacing: '-0.02em', color: P.ink, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.title}</div>
        {card.body ? (
          <div style={{ position: 'absolute', left: 84, top: 974, width: 830, fontFamily: FONT.ui, fontSize: 38, fontWeight: 450, lineHeight: 1.36, color: ink2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.body}</div>
        ) : null}
        <div style={{ position: 'absolute', left: 84, top: 1166, display: 'flex', gap: 22 }}>
          {(card.tags ?? []).slice(0, 2).map((tg, i) => (
            <div key={i} style={{ padding: '14px 30px', borderRadius: 36, background: mixColor(P.accent, P.paper, i === 0 ? 0.86 : 0.92), color: mixColor(P.accent, P.ink, i === 0 ? 0.1 : 0.3), fontFamily: FONT.ui, fontSize: 36, fontWeight: 550, whiteSpace: 'nowrap' }}>{tg}</div>
          ))}
        </div>
        {card.action ? (
          <div style={{ position: 'absolute', left: 84, top: 1330, width: 832, height: 118, borderRadius: 30, background: P.accent, color: P.paper, fontFamily: FONT.ui, fontSize: 42, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.action}</div>
        ) : null}
        {/* the second card, starting above the tab bar */}
        <div style={{ position: 'absolute', left: 40, top: 1572, width: 920, height: 400, borderRadius: 44, background: soft }} />
        {avatar(card2.photo, card2.who, 84, 1612, 104)}
        {text(card2.who, 220, 1622, 44, 600, P.ink)}
        {card2.meta ? text(card2.meta, 220, 1676, 34, 450, ink2) : null}
        {/* the tab bar */}
        <div style={{ position: 'absolute', left: 0, top: 1786, width: PW, height: PH - 1786, background: mixColor(P.paper, P.ink, 0.03), boxShadow: `0 -2px 0 ${line}, 0 -16px 30px ${withAlpha(P.ink, 0.04)}` }} />
        {(['house', 'folder', 'chat', 'user'] as const).map((ic, i) => {
          const x = [110, 290, 690, 870][i];
          const on = i === 0;
          return (
            <React.Fragment key={ic}>
              <Ico name={ic} x={x - 30} y={1848} size={60} color={on ? P.accent : ink2} fill={on} />
              {text(nav[i], x - 110, 1922, 32, on ? 600 : 500, on ? P.accent : ink2, { width: 220, textAlign: 'center' })}
            </React.Fragment>
          );
        })}
        {/* the raised "+" */}
        <div style={{ position: 'absolute', left: FAB.x - FAB.r, top: FAB.y - FAB.r, width: 2 * FAB.r, height: 2 * FAB.r, borderRadius: '50%', background: fabFill, transform: `scale(${(1 - 0.05 * pressed).toFixed(4)})`, boxShadow: `0 10px 24px ${withAlpha(P.accent, 0.3)}` }}>
          <div style={{ position: 'absolute', left: FAB.r - 28, top: FAB.r - 5, width: 56, height: 10, borderRadius: 5, background: P.paper }} />
          <div style={{ position: 'absolute', left: FAB.r - 5, top: FAB.r - 28, width: 10, height: 56, borderRadius: 5, background: P.paper }} />
        </div>
        {/* the menu, grown out of its tail above the "+" */}
        {pop > 0 ? (
          <div style={{ position: 'absolute', left: FAB.x - POPOVER.w / 2, top: POPOVER.bottom - POPOVER.tail - POPOVER.tall, width: POPOVER.w, height: POPOVER.tall, opacity: popA, transformOrigin: `${POPOVER.w / 2}px ${POPOVER.tall + POPOVER.tail}px`, transform: `scale(${pop.toFixed(4)})` }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: P.paper, boxShadow: `0 18px 50px ${withAlpha(mixColor(P.accent, P.ink, 0.3), 0.3)}, 0 0 0 2px ${withAlpha(P.ink, 0.04)}` }} />
            <div style={{ position: 'absolute', left: POPOVER.w / 2 - 28, top: POPOVER.tall - 30, width: 56, height: 56, background: P.paper, transform: 'rotate(45deg)', borderRadius: 8 }} />
            <div style={{ position: 'absolute', left: 14, top: 14, width: POPOVER.w - 28, height: POPOVER.tall / 2 - 18, borderRadius: 20, background: withAlpha(P.accent, 0.1 * hover) }} />
            {text(menu[0], 0, 38, 40, 600, P.accent, { width: POPOVER.w, textAlign: 'center' })}
            <div style={{ position: 'absolute', left: 40, top: POPOVER.tall / 2, width: POPOVER.w - 80, height: 2, background: line }} />
            {text(menu[1], 0, POPOVER.tall / 2 + 34, 40, 600, P.accent, { width: POPOVER.w, textAlign: 'center' })}
          </div>
        ) : null}
      </div>
      {pointer && t >= PHONE_PULLBACK.enter ? <ChunkyPointer x={px} y={py} size={120} turn={turn} press={press} P={P} uid={uid} /> : null}
    </Stage1080>
  );
};

// the boxes the scene takes over and hands on (px at 1080): the mark at the macro's first frame, the menu at the end
const handBox = (t: number, x0: number, y0: number, x1: number, y1: number) => {
  const cam = phoneCamera(t);
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => cam.map(phonePoint(x, y, POSE)));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: Math.round(Math.min(...xs)), y: Math.round(Math.min(...ys)), w: Math.round(Math.max(...xs) - Math.min(...xs)), h: Math.round(Math.max(...ys) - Math.min(...ys)) };
};

export const phonePullbackMeta: SceneMeta = {
  id: 'phone-pullback',
  does: 'a macro on the product\'s name in its phone app pulls back into the whole phone tilted in 3D; a chunky 3D pointer presses the "+" and its menu pops',
  dur: PHONE_PULLBACK.dur,
  props: ['name', 'logo?', 'search?', 'tabs?', 'cards', 'menu', 'nav?', 'palette?', 'pointer?'],
  handIn: { form: 'mark', ...handBox(0, HEADER.x, HEADER.y, HEADER.x + HEADER.mark, HEADER.y + HEADER.mark) },
  handOut: { form: 'card', ...handBox(PHONE_PULLBACK.dur, FAB.x - POPOVER.w / 2, POPOVER.bottom - POPOVER.tail - POPOVER.tall, FAB.x + POPOVER.w / 2, POPOVER.bottom - POPOVER.tail), r: 24 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'pull-back', weight: 0.5 },
    { f: 26, kind: 'whoosh', id: 'pull-peak', weight: 0.4 },
    { f: 44, kind: 'land', id: 'phone', weight: 0.4 },
    { f: PHONE_PULLBACK.press, kind: 'click', id: 'press', weight: 0.8 },
    { f: PHONE_PULLBACK.menu[0] + 1, kind: 'pop', id: 'menu', weight: 0.7 },
    { f: PHONE_PULLBACK.hover[1] - 2, kind: 'tick', id: 'row', weight: 0.3 },
  ],
};
