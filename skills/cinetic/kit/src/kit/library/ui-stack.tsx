// Motion library, ui: stacks. A notification pile that builds (one alone and held, then a second, then faster and
// faster, in depth) and collapses back into one; a card that lands by shrinking and fans out its siblings from behind;
// a banner that grows out of its icon and types itself.
import React from 'react';

import { accel, at, clamp, ease, mix } from '../motion';
import { mixColor } from '../type';
import { MarkSlot, Notice, bez, surfaceStyle, useUiFrame, withPace, type Look, type NoticeData, InkWords, inkWordsEnd } from './ui-base';

/** Progress along a per-frame table (measured curves), clamped. */
const table = (frame: number, start: number, t: number[]) => {
  const i = frame - start;
  if (i <= 0) return t[0];
  if (i >= t.length - 1) return t[t.length - 1];
  const a = Math.floor(i);
  return mix(i - a, t[a], t[a + 1]);
};
// a later notice reaches its slot along 59, 76, 87, 93, 96, 98, 100 % (6 frames)
const RISE = [0, 0.59, 0.76, 0.87, 0.93, 0.96, 0.98, 1];
// the first notice lands by shrinking: 1.30 to 1.0 over 12 frames, no overshoot
const LAND = [1.3, 1.22, 1.17, 1.13, 1.091, 1.059, 1.038, 1.023, 1.01, 1.005, 1.001, 1];

/** Default arrival offsets: one alone and held, then a second, then the pile accelerates. */
export const pileTimes = (n: number, hold = 40) => {
  const gaps = [hold, 18, 11, 8, 6, 5, 4, 4, 3, 3, 3, 3];
  const out = [0];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + (gaps[i - 1] ?? 3));
  return out;
};

/**
 * A notification pile that builds. The first notice lands alone by shrinking (1.30 to 1.0, blur 28 to 0, 12 f) and is
 * held; each later one rises 120 px into the front slot (scale 0.95, 6 px blur, 6 f) while the older ones step back a
 * slot: smaller (1, 0.943, 0.894, 0.849, 0.807), lower, dimmer and softer, the fifth fading out. The arrivals come
 * faster and faster (`times`, default `pileTimes`). From `collapseAt` (relative) the pile folds back behind the front
 * notice into one, leaving two lips under it. Centre at (x, y): the front notice's centre.
 */
