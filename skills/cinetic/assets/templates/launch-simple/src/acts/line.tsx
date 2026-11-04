// A line, set in place and centred so the element can come out of it (its starred word swells into the next form) or
// sit in it. In the film's pairing (the tokens' FONT.text), big: a line alone at a cap of 9.2 % of the frame, the claim
// at 11.2 % (the hero), a line round the element at 8 % (timeline.ts LINE_CAP, fitLine): a long line takes two rows
// rather than shrinking under 7 % (never a small line in a wide empty frame). It reads fast: the words arrive whole or in
// at most three chunks (timeline.ts CHUNK: 9 f@60 apart), never typed word by word. The voice (deal.ts voice): build,
// each chunk born in the accent, rising 0.3 of its size into place on an arrive curve and draining to ink; ink, each
// chunk from a pale ink; blur, the whole line at once. The starred word keeps the accent. Out: the words part away from
// the key word at speed while it takes the centre (the element leaves through the gap), or the whole line lifts away;
// the parting words stay in sight until the cut, so the element is never left alone on an empty ground. A held line
// creeps (a slow push, never a drift sideways or a bob).
import React from 'react';
import { C, FONT, TYPE } from '../brand/tokens';
import { TYPE_FEATURES } from '../fx/TypePairs';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha as withAlphaHex } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import { textW } from '../kit/screens';
import { CHUNK, chunkWords, DEAL, f60x, fitLine, keyWords, LINE_CAP, VOICE, W } from '../timeline';

/** Statement type: cap targets as shares of the frame height (timeline.ts LINE_CAP), weights, tracking. */
export const LINE_SET = { cap: LINE_CAP.capEm, alone: LINE_CAP.alone, around: LINE_CAP.around, claim: LINE_CAP.claim, maxW: LINE_CAP.maxW, weight: Math.max(560, TYPE.line.weight), keyGain: 140, track: -0.022 } as const;

export type SetWord = { word: string; key: boolean; x: number; w: number; row: number; chunk: number };
export type SetLine = { size: number; weight: number; words: SetWord[]; width: number; rowW: number[]; rows: number; space: number; h: number; cap: number };

const measure = (s: string, size: number, weight: number) => (typeof document === 'undefined' ? textW(s, size, weight, LINE_SET.track) : measureTracked(s, size, weight, LINE_SET.track, FONT.text, { trailing: false }));
const keyWeight = (w: number) => Math.min(860, w + LINE_SET.keyGain);

/**
 * The line laid out at a cap share (timeline.ts fitLine: the size from a deterministic estimate, the same in the
 * browser and in Node, so the element the checks follow is the one drawn; a second row when one row would set it under
 * the floor). Each word's x is from its row's left edge; `chunk` is the part of the line it arrives with.
 */
export const setLine = (raw: string, cap: number, _frameH?: number): SetLine => {
  const kw = keyWords(raw);
  const fit = fitLine(raw, cap);
  const size = fit.size;
  const space = size * LINE_CAP.gap;
  const chunkOf = new Array<number>(kw.length).fill(0);
  chunkWords(kw.length).forEach((ws, c) => ws.forEach((i) => (chunkOf[i] = c)));
  const rows = Math.max(...fit.rows) + 1;
  const rowW = new Array<number>(rows).fill(0);
  const words = kw.map((k, i) => {
    const r = fit.rows[i];
    const w = measure(k.word, size, k.key ? keyWeight(LINE_SET.weight) : LINE_SET.weight);
    const x = rowW[r] + (rowW[r] > 0 ? space : 0);
    rowW[r] = x + w;
    return { word: k.word, key: k.key, x, w, row: r, chunk: chunkOf[i] };
  });
  return { size, weight: LINE_SET.weight, words, width: Math.max(...rowW), rowW, rows, space, h: size * 1.12, cap: fit.cap };
};

/** A chunk's start (frames from the line's first frame, f@60 converted); the blur voice brings the whole line at once. */
export const chunkStart = (c: number, fps: number) => (DEAL.voice === 'blur' ? 0 : f60x(c * CHUNK.stagger, fps));
/** The centre of row r about the line's centre cy (two rows sit one above the other, a tight lead). */
export const rowY = (L: SetLine, r: number, cy: number) => cy + (r - (L.rows - 1) / 2) * L.size * LINE_CAP.lead;
/** Where row r's left edge stands, centred on cx. */
export const rowLeft = (L: SetLine, r: number, cx: number) => cx - L.rowW[r] / 2;

/** The key word's box (the starred phrase, else the last word) centred on (cx, cy), scaled by `s` about (cx, cy). */
export const keyBox = (L: SetLine, _t: number, _fps: number, cx: number, cy: number, s = 1) => {
  const keys = L.words.filter((w) => w.key);
  const k0 = keys[0] ?? L.words[L.words.length - 1];
  const k1 = keys.filter((w) => w.row === k0.row).pop() ?? k0;
  const x = rowLeft(L, k0.row, cx) + k0.x;
  const y = rowY(L, k0.row, cy) - L.h / 2;
  return { x: cx + (x - cx) * s, y: cy + (y - cy) * s, w: (k1.x + k1.w - k0.x) * s, h: L.h * s };
};

