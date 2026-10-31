// What every act of the demo shares: the cool page, the clean lit ground each shot stands on (dealt so no ground holds
// more than two shots, keyed to the film's one light: no pools, no haze), the absolute frame, the script's line on the
// film's dealt voice (a confident hero preset: never a half-faded word soup), the tools' tiles (their real marks), the
// mark, and placement helpers. Retell it in the dealt direction's world (out/DIRECTION.md): its ground and type replace
// this floor; the product's own screens replace the kit parts (Composer, Bubble, Notice, DenseScreen) the acts use.
import React from 'react';
import { staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { Defocus } from '../fx/Defocus';
import { dealGrounds, type GroundKind, groundKey, type GroundSpec, LitGround, placeGrounds } from '../fx/Grounds';
import { checkFilmEmphasis, type EmphasisName, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { emphasisFitSize, type TypeLineSpec, TypeLine } from '../fx/TypePresets';
import { AppIcon, hasLogo, kitTheme } from '../kit';
import type { InlineRef } from '../kit/inline';
import { E, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import type { Shot } from '../lib/camera';
import { fitSize, measureTracked } from '../lib/measure';
import { DEAL_SEED, VOICE_EXIT } from '../deal';
import { type FloatOpts } from '../lib/drift';
import { ACT, type ActName, copy, DEAL, f60x, H, TOTAL, W } from '../timeline';
import { RUN } from '../run';

/** The page: a cool tinted white (the stage the product's UI sits on). */
export const PAGE = kitTheme('tintedPaper', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/**
 * The stage every act stands on (Film.tsx ActStage; lib/drift, fx/Float): the camera is still unless an act declares a
 * move (no float, no drift). The acts' own cameras make the moves, each from rest to rest; between them the picture
 * holds still while the product changes.
 */
export const FLOAT: FloatOpts = {};

/**
 * The grounds, one per act: lit pages dealt from the film's seed over two page tones so no ground holds more than two
 * consecutive shots and the light comes from the film's one key. The product's shots (the pill, the run, the result)
 * stand on a place (placeGrounds): the key's lit sweep of the page (fx/Grounds 'key') or a plate of the film's own
 * picture (PLATE_SRC). Nothing glows behind the words or the product.
 */
/**
 * The film's own picture its product shots stand on (fx/Grounds 'plate': blurred 32 px, veiled toward the base, lit by
 * the key): a photo or a still of the film's footage under public/ (assets.mjs get + grade), as a staticFile path.
 * Unset, the product shots stand on the key's lit gradient (fx/Grounds 'key'). Never a flat grey field.
 */
export const PLATE_SRC: string | undefined = undefined;
const plateSrc = () => (PLATE_SRC ? staticFile(PLATE_SRC) : undefined);
const ORDER: ActName[] = ['pill', 'ask', 'click', 'run', 'done', 'end'];
const KINDS: GroundKind[] = ['wash', 'flat'];
export const GROUNDS: Record<ActName, GroundSpec> = (() => {
  const g = dealGrounds(ORDER.length, { bases: [PAGE.ground, mixColor(PAGE.ground, PAGE.well, 0.55)], kinds: KINDS, seed: DEAL_SEED % 100000 });
  // the request box stands on the film's one colour ground, the tilted tint (fx/Grounds 'tint'); the click is a punch
  // into the ask's own box: the same place across that cut
  g[1] = { ...g[1], kind: 'tint' };
  g[2] = g[1];
  const placed = placeGrounds(g, ORDER.map((a) => a === 'pill' || a === 'run' || a === 'done'), { src: plateSrc(), bases: [PAGE.ground, mixColor(PAGE.ground, PAGE.well, 0.55)] });
  return Object.fromEntries(placed.map((x, i) => [ORDER[i], x])) as Record<ActName, GroundSpec>;
})();

/**
 * An act's ground, riding the camera at the background's weight when the act passes its shot. `carry` names the act
 * before a seam the picture runs through (a morph, the stretch, a defocus): its ground hands over to this one over
 * `frames` 60 fps frames from the act's first frame, so no ground flips on a carried seam.
 */
export const Ground: React.FC<{ act: ActName; F: number; cam?: { shot: Shot; base: Shot }; carry?: { from: ActName; frames?: number } }> = ({ act, F, cam, carry }) => {
  const k = carry ? prog(F, ACT[act].from, ACT[act].from + f60x(carry.frames ?? 30), E.stdInOut) : 1;
  const same = carry && groundKey(GROUNDS[carry.from]) === groundKey(GROUNDS[act]);
  return (
    <>
      <LitGround frame={F} spec={GROUNDS[act]} cam={cam} />
      {carry && !same && k < 1 && <LitGround frame={F} spec={GROUNDS[carry.from]} cam={cam} style={{ opacity: 1 - k }} />}
    </>
  );
};

/** The script's line size: the line role at the film's frame, set smaller only to fit `share` of the safe width. */
export const lineSize = (text: string, share = 0.66) => Math.max(64 * U, Math.min(TYPE.line.size * U, fitSize(text, (W - 2 * SAFE.x) * share, TYPE.line.size * U, TYPE.line.weight, TYPE.line.track)));
export const lineWidth = (text: string, size: number, weight: number = TYPE.line.weight) => measureTracked(text, size, weight, TYPE.line.track, FONT.text, { trailing: false });

/** A script line's preset spec on the film's voice (DEAL.voice), leaving at speed on the voice's exit at its COPY out. */
/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/** The film's signature, if it has one: a box, marker or underline on ONE line ({ id: 'done', device: 'under' }). */
export const EMPH_SIGNATURE: { id: string; device: EmphasisName } | undefined = undefined;
/**
 * The film's emphasis (fx/TypeEmphasis filmEmphasis): its one kind on at most 60 % of the script lines, the lines run.ts
 * names `keys` for first (from the last line back), on those words; every other line plain. The pill's two labels and
 * the close are placed by a measured width (a size kind plays as accent on them).
 */
export const EMPH = filmEmphasis(Object.keys(RUN.lines), { kind: EMPH_KIND, keyed: Object.keys(RUN.lines).filter((id) => (RUN.keys as Record<string, string | undefined>)[id]), fixed: ['what', 'ask', 'close'], signature: EMPH_SIGNATURE });
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH);

export const voiceSpec = (id: string, colors?: TypeLineSpec['colors']): TypeLineSpec => {
  const c = copy(id);
  return { preset: DEAL.voice, text: c.text, at: c.in, ...(c.out < TOTAL ? { out: c.out, exit: VOICE_EXIT[DEAL.voice] } : {}), ...(DEAL.voice === 'land' ? { scaleFrom: 1.35 } : {}), colors: { ink: PAGE.text, mute: PAGE.mute, accent: PAGE.accent, ...colors }, id, emph: EMPH[id], keys: keysOf(c.text, (RUN.keys as Record<string, string | undefined>)[id]) ?? undefined };
};

/** A script line on the film's voice, its box centred on (x, y). */
export const Line: React.FC<{ id: string; F: number; x?: number; y: number; size?: number; weight?: number; colors?: TypeLineSpec['colors'] }> = ({ id, F, x = W / 2, y, size, weight = TYPE.line.weight, colors }) => {
  const c = copy(id);
  if (F < c.in - 1) return null;
  const spec = voiceSpec(id, colors);
  // a size device refits the line so it is no wider than the plain line at its size
  return <TypeLine spec={spec} frame={F} x={x} y={y} size={emphasisFitSize(spec, size ?? lineSize(c.text), weight, TYPE.line.track, FONT.text)} weight={weight} track={TYPE.line.track} />;
};

/** The tools as inline objects (their real marks, else their glyphs): what the dock and the slots show. */
export const toolRefs = (): InlineRef[] => RUN.tools.map((t) => (hasLogo(t.logo) ? (t.logo as string) : { kind: 'glyph' as const, name: t.glyph }));
/** The tools that have a real mark. */
export const toolMarks = () => RUN.tools.filter((t) => hasLogo(t.logo)).map((t) => t.logo as string);

/** One tool's app-icon tile: its real mark, or its glyph on the same tile. */
export const ToolTile: React.FC<{ i: number; size: number; lift?: number; tone?: 'light' | 'dark' }> = ({ i, size, lift = 18, tone = 'light' }) => {
  const t = RUN.tools[i % RUN.tools.length];
  return <AppIcon logo={hasLogo(t.logo) ? t.logo : undefined} glyph={t.glyph} size={size} theme={PAGE} tone={tone} lift={lift} />;
};

/** The mark at `size` px, centred on (x, y), scaled `s`, its parts posed by `poses`. */
export const MarkAt: React.FC<{ x: number; y: number; size: number; s?: number; o?: number; poses?: React.ComponentProps<typeof LogoMark>['poses'] }> = ({ x, y, size, s = 1, o = 1, poses }) => (
  <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) scale(${s.toFixed(5)})` }}>
    <LogoMark logo={LOGO} size={size} poses={poses} />
  </div>
);

/**
 * A soft seam without a stepped blur: the sharp layer and one copy at a fixed defocus cross-fade by `k` (0 sharp, 1
 * soft), so the picture goes soft (or comes back) on a continuous ramp, never a blur level switching on in one frame.
 */
export const SoftCut: React.FC<{ k: number; sigma?: number; children: React.ReactNode }> = ({ k, sigma = 9, children }) => (
  <>
    {k < 1 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - k }}>{children}</div>}
    {k > 0 && (
      // lint-ok: one layer and its own defocused copy (a rack of focus on the same picture), not a dissolve between shots
      <div data-audit-copy="" style={{ position: 'absolute', inset: 0, opacity: k }}>
        <Defocus sigma={sigma}>{children}</Defocus>
      </div>
    )}
  </>
);

/** The circ-out the measured moves use. */
export const circOut = (t: number) => Math.sqrt(1 - (1 - Math.min(1, Math.max(0, t))) ** 2);

export { H, W };