const NoticePileInner: React.FC<{
  L: Look;
  items: NoticeData[];
  at: number;
  /** Arrival frames relative to `at` (default: pileTimes(items.length, hold)). */
  times?: number[];
  hold?: number;
  collapseAt?: number;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  /** px between slots at full size (default 0.36 of the notice's height). */
  pitch?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, items, at: start, times, hold = 40, collapseAt, x = 960, y = 420, w = 860, size = 32 , speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const T = (times ?? pileTimes(items.length, hold)).map((t) => t + start);
  // the notice's height: padding plus the taller of the glyph and the text block
  const n0 = items[0];
  const textH = (n0?.app ? size * 1.2 : 0) + size * 1.25 + (n0?.body ? size * 1.36 : 0);
  const h = size * 0.85 * 2 + Math.max(size * 2.35, textH);
  const step = h * 0.8;
  const SC = [1, 0.943, 0.894, 0.849, 0.807, 0.77];
  const BL = [0, 1.2, 2, 2.8, 5, 8];
  const DIM = [0, 0.06, 0.13, 0.2, 0.3, 0.4];
  const col = collapseAt !== undefined ? start + collapseAt : Infinity;
  const nodes: React.ReactNode[] = [];
  items.forEach((n, i) => {
    if (frame < T[i]) return;
    // slot = how many arrived after this one, eased with the same rise table
    let slot = 0;
    for (let j = i + 1; j < items.length; j++) slot += frame >= T[j] ? table(frame, T[j], RISE) : 0;
    const s0 = Math.floor(slot);
    const fr = slot - s0;
    const lerpArr = (a: number[]) => mix(fr, a[Math.min(a.length - 1, s0)], a[Math.min(a.length - 1, s0 + 1)]);
    let scale = lerpArr(SC);
    let dy = 0;
    for (let k = 0; k < Math.min(slot, 6); k++) dy += step * SC[Math.min(5, k + 1)] * Math.min(1, slot - k);
    let blur = lerpArr(BL);
    let dim = lerpArr(DIM);
    let op = clamp(5 - slot);
    // arrival
    if (i === 0) {
      const sc = table(frame, T[0], LAND);
      scale *= sc;
      blur += mix(clamp((frame - T[0]) / 11), 28, 0);
      op *= clamp((frame - T[0] + 1) / 4);
    } else {
      const r = table(frame, T[i], RISE);
      dy += mix(r, 120, 0);
      scale *= mix(r, 0.95, 1);
      blur += mix(r, 6, 0);
      op *= mix(r, 0.9, 1);
    }
    // collapse: back to front, each folds up behind the front one (ease-in), two lips stay
    if (frame >= col && slot > 0.01) {
      const order = Math.round(slot);
      const c = at(frame, col + Math.max(0, 5 - order) * 2, 9, ease.in);
      const lip = order === 1 ? 1 : order === 2 ? 2 : 0;
      const targetDy = lip ? lip * size * 0.42 : 0;
      const targetSc = lip ? 1 - lip * 0.05 : 0.9;
      dy = mix(c, dy, targetDy);
      scale = mix(c, scale, targetSc);
      op = lip ? op : op * (1 - c);
      blur = mix(c, blur, 0);
      dim = mix(c, dim, lip ? 0.04 * lip : 0);
    }
    const creep = 1 + 0.012 * at(frame, start, 200, ease.out);
    nodes.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: y - h / 2 + dy,
          width: w,
          transformOrigin: '50% 0%',
          transform: `scale(${scale * creep})`,
          opacity: op,
          filter: `${blur > 0.05 ? `blur(${blur}px)` : ''} ${dim > 0 ? `brightness(${L.dark ? 1 - dim * 1.4 : 1 - dim * 0.45})` : ''}`.trim() || undefined,
          zIndex: 100 - Math.round(slot * 10),
        }}
      >
        <Notice L={L} n={n} w={w} size={size} />
      </div>,
    );
  });
  return <>{nodes}</>;
};

/**
 * A card that lands and fans out its siblings. The front card arrives by shrinking (1.30 to 1.0 over 12 f, blur 28 to 0,
 * gliding in from the left), is held, then the cards behind it slide out from exactly behind it (never from the frame
 * edge) up and to the left into a tilted fan, each showing its title line, 8 f each, 4 f apart, the group turning 1.5 degrees; held; they fold back behind it (ease-in, the tilt going to 0) and the
 * single card leaves upward out of the frame, accelerating (each step 1.5x the last) with a vertical smear. `cards[0]` is the front.
 * Times relative to `at`: `fanAt`, `foldAt`, `exitAt`.
 */
