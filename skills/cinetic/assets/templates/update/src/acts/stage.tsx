// The stage: what the film shows at a frame, from the plan (src/timeline.ts). The hook (the name and the version on the
// film's base ground), each change's line alone on the ground of its scene, the scene itself (acts/scenes.tsx), and the
// lockup with the version landing under it on the bar line. Text only ever stands on a clean ground: a line card is one
// flat colour, the scenes set their own words on their own clean grounds. Nothing floats or bobs, and nothing stands
// still: the hook and each line card push toward the lens at a steady rate from their first frame to their cut (fast
// enough that forensics reads it as motion), the lockup keeps the pull-back's own push to the last frame.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FONT, TYPE } from '../brand/tokens';
import { DEAL, LINE_SIZE, LINES } from '../deal';
import { clamp, E, zoomAt } from '../lib/anim';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { pullbackScale } from '../scenes/mark-pullback';
import { CHANGES, CLOSE, DEFOCUS_AT, DEFOCUS_F, DEFOCUS_PX, HOOK, K30, LINGER_F, moveOf, pullbackFrame, TOTAL } from '../timeline';
import { spokenChange, UPDATE } from '../update';
import { BASE, FILM, groundOf, inksOn, toneOf } from './look';
import { EndScene, SceneOf } from './scenes';
import { LineText } from './type';

/**
 * A push toward the lens over a part (scale 1 -> 1 + pct %), in log space on a soft exponential (E.softOut): it leaves
 * at speed and is still moving at the cut, so the part never reads as a still frame.
 */
const creep = (f: number, at: number, until: number, pct = 4.5) => zoomAt(f, at, Math.max(at + 1, until), 1, 1 + pct / 100, E.softOut);
/** An underdamped landing: 0 -> 1 with one small overshoot (the version mark's spring, timeline SPRING_CLASS). */
const springLand = (x: number) => (x <= 0 ? 0 : x >= 1.6 ? 1 : 1 - Math.exp(-5.2 * x) * Math.cos(7.4 * x));

