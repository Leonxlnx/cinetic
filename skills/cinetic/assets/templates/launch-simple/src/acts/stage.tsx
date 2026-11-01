// The one stage every act draws: the dealt world under everything (src/world.tsx, never cut), the line in the dealt voice
// (acts/line.tsx), the product's scene (under its line: rising in, soft, then racking into focus), the seams between
// them (fx/Seam seamState and the recede, drawn by acts/layer.tsx), the film's carried object flying between two
// pictures, the hero shots (src/hero: a picture beat, a line held over its own picture, a line, the end card) and the
// centred lockup built from the last picture. An act is a window on this one stage (acts are Sequences: each draws the
// absolute frame), so a seam that crosses an act line is the same picture on both sides. Every element (a line, a
// scene, the end card) keeps one layer for its whole life, so nothing is re-drawn in a new place for a frame. The
// product's scenes live in src/product.tsx, the words in src/launch.ts; this file rarely needs an edit.
//
// The film's colour event (every family without one of its own): the claim sits on a colour field in the accent. The
// scene before it names a `field` (the element the field grows out of: a chip, a check); the seam into the claim
// pushes into that element until it is the frame, the claim resolves on the field, and the field leaves with it on
// the next seam. One run under 2 s (look-audit's one designed flood); timeline.ts COLOUR may declare it.
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import * as BRAND_LOGO from '../brand/logo';
import { LOGO } from '../brand/logo';
import type { FamilyInks } from '../fx/Grounds';
import { bakePlate } from '../fx/Gradients';
import { type SeamOpts, seamSpan, seamState } from '../fx/Seam';
import { SpinBlur } from '../fx/Defocus';
import { spinInState } from '../fx/Wordmark';
import { clamp, E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { fitSize, measureTracked } from '../lib/measure';
import { timingFail } from '../lib/continuity';
import { CreativeLine, CreativePicture } from '../fx/creative';
import { LAUNCH } from '../launch';
import { DEAL, SEED } from '../deal';
import * as PRODUCT from '../product';
import { SCENES } from '../product';
import { ACT, BEAT_PLAN, COLOUR, copy, CREATIVE_COLOUR, CREATIVE_MISSING, CREATIVE_UNPLACED, CUE, END_FADE, f60x, FPS, H, HERO_END, HERO_LINE, HERO_OVER, HERO_PIC, keyWords, LINE_DEV, LINE_EXIT, PAIRS, PIC_DEV, PUSH, SEAM_PLAN, seamExtra, TOTAL, W } from '../timeline';
import { HeroLine, HeroOver, HeroPicture } from '../hero/shots';
import { FilmWorld, inksOfWorld, PLATE_WORLD, WORLD_SPEC } from '../world';
import { Layer, PromoteCtx } from './layer';
import { FAM, isClaim, Line, lineLayout, LINE_TYPE, PAIR, Text, trackFor, weightOf } from './line';
import { safeTrack, wordmarkStyle } from '../fx/TypePairs';
import { CARD, inkOn, litFace, SceneCtx } from './ui';
import type { SeamLayer } from '../fx/Seam';

/** The dealt world (deal.ts `ground`, src/world.tsx draws it). */
export const FAMILY = DEAL.ground;
/** The world's inks (one world, never cut: the same at every frame). */
export const inksAt = (_F: number): FamilyInks => inksOfWorld();
/** The background colour under the acts (the world's base). */
export const GROUND_AT = (F: number) => inksAt(F).ground;

// No camera float: the camera moves only with a purpose (a move that starts, travels and lands); a hold may be still.

// The script a dealt creative element needs and its pair does not give (timeline.ts CREATIVE_MISSING): precheck reports
// it, the ship gate fails it; write it on the pair, or swap the device in launch.ts creative.swap with the reason.
for (const m of CREATIVE_MISSING) timingFail('creative', `creative: ${m}`);
for (const id of CREATIVE_UNPLACED) timingFail('creative', `creative: ${id} was dealt but found no beat (a picture device that ends on itself never plays the last picture; a line device never the claim): add a pair, a picture-only one works, or swap it in launch.ts creative.swap with the reason`);

/** The absolute film frame inside an act. */
export const useAbs = (act: string) => useCurrentFrame() + ACT[act].from;

// ------------------------------------------------------------------------------------------------ the scenes

/** The band a line over its picture holds (pair `beat: 'over'`): the box the scene keeps clear, film px. */
export type Band = { x: number; y: number; w: number; h: number };
/**
 * What a scene draws from: `f` frames since its picture began (with and over: under its line), `dur` its length, `hits`
 * the frames of its own moments, `cut` the frame of the push closer (or the scene's own change, cut 'scene'), `band`
 * the line's box when the line holds over the picture (keep it clear), `carry` the frames the stage holds the film's
 * carried element (product.tsx IDEA): until `in` it is still flying into this scene, from `out` it is flying on to the
 * next, so the scene draws its own copy only between them (`carried(f, carry)`); `beats` the frames between its own
 * moments where it may take a step of its own (a row checking, a count ticking: the picture changes, the camera never
 * wanders). Under a creative picture (timeline.ts PIC_DEV) the scene is drawn inside the device, at any frame it asks
 * for (a wall of it at other moments, the scene held on its first frame behind the letters).
 */
export type SceneProps = { f: number; dur: number; hits: number[]; beats?: number[]; inks: FamilyInks; pair: number; cut?: number; band?: Band; carry?: { in?: number; out?: number } };
/** How much of the scene's own copy of the carried element shows at scene frame f: it hands over to the stage's flying
 * copy over CARRY.fade f@60 as it leaves (from `out`) and takes it back over CARRY.fade as it lands (to `in`): a
 * cross-fade, never a swap in one frame. Use it as the copy's opacity. */
export const carryOpacity = (f: number, carry?: SceneProps['carry']) => {
  const k = FPS / 60;
  const a = carry?.in === undefined ? 1 : clamp((f - (carry.in - CARRY.fade * k)) / (CARRY.fade * k));
  const b = carry?.out === undefined ? 1 : 1 - clamp((f - carry.out) / (CARRY.fade * k));
  return Math.min(a, b);
};
/** Whether the scene draws its own copy of the carried element at scene frame f at all. */
export const carried = (f: number, carry?: SceneProps['carry']) => carryOpacity(f, carry) > 0;
/**
 * A scene: its drawing; `hero`, the box of the element the end card is built from (the last scene) and its `fill`
 * ('accent', a colour, or the card surface by default); `focus`, what the push closer frames: a box (x, y, w, h in
 * scene px; the push keeps it inside the safe area) or a point (a short push about it); put the picture's own moment
 * there; `cut`, what happens on the beat's cut CUE: 'closer' (default) the camera pushes closer, 'scene' the scene
 * changes itself (the input footage to the lit device: SceneProps `cut` is its frame) and the camera keeps its scale;
 * (a function when it is measured: it is read at draw time); `field`, on the scene before the claim, the box (scene px) of the element the claim's colour field grows out of, and
 * its colour; `carry`, where the film's carried element (product.tsx IDEA) sits as the scene begins (`in`) and as it
 * ends (`out`), scene px: between two pictures that both name it, it flies from one to the other over the seam.
 */
type CutMode = 'closer' | 'scene';
export type FieldBox = { x: number; y: number; w: number; h: number; radius: number; color?: string };
export type CarryBox = { x: number; y: number; w: number; h: number; radius: number; fill?: string };
export type Focus = { x: number; y: number; w?: number; h?: number };
/** A scene's focus, read at draw time (a box measured with the film's face is browser-only). */
const focusOf = (def?: SceneDef): Focus | undefined => (typeof def?.focus === 'function' ? def.focus() : def?.focus);
/** A scene's focus as a box (a point stands for a box 40 % x 50 % of the frame round it), for a creative element. */
const focusBox = (def?: SceneDef) => {
  const f = focusOf(def);
  return !f ? undefined : f.w && f.h ? { x: f.x, y: f.y, w: f.w, h: f.h } : { x: f.x - W * 0.2, y: f.y - H * 0.25, w: W * 0.4, h: H * 0.5 };
};
export type SceneDef = {
  draw: React.FC<SceneProps>;
  hero?: { x: number; y: number; w: number; h: number; radius: number; fill?: string };
  focus?: Focus | (() => Focus);
  cut?: CutMode | (() => CutMode);
  field?: () => FieldBox;
  carry?: { in?: () => CarryBox; out?: () => CarryBox };
  /** the product's button (scene px): the creative elements that press it (dot-button, cursor-follow) aim at it */
  button?: () => { x: number; y: number; w: number; h: number };
  /** false: the scene stands without the contact shadow under its focus box (a scene that draws its own floor) */
  floor?: boolean;
};
const cutMode = (def?: SceneDef): CutMode => (typeof def?.cut === 'function' ? def.cut() : def?.cut ?? 'closer');
const defOf = (pair: number) => SCENES[LAUNCH.pairs[pair - 1]?.scene] as SceneDef | undefined;

/**
 * The subject fills the frame: a product picture is framed on its focus box from its first frame (a framing, not a
 * move: it never animates), scaled up about the box so the box stands FRAME.fill of the frame's height (or FRAME.width
 * of its width, whichever comes first) and centred; a box already that big keeps its place and size. Never a small card
 * in an empty field (look-audit small-subject fails one): when the box is wide and short (a row of chips), the scene
 * itself has to change (a macro crop of the moment that matters, the row stacked, the parts at film size).
 */
export const FRAME = { fill: 0.62, width: 0.84, max: 2.4 } as const;
export const frameOf = (def?: SceneDef) => {
  const f = focusOf(def);
  if (!f || !f.w || !f.h) return { s: 1, cx: W / 2, cy: H / 2, tx: 0, ty: 0 };
  const s = Math.min(FRAME.max, Math.max(1, Math.min((FRAME.fill * H) / f.h, (FRAME.width * W) / f.w)));
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  return s > 1.001 ? { s, cx, cy, tx: W / 2 - cx, ty: H / 2 - cy } : { s: 1, cx, cy, tx: 0, ty: 0 };
};
/** A scene box on screen under the scene's framing alone (no push, no land). */
const framed = (def: SceneDef | undefined, b: { x: number; y: number; w: number; h: number }) => {
  const k = frameOf(def);
  return { x: k.cx + (b.x - k.cx) * k.s + k.tx, y: k.cy + (b.y - k.cy) * k.s + k.ty, w: b.w * k.s, h: b.h * k.s };
};
/** The scene drawn under its framing (the creative elements take the framed scene and the framed focus box). */
const Framed: React.FC<{ def?: SceneDef; children: React.ReactNode }> = ({ def, children }) => {
  const k = frameOf(def);
  if (k.s === 1) return <>{children}</>;
  return <div style={{ position: 'absolute', inset: 0, transformOrigin: `${k.cx.toFixed(1)}px ${k.cy.toFixed(1)}px`, transform: `translate3d(${k.tx.toFixed(3)}px, ${k.ty.toFixed(3)}px, 0) scale(${k.s.toFixed(5)})` }}>{children}</div>;
};
/**
 * The place the product stands in: a soft contact shadow on the ground under its focus box (the one key light is above:
 * the shadow falls straight down, a little wider than the object's foot, darkest at its centre), so a card or a device
 * is an object in a lit room, never a sticker on a tint. Drawn under the scene, inside its camera.
 */
export const FLOOR = { width: 0.92, height: 0.075, drop: 0.012, dark: 0.42, light: 0.2 } as const;
const Floor: React.FC<{ def?: SceneDef; inks: FamilyInks }> = ({ def, inks }) => {
  const f = focusOf(def);
  if (def?.floor === false || !f || !f.w || !f.h) return null;
  const w = f.w * FLOOR.width;
  const h = Math.max(FLOOR.height * f.h, 26 * U);
  const cx = f.x + f.w / 2;
  const y = f.y + f.h - h * 0.5 + FLOOR.drop * f.h;
  const a = inks.dark ? FLOOR.dark : FLOOR.light;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${(cx - w / 2).toFixed(2)}px, ${y.toFixed(2)}px, 0)`, background: `radial-gradient(closest-side, rgba(0, 0, 0, ${a}) 0%, rgba(0, 0, 0, ${(a * 0.45).toFixed(3)}) 45%, rgba(0, 0, 0, 0) 100%)` }} />;
};

/**
 * The push closer (timeline.ts PUSH, CUE a<pair>cut): the camera moves in on a strong in-out, never in one frame. With
 * a focus box it frames the box with PUSH.margin of the frame on every side (inside the safe area), re-centring on it;
 * a box that already fills the frame takes no push. With a focus point (or none: the hero's centre, else the frame's)
 * it pushes PUSH.min about the point.
 */
const pushOf = (def?: SceneDef) => {
  const f0 = focusOf(def);
  // the push frames the box as the scene's framing already shows it (FRAME)
  const f = f0 && f0.w && f0.h ? { ...framed(def, { x: f0.x, y: f0.y, w: f0.w, h: f0.h }) } : f0;
  if (f && f.w && f.h) {
    const fit = Math.min(((1 - 2 * PUSH.margin) * W) / f.w, ((1 - 2 * PUSH.margin) * H) / f.h);
    const s = Math.min(PUSH.max, fit);
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    if (s < PUSH.min) return { s: 1, ox: cx, oy: cy, tx: 0, ty: 0 };
    return { s, ox: cx, oy: cy, tx: W / 2 - cx, ty: H / 2 - cy };
  }
  const ox = f?.x ?? (def?.hero ? def.hero.x + def.hero.w / 2 : W / 2);
  const oy = f?.y ?? (def?.hero ? def.hero.y + def.hero.h / 2 : H / 2);
  return { s: PUSH.min, ox, oy, tx: 0, ty: 0 };
};

/** The picture beat's camera at frame F, moving only with a purpose: the push closer on a long picture (CUE a<pair>cut,
 * a move that starts, travels and lands), and with the dealt camera `land` one slow push over the first 60 % of a
 * product picture (x1.035, strongInOut) that lands and holds; `still` holds. A creative picture brings its own move: the
 * stage camera stays at rest under it. Never a drift, never a re-frame back and forth. `phase`: before, during and
 * after the push (the scene's text is re-drawn sharp once it lands). */
export const LAND = { scale: 1.035, share: 0.6 } as const;
const camOf = (pair: number, F: number) => {
  const def = defOf(pair);
  const pr = PAIRS[pair - 1];
  const from = pr.pic;
  const dur = pr.to - from;
  const u = (F - from) / Math.max(1, dur);
  const cut = CUE[`a${pair}cut`];
  const P = pushOf(def);
  const device = !!PIC_DEV[pair - 1];
  const pushing = !device && cut !== undefined && cutMode(def) === 'closer' && P.s > 1;
  const e = pushing ? E.strongInOut(clamp((F - (cut - 1)) / f60x(PUSH.dur))) : 0;
  // the dealt camera land: one slow push that lands (never under a creative picture, never on top of a push closer)
  const land = DEAL.camera === 'land' && !device && !pushing ? E.strongInOut(clamp(u / LAND.share)) : 0;
  // the framing (FRAME: the box scaled up about its centre and centred, still), then the push and the land about the
  // framed box: one transform, scene px to screen px = o + (b - o) * scale + d
  const k = frameOf(def);
  const pk = P.s > 1 || k.s > 1 ? 1 : 0;
  const ps = 1 + (P.s - 1) * e;
  const ls = 1 + (LAND.scale - 1) * land;
  const ox = k.s > 1 ? k.cx : P.ox;
  const oy = k.s > 1 ? k.cy : P.oy;
  const dx = k.tx + P.tx * e * pk;
  const dy = k.ty + P.ty * e * pk;
  const scale = k.s * ps * ls;
  const phase: 'wide' | 'push' | 'closer' = e <= 0 ? 'wide' : e >= 1 ? 'closer' : 'push';
  return { from, dur, dx, dy, scale, ox, oy, phase, cut: cut === undefined ? undefined : cut - from };
};

/**
 * Depth for a line over its picture (pair `beat: 'with'`): the line holds the middle band and the picture stands far
 * behind it, centred where it will play, never below the line and never cut by the frame (a picture low under a line is
 * the text-top/picture-below layout, rare by the standard): smaller (`scale` about the frame's centre), soft (`blur` px
 * at 1080p) and dim (`opacity`: on a dark ground a light card stays darker behind white words, so the line keeps its
 * contrast), rising `creep` of the height into its place through the line's read. `after` f@60 into the line's exit it
 * comes forward into its place as it racks into focus (`rack` f@60, one carried move: the line lifts away, the picture
 * comes up to the camera after it), and plays on alone.
 */
export const TA_DEPTH = { opacity: { light: 0.42, dark: 0.22 }, blur: 16, scale: 0.84, creep: 0.03, after: 11, rack: 30 } as const;
/** On a dark world the picture behind its line is darkened to this brightness instead of made translucent (a light card
 * at a fifth of its opacity is a grey ghost with the world showing through it; darkened it is the same card in shadow). */
export const DARK_DIM = 0.26;
const depthOf = (pair: number, F: number) => {
  if (PAIRS[pair - 1]?.mode !== 'with') return 0;
  const out = copy(`line${pair}`).out;
  return 1 - E.glideOut(clamp((F - out - f60x(TA_DEPTH.after)) / f60x(TA_DEPTH.rack)));
};
/** How far a picture behind its line stands below its place (px at 1080p): a creep up through the read, never a drop. */
const dropOf = (pair: number, F: number) => {
  const pr = PAIRS[pair - 1];
  const read = clamp((F - pr.from) / Math.max(1, copy(`line${pair}`).out - pr.from));
  return (TA_DEPTH.creep * H * (1 - read)) / (H / 1080);
};
/** A layer state with the picture's depth folded in (d 0 at rest, 1 behind its line). */
const withDepth = (st: SeamLayer | undefined, d: number, pair = 0, F = 0): SeamLayer | undefined => {
  if (d <= 0) return st;
  const base = st ?? { show: true, x: 0, y: 0, scale: 1, opacity: 1, blur: 0, smear: 0, ink: 1 };
  const dark = inksAt(F).dark;
  return {
    ...base,
    y: base.y + (pair ? dropOf(pair, F) * d : 0),
    opacity: base.opacity * (dark ? 1 : mix(1, TA_DEPTH.opacity.light, d)),
    dim: (base.dim ?? 1) * (dark ? mix(1, DARK_DIM, d) : 1),
    blur: base.blur + TA_DEPTH.blur * d,
    scale: base.scale * mix(1, TA_DEPTH.scale, d),
  };
};
/** A line over its picture leaving on its own (with, over): it lifts 30 px and softens away over LINE_EXIT f@60, ahead of the picture rising after it. */
const lineExitOf = (pair: number, F: number): SeamLayer | undefined => {
  if (PAIRS[pair - 1]?.mode === 'alone') return undefined;
  const u = clamp((F - copy(`line${pair}`).out) / f60x(LINE_EXIT));
  if (u <= 0) return undefined;
  const e = E.buildIn(u);
  return { show: u < 1, x: 0, y: -30 * e, scale: 1, opacity: 1 - E.stdInOut(u), blur: 11 * e, smear: 0, ink: 1 };
};

/** The band a line over its picture holds: centred, as wide as its longest row measured with the film's face and as
 * tall as its rows, padded a quarter of its size all round (what a scene sets beside the line starts right there). */
const bandOf = (pair: number): Band => {
  const text = copy(`line${pair}`).text;
  const claim = isClaim(`line${pair}`);
  const { size, rows } = lineLayout(text, claim, true);
  const words = text.split(/\s+/).filter(Boolean);
  let i = 0;
  const widest = Math.max(...rows.map((n) => {
    const row = words.slice(i, (i += n)).join(' ');
    return measureTracked(row, size, weightOf(claim), trackFor(size), FONT.text, { trailing: false });
  }));
  const h = rows.length * size * 1.06 + size * 0.5;
  const w = Math.min(W * 0.9, widest + size * 0.5);
  return { x: (W - w) / 2, y: H / 2 - h / 2, w, h };
};

/** A picture beat: the product's scene, full frame, on the dealt camera. The push closer draws its text unpromoted (the
 * browser re-draws it at every step of the scale); landed, the scene is drawn afresh at its closer size, sharp. */
const Scene: React.FC<{ pair: number; F: number }> = ({ pair, F }) => {
  const def = defOf(pair);
  if (!def) return null;
  const c = camOf(pair, F);
  const hits = Object.keys(CUE).filter((n) => n.startsWith(`a${pair}h`)).map((n) => CUE[n] - c.from);
  const Draw = def.draw;
  const band = PAIRS[pair - 1].mode === 'over' ? bandOf(pair) : undefined;
  const carry = carryFrames(pair);
  const beats = Object.keys(CUE).filter((n) => n.startsWith(`a${pair}m`)).map((n) => CUE[n] - c.from);
  const hero = HERO_PIC[pair - 1];
  if (hero) {
    // the hero shot takes the beat with its own camera; the product's scene, framed, is there for the shots that use it
    const sceneAt = (f: number) => (
      <Framed def={def}>
        <Draw f={f} dur={c.dur} hits={hits} beats={beats} inks={inksAt(F)} pair={pair} cut={c.cut} band={band} carry={carry} />
      </Framed>
    );
    const fb = focusBox(def);
    const btn = def.button?.();
    // with its line, the shot's first motion plays behind the line (standing back, soft and dark), then it comes up
    return <HeroPicture id={hero.id} f={F - c.from} dur={c.dur} F={F} inks={inksAt(F)} pair={pair} seed={SEED + pair} scene={sceneAt} button={btn ? framed(def, btn) : undefined} focus={fb ? framed(def, fb) : undefined} />;
  }
  const dev = PIC_DEV[pair - 1];
  if (dev) {
    const p = LAUNCH.pairs[pair - 1];
    const pr = PAIRS[pair - 1];
    // the device takes the scene as it is framed (the subject at film size) and the product's real button
    const sceneAt = (f: number) => (
      <Framed def={def}>
        <Draw f={f} dur={c.dur} hits={hits} beats={beats} inks={inksAt(F)} pair={pair} cut={c.cut} band={band} carry={carry} />
      </Framed>
    );
    const fb = focusBox(def);
    const btn = def.button?.();
    return (
      <SceneCtx.Provider value={{ f: F - c.from, dur: c.dur, cam: { dx: 0, dy: 0 } }}>
        <CreativePicture id={dev.id} f={F - c.from} dur={c.dur} start={pr.mode === 'with' ? pr.ta - c.from : 0} hits={hits} pal={inksAt(F)} seed={SEED + pair} scene={sceneAt} focus={fb ? framed(def, fb) : undefined} radius={CARD.radius} uid={`p${pair}`} data={{ logos: p.logos, before: p.before, count: p.count, photos: p.photos, word: p.word, label: p.label ?? p.ui?.[0], button: btn ? framed(def, btn) : undefined }} />
      </SceneCtx.Provider>
    );
  }
  return (
    <div key={c.phase} style={{ position: 'absolute', inset: 0, transformOrigin: `${c.ox.toFixed(1)}px ${c.oy.toFixed(1)}px`, transform: `translate3d(${c.dx.toFixed(3)}px, ${c.dy.toFixed(3)}px, 0) scale(${c.scale.toFixed(5)})` }}>
      <PromoteCtx.Provider value={c.phase !== 'push'}>
        <SceneCtx.Provider value={{ f: F - c.from, dur: c.dur, cam: { dx: c.dx, dy: c.dy } }}>
          <Floor def={def} inks={inksAt(F)} />
          <Draw f={F - c.from} dur={c.dur} hits={hits} beats={beats} inks={inksAt(F)} pair={pair} cut={c.cut} band={band} carry={carry} />
        </SceneCtx.Provider>
      </PromoteCtx.Provider>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ a line device

/**
 * A line drawn by its creative element (timeline.ts LINE_DEV): the device takes the line's words, its size in the film's
 * face (the statement size, never under the floor), when it is in, whole and leaving (its COPY), and the pair's own
 * scene, which a device that hands over (type-window, type-object, split-around) carries in: its last frame is the
 * picture's first, so the seam into the picture draws nothing.
 */
const DeviceLine: React.FC<{ pair: number; F: number; inks: FamilyInks }> = ({ pair, F, inks }) => {
  const dev = LINE_DEV[pair - 1];
  const def = defOf(pair);
  if (!dev) return null;
  const c = copy(`line${pair}`);
  const p = LAUNCH.pairs[pair - 1];
  const words = keyWords(p.line ?? '');
  const text = words.map((w) => w.word).join(' ');
  // a device sets its line on one row: the statement size, made smaller to fit 84 % of the width (lib/measure fitSize),
  // never under the floor
  const wt = weightOf(false);
  const role = lineLayout(text, false, false).size;
  const size = Math.max((LINE_TYPE.floor * H) / LINE_TYPE.cap, fitSize(text, W * 0.84, role, wt, trackFor(role)));
  const pr = PAIRS[pair - 1];
  const cut = CUE[`ta${pair}`] - c.in;
  const hits = Object.keys(CUE).filter((n) => n.startsWith(`a${pair}h`)).map((n) => CUE[n] - pr.pic);
  const Draw = def?.draw;
  const sceneAt = Draw ? (f: number) => <Framed def={def}><Draw f={f} dur={pr.to - pr.pic} hits={hits} inks={inks} pair={pair} /></Framed> : undefined;
  const fb = focusBox(def);
  return (
    <CreativeLine cid={dev.id} cut={cut} swap={p.alts} f={F - c.in} dur={cut} words={words} id={`line${pair}`} size={size} weight={wt} track={trackFor(size)} font={FONT.text} pal={inks} resolved={c.resolved - c.in} out={c.out - c.in} seed={SEED + pair} scene={sceneAt} focus={fb ? framed(def, fb) : undefined} radius={CARD.radius} uid={`l${pair}`} />
  );
};

// ------------------------------------------------------------------------------------------------ the carried element

/**
 * The film's carried element (product.tsx IDEA, the visual idea drawn as one object): between two pictures that both
 * name it (SceneDef `carry`: `out` on the first, `in` on the second), it leaves its place in the outgoing picture
 * `lead` f@60 before the seam and lands in its place in the incoming one `land` f@60 after it, on a strong in-out (its
 * size on a log scale, a soft arc on the way, its corner and colour mixed), drawn by IDEA (`p` 0 as it leaves, 1 as it
 * lands: the object transforming) or, without one, as a lit tile, cross-fading with the scenes' own copies over `fade`
 * f@60 at either end (carryOpacity). It never cuts: one object carried across the change.
 */
export const CARRY = { lead: 14, land: 22, arc: 0.06, fade: 6 } as const;
type IdeaFC = React.FC<{ w: number; h: number; p: number; inks: FamilyInks; F: number; from: number; to: number }>;
const IDEA = (PRODUCT as { IDEA?: IdeaFC }).IDEA ?? null;
/** The picture-to-picture seam out of pair k (into pair k + 1), when both scenes carry the element. */
const carrySeam = (pair: number) => {
  const s = SEAM_PLAN.find((x) => x.cls === 'AA' && x.id === `pic${pair}-pic${pair + 1}`);
  return s && defOf(pair)?.carry?.out && defOf(pair + 1)?.carry?.in ? s : undefined;
};
/** The scene frames the stage holds the element for pair k (SceneProps `carry`). */
const carryFrames = (pair: number): SceneProps['carry'] => {
  const out = carrySeam(pair);
  const inn = carrySeam(pair - 1);
  const from = PAIRS[pair - 1].pic;
  if (!out && !inn) return undefined;
  return { ...(inn ? { in: inn.at + Math.round(f60x(CARRY.land)) - from } : {}), ...(out ? { out: out.at - Math.round(f60x(CARRY.lead)) - from } : {}) };
};
/**
 * A match cut between two pictures holds a point across a one-frame cut; between two unrelated pictures with nothing
 * carried over it, that is a hard swap of one scene for another. So a picture-to-picture match cut needs the film's
 * carried element on both sides (SceneDef `carry`: `out` on the first scene, `in` on the second), which flies over the
 * cut: precheck reports it (a warning in dev, an error under the ship gate), with the two ways out.
 */
for (const s of SEAM_PLAN) {
  if (s.cls !== 'AA' || s.recipe !== 'matchCut') continue;
  const k = Number(s.id.match(/^pic(\d+)-/)?.[1] ?? 0);
  if (k && !carrySeam(k))
    timingFail('carry', `carry: the match cut ${s.id} at f${s.at} swaps scene "${LAUNCH.pairs[k - 1]?.scene}" for "${LAUNCH.pairs[k]?.scene}" in one frame with nothing carried over it: give both scenes the film's element (SceneDef carry: out on the first, in on the second; product.tsx IDEA draws it in flight), or pin seamAA velocityCut or blurThrough in launch.ts`);
}
/** A scene box on screen under its picture's camera at frame F. */
const onScreen = (pair: number, F: number, b: CarryBox) => {
  const c = camOf(pair, F);
  return { x: c.ox + (b.x - c.ox) * c.scale + c.dx, y: c.oy + (b.y - c.oy) * c.scale + c.dy, w: b.w * c.scale, h: b.h * c.scale, radius: b.radius * c.scale };
};
const Carried: React.FC<{ F: number }> = ({ F }) => {
  const s = SEAM_PLAN.find((x) => x.cls === 'AA' && F >= x.at - f60x(CARRY.lead) && F < x.at + f60x(CARRY.land));
  if (!s) return null;
  const k = Number(s.id.match(/^pic(\d+)-/)?.[1] ?? 0);
  if (!carrySeam(k)) return null;
  const t0 = s.at - Math.round(f60x(CARRY.lead));
  const t1 = s.at + Math.round(f60x(CARRY.land));
  const p = E.strongInOut(clamp((F - t0) / Math.max(1, t1 - t0)));
  const ob = defOf(k)?.carry?.out?.() as CarryBox;
  const ib = defOf(k + 1)?.carry?.in?.() as CarryBox;
  const a = onScreen(k, t0, ob);
  const b = onScreen(k + 1, t1, ib);
  const lm = (x: number, y: number) => Math.exp(mix(Math.log(Math.max(1, x)), Math.log(Math.max(1, y)), p));
  const w = lm(a.w, b.w);
  const h = lm(a.h, b.h);
  const x = mix(a.x + a.w / 2, b.x + b.w / 2, p) - w / 2;
  // a soft arc: the element rises a little on its way (a thrown object, never a straight slide)
  const y = mix(a.y + a.h / 2, b.y + b.h / 2, p) - h / 2 - Math.sin(Math.PI * p) * CARRY.arc * H;
  const inks = inksAt(F);
  const fill = (v?: string) => (!v ? inks.surface : v === 'accent' ? C.accent : v);
  // it lands in the next picture's depth (a picture under its line stands back: the element goes with it), cross-fading
  // with the scenes' own copies at either end
  const fade = Math.min(clamp((F - t0) / f60x(CARRY.fade)), clamp((t1 - F) / f60x(CARRY.fade)));
  const d0 = withDepth(undefined, depthOf(k + 1, F) * p, k + 1, F);
  const depth = d0 ? { ...d0, opacity: d0.opacity * fade } : { show: true, x: 0, y: 0, scale: 1, opacity: fade, blur: 0, smear: 0, ink: 1 };
  return (
    <div key="carried" style={{ position: 'absolute', inset: 0, zIndex: 998 }}>
      <Layer s={depth} origin={`${W / 2}px ${H / 2}px`} z={998}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)` }}>
          {IDEA ? (
            <IDEA w={w} h={h} p={p} inks={inks} F={F} from={k} to={k + 1} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, borderRadius: mix(a.radius, b.radius, p), ...litFace(mixColor(fill(ob.fill), fill(ib.fill), p), inks, { accent: true }) }} />
          )}
        </div>
      </Layer>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the end card

/**
 * The lockup's sizes (px at 1080p): the name's size, the mark's height (the stand-ins' box), the fact's size below. A
 * drawn mark is laid out by its ink, never by its 100-unit box: its ink stands `markInk` x the name's cap height and
 * sits `gapCap` x the cap height from the name (a flag whose ink fills two thirds of its box laid out by the box ends
 * small beside the name with a gap as wide as itself). `cap`: the face's cap height as a share of its size.
 */
export const LOCK = { name: 150, mark: 132, gap: 0.36, fact: 50, below: 128, markInk: 1.3, gapCap: 0.44, cap: 0.72 } as const;
/** The name as a wordmark, not a line: without a pairing, heavier and tighter than the statements (one face, a second
 * weight); with the film's pairing (line.tsx PAIR), its wordmark weight and tracking (fx/TypePairs wordmarkStyle). */
export const WORDMARK_TYPE = { weight: 700, track: -0.045 } as const;
/** The wordmark's weight and tracking at `size` px: the pairing's wordmark, loosened just enough that no two letters
 * touch (safeTrack: the "Morrow3.2" fault), never tighter than the pairing sets it. */
const wordmarkOf = (name: string, size: number) => {
  if (!PAIR) return { weight: WORDMARK_TYPE.weight, track: safeTrack(name, `${WORDMARK_TYPE.weight} ${FONT.text}`, size, WORDMARK_TYPE.track) };
  const st = wordmarkStyle(PAIR, size, FAM);
  const track = parseFloat(String(st.letterSpacing));
  return { weight: Number(st.fontWeight), track: safeTrack(name, `${st.fontWeight} ${FONT.text}`, size, track) };
};
const lockLayout = () => {
  const name = copy('wordmark').text;
  const size = LOCK.name * U;
  const wm = wordmarkOf(name, size);
  const wName = measureTracked(name, size, wm.weight, wm.track, FONT.text, { trailing: false });
  const cy = H / 2 - 30 * U;
  // the drawn mark's ink in its 100-unit box (the stand-ins fill theirs)
  const ink = !LOGO_STANDIN && !LOGO_RASTER && LOGO.box && LOGO.box.h > 1 ? LOGO.box : { x: 0, y: 0, w: 100, h: 100 };
  const capH = size * LOCK.cap;
  const markH = ink.h < 100 ? (capH * LOCK.markInk) / (ink.h / 100) : LOCK.mark * U;
  const inkW = (markH * ink.w) / 100;
  const gapInk = ink.h < 100 ? capH * LOCK.gapCap : markH * LOCK.gap;
  const inkLeft = (W - (inkW + gapInk + wName)) / 2;
  const left = inkLeft - (markH * ink.x) / 100;
  // the ink centred on the name's caps (a touch above the em box's middle)
  const inkCy = ink.h < 100 ? cy - size * 0.06 : cy;
  const top = inkCy - (markH * (ink.y + ink.h / 2)) / 100;
  // gap: from the box's right edge to the name; alone: how far the lockup moves for the mark alone to stand centred
  const gap = inkLeft + inkW + gapInk - (left + markH);
  return { name, size, markH, gap, wName, left, cy, wm, alone: (gapInk + wName) / 2, mark: { x: left, y: top, w: markH, h: markH } };
};

/** The last picture's hero element (product.tsx `hero`), the box the end card is built from. */
const heroBox = () => {
  const last = LAUNCH.pairs[LAUNCH.pairs.length - 1];
  const def = SCENES[last.scene] as SceneDef | undefined;
  return def?.hero ?? { x: W * 0.3, y: H * 0.3, w: W * 0.4, h: H * 0.4, radius: 28 * U };
};
const heroFill = (inks: FamilyInks) => {
  const f = heroBox().fill;
  return !f ? inks.surface : f === 'accent' ? inks.accent : f;
};

/** The brand's own mark once scripts/brand.py has written it (src/brand/logo.ts); until then the template's stand-in. */
const LOGO_STANDIN = (BRAND_LOGO as { LOGO_STANDIN?: boolean }).LOGO_STANDIN === true;
const LOGO_RASTER = (BRAND_LOGO as { LOGO_RASTER?: string | null }).LOGO_RASTER ?? null;
/**
 * The product's own stand-in mark (product.tsx HERO_MARK): the last picture's element as a mark (the scaffold's: the
 * result's progress ring, closed into a disc with a check cut through it). The element flies into the lockup as itself
 * and the lockup keeps it while brand/logo.ts keeps LOGO_STANDIN. Without one, the letter mark below.
 */
type HeroMarkFC = React.FC<{ size: number; color: string; ring?: number; fill?: number; check?: number; id: string }>;
const HERO_MARK = (PRODUCT as { HERO_MARK?: HeroMarkFC }).HERO_MARK ?? null;
/**
 * The brand's mark on the ground keeps its own colours (an official mark is never recoloured, and the 3D mark it lands
 * from is drawn in them: a blue flag turning white as it lands is a second, unmotivated event); only its near-black
 * parts take the world's type ink on a dark world.
 */
const markFill = (inks: FamilyInks) => (part: { items: { fill?: string }[] }) => {
  if (!inks.dark) return undefined;
  const f = part.items.find((it) => it.fill && it.fill !== 'none')?.fill ?? '';
  const m = /^#([0-9a-f]{6})$/i.exec(f.trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 60 ? inks.type : undefined;
};
/** The hero mark's colour on the ground: the accent, lifted on a dark ground (it leaves the light card at full depth). */
const markColor = (inks: FamilyInks, t = 1) => mixColor(C.accent, inks.dark ? mixColor(inks.accent, C.white, 0.08) : C.accent, t);

/**
 * The letter stand-in (no hero mark in product.tsx): the name's first letter in the film's face on a lit tile in the
 * hero element's colour, a glass sheen sliding with the hold's drift. Neutral and honest until the brand's SVG replaces
 * it (logo.ts keeps its placeholder marker, so lint fails until then); never a sparkle, star or AI glyph.
 */
const LetterMark: React.FC<{ size: number; inks: FamilyInks; sheen?: number; letter?: number; radius?: string }> = ({ size, inks, sheen = 0, letter = 1, radius }) => {
  const fill = heroFill(inks);
  const at = 34 + (sheen / size) * 100;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: radius ?? size * 0.24, ...litFace(fill, inks, { accent: true }), overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size * 0.98, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.text, fontSize: size * 0.6, fontWeight: WORDMARK_TYPE.weight, letterSpacing: '-0.02em', lineHeight: 1, color: inkOn(fill, inks), opacity: letter }}>
        {(copy('wordmark').text.trim()[0] ?? '').toUpperCase()}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(120deg, rgba(255, 255, 255, 0) ${(at - 16).toFixed(2)}%, rgba(255, 255, 255, 0.1) ${at.toFixed(2)}%, rgba(255, 255, 255, 0) ${(at + 18).toFixed(2)}%)` }} />
    </div>
  );
};

