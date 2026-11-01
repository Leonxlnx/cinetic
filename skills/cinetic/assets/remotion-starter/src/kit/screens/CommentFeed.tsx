// CommentFeed: a stack of real comments: the person's face, their handle and how long ago, what they wrote (two lines at
// most, wrapped), and the action row (a like count, dislike, reply, heart). An optional header pill counts the comments
// as the product reads them ("Reading 505 comments", the number counting up from `at`), rows land one after another, and
// one row at a time is held in a soft accent wash (`highlight`: a row, or a schedule the wash glides along). `max` rows
// are in view (default 4); `scroll` moves the feed up one comment at a time as it is read, the rows leaving through a
// soft top edge and arriving through a soft bottom edge. Every row is a focus box where it is drawn on that frame, so a
// camera can travel down the feed and settle on the comment that matters.
//
//   <CommentFeed {...CONTENT.comments} header={{ ...CONTENT.comments.header, at: 0, dur: 70 }} scroll={{ at: 20 }} highlight={[{ at: 30, index: 2 }]} />
import React from 'react';
import { C } from '../../brand/tokens';
import { E, fd, mix, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import { compact, Face, fbox, type Focus, focusAttr, Icon, Panel, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, Spinner, textTag, textW, tx, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type Comment = { name: string; handle?: string; photo?: string; ago: string; text: string; likes?: number; replies?: number };

export type CommentFeedProps = ScreenBase & {
  comments: Comment[];
  /** px (default 560 points) */
  w?: number;
  /** a pill over the feed; `{n}` in the label counts from 0 to `total` over `dur` frames from `at` */
  header?: { label: string; total: number; at?: number; dur?: number };
  /** the row held in the accent wash, or a schedule of rows the wash glides along */
  highlight?: number | { at: number; index: number }[];
  reveal?: { at: number; every?: number };
  /** rows in view (default 4) */
  max?: number;
  /** the feed moves up one comment every `every` frames from `at` (default 0.9 s), each step easing over 18 f@60 */
  scroll?: { at: number; every?: number };
  /** on a card (default: on the ground) */
  card?: boolean;
};

const T = { handle: 13, text: 16, act: 18, face: 40 } as const;

/** How many rows the feed has moved up at frame f (a float: whole steps plus the eased part of the current one). */
export const feedScrolled = (p: Pick<CommentFeedProps, 'scroll' | 'comments' | 'max'>, f: number, fps = 30): number => {
  if (!p.scroll) return 0;
  const every = p.scroll.every ?? 0.9 * fps;
  const steps = Math.max(0, p.comments.length - (p.max ?? 4));
  const t = f - p.scroll.at;
  if (t <= 0 || !steps) return 0;
  const done = Math.floor(t / every);
  if (done >= steps) return steps;
  return done + prog(t - done * every, 0, f60x(18, fps), E.snapOut);
};

/**
 * The feed's size and focus boxes at frame f: feed, header, view (the rows' window), row{i}, text{i}, face{i} for the
 * rows in view (where they are drawn on that frame), and `scroll` (px the rows have moved up).
 */
export const commentFeedLayout = (p: CommentFeedProps, f = 0, ctx: { pt?: number; fps?: number } = {}): ScreenLayout & { rows: { y: number; h: number; lines: string[] }[]; top: number; viewH: number; scroll: number } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const fps = ctx.fps ?? 30;
  const W = p.w ?? 560 * pt;
  const pad = p.card ? 22 * pt : 0;
  const textX = pad + (T.face + 14) * pt;
  const textW0 = W - textX - pad - 30 * pt;
  const top = p.header ? 58 * pt : pad;
  const max = Math.max(1, Math.min(p.max ?? 4, p.comments.length));
  const rows: { y: number; h: number; lines: string[] }[] = [];
  let y = top;
  p.comments.forEach((c) => {
    const lines = wrapText(c.text, T.text * pt, 450, textW0).slice(0, 3);
    const h = (14 + 18 + 4) * pt + lines.length * T.text * pt * 1.34 + (10 + 22 + 16) * pt;
    rows.push({ y, h, lines });
    y += h + 6 * pt;
  });
  // the window holds `max` rows: as tall as the tallest run of `max` rows, so a scroll never clips a row it lands on
  let viewH = 0;
  for (let i = 0; i + max <= rows.length; i++) viewH = Math.max(viewH, rows[i + max - 1].y + rows[i + max - 1].h - rows[i].y);
  const k = feedScrolled(p, f, fps);
  const a = Math.floor(k);
  const b = Math.min(rows.length - 1, a + 1);
  const scroll = rows.length ? mix(rows[a].y, rows[b].y, k - a) - top : 0;
  const focus: Focus = {};
  rows.forEach((r, i) => {
    const ry = r.y - scroll;
    if (ry + r.h < top - 1 || ry > top + viewH + 1) return;
    focus[`row${i}`] = fbox(pad - 12 * pt, ry, W - 2 * pad + 24 * pt, r.h, T.text * pt, SCREEN.radius.row * pt);
    focus[`text${i}`] = fbox(textX, ry + (14 + 18 + 4) * pt, Math.max(...r.lines.map((l) => textW(l, T.text * pt, 450))), r.lines.length * T.text * pt * 1.34, T.text * pt);
    focus[`face${i}`] = fbox(pad, ry + 14 * pt, T.face * pt, T.face * pt, undefined, (T.face * pt) / 2);
  });
  const H = top + viewH + pad;
  if (p.header) {
    const hw = textW(p.header.label.replace('{n}', String(p.header.total)), 14 * pt, 560) + 88 * pt;
    focus.header = fbox((W - hw) / 2, 4 * pt, hw, 36 * pt, 14 * pt, 18 * pt);
  }
  focus.view = fbox(0, top, W, viewH, T.text * pt);
  focus.feed = fbox(0, 0, W, H, T.text * pt);
  return { w: W, h: H, focus, rows, top, viewH, scroll };
};

/** The row the wash sits on at frame f, as a float (it glides 16 f@60 between rows). */
const washAt = (h: CommentFeedProps['highlight'], f: number, fps: number): number | null => {
  if (h === undefined) return null;
  if (typeof h === 'number') return h;
  if (!h.length || f < h[0].at) return null;
  let cur = h[0].index;
  for (let k = 1; k < h.length; k++) if (f >= h[k].at) cur = mix(h[k - 1].index, h[k].index, prog(f, h[k].at, h[k].at + f60x(16, fps), E.snapOut));
  return cur;
};

/** The feed (see the file header). */
export const CommentFeed: React.FC<CommentFeedProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = commentFeedLayout(p, f, { pt, fps });
  const { focus, rows, scroll, top, viewH } = L;
  const pad = p.card ? 22 * pt : 0;
  const textX = pad + (T.face + 14) * pt;
  const every = p.reveal?.every ?? f60x(6, fps);
  const wash = washAt(p.highlight, f, fps);
  const washFirst = Array.isArray(p.highlight) && p.highlight.length ? prog(f, p.highlight[0].at, p.highlight[0].at + f60x(14, fps), E.snapOut) : 1;
  const washBox = wash === null ? null : (() => {
    const a = Math.floor(wash);
    const b = Math.min(rows.length - 1, a + 1);
    const k = wash - a;
    const A = rows[a];
    const B = rows[b];
    return A && B ? { y: mix(A.y, B.y, k) - scroll, h: mix(A.h, B.h, k) } : null;
  })();
  // soft edges while the feed moves: rows leave through the top and arrive through the bottom
  const edge = p.scroll ? `linear-gradient(180deg, transparent 0, black ${(22 * pt).toFixed(1)}px, black calc(100% - ${(30 * pt).toFixed(1)}px), transparent 100%)` : undefined;
  const n = p.header ? Math.round(p.header.total * prog(fd(f), p.header.at ?? 0, (p.header.at ?? 0) + (p.header.dur ?? f60x(90, fps)), E.linear)) : 0;
  const body = (
    <>
      {p.header && focus.header && (
        <div {...focusAttr('header')} style={{ position: 'absolute', left: focus.header.x, top: focus.header.y, width: focus.header.w, height: focus.header.h, borderRadius: focus.header.h / 2, background: skin.dark ? 'rgba(255, 255, 255, 0.08)' : mixColor(C.white, skin.ground, 0.15), boxShadow: smallShadow(skin, u, 0.8), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 * pt }}>
          <Icon name="asterisk" size={15 * pt} color={skin.accent} weight="bold" />
          <span {...textTag('comments-count', 14 * pt, view)} style={tx(14, pt, 560, skin.text)}>{p.header.label.replace('{n}', n.toLocaleString('en-US'))}</span>
          <Spinner f={f} fps={fps} size={14 * pt} color={skin.faint} />
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top, width: L.w, height: viewH, overflow: p.scroll ? 'hidden' : 'visible', WebkitMaskImage: edge, maskImage: edge }}>
      {washBox && <div style={{ position: 'absolute', left: pad - 12 * pt, top: washBox.y - top, width: L.w - 2 * pad + 24 * pt, height: washBox.h, borderRadius: SCREEN.radius.row * pt, background: skin.dark ? 'rgba(255, 255, 255, 0.07)' : skin.accentSoft, boxShadow: skin.dark ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)' : `inset 0 0 0 1px ${mixColor(skin.accentSoft, skin.accent, 0.12)}`, opacity: washFirst }} />}
      {p.comments.map((c, i) => {
        const row = rows[i];
        if (!focus[`row${i}`]) return null;
        const enter = p.reveal ? prog(f, p.reveal.at + i * every, p.reveal.at + i * every + f60x(22, fps), E.snapOut) : 1;
        const y0 = row.y - scroll - top;
        return (
          <div key={i} {...focusAttr(`row${i}`)} style={{ position: 'absolute', left: 0, top: 0, width: L.w, height: L.h, opacity: enter, transform: `translateY(${((1 - enter) * 16 * pt).toFixed(2)}px)`, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: pad, top: y0 + 14 * pt }}>
              <Face skin={skin} size={T.face * pt} name={c.handle ?? c.name} src={c.photo} />
            </div>
            <div {...textTag(`handle${i}`, T.handle * pt, view)} style={{ position: 'absolute', left: textX, top: y0 + 14 * pt, ...tx(T.handle, pt, 450, skin.mute, { lead: 1.35 }) }}>
              <span style={{ color: mixColor(skin.mute, skin.text, 0.25), fontWeight: 520 }}>{c.handle ?? c.name}</span>
              {`  ·  ${c.ago}`}
            </div>
            <div {...focusAttr(`text${i}`)} {...textTag(`comment${i}`, T.text * pt, view)} style={{ position: 'absolute', left: textX, top: y0 + (14 + 18 + 4) * pt, ...tx(T.text, pt, 450, skin.text, { lead: 1.34 }) }}>
              {row.lines.join('\n')}
            </div>
            <div style={{ position: 'absolute', left: textX, top: y0 + row.h - (22 + 16) * pt, height: 22 * pt, display: 'flex', alignItems: 'center', gap: 28 * pt }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 * pt }}>
                <Icon name="thumbsUp" size={T.act * pt} color={skin.mute} />
                {c.likes ? <span style={tx(13, pt, 500, skin.mute)} {...textTag(`likes${i}`, 13 * pt, view)}>{compact(c.likes)}</span> : null}
              </span>
              <Icon name="thumbsDown" size={T.act * pt} color={skin.mute} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 * pt }}>
                <Icon name="comment" size={T.act * pt} color={skin.mute} />
                {c.replies ? <span style={tx(13, pt, 500, skin.mute)} {...textTag(`replies${i}`, 13 * pt, view)}>{c.replies}</span> : null}
              </span>
              <Icon name="heart" size={T.act * pt} color={skin.mute} />
            </div>
            <div style={{ position: 'absolute', right: pad + 4 * pt, top: y0 + 14 * pt }}>
              <Icon name="kebab" size={18 * pt} color={skin.faint} weight="bold" />
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
  return (
    <div data-ui data-screen="comment-feed" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {p.card ? (
        <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.panel * pt} u={u} backdrop={p.backdrop} focus="feed">
          {body}
        </Panel>
      ) : (
        body
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a CommentFeed draws (kit/screens/forms.ts), part -> [form, focus box]: the feed as a list, the highlighted comment as a notice and its words, the header as a pill. */
export const COMMENT_FEED_FORMS = { feed: ['list', 'feed'], row: ['notice', 'row0'], text: ['word', 'text0'], header: ['pill', 'header'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from commentFeedLayout; row, card or cell: the highlighted comment (highlight), else the first. */
export const commentFeedForms = (p: CommentFeedProps, ctx: { pt?: number; fps?: number } = {}): ScreenForms => {
  const i = typeof p.highlight === 'number' ? p.highlight : (p.highlight?.[p.highlight.length - 1]?.index ?? 0);
  return screenForms((f) => commentFeedLayout(p, f, ctx), { ...COMMENT_FEED_FORMS, ...({ row: ['notice', `row${i}`], text: ['word', `text${i}`] } as const) }, { pt: ctx.pt, probe: Array.isArray(p.highlight) ? (p.highlight[p.highlight.length - 1]?.at ?? 0) : 0 });
};
