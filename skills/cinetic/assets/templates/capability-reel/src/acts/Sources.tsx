import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { Words } from '../fx/Words';
import { AppIcon, Chip, hasLogo, LogoChip } from '../kit';
import { clamp, E, mix, prog, track } from '../lib/anim';
import { phraseOnsets } from '../lib/cadence';
import { mixColor } from '../lib/color';
import { creep } from '../lib/handoff';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { REEL } from '../reel';
import { LIGHT, lineSize, useAbs } from './stage';

/** The sources' chips pop on in groups with a breath between them (lib/cadence; sync.ts sounds the same onsets), the span of a 6 f stagger. */
export const CHIP_AT = phraseOnsets(CUE.chips, REEL.sources.length, f60x(6), { shape: 'group', seed: 'sources' });

// SOURCES - one line in the middle of a ring of sources: the line arrives word by word, the sources pop in round it
// on a stagger and orbit slowly. Then the ring tightens fast (most of the way in a few frames) on the same paper (the
// film keeps one ground until the claim: at most two colour events a film), the sources shrink out one by one, the outer ring stretches into a stadium and the inner ring closes into a disc: the record grows
// out of that disc in the next act. The sources are their real marks: app-icon tiles when every source has one
// (scripts/logos.mjs), a mark and its name on a pill for one that has, the text pill for one that has not.

/** The ring the sources sit on (px at 1080p, about the frame centre) and the inner ring that becomes the disc. */
export const RING = { rx: 700 * U, ry: 360 * U, inner: { rx: 470 * U, ry: 210 * U }, disc: 80 * U, clear: 28 } as const;

/** A source's angle on the ring (radians): half of them on the upper arc, half on the lower, none within RING.clear degrees of the line's axis. */
const angleOf = (i: number, n: number) => {
  const top = Math.ceil(n / 2);
  const span = 180 - 2 * RING.clear;
  const k = i < top ? i : i - top;
  const m = i < top ? top : n - top;
  const deg = (i < top ? -180 + RING.clear : RING.clear) + (m > 1 ? (k * span) / (m - 1) : span / 2);
  return (deg * Math.PI) / 180;
};
const CHIP_H = 76 * U;
const TILE = 124 * U;
/** Every source has its real mark: the ring is app-icon tiles (no names: the marks say them). */
const TILES = REEL.sources.every((s) => hasLogo(s.logo));

export const Sources: React.FC = () => {
  const F = useAbs('sources');
  const t = LIGHT;
  const c = copy('sources');
  const size = lineSize(c.text, 'line', 0.8);
  const dark = prog(F, CUE.darken, CUE.darken + f60x(12), E.softOut); // the ring tightens: most of it in the first frames (the paper stays)
  const close = prog(F, CUE.disc - f60x(8), ACT.record.from, E.buildIn); // the inner ring closes into the disc
  const k = creep(F, 0, { pctPerSec: 0.03 }, FPS);
  const orbit = ((F - CUE.chips) / FPS) * 0.035; // radians a second: a slow orbit
  const n = REEL.sources.length;
  const ground = t.ground;
  const ringColour = mixColor(t.line, t.mute, 0.35 * dark); // the ring firms as it tightens
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `scale(${k.toFixed(5)})` }}>
        {/* the outer ring stretching into a stadium as it tightens; the inner ring closing into the disc (the record card's own fill) */}
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden>
          <rect x={W / 2 - RING.rx * mix(1, 1.5, dark)} y={H / 2 - RING.ry * mix(1, 0.42, dark)} width={2 * RING.rx * mix(1, 1.5, dark)} height={2 * RING.ry * mix(1, 0.42, dark)} rx={RING.ry * mix(1, 0.42, dark)} fill="none" stroke={ringColour} strokeWidth={2 * U} opacity={1 - clamp((dark - 0.6) / 0.4)} />
          <ellipse cx={W / 2} cy={H / 2} rx={mix(RING.inner.rx, RING.disc, close)} ry={mix(RING.inner.ry, RING.disc, close)} fill={t.raised} fillOpacity={close} stroke={ringColour} strokeWidth={2 * U} />
        </svg>
        {REEL.sources.map((s, i) => {
          const at = CHIP_AT[i];
          if (F < at) return null;
          const a = angleOf(i, n) + orbit;
          const pop = prog(F, at, at + f60x(10), E.snapOut);
          const out0 = CUE.darken + f60x(2) * i; // each shrinks out on its own frame (lint-ok: a 2 f sweep of exits, not a reveal)
          const shrink = track(F, [[out0, 1], [out0 + f60x(2), 0.95], [out0 + f60x(4), 0.88], [out0 + f60x(6), 0.74], [out0 + f60x(8), 0.45], [out0 + f60x(9), 0]]);
          if (shrink <= 0) return null;
          const x = W / 2 + Math.cos(a) * RING.rx;
          const y = H / 2 + Math.sin(a) * RING.ry;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: clamp(pop * 1.4), transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${(mix(1.25, 1, pop) * shrink).toFixed(4)})` }}>
              {TILES ? (
                <AppIcon logo={s.logo} size={TILE} theme={t} lift={mix(40, 18, pop)} />
              ) : hasLogo(s.logo) ? (
                <LogoChip theme={t} logo={s.logo!} label={s.label} h={CHIP_H} id={`source-${i}`} />
              ) : (
                <Chip theme={t} label={s.label} glyph={s.glyph} h={CHIP_H} id={`source-${i}`} />
              )}
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * TYPE.line.lead) / 2, width: W, display: 'flex', justifyContent: 'center' }}>
          <Words id="sources" text={c.text} frame={F} start={c.in} size={size} out={c.out} exit="launchFade" exitDir="down" style={{ ...typeStyle('line', size), color: t.text }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
