// What every act of the explainer shares: the page (a tinted paper lit by the film's one light: a lit ground per act,
// dealt so no ground holds more than two shots, with one light event per act a second after its cut), the type in
// ink and the accent only on the mark, the band and the product; the absolute frame; the sentence role (small and
// airy); the mark drawn as a word; the crisp entry for hero lines; placement helpers. Retell it in the dealt
// direction's world (out/DIRECTION.md): its ground and type replace this floor; the product's own screens and marks
// replace the kit's.
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { bakePlate } from '../fx/Gradients';
import { dealGrounds, type GroundSpec, LitGround as Ground } from '../fx/Grounds';
import { shadowTone } from '../fx/KeyLight';
import { checkFilmEmphasis, type EmphasisName, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { crispWords } from '../fx/TypePresets';
import { kitTheme } from '../kit';
import { clamp, E, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { FILM_LIGHT, keyDir } from '../lib/light';
import { fitSize, measureTracked } from '../lib/measure';
import { SEED } from '../deal';
import { EXPLAIN } from '../explain';

/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/** The film's signature, if it has one: a box, marker or underline on ONE line ({ id: 'pain', device: 'under' }). */
export const EMPH_SIGNATURE: { id: string; device: EmphasisName } | undefined = undefined;
/**
 * The film's emphasis (fx/TypeEmphasis filmEmphasis): its one kind on at most 60 % of the lines set on a TypeLine, the
 * lines explain.ts names `keys` for first (from the last line back), on those words; every other line plain. The close
 * beside the name is placed by its width (a size kind plays as accent on it).
 */
export const EMPH = filmEmphasis(['what', 'pain', 'close'], { kind: EMPH_KIND, keyed: ['what', 'pain', 'close'].filter((id) => (EXPLAIN.keys as Record<string, string | undefined>)[id]), fixed: ['close'], signature: EMPH_SIGNATURE });
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH);
/** A line's key words from explain.ts `keys`, found in its text. */
export const keysFor = (id: string, text: string) => keysOf(text, (EXPLAIN.keys as Record<string, string | undefined>)[id]) ?? undefined;
import { type FloatOpts } from '../lib/drift';
import { ACT, type ActName, CUE, f60x, H, W } from '../timeline';

/**
 * The page: a tinted white, ink type, the one accent. The product's own stage is the mid stone, a deeper place in the
 * same light family (ink type reads on it), so the film never flips paper <-> slate: its one colour event is the
 * accent's (the end's claim), at most two a film.
 */
export const PAGE = kitTheme('tintedPaper', C.accent);
export const SHOT = kitTheme('stoneMid', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/**
 * The stage every act stands on (Film.tsx ActStage; lib/drift, fx/Float): the camera is still unless an act declares a
 * move (no float, no drift). The acts' own cameras make the moves, each from rest to rest; between them the picture
 * holds still while the product changes.
 */
export const FLOAT: FloatOpts = {};

/**
 * The page's grounds, one per act, dealt from the film's seed (fx/Grounds dealGrounds, the clean kinds): two paper
 * tones, each a flat field or a very subtle wash lit from the film's one key (you feel the key, you never see a glow),
 * never the same ground on more than two consecutive shots. No beams, no pools, no haze: the ground stays clean behind
 * the words. The product's act sits on the mid stone's key (fx/Grounds 'key': the key side lifted, the far side falling
 * deep) or on a plate of the film's own picture (PLATE_SRC): its own place, never a flat grey field. The grid of the
 * product's parts stands on the tilted tint (fx/Grounds 'tint'), the film's one colour ground.
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
  const list = dealGrounds(7, { bases: PAPERS, seed: SEED, lift: 0.06, hold: 0.25 });
  const acts: ActName[] = ['open', 'pain', 'promise', 'picture', 'system', 'grid', 'end'];
  const out = Object.fromEntries(acts.map((a, i) => [a, list[i]])) as Record<ActName, GroundSpec>;
  out.picture = { kind: PLATE_SRC ? 'plate' : 'key', src: plateSrc(), base: SHOT.ground, light: C.white, seed: SEED % 997 };
  // the parts round the mark stand on the film's one colour ground: the accent's tint along one tilted edge (fx/Grounds 'tint')
  out.grid = { ...out.grid, kind: 'tint' };
  return out;
})();

/**
 * A gradient baked as a dithered plate (fx/Gradients bakePlate: no 8-bit bands, unlike a CSS gradient), stretched over
 * w x h at (x, y) and turned `angle` degrees about its centre.
 */
export const Plate: React.FC<{ kind: 'linear' | 'radial'; stops: { at: number; color: string; alpha: number }[]; w: number; h: number; x?: number; y?: number; angle?: number; opacity?: number; seed?: number; opts?: { cx?: number; cy?: number; rx?: number; ry?: number } }> = ({ kind, stops, w, h, x = 0, y = 0, angle = 0, opacity = 1, seed = 5, opts }) => {
  const src = bakePlate(kind, stops, w * 0.5, h * 0.5, { seed, ...opts });
  if (!src || opacity <= 0.001) return null;
  return <Img src={src} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, transformOrigin: '50% 50%', transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(3)}deg)`, pointerEvents: 'none' }} />;
};

/**
 * cinetic:light the page sits by a window (the film's one key, lib/light FILM_LIGHT), and once per act a cloud
 * crosses it. The act's light event: a second after the cut (look-audit skips the second after a cut) the light on
 * the page changes once, over about 0.7 s, the far side falling into shade by a few percent, and stays there for the
 * rest of the act. On a dark ground the key side brightens instead. A dithered plate along the key, faded in by
 * opacity: a shade across the whole frame, never a pool, a glow or a haze behind the words.
 */
export const LightEvent: React.FC<{ F: number; act: ActName; dark?: boolean; at?: number; amount?: number; fade?: number }> = ({ F, act, dark = false, at, amount = 0.08, fade = 1 }) => {
  const a0 = at ?? CUE[`${act}Light`] ?? ACT[act].from + f60x(66); // the timeline puts it in the act's quietest stretch
  const p = prog(F, a0, a0 + f60x(44), E.softOut);
  if (p <= 0) return null;
  const [kx, ky] = keyDir(FILM_LIGHT);
  const angle = (Math.atan2(-ky, -kx) * 180) / Math.PI; // the plate runs from the key side to the far side
  const size = Math.hypot(W, H) * 1.04;
  const ink = dark ? C.white : shadowTone(PAGE.ground, 0.3);
  const stops = dark ? [{ at: 0, color: ink, alpha: 1 }, { at: 0.7, color: ink, alpha: 0 }] : [{ at: 0, color: ink, alpha: 0 }, { at: 0.45, color: ink, alpha: 0.6 }, { at: 1, color: ink, alpha: 1 }];
  return <Plate kind="linear" stops={stops} w={size} h={size} x={(W - size) / 2} y={(H - size) / 2} angle={angle} opacity={amount * clamp(p) * fade} seed={7} />;
};

/**
 * The act's ground: its lit place under the camera's drift, and its light event. `from`: an act entered through a morph
 * (the mark carried across) crossfades from the last act's ground over 30 f, so the place changes without a pop.
 */
export const ActGround: React.FC<{ F: number; act: ActName; from?: ActName; cam?: Parameters<typeof Ground>[0]['cam'] }> = ({ F, act, from, cam }) => {
  const fade = from ? prog(F, ACT[act].from, ACT[act].from + f60x(30), E.stdInOut) : 1;
  return (
    <>
      {from && fade < 1 && <Ground frame={F} spec={GROUNDS[from]} cam={cam} />}
      {from && fade < 1 && <LightEvent F={F} act={from} dark={SHOT.dark && GROUNDS[from].base === SHOT.ground} fade={1 - fade} />}
      <div style={{ position: 'absolute', inset: 0, opacity: fade }}>
        <Ground frame={F} spec={GROUNDS[act]} cam={cam} />
      </div>
      <LightEvent F={F} act={act} dark={SHOT.dark && GROUNDS[act].base === SHOT.ground} />
    </>
  );
};

/**
 * The sentence role: one short sentence on the page, set small and airy. It is the calm family's line (brand/tokens.ts
 * TYPE.line: 84 px, a cap 5-6 % of the frame height, a regular weight, the face's own letter fit, lead 1.2), never a
 * bold film's tight 120 px line and never tracked wide: the measured airiness is size, weight and white space. A
 * film that swaps the face keeps the line's widths by fitting its tracking (scripts/font-match.mjs).
 */
export const SENTENCE = TYPE.line;

/**
 * The size a sentence is set at: the role's size, smaller only when it would not fit `share` of the safe width (0.8:
 * a calm sentence stays under 75 % of the frame), never under 72 px (it must read at feed size). A line that would
 * need less is too long for this film: 3-5 words a line.
 */
export const SENTENCE_MIN = 72;
export const sentenceSize = (text: string, share = 0.8) =>
  Math.max(SENTENCE_MIN * U, Math.min(SENTENCE.size * U, fitSize(text, (W - 2 * SAFE.x) * share, SENTENCE.size * U, SENTENCE.weight, SENTENCE.track)));

/** CSS for the sentence role at a size. */
export const sentenceStyle = (size: number, color: string = PAGE.text): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: size,
  fontWeight: SENTENCE.weight,
  letterSpacing: `${SENTENCE.track}em`,
  lineHeight: SENTENCE.lead,
  whiteSpace: 'pre',
  color,
});

/** The width of a sentence (or part of one) at a size, its trailing tracking left out. */
export const sentenceWidth = (text: string, size: number) => measureTracked(text, size, SENTENCE.weight, SENTENCE.track, FONT.text, { trailing: false });

/** The cap height of the sentence role at a size (Inter, the house face, and its kin: about 0.727 em). */
export const capOf = (size: number) => size * 0.727;

/** The crisp entry of a hero line (fx/TypePresets crispWords): words rise 0.32 em and sharpen from an 8 px blur on E.out over 26 f. */
export const useCrisp = () => crispWords(useFilm());

/**
 * The product's mark set as a word: `size` is its height in px (about 1.3 cap heights inline, so it reads as one
 * word of the line), centred on (x, y). `s` and `rot` scale and turn it about its centre; `fill` draws it in one
 * colour (over a picture), else its own colours.
 */
export const MarkWord: React.FC<{ x: number; y: number; size: number; s?: number; rot?: number; o?: number; fill?: string; blur?: number }> = ({ x, y, size, s = 1, rot = 0, o = 1, fill, blur = 0 }) => (
  <div
    data-ui
    style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})` }}
  >
    <LogoMark logo={LOGO} size={size} fill={fill ? () => fill : undefined} />
  </div>
);

/** A layer scaled by `k` about the screen point (ox, oy) and moved by (dx, dy): the act's camera on its world. */
export const Cam: React.FC<{ k?: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ k = 1, ox = W / 2, oy = H / 2, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>{children}</div>
);

/** Absolutely placed content, its top-left at (x, y) px, by transform. */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`, ...style }}>{children}</div>
);
