import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { shadeRgba } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { measureTracked } from '../lib/measure';
import { ACT, copy, f60x, H, W } from '../timeline';
import { Picture } from './Promise';
import { MarkWord, PAGE, useAbs } from './stage';

// PICTURE - the picture the promise opened, full bleed, under a slow push (it keeps moving: a supplied clip or a
// photograph with depth reads alive; a frozen frame reads as a slide). The mark pops; the name's letters rise in
// after it, a frame and a half apart. The next act wipes this shot away (PictureShot draws it there too).

/** The name's size over the picture and its letter cascade (60 fps frames). */
const TITLE = { size: 132, lead: 2, gap: 1.5, rise: 0.3, frames: 14 } as const;

/** The picture shot at absolute frame F: the system act draws it under its wipe, so the shot runs on unbroken. */
export const PictureShot: React.FC<{ F: number }> = ({ F }) => {
  const t = copy('title');
  const push = prog(F, ACT.picture.from, ACT.system.from + f60x(30), E.linear) * 0.5;
  const size = TITLE.size * U;
  const markH = size * 0.95;
  const gap = size * 0.3;
  const wName = measureTracked(t.text, size, TYPE.display.weight, TYPE.display.track, undefined, { trailing: false });
  const left = (W - (markH + gap + wName)) / 2;
  const pop = prog(F, t.in, t.in + f60x(10), E.snapOut);
  const letters = [...t.text];
  return (
    <AbsoluteFill style={{ background: PAGE.text, overflow: 'hidden' }}>
      <Picture w={W} h={H} push={push} />
      {/* a soft shade under the lockup so the name reads on any picture */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${shadeRgba(PAGE, 0.32 * Math.min(1, pop * 2))}, ${shadeRgba(PAGE, 0)})` }} />
      {F >= t.in && <MarkWord x={left + markH / 2} y={H / 2} size={markH} s={mix(0.6, 1, pop)} fill={PAGE.raised} />}
      {F >= t.in && (
        <div data-text="title" style={{ position: 'absolute', left: left + markH + gap, top: H / 2 - size * 0.56, fontFamily: FONT.text, display: 'flex', whiteSpace: 'pre' }}>
          {/* lint-ok: hero word (the name over the picture) */}
          {letters.map((ch, i) => {
            const at = t.in + f60x(TITLE.lead + TITLE.gap * i);
            const p = prog(F, at, at + f60x(TITLE.frames), E.snapOut);
            return (
              <span key={i} style={{ display: 'inline-block', fontSize: size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, color: PAGE.raised, opacity: Math.min(1, p * 2.5), transform: `translate3d(0, ${((1 - p) * TITLE.rise).toFixed(4)}em, 0)` }}>
                {ch}
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const PictureAct: React.FC = () => {
  const F = useAbs('picture');
  return <PictureShot F={F} />;
};
