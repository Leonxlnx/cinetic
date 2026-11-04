// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// photo-counters: a real photograph of the person the product serves, in their place, enters as a duotone in the
// brand's colours and develops to full colour while the camera pushes in; lit glass cards land around them, each
// counting a figure up (the digits that changed in the last two frames lit), until a last push carries
// everything into the next scene.
// Numbers (frames at 30 fps, px at 1080; measured): duotone 4 f, developed by 8 f; the push x1.10 by 25 f on the
// measured ease-out with the frame's centre drifting 23 / 24 px, a hold creeping x1.004, an exit push to x1.19 over the
// last 5 f; the big card rises 200 px into place in 6 f, the small ones grow 0.6 -> 1 in 2 f (at 11 and 18 f), type
// centred on a colour band across a pale card; every counter counts linearly, every frame, to its last value at 38 f
// (read for 9 f before the exit push); cards radius 28, white type, a dark status pill.
// Framing: the cards are the frame's subject, placed by composition for their number (cardLayout): one card large and
// centred (43 % of the frame's width; `place` 'left' or 'right' sets it on a third, clear of the photo's subject), two
// side by side across the centre, three as a large centre card between two smaller ones; never tucked in a corner.
import React from 'react';
import { Img } from 'remotion';
import { FONT } from '../brand/tokens';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import { type Palette, paletteOf, type SceneMeta, span, tab, useClock } from './parts';

export type CounterCard = {
  title: string;
  sub: string;
  from: number;
  to: number;
  /** how a value reads (default "$1,083") */
  format?: (v: number) => string;
  /** the status pill under the figure (default none) */
  chip?: string;
};
export type PhotoCountersProps = {
  /** a real photograph of a person in their context (landscape, 1920 px or more) */
  photo: string;
  /** one to three cards: the first is the big one (cardLayout places them by their number) */
  cards: readonly CounterCard[];
  /** one card only: centred (default), or on the left or right third, clear of the photo's subject */
  place?: 'centre' | 'left' | 'right';
  palette?: Partial<Palette>;
  frame?: number;
};

export const COUNTERS = { dur: 52, develop: [4, 8] as const, count: 38, exit: 47 } as const;
const PUSH: [number, number][] = [[0, 1], [1, 1.0069], [3, 1.0123], [4, 1.0206], [5, 1.026], [6, 1.035], [7, 1.043], [10, 1.0502], [11, 1.0522], [12, 1.0618], [13, 1.0648], [15, 1.0727], [16, 1.0742], [17, 1.0814], [18, 1.0831], [19, 1.0878], [21, 1.0909], [22, 1.095], [23, 1.0957], [24, 1.0974], [25, 1.0977], [30, 1.0988], [33, 1.1012], [40, 1.1021], [45, 1.1029], [46, 1.1051], [47, 1.1125], [48, 1.1269], [49, 1.1588], [51, 1.1879]];
const DX: [number, number][] = [[0, 3], [7, 13], [13, 17], [19, 20], [25, 23], [51, 27]];
const DY: [number, number][] = [[0, 3], [7, 13], [13, 20], [19, 26], [25, 24], [48, 30], [51, 34]];
// the cards: element box (px at 1080), their entry, the type sizes (title, sub, figure), the rows (title, sub, figure,
// pill) and the colour band as shares of the card's height
type Slot = { x: number; y: number; w: number; h: number; cardH: number; enter: number; kind: 'rise' | 'grow'; title: number; figure: number; starts: number; rows: [number, number, number, number]; band: number };
const BIG = { w: 820, h: 560, title: 72, figure: 200, rows: [0.15, 0.25, 0.57, 0.84] as [number, number, number, number], band: 0.56 };
/**
 * Where the cards stand for their number (px at 1080): one large card centred (or on a third with `place`), two side by
 * side across the centre, three as a large centre card between two smaller ones (upper left, lower right). Pure: the
 * tests read it.
 */
