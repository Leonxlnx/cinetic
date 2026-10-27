// What every act of the teaser shares: the near-black stage and its glass, the absolute frame, the camera (one world
// layout per shot under lib/camera camPath, smeared by its own velocity), the script's caption in screen space, the
// mark, and placement helpers. Retell it in the dealt direction's world (out/DIRECTION.md): its stage, glass and type
// replace this floor; the product's own screens replace the kit parts the acts use.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, TYPE, typeStyle, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { DirBlur } from '../fx/Defocus';
import { Words } from '../fx/Words';
import { kitTheme, shadeRgba } from '../kit';
import { camera, type CamMove, camPath, camVel, type Shot } from '../lib/camera';
import { useFilm } from '../lib/film';
import { expoTail } from '../lib/handoff';
import { fitSize } from '../lib/measure';
import { ACT, type ActName, copy, H, W } from '../timeline';

/** The stage: a tinted near-black (never #000) and its glass, one accent. */
export const INK = kitTheme('inkStage', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/** The resting shot: the world's centre framed at the screen's centre at x1. Every act's camera starts from it. */
export const BASE: Shot = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 };

/** Glass on near-black: a vertical fill between two surface greys, a thin light rim and a dark drop. */
export const glass = (r: number): React.CSSProperties => ({
  borderRadius: r,
  background: `linear-gradient(180deg, ${INK.raised}, ${INK.surface})`,
  boxShadow: `inset 0 0 0 ${(1.5 * U).toFixed(2)}px ${INK.line}, 0 ${(24 * U).toFixed(0)}px ${(60 * U).toFixed(0)}px ${shadeRgba(INK, 0.6)}`,
});

/**
 * One shot: the world (laid out in frame px at left 0, top 0) under the camera path at frame F, smeared along the
 * camera's own travel on its fast frames (a whip smears, a push stays crisp). `perspective` for a 3D push.
 */
export const World: React.FC<{ F: number; moves: readonly CamMove[]; base?: Shot; smear?: boolean; children: React.ReactNode }> = ({ F, moves, base = BASE, smear = true, children }) => {
  const film = useFilm();
  const s = camPath(F, base, moves);
  const v = camVel(F, base, moves, undefined, film);
  const inner = (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ ...camera(s), width: W, height: H }}>{children}</div>
    </div>
  );
  if (!smear) return inner;
  return (
    <DirBlur v={v.speed / U} angle={v.angle} shutter={360} id="camera">
      {inner}
    </DirBlur>
  );
};

/** The script's caption in screen space (the camera moves the world, not the words): revealed word by word, white, at the line role's size up to 96 px. */
export const Caption: React.FC<{ id: string; F: number; y: number; pop?: boolean }> = ({ id, F, y, pop }) => {
  const c = copy(id);
  if (F < c.in - 1 || F >= c.out + 20) return null;
  const size = Math.max(72 * U, Math.min(Math.min(TYPE.line.size, 96) * U, fitSize(c.text, (W - 2 * SAFE.x) * 0.62, TYPE.line.size * U, TYPE.line.weight, TYPE.line.track)));
  return (
    <div style={{ position: 'absolute', left: 0, top: y - size * 0.55, width: W, display: 'flex', justifyContent: 'center' }}>
      <Words id={id} text={c.text} frame={F} start={c.in} size={size} {...(pop ? { dur: 2 } : {})} out={c.out} exit="launchFade" exitDir="up" style={{ ...typeStyle('line', size), color: INK.text }} />
    </div>
  );
};

/** The mark at `size` px, centred on (x, y), turned `rot` deg and scaled `s`. */
export const MarkAt: React.FC<{ x: number; y: number; size: number; s?: number; rot?: number; o?: number }> = ({ x, y, size, s = 1, rot = 0, o = 1 }) => (
  <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})` }}>
    <LogoMark logo={LOGO} size={size} fill={(part) => (part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? INK.text : undefined)} />
  </div>
);

/** The entrance that never stops (lib/handoff expoTail): an expo tail with a residual drift (px per 60 fps frame at 1080p). */
export const tail = (F: number, at: number, from: number, fps: number, drift = 0.06) => expoTail(F, at, from, { drift60: drift, u: U }, fps);
export const cubicOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
export const cubicIn = (t: number) => Math.min(1, Math.max(0, t)) ** 3;
export const circIn = (t: number) => 1 - Math.sqrt(1 - Math.min(1, Math.max(0, t)) ** 2);

export { FONT, H, W };
