import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { DepthStack, type DepthItem, depthPush } from '../fx/DepthStack';
import { Lit } from '../fx/Lit';
import { Spinner, StepCheck } from '../fx/Loaders';
import { ThinkingDots } from '../fx/MicroUI';
import { AvatarStack, Bubble, DenseScreen, face, filmWorld, surfaceShadow } from '../kit';
import { clamp, E, prog } from '../lib/anim';
import { camera3d, camPath, type Shot, swing3d } from '../lib/camera';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { ACT, CUE, DEAL, f60, f60x, H, STEPS, W } from '../timeline';
import { RUN } from '../run';
import { Ground, GROUNDS, PAGE, useAbs } from './stage';

/** The split run's live screen: the product's own rows (run.ts screen). */
const WORLD = filmWorld(RUN.screen);

// RUN - the product working, under the film's one 3D turn. The whip is carried in: everything arrives still rising
// (106 px over 12 f on an expo-out). The request is the user's bubble with the people it is for (their real portraits,
// run.ts photos.people, else their initials: kit AvatarStack); a status line with dots that breathe; the steps check in on an accelerating cadence, each row
// gliding up into place solid (16 f at 60 fps on E.glideOut: no half-faded rows), its spinner turning to a check a
// beat later, the last still running when the act cuts. The deal's device:
//   list   the run in one lit panel (fx/Lit, tilted in the film's light) that the camera swings round to face
//          (lib/camera swing3d: 22 degrees of yaw)
//   stack  each step a card landing in the mid plane of a depth stack (fx/DepthStack), the camera pushing through it
//          on a turn
//   split  the run beside the product's own screen (kit DenseScreen, the product's records, one row readable at a
//          time, the lens moving to the row each step touches), the camera swinging round the hinge between them

/** The run's layout at 1080p (every web size x1.9): the panel, the bubble, the status, the rows. */
/** The people the work is for: a real portrait each (run.ts photos.people), else their initials (the product's own fallback). */
const FACES = RUN.people.map((p, i) => ({ initials: p.replace(/[[\]]/g, ''), seed: `${RUN.name}:${p}`, src: (RUN.photos.people as readonly string[])[i] ? staticFile((RUN.photos.people as readonly string[])[i]) : undefined }));
export const RUN_LAYOUT = { panel: { w: 1300, h: 800 }, pad: 70, bubbleType: 46, status: 230, list: 330, type: 52, rowH: 96, rise: 24, glide60: 16, avatar: 52 } as const;

/** When step i checks (the next step's onset plus 10 f), or null for the last (still running when the act cuts). */
const doneAt = (i: number): number | null => (i < RUN.steps.length - 1 ? STEPS[i + 1] + f60(10) : null);

/** A step row's state at frame F: shown, its glide (0-1), its spinner angle, its check. Pure. */
export const rowState = (F: number, i: number, fps: number) => {
  const at = STEPS[i];
  const g = prog(F, at, at + f60x(RUN_LAYOUT.glide60, fps), E.glideOut);
  const d = doneAt(i);
  const check = d === null ? 0 : prog(F, d, d + f60x(8, fps), E.glideOut);
  return { shown: F >= at, g, o: clamp((F - at) / f60x(5, fps)), spin: ((F - at) * 20 * 60) / fps, check, running: d === null || F < d };
};

/** The rows of the run: the verb in the accent while it runs, then ink; the detail in the mute; a spinner turning to a check. */
const Rows: React.FC<{ F: number; w: number; type?: number; rowH?: number }> = ({ F, w, type = RUN_LAYOUT.type * U, rowH = RUN_LAYOUT.rowH * U }) => {
  const film = useFilm();
  const icon = type * 0.82;
  return (
    <>
      {RUN.steps.map((s, i) => {
        const r = rowState(F, i, film.fps);
        if (!r.shown) return null;
        const y = i * rowH + (1 - r.g) * RUN_LAYOUT.rise * U;
        return (
          <div key={i} data-ui style={{ position: 'absolute', left: 0, top: 0, width: w, height: rowH, display: 'flex', alignItems: 'center', gap: type * 0.5, opacity: r.o, transform: `translate3d(0, ${y.toFixed(2)}px, 0)` }}>
            <div style={{ position: 'relative', width: icon, height: icon, flex: 'none' }}>
              {r.check < 1 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - r.check }}><Spinner size={icon} color={PAGE.accent} angle={r.spin} /></div>}
              {r.check > 0 && <div style={{ position: 'absolute', inset: 0 }}><StepCheck size={icon} fill={PAGE.accent} tick={PAGE.accentInk} k={r.check} /></div>}
            </div>
            <span data-text={`step${i + 1}`} style={{ ...face(type, 600, mixColor(PAGE.accent, PAGE.text, r.check)), whiteSpace: 'pre' }}>
              {s.verb}
              <span style={{ fontWeight: 450, color: PAGE.mute }}> {s.detail}</span>
            </span>
          </div>
        );
      })}
    </>
  );
};

