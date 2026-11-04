// cinetic:light the click bloom and the selection ring's glow are light on an event (they appear on it and leave)
/**
 * The signature moves, drawn (lib/moves.ts holds the numbers; references/motion-library the recipes):
 *
 *   <BuildLine>   a statement built word by word, centred: each new word rises (wordRise), is born in the accent and
 *                 drains to ink (arrivalTint), and the line re-centres with a snap (69 % on the first frame)
 *   <RiseWord>    one word with the canonical rise, ink ramp and vertical smear (and an optional arrival tint)
 *   <Pop>         a pop with one overshoot (0.2 -> 1.03 -> 1; opacity full in 4 f@60)
 *   <Land>        cuts in at 1.07-1.29x or 50-90 px off, smeared on its fast frames, springs home
 *   <FromLens>    arrives huge, soft and see-through from the lens and shrinks into its slot
 *   <Press>       the press squash (cursor 0.8 / button 0.9), released on a spring
 *   <WhipCut>     a velocity cut: A leaves with its speed doubling into the cut, B arrives at 0.95 of it and brakes
 *   <Tail>        the hold tail: the decaying drift of the last move, one way, never a bob
 *   <ClickBloom>, <SelectRing>, <GlyphSweep>, <RimStreak>   light that marks an event, then leaves
 *
 * Every component takes the film frame (`frame`) and absolute event frames, so any frame renders alone. Sizes are px at
 * 1080p (scaled with the frame through the film context). Nothing loops: each move starts on its event and lands.
 */
import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { useFilm } from '../lib/film';
import * as M from '../lib/moves';
import type { Declares } from '../timeline';

type Children = { children?: React.ReactNode };
const idOf = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

/** A directional smear: one SVG Gaussian along x and/or y (only while it is above a third of a pixel). */
export const Smear: React.FC<Children & { id: string; sx?: number; sy?: number; style?: React.CSSProperties }> = ({ id, sx = 0, sy = 0, style, children }) => {
  const on = Math.abs(sx) > 0.3 || Math.abs(sy) > 0.3;
  const fid = `smear-${idOf(id)}`;
  return (
    <span style={{ display: 'inline-block', ...style }}>
      {on && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={`${Math.abs(sx)} ${Math.abs(sy)}`} />
          </filter>
        </svg>
      )}
      <span style={{ display: 'inline-block', filter: on ? `url(#${fid})` : undefined }}>{children}</span>
    </span>
  );
};

export type RiseWordProps = Children & {
  frame: number;
  at: number; // the frame the word lands (its first visible frame)
  text?: string;
  rise?: number; // px at 1080p (default riseFor(size, kind))
  size?: number; // font size px at 1080p, for the default rise
  kind?: 'statement' | 'voice';
  accent?: string; // born in this colour, drains to `ink`
  ink?: string;
  id?: string;
  style?: React.CSSProperties;
};
/** One word with the canonical entrance. */
export const RiseWord: React.FC<RiseWordProps> = ({ frame, at, text, rise, size = 64, kind = 'statement', accent, ink, id, style, children }) => {
  const film = useFilm();
  const s = M.wordRise(frame, at, { rise: rise ?? M.riseFor(size, kind) }, film);
  if (!s.visible) return null;
  const color = accent && ink ? M.arrivalTint(frame, at, { accent, ink }, film) : undefined;
  return (
    <span style={{ display: 'inline-block', transform: `translateY(${s.dy}px)`, opacity: s.opacity, color, ...style }}>
      <Smear id={id ?? `w-${at}-${text ?? ''}`} sy={s.smear}>{text ?? children}</Smear>
    </span>
  );
};

export type BuildLineProps = {
  frame: number;
  words: readonly string[];
  at: number; // the first word's frame
  every?: number; // frames between words at 30 fps (4 headlines, 5 short lines, 7 statements; default 6)
  ats?: readonly number[]; // explicit frames per word (overrides at / every)
  size: number; // px at 1080p
  family: string;
  weight?: number;
  tracking?: number; // em
  color: string; // the ink
  accent?: string; // each new word is born in it and drains to the ink
  keep?: number; // index of the one word that keeps the accent
  kind?: 'statement' | 'voice';
  x?: number; // the line's centre (px in the frame; default the frame's centre)
  y?: number; // the baseline box top (default the frame's middle)
  id?: string;
};
/** Frames each word of a BuildLine lands on. */
export const buildFrames = (p: Pick<BuildLineProps, 'at' | 'every' | 'ats' | 'words'>, fps: number) =>
  p.ats ? [...p.ats] : p.words.map((_, i) => p.at + Math.round((i * (p.every ?? 6) * fps) / M.MOVES.ref));

