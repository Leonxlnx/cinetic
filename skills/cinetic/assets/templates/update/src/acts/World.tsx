// The update film's world: one stage on the dealt ground family (fx/Grounds FamilyGround), its light still, never cut.
// The name and the version open it, centred; then ONE card, the product's own screen, is carried through the film, and
// each change has its own beat shape (src/deal.ts SHAPES):
//   after  the change works on the card (acts/moments.tsx), then the element that changed grows into the frame's colour
//          field, the line reads on it, and the field closes into the next card (the film's one colour event)
//   split  the line arrives parted round the card, which sits small in the gap between its words; the words leave and
//          the card grows out of the gap to full size and works
//   with   the card works in the upper half while its line reads centred under it
// At the end the card shrinks into the recap row beside the other changes, which gather into the mark; the name slides
// out of the mark and the version lands on the last bar line. The camera never floats and nothing bobs or sways: every
// move starts, travels and lands, and a hold is still while the product acts. No card is tilted. Lines never sit over a
// sharp card, never travel sideways and leave as one (the dealt exit). Every act renders this world at its own frames,
// so every act line is continuous by construction.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { C, FONT, TYPE, typeStyle, U } from '../brand/tokens';
import { CARD_TONE, DEAL, DEAL_SEED, LINES, SHAPES } from '../deal';
import { CreativeLine, CreativePicture, type Pal } from '../fx/creative';
import { FamilyGround, familyInks, type GroundFamily } from '../fx/Grounds';
import { hasLogo, kitTheme, type KitTheme } from '../kit';
import { cardInks } from '../kit/card';
import type { InlineRef } from '../kit/inline';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { phrase } from '../lib/cadence';
import { mixColor, toOklch } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { ACT, ARRIVE_S, BEAT, CLOSE, copy, EXIT_F, f60, H, heroWord, HOOK, N, ROLL, scaled, TIMES, W } from '../timeline';
import { type Change, spokenChange, UPDATE } from '../update';
import { cardMaterial, cardRadius, cardSize, changedRect, Moment, RecapCard } from './moments';
import { gapLine, HeroLine, MarkLine } from './type';

// ---------------------------------------------------------------------------------------------- the look
/** The dealt ground family and its inks (type, accent, the colour field). */
export const FAMILY = DEAL.ground as GroundFamily;
export const INK = familyInks(FAMILY);
/**
 * The product's cards (kit/card): light, or on a dark family dealt dark (src/deal.ts CARD_TONE); the screen inside writes
 * with the card's own inks and the brand's accent on what changed.
 */
const CARD_INKS = cardInks(CARD_TONE, INK.ground, C.accent);
export const THEME: KitTheme = (() => {
  const base = kitTheme(CARD_TONE === 'dark' ? 'inkStage' : 'tintedPaper', C.accent);
  const f = CARD_INKS.face;
  return { ...base, ground: INK.ground, surface: f, raised: mixColor(f, '#FFFFFF', CARD_TONE === 'dark' ? 0.05 : 0.6), well: CARD_TONE === 'dark' ? mixColor(f, INK.ground, 0.55) : base.well, text: CARD_INKS.text, mute: CARD_INKS.mute, line: CARD_INKS.line };
})();
const T = THEME;
const MATERIAL = cardMaterial(CARD_TONE, INK.ground, C.accent);
/** The film's one colour event: the field the 'after' change's line stands on (the brand's accent, the type that reads on it). */
export const FIELD = C.accent;
const ON_FIELD = toOklch(FIELD)[0] < 0.66 ? '#FFFFFF' : C.ink;

