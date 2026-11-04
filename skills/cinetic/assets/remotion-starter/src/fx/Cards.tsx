import React from 'react';
import { Img } from 'remotion';
import { C } from '../brand/tokens';
import { clamp, curveOf, DUR, E, type Ease, expOut, M, mix, PRESS, SPR, type Spr, spr } from '../lib/anim';
import { KitFallback } from '../kit/panels';
import { kitTheme } from '../kit/theme';
import { morphBox, type MorphBox } from '../lib/box';
import { toOklch } from '../lib/color';
import { defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { type CardImage, imageZoom } from '../lib/image';
import type { Declares } from '../timeline';

// UI cards and product surfaces: the states every product moment is built from. Each is a pure function
// of the frame (any frame, any order, sub-frames included) plus one component that draws it with
// transforms and opacity only.
//
//   enterState   a panel arriving front-loaded: peak speed on its first frame, a long settle, an optional
//                tilted plane whose lean lags the position, an optional defocus on the first frames
//   cardArrive   a physical card: position and rotation on ONE curve, then a living creep
//   demote       the card already there steps back (smaller, up) centred on the newcomer's arrival
//   press        squeeze, hold, release: the grammar of a click
//   bento        tiles unfold from one layout to another on one shared ease, with per-tile delays
//   springBox    the film's one spring: a container popping open past its size and back
//   widenState   a card or a capsule opening from a sliver at its centre to its full width (width 1 % -> 10 % ->
//                31 % -> 93 % -> 100 % over 40 f, the content fading in over the last third), never a fade or a scale
//   CARD_TILT    planes a card leans on for a close-up: leanBack (27 deg back about its top edge, perspective 1000:
//                the top edge about 80 % of the bottom, the foot nearer the lens), aside (turned 22 deg), floor
//   <Card>       draws any of them, with built UI or a supplied image (screenshot, product shot) as content
//   <Bento>      draws a bento unfold, each tile built or an image cropped to its moving box
//
// Content is required: built UI (children / content), a picture (image), or `blank` on purpose. A card
// or tile given none draws real product UI from the kit (src/kit) instead of an empty slab, and lint-film
// reports it (card-content). Build product UI at film size (brand/tokens.ts UI_FILM: the web design x1.9).
//
// House numbers (60 fps): entrance 34 f on E.snapOut from 240 px below, lean 10 deg flattening 6 f behind
// the position; arrival 50 f on E.snapOut with rotation on the same curve; demotion 20 f to x0.82 and
// 87 px up on E.whipBuild, centred on the arrival; press to x0.87 in 9 f, hold 3 f, release 10 f; bento
// 44 f on E.snapOut; the spring is SPR.landing (about 10 % over), once per film (timeline SPRING_CLASS).

type Pt = { x: number; y: number };

/** The layout unit of a partial film context: 1 at 1080p, or 1 when the size is not given (pure helpers). */
const uIf = (film?: Partial<FilmCtx>) => (film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1);

// ------------------------------------------------------------------------------------------ entrance
export type EnterProps = {
  start: number; // the first frame of the move: drawn from here at progress 0
  dur?: number; // frames (fractional is fine); default 34 f at 60 fps
  ease?: Ease; // an arrive curve (peak speed on the first frame); default E.snapOut
  /** Offset at progress 0, px in the frame (default y 240 px at 1080p below, no x, scale 1, opacity 1). */
  from?: { x?: number; y?: number; scale?: number; opacity?: number };
  /**
   * The plane the panel rides on, degrees (rotateX for axis 'x': positive leans the top away). It goes
   * from `from` to `to` on `ease` over `dur`, starting `lag` frames after the position (from === to: a
   * fixed tilted plane). Default: 10 -> 0 deg, lag 6 f, dur = the entrance's, E.glideOut. false: flat.
   */
  lean?: { from?: number; to?: number; lag?: number; dur?: number; ease?: Ease; axis?: 'x' | 'y' } | false;
  /** Entry defocus: `sigma` px at 1080p on the first frame, clearing over `frames` (default off). */
  defocus?: { sigma?: number; frames?: number; ease?: Ease } | false;
};

export type EnterState = { p: number; x: number; y: number; scale: number; opacity: number; lean: number; axis: 'x' | 'y'; sigma: number; phase: 'before' | 'moving' | 'done' };

const HOUSE = { enter60: DUR.ui[2], enterY: 240, lean: 10, leanLag60: 6, arrive60: DUR.ui[3], demote60: 20, demoteScale: 0.82, demoteY: 87, bento60: 44, depth: 0.87 } as const;

/** The animated numbers of a front-loaded entrance at frame f. Pure, closed form. */
export const enterState = (f: number, o: EnterProps, film?: Partial<FilmCtx>): EnterState => {
  const fps = fpsOf(film);
  const u = uIf(film);
  const dur = Math.max(1e-6, o.dur ?? f60x(HOUSE.enter60, fps));
  const t = clamp((f - o.start) / dur);
  const p = (o.ease ?? E.snapOut)(t);
  const fr = o.from ?? {};
  const fy = fr.y ?? HOUSE.enterY * u;
  const lean = o.lean === false ? { from: 0, to: 0 } : o.lean ?? {};
  const lf = lean.from ?? HOUSE.lean;
  const lt = lean.to ?? 0;
  const lag = lean.lag ?? f60x(HOUSE.leanLag60, fps);
  const ld = Math.max(1e-6, lean.dur ?? dur);
  const lp = lf === lt ? 0 : (lean.ease ?? E.glideOut)(clamp((f - o.start - lag) / ld));
  let sigma = 0;
  if (o.defocus) {
    const s0 = o.defocus.sigma ?? 4;
    const fr0 = Math.max(1e-6, o.defocus.frames ?? f60x(6, fps));
    sigma = f < o.start ? s0 : s0 * (1 - (o.defocus.ease ?? E.linear)(clamp((f - o.start) / fr0)));
  }
  return {
    p,
    x: (fr.x ?? 0) * (1 - p),
    y: fy * (1 - p),
    scale: mix(fr.scale ?? 1, 1, p),
    opacity: mix(fr.opacity ?? 1, 1, p),
    lean: mix(lf, lt, lp),
    axis: lean.axis ?? 'x',
    sigma,
    phase: f < o.start ? 'before' : t >= 1 ? 'done' : 'moving',
  };
};

// ------------------------------------------------------------------------------------------ widen
/** A reveal that opens a card or a capsule from its centre: knots of the width share at t = 0, 1/4 ... 1 (40 f at 60 fps). */
export const WIDEN = { dur60: 40, knots: [0.01, 0.1, 0.31, 0.93, 1], content: 0.66 } as const;
export type WidenProps = { at: number; dur60?: number; content?: number }; // content: the share of the reveal after which the content fades in
export type WidenState = { width: number; inset: number; content: number; done: boolean };
const widenEase = curveOf(WIDEN.knots);
/** The width share (of the card's own width, opened about its centre), the inset per side and the content's opacity at frame f. Pure. */
export const widenState = (f: number, o: WidenProps, film?: Partial<FilmCtx>): WidenState => {
  const dur = Math.max(1, f60x(o.dur60 ?? WIDEN.dur60, fpsOf(film)));
  const t = clamp((f - o.at) / dur);
  if (f < o.at) return { width: 0, inset: 0.5, content: 0, done: false };
  const width = mix(WIDEN.knots[0], 1, widenEase(t));
  const c0 = o.content ?? WIDEN.content;
  return { width, inset: (1 - width) / 2, content: E.softOut(clamp((t - c0) / (1 - c0))), done: t >= 1 };
};

// ------------------------------------------------------------------------------------------ tilt
/** A fixed plane for a card: degrees (rx > 0 leans the top away), the transform origin inside the card, perspective px at 1080p. */
export type CardTiltSpec = { rx?: number; ry?: number; rz?: number; origin?: Pt; perspective?: number };
export const CARD_TILT = {
  leanBack: { rx: 27, ry: 0, origin: { x: 0.5, y: 0 }, perspective: 1000 }, // the close-up before a snap: the card lies back, its foot toward the lens
  aside: { rx: 6, ry: -22, origin: { x: 0.5, y: 0.5 }, perspective: 1400 }, // a card turned toward the line beside it
  floor: { rx: 58, ry: 0, origin: { x: 0.5, y: 1 }, perspective: 1200 }, // a sheet lying on the floor of the set, seen from above
} as const satisfies Record<string, CardTiltSpec>;
/** The CSS of a fixed plane (perspective first). Pure. */
export const cardTiltCss = (t: CardTiltSpec | undefined, film?: Partial<FilmCtx>): string => {
  if (!t || (!t.rx && !t.ry && !t.rz)) return '';
  return `perspective(${((t.perspective ?? 1400) * uIf(film)).toFixed(1)}px) rotateX(${(t.rx ?? 0).toFixed(3)}deg) rotateY(${(t.ry ?? 0).toFixed(3)}deg) rotateZ(${(t.rz ?? 0).toFixed(3)}deg)`;
};

// ------------------------------------------------------------------------------------- card arrival
export type ArriveProps = {
  start: number; // first frame of the arrival (drawn from here, at the `from` pose)
  dur?: number; // default 50 f at 60 fps
  ease?: Ease; // ONE curve for position, rotation and scale; default E.snapOut
  /** The pose at progress 0, relative to rest: px, degrees, scale. */
  from: { x?: number; y?: number; rot?: number; scale?: number };
  /** Living hold: px per second the card keeps drifting from its start (a card that lands and stays alive). */
  creep?: { x?: number; y?: number };
};
export type ArriveState = { p: number; x: number; y: number; rot: number; scale: number; phase: 'before' | 'moving' | 'done' };

/** A physical card arriving: position, rotation and scale ride one curve (they never drift apart), then creep. */
export const cardArrive = (f: number, o: ArriveProps, film?: Partial<FilmCtx>): ArriveState => {
  const fps = fpsOf(film);
  const dur = Math.max(1e-6, o.dur ?? f60x(HOUSE.arrive60, fps));
  const t = clamp((f - o.start) / dur);
  const p = (o.ease ?? E.snapOut)(t);
  const s = Math.max(0, f - o.start) / fps;
  return {
    p,
    x: (o.from.x ?? 0) * (1 - p) + (o.creep?.x ?? 0) * s,
    y: (o.from.y ?? 0) * (1 - p) + (o.creep?.y ?? 0) * s,
    rot: (o.from.rot ?? 0) * (1 - p),
    scale: mix(o.from.scale ?? 1, 1, p),
    phase: f < o.start ? 'before' : t >= 1 ? 'done' : 'moving',
  };
};

// --------------------------------------------------------------------------------------- demotion
export type DemoteProps = {
  at: number; // the frame the demotion is half done: put it on the newcomer's arrival
  dur?: number; // default 20 f at 60 fps
  ease?: Ease; // a reposition curve; default E.whipBuild
  /** Where it steps back to: scale (default 0.82), px offsets (default 87 px up at 1080p), opacity (default 1). */
  to?: { scale?: number; x?: number; y?: number; opacity?: number };
};
export type DemoteState = { q: number; x: number; y: number; scale: number; opacity: number };

/** The card already on screen stepping back while a new one lands; its midpoint sits on the arrival. */
export const demote = (f: number, o: DemoteProps, film?: Partial<FilmCtx>): DemoteState => {
  const fps = fpsOf(film);
  const u = uIf(film);
  const dur = Math.max(1e-6, o.dur ?? f60x(HOUSE.demote60, fps));
  const q = (o.ease ?? E.whipBuild)(clamp((f - (o.at - dur / 2)) / dur));
  const to = o.to ?? {};
  return { q, x: (to.x ?? 0) * q, y: (to.y ?? -HOUSE.demoteY * u) * q, scale: mix(1, to.scale ?? HOUSE.demoteScale, q), opacity: mix(1, to.opacity ?? 1, q) };
};

// ------------------------------------------------------------------------------------------ press
export type PressOpts = {
  depth?: number; // scale at the bottom of the press (default 0.87)
  down?: number; // frames squeezing in (default 9 f at 60 fps)
  hold?: number; // frames held at the bottom (default 3 f)
  up?: number; // frames releasing (default 10 f)
  easeDown?: Ease; // default M.press
  easeUp?: Ease; // how the release runs from the bottom back to rest; default E.buildIn (snaps home at speed, no overshoot)
};
export type PressState = { scale: number; q: number; phase: 'rest' | 'down' | 'hold' | 'up' };

/**
 * A press at `at` (the first frame of the squeeze; put the click sound on it): scale 1 -> depth -> 1 with no
 * value above 1 afterwards. `q` is the press amount 0..1 (drive a colour snap or a shadow from it).
 */
export const press = (f: number, at: number, o: PressOpts = {}, film?: Partial<FilmCtx>): PressState => {
  const fps = fpsOf(film);
  const down = Math.max(1e-6, o.down ?? f60x(PRESS.squeeze, fps));
  const hold = Math.max(0, o.hold ?? f60x(PRESS.hold, fps));
  const up = Math.max(1e-6, o.up ?? f60x(PRESS.release, fps));
  const depth = o.depth ?? HOUSE.depth;
  const t = f - at;
  let q = 0;
  let phase: PressState['phase'] = 'rest';
  if (t > 0 && t < down) {
    q = (o.easeDown ?? M.press)(t / down);
    phase = 'down';
  } else if (t >= down && t <= down + hold) {
    q = 1;
    phase = 'hold';
  } else if (t > down + hold && t < down + hold + up) {
    q = 1 - (o.easeUp ?? E.buildIn)((t - down - hold) / up);
    phase = 'up';
  }
  q = clamp(q);
  return { scale: 1 - (1 - depth) * q, q, phase };
};

// ------------------------------------------------------------------------------------------ bento
export type BentoOpts = {
  start: number;
  dur?: number; // default 44 f at 60 fps
  ease?: Ease; // ONE shared arrive curve; default E.snapOut
  /** Or: a constant share of the remaining distance kept every frame (0.80 = the house unfold), landing at `dur`. */
  decay?: number;
  delays?: number[]; // frames after `start`, per tile (missing = 0)
  durs?: number[]; // per-tile duration (missing = dur)
  eases?: (Ease | undefined)[]; // per-tile override (missing = the shared curve)
};

/** The ease a remaining-distance ratio per frame stands for, landing at `dur` frames: expOut(-dur ln r). */
export const decayEase = (ratio: number, dur: number): Ease => expOut(Math.max(1e-3, -Math.max(1e-6, dur) * Math.log(clamp(ratio, 1e-6, 0.999999))));

/** Progress of each tile of a bento unfold at frame f. */
export const bentoProgress = (f: number, n: number, o: BentoOpts, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  const dur = Math.max(1e-6, o.dur ?? f60x(HOUSE.bento60, fps));
  return Array.from({ length: n }, (_, i) => {
    const d = Math.max(1e-6, o.durs?.[i] ?? dur);
    const shared = o.decay !== undefined ? decayEase(o.decay, d) : (o.ease ?? E.snapOut);
    return (o.eases?.[i] ?? shared)(clamp((f - o.start - (o.delays?.[i] ?? 0)) / d));
  });
};

/** The boxes of a bento unfold from layout A to layout B at frame f (lib/box morphBox per tile). */
export const bento = (f: number, A: MorphBox[], B: MorphBox[], o: BentoOpts, film?: Partial<FilmCtx>): Required<MorphBox>[] => {
  const p = bentoProgress(f, Math.min(A.length, B.length), o, film);
  return p.map((q, i) => morphBox(A[i], B[i], q));
};

// ------------------------------------------------------------------------------------ the one spring
export type SpringBoxOpts = {
  A: MorphBox; // the container before
  B: MorphBox; // the container at rest
  preset?: Spr; // default SPR.landing (the film's one underdamped class)
};

/** The container popping from A to B on a spring started at `start` (fractional starts are fine): it passes B and comes back. */
export const springBox = (f: number, start: number, o: SpringBoxOpts, film?: Partial<FilmCtx>): Required<MorphBox> & { p: number } => {
  const p = f < start ? 0 : spr(f, start, o.preset ?? SPR.landing, fpsOf(film));
  return { ...morphBox(o.A, o.B, p), p };
};

// ------------------------------------------------------------------------------------------ drawing
// A supplied picture as a card's content, and its slow zoom: lib/image.ts (pure, shared with fx/Develop).
export { type CardImage, imageZoom };

/** Draws a CardImage filling its parent (position absolute, inset 0). */
export const CardPicture: React.FC<{ image: CardImage; frame?: number; radius?: number }> = ({ image, frame = 0, radius }) => {
  const { fps } = useFilm();
  const fx = clamp(image.focus?.x ?? 0.5) * 100;
  const fy = clamp(image.focus?.y ?? 0.5) * 100;
  const z = imageZoom(frame, image, fps);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius, background: image.background }}>
      <Img data-imagery=""
        src={image.src}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          objectFit: image.fit ?? 'cover',
          objectPosition: `${fx}% ${fy}%`,
          transformOrigin: `${fx}% ${fy}%`,
          transform: z !== 1 ? `scale(${z.toFixed(5)})` : undefined,
        }}
      />
    </div>
  );
};

