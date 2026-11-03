// The film's lines of type: one clean line at a time, centred on a clean ground (the ground of the scene it leads into),
// every line on the film's one move (src/deal.ts LINES: build, open or snap from fx/TypePresets, each building centred,
// every word solid ink within a few frames), cut away on the grid as its scene begins.
//   HeroLine  one sentence on its move (fx/TypePresets TypeLine), centred on (x, y), at the dealt size (deal LINE_SIZE)
import React from 'react';
import { FONT, TYPE } from '../brand/tokens';
import { DEAL_SEED, LINE_IDS } from '../deal';
import { checkFilmEmphasis, type EmphasisName, type EmphasisSpec, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { checkSystems, filmSystems, type HeadlineSystem } from '../fx/TypeSystem';
import { emphasisFitSize, TypeLine, type TypeExit, type TypeLineSpec, type TypePresetName } from '../fx/TypePresets';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { UPDATE } from '../update';

/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/** The share of the change lines that take the emphasis: about one in two (the key words of the line that names the change most plainly). */
export const EMPH_SHARE = 0.5;
/** The film's signature, if it has one: a box, marker or underline on ONE line ({ id: 'change2', device: 'under' }). */
export const EMPH_SIGNATURE: { id: string; device: EmphasisName } | undefined = undefined;
/** The change lines this film has (one per change in update.ts). */
const IDS = LINE_IDS.slice(0, UPDATE.changes.length);
/** Every change line in the film's voice (one centred line on the dealt move). */
export const SYSTEMS: Record<string, HeadlineSystem> = filmSystems(IDS, DEAL_SEED, {});
/**
 * The film's emphasis (fx/TypeEmphasis filmEmphasis): its one kind on up to half the change lines, the lines that name a
 * `key` first; the name and the version take none.
 */
export const EMPH: Record<string, EmphasisName | false> = filmEmphasis([...IDS, 'wordmark', 'version'], { kind: EMPH_KIND, keyed: IDS.filter((_, i) => UPDATE.changes[i]?.key), none: ['wordmark', 'version'], signature: EMPH_SIGNATURE, share: EMPH_SHARE });
/** The film's systems and emphasis, checked: one voice on half the lines or more; one kind on up to 60 % of the lines. */
export const HEADLINE_CHECK = checkSystems(IDS.map((id) => SYSTEMS[id]), 'plain');
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH, ['wordmark', 'version']);
/** A change line's key words: change<n> is the n-th change. */
export const keyWords = (id: string, text: string) => {
  const n = /^change(\d+)$/.exec(id);
  return n ? (keysOf(text, UPDATE.changes[Number(n[1]) - 1]?.key) ?? undefined) : undefined;
};

export type LineProps = {
  id: string;
  text: string;
  at: number; // the move's first frame
  frame: number;
  move: TypePresetName;
  out?: number; // the exit's first frame
  exit?: TypeExit;
  x?: number; // the line's centre (default the frame's)
  y?: number;
  role?: keyof typeof TYPE;
  size?: number; // px (default the role's)
  color: string;
  accent?: string; // the moves that land in the accent cool from it to `color`
  mute?: string;
  emph?: EmphasisSpec; // the line's emphasis (default: the film's, EMPH)
  keys?: [number, number];
};

const specOf = (p: LineProps): TypeLineSpec => ({
  preset: p.move,
  text: p.text,
  at: p.at,
  out: p.out,
  exit: p.exit ?? 'cut',
  id: p.id,
  colors: { ink: p.color, accent: p.accent ?? p.color, mute: p.mute ?? p.color },
  emph: p.emph ?? EMPH[p.id],
  keys: p.keys ?? keyWords(p.id, p.text),
});

/** One line of the script on its dealt move, never wider than 84 % of the frame. */
export const HeroLine: React.FC<LineProps> = (p) => {
  const film = useFilm();
  if (p.frame < p.at) return null;
  const role = TYPE[p.role ?? 'line'];
  const spec = specOf(p);
  const u = Math.min(film.width, film.height) / 1080;
  const want = p.size ?? role.size * u;
  const fit = Math.min(want, (want * 0.84 * film.width) / Math.max(1, measureTracked(p.text, want, role.weight, role.track, FONT.text)));
  const size = emphasisFitSize(spec, fit, role.weight, role.track, FONT.text, p.role ?? 'line');
  return <TypeLine spec={spec} frame={p.frame} x={p.x} y={p.y} role={p.role ?? 'line'} size={size} />;
};
