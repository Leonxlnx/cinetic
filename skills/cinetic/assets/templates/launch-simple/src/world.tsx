// The film's world: a DESIGNED place lit in the brand's hue (deal.ts `ground`), one for the whole film, taking one step
// per act on the act's cut (src/spine.ts world; lib/spine defaults enter, closer, turn, pull-back) and holding its course
// inside the act: every move starts, travels and lands at the act's end (fx/world worldStepMoves), so the place carries
// the cut and never stands dead, and never drifts back and forth. Layers in depth: the backdrop (moves least), the floor
// with its horizon (moves most), the light pool under the element and, on a field, its rings: the planes part as the
// world steps. The turn is the film's one value event: a flood grows out of the element into the opposite world (a light
// stage turns into the brand's colour field, a field or a dark stage into its light), and the acts after it stand there.
// A photograph is a world only when it shows the brief's own subject (deck.py deals it; `node scripts/assets.mjs plate
// <kind>` then `--pick <n> --to public/plates --accent '<accent>'`): graded, soft behind the element, stepped the same
// way; until it is fetched the built world of the same tone stands in. Never a random stock picture.
import React from 'react';
import { getStaticFiles, Img, staticFile } from 'remotion';
import { C, MASK } from './brand/tokens';
import { DEAL } from './deal';
import { bakePlate } from './fx/Gradients';
import { stepsFromPlan, worldStepMoves } from './fx/world/Step';
import { plateMove } from './fx/world/Plate';
import { clamp, E } from './lib/anim';
import { mixColor, oklch, toOklch } from './lib/color';
import { withAlpha } from './lib/handover';
import { f60x, FPS, H, SPINE_PLAN, W } from './timeline';

export type Tone = 'light' | 'dark';
export type Look = { kind: 'stage' | 'field' | 'night' | 'plate'; tone: Tone; top: string; bottom: string; floor: string; glow: string; glowA: number; ink: string; mute: string; accent: string; rings: number; plate?: string };

const A = C.accent;
const h = toOklch(A)[2];
const hueOf = (c: string) => toOklch(c)[2];
const PLATES = new Set(['clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro']);
const hasStatic = (p: string) => {
  try {
    return getStaticFiles().some((s) => s.name === p);
  } catch {
    return false;
  }
};

/** The designed looks: a pale stage, a white stage, the brand's colour field, a dark stage, a deep night. */
export const LOOKS: Record<string, Look> = {
  // every colour from the brand's accent hue (h) and its tokens: a stage is the accent's own white, a night its own black
  paleSky: { kind: 'stage', tone: 'light', top: oklch(0.945, 0.012, h), bottom: oklch(0.905, 0.022, h), floor: oklch(0.975, 0.008, h), glow: mixColor(A, C.white, 0.3), glowA: 0.62, ink: mixColor(C.ink, A, 0.12), mute: mixColor(C.mute, A, 0.1), accent: A, rings: 0 },
  nearWhite: { kind: 'stage', tone: 'light', top: oklch(0.985, 0.002, h), bottom: oklch(0.935, 0.008, h), floor: oklch(0.97, 0.004, h), glow: mixColor(A, C.white, 0.62), glowA: 0.3, ink: C.ink, mute: C.mute, accent: A, rings: 0 },
  electric: { kind: 'field', tone: 'dark', top: mixColor(A, MASK, 0.08), bottom: mixColor(A, MASK, 0.3), floor: mixColor(A, C.white, 0.08), glow: mixColor(A, C.white, 0.45), glowA: 0.5, ink: C.white, mute: mixColor(C.white, A, 0.32), accent: C.white, rings: 0.085 },
  blackField: { kind: 'night', tone: 'dark', top: oklch(0.17, 0.008, h), bottom: oklch(0.12, 0.006, h), floor: oklch(0.2, 0.02, h), glow: mixColor(A, C.white, 0.25), glowA: 0.34, ink: C.white, mute: oklch(0.72, 0.02, h), accent: mixColor(A, C.white, 0.28), rings: 0.05 },
  deepField: { kind: 'night', tone: 'dark', top: oklch(0.2, 0.04, h), bottom: oklch(0.13, 0.03, h), floor: oklch(0.24, 0.05, h), glow: mixColor(A, C.white, 0.3), glowA: 0.4, ink: C.white, mute: oklch(0.75, 0.03, h), accent: mixColor(A, C.white, 0.28), rings: 0.04 },
};
/** The built look a photograph's tone stands on (and stands in for it until it is fetched). */
const PLATE_LOOK: Record<string, string> = { clouds: 'paleSky', sky: 'paleSky', studio: 'nearWhite', aerial: 'deepField', sea: 'deepField', nightCity: 'blackField', macro: 'deepField' };
/** What the turn floods into: the opposite value, or the brand's field from a light stage. */
const TURN_TO: Record<string, string> = { paleSky: 'electric', nearWhite: 'electric', electric: 'paleSky', blackField: 'electric', deepField: 'electric' };