/** The end card's life on its hold: a sideways drift of END_DRIFT px a film frame at 1080p (0.5: 0.25 px a frame at
 * preview size, the least that keeps x264's re-sharpened I-frame of a render part from popping over a held frame),
 * starting from rest as the lockup is whole (CUE.lockup: before it the mark's landing and the name's slide are the
 * motion) and centred on the hold that follows, so the lockup passes the frame's centre while it is read and ends a
 * few px off it (END_OFF_MAX at most: the drift slows to keep inside it on a long hold), never 70 px. Never a growing
 * scale: the browser re-draws promoted text sharper in one frame now and then under one. The fact under the lockup
 * moves with the name on the one axis (END_PART 1: two lines sharing a centre never shear apart; a vertical parting
 * would tick in whole pixels, unpromoted text snapping to the pixel row). */
export const END_DRIFT = 0;
export const END_PART = 1;
/** The most the lockup's centre stands off the frame's centre on the hold (px at 1080p). */
export const END_OFF_MAX = 28;
/** Where on the hold the lockup passes the frame's centre (a share of its travel): past the middle, so the last frame,
 * the one a viewer keeps, stands closest to the centre. */
export const END_CENTRE = 0.62;
/** The hold drift: from the lockup's whole frame, easing up over `ease` frames to `per` px a film frame at 1080p,
 * capped so neither end of the hold's travel stands more than END_OFF_MAX off the centre. */