/** The version as a pill: its numerals in the paper colour on the accent. `roll` 0..1 rolls the old numerals up to the new. */
const VersionPill: React.FC<{ size: number; text: string; from?: string; roll?: number }> = ({ size, text, from, roll = 1 }) => {
  const font = size * 0.6;
  const w = Math.max(measureTracked(text, font, 600, -0.01), from ? measureTracked(from, font, 600, -0.01) : 0) + size * 0.62;
  const ink = inksOn(FILM.accent).ink;
  const r = E.snapOut(clamp(roll));
  return (
    <div style={{ position: 'relative', width: w, height: size, borderRadius: size / 2, background: FILM.accent, overflow: 'hidden' }}>
      {[from && roll < 1 ? { t: from, y: -r } : null, { t: text, y: from ? 1 - r : 0 }].filter(Boolean).map((x, k) => (
        <div key={k} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${((x as { y: number }).y * size).toFixed(2)}px)`, fontFamily: FONT.text, fontWeight: 600, fontSize: font, letterSpacing: '-0.01em', lineHeight: 1, color: ink, fontVariantNumeric: 'tabular-nums' }}>
          {(x as { t: string }).t}
        </div>
      ))}
    </div>
  );
};
/** The pill's width for a version at a size (the same sum VersionPill draws). Browser. */
const pillW = (size: number, text: string, from?: string) => Math.max(measureTracked(text, size * 0.6, 600, -0.01), from ? measureTracked(from, size * 0.6, 600, -0.01) : 0) + size * 0.62;

/** The hook: the name builds centred; the version arrives beside it (pill, roll or tag); the pair stays centred. */
const HookView: React.FC<{ f: number }> = ({ f }) => {
  const film = useFilm();
  const u = Math.min(film.width, film.height) / 1080;
  const size = TYPE.display.size * u;
  const name = UPDATE.name;
  const { ink, accent } = inksOn(BASE);
  const nameW = measureTracked(name, size, TYPE.display.weight, TYPE.display.track, FONT.text);
  const gap = size * 0.28;
  const cx = film.width / 2;
  const cy = film.height / 2;
  const kind = DEAL.hook;
  const pill = size * 0.78;
  const vw = kind === 'tag' ? measureTracked(UPDATE.version, size, TYPE.display.weight, TYPE.display.track, FONT.text) : pillW(pill, UPDATE.version, kind === 'roll' ? UPDATE.from : undefined);
  // the pair's centre: the name alone until the version arrives (tag slides it aside; pill and roll are centred as a pair from the first frame)
  const slide = kind === 'tag' ? E.glideOut(clamp((f - HOOK.version) / 14)) : 1;
  const offset = ((vw + gap) / 2) * slide;
  const nameX = cx - offset;
  const vx = nameX + nameW / 2 + gap;
  const push = creep(f, HOOK.name, HOOK.out, 5.5);
  const pop = springLand((f - HOOK.version) / 18);
  return (
    <AbsoluteFill style={{ background: BASE }}>
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: `${cx}px ${cy}px` }}>
        <LineText id="hook" text={name} at={HOOK.name} resolved={HOOK.nameRes} frame={f} move={LINES.voice} role="display" x={nameX} color={ink} accent={accent} emph={false} />
        {kind === 'tag' && f >= HOOK.version + 7 && (
          <div style={{ position: 'absolute', left: vx, top: cy - size * 0.62, fontFamily: FONT.text, fontWeight: TYPE.display.weight, fontSize: size, letterSpacing: `${TYPE.display.track}em`, lineHeight: 1.24, color: FILM.accent === BASE ? ink : accent, whiteSpace: 'pre', transform: `translateX(${(0.18 * size * Math.exp(-(f - HOOK.version - 7) / 2.4)).toFixed(2)}px)` }}>
            {UPDATE.version}
          </div>
        )}
        {kind !== 'tag' && (kind === 'roll' ? f >= 6 : f >= HOOK.version) && (
          <div style={{ position: 'absolute', left: vx, top: cy - pill / 2 + size * 0.02, transformOrigin: '0% 50%', transform: kind === 'roll' ? `scale(${(0.86 + 0.14 * E.snapOut(clamp((f - 6) / 12))).toFixed(4)})` : `scale(${(0.2 + 0.8 * pop).toFixed(4)})`, opacity: kind === 'roll' ? E.snapOut(clamp((f - 6) / 6)) : clamp(pop * 3) }}>
            <VersionPill size={pill} text={UPDATE.version} from={kind === 'roll' ? UPDATE.from : undefined} roll={kind === 'roll' ? (f - HOOK.version) / 16 : 1} />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Change i's line alone on the ground of its scene; `leave` (0..1) over its scene's first frames: the line alone (no
 * ground), dissolving off as it keeps its push, over the scene building on the same ground.
 */
const CardView: React.FC<{ i: number; f: number; leave?: number }> = ({ i, f, leave }) => {
  const film = useFilm();
  const c = CHANGES[i];
  const card = c.card!;
  const ground = groundOf(toneOf(c.scene.id));
  const { ink, accent } = inksOn(ground);
  const u = Math.min(film.width, film.height) / 1080;
  // leaving, the line eases out (fast, then landing): nearly gone before its layer goes, never cut off mid-move
  const out = leave !== undefined ? E.outSoft(clamp(leave)) : 0;
  const push = creep(f, card.from, card.to, 4.5) + 0.04 * out;
  return (
    <AbsoluteFill style={{ background: leave !== undefined ? undefined : ground, opacity: 1 - out, filter: out > 0.01 ? `blur(${(14 * u * out).toFixed(2)}px)` : undefined }}>
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 50%' }}>
        <LineText id={`change${i + 1}`} text={spokenChange(UPDATE.changes[i])} at={card.in} resolved={card.resolved} frame={f} move={moveOf(`change${i + 1}`)} size={LINE_SIZE * u} role="display" color={ink} accent={accent} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A scene past its own last frame (the plan held its cut for the grid) keeps pushing in, never frozen. */
const SceneView: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const s = CHANGES[i].scene;
  const natural = s.from + (s.dur30 - s.skip) * K30 + s.extra;
  const over = Math.max(0, f - natural);
  const push = over > 0 ? 1 + 0.0009 * over : 1;
  return (
    <AbsoluteFill style={{ background: groundOf(toneOf(s.id)), transform: push > 1 ? `scale(${push.toFixed(5)})` : undefined }}>
      <SceneOf i={i} f={f} />
    </AbsoluteFill>
  );
};

/** The lockup, and the version landing under it on the bar line that ends the body. */
const EndView: React.FC<{ f: number }> = ({ f }) => {
  const film = useFilm();
  const u = Math.min(film.width, film.height) / 1080;
  const cx = film.width / 2;
  const cy = film.height / 2;
  // the lockup keeps pushing (mark-pullback's own settle and push, pullbackScale): the version rides it
  const s = pullbackScale(pullbackFrame(f)) / pullbackScale(pullbackFrame(CLOSE.versionIn));
  const land = (f - CLOSE.versionIn) / 14;
  const k = springLand(land);
  const pill = 120 * u;
  return (
    <AbsoluteFill>
      <EndScene f={f} />
      {f >= CLOSE.versionIn && (
        <AbsoluteFill style={{ transform: `scale(${s.toFixed(5)})`, transformOrigin: `${cx}px ${cy}px` }}>
          <div style={{ position: 'absolute', left: cx, top: cy + 68 * u + 46 * u, transform: `translate(-50%, ${((1 - k) * 26 * u).toFixed(2)}px) scale(${(0.7 + 0.3 * k).toFixed(4)})`, opacity: E.snapOut(clamp(land * 4)) }}>
            <VersionPill size={pill} text={UPDATE.version} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/**
 * The film at frame f (absolute): what plays there; around each of the template's defocus seams what was before racks
 * out of focus with a slight push and what comes in racks back in, the cut inside the blur (no frame shows both).
 */
export const Stage: React.FC<{ from: number }> = ({ from }) => {
  const film = useFilm();
  const f = from + useCurrentFrame();
  const u = Math.min(film.width, film.height) / 1080;
  const at = DEFOCUS_AT.find((x) => f >= x - DEFOCUS_F && f < x + DEFOCUS_F);
  if (at === undefined) return <View f={f} />;
  const before = f < at;
  // full blur on both frames that meet at the cut: the last of what was before and the first of what comes in
  // before the cut the rack and a push accelerate to the last frame (the picture changes faster every frame into the cut);
  // after it the rack eases back in
  const k = before ? clamp((f - (at - DEFOCUS_F) + 1) / DEFOCUS_F) ** 2.6 : 1 - E.outSoft(clamp((f - at) / DEFOCUS_F));
  const push = before ? 1 + 0.09 * k : 1 + 0.03 * k;
  return (
    <AbsoluteFill style={{ filter: k > 0.01 ? `blur(${(DEFOCUS_PX * u * k).toFixed(2)}px)` : undefined, transform: `scale(${push.toFixed(5)})` }}>
      <View f={f} />
    </AbsoluteFill>
  );
};

/** What plays at frame f (absolute). */
const View: React.FC<{ f: number }> = ({ f }) => {
  if (f < HOOK.out) return <HookView f={f} />;
  for (const c of CHANGES) {
    if (c.card && f >= c.card.from && f < c.card.to) return <CardView i={c.i} f={f} />;
    if (f >= c.scene.from && f < c.scene.to) {
      // a line card's line dissolves off over its scene's first frames (the shared ground under both)
      if (c.card && f < c.scene.from + LINGER_F) {
        // a dissolve on the shared ground: the scene comes up under the line as the line goes
        const leave = (f - c.scene.from + 1) / LINGER_F;
        return (
          <AbsoluteFill style={{ background: groundOf(toneOf(c.scene.id)) }}>
            <AbsoluteFill style={{ opacity: clamp(leave) }}>
              <SceneView i={c.i} f={f} />
            </AbsoluteFill>
            <CardView i={c.i} f={f} leave={leave} />
          </AbsoluteFill>
        );
      }
      return <SceneView i={c.i} f={f} />;
    }
  }
  if (f >= CLOSE.markIn && f < TOTAL) return <EndView f={f} />;
  return <AbsoluteFill style={{ background: BASE }} />;
};

