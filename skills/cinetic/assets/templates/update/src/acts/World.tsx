// The update film's world: one stage on the dealt ground family (fx/Grounds FamilyGround, lit and still, never cut; its
// colour event once, under the 'after' change's field). The name and the version open it, centred; then each change is
// a picture and a line (src/deal.ts SHAPES):
//   show   the card comes in (a creative device from fx/creative, else it rises or opens), works (acts/moments.tsx),
//          then folds shut into a bar of light and the line rises from it, alone in the middle of the frame
//   after  the card comes in and works, then the element that changed grows into the frame's lit colour field and the
//          line reads on it; the field closes into the next card (or the dot its device starts from)
//   split  the line arrives parted round the card, small in the gap between its words; the card grows out as the new screen
//   lead   the card before folds into the bar, the line rises from it alone, then this change's card comes in
// One picture hands over to the next by the element that changed growing into the next card; a line hands over to a
// picture by the creative device that brings the card in. cursor-follow plays on a tapped card: the camera pushes onto
// the pointer, rides it to the button, clicks on the hit and pulls back to the card reacting. At the end the cards
// gather into the recap row and then into the mark; the name slides out of the mark and the version lands on the last
// bar line. The camera never floats and nothing bobs: every move starts, travels and lands, a hold is still while the
// product acts. No card is tilted. Every act renders this world at its own frames, so the acts join by construction.
import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { C, FONT, TYPE, TYPE_FAMILY, typeStyle, U } from '../brand/tokens';
import { CARD_TONE, DEAL, DEAL_SEED, LINE_DEVICE, LINES, SHAPES } from '../deal';
import { CreativeLine, CreativePicture, type Pal } from '../fx/creative';
import { CURSOR, cursorStart } from '../fx/creative/CursorFollow';
import { bakePixels } from '../fx/Gradients';
import { FamilyGround, familyInks, type GroundFamily, type LitField, litFieldPixels } from '../fx/Grounds';
import { FACE_SET, PAIR_IDS, PAIRS, type PairId, safeTrack, wordmarkStyle } from '../fx/TypePairs';
import { hasLogo, kitTheme, type KitTheme } from '../kit';
import { Card as KitCard, cardInks } from '../kit/card';
import type { InlineRef } from '../kit/inline';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { phrase } from '../lib/cadence';
import { mixColor, toOklch } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { ACT, BEAT, CLOSE, copy, CURSOR60, ENDS_ON_PICTURE, EXIT_F, f60, H, heroWord, HOOK, N, ROLL, scaled, TIMES, W } from '../timeline';
import { beforeOf, type Change, photosOf, spokenChange, UPDATE } from '../update';
import { buttonRect, cardRadius, cardSize, changedRect, Moment, RecapCard } from './moments';
import { gapLine, HeroLine, MarkLine } from './type';

// ---------------------------------------------------------------------------------------------- the look
/** The dealt ground family and its inks (type, accent); lightDark turns dark once, as its colour field fills the frame. */
export const FAMILY = DEAL.ground as GroundFamily;
const AFTER = TIMES.find((t) => t.field);
const TURN = FAMILY === 'lightDark' && AFTER?.field ? AFTER.field.in + AFTER.field.grow : Infinity;
export const INK = familyInks(FAMILY);
const INK_DARK = FAMILY === 'lightDark' ? familyInks(FAMILY, { dark: true }) : INK;
const inkAt = (F: number) => (F >= TURN ? INK_DARK : INK);
/**
 * The product's cards (kit/card Card): light, or on a dark family dealt dark (src/deal.ts CARD_TONE); the screen inside
 * writes with the card's own inks and the brand's accent on what changed.
 */
const CARD_INKS = cardInks(CARD_TONE, INK.ground, C.accent);
export const THEME: KitTheme = (() => {
  const base = kitTheme(CARD_TONE === 'dark' ? 'inkStage' : 'tintedPaper', C.accent);
  const f = CARD_INKS.face;
  return { ...base, ground: INK.ground, surface: f, raised: mixColor(f, '#FFFFFF', CARD_TONE === 'dark' ? 0.05 : 0.6), well: CARD_TONE === 'dark' ? mixColor(f, INK.ground, 0.55) : base.well, text: CARD_INKS.text, mute: CARD_INKS.mute, line: CARD_INKS.line };
})();
const T = THEME;
/** The film's one colour event: the field the 'after' change's line stands on (the brand's accent, lit), and its ink. */
export const FIELD = C.accent;
const ON_FIELD = toOklch(FIELD)[0] < 0.66 ? '#FFFFFF' : C.ink;
/** The colour field as a lit place, never a flat slab: the accent under a soft key from the top left, deeper at the far corner. */
const FIELD_LIGHT: LitField = (() => {
  const [L, Cc, h] = toOklch(FIELD);
  return { L, C: Cc, h, vignette: 0.1, lights: [{ x: 0.12, y: -0.3, rx: 0.95, ry: 0.85, L: Math.min(0.96, L + 0.11), C: Cc * 0.85, h, a: 0.9 }, { x: 0.96, y: 1.3, rx: 0.95, ry: 0.65, L: L * 0.8, C: Cc * 1.02, h, a: 0.75 }] };
})();
const fieldSrc = () => bakePixels(`update-field|${JSON.stringify(FIELD_LIGHT)}|${W}|${H}`, W, H, () => litFieldPixels(FIELD_LIGHT, W, H, 11));
/** The ground's colour event (FamilyGround event: the accent lobe, the key taking the accent, the glow rising): it rises
 * as the field fills the frame and settles back over two beats once the field has closed, so the field's colour stays in
 * the place for a moment. whiteBand's event is the field itself (its band flooding would wipe the frame in two) and
 * lightDark's is its turn. */
