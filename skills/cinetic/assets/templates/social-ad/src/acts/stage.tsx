// What every act of the ad shares: the page (a tinted white lit by the film's one key: a clean ground per act, dealt
// so no ground holds more than two shots, with one light event per act), the product's stage (the mid slate), the
// absolute frame, the ad's line (the film's type family's sentence line, the bold family by default: semibold, tight),
// the product's own content as tiles (ad.ts items first, then the products it works with as their real marks, then
// its own screen rows from ad.ts screen: counts and totals that add up), the mark, and placement helpers. Retell it in the dealt
// direction's world (out/DIRECTION.md): its ground and type replace this floor; the product's own screens, items and
// marks replace the kit's.
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { type StageSpec } from '../fx/Float';
import { bakePlate } from '../fx/Gradients';
import { dealGrounds, type GroundSpec, LitGround, placeGrounds } from '../fx/Grounds';
import { shadowTone } from '../fx/KeyLight';
import { type Pic, PhotoCard } from '../fx/Pictures';
import { ContentTile, filmWorld, kitTheme, logoName, type TileNode, worldNodes } from '../kit';
import { clamp, E, prog } from '../lib/anim';
import { carry, launch } from '../lib/handoff';
import { mixColor } from '../lib/color';
import { FILM_LIGHT, keyDir } from '../lib/light';
import { checkFilmEmphasis, type EmphasisName, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { fitSize, measureTracked } from '../lib/measure';
import { AD } from '../ad';
import { SEED } from '../deal';
import { type FloatOpts } from '../lib/drift';
import { ACT, type ActName, CUE, f60x, H, W } from '../timeline';

/** The page (a tinted white), and the product's stage (the mid slate: white type reads on it). */
export const PAGE = kitTheme('tintedPaper', C.accent);
export const SHOT = kitTheme('slateMid', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/** The world the product's screens and the rest of the tiles come from: the film's own rows (ad.ts screen). */
export const WORLD = filmWorld(AD.screen);

/**
 * The product's content as tile nodes, in the order every field draws them: the ad's own items (what people keep in
 * it), the products it really works with as their real marks (ad.ts integrations, scripts/logos.mjs), then the
 * screen's rows (ad.ts screen). Never a blank card.
 */
export const NODES: TileNode[] = [
  ...AD.items.map((it, i): TileNode => ({ label: it.label, sub: it.sub, glyph: it.glyph, preview: it.preview, logo: it.logo, seed: `${AD.name}:item${i}` })),
  ...AD.integrations.map((logo, i): TileNode => ({ logo, label: logoName(logo), sub: WORLD.records[i % WORLD.records.length]?.title, preview: 'list', seed: `${AD.name}:int${i}` })),
  ...worldNodes(WORLD, 24),
];
/** The i-th node, round the list. */
export const nodeAt = (i: number) => NODES[((i % NODES.length) + NODES.length) % NODES.length];

/**
 * One piece of the product's content at w x h: its content tile (kit ContentTile: its mark or glyph, its label, a
 * preview of what it holds), or, when its content is pictures (ad.ts pictures: real photographs), that photograph.
 */
/** The ad's photographs (ad.ts pictures) as fx/Pictures sources: a nominal 4:5 size, cover-fitted to each card. */
export const PICS: Pic[] = (AD.pictures as readonly string[]).map((p) => ({ src: staticFile(p), w: 1000, h: 1250 }));
export const Item: React.FC<{ i: number; w: number; h?: number; lift?: number; theme?: typeof PAGE }> = ({ i, w, h, lift = 16, theme = PAGE }) => {
  const hh = h ?? w;
  if (PICS.length)
    return (
      <div style={{ position: 'relative', width: w, height: hh }}>
        <PhotoCard photo={PICS[((i % PICS.length) + PICS.length) % PICS.length]} frame={0} x={w / 2} y={hh / 2} w={w} h={hh} shadow={Math.min(1, lift / 16)} />
      </div>
    );
  return <ContentTile node={nodeAt(i)} theme={theme} w={w} aspect={w / hh} lift={lift} />;
};

/**
 * The ad's line: the film's sentence line (brand/tokens TYPE.line: the bold family's 120 px semibold at -0.03 em by
 * default), smaller only when it would not fit `share` of the safe width, never under 72 px (it must read at feed size).
 */
export const LINE_MIN = 72;
export const lineSize = (text: string, share = 0.72) =>
  Math.max(LINE_MIN * U, Math.min(TYPE.line.size * U, fitSize(text, (W - 2 * SAFE.x) * share, TYPE.line.size * U, TYPE.line.weight, TYPE.line.track)));
export const lineStyle = (size: number, color: string = PAGE.text): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: size,
  fontWeight: TYPE.line.weight,
  letterSpacing: `${TYPE.line.track}em`,
  lineHeight: TYPE.line.lead,
  whiteSpace: 'pre',
  color,
});
export const lineWidth = (text: string, size: number) => measureTracked(text, size, TYPE.line.weight, TYPE.line.track, FONT.text, { trailing: false });
/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/**
 * The film's emphasis (fx/TypeEmphasis filmEmphasis): its one kind on at most 60 % of the lines, the lines ad.ts names
 * `keys` for first (from the last line back), on those words; every other line plain. The claim's last word stands on
 * the accent pill: that pill is the film's one signature (its pieces take no device), so no other line takes a box,
 * marker or underline. The label's last word swaps in a chip measured round it and the close sits under the lockup:
 * placed by a measured width (a size kind plays as accent on them).
 */