/** A statement built word by word on one centred line that re-centres with a snap on every word. */
export const BuildLine: React.FC<BuildLineProps> = (p) => {
  const film = useFilm();
  const u = Math.min(film.width, film.height) / 1080;
  const size = p.size * u;
  const font = { fontFamily: p.family, fontSize: size, fontWeight: String(p.weight ?? 600), letterSpacing: p.tracking ? `${p.tracking}em` : undefined, validateFontIsLoaded: false } as const;
  const widths = p.words.map((w) => measureText({ text: w, ...font }).width);
  const space = measureText({ text: ' ', ...font }).width;
  const ats = buildFrames(p, film.fps);
  const lineW = (n: number) => (n <= 0 ? 0 : widths.slice(0, n).reduce((a, b) => a + b, 0) + space * (n - 1));
  // the line's left edge: centred on the words shown, each arrival re-centring with a snap
  let left = -lineW(1) / 2;
  for (let k = 1; k < p.words.length; k++) left += ((lineW(k) - lineW(k + 1)) / 2) * M.snapSettle(p.frame, ats[k], film);
  const cx = p.x ?? film.width / 2;
  const top = p.y ?? film.height / 2 - size * 0.6;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cx + left}px, ${top}px)`, whiteSpace: 'nowrap', fontFamily: p.family, fontSize: size, fontWeight: p.weight ?? 600, letterSpacing: p.tracking ? `${p.tracking}em` : undefined, color: p.color, lineHeight: 1.2 }}>
      {p.words.map((w, i) => {
        const x = lineW(i) + (i > 0 ? space : 0);
        const keepAccent = p.keep === i && p.accent;
        return (
          <span key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${i === 0 ? 0 : x}px)`, color: keepAccent ? p.accent : undefined }}>
            <RiseWord frame={p.frame} at={ats[i]} text={w} rise={M.riseFor(p.size, p.kind ?? 'statement')} accent={keepAccent ? undefined : p.accent} ink={p.color} id={`${p.id ?? 'line'}-${i}`} />
          </span>
        );
      })}
    </div>
  );
};

/** A pop with one overshoot (from 0.2; `from` 0.35 a popover, 0.92 UI children; `over` 0 a modal, 0.12 a step dot). */
export const Pop: React.FC<Children & { frame: number; at: number; from?: number; over?: number; origin?: string; style?: React.CSSProperties }> = ({ frame, at, from, over, origin = 'center', style, children }) => {
  const film = useFilm();
  const s = M.popIn(frame, at, film, { from, over });
  if (!s.visible) return null;
  return <div style={{ transform: `scale(${s.scale})`, transformOrigin: origin, opacity: s.opacity, ...style }}>{children}</div>;
};