/** The head of the run: the request as the user's bubble, the people it is for, the status with breathing dots. */
const Head: React.FC<{ F: number; w: number }> = ({ F, w }) => {
  const status = prog(F, CUE.status, CUE.status + f60x(14), E.glideOut);
  const people = prog(F, CUE.bubble + f60x(10), CUE.bubble + f60x(30), E.glideOut);
  const ui = RUN_LAYOUT.type * U;
  const av = RUN_LAYOUT.avatar * U;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 * U }}>
        <Bubble theme={PAGE} text={RUN.request} size={Math.min(RUN_LAYOUT.bubbleType * U, (w * 0.9) / (RUN.request.length * 0.52))} maxW={w * 0.92} id="request" />
        <div style={{ opacity: people, transform: `translate3d(0, ${((1 - people) * 14 * U).toFixed(2)}px, 0)` }}>
          <AvatarStack theme={PAGE} people={FACES} size={av} ring={PAGE.surface} kind="monogram" />
        </div>
      </div>
      {F >= CUE.status && (
        <div data-ui style={{ position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: ui * 0.4, opacity: status, transform: `translate3d(${((1 - status) * -20 * U).toFixed(2)}px, ${(RUN_LAYOUT.status * U).toFixed(2)}px, 0)` }}>
          <span data-text="status" style={face(ui, 550, PAGE.accent, -0.01)}>{RUN.status}</span>
          <ThinkingDots frame={F} start={CUE.status} size={ui * 0.22} color={PAGE.accent} />
        </div>
      )}
    </>
  );
};

