// ThumbGrid: a channel's, a shop's or a library's grid of real pictures: 16:9 thumbnails (real photos, a bold overlay word
// when the item is a video with a title card), a duration badge, a two-line title, a meta line (views and age, price,
// size) and a menu glyph. Cells land one after another (`reveal`), are read one after another (`scan`: an accent ring
// passes over each and leaves a tick), and one can be picked (`pick`: it lifts, the others step back). On the ground or
// on a card (`card`). Every cell is a focus box, so a camera can travel the grid and land on the picked one.
//
//   <ThumbGrid items={CONTENT.thumbs} cols={3} reveal={{ at: 0 }} scan={{ at: 40 }} tone="dark" />
import React from 'react';
import { C } from '../../brand/tokens';
import { clamp, E, prog } from '../../lib/anim';
import { mixColor, oklch as fromLch, toOklch } from '../../lib/color';
import { f60x } from '../../lib/film';
import { fbox, type Focus, focusAttr, Icon, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, StepMark, textTag, tx, useFace, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type Thumb = {
  src?: string;
  title: string;
  /** "214K views · 4 days ago", "$37 · 56 workouts" */
  meta?: string;
  /** "20:14" */
  duration?: string;
  /** a title card on the picture, two or three words ("FIX THIS") */
  overlay?: string;
  focus?: [number, number];
};

export type ThumbGridProps = ScreenBase & {
  items: Thumb[];
  cols?: number;
  /** the grid's width, px (default 600 points) */
  w?: number;
  /** points between cells */
  gap?: number;
  /** cells land one after another from `at`, `every` frames apart (default 3 f@60) */
  reveal?: { at: number; every?: number };
  /** each cell is read in turn from `at`, `every` frames apart (default 7 f@60): a ring passes over it and leaves a tick */
  scan?: { at: number; every?: number };
  /** the picked cell lifts and the rest step back from `at` */
  pick?: { at: number; index: number };
  /** draw the grid on a card (default: on the ground) */
  card?: boolean;
  aspect?: number;
};

const T = { title: 15, meta: 13, lines: 2 } as const;

/** The grid's size and focus boxes: grid, cell{i}, thumb{i}, title{i}. */
export const thumbGridLayout = (p: ThumbGridProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { cell: { tw: number; th: number; rowH: number; pad: number; lines: string[][] } } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const cols = Math.max(1, p.cols ?? 3);
  const pad = p.card ? 22 * pt : 0;
  const W = p.w ?? 600 * pt;
  const gap = (p.gap ?? 16) * pt;
  const tw = (W - 2 * pad - gap * (cols - 1)) / cols;
  const th = tw / (p.aspect ?? 16 / 9);
  const lines = p.items.map((it) => wrapText(it.title, T.title * pt, 520, tw - 26 * pt).slice(0, 3));
  const rows = Math.ceil(p.items.length / cols);
  const lh = T.title * pt * 1.3;
  const rowLines = Array.from({ length: rows }, (_, r) => Math.max(1, ...lines.slice(r * cols, r * cols + cols).map((l) => l.length)));
  const focus: Focus = {};
  let y = pad;
  for (let r = 0; r < rows; r++) {
    const textH = 10 * pt + rowLines[r] * lh + 4 * pt + T.meta * pt * 1.35;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= p.items.length) break;
      const x = pad + c * (tw + gap);
      focus[`cell${i}`] = fbox(x, y, tw, th + textH, T.title * pt, SCREEN.radius.thumb * pt);
      focus[`thumb${i}`] = fbox(x, y, tw, th, undefined, SCREEN.radius.thumb * pt);
      focus[`title${i}`] = fbox(x, y + th + 10 * pt, tw - 26 * pt, lines[i].length * lh, T.title * pt);
    }
    y += th + textH + gap * 1.4;
  }
  const H = y - gap * 1.4 + pad;
  focus.grid = fbox(0, 0, W, H, T.title * pt);
  return { w: W, h: H, focus, cell: { tw, th, rowH: 0, pad, lines } };
};

/**
 * The face a thumbnail's title card is set in: a heavy condensed grotesque (Mona Sans, bundled in public/fonts), the
 * creator's own thumbnail type, never the film's voice. `load` is the shorthand useFace() waits for.
 */