const eventAt = (F: number) => {
  if (!AFTER?.field || FAMILY === 'whiteBand' || FAMILY === 'lightDark') return 0;
  const f = AFTER.field;
  return prog(F, f.in + f.grow * 0.5, f.in + f.grow, E.stdInOut) * (1 - prog(F, f.close[0], f.close[0] + Math.round(2 * BEAT), E.stdInOut));
};

// ---------------------------------------------------------------------------------------------- the type pairing
/** The film's pairing (fx/TypePairs), read from the voice and text faces scripts/type-deal.ts wrote; null for a brand face. */
const PAIR: PairId | null = (() => {
  const has = (stack: string | undefined, face: keyof typeof FACE_SET) => !!stack && stack.includes(`"${FACE_SET[face].family}"`);
  const voice = PAIR_IDS.filter((id) => has(FONT.text, PAIRS[id].voice));
  return voice.find((id) => has((FONT as { ui?: string }).ui ?? FONT.text, PAIRS[id].text)) ?? voice[0] ?? null;
})();
/** The name as a wordmark (the pairing's wordmark weight, tracked for its size), never two letters touching. */
const wordmarkAt = (size: number): React.CSSProperties => {
  const base = PAIR ? wordmarkStyle(PAIR, size, TYPE_FAMILY) : { ...typeStyle('display', size), lineHeight: 1 };
  const track = parseFloat(String(base.letterSpacing)) || 0;
  const fam = String(base.fontFamily);
  return { ...base, letterSpacing: `${safeTrack(UPDATE.name, `${base.fontWeight} ${fam}`, size, track)}em` };
};

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
/**
 * The card's state: where it is, its box, scale, opacity, how far it has opened (1 whole; under 1 a hairline growing
 * across, then opening down: the 'open' arrival, the first split card, and in reverse the fold into the bar of light), and
 * which change's screen it shows (a -> b by mix; recap: the recap face).
 */
type CS = { cx: number; cy: number; w: number; h: number; k: number; o: number; open: number; a: number; b: number; mix: number; recap: number };
/**
 * The card's scale at rest: the changed screen fills the frame on its beat (two thirds of the frame's height at least,
 * never past 86 % of it or 84 % of its width), built at film size so it reads at any of these.
 */
const restK = (i: number) => Math.min(Math.max(1, (0.66 * H) / SIZES[i].h), (0.86 * H) / SIZES[i].h, (0.84 * W) / SIZES[i].w);
const placed = (i: number): CS => ({ cx: W / 2, cy: H / 2, w: SIZES[i].w, h: SIZES[i].h, k: restK(i), o: 1, open: 1, a: i, b: i, mix: 1, recap: 0 });
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
  const ch = N === 4 ? 330 * U : Math.round(cw * 0.8);
  const slot = (j: number) => {
    const c = j % cols;
    const r = Math.floor(j / cols);
    const rows = Math.ceil(N / cols);
    return { x: W / 2 + (c - (cols - 1) / 2) * (cw + gap), y: H / 2 + (r - (rows - 1) / 2) * (ch + gap) };
  };
  return { cw, ch, slot };
})();
const recapState = (j: number): CS => ({ cx: RECAP.slot(j).x, cy: RECAP.slot(j).y, w: RECAP.cw, h: RECAP.ch, k: 1, o: 1, open: 1, a: j, b: j, mix: 1, recap: 1 });

