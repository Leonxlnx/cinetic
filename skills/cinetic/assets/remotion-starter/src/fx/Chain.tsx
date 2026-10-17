import React from 'react';
import { C, FONT, TYPE, U, typeStyle } from '../brand/tokens';
import { arrive, arriveK, blurIn, depart, E, easeOf, holdFor, pace as filmPace, type Pace, prog, wordCount } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { settleOf } from '../lib/sync';
import { chainOf, type Copy, f60, H, W } from '../timeline';

type Role = keyof typeof TYPE;
const split = (text: string) => text.split(/\s+/).filter(Boolean);

/** One fragment's frames (absolute): `settle` is its last word visibly at rest, where its one soft sound goes. */
export type FragmentFrames = { id: string; text: string; words: number; in: number; settle: number; resolved: number; out: number };

/** First frame and end frame of word i of a fragment that starts at `inF` (the last word ends exactly on COPY's resolved). */
const wordSpan = (inF: number, i: number, p: Pace) => [inF + f60(i * p.stagger), inF + f60(i * p.stagger + p.wordDur)] as const;

/** Options for chainFrames()/chainResolves(): the pace, and the type size the chain is drawn at. */
export type ChainTiming = {
  pace?: Pace;
  size?: number; // px the chain is set at (default: the line role at this frame size, TYPE.line.size * U)
};

/**
 * The frames of each fragment of a chain, in order: its first frame, `settle` (the frame its last
 * word's drawn position reaches 97% of its rise: where the fragment reads as landed, and where its
 * one soft `text` sound goes), COPY's `resolved` (every word fully in, what grid-check measures
 * holds from) and `out`. Chain draws a word through arrive(), which stops the rise early (vertical
 * text snaps to whole pixels; arriveK() depends on the rise in px), so the settle is measured on
 * that drawn curve, at the size the chain is set at: pass `size` when it is not the line role's.
 */
export const chainFrames = (chain: string, o: ChainTiming = {}): FragmentFrames[] => {
  const p = o.pace ?? filmPace;
  const size = o.size ?? TYPE.line.size * U;
  const ease = easeOf(p);
  return chainOf(chain).map((c) => {
    const n = wordCount(c.text);
    const [s, e] = wordSpan(c.in, Math.max(0, n - 1), p);
    const k = arriveK(p.rise * size, e - s, ease);
    return { id: c.id, text: c.text, words: n, in: c.in, settle: settleOf(s, e, (t) => arrive(ease(t), k)), resolved: c.resolved, out: c.out };
  });
};

/**
 * The frame each fragment of a chain lands on, for src/sync.ts: one soft `text` sound per fragment,
 * never one per word (a word-by-word patter makes a calm line sound busy). Pass the size the act
 * sets the chain at, so the sound meets the words' visible stop:
 *   chainResolves('statement', { size: STATEMENT_SIZE }).forEach((f, i) => ev.push({ f, kind: 'text', weight: 0.8, id: `statement${i + 1}` }));
 */
export const chainResolves = (chain: string, o: ChainTiming = {}) => chainFrames(chain, o).map((x) => x.settle);

export type ChainLayoutOpts = {
  role?: Role;
  size?: number; // px; default the role's size
  family?: string;
  x?: number; // the line's centre (align 'center') or left edge (align 'left'), px in the parent
  top?: number; // top of the line box, px in the parent; default: centred on the frame
  align?: 'center' | 'left';
  tail?: number; // px kept free after the line's last word (a period the act draws), counted in the centring
};

export type ChainLayout = {
  mode: 'build' | 'replace';
  size: number;
  top: number;
  /** Per fragment: its COPY entry, its words, and its offset from the line's left edge (0 in replace mode). */
  frags: { copy: Copy; words: string[]; left: number }[];
  /** Ink-to-ink width of the text once fragments 0..j are on (build) or of fragment j alone (replace), no tail. */
  width: number[];
  /** The line's left edge (px in the parent) once fragments 0..j are on (build) or for fragment j (replace). */
  lineLeft: number[];
};

/**
 * Layout of a chain from the real font (call it under FontGate, like every measurement). The act
 * reads it to place things by the text: the starter seats its dot after the last word with
 * lineLeft[last] + width[last].
 */
export const chainLayout = (chain: string, o: ChainLayoutOpts = {}): ChainLayout => {
  const list = chainOf(chain);
  const role = o.role ?? 'line';
  const { weight, track, lead } = TYPE[role];
  const size = o.size ?? TYPE[role].size * U;
  const family = o.family ?? FONT.text;
  const x = o.x ?? W / 2;
  const tail = o.tail ?? 0;
  const mode = list[0].mode ?? 'build';
  // CSS puts the (negative) tracking after the last glyph too, so a measured line ends one tracking
  // short of its last letter's advance: add it back for the visual width.
  const widthOf = (t: string) => measureTracked(t, size, weight, track, family) - track * size;
  const left = (w: number) => (o.align === 'left' ? x : x - (w + tail) / 2);
  const frags = list.map((copy, j) => ({
    copy,
    words: split(copy.text),
    left: mode === 'build' && j > 0 ? measureTracked(list.slice(0, j).map((c) => c.text).join(' ') + ' ', size, weight, track, family) : 0,
  }));
  const width = list.map((_, j) => widthOf(mode === 'build' ? list.slice(0, j + 1).map((c) => c.text).join(' ') : list[j].text));
  return { mode, size, top: o.top ?? H / 2 - (size * lead) / 2, frags, width, lineLeft: width.map(left) };
};