// ---------------------------------------------------------------------------------------------- the lines' layout
/** A change line's size: the line role's (TYPE.line), smaller only when the line (with its gap) would pass 62 % of the frame width. */
const lineSize = (text: string, extra = 0) => {
  const base = TYPE.line.size * U;
  const w = measureTracked(text.replace('[]', 'MM'), base, TYPE.line.weight, TYPE.line.track, FONT.text) + extra;
  return Math.min(base, (base * 0.62 * W) / Math.max(1, w));
};
/** The split shape's gap: the card in it stands this share of the line's size tall, with this margin to the words each side. */
const GAP = { h: 0.98, margin: 0.18 } as const;
const SIZES = UPDATE.changes.map(cardSize);
/** Where a split line parts: the word boundary nearest its middle by width, never inside the change's key words. */
const splitAt = (c: Change, size: number): [string, string] => {
  const words = spokenChange(c).split(/\s+/);
  const key = (c.key ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const k0 = key.length ? words.findIndex((_, j) => key.every((kw, m) => words[j + m]?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === kw.replace(/[^\p{L}\p{N}]/gu, ''))) : -1;
  const width = (s: string) => measureTracked(s, size, TYPE.line.weight, TYPE.line.track, FONT.text);
  let best = 1;
  let score = Infinity;
  for (let j = 1; j < words.length; j++) {
    if (k0 >= 0 && j > k0 && j < k0 + key.length) continue;
    const d = Math.abs(width(words.slice(0, j).join(' ')) - width(words.slice(j).join(' ')));
    if (d < score) [best, score] = [j, d];
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};
/** A value measured from the real face: built on first use, inside a render (FontGate has loaded the fonts by then; Node never builds it). */
const lazy = <V,>(make: () => V): (() => V) => {
  let v: V | undefined;
  return () => (v === undefined ? (v = make()) : v);
};
/**
 * The screen a split line holds in its gap: the change before it as it ended (the carried card shrinks into the line and
 * grows out of it as the new screen), or, opening the film, the change's own first state.
 */
const gapFace = (i: number) => (i > 0 ? i - 1 : i);
/** Each split change's line, laid out once: its text with the gap, its size, the gap's centre and the card's scale in it. */
const SPLIT = lazy(() => UPDATE.changes.map((c, i) => {
  if (SHAPES[i] !== 'split') return null;
  const face = SIZES[gapFace(i)];
  const aspect = face.w / face.h;
  const gapW = (s: number) => GAP.h * s * aspect + 2 * GAP.margin * s;
  const size0 = lineSize(spokenChange(c), gapW(TYPE.line.size * U));
  const [a, b] = splitAt(c, size0);
  const id = `change${i + 1}`;
  const g = gapLine({ id, text: `${a} [] ${b}`, at: 0, move: LINES.move[id], role: 'line', size: size0, x: W / 2, y: H / 2, color: INK.type, gapW: gapW(size0) });
  return { ...g, k: (GAP.h * g.size) / face.h, cy: H / 2 - 0.06 * g.size };
}));

// ---------------------------------------------------------------------------------------------- the card
/** The 'with' shape: the card in the upper 60 % of the frame, its line centred under it. */
const WITH = { top: 56 * U, bottom: 0.6 * H, line: 0.705 * H } as const;
const withK = (i: number) => Math.min(0.8, (WITH.bottom - WITH.top) / SIZES[i].h, (0.8 * W) / SIZES[i].w);

/**
 * The card's state: where it is, its box, scale, opacity, how far it has opened (1 whole; under 1 a hairline growing
 * across, then opening down: the 'open' arrival and the first split card), and which change's screen it shows (a -> b
 * by mix; recap: the recap face).
 */
type CS = { cx: number; cy: number; w: number; h: number; k: number; o: number; open: number; a: number; b: number; mix: number; recap: number };
const placed = (i: number): CS => {
  const w = SHAPES[i] === 'with';
  return { cx: W / 2, cy: w ? (WITH.top + WITH.bottom) / 2 : H / 2 + 6 * U, w: SIZES[i].w, h: SIZES[i].h, k: w ? withK(i) : 1, o: 1, open: 1, a: i, b: i, mix: 1, recap: 0 };
};
/** The 'rise' arrival's start: low and clear, facing the lens (never tilted); it is whole within the move's first fifth. */
const below = (i: number): CS => ({ ...placed(i), cy: placed(i).cy + 0.2 * H, o: 0 });
/** The split shape's card, small in its line's gap, showing the gap's screen (gapFace). */
const inGap = (i: number): CS => {
  const g = SPLIT()[i]!;
  const f = gapFace(i);
  return { ...placed(i), w: SIZES[f].w, h: SIZES[f].h, a: f, b: f, cx: g.x, cy: g.cy, k: g.k };
};

/** The recap row: each change's card at its slot (one row; 2 x 2 for four changes). */
const RECAP = (() => {
  const cols = N === 4 ? 2 : N;
  const gap = 44 * U;
  const cw = Math.min(540 * U, (W - 2 * 120 * U - (cols - 1) * gap) / cols);
  const ch = N === 4 ? 300 * U : Math.round(cw * 0.64);
  const slot = (j: number) => {
    const c = j % cols;
    const r = Math.floor(j / cols);
    const rows = Math.ceil(N / cols);
    return { x: W / 2 + (c - (cols - 1) / 2) * (cw + gap), y: H / 2 + (r - (rows - 1) / 2) * (ch + gap) };
  };
  return { cw, ch, slot };
})();
const recapState = (j: number): CS => ({ cx: RECAP.slot(j).x, cy: RECAP.slot(j).y, w: RECAP.cw, h: RECAP.ch, k: 1, o: 1, open: 1, a: j, b: j, mix: 1, recap: 1 });

/** One move of the card; `fade`: its opacity reaches the end state this many times faster than the move (an entrance is whole early). */
type Key = { f0: number; f1: number; A: CS; B: CS; ease: (t: number) => number; fade?: number };
const lerpCS = (A: CS, B: CS, p: number, mixP: number): CS => ({
  cx: mix(A.cx, B.cx, p), cy: mix(A.cy, B.cy, p), w: mix(A.w, B.w, p), h: mix(A.h, B.h, p), k: lmix(A.k, B.k, p), o: mix(A.o, B.o, p), open: mix(A.open, B.open, p),
  a: A.a === B.a ? A.a : A.b, b: B.b, mix: A.b === B.b ? 1 : mixP, recap: mix(A.recap, B.recap, mixP),
});
/** The card's whole path through the film: one keyframe per arrival, gap, expansion and reshape (built once). */
const KEYS = lazy((): Key[] => {
  const keys: Key[] = [];
  let state: CS = below(0);
  TIMES.forEach((t, i) => {
    const prevField = i > 0 ? TIMES[i - 1].field : undefined;
    if (t.gap) {
      const g = inGap(i);
      if (i === 0) keys.push({ f0: t.gap[0], f1: t.gap[1], A: { ...g, open: 0 }, B: g, ease: E.linear });
      else keys.push({ f0: t.gap[0], f1: t.gap[1], A: state, B: g, ease: E.strongInOut });
      keys.push({ f0: t.card[0], f1: t.card[1], A: g, B: placed(i), ease: E.strongInOut });
    } else if (prevField) {
      // under the closing field the card is already the next screen: the field closes onto it
      keys.push({ f0: prevField.close[0], f1: prevField.close[0] + 1, A: placed(i), B: placed(i), ease: E.linear });
    } else if (i === 0 && ARRIVE_S) {
      keys.push({ f0: t.card[0], f1: t.card[1], A: placed(0), B: placed(0), ease: E.linear }); // the library device brings it in (Arrival)
    } else if (i === 0) {
      keys.push(DEAL.arrive === 'open' ? { f0: t.card[0], f1: t.card[1], A: { ...placed(0), open: 0 }, B: placed(0), ease: E.linear } : { f0: t.card[0], f1: t.card[1], A: below(0), B: placed(0), ease: E.glideOut, fade: 5 });
    } else {
      keys.push({ f0: t.card[0], f1: t.card[1], A: state, B: placed(i), ease: E.strongInOut });
    }
    state = placed(i);
  });
  const last = TIMES[N - 1];
  if (last.field) keys.push({ f0: CLOSE.gather, f1: CLOSE.gather + 1, A: recapState(N - 1), B: recapState(N - 1), ease: E.linear });
  else keys.push({ f0: CLOSE.gather, f1: CLOSE.gather + Math.round(BEAT), A: state, B: recapState(N - 1), ease: E.strongInOut });
  return keys;
});
const cardAt = (F: number): CS => {
  const keys = KEYS();
  if (F < keys[0].f0) return { ...keys[0].A, o: 0 }; // nothing of the card shows before its first move
  let s = keys[0].A;
  for (const k of keys) {
    if (F < k.f0) break;
    if (F >= k.f1) {
      s = { ...k.B, a: k.B.b, mix: 1 };
      continue;
    }
    const p = k.ease(clamp((F - k.f0) / Math.max(1, k.f1 - k.f0)));
    const m = prog(F, k.f0 + (k.f1 - k.f0) * 0.3, k.f0 + (k.f1 - k.f0) * 0.7, E.stdInOut); // the screens cross mid-move
    s = lerpCS(k.A, k.B, p, m);
    if (k.fade) s.o = mix(k.A.o, k.B.o, clamp(((F - k.f0) / Math.max(1, k.f1 - k.f0)) * k.fade));
  }
  return s;
};

/**
 * The card: the film's one material (moments.tsx cardMaterial), facing the lens. While it opens (open < 1) its box grows
 * from a hairline across its width, then opens down from the middle; the screen inside stays put, so it is revealed,
 * never squashed.
 */
const Card: React.FC<{ s: CS; id: string; children: React.ReactNode }> = ({ s, id, children }) => {
  if (s.o <= 0.003) return null;
  const across = s.open >= 1 ? 1 : E.strongInOut(clamp(s.open / 0.45));
  const down = s.open >= 1 ? 1 : E.strongInOut(clamp((s.open - 0.4) / 0.6));
  const bw = s.w * mix(0.04, 1, across);
  const bh = Math.max(3 * U / Math.max(0.05, s.k), s.h * down);
  const r = Math.min(cardRadius(s.w), bh / 2);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, opacity: clamp(s.o), transform: `translate(${(s.cx - s.w / 2).toFixed(2)}px, ${(s.cy - s.h / 2).toFixed(2)}px) scale(${s.k.toFixed(5)})`, transformOrigin: '50% 50%' }}>
      <div data-ui data-mover={id} style={{ position: 'absolute', left: 0, top: 0, width: bw, height: bh, transform: `translate(${((s.w - bw) / 2).toFixed(2)}px, ${((s.h - bh) / 2).toFixed(2)}px)`, borderRadius: r, ...MATERIAL, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, transform: `translate(${(-(s.w - bw) / 2).toFixed(2)}px, ${(-(s.h - bh) / 2).toFixed(2)}px)`, opacity: clamp((down - 0.15) / 0.5) }}>{children}</div>
      </div>
    </div>
  );
};