/** One move of the card; `fade`: its opacity reaches the end state this many times faster than the move; `cross`: where in the move the screens cross. */
type Key = { f0: number; f1: number; A: CS; B: CS; ease: (t: number) => number; fade?: number; cross?: [number, number] };
const lerpCS = (A: CS, B: CS, p: number, mixP: number): CS => ({
  cx: mix(A.cx, B.cx, p), cy: mix(A.cy, B.cy, p), w: mix(A.w, B.w, p), h: mix(A.h, B.h, p), k: lmix(A.k, B.k, p), o: mix(A.o, B.o, p), open: mix(A.open, B.open, p),
  a: A.a === B.a ? A.a : A.b, b: B.b, mix: A.b === B.b ? 1 : mixP, recap: mix(A.recap, B.recap, mixP),
});
/** Held until the move's last frame, then the end state (a card drawn by a device or a handover until then). */
const atEnd = (t: number) => (t >= 1 ? 1 : 0);
/** The card's whole path through the film: one keyframe per arrival, gap, fold and recap (built once). */
const KEYS = lazy((): Key[] => {
  const keys: Key[] = [];
  const fold = (i: number, f: [number, number]) => {
    keys.push({ f0: f[0], f1: f[1], A: placed(i), B: { ...placed(i), open: 0 }, ease: E.linear });
    keys.push({ f0: f[1], f1: f[1] + f60(10), A: { ...placed(i), open: 0 }, B: { ...placed(i), open: 0, o: 0 }, ease: E.softOut });
  };
  TIMES.forEach((t, i) => {
    if (t.shape === 'lead' && t.fold && i > 0) fold(i - 1, t.fold);
    const P = placed(i);
    if (t.arrival === 'gap') {
      const g = inGap(i);
      if (i === 0) keys.push({ f0: t.gap![0], f1: t.gap![1], A: { ...g, open: 0 }, B: g, ease: E.linear });
      else keys.push({ f0: t.gap![0], f1: t.gap![1], A: placed(i - 1), B: g, ease: E.strongInOut });
      // the screens cross while the card is still small in the gap (never two layouts at size)
      keys.push({ f0: t.card[0], f1: t.card[1], A: g, B: P, ease: E.strongInOut, cross: [0, 0.22] });
    } else if (t.arrival === 'rise') keys.push({ f0: t.card[0], f1: t.card[1], A: below(i), B: P, ease: E.glideOut, fade: 5 });
    else if (t.arrival === 'open') keys.push({ f0: t.card[0], f1: t.card[1], A: { ...P, open: 0 }, B: P, ease: E.linear });
    else if (t.arrival === 'field') keys.push({ f0: t.card[0], f1: t.card[0] + 1, A: P, B: P, ease: E.linear }); // under the closing field the card is already there: the field closes onto it
    else keys.push({ f0: t.card[0], f1: t.card[1], A: { ...P, o: 0 }, B: P, ease: atEnd }); // device, morph: drawn by them until they land
    if (t.shape === 'show' && t.fold) fold(i, t.fold);
  });
  if (ENDS_ON_PICTURE) keys.push({ f0: CLOSE.gather, f1: CLOSE.gather + Math.round(BEAT), A: placed(N - 1), B: recapState(N - 1), ease: E.strongInOut });
  return keys.sort((p, q) => p.f0 - q.f0);
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
    const [c0, c1] = k.cross ?? [0.3, 0.7];
    const m = prog(F, k.f0 + (k.f1 - k.f0) * c0, k.f0 + (k.f1 - k.f0) * c1, E.stdInOut);
    s = lerpCS(k.A, k.B, p, m);
    if (k.fade) s.o = mix(k.A.o, k.B.o, clamp(((F - k.f0) / Math.max(1, k.f1 - k.f0)) * k.fade));
  }
  return s;
};

/** How far a card at rest stands off its ground (kit/card lift): on a light ground a light card reads by its shadow, so it
 * stands a little toward the lens; a held state, never a bob. */
const REST_LIFT = INK.dark ? 0.15 : 0.5;
/**
 * The card: kit/card's Card (the film's one material: an opaque lit face, a hairline and top highlight, contact and
 * ambient shadows), facing the lens. While it opens (open < 1) its box grows from a hairline across its width, then
 * opens down from the middle; the screen inside stays put, so it is revealed, never squashed (the fold runs it back).
 */
const Card: React.FC<{ s: CS; id: string; ground: string; children: React.ReactNode; lift?: number }> = ({ s, id, ground, children, lift = REST_LIFT }) => {
  if (s.o <= 0.003) return null;
  const across = s.open >= 1 ? 1 : E.strongInOut(clamp(s.open / 0.45));
  const down = s.open >= 1 ? 1 : E.strongInOut(clamp((s.open - 0.4) / 0.6));
  const bw = s.w * mix(0.04, 1, across);
  const bh = Math.max((3 * U) / Math.max(0.05, s.k), s.h * down);
  const r = Math.min(cardRadius(s.w), bh / 2);
  return (
    <div data-mover={id} style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, opacity: clamp(s.o), transform: `translate(${(s.cx - s.w / 2).toFixed(2)}px, ${(s.cy - s.h / 2).toFixed(2)}px) scale(${s.k.toFixed(5)})`, transformOrigin: '50% 50%' }}>
      <KitCard tone={CARD_TONE} w={bw} h={bh} x={(s.w - bw) / 2} y={(s.h - bh) / 2} r={r} ground={ground} accent={C.accent} lift={lift} u={U / Math.max(0.2, s.k)} id={id}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, transform: `translate(${(-(s.w - bw) / 2).toFixed(2)}px, ${(-(s.h - bh) / 2).toFixed(2)}px)`, opacity: clamp((down - 0.15) / 0.5) }}>{children}</div>
      </KitCard>
    </div>
  );
};