/** A landing in motion: from `scale` and/or `offset` (px at 1080p), smeared along the offset on fast frames, home on a spring. */
export const Land: React.FC<Children & { frame: number; at: number; scale?: number; offset?: { x?: number; y?: number }; spring?: M.SpringCfg; id?: string; style?: React.CSSProperties }> = ({ frame, at, scale = M.MOVES.land.scale, offset, spring, id, style, children }) => {
  const film = useFilm();
  const s = M.landIn(frame, at, { scale, offset, spring }, film);
  if (!s.visible) return null;
  const ox = offset?.x ?? 0;
  const oy = offset?.y ?? 0;
  const len = Math.hypot(ox, oy) || 1;
  return (
    <div style={{ transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale})`, ...style }}>
      <Smear id={id ?? `land-${at}`} sx={(s.smear * Math.abs(ox)) / len} sy={(s.smear * Math.abs(oy)) / len} style={{ display: 'block' }}>{children}</Smear>
    </div>
  );
};

/** From the lens: huge, soft and see-through, yawed, shrinking on a log scale into its slot (origin: where it lands from). */
export const FromLens: React.FC<Children & { frame: number; at: number; from?: number; blur?: number; yaw?: number; frames?: number; origin?: string; style?: React.CSSProperties }> = ({ frame, at, from, blur, yaw, frames, origin = '30% 70%', style, children }) => {
  const film = useFilm();
  const s = M.flyFromLens(frame, at, film, { from, blur, yaw, frames });
  if (!s.visible) return null;
  return (
    <div style={{ perspective: 1400 }}>
      <div style={{ transform: `rotateY(${s.yaw}deg) scale(${s.scale})`, transformOrigin: origin, filter: s.blur > 0.3 ? `blur(${s.blur}px)` : undefined, opacity: s.opacity, ...style }}>{children}</div>
    </div>
  );
};

/** The press squash on `at` (cursor 0.8 or button 0.9 for 3 frames at 30 fps), released on a spring. */
export const Press: React.FC<Children & { frame: number; at: number; kind?: 'cursor' | 'button'; depth?: number; origin?: string; style?: React.CSSProperties }> = ({ frame, at, kind = 'button', depth, origin = 'center', style, children }) => {
  const film = useFilm();
  const k = M.pressSquash(frame, at, film, { kind, depth });
  return <div style={{ transform: `scale(${k})`, transformOrigin: origin, ...style }}>{children}</div>;
};

type Dir = 'left' | 'right' | 'up' | 'down';
const DIRS: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/**
 * A velocity cut. Before `cut` it draws `a`, leaving along `dir` with its speed doubling every 30 fps frame (peak px/f
 * at 1080p on the frame before the cut); from `cut` it draws `b`, arriving along the same direction at `ratio` of that
 * speed and braking to rest. Both are smeared by half their frame travel. Declare it (declares) so the checks read a
 * designed velocity seam.
 */
export const WhipCut: React.FC<{ frame: number; cut: number; a: React.ReactNode; b: React.ReactNode; dir?: Dir; peak?: number; build?: number; ratio?: number; brake?: number; id?: string; style?: React.CSSProperties }> = ({ frame, cut, a, b, dir = 'left', peak, build, ratio, brake, id = 'whip', style }) => {
  const film = useFilm();
  const [dx, dy] = DIRS[dir];
  const s = frame < cut ? M.whipExit(frame, cut, film, { peak, build }) : M.whipEntry(frame, cut, film, { peak, ratio, brake });
  const sm = s.smear;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${dx * s.x}px, ${dy * s.x}px)` }}>
        <Smear id={`${id}-${frame < cut ? 'a' : 'b'}`} sx={dx ? sm : 0} sy={dy ? sm : 0} style={{ display: 'block', width: '100%', height: '100%' }}>
          <div style={{ width: film.width, height: film.height, position: 'relative' }}>{frame < cut ? a : b}</div>
        </Smear>
      </div>
    </div>
  );
};

/** The hold tail: after the move that landed at `at`, keep drifting along `angle` degrees (0 = right, 90 = down), decaying, never back. */
export const Tail: React.FC<Children & { frame: number; at: number; angle?: number; v0?: number; vEnd?: number; until?: number; creep?: number; style?: React.CSSProperties }> = ({ frame, at, angle = 0, v0, vEnd, until, creep, style, children }) => {
  const film = useFilm();
  const d = M.holdTail(frame, at, film, { v0, vEnd, until });
  const k = creep ? M.scaleCreep(frame, at, film, { pct: creep, until }) : 1;
  const r = (angle * Math.PI) / 180;
  return <div style={{ transform: `translate(${Math.cos(r) * d}px, ${Math.sin(r) * d}px) scale(${k})`, ...style }}>{children}</div>;
};