/**
 * A chain of copy fragments (timeline.ts chain()): one thought arriving 1-4 words at a time, with
 * the picture taking its turn between fragments. Each word rises `pace.rise` em over
 * `pace.wordDur` frames, `pace.stagger` apart, on easeOf(pace) (calm: 0.2 em, 36 f, 11 f, E.outSoft;
 * no blur, no overshoot), and lands through arrive(), so its vertical tail never ticks in whole
 * pixels. Two modes, from COPY:
 *   build    fragments append to one held line. A centred line re-centres for each new fragment on
 *            E.expo (an exponential glide, `pace.recentreDur`), starting `pace.recentreLead` frames
 *            before the fragment (never before the previous one's read hold is over), so the line
 *            makes room first and the new words rise into open space at their final place; the
 *            words already read ride the glide, the arriving ones never move sideways.
 *   replace  each fragment holds the line's place alone; it leaves over `pace.exitDur` and is gone
 *            before the next one rises (timeline.ts chain() times `out` for that).
 * Exit: the whole fragment together (`pace.exit` 'together': a fade on E.smooth and a
 * `pace.exitLift` em lift on E.exit through depart()), or word by word at half the stagger
 * ('words', the crisp profile). Colour: `accent` 'recency' brings the newest fragment in the accent
 * and relaxes it to ink over `pace.accentDur` frames once it has landed; 'hold' keeps the last
 * fragment in the accent (the payoff word); 'none' is ink throughout. Emphasis is colour, never
 * scale or bounce. Each fragment's span carries data-text = its COPY id (scripts/layout-audit.sh
 * matches it to its reading window). Transform-only placement; fractional frames are exact.
 */
export const Chain: React.FC<
  ChainLayoutOpts & {
    chain: string;
    frame: number; // local frame
    from?: number; // the act's first frame (absolute): COPY frames are absolute
    accent?: 'recency' | 'hold' | 'none';
    color?: string;
    accentColor?: string;
    pace?: Pace;
    style?: React.CSSProperties;
  }
> = ({ chain, frame, from = 0, accent = 'recency', color = C.ink, accentColor = C.accent, pace = filmPace, style, ...o }) => {
  const F = frame + from;
  const L = chainLayout(chain, o);
  const role = o.role ?? 'line';
  const family = o.family ?? FONT.text;
  const ease = easeOf(pace);
  const settles = chainFrames(chain, { pace, size: L.size }).map((x) => x.settle);
  const exitDur = f60(pace.exitDur);
  const last = L.frags.length - 1;

  // Build mode: the re-centre glides. Glide j moves the line from lineLeft[j-1] to lineLeft[j].
  const glide = L.frags.map(({ copy }, j) => {
    if (L.mode !== 'build' || j === 0 || o.align === 'left') return 0;
    const prev = L.frags[j - 1].copy;
    const start = Math.max(prev.resolved + f60(holdFor(wordCount(prev.text), pace)), copy.in - f60(pace.recentreLead));
    return prog(F, start, start + f60(pace.recentreDur), E.expo);
  });
  const lineX = L.lineLeft[0] + glide.reduce((x, g, j) => (j ? x + (L.lineLeft[j] - L.lineLeft[j - 1]) * g : x), 0);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, ...style }}>
      {L.frags.map(({ copy, words, left }, j) => {
        if (F < copy.in - 1 || F > copy.out + exitDur + f60(pace.stagger / 2) * words.length) return null;
        // build: the line's place, minus the share of its own glide (an arriving fragment stays put)
        const x = L.mode === 'build' ? lineX + left + (j ? (L.lineLeft[j] - L.lineLeft[j - 1]) * (1 - glide[j]) : 0) : L.lineLeft[j];
        const relax = accent === 'none' ? 1 : accent === 'hold' && j === last ? 0 : prog(F, settles[j], settles[j] + f60(pace.accentDur), E.smooth);
        return (
          <span
            key={copy.id}
            data-text={copy.id}
            style={{
              ...typeStyle(role, L.size),
              fontFamily: family,
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'inline-flex',
              flexWrap: 'nowrap',
              color: mixColor(accentColor, color, relax),
              transform: `translate(${x.toFixed(3)}px, ${L.top.toFixed(3)}px)`,
            }}
          >
            {words.map((w, i) => {
              const [s, e] = wordSpan(copy.in, i, pace);
              const p = prog(F, s, e, ease);
              const o0 = pace.exit === 'words' ? copy.out + f60((i * pace.stagger) / 2) : copy.out;
              const q = prog(F, o0, o0 + exitDur, E.exit); // the lift accelerates away
              const fade = prog(F, o0, o0 + exitDur, E.smooth); // the fade has no pop at either end
              const y = (1 - arrive(p, arriveK(pace.rise * L.size, e - s, ease))) * pace.rise - depart(q) * pace.exitLift;
              const b = blurIn(p, pace.blur);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    transform: `translateY(${y.toFixed(4)}em)`,
                    filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined,
                    opacity: p * (1 - fade),
                  }}
                >
                  {w}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};
