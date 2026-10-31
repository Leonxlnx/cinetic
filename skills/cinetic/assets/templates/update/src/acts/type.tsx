// The film's lines of type: one clean line at a time, centred, every line on the film's one voice (src/deal.ts LINES:
// one confident move dealt per film from fx/TypePresets mask, land, fall or glide, every word solid ink within a few
// frames and moving while it lands), leaving at speed on the film's one exit (slide, spread, collapse, push or drop:
// none fades a statement out).
//   HeroLine  one sentence on its move (fx/TypePresets TypeLine), centred on (x, y)
//   MarkLine  the same with an object inside the sentence at 1.0 cap height ("[]" marks the place): a real mark
//             (scripts/logos.mjs), a glyph or a chip (kit/inline InlineObject). The slot is a word of the line (figure
//             spaces as wide as the object), so the object rises, lands, scales and leaves exactly as its word does,
//             whatever the move; the objects roll in turn once it has landed.
import React, { useMemo } from 'react';
import { FONT, TYPE, U } from '../brand/tokens';
import { DEAL_SEED, LINE_DEVICE, LINE_IDS } from '../deal';
import { checkFilmEmphasis, type EmphasisName, type EmphasisSpec, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { checkSystems, filmSystems, type HeadlineSystem } from '../fx/TypeSystem';
import { emphasisFitSize, measureLine, TypeLine, typeLineSpec, typeLineState, type TypeExit, type TypeLineSpec, type TypePresetName, wordMap } from '../fx/TypePresets';
import { capHeight, type KitTheme } from '../kit';
import { InlineObject, inlineWidth, type InlineRef } from '../kit/inline';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { UPDATE } from '../update';

/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/** The film's signature, if it has one: a box, marker or underline on ONE line ({ id: 'change2', device: 'under' }). */
export const EMPH_SIGNATURE: { id: string; device: EmphasisName } | undefined = undefined;
/** The change lines the acts set another way than the voice: a change written with "[]" carries its object inside the line (acts/World MarkLine). */
export const GIVEN: Partial<Record<string, HeadlineSystem>> = Object.fromEntries(
  UPDATE.changes.map((ch, i) => [`change${i + 1}`, ch.words.includes('[]') ? ('inline' as const) : undefined]).filter(([, s]) => s),
);
/** The change lines this film has (one per change in update.ts). */
const IDS = LINE_IDS.slice(0, UPDATE.changes.length);
/** Every change line in the film's voice (one centred line on the dealt move) but the given ones. */
export const SYSTEMS: Record<string, HeadlineSystem> = filmSystems(IDS, DEAL_SEED, { given: GIVEN });
/**
 * The film's emphasis (fx/TypeEmphasis filmEmphasis): its one kind on up to 70 % of the change lines, the lines in the
 * voice that name a `key` first, so a line in the voice is never one size, weight and colour throughout. A line a device
 * of the library draws (src/deal.ts LINE_DEVICE: the field line's scale-contrast, a dealt letter-swing or word-swap)
 * sets its key word apart itself, whatever it is dealt here; the name and the version take none.
 */
export const EMPH: Record<string, EmphasisName | false> = filmEmphasis([...IDS, 'wordmark', 'version'], { kind: EMPH_KIND, keyed: IDS.filter((_, i) => UPDATE.changes[i]?.key && !LINE_DEVICE[i]), none: ['wordmark', 'version'], signature: EMPH_SIGNATURE, share: 0.7 });
/** The film's systems and emphasis, checked: one voice on half the lines or more; one kind on up to 70 % of the lines. */
export const HEADLINE_CHECK = checkSystems(IDS.map((id) => SYSTEMS[id]), 'plain');
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH, ['wordmark', 'version']);
/** A change line's key words: change<n> is the n-th change. */
const keyWords = (id: string, text: string) => {
  const n = /^change(\d+)$/.exec(id);
  return n ? (keysOf(text, UPDATE.changes[Number(n[1]) - 1]?.key) ?? undefined) : undefined;
};

/** A figure space: the slot's filler glyph (a word of the line, never a break). */
const FIG = ' ';

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
  accent?: string; // the moves that land in the accent (land, fly, fall, open) cool from it to `color`
  mute?: string; // the mask's rising words darken from it
  emph?: EmphasisSpec; // the line's emphasis (default: the film's, EMPH)
  keys?: [number, number]; // its key words (default: the change's key found in the line, else the last word)
};

