// The line: one sentence, centred in the middle band, in the film's one voice (deal.ts voice), set in the film's dealt
// type pairing (fx/TypePairs, written into the tokens by scripts/type-deal.ts: PAIR below) with a hierarchy, never one
// size and one weight in plain ink: a line alone at a 7.4 % cap in the pairing's line weight, a line over its picture a
// step under it (6.6 %: it shares the frame), the claim, the film's last line and its hero, at 11.2 % in the hero weight,
// its last word taking the film's one contrasting entry (a snap from its left edge: one frame at x1.6, settling in 7 f,
// the words before it centred until it lands and then making room; timeline.ts HERO). Every line sets one key word
// apart in the pairing's emphasis weight: the word starred in launch.ts takes the accent ink as well; a line with no
// star sets its last content word heavier in its own ink (KEY_AUTO). Tracking is the pairing's optical tracking at the
// size; a long line keeps one row at a sentence cap (6-6.4 %) or breaks into two balanced rows, never shrinks under a
// 6 % cap. Its text sits on its own composited layer while it is sharp (layer.tsx usePromote); the blur voice's soft
// start goes through layer.tsx Soft (fixed levels). A finished line holds its place: no drift, no float.
import React from 'react';
import { FONT, TYPE, TYPE_FAMILY, U } from '../brand/tokens';
import { PAIR_IDS, PAIRS as TYPE_PAIRS, type PairId, roleSetting, stackOf, TYPE_FEATURES } from '../fx/TypePairs';
import type { FamilyInks } from '../fx/Grounds';
import { arrive, clamp, E, mix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { DEAL } from '../deal';
import { LAUNCH } from '../launch';
import { copy, FPS, H, HERO, heroSnapAt, keyWords, PAIRS, VOICE, W } from '../timeline';
import { Soft, usePromote } from './layer';

/**
 * The film's type pairing (fx/TypePairs), read from the tokens scripts/type-deal.ts wrote (FONT.text the voice, FONT.ui
 * the text face): one source, whoever dealt it (deck.py runs type-deal.ts --pair with the direction; type-deal.ts
 * --seed by hand). null for a brand face set with add-font.mjs: the tokens' own numbers then.
 */
export const PAIR: PairId | null = (() => {
  const first = (x?: string) => (x ?? '').split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  const v = first(FONT.text);
  const t = first((FONT as { ui?: string }).ui ?? FONT.text);
  const voiceOf = (id: PairId) => first(stackOf(TYPE_PAIRS[id].voice));
  return PAIR_IDS.find((id) => voiceOf(id) === v && first(stackOf(TYPE_PAIRS[id].text)) === t) ?? PAIR_IDS.find((id) => voiceOf(id) === v) ?? null;
})();
export const FAM = TYPE_FAMILY === 'bold' ? 'bold' : 'calm';
/** A voice role's weight in the pairing (the tokens' numbers without one). */
const roleWeight = (role: 'line' | 'display' | 'hero', fallback: number) => (PAIR ? roleSetting(PAIR, role, 120, FAM).weight : fallback);
/** The pairing's emphasis weight: a key word set apart from its line by weight (at least 140 over the line's weight). */
export const EMPHASIS_WEIGHT = Math.min(860, Math.max(PAIR ? TYPE_PAIRS[PAIR].emphasis : TYPE.line.weight + 200, roleWeight('line', TYPE.line.weight) + 140));

/**
 * Statement type (shares of the frame): the weights (the pairing's line weight for a statement, its hero weight for the
 * claim, its emphasis weight for a key word), the cap target, the claim's (the last line), the sentence band a long line
 * may drop to on one row, the widths (one row at the target up to `width`, a sentence row up to `sentence.width`: under
 * look-audit's 61 % and 75 % lines), the leading of two rows and the floor.
 */
export const LINE_TYPE = { weight: roleWeight('line', Math.max(400, TYPE.line.weight - 60)), claimWeight: roleWeight('hero', Math.min(800, TYPE.line.weight + 80)), keyWeight: EMPHASIS_WEIGHT, cap: 0.727, target: 0.074, over: 0.066, claim: 0.112, claimWidth: 0.72, sentence: { lo: 0.06, hi: 0.064, width: 0.72 }, width: 0.585, lead: 1.06, floor: 0.06 } as const;
/** Tracking for a display size (px): the pairing's optical tracking at that size; without a pairing -0.01 em at 60 px
 * tightening to -0.03 em at 130 px and over (letters kept apart). */
export const trackFor = (size: number) => (PAIR ? roleSetting(PAIR, 'line', size, FAM).track : -0.01 - 0.02 * clamp((size - 60) / 70));

/** Words a line never sets apart on its own (the automatic key word is the last word that is not one of them). */
const PLAIN = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'with', 'your', 'you', 'it', 'its', 'is', 'are', 'be', 'into', 'at', 'by', 'from', 'that', 'this', 'just', 'now', 'all', 'every', 'each', 'our', 'we', 'my', 'me', 'up', 'out', 'so', 'as', 'than', 'then', 'no', 'not']);
/** Whether a line with no starred word sets its last content word apart by weight (in its own ink, not the accent). */
export const KEY_AUTO = true;
/**
 * The line's words with the one set apart: the starred word (`key`: the accent ink and the emphasis weight), else,
 * with KEY_AUTO, the last content word (`strong`: the emphasis weight in the line's ink). One word a line, never two.
 */