const EMPH_IDS = ['what', 'save', 'find', 'tag.1', 'tag.2', 'swap', 'close'];
export const EMPH = filmEmphasis(EMPH_IDS, { kind: EMPH_KIND, keyed: EMPH_IDS.filter((id) => (AD.keys as Record<string, string | undefined>)[id]), fixed: ['swap', 'close'], signature: { id: 'find', device: 'marker' } });
/** The pill is drawn by the claim itself (acts/Field): its TypeLine pieces take no device. */
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH);
/** A line's key words from ad.ts `keys`, found in its text. */
export const keysFor = (id: string, text: string) => keysOf(text, (AD.keys as Record<string, string | undefined>)[id]) ?? undefined;

/** The cap height of the line at a size (Inter and its kin: about 0.727 em). */
export const capOf = (size: number) => size * 0.727;

/** The mark at `size` px, centred on (x, y), turned `rot` deg and scaled `s` about its centre; `fill` draws it in one colour. */
export const MarkAt: React.FC<{ x: number; y: number; size: number; s?: number; rot?: number; o?: number; fill?: string }> = ({ x, y, size, s = 1, rot = 0, o = 1, fill }) => (
  <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})` }}>
    <LogoMark logo={LOGO} size={size} fill={fill ? () => fill : undefined} />
  </div>
);

/**
 * The grounds, one per act, dealt from the film's seed (fx/Grounds dealGrounds): two paper tones, each a flat field or
 * a very subtle wash lit from the film's one key, never the same ground on more than two consecutive shots. The
 * product's shots (the field of its content, the label over it) stand on a place (placeGrounds: the key's lit sweep of
 * the page, or a plate of the film's own picture, PLATE_SRC); the taglines' panel stands on the slate's key, the far
 * side falling deep. No beams, no pools, no haze.
 */
/**
 * The film's own picture its product shots stand on (fx/Grounds 'plate': blurred 32 px, veiled toward the base, lit by
 * the key): a photo or a still of the film's footage under public/ (assets.mjs get + grade), as a staticFile path.
 * Unset, the product shots stand on the key's lit gradient (fx/Grounds 'key'). Never a flat grey field.
 */
export const PLATE_SRC: string | undefined = undefined;
const plateSrc = () => (PLATE_SRC ? staticFile(PLATE_SRC) : undefined);
const PAPERS = [PAGE.ground, mixColor(PAGE.ground, PAGE.well, 0.6)];
export const GROUNDS: Record<ActName, GroundSpec> = (() => {
  const acts: ActName[] = ['open', 'brand', 'field', 'label', 'taglines', 'end'];
  const list = placeGrounds(dealGrounds(acts.length, { bases: PAPERS, seed: SEED, lift: 0.06, hold: 0.3 }), acts.map((a) => a === 'field' || a === 'label'), { src: plateSrc(), bases: PAPERS });
  return Object.fromEntries(acts.map((a, i) => [a, list[i]])) as Record<ActName, GroundSpec>;
})();
export const SLATE: GroundSpec = { kind: PLATE_SRC ? 'plate' : 'key', src: plateSrc(), base: SHOT.ground, light: C.white, seed: SEED % 991 };

/**
 * cinetic:light the page sits by a window (the film's one key, lib/light FILM_LIGHT), and once per act a cloud
 * crosses it: the act's light event, in the act's quietest stretch (timeline CUE `<act>Light`), the far side falling
 * into shade by a few percent over about 0.7 s (on a dark ground the key side brightens instead). A dithered plate
 * along the key over the whole frame, faded in by opacity: never a pool, a glow or a haze behind the words.
 */
export const LightEvent: React.FC<{ F: number; act: ActName; dark?: boolean; amount?: number }> = ({ F, act, dark = false, amount = 0.08 }) => {
  const a0 = CUE[`${act}Light`] ?? ACT[act].from + f60x(60);
  const p = prog(F, a0, a0 + f60x(44), E.softOut);
  if (p <= 0) return null;
  const [kx, ky] = keyDir(FILM_LIGHT);
  const angle = (Math.atan2(-ky, -kx) * 180) / Math.PI;
  const size = Math.hypot(W, H) * 1.04;
  const ink = dark ? C.white : shadowTone(PAGE.ground, 0.3);
  const stops = dark ? [{ at: 0, color: ink, alpha: 1 }, { at: 0.7, color: ink, alpha: 0 }] : [{ at: 0, color: ink, alpha: 0 }, { at: 0.45, color: ink, alpha: 0.6 }, { at: 1, color: ink, alpha: 1 }];
  const src = bakePlate('linear', stops, size * 0.5, size * 0.5, { seed: 7 });
  if (!src) return null;
  return <Img src={src} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: amount * clamp(p), transformOrigin: '50% 50%', transform: `translate(${((W - size) / 2).toFixed(2)}px, ${((H - size) / 2).toFixed(2)}px) rotate(${angle.toFixed(3)}deg)`, pointerEvents: 'none' }} />;
};

/**
 * The stage every act stands on (Film.tsx ActStage; lib/drift, fx/Float): the camera is still unless an act declares a
 * move (no float, no drift). The acts' own cameras make the moves, each from rest to rest; between them the picture
 * holds still while the product changes.
 */
export const FLOAT: FloatOpts = {};
/** How an act stands on the stage (fx/Float StageSpec): give an act `moves` (lib/drift stageMove) only for a move with a purpose. */
export const STAGE: Partial<Record<ActName, StageSpec>> = {};

/** The act's ground and its light event. */
export const ActGround: React.FC<{ F: number; act: ActName; spec?: GroundSpec }> = ({ F, act, spec }) => {
  const g = spec ?? GROUNDS[act];
  return (
    <>
      <LitGround frame={F} spec={g} />
      <LightEvent F={F} act={act} dark={g.base === SHOT.ground} />
    </>
  );
};

/**
 * The speed every carried seam hands across (px per 60 fps frame at 1080p) and the share the next shot opens with:
 * the outgoing shot launches into its last frame (lib/handoff launch: the house build, its fastest step on the cut),
 * the incoming one opens at SEAM.ratio of it and decays to rest (lib/handoff carry), so the cut carries one speed in
 * one direction.
 */
export const SEAM = { v: 24, rush: 40, ratio: 0.8 } as const;
/** A move launched into a cut: its offset from rest at frame F, growing to its whole travel on its last frame (the act's last). */
export const launchOffset = (F: number, last: number, vCut: number) => {
  const total = -launch(last - f60x(150), last, { vCut }).x;
  return launch(Math.min(F, last), last, { vCut }).x + total;
};
/** A move carried in from a cut: its offset from rest at frame F, from the act's first frame on, decaying to 0. */
export const carryOffset = (F: number, first: number, vCut: number, ratio: number = SEAM.ratio) => {
  const o = { vCut, ratio, residual: 0 };
  return carry(Math.max(F, first), first, o).x - carry(first + f60x(600), first, o).x;
};

/** The cubic-out and circ-out the ad's measured moves use, and a quad-in. */
export const cubicOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
export const circOut = (t: number) => Math.sqrt(1 - (1 - Math.min(1, Math.max(0, t))) ** 2);
export const quadIn = (t: number) => Math.min(1, Math.max(0, t)) ** 2;

export { H, W };
