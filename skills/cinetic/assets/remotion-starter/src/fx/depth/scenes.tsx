import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, type Ease } from '../../lib/anim';
import { f60x, useFilm } from '../../lib/film';
import { type Cam, focalPx, frameOf, lensOfFov, type V3 } from './math';
import { type Box, camera, type CamTo, crane, follow, frame, type Framing, macro, pull, push, rack, travel } from './shots';
import { caretOf, Fan, fanSlots, type FontSpec, RiseBehind, type RiseBehindProps, STACK, typing } from './stacks';
import { Plane, Stage3D } from './Stage3D';

/**
 * Ready-made depth shots: one component, a few props, the house camera inside. Each is a whole beat on a Stage3D
 * (lay the UI out flat on the 1080p design plane as usual; the scene stands the camera and runs one designed move
 * that starts, travels and lands). Frames are the scene's own (its Sequence's), house lengths at 60 fps converted to
 * the film's rate. references/camera.md §13 has the recipes.
 *
 *   <MacroType box={INPUT} text="Plan my week" textX={INPUT.x + 96} font={FONT} render={(t, s) => <Input text={t} caret={s.caret} />} />
 *   <PageTravel size={[1200, 1700]} from={[520, 250]} to={[640, 1380]}><Doc /></PageTravel>
 *   <FanFocus cards={notes} size={[600, 144]} focus={2} />
 *   <PushIn box={SEND} plane={INPUT} front={<Pointer />}><Input /></PushIn>
 *   <CraneDown plane={{ x: 0, y: 0, w: 1920, h: 1080 }}><Board /></CraneDown>
 *   <RiseScene word={<Giant>Pricing</Giant>} wordBox={...} cards={plans} cardSize={[380, 460]} row={{ cx: 960, cy: 640, gap: 28 }} />
 */

const centreOf = (b: Box): V3 => [b.x + b.w / 2, b.y + b.h / 2, b.z ?? 0];
/** The film's design frame (1080 on the short side) and its opening camera. */
const stageOf = (film: { width: number; height: number; fps: number }) => {
  const p = camera([], { film });
  return { fr: frameOf(film.width, film.height), base: p.base };
};
/** A framing as an opening camera (the fields it sets; the rest stay the house's). */
const asBase = (t: CamTo): Partial<Cam> => ({
  target: t.target,
  dist: t.dist,
  yaw: t.yaw,
  pitch: t.pitch,
  roll: t.roll,
  lens: t.lens ?? (t.fov !== undefined ? lensOfFov(t.fov) : undefined),
  aperture: t.aperture,
  focus: t.focus === 'target' ? null : t.focus,
});
/** A stable key for props given inline (a box literal is a new object on every frame). */
const keyOf = (...v: unknown[]) => JSON.stringify(v);

// ---------------------------------------------------------------------------------------------------------------
// MacroType: a macro move along an input as it types
// ---------------------------------------------------------------------------------------------------------------

export type MacroTypeProps = {
  /** The input's box on the 1080p design plane. */
  box: Box;
  /** The line that types into it (real words). */
  text: string;
  /** Where the typed text starts (design px, the x of its first glyph). */
  textX: number;
  /** The input's type, as it is drawn (the caret is measured with it). */
  font: FontSpec;
  /** The first key (house 30); the push lands as the first keys do. */
  at?: number;
  /** Characters a second (house 15: a person typing a prompt). */
  cps?: number;
  /** The macro magnification (house 3.6; 2.5-4: the input fills the frame's height by a third or more). */
  mag?: number;
  /** Draws the input with the text typed so far; `ages` are the frames since each of the last 8 characters landed. */
  render: (typed: string, s: { f: number; caret: boolean; ages: number[]; done: boolean }) => React.ReactNode;
  /** Planes behind the input (Plane elements at negative z): a soft world the macro shot passes over. */
  behind?: React.ReactNode;
  ground?: React.ReactNode;
  seed?: string;
};

/**
 * The camera pushes onto the input's first characters at macro scale, then follows the caret as the line types,
 * holding it a little right of centre (the typed words fill the frame's left), and lands when the typing stops.
 */