export const endDrift = (): { from: number; per: number; ease: number } => {
  const from = CUE.lockup;
  const hold = Math.max(1, TOTAL - from);
  const ease = Math.round(f60x(30));
  return { from, per: Math.min(END_DRIFT, END_OFF_MAX / (Math.max(END_CENTRE, 1 - END_CENTRE) * Math.max(1, hold - 1 - ease / 2))), ease };
};
/** The hold drift's offset at frame F (px at 1080p): at rest until the lockup is whole, then easing up to its speed. */
const driftAt = (F: number) => {
  const d = endDrift();
  const t = Math.max(0, F - d.from);
  // the distance under a speed ramping over `ease` frames, then constant
  const eff = t < d.ease ? (t * t) / (2 * d.ease) : t - d.ease / 2;
  return d.per * eff * U;
};
export const endSway = (F: number) => driftAt(F) - mix(driftAt(CUE.lockup), driftAt(TOTAL - 1), END_CENTRE);

/**
 * The last picture leaving behind the lockup: it does not vanish with the element's take-off (12 f) but falls back
 * into the room over about a second, shrinking a few percent and going soft, so the product is still on screen while
 * the mark lands and the name arrives (the end never takes the product off screen early).
 */
const RECEDE = { from: -12, dur: 52, scale: 0.075, blur: 18, under: 0.2, ghost: 0.25 } as const;
const recedeAt = (F: number): SeamLayer | null => {
  const u = clamp((F - (ACT.end.from + f60x(RECEDE.from))) / f60x(RECEDE.dur));
  if (u >= 1) return null;
  // focus leaves it first (the eye goes to the element taking off), then it dims and falls back: three quarters of it
  // gone by the time the element crosses the card (RECEDE.under of the recede), so the flying element never passes over
  // readable words; the last quarter fades with the fall
  const o = 1 - (1 - RECEDE.ghost) * E.stdInOut(clamp(u / RECEDE.under)) - RECEDE.ghost * E.stdInOut(u);
  // on a dark world it darkens into the world first and goes only once dark (never a translucent card over the place)
  if (inksAt(F).dark) {
    const dim = 1 - (1 - RECEDE_IN.dark.dim) * E.glideOut(clamp(u / RECEDE.under / 1.6));
    return { show: true, x: 0, y: 26 * u * u, scale: 1 - RECEDE.scale * E.stdInOut(u), opacity: 1 - E.stdInOut(clamp((u - 0.35) / 0.6)), dim, blur: RECEDE.blur * 1.4 * Math.sqrt(u), smear: 0, ink: 1 };
  }
  return { show: true, x: 0, y: 26 * u * u, scale: 1 - RECEDE.scale * E.stdInOut(u), opacity: o, blur: RECEDE.blur * Math.sqrt(u), smear: 0, ink: 1 };
};

