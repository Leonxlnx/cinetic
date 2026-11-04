// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// card-rivers: one word at the centre of a white world with two curved rivers of photo cards streaming past it, point
// for point opposite each other: the upper arm runs from the top edge down and out through the left edge, the lower
// arm from the bottom edge out through the right. The cards ride a helix in depth: small and a little soft where an
// arm comes in from far, sharp in its middle, large and soft where it passes the lens, so the word sits in a moving
// world without one card ever covering it. The word rises in on an expo-out, swaps mid-flow for the second word
// (cut on large and soft, shrinking on), and the rivers cruise, then accelerate harder and harder until the cards
// smear into curved streaks for the cut. 2.9 s. Big.
//
// Numbers (frames at 30 fps, px at 1080): arms are arcs of radius 1038 round (30, -510) and (1900, 1590), symmetric
// about (965, 540); cards 4:5, radius 22, a soft shadow (0, 8) blur 24 at 12 %, 250 x 320 mid-arm, 290 x 363 where an
// arm passes the lens, 240 x 300 where it comes from far, spaced 275 px along the arc (10-25 % overlap, each card over
// the one before it), 5-6 in view per arm. Speed along the arcs (px/f): 102 on the first frame braking to 50 by f3 and
// a cruise of 28-36, then 36 at f62, 56 at f71, 88 at f79, 166 at f85, 220 at f87 (ease-in); past 80 px/f the cards
// trail a smear 1.3x their per-frame travel. The word: cap about 45 px, near-black, rising 162 px -> 0 in 31 f
// (expo-out); the swap cuts on at f37.5 at x1.21 and soft, x1.0 by f47, then shrinks steadily to x0.70 at the cut.
import React from 'react';
import { FONT } from '../brand/tokens';
import { clamp, E, trackLinear } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, tab, useClock } from './parts';
import { hash, Picture, rgba, Stage1080 } from './stage1080';

export type CardRiversProps = {
  /** the word at the centre, and the word it swaps to mid-flow (one word each reads best; omit the second to hold one) */
  words: [string] | [string, string];
  /** the cards' pictures (public paths or URLs): what the product holds, makes or finds; 8 or more read as plenty */
  images: string[];
  /** ground: the world (default the film's paper); ink: the word; paper: an empty card */
  palette?: Partial<Palette>;
  frame?: number;
  seed?: number;
};

export const CARD_RIVERS = {
  dur: 87,
  r: 1038,
  centres: [[30, -510], [1900, 1590]] as const,
  arc: [18, 104] as const, // degrees: where an arm starts (past the top or bottom edge) and ends (past the side edge)
  edges: [29.4, 91.7] as const, // where an arm crosses the frame's edges
  gap: 275,
  card: { ratio: 1.25, r: 22 },
  // speed along the arcs, px per frame, by frame (the cruise trimmed to the part that reads)
  speed: [[0, 102], [0.5, 74], [2.5, 56], [3, 50], [5, 48], [7.5, 42], [10, 38], [15, 36], [22.5, 34], [32.5, 32], [42.5, 30], [57.5, 28], [62.5, 36], [67, 42], [71, 56], [73.5, 62], [77, 72], [79, 88], [81, 104], [82.5, 116], [84, 142], [85, 166], [86, 214], [87, 220]] as const,
  smear: { from: 80, k: 1.3, ghosts: 12 },
  rise: [[0, 162], [1, 135], [3, 103], [5, 83], [7, 67], [9, 54], [11, 44], [13, 35], [15, 28], [19, 16], [21, 12], [23, 8], [25, 5], [27, 3], [29, 1], [31, 0]] as const,
  swap: 37.5,
  first: [[0, 1], [33, 1], [36, 0.91]] as const, // the first word's scale (it shrinks a little and is gone at the swap)
  second: [[37.5, 1.21], [39, 1.21], [43, 1.04], [47.5, 0.96], [57.5, 0.9], [74, 0.85], [79, 0.82], [83.5, 0.77], [87, 0.705]] as const,
  size: 62,
} as const;

