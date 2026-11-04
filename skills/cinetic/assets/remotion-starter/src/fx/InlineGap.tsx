import React from 'react';
import { clamp, E, type Ease, fd, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { FONT } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * InlineGap: a sentence splits between two words, the halves part, and an object grows in the gap: an
 * image chip that hard-cuts through several pictures, a thumbnail that swaps while the line reflows, a
 * pill that types a sub-line. The line stays one line: the object is a word of it for a while.
 *
 * Anatomy (house, 60 fps): the halves part on an arrive curve (E.glideOut, 16 f; up to 76 f for a wide
 * gap), the chip grows from a thin bar once the gap is about a third open (7 f, near linear) and fills the
 * gap; its content swaps on hard cuts (every 6-20 f); the gap can close fast (5 f, accelerating) when the
 * object leaves. Pure state: inlineGapState(f) never measures; <InlineGap> measures the words (FontGate).
 */

/** House numbers: frames at 60 fps, px at 1080p. */
export const INLINE_GAP = { open60: 16, grow60: 7, delay: 0.35, bar: 3, margin: 10, close60: 5 } as const;

export type InlineGapProps = {
  at: number; // the halves start to part
  gap: number; // final extra space between the halves, px (the chip is gap + one space - 2 margins wide)
  h: number; // the chip's height, px
  open?: { frames?: number; ease?: Ease }; // 60 fps frames (house 16, E.glideOut)
  grow?: { frames?: number; delay?: number; ease?: Ease }; // 60 fps frames (house 7); delay = share of the open before it starts
  swaps?: number[]; // frames the chip's content hard-cuts to the next item
  close?: { at: number; frames?: number }; // the gap closes (house 5 f, E.buildIn)
  anchor?: 'centre' | 'left'; // centre: both halves part (the line stays centred); left: the right half moves
  margin?: number; // px at 1080p between the words and the chip (house 10)
  id?: string;
};

export type InlineGapState = { g: number; left: number; right: number; chip: { w: number; h: number; visible: boolean }; index: number; open: number };

/** The gap, the halves' offsets (px, from the closed line), the chip and the content index at frame f. Pure. */
export const inlineGapState = (frame: number, p: InlineGapProps, film?: Partial<FilmCtx>, space = 0): InlineGapState => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const of = Math.max(1, f60x(p.open?.frames ?? INLINE_GAP.open60, fps));
  const open = clamp((p.open?.ease ?? E.glideOut)(clamp((frame - p.at) / of)));
  let g = p.gap * open;
  if (p.close) g *= 1 - E.buildIn(clamp((frame - p.close.at) / Math.max(1, f60x(p.close.frames ?? INLINE_GAP.close60, fps))));
  const left = (p.anchor ?? 'centre') === 'centre' ? -g / 2 : 0;
  const right = (p.anchor ?? 'centre') === 'centre' ? g / 2 : g;
  const gf = Math.max(1, f60x(p.grow?.frames ?? INLINE_GAP.grow60, fps));
  const g0 = p.at + of * (p.grow?.delay ?? INLINE_GAP.delay);
  const kh = (p.grow?.ease ?? E.linear)(clamp((frame - g0) / gf));
  const margin = (p.margin ?? INLINE_GAP.margin) * u;
  const bar = INLINE_GAP.bar * u;
  const w = Math.max(bar, g + space - 2 * margin);
  const visible = frame >= g0 && g + space - 2 * margin > 0;
  const F = fd(frame);
  const index = (p.swaps ?? []).filter((s) => F >= s).length;
  return { g, left, right, chip: { w, h: mix(bar, p.h, kh), visible }, index, open };
};

/** Sync: the part (a soft whoosh), each content swap (a tick or a camera shutter), the close. */
export const inlineGapFrames = (p: InlineGapProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const of = f60x(p.open?.frames ?? INLINE_GAP.open60, fps);
  return { part: p.at, chip: Math.round(p.at + of * (p.grow?.delay ?? INLINE_GAP.delay)), open: Math.ceil(p.at + of), swaps: p.swaps ?? [], close: p.close?.at };
};

export type GapFont = { size: number; weight: number; track: number; family?: string; color: string };

/**
 * Draws the line `left` + gap + `right` centred on (x, y) (the baseline box's centre), the chip in the gap
 * showing items[index] (each item fills the chip; use cover images or kit UI). Measures the words.
 * `halves` lets each half arrive on its own (opacity and a rise in px from the film's word entrance).
 */
export const InlineGap: React.FC<InlineGapProps & { frame: number; leftText: string; rightText: string; x: number; y: number; font: GapFont; items: React.ReactNode[]; chipRadius?: number; chipFill?: string; halves?: { left?: { opacity?: number; dy?: number }; right?: { opacity?: number; dy?: number } } }> = (props) => {
  const film = useFilm();
  const f = props.font;
  const fam = f.family ?? FONT.text;
  const wl = measureTracked(props.leftText, f.size, f.weight, f.track, fam);
  const wr = measureTracked(props.rightText, f.size, f.weight, f.track, fam);
  const ws = measureTracked(' ', f.size, f.weight, f.track, fam);
  const s = inlineGapState(props.frame, props, film, ws);
  const T0 = wl + ws + wr;
  const x0 = props.x - T0 / 2;
  const lh = f.size * 1.2;
  const text: React.CSSProperties = { position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: fam, fontSize: f.size, fontWeight: f.weight, letterSpacing: `${f.track}em`, lineHeight: `${lh}px`, color: f.color, fontVariantNumeric: 'tabular-nums' };
  const cx = x0 + wl + ws / 2 + (s.left + s.right) / 2;
  const item = props.items.length ? props.items[Math.min(s.index, props.items.length - 1)] : null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      <div style={{ ...text, opacity: props.halves?.left?.opacity ?? 1, transform: `translate(${(x0 + s.left).toFixed(2)}px, ${(props.y - lh / 2 + (props.halves?.left?.dy ?? 0)).toFixed(2)}px)` }}>{props.leftText}</div>
      <div style={{ ...text, opacity: props.halves?.right?.opacity ?? 1, transform: `translate(${(x0 + wl + ws + s.right).toFixed(2)}px, ${(props.y - lh / 2 + (props.halves?.right?.dy ?? 0)).toFixed(2)}px)` }}>{props.rightText}</div>
      {s.chip.visible && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: s.chip.w, height: s.chip.h, overflow: 'hidden', background: props.chipFill,
            borderRadius: Math.min(props.chipRadius ?? s.chip.h * 0.28, s.chip.h / 2, s.chip.w / 2),
            transform: `translate(${(cx - s.chip.w / 2).toFixed(2)}px, ${(props.y - s.chip.h / 2).toFixed(2)}px)`,
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, width: Math.max(s.chip.w, props.h * 1.5), height: props.h, transform: `translate(${((s.chip.w - Math.max(s.chip.w, props.h * 1.5)) / 2).toFixed(2)}px, ${((s.chip.h - props.h) / 2).toFixed(2)}px)` }}>{item}</div>
        </div>
      )}
    </div>
  );
};

/** Each content swap is a hard cut: one stepped frame each. */
export const declares = (p?: Partial<InlineGapProps>, _film?: Partial<FilmCtx>): Declares => {
  if (!p?.swaps?.length) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: p.swaps.map((s, i) => ({ from: s, to: s + 1, id: `${p.id ?? 'inlineGap'}-${i}` })), flashes: [], cameraBlur: [], seams: [] };
};
