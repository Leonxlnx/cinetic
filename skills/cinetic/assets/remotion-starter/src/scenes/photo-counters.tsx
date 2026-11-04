// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// photo-counters: a real photograph of the person the product serves, in their place, enters as a duotone in the
// brand's colours and develops to full colour while the camera pushes in; lit glass cards land around them, each
// counting a figure up in cut steps (the digits that changed in the last step lit), until a last push carries
// everything into the next scene.
// Numbers (frames at 30 fps, px at 1080; measured): duotone 4 f, developed by 8 f; the push x1.10 by 25 f on the
// measured ease-out with the frame's centre drifting 23 / 24 px, a hold creeping x1.004, an exit push to x1.19 over the
// last 5 f; the big card rises 200 px into place in 6 f, the small ones grow 0.6 -> 1 in 2 f (at 11 and 18 f), type
// centred on a colour band across a pale card; every counter steps on twos, linear in time, to its last value at 50 f;
// cards radius 28, white type, a dark status pill.
import React from 'react';
import { Img } from 'remotion';
import { FONT } from '../brand/tokens';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { type Palette, paletteOf, type SceneMeta, span, stepped, tab, useClock } from './parts';

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
  /** one to three cards: the first is the big one (lower left), then upper left, then right */
  cards: readonly CounterCard[];
  palette?: Partial<Palette>;
  frame?: number;
};

export const COUNTERS = { dur: 52, develop: [4, 8] as const, count: 50, exit: 47 } as const;
const PUSH: [number, number][] = [[0, 1], [1, 1.0069], [3, 1.0123], [4, 1.0206], [5, 1.026], [6, 1.035], [7, 1.043], [10, 1.0502], [11, 1.0522], [12, 1.0618], [13, 1.0648], [15, 1.0727], [16, 1.0742], [17, 1.0814], [18, 1.0831], [19, 1.0878], [21, 1.0909], [22, 1.095], [23, 1.0957], [24, 1.0974], [25, 1.0977], [30, 1.0988], [33, 1.1012], [40, 1.1021], [45, 1.1029], [46, 1.1051], [47, 1.1125], [48, 1.1269], [49, 1.1588], [51, 1.1879]];
const DX: [number, number][] = [[0, 3], [7, 13], [13, 17], [19, 20], [25, 23], [51, 27]];
const DY: [number, number][] = [[0, 3], [7, 13], [13, 20], [19, 26], [25, 24], [48, 30], [51, 34]];
// the cards: element box (px at 1080), their entry, the type sizes (title, sub, figure)
const SLOTS = [
  { x: 130, y: 562, w: 650, h: 538, cardH: 538, enter: 2, kind: 'rise' as const, title: 63, figure: 150, starts: 4, rows: [0.17, 0.27, 0.6, 0.86], band: 0.58 },
  { x: 240, y: 135, w: 317, h: 315, cardH: 315, enter: 11, kind: 'grow' as const, title: 36, figure: 90, starts: 12, rows: [0.16, 0.25, 0.5, 0.8], band: 0.5 },
  { x: 1330, y: 331, w: 379, h: 379, cardH: 379, enter: 18, kind: 'grow' as const, title: 41, figure: 104, starts: 20, rows: [0.15, 0.25, 0.53, 0.8], band: 0.52 },
];
const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export const PhotoCounters: React.FC<PhotoCountersProps> = ({ photo, cards, palette, frame }) => {
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
          const S = SLOTS[i];
          if (t < S.enter) return null;
          const e = clamp((t - S.enter) / (S.kind === 'rise' ? 6 : 2));
          const dy = S.kind === 'rise' ? 200 * (1 - E.glideOut(e)) : 0;
          const sc = S.kind === 'grow' ? 0.6 + 0.4 * E.glideOut(e) : 1;
          const fmt = c.format ?? money;
          const step = (tt: number) => c.from + (c.to - c.from) * clamp(stepped(tt - S.starts, 2) / (COUNTERS.count - S.starts));
          const now = fmt(step(t));
          const before = fmt(step(t - 2));
          let k = 0;
          while (k < now.length && now.length === before.length && now[k] === before[k]) k++;
          const lit = t >= S.starts + 2 && now !== before ? k : now.length;
          // centred like the product's own stat card: title, period, the figure on the colour band, the status pill
          const sub = Math.max(36, S.title * 0.6);
          const row = (y: number, size: number): React.CSSProperties => ({ position: 'absolute', left: 0, top: 0, width: S.w * u, textAlign: 'center', whiteSpace: 'pre', transform: `translateY(${((y * S.cardH - size * 0.5) * u).toFixed(2)}px)`, fontSize: size * u, lineHeight: 1 });
          const edge = mixColor(P.paper, P.ground, 0.6);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: S.w * u, height: S.h * u, borderRadius: 28 * u, transformOrigin: 'center', transform: `translate(${(S.x * u).toFixed(2)}px, ${((S.y + dy) * u).toFixed(2)}px) scale(${sc.toFixed(4)})`, background: `radial-gradient(ellipse 78% 34% at 38% ${(S.band * 100).toFixed(0)}%, ${mixColor(P.accent, P.paper, 0.04)} 0%, ${withAlpha(mixColor(P.accent, P.paper, 0.14), 0.92)} 46%, ${withAlpha(edge, 0)} 100%), linear-gradient(170deg, ${mixColor(edge, P.ink, 0.08)} 0%, ${mixColor(P.accent, edge, 0.32)} 52%, ${mixColor(edge, P.ink, 0.04)} 100%)`, boxShadow: `inset 0 ${2 * u}px 0 ${withAlpha(P.paper, 0.6)}, inset 0 0 0 ${1 * u}px ${withAlpha(P.paper, 0.25)}, 0 ${24 * u}px ${60 * u}px ${withAlpha(P.ink, 0.28)}`, overflow: 'hidden', fontFamily: FONT.ui, color: P.paper }}>
              <div style={{ ...row(S.rows[0], S.title), fontWeight: 700, letterSpacing: '-0.01em' }}>{c.title}</div>
              <div style={{ ...row(S.rows[1], sub * 0.86), fontWeight: 450, opacity: 0.9 }}>{c.sub}</div>
              <div style={{ ...row(S.rows[2], S.figure), fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {now.slice(0, lit)}
                <span style={{ color: hi }}>{now.slice(lit)}</span>
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
  props: ['photo', 'cards', 'palette?'],
  handIn: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 },
  handOut: { form: 'count', x: 130, y: 562, w: 650, h: 518 },
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
