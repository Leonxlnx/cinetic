// ChatReply: an assistant answering in a thread: the person's message in an accent bubble, the assistant's face and name,
// three typing dots that pulse (never bob), then the answer streaming in word by word on a card: a first line, a list
// of things with their marks or glyphs, and a closing question. Every list row is a focus box.
//
//   <ChatReply ask="Which invoices are late?" who={{ name: 'Tally', photo: ... }} text="Two, both from March ..." items={[...]} close="Shall I send the reminders?" at={20} />
//   <ChatReply {...CONTENT.reply} at={20} />
import React from 'react';
import { C } from '../../brand/tokens';
import { clamp, E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import type { LogoRef } from '../logos';
import { Face, fbox, type Focus, focusAttr, Icon, Mark, Panel, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, textTag, textW, tx, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type ChatItem = { text: string; glyph?: IconName; logo?: LogoRef };

export type ChatReplyProps = ScreenBase & {
  /** the person's message (a bubble at the top right) */
  ask?: string;
  who?: { name: string; photo?: string; logo?: LogoRef };
  text: string;
  items?: ChatItem[];
  close?: string;
  /** the frame the answer starts streaming (the dots run for `think` frames before it, default 0.7 s) */
  at?: number;
  think?: number;
  /** words a second (default 16) */
  wps?: number;
  w?: number;
};

const T = { body: 15, ask: 15, name: 13, face: 30, item: 15 } as const;

/** The thread's size and focus boxes: thread, ask, who, card, item{i}, close. */
export const chatReplyLayout = (p: ChatReplyProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { textLines: string[]; itemLines: string[][]; closeLines: string[]; askLines: string[]; cardY: number; cardW: number } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const W = p.w ?? 520 * pt;
  const cardW = W * 0.86;
  const pad = 18 * pt;
  const inner = cardW - 2 * pad;
  const askLines = p.ask ? wrapText(p.ask, T.ask * pt, 480, W * 0.62) : [];
  const askW = askLines.length ? Math.max(...askLines.map((l) => textW(l, T.ask * pt, 480))) + 32 * pt : 0;
  const askH = askLines.length * T.ask * pt * 1.35 + 20 * pt;
  const focus: Focus = {};
  let y = 0;
  if (p.ask) {
    focus.ask = fbox(W - askW, 0, askW, askH, T.ask * pt, Math.min(askH / 2, 22 * pt));
    y += askH + 16 * pt;
  }
  if (p.who) {
    focus.who = fbox(0, y, T.face * pt + 10 * pt + textW(p.who.name, T.name * pt, 600), T.face * pt, T.name * pt);
    y += T.face * pt + 10 * pt;
  }
  const cardY = y;
  const textLines = wrapText(p.text, T.body * pt, 450, inner);
  const itemLines = (p.items ?? []).map((it) => wrapText(it.text, T.item * pt, 450, inner - 30 * pt));
  const closeLines = p.close ? wrapText(p.close, T.body * pt, 450, inner) : [];
  const lh = T.body * pt * 1.45;
  let cy = cardY + pad + textLines.length * lh;
  if (itemLines.length) cy += 10 * pt;
  itemLines.forEach((l, i) => {
    focus[`item${i}`] = fbox(pad, cy, inner, l.length * lh + 4 * pt, T.item * pt);
    cy += l.length * lh + 4 * pt;
  });
  if (closeLines.length) {
    cy += 10 * pt;
    focus.close = fbox(pad, cy, inner, closeLines.length * lh, T.body * pt);
    cy += closeLines.length * lh;
  }
  const cardH = cy + pad - cardY;
  focus.card = fbox(0, cardY, cardW, cardH, T.body * pt, 20 * pt);
  const H = cardY + cardH;
  focus.thread = fbox(0, 0, W, H, T.body * pt);
  return { w: W, h: H, focus, textLines, itemLines, closeLines, askLines, cardY, cardW };
};

/** The thread (see the file header). */
export const ChatReply: React.FC<ChatReplyProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = chatReplyLayout(p, f, { pt });
  const { focus } = L;
  const pad = 18 * pt;
  const lh = T.body * pt * 1.45;
  const at = p.at ?? 0;
  const think = p.think ?? 0.7 * fps;
  const wps = p.wps ?? 16;
  const shown = ((f - at) / fps) * wps; // words shown (float)
  const cardIn = prog(f, at - think, at - think + f60x(18, fps), E.snapOut);
  const dots = f >= at - think && f < at;
  let wi = 0;
  const word = (w: string, key: React.Key) => {
    const o = clamp(shown - wi++ + 1);
    return (
      <span key={key} style={{ opacity: o }}>
        {w}{' '}
      </span>
    );
  };
  const lines = (ls: string[]) => ls.map((l, li) => <div key={li}>{l.split(' ').map((w, k) => word(w, k))}</div>);
  const askIn = p.ask ? prog(f, at - think - f60x(30, fps), at - think - f60x(30, fps) + f60x(20, fps), E.snapOut) : 0;
  return (
    <div data-ui data-screen="chat-reply" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {p.ask && focus.ask && (
        <div {...focusAttr('ask')} style={{ position: 'absolute', left: focus.ask.x, top: focus.ask.y, width: focus.ask.w, height: focus.ask.h, borderRadius: focus.ask.r, background: `linear-gradient(180deg, ${mixColor(skin.accent, C.white, 0.22)} 0%, ${mixColor(skin.accent, C.white, 0.1)} 100%)`, boxShadow: smallShadow(skin, u, 1), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: askIn, transform: `translateY(${((1 - askIn) * 14 * pt).toFixed(2)}px)` }}>
          <span {...textTag('ask', T.ask * pt, view)} style={tx(T.ask, pt, 480, skin.accentInk, { lead: 1.35 })}>{L.askLines.join('\n')}</span>
        </div>
      )}
      {p.who && focus.who && (
        <div {...focusAttr('who')} style={{ position: 'absolute', left: 0, top: focus.who.y, display: 'flex', alignItems: 'center', gap: 10 * pt, opacity: cardIn }}>
          {p.who.photo ? <Face skin={skin} size={T.face * pt} name={p.who.name} src={p.who.photo} /> : <Mark skin={skin} size={T.face * pt} logo={p.who.logo} glyph="sparkle" />}
          <span {...textTag('who', T.name * pt, view)} style={tx(T.name, pt, 600, skin.mute)}>{p.who.name}</span>
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, opacity: cardIn, transform: `translateY(${((1 - cardIn) * 18 * pt).toFixed(2)}px)` }}>
        <Panel skin={skin} w={dots ? 86 * pt : L.cardW} h={dots ? 46 * pt : focus.card.h} y={L.cardY} r={20 * pt} u={u} lift={0.3} backdrop={p.backdrop} focus="card">
          {dots ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 * pt }}>
              {/* lint-ok: the reply's typing indicator, three dots pulsing in turn: the product's own state */}
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 8 * pt, height: 8 * pt, borderRadius: '50%', background: skin.mute, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(((f / fps) * 2 * Math.PI) / 0.9 - i * 0.9)) }} />
              ))}
            </div>
          ) : (
            <>
              <div {...textTag('reply', T.body * pt, view)} style={{ position: 'absolute', left: pad, top: pad, width: L.cardW - 2 * pad, ...tx(T.body, pt, 450, skin.text, { lead: 1.45 }) }}>
                {lines(L.textLines)}
              </div>
              {(p.items ?? []).map((it, i) => {
                const b = focus[`item${i}`];
                const firstWord = wi;
                const o = clamp(shown - firstWord + 1);
                return (
                  <div key={i} {...focusAttr(`item${i}`)} style={{ position: 'absolute', left: b.x, top: b.y - L.cardY, width: b.w, display: 'flex', gap: 10 * pt, alignItems: 'flex-start' }}>
                    <div style={{ marginTop: (lh - 20 * pt) / 2, opacity: o }}>{it.logo ? <Mark skin={skin} size={20 * pt} logo={it.logo} /> : <Icon name={it.glyph ?? 'checkCircle'} size={20 * pt} color={skin.accent} weight="fill" />}</div>
                    <div {...textTag(`item${i}`, T.item * pt, view)} style={tx(T.item, pt, 450, skin.text, { lead: 1.45 })}>{lines(L.itemLines[i])}</div>
                  </div>
                );
              })}
              {p.close && focus.close && (
                <div {...focusAttr('close')} {...textTag('close', T.body * pt, view)} style={{ position: 'absolute', left: pad, top: focus.close.y - L.cardY, ...tx(T.body, pt, 450, skin.text, { lead: 1.45 }) }}>
                  {lines(L.closeLines)}
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a ChatReply draws (kit/screens/forms.ts), part -> [form, focus box]: the thread, the request bubble as a pill, the answer card, who answers as a chip. */
export const CHAT_REPLY_FORMS = { thread: ['thread', 'thread'], ask: ['pill', 'ask'], card: ['card', 'card'], who: ['chip', 'who'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from chatReplyLayout. */
export const chatReplyForms = (p: ChatReplyProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => chatReplyLayout(p, f, ctx), CHAT_REPLY_FORMS, { pt: ctx.pt });
