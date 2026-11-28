// PickList (ui, emphasis): a command palette: a query typed, the list travels in one move until the target row sits
// in the band, Enter.
// Numbers: typing at 8 characters a second; travel 34-36 f on cubic-bezier(0.25, 0.6, 0.1, 1); push 1 to 1.03 over 24
// f; Enter 16 f after.
// Caution: 12 rows or more so the travel reads as a search; the query matches the target.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor, typingTimes } from '../../type';
import { bez, Caret, CheckDisc, Face, InkTyped, KeyHint, type Look, MarkSlot, Paced, Pill, Presence, surfaceStyle, useUiFrame, withPace } from './_shared';

export type PersonRow = {
  name: string;
  role: string;
  color?: string;
  /** Presence dot colour on the avatar. */
  presence?: string;
  status?: { label: string; color?: string };
  /** A trailing value: a local time, a count. */
  trail?: string;
};

/**
 * A list that travels to one row and picks it out: a command palette. A query is typed into its search field at a
 * believable pace (fresh ink, a caret); from the first key the list travels in one decelerating move (fast, then a long
 * landing) until the `target` row sits in the fixed highlight band, which spans the whole row; every row stays at full
 * strength (only the top and bottom edges soften so nothing is cut). On landing the band takes a 2 px ring (a fainter
 * second ring breathes out), the row's key hint appears, the palette pushes in 3 %, and `pickAt` frames later the
 * footer's Enter key presses and a check pops at the row's end. Centre at (x, y).
 */
