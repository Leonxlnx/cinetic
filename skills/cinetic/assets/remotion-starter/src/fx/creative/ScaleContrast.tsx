// scale-contrast: one word huge, the rest small. The line's key word is set as large as the frame allows, heavy and
// tight, in the accent when the ground lets it read; the other words sit as a small line above it (the words before it)
// and under it (the words after), set in ink at a text weight, one centred composition. The giant word is centred on its ink (its first and last strokes), not its advance box. Two entrances, picked by the
// film's seed: `rise` (letters rise out of a mask one after another, starting wholly hidden) or `track` (the word
// tightens from wide tracking into place as it inks in). Held still once it lands.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor, toOklch } from '../../lib/color';
import { useFilm } from '../../lib/film';
import { inkBox } from '../../lib/measure';
import { frameOf, hash01, k60, type LineProps, type Recipe } from './core';
import { keyIndex, type RowFont, widthIn, WordAt } from './type';

/** House numbers (f@60, shares of the frame): the giant word's cap (at most) and width (at most), its weight and
 * tracking, the letters' stagger and rise, the small line's cap and its arrival after the giant word starts. */
export const SCALE = { cap: 0.3, width: 0.84, weight: 760, track: -0.045, stagger: 3, rise: 26, small: 0.036, smallAt: 10, smallDur: 20, gap: 0.05, spread: 0.32 } as const;

export const RECIPE: Recipe = {
  id: 'scale-contrast',
  recipe:
    'One word huge, the rest small: the key word as large as the frame allows (cap up to 30 % of the height, 84 % of the width, weight 760, -0.045 em), in the accent when it reads on the ground (else ink), centred on its ink; it enters by the film\'s seed, its letters rising out of a mask 3 f apart from wholly hidden (glideOut 26 f), or tightening from +0.32 em into place as it inks in (26 f); the other words sit in ink at a text weight (cap 3.6 %) above it (the words before) and under it (the words after), arriving 10 f in. One centred composition, held still once it lands.',
  params: { ...SCALE },
};

/** When the composition is whole (f@60) for a key word of `chars` letters. */
export const scaleResolve = (chars: number) => Math.max(SCALE.stagger * Math.max(0, chars - 1) + SCALE.rise, SCALE.smallAt + SCALE.smallDur);

/** A letter's rise (0..1 travelled) at frame t (film frames). */
export const letterRise = (t: number, i: number, k: number) => E.glideOut(clamp((t - i * SCALE.stagger * k) / (SCALE.rise * k)));

/** The mask a rising letter comes out of, in shares of the font size from the giant word's box top: the window's top
 * and bottom, and the offset a letter starts from (its whole glyph, ascender included, below the window's bottom). */
export const MASK = { top: 0.08, bottom: 1.2, from: 1.16 } as const;

/** How a composition splits a line: the small words above, the key word, the small words under. */
export const scaleParts = (words: { word: string; key: boolean }[]) => {
  const ki = keyIndex(words);
  return { ki, before: words.slice(0, ki).map((w) => w.word).join(' '), key: words[ki].word, after: words.slice(ki + 1).map((w) => w.word).join(' ') };
};

/** The film's entrance for a seed. */
export const scaleEntrance = (seed = 0): 'rise' | 'track' => (hash01(seed, 17) < 0.5 ? 'rise' : 'track');

