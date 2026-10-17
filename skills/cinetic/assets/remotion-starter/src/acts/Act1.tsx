import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MARK, Mark, placeMark } from '../brand/Mark';
import { C, SAFE, TYPE, U } from '../brand/tokens';
import { Chain, chainLayout } from '../fx/Chain';
import { E, lmix, mix, prog, squash } from '../lib/anim';
import { camera, toScreen } from '../lib/camera';
import { baselineOf, measureTracked } from '../lib/measure';
import { peak } from '../lib/sync';
import { ACT, chainOf, CUE, f60, H, W } from '../timeline';
import { DOT_SLOT, HERO } from './Act2';

// ACT 1 - the statement builds in two fragments around a picture beat: fragment, picture, fragment.
// "Built on" rises alone into the frame. Then the picture takes its turn: the accent dot (the film's
// device) is born above the line, falls, and lands on the baseline where the finished line will
// end, the beat made visible. The line glides left to make room and "the beat" rises into the
// opening, the dot seated as its period. After a long read the line leaves together; the dot stays
// a moment, then flies to its slot in the mark: Act 2 opens on exactly the pose this act ends on.
// The camera creeps in from frame 0, so the reads are alive without a tick planted in them.

const L = (abs: number) => abs - ACT.statement.from; // absolute cue -> act-local frame

const FRAGS = chainOf('statement');
const LINE = FRAGS.map((c) => c.text).join(' ');
const OUT = L(FRAGS[FRAGS.length - 1].out); // the whole line leaves together (a build chain clears at once)
const DOT = { d: 0.2, gap: 0.06 }; // the period, in em: a little heavier than the font's own
// The dot's fall: born above the line, it lands on the baseline ON CUE.land. E.contact arrives with
// speed (4.5x its mean at contact), so a 1.4 em fall over a beat meets the line near 21 px/f.
const FALL = { from: L(CUE.drop), to: L(CUE.land), em: 1.4 };
const CREEP = 1.08; // the camera's push through the act, from frame 0 until the dot sets off

// The dot's flight to its slot. Its speed peaks ON a beat (CUE.fly, where the whoosh apex goes) and
// it arrives at rest on the act seam: solve the start from where this curve peaks.
const FLY_EASE = E.rest;
const PEAK_AT = peak(0, 1000, FLY_EASE) / 1000; // fraction of the move where speed peaks
/** The dot's flight (absolute frames) and its curve, for src/sync.ts: peak(from, to, ease) === CUE.fly. */
export const DOT_TRAVEL = { from: Math.round(CUE.handoff - (CUE.handoff - CUE.fly) / (1 - PEAK_AT)), to: CUE.handoff, ease: FLY_EASE };
if (L(DOT_TRAVEL.from) < OUT + f60(12)) throw new Error('Act1: the dot would fly before the line has begun to leave; move CUE.fly later or CUE.exit earlier');

export const Act1: React.FC = () => {
  const f = useCurrentFrame();
  const disp = TYPE.display;

  // Layout from the real font: the display size, shrunk only if the finished line and its period
  // would leave the safe width. The measured width ends one (negative) tracking short of the last
  // glyph; add it back.
  const unit = measureTracked(LINE, 100, disp.weight, disp.track) / 100 - disp.track;
  const size = Math.min(disp.size * U, (W - 2 * SAFE.x) / (unit + DOT.gap + DOT.d));
  const tail = (DOT.gap + DOT.d) * size; // the period's room, kept free at the end of the line
  const lay = chainLayout('statement', { role: 'display', size, tail });
  const last = lay.frags.length - 1;
  const base = lay.top + baselineOf(size, disp.weight, disp.lead);
  const period = { x: lay.lineLeft[last] + lay.width[last] + (DOT.gap + DOT.d / 2) * size, y: base - (DOT.d * size) / 2 };

  // Camera: a slow creep about frame centre from frame 0 (linear, so the first frame already moves),
  // until the dot leaves the line's world for its slot.
  const cam = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: lmix(1, CREEP, prog(f, 0, L(DOT_TRAVEL.from), E.linear)) };

  // The device: born at the top of its fall, lands on the beat and squashes against the baseline,
  // waits as the period, then flies. As the period it follows the line's camera; in flight it
  // leaves that camera for its slot, which Act 2 opens on with no camera at all.
  const born = prog(f, FALL.from, FALL.from + f60(6), E.smooth);
  const fall = prog(f, FALL.from, FALL.to, E.contact);
  const sq = squash(f - FALL.to);
  const fly = prog(f, L(DOT_TRAVEL.from), L(DOT_TRAVEL.to), DOT_TRAVEL.ease);
  const onScreen = toScreen(cam, { x: period.x, y: period.y - (1 - fall) * FALL.em * size });
  const cx = mix(onScreen.x, DOT_SLOT.x, fly);
  const cy = mix(onScreen.y, DOT_SLOT.y, fly);
  const k = lmix(DOT.d * size * cam.k, DOT_SLOT.d, fly) / DOT_SLOT.d; // diameter in log space; k = 1 in the slot
  const unitPx = (HERO.size / 100) * k;

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
      <div style={camera(cam)}>
        <Chain chain="statement" frame={f} from={ACT.statement.from} role="display" size={size} tail={tail} />
      </div>
      {born > 0 && (
        <Mark
          size={HERO.size}
          only={['D']}
          d={{ sx: sq.across, sy: sq.along, origin: [MARK.D.cx, MARK.D.cy + MARK.D.r], o: born }}
          style={placeMark(cx - MARK.D.cx * unitPx, cy - MARK.D.cy * unitPx, k)}
        />
      )}
    </AbsoluteFill>
  );
};
