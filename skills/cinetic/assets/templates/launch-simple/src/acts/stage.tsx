// The one stage every act draws: the dealt ground family under everything (never cut), the line in the dealt voice
// (acts/line.tsx), the product's scene, the seams between them (fx/Seam seamState, drawn by acts/layer.tsx) and the
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
import { familyInks, FamilyGround, type FamilyInks, type GroundFamily } from '../fx/Grounds';
import { bakePlate } from '../fx/Gradients';
import { type SeamOpts, seamSpan, seamState } from '../fx/Seam';
import { SpinBlur } from '../fx/Defocus';
import { spinInState } from '../fx/Wordmark';
import { clamp, E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { holdDrift } from '../lib/continuity';
import { measureTracked } from '../lib/measure';
import { floatAt, type FloatOpts, withLocks } from '../lib/drift';
import { LAUNCH } from '../launch';
import { DEAL, SEED } from '../deal';
import * as PRODUCT from '../product';
import { SCENES } from '../product';
import { ACT, BEAT_PLAN, COLOUR, copy, CUE, DARK_FROM, f60x, FPS, H, PAIRS, SEAM_PLAN, TOTAL, W } from '../timeline';
import { Layer, PromoteCtx } from './layer';
import { Line, Text } from './line';
import { inkOn, litFace, SceneCtx } from './ui';
import type { SeamLayer } from '../fx/Seam';

export const FAMILY = DEAL.ground as GroundFamily;
/** The family's inks at frame F (the light-then-dark family turns once, on a seam). */
export const inksAt = (F: number): FamilyInks => familyInks(FAMILY, { dark: F >= DARK_FROM });
/** The background colour under the acts (the ground family's own field). */
export const GROUND_AT = (F: number) => inksAt(F).ground;

/** The camera float every act sits on (Film.tsx): one faint drift through the film (0.15 of the house amplitude: the
 * picture beats' own camera leads, the lines creep and drift, the lockup creeps; a stronger float cancels the picture's
 * push on one side and flattens it), eased to rest once, on line 1's read. */
export const FLOAT: FloatOpts = withLocks({ seed: SEED, amp: 0.15 }, [copy('line1')], { fps: FPS });

/** The absolute film frame inside an act. */
export const useAbs = (act: string) => useCurrentFrame() + ACT[act].from;

// ------------------------------------------------------------------------------------------------ the scenes

export type SceneProps = { f: number; dur: number; hits: number[]; inks: FamilyInks; pair: number; cut?: number };
/**
 * A scene: its drawing; `hero`, the box of the element the end card is built from (the last scene) and its `fill`
 * ('accent', a colour, or the card surface by default); `focus`, the point the closer frame pushes in on (default: the
 * hero's centre, else the frame's): put the picture's own moment there; `cut`, what happens on the beat's cut CUE:
 * 'closer' (default) the stage cuts to a closer frame of the same shot, 'scene' the scene cuts itself (the input
 * footage to the lit device: SceneProps `cut` is its frame) and the stage keeps the camera's scale; `field`, on the
 * scene before the claim, the box (scene px) of the element the claim's colour field grows out of, and its colour.
 */
type CutMode = 'closer' | 'scene';
export type FieldBox = { x: number; y: number; w: number; h: number; radius: number; color?: string };
export type SceneDef = { draw: React.FC<SceneProps>; hero?: { x: number; y: number; w: number; h: number; radius: number; fill?: string }; focus?: { x: number; y: number }; cut?: CutMode | (() => CutMode); field?: () => FieldBox };
const cutMode = (def?: SceneDef): CutMode => (typeof def?.cut === 'function' ? def.cut() : def?.cut ?? 'closer');
/** The closer frame: the picture beat's one punch-in (a cut, x1.45), a crop of the same shot that bleeds past the frame's edges. */
export const CLOSER = 1.45;

/** The picture beat's camera at frame F: the dealt drift (sideways, 1.5 % of the width a second, odd pictures right and
 * even ones left) or rise (1.5 % of the height a second), a step of 1.5 % of the frame along it at each re-frame, back and forth (CUE
 * a<pair>m<k>, settling in 34 f) and the cut to a closer frame (CUE a<pair>cut: x1.45 about the scene's focus). The
 * camera only travels: a scale that grows through a shot makes the browser re-draw promoted text sharper in one frame. */
const camOf = (pair: number, F: number) => {
  const p = LAUNCH.pairs[pair - 1];
  const def = SCENES[p.scene] as SceneDef | undefined;
  const pr = PAIRS[pair - 1];
  const from = p.over ? pr.from : pr.ta;
  const dur = pr.to - from;
  const u = (F - from) / Math.max(1, dur);
  const cut = CUE[`a${pair}cut`];
  const closer = cut !== undefined && F >= cut && cutMode(def) === 'closer' ? CLOSER : 1;
  // re-frames step back and forth (+1.5 %, -1.5 %, ...), so the frame never wanders off the product
  const steps = Object.keys(CUE).filter((n) => n.startsWith(`a${pair}m`)).reduce((m, n, j) => m + (j % 2 ? -0.75 : 0.75) * E.settleOut(clamp((F - CUE[n]) / f60x(34))), 0);
  const side = pair % 2 ? 1 : -1;
  const dx = DEAL.camera === 'drift' ? ((u - 0.5) * 0.015 * (dur / FPS) + 0.02 * steps) * W * side : 0;
  const dy = DEAL.camera === 'rise' ? -((u - 0.5) * 0.015 * (dur / FPS) + 0.02 * steps) * H : 0;
  const scale = closer;
  const ox = def?.focus?.x ?? (def?.hero ? def.hero.x + def.hero.w / 2 : W / 2);
  const oy = def?.focus?.y ?? (def?.hero ? def.hero.y + def.hero.h / 2 : H / 2);
  return { from, dur, dx, dy, scale, ox, oy, closer: closer > 1, cut: cut === undefined ? undefined : cut - from };
};

/** A picture beat: the product's scene, full frame, on the dealt camera. The closer frame is a new shot (a cut): the
 * scene is drawn afresh there, at its new size (its text sharp at the closer scale). */
const Scene: React.FC<{ pair: number; F: number }> = ({ pair, F }) => {
  const p = LAUNCH.pairs[pair - 1];
  const def = SCENES[p.scene] as SceneDef | undefined;
  if (!def) return null;
  const c = camOf(pair, F);
  const hits = Object.keys(CUE).filter((n) => n.startsWith(`a${pair}h`)).map((n) => CUE[n] - c.from);
  const Draw = def.draw;
  return (
    <div key={c.closer ? 'closer' : 'wide'} data-audit-push={c.closer ? 'bleed' : undefined} style={{ position: 'absolute', inset: 0, transformOrigin: `${c.ox.toFixed(1)}px ${c.oy.toFixed(1)}px`, transform: `translate3d(${c.dx.toFixed(3)}px, ${c.dy.toFixed(3)}px, 0) scale(${c.scale.toFixed(5)})` }}>
      <SceneCtx.Provider value={{ f: F - c.from, dur: c.dur, cam: { dx: c.dx, dy: c.dy } }}>
        <Draw f={F - c.from} dur={c.dur} hits={hits} inks={inksAt(F)} pair={pair} cut={c.cut} />
      </SceneCtx.Provider>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the end card

/** The lockup's sizes (px at 1080p): the name's size, the mark's height, the gap, the fact's size below. */
export const LOCK = { name: 150, mark: 132, gap: 0.36, fact: 50, below: 128 } as const;
/** The name as a wordmark, not a line: heavier and tighter than the statements (one face, a second weight). */
export const WORDMARK_TYPE = { weight: 700, track: -0.045 } as const;
const lockLayout = () => {
  const name = copy('wordmark').text;
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = markH * LOCK.gap;
  const wName = measureTracked(name, size, WORDMARK_TYPE.weight, WORDMARK_TYPE.track, FONT.text, { trailing: false });
  const total = markH + gap + wName;
  const left = (W - total) / 2;
  const cy = H / 2 - 30 * U;
  return { name, size, markH, gap, wName, left, cy, mark: { x: left, y: cy - markH / 2, w: markH, h: markH } };
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

/** The end card's life on its hold: the house hold drift sideways (30 px a second), centred on the end act (the element
 * lands on it). Never slower: the end hold is longer than a render part, so one part boundary (an I-frame) falls in it,
 * and a hold creeping under ~0.25 px a frame at preview size lets x264's re-sharpened I-frame pop over the frames
 * around it (forensics spike). Never a growing scale: the browser re-draws promoted text sharper in one frame now and
 * then under one. The fact under the lockup drifts at END_PART of it (two planes parting while the lockup is read). */
export const END_DRIFT = 0.5;
export const END_PART = 0.55;
export const endSway = (F: number) => holdDrift(F, ACT.end.from, { px: END_DRIFT }).x - holdDrift((ACT.end.from + TOTAL) / 2, ACT.end.from, { px: END_DRIFT }).x;

/**
 * The last picture leaving behind the lockup: it does not vanish with the element's take-off (12 f) but falls back
 * into the room over about a second, shrinking a few percent and going soft, so the product is still on screen while
 * the mark lands and the name arrives (the end never takes the product off screen early).
 */
const RECEDE = { from: -12, dur: 52, scale: 0.075, blur: 18 } as const;
const recedeAt = (F: number): SeamLayer | null => {
  const u = clamp((F - (ACT.end.from + f60x(RECEDE.from))) / f60x(RECEDE.dur));
  if (u >= 1) return null;
  // focus leaves it first (the eye goes to the element taking off), then it dims and falls back
  return { show: true, x: 0, y: 26 * u * u, scale: 1 - RECEDE.scale * E.stdInOut(u), opacity: 1 - E.stdInOut(u), blur: RECEDE.blur * Math.sqrt(u), smear: 0, ink: 1 };
};

/** The centred lockup: the mark, the name sliding out beside it, the one fact under them, held on a slow drift. */
const EndCard: React.FC<{ F: number }> = ({ F }) => {
  const L = lockLayout();
  const inks = inksAt(F);
  const fact = copy('close');
  const sway = endSway(F);
  // the element lands as the mark first; the drawn mark takes over once it is whole (opacity, never by mounting)
  const markOn = F >= ACT.end.from + f60x(18) ? 1 : 0;
  // the name slides out from behind the mark toward its place, the lockup re-centring as it does (M.lockup)
  const n = prog(F, CUE.name, CUE.lockup, E.glideOut);
  const shiftX = ((1 - n) * (L.gap + L.wName)) / 2; // before the name: the mark alone sits at the centre
  const named = F >= CUE.name ? 1 : 0;
  const factIn = E.snapOut(clamp((F - fact.in) / f60x(22)));
  const markNode = LOGO_STANDIN && HERO_MARK ? (
    <HERO_MARK id="lockup" size={L.markH} color={markColor(inks)} />
  ) : LOGO_STANDIN ? (
    <LetterMark size={L.markH} inks={inks} sheen={sway * 0.8} />
  ) : LOGO_RASTER ? (
    <Img src={staticFile(LOGO_RASTER)} style={{ position: 'absolute', left: 0, top: 0, width: L.markH, height: L.markH, objectFit: 'contain' }} />
  ) : (
    <LogoMark logo={LOGO} size={L.markH} fill={() => (inks.type === C.white ? C.white : undefined)} />
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${(L.cy + LOCK.below * U * 0.4).toFixed(1)}px`, transform: `translate3d(${sway.toFixed(3)}px, 0, 0)` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: L.markH, height: L.markH, opacity: markOn, transform: `translate3d(${(L.mark.x + shiftX).toFixed(3)}px, ${L.mark.y.toFixed(3)}px, 0)` }}>
        {markNode}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: named, clipPath: `inset(0px 0px 0px ${(L.mark.x + shiftX + L.markH + L.gap * 0.5).toFixed(2)}px)` }}>
        <Text id="wordmark" x={L.left + L.markH + L.gap + shiftX - (1 - n) * L.wName * 0.5} y={L.cy - L.size * 0.52} style={{ fontFamily: FONT.text, fontSize: L.size, fontWeight: WORDMARK_TYPE.weight, letterSpacing: `${WORDMARK_TYPE.track}em`, lineHeight: 1, color: inks.type, opacity: mix(0.45, 1, n) }}>
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
        <LogoMark logo={LOGO} size={L.markH} fill={() => (inks.type === C.white ? C.white : undefined)} />
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
/** Whether the claim sits on the colour field: a family without an event of its own and a scene before it with a `field`. */
export const FIELD_ON = FAMILY !== 'whiteBand' && FAMILY !== 'lightDark' && CLAIM_BEAT > 0 && !LAUNCH.pairs[LAUNCH.pairs.length - 1].over && !!fieldDef()?.field;
/**
 * The field: the accent (or the element's own colour) lit from its top left corner (a lit field, never a flat slab,
 * never a glow behind the line); the claim in white on it, a key word in the ground's deep tone. `grow`: frames (f@60)
 * the element takes to become the frame, into the seam's cut; `life`: the claim's drift and creep on the field (x the
 * house: white on a mid tone needs more travel to read alive); `key`: where the field's light sits (shares of the
 * frame: at its top left corner, so the brightest part is the edge); `reach`: how far the field runs past the frame's
 * right edge, so a moving exit never shows its edge (the carried cut then reads the line's own speed, as on the ground).
 */
export const FIELD = { grow: 16, light: 0.2, life: 2, key: [0.04, 0.02] as const, reach: 0.3 } as const;
const fieldColour = () => fieldDef()?.field?.().color ?? C.accent;
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
  const box = fieldDef()?.field?.();
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

/** One element on the stage: a line, a scene or the end card, each with its own key (its layer lives as long as it shows). */
type Item = { key: string; z: number; node: React.ReactNode };

/** The elements beat `i` shows at frame F, at rest (the seam moves them). */
const itemsOf = (i: number, F: number, o: { lineOnly?: boolean } = {}): Item[] => {
  const b = BEAT_PLAN[i];
  if (!b) return [];
  // the lockup only drifts sideways: its text is drawn in place every frame (unpromoted text moves sub-pixel sideways),
  // never a promoted layer the browser re-draws now and then over a long hold
  if (b.kind === 'end') return [{ key: 'end', z: 1000, node: <PromoteCtx.Provider value={false}><EndCard F={F} /></PromoteCtx.Provider> }];
  const scene: Item = { key: `scene${b.pair}`, z: b.pair * 10 + 1, node: <Scene pair={b.pair} F={F} /> };
  if (b.kind === 'A') return [scene];
  const inks = inksAt(F);
  const flood = COLOUR.find((c) => c.id === 'band-flood' && F >= c.from && F < c.to);
  const onField = FIELD_ON && i === CLAIM_BEAT && b.kind === 'T';
  const lineInks = onField ? fieldInks(inks) : flood && inks.onField ? { ...inks, type: inks.onField, accent: inks.onField } : inks;
  const line: Item = { key: `line${b.pair}`, z: b.pair * 10 + 2, node: <Line id={b.id} raw={LAUNCH.pairs[b.pair - 1].line} F={F} inks={lineInks} life={onField ? FIELD.life : 1} /> };
  const field: Item[] = onField ? [{ key: 'field', z: b.pair * 10, node: <FieldPlate /> }] : [];
  return b.kind === 'TA' && !o.lineOnly ? [...field, scene, line] : [...field, line];
};

/** The band flood of the white-with-a-band family: 0..1 over its colour event, rising and falling in 18 f. */
const floodAt = (F: number) => {
  const c = COLOUR.find((x) => x.id === 'band-flood');
  if (!c) return 0;
  return Math.min(prog(F, c.from - f60x(14), c.from + f60x(4), E.glideOut), 1 - prog(F, c.to - f60x(16), c.to, E.softIn));
};

/** The stage at the absolute frame F: the ground is drawn under it (Ground); here, the beat, or the seam between two. */
export const Stage: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const i = beatAt(F);
  const b = BEAT_PLAN[i];
  const next = BEAT_PLAN[i + 1];
  const inS = seamFor(b.from);
  const outS = next ? seamFor(next.from) : undefined;
  const s = inS && F < seamSpan(inS, film)[1] ? inS : outS && F >= seamSpan(outS, film)[0] ? outS : undefined;
  const centre = `${W / 2}px ${H / 2}px`;
  const layers: { item: Item; st?: SeamLayer; origin?: string }[] = [];
  let element: React.ReactNode = null;
  let grow: React.ReactNode = null;
  if (!s) {
    for (const it of itemsOf(i, F)) layers.push({ item: it });
    // the last picture falls back behind the lockup for a second after the element's take-off
    const r = b.kind === 'end' ? recedeAt(F) : null;
    if (r) for (const it of itemsOf(i - 1, F)) layers.push({ item: it, st: r });
  } else {
    const opts: SeamOpts = { recipe: s.recipe, at: s.at, dir: s.dir, id: s.id };
    let toBox: { x: number; y: number; w: number; h: number } | undefined;
    if (s.recipe === 'sharedElement') {
      // the element leaves from where the hero stands on screen at the cut (the picture's camera applied) and lands
      // where the mark stands alone, centred, before the name slides out beside it
      const L = lockLayout();
      const hb = heroBox();
      const c = camOf(LAUNCH.pairs.length, s.at - 1);
      toBox = { ...L.mark, x: L.mark.x + (L.gap + L.wName) / 2 + endSway(F) };
      Object.assign(opts, { fromBox: { x: c.ox + (hb.x - c.ox) * c.scale + c.dx, y: c.oy + (hb.y - c.oy) * c.scale + c.dy, w: hb.w * c.scale, h: hb.h * c.scale }, toBox });
    }
    // into the claim's field: the seam pushes into the element the field grows out of (its centre holds its place)
    const intoField = FIELD_ON && s.to === CLAIM_BEAT;
    const fb = intoField ? fieldBoxOnScreen(Math.min(F, s.at - 1)) : null;
    const st = seamState(F, opts, film);
    // an exit and enter fades its outgoing shot a touch faster than it moves: the last frames of the exit's
    // acceleration are already invisible, so no move stops dead where the layer leaves
    if (s.recipe === 'exitEnter') st.out.opacity *= st.out.opacity;
    // the last picture recedes behind the lockup instead of leaving with the element's take-off
    if (s.recipe === 'sharedElement') Object.assign(st.out, recedeAt(F) ?? { show: false });
    const outOrigin = fb ? `${(fb.x + fb.w / 2).toFixed(2)}px ${(fb.y + fb.h / 2).toFixed(2)}px` : centre;
    // a line over a picture leaves on its own: the picture under it plays on at rest
    const over = BEAT_PLAN[s.from]?.kind === 'TA' && BEAT_PLAN[s.to]?.kind === 'A';
    if (over) {
      for (const it of itemsOf(s.to, F)) layers.push({ item: it });
      if (st.out.show) for (const it of itemsOf(s.from, F, { lineOnly: true })) layers.push({ item: it, st: st.out });
    } else {
      if (st.out.show) for (const it of itemsOf(s.from, F)) layers.push({ item: it, st: st.out, origin: outOrigin });
      if (st.in.show) for (const it of itemsOf(s.to, F)) layers.push({ item: it, st: st.in });
    }
    if (fb && F < s.at) {
      // the element grows into the frame ahead of the push (log size, centre to the frame's, corners to square), on
      // top of the outgoing picture, its words fading under its colour in the first frames; whole on the cut's frame
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
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {layers.map(({ item, st, origin }) => (
        // both sides of a seam are in flight: the layout audit holds them to no resting rule (safe zone, widths)
        <div key={item.key} data-audit-push={st ? 'moving' : undefined} style={{ position: 'absolute', inset: 0, zIndex: item.z }}>
          <Layer s={st} origin={origin ?? centre} z={item.z}>{item.node}</Layer>
        </div>
      ))}
      {grow}
      {element}
    </div>
  );
};

/**
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
export const KEY_LIGHT = { angle: -9, sway: 2.5, lag: 0.45, drift: 0.02, period: 13, lift: { dark: 0.06, light: 0.65 }, opacity: { dark: 0.55, light: 0.65 }, far: { dark: 0.85, light: 0.5 } } as const;

const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0 };
const at = (x: number, y: number) => `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

/**
 * The ground under every act, never cut and never on the float (the content drifts over it): the dealt family's field,
 * its key light from above and the bottom corners falling off (KEY_LIGHT). The film's colour event is the claim's field
 * (drawn by the stage on the claim's beat), not a change of the light.
 */
export const Ground: React.FC<{ F: number }> = ({ F }) => {
  const inks = inksAt(F);
  const K = KEY_LIGHT;
  const dark = inks.dark;
  // the key: a plate from above, lagging the float, swaying on its own slow loop
  const t = F / FPS;
  const ph = (SEED % 89) / 89;
  const fl = floatAt(F, FLOAT);
  const res = Math.round(W * 0.3);
  const top = dark ? mixColor(mixColor(inks.ground, inks.accent, 0.45), C.white, K.lift.dark) : C.white;
  const key = bakePlate('linear', [{ at: 0, color: top, alpha: 1 }, { at: 0.22, color: top, alpha: 0.62 }, { at: 0.48, color: top, alpha: 0.22 }, { at: 0.7, color: top, alpha: 0 }, { at: 1, color: top, alpha: 0 }], res, res, { vertical: true, seed: 13 });
  const KW = W * 1.5;
  const KH = H * 1.5;
  const rot = K.angle + K.sway * Math.sin(2 * Math.PI * (t / K.period + ph));
  const kx = (W - KW) / 2 + K.lag * fl.x;
  const ky = -H * 0.12 + K.lag * fl.y + H * K.drift * Math.sin(2 * Math.PI * (t / (K.period * 1.3) + ph + 0.27));
  // the bottom corners: the family's far tone falling in (the right one deeper)
  const farTone = dark ? inks.far : mixColor(inks.ground, inks.type, 0.07);
  const far = bakePlate('radial', [{ at: 0, color: farTone, alpha: 1 }, { at: 0.45, color: farTone, alpha: 0.62 }, { at: 1, color: farTone, alpha: 0 }], res, res, { seed: 19 });
  const RF = W * 1.2;
  const fx = W * 1.02 - 0.2 * K.lag * fl.x;
  const fy = H * 1.12;
  const gx = -W * 0.04 - 0.2 * K.lag * fl.x;
  return (
    <>
      <FamilyGround family={FAMILY} frame={F} dark={F >= DARK_FROM} flood={floodAt(F)} seed={SEED} />
      <Img src={far} style={{ ...abs, width: RF, height: RF, opacity: dark ? K.far.dark : K.far.light, transform: at(fx - RF / 2, fy - RF / 2) }} />
      <Img src={far} style={{ ...abs, width: RF * 0.8, height: RF * 0.8, opacity: (dark ? K.far.dark : K.far.light) * 0.7, transform: at(gx - RF * 0.4, fy - RF * 0.4) }} />
      <Img src={key} style={{ ...abs, width: KW, height: KH, opacity: dark ? K.opacity.dark : K.opacity.light, transformOrigin: '50% 0%', transform: `${at(kx, ky)} rotate(${rot.toFixed(3)}deg)` }} />
    </>
  );
};

/** The film's page colour (Film.tsx, Root.tsx). */
export const PAGE = { ground: familyInks(FAMILY).ground };

/** One act: a window on the stage (its own composition in Root.tsx). */
export const actOf = (name: string): React.FC => {
  const A: React.FC = () => {
    const F = useAbs(name);
    return <Stage F={F} />;
  };
  A.displayName = `Act_${name}`;
  return A;
};