/** A click bloom at (x, y) px: a disc of light growing 150 -> 580 px from half intensity to nothing in 18 frames (30 fps). */
export const ClickBloom: React.FC<{ frame: number; at: number; x: number; y: number; color?: string }> = ({ frame, at, x, y, color = '#ffffff' }) => {
  const film = useFilm();
  const b = M.clickBloom(frame, at, film);
  if (!b) return null;
  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x - b.r}px, ${y - b.r}px)`, width: b.r * 2, height: b.r * 2, borderRadius: '50%', pointerEvents: 'none', opacity: b.opacity, mixBlendMode: 'screen',
      background: `radial-gradient(circle, ${color} 0%, ${color}66 22%, transparent 70%)` }} />
  );
};

/** A selection ring round a box (px): it grows from 6 to 24 px outside the box, 2 px wide, with a 14 px glow at 0.35. */
export const SelectRing: React.FC<{ frame: number; at: number; box: { x: number; y: number; w: number; h: number }; radius?: number; color?: string; id?: string }> = ({ frame, at, box, radius = 16, color = '#ffffff', id = 'ring' }) => {
  const film = useFilm();
  const glow = M.MOVES.ring.glow * (Math.min(film.width, film.height) / 1080);
  const r = M.selectRing(frame, at, film);
  if (!r) return null;
  const o = r.out;
  const W = box.w + 2 * o + 2 * glow;
  const H = box.h + 2 * o + 2 * glow;
  const fid = `ring-${idOf(id)}`;
  return (
    <svg aria-hidden width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${box.x - o - glow}px, ${box.y - o - glow}px)`, pointerEvents: 'none', opacity: r.opacity, overflow: 'visible' }}>
      <filter id={fid} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={glow / 2} /></filter>
      <rect x={glow} y={glow} width={box.w + 2 * o} height={box.h + 2 * o} rx={radius + o} fill="none" stroke={color} strokeWidth={r.width * 3} opacity={r.glowAlpha} filter={`url(#${fid})`} />
      <rect x={glow} y={glow} width={box.w + 2 * o} height={box.h + 2 * o} rx={radius + o} fill="none" stroke={color} strokeWidth={r.width} />
    </svg>
  );
};

/**
 * A glyph light sweep across its children (an element `width` px wide at 1080p): a 160 px band at -20 degrees crossing
 * at 60 px per 30 fps frame, peak 0.5, clipped to the glyphs (a white copy of the children masked by the moving band).
 */
export const GlyphSweep: React.FC<Children & { frame: number; at: number; width: number; band?: number; speed?: number; peak?: number; style?: React.CSSProperties }> = ({ frame, at, width, band, speed, peak, style, children }) => {
  const film = useFilm();
  const s = M.glyphSweep(frame, at, width, film, { band, speed, peak });
  const mask = s ? `linear-gradient(${90 + s.angle}deg, transparent ${s.x - s.band / 2}px, #000 ${s.x}px, transparent ${s.x + s.band / 2}px)` : '';
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {children}
      {s && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', filter: 'brightness(0) invert(1)', opacity: s.opacity, mixBlendMode: 'screen', WebkitMaskImage: mask, maskImage: mask }}>
          {children}
        </div>
      )}
    </div>
  );
};

/** A rim streak on a box (px): a bright core 3 x 170 px travelling clockwise from the top-left corner along half the rim. */
export const RimStreak: React.FC<{ frame: number; at: number; box: { x: number; y: number; w: number; h: number }; color?: string; share?: number; frames?: number }> = ({ frame, at, box, color = '#ffffff', share, frames }) => {
  const film = useFilm();
  const u = Math.min(film.width, film.height) / 1080;
  const s = M.rimStreak(frame, at, { w: box.w / u, h: box.h / u }, film, { share, frames });
  if (!s) return null;
  const S = M.MOVES.streak;
  const L = S.length * u;
  const T = S.core * u;
  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: L, height: T, transform: `translate(${box.x + s.x - L / 2}px, ${box.y + s.y - T / 2}px) rotate(${s.angle}deg)`, opacity: s.opacity, mixBlendMode: 'screen', pointerEvents: 'none',
      background: `linear-gradient(90deg, transparent, ${color} 35%, ${color} 65%, transparent)`, borderRadius: T, filter: `blur(${0.6 * u}px)` }} />
  );
};

/** What a WhipCut declares: a velocity seam at its cut (carry x or y, the direction's sign). Other parts declare nothing. */
export const declares = (p?: { cut?: number; dir?: Dir; id?: string }): Declares => {
  if (p?.cut === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const [dx, dy] = DIRS[p.dir ?? 'left'];
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.cut, kind: 'velocity', carry: dx ? 'x' : 'y', dir: (dx || dy) as 1 | -1, id: p.id ?? 'whip' }] };
};