export const keyed = (words: { word: string; key: boolean }[]): { word: string; key: boolean; strong: boolean }[] => {
  if (words.some((w) => w.key) || !KEY_AUTO || words.length < 2) return words.map((w) => ({ ...w, strong: w.key }));
  const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  let k = -1;
  for (let i = words.length - 1; i >= 0; i--) if (bare(words[i].word).length > 1 && !PLAIN.has(bare(words[i].word))) { k = i; break; }
  return words.map((w, i) => ({ ...w, strong: i === k }));
};

/** The film's claim: its last line, the hero, set largest. */
export const isClaim = (id: string) => id === `line${LAUNCH.pairs.length}`;
/** A line that shares the frame with its picture (launch.ts beat with or over): a step smaller. */
export const isOver = (id: string) => PAIRS[Number(id.replace(/\D/g, '')) - 1]?.mode !== 'alone';

const capPx = (cap: number) => (cap * H) / LINE_TYPE.cap;
const widthOf = (s: string, size: number, wt: number = LINE_TYPE.weight) => measureTracked(s, size, wt, trackFor(size), FONT.text, { trailing: false });
/** A line's weight: the claim a step heavier than the statements. */
export const weightOf = (claim: boolean) => (claim ? LINE_TYPE.claimWeight : LINE_TYPE.weight);

/** The two rows of a line broken where they balance best (the longer row as short as it can be). */
const balance = (words: string[], size: number, wt: number): [string[], string[]] => {
  let best: [string[], string[]] = [words, []];
  let bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const w = Math.max(widthOf(words.slice(0, i).join(' '), size, wt), widthOf(words.slice(i).join(' '), size, wt));
    if (w < bw) [bw, best] = [w, [words.slice(0, i), words.slice(i)]];
  }
  return best;
};

/** How a line is set: its size (px) and its rows (word counts per row). Browser only (it measures with the film's face). */
export const lineLayout = (text: string, claim = false, over = false): { size: number; rows: number[] } => {
  const words = text.split(/\s+/).filter(Boolean);
  const target = capPx(claim ? LINE_TYPE.claim : over ? LINE_TYPE.over : LINE_TYPE.target);
  // one row at the target (the hero line may run wider: it is the one big line)
  const wt = weightOf(claim);
  if (widthOf(text, target, wt) <= W * (claim ? LINE_TYPE.claimWidth : LINE_TYPE.width)) return { size: target, rows: [words.length] };
  // one row at a sentence cap (a statement, never the claim, which takes two rows before it gets smaller)
  if (!claim) {
    const s = Math.min(capPx(LINE_TYPE.sentence.hi), (W * LINE_TYPE.sentence.width * 100) / widthOf(text, 100, wt));
    if (s >= capPx(LINE_TYPE.sentence.lo)) return { size: s, rows: [words.length] };
  }
  if (words.length < 2) return { size: Math.max(capPx(LINE_TYPE.floor), (W * LINE_TYPE.sentence.width * 100) / widthOf(text, 100, wt)), rows: [1] };
  // two balanced rows at the target, shrinking only as far as they must
  const [a, b] = balance(words, target, wt);
  const wide = Math.max(widthOf(a.join(' '), 100, wt), widthOf(b.join(' '), 100, wt));
  const size = Math.max(capPx(LINE_TYPE.floor), Math.min(target, (W * LINE_TYPE.width * 100) / wide));
  return { size, rows: [a.length, b.length] };
};
/** A statement's size (px), for code that only needs the size. */
export const lineSize = (text: string, claim = false) => lineLayout(text, claim).size;