const dealt = String(DEAL.ground);
const baseKind = PLATES.has(dealt) ? PLATE_LOOK[dealt] : dealt in LOOKS ? dealt : 'paleSky';
export const PLATE_SRC = PLATES.has(dealt) && hasStatic(`plates/${dealt}.jpg`) ? staticFile(`plates/${dealt}-soft.jpg`) : undefined;
/** The world before the turn, and after it. */
export const LOOK_A: Look = { ...LOOKS[baseKind], ...(PLATE_SRC ? { kind: 'plate' as const, plate: PLATE_SRC } : {}) };
export const LOOK_B: Look = LOOKS[TURN_TO[baseKind] ?? 'electric'];

/** The world's steps (one per act) and their camera moves. */
const TURN = SPINE_PLAN.world.find((w) => w.step === 'turn');
export const WORLD_TURN = { at: TURN?.at ?? Infinity, dur: 34, x: 0.5, y: 0.5 } as const;
const STEPS = stepsFromPlan(SPINE_PLAN, { turnFrom: { x: W * WORLD_TURN.x, y: H * WORLD_TURN.y } });
const MOVES = worldStepMoves(STEPS, { fps: FPS, width: W, height: H });
/** The flood's progress at film frame F (0 before the turn, 1 once it covers the frame). */
export const turnAt = (F: number) => (F < WORLD_TURN.at ? 0 : E.glideOut(clamp((F - WORLD_TURN.at) / f60x(WORLD_TURN.dur))));
/** The look the frame stands in (the flood's far side once it has covered the frame). */
export const lookAt = (F: number): Look => (turnAt(F) >= 1 || F >= WORLD_TURN.at + f60x(WORLD_TURN.dur * 0.5) ? LOOK_B : LOOK_A);
/** The kit screens' tone in the world at F: light cards on a light stage, dark glass on a field or at night. */
export const toneAt = (F: number): Tone => lookAt(F).tone;

