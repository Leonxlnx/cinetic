// CardFan (ui, enter / exit): a card lands by shrinking and fans its siblings out from behind it, holds, folds them
// back and leaves upward.
// Numbers: lands like NoticePile's first, gliding 340 px on an exponential tail (half-life 3.5 f) out of a light focus
// blur (12 px, halving every 2.5 f: sharp in ~8 f, never a smear); siblings slide out 8 f, 4 f apart; fold 9 f; exit up over
// 12 f.
// Caution: short titles on the cards behind; their bodies stay hidden.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { accel, approach, at, clamp, ease, mix } from '../../motion';
import { LAND, table, useUiFrame, withPace } from './_shared';

/**
 * A card that lands and fans out its siblings. The front card arrives by shrinking (1.30 to 1.0 over 12 f, out of a focus
 * blur that halves every 2.5 f, gliding in from the left on an exponential tail), is held, then the cards behind it slide out from exactly behind it (never from the frame
 * edge) up and to the left into a tilted fan, each showing its title line, 8 f each, 4 f apart, the group turning `turn` degrees (1.5); held; they fold back behind it (ease-in, the tilt going to 0) and the
 * single card leaves upward out of the frame, accelerating (each step 1.5x the last) with a vertical smear. `cards[0]` is the front.
 * Times relative to `at`: `fanAt`, `foldAt`, `exitAt`.
 */
const CardFanInner: React.FC<{
  cards: React.ReactNode[];
  at: number;
  w: number;
  h: number;
  fanAt?: number;
  foldAt?: number;
  exitAt?: number;
  x?: number;
  y?: number;
  /** Share of the card's width each one behind moves left. */
  spread?: number;
  /** Share of the card's height each one behind rises (0.42 leaves its title line in view). */
  lift?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
  /** The landing's focus blur in px at its first frame (halving every 2.5 f); 0: no blur. */
  blur?: number;
  /** How far the group turns while fanned, in degrees (0: it stays square to the frame). */
  turn?: number;
}> = ({ cards, at: start, w, h, fanAt = 26, foldAt = 70, exitAt = 84, x: xIn, y: yIn, spread = 0.07, lift = 0.4, speed = 1, blur = 12, turn = 1.5 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  if (t < 0) return null;
  const land = table(frame, start, LAND);
  // a focus blur that clears fast (it is depth, not a motion smear) and a glide that arrives already moving, with a tail
  const landBlur = blur * Math.pow(0.5, t / 2.5);
  const glide = -340 * (1 - approach(frame, start - 1, 3.5));
  const fold = at(frame, start + foldAt, 9, ease.in);
  const tilt = (1 - fold) * at(frame, start + fanAt, 14, ease.out);
  const up = accel(frame, start + exitAt, 12, 1.5);
  const exitY = -up * 900;
  const smear = up * 22;
  return (
    <div style={{ position: 'absolute', transform: `translate(${x - w / 2 + glide}px, ${y - h / 2 + exitY}px)`, left: 0, top: 0, width: w, height: h, perspective: 1800 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${-tilt * turn}deg) scale(${land})`, filter: landBlur + smear * 0.4 > 0.3 ? `blur(${landBlur + smear * 0.4}px)` : undefined }}>
        {cards
          .map((c, i) => {
            const out = i === 0 ? 0 : at(frame, start + fanAt + (i - 1) * 4, 8, ease.out) * (1 - fold);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `translate(${-out * spread * w * i}px, ${-out * lift * h * i}px)`,
                  opacity: i === 0 ? 1 : clamp(out * 4),
                  zIndex: 10 - i,
                }}
              >
                {c}
              </div>
            );
          })
          .reverse()}
      </div>
    </div>
  );
};

export const CardFan = withPace(CardFanInner);
