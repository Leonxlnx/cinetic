// type-window: the product seen through the letters. The line builds; its other words step away and the key word grows
// to fill the frame, heavy, its letters turning into windows onto the product's scene behind; then the camera goes
// through: the letters open out from the word's centre (an iris carried by the type) until the product fills the
// frame, at rest, and the picture plays on. The word and the picture are one shot.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { useFilm } from '../../lib/film';
import { frameOf, k60, type LineProps, type Recipe, SceneView } from './core';
import { keyIndex, recentre, type RowFont, rowOf, widthIn, wordIn, WordAt } from './type';

/** House numbers (f@60, shares of the frame): the others stepping away, the key word growing (to `width` of the frame,
 * cap at most `cap`), the hold on the window, the zoom through (to `zoom` x) with its iris. */
export const WINDOW = { away: 14, grow: 30, width: 0.88, cap: 0.44, weight: 820, track: -0.055, hold: 14, through: 24, zoom: 9 } as const;
/** The device's tail after its words start to leave (f@60): away + grow + hold + through. */
/** The baseline below the line's centre, a share of the size (the face's ascent and the 1.06 leading). */
export const BASELINE = 0.333;
export const WINDOW_TAIL = WINDOW.grow + WINDOW.hold + WINDOW.through;

export const RECIPE: Recipe = {
  id: 'type-window',
  recipe:
    'The product seen through the letters: the line builds; the other words step away (14 f) as the key word grows on strongInOut (30 f) to 88 % of the width (weight 820, -0.055 em), its letters turning into windows onto the product\'s scene; held 14 f; then the letters open out from the word\'s centre (x9 on launchIn, an iris carried by the type, 24 f) until the product fills the frame at rest: one shot from word to picture.',
  params: { ...WINDOW },
};

/** The device at frame t (film frames) with the words leaving from `out` and the cut at `cut`: the others' exit, the key
 * word's growth (0..1), the window (0..1), the zoom (1..WINDOW.zoom) and the iris (0..1). */
export const windowState = (t: number, out: number, cut: number, k: number) => {
  const away = E.buildIn(clamp((t - out) / (WINDOW.away * k)));
  const grow = E.strongInOut(clamp((t - out - 4 * k) / (WINDOW.grow * k)));
  const z0 = cut - WINDOW.through * k;
  const zt = clamp((t - z0) / (WINDOW.through * k));
  return { away, grow, window: E.softOut(clamp((t - out - 10 * k) / (16 * k))), zoom: Math.exp(Math.log(WINDOW.zoom) * E.launchIn(zt)), iris: E.launchIn(zt), done: t >= cut };
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
  const zoomT = `translate(${(W / 2).toFixed(2)} ${yc.toFixed(2)}) scale(${st.zoom.toFixed(5)}) translate(${(-W / 2).toFixed(2)} ${(-yc).toFixed(2)})`;
  const wt = Math.round(mix(weight, big.weight, st.grow));
  const tr = mix(track, WINDOW.track, st.grow);
  // the product inside the word: its focus box fitted to the word's height, centred on it
  const inner = { x: W / 2 - bigSize * 1.6, y: yc - bigSize * 0.42, w: bigSize * 3.2, h: bigSize * 0.84 };
  const far = Math.hypot(W, H) / 2;
  const iris = st.iris > 0 ? Math.exp(mix(Math.log(fs * 0.25), Math.log(far * 1.04), st.iris)) : 0;
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
          {/* inside the letters: the accent, lit, and the product fitted to the word (they zoom with the letters) */}
          <div style={{ position: 'absolute', inset: 0, clipPath: `url(#${id2})`, opacity: st.window }}>
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `${(W / 2).toFixed(2)}px ${yc.toFixed(2)}px`, transform: `scale(${st.zoom.toFixed(5)})` }}>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${mixColor(pal.accent, '#ffffff', 0.16)} 0%, ${pal.accent} 46%, ${mixColor(pal.accent, '#000000', 0.18)} 100%)` }} />
              <SceneView node={node} box={inner} focus={focus ?? { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.6 }} fit="contain" W={W} H={H} clip={false} />
            </div>
          </div>
          {/* the iris carried by the type: the product itself, at rest, opening from the word's centre */}
          {iris > 0 && (
            <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${iris.toFixed(2)}px at ${(W / 2).toFixed(2)}px ${yc.toFixed(2)}px)` }}>
              {node}
            </div>
          )}
        </>
      )}
    </div>
  );
};
