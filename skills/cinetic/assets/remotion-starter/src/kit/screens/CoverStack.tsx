// CoverStack: the thing being made, as an object you could hold: its cover in front (a kicker line, the title set big in
// heavy condensed capitals with its accent word on a line of its own, a real photo under it, a strip with its facts) and
// the product's other items behind it, stepping back in depth (higher, smaller, darker; their titles peek over the
// front). With `at` the covers land one after the other, the front one last. Covers face the camera: depth comes from the
// stack and the camera, never from a tilt at rest. Put a ProgressPill under it for the making.
//
//   <CoverStack items={[{ title: 'The Weeknight Bread Handbook', accentWord: 'Bread', sub: 'Ebook · 64 pages', photo: ... }, ...]} kicker="Crumb Club" at={0} />
//   <CoverStack {...CONTENT.cover} at={10} />
import React from 'react';
import { C } from '../../brand/tokens';
import { E, prog } from '../../lib/anim';
import { mixColor, oklch as fromLch, toOklch } from '../../lib/color';
import { f60x } from '../../lib/film';
import { fbox, type Focus, focusAttr, Picture, SCREEN, type ScreenBase, type ScreenLayout, textTag, tx, unionBox, useFace, useScreen } from './base';
import { THUMB_FACE } from './ThumbGrid';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type Cover = {
  title: string;
  /** the word or words set biggest, on their own line (default: a word with a figure, else the longest) */
  accentWord?: string;
  /** one line of facts on the strip ("Ebook · 120 pages") */
  sub?: string;
  photo?: string;
  /** the photo's focus point (0..1) */
  focus?: [number, number];
};

export type CoverStackProps = ScreenBase & {
  /** the front cover first, then up to two behind it */
  items: Cover[];
  /** the brand line at the top of each cover (tracked capitals) */
  kicker?: string;
  /** the frame the first cover lands (default 0); covers land 5 f@60 apart, the front one last */
  at?: number;
  /** the cover's colour: 'dark' (near-black, default) or 'light' (paper) */
  cover?: 'dark' | 'light';
  /** the cover's width in UI points (default 220; height 1.32x) */
  size?: number;
};

const ASPECT = 1.32;
/** heavy condensed capitals: about half an em a letter (the title card's own estimate) */
const EM = 0.5;

/** A cover's title as lines: the words before the accent, the accent, the words after (capitals). */
export const coverLines = (c: Cover) => {
  const words = c.title.split(/\s+/).filter(Boolean);
  const accent = c.accentWord && c.title.toLowerCase().includes(c.accentWord.toLowerCase()) ? c.accentWord : (words.find((w) => /\d/.test(w)) ?? [...words].sort((a, b) => b.length - a.length)[0] ?? '');
  const i = c.title.toLowerCase().indexOf(accent.toLowerCase());
  const pre = c.title.slice(0, i).trim();
  const post = c.title.slice(i + accent.length).trim();
  return { pre: pre.toUpperCase(), accent: accent.toUpperCase(), post: post.toUpperCase() };
};

/** The stack's size and focus boxes: stack, cover (the front one), title, photo, cover{i} (0 = front). */
export const coverStackLayout = (p: CoverStackProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { cw: number; ch: number; back: { dx: number; dy: number; k: number }[] } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const cw = (p.size ?? 220) * pt;
  const ch = cw * ASPECT;
  const nBack = Math.min(2, Math.max(0, p.items.length - 1));
  const back = [
    { dx: -0.16 * cw, dy: -0.085 * ch, k: 0.9 },
    { dx: 0.16 * cw, dy: -0.15 * ch, k: 0.82 },
  ].slice(0, nBack);
  const padX = nBack ? 0.2 * cw : 0;
  const padTop = nBack ? 0.16 * ch : 0;
  const W = cw + 2 * padX;
  const H = ch + padTop;
  const x0 = padX;
  const y0 = padTop;
  const pad = 0.08 * cw;
  const focus: Focus = {};
  focus.cover0 = fbox(x0, y0, cw, ch, undefined, 0.03 * cw);
  back.forEach((b, i) => {
    const w = cw * b.k;
    const h = ch * b.k;
    focus[`cover${i + 1}`] = fbox(x0 + (cw - w) / 2 + b.dx, y0 + b.dy, w, h, undefined, 0.03 * w);
  });
  focus.cover = focus.cover0;
  focus.title = fbox(x0 + pad, y0 + 0.13 * ch, cw - 2 * pad, 0.4 * ch, 0.06 * cw);
  focus.photo = fbox(x0, y0 + 0.5 * ch, cw, 0.5 * ch, undefined, 0.03 * cw);
  focus.stack = unionBox(...Object.entries(focus).filter(([k]) => /^cover\d$/.test(k)).map(([, b]) => b));
  return { w: W, h: H, focus, cw, ch, back };
};

