// Motion library, ui: lists and grids. A row that opens in place into its detail (one object, no colour jump), a list
// that travels to one row and picks it out, a stepped list carousel, a task run (spinner to check, accelerating), and
// a calendar that fills in a wave (pale first, then the colour).
import React from 'react';

import { at, clamp, ease, mix, springAt, springs } from '../motion';
import { mixColor } from '../type';
import { Icon } from '../icons';
import { AppPane, Face, Glyph, KeyHint, MarkSlot, PaneSidebar, Paced, Pill, Pointer, Presence, SearchField, bez, paneBar, pointerAt, pressOf, surfaceStyle, useUiFrame, withPace, Caret, InkTyped, type Look } from './ui-base';
import { useVideoConfig } from 'remotion';
import { typingTimes } from '../type';

export type MailData = {
  from: string;
  /** Avatar colour (a neutral letter avatar). */
  color?: string;
  time: string;
  subject: string;
  preview: string;
  unread?: boolean;
  tag?: { label: string; color: string };
  attach?: boolean;
};

/**
 * An inbox row that opens in place into its message. An app pane (title bar, folder sidebar, a list header with a count
 * and a search field) holds rows of avatar, sender, time, tag, subject and a one-line preview. A pointer arcs onto row
 * `index`, the whole row takes the hover fill, the press answers (the row dips 1 %), and the row's own box grows into
 * the message card over the list (position, size, radius and shadow together, 20 f, a long soft landing); the avatar,
 * the sender, the time and the subject are the same objects and travel to the header (the subject grows 1.45x), the
 * unread dot clears, the preview gives way, then the body blocks (`detail`) and the action bar rise in 3 f apart. The
 * card's surface never changes colour. `closeAt` folds it back into its row. The pane is centred at (x, y).
 */
