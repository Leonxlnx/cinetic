// BrowserWindow: the product's own site, or the app it just built, in a browser window: the chrome (three lights, the
// address field with a lock and the domain, typed when `type` is given, a load line running under it), then the page: a
// nav (the mark and the name, links, sign in, the call to action), the hero (a headline of up to two lines with its
// accent word, a lead, two buttons), a real picture with a notice floating on its edge, and a row of cards made of the
// film's own content (faces with a count, a figure with its trend, a picture with its title). `build` assembles the page
// section by section. Glass over a world (the page's words take the world's light), dark or light.
//
//   <BrowserWindow {...CONTENT.site} tone="glass" ground={C.navy} build={{ at: 12 }} />
//   <BrowserWindow {...CONTENT.site} type={{ at: 0 }} />   // the address typed, the page loads and builds
import React from 'react';
import { C } from '../../brand/tokens';
import { rgbaOf } from '../../fx/Lit';
import { clamp, E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import type { LogoRef } from '../logos';
import { caretOn, Face, fbox, type Focus, focusAttr, Icon, Mark, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, textTag, textW, tx, unionBox, useScreen, wrapText } from './base';
import { KIT_FONT } from '../parts';
import { typedAt } from './typing';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type SiteCard =
  | { kind: 'people'; title: string; value: string; faces: { name: string; photo?: string }[]; tag?: string }
  | { kind: 'stat'; title: string; value: string; delta?: string; /** 0..1: a ring instead of the trend line */ p?: number; series?: number[] }
  | { kind: 'photo'; title: string; sub?: string; src?: string };

export type SiteNotice = { title: string; body: string; photo?: string; logo?: LogoRef; glyph?: IconName };

/** The page's content (CONTENT.site): spread it into the window. */
export type Site = {
  url: string;
  brand: string;
  logo?: LogoRef;
  glyph?: IconName;
  nav?: string[];
  signIn?: string;
  cta: string;
  headline: string;
  /** the words of the headline set in the accent */
  accentWord?: string;
  lead?: string;
  ctaAlt?: string;
  /** the hero picture */
  hero?: string;
  heroFocus?: [number, number];
  notice?: SiteNotice;
  cards?: SiteCard[];
};

export type BrowserWindowProps = ScreenBase &
  Site & {
    /** the window in UI points (default 1024 wide; the height follows the page) */
    w?: number;
    /** the browser bar (default true) */
    chrome?: boolean;
    /** the address typed from `at`; the page loads after it and builds */
    type?: { at: number; cps?: number };
    /** the page's sections arrive from `at`, `every` frames apart (default 5 f@60) */
    build?: { at: number; every?: number };
  };

const T = { url: 12.5, brand: 16, nav: 13, cta: 13, lead: 15, btn: 14, cardTitle: 12, cardValue: 17, figure: 26, small: 11, noticeT: 13, noticeB: 12 } as const;
const HEAD = [44, 40, 36, 32, 28] as const;
const SECTIONS = ['nav', 'headline', 'lead', 'buttons', 'picture', 'notice', 'card0', 'card1', 'card2'] as const;

/** The headline set at the largest size that holds it in two lines (three at the smallest). */
export const headlineFit = (text: string, maxW: number, pt: number) => {
  for (const s of HEAD) {
    const lines = wrapText(text, s * pt, 620, maxW, -0.025);
    if (lines.length <= 2) return { size: s, lines };
  }
  const s = HEAD[HEAD.length - 1];
  return { size: s, lines: wrapText(text, s * pt, 620, maxW, -0.025).slice(0, 3) };
};

const loadDur = (fps: number) => f60x(34, fps);

/** When the page starts building: the build's `at`, else the end of the load after the typed address, else at once. */
const buildStart = (p: BrowserWindowProps, fps: number) => {
  if (p.build) return p.build.at;
  if (p.type) {
    const t = typedAt(p.url, 1e9, { at: p.type.at, cps: p.type.cps ?? 20, fps, seed: 'url' });
    return p.type.at + (t.keys[t.keys.length - 1] ?? 0) + f60x(10, fps) + loadDur(fps);
  }
  return -1e9;
};

/** The window's size and focus boxes: window, chrome, address, url, nav, brand, cta, headline, lead, buttons, picture, notice, cards, card{i}. */
export const browserWindowLayout = (p: BrowserWindowProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { head: { size: number; lines: string[] }; leadLines: string[]; chromeH: number; noticeLines: string[] } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const W = (p.w ?? 1024) * pt;
  const chromeH = p.chrome === false ? 0 : 40 * pt;
  const px = 44 * pt;
  // the hero's column; without a picture the page's words and cards take the whole width
  const colW = p.hero ? 496 * pt : W - 2 * px;
  const focus: Focus = {};
  if (chromeH) {
    focus.chrome = fbox(0, 0, W, chromeH);
    const aw = Math.min(380 * pt, W * 0.42);
    focus.address = fbox((W - aw) / 2, (chromeH - 26 * pt) / 2, aw, 26 * pt, T.url * pt, 8 * pt);
    const uw = textW(p.url, T.url * pt, 500);
    focus.url = fbox(focus.address.x + (aw - uw) / 2 + 8 * pt, focus.address.y + 4 * pt, uw, 18 * pt, T.url * pt);
  }
  const navY = chromeH + 22 * pt;
  focus.nav = fbox(px, navY, W - 2 * px, 32 * pt, T.nav * pt);
  focus.brand = fbox(px, navY + 3 * pt, 26 * pt + 10 * pt + textW(p.brand, T.brand * pt, 640, -0.012), 26 * pt, T.brand * pt);
  const ctaW = textW(p.cta, T.cta * pt, 600) + 32 * pt;
  focus.cta = fbox(W - px - ctaW, navY, ctaW, 32 * pt, T.cta * pt, 16 * pt);
  const head = headlineFit(p.headline, colW, pt);
  const headY = chromeH + 100 * pt;
  const headH = head.lines.length * head.size * pt * 1.06;
  focus.headline = fbox(px, headY, Math.max(...head.lines.map((l) => textW(l, head.size * pt, 620, -0.025))), headH, head.size * pt);
  let y = headY + headH + 16 * pt;
  const leadLines = p.lead ? wrapText(p.lead, T.lead * pt, 450, (p.hero ? 420 : 600) * pt).slice(0, 2) : [];
  if (leadLines.length) {
    focus.lead = fbox(px, y, Math.max(...leadLines.map((l) => textW(l, T.lead * pt, 450))), leadLines.length * T.lead * pt * 1.42, T.lead * pt);
    y += focus.lead.h + 24 * pt;
  } else y += 8 * pt;
  const b1 = textW(p.cta, T.btn * pt, 600) + 40 * pt;
  const b2 = p.ctaAlt ? textW(p.ctaAlt, T.btn * pt, 560) + 58 * pt : 0;
  focus.buttons = fbox(px, y, b1 + (b2 ? 12 * pt + b2 : 0), 40 * pt, T.btn * pt, 20 * pt);
  y += 40 * pt + 40 * pt;
  const cards = (p.cards ?? []).slice(0, 3);
  const cardH = 150 * pt;
  if (cards.length) {
    const gap = 14 * pt;
    const cw = (colW - gap * 2) / 3;
    cards.forEach((_, i) => (focus[`card${i}`] = fbox(px + i * (cw + gap), y, cw, cardH, T.cardTitle * pt, 16 * pt)));
    focus.cards = unionBox(...cards.map((_, i) => focus[`card${i}`]));
    y += cardH;
  }
  const H = y + 44 * pt;
  let noticeLines: string[] = [];
  if (p.hero) {
    const x = px + colW + 40 * pt;
    focus.picture = fbox(x, chromeH + 92 * pt, W - px - x, H - 44 * pt - (chromeH + 92 * pt), undefined, 18 * pt);
    if (p.notice) {
      // on the picture's lower edge, leaning out over the gutter but never over the hero's column: its words wrap (two
      // lines at most), never cut
      const nx = Math.max(px + colW + 14 * pt, focus.picture.x - 24 * pt);
      const maxW = focus.picture.x + focus.picture.w - 16 * pt - nx;
      noticeLines = wrapText(p.notice.body, T.noticeB * pt, 450, maxW - 70 * pt).slice(0, 2);
      const nw = Math.min(maxW, Math.max(textW(p.notice.title, T.noticeT * pt, 620), ...noticeLines.map((l) => textW(l, T.noticeB * pt, 450))) + 70 * pt);
      const nh = (12 + 13 * 1.3 + 2 + 12) * pt + noticeLines.length * T.noticeB * pt * 1.32;
      focus.notice = fbox(nx, focus.picture.y + focus.picture.h - nh - 24 * pt, nw, nh, T.noticeT * pt, 14 * pt);
    }
  }
  focus.window = fbox(0, 0, W, H, T.nav * pt, SCREEN.radius.panel * pt);
  return { w: W, h: H, focus, head, leadLines, chromeH, noticeLines };
};

/** A small series for a trend line (seeded by its title, rising), 0..1. */
const seriesOf = (title: string, n = 12) => {
  let v = 0.32;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let h = 0;
    for (let k = 0; k < title.length; k++) h = (h * 31 + title.charCodeAt(k) + i * 17) % 997;
    v = clamp(v + 0.05 + ((h % 100) / 100 - 0.5) * 0.16, 0.08, 0.96);
    out.push(v);
  }
  return out;
};