export const MacroType: React.FC<MacroTypeProps> = ({ box, text, textX, font, at = 30, cps = 15, mag = 3.6, render, behind, ground, seed = 'macro' }) => {
  const film = useFilm();
  const f = useCurrentFrame();
  const fps = film.fps;
  const plan = React.useMemo(() => {
    const { fr, base } = stageOf(film);
    const t = typing(text, { at, cps, seed, fps });
    const lead = -(0.1 * fr.W) / mag; // the caret rests 10 % of the frame right of centre, plus what the lag adds
    const cy = box.y + box.h / 2;
    const caret = (g: number): V3 => {
      const c = caretOf(t, { x: textX, y: cy, z: box.z ?? 0, font })(g);
      return [c[0] + lead, c[1], c[2]];
    };
    const pushLen = f60x(44, fps);
    const p0 = Math.max(0, at - f60x(30, fps));
    const lag = f60x(24, fps);
    const fo = p0 + pushLen;
    const cam = camera(
      [
        push(p0, (from, fr) => ({ ...macro(box, { mag, yaw: -3 })(from, fr), target: caret(fo) }), { frames: pushLen, film }),
        follow(fo, caret, { frames: Math.max(lag + 1, t.end - fo + lag + f60x(12, fps)), lag, film }),
      ],
      { film, base: { ...asBase(frame(box, { fill: 0.82, anchor: [0.36, 0.5] })(base, fr)), yaw: -2 } },
    );
    return { t, cam };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOf(text, at, cps, seed, mag, box, textX, font), film]);
  const n = plan.t.chars(f);
  const done = f >= plan.t.end + f60x(6, fps);
  const caret = !done || Math.floor((f - plan.t.end) / f60x(26, fps)) % 2 === 1 || f < plan.t.times[0];
  const ages = plan.t.times.slice(Math.max(0, n - 8), n).map((tt) => f - tt);
  return (
    <Stage3D camera={plan.cam} ground={ground}>
      {behind}
      <Plane id="macro-input" box={box}>
        {render(text.slice(0, n), { f, caret, ages, done })}
      </Plane>
    </Stage3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// PageTravel: a travel over a page lying back in perspective
// ---------------------------------------------------------------------------------------------------------------

export type PageTravelProps = {
  /** The page's own size (px); it is centred on the design plane. */
  size: [number, number];
  /** Where on the page the shot opens and where it lands (page px: the headline, then the table). */
  from: [number, number];
  to: [number, number];
  /** The travel's first frame and length (house 10 and 160 f@60, E.strongInOut). */
  at?: number;
  frames?: number;
  /** The camera: below the page looking up (pitch -48: the page lies back), to one side (yaw 14), its roll unwinding from -9 to -4, a 30 mm lens at x1.25. */
  look?: { pitch?: number; yaw?: number; roll?: [number, number]; lens?: number; mag?: number; aperture?: number };
  ground?: React.ReactNode;
  children: React.ReactNode;
};

export const PageTravel: React.FC<PageTravelProps> = ({ size, from, to, at = 10, frames, look = {}, ground, children }) => {
  const film = useFilm();
  const [w, h] = size;
  const { fr } = stageOf(film);
  const x0 = (fr.W - w) / 2;
  const cam = React.useMemo(() => {
    const lens = look.lens ?? 30;
    const F = focalPx(fr, lens);
    const roll = look.roll ?? [-9, -4];
    return camera([travel(at, { target: [x0 + to[0], to[1], 0], roll: roll[1] }, { frames: frames ?? f60x(160, film.fps), film })], {
      film,
      base: { target: [x0 + from[0], from[1], 0], dist: F / (look.mag ?? 1.25), lens, pitch: look.pitch ?? -48, yaw: look.yaw ?? 14, roll: roll[0], aperture: look.aperture },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOf(at, frames, x0, from, to, look), film]);
  return (
    <Stage3D camera={cam} ground={ground}>
      <Plane id="page" box={{ x: x0, y: 0, w, h }} dof="plane">
        {children}
      </Plane>
    </Stage3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// FanFocus: a fan of cards in depth, the camera to one side, the focus racking to one card as the camera closes on it
// ---------------------------------------------------------------------------------------------------------------

export type FanFocusProps = {
  /** The cards, front first (real content: notifications, rows, photos, prices). */
  cards: React.ReactNode[];
  /** One card's size (px at 1080p). */
  size: [number, number];
  /** The card the shot lands on (house: the third, or the last). */
  focus?: number;
  /** When the camera starts closing on it and the focus racks (house 84 f@60). */
  at?: number;
  /** When the cards slide forward into their slots (house 6; false: they are there). */
  enter?: number | false;
  /** The side the camera stands on (house 1: right, the fan reads back to the left). */
  side?: 1 | -1;
  /** The front card's centre (house: right of centre, low). */
  centre?: [number, number];
  ground?: React.ReactNode;
};

export const FanFocus: React.FC<FanFocusProps> = ({ cards, size, focus, at, enter = 6, side = 1, centre, ground }) => {
  const film = useFilm();
  const fps = film.fps;
  const k = focus ?? Math.min(2, cards.length - 1);
  const fan = React.useMemo(() => {
    const { fr } = stageOf(film);
    const step = [-170 * side, -78, -250] as const;
    const c: [number, number] = centre ?? [fr.W / 2 + 190 * side, fr.H / 2 + 100];
    const slots = fanSlots({ cards, size, at: c, step });
    const a = at ?? f60x(84, fps);
    const mid = slots[Math.floor((slots.length - 1) / 2)].centre;
    const cam = camera(
      [push(a, frame({ ...slots[k].box, z: slots[k].z }, { mag: 1.75, yaw: 24 * side, pitch: 9 }), { frames: f60x(84, fps), film }), rack(a + f60x(6, fps), slots[k].centre, { frames: f60x(42, fps), film })],
      { film, base: { target: [mid[0], mid[1] - 80, mid[2]], dist: focalPx(fr, 50) / 1.3, yaw: 30 * side, pitch: 10, focus: slots[0].centre } },
    );
    return { c, step, cam };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, keyOf(size, side, centre, at, k), film]);
  return (
    <Stage3D camera={fan.cam} ground={ground}>
      <Fan id="fan" cards={cards} size={size} at={fan.c} step={fan.step} enter={enter === false ? undefined : { at: enter }} />
    </Stage3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// PushIn: a push into one element (a button as it is pressed, a row, a figure)
// ---------------------------------------------------------------------------------------------------------------

export type PushInProps = {
  /** The element the camera closes on (its box on the design plane). */
  box: Box;
  /** The UI plane it sits on (house: the whole frame); keep it as small as the UI so type rasterises sharp up close. */
  plane?: Box;
  /** The push's first frame and length (house 14 and 62 f@60, E.strongInOut). */
  at?: number;
  frames?: number;
  ease?: Ease;
  /** Magnification at the landing (house: macro, 2.5-4 as fits) and the angle it lands at (house yaw 12, pitch 5). */
  mag?: number;
  angle?: { yaw?: number; pitch?: number };
  /** The opening framing (house: the plane framed 1:1 at x1.25 about its centre). */
  from?: Framing;
  /** Planes in front (a pointer, a ring) and behind (soft depth). */
  front?: React.ReactNode;
  behind?: React.ReactNode;
  ground?: React.ReactNode;
  children: React.ReactNode;
};

export const PushIn: React.FC<PushInProps> = ({ box, plane: planeIn, at = 14, frames, ease = E.strongInOut, mag, angle = {}, from, front, behind, ground, children }) => {
  const film = useFilm();
  const { fr } = stageOf(film);
  const plane = planeIn ?? { x: 0, y: 0, w: fr.W, h: fr.H };
  const cam = React.useMemo(() => {
    const { base } = stageOf(film);
    const open = from ? asBase(typeof from === 'function' ? from(base, fr) : from) : { target: centreOf(plane), dist: base.dist / 1.25 };
    return camera([push(at, macro(box, { mag, yaw: angle.yaw ?? 12, pitch: angle.pitch ?? 5 }), { frames: frames ?? f60x(62, film.fps), ease, film })], { film, base: open });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOf(plane, at, box, mag, angle, frames), from, ease, film]);
  return (
    <Stage3D camera={cam} ground={ground}>
      {behind}
      <Plane id="push-plane" box={plane}>
        {children}
      </Plane>
      {front}
    </Stage3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// CraneDown: the camera swings down from above onto a scene and lands face-on for the read
// ---------------------------------------------------------------------------------------------------------------

export type CraneDownProps = {
  /** The scene's plane on the design plane (house: the whole frame). */
  plane?: Box;
  /** The crane's first frame and length (house 0 and 96 f@60, E.strongInOut). */
  at?: number;
  frames?: number;
  /** Where it starts: above the scene looking down (house pitch 58, x0.72) and where it lands (house front-on, 1:1). */
  start?: { pitch?: number; yaw?: number; mag?: number };
  land?: Framing;
  behind?: React.ReactNode;
  front?: React.ReactNode;
  ground?: React.ReactNode;
  children: React.ReactNode;
};

export const CraneDown: React.FC<CraneDownProps> = ({ plane: planeIn, at = 0, frames, start = {}, land, behind, front, ground, children }) => {
  const film = useFilm();
  const { fr } = stageOf(film);
  const plane = planeIn ?? { x: 0, y: 0, w: fr.W, h: fr.H };
  const cam = React.useMemo(() => {
    const { base } = stageOf(film);
    const c = centreOf(plane);
    return camera([crane(at, land ?? { target: c, dist: base.dist, pitch: 0, yaw: 0 }, { frames: frames ?? f60x(96, film.fps), film })], {
      film,
      base: { target: [c[0], c[1] + 60, c[2]], dist: base.dist / (start.mag ?? 0.72), pitch: start.pitch ?? 58, yaw: start.yaw ?? 0 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOf(plane, at, frames, start), land, film]);
  return (
    <Stage3D camera={cam} ground={ground}>
      {behind}
      <Plane id="crane-plane" box={plane} dof="plane">
        {children}
      </Plane>
      {front}
    </Stage3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// RiseScene: a giant word in front, cards rising behind it while the camera pulls back to reveal the row; the lens
// holds the word, then racks to the row as the reveal lands
// ---------------------------------------------------------------------------------------------------------------

export type RiseSceneProps = Omit<RiseBehindProps, 'rise'> & {
  /** When the cards rise (house 12) and how (RiseBehind's house: 460 px from below, 40 f each, 8 f apart, the middle first). */
  rise?: Partial<RiseBehindProps['rise']>;
  /** The pull back that reveals the row (house: from x1.32 on the word to 1:1, 90 f@60 from the rise, E.strongInOut); false: still. */
  reveal?: { at?: number; frames?: number; from?: number } | false;
  ground?: React.ReactNode;
};

export const RiseScene: React.FC<RiseSceneProps> = ({ rise = {}, reveal = {}, ground, ...p }) => {
  const film = useFilm();
  const r = { at: rise.at ?? 12, ...rise };
  const cam = React.useMemo(() => {
    const b = camera([], { film }).base;
    const wc = centreOf(p.wordBox);
    const wordAt: V3 = [wc[0], wc[1], p.wordZ ?? STACK.rise.wordZ]; // the lens holds the word first ...
    const cardsAt: V3 = [p.row.cx, p.row.cy, p.z ?? STACK.rise.z]; // ... and racks to the row as the reveal lands
    if (reveal === false) return camera([rack(r.at + f60x(60, film.fps), cardsAt, { frames: f60x(36, film.fps), film })], { film, base: { focus: wordAt } });
    const at = reveal.at ?? r.at;
    const frames = reveal.frames ?? f60x(90, film.fps);
    const start = { target: [wc[0], wc[1] + 40, 0] as V3, dist: b.dist / (reveal.from ?? 1.32), focus: wordAt };
    return camera(
      [pull(at, { target: b.target, dist: b.dist }, { frames, film }), rack(at + frames * 0.55, cardsAt, { frames: f60x(36, film.fps), film })],
      { film, base: start },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOf(reveal, p.wordBox, p.wordZ, p.row, p.z, r.at), film]);
  return (
    <Stage3D camera={cam} ground={ground}>
      <RiseBehind {...p} rise={r} />
    </Stage3D>
  );
};
