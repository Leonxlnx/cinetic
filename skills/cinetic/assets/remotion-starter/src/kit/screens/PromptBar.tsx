// PromptBar: the big input pill, typed as a person types. A plus button, the request typed on a human cadence (the newest
// word arrives in the accent and settles to ink), a caret that is solid while typing and blinks at rest, the text
// scrolling left with a soft edge once it outgrows the field, a mic, an optional model chip, an optional file dropped in
// above the text, and the round send button that wakes when there is text and is pressed on `send`.
// Built for a macro move along the field as it types: promptBarLayout() gives the caret, the newest word, the send button
// and the rest as focus boxes for any frame, so a camera can ride the caret and land on the send button.
//
//   <PromptBar text="Move my two o'clock and tell the team" at={12} send={96} tone="light" />
import React from 'react';
import { C } from '../../brand/tokens';
import { clamp, E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import { Caret, caretOn, fbox, type Focus, focusAttr, Icon, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, textTag, textW, tx, useScreen } from './base';
import { typedAt, wordInk, wordsOf } from './typing';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type PromptAttach = { name: string; meta?: string; src?: string; kind?: 'pdf' | 'doc' | 'image' | 'sheet' | 'code' | 'audio' | 'video' | 'file' };

export type PromptBarProps = ScreenBase & {
  /** the request, typed from `at` */
  text: string;
  at?: number;
  /** characters a second (default 24, a fluent typist), with a human cadence */
  cps?: number;
  seed?: string;
  /** shown in the faint ink until the first key ("Ask anything", "Message your assistant") */
  placeholder?: string;
  /** width in px (default 640 points) */
  w?: number;
  size?: 'md' | 'lg';
  plus?: boolean;
  mic?: boolean;
  /** a model or mode chip left of the mic ("GPT-5.3", "Deep research") */
  model?: string;
  /** a file in the request: drops in above the text at `attachAt` */
  attach?: PromptAttach | null;
  attachAt?: number;
  /** the frame the send button is pressed */
  send?: number;
  /** the newest word arrives in the accent and settles to ink (default true) */
  ink?: boolean;
  caret?: boolean;
};

const KIND_GLYPH: Record<NonNullable<PromptAttach['kind']>, IconName> = { pdf: 'filePdf', doc: 'doc', image: 'image', sheet: 'table', code: 'code', audio: 'wave', video: 'video', file: 'file' };

/** The press of a button at frame `at`: q 0..1 (down 9 f@60 on snapOut, held 3, back 10 on buildIn) and a ring 0..1 after it. */
export const pressAt = (f: number, at: number | undefined, fps: number) => {
  if (at === undefined) return { q: 0, ring: 0 };
  const d = f60x(9, fps);
  const h = f60x(3, fps);
  const r = f60x(10, fps);
  const q = f < at ? 0 : f < at + d ? prog(f, at, at + d, E.snapOut) : f < at + d + h ? 1 : 1 - prog(f, at + d + h, at + d + h + r, E.buildIn);
  const ring = prog(f, at + d, at + d + f60x(30, fps), E.softOut);
  return { q: clamp(q), ring: f >= at + d ? ring : 0 };
};

/** The bar's geometry (points) for its size. */
const geo = (p: PromptBarProps) => {
  const lg = p.size === 'lg';
  const H = lg ? 68 : 60;
  return { H, font: lg ? 22 : 20, plusD: lg ? 44 : 40, sendD: H - 16, pad: 10, chipH: 56, top: 14 };
};

/**
 * The bar's size and focus boxes at frame `f`: bar, text (the typed text in view), caret, word (the newest word), send,
 * plus, mic, model, attach. `ctx.pt` px per point (default SCREEN.pt), `ctx.fps` (default 30). Needs the loaded font (a
 * component under FontGate) for exact text widths.
 */
export const promptBarLayout = (p: PromptBarProps, f: number, ctx: { pt?: number; fps?: number } = {}): ScreenLayout & { scroll: number; typed: ReturnType<typeof typedAt> } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const fps = ctx.fps ?? 30;
  const g = geo(p);
  const W = p.w ?? 640 * pt;
  const plus = p.plus !== false;
  const mic = p.mic !== false;
  const attach = !!p.attach;
  const top = attach ? (g.top + g.chipH + 4) * pt : 0;
  const H = top + g.H * pt;
  const cy = top + (g.H * pt) / 2;
  const font = g.font * pt;
  const sendD = g.sendD * pt;
  const sendX = W - 8 * pt - sendD;
  const micS = 24 * pt;
  const micX = sendX - 16 * pt - micS;
  const modelW = p.model ? textW(p.model, 14 * pt, 520) + 40 * pt : 0;
  const modelX = (mic ? micX - 12 * pt : sendX - 14 * pt) - modelW;
  const textX = plus ? (g.pad + g.plusD + 12) * pt : 24 * pt;
  const textRight = (p.model ? modelX : mic ? micX : sendX) - 16 * pt;
  const areaW = Math.max(40 * pt, textRight - textX);
  const typed = typedAt(p.text, f, { at: p.at, cps: p.cps, fps, seed: p.seed ?? p.text });
  const tw = textW(typed.shown, font, 450);
  const caretW = Math.max(2, 2 * pt);
  const scroll = Math.max(0, tw + caretW + 10 * pt - areaW);
  const words = wordsOf(typed.shown);
  const last = words[words.length - 1];
  const lineH = font * 1.3;
  const focus: Focus = {
    bar: fbox(0, 0, W, H, font, attach ? 28 * pt : H / 2),
    text: fbox(textX, cy - lineH / 2, Math.min(areaW, Math.max(caretW, tw - scroll)), lineH, font),
    caret: fbox(textX + tw - scroll + 1 * pt, cy - font * 0.6, caretW, font * 1.2, font),
    word: last ? fbox(textX + textW(typed.shown.slice(0, last.start), font, 450) - scroll, cy - lineH / 2, textW(last.text.trimEnd(), font, 450), lineH, font) : fbox(textX, cy - lineH / 2, caretW, lineH, font),
    send: fbox(sendX, cy - sendD / 2, sendD, sendD, undefined, sendD / 2),
  };
  if (plus) focus.plus = fbox(g.pad * pt, cy - (g.plusD * pt) / 2, g.plusD * pt, g.plusD * pt, undefined, (g.plusD * pt) / 2);
  if (mic) focus.mic = fbox(micX, cy - micS / 2, micS, micS);
  if (p.model) focus.model = fbox(modelX, cy - 17 * pt, modelW, 34 * pt, 14 * pt, 17 * pt);
  if (attach && p.attach) {
    const cw = Math.min(W - 28 * pt, Math.max(textW(p.attach.name, 15 * pt, 560), textW(p.attach.meta ?? '', 12 * pt, 450)) + 76 * pt);
    focus.attach = fbox(g.top * pt, g.top * pt, cw, g.chipH * pt, 15 * pt, 14 * pt);
  }
  return { w: W, h: H, focus, scroll, typed };
};