/**
 * The end card's hero shot (deal.ts HERO_META logo-3d): the brand's mark as a solid (fx/three Logo3D) opens the end on an
 * extreme close-up of its bevelled edge and pulls back, turning to face the camera, landing exactly on the flat mark where
 * it stands alone before the name slides out. It needs the brand's own mark (scripts/brand.py): with the stand-in, the
 * element becomes the mark as usual (precheck says so). Software GL draws its flat version (the mark pulling back).
 */
const MARK3D = HERO_END === 'logo-3d' && !LOGO_STANDIN;
if (HERO_END === 'logo-3d' && LOGO_STANDIN) timingFail('hero', 'hero: logo-3d was dealt for the end card but the brand has no mark yet (src/brand/logo.ts is the stand-in): run scripts/brand.py with the brand\'s SVG, or swap it in launch.ts heroes.swap with the reason');
/**
 * f@60 from the end's first frame to the drawn mark: the element lands in 18; the 3D mark's pull-back runs until 8 f@60
 * before the name slides out (CUE.name, on the grid), so the mark never waits small and alone for the name.
 */
const MARK_LAND = MARK3D ? Math.max(60, ((CUE.name - ACT.end.from) * 60) / FPS - 8) : 18;
// fx/three loads three.js: only a film whose end card is the 3D mark needs it, so the part is required where it plays
// (the bundler takes it in; a Node import of this file never loads three.js)
declare const require: (id: string) => unknown;
const logo3D = () => (require('../fx/three') as typeof import('../fx/three')).Logo3D;
/** The 3D part's GL: 'auto' draws 3D on a hardware GPU and its flat version on software GL ('force' renders 3D anyway, slowly). */
export const MARK3D_GL: 'auto' | 'force' | 'fallback' = 'auto';
/** The world's light for the 3D mark: its key's direction and the stage its gloss reflects. */
const markLight = () => {
  const k = WORLD_SPEC.key;
  const azimuth = ((Math.atan2(k.x - 0.5, -(k.y - 0.5)) * 180) / Math.PI + 360) % 360;
  const stage = WORLD_SPEC.tone === 'light' ? (FAMILY === 'paleSky' || FAMILY === 'sky' || FAMILY === 'clouds' ? 'sky' : 'studio') : FAMILY === 'blackField' ? 'black' : 'night';
  return { stage, azimuth, elevation: 38 } as const;
};

