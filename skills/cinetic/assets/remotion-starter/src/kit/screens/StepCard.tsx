// StepCard: the product doing a job in steps: a header (the thing being made: its picture or mark, a title, one line of
// facts) and the steps under it, each pending (a faint ring, its label pale), active (a spinner, its label typing on) and
// done (a disc whose tick draws on) at its own frame. ProgressPill: one live line on the accent ("Creating your product ·
// 52%"): a spinner and a number counting on linearly, still counting when the shot cuts.
//
//   <StepCard title="The Weeknight Bread Handbook" sub="Ebook · 64 pages" thumb={...} steps={[{ label: 'Recipes put in order', at: 30 }, ...]} />
//   <ProgressPill label="Creating your product · {n}%" to={52} at={0} dur={90} />
import React from 'react';
import { C } from '../../brand/tokens';
import { E, fd, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import type { IconName } from '../icons';
import type { LogoRef } from '../logos';
import { fbox, type Focus, focusAttr, Mark, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, smallShadow, Spinner, StepMark, textTag, textW, tx, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type Step = { label: string; /** the frame it is done */ at?: number; meta?: string };

export type StepCardProps = ScreenBase & {
  title: string;
  sub?: string;
  /** a picture of the thing being made, else its mark or a glyph */
  thumb?: string;
  logo?: LogoRef;
  glyph?: IconName;
  steps: Step[];
  /** the frame the first step starts (default 0) */
  start?: number;
  /** a step without its own `at` is done `every` frames after the one before (default 0.8 s) */
  every?: number;
  /** the active step's label types on (default true) */
  type?: boolean;
  w?: number;
};

const T = { title: 20, sub: 15, step: 17, thumb: 64, mark: 20, row: 36 } as const;

/** The frame step i is done: its own `at`, else `every` after the one before (from `start`). */
export const stepDoneAt = (p: Pick<StepCardProps, 'steps' | 'start' | 'every'>, i: number, fps = 30): number => {
  const own = p.steps[i]?.at;
  if (own !== undefined) return own;
  const before = i === 0 ? p.start ?? 0 : stepDoneAt(p, i - 1, fps);
  return before + (p.every ?? 0.8 * fps);
};

const stateOf = (p: StepCardProps, i: number, f0: number, fps = 30) => {
  const f = fd(f0); // a step's state is discrete: decided on the whole frame
  if (f >= stepDoneAt(p, i, fps)) return 'done' as const;
  const from = i === 0 ? p.start ?? 0 : stepDoneAt(p, i - 1, fps);
  return f >= from ? ('active' as const) : ('pending' as const);
};

/** The card's size and focus boxes at frame f: card, thumb, title, step{i}, active (the step in progress, else the last). */
export const stepCardLayout = (p: StepCardProps, f: number, ctx: { pt?: number; fps?: number } = {}): ScreenLayout & { titleLines: string[]; headH: number } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const fps = ctx.fps ?? 30;
  const W = p.w ?? 520 * pt;
  const pad = 24 * pt;
  const textX = pad + (T.thumb + 16) * pt;
  const titleLines = wrapText(p.title, T.title * pt, 620, W - textX - pad).slice(0, 2);
  const headH = Math.max(T.thumb * pt, titleLines.length * T.title * pt * 1.18 + (p.sub ? 6 * pt + T.sub * pt * 1.3 : 0));
  const focus: Focus = {
    thumb: fbox(pad, pad, T.thumb * pt, T.thumb * pt, undefined, 14 * pt),
    title: fbox(textX, pad, Math.max(...titleLines.map((l) => textW(l, T.title * pt, 620))), titleLines.length * T.title * pt * 1.18, T.title * pt),
  };
  let y = pad + headH + 22 * pt;
  p.steps.forEach((_, i) => {
    focus[`step${i}`] = fbox(pad - 6 * pt, y, W - 2 * pad + 12 * pt, T.row * pt, T.step * pt, 10 * pt);
    y += T.row * pt;
  });
  const firstActive = p.steps.findIndex((_, i) => stateOf(p, i, f, fps) === 'active');
  focus.active = focus[`step${firstActive >= 0 ? firstActive : p.steps.length - 1}`];
  const H = y + pad - 6 * pt;
  focus.card = fbox(0, 0, W, H, T.step * pt, SCREEN.radius.panel * pt);
  return { w: W, h: H, focus, titleLines, headH };
};

/** The card (see the file header). */
export const StepCard: React.FC<StepCardProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = stepCardLayout(p, f, { pt, fps });
  const { focus } = L;
  const pad = 24 * pt;
  return (
    <div data-ui data-screen="step-card" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.panel * pt} u={u} lift={0.3} backdrop={p.backdrop} focus="card">
        <div {...focusAttr('thumb')} style={{ position: 'absolute', left: focus.thumb.x, top: focus.thumb.y }}>
          {p.thumb ? <Picture src={p.thumb} w={focus.thumb.w} h={focus.thumb.h} r={14 * pt} /> : <Mark skin={skin} size={focus.thumb.w} logo={p.logo} glyph={p.glyph ?? 'package'} />}
        </div>
        <div {...focusAttr('title')} {...textTag('step-title', T.title * pt, view)} style={{ position: 'absolute', left: focus.title.x, top: focus.title.y, ...tx(T.title, pt, 620, skin.text, { lead: 1.18 }) }}>
          {L.titleLines.join('\n')}
        </div>
        {p.sub && (
          <div {...textTag('step-sub', T.sub * pt, view)} style={{ position: 'absolute', left: focus.title.x, top: focus.title.y + focus.title.h + 6 * pt, ...tx(T.sub, pt, 450, skin.mute) }}>
            {p.sub}
          </div>
        )}
        <div style={{ position: 'absolute', left: pad, right: pad, top: pad + L.headH + 11 * pt, height: Math.max(1, 0.6 * pt), background: skin.line, opacity: 0.8 }} />
        {p.steps.map((s, i) => {
          const b = focus[`step${i}`];
          const st = stateOf(p, i, f, fps);
          const from = i === 0 ? p.start ?? 0 : stepDoneAt(p, i - 1, fps);
          const doneAt = stepDoneAt(p, i, fps);
          const typeOn = p.type !== false && st === 'active' ? Math.min(s.label.length, Math.floor(((fd(f) - from) / fps) * 34)) : s.label.length;
          const tick = st === 'done' ? prog(f, doneAt, doneAt + f60x(10, fps), E.snapOut) : 0;
          const col = st === 'pending' ? mixColor(skin.faint, skin.mute, 0.45) : st === 'active' ? mixColor(skin.text, skin.mute, 0.15) : skin.text;
          return (
            <div key={i} {...focusAttr(`step${i}`)} style={{ position: 'absolute', left: b.x + 6 * pt, top: b.y, height: b.h, display: 'flex', alignItems: 'center', gap: 12 * pt }}>
              <StepMark skin={skin} f={f} fps={fps} size={T.mark * pt} state={st} p={tick} />
              <span {...textTag(`step${i}`, T.step * pt, view)} style={tx(T.step, pt, st === 'done' ? 500 : 450, col)}>
                {s.label.slice(0, typeOn)}
                {typeOn < s.label.length && <span style={{ color: skin.faint, opacity: 0.0 }}>{s.label.slice(typeOn)}</span>}
              </span>
              {s.meta && st === 'done' && <span style={{ ...tx(13, pt, 450, skin.faint), opacity: tick }} {...textTag(`step-meta${i}`, 13 * pt, view)}>{s.meta}</span>}
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

export type ProgressPillProps = ScreenBase & {
  /** `{n}` is replaced by the running number */
  label: string;
  from?: number;
  to: number;
  at?: number;
  dur?: number;
  /** the pill on the accent (default) or on the skin's face */
  solid?: boolean;
};

/** The pill's size and focus box. */
export const progressPillLayout = (p: ProgressPillProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout => {
  const pt = ctx.pt ?? SCREEN.pt;
  const w = textW(p.label.replace('{n}', String(Math.max(p.to, p.from ?? 0))), 16 * pt, 560) + 76 * pt;
  const h = 44 * pt;
  return { w, h, focus: { pill: fbox(0, 0, w, h, 16 * pt, h / 2) } };
};

/** One live line on a pill (see the file header). */
export const ProgressPill: React.FC<ProgressPillProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = progressPillLayout(p, f, { pt });
  const n = Math.round((p.from ?? 0) + (p.to - (p.from ?? 0)) * prog(fd(f), p.at ?? 0, (p.at ?? 0) + (p.dur ?? 3 * fps), E.linear));
  const solid = p.solid !== false;
  const bg = solid ? skin.solid : skin.face;
  const ink = solid ? skin.accentInk : skin.text;
  return (
    <div data-ui data-screen="progress-pill" {...focusAttr('pill')} style={{ position: 'relative', width: L.w, height: L.h, borderRadius: L.h / 2, background: `linear-gradient(180deg, ${mixColor(bg, C.white, 0.16)} 0%, ${bg} 100%)`, boxShadow: smallShadow(skin, u, 1.6), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 * pt, ...p.style }}>
      <Spinner f={f} fps={fps} size={18 * pt} color={ink} track={solid ? 'rgba(255, 255, 255, 0.25)' : skin.well} />
      <span {...textTag('progress', 16 * pt, view)} style={tx(16, pt, 560, ink)}>{p.label.replace('{n}', String(n))}</span>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a StepCard draws (kit/screens/forms.ts), part -> [form, focus box]: the card, its active step row (a notice), its thumbnail as a chip, its title. */
export const STEP_CARD_FORMS = { card: ['card', 'card'], row: ['notice', 'active'], chip: ['chip', 'thumb'], title: ['word', 'title'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from stepCardLayout. */
export const stepCardForms = (p: StepCardProps, ctx: { pt?: number; fps?: number } = {}): ScreenForms => screenForms((f) => stepCardLayout(p, f, ctx), STEP_CARD_FORMS, { pt: ctx.pt });

/** The forms a ProgressPill draws: the pill. */
export const PROGRESS_PILL_FORMS = { pill: ['pill', 'pill'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the pill's px), from progressPillLayout. */
export const progressPillForms = (p: ProgressPillProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => progressPillLayout(p, f, ctx), PROGRESS_PILL_FORMS, { pt: ctx.pt });
