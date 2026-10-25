import React from 'react';
import { clamp, E, mix, type Token } from '../lib/anim';
import { irregularOnsets } from './deviceUtil';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { HardStepAt } from './HardStep';
import { stepValue } from './HardStep';
import type { Declares } from '../timeline';

/**
 * Seed: a tiny coloured square appears exactly where something will land and sits there for a few frames
 * (the eye finds the spot first), then unfolds into the thing itself. The square is cut on, never faded or
 * scaled in; its colour is the arriving element's own.
 *
 *   burst    the square bursts into a tile (a photo, a card): expo-out to the full box, starting a third of
 *            the way there on the first grow frame (house: seed 4 f, grow 14 f; a new tile every 4-6 f)
 *   stretch  a square of the bar's height stretches into a label bar along x, then its text types (20 f)
 *   capsule  a line end becomes a capsule that widens centre-out, then opens in height into a labelled card
 *   widths   after any of them, the width can follow typing instantly (a sticky note widening per character)
 *
 * Pure: seedState(f) for any frame; the seed's first frame is a cut (declared stepped).
 */

export type SeedBox = { x: number; y: number; w: number; h: number; r?: number };

/** House numbers: frames at 60 fps, px at 1080p. */
export const SEED = { size: 24, hold60: 4, grow60: 14, from: 0.33, stretch60: 20, capsule60: 17, every60: [4, 6] as [number, number] } as const;

export type SeedProps = {
  at: number; // the seed's first frame (it is cut on)
  box: SeedBox; // where the element lands (px)
  mode?: 'burst' | 'stretch' | 'capsule';
  seed?: { size?: number; hold?: number; anchor?: 'centre' | 'left' | 'right' }; // size px at 1080p (stretch: the bar height), hold 60 fps frames
  grow?: { frames?: number; ease?: Token<'arrive'>; from?: number }; // 60 fps frames; `from` = progress on the first grow frame
  widths?: HardStepAt<number>[]; // instant widths after the grow (typing), left-anchored
  id?: string;
};

export type SeedState = { phase: 'off' | 'seed' | 'grow' | 'done'; box: Required<SeedBox>; k: number; content: number };

const frames = (p: SeedProps, fps: number) => {
  const mode = p.mode ?? 'burst';
  const hold = Math.round(f60x(p.seed?.hold ?? SEED.hold60, fps));
  const g = Math.max(1, f60x(p.grow?.frames ?? (mode === 'stretch' ? SEED.stretch60 : mode === 'capsule' ? SEED.capsule60 : SEED.grow60), fps));
  return { hold, g };
};

/** The seed square's box (px). */
const seedBox = (p: SeedProps, s: number): Required<SeedBox> => {
  const b = p.box;
  const anchor = p.seed?.anchor ?? (p.mode === 'stretch' ? 'left' : 'centre');
  const cy = b.y + b.h / 2;
  const x = anchor === 'left' ? b.x : anchor === 'right' ? b.x + b.w - s : b.x + b.w / 2 - s / 2;
  return { x, y: cy - s / 2, w: s, h: s, r: Math.min(s * 0.2, b.r ?? s * 0.2) };
};

/** The element's box at frame f, its phase and grow progress, and how much of its content shows. Pure. */
export const seedState = (frame: number, p: SeedProps, film?: Partial<FilmCtx>): SeedState => {
  const fps = fpsOf(film);
  const mode = p.mode ?? 'burst';
  const { hold, g } = frames(p, fps);
  const b = { ...p.box, r: p.box.r ?? 0 };
  const s = mode === 'stretch' ? p.box.h : (p.seed?.size ?? SEED.size) * uOf(film);
  const sb = seedBox(p, s);
  const F = Math.round(frame);
  if (F < p.at) return { phase: 'off', box: sb, k: 0, content: 0 };
  if (F < p.at + hold) return { phase: 'seed', box: sb, k: 0, content: 0 };
  const t = clamp((frame - (p.at + hold)) / g);
  const from = p.grow?.from ?? (mode === 'burst' ? SEED.from : 0);
  const k = t <= 0 ? from : from + (1 - from) * (p.grow?.ease ?? E.snapOut)(t);
  let box: Required<SeedBox>;
  if (mode === 'stretch') {
    box = { x: sb.x, y: b.y, w: mix(sb.w, b.w, k), h: b.h, r: b.r };
  } else if (mode === 'capsule') {
    const kw = clamp(k / 0.6); // width first, centre-out
    const kh = clamp((k - 0.45) / 0.55); // then height
    const w = mix(sb.w, b.w, kw);
    const h = mix(sb.h, b.h, kh);
    box = { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, r: mix(sb.h / 2, b.r, kh) };
  } else {
    box = { x: mix(sb.x, b.x, k), y: mix(sb.y, b.y, k), w: mix(sb.w, b.w, k), h: mix(sb.h, b.h, k), r: mix(sb.r, b.r, k) };
  }
  if (t >= 1 && p.widths?.length) box = { ...box, w: stepValue(frame, p.widths, box.w) };
  const content = mode === 'burst' ? clamp((k - from) / 0.3) : mode === 'capsule' ? clamp((k - 0.6) / 0.4) : clamp((k - 0.5) / 0.5);
  return { phase: t >= 1 ? 'done' : 'grow', box, k, content };
};

/** Sync: the seed's cut-on (a glockenspiel note on the first seed of a run), the grow start and the landing. */
export const seedFrames = (p: SeedProps, film?: Partial<FilmCtx>) => {
  const { hold, g } = frames(p, fpsOf(film));
  return { seed: p.at, grow: p.at + hold, done: Math.ceil(p.at + hold + g) };
};

/** Onsets of a run of seeds: a new one every 4-6 f at 60 fps, irregular but repeatable (whole frames from `start`). */
export const seedOnsets = (start: number, n: number, film?: Partial<FilmCtx>, seed: string | number = 'seed', every: [number, number] = SEED.every60): number[] =>
  irregularOnsets(start, n, every, seed, fpsOf(film));

/**
 * Draws the growing element: a box in `color` at the current extent, `children` laid out at the final box
 * (so nothing reflows) and clipped by the growing one, revealed by `content`.
 */
export const Seed: React.FC<SeedProps & { frame: number; color: string; children?: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = seedState(props.frame, props, film);
  if (s.phase === 'off') return null;
  const b = s.box;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, borderRadius: b.r, overflow: 'hidden', background: props.color, transform: `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px)`, ...props.style }}>
      {props.children && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: props.box.w, height: props.box.h, opacity: s.content, transform: `translate(${(props.box.x - b.x).toFixed(2)}px, ${(props.box.y - b.y).toFixed(2)}px)` }}>
          {props.children}
        </div>
      )}
    </div>
  );
};

/** The seed's first frame is a cut-on (a designed step); instant widths are steps too. */
export const declares = (p?: Partial<SeedProps>, _film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const id = p.id ?? 'seed';
  const stepped = [{ from: p.at, to: p.at + 1, id }, ...(p.widths ?? []).map((w, i) => ({ from: w.at, to: w.at + 1, id: `${id}-w${i}` }))];
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
