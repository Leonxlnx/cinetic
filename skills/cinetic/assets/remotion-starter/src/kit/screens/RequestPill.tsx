// RequestPill: what many people asked for, found in what they wrote: a small label over it ("Asked most"), then a
// pill on the accent holding the faces of a few who asked (photos, or the platform's coloured initial discs), the request
// in their words, and a badge counting how many asked ("Asked 612+"). The pill opens from the faces to its full width,
// the words arrive as it opens, the badge counts on. The turn from reading a crowd to the one thing it wants.
//
//   <RequestPill label="Asked most" text="A weeknight bread course" people={CONTENT.people.slice(1, 4)} count={612} at={0} />
//   <RequestPill {...CONTENT.request} at={20} />
import React from 'react';
import { C } from '../../brand/tokens';
import { E, fd, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import { Face, fbox, type Focus, focusAttr, Icon, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, textTag, textW, tx, useScreen } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type RequestPillProps = ScreenBase & {
  /** the words people used, short (2-6 words) */
  text: string;
  /** the small label over the pill (tracked capitals); '' for none */
  label?: string;
  /** a few who asked (the first three show) */
  people?: { name: string; photo?: string }[];
  /** how many asked; `countLabel` with {n} (default 'Asked {n}+') */
  count?: number;
  countLabel?: string;
  /** the frame the pill opens (default 0) */
  at?: number;
  /** frames the badge counts for (default 1 s) */
  dur?: number;
  /** the pill on the accent (default) or on the skin's face */
  solid?: boolean;
  size?: 'md' | 'lg';
};

const SIZES = { md: { h: 46, text: 18, label: 11, badge: 12 }, lg: { h: 58, text: 23, label: 12, badge: 13 } } as const;

const fmtCount = (n: number) => Math.round(n).toLocaleString('en-US');

/** The pill's size and focus boxes: pill, label, faces, text, badge. */
export const requestPillLayout = (p: RequestPillProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { faceD: number; faceStep: number; labelH: number } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const S = SIZES[p.size ?? 'lg'];
  const h = S.h * pt;
  const n = Math.min(3, p.people?.length ?? 0);
  const faceD = h - 12 * pt;
  const faceStep = faceD * 0.62;
  const facesW = n ? faceD + (n - 1) * faceStep : 0;
  const labelH = p.label ? S.label * pt * 1.4 + 14 * pt : 0;
  const textX = 6 * pt + (n ? facesW + 14 * pt : 18 * pt);
  const textWd = textW(p.text, S.text * pt, 620, -0.02);
  const badge = p.count !== undefined ? (p.countLabel ?? 'Asked {n}+').replace('{n}', fmtCount(p.count)) : '';
  const badgeW = badge ? textW(badge, S.badge * pt, 560) + 22 * pt : 0;
  const badgeX = textX + textWd + 16 * pt;
  const w = badge ? badgeX + badgeW + 10 * pt : textX + textWd + 24 * pt;
  const y0 = labelH;
  const focus: Focus = {
    pill: fbox(0, y0, w, h, S.text * pt, h / 2),
    faces: fbox(6 * pt, y0 + 6 * pt, Math.max(facesW, 1), faceD, undefined, faceD / 2),
    text: fbox(textX, y0 + (h - S.text * pt * 1.25) / 2, textWd, S.text * pt * 1.25, S.text * pt),
  };
  if (badge) focus.badge = fbox(badgeX, y0 + (h - 26 * pt) / 2, badgeW, 26 * pt, S.badge * pt, 13 * pt);
  if (p.label) focus.label = fbox(0, 0, w, S.label * pt * 1.4, S.label * pt);
  return { w, h: y0 + h, focus, faceD, faceStep, labelH };
};

/** The request (see the file header). */
export const RequestPill: React.FC<RequestPillProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const S = SIZES[p.size ?? 'lg'];
  const L = requestPillLayout(p, f, { pt });
  const { focus } = L;
  const at = p.at ?? 0;
  const solid = p.solid !== false;
  const bg = solid ? skin.solid : skin.face;
  const ink = solid ? skin.accentInk : skin.text;
  // the pill opens from its faces to its full width (a mask growing on the arrival curve), the words arriving as it opens
  const open = prog(f, at + f60x(6, fps), at + f60x(30, fps), E.snapOut);
  const minW = Math.min(L.w, focus.faces.w + 12 * pt);
  // it appears where the faces will be (a quick pop), then opens
  const pop = prog(f, at, at + f60x(12, fps), E.snapOut);
  const wNow = minW + (L.w - minW) * open;
  const words = prog(f, at + f60x(14, fps), at + f60x(34, fps), E.snapOut);
  const labelIn = prog(f, at, at + f60x(18, fps), E.snapOut);
  const n = p.count !== undefined ? p.count * prog(fd(f), at + f60x(20, fps), at + f60x(20, fps) + (p.dur ?? fps), E.glideOut) : 0;
  const badge = p.count !== undefined ? (p.countLabel ?? 'Asked {n}+').replace('{n}', fmtCount(n)) : '';
  const people = (p.people ?? []).slice(0, 3);
  const pill = focus.pill;
  return (
    <div data-ui data-screen="request-pill" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {p.label && focus.label && (
        <div {...focusAttr('label')} style={{ position: 'absolute', left: 0, top: 0, width: L.w, height: focus.label.h, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 * pt, opacity: labelIn, transform: `translateY(${((1 - labelIn) * 6 * pt).toFixed(2)}px)` }}>
          <div style={{ width: S.label * pt * 1.35, height: S.label * pt * 1.35, borderRadius: 4 * pt, background: solid ? skin.solid : skin.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={S.label * pt} color={solid ? skin.accentInk : skin.accentText} weight="fill" />
          </div>
          <span {...textTag('request-label', S.label * pt, view)} style={{ ...tx(S.label, pt, 640, skin.dark ? mixColor(C.white, skin.ground, 0.25) : skin.mute, { track: 0.16 }), textTransform: 'uppercase' }}>{p.label}</span>
        </div>
      )}
      <div {...focusAttr('pill')} style={{ position: 'absolute', left: (L.w - wNow) / 2, top: pill.y, width: wNow, height: pill.h, borderRadius: pill.h / 2, overflow: 'hidden', background: `linear-gradient(180deg, ${mixColor(bg, C.white, 0.14)} 0%, ${bg} 62%, ${mixColor(bg, C.ink, 0.06)} 100%)`, boxShadow: `${smallShadow(skin, u, 2.2)}, inset 0 0 0 ${Math.max(1, 0.7 * pt).toFixed(2)}px rgba(255, 255, 255, ${solid ? 0.18 : 0.08})`, opacity: pop, transform: `scale(${(0.86 + 0.14 * pop).toFixed(4)})` }}>
        <div style={{ position: 'absolute', left: (wNow - L.w) / 2, top: 0, width: L.w, height: pill.h }}>
          <div {...focusAttr('faces')} style={{ position: 'absolute', left: focus.faces.x, top: focus.faces.y - pill.y, width: focus.faces.w, height: focus.faces.h }}>
            {people.map((q, i) => {
              const pop = prog(f, at + f60x(4 + 5 * i, fps), at + f60x(20 + 5 * i, fps), E.snapOut);
              return (
                <div key={q.name} style={{ position: 'absolute', left: i * L.faceStep, top: 0, zIndex: 3 - i, opacity: pop, transform: `scale(${(0.7 + 0.3 * pop).toFixed(4)})` }}>
                  <Face skin={skin} size={L.faceD} name={q.name} src={q.photo} ring={bg} />
                </div>
              );
            })}
          </div>
          <div {...focusAttr('text')} {...textTag('request', S.text * pt, view)} style={{ position: 'absolute', left: focus.text.x, top: focus.text.y - pill.y, ...tx(S.text, pt, 620, ink, { track: -0.02, lead: 1.25 }), opacity: words, transform: `translateX(${((1 - words) * 10 * pt).toFixed(2)}px)` }}>
            {p.text}
          </div>
          {badge && focus.badge && (
            <div {...focusAttr('badge')} style={{ position: 'absolute', left: focus.badge.x, top: focus.badge.y - pill.y, width: focus.badge.w, height: focus.badge.h, borderRadius: focus.badge.h / 2, background: solid ? 'rgba(255, 255, 255, 0.22)' : skin.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: words }}>
              <span {...textTag('request-count', S.badge * pt, view)} style={tx(S.badge, pt, 560, solid ? ink : skin.accentText)}>{badge}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a RequestPill draws (kit/screens/forms.ts), part -> [form, focus box]: the request as a pill, its faces as a chip, its words, a badge, its label. */
export const REQUEST_PILL_FORMS = { pill: ['pill', 'pill'], faces: ['chip', 'faces'], text: ['word', 'text'], badge: ['chip', 'badge'], label: ['word', 'label'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from requestPillLayout. */
export const requestPillForms = (p: RequestPillProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => requestPillLayout(p, f, ctx), REQUEST_PILL_FORMS, { pt: ctx.pt });