/** The screens inside the carried card: the one it leaves and the one it becomes, crossing mid-move; the recap face at the end. */
const CardFaces: React.FC<{ s: CS; F: number }> = ({ s, F }) => {
  const faces: { i: number; o: number }[] = s.a === s.b ? [{ i: s.b, o: 1 }] : [{ i: s.a, o: 1 - s.mix }, { i: s.b, o: s.mix }];
  return (
    <>
      {faces.filter((x) => x.o > 0.01 && s.recap < 0.99).map((x) => (
        <div key={x.i} style={{ position: 'absolute', left: 0, top: 0, width: SIZES[x.i].w, height: SIZES[x.i].h, opacity: x.o * (1 - s.recap), transform: `translate(${((s.w - SIZES[x.i].w) / 2).toFixed(2)}px, ${((s.h - SIZES[x.i].h) / 2).toFixed(2)}px)` }}>
          <Moment c={UPDATE.changes[x.i]} T={TIMES[x.i]} F={F} theme={T} w={SIZES[x.i].w} h={SIZES[x.i].h} />
        </div>
      ))}
      {s.recap > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: s.recap }}>
          <RecapCard c={UPDATE.changes[s.b]} theme={T} w={s.w} h={s.h} />
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------------------------- type
/** The film's one whole-line exit at frame F (0 before `out`): the wrapper's style. */
const exitStyle = (F: number, out: number, size: number, down = false, voice: string = LINES.exitVoice): React.CSSProperties => {
  const raw = clamp((F - out) / Math.max(1, EXIT_F));
  const q = E.buildIn(raw);
  if (q <= 0) return {};
  const lift = voice === 'lift';
  const move = lift ? `translateY(${((down ? 1 : -1) * 0.3 * size * q).toFixed(2)}px)` : `scale(${(1 - 0.06 * q).toFixed(4)})`;
  // gone before the travel ends: the line never stops dead in view or vanishes mid-flight
  return { opacity: 1 - E.softOut(clamp(raw / 0.8)), transform: move, transformOrigin: '50% 50%', filter: `blur(${((lift ? 0.1 : 0.12) * size * q).toFixed(2)}px)` };
};
/** Another product's mark inside a line: its official mark set in the line's own ink (one colour, so it never fights the palette). */
const objectOf = (c: Change): InlineRef => (c.logo && hasLogo(c.logo) ? { kind: 'logo', logo: c.logo, mono: true } : { kind: 'chip', label: c.logoName ?? '' });

/** Change i's sentence, centred: in the middle (after: on the field; split: parted round the card) or under its card (with), leaving on the film's exit. */
const ChangeLine: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const t = TIMES[i];
  const ch = UPDATE.changes[i];
  const c = copy(`change${i + 1}`);
  if (F < c.in || F >= c.out + EXIT_F) return null;
  const onField = t.shape === 'after';
  const split = SPLIT()[i];
  const size = split ? split.size : lineSize(ch.words);
  const y = t.shape === 'with' ? WITH.line : H / 2;
  const color = onField ? ON_FIELD : INK.type;
  const accent = onField ? ON_FIELD : INK.accent;
  const p = { id: `change${i + 1}`, at: c.in, frame: F, move: LINES.move[`change${i + 1}`], role: 'line' as const, size, x: W / 2, y, color, accent, mute: mixColor(color, onField ? FIELD : INK.ground, 0.55) };
  if (scaled(i)) {
    // the library's scale-contrast on the field (src/deal.ts FIELD_TYPE): the key word huge, the rest small above and under
    const words = spokenChange(ch).split(/\s+/).map((word, j) => ({ word, key: j === heroWord(i) }));
    const pal: Pal = { ground: FIELD, type: ON_FIELD, mute: mixColor(ON_FIELD, FIELD, 0.22), accent: ON_FIELD, surface: FIELD, line: mixColor(ON_FIELD, FIELD, 0.6), dark: ON_FIELD === '#FFFFFF' };
    return (
      <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, c.out, size) }}>
        <CreativeLine cid="scale-contrast" cut={c.out} f={F - c.in} dur={c.out + EXIT_F - c.in} words={words} id={`change${i + 1}`} size={size} weight={TYPE.line.weight} track={TYPE.line.track} font={FONT.text} pal={pal} resolved={c.resolved - c.in} out={c.out - c.in} seed={DEAL_SEED % 997} />
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, c.out, size, t.shape === 'with') }}>
      {split ? <HeroLine {...p} text={split.text} /> : ch.words.includes('[]') ? <MarkLine {...p} text={ch.words} objects={[objectOf(ch)]} ground={onField || INK.dark ? 'dark' : 'light'} theme={T} /> : <HeroLine {...p} text={spokenChange(ch)} />}
    </div>
  );
};

