// BoardDrag (ui, build): a project board; the pointer lifts one card, carries it along an arc and drops it into
// another column.
// Numbers: hover 4 f; lift 8 f (1.04, 2.5 deg); gap closes 10 f; drag 30 f on cubic-bezier(0.4, 0, 0.15, 1); settle
// 10 f.
// Caution: keep titles to one line at the column's width.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { AppPane, bez, Face, type Look, Paced, paneBar, Pill, SearchField, surfaceStyle, useUiFrame, withPace } from './_shared';
import { Pointer, pointerAt } from './Pointer';

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
}> = ({ L, columns, from, to, at: start, pressAt = 40, dur = 30, x: xIn, y: yIn, w = 1640, h = 920, size = 26, title = 'Roadmap', sprint = 'Sprint 14', left: daysLeft = '6 days left', mark, speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
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
      nodes.push(card(cd, { left: 0, top: 0, transform: `translate(${cx0}px, ${cardsTop + i * pitch + dy}px)` }, 1));
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
          <div style={{ position: 'absolute', left: -L0, top: -T0 - bar, width: frameW, height: frameH }}>{nodes}</div>
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