const RowExpandInner: React.FC<{
  L: Look;
  rows: MailData[];
  index: number;
  at: number;
  openAt?: number;
  closeAt?: number;
  /** Body blocks of the opened message, drawn under its header one after another. */
  detail: React.ReactNode[];
  actions?: Array<{ label: string; icon: string; key?: string }>;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  size?: number;
  title?: string;
  /** The app's real logo for the title bar. */
  mark?: React.ReactNode;
  folders?: Array<{ icon: string; label: string; count?: string }>;
  labels?: Array<{ color: string; label: string }>;
  listTitle?: string;
  newCount?: string;
  /** The line under the sender in the opened message. */
  toLine?: string;
  pointer?: boolean;
  speed?: number;
}> = ({
  L,
  rows,
  index,
  at: start,
  openAt = 44,
  closeAt,
  detail,
  actions = [
    { label: 'Reply', icon: 'Reply', key: 'R' },
    { label: 'Forward', icon: 'Forward', key: 'F' },
    { label: 'Archive', icon: 'Archive', key: 'E' },
  ],
  x = 960,
  y = 540,
  w = 1600,
  h = 920,
  size = 27,
  title = 'Mail',
  mark,
  folders = [
    { icon: 'Inbox', label: 'Inbox', count: '12' },
    { icon: 'Star', label: 'Starred' },
    { icon: 'Send', label: 'Sent' },
    { icon: 'File', label: 'Drafts', count: '2' },
    { icon: 'Archive', label: 'Archive' },
  ],
  labels = [
    { color: '#E8892A', label: 'Finance' },
    { color: '#3D6BFF', label: 'Clients' },
    { color: '#D9534A', label: 'Urgent' },
  ],
  listTitle = 'Inbox',
  newCount = '12 new',
  toLine = 'to me',
  pointer = true,
  speed = 1,
}) => {
  const frame = start + (useUiFrame() - start) * speed;
  const s = size;
  const t = frame - start;
  if (t < -14) return null;
  const P = start + openAt;
  const curve = bez(0.3, 0, 0.1, 1);
  const o = at(frame, P, 20, curve) - (closeAt !== undefined ? at(frame, start + closeAt, 18, curve) : 0);
  const enter = springAt(frame, 30, start - 14, springs.ui);
  const bar = paneBar(s);
  const sideW = s * 10.5;
  const cw = w - sideW;
  const ch = h - bar;
  const lh = s * 3.6;
  const rowH = s * 5.2;
  const rp = s * 0.62;
  const padL = s * 1.7;
  const textX = padL + s * 2.75;
  const left = x - w / 2;
  const top = y - h / 2;
  const hv = at(frame, P - 12, 4, ease.out) * (closeAt !== undefined ? 1 - at(frame, start + closeAt + 14, 8, ease.out) : 1);
  const dip = pressOf(frame, [P - 2]);
  const read = at(frame, P + 2, 8, ease.out);
  const gap = s * 0.6;
  const box = {
    x: gap,
    y: mix(o, lh + index * rowH, gap),
    w: cw - gap * 2,
    h: mix(o, rowH, ch - gap * 2),
    r: mix(o, s * 0.5, s * 0.95),
  };
  const ds = closeAt !== undefined ? 1 - at(frame, start + closeAt - 4, 6, ease.out) : 1;
  const dp = (k: number) => at(frame, P + 10 + k * 3, 12, bez(0.2, 0.8, 0.2, 1)) * ds;
  const line = s * 1.34;
  const r = rows[index];
  const avS = mix(o, s * 2.1, s * 2.5);
  const avX = mix(o, padL, s * 1.5);
  const avY = mix(o, rp, s * 1.35);
  const nameX = mix(o, textX, s * 1.5 + s * 2.5 + s * 0.7);
  const nameY = mix(o, rp, s * 1.4);
  const subjY = mix(o, rp + line, s * 1.35 + s * 2.5 + s * 1.1);
  const subjX = mix(o, textX, s * 1.5);
  const subjK = mix(o, 1, 1.45);
  const rightPad = mix(o, s * 1.1, s * 1.5);

  const meta = (m: MailData) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.5, color: L.faint, fontSize: s * 0.86, whiteSpace: 'nowrap' }}>
      {m.attach && <Icon name="Paperclip" size={s * 0.85} color={L.faint} stroke={2} />}
      {m.tag && <Pill L={L} label={m.tag.label} color={m.tag.color} size={s * 0.74} />}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.time}</span>
    </div>
  );
  const row = (m: MailData, i: number) => (
    <div key={i} style={{ position: 'absolute', left: gap, width: cw - gap * 2, top: lh + i * rowH, height: rowH, fontFamily: L.font }}>
      {i > 0 && i !== index + 1 && <div style={{ position: 'absolute', left: textX, right: s * 1.1, top: 0, height: 1, background: L.line }} />}
      {m.unread && <div style={{ position: 'absolute', left: s * 0.62, top: rp + s * 0.48, width: s * 0.42, height: s * 0.42, borderRadius: s, background: L.accent }} />}
      <div style={{ position: 'absolute', left: padL, top: rp }}>
        <Face name={m.from} color={m.color} size={s * 2.1} />
      </div>
      <div style={{ position: 'absolute', left: textX, right: s * 1.1, top: rp, display: 'flex', alignItems: 'center', height: line }}>
        <div style={{ flex: 1, fontSize: s, fontWeight: m.unread ? 650 : 560, color: L.ink, whiteSpace: 'nowrap' }}>{m.from}</div>
        {meta(m)}
      </div>
      <div style={{ position: 'absolute', left: textX, top: rp + line, height: line, fontSize: s, fontWeight: m.unread ? 600 : 500, color: m.unread ? L.ink : mixColor(L.ink, L.muted, 0.4), whiteSpace: 'nowrap', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center' }}>{m.subject}</div>
      <div style={{ position: 'absolute', left: textX, top: rp + line * 2, height: line, fontSize: s * 0.93, color: L.muted, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>{m.preview}</div>
    </div>
  );

  const replyX = left + sideW + gap + s * 1.5 + s * 3.4;
  const footY = top + bar + gap + (ch - gap * 2) - s * 1.2 - s * 1.2;
  const rowCx = left + sideW + cw * 0.42;
  const rowCy = top + bar + lh + index * rowH + rowH * 0.5;
  const hoverReply = at(frame, P + 46, 4, ease.out) * ds;
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 36, 0)}px)` }}>
        <div style={{ position: 'absolute', left, top }}>
          <AppPane
            L={L}
            w={w}
            h={h}
            size={s}
            title={title}
            mark={mark}
            icon="Mail"
            colors={['#5B86FF', '#2350E6']}
            sideW={sideW}
            sidebar={<PaneSidebar L={L} items={folders} size={s} heading="Labels" more={labels} />}
            right={
              <div style={{ display: 'flex', gap: s * 0.9, color: L.muted }}>
                <Icon name="SquarePen" size={s} stroke={2} />
                <Icon name="SlidersHorizontal" size={s} stroke={2} />
              </div>
            }
          >
            <div style={{ position: 'absolute', left: textX + gap, right: s * 1.6, top: 0, height: lh, display: 'flex', alignItems: 'center', gap: s * 0.6, fontFamily: L.font }}>
              <div style={{ fontSize: s * 1.3, fontWeight: 660, letterSpacing: '-0.02em', color: L.ink }}>{listTitle}</div>
              <Pill L={L} label={newCount} color={L.accent} size={s * 0.78} />
              <div style={{ flex: 1 }} />
              <SearchField L={L} w={s * 12} size={s} placeholder="Search mail" />
            </div>
            {rows.map((m, i) => (i === index ? null : row(m, i)))}
            {/* the shared object: the row that becomes the message */}
            <div
              style={{
                position: 'absolute',
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                borderRadius: box.r,
                background: o > 0.001 ? L.surface : mixColor(L.surface, L.dark ? '#FFFFFF' : '#111318', hv * (L.dark ? 0.05 : 0.045)),
                boxShadow: o > 0.001 ? (surfaceStyle(L, mix(o, 1, 6), 0).boxShadow as string) : undefined,
                border: o > 0.001 ? `1px solid ${L.line}` : '1px solid transparent',
                boxSizing: 'border-box',
                overflow: 'hidden',
                transform: `scale(${1 - dip * 0.01})`,
                fontFamily: L.font,
                color: L.ink,
              }}
            >
              {r.unread && <div style={{ position: 'absolute', left: s * 0.62, top: rp + s * 0.48, width: s * 0.42, height: s * 0.42, borderRadius: s, background: L.accent, opacity: 1 - read, transform: `scale(${1 - read * 0.5})` }} />}
              <div style={{ position: 'absolute', left: avX, top: avY }}>
                <Face name={r.from} color={r.color} size={avS} />
              </div>
              <div style={{ position: 'absolute', left: nameX, right: rightPad, top: nameY, height: line, display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: s, fontWeight: r.unread ? 650 : 560, whiteSpace: 'nowrap' }}>{r.from}</div>
                {meta(r)}
              </div>
              <div style={{ position: 'absolute', left: nameX, top: nameY + line, height: line, display: 'flex', alignItems: 'center', fontSize: s * 0.88, color: L.muted, whiteSpace: 'nowrap', opacity: clamp(o * 2 - 0.8) }}>{toLine}</div>
              <div style={{ position: 'absolute', left: subjX, top: subjY, height: line, display: 'flex', alignItems: 'center', fontSize: s, fontWeight: 600, letterSpacing: '-0.012em', whiteSpace: 'nowrap', transformOrigin: '0% 50%', transform: `scale(${subjK})` }}>{r.subject}</div>
              <div style={{ position: 'absolute', left: textX, top: rp + line * 2, height: line, display: 'flex', alignItems: 'center', fontSize: s * 0.93, color: L.muted, whiteSpace: 'nowrap', opacity: 1 - clamp(o * 3) }}>{r.preview}</div>
              {o > 0.02 && (
                <>
                  <div style={{ position: 'absolute', left: s * 1.5, right: s * 1.5, top: s * 7.7, height: 1, background: L.line, opacity: dp(0), transformOrigin: '0 0', transform: `scaleX(${dp(0)})` }} />
                  <div style={{ position: 'absolute', left: s * 1.5, right: s * 1.5, top: s * 8.7 }}>
                    {detail.map((c, k) => (
                      <div key={k} style={{ opacity: dp(k + 1), transform: `translateY(${mix(dp(k + 1), 18, 0)}px)` }}>
                        {c}
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'absolute', left: s * 1.5, right: s * 1.5, bottom: s * 1.2, height: s * 2.4, display: 'flex', alignItems: 'center', gap: s * 0.6, opacity: dp(detail.length + 1), transform: `translateY(${mix(dp(detail.length + 1), 18, 0)}px)` }}>
                    {actions.map((a, k) => (
                      <div
                        key={a.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: s * 0.45,
                          height: s * 2.2,
                          padding: `0 ${s * 0.5}px 0 ${s * 0.85}px`,
                          borderRadius: s * 0.55,
                          boxSizing: 'border-box',
                          background: k === 0 ? mixColor(L.accent, '#000000', hoverReply * 0.12) : 'transparent',
                          border: k === 0 ? 'none' : `1px solid ${L.dark ? 'rgba(255,255,255,0.12)' : 'rgba(17,19,24,0.12)'}`,
                          boxShadow: k === 0 ? `0 ${s * 0.25}px ${s * 0.7}px -${s * 0.3}px ${L.accent}` : undefined,
                          color: k === 0 ? L.accentInk : L.ink,
                          fontSize: s * 0.92,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Icon name={a.icon} size={s * 0.95} stroke={2.2} />
                        {a.label}
                        {a.key && (
                          <KeyHint
                            L={k === 0 ? { ...L, muted: 'rgba(255,255,255,0.9)' } : L}
                            k={a.key}
                            size={s * 0.66}
                            style={k === 0 ? { background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.24)', boxShadow: 'none' } : undefined}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </AppPane>
        </div>
        {pointer && (
          <Pointer
            start={P - 36}
            keys={[
              { f: P - 36, x: rowCx + 420, y: rowCy + 380 },
              { f: P - 10, x: rowCx, y: rowCy + s * 0.3 },
              { f: P + 28, x: rowCx + 24, y: rowCy + s * 0.5 },
              { f: P + 48, x: replyX, y: footY },
            ]}
            clicks={[P - 2]}
            exitAt={closeAt !== undefined ? start + closeAt - 16 : undefined}
            size={s * 2.5}
            ring={mixColor(L.accent, '#FFFFFF', 0.45)}
          />
        )}
      </div>
    </Paced>
  );
};
export const RowExpand = withPace(RowExpandInner);

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
}> = ({ L, rows, target, query, at: start, dur = 34, x = 960, y = 540, w = 1320, show = 6, size = 30, title = 'Assign reviewer', section = 'People', pickAt = 16, pickLabel = 'Assign', mark, speed = 1 }) => {
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

/**
 * A stepped list carousel: an icon tile with four accent ticks at its corners beside a list whose active item is big in
 * the ink while its neighbours fade by distance. On each step the list moves one pitch in 2 f
 * (cubic-bezier(0.2, 0.9, 0.3, 1)) and the tile's icon swaps by cut on the same frame; holds between steps
 * (`every`, default 5 f, may be a list so the steps accelerate).
 */
const StepListInner: React.FC<{
  L: Look;
  items: Array<{ label: string; icon: string }>;
  at: number;
  every?: number | number[];
  x?: number;
  y?: number;
  size?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, items, at: start, every = 5, x = 960, y = 540, size = 64 , speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  const gaps = Array.isArray(every) ? every : items.map(() => every);
  const stepsAt: number[] = [];
  let acc = 0;
  for (let i = 0; i < items.length - 1; i++) {
    acc += gaps[i] ?? gaps[gaps.length - 1];
    stepsAt.push(acc);
  }
  let pos = 0;
  for (const s of stepsAt) pos += at(t, s, 2, bez(0.2, 0.9, 0.3, 1));
  const active = Math.min(items.length - 1, stepsAt.filter((s) => t >= s).length);
  const pitch = size * 1.25;
  const tile = size * 2.6;
  const enter = springAt(frame, 30, start - 10, springs.ui);
  const tick = (sx: number, sy: number, k: number) => (
    <svg key={k} width={22} height={22} viewBox="0 0 22 22" style={{ position: 'absolute', left: sx - 11, top: sy - 11 }}>
      <path d="M11 0 C12 8 14 10 22 11 C14 12 12 14 11 22 C10 14 8 12 0 11 C8 10 10 8 11 0 Z" fill={L.accent} />
    </svg>
  );
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: clamp(enter * 2), transform: `scale(${mix(enter, 0.96, 1)})` }}>
      <div style={{ position: 'absolute', left: -tile - size * 0.6, top: -tile / 2, width: tile, height: tile }}>
        <div style={{ ...surfaceStyle(L, 2, size * 0.42), position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={items[active].icon} size={size * 1.05} color={L.ink} stroke={2} />
        </div>
        {[tick(-14, -14, 0), tick(tile + 14, -14, 1), tick(-14, tile + 14, 2), tick(tile + 14, tile + 14, 3)]}
      </div>
      <div style={{ position: 'absolute', left: size * 0.2, top: 0, fontFamily: L.font, whiteSpace: 'nowrap' }}>
        {items.map((it, i) => {
          const d = i - pos;
          const ad = Math.abs(d);
          if (ad > 3.2) return null;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: d * pitch - size * 0.62, fontSize: size, fontWeight: 560, letterSpacing: '-0.02em', color: mixColor(L.ink, L.faint, clamp(ad)), opacity: [1, 0.55, 0.28, 0.1][Math.min(3, Math.round(ad))] ?? 0, filter: ad > 0.5 ? `blur(${mix(clamp(ad - 0.5), 0, 1.4)}px)` : undefined }}>
              {it.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * A task run: rows join a card one by one (fade, rise 20 px, 4 f) with a spinner stepping 45 degrees a frame and a
 * muted "working" label; when the next row arrives the previous one closes: its spinner becomes a filled check, the
 * label crosses to the done word and its title steps up to the ink. The cadence accelerates (default intervals 9, 9, 9,
 * 7, 5, 4, 3, 3), and the card scrolls one row (6 f ease-out) once `show` rows are full. The last row closes at
 * `doneAt`.
 */
const TaskRunInner: React.FC<{
  L: Look;
  tasks: string[];
  at: number;
  gaps?: number[];
  working?: string;
  done?: string;
  doneAt?: number;
  x?: number;
  y?: number;
  w?: number;
  show?: number;
  size?: number;
  /** A header line over the list, with a live "n of N" count at its right. */
  title?: string;
  /** The app's real logo beside the title. */
  mark?: React.ReactNode;
  speed?: number;
}> = ({ L, tasks, at: start, gaps = [12, 11, 10, 8, 6, 5, 4, 3, 3], working = 'Working', done = 'Done', doneAt, x = 960, y = 540, w = 980, show = 6, size = 32, title, mark, speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const T: number[] = [start];
  for (let i = 1; i < tasks.length; i++) T.push(T[i - 1] + (gaps[i - 1] ?? 3));
  const close = (i: number) => (i + 1 < tasks.length ? T[i + 1] : doneAt !== undefined ? start + doneAt : Infinity);
  const rowH = size * 2.1;
  const pad = size * 0.8;
  const headH = title ? size * 2.6 : 0;
  const H = show * rowH + pad * 2 + headH;
  let doneN = 0;
  for (let i = 0; i < tasks.length; i++) if (frame >= close(i)) doneN++;
  let scroll = 0;
  for (let i = show; i < tasks.length; i++) scroll += at(frame, T[i], 6, ease.out);
  const enter = springAt(frame, 30, start - 10, springs.ui);
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - H / 2, width: w, height: H, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 30, 0)}px)` }}>
      <div style={{ ...surfaceStyle(L, 3, size * 1.1), position: 'absolute', inset: 0 }} />
      {title && (
        <div style={{ position: 'absolute', left: pad * 1.25, right: pad * 1.25, top: pad, height: headH - pad * 0.4, display: 'flex', alignItems: 'center', fontFamily: L.font, borderBottom: `1px solid ${L.line}` }}>
          <MarkSlot mark={mark} icon="Store" colors={['#5B86FF', '#2350E6']} size={size * 1.4} />
          <div style={{ flex: 1, fontSize: size * 1.05, fontWeight: 620, color: L.ink, letterSpacing: '-0.012em', marginLeft: size * 0.55 }}>{title}</div>
          <div style={{ fontSize: size * 0.92, color: L.muted, fontVariantNumeric: 'tabular-nums' }}>
            {doneN} of {tasks.length}
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', left: pad * 1.25, right: pad * 1.25, top: pad + headH, bottom: pad, overflow: 'hidden', WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${rowH * 0.5}px)` }}>
        {tasks.map((task, i) => {
          if (frame < T[i]) return null;
          const p = at(frame, T[i], 4, ease.out);
          const c = close(i);
          const isDone = frame >= c;
          const q = at(frame, c, 3, ease.out);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i - scroll) * rowH + mix(p, 20, 0), height: rowH, display: 'flex', alignItems: 'center', gap: size * 0.6, fontFamily: L.font, fontSize: size, opacity: p }}>
              <div style={{ width: size * 1.1, height: size * 1.1, flexShrink: 0, position: 'relative' }}>
                {!isDone ? <StepSpinner size={size * 1.1} color={L.accent} track={L.line} since={T[i]} /> : <CheckDisc size={size * 1.1} color={L.accent} at={c} />}
              </div>
              <div style={{ width: size * 6.2, color: isDone ? L.faint : L.muted, flexShrink: 0, whiteSpace: 'nowrap' }}>{isDone ? done : `${working}…`}</div>
              <div style={{ flex: 1, color: mixColor(L.muted, L.ink, isDone ? q : 0.55), fontWeight: isDone ? 600 : 500, whiteSpace: 'nowrap' }}>{task}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StepSpinner: React.FC<{ size: number; color: string; track: string; since: number }> = ({ size, color, track, since }) => {
  const frame = useUiFrame();
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: `rotate(${(frame - since) * 45}deg)` }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${c * 0.3} ${c}`} />
    </svg>
  );
};

/** A filled disc in the accent that pops (0.6, 1.12, 1) with a white check drawing in 5 frames. */
export const CheckDisc: React.FC<{ size: number; color: string; at: number; ink?: string }> = ({ size, color, at: a, ink = '#FFFFFF' }) => {
  const frame = useUiFrame();
  const pop = springAt(frame, 30, a, springs.pop);
  const d = at(frame, a + 1, 5, ease.out);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${mix(pop, 0.6, 1)})`, overflow: 'visible' }}>
      <circle cx={12} cy={12} r={11.5} fill={color} />
      <path d="M7 12.4 L10.4 15.6 L17 8.8" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={16} strokeDashoffset={16 * (1 - d)} />
    </svg>
  );
};

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
}> = ({ L, events, at: start, wave = 22, days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], dates = [12, 13, 14, 15, 16], today = 2, from = 9, to = 17, now = 11.6, title = 'May 2026', mark, x = 960, y = 540, w = 1500, h = 860, size = 30, speed = 1 }) => {
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
export const StepList = withPace(StepListInner);
export const TaskRun = withPace(TaskRunInner);
export const CalendarWave = withPace(CalendarWaveInner);

export type BoardCard = {
  id: string;
  title: string;
  tag: { label: string; color: string };
  who: string;
  whoColor?: string;
  due?: string;
  comments?: number;
  checks?: string;
};

/**
 * A pointer picks up a card and drops it in another column: a project board in its window. A toolbar (sprint name,
 * days left, a view switch, people) over three columns of cards (tag, id, title, assignee, due date, comments,
 * checklist). The pointer arcs onto card `from` [column, index] and hovers it (shadow up one level); the press lifts it
 * (scale 1.04, tilt 2.5 degrees, shadow to the top level, 8 f) and the column closes the gap behind it (10 f); the card
 * rides the pointer along an arc to column `to`, where a placeholder opens and the cards below step down; on release it
 * settles into the slot (10 f, tilt and scale back, shadow down) and both column counts change. Pane centred at (x, y).
 */
const BoardDragInner: React.FC<{
  L: Look;
  columns: Array<{ name: string; color: string; cards: BoardCard[] }>;
  from: [number, number];
  to: [number, number];
  at: number;
  pressAt?: number;
  /** Frames the drag takes. */
  dur?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  size?: number;
  title?: string;
  sprint?: string;
  left?: string;
  mark?: React.ReactNode;
  speed?: number;
}> = ({ L, columns, from, to, at: start, pressAt = 40, dur = 30, x = 960, y = 540, w = 1640, h = 920, size = 26, title = 'Roadmap', sprint = 'Sprint 14', left: daysLeft = '6 days left', mark, speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const s = size;
  const enter = springAt(frame, 30, start - 14, springs.ui);
  const bar = paneBar(s);
  const tb = s * 3.4;
  const pad = s * 1.1;
  const colGap = s * 0.9;
  const colW = (w - pad * 2 - colGap * (columns.length - 1)) / columns.length;
  const colHead = s * 2.4;
  const cardH = s * 6.4;
  const cardGap = s * 0.6;
  const pitch = cardH + cardGap;
  const L0 = x - w / 2;
  const T0 = y - h / 2;
  const colX = (c: number) => L0 + pad + c * (colW + colGap);
  const cardsTop = T0 + bar + tb + colHead + s * 0.5;
  const P = start + pressAt;
  const D0 = P + 6;
  const D1 = D0 + dur;
  const lift = at(frame, P, 8, bez(0.2, 0.8, 0.2, 1));
  const settle = at(frame, D1 + 1, 10, bez(0.3, 0, 0.1, 1));
  const hover = at(frame, P - 10, 4, ease.out);
  const closeGap = at(frame, P + 4, 10, bez(0.3, 0, 0.1, 1));
  const openGap = at(frame, D0 + dur * 0.45, 10, bez(0.3, 0, 0.1, 1));
  const dropped = frame >= D1 + 1;
  const [fc, fi] = from;
  const [tc, ti] = to;
  const dragCard = columns[fc].cards[fi];
  const homeX = colX(fc);
  const homeY = cardsTop + fi * pitch;
  const slotX = colX(tc);
  const slotY = cardsTop + ti * pitch;
  const grab = { dx: colW * 0.55, dy: cardH * 0.42 };
  const keys = [
    { f: P - 34, x: homeX + grab.dx + 460, y: homeY + grab.dy + 360 },
    { f: P - 4, x: homeX + grab.dx, y: homeY + grab.dy },
    { f: D0, x: homeX + grab.dx + 6, y: homeY + grab.dy - 10 },
    { f: D1, x: slotX + grab.dx, y: slotY + grab.dy, curve: bez(0.4, 0, 0.15, 1) },
    { f: D1 + 30, x: slotX + grab.dx + 70, y: slotY + grab.dy + 120 },
  ];
  const ptr = pointerAt(frame, keys);
  const dropPt = pointerAt(D1, keys);
  const cx = dropped ? mix(settle, dropPt.x - grab.dx, slotX) : frame >= P ? ptr.x - grab.dx : homeX;
  const cy = dropped ? mix(settle, dropPt.y - grab.dy, slotY) : frame >= P ? ptr.y - grab.dy : homeY;
  const up = dropped ? 1 - settle : lift;
  const tilt = up * -2.5 + clamp(ptr.vx / 30, -1, 1) * up * 1.5;
  const card = (c: BoardCard, style: React.CSSProperties, level = 1) => (
    <div style={{ ...surfaceStyle(L, level, s * 0.6), position: 'absolute', width: colW, height: cardH, padding: `${s * 0.75}px ${s * 0.8}px`, display: 'flex', flexDirection: 'column', fontFamily: L.font, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.4 }}>
        <Pill L={L} label={c.tag.label} color={c.tag.color} size={s * 0.72} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: s * 0.78, color: L.faint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{c.id}</span>
      </div>
      <div style={{ marginTop: s * 0.6, fontSize: s * 0.98, fontWeight: 600, color: L.ink, letterSpacing: '-0.01em', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{c.title}</div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.75, color: L.muted, fontSize: s * 0.8, whiteSpace: 'nowrap' }}>
        <Face name={c.who} color={c.whoColor} size={s * 1.35} />
        {c.due && (
          <span style={{ display: 'flex', alignItems: 'center', gap: s * 0.25 }}>
            <Icon name="Calendar" size={s * 0.8} stroke={2} />
            {c.due}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {c.comments !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: s * 0.25, fontVariantNumeric: 'tabular-nums' }}>
            <Icon name="MessageSquare" size={s * 0.8} stroke={2} />
            {c.comments}
          </span>
        )}
        {c.checks && (
          <span style={{ display: 'flex', alignItems: 'center', gap: s * 0.25, fontVariantNumeric: 'tabular-nums' }}>
            <Icon name="SquareCheck" size={s * 0.8} stroke={2} />
            {c.checks}
          </span>
        )}
      </div>
    </div>
  );
  const nodes: React.ReactNode[] = [];
  columns.forEach((col, c) => {
    let count = col.cards.length;
    if (dropped) count += c === tc ? 1 : c === fc ? -1 : 0;
    const cx0 = colX(c);
    nodes.push(
      <div key={`h${c}`} style={{ position: 'absolute', left: cx0, top: T0 + bar + tb, width: colW, height: colHead, display: 'flex', alignItems: 'center', gap: s * 0.5, fontFamily: L.font }}>
        <div style={{ width: s * 0.5, height: s * 0.5, borderRadius: s, background: col.color }} />
        <div style={{ fontSize: s * 0.95, fontWeight: 620, color: L.ink, whiteSpace: 'nowrap' }}>{col.name}</div>
        <div style={{ fontSize: s * 0.85, color: L.faint, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
        <div style={{ flex: 1 }} />
        <Icon name="Plus" size={s * 0.95} color={L.faint} stroke={2} />
        <Icon name="Ellipsis" size={s * 0.95} color={L.faint} stroke={2} />
      </div>,
    );
    col.cards.forEach((cd, i) => {
      if (c === fc && i === fi) return;
      let dy = 0;
      if (c === fc && i > fi) dy -= pitch * closeGap;
      if (c === tc && i >= ti) dy += pitch * openGap;
      nodes.push(card(cd, { left: cx0, top: cardsTop + i * pitch + dy }, 1));
    });
    if (c === tc) {
      const ph = openGap * (1 - settle);
      if (ph > 0.01) nodes.push(<div key="ph" style={{ position: 'absolute', left: cx0, top: slotY, width: colW, height: cardH, borderRadius: s * 0.6, border: `2px dashed ${mixColor(L.surface, L.accent, 0.5)}`, background: mixColor(L.surface, L.accent, 0.06), boxSizing: 'border-box', opacity: ph }} />);
    }
  });
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 36, 0)}px)` }}>
        <div style={{ position: 'absolute', left: L0, top: T0 }}>
          <AppPane
            L={L}
            w={w}
            h={h}
            size={s}
            title={title}
            mark={mark}
            icon="KanbanSquare"
            colors={['#FF9A5C', '#EC5A2A']}
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.6 }}>
                <div style={{ display: 'flex' }}>
                  {['Ada Moreno', 'Ben Ito', 'Cleo Grant'].map((n, k) => (
                    <div key={n} style={{ marginLeft: k ? -s * 0.35 : 0, borderRadius: s, boxShadow: `0 0 0 2px ${L.dark ? '#1B1C21' : '#FBFBFC'}` }}>
                      <Face name={n} color={['#C8692E', '#3D6BFF', '#4D5666'][k]} size={s * 1.3} />
                    </div>
                  ))}
                </div>
                <div style={{ height: s * 1.6, padding: `0 ${s * 0.7}px`, borderRadius: s * 0.4, background: L.ink, color: L.dark ? '#111318' : '#FFFFFF', display: 'flex', alignItems: 'center', fontFamily: L.font, fontSize: s * 0.82, fontWeight: 600 }}>Share</div>
              </div>
            }
          >
            <div style={{ position: 'absolute', left: pad, right: pad, top: 0, height: tb, display: 'flex', alignItems: 'center', gap: s * 0.6, fontFamily: L.font }}>
              <div style={{ fontSize: s * 1.3, fontWeight: 660, letterSpacing: '-0.02em', color: L.ink, whiteSpace: 'nowrap' }}>{sprint}</div>
              <Pill L={L} label={daysLeft} icon="Clock" size={s * 0.76} />
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', height: s * 1.7, borderRadius: s * 0.45, background: L.fill, padding: s * 0.16, boxSizing: 'border-box' }}>
                {['Board', 'List', 'Timeline'].map((v, k) => (
                  <div key={v} style={{ padding: `0 ${s * 0.7}px`, display: 'flex', alignItems: 'center', borderRadius: s * 0.32, fontSize: s * 0.8, fontWeight: 600, color: k === 0 ? L.ink : L.muted, background: k === 0 ? (L.dark ? '#3A3C43' : '#FFFFFF') : 'transparent', boxShadow: k === 0 ? '0 1px 2px rgba(0,0,0,0.08)' : undefined }}>
                    {v}
                  </div>
                ))}
              </div>
              <SearchField L={L} w={s * 9} size={s * 0.92} placeholder="Filter" hint="F" />
            </div>
          </AppPane>
        </div>
        <div style={{ position: 'absolute', left: L0, top: T0 + bar, width: w, height: h - bar, overflow: 'hidden', borderRadius: `0 0 ${s * 1.2}px ${s * 1.2}px` }}>
          <div style={{ position: 'absolute', left: -L0, top: -T0 - bar, width: 1920, height: 1080 }}>{nodes}</div>
        </div>
        {card(dragCard, {
          left: cx,
          top: cy,
          zIndex: 50,
          transformOrigin: `${grab.dx}px ${grab.dy}px`,
          transform: `rotate(${tilt}deg) scale(${1 + up * 0.04})`,
        }, mix(up, 1 + hover * (frame < P ? 1 : 0), 7))}
        <Pointer keys={keys} clicks={[P]} size={s * 2.5} ring={false} />
      </div>
    </Paced>
  );
};
export const BoardDrag = withPace(BoardDragInner);
