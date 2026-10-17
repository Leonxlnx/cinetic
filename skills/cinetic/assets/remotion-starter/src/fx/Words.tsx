import React from 'react';
import { arrive, arriveK, blurIn, blurOut, depart, E, easeOf, pace as filmPace, type Pace, prog } from '../lib/anim';
import { f60 } from '../timeline';

/**
 * Word-by-word reveal of one fragment (1-4 words; a longer thought is a chain: fx/Chain). Each word
 * rises `rise` em and fades in over `dur` frames on `ease`, `stagger` frames apart; every default
 * comes from the film's pace (src/lib/pace.ts), the same numbers timeline.ts line() and chain()
 * compute `resolved` from, so COPY matches what renders. Calm: 36 f on E.outSoft, 11 f apart,
 * 0.2 em, no blur (a 2-word fragment resolves in 47 f); crisp: 26 f on E.out, 6 f apart, 0.32 em,
 * 8 px of entry blur. Pass `pace={PACE.crisp}` to switch them all.
 * Exit (`exit`, default from the pace): 'together' (calm) fades the whole fragment on E.smooth over
 * `outDur` frames while it lifts `pace.exitLift` em on E.exit, so it leaves as one thought; 'words'
 * (crisp) sends each word away at half the stagger, accelerating on E.in through depart() and
 * blurring only once it moves fast (blurOut). Either way the opacity eases at both ends: a fade on
 * an accelerating curve would hold the word near full strength and drop it in 2-3 frames, a
 * visible pop. Text lands sharp: blur, when there is any, ends while the word still moves fast
 * (blurIn), because Chromium renders radii under ~0.75 px fully sharp and a slow finish would snap
 * into focus. The rise ends through arrive() at arriveK() of the rise in px (from `size`, or a
 * numeric style.fontSize; without either, k = 0.94, which fits a ~40 px rise), and the exit starts
 * through depart(): vertical text positions snap to whole pixels, so an ease-out's slow tail would
 * settle in 1 px ticks. Transform-only placement. The line carries data-text for scripts/layout-audit.sh.
 */
export const Words: React.FC<{
  text: string;
  frame: number; // local frame
  start: number; // first word begins (word i begins at start + i*stagger, or at starts[i])
  id?: string; // data-text id for the layout audit (use the COPY id, so the audit finds its reading window)
  starts?: number[];
  pace?: Pace;
  stagger?: number;
  dur?: number;
  ease?: (t: number) => number;
  rise?: number; // em
  blur?: number; // px
  out?: number; // frame the exit begins (optional)
  outDur?: number;
  exit?: 'together' | 'words';
  style?: React.CSSProperties;
  wordStyle?: (i: number, p: number) => React.CSSProperties; // p = that word's 0..1 entrance
  size?: number; // px font size, so the rise stops from ~1 px/f (arriveK); default: style.fontSize when it is a number
}> = ({ text, frame, start, id = 'words', starts, pace = filmPace, stagger, dur, ease, rise, blur, out, outDur, exit, style, wordStyle, size }) => {
  const st = stagger ?? f60(pace.stagger);
  const d = dur ?? f60(pace.wordDur);
  const e = ease ?? easeOf(pace);
  const r = rise ?? pace.rise;
  const bl = blur ?? pace.blur;
  const od = outDur ?? f60(pace.exitDur);
  const together = (exit ?? pace.exit) === 'together';
  const px = size ?? (typeof style?.fontSize === 'number' ? style.fontSize : undefined);
  const k = px ? arriveK(r * px, d, e) : 0.94; // where the drawn rise stops
  const words = text.split(' ');
  return (
    <span data-text={id} style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'pre', ...style }}>
      {words.map((w, i) => {
        const s = starts?.[i] ?? start + i * st;
        const p = prog(frame, s, s + d, e);
        const o = out === undefined ? 0 : together ? out : out + i * (st / 2);
        const q = out === undefined ? 0 : prog(frame, o, o + od, together ? E.exit : E.in); // the move accelerates away
        const fade = out === undefined ? 0 : prog(frame, o, o + od, E.smooth); // the fade has no pop at either end
        const b = blurIn(p, bl) + (together ? 0 : blurOut(q, bl));
        const lift = together ? pace.exitLift : r * 0.6;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${((1 - arrive(p, k)) * r - depart(q) * lift).toFixed(4)}em)`,
              filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined,
              opacity: p * (1 - fade),
              ...wordStyle?.(i, p),
            }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
};