/** The screens inside the carried card: the one it leaves and the one it becomes; the recap face at the end. */
const CardFaces: React.FC<{ s: CS; F: number }> = ({ s, F }) => {
  const faces: { i: number; o: number }[] = s.a === s.b ? [{ i: s.b, o: 1 }] : [{ i: s.a, o: 1 - s.mix }, { i: s.b, o: s.mix }];
  return (
    <>
      {faces.filter((x) => x.o > 0.01 && s.recap < 0.99).map((x) => (
        <div key={x.i} style={{ position: 'absolute', left: 0, top: 0, width: SIZES[x.i].w, height: SIZES[x.i].h, opacity: x.o * (1 - s.recap), transform: `translate(${((s.w - SIZES[x.i].w) / 2).toFixed(2)}px, ${((s.h - SIZES[x.i].h) / 2).toFixed(2)}px)` }}>
          <Moment c={UPDATE.changes[x.i]} T={TIMES[x.i]} F={F} theme={T} w={SIZES[x.i].w} h={SIZES[x.i].h} noTip={!!TIMES[x.i].device && TIMES[x.i].device!.kind === 'scene'} />
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
/** Change i's card at rest in its place, its screen at frame F (the scene a creative device draws). */
const PlacedCard: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const s = placed(i);
  return (
    <Card s={s} id="card" ground={inkAt(F).ground}>
      <CardFaces s={s} F={F} />
    </Card>
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

/**
 * Change i's sentence, centred in the frame: alone (show, lead; risen from the bar the card folded into), on the field
 * (after), or parted round the card (split); leaving on the film's exit. The key word is always set apart: the field
 * line's scale-contrast sets it huge, a dealt line device swings or rolls it, any other line sets it in the accent.
 */
const ChangeLine: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const t = TIMES[i];
  const ch = UPDATE.changes[i];
  const c = copy(`change${i + 1}`);
  if (F < c.in || F >= c.out + EXIT_F) return null;
  const ink = inkAt(F);
  const onField = t.shape === 'after';
  const split = SPLIT()[i];
  const size = split ? split.size : lineSize(ch.words);
  const y = H / 2;
  const color = onField ? ON_FIELD : ink.type;
  const accent = onField ? ON_FIELD : ink.accent;
  const p = { id: `change${i + 1}`, at: c.in, frame: F, move: LINES.move[`change${i + 1}`], role: 'line' as const, size, x: W / 2, y, color, accent, mute: mixColor(color, onField ? FIELD : ink.ground, 0.55) };
  const dev = LINE_DEVICE[i];
  if (dev) {
    // a line device of the library (fx/creative): the field line's scale-contrast (the key word huge, the rest small
    // above and under it), or a dealt letter-swing / word-swap on the ground
    const words = spokenChange(ch).split(/\s+/).map((word, j) => ({ word, key: j === heroWord(i) }));
    const pal: Pal = scaled(i)
      ? { ground: FIELD, type: ON_FIELD, mute: mixColor(ON_FIELD, FIELD, 0.22), accent: ON_FIELD, surface: FIELD, line: mixColor(ON_FIELD, FIELD, 0.6), dark: ON_FIELD === '#FFFFFF' }
      : { ground: ink.ground, type: ink.type, mute: ink.mute, accent: ink.accent, surface: T.surface, line: T.line, dark: ink.dark };
    return (
      <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, c.out, size) }}>
        <CreativeLine cid={dev} cut={c.out} f={F - c.in} dur={c.out + EXIT_F - c.in} words={words} id={`change${i + 1}`} size={size} weight={TYPE.line.weight} track={TYPE.line.track} font={FONT.text} pal={pal} resolved={c.resolved - c.in} out={c.out - c.in} seed={DEAL_SEED % 997} swap={ch.swap} />
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, c.out, size) }}>
      {split ? <HeroLine {...p} text={split.text} /> : ch.words.includes('[]') ? <MarkLine {...p} text={ch.words} objects={[objectOf(ch)]} ground={onField || ink.dark ? 'dark' : 'light'} theme={T} /> : <HeroLine {...p} text={spokenChange(ch)} />}
    </div>
  );
};