/** The centred lockup: the mark, the name sliding out beside it, the one fact under them, held on a slow drift. */
const EndCard: React.FC<{ F: number }> = ({ F }) => {
  const L = lockLayout();
  const inks = inksAt(F);
  const fact = copy('close');
  const sway = endSway(F);
  // the element lands as the mark first; the drawn mark takes over once it is whole (opacity, never by mounting)
  const markOn = F >= ACT.end.from + f60x(MARK_LAND) ? 1 : 0;
  // the name slides out from behind the mark toward its place, the lockup re-centring as it does (M.lockup)
  const n = prog(F, CUE.name, CUE.lockup, E.glideOut);
  const shiftX = (1 - n) * L.alone; // before the name: the mark alone sits at the centre
  const named = F >= CUE.name ? 1 : 0;
  const factIn = E.snapOut(clamp((F - fact.in) / f60x(22)));
  const markNode = LOGO_STANDIN && HERO_MARK ? (
    <HERO_MARK id="lockup" size={L.markH} color={markColor(inks)} />
  ) : LOGO_STANDIN ? (
    <LetterMark size={L.markH} inks={inks} sheen={sway * 0.8} />
  ) : LOGO_RASTER ? (
    <Img src={staticFile(LOGO_RASTER)} style={{ position: 'absolute', left: 0, top: 0, width: L.markH, height: L.markH, objectFit: 'contain' }} />
  ) : (
    <LogoMark logo={LOGO} size={L.markH} fill={markFill(inks)} />
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${(L.cy + LOCK.below * U * 0.4).toFixed(1)}px`, transform: `translate3d(${sway.toFixed(3)}px, 0, 0)` }}>
      {MARK3D && !markOn ? (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {React.createElement(logo3D(), { lockup: { x: L.mark.x + L.alone, y: L.mark.y, size: L.markH }, logo: LOGO, at: 0, dur: MARK_LAND, seed: SEED, light: markLight(), gl: MARK3D_GL })}
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: 0, top: 0, width: L.markH, height: L.markH, opacity: markOn, transform: `translate3d(${(L.mark.x + shiftX).toFixed(3)}px, ${L.mark.y.toFixed(3)}px, 0)` }}>
        {markNode}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: named, clipPath: `inset(0px 0px 0px ${(L.mark.x + shiftX + L.markH + L.gap * 0.5).toFixed(2)}px)` }}>
        <Text id="wordmark" x={L.left + L.markH + L.gap + shiftX - (1 - n) * L.wName * 0.5} y={L.cy - L.size * 0.52} style={{ fontFamily: FONT.text, fontSize: L.size, fontWeight: L.wm.weight, letterSpacing: `${L.wm.track}em`, lineHeight: 1, color: inks.type, opacity: mix(0.45, 1, n), fontKerning: 'normal' }}>
          {L.name}
        </Text>
      </div>
      <Text id="close" x={-sway * (1 - END_PART)} y={L.cy + LOCK.below * U - LOCK.fact * U * 0.6 + (1 - factIn) * 18 * U} width={W} style={{ textAlign: 'center', fontFamily: FONT.text, fontSize: LOCK.fact * U, fontWeight: TYPE.caption.weight, letterSpacing: `${TYPE.caption.track}em`, lineHeight: 1.2, color: mixColor(inks.type, inks.ground, 0.24), opacity: factIn }}>
        {fact.text}
      </Text>
    </div>
  );
};

/** The element that becomes the mark: the last picture's hero, its size and colour carried into the mark (the product's
 * hero mark, whole, flying as itself; or the hero card turning into the letter tile), turning a little over a full turn
 * as it goes for the badge (a spin blur on the fast frames). */
const Element: React.FC<{ F: number; sx?: number; sy?: number }> = ({ F, sx = 1, sy = 1 }) => {
  const L = lockLayout();
  const inks = inksAt(F);
  const spin = DEAL.end === 'badge' ? spinInState(F, { at: ACT.end.from - Math.round(f60x(12)), room: 0, slide: 0, turns: 1.1 }, { fps: FPS, width: W, height: H }) : null;
  // it takes over from the hero card over 10 f (the card's content fading under it), never in one frame
  const take = prog(F, ACT.end.from - f60x(12), ACT.end.from - f60x(2), E.stdInOut);
  const t = prog(F, ACT.end.from - f60x(12), ACT.end.from + f60x(18), E.strongInOut);
  const glyph = prog(F, ACT.end.from - f60x(4), ACT.end.from + f60x(16), E.stdInOut);
  // the corner as it shows on screen (the hero's radius, then the mark's), drawn through the box's non-uniform scale
  const R = mix(heroBox().radius, L.markH * 0.24, t);
  const radius = `${(R / Math.max(1e-3, sx)).toFixed(3)}px / ${(R / Math.max(1e-3, sy)).toFixed(3)}px`;
  // the hero mark flies as itself (the scene draws it in the same place up to the take-off: no fade, no double); the
  // letter stand-in: the element keeps its colour and light and becomes the tile, its letter inking in once the tile is
  // nearly square (a letter stretched by the morph never shows)
  const tile = LOGO_STANDIN && HERO_MARK ? (
    <HERO_MARK id="element" size={L.markH} color={markColor(inks, t)} />
  ) : LOGO_STANDIN ? (
    <div style={{ position: 'absolute', inset: 0, opacity: take, borderRadius: radius, overflow: 'hidden' }}>
      <LetterMark size={L.markH} inks={inks} radius={radius} letter={prog(F, ACT.end.from + f60x(2), ACT.end.from + f60x(18), E.stdInOut)} />
    </div>
  ) : (
    <div style={{ position: 'absolute', inset: 0, opacity: take, borderRadius: radius, background: mixColor(heroFill(inks), inks.ground, t), boxShadow: inks.dark ? 'none' : `0 ${(18 * (1 - t)).toFixed(1)}px ${(48 * (1 - t)).toFixed(1)}px rgba(0, 0, 0, ${(0.1 * (1 - t)).toFixed(3)})` }}>
      <div style={{ position: 'absolute', inset: 0, opacity: glyph }}>
        <LogoMark logo={LOGO} size={L.markH} fill={markFill(inks)} />
      </div>
    </div>
  );
  if (!spin) return tile;
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `rotate(${spin.rot.toFixed(2)}deg)` }}>
      <SpinBlur omega={Math.abs(spin.omega) > 2 ? spin.omega : 0} cx={L.markH / 2} cy={L.markH / 2}>{tile}</SpinBlur>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the colour field

/** The claim's beat (the last line) and the scene before it, which names the element the field grows out of. */
const CLAIM_BEAT = BEAT_PLAN.findIndex((b) => b.id === `line${LAUNCH.pairs.length}`);
const FIELD_PAIR = LAUNCH.pairs.length - 1;
const fieldDef = (): SceneDef | undefined => (FIELD_PAIR >= 1 ? (SCENES[LAUNCH.pairs[FIELD_PAIR - 1].scene] as SceneDef | undefined) : undefined);
/**
 * The element the claim's field grows out of: the scene's own `field`, else a disc of the accent at the scene's focus
 * (its centre; without a focus, the frame's), FIELD.seed px across, so the film's one colour event never depends on a
 * scene naming one (a film without it stays one value for 30 s: flat).
 */
export const fieldBoxOf = (def?: SceneDef): FieldBox | undefined => {
  if (!def) return undefined;
  if (def.field) return def.field();
  const f = focusOf(def);
  const cx = f ? f.x + (f.w ?? 0) / 2 : W / 2;
  const cy = f ? f.y + (f.h ?? 0) / 2 : H / 2;
  const s = FIELD.seed * U;
  return { x: cx - s / 2, y: cy - s / 2, w: s, h: s, radius: s / 2 };
};
/** Whether the claim sits on the colour field: every family without an event of its own, the claim alone after a picture. */
export const FIELD_ON = !CREATIVE_COLOUR && !PLATE_WORLD && CLAIM_BEAT > 0 && PAIRS[PAIRS.length - 1].mode === 'alone' && !!fieldDef();
/**
 * The field: the accent (or the element's own colour) lit from its top left corner (a lit field, never a flat slab,
 * never a glow behind the line); the claim in white on it, a key word in the ground's deep tone. `grow`: frames (f@60)
 * the element takes to become the frame, into the seam's cut; `life`: the claim's drift and creep on the field (x the
 * house: white on a mid tone needs more travel to read alive); `key`: where the field's light sits (shares of the
 * frame: at its top left corner, so the brightest part is the edge); `reach`: how far the field runs past the frame's
 * right edge, so a moving exit never shows its edge (the carried cut then reads the line's own speed, as on the ground).
 */
export const FIELD = { grow: 16, light: 0.2, life: 2, key: [0.04, 0.02] as const, reach: 0.3, seed: 120 } as const;
const fieldColour = () => fieldBoxOf(fieldDef())?.color ?? C.accent;
const fieldInks = (inks: FamilyInks): FamilyInks => {
  const bg = fieldColour();
  const type = inkOn(bg, inks);
  return { ...inks, type, accent: type === C.white ? (inks.dark ? inks.ground : C.ink) : C.white };
};
/** The field as the claim's ground: drawn under the line for the whole beat (the seams carry it in and out), lit from
 * the top left corner (falling off in two directions to the field's own colour), never a glow behind the line.
 * `ox`, `oy`: the frame's origin inside a box that shows part of it (the element growing into the field). */
const FieldPlate: React.FC<{ ox?: number; oy?: number }> = ({ ox = 0, oy = 0 }) => {
  const bg = fieldColour();
  const res = Math.round(W * 0.3);
  const light = bakePlate('radial', [{ at: 0, color: C.white, alpha: 1 }, { at: 0.35, color: C.white, alpha: 0.5 }, { at: 0.75, color: C.white, alpha: 0.1 }, { at: 1, color: C.white, alpha: 0 }], res, res, { seed: 23 });
  const LR = W * 1.7;
  return (
    <div data-ground="field" style={{ position: 'absolute', left: ox - W * 0.05, top: oy - H * 0.05, width: W * (1.05 + FIELD.reach), height: H * 1.1, background: bg, overflow: 'hidden' }}>
      <Img src={light} style={{ position: 'absolute', left: 0, top: 0, width: LR, height: LR, opacity: FIELD.light, transform: `translate3d(${(W * 0.05 + W * FIELD.key[0] - LR / 2).toFixed(1)}px, ${(H * 0.05 + H * FIELD.key[1] - LR / 2).toFixed(1)}px, 0)` }} />
    </div>
  );
};
/** The element's box on screen at frame F (the scene's camera applied), the field's first frame. */
const fieldBoxOnScreen = (F: number) => {
  const box = fieldBoxOf(fieldDef());
  if (!box) return null;
  const c = camOf(FIELD_PAIR, F);
  return { x: c.ox + (box.x - c.ox) * c.scale + c.dx, y: c.oy + (box.y - c.oy) * c.scale + c.dy, w: box.w * c.scale, h: box.h * c.scale, radius: box.radius * c.scale, color: box.color ?? C.accent };
};

/** The film's one colour event (the families without one of their own): the claim's field, 0..1 (it fills the frame on the seam's cut). */
export const EVENT_FROM = FIELD_ON ? BEAT_PLAN[CLAIM_BEAT].from : Infinity;
export const colourAt = (F: number) => (EVENT_FROM === Infinity ? 0 : F < EVENT_FROM ? prog(F, EVENT_FROM - f60x(FIELD.grow), EVENT_FROM, E.launchIn) : F < BEAT_PLAN[CLAIM_BEAT].to ? 1 : 0);

// ------------------------------------------------------------------------------------------------ the stage

const beatAt = (F: number): number => {
  let k = 0;
  for (let i = 0; i < BEAT_PLAN.length; i++) if (F >= BEAT_PLAN[i].from) k = i;
  return k;
};
const seamFor = (at: number) => SEAM_PLAN.find((s) => s.at === at);

/**
 * Picture -> line, `recede`: the picture falls back while the next line builds over it on the kept ground (it shrinks
 * by `scale`, softens to `blur` px and fades over `dur` f@60 from the line's first frame): the frame is never empty, and
 * the outgoing picture's motion carries the change.
 */
export const RECEDE_IN = { dur: 30, scale: 0.14, blur: 36, drop: 22, gone: 0.62, dark: { dim: 0.14, fast: 0.32, from: 0.22, out: 0.62 } } as const;
const recedeState = (F: number, at: number): { out: SeamLayer; in: SeamLayer } => {
  const u = clamp((F - at) / f60x(RECEDE_IN.dur));
  const e = E.buildIn(u);
  // on a dark world the picture darkens into the world as it falls back and softens (front-loaded: under the line's
  // first word it is already a dark, soft shape), its opacity going only once it is dark: never a translucent card with
  // the world's lights showing through it. On a light world it fades (a white card on a light ground leaves no ghost),
  // gone by RECEDE_IN.gone of the recede.
  const D = RECEDE_IN.dark;
  const dark = inksAt(F).dark;
  const opacity = dark ? 1 - E.stdInOut(clamp((u - D.from) / (D.out - D.from))) : 1 - E.stdInOut(clamp(u / RECEDE_IN.gone));
  const dim = dark ? 1 - (1 - D.dim) * E.glideOut(clamp(u / D.fast)) : 1;
  return {
    out: { show: F < at || u < 1, x: 0, y: RECEDE_IN.drop * e, scale: 1 - RECEDE_IN.scale * E.stdInOut(u), opacity, dim, blur: RECEDE_IN.blur * Math.sqrt(u), smear: 0, ink: 1 },
    in: { show: F >= at, x: 0, y: 0, scale: 1, opacity: 1, blur: 0, smear: 0, ink: 1 },
  };
};
/** The frames a planned seam spans, [start, end). */
const spanOf = (s: (typeof SEAM_PLAN)[number], film: ReturnType<typeof useFilm>): [number, number] =>
  s.recipe === 'handover' ? [s.at - 1, s.at + 1] : s.recipe === 'recede' ? [s.at, s.at + Math.ceil(f60x(RECEDE_IN.dur))] : seamSpan({ recipe: s.recipe, at: s.at, dir: s.dir, id: s.id, ...seamExtra(s.recipe, s.dir) } as SeamOpts, film);

/** Two layer states, one inside the other (a seam's move around an element's own depth or exit). */
const compose = (a?: SeamLayer, b?: SeamLayer): SeamLayer | undefined => {
  if (!a) return b;
  if (!b) return a;
  return { show: a.show && b.show, x: a.x + b.x, y: a.y + b.y, scale: a.scale * b.scale, opacity: a.opacity * b.opacity, blur: a.blur + b.blur, smear: a.smear + b.smear, ink: Math.min(a.ink, b.ink), dim: (a.dim ?? 1) * (b.dim ?? 1) };
};

/** One element on the stage: a line, a scene or the end card, each with its own key (its layer lives as long as it
 * shows); `own`, its own state (a picture's depth behind its line, a line's exit over its picture); `role`, what it is. */
type Item = { key: string; z: number; node: React.ReactNode; own?: SeamLayer; role: 'scene' | 'line' | 'field' | 'end' };

/** The elements beat `i` shows at frame F, at rest (the seam moves them). */
const itemsOf = (i: number, F: number, o: { lineOnly?: boolean } = {}): Item[] => {
  const b = BEAT_PLAN[i];
  if (!b) return [];
  // the lockup only drifts sideways: its text is drawn in place every frame (unpromoted text moves sub-pixel sideways),
  // never a promoted layer the browser re-draws now and then over a long hold
  if (b.kind === 'end') return [{ key: 'end', z: 1000, role: 'end', node: <PromoteCtx.Provider value={false}><EndCard F={F} /></PromoteCtx.Provider> }];
  // a picture under its line stands back (with): low and soft until the line leaves, then racking into focus
  const scene: Item = { key: `scene${b.pair}`, z: b.pair * 10 + 1, role: 'scene', node: <Scene pair={b.pair} F={F} />, own: withDepth(undefined, depthOf(b.pair, F), b.pair, F) };
  if (b.kind === 'A') return [scene];
  // a line held over its own hero shot: the shot sets the line in its composition (one item, the whole beat)
  const over = HERO_OVER[b.pair - 1];
  if (over && b.kind === 'TA') {
    const pr = PAIRS[b.pair - 1];
    return [{ key: `hero${b.pair}`, z: b.pair * 10 + 1, role: 'scene', node: <HeroOver id={over.id} f={F - pr.from} dur={pr.to - pr.from} F={F} from={pr.from} inks={inksAt(F)} pair={b.pair} seed={SEED + b.pair} line={{ id: b.id, raw: LAUNCH.pairs[b.pair - 1].line ?? '' }} /> }];
  }
  const inks = inksAt(F);
  const flood = COLOUR.find((c) => c.id === 'band-flood' && F >= c.from && F < c.to);
  const onField = FIELD_ON && i === CLAIM_BEAT && b.kind === 'T';
  const lineInks = onField ? fieldInks(inks) : flood && inks.onField ? { ...inks, type: inks.onField, accent: inks.onField } : inks;
  const exit = lineExitOf(b.pair, F);
  const ldev = LINE_DEV[b.pair - 1];
  const hline = HERO_LINE[b.pair - 1];
  const node = hline ? (
    <HeroLine id={hline.id} F={F} inks={lineInks} pair={b.pair} seed={SEED + b.pair} line={{ id: b.id, raw: LAUNCH.pairs[b.pair - 1].line ?? '' }} until={b.to} />
  ) : ldev ? (
    <DeviceLine pair={b.pair} F={F} inks={lineInks} />
  ) : (
    <Line id={b.id} raw={LAUNCH.pairs[b.pair - 1].line ?? ''} F={F} inks={lineInks} life={onField ? FIELD.life : 1} />
  );
  const line: Item[] = exit && !exit.show ? [] : [{ key: `line${b.pair}`, z: b.pair * 10 + 2, role: 'line', own: exit, node }];
  const field: Item[] = onField ? [{ key: 'field', z: b.pair * 10, role: 'field', node: <FieldPlate /> }] : [];
  return b.kind === 'TA' && !o.lineOnly ? [...field, scene, ...line] : [...field, ...line];
};

/** The band flood of the white-with-a-band family: 0..1 over its colour event, rising and falling in 18 f. */
const floodAt = (F: number) => {
  const c = COLOUR.find((x) => x.id === 'band-flood');
  if (!c) return 0;
  return Math.min(prog(F, c.from - f60x(14), c.from + f60x(4), E.glideOut), 1 - prog(F, c.to - f60x(16), c.to, E.softIn));
};

/**
 * The stage at the absolute frame F: the ground is drawn under it (Ground); here, the beat, or the seam between two.
 * Every change of picture carries something and the frame is never empty: a line after a picture builds over the
 * picture as it leaves (recede, or over the push of a zoomThrough); a line that arrives with its picture stays put while
 * the picture comes in under it (only the picture takes the seam's move); the film's carried element flies over a
 * picture-to-picture seam (Carried).
 */
export const Stage: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const i = beatAt(F);
  const b = BEAT_PLAN[i];
  const next = BEAT_PLAN[i + 1];
  const inS = seamFor(b.from);
  const outS = next ? seamFor(next.from) : undefined;
  const s = inS && F < spanOf(inS, film)[1] ? inS : outS && F >= spanOf(outS, film)[0] ? outS : undefined;
  const centre = `${W / 2}px ${H / 2}px`;
  const layers: { item: Item; st?: SeamLayer; origin?: string; moving?: boolean }[] = [];
  const push = (it: Item, st?: SeamLayer, origin?: string) => layers.push({ item: it, st: compose(st, it.own), origin, moving: !!st });
  let element: React.ReactNode = null;
  let grow: React.ReactNode = null;
  if (!s) {
    for (const it of itemsOf(i, F)) push(it);
    // the last picture falls back behind the lockup for a second after the element's take-off
    const r = b.kind === 'end' && !HERO_END ? recedeAt(F) : null;
    if (r) for (const it of itemsOf(i - 1, F)) push(it, r);
  } else {
    const opts: SeamOpts = { recipe: s.recipe === 'recede' || s.recipe === 'handover' ? 'exitEnter' : s.recipe, at: s.at, dir: s.dir, id: s.id, ...seamExtra(s.recipe, s.dir) };
    let toBox: { x: number; y: number; w: number; h: number } | undefined;
    if (s.recipe === 'sharedElement') {
      // the element leaves from where the hero stands on screen at the cut (the picture's camera applied) and lands
      // where the mark stands alone, centred, before the name slides out beside it
      const L = lockLayout();
      const hb = heroBox();
      const c = camOf(LAUNCH.pairs.length, s.at - 1);
      toBox = { ...L.mark, x: L.mark.x + L.alone + endSway(F) };
      Object.assign(opts, { fromBox: { x: c.ox + (hb.x - c.ox) * c.scale + c.dx, y: c.oy + (hb.y - c.oy) * c.scale + c.dy, w: hb.w * c.scale, h: hb.h * c.scale }, toBox });
    }
    // into the claim's field: the seam pushes into the element the field grows out of (its centre holds its place)
    const intoField = FIELD_ON && s.to === CLAIM_BEAT;
    const fb = intoField ? fieldBoxOnScreen(Math.min(F, s.at - 1)) : null;
    const rest = (show: boolean): SeamLayer => ({ show, x: 0, y: 0, scale: 1, opacity: 1, blur: 0, smear: 0, ink: 1 });
    const st = s.recipe === 'handover' ? { out: rest(F < s.at), in: rest(F >= s.at), element: 0, box: undefined } : s.recipe === 'recede' ? { ...recedeState(F, s.at), element: 0, box: undefined } : seamState(F, opts, film);
    // the last picture recedes behind the lockup instead of leaving with the element's take-off
    if (s.recipe === 'sharedElement') Object.assign(st.out, recedeAt(F) ?? { show: false });
    const outOrigin = fb ? `${(fb.x + fb.w / 2).toFixed(2)}px ${(fb.y + fb.h / 2).toFixed(2)}px` : centre;
    if (st.out.show) for (const it of itemsOf(s.from, F)) push(it, st.out, outOrigin);
    // the incoming beat: a picture takes the seam's move; a line that arrives with its picture (picture -> picture) holds
    // its centre while the picture comes in under it; a line after a push through builds over the push (LINE_EARLY)
    const incoming = itemsOf(s.to, F);
    if (st.in.show) for (const it of incoming) push(it, it.role === 'line' && s.cls === 'AA' ? undefined : st.in);
    else if (s.cls === 'AT') for (const it of incoming) if (it.role === 'line' && F >= copy(BEAT_PLAN[s.to].id).in) push(it);
    if (fb && F < s.at) {
      // the element grows into the frame ahead of the cut (log size, centre to the frame's, corners to square), on top
      // of the outgoing picture, its words fading under its colour in the first frames; whole on the cut's frame
      const u = clamp((F - (s.at - f60x(FIELD.grow))) / f60x(FIELD.grow));
      if (u > 0) {
        const e = E.launchIn(u);
        const k = st.out.scale;
        const cx0 = fb.x + fb.w / 2;
        const cy0 = fb.y + fb.h / 2;
        const lw = (a: number, z: number) => Math.exp(mix(Math.log(Math.max(1, a)), Math.log(z), e));
        const w = lw(fb.w * k, W * 1.12);
        const h = lw(fb.h * k, H * 1.12);
        const cx = mix(cx0, W / 2, e);
        const cy = mix(cy0, H / 2, e);
        const x = cx - w / 2;
        const y = cy - h / 2;
        grow = (
          <div key="field-grow" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 999, overflow: 'hidden', borderRadius: mix(fb.radius * k, 0, e), opacity: clamp(u * 3.2), transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)` }}>
            <FieldPlate ox={-x} oy={-y} />
          </div>
        );
      }
    }
    if (s.recipe === 'sharedElement' && st.box && toBox) {
      // laid out at its incoming size, placed and scaled by transform (never by left/top: no pixel stairs)
      element = (
        <div key="element" style={{ position: 'absolute', left: 0, top: 0, width: toBox.w, height: toBox.h, zIndex: 1001, transformOrigin: '0 0', transform: `translate3d(${st.box.x.toFixed(3)}px, ${st.box.y.toFixed(3)}px, 0) scale(${(st.box.w / toBox.w).toFixed(5)}, ${(st.box.h / toBox.h).toFixed(5)})` }}>
          <Element F={F} sx={st.box.w / toBox.w} sy={st.box.h / toBox.h} />
        </div>
      );
    }
  }
  layers.sort((p, q) => p.item.z - q.item.z);
  // the ending settles out: the whole frame, world and lockup, into the world's deep tone over END_FADE (timeline)
  const fadeU = clamp((F - (TOTAL - f60x(END_FADE.fade))) / f60x(END_FADE.fade));
  const fadeTo = WORLD_SPEC.tone === 'dark' ? mixColor(WORLD_SPEC.base, '#000000', 0.55) : WORLD_SPEC.base;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {fadeU > 0 ? <div key="fade-out" style={{ position: 'absolute', left: -4, top: -4, right: -4, bottom: -4, zIndex: 3000, background: fadeTo, opacity: E.stdInOut(fadeU) }} /> : null}
      {layers.map(({ item, st, origin, moving }) => (
        // both sides of a seam are in flight: the layout audit holds them to no resting rule (safe zone, widths)
        <div key={item.key} data-audit-push={moving ? 'moving' : undefined} style={{ position: 'absolute', inset: 0, zIndex: item.z }}>
          <Layer s={st} origin={origin ?? centre} z={item.z}>{item.node}</Layer>
        </div>
      ))}
      {grow}
      <Carried F={F} />
      {element}
    </div>
  );
};

