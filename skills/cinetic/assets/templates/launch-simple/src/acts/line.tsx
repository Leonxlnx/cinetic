// A line, set word by word so the element can come out of it (its starred word swells into the next form) or sit in it.
// Centred, in the film's pairing (the tokens' FONT.text), at a cap of 8.6 % of the frame for a line alone (8 % for a
// line around the element, 10.8 % for the claim; a long line shrinks to 84 % of the width). The build (deal.ts voice): each word is born in the accent, rises 0.55 of
// its x-height into place at .7 / .9 / 1 opacity and drains to ink in 7 f; the line re-centres on the words already
// there, front-loaded (E.jump: most of the move on its first frame). The starred word keeps the accent. Out: the words
// part away from the key word at speed (the element leaves through the gap), or the whole line lifts away. A held line
// creeps (a slow push, never a drift sideways or a bob).
import React from 'react';
import { C, FONT, TYPE } from '../brand/tokens';
import { TYPE_FEATURES } from '../fx/TypePairs';
import { clamp, E, mix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { textW } from '../kit/screens';
import { DEAL, f60x, keyWords, VOICE, W } from '../timeline';

/** Statement type: cap targets as shares of the frame height, weights, tracking. */
export const LINE_SET = { cap: 0.727, alone: 0.086, around: 0.08, claim: 0.108, maxW: 0.84, weight: Math.max(560, TYPE.line.weight), keyGain: 140, track: -0.022 } as const;

export type SetWord = { word: string; key: boolean; x: number; w: number };
export type SetLine = { size: number; weight: number; words: SetWord[]; width: number; space: number; h: number };

const measure = (s: string, size: number, weight: number) => (typeof document === 'undefined' ? textW(s, size, weight, LINE_SET.track) : measureTracked(s, size, weight, LINE_SET.track, FONT.text, { trailing: false }));

/** The line laid out at a cap share of `frameH` (it shrinks to fit LINE_SET.maxW of the width): each word's x from the line's left. */
export const setLine = (raw: string, cap: number, frameH: number): SetLine => {
  const kw = keyWords(raw);
  let size = (cap * frameH) / LINE_SET.cap;
  const wOf = (k: boolean) => (k ? Math.min(860, LINE_SET.weight + LINE_SET.keyGain) : LINE_SET.weight);
  const lay = (sz: number) => {
    const space = sz * 0.27; // a word space of the voice faces (a measured 'a a' loses it to the trailing trim)
    let x = 0;
    const words = kw.map((k, i) => {
      const w = measure(k.word, sz, wOf(k.key));
      const out = { word: k.word, key: k.key, x: x + (i ? space : 0), w };
      x = out.x + w;
      return out;
    });
    return { words, width: x, space };
  };
  // the fit to the frame from a deterministic estimate (0.62 em a character, a wide face's advance), never from the
  // measured widths: the size, and with it the key word's chip and the element's box, is the same in the browser and
  // in Node (the sound and the checks read the boxes there), so the element the checks follow is the one drawn
  const est = kw.reduce((t, k, i) => t + k.word.length * 0.62 * size + (i ? size * 0.27 : 0), 0);
  if (est > W * LINE_SET.maxW) size *= (W * LINE_SET.maxW) / est;
  const L = lay(size);
  return { size, weight: LINE_SET.weight, ...L, h: size * 1.12 };
};

/** Each word's start (frames from the line's first frame, f@60 converted): the voice's stagger. */
export const wordStart = (i: number, fps: number) => f60x(i * VOICE.stagger, fps);

/** Where the line's left edge stands at t (frames since its first word): centred on the words already there, re-centring front-loaded. */
export const lineLeft = (L: SetLine, t: number, fps: number, cx = W / 2) => {
  let off = 0;
  L.words.forEach((w, i) => {
    if (i === 0) return;
    const there = DEAL.voice === 'build' ? E.jump(clamp((t - wordStart(i, fps)) / f60x(VOICE.recentre, fps))) : 1;
    off += ((w.w + L.space) / 2) * (1 - there);
  });
  return cx - L.width / 2 + off;
};

/** The key word's box (the first starred word, else the last word) at t, centred on (cx, cy), scaled by `s` about (cx, cy). */
export const keyBox = (L: SetLine, t: number, fps: number, cx: number, cy: number, s = 1) => {
  // the key phrase: from its first starred word to its last (one word, or a phrase like *one line*)
  const keys = L.words.filter((w) => w.key);
  const k0 = keys[0] ?? L.words[L.words.length - 1];
  const k1 = keys[keys.length - 1] ?? k0;
  const left = lineLeft(L, t, fps, cx);
  const x = left + k0.x;
  const y = cy - L.h / 2;
  return { x: cx + (x - cx) * s, y: cy + (y - cy) * s, w: (k1.x + k1.w - k0.x) * s, h: L.h * s };
};

/**
 * The words drawn. `t` frames since the first word; `out` 0..1 (the words part away from the key word, or the line
 * lifts when `lift`); `keyOpacity` the key word's own opacity (0 while a handover carries it); `ink` / `accent` colours;
 * `s` a creep scale about (cx, cy).
 */
export const LineWords: React.FC<{ L: SetLine; t: number; fps: number; cx: number; cy: number; ink: string; accent: string; out?: number; lift?: boolean; keyOpacity?: number; s?: number; id?: string; gather?: number; chip?: string }> = ({ L, t, fps, cx, cy, ink, accent, out = 0, lift = false, keyOpacity = 1, s = 1, id = 'line', gather = 0, chip }) => {
  // the browser sets the row (each word an inline block, the spaces as margins), centred on cx; the re-centre moves the
  // row by the words not yet there, so the measured widths only size that move, never the spacing
  const shift = lineLeft(L, t, fps, cx) - (cx - L.width / 2);
  const keyI = Math.max(0, L.words.findIndex((w) => w.key));
  const keyMid = (L.words[keyI]?.x ?? 0) + (L.words[keyI]?.w ?? 0) / 2;
  const o = E.launchIn(clamp(out));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transformOrigin: `${cx}px ${cy}px`, transform: `scale(${s.toFixed(5)})` }}>
      <div data-text={id} style={{ position: 'absolute', left: cx - W / 2, top: cy - L.h / 2, width: W, textAlign: 'center', whiteSpace: 'pre', transform: `translate3d(${shift.toFixed(2)}px, 0, 0)`, fontFamily: FONT.text, fontSize: L.size, letterSpacing: `${LINE_SET.track}em`, lineHeight: 1.12, ...TYPE_FEATURES }}>
        {L.words.map((w, i) => {
          const tw = t - wordStart(i, fps);
          const q = tw / f60x(2, fps);
          const a = tw < 0 ? 0 : DEAL.voice === 'blur' ? E.glideOut(clamp(t / f60x(20, fps))) : q < 1 ? mix(0.7, 0.9, q) : q < 2 ? mix(0.9, 1, q - 1) : 1;
          const rise = tw < 0 || DEAL.voice === 'blur' ? 0 : (1 - E.glideOut(clamp(tw / f60x(18, fps)))) * VOICE.rise * 0.5 * L.size;
          const drain = DEAL.voice === 'ink' ? clamp(tw / f60x(10, fps)) : clamp((tw - f60x(2, fps)) / f60x(VOICE.drain, fps));
          const base = DEAL.voice === 'ink' ? mixColor(ink, C.white, 0.6) : accent;
          const color = w.key ? accent : mixColor(base, ink, drain);
          // out: the words leave from the key word at speed (or the line lifts), never a fade in place
          const side = w.x + w.w / 2 < keyMid ? -1 : 1;
          // the rise lands on an arrive curve over 18 f@60 (a 4-6 f tail, never a dead stop); gather: the key word glides to the centre (it becomes the element there) as the others part
          const toMid = -(shift + keyMid - L.width / 2) * E.strongInOut(clamp(gather));
          const dx = w.key ? toMid : lift ? 0 : side * o * (W * 0.12 + Math.abs(w.x + w.w / 2 - keyMid) * 0.6);
          const dy = lift ? -o * L.size * 0.9 : 0;
          const op = (w.key ? keyOpacity : 1) * a * (1 - (lift || !w.key ? clamp(out * 1.25) : 0));
          return (
            <span key={i} style={{ display: 'inline-block', marginLeft: i ? L.space : 0, fontWeight: w.key ? Math.min(860, L.weight + LINE_SET.keyGain) : L.weight, color: w.key && chip ? mixColor(color, C.white, clamp(gather * 2)) : color, opacity: op, transform: `translate3d(${dx.toFixed(2)}px, ${(rise + dy).toFixed(2)}px, 0)`, ...(w.key && chip && gather > 0 ? { borderRadius: L.h, background: chip, boxShadow: `0 0 0 ${(CHIP.pad * L.size * clamp(gather * 2)).toFixed(2)}px ${chip}` } : {}) }}>
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
export const LINE_INK = C.ink;
/** The key word as a chip (its padding as a share of the type size) when it is about to become the element. */
export const CHIP = { pad: 0.22 } as const;
