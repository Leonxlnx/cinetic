// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// monolith-word: the product's word as a real solid standing in a dark studio. The lights strike on (the key pool on
// the wall behind it, the face's lacquer catching the key) while the camera pulls back from a macro on the first
// letters' lit bevel and orbits from the word's left to its right, so its extruded side swings across: a thing in a
// room, not a flat title. A highlight band travels across the face, the glossy floor holds its reflection and contact
// shadow, and the camera keeps a slow push to the cut. One giant word (cap ~25 % of the frame's height).
// Numbers (frames at 30 fps, px at 1080): the word 380 px (fitted to 80 % of the width), extruded 0.17 x its size;
// the camera x2.7 -> x1 over 44 f in log space (XP.arrive, 90 % by f15), then x1 -> x1.035 to the end; the orbit
// (the back's screen direction) +0.95 -> -0.5 to the cut (expo in-out); the lights 0.3 -> 1.18 by f10, settling to 1;
// the band crosses the face f6 -> the cut. 2.2 s. Big.
import React from 'react';
import { FONT } from '../brand/tokens';
import { clamp, E, mix, panTo, travel, XP, zoomAt } from '../lib/anim';
import { mixColor, oklch, toOklch } from '../lib/color';
import { baselineOf, measureTracked } from '../lib/measure';
import { FloorShadow, type MaterialKind, Reflection, SolidType, Studio } from '../fx/light/Material';
import { decay, type Palette, paletteOf, type SceneMeta, span, useClock } from './parts';

export type MonolithWordProps = {
  /** one or two short words: the product's name, or the point's key word */
  word: string;
  /** what the word is made of (default lacquer in the accent; metal: polished, in the paper's white) */
  material?: MaterialKind;
  /** the studio: dark (a black stage in the accent's hue) or light (a white sweep); default the palette's ground's value */
  tone?: 'dark' | 'light';
  palette?: Partial<Palette>;
  frame?: number;
};

export const MONOLITH = { dur: 66, on: 10, pull: 44, orbit: 54, size: 380, weight: 650, track: -0.045 } as const;

/**
 * The camera and the light at frame t (30 fps): the zoom `s`, the share of the glide from the first letters to the
 * word's middle, the back's screen direction `dx` (+ we see its left side, - its right), the lights' strength `on` and
 * where the highlight band crosses the face (`sweep`, 0..1 across it).
 */
export const monolithCamera = (t: number) => ({
  s: t < MONOLITH.pull ? zoomAt(t, 0, MONOLITH.pull, 2.7, 1, XP.arrive) : zoomAt(t, MONOLITH.pull, MONOLITH.dur, 1, 1.035, E.softOut),
  // (the glide rides the zoom's own curve, so the bevel stays under the lens as the frame opens)
  glide: panTo(t, 0, MONOLITH.pull, 0, 1, 7),
  dx: travel(t, 0, MONOLITH.orbit, 0.95, -0.42, 5) + travel(t, MONOLITH.orbit - 8, MONOLITH.dur, 0, -0.08, 3),
  // the lights strike on, overshoot a little and settle (a lamp, never a fade)
  on: t < MONOLITH.on ? mix(0.3, 1.18, XP.arrive(span(t, 0, MONOLITH.on))) : 1 + 0.18 * decay(t, MONOLITH.on, 9),
  sweep: travel(t, 6, MONOLITH.dur, -0.25, 1.2, 4),
});

export const MonolithWord: React.FC<MonolithWordProps> = ({ word, material = 'lacquer', tone, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  // the stage takes the value of the ground it is given (a film keeps one ground): the palette's ground, dark or light
  const [gL, gC, gH] = toOklch(P.ground);
  const dark = tone ? tone === 'dark' : gL < 0.5;
  const aH = toOklch(P.accent)[2];
  const text = word.replace(/\*/g, '').trim();
  // the word at rest: as big as 80 % of the width allows, at most 380 px
  const w100 = Math.max(1, measureTracked(text, 100, MONOLITH.weight, MONOLITH.track));
  const size = Math.min(MONOLITH.size * u, (0.8 * W * 100) / w100);
  const lw = (w100 * size) / 100;
  const cap = 0.73 * size;
  const floorY = 0.69 * H; // where it stands
  const top = floorY - baselineOf(size, MONOLITH.weight, 1);
  const left = W / 2 - lw / 2;
  // the camera: a macro on the first letters' bevel pulling back in log space, then a slow push, gliding from the
  // first letters to the word's middle; the orbit swings the solid's side across; the lights strike on
  const { s, glide, dx, on, sweep } = monolithCamera(t);
  const fx = mix(left + 0.2 * lw, W / 2, glide);
  const fy = mix(floorY - 0.62 * cap, H / 2 + 0.02 * H, glide);
  const dir: [number, number] = [dx, -0.14];
  // what it is made of, and the studio round it
  const white = oklch(0.985, 0.004, aH);
  const base = material === 'metal' ? oklch(0.8, 0.01, aH) : P.accent;
  const stage = dark ? mixColor(P.ground, P.accent, 0.1) : mixColor(P.ground, white, 0.5);
  const light = mixColor(P.accent, white, dark ? 0.42 : 0.6);
  // the shadow under it: deeper than the floor it falls on
  const shade = dark ? oklch(Math.min(gL, 0.3) * 0.3, gC, gH) : mixColor(P.ground, oklch(0.2, 0.02, aH), 0.85);
  const cam = `translate(${(W / 2).toFixed(2)}px, ${(H / 2).toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-fx).toFixed(2)}px, ${(-fy).toFixed(2)}px)`;
  const solid = (
    <SolidType
      text={text}
      size={size}
      family={FONT.text}
      weight={MONOLITH.weight}
      track={MONOLITH.track}
      base={base}
      kind={material}
      env={dark ? 'dark' : 'light'}
      depth={0.17 * size}
      dir={dir}
      sweep={sweep}
      light={on}
      x={left}
      y={top}
    />
  );
  // the studio is further away than the word: it moves a third as much (parallax)
  const sBack = 1 + (s - 1) * 0.32;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: stage }}>
      <Studio W={W} H={H} base={stage} light={light} tone={dark ? 'dark' : 'light'} horizon={0.66} pool={{ x: 0.5, y: 0.44, r: 0.4 }} on={on} scale={sBack} dx={(W / 2 - fx) * 0.25} dy={(H / 2 - fy) * 0.25} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: cam }}>
        {dark ? (
          <Reflection baseline={floorY} reach={0.45 * size} strength={0.26 * clamp(on)} blur={3 * u}>
            {solid}
          </Reflection>
        ) : null}
        <FloorShadow x={W / 2 + dx * 0.04 * size} y={floorY + 2 * u} w={lw * 1.02} ink={shade} strength={dark ? 1 : 0.55} />
        {solid}
      </div>
    </div>
  );
};

export const monolithWordMeta: SceneMeta = {
  id: 'monolith-word',
  does: 'the product\'s word stands as a lit solid in a studio; the lights strike on as the camera pulls back from its bevel and orbits so its side swings across',
  dur: MONOLITH.dur,
  props: ['word', 'material?', 'tone?', 'palette?'],
  handIn: null,
  handOut: { form: 'word', x: 460, y: 400, w: 1000, h: 300 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'drop', id: 'lights-on', weight: 0.85 },
    { f: 3, kind: 'whoosh', id: 'pull-back', weight: 0.5 },
    { f: 40, kind: 'land', id: 'settle', weight: 0.35 },
  ],
};
