import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Chain } from '../fx/Chain';
import { Words } from '../fx/Words';
import { blurIn, prog, spr, SPR } from '../lib/anim';
import { copy } from '../timeline';

// Fixture act: a glow in an act, type blurred in under a crisp look (one marked focus-in), a long
// chain, three spring classes and a hurried stagger in a calm 1.2 film.
export const Act1: React.FC<{ f: number }> = ({ f }) => {
  const pill = spr(f, 10, SPR.landing);
  const menu = spr(f, 40, SPR.menu);
  const pop = spr(f, 80, SPR.containerPop);
  const p = prog(f, 0, 30);
  return (
    <AbsoluteFill>
      <div style={{ background: 'radial-gradient(circle, rgba(8,150,90,.5), transparent 70%)', transform: `translateX(${pill * 40 + menu * 20 + pop * 10}px)` }} />
      <span data-text="a" style={{ filter: `blur(${blurIn(p, 6)}px)` }}>{copy('short.1').text}</span>
      {/* focus-in: the one word that comes into focus */}
      <span data-text="b" style={{ filter: `blur(${blurIn(p, 6)}px)` }}>{copy('short.2').text}</span>
      <Chain chain="long" frame={f} from={0} />
      <Words text={copy('short.1').text} frame={f} start={0} stagger={9} blur={6} />
    </AbsoluteFill>
  );
};
