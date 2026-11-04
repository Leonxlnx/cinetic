import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, type Ease } from '../../lib/anim';
import { f60x, type FilmCtx, filmOf, useFilm } from '../../lib/film';
import { type Cam, focalPx, frameOf, lensOfFov, type V3 } from './math';
import { type Box, camera, type CameraPath, type CamTo, crane, follow, frame, type Framing, macro, pull, push, rack, shotDeclares, travel } from './shots';
import { caretOf, Fan, fanSlots, type FontSpec, RiseBehind, type RiseBehindProps, STACK, typing, type Typing } from './stacks';
import { Plane, Stage3D } from './Stage3D';

/**
 * Ready-made depth shots: one component, a few props, the house camera inside. Each is a whole beat on a Stage3D
 * (lay the UI out flat on the 1080p design plane as usual; the scene stands the camera and runs one designed move
 * that starts, travels and lands). Frames are the scene's own (its Sequence's), house lengths at 60 fps converted to
 * the film's rate. Each scene's camera is also a pure function (macroTypeCamera ...), and `Scene.declares(props,
 * { offset, frames })` gives its shots to src/sync.ts declares() for the render checks. references/camera.md §13.
 *
 *   <MacroType box={INPUT} text="Plan my week" textX={INPUT.x + 96} font={FONT} render={(t, s) => <Input text={t} caret={s.caret} />} />
 *   <PageTravel size={[1200, 1700]} from={[520, 250]} to={[640, 1380]}><Doc /></PageTravel>
 *   <FanFocus cards={notes} size={[600, 144]} focus={2} />
 *   <PushIn box={SEND} plane={INPUT} front={<Pointer />}><Input /></PushIn>
 *   <CraneDown><Board /></CraneDown>
 *   <RiseScene word={<Giant>Plans</Giant>} wordBox={...} cards={plans} cardSize={[380, 440]} row={{ cx: 960, cy: 600, gap: 30 }} />
 */

type Film = Pick<FilmCtx, 'fps' | 'width' | 'height'>;
type DeclareOpts = { offset?: number; frames?: number; id?: string; film?: Partial<FilmCtx> };

const centreOf = (b: Box): V3 => [b.x + b.w / 2, b.y + b.h / 2, b.z ?? 0];
/** The film's design frame (1080 on the short side) and its opening camera. */
const stageOf = (film: Film) => ({ fr: frameOf(film.width, film.height), base: camera([], { film }).base });
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
/** The declarations of a scene's camera (src/sync.ts declares(): `{ id, ...MacroType.declares(props, { offset: ACT.x.from, frames: ACT.x.dur }) }`). */
const declaresOf = (path: CameraPath, o: DeclareOpts) => shotDeclares(path, o);

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
  /** The macro magnification (house 3.6; 2.5-4: the input fills a third of the frame's height or more). */
  mag?: number;
  /** Draws the input with the text typed so far; `ages` are the frames since each of the last 8 characters landed. */
  render: (typed: string, s: { f: number; caret: boolean; ages: number[]; done: boolean }) => React.ReactNode;
  /** Planes behind the input (Plane elements at negative z): a soft world the macro shot passes over. */
  behind?: React.ReactNode;
  ground?: React.ReactNode;
  seed?: string;
};

/** MacroType's typing and camera: a push onto the first characters at macro scale, then a follow of the caret. */
export const macroTypeCamera = (p: Omit<MacroTypeProps, 'render' | 'behind' | 'ground'>, film: Film): { t: Typing; cam: CameraPath } => {
  const { box, text, textX, font, at = 30, cps = 15, mag = 3.6, seed = 'macro' } = p;
  const fps = film.fps;
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
      push(p0, (from, f2) => ({ ...macro(box, { mag, yaw: -3 })(from, f2), target: caret(fo) }), { frames: pushLen, film, id: 'macro-push' }),
      follow(fo, caret, { frames: Math.max(lag + 1, t.end - fo + lag + f60x(12, fps)), lag, film, id: 'macro-follow' }),
    ],
    { film, base: { ...asBase(frame(box, { fill: 0.82, anchor: [0.36, 0.5] })(base, fr)), yaw: -2 } },
  );
  return { t, cam };
};