export const cardLayout = (n: number, place: 'centre' | 'left' | 'right' = 'centre'): Slot[] => {
  const big = (cx: number): Slot => ({ x: cx - BIG.w / 2, y: 540 - BIG.h / 2, w: BIG.w, h: BIG.h, cardH: BIG.h, enter: 2, kind: 'rise', title: BIG.title, figure: BIG.figure, starts: 4, rows: BIG.rows, band: BIG.band });
  if (n <= 1) return [big(place === 'left' ? 640 : place === 'right' ? 1280 : 960)];
  if (n === 2) {
    const w = 640;
    const h = 500;
    const gap = 120;
    const x0 = 960 - w - gap / 2;
    const card = (x: number, enter: number, starts: number): Slot => ({ x, y: 540 - h / 2, w, h, cardH: h, enter, kind: 'rise', title: 60, figure: 160, starts, rows: [0.16, 0.26, 0.57, 0.84], band: 0.56 });
    return [card(x0, 2, 4), card(x0 + w + gap, 8, 10)];
  }
  const small = (x: number, y: number, enter: number): Slot => ({ x, y, w: 340, h: 340, cardH: 340, enter, kind: 'grow', title: 38, figure: 96, starts: enter + 1, rows: [0.16, 0.26, 0.53, 0.8], band: 0.52 });
  return [big(960), small(120, 150, 11), small(1460, 590, 18)];
};
const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export const PhotoCounters: React.FC<PhotoCountersProps> = ({ photo, cards, place = 'centre', palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const s = tab(t, PUSH);
  const develop = E.softOut(span(t, COUNTERS.develop[0], COUNTERS.develop[1]));
  const deep = mixColor(P.accent, P.ink, 0.55);
  const light = mixColor(P.lift, P.paper, 0.55);
  const fid = 'photo-counters-duotone';
  const rgb = (c: string) => {
    const m = mixColor(c, c, 0).match(/\d+/g) ?? ['0', '0', '0'];
    return m.slice(0, 3).map((x) => Number(x) / 255);
  };
  const [d, m, l] = [rgb(deep), rgb(P.accent), rgb(light)];
  const cardZoom = t >= COUNTERS.exit ? s / tab(COUNTERS.exit, PUSH) : 1;
  const hi = mixColor(P.lift, P.paper, 0.45);
  const slots = cardLayout(Math.min(3, cards.length), place);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ink }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${d[0]} ${m[0]} ${l[0]}`} />
            <feFuncG type="table" tableValues={`${d[1]} ${m[1]} ${l[1]}`} />
            <feFuncB type="table" tableValues={`${d[2]} ${m[2]} ${l[2]}`} />
          </feComponentTransfer>
        </filter>
      </svg>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `translate(${(tab(t, DX) * u).toFixed(2)}px, ${(tab(t, DY) * u).toFixed(2)}px) scale(${s.toFixed(5)})` }}>
        <Img src={photo} style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover' }} />
        {develop < 1 ? <Img src={photo} style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', filter: `url(#${fid})`, opacity: 1 - develop }} /> : null}
      </div>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${cardZoom.toFixed(5)})` }}>
        {cards.slice(0, 3).map((c, i) => {
          const S = slots[i];
          if (t < S.enter) return null;
          const e = clamp((t - S.enter) / (S.kind === 'rise' ? 6 : 2));
          const dy = S.kind === 'rise' ? 200 * (1 - E.glideOut(e)) : 0;
          const sc = S.kind === 'grow' ? 0.6 + 0.4 * E.glideOut(e) : 1;
          const fmt = c.format ?? money;
          // the count runs every frame (no held steps: a counter on twos reads as a row of one-frame snaps)
          const step = (tt: number) => c.from + (c.to - c.from) * clamp((tt - S.starts) / (COUNTERS.count - S.starts));
          const now = fmt(step(t));
          const before = fmt(step(t - 2));
          let k = 0;
          while (k < now.length && now.length === before.length && now[k] === before[k]) k++;
          // the changed digits lit while it counts; once it lands they cool to the card's type over 6 f (never in one frame)
          const landed = t >= COUNTERS.count + 2;
          const fin = fmt(step(COUNTERS.count));
          const finBefore = fmt(step(COUNTERS.count - 2));
          let kLand = 0;
          while (kLand < fin.length && fin.length === finBefore.length && fin[kLand] === finBefore[kLand]) kLand++;
          const lit = landed ? kLand : t >= S.starts + 2 && now !== before ? k : now.length;
          const litInk = landed ? mixColor(hi, P.paper, E.softOut(clamp((t - COUNTERS.count - 2) / 6))) : hi;
          // centred like the product's own stat card: title, period, the figure on the colour band, the status pill
          const sub = Math.max(36, S.title * 0.6);
          const row = (y: number, size: number): React.CSSProperties => ({ position: 'absolute', left: 0, top: 0, width: S.w * u, textAlign: 'center', whiteSpace: 'pre', transform: `translateY(${((y * S.cardH - size * 0.5) * u).toFixed(2)}px)`, fontSize: size * u, lineHeight: 1 });
          const edge = mixColor(P.paper, P.ground, 0.6);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: S.w * u, height: S.h * u, borderRadius: 28 * u, transformOrigin: 'center', transform: `translate(${(S.x * u).toFixed(2)}px, ${((S.y + dy) * u).toFixed(2)}px) scale(${sc.toFixed(4)})`, background: `radial-gradient(ellipse 78% 34% at 38% ${(S.band * 100).toFixed(0)}%, ${mixColor(P.accent, P.paper, 0.04)} 0%, ${withAlpha(mixColor(P.accent, P.paper, 0.14), 0.92)} 46%, ${withAlpha(edge, 0)} 100%), linear-gradient(170deg, ${mixColor(edge, P.ink, 0.08)} 0%, ${mixColor(P.accent, edge, 0.32)} 52%, ${mixColor(edge, P.ink, 0.04)} 100%)`, boxShadow: `inset 0 ${2 * u}px 0 ${withAlpha(P.paper, 0.6)}, inset 0 0 0 ${1 * u}px ${withAlpha(P.paper, 0.25)}, 0 ${24 * u}px ${60 * u}px ${withAlpha(P.ink, 0.28)}`, overflow: 'hidden', fontFamily: FONT.ui, color: P.paper }}>
              <div style={{ ...row(S.rows[0], S.title), fontWeight: 700, letterSpacing: '-0.01em' }}>{c.title}</div>
              <div style={{ ...row(S.rows[1], sub * 0.86), fontWeight: 450, opacity: 0.9 }}>{c.sub}</div>
              <div style={{ ...row(S.rows[2], S.figure), fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {/* set right-aligned in the final figure's width, centred: a figure that gains a digit grows on its left, the rest stays put */}
                <span style={{ display: 'inline-block', textAlign: 'right', minWidth: measureTracked(fin, S.figure * u, 600, -0.02, FONT.ui, { tabular: true }) }}>
                  {now.slice(0, lit)}
                  <span style={{ color: litInk }}>{now.slice(lit)}</span>
                </span>
              </div>
              {c.chip ? (
                <div style={{ position: 'absolute', left: 0, top: 0, width: S.w * u, display: 'flex', justifyContent: 'center', transform: `translateY(${((S.rows[3] * S.cardH - sub * 0.62) * u).toFixed(2)}px)` }}>
                  <div style={{ padding: `${0.22 * sub * u}px ${0.9 * sub * u}px`, borderRadius: 999, background: mixColor(P.ink, P.paper, 0.26), fontSize: sub * 0.82 * u, fontWeight: 500, lineHeight: 1, whiteSpace: 'pre' }}>{c.chip}</div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const photoCountersMeta: SceneMeta = {
  id: 'photo-counters',
  does: 'a photo of the person develops from a brand duotone while glass cards around them count their figures up',
  dur: COUNTERS.dur,
  props: ['photo', 'cards', 'place?', 'palette?'],
  handIn: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 },
  handOut: { form: 'count', x: 550, y: 260, w: 820, h: 560 },
  klass: 'quiet',
  cues: [
    { f: 0, kind: 'swell', id: 'photo', weight: 0.5 },
    { f: 2, kind: 'whoosh', id: 'card-big', weight: 0.5 },
    { f: 4, kind: 'tick', id: 'counting', weight: 0.3 },
    { f: 11, kind: 'pop', id: 'card-2', weight: 0.5 },
    { f: 18, kind: 'pop', id: 'card-3', weight: 0.5 },
    { f: COUNTERS.exit, kind: 'whoosh', id: 'exit', weight: 0.6 },
  ],
};