/** A rectangle on the frame (px) with its corner radius. */
type Rect = { x: number; y: number; w: number; h: number; r: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p), w: mix(a.w, b.w, p), h: mix(a.h, b.h, p), r: mix(a.r, b.r, p) });
/** A card state's face on the frame. */
const rectOf = (s: CS): Rect => ({ x: s.cx - (s.w * s.k) / 2, y: s.cy - (s.h * s.k) / 2, w: s.w * s.k, h: s.h * s.k, r: cardRadius(s.w) * s.k });
/** The element that changed on change i's card (moments.tsx changedRect), on the frame while the card is placed. */
const changedOnFrame = (i: number): Rect => {
  const s = placed(i);
  const e = changedRect(UPDATE.changes[i], s.w, s.h);
  return { x: s.cx + (e.x - s.w / 2) * s.k, y: s.cy + (e.y - s.h / 2) * s.k, w: e.w * s.k, h: e.h * s.k, r: e.r * s.k };
};
const FULL: Rect = { x: -24 * U, y: -24 * U, w: W + 48 * U, h: H + 48 * U, r: 0 };

/**
 * The colour field of the 'after' change: the changed element (the pressed button, the block, the row, the bar) turns to
 * the accent and grows into the whole frame; the line reads on it; then it closes into the next card (or the recap's
 * slot), turning to the card's face as it lands there and giving way to it.
 */