const CardFanInner: React.FC<{
  cards: React.ReactNode[];
  at: number;
  w: number;
  h: number;
  fanAt?: number;
  foldAt?: number;
  exitAt?: number;
  x?: number;
  y?: number;
  /** Share of the card's width each one behind moves left. */
  spread?: number;
  /** Share of the card's height each one behind rises (0.42 leaves its title line in view). */
  lift?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ cards, at: start, w, h, fanAt = 26, foldAt = 70, exitAt = 84, x = 960, y = 540, spread = 0.07, lift = 0.4 , speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  if (t < 0) return null;
  const land = table(frame, start, LAND);
  const landBlur = mix(clamp(t / 11), 28, 0);
  const glide = mix(bez(0, -0.21, 0.158, 1.007)(clamp(t / 12)), -340, 0);
  const fold = at(frame, start + foldAt, 9, ease.in);
  const tilt = (1 - fold) * at(frame, start + fanAt, 14, ease.out);
  const up = accel(frame, start + exitAt, 12, 1.5);
  const exitY = -up * 900;
  const smear = up * 22;
  return (
    <div style={{ position: 'absolute', left: x - w / 2 + glide, top: y - h / 2 + exitY, width: w, height: h, perspective: 1800 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${-tilt * 1.5}deg) scale(${land})`, filter: landBlur + smear > 0.1 ? `blur(${landBlur + smear * 0.4}px)` : undefined }}>
        {cards
          .map((c, i) => {
            const out = i === 0 ? 0 : at(frame, start + fanAt + (i - 1) * 4, 8, ease.out) * (1 - fold);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `translate(${-out * spread * w * i}px, ${-out * lift * h * i}px)`,
                  opacity: i === 0 ? 1 : clamp(out * 4),
                  zIndex: 10 - i,
                }}
              >
                {c}
              </div>
            );
          })
          .reverse()}
      </div>
    </div>
  );
};

/**
 * A banner that grows out of its icon: a dark pill with only the glyph arrives blurred, widens to the right in 4
 * frames (0.15, 0.3, 0.62, 0.9, 1 of its width) as it sharpens, a badge pops on the glyph, the title then the body
 * type in word by word (fresh words born in the accent), the time fades in, the banner rises 56 px (expo-out) and a
 * sheen crosses it once. Centre at (x, y).
 */
const BannerPopInner: React.FC<{
  L: Look;
  n: NoticeData;
  at: number;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  badge?: string;
  sheenAt?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, n, at: start, x = 960, y = 540, w = 1100, size = 34, badge = '#FF453A', sheenAt = 44 , speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  if (t < 0) return null;
  const pad = size * 0.62;
  const g = size * 2.3;
  const h = g + pad * 2;
  const WID = [0.15, 0.3, 0.62, 0.9, 1];
  const wf = t >= WID.length - 1 ? 1 : mix(t - Math.floor(t), WID[Math.floor(t)], WID[Math.min(WID.length - 1, Math.floor(t) + 1)]);
  const cw = Math.max(h, w * wf);
  const blur = mix(clamp(t / 4), 8, 0);
  const rise = mix(at(frame, start, 16, ease.out), 56, 0);
  const bp = at(frame, start + 3, 6, bez(0.3, 1.7, 0.5, 1));
  const titleAt = start + 4;
  const bodyAt = inkWordsEnd(n.title, titleAt, 2) - 2;
  const timeP = at(frame, start + 10, 8, ease.out);
  const sh = at(frame, start + sheenAt, 10, ease.inOut);
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2 + rise, width: cw, height: h, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
      <div style={{ ...surfaceStyle(L, 4, h / 2), position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {sh > 0 && sh < 1 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: mix(sh, -260, cw + 60), width: 220, background: `linear-gradient(100deg, transparent, rgba(255,255,255,${L.dark ? 0.1 : 0.5}), transparent)` }} />
        )}
      </div>
      <div style={{ position: 'absolute', left: pad - (1 - clamp(t / 4)) * 10, top: pad }}>
        <MarkSlot mark={n.mark} icon={n.icon} letter={n.letter} colors={n.colors} size={g} />
        <div style={{ position: 'absolute', right: -size * 0.22, top: -size * 0.22, width: size * 0.72, height: size * 0.72, borderRadius: size, background: badge, border: `${size * 0.1}px solid ${L.surface}`, transform: `scale(${bp})` }} />
      </div>
      <div style={{ position: 'absolute', left: pad * 2 + g, right: pad * 1.6, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: L.font, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={{ flex: 1, fontSize: size, fontWeight: 620, letterSpacing: '-0.012em' }}>
            <InkWords text={n.title} start={titleAt} color={L.ink} born={L.accent} />
          </div>
          {n.time && <div style={{ fontSize: size * 0.9, color: L.faint, opacity: timeP }}>{n.time}</div>}
        </div>
        {n.body && (
          <div style={{ fontSize: size * 0.92, color: L.muted, marginTop: size * 0.16 }}>
            <InkWords text={n.body} start={bodyAt} color={L.muted} born={mixColor(L.accent, L.muted, 0.3)} />
          </div>
        )}
      </div>
    </div>
  );
};
export const NoticePile = withPace(NoticePileInner);
export const CardFan = withPace(CardFanInner);
export const BannerPop = withPace(BannerPopInner);