/**
 * (Kept for old scenes and the template's test; the stage no longer draws it: the family field carries its own key.)
 * The key light on the ground: a light from above, never a pool behind the content (a radial glow behind a line or a
 * card reads as haze; look-audit ground-haze fails a ground that rises to a pool inside the frame). The top edge is lifted
 * in a lighter tone of the ground's own hue (dark families: toward the accent, a touch of white, never a grey that washes
 * the colour out; light ones: white), falling off by two thirds down the frame, the plate turned `angle` degrees so the
 * light comes a little from the left, swaying `sway` degrees and lagging the camera float by `lag` (the wall behind
 * moves less than what stands before it) on its own `period` s loop; the bottom corners fall into the family's far
 * tone. `lift`: the top tone's mix toward white (dark) and the plate's opacity. Its level never changes through the
 * film: the light does not brighten under a beat, and it is never brighter than the subject. Every plate is baked
 * dithered, so the ground takes no grain of its own: a grain over a held frame turns each part boundary of the render
 * (an I-frame, x264 re-sharpening the noise) into a one-frame pop that forensics fails.
 */
export const KEY_LIGHT = { angle: -9, sway: 0, lag: 0, drift: 0, period: 13, lift: { dark: 0.06, light: 0.65 }, opacity: { dark: 0.55, light: 0.65 }, far: { dark: 0.85, light: 0.5 }, head: 0.4 } as const;
/** Where the key plate's top edge sits at a turn of `deg` degrees, px from the frame's top at the frame's left and
 * right edges (negative: above the frame). Pure: the test reads it for every angle the sway reaches. */
