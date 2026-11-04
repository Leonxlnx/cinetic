// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// iris-input: the product's mark is born small at the centre of a dark stage, grows fast and turns; a scalloped window
// opens around it onto a sea of clouds (fast, then slowly, then overfilling the frame) while the mark darkens into a
// hole in the clouds that spins away and vanishes. A frosted glass input lands over the clouds with its icons flying out
// to their slots; the headline above it is lit word by word by a tint band passing across it; the placeholder blurs in
// and then swaps through real questions on an accelerating schedule while the whole group pushes in; the headline lifts
// away and the input stays.
// Numbers (frames at 30 fps, px at 1080): the mark grows to 136 px across in 12 f (half size by f2) turning 134 deg;
// the window is 14 lobes (disc 0.80 R, lobes 0.265 R on a 0.735 R ring, turning 1.25 deg/f) with a 12 px soft edge, R
// 72 -> 960 px in 22 f in three phases; the hole holds, then shrinks and spins out over 12 f; the input 1142 x 128 (a
// pill), frosted 18 px with 10 % white, a top rim at 80 % white; icons settle in 13 f (the send button overshoots 3 px);
// the band crosses the headline in 16 f and drains off its last word; swaps 5, 5, 5, 4, 4, 3, 3, 2 f apart; the push
// runs x1 -> 1.12 on an ease-in over the last 32 f; the headline rises 50 px blurring 0 -> 10 px as it leaves.
import React from 'react';
import { Img } from 'remotion';
import { type Logo, LogoMark } from '../brand/Mark';
import { C, FONT } from '../brand/tokens';
import { Icon } from '../kit/screens/base';
import { clamp, E, lmix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { markOf, paletteOf, type Palette, perFrame, type SceneMeta, span, tab, useClock } from './parts';
import { srcOf, Stage1080 } from './stage1080';

export type IrisInputProps = {
  /** the world the window opens onto: an aerial photo of a cloud sea (a public path or URL), framed on `focus` (0..1) */
  plate: string;
  focus?: [number, number];
  /** a wash over the plate in the film's own colour (its hue at 22 %, a 'color' blend): a warm photo drawn into a cool film */
  tint?: string;
  /** the mark the window opens around (the product's own, parsed with logoParts); default the starter's mark */
  logo?: Logo;
  /** the line above the input ("Ask anything about your trip") */
  headline: string;
  /** the first is typed in, the rest swap through on an accelerating schedule (real questions people ask) */
  placeholders: string[];
  /** ground: the stage before the window opens; lift: the band that lights the headline; ink: the send button */
  palette?: Partial<Palette>;
  frame?: number;
};

export const IRIS_INPUT = {
  dur: 86,
  open: 12,
  pill: 30,
  push: [54, 86] as const,
  leave: [78, 86] as const,
  rest: { x: 390, y: 478, w: 1142, h: 128 },
} as const;

// the mark's size (px across) and turn; the window's radius after it opens; the hole's size and turn as it leaves
const MARK_R = perFrame(0, [2, 18, 30, 38, 46, 52, 57, 61, 64, 66, 67, 68, 68]);
const MARK_ROT = perFrame(0, [-44, -18, 3, 20, 35, 47, 57, 66, 73, 79, 84, 87, 89, 90]);
const IRIS_R = perFrame(IRIS_INPUT.open, [72, 135, 210, 290, 350, 405, 450, 488, 520, 548, 570, 590, 605, 618, 632, 650, 675, 705, 745, 800, 870, 960, 1110]);
const HOLE_R: [number, number][] = [[12, 68], [24, 69], [26, 66], [28, 61], [30, 53], [32, 45], [34, 33], [35, 22], [36, 8], [37, 0]];
const HOLE_ROT: [number, number][] = [[24, 0], [26, 3], [28, 9], [30, 22], [32, 46], [34, 86], [35, 112], [36, 140]];
// the input's ends and the two icons settling into their slots (px), from the input's first frame
const PILL_L = perFrame(0, [344, 360, 368, 374, 374, 379, 382, 385, 386, 386, 388, 389, 390]);
const PILL_R = perFrame(0, [1576, 1567, 1549, 1548, 1543, 1539, 1535, 1533, 1533, 1533, 1532, 1532, 1532]);
const PLUS_X = perFrame(0, [687, 583, 523, 486, 463, 451, 443, 442, 442, 443, 444, 445, 445]);
const SEND_X = perFrame(0, [1254, 1336, 1391, 1426, 1447, 1459, 1464, 1466, 1466, 1465, 1464, 1463, 1463]);
// the tint band's centre across the headline (share of its width) and the swap schedule (frames each)
const BAND: [number, number][] = [[0, 0.05], [3, 0.275], [7, 0.53], [12, 0.713], [16, 0.876], [25, 0.906], [35, 0.967], [45, 1.008], [47, 1.15]];
const SWAPS = [5, 5, 5, 4, 4, 3, 3, 2, 2, 2, 2] as const;

/** The scalloped window's outline at radius R and turn `rot` (deg): 14 lobes over a disc, as an SVG path. */
export const irisPath = (cx: number, cy: number, R: number, rot: number) => {
  const d = 0.735 * R;
  const rho = 0.265 * R;
  const n = 14 * 10;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    let r = 0.8 * R;
    for (let k = 0; k < 14; k++) {
      const phi = ((rot + (k * 360) / 14) * Math.PI) / 180;
      const dl = th - phi;
      const s = d * Math.sin(dl);
      if (Math.abs(s) <= rho) r = Math.max(r, d * Math.cos(dl) + Math.sqrt(rho * rho - s * s));
    }
    pts.push(`${(cx + r * Math.cos(th)).toFixed(1)},${(cy + r * Math.sin(th)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
};

export const IrisInput: React.FC<IrisInputProps> = ({ plate, focus = [0.5, 0.5], tint, logo, headline, placeholders, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: mixColor(C.ink, palette?.accent ?? C.accent, 0.1), ink: C.ink, ...palette });
  const mark = markOf(logo);
  const src = srcOf(plate);
  const white = C.white;
  // ---- the plate: a slow push with a small drift, all the way through
  const plateT = `translate(${(-0.5 * t).toFixed(2)}px, ${(0.35 * t).toFixed(2)}px) scale(${(1.02 + 0.0019 * t).toFixed(4)})`;
  const plateEl = (blur: number) => (
    <>
      {/* lint-ok: the plate is blurred once inside the input only; the headline's exit and the icons' landing blurs are brief and small */}
      <Img src={src} style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: plateT, transformOrigin: '960px 540px', filter: `saturate(0.85)${blur ? ` blur(${blur}px)` : ''}` }} />
      {tint && <div style={{ position: 'absolute', inset: 0, background: tint, mixBlendMode: 'color', opacity: 0.22 }} />}
    </>
  );
  // ---- the mark, the window, the hole
  const open = t >= IRIS_INPUT.open;
  const R = open ? tab(t, IRIS_R) : 0;
  const lobeRot = 4.5 + 1.25 * (t - IRIS_INPUT.open - 1);
  const markR = t < IRIS_INPUT.open ? tab(t, MARK_R) : tab(t, HOLE_R);
  const markRot = t < 24 ? tab(t, MARK_ROT) : 90 + tab(t, HOLE_ROT);
  const dark = span(t, IRIS_INPUT.open, IRIS_INPUT.open + 5); // white -> the hole's near black, the fill colour itself
  const holeA = 1 - 0.4 * E.stdInOut(span(t, 24, 36));
  const markFill = mixColor(white, mixColor(P.ground, C.ink, 0.6), dark);
  const fullFrame = R >= 1100;
  const mask = open && !fullFrame ? `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><filter id='f'><feGaussianBlur stdDeviation='4'/></filter><path d='${irisPath(960, 540, R, lobeRot)}' fill='white' filter='url(#f)'/></svg>`)}")` : undefined;
  // ---- the input
  const tp = t - IRIS_INPUT.pill;
  const pillOn = tp >= 0;
  const pl = tab(tp, PILL_L);
  const pr = tab(tp, PILL_R);
  const PY = IRIS_INPUT.rest.y;
  const PH = IRIS_INPUT.rest.h;
  const plusX = tab(tp, PLUS_X);
  const sendX = tab(tp, SEND_X);
  const pushQ = Math.pow(span(t, IRIS_INPUT.push[0], IRIS_INPUT.push[1]), 3); // gathers speed into the cut
  const push = lmix(1, 1.12, pushQ); // a push in log space
  const micA = E.snapOut(span(tp, 8, 13));
  // the placeholder: the first blurs in word by word, then hard swaps on an accelerating schedule
  const first = placeholders[0] ?? '';
  const firstWords = first.split(' ');
  let ph = first;
  let swapAt = 20;
  for (let i = 1; i < placeholders.length; i++) {
    if (tp >= swapAt) ph = placeholders[i];
    swapAt += SWAPS[Math.min(i - 1, SWAPS.length - 1)];
  }
  const swapping = tp >= 20 && placeholders.length > 1;
  // the headline: words appear in turn, a band of the tint crossing them and draining off the last
  const hw = headline.split(' ');
  const band = tab(tp, BAND);
  const leaveQ = span(t, IRIS_INPUT.leave[0], IRIS_INPUT.leave[1]);
  const leave = E.buildIn(leaveQ);
  const bandTint = palette?.lift ?? mixColor(P.accent, white, 0.5);
  const bandGrad = `linear-gradient(90deg, ${white} 0%, ${white} ${((band - 0.08) * 100).toFixed(1)}%, ${bandTint} ${(band * 100).toFixed(1)}%, ${white} ${((band + 0.08) * 100).toFixed(1)}%, ${white} 100%)`;
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {open && (
        <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '1920px 1080px', maskSize: '1920px 1080px' }}>
          {plateEl(0)}
        </div>
      )}
      {markR > 0.5 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * markR, height: 2 * markR, transform: `translate(${960 - markR}px, ${538 - markR}px) rotate(${markRot.toFixed(2)}deg)`, opacity: t < 24 ? 1 : holeA }}>
          <LogoMark logo={mark} size={2 * markR} fill={() => markFill} />
        </div>
      )}
      {/* lint-ok: a legibility shade, not an end card: a soft neutral shade under the headline and the input so white type reads on a bright plate */}
      {open && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 860px 330px at 960px 470px, rgba(0,0,0,0.34), rgba(0,0,0,0.15) 58%, rgba(0,0,0,0) 100%)', opacity: span(t, IRIS_INPUT.pill - 8, IRIS_INPUT.pill + 4) }} />}
      {pillOn && (
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '981px 562px', transform: `scale(${push.toFixed(4)})` }}>
          {/* the headline */}
          <div
            data-text="iris-headline"
            // focus-in: the headline lifts away out of focus while the input stays sharp
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 1920,
              display: 'flex',
              justifyContent: 'center',
              transform: `translate(0px, ${(330 - 50 * leave).toFixed(2)}px)`,
              opacity: 1 - leave,
              filter: leave > 0.02 ? `blur(${(10 * leave).toFixed(2)}px)` : undefined,
              fontFamily: FONT.text,
              fontSize: 73,
              fontWeight: 600,
              letterSpacing: '-0.012em',
              whiteSpace: 'pre',
              lineHeight: 1.1,
            }}
          >
            <span style={{ backgroundImage: bandGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', padding: '.18em 0 .32em', margin: '-.18em 0 0', textShadow: '0 2px 18px rgba(0,0,0,0.18)' }}>
              {hw.map((w, i) => (
                <span key={i} style={{ opacity: clamp((tp - Math.max(0, i - 2) * 4 + (i < 2 ? 3 : 0)) / 3) }}>
                  {w}
                  {i < hw.length - 1 ? ' ' : ''}
                </span>
              ))}
            </span>
          </div>
          {/* the frosted input */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: pr - pl, height: PH, transform: `translate(${pl.toFixed(2)}px, ${PY}px)`, borderRadius: PH / 2, overflow: 'hidden', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -2px 0 rgba(255,255,255,0.45), inset 2px 0 0 rgba(255,255,255,0.4), inset -2px 0 0 rgba(255,255,255,0.4), 0 16px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(-pl).toFixed(2)}px, ${-PY}px)`, width: 1920, height: 1080 }}>{plateEl(18)}</div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.2))' }} />
          </div>
          <svg width={60} height={60} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(plusX - 30).toFixed(2)}px, ${PY + PH / 2 - 30}px)` }}>
            <path d="M30 5 V55 M5 30 H55" stroke={white} strokeWidth={4} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', left: 514, top: PY, height: PH, display: 'flex', alignItems: 'center', fontFamily: FONT.ui, fontSize: 44, color: mixColor(white, P.ground, 0.06), whiteSpace: 'pre' }}>
            {swapping ? (
              <span data-text="iris-placeholder">{ph}</span>
            ) : (
              firstWords.map((w, i) => {
                const a = E.snapOut(span(tp, 9 + 6 * i, 12 + 6 * i));
                return (
                  // focus-in: the first question blurs in word by word
                  <span key={i} style={{ opacity: 0.4 + 0.6 * a, filter: a < 1 ? `blur(${(6 * (1 - a)).toFixed(2)}px)` : undefined, visibility: tp >= 9 + 6 * i ? 'visible' : 'hidden' }}>
                    {w}
                    {i < firstWords.length - 1 ? ' ' : ''}
                  </span>
                );
              })
            )}
          </div>
          <div style={{ position: 'absolute', left: 1350 - 26, top: PY + PH / 2 - 26, opacity: micA }}>
            <Icon name="mic" size={52} color={white} />
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 106, height: 106, borderRadius: 53, transform: `translate(${(sendX - 53).toFixed(2)}px, ${PY + PH / 2 - 53}px)`, background: P.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: tp < 3 ? `blur(${(4.5 * (1 - E.snapOut(clamp(tp / 3)))).toFixed(2)}px)` : undefined }}>
            <Icon name="send" size={46} color={white} />
          </div>
        </div>
      )}
    </Stage1080>
  );
};

export const irisInputMeta: SceneMeta = {
  id: 'iris-input',
  does: "the product's mark grows and a scalloped iris opens around it onto a sea of clouds; a frosted input lands, its headline lit word by word, its questions swapping faster and faster as the group pushes in",
  dur: IRIS_INPUT.dur,
  props: ['plate', 'focus?', 'tint?', 'logo?', 'headline', 'placeholders', 'palette?'],
  handIn: null,
  handOut: { form: 'pill', x: 320, y: 470, w: 1290, h: 144, r: 72 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'bell', id: 'mark', weight: 0.5 },
    { f: IRIS_INPUT.open, kind: 'swell', id: 'iris', weight: 0.6 },
    { f: IRIS_INPUT.pill, kind: 'whoosh', id: 'input', weight: 0.5 },
    { f: IRIS_INPUT.pill + 20, kind: 'tick', id: 'swaps', weight: 0.4 },
    { f: IRIS_INPUT.leave[0], kind: 'swell', id: 'headline-leaves', weight: 0.4 },
  ],
};
