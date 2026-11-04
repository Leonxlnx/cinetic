// NoticeStack: notifications arriving: a payment, a sign-up, a file, a comment. Each card is the app's mark (its real logo
// when fetched, a face for a person, else a glyph tile), a bold title, one line of what happened, and how long ago. In
// 'stack' mode the newest drops in at the front and the earlier ones step back behind it (smaller, lower, a shade darker,
// at most `depth` deep); in 'list' mode they push down as a column. Arrivals are front-loaded (the biggest step on the
// first frame), the cards face the camera and hold still between arrivals. `front` is the newest card's focus box.
//
//   <NoticeStack items={CONTENT.notices} at={0} every={16} mode="stack" tone="dark" />
import React from 'react';
import { clamp, E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import type { LogoRef } from '../logos';
import { Face, fbox, type Focus, focusAttr, Mark, Panel, SCREEN, type ScreenBase, type ScreenLayout, textTag, textW, tx, unionBox, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

/**
 * One notification. `own`: the product's own notification ("12 sign-ups this hour", "Reply drafted"), drawn with the
 * product's mark (the stack's `ownMark`), never a stock glyph in an accent square where the brand belongs.
 */
export type NoticeItem = { app?: LogoRef; glyph?: IconName; photo?: string; person?: string; title: string; body: string; ago: string; own?: boolean };

export type NoticeStackProps = ScreenBase & {
  /** in arrival order: the first arrives first */
  items: NoticeItem[];
  at?: number;
  /** frames between arrivals (default 0.55 s), or `arrive`: the frame of each */
  every?: number;
  arrive?: number[];
  mode?: 'stack' | 'list';
  /** cards visible behind the front one (stack) */
  depth?: number;
  w?: number;
  /** the product's own mark at `size` px (brand/Mark LogoMark of brand/logo LOGO): drawn on a tile for an `own` notice */
  ownMark?: (size: number) => React.ReactNode;
};

const T = { title: 16, body: 15, ago: 13, icon: 44 } as const;

const arrivals = (p: NoticeStackProps, fps: number) => p.items.map((_, i) => p.arrive?.[i] ?? (p.at ?? 0) + i * (p.every ?? 0.55 * fps));
const enterOf = (f: number, at: number, fps: number) => prog(f, at, at + f60x(22, fps), E.snapOut);

/** The stack's size and focus boxes at frame f: stack, front, frontText (its mark and words), card{i}, icon{i}, text{i} (where each is drawn now). */
export const noticeStackLayout = (p: NoticeStackProps, f: number, ctx: { pt?: number; fps?: number } = {}): ScreenLayout & { cards: { x: number; y: number; s: number; o: number; h: number; lines: string[] }[] } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const fps = ctx.fps ?? 30;
  const W = p.w ?? 520 * pt;
  const depth = p.depth ?? 3;
  const at = arrivals(p, fps);
  const k = at.map((a) => enterOf(f, a, fps));
  const bodyW = W - (14 + T.icon + 14 + 16) * pt;
  const lines = p.items.map((n) => wrapText(n.body, T.body * pt, 450, bodyW).slice(0, 2));
  const hs = lines.map((l) => (16 + 20 + 3) * pt + l.length * T.body * pt * 1.32 + 16 * pt);
  const gapY = 13 * pt;
  const cards = p.items.map((_, i) => {
    const behind = k.slice(i + 1).reduce((a, b) => a + b, 0);
    if (p.mode === 'list') {
      const y = k.slice(i + 1).reduce((a, b, j) => a + b * (hs[i + 1 + j] + 10 * pt), 0);
      return { x: 0, y: y + (1 - k[i]) * -24 * pt, s: 1, o: clamp(k[i] * 3), h: hs[i], lines: lines[i] };
    }
    const s = 1 - 0.055 * behind;
    const y = behind * gapY + (1 - k[i]) * -34 * pt + (hs[i] * (1 - s)); // scaled about the top edge: lower edge peeks out
    // opaque within the first third of the entrance: the words of the card behind never show through the new one
    const o = Math.min(clamp(k[i] * 3), clamp(depth + 1 - behind));
    return { x: (W * (1 - s)) / 2, y, s, o, h: hs[i], lines: lines[i] };
  });
  const focus: Focus = {};
  cards.forEach((c, i) => {
    focus[`card${i}`] = fbox(c.x, c.y, W * c.s, c.h * c.s, T.body * pt * c.s, SCREEN.radius.card * pt);
    // the mark and the words, for a close-up on one notification (a macro reads its sender and its news)
    focus[`icon${i}`] = fbox(c.x + 14 * pt * c.s, c.y + 16 * pt * c.s, T.icon * pt * c.s, T.icon * pt * c.s, undefined, 12 * pt * c.s);
    const tw = Math.max(textW(p.items[i].title, T.title * pt, 620), ...c.lines.map((l) => textW(l, T.body * pt, 450)));
    focus[`text${i}`] = fbox(c.x + (14 + T.icon + 14) * pt * c.s, c.y + 15 * pt * c.s, tw * c.s, (c.h - 30 * pt) * c.s, T.body * pt * c.s);
  });
  const shown = cards.map((c, i) => ({ c, i })).filter(({ c }) => c.o > 0.5);
  const front = shown.length ? shown[shown.length - 1].i : 0;
  focus.front = focus[`card${front}`] ?? fbox(0, 0, W, hs[0] ?? 80 * pt);
  if (focus[`text${front}`]) focus.frontText = unionBox(focus[`icon${front}`], focus[`text${front}`]);
  const H = p.mode === 'list' ? hs.reduce((a, b) => a + b + 10 * pt, 0) - 10 * pt : Math.max(...hs, 0) + depth * gapY + 8 * pt;
  focus.stack = fbox(0, 0, W, H, T.body * pt);
  return { w: W, h: H, focus, cards };
};

/** The notifications (see the file header). */
export const NoticeStack: React.FC<NoticeStackProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = noticeStackLayout(p, f, { pt, fps });
  const r = SCREEN.radius.card * pt;
  return (
    <div data-ui data-screen="notice-stack" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {p.items.map((n, i) => {
        const c = L.cards[i];
        if (c.o <= 0.001) return null;
        const behind = (1 - c.s) / 0.055;
        const shade = Math.min(0.5, behind * 0.16);
        return (
          <div key={i} {...focusAttr(`card${i}`)} style={{ position: 'absolute', left: 0, top: 0, width: L.w, height: c.h, transform: `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) scale(${c.s.toFixed(4)})`, transformOrigin: '0 0', opacity: c.o, zIndex: i }}>
            <Panel skin={skin} w={L.w} h={c.h} r={r} u={u} lift={0.35} backdrop={p.backdrop}>
              <div style={{ position: 'absolute', left: 14 * pt, top: 16 * pt }}>
                {n.photo ? (
                  <Face skin={skin} size={T.icon * pt} name={n.person ?? n.title} src={n.photo} />
                ) : n.own && p.ownMark ? (
                  <OwnTile skin={skin} size={T.icon * pt}>{p.ownMark(T.icon * pt * 0.64)}</OwnTile>
                ) : (
                  <Mark skin={skin} size={T.icon * pt} logo={n.app} glyph={n.glyph ?? 'bell'} />
                )}
              </div>
              <div {...textTag(`notice-title${i}`, T.title * pt, view)} style={{ position: 'absolute', left: (14 + T.icon + 14) * pt, top: 15 * pt, ...tx(T.title, pt, 620, skin.text) }}>{n.title}</div>
              <div {...textTag(`notice-ago${i}`, T.ago * pt, view)} style={{ position: 'absolute', right: 16 * pt, top: 17 * pt, ...tx(T.ago, pt, 450, skin.faint) }}>{n.ago}</div>
              <div {...textTag(`notice-body${i}`, T.body * pt, view)} style={{ position: 'absolute', left: (14 + T.icon + 14) * pt, top: (16 + 20 + 3) * pt, ...tx(T.body, pt, 450, skin.mute, { lead: 1.32 }) }}>{c.lines.join('\n')}</div>
              {shade > 0 && <div style={{ position: 'absolute', inset: 0, background: mixColor(skin.ground, skin.face, 0.4), opacity: shade }} />}
            </Panel>
          </div>
        );
      })}
    </div>
  );
};