/**
 * The camera pushes onto the input's first characters at macro scale, then follows the caret as the line types,
 * holding it a little right of centre (the typed words fill the frame's left), and lands when the typing stops.
 */
const MacroTypeView: React.FC<MacroTypeProps> = (p) => {
  const film = useFilm();
  const f = useCurrentFrame();
  const { box, text, render, behind, ground } = p;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = React.useMemo(() => macroTypeCamera(p, film), [keyOf(text, p.at, p.cps, p.seed, p.mag, box, p.textX, p.font), film]);
  const n = plan.t.chars(f);
  const done = f >= plan.t.end + f60x(6, film.fps);
  const caret = !done || Math.floor((f - plan.t.end) / f60x(26, film.fps)) % 2 === 1 || f < plan.t.times[0];
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
export const MacroType = Object.assign(MacroTypeView, {
  declares: (p: Omit<MacroTypeProps, 'render' | 'behind' | 'ground'>, o: DeclareOpts = {}) => declaresOf(macroTypeCamera(p, filmOf(o.film)).cam, { id: 'macro-type', ...o }),
});

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
  /**
   * The camera: below the page looking up (pitch -48: the page lies back), to one side (yaw 14), its roll unwinding
   * from -9 to -4, a 30 mm lens closing from x1.25 to x1.55 as it travels (the small type it lands on reads).
   */
  look?: { pitch?: number; yaw?: number; roll?: [number, number]; lens?: number; mag?: [number, number]; aperture?: number };
  ground?: React.ReactNode;
  children: React.ReactNode;
};

/** The page's box (centred on the design plane) and PageTravel's camera. */
export const pageTravelCamera = (p: Omit<PageTravelProps, 'children' | 'ground'>, film: Film) => {
  const { size, from, to, at = 10, frames, look = {} } = p;
  const { fr } = stageOf(film);
  const x0 = (fr.W - size[0]) / 2;
  const lens = look.lens ?? 30;
  const roll = look.roll ?? [-9, -4];
  const mag = look.mag ?? [1.25, 1.55];
  const F = focalPx(fr, lens);
  const cam = camera([travel(at, { target: [x0 + to[0], to[1], 0], roll: roll[1], dist: F / mag[1] }, { frames: frames ?? f60x(160, film.fps), film, id: 'page-travel' })], {
    film,
    base: { target: [x0 + from[0], from[1], 0], dist: F / mag[0], lens, pitch: look.pitch ?? -48, yaw: look.yaw ?? 14, roll: roll[0], aperture: look.aperture },
  });
  return { box: { x: x0, y: 0, w: size[0], h: size[1] } as Box, cam };
};

const PageTravelView: React.FC<PageTravelProps> = (p) => {
  const film = useFilm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = React.useMemo(() => pageTravelCamera(p, film), [keyOf(p.size, p.from, p.to, p.at, p.frames, p.look), film]);
  return (
    <Stage3D camera={plan.cam} ground={p.ground}>
      <Plane id="page" box={plan.box} dof="plane">
        {p.children}
      </Plane>
    </Stage3D>
  );
};
export const PageTravel = Object.assign(PageTravelView, {
  declares: (p: Omit<PageTravelProps, 'children' | 'ground'>, o: DeclareOpts = {}) => declaresOf(pageTravelCamera(p, filmOf(o.film)).cam, { id: 'page-travel', ...o }),
});

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

