/**
 * TypeStack: a statement set on 2-3 lines instead of one line of one size (lib/look.ts STACK_LOOK holds the measured
 * numbers). A film's statements are one centred line as a rule (80 % of them or more); a stack is the exception, at most
 * one a film (fx/TypeSystem MAX_STACKS). Its lines each carry part of the sentence:
 *   centre  the lines centred on one axis, the block in the middle of the frame (the default)
 *   left    the lines flush left on one edge (house: 4 % of the frame width in), baseline to baseline 1.04 of the
 *           lower line's size: only beside a picture that holds the other half of the frame, never at the top or bottom
 *   stair   each line starts about a third of the way along the line above (0.34 of its width): a stair
 *   right   flush right
 * Every line takes its own size (a role, a scale of it, or px), weight, colours, preset and emphasis: giant plus small
 * is a line at display or hero size beside a caption (`aside`: 1-3 short lines in the caption role, hung beside one line
 * with its first cap line on that line's cap line, a third of an em of the line to its right), or a small line over a
 * giant one ("Reelweek turns your week" / "into a reel."). Lines start 14 f apart (60 fps) unless they give their own
 * `at`; they leave together on the stack's exit, the last line first, 2 f apart. Only the key line (default the last)
 * takes an emphasis (the film's default kind) unless a line names its own: one emphasis per statement.
 *
 * stackLayout() is the pure layout (sizes and widths in, each line's left edge and centre out); <TypeStack> measures the
 * lines with the real font (under FontGate) and draws each with <TypeLine align="left">, so every preset, emphasis and
 * exit works inside a stack. Each line is tagged for the layout audit as `<id>-<n>`.
 */
import React, { useMemo } from 'react';
import { FONT, TYPE, TYPE_FAMILY, U } from '../brand/tokens';
import { f60x, type FilmCtx, fpsOf, useFilm } from '../lib/film';
import { STACK_LOOK } from '../lib/look';
import { baselineOf } from '../lib/measure';
import { EMPHASIS_DEFAULT, type EmphasisSpec } from './TypeEmphasis';
import type { Declares } from '../timeline';
import { declares as lineDeclares, defaultEmphasis, measureLine, type TypeColors, type TypeExit, TypeLine, type TypeLineSpec, typeLineSpec, type TypePresetName } from './TypePresets';

export type StackLine = {
  text: string; // one part of the sentence (*marks* name its key words)
  role?: keyof typeof TYPE; // default 'line'
  scale?: number; // x the role's size
  size?: number; // px at this frame size (wins over role and scale)
  weight?: number; // default the role's
  track?: number; // em, default the role's
  preset?: TypePresetName; // default crisp
  emph?: EmphasisSpec; // default: the key line takes the stack's emphasis, the others none
  colors?: TypeColors;
  at?: number; // its own first frame
  indent?: number; // em of its own size, added to the layout's indent
};
export type StackLayout = 'left' | 'stair' | 'centre' | 'right';

export type TypeStackProps = {
  lines: StackLine[];
  frame: number;
  at: number; // the first line's first frame
  out?: number; // the exit's first frame (the last line leaves first)
  exit?: TypeExit;
  layout?: StackLayout; // default 'centre'
  x?: number; // the left edge (left, stair), the axis (centre) or the right edge (right); default the margin or the frame's centre
  y?: number; // the block's vertical centre (cap line of the first line to the baseline of the last); default the frame's
  lead?: number; // baseline to baseline as a share of the lower line's size (default STACK_LOOK.lead)
  keyLine?: number; // the line that carries the emphasis (default the last)
  emph?: EmphasisSpec; // the key line's emphasis when it names none (default: the film's default kind, the accent, over all its words)
  aside?: { text: string[]; line?: number; at?: number; colors?: TypeColors }; // a caption hung beside a line (default the largest)
  colors?: TypeColors;
  id?: string;
};

/** A line placed in a stack: its left edge, its TypeLine centre (y), size, width and baseline (px). */
export type StackBox = { x: number; y: number; size: number; width: number; baseline: number };

/**
 * The layout of a stack: each line's left edge and the centre of its glyph box (what <TypeLine> takes as y), from the
 * lines' sizes and widths (px). `baseline` is the face's baseline in em from the top of a 1 em box, `cap` its cap
 * height in em. Pure.
 */
