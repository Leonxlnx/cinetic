// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// glass-prompt: a dark frosted prompt box rises out of deep blur into focus on a black stage, growing as it comes
// toward the camera and creeping on after it lands; the overhead light runs along its rims as thin white streaks (one
// parked on the top rim, one sliding right to left along the bottom). Then the whole stage whips left on a long build and
// a short stop, the placeholder cuts out at the peak speed and the request types in, and the stage whips right with pure
// acceleration into the cut. A very dim field of digits is the stage's texture.
// Numbers (frames at 30 fps, px at 1080): the box 975 x 182 (radius 42); it rises from y +206 at 0.845 scale and 14 px
// blur, lands on f7 and is sharp by f22 (half the blur gone in 3 f), creeping to 1.034; streak cores 3 x 170 px (a
// Gaussian along their length, sigma 45) with a 10 px glow; whip left -290 px over 19 f (peak 50 px/f) with a blur of half
// the step; the placeholder cuts on f35, typing from f41 (the two newest letters soft); whip right +245 px over 11 f,
// peak 54 px/f on the last frame, with a blur pulse 1 / 6 / 12 / 18 px and the box 6 % brighter.
import React from 'react';
import { C, FONT } from '../brand/tokens';
import { GlowPool } from '../fx/light';
import { Icon } from '../kit/screens/base';
import { clamp, E, rand } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { paletteOf, type Palette, perFrame, type SceneMeta, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

export type GlassPromptProps = {
  /** the label above the box ("Workspace"); omit for none */
  label?: string;
  /** what the empty box says, then what the person types */
  placeholder: string;
  prompt: string;
  /** the small control left in the bottom row ("Auto-run") and the model chip at the right ("Pro 2") */
  control?: string;
  model?: string;
  /** dark scene: ground near black, ink the light (streaks, send button) */
  palette?: Partial<Palette>;
  frame?: number;
};

export const GLASS_PROMPT = {
  dur: 56,
  cut: 35, // the placeholder cuts out at the left whip's peak speed
  type: 41,
  box: { x: 474, y: 455, w: 975, h: 182, r: 42 },
} as const;

// the rise: centre y, scale, blur, opacity per frame; the creep after it; the two whips (box centre x)
const RISE_Y = perFrame(0, [752, 668, 630, 606, 589, 574, 563, 561, 561, 560, 559, 557, 552, 554, 555, 553, 552, 551, 550, 549, 548, 547, 547, 546]);
const SCALE: [number, number][] = [[0, 0.845], [1, 0.845], [2, 0.846], [3, 0.847], [4, 0.848], [5, 0.85], [6, 0.852], [7, 0.858], [8, 0.864], [9, 0.872], [10, 0.883], [11, 0.896], [12, 0.912], [13, 0.923], [14, 0.94], [15, 0.955], [16, 0.967], [17, 0.978], [18, 0.984], [19, 0.992], [20, 1], [21, 1.006], [22, 1.011], [23, 1.015], [24, 1.019], [26, 1.024], [28, 1.028], [30, 1.031], [32, 1.033], [33, 1.034], [56, 1.034]];
const BLUR = perFrame(0, [14, 12, 9.8, 7.7, 6, 4.6, 3.5, 2.8, 2.3, 1.9, 1.6, 1.3, 1.1, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1, 0]);
const OPAC = perFrame(0, [0.6, 0.85, 1]);
const X = [
  ...perFrame(23, [962, 961, 960, 957, 954, 950, 944, 937, 928, 916, 900, 876, 840, 790, 746, 717, 698, 686, 678, 674, 672]),
  ...perFrame(44, [673, 677, 683, 691, 703, 717, 735, 757, 784, 818, 863, 917, 990]),
];
const PULSE = perFrame(51, [0, 1, 6, 12, 18, 22]);
// the bottom streak slides along the rim (frame x), then rides the box at 27 % of its width
const STREAK_B = perFrame(8, [1363, 1364, 1365, 1283, 1202, 1172, 1142, 1108, 1074, 1063, 1052, 1037, 1022, 1002, 983, 972, 962, 941, 921, 894, 868, 839, 810, 767, 724]);
const STREAK_B_PEAK = perFrame(8, [135, 143, 152, 145, 137, 135, 133, 111, 90, 95, 101, 83, 66, 65, 65, 62, 59, 74, 89, 98, 108, 122, 137, 134, 131]);

/** One tile of the digit field (seeded), repeated over the stage: 8 columns x 6 rows of 0, 1 or nothing. */
const digitTile = () => {
  const cells: { x: number; y: number; d: string }[] = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 8; c++) {
      const v = rand(`digit:${c}:${r}`);
      if (v < 0.25) continue;
      cells.push({ x: c * 17 + 3, y: r * 19 + 15, d: v < 0.62 ? '0' : '1' });
    }
  return cells;
};
const DIGITS = digitTile();

