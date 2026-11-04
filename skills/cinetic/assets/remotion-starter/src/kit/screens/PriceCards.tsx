// PriceCards: the plans side by side, each a card in the kit's material: the plan's name, the price big with its period
// small beside it, a note under it, a hairline, the features with ticks, and the plan's button at the foot. The featured
// plan wears the accent (a rim, its badge, a solid button). Cards rise one after another (`reveal`, from behind a giant
// word for instance) and one can be picked (`pick`: it lifts toward the lens, the others step back). Every card, price
// and button is a focus box.
//
//   <PriceCards plans={CONTENT.plans} reveal={{ at: 12 }} tone="dark" />
import React from 'react';
import { C } from '../../brand/tokens';
import { E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import { fbox, type Focus, focusAttr, Icon, fmtMoney, Panel, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, textTag, textW, tx, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type Plan = { name: string; price: number | string; period?: string; note?: string; features: string[]; cta?: string; featured?: boolean; badge?: string };

export type PriceCardsProps = ScreenBase & {
  plans: Plan[];
  currency?: string;
  /** the row's width, px (default 250 points a plan) */
  w?: number;
  gap?: number;
  reveal?: { at: number; every?: number };
  pick?: { at: number; index: number };
};

const T = { name: 14, price: 34, period: 17, note: 12.5, feat: 13.5, cta: 15 } as const;

/** The row's size and focus boxes: row, card{i}, price{i}, cta{i}, feature{i}_{j}. */
export const priceCardsLayout = (p: PriceCardsProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { cw: number; feats: string[][][] } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const n = Math.max(1, p.plans.length);
  const gap = (p.gap ?? 14) * pt;
  const W = p.w ?? (250 * n + (p.gap ?? 14) * (n - 1)) * pt;
  const cw = (W - gap * (n - 1)) / n;
  const pad = 22 * pt;
  const feats = p.plans.map((pl) => pl.features.map((ft) => wrapText(ft, T.feat * pt, 450, cw - 2 * pad - 26 * pt).slice(0, 2)));
  const fh = (k: number) => feats[k].reduce((a, l) => a + l.length * T.feat * pt * 1.32 + 9 * pt, 0);
  const topH = pad + T.name * pt * 1.4 + 10 * pt + T.price * pt * 1.1 + (p.plans.some((q) => q.note) ? 6 * pt + T.note * pt * 1.3 : 0) + 18 * pt;
  const H = topH + 18 * pt + Math.max(...p.plans.map((_, k) => fh(k))) + 14 * pt + 44 * pt + pad;
  const focus: Focus = {};
  p.plans.forEach((pl, i) => {
    const x = i * (cw + gap);
    focus[`card${i}`] = fbox(x, 0, cw, H, T.feat * pt, SCREEN.radius.card * pt);
    focus[`price${i}`] = fbox(x + pad, pad + T.name * pt * 1.4 + 10 * pt, textW(typeof pl.price === 'number' ? fmtMoney(pl.price, p.currency ?? '$') : pl.price, T.price * pt, 620) + textW(pl.period ?? '', T.period * pt, 450) + 4 * pt, T.price * pt * 1.1, T.price * pt);
    let y = topH + 18 * pt;
    feats[i].forEach((l, j) => {
      focus[`feature${i}_${j}`] = fbox(x + pad, y, cw - 2 * pad, l.length * T.feat * pt * 1.32, T.feat * pt);
      y += l.length * T.feat * pt * 1.32 + 9 * pt;
    });
    focus[`cta${i}`] = fbox(x + pad, H - pad - 44 * pt, cw - 2 * pad, 44 * pt, T.cta * pt, 22 * pt);
  });
  focus.row = fbox(0, 0, W, H, T.feat * pt);
  return { w: W, h: H, focus, cw, feats };
};

/** The plans (see the file header). */
export const PriceCards: React.FC<PriceCardsProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = priceCardsLayout(p, f, { pt });
  const { focus, cw } = L;
  const pad = 22 * pt;
  const every = p.reveal?.every ?? f60x(6, fps);
  const pick = p.pick ? prog(f, p.pick.at, p.pick.at + f60x(28, fps), E.snapOut) : 0;
  return (
    <div data-ui data-screen="price-cards" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {p.plans.map((pl, i) => {
        const c = focus[`card${i}`];
        const enter = p.reveal ? prog(f, p.reveal.at + i * every, p.reveal.at + i * every + f60x(32, fps), E.snapOut) : 1;
        const picked = p.pick?.index === i;
        const dim = p.pick && !picked ? 1 - 0.55 * pick : 1;
        const lift = picked ? pick : 0;
        const feat = !!pl.featured;
        const price = typeof pl.price === 'number' ? fmtMoney(pl.price, p.currency ?? '$') : pl.price;
        const ctaBg = feat ? skin.solid : skin.well;
        const ctaInk = feat ? skin.accentInk : skin.text;
        return (
          <div key={i} {...focusAttr(`card${i}`)} style={{ position: 'absolute', left: c.x, top: 0, width: cw, height: L.h, opacity: enter * dim, transform: `translateY(${((1 - enter) * 70 * pt).toFixed(2)}px) scale(${(1 + 0.035 * lift).toFixed(4)})`, transformOrigin: '50% 60%' }}>
            <Panel skin={skin} w={cw} h={L.h} r={SCREEN.radius.card * pt} u={u} lift={0.3 + 0.7 * lift} backdrop={p.backdrop} style={feat ? { boxShadow: undefined } : undefined}>
              {feat && <div style={{ position: 'absolute', inset: 0, borderRadius: SCREEN.radius.card * pt, boxShadow: `inset 0 0 0 ${(1.5 * pt).toFixed(2)}px ${mixColor(skin.accent, skin.face, 0.15)}`, pointerEvents: 'none', zIndex: 2 }} />}
              <div style={{ position: 'absolute', left: pad, top: pad, display: 'flex', alignItems: 'center', gap: 8 * pt }}>
                <span {...textTag(`plan${i}`, T.name * pt, view)} style={tx(T.name, pt, 520, feat ? skin.accentText : skin.mute)}>{pl.name}</span>
                {pl.badge && (
                  <span style={{ padding: `${2 * pt}px ${8 * pt}px`, borderRadius: 999, background: skin.accentSoft, ...tx(11.5, pt, 600, skin.accentText, { track: 0.02 }) }} {...textTag(`badge${i}`, 11.5 * pt, view)}>
                    {pl.badge}
                  </span>
                )}
              </div>
              <div {...focusAttr(`price${i}`)} style={{ position: 'absolute', left: pad, top: focus[`price${i}`].y, display: 'flex', alignItems: 'baseline', gap: 3 * pt }}>
                <span {...textTag(`price${i}`, T.price * pt, view)} style={tx(T.price, pt, 640, skin.text, { track: -0.028, lead: 1.1 })}>{price}</span>
                {pl.period && <span {...textTag(`period${i}`, T.period * pt, view)} style={tx(T.period, pt, 450, skin.mute, { lead: 1.1 })}>{pl.period}</span>}
              </div>
              {pl.note && <div {...textTag(`note${i}`, T.note * pt, view)} style={{ position: 'absolute', left: pad, top: focus[`price${i}`].y + T.price * pt * 1.1 + 6 * pt, ...tx(T.note, pt, 450, skin.faint) }}>{pl.note}</div>}
              <div style={{ position: 'absolute', left: 0, right: 0, top: (focus[`feature${i}_0`]?.y ?? L.h / 2) - 18 * pt, height: Math.max(1, 0.6 * pt), background: skin.line, opacity: 0.9 }} />
              {L.feats[i].map((lines, j) => {
                const b = focus[`feature${i}_${j}`];
                return (
                  <div key={j} {...focusAttr(`feature${i}_${j}`)} style={{ position: 'absolute', left: pad, top: b.y, display: 'flex', alignItems: 'flex-start', gap: 10 * pt }}>
                    <Icon name="checkCircle" size={16 * pt} color={feat ? skin.accent : skin.mute} weight={feat ? 'fill' : 'regular'} style={{ marginTop: 1.5 * pt }} />
                    <span {...textTag(`feature${i}_${j}`, T.feat * pt, view)} style={tx(T.feat, pt, 450, skin.text, { lead: 1.32 })}>{lines.join('\n')}</span>
                  </div>
                );
              })}
              {pl.cta && (
                <div {...focusAttr(`cta${i}`)} style={{ position: 'absolute', left: pad, top: focus[`cta${i}`].y, width: focus[`cta${i}`].w, height: focus[`cta${i}`].h, borderRadius: focus[`cta${i}`].h / 2, background: `linear-gradient(180deg, ${mixColor(ctaBg, C.white, feat ? 0.14 : 0.03)} 0%, ${ctaBg} 100%)`, boxShadow: feat ? smallShadow(skin, u, 1.2) : `inset 0 0 0 ${Math.max(1, 0.6 * pt).toFixed(2)}px ${skin.rim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span {...textTag(`cta${i}`, T.cta * pt, view)} style={tx(T.cta, pt, 600, ctaInk)}>{pl.cta}</span>
                </div>
              )}
            </Panel>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a PriceCards draws (kit/screens/forms.ts), part -> [form, focus box]: the row of plans as a list, the picked plan as a card, its button and its price as a count. */
export const PRICE_CARDS_FORMS = { row: ['list', 'row'], card: ['card', 'card0'], cta: ['button', 'cta0'], price: ['count', 'price0'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from priceCardsLayout; row, card or cell: the picked plan (pick.index), else the first. */
export const priceCardsForms = (p: PriceCardsProps, ctx: { pt?: number } = {}): ScreenForms => {
  const i = p.pick?.index ?? 0;
  return screenForms((f) => priceCardsLayout(p, f, ctx), { ...PRICE_CARDS_FORMS, ...({ card: ['card', `card${i}`], cta: ['button', `cta${i}`], price: ['count', `price${i}`] } as const) }, { pt: ctx.pt });
};
