import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { spinRim } from '../fx/BorderBleed';
import { scatterState } from '../fx/Gather';
import { GlyphTile, surfaceShadow } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ACT, copy, CUE, f60x, H, W } from '../timeline';
import { RUN } from '../run';
import { Inked, lineSize, lineWidth, PAGE, useAbs } from './stage';

// PILL - one container. The label (what the product is) is written by a front inside a pill, with the tools it
// connects round it, drifting. On the kick the tools leave along their own vectors (quad-in, growing x1.45, fx/Gather
// scatterState), the label swaps to the second line and the pill re-fits it on a front-loaded curve; the rim starts
// to turn (a conic of the accent's tints, fx/BorderBleed spinRim). On the last half-beat the pill winds up, widening 20 % on a cubic-in, and
// the iris opens out of it on the act line.

/** The pill at 1080p: its height, the label's padding, the tools' ring and the rim. */
export const PILL = { h: 150, pad: 0.75, tile: 112, ringX: 190, ringY: 250, rim: 4, windup: 0.2, windup60: 9 } as const;

/** The pill's state at absolute frame F (the ask act draws it again under the iris). */
export const pillState = (F: number) => {
  const a = copy('what');
  const b2 = copy('ask');
  const size = Math.min(lineSize(a.text, 0.6), lineSize(b2.text, 0.6));
  const wA = lineWidth(a.text, size, 500) + 2 * PILL.pad * size;
  const wB = lineWidth(b2.text, size, 500) + 2 * PILL.pad * size;
  const refit = prog(F, CUE.kick, CUE.kick + f60x(16), E.snapOut);
  const wind = (prog(F, CUE.windup, CUE.windup + f60x(PILL.windup60), E.linear)) ** 3;
  const w = mix(wA, wB, refit) * (1 + PILL.windup * wind);
  return { size, w, h: PILL.h * U, swapped: F >= CUE.kick };
};

export const PillShot: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const p = pillState(F);
  const a = copy('what');
  const b2 = copy('ask');
  const n = RUN.tools.length;
  const tile = PILL.tile * U;
  const ring = RUN.tools.map((_, i) => {
    const ang = (i / n) * Math.PI * 2 + 0.35 + F * 0.004;
    return { x: Math.cos(ang) * (p.w / 2 + PILL.ringX * U), y: Math.sin(ang) * PILL.ringY * U, ang };
  });
  const fly = scatterState(F, { at: CUE.kick, items: ring.map((r, i) => ({ vx: Math.cos(r.ang) * (700 + 90 * (i % 3)) * U, vy: Math.sin(r.ang) * (520 + 70 * (i % 2)) * U, delay: (i % 3) * 1.5 })) }, film);
  const rim = PILL.rim * U;
  const cx = W / 2;
  const cy = H / 2;
  const t = p.swapped ? b2 : a;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      {ring.map((r, i) => {
        const f = fly[i];
        if (f.gone) return null;
        const born = prog(F, ACT.pill.from + f60x(4 * i), ACT.pill.from + f60x(4 * i + 14), E.snapOut);
        return (
          <div key={i} data-ui style={{ position: 'absolute', left: cx + r.x + f.dx - tile / 2, top: cy + r.y + f.dy - tile / 2, opacity: f.opacity * Math.min(1, born * 2), transform: `scale(${(f.scale * mix(0.7, 1, born)).toFixed(4)})` }}>
            <GlyphTile theme={PAGE} name={RUN.tools[i]} size={tile} />
          </div>
        );
      })}
      <div data-ui style={{ position: 'absolute', left: cx - p.w / 2, top: cy - p.h / 2, width: p.w, height: p.h, borderRadius: p.h / 2, boxShadow: surfaceShadow(PAGE, 30, U), background: p.swapped ? spinRim(F, CUE.kick, [PAGE.accent, PAGE.accentSoft, PAGE.accentDeep, PAGE.accentSoft], {}, film) : PAGE.line }}>
        <div style={{ position: 'absolute', inset: rim, borderRadius: p.h / 2, background: PAGE.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Inked key={t.id} id={t.id} text={t.text} F={F} at={t.in} size={p.size} weight={500} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Pill: React.FC = () => {
  const F = useAbs('pill');
  return <PillShot F={F} />;
};