const BLURS = [2, 4, 7, 10, 14] as const;
/** The box's type, px at 1080: the label, the field's text, the bottom row (the controls read as texture). */
const UI = { label: 30, text: 38, row: 25 } as const;

export const GlassPrompt: React.FC<GlassPromptProps> = ({ label, placeholder, prompt, control, model, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: C.ink, ink: C.white, ...palette });
  const ground = P.ground;
  const B = GLASS_PROMPT.box;
  const glass = mixColor(ground, P.ink, 0.11);
  const glassTop = mixColor(ground, P.ink, 0.14);
  const labelInk = mixColor(ground, P.ink, 0.3);
  const textInk = mixColor(ground, P.ink, 0.38);
  const rowInk = mixColor(ground, P.ink, 0.42);
  const digitInk = mixColor(ground, P.ink, 0.1);
  // ---- the stage: rise, creep, whips
  const cx = t < 23 ? 962 : tab(t, X);
  const cy = t < 23 ? tab(t, RISE_Y) : 546;
  const s = tab(t, SCALE);
  const focusBlur = t < 22 ? tab(t, BLUR) : 0;
  const pulse = tab(t, PULSE);
  const step = Math.abs(tab(t + 0.5, X) - tab(t - 0.5, X));
  const smear = t >= 24 ? step / 2 : 0; // a blur of half the frame's travel, along it
  const mb = smear > 1.5 ? BLURS.reduce((a, b) => (Math.abs(b - smear / 2.5) < Math.abs(a - smear / 2.5) ? b : a)) : 0;
  const bright = 1 + 0.06 * E.snapOut(clamp((t - 51) / 4));
  const stage = `translate(${(cx - 962).toFixed(2)}px, 0px)`;
  const boxT = `translate(${(cx - B.w / 2).toFixed(2)}px, ${(cy - B.h / 2).toFixed(2)}px) scale(${s.toFixed(4)})`;
  // ---- the text in the box: placeholder, cut, then the request typing
  const n = t < GLASS_PROMPT.type ? 0 : Math.min(prompt.length, Math.round((Math.floor(t) - GLASS_PROMPT.type + 1) * 2.15));
  // lint-ok: the request lands under the whip at the cut's speed (2 letters a frame), read in the next shot
  const typed = prompt.slice(0, n);
  const showPh = t < GLASS_PROMPT.cut;
  // ---- light
  const streakOn = clamp((t - 6) / 2) * 0.6 + (t >= 8 ? 0.4 : 0);
  const bx = t < 32 ? tab(t, STREAK_B) - (cx - B.w / 2) : B.w * 0.27;
  const peakB = (t < 32 ? tab(t, STREAK_B_PEAK) : 120) / 170;
  const glowA = E.glideOut(clamp(t / 14));
  // the rim lights into a thin outline as the box lands and again through the whips
  const rimA = 0.2 + 0.18 * clamp((t - 4) / 4) * (1 - clamp((t - 14) / 8)) + 0.28 * clamp((t - 28) / 8) * (1 - clamp((t - 52) / 4));
  const fieldA = E.glideOut(clamp((t - 6) / 10));
  const streak = (x: number, y: number, a: number) => (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 220, height: 3, transform: `translate(${(x - 110).toFixed(1)}px, ${(y - 1.5).toFixed(1)}px)`, background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${a.toFixed(3)}) 50%, rgba(255,255,255,0) 100%)`, mixBlendMode: 'screen' }} />
      {/* lint-ok: the blurred layers never stack: focus-in (f0-22), whip smear (f24-55) and the cut's pulse (f52-55) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 120, height: 14, transform: `translate(${(x - 60).toFixed(1)}px, ${(y - 7).toFixed(1)}px)`, background: `rgba(255,255,255,${(0.35 * a).toFixed(3)})`, borderRadius: 7, filter: 'blur(6px)', mixBlendMode: 'screen' }} />
    </>
  );
  return (
    <Stage1080 W={W} H={H} ground={ground}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {BLURS.map((b) => (
            <filter key={b} id={`glass-prompt-mb-${b}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={`${b} 0`} />
            </filter>
          ))}
          <pattern id="glass-prompt-digits" width={136} height={114} patternUnits="userSpaceOnUse">
            {DIGITS.map((d, i) => (
              <text key={i} x={d.x} y={d.y} fontFamily={FONT.mono} fontSize={15} fill={digitInk}>
                {d.d}
              </text>
            ))}
          </pattern>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, filter: [mb ? `url(#glass-prompt-mb-${mb})` : '', pulse > 0.2 ? `blur(${pulse.toFixed(2)}px)` : '', bright > 1 ? `brightness(${bright.toFixed(3)})` : ''].join(' ').trim() || undefined }}>
        {/* the field of digits: part of the stage, brightest round the box, gone at the corners */}
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: fieldA, transform: stage, WebkitMaskImage: 'radial-gradient(560px 520px at 960px 330px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0) 100%)', maskImage: 'radial-gradient(560px 520px at 960px 330px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0) 100%)' }}>
          <rect width={1920} height={1080} fill="url(#glass-prompt-digits)" />
        </svg>
        {/* the light pooled under the box */}
        <div style={{ position: 'absolute', inset: 0, opacity: glowA }}>
          <GlowPool x={cx} y={cy + 80} r={420} ry={260} color={P.ink} strength={0.06} />
        </div>
        {/* the box and its label */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: B.w, height: B.h, transformOrigin: '50% 50%', transform: boxT, opacity: tab(t, OPAC), filter: focusBlur > 0.1 ? `blur(${focusBlur.toFixed(2)}px)` : undefined }}>
          {label && (
            <div style={{ position: 'absolute', left: 38, top: -62, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.ui, fontSize: UI.label, color: labelInk, whiteSpace: 'pre' }}>
              <Icon name="folder" size={28} color={labelInk} />
              <span data-text="glass-label">{label}</span>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, borderRadius: B.r, background: `linear-gradient(180deg, ${glassTop} 0px, ${glass} 40px)`, boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,${rimA.toFixed(3)}), inset 0 2px 0 rgba(255,255,255,${(0.6 * rimA).toFixed(3)})` }} />
          <div style={{ position: 'absolute', left: 38, top: 44, height: 40, display: 'flex', alignItems: 'center', fontFamily: FONT.ui, fontSize: UI.text, color: textInk, whiteSpace: 'pre', letterSpacing: '-0.005em' }}>
            {showPh ? (
              <span data-text="glass-placeholder">{placeholder}</span>
            ) : (
              <span data-text="glass-prompt">
                {/* lint-ok: the same string split for the soft newest letters */}
                {typed.slice(0, Math.max(0, n - 3))}
                <span style={{ filter: 'blur(1.5px)', opacity: 0.85 }}>{typed.slice(Math.max(0, n - 3), Math.max(0, n - 2))}</span>
                <span style={{ filter: 'blur(3px)', opacity: 0.6 }}>{typed.slice(Math.max(0, n - 2))}</span>
              </span>
            )}
          </div>
          <div style={{ position: 'absolute', left: 36, right: 30, bottom: 26, height: 36, display: 'flex', alignItems: 'center', gap: 26, fontFamily: FONT.ui, fontSize: UI.row, color: rowInk, whiteSpace: 'pre' }}>
            <Icon name="plus" size={26} color={rowInk} weight="bold" />
            {control && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="lock" size={24} color={rowInk} />
                {control}
              </span>
            )}
            <span style={{ flex: 1 }} />
            {model && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="sparkle" size={24} color={rowInk} />
                {model}
                <Icon name="caretDown" size={14} color={rowInk} weight="bold" />
              </span>
            )}
            <span style={{ width: 36, height: 36, borderRadius: 18, background: mixColor(P.ink, ground, 0.04), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowUp" size={20} color={ground} weight="bold" />
            </span>
          </div>
          {/* the light on the rims */}
          {streakOn > 0 && (
            <>
              {streak(B.w * 0.55, 0, streakOn * 0.95)}
              {streak(bx, B.h - 4, streakOn * clamp(peakB * 1.4))}
            </>
          )}
          {t >= 30 && t < 50 && <div style={{ position: 'absolute', left: 60, right: 60, bottom: 0, height: 1, background: withAlpha(P.ink, 0.17) }} />}
        </div>
      </div>
    </Stage1080>
  );
};

export const glassPromptMeta: SceneMeta = {
  id: 'glass-prompt',
  does: 'a dark frosted prompt box rises out of blur into focus on black with light running along its rims; the stage whips left, the request types in, and it whips right into the cut',
  dur: GLASS_PROMPT.dur,
  props: ['label?', 'placeholder', 'prompt', 'control?', 'model?', 'palette?'],
  handIn: null,
  handOut: { form: 'pill', x: 474 + 245 - 290 + 28, y: 455, w: 975, h: 182, r: 42 },
  klass: 'quiet',
  cues: [
    { f: 2, kind: 'swell', id: 'rise', weight: 0.4 },
    { f: 21, kind: 'pop', id: 'glint', weight: 0.4 },
    { f: 27, kind: 'whoosh', id: 'whip-left', weight: 0.6 },
    { f: GLASS_PROMPT.type, kind: 'key', id: 'typing', weight: 0.4 },
    { f: 46, kind: 'riser', id: 'whip-right', weight: 0.7 },
  ],
};
