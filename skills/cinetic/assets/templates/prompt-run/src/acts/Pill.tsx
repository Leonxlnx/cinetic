import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { spinRim } from '../fx/BorderBleed';
import { DepthStack, type DepthItem, depthPush } from '../fx/DepthStack';
import { scatterState } from '../fx/Gather';
import { surfaceShadow, ringSlots, tileArrival } from '../kit';
import { clamp, E, mix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, DEAL, f60x, H, W } from '../timeline';
import { RUN } from '../run';
import { Ground, Line, lineSize, lineWidth, PAGE, ToolTile, useAbs } from './stage';

// PILL - one container. The label (what the product is) arrives inside a pill on the film's voice, with the tools it
// really connects round it as app-icon tiles (their real marks: kit AppIcon). The first label drops out of the pill
// before the kick; on the kick the second label lands and the pill re-fits it on a glide; its rim starts to turn (a
// conic of the accent's tints: the product is listening, fx/BorderBleed spinRim). On the last half-beat the pill winds
// up 20 % wider on a cubic-in that runs on to the act line, and the next act opens out of it while it still moves. The tools move by the deal's device:
//   ring  the tiles tumble in round the pill (kit ringSlots + tileArrival) and orbit slowly, the far side smaller and
//         softer; on the kick they fly off along their own vectors (quad-in, growing x1.45: fx/Gather scatterState)
//   dock  the tiles tumble in the same way; on the kick they fly into the pill and dock at its left end as a row of
//         overlapping marks, the second label set beside them: the tools inside the line
//   wall  the tiles stand on the far plane of a depth stack behind the pill (fx/DepthStack: smaller, soft, the wall
//         turned), one crossing the near plane cropped by the frame edge; the camera pushes through the stack

/** The pill at 1080p: its height per line size, the label's padding, the tiles, the ring, the rim, the wind-up, the dock. */
export const PILL = { h: 1.95, pad: 0.72, tile: 160, ringX: 250, ringY: 300, rim: 4, windup: 0.2, refit60: 24, dock: 0.58, overlap: 0.3 } as const;

/** The docked row's width at pill height h (dock device): one chip per tool, overlapping. */
const dockWidth = (h: number) => {
  const c = h * PILL.dock;
  return c + (RUN.tools.length - 1) * c * (1 - PILL.overlap) + h * 0.22;
};

/** The pill's state at absolute frame F (the ask act draws it again under the iris or stretches it into the box). */
export const pillState = (F: number) => {
  const a = copy('what');
  const b2 = copy('ask');
  const size = Math.min(lineSize(a.text, 0.62), lineSize(b2.text, 0.56));
  const h = PILL.h * size;
  const wA = lineWidth(a.text, size) + 2 * PILL.pad * size;
  const wB = lineWidth(b2.text, size) + 2 * PILL.pad * size + (DEAL.open === 'dock' ? dockWidth(h) : 0);
  const refit = prog(F, CUE.kick - f60x(6), CUE.kick + f60x(PILL.refit60), E.glideOut);
  // the wind-up runs on to the act line, still accelerating when the next act opens out of it (never a dead stop)
  const wind = prog(F, CUE.windup, ACT.ask.from, E.linear) ** 3;
  const w = mix(wA, wB, refit) * (1 + PILL.windup * wind);
  return { size, w, h, swapped: F >= CUE.kick, refit, x: W / 2, y: H / 2 };
};

/** Where tool i rests on the ring round the pill at frame F (a slow orbit), and its depth (0 near, 1 far). */
const ringAt = (F: number, i: number, wA: number) => {
  const slots = ringSlots(RUN.tools.length, { rx: wA / 2 + PILL.ringX * U, ry: PILL.ringY * U, w: W, h: H, turn: (6 * Math.PI * (F / 60)) / 180 + 0.3, seed: `${RUN.name}:ring` });
  return slots[i];
};

/** The tools round the pill (ring and dock devices): tumbling in, orbiting, and on the kick flying off or docking. */
const RingTools: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const p = pillState(F);
  const wA = pillState(CUE.what).w;
  const tile = PILL.tile * U;
  const fly = scatterState(F, { at: CUE.kick, items: RUN.tools.map((_, i) => { const s = ringAt(CUE.kick, i, wA); const a = Math.atan2(s.y - H / 2, s.x - W / 2); return { vx: Math.cos(a) * (760 + 80 * (i % 3)) * U, vy: Math.sin(a) * (560 + 60 * (i % 2)) * U, delay: (i % 3) * 1.5 }; }) }, film);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, perspective: `${(1900 * U).toFixed(0)}px` }}>
      {RUN.tools.map((_, i) => {
        const s = ringAt(Math.min(F, CUE.kick), i, wA);
        const arrive = tileArrival(F, ACT.pill.from + f60x(4 * i), { dur: 30, tilt: s.tilt, depthPx: 520 * U, dropPx: 70 * U, fps: film.fps });
        const depthK = mix(1, 0.72, s.depth);
        let x = s.x;
        let y = s.y + arrive.y;
        let k = depthK;
        let o = arrive.opacity;
        if (DEAL.open === 'dock') {
          // the dock: each tile glides into its chip slot at the pill's left end, shrinking to the chip, 3 f apart
          const d = prog(F, CUE.kick + f60x(3 * i), CUE.kick + f60x(3 * i + 26), E.glideOut);
          const c = p.h * PILL.dock;
          const tx = p.x - p.w / 2 + PILL.pad * p.size * 0.7 + c / 2 + i * c * (1 - PILL.overlap);
          x = mix(s.x, tx, d);
          y = mix(s.y, p.y, d);
          k = mix(depthK, c / tile, d);
          if (d >= 1) return null; // docked: the pill draws the row
        } else {
          const f = fly[i];
          if (f.gone) return null;
          x += f.dx;
          y += f.dy;
          k *= f.scale;
          o *= f.opacity;
        }
        return (
          <div key={i} data-ui style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((1 - s.depth) * 10), opacity: o, transform: `translate3d(${(x - tile / 2).toFixed(2)}px, ${(y - tile / 2).toFixed(2)}px, ${arrive.z.toFixed(1)}px) rotateX(${arrive.rx.toFixed(2)}deg) rotateY(${arrive.ry.toFixed(2)}deg) scale(${k.toFixed(4)})` }}>
            <ToolTile i={i} size={tile} lift={mix(48, 16, arrive.p)} />
          </div>
        );
      })}
    </div>
  );
};

