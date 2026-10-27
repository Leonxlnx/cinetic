import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { SpinBlur } from '../fx/Defocus';
import { SPIN_IN, spinInState } from '../fx/Wordmark';
import { lmix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, H, W } from '../timeline';
import { Photo } from '../kit';
import { circOut, MarkAt, PAGE, pictureSrc, quadIn, useAbs } from './stage';

// BRAND - the mark on a picture. The plate pulls back from x1.13 on a circ-out across the act (it never drifts); the
// mark spins in from x2.06 over more than a turn, its rotation settling before its scale (fx/Wordmark spinInState,
// smeared by fx/Defocus SpinBlur while it turns fast), then steps aside while the name slides out from behind it.
// On the last beat the lockup and the plate rise on a quad-in: the cut into the wall carries that upward speed.

export const LOCK = { mark: 190, name: 150, gap: 0.32 } as const;

/** The lockup's geometry: the mark's centre at rest and the name's left edge, for a name at the display weight. */
export const lockupGeometry = (name: string, cy: number) => {
  const mark = LOCK.mark * U;
  const size = LOCK.name * U;
  const gap = size * LOCK.gap;
  const nameW = measureTracked(name, size, TYPE.display.weight, TYPE.display.track, FONT.text, { trailing: false });
  const left = (W - (mark + gap + nameW)) / 2;
  return { mark, size, gap, nameW, cx: left + mark / 2, cy, nameLeft: left + mark + gap, room: -(gap + nameW) / 2 };
};

/** The mark spinning in, aside, and the name sliding out from behind it (used again by the end card). */
export const SpunLockup: React.FC<{ F: number; at: number; name: string; id: string; cy: number; color: string }> = ({ F, at, name, id, cy, color }) => {
  const g = lockupGeometry(name, cy);
  const s = spinInState(F, { at, room: g.room / U }, useFilm());
  if (!s.shown) return null;
  const mx = W / 2 + s.x;
  const nameX = g.nameLeft - (SPIN_IN.slide * U - s.name.x);
  const hide = Math.max(0, mx - nameX); // the part of the name still behind the mark's centre
  return (
    <>
      {s.name.shown && (
        <div data-text={id} style={{ position: 'absolute', left: nameX, top: cy - g.size * 0.56, clipPath: `inset(-20% -5% -30% ${hide.toFixed(2)}px)`, opacity: s.name.opacity, fontFamily: FONT.text, fontSize: g.size, fontWeight: TYPE.display.weight, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1, whiteSpace: 'pre', color }}>
          {name}
        </div>
      )}
      <SpinBlur omega={s.omega} cx={mx} cy={cy}>
        <MarkAt x={mx} y={cy} size={g.mark} s={s.scale} rot={s.rot} />
      </SpinBlur>
    </>
  );
};

export const Brand: React.FC = () => {
  const F = useAbs('brand');
  const nm = copy('brandName');
  const pull = lmix(1.13, 1, circOut(prog(F, ACT.brand.from, ACT.wall.from, (t) => t)));
  const rise = -0.42 * H * quadIn(prog(F, CUE.rise, ACT.wall.from, (t) => t));
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(0, ${rise.toFixed(2)}px, 0) scale(${pull.toFixed(5)})` }}>
        <Photo theme={PAGE} w={W} h={H} seed={11} src={pictureSrc('plate')} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate3d(0, ${rise.toFixed(2)}px, 0)` }}>
        <SpunLockup F={F} at={CUE.mark} name={nm.text} id="brandName" cy={H / 2} color={PAGE.text} />
      </div>
    </AbsoluteFill>
  );
};
