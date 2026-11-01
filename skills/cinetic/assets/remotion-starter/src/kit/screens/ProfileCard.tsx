// ProfileCard: a channel, a shop or a person as the platform shows them: the face or the mark big, the name with its
// verified seal, the handle, the counts ("48K subscribers · 210 videos"), the main button (pressed on `press`, its word
// swapping to `done`), and a row of their real pictures along the foot of the card. Every part is a focus box.
//
//   <ProfileCard name="Crumb Club" handle="@crumbclub" photo={...} verified stats={['48K subscribers', '210 videos']} action="Subscribe" thumbs={CONTENT.thumbs.slice(0, 3)} />
import React from 'react';
import { C } from '../../brand/tokens';
import { E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { LogoRef } from '../logos';
import { Face, fbox, type Focus, focusAttr, Icon, Mark, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, textTag, textW, tx, useFace, useScreen } from './base';
import { pressAt } from './PromptBar';
import { type Thumb, THUMB_FACE, ThumbTitle } from './ThumbGrid';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type ProfileCardProps = ScreenBase & {
  name: string;
  handle?: string;
  photo?: string;
  logo?: LogoRef;
  verified?: boolean;
  stats?: string[];
  action?: string;
  press?: number;
  done?: string;
  thumbs?: Thumb[];
  w?: number;
};

const T = { name: 28, handle: 17, stats: 16, action: 18, face: 92 } as const;

/** The card's size and focus boxes: card, face, name, stats, action, thumb{i}. */
export const profileCardLayout = (p: ProfileCardProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout => {
  const pt = ctx.pt ?? SCREEN.pt;
  const W = p.w ?? 520 * pt;
  const pad = 28 * pt;
  const fx = pad;
  const tx0 = pad + (T.face + 20) * pt;
  const focus: Focus = {};
  focus.face = fbox(fx, pad, T.face * pt, T.face * pt, undefined, (T.face * pt) / 2);
  const nameW = textW(p.name, T.name * pt, 640, -0.02) + (p.verified ? 34 * pt : 0);
  focus.name = fbox(tx0, pad + 2 * pt, nameW, T.name * pt * 1.15, T.name * pt);
  let y = pad + 2 * pt + T.name * pt * 1.15 + 2 * pt;
  if (p.handle) y += T.handle * pt * 1.3;
  if (p.stats?.length) {
    focus.stats = fbox(tx0, y + 2 * pt, textW(p.stats.join('  ·  '), T.stats * pt, 450), T.stats * pt * 1.3, T.stats * pt);
    y += T.stats * pt * 1.3 + 2 * pt;
  }
  y = Math.max(y, pad + T.face * pt) + 22 * pt;
  if (p.action) {
    focus.action = fbox(pad, y, W - 2 * pad, 52 * pt, T.action * pt, 26 * pt);
    y += 52 * pt + 20 * pt;
  }
  const n = p.thumbs?.length ?? 0;
  if (n) {
    const gap = 10 * pt;
    const tw = (W - 2 * pad - gap * (n - 1)) / n;
    const th = tw * 9 / 16;
    p.thumbs!.forEach((_, i) => (focus[`thumb${i}`] = fbox(pad + i * (tw + gap), y, tw, th, undefined, 10 * pt)));
    y += th + pad;
  } else y += pad - 20 * pt;
  focus.card = fbox(0, 0, W, y, T.stats * pt, SCREEN.radius.panel * pt);
  return { w: W, h: y, focus };
};

/** The profile (see the file header). */
export const ProfileCard: React.FC<ProfileCardProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  useFace(THUMB_FACE.load);
  const L = profileCardLayout(p, f, { pt });
  const { focus } = L;
  const press = pressAt(f, p.press, fps);
  const done = p.press !== undefined && f >= p.press + f60x(10, fps);
  const swap = p.press !== undefined ? prog(f, p.press + f60x(8, fps), p.press + f60x(22, fps), E.snapOut) : 0;
  const btnBg = done ? skin.well : skin.dark ? C.white : mixColor(skin.text, C.ink, 0.5);
  const btnInk = done ? skin.text : skin.dark ? C.ink : C.white;
  return (
    <div data-ui data-screen="profile-card" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.panel * pt} u={u} lift={0.4} backdrop={p.backdrop} focus="card">
        <div {...focusAttr('face')} style={{ position: 'absolute', left: focus.face.x, top: focus.face.y }}>
          {p.photo || !p.logo ? <Face skin={skin} size={focus.face.w} name={p.name} src={p.photo} /> : <Mark skin={skin} size={focus.face.w} logo={p.logo} />}
        </div>
        <div {...focusAttr('name')} style={{ position: 'absolute', left: focus.name.x, top: focus.name.y, display: 'flex', alignItems: 'center', gap: 8 * pt }}>
          <span {...textTag('profile-name', T.name * pt, view)} style={tx(T.name, pt, 640, skin.text, { track: -0.02, lead: 1.15 })}>{p.name}</span>
          {p.verified && <Icon name="verified" size={24 * pt} color={skin.tone === 'glass' && skin.dark ? skin.text : skin.accent} weight="fill" />}
        </div>
        {p.handle && <div {...textTag('profile-handle', T.handle * pt, view)} style={{ position: 'absolute', left: focus.name.x, top: focus.name.y + focus.name.h + 2 * pt, ...tx(T.handle, pt, 480, skin.mute) }}>{p.handle}</div>}
        {p.stats?.length && focus.stats ? <div {...focusAttr('stats')} {...textTag('profile-stats', T.stats * pt, view)} style={{ position: 'absolute', left: focus.stats.x, top: focus.stats.y, ...tx(T.stats, pt, 450, skin.mute) }}>{p.stats.join('  ·  ')}</div> : null}
        {p.action && focus.action && (
          <div {...focusAttr('action')} style={{ position: 'absolute', left: focus.action.x, top: focus.action.y, width: focus.action.w, height: focus.action.h, borderRadius: focus.action.h / 2, background: btnBg, boxShadow: done ? `inset 0 0 0 ${Math.max(1, 0.6 * pt).toFixed(2)}px ${skin.rim}` : smallShadow(skin, u, 1.4), transform: `scale(${(1 - 0.04 * press.q).toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 * pt }}>
            {done && <Icon name="check" size={T.action * pt} color={btnInk} weight="bold" style={{ opacity: swap }} />}
            <span {...textTag('profile-action', T.action * pt, view)} style={{ ...tx(T.action, pt, 620, btnInk), opacity: done ? swap : 1 }}>{done ? p.done ?? p.action : p.action}</span>
          </div>
        )}
        {(p.thumbs ?? []).map((t, i) => {
          const b = focus[`thumb${i}`];
          return (
            <div key={i} {...focusAttr(`thumb${i}`)} style={{ position: 'absolute', left: b.x, top: b.y }}>
              {t.src ? (
                <Picture src={t.src} w={b.w} h={b.h} r={10 * pt} focus={t.focus}>
                  {t.overlay && <ThumbTitle text={t.overlay} w={b.w} h={b.h} accent={skin.accent} />}
                </Picture>
              ) : (
                <div style={{ width: b.w, height: b.h, borderRadius: 10 * pt, background: skin.well }} />
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a ProfileCard draws (kit/screens/forms.ts), part -> [form, focus box]: the card, its action button, the face as a chip, the name, the stats as a count. */
export const PROFILE_CARD_FORMS = { card: ['card', 'card'], button: ['button', 'action'], face: ['chip', 'face'], name: ['word', 'name'], stats: ['count', 'stats'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from profileCardLayout. */
export const profileCardForms = (p: ProfileCardProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => profileCardLayout(p, f, ctx), PROFILE_CARD_FORMS, { pt: ctx.pt });