export const THUMB_FACE = { family: '"Mona Sans Variable", "Inter Variable", system-ui, sans-serif', weight: 900, stretch: '75%', load: '900 16px "Mona Sans Variable"' } as const;

/**
 * A thumbnail's title card: two or three words in heavy condensed capitals, upright (a lean on type is a faux italic),
 * white over a hard drop and a soft halo, the last line in a light tint of the accent; sized so its longest line spans
 * about 80 % of the picture, set in the upper half where creators put it.
 */
export const ThumbTitle: React.FC<{ text: string; w: number; h: number; accent: string }> = ({ text, w, h, accent }) => {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  // one line when it fits at a good size, else two balanced lines
  const oneLine = words.join(' ');
  const split = words.length > 1 && oneLine.length > 9 ? Math.ceil(words.length / 2) : words.length;
  const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')].filter(Boolean);
  const longest = Math.max(...lines.map((l) => l.length));
  const px = Math.min(h * (lines.length > 1 ? 0.3 : 0.4), (w * 0.8) / Math.max(3, longest * 0.5));
  const tint = mixColor(accent, C.white, 0.45);
  return (
    <div style={{ position: 'absolute', left: w * 0.05, right: w * 0.05, top: h * 0.1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px * 0.02 }}>
      {lines.map((ln, li) => (
        <span key={li} style={{ fontFamily: THUMB_FACE.family, fontSize: px, fontWeight: THUMB_FACE.weight, fontStretch: THUMB_FACE.stretch, letterSpacing: '-0.01em', lineHeight: 0.92, whiteSpace: 'pre', color: li === lines.length - 1 && lines.length > 1 ? tint : C.white, textShadow: `${(px * 0.035).toFixed(1)}px ${(px * 0.06).toFixed(1)}px 0 rgba(0, 0, 0, 0.62), 0 0 ${(px * 0.35).toFixed(1)}px rgba(0, 0, 0, 0.5)` }}>
          {ln}
        </span>
      ))}
    </div>
  );
};

