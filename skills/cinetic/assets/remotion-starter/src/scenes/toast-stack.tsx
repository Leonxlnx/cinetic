// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// toast-stack: notifications land one after another and pile into a stack seen in depth on a full colour ground: the
// newest is always the front, top, sharp one; every older toast steps one slot back, smaller, lower, darker and more
// blurred, like a deck seen from slightly above. The whole stack climbs from below the frame into place while they
// arrive, then holds on a slow drift up and a slow push-in. An optional running total counts up with every arrival.
// Numbers (frames at 30 fps, px at 1080): the front toast 1376 x 215 (radius 72) at top 120; slots behind at scale
// 0.943 / 0.894 / 0.849 / 0.807, blur 4 / 4.8 / 5.6 / 12 px, brightness 92 / 85 / 78 / 70 %, ~195 / 170 / 145 / 120 px of
// each showing; arrivals 7, 4, 4, 4 f apart, each new toast rising 120 px into the front slot at 0.95 scale, 60 %
// opacity and 6 px blur, landing in 6 f (59 / 76 / 87 / 93 / 96 / 98 / 100 %); the stack climbs 804 px to rest by 24 f,
// then drifts 1.5 px/f up and pushes in 3 %. Nothing fades and nothing turns. The stack is framed as the frame's subject:
// 1376 px wide (72 % of the frame), its rest extent (the front toast's top to the last slot's bottom, for the number of
// toasts it holds) centred on the frame's height, the push centred on it; a toast shows a real face (`photo`) or a mark.
// The subject from the first frame: the first toast lands on frame 0 whatever their number (the rest on the beats after
// it), and a short stack climbs less, so that toast's top is on screen (900 px down at most) from the first frame.
import React from 'react';
import { Img } from 'remotion';
import { C, FONT } from '../brand/tokens';
import { type IconName } from '../kit/icons';
import { type LogoRef } from '../kit/logos';
import { Mark, skinOf } from '../kit/screens/base';
import { clamp, E, zoomAt } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { paletteOf, perFrame, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

/** One notification: its title, body and age; its icon a real face or picture (`photo`), else the app's mark or a glyph. */
export type Toast = { title: string; body: string; ago: string; app?: LogoRef; glyph?: IconName; photo?: string };

export type ToastStackProps = {
  /** oldest first: the first lands alone and climbs, the last is the newest and ends in front (five read best) */
  items: Toast[];
  /** a running total over the stack, counting up with each arrival ("$185", "Today") */
  total?: { from: number; to: number; prefix?: string; suffix?: string; label?: string };
  /** ground: the full colour field (default the accent); ink: the toasts' dark fill; paper: their type */
  palette?: Partial<Palette>;
  frame?: number;
};

export const TOASTS = {
  dur: 48,
  arrive: [0, 7, 11, 15, 19] as const,
  rest: 24,
} as const;

// slot geometry at rest (slot 0 = front): top y, scale, blur px, brightness; slot 5 is where a toast leaves the stack
const SLOTS: [number, number, number, number][] = [
  [120, 1, 0, 1],
  [325, 0.943, 4, 0.92],
  [515, 0.894, 4.8, 0.85],
  [685, 0.849, 5.6, 0.78],
  [830, 0.807, 12, 0.7],
  [955, 0.77, 15, 0.62],
];
const ENTRY = perFrame(0, [0, 0.59, 0.76, 0.87, 0.93, 0.96, 0.98, 1]);
// the stack's climb: how far below its rest place the front slot is (px)
const CLIMB: [number, number][] = [[0, 804], [1, 756], [2, 730], [3, 710], [4, 696], [5, 686], [6, 678], [8, 580], [11, 470], [13, 358], [16, 246], [18, 190], [20, 106], [22, 46], [24, 22], [34, 2], [39, -4], [45, -10], [48, -13]];
const SMEAR = [3, 6, 10, 16] as const;
const TOAST = { w: 1376, h: 215, r: 72, icon: 140, iconR: 34, padL: 34, textL: 227 } as const;

/**
 * The stack at rest for n toasts (px at 1080): its top (the front toast's), its bottom (the last slot's) and the shift
 * that centres that extent on the frame's height (the room a total takes above it included). Pure: the tests read it.
 */
export const stackFrame = (n: number, withTotal = false) => {
  const k = Math.max(1, Math.min(5, n));
  const last = SLOTS[k - 1];
  const top = SLOTS[0][0] - (withTotal ? 70 + 24 : 0);
  const bottom = last[0] + TOAST.h * last[1] + (withTotal ? 70 : 0);
  return { top, bottom, w: TOAST.w, x: 960 - TOAST.w / 2, shift: 540 - (top + bottom) / 2 };
};

/** When each of n toasts lands (frames): the first on the scene's first frame, the rest on the arrival beats after it. */
export const toastArrivals = (n: number) => TOASTS.arrive.slice(0, Math.max(1, Math.min(TOASTS.arrive.length, n)));

// the stack's climb (px below its rest place) at frame t for n toasts: the measured climb, shortened when the stack is
// short, so that the first toast's top is on screen from the first frame (FIRST_TOP px down at most)
const FIRST_TOP = 900;
const climbFor = (t: number, n: number, withTotal = false) => {
  const restTop = SLOTS[0][0] + (withTotal ? 70 : 0) + stackFrame(n, withTotal).shift; // the front toast's top at rest
  const k = clamp((FIRST_TOP - restTop) / CLIMB[0][1], 0, 1);
  const c = tab(t, CLIMB);
  return c > 0 ? c * k : c;
};

/** Screen y (px at 1080) of the first toast's top at frame t, for n toasts (with a total or not). Pure: the tests read it. */
export const toastFirstTop = (t: number, n: number, withTotal = false) => {
  const arrive = toastArrivals(n);
  let s = 0;
  for (let j = 1; j < arrive.length; j++) s += tab(t - arrive[j], ENTRY);
  const y = slotAt(s)[0] + (withTotal ? 70 : 0) + climbFor(t, n, withTotal);
  const k = zoomAt(t, TOASTS.rest, TOASTS.dur, 1, 1.03, E.softOut) * (withTotal ? 0.94 : 1);
  return 540 + (y - 540 + stackFrame(n, withTotal).shift) * k;
};

/** Slot geometry at a fractional slot s (0 front .. 5 gone). */
const slotAt = (s: number) => {
  const i = Math.min(4, Math.floor(clamp(s, 0, 4.999)));
  const q = clamp(s - i, 0, 1);
  const a = SLOTS[i];
  const b = SLOTS[i + 1];
  return a.map((v, k) => v + (b[k] - v) * q) as [number, number, number, number];
};

export const ToastStack: React.FC<ToastStackProps> = ({ items, total, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const ground = palette?.ground ?? P.accent;
  const fill = palette?.ink ?? mixColor(C.ink, P.accent, 0.16);
  const paper = P.paper;
  const sub = mixColor(paper, fill, 0.26);
  const meta = mixColor(paper, fill, 0.42);
  const skin = skinOf('dark', fill, P.accent);
  const list = items.slice(-TOASTS.arrive.length);
  const arrive = toastArrivals(list.length);
  const climb = climbFor(t, list.length, !!total);
  const lift = total ? 70 : 0; // room for the total above the stack (the stack drawn at 0.94)
  const fitK = total ? 0.94 : 1;
  const frame0 = stackFrame(list.length, !!total);
  const centre = frame0.shift; // the stack's rest extent centred on the frame's height
  // the climb's speed smears the stack vertically once it is fast (over 30 px/f: the slow first frames stay sharp)
  const speed = Math.abs(climbFor(t + 0.5, list.length, !!total) - climbFor(t - 0.5, list.length, !!total));
  const smear = speed > 30 ? SMEAR.reduce((a, b) => (Math.abs(b - speed / 5) < Math.abs(a - speed / 5) ? b : a)) : 0;
  const push = zoomAt(t, TOASTS.rest, TOASTS.dur, 1, 1.03, E.softOut);
  const lines = mixColor(ground, paper, 0.08);
  const arrivedShare = (j: number) => tab(t - arrive[j], ENTRY);
  const count = total ? total.from + (total.to - total.from) * (list.reduce((a, _, j) => a + arrivedShare(j), 0) / Math.max(1, list.length)) : 0;
  return (
    <Stage1080 W={W} H={H} ground={ground}>
      {/* the ground's faint lines */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        <g stroke={lines} strokeWidth={2} fill="none">
          <path d="M0 430 L430 0 M1490 0 L1920 430" />
          <circle cx={960} cy={1900} r={1150} />
          <circle cx={960} cy={1900} r={1250} />
        </g>
      </svg>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {SMEAR.map((b) => (
            <filter key={b} id={`toast-stack-smear-${b}`} x="-5%" y="-20%" width="110%" height="140%">
              <feGaussianBlur stdDeviation={`0 ${b}`} />
            </filter>
          ))}
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${centre.toFixed(2)}px) scale(${(push * fitK).toFixed(4)})`, transformOrigin: `960px ${(540 - centre).toFixed(1)}px`, filter: smear ? `url(#toast-stack-smear-${smear})` : undefined }}>
        {total && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, transform: `translate(0px, ${(60 + climb * 0.35).toFixed(1)}px)`, opacity: E.snapOut(span(t, 2, 8)), display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 22, fontFamily: FONT.text, color: paper, whiteSpace: 'pre' }}>
            <span data-text="toast-total" style={{ fontSize: 84, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {`${total.prefix ?? ''}${Math.round(count).toLocaleString('en-US')}${total.suffix ?? ''}`}
            </span>
            {total.label && <span style={{ fontSize: 44, fontWeight: 450, color: withAlpha(paper, 0.72) }}>{total.label}</span>}
          </div>
        )}
        {list
          .map((it, k) => {
            if (t < arrive[k]) return null;
            const entry = k === 0 ? 1 : tab(t - arrive[k], ENTRY);
            let s = 0;
            for (let j = k + 1; j < list.length; j++) s += tab(t - arrive[j], ENTRY);
            if (s >= 5) return null;
            const [top, sc, blur, bright] = slotAt(s);
            const y = top + lift + climb + (1 - entry) * 120;
            const scale = sc * (0.95 + 0.05 * entry);
            const b = blur + (1 - entry) * 6;
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: TOAST.w,
                  height: TOAST.h,
                  transform: `translate(${960 - TOAST.w / 2}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})`,
                  transformOrigin: '50% 0%',
                  zIndex: 10 + k,
                  opacity: (0.6 + 0.4 * entry) * (s > 4 ? 1 - (s - 4) : 1),
                  filter: `${b > 0.05 ? `blur(${b.toFixed(2)}px) ` : ''}brightness(${bright.toFixed(3)})`,
                }}
              >
                <div style={{ position: 'absolute', inset: 0, borderRadius: TOAST.r, background: fill, boxShadow: '0 18px 40px rgba(0,0,0,0.28)' }} />
                <div style={{ position: 'absolute', left: TOAST.padL, top: (TOAST.h - TOAST.icon) / 2 }}>
                  {it.photo ? (
                    <div style={{ width: TOAST.icon, height: TOAST.icon, borderRadius: '50%', overflow: 'hidden', boxShadow: `inset 0 0 0 2px ${withAlpha(paper, 0.16)}` }}>
                      <Img src={it.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <Mark skin={skin} size={TOAST.icon} logo={it.app} glyph={it.glyph ?? 'dollar'} />
                  )}
                </div>
                <div style={{ position: 'absolute', left: TOAST.textL, top: 36, right: 36, fontFamily: FONT.ui, whiteSpace: 'pre', lineHeight: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span data-text={`toast-title-${k}`} style={{ fontSize: 60, fontWeight: 600, color: paper, letterSpacing: '-0.01em' }}>{it.title}</span>
                    <span style={{ fontSize: 38, fontWeight: 450, color: meta }}>{it.ago}</span>
                  </div>
                  <div data-text={`toast-body-${k}`} style={{ marginTop: 22, fontSize: 54, fontWeight: 400, color: sub }}>{it.body}</div>
                </div>
              </div>
            );
          })
          .reverse()}
      </div>
    </Stage1080>
  );
};

export const toastStackMeta: SceneMeta = {
  id: 'toast-stack',
  does: 'notifications land one after another and pile into a depth stack on a colour field, the newest in front, while the stack climbs into place; an optional total counts up',
  dur: TOASTS.dur,
  props: ['items', 'total?', 'palette?'],
  handIn: null,
  handOut: { form: 'notice', x: 272, y: 110, w: 1376, h: 215, r: 72 },
  klass: 'quiet',
  cues: [
    { f: 4, kind: 'bell', id: 'first', weight: 0.7 },
    { f: 7, kind: 'pop', id: 'arrive-2', weight: 0.6 },
    { f: 11, kind: 'pop', id: 'arrive-3', weight: 0.6 },
    { f: 15, kind: 'pop', id: 'arrive-4', weight: 0.6 },
    { f: 19, kind: 'pop', id: 'arrive-5', weight: 0.5 },
  ],
};
