// RowExpand (ui, emphasis / build): an inbox row opens in place into its message: the same avatar, sender and subject
// travel to the header.
// Numbers: hover 4 f, press 2 f before the open; open 20 f on cubic-bezier(0.3, 0, 0.1, 1); detail blocks rise 18 px,
// 3 f apart; close 18 f.
// Caution: give the message real content; keep previews short enough for one line.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { AppPane, bez, Face, KeyHint, type Look, Paced, paneBar, PaneSidebar, Pill, SearchField, surfaceStyle, useUiFrame, withPace } from './_shared';
import { Pointer, pressOf } from './Pointer';

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
  /** A logo or icon drawn in the avatar's place (a company's mark, an app's tile), centred in its circle's box. */
  mark?: React.ReactNode;
};

/**
 * Where RowExpand draws things, in frame px, for a pointer or a turn of your own: `row` the closed row `index`, `card` the
 * opened message, `reply` the centre of its first action button (the built-in pointer's last key). Pass the same `x`, `y`,
 * `w`, `h`, `size` as the piece; boxes are centre x/y, w, h.
 */
export const rowExpandGeometry = (p: { index: number; x?: number; y?: number; w?: number; h?: number; size?: number }, frameW: number, frameH: number) => {
  const s = p.size ?? 27;
  const w = p.w ?? 1600;
  const h = p.h ?? 920;
  const left = (p.x ?? frameW / 2) - w / 2;
  const top = (p.y ?? frameH / 2) - h / 2;
  const bar = paneBar(s);
  const sideW = s * 10.5;
  const cw = w - sideW;
  const ch = h - bar;
  const lh = s * 3.6;
  const rowH = s * 5.2;
  const gap = s * 0.6;
  const cx = left + sideW + cw / 2;
  return {
    row: { x: cx, y: top + bar + lh + p.index * rowH + rowH / 2, w: cw - gap * 2, h: rowH },
    card: { x: cx, y: top + bar + ch / 2, w: cw - gap * 2, h: ch - gap * 2 },
    reply: { x: left + sideW + gap + s * 1.5 + s * 3.4, y: top + bar + gap + (ch - gap * 2) - s * 1.2 - s * 1.2 },
  };
};

const Avatar: React.FC<{ m: MailData; size: number }> = ({ m, size }) =>
  m.mark ? <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.mark}</div> : <Face name={m.from} color={m.color} size={size} />;

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
  x: xIn,
  y: yIn,
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
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
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
        <Avatar m={m} size={s * 2.1} />
      </div>
      <div style={{ position: 'absolute', left: textX, right: s * 1.1, top: rp, display: 'flex', alignItems: 'center', height: line }}>
        <div style={{ flex: 1, fontSize: s, fontWeight: m.unread ? 650 : 560, color: L.ink, whiteSpace: 'nowrap' }}>{m.from}</div>
        {meta(m)}
      </div>
      <div style={{ position: 'absolute', left: textX, top: rp + line, height: line, fontSize: s, fontWeight: m.unread ? 600 : 500, color: m.unread ? L.ink : mixColor(L.ink, L.muted, 0.4), whiteSpace: 'nowrap', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center' }}>{m.subject}</div>
      <div style={{ position: 'absolute', left: textX, top: rp + line * 2, height: line, fontSize: s * 0.93, color: L.muted, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>{m.preview}</div>
    </div>
  );

  const { x: replyX, y: footY } = rowExpandGeometry({ index, x, y, w, h, size: s }, frameW, frameH).reply;
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
                <Avatar m={r} size={avS} />
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
