// Temporal motion blur, the way a film camera makes it: an output frame is the average of n renders
// spread across a 180-degree shutter centred on the frame's time. Blur is a declared policy
// (timeline.ts LOOK.blur): 'crisp' (the house default: flat graphics stay sharp, one sample per
// frame) or 'camera' (the shutter samples fast moves); CAMERA_BLUR ranges give a crisp film its
// camera-real moments (a flick, a whip). n comes from how fast things move on screen in that frame
// (scripts/measure-speed.py, optical flow on the sharp render), so fast moves smear and still frames
// render once. The averaging happens outside the browser, in float (scripts/accumulate.py);
// compositing samples in Chromium quantises each one to 8 bits and rings.
//
// One sample, whatever the speed, on what is designed to be discrete: declared stepped ranges
// (STEPPED), flashes (FLASHES), the first frame of every act and every hard seam, and the same
// declared by the primitives themselves (each fx's declares(), collected by src/sync.ts). Sampling
// never crosses an act boundary, so designed cuts stay crisp. A frame too fast for its samples gets a
// shorter shutter from measure-speed.py (`shutters`), so the samples stay a few px apart and draw
// one clean, shorter streak instead of stepped copies.
import * as SYNC from './sync';
import * as TL from './timeline';
import type { BlurPolicy, CameraBlurRange, Declares, Flash, Seam, SteppedRange } from './timeline';

export const SHUTTER = 180; // degrees; scripts/measure-speed.py assumes the same

// Declarations are optional exports (a timeline written before them keeps the camera policy).
const T = TL as typeof TL & Partial<{ LOOK: { blur: BlurPolicy }; STEPPED: SteppedRange[]; FLASHES: Flash[]; CAMERA_BLUR: CameraBlurRange[]; SEAMS: Seam[] }>;
const fxDeclares = (SYNC as Partial<{ declares: () => (Declares & { id?: string })[] }>).declares;

/** Everything blur sampling needs to know about what the film does on purpose. */
export type BlurDecl = {
  blur: BlurPolicy; // the film's policy
  stepped: SteppedRange[]; // [from, to): one sample per frame
  flashes: Flash[]; // f .. f + frames - 1: one sample
  cameraBlur: CameraBlurRange[]; // [from, to): the camera policy inside a crisp film
  cuts: number[]; // first frames of acts and hard seams: one sample
  acts: { from: number; dur: number }[]; // sampling stays inside its act
};

/** The film's declarations: the timeline's own plus every primitive instance's (src/sync.ts declares()). */
export const declared = (): BlurDecl => {
  const fx = fxDeclares ? fxDeclares() : [];
  const acts = Object.values(T.ACT);
  return {
    blur: T.LOOK?.blur ?? 'camera',
    stepped: [...(T.STEPPED ?? []), ...fx.flatMap((d) => d.stepped ?? [])],
    flashes: [...(T.FLASHES ?? []), ...fx.flatMap((d) => d.flashes ?? [])],
    cameraBlur: [...(T.CAMERA_BLUR ?? []), ...fx.flatMap((d) => d.cameraBlur ?? [])],
    cuts: [...acts.map((a) => a.from), ...[...(T.SEAMS ?? []), ...fx.flatMap((d) => d.seams ?? [])].filter((s) => s.kind === 'hard').map((s) => s.at)],
    acts,
  };
};

const DECL = declared();

/** The blur policy at output frame f: 'camera' inside a CAMERA_BLUR range or when the film's policy is 'camera', else 'crisp'. */
export const policyAt = (f: number, d: BlurDecl = DECL): BlurPolicy =>
  d.blur === 'camera' || d.cameraBlur.some((r) => f >= r.from && f < r.to) ? 'camera' : 'crisp';

/** True when output frame f is designed to be discrete (a step, a flash, a cut): it renders from one sample. */
export const isDiscrete = (f: number, d: BlurDecl = DECL): boolean =>
  d.stepped.some((r) => f >= r.from && f < r.to) || d.flashes.some((x) => f >= x.f && f < x.f + x.frames) || d.cuts.includes(f);

/**
 * The n sub-frame times that make up output frame f (clamped inside f's act), across `shutter`
 * degrees. One sample under the crisp policy and on a declared discrete frame.
 */
export const sampleTimes = (f: number, n: number, shutter = SHUTTER, d: BlurDecl = DECL): number[] => {
  if (n <= 1 || policyAt(f, d) === 'crisp' || isDiscrete(f, d)) return [f];
  const a = d.acts.find((x) => f >= x.from && f < x.from + x.dur) ?? { from: 0, dur: T.TOTAL };
  const span = shutter / 360;
  const lo = a.from;
  const hi = a.from + a.dur - 1e-3;
  return Array.from({ length: n }, (_, i) => Math.min(hi, Math.max(lo, f + span * ((i + 0.5) / n - 0.5))));
};

export type SubFrame = { f: number; t: number };

/**
 * Every sub-frame of the blurred master in order, for per-frame sample counts `groups` (missing = 1)
 * and optional per-frame shutter angles `shutters` (missing = SHUTTER).
 */
export const subframes = (groups: number[], shutters: number[] = []): SubFrame[] => {
  const out: SubFrame[] = [];
  for (let f = 0; f < T.TOTAL; f++) for (const t of sampleTimes(f, groups[f] ?? 1, shutters[f] ?? SHUTTER)) out.push({ f, t });
  return out;
};
