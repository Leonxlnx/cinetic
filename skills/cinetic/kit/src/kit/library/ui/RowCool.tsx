// RowCool (ui, build): a progress log under a shimmering header: rows step on one at a time (an outline icon on a
// thin rule, a verb, a grey line of detail); each verb lands in its icon's colour and cools to the ink while the next
// arrives, and each arrival nudges the whole block up by one row.
// Numbers: arrivals every 10, 8, 12, 10, 9, 8 f (the last repeats); a row fades in over 8 f (exponential out), rising
// 0.15 of a row; the block glides up one row on each arrival (critically damped from rest, half-way in 3 f, settled
// by about 12 f, a glide still running carries into the next); the verb holds its colour 3 f and cools over 9 f; the
// header's shimmer crosses in 24 f, looping.
// Caution: four to seven rows, a verb and an object each, different; the colours are the icons' own (one per kind of
// step), not a rainbow.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, settle } from '../../motion';
import { mixColor } from '../../type';
import { type Look, surfaceStyle, useUiFrame, withPace } from './_shared';

export type CoolRow = { icon: string; color: string; verb: string; detail: string };

const RowCoolInner: React.FC<{
  L: Look;
  rows: CoolRow[];
  at: number;
  title?: string;
  gaps?: number[];
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  /** Draw the log on its own card, which grows a row with each arrival (a card drawn by the film around it would sit
   * empty at the start). */
  card?: boolean;
  speed?: number;
}> = ({ L, rows, at: start, title = 'Working', gaps = [10, 8, 12, 10, 9, 8], x: xIn, y: yIn, w: wIn, size: sizeIn, card = false, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = start + (useUiFrame() - start) * speed;
  const s = sizeIn ?? Math.min(W, H) * 0.03;
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const w = wIn ?? s * 22;
  const T: number[] = [];
  rows.forEach((_, i) => T.push(i === 0 ? start + 8 : T[i - 1] + gaps[Math.min(i - 1, gaps.length - 1)]));
  const rowH = s * 2.7;
  const headH = s * 2.2;
  // the block's height grows a row per arrival; it stays centred on y, so each arrival nudges it up
  let n = 0;
  for (const t of T) n += settle(frame, t, 3);
  const blockH = headH + n * rowH;
  const top = y - blockH / 2;
  const shimmer = ((frame - start) % 24) / 24;
  const isDone = frame > T[T.length - 1] + 30;
  const pad = s * 1.4;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x - w / 2}px, ${top}px)`, width: w, fontFamily: L.font }}>
      {card && <div style={{ ...surfaceStyle(L, 3, s * 0.8), position: 'absolute', left: -pad, top: -pad * 0.8, width: w + pad * 2, height: blockH + pad * 1.6 }} />}
      {/* on its own card the rows are revealed by the card's growing edge, never drawn outside it */}
      <div style={{ position: 'relative', height: blockH, clipPath: card ? `inset(${-s * 4}px ${-pad}px ${-pad * 0.8}px ${-pad}px)` : undefined }}>
        <div style={{ position: 'relative', height: headH, display: 'flex', alignItems: 'center', gap: s * 0.5, fontSize: s * 0.95, fontWeight: 560 }}>
          <span
            style={{
              color: 'transparent',
              backgroundImage: isDone ? undefined : `linear-gradient(100deg, ${L.faint} ${shimmer * 140 - 40}%, ${L.ink} ${shimmer * 140 - 20}%, ${L.faint} ${shimmer * 140}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              ...(isDone ? { color: L.muted } : {}),
            }}
          >
            {isDone ? 'Done' : `${title}…`}
          </span>
        </div>
        {rows.map((r, i) => {
          if (frame < T[i]) return null;
          const q = at(frame, T[i], 8, ease.expoOut);
          const cool = at(frame, T[i] + 3, 9, ease.out);
          const last = i === rows.length - 1;
          return (
            <div key={i} style={{ position: 'relative', height: rowH, display: 'flex', alignItems: 'flex-start', gap: s * 0.75, opacity: q, transform: `translateY(${mix(q, rowH * 0.15, 0)}px)` }}>
              {/* the rule linking the icons */}
              {!last && frame >= T[i + 1] && <div style={{ position: 'absolute', left: s * 0.7 - 0.5, top: s * 1.55, height: rowH - s * 1.3, width: 1, background: L.line }} />}
              <div style={{ width: s * 1.4, height: s * 1.4, borderRadius: s * 0.4, border: `1.5px solid ${mixColor(L.surface, r.color, 0.5)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: L.dark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }}>
                <Icon name={r.icon} size={s * 0.85} color={r.color} stroke={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: s, fontWeight: 600, color: mixColor(r.color, L.ink, cool), letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{r.verb}</div>
                <div style={{ fontSize: s * 0.82, color: L.muted, marginTop: s * 0.12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: clamp(q * 1.4) }}>{r.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RowCool = withPace(RowCoolInner);