/** The paper shadow of a card in ink at `a` alpha, `y` px down, `blur` px (a dip, never a glow). */
const shadowCss = (s: MorphBox['shadow']) => (s && s.a > 0.001 ? `0 ${s.y.toFixed(2)}px ${s.blur.toFixed(2)}px rgba(0, 0, 0, ${s.a.toFixed(3)})` : undefined);

/**
 * What a card shows: built UI (`children`), a supplied picture (`image`), or, on purpose, nothing
 * (`blank`: a backdrop or a pure shape). One of them is required: a card is never an empty slab or a stack
 * of grey placeholder bars. A card given none still renders (old code keeps working), with real product
 * UI from the kit (kit/KitFallback) in its box, and lint-film reports it (card-content).
 */
export type CardContent = { children: React.ReactNode; image?: CardImage; blank?: false } | { image: CardImage; children?: React.ReactNode; blank?: false } | { blank: true; image?: undefined; children?: undefined };

export type CardProps = {
  frame: number; // local frame (useCurrentFrame() of the caller)
  box: MorphBox; // the card at rest, frame px (x, y = top-left)
  enter?: EnterProps;
  arrive?: ArriveProps;
  demote?: DemoteProps;
  press?: { at: number } & PressOpts;
  spring?: { start: number; from: MorphBox; preset?: Spr }; // the box pops from `from` to `box`
  perspective?: number; // px, for the lean plane (default 1800 at 1080p)
  origin?: Pt; // transform origin inside the box, 0..1 (default the centre, or the tilt's origin)
  tilt?: CardTiltSpec; // a fixed plane the card leans on (CARD_TILT.leanBack for the close-up before a snap)
  reveal?: WidenProps; // the card opens from a sliver at its centre (widenState), its content fading in last
  style?: React.CSSProperties;
  seed?: number; // which kit panel a content-less card falls back to (default 0)
} & CardContent; // image: a supplied picture (drawn under the children); children: built UI, laid out in a box.w x box.h box

