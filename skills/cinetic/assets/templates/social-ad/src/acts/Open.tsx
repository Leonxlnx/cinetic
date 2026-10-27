import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { blurFilter, OVERSIZE_FIRST } from '../fx/Oversize';
import { DirBlur } from '../fx/Defocus';
import { pileState } from '../fx/Stack';
import { E, lmix, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { buildStarts, copy, CUE, DEALS, f60x, H, W } from '../timeline';
import { AD } from '../ad';
import { adSize, adStyle, adWidth, PictureCard, circOut, cubicOut, PAGE, useAbs } from './stage';

// OPEN - two shots. The opener is built word by word: its first word (the name) cuts in at x2.67, defocused, and
// settles in 24 f; it snaps sharp when the second word lands. Each new word lands at the line's end in the accent and
// cools to ink when the next one arrives, while the line glides to stay centred and relaxes 7 % (cubic-out 24 f).
// The finished line breathes apart (6.6 px/f) through the cut; on the pile the two words carry on along the same
// paths (circ-out, grey to ink) either side of a hero card that settles from x1.16 while pictures are dealt onto it.

/** The opener's measured house numbers: the first word's oversize and settle, the relax per word, the spread. */
export const OPENER = { from: OVERSIZE_FIRST.from, settle: OVERSIZE_FIRST.dur60, defocus: OVERSIZE_FIRST.defocus, glide: 24, relax: 0.07, cool: 13, spread: 6.6 } as const;

export const Open: React.FC = () => {
  const F = useAbs('open');
  const what = copy('what');
  const words = what.text.trim().split(/\s+/);
  const n = words.length;
  const size = adSize(what.text);
  const starts = buildStarts(what.in, n);
  const ws = words.map((w) => adWidth(w, size));
  const space = adWidth('a a', size) - 2 * adWidth('a', size);
  const xs = ws.map((_, i) => ws.slice(0, i).reduce((a, b) => a + b + space, 0));
  // the line's centre and scale glide from one landing to the next
  let c = ws[0] / 2;
  let s = (1 + OPENER.relax) ** (n - 1);
  for (let i = 1; i < n; i++) {
    const e = cubicOut((F - starts[i]) / f60x(OPENER.glide));
    if (F < starts[i]) break;
    c = mix(c, (xs[i] + ws[i]) / 2, e);
    s = mix(s, s / (1 + OPENER.relax), e);
  }
  const total = xs[n - 1] + ws[n - 1];
  const spreadT = Math.max(0, F - CUE.spread);
  const first = lmix(OPENER.from, 1, E.glideOut(prog(F, starts[0], starts[0] + f60x(OPENER.settle), E.linear)));
  const sharp = n > 1 && F >= starts[1];
  const colour = (i: number) => {
    const next = i + 1 < n ? starts[i + 1] : starts[i] + f60x(30);
    return F < next ? PAGE.accent : mixColor(PAGE.accent, PAGE.text, 1 - (1 - prog(F, next, next + f60x(OPENER.cool), E.linear)) ** 2);
  };
  // shot 2: the pile and its two words
  const [left, right] = AD.lines.save;
  const cardH = 0.46 * H;
  const cardW = cardH * 0.78;
  const settle = lmix(1.16, 1, E.snapOut(prog(F, CUE.pile, CUE.pile + f60x(20), E.linear)));
  const pile = pileState(F, { arrivals: DEALS }, useFilm());
  const fast = pile.cards.reduce((m, k) => Math.max(m, Math.abs(k.v)), 0);
  const carry = 140 * U * circOut((F - CUE.pile) / f60x(72));
  const ink = mixColor(PAGE.mute, PAGE.text, circOut((F - CUE.pile) / f60x(72)));
  const gap = 90 * U;
  const lineTop = H / 2 - (size * 1.1) / 2;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      {F < CUE.pile && (
        <div data-text="what" style={{ position: 'absolute', left: W / 2, top: lineTop, transformOrigin: '0 50%', transform: `scale(${s.toFixed(5)}) translateX(${(-c).toFixed(2)}px)` }}>
          {words.map((w, i) => {
            if (F < starts[i]) return null;
            const k = (xs[i] + ws[i] / 2 - total / 2) / (total / 2); // -1 .. 1: how far out the word sits
            const dx = k * OPENER.spread * U * spreadT;
            const one = i === 0 ? first : 1;
            return (
              <span key={i} style={{ ...adStyle(size, colour(i)), position: 'absolute', left: xs[i], top: 0, transformOrigin: '50% 60%', transform: `translate3d(${dx.toFixed(2)}px, 0, 0) scale(${one.toFixed(5)})`, filter: i === 0 && !sharp ? blurFilter(OPENER.defocus * U) : undefined }}>
                {w}
              </span>
            );
          })}
        </div>
      )}
      {F >= CUE.pile && (
        <>
          <div style={{ position: 'absolute', left: W / 2, top: H / 2, transform: `scale(${settle.toFixed(5)})` }}>
            <div style={{ position: 'absolute', left: -cardW / 2, top: -cardH / 2 }}>
              <PictureCard i={0} w={cardW} h={cardH} />
            </div>
          </div>
          <DirBlur v={fast / U} angle={pile.angle} id="pile">
            {pile.cards.map((k) => (
              <div key={k.i} style={{ position: 'absolute', left: W / 2 - cardW / 2, top: H / 2 - cardH / 2, opacity: k.opacity, transform: `translate3d(${k.x.toFixed(2)}px, ${k.y.toFixed(2)}px, 0) rotate(${k.rot.toFixed(3)}deg) scale(${k.scale.toFixed(5)})` }}>
                <PictureCard i={k.i + 1} w={cardW} h={cardH} />
              </div>
            ))}
          </DirBlur>
          <div data-text="save" style={{ position: 'absolute', left: 0, top: lineTop, width: W, height: size * 1.1 }}>
            <span style={{ ...adStyle(size, ink), position: 'absolute', right: W / 2 + cardW / 2 + gap + carry, top: 0 }}>{left}</span>
            <span style={{ ...adStyle(size, ink), position: 'absolute', left: W / 2 + cardW / 2 + gap + carry, top: 0 }}>{right}</span>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
