// What every act of the teaser shares: the near-black stage, the clean lit ground each shot stands on (dealt so no
// ground holds more than two shots, keyed to the film's one light: no pools, no haze), the panels in that light, the
// absolute frame, the camera (one world layout per shot under lib/camera camPath, smeared by its own velocity only
// inside fast moves), the script's caption in screen space on the film's dealt voice (a confident hero preset), the
// mark, and placement helpers. Retell it in the dealt
// direction's world (out/DIRECTION.md): its grounds, light and type replace this floor; the product's own screens
// replace the kit parts the acts use.
import React from 'react';
import { staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, TYPE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { DirBlur } from '../fx/Defocus';
import { dealGrounds, type GroundKind, type GroundSpec, LitGround, placeGrounds } from '../fx/Grounds';
import { checkFilmEmphasis, type EmphasisName, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { emphasisFitSize, type TypeLineSpec, TypeLine } from '../fx/TypePresets';
import { kitTheme, shadeRgba } from '../kit';
import { camera, camera3d, type CamMove, camPath, camVel, type Shot } from '../lib/camera';
import { useFilm } from '../lib/film';
import { expoTail } from '../lib/handoff';
import { fitSize } from '../lib/measure';
import { DEAL_SEED, VOICE_EXIT } from '../deal';
import { type FloatOpts } from '../lib/drift';
import { ACT, type ActName, copy, DEAL, H, TOTAL, W } from '../timeline';
import { TEASER } from '../teaser';

/** The stage: a tinted near-black (never #000) and its glass, one accent. */
export const INK = kitTheme('inkStage', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/**
 * The stage every act stands on (Film.tsx ActStage; lib/drift, fx/Float): the camera is still unless an act declares a
 * move (no float, no drift). The acts' own cameras make the moves, each from rest to rest; between them the picture
 * holds still while the product changes.
 */
export const FLOAT: FloatOpts = {};

/** The resting shot: the world's centre framed at the screen's centre at x1. Every act's camera starts from it. */
export const BASE: Shot = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 };

/**
 * The grounds, one per act: lit places on the near-black, dealt from the film's seed over the stage's two darks so no
 * ground holds more than two consecutive shots, every shot on a place (placeGrounds): the key's lit gradient (fx/Grounds
 * 'key': the key side lifted, the far side falling to near black) or a plate of the film's own picture (PLATE_SRC),
 * never a flat charcoal field. No pools, bars or beams: nothing glows behind the words or the product unless the dealt
 * direction's place really has that light (then name its kinds here).
 */
/**
 * The film's own picture its product shots stand on (fx/Grounds 'plate': blurred 32 px, veiled toward the base, lit by
 * the key): a photo or a still of the film's footage under public/ (assets.mjs get + grade), as a staticFile path.
 * Unset, the product shots stand on the key's lit gradient (fx/Grounds 'key'). Never a flat grey field.
 */
export const PLATE_SRC: string | undefined = undefined;
const plateSrc = () => (PLATE_SRC ? staticFile(PLATE_SRC) : undefined);
const ORDER: ActName[] = ['input', 'launch', 'window', 'cards', 'page', 'stages', 'end'];
const KINDS: GroundKind[] = ['wash', 'flat'];
export const GROUNDS: Record<ActName, GroundSpec> = (() => {
  const g = dealGrounds(ORDER.length - 1, { bases: [INK.ground, INK.well], kinds: KINDS, seed: DEAL_SEED % 100000 });
  // the end stands in the stages' place (the seam between them runs through the picture, so the ground must not flip):
  // the stages take a ground of their own after the page, so that place holds two shots, never three
  const [page, stages] = [g[4], g[5]];
  if (stages.kind === page.kind && stages.base === page.base) g[5] = { ...stages, kind: KINDS.find((k) => k !== page.kind) as GroundKind };
  const placed = placeGrounds([...g, g[5]], ORDER.map(() => true), { src: plateSrc(), bases: [INK.ground, INK.well] });
  placed[6] = placed[5];
  return Object.fromEntries(placed.map((x, i) => [ORDER[i], x])) as Record<ActName, GroundSpec>;
})();

/** Glass on near-black: a vertical fill between two surface greys, a thin light rim and a dark drop. */
export const glass = (r: number): React.CSSProperties => ({
  borderRadius: r,
  background: `linear-gradient(180deg, ${INK.raised}, ${INK.surface})`,
  boxShadow: `inset 0 0 0 ${(1.5 * U).toFixed(2)}px ${INK.line}, 0 ${(24 * U).toFixed(0)}px ${(60 * U).toFixed(0)}px ${shadeRgba(INK, 0.6)}`,
});

/** The camera smear switches on only inside fast moves (px per film frame at 1080p): a slow push stays one sharp layer. */
export const SMEAR_FROM = 6;

/**
 * One shot: its lit ground (riding the camera at the background's weight) and the world (laid out in frame px at
 * left 0, top 0) under the camera path at frame F, smeared along the camera's own travel only while it moves faster
 * than SMEAR_FROM (a whip smears, a push stays crisp and never pops a resampled layer on). `depth` draws the world
 * with camera3d (layers placed at a depth parallax under the act's turn).
 */
export const World: React.FC<{ F: number; act: ActName; moves: readonly CamMove[]; base?: Shot; smear?: boolean; depth?: boolean; ground?: GroundSpec | false; children: React.ReactNode }> = ({ F, act, moves, base = BASE, smear = true, depth = false, ground, children }) => {
  const film = useFilm();
  const s = camPath(F, base, moves);
  const v = camVel(F, base, moves, undefined, film);
  const g = ground === false ? null : ground ?? GROUNDS[act];
  const inner = (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' }}>
      <div style={{ ...(depth ? camera3d(s) : camera(s)), width: W, height: H }}>{children}</div>
    </div>
  );
  const fast = smear && v.speed / U >= SMEAR_FROM;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' }}>
      {g && <LitGround frame={F} spec={g} cam={{ shot: s, base }} />}
      {fast ? (
        <DirBlur v={v.speed / U} angle={v.angle} shutter={360} id={`camera-${act}`}>
          {inner}
        </DirBlur>
      ) : (
        inner
      )}
    </div>
  );
};

/** A script line's preset spec on the film's voice (DEAL.voice), leaving at speed on the voice's exit at its COPY out. */
/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/** The film's signature, if it has one: a box, marker or underline on ONE line ({ id: 'build', device: 'marker' }). */
export const EMPH_SIGNATURE: { id: string; device: EmphasisName } | undefined = undefined;
const EMPH_IDS = Object.keys(TEASER.lines).filter((id) => id !== 'connect');
/**
 * The film's emphasis (fx/TypeEmphasis filmEmphasis): its one kind on at most 60 % of the script lines, the lines
 * teaser.ts names `keys` for first (from the last line back), on those words; every other line plain. The close under
 * the end mark is placed by a measured width; the connect line is an ObjectLine (its own entry).
 */
export const EMPH = filmEmphasis(EMPH_IDS, { kind: EMPH_KIND, keyed: EMPH_IDS.filter((id) => (TEASER.keys as Record<string, string | undefined>)[id]), fixed: ['close'], signature: EMPH_SIGNATURE });
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH);

