// UrlScan: a link pasted or typed into a pill and scanned. The platform's mark (or a globe), the URL typed with its caret,
// and an action button inset at the right ("Read my channel ->"); pressed on `press`, the button fills with the accent and
// says it is busy ("Reading" with stepping dots and a light sweep crossing it), and on `doneAt` it lands on a tick and
// the done word. The button's width glides between its words (it never jumps), right edge fixed.
//
//   <UrlScan url="youtube.com/@crumbclub" logo="youtube" action="Read my channel" busy="Reading" at={6} press={58} doneAt={150} tone="dark" />
import React from 'react';
import { C } from '../../brand/tokens';
import { clamp, E, fd, mix, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import { hasLogo, BrandLogo, type LogoRef } from '../logos';
import { Caret, caretOn, fbox, type Focus, focusAttr, Icon, Panel, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, sweepX, textTag, textW, tx, useScreen } from './base';
import { pressAt } from './PromptBar';
import { typedAt } from './typing';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type UrlScanProps = ScreenBase & {
  url: string;
  at?: number;
  cps?: number;
  /** the platform the link is on (a fetched mark: scripts/logos.mjs), drawn in the field's ink */
  logo?: LogoRef;
  glyph?: IconName;
  placeholder?: string;
  /** the button's word before it is pressed ("Read my channel") */
  action: string;
  /** while it works ("Reading") */
  busy?: string;
  /** when it is done ("Ready") */
  done?: string;
  press?: number;
  doneAt?: number;
  w?: number;
  size?: 'md' | 'lg';
};

const geo = (lg: boolean) => ({ H: lg ? 72 : 64, font: lg ? 22 : 20, btnFont: lg ? 19 : 17, mark: lg ? 30 : 26 });

/** Which word the button shows at frame f and the glide between words (0..1). */
const phase = (p: UrlScanProps, f: number, fps: number) => {
  const busyAt = p.press === undefined ? Infinity : p.press + f60x(12, fps);
  const doneAt = p.doneAt ?? Infinity;
  const glide = f60x(16, fps);
  if (f >= doneAt && p.done) return { from: p.busy ?? p.action, to: p.done, k: prog(f, doneAt, doneAt + glide, E.snapOut), state: 'done' as const };
  if (f >= busyAt) return { from: p.action, to: p.busy ?? p.action, k: prog(f, busyAt, busyAt + glide, E.snapOut), state: 'busy' as const };
  return { from: p.action, to: p.action, k: 1, state: 'idle' as const };
};

/** The pill's size and focus boxes at frame f: pill, logo, url, caret, button. */
export const urlScanLayout = (p: UrlScanProps, f: number, ctx: { pt?: number; fps?: number } = {}): ScreenLayout => {
  const pt = ctx.pt ?? SCREEN.pt;
  const fps = ctx.fps ?? 30;
  const g = geo(p.size === 'lg');
  const W = p.w ?? 600 * pt;
  const H = g.H * pt;
  const ph = phase(p, f, fps);
  const lw = (s: string) => textW(s, g.btnFont * pt, 600) + (ph.state === 'idle' ? 26 : 30) * pt + 44 * pt;
  const bw = mix(lw(ph.from), lw(ph.to), ph.k);
  const bh = H - 12 * pt;
  const bx = W - 6 * pt - bw;
  const textX = (20 + g.mark + 14) * pt;
  const typed = typedAt(p.url, f, { at: p.at, cps: p.cps ?? 30, fps, seed: p.url });
  const tw = textW(typed.shown, g.font * pt, 450);
  const font = g.font * pt;
  const focus: Focus = {
    pill: fbox(0, 0, W, H, font, H / 2),
    logo: fbox(20 * pt, (H - g.mark * pt) / 2, g.mark * pt, g.mark * pt),
    url: fbox(textX, H / 2 - font * 0.65, Math.max(2 * pt, tw), font * 1.3, font),
    caret: fbox(textX + tw + 1 * pt, H / 2 - font * 0.6, Math.max(2, 2 * pt), font * 1.2, font),
    button: fbox(bx, 6 * pt, bw, bh, g.btnFont * pt, bh / 2),
  };
  return { w: W, h: H, focus };
};

/** The link pill (see the file header). */
export const UrlScan: React.FC<UrlScanProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const g = geo(p.size === 'lg');
  const L = urlScanLayout(p, f, { pt, fps });
  const { focus } = L;
  const typed = typedAt(p.url, f, { at: p.at, cps: p.cps ?? 30, fps, seed: p.url });
  const ph = phase(p, f, fps);
  const press = pressAt(f, p.press, fps);
  const b = focus.button;
  // the face reaches the accent by the time the new word fades in (k 0.5), so a label never sits on a half-tint
  const fill = ph.state === 'idle' ? 0 : ph.state === 'busy' ? clamp(ph.k * 2) : 1;
  const idleFace = skin.dark ? mixColor(C.white, skin.solid, 0.06) : mixColor(skin.face, skin.text, 0.04);
  const face = mixColor(idleFace, skin.solid, fill);
  const ink = mixColor(skin.dark ? skin.accentText : skin.text, skin.accentInk, fill);
  const dots = ph.state === 'busy' ? Math.floor((fd(f) - (p.press ?? 0)) / (0.32 * fps)) % 4 : 0;
  const label = ph.k < 0.5 ? ph.from : ph.to;
  const labelO = ph.k < 0.5 ? 1 - ph.k * 2 : (ph.k - 0.5) * 2;
  const showCaret = typed.n < p.url.length || p.press === undefined || f < p.press;
  return (
    <div data-ui data-screen="url-scan" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={L.h / 2} u={u} lift={0.2} backdrop={p.backdrop} focus="pill">
        <div {...focusAttr('logo')} style={{ position: 'absolute', left: focus.logo.x, top: focus.logo.y, width: focus.logo.w, height: focus.logo.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {p.logo && hasLogo(p.logo) ? <BrandLogo logo={p.logo} box={focus.logo.w} ground={skin.dark ? 'dark' : 'light'} mono /> : <Icon name={p.glyph ?? 'globeSimple'} size={focus.logo.w} color={skin.mute} />}
        </div>
        <div {...focusAttr('url')} {...textTag('url', g.font * pt, view)} style={{ position: 'absolute', left: focus.url.x, top: focus.url.y, height: focus.url.h, display: 'flex', alignItems: 'center', ...tx(g.font, pt, 450, skin.text, { lead: 1.3 }) }}>
          {typed.n ? typed.shown : <span style={{ color: skin.faint }}>{p.placeholder ?? ''}</span>}
          {showCaret && <Caret h={g.font * pt * 1.15} w={focus.caret.w} color={skin.text} on={caretOn(typed.since, fps)} style={{ marginLeft: 1 * pt }} />}
        </div>
        <div {...focusAttr('button')} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, transform: `scale(${(1 - 0.06 * press.q).toFixed(4)})` }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: b.h / 2, overflow: 'hidden', background: `linear-gradient(180deg, ${mixColor(face, C.white, 0.18)} 0%, ${face} 100%)`, boxShadow: smallShadow(skin, u, 1.4) }}>
            {/* lint-ok: the busy shine is a shape crossing the button face, no text in it */}
            {ph.state === 'busy' && <div style={{ position: 'absolute', top: 0, bottom: 0, left: sweepX(f, fps, b.w, 1.3), width: b.w * 0.35, background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.28) 50%, rgba(255, 255, 255, 0) 100%)', transform: 'skewX(-18deg)' }} />}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 * pt, opacity: clamp(labelO) }}>
            {ph.state === 'done' && ph.k >= 0.5 && <Icon name="check" size={g.btnFont * pt} color={ink} weight="bold" />}
            <span {...textTag('url-action', g.btnFont * pt, view)} style={tx(g.btnFont, pt, 600, ink, { track: -0.01 })}>
              {label}
              {ph.state === 'busy' && ph.k >= 0.5 && (
                <span>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ opacity: i < dots ? 1 : 0.18 }}>.</span>
                  ))}
                </span>
              )}
            </span>
            {ph.state === 'idle' && <Icon name="arrowRight" size={g.btnFont * pt * 0.95} color={ink} weight="bold" />}
          </div>
        </div>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a UrlScan draws (kit/screens/forms.ts), part -> [form, focus box]: the address pill, its button, the caret, the typed address, the site mark as a chip. */
export const URL_SCAN_FORMS = { pill: ['pill', 'pill'], button: ['button', 'button'], caret: ['word', 'caret'], url: ['word', 'url'], logo: ['chip', 'logo'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from urlScanLayout. */
export const urlScanForms = (p: UrlScanProps, ctx: { pt?: number; fps?: number } = {}): ScreenForms => screenForms((f) => urlScanLayout(p, f, ctx), URL_SCAN_FORMS, { pt: ctx.pt });
