// FeedRush (ui, emphasis): a comment feed fills one row at a time, then scrolls faster and faster into a vertical
// smear while a "reading" counter races, brakes hard and lands with one row highlighted in the middle.
// Numbers: intro rows every 8 f (fade-up 6 f, 6 px blur to 0, rise a quarter row); the rush (54 f, 24 rows) accelerates
// over its first quarter (quadratic), cruises a fifth at about one row a frame, brakes over the rest (cubic); vertical smear
// 0.11 of the speed in px, at most 34 px; the counter grows geometrically to `total` with the travel; the highlight
// fills over the last 8 f.
// Caution: rows must be real and different (12 or more in the pool); the target row's text is the one to read, short
// enough for two lines.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { SmearFilter, useUid } from '../_shared';
import { Face, type Look, MarkSlot, surfaceStyle, useUiFrame, withPace } from './_shared';

export type FeedRow = { name: string; color?: string; time: string; text: string };

/** Distance travelled (0..1) after i frames of a rush of n frames: quadratic in, a cruise, a cubic brake. */
const rushTable = (n: number) => {
  const A = Math.max(2, Math.round(n * 0.25));
  const C = Math.max(1, Math.round(n * 0.2));
  const B = Math.max(2, n - A - C);
  const v: number[] = [];
  for (let i = 0; i < n; i++) v.push(i < A ? ((i + 1) / A) ** 2 : i < A + C ? 1 : (1 - (i - A - C + 1) / B) ** 3);
  const sum = v.reduce((a, b) => a + b, 0);
  const pos = [0];
  for (let i = 0; i < n; i++) pos.push(pos[i] + v[i] / sum);
  return pos;
};

