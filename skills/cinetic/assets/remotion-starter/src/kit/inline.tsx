// Objects inside a line of type: the thing a sentence names, set in the sentence at 1.0 cap height, so type and
// product share one shot ("Notes from [mark] in thirty seconds", "Ask [chip] anything"). Every part is a pure function
// of its props and `frame`:
//   InlineObject  a slot inside a line: a real mark (scripts/logos.mjs), a glyph (kit/icons.ts), a chip or a small UI
//                 piece drawn in code, at 1.0 cap height on the baseline; every `every` frames the objects roll one
//                 slot up as one strip over 16 f (60 fps frames) on E.glideOut, clipped to the cap box, and the line
//                 re-flows round the slot's width while it rolls (`fit: 'each'`) or keeps the widest (`fit: 'max'`)
//   ObjectLine    a whole sentence with the slot in it ("[]" marks the place): its words and the slot arrive as one
//                 line on the crisp entry (hero lines, the default) or the calm one (fx/TypePresets crispWords,
//                 calmWords), the slot as a word; the swaps start once the slot has landed. The default for a
//                 template's promise line.
// InlineLogo (kit/logos.tsx) is the marks-only form. A product, source or model the sentence names is its real mark;
// a glyph only for a generic action; a chip for a state or a short label.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { FONT, TEXT_MIN, TYPE, U } from '../brand/tokens';
import { calmWords, crispWords } from '../fx/TypePresets';
import { wordFrames, wordState, type WordsSpec } from '../fx/Words';
import { E, mix } from '../lib/anim';
import { TYPE_BANDS, TYPE_WIDTH } from '../lib/Audit';
import { type FilmCtx, fpsOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { capHeight, type Ground, inlineLogoState, logoFile, logoOf, type LogoRef } from './logos';
import { face, Glyph, type GlyphStyle } from './parts';
import type { GlyphName } from './sample';
import { type KitTheme, kitTheme } from './theme';

/** One object of a slot. A plain string is a mark's slug (src/logos.ts). */
export type InlineItem =
  | { kind: 'logo'; logo: LogoRef; mono?: boolean }
  | { kind: 'glyph'; name: GlyphName; variant?: GlyphStyle; color?: string }
  | { kind: 'chip'; label: string; logo?: LogoRef; glyph?: GlyphName; on?: boolean }
  | { kind: 'ui'; aspect: number; draw: (cap: number) => React.ReactNode }; // a small UI piece drawn at cap height, `aspect` wide
export type InlineRef = InlineItem | string;

/** House numbers: 60 fps frames; sizes as shares of the cap height. */
export const INLINE = { every60: 48, swap60: 16, pitch: 1.2, clip: 0.06, maxAspect: 1.6, glyphInk: 0.82, maxWidth: 0.84, chip: { label: 0.5, pad: 0.42, gap: 0.22, mark: 0.56 } } as const;

const itemOf = (r: InlineRef): InlineItem => (typeof r === 'string' ? { kind: 'logo', logo: r } : r);

/**
 * A chip's height and label size at cap height `cap`: the pill is the cap height with its label at half of it, until the
 * label would fall under TEXT_MIN (a line under about 100 px): then the label holds at TEXT_MIN and the pill grows round
 * it, centred on the cap box (a pill a little taller than the caps reads as a pill, not as a misfit).
 */
export const chipSize = (cap: number) => {
  const label = Math.max(cap * INLINE.chip.label, TEXT_MIN * U);
  return { h: Math.max(cap, label / INLINE.chip.label), label };
};
/** The height an object takes at cap height `cap` (a chip may be taller than the caps). */
const heightOf = (it: InlineItem, cap: number) => (it.kind === 'chip' ? chipSize(cap).h : cap);

/** The width of an object at cap height `cap` (px); `measure` sizes a chip's label (the real font under FontGate). */
export const inlineWidth = (r: InlineRef, cap: number, ground: Ground = 'light', measure?: (t: string, px: number) => number): number => {
  const it = itemOf(r);
  if (it.kind === 'logo') {
    const e = logoOf(it.logo);
    const f = e ? logoFile(e, 'mark', ground, it.mono) : null;
    return f ? cap * Math.min(INLINE.maxAspect, f.aspect) : cap;
  }
  if (it.kind === 'glyph') return cap;
  if (it.kind === 'ui') return cap * it.aspect;
  const C = INLINE.chip;
  const { h, label: px } = chipSize(cap);
  const label = measure ? measure(it.label, px) : [...it.label].length * px * 0.56;
  const lead = it.logo || it.glyph ? h * C.mark + h * C.gap : 0;
  return h * C.pad * 2 + lead + label;
};

/**
 * The slot at `frame`: which object shows, the one leaving, the roll's progress `k` (0..1, eased on E.glideOut) and
 * the slot's width. A new object every `every` 60 fps frames from `start` (house 48), each change a `swap`-frame roll
 * (house 16 f: it lands with a tail, forensics motion-decay); `loop` cycles, else the last object holds. Pure.
 */
export const inlineSlotState = (frame: number, widths: number[], o: { start?: number; every?: number; swap?: number; loop?: boolean; fps?: number; fit?: 'each' | 'max' } = {}) => {
  const s = inlineLogoState(frame, widths.length, { start: o.start, every: o.every ?? INLINE.every60, swap: o.swap ?? INLINE.swap60, loop: o.loop, fps: o.fps });
  const q = E.glideOut(s.k);
  const width = (o.fit ?? 'max') === 'max' ? Math.max(0, ...widths) : mix(widths[s.prev] ?? 0, widths[s.i] ?? 0, q);
  return { ...s, q, width };
};

type ObjProps = { theme?: KitTheme; ground?: Ground; size: number; weight?: number; id?: string };

/** One object drawn at cap height inside a box `w` wide. */
const Obj: React.FC<{ item: InlineItem; cap: number; w: number; o: ObjProps }> = ({ item, cap, w, o }) => {
  const t = o.theme ?? kitTheme(o.ground === 'dark' ? 'slateMid' : 'tintedPaper');
  if (item.kind === 'logo') {
    const e = logoOf(item.logo);
    const f = e ? logoFile(e, 'mark', o.ground ?? 'light', item.mono) : null;
    if (!e || !f) return <Glyph name="grid" size={cap} color={t.accent} variant="duotone" />; // no fetched mark: a quiet glyph
    const mw = Math.min(w, cap * f.aspect), mh = mw / f.aspect;
    return <Img src={staticFile(f.src)} data-logo={e.name} style={{ display: 'block', width: mw, height: mh, transform: `translate(${((w - mw) / 2).toFixed(2)}px, ${((cap - mh) / 2).toFixed(2)}px)` }} />;
  }
  if (item.kind === 'glyph') {
    const box = cap / INLINE.glyphInk; // the glyph's ink (about 82 % of its grid) at the cap height
    return <div style={{ transform: `translate(${((w - box) / 2).toFixed(2)}px, ${((cap - box) / 2).toFixed(2)}px)` }}><Glyph name={item.name} size={box} color={item.color ?? t.accent} variant={item.variant ?? 'fill'} /></div>;
  }
  if (item.kind === 'ui') return <div style={{ width: cap * item.aspect, height: cap, transform: `translateX(${((w - cap * item.aspect) / 2).toFixed(2)}px)` }}>{item.draw(cap)}</div>;
  const C = INLINE.chip;
  const { h, label } = chipSize(cap);
  const mark = item.logo ? logoOf(item.logo) : null;
  const mf = mark ? logoFile(mark, 'mark', t.dark ? 'dark' : 'light') : null;
  return (
    // a block-level flex box (never inline-flex): an inline box would sit its label's baseline on the line's baseline,
    // dropping the pill below the cap box, where the slot's clip cuts it flat; this one centres on the cap box
    <div data-ui style={{ display: 'flex', width: 'max-content', alignItems: 'center', gap: h * C.gap, height: h, padding: `0 ${h * C.pad}px`, borderRadius: h / 2, transform: `translateY(${((cap - h) / 2).toFixed(2)}px)`, background: item.on ? t.accent : t.surface, boxShadow: `inset 0 0 0 ${(1.2 * U).toFixed(2)}px ${t.line}`, boxSizing: 'border-box' }}>
      {mf ? <Img src={staticFile(mf.src)} style={{ display: 'block', height: h * C.mark, width: h * C.mark * Math.min(INLINE.maxAspect, mf.aspect) }} /> : item.glyph ? <Glyph name={item.glyph} size={h * C.mark} color={item.on ? t.accentInk : t.accent} variant="fill" /> : null}
      <span data-text={o.id ? `${o.id}-chip` : 'inline-chip'} style={face(label, 600, item.on ? t.accentInk : t.text, -0.01, 1)}>{item.label}</span>
    </div>
  );
};

export type InlineObjectProps = {
  objects: InlineRef[];
  size: number; // the line's font size (px)
  frame: number;
  start?: number; // the first object shows from here; the first roll is `every` later
  every?: number; // 60 fps frames between rolls (house 48)
  swap?: number; // 60 fps frames of a roll (house 16)
  loop?: boolean;
  fit?: 'each' | 'max'; // the slot's width: each object's own (the line re-flows while it rolls) or the widest
  weight?: number; // the line's weight (its cap height)
  ground?: Ground;
  theme?: KitTheme;
  id?: string;
};

/**
 * Objects at 1.0 cap height inside a line of type: put it between words (an inline-block on the baseline). Every
 * `every` frames the objects roll one slot up as one strip over `swap` frames (E.glideOut), clipped to the line's cap
 * box: the next rises from under the baseline as the last leaves over the cap line, never overlapping.
 */
export const InlineObject: React.FC<InlineObjectProps> = ({ objects, size, frame, start = 0, every, swap, loop = false, fit, weight = TYPE.line.weight, ground = 'light', theme, id }) => {
  const film = useFilm();
  const cap = capHeight(size, weight);
  const items = objects.map(itemOf);
  const measure = (t: string, px: number) => measureTracked(t, px, 600, -0.01, FONT.text);
  const widths = items.map((it) => inlineWidth(it, cap, ground, measure));
  const auto = items.some((it) => it.kind === 'chip' || it.kind === 'ui') ? 'each' : 'max';
  const s = inlineSlotState(frame, widths, { start, every, swap, loop, fps: fpsOf(film), fit: fit ?? auto });
  const tall = Math.max(cap, ...items.map((it) => heightOf(it, cap)));
  const pitch = INLINE.pitch * tall;
  const o: ObjProps = { theme, ground, size, weight, id };
  const one = (j: number, leaving: boolean) => {
    const it = items[j];
    if (!it) return null;
    const y = leaving ? -s.q * pitch : (1 - s.q) * pitch;
    return (
      <div key={`${j}-${leaving ? 'out' : 'in'}`} style={{ position: 'absolute', left: 0, top: 0, width: s.width, height: cap, opacity: leaving ? 1 - 0.5 * s.q : 1, transform: `translateY(${y.toFixed(2)}px)` }}>
        <Obj item={it} cap={cap} w={s.width} o={o} />
      </div>
    );
  };
  const c = INLINE.clip * cap + (tall - cap) / 2;
  return (
    <span data-ui style={{ display: 'inline-block', position: 'relative', width: s.width, height: cap, verticalAlign: 'baseline', clipPath: `inset(${(-c).toFixed(2)}px -2px ${(-c).toFixed(2)}px -2px)` }}>
      {s.k < 1 && one(s.prev, true)}
      {one(s.i, false)}
    </span>
  );
};

export type ObjectLineProps = {
  text: string; // the sentence, "[]" where the object sits ("Notes from [] in thirty seconds"); without it the object ends the line
  objects: InlineRef[];
  at: number; // the line's first frame
  frame: number;
  entry?: 'crisp' | 'calm'; // default crisp (a hero line)
  role?: keyof typeof TYPE; // the type role (default 'line')
  size?: number; // px (default the role's at this frame size)
  maxWidth?: number; // the line's widest, as a share of the frame width (default: what the layout audit allows its size: a line 61 %, a calm sentence 75 %, display and hero 84 %): a longer line is set smaller to fit
  x?: number; // the line's centre (default the frame's)
  y?: number;
  color?: string;
  every?: number;
  swap?: number;
  loop?: boolean;
  fit?: 'each' | 'max';
  ground?: Ground;
  theme?: KitTheme;
  id?: string;
  style?: React.CSSProperties;
};

/** The widest a line of cap height `capPct` (% of the frame height, as the layout audit reads it) may run, as a share of the frame width. */
export const lineShare = (capPct: number): number => {
  const role = TYPE_BANDS.find(([, lo, hi]) => capPct >= lo && capPct <= hi)?.[0];
  return role === 'line' ? (capPct < TYPE_WIDTH.sentenceCap ? TYPE_WIDTH.sentence : TYPE_WIDTH.line) : role === 'display' || role === 'hero' ? TYPE_WIDTH[role] : INLINE.maxWidth;
};

/** The size (px) a line of `natural` px at `base` px is set at to hold under `maxWidth` of the frame, or under what its own size allows. Pure. */
export const fitLine = (base: number, natural: number, width: number, height: number, maxWidth?: number): number => {
  const at = (share: number, s: number) => Math.min(s, (base * share * width) / Math.max(1, natural));
  if (maxWidth !== undefined) return at(maxWidth, base);
  let size = at(INLINE.maxWidth, base);
  for (let k = 0; k < 3; k++) size = at(lineShare((0.72 * size * 100) / height), size);
  return size;
};

/** The Words spec of an object line: the slot stands in the sentence as one word. Pure. */
export const objectLineSpec = (p: Pick<ObjectLineProps, 'text' | 'at' | 'entry'>, film?: Partial<FilmCtx>) => {
  const raw = p.text.includes('[]') ? p.text : `${p.text} []`;
  const tokens = raw.split(/\s+/).filter(Boolean);
  const slot = tokens.findIndex((t) => t.includes('[]'));
  const spec: WordsSpec = { text: tokens.map((t) => (t.includes('[]') ? 'mark' : t)).join(' '), start: p.at, ...((p.entry ?? 'crisp') === 'crisp' ? crispWords(film) : calmWords(film)) };
  return { tokens, slot, spec };
};

/** When the slot of an object line has landed (its first roll is `every` after): the frame the object is read. */
export const objectLineLanded = (p: Pick<ObjectLineProps, 'text' | 'at' | 'entry'>, film?: Partial<FilmCtx>) => {
  const { slot, spec } = objectLineSpec(p, film);
  return wordFrames(spec, film)[slot]?.settle ?? p.at;
};

/**
 * A sentence with an object in it, centred on (x, y): its words and the slot arrive as one line on the entry, the slot
 * as a word, and the objects roll in turn once it has landed. Tagged data-text={id} for the layout audit.
 */
export const ObjectLine: React.FC<ObjectLineProps> = (p) => {
  const film = useFilm();
  const role = TYPE[p.role ?? 'line'];
  const base = p.size ?? (role.size * Math.min(film.width, film.height)) / 1080;
  const { tokens, slot, spec } = objectLineSpec(p, film);
  // the whole line (its words, a space each, the widest object) held under maxWidth of the frame: never cropped by it
  const words = tokens.map((t) => t.replace('[]', '')).join(' ');
  const natural = measureTracked(words, base, role.weight, role.track, FONT.text) + Math.max(0, ...p.objects.map((o) => inlineWidth(o, capHeight(base, role.weight), p.ground, (t, px) => measureTracked(t, px, 600, -0.01, FONT.text))));
  const size = fitLine(base, natural, film.width, film.height, p.maxWidth);
  const ws = wordState(p.frame, { ...spec, size }, film).words;
  const landed = objectLineLanded(p, film);
  // the line's centre placed by transform, never by left/top (fractional offsets would snap to whole pixels)
  const cx = p.x ?? film.width / 2;
  const cy = p.y ?? film.height / 2;
  return (
    <div
      data-text={p.id ?? 'object-line'}
      style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) translate(-50%, -50%)`, display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: role.weight, letterSpacing: `${role.track}em`, lineHeight: 1, color: p.color, ...p.style }}
    >
      {tokens.map((t, i) => {
        const w = ws[i];
        const style: React.CSSProperties = { display: 'inline-block', transform: `translate3d(${w.x.toFixed(5)}em, ${w.y.toFixed(5)}em, 0)`, opacity: w.opacity, filter: w.blur > 0.05 ? `blur(${w.blur.toFixed(2)}px)` : undefined };
        const gap = i < tokens.length - 1 ? ' ' : '';
        if (i !== slot) return <span key={i} style={style}>{t + gap}</span>;
        const [pre, post] = t.split('[]');
        return (
          <span key={i} style={style}>
            {pre}
            <InlineObject objects={p.objects} size={size} weight={role.weight} frame={p.frame} start={landed} every={p.every} swap={p.swap} loop={p.loop} fit={p.fit} ground={p.ground} theme={p.theme} id={p.id} />
            {post + gap}
          </span>
        );
      })}
    </div>
  );
};
