// CalendarWave (ui, build): a week fills in a wave: events appear as pale ghosts crossing the week diagonally, then
// take their colour.
// Numbers: start at + (distance ^ 0.85) * wave; ghost 0.92 to 1 in 5 f, colour and text 6 f, 5 f later; the now line
// 10 f.
// Caution: no purple or green unless they are the product's own colours.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { type Look, MarkSlot, surfaceStyle, useUiFrame, withPace } from './_shared';

export type CalEvent = { day: number; start: number; len: number; title: string; color: string };

/**
 * A week that fills in a wave. A calendar card: a header (the app's mark, the month, back and forward, a Today button and
 * a Day / Week / Month switch), day heads with today's date on an accent disc, hour lines and a "now" line across today.
 * Each event appears first as a pale ghost of its colour (scale 0.92 to 1, 5 f) in a wave that crosses the week
 * diagonally (`wave` frames), then takes its tint, its colour bar, its title and its time 5 f later. Hours from `from`
 * to `to`.
 */
const CalendarWaveInner: React.FC<{
  L: Look;
  events: CalEvent[];
  at: number;
  wave?: number;
  days?: string[];
  dates?: number[];
  today?: number;
  from?: number;
  to?: number;
  /** The hour of the "now" line across today (none when undefined). */
  now?: number;
  title?: string;
  mark?: React.ReactNode;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  size?: number;
  speed?: number;
}> = ({ L, events, at: start, wave = 22, days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], dates = [12, 13, 14, 15, 16], today = 2, from = 9, to = 17, now = 11.6, title = 'May 2026', mark, x: xIn, y: yIn, w = 1500, h = 860, size = 30, speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const enter = springAt(frame, 30, start - 14, springs.ui);
  const s = size;
  const pad = s * 1.1;
  const titleH = s * 3.2;
  const gutter = s * 2.8;
  const headH = s * 2.4;
  const colW = (w - pad * 2 - gutter) / days.length;
  const gridTop = titleH + s * 0.4;
  const hourH = (h - gridTop - pad - headH) / (to - from);
  const maxD = days.length + (to - from) * 0.5;
  const fmt = (hr: number) => `${Math.floor(hr)}:${String(Math.round((hr % 1) * 60)).padStart(2, '0')}`;
  const nowP = at(frame, start + wave + 8, 10, ease.out);
  const btn: React.CSSProperties = { height: s * 1.6, padding: `0 ${s * 0.7}px`, borderRadius: s * 0.42, border: `1px solid ${L.dark ? 'rgba(255,255,255,0.12)' : 'rgba(17,19,24,0.12)'}`, display: 'flex', alignItems: 'center', fontSize: s * 0.8, fontWeight: 600, color: L.ink, boxSizing: 'border-box', whiteSpace: 'nowrap' };
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 40, 0)}px) scale(${mix(enter, 0.97, 1)})`, fontFamily: L.font }}>
      <div style={{ ...surfaceStyle(L, 5, s * 1.2), position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: pad, right: pad, top: 0, height: titleH, display: 'flex', alignItems: 'center', gap: s * 0.6, borderBottom: `1px solid ${L.line}` }}>
        <MarkSlot mark={mark} icon="CalendarDays" colors={['#FF7A6B', '#E2392E']} size={s * 1.5} />
        <div style={{ fontSize: s * 1.15, fontWeight: 660, letterSpacing: '-0.02em', color: L.ink, whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ display: 'flex', color: L.muted, marginLeft: s * 0.3 }}>
          <Icon name="ChevronLeft" size={s * 1.05} stroke={2.2} />
          <Icon name="ChevronRight" size={s * 1.05} stroke={2.2} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={btn}>Today</div>
        <div style={{ display: 'flex', height: s * 1.6, borderRadius: s * 0.42, background: L.fill, padding: s * 0.14, boxSizing: 'border-box' }}>
          {['Day', 'Week', 'Month'].map((v, k) => (
            <div key={v} style={{ padding: `0 ${s * 0.65}px`, display: 'flex', alignItems: 'center', borderRadius: s * 0.3, fontSize: s * 0.78, fontWeight: 600, color: k === 1 ? L.ink : L.muted, background: k === 1 ? (L.dark ? '#3A3C43' : '#FFFFFF') : 'transparent', boxShadow: k === 1 ? '0 1px 2px rgba(0,0,0,0.08)' : undefined }}>
              {v}
            </div>
          ))}
        </div>
      </div>
      {days.map((d, i) => (
        <div key={d} style={{ position: 'absolute', left: pad + gutter + i * colW, top: gridTop, width: colW, height: headH, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: s * 0.4, fontSize: s * 0.9, color: L.muted }}>
          {d}
          <span style={{ width: s * 1.55, height: s * 1.55, borderRadius: s, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, background: i === today ? L.accent : 'transparent', color: i === today ? L.accentInk : L.ink }}>{dates[i]}</span>
        </div>
      ))}
      {Array.from({ length: to - from }, (_, k) => (
        <React.Fragment key={k}>
          <div style={{ position: 'absolute', left: pad + gutter, right: pad, top: gridTop + headH + k * hourH, height: 1, background: L.line }} />
          <div style={{ position: 'absolute', left: pad, width: gutter - s * 0.6, top: gridTop + headH + k * hourH - s * 0.45, textAlign: 'right', fontSize: s * 0.78, color: L.faint, fontVariantNumeric: 'tabular-nums' }}>{from + k}:00</div>
        </React.Fragment>
      ))}
      {days.map((d, i) => (i > 0 ? <div key={`v${d}`} style={{ position: 'absolute', left: pad + gutter + i * colW, top: gridTop + headH, bottom: pad, width: 1, background: L.line }} /> : null))}
      {events.map((e, i) => {
        const d = (e.day + (e.start - from) * 0.5) / maxD;
        const s0 = start + Math.pow(d, 0.85) * wave;
        if (frame < s0) return null;
        const g = at(frame, s0, 5, ease.out);
        const c = at(frame, s0 + 5, 6, ease.out);
        const top = gridTop + headH + (e.start - from) * hourH + 3;
        const hh = e.len * hourH - 6;
        const ink = L.dark ? mixColor(e.color, '#FFFFFF', 0.45) : mixColor(e.color, '#000000', 0.38);
        const two = hh > s * 2.25;
        return (
          <div key={i} style={{ position: 'absolute', left: pad + gutter + e.day * colW + 5, top, width: colW - 10, height: hh, borderRadius: s * 0.35, background: mixColor(L.surface, e.color, mix(c, 0.06, L.dark ? 0.26 : 0.15)), opacity: g, transform: `scale(${mix(g, 0.92, 1)})`, padding: `${s * 0.28}px ${s * 0.4}px ${s * 0.28}px ${s * 0.62}px`, boxSizing: 'border-box', overflow: 'hidden', lineHeight: 1.25 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: s * 0.16, background: e.color, opacity: c }} />
            <div style={{ opacity: c, fontSize: s * 0.9, fontWeight: 620, color: ink, whiteSpace: 'nowrap' }}>{e.title}</div>
            {two && <div style={{ opacity: c * 0.85, fontSize: s * 0.72, color: ink, whiteSpace: 'nowrap', marginTop: s * 0.06, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.start)} - {fmt(e.start + e.len)}</div>}
          </div>
        );
      })}
      {now !== undefined && nowP > 0 && (
        <div style={{ position: 'absolute', left: pad + gutter + today * colW - s * 0.2, width: colW * nowP + s * 0.2, top: gridTop + headH + (now - from) * hourH - 1, height: 2.5, background: '#E5473A', borderRadius: 2 }}>
          <div style={{ position: 'absolute', left: -s * 0.1, top: -s * 0.25 + 1, width: s * 0.5, height: s * 0.5, borderRadius: s, background: '#E5473A' }} />
        </div>
      )}
    </div>
  );
};

export const CalendarWave = withPace(CalendarWaveInner);