export const keyPlateTopEdge = (deg: number, ky: number = -H * 0.12) => {
  const KW = W * 1.5;
  const head = KEY_LIGHT.head * H;
  const a = (deg * Math.PI) / 180;
  // the plate's top corners about its origin (the light's top centre), turned as CSS rotate() turns them
  const turn = (x: number, y: number) => ({ x: W / 2 + x * Math.cos(a) - y * Math.sin(a), y: ky + x * Math.sin(a) + y * Math.cos(a) });
  const l = turn(-KW / 2, -head);
  const r = turn(KW / 2, -head);
  const at = (x: number) => l.y + ((r.y - l.y) * (x - l.x)) / (r.x - l.x);
  return { left: at(0), right: at(W) };
};


/**
 * The ground under every act, never cut and still: the dealt world (src/world.tsx: a photograph graded for the film or
 * a lit field baked once, with its key light). Film.tsx draws the acts inside it, so glass, rims and sweeps read it;
 * this draws it alone. The film's colour event is the claim's field (drawn by the stage on the claim's beat).
 */
export const Ground: React.FC<{ F: number }> = () => <FilmWorld />;
// (kept for a family with a band of its own: worlds have none)
void floodAt;

/** The film's page colour (Film.tsx, Root.tsx). */
export const PAGE = { ground: WORLD_SPEC.base };

/** One act: a window on the stage (its own composition in Root.tsx). */
export const actOf = (name: string): React.FC => {
  const A: React.FC = () => {
    const F = useAbs(name);
    return <Stage F={F} />;
  };
  A.displayName = `Act_${name}`;
  return A;
};