/** One cover at width w (see the file header). */
const CoverFace: React.FC<{ c: Cover; w: number; kicker?: string; accent: string; light: boolean; view: number; id: string }> = ({ c, w, kicker, accent, light, view, id }) => {
  const h = w * ASPECT;
  const pad = 0.08 * w;
  const bw = w - 2 * pad;
  const { pre, accent: big, post } = coverLines(c);
  const [aL, aC, aH] = toOklch(accent);
  const face = light ? fromLch(0.97, 0.008, aH) : fromLch(0.16, Math.min(0.02, aC), aH);
  const ink = light ? fromLch(0.2, 0.02, aH) : C.white;
  // the accent word in the accent when it reads on the cover, else a lift of it
  const hot = light ? (aL > 0.7 ? fromLch(0.5, aC, aH) : accent) : aL < 0.62 ? fromLch(0.7, Math.min(0.2, aC * 1.05), aH) : accent;
  const pxBig = Math.min(0.3 * w, bw / Math.max(3, big.length * EM));
  const pxPre = Math.min(pxBig * 0.4, bw / Math.max(4, pre.length * EM));
  const pxPost = Math.min(pxBig * 0.52, bw / Math.max(4, post.length * EM));
  /** a line of heavy condensed capitals, justified to the block when its own width is close to it */
  const line = (text: string, px: number, color: string) => {
    if (!text) return null;
    const fit = text.length * EM * px > 0.72 * bw;
    return (
      <svg width={bw} height={px * 0.92} style={{ display: 'block', overflow: 'visible' }}>
        <text x={0} y={px * 0.8} fill={color} {...(fit ? { textLength: bw, lengthAdjust: 'spacingAndGlyphs' } : {})} style={{ fontFamily: THUMB_FACE.family, fontSize: px, fontWeight: THUMB_FACE.weight, fontStretch: THUMB_FACE.stretch, letterSpacing: '-0.01em' }}>
          {text}
        </text>
      </svg>
    );
  };
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: 0.03 * w, overflow: 'hidden', background: `linear-gradient(180deg, ${mixColor(face, C.white, light ? 0 : 0.06)} 0%, ${face} 46%)`, isolation: 'isolate' }}>
      {c.photo && (
        <div style={{ position: 'absolute', left: 0, top: 0.47 * h }}>
          <Picture src={c.photo} w={w} h={0.53 * h} focus={c.focus} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${face} 0%, rgba(0, 0, 0, 0) 34%, rgba(0, 0, 0, 0) 62%, rgba(0, 0, 0, 0.55) 100%)` }} />
        </div>
      )}
      {kicker && (
        <div {...textTag(`${id}-kicker`, 0.042 * w, view)} style={{ position: 'absolute', left: pad, top: 0.055 * h, ...tx(1, 0.042 * w, 700, hot, { track: 0.2 }), textTransform: 'uppercase' }}>
          {kicker}
        </div>
      )}
      <div data-text={`${id}-title`} style={{ position: 'absolute', left: pad, top: 0.13 * h, width: bw, display: 'flex', flexDirection: 'column', gap: 0.012 * w }}>
        {line(pre, pxPre, ink)}
        {line(big, pxBig, hot)}
        {line(post, pxPost, ink)}
      </div>
      {c.sub && (
        <div {...textTag(`${id}-sub`, 0.05 * w, view)} style={{ position: 'absolute', left: pad, bottom: 0.05 * h, ...tx(1, 0.05 * w, 560, c.photo ? 'rgba(255, 255, 255, 0.92)' : mixColor(ink, face, 0.3)) }}>
          {c.sub}
        </div>
      )}
      {/* the spine's shadow and the edge's light: a printed cover, not a card */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0.05 * w, background: `linear-gradient(90deg, rgba(0, 0, 0, ${light ? 0.12 : 0.35}) 0%, rgba(255, 255, 255, ${light ? 0.2 : 0.06}) 45%, rgba(0, 0, 0, 0) 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 0.03 * w, boxShadow: `inset 0 0 0 ${Math.max(1, 0.004 * w).toFixed(2)}px rgba(255, 255, 255, ${light ? 0.5 : 0.1}), inset 0 ${Math.max(1, 0.005 * w).toFixed(2)}px 0 rgba(255, 255, 255, ${light ? 0.9 : 0.14})` }} />
    </div>
  );
};

