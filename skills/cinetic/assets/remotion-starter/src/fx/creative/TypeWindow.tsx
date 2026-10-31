// type-window: the product seen through the letters. The line builds; its other words step away and the key word grows
// to fill the frame, heavy, its letters turning into windows onto the product's scene; then the camera goes through:
// it dives into the thickest stroke of the word's middle letter (the letters growing x40 about a point inside the ink)
// while the picture inside settles from the word's size to rest, so the stroke becomes the frame and the frame is the
// product, at rest, and the picture plays on. The word and the picture are one shot.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { useFilm } from '../../lib/film';
import { fitInto, frameOf, k60, type LineProps, type Recipe, SceneView } from './core';
import { keyIndex, recentre, type RowFont, rowOf, widthIn, wordIn, WordAt } from './type';

/** House numbers (f@60, shares of the frame): the others stepping away, the key word growing (to `width` of the frame,
 * cap at most `cap`), the hold on the window, the dive through a stroke (to `zoom` x). */
export const WINDOW = { away: 14, grow: 30, width: 0.88, cap: 0.44, weight: 820, track: -0.055, hold: 14, through: 24, zoom: 40 } as const;
/** The device's tail after its words start to leave (f@60): away + grow + hold + through. */
/** The baseline below the line's centre, a share of the size (the face's ascent and the 1.06 leading). */
export const BASELINE = 0.333;
export const WINDOW_TAIL = WINDOW.grow + WINDOW.hold + WINDOW.through;

export const RECIPE: Recipe = {
  id: 'type-window',
  recipe:
    'The product seen through the letters: the line builds; the other words step away (14 f) as the key word grows on strongInOut (30 f) to 88 % of the width (weight 820, -0.055 em), its letters turning into windows onto the product\'s scene; held 14 f; then the camera dives into the thickest stroke of the middle letter (x40 on launchIn, 24 f) while the picture inside settles from the word\'s size to rest, so the stroke becomes the frame and the frame is the product at rest: one shot from word to picture.',
  params: { ...WINDOW },
};

/** The device at frame t (film frames) with the words leaving from `out` and the cut at `cut`: the others' exit, the key
 * word's growth (0..1), the window (0..1), the zoom (1..WINDOW.zoom) and the dive's share (0..1: the picture inside
 * settling to rest, the accent behind it clearing). */
export const windowState = (t: number, out: number, cut: number, k: number) => {
  const away = E.buildIn(clamp((t - out) / (WINDOW.away * k)));
  const grow = E.strongInOut(clamp((t - out - 4 * k) / (WINDOW.grow * k)));
  const z0 = cut - WINDOW.through * k;
  const zt = clamp((t - z0) / (WINDOW.through * k));
  return { away, grow, window: E.softOut(clamp((t - out - 10 * k) / (16 * k))), zoom: Math.exp(Math.log(WINDOW.zoom) * E.launchIn(zt)), dive: E.strongInOut(zt), done: t >= cut };
};

const inkCache = new Map<string, { x: number; y: number }>();
/**
 * A point well inside the ink of `word` (shares of its advance width and of its size from the baseline up), the middle of
 * the thickest vertical stroke nearest the word's centre: the dive's anchor, so a x40 zoom fills the frame with ink and
 * never with a counter or the gap between two letters. Measured once on a canvas in the film's face; without a canvas (a
 * Node check) the word's centre.
 */
