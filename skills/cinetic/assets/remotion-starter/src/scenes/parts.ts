// The parts every house scene shares: the palette it takes (the brand's, never a fixed colour), its clock (every number
// in a scene is written in frames at 30 fps and played at the film's rate), its meta entry (length, the content it
// takes, the forms it takes over and hands on, big or quiet, the sounds its action makes) and the product's mark.
// Pure: no clock of its own, nothing random.
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { type Logo, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { C } from '../brand/tokens';
import { clamp, trackLinear, type TrackKey } from '../lib/anim';
import { mixColor } from '../lib/color';
import type { Form } from '../lib/spine';

/** The brand's colours a scene paints with: the ground, the ink, the accent and its light end, the white of cards. */
export type Palette = { ground: string; ink: string; accent: string; lift: string; paper: string };
/** A palette from the film's tokens, any field overridden. */
export const paletteOf = (p: Partial<Palette> = {}): Palette => ({
  ground: p.ground ?? C.paper,
  ink: p.ink ?? C.ink,
  accent: p.accent ?? C.accent,
  lift: p.lift ?? C.accentLift,
  paper: p.paper ?? C.white,
});

/** Big scenes carry a film (at least two per launch); quiet ones state a point between them. */
export type SceneClass = 'big' | 'quiet';
/** The sound kinds of the effects plan (the same names the templates' scene moments use). */
export type CueKind = 'tick' | 'tock' | 'hit' | 'land' | 'pop' | 'whoosh' | 'riser' | 'drop' | 'key' | 'click' | 'snap' | 'swell' | 'bell' | 'suck' | 'text';
/** A sound the scene's own action makes: frames at 30 fps from the scene's first frame. */
export type SceneCue = { f: number; kind: CueKind; id: string; weight: number };
/** The element a scene takes over on its first frame or hands on at its last: its form and box (px of 1920 x 1080). */
export type HandBox = { form: Form; x: number; y: number; w: number; h: number; r?: number };
export type SceneMeta = {
  id: string; // what it does, as a name
  does: string; // the moment in one line
  dur: number; // frames at 30 fps with the default content
  props: readonly string[]; // the content it takes
  handIn: HandBox | null; // the form it takes over (null: it opens on its own picture)
  handOut: HandBox; // the form it hands on
  klass: SceneClass;
  cues: readonly SceneCue[];
};

/**
 * The scene's clock: `t` = frames at 30 fps since the scene began (fractional at other rates), the frame's size and
 * its layout unit `u` (1 at 1080 lines). `frame` overrides the Sequence's frame (a scene driven by a parent's clock).
 */
export const useClock = (frame?: number) => {
  const cur = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = fps / 30;
  return { t: (frame ?? cur) / k, fps, k, W: width, H: height, u: Math.min(width, height) / 1080 };
};

/** A measured table (frame at 30 fps, value), linear between keys, held outside them. */
export const tab = (t: number, keys: readonly TrackKey[]) => trackLinear(t, keys);
/** Keys from a list of values one frame apart starting at `at` (a per-frame table). */
export const perFrame = (at: number, values: readonly number[], step = 1): TrackKey[] => values.map((v, i) => [at + i * step, v] as const);
/** 0..1 through [a, b] (clamped). */
export const span = (t: number, a: number, b: number) => clamp((t - a) / Math.max(1e-6, b - a));
/** An exponential approach from 1 to 0 with time constant `tau` frames, 1 before `at`. */
export const decay = (t: number, at: number, tau: number) => (t <= at ? 1 : Math.exp(-(t - at) / tau));
/** Hold a graphic on a stepped clock: the frame floored to steps of `every` frames (twos: 2). */
export const stepped = (t: number, every: number) => Math.floor(t / every) * every;
/** A colour along stops at progress p (0..1), mixed in OKLab (lib/color). */
export const ramp = (stops: readonly string[], p: number) => {
  const q = clamp(p) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(q));
  return mixColor(stops[i], stops[i + 1], q - i);
};
/** The product's mark: the parsed brand SVG, or the starter's placeholder mark. */
export const markOf = (logo?: Logo): Logo => logo ?? logoParts(SAMPLE_MARK_SVG);
/** The mark's box in px for a 100-unit size `size`: where its ink sits inside the square. */
export const markBox = (logo: Logo, size: number) => ({ x: (logo.box.x * size) / 100, y: (logo.box.y * size) / 100, w: (logo.box.w * size) / 100, h: (logo.box.h * size) / 100 });
/** A deterministic shuffle-free pick: the i-th item of a list, wrapping. */
export const nth = <T,>(list: readonly T[], i: number): T => list[((i % list.length) + list.length) % list.length];