/** A rectangle on the frame (px) with its corner radius. */
type Rect = { x: number; y: number; w: number; h: number; r: number };
/** Two rectangles mixed: the centre on a line, the sizes on a log scale (a growth reads as even). */
const lerpRect = (a: Rect, b: Rect, p: number): Rect => {
  const w = lmix(Math.max(1, a.w), Math.max(1, b.w), p);
  const h = lmix(Math.max(1, a.h), Math.max(1, b.h), p);
  const cx = mix(a.x + a.w / 2, b.x + b.w / 2, p);
  const cy = mix(a.y + a.h / 2, b.y + b.h / 2, p);
  return { x: cx - w / 2, y: cy - h / 2, w, h, r: mix(a.r, b.r, p) };
};
/** A card state's face on the frame. */
const rectOf = (s: CS): Rect => ({ x: s.cx - (s.w * s.k) / 2, y: s.cy - (s.h * s.k) / 2, w: s.w * s.k, h: s.h * s.k, r: cardRadius(s.w) * s.k });
/** A box (in a card's own px) on the frame while change i's card is placed. */
const onFrame = (i: number, e: { x: number; y: number; w: number; h: number; r?: number }): Rect => {
  const s = placed(i);
  return { x: s.cx + (e.x - s.w / 2) * s.k, y: s.cy + (e.y - s.h / 2) * s.k, w: e.w * s.k, h: e.h * s.k, r: (e.r ?? 0) * s.k };
};
/** The element that changed on change i's card (moments.tsx changedRect), on the frame while the card is placed. */
const changedOnFrame = (i: number): Rect => onFrame(i, changedRect(UPDATE.changes[i], placed(i).w, placed(i).h));
const FULL: Rect = { x: -24 * U, y: -24 * U, w: W + 48 * U, h: H + 48 * U, r: 0 };

