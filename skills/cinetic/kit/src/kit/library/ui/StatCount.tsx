// StatCount (ui, build): stat cards cut on blank, the figure appears three frames later and counts up in whole
// numbers at a steady rate; smaller cards join round the first, each counting its own figure.
// Numbers: a card arrives blank in 3 f (blur 10 to 0, scale 1.05 to 1); label and figure at +3 f; the count is linear
// (`rate` a frame, whole numbers on every frame) until `to`; the status pill pops at +12 f; the second card 11 f after
// the first, the third 7 f after that; main card 0.21 W, the others 0.12 W; figure 0.045 H on the main card.
// Caution: give each card a different rate so they read as separate figures; the cards float over a picture or a
// product scene, never alone on an empty ground.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { type Look, Pill, useUiFrame, withPace } from './_shared';

export type StatCard = {
  label: string;
  sub?: string;
  from?: number;
  to: number;
  /** Units a frame. */
  rate: number;
  prefix?: string;
  suffix?: string;
  pill?: { label: string; color?: string };
  /** Its first frame, from the piece's `at`. */
  f: number;
  /** Its centre as a share of the frame, and its width as a share of the frame's width. */
  cx: number;
  cy: number;
  w: number;
};

const fmt = (v: number) => v.toLocaleString('en-US');

const StatCountInner: React.FC<{ L: Look; cards: StatCard[]; at: number; glass?: boolean; speed?: number }> = ({ L, cards, at: start, glass = true, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = start + (useUiFrame() - start) * speed;
  return (
    <>
      {cards.map((c, i) => {
        const t0 = start + c.f;
        if (frame < t0) return null;
        const w = c.w * W;
        const h = w * 0.86;
        const s = w / 9.2; // the label size; the figure is 2.6 times it
        const q = at(frame, t0, 3, ease.out);
        const on = frame >= t0 + 3;
        const v = Math.min(c.to, (c.from ?? 0) + Math.max(0, Math.floor(frame - (t0 + 3))) * c.rate);
        const pill = at(frame, t0 + 12, 4, ease.snap);
        const tint = mixColor(L.surface, L.accent, L.dark ? 0.22 : 0.16);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.cx * W - w / 2,
              top: c.cy * H - h / 2,
              width: w,
              height: h,
              borderRadius: h * 0.09,
              overflow: 'hidden',
              transform: `scale(${mix(q, 1.05, 1)})`,
              filter: q < 1 ? `blur(${mix(q, 10, 0)}px)` : undefined,
              background: glass ? (L.dark ? 'rgba(28,30,36,0.62)' : 'rgba(255,255,255,0.74)') : L.surface,
              backdropFilter: glass ? 'blur(22px) saturate(1.3)' : undefined,
              border: `1px solid ${L.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)'}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,${L.dark ? 0.12 : 0.9}), 0 2px 4px rgba(0,0,0,0.06), 0 18px 48px rgba(0,0,0,${L.dark ? 0.4 : 0.16})`,
              boxSizing: 'border-box',
              fontFamily: L.font,
            }}
          >
            {/* a bloom of the accent in the lower left: the card's own light */}
            <div style={{ position: 'absolute', left: -w * 0.3, bottom: -h * 0.55, width: w * 1.1, height: h * 1.1, borderRadius: '50%', background: `radial-gradient(closest-side, ${mixColor(tint, L.accent, 0.35)}, transparent)`, opacity: 0.85 }} />
            {on && (
              <div style={{ position: 'absolute', inset: 0, padding: `${h * 0.1}px ${w * 0.08}px ${h * 0.09}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
                <div style={{ fontSize: s, fontWeight: 620, color: L.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{c.label}</div>
                {c.sub && <div style={{ fontSize: s * 0.7, color: L.muted, marginTop: s * 0.15, whiteSpace: 'nowrap' }}>{c.sub}</div>}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: s * 2.6, fontWeight: 600, letterSpacing: '-0.035em', color: L.dark ? '#FFFFFF' : mixColor(L.accent, '#000000', 0.45), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {c.prefix}
                  {fmt(v)}
                  {c.suffix}
                </div>
                {c.pill && (
                  <div style={{ transform: `scale(${mix(pill, 0.7, 1)})`, opacity: clamp(pill * 2) }}>
                    <Pill L={L} label={c.pill.label} color={c.pill.color} size={s * 0.62} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export const StatCount = withPace(StatCountInner);
