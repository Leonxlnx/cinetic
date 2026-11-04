// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// word-cards: one huge word builds letter by letter on a dark stage, each glyph swinging down into its slot from up and
// to the left with a small overshoot, while a dark glass card rises from below the frame into the space under the word,
// over the bottom of the letters (they read blurred through the glass). The camera pulls back to make room, the card on
// the left slides out from behind the front one, the camera starts a slow accelerating push and the card on the right
// slides out. Nothing fades and no card turns.
// Numbers (frames at 30 fps, px at 1080): word cap 163 px at rest (seen at x1.331 while it builds); one glyph a frame,
// each from (-61..-74, -59..-82) px, +35..40 deg and 0.45-0.55 scale, landing in 5 f with a 4-7 % scale overshoot,
// 3 px soft on its first two frames; the front card 358 x 481 (radius 26) rises 590 px in 27 f with a 120 -> 0 px
// vertical smear over its first 4 f; pull-back 1.331 -> 1 over 20 f; side cards 25 px apart slide out in 8 f with a
// smear of half their step; the push runs 1 -> 1.277 over the last 29 f, accelerating; the word dims 254 -> 220.
import React from 'react';
import { C, FONT } from '../brand/tokens';
import { Icon } from '../kit/screens/base';
import { type Plan } from '../kit/screens/PriceCards';
import { clamp } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { paletteOf, type Palette, perFrame, type SceneMeta, span, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

export type WordCardsProps = {
  /** the giant word ("Pricing", "Plans", "Teams"): one word, up to about 9 letters */
  word: string;
  /** three cards: the middle one rises first, then the left, then the right (kit PriceCards' Plan) */
  plans: [Plan, Plan, Plan];
  currency?: string;
  /** dark scene: ground near black, ink the word and the card type */
  palette?: Partial<Palette>;
  frame?: number;
};

export const WORD_CARDS = {
  dur: 64,
  card: { y: 353, w: 358, h: 481, r: 26, gap: 25 },
  word: { cap: 163, baseline: 386 },
  pivot: { x: 960, y: 480 },
} as const;

const CAM: [number, number][] = [[0, 1.331], [11, 1.331], [12, 1.328], [13, 1.311], [14, 1.292], [15, 1.269], [16, 1.247], [17, 1.222], [18, 1.194], [19, 1.15], [20, 1.111], [21, 1.078], [22, 1.058], [23, 1.042], [24, 1.031], [25, 1.022], [26, 1.014], [27, 1.008], [28, 1.006], [29, 1.003], [31, 1], [35, 1], [37, 1.003], [39, 1.01], [41, 1.015], [43, 1.023], [45, 1.036], [47, 1.057], [49, 1.088], [51, 1.124], [53, 1.149], [55, 1.169], [57, 1.194], [59, 1.218], [61, 1.243], [63, 1.277]];
const RISE: [number, number][] = [[2, 590], [3, 350], [4, 271], [5, 200], [6, 170], [7, 151], [8, 110], [9, 80], [10, 80], [11, 68], [13, 55], [15, 42], [17, 30], [19, 20], [21, 12], [23, 7], [25, 3], [27, 1], [29, 0]];
const RISE_SMEAR = perFrame(2, [120, 40, 35, 15, 0]);
const LEFT_X = perFrame(27, [760, 650, 560, 505, 472, 440, 418, 404, 397]);
const RIGHT_X = perFrame(49, [900, 1000, 1067, 1110, 1137, 1145, 1152, 1160, 1163]);
// a glyph's swing: position and roll share per frame from its first frame, and its scale
const SWING = perFrame(0, [0, 0.33, 0.66, 0.9, 1.03, 1]);
const GROW = perFrame(0, [0.5, 0.66, 0.84, 0.97, 1.04, 1.02, 1]);
const GROW_FIRST = perFrame(0, [0.5, 0.63, 0.79, 0.92, 1.02, 1.06, 1.07, 1.05, 1.03, 1]);
const POSES: [number, number, number, number][] = [[-61, -78, 35, 0.5], [-74, -82, 35, 0.55], [-55, -80, 35, 0.55], [-55, -74, 35, 0.55], [-47, -69, 38, 0.55], [-72, -59, 40, 0.45], [-72, -59, 40, 0.45]];
const SMEARS = [4, 8, 16, 30] as const;

const smearId = (axis: 'x' | 'y', px: number) => {
  if (px < 3) return null;
  const s = px / 2.5;
  const b = SMEARS.reduce((a, c) => (Math.abs(c - s) < Math.abs(a - s) ? c : a));
  return `url(#word-cards-${axis}-${b})`;
};

export const WordCards: React.FC<WordCardsProps> = ({ word, plans, currency = '$', palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: C.ink, ink: C.white, ...palette });
  const ground = P.ground;
  const family = FONT.text;
  const weight = 600;
  const track = -0.015;
  const C0 = WORD_CARDS.card;
  // ---- the word, laid out at rest (camera scale 1), centred
  let size = WORD_CARDS.word.cap / 0.727;
  const w0 = measureTracked(word, size, weight, track, family);
  if (w0 > 1080) size *= 1080 / w0;
  const ww = measureTracked(word, size, weight, track, family);
  const wx = 960 - ww / 2;
  const top = WORD_CARDS.word.baseline - size * 0.864; // the baseline 0.864 em down at line-height 1
  const glyphs = [...word];
  const n = glyphs.length;
  const per = n > 2 ? Math.min(1, 4.5 / (n - 2)) : 1;
  const t0 = (i: number) => (i === 0 ? 0 : 2 + (i - 1) * per);
  const xs = glyphs.map((_, i) => measureTracked(word.slice(0, i), size, weight, track, family));
  const ws = glyphs.map((_, i) => measureTracked(word.slice(0, i + 1), size, weight, track, family) - xs[i]);
  const k = size / 224;
  const dim = mixColor(P.ink, ground, 0.13 * span(t, 41, 61));
  // ---- camera, cards
  const cam = tab(t, CAM);
  const lift = t < 29 ? tab(t, RISE) : 0;
  const riseSmear = tab(t, RISE_SMEAR);
  const lx = t < 27 ? 780 : tab(t, LEFT_X);
  const rx = t < 49 ? 780 : tab(t, RIGHT_X);
  const lStep = Math.abs(tab(t + 0.5, LEFT_X) - tab(t - 0.5, LEFT_X)) / 2;
  const rStep = Math.abs(tab(t + 0.5, RIGHT_X) - tab(t - 0.5, RIGHT_X)) / 2;
  const glyphEl = (blurred: boolean) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}>
      {glyphs.map((ch, i) => {
        const a = t - t0(i);
        if (a < 0) return null;
        const [ox, oy, rot, sc0] = POSES[Math.min(i, POSES.length - 1)];
        const q = tab(a, SWING);
        const g = i === 0 ? tab(a, GROW_FIRST) : tab(a, GROW);
        const scale = sc0 + ((g - 0.5) * (1 - sc0)) / 0.5; // the table's 0.5 -> 1 mapped onto this glyph's start scale
        const dx = ox * k * (1 - q);
        const dy = oy * k * (1 - q);
        const soft = a < 2 ? 3 : 0;
        return (
          <span
            key={i}
            // focus-in: a glyph is soft on its first two frames of the swing
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              fontFamily: family,
              fontWeight: weight,
              fontSize: size,
              letterSpacing: `${track}em`,
              lineHeight: 1,
              whiteSpace: 'pre',
              color: dim,
              transformOrigin: `${(ws[i] / 2).toFixed(1)}px ${(size * 0.55).toFixed(1)}px`,
              transform: `translate(${(wx + xs[i] + dx).toFixed(2)}px, ${(top + dy).toFixed(2)}px) rotate(${(rot * (1 - q)).toFixed(2)}deg) scale(${scale.toFixed(4)})`,
              opacity: blurred ? 1 : 0.6 + 0.4 * clamp(a),
              filter: !blurred && soft ? `blur(${soft}px)` : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
  const card = (plan: Plan, x: number, y: number, z: number, smear: string | null) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: C0.w, height: C0.h, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`, zIndex: z, filter: smear ?? undefined }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: C0.r, overflow: 'hidden', background: ground }}>
        {/* the word behind the glass, frosted */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translate(${(-x).toFixed(2)}px, ${(-y).toFixed(2)}px)`, filter: 'blur(9px)', opacity: 0.85 }}>{glyphEl(true)}</div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.035)', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.10)', borderRadius: C0.r }} />
      </div>
      <div style={{ position: 'absolute', left: 36, top: 28, right: 30, fontFamily: FONT.ui, color: P.ink, whiteSpace: 'pre', lineHeight: 1 }}>
        <div style={{ fontSize: 19 * 1.25, color: mixColor(P.ink, ground, 0.2) }}>{plan.name}</div>
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'baseline' }}>
          <span data-text="card-price" style={{ fontSize: 61, fontWeight: 600, letterSpacing: '-0.02em', color: mixColor(P.ink, ground, 0.05) }}>{typeof plan.price === 'number' ? `${currency}${plan.price}` : plan.price}</span>
          <span style={{ fontSize: 61, fontWeight: 600, color: mixColor(P.ink, ground, 0.4) }}>{plan.period ?? '/m'}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 166, height: 1, background: 'rgba(255,255,255,0.14)' }} />
      <div style={{ position: 'absolute', left: 38, top: 196, right: 24, fontFamily: FONT.ui, fontSize: 17 * 1.3, color: mixColor(P.ink, ground, 0.26), whiteSpace: 'pre' }}>
        {plan.features.slice(0, 5).map((f, j) => (
          <div key={j} style={{ height: 50.5, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="check" size={18} color={mixColor(P.ink, ground, 0.12)} weight="bold" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Stage1080 W={W} H={H} ground={ground}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {SMEARS.flatMap((b) => [
            <filter key={`x${b}`} id={`word-cards-x-${b}`} x="-30%" y="-10%" width="160%" height="120%">
              <feGaussianBlur stdDeviation={`${b} 0`} />
            </filter>,
            <filter key={`y${b}`} id={`word-cards-y-${b}`} x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation={`0 ${b}`} />
            </filter>,
          ])}
        </defs>
      </svg>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${WORD_CARDS.pivot.x}px ${WORD_CARDS.pivot.y}px`, transform: `scale(${cam.toFixed(4)})` }}>
        <div data-text="word-cards-word">{glyphEl(false)}</div>
        {t >= 49 && card(plans[2], rx, C0.y, 2, smearId('x', rStep))}
        {t >= 27 && card(plans[0], lx, C0.y, 3, smearId('x', lStep))}
        {t >= 2 && card(plans[1], 780, C0.y + lift, 4, smearId('y', riseSmear))}
      </div>
    </Stage1080>
  );
};

export const wordCardsMeta: SceneMeta = {
  id: 'word-cards',
  does: 'a giant word swings in letter by letter; a glass card rises over its foot, the camera pulls back and two more cards slide out from behind it',
  dur: WORD_CARDS.dur,
  props: ['word', 'plans', 'currency?', 'palette?'],
  handIn: null,
  handOut: { form: 'card', x: 737, y: 322, w: 444, h: 601, r: 32 },
  klass: 'big',
  cues: [
    { f: 2, kind: 'tick', id: 'card-flies', weight: 0.4 },
    { f: 5, kind: 'hit', id: 'letters', weight: 1 },
    { f: 10, kind: 'land', id: 'word', weight: 0.6 },
    { f: 20, kind: 'pop', id: 'pull-back', weight: 0.6 },
    { f: 33, kind: 'pop', id: 'left-card', weight: 0.6 },
    { f: 50, kind: 'tick', id: 'right-card', weight: 0.4 },
  ],
};