/** The lit colour field through a rectangle of the frame (the baked field image, clipped). */
const FieldThrough: React.FC<{ r: Rect; o?: number; tint?: string; tintO?: number }> = ({ r, o = 1, tint, tintO = 0 }) => {
  const src = fieldSrc();
  return (
    <div data-ground="field" style={{ position: 'absolute', left: 0, top: 0, width: r.w, height: r.h, transform: `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px)`, borderRadius: r.r, overflow: 'hidden', opacity: o, background: FIELD }}>
      {src && <Img src={src} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${(-r.x).toFixed(2)}px, ${(-r.y).toFixed(2)}px)` }} />}
      {tint && tintO > 0 && <div style={{ position: 'absolute', inset: 0, background: tint, opacity: tintO }} />}
    </div>
  );
};

/**
 * The colour field of the 'after' change: the changed element (the pressed button, the block, the row, the bar) grows
 * into the whole frame as the lit accent field; the line reads on it; then it closes into the next card (turning to the
 * card's face as it lands), into a dot at the centre the next card's creative device starts from, or into the recap's
 * slot. Under it the ground takes its own colour event (eventAt), which settles once the field has gone.
 */
const Field: React.FC<{ F: number }> = ({ F }) => {
  const t = AFTER;
  if (!t?.field || F < t.field.in || F >= t.field.close[1]) return null;
  const f = t.field;
  const grow = prog(F, f.in, f.in + f.grow, E.strongInOut);
  const shut = prog(F, f.close[0], f.close[1], E.strongInOut);
  const tint = prog(F, f.in - f60(4), f.in + f60(4), E.stdInOut); // the element takes the field as it starts to grow
  let target: Rect;
  if (f.into === 'recap') target = rectOf(recapState(N - 1));
  else if (f.into === 'dot') {
    const c = rectOf(placed(t.i + 1));
    target = { x: c.x + c.w / 2 - 20 * U, y: c.y + c.h / 2 - 20 * U, w: 40 * U, h: 40 * U, r: 20 * U };
  } else target = rectOf(placed(t.i + 1));
  const r = shut > 0 ? lerpRect(FULL, target, shut) : lerpRect(changedOnFrame(t.i), FULL, grow);
  const toFace = f.into === 'dot' ? 0 : E.stdInOut(clamp((shut - 0.45) / 0.45));
  const o = shut > 0 ? (f.into === 'dot' ? 1 - clamp((shut - 0.85) / 0.15) : 1 - clamp((shut - 0.75) / 0.25)) : clamp(tint);
  return <FieldThrough r={r} o={o} tint={CARD_INKS.faceTop} tintO={toFace} />;
};

/**
 * One picture handing over to the next: the element that changed on the card before (its pressed button, the row, the
 * block) grows into the next card, turning from the accent to the card's face, the card before fading under it and the
 * new screen coming in as it lands. Never two layouts crossing at size.
 */
const Morph: React.FC<{ F: number }> = ({ F }) => {
  const t = TIMES.find((x) => x.arrival === 'morph' && F >= x.card[0] && F < x.card[1]);
  if (!t || t.i === 0) return null;
  const i = t.i;
  const p = clamp((F - t.card[0]) / Math.max(1, t.card[1] - t.card[0]));
  const e = E.strongInOut(p);
  const to = rectOf(placed(i));
  const r = lerpRect(changedOnFrame(i - 1), to, e);
  const old = placed(i - 1);
  const ink = inkAt(F);
  const fill = mixColor(T.accent, CARD_INKS.faceTop, E.stdInOut(clamp((p - 0.15) / 0.55)));
  const show = E.softOut(clamp((p - 0.62) / 0.38));
  return (
    <>
      <Card s={{ ...old, o: 1 - E.softOut(clamp(p / 0.5)) }} id="card-before" ground={ink.ground}>
        <CardFaces s={old} F={F} />
      </Card>
      <div data-mover="element" style={{ position: 'absolute', left: 0, top: 0, width: r.w, height: r.h, transform: `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px)`, borderRadius: r.r, background: fill, boxShadow: `0 ${(10 + 18 * e) * U}px ${(30 + 30 * e) * U}px ${-8 * U}px rgba(0, 0, 0, ${ink.dark ? 0.45 : 0.16})` }} />
      {show > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: show, clipPath: `inset(${r.y.toFixed(1)}px ${(W - r.x - r.w).toFixed(1)}px ${(H - r.y - r.h).toFixed(1)}px ${r.x.toFixed(1)}px round ${r.r.toFixed(1)}px)` }}>
          <PlacedCard i={i} F={F} />
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------------------------- creative devices
/** The inks a creative library device draws in: the ground family's, with the cards' own face. */
const palAt = (F: number): Pal => {
  const ink = inkAt(F);
  return { ground: ink.ground, type: ink.type, mute: ink.mute, accent: ink.accent, surface: T.surface, line: T.line, dark: ink.dark };
};
/** What a device can show of change i (fx/creative PictureData): the old way, the photos, the products it works with, its button. */
const dataOf = (i: number) => {
  const c = UPDATE.changes[i];
  const btn = buttonRect(c, placed(i).w, placed(i).h);
  return { before: beforeOf(c), photos: photosOf(c), logos: c.logos, button: btn ? (({ x, y, w, h }) => ({ x, y, w, h }))(onFrame(i, btn)) : undefined };
};
/**
 * A creative entrance (fx/creative) bringing change i's card in: the device draws the card at rest in its place (its
 * screen at that frame) its own way and ends on exactly that scene, so the card takes over with no seam.
 */
const Entrance: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const d = TIMES[i].device!;
  const box = rectOf(placed(i));
  return <CreativePicture id={d.id} f={F - d.from} dur={d.to - d.from} start={0} hits={d.hits} pal={palAt(F)} seed={(DEAL_SEED + i * 7919) % 997} scene={(f) => <PlacedCard i={i} F={d.from + f} />} focus={{ x: box.x, y: box.y, w: box.w, h: box.h }} radius={box.r / U} uid={`dev${i}`} data={dataOf(i)} />;
};
/** The pointer drawn while the camera pushes onto it (cursor-follow's own arrow: the tip at the point). */
const Pointer: React.FC<{ x: number; y: number; s: number; dark: boolean; o: number }> = ({ x, y, s, dark, o }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, opacity: o, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` }}>
    <svg width={s} height={s} viewBox="0 0 24 24" style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${((-5 / 24) * s).toFixed(2)}px, ${((-3 / 24) * s).toFixed(2)}px)`, overflow: 'visible', filter: `drop-shadow(0 ${(s * 0.06).toFixed(2)}px ${(s * 0.12).toFixed(2)}px rgba(0, 0, 0, ${dark ? 0.5 : 0.28}))` }}>
      <path d="M5 3 L5 19.6 L9.3 15.5 L12.2 21.7 L15.1 20.4 L12.2 14.3 L18.2 14.3 Z" fill={dark ? C.white : C.ink} stroke={dark ? C.ink : C.white} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  </div>
);
/**
 * cursor-follow on a tapped card: the camera pushes onto the pointer resting on the card (one move that lands on the
 * device's own close-up), then the library device rides the pointer to the button, clicks on the change's hit and pulls
 * back to the whole card reacting.
 */
const CursorScene: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const t = TIMES[i];
  const d = t.device!;
  const box = rectOf(placed(i));
  const fb = { x: box.x, y: box.y, w: box.w, h: box.h };
  const data = dataOf(i);
  const P = { ...CURSOR, zoom: CURSOR60.zoom, hold: CURSOR60.hold, reach: CURSOR60.reach };
  const push = f60(CURSOR60.push);
  const seed = (DEAL_SEED + i * 7919) % 997;
  const pal = palAt(F);
  const node = (f: number) => <PlacedCard i={i} F={d.from + f} />;
  if (F < d.from + push) {
    const btn = data.button;
    const to = btn ? { x: btn.x + btn.w * 0.8, y: btn.y + btn.h * 0.66 } : { x: fb.x + fb.w * 0.6, y: fb.y + fb.h * 0.58 };
    const from = cursorStart(to, fb, seed, P);
    const e = E.strongInOut(clamp((F - d.from) / push));
    const z = lmix(1, P.zoom, e);
    const look = { x: mix(W / 2, from.x, e), y: mix(H / 2, from.y, e) };
    const sx = (from.x - look.x) * z + W / 2;
    const sy = (from.y - look.y) * z + H / 2;
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${(W / 2 - look.x * z).toFixed(2)}px, ${(H / 2 - look.y * z).toFixed(2)}px) scale(${z.toFixed(5)})` }}>{node(F - d.from)}</div>
        <Pointer x={sx} y={sy} s={P.size * U * z} dark={CARD_TONE === 'dark'} o={E.softOut(clamp((e - 0.45) / 0.4))} />
      </div>
    );
  }
  const f0 = d.from + push;
  return <CreativePicture id="cursor-follow" f={F - f0} dur={d.to - f0} start={0} hits={[t.hit - f0]} pal={{ ...pal, dark: CARD_TONE === 'dark' }} seed={seed} scene={(f) => node(f + push)} focus={fb} radius={box.r / U} uid={`dev${i}`} data={{ button: data.button, params: { zoom: P.zoom, hold: P.hold, reach: P.reach } }} />;
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
const Badge: React.FC<{ p: number; size: number; id: string; accent: string }> = ({ p, size, id, accent }) => {
  const b = badgeOf(size);
  const dot = E.glideOut(clamp(p / 0.3));
  const wide = E.strongInOut(clamp((p - 0.08) / 0.62));
  const txt = E.snapOut(clamp((p - 0.45) / 0.5));
  const d = 0.42 * b.h;
  const w = mix(d, b.w, wide);
  const h = mix(d, b.h, wide);
  const onPill = toOklch(accent)[0] < 0.66 ? '#FFFFFF' : C.ink;
  return (
    <div style={{ position: 'relative', width: b.w, height: size * 1.18 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: h / 2, background: accent, transform: `translateY(${((size * 1.18 - h) / 2 + 0.04 * size).toFixed(2)}px) scale(${dot.toFixed(4)})`, transformOrigin: `${(d / 2).toFixed(2)}px 50%`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: txt, transform: `translateY(${((1 - txt) * 0.5 * b.h).toFixed(2)}px)` }}>
          <span data-text={id} style={{ fontFamily: FONT.text, fontSize: b.vs, fontWeight: 640, letterSpacing: '-0.01em', lineHeight: 1, color: onPill, whiteSpace: 'pre', ...tab }}>{UPDATE.version}</span>
        </div>
      </div>
    </div>
  );
};