export const ScaleContrast: React.FC<LineProps> = ({ f, words, id, weight, track, font, pal, cy, seed = 0 }) => {
  const film = useFilm();
  const { W, H } = frameOf(film);
  const k = k60(film);
  const parts = scaleParts(words);
  const { before, key, after } = parts;
  const big: RowFont = { size: 100, weight: Math.max(weight, SCALE.weight), track: SCALE.track, font };
  const capK = 0.727; // cap height of the face as a share of its size
  const size = Math.min((SCALE.cap * H) / capK, (SCALE.width * W * 100) / Math.max(1, widthIn(key, big)));
  const B = { ...big, size };
  const small: RowFont = { size: (SCALE.small * H) / capK, weight: Math.min(560, Math.max(460, weight - 60)), track: Math.max(track, -0.01), font };
  const gap = SCALE.gap * H;
  const bigH = size * capK;
  const total = (before ? small.size * 1.06 + gap : 0) + bigH + (after ? gap + small.size * 1.06 : 0);
  const top = (cy ?? H / 2) - total / 2;
  const bigTop = top + (before ? small.size * 1.06 + gap : 0);
  const sIn = E.snapOut(clamp((f - SCALE.smallAt * k) / (SCALE.smallDur * k)));
  // the accent on the giant word when it stands off the ground (an L* gap that reads at this size), else ink
  const accentReads = Math.abs(toOklch(pal.accent)[0] - toOklch(pal.ground)[0]) >= 0.3;
  const bigInk = accentReads ? pal.accent : pal.type;
  const entrance = scaleEntrance(seed);
  const letters = [...key]; // lint-ok: hero word
  const wKey = widthIn(key, B);
  // centre on the ink: the advance box carries the first letter's left bearing and the last one's right bearing
  // (inkBox: the ink spans [left, right] from the pen's origin, untracked; the tracking moves the last stroke by
  // track x size per letter after the first). A measurement that does not look like this word falls back to the advance.
  const ink = inkBox(key, size, B.weight, font);
  const inkW = ink.right - ink.left + SCALE.track * size * Math.max(0, letters.length - 1);
  const sane = Number.isFinite(inkW) && inkW > wKey * 0.6 && inkW < wKey * 1.2;
  const x0 = sane ? W / 2 - ink.left - inkW / 2 : (W - wKey) / 2;
  // the giant word's line box: its glyphs sit so the cap height starts at bigTop (the face's ascent above the cap trimmed)
  const yBig = bigTop - size * 0.2;
  const winTop = yBig + size * MASK.top;
  const winBottom = yBig + size * MASK.bottom;
  let x = x0;
  const pos = letters.map((_, i) => {
    const lx = x;
    x += widthIn(letters.slice(0, i + 1).join(''), B) - widthIn(letters.slice(0, i).join(''), B);
    return lx;
  });
  const smallInk = mixColor(pal.type, pal.ground, 0.08);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {before && <WordAt id={id} text={before} x={(W - widthIn(before, small)) / 2} y={top + (1 - sIn) * 12} f={small} color={smallInk} opacity={sIn} />}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: entrance === 'rise' ? `polygon(0px ${winTop.toFixed(1)}px, ${W}px ${winTop.toFixed(1)}px, ${W}px ${winBottom.toFixed(1)}px, 0px ${winBottom.toFixed(1)}px)` : undefined }}>
        {/* the layout audit's box is the giant word's own (its letters), never the whole frame */}
        <div data-text={id} style={{ position: 'absolute', left: 0, top: 0, width: wKey, height: size * 1.06, transform: `translate3d(${x0.toFixed(2)}px, ${yBig.toFixed(2)}px, 0)` }}>
          {letters.map((ch, i) => {
            if (entrance === 'rise') {
              const r = letterRise(f, i, k);
              return <WordAt key={i} text={ch} x={pos[i] - x0} y={(1 - r) * size * MASK.from} f={B} color={bigInk} opacity={clamp(r * 4)} />;
            }
            // track: every letter starts spread from the word's centre and tightens into place, inking in
            const p = E.glideOut(clamp((f - Math.abs(i - (letters.length - 1) / 2) * SCALE.stagger * 0.6 * k) / (SCALE.rise * k)));
            const spread = (i - (letters.length - 1) / 2) * SCALE.spread * size * (1 - p);
            return <WordAt key={i} text={ch} x={pos[i] - x0 + spread} y={0} f={B} color={mixColor(pal.ground, bigInk, mix(0.15, 1, p))} opacity={E.snapOut(clamp(p * 1.6))} />;
          })}
        </div>
      </div>
      {after && <WordAt id={id} text={after} x={(W - widthIn(after, small)) / 2} y={bigTop + bigH + gap - small.size * 0.18 + (1 - sIn) * 12} f={small} color={smallInk} opacity={sIn} />}
    </div>
  );
};
