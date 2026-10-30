import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, TYPE, typeStyle, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { phrase } from '../lib/cadence';
import { Defocus } from '../fx/Defocus';
import { TypeOn } from '../fx/TypeOn';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { REEL } from '../reel';
import { ACT, copy, CUE, f60, f60x, FPS, H, TITLE_LEAD, TITLE_TYPE, W } from '../timeline';
import { INK, lineSize, useAbs } from './stage';

/** The mark's parts land phrased, the last after a held beat (it carries the glint): lib/cadence, the span of a 4 f stagger. */
const PART_ON = phrase(LOGO.parts.length, f60x(4), { shape: 'settle', seed: 'mark-parts', whole: false }).onsets;

// END - on the ink the flood left: the title's name (its first word, or every word of a longer name) pops, the rest
// types on in place as the title rises a little; the mark's parts rise above it once the title is typed, the whole
// lockup centred. The key passes once across the set. The title shrinks out and the tagline takes its place, centred,
// settling from 108 % as it comes into focus; the mark and the tagline hold about a second and a half, creeping.

export const End: React.FC = () => {
  const F = useAbs('end');
  const t = INK;
  const title = copy('title');
  const tag = copy('tagline');
  const first = title.text.startsWith(`${REEL.name} `) ? REEL.name : title.text.split(' ')[0]; // the name whole, however many words
  const rest = title.text.slice(first.length);
  const size = lineSize(title.text, 'display', 0.74);
  const tagSize = lineSize(tag.text, 'display', 0.74);
  const firstW = measureTracked(first, size, TYPE.display.weight, TYPE.display.track);
  const markSize = 170 * U;
  // the lockup is centred: the title laid out at its final centred place (its letters type on in place), the mark
  // centred above it, the tagline centred where the title stood
  const titleW = measureTracked(title.text, size, TYPE.display.weight, TYPE.display.track);
  const x0 = (W - titleW) / 2;
  const tagX = 200 * U;
  const yT = H / 2 - (size * TYPE.display.lead) / 2;
  const rise = prog(F, title.in, title.in + f60x(30), E.snapOut);
  const leave = prog(F, tag.in - f60x(10), tag.in + f60x(4), E.buildIn); // the title shrinks out
  const settle = prog(F, tag.in, tag.resolved, E.snapOut); // the tagline settles from 108 % into focus
  const k = creep(F, ACT.end.from, { pctPerSec: 0.015 }, FPS);
  const band = prog(F, CUE.key, CUE.key + f60x(80), E.stdInOut);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: (W - markSize) / 2, top: yT - markSize - 50 * U }}>
          <LogoMark
            logo={LOGO}
            size={markSize}
            fill={(part) => (part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? t.text : undefined)} // the mark's ink parts read on the dark ground
            poses={(_, j) => {
              const p = prog(F, CUE.mark + PART_ON[j], CUE.mark + f60x(22) + PART_ON[j], E.snapOut);
              const glint = j === LOGO.parts.length - 1 ? 0.1 * hitPulse(F - CUE.rest, 2, 9, FPS) : 0;
              return { y: (1 - p) * 40, o: p, s: 1 + glint };
            }}
          />
        </div>
        {F >= title.in - 1 && leave < 1 && (
          <div style={{ position: 'absolute', left: x0, top: yT, opacity: 1 - leave, transformOrigin: `${(titleW / 2).toFixed(1)}px 50%`, transform: `translate3d(0, ${((1 - rise) * 18 * U).toFixed(2)}px, 0) scale(${mix(1, 0.9, leave).toFixed(4)})` }}>
            <span data-text="title-name" style={{ ...typeStyle('display', size), color: t.text }}>
              {first}
            </span>
            <div style={{ position: 'absolute', left: firstW, top: 0, color: t.text }}>
              <TypeOn id="title-rest" text={rest} frame={F} start={title.in + f60(TITLE_LEAD)} dur={f60(TITLE_TYPE)} caret={false} role="display" size={size} />
            </div>
          </div>
        )}
        {F >= tag.in - 1 && (
          <div style={{ position: 'absolute', left: tagX, top: H / 2 - (tagSize * TYPE.display.lead) / 2, width: W - 2 * tagX, height: tagSize * 1.4 }}>
            <Defocus sigma={mix(6, 0, settle)}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: W - 2 * tagX, textAlign: 'center', transformOrigin: '50% 50%', transform: `scale(${lmix(1.08, 1, settle).toFixed(5)})`, opacity: clamp(settle * 2.5) }}>
                <span data-text="tagline" style={{ ...typeStyle('display', tagSize), color: t.text }}>
                  {tag.text}
                </span>
              </div>
            </Defocus>
          </div>
        )}
      </div>
      {F >= CUE.key && F < CUE.key + f60x(80) && (
        <AbsoluteFill style={{ background: `linear-gradient(112deg, rgba(255,255,255,0) ${mix(-30, 110, band) - 14}%, rgba(255,255,255,0.08) ${mix(-30, 110, band)}%, rgba(255,255,255,0) ${mix(-30, 110, band) + 14}%)` }} />
      )}
    </AbsoluteFill>
  );
};