/** The kit theme that sits on a card's fill: a light fill gets the paper kit, a dark or mid one the slate kit. */
const fallbackTheme = (fill?: string) => kitTheme(fill && toOklch(fill)[0] < 0.6 ? 'slateMid' : 'tintedPaper');

/**
 * A card: the box with its fill, radius and dip shadow, content clipped to it (built UI or a supplied
 * picture), moved by whichever states are given (entrance, arrival, demotion, press, spring), all
 * composed into one transform. The entrance's defocus is drawn as at most two copies at fixed ladder
 * radii (lib/defocus), never an animated blur radius; it ends sharp.
 */
export const Card: React.FC<CardProps> = (props) => {
  const film = useFilm();
  const { frame: f } = props;
  const u = uOf(film);
  const rest = props.spring ? springBox(f, props.spring.start, { A: props.spring.from, B: props.box, preset: props.spring.preset }, film) : morphBox(props.box, props.box, 1);
  const en = props.enter ? enterState(f, props.enter, film) : null;
  const ar = props.arrive ? cardArrive(f, props.arrive, film) : null;
  const de = props.demote ? demote(f, props.demote, film) : null;
  const pr = props.press ? press(f, props.press.at, props.press, film) : null;
  const tx = (en?.x ?? 0) + (ar?.x ?? 0) + (de?.x ?? 0);
  const ty = (en?.y ?? 0) + (ar?.y ?? 0) + (de?.y ?? 0);
  const k = (en?.scale ?? 1) * (ar?.scale ?? 1) * (de?.scale ?? 1) * (pr?.scale ?? 1);
  const rot = ar?.rot ?? 0;
  const opacity = (en?.opacity ?? 1) * (de?.opacity ?? 1);
  const o = props.origin ?? props.tilt?.origin ?? { x: 0.5, y: 0.5 };
  const persp = (props.perspective ?? 1800) * u;
  const wd = props.reveal ? widenState(f, props.reveal, film) : null;
  const plane = cardTiltCss(props.tilt, film);
  const lean = en && Math.abs(en.lean) > 1e-4 ? (en.axis === 'x' ? `perspective(${persp.toFixed(1)}px) rotateX(${en.lean.toFixed(4)}deg)` : `perspective(${persp.toFixed(1)}px) rotateY(${en.lean.toFixed(4)}deg)`) : '';
  const transform = `translate3d(${(rest.x + tx).toFixed(3)}px, ${(rest.y + ty).toFixed(3)}px, 0) ${plane} ${lean} rotate(${rot.toFixed(4)}deg) scale(${k.toFixed(5)})`.replace(/\s+/g, ' ');
  const clip = wd && !wd.done ? `inset(0 ${(wd.inset * 100).toFixed(3)}% 0 ${(wd.inset * 100).toFixed(3)}% round ${rest.r.toFixed(2)}px)` : undefined;
  const inner = wd ? wd.content : 1;
  const face = (key: number, level: number, op: number) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: rest.w,
        height: rest.h,
        borderRadius: rest.r,
        overflow: 'hidden',
        background: rest.fill,
        boxShadow: level > 0 ? undefined : shadowCss(rest.shadow),
        opacity: op,
        filter: level > 0 ? `blur(${level}px)` : undefined,
      }}
    >
      {props.image && <div style={{ position: 'absolute', inset: 0, opacity: inner }}><CardPicture image={props.image} frame={f} /></div>}
      {props.children !== undefined && <div style={{ position: 'absolute', left: 0, top: 0, width: props.box.w, height: props.box.h, opacity: inner }}>{props.children}</div>}
      {props.children === undefined && !props.image && !props.blank && <KitFallback frame={f} w={props.box.w} h={props.box.h} seed={props.seed} theme={fallbackTheme(rest.fill)} />}
      {rest.strokeW > 0.01 && <div style={{ position: 'absolute', inset: 0, borderRadius: rest.r, boxShadow: `inset 0 0 0 ${rest.strokeW.toFixed(2)}px ${rest.stroke}` }} />}
    </div>
  );
  const copies = en && en.sigma * u >= 0.5 ? defocusMix(en.sigma * u) : [{ level: 0, weight: 1 }];
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: rest.w,
        height: rest.h,
        opacity: wd && f < (props.reveal?.at ?? 0) ? 0 : opacity,
        transformOrigin: `${(o.x * 100).toFixed(2)}% ${(o.y * 100).toFixed(2)}%`,
        transform,
        clipPath: clip,
        ...props.style,
      }}
    >
      {copies.map((c, i) => face(i, c.level, i === 0 ? 1 : c.weight))}
    </div>
  );
};