const Field: React.FC<{ F: number }> = ({ F }) => {
  const t = TIMES.find((x) => x.field && F >= x.field.in && F < x.field.close[1]);
  if (!t || !t.field) return null;
  const [c0, c1] = t.field.close;
  const grow = prog(F, t.field.in, t.field.in + t.field.grow, E.strongInOut);
  const shut = prog(F, c0, c1, E.strongInOut);
  const tint = prog(F, t.field.in - f60(4), t.field.in + f60(4), E.stdInOut); // the element takes the accent as it starts to grow
  const target = rectOf(t.i < N - 1 ? placed(t.i + 1) : recapState(N - 1));
  const r = shut > 0 ? lerpRect(FULL, target, shut) : lerpRect(changedOnFrame(t.i), FULL, grow);
  const colour = shut > 0 ? mixColor(FIELD, CARD_INKS.faceTop, E.stdInOut(clamp((shut - 0.45) / 0.45))) : FIELD;
  const o = shut > 0 ? 1 - clamp((shut - 0.7) / 0.3) : clamp(tint);
  return <div data-ground="field" style={{ position: 'absolute', left: 0, top: 0, width: r.w, height: r.h, transform: `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px)`, borderRadius: r.r, background: colour, opacity: o }} />;
};

// ---------------------------------------------------------------------------------------------- the name and the version
const NAME = { size: TYPE.display.size * U, gap: 0.42 } as const;
const tab: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
/** A string that rolls from `from` to `to` on a drum: each changed character in its own column, whole glyphs (never squashed). */
const Drum: React.FC<{ from: string; to: string; p: number; size: number; color: string; id: string }> = ({ from, to, p, size, color, id }) => {
  const box = size * 1.18;
  const style: React.CSSProperties = { ...typeStyle('display', size), ...tab, color, lineHeight: `${box}px`, height: box, display: 'block', whiteSpace: 'pre' };
  const col = (a: string, b: string, k: number) =>
    a === b ? (
      <span key={k} style={style}>{b}</span>
    ) : (
      <span key={k} style={{ display: 'inline-block', height: box, overflow: 'hidden', verticalAlign: 'top' }}>
        <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${(-p * box).toFixed(2)}px)` }}>
          <span style={style}>{a}</span>
          <span style={style}>{b}</span>
        </span>
      </span>
    );
  const same = from.length === to.length;
  return (
    <span data-text={id} style={{ display: 'flex', height: box }}>
      {same ? [...to].map((ch, k) => col(from[k], ch, k)) : col(from, to, 0)}
    </span>
  );
};
/** A word rising out of a mask on its baseline (p 0..1). */
const MaskUp: React.FC<{ p: number; size: number; children: React.ReactNode }> = ({ p, size, children }) => (
  <div style={{ height: size * 1.18, overflow: 'hidden' }}>
    <div style={{ transform: `translateY(${((1 - p) * size * 1.25).toFixed(2)}px)` }}>{children}</div>
  </div>
);
/** The 'badge' hook's pill: the version set smaller in the accent pill, its metrics at a name size. */
const badgeOf = (size: number) => {
  const vs = 0.5 * size;
  const h = vs * 1.62;
  const w = measureTracked(UPDATE.version, vs, 640, -0.01, FONT.text, { tabular: true }) + 1.1 * vs;
  return { vs, h, w };
};
/** The version in its pill: a dot that lands and widens into the pill on one move, the numerals rising in it. */
const Badge: React.FC<{ p: number; size: number; id: string }> = ({ p, size, id }) => {
  const b = badgeOf(size);
  // one move: the dot lands already widening into the pill (no separate pop), the numerals rising in it as it opens
  const dot = E.glideOut(clamp(p / 0.3));
  const wide = E.strongInOut(clamp((p - 0.08) / 0.62));
  const txt = E.snapOut(clamp((p - 0.45) / 0.5));
  const d = 0.42 * b.h;
  const w = mix(d, b.w, wide);
  const h = mix(d, b.h, wide);
  const onPill = toOklch(INK.accent)[0] < 0.66 ? '#FFFFFF' : C.ink;
  return (
    <div style={{ position: 'relative', width: b.w, height: size * 1.18 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: h / 2, background: INK.accent, transform: `translateY(${((size * 1.18 - h) / 2 + 0.04 * size).toFixed(2)}px) scale(${dot.toFixed(4)})`, transformOrigin: `${(d / 2).toFixed(2)}px 50%`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: txt, transform: `translateY(${((1 - txt) * 0.5 * b.h).toFixed(2)}px)` }}>
          <span data-text={id} style={{ fontFamily: FONT.text, fontSize: b.vs, fontWeight: 640, letterSpacing: '-0.01em', lineHeight: 1, color: onPill, whiteSpace: 'pre', ...tab }}>{UPDATE.version}</span>
        </div>
      </div>
    </div>
  );
};

const Hook: React.FC<{ F: number }> = ({ F }) => {
  if (F >= HOOK.out + EXIT_F) return null;
  const size = NAME.size;
  const nameW = measureTracked(UPDATE.name, size, TYPE.display.weight, TYPE.display.track, FONT.text);
  const verW = (s: string) => measureTracked(s, size, TYPE.display.weight, TYPE.display.track, FONT.text, { tabular: true });
  const roll = DEAL.hook === 'roll';
  const badge = DEAL.hook === 'badge';
  const gap = (badge ? 0.3 : NAME.gap) * size;
  const rollP = prog(F, HOOK.roll, HOOK.roll + f60(ROLL), E.snapOut);
  const vIn = roll ? prog(F, 0, f60(22), E.snapOut) : badge ? prog(F, HOOK.version - f60(4), HOOK.version + f60(34), E.linear) : prog(F, HOOK.version, HOOK.version + f60(24), E.snapOut);
  const vw = roll ? mix(verW(UPDATE.from), verW(UPDATE.version), rollP) : badge ? badgeOf(size).w : verW(UPDATE.version);
  const groupW = nameW + gap + vw; // the pair is laid out centred from the first frame: the name never slides while it is read
  const left = (W - groupW) / 2;
  const nameIn = prog(F, 0, f60(22), E.snapOut);
  const y = H / 2 - (size * 1.18) / 2;
  const accentFlash = roll ? hitPulse(F - (HOOK.roll + f60(ROLL)), 2, 14) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, HOOK.out, size, false, 'recede') }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left.toFixed(2)}px, ${y.toFixed(2)}px)` }}>
        <MaskUp p={nameIn} size={size}>
          <span data-text="hook-name" style={{ ...typeStyle('display', size), color: INK.type, lineHeight: `${size * 1.18}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.name}</span>
        </MaskUp>
      </div>
      {vIn > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(left + nameW + gap).toFixed(2)}px, ${y.toFixed(2)}px)` }}>
          {badge ? (
            <Badge p={vIn} size={size} id="hook-version" />
          ) : (
            <MaskUp p={vIn} size={size}>
              <Drum from={roll ? UPDATE.from : UPDATE.version} to={UPDATE.version} p={roll ? rollP : 1} size={size} color={mixColor(INK.accent, INK.type, 0.15 - 0.15 * accentFlash)} id="hook-version" />
            </MaskUp>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- recap and lockup
/** The recap's other cards land phrased (lib/cadence), settling into the last. */
const RECAP_ON = phrase(N, f60(5), { shape: 'settle', seed: 'recap' }).onsets;
const MARK = 140 * U;
/** The fold and the shrink into the mark are one gesture: the cards pile as they start to shrink, landing as the mark. */
const SHRINK: [number, number] = [CLOSE.fold + Math.round(0.15 * BEAT), CLOSE.markIn + Math.round(0.25 * BEAT)];
/** Where the fold leaves recap card j (stack: piled at the centre; fold: tucked behind the last card at the centre). */
const foldState = (j: number, F: number): CS => {
  const base = recapState(j);
  const last = j === N - 1;
  const stagger = DEAL.end === 'stack' ? j * f60(4) : (N - 1 - j) * f60(3);
  const p = prog(F, CLOSE.fold + stagger, CLOSE.fold + stagger + Math.round(0.6 * BEAT), E.strongInOut);
  const off = j - (N - 1) / 2;
  const pile: CS = DEAL.end === 'stack'
    ? { ...base, cx: W / 2 + off * 10 * U, cy: H / 2 + off * 8 * U, k: 0.9 }
    : { ...base, cx: W / 2, cy: H / 2, k: last ? 1.06 : 0.9, o: last ? 1 : 0.0 };
  const s = lerpCS(base, pile, p, 1);
  // the pile shrinks into the mark: the top card becomes it, the others fade under it
  const q = prog(F, SHRINK[0], SHRINK[1], E.strongInOut);
  if (q <= 0) return s;
  return { ...s, cx: mix(s.cx, W / 2, q), cy: mix(s.cy, H / 2, q), w: lmix(s.w, MARK, q), h: lmix(s.h, MARK, q), k: mix(s.k, 1, q), o: last ? s.o : s.o * (1 - q) };
};

/** The other changes' cards joining the carried one in the row: sliding out from behind it (deal) or rising into place (rise). */
const recapEntry = (j: number, F: number): CS => {
  const at = CLOSE.gather + Math.round((DEAL.recap === 'deal' ? 0.25 : 0.3) * BEAT) + RECAP_ON[j]; // inside the carried card's own move: one gesture
  const p = prog(F, at, at + Math.round(0.9 * BEAT), DEAL.recap === 'deal' ? E.strongInOut : E.glideOut);
  const to = recapState(j);
  if (DEAL.recap === 'deal') {
    const from = recapState(N - 1);
    return { ...to, cx: mix(from.cx, to.cx, p), cy: mix(from.cy, to.cy, p), o: clamp(p * 4) };
  }
  return { ...to, cy: to.cy + (1 - p) * 90 * U, o: clamp(p * 4) }; // whole within its first quarter: never a see-through slab
};

const RecapRow: React.FC<{ F: number; top: boolean }> = ({ F, top }) => {
  if (F < CLOSE.gather || F >= SHRINK[1] + f60(4)) return null;
  return (
    <>
      {UPDATE.changes.map((c, j) => {
        const carried = j === N - 1;
        if (carried !== top) return null; // the carried card is drawn over the others: they slide out from behind it
        if (carried && F < CLOSE.recapIn) return null; // the carried card is still on its way into this slot
        const s = F < CLOSE.fold ? (carried ? recapState(j) : recapEntry(j, F)) : foldState(j, F);
        const q = prog(F, SHRINK[0], SHRINK[1], E.strongInOut);
        return (
          <Card key={c.id} s={{ ...s, recap: 1 }} id={`recap-${j}`}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - clamp(q * 2) }}>
              <RecapCard c={c} theme={T} w={recapState(j).w} h={recapState(j).h} glow={hitPulse(F - (CLOSE.recapGlint + RECAP_ON[j]), 3, 12)} />
            </div>
          </Card>
        );
      })}
    </>
  );
};