/** The wall device: the tools on the far plane of a depth stack behind the pill, one soft tile crossing the near plane. */
const WallTools: React.FC<{ F: number }> = ({ F }) => {
  const tile = 260 * U;
  const n = RUN.tools.length;
  const spots = [{ x: 330, y: 250 }, { x: 960, y: 170 }, { x: 1590, y: 250 }, { x: 420, y: 860 }, { x: 1500, y: 880 }, { x: 960, y: 930 }, { x: 150, y: 560 }];
  const far: DepthItem[] = Array.from({ length: n }, (_, k) => ({ id: `far${k}`, plane: 'far', carries: 'icon', x: spots[k].x * U, y: spots[k].y * U, w: tile, h: tile, r: tile * 0.23, at: ACT.pill.from + f60x(4 * k) }));
  const near: DepthItem[] = [{ id: `near${n}`, plane: 'near', carries: 'icon', x: 1820 * U, y: 960 * U, w: tile, h: tile, at: ACT.pill.from + f60x(10) }];
  return (
    <DepthStack
      frame={F}
      items={[...far, ...near]}
      cam={{ moves: depthPush(ACT.pill.from, { frames: ACT.pill.dur, zoom: 1.12, pan: -40 * U, yaw: 4 }) }}
      rim
      render={(id) => {
        const k = Number(id.replace(/\D/g, ''));
        return <ToolTile i={k % n} size={tile} lift={24} />;
      }}
    />
  );
};

/** The pill: its rim (turning from the kick), its face, the docked marks (dock device), the label on the film's voice. */
export const PillBody: React.FC<{ F: number; p?: ReturnType<typeof pillState> }> = ({ F, p = pillState(F) }) => {
  const film = useFilm();
  const a = copy('what');
  const b2 = copy('ask');
  const rim = PILL.rim * U;
  const dock = DEAL.open === 'dock' ? dockWidth(p.h) * p.refit : 0;
  const c = p.h * PILL.dock;
  const born = prog(F, ACT.pill.from, ACT.pill.from + f60x(30), E.glideOut);
  const k = mix(0.86, 1, born);
  return (
    <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, borderRadius: p.h / 2, boxShadow: surfaceShadow(PAGE, 30, U), opacity: clamp(born * 2.5), transform: `translate3d(${(p.x - p.w / 2).toFixed(2)}px, ${(p.y - p.h / 2).toFixed(2)}px, 0) scale(${k.toFixed(4)})`, background: p.swapped ? spinRim(F, CUE.kick, [PAGE.accent, PAGE.accentSoft, PAGE.accentDeep, PAGE.accentSoft], {}, film) : PAGE.line }}>
      <div style={{ position: 'absolute', inset: rim, borderRadius: p.h / 2, background: PAGE.surface, overflow: 'hidden' }}>
        {DEAL.open === 'dock' && F >= CUE.kick &&
          RUN.tools.map((_, i) => {
            const d = prog(F, CUE.kick + f60x(3 * i + 20), CUE.kick + f60x(3 * i + 26), E.linear);
            if (d <= 0) return null;
            const x = PILL.pad * p.size * 0.7 + i * c * (1 - PILL.overlap) - rim;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, zIndex: 10 - i, transform: `translate3d(${x.toFixed(2)}px, ${((p.h - c) / 2 - rim).toFixed(2)}px, 0)` }}>
                <ToolTile i={i} size={c} lift={6} />
              </div>
            );
          })}
        <Line id={a.id} F={F} x={p.w / 2 - rim} y={p.h / 2 - rim} size={p.size} weight={TYPE.line.weight} />
        <Line id={b2.id} F={F} x={(p.w + dock) / 2 - rim} y={p.h / 2 - rim} size={p.size} weight={TYPE.line.weight} />
      </div>
    </div>
  );
};

/** The open's slow push: the whole shot creeps 5 % over the act, so the reads are never a held frame. */
export const pillPush = (F: number) => 1 + 0.05 * prog(F, ACT.pill.from, ACT.ask.from, E.linear);

export const PillShot: React.FC<{ F: number }> = ({ F }) => (
  <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
    <Ground act="pill" F={F} />
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${pillPush(F).toFixed(5)})` }}>
      {DEAL.open === 'wall' ? <WallTools F={F} /> : <RingTools F={F} />}
      <PillBody F={F} />
    </div>
  </AbsoluteFill>
);

export const Pill: React.FC = () => {
  const F = useAbs('pill');
  return <PillShot F={F} />;
};