/** The run's content in a panel w x h (list and split): the head, then the rows. */
export const RunContent: React.FC<{ F: number; w: number }> = ({ F, w }) => (
  <>
    <Head F={F} w={w} />
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(0, ${(RUN_LAYOUT.list * U).toFixed(2)}px, 0)` }}>
      <Rows F={F} w={w} />
    </div>
  </>
);

/** The film's one 3D turn on this act: a swing round a vertical hinge, landing nearly front-on and creeping on. */
export const runCamera = (F: number) => {
  const sw = swing3d({ at: ACT.run.from, frames: f60x(110), from: -26, to: -4, zoom: 1.06 });
  const base: Shot = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1, ...sw.start };
  return camPath(F, base, sw.moves);
};

/** The whip carried in: the shot arrives still rising, decaying on an expo-out. */
export const carryIn = (F: number) => 106 * U * (1 - prog(F, ACT.run.from, ACT.run.from + f60x(12), E.snapOut));

/** The list device's panel geometry (the done act grows its last row into the result card). */
export const PANEL = () => ({ w: RUN_LAYOUT.panel.w * U, h: RUN_LAYOUT.panel.h * U, x: W / 2, y: H / 2 + 10 * U });

/** The list or split shot at frame F (the done act draws it lifting away). */
export const RunShot: React.FC<{ F: number }> = ({ F }) => {
  const enter = carryIn(F);
  const shot = runCamera(F);
  const P = PANEL();
  const pad = RUN_LAYOUT.pad * U;
  if (DEAL.run === 'stack') return <StackShot F={F} />;
  const split = DEAL.run === 'split';
  const pw = split ? P.w * 0.62 : P.w;
  const px = split ? W / 2 - (P.w * 0.6) / 2 - 20 * U : P.x;
  const focusRows = RUN.steps.map((_, i) => ({ at: STEPS[i] + f60(4), row: i }));
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0, ${enter.toFixed(2)}px, 0)` }}>
      <div style={{ ...camera3d(shot), width: W, height: H }}>
        <Lit frame={F} x={px} y={P.y} w={pw} h={P.h} r={30 * U} ground={GROUNDS.run.base} id="run">
          <div style={{ position: 'absolute', inset: 0, borderRadius: 30 * U, background: PAGE.surface, boxShadow: surfaceShadow(PAGE, 18, U), overflow: 'hidden' }}>
            {/* split: the run's content at 80 % (the panel is narrower), so every row and the bubble stay whole */}
            <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate3d(${pad}px, ${pad}px, 0) scale(${split ? 0.8 : 1})` }}>
              <RunContent F={F} w={(pw - 2 * pad) / (split ? 0.8 : 1)} />
            </div>
          </div>
        </Lit>
        {split && (
          <Lit frame={F} x={W / 2 + (P.w * 0.62) / 2 + 40 * U} y={P.y + 30 * U} w={P.w * 0.62} h={P.h * 0.9} r={26 * U} ground={GROUNDS.run.base} id="screen">
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26 * U, overflow: 'hidden', background: PAGE.surface }}>
              <DenseScreen frame={F} theme={PAGE} world={WORLD} layout="table" w={P.w * 0.62} h={P.h * 0.9} scale={0.7} view={0.95} focus={focusRows} drawAt={ACT.run.from} lift={0} />
            </div>
          </Lit>
        )}
      </div>
    </div>
  );
};

/** The stack device: the head on the near side, each step a card landing in the mid plane of a depth stack. */
const StackShot: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const enter = carryIn(F);
  const cw = 1040 * U;
  const ch = 150 * U;
  const ui = RUN_LAYOUT.type * U;
  const mid = (RUN.steps.length - 1) / 2;
  const cards: DepthItem[] = RUN.steps.map((_, i) => ({ id: `step${i}`, plane: 'mid', carries: 'ui', x: W / 2 + (i - mid) * 40 * U, y: H / 2 + 150 * U + (i - mid) * 150 * U, w: cw, h: ch, r: ch * 0.24, at: STEPS[i] }));
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0, ${enter.toFixed(2)}px, 0)` }}>
      <DepthStack
        frame={F}
        items={cards}
        cam={{ moves: depthPush(ACT.run.from, { frames: ACT.run.dur * 0.9, zoom: 1.16, pan: -50 * U, yaw: 16 }) }}
        rim
        render={(id) => {
          const i = Number(id.slice(4));
          const r = rowState(F, i, film.fps);
          return (
            <div style={{ width: cw, height: ch, borderRadius: ch * 0.24, background: PAGE.surface, display: 'flex', alignItems: 'center', gap: ui * 0.6, padding: `0 ${ui}px`, boxSizing: 'border-box' }}>
              <div style={{ position: 'relative', width: ui, height: ui, flex: 'none' }}>
                {r.check < 1 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - r.check }}><Spinner size={ui} color={PAGE.accent} angle={r.spin} /></div>}
                {r.check > 0 && <div style={{ position: 'absolute', inset: 0 }}><StepCheck size={ui} fill={PAGE.accent} tick={PAGE.accentInk} k={r.check} /></div>}
              </div>
              <span data-text={`step${i + 1}`} style={{ ...face(ui, 600, mixColor(PAGE.accent, PAGE.text, r.check)), whiteSpace: 'pre' }}>
                {RUN.steps[i].verb}
                <span style={{ fontWeight: 450, color: PAGE.mute }}> {RUN.steps[i].detail}</span>
              </span>
            </div>
          );
        }}
      />
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, transform: `translate3d(0, ${(120 * U).toFixed(2)}px, 0)`, display: 'flex', justifyContent: 'center' }}>
        <Bubble theme={PAGE} text={RUN.request} size={RUN_LAYOUT.bubbleType * U} maxW={1200 * U} id="request" />
      </div>
      {/* the status on the left over the stack, the people it is for on the right, both under the bubble */}
      <div style={{ position: 'absolute', left: 0, top: 0, opacity: prog(F, CUE.status, CUE.status + f60x(14), E.glideOut), transform: `translate3d(${(W / 2 - 520 * U).toFixed(2)}px, ${(262 * U).toFixed(2)}px, 0)`, display: 'flex', alignItems: 'center', gap: ui * 0.4 }}>
        {F >= CUE.status && <span data-text="status" style={face(ui * 0.9, 550, PAGE.accent, -0.01)}>{RUN.status}</span>}
        {F >= CUE.status && <ThinkingDots frame={F} start={CUE.status} size={ui * 0.2} color={PAGE.accent} />}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, opacity: prog(F, CUE.bubble + f60x(10), CUE.bubble + f60x(30), E.glideOut), transform: `translate3d(${(W / 2 + 360 * U).toFixed(2)}px, ${(244 * U).toFixed(2)}px, 0)` }}>
        <AvatarStack theme={PAGE} people={FACES} size={64 * U} ring={PAGE.surface} kind="monogram" />
      </div>
    </div>
  );
};

export const Run: React.FC = () => {
  const F = useAbs('run');
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <Ground act="run" F={F} />
      <RunShot F={F} />
    </AbsoluteFill>
  );
};