// the distance travelled along the arcs by frame (integrated once from the speed table, a quarter frame a step)
const TRAVEL: [number, number][] = (() => {
  const out: [number, number][] = [[0, 0]];
  let d = 0;
  for (let t = 0.25; t <= CARD_RIVERS.dur + 0.001; t += 0.25) {
    d += 0.25 * tab(t - 0.125, CARD_RIVERS.speed);
    out.push([t, d]);
  }
  return out;
})();
/** How far the rivers have run (px along the arcs) at frame t. */
export const riverTravel = (t: number) => trackLinear(t, TRAVEL);
/** The rivers' speed (px per frame) at frame t. */
export const riverSpeed = (t: number) => tab(t, CARD_RIVERS.speed);

/** A point on an arm (0: upper, 1: lower) at arc angle a (deg) and the travel direction there (deg on screen). */
export const armPoint = (arm: 0 | 1, a: number) => {
  const [cx, cy] = CARD_RIVERS.centres[arm];
  const r = CARD_RIVERS.r;
  const rad = (a * Math.PI) / 180;
  const sg = arm === 0 ? 1 : -1;
  return { x: cx + sg * r * Math.cos(rad), y: cy + sg * r * Math.sin(rad), dir: a + 90 + (arm === 0 ? 0 : 180) };
};

/** Where an arm is "far" (0) and where it passes the lens (1) at its frame-edge progress u (0 entry edge, 1 exit edge). */
const nearOf = (arm: 0 | 1, u: number) => (arm === 0 ? u : 1 - u);
const SIZE: [number, number][] = [[-0.3, 236], [0, 240], [0.5, 250], [1, 290], [1.3, 300]];
const BLUR: [number, number][] = [[-0.3, 4], [0.05, 3], [0.35, 0.4], [0.65, 0.4], [0.95, 6], [1.3, 8]];

/** Every card in view at frame t: arm, index, centre, width, blur, travel direction, order (later = on top). */
export const riverCards = (t: number, seed = 5) => {
  const [a0, a1] = CARD_RIVERS.arc;
  const [e0, e1] = CARD_RIVERS.edges;
  const len = ((a1 - a0) * Math.PI * CARD_RIVERS.r) / 180;
  const D = riverTravel(t);
  const cards: { arm: 0 | 1; j: number; x: number; y: number; w: number; blur: number; dir: number; p: number }[] = [];
  for (const arm of [0, 1] as const) {
    const off = arm === 0 ? 0 : 131; // the arms are not in step
    const jMin = Math.floor((D + off - len - 60) / CARD_RIVERS.gap);
    const jMax = Math.ceil((D + off + 60) / CARD_RIVERS.gap);
    for (let j = jMin; j <= jMax; j++) {
      const p = D + off - j * CARD_RIVERS.gap + 46 * (hash(seed + arm, j) - 0.5); // arc length from the arm's start
      if (p < -40 || p > len + 40) continue;
      const a = a0 + (p / len) * (a1 - a0);
      const u = (a - e0) / (e1 - e0);
      const near = nearOf(arm, u);
      const pt = armPoint(arm, a);
      cards.push({ arm, j, x: pt.x, y: pt.y, w: trackLinear(near, SIZE), blur: trackLinear(near, BLUR), dir: pt.dir, p });
    }
  }
  return cards.sort((m, n) => (m.arm - n.arm) * 1e6 + (m.p - n.p));
};

