// The film's lines of type: one clean line at a time, centred and big on a clean ground (the ground of the scene it leads
// into), every line on the film's one move (src/deal.ts LINES): it arrives WHOLE or in 2-3 phrase chunks, never word by
// word, and is read within its card's 1.2 s; cut away on the grid as its scene begins.
//   LineText  one sentence on its move (whole: a focus pull; chunks: 2-3 phrases rising out of their masks; track: whole
//             as its tracking closes), centred on (x, y), at the dealt size (deal LINE_SIZE: a cap of 8 % of the frame's
//             height), breaking onto two lines before it would shrink under LINE_MIN; its key words in the accent
import React from 'react';
import { FONT, TYPE } from '../brand/tokens';
import { chunkCount, DEAL_SEED, LINE_IDS, LINE_MIN, type Move } from '../deal';
import { checkFilmEmphasis, type EmphasisName, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { checkSystems, filmSystems, type HeadlineSystem } from '../fx/TypeSystem';
import { clamp, E } from '../lib/anim';
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
/** A change line's key words (word indices, first and last): change<n> is the n-th change. */
export const keyWords = (id: string, text: string): [number, number] | undefined => {
  const n = /^change(\d+)$/.exec(id);
  return n ? (keysOf(text, UPDATE.changes[Number(n[1]) - 1]?.key) ?? undefined) : undefined;
};

/** The phrases a line arrives in: chunkCount(n) runs of words, as even as the words allow, the key words kept together. */
export const chunksOf = (words: string[], keys?: [number, number]): number[] => {
  const n = words.length;
  const k = chunkCount(n);
  const starts = Array.from({ length: k }, (_, j) => Math.round((j * n) / k));
  // a phrase never splits the key words: the break before them moves to their first word
  if (keys && k > 1) for (let j = 1; j < k; j++) if (starts[j] > keys[0] && starts[j] <= keys[1]) starts[j] = keys[0] > starts[j - 1] ? keys[0] : keys[1] + 1;
  return words.map((_, i) => starts.filter((s0) => s0 <= i).length - 1);
};

export type LineProps = {
  id: string;
  text: string;
  at: number; // the move's first frame
  resolved: number; // the frame the whole line is read (the plan's): the move fits inside it
  frame: number;
  move: Move;
  x?: number; // the line's centre (default the frame's)
  y?: number;
  role?: keyof typeof TYPE;
  size?: number; // px (default the role's)
  color: string;
  accent?: string; // the key words' colour
  emph?: EmphasisName | false; // the line's emphasis (default: the film's, EMPH)
  keys?: [number, number];
};

/** The rows a line is set on at a size: one, or two balanced rows when one would not fit `maxW`. Browser. */
const rowsOf = (words: string[], size: number, weight: number, track: number, maxW: number): string[][] => {
  const w = (ws: string[]) => measureTracked(ws.join(' '), size, weight, track, FONT.text);
  if (w(words) <= maxW || words.length < 2) return [words];
  let best = 1;
  let score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const s = Math.max(w(words.slice(0, i)), w(words.slice(i)));
    if (s < score) {
      score = s;
      best = i;
    }
  }
  return [words.slice(0, best), words.slice(best)];
};

/**
 * One line of the script on its dealt move, centred, at the dealt size; never wider than 84 % of the frame: it breaks
 * onto two rows before it would shrink under LINE_MIN (a cap of 6.5 % of the frame's height).
 */
export const LineText: React.FC<LineProps> = (p) => {
  const film = useFilm();
  if (p.frame < p.at) return null;
  const role = TYPE[p.role ?? 'line'];
  const u = Math.min(film.width, film.height) / 1080;
  const want = p.size ?? role.size * u;
  const maxW = 0.84 * film.width;
  const words = p.text.split(/\s+/).filter(Boolean);
  const floor = Math.min(want, LINE_MIN * u);
  const one = measureTracked(p.text, want, role.weight, role.track, FONT.text);
  const fitOne = Math.min(want, (want * maxW) / Math.max(1, one));
  const rows = fitOne >= floor ? [words] : rowsOf(words, want, role.weight, role.track, maxW);
  const widest = Math.max(...rows.map((r) => measureTracked(r.join(' '), want, role.weight, role.track, FONT.text)));
  const size = Math.min(want, (want * maxW) / Math.max(1, widest));
  const lead = 1.06;
  const cx = p.x ?? film.width / 2;
  const cy = p.y ?? film.height / 2;
  const emph = p.emph ?? EMPH[p.id];
  const keys = emph ? (p.keys ?? keyWords(p.id, p.text)) : undefined;
  const chunk = chunksOf(words, keys);
  const k = Math.max(...chunk) + 1;
  // the move fits inside the plan's read: each chunk's own entry, the chunks spread over what is left
  const span = Math.max(1, p.resolved - p.at);
  const entry = p.move === 'chunks' ? Math.min(span, Math.max(4, Math.round(span * (k > 1 ? 0.55 : 1)))) : span;
  const gap = k > 1 && p.move === 'chunks' ? (span - entry) / (k - 1) : 0;
  const t = p.frame - p.at;
  const whole = E.snapOut(clamp(t / span));
  let wi = 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          transform: `translate(-50%, -50%)${p.move === 'whole' ? ` scale(${(1 + 0.045 * (1 - whole)).toFixed(4)})` : ''}`,
          filter: p.move !== 'chunks' && whole < 0.999 ? `blur(${((p.move === 'whole' ? 10 : 5) * u * (1 - whole)).toFixed(2)}px)` : undefined,
          opacity: p.move === 'chunks' ? 1 : clamp(0.35 + whole * 1.8), // on from its first frame, out of focus (a cut lands inside a blur)
          fontFamily: FONT.text,
          fontWeight: role.weight,
          fontSize: size,
          lineHeight: lead,
          letterSpacing: `${(role.track + (p.move === 'track' ? 0.14 * (1 - whole) : 0)).toFixed(4)}em`,
          color: p.color,
          textAlign: 'center',
          whiteSpace: 'pre',
        }}
      >
        {rows.map((row, r) => (
          <div key={r}>
            {row.map((w, j) => {
              const i = wi++;
              const keyed = !!keys && i >= keys[0] && i <= keys[1];
              const c0 = chunk[i];
              const e = p.move === 'chunks' ? E.snapOut(clamp((t - c0 * gap) / entry)) : 1;
              return (
                <React.Fragment key={j}>
                  {j > 0 ? ' ' : ''}
                  <span style={{ display: 'inline-block', overflow: p.move === 'chunks' ? 'hidden' : undefined, verticalAlign: 'top', padding: '0 0.04em 0.12em', margin: '0 -0.04em -0.12em' }}>
                    <span style={{ display: 'inline-block', transform: p.move === 'chunks' ? `translateY(${((1 - e) * 0.62).toFixed(4)}em)` : undefined, opacity: p.move === 'chunks' ? clamp(e * 1.6) : 1, color: keyed ? (p.accent ?? p.color) : undefined }}>{w}</span>
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
