// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// backlit-line: a giant line cut through a dark wall, read by its light. A lamp travels behind the wall from left to
// right: each letter glows as the light passes behind it (white-hot nearest the lamp, the light's colour round it,
// barely there far from it), so the words light up in reading order, and soft shafts stream out of the letters toward
// the lens. When the lamp has passed, a front light comes up: the wall shows its surface, the shafts die away and the
// line stands clean, bright and readable to the cut. The light IS the reveal; nothing slides, nothing fades in.
// Numbers (frames at 30 fps, px at 1080): the line 300 px (cap ~20 % of the height, fitted to 86 % of the width); the
// lamp from -15 % to 66 % of the width over f0-40 (expo in-out), on to 74 % by the cut, 0.85 cap below the baseline;
// its glow 0.55 x the width across; shafts: 16 copies scaled about the lamp up to x1.42, one 5 px blur, rising over 8 f and dying from f34
// (tau 10 f); the front light f34-54 (XP.arrive); the camera pushes x1 -> x1.07 to the cut. 2.07 s. Big.
import React from 'react';
import { Img } from 'remotion';
import { FONT } from '../brand/tokens';
import { E, travel, XP, zoomAt } from '../lib/anim';
import { mixColor, oklch, toOklch } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { baselineOf, measureTracked } from '../lib/measure';
import { bakePlate } from '../fx/Gradients';
import { clipText } from '../fx/HueSweep';
import { decay, type Palette, paletteOf, type SceneMeta, span, useClock } from './parts';

export type BacklitLineProps = {
  /** the line: 1-4 short words (a claim, the product's promise) */
  line: string;
  palette?: Partial<Palette>;
  frame?: number;
};

export const BACKLIT = { dur: 62, pass: 40, front: 34, frontIn: 20, size: 300, weight: 650, track: -0.04, rays: 16, reach: 0.42 } as const;

/**
 * The light at frame t (30 fps): the lamp's place behind the wall (a share of the frame's width), the shafts' strength,
 * the front light's (0..1) and the camera's push.
 */
export const backlitLight = (t: number) => ({
  lamp: travel(t, 0, BACKLIT.pass, -0.15, 0.66, 5) + travel(t, BACKLIT.pass - 6, BACKLIT.dur, 0, 0.08, 3),
  // the shafts rise with the lamp and die once the front light is up; the front light arrives after the pass
  rays: t < BACKLIT.front ? XP.arrive(span(t, 0, 8)) : decay(t, BACKLIT.front, 10),
  front: XP.arrive(span(t, BACKLIT.front, BACKLIT.front + BACKLIT.frontIn)),
  s: zoomAt(t, 0, BACKLIT.dur, 1, 1.07, E.softOut),
});