/** The life of a line while it is read: a slow push (scale per second about its centre). No sideways drift: a line
 * holds its place (LINE_DRIFT 0; the camera never wanders off and back). */
export const LINE_CREEP = 0.015;
export const LINE_DRIFT = 0;
export const LINE_PART = 0.6;

/** Text set on its own composited layer while its layer is sharp (sub-pixel moves, no whole-pixel ticks). */
export const Text: React.FC<{ id?: string; x: number; y: number; style: React.CSSProperties; children: React.ReactNode; width?: number }> = ({ id, x, y, style, children, width }) => {
  const promote = usePromote();
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, whiteSpace: 'pre', transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined, ...style }}>
      <span data-text={id} style={{ display: 'inline-block' }}>
        {children}
      </span>
    </div>
  );
};

/** One line in the film's one voice, centred on (W/2, cy). The key word (stars in launch.ts) takes the accent ink.
 * `life` scales its read's drift and creep: a line on a colour field (white on a mid tone, less contrast than on the
 * dark ground) needs about twice the travel to read as alive rather than frozen. */
export const Line: React.FC<{ id: string; raw: string; F: number; inks: FamilyInks; cy?: number; life?: number }> = ({ id, raw, F, inks, cy = H / 2, life = 1 }) => {
  const c = copy(id);
  const words = keyed(keyWords(raw));
  const text = words.map((w) => w.word).join(' ');
  const hero = isClaim(id);
  const { size, rows } = lineLayout(text, hero, isOver(id));
  const track = trackFor(size);
  const wt = weightOf(hero);
  const wOf = (w: { strong: boolean }) => (w.strong ? Math.max(LINE_TYPE.keyWeight, wt + 100) : wt);
  // a row's width up to each word, every word at its own weight (the key word is heavier)
  const space = measureTracked('a a', size, wt, track, FONT.text, { trailing: false }) - 2 * measureTracked('a', size, wt, track, FONT.text, { trailing: false });
  const ends = (row: typeof words) => {
    let x = 0;
    return row.map((w, i) => (x += (i ? space : 0) + measureTracked(w.word, size, wOf(w), track, FONT.text, { trailing: false })));
  };
  const t = F - c.in;
  const k = FPS / 60;
  const voice = DEAL.voice;
  // the hero line's last word: hidden until its snap (one frame at HERO.from x, settling in HERO.settle), a frame-whole
  // state (sub-frames never disagree on whether it is in)
  const last = words.length - 1;
  const snap = heroSnapAt(words.length) * k;
  const snapQ = Math.round(t) - snap;
  const snapScale = snapQ < 0 ? 1 : 1 + (HERO.from - 1) * (1 - E.snapOut(clamp(snapQ / (HERO.settle * k))));
  // until it comes, the words already there are centred on their own (never a ragged block that keeps the room for the
  // missing word); just before it snaps in they glide over and open its room (HERO.recentre, ending on the snap), so the
  // word lands in an open slot at its place, growing from its left edge away from the word before it
  const landed = hero ? E.glideOut(clamp((snapQ + HERO.recentre * k) / (HERO.recentre * k))) : 1;
  // the blur voice: the whole line out of a 12 px blur, gone by 60 % of its settle (still moving), settling from 104 %
  // on a glide
  const whole = voice === 'blur' ? E.glideOut(clamp(t / (VOICE.blur.dur * k))) : 1;
  const sigma = voice === 'blur' ? VOICE.blur.blur * clamp(1 - whole / 0.6) : 0;
  const push = (voice === 'blur' ? mix(VOICE.blur.from, 1, whole) : 1) * (1 + (LINE_CREEP * life * Math.max(0, t)) / FPS);
  const odd = Number(id.replace(/\D/g, '')) % 2 === 1;
  const read = (F - (c.in + c.out) / 2) / FPS; // seconds from the middle of the read
  const lineH = size * LINE_TYPE.lead;
  // a hero word alone on the last row: the rows above stand centred in the band until it lands
  const lone = hero && rows.length > 1 && rows[rows.length - 1] === 1;
  const top = cy - (rows.length * lineH) / 2 + (lone ? (1 - landed) * lineH * 0.5 : 0);
  let first = 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: voice === 'blur' ? clamp(whole / 0.35) : 1, transformOrigin: `${W / 2}px ${cy}px`, transform: `scale(${push.toFixed(5)})` }}>
      <Soft sigma={sigma}>
        {rows.map((n, r) => {
          const row = words.slice(first, first + n);
          const i0 = first;
          first += n;
          // re-centre (build): each new word of the row pushes it half its width left, settling on a glide (24 f)
          const end = ends(row);
          let offset = 0;
          // each word not yet there keeps the row centred on the words that are: the build re-centres as each word
          // arrives; the hero line's last word makes its room as it snaps in (landed), in every voice
          for (let i = 1; i < row.length; i++) {
            const isLast = hero && i0 + i === last;
            const there = isLast ? landed : voice === 'build' ? E.glideOut(clamp((t - (i0 + i) * VOICE.build.stagger * k) / (VOICE.build.recentre * k))) : 1;
            offset += ((end[i] - end[i - 1]) / 2) * (1 - there);
          }
          // the read's drift: one row drifts with the line's side; a second row drifts against it, slower (the rows part)
          const dir = (odd ? 1 : -1) * (r === 0 ? 1 : -LINE_PART);
          const drift = dir * LINE_DRIFT * life * U * read;
          return (
            <Text key={r} id={id} x={offset + drift} y={top + r * lineH} width={W} style={{ ...TYPE_FEATURES, textAlign: 'center', fontFamily: FONT.text, fontSize: size, fontWeight: wt, letterSpacing: `${track}em`, lineHeight: LINE_TYPE.lead }}>
              {row.map((w, j) => {
                const i = i0 + j;
                const s = i * (voice === 'build' ? VOICE.build.stagger : VOICE.ink.stagger) * k;
                const p = clamp((t - s) / ((voice === 'build' ? VOICE.build.fade : VOICE.ink.fade) * k));
                const snapped = hero && i === last;
                const a = snapped ? (snapQ >= 0 ? 1 : 0) : voice === 'blur' ? 1 : E.snapOut(p);
                const inked = voice === 'ink' ? E.softOut(clamp((t - s) / (VOICE.ink.ink * k))) : 1;
                const col = w.key ? inks.accent : inks.type;
                const color = voice === 'ink' ? mixColor(mixColor(inks.type, inks.ground, 0.72), col, inked) : col;
                // the build's rise (and the ink voice's small one) ends while the word still travels (arrive): no settling tail
                const rise = voice === 'build' ? (1 - arrive(E.glideOut(p))) * 0.12 * size : voice === 'ink' ? (1 - arrive(E.glideOut(clamp((t - s) / (26 * k))))) * 0.06 * size : 0;
                return (
                  <React.Fragment key={j}>
                    {j > 0 ? ' ' : ''}
                    <span style={{ display: 'inline-block', fontWeight: wOf(w), color: snapped ? col : color, opacity: a, transformOrigin: snapped ? '0% 62%' : '50% 62%', transform: snapped ? `scale(${snapScale.toFixed(4)})` : `translate3d(0px, ${rise.toFixed(3)}px, 0)` }}>{w.word}</span>
                  </React.Fragment>
                );
              })}
            </Text>
          );
        })}
      </Soft>
    </div>
  );
};