export const CardRivers: React.FC<CardRiversProps> = ({ words, images, palette, frame, seed = 5 }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const v = riverSpeed(t);
  const cards = riverCards(t, seed);
  const smear = v > CARD_RIVERS.smear.from ? Math.min(1, (v - CARD_RIVERS.smear.from) / 60) : 0;
  const trail = CARD_RIVERS.smear.k * v;
  const len = ((CARD_RIVERS.arc[1] - CARD_RIVERS.arc[0]) * Math.PI * CARD_RIVERS.r) / 180;
  const shadow = `0 8px 24px ${rgba(P.ink, 0.12)}`;
  const pic = (arm: number, j: number) => (images.length ? images[Math.floor(hash(seed + 7, j * 2 + arm) * 1e6) % images.length] : null);
  const card = (c: (typeof cards)[number], key: string, x: number, y: number, opacity: number, extraBlur: number) => {
    const h = c.w * CARD_RIVERS.card.ratio;
    const b = c.blur + extraBlur;
    const src = pic(c.arm, c.j);
    return (
      <div
        key={key}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: c.w,
          height: h,
          borderRadius: CARD_RIVERS.card.r,
          overflow: 'hidden',
          opacity,
          background: mixColor(P.paper, P.ink, 0.06),
          boxShadow: opacity >= 1 ? shadow : undefined,
          transform: `translate(${(x - c.w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px)`,
          filter: b > 0.3 ? `blur(${b.toFixed(2)}px)` : undefined,
        }}
      >
        {src ? <Picture src={src} /> : null}
      </div>
    );
  };
  // the word: the first rises in on an expo-out and is gone at the swap; the second cuts on large and soft and shrinks on
  const second = words.length > 1 && t >= CARD_RIVERS.swap;
  const word = second ? words[1] : words[0];
  const sc = second ? tab(t, CARD_RIVERS.second) : words.length > 1 && t >= 36.5 ? 0 : tab(t, CARD_RIVERS.first);
  const rise = second ? 0 : tab(t, CARD_RIVERS.rise);
  const wBlur = second ? 5 * (1 - E.snapOut(clamp((t - CARD_RIVERS.swap) / 3.5))) : 4 * (1 - E.snapOut(clamp(t / 2.5)));
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {cards.map((c) => {
        const out: React.ReactNode[] = [];
        if (smear > 0) {
          // the smear: copies along the arc behind the card, fainter and softer the further back
          const n = CARD_RIVERS.smear.ghosts;
          for (let k = n; k >= 1; k--) {
            const p = c.p - (trail * k) / n;
            const a = CARD_RIVERS.arc[0] + (p / len) * (CARD_RIVERS.arc[1] - CARD_RIVERS.arc[0]);
            const pt = armPoint(c.arm, a);
            out.push(card(c, `${c.arm}-${c.j}-g${k}`, pt.x, pt.y, smear * 0.38 * (1 - k / (n + 1)), 3 + 6 * smear));
          }
        }
        out.push(card(c, `${c.arm}-${c.j}`, c.x, c.y, 1, 4 * smear));
        return out;
      })}
      {sc > 0 ? (
        <div
          data-text="scene-word"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            textAlign: 'center',
            whiteSpace: 'pre',
            fontFamily: FONT.text,
            fontWeight: 400,
            fontSize: CARD_RIVERS.size,
            letterSpacing: '-0.006em',
            lineHeight: 1.2,
            color: P.ink,
            transformOrigin: '960px 50%',
            transform: `translateY(${(540 - CARD_RIVERS.size * 0.6 + rise).toFixed(2)}px) scale(${sc.toFixed(4)})`,
            filter: wBlur > 0.2 ? `blur(${wBlur.toFixed(2)}px)` : undefined,
          }}
        >
          {word}
        </div>
      ) : null}
    </Stage1080>
  );
};

export const cardRiversMeta: SceneMeta = {
  id: 'card-rivers',
  does: 'one word at the centre of two curved rivers of photo cards that stream past in depth, swap the word mid-flow and accelerate into streaks',
  dur: CARD_RIVERS.dur,
  props: ['words', 'images', 'palette?', 'seed?'],
  handIn: null,
  handOut: { form: 'word', x: 836, y: 516, w: 249, h: 50 },
  klass: 'big',
  cues: [
    { f: 1, kind: 'click', id: 'rivers-in', weight: 0.6 },
    { f: 14, kind: 'tock', id: 'beat', weight: 0.5 },
    { f: 38, kind: 'hit', id: 'word-swap', weight: 0.9 },
    { f: 71, kind: 'hit', id: 'accelerate', weight: 0.8 },
    { f: 77, kind: 'hit', id: 'accelerate-2', weight: 0.7 },
    { f: 84, kind: 'whoosh', id: 'streaks', weight: 0.6 },
  ],
};