export const BacklitLine: React.FC<BacklitLineProps> = ({ line, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const text = line.replace(/\*/g, '').trim();
  const w100 = Math.max(1, measureTracked(text, 100, BACKLIT.weight, BACKLIT.track));
  const size = Math.min(BACKLIT.size * u, (0.86 * W * 100) / w100);
  const lw = (w100 * size) / 100;
  const left = W / 2 - lw / 2;
  const cap = 0.73 * size;
  const base = H / 2 + cap / 2;
  const top = base - baselineOf(size, BACKLIT.weight, 1);
  // the lamp behind the wall
  // (low behind the wall, like a floor light: its shafts fan up and out of the letters, they never smear sideways)
  const { lamp, rays, front, s } = backlitLight(t);
  const lx = lamp * W;
  const ly = base + 0.85 * cap;
  const R = 0.55 * W;
  // the wall takes the value of the ground it is given (a film keeps one ground). Dark: near-black in the accent's hue,
  // the letters white-hot at the lamp. Light: a white wall, the letters glowing in the accent at the lamp (light on a
  // white wall only shows as colour), the shafts a tinted haze; once the front light is up the line stands in the ink
  const dark = toOklch(P.ground)[0] < 0.5;
  const aH = toOklch(P.accent)[2];
  const white = oklch(0.985, 0.004, aH);
  const wall = dark ? mixColor(P.ground, P.accent, 0.08) : P.ground;
  const lit = dark ? mixColor(P.accent, white, 0.55) : P.accent;
  const hot = dark ? mixColor(white, P.accent, 0.06) : mixColor(P.accent, white, 0.12);
  const unlit = dark ? mixColor(wall, P.accent, 0.18) : mixColor(wall, P.ink, 0.1);
  const settled = dark ? white : P.ink;
  const glyphs = (o: React.CSSProperties) => (
    <div style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: BACKLIT.weight, letterSpacing: `${BACKLIT.track}em`, lineHeight: 1, fontVariationSettings: '"opsz" 32', transform: `translate(${left.toFixed(2)}px, ${top.toFixed(2)}px)`, ...o }}>
      {text}
    </div>
  );
  // the letters lit from behind: a glow centred on the lamp, clipped to the glyphs (px in the text box's frame, which
  // clipText pads .18 em above the line so the descenders keep their light)
  const gx = lx - left;
  const gy = ly - top + 0.18 * size;
  const backGlow = `radial-gradient(${R.toFixed(1)}px ${(R * 0.62).toFixed(1)}px at ${gx.toFixed(1)}px ${gy.toFixed(1)}px, ${hot} 0%, ${hot} 18%, ${lit} 34%, ${withAlpha(P.accent, 0.85)} 56%, ${mixColor(unlit, P.accent, 0.2)} 80%, ${unlit} 100%)`;
  const litGlyphs = () => glyphs(clipText(backGlow));
  // the wall's surface under the front light: a soft fall from the upper left (baked, dithered)
  const lift = dark ? 0.3 : 0.5;
  const wash = bakePlate('radial', [{ at: 0, color: mixColor(wall, dark ? P.accent : white, lift), alpha: 1 }, { at: 0.55, color: mixColor(wall, dark ? P.accent : white, lift * 0.4), alpha: 1 }, { at: 1, color: wall, alpha: 1 }], 320, 180, { cx: 0.32, cy: 0.18, rx: 1.1, ry: 1.3, seed: 21 });
  const bloom = bakePlate('radial', [{ at: 0, color: hot, alpha: 0.5 }, { at: 0.3, color: lit, alpha: 0.18 }, { at: 1, color: lit, alpha: 0 }], 256, 160, { seed: 22 });
  const shafts = [];
  for (let i = 1; i <= BACKLIT.rays; i++) {
    const k = 1 + (BACKLIT.reach * i) / BACKLIT.rays;
    const a = (dark ? 0.16 : 0.09) * Math.pow(1 - (i - 1) / BACKLIT.rays, 1.8) * rays;
    if (a < 0.004) continue;
    shafts.push(
      <div key={i} style={{ position: 'absolute', inset: 0, transformOrigin: `${lx.toFixed(1)}px ${ly.toFixed(1)}px`, transform: `scale(${k.toFixed(4)})`, opacity: a }}>
        {litGlyphs()}
      </div>,
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: wall }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${s.toFixed(5)})` }}>
        {wash && front > 0.002 ? <Img src={wash} style={{ position: 'absolute', left: 0, top: 0, width: W * 1.1, height: H * 1.1, transform: `translate(${(-W * 0.05).toFixed(1)}px, ${(-H * 0.05).toFixed(1)}px)`, opacity: front }} /> : null}
        {/* the cut letters, lit from behind; then, as the front light arrives, their faces in clean light */}
        {litGlyphs()}
        {front > 0.002 ? glyphs({ color: settled, opacity: front }) : null}
        {/* the shafts: copies of the lit letters scaled away from the lamp, softened once as a group */}
        {shafts.length ? <div style={{ position: 'absolute', inset: 0, mixBlendMode: dark ? 'screen' : 'normal', filter: `blur(${(5 * u).toFixed(1)}px)` }}>{shafts}</div> : null}
        {/* the bloom off the hottest letters, round the lamp */}
        {bloom && rays > 0.01 ? <Img src={bloom} style={{ position: 'absolute', left: 0, top: 0, width: 0.6 * W, height: 0.38 * W, transform: `translate(${(lx - 0.3 * W).toFixed(2)}px, ${(base - 0.5 * cap - 0.19 * W).toFixed(2)}px)`, opacity: (dark ? 0.8 : 0.35) * rays, mixBlendMode: dark ? 'screen' : 'normal' }} /> : null}
      </div>
    </div>
  );
};

export const backlitLineMeta: SceneMeta = {
  id: 'backlit-line',
  does: 'a giant line cut through a dark wall lights up letter by letter as a lamp passes behind it, shafts streaming to the lens, then a front light brings it clean',
  dur: BACKLIT.dur,
  props: ['line', 'palette?'],
  handIn: null,
  handOut: { form: 'word', x: 130, y: 430, w: 1660, h: 230 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'swell', id: 'lamp', weight: 0.7 },
    { f: BACKLIT.front, kind: 'hit', id: 'front-light', weight: 0.55 },
  ],
};