/** Every moving plane of the world overscans the frame by this share on each side, so a pull-back or a step never shows its edge. */
const OVER = 0.16;
const Field: React.FC<{ look: Look; m: { x: number; y: number; s: number } }> = ({ look, m }) => {
  const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  const over: React.CSSProperties = { position: 'absolute', left: -W * OVER, top: -H * OVER, width: W * (1 + 2 * OVER), height: H * (1 + 2 * OVER) };
  // the backdrop: a vertical value ramp (dithered, baked once), lit from above
  const back = bakePlate('linear', [{ at: 0, color: look.top }, { at: 0.62, color: mixColor(look.top, look.bottom, 0.6) }, { at: 1, color: look.bottom }], 64, 256, { vertical: true });
  // the light pool from above-left (the key) and the glow on the floor under the element (in the brand's hue)
  const key = bakePlate('radial', [{ at: 0, color: C.white, alpha: look.tone === 'light' ? 0.85 : 0.16 }, { at: 0.5, color: C.white, alpha: look.tone === 'light' ? 0.35 : 0.05 }, { at: 1, color: C.white, alpha: 0 }], 320, 180, { cx: 0.5, cy: 0.36, rx: 0.5, ry: 0.62 });
  const glow = bakePlate('radial', [{ at: 0, color: look.glow, alpha: look.glowA }, { at: 0.55, color: look.glow, alpha: look.glowA * 0.35 }, { at: 1, color: look.glow, alpha: 0 }], 320, 180, { cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.5 });
  const vig = bakePlate('radial', [{ at: 0, color: MASK, alpha: 0 }, { at: 0.55, color: MASK, alpha: 0 }, { at: 1, color: MASK, alpha: look.tone === 'light' ? 0.06 : 0.32 }], 320, 180, { rx: 0.72, ry: 0.72 });
  // parallax: the backdrop moves a third of the step, the floor and its pool the whole step and a little more
  const far = `translate(${(m.x * 0.35).toFixed(2)}px, ${(m.y * 0.35).toFixed(2)}px) scale(${(1 + (m.s - 1) * 0.35).toFixed(5)})`;
  const near = `translate(${(m.x * 1.2).toFixed(2)}px, ${(m.y * 1.2).toFixed(2)}px) scale(${(1 + (m.s - 1) * 1.25).toFixed(5)})`;
  const horizon = H * 0.7;
  return (
    <div style={{ ...fill, background: look.bottom }} data-world={look.kind}>
      <Img src={back} style={{ ...over, transformOrigin: '50% 40%', transform: far }} />
      {look.plate ? <Img src={look.plate} data-imagery="" style={{ ...over, objectFit: 'cover', transformOrigin: '50% 45%', transform: far }} /> : null}
      <Img src={key} style={{ ...over, transformOrigin: '50% 40%', transform: far }} />
      {/* the floor: a lighter plane from a soft horizon, the pool of light on it under the element */}
      <div style={{ position: 'absolute', left: -W * 0.3, top: horizon, width: W * 1.6, height: H * 0.62, transformOrigin: `${W * 0.6}px 0px`, transform: near, background: `linear-gradient(180deg, ${withAlpha(mixColor(look.floor, look.bottom, 0.5), 0)} 0%, ${look.floor} 22%, ${mixColor(look.floor, look.bottom, 0.35)} 100%)`, opacity: look.plate ? 0.4 : 1 }} />
      <Img src={glow} style={{ position: 'absolute', left: -W * 0.15, top: H * 0.62, width: W * 1.3, height: H * 0.7, transformOrigin: `${W * 0.55}px 0px`, transform: near }} />
      {look.rings > 0 ? (
        <svg width={W} height={H} style={{ ...fill, transformOrigin: '50% 92%', transform: near }}>
          {[0.42, 0.7, 1.02, 1.4].map((r, i) => (
            <ellipse key={i} cx={W / 2} cy={H * 0.95} rx={W * r} ry={W * r * 0.3} fill="none" stroke="#FFFFFF" strokeOpacity={look.rings * (1 - i * 0.18)} strokeWidth={1.6} />
          ))}
        </svg>
      ) : null}
      <Img src={vig} style={fill} />
    </div>
  );
};

/** The world under the whole film at film frame F: the dealt look stepping act by act, the turn flooding out of the element. */
export const FilmWorld: React.FC<{ F: number; children?: React.ReactNode }> = ({ F, children }) => {
  const m = plateMove(F, MOVES);
  const k = turnAt(F);
  const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' };
  const cx = W * WORLD_TURN.x;
  const cy = H * WORLD_TURN.y;
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.04;
  return (
    <div style={{ ...fill, background: (k >= 1 ? LOOK_B : LOOK_A).bottom }}>
      {k < 1 ? <Field look={LOOK_A} m={m} /> : null}
      {k > 0 ? (
        <div style={{ ...fill, clipPath: k < 1 ? `circle(${(R * k).toFixed(1)}px at ${cx}px ${cy}px)` : undefined }}>
          <Field look={LOOK_B} m={m} />
        </div>
      ) : null}
      {children}
    </div>
  );
};
export const WORLD_HUE = hueOf(A);