const specOf = (p: LineProps, text: string): TypeLineSpec => ({
  preset: p.move,
  text,
  at: p.at,
  out: p.out,
  exit: p.exit ?? 'cut',
  id: p.id,
  colors: { ink: p.color, accent: p.accent ?? p.color, mute: p.mute ?? p.color },
  emph: p.emph ?? EMPH[p.id],
  keys: p.keys ?? keyWords(p.id, text),
});

/** One line of the script on its dealt move. */
export const HeroLine: React.FC<LineProps> = (p) => {
  const film = useFilm();
  if (p.frame < p.at) return null;
  const role = TYPE[p.role ?? 'line'];
  const spec = specOf(p, p.text);
  // a size device refits the line so it is no wider than the plain line at its size
  const size = emphasisFitSize(spec, p.size ?? (role.size * Math.min(film.width, film.height)) / 1080, role.weight, role.track, FONT.text, p.role ?? 'line');
  return <TypeLine spec={spec} frame={p.frame} x={p.x} y={p.y} role={p.role ?? 'line'} size={size} />;
};

/** The text a MarkLine lays out: the slot as figure spaces at least `slotW` px wide. Browser (it measures the face). */
const slotText = (text: string, slotW: number, size: number, weight: number, track: number) => {
  const raw = text.includes('[]') ? text : `${text} []`;
  const fig = Math.max(1, measureTracked(FIG.repeat(4), size, weight, track, FONT.text) / 4);
  return raw.replace('[]', FIG.repeat(Math.max(1, Math.ceil(slotW / fig))));
};