const FeedRushInner: React.FC<{
  L: Look;
  rows: FeedRow[];
  /** The row (index in `rows`) the feed lands on, highlighted. */
  target: number;
  at: number;
  /** Rows that arrive one by one before the rush. */
  intro?: number;
  every?: number;
  /** The rush starts this many frames after the last intro row. */
  wait?: number;
  /** Frames of the rush, brake included. */
  dur?: number;
  /** Rows that pass during the rush. */
  pass?: number;
  /** The counter in the header: "Reading 3,412 comments". */
  verb?: string;
  noun?: string;
  total?: number;
  title?: string;
  mark?: React.ReactNode;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  speed?: number;
}> = ({ L, rows, target, at: start, intro = 3, every = 8, wait = 8, dur = 54, pass = 24, verb = 'Reading', noun = 'comments', total = 3412, title = 'Comments', mark, x: xIn, y: yIn, w: wIn, size: sizeIn, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const s = sizeIn ?? H * 0.026;
  const w = wIn ?? Math.min(W * 0.62, s * 40);
  const id = useUid('feed');
  const rowH = s * 5.3;
  const show = 3;
  const headH = s * 3.2;
  const bodyH = rowH * show + s * 0.8;
  const panelH = headH + bodyH;
  const focus = 1; // the middle visible slot
  const rushAt = start + (intro - 1) * every + wait;
  const table = rushTable(dur);
  const K = intro + pass; // the index the target lands at
  const s0 = Math.max(0, intro - show); // offset after the intro
  const D = K - focus - s0;
  const i = clamp(frame - rushAt, 0, dur);
  const fi = Math.floor(i);
  const tr = mix(i - fi, table[fi], table[Math.min(dur, fi + 1)]);
  const trPrev = (() => {
    const j = clamp(frame - 1 - rushAt, 0, dur);
    const fj = Math.floor(j);
    return mix(j - fj, table[fj], table[Math.min(dur, fj + 1)]);
  })();
  const offset = s0 + tr * D;
  const vRows = (tr - trPrev) * D;
  const smear = Math.min(34, vRows * rowH * 0.11);
  const landF = rushAt + dur;
  const hi = at(frame, landF - 8, 8, ease.out);
  const push = at(frame, landF - 4, 30, ease.soft);
  const pool = rows.filter((_, k) => k !== target);
  const item = (k: number) => (k === K ? rows[target] : pool[(k * 5 + 2) % pool.length]);
  // the counter: one per intro row, then geometric with the travel
  const introShown = Math.min(intro, Math.max(0, Math.floor((frame - start) / every) + 1));
  const c0 = Math.max(1, intro);
  const count = frame < rushAt ? (frame < start ? 0 : introShown) : Math.round(c0 * Math.pow(total / c0, tr));
  const enter = springAt(frame, 30, start - 12, springs.ui);
  const spin = frame < landF;
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - panelH / 2, width: w, height: panelH, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 30, 0)}px) scale(${mix(push, 1, 1.02)})`, fontFamily: L.font }}>
      <SmearFilter id={id} x={0} y={smear} />
      <div style={{ ...surfaceStyle(L, 5, s * 1.2), position: 'absolute', inset: 0 }} />
      {/* header: title and the racing counter */}
      <div style={{ position: 'absolute', left: s * 1.2, right: s * 1.2, top: 0, height: headH, display: 'flex', alignItems: 'center', gap: s * 0.55, borderBottom: `1px solid ${L.line}` }}>
        <MarkSlot mark={mark} icon="MessageSquare" colors={['#5B86FF', '#2350E6']} size={s * 1.5} />
        <div style={{ fontSize: s * 1.05, fontWeight: 640, color: L.ink, letterSpacing: '-0.012em' }}>{title}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.4, padding: `${s * 0.3}px ${s * 0.75}px ${s * 0.3}px ${s * 0.5}px`, borderRadius: s, background: mixColor(L.surface, L.accent, L.dark ? 0.18 : 0.1), color: L.dark ? mixColor(L.accent, '#FFFFFF', 0.3) : mixColor(L.accent, '#000000', 0.1), fontSize: s * 0.82, fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {spin ? (
            <svg width={s * 0.9} height={s * 0.9} viewBox="0 0 24 24" style={{ transform: `rotate(${(frame - start) * 40}deg)` }}>
              <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
              <path d="M12 3 A9 9 0 0 1 21 12" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
            </svg>
          ) : (
            <Icon name="Check" size={s * 0.9} stroke={2.6} />
          )}
          {verb} {count.toLocaleString('en-US')} {noun}
        </div>
      </div>
      {/* the list */}
      <div style={{ position: 'absolute', left: s * 0.6, right: s * 0.6, top: headH, height: bodyH, overflow: 'hidden', WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${s * 1.6}px, #000 calc(100% - ${s * 1.4}px), transparent 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, filter: smear > 0.4 ? `url(#${id})` : undefined }}>
          {Array.from({ length: K + show + 1 }, (_, k) => {
            const top = s * 0.4 + (k - offset) * rowH;
            if (top < -rowH || top > bodyH + rowH * 0.2) return null;
            const t0 = start + k * every;
            const intoIntro = k < intro;
            if (intoIntro && frame < t0) return null;
            const q = intoIntro ? at(frame, t0, 6, ease.out) : 1;
            const r = item(k);
            const isT = k === K;
            return (
              <div key={k} style={{ position: 'absolute', left: 0, right: 0, top: top + mix(q, rowH * 0.25, 0), height: rowH - s * 0.35, opacity: q, filter: q < 1 ? `blur(${mix(q, 6, 0)}px)` : undefined, borderRadius: s * 0.75, background: isT && hi > 0 ? mixColor(L.surface, L.accent, (L.dark ? 0.2 : 0.11) * hi) : undefined, boxShadow: isT && hi > 0 ? `inset 0 0 0 1.5px ${mixColor(L.surface, L.accent, 0.35 * hi)}` : undefined, display: 'flex', gap: s * 0.7, padding: `${s * 0.7}px ${s * 0.8}px`, boxSizing: 'border-box' }}>
                <Face name={r.name} color={r.color} size={s * 1.75} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: s * 0.8, color: L.muted, whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600, color: L.ink }}>@{r.name.toLowerCase().replace(/[^a-z]/g, '')}</span>
                    <span style={{ color: L.faint }}> · {r.time}</span>
                  </div>
                  <div style={{ fontSize: s, color: L.ink, lineHeight: 1.3, marginTop: s * 0.18, letterSpacing: '-0.006em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: s * 1.1, marginTop: s * 0.45, color: L.muted, fontSize: s * 0.78 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: s * 0.3 }}>
                      <Icon name="ThumbsUp" size={s * 0.85} stroke={2} />
                      {((k * 37) % 180) + 4}
                    </span>
                    <Icon name="ThumbsDown" size={s * 0.85} stroke={2} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: s * 0.3 }}>
                      <Icon name="MessageCircle" size={s * 0.85} stroke={2} />
                      Reply
                    </span>
                    <Icon name="Heart" size={s * 0.85} stroke={2} />
                  </div>
                </div>
                <Icon name="EllipsisVertical" size={s * 0.9} color={L.faint} stroke={2} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const FeedRush = withPace(FeedRushInner);