/**
 * The words drawn. `t` frames since the first chunk; `out` 0..1 (the words part away from the key word, or the line
 * lifts when `lift`); `keyOpacity` the key word's own opacity (0 while a handover carries it); `ink` / `accent` colours;
 * `s` a creep scale about (cx, cy); `gather` 0..1 the key word becoming a chip of `chip` (gliding to the centre with
 * `glide`; by default it stays where it stands and the handover carries it); `chipK` 0..1 the
 * key word still a chip in place (a chip that just landed in the line, fading to the plain word, never in one frame).
 */
export const LineWords: React.FC<{ L: SetLine; t: number; fps: number; cx: number; cy: number; ink: string; accent: string; out?: number; lift?: boolean; keyOpacity?: number; s?: number; id?: string; gather?: number; chip?: string; chipK?: number; glide?: boolean }> = ({ L, t, fps, cx, cy, ink, accent, out = 0, lift = false, keyOpacity = 1, s = 1, id = 'line', gather = 0, chip, chipK = 0, glide = false }) => {
  const keyI = Math.max(0, L.words.findIndex((w) => w.key));
  const kw0 = L.words[keyI];
  const keyMid = rowLeft(L, kw0.row, cx) + kw0.x + kw0.w / 2;
  const keyRowY = rowY(L, kw0.row, cy);
  const o = E.launchIn(clamp(out));
  const g = E.strongInOut(clamp(gather));
  const ck = Math.max(clamp(gather * 2), clamp(chipK)); // how much the key word is a chip
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transformOrigin: `${cx}px ${cy}px`, transform: `scale(${s.toFixed(5)})` }}>
      {Array.from({ length: L.rows }, (_, r) => (
        <div key={r} data-text={r === 0 ? id : `${id}-${r + 1}`} style={{ position: 'absolute', left: cx - W / 2, top: rowY(L, r, cy) - L.h / 2, width: W, textAlign: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: L.size, letterSpacing: `${LINE_SET.track}em`, lineHeight: 1.12, ...TYPE_FEATURES }}>
          {L.words.map((w, i) => {
            if (w.row !== r) return null;
            const first = L.words.findIndex((x) => x.row === r) === i;
            const tw = t - chunkStart(w.chunk, fps);
            const a = tw < 0 ? 0 : E.glideOut(clamp(tw / f60x(DEAL.voice === 'blur' ? 20 : VOICE.fade, fps)));
            const rise = tw < 0 || DEAL.voice === 'blur' ? 0 : (1 - E.glideOut(clamp(tw / f60x(18, fps)))) * VOICE.rise * L.size;
            const drain = DEAL.voice === 'ink' ? clamp(tw / f60x(10, fps)) : clamp((tw - f60x(2, fps)) / f60x(VOICE.drain, fps));
            const base = DEAL.voice === 'ink' ? mixColor(ink, C.white, 0.6) : accent;
            const color = w.key ? accent : mixColor(base, ink, drain);
            // out: the words leave from the key word at speed (or the line lifts), fading as they go, never a fade in place
            const mid = rowLeft(L, r, cx) + w.x + w.w / 2;
            const side = mid < keyMid ? -1 : 1;
            // the parting is short and soft (it rides the element's flight, never a move of its own)
            const dx = w.key ? (glide ? (cx - keyMid) * g : 0) : lift ? 0 : side * o * (W * 0.02 + Math.abs(mid - keyMid) * 0.12);
            const dy = w.key ? (glide ? (cy - keyRowY) * g : 0) : lift ? -o * L.size * 0.9 : 0;
            const op = (w.key ? keyOpacity : 1) * a * (1 - (lift || !w.key ? clamp(out * 1.25) : 0));
            return (
              <span key={i} style={{ display: 'inline-block', marginLeft: first ? 0 : L.space, fontWeight: w.key ? keyWeight(L.weight) : L.weight, color: w.key && chip ? mixColor(color, C.white, ck) : color, opacity: op, transform: `translate3d(${dx.toFixed(2)}px, ${(rise + dy).toFixed(2)}px, 0)`, ...(w.key && chip && ck > 0 ? { borderRadius: L.h, background: withAlphaHex(chip, ck), boxShadow: `0 0 0 ${(CHIP.pad * L.size * ck).toFixed(2)}px ${withAlphaHex(chip, ck)}` } : {}) }}>
                {w.word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
export const LINE_INK = C.ink;
/** The key word as a chip (its padding as a share of the type size) when it is about to become the element. */
export const CHIP = { pad: 0.22 } as const;