export const stackLayout = (
  lines: { size: number; width: number; indent?: number }[],
  o: { layout?: StackLayout; x: number; y: number; lead?: number; stair?: number; baseline?: number; cap?: number },
): StackBox[] => {
  const n = lines.length;
  if (!n) return [];
  const lead = o.lead ?? STACK_LOOK.lead;
  const bl = o.baseline ?? 0.8;
  const cap = o.cap ?? 0.727;
  const bs = [0];
  for (let i = 1; i < n; i++) bs.push(bs[i - 1] + lead * lines[i].size);
  const top = -cap * lines[0].size;
  const shift = o.y - (top + bs[n - 1]) / 2;
  const layout = o.layout ?? 'centre';
  const xs: number[] = [];
  lines.forEach((l, i) => {
    const ind = (l.indent ?? 0) * l.size;
    if (layout === 'centre') xs.push(o.x - l.width / 2 + ind);
    else if (layout === 'right') xs.push(o.x - l.width + ind);
    else if (layout === 'stair') xs.push((i ? xs[i - 1] - (lines[i - 1].indent ?? 0) * lines[i - 1].size + (o.stair ?? STACK_LOOK.stair) * lines[i - 1].width : o.x) + ind);
    else xs.push(o.x + ind);
  });
  return lines.map((l, i) => {
    const baseline = bs[i] + shift;
    return { x: xs[i], y: baseline - bl * l.size + 0.5 * l.size, size: l.size, width: l.width, baseline };
  });
};

/** The frame each line of a stack starts: its own `at`, else STACK_LOOK.step60 after the line above. Pure. */
export const stackOnsets = (lines: Pick<StackLine, 'at'>[], at: number, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  return lines.map((l, i) => l.at ?? at + f60x(STACK_LOOK.step60 * i, fps));
};

/** The spec a stack line is drawn with: flush left, its onset and exit, the stack's emphasis on the key line only. Pure. */
export const stackLineSpec = (p: Pick<TypeStackProps, 'lines' | 'at' | 'out' | 'exit' | 'keyLine' | 'emph' | 'colors' | 'id'>, i: number, film?: Partial<FilmCtx>): TypeLineSpec => {
  const l = p.lines[i];
  const n = p.lines.length;
  const fps = fpsOf(film);
  const key = p.keyLine ?? n - 1;
  const emph: EmphasisSpec = l.emph !== undefined ? l.emph : i === key ? (p.emph ?? { device: EMPHASIS_DEFAULT, words: [0, 99] }) : false;
  return {
    preset: l.preset ?? 'crisp',
    text: l.text,
    at: stackOnsets(p.lines, p.at, film)[i],
    out: p.out === undefined ? undefined : p.out + f60x(2 * (n - 1 - i), fps),
    exit: p.exit,
    emph,
    align: 'left',
    colors: l.colors ?? p.colors,
    id: `${p.id ?? 'stack'}-${i}`,
  };
};

/** The size (px) a stack line is set at on a frame of short side `short`. Pure. */
export const stackLineSize = (l: StackLine, short: number) => l.size ?? TYPE[l.role ?? 'line'].size * (short / 1080) * (l.scale ?? 1);

export const TypeStack: React.FC<TypeStackProps> = (p) => {
  const film = useFilm();
  const short = Math.min(film.width, film.height);
  const specs = p.lines.map((_, i) => stackLineSpec(p, i, film));
  const sized = p.lines.map((l) => {
    const role = TYPE[l.role ?? 'line'];
    return { size: stackLineSize(l, short), weight: l.weight ?? role.weight, track: l.track ?? role.track, indent: l.indent };
  });
  const key = JSON.stringify([p.lines, sized]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const widths = useMemo(() => specs.map((s, i) => measureLine(defaultEmphasis(typeLineSpec(s), 'line'), sized[i].size, sized[i].weight, sized[i].track, FONT.text).width), [key]);
  const bl = useMemo(() => baselineOf(100, 500, 1, FONT.text) / 100, []);
  const layout = p.layout ?? 'centre';
  const x = p.x ?? (layout === 'centre' ? film.width / 2 : layout === 'right' ? film.width * (1 - STACK_LOOK.margin) : film.width * STACK_LOOK.margin);
  const boxes = stackLayout(
    sized.map((s, i) => ({ size: s.size, width: widths[i], indent: s.indent })),
    { layout, x, y: p.y ?? film.height / 2, lead: p.lead, baseline: bl },
  );
  const aside = p.aside;
  const asideLine = aside ? (aside.line ?? boxes.reduce((b, l, i) => (l.size > boxes[b].size ? i : b), 0)) : 0;
  const cap = TYPE.caption;
  const capSize = cap.size * U;
  return (
    <>
      {specs.map((s, i) => (
        <TypeLine key={i} spec={s} frame={p.frame} x={boxes[i].x} y={boxes[i].y} size={boxes[i].size} weight={sized[i].weight} track={sized[i].track} role={p.lines[i].role ?? 'line'} />
      ))}
      {aside && boxes[asideLine]
        ? aside.text.map((t, j) => {
            const b = boxes[asideLine];
            const capTop = b.baseline - 0.727 * b.size;
            const baseline = capTop + 0.727 * capSize + j * cap.lead * capSize;
            return (
              <TypeLine
                key={`aside${j}`}
                spec={{ preset: 'calm', text: t, at: aside.at ?? specs[asideLine].at + f60x(STACK_LOOK.step60 + 6 * j, fpsOf(film)), out: p.out, exit: p.out === undefined ? undefined : 'cut', emph: false, align: 'left', colors: aside.colors ?? p.colors, id: `${p.id ?? 'stack'}-aside-${j}` }}
                frame={p.frame}
                role="caption"
                x={b.x + b.width + STACK_LOOK.asideGap * b.size}
                y={baseline - bl * capSize + 0.5 * capSize}
                size={capSize}
              />
            );
          })
        : null}
    </>
  );
};

/** A stack declares what its lines declare (stepped runs, seams), each as TypePresets declares it. */
export const declares = (p?: Partial<TypeStackProps>, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p?.lines?.length) return out;
  const full = { at: 0, ...p, lines: p.lines } as TypeStackProps;
  p.lines.forEach((_, i) => {
    const d = lineDeclares(stackLineSpec(full, i, film), film);
    out.stepped!.push(...(d.stepped ?? []));
    out.seams!.push(...(d.seams ?? []));
  });
  return out;
};