/** FanFocus's slots and camera (count: how many cards). */
export const fanFocusCamera = (p: Omit<FanFocusProps, 'cards' | 'ground'> & { count: number }, film: Film) => {
  const { size, side = 1, centre, count } = p;
  const fps = film.fps;
  const k = p.focus ?? Math.min(2, count - 1);
  const { fr } = stageOf(film);
  const step = [-170 * side, -78, -250] as const;
  const c: [number, number] = centre ?? [fr.W / 2 + 190 * side, fr.H / 2 + 100];
  const slots = fanSlots({ cards: new Array(count).fill(null), size, at: c, step });
  const a = p.at ?? f60x(84, fps);
  const mid = slots[Math.floor((slots.length - 1) / 2)].centre;
  const cam = camera(
    [
      push(a, frame({ ...slots[k].box, z: slots[k].z }, { mag: 1.75, yaw: 24 * side, pitch: 9 }), { frames: f60x(84, fps), film, id: 'fan-push' }),
      rack(a + f60x(6, fps), slots[k].centre, { frames: f60x(42, fps), film, id: 'fan-rack' }),
    ],
    { film, base: { target: [mid[0], mid[1] - 80, mid[2]], dist: focalPx(fr, 50) / 1.3, yaw: 30 * side, pitch: 10, focus: slots[0].centre } },
  );
  return { at: c, step, cam };
};

const FanFocusView: React.FC<FanFocusProps> = (p) => {
  const film = useFilm();
  const { cards, size, enter = 6, ground } = p;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = React.useMemo(() => fanFocusCamera({ ...p, count: cards.length }, film), [cards.length, keyOf(size, p.side, p.centre, p.at, p.focus), film]);
  return (
    <Stage3D camera={plan.cam} ground={ground}>
      <Fan id="fan" cards={cards} size={size} at={plan.at} step={plan.step} enter={enter === false ? undefined : { at: enter }} />
    </Stage3D>
  );
};
export const FanFocus = Object.assign(FanFocusView, {
  declares: (p: Omit<FanFocusProps, 'cards' | 'ground'> & { count: number }, o: DeclareOpts = {}) => declaresOf(fanFocusCamera(p, filmOf(o.film)).cam, { id: 'fan-focus', ...o }),
});

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
  /** The opening framing (house: the plane's centre at x1.25). */
  from?: Framing;
  /** Planes in front (a pointer, a ring) and behind (soft depth). */
  front?: React.ReactNode;
  behind?: React.ReactNode;
  ground?: React.ReactNode;
  children: React.ReactNode;
};

/** PushIn's plane and camera. */
export const pushInCamera = (p: Omit<PushInProps, 'children' | 'front' | 'behind' | 'ground'>, film: Film) => {
  const { box, at = 14, frames, ease = E.strongInOut, mag, angle = {}, from } = p;
  const { fr, base } = stageOf(film);
  const plane = p.plane ?? { x: 0, y: 0, w: fr.W, h: fr.H };
  const open = from ? asBase(typeof from === 'function' ? from(base, fr) : from) : { target: centreOf(plane), dist: base.dist / 1.25 };
  const cam = camera([push(at, macro(box, { mag, yaw: angle.yaw ?? 12, pitch: angle.pitch ?? 5 }), { frames: frames ?? f60x(62, film.fps), ease, film, id: 'push-in' })], { film, base: open });
  return { plane, cam };
};

const PushInView: React.FC<PushInProps> = (p) => {
  const film = useFilm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = React.useMemo(() => pushInCamera(p, film), [keyOf(p.box, p.plane, p.at, p.frames, p.mag, p.angle), p.from, p.ease, film]);
  return (
    <Stage3D camera={plan.cam} ground={p.ground}>
      {p.behind}
      <Plane id="push-plane" box={plan.plane}>
        {p.children}
      </Plane>
      {p.front}
    </Stage3D>
  );
};
export const PushIn = Object.assign(PushInView, {
  declares: (p: Omit<PushInProps, 'children' | 'front' | 'behind' | 'ground'>, o: DeclareOpts = {}) => declaresOf(pushInCamera(p, filmOf(o.film)).cam, { id: 'push-in', ...o }),
});

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