const Lockup: React.FC<{ F: number }> = ({ F }) => {
  if (F < SHRINK[0]) return null;
  const size = NAME.size * 0.9;
  const badge = DEAL.hook === 'badge';
  const nameW = measureTracked(UPDATE.name, size, TYPE.display.weight, TYPE.display.track, FONT.text);
  const verW = badge ? badgeOf(size).w : measureTracked(UPDATE.version, size, TYPE.display.weight, TYPE.display.track, FONT.text, { tabular: true });
  const gapMN = 0.34 * size;
  const gapNV = (badge ? 0.3 : NAME.gap) * size;
  const markP = prog(F, SHRINK[0] + Math.round(0.3 * (SHRINK[1] - SHRINK[0])), SHRINK[1], E.strongInOut);
  const pB = prog(F, CLOSE.nameIn, CLOSE.named, E.strongInOut);
  const pC = badge ? prog(F, CLOSE.versionIn, CLOSE.lockup, E.linear) : prog(F, CLOSE.versionIn, CLOSE.lockup, E.settleOut);
  const pW = badge ? E.strongInOut(clamp(pC / 0.7)) : pC; // the pair re-centres as the version comes
  const groupW = MARK + pB * (gapMN + nameW) + pW * (gapNV + verW);
  const left = (W - groupW) / 2;
  const box = size * 1.18;
  const y = H / 2 - box / 2;
  const nameX = left + MARK + gapMN;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left.toFixed(2)}px, ${(H / 2 - MARK / 2).toFixed(2)}px)`, opacity: clamp(markP * 1.6 - 0.4) }}>
        <LogoMark logo={LOGO} size={MARK} fill={(part) => (INK.dark && part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? INK.type : undefined)} poses={(_, j) => (j === LOGO.parts.length - 1 ? { s: 1 + 0.06 * hitPulse(F - CLOSE.lockup, 2, 9) } : undefined)} />
      </div>
      {pB > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${nameX.toFixed(2)}px, ${y.toFixed(2)}px)`, width: nameW + 20 * U, height: box, overflow: 'hidden' }}>
          <span data-text="wordmark" style={{ ...typeStyle('display', size), color: INK.type, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block', transform: `translateX(${(-(1 - pB) * (nameW * 0.6 + gapMN)).toFixed(2)}px)` }}>{UPDATE.name}</span>
        </div>
      )}
      {pC > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(nameX + nameW + gapNV).toFixed(2)}px, ${y.toFixed(2)}px)`, opacity: badge ? 1 : clamp(pC * 2) }}>
          {badge ? (
            <Badge p={pC} size={size} id="release" />
          ) : (
            <MaskUp p={pC} size={size}>
              <span data-text="release" style={{ ...typeStyle('display', size), ...tab, color: INK.accent, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.version}</span>
            </MaskUp>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the first arrival
/** The inks a creative library device draws in: the ground family's, with the cards' own face. */
const PAL: Pal = { ground: INK.ground, type: INK.type, mute: INK.mute, accent: INK.accent, surface: T.surface, line: T.line, dark: INK.dark };
/** The colour field covers the whole frame (grown, not yet closing): the card under it is not drawn. */
const underField = (F: number) => TIMES.some((t) => t.field && F >= t.field.in + t.field.grow && F < t.field.close[0]);
/** A library device is drawing the first card in (src/deal.ts arrive: pixel-assemble, shape-morph, object-turn). */
const arriving = (F: number) => !!ARRIVE_S && SHAPES[0] !== 'split' && F >= TIMES[0].card[0] && F < TIMES[0].card[1];
/**
 * The first card brought in by the dealt creative device (fx/creative): the device draws the product's scene (the card
 * at rest in its place, its screen at that frame) its own way and ends on exactly that scene, so the carried card takes
 * over with no seam.
 */
const Arrival: React.FC<{ F: number }> = ({ F }) => {
  const t = TIMES[0];
  const at = placed(0);
  const box = rectOf(at);
  const scene = (f: number) => (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Card s={at} id="card">
        <CardFaces s={at} F={t.card[0] + f} />
      </Card>
    </div>
  );
  return <CreativePicture id={DEAL.arrive} f={F - t.card[0]} dur={t.card[1] - t.card[0]} start={0} pal={PAL} seed={DEAL_SEED % 997} scene={scene} focus={{ x: box.x, y: box.y, w: box.w, h: box.h }} radius={cardRadius(at.w) / U} uid="arrive" />;
};

// ---------------------------------------------------------------------------------------------- the world
export const World: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const s = cardAt(F);
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      {/* the ground is lit once and holds still (fx/Grounds): nothing in the frame drifts without a reason */}
      <FamilyGround family={FAMILY} frame={0} seed={DEAL_SEED % 97} />
      <RecapRow F={F} top={false} />
      {arriving(F) ? (
        <Arrival F={F} />
      ) : (
        F < CLOSE.recapIn && !underField(F) && (
          <Card s={s} id="card">
            <CardFaces s={s} F={F} />
          </Card>
        )
      )}
      <RecapRow F={F} top />
      <Field F={F} />
      <Hook F={F} />
      {UPDATE.changes.map((_, i) => <ChangeLine key={i} i={i} F={F} />)}
      <Lockup F={F} />
    </AbsoluteFill>
  );
};

/** Each change's frames, for src/sync.ts and the acts. */
export const CHANGE_FRAMES = TIMES.map((t) => ({ id: UPDATE.changes[t.i].id, kind: UPDATE.changes[t.i].show.kind, ...t }));
export { ACT };
