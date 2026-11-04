// ItemList: rows of real things with a value: products and their prices, payments and their amounts, files and their
// sizes, people and their roles. Each row leads with a picture (a product shot), a face (a customer), or a mark, then a
// bold title, a quiet line under it, an optional tag and the value at the right in tabular figures. 'cards': every row is
// its own small card (a product list floating in a shot); 'plain': rows on one card under a header whose value can count
// up to the sum of the rows. Rows land one after another and one can be picked.
//
//   <ItemList items={CONTENT.products} mode="cards" reveal={{ at: 0 }} />
//   <ItemList items={CONTENT.payments.rows} mode="plain" header={{ title: 'Today', value: 1295, money: true }} />
import React from 'react';
import { E, fd, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import type { LogoRef } from '../logos';
import { Face, fbox, type Focus, focusAttr, Mark, fmtMoney, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, textTag, tx, useScreen } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type Item = { title: string; sub?: string; thumb?: string; photo?: string; person?: string; logo?: LogoRef; glyph?: IconName; value?: string; tag?: string };

export type ItemListProps = ScreenBase & {
  items: Item[];
  w?: number;
  mode?: 'cards' | 'plain';
  /** plain: a header row; a number `value` counts up over `count` frames from `countAt` and prints as money when `money` */
  header?: { title: string; value?: number | string; money?: boolean; currency?: string };
  countAt?: number;
  count?: number;
  reveal?: { at: number; every?: number };
  pick?: { at: number; index: number };
};

/** UI points by mode: floating product cards are chunky (a big picture, a bold title, a price that reads first); a
 *  ledger on one card is denser. */
const SIZES = { cards: { title: 18, sub: 14, value: 19, lead: 52, row: 80 }, plain: { title: 16, sub: 13, value: 17, lead: 44, row: 66 } } as const;
const sizesOf = (p: Pick<ItemListProps, 'mode'>) => SIZES[p.mode === 'plain' ? 'plain' : 'cards'];

/** The list's size and focus boxes: list, header, row{i}, value{i}. */
export const itemListLayout = (p: ItemListProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout => {
  const pt = ctx.pt ?? SCREEN.pt;
  const T = sizesOf(p);
  const W = p.w ?? 520 * pt;
  const cards = p.mode !== 'plain';
  const pad = cards ? 0 : 10 * pt;
  const headH = !cards && p.header ? 56 * pt : 0;
  const rowH = T.row * pt;
  const gap = cards ? 8 * pt : 0;
  const focus: Focus = {};
  let y = pad + headH;
  p.items.forEach((_, i) => {
    focus[`row${i}`] = fbox(pad, y, W - 2 * pad, rowH, T.title * pt, cards ? SCREEN.radius.row * pt : 12 * pt);
    focus[`value${i}`] = fbox(W - pad - 120 * pt, y + rowH / 2 - T.value * pt * 0.7, 104 * pt, T.value * pt * 1.4, T.value * pt);
    y += rowH + gap;
  });
  const H = y - gap + pad;
  if (headH) focus.header = fbox(pad, pad, W - 2 * pad, headH, 17 * pt);
  focus.list = fbox(0, 0, W, H, T.title * pt);
  return { w: W, h: H, focus };
};

/** The list (see the file header). */
export const ItemList: React.FC<ItemListProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = itemListLayout(p, f, { pt });
  const { focus } = L;
  const T = sizesOf(p);
  const cards = p.mode !== 'plain';
  const every = p.reveal?.every ?? f60x(5, fps);
  const pick = p.pick ? prog(f, p.pick.at, p.pick.at + f60x(26, fps), E.snapOut) : 0;
  const rowPad = 12 * pt;
  const rows = p.items.map((it, i) => {
    const b = focus[`row${i}`];
    const enter = p.reveal ? prog(f, p.reveal.at + i * every, p.reveal.at + i * every + f60x(24, fps), E.snapOut) : 1;
    const picked = p.pick?.index === i;
    // the rows not picked keep their material (an opaque card never turns into a grey veil): their words fade back
    // and the card steps back a little; the picked one lifts with an accent rim
    const dim = p.pick && !picked ? 1 - 0.5 * pick : 1;
    const back = p.pick && !picked ? 1 - 0.025 * pick : 1;
    const lead = T.lead * pt;
    const content = (
      <>
        <div style={{ position: 'absolute', left: rowPad, top: (b.h - lead) / 2 }}>
          {it.thumb ? <Picture src={it.thumb} w={lead} h={lead} r={10 * pt} /> : it.photo || it.person ? <Face skin={skin} size={lead} name={it.person ?? it.title} src={it.photo} /> : <Mark skin={skin} size={lead} logo={it.logo} glyph={it.glyph ?? 'package'} solid={false} />}
        </div>
        <div style={{ position: 'absolute', left: rowPad + lead + 14 * pt, top: 0, height: b.h, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 * pt }}>
          <span {...textTag(`item${i}`, T.title * pt, view)} style={tx(T.title, pt, cards ? 600 : 580, skin.text, { lead: 1.25 })}>{it.title}</span>
          {it.sub && <span {...textTag(`item-sub${i}`, T.sub * pt, view)} style={tx(T.sub, pt, 450, skin.mute, { lead: 1.25 })}>{it.sub}</span>}
        </div>
        <div style={{ position: 'absolute', right: rowPad + 4 * pt, top: 0, height: b.h, display: 'flex', alignItems: 'center', gap: 10 * pt }}>
          {it.tag && (
            <span style={{ padding: `${3 * pt}px ${9 * pt}px`, borderRadius: 999, background: skin.accentSoft, ...tx(12, pt, 600, skin.accentText, { track: 0.01 }) }} {...textTag(`tag${i}`, 12 * pt, view)}>
              {it.tag}
            </span>
          )}
          {it.value && <span {...focusAttr(`value${i}`)} {...textTag(`value${i}`, T.value * pt, view)} style={tx(T.value, pt, cards ? 640 : 620, skin.text, { track: -0.01 })}>{it.value}</span>}
        </div>
        {!cards && i < p.items.length - 1 && <div style={{ position: 'absolute', left: rowPad + lead + 14 * pt, right: rowPad, bottom: 0, height: Math.max(1, 0.6 * pt), background: skin.line, opacity: 0.8 }} />}
      </>
    );
    return (
      <div key={i} {...focusAttr(`row${i}`)} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, opacity: enter * (cards ? 1 : dim), transform: `translateY(${((1 - enter) * 18 * pt).toFixed(2)}px) scale(${(picked ? 1 + 0.03 * pick : back).toFixed(4)})` }}>
        {cards ? (
          <Panel skin={skin} w={b.w} h={b.h} r={b.r ?? 16 * pt} u={u} lift={0.2 + (picked ? 0.6 * pick : 0)} backdrop={p.backdrop}>
            <div style={{ position: 'absolute', inset: 0, opacity: dim }}>{content}</div>
            {picked && pick > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: b.r ?? 16 * pt, boxShadow: `inset 0 0 0 ${(2 * pt * pick).toFixed(2)}px ${skin.accent}`, pointerEvents: 'none' }} />}
          </Panel>
        ) : (
          content
        )}
      </div>
    );
  });
  if (cards) return <div data-ui data-screen="item-list" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>{rows}</div>;
  const hv = p.header?.value;
  const shown = typeof hv === 'number' ? hv * prog(fd(f), p.countAt ?? 0, (p.countAt ?? 0) + (p.count ?? f60x(60, fps)), E.linear) : hv;
  const hvText = typeof shown === 'number' ? (p.header?.money ? fmtMoney(Math.round(shown * 100) / 100, p.header.currency ?? '$', !Number.isInteger(hv as number)) : Math.round(shown).toLocaleString('en-US')) : shown;
  return (
    <div data-ui data-screen="item-list" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.panel * pt} u={u} lift={0.3} backdrop={p.backdrop} focus="list">
        {p.header && focus.header && (
          <div {...focusAttr('header')} style={{ position: 'absolute', left: focus.header.x + rowPad, right: focus.header.x + rowPad + 4 * pt, top: focus.header.y, height: focus.header.h, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `${Math.max(1, 0.6 * pt).toFixed(2)}px solid ${mixColor(skin.line, skin.face, 0.2)}` }}>
            <span {...textTag('list-title', 17 * pt, view)} style={tx(17, pt, 620, skin.text)}>{p.header.title}</span>
            {hvText !== undefined && <span {...textTag('list-total', 17 * pt, view)} style={tx(17, pt, 620, skin.text)}>{hvText}</span>}
          </div>
        )}
        {rows}
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms an ItemList draws (kit/screens/forms.ts), part -> [form, focus box]: the list, the picked row as a notice, its value as a count, the header. */
export const ITEM_LIST_FORMS = { list: ['list', 'list'], row: ['notice', 'row0'], value: ['count', 'value0'], header: ['word', 'header'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from itemListLayout; row, card or cell: the picked row (pick.index), else the first. */
export const itemListForms = (p: ItemListProps, ctx: { pt?: number } = {}): ScreenForms => {
  const i = p.pick?.index ?? 0;
  return screenForms((f) => itemListLayout(p, f, ctx), { ...ITEM_LIST_FORMS, ...({ row: ['notice', `row${i}`], value: ['count', `value${i}`] } as const) }, { pt: ctx.pt });
};