/** The product's own mark as its notification icon: a light tile with a hairline (an app icon), the mark centred on it. */
const OwnTile: React.FC<{ skin: ReturnType<typeof useScreen>['skin']; size: number; children: React.ReactNode }> = ({ skin, size, children }) => (
  <div data-icon="own" style={{ width: size, height: size, borderRadius: size * 0.24, flex: 'none', background: skin.dark ? mixColor(skin.face, '#FFFFFF', 0.92) : '#FFFFFF', boxShadow: `inset 0 0 0 ${(size * 0.022).toFixed(2)}px ${mixColor(skin.text, '#FFFFFF', 0.86)}, 0 ${(size * 0.04).toFixed(2)}px ${(size * 0.1).toFixed(2)}px rgba(0, 0, 0, 0.16)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </div>
);

/** The width a notice's title and age need (to size a stack to its longest line). */
export const noticeWidth = (items: NoticeItem[], pt: number) => Math.max(...items.map((n) => textW(n.title, T.title * pt, 620) + textW(n.ago, T.ago * pt, 450) + (14 + T.icon + 14 + 16 + 24) * pt));

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a NoticeStack draws (kit/screens/forms.ts), part -> [form, focus box]: the front notice, the stack as a list, the front notice's mark and words. */
export const NOTICE_STACK_FORMS = { notice: ['notice', 'front'], stack: ['list', 'stack'], text: ['word', 'frontText'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from noticeStackLayout. */
export const noticeStackForms = (p: NoticeStackProps, ctx: { pt?: number; fps?: number } = {}): ScreenForms => screenForms((f) => noticeStackLayout(p, f, ctx), NOTICE_STACK_FORMS, { pt: ctx.pt });