/** The big input pill (see the file header). */
export const PromptBar: React.FC<PromptBarProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = promptBarLayout(p, f, { pt, fps });
  const g = geo(p);
  const { typed, scroll, focus } = L;
  const font = g.font * pt;
  const t = f - (p.at ?? 0);
  const has = typed.n > 0;
  const wake = has ? prog(t, typed.keys[0], typed.keys[0] + f60x(10, fps), E.snapOut) : 0;
  const press = pressAt(f, p.send, fps);
  const sendBg = mixColor(skin.well, skin.solid, wake);
  const arrow = mixColor(skin.faint, skin.accentInk, wake);
  const ink = p.ink !== false;
  const words = wordsOf(typed.shown);
  const text = focus.text;
  const s = focus.send;
  const at = p.attachAt ?? (p.at ?? 0) - f60x(24, fps);
  const chipIn = prog(f, at, at + f60x(26, fps), E.snapOut);
  const fade = scroll > 0 ? `linear-gradient(90deg, transparent 0, black ${(28 * pt).toFixed(1)}px)` : undefined;
  const placeholder = !has && p.placeholder;
  return (
    <div data-ui data-screen="prompt-bar" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={focus.bar.r ?? L.h / 2} u={u} lift={0.25} backdrop={p.backdrop} focus="bar">
        {focus.attach && p.attach && (
          <div {...focusAttr('attach')} style={{ position: 'absolute', left: focus.attach.x, top: focus.attach.y, width: focus.attach.w, height: focus.attach.h, borderRadius: 14 * pt, background: skin.well, boxShadow: `inset 0 0 0 ${Math.max(1, pt * 0.6).toFixed(2)}px ${skin.rim}`, opacity: chipIn, transform: `translateY(${((1 - chipIn) * -10 * pt).toFixed(2)}px) scale(${(0.96 + 0.04 * chipIn).toFixed(4)})`, transformOrigin: 'left center' }}>
            <div style={{ position: 'absolute', left: 10 * pt, top: 10 * pt }}>
              {p.attach.src ? (
                <Picture src={p.attach.src} w={36 * pt} h={36 * pt} r={9 * pt} />
              ) : (
                <div style={{ width: 36 * pt, height: 36 * pt, borderRadius: 9 * pt, background: skin.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={KIND_GLYPH[p.attach.kind ?? 'file']} size={20 * pt} color={skin.accentInk} weight="fill" />
                </div>
              )}
            </div>
            <div style={{ position: 'absolute', left: 56 * pt, top: 10 * pt, ...tx(15, pt, 560, skin.text) }} {...textTag('attach-name', 15 * pt, view)}>{p.attach.name}</div>
            {p.attach.meta && <div style={{ position: 'absolute', left: 56 * pt, top: 30 * pt, ...tx(12, pt, 450, skin.mute) }} {...textTag('attach-meta', 12 * pt, view)}>{p.attach.meta}</div>}
          </div>
        )}
        {focus.plus && (
          <div {...focusAttr('plus')} style={{ position: 'absolute', left: focus.plus.x, top: focus.plus.y, width: focus.plus.w, height: focus.plus.h, borderRadius: '50%', background: skin.dark ? 'rgba(255, 255, 255, 0.06)' : skin.well, boxShadow: `inset 0 0 0 ${Math.max(1, pt * 0.6).toFixed(2)}px ${skin.rim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={focus.plus.w * 0.5} color={skin.mute} />
          </div>
        )}
        {/* the text field: the typed words (the newest in the accent), the caret, the soft edge once it scrolls */}
        <div style={{ position: 'absolute', left: text.x, top: text.y, width: (focus.model?.x ?? focus.mic?.x ?? s.x) - 16 * pt - text.x, height: text.h, overflow: 'hidden', WebkitMaskImage: fade, maskImage: fade }}>
          <div {...focusAttr('text')} {...textTag('prompt', font, view)} style={{ position: 'absolute', left: -scroll, top: 0, height: text.h, display: 'flex', alignItems: 'center', ...tx(g.font, pt, 450, skin.text, { lead: 1.3 }) }}>
            {placeholder && p.caret !== false && <Caret h={font * 1.16} w={focus.caret.w} color={skin.dark ? skin.text : mixColor(skin.text, skin.accent, 0.35)} on={caretOn(typed.since, fps)} style={{ marginRight: 2 * pt }} />}
            {placeholder ? (
              <span style={{ color: skin.faint }}>{p.placeholder}</span>
            ) : (
              words.map((w, i) => {
                const k = ink ? wordInk(words[i + 1] ? typed.keys[words[i + 1].start] : undefined, t, fps) : 1;
                return (
                  <span key={i} style={{ color: mixColor(skin.accentText, skin.text, k) }}>
                    {w.text}
                  </span>
                );
              })
            )}
            {!placeholder && p.caret !== false && <Caret h={font * 1.16} w={focus.caret.w} color={skin.dark ? skin.text : mixColor(skin.text, skin.accent, 0.35)} on={caretOn(typed.since, fps)} style={{ marginLeft: 1 * pt }} />}
          </div>
        </div>
        {focus.model && p.model && (
          <div {...focusAttr('model')} style={{ position: 'absolute', left: focus.model.x, top: focus.model.y, width: focus.model.w, height: focus.model.h, borderRadius: focus.model.h / 2, boxShadow: `inset 0 0 0 ${Math.max(1, pt * 0.6).toFixed(2)}px ${skin.rim}`, display: 'flex', alignItems: 'center', gap: 6 * pt, paddingLeft: 14 * pt, boxSizing: 'border-box' }}>
            <span style={tx(14, pt, 520, skin.mute)} {...textTag('model', 14 * pt, view)}>{p.model}</span>
            <Icon name="caretDown" size={13 * pt} color={skin.faint} weight="bold" />
          </div>
        )}
        {focus.mic && (
          <div {...focusAttr('mic')} style={{ position: 'absolute', left: focus.mic.x, top: focus.mic.y }}>
            <Icon name="mic" size={focus.mic.w} color={skin.mute} />
          </div>
        )}
        <div {...focusAttr('send')} style={{ position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h }}>
          {press.ring > 0 && press.ring < 1 && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `0 0 0 ${(press.ring * 10 * pt).toFixed(2)}px ${mixColor(skin.accent, skin.face, 0.35)}`, opacity: 1 - press.ring }} />}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `linear-gradient(180deg, ${mixColor(sendBg, C.white, 0.14 * wake)} 0%, ${sendBg} 100%)`, boxShadow: wake > 0.02 ? smallShadow(skin, u, 1.2) : `inset 0 0 0 ${Math.max(1, pt * 0.6).toFixed(2)}px ${skin.rim}`, transform: `scale(${(1 - 0.12 * press.q).toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrowUp" size={s.w * 0.46} color={arrow} weight="bold" />
          </div>
        </div>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a PromptBar draws (kit/screens/forms.ts), part -> [form, focus box]: the input as a pill, its send button, the caret and the newest word, the plus button, a model or file chip. */
export const PROMPT_BAR_FORMS = { pill: ['pill', 'bar'], send: ['button', 'send'], caret: ['word', 'caret'], word: ['word', 'word'], plus: ['button', 'plus'], model: ['chip', 'model'], attach: ['chip', 'attach'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from promptBarLayout. */
export const promptBarForms = (p: PromptBarProps, ctx: { pt?: number; fps?: number } = {}): ScreenForms => screenForms((f) => promptBarLayout(p, f, ctx), PROMPT_BAR_FORMS, { pt: ctx.pt });