const Hook: React.FC<{ F: number }> = ({ F }) => {
  if (F >= HOOK.out + EXIT_F) return null;
  const ink = inkAt(F);
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
          <span data-text="hook-name" style={{ ...typeStyle('display', size), color: ink.type, lineHeight: `${size * 1.18}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.name}</span>
        </MaskUp>
      </div>
      {vIn > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(left + nameW + gap).toFixed(2)}px, ${y.toFixed(2)}px)` }}>
          {badge ? (
            <Badge p={vIn} size={size} id="hook-version" accent={ink.accent} />
          ) : (
            <MaskUp p={vIn} size={size}>
              <Drum from={roll ? UPDATE.from : UPDATE.version} to={UPDATE.version} p={roll ? rollP : 1} size={size} color={mixColor(ink.accent, ink.type, 0.15 - 0.15 * accentFlash)} id="hook-version" />
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
/** A card (or the field) carries change N-1 into its recap slot; else every recap card comes in on its own. */
const ANCHORED = ENDS_ON_PICTURE || SHAPES[N - 1] === 'after';
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

/** The changes' cards joining the row: sliding out from behind the carried one (deal) or rising into place (rise). */
const recapEntry = (j: number, F: number): CS => {
  const rise = DEAL.recap === 'rise' || !ANCHORED;
  const at = CLOSE.gather + Math.round((rise ? 0.3 : 0.25) * BEAT) + RECAP_ON[ANCHORED ? j : Math.min(N - 1, j)];
  const p = prog(F, at, at + Math.round(0.9 * BEAT), rise ? E.glideOut : E.strongInOut);
  const to = recapState(j);
  if (!rise) {
    const from = recapState(N - 1);
    return { ...to, cx: mix(from.cx, to.cx, p), cy: mix(from.cy, to.cy, p), o: clamp(p * 4) };
  }
  return { ...to, cy: to.cy + (1 - p) * 90 * U, o: clamp(p * 4) }; // whole within its first quarter: never a see-through slab
};

const RecapRow: React.FC<{ F: number; top: boolean }> = ({ F, top }) => {
  if (F < CLOSE.gather || F >= SHRINK[1] + f60(4)) return null;
  const ink = inkAt(F);
  return (
    <>
      {UPDATE.changes.map((c, j) => {
        const carried = j === N - 1;
        if (carried !== top) return null; // the carried card is drawn over the others: they slide out from behind it
        if (carried && ANCHORED && F < CLOSE.recapIn) return null; // the carried card is still on its way into this slot
        const s = F < CLOSE.fold ? (carried && ANCHORED ? recapState(j) : recapEntry(j, F)) : foldState(j, F);
        const q = prog(F, SHRINK[0], SHRINK[1], E.strongInOut);
        return (
          <Card key={c.id} s={{ ...s, recap: 1 }} id={`recap-${j}`} ground={ink.ground}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - clamp(q * 2) }}>
              <RecapCard c={c} theme={T} w={recapState(j).w} h={recapState(j).h} glow={hitPulse(F - (CLOSE.recapGlints[j] ?? CLOSE.recapGlint), 3, 12)} />
            </div>
          </Card>
        );
      })}
    </>
  );
};

/**
 * The lockup: the mark, the name as a wordmark (the pairing's wordmark weight, tracked so no letters touch), and the
 * version apart from it (a real gap, lighter, in the accent), held to the end.
 */
const Lockup: React.FC<{ F: number }> = ({ F }) => {
  if (F < SHRINK[0]) return null;
  const ink = inkAt(F);
  const size = NAME.size * 0.9;
  const badge = DEAL.hook === 'badge';
  const wm = wordmarkAt(size);
  const nameWeight = Number(wm.fontWeight) || TYPE.display.weight;
  const nameTrack = parseFloat(String(wm.letterSpacing)) || 0;
  const nameW = measureTracked(UPDATE.name, size, nameWeight, nameTrack, String(wm.fontFamily));
  const verWeight = Math.max(400, nameWeight - 160);
  const verW = badge ? badgeOf(size).w : measureTracked(UPDATE.version, size, verWeight, TYPE.display.track, FONT.text, { tabular: true });
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
        <LogoMark logo={LOGO} size={MARK} fill={(part) => (ink.dark && part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? ink.type : undefined)} poses={(_, j) => (j === LOGO.parts.length - 1 ? { s: 1 + 0.06 * hitPulse(F - CLOSE.lockup, 2, 9) } : undefined)} />
      </div>
      {pB > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${nameX.toFixed(2)}px, ${y.toFixed(2)}px)`, width: (nameW + 24 * U) * pB, height: box, overflow: 'hidden' }}>
          <span data-text="wordmark" style={{ ...wm, color: ink.type, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block', transform: `translateX(${(-(1 - pB) * 0.3 * size).toFixed(2)}px)` }}>{UPDATE.name}</span>
        </div>
      )}
      {pC > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(nameX + nameW + gapNV).toFixed(2)}px, ${y.toFixed(2)}px)`, opacity: badge ? 1 : clamp(pC * 2) }}>
          {badge ? (
            <Badge p={pC} size={size} id="release" accent={ink.accent} />
          ) : (
            <MaskUp p={pC} size={size}>
              <span data-text="release" style={{ ...typeStyle('display', size), fontWeight: verWeight, ...tab, color: ink.accent, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.version}</span>
            </MaskUp>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the world
/** The colour field covers the whole frame (grown, not yet closing): the card under it is not drawn. */
const underField = (F: number) => !!AFTER?.field && F >= AFTER.field.in + AFTER.field.grow && F < AFTER.field.close[0];
/** The device playing at F, if any (an entrance bringing a card in, or cursor-follow on a card at rest). */
const deviceAt = (F: number) => TIMES.find((t) => t.device && F >= t.device.from && F < t.device.to);

export const World: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const s = cardAt(F);
  const dev = deviceAt(F);
  const ink = inkAt(F);
  const ev = eventAt(F);
  return (
    <AbsoluteFill style={{ background: ink.ground, overflow: 'hidden' }}>
      {/* the ground is lit once and holds still (fx/Grounds): its light changes only for the film's colour event */}
      <FamilyGround family={FAMILY} frame={0} seed={DEAL_SEED % 97} dark={F >= TURN} event={ev} />
      <RecapRow F={F} top={false} />
      {dev?.device?.kind === 'entrance' ? (
        <Entrance i={dev.i} F={F} />
      ) : dev?.device?.kind === 'scene' ? (
        <CursorScene i={dev.i} F={F} />
      ) : (
        F < CLOSE.recapIn && !underField(F) && (
          <Card s={s} id="card" ground={ink.ground}>
            <CardFaces s={s} F={F} />
          </Card>
        )
      )}
      <Morph F={F} />
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