/** The grid (see the file header). */
export const ThumbGrid: React.FC<ThumbGridProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  useFace(THUMB_FACE.load);
  const L = thumbGridLayout(p, f, { pt });
  const { focus } = L;
  const { tw, th, lines } = L.cell;
  const r = SCREEN.radius.thumb * pt;
  const every = p.reveal?.every ?? f60x(3, fps);
  const scanEvery = p.scan?.every ?? f60x(7, fps);
  const pick = p.pick ? prog(f, p.pick.at, p.pick.at + f60x(26, fps), E.snapOut) : 0;
  const [, aC, aH] = toOklch(skin.accent);
  const poster = (i: number) => `linear-gradient(160deg, ${fromLch(skin.dark ? 0.36 : 0.6, Math.min(0.07, aC), aH + ((i % 3) - 1) * 12)} 0%, ${fromLch(skin.dark ? 0.18 : 0.4, Math.min(0.06, aC), aH + ((i % 3) - 1) * 12)} 100%)`;
  const cells = p.items.map((it, i) => {
    const c = focus[`cell${i}`];
    const t = focus[`title${i}`];
    const enter = p.reveal ? prog(f, p.reveal.at + i * every, p.reveal.at + i * every + f60x(24, fps), E.snapOut) : 1;
    const s0 = p.scan ? p.scan.at + i * scanEvery : Infinity;
    const reading = p.scan ? clamp((f - s0) / scanEvery) : 0;
    const read = p.scan ? prog(f, s0 + scanEvery * 0.7, s0 + scanEvery * 0.7 + f60x(12, fps), E.snapOut) : 0;
    const picked = p.pick?.index === i;
    const dim = p.pick && !picked ? 1 - 0.62 * pick : 1;
    const lift = picked ? 1 + 0.05 * pick : 1;
    return (
      <div key={i} {...focusAttr(`cell${i}`)} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, opacity: enter * dim, transform: `translateY(${((1 - enter) * 22 * pt).toFixed(2)}px) scale(${lift.toFixed(4)})`, transformOrigin: '50% 30%' }}>
        <div {...focusAttr(`thumb${i}`)} style={{ position: 'relative', width: tw, height: th, borderRadius: r, boxShadow: skin.dark ? '0 10px 30px -12px rgba(0, 0, 0, 0.7)' : '0 10px 26px -14px rgba(0, 0, 0, 0.35)' }}>
          {it.src ? (
            <Picture src={it.src} w={tw} h={th} r={r} focus={it.focus}>
              {it.overlay && <ThumbTitle text={it.overlay} w={tw} h={th} accent={skin.accent} />}
            </Picture>
          ) : (
            <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: poster(i), overflow: 'hidden' }}>{it.overlay && <ThumbTitle text={it.overlay} w={tw} h={th} accent={skin.accent} />}</div>
          )}
          <div style={{ position: 'absolute', inset: 0, borderRadius: r, boxShadow: `inset 0 0 0 ${Math.max(1, 0.6 * pt).toFixed(2)}px ${skin.dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}` }} />
          {it.duration && (
            <div style={{ position: 'absolute', right: 8 * pt, bottom: 8 * pt, padding: `${2 * pt}px ${5 * pt}px`, borderRadius: 5 * pt, background: 'rgba(0, 0, 0, 0.72)' }}>
              <span style={tx(12, pt, 600, C.white, { track: 0.01, lead: 1.15 })} {...textTag(`duration${i}`, 12 * pt, view)}>{it.duration}</span>
            </div>
          )}
          {p.scan && reading > 0 && reading < 1 && <div style={{ position: 'absolute', inset: -3 * pt, borderRadius: r + 3 * pt, boxShadow: `0 0 0 ${(2.5 * pt).toFixed(1)}px ${skin.accent}, 0 0 ${(18 * pt).toFixed(1)}px ${mixColor(skin.accent, C.white, 0.2)}` }} />}
          {p.scan && read > 0 && (
            <div style={{ position: 'absolute', left: 8 * pt, top: 8 * pt, opacity: read, transform: `scale(${(0.7 + 0.3 * read).toFixed(3)})` }}>
              <StepMark skin={skin} f={f} fps={fps} size={22 * pt} state="done" p={read} />
            </div>
          )}
        </div>
        <div {...focusAttr(`title${i}`)} {...textTag(`title${i}`, T.title * pt, view)} style={{ position: 'absolute', left: 0, top: t.y - c.y, width: t.w, ...tx(T.title, pt, 520, skin.text, { lead: 1.3 }) }}>
          {lines[i].join('\n')}
        </div>
        {it.meta && (
          <div {...textTag(`meta${i}`, T.meta * pt, view)} style={{ position: 'absolute', left: 0, top: t.y - c.y + t.h + 4 * pt, ...tx(T.meta, pt, 450, skin.mute) }}>
            {it.meta}
          </div>
        )}
        <div style={{ position: 'absolute', right: -4 * pt, top: t.y - c.y + 1 * pt }}>
          <Icon name="kebab" size={20 * pt} color={skin.mute} weight="bold" />
        </div>
      </div>
    );
  });
  return (
    <div data-ui data-screen="thumb-grid" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      {p.card ? (
        <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.panel * pt} u={u} backdrop={p.backdrop} focus="grid">
          {cells}
        </Panel>
      ) : (
        cells
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a ThumbGrid draws (kit/screens/forms.ts), part -> [form, focus box]: the grid as a list, the picked thumbnail as a photo, its cell as a card, its title. */
export const THUMB_GRID_FORMS = { grid: ['list', 'grid'], thumb: ['photo', 'thumb0'], cell: ['card', 'cell0'], title: ['word', 'title0'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from thumbGridLayout; row, card or cell: the picked cell (pick.index), else the first. */
export const thumbGridForms = (p: ThumbGridProps, ctx: { pt?: number } = {}): ScreenForms => {
  const i = p.pick?.index ?? 0;
  return screenForms((f) => thumbGridLayout(p, f, ctx), { ...THUMB_GRID_FORMS, ...({ thumb: ['photo', `thumb${i}`], cell: ['card', `cell${i}`], title: ['word', `title${i}`] } as const) }, { pt: ctx.pt });
};
