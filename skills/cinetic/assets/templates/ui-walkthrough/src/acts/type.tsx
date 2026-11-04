// The film's lines of type: one clean line at a time, centred, every line on the film's one voice (src/deal.ts LINES:
// one confident move dealt per film from fx/TypePresets mask, land, fall or glide, every word solid ink within a few
// frames and moving while it lands), leaving at speed on the film's one exit (slide, spread, collapse, push or drop:
// none fades a statement out).
// The film speaks in one voice (fx/TypeSystem filmSystems: one centred line, the dealt move for every line); the acts set
// the promise with the input's mark inside it and the claim as a poster, a push or a line with its object inside. The
// emphasis is quiet and one kind (fx/TypeEmphasis filmEmphasis, EMPH below): the film's kind (EMPH_KIND, the accent
// colour by default) on at most 60 % of the lines, on the words named in src/walk.ts `keys` ("[outputs]" in "[Product]
// turns [] [inputs] into [outputs]."); a box, marker or underline only as the film's one declared signature
// (EMPH_SIGNATURE, one line). A line with a size device refits so it is no wider than the plain line
// (emphasisFitSize); the name takes none.
//   HeroLine  one sentence on its move (fx/TypePresets TypeLine), centred on (x, y)
//   MarkLine  the same with an object inside the sentence at 1.0 cap height ("[]" marks the place): a real mark
//             (scripts/logos.mjs), a glyph or a chip (kit/inline InlineObject). The slot is a word of the line (figure
//             spaces as wide as the object), so the object rises, lands, scales and leaves exactly as its word does,
//             whatever the move; the objects roll in turn once it has landed.
import React, { useMemo } from 'react';
import { FONT, TYPE, U } from '../brand/tokens';
import { DEAL, DEAL_SEED, LINE_IDS } from '../deal';
import { checkFilmEmphasis, type EmphasisName, type EmphasisSpec, filmEmphasis, keysOf } from '../fx/TypeEmphasis';
import { checkSystems, filmSystems, type HeadlineSystem } from '../fx/TypeSystem';
import { emphasisFitSize, measureLine, TypeLine, typeLineSpec, typeLineState, type TypeExit, type TypeLineSpec, type TypePresetName, wordMap } from '../fx/TypePresets';
import { capHeight, type KitTheme } from '../kit';
import { InlineObject, inlineWidth, type InlineRef } from '../kit/inline';
import { useFilm } from '../lib/film';
import { WALK } from '../walk';
import { measureTracked } from '../lib/measure';

/** The film's one emphasis kind: accent (colour alone) by default; weight, scale, swell, outline or sweep when the direction asks. */
export const EMPH_KIND: EmphasisName = 'accent';
/** The film's signature, if it has one: a box, marker or underline on ONE line ({ id: 'claim', device: 'marker' }). */
export const EMPH_SIGNATURE: { id: string; device: EmphasisName } | undefined = undefined;
/**
 * The lines the acts set another way than the voice: the promise carries the input's mark inside it (acts/Open
 * MarkLine); the claim is a poster on the accent (fx/TypeClaim), a push through the line, or carries its object inside
 * it (acts/Claim). The deal never plays the object right after the promise (src/deal.ts dealDevices).
 */
export const GIVEN: Partial<Record<string, HeadlineSystem>> = { promise: 'inline', claim: ({ accent: 'giant', push: 'push', object: 'inline' } as const)[DEAL.claim] };
/** Every line in the film's voice (plain) but the given ones. */
export const SYSTEMS: Record<string, HeadlineSystem> = filmSystems(LINE_IDS, DEAL_SEED, { given: GIVEN });
/**
 * The film's emphasis: its one kind on at most 60 % of the lines, the lines walk.ts names key words for first (from
 * the payoff back); the payoff is placed by its measured width (a size kind plays as accent on it); the name takes none.
 */
export const EMPH: Record<string, EmphasisName | false> = filmEmphasis([...LINE_IDS, 'wordmark'], { kind: EMPH_KIND, keyed: LINE_IDS.filter((id) => (WALK.keys as Record<string, string | undefined>)[id]), none: ['wordmark'], fixed: ['payoff'], signature: EMPH_SIGNATURE });
/** The film's systems and emphasis, checked: one voice on half the lines or more, one stack at most; one kind on <= 60 % of the lines. */
export const HEADLINE_CHECK = checkSystems(LINE_IDS.map((id) => SYSTEMS[id]), 'plain');
export const EMPHASIS_CHECK = checkFilmEmphasis(EMPH, ['wordmark']);

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
  keys?: [number, number]; // its key words (default: walk.ts keys[id] found in the line, else the last word)
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
  keys: p.keys ?? keysOf(text, WALK.keys[p.id]) ?? undefined,
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
  // the key words are the marked ones, else the last word that is not the slot (the object is never emphasised)
  const spec = useMemo(() => {
    // the object rides the line's landed layout, so a device that re-flows the line as it plays lands static instead
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
