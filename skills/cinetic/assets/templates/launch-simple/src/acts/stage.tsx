// The one stage every act draws: the dealt ground family under everything (never cut), the line in the dealt voice
// (acts/line.tsx), the product's scene, the seams between them (fx/Seam seamState, drawn by acts/layer.tsx) and the
// centred lockup built from the last picture. An act is a window on this one stage (acts are Sequences: each draws the
// absolute frame), so a seam that crosses an act line is the same picture on both sides. Every element (a line, a
// scene, the end card) keeps one layer for its whole life, so nothing is re-drawn in a new place for a frame. The
// product's scenes live in src/product.tsx, the words in src/launch.ts; this file rarely needs an edit.
import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { C, FONT, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
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
import { type FloatOpts, withLocks } from '../lib/drift';
import { LAUNCH } from '../launch';
import { DEAL, SEED } from '../deal';
import { SCENES } from '../product';
import { ACT, BEAT_PLAN, COLOUR, copy, CUE, DARK_FROM, f60x, FPS, H, PAIRS, SEAM_PLAN, TOTAL, W } from '../timeline';
import { Layer, PromoteCtx } from './layer';
import { Line, Text } from './line';
import { SceneCtx } from './ui';

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

export type SceneProps = { f: number; dur: number; hits: number[]; inks: FamilyInks; pair: number };
/**
 * A scene: its drawing; `hero`, the box of the element the end card is built from (the last scene) and its `fill`
 * ('accent', a colour, or the card surface by default); `focus`, the point the closer frame pushes in on (default: the
 * hero's centre, else the frame's): put the picture's own moment there.
 */
export type SceneDef = { draw: React.FC<SceneProps>; hero?: { x: number; y: number; w: number; h: number; radius: number; fill?: string }; focus?: { x: number; y: number } };
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
  const closer = cut !== undefined && F >= cut ? CLOSER : 1;
  // re-frames step back and forth (+1.5 %, -1.5 %, ...), so the frame never wanders off the product
  const steps = Object.keys(CUE).filter((n) => n.startsWith(`a${pair}m`)).reduce((m, n, j) => m + (j % 2 ? -0.75 : 0.75) * E.settleOut(clamp((F - CUE[n]) / f60x(34))), 0);
  const side = pair % 2 ? 1 : -1;
  const dx = DEAL.camera === 'drift' ? ((u - 0.5) * 0.015 * (dur / FPS) + 0.02 * steps) * W * side : 0;
  const dy = DEAL.camera === 'rise' ? -((u - 0.5) * 0.015 * (dur / FPS) + 0.02 * steps) * H : 0;
  const scale = closer;
  const ox = def?.focus?.x ?? (def?.hero ? def.hero.x + def.hero.w / 2 : W / 2);
  const oy = def?.focus?.y ?? (def?.hero ? def.hero.y + def.hero.h / 2 : H / 2);
  return { from, dur, dx, dy, scale, ox, oy, closer: closer > 1 };
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
      <SceneCtx.Provider value={{ f: F - c.from, dur: c.dur }}>
        <Draw f={F - c.from} dur={c.dur} hits={hits} inks={inksAt(F)} pair={pair} />
      </SceneCtx.Provider>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the end card

/** The lockup's sizes (px at 1080p): the name's size, the mark's height, the gap, the fact's size below. */
export const LOCK = { name: 150, mark: 132, gap: 0.36, fact: 50, below: 128 } as const;
const lockLayout = () => {
  const name = copy('wordmark').text;
  const size = LOCK.name * U;
  const markH = LOCK.mark * U;
  const gap = markH * LOCK.gap;
  const wName = measureTracked(name, size, TYPE.display.weight, TYPE.display.track, FONT.text, { trailing: false });
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

/** The end card's life on its hold: a sideways drift of 18 px a second, centred on the end act (the element lands on it).
 * Never a growing scale: the browser re-draws promoted text sharper in one frame now and then under one. */
export const endSway = (F: number) => holdDrift(F, ACT.end.from, { px: 0.3 }).x - holdDrift((ACT.end.from + TOTAL) / 2, ACT.end.from, { px: 0.3 }).x;

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
  const markNode = <LogoMark logo={LOGO} size={L.markH} fill={() => (inks.type === C.white ? C.white : undefined)} />;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${(L.cy + LOCK.below * U * 0.4).toFixed(1)}px`, transform: `translate3d(${sway.toFixed(3)}px, 0, 0)` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: L.markH, height: L.markH, opacity: markOn, transform: `translate3d(${(L.mark.x + shiftX).toFixed(3)}px, ${L.mark.y.toFixed(3)}px, 0)` }}>
        {markNode}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: named, clipPath: `inset(0px 0px 0px ${(L.mark.x + shiftX + L.markH + L.gap * 0.5).toFixed(2)}px)` }}>
        <Text id="wordmark" x={L.left + L.markH + L.gap + shiftX - (1 - n) * L.wName * 0.5} y={L.cy - L.size * 0.52} style={{ fontFamily: FONT.text, fontSize: L.size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, color: inks.type, opacity: mix(0.45, 1, n) }}>
          {L.name}
        </Text>
      </div>
      <Text id="close" x={0} y={L.cy + LOCK.below * U - LOCK.fact * U * 0.6 + (1 - factIn) * 18 * U} width={W} style={{ textAlign: 'center', fontFamily: FONT.text, fontSize: LOCK.fact * U, fontWeight: TYPE.caption.weight, letterSpacing: `${TYPE.caption.track}em`, lineHeight: 1.2, color: inks.mute, opacity: factIn }}>
        {fact.text}
      </Text>
    </div>
  );
};

/** The element that becomes the mark: the last picture's hero card, its size, radius and colour carried into the mark tile
 * (the badge: turning a little over a full turn as it goes, a spin blur on the fast frames). */
const Element: React.FC<{ F: number }> = ({ F }) => {
  const L = lockLayout();
  const inks = inksAt(F);
  const spin = DEAL.end === 'badge' ? spinInState(F, { at: ACT.end.from - Math.round(f60x(12)), room: 0, slide: 0, turns: 1.1 }, { fps: FPS, width: W, height: H }) : null;
  // it takes over from the hero card over 10 f (the card's content fading under it), never in one frame
  const take = prog(F, ACT.end.from - f60x(12), ACT.end.from - f60x(2), E.stdInOut);
  const t = prog(F, ACT.end.from - f60x(12), ACT.end.from + f60x(18), E.strongInOut);
  const glyph = prog(F, ACT.end.from - f60x(4), ACT.end.from + f60x(16), E.stdInOut);
  const tile = (
    <div style={{ position: 'absolute', inset: 0, opacity: take, borderRadius: mix(heroBox().radius, L.markH * 0.24, t), background: mixColor(heroFill(inks), inks.ground, t), boxShadow: inks.dark ? 'none' : `0 ${(18 * (1 - t)).toFixed(1)}px ${(48 * (1 - t)).toFixed(1)}px rgba(0, 0, 0, ${(0.1 * (1 - t)).toFixed(3)})` }}>
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
  const lineInks = flood && inks.onField ? { ...inks, type: inks.onField, accent: inks.onField } : inks;
  const line: Item = { key: `line${b.pair}`, z: b.pair * 10 + 2, node: <Line id={b.id} raw={LAUNCH.pairs[b.pair - 1].line} F={F} inks={lineInks} /> };
  return b.kind === 'TA' && !o.lineOnly ? [scene, line] : [line];
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
  const origin = `${W / 2}px ${H / 2}px`;
  const layers: { item: Item; st?: ReturnType<typeof seamState>['out'] }[] = [];
  let element: React.ReactNode = null;
  if (!s) {
    for (const it of itemsOf(i, F)) layers.push({ item: it });
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
    const st = seamState(F, opts, film);
    // an exit and enter fades its outgoing shot a touch faster than it moves: the last frames of the exit's
    // acceleration are already invisible, so no move stops dead where the layer leaves
    if (s.recipe === 'exitEnter') st.out.opacity *= st.out.opacity;
    // a line over a picture leaves on its own: the picture under it plays on at rest
    const over = BEAT_PLAN[s.from]?.kind === 'TA' && BEAT_PLAN[s.to]?.kind === 'A';
    if (over) {
      for (const it of itemsOf(s.to, F)) layers.push({ item: it });
      if (st.out.show) for (const it of itemsOf(s.from, F, { lineOnly: true })) layers.push({ item: it, st: st.out });
    } else {
      if (st.out.show) for (const it of itemsOf(s.from, F)) layers.push({ item: it, st: st.out });
      if (st.in.show) for (const it of itemsOf(s.to, F)) layers.push({ item: it, st: st.in });
    }
    if (s.recipe === 'sharedElement' && st.box && toBox) {
      // laid out at its incoming size, placed and scaled by transform (never by left/top: no pixel stairs)
      element = (
        <div key="element" style={{ position: 'absolute', left: 0, top: 0, width: toBox.w, height: toBox.h, zIndex: 1001, transformOrigin: '0 0', transform: `translate3d(${st.box.x.toFixed(3)}px, ${st.box.y.toFixed(3)}px, 0) scale(${(st.box.w / toBox.w).toFixed(5)}, ${(st.box.h / toBox.h).toFixed(5)})` }}>
          <Element F={F} />
        </div>
      );
    }
  }
  layers.sort((p, q) => p.item.z - q.item.z);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {layers.map(({ item, st }) => (
        // both sides of a seam are in flight: the layout audit holds them to no resting rule (safe zone, widths)
        <div key={item.key} data-audit-push={st ? 'moving' : undefined} style={{ position: 'absolute', inset: 0, zIndex: item.z }}>
          <Layer s={st} origin={origin} z={item.z}>{item.node}</Layer>
        </div>
      ))}
      {element}
    </div>
  );
};

/**
 * The ground under every act, never cut and never on the float (the content drifts over it), and the end's light
 * event: as the name slides out the light on the ground changes once, over 0.7 s, and stays (a dark ground brightens
 * along the key, a light one lets its far side fall a few percent into shade): a plate across the frame, never a pool.
 */
export const Ground: React.FC<{ F: number }> = ({ F }) => {
  const inks = inksAt(F);
  const p = prog(F, CUE.name - f60x(10), CUE.name + f60x(34), E.softOut);
  const size = Math.hypot(W, H) * 1.06;
  const ink = inks.dark ? C.white : inks.type;
  const plate = bakePlate('linear', inks.dark ? [{ at: 0, color: ink, alpha: 1 }, { at: 0.75, color: ink, alpha: 0 }] : [{ at: 0, color: ink, alpha: 0 }, { at: 0.5, color: ink, alpha: 0.5 }, { at: 1, color: ink, alpha: 1 }], size * 0.5, size * 0.5, { seed: 7 });
  return (
    <>
      <FamilyGround family={FAMILY} frame={F} dark={F >= DARK_FROM} flood={floodAt(F)} seed={SEED} />
      <Img src={plate} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: (inks.dark ? 0.09 : 0.07) * p, transformOrigin: '50% 50%', transform: `translate(${((W - size) / 2).toFixed(2)}px, ${((H - size) / 2).toFixed(2)}px) rotate(-62deg)` }} />
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