const PickListInner: React.FC<{
  L: Look;
  rows: PersonRow[];
  target: number;
  query: string;
  at: number;
  dur?: number;
  x?: number;
  y?: number;
  w?: number;
  show?: number;
  size?: number;
  title?: string;
  section?: string;
  /** Frames after landing before Enter is pressed. */
  pickAt?: number;
  pickLabel?: string;
  /** The app's real logo, beside the title. */
  mark?: React.ReactNode;
  speed?: number;
}> = ({ L, rows, target, query, at: start, dur = 34, x: xIn, y: yIn, w = 1320, show = 6, size = 30, title = 'Assign reviewer', section = 'People', pickAt = 16, pickLabel = 'Assign', mark, speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const { fps } = useVideoConfig();
  const s = size;
  const times = typingTimes(query, start + 12, fps, 8, 4);
  const typedEnd = times[times.length - 1] ?? start;
  const shown = times.filter((k) => frame >= k).length;
  const go = (times[0] ?? start) + 2;
  const landF = go + dur;
  const curve = bez(0.25, 0.6, 0.1, 1);
  const p = curve(clamp((frame - go) / dur));
  const prev = curve(clamp((frame - 1 - go) / dur));
  const mid = Math.floor(show / 2);
  const pos = mix(p, 0, target - mid);
  const vel = Math.abs(p - prev) * Math.abs(target - mid);
  const land = at(frame, landF - 2, 8, ease.out);
  const push = at(frame, landF - 2, 24, bez(0.2, 0.8, 0.2, 1));
  const pick = landF + pickAt;
  const keyDown = at(frame, pick - 2, 2, ease.out) - at(frame, pick + 1, 5, ease.out);
  const enter = springAt(frame, 30, start - 12, springs.ui);
  const hh = s * 3.5;
  const titleH = s * 2.5;
  const secH = s * 2.1;
  const rowH = s * 2.75;
  const inset = s * 0.5;
  const footH = s * 2.6;
  const listH = show * rowH;
  const H = titleH + hh + secH + listH + inset + footH;
  const listTop = titleH + hh + secH;
  const bandY = listTop + mid * rowH;
  const hint = (k: string, label: string, down = 0) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.35, color: L.muted, fontSize: s * 0.8, whiteSpace: 'nowrap' }}>
      <KeyHint L={L} k={k} size={s * 0.68} style={{ transform: `translateY(${down * 2}px)`, boxShadow: down > 0.3 ? 'none' : undefined, background: down > 0.3 ? L.fill : undefined }} />
      {label}
    </div>
  );
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', left: x - w / 2, top: y - H / 2, width: w, height: H, transform: `translateY(${mix(enter, 40, 0)}px) scale(${mix(push, 1, 1.03)})`, opacity: clamp(enter * 2), fontFamily: L.font }}>
        <div style={{ ...surfaceStyle(L, 6, s * 1.1), position: 'absolute', inset: 0 }} />
        {/* title */}
        <div style={{ position: 'absolute', left: s * 1.1, right: s * 1.1, top: 0, height: titleH, display: 'flex', alignItems: 'center', gap: s * 0.5 }}>
          <MarkSlot mark={mark} icon="UserPlus" colors={['#5B86FF', '#2350E6']} size={s * 1.2} />
          <div style={{ fontSize: s * 0.9, fontWeight: 600, color: L.muted, whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: s * 0.8, color: L.faint, whiteSpace: 'nowrap' }}>Pull request 482</div>
        </div>
        {/* search */}
        <div style={{ position: 'absolute', left: s * 1.1, right: s * 1.1, top: titleH, height: hh, display: 'flex', alignItems: 'center', gap: s * 0.6, borderTop: `1px solid ${L.line}`, borderBottom: `1px solid ${L.line}` }}>
          <Icon name="Search" size={s * 1.1} color={L.muted} stroke={2.2} />
          <div style={{ flex: 1, fontSize: s * 1.2, letterSpacing: '-0.015em', whiteSpace: 'nowrap', color: L.ink }}>
            {shown > 0 ? <InkTyped text={query} times={times} color={L.ink} born={L.accent} cool={6} /> : <span style={{ color: L.faint }}>Search people</span>}
            <Caret color={L.accent} height={s * 1.3} typing={frame < typedEnd + 2} since={typedEnd} hidden={frame < start + 6} />
          </div>
          <KeyHint L={L} k="esc" size={s * 0.7} />
        </div>
        <div style={{ position: 'absolute', left: s * 1.1, top: titleH + hh, height: secH, display: 'flex', alignItems: 'center', gap: s * 0.4, fontSize: s * 0.82, fontWeight: 560, color: L.muted, whiteSpace: 'nowrap' }}>
          {section}
          <span style={{ color: L.faint, fontVariantNumeric: 'tabular-nums' }}>{rows.length}</span>
        </div>
        {/* the band: the whole row */}
        <div style={{ position: 'absolute', left: inset, right: inset, top: bandY, height: rowH, borderRadius: s * 0.55, background: mixColor(L.surface, L.accent, L.dark ? 0.16 : 0.085), boxShadow: land > 0 ? `inset 0 0 0 ${mix(land, 0, 2)}px ${L.accent}` : undefined }} />
        {land > 0 && land < 1 && (
          <div style={{ position: 'absolute', left: inset - 14 * land, right: inset - 14 * land, top: bandY - 14 * land, height: rowH + 28 * land, borderRadius: s * 0.55 + 14 * land, border: `2px solid ${L.accent}`, opacity: (1 - land) * 0.4 }} />
        )}
        <div style={{ position: 'absolute', left: inset, right: inset, top: listTop, height: listH, overflow: 'hidden', WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${rowH * 0.35}px, #000 calc(100% - ${rowH * 0.35}px), transparent 100%)` }}>
          {rows.map((r, i) => {
            const yy = (i - pos) * rowH;
            if (yy < -rowH * 1.2 || yy > listH + rowH * 0.2) return null;
            const chosen = i === target;
            const picked = chosen && frame >= pick;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: yy, height: rowH, padding: `0 ${s * 0.6}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: s * 0.6, filter: vel > 0.06 ? `blur(${Math.min(1.6, vel * 6)}px)` : undefined }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Face name={r.name} color={r.color} size={s * 1.7} />
                  {r.presence && <Presence L={L} color={r.presence} size={s * 1.7} />}
                </div>
                <div style={{ fontSize: s, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{r.name}</div>
                <div style={{ flex: 1, fontSize: s * 0.9, color: L.muted, whiteSpace: 'nowrap' }}>{r.role}</div>
                {r.status && <Pill L={L} label={r.status.label} color={r.status.color} size={s * 0.74} />}
                {r.trail && <div style={{ width: s * 2.6, textAlign: 'right', fontSize: s * 0.86, color: L.faint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.trail}</div>}
                <div style={{ width: s * 1.5, height: s * 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {picked ? <CheckDisc size={s * 1.15} color={L.accent} at={pick} /> : chosen && land > 0.5 ? <KeyHint L={L} k="↵" size={s * 0.68} /> : null}
                </div>
              </div>
            );
          })}
        </div>
        {/* footer */}
        <div style={{ position: 'absolute', left: s * 1.1, right: s * 1.1, bottom: 0, height: footH, borderTop: `1px solid ${L.line}`, display: 'flex', alignItems: 'center', gap: s * 1.2 }}>
          {hint('↑↓', 'Navigate')}
          {hint('↵', pickLabel, keyDown)}
          <div style={{ flex: 1 }} />
          {hint('⌘↵', `${pickLabel} and notify`)}
        </div>
      </div>
    </Paced>
  );
};

export const PickList = withPace(PickListInner);