/** The window (see the file header). */
export const BrowserWindow: React.FC<BrowserWindowProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = browserWindowLayout(p, f, { pt });
  const { focus } = L;
  const dark = skin.dark;
  const start = buildStart(p, fps);
  const every = p.build?.every ?? f60x(5, fps);
  /** a section's arrival: 0 before, 1 settled (opacity and a short rise) */
  const sec = (name: (typeof SECTIONS)[number]) => {
    const k = SECTIONS.indexOf(name);
    return prog(f, start + k * every, start + k * every + f60x(20, fps), E.snapOut);
  };
  const rise = (q: number) => ({ opacity: q, transform: `translateY(${((1 - q) * 10 * pt).toFixed(2)}px)` });
  const typed = p.type ? typedAt(p.url, f, { at: p.type.at, cps: p.type.cps ?? 20, fps, seed: 'url' }) : null;
  const urlShown = typed ? typed.shown : p.url;
  const loadFrom = p.type ? start - loadDur(fps) : -1;
  const load = p.type ? prog(f, loadFrom, start, E.glideOut) : 0;
  const loading = p.type && f >= loadFrom && f < start + f60x(8, fps);
  const line = dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const chip = dark ? 'rgba(255, 255, 255, 0.07)' : mixColor(skin.face, skin.text, 0.045);
  // the accent words of the headline (a phrase may cross the line break)
  const accentWords = (p.accentWord ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const allWords = L.head.lines.join(' ').split(/\s+/);
  let hot = -1;
  for (let i = 0; accentWords.length && i + accentWords.length <= allWords.length; i++) {
    if (accentWords.every((w, j) => allWords[i + j].toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '') === w.replace(/[^\p{L}\p{N}-]/gu, ''))) hot = i;
  }
  let wi = 0;
  const btnInk = skin.accentInk;
  return (
    <div data-ui data-screen="browser-window" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.panel * pt} u={u} lift={0.5} backdrop={p.backdrop} focus="window">
        {focus.chrome && (
          <div {...focusAttr('chrome')} style={{ position: 'absolute', left: 0, top: 0, width: L.w, height: L.chromeH, borderBottom: `${Math.max(1, 0.6 * pt).toFixed(2)}px solid ${line}`, background: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.015)' }}>
            <div style={{ position: 'absolute', left: 16 * pt, top: (L.chromeH - 11 * pt) / 2, display: 'flex', gap: 7 * pt }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 11 * pt, height: 11 * pt, borderRadius: '50%', background: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)' }} />
              ))}
            </div>
            <svg width={44 * pt} height={16 * pt} viewBox="0 0 44 16" style={{ position: 'absolute', left: 82 * pt, top: (L.chromeH - 16 * pt) / 2 }}>
              <path d="M9 3 L4 8 L9 13 M27 3 L32 8 L27 13" fill="none" stroke={skin.faint} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {focus.address && (
              <div {...focusAttr('address')} style={{ position: 'absolute', left: focus.address.x, top: focus.address.y, width: focus.address.w, height: focus.address.h, borderRadius: focus.address.h / 2.6, background: chip, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 * pt }}>
                <Icon name="lock" size={11 * pt} color={skin.mute} weight="fill" />
                <span {...focusAttr('url')} {...textTag('url', T.url * pt, view)} style={tx(T.url, pt, 500, skin.text)}>
                  {urlShown}
                </span>
                {typed && !typed.done && <span style={{ display: 'inline-block', width: 1.5 * pt, height: 15 * pt, background: skin.accent, opacity: caretOn(typed.since, fps) }} />}
              </div>
            )}
            {loading && <div style={{ position: 'absolute', left: 0, bottom: -1 * pt, height: 2 * pt, width: L.w * load, background: skin.accent, opacity: 1 - prog(f, start, start + f60x(8, fps), E.linear) }} />}
          </div>
        )}
        {/* nav */}
        <div {...focusAttr('nav')} style={{ position: 'absolute', left: focus.nav.x, top: focus.nav.y, width: focus.nav.w, height: focus.nav.h, ...rise(sec('nav')) }}>
          <div {...focusAttr('brand')} style={{ position: 'absolute', left: 0, top: 3 * pt, display: 'flex', alignItems: 'center', gap: 10 * pt }}>
            <Mark skin={skin} size={26 * pt} logo={p.logo} glyph={p.glyph ?? 'sparkle'} />
            <span {...textTag('site-brand', T.brand * pt, view)} style={tx(T.brand, pt, 640, skin.text, { track: -0.012 })}>{p.brand}</span>
          </div>
          <div style={{ position: 'absolute', right: focus.cta.w + 22 * pt, top: 0, height: 32 * pt, display: 'flex', alignItems: 'center', gap: 26 * pt }}>
            {(p.nav ?? []).slice(0, 4).map((n) => (
              <span key={n} {...textTag(`nav-${n}`, T.nav * pt, view)} style={tx(T.nav, pt, 500, skin.mute)}>{n}</span>
            ))}
            {p.signIn && <span {...textTag('sign-in', T.nav * pt, view)} style={tx(T.nav, pt, 560, skin.text)}>{p.signIn}</span>}
          </div>
          <div {...focusAttr('cta')} style={{ position: 'absolute', right: 0, top: 0, width: focus.cta.w, height: 32 * pt, borderRadius: 16 * pt, background: dark ? C.white : skin.text, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: smallShadow(skin, u, 0.8) }}>
            <span {...textTag('nav-cta', T.cta * pt, view)} style={tx(T.cta, pt, 600, dark ? C.ink : C.white)}>{p.cta}</span>
          </div>
        </div>
        {/* hero */}
        <div {...focusAttr('headline')} {...textTag('headline', L.head.size * pt, view)} style={{ position: 'absolute', left: focus.headline.x, top: focus.headline.y, ...tx(L.head.size, pt, 620, skin.text, { track: -0.025, lead: 1.06 }), ...rise(sec('headline')) }}>
          {L.head.lines.map((ln, li) => (
            <div key={li}>
              {ln.split(/\s+/).map((w, j) => {
                const k = wi++;
                const isHot = hot >= 0 && k >= hot && k < hot + accentWords.length;
                return (
                  <span key={j} style={isHot ? { color: skin.accentText } : undefined}>
                    {j ? ' ' : ''}
                    {w}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        {focus.lead && (
          <div {...focusAttr('lead')} {...textTag('lead', T.lead * pt, view)} style={{ position: 'absolute', left: focus.lead.x, top: focus.lead.y, ...tx(T.lead, pt, 450, skin.mute, { lead: 1.42 }), ...rise(sec('lead')) }}>
            {L.leadLines.join('\n')}
          </div>
        )}
        <div {...focusAttr('buttons')} style={{ position: 'absolute', left: focus.buttons.x, top: focus.buttons.y, height: focus.buttons.h, display: 'flex', gap: 12 * pt, ...rise(sec('buttons')) }}>
          <div style={{ height: 40 * pt, padding: `0 ${20 * pt}px`, borderRadius: 20 * pt, background: `linear-gradient(180deg, ${mixColor(skin.solid, C.white, 0.14)} 0%, ${skin.solid} 100%)`, display: 'flex', alignItems: 'center', boxShadow: smallShadow(skin, u, 1.2) }}>
            <span {...textTag('site-cta', T.btn * pt, view)} style={tx(T.btn, pt, 600, btnInk)}>{p.cta}</span>
          </div>
          {p.ctaAlt && (
            <div style={{ height: 40 * pt, padding: `0 ${18 * pt}px`, borderRadius: 20 * pt, boxShadow: `inset 0 0 0 ${Math.max(1, 0.8 * pt).toFixed(2)}px ${dark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.14)'}`, display: 'flex', alignItems: 'center', gap: 8 * pt }}>
              <Icon name="play" size={13 * pt} color={skin.text} weight="fill" />
              <span {...textTag('site-cta-alt', T.btn * pt, view)} style={tx(T.btn, pt, 560, skin.text)}>{p.ctaAlt}</span>
            </div>
          )}
        </div>
        {/* the picture and the notice floating on its edge */}
        {p.hero && focus.picture && (
          <div {...focusAttr('picture')} style={{ position: 'absolute', left: focus.picture.x, top: focus.picture.y, ...rise(sec('picture')) }}>
            <Picture src={p.hero} w={focus.picture.w} h={focus.picture.h} r={18 * pt} focus={p.heroFocus} />
          </div>
        )}
        {p.notice && focus.notice && (
          <div {...focusAttr('notice')} style={{ position: 'absolute', left: focus.notice.x, top: focus.notice.y, width: focus.notice.w, height: focus.notice.h, borderRadius: 14 * pt, background: dark ? rgbaOf(C.ink2, 0.86) : 'rgba(255, 255, 255, 0.92)', boxShadow: `0 ${(10 * pt).toFixed(1)}px ${(26 * pt).toFixed(1)}px ${(-8 * pt).toFixed(1)}px rgba(0, 0, 0, ${dark ? 0.6 : 0.22}), inset 0 0 0 ${Math.max(1, 0.6 * pt).toFixed(2)}px ${dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)'}`, display: 'flex', alignItems: 'center', gap: 10 * pt, padding: `0 ${12 * pt}px`, boxSizing: 'border-box', ...rise(sec('notice')) }}>
            {p.notice.photo ? <Face skin={skin} size={34 * pt} name={p.notice.title} src={p.notice.photo} /> : <Mark skin={skin} size={34 * pt} logo={p.notice.logo} glyph={p.notice.glyph ?? 'bell'} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 * pt, minWidth: 0 }}>
              <span {...textTag('notice-title', T.noticeT * pt, view)} style={tx(T.noticeT, pt, 620, dark ? C.white : C.ink)}>{p.notice.title}</span>
              <span {...textTag('notice-body', T.noticeB * pt, view)} style={tx(T.noticeB, pt, 450, dark ? 'rgba(255, 255, 255, 0.66)' : 'rgba(0, 0, 0, 0.58)')}>{L.noticeLines.join('\n')}</span>
            </div>
          </div>
        )}
        {/* the cards */}
        {(p.cards ?? []).slice(0, 3).map((c, i) => {
          const b = focus[`card${i}`];
          const q = sec(`card${i}` as (typeof SECTIONS)[number]);
          const pad = 14 * pt;
          const cardBg = dark ? 'rgba(255, 255, 255, 0.06)' : skin.tone === 'glass' ? 'rgba(255, 255, 255, 0.7)' : mixColor(skin.face, skin.text, 0.025);
          const cardInk = skin.tone === 'glass' && !dark ? C.ink : skin.text;
          const cardMute = skin.tone === 'glass' && !dark ? 'rgba(0, 0, 0, 0.55)' : skin.mute;
          return (
            <div key={i} {...focusAttr(`card${i}`)} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: 16 * pt, background: cardBg, boxShadow: `inset 0 0 0 ${Math.max(1, 0.6 * pt).toFixed(2)}px ${dark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)'}`, overflow: 'hidden', ...rise(q) }}>
              {c.kind === 'photo' ? (
                <>
                  {c.src ? <Picture src={c.src} w={b.w} h={b.h * 0.5} /> : (
                    // no picture: a lit poster of the accent with the product's glyph, never an empty block
                    <div style={{ width: b.w, height: b.h * 0.5, background: `linear-gradient(160deg, ${mixColor(skin.solid, C.white, 0.28)} 0%, ${skin.solid} 70%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={p.glyph ?? 'sparkle'} size={b.h * 0.2} color={skin.accentInk} weight="fill" />
                    </div>
                  )}
                  <div style={{ position: 'absolute', left: pad, top: b.h * 0.5 + 9 * pt, right: pad }}>
                    <div {...textTag(`card-title${i}`, T.cardTitle * pt, view)} style={tx(T.cardTitle, pt, 600, cardInk)}>{wrapText(c.title, T.cardTitle * pt, 600, b.w - 2 * pad).slice(0, 2).join('\n')}</div>
                    {c.sub && <div {...textTag(`card-sub${i}`, T.small * pt, view)} style={{ ...tx(T.small, pt, 450, cardMute), marginTop: 3 * pt }}>{c.sub}</div>}
                  </div>
                </>
              ) : (
                <>
                  <div {...textTag(`card-title${i}`, T.cardTitle * pt, view)} style={{ position: 'absolute', left: pad, top: pad, ...tx(T.cardTitle, pt, 600, cardInk) }}>{c.title}</div>
                  {c.kind === 'people' && (
                    <>
                      {c.tag && textW(c.title, T.cardTitle * pt, 600) + textW(c.tag, T.small * pt, 500) + 22 * pt < b.w - 2 * pad && (
                        <div style={{ position: 'absolute', right: pad, top: pad - 1 * pt, display: 'flex', alignItems: 'center', gap: 4 * pt }}>
                          <div style={{ width: 6 * pt, height: 6 * pt, borderRadius: '50%', background: skin.accent }} />
                          <span {...textTag(`card-tag${i}`, T.small * pt, view)} style={tx(T.small, pt, 500, cardMute)}>{c.tag}</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', left: pad, top: 50 * pt, height: 34 * pt, width: b.w - 2 * pad }}>
                        {c.faces.slice(0, 4).map((q2, j) => (
                          <div key={q2.name} style={{ position: 'absolute', left: j * 23 * pt, top: 0, zIndex: 5 - j }}>
                            <Face skin={skin} size={34 * pt} name={q2.name} src={q2.photo} ring={dark ? C.ink2 : C.white} />
                          </div>
                        ))}
                      </div>
                      <div {...textTag(`card-value${i}`, T.cardValue * pt, view)} style={{ position: 'absolute', left: pad, bottom: pad, ...tx(T.cardValue, pt, 640, cardInk, { track: -0.015 }) }}>{c.value}</div>
                    </>
                  )}
                  {c.kind === 'stat' && (c.p !== undefined ? (
                    <svg width={64 * pt} height={64 * pt} viewBox="0 0 64 64" style={{ position: 'absolute', left: (b.w - 64 * pt) / 2, top: 44 * pt }}>
                      <circle cx="32" cy="32" r="27" fill="none" stroke={dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)'} strokeWidth="5" />
                      <circle cx="32" cy="32" r="27" fill="none" stroke={skin.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 27 * c.p * q).toFixed(2)} 999`} transform="rotate(-90 32 32)" />
                      {/* lint-ok: SVG user units in a 64-unit box drawn 64 pt wide: the figure reads at 15 pt (30 px at 1080p) */}
                      <text x="32" y="37" textAnchor="middle" fill={cardInk} style={{ fontFamily: KIT_FONT, fontSize: 15, fontWeight: 640 }}>{c.value}</text>
                    </svg>
                  ) : (
                    <>
                      <div {...textTag(`card-figure${i}`, T.figure * pt, view)} style={{ position: 'absolute', left: pad, top: 38 * pt, ...tx(T.figure, pt, 640, cardInk, { track: -0.02 }) }}>{c.value}</div>
                      {c.delta && <div {...textTag(`card-delta${i}`, T.small * pt, view)} style={{ position: 'absolute', left: pad, top: 76 * pt, ...tx(T.small, pt, 600, skin.accentText) }}>{c.delta}</div>}
                      {(() => {
                        const s = c.series ?? seriesOf(c.title);
                        const w = b.w - 2 * pad;
                        const h = 34 * pt;
                        const pts = s.map((v, j) => `${((j / (s.length - 1)) * w).toFixed(1)},${(h - v * h).toFixed(1)}`);
                        const draw = q;
                        return (
                          <svg width={w} height={h} style={{ position: 'absolute', left: pad, bottom: pad, overflow: 'visible' }}>
                            <path d={`M${pts.join(' L')} L${w},${h} L0,${h} Z`} fill={skin.accent} opacity={0.12 * draw} />
                            <path d={`M${pts.join(' L')}`} fill="none" stroke={skin.accent} strokeWidth={1.6 * pt} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw.toFixed(3)} 1`} />
                          </svg>
                        );
                      })()}
                    </>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a BrowserWindow draws (kit/screens/forms.ts), part -> [form, focus box]: the window, its headline, the call to action as a button, the address bar as a pill, its picture, a notice, its cards as a list, the buttons, the brand as a chip. */
export const BROWSER_WINDOW_FORMS = { window: ['window', 'window'], headline: ['word', 'headline'], cta: ['button', 'cta'], address: ['pill', 'address'], picture: ['photo', 'picture'], notice: ['notice', 'notice'], cards: ['list', 'cards'], buttons: ['button', 'buttons'], brand: ['chip', 'brand'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from browserWindowLayout. */
export const browserWindowForms = (p: BrowserWindowProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => browserWindowLayout(p, f, ctx), BROWSER_WINDOW_FORMS, { pt: ctx.pt });
