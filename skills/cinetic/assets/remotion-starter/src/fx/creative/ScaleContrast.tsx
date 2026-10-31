// scale-contrast: one word huge, the rest small. The line's key word is set as large as the frame allows, heavy and
// tight, its letters rising out of a mask one after another; the other words sit as a small line above it (the words
// before it) and under it (the words after), one centred composition. The size says what matters before it is read.
import React from 'react';
import { clamp, E } from '../../lib/anim';
import { useFilm } from '../../lib/film';
import { frameOf, k60, type LineProps, type Recipe } from './core';
import { keyIndex, type RowFont, widthIn, WordAt } from './type';

/** House numbers (f@60, shares of the frame): the giant word's cap (at most) and width (at most), its weight and
 * tracking, the letters' stagger and rise, the small line's cap and its arrival after the giant word starts. */
export const SCALE = { cap: 0.3, width: 0.86, weight: 760, track: -0.05, stagger: 3, rise: 26, small: 0.04, smallAt: 10, smallDur: 20, gap: 0.05 } as const;

export const RECIPE: Recipe = {
  id: 'scale-contrast',
  recipe:
    'One word huge, the rest small: the key word is set as large as the frame allows (cap up to 30 % of the height, 86 % of the width, weight 760, -0.05 em), its letters rising out of a mask 3 f apart (glideOut 26 f); the other words sit as a small line (cap 4 %) above it (the words before) and under it (the words after), arriving 10 f in. One centred composition, held still once it lands.',
  params: { ...SCALE },
};

/** When the composition is whole (f@60) for a key word of `chars` letters. */
export const scaleResolve = (chars: number) => Math.max(SCALE.stagger * Math.max(0, chars - 1) + SCALE.rise, SCALE.smallAt + SCALE.smallDur);

/** A letter's rise (0..1 travelled) at frame t (film frames). */
export const letterRise = (t: number, i: number, k: number) => E.glideOut(clamp((t - i * SCALE.stagger * k) / (SCALE.rise * k)));

export const ScaleContrast: React.FC<LineProps> = ({ f, words, id, weight, track, font, pal, cy }) => {
  const film = useFilm();
  const { W, H } = frameOf(film);
  const k = k60(film);
  const ki = keyIndex(words);
  const key = words[ki].word;
  const big: RowFont = { size: 100, weight: Math.max(weight, SCALE.weight), track: SCALE.track, font };
  const capK = 0.727; // cap height of the face as a share of its size
  const size = Math.min((SCALE.cap * H) / capK, (SCALE.width * W * 100) / Math.max(1, widthIn(key, big)));
  const B = { ...big, size };
  const small: RowFont = { size: (SCALE.small * H) / capK, weight: Math.max(450, weight - 80), track: Math.max(track, -0.012), font };
  const before = words.slice(0, ki).map((w) => w.word).join(' ');
  const after = words.slice(ki + 1).map((w) => w.word).join(' ');
  const gap = SCALE.gap * H;
  const bigH = size * capK;
  const total = (before ? small.size * 1.06 + gap : 0) + bigH + (after ? gap + small.size * 1.06 : 0);
  const top = (cy ?? H / 2) - total / 2;
  const bigTop = top + (before ? small.size * 1.06 + gap : 0);
  const sIn = E.snapOut(clamp((f - SCALE.smallAt * k) / (SCALE.smallDur * k)));
  const letters = [...key]; // lint-ok: hero word
  const wKey = widthIn(key, B);
  let x = (W - wKey) / 2;
  // the giant word's box: its glyphs sit so the cap height starts at bigTop (the face's ascent above the cap trimmed)
  const yBig = bigTop - size * 0.2;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {before && <WordAt id={id} text={before} x={(W - widthIn(before, small)) / 2} y={top + (1 - sIn) * 12} f={small} color={pal.mute} opacity={sIn} />}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `polygon(0px ${(yBig + size * 0.08).toFixed(1)}px, ${W}px ${(yBig + size * 0.08).toFixed(1)}px, ${W}px ${(bigTop + bigH + size * 0.3).toFixed(1)}px, 0px ${(bigTop + bigH + size * 0.3).toFixed(1)}px)` }}>
        <div data-text={id} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {letters.map((ch, i) => {
            const lx = x;
            x += widthIn(letters.slice(0, i + 1).join(''), B) - widthIn(letters.slice(0, i).join(''), B);
            const r = letterRise(f, i, k);
            return <WordAt key={i} text={ch} x={lx} y={yBig + (1 - r) * size * 0.9} f={B} color={pal.type} />;
          })}
        </div>
      </div>
      {after && <WordAt id={id} text={after} x={(W - widthIn(after, small)) / 2} y={bigTop + bigH + gap - small.size * 0.18 + (1 - sIn) * 12} f={small} color={pal.mute} opacity={sIn} />}
    </div>
  );
};
