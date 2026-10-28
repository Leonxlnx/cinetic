import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MARK, Mark, placeMark } from '../brand/Mark';
import { C, SAFE, TYPE, U } from '../brand/tokens';
import { Chain, chainLayout, type ChainSpec, chainState } from '../fx/Chain';
import { E, lmix, prog, squash } from '../lib/anim';
import { camera, type Shot, toScreen } from '../lib/camera';
import { type FilmCtx, useFilm } from '../lib/film';
import { baselineOf, measureTracked } from '../lib/measure';
import { ACT, CUE, chainOf, f60x, H, W } from '../timeline';
import { Paper } from './ground';

// ACT 1 - the statement builds in two fragments around a picture beat: fragment, picture, fragment.
// "plinth cuts" rises into a frame that is already moving (a slow creep, the key drifting across the paper)
// and is read in the quiet. Then the picture takes its turn: the accent dot is born above the line, falls,
// and lands where the finished line will end; the camera punches in on the contact. "to music" rises on the
// off-beat as the line jumps to make room (the calm pace's re-centre), the dot seated as its period. After
// the read the whole line, dot and all, accelerates out to the left (fx/Chain exit 'launch') and the film
// cuts on its fastest frame: Act2's plate opens already moving at 0.7 of that speed. Under it all runs the beat's
// line: a rule drawn in from the left edge, already moving on frame 0, that the words stand on and the dot lands on.


/** The statement's type size (px) before any shrink to the safe width: src/sync.ts times the text sounds with it. */
export const STATEMENT_SIZE = TYPE.display.size * U;

const FRAGS = chainOf('statement');
const LINE = FRAGS.map((c) => c.text).join(' ');
const DOT = { d: 0.2, gap: 0.06 }; // the period, in em: a little heavier than the font's own
/** The dot's fall (absolute frames): born above the line, it lands on the baseline ON CUE.land, accelerating into the contact. */
export const DOT_FALL = { from: CUE.drop, to: CUE.land, em: 1.1, ease: E.buildIn };
const CREEP = 1.065; // the camera's push through the act, linear from frame 0 (about 1 %/s over its three bars: a creep the eye reads)
/** The rule the line stands on (frames relative to the act; it starts drawing before frame 0, so the first frame moves). */
export const RULE = { from: -12, dur: f60x(44), px: 2.5, reach: 0.25 };
/** The camera's slow rise through the act (screen px, linear): with the creep, the frame never stands still. */
const RISE = 44;
/** The punch on the dot's contact: a 6-frame snap zoom (declared in timeline.ts SEAMS as 'snapZoom'). */
export const PUNCH = { at: CUE.land, k: 1.16, dur: f60x(6), ease: E.jump };
/** The statement as fx/Chain draws it: it launches left and the cut is its last drawn frame. */
export const STATEMENT_SPEC = { chain: 'statement', role: 'display', exitDir: 'left', exitAt: ACT.plate.from - 1, outDur: f60x(15) } satisfies Partial<ChainSpec>;
const SPEC = STATEMENT_SPEC;

/** The camera scale at absolute frame F: a linear creep times the punch. */
const camK = (F: number) => lmix(1, CREEP, prog(F, ACT.line.from, ACT.plate.from, E.linear)) * lmix(1, PUNCH.k, prog(F, PUNCH.at, PUNCH.at + PUNCH.dur, PUNCH.ease));

/** The statement's size from the real font (FontGate): display, shrunk only if the line, its period and the punch would leave the safe width. */
export const statementSize = () => {
  const disp = TYPE.display;
  const unit = measureTracked(LINE, 100, disp.weight, disp.track) / 100 - disp.track;
  return Math.min(STATEMENT_SIZE, (W - 2 * SAFE.x) / ((unit + DOT.gap + DOT.d) * CREEP * PUNCH.k));
};

/** How far the line has launched at absolute frame F (px in the world, negative = left). */
const launchX = (F: number, film: FilmCtx, size: number) => {
  const s = chainState(F, { ...SPEC, size, pace: film.pace, copy: film.copy }, film);
  const words = s.frags[s.frags.length - 1].words;
  return words[words.length - 1].x * size;
};

/** The line's screen speed on the cut frame (px per frame, negative = left): Act2 carries it into the plate. */
export const lineCutSpeed = (film: FilmCtx, size: number) => {
  const F = SPEC.exitAt;
  return launchX(F, film, size) * camK(F) - launchX(F - 1, film, size) * camK(F - 1);
};

export const Act1: React.FC = () => {
  const f = useCurrentFrame();
  const film = useFilm();
  const F = f + ACT.line.from;
  const disp = TYPE.display;

  const size = statementSize();
  const tail = (DOT.gap + DOT.d) * size; // the period's room, kept free at the end of the line
  const lay = chainLayout('statement', { role: 'display', size, tail });
  const last = lay.frags.length - 1;
  const base = lay.top + baselineOf(size, disp.weight, disp.lead);
  const period = { x: lay.lineLeft[last] + lay.width[last] + (DOT.gap + DOT.d / 2) * size, y: base - (DOT.d * size) / 2 };

  // Camera about frame centre: the creep from frame 0 (linear, so the first frame already moves) and the punch.
  const cam: Shot = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2 + RISE * (0.5 - prog(F, ACT.line.from, ACT.plate.from, E.linear)), k: camK(F) };

  // The device: born at the top of its fall, lands on the beat and squashes against the baseline, then sits
  // as the period and leaves with the line (its launch offset, inside the same camera).
  const born = prog(F, DOT_FALL.from, DOT_FALL.from + f60x(6), E.glideOut);
  const fall = prog(F, DOT_FALL.from, DOT_FALL.to, DOT_FALL.ease);
  const sq = squash(F - DOT_FALL.to);
  const p = toScreen(cam, { x: period.x + launchX(F, film, size), y: period.y - (1 - fall) * DOT_FALL.em * size });
  const dotPx = DOT.d * size * cam.k; // on-screen diameter
  const unitPx = dotPx / (2 * MARK.D.r); // px per mark unit

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Paper frame={f} from={ACT.line.from} />
      <div style={camera(cam)}>
        <div style={{ position: 'absolute', left: -RULE.reach * W, top: base, width: (1 + 2 * RULE.reach) * W, height: RULE.px * U, background: C.mute, transformOrigin: '0 0', transform: `scaleX(${prog(f, RULE.from, RULE.from + RULE.dur, E.glideOut).toFixed(4)})` }} />
        <Chain {...SPEC} frame={f} from={ACT.line.from} size={size} tail={tail} />
      </div>
      {born > 0 && (
        <Mark
          size={100}
          only={['D']}
          d={{ sx: sq.across, sy: sq.along, origin: [MARK.D.cx, MARK.D.cy + MARK.D.r], o: born }}
          style={placeMark(p.x - MARK.D.cx * unitPx, p.y - MARK.D.cy * unitPx, unitPx)}
        />
      )}
    </AbsoluteFill>
  );
};