/** A line with an object inside it: the object rides its slot word's own state frame by frame. */
export const MarkLine: React.FC<LineProps & { objects: InlineRef[]; ground?: 'light' | 'dark'; theme?: KitTheme; every?: number; swap?: number; loop?: boolean; rollFrom?: number }> = (p) => {
  const film = useFilm();
  const roleName = p.role ?? 'line';
  const role = TYPE[roleName];
  const size = p.size ?? (role.size * Math.min(film.width, film.height)) / 1080;
  const cap = capHeight(size, role.weight);
  const objW = Math.max(cap, ...p.objects.map((o) => inlineWidth(o, cap, p.ground, (t, px) => measureTracked(t, px, 600, -0.01, FONT.text))));
  const text = slotText(p.text, objW + 0.08 * size, size, role.weight, role.track);
  // the object rides the line's landed layout: a device that re-flows the line as it plays lands static instead; the
  // key words are the change's key, else the last word that is not the slot (the object is never emphasised)
  const spec = useMemo(() => {
    const still: Record<string, EmphasisName> = { swell: 'scale', marker: 'weight', box: 'weight' };
    const s0 = typeLineSpec(specOf(p, text));
    const dev = typeof s0.emph === 'string' ? s0.emph : s0.emph ? s0.emph.device : undefined;
    const s = dev && still[dev] ? { ...s0, emph: typeof s0.emph === 'object' && s0.emph ? { ...s0.emph, device: still[dev] } : still[dev] } : s0;
    if (s.keys) return s;
    const words = wordMap(s.text).words;
    let k = words.length - 1;
    while (k > 0 && words[k].includes(FIG)) k--;
    return { ...s, keys: [k, k] as [number, number] };
  }, [p.move, text, p.at, p.out, p.exit, p.id, p.color, p.accent, p.mute, p.emph]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMemo(() => measureLine(spec, size, role.weight, role.track, FONT.text), [spec, size, role.weight, role.track]);
  if (p.frame < p.at) return null;
  const st = typeLineState(p.frame, spec, m, film);
  const Wm = wordMap(text);
  const slot = Wm.words.findIndex((w) => w.includes(FIG));
  const i0 = Wm.starts[slot];
  const g = st.glyphs[i0];
  // the TypeLine's own group box and transform (fx/TypePresets TypeLine), so the object sits on its slot's glyph run
  const padX = size * 1.2;
  const boxW = m.width + 2 * padX;
  const boxH = size * 1.6;
  const cx = p.x ?? film.width / 2;
  const cy = p.y ?? film.height / 2;
  // the figure-space run inside the slot word (punctuation may cling to it: "[]," or "([])")
  const chars = [...Wm.words[slot]];
  const f0 = i0 + chars.indexOf(FIG);
  const f1 = i0 + chars.lastIndexOf(FIG);
  const lead = m.xs[f0];
  const slotW = m.xs[f1] + m.ws[f1] - lead;
  const px = (v: number) => `${Number(v.toFixed(2))}px`;
  const objLayer =
    st.visible && g && g.opacity > 0.001 ? (
      <div
        style={{
          position: 'absolute',
          left: cx - boxW / 2,
          top: cy - boxH / 2,
          width: boxW,
          height: boxH,
          transform: `translate(${px(st.x * size)}, ${px(st.y * size)}) scale(${st.scale.toFixed(5)})`,
          transformOrigin: `${px(boxW / 2 + st.origin[0] * size)} ${px(boxH / 2 + st.origin[1] * size)}`,
          opacity: st.opacity,
          filter: st.blur > 0.002 ? `blur(${px(st.blur * size)})` : undefined, // focus-in: the line's own defocus (fx/TypePresets)
        }}
      >
        <div
          style={{ // focus-in: the slot object rides its word (and its defocus)
            position: 'absolute',
            top: size * 0.3,
            left: padX + lead + (slotW - objW) / 2,
            width: objW,
            height: size,
            fontFamily: FONT.text,
            fontSize: size,
            fontWeight: role.weight,
            lineHeight: 1,
            whiteSpace: 'pre',
            opacity: g.opacity,
            transform: `translate(${px(g.dx * size)}, ${px(g.dy * size)}) rotate(${g.rot.toFixed(2)}deg) scale(${g.sx.toFixed(4)}, ${g.sy.toFixed(4)})`,
            transformOrigin: '50% 78%',
            filter: g.blur > 0.002 ? `blur(${px(g.blur * size)})` : undefined, // focus-in: the object takes its word's defocus (land and fly ride their scale)
            clipPath: g.clip !== undefined ? `inset(-60% -40% ${((1 - g.clip + g.dy) * 100).toFixed(2)}% -40%)` : undefined,
          }}
        >
          {'​'}
          <InlineObject objects={p.objects} size={size} weight={role.weight} frame={p.frame} start={p.rollFrom ?? p.at} every={p.every} swap={p.swap} loop={p.loop} fit="max" ground={p.ground} theme={p.theme} id={p.id} />
        </div>
      </div>
    ) : null;
  return (
    <>
      <TypeLine spec={spec} frame={p.frame} x={cx} y={cy} role={roleName} size={size} metrics={m} />
      {objLayer && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>{objLayer}</div>}
    </>
  );
};

/** The px size a sentence of `role` is set at so it holds under `share` of the frame width (its role's size at most). Browser. */
export const fitLineSize = (text: string, share: number, role: keyof typeof TYPE = 'line', width = 1920) => {
  const r = TYPE[role];
  const base = r.size * U;
  const w = measureTracked(text.replace('[]', 'MM'), base, r.weight, r.track, FONT.text);
  return Math.min(base, (base * share * width) / Math.max(1, w));
};

/**
 * A line with a gap for an object the act draws itself (the split shape's card): the text as laid out (the gap is a
 * run of figure spaces at least `gapW` px wide, in place of "[]"), its size, and where the gap sits once the line has
 * landed (its centre x and width, px). Pass the same props to HeroLine with the returned text and size. Browser.
 */
export const gapLine = (p: Omit<LineProps, 'text' | 'frame'> & { text: string; size: number; gapW: number }): { text: string; size: number; x: number; w: number } => {
  const role = TYPE[p.role ?? 'line'];
  const text = slotText(p.text, p.gapW, p.size, role.weight, role.track);
  const spec = typeLineSpec(specOf({ ...p, frame: 0, text }, text));
  const size = emphasisFitSize(spec, p.size, role.weight, role.track, FONT.text, p.role ?? 'line');
  const m = measureLine(spec, size, role.weight, role.track, FONT.text);
  const Wm = wordMap(text);
  const slot = Wm.words.findIndex((w) => w.includes(FIG));
  const chars = [...Wm.words[slot]];
  const f0 = Wm.starts[slot] + chars.indexOf(FIG);
  const f1 = Wm.starts[slot] + chars.lastIndexOf(FIG);
  const w = m.xs[f1] + m.ws[f1] - m.xs[f0];
  return { text, size, x: (p.x ?? 960) - m.width / 2 + m.xs[f0] + w / 2, w };
};