export const inkPoint = (word: string, weight: number, track: number, font: string): { x: number; y: number } => {
  const key = `${word}|${weight}|${track}|${font}`;
  const hit = inkCache.get(key);
  if (hit) return hit;
  let out = { x: 0.5, y: 0.36 };
  try {
    const S = 200;
    const doc = (globalThis as { document?: Document }).document;
    const cv = doc?.createElement('canvas');
    const ctx = cv?.getContext('2d');
    if (cv && ctx) {
      ctx.font = `${weight} ${S}px ${font}`;
      const adv = ctx.measureText(word).width + track * S * Math.max(0, word.length - 1);
      cv.width = Math.ceil(adv + S * 0.2);
      cv.height = Math.ceil(S * 1.3);
      ctx.font = `${weight} ${S}px ${font}`;
      (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${track * S}px`;
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'alphabetic';
      const base = Math.round(S * 1.05);
      ctx.fillText(word, S * 0.1, base);
      const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const inkAt = (x: number, y: number) => img[(y * cv.width + x) * 4 + 3] > 128;
      // the cap middle row: runs of ink; each run's thickness checked up and down, the thickest near the centre wins
      const yMid = Math.round(base - S * 0.36);
      let best = -1;
      for (let x = 0; x < cv.width; ) {
        if (!inkAt(x, yMid)) { x++; continue; }
        let e = x;
        while (e < cv.width && inkAt(e, yMid)) e++;
        const cx = Math.round((x + e) / 2);
        let up = 0;
        while (yMid - up > 0 && inkAt(cx, yMid - up)) up++;
        let dn = 0;
        while (yMid + dn < cv.height - 1 && inkAt(cx, yMid + dn)) dn++;
        const thick = Math.min(e - x, up + dn);
        const near = 1 - Math.abs(cx - (S * 0.1 + adv / 2)) / Math.max(1, adv);
        const score = thick * (0.6 + 0.4 * near);
        if (score > best) (best = score), (out = { x: (cx - S * 0.1) / Math.max(1, adv), y: (base - (yMid - up + yMid + dn) / 2) / S });
        x = e;
      }
    }
  } catch {
    // no canvas: the word's centre
  }
  inkCache.set(key, out);
  return out;
};

export const TypeWindow: React.FC<LineProps & { cut: number }> = ({ f, words, id, size, weight, track, font, pal, out, cut, scene, focus, uid = 'tw', cy }) => {
  const film = useFilm();
  const { W, H } = frameOf(film);
  const k = k60(film);
  const ki = keyIndex(words);
  const base: RowFont = { size, weight, track, font };
  const row = rowOf(words.map((w) => w.word), base, W);
  const st = windowState(f, out, cut, k);
  const yc = cy ?? H / 2;
  const y = yc - size * 0.56;
  const off = recentre(f, row.xs, row.ws, row.space, k);
  const key = words[ki].word;
  // the key word's giant size and place: centred on the frame
  const big: RowFont = { size: 100, weight: Math.max(weight, WINDOW.weight), track: WINDOW.track, font };
  const bigSize = Math.min((WINDOW.cap * H) / 0.727, (WINDOW.width * W * 100) / Math.max(1, widthIn(key, big)));
  const scale = mix(1, bigSize / size, st.grow);
  // the key word moves from its place in the row to the frame's centre as it grows
  const kx = mix(row.xs[ki] + off + row.ws[ki] / 2, W / 2, st.grow);
  // the picture waits on its first frame behind the letters (a scene may draw nothing before its beat begins)
  const node = scene ? scene(Math.max(0, f - cut)) : null;
  const id2 = `window-${uid}`;
  // the clip text: the same word, laid out in SVG (no CSS transform on it), the zoom inside the SVG about the centre
  const fs = size * scale;
  const wt = Math.round(mix(weight, big.weight, st.grow));
  const tr = mix(track, WINDOW.track, st.grow);
  // the dive's anchor: a point inside the thickest stroke near the word's middle (in film px, the word at its giant size)
  const ip = inkPoint(key, big.weight, WINDOW.track, font);
  const wBig = widthIn(key, { ...big, size: bigSize });
  const ax = W / 2 - wBig / 2 + ip.x * wBig;
  const ay = yc + bigSize * BASELINE - ip.y * bigSize;
  const zoomT = `translate(${ax.toFixed(2)} ${ay.toFixed(2)}) scale(${st.zoom.toFixed(5)}) translate(${(-ax).toFixed(2)} ${(-ay).toFixed(2)})`;
  // the product inside the word: its focus box fitted to the word's height, centred on it, settling to rest as the dive
  // goes through (when the stroke fills the frame the picture inside is exactly the picture's first frame)
  const inner = { x: W / 2 - bigSize * 1.2, y: yc - bigSize * 0.31, w: bigSize * 2.4, h: bigSize * 0.62 };
  const fb = focus ?? { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.6 };
  const v0 = fitInto(fb, inner, 'contain');
  const lm = (p: number, q: number) => Math.exp(mix(Math.log(p), Math.log(q), st.dive));
  const view = { s: lm(v0.s, 1), tx: mix(v0.tx, 0, st.dive), ty: mix(v0.ty, 0, st.dive) };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((w, i) => {
        if (i === ki) return null;
        const b = wordIn(f, i, k, size);
        const dir = i < ki ? -1 : 1;
        return <WordAt key={i} id={id} text={w.word} x={row.xs[i] + off + dir * st.away * size * 1.4} y={y + b.rise} f={base} color={pal.type} opacity={b.opacity * (1 - st.away)} />;
      })}
      {/* the key word in ink until it becomes a window */}
      {st.window < 1 && (() => {
        const b = wordIn(f, ki, k, size);
        return <WordAt id={id} text={key} x={kx - row.ws[ki] / 2} y={y + b.rise} f={{ ...base, weight: wt, track: tr }} color={pal.type} opacity={b.opacity * (1 - st.window)} scale={scale} origin={`50% ${((0.56 / 1.06) * 100).toFixed(3)}%`} />;
      })()}
      {node && st.window > 0 && (
        <>
          <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <defs>
              <clipPath id={id2} clipPathUnits="userSpaceOnUse">
                {/* a clipPath takes shapes and text, never a group: the zoom rides on the text itself */}
                <text x={kx} y={yc + fs * BASELINE} transform={zoomT} textAnchor="middle" style={{ fontFamily: font, fontSize: fs, fontWeight: wt, letterSpacing: `${tr}em` }}>
                  {key}
                </text>
              </clipPath>
            </defs>
          </svg>
          {/* inside the letters: the accent, lit, clearing as the dive goes through (the ground behind shows), and the
              product, fitted to the word, then settling to rest */}
          <div style={{ position: 'absolute', inset: 0, clipPath: `url(#${id2})`, opacity: st.window }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - st.dive, background: `linear-gradient(160deg, ${mixColor(pal.accent, '#ffffff', 0.16)} 0%, ${pal.accent} 46%, ${mixColor(pal.accent, '#000000', 0.18)} 100%)` }} />
            <SceneView node={node} box={{ x: 0, y: 0, w: W, h: H }} view={view} W={W} H={H} clip={false} />
          </div>
        </>
      )}
    </div>
  );
};