/** CraneDown's plane and camera. */
export const craneDownCamera = (p: Omit<CraneDownProps, 'children' | 'front' | 'behind' | 'ground'>, film: Film) => {
  const { at = 0, frames, start = {}, land } = p;
  const { fr, base } = stageOf(film);
  const plane = p.plane ?? { x: 0, y: 0, w: fr.W, h: fr.H };
  const c = centreOf(plane);
  const cam = camera([crane(at, land ?? { target: c, dist: base.dist, pitch: 0, yaw: 0 }, { frames: frames ?? f60x(96, film.fps), film, id: 'crane-down' })], {
    film,
    base: { target: [c[0], c[1] + 60, c[2]], dist: base.dist / (start.mag ?? 0.72), pitch: start.pitch ?? 58, yaw: start.yaw ?? 0 },
  });
  return { plane, cam };
};

const CraneDownView: React.FC<CraneDownProps> = (p) => {
  const film = useFilm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = React.useMemo(() => craneDownCamera(p, film), [keyOf(p.plane, p.at, p.frames, p.start), p.land, film]);
  return (
    <Stage3D camera={plan.cam} ground={p.ground}>
      {p.behind}
      <Plane id="crane-plane" box={plan.plane} dof="plane">
        {p.children}
      </Plane>
      {p.front}
    </Stage3D>
  );
};
export const CraneDown = Object.assign(CraneDownView, {
  declares: (p: Omit<CraneDownProps, 'children' | 'front' | 'behind' | 'ground'>, o: DeclareOpts = {}) => declaresOf(craneDownCamera(p, filmOf(o.film)).cam, { id: 'crane-down', ...o }),
});

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

type RiseCamProps = Pick<RiseSceneProps, 'wordBox' | 'wordZ' | 'row' | 'z' | 'rise' | 'reveal'>;
/** RiseScene's camera: the pull back from the word, the rack from the word to the row. */
export const riseSceneCamera = (p: RiseCamProps, film: Film) => {
  const fps = film.fps;
  const riseAt = p.rise?.at ?? 12;
  const b = stageOf(film).base;
  const wc = centreOf(p.wordBox);
  const wordAt: V3 = [wc[0], wc[1], p.wordZ ?? STACK.rise.wordZ]; // the lens holds the word first ...
  const cardsAt: V3 = [p.row.cx, p.row.cy, p.z ?? STACK.rise.z]; // ... and racks to the row as the reveal lands
  const reveal = p.reveal ?? {};
  if (reveal === false) return camera([rack(riseAt + f60x(60, fps), cardsAt, { frames: f60x(36, fps), film, id: 'rise-rack' })], { film, base: { focus: wordAt } });
  const at = reveal.at ?? riseAt;
  const frames = reveal.frames ?? f60x(90, fps);
  return camera(
    [pull(at, { target: b.target, dist: b.dist }, { frames, film, id: 'rise-pull' }), rack(at + frames * 0.55, cardsAt, { frames: f60x(36, fps), film, id: 'rise-rack' })],
    { film, base: { target: [wc[0], wc[1] + 40, 0], dist: b.dist / (reveal.from ?? 1.32), focus: wordAt } },
  );
};

const RiseSceneView: React.FC<RiseSceneProps> = ({ rise = {}, reveal, ground, ...p }) => {
  const film = useFilm();
  const r = { ...rise, at: rise.at ?? 12 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cam = React.useMemo(() => riseSceneCamera({ ...p, rise: r, reveal }, film), [keyOf(reveal, p.wordBox, p.wordZ, p.row, p.z, r.at), film]);
  return (
    <Stage3D camera={cam} ground={ground}>
      <RiseBehind {...p} rise={r} />
    </Stage3D>
  );
};
export const RiseScene = Object.assign(RiseSceneView, {
  declares: (p: RiseCamProps, o: DeclareOpts = {}) => declaresOf(riseSceneCamera(p, filmOf(o.film)), { id: 'rise-scene', ...o }),
});