/**
 * One bento tile. `contentAnchor` places built content: 'layout' (default) keeps it at its place in the final
 * layout, revealed by the moving box (right when a tile opens in place); 'box' rides the box's top-left corner,
 * laid out at B's size and clipped (right when a tile flies across the layout, so its header travels with it).
 */
export type BentoTile = { A: MorphBox; B: MorphBox; contentAnchor?: 'layout' | 'box' } & (
  | { content: React.ReactNode; image?: CardImage; blank?: false }
  | { image: CardImage; content?: React.ReactNode; blank?: false }
  | { blank: true; image?: undefined; content?: undefined }
); // like a card, a tile shows built UI, a picture or, on purpose, nothing (a tile given none falls back to kit UI)

/**
 * A bento unfold: every tile's box travels from A to B (x, y, size, radius, fill, shadow) on one shared
 * curve with its own delay. Built content keeps its size (laid out in B's box) so text never scales: by
 * default it holds its place in the final layout, revealed by the moving rounded box; with
 * `contentAnchor: 'box'` it rides the box's corner. A picture re-crops to the box as it grows (cover around
 * its focus), the way a photo opens into its slot.
 */
export const Bento: React.FC<{ frame: number; tiles: BentoTile[]; style?: React.CSSProperties } & BentoOpts> = ({ frame, tiles, style, ...o }) => {
  const film = useFilm();
  const boxes = bento(
    frame,
    tiles.map((t) => t.A),
    tiles.map((t) => t.B),
    o,
    film,
  );
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {boxes.map((m, i) => {
        const t = tiles[i];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: m.w,
              height: m.h,
              borderRadius: m.r,
              overflow: 'hidden',
              background: m.fill,
              boxShadow: shadowCss(m.shadow),
              transform: `translate3d(${m.x.toFixed(3)}px, ${m.y.toFixed(3)}px, 0)`,
            }}
          >
            {t.image && <CardPicture image={t.image} frame={frame} />}
            {t.content === undefined && !t.image && !t.blank && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: t.B.w, height: t.B.h, transform: t.contentAnchor === 'box' ? undefined : `translate(${(t.B.x - m.x).toFixed(3)}px, ${(t.B.y - m.y).toFixed(3)}px)` }}>
                <KitFallback frame={frame} w={t.B.w} h={t.B.h} seed={i} theme={fallbackTheme(m.fill)} />
              </div>
            )}
            {t.content !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: t.B.w,
                  height: t.B.h,
                  transform: t.contentAnchor === 'box' ? undefined : `translate(${(t.B.x - m.x).toFixed(3)}px, ${(t.B.y - m.y).toFixed(3)}px)`,
                }}
              >
                {t.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** A default card surface in the house look: the light stage's raised surface, radius 12 % of the width, the paper dip shadow. */
export const cardBox = (x: number, y: number, w: number, h: number, u = 1): MorphBox => ({
  x,
  y,
  w,
  h,
  r: Math.min(w, h) * 0.12,
  fill: C.white,
  shadow: { y: 12 * u, blur: 40 * u, a: 0.08 },
});

/** What a Cards instance does on purpose: nothing it draws is a step, a flash, camera blur or a seam. */
export const declares = (_props?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
