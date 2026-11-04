// word-swap: one word of the line swaps in place. The line builds with its key word's slot showing the first of a few
// alternatives; the slot rolls (the word leaves upward out of a mask, the next rises in) on phrased beats, each a
// little sooner than the last, the row re-centring as the slot's width changes, and lands on the real word in the
// accent. "Plan trips / dinners / launches": the range said in one line.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { useFilm } from '../../lib/film';
import { frameOf, k60, type LineProps, type Recipe } from './core';
import { BUILD, buildFrames, keyIndex, type RowFont, rowOf, widthIn, wordIn, WordAt, fitRow } from './type';

/** House numbers (f@60): the wait after the build, the gaps between rolls (settling), a roll's length, its travel
 * (share of the size) and the slot's re-width. */
export const SWAP = { wait: 6, gaps: [20, 16, 13, 11] as const, roll: 8, travel: 0.86, rewidth: 14, settle: 6 } as const;

export const RECIPE: Recipe = {
  id: 'word-swap',
  recipe:
    'One word of the line swaps in place: the line builds (6 f apart, 16 f fades) with the key word\'s slot showing the first alternative; the slot rolls on settling beats (20, 16, 13 f apart), each word leaving upward out of a mask as the next rises in (8 f), the row re-centring as the slot\'s width changes (14 f), and lands on the real word in the accent. Give it 2-3 alternatives (launch.ts swap).',
  params: { ...SWAP, build: BUILD.stagger },
};

/** The roll onsets (f@60 from the line's first frame) for `a` alternatives before the real word, in an n-word line. */
export const swapRolls = (n: number, a: number) => {
  const out: number[] = [];
  let x = buildFrames(n) + SWAP.wait;
  for (let j = 0; j < a; j++) {
    out.push(x);
    x += SWAP.gaps[Math.min(j, SWAP.gaps.length - 1)];
  }
  return out;
};
/** When the line is whole (f@60): the real word landed and settled. */
export const swapResolve = (n: number, a: number) => (a ? swapRolls(n, a)[a - 1] + SWAP.roll + SWAP.settle : buildFrames(n));

/** Which word the slot shows at frame t (f in film frames) and the roll's progress (0 between rolls). */
export const swapState = (t: number, n: number, words: string[], k: number) => {
  const a = words.length - 1;
  const rolls = swapRolls(n, a).map((x) => x * k);
  let cur = 0;
  let p = 0;
  for (let j = 0; j < rolls.length; j++) {
    if (t >= rolls[j]) {
      const q = clamp((t - rolls[j]) / (SWAP.roll * k));
      if (q >= 1) cur = j + 1;
      else (cur = j), (p = q);
    }
  }
  const next = Math.min(cur + 1, a);
  // the slot's width eases from the current word to the next as the roll starts
  const wq = p > 0 ? E.glideOut(clamp(p * (SWAP.roll / SWAP.rewidth))) : 0;
  return { cur, next, p, wq };
};

export const WordSwap: React.FC<LineProps & { swap: string[] }> = ({ f, words, id, size, weight, track, font, pal, swap, cy }) => {
  const film = useFilm();
  const { W, H } = frameOf(film);
  const k = k60(film);
  const ki = keyIndex(words);
  const options = [...swap, words[ki].word];
  const base: RowFont = { size, weight, track, font };
  // fit the widest version of the line on one row
  const widest = options.reduce((m, o) => (widthIn(o, base) > widthIn(m, base) ? o : m), options[0]);
  const F = fitRow(words.map((w, i) => (i === ki ? widest : w.word)), base, W * 0.84);
  const st = swapState(f, words.length, options, k);
  const wCur = widthIn(options[st.cur], F);
  const wNext = widthIn(options[st.next], F);
  const slotW = mix(wCur, wNext, st.wq);
  const row = rowOf(words.map((w, i) => (i === ki ? options[st.cur] : w.word)), F, W);
  // lay the row out with the slot at its current width
  const xs: number[] = [];
  let x = (W - (row.total - wCur + slotW)) / 2;
  words.forEach((_, i) => {
    xs.push(x);
    x += (i === ki ? slotW : row.ws[i]) + row.space;
  });
  const y = (cy ?? H / 2) - F.size * 0.56;
  const travel = SWAP.travel * F.size;
  const e = E.snapOut(st.p);
  const final = st.cur === options.length - 1;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((w, i) => {
        const b = wordIn(f, i, k, F.size);
        if (i !== ki) return <WordAt key={i} id={id} text={w.word} x={xs[i]} y={y + b.rise} f={F} color={pal.type} opacity={b.opacity} />;
        // the slot: the current word leaving upward, the next rising in, both inside its mask
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `polygon(0px ${(y - 0.04 * F.size).toFixed(1)}px, ${W}px ${(y - 0.04 * F.size).toFixed(1)}px, ${W}px ${(y + 1.12 * F.size).toFixed(1)}px, 0px ${(y + 1.12 * F.size).toFixed(1)}px)` }}>
            <WordAt id={final ? id : undefined} text={options[st.cur]} x={xs[i] + (slotW - wCur) / 2} y={y + b.rise - e * travel} f={F} color={final ? pal.accent : pal.type} opacity={b.opacity * (1 - e * 0.6)} />
            {st.p > 0 && <WordAt id={st.next === options.length - 1 ? id : undefined} text={options[st.next]} x={xs[i] + (slotW - wNext) / 2} y={y + (1 - e) * travel} f={F} color={st.next === options.length - 1 ? pal.accent : pal.type} opacity={clamp(e * 1.6)} />}
          </div>
        );
      })}
    </div>
  );
};
