// letter-swing: the key word's letters swing into place on an arc. The line builds word by word (the house build, the
// row re-centring), the key word's slot held open; as the last word lands, the key word's letters swing up one after
// another from below and to the side, each turning about a pivot under its own baseline like a hand of a clock, landing
// upright in the accent with one small overshoot (a true landing) and holding still. The letters turn; nothing else
// does, and every letter ends at exactly zero degrees.
import React from 'react';
import { clamp, E } from '../../lib/anim';
import { useFilm } from '../../lib/film';
import { baselineOf } from '../../lib/measure';
import { frameOf, hash01, k60, type LineProps, type Recipe } from './core';
import { buildFrames, keyIndex, recentre, type RowFont, rowOf, widthIn, wordIn, WordAt } from './type';

/** House numbers (f@60): the stagger between letters, the swing's start angle (deg), the pivot's depth under the
 * baseline (share of the size), the time the swing takes to settle, the first crossing, the damping. */
export const SWING = { stagger: 3, from: 64, between: 34, pivot: 0.95, settle: 32, cross: 11, zeta: 0.5, fade: 7 } as const;

export const RECIPE: Recipe = {
  id: 'letter-swing',
  recipe:
    'The key word\'s letters swing into place on an arc: the line builds word by word (20 f fades, 6 f apart, re-centring) with the key word\'s slot held open; as the last word lands its letters swing up 3 f apart from 64 deg below and to the side away from the words beside it (the last word from the right, the first from the left, a word between them from 34 deg), each turning about a pivot 0.95 of the size under its own baseline, crossing upright at 11 f, one small overshoot (damped, zeta 0.5) and at exactly zero by 32 f, inking in the accent over 7 f. Held still once landed.',
  params: { ...SWING },
};

/** When a line of n words with a key word of `chars` letters is whole (f@60): the build, or the last letter's swing. */
export const swingResolve = (n: number, chars: number) => Math.max(buildFrames(n), 6 * Math.max(0, n - 1) + SWING.stagger * Math.max(0, chars - 1) + SWING.settle);

/** A letter's angle (deg) `t` f@60 after its swing starts: a damped swing from `from` that is exactly 0 from `settle` on. */
export const swingAngle = (t: number, from: number = SWING.from) => {
  if (t <= 0) return from;
  if (t >= SWING.settle) return 0;
  const wd = Math.PI / (2 * SWING.cross);
  const w0 = wd / Math.sqrt(1 - SWING.zeta ** 2);
  const a = from * Math.exp(-SWING.zeta * w0 * t) * Math.cos(wd * t);
  const win = 1 - E.stdInOut(clamp((t - SWING.settle * 0.55) / (SWING.settle * 0.45)));
  return a * win;
};

export const LetterSwing: React.FC<LineProps> = ({ f, words, id, size, weight, track, font, pal, cy, seed = 0 }) => {
  const film = useFilm();
  const { W, H } = frameOf(film);
  const k = k60(film);
  const F: RowFont = { size, weight, track, font };
  const ki = keyIndex(words);
  const row = rowOf(words.map((w) => w.word), F, W);
  const off = recentre(f, row.xs, row.ws, row.space, k);
  const yc = cy ?? H / 2;
  const y = yc - size * 0.53;
  // the letters swing up from the side away from the words beside them: the last word from the right, the first from
  // the left, a word between them on a shorter arc (a letter swinging in from the side of the word before it crosses
  // that word: "launchp a g e")
  const last = ki === words.length - 1;
  const first = ki === 0 && words.length > 1;
  const side = last ? 1 : first ? -1 : hash01(seed, 23) < 0.5 ? 1 : -1;
  const from = last || first ? SWING.from : SWING.between;
  const key = words[ki].word;
  const letters = [...key]; // lint-ok: the swinging word
  const t0 = 6 * Math.max(0, words.length - 1) * k;
  const base = baselineOf(size, weight, 1.06, font);
  let lx = row.xs[ki] + off;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((w, i) => {
        if (i === ki) return null;
        const b = wordIn(f, i, k, size);
        return <WordAt key={i} id={id} text={w.word} x={row.xs[i] + off} y={y + b.rise} f={F} color={pal.type} opacity={b.opacity} />;
      })}
      <div data-text={id} style={{ position: 'absolute', left: 0, top: 0, width: row.ws[ki], height: size * 1.06, transform: `translate3d(${(row.xs[ki] + off).toFixed(2)}px, ${y.toFixed(2)}px, 0)` }}>
        {letters.map((ch, j) => {
          const x = lx - (row.xs[ki] + off);
          const adv = widthIn(letters.slice(0, j + 1).join(''), F) - widthIn(letters.slice(0, j).join(''), F);
          lx += adv;
          const tl = (f - t0 - j * SWING.stagger * k) / k;
          const deg = side * swingAngle(tl, from);
          const op = E.snapOut(clamp(tl / SWING.fade));
          if (op <= 0) return null;
          return (
            <div key={j} style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: font, fontSize: size, fontWeight: weight, letterSpacing: `${track}em`, lineHeight: 1.06, fontKerning: 'normal', color: pal.accent, opacity: op, transformOrigin: `${(adv / 2).toFixed(2)}px ${(base + SWING.pivot * size).toFixed(2)}px`, transform: `translate3d(${x.toFixed(2)}px, 0px, 0) rotate(${deg.toFixed(3)}deg)` }}>
              {ch}
            </div>
          );
        })}
      </div>
    </div>
  );
};