/**
 * A statement set as two lines (StatementLine with `stack`): the words before the key words small (lead x the size), the
 * key words and what follows them big (key x the size, the family's: calm x1.7, bold x1.45), the big line fitted under
 * maxWidth of the frame; the small line 0.55-0.7 of the big one, baseline to baseline 1.02-1.08. A line under minWords
 * words, or one whose key words open it, stays one line. One stack a film at most.
 */
export const STATEMENT = { lead: 0.62, key: { calm: 1.7, bold: 1.45 } as Record<'calm' | 'bold', number>, minWords: 4, maxWidth: 0.78 } as const;

/** The two lines of a statement: the words before the key words and the rest, or null when it stays one line. Pure. */
export const splitStatement = (text: string, keys?: [number, number] | null): [string, string] | null => {
  const words = text.split(' ').filter(Boolean);
  const k0 = keys ? keys[0] : words.length - 1;
  if (words.length < STATEMENT.minWords || k0 < 1 || k0 >= words.length) return null;
  return [words.slice(0, k0).join(' '), words.slice(k0).join(' ')];
};

/**
 * <StatementLine spec frame size>: a hero statement on its preset: one centred TypeLine with the emphasis its film gave
 * it, or, with `stack` (the film's one stack), a two-line stack when it splits (the lead small over the key words big,
 * the spec's device on the key words, else the family's emphasis weight). `size` is the statement's line size (px);
 * `layout` centres the stack on (x, y) (the default) or sets it flush left at x.
 */
export const StatementLine: React.FC<{ spec: TypeLineSpec; frame: number; size: number; x?: number; y?: number; layout?: 'centre' | 'left'; weight?: number; maxWidth?: number; family?: 'calm' | 'bold'; stack?: boolean }> = (p) => {
  const film = useFilm();
  const s = typeLineSpec(p.spec);
  const split = p.stack ? splitStatement(s.text, s.keys ?? (s.key !== undefined ? [s.key, s.key] : null)) : null;
  const role = TYPE.line;
  const weight = p.weight ?? role.weight;
  const fam = p.family ?? TYPE_FAMILY;
  const bigBase = p.size * STATEMENT.key[fam];
  const big = useMemo(() => {
    if (!split) return bigBase;
    const w = measureLine({ ...s, text: split[1], emph: false }, bigBase, weight + 100, role.track - 0.01, FONT.text).width;
    return Math.min(bigBase, (bigBase * (p.maxWidth ?? STATEMENT.maxWidth) * film.width) / Math.max(1, w));
  }, [split?.[1], bigBase, weight, film.width]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!split) return <TypeLine spec={s} frame={p.frame} x={p.x} y={p.y} size={p.size} weight={weight} />;
  const nKey = s.keys ? s.keys[1] - s.keys[0] : 0;
  const emph = s.emph !== undefined && s.emph !== false ? (typeof s.emph === 'string' ? { device: s.emph, words: [0, nKey] as [number, number] } : { ...s.emph, words: [0, nKey] as [number, number] }) : { device: EMPHASIS_DEFAULT, words: [0, nKey] as [number, number] };
  return (
    <TypeStack
      id={s.id ?? 'statement'}
      frame={p.frame}
      at={s.at}
      out={s.out}
      exit={s.exit}
      layout={p.layout ?? 'centre'}
      x={p.x ?? (p.layout === 'left' ? undefined : film.width / 2)}
      y={p.y}
      colors={s.colors}
      lines={[
        { text: split[0], size: Math.max(TYPE.caption.size * (Math.min(film.width, film.height) / 1080), p.size * STATEMENT.lead), weight, preset: s.preset, emph: false },
        { text: split[1], size: big, weight: weight + 100, track: role.track - 0.01, preset: s.preset, emph },
      ]}
    />
  );
};
