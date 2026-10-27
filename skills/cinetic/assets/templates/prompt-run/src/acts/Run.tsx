import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, U } from '../brand/tokens';
import { StepList } from '../fx/Loaders';
import { ThinkingDots } from '../fx/MicroUI';
import { Bubble, face } from '../kit';
import { E, prog } from '../lib/anim';
import { ACT, CUE, f60x, H, STEPS, W } from '../timeline';
import { RUN } from '../run';
import { PAGE, useAbs } from './stage';

// RUN - the product working. The request rises in as the user's bubble, continuing the whip's upward speed (106 px in
// 12 f on an expo-out); a status line with dots that breathe; the steps tick in on an accelerating cadence, each new
// row rising inside the stack, its spinner turning to a check a beat later, the last one still running when the act
// cuts (fx/Loaders StepList: rise, pending).

/** The run's layout at 1080p, built for film (every web size x1.9): the margins, the bubble's top and type, the status and the list's tops, the step type. */
export const RUN_LAYOUT = { left: 300, right: 300, bubble: 190, bubbleType: 52, status: 410, list: 500, type: 60, rowH: 106, rise: 22 } as const;

/** The step list's props (the done act carries the last row into the result). */
export const stepProps = () => ({
  rows: RUN.steps.map((_, i) => ({ at: STEPS[i], ...(i === RUN.steps.length - 1 ? { pending: true } : {}) })),
  rowH: RUN_LAYOUT.rowH,
  rise: RUN_LAYOUT.rise,
  window: 5,
});

export const RunShot: React.FC<{ F: number }> = ({ F }) => {
  const enter = 106 * U * (1 - prog(F, ACT.run.from, ACT.run.from + f60x(12), E.snapOut));
  const lift = 60 * U * prog(F, CUE.step3, CUE.pending, E.stdInOut); // the view rises as the list grows
  const status = prog(F, CUE.status, CUE.status + f60x(12), E.snapOut);
  const ui = RUN_LAYOUT.type * U;
  const x0 = RUN_LAYOUT.left * U;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(0, ${(enter - lift).toFixed(2)}px, 0)` }}>
      <div style={{ position: 'absolute', right: RUN_LAYOUT.right * U, top: RUN_LAYOUT.bubble * U }}>
        <Bubble theme={PAGE} text={RUN.request} size={RUN_LAYOUT.bubbleType * U} maxW={1250 * U} id="request" />
      </div>
      {F >= CUE.status && (
        <div data-ui style={{ position: 'absolute', left: x0, top: RUN_LAYOUT.status * U, display: 'flex', alignItems: 'center', gap: ui * 0.4, opacity: status }}>
          <span data-text="status" style={face(ui, 500, PAGE.accent, -0.01)}>
            {RUN.status}
          </span>
          <ThinkingDots frame={F} start={CUE.status} size={ui * 0.22} color={PAGE.accent} />
        </div>
      )}
      <StepList
        frame={F}
        {...stepProps()}
        labels={RUN.steps.map((s) => ({ verb: s.verb, detail: s.detail }))}
        x={x0}
        y={RUN_LAYOUT.list * U}
        width={W - x0 - RUN_LAYOUT.right * U}
        font={{ size: ui, weight: 500, family: FONT.text }}
        colors={{ ink: PAGE.text, mute: PAGE.mute, accent: PAGE.accent, ground: PAGE.surface }}
      />
    </div>
  );
};

export const Run: React.FC = () => {
  const F = useAbs('run');
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <RunShot F={F} />
    </AbsoluteFill>
  );
};
