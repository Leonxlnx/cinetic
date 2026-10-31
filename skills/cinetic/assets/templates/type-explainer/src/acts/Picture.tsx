import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Words } from '../fx/Words';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { measureTracked } from '../lib/measure';
import { ACT, copy, f60x, H, W } from '../timeline';
import { ProductScene } from './product';
import { capOf, MarkWord, SHOT, useAbs, useCrisp } from './stage';

// PICTURE - the product the promise opened, full bleed: the same world (acts/product.tsx), so the pill's last frame
// is this shot's first, and the growth carries on as a zoom that settles (it never stops on the cut). The screen is
// texture here: as the name arrives the screen recedes (out of focus, a little quieter), the mark pops and the name rises in on the crisp
// entry in front of it, the one line read. The next act wipes this shot away (PictureShot draws it there too).

/** The name's size over the product (px at 1080p). */
const TITLE = { size: 132, veil: 0.3, defocus: 5 } as const;
/** The veil the screen recedes into as the name arrives: toward the ground's shade on a dark stage, toward its raised tone on a light one (the name's ink keeps its contrast). */
const VEIL = SHOT.dark ? `rgb(${SHOT.shade.join(', ')})` : SHOT.raised;

/** The picture shot at absolute frame F: the system act draws it under its wipe, so the shot runs on unbroken. */
export const PictureShot: React.FC<{ F: number }> = ({ F }) => {
  const crisp = useCrisp();
  const t = copy('title');
  const zoom = lmix(1, 1.06, prog(F, ACT.picture.from, ACT.picture.from + f60x(48), E.glideOut)) * (1 + 0.012 * Math.max(0, F - ACT.picture.from) / 60);
  const size = TITLE.size * U;
  const markH = capOf(size) * 1.3;
  const gap = capOf(size) * 0.36;
  const wName = measureTracked(t.text, size, TYPE.display.weight, TYPE.display.track, undefined, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const veil = prog(F, t.in - f60x(10), t.in + f60x(24), E.glideOut);
  const pop = prog(F, t.in, t.in + f60x(16), E.snapOut);
  const drift = -10 * U * Math.max(0, F - t.in) / 60; // the name drifts against the screen's turn: two planes
  return (
    <AbsoluteFill style={{ background: SHOT.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${zoom.toFixed(5)})` }}>
        {veil > 0.01 ? (
          <Defocus sigma={TITLE.defocus * U * veil}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <ProductScene F={F} />
            </div>
          </Defocus>
        ) : (
          <ProductScene F={F} />
        )}
      </div>
      {/* the screen recedes as the name arrives: it falls out of focus and a little into the ground's own shade, never a pool behind the name */}
      <div style={{ position: 'absolute', inset: 0, background: VEIL, opacity: TITLE.veil * veil }} />
      {F >= t.in && (
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${drift.toFixed(2)}px, 0, 0)` }}>
          <MarkWord x={left + markH / 2} y={H / 2 - capOf(size) * 0.16} size={markH} s={mix(0.6, 1, pop)} o={clamp(pop * 3)} fill={SHOT.text} />
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(left + markH + gap).toFixed(2)}px, ${(H / 2 - size * 0.56).toFixed(2)}px, 0)` }}>
            <Words id="title" text={t.text} frame={F} start={t.in + f60x(4)} {...crisp} size={size} color={SHOT.text} style={{ ...typeStyle('display', size), lineHeight: 1, color: SHOT.text }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const PictureAct: React.FC = () => {
  const F = useAbs('picture');
  return <PictureShot F={F} />;
};