export const voiceSpec = (id: string, colors?: TypeLineSpec['colors']): TypeLineSpec => {
  const c = copy(id);
  return { preset: DEAL.voice, text: c.text, at: c.in, ...(c.out < TOTAL ? { out: c.out, exit: VOICE_EXIT[DEAL.voice] } : {}), ...(DEAL.voice === 'land' ? { scaleFrom: 1.35 } : {}), colors: { ink: INK.text, mute: INK.mute, accent: INK.accent, ...colors }, id, emph: EMPH[id], keys: keysOf(c.text, (TEASER.keys as Record<string, string | undefined>)[id]) ?? undefined };
};

/** A script line's size: the line role at the film's frame (the bold family's 120 px), set smaller only to fit 70 % of the safe width, never under 72 px. */
export const lineSize = (text: string, share = 0.7) => Math.max(72 * U, Math.min(TYPE.line.size * U, fitSize(text, (W - 2 * SAFE.x) * share, TYPE.line.size * U, TYPE.line.weight, TYPE.line.track)));

/** The script's caption in screen space (the camera moves the world, not the words): the film's voice, white, centred on y. */
export const Caption: React.FC<{ id: string; F: number; y: number }> = ({ id, F, y }) => {
  const c = copy(id);
  if (F < c.in - 1 || F >= c.out + 60) return null;
  const spec = voiceSpec(id);
  // one centred line, fitted to the frame; a size device refits the line so it is no wider than the plain line at its size
  const size = emphasisFitSize(spec, lineSize(c.text), TYPE.line.weight, TYPE.line.track, FONT.text);
  return <TypeLine spec={spec} frame={F} x={W / 2} y={y} size={size} weight={TYPE.line.weight} track={TYPE.line.track} />;
};

/** The mark at `size` px, centred on (x, y), turned `rot` deg and scaled `s`. */
export const MarkAt: React.FC<{ x: number; y: number; size: number; s?: number; rot?: number; o?: number; poses?: React.ComponentProps<typeof LogoMark>['poses'] }> = ({ x, y, size, s = 1, rot = 0, o = 1, poses }) => (
  <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})` }}>
    <LogoMark logo={LOGO} size={size} poses={poses} fill={(part) => (part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? INK.text : undefined)} />
  </div>
);

/** The entrance that never stops (lib/handoff expoTail): an expo tail with a residual drift (px per 60 fps frame at 1080p). */
export const tail = (F: number, at: number, from: number, fps: number, drift = 0.06) => expoTail(F, at, from, { drift60: drift, u: U }, fps);
export const cubicOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
export const cubicIn = (t: number) => Math.min(1, Math.max(0, t)) ** 3;
export const circIn = (t: number) => 1 - Math.sqrt(1 - Math.min(1, Math.max(0, t)) ** 2);

export { FONT, H, W };