/** The stack (see the file header). */
export const CoverStack: React.FC<CoverStackProps> = (p) => {
  const { f, fps, pt, view, skin } = useScreen(p);
  useFace(THUMB_FACE.load);
  const L = coverStackLayout(p, f, { pt });
  const { focus } = L;
  const at = p.at ?? 0;
  const light = p.cover === 'light';
  const n = 1 + L.back.length;
  // the back covers land first, the front one last (5 f@60 apart), each rising into place
  const land = (i: number) => prog(f, at + f60x(5 * (n - 1 - i), fps), at + f60x(5 * (n - 1 - i) + 26, fps), E.settleOut);
  const order = Array.from({ length: n }, (_, i) => n - 1 - i);
  return (
    <div data-ui data-screen="cover-stack" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {order.map((i) => {
        const b = focus[`cover${i}`];
        const q = land(i);
        const veil = i === 0 ? 0 : skin.dark ? 0.34 + 0.2 * i : 0.1 * i;
        const w = b.w;
        return (
          <div key={i} {...focusAttr(`cover${i}`)} style={{ position: 'absolute', left: b.x, top: b.y, width: w, height: b.h, opacity: Math.min(1, q * 3), transform: `translateY(${((1 - q) * 0.08 * L.ch).toFixed(2)}px) scale(${(i === 0 ? 1 + 0.03 * (1 - q) : 1).toFixed(4)})`, transformOrigin: '50% 100%', boxShadow: `0 ${(0.05 * w).toFixed(1)}px ${(0.12 * w).toFixed(1)}px ${(-0.02 * w).toFixed(1)}px rgba(0, 0, 0, ${skin.dark ? 0.55 : 0.25}), 0 ${(0.008 * w).toFixed(1)}px ${(0.02 * w).toFixed(1)}px rgba(0, 0, 0, 0.3)`, borderRadius: 0.03 * w }}>
            <CoverFace c={p.items[i]} w={w} kicker={p.kicker} accent={skin.accent} light={light} view={view} id={`cover${i}`} />
            {veil > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: 0.03 * w, background: skin.dark ? `rgba(0, 0, 0, ${veil.toFixed(3)})` : `rgba(255, 255, 255, ${veil.toFixed(3)})` }} />}
          </div>
        );
      })}
      <div {...focusAttr('title')} style={{ position: 'absolute', left: focus.title.x, top: focus.title.y, width: focus.title.w, height: focus.title.h, pointerEvents: 'none' }} />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a CoverStack draws (kit/screens/forms.ts), part -> [form, focus box]: the front cover as a card, the stack as a list, the cover's photo and title. */
export const COVER_STACK_FORMS = { cover: ['card', 'cover'], stack: ['list', 'stack'], photo: ['photo', 'photo'], title: ['word', 'title'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from coverStackLayout. */
export const coverStackForms = (p: CoverStackProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => coverStackLayout(p, f, ctx), COVER_STACK_FORMS, { pt: ctx.pt });
