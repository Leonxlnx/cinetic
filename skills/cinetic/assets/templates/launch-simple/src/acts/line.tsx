// The line: one sentence, centred in the middle band, in the film's one voice (deal.ts voice), the key word in the
// accent ink. Set with care: a statement's cap is 7.4 % of the frame height (the claim, the film's last line, 8.6 % and
// a step heavier: the statements sit a step under the type family's line weight, so the lines have a hierarchy in one
// face), its tracking tightens as it grows, a long line keeps one row at a sentence cap (6-6.4 %) or breaks into two balanced
// rows, never shrinks under a 6 % cap. Its text sits on its own composited layer while it is sharp (layer.tsx
// usePromote), so the camera float and the line's slow creep move it sub-pixel; the blur voice's soft start goes
// through layer.tsx Soft (fixed levels). Two rows part while they are read (the first drifting one way, the second the
// other, slower): two planes of type under one camera.
import React from 'react';
import { FONT, TYPE, U } from '../brand/tokens';
import type { FamilyInks } from '../fx/Grounds';
import { arrive, clamp, E, mix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { DEAL } from '../deal';
import { LAUNCH } from '../launch';
import { copy, FPS, H, keyWords, VOICE, W } from '../timeline';
import { Soft, usePromote } from './layer';

/**
 * Statement type (shares of the frame): the cap target, the claim's (the last line), the sentence band a long line may
 * drop to on one row, the widths (one row at the target up to `width`, a sentence row up to `sentence.width`: under
 * look-audit's 61 % and 75 % lines once the read's creep has grown it), the leading of two rows and the floor.
 */
export const LINE_TYPE = { weight: Math.max(400, TYPE.line.weight - 60), claimWeight: Math.min(800, TYPE.line.weight + 80), cap: 0.727, target: 0.074, claim: 0.086, sentence: { lo: 0.06, hi: 0.064, width: 0.72 }, width: 0.585, lead: 1.06, floor: 0.06 } as const;
/** Tracking for a display size (px): -0.01 em at 60 px tightening to -0.03 em at 130 px and over (letters kept apart). */
export const trackFor = (size: number) => -0.01 - 0.02 * clamp((size - 60) / 70);

/** The film's claim: its last line, set larger. */
export const isClaim = (id: string) => id === `line${LAUNCH.pairs.length}`;

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
export const lineLayout = (text: string, claim = false): { size: number; rows: number[] } => {
  const words = text.split(/\s+/).filter(Boolean);
  const target = capPx(claim ? LINE_TYPE.claim : LINE_TYPE.target);
  // one row at the target
  const wt = weightOf(claim);
  if (widthOf(text, target, wt) <= W * LINE_TYPE.width) return { size: target, rows: [words.length] };
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

/** The life of a line while it is read: a slow push (scale per second about its centre) and a sideways drift (px at
 * 1080p per second, centred on the read so the line stays centred; odd lines drift right, even ones left; of two rows
 * the second drifts against the first at PART of its speed). */
export const LINE_CREEP = 0.015;
export const LINE_DRIFT = 18;
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
  const words = keyWords(raw);
  const text = words.map((w) => w.word).join(' ');
  const { size, rows } = lineLayout(text, isClaim(id));
  const track = trackFor(size);
  const wt = weightOf(isClaim(id));
  const m = (s: string) => measureTracked(s, size, wt, track, FONT.text, { trailing: false });
  const t = F - c.in;
  const k = FPS / 60;
  const voice = DEAL.voice;
  // the blur voice: the whole line out of a 12 px blur, gone by 60 % of its settle (still moving), settling from 104 %
  // on a glide
  const whole = voice === 'blur' ? E.glideOut(clamp(t / (VOICE.blur.dur * k))) : 1;
  const sigma = voice === 'blur' ? VOICE.blur.blur * clamp(1 - whole / 0.6) : 0;
  const push = (voice === 'blur' ? mix(VOICE.blur.from, 1, whole) : 1) * (1 + (LINE_CREEP * life * Math.max(0, t)) / FPS);
  const odd = Number(id.replace(/\D/g, '')) % 2 === 1;
  const read = (F - (c.in + c.out) / 2) / FPS; // seconds from the middle of the read
  const lineH = size * LINE_TYPE.lead;
  const top = cy - (rows.length * lineH) / 2;
  let first = 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: voice === 'blur' ? clamp(whole / 0.35) : 1, transformOrigin: `${W / 2}px ${cy}px`, transform: `scale(${push.toFixed(5)})` }}>
      <Soft sigma={sigma}>
        {rows.map((n, r) => {
          const row = words.slice(first, first + n);
          const i0 = first;
          first += n;
          // re-centre (build): each new word of the row pushes it half its width left, settling on a glide (24 f)
          const ends = row.map((_, i) => m(row.slice(0, i + 1).map((w) => w.word).join(' ')));
          let offset = 0;
          if (voice === 'build') for (let i = 1; i < row.length; i++) offset += ((ends[i] - ends[i - 1]) / 2) * (1 - E.glideOut(clamp((t - (i0 + i) * VOICE.build.stagger * k) / (VOICE.build.recentre * k))));
          // the read's drift: one row drifts with the line's side; a second row drifts against it, slower (the rows part)
          const dir = (odd ? 1 : -1) * (r === 0 ? 1 : -LINE_PART);
          const drift = dir * LINE_DRIFT * life * U * read;
          return (
            <Text key={r} id={id} x={offset + drift} y={top + r * lineH} width={W} style={{ textAlign: 'center', fontFamily: FONT.text, fontSize: size, fontWeight: wt, letterSpacing: `${track}em`, lineHeight: LINE_TYPE.lead, fontKerning: 'normal' }}>
              {row.map((w, j) => {
                const i = i0 + j;
                const s = i * (voice === 'build' ? VOICE.build.stagger : VOICE.ink.stagger) * k;
                const p = clamp((t - s) / ((voice === 'build' ? VOICE.build.fade : VOICE.ink.fade) * k));
                const a = voice === 'blur' ? 1 : E.snapOut(p);
                const inked = voice === 'ink' ? E.softOut(clamp((t - s) / (VOICE.ink.ink * k))) : 1;
                const col = w.key ? inks.accent : inks.type;
                const color = voice === 'ink' ? mixColor(mixColor(inks.type, inks.ground, 0.72), col, inked) : col;
                // the build's rise (and the ink voice's small one) ends while the word still travels (arrive): no settling tail
                const rise = voice === 'build' ? (1 - arrive(E.glideOut(p))) * 0.12 * size : voice === 'ink' ? (1 - arrive(E.glideOut(clamp((t - s) / (26 * k))))) * 0.06 * size : 0;
                return (
                  <React.Fragment key={j}>
                    {j > 0 ? ' ' : ''}
                    <span style={{ display: 'inline-block', color, opacity: a, transform: `translate3d(0px, ${rise.toFixed(3)}px, 0)` }}>{w.word}</span>
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
